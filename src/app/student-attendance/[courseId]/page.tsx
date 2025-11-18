'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/AuthProvider';
import { LTISessionData } from '@/lib/session';
import AttendanceTable from '@/components/AttendanceTable';
import { AttendanceTableData } from '@/types/moodle';

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

interface SessionInfo {
  sessionId: string;
  sessionName: string;
  time: string;
  date: string;
  timestamp: number;
  courseId: number;
  courseName: string;
}

// Transform attendance data for a single student into AttendanceTableData format
const transformDataForStudent = (sessions: AttendanceSessionData[], session: LTISessionData, courseId: string): AttendanceTableData => {
  const sessionDatesMap = new Map<string, { timestamp: number; sessions: SessionInfo[] }>();
  const attendanceMap = new Map<string, 'P' | 'A' | 'L' | 'E' | '-'>();
  
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
    
    const attendanceName = sessionData.attendanceName || session.courseName || 'Unknown';
    const sessionId = `${sessionDate}_${sessionTime}_${attendanceName}`;

    // Find current student's attendance for this session
    let status: 'P' | 'A' | 'L' | 'E' | '-' = '-';

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
        
        // Count attendance
        switch (status) {
          case 'P': totalPresent++; break;
          case 'A': totalAbsent++; break;
          case 'L': totalLate++; break;
          case 'E': totalExcused++; break;
        }
      }
    }

    // Add to session dates map
    if (!sessionDatesMap.has(sessionDate)) {
      sessionDatesMap.set(sessionDate, {
        timestamp: sessionData.sessdate,
        sessions: []
      });
    }
    
    sessionDatesMap.get(sessionDate)!.sessions.push({
      sessionId,
      sessionName: attendanceName,
      time: sessionTime,
      date: sessionDate,
      timestamp: sessionData.sessdate,
      courseId: parseInt(courseId),
      courseName: session.courseName || 'Unknown Course'
    });

    attendanceMap.set(sessionId, status);
  });

  // Create sessionDates array
  const sessionDates = Array.from(sessionDatesMap.keys())
    .sort()
    .map(date => ({
      date,
      timestamp: sessionDatesMap.get(date)!.timestamp,
      sessions: sessionDatesMap.get(date)!.sessions.sort((a, b) => a.time.localeCompare(b.time))
    }));

  const totalSessions = sessions.length;
  const sessionsRecord: Record<string, 'P' | 'A' | 'L' | 'E' | '-'> = {};
  attendanceMap.forEach((status, sessionId) => {
    sessionsRecord[sessionId] = status;
  });

  // Create student data
  const students = [{
    id: parseInt(session.userId),
    studentName: session.userName,
    courseName: session.courseName || 'Unknown Course',
    email: '',
    username: '',
    idnumber: null,
    attendance: attendanceMap,
    sessions: sessionsRecord,
    totalPresent,
    totalAbsent,
    totalLate,
    totalExcused,
    totalSessions,
  }];

  return { students, sessionDates };
};

function StudentAttendancePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  
  const [attendanceData, setAttendanceData] = useState<AttendanceTableData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ltiSession, setLtiSession] = useState<LTISessionData | null>(null);

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

  // Fetch student attendance data using the same logic as all-courses page
  const fetchStudentAttendance = useCallback(async (session: LTISessionData) => {
    if (!session) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetching attendance data
      
      // Use the same API as student-all-courses page (no date restrictions)
      const response = await fetch('/api/getStudentAllCoursesAttendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: parseInt(session.userId),
          courseIds: [parseInt(courseId)], // Single course from LTI launch
          // No datefrom/dateto - fetch all data
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }

      const result = await response.json();
      console.log('✅ Attendance data received:', result);
      
      if (!result.success || !result.courses || result.courses.length === 0) {
        console.log('⚠️ No attendance data found for this course');
        setAttendanceData({ students: [], sessionDates: [] });
        return;
      }

      // Extract the single course data
      const courseData = result.courses[0];
      console.log(`📊 Found ${courseData.sessions.length} sessions for course ${courseData.courseName}`);

      // Transform sessions to the format expected by transformDataForStudent
      // Map status acronyms to IDs: P=1, A=2, L=3, E=4, -=0
      const statusToId: Record<string, number> = { 'P': 1, 'A': 2, 'L': 3, 'E': 4, '-': 0 };
      
      const sessions: AttendanceSessionData[] = courseData.sessions.map((s: {
        sessionId: string;
        sessionDate: string;
        sessionTime: string;
        attendanceName: string;
        status: string;
        statusDescription: string;
      }) => {
        // Parse date and time to get timestamp
        const dateTime = new Date(`${s.sessionDate} ${s.sessionTime}`);
        const timestamp = Math.floor(dateTime.getTime() / 1000);
        
        const statusId = statusToId[s.status] || 0;
        
        return {
          sessdate: timestamp,
          attendanceName: s.attendanceName,
          attendance_log: [{
            studentid: parseInt(session.userId),
            statusid: statusId.toString(),
          }],
          statuses: [{
            id: statusId,
            acronym: s.status,
            description: s.statusDescription,
          }],
        };
      });

      // Filter and transform data for the current student only
      const transformedData = transformDataForStudent(sessions, session, courseId);
      console.log('✅ Transformed data:', transformedData);
      setAttendanceData(transformedData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Attendance fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

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

  if (!attendanceData || !attendanceData.students || attendanceData.students.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No attendance data available</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <main className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex shrink-0 items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Attendance</h1>
                <p className="text-gray-600 mt-1">
                  {ltiSession?.courseName}
                </p>
              </div>
            </div>
            
            <a
              href="/student-all-courses"
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-sm font-medium">All Courses</span>
            </a>
          </div>

          {/* Attendance Table */}
          <AttendanceTable data={attendanceData} />

          {/* LTI Session Info */}
          {ltiSession && (
            <div className="mt-8 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Session Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Student:</span>
                  <span className="ml-2 text-gray-600">{ltiSession.userName} ({ltiSession.userId})</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Course:</span>
                  <span className="ml-2 text-gray-600">{ltiSession.courseName} ({ltiSession.courseId})</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Role:</span>
                  <span className="ml-2 text-gray-600">{ltiSession.roleName || 'Student'}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default StudentAttendancePage;