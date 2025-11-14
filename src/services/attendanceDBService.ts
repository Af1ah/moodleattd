/**
 * Attendance Database Service
 * 
 * This service fetches attendance data directly from PostgreSQL database
 * instead of using Moodle Web Services API
 */

import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Types for the attendance data
export interface AttendanceSessionData {
  sessionId: number;
  sessionDate: Date;
  sessionTimestamp: number;
  description: string;
  attendanceName: string;
  attendanceId: number;
  duration: number;
  lasttaken: number | null;
  lasttakenby: number;
}

export interface AttendanceLogData {
  logId: number;
  sessionId: number;
  studentId: number;
  statusId: number;
  statusAcronym: string;
  statusDescription: string;
  statusGrade: number;
  timetaken: number;
  takenby: number;
  remarks: string | null;
}

export interface StudentData {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  idnumber: string;
}

export interface AttendanceStatus {
  id: number;
  acronym: string;
  description: string;
  grade: number;
  attendanceid: number;
}

/**
 * Get all attendance activities for a course
 */
export async function getAttendanceActivitiesByCourse(courseId: number) {
  try {
    const activities = await prisma.mdl_attendance.findMany({
      where: {
        course: BigInt(courseId),
      },
      select: {
        id: true,
        name: true,
        course: true,
        grade: true,
        timemodified: true,
      },
    });

    return activities.map(activity => ({
      id: Number(activity.id),
      name: activity.name || `Attendance ${activity.id}`,
      course: Number(activity.course),
      grade: Number(activity.grade),
      timemodified: Number(activity.timemodified),
    }));
  } catch (error) {
    console.error('Error fetching attendance activities:', error);
    throw new Error('Failed to fetch attendance activities from database');
  }
}

/**
 * Get all sessions for attendance activities in a course
 */
export async function getAttendanceSessionsByCourse(
  courseId: number,
  datefrom?: number,
  dateto?: number
) {
  try {
    // First get attendance activities for this course
    const activities = await getAttendanceActivitiesByCourse(courseId);
    
    if (activities.length === 0) {
      return [];
    }

    const attendanceIds = activities.map(a => BigInt(a.id));

    // Build where clause for date filtering
    const whereClause: {
      attendanceid: { in: bigint[] };
      sessdate?: { gte?: bigint; lte?: bigint };
    } = {
      attendanceid: { in: attendanceIds },
    };

    if (datefrom || dateto) {
      whereClause.sessdate = {};
      if (datefrom) whereClause.sessdate.gte = BigInt(datefrom);
      if (dateto) whereClause.sessdate.lte = BigInt(dateto);
    }

    // Get sessions with related data
    const sessions = await prisma.mdl_attendance_sessions.findMany({
      where: whereClause,
      include: {
        attendance: {
          select: {
            id: true,
            name: true,
          },
        },
        logs: {
          include: {
            status: true,
          },
        },
      },
      orderBy: {
        sessdate: 'asc',
      },
    });

    return sessions.map(session => ({
      id: Number(session.id),
      attendanceid: Number(session.attendanceid),
      attendanceName: session.attendance.name || `Attendance ${session.attendanceid}`,
      sessdate: Number(session.sessdate),
      duration: Number(session.duration),
      lasttaken: session.lasttaken ? Number(session.lasttaken) : null,
      lasttakenby: Number(session.lasttakenby),
      description: session.description,
      groupid: Number(session.groupid),
      logs: session.logs.map(log => ({
        id: Number(log.id),
        sessionid: Number(log.sessionid),
        studentid: Number(log.studentid),
        statusid: Number(log.statusid),
        statusAcronym: log.status.acronym,
        statusDescription: log.status.description,
        statusGrade: Number(log.status.grade),
        timetaken: Number(log.timetaken),
        takenby: Number(log.takenby),
        remarks: log.remarks,
      })),
    }));
  } catch (error) {
    console.error('Error fetching attendance sessions:', error);
    throw new Error('Failed to fetch attendance sessions from database');
  }
}

/**
 * Get all students enrolled in a course (from attendance logs)
 */
export async function getStudentsFromAttendanceLogs(courseId: number) {
  try {
    // First get attendance activities
    const activities = await getAttendanceActivitiesByCourse(courseId);
    
    if (activities.length === 0) {
      return [];
    }

    const attendanceIds = activities.map(a => BigInt(a.id));

    // Get all sessions for these attendance activities
    const sessions = await prisma.mdl_attendance_sessions.findMany({
      where: {
        attendanceid: { in: attendanceIds },
      },
      select: {
        id: true,
      },
    });

    const sessionIds = sessions.map(s => s.id);

    // Get unique student IDs from logs
    const logs = await prisma.mdl_attendance_log.findMany({
      where: {
        sessionid: { in: sessionIds },
      },
      select: {
        studentid: true,
      },
      distinct: ['studentid'],
    });

    const studentIds = logs.map(log => log.studentid);

    // Get student details
    const students = await prisma.mdl_user.findMany({
      where: {
        id: { in: studentIds },
        deleted: 0,
      },
      select: {
        id: true,
        username: true,
        firstname: true,
        lastname: true,
        email: true,
        idnumber: true,
      },
    });

    return students.map(student => ({
      id: Number(student.id),
      username: student.username,
      firstname: student.firstname,
      lastname: student.lastname,
      email: student.email,
      idnumber: student.idnumber,
    }));
  } catch (error) {
    console.error('Error fetching students:', error);
    throw new Error('Failed to fetch students from database');
  }
}

/**
 * Get attendance statuses for a course
 */
export async function getAttendanceStatusesByCourse(courseId: number) {
  try {
    const activities = await getAttendanceActivitiesByCourse(courseId);
    
    if (activities.length === 0) {
      return [];
    }

    const attendanceIds = activities.map(a => BigInt(a.id));

    const statuses = await prisma.mdl_attendance_statuses.findMany({
      where: {
        attendanceid: { in: attendanceIds },
        deleted: 0,
        visible: 1,
      },
      select: {
        id: true,
        attendanceid: true,
        acronym: true,
        description: true,
        grade: true,
      },
    });

    return statuses.map(status => ({
      id: Number(status.id),
      attendanceid: Number(status.attendanceid),
      acronym: status.acronym,
      description: status.description,
      grade: Number(status.grade),
    }));
  } catch (error) {
    console.error('Error fetching attendance statuses:', error);
    throw new Error('Failed to fetch attendance statuses from database');
  }
}

/**
 * Get complete attendance data for a course
 * This is the main function that combines all the data
 */
export async function getCompleteAttendanceData(
  courseId: number,
  filterStudentId?: number,
  datefrom?: number,
  dateto?: number
) {
  try {
    // Fetch all required data
    const [activities, sessions, students, statuses] = await Promise.all([
      getAttendanceActivitiesByCourse(courseId),
      getAttendanceSessionsByCourse(courseId, datefrom, dateto),
      getStudentsFromAttendanceLogs(courseId),
      getAttendanceStatusesByCourse(courseId),
    ]);

    // Filter by student if requested
    let filteredSessions = sessions;
    let filteredStudents = students;

    if (filterStudentId) {
      filteredStudents = students.filter(s => s.id === filterStudentId);
      filteredSessions = sessions.map(session => ({
        ...session,
        logs: session.logs.filter(log => log.studentid === filterStudentId),
      }));
    }

    return {
      activities,
      sessions: filteredSessions,
      students: filteredStudents,
      statuses,
      courseId,
    };
  } catch (error) {
    console.error('Error fetching complete attendance data:', error);
    throw new Error('Failed to fetch complete attendance data from database');
  }
}
