'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MoodleAPIService from '@/services/moodleAPI';
import { MoodleReport } from '@/types/moodle';
import { ProtectedRoute, useAuth } from '@/components/AuthProvider';

interface Course {
  id: number;
  fullname: string;
  shortname: string;
}

function MainContent() {
  const router = useRouter();
  const { logout } = useAuth();
  const [reports, setReports] = useState<MoodleReport[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [useDirectAPI, setUseDirectAPI] = useState<boolean>(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(false);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('moodleToken');
        if (!token) {
          throw new Error('No authentication token found');
        }
        
        const apiService = new MoodleAPIService(token);
        const response = await apiService.listReports();
        setReports(response.reports || []);
      } catch {
        // If listReports fails, it's likely a student without report access
        // Redirect to student's personal attendance view
        console.log('Reports access failed, redirecting to student attendance view');
        router.push('/my-attendance');
        // Don't set error here, as this is expected for students
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [router]);

  const fetchCourses = async () => {
    setIsLoadingCourses(true);
    setError(null);
    try {
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
      // Extract courses from the response (it returns {courses: [...], nextoffset: ...})
      const enrolledCourses = courseData.courses || [];
      setCourses(enrolledCourses.filter((course: Course) => course.id !== 1)); // Exclude site course
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const handleMethodToggle = async (useDirect: boolean) => {
    setUseDirectAPI(useDirect);
    if (useDirect && courses.length === 0) {
      await fetchCourses();
    }
  };

  const handleReportClick = (reportId: number) => {
    router.push(`/report/${reportId}`);
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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Method Selection Toggle */}
        <div className="mb-8 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Attendance Method</h2>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="method"
                checked={!useDirectAPI}
                onChange={() => handleMethodToggle(false)}
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
                onChange={() => handleMethodToggle(true)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Direct Gradebook</div>
                <div className="text-sm text-gray-500">Get attendance directly from course gradebook</div>
              </div>
            </label>
          </div>
        </div>
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="mt-6 text-gray-600 font-medium">Loading available reports...</p>
          </div>
        )}

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

        {/* Reports Grid - Only show when using Report Builder */}
        {!useDirectAPI && !isLoading && !error && reports.length > 0 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Available Reports</h2>
              <p className="text-gray-600 mt-1">Click on any report to view attendance details</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report, index) => (
                <button
                  key={report.id}
                  onClick={() => handleReportClick(report.id)}
                  className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-left border-2 border-transparent hover:border-blue-500 transform hover:-translate-y-1 active:scale-98"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                      index % 6 === 0 ? 'bg-blue-100' :
                      index % 6 === 1 ? 'bg-green-100' :
                      index % 6 === 2 ? 'bg-purple-100' :
                      index % 6 === 3 ? 'bg-orange-100' :
                      index % 6 === 4 ? 'bg-pink-100' :
                      'bg-indigo-100'
                    }`}>
                      <svg className={`w-7 h-7 ${
                        index % 6 === 0 ? 'text-blue-600' :
                        index % 6 === 1 ? 'text-green-600' :
                        index % 6 === 2 ? 'text-purple-600' :
                        index % 6 === 3 ? 'text-orange-600' :
                        index % 6 === 4 ? 'text-pink-600' :
                        'text-indigo-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {report.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        <span>ID: {report.id}</span>
                      </div>
                    </div>
                    <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Course Selection Grid - Only show when using Direct API */}
        {useDirectAPI && !isLoadingCourses && !error && courses.length > 0 && (
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
        {useDirectAPI && isLoadingCourses && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
            <p className="mt-6 text-gray-600 font-medium">Loading available courses...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isLoadingCourses && !error && (
          (!useDirectAPI && reports.length === 0) || 
          (useDirectAPI && courses.length === 0)
        ) && (
          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {useDirectAPI ? 'No Courses Available' : 'No Reports Available'}
            </h3>
            <p className="text-gray-600">
              {useDirectAPI 
                ? 'There are currently no courses to display.'
                : 'There are currently no attendance reports to display.'
              }
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
