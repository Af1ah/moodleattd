import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      // Even if no token provided, we'll return success for logout
      return NextResponse.json({ message: 'Logout successful' });
    }

    const token = authorization.split(' ')[1];

    // Get base URL from environment
    const baseUrl = process.env.NEXT_PUBLIC_MOODLE_BASE_URL;
    if (!baseUrl) {
      // If no base URL, still return success for client-side logout
      return NextResponse.json({ message: 'Logout successful (client-side only)' });
    }

    try {
      // Build query parameters for Moodle Web Service to invalidate token
      const moodleParams = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_auth_invalidate_token', // This Moodle function invalidates the token
        moodlewsrestformat: 'json',
      });

      const moodleUrl = `${baseUrl}/webservice/rest/server.php?${moodleParams.toString()}`;

      // Make request to Moodle to invalidate the token
      const response = await fetch(moodleUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Note: Even if the Moodle call fails, we'll still return success
      // because the client-side logout should work regardless
      if (response.ok) {
        const data = await response.json();
        if (data.exception || data.error) {
          console.warn('Moodle token invalidation failed:', data.message || data.error);
        }
      } else {
        console.warn('Moodle token invalidation request failed:', response.status);
      }
    } catch (moodleError) {
      // Log the error but don't fail the logout
      console.warn('Error calling Moodle logout API:', moodleError);
    }

    return NextResponse.json({ 
      message: 'Logout successful',
      note: 'Token invalidated on server if possible'
    });

  } catch (error) {
    console.error('Logout API error:', error);
    // Even on error, return success for logout
    return NextResponse.json({ 
      message: 'Logout successful (client-side)',
      error: 'Server-side logout may have failed'
    });
  }
}