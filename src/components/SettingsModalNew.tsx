'use client';

import { useState, useEffect } from 'react';
import { MoodleSettings, FieldMapping } from '@/types/moodle';
import { settingsService } from '@/services/settingsService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseUrl: string;
  reportHeaders: string[]; // Column names from the report
  onSettingsChange: (settings: MoodleSettings) => void;
}

interface ColumnMapping {
  fieldName: string;
  fieldLabel: string;
  columnName: string;
  columnIndex: number;
}

const FIELD_LABELS: Record<keyof FieldMapping, string> = {
  courseNameIndex: 'Course Name',
  studentNameIndex: 'Student Name',
  dateTimeIndex: 'Date/Time',
  statusIndex: 'Status',
  gradeIndex: 'Grade',
  totalPresentIndex: 'Total Present',
  totalLateIndex: 'Total Late',
  totalExcusedIndex: 'Total Excused',
  totalAbsentIndex: 'Total Absent',
};

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  baseUrl,
  reportHeaders,
  onSettingsChange 
}: SettingsModalProps) {
  const [settings, setSettings] = useState<MoodleSettings>(
    settingsService.getOrCreateSettings(baseUrl)
  );
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);

  useEffect(() => {
    if (isOpen) {
      const currentSettings = settingsService.getOrCreateSettings(baseUrl);
      setSettings(currentSettings);
      
      // Create column mappings from settings
      const mappings: ColumnMapping[] = Object.entries(FIELD_LABELS).map(([fieldName, fieldLabel]) => {
        const index = currentSettings.fieldMapping[fieldName as keyof FieldMapping];
        return {
          fieldName,
          fieldLabel,
          columnName: reportHeaders[index] || `Column ${index}`,
          columnIndex: index,
        };
      });
      setColumnMappings(mappings);
    }
  }, [isOpen, baseUrl, reportHeaders]);

  const handleSave = () => {
    // Update settings with new mappings
    const newFieldMapping: FieldMapping = {} as FieldMapping;
    columnMappings.forEach(mapping => {
      newFieldMapping[mapping.fieldName as keyof FieldMapping] = mapping.columnIndex;
    });
    
    const updatedSettings = {
      ...settings,
      fieldMapping: newFieldMapping,
    };
    
    settingsService.saveSettings(updatedSettings);
    onSettingsChange(updatedSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = settingsService.resetToDefault(baseUrl);
    setSettings(defaultSettings);
    
    // Reset column mappings
    const mappings: ColumnMapping[] = Object.entries(FIELD_LABELS).map(([fieldName, fieldLabel]) => {
      const index = defaultSettings.fieldMapping[fieldName as keyof FieldMapping];
      return {
        fieldName,
        fieldLabel,
        columnName: reportHeaders[index] || `Column ${index}`,
        columnIndex: index,
      };
    });
    setColumnMappings(mappings);
  };

  const handleSwapFields = () => {
    setColumnMappings(prev => {
      const newMappings = [...prev];
      const courseIdx = newMappings.findIndex(m => m.fieldName === 'courseNameIndex');
      const studentIdx = newMappings.findIndex(m => m.fieldName === 'studentNameIndex');
      
      if (courseIdx !== -1 && studentIdx !== -1) {
        // Swap the column indices and names
        const temp = newMappings[courseIdx].columnIndex;
        const tempName = newMappings[courseIdx].columnName;
        
        newMappings[courseIdx].columnIndex = newMappings[studentIdx].columnIndex;
        newMappings[courseIdx].columnName = newMappings[studentIdx].columnName;
        
        newMappings[studentIdx].columnIndex = temp;
        newMappings[studentIdx].columnName = tempName;
      }
      
      return newMappings;
    });
    
    setSettings(prev => ({
      ...prev,
      swapFields: !prev.swapFields,
    }));
  };

  const handleDragStart = (fieldName: string) => {
    setDraggedItem(fieldName);
  };

  const handleDragOver = (e: React.DragEvent, fieldName: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== fieldName) {
      setColumnMappings(prev => {
        const newMappings = [...prev];
        const draggedIdx = newMappings.findIndex(m => m.fieldName === draggedItem);
        const targetIdx = newMappings.findIndex(m => m.fieldName === fieldName);
        
        if (draggedIdx !== -1 && targetIdx !== -1) {
          // Swap the column assignments
          const tempIndex = newMappings[draggedIdx].columnIndex;
          const tempName = newMappings[draggedIdx].columnName;
          
          newMappings[draggedIdx].columnIndex = newMappings[targetIdx].columnIndex;
          newMappings[draggedIdx].columnName = newMappings[targetIdx].columnName;
          
          newMappings[targetIdx].columnIndex = tempIndex;
          newMappings[targetIdx].columnName = tempName;
        }
        
        return newMappings;
      });
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDropdownChange = (fieldName: string, newColumnIndex: number) => {
    setColumnMappings(prev => {
      const newMappings = [...prev];
      const idx = newMappings.findIndex(m => m.fieldName === fieldName);
      
      if (idx !== -1) {
        newMappings[idx].columnIndex = newColumnIndex;
        newMappings[idx].columnName = reportHeaders[newColumnIndex] || `Column ${newColumnIndex}`;
      }
      
      return newMappings;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Moodle Settings</h2>
              <p className="text-xs text-gray-500 mt-0.5">Configure field mappings for your Moodle site</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Base URL Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Moodle Site URL
            </label>
            <p className="text-sm text-blue-700 font-mono break-all">{baseUrl}</p>
            <p className="text-xs text-blue-600 mt-2">
              Settings are saved per site URL and will persist across sessions
            </p>
          </div>

          {/* Quick Fix Section */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Fix
            </h3>
            
            <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Student names appearing as course names?
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Click this button to swap the course and student name fields
                </p>
              </div>
              <button
                onClick={handleSwapFields}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium whitespace-nowrap"
              >
                {settings.swapFields ? 'Unswap Fields' : 'Swap Fields'}
              </button>
            </div>
          </div>

          {/* Column Mapping Section */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Column Mapping
              </h3>
              <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                💡 Drag to reorder or use dropdowns
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                Map each field to the correct column from your Moodle report. You can drag and drop to swap assignments or use the dropdown menus.
              </p>
            </div>

            <div className="space-y-2">
              {columnMappings.map((mapping) => (
                <div
                  key={mapping.fieldName}
                  draggable
                  onDragStart={() => handleDragStart(mapping.fieldName)}
                  onDragOver={(e) => handleDragOver(e, mapping.fieldName)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 bg-gray-50 border-2 rounded-lg cursor-move transition-all hover:border-blue-300 hover:shadow-md ${
                    draggedItem === mapping.fieldName ? 'opacity-50 border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <div className="shrink-0">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{mapping.fieldLabel}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Maps to column index {mapping.columnIndex}</div>
                  </div>
                  
                  <div className="shrink-0">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  
                  <div className="flex-1">
                    <select
                      value={mapping.columnIndex}
                      onChange={(e) => handleDropdownChange(mapping.fieldName, parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      {reportHeaders.map((header, index) => (
                        <option key={index} value={index}>
                          {header || `Column ${index}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
