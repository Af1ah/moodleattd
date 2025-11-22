'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/AuthProvider';
import Navigation from '@/components/Navigation';
import AttendanceTable from '@/components/AttendanceTable';
import { AttendanceTableData } from '@/types/moodle';
import { TableSkeleton } from '@/components/SkeletonLoading';

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
    // Use attendance activity name from API (added in backend)
    const attendanceName = session.attendanceName || courseName;
    const sessionId = `${sessionDate}_${sessionTime}_${attendanceName}`;

    // Store session info
    if (!sessionsMap.has(sessionDate)) {
      sessionsMap.set(sessionDate, []);
    }
    sessionsMap.get(sessionDate)!.push({
      sessionId,
      date: sessionDate,
      time: sessionTime,
      sessionName: attendanceName,
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseName, setCourseName] = useState<string>('');
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDirectAttendance = useCallback(async (useCache = true) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const cacheKey = `attendance_course_${courseId}`;
      
      // Check cache first
      if (useCache) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            const cacheAge = Date.now() - cachedData.timestamp;
            // Use cache if less than 5 minutes old
            if (cacheAge < 5 * 60 * 1000) {
              console.log('✅ Using cached attendance data');
              setAttendanceData(cachedData.attendanceData);
              setCourseName(cachedData.courseName);
              setValidationWarnings(cachedData.validationWarnings || []);
              setLastUpdated(new Date(cachedData.timestamp));
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse cached data:', e);
            localStorage.removeItem(cacheKey);
          }
        }
      }

      const token = localStorage.getItem('moodleToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch course info and attendance data in parallel for better performance
      const [courseResponse, response] = await Promise.all([
        fetch('/api/moodle/', {
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
        }),
        // Get attendance sessions from database (faster) - NEW METHOD
        fetch('/api/getAttendanceDB', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId: courseId,
          }),
        })
      ]);

      // Process course name from parallel fetch
      let fetchedCourseName = '';
      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        const courses = courseData.courses || [];
        const course = courses.find((c: {id: number; fullname: string}) => c.id === courseId);
        if (course) {
          fetchedCourseName = course.fullname;
          setCourseName(course.fullname);
        }
      }
      
      // OLD METHOD (commented out - using Moodle API)
      // const response = await fetch('/api/getAttendanceDirect', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     courseId: courseId,
      //     userToken: token,
      //   }),
      // });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`);
      }

      const sessionsResponse = await response.json();
      
      if (!sessionsResponse.success || !sessionsResponse.sessions) {
        throw new Error('No attendance sessions found for this course');
      }

      // Validate the session data structure
      const validation = validateDirectAttendanceData(sessionsResponse.sessions);
      setValidationWarnings(validation.warnings);
      
      if (!validation.isValid) {
        throw new Error(`Invalid attendance data structure: ${validation.warnings.join(', ')}`);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Direct attendance data validation warnings:', validation.warnings);
      }

      console.log(`✅ Retrieved ${sessionsResponse.totalSessions} attendance sessions`);

      // Transform sessions to AttendanceTableData format
      const tableData = transformSessionsToTable(sessionsResponse.sessions, fetchedCourseName);
      setAttendanceData(tableData);
      
      
      
      const now = new Date();
      setLastUpdated(now);

      // Cache the data
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          attendanceData: tableData,
          courseName: fetchedCourseName,
          validationWarnings: validation.warnings,
          timestamp: now.getTime()
        }));
        console.log('✅ Cached attendance data');
      } catch (e) {
        console.warn('Failed to cache data:', e);
      }

    } catch (err) {
      console.error('Failed to fetch direct attendance:', err);
      setError(err instanceof Error ? err.message : 'Failed to load attendance data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchDirectAttendance();
    }
  }, [courseId, fetchDirectAttendance]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDirectAttendance(false); // Force refresh, skip cache
  };

  const handleBack = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navigation 
          title={courseName || 'Loading...'} 
          showBackButton={true} 
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TableSkeleton />
        </main>
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
    <div className="min-h-screen bg-gray-100">
      <Navigation 
        title={courseName ? `${courseName} ` : `Course ${courseId}`} 
        showBackButton={true} 
      />

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
          {/* Attendance Table */}
            <AttendanceTable data={attendanceData} />
         
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