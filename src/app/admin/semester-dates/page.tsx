"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { Calendar, Edit2, Trash2, Save, X } from "lucide-react";

interface SemesterDate {
  id: string;
  admissionyear: string;
  semestername: string;
  startdate: string;
  enddate: string;
  iscurrent: boolean;
}

// Helper function to adjust date to avoid weekends
function adjustDateForWeekend(date: Date): Date {
  const day = date.getDay();
  if (day === 0) { // Sunday
    date.setDate(date.getDate() + 1);
  } else if (day === 6) { // Saturday
    date.setDate(date.getDate() + 2);
  }
  return date;
}

export default function SemesterDatesManagement() {
  const router = useRouter();
  const [semesters, setSemesters] = useState<SemesterDate[]>([]);
  const [admissionYears, setAdmissionYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{startdate: string; enddate: string; semestername: string}>({ 
    startdate: "", 
    enddate: "",
    semestername: ""
  });

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    await fetchAdmissionYears();
    await fetchSemesters();
  };

  const fetchAdmissionYears = async () => {
    try {
      const token = localStorage.getItem('moodleToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/availableAdmissionYears", { headers });
      
      if (response.ok) {
        const data = await response.json();
        setAdmissionYears(data.years || []);
      }
    } catch (err) {
      console.error("Error fetching admission years:", err);
    }
  };

  const fetchSemesters = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('moodleToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/semesterDates?currentOnly=true", { headers });
      
      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch semester dates");
      }

      const data = await response.json();
      
      // Create entries for admission years that don't have current semester
      const existingYears = new Set(data.map((s: SemesterDate) => s.admissionyear));
      const missingYears = admissionYears.filter(year => !existingYears.has(year));
      
      // Auto-create initial semester for missing years
      if (missingYears.length > 0) {
        await createInitialSemesters(missingYears);
        // Refetch after creation
        const refetchResponse = await fetch("/api/semesterDates?currentOnly=true", { headers });
        const refetchData = await refetchResponse.json();
        setSemesters(refetchData);
      } else {
        setSemesters(data);
      }
      
      setError("");
    } catch (err: any) {
      setError(err.message || "Error loading semester dates");
    } finally {
      setLoading(false);
    }
  };

  const createInitialSemesters = async (years: string[]) => {
    const token = localStorage.getItem('moodleToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Find the first available semester number
    const usedSemesters = new Set(semesters.map(s => s.semestername));
    
    for (const year of years) {
      let semesterNum = 1;
      while (usedSemesters.has(semesterNum.toString()) && semesterNum <= 10) {
        semesterNum++;
      }
      
      if (semesterNum <= 10) {
        // Create initial semester
        const now = new Date();
        const startDate = new Date(parseInt(year), 6, 1); // July 1
        const endDate = new Date(parseInt(year), 10, 30); // November 30
        
        await fetch("/api/semesterDates", {
          method: "POST",
          headers,
          body: JSON.stringify({
            admissionyear: year,
            semestername: semesterNum.toString(),
            startdate: startDate.toISOString().split('T')[0],
            enddate: endDate.toISOString().split('T')[0],
            iscurrent: true,
          }),
        });
        
        usedSemesters.add(semesterNum.toString());
      }
    }
  };

  const startEdit = (semester: SemesterDate) => {
    setEditingId(semester.id);
    setEditData({
      startdate: semester.startdate.split("T")[0],
      enddate: semester.enddate.split("T")[0],
      semestername: semester.semestername,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ startdate: "", enddate: "", semestername: "" });
  };

  const saveEdit = async (id: string, admissionyear: string) => {
    try {
      // Validate semester number
      const semNum = parseInt(editData.semestername);
      if (isNaN(semNum) || semNum < 1 || semNum > 10) {
        setError("Semester number must be between 1 and 10");
        return;
      }

      // Check uniqueness: No two admission years can have the same semester
      const duplicateAcrossYears = semesters.find(
        s => s.semestername === editData.semestername && s.id !== id
      );
      
      if (duplicateAcrossYears) {
        setError(`Semester ${editData.semestername} is already used by admission year ${duplicateAcrossYears.admissionyear}. Each semester must be unique across all years.`);
        return;
      }

      const token = localStorage.getItem('moodleToken');
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Validate dates don't fall on weekends
      const startDate = new Date(editData.startdate);
      const endDate = new Date(editData.enddate);
      
      const adjustedStart = adjustDateForWeekend(startDate);
      const adjustedEnd = adjustDateForWeekend(endDate);

      const response = await fetch("/api/semesterDates", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          id,
          semestername: editData.semestername,
          startdate: adjustedStart.toISOString().split("T")[0],
          enddate: adjustedEnd.toISOString().split("T")[0],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update semester");
      }

      setSuccessMessage("Semester updated successfully");
      setEditingId(null);
      await fetchSemesters();
    } catch (err: any) {
      setError(err.message || "Error updating semester");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this semester?")) {
      return;
    }

    try {
      const token = localStorage.getItem('moodleToken');
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/semesterDates?id=${id}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete semester");
      }

      setSuccessMessage("Semester deleted successfully");
      await fetchSemesters();
    } catch (err: any) {
      setError(err.message || "Error deleting semester");
    }
  };

  // Auto-clear messages after 3 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
        setError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation title="Semester Management" icon="chart" />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Semester Dates Management
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Manage semester periods. System auto-activates semesters based on current date.
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {successMessage}
          </div>
        )}

        {/* Current Semester Summary */}
        {semesters.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Active Semesters</h3>
            <div className="flex flex-wrap gap-2">
              {semesters.map((semester) => (
                <span key={semester.admissionyear} className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                  {semester.admissionyear}: Semester {semester.semestername}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Semesters Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              Loading...
            </div>
          ) : semesters.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No semesters configured yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sem
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {semesters.map((semester) => {
                    const isEditing = editingId === semester.id;
                    
                    return (
                      <tr key={semester.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {semester.admissionyear}
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editData.semestername}
                              onChange={(e) => setEditData(prev => ({ ...prev, semestername: e.target.value }))}
                              min="1"
                              max="10"
                              className="w-16 px-2 py-1 text-center text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                              {semester.semestername}
                            </span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editData.startdate}
                              onChange={(e) => setEditData(prev => ({ ...prev, startdate: e.target.value }))}
                              className="w-full sm:w-auto px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            new Date(semester.startdate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editData.enddate}
                              onChange={(e) => setEditData(prev => ({ ...prev, enddate: e.target.value }))}
                              min={editData.startdate}
                              className="w-full sm:w-auto px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            new Date(semester.enddate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-center">
                          {semester.iscurrent ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Current
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1 sm:gap-2">
                              <button
                                onClick={() => saveEdit(semester.id, semester.admissionyear)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1 sm:gap-2">
                              <button
                                onClick={() => startEdit(semester)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(semester.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Calendar className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Semester Management:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>One row per admission year</strong> - showing current semester</li>
                <li>• Each semester number (1-10) is unique across all years</li>
                <li>• Admin can edit semester number, start date, and end date</li>
                <li>• <strong>Auto-increment:</strong> When end date passes, system automatically moves to next available semester</li>
                <li>• Odd semesters (1,3,5,7,9): July - November</li>
                <li>• Even semesters (2,4,6,8,10): December - March</li>
                <li>• Dates automatically avoid weekends (Sat/Sun)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
