import { NextRequest, NextResponse } from 'next/server';
import { getCompleteAttendanceData } from '@/services/attendanceDBService';

/**
 * Student All Courses Attendance API Route
 * 
 * This endpoint fetches attendance data for specified courses for a student.
 * It uses the database service for efficiency and aggregates data across courses.
 * 
 * Usage: POST /api/getStudentAllCoursesAttendance
 * Body: { 
 *   studentId: number,
 *   courseIds: number[], // Array of course IDs to fetch
 *   datefrom?: number,
 *   dateto?: number
 * }
 * 
 * Response: {
 *   success: boolean,
 *   courses: Array<{
 *     courseId: number,
 *     courseName: string,
 *     sessions: AttendanceSessionData[],
 *     totalSessions: number,
 *     attendanceStats: {
 *       present: number,
 *       absent: number,
 *       late: number,
 *       excused: number,
 *       percentage: number
 *     }
 *   }>,
 *   overallStats: {
 *     totalSessions: number,
 *     present: number,
 *     absent: number,
 *     percentage: number
 *   }
 * }
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Student All Courses Attendance API called');

    const body = await request.json();
    const { studentId, courseIds, datefrom, dateto } = body;

    console.log('📝 Request data:', { studentId, courseIds, datefrom, dateto });

    // Validate required fields
    if (!studentId) {
      return NextResponse.json(
        { error: 'Missing studentId' },
        { status: 400 }
      );
    }

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty courseIds array' },
        { status: 400 }
      );
    }

    console.log(`📅 Date range: ${datefrom ? new Date(datefrom * 1000).toISOString() : 'any'} to ${dateto ? new Date(dateto * 1000).toISOString() : 'any'}`);

    // Fetch attendance data for each course
    const courseAttendanceData = [];
    
    for (const courseId of courseIds) {
      try {
        console.log(`🎓 Fetching attendance for course ${courseId}...`);
        
        const attendanceData = await getCompleteAttendanceData(
          courseId,
          studentId,
          datefrom,
          dateto
        );

        // Filter sessions that have student logs
        const sessionsWithStudentData = attendanceData.sessions.filter(session => 
          session.logs.length > 0
        );

        if (sessionsWithStudentData.length > 0) {
          // Transform sessions to include status from logs
          const transformedSessions = sessionsWithStudentData.map(session => {
            const studentLog = session.logs[0]; // Should be only one log per student per session
            const status = attendanceData.statuses.find(s => s.id === studentLog.statusid);
            
            return {
              sessionId: session.id,
              sessionDate: new Date(session.sessdate * 1000).toISOString().split('T')[0],
              sessionTime: new Date(session.sessdate * 1000).toLocaleTimeString(),
              attendanceName: session.attendanceName,
              status: status?.acronym || '-',
              statusDescription: status?.description || 'Unknown',
              courseId: Number(courseId),
              courseName: attendanceData.activities[0]?.name || `Course ${courseId}`
            };
          });

          // Calculate course-specific stats
          const stats = {
            present: transformedSessions.filter(s => s.status === 'P').length,
            absent: transformedSessions.filter(s => s.status === 'A').length,
            late: transformedSessions.filter(s => s.status === 'L').length,
            excused: transformedSessions.filter(s => s.status === 'E').length,
            percentage: 0
          };
          
          const totalAttended = stats.present + stats.late + stats.excused;
          stats.percentage = transformedSessions.length > 0 
            ? Math.round((totalAttended / transformedSessions.length) * 100)
            : 0;

          courseAttendanceData.push({
            courseId: Number(courseId),
            courseName: attendanceData.activities[0]?.name || `Course ${courseId}`,
            sessions: transformedSessions,
            totalSessions: transformedSessions.length,
            attendanceStats: stats
          });

          console.log(`✅ Course ${courseId}: ${transformedSessions.length} sessions, ${stats.percentage}% attendance`);
        } else {
          console.log(`⚠️ No attendance data found for course ${courseId}`);
        }
      } catch (courseError) {
        console.error(`❌ Error fetching course ${courseId}:`, courseError);
        // Continue with other courses instead of failing completely
      }
    }

    // Calculate overall stats across all courses
    const allSessions = courseAttendanceData.flatMap(course => course.sessions);
    const overallStats = {
      totalSessions: allSessions.length,
      present: allSessions.filter(s => s.status === 'P').length,
      absent: allSessions.filter(s => s.status === 'A').length,
      late: allSessions.filter(s => s.status === 'L').length,
      excused: allSessions.filter(s => s.status === 'E').length,
      percentage: 0
    };
    
    const totalAttended = overallStats.present + overallStats.late + overallStats.excused;
    overallStats.percentage = overallStats.totalSessions > 0 
      ? Math.round((totalAttended / overallStats.totalSessions) * 100)
      : 0;

    console.log(`🎯 Overall stats: ${overallStats.totalSessions} sessions across ${courseAttendanceData.length} courses, ${overallStats.percentage}% attendance`);

    return NextResponse.json({
      success: true,
      courses: courseAttendanceData,
      overallStats
    });

  } catch (error) {
    console.error('❌ Student All Courses Attendance API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}