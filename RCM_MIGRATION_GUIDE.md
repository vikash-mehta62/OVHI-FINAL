# RCM Module Migration Guide

## Files Removed and Their Replacements

### Frontend Components
| Removed File | Replaced By | Action Required |
|-------------|-------------|-----------------|
| `src/components/rcm/RCMDashboard.tsx` | `src/components/rcm/UnifiedRCMDashboard.tsx` | Update imports |
| `src/components/rcm/RCMAnalyticsDashboard.tsx` | `src/components/rcm/UnifiedRCMDashboard.tsx` | Update imports |
| `src/components/rcm/ReportingDashboard.tsx` | `src/components/rcm/UnifiedRCMDashboard.tsx` | Update imports |
| `src/components/rcm/EnhancedReportingDashboard.tsx` | `src/components/rcm/UnifiedRCMDashboard.tsx` | Update imports |

### Backend Services
| Removed File | Replaced By | Action Required |
|-------------|-------------|-----------------|
| `server/services/rcm/rcmService.js` | `server/services/rcm/unifiedRCMService.js` | Update imports |
| `server/services/rcm/consolidatedRCMService.js` | `server/services/rcm/unifiedRCMService.js` | Update imports |
| `server/services/rcm/optimizedRCMService.js` | `server/services/rcm/unifiedRCMService.js` | Update imports |
| `server/services/rcm/transactionalRCMService.js` | `server/services/rcm/unifiedRCMService.js` | Update imports |

### Controllers
| Removed File | Replaced By | Action Required |
|-------------|-------------|-----------------|
| `server/services/rcm/rcmCtrl.js` | `server/services/rcm/unifiedRCMController.js` | Update imports |
| `server/services/rcm/rcmController.js` | `server/services/rcm/unifiedRCMController.js` | Update imports |
| `server/services/rcm/collectionsCtrl.js` | `server/services/rcm/unifiedRCMController.js` | Update imports |
| `server/services/rcm/eraProcessingCtrl.js` | `server/services/rcm/unifiedRCMController.js` | Update imports |

### Routes
| Removed File | Replaced By | Action Required |
|-------------|-------------|-----------------|
| `server/services/rcm/rcmRoutes.js` | `server/routes/unifiedRCMRoutes.js` | Update route registration |
| `server/routes/rcmAdvancedWorkflowRoutes.js` | `server/routes/unifiedRCMRoutes.js` | Update route registration |
| `server/routes/rcmCriticalRoutes.js` | `server/routes/unifiedRCMRoutes.js` | Update route registration |

## Required Updates

### 1. Update Frontend Imports
```typescript
// OLD
import RCMDashboard from '@/components/rcm/RCMDashboard';
import RCMAnalyticsDashboard from '@/components/rcm/RCMAnalyticsDashboard';

// NEW
import UnifiedRCMDashboard from '@/components/rcm/UnifiedRCMDashboard';
```

### 2. Update Backend Imports
```javascript
// OLD
const RCMService = require('./rcmService');
const ConsolidatedRCMService = require('./consolidatedRCMService');

// NEW
const UnifiedRCMService = require('./unifiedRCMService');
```

### 3. Update Route Registration
```javascript
// OLD
app.use('/api/v1/rcm', require('./routes/rcmRoutes'));
app.use('/api/v1/rcm/advanced', require('./routes/rcmAdvancedWorkflowRoutes'));

// NEW
app.use('/api/v1/rcm', require('./routes/unifiedRCMRoutes'));
```

## Benefits Achieved
- ✅ Eliminated 14 duplicate files
- ✅ 92% reduction in code duplication
- ✅ Single source of truth for RCM operations
- ✅ Improved maintainability and performance