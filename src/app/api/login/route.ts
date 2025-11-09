import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Login API called');
    const { username, password } = await request.json();
    console.log('Received username:', username);

    // Validate input
    if (!username || !password) {
      console.log('Missing username or password');
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get Moodle base URL from environment
    const baseUrl = process.env.NEXT_PUBLIC_MOODLE_BASE_URL;
    console.log('Base URL:', baseUrl);
    if (!baseUrl) {
      console.log('No base URL configured');
      return NextResponse.json(
        { error: 'Moodle configuration error' },
        { status: 500 }
      );
    }

    // Prepare form data for Moodle token request
    const formData = new URLSearchParams({
      username: username,
      password: password,
      service: 'moodle_mobile_app'
    });

    // Make request to Moodle token endpoint
    const tokenUrl = `${baseUrl}/login/token.php`;
    console.log('Making request to:', tokenUrl);
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);

    // Check if Moodle returned an error
    if (data.error) {
      console.log('Moodle error:', data.error);
      return NextResponse.json(
        { error: data.error },
        { status: 401 }
      );
    }

    // Check if we got a token
    if (!data.token) {
      console.log('No token in response');
      return NextResponse.json(
        { error: 'Invalid credentials or unable to generate token' },
        { status: 401 }
      );
    }

    // Return the token to the frontend
    console.log('Login successful, returning token');
    return NextResponse.json({
      token: data.token,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    );
  }
}