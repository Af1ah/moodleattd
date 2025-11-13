import { SessionOptions, getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { LTISession } from '@/types/lti';

export interface LTISessionData {
  userId: string;
  userName: string;
  userEmail?: string;
  courseId: string;
  courseName: string;
  roles: string[];
  launchId: string;
  moodleToken: string;
  createdAt: number;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_development_only',
  cookieName: 'moodle_lti_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Use lax for development
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  },
};

declare module 'iron-session' {
  interface IronSessionData {
    ltiSession?: LTISessionData;
  }
}

export async function createLTISession(sessionData: LTISession): Promise<void> {
  try {
    console.log('💾 Creating LTI session...');
    const cookieStore = await cookies();
    console.log('🍪 Cookie store obtained for session creation');
    
    const session = await getIronSession<{ ltiSession?: LTISessionData }>(cookieStore, sessionOptions);
    console.log('🔐 Iron session obtained for creation');
    
    // Convert LTISession to LTISessionData
    const ltiSessionData: LTISessionData = {
      userId: sessionData.userId,
      userName: sessionData.userName,
      userEmail: sessionData.userEmail,
      courseId: sessionData.courseId,
      courseName: sessionData.courseName,
      roles: sessionData.roles,
      launchId: sessionData.launchId,
      moodleToken: sessionData.moodleToken,
      createdAt: sessionData.createdAt,
    };
    
    console.log('📝 Session data prepared:', { 
      userId: ltiSessionData.userId, 
      courseId: ltiSessionData.courseId 
    });
    
    session.ltiSession = ltiSessionData;
    await session.save();
    
    console.log('✅ Session saved successfully');
  } catch (error) {
    console.error('❌ Error creating LTI session:', error);
    throw error;
  }
}

export async function getLTISession(): Promise<LTISessionData | null> {
  try {
    console.log('🍪 Getting LTI session from cookies...');
    const cookieStore = await cookies();
    console.log('🍪 Cookie store obtained');
    
    const session = await getIronSession<{ ltiSession?: LTISessionData }>(cookieStore, sessionOptions);
    console.log('🔐 Iron session obtained');
    console.log('📊 Session data exists:', !!session.ltiSession);
    
    if (session.ltiSession) {
      console.log('✅ LTI session found, courseId:', session.ltiSession.courseId);
    }
    
    return session.ltiSession || null;
  } catch (error) {
    console.error('❌ Error getting LTI session:', error);
    return null;
  }
}

export async function clearLTISession(): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<{ ltiSession?: LTISessionData }>(cookieStore, sessionOptions);
  session.ltiSession = undefined;
  await session.save();
}
