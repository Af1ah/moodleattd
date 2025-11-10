// Smart header mapping utility for Moodle responses
// Maps headers by name patterns instead of fixed indices

export interface HeaderMapping {
  courseNameIndex: number;
  studentNameIndex: number;
  studentFullNameIndex: number; // Alternative for full name
  dateTimeIndex: number;
  statusIndex: number;
  gradeIndex: number;
  totalPresentIndex: number;
  totalAbsentIndex: number;
  totalLateIndex: number;
  totalExcusedIndex: number;
  takenIndex: number; // User session taken
}

export interface HeaderMappingResult {
  mapping: HeaderMapping;
  warnings: string[];
  missingCritical: string[];
}

// Header patterns to match against
const HEADER_PATTERNS = {
  courseName: [
    'course full name',
    'course name',
    'coursename',
    'course',
    'fullname'
  ],
  studentName: [
    'name',
    'student name',
    'studentname',
    'user name',
    'username'
  ],
  studentFullName: [
    'full name',
    'fullname',
    'student full name',
    'user full name',
    'userfullname'
  ],
  dateTime: [
    'session date',
    'sessiondate',
    'date',
    'datetime',
    'session time',
    'time'
  ],
  status: [
    'user session status',
    'session status',
    'status',
    'attendance status',
    'sessionstatus'
  ],
  grade: [
    'user session grade',
    'session grade',
    'grade',
    'sessiongrade',
    'gradeformatted'
  ],
  totalPresent: [
    'status p - total count',
    'total present',
    'present count',
    'p count',
    'totalpresent'
  ],
  totalAbsent: [
    'status a - total count',
    'total absent',
    'absent count',
    'a count',
    'totalabsent'
  ],
  totalLate: [
    'status l - total count',
    'total late',
    'late count',
    'l count',
    'totallate'
  ],
  totalExcused: [
    'status e - total count',
    'total excused',
    'excused count',
    'e count',
    'totalexcused'
  ],
  taken: [
    'user session taken',
    'session taken',
    'taken',
    'sessiontaken'
  ]
};

/**
 * Find the best matching header index for a given field
 */
function findHeaderIndex(headers: string[], patterns: string[]): number {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  for (const pattern of patterns) {
    const normalizedPattern = pattern.toLowerCase();
    
    // Exact match first
    const exactIndex = normalizedHeaders.indexOf(normalizedPattern);
    if (exactIndex !== -1) {
      return exactIndex;
    }
    
    // Partial match (contains pattern)
    const partialIndex = normalizedHeaders.findIndex(h => h.includes(normalizedPattern));
    if (partialIndex !== -1) {
      return partialIndex;
    }
  }
  
  return -1;
}

/**
 * Create smart header mapping from Moodle response headers
 */
