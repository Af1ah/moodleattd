'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/AuthProvider';
import { LTISessionData } from '@/lib/session';
import FilterModal, { DateRange } from '@/components/FilterModal';

interface StudentAttendanceSession {
  sessionId: string;
  sessionDate: string;
  sessionTime: string;
  attendanceName: string;
  status: 'P' | 'A' | 'L' | 'E' | '-';
  statusDescription: string;
}

interface AttendanceRegisterData {
  studentId: string;
  studentName: string;
  courseName: string;
  attendanceActivities: string[]; // List of unique attendance activity names
  sessionDates: string[]; // List of unique session dates
  attendanceMatrix: { [activityName: string]: { [date: string]: StudentAttendanceSession[] } }; // Matrix of activities x dates with arrays for multiple sessions
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
  totalSessions: number;
  attendancePercentage: number;
}

interface AttendanceLog {
  studentid: number;
  statusid: string;
}

interface AttendanceStatus {
  id: number;
  acronym: string;
  description: string;
}

interface AttendanceSessionData {
  sessdate: number;
  attendanceName?: string;
  attendance_log?: AttendanceLog[];
  statuses?: AttendanceStatus[];
}

function StudentAttendancePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  
  const [attendanceData, setAttendanceData] = useState<AttendanceRegisterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ltiSession, setLtiSession] = useState<LTISessionData | null>(null);
  
  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    option: 'month',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [hideNonTakenSessions, setHideNonTakenSessions] = useState(false);

  // Fetch LTI session
  const fetchLTISession = useCallback(async () => {
    try {
      const response = await fetch('/api/lti/session');
      if (!response.ok) {
        throw new Error('No LTI session found');
      }
      const data = await response.json();
      setLtiSession(data.session);
      return data.session;
    } catch (err) {
      setError('Failed to load LTI session data. Please access this page through LTI launch.');
      console.error('LTI session error:', err);
      return null;
    }
  }, []);

  // Fetch student attendance data
  const fetchStudentAttendance = useCallback(async (session: LTISessionData) => {
    if (!session) return;

    setIsLoading(true);
    setError(null);

    try {
      const userToken = localStorage.getItem('moodleToken');
      
      if (!userToken) {
        setError('Please login to view your attendance data');
        return;
      }

      // Get attendance data from database (faster) - NEW METHOD
      const response = await fetch('/api/getAttendanceDB', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: parseInt(courseId),
          filterStudentId: session.userId, // Filter for current student only
        }),
      });
      
      // OLD METHOD (commented out - using Moodle API)
      // const response = await fetch('/api/getAttendanceDirect', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     courseId: parseInt(courseId),
      //     userToken: userToken,
      //     filterStudentId: session.userId,
      //   }),
      // });

      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.note || 'Failed to fetch attendance data');
      }

      // Filter and transform data for the current student only
      const transformedData = transformDataForStudent(result.sessions, session);
      setAttendanceData(transformedData);
      
      // Initialize selected activities with all activities
      setSelectedActivities(new Set(transformedData.attendanceActivities));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Attendance fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  // Transform attendance data for a single student into register format
  const transformDataForStudent = (sessions: AttendanceSessionData[], session: LTISessionData): AttendanceRegisterData => {
    const attendanceMatrix: { [activityName: string]: { [date: string]: StudentAttendanceSession[] } } = {};
    const attendanceActivitiesSet = new Set<string>();
    const sessionDatesSet = new Set<string>();
    
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;

    sessions.forEach((sessionData) => {
      const sessionDate = new Date(sessionData.sessdate * 1000).toISOString().split('T')[0];
      const sessionTime = new Date(sessionData.sessdate * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      const attendanceName = sessionData.attendanceName || session.courseName;
      const sessionId = `${sessionDate}_${sessionTime}_${attendanceName}`;

      // Add to sets for tracking unique activities and dates
      attendanceActivitiesSet.add(attendanceName);
      sessionDatesSet.add(sessionDate);

      // Find current student's attendance for this session
      let status: 'P' | 'A' | 'L' | 'E' | '-' = '-';
      let statusDescription = 'Not marked';

      // Look for the current student in the attendance log
      const studentLog = sessionData.attendance_log?.find((log: AttendanceLog) => 
        log.studentid.toString() === session.userId
      );

      if (studentLog) {
        // Find status description
        const statusDef = sessionData.statuses?.find((s: AttendanceStatus) => 
          s.id.toString() === studentLog.statusid.toString()
        );
        
        if (statusDef) {
          status = statusDef.acronym as 'P' | 'A' | 'L' | 'E' | '-';
          statusDescription = statusDef.description;
          
          // Count attendance
          switch (status) {
            case 'P': totalPresent++; break;
            case 'A': totalAbsent++; break;
            case 'L': totalLate++; break;
            case 'E': totalExcused++; break;
          }
        }
      }

      // Create session object
      const studentSession: StudentAttendanceSession = {
        sessionId,
        sessionDate,
        sessionTime,
        attendanceName,
        status,
        statusDescription
      };

      // Initialize matrix structure
      if (!attendanceMatrix[attendanceName]) {
        attendanceMatrix[attendanceName] = {};
      }
      if (!attendanceMatrix[attendanceName][sessionDate]) {
        attendanceMatrix[attendanceName][sessionDate] = [];
      }
      
      // Add session to the matrix (sorted by time)
      attendanceMatrix[attendanceName][sessionDate].push(studentSession);
      attendanceMatrix[attendanceName][sessionDate].sort((a, b) => a.sessionTime.localeCompare(b.sessionTime));
    });

    const attendanceActivities = Array.from(attendanceActivitiesSet).sort();
    const sessionDates = Array.from(sessionDatesSet).sort();
    const totalSessions = sessions.length;
    const attendancePercentage = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;

    return {
      studentId: session.userId,
      studentName: session.userName,
      courseName: session.courseName,
      attendanceActivities,
      sessionDates,
      attendanceMatrix,
      totalPresent,
      totalAbsent,
      totalLate,
      totalExcused,
      totalSessions,
      attendancePercentage
    };
  };

  useEffect(() => {
    const initializeData = async () => {
      const session = await fetchLTISession();
      if (session) {
        await fetchStudentAttendance(session);
      }
    };

    initializeData();
  }, [fetchLTISession, fetchStudentAttendance]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading your attendance data...</p>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Attendance</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!attendanceData) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No attendance data available</p>
        </div>
      </div>
    );
  }

  // Apply date range filtering to attendance data
  const getFilteredAttendanceData = () => {
    if (!attendanceData) return null;

    // Filter session dates based on date range
    const filteredSessionDates = attendanceData.sessionDates.filter((date) => {
      const sessionDate = new Date(date);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      return sessionDate >= startDate && sessionDate <= endDate;
    });

    // If hiding non-taken days, only show dates that have at least one session
    const visibleSessionDates = hideNonTakenSessions 
      ? filteredSessionDates.filter((date) => {
          return attendanceData.attendanceActivities.some(activity => 
            attendanceData.attendanceMatrix[activity]?.[date]?.length > 0
          );
        })
      : filteredSessionDates;

    // Rebuild attendance matrix with filtered dates
    const filteredAttendanceMatrix: { [activityName: string]: { [date: string]: StudentAttendanceSession[] } } = {};
    let filteredTotalPresent = 0;
    let filteredTotalAbsent = 0;
    let filteredTotalLate = 0;
    let filteredTotalExcused = 0;
    let filteredTotalSessions = 0;

    attendanceData.attendanceActivities.forEach((activity) => {
      filteredAttendanceMatrix[activity] = {};
      visibleSessionDates.forEach((date) => {
        const sessions = attendanceData.attendanceMatrix[activity]?.[date] || [];
        if (sessions.length > 0) {
          filteredAttendanceMatrix[activity][date] = sessions;
          
          // Count attendance for filtered sessions
          sessions.forEach((session) => {
            filteredTotalSessions++;
            switch (session.status) {
              case 'P': filteredTotalPresent++; break;
              case 'A': filteredTotalAbsent++; break;
              case 'L': filteredTotalLate++; break;
              case 'E': filteredTotalExcused++; break;
            }
          });
        } else if (!hideNonTakenSessions) {
          // Include empty days if not hiding them
          filteredAttendanceMatrix[activity][date] = [];
        }
      });
    });

    const filteredAttendancePercentage = filteredTotalSessions > 0 
      ? Math.round((filteredTotalPresent / filteredTotalSessions) * 100) 
      : 0;

    return {
      ...attendanceData,
      sessionDates: visibleSessionDates,
      attendanceMatrix: filteredAttendanceMatrix,
      totalPresent: filteredTotalPresent,
      totalAbsent: filteredTotalAbsent,
      totalLate: filteredTotalLate,
      totalExcused: filteredTotalExcused,
      totalSessions: filteredTotalSessions,
      attendancePercentage: filteredAttendancePercentage,
    };
  };

  const filteredAttendanceData = getFilteredAttendanceData();

  if (!filteredAttendanceData) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No attendance data available for the selected date range</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50">
        <main className="container mx-auto px-4 py-8">
          {/* Header with Filter Button */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Attendance Register</h1>
                <p className="text-gray-600 mt-1">
                  {filteredAttendanceData.courseName} • {filteredAttendanceData.studentName}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Filter</span>
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Present</p>
                  <p className="text-2xl font-bold text-green-600">{filteredAttendanceData.totalPresent}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{filteredAttendanceData.totalAbsent}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Late</p>
                  <p className="text-2xl font-bold text-yellow-600">{filteredAttendanceData.totalLate}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Excused</p>
                  <p className="text-2xl font-bold text-blue-600">{filteredAttendanceData.totalExcused}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Attendance</p>
                  <p className="text-2xl font-bold text-purple-600">{filteredAttendanceData.attendancePercentage}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Register Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Attendance Register</h3>
              <p className="text-sm text-gray-600 mt-1">
                Showing {selectedActivities.size} activities across {filteredAttendanceData.sessionDates.length} dates
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                      Activity
                    </th>
                    {filteredAttendanceData.sessionDates.map((date) => (
                      <th key={date} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-20">
                        <div className="flex flex-col">
                          <span>{new Date(date).toLocaleDateString('en-US', { month: 'short' })}</span>
                          <span className="font-bold">{new Date(date).getDate()}</span>
                          <span className="text-[10px]">{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAttendanceData.attendanceActivities
                    .filter(activity => selectedActivities.has(activity))
                    .map((activity, index) => (
                    <tr key={activity} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-inherit z-10 border-r border-gray-200 max-w-[200px]">
                        <div className="truncate" title={activity}>
                          {activity}
                        </div>
                      </td>
                      {filteredAttendanceData.sessionDates.map((date) => {
                        const sessions = filteredAttendanceData.attendanceMatrix[activity]?.[date] || [];
                        
                        if (sessions.length === 0) {
                          // No sessions for this activity on this date
                          return (
                            <td key={`${activity}-${date}`} className="px-3 py-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-gray-100 text-gray-400">
                                  -
                                </span>
                              </div>
                            </td>
                          );
                        }

                        if (sessions.length === 1) {
                          // Single session for this activity on this date
                          const session = sessions[0];
                          const status = session.status || '-';
                          
                          return (
                            <td key={`${activity}-${date}`} className="px-3 py-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                                  status === 'P' ? 'bg-green-100 text-green-800' :
                                  status === 'A' ? 'bg-red-100 text-red-800' :
                                  status === 'L' ? 'bg-yellow-100 text-yellow-800' :
                                  status === 'E' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-400'
                                }`}>
                                  {status}
                                </span>
                                {session.sessionTime && (
                                  <span className="text-[10px] text-gray-500 mt-1">
                                    {session.sessionTime}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        }

                        // Multiple sessions for this activity on this date
                        return (
                          <td key={`${activity}-${date}`} className="px-3 py-4 text-center">
                            <div className="flex flex-row flex-wrap justify-center gap-1">
                              {sessions.map((session, idx) => (
                                <div key={idx} className="flex flex-col items-center">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                                    session.status === 'P' ? 'bg-green-100 text-green-800' :
                                    session.status === 'A' ? 'bg-red-100 text-red-800' :
                                    session.status === 'L' ? 'bg-yellow-100 text-yellow-800' :
                                    session.status === 'E' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-400'
                                  }`}>
                                    {session.status}
                                  </span>
                                  <span className="text-[8px] text-gray-500 mt-0.5">
                                    {session.sessionTime.split(' ')[0]}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* LTI Session Info */}
          {ltiSession && (
            <div className="mt-8 bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-900">Session Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Student:</span>
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
              </div>
            </div>
          )}
        </main>
        
        {/* Filter Modal */}
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          allCourses={attendanceData?.attendanceActivities || []}
          selectedCourses={selectedActivities}
          onToggleCourse={(activity) => {
            const newSelected = new Set(selectedActivities);
            if (newSelected.has(activity)) {
              newSelected.delete(activity);
            } else {
              newSelected.add(activity);
            }
            setSelectedActivities(newSelected);
          }}
          onToggleAll={() => {
            if (selectedActivities.size === attendanceData?.attendanceActivities.length) {
              setSelectedActivities(new Set());
            } else {
              setSelectedActivities(new Set(attendanceData?.attendanceActivities || []));
            }
          }}
          courseColorMap={new Map()} // We don't need colors for this view
          sessionBasedTracking={false}
          onToggleSessionTracking={() => {}} // Not applicable for student view
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          hideNonTakenSessions={hideNonTakenSessions}
          onToggleHideNonTaken={setHideNonTakenSessions}
        />
      </div>
    </ProtectedRoute>
  );
}

export default StudentAttendancePage;