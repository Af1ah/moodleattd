import {
  RetrieveReportResponse,
  AttendanceTableData,
  StudentAttendance,
  AttendanceStatus,
  SessionDate,
  SessionInfo,
  FieldMapping,
  DEFAULT_FIELD_MAPPING
} from '@/types/moodle';

export function parseAttendanceStatus(value: string | number | null): AttendanceStatus {
  if (!value) return '-';
  const statusStr = String(value).toUpperCase().trim();
  if (statusStr === 'P' || statusStr === 'PRESENT') return 'P';
  if (statusStr === 'A' || statusStr === 'ABSENT') return 'A';
  if (statusStr === 'L' || statusStr === 'LATE') return 'L';
  if (statusStr === 'E' || statusStr === 'EXCUSED') return 'E';
  return '-';
}

function extractTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '00:00';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '00:00';
  }
}

function extractDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

export function transformReportToAttendance(
  reportData: RetrieveReportResponse,
  fieldMapping: FieldMapping = DEFAULT_FIELD_MAPPING
): AttendanceTableData {
  const { rows } = reportData.data;
  if (!rows || rows.length === 0) {
    return { students: [], sessionDates: [] };
  }
  
  // Use custom field mapping
  const courseIndex = fieldMapping.courseNameIndex;
  const nameIndex = fieldMapping.studentNameIndex;
  const dateIndex = fieldMapping.dateTimeIndex;
  const statusIndex = fieldMapping.statusIndex;
  const gradeIndex = fieldMapping.gradeIndex;
  const totalPIndex = fieldMapping.totalPresentIndex;
  const totalLIndex = fieldMapping.totalLateIndex;
  const totalEIndex = fieldMapping.totalExcusedIndex;
  const totalAIndex = fieldMapping.totalAbsentIndex;
  const sessionsMap = new Map<string, SessionInfo>();
  const studentsMap = new Map<string, StudentAttendance>();
  rows.forEach((row) => {
    const columns = Array.isArray(row.columns) ? row.columns : Object.values(row);
    const courseName = String(columns[courseIndex] || 'Unknown Course');
    const studentName = String(columns[nameIndex] || 'Unknown Student');
    const sessionDateTime = String(columns[dateIndex] || '');
    const statusValue = columns[statusIndex] as string | number | null;
    const gradeValue = columns[gradeIndex];
    let status: AttendanceStatus = parseAttendanceStatus(statusValue);
    if (status === '-' && gradeValue !== null) {
      const grade = parseFloat(String(gradeValue));
      if (grade >= 2) {
        status = 'P';
      } else if (grade >= 1) {
        status = 'L';
      } else {
        status = 'A';
      }
    }
    const dateOnly = extractDate(sessionDateTime);
    const timeOnly = extractTime(sessionDateTime);
    const timestamp = new Date(sessionDateTime).getTime() || Date.now();
    const sessionId = `${dateOnly}_${timeOnly}_${courseName}`;
    if (!sessionsMap.has(sessionId)) {
      sessionsMap.set(sessionId, {
        sessionId,
        date: dateOnly,
        time: timeOnly,
        sessionName: courseName,
        timestamp,
      });
    }
    const totalP = parseInt(String(columns[totalPIndex] || '0')) || 0;
    const totalL = parseInt(String(columns[totalLIndex] || '0')) || 0;
    const totalE = parseInt(String(columns[totalEIndex] || '0')) || 0;
    const totalA = parseInt(String(columns[totalAIndex] || '0')) || 0;
    const studentKey = `${studentName}`;
    if (!studentsMap.has(studentKey)) {
      studentsMap.set(studentKey, {
        studentName,
        courseName: '',
        sessions: {},
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalExcused: 0,
        totalSessions: 0,
      });
    }
    const student = studentsMap.get(studentKey)!;
    student.totalPresent = Math.max(student.totalPresent, totalP);
    student.totalLate = Math.max(student.totalLate, totalL);
    student.totalExcused = Math.max(student.totalExcused, totalE);
    student.totalAbsent = Math.max(student.totalAbsent, totalA);
    if (sessionId && status !== '-') {
      student.sessions[sessionId] = status;
    }
  });
  studentsMap.forEach((student) => {
    student.totalSessions = student.totalPresent + student.totalAbsent + student.totalLate + student.totalExcused;
  });
  const allSessions = Array.from(sessionsMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  const dateMap = new Map<string, SessionInfo[]>();
  allSessions.forEach(session => {
    if (!dateMap.has(session.date)) {
      dateMap.set(session.date, []);
    }
    dateMap.get(session.date)!.push(session);
  });
  const sessionDates: SessionDate[] = Array.from(dateMap.entries())
    .map(([date, sessions]) => ({
      date,
      timestamp: sessions[0].timestamp,
      sessions: sessions.sort((a, b) => a.time.localeCompare(b.time)),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
  return {
    students: Array.from(studentsMap.values()),
    sessionDates,
  };
}

export function exportToCSV(data: AttendanceTableData): string {
  const { students, sessionDates } = data;
  const sessionHeaders: string[] = [];
  sessionDates.forEach(dateGroup => {
    dateGroup.sessions.forEach(session => {
      sessionHeaders.push(`${session.date} ${session.time} - ${session.sessionName}`);
    });
  });
  const headers = [
    'Student Name',
    ...sessionHeaders,
    'Total Present',
    'Total Absent',
    'Total Late',
    'Total Excused',
    'Total Sessions',
  ];
  const rows = students.map(student => {
    const sessionValues: string[] = [];
    sessionDates.forEach(dateGroup => {
      dateGroup.sessions.forEach(session => {
        sessionValues.push(student.sessions[session.sessionId] || '-');
      });
    });
    return [
      student.studentName,
      ...sessionValues,
      student.totalPresent,
      student.totalAbsent,
      student.totalLate,
      student.totalExcused,
      student.totalSessions,
    ];
  });
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
  return csvContent;
}

export function downloadCSV(csvContent: string, filename: string = 'attendance_report.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
