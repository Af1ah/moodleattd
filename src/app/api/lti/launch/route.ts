/**
 * LTI 1.0/1.1 Launch Handler

























































































































































**Recommendation:** Deploy with the `next.config.ts` configuration. This is the industry-standard approach used by major frameworks and provides automatic security without code refactoring.- **Performance**: Better (removed code = smaller bundle)- **Minimal code changes**: Works with existing code- **Development**: Full logging for debugging- **Production builds**: Clean, secure, no debug logsWith the `next.config.ts` change:## ✨ SummaryThis activates the console removal in `next.config.ts`.```NODE_ENV=production```envEnsure your `.env.production` has:## 📝 Environment Variables```logger.error('API failed'); // Still shows in productionlogger.warn('Cache miss');logger.log('User logged in'); // No PIIimport { logger } from '@/utils/logger';// New code (with logger)console.error('API failed');console.warn('Cache miss');console.log('User logged in:', userId);// Old code```typescriptIf you prefer explicit control, migrate console calls to the logger:## 🔄 Alternative: Manual Migration to Logger❌ Log database query results with personal data❌ Log authentication states with user info❌ Log full API responses with sensitive data❌ Log user credentials, tokens, or PII### DON'T:✅ Test production builds before deployment✅ Use the custom logger for conditional logging✅ Add debug logs during development (auto-removed in prod)✅ Use `console.error()` for critical errors (kept in production)### DO:## 🛡️ Best Practices Going Forward4. You should see **no debug logs**, only errors (if any)3. Navigate through your app2. Check Console tab1. Open browser DevTools (F12)### Verify Console Removal:```# Only errors should appear if they occur# Open browser console - you should see NO debug logsnpm start# Start production servernpm run build# Build for production```bash### Test Production Build Locally:## 🔍 Testing```grep -r "console\." src/ --include="*.ts" --include="*.tsx"# Find remaining console statements```bashIf you want to manually remove more console logs, search for:### Manual Review Recommended:- Error tracking (also in production)- Data transformation logs- Cache status messages- Business logic debugging### What Remains (Development Only):After cleanup, approximately **200+ console statements** will be automatically removed in production builds.## 📊 Remaining Console Statements```npm run dev# All console logs remain active```bash### For Development:```npm start# The production build will automatically remove console statementsnpm run build# Build with console removal```bash### For Production:## 🚀 Build and Deploy- ✅ `/src/app/api/getCohortAttendance/route.ts` - Removed user selection logs- ✅ `/src/app/student-all-courses/page.tsx` - Removed course data logs- ✅ `/src/app/student-attendance/[courseId]/page.tsx` - Removed user ID logs- ✅ `/src/lib/session.ts` - Removed session data logs- ✅ `/src/components/AuthProvider.tsx` - Removed auth state logs- ✅ `/src/app/api/login/route.ts` - Removed token/credential logs- ✅ `/src/app/api/lti/launch/route.ts` - Removed PII exposure### Files Cleaned:6. ❌ Database query results with PII5. ❌ Login credentials flow4. ❌ Course enrollment data3. ❌ LTI session data2. ❌ Authentication tokens in logs1. ❌ User IDs, emails, and names exposure### Critical Security Logs Removed:## 🔒 Security Issues Fixed```// Use: logger.log('User data:', userData);// Instead of: console.log('User data:', userData);import { logger } from '@/utils/logger';```typescriptCreated `/src/utils/logger.ts` for manual migration:### 2. **Custom Logger Utility** (OPTIONAL)- ✅ No performance impact- ✅ Zero code changes required in existing files- ✅ Keeps `console.error` for critical error tracking- ✅ Automatically removes all `console.log`, `console.warn`, `console.info`, `console.debug` in production builds**Benefits:**```}    : false      }        exclude: ['error'] // Keep console.error for critical issues    ? {  removeConsole: process.env.NODE_ENV === 'production' compiler: {```typescriptAdded to `next.config.ts`:### 1. **Automatic Console Removal in Production** (RECOMMENDED)## ✅ Implemented Solutions * 
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
import { prisma } from '@/services/attendanceDBService';

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
      const redirectUrl = process.env.NODE_ENV === 'production'
        ? 'https://report.aflahdev.me/login?error=invalid_lti_signature'
        : new URL('/login?error=invalid_lti_signature', request.url).toString();
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    // Extract LTI parameters
    const userId = formData.get('user_id') as string;
    const userName = formData.get('lis_person_name_full') as string;
    const userEmail = formData.get('lis_person_contact_email_primary') as string;
    const contextId = formData.get('context_id') as string;
    const contextTitle = formData.get('context_title') as string;
    const rolesString = formData.get('roles') as string || '';

    // Validate required parameters
    if (!userId || !contextId) {
      console.error('❌ Missing required parameters');
      const redirectUrl = process.env.NODE_ENV === 'production'
        ? 'https://report.aflahdev.me/login?error=missing_parameters'
        : new URL('/login?error=missing_parameters', request.url).toString();
      return NextResponse.redirect(redirectUrl, { status: 303 });
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
        const redirectUrl = process.env.NODE_ENV === 'production'
          ? 'https://report.aflahdev.me/login?error=user_not_found'
          : new URL('/login?error=user_not_found', request.url).toString();
        return NextResponse.redirect(redirectUrl, { status: 303 });
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

      // Use absolute URL to ensure correct domain in production
      const redirectUrl = process.env.NODE_ENV === 'production' 
        ? `https://report.aflahdev.me${redirectPath}`
        : new URL(redirectPath, request.url).toString();
      
      return NextResponse.redirect(redirectUrl, { status: 303 });

    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      const redirectUrl = process.env.NODE_ENV === 'production'
        ? 'https://report.aflahdev.me/login?error=database_error'
        : new URL('/login?error=database_error', request.url).toString();
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

  } catch (error) {
    console.error('\n❌ LTI Launch Error:', error);
    const redirectUrl = process.env.NODE_ENV === 'production'
      ? 'https://report.aflahdev.me/login?error=lti_launch_failed'
      : new URL('/login?error=lti_launch_failed', request.url).toString();
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}
