import { NextRequest, NextResponse } from 'next/server';
import { getCohortById, getCohortStudents } from '@/services/cohortService';
import { getCompleteAttendanceData } from '@/services/attendanceDBService';

/**
 * Cohort-based Attendance API Route
 * 
 * This endpoint fetches consolidated attendance data for all students in a cohort
 * across all courses. This is useful for viewing attendance of an entire class/batch.
 * 
 * Usage: POST /api/getCohortAttendance
 * Body: { 
 *   cohortId: number,
 *   datefrom?: number,
 *   dateto?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cohortId, datefrom, dateto, userId } = body;

    if (!cohortId) {
      return NextResponse.json(
        { error: 'Missing cohortId parameter' },
        { status: 400 }
      );
    }

    console.log(`🎯 Fetching cohort attendance for cohort ${cohortId}...`);

    // Get cohort details
    const cohort = await getCohortById(cohortId);
    
    // Get all student IDs in the cohort
    const studentIds = await getCohortStudents(cohortId);
    
    if (studentIds.length === 0) {
      return NextResponse.json({
        success: true,
        cohortId,
        cohortName: cohort.name,
        totalStudents: 0,
        courses: [],
        message: 'No students found in this cohort',
      });
    }

    console.log(`📊 Found ${studentIds.length} students in cohort "${cohort.name}"`);

    // Get all courses that have attendance records for these students
    // We need to find all unique course IDs from attendance activities
    // that have sessions with logs for our cohort students
    
    // Import prisma from attendanceDBService
    const { prisma } = await import('@/services/attendanceDBService');
    
    const attendanceActivities = await prisma.mdl_attendance.findMany({
      where: {
        sessions: {
          some: {
            logs: {
              some: {
                studentid: {
                  in: studentIds.map((id: number) => BigInt(id)),
                },
              },
            },
          },
        },
      },
      distinct: ['course'],
      select: {
        course: true,
        id: true,
        name: true,
      },
    });

    console.log(`📚 Found ${attendanceActivities.length} courses with attendance for this cohort`);

    // If userId is provided, check if they have specific courses selected for this cohort
    let allowedCourseIds: number[] | null = null;
    if (userId) {
      const assignment = await prisma.mdl_cohort_role_assignments.findFirst({
        where: {
          cohortid: BigInt(cohortId),
          userid: BigInt(userId),
        },
        select: {
          selectedcourses: true,
        },
      });

      if (assignment?.selectedcourses) {
        try {
          allowedCourseIds = JSON.parse(assignment.selectedcourses);
          // User has selected courses for this cohort
        } catch (error) {
          console.error('Error parsing selectedcourses:', error);
        }
      } else {
        console.log(`🔓 User ${userId} has access to all courses for this cohort`);
      }
    }

    // Fetch attendance data for each course
    const courseAttendanceData = [];
    
    for (const activity of attendanceActivities) {
      const courseId = Number(activity.course);
      
      // Skip if user has specific courses selected and this course is not in the list
      if (allowedCourseIds && allowedCourseIds.length > 0 && !allowedCourseIds.includes(courseId)) {
        console.log(`  ⏭️ Skipping course ${courseId} - not in user's selected courses`);
        continue;
      }
      
      try {
        console.log(`  📖 Fetching attendance for course ${courseId}...`);
        
        // Get complete attendance data for this course
        // Filter for only students in this cohort
        const attendanceData = await getCompleteAttendanceData(
          courseId,
          undefined,
          datefrom,
          dateto
        );

        // Filter sessions to only include cohort students
        const filteredSessions = attendanceData.sessions.map(session => {
          // Filter users
          const filteredUsers = attendanceData.students.filter(student => 
            studentIds.includes(student.id)
          );
          
          // Filter attendance logs
          const filteredLogs = session.logs.filter(log =>
            studentIds.includes(Number(log.studentid))
          );

          return {
            ...session,
            users: filteredUsers.map(student => ({
              id: student.id,
              firstname: student.firstname,
              lastname: student.lastname,
              email: student.email,
              username: student.username,
              idnumber: student.idnumber,
            })),
            logs: filteredLogs,
          };
        });

        // Get unique statuses for this course
        const courseStatuses = attendanceData.statuses
          .filter((status, index, self) =>
            index === self.findIndex((s) => s.id === status.id)
          )
          .map(status => ({
            id: status.id,
            acronym: status.acronym,
            description: status.description,
            grade: status.grade,
          }));

        // Get unique students for this course from cohort
        const courseStudents = attendanceData.students.filter(student =>
          studentIds.includes(student.id)
        );

        courseAttendanceData.push({
          courseId,
          courseName: activity.name || `Course ${courseId}`,
          totalSessions: filteredSessions.length,
          totalStudents: courseStudents.length,
          sessions: filteredSessions.map(session => ({
            id: session.id,
            attendanceid: session.attendanceid,
            attendanceName: session.attendanceName,
            sessdate: session.sessdate,
            duration: session.duration,
            lasttaken: session.lasttaken,
            lasttakenby: session.lasttakenby,
            description: session.description,
            groupid: session.groupid,
            users: session.users,
            statuses: courseStatuses,
            attendance_log: session.logs.map(log => ({
              id: log.id,
              sessionid: log.sessionid,
              studentid: log.studentid,
              statusid: log.statusid,
              timetaken: log.timetaken,
              takenby: log.takenby,
              remarks: log.remarks || '',
            })),
          })),
        });

        console.log(`  ✅ Retrieved ${filteredSessions.length} sessions for course ${courseId}`);
      } catch (error) {
        console.error(`  ❌ Error fetching attendance for course ${courseId}:`, error);
        // Continue with other courses even if one fails
      }
    }

    // Return consolidated data
    return NextResponse.json({
      success: true,
      cohortId,
      cohortName: cohort.name,
      cohortIdNumber: cohort.idnumber,
      totalStudents: studentIds.length,
      totalCourses: courseAttendanceData.length,
      courses: courseAttendanceData,
      dataSource: 'database',
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('❌ Cohort attendance API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch cohort attendance data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET method for testing/debugging
 * Usage: GET /api/getCohortAttendance?cohortId=1
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohortId');
    const datefrom = searchParams.get('datefrom');
    const dateto = searchParams.get('dateto');
    const userId = searchParams.get('userId');

    if (!cohortId) {
      return NextResponse.json(
        { error: 'Missing cohortId parameter' },
        { status: 400 }
      );
    }

    // Convert to POST request body format and reuse POST logic
    const body = {
      cohortId: parseInt(cohortId),
      datefrom: datefrom ? parseInt(datefrom) : undefined,
      dateto: dateto ? parseInt(dateto) : undefined,
      userId: userId ? parseInt(userId) : undefined,
    };

    const mockRequest = {
      json: async () => body,
    } as NextRequest;

    return POST(mockRequest);
  } catch (error) {
    console.error('❌ Cohort attendance GET error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
