import {
  RetrieveReportResponse,
  AttendanceTableData,
  StudentAttendance,
  AttendanceStatus,
  SessionDate,
  SessionInfo,
  FieldMapping,
  SmartFieldMapping
} from '@/types/moodle';
import { 
  createHeaderMapping, 
  debugHeaderMapping,
  getHeaderMappingSummary 
} from '@/utils/headerMapping';

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
  fieldMapping?: FieldMapping | SmartFieldMapping
): AttendanceTableData {
  const { rows, headers } = reportData.data;
  if (!rows || rows.length === 0) {
    return { students: [], sessionDates: [] };
  }
  
  // Use smart header mapping if no custom mapping provided
  let actualMapping: FieldMapping | SmartFieldMapping;
  let mappingWarnings: string[] = [];
  let missingCritical: string[] = [];
  
  if (!fieldMapping) {
    // Create smart mapping from headers
    const smartMappingResult = createHeaderMapping(headers);
    actualMapping = { ...smartMappingResult.mapping, isSmartMapping: true as const };
    mappingWarnings = smartMappingResult.warnings;
    missingCritical = smartMappingResult.missingCritical;
    
    // Debug output
    console.log('🔄 Using smart header mapping for headers:', headers);
    console.log('📋 Detected mapping:', getHeaderMappingSummary(headers, smartMappingResult.mapping));
    debugHeaderMapping(headers, smartMappingResult);
    
    // Count how many fields were successfully mapped
    const mappedFieldsCount = Object.values(smartMappingResult.mapping).filter(index => index !== -1).length;
    console.log(`✅ Successfully mapped ${mappedFieldsCount} out of ${Object.keys(smartMappingResult.mapping).length} possible fields`);
    
    // Only fail if we have absolutely no way to process the data
    if (missingCritical.length > 0) {
      console.error('❌ Critical mapping issues:', missingCritical);
      throw new Error(`Unable to process data: ${missingCritical.join(', ')}`);
    }
    
    // Show warnings but continue processing
    if (mappingWarnings.length > 0) {
      console.warn('⚠️ Header mapping warnings (will continue with available fields):', mappingWarnings);
    }
  } else {
    actualMapping = fieldMapping;
    console.log('🔧 Using custom field mapping');
  }
  
  console.log('📊 Smart field mapping results:', {
    course: actualMapping.courseNameIndex !== -1 ? `"${headers[actualMapping.courseNameIndex]}" (index ${actualMapping.courseNameIndex})` : 'NOT FOUND',
    student: actualMapping.studentNameIndex !== -1 ? `"${headers[actualMapping.studentNameIndex]}" (index ${actualMapping.studentNameIndex})` : 'NOT FOUND', 
    date: actualMapping.dateTimeIndex !== -1 ? `"${headers[actualMapping.dateTimeIndex]}" (index ${actualMapping.dateTimeIndex})` : 'NOT FOUND',
    status: actualMapping.statusIndex !== -1 ? `"${headers[actualMapping.statusIndex]}" (index ${actualMapping.statusIndex})` : 'NOT FOUND',
    grade: actualMapping.gradeIndex !== -1 ? `"${headers[actualMapping.gradeIndex]}" (index ${actualMapping.gradeIndex})` : 'NOT FOUND',
    totalP: actualMapping.totalPresentIndex !== -1 ? `"${headers[actualMapping.totalPresentIndex]}" (index ${actualMapping.totalPresentIndex})` : 'NOT FOUND',
    totalA: actualMapping.totalAbsentIndex !== -1 ? `"${headers[actualMapping.totalAbsentIndex]}" (index ${actualMapping.totalAbsentIndex})` : 'NOT FOUND',
    totalL: actualMapping.totalLateIndex !== -1 ? `"${headers[actualMapping.totalLateIndex]}" (index ${actualMapping.totalLateIndex})` : 'NOT FOUND',
    totalE: actualMapping.totalExcusedIndex !== -1 ? `"${headers[actualMapping.totalExcusedIndex]}" (index ${actualMapping.totalExcusedIndex})` : 'NOT FOUND'
  });
  
  console.log('📋 Available headers:', headers);
  
  // Use the mapping (smart or custom)
  const courseIndex = actualMapping.courseNameIndex;
  const nameIndex = actualMapping.studentNameIndex;
  const dateIndex = actualMapping.dateTimeIndex;
  const statusIndex = actualMapping.statusIndex;
  const gradeIndex = actualMapping.gradeIndex;
  const totalPIndex = actualMapping.totalPresentIndex;
  const totalLIndex = actualMapping.totalLateIndex;
  const totalEIndex = actualMapping.totalExcusedIndex;
  const totalAIndex = actualMapping.totalAbsentIndex;
  const sessionsMap = new Map<string, SessionInfo>();
  const studentsMap = new Map<string, StudentAttendance>();
  
  rows.forEach((row) => {
    // Support both array-based and object-based row structures
    let columns: (string | number | null)[];
    
    if (Array.isArray(row.columns)) {
      // Standard array format
      columns = row.columns;
    } else if (row.columns) {
      // Object format - convert to array using headers as guide
      columns = Object.values(row.columns) as (string | number | null)[];
    } else if (headers && headers.length > 0) {
      // Use headers to extract values from row object
      columns = headers.map(header => {
        const value = row[header];
        return (value !== undefined && value !== null && typeof value !== 'object') ? value : null;
      }) as (string | number | null)[];
    } else {
      // Fallback: convert row object to array of values
      columns = Object.values(row).filter(val => 
        typeof val === 'string' || typeof val === 'number' || val === null
      ) as (string | number | null)[];
    }
    
    // Extract data with safe fallbacks for missing fields (only use valid indices)
    let courseName = 'Unknown Course';
    let studentName = 'Unknown Student';
    let sessionDateTime = '';
    
    // Extract course name if field exists
    if (courseIndex !== -1 && courseIndex < columns.length && columns[courseIndex]) {
      courseName = String(columns[courseIndex]);
    }
    
    // Extract student name if field exists (prefer full name over name)
    if (nameIndex !== -1 && nameIndex < columns.length && columns[nameIndex]) {
      studentName = String(columns[nameIndex]);
    }
    
    // Extract session date/time if field exists
    if (dateIndex !== -1 && dateIndex < columns.length && columns[dateIndex]) {
      sessionDateTime = String(columns[dateIndex]);
    }
    
    // Handle status with safe checking
    let statusValue = null;
    if (statusIndex !== -1 && statusIndex < columns.length) {
      statusValue = columns[statusIndex] as string | number | null;
    }
    
    // Handle grade with safe checking
    let gradeValue = null;
    if (gradeIndex !== -1 && gradeIndex < columns.length) {
      gradeValue = columns[gradeIndex];
    }
    
    // Determine attendance status with multiple approaches
    let status: AttendanceStatus = parseAttendanceStatus(statusValue);
    
    // Fallback to grade-based status if no direct status
    if (status === '-' && gradeValue !== null) {
      const grade = parseFloat(String(gradeValue));
      if (!isNaN(grade)) {
        if (grade >= 2) {
          status = 'P';
        } else if (grade >= 1) {
          status = 'L';
        } else {
          status = 'A';
        }
      }
    }
    
    // Skip if we have no meaningful data
    if (!sessionDateTime && status === '-') {
      return; // Skip this row
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
    // Extract totals safely only from available fields
    let totalP = 0, totalL = 0, totalE = 0, totalA = 0;
    let hasTotals = false;
    
    if (totalPIndex !== -1 && totalPIndex < columns.length && columns[totalPIndex] != null) {
      totalP = parseInt(String(columns[totalPIndex])) || 0;
      hasTotals = true;
    }
    if (totalLIndex !== -1 && totalLIndex < columns.length && columns[totalLIndex] != null) {
      totalL = parseInt(String(columns[totalLIndex])) || 0;
      hasTotals = true;
    }
    if (totalEIndex !== -1 && totalEIndex < columns.length && columns[totalEIndex] != null) {
      totalE = parseInt(String(columns[totalEIndex])) || 0;
      hasTotals = true;
    }
    if (totalAIndex !== -1 && totalAIndex < columns.length && columns[totalAIndex] != null) {
      totalA = parseInt(String(columns[totalAIndex])) || 0;
      hasTotals = true;
    }
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
    
    // Only use provided totals if they were actually found in the data
    if (hasTotals && (totalP > 0 || totalL > 0 || totalE > 0 || totalA > 0)) {
      // Use provided totals
      student.totalPresent = Math.max(student.totalPresent, totalP);
      student.totalLate = Math.max(student.totalLate, totalL);
      student.totalExcused = Math.max(student.totalExcused, totalE);
      student.totalAbsent = Math.max(student.totalAbsent, totalA);
    }
    
    if (sessionId && status !== '-') {
      student.sessions[sessionId] = status;
    }
  });
  
  // Final calculation - if no totals were provided, calculate from individual sessions
  studentsMap.forEach((student) => {
    // If totals are all zero, calculate from sessions
    if (student.totalPresent === 0 && student.totalAbsent === 0 && 
        student.totalLate === 0 && student.totalExcused === 0) {
      
      Object.values(student.sessions).forEach(status => {
        switch (status) {
          case 'P': student.totalPresent++; break;
          case 'A': student.totalAbsent++; break;
          case 'L': student.totalLate++; break;
          case 'E': student.totalExcused++; break;
        }
      });
    }
    
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
