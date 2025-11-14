/**
 * Type definitions for database-fetched attendance data
 * These types match the response from /api/getAttendanceDB
 */

export interface DBAttendanceUser {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  idnumber: string;
}

export interface DBAttendanceStatus {
  id: number;
  acronym: string;
  description: string;
  grade: number;
}

export interface DBAttendanceLog {
  id: number;
  sessionid: number;
  studentid: number;
  statusid: number;
  timetaken: number;
  takenby: number;
  remarks: string;
}

export interface DBAttendanceSession {
  id: number;
  attendanceid: number;
  attendanceName: string;
  sessdate: number;
  duration: number;
  lasttaken: number | null;
  lasttakenby: number;
  description: string;
  groupid: number;
  users: DBAttendanceUser[];
  statuses: DBAttendanceStatus[];
  attendance_log: DBAttendanceLog[];
}

export interface DBAttendanceActivity {
  id: number;
  name: string;
}

export interface DBAttendanceResponse {
  success: boolean;
  courseId: number;
  attendanceActivities: DBAttendanceActivity[];
  totalAttendanceActivities: number;
  totalSessions: number;
  sessions: DBAttendanceSession[];
  note: string;
  dataSource: 'database';
}

/**
 * Request body for /api/getAttendanceDB POST endpoint
 */
export interface DBAttendanceRequest {
  courseId: number;
  filterStudentId?: number;
  datefrom?: number;  // Unix timestamp
  dateto?: number;    // Unix timestamp
}
