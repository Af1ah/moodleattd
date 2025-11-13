import { NextRequest, NextResponse } from 'next/server';
import { createLTISession } from '@/lib/session';
import { LTISession } from '@/types/lti';

export async function POST(request: NextRequest) {
  try {
    console.log('\n🚀 ========== LTI LAUNCH RECEIVED ==========');
    
    const formData = await request.formData();
    
    // Extract all LTI parameters
    const ltiParams: Record<string, string> = {};
    formData.forEach((value, key) => {
      ltiParams[key] = value.toString();
    });
    
    console.log('📦 All LTI Parameters received:');
    console.log(JSON.stringify(ltiParams, null, 2));
    
    // Extract key parameters
    const userId = formData.get('user_id') as string;
    const userName = formData.get('lis_person_name_full') as string;
    const userEmail = formData.get('lis_person_contact_email_primary') as string;
    const contextId = formData.get('context_id') as string;
    const contextTitle = formData.get('context_title') as string;
    const rolesString = formData.get('roles') as string;
    const resourceLinkId = formData.get('resource_link_id') as string;

    console.log('\n✨ Extracted Key Data:');
    console.log('  User ID:', userId);
    console.log('  User Name:', userName);
    console.log('  User Email:', userEmail);
    console.log('  Course ID:', contextId);
    console.log('  Course Name:', contextTitle);
    console.log('  Roles:', rolesString);
    console.log('  Resource Link ID:', resourceLinkId);

    // Validate required parameters
    if (!userId || !contextId) {
      console.error('❌ Missing required parameters!');
      return NextResponse.json(
        { error: 'Missing required LTI parameters (user_id or context_id)' },
        { status: 400 }
      );
    }

    // Get admin token from environment (for admin operations)
    const adminToken = process.env.NEXT_PUBLIC_MOODLE_TOKEN || process.env.NEXT_PUBLIC_ATTD_TOKEN || '';
    
    if (!adminToken) {
      console.error('⚠️  Warning: No admin Moodle token found in environment variables!');
    } else {
      console.log('🔑 Admin token loaded:', adminToken.substring(0, 8) + '...');
    }

    // Use admin token (we'll implement user token fetching later)
    const moodleToken = adminToken;
    console.log('🎯 Using admin token');

    // Create session data
    const now = Date.now();
    const sessionData: LTISession = {
      userId,
      userName: userName || `User ${userId}`,
      userEmail: userEmail || undefined,
      courseId: contextId,
      courseName: contextTitle || `Course ${contextId}`,
      roles: rolesString ? rolesString.split(',') : [],
      launchId: resourceLinkId || `launch-${now}`,
      moodleToken,
      createdAt: now,
    };

    console.log('\n💾 Session Data to Store:');
    console.log(JSON.stringify(sessionData, null, 2));

    // Save session
    await createLTISession(sessionData);

    console.log('\n✅ Session created successfully!');
    console.log('🔄 Redirecting to /lti/auth');
    console.log('========================================\n');

    // Redirect to auth check page
    const redirectUrl = new URL('/lti/auth', request.url);
    return NextResponse.redirect(redirectUrl.toString(), { status: 303 });

  } catch (error) {
    console.error('\n❌ LTI Launch Error:', error);
    return NextResponse.json(
      { error: 'LTI launch failed', details: String(error) },
      { status: 500 }
    );
  }
}
