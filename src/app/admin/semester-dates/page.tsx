"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

interface SemesterDate {
  id: string;
  admissionyear: string;
  semestername: string;
  startdate: string;
  enddate: string;
  iscurrent: boolean;
  timecreated: string;
  timemodified: string;
}

export default function SemesterDatesManagement() {
  const router = useRouter();
  const [semesters, setSemesters] = useState<SemesterDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    admissionyear: "",
    semestername: "",
    startdate: "",
    enddate: "",
    iscurrent: false,
  });

  useEffect(() => {
    fetchSemesters();
  }, []);

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
      
      const response = await fetch("/api/semesterDates", { headers });
      
      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch semester dates");
      }

      const data = await response.json();
      setSemesters(data);
      setError("");
    } catch (err: any) {
      setError(err.message || "Error loading semester dates");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    try {
      const token = localStorage.getItem('moodleToken');
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const url = "/api/semesterDates";
      const method = isEditing ? "PUT" : "POST";
      const payload = isEditing 
        ? { ...formData, id: editingId }
        : formData;

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save semester date");
      }

      setSuccessMessage(
        isEditing 
          ? "Semester updated successfully" 
          : "Semester created successfully"
      );
      
      // Reset form
      resetForm();
      
      // Refresh list
      await fetchSemesters();
    } catch (err: any) {
      setError(err.message || "Error saving semester date");
    }
  };

  const handleEdit = (semester: SemesterDate) => {
    setIsEditing(true);
    setEditingId(semester.id);
    setFormData({
      admissionyear: semester.admissionyear,
      semestername: semester.semestername,
      startdate: semester.startdate.split("T")[0],
      enddate: semester.enddate.split("T")[0],
      iscurrent: semester.iscurrent,
    });
    setError("");
    setSuccessMessage("");
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

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      admissionyear: "",
      semestername: "",
      startdate: "",
      enddate: "",
      iscurrent: false,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation title="Semester Management" icon="chart" />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            📅 Semester Dates Management
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Define semester periods for each batch. Each batch has ONE current active semester (~6 months). Students automatically see their current semester by default.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6 border border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">
                {isEditing ? "✏️ Edit Semester" : "➕ Add New Semester"}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admission Year (Batch) *
                  </label>
                  <input
                    type="text"
                    name="admissionyear"
                    value={formData.admissionyear}
                    onChange={handleInputChange}
                    placeholder="e.g., 2024"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Year when students were admitted to this batch
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semester Name *
                  </label>
                  <input
                    type="text"
                    name="semestername"
                    value={formData.semestername}
                    onChange={handleInputChange}
                    placeholder="e.g., Semester 1, Fall 2024"
                    maxLength={50}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="startdate"
                    value={formData.startdate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="enddate"
                    value={formData.enddate}
                    onChange={handleInputChange}
                    min={formData.startdate}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      name="iscurrent"
                      id="iscurrent"
                      checked={formData.iscurrent}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-0.5"
                    />
                    <div className="ml-2">
                      <label htmlFor="iscurrent" className="block text-sm font-medium text-gray-700">
                        ✅ Mark as current/active semester
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Only ONE semester per batch should be active at a time
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-colors"
                  >
                    {isEditing ? "💾 Update" : "➕ Create"}
                  </button>
                  
                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 font-medium transition-colors"
                    >
                      ✖️ Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6 border border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">📋 Existing Semesters</h2>
              
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading semester dates...
                </div>
              ) : semesters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No semester dates configured yet. Add your first semester using the form.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Admission Year
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Semester
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {semesters.map((semester) => (
                        <tr key={semester.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {semester.admissionyear}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {semester.semestername}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(semester.startdate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(semester.enddate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {semester.iscurrent ? (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Current
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEdit(semester)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(semester.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
