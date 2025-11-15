/**
 * Role Service
 * 
 * Provides database functions for fetching user role information
 * from the Moodle role system.
 */

import { prisma } from './attendanceDBService';

/**
 * Get user's primary role based on their role assignments
 * Priority: manager > coursecreator > editingteacher > teacher > student
 */
export async function getUserRole(userId: number) {
  try {
    // Fetch all role assignments for the user
    const roleAssignments = await prisma.mdl_role_assignments.findMany({
      where: {
        userid: BigInt(userId),
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            shortname: true,
            archetype: true,
            sortorder: true,
          },
        },
      },
      orderBy: {
        role: {
          sortorder: 'asc', // Lower sortorder = higher priority
        },
      },
    });

    if (roleAssignments.length === 0) {
      console.log(`⚠️ No role assignments found for user ${userId}`);
      return null;
    }

    // Return the highest priority role (first one due to sorting)
    const primaryRole = roleAssignments[0].role;
    
    console.log(`✅ User ${userId} has role: ${primaryRole.shortname} (${primaryRole.archetype})`);
    
    return {
      roleId: Number(primaryRole.id),
      roleName: primaryRole.name,
      roleShortname: primaryRole.shortname,
      roleArchetype: primaryRole.archetype,
    };
  } catch (error) {
    console.error(`❌ Error fetching role for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Check if a user has a non-student role
 * Non-student roles: Any role except 'student'
 */
export function isNonStudentRole(roleShortname: string): boolean {
  // Exclude only student role - all other roles (manager, coursecreator, editingteacher, teacher, guest, user, frontpage, etc.) are non-students
  const studentRoles = ['student'];
  return !studentRoles.includes(roleShortname);
}

/**
 * Get all cohorts assigned to a specific user (teacher/manager)
 */
export async function getUserAssignedCohorts(userId: number) {
  try {
    const assignments = await prisma.mdl_cohort_role_assignments.findMany({
      where: {
        userid: BigInt(userId),
      },
      select: {
        cohortid: true,
        roleid: true,
        timeassigned: true,
      },
    });

    const cohortIds = assignments.map((a) => Number(a.cohortid));
    console.log(`✅ User ${userId} has access to ${cohortIds.length} cohorts`);
    
    return cohortIds;
  } catch (error) {
    console.error(`❌ Error fetching assigned cohorts for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Assign a cohort to a user (teacher/manager)
 */
export async function assignCohortToUser(
  cohortId: number,
  userId: number,
  roleId: number,
  assignedBy: number
) {
  try {
    const assignment = await prisma.mdl_cohort_role_assignments.create({
      data: {
        cohortid: BigInt(cohortId),
        userid: BigInt(userId),
        roleid: BigInt(roleId),
        timeassigned: BigInt(Math.floor(Date.now() / 1000)),
        assignedby: BigInt(assignedBy),
      },
    });

    console.log(`✅ Assigned cohort ${cohortId} to user ${userId}`);
    return assignment;
  } catch (error) {
    console.error(`❌ Error assigning cohort ${cohortId} to user ${userId}:`, error);
    throw error;
  }
}

/**
 * Remove a cohort assignment from a user
 */
export async function removeCohortFromUser(cohortId: number, userId: number) {
  try {
    await prisma.mdl_cohort_role_assignments.deleteMany({
      where: {
        cohortid: BigInt(cohortId),
        userid: BigInt(userId),
      },
    });

    console.log(`✅ Removed cohort ${cohortId} from user ${userId}`);
  } catch (error) {
    console.error(`❌ Error removing cohort ${cohortId} from user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get all users with non-student roles (for admin UI)
 */
export async function getNonStudentUsers() {
  try {
    // Get all non-student role IDs (exclude 'student' role only)
    const nonStudentRoles = await prisma.mdl_role.findMany({
      where: {
        shortname: {
          not: 'student', // Exclude only student role
        },
      },
      select: {
        id: true,
        shortname: true,
        name: true,
      },
    });

    const roleIds = nonStudentRoles.map((r) => r.id);

    // Get all users with these roles
    const roleAssignments = await prisma.mdl_role_assignments.findMany({
      where: {
        roleid: {
          in: roleIds,
        },
      },
      distinct: ['userid'],
      select: {
        userid: true,
        roleid: true,
      },
    });

    // Get user details
    const userIds = [...new Set(roleAssignments.map((ra) => ra.userid))];
    
    const users = await prisma.mdl_user.findMany({
      where: {
        id: {
          in: userIds,
        },
        deleted: 0,
      },
      select: {
        id: true,
        username: true,
        firstname: true,
        lastname: true,
        email: true,
      },
    });

    // Map users with their roles
    const usersWithRoles = users.map((user) => {
      const userRoleAssignments = roleAssignments.filter(
        (ra) => ra.userid === user.id
      );
      const userRoleIds = userRoleAssignments.map((ra) => Number(ra.roleid));
      const userRoles = nonStudentRoles.filter((r) =>
        userRoleIds.includes(Number(r.id))
      );

      return {
        id: Number(user.id),
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        roles: userRoles.map((r) => ({
          id: Number(r.id),
          shortname: r.shortname,
          name: r.name,
        })),
      };
    });

    console.log(`✅ Found ${usersWithRoles.length} non-student users`);
    return usersWithRoles;
  } catch (error) {
    console.error('❌ Error fetching non-student users:', error);
    throw error;
  }
}

/**
 * Get cohort assignments for a specific user with cohort details
 */
export async function getUserCohortAssignmentsWithDetails(userId: number) {
  try {
    const assignments = await prisma.mdl_cohort_role_assignments.findMany({
      where: {
        userid: BigInt(userId),
      },
    });

    const cohortIds = assignments.map((a) => a.cohortid);
    
    const cohorts = await prisma.mdl_cohort.findMany({
      where: {
        id: {
          in: cohortIds,
        },
      },
      select: {
        id: true,
        name: true,
        idnumber: true,
        description: true,
      },
    });

    const result = assignments.map((assignment) => {
      const cohort = cohorts.find((c) => c.id === assignment.cohortid);
      return {
        cohortId: Number(assignment.cohortid),
        cohortName: cohort?.name || 'Unknown',
        cohortIdnumber: cohort?.idnumber,
        roleId: Number(assignment.roleid),
        timeAssigned: Number(assignment.timeassigned),
      };
    });

    console.log(`✅ User ${userId} has ${result.length} cohort assignments`);
    return result;
  } catch (error) {
    console.error(`❌ Error fetching cohort assignments for user ${userId}:`, error);
    throw error;
  }
}
