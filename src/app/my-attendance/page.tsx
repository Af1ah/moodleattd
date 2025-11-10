'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/components/AuthProvider';

interface CourseAttendance {
  courseid: number;
  coursename: string;
  shortname: string;
  sessions: {
    date: string;
    timestamp: number;
    status: string; // P, A, L, E (Present, Absent, Late, Excused)
  }[];
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  };
}

function MyAttendanceContent() {
  const router = useRouter();
  const { logout } = useAuth();
  const [attendanceData, setAttendanceData] = useState<CourseAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<{
    userid: number;
    username: string;
    fullname: string;
  } | null>(null);

  useEffect(() => {
    const fetchMyAttendance = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('moodleToken');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Get student info
        const siteInfoResponse = await fetch('/api/moodle/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            wsfunction: 'core_webservice_get_site_info',
            moodlewsrestformat: 'json',
          }),
        });

        if (!siteInfoResponse.ok) {
          throw new Error('Failed to fetch user info');
        }

        const siteInfo = await siteInfoResponse.json();
        setStudentInfo({
          userid: siteInfo.userid,
          username: siteInfo.username,
          fullname: `${siteInfo.firstname} ${siteInfo.lastname}`,
        });

        // Get enrolled courses
        const coursesResponse = await fetch('/api/moodle/', {
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

        if (!coursesResponse.ok) {
          throw new Error('Failed to fetch courses');
        }

        const coursesData = await coursesResponse.json();
        const courses = coursesData.courses || [];

        // For each course, fetch attendance data
        const attendancePromises = courses.map(async (course: { id: number; fullname: string; shortname: string }) => {
          try {
            // Get gradebook items for this course
            const gradeResponse = await fetch('/api/moodle/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                wsfunction: 'gradereport_user_get_grade_items',
                courseid: course.id,
                userid: siteInfo.userid,
                moodlewsrestformat: 'json',
              }),
            });

            if (!gradeResponse.ok) {
              console.warn(`Failed to fetch attendance for course ${course.id}`);
              return null;
            }

            const gradeData = await gradeResponse.json();
            
            // Extract attendance items
            const attendanceItems = gradeData.usergrades?.[0]?.gradeitems?.filter(
              (item: { itemname: string }) => 
                item.itemname && (
                  item.itemname.toLowerCase().includes('attendance') ||
                  item.itemname.toLowerCase().includes('present')
                )
            ) || [];

            if (attendanceItems.length === 0) {
              return null;
            }

            // Process attendance data
            const sessions = attendanceItems.map((item: {
              itemname: string;
              graderaw: number | null;
              grademax: number;
              gradedatesubmitted: number;
            }) => {
              let status = '-';
              if (item.graderaw !== null) {
                const percentage = item.grademax > 0 ? (item.graderaw / item.grademax) * 100 : 0;
                if (percentage >= 100) status = 'P'; // Present
                else if (percentage >= 75) status = 'L'; // Late
                else if (percentage > 0) status = 'E'; // Excused
                else status = 'A'; // Absent
              }

              return {
                date: item.itemname,
                timestamp: item.gradedatesubmitted || 0,
                status,
              };
            });

            // Calculate summary
            const summary = {
              total: sessions.length,
              present: sessions.filter((s: { status: string }) => s.status === 'P').length,
              absent: sessions.filter((s: { status: string }) => s.status === 'A').length,
              late: sessions.filter((s: { status: string }) => s.status === 'L').length,
              excused: sessions.filter((s: { status: string }) => s.status === 'E').length,
              percentage: 0,
            };

            if (summary.total > 0) {
              summary.percentage = Math.round(
                ((summary.present + summary.late * 0.75) / summary.total) * 100
              );
            }

            return {
              courseid: course.id,
              coursename: course.fullname,
              shortname: course.shortname,
              sessions,
              summary,
            };
          } catch (err) {
            console.error(`Error fetching attendance for course ${course.id}:`, err);
            return null;
          }
        });

        const results = await Promise.all(attendancePromises);
        const validResults = results.filter((r): r is CourseAttendance => r !== null);
        setAttendanceData(validResults);

      } catch (err) {
        console.error('Error fetching attendance:', err);
        setError(err instanceof Error ? err.message : 'Failed to load attendance data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyAttendance();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const handleBack = () => {
    router.push('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'P': return 'bg-green-100 text-green-800 border-green-300';
      case 'A': return 'bg-red-100 text-red-800 border-red-300';
      case 'L': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'E': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'P': return 'Present';
      case 'A': return 'Absent';
      case 'L': return 'Late';
      case 'E': return 'Excused';
      default: return 'Not Marked';
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Attendance</h1>
                {studentInfo && (
                  <p className="text-sm text-gray-600">{studentInfo.fullname}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="mt-6 text-gray-600 font-medium">Loading your attendance data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-red-900 font-semibold">Error Loading Attendance</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Data */}
        {!isLoading && !error && attendanceData.length > 0 && (
          <div className="space-y-6">
            {/* Overall Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                <div className="text-sm text-gray-600 mb-1">Total Courses</div>
                <div className="text-3xl font-bold text-gray-900">{attendanceData.length}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                <div className="text-sm text-gray-600 mb-1">Total Present</div>
                <div className="text-3xl font-bold text-green-600">
                  {attendanceData.reduce((sum, course) => sum + course.summary.present, 0)}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                <div className="text-sm text-gray-600 mb-1">Total Absent</div>
                <div className="text-3xl font-bold text-red-600">
                  {attendanceData.reduce((sum, course) => sum + course.summary.absent, 0)}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                <div className="text-sm text-gray-600 mb-1">Avg. Attendance</div>
                <div className={`text-3xl font-bold ${getPercentageColor(
                  Math.round(
                    attendanceData.reduce((sum, course) => sum + course.summary.percentage, 0) / attendanceData.length
                  )
                )}`}>
                  {Math.round(
                    attendanceData.reduce((sum, course) => sum + course.summary.percentage, 0) / attendanceData.length
                  )}%
                </div>
              </div>
            </div>

            {/* Course-wise Attendance */}
            {attendanceData.map((course) => (
              <div key={course.courseid} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Course Header */}
                <div className="bg-linear-to-r from-blue-600 to-blue-700 p-6 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold mb-1">{course.coursename}</h2>
                      <p className="text-blue-100 text-sm">{course.shortname}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${
                        course.summary.percentage >= 75 ? 'text-green-200' :
                        course.summary.percentage >= 60 ? 'text-yellow-200' :
                        'text-red-200'
                      }`}>
                        {course.summary.percentage}%
                      </div>
                      <div className="text-blue-100 text-sm">Attendance</div>
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-4 divide-x divide-gray-200 border-b border-gray-200">
                  <div className="p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{course.summary.total}</div>
                    <div className="text-xs text-gray-600 mt-1">Total Sessions</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{course.summary.present}</div>
                    <div className="text-xs text-gray-600 mt-1">Present</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{course.summary.absent}</div>
                    <div className="text-xs text-gray-600 mt-1">Absent</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{course.summary.late}</div>
                    <div className="text-xs text-gray-600 mt-1">Late</div>
                  </div>
                </div>

                {/* Sessions Grid */}
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Session Details</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {course.sessions.map((session, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-2 ${getStatusColor(session.status)} transition-all hover:shadow-md`}
                      >
                        <div className="text-xs font-medium mb-1 truncate" title={session.date}>
                          {session.date}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold">{session.status}</span>
                          <span className="text-xs">{getStatusText(session.status)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && attendanceData.length === 0 && (
          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Attendance Data</h3>
            <p className="text-gray-600">
              No attendance records found for your enrolled courses.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function MyAttendance() {
  return (
    <ProtectedRoute>
      <MyAttendanceContent />
    </ProtectedRoute>
  );
}
