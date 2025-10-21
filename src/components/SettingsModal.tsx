'use client';

import { useState, useEffect } from 'react';
import { MoodleSettings, FieldMapping } from '@/types/moodle';
import { settingsService } from '@/services/settingsService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseUrl: string;
  onSettingsChange: (settings: MoodleSettings) => void;
}

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  baseUrl,
  onSettingsChange 
}: SettingsModalProps) {
  const [settings, setSettings] = useState<MoodleSettings>(
    settingsService.getOrCreateSettings(baseUrl)
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const currentSettings = settingsService.getOrCreateSettings(baseUrl);
      setSettings(currentSettings);
    }
  }, [isOpen, baseUrl]);

  const handleSave = () => {
    settingsService.saveSettings(settings);
    onSettingsChange(settings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = settingsService.resetToDefault(baseUrl);
    setSettings(defaultSettings);
  };

  const handleSwapFields = () => {
    setSettings(prev => {
      const newMapping = { ...prev.fieldMapping };
      // Swap course and student name indices
      const temp = newMapping.courseNameIndex;
      newMapping.courseNameIndex = newMapping.studentNameIndex;
      newMapping.studentNameIndex = temp;
      
      return {
        ...prev,
        fieldMapping: newMapping,
        swapFields: !prev.swapFields,
      };
    });
  };

  const updateFieldMapping = (field: keyof FieldMapping, value: number) => {
    setSettings(prev => ({
      ...prev,
      fieldMapping: {
        ...prev.fieldMapping,
        [field]: value,
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
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
            
            <div className="space-y-3">
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

              {settings.swapFields && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Fields are swapped. Course and student name indices have been exchanged.</span>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">Advanced Field Mapping</span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ <strong>Advanced:</strong> Only modify these if you understand your Moodle report structure. 
                  Field indices start from 0. Incorrect values may cause data to display incorrectly.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Name Column
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.fieldMapping.courseNameIndex}
                    onChange={(e) => updateFieldMapping('courseNameIndex', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Name Column
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.fieldMapping.studentNameIndex}
                    onChange={(e) => updateFieldMapping('studentNameIndex', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date/Time Column
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.fieldMapping.dateTimeIndex}
                    onChange={(e) => updateFieldMapping('dateTimeIndex', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status Column
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.fieldMapping.statusIndex}
                    onChange={(e) => updateFieldMapping('statusIndex', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade Column
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.fieldMapping.gradeIndex}
                    onChange={(e) => updateFieldMapping('gradeIndex', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Present Column
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.fieldMapping.totalPresentIndex}
                    onChange={(e) => updateFieldMapping('totalPresentIndex', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Late Column
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.fieldMapping.totalLateIndex}
                    onChange={(e) => updateFieldMapping('totalLateIndex', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Excused Column
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.fieldMapping.totalExcusedIndex}
                    onChange={(e) => updateFieldMapping('totalExcusedIndex', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Absent Column
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.fieldMapping.totalAbsentIndex}
                    onChange={(e) => updateFieldMapping('totalAbsentIndex', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
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
