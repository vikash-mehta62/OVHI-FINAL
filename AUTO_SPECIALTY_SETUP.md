# Auto Specialty Template System - Complete Setup Guide

## 🚀 Overview

This system automatically assigns encounter templates based on provider specialty and allows custom template creation with AI assistance.

## 📋 Prerequisites

- Node.js server running
- MySQL database configured
- JWT authentication system in place
- Existing user profiles with specialty information

## 🗄️ Database Setup

### 1. Run the Database Schema

Execute the SQL schema to create all required tables:

```bash
# Connect to your MySQL database and run:
mysql -u your_username -p your_database < server/sql/auto_specialty_templates_schema.sql
```

### 2. Verify Tables Created

The following tables should be created:
- `specialty_template_config`
- `user_template_assignments`
- `encounter_usage`
- `template_analytics`
- `ai_template_recommendations`
- `template_versions`
- `specialty_template_categories`

## 🔧 Backend Setup

### 1. Install Dependencies

Make sure you have the required dependencies:

```bash
npm install express-validator
```

### 2. Update Main Server Routes

Add the auto specialty routes to your main server file:

```javascript
// In your main server.js or app.js
const enhancedSettingsRoutes = require('./services/settings/enhancedSettingsRoutes');

// Use the enhanced settings routes (which now include auto-specialty)
app.use('/api/v1/settings', enhancedSettingsRoutes);
```

### 3. Database Connection

Ensure your database connection is properly configured in `server/config/database.js`:

```javascript
const mysql = require('mysql2/promise');

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'your_username',
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_NAME || 'your_database'
});

module.exports = connection;
```

## 🎨 Frontend Setup

### 1. Add to Settings Navigation

Update your settings navigation to include the auto specialty component:

```typescript
// In your settings page or navigation component
import AutoSpecialtyTemplateSettings from '@/components/settings/AutoSpecialtyTemplateSettings';

const settingsPages = [
  // ... other settings
  {
    id: 'auto-specialty',
    label: 'Auto Templates',
    icon: <Target className="h-4 w-4" />,
    component: <AutoSpecialtyTemplateSettings />
  }
];
```

### 2. Update API Configuration

Make sure your API base URL is configured correctly in `src/services/apis.js`:

```javascript
export const BASE_URL = "http://localhost:8000/api/v1";
```

## 🧪 Testing the System

### 1. Backend API Testing

Update the test token in `server/test-auto-specialty.js`:

```javascript
const TEST_TOKEN = 'your-actual-jwt-token-here';
```

Run the backend tests:

```bash
node server/test-auto-specialty.js
```

### 2. Frontend Testing

1. Start your development server
2. Navigate to Settings → Auto Templates
3. Test the following features:
   - Auto-assignment toggle
   - Default template management
   - Custom template creation
   - AI settings configuration

## 📡 API Endpoints

The system provides the following endpoints:

### Configuration Management
- `GET /api/v1/settings/auto-specialty/config` - Get specialty configuration
- `PUT /api/v1/settings/auto-specialty/config` - Update specialty configuration

### Template Management
- `GET /api/v1/settings/auto-specialty/auto-assigned` - Get auto-assigned templates
- `POST /api/v1/settings/auto-specialty/custom-template` - Create custom template

### AI & Analytics
- `GET /api/v1/settings/auto-specialty/ai-recommendations` - Get AI recommendations
- `GET /api/v1/settings/auto-specialty/analytics` - Get template analytics

## 🔄 Integration with Existing Encounter System

### 1. Template Selection Integration

In your encounter creation component, integrate the auto specialty system:

```typescript
import { getTemplateContextSuggestionsAPI } from '@/services/operations/autoSpecialtyTemplates';

const EncounterCreation = () => {
  const [suggestedTemplates, setSuggestedTemplates] = useState([]);
  
  useEffect(() => {
    const fetchSuggestions = async () => {
      const suggestions = await getTemplateContextSuggestionsAPI(token, {
        specialty: user.specialty,
        visitType: selectedVisitType,
        chiefComplaint: patientComplaint,
        patientAge: patient.age,
        patientGender: patient.gender
      });
      
      if (suggestions?.data) {
        setSuggestedTemplates(suggestions.data.auto_assigned.templates);
      }
    };
    
    fetchSuggestions();
  }, [selectedVisitType, patientComplaint]);
  
  return (
    <div>
      {/* Your encounter form */}
      <TemplateSuggestions templates={suggestedTemplates} />
    </div>
  );
};
```

### 2. Template Usage Tracking

Track template usage for analytics:

```typescript
const trackTemplateUsage = async (templateId, usageData) => {
  // This would be implemented in your encounter save logic
  await fetch('/api/v1/encounters/template-usage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      template_id: templateId,
      usage_context: usageData,
      completion_time: usageData.completionTime,
      modifications_made: usageData.modifications
    })
  });
};
```

## 🎯 Default Specialty Templates

The system comes with pre-configured templates for:

### Primary Care
- Annual Physical Exam
- Sick Visit - Acute
- Follow-up Visit
- Preventive Care

### Cardiology
- Cardiac Consultation
- Echo Follow-up
- Chest Pain Evaluation

### Mental Health
- Initial Psychiatric Evaluation
- Therapy Session
- Medication Management

### Neurology
- Neurological Consultation
- Headache Evaluation

### Urgent Care
- Minor Injury Assessment
- Acute Illness

### Dermatology
- Skin Cancer Screening
- Comprehensive Skin Exam

## 🤖 AI Features

### 1. Content Suggestions
- Specialty-specific SOAP note recommendations
- Contextual examination templates
- Billing code suggestions

### 2. Template Enhancement
- AI-improved template structure
- Evidence-based content recommendations
- Billing optimization

### 3. Learning System
- Usage pattern analysis
- Provider preference learning
- Continuous improvement

## 📊 Analytics & Reporting

The system tracks:
- Template usage frequency
- Provider preferences
- Template effectiveness
- AI recommendation accuracy
- Specialty-specific metrics

## 🔒 Security Considerations

- All API endpoints require JWT authentication
- Template data is validated on both frontend and backend
- User permissions are checked for template access
- Audit logging for all template operations

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check MySQL connection settings
   - Verify database credentials
   - Ensure database exists

2. **Template Not Loading**
   - Check user specialty in profile
   - Verify auto-assignment is enabled
   - Check template availability for specialty

3. **AI Recommendations Not Working**
   - Verify AI settings are enabled
   - Check specialty configuration
   - Ensure proper context data is provided

4. **Frontend Component Not Rendering**
   - Check import paths
   - Verify component dependencies
   - Check console for errors

### Debug Mode

Enable debug logging by setting environment variables:

```bash
NODE_ENV=development
DEBUG_AUTO_SPECIALTY=true
```

## 📞 Support

For issues or questions:
1. Check the API documentation
2. Review the database schema
3. Test individual endpoints
4. Check browser console for frontend errors
5. Review server logs for backend issues

## 🔄 Updates and Maintenance

### Regular Maintenance Tasks
1. Update template analytics (automated via triggers)
2. Review AI recommendation accuracy
3. Update specialty-specific templates
4. Monitor system performance
5. Backup template configurations

### Version Updates
- Template versioning is handled automatically
- Configuration changes are tracked
- User preferences are preserved during updates

---

**System Status**: ✅ Ready for Production
**Last Updated**: January 2024
**Version**: 1.0.0