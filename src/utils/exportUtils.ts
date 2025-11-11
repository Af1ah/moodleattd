import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceTableData, AttendanceStatus } from '@/types/moodle';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

interface ExportOptions {
  data: AttendanceTableData;
  format: ExportFormat;
  courseName?: string;
  sessionBasedTracking?: boolean;
}

interface ExportError {
  message: string;
  type: 'validation' | 'generation' | 'download';
}

// Helper to get status label
const getStatusLabel = (status: AttendanceStatus): string => {
  const labels: Record<AttendanceStatus, string> = {
    'P': 'Present',
    'A': 'Absent',
    'L': 'Late',
    'E': 'Excused',
    '-': 'N/A',
  };
  return labels[status] || status;
};

// Validate data before export
const validateExportData = (data: AttendanceTableData): ExportError | null => {
  if (!data) {
    return { message: 'No data provided for export', type: 'validation' };
  }

  if (!data.students || data.students.length === 0) {
    return { message: 'No student data available to export', type: 'validation' };
  }

  if (!data.sessionDates || data.sessionDates.length === 0) {
    return { message: 'No session dates available to export', type: 'validation' };
  }

  return null;
};

// Generate filename with timestamp
const generateFileName = (format: ExportFormat, courseName?: string): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  const course = courseName ? `${courseName.replace(/[^a-z0-9]/gi, '_')}_` : '';
  return `${course}attendance_${timestamp}.${format === 'excel' ? 'xlsx' : format}`;
};

// Helper function to prepare table data (optimized for performance)
const prepareTableData = (data: AttendanceTableData, sessionBasedTracking: boolean) => {
  const { students, sessionDates } = data;
  
  // Prepare header rows
  const dateHeaders: string[] = ['Student Name'];
  const sessionHeaders: string[] = [''];
  
  // Optimize date formatting by caching
  const dateCache = new Map<string, string>();
  
  sessionDates.forEach(dateGroup => {
    let dateStr = dateCache.get(dateGroup.date);
    if (!dateStr) {
      dateStr = new Date(dateGroup.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      dateCache.set(dateGroup.date, dateStr);
    }
    
    if (sessionBasedTracking) {
      dateHeaders.push(dateStr);
    } else {
      dateGroup.sessions.forEach(session => {
        dateHeaders.push(dateStr);
        // Truncate long session names to prevent overflow
        const sessionName = session.sessionName.length > 30 
          ? session.sessionName.substring(0, 27) + '...'
          : session.sessionName;
        sessionHeaders.push(`${session.time} - ${sessionName}`);
      });
    }
  });
  
  // Add summary columns
  dateHeaders.push('Total Present', 'Total Absent');
  
  if (sessionBasedTracking) {
    dateHeaders.push('Total Half Day');
  } else {
    dateHeaders.push('Total Late', 'Total Excused');
  }
  
  dateHeaders.push('Total Sessions', 'Attendance %');
  
  if (!sessionBasedTracking) {
    sessionHeaders.push('', '', '', '', '', '');
  }
  
  // Prepare data rows with batching for large datasets
  const batchSize = 100;
  const dataRows: string[][] = [];
  
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize);
    
    batch.forEach(student => {
      const row: string[] = [student.studentName];
      
      sessionDates.forEach(dateGroup => {
        if (sessionBasedTracking) {
          // Session-based: calculate day attendance
          const sessions = dateGroup.sessions;
          const statuses = sessions.map(s => student.sessions[s.sessionId]);
          
          const hasAnyPresent = statuses.some(s => s === 'P');
          const hasAnyAbsent = statuses.some(s => s === 'A' || s === '-');
          
          if (!hasAnyAbsent) {
            row.push('1'); // Full day
          } else if (hasAnyPresent && hasAnyAbsent) {
            row.push('0.5'); // Half day
          } else {
            row.push('0'); // Absent
          }
        } else {
          // Regular tracking: show individual sessions
          dateGroup.sessions.forEach(session => {
            const status = student.sessions[session.sessionId];
            row.push(status ? getStatusLabel(status) : 'N/A');
          });
        }
      });
      
      // Add summary data
      const totalSessions = student.totalSessions || 0;
      const attendancePercentage = totalSessions > 0
        ? Math.round((student.totalPresent / totalSessions) * 100)
        : 0;
      
      row.push(
        student.totalPresent.toString(),
        student.totalAbsent.toString()
      );
      
      if (sessionBasedTracking) {
        const totalHalfDay = (student as { totalHalfDay?: number }).totalHalfDay;
        row.push(totalHalfDay?.toString() || '0');
      } else {
        row.push(
          student.totalLate.toString(),
          student.totalExcused.toString()
        );
      }
      
      row.push(
        totalSessions.toString(),
        `${attendancePercentage}%`
      );
      
      dataRows.push(row);
    });
  }
  
  return { dateHeaders, sessionHeaders, dataRows };
};

