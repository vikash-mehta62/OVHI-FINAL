# 🚀 Complete Integration Guide - Auto Specialty Template System

## Quick Start (5 Minutes)

### 1. Run the Setup Script
```bash
node run-auto-specialty-system.js
```

### 2. Setup Database
```bash
# Connect to MySQL
mysql -u root -p

# Create/Use database
CREATE DATABASE IF NOT EXISTS ovhi_db;
USE ovhi_db;

# Run the schema
SOURCE server/sql/auto_specialty_templates_schema.sql;
```

### 3. Start the System
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend  
npm run dev
```

### 4. Test the API
```bash
# Update token in test file first
node server/test-auto-specialty.js
```

## 📁 File Structure

Your project should have these files:

```
project-root/
├── server/
│   ├── services/
│   │   └── settings/
│   │       ├── autoSpecialtyCtrl.js          ✅ Created
│   │       ├── autoSpecialtyRoutes.js        ✅ Created
│   │       └── enhancedSettingsRoutes.js     ✅ Updated
│   ├── sql/
│   │   └── auto_specialty_templates_schema.sql ✅ Created
│   └── test-auto-specialty.js                ✅ Created
├── src/
│   ├── components/
│   │   └── settings/
│   │       └── AutoSpecialtyTemplateSettings.tsx ✅ Created
│   └── services/
│       └── operations/
│           └── autoSpecialtyTemplates.js     ✅ Created
├── run-auto-specialty-system.js              ✅ Created
├── AUTO_SPECIALTY_SETUP.md                   ✅ Created
└── INTEGRATION_GUIDE.md                      ✅ This file
```

## 🔧 Backend Integration

### 1. Update Your Main Server File

Add to your `server/index.js` or `server/app.js`:

```javascript
// Import enhanced settings routes
const enhancedSettingsRoutes = require('./services/settings/enhancedSettingsRoutes');

// Use the routes
app.use('/api/v1/settings', enhancedSettingsRoutes);

// The auto-specialty routes are now available at:
// /api/v1/settings/auto-specialty/*
```

### 2. Database Connection

Ensure your `server/config/database.js` is configured:

```javascript
const mysql = require('mysql2/promise');

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ovhi_db'
});

module.exports = connection;
```

### 3. Environment Variables

Create/update your `.env` file:

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ovhi_db

# Server
PORT=8000
NODE_ENV=development

# JWT
JWT_SECRET=your-jwt-secret

# Auto Specialty
DEBUG_AUTO_SPECIALTY=true
AI_SUGGESTIONS_ENABLED=true
```

## 🎨 Frontend Integration

### 1. Add to Settings Navigation

Update your settings component:

```typescript
// In your Settings.tsx or similar
import AutoSpecialtyTemplateSettings from '@/components/settings/AutoSpecialtyTemplateSettings';

const settingsTabs = [
  // ... existing tabs
  {
    id: 'auto-specialty',
    label: 'Auto Templates',
    icon: <Target className="h-4 w-4" />,
    component: <AutoSpecialtyTemplateSettings />
  }
];
```

### 2. Update API Configuration

Ensure your API base URL is correct in `src/services/apis.js`:

```javascript
export const BASE_URL = "http://localhost:8000/api/v1";
```

### 3. Add Required Dependencies

Make sure you have these UI components:

```bash
npm install @radix-ui/react-tabs
npm install @radix-ui/react-select
npm install @radix-ui/react-switch
npm install @radix-ui/react-dialog
npm install lucide-react
```

## 🧪 Testing the Complete System

### 1. Backend API Tests

```bash
# Update the token in the test file
# server/test-auto-specialty.js
const TEST_TOKEN = 'your-actual-jwt-token';

# Run the tests
node server/test-auto-specialty.js
```

Expected output:
```
🚀 Starting Auto Specialty Template API Tests
==================================================

🧪 Testing: Get Specialty Configuration
✅ Success: { provider_specialty: 'Primary Care', config: {...} }

🧪 Testing: Update Specialty Configuration  
✅ Success: Specialty configuration updated successfully

🧪 Testing: Get Auto-Assigned Templates
✅ Success: { auto_assignment_enabled: true, templates: [...] }

🧪 Testing: Create Custom Template
✅ Success: Custom template created successfully

🧪 Testing: Get AI Template Recommendations
✅ Success: { ai_enabled: true, recommendations: [...] }

🧪 Testing: Get Specialty Template Analytics
✅ Success: { specialty: 'Primary Care', template_usage: [...] }

==================================================
🎉 All tests completed!
```

### 2. Frontend Testing

1. Start your development server
2. Navigate to `http://localhost:3000`
3. Go to Settings → Auto Templates
4. Test these features:
   - ✅ Auto-assignment toggle
   - ✅ Specialty detection
   - ✅ Default template management
   - ✅ Custom template creation
   - ✅ AI settings configuration
   - ✅ Template analytics

## 🔄 Integration with Existing Encounter System

### 1. Template Suggestions in Encounters

Add to your encounter creation component:

