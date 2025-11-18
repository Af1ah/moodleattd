import { NextRequest, NextResponse } from 'next/server';
import {
  assignCohortToUser,
  removeCohortFromUser,
  getUserCohortAssignmentsWithDetails,
  getNonStudentUsers,
  updateCohortCourseSelection,
} from '@/services/roleService';

/**
 * GET: Get all non-student users (for admin UI)
 * POST: Assign a cohort to a user
 * PATCH: Update selected courses for a cohort assignment
 * DELETE: Remove a cohort assignment from a user
 */

export async function GET() {
  try {
    console.log('📚 Fetching non-student users...');
    
    const users = await getNonStudentUsers();
    
    // For each user, get their cohort assignments
    const usersWithCohorts = await Promise.all(
      users.map(async (user) => {
        const cohorts = await getUserCohortAssignmentsWithDetails(user.id);
        return {
          ...user,
          cohorts,
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      totalUsers: usersWithCohorts.length,
      users: usersWithCohorts,
    });
  } catch (error) {
    console.error('❌ Get non-student users API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch non-student users',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cohortId, userId, roleId, assignedBy } = body;

    if (!cohortId || !userId || !roleId) {
      return NextResponse.json(
        { error: 'Missing required parameters: cohortId, userId, roleId' },
        { status: 400 }
      );
    }

    console.log(`🔗 Assigning cohort ${cohortId} to user ${userId}...`);

    const assignment = await assignCohortToUser(
      cohortId,
      userId,
      roleId,
      assignedBy || userId
    );

    return NextResponse.json({
      success: true,
      assignment: {
        id: Number(assignment.id),
        cohortId: Number(assignment.cohortid),
        userId: Number(assignment.userid),
        roleId: Number(assignment.roleid),
        timeAssigned: Number(assignment.timeassigned),
      },
      message: 'Cohort assigned successfully',
    });
  } catch (error) {
    console.error('❌ Assign cohort API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to assign cohort',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { cohortId, userId, selectedCourses } = body;

    if (!cohortId || !userId || !selectedCourses) {
      return NextResponse.json(
        { error: 'Missing required parameters: cohortId, userId, selectedCourses' },
        { status: 400 }
      );
    }

    console.log(`📝 Updating course selection for cohort ${cohortId}, user ${userId}...`);

    await updateCohortCourseSelection(cohortId, userId, selectedCourses);

    return NextResponse.json({
      success: true,
      message: 'Course selection updated successfully',
    });
  } catch (error) {
    console.error('❌ Update course selection API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update course selection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { cohortId, userId } = body;

    if (!cohortId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: cohortId, userId' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Removing cohort ${cohortId} from user ${userId}...`);

    await removeCohortFromUser(cohortId, userId);

    return NextResponse.json({
      success: true,
      message: 'Cohort assignment removed successfully',
    });
  } catch (error) {
    console.error('❌ Remove cohort assignment API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to remove cohort assignment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
