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
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
  cookieName: 'moodle_lti_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'none', // Required for LTI cross-domain
    maxAge: 60 * 60 * 24, // 24 hours
  },
};

declare module 'iron-session' {
  interface IronSessionData {
    ltiSession?: LTISessionData;
  }
}

export async function createLTISession(sessionData: LTISession): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<{ ltiSession?: LTISessionData }>(cookieStore, sessionOptions);
  
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
  
  session.ltiSession = ltiSessionData;
  await session.save();
}

export async function getLTISession(): Promise<LTISessionData | null> {
  const cookieStore = await cookies();
  const session = await getIronSession<{ ltiSession?: LTISessionData }>(cookieStore, sessionOptions);
  return session.ltiSession || null;
}

export async function clearLTISession(): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<{ ltiSession?: LTISessionData }>(cookieStore, sessionOptions);
  session.ltiSession = undefined;
  await session.save();
}
