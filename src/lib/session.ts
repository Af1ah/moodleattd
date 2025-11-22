import { SessionOptions, getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { LTISession } from '@/types/lti';

export interface LTISessionData {
  userId: string;
  userName: string;
  userEmail?: string;
  courseId: string;
  courseName?: string;
  roleName?: string;
  roleShortname?: string;
  moodleToken?: string;
  createdAt: number;
  ltiSession?: LTISession;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'change-this-to-a-32-character-secret-key-here-minimum-32-chars',
  cookieName: 'lti-session',
  cookieOptions: {
    // For LTI to work across domains, we need secure cookies
    // In production (HTTPS) use secure:true, in development (HTTP) use false
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<{ ltiSession?: LTISessionData }>(cookieStore, sessionOptions);
}

export async function createSession(sessionData: LTISessionData) {
  const session = await getSession();
  session.ltiSession = sessionData;
  await session.save();
  console.log('✅ Session saved successfully:', {
    userId: sessionData.userId,
    userName: sessionData.userName,
    role: sessionData.roleShortname,
  });
  return sessionData;
}

// Alias for LTI-specific usage
export const createLTISession = createSession;

export async function deleteSession() {
  const session = await getSession();
  session.destroy();
}

export async function getCurrentUser(): Promise<LTISessionData | null> {
  try {
    const session = await getSession();
    return session.ltiSession || null;
  } catch (error) {
    console.error('Error getting current user from session:', error);
    return null;
  }
}

// Alias for getting LTI session
export const getLTISession = getCurrentUser;
