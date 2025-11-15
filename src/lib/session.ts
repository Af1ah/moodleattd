import { SessionOptions, getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

 * import { LTISession } from '@/types/lti';

 * Provides database functions for fetching user role information

 * from the Moodle role system.export interface LTISessionData {

 */  userId: string;

  userName: string;

import { prisma } from './attendanceDBService';  userEmail?: string;

  courseId: string;

/**  courseName: string;

 * Get user's primary role based on their role assignments  roles: string[];

 * Priority: manager > coursecreator > editingteacher > teacher > student  launchId: string;

 */  moodleToken: string;

export async function getUserRole(userId: number) {  createdAt: number;

  try {  // Moodle role information

    // Fetch all role assignments for the user  roleId?: number;

    const roleAssignments = await prisma.mdl_role_assignments.findMany({  roleName?: string;

      where: {  roleShortname?: string;

        userid: BigInt(userId),}

      },

      include: {export const sessionOptions: SessionOptions = {

        role: {  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_development_only',

          select: {  cookieName: 'moodle_lti_session',

            id: true,  cookieOptions: {

            name: true,    secure: process.env.NODE_ENV === 'production',

            shortname: true,    httpOnly: true,

            archetype: true,    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Use lax for development

            sortorder: true,    maxAge: 60 * 60 * 24, // 24 hours

          },    path: '/',

        },  },

      },};

      orderBy: {

        role: {declare module 'iron-session' {

          sortorder: 'asc', // Lower sortorder = higher priority  interface IronSessionData {

        },    ltiSession?: LTISessionData;

      },  }

    });}



    if (roleAssignments.length === 0) {export async function createLTISession(sessionData: LTISession): Promise<void> {

      console.log(`⚠️ No role assignments found for user ${userId}`);  try {

      return null;    console.log('💾 Creating LTI session...');

    }    const cookieStore = await cookies();

    console.log('🍪 Cookie store obtained for session creation');

    // Return the highest priority role (first one due to sorting)    

    const primaryRole = roleAssignments[0].role;    const session = await getIronSession<{ ltiSession?: LTISessionData }>(cookieStore, sessionOptions);

        console.log('🔐 Iron session obtained for creation');

    console.log(`✅ User ${userId} has role: ${primaryRole.shortname} (${primaryRole.archetype})`);    

        // Convert LTISession to LTISessionData

    return {    const ltiSessionData: LTISessionData = {

      roleId: Number(primaryRole.id),      userId: sessionData.userId,

      roleName: primaryRole.name,      userName: sessionData.userName,

      roleShortname: primaryRole.shortname,      userEmail: sessionData.userEmail,

      roleArchetype: primaryRole.archetype,      courseId: sessionData.courseId,

    };      courseName: sessionData.courseName,

  } catch (error) {      roles: sessionData.roles,

    console.error(`❌ Error fetching role for user ${userId}:`, error);      launchId: sessionData.launchId,

    throw error;      moodleToken: sessionData.moodleToken,

  }      createdAt: sessionData.createdAt,

}    };

    

/**    console.log('📝 Session data prepared:', { 

 * Check if a user has a non-student role      userId: ltiSessionData.userId, 

 * Non-student roles: manager, coursecreator, editingteacher, teacher      courseId: ltiSessionData.courseId 

 */    });

export async function isNonStudentRole(roleShortname: string): boolean {    

  const nonStudentRoles = ['manager', 'coursecreator', 'editingteacher', 'teacher'];    session.ltiSession = ltiSessionData;

  return nonStudentRoles.includes(roleShortname);    await session.save();

}    

    console.log('✅ Session saved successfully');

/**  } catch (error) {

 * Get all cohorts assigned to a specific user (teacher/manager)    console.error('❌ Error creating LTI session:', error);

 */    throw error;

export async function getUserAssignedCohorts(userId: number) {  }

  try {}

    const assignments = await prisma.mdl_cohort_role_assignments.findMany({

      where: {export async function getLTISession(): Promise<LTISessionData | null> {

        userid: BigInt(userId),  try {

      },    console.log('🍪 Getting LTI session from cookies...');

      select: {    const cookieStore = await cookies();

        cohortid: true,    console.log('🍪 Cookie store obtained');

        roleid: true,    

        timeassigned: true,    const session = await getIronSession<{ ltiSession?: LTISessionData }>(cookieStore, sessionOptions);

      },    console.log('🔐 Iron session obtained');

    });    console.log('📊 Session data exists:', !!session.ltiSession);

    

    const cohortIds = assignments.map((a) => Number(a.cohortid));    if (session.ltiSession) {

    console.log(`✅ User ${userId} has access to ${cohortIds.length} cohorts`);      console.log('✅ LTI session found, courseId:', session.ltiSession.courseId);

        }

    return cohortIds;    

  } catch (error) {    return session.ltiSession || null;

    console.error(`❌ Error fetching assigned cohorts for user ${userId}:`, error);  } catch (error) {

    throw error;    console.error('❌ Error getting LTI session:', error);

  }    return null;

}  }

}

/**

 * Assign a cohort to a user (teacher/manager)export async function clearLTISession(): Promise<void> {

 */  const cookieStore = await cookies();

export async function assignCohortToUser(  const session = await getIronSession<{ ltiSession?: LTISessionData }>(cookieStore, sessionOptions);

  cohortId: number,  session.ltiSession = undefined;

  userId: number,  await session.save();

  roleId: number,}

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
    // Get all non-student role IDs
    const nonStudentRoles = await prisma.mdl_role.findMany({
      where: {
        shortname: {
          in: ['manager', 'coursecreator', 'editingteacher', 'teacher'],
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
