'use client';

import { AttendanceTableData, AttendanceStatus } from '@/types/moodle';

interface AttendanceTableProps {
  data: AttendanceTableData;
}

const statusColors: Record<AttendanceStatus, string> = {
  'P': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'A': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'L': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'E': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  '-': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const statusLabels: Record<AttendanceStatus, string> = {
  'P': 'Present',
  'A': 'Absent',
  'L': 'Late',
  'E': 'Excused',
  '-': 'N/A',
};

export default function AttendanceTable({ data }: AttendanceTableProps) {
  const { students, sessionDates } = data;

  if (students.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No attendance data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="sticky left-0 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">
              Student Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Course
            </th>
            {sessionDates.map((session, index) => (
              <th
                key={index}
                className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {session.date}
              </th>
            ))}
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-gray-700">
              Total P
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-gray-700">
              Total A
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-gray-700">
              Total L
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-gray-700">
              Total E
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-gray-700">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {students.map((student, studentIndex) => (
            <tr key={studentIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              <td className="sticky left-0 z-10 px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900">
                {student.studentName}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                {student.courseName}
              </td>
              {sessionDates.map((session, sessionIndex) => {
                const status = student.sessions[session.date] || '-';
                return (
                  <td
                    key={sessionIndex}
                    className="px-3 py-4 whitespace-nowrap text-center"
                  >
                    <span
                      className={`inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded ${statusColors[status]}`}
                      title={statusLabels[status]}
                    >
                      {status}
                    </span>
                  </td>
                );
              })}
              <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-medium text-green-600 dark:text-green-400 bg-gray-50 dark:bg-gray-800">
                {student.totalPresent}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-medium text-red-600 dark:text-red-400 bg-gray-50 dark:bg-gray-800">
                {student.totalAbsent}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-medium text-yellow-600 dark:text-yellow-400 bg-gray-50 dark:bg-gray-800">
                {student.totalLate}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-medium text-blue-600 dark:text-blue-400 bg-gray-50 dark:bg-gray-800">
                {student.totalExcused}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800">
                {student.totalSessions}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Legend */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Legend:</span>
          {Object.entries(statusLabels).map(([status, label]) => (
            <div key={status} className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded font-semibold ${statusColors[status as AttendanceStatus]}`}>
                {status}
              </span>
              <span className="text-gray-600 dark:text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
