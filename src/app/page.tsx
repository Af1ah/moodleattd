'use client';

import { useState, useEffect } from 'react';
import MoodleAPIService from '@/services/moodleAPI';
import { MoodleReport, AttendanceTableData } from '@/types/moodle';
import { 
  transformReportToAttendance, 
  exportToCSV, 
  downloadCSV 
} from '@/utils/attendanceTransform';
import ReportSelector from '@/components/ReportSelector';
import AttendanceTable from '@/components/AttendanceTable';

export default function Home() {
  const [wstoken, setWstoken] = useState<string>('');
  const [reports, setReports] = useState<MoodleReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceTableData | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load token from environment variable on mount
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MOODLE_TOKEN;
    if (token) {
      setWstoken(token);
    } else {
      setError('Moodle token not found. Please configure NEXT_PUBLIC_MOODLE_TOKEN in .env.local');
    }
  }, []);

  const fetchReports = async () => {
    setIsLoadingReports(true);
    setError(null);
    try {
      const apiService = new MoodleAPIService(wstoken);
      const response = await apiService.listReports();
      setReports(response.reports || []);
    } catch (err) {
      setError(`Failed to fetch reports: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setReports([]);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Fetch reports when token is loaded
  useEffect(() => {
    if (wstoken) {
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wstoken]);

  const handleSelectReport = async (reportId: number) => {
    setSelectedReportId(reportId);
    setIsLoadingReport(true);
    setError(null);
    setAttendanceData(null);

    try {
      const apiService = new MoodleAPIService(wstoken);
      // Use retrieveCompleteReport to fetch ALL pages of data
      const reportData = await apiService.retrieveCompleteReport(reportId);
      const transformedData = transformReportToAttendance(reportData);
      setAttendanceData(transformedData);
    } catch (err) {
      setError(`Failed to fetch report data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setAttendanceData(null);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleDownloadCSV = () => {
    if (attendanceData) {
      const csv = exportToCSV(attendanceData);
      const selectedReport = reports.find(r => r.id === selectedReportId);
      const filename = `${selectedReport?.name || 'attendance_report'}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csv, filename);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Moodle Attendance Report Generator
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Generate structured attendance reports from your Moodle courses
          </p>
          {wstoken && (
            <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Token loaded from environment
            </div>
          )}
        </div>

        {/* Report Selector */}
        {wstoken && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <ReportSelector
              reports={reports}
              selectedReportId={selectedReportId}
              onSelectReport={handleSelectReport}
              isLoading={isLoadingReports}
            />
            {isLoadingReports && (
              <div className="mt-4 text-center text-gray-500">
                Loading reports...
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-medium text-red-800 dark:text-red-300">Error</h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoadingReport && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading attendance data...</p>
          </div>
        )}

        {/* Attendance Table */}
        {attendanceData && !isLoadingReport && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Attendance Report
              </h2>
              <button
                onClick={handleDownloadCSV}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download CSV
              </button>
            </div>
            <AttendanceTable data={attendanceData} />
          </div>
        )}

        {/* Instructions */}
        {!wstoken && !error && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Configuration Required
            </h3>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
              <p>Loading Moodle token from environment...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