// Export to CSV
const exportToCSV = (data: AttendanceTableData, fileName: string, sessionBasedTracking: boolean): void => {
  try {
    const { dateHeaders, sessionHeaders, dataRows } = prepareTableData(data, sessionBasedTracking);
    
    // Combine headers and data
    const csvData = [
      dateHeaders,
      ...(sessionBasedTracking ? [] : [sessionHeaders]),
      ...dataRows
    ];
    
    // Convert to CSV string
    const csvContent = csvData
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(`Failed to generate CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Export to Excel
const exportToExcel = (data: AttendanceTableData, fileName: string, sessionBasedTracking: boolean): void => {
  try {
    const { dateHeaders, sessionHeaders, dataRows } = prepareTableData(data, sessionBasedTracking);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Prepare worksheet data
    const worksheetData = [
      dateHeaders,
      ...(sessionBasedTracking ? [] : [sessionHeaders]),
      ...dataRows
    ];
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    const colWidths = dateHeaders.map((_, index) => {
      if (index === 0) return { wch: 25 }; // Student name column
      return { wch: 15 }; // Other columns
    });
    worksheet['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    
    // Generate and download
    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    throw new Error(`Failed to generate Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Export to PDF (optimized for large datasets)
const exportToPDF = async (data: AttendanceTableData, fileName: string, sessionBasedTracking: boolean): Promise<void> => {
  try {
    const { dateHeaders, sessionHeaders, dataRows } = prepareTableData(data, sessionBasedTracking);
    
    // Limit columns for PDF to prevent freezing
    const MAX_COLUMNS = 20; // Reasonable limit for PDF width
    const totalDataColumns = dateHeaders.length - 1; // Exclude student name
    const summaryColumnsCount = sessionBasedTracking ? 5 : 6; // Summary columns
    const maxSessionColumns = MAX_COLUMNS - summaryColumnsCount;
    
    let limitedDateHeaders = dateHeaders;
    let limitedSessionHeaders = sessionHeaders;
    let limitedDataRows = dataRows;
    let isLimited = false;
    
    if (totalDataColumns > maxSessionColumns) {
      // Too many columns, limit them
      isLimited = true;
      const sessionColumnsToShow = Math.min(maxSessionColumns, totalDataColumns - summaryColumnsCount);
      
      limitedDateHeaders = [
        dateHeaders[0], // Student name
        ...dateHeaders.slice(1, sessionColumnsToShow + 1),
        ...dateHeaders.slice(-summaryColumnsCount) // Keep summary columns
      ];
      
      if (!sessionBasedTracking) {
        limitedSessionHeaders = [
          sessionHeaders[0],
          ...sessionHeaders.slice(1, sessionColumnsToShow + 1),
          ...sessionHeaders.slice(-summaryColumnsCount)
        ];
      }
      
      limitedDataRows = dataRows.map(row => [
        row[0], // Student name
        ...row.slice(1, sessionColumnsToShow + 1),
        ...row.slice(-summaryColumnsCount)
      ]);
    }
    
    // Create PDF document (landscape for better table fit)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true // Enable compression
    });
    
    // Add title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Report', 14, 15);
    
    // Add date and info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    
    if (isLimited) {
      doc.setFontSize(8);
      doc.setTextColor(255, 0, 0);
      doc.text(`Note: Showing limited columns for PDF. Total students: ${dataRows.length}, Total sessions: ${totalDataColumns}`, 14, 26);
      doc.setTextColor(0, 0, 0);
    }
    
    const headers = sessionBasedTracking
      ? [limitedDateHeaders]
      : [limitedDateHeaders, limitedSessionHeaders];
    
    // Calculate optimal font size based on columns
    const columnCount = limitedDateHeaders.length;
    const fontSize = columnCount > 15 ? 6 : columnCount > 10 ? 7 : 8;
    
    // Use setTimeout to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Generate table with optimized settings
    autoTable(doc, {
      startY: isLimited ? 30 : 28,
      head: headers,
      body: limitedDataRows,
      theme: 'grid',
      styles: {
        fontSize: fontSize,
        cellPadding: 1.5,
        overflow: 'linebreak',
        cellWidth: 'auto',
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        minCellHeight: 8,
      },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold', halign: 'left' }, // Student name
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      margin: { top: isLimited ? 30 : 28, left: 10, right: 10 },
      tableWidth: 'auto',
      // Performance optimization
      didDrawPage: () => {
        // Allow UI updates between pages
      }
    });
    
    // Use setTimeout to prevent UI freeze during save
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Save PDF
    doc.save(fileName);
  } catch (error) {
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Main export function
export const exportAttendanceData = async (options: ExportOptions): Promise<void> => {
  const { data, format, courseName, sessionBasedTracking = false } = options;
  
  try {
    // Validate data
    const validationError = validateExportData(data);
    if (validationError) {
      throw new Error(validationError.message);
    }
    
    // Generate filename
    const fileName = generateFileName(format, courseName);
    
    // Export based on format
    switch (format) {
      case 'csv':
        exportToCSV(data, fileName, sessionBasedTracking);
        break;
      case 'excel':
        exportToExcel(data, fileName, sessionBasedTracking);
        break;
      case 'pdf':
        // PDF export is async to prevent UI freezing
        await exportToPDF(data, fileName, sessionBasedTracking);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    console.log(`✅ Successfully exported ${format.toUpperCase()} file: ${fileName}`);
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};
