'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/components/AuthProvider';

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

  const isLoading = isLoadingUsers || isLoadingCohorts;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Reports
          </button>
        </div>

        <div className="bg-white rounded-lg shadow px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cohort Assignments</h1>
          <p className="text-gray-600 mb-8">
            Assign cohorts to teachers and managers. Each user can have multiple cohort assignments.
          </p>

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

          <div className="space-y-4">
            {users.map((user) => {
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
                          <div className="space-y-2">
                            {user.cohorts.map((cohort) => (
                              <div
                                key={cohort.cohortId}
                                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                              >
                                <div>
                                  <p className="font-medium text-gray-900">{cohort.cohortName}</p>
                                  {cohort.cohortIdnumber && (
                                    <p className="text-sm text-gray-600">ID: {cohort.cohortIdnumber}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleRemoveCohort(user.id, cohort.cohortId)}
                                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
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
            })}
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
