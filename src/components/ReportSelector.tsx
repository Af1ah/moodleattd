'use client';

import { MoodleReport } from '@/types/moodle';

interface ReportSelectorProps {
  reports: MoodleReport[];
  selectedReportId: number | null;
  onSelectReport: (reportId: number) => void;
  isLoading?: boolean;
}

export default function ReportSelector({
  reports,
  selectedReportId,
  onSelectReport,
  isLoading = false,
}: ReportSelectorProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="report-select"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Select Attendance Report
      </label>
      <select
        id="report-select"
        value={selectedReportId || ''}
        onChange={(e) => onSelectReport(Number(e.target.value))}
        disabled={isLoading || reports.length === 0}
        className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
      >
        <option value="">-- Select a report --</option>
        {reports.map((report) => (
          <option key={report.id} value={report.id}>
            {report.name}
          </option>
        ))}
      </select>
      {reports.length === 0 && !isLoading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No reports available
        </p>
      )}
    </div>
  );
}
