const connection = require('../../config/db');
const { validationResult } = require('express-validator');

// Get user appearance settings
const getAppearanceSettings = async (req, res) => {
  try {
    const { user_id } = req.user;

    const [settings] = await connection.query(`
      SELECT 
        theme,
        color_scheme,
        font_size,
        font_family,
        language,
        timezone,
        date_format,
        time_format,
        currency,
        sidebar_collapsed,
        compact_mode,
        high_contrast,
        animations_enabled,
        sound_enabled,
        dashboard_layout,
        items_per_page,
        created_at,
        updated_at
      FROM user_appearance_settings 
      WHERE user_id = ?
    `, [user_id]);

    if (settings.length === 0) {
      // Create default appearance settings
      const defaultSettings = {
        user_id,
        theme: 'light',
        color_scheme: 'blue',
        font_size: 'medium',
        font_family: 'system',
        language: 'en',
        timezone: 'America/New_York',
        date_format: 'MM/DD/YYYY',
        time_format: '12h',
        currency: 'USD',
        sidebar_collapsed: false,
        compact_mode: false,
        high_contrast: false,
        animations_enabled: true,
        sound_enabled: true,
        dashboard_layout: 'grid',
        items_per_page: 20
      };

      await connection.query(
        'INSERT INTO user_appearance_settings SET ?',
        [defaultSettings]
      );

      return res.json({
        success: true,
        data: defaultSettings
      });
    }

    res.json({
      success: true,
      data: settings[0]
    });

  } catch (error) {
    console.error('Error fetching appearance settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appearance settings',
      error: error.message
    });
  }
};

