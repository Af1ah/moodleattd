import { LTISession } from '@/types/lti';

// Common LTI role identifiers for students
const STUDENT_ROLES = [
  'Learner',
  'Student',
  'urn:lti:role:ims/lis/Learner',
  'urn:lti:role:ims/lis/Student',
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
];

// Common LTI role identifiers for instructors
const INSTRUCTOR_ROLES = [
  'Instructor',
  'Teacher',
  'urn:lti:role:ims/lis/Instructor',
  'urn:lti:role:ims/lis/Teacher',
  'urn:lti:instrole:ims/lis/Instructor',
  'urn:lti:instrole:ims/lis/Teacher',
  'urn:lti:instrole:ims/lis/Administrator',
  'urn:lti:sysrole:ims/lis/Administrator',
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
];

/**
 * Determines if a user is a student based on their LTI roles
 */
export function isStudent(session: LTISession): boolean {
  if (!session?.roles || session.roles.length === 0) {
    console.log('🔍 Role check: No roles found');
    return false;
  }

  console.log('🔍 Role check - User roles:', session.roles);
  console.log('🔍 Role check - Checking against student roles:', STUDENT_ROLES);

  // Check if any role matches student roles
  const isStudentRole = session.roles.some(role => 
    STUDENT_ROLES.some(studentRole => 
      role.toLowerCase().includes(studentRole.toLowerCase())
    )
  );
  
  console.log('🔍 Role check - Is student:', isStudentRole);
  return isStudentRole;
}

/**
 * Determines if a user is an instructor based on their LTI roles
 */
export function isInstructor(session: LTISession): boolean {
  if (!session?.roles || session.roles.length === 0) {
    console.log('🔍 Role check: No roles found');
    return false;
  }

  console.log('🔍 Role check - User roles:', session.roles);
  console.log('🔍 Role check - Checking against instructor roles:', INSTRUCTOR_ROLES);

  // Check if any role matches instructor roles
  const isInstructorRole = session.roles.some(role => 
    INSTRUCTOR_ROLES.some(instructorRole => 
      role.toLowerCase().includes(instructorRole.toLowerCase())
    )
  );
  
  console.log('🔍 Role check - Is instructor:', isInstructorRole);
  return isInstructorRole;
}

/**
 * Gets the primary role of the user for display purposes
 */
export function getPrimaryRole(session: LTISession): 'student' | 'instructor' | 'unknown' {
  if (isInstructor(session)) {
    return 'instructor';
  }
  if (isStudent(session)) {
    return 'student';
  }
  return 'unknown';
}
