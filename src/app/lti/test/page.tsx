'use client';

import { useState, useEffect, useCallback } from 'react';
import AttendanceTable from '@/components/AttendanceTable';
import { AttendanceTableData } from '@/types/moodle';

// LTI Session interface (duplicated here to avoid server-side imports)
interface LTISessionData {
  userId: string;
  userName: string;
  userEmail?: string;
  courseId: string;
  courseName: string;
  roles: string[];
  launchId: string;
  moodleToken: string;
  createdAt: number;
}

// Types for Moodle attendance session data
interface AttendanceUser {
  id: number;
  firstname: string;
  lastname: string;
}

interface AttendanceStatus {
  id: number;
  acronym: string;
  description: string;
}

interface AttendanceLog {
  studentid: number;
  statusid: string;
}

interface AttendanceSession {
  sessdate: number; // Unix timestamp
  attendanceName?: string;
  users: AttendanceUser[];
  statuses: AttendanceStatus[];
  attendance_log: AttendanceLog[];
}

interface SessionsResponse {
  success: boolean;
  sessions: AttendanceSession[];
  totalSessions: number;
}

interface StudentData {
  studentName: string;
  courseName: string;
  sessions: { [sessionId: string]: 'P' | 'A' | 'L' | 'E' | '-' };
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
  totalSessions: number;
}

