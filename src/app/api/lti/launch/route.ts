import { NextRequest, NextResponse } from 'next/server';
import { createLTISession } from '@/lib/session';

import { useEffect, useState } from 'react';import { LTISession } from '@/types/lti';

import { useRouter } from 'next/navigation';

export async function POST(request: NextRequest) {

export default function LTIAuthPage() {  try {

  const router = useRouter();    console.log('\n🚀 ========== LTI LAUNCH RECEIVED ==========');

  const [isChecking, setIsChecking] = useState(true);    

  const [error, setError] = useState<string | null>(null);    const formData = await request.formData();

    

  useEffect(() => {    // Extract all LTI parameters

    const checkAuthAndRedirect = async () => {    const ltiParams: Record<string, string> = {};

      try {    formData.forEach((value, key) => {

        // First, check if we have an LTI session      ltiParams[key] = value.toString();

        const sessionResponse = await fetch('/api/lti/session');    });

        if (!sessionResponse.ok) {    

          throw new Error('No LTI session found');    console.log('📦 All LTI Parameters received:');

        }    console.log(JSON.stringify(ltiParams, null, 2));

            

        const { session } = await sessionResponse.json();    // Extract key parameters

        const courseId = session.courseId;    const userId = formData.get('user_id') as string;

            const userName = formData.get('lis_person_name_full') as string;

        // Check if user has login token in localStorage    const userEmail = formData.get('lis_person_contact_email_primary') as string;

        const moodleToken = localStorage.getItem('moodleToken');    const contextId = formData.get('context_id') as string;

            const contextTitle = formData.get('context_title') as string;

        if (moodleToken) {    const rolesString = formData.get('roles') as string;

          // User is already authenticated, redirect to their course report    const resourceLinkId = formData.get('resource_link_id') as string;

          console.log('✅ User is authenticated, redirecting to course report');

          router.push(`/report/direct/${courseId}`);    console.log('\n✨ Extracted Key Data:');

        } else {    console.log('  User ID:', userId);

          // User needs to login first, redirect to login with return URL    console.log('  User Name:', userName);

          console.log('❌ User not authenticated, redirecting to login');    console.log('  User Email:', userEmail);

          // Store the intended destination for after login    console.log('  Course ID:', contextId);

          localStorage.setItem('ltiReturnUrl', `/report/direct/${courseId}`);    console.log('  Course Name:', contextTitle);

          localStorage.setItem('isLtiUser', 'true');    console.log('  Roles:', rolesString);

          router.push('/login');    console.log('  Resource Link ID:', resourceLinkId);

        }

      } catch (err) {    // Validate required parameters

        console.error('LTI auth check failed:', err);    if (!userId || !contextId) {

        setError('Failed to process LTI authentication. Please try again.');      console.error('❌ Missing required parameters!');

        setIsChecking(false);      return NextResponse.json(

      }        { error: 'Missing required LTI parameters (user_id or context_id)' },

    };        { status: 400 }

      );

    checkAuthAndRedirect();    }

  }, [router]);

    // Get admin token from environment (for admin operations)

  if (error) {    const adminToken = process.env.NEXT_PUBLIC_MOODLE_TOKEN || process.env.NEXT_PUBLIC_ATTD_TOKEN || '';

    return (    

      <div className="min-h-screen bg-linear-to-br from-red-50 via-white to-red-50 flex items-center justify-center">    if (!adminToken) {

        <div className="max-w-md mx-auto text-center">      console.error('⚠️  Warning: No admin Moodle token found in environment variables!');

          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">    } else {

            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">      console.log('🔑 Admin token loaded:', adminToken.substring(0, 8) + '...');

              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />    }

            </svg>

          </div>    // Fetch user-specific token from Moodle

          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>    console.log('\n🔐 Fetching user token from Moodle...');

          <p className="text-gray-600 mb-4">{error}</p>    let userToken = '';

          <button    

            onClick={() => {    try {

              // Try to go back to Moodle      const moodleBaseUrl = process.env.NEXT_PUBLIC_MOODLE_BASE_URL || 'http://localhost';

              if (window.opener) {      const serviceName = process.env.MOODLE_SERVICE_NAME || 'moodle_mobile_app';

                window.close();      

              } else {      // Extract username from LTI parameters (could be in different fields)

                window.location.href = '/';      const username = formData.get('ext_user_username') as string || 

              }                       formData.get('custom_username') as string ||

            }}                       formData.get('lis_person_sourcedid') as string;

            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"      

          >      // Check if we have a password in custom parameters (configured in Moodle LTI)

            Go Back      const password = formData.get('custom_user_password') as string || 

          </button>                       formData.get('ext_user_password') as string;

        </div>      

      </div>      console.log('  Username:', username);

    );      console.log('  Password:', password ? '***provided***' : 'NOT PROVIDED');

  }      console.log('  Service:', serviceName);

      

  return (      if (username && password) {

    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">        // Fetch user token from Moodle

      <div className="text-center">        const tokenUrl = `${moodleBaseUrl}/login/token.php`;

        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>        const params = new URLSearchParams({

        <p className="mt-4 text-gray-600 font-medium">Checking authentication...</p>          username: username,

      </div>          password: password,

    </div>          service: serviceName

  );        });

}        
        console.log(`  Requesting: ${tokenUrl}?username=${username}&service=${serviceName}`);
        
        const tokenResponse = await fetch(`${tokenUrl}?${params}`);
        const tokenData = await tokenResponse.json();
        
        if (tokenData.token) {
          userToken = tokenData.token;
          console.log('  ✅ User token received:', userToken.substring(0, 8) + '...');
        } else if (tokenData.error) {
          console.error('  ❌ Token error:', tokenData.error);
          console.error('  Error details:', tokenData);
        }
      } else {
        console.log('  ⚠️  Username or password not provided in LTI launch');
        console.log('  💡 Configure custom parameters in Moodle LTI settings:');
        console.log('     custom_username=$User.username');
        console.log('     custom_user_password=<user_password> (if available)');
      }
    } catch (error) {
      console.error('  ❌ Error fetching user token:', error);
    }
    
    // Use user token if available, otherwise fall back to admin token
    const moodleToken = userToken || adminToken;
    console.log('  🎯 Using token:', userToken ? 'USER TOKEN' : 'ADMIN TOKEN (fallback)');

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

    // Redirect to auth check page instead of direct test page
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
