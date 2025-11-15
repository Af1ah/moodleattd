import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/services/attendanceDBService';

/**
 * Get User Enrolled Courses API Route
 * 
 * This endpoint fetches courses a user is enrolled in by checking attendance logs.
 * Since we have attendance data, we can infer enrollments from that.
 * 
 * Usage: POST /api/getUserEnrolledCourses
 * Body: { userId: number }
 * 
 * Response: {
 *   success: boolean,
 *   courses: Array<{
 *     courseId: number,
 *     courseName: string,
 *     sessionCount: number
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    console.log(`🔍 Finding enrolled courses for user ${userId}...`);

    // Get all attendance logs for this user
    const attendanceLogs = await prisma.mdl_attendance_log.findMany({
      where: {
        studentid: BigInt(userId),
      },
      include: {
        session: {
          include: {
            attendance: {
              select: {
                id: true,
                name: true,
                course: true,
              }
            }
          }
        }
      },
      distinct: ['sessionid']
    });

    if (attendanceLogs.length === 0) {
      console.log('📭 No attendance logs found for user');
      return NextResponse.json({
        success: true,
        courses: []
      });
    }

    // Extract course information
    const courseMap = new Map();
    
    attendanceLogs.forEach(log => {
      if (log.session?.attendance?.course) {
        const courseId = Number(log.session.attendance.course);
        const attendanceName = log.session.attendance.name || `Attendance ${log.session.attendance.id}`;
        
        if (!courseMap.has(courseId)) {
          courseMap.set(courseId, {
            courseId,
            courseName: attendanceName, // We'll use the attendance name as course identifier
            sessionCount: 0,
            attendanceActivities: new Set()
          });
        }
        
        const course = courseMap.get(courseId);
        course.sessionCount++;
        course.attendanceActivities.add(attendanceName);
      }
    });

    const courses = Array.from(courseMap.values()).map(course => ({
      courseId: course.courseId,
      courseName: course.courseName,
      sessionCount: course.sessionCount,
      attendanceActivities: Array.from(course.attendanceActivities)
    }));

    console.log(`✅ Found ${courses.length} courses for user ${userId}`);

    return NextResponse.json({
      success: true,
      courses
    });

  } catch (error) {
    console.error('❌ Error in getUserEnrolledCourses:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch enrolled courses',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}