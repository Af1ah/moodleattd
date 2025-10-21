'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MoodleAPIService from '@/services/moodleAPI';
import { AttendanceTableData } from '@/types/moodle';
import { 
  transformReportToAttendance, 
  exportToCSV, 
  downloadCSV 
} from '@/utils/attendanceTransform';
import AttendanceTable from '@/components/AttendanceTable';

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = Number(params.reportId);
  
  const [attendanceData, setAttendanceData] = useState<AttendanceTableData | null>(null);
  const [reportName, setReportName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = process.env.NEXT_PUBLIC_MOODLE_TOKEN;
        if (!token) {
          throw new Error('Moodle token not configured');
        }

        const apiService = new MoodleAPIService(token);
        
        // Fetch report details
        const reportsResponse = await apiService.listReports();
        const report = reportsResponse.reports?.find(r => r.id === reportId);
        if (report) {
          setReportName(report.name);
        }

        // Fetch complete report data
        const reportData = await apiService.retrieveCompleteReport(reportId);
        const transformedData = transformReportToAttendance(reportData);
        setAttendanceData(transformedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setIsLoading(false);
      }
    };

    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const handleDownloadCSV = () => {
    if (attendanceData) {
      const csv = exportToCSV(attendanceData);
      const filename = `${reportName || 'attendance_report'}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csv, filename);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Back to reports"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {reportName || 'Attendance Report'}
                </h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  Detailed attendance view
                </p>
              </div>
            </div>
            
            {attendanceData && (
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all active:scale-98 transform"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Download CSV</span>
                <span className="sm:hidden">CSV</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="mt-6 text-gray-600 font-medium">Loading attendance data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 text-lg">Unable to Load Report</h3>
                  <p className="text-red-700 mt-2">{error}</p>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Retry
                    </button>
                    <button
                      onClick={handleBack}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
                    >
                      Back to Reports
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Table */}
        {attendanceData && !isLoading && (
          <AttendanceTable data={attendanceData} />
        )}
      </main>
    </div>
  );
}
