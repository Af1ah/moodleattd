"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

interface SemesterInfo {
  id: string;
  admissionyear: string;
  semestername: string;
  startdate: string;
  enddate: string;
  startTimestamp: number;
  endTimestamp: number;
  iscurrent: boolean;
}

interface SemesterDatePickerProps {
  onDateRangeChange: (startDate: string, endDate: string, semesterName?: string) => void;
  userId?: string;
  showCustomPicker?: boolean;
  className?: string;
}

export default function SemesterDatePicker({
  onDateRangeChange,
  userId,
  showCustomPicker = true,
  className = "",
}: SemesterDatePickerProps) {
  const [semesters, setSemesters] = useState<SemesterInfo[]>([]);
  const [currentSemester, setCurrentSemester] = useState<SemesterInfo | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>("current");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [admissionYear, setAdmissionYear] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSemesterData();
  }, [userId]);

  useEffect(() => {
    // When current semester is loaded, apply it by default
    if (currentSemester && selectedSemester === "current") {
      const startDate = new Date(currentSemester.startdate).toISOString().split("T")[0];
      const endDate = new Date(currentSemester.enddate).toISOString().split("T")[0];
      onDateRangeChange(startDate, endDate, currentSemester.semestername);
    }
  }, [currentSemester]);

  const fetchSemesterData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/userAdmissionYear");
      
      if (!response.ok) {
        console.error("Failed to fetch semester data");
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      if (data.admissionYear) {
        setAdmissionYear(data.admissionYear);
        setSemesters(data.allSemesters || []);
        
        if (data.currentSemester) {
          setCurrentSemester(data.currentSemester);
          // Auto-apply current semester dates
          const startDate = new Date(data.currentSemester.startdate).toISOString().split("T")[0];
          const endDate = new Date(data.currentSemester.enddate).toISOString().split("T")[0];
          setCustomStartDate(startDate);
          setCustomEndDate(endDate);
        }
      }
    } catch (error) {
      console.error("Error fetching semester data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSemesterChange = (value: string) => {
    setSelectedSemester(value);

    if (value === "current" && currentSemester) {
      const startDate = new Date(currentSemester.startdate).toISOString().split("T")[0];
      const endDate = new Date(currentSemester.enddate).toISOString().split("T")[0];
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
      onDateRangeChange(startDate, endDate, currentSemester.semestername);
    } else if (value === "custom") {
      // Keep current custom dates or use semester bounds
      if (customStartDate && customEndDate) {
        onDateRangeChange(customStartDate, customEndDate);
      }
    } else {
      // Specific semester selected
      const semester = semesters.find(s => s.id === value);
      if (semester) {
        const startDate = new Date(semester.startdate).toISOString().split("T")[0];
        const endDate = new Date(semester.enddate).toISOString().split("T")[0];
        setCustomStartDate(startDate);
        setCustomEndDate(endDate);
        onDateRangeChange(startDate, endDate, semester.semestername);
      }
    }
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      onDateRangeChange(customStartDate, customEndDate);
    }
  };

  // Get min/max dates based on current selection
  const getDateBounds = () => {
    if (selectedSemester === "current" && currentSemester) {
      return {
        min: new Date(currentSemester.startdate).toISOString().split("T")[0],
        max: new Date(currentSemester.enddate).toISOString().split("T")[0],
      };
    }
    
    const semester = semesters.find(s => s.id === selectedSemester);
    if (semester) {
      return {
        min: new Date(semester.startdate).toISOString().split("T")[0],
        max: new Date(semester.enddate).toISOString().split("T")[0],
      };
    }

    return { min: "", max: "" };
  };

  const bounds = getDateBounds();

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
        <div className="animate-pulse flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      <div className="flex items-start gap-2 mb-3">
        <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Date Range</h3>
          {admissionYear && (
            <p className="text-xs text-gray-500">Admission Year: {admissionYear}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Semester Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Select Period
          </label>
          <select
            value={selectedSemester}
            onChange={(e) => handleSemesterChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {currentSemester && (
              <option value="current">
                Current: Semester {currentSemester.semestername}
              </option>
            )}
            
            {semesters.filter(s => !s.iscurrent).map((semester) => (
              <option key={semester.id} value={semester.id}>
                Semester {semester.semestername}
              </option>
            ))}
            
            {showCustomPicker && (
              <option value="custom">Custom Date Range</option>
            )}
          </select>
        </div>

        {/* Custom Date Picker (when custom is selected) */}
        {showCustomPicker && selectedSemester === "custom" && (
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                onBlur={handleCustomDateChange}
                min={bounds.min}
                max={bounds.max || customEndDate}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                onBlur={handleCustomDateChange}
                min={customStartDate}
                max={bounds.max}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Display selected date range */}
        {selectedSemester !== "custom" && (
          <div className="text-xs text-gray-600 pt-2 border-t border-gray-200">
            <span className="font-medium">Range: </span>
            {customStartDate && customEndDate ? (
              <>
                {new Date(customStartDate).toLocaleDateString()} - {new Date(customEndDate).toLocaleDateString()}
              </>
            ) : (
              <span className="text-gray-400">No dates set</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
