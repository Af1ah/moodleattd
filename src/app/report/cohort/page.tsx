'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/AuthProvider';
import AttendanceTable from '@/components/AttendanceTable';
import { AttendanceTableData } from '@/types/moodle';

interface Cohort {
  id: number;
  name: string;
  idnumber: string | null;
  description: string | null;
}

interface CourseAttendanceData {
  courseId: number;
  courseName: string;
  totalSessions: number;
  totalStudents: number;
  sessions: Array<{
    id: number;
    attendanceid: number;
    attendanceName: string;
    sessdate: number;
    duration: number;
    lasttaken: number | null;
    lasttakenby: number;
    description: string;
    groupid: number;
    users: Array<{
      id: number;
      firstname: string;
      lastname: string;
      email: string;
      username: string;
      idnumber: string;
    }>;
    statuses: Array<{
      id: number;
      acronym: string;
      description: string;
      grade: number;
    }>;
    attendance_log: Array<{
      id: number;
      sessionid: number;
      studentid: number;
      statusid: number;
      timetaken: number;
      takenby: number;
      remarks: string;
    }>;
  }>;
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
  
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceTableData | null>(null);
  const [rawData, setRawData] = useState<CohortAttendanceResponse | null>(null);
  const [isLoadingCohorts, setIsLoadingCohorts] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch available cohorts on mount
  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        setIsLoadingCohorts(true);
        setError(null);

        const response = await fetch('/api/getCohorts', {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch cohorts');
        }

        const data = await response.json();
        setCohorts(data.cohorts || []);
      } catch (err) {
        console.error('Failed to fetch cohorts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load cohorts');
      } finally {
        setIsLoadingCohorts(false);
      }
    };

    fetchCohorts();
  }, []);

  // Fetch attendance data for selected cohort
  const fetchCohortAttendance = useCallback(async () => {
    if (!selectedCohortId) return;

    setIsLoadingAttendance(true);
    setError(null);
    
    try {
      console.log(`🎯 Fetching attendance for cohort ${selectedCohortId}...`);

      const response = await fetch('/api/getCohortAttendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cohortId: selectedCohortId,
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

      console.log(`✅ Retrieved attendance for ${cohortResponse.totalStudents} students across ${cohortResponse.totalCourses} courses`);

      // Transform to AttendanceTableData format
      const tableData = transformCohortDataToTable(cohortResponse);
      setAttendanceData(tableData);
      setRawData(cohortResponse);
      
      const now = new Date();
      setLastUpdated(now);

    } catch (err) {
      console.error('Failed to fetch cohort attendance:', err);
      setError(err instanceof Error ? err.message : 'Failed to load attendance data');
    } finally {
      setIsLoadingAttendance(false);
    }
  }, [selectedCohortId]);

  const handleGetReport = () => {
    if (selectedCohortId) {
      fetchCohortAttendance();
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
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
                  Cohort Attendance Report
                </h1>
                <p className="text-gray-600 mt-1">
                  {rawData ? `${rawData.cohortName} • ${rawData.totalStudents} students • ${rawData.totalCourses} courses` : 'Select a cohort to view consolidated attendance'}
                  {lastUpdated && (
                    <span className="ml-2 text-sm text-gray-500">
                      • Last updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cohort Selection */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Cohort</h2>
          
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="cohort-select" className="block text-sm font-medium text-gray-700 mb-2">
                Cohort / Class
              </label>
              <select
                id="cohort-select"
                value={selectedCohortId || ''}
                onChange={(e) => setSelectedCohortId(Number(e.target.value))}
                disabled={isLoadingCohorts}
                className="block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Select a cohort --</option>
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name} {cohort.idnumber && `(${cohort.idnumber})`}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleGetReport}
              disabled={!selectedCohortId || isLoadingAttendance}
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoadingAttendance ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                'Get Report'
              )}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingCohorts && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <svg className="animate-spin h-12 w-12 text-purple-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600 text-lg">Loading cohorts...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start">
              <div className="shrink-0">
                <svg className="h-6 w-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
                <p className="text-sm text-red-700 mt-2">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Data */}
        {attendanceData && rawData && !isLoadingAttendance && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{rawData.totalStudents}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Courses</p>
                    <p className="text-2xl font-bold text-gray-900">{rawData.totalCourses}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {rawData.courses.reduce((sum, course) => sum + course.totalSessions, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <AttendanceTable 
                data={attendanceData}
                baseUrl={process.env.NEXT_PUBLIC_MOODLE_BASE_URL || ''}
                reportHeaders={[]}
              />
            </div>
          </>
        )}

        {/* Empty State */}
        {!attendanceData && !isLoadingAttendance && !isLoadingCohorts && !error && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Cohort</h3>
            <p className="text-gray-600">
              Choose a cohort from the dropdown above and click &quot;Get Report&quot; to view consolidated attendance data for all students across all courses.
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
