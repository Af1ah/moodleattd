'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AttendanceTable from '@/components/AttendanceTable';
import Navigation from '@/components/Navigation';
import { ProtectedRoute, useAuth } from '@/components/AuthProvider';
import { AttendanceTableData } from '@/types/moodle';
import { TableSkeleton } from '@/components/SkeletonLoading';

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

function IndividualCohortAttendanceReport() {
  const router = useRouter();
  const params = useParams();
  const { userId, role } = useAuth();
  
  const cohortId = Number(params.cohortId);
  
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceTableData | null>(null);
  const [rawData, setRawData] = useState<CohortAttendanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Check if user has access to this cohort
  const checkCohortAccess = useCallback(async () => {
    if (!userId || !role || role.roleShortname === 'student') {
      setError('Access denied. Students cannot view cohort reports.');
      setIsLoading(false);
      return false;
    }

    try {
      const params = new URLSearchParams();
      params.append('userId', userId.toString());
      params.append('roleShortname', role.roleShortname);

      const response = await fetch(`/api/getCohorts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const userCohorts = data.cohorts || [];
        const accessibleCohort = userCohorts.find((c: Cohort) => c.id === cohortId);
        
        if (accessibleCohort) {
          setCohort(accessibleCohort);
          return true;
        } else {
          setError('Access denied. You do not have permission to view this cohort.');
          setIsLoading(false);
          return false;
        }
      } else {
        setError('Failed to verify cohort access.');
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      console.error('Error checking cohort access:', err);
      setError('Failed to verify cohort access.');
      setIsLoading(false);
      return false;
    }
  }, [userId, role, cohortId]);

  // Fetch attendance data for the specific cohort
  const fetchCohortAttendance = useCallback(async () => {
    if (!cohort) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/getCohortAttendance?cohortId=${cohort.id}&userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Received cohort attendance data:', data);
      
      if (data.success) {
        setRawData(data);
        
        // Transform the data for the table
        const tableData = transformCohortDataToTable(data);
        setAttendanceData(tableData);
        setLastUpdated(new Date());
        
        console.log('✅ Cohort attendance data processed successfully');
      } else {
        throw new Error(data.message || 'Failed to fetch cohort attendance');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Error fetching cohort attendance:', err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [cohort]);

  // Initial load
  useEffect(() => {
    const loadCohortData = async () => {
      const hasAccess = await checkCohortAccess();
      if (hasAccess) {
        // fetchCohortAttendance will be called when cohort state is updated
      }
    };
    
    loadCohortData();
  }, [checkCohortAccess]);

  // Fetch attendance when cohort is loaded
  useEffect(() => {
    if (cohort) {
      fetchCohortAttendance();
    }
  }, [cohort, fetchCohortAttendance]);

  const handleRefresh = () => {
    fetchCohortAttendance();
  };

  const handleBackToCohorts = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-100">
          <Navigation 
            title={cohort ? `${cohort.name}${cohort.idnumber ? ` • ${cohort.idnumber}` : ''}` : 'Loading...'} 
            showBackButton={true} 
          />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Summary Stats Skeleton */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    <div className="ml-4 flex-1">
                      <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Table Skeleton */}
            <TableSkeleton />
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !cohort) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-100 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Cohort Report</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleBackToCohorts}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                >
                  Back to Reports
                </button>
                {cohort && (
                  <button
                    onClick={handleRefresh}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <Navigation 
          title={`${cohort.name}${cohort.idnumber ? ` • ${cohort.idnumber}` : ''}`} 
          showBackButton={true} 
        />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Stats */}
          {rawData && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{rawData.totalStudents}</p>
                    <p className="text-gray-600">Students</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{rawData.totalCourses}</p>
                    <p className="text-gray-600">Courses</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {attendanceData?.sessionDates.length || 0}
                    </p>
                    <p className="text-gray-600">Session Days</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">
                      {lastUpdated ? lastUpdated.toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-gray-600">Last Updated</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Table */}
          {attendanceData && attendanceData.students.length > 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {cohort.name} - Attendance Report
                </h2>
                <p className="text-gray-600">
                  Detailed attendance data for all students in this cohort
                </p>
              </div>
              <AttendanceTable 
                data={attendanceData} 
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Attendance Data Available
              </h3>
              <p className="text-gray-600 mb-4">
                There is no attendance data available for this cohort at the moment.
              </p>
              <button
                onClick={handleRefresh}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                Refresh Data
              </button>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default IndividualCohortAttendanceReport;