export function createHeaderMapping(headers: string[]): HeaderMappingResult {
  const warnings: string[] = [];
  const missingCritical: string[] = [];
  
  // Map each field
  const courseNameIndex = findHeaderIndex(headers, HEADER_PATTERNS.courseName);
  const studentNameIndex = findHeaderIndex(headers, HEADER_PATTERNS.studentName);
  const studentFullNameIndex = findHeaderIndex(headers, HEADER_PATTERNS.studentFullName);
  const dateTimeIndex = findHeaderIndex(headers, HEADER_PATTERNS.dateTime);
  const statusIndex = findHeaderIndex(headers, HEADER_PATTERNS.status);
  const gradeIndex = findHeaderIndex(headers, HEADER_PATTERNS.grade);
  const totalPresentIndex = findHeaderIndex(headers, HEADER_PATTERNS.totalPresent);
  const totalAbsentIndex = findHeaderIndex(headers, HEADER_PATTERNS.totalAbsent);
  const totalLateIndex = findHeaderIndex(headers, HEADER_PATTERNS.totalLate);
  const totalExcusedIndex = findHeaderIndex(headers, HEADER_PATTERNS.totalExcused);
  const takenIndex = findHeaderIndex(headers, HEADER_PATTERNS.taken);
  
  // Check for critical fields but be lenient - just log warnings
  if (courseNameIndex === -1) {
    warnings.push('Course name field not found - will skip course identification');
  }
  
  // For student name, prefer full name if available, otherwise use name
  const finalStudentNameIndex = studentFullNameIndex !== -1 ? studentFullNameIndex : studentNameIndex;
  if (finalStudentNameIndex === -1) {
    warnings.push('Student name field not found - will skip student identification');
  }
  
  if (dateTimeIndex === -1) {
    warnings.push('Session date/time field not found - dates may not be accurate');
  }
  
  // Either status or grade should be available for attendance determination
  if (statusIndex === -1 && gradeIndex === -1) {
    warnings.push('Neither session status nor grade field found - attendance determination may be limited');
  }
  
  // Add warnings for missing optional fields
  if (totalPresentIndex === -1) {
    warnings.push('Total present count not found - will calculate from individual records');
  }
  if (totalAbsentIndex === -1) {
    warnings.push('Total absent count not found - will calculate from individual records');
  }
  if (totalLateIndex === -1) {
    warnings.push('Total late count not found - will calculate from individual records');
  }
  if (totalExcusedIndex === -1) {
    warnings.push('Total excused count not found - will calculate from individual records');
  }
  
  // Only fail if we have absolutely no usable data (no fields found at all)
  const fieldsFound = [
    courseNameIndex, finalStudentNameIndex, dateTimeIndex, 
    statusIndex, gradeIndex, totalPresentIndex, totalAbsentIndex, 
    totalLateIndex, totalExcusedIndex, takenIndex
  ].filter(idx => idx !== -1).length;
  
  if (fieldsFound === 0) {
    missingCritical.push('No recognizable fields found in the report headers. Cannot process data.');
  }
  
  const mapping: HeaderMapping = {
    courseNameIndex: courseNameIndex,
    studentNameIndex: finalStudentNameIndex,
    studentFullNameIndex: studentFullNameIndex,
    dateTimeIndex: dateTimeIndex,
    statusIndex: statusIndex,
    gradeIndex: gradeIndex,
    totalPresentIndex: totalPresentIndex,
    totalAbsentIndex: totalAbsentIndex,
    totalLateIndex: totalLateIndex,
    totalExcusedIndex: totalExcusedIndex,
    takenIndex: takenIndex
  };
  
  return {
    mapping,
    warnings,
    missingCritical
  };
}

/**
 * Get a human-readable summary of the header mapping
 */
export function getHeaderMappingSummary(headers: string[], mapping: HeaderMapping): string {
  const mappings = [
    `Course: "${headers[mapping.courseNameIndex] || 'Not found'}"`,
    `Student: "${headers[mapping.studentNameIndex] || 'Not found'}"`,
    `Date/Time: "${headers[mapping.dateTimeIndex] || 'Not found'}"`,
    `Status: "${headers[mapping.statusIndex] || 'Not found'}"`,
    `Grade: "${headers[mapping.gradeIndex] || 'Not found'}"`
  ];
  
  return mappings.join(', ');
}

/**
 * Debug function to show header mapping results
 */
export function debugHeaderMapping(headers: string[], result: HeaderMappingResult): void {
  console.log('🔍 Header Mapping Debug:');
  console.log('Available headers:', headers);
  console.log('Mapped indices:', result.mapping);
  console.log('Mapped values:', {
    courseName: headers[result.mapping.courseNameIndex],
    studentName: headers[result.mapping.studentNameIndex],
    dateTime: headers[result.mapping.dateTimeIndex],
    status: headers[result.mapping.statusIndex],
    grade: headers[result.mapping.gradeIndex],
    totalPresent: headers[result.mapping.totalPresentIndex],
    totalAbsent: headers[result.mapping.totalAbsentIndex],
    totalLate: headers[result.mapping.totalLateIndex],
    totalExcused: headers[result.mapping.totalExcusedIndex],
    taken: headers[result.mapping.takenIndex]
  });
  
  if (result.warnings.length > 0) {
    console.warn('⚠️ Mapping warnings:', result.warnings);
  }
  
  if (result.missingCritical.length > 0) {
    console.error('❌ Missing critical fields:', result.missingCritical);
  }
}