// Update appearance settings
const updateAppearanceSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { user_id } = req.user;
    const {
      theme,
      color_scheme,
      font_size,
      font_family,
      language,
      timezone,
      date_format,
      time_format,
      currency,
      sidebar_collapsed,
      compact_mode,
      high_contrast,
      animations_enabled,
      sound_enabled,
      dashboard_layout,
      items_per_page
    } = req.body;

    // Validate theme options
    const validThemes = ['light', 'dark', 'auto'];
    const validColorSchemes = ['blue', 'green', 'purple', 'orange', 'red'];
    const validFontSizes = ['small', 'medium', 'large', 'extra-large'];
    const validFontFamilies = ['system', 'arial', 'helvetica', 'georgia', 'times'];
    const validLayouts = ['grid', 'list', 'cards'];

    if (theme && !validThemes.includes(theme)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid theme selection'
      });
    }

    if (color_scheme && !validColorSchemes.includes(color_scheme)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid color scheme selection'
      });
    }

    // Check if settings exist
    const [existing] = await connection.query(
      'SELECT id FROM user_appearance_settings WHERE user_id = ?',
      [user_id]
    );

    const settingsData = {
      theme: theme ?? 'light',
      color_scheme: color_scheme ?? 'blue',
      font_size: font_size ?? 'medium',
      font_family: font_family ?? 'system',
      language: language ?? 'en',
      timezone: timezone ?? 'America/New_York',
      date_format: date_format ?? 'MM/DD/YYYY',
      time_format: time_format ?? '12h',
      currency: currency ?? 'USD',
      sidebar_collapsed: sidebar_collapsed ?? false,
      compact_mode: compact_mode ?? false,
      high_contrast: high_contrast ?? false,
      animations_enabled: animations_enabled ?? true,
      sound_enabled: sound_enabled ?? true,
      dashboard_layout: dashboard_layout ?? 'grid',
      items_per_page: items_per_page ?? 20,
      updated_at: new Date()
    };

    if (existing.length > 0) {
      // Update existing settings
      await connection.query(
        'UPDATE user_appearance_settings SET ? WHERE user_id = ?',
        [settingsData, user_id]
      );
    } else {
      // Create new settings
      settingsData.user_id = user_id;
      settingsData.created_at = new Date();
      
      await connection.query(
        'INSERT INTO user_appearance_settings SET ?',
        [settingsData]
      );
    }

    // Log the change for audit
    await connection.query(`
      INSERT INTO settings_audit (
        user_id, setting_category, new_value, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      user_id,
      'appearance',
      JSON.stringify(settingsData),
      req.ip,
      req.get('User-Agent')
    ]);

    res.json({
      success: true,
      message: 'Appearance settings updated successfully',
      data: settingsData
    });

  } catch (error) {
    console.error('Error updating appearance settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appearance settings',
      error: error.message
    });
  }
};

// Get available themes and options
const getAppearanceOptions = async (req, res) => {
  try {
    const options = {
      themes: [
        { value: 'light', label: 'Light', description: 'Clean and bright interface' },
        { value: 'dark', label: 'Dark', description: 'Easy on the eyes in low light' },
        { value: 'auto', label: 'Auto', description: 'Follows system preference' }
      ],
      colorSchemes: [
        { value: 'blue', label: 'Blue', hex: '#3B82F6' },
        { value: 'green', label: 'Green', hex: '#10B981' },
        { value: 'purple', label: 'Purple', hex: '#8B5CF6' },
        { value: 'orange', label: 'Orange', hex: '#F59E0B' },
        { value: 'red', label: 'Red', hex: '#EF4444' }
      ],
      fontSizes: [
        { value: 'small', label: 'Small', size: '14px' },
        { value: 'medium', label: 'Medium', size: '16px' },
        { value: 'large', label: 'Large', size: '18px' },
        { value: 'extra-large', label: 'Extra Large', size: '20px' }
      ],
      fontFamilies: [
        { value: 'system', label: 'System Default', family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' },
        { value: 'arial', label: 'Arial', family: 'Arial, sans-serif' },
        { value: 'helvetica', label: 'Helvetica', family: 'Helvetica, Arial, sans-serif' },
        { value: 'georgia', label: 'Georgia', family: 'Georgia, serif' },
        { value: 'times', label: 'Times New Roman', family: '"Times New Roman", Times, serif' }
      ],
      languages: [
        { value: 'en', label: 'English', flag: '🇺🇸' },
        { value: 'es', label: 'Español', flag: '🇪🇸' },
        { value: 'fr', label: 'Français', flag: '🇫🇷' },
        { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
        { value: 'it', label: 'Italiano', flag: '🇮🇹' },
        { value: 'pt', label: 'Português', flag: '🇵🇹' }
      ],
      timezones: [
        { value: 'America/New_York', label: 'Eastern Time (ET)', offset: 'UTC-5' },
        { value: 'America/Chicago', label: 'Central Time (CT)', offset: 'UTC-6' },
        { value: 'America/Denver', label: 'Mountain Time (MT)', offset: 'UTC-7' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'UTC-8' },
        { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', offset: 'UTC+0' },
        { value: 'Europe/Paris', label: 'Central European Time (CET)', offset: 'UTC+1' }
      ],
      dateFormats: [
        { value: 'MM/DD/YYYY', label: '12/31/2024', example: '12/31/2024' },
        { value: 'DD/MM/YYYY', label: '31/12/2024', example: '31/12/2024' },
        { value: 'YYYY-MM-DD', label: '2024-12-31', example: '2024-12-31' },
        { value: 'MMM DD, YYYY', label: 'Dec 31, 2024', example: 'Dec 31, 2024' }
      ],
      timeFormats: [
        { value: '12h', label: '12-hour (3:30 PM)', example: '3:30 PM' },
        { value: '24h', label: '24-hour (15:30)', example: '15:30' }
      ],
      currencies: [
        { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
        { value: 'EUR', label: 'Euro (€)', symbol: '€' },
        { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
        { value: 'CAD', label: 'Canadian Dollar (C$)', symbol: 'C$' },
        { value: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$' }
      ],
      dashboardLayouts: [
        { value: 'grid', label: 'Grid View', description: 'Cards arranged in a grid' },
        { value: 'list', label: 'List View', description: 'Compact list format' },
        { value: 'cards', label: 'Card View', description: 'Large detailed cards' }
      ]
    };

    res.json({
      success: true,
      data: options
    });

  } catch (error) {
    console.error('Error fetching appearance options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appearance options',
      error: error.message
    });
  }
};

// Reset appearance settings to default
const resetAppearanceSettings = async (req, res) => {
  try {
    const { user_id } = req.user;

    const defaultSettings = {
      theme: 'light',
      color_scheme: 'blue',
      font_size: 'medium',
      font_family: 'system',
      language: 'en',
      timezone: 'America/New_York',
      date_format: 'MM/DD/YYYY',
      time_format: '12h',
      currency: 'USD',
      sidebar_collapsed: false,
      compact_mode: false,
      high_contrast: false,
      animations_enabled: true,
      sound_enabled: true,
      dashboard_layout: 'grid',
      items_per_page: 20,
      updated_at: new Date()
    };

    await connection.query(
      'UPDATE user_appearance_settings SET ? WHERE user_id = ?',
      [defaultSettings, user_id]
    );

    // Log the reset for audit
    await connection.query(`
      INSERT INTO settings_audit (
        user_id, setting_category, new_value, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      user_id,
      'appearance_reset',
      JSON.stringify(defaultSettings),
      req.ip,
      req.get('User-Agent')
    ]);

    res.json({
      success: true,
      message: 'Appearance settings reset to default',
      data: defaultSettings
    });

  } catch (error) {
    console.error('Error resetting appearance settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset appearance settings',
      error: error.message
    });
  }
};

