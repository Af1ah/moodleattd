/**
 * Cohort Service
 * 
 * Provides database functions for fetching cohort (student group) data
 * directly from PostgreSQL.
 */

import { prisma } from './attendanceDBService';

/**
 * Get all available cohorts
 */
export async function getAllCohorts() {
  try {
    const cohorts = await prisma.mdl_cohort.findMany({
      where: {
        visible: 1,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        idnumber: true,
        description: true,
        contextid: true,
        timecreated: true,
        timemodified: true,
      },
    });

    console.log(`✅ Found ${cohorts.length} cohorts`);
    return cohorts;
  } catch (error) {
    console.error('❌ Error fetching cohorts:', error);
    throw error;
  }
}

/**
 * Get cohort by ID with member count
 */
export async function getCohortById(cohortId: number) {
  try {
    const cohort = await prisma.mdl_cohort.findUnique({
      where: {
        id: BigInt(cohortId),
      },
      include: {
        members: {
          select: {
            userid: true,
          },
        },
      },
    });

    if (!cohort) {
      throw new Error(`Cohort ${cohortId} not found`);
    }

    console.log(`✅ Found cohort "${cohort.name}" with ${cohort.members.length} members`);
    return cohort;
  } catch (error) {
    console.error(`❌ Error fetching cohort ${cohortId}:`, error);
    throw error;
  }
}

/**
 * Get all students (user IDs) in a cohort
 */
export async function getCohortStudents(cohortId: number) {
  try {
    const members = await prisma.mdl_cohort_members.findMany({
      where: {
        cohortid: BigInt(cohortId),
      },
      select: {
        userid: true,
        timeadded: true,
      },
    });

    const userIds = members.map((m: { userid: bigint }) => Number(m.userid));
    console.log(`✅ Found ${userIds.length} students in cohort ${cohortId}`);
    return userIds;
  } catch (error) {
    console.error(`❌ Error fetching cohort students for ${cohortId}:`, error);
    throw error;
  }
}

/**
 * Get detailed student information for cohort members
 */
export async function getCohortStudentDetails(cohortId: number) {
  try {
    const members = await prisma.mdl_cohort_members.findMany({
      where: {
        cohortid: BigInt(cohortId),
      },
      select: {
        userid: true,
      },
    });

    const userIds = members.map((m: { userid: bigint }) => m.userid);

    // Fetch user details
    const students = await prisma.mdl_user.findMany({
      where: {
        id: {
          in: userIds,
        },
        deleted: 0,
        suspended: 0,
      },
      select: {
        id: true,
        username: true,
        firstname: true,
        lastname: true,
        email: true,
        idnumber: true,
      },
      orderBy: [
        { lastname: 'asc' },
        { firstname: 'asc' },
      ],
    });

    console.log(`✅ Found ${students.length} active students in cohort ${cohortId}`);
    return students;
  } catch (error) {
    console.error(`❌ Error fetching cohort student details for ${cohortId}:`, error);
    throw error;
  }
}

/**
 * Get courses that cohort students are enrolled in
 * This helps to fetch attendance across multiple courses
 */
export async function getCoursesForCohort(cohortId: number) {
  try {
    const userIds = await getCohortStudents(cohortId);

    // Find all attendance activities where these students have attendance records
    const attendanceActivities = await prisma.mdl_attendance.findMany({
      where: {
        sessions: {
          some: {
            logs: {
              some: {
                studentid: {
                  in: userIds.map((id: number) => BigInt(id)),
                },
              },
            },
          },
        },
      },
      distinct: ['course'],
      select: {
        course: true,
        name: true,
      },
    });

    const courseIds = attendanceActivities.map(a => Number(a.course));
    console.log(`✅ Found ${courseIds.length} courses with attendance for cohort ${cohortId}`);
    return courseIds;
  } catch (error) {
    console.error(`❌ Error fetching courses for cohort ${cohortId}:`, error);
    throw error;
  }
}
