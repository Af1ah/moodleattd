'use client';

import { useEffect, useState } from 'react';

export type DateRangeOption = 'week' | 'month' | 'custom';

export interface DateRange {
  option: DateRangeOption;
  startDate: string;
  endDate: string;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  allCourses: string[];
  selectedCourses: Set<string>;
  onToggleCourse: (course: string) => void;
  onToggleAll: () => void;
  courseColorMap: Map<string, string>;
  sessionBasedTracking: boolean;
  onToggleSessionTracking: (enabled: boolean) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export default function FilterModal({
  isOpen,
  onClose,
  allCourses,
  selectedCourses,
  onToggleCourse,
  onToggleAll,
  courseColorMap,
  sessionBasedTracking,
  onToggleSessionTracking,
  dateRange,
  onDateRangeChange,
}: FilterModalProps) {
  const [localDateRange, setLocalDateRange] = useState<DateRange>(dateRange);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalDateRange(dateRange);
  }, [dateRange]);

  const handleDateRangeOptionChange = (option: DateRangeOption) => {
    const today = new Date();
    let startDate = '';
    let endDate = '';

    if (option === 'week') {
      // Get current week (Monday to Sunday)
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday
      const monday = new Date(today.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      startDate = monday.toISOString().split('T')[0];
      endDate = sunday.toISOString().split('T')[0];
    } else if (option === 'month') {
      // Get current month
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      startDate = firstDay.toISOString().split('T')[0];
      endDate = lastDay.toISOString().split('T')[0];
    } else {
      // Custom - keep existing or use current week as default
      startDate = localDateRange.startDate || new Date().toISOString().split('T')[0];
      endDate = localDateRange.endDate || new Date().toISOString().split('T')[0];
    }

    const newRange: DateRange = { option, startDate, endDate };
    setLocalDateRange(newRange);
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newRange: DateRange = {
      ...localDateRange,
      option: 'custom',
      [field]: value,
    };
    setLocalDateRange(newRange);
  };

  const applyFilters = () => {
    onDateRangeChange(localDateRange);
    onClose();
  };
  
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-200"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />
      
      {/* Modal */}
      <div 
        className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50"
        style={{ animation: 'slideUp 0.25s ease-out' }}
      >
        <div 
          className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-lg sm:mx-4 max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Filters
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedCourses.size} of {allCourses.length} courses
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 modal-scroll">
            {/* Date Range Filter */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-800">
                  Date Range
                </h4>
              </div>
              
              {/* Date Range Options - Compact Pills */}
              <div className="flex gap-2 mb-3 flex-wrap">
                <button
                  onClick={() => handleDateRangeOptionChange('week')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    localDateRange.option === 'week'
                      ? 'bg-white text-gray-900 shadow-md ring-2 ring-blue-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => handleDateRangeOptionChange('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    localDateRange.option === 'month'
                      ? 'bg-white text-gray-900 shadow-md ring-2 ring-blue-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => handleDateRangeOptionChange('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    localDateRange.option === 'custom'
                      ? 'bg-white text-gray-900 shadow-md ring-2 ring-blue-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Custom
                </button>
              </div>
              
              {/* Custom Date Inputs */}
              {localDateRange.option === 'custom' && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                    <input
                      type="date"
                      value={localDateRange.startDate}
                      onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                    <input
                      type="date"
                      value={localDateRange.endDate}
                      onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Current Selection Display */}
              {localDateRange.startDate && localDateRange.endDate && (
                <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  {new Date(localDateRange.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' - '}
                  {new Date(localDateRange.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>

            {/* Session-Based Tracking Toggle */}
            <div className="mb-5 pb-5 border-b border-gray-200">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="text-sm font-semibold text-gray-800">
                    Session-Based Tracking
                  </h4>
                </div>
                
                {/* Compact Toggle Chip */}
                <button
                  onClick={() => onToggleSessionTracking(!sessionBasedTracking)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    sessionBasedTracking
                      ? 'bg-white text-gray-900 shadow-md ring-2 ring-blue-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sessionBasedTracking ? 'On' : 'Off'}
                </button>
              </div>
              
              <p className="text-xs text-gray-600 mb-3">
                Enable half-day tracking (6 sessions per day)
              </p>
              
              {sessionBasedTracking && (
                <div className="text-xs text-gray-600 space-y-1 bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-800 mb-1.5">Rules:</p>
                  <p>• <span className="font-medium">0.5:</span> Absent morning or afternoon session</p>
                  <p>• <span className="font-medium">0:</span> Absent in both morning & afternoon</p>
                  <p>• <span className="font-medium">1:</span> Present all sessions</p>
                </div>
              )}
            </div>

            {/* Course Selection Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-800">
                  Courses
                </h4>
                <span className="text-xs text-gray-500">
                  ({selectedCourses.size}/{allCourses.length})
                </span>
              </div>
              
              <button
                onClick={onToggleAll}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
              >
                {selectedCourses.size === allCourses.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            {/* Course List - Compact Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allCourses.map(course => {
                const isSelected = selectedCourses.has(course);
                const courseColor = courseColorMap.get(course) || 'bg-gray-400';
                
                return (
                  <button
                    key={course}
                    onClick={() => onToggleCourse(course)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-white text-gray-900 shadow-md ring-2 ring-blue-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {/* Check Icon */}
                    <div className={`shrink-0 w-4 h-4 rounded-sm flex items-center justify-center ${
                      isSelected
                        ? 'bg-blue-500'
                        : 'bg-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    
                    <span className="flex-1 text-xs font-medium truncate">
                      {course}
                    </span>
                    
                    {/* Color Indicator */}
                    <div className={`shrink-0 w-3 h-3 rounded-full ${courseColor} ${
                      isSelected ? 'ring-2 ring-offset-1 ring-gray-300' : ''
                    }`}></div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <button
              onClick={applyFilters}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Add keyframe animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @media (min-width: 640px) {
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: scale(0.96);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        }
      `}</style>
    </>
  );
}
