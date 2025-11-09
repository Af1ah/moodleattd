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

export interface SessionInfo {
  sessionId: string; // unique identifier: date_time_course
  date: string;
  time: string;
  sessionName: string; // course name
  timestamp: number;
}

export interface SessionDate {
  date: string;
  timestamp: number;
  sessions: SessionInfo[]; // multiple sessions per day
}

export interface StudentAttendance {
  studentName: string;
  courseName: string;
  sessions: {
    [sessionId: string]: AttendanceStatus; // keyed by sessionId
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

// Moodle Settings for field mapping

export interface FieldMapping {
  courseNameIndex: number;
  studentNameIndex: number;
  dateTimeIndex: number;
  statusIndex: number;
  gradeIndex: number;
  totalPresentIndex: number;
  totalLateIndex: number;
  totalExcusedIndex: number;
  totalAbsentIndex: number;
}

export interface MoodleSettings {
  baseUrl: string;
  fieldMapping: FieldMapping;
  useCourseName: boolean; // true = use course name, false = use student name
  swapFields: boolean; // swap course and student fields
  lastUpdated: number;
}

// Default field mapping (original implementation)
export const DEFAULT_FIELD_MAPPING: FieldMapping = {
  courseNameIndex: 0,
  studentNameIndex: 1,
  dateTimeIndex: 2,
  statusIndex: 3,
  gradeIndex: 4,
  totalPresentIndex: 5,
  totalLateIndex: 6,
  totalExcusedIndex: 7,
  totalAbsentIndex: 8,
};

// API Request Parameters

export interface MoodleAPIParams {
  wstoken?: string;
  wsfunction: string;
  moodlewsrestformat: string;
  [key: string]: string | number | undefined;
}
