/**
 * Semester Service
 * Provides utilities for fetching and working with semester dates based on admission year
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SemesterDate {
  id: string;
  admissionyear: string;
  semestername: string;
  startdate: Date;
  enddate: Date;
  iscurrent: boolean;
}

/**
 * Get user's admission year from custom field
 */
export async function getUserAdmissionYear(userId: string | number): Promise<string | null> {
  try {
    const result = await prisma.$queryRaw<Array<{ data: string }>>`
      SELECT d.data
      FROM mdl_user_info_data d
      JOIN mdl_user_info_field f ON d.fieldid = f.id
      WHERE d.userid = ${BigInt(userId)}
        AND f.shortname = 'adm_year'
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      console.log(`No admission year found for user ${userId}`);
      return null;
    }

    return result[0].data;
  } catch (error) {
    console.error('Error fetching user admission year:', error);
    return null;
  }
}

/**
 * Get current semester for an admission year
 */
export async function getCurrentSemester(admissionYear: string): Promise<SemesterDate | null> {
  try {
    const semester = await prisma.mdl_semester_dates.findFirst({
      where: {
        admissionyear: admissionYear,
        iscurrent: true,
      },
    });

    if (!semester) {
      console.log(`No current semester found for admission year ${admissionYear}`);
      return null;
    }

    return {
      id: semester.id.toString(),
      admissionyear: semester.admissionyear,
      semestername: semester.semestername,
      startdate: semester.startdate,
      enddate: semester.enddate,
      iscurrent: semester.iscurrent,
    };
  } catch (error) {
    console.error('Error fetching current semester:', error);
    return null;
  }
}

/**
 * Get all semesters for an admission year
 */
export async function getSemestersByAdmissionYear(admissionYear: string): Promise<SemesterDate[]> {
  try {
    const semesters = await prisma.mdl_semester_dates.findMany({
      where: {
        admissionyear: admissionYear,
      },
      orderBy: {
        startdate: 'desc',
      },
    });

    return semesters.map(s => ({
      id: s.id.toString(),
      admissionyear: s.admissionyear,
      semestername: s.semestername,
      startdate: s.startdate,
      enddate: s.enddate,
      iscurrent: s.iscurrent,
    }));
  } catch (error) {
    console.error('Error fetching semesters:', error);
    return [];
  }
}

/**
 * Get semester date range for a user (returns their current semester dates)
 */
export async function getUserSemesterDates(userId: string | number): Promise<{ startDate: Date; endDate: Date; semesterName: string } | null> {
  try {
    const admissionYear = await getUserAdmissionYear(userId);
    
    if (!admissionYear) {
      console.log(`No admission year for user ${userId}, cannot determine semester dates`);
      return null;
    }

    const currentSemester = await getCurrentSemester(admissionYear);
    
    if (!currentSemester) {
      console.log(`No current semester for admission year ${admissionYear}`);
      return null;
    }

    return {
      startDate: currentSemester.startdate,
      endDate: currentSemester.enddate,
      semesterName: currentSemester.semestername,
    };
  } catch (error) {
    console.error('Error getting user semester dates:', error);
    return null;
  }
}

/**
 * Convert Date to Unix timestamp (seconds)
 */
export function dateToTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Get formatted date range string
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
}
