'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LTIAuthPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        console.log('🔍 Starting LTI auth check...');
        
        // Add a small delay to ensure session is available
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // First, check if we have an LTI session
        console.log('📞 Calling /api/lti/session...');
        const sessionResponse = await fetch('/api/lti/session');
        
        console.log('📊 Session response status:', sessionResponse.status);
        console.log('📊 Session response ok:', sessionResponse.ok);
        
        if (!sessionResponse.ok) {
          const errorText = await sessionResponse.text();
          console.error('❌ Session response not ok:', errorText);
          throw new Error(`No LTI session found (${sessionResponse.status}): ${errorText}`);
        }
        
        const sessionData = await sessionResponse.json();
        console.log('✅ Session data received:', sessionData);
        
        const { session } = sessionData;
        const courseId = session.courseId;
        
        console.log('🎯 Course ID from session:', courseId);
        
        // Check if user has login token in localStorage
        const moodleToken = localStorage.getItem('moodleToken');
        console.log('🔑 Moodle token from localStorage:', moodleToken ? 'Found' : 'Not found');
        
        if (moodleToken) {
          // User is already authenticated, redirect to their course report
          console.log('✅ User is authenticated, redirecting to course report');
          router.push(`/report/direct/${courseId}`);
        } else {
          // User needs to login first, redirect to login with return URL
          console.log('❌ User not authenticated, redirecting to login');
          // Store the intended destination for after login
          localStorage.setItem('ltiReturnUrl', `/report/direct/${courseId}`);
          localStorage.setItem('isLtiUser', 'true');
          router.push('/login');
        }
      } catch (err) {
        console.error('LTI auth check failed:', err);
        setError(`Failed to process LTI authentication: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => {
                // Clear any stored data and try to reload
                localStorage.removeItem('isLtiUser');
                localStorage.removeItem('ltiReturnUrl');
                window.location.reload();
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                // Try to go back to Moodle
                if (window.opener) {
                  window.close();
                } else {
                  window.location.href = '/';
                }
              }}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="mt-4 text-gray-600 font-medium">Checking authentication...</p>
      </div>
    </div>
  );
}