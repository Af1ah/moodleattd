import { MoodleSettings, DEFAULT_FIELD_MAPPING } from '@/types/moodle';

const SETTINGS_STORAGE_KEY = 'moodle_settings';

/**
 * Service for managing Moodle settings with persistence per base URL
 */
class SettingsService {
  /**
   * Extract base URL from full URL
   */
  private extractBaseUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      return url;
    }
  }

  /**
   * Get all saved settings from localStorage
   */
  private getAllSettings(): Record<string, MoodleSettings> {
    if (typeof window === 'undefined') return {};
    
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load settings:', error);
      return {};
    }
  }

  /**
   * Save all settings to localStorage
   */
  private saveAllSettings(settings: Record<string, MoodleSettings>): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * Get settings for a specific base URL
   */
  getSettings(baseUrl: string): MoodleSettings | null {
    const normalizedUrl = this.extractBaseUrl(baseUrl);
    const allSettings = this.getAllSettings();
    return allSettings[normalizedUrl] || null;
  }

  /**
   * Save settings for a specific base URL
   */
  saveSettings(settings: MoodleSettings): void {
    const normalizedUrl = this.extractBaseUrl(settings.baseUrl);
    const allSettings = this.getAllSettings();
    
    allSettings[normalizedUrl] = {
      ...settings,
      baseUrl: normalizedUrl,
      lastUpdated: Date.now(),
    };
    
    this.saveAllSettings(allSettings);
  }

  /**
   * Get settings or return default for a base URL
   */
  getOrCreateSettings(baseUrl: string): MoodleSettings {
    const existing = this.getSettings(baseUrl);
    
    if (existing) {
      return existing;
    }
    
    // Return default settings
    return {
      baseUrl: this.extractBaseUrl(baseUrl),
      fieldMapping: { ...DEFAULT_FIELD_MAPPING },
      useCourseName: true,
      swapFields: false,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Delete settings for a specific base URL
   */
  deleteSettings(baseUrl: string): void {
    const normalizedUrl = this.extractBaseUrl(baseUrl);
    const allSettings = this.getAllSettings();
    
    delete allSettings[normalizedUrl];
    this.saveAllSettings(allSettings);
  }

  /**
   * Get all saved base URLs
   */
  getAllBaseUrls(): string[] {
    const allSettings = this.getAllSettings();
    return Object.keys(allSettings);
  }

  /**
   * Clear all settings
   */
  clearAllSettings(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  }

  /**
   * Reset settings to default for a base URL
   */
  resetToDefault(baseUrl: string): MoodleSettings {
    const normalizedUrl = this.extractBaseUrl(baseUrl);
    const defaultSettings: MoodleSettings = {
      baseUrl: normalizedUrl,
      fieldMapping: { ...DEFAULT_FIELD_MAPPING },
      useCourseName: true,
      swapFields: false,
      lastUpdated: Date.now(),
    };
    
    this.saveSettings(defaultSettings);
    return defaultSettings;
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
