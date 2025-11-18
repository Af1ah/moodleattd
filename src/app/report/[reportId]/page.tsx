'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MoodleAPIService from '@/services/moodleAPI';
import Navigation from '@/components/Navigation';
import { AttendanceTableData, MoodleSettings, RetrieveReportResponse } from '@/types/moodle';
import { 
  transformReportToAttendance, 
  exportToCSV, 
  downloadCSV 
} from '@/utils/attendanceTransform';
import AttendanceTable from '@/components/AttendanceTable';
import { settingsService } from '@/services/settingsService';
import { ProtectedRoute, useAuth } from '@/components/AuthProvider';

function ReportContent() {
  const router = useRouter();
  const params = useParams();
  const { logout } = useAuth();
  const reportId = Number(params.reportId);
  
  const [attendanceData, setAttendanceData] = useState<AttendanceTableData | null>(null);
  const [filteredAttendanceData, setFilteredAttendanceData] = useState<AttendanceTableData | null>(null);
  const [reportName, setReportName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [rawReportData, setRawReportData] = useState<RetrieveReportResponse | null>(null);
  const [reportHeaders, setReportHeaders] = useState<string[]>([]);

  // Transform data with smart mapping by default
  const transformData = useCallback((reportData: RetrieveReportResponse, url: string) => {
    try {
      // Always try smart mapping first
      console.log('🤖 Attempting smart header mapping...');
      const result = transformReportToAttendance(reportData);
      console.log('✅ Smart mapping successful!');
      return result;
    } catch (smartMappingError) {
      console.warn('⚠️ Smart mapping encountered an issue:', smartMappingError);
      console.log('🔄 Falling back to manual field mapping from settings...');
      
      try {
        // Fallback to settings-based mapping
        const settings = settingsService.getOrCreateSettings(url);
        const result = transformReportToAttendance(reportData, settings.fieldMapping);
        console.log('✅ Settings-based mapping successful!');
        return result;
      } catch (settingsError) {
        console.error('❌ Both smart and settings-based mapping failed:', settingsError);
        throw new Error(`Unable to process report data. Please configure field mappings manually in Moodle Settings. Error: ${settingsError instanceof Error ? settingsError.message : 'Unknown error'}`);
      }
    }
  }, []);

  // Handle settings change and re-transform data
  const handleSettingsChange = useCallback((settings: MoodleSettings) => {
    if (rawReportData) {
      try {
        const transformedData = transformReportToAttendance(rawReportData, settings.fieldMapping);
        setAttendanceData(transformedData);
      } catch (error) {
        console.error('Failed to transform with custom settings:', error);
        setError(error instanceof Error ? error.message : 'Failed to apply field mapping settings');
      }
    }
  }, [rawReportData]);

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('moodleToken');
        const moodleBaseUrl = process.env.NEXT_PUBLIC_MOODLE_BASE_URL;
        
        if (!token) {
          throw new Error('No authentication token found');
        }
        if (!moodleBaseUrl) {
          throw new Error('Moodle base URL not configured');
        }

        setBaseUrl(moodleBaseUrl);
        const apiService = new MoodleAPIService(token);
        
        // Fetch report details
        const reportsResponse = await apiService.listReports();
        const report = reportsResponse.reports?.find(r => r.id === reportId);
        if (report) {
          setReportName(report.name);
        }

        // Fetch complete report data
        const reportData = await apiService.retrieveCompleteReport(reportId);
        setRawReportData(reportData);
        
        // Store report headers for settings modal
        if (reportData.data.headers && reportData.data.headers.length > 0) {
          setReportHeaders(reportData.data.headers);
        }
        
        // Transform with current settings
        const transformedData = transformData(reportData, moodleBaseUrl);
        setAttendanceData(transformedData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load report';
        console.error('Report loading error:', err);
        
        // Provide helpful error messages
        if (errorMessage.includes('Unable to process data')) {
          setError('The report structure is not compatible with attendance processing. Please check the Moodle Settings to configure field mappings manually.');
        } else if (errorMessage.includes('timeout') || errorMessage.includes('took too long')) {
          setError('The Moodle server is taking too long to respond. This report may be too large. Try again or contact your administrator.');
        } else if (errorMessage.includes('Cloudflare') || errorMessage.includes('52')) {
          setError('The Moodle server is temporarily unavailable. Please try again in a few moments.');
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (reportId) {
      fetchReport();
    }
  }, [reportId, transformData]);

  const handleDownloadCSV = () => {
    // Use filtered data if available, otherwise use original data
    const dataToExport = filteredAttendanceData || attendanceData;
    if (dataToExport) {
      const csv = exportToCSV(dataToExport);
      const filename = `${reportName || 'attendance_report'}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csv, filename);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50">
      <Navigation title={reportName || 'Attendance Report'} showBackButton={true} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="mt-6 text-gray-600 font-medium">Loading attendance data...</p>
            <p className="mt-2 text-sm text-gray-500">This may take up to a minute for large reports</p>
            <div className="mt-4 max-w-md">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-800">
                  💡 <strong>Tip:</strong> We&apos;re fetching data in small batches to ensure reliability. 
                  The server is working on your request...
                </p>
              </div>
            </div>
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
          <AttendanceTable 
            data={attendanceData} 
            baseUrl={baseUrl}
            reportHeaders={reportHeaders}
            onSettingsChange={handleSettingsChange}
            onFilteredDataChange={setFilteredAttendanceData}
          />
        )}
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <ProtectedRoute>
      <ReportContent />
    </ProtectedRoute>
  );
}
