import { NextRequest, NextResponse } from 'next/server';
import { getAllCohorts } from '@/services/cohortService';
import { getUserAssignedCohorts, isNonStudentRole } from '@/services/roleService';

/**
 * Get available cohorts based on user role
 * 
 * Usage: GET /api/getCohorts?userId={userId}&roleShortname={roleShortname}
 * 
 * - Students: No cohorts (empty array)
 * - Teachers/Managers/etc: Only assigned cohorts
 * - Admin (manager): Can see all cohorts if needed, or only assigned ones
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const roleShortname = searchParams.get('roleShortname');

    console.log('📚 Fetching cohorts...', { userId: userIdParam, roleShortname });

    // If no user info provided, return empty array (for security)
    if (!userIdParam || !roleShortname) {
      console.log('⚠️ No user info provided, returning empty cohorts');
      return NextResponse.json({
        success: true,
        totalCohorts: 0,
        cohorts: [],
        message: 'User authentication required',
      });
    }

    const userId = parseInt(userIdParam);

    // Check if user has a non-student role
    const hasNonStudentRole = await isNonStudentRole(roleShortname);

    if (!hasNonStudentRole) {
      console.log('⚠️ User is a student, no cohort access');
      return NextResponse.json({
        success: true,
        totalCohorts: 0,
        cohorts: [],
        message: 'Students do not have cohort access',
      });
    }

    // Get cohorts assigned to this user
    const assignedCohortIds = await getUserAssignedCohorts(userId);

    if (assignedCohortIds.length === 0) {
      console.log('⚠️ User has no assigned cohorts');
      return NextResponse.json({
        success: true,
        totalCohorts: 0,
        cohorts: [],
        message: 'No cohorts assigned to this user',
      });
    }

    // Fetch all cohorts and filter to assigned ones
    const allCohorts = await getAllCohorts();
    const assignedCohorts = allCohorts.filter((cohort: { id: bigint }) => 
      assignedCohortIds.includes(Number(cohort.id))
    );

    console.log(`✅ User has access to ${assignedCohorts.length} cohorts`);
    
    return NextResponse.json({
      success: true,
      totalCohorts: assignedCohorts.length,
      cohorts: assignedCohorts.map((cohort: { 
        id: bigint; 
        name: string; 
        idnumber: string | null; 
        description: string | null; 
        contextid: bigint; 
        timecreated: bigint; 
        timemodified: bigint; 
      }) => ({
        id: Number(cohort.id),
        name: cohort.name,
        idnumber: cohort.idnumber,
        description: cohort.description,
        contextid: Number(cohort.contextid),
        timecreated: Number(cohort.timecreated),
        timemodified: Number(cohort.timemodified),
      })),
    });
  } catch (error) {
    console.error('❌ Get cohorts API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch cohorts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