// Export appearance settings
const exportAppearanceSettings = async (req, res) => {
  try {
    const { user_id } = req.user;

    const [settings] = await connection.query(`
      SELECT 
        theme,
        color_scheme,
        font_size,
        font_family,
        language,
        timezone,
        date_format,
        time_format,
        currency,
        sidebar_collapsed,
        compact_mode,
        high_contrast,
        animations_enabled,
        sound_enabled,
        dashboard_layout,
        items_per_page
      FROM user_appearance_settings 
      WHERE user_id = ?
    `, [user_id]);

    if (settings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appearance settings not found'
      });
    }

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      settings: settings[0]
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="appearance-settings.json"');
    
    res.json({
      success: true,
      data: exportData
    });

  } catch (error) {
    console.error('Error exporting appearance settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export appearance settings',
      error: error.message
    });
  }
};

// Import appearance settings
const importAppearanceSettings = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings data'
      });
    }

    // Validate imported settings
    const validatedSettings = {
      theme: settings.theme || 'light',
      color_scheme: settings.color_scheme || 'blue',
      font_size: settings.font_size || 'medium',
      font_family: settings.font_family || 'system',
      language: settings.language || 'en',
      timezone: settings.timezone || 'America/New_York',
      date_format: settings.date_format || 'MM/DD/YYYY',
      time_format: settings.time_format || '12h',
      currency: settings.currency || 'USD',
      sidebar_collapsed: settings.sidebar_collapsed ?? false,
      compact_mode: settings.compact_mode ?? false,
      high_contrast: settings.high_contrast ?? false,
      animations_enabled: settings.animations_enabled ?? true,
      sound_enabled: settings.sound_enabled ?? true,
      dashboard_layout: settings.dashboard_layout || 'grid',
      items_per_page: settings.items_per_page || 20,
      updated_at: new Date()
    };

    await connection.query(
      'UPDATE user_appearance_settings SET ? WHERE user_id = ?',
      [validatedSettings, user_id]
    );

    // Log the import for audit
    await connection.query(`
      INSERT INTO settings_audit (
        user_id, setting_category, new_value, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      user_id,
      'appearance_import',
      JSON.stringify(validatedSettings),
      req.ip,
      req.get('User-Agent')
    ]);

    res.json({
      success: true,
      message: 'Appearance settings imported successfully',
      data: validatedSettings
    });

  } catch (error) {
    console.error('Error importing appearance settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import appearance settings',
      error: error.message
    });
  }
};

module.exports = {
  getAppearanceSettings,
  updateAppearanceSettings,
  getAppearanceOptions,
  resetAppearanceSettings,
  exportAppearanceSettings,
  importAppearanceSettings
};