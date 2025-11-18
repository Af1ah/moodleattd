import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/services/attendanceDBService';

/**
 * GET: Get all courses available for a specific cohort
 * Query params: cohortId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cohortIdStr = searchParams.get('cohortId');

    if (!cohortIdStr) {
      return NextResponse.json(
        { error: 'Missing cohortId parameter' },
        { status: 400 }
      );
    }

    const cohortId = parseInt(cohortIdStr, 10);
    
    console.log(`📚 Fetching courses for cohort ${cohortId}...`);

    // Get all student IDs in the cohort
    const members = await prisma.mdl_cohort_members.findMany({
      where: {
        cohortid: BigInt(cohortId),
      },
      select: {
        userid: true,
      },
    });

    const studentIds = members.map((m) => m.userid);

    if (studentIds.length === 0) {
      return NextResponse.json({
        success: true,
        cohortId,
        courses: [],
        message: 'No students found in this cohort',
      });
    }

    // Find all courses that have attendance records for these students
    const attendanceActivities = await prisma.mdl_attendance.findMany({
      where: {
        sessions: {
          some: {
            logs: {
              some: {
                studentid: {
                  in: studentIds,
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

    // Format the response with course details
    const courses = attendanceActivities.map((activity) => ({
      id: Number(activity.course),
      attendanceId: Number(activity.id),
      name: activity.name || `Course ${activity.course}`,
    }));

    console.log(`✅ Found ${courses.length} courses for cohort ${cohortId}`);

    return NextResponse.json({
      success: true,
      cohortId,
      totalCourses: courses.length,
      courses,
    });
  } catch (error) {
    console.error('❌ Get cohort courses API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch cohort courses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
