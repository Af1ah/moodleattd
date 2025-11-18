'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute, useAuth } from '@/components/AuthProvider';
import AttendanceTable from '@/components/AttendanceTable';
import Navigation from '@/components/Navigation';
import { AttendanceTableData } from '@/types/moodle';
import { BarChart3 } from 'lucide-react';

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
}

interface AllCoursesData {
  courses: CourseData[];
}

interface CourseSummary {
  courseId: number;
  courseName: string;
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

// Transform API response to AttendanceTableData format
function transformToAttendanceTableData(data: AllCoursesData, studentName: string): AttendanceTableData {
  if (!data.courses || data.courses.length === 0) {
    return { students: [], sessionDates: [] };
  }

  interface SessionInfo {
    sessionId: string;
    sessionName: string;
    time: string;
    date: string;
    timestamp: number;
    courseId: number;
    courseName: string;
  }

  const sessionsMap = new Map<string, SessionInfo[]>();
  const attendanceMap = new Map<string, 'P' | 'A' | 'L' | 'E' | '-'>();

  // Process all sessions from all courses
  data.courses.forEach(course => {
    course.sessions.forEach(session => {
      const sessionDate = session.sessionDate;
      
      if (!sessionsMap.has(sessionDate)) {
        sessionsMap.set(sessionDate, []);
      }

      // Parse timestamp from session date and time
      const timestamp = new Date(`${session.sessionDate} ${session.sessionTime}`).getTime() / 1000;

      const sessionInfo: SessionInfo = {
        sessionId: session.sessionId,
        sessionName: `${course.courseName} - ${session.attendanceName}`,
        time: session.sessionTime,
        date: sessionDate,
        timestamp: timestamp || 0,
        courseId: course.courseId,
        courseName: course.courseName,
      };

      sessionsMap.get(sessionDate)!.push(sessionInfo);
      attendanceMap.set(session.sessionId, session.status);
    });
  });

  // Sort dates
  const sortedDates = Array.from(sessionsMap.keys()).sort();

  // Create session dates array
  const sessionDates = sortedDates.map(date => {
    const sessions = sessionsMap.get(date)!;
    const firstSession = sessions[0];
    return {
      date,
      timestamp: firstSession.timestamp,
      sessions: sessions.sort((a, b) => a.time.localeCompare(b.time)),
    };
  });

  // Create student data
  const sessions: Record<string, 'P' | 'A' | 'L' | 'E' | '-'> = {};
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLate = 0;
  let totalExcused = 0;

  attendanceMap.forEach((status, sessionId) => {
    sessions[sessionId] = status;
    if (status === 'P') totalPresent++;
    else if (status === 'A') totalAbsent++;
    else if (status === 'L') totalLate++;
    else if (status === 'E') totalExcused++;
  });

  const totalSessions = attendanceMap.size;

  const students = [{
    id: 1, // Single student view
    studentName: studentName || 'Student',
    courseName: 'All Courses',
    email: '',
    username: '',
    idnumber: null,
    attendance: attendanceMap,
    sessions,
    totalPresent,
    totalAbsent,
    totalLate,
    totalExcused,
    totalSessions,
  }];

  return { students, sessionDates };
}

function StudentAllCoursesPage() {
  const { userId } = useAuth();
  const [tableData, setTableData] = useState<AttendanceTableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentName] = useState<string>('Student');
  const [courseSummaries, setCourseSummaries] = useState<CourseSummary[]>([]);

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
      const studentId = userId;
      const courseIds = await fetchEnrolledCourses(studentId);

      console.log('📚 Course IDs found:', courseIds);

      if (courseIds.length === 0) {
        console.log('⚠️ No courses found for student');
        setTableData({ students: [], sessionDates: [] });
        setLoading(false);
        return;
      }

      console.log('📊 Request params:', { studentId, courseIds });

      const response = await fetch('/api/getStudentAllCoursesAttendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          courseIds,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API error:', errorText);
        throw new Error('Failed to fetch attendance data');
      }

      const data = await response.json();
      console.log('✅ Attendance data received:', data);
      
      // Calculate course summaries
      const summaries: CourseSummary[] = data.courses.map((course: CourseData) => {
        const totalSessions = course.sessions.length;
        const present = course.sessions.filter(s => s.status === 'P').length;
        const absent = course.sessions.filter(s => s.status === 'A').length;
        const late = course.sessions.filter(s => s.status === 'L').length;
        const excused = course.sessions.filter(s => s.status === 'E').length;
        const percentage = totalSessions > 0 ? (present / totalSessions) * 100 : 0;
        
        return {
          courseId: course.courseId,
          courseName: course.courseName,
          totalSessions,
          present,
          absent,
          late,
          excused,
          percentage,
        };
      });
      
      setCourseSummaries(summaries);
      
      // Transform to AttendanceTableData format
      const transformed = transformToAttendanceTableData(data, studentName);
      setTableData(transformed);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetchEnrolledCourses, userId, studentName]);

  useEffect(() => {
    if (userId) {
      fetchAttendanceData();
    }
  }, [fetchAttendanceData, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm border border-gray-200 max-w-md w-full">
          <div className="text-red-600 text-center">
            <p className="text-base sm:text-lg font-semibold">Error</p>
            <p className="mt-2 text-sm sm:text-base">{error}</p>
            <button 
              onClick={fetchAttendanceData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm sm:text-base rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!tableData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-sm sm:text-base">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <Navigation title="All Courses Attendance" />
        <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">

          {/* Course Summaries */}
          {courseSummaries.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-5 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                Attendance Summary by Course
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {courseSummaries.map((summary) => (
                  <div
                    key={summary.courseId}
                    className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-4 sm:p-5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.07)] transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-base font-bold text-gray-900 flex-1 leading-snug">
                        {summary.courseName}
                      </h3>
                      <div className={`ml-3 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                        summary.percentage >= 75 ? 'bg-green-100 text-green-700' :
                        summary.percentage >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {summary.percentage.toFixed(1)}%
                      </div>
                    </div>
                    
                    {/* Progress Bar - Thinner and softer */}
                    <div className="mb-4">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            summary.percentage >= 75 ? 'bg-green-500' :
                            summary.percentage >= 50 ? 'bg-yellow-400' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${summary.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Statistics - Cleaner layout without bullets */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-xs">Present</span>
                        <span className="font-bold text-gray-900 text-base">{summary.present}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-xs">Absent</span>
                        <span className="font-bold text-gray-900 text-base">{summary.absent}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-xs">Late</span>
                        <span className="font-bold text-gray-900 text-base">{summary.late}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-xs">Excused</span>
                        <span className="font-bold text-gray-900 text-base">{summary.excused}</span>
                      </div>
                    </div>

                    {/* Total Sessions */}
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 text-xs">Total Sessions</span>
                        <span className="font-bold text-gray-900 text-base">{summary.totalSessions}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendance Table Component */}
          <AttendanceTable 
            data={tableData}
          />
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default StudentAllCoursesPage;
