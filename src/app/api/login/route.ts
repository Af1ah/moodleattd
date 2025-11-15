import { NextRequest, NextResponse } from 'next/server';
import { getUserRole } from '@/services/roleService';

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

    // Fetch user information from Moodle to get user ID
    let userId: number | null = null;
    let userRole: { roleId: number; roleName: string; roleShortname: string; roleArchetype: string } | null = null;
    
    try {
      const siteInfoUrl = `${baseUrl}/webservice/rest/server.php?wstoken=${data.token}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`;
      const siteInfoResponse = await fetch(siteInfoUrl);
      const siteInfo = await siteInfoResponse.json();
      
      if (siteInfo.userid) {
        userId = siteInfo.userid;
        console.log('User ID:', userId);
        
        // Fetch user role from database (only if userId is valid)
        if (userId) {
          userRole = await getUserRole(userId);
          console.log('User role:', userRole);
        }
      }
    } catch (error) {
      console.error('Error fetching user info or role:', error);
      // Continue without role information
    }

    // Return the token and role information to the frontend
    console.log('Login successful, returning token and role info');
    return NextResponse.json({
      token: data.token,
      message: 'Login successful',
      userId: userId,
      role: userRole ? {
        roleId: userRole.roleId,
        roleName: userRole.roleName,
        roleShortname: userRole.roleShortname,
      } : null,
    });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    );
  }
}