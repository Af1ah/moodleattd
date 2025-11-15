'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/components/AuthProvider';

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
  const { logout, role, userId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [userCohorts, setUserCohorts] = useState<Cohort[]>([]);
  
  const isManager = role?.roleShortname === 'manager';
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
      setIsRefreshing(false);
    }
  };

  // Fetch user's assigned cohorts
  const fetchUserCohorts = useCallback(async () => {
    if (!userId || !role || role.roleShortname === 'student') {
      return; // Skip for students or if no user info
    }

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCourses(false); // Force refresh, skip cache
  };



  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Moodle Attendance Reports
                </h1>
                <p className="text-gray-600 mt-1">
                  Select a report to view detailed attendance data
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isManager && (
                <button
                  onClick={() => router.push('/admin/cohort-assignments')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  title="Manage cohort assignments"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Admin
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh courses"
              >
                <svg 
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cache Info Banner */}
        {lastUpdated && !isLoadingCourses && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Data loaded from cache • Last updated: {lastUpdated.toLocaleString()}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Refresh now
            </button>
          </div>
        )}
        
        {/* Method Selection Toggle - HIDDEN TEMPORARILY
        <div className="mb-8 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Attendance Method</h2>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="method"
                checked={!useDirectAPI}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Report Builder</div>
                <div className="text-sm text-gray-500">Use custom attendance reports</div>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="method"
                checked={useDirectAPI}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Direct Gradebook</div>
                <div className="text-sm text-gray-500">Get attendance directly from course gradebook</div>
              </div>
            </label>
          </div>
        </div>
        */}

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 text-lg">Unable to Load Reports</h3>
                  <p className="text-red-700 mt-2">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Class Based Reports - Individual Cohort Buttons */}
        {!isLoadingCourses && !error && hasNonStudentRole && hasAssignedCohorts && (
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Class Based Reports</h2>
              <p className="text-gray-600 mt-1">View attendance reports for your assigned cohorts</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userCohorts.map((cohort) => (
                <button
                  key={cohort.id}
                  onClick={() => router.push(`/report/cohort/${cohort.id}`)}
                  className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-left border-2 border-transparent hover:border-purple-500 transform hover:-translate-y-1 active:scale-98"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                        {cohort.name}
                      </h3>
                      {cohort.idnumber && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          <span>{cohort.idnumber}</span>
                        </div>
                      )}
                      <div className="text-sm text-gray-400">
                        Class Attendance Report
                      </div>
                    </div>
                    <svg className="w-6 h-6 text-gray-400 group-hover:text-purple-600 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All Courses Report Button - For Students */}
        {!isLoadingCourses && !error && role?.roleShortname === 'student' && (
          <div className="mb-8">
            <div className="max-w-md mx-auto">
              <button
                onClick={() => router.push('/student-all-courses')}
                className="group w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-center border-2 border-transparent transform hover:-translate-y-1 active:scale-98"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">📚 All Courses Report</h3>
                    <p className="text-blue-100">View your attendance across all enrolled courses</p>
                  </div>
                  <svg className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Course Selection Grid */}
        {!isLoadingCourses && !error && courses.length > 0 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Select Course</h2>
              <p className="text-gray-600 mt-1">Choose a course to view direct attendance data from gradebook</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => router.push(`/report/direct/${course.id}`)}
                  className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-left border-2 border-transparent hover:border-green-500 transform hover:-translate-y-1 active:scale-98"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
                        {course.fullname}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        <span>{course.shortname}</span>
                      </div>
                    </div>
                    <svg className="w-6 h-6 text-gray-400 group-hover:text-green-600 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading Courses State */}
        {isLoadingCourses && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
            <p className="mt-6 text-gray-600 font-medium">Loading available courses...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingCourses && !error && courses.length === 0 && (
          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Courses Available
            </h3>
            <p className="text-gray-600">
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
