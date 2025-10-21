'use client';

import { useState, useMemo, useCallback } from 'react';
import { AttendanceTableData, AttendanceStatus, MoodleSettings } from '@/types/moodle';
import FilterModal, { DateRange } from './FilterModal';
import SettingsModal from './SettingsModalNew';

interface AttendanceTableProps {
  data: AttendanceTableData;
  baseUrl?: string;
  reportHeaders?: string[];
  onSettingsChange?: (settings: MoodleSettings) => void;
}

// Helper function to get current week range
const getCurrentWeekRange = (): DateRange => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    option: 'week',
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0],
  };
};

const statusColors: Record<AttendanceStatus, string> = {
  'P': 'bg-green-100 text-green-800',
  'A': 'bg-red-100 text-red-800',
  'L': 'bg-yellow-100 text-yellow-800',
  'E': 'bg-blue-100 text-blue-800',
  '-': 'bg-gray-100 text-gray-600',
};

const statusLabels: Record<AttendanceStatus, string> = {
  'P': 'Present',
  'A': 'Absent',
  'L': 'Late',
  'E': 'Excused',
  '-': 'N/A',
};

// Colors for different courses
const courseColors = [
  'bg-blue-50',
  'bg-green-50',
  'bg-purple-50',
  'bg-orange-50',
  'bg-pink-50',
  'bg-indigo-50',
];

