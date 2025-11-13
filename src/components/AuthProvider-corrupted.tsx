'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = !!token;

  useEffect(() => {
    // Check for existing token on mount (only on client side)
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('moodleToken');
      if (storedToken) {
        setToken(storedToken);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Handle authentication redirects
    if (!isLoading) {
      console.log('Auth redirect check:', {
        isAuthenticated,
        pathname,
        token: !!token
      });
      
      const isLtiUser = typeof window !== 'undefined' ? localStorage.getItem('isLtiUser') === 'true' : false;
      const ltiReturnUrl = typeof window !== 'undefined' ? localStorage.getItem('ltiReturnUrl') : null;
      
      if (!isAuthenticated && pathname !== '/login' && !pathname.startsWith('/lti/')) {
        console.log('Redirecting to login');
        router.push('/login');
      } else if (isAuthenticated && pathname === '/login') {
        if (isLtiUser && ltiReturnUrl) {
          // LTI user: redirect to their course report
          console.log('Redirecting LTI user to:', ltiReturnUrl);
          localStorage.removeItem('isLtiUser');
          localStorage.removeItem('ltiReturnUrl');
          router.push(ltiReturnUrl);
        } else {
          // Normal user: redirect to home
          console.log('Redirecting normal user to home');
          router.push('/');
        }
      }
    }
  }, [isAuthenticated, isLoading, pathname, router, token]);

  const login = (newToken: string) => {
    console.log('Login function called with token:', newToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('moodleToken', newToken);
      console.log('Token stored in localStorage');
    }
    setToken(newToken);
    console.log('Token state updated');
    
    // Check if this is an LTI user
    const isLtiUser = typeof window !== 'undefined' ? localStorage.getItem('isLtiUser') === 'true' : false;
    const ltiReturnUrl = typeof window !== 'undefined' ? localStorage.getItem('ltiReturnUrl') : null;
    
    if (isLtiUser && ltiReturnUrl) {
      // LTI user: redirect to their course report
      console.log('Redirecting LTI user to:', ltiReturnUrl);
      localStorage.removeItem('isLtiUser');
      localStorage.removeItem('ltiReturnUrl');
      router.push(ltiReturnUrl);
    } else {
      // Normal user: redirect to home
      console.log('Redirecting normal user to home');
      router.push('/');
    }
  };

  const logout = async () => {
    try {
      // Call logout API to invalidate token on server
      await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Error during logout API call:', error);
      // Continue with local logout even if API call fails
    }

    // Clear local storage and state
    if (typeof window !== 'undefined') {
      localStorage.removeItem('moodleToken');
    }
    setToken(null);
    router.push('/login');
  };

  const value = {
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Component to protect routes that require authentication
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // The AuthProvider will handle the redirect
  }

  return <>{children}</>;
}