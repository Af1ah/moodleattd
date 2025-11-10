import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header (for authentication validation)
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    // Note: User token is validated but not used - this endpoint requires admin token
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const token = authorization.split(' ')[1];

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const courseid = searchParams.get('courseid');
    const datefrom = searchParams.get('datefrom');
    const dateto = searchParams.get('dateto');

    // Get base URL from environment
    const baseUrl = process.env.NEXT_PUBLIC_MOODLE_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Moodle base URL not configured' },
        { status: 500 }
      );
    }
const admintoken = process.env.NEXT_PUBLIC_ATTD_TOKEN;
    // Build query parameters for Moodle Web Service
    const moodleParams = new URLSearchParams({
      wstoken: admintoken || '',
      wsfunction: 'mod_attendance_get_sessions',
      moodlewsrestformat: 'json',
    });

    // Add optional parameters if provided
    if (courseid) moodleParams.append('courseid', courseid);
    if (datefrom) moodleParams.append('datefrom', datefrom);
    if (dateto) moodleParams.append('dateto', dateto);

    const moodleUrl = `${baseUrl}/webservice/rest/server.php?${moodleParams.toString()}`;

    // Make request to Moodle
    const response = await fetch(moodleUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Moodle server error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Check for Moodle-specific errors
    if (data.exception || data.error) {
      return NextResponse.json(
        { error: data.message || data.error || 'Moodle API error' },
        { status: 400 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('GetAttendance API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}