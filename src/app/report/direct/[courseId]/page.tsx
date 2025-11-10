'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/AuthProvider';
import AttendanceTable from '@/components/AttendanceTable';
import { AttendanceTableData } from '@/types/moodle';

interface DirectAttendanceData {
  userId: number;
  userName: string;
  courseId: number;
  attendanceItems: {
    id: number;
    name: string;
    score: number | null;
    formattedScore: string;
    percentage?: string;
    maxGrade: number;
  }[];
  allGradeItems: {
    id: number;
    name: string;
    score: number | null;
    formattedScore: string;
  }[];
}

interface DirectAttendanceResponse {
  success: boolean;
  courseId: number;
  totalStudents: number;
  attendanceData: DirectAttendanceData[];
  rawResponse: object;
  courseName?: string;
}

// Validate direct attendance session data structure
/* eslint-disable @typescript-eslint/no-explicit-any */
function validateDirectAttendanceData(sessions: any[]): { warnings: string[]; isValid: boolean } {
  const warnings: string[] = [];
  let isValid = true;

  if (!sessions || !Array.isArray(sessions)) {
    return { warnings: ['No attendance sessions data received'], isValid: false };
  }

  if (sessions.length === 0) {
    return { warnings: ['No attendance sessions found for this course'], isValid: false };
  }

  // Check essential fields in sessions
  const sampleSession = sessions[0];
  
  if (!sampleSession.sessdate) {
    warnings.push('Session date information missing - dates may not display correctly');
  }
  
  if (!sampleSession.users || !Array.isArray(sampleSession.users)) {
    warnings.push('Student user data missing or invalid');
    isValid = false;
  }
  
  if (!sampleSession.statuses || !Array.isArray(sampleSession.statuses)) {
    warnings.push('Attendance status definitions missing - attendance may not be calculated correctly');
  }
  
  if (!sampleSession.attendance_log || !Array.isArray(sampleSession.attendance_log)) {
    warnings.push('Attendance records missing - all attendance may show as unmarked');
  }

  return { warnings, isValid };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Transform attendance sessions to AttendanceTableData format
/* eslint-disable @typescript-eslint/no-explicit-any */
function transformSessionsToTable(sessions: any[], courseName: string): AttendanceTableData {
  if (!sessions || sessions.length === 0) {
    return { students: [], sessionDates: [] };
  }

  // Group sessions by date and student
  const sessionsMap = new Map<string, any[]>();
  const studentsMap = new Map<number, any>();

  sessions.forEach((session) => {
    const sessionDate = new Date(session.sessdate * 1000).toISOString().split('T')[0];
    const sessionTime = new Date(session.sessdate * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const sessionId = `${sessionDate}_${sessionTime}`;

    // Store session info
    if (!sessionsMap.has(sessionDate)) {
      sessionsMap.set(sessionDate, []);
    }
    sessionsMap.get(sessionDate)!.push({
      sessionId,
      date: sessionDate,
      time: sessionTime,
      sessionName: courseName,
      timestamp: session.sessdate * 1000
    });

    // Create a map of student attendance from attendance_log
    const attendanceLogMap = new Map<number, string>();
    if (session.attendance_log && Array.isArray(session.attendance_log)) {
      session.attendance_log.forEach((log: any) => {
        attendanceLogMap.set(log.studentid, log.statusid);
      });
    }

    // Process students
    if (session.users && Array.isArray(session.users)) {
      session.users.forEach((user: any) => {
        const fullName = `${user.firstname} ${user.lastname}`.trim();
        
        if (!studentsMap.has(user.id)) {
          studentsMap.set(user.id, {
            studentName: fullName || `User ${user.id}`,
            courseName,
            sessions: {},
            totalPresent: 0,
            totalAbsent: 0,
            totalLate: 0,
            totalExcused: 0,
            totalSessions: 0
          });
        }

        const student = studentsMap.get(user.id)!;
        let status: 'P' | 'A' | 'L' | 'E' | '-' = '-';

        // Get the status from attendance_log
        const statusId = attendanceLogMap.get(user.id);
        if (statusId && session.statuses && Array.isArray(session.statuses)) {
          const statusObj = session.statuses.find((s: any) => s.id.toString() === statusId.toString());
          if (statusObj && statusObj.acronym) {
            const acronym = statusObj.acronym.toUpperCase();
            if (acronym === 'P') { status = 'P'; }
            else if (acronym === 'A') { status = 'A'; }
            else if (acronym === 'L') { status = 'L'; }
            else if (acronym === 'E') { status = 'E'; }
          }
        }

        student.sessions[sessionId] = status;
      });
    }
  });

  // Create session dates array
  const sessionDates = Array.from(sessionsMap.entries())
    .map(([date, sessions]) => ({
      date,
      timestamp: sessions[0].timestamp,
      sessions: sessions.sort((a, b) => a.time.localeCompare(b.time))
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  // Note: Totals will be calculated in AttendanceTable based on filtered date range
  return {
    students: Array.from(studentsMap.values()),
    sessionDates
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function DirectAttendanceReport() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.courseId as string);

  const [attendanceData, setAttendanceData] = useState<AttendanceTableData | null>(null);
  const [rawData, setRawData] = useState<DirectAttendanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseName, setCourseName] = useState<string>('');
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  useEffect(() => {
    const fetchDirectAttendance = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('moodleToken');
        if (!token) {
          throw new Error('No authentication token found');
        }

                // First get course info
        let fetchedCourseName = '';
        const courseResponse = await fetch('/api/moodle/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            wsfunction: 'core_course_get_enrolled_courses_by_timeline_classification',
            classification: 'all',
            moodlewsrestformat: 'json',
          }),
        });

        if (courseResponse.ok) {
          const courseData = await courseResponse.json();
          const courses = courseData.courses || [];
          const course = courses.find((c: {id: number; fullname: string}) => c.id === courseId);
          if (course) {
            fetchedCourseName = course.fullname;
            setCourseName(course.fullname);
          }
        }

        // Get attendance sessions
        // Note: attendanceToken will be retrieved on server-side in the API
        const response = await fetch('/api/getAttendanceDirect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId: courseId,
            userToken: token,  // User token for course contents
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`);
        }

        const sessionsResponse = await response.json();
        
        if (!sessionsResponse.success || !sessionsResponse.sessions) {
          throw new Error('No attendance sessions found for this course');
        }

        // Validate the session data structure - this is for direct gradebook only
        const validation = validateDirectAttendanceData(sessionsResponse.sessions);
        setValidationWarnings(validation.warnings);
        
        if (!validation.isValid) {
          throw new Error(`Invalid attendance data structure: ${validation.warnings.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
          console.warn('⚠️ Direct attendance data validation warnings:', validation.warnings);
        }

        console.log(`✅ Retrieved ${sessionsResponse.totalSessions} attendance sessions`);

        // Transform sessions to AttendanceTableData format using the fetched course name
        const tableData = transformSessionsToTable(sessionsResponse.sessions, fetchedCourseName);
        setAttendanceData(tableData);
        
        // Store raw data
        setRawData({
          success: true,
          courseId,
          totalStudents: tableData.students.length,
          attendanceData: [],
          rawResponse: sessionsResponse,
          courseName
        });

      } catch (err) {
        console.error('Failed to fetch direct attendance:', err);
        setError(err instanceof Error ? err.message : 'Failed to load attendance data');
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) {
      fetchDirectAttendance();
    }
  }, [courseId, courseName]);

  const handleBack = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading direct attendance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Attendance</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {courseName || `Course ${courseId}`} - Direct Attendance
                </h1>
                <p className="text-gray-600 mt-1">
                  {rawData ? `${rawData.totalStudents} students` : ''} • Direct from Gradebook
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-lg">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Direct API
            </div>
          </div>
        </div>
      </header>

      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Data Structure Warnings
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {attendanceData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{attendanceData.students.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(attendanceData.students.reduce((sum, student) => sum + student.totalPresent, 0) / attendanceData.students.length)}%
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Data Source</p>
                    <p className="text-2xl font-bold text-gray-900">Gradebook</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <AttendanceTable data={attendanceData} />
            
            {/* Debug Info */}
            {process.env.NODE_ENV === 'development' && rawData && (
              <div className="mt-8 bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Debug: Raw Gradebook Data</h3>
                <pre className="text-sm text-gray-600 overflow-auto max-h-96">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function DirectAttendanceReportPage() {
  return (
    <ProtectedRoute>
      <DirectAttendanceReport />
    </ProtectedRoute>
  );
}