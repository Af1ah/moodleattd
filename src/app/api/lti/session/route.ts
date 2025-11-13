import { NextResponse } from 'next/server';
import { getLTISession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getLTISession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'No LTI session found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Failed to get LTI session:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session data' },
      { status: 500 }
    );
  }
}