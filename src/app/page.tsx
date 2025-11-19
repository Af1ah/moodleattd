'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/components/AuthProvider';
import Navigation from '@/components/Navigation';
import { 
  ClipboardList, 
  Users, 
  BookOpen, 
  Hash, 
  /* Info removed - now using inline small text */
  ChevronRight,
  AlertCircle
  , RefreshCw
} from 'lucide-react';

interface Course {
  id: number;
  fullname: string;
  shortname: string;
}

interface Cohort {
  id: number;
  name: string;
  idnumber?: string;
  description?: string;
  contextid?: number;
  timecreated?: number;
  timemodified?: number;
}

function MainContent() {
  const router = useRouter();
  const { role, userId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [userCohorts, setUserCohorts] = useState<Cohort[]>([]);
  const [isLoadingCohorts, setIsLoadingCohorts] = useState<boolean>(false);
  
  const hasNonStudentRole = role?.roleShortname !== 'student';
  const hasAssignedCohorts = userCohorts.length > 0;

  const fetchCourses = async (useCache = true) => {
    setIsLoadingCourses(true);
    setError(null);
    
    try {
      const cacheKey = 'courses_list';
      
      // Check cache first
      if (useCache) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            const cacheAge = Date.now() - cachedData.timestamp;
            // Use cache if less than 10 minutes old
            if (cacheAge < 10 * 60 * 1000) {
              console.log('✅ Using cached courses data');
              setCourses(cachedData.courses);
              setLastUpdated(new Date(cachedData.timestamp));
              setIsLoadingCourses(false);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse cached courses:', e);
            localStorage.removeItem(cacheKey);
          }
        }
      }

      const token = localStorage.getItem('moodleToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/moodle/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          wsfunction: 'core_course_get_enrolled_courses_by_timeline_classification',
          classification: 'all',
          moodlewsrestformat: 'json',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const courseData = await response.json();
      const enrolledCourses = courseData.courses || [];
      const filteredCourses = enrolledCourses.filter((course: Course) => course.id !== 1);
      setCourses(filteredCourses);
      
      const now = new Date();
      setLastUpdated(now);

      // Cache the data
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          courses: filteredCourses,
          timestamp: now.getTime()
        }));
        console.log('✅ Cached courses data');
      } catch (e) {
        console.warn('Failed to cache courses:', e);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // Fetch user's assigned cohorts
  const fetchUserCohorts = useCallback(async () => {
    if (!userId || !role || role.roleShortname === 'student') {
      return; // Skip for students or if no user info
    }

    setIsLoadingCohorts(true);
    try {
      const params = new URLSearchParams();
      params.append('userId', userId.toString());
      params.append('roleShortname', role.roleShortname);

      const response = await fetch(`/api/getCohorts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setUserCohorts(data.cohorts || []);
        console.log(`✅ User has ${(data.cohorts || []).length} assigned cohorts`);
      }
    } catch (err) {
      console.warn('Failed to fetch user cohorts:', err);
    } finally {
      setIsLoadingCohorts(false);
    }
  }, [userId, role]);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (userId && role) {
      fetchUserCohorts();
    }
  }, [userId, role, fetchUserCohorts]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation title="Moodle Attendance" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Cache Info Banner */}
        {lastUpdated && !isLoadingCourses && (
          <div className="mb-4 sm:mb-6 flex items-center justify-end gap-3 text-xs text-gray-500">
            <span className="whitespace-nowrap">Last updated: {lastUpdated.toLocaleTimeString()}</span>
            <button
              onClick={() => fetchCourses(false)}
              title="Refresh"
              className="w-8 h-8 grid place-items-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 sm:w-5 sm:h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-red-900 text-sm sm:text-base">Unable to Load</h3>
                <p className="text-red-700 text-sm sm:text-sm mt-1">{error}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-2 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                  >
                    Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Class Based Reports - Loading State */}
        {hasNonStudentRole && isLoadingCohorts && (
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Class Reports</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-4 sm:p-5 animate-pulse"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gray-200"></div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Class Based Reports - Loaded State */}
        {!isLoadingCohorts && hasNonStudentRole && hasAssignedCohorts && (
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Class Reports</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {userCohorts.map((cohort) => (
                <button
                  key={cohort.id}
                  onClick={() => router.push(`/report/cohort/${cohort.id}`)}
                  className="group bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.07)] transition-all duration-200 p-4 sm:p-5 text-left"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {cohort.name}
                      </h3>
                      {cohort.idnumber && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                            <Hash className="w-3.5 h-3.5 text-gray-500" />
                            <span className="truncate">{cohort.idnumber}</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All Courses Report - For Students */}
        {!isLoadingCourses && !error && role?.roleShortname === 'student' && (
          <div className="mb-6">
            <button
              onClick={() => router.push('/student-all-courses')}
              className="group w-full bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.07)] transition-all duration-200 p-4 sm:p-5 text-left"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-base sm:text-lg">All Courses Report</h3>
                  <p className="text-sm sm:text-base text-gray-500 mt-1">View attendance across all courses</p>
                </div>
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </button>
          </div>
        )}

        {/* Course Selection */}
        {!isLoadingCourses && !error && courses.length > 0 && (
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Select Course</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => router.push(`/report/direct/${course.id}`)}
                  className="group bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.07)] transition-all duration-200 p-4 sm:p-5 text-left"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {course.fullname}
                      </h3>
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                          <Hash className="w-3.5 h-3.5 text-gray-500" />
                          <span className="truncate">{course.shortname}</span>
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoadingCourses && (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 sm:h-14 sm:w-14 border-4 border-gray-200 border-t-blue-600"></div>
            <p className="mt-5 text-gray-600 text-base sm:text-lg font-medium">Loading courses...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingCourses && !error && courses.length === 0 && (
          <div className="text-center py-12 sm:py-20">
            <div className="w-18 h-18 sm:w-20 sm:h-20 bg-linear-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <ClipboardList className="w-9 h-9 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              No Courses Available
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              There are currently no courses to display.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <MainContent />
    </ProtectedRoute>
  );
}
