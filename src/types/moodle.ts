// Moodle API Response Types

export interface MoodleReport {
  id: number;
  name: string;
  source: string;
  type: number;
  uniquerows: boolean;
  conditiondata?: string;
}

export interface ListReportsResponse {
  reports: MoodleReport[];
}

export interface ReportColumn {
  name: string;
  title: string;
  type: string;
  aggregation?: string;
}

export interface ReportRow {
  columns?: (string | number | null)[];
  [key: string]: string | number | null | (string | number | null)[] | undefined;
}

export interface RetrieveReportResponse {
  data: {
    headers: string[];
    rows: ReportRow[];
    totalrowcount: number;
  };
  details: {
    name: string;
    source: string;
  };
  warnings?: unknown[];
}

// Attendance Processing Types

export interface SessionDate {
  date: string;
  timestamp: number;
}

export interface StudentAttendance {
  studentName: string;
  courseName: string;
  sessions: {
    [sessionDate: string]: AttendanceStatus;
  };
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
  totalSessions: number;
}

export type AttendanceStatus = 'P' | 'A' | 'L' | 'E' | '-';

export interface AttendanceTableData {
  students: StudentAttendance[];
  sessionDates: SessionDate[];
}

// API Request Parameters

export interface MoodleAPIParams {
  wstoken: string;
  wsfunction: string;
  moodlewsrestformat: string;
  [key: string]: string | number;
}
