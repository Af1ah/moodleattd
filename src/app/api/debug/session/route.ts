import { NextResponse } from 'next/server';
import { getLTISession } from '@/lib/session';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    console.log('🐛 Debug endpoint called');
    
    // Get raw cookies
    const cookieStore = await cookies();
    const cookieNames: string[] = [];
    cookieStore.getAll().forEach(cookie => {
      cookieNames.push(cookie.name);
    });
    
    const cookieInfo = {
      count: cookieStore.getAll().length,
      names: cookieNames,
      ltiCookie: cookieStore.get('moodle_lti_session')?.value ? 'Present' : 'Missing'
    };
    
    console.log('🍪 Cookie info:', cookieInfo);
    
    // Try to get session
    const session = await getLTISession();
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      cookieInfo: cookieInfo,
      hasSession: !!session,
      sessionData: session,
    };
    
    console.log('🐛 Debug info:', debugInfo);
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('🐛 Debug endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed', 
        details: String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}