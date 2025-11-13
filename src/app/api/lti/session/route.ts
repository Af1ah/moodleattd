import { NextResponse } from 'next/server';
import { getLTISession } from '@/lib/session';

export async function GET() {
  try {
    console.log('🔍 LTI Session API: Getting session...');
    const session = await getLTISession();
    
    console.log('📊 Session data:', session ? 'Found' : 'Not found');
    
    if (!session) {
      console.log('❌ No LTI session found in cookies');
      return NextResponse.json(
        { error: 'No LTI session found' },
        { status: 404 }
      );
    }

    console.log('✅ Returning session data');
    return NextResponse.json({ session });
  } catch (error) {
    console.error('Failed to get LTI session:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session data', details: String(error) },
      { status: 500 }
    );
  }
}