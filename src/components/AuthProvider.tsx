'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface RoleInfo {
  roleId: number;
  roleName: string;
  roleShortname: string;
}

interface AuthContextType {
  token: string | null;
  userId: number | null;
  role: RoleInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLtiUser: boolean;
  login: (token: string, userId?: number, role?: RoleInfo) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<RoleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLtiUser, setIsLtiUser] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = !!token;

  useEffect(() => {
    // Check for LTI session first, then fallback to localStorage
    const checkAuth = async () => {
      try {
        // Check for LTI session
        const response = await fetch('/api/lti/session');
        if (response.ok) {
          const data = await response.json();
          if (data.session) {
            console.log('✅ LTI session found:', data.session);
            // For LTI users, use their token or mark as LTI-authenticated
            const ltiToken = data.session.moodleToken || 'LTI_SESSION_' + data.session.userId;
            setToken(ltiToken);
            setUserId(parseInt(data.session.userId));
            setRole({
              roleId: 0, // Not needed for LTI
              roleName: data.session.roleName || 'User',
              roleShortname: data.session.roleShortname || 'user',
            });
            setIsLtiUser(true);
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.log('No LTI session, checking localStorage');
      }

      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('moodleToken');
        const storedUserId = localStorage.getItem('moodleUserId');
        const storedRole = localStorage.getItem('moodleRole');
        
        if (storedToken) {
          setToken(storedToken);
        }
        if (storedUserId) {
          setUserId(parseInt(storedUserId));
        }
        if (storedRole) {
          try {
            setRole(JSON.parse(storedRole));
          } catch (e) {
            console.error('Error parsing stored role:', e);
          }
        }
        setIsLtiUser(false);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    // Handle authentication redirects
    if (!isLoading) {
      console.log('Auth redirect check:', {
        isAuthenticated,
        pathname,
        token: !!token,
        isLtiUser
      });
      
      // Skip redirect for LTI users - they're already on the right page
      if (isLtiUser) {
        console.log('LTI user detected, skipping redirect');
        return;
      }
      
      // For non-LTI users, enforce authentication
      if (!isAuthenticated && pathname !== '/login' && !pathname.startsWith('/lti/')) {
        console.log('Redirecting to login');
        router.push('/login');
      } else if (isAuthenticated && pathname === '/login') {
        console.log('Redirecting authenticated user to home');
        router.push('/');
      }
    }
  }, [isAuthenticated, isLoading, pathname, router, token, isLtiUser]);

  const login = (newToken: string, newUserId?: number, newRole?: RoleInfo) => {
    console.log('Login function called with token:', newToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('moodleToken', newToken);
      if (newUserId) {
        localStorage.setItem('moodleUserId', newUserId.toString());
      }
      if (newRole) {
        localStorage.setItem('moodleRole', JSON.stringify(newRole));
      }
      console.log('Token and user info stored in localStorage');
    }
    setToken(newToken);
    setUserId(newUserId || null);
    setRole(newRole || null);
    setIsLtiUser(false); // Manual login is not LTI
    console.log('Token and user state updated');
    
    // Normal user: redirect to home
    console.log('Redirecting authenticated user to home');
    router.push('/');
  };

  const logout = async () => {
    try {
      // Call logout API to invalidate token on server (for non-LTI users)
      if (!isLtiUser) {
        await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Error during logout API call:', error);
      // Continue with local logout even if API call fails
    }

    // Clear local storage and state
    if (typeof window !== 'undefined') {
      localStorage.removeItem('moodleToken');
      localStorage.removeItem('moodleUserId');
      localStorage.removeItem('moodleRole');
    }
    setToken(null);
    setUserId(null);
    setRole(null);
    setIsLtiUser(false);
    router.push('/login');
  };

  const value = {
    token,
    userId,
    role,
    isAuthenticated,
    isLoading,
    isLtiUser,
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