```typescript
import { getTemplateContextSuggestionsAPI } from '@/services/operations/autoSpecialtyTemplates';

const EncounterForm = () => {
  const [suggestedTemplates, setSuggestedTemplates] = useState([]);
  
  // Get template suggestions based on context
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (user?.specialty && visitType) {
        const suggestions = await getTemplateContextSuggestionsAPI(token, {
          specialty: user.specialty,
          visitType: visitType,
          chiefComplaint: chiefComplaint,
          patientAge: patient?.age,
          patientGender: patient?.gender
        });
        
        if (suggestions?.data?.auto_assigned?.templates) {
          setSuggestedTemplates(suggestions.data.auto_assigned.templates);
        }
      }
    };
    
    fetchSuggestions();
  }, [user?.specialty, visitType, chiefComplaint]);
  
  return (
    <div>
      {/* Template Suggestions */}
      {suggestedTemplates.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Suggested Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestedTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className="p-3 border rounded-lg hover:bg-gray-50 text-left"
              >
                <div className="font-medium">{template.template_name}</div>
                <div className="text-sm text-gray-500">{template.visit_type}</div>
                {template.is_auto_assigned && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Auto-suggested
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Your existing encounter form */}
    </div>
  );
};
```

### 2. Template Usage Tracking

Track when templates are used:

```typescript
const trackTemplateUsage = async (templateId, usageData) => {
  try {
    await fetch('/api/v1/encounters/template-usage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        template_id: templateId,
        patient_id: patient.id,
        encounter_id: encounter.id,
        usage_context: {
          visit_type: visitType,
          chief_complaint: chiefComplaint,
          patient_age: patient.age,
          patient_gender: patient.gender
        },
        completion_time_seconds: completionTime,
        modifications_made: modifications
      })
    });
  } catch (error) {
    console.error('Error tracking template usage:', error);
  }
};
```

## 📊 Monitoring and Analytics

### 1. Template Performance Dashboard

Create a dashboard to monitor:
- Template usage frequency
- Provider adoption rates
- AI recommendation accuracy
- Template effectiveness scores

### 2. Analytics Queries

Use these queries to monitor system performance:

```sql
-- Most used templates by specialty
SELECT 
  et.specialty,
  et.template_name,
  ta.total_uses,
  ta.avg_rating
FROM template_analytics ta
JOIN encounter_templates et ON ta.template_id = et.id
ORDER BY ta.total_uses DESC;

-- Provider adoption rates
SELECT 
  up.specialty,
  COUNT(DISTINCT stc.user_id) as providers_with_auto_assignment,
  COUNT(DISTINCT up.fk_userid) as total_providers,
  (COUNT(DISTINCT stc.user_id) / COUNT(DISTINCT up.fk_userid) * 100) as adoption_rate
FROM user_profiles up
LEFT JOIN specialty_template_config stc ON up.fk_userid = stc.user_id 
  AND stc.auto_template_assignment = 1
GROUP BY up.specialty;

-- AI recommendation effectiveness
SELECT 
  specialty,
  COUNT(*) as total_recommendations,
  SUM(CASE WHEN user_action = 'accepted' THEN 1 ELSE 0 END) as accepted,
  (SUM(CASE WHEN user_action = 'accepted' THEN 1 ELSE 0 END) / COUNT(*) * 100) as acceptance_rate
FROM ai_template_recommendations
GROUP BY specialty;
```

## 🚨 Troubleshooting

### Common Issues and Solutions

1. **"Template not found" Error**
   ```bash
   # Check if templates exist for the specialty
   SELECT * FROM encounter_templates WHERE specialty = 'Primary Care';
   
   # Check if auto-assignment is enabled
   SELECT * FROM specialty_template_config WHERE specialty = 'Primary Care';
   ```

2. **"Database connection failed"**
   ```bash
   # Test database connection
   mysql -u root -p -e "SELECT 1;"
   
   # Check environment variables
   echo $DB_HOST $DB_USER $DB_NAME
   ```

3. **"AI recommendations not working"**
   ```bash
   # Check AI settings
   SELECT ai_suggestions_enabled FROM specialty_template_config WHERE user_id = 1;
   
   # Verify specialty configuration
   SELECT * FROM specialty_template_config WHERE user_id = 1;
   ```

4. **Frontend component not loading**
   ```bash
   # Check console for errors
   # Verify import paths
   # Check if all dependencies are installed
   npm list @radix-ui/react-tabs @radix-ui/react-select
   ```

## 🔒 Security Checklist

- ✅ JWT authentication on all endpoints
- ✅ Input validation with express-validator
- ✅ SQL injection prevention with parameterized queries
- ✅ User authorization checks
- ✅ Audit logging for all operations
- ✅ Data encryption for sensitive information

## 🎯 Success Metrics

Track these metrics to measure success:

1. **Adoption Rate**: % of providers using auto-assignment
2. **Template Usage**: Average templates used per encounter
3. **Time Savings**: Reduction in documentation time
4. **Quality Scores**: Template completeness and accuracy
5. **User Satisfaction**: Provider feedback and ratings

## 📞 Support

If you encounter issues:

1. **Check the logs**: Server logs and browser console
2. **Verify database**: Ensure all tables are created
3. **Test API endpoints**: Use the test script
4. **Check authentication**: Verify JWT tokens
5. **Review configuration**: Environment variables and settings

## 🎉 You're Ready!

Your Auto Specialty Template System is now fully integrated and ready to use. The system will:

- ✅ Automatically detect provider specialties
- ✅ Suggest relevant templates based on context
- ✅ Allow custom template creation
- ✅ Provide AI-powered recommendations
- ✅ Track usage and performance analytics
- ✅ Continuously learn and improve

Navigate to **Settings → Auto Templates** to start configuring your specialty-based templates!

---

**🚀 System Status**: Ready for Production  
**📅 Last Updated**: January 2024  
**🔧 Version**: 1.0.0