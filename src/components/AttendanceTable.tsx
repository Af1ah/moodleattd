'use client';

import { useState, useMemo } from 'react';
import { AttendanceTableData, AttendanceStatus } from '@/types/moodle';
import FilterModal from './FilterModal';

interface AttendanceTableProps {
  data: AttendanceTableData;
}

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

export default function AttendanceTable({ data }: AttendanceTableProps) {
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

  // Filter session dates based on selected courses
  const filteredSessionDates = useMemo(() => {
    return sessionDates.map(dateGroup => ({
      ...dateGroup,
      sessions: dateGroup.sessions.filter(session => 
        selectedCourses.has(session.sessionName)
      ),
    })).filter(dateGroup => dateGroup.sessions.length > 0);
  }, [sessionDates, selectedCourses]);

  // Assign colors to courses
  const courseColorMap = useMemo(() => {
    const map = new Map<string, string>();
    allCourses.forEach((course, index) => {
      map.set(course, courseColors[index % courseColors.length]);
    });
    return map;
  }, [allCourses]);

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
        <button
          onClick={() => setShowFilters(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-md hover:shadow-lg active:scale-98 transform"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-medium">Filter by Course</span>
          {selectedCourses.size < allCourses.length && (
            <span className="ml-1 px-2.5 py-0.5 bg-white text-blue-600 rounded-full text-xs font-bold">
              {selectedCourses.size}/{allCourses.length}
            </span>
          )}
        </button>
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
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {/* Date Row */}
            <tr>
              <th 
                rowSpan={2}
                className="sticky left-0 z-20 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-300"
              >
                Student Name
              </th>
              {filteredSessionDates.map((dateGroup, dateIndex) => (
                <th
                  key={dateIndex}
                  colSpan={dateGroup.sessions.length}
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
                rowSpan={2}
                className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-50"
              >
                Total P
              </th>
              <th
                rowSpan={2}
                className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-50"
              >
                Total A
              </th>
              <th
                rowSpan={2}
                className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-50"
              >
                Total L
              </th>
              <th
                rowSpan={2}
                className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-50"
              >
                Total E
              </th>
              <th
                rowSpan={2}
                className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-50"
              >
                Total
              </th>
            </tr>
            {/* Session Details Row */}
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
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student, studentIndex) => {
              return (
                <tr key={studentIndex} className="hover:bg-blue-50">
                  <td className="sticky left-0 z-10 px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-white border-r border-gray-300">
                    {student.studentName}
                  </td>
                  {filteredSessionDates.map((dateGroup, dateIndex) => {
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
                    {student.totalPresent}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-medium text-red-600 bg-blue-50">
                    {student.totalAbsent}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-medium text-yellow-600 bg-blue-50">
                    {student.totalLate}
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
            {Object.entries(statusLabels).map(([status, label]) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded font-semibold ${statusColors[status as AttendanceStatus]}`}>
                  {status}
                </span>
                <span className="text-gray-700">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
