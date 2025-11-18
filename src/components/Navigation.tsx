'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { 
  ClipboardList, 
  LogOut, 
  User,
  BookOpen,
  Users,
  BarChart3,
  /* Menu removed - not used */
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavigationProps {
  title?: string;
  showBackButton?: boolean;
  icon?: 'clipboard' | 'book' | 'users' | 'chart';
}

// Get contextual icon based on page content
const getPageIcon = (title?: string, customIcon?: string) => {
  if (customIcon === 'clipboard') return ClipboardList;
  if (customIcon === 'book') return BookOpen;
  if (customIcon === 'users') return Users;
  if (customIcon === 'chart') return BarChart3;
  
  // Auto-detect from title
  const lowerTitle = title?.toLowerCase() || '';
  if (lowerTitle.includes('attendance')) return ClipboardList;
  if (lowerTitle.includes('course') || lowerTitle.includes('class')) return BookOpen;
  if (lowerTitle.includes('cohort') || lowerTitle.includes('student')) return Users;
  if (lowerTitle.includes('report')) return BarChart3;
  
  return ClipboardList; // Default
};

export default function Navigation({ title, showBackButton = false, icon }: NavigationProps) {
  const router = useRouter();
  const { logout, userId, role } = useAuth();
  const [userName, setUserName] = useState<string>('User');
  const [userRole, setUserRole] = useState<string>('Student');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch username and set role
  useEffect(() => {
    const fetchUserName = async () => {
      if (!userId) return;
      
      try {
        const token = localStorage.getItem('moodleToken');
        if (!token) return;

        const response = await fetch('/api/moodle/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            wsfunction: 'core_webservice_get_site_info',
            moodlewsrestformat: 'json',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.firstname && data.lastname) {
            setUserName(`${data.firstname} ${data.lastname}`);
          } else if (data.fullname) {
            setUserName(data.fullname);
          } else if (data.username) {
            setUserName(data.username);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch username:', error);
      }
    };

    fetchUserName();
    
    // Set role display name
    if (role?.roleShortname === 'editingteacher') {
      setUserRole('Teacher');
    } else if (role?.roleShortname === 'student') {
      setUserRole('Student');
    } else if (role?.roleShortname === 'manager') {
      setUserRole('Manager');
    } else if (role?.roleName) {
      setUserRole(role.roleName);
    } else {
      setUserRole('Student');
    }
  }, [userId, role]);

  const handleLogout = async () => {
    setIsDrawerOpen(false);
    await logout();
    router.push('/login');
  };
  
  // Get the icon component for the page
  const PageIcon = getPageIcon(title, icon);

  // Close drawer when clicking outside
  useEffect(() => {
    if (isDrawerOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.user-drawer') && !target.closest('.menu-button')) {
          setIsDrawerOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDrawerOpen]);
 const getInitials = (str :string) => {
    if (!str) return ''; // Handle empty or null strings

    const words = str.split(' ');
    let initials = '';

    if (words.length > 0 && words[0]) {
      initials += words[0][0]; // First letter of the first word
    }
    if (words.length > 1 && words[1]) {
      initials += words[1][0]; // First letter of the second word
    }
    return initials.toUpperCase(); // Optional: convert to uppercase
  };

  const fnusername = getInitials(userName);
  return (
    <>
      <header className="sticky py-1.5 top-0 z-50 bg-white/80 backdrop-blur-md shadow-lg">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            {/* Left: Back button or icon + title */}
            <div className="flex items-center gap-3">
              {showBackButton ? (
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-blue-500 rounded-lg transition-colors active:scale-95"
                  aria-label="Go back"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/30 rounded-lg flex items-center justify-center">
                  <PageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              )}
              
              {/* Title */}
              <h1 className="text-lg sm:text-xl font-bold truncate text-gray-900" style={{ color: '#1f2937' }}>
                {title || 'Moodle Attendance'}
              </h1>
            </div>

            {/* Right: User info and Logout */}
            <div className="flex items-center gap-2">
              {/* Desktop: User info + Logout button */}
              <div className="hidden sm:flex items-center gap-2">
                {/* Manager Cohort Assignment Button */}
                {role?.roleShortname === 'manager' && (
                  <button
                    onClick={() => router.push('/admin/cohort-assignments')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-600 border border-blue-200 hover:bg-blue-500/20 rounded-lg transition-colors active:scale-95"
                    title="Manage Cohort Assignments"
                  >
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium hidden lg:inline">Cohort Roles</span>
                  </button>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg" title={`Role: ${userRole}`}>
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium truncate max-w-[150px] md:max-w-[200px] text-gray-900">
                    {userName}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-3 py-1.5 text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 rounded-lg transition-colors active:scale-95 font-medium"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium hidden md:inline">Logout</span>
                </button>
              </div>

              {/* Mobile: Rounded menu button */}
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="sm:hidden w-10 h-10 rounded-full flex items-center justify-center menu-button"
                style={{
                  background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 100%)',
                  color: 'white',
                  boxShadow: isDrawerOpen ? '0 0 0 4px #e0e7ff' : undefined
                }}
                aria-label="User menu"
              >
                {isDrawerOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">{fnusername}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer - Compact Modal */}
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="sm:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in" 
            onClick={() => setIsDrawerOpen(false)}
          />
          
          {/* Compact Drawer Modal */}
          <div className="sm:hidden fixed top-16 right-4 w-72 bg-white rounded-2xl shadow-2xl z-50 user-drawer animate-fade-in">
            <div className="p-4">
              {/* User Info */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl mb-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 100%)',
                    color: 'white'
                  }}>
                  <span className="text-white text-lg font-bold">{fnusername}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-600">{userRole}</p>
                </div>
              </div>

              {/* Manager Cohort Assignment Button */}
              {role?.roleShortname === 'manager' && (
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    router.push('/admin/cohort-assignments');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-2 text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-colors active:scale-95 font-medium"
                  aria-label="Manage Cohort Assignments"
                >
                  <Users className="w-4 h-4" />
                  <span>Manage Cohort Roles</span>
                </button>
              )}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 rounded-xl transition-colors active:scale-95 font-medium"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
