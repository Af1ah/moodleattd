'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute, useAuth } from '@/components/AuthProvider';

interface StudentAttendanceSession {
  sessionId: string;
  sessionDate: string;
  sessionTime: string;
  attendanceName: string;
  status: 'P' | 'A' | 'L' | 'E' | '-';
  statusDescription: string;
  courseId: number;
  courseName: string;
}

interface CourseData {
  courseId: number;
  courseName: string;
  sessions: StudentAttendanceSession[];
  totalSessions: number;
  attendanceStats: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  };
}

interface AllCoursesData {
  courses: CourseData[];
  overallStats: {
    totalSessions: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  };
}

function StudentAllCoursesPage() {
  const { userId } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AllCoursesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const fetchEnrolledCourses = useCallback(async (studentId: number) => {
    try {
      const response = await fetch('/api/getUserEnrolledCourses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: studentId }), // API expects userId, not studentId
      });

      if (!response.ok) {
        throw new Error('Failed to fetch enrolled courses');
      }

      const data = await response.json();
      // API returns { success: true, courses: [...] }
      // Extract courseIds from courses array
      const courseIds = (data.courses || []).map((course: { courseId: number }) => course.courseId);
      console.log('📚 Found course IDs:', courseIds);
      return courseIds;
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      return [];
    }
  }, []);

  const fetchAttendanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!userId) {
        throw new Error('No user ID found');
      }

      console.log('👤 Fetching data for user ID:', userId);
      const studentId = userId; // userId is already a number from auth
      const courseIds = await fetchEnrolledCourses(studentId);

      console.log('📚 Course IDs found:', courseIds);

      if (courseIds.length === 0) {
        console.log('⚠️ No courses found for student');
        setAttendanceData({
          courses: [],
          overallStats: {
            totalSessions: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            percentage: 0,
          },
        });
        setLoading(false);
        return;
      }

      const datefrom = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : undefined;
      const dateto = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : undefined;

      console.log('📅 Fetching attendance from:', new Date(startDate), 'to:', new Date(endDate));
      console.log('📊 Request params:', { studentId, courseIds, datefrom, dateto });

      const response = await fetch('/api/getStudentAllCoursesAttendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          courseIds,
          datefrom,
          dateto,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API error:', errorText);
        throw new Error('Failed to fetch attendance data');
      }

      const data = await response.json();
      console.log('✅ Attendance data received:', data);
      setAttendanceData(data);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetchEnrolledCourses, startDate, endDate, userId]);

  useEffect(() => {
    if (userId) {
      fetchAttendanceData();
    }
  }, [fetchAttendanceData, userId]);

  const downloadCSV = () => {
    if (!attendanceData?.courses.length) return;

    const csvRows = [];
    
    // Headers
    csvRows.push('Course,Session Date,Session Time,Activity,Status,Status Description');
    
    // Data rows
    attendanceData.courses.forEach(course => {
      course.sessions.forEach(session => {
        csvRows.push([
          course.courseName,
          session.sessionDate,
          session.sessionTime,
          session.attendanceName,
          session.status,
          session.statusDescription
        ].join(','));
      });
    });
    
    // Create and download file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all-courses-attendance.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'P': return 'bg-green-100 text-green-800';
      case 'A': return 'bg-red-100 text-red-800';
      case 'L': return 'bg-yellow-100 text-yellow-800';
      case 'E': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-red-600 text-center">
            <p className="text-lg font-semibold">Error</p>
            <p className="mt-2">{error}</p>
            <button 
              onClick={fetchAttendanceData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get all unique dates from all courses
  const getAllUniqueDates = () => {
    if (!attendanceData?.courses) return [];
    
    const datesSet = new Set<string>();
    attendanceData.courses.forEach(course => {
      course.sessions.forEach(session => {
        datesSet.add(session.sessionDate);
      });
    });
    
    return Array.from(datesSet).sort();
  };

  const uniqueDates = getAllUniqueDates();

  // Create a matrix: course -> date -> sessions
  const createAttendanceMatrix = () => {
    const matrix: { [courseId: number]: { [date: string]: StudentAttendanceSession[] } } = {};
    
    attendanceData?.courses.forEach(course => {
      matrix[course.courseId] = {};
      course.sessions.forEach(session => {
        if (!matrix[course.courseId][session.sessionDate]) {
          matrix[course.courseId][session.sessionDate] = [];
        }
        matrix[course.courseId][session.sessionDate].push(session);
      });
    });
    
    return matrix;
  };

  const attendanceMatrix = createAttendanceMatrix();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50">
        <main className="container mx-auto px-4 py-8">
          {/* Header with Filters */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">All Courses Attendance</h1>
                <p className="text-gray-600 mt-1">
                  Comprehensive attendance report across all enrolled courses
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={downloadCSV}
                disabled={!attendanceData?.courses.length}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium">Download CSV</span>
              </button>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="pt-6">
                <button
                  onClick={fetchAttendanceData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {attendanceData?.overallStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Courses</p>
                    <p className="text-2xl font-bold text-indigo-600">{attendanceData.courses.length}</p>
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
                    <p className="text-sm font-medium text-gray-600">Present</p>
                    <p className="text-2xl font-bold text-green-600">{attendanceData.overallStats.present}</p>
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
                    <p className="text-2xl font-bold text-red-600">{attendanceData.overallStats.absent}</p>
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
                    <p className="text-2xl font-bold text-yellow-600">{attendanceData.overallStats.late}</p>
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
                    <p className="text-2xl font-bold text-purple-600">{attendanceData.overallStats.percentage}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Register Table */}
          {attendanceData?.courses.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <p className="text-gray-600 text-lg">
                📭 No attendance data found for the selected date range.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Attendance Register</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {attendanceData?.courses.length} courses across {uniqueDates.length} dates
                </p>
              </div>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                        Course
                      </th>
                      {uniqueDates.map((date) => (
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
                    {attendanceData?.courses.map((course, index) => (
                      <tr key={course.courseId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-inherit z-10 border-r border-gray-200 max-w-[200px]">
                          <div className="truncate" title={course.courseName}>
                            {course.courseName}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {course.attendanceStats.percentage}% attendance
                          </div>
                        </td>
                        {uniqueDates.map((date) => {
                          const sessions = attendanceMatrix[course.courseId]?.[date] || [];
                          
                          if (sessions.length === 0) {
                            return (
                              <td key={`${course.courseId}-${date}`} className="px-3 py-4 text-center">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-gray-100 text-gray-400">
                                  -
                                </span>
                              </td>
                            );
                          }

                          if (sessions.length === 1) {
                            const session = sessions[0];
                            return (
                              <td key={`${course.courseId}-${date}`} className="px-3 py-4 text-center">
                                <div className="flex flex-col items-center">
                                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${getStatusColor(session.status)}`}>
                                    {session.status}
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

                          // Multiple sessions
                          return (
                            <td key={`${course.courseId}-${date}`} className="px-3 py-4 text-center">
                              <div className="flex flex-row flex-wrap justify-center gap-1">
                                {sessions.map((session, idx) => (
                                  <div key={idx} className="flex flex-col items-center">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${getStatusColor(session.status)}`}>
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
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}export default StudentAllCoursesPage;
