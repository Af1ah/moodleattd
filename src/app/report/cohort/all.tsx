'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AttendanceTable from '@/components/AttendanceTable';
import { ProtectedRoute, useAuth } from '@/components/AuthProvider';
import { AttendanceTableData } from '@/types/moodle';

// Cohort interface
interface Cohort {
  id: number;
  name: string;
  idnumber?: string;
  description?: string;
  visible: number;
  component: string;
  timecreated: number;
  timemodified: number;
  contextid?: number;
}

// Enhanced cohort interface with attendance data
interface CohortWithAttendance extends Cohort {
  attendanceData: AttendanceTableData | null;
  rawData: CohortAttendanceResponse | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Course attendance data interfaces
interface CourseAttendanceData {
  courseId: number;
  courseName: string;
  sessions: {
    id: number;
    attendanceName: string;
    sessdate: number;
    duration: number;
    users: Array<{
      id: number;
      username: string;
      firstname: string;
      lastname: string;
      email: string;
      idnumber: string | null;
    }>;
    attendance_log: Array<{
      studentid: number;
      statusid: number;
      sessdate: number;
      timetaken: number;
    }>;
    statuses: Array<{
      id: number;
      acronym: string;
      description: string;
      grade: number;
      studentavailability: string | null;
      remarks: string;
    }>;
  }[];
  totalSessions: number;
  totalUsers: number;
}

interface CohortAttendanceResponse {
  success: boolean;
  cohortId: number;
  cohortName: string;
  cohortIdNumber: string | null;
  totalStudents: number;
  totalCourses: number;
  courses: CourseAttendanceData[];
  dataSource: string;
  timestamp: number;
}

// Transform cohort attendance data to AttendanceTableData format
/* eslint-disable @typescript-eslint/no-explicit-any */
function transformCohortDataToTable(cohortData: CohortAttendanceResponse): AttendanceTableData {
  if (!cohortData.courses || cohortData.courses.length === 0) {
    return { students: [], sessionDates: [] };
  }

  // Collect all students across all courses
  const studentsMap = new Map<number, any>();
  const sessionsMap = new Map<string, any[]>();

  // Process each course's attendance data
  cohortData.courses.forEach(course => {
    course.sessions.forEach(session => {
      const sessionDate = new Date(session.sessdate * 1000).toISOString().split('T')[0];
      const sessionTime = new Date(session.sessdate * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      // Include course name in session identifier to differentiate sessions across courses
      const sessionId = `${sessionDate}_${sessionTime}_${course.courseName}_${session.attendanceName}`;

      // Store session info
      if (!sessionsMap.has(sessionDate)) {
        sessionsMap.set(sessionDate, []);
      }

      const sessionInfo = {
        sessionId: sessionId,
        sessionName: `${course.courseName} - ${session.attendanceName}`,
        time: sessionTime,
        date: sessionDate,
        timestamp: session.sessdate,
        duration: session.duration,
        courseId: course.courseId,
        courseName: course.courseName,
      };

      sessionsMap.get(sessionDate)!.push(sessionInfo);

      // Collect students
      session.users.forEach(user => {
        if (!studentsMap.has(user.id)) {
          studentsMap.set(user.id, {
            id: user.id,
            studentName: `${user.firstname} ${user.lastname}`,
            courseName: cohortData.cohortName, // Use cohort name for multi-course view
            email: user.email,
            username: user.username,
            idnumber: user.idnumber,
            attendance: new Map<string, any>(),
            sessions: {}, // Will be populated from attendance Map
            totalPresent: 0,
            totalAbsent: 0,
            totalLate: 0,
            totalExcused: 0,
            totalSessions: 0,
          });
        }

        // Find the attendance log for this student in this session
        const log = session.attendance_log.find(l => l.studentid === user.id);
        const status = log 
          ? session.statuses.find(s => s.id === log.statusid)
          : null;

        // Map to simple status string ('P', 'A', 'L', 'E', or '-')
        let statusChar: 'P' | 'A' | 'L' | 'E' | '-' = '-';
        if (status && status.acronym) {
          const acronym = status.acronym.toUpperCase();
          if (acronym === 'P') { statusChar = 'P'; }
          else if (acronym === 'A') { statusChar = 'A'; }
          else if (acronym === 'L') { statusChar = 'L'; }
          else if (acronym === 'E') { statusChar = 'E'; }
        }

        const student = studentsMap.get(user.id)!;
        student.attendance.set(sessionId, statusChar);
      });
    });
  });

  // Convert to array format expected by AttendanceTable
  const students = Array.from(studentsMap.values()).map(student => ({
    ...student,
    sessions: Object.fromEntries(student.attendance),
  }));

  // Sort session dates
  const sortedDates = Array.from(sessionsMap.keys()).sort();
  const sessionDates = sortedDates.map(date => {
    const sessions = sessionsMap.get(date)!.sort((a, b) => a.timestamp - b.timestamp);
    return {
      date,
      timestamp: sessions[0]?.timestamp || 0,
      sessions,
    };
  });

  return { students, sessionDates };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function CohortAttendanceReport() {
  const router = useRouter();
  const { userId, role } = useAuth();
  
  const [cohorts, setCohorts] = useState<CohortWithAttendance[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch attendance data for a specific cohort
  const fetchCohortAttendance = useCallback(async (cohortId: number) => {
    // Update the specific cohort's loading state
    setCohorts(prev => prev.map(cohort => 
      cohort.id === cohortId 
        ? { ...cohort, isLoading: true, error: null }
        : cohort
    ));
    
    try {
      console.log(`🎯 Fetching attendance for cohort ${cohortId}...`);

      const response = await fetch('/api/getCohortAttendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cohortId: cohortId,
          userId: userId, // Pass userId to filter courses
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`);
      }

      const cohortResponse: CohortAttendanceResponse = await response.json();
      
      if (!cohortResponse.success) {
        throw new Error('Failed to fetch cohort attendance data');
      }

      console.log(`✅ Retrieved attendance for cohort ${cohortId}: ${cohortResponse.totalStudents} students across ${cohortResponse.totalCourses} courses`);

      // Transform to AttendanceTableData format
      const tableData = transformCohortDataToTable(cohortResponse);
      
      // Update the specific cohort's data
      setCohorts(prev => prev.map(cohort => 
        cohort.id === cohortId 
          ? {
              ...cohort,
              attendanceData: tableData,
              rawData: cohortResponse,
              isLoading: false,
              error: null,
              lastUpdated: new Date(),
            }
          : cohort
      ));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch attendance data';
      console.error(`Failed to fetch attendance for cohort ${cohortId}:`, err);
      
      // Update the specific cohort's error state
      setCohorts(prev => prev.map(cohort => 
        cohort.id === cohortId 
          ? { ...cohort, isLoading: false, error: errorMessage }
          : cohort
      ));
    }
  }, []);

  // Fetch available cohorts on mount
  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        setIsInitialLoading(true);
        setError(null);

        // Build query params with user info
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId.toString());
        if (role?.roleShortname) params.append('roleShortname', role.roleShortname);

        const response = await fetch(`/api/getCohorts?${params.toString()}`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch cohorts');
        }

        const data = await response.json();
        const userCohorts = data.cohorts || [];
        
        // Initialize cohorts with empty attendance data
        const cohortsWithAttendance: CohortWithAttendance[] = userCohorts.map((cohort: Cohort) => ({
          ...cohort,
          attendanceData: null,
          rawData: null,
          isLoading: false,
          error: null,
          lastUpdated: null,
        }));

        setCohorts(cohortsWithAttendance);
        
        // Show message if user has no cohort access
        if (userCohorts.length === 0 && data.message) {
          setError(data.message);
        }
        
        // Auto-fetch attendance for each cohort
        cohortsWithAttendance.forEach((cohort) => {
          fetchCohortAttendance(cohort.id);
        });
        
      } catch (err) {
        console.error('Failed to fetch cohorts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load cohorts');
      } finally {
        setIsInitialLoading(false);
      }
    };

    if (userId && role) {
      fetchCohorts();
    }
  }, [userId, role, fetchCohortAttendance]);

  const handleRefreshCohort = async (cohortId: number) => {
    await fetchCohortAttendance(cohortId);
  };

  const handleBack = () => {
    router.push('/');
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your cohorts...</p>
        </div>
      </div>
    );
  }

  if (error && cohorts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Cohort Access</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to home"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Cohort Attendance Reports
                </h1>
                <p className="text-gray-600 mt-1">
                  Consolidated attendance data for all your assigned cohorts
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cohort Reports */}
        <div className="space-y-6">
          {cohorts.map((cohort) => (
            <div key={cohort.id} className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
              {/* Cohort Header */}
              <div className="bg-linear-to-r from-purple-600 to-blue-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{cohort.name}</h2>
                    <p className="text-purple-100 mt-1">
                      {cohort.idnumber ? `ID: ${cohort.idnumber}` : 'Cohort Report'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {cohort.rawData && (
                      <div className="text-right">
                        <div className="text-sm text-purple-100">Students • Courses • Sessions</div>
                        <div className="text-lg font-bold">
                          {cohort.rawData.totalStudents} • {cohort.rawData.totalCourses} • {cohort.rawData.courses.reduce((sum, course) => sum + course.totalSessions, 0)}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => handleRefreshCohort(cohort.id)}
                      disabled={cohort.isLoading}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
                      title="Refresh attendance data"
                    >
                      <svg className={`w-5 h-5 ${cohort.isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>
                {cohort.lastUpdated && (
                  <p className="text-purple-100 text-sm mt-3">
                    Last updated: {cohort.lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>

              {/* Cohort Content */}
              <div className="p-6">
                {cohort.isLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading attendance data...</p>
                    </div>
                  </div>
                )}

                {cohort.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="shrink-0">
                        <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Error loading attendance data
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          {cohort.error}
                        </div>
                        <button
                          onClick={() => handleRefreshCohort(cohort.id)}
                          className="mt-2 text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {cohort.attendanceData && !cohort.isLoading && (
                  <AttendanceTable 
                    data={cohort.attendanceData}
                    baseUrl={process.env.NEXT_PUBLIC_MOODLE_BASE_URL || ''}
                    reportHeaders={[]}
                  />
                )}

                {!cohort.attendanceData && !cohort.isLoading && !cohort.error && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p>No attendance data available</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State - No Cohorts */}
        {cohorts.length === 0 && !isInitialLoading && (
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-12 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Cohorts Available</h3>
            <p className="text-gray-600">
              You don&apos;t have access to any cohorts. Contact your administrator to get cohort access assigned to your role.
            </p>
          </div>
        )}
        
      </main>
    </div>
  );
}

export default function CohortAttendanceReportPage() {
  return (
    <ProtectedRoute>
      <CohortAttendanceReport />
    </ProtectedRoute>
  );
}