// Transform attendance sessions to AttendanceTableData format
function transformSessionsToTable(sessions: AttendanceSession[], courseName: string, filterMonth?: { year: number; month: number }): AttendanceTableData {
  if (!sessions || sessions.length === 0) {
    return { students: [], sessionDates: [] };
  }

  // Filter sessions by month if specified
  let filteredSessions = sessions;
  if (filterMonth) {
    filteredSessions = sessions.filter(session => {
      const sessionDate = new Date(session.sessdate * 1000);
      return sessionDate.getFullYear() === filterMonth.year && 
             sessionDate.getMonth() === filterMonth.month - 1; // getMonth() is 0-indexed
    });
  }

  // Group sessions by date and student
  const sessionsMap = new Map<string, Array<{sessionId: string; date: string; time: string; sessionName: string; timestamp: number}>>();
  const studentsMap = new Map<number, StudentData>();

  filteredSessions.forEach((session) => {
    const sessionDate = new Date(session.sessdate * 1000).toISOString().split('T')[0];
    const sessionTime = new Date(session.sessdate * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
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
      session.attendance_log.forEach((log: AttendanceLog) => {
        attendanceLogMap.set(log.studentid, log.statusid);
      });
    }

    // Process students
    if (session.users && Array.isArray(session.users)) {
      session.users.forEach((user: AttendanceUser) => {
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
          const statusObj = session.statuses.find((s: AttendanceStatus) => s.id.toString() === statusId.toString());
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

  return {
    students: Array.from(studentsMap.values()),
    sessionDates
  };
}

function LTITestPage() {
  const [ltiSession, setLtiSession] = useState<LTISessionData | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceTableData | null>(null);
  const [allSessions, setAllSessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Current month filter (default to current month)
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1 // Convert to 1-indexed
  });
  const [availableMonths, setAvailableMonths] = useState<{year: number; month: number; label: string}[]>([]);

  // Get LTI session data
  useEffect(() => {
    const fetchLTISession = async () => {
      try {
        const response = await fetch('/api/lti/session');
        if (!response.ok) {
          throw new Error('No LTI session found');
        }
        const data = await response.json();
        setLtiSession(data.session);
        
        // Check user role and show role information
        const { isStudent, isInstructor, getPrimaryRole } = await import('@/utils/roleUtils');
        const userIsStudent = isStudent(data.session);
        const userIsInstructor = isInstructor(data.session);
        const primaryRole = getPrimaryRole(data.session);
        
        console.log('🔍 Role Check Results:');
        console.log('  - Is Student:', userIsStudent);
        console.log('  - Is Instructor:', userIsInstructor);
        console.log('  - Primary Role:', primaryRole);
        console.log('  - Roles:', data.session.roles);
      } catch (err) {
        setError('Failed to load LTI session data. Please access this page through LTI launch.');
        console.error('LTI session error:', err);
      }
    };

    fetchLTISession();
  }, []);

  const fetchAttendanceData = useCallback(async (useCache = true, monthFilter?: { year: number; month: number }) => {
    if (!ltiSession) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const cacheKey = `lti_attendance_course_${ltiSession.courseId}`;
      
      // Check cache first (only for full data, not filtered)
      if (useCache && !monthFilter) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            const cacheAge = Date.now() - cachedData.timestamp;
            // Use cache if less than 5 minutes old
            if (cacheAge < 5 * 60 * 1000) {
              console.log('✅ Using cached LTI attendance data');
              setAllSessions(cachedData.allSessions);
              
              // Apply current month filter to cached data
              const transformedData = transformSessionsToTable(cachedData.allSessions, ltiSession.courseName, selectedMonth);
              setAttendanceData(transformedData);
              
              // Calculate available months from cached data
              const months = getAvailableMonths(cachedData.allSessions);
              setAvailableMonths(months);
              
              setLastUpdated(new Date(cachedData.timestamp));
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse cached LTI data:', e);
            localStorage.removeItem(cacheKey);
          }
        }
      }

      // Fetch attendance sessions using LTI session token
      const response = await fetch('/api/getAttendanceDirect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: parseInt(ltiSession.courseId),
          userToken: ltiSession.moodleToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`);
      }

      const sessionsResponse: SessionsResponse = await response.json();
      
      if (!sessionsResponse.success || !sessionsResponse.sessions) {
        throw new Error('No attendance sessions found for this course');
      }

      console.log(`✅ Retrieved ${sessionsResponse.totalSessions} attendance sessions for LTI course`);

      // Store all sessions
      setAllSessions(sessionsResponse.sessions);
      
      // Calculate available months
      const months = getAvailableMonths(sessionsResponse.sessions);
      setAvailableMonths(months);

      // Transform sessions to AttendanceTableData format with current filter
      const currentFilter = monthFilter || selectedMonth;
      const tableData = transformSessionsToTable(sessionsResponse.sessions, ltiSession.courseName, currentFilter);
      setAttendanceData(tableData);
      
      const now = new Date();
      setLastUpdated(now);

      // Cache the full data (not filtered)
      if (!monthFilter) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            allSessions: sessionsResponse.sessions,
            timestamp: now.getTime()
          }));
          console.log('✅ Cached LTI attendance data');
        } catch (e) {
          console.warn('Failed to cache LTI data:', e);
        }
      }

    } catch (err) {
      console.error('Failed to fetch LTI attendance:', err);
      setError(err instanceof Error ? err.message : 'Failed to load attendance data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [ltiSession, selectedMonth]);

  // Get available months from sessions
  const getAvailableMonths = (sessions: AttendanceSession[]) => {
    const monthsSet = new Set<string>();
    const months: {year: number; month: number; label: string}[] = [];

    sessions.forEach(session => {
      const date = new Date(session.sessdate * 1000);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;
      
      if (!monthsSet.has(key)) {
        monthsSet.add(key);
        months.push({
          year,
          month,
          label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        });
      }
    });

    return months.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year; // Newest year first
      return b.month - a.month; // Newest month first
    });
  };

  // Handle month filter change
  const handleMonthChange = (year: number, month: number) => {
    setSelectedMonth({ year, month });
    if (allSessions.length > 0) {
      const transformedData = transformSessionsToTable(allSessions, ltiSession?.courseName || '', { year, month });
      setAttendanceData(transformedData);
    }
  };

  // Fetch data when LTI session is loaded
  useEffect(() => {
    if (ltiSession) {
      fetchAttendanceData();
    }
  }, [ltiSession, fetchAttendanceData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAttendanceData(false); // Force refresh, skip cache
  };

  const handleBackToMoodle = () => {
    // Try to go back to Moodle or show message
    if (window.opener) {
      window.close();
    } else {
      alert('Please close this tab to return to Moodle');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading LTI attendance data...</p>
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
            onClick={handleBackToMoodle}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Moodle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToMoodle}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {ltiSession?.courseName} - Attendance Report
                </h1>
                <p className="text-gray-600 mt-1">
                  LTI Session • User: {ltiSession?.userName}
                  {lastUpdated && (
                    <span className="ml-2 text-sm text-gray-500">
                      • Last updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Month Filter */}
              {availableMonths.length > 0 && (
                <select
                  value={`${selectedMonth.year}-${selectedMonth.month}`}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-').map(Number);
                    handleMonthChange(year, month);
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availableMonths.map(({ year, month, label }) => (
                    <option key={`${year}-${month}`} value={`${year}-${month}`}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
              
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh data"
              >
                <svg 
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {attendanceData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Students</p>
                    <p className="text-2xl font-bold text-gray-900">{attendanceData.students.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Sessions</p>
                    <p className="text-2xl font-bold text-gray-900">{attendanceData.sessionDates.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {attendanceData.students.length > 0 ? 
                        Math.round(attendanceData.students.reduce((sum, student) => sum + (student.totalPresent || 0), 0) / attendanceData.students.length) : 0}%
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Period</p>
                    <p className="text-lg font-bold text-gray-900">
                      {availableMonths.find(m => m.year === selectedMonth.year && m.month === selectedMonth.month)?.label || 'Current'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <AttendanceTable data={attendanceData} />
            
            {/* LTI Session Info */}
            {ltiSession && (
              <div className="mt-8 bg-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-blue-900">LTI Session Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">User:</span>
                    <span className="ml-2 text-blue-700">{ltiSession.userName} ({ltiSession.userId})</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Course:</span>
                    <span className="ml-2 text-blue-700">{ltiSession.courseName} ({ltiSession.courseId})</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Roles:</span>
                    <span className="ml-2 text-blue-700">{ltiSession.roles.join(', ')}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Launch ID:</span>
                    <span className="ml-2 text-blue-700">{ltiSession.launchId}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default LTITestPage;