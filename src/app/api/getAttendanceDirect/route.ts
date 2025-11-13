import { NextRequest, NextResponse } from 'next/server';

/**
 * Direct Attendance API Route
 * 
 * This route demonstrates how to get attendance data directly from Moodle's gradebook
 * without creating custom reports. Based on analysis of MoodleFlaskAPI repository.
 * 
 * Usage: POST /api/getAttendanceDirect
 * Body: { courseId: number, wstoken: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, userToken, filterStudentId } = body;

    // Get attendance token from environment (server-side only)
    const wstoken = process.env.NEXT_PUBLIC_ATTD_TOKEN;
    
    if (!wstoken) {
      return NextResponse.json(
        { error: 'Attendance token not configured on server' },
        { status: 500 }
      );
    }

    if (!courseId) {
      return NextResponse.json(
        { error: 'Missing courseId' },
        { status: 400 }
      );
    }

    console.log(`🎯 Getting attendance sessions from course ${courseId}...`);
    if (filterStudentId) {
      console.log(`🔍 Filtering for student ID: ${filterStudentId}`);
    }

    // First, get course modules to find attendance activity
    const baseUrl = process.env.NEXT_PUBLIC_MOODLE_BASE_URL;
    if (!baseUrl) {
      throw new Error('Moodle base URL not configured');
    }

    // Use user token to get course contents (has permission for this)
    const tokenForContents = userToken || wstoken;
    const contentsUrl = `${baseUrl}/webservice/rest/server.php`;
    const contentsParams = new URLSearchParams({
      wstoken: tokenForContents,
      wsfunction: 'core_course_get_contents',
      moodlewsrestformat: 'json',
      courseid: courseId.toString(),
    });

    const contentsResponse = await fetch(`${contentsUrl}?${contentsParams.toString()}`);
    const contents = await contentsResponse.json();

    if (contents.exception) {
      throw new Error(contents.message || 'Failed to get course contents');
    }

    // Find all attendance activity IDs and names
    const attendanceActivities: { id: number; name: string }[] = [];
    for (const section of contents) {
      if (section.modules) {
        for (const mod of section.modules) {
          if (mod.modname === 'attendance') {
            attendanceActivities.push({
              id: mod.instance,
              name: mod.name || `Attendance ${mod.instance}`
            });
          }
        }
      }
    }

    if (attendanceActivities.length === 0) {
      throw new Error('No attendance activity found in this course');
    }

    console.log(`📊 Found ${attendanceActivities.length} attendance activity/activities:`, 
      attendanceActivities.map(a => `${a.name} (ID: ${a.id})`).join(', '));

    // Get attendance sessions from all attendance activities
    const allSessions = [];
    for (const activity of attendanceActivities) {
      const sessionsParams = new URLSearchParams({
        wstoken: wstoken,
        wsfunction: 'mod_attendance_get_sessions',
        moodlewsrestformat: 'json',
        attendanceid: activity.id.toString(),
      });

      const sessionsResponse = await fetch(`${contentsUrl}?${sessionsParams.toString()}`);
      const sessionsData = await sessionsResponse.json();

      if (sessionsData.exception) {
        console.warn(`⚠️ Failed to get sessions for attendance ${activity.name}: ${sessionsData.message}`);
        continue;
      }

      if (Array.isArray(sessionsData) && sessionsData.length > 0) {
        console.log(`✅ Retrieved ${sessionsData.length} sessions from attendance "${activity.name}"`);
        // Add attendance activity name to each session
        const sessionsWithName = sessionsData.map(session => ({
          ...session,
          attendanceName: activity.name
        }));
        allSessions.push(...sessionsWithName);
      }
    }

    console.log(`✅ Total sessions retrieved: ${allSessions.length}`);

    // Filter sessions for specific student if requested
    let filteredSessions = allSessions;
    if (filterStudentId) {
      console.log(`🔍 Filtering sessions for student ID: ${filterStudentId}`);
      filteredSessions = allSessions.map(session => {
        // Only keep the specific student's data in users and attendance_log
        const filteredUsers = session.users?.filter((user: { id: number }) => user.id.toString() === filterStudentId.toString()) || [];
        const filteredAttendanceLog = session.attendance_log?.filter((log: { studentid: number }) => log.studentid.toString() === filterStudentId.toString()) || [];
        
        return {
          ...session,
          users: filteredUsers,
          attendance_log: filteredAttendanceLog
        };
      });
      console.log(`✅ Filtered to ${filteredSessions.length} sessions for student`);
    }

    // Return the raw sessions data
    // The frontend will transform it as needed

    return NextResponse.json({
      success: true,
      courseId,
      attendanceActivities: attendanceActivities,
      totalAttendanceActivities: attendanceActivities.length,
      totalSessions: filteredSessions.length,
      sessions: filteredSessions,
      note: filterStudentId ? `Attendance sessions filtered for student ID ${filterStudentId}` : 'Attendance sessions from all mod_attendance activities in course'
    });

  } catch (error) {
    console.error('Direct attendance API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch attendance data',
        details: error instanceof Error ? error.message : 'Unknown error',
        note: 'Make sure the course has attendance activities and you have proper permissions'
      },
      { status: 500 }
    );
  }
}