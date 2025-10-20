import { 
  RetrieveReportResponse, 
  AttendanceTableData, 
  StudentAttendance, 
  AttendanceStatus,
  SessionDate 
} from '@/types/moodle';

/**
 * Parse attendance status from various possible values
 */
export function parseAttendanceStatus(value: string | number | null): AttendanceStatus {
  if (!value) return '-';
  
  const statusStr = String(value).toUpperCase().trim();
  
  // Handle common patterns
  if (statusStr === 'P' || statusStr === 'PRESENT') return 'P';
  if (statusStr === 'A' || statusStr === 'ABSENT') return 'A';
  if (statusStr === 'L' || statusStr === 'LATE') return 'L';
  if (statusStr === 'E' || statusStr === 'EXCUSED') return 'E';
  
  return '-';
}



/**
 * Transform Moodle report data into structured attendance table
 * Handles the report builder format with columns array
 * Data structure:
 * - Column 0: Course full name
 * - Column 1: Full name (Student)
 * - Column 2: Session date
 * - Column 3: User session status (P/A/L/E)
 * - Column 4: User session grade (2.00=P, 1.00=L/E, 0.00=A)
 * - Column 5: Status P - Total count
 * - Column 6: Status L - Total count
 * - Column 7: Status E - Total count
 * - Column 8: Status A - Total count
 */
export function transformReportToAttendance(
  reportData: RetrieveReportResponse
): AttendanceTableData {
  const { rows } = reportData.data;
  
  if (!rows || rows.length === 0) {
    return { students: [], sessionDates: [] };
  }

  // Fixed indices based on actual API response
  const courseIndex = 0;      // "Course full name"
  const nameIndex = 1;         // "Full name" 
  const dateIndex = 2;         // "Session date"
  const statusIndex = 3;       // "User session status"
  const gradeIndex = 4;        // "User session grade"
  const totalPIndex = 5;       // "Status P - Total count"
  const totalLIndex = 6;       // "Status L - Total count"
  const totalEIndex = 7;       // "Status E - Total count"
  const totalAIndex = 8;       // "Status A - Total count"

  // Collect all unique sessions and students
  const sessionsSet = new Set<string>();
  const studentsMap = new Map<string, StudentAttendance>();
  
  rows.forEach((row) => {
    // Handle both formats: row.columns array or direct row object
    const columns = Array.isArray(row.columns) ? row.columns : Object.values(row);
    
    const courseName = String(columns[courseIndex] || 'Unknown Course');
    const studentName = String(columns[nameIndex] || 'Unknown Student');
    const sessionDate = String(columns[dateIndex] || '');
    const statusValue = columns[statusIndex] as string | number | null;
    const gradeValue = columns[gradeIndex];
    
    // Parse status - use the status column directly (it already has P/A/L/E)
    let status: AttendanceStatus = parseAttendanceStatus(statusValue);
    
    // Fallback: if status is not clear, derive from grade
    // 2.00 or "2" = P (Present)
    // 1.00 or "1" = L or E (Late or Excused)
    // 0.00 or "0" = A (Absent)
    if (status === '-' && gradeValue !== null) {
      const grade = parseFloat(String(gradeValue));
      if (grade >= 2) {
        status = 'P';
      } else if (grade >= 1) {
        status = 'L'; // Default to L, but could be E
      } else {
        status = 'A';
      }
    }
    
    // Extract totals from the columns
    const totalP = parseInt(String(columns[totalPIndex] || '0')) || 0;
    const totalL = parseInt(String(columns[totalLIndex] || '0')) || 0;
    const totalE = parseInt(String(columns[totalEIndex] || '0')) || 0;
    const totalA = parseInt(String(columns[totalAIndex] || '0')) || 0;
    
    const studentKey = `${studentName}_${courseName}`;
    
    // Add session to set
    if (sessionDate) {
      sessionsSet.add(sessionDate);
    }
    
    // Initialize or update student record
    if (!studentsMap.has(studentKey)) {
      studentsMap.set(studentKey, {
        studentName,
        courseName,
        sessions: {},
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalExcused: 0,
        totalSessions: 0,
      });
    }
    
    const student = studentsMap.get(studentKey)!;
    
    // Update totals to the maximum value seen (since each row may have the cumulative total)
    student.totalPresent = Math.max(student.totalPresent, totalP);
    student.totalLate = Math.max(student.totalLate, totalL);
    student.totalExcused = Math.max(student.totalExcused, totalE);
    student.totalAbsent = Math.max(student.totalAbsent, totalA);
    
    // Record session attendance
    if (sessionDate && status !== '-') {
      student.sessions[sessionDate] = status;
    }
  });
  
  // Calculate total sessions for each student
  studentsMap.forEach((student) => {
    student.totalSessions = student.totalPresent + student.totalAbsent + student.totalLate + student.totalExcused;
  });
  
  // Convert sessions to sorted array
  const sessionDates: SessionDate[] = Array.from(sessionsSet)
    .map(date => ({
      date,
      timestamp: new Date(date).getTime() || Date.now(),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
  
  return {
    students: Array.from(studentsMap.values()),
    sessionDates,
  };
}

/**
 * Export attendance data to CSV format
 */
export function exportToCSV(data: AttendanceTableData): string {
  const { students, sessionDates } = data;
  
  // Build CSV headers
  const headers = [
    'Student Name',
    'Course Name',
    ...sessionDates.map(s => s.date),
    'Total Present',
    'Total Absent',
    'Total Late',
    'Total Excused',
    'Total Sessions',
  ];
  
  // Build CSV rows
  const rows = students.map(student => [
    student.studentName,
    student.courseName,
    ...sessionDates.map(s => student.sessions[s.date] || '-'),
    student.totalPresent,
    student.totalAbsent,
    student.totalLate,
    student.totalExcused,
    student.totalSessions,
  ]);
  
  // Combine into CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
  
  return csvContent;
}

/**
 * Download CSV file
 */
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
