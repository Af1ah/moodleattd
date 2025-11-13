export interface LTISession {
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