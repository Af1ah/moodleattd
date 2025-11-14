import { NextRequest, NextResponse } from 'next/server';
import { getCompleteAttendanceData } from '@/services/attendanceDBService';

/**
 * Database-based Attendance API Route
 * 
 * This endpoint fetches attendance data directly from PostgreSQL database
 * and maps it to the same format as getAttendanceDirect for seamless UI integration.
 * 
 * Key differences from getAttendanceDirect:
 * - Fetches from PostgreSQL instead of Moodle Web Services
 * - More efficient for large datasets
 * - No API call limits
 * - Direct database access
 * 
 * Usage: POST /api/getAttendanceDB
 * Body: { 
 *   courseId: number, 
 *   filterStudentId?: number,
 *   datefrom?: number,
 *   dateto?: number
 * }
 * 
 * Response format matches getAttendanceDirect API for compatibility
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, filterStudentId, datefrom, dateto } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: 'Missing courseId' },
        { status: 400 }
      );
    }

    console.log(`🎯 Getting attendance data from database for course ${courseId}...`);
    if (filterStudentId) {
      console.log(`🔍 Filtering for student ID: ${filterStudentId}`);
    }
    if (datefrom || dateto) {
      console.log(`📅 Date range: ${datefrom ? new Date(datefrom * 1000).toISOString() : 'any'} to ${dateto ? new Date(dateto * 1000).toISOString() : 'any'}`);
    }

    // Fetch data from database
    const attendanceData = await getCompleteAttendanceData(
      courseId,
      filterStudentId,
      datefrom,
      dateto
    );

    console.log(`✅ Found ${attendanceData.activities.length} attendance activities`);
    console.log(`✅ Found ${attendanceData.sessions.length} sessions`);
    console.log(`✅ Found ${attendanceData.students.length} students`);

    // Transform database data to match getAttendanceDirect format
    // This ensures the frontend can use the same transformation logic
    const transformedSessions = attendanceData.sessions.map(session => {
      // Get all statuses for this session's attendance activity
      const sessionStatuses = attendanceData.statuses
        .filter(s => s.attendanceid === session.attendanceid)
        .map(s => ({
          id: s.id,
          acronym: s.acronym,
          description: s.description,
          grade: s.grade,
        }));

      // Create users array with all students
      const users = attendanceData.students.map(student => ({
        id: student.id,
        firstname: student.firstname,
        lastname: student.lastname,
        email: student.email,
        username: student.username,
        idnumber: student.idnumber,
      }));

      // Create attendance_log array from the logs
      const attendance_log = session.logs.map(log => ({
        id: log.id,
        sessionid: log.sessionid,
        studentid: log.studentid,
        statusid: log.statusid,
        timetaken: log.timetaken,
        takenby: log.takenby,
        remarks: log.remarks || '',
      }));

      return {
        id: session.id,
        attendanceid: session.attendanceid,
        attendanceName: session.attendanceName,
        sessdate: session.sessdate,
        duration: session.duration,
        lasttaken: session.lasttaken,
        lasttakenby: session.lasttakenby,
        description: session.description,
        groupid: session.groupid,
        users: users,
        statuses: sessionStatuses,
        attendance_log: attendance_log,
      };
    });

    // Return in the same format as getAttendanceDirect
    return NextResponse.json({
      success: true,
      courseId,
      attendanceActivities: attendanceData.activities.map(a => ({
        id: a.id,
        name: a.name,
      })),
      totalAttendanceActivities: attendanceData.activities.length,
      totalSessions: transformedSessions.length,
      sessions: transformedSessions,
      note: filterStudentId 
        ? `Attendance sessions filtered for student ID ${filterStudentId} (from database)` 
        : 'Attendance sessions from database',
      dataSource: 'database',
    });

  } catch (error) {
    console.error('Database attendance API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch attendance data from database',
        details: error instanceof Error ? error.message : 'Unknown error',
        note: 'Make sure DATABASE_URL is configured correctly and the database is accessible'
      },
      { status: 500 }
    );
  }
}

/**
 * GET method for testing/debugging
 * Usage: GET /api/getAttendanceDB?courseId=123&filterStudentId=456
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const filterStudentId = searchParams.get('filterStudentId');
    const datefrom = searchParams.get('datefrom');
    const dateto = searchParams.get('dateto');

    if (!courseId) {
      return NextResponse.json(
        { error: 'Missing courseId parameter' },
        { status: 400 }
      );
    }

    // Convert to POST request body format and reuse POST logic
    const body = {
      courseId: parseInt(courseId),
      filterStudentId: filterStudentId ? parseInt(filterStudentId) : undefined,
      datefrom: datefrom ? parseInt(datefrom) : undefined,
      dateto: dateto ? parseInt(dateto) : undefined,
    };

    // Create a mock request with the body
    const mockRequest = {
      json: async () => body,
    } as NextRequest;

    return POST(mockRequest);

  } catch (error) {
    console.error('Database attendance GET API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch attendance data from database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
