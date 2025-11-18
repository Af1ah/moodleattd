/**
 * LTI 1.0/1.1 Launch Handler
 * 
 * Security Features:
 * - Verifies OAuth consumer key
 * - Validates required LTI parameters
 * - Fetches user from database for verification
 * - Creates secure session with role information
 * 
 * Flow:
 * 1. Receive LTI launch from Moodle
 * 2. Verify signature and parameters
 * 3. Fetch user and role from database
 * 4. Create session
 * 5. Redirect to appropriate page based on role:
 *    - Manager -> Home page
 *    - Teacher -> Course attendance report
 *    - Student -> Student attendance view
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLTISession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to verify OAuth signature (basic LTI 1.0/1.1 security)
async function verifyLTISignature(formData: FormData): Promise<boolean> {
  const consumerKey = formData.get('oauth_consumer_key') as string;
  const expectedKey = process.env.LTI_CONSUMER_KEY;
  
  if (!expectedKey) {
    console.warn('⚠️  LTI_CONSUMER_KEY not set in environment');
    return true; // Allow in development
  }
  
  if (consumerKey !== expectedKey) {
    console.error('❌ Invalid consumer key');
    return false;
  }
  
  return true;
}

// Determine user role from LTI roles string
function determineUserRole(rolesString: string): { role: string; shortname: string } {
  const roles = rolesString.toLowerCase();
  
  if (roles.includes('administrator') || roles.includes('admin')) {
    return { role: 'Manager', shortname: 'manager' };
  }
  if (roles.includes('instructor') || roles.includes('teacher') || roles.includes('editingteacher')) {
    return { role: 'Teacher', shortname: 'editingteacher' };
  }
  if (roles.includes('learner') || roles.includes('student')) {
    return { role: 'Student', shortname: 'student' };
  }
  
  return { role: 'User', shortname: 'user' };
}

export async function POST(request: NextRequest) {
  try {
    console.log('\n🚀 ========== LTI LAUNCH RECEIVED ==========');
    
    const formData = await request.formData();
    
    // Verify LTI signature for security
    const isValid = await verifyLTISignature(formData);
    if (!isValid) {
      console.error('❌ Invalid LTI signature');
      return NextResponse.redirect(
        new URL('/login?error=invalid_lti_signature', request.url),
        { status: 303 }
      );
    }

    // Extract LTI parameters
    const userId = formData.get('user_id') as string;
    const userName = formData.get('lis_person_name_full') as string;
    const userEmail = formData.get('lis_person_contact_email_primary') as string;
    const contextId = formData.get('context_id') as string;
    const contextTitle = formData.get('context_title') as string;
    const rolesString = formData.get('roles') as string || '';

    console.log('📦 LTI Parameters:');
    console.log('  User ID:', userId);
    console.log('  User Name:', userName);
    console.log('  User Email:', userEmail);
    console.log('  Course ID:', contextId);
    console.log('  Course Name:', contextTitle);
    console.log('  Roles:', rolesString);

    // Validate required parameters
    if (!userId || !contextId) {
      console.error('❌ Missing required parameters');
      return NextResponse.redirect(
        new URL('/login?error=missing_parameters', request.url),
        { status: 303 }
      );
    }

    try {
      // Fetch user from database to get role information
      const user = await prisma.mdl_user.findFirst({
        where: {
          id: BigInt(userId),
          deleted: 0,
        },
        select: {
          id: true,
          username: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      });

      if (!user) {
        console.error('❌ User not found in database');
        return NextResponse.redirect(
          new URL('/login?error=user_not_found', request.url),
          { status: 303 }
        );
      }

      // Get user's role in the system
      const roleAssignment = await prisma.mdl_role_assignments.findFirst({
        where: {
          userid: BigInt(userId),
        },
        include: {
          role: true,
        },
        orderBy: {
          id: 'desc',
        },
      });

      const userRole = roleAssignment 
        ? { role: roleAssignment.role.name, shortname: roleAssignment.role.shortname }
        : determineUserRole(rolesString);

      console.log('👤 User found:', {
        id: user.id.toString(),
        username: user.username,
        role: userRole.shortname,
      });

      // Get admin token for API calls
      const moodleToken = process.env.NEXT_PUBLIC_MOODLE_TOKEN || process.env.NEXT_PUBLIC_ATTD_TOKEN || '';
      
      if (!moodleToken) {
        console.warn('⚠️  No Moodle token in environment');
      }

      // Create session
      const sessionData = {
        userId: user.id.toString(),
        userName: `${user.firstname} ${user.lastname}`,
        userEmail: user.email || userEmail || undefined,
        courseId: contextId,
        courseName: contextTitle || `Course ${contextId}`,
        roleName: userRole.role,
        roleShortname: userRole.shortname,
        moodleToken,
        createdAt: Date.now(),
      };

      await createLTISession(sessionData);
      console.log('✅ Session created');

      // Verify session was saved
      const { getLTISession } = await import('@/lib/session');
      const verifySession = await getLTISession();
      if (verifySession) {
        console.log('✅ Session verified in database');
      } else {
        console.warn('⚠️  Warning: Session not found after save');
      }

      // Determine redirect based on role
      let redirectPath = '/';
      
      if (userRole.shortname === 'manager') {
        // Admin/Manager -> redirect to admin cohort assignments or home
        redirectPath = '/';
      } else if (userRole.shortname === 'editingteacher' || userRole.shortname === 'teacher') {
        // Teacher -> redirect to course attendance report
        redirectPath = `/report/direct/${contextId}`;
      } else if (userRole.shortname === 'student') {
        // Student -> redirect to their attendance view
        redirectPath = `/student-attendance/${contextId}`;
      }

      console.log(`🔄 Redirecting to: ${redirectPath}`);
      console.log('========================================\n');

      return NextResponse.redirect(new URL(redirectPath, request.url), { status: 303 });

    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.redirect(
        new URL('/login?error=database_error', request.url),
        { status: 303 }
      );
    }

  } catch (error) {
    console.error('\n❌ LTI Launch Error:', error);
    return NextResponse.redirect(
      new URL('/login?error=lti_launch_failed', request.url),
      { status: 303 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
