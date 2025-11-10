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
    const { courseId, userToken } = body;

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

    // Find attendance activity ID
    let attendanceId = null;
    for (const section of contents) {
      if (section.modules) {
        for (const mod of section.modules) {
          if (mod.modname === 'attendance') {
            attendanceId = mod.instance;
            break;
          }
        }
      }
      if (attendanceId) break;
    }

    if (!attendanceId) {
      throw new Error('No attendance activity found in this course');
    }

    console.log(`📊 Found attendance activity ID: ${attendanceId}`);

    // Now get attendance sessions
    const sessionsParams = new URLSearchParams({
      wstoken: wstoken,
      wsfunction: 'mod_attendance_get_sessions',
      moodlewsrestformat: 'json',
      attendanceid: attendanceId.toString(),
    });

    const sessionsResponse = await fetch(`${contentsUrl}?${sessionsParams.toString()}`);
    const sessionsData = await sessionsResponse.json();

    if (sessionsData.exception) {
      throw new Error(sessionsData.message || 'Failed to get attendance sessions');
    }

    console.log(`✅ Retrieved ${sessionsData.length || 0} attendance sessions`);

    // Return the raw sessions data
    // The frontend will transform it as needed

    return NextResponse.json({
      success: true,
      courseId,
      attendanceId,
      totalSessions: sessionsData.length || 0,
      sessions: sessionsData,
      note: 'Attendance sessions from mod_attendance'
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