'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/components/AuthProvider';
import Navigation from '@/components/Navigation';

interface Role {
  id: number;
  shortname: string;
  name: string;
}

interface CohortAssignment {
  cohortId: number;
  cohortName: string;
  cohortIdnumber: string | null;
  roleId: number;
  timeAssigned: number;
  selectedCourses: number[] | null;
}

interface Course {
  id: number;
  attendanceId: number;
  name: string;
}

interface User {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  roles: Role[];
  cohorts: CohortAssignment[];
}

interface Cohort {
  id: number;
  name: string;
  idnumber: string | null;
  description: string | null;
}

function AdminCohortAssignment() {
  const router = useRouter();
  const { role, userId } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [allCohorts, setAllCohorts] = useState<Cohort[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingCohorts, setIsLoadingCohorts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cohortCourses, setCohortCourses] = useState<Record<number, Course[]>>({});
  const [loadingCourses, setLoadingCourses] = useState<Record<number, boolean>>({});
  const [expandedCohortCourses, setExpandedCohortCourses] = useState<Record<string, boolean>>({});

  // Check if user is admin (manager)
  useEffect(() => {
    if (role && role.roleShortname !== 'manager') {
      router.push('/');
    }
  }, [role, router]);

  // Fetch non-student users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const response = await fetch('/api/cohortAssignments');
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Fetch all cohorts (admin view - no filtering)
  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        setIsLoadingCohorts(true);
        
        // For admin, we need to fetch all cohorts from the cohortService
        // We'll create a separate endpoint for this or modify the existing one
        // For now, use a workaround by fetching from cohortService directly
        const response = await fetch('/api/getAllCohorts');
        if (!response.ok) throw new Error('Failed to fetch cohorts');
        const data = await response.json();
        setAllCohorts(data.cohorts || []);
      } catch (err) {
        console.error('Failed to fetch cohorts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load cohorts');
      } finally {
        setIsLoadingCohorts(false);
      }
    };

    fetchCohorts();
  }, []);

  const handleAssignCohort = async (targetUserId: number, cohortId: number, userRoleId: number) => {
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/cohortAssignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortId,
          userId: targetUserId,
          roleId: userRoleId,
          assignedBy: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to assign cohort');
      }

      setSuccess('Cohort assigned successfully');
      
      // Refresh users list
      const usersResponse = await fetch('/api/cohortAssignments');
      const usersData = await usersResponse.json();
      setUsers(usersData.users || []);
    } catch (err) {
      console.error('Failed to assign cohort:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign cohort');
    }
  };

  const handleRemoveCohort = async (targetUserId: number, cohortId: number) => {
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/cohortAssignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortId,
          userId: targetUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to remove cohort');
      }

      setSuccess('Cohort assignment removed successfully');
      
      // Refresh users list
      const usersResponse = await fetch('/api/cohortAssignments');
      const usersData = await usersResponse.json();
      setUsers(usersData.users || []);
    } catch (err) {
      console.error('Failed to remove cohort:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove cohort');
    }
  };

  const fetchCoursesForCohort = async (cohortId: number) => {
    if (cohortCourses[cohortId]) return; // Already loaded
    
    try {
      setLoadingCourses((prev) => ({ ...prev, [cohortId]: true }));
      const response = await fetch(`/api/cohortCourses?cohortId=${cohortId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }
      
      const data = await response.json();
      setCohortCourses((prev) => ({ ...prev, [cohortId]: data.courses || [] }));
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoadingCourses((prev) => ({ ...prev, [cohortId]: false }));
    }
  };

  const handleUpdateCourseSelection = async (
    targetUserId: number,
    cohortId: number,
    selectedCourseIds: number[]
  ) => {
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/cohortAssignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortId,
          userId: targetUserId,
          selectedCourses: selectedCourseIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to update course selection');
      }

      setSuccess('Course selection updated successfully');
      
      // Refresh users list
      const usersResponse = await fetch('/api/cohortAssignments');
      const usersData = await usersResponse.json();
      setUsers(usersData.users || []);
    } catch (err) {
      console.error('Failed to update course selection:', err);
      setError(err instanceof Error ? err.message : 'Failed to update course selection');
    }
  };

  const toggleCohortCourses = (userId: number, cohortId: number) => {
    const key = `${userId}-${cohortId}`;
    const isExpanding = !expandedCohortCourses[key];
    
    setExpandedCohortCourses((prev) => ({ ...prev, [key]: isExpanding }));
    
    if (isExpanding) {
      fetchCoursesForCohort(cohortId);
    }
  };

  const isLoading = isLoadingUsers || isLoadingCohorts;

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      user.firstname.toLowerCase().includes(query) ||
      user.lastname.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation title="Cohort Assignments" showBackButton={true} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow px-4 sm:px-6 py-6 sm:py-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Cohort Assignments</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Assign cohorts to teachers and managers. Each user can have multiple cohort assignments.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Search Input */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, username, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg
                className="absolute left-3 top-3.5 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search query.</p>
              </div>
            ) : (
              filteredUsers.map((user) => {
              const isExpanded = expandedUserId === user.id;
              const assignedCohortIds = user.cohorts.map((c) => c.cohortId);
              const availableCohorts = allCohorts.filter(
                (c) => !assignedCohortIds.includes(c.id)
              );

              return (
                <div key={user.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                    className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.firstname[0]}{user.lastname[0]}
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {user.firstname} {user.lastname}
                        </h3>
                        <p className="text-sm text-gray-600">
                          @{user.username} • {user.email}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {user.roles.map((r) => (
                            <span
                              key={r.id}
                              className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded"
                            >
                              {r.shortname}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {user.cohorts.length} cohort{user.cohorts.length !== 1 ? 's' : ''}
                      </span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          isExpanded ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 py-4 bg-white border-t border-gray-200">
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          Assigned Cohorts ({user.cohorts.length})
                        </h4>
                        {user.cohorts.length === 0 ? (
                          <p className="text-sm text-gray-500">No cohorts assigned yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {user.cohorts.map((cohort) => {
                              const courseKey = `${user.id}-${cohort.cohortId}`;
                              const isCoursesExpanded = expandedCohortCourses[courseKey];
                              const courses = cohortCourses[cohort.cohortId] || [];
                              const isLoadingCoursesForCohort = loadingCourses[cohort.cohortId];
                              const selectedCourseIds = cohort.selectedCourses || [];

                              return (
                                <div
                                  key={cohort.cohortId}
                                  className="border border-blue-200 rounded-lg overflow-hidden"
                                >
                                  <div className="flex items-center justify-between p-3 bg-blue-50">
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900">{cohort.cohortName}</p>
                                      {cohort.cohortIdnumber && (
                                        <p className="text-sm text-gray-600">ID: {cohort.cohortIdnumber}</p>
                                      )}
                                      {selectedCourseIds.length > 0 && (
                                        <p className="text-xs text-blue-600 mt-1">
                                          {selectedCourseIds.length} course(s) selected
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => toggleCohortCourses(user.id, cohort.cohortId)}
                                        className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                                      >
                                        {isCoursesExpanded ? 'Hide' : 'Select'} Courses
                                      </button>
                                      <button
                                        onClick={() => handleRemoveCohort(user.id, cohort.cohortId)}
                                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>

                                  {isCoursesExpanded && (
                                    <div className="p-4 bg-white border-t border-blue-200">
                                      {isLoadingCoursesForCohort ? (
                                        <div className="text-center py-4">
                                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                          <p className="text-sm text-gray-600 mt-2">Loading courses...</p>
                                        </div>
                                      ) : courses.length === 0 ? (
                                        <p className="text-sm text-gray-500">No courses found for this cohort.</p>
                                      ) : (
                                        <div>
                                          <h5 className="text-sm font-medium text-gray-900 mb-3">
                                            Select Courses (All courses selected if none chosen):
                                          </h5>
                                          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                                            {courses.map((course) => {
                                              const isSelected = selectedCourseIds.includes(course.id);
                                              
                                              return (
                                                <label
                                                  key={course.id}
                                                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                      const newSelection = e.target.checked
                                                        ? [...selectedCourseIds, course.id]
                                                        : selectedCourseIds.filter((id) => id !== course.id);
                                                      
                                                      handleUpdateCourseSelection(
                                                        user.id,
                                                        cohort.cohortId,
                                                        newSelection
                                                      );
                                                    }}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                  />
                                                  <span className="text-sm text-gray-700">{course.name}</span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => {
                                                const allCourseIds = courses.map((c) => c.id);
                                                handleUpdateCourseSelection(
                                                  user.id,
                                                  cohort.cohortId,
                                                  allCourseIds
                                                );
                                              }}
                                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                            >
                                              Select All
                                            </button>
                                            <button
                                              onClick={() => {
                                                handleUpdateCourseSelection(user.id, cohort.cohortId, []);
                                              }}
                                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                            >
                                              Clear All
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          Available Cohorts ({availableCohorts.length})
                        </h4>
                        {availableCohorts.length === 0 ? (
                          <p className="text-sm text-gray-500">All cohorts are already assigned.</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {availableCohorts.map((cohort) => (
                              <div
                                key={cohort.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                              >
                                <div>
                                  <p className="font-medium text-gray-900">{cohort.name}</p>
                                  {cohort.idnumber && (
                                    <p className="text-sm text-gray-600">ID: {cohort.idnumber}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() =>
                                    handleAssignCohort(user.id, cohort.id, user.roles[0].id)
                                  }
                                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                                >
                                  Assign
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCohortAssignmentPage() {
  return (
    <ProtectedRoute>
      <AdminCohortAssignment />
    </ProtectedRoute>
  );
}
