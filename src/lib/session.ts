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
  password: process.env.SESSION_SECRET || 'change-this-to-a-32-character-secret',
  cookieName: 'lti-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'none',
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
  return sessionData;
}

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