export default function AttendanceTable({ data, baseUrl, reportHeaders = [], onSettingsChange }: AttendanceTableProps) {
  const { students, sessionDates } = data;
  
  // Extract all unique course names
  const allCourses = useMemo(() => {
    const coursesSet = new Set<string>();
    sessionDates.forEach(dateGroup => {
      dateGroup.sessions.forEach(session => {
        coursesSet.add(session.sessionName);
      });
    });
    return Array.from(coursesSet).sort();
  }, [sessionDates]);

  // State for course filters (all checked by default)
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(
    new Set(allCourses)
  );
  
  // State for showing filter panel
  const [showFilters, setShowFilters] = useState(false);

  // State for showing settings modal
  const [showSettings, setShowSettings] = useState(false);

  // State for session-based tracking
  const [sessionBasedTracking, setSessionBasedTracking] = useState(false);

  // State for date range filter (default to current week)
  const [dateRange, setDateRange] = useState<DateRange>(getCurrentWeekRange());

 
  // Toggle course filter
  const toggleCourse = (course: string) => {
    const newSelected = new Set(selectedCourses);
    if (newSelected.has(course)) {
      newSelected.delete(course);
    } else {
      newSelected.add(course);
    }
    setSelectedCourses(newSelected);
  };

  // Toggle all courses
  const toggleAll = () => {
    if (selectedCourses.size === allCourses.length) {
      setSelectedCourses(new Set());
    } else {
      setSelectedCourses(new Set(allCourses));
    }
  };

  // Filter session dates based on selected courses and date range
  const filteredSessionDates = useMemo(() => {
    return sessionDates
      .filter(dateGroup => {
        // Filter by date range
        const groupDate = new Date(dateGroup.date);
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        
        // Normalize dates to midnight for comparison
        groupDate.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        
        return groupDate >= startDate && groupDate <= endDate;
      })
      .map(dateGroup => ({
        ...dateGroup,
        sessions: dateGroup.sessions.filter(session => 
          selectedCourses.has(session.sessionName)
        ),
      }))
      .filter(dateGroup => dateGroup.sessions.length > 0);
  }, [sessionDates, selectedCourses, dateRange]);

  // Assign colors to courses
  const courseColorMap = useMemo(() => {
    const map = new Map<string, string>();
    allCourses.forEach((course, index) => {
      map.set(course, courseColors[index % courseColors.length]);
    });
    return map;
  }, [allCourses]);

  // Calculate day-based attendance when session-based tracking is enabled
  const calculateDayAttendance = useCallback((dateGroup: typeof sessionDates[0], studentSessions: Record<string, AttendanceStatus>) => {
    const sessions = dateGroup.sessions;
    if (sessions.length === 0) return '-';
    
    // Split sessions into morning (before 12:30 PM) and afternoon (after 12:30 PM)
    const morningSessions = sessions.filter(s => {
      const hour = parseInt(s.time.split(':')[0]);
      const isPM = s.time.toLowerCase().includes('pm');
      const hour24 = isPM && hour !== 12 ? hour + 12 : hour;
      return hour24 < 12.5; // Before 12:30 PM
    });
    
    const afternoonSessions = sessions.filter(s => {
      const hour = parseInt(s.time.split(':')[0]);
      const isPM = s.time.toLowerCase().includes('pm');
      const hour24 = isPM && hour !== 12 ? hour + 12 : hour;
      return hour24 >= 12.5; // After or at 12:30 PM
    });
    
    // Count absences in morning and afternoon
    const morningAbsences = morningSessions.filter(s => {
      const status = studentSessions[s.sessionId];
      return status === 'A' || status === '-';
    }).length;
    
    const afternoonAbsences = afternoonSessions.filter(s => {
      const status = studentSessions[s.sessionId];
      return status === 'A' || status === '-';
    }).length;
    
    // Apply the rules:
    // - Absent in any morning session = half day (0.5)
    // - Absent in any afternoon session + present all morning = half day (0.5)
    // - Missed one from morning AND one from afternoon = absent (0)
    // - Present in all = full day (1)
    
    if (morningAbsences > 0 && afternoonAbsences > 0) {
      return 0; // Absent (missed from both periods)
    } else if (morningAbsences > 0 || afternoonAbsences > 0) {
      return 0.5; // Half day
    } else {
      return 1; // Full day present
    }
  }, []);

  // Calculate student totals for session-based tracking
  const studentsWithSessionTracking = useMemo(() => {
    if (!sessionBasedTracking) return students;
    
    return students.map(student => {
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalHalfDay = 0;
      
      filteredSessionDates.forEach(dateGroup => {
        const dayAttendance = calculateDayAttendance(dateGroup, student.sessions);
        if (dayAttendance === 1) {
          totalPresent += 1;
        } else if (dayAttendance === 0.5) {
          totalHalfDay += 1;
        } else if (dayAttendance === 0) {
          totalAbsent += 1;
        }
      });
      
      return {
        ...student,
        totalPresent,
        totalAbsent,
        totalHalfDay,
        totalSessions: filteredSessionDates.length,
      };
    });
  }, [students, sessionBasedTracking, filteredSessionDates, calculateDayAttendance]);

  if (students.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No attendance data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Button */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-md hover:shadow-lg active:scale-98 transform"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="font-medium">Filters</span>
              {selectedCourses.size < allCourses.length && (
                <span className="ml-1 px-2.5 py-0.5 bg-white text-blue-600 rounded-full text-xs font-bold">
                  {selectedCourses.size}/{allCourses.length}
                </span>
              )}
            </button>
            
            {baseUrl && (
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 active:bg-gray-800 transition-colors shadow-md hover:shadow-lg"
                title="Settings - Configure field mappings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Date Range Display */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">
              {dateRange.option === 'week' && 'Current Week: '}
              {dateRange.option === 'month' && 'Current Month: '}
              {dateRange.option === 'custom' && 'Custom Range: '}
              <span className="text-gray-900">
                {new Date(dateRange.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' - '}
                {new Date(dateRange.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        allCourses={allCourses}
        selectedCourses={selectedCourses}
        onToggleCourse={toggleCourse}
        onToggleAll={toggleAll}
        courseColorMap={courseColorMap}
        sessionBasedTracking={sessionBasedTracking}
        onToggleSessionTracking={setSessionBasedTracking}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Settings Modal */}
      {baseUrl && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          baseUrl={baseUrl}
          reportHeaders={reportHeaders}
          onSettingsChange={(settings) => {
            if (onSettingsChange) {
              onSettingsChange(settings);
            }
          }}
        />
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {/* Date Row */}
            <tr>
              <th 
                rowSpan={sessionBasedTracking ? 1 : 2}
                className="sticky left-0 z-20 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-300"
              >
                Student Name
              </th>
              {filteredSessionDates.map((dateGroup, dateIndex) => (
                <th
                  key={dateIndex}
                  colSpan={sessionBasedTracking ? 1 : dateGroup.sessions.length}
                  className="px-3 py-2 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-300"
                >
                  {new Date(dateGroup.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </th>
              ))}
              <th
                rowSpan={sessionBasedTracking ? 1 : 2}
                className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-50"
              >
                Total P
              </th>
              <th
                rowSpan={sessionBasedTracking ? 1 : 2}
                className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-50"
              >
                Total A
              </th>
              <th
                rowSpan={sessionBasedTracking ? 1 : 2}
                className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-50"
              >
                {sessionBasedTracking ? 'Half Days' : 'Total L'}
              </th>
              <th
                rowSpan={sessionBasedTracking ? 1 : 2}
                className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-50"
              >
                Total E
              </th>
              <th
                rowSpan={sessionBasedTracking ? 1 : 2}
                className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-50"
              >
                Total
              </th>
            </tr>
            {/* Session Details Row - Hide when session-based tracking is enabled */}
            {!sessionBasedTracking && (
              <tr>
                {filteredSessionDates.map((dateGroup, dateIndex) =>
                  dateGroup.sessions.map((session, sessionIndex) => (
                    <th
                      key={`${dateIndex}-${sessionIndex}`}
                      className={`px-2 py-2 text-center text-xs font-medium text-gray-700 border-r border-gray-200 ${
                        courseColorMap.get(session.sessionName)
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold">{session.time}</span>
                        <span className="text-[10px] mt-0.5 truncate max-w-[80px]" title={session.sessionName}>
                          {session.sessionName}
                        </span>
                      </div>
                    </th>
                  ))
                )}
              </tr>
            )}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {studentsWithSessionTracking.map((student, studentIndex) => {
              return (
                <tr key={studentIndex} className="hover:bg-blue-50">
                  <td className="sticky left-0 z-10 px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-white border-r border-gray-300">
                    {student.studentName}
                  </td>
                  {filteredSessionDates.map((dateGroup, dateIndex) => {
                    // If session-based tracking is enabled, show day attendance
                    if (sessionBasedTracking) {
                      const dayAttendance = calculateDayAttendance(dateGroup, student.sessions);
                      const displayValue = dayAttendance === 0 ? 'A' : dayAttendance === 0.5 ? 'H' : dayAttendance === 1 ? 'P' : '-';
                      const bgColor = dayAttendance === 1 ? 'bg-green-100 text-green-800' : 
                                     dayAttendance === 0.5 ? 'bg-yellow-100 text-yellow-800' : 
                                     dayAttendance === 0 ? 'bg-red-100 text-red-800' : 
                                     'bg-gray-100 text-gray-600';
                      
                      return (
                        <td
                          key={dateIndex}
                          colSpan={dateGroup.sessions.length}
                          className="px-2 py-4 whitespace-nowrap text-center border-r border-gray-200"
                        >
                          <span
                            className={`inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded ${bgColor}`}
                            title={`${displayValue === 'P' ? 'Full Day Present' : displayValue === 'H' ? 'Half Day (0.5)' : displayValue === 'A' ? 'Absent' : 'N/A'} - ${dateGroup.date}`}
                          >
                            {displayValue === 'H' ? '0.5' : displayValue}
                          </span>
                        </td>
                      );
                    }
                    
                    // Otherwise show individual sessions
                    return dateGroup.sessions.map((session, sessionIndex) => {
                      const status = student.sessions[session.sessionId] || '-';
                      return (
                        <td
                          key={`${dateIndex}-${sessionIndex}`}
                          className={`px-2 py-4 whitespace-nowrap text-center border-r border-gray-200 ${
                            courseColorMap.get(session.sessionName)
                          }`}
                        >
                          <span
                            className={`inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded ${statusColors[status]}`}
                            title={`${statusLabels[status]} - ${session.sessionName} at ${session.time}`}
                          >
                            {status}
                          </span>
                        </td>
                      );
                    });
                  })}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-medium text-green-600 bg-blue-50">
                    {sessionBasedTracking ? student.totalPresent : student.totalPresent}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-medium text-red-600 bg-blue-50">
                    {sessionBasedTracking ? student.totalAbsent : student.totalAbsent}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-medium text-yellow-600 bg-blue-50">
                    {sessionBasedTracking && 'totalHalfDay' in student ? (student as typeof student & {totalHalfDay: number}).totalHalfDay : student.totalLate}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-medium text-blue-600 bg-blue-50">
                    {student.totalExcused}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900 bg-blue-50">
                    {student.totalSessions}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* Legend */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="text-gray-700 font-medium">Legend:</span>
            {sessionBasedTracking ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded font-semibold bg-green-100 text-green-800">
                    P
                  </span>
                  <span className="text-gray-700">Full Day Present (1)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded font-semibold bg-yellow-100 text-yellow-800">
                    0.5
                  </span>
                  <span className="text-gray-700">Half Day (0.5)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded font-semibold bg-red-100 text-red-800">
                    A
                  </span>
                  <span className="text-gray-700">Absent (0)</span>
                </div>
              </>
            ) : (
              <>
                {Object.entries(statusLabels).map(([status, label]) => (
                  <div key={status} className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded font-semibold ${statusColors[status as AttendanceStatus]}`}>
                      {status}
                    </span>
                    <span className="text-gray-700">{label}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
