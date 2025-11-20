'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLtiUser, setIsLtiUser] = useState(false);
  const [courseInfo, setCourseInfo] = useState<string>('');
  const { login } = useAuth();

  // Check if this is an LTI user and get course info
  useEffect(() => {
    const checkLtiContext = async () => {
      const ltiFlag = localStorage.getItem('isLtiUser') === 'true';
      setIsLtiUser(ltiFlag);
      
      if (ltiFlag) {
        try {
          const response = await fetch('/api/lti/session');
          if (response.ok) {
            const { session } = await response.json();
            setCourseInfo(`${session.courseName} (Course ID: ${session.courseId})`);
          }
        } catch (err) {
          console.error('Failed to get LTI session info:', err);
        }
      }
    };

    checkLtiContext();
    
    // Prevent browser back button cache issues
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', window.location.href);
      window.onpopstate = function () {
        window.history.pushState(null, '', window.location.href);
      };
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();
      console.log('Login response:', { response: response.ok, data });

      if (response.ok && data.token) {
        console.log('Login successful, calling login function');
        // Use the login function from AuthProvider with role info
        await login(data.token, data.userId, data.role);
        console.log('Login function completed');
        // Router push will be handled by AuthProvider
      } else {
        console.log('Login failed:', data.error);
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center">
          {isLtiUser ? 'Sign in to Access Course' : 'Sign in to Moodle Reports'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 px-4">
          {isLtiUser ? (
            <>
              Accessing: <span className="font-medium text-blue-600">{courseInfo}</span><br />
              Enter your Moodle credentials to continue
            </>
          ) : (
            'Enter your Moodle credentials to access your attendance reports'
          )}
        </p>
      </div>

      <div className="mt-8 w-full max-w-md mx-auto">
        <div className="bg-white py-6 px-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-2xl sm:py-8 sm:px-10">
          {isLtiUser && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="shrink-0 mt-0.5">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-blue-800">
                    LTI Authentication Required
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    You&apos;ve been redirected from Moodle. Please log in to access your course attendance report.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  placeholder="Enter your Moodle username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  placeholder="Enter your Moodle password"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 sm:p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Need help accessing your Moodle account?
                </span>
              </div>
            </div>
            <div className="mt-4 text-center text-xs sm:text-sm text-gray-600 px-2">
              Contact your system administrator for assistance with login issues.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}