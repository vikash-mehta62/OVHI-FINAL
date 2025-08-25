# CMS Validation API Documentation

## Overview

The CMS Validation API provides comprehensive validation services for healthcare claims to ensure compliance with CMS (Centers for Medicare & Medicaid Services) guidelines. This API includes real-time validation, NPI verification, NCCI edit checking, and comprehensive error reporting.

## Base URL

```
/api/v1/rcm
```

## Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer <token>
```

## Endpoints

### 1. Validate Existing Claim

Validates an existing claim against CMS guidelines.

**Endpoint:** `POST /claims/:claimId/validate`

**Parameters:**
- `claimId` (path, required): The ID of the claim to validate

**Query Parameters:**
- `skipWarnings` (boolean, optional): Skip warning-level validations (default: false)
- `includeRecommendations` (boolean, optional): Include improvement recommendations (default: true)
- `validateMedicalNecessity` (boolean, optional): Perform medical necessity validation (default: true)
- `saveResult` (boolean, optional): Save validation result to database (default: true)

**Request Example:**
```bash
POST /api/v1/rcm/claims/123/validate?includeRecommendations=true&saveResult=true
```

**Response:**
```json
{
  "success": true,
  "message": "Claim validation completed",
  "data": {
    "isValid": true,
    "status": "valid",
    "errors": [],
    "warnings": [
      {
        "code": "CMS_TIMELY_FILING_WARNING",
        "field": "service_date",
        "message": "Claim approaching timely filing limit (335 days since service)",
        "severity": "warning",
        "cmsReference": "CMS Timely Filing Rules"
      }
    ],
    "recommendations": [
      {
        "type": "warning_resolution",
        "message": "Review and resolve validation warnings to improve claim acceptance rates",
        "priority": "medium"
      }
    ],
    "validationSummary": {
      "totalChecks": 15,
      "passedChecks": 14,
      "failedChecks": 0,
      "warningChecks": 1
    },
    "cmsCompliance": {
      "npiValidation": true,
      "taxonomyValidation": true,
      "placeOfServiceValidation": true,
      "codeValidation": true,
      "dateValidation": true,
      "timelyFilingValidation": true
    }
  }
}
```

### 2. Validate Claim Data (Real-time)

Validates claim data in real-time during form entry without requiring a saved claim.

**Endpoint:** `POST /claims/validate`

**Query Parameters:**
- `skipWarnings` (boolean, optional): Skip warning-level validations (default: false)
- `includeRecommendations` (boolean, optional): Include improvement recommendations (default: false)
- `validateMedicalNecessity` (boolean, optional): Perform medical necessity validation (default: false)

**Request Body:**
```json
{
  "patient_id": 123,
  "patient_name": "John Doe",
  "npi_number": "1234567890",
  "taxonomy_code": "207Q00000X",
  "place_of_service": "11",
  "procedure_code": "99213",
  "diagnosis_code": "I10",
  "service_date": "2024-01-15",
  "total_amount": 150.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Claim data validation completed",
  "data": {
    "isValid": true,
    "status": "valid",
    "errors": [],
    "warnings": [],
    "validationSummary": {
      "totalChecks": 12,
      "passedChecks": 12,
      "failedChecks": 0,
      "warningChecks": 0
    },
    "cmsCompliance": {
      "npiValidation": true,
      "taxonomyValidation": true,
      "placeOfServiceValidation": true,
      "codeValidation": true,
      "dateValidation": true,
      "timelyFilingValidation": true
    }
  }
}
```

### 3. Validate NPI Number

Validates a National Provider Identifier (NPI) number format and checksum.

**Endpoint:** `POST /cms/npi/validate`

**Request Body:**
```json
{
  "npi": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "NPI validation completed",
  "data": {
    "npi": "1234567890",
    "isValid": true,
    "errors": [],
    "warnings": []
  }
}
```

**Error Response:**
```json
{
  "success": true,
  "message": "NPI validation completed",
  "data": {
    "npi": "1234567891",
    "isValid": false,
    "errors": [
      {
        "code": "NPI_CHECKSUM",
        "message": "NPI checksum is invalid"
      }
    ],
    "warnings": []
  }
}
```

### 4. Check NCCI Edits

Checks for National Correct Coding Initiative (NCCI) edits between procedure codes.

**Endpoint:** `POST /cms/ncci/check`

**Request Body:**
```json
{
  "procedureCodes": ["99213", "36415"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "NCCI edit check completed",
  "data": {
    "procedureCodes": ["99213", "36415"],
    "hasEdits": true,
    "edits": [
      {
        "primaryCode": "99213",
        "conflictingCodes": ["36415"],
        "message": "Procedure 99213 has NCCI edit conflicts"
      }
    ],
    "warnings": []
  }
}
```

### 5. Get CMS Validation Rules

Retrieves current CMS validation rules from the system.

**Endpoint:** `GET /cms/validation-rules`

**Query Parameters:**
- `ruleType` (string, optional): Filter by rule type (field_required, code_validation, etc.)
- `isActive` (boolean, optional): Filter by active status (default: true)

**Response:**
```json
{
  "success": true,
  "message": "CMS validation rules retrieved successfully",
  "data": {
    "rules": [
      {
        "id": "CMS_001",
        "rule_name": "NPI Number Required",
        "rule_type": "field_required",
        "description": "NPI number is required for all claims",
        "severity": "error",
        "conditions": {
          "field": "npi_number",
          "required": true
        },
        "error_message": "NPI number is required for claim submission",
        "cms_reference": "CMS-1500 Box 24J",
        "is_active": true,
        "effective_date": "2024-01-01"
      }
    ],
    "total": 1
  }
}
```

## Validation Error Codes

### NPI Validation Errors
- `NPI_FORMAT`: NPI must be exactly 10 digits
- `NPI_CHECKSUM`: NPI checksum is invalid

### CMS Validation Errors
- `CMS_001`: NPI number is required for all claims
- `CMS_002`: NPI number must be exactly 10 digits
- `CMS_003`: Provider taxonomy code is required
- `CMS_004`: Place of service code is required
- `CMS_005`: Service date cannot be in the future
- `CMS_006`: Claim exceeds timely filing limit

### Field Validation Errors
- `CMS_REQUIRED_FIELD`: Required field is missing
- `CMS_TAXONOMY_FORMAT`: Taxonomy code format is invalid
- `CMS_POS_FORMAT`: Place of service format is invalid
- `CMS_CPT_FORMAT`: CPT code format is invalid
- `CMS_ICD10_FORMAT`: ICD-10-CM code format is invalid

### NCCI Edit Codes
- `CMS_NCCI_EDIT`: Procedure code has NCCI edit conflicts

### Medical Necessity Codes
- `CMS_MEDICAL_NECESSITY`: Medical necessity may not be established

## Error Response Format

All validation endpoints return errors in a consistent format:

```json
{
  "code": "CMS_001",
  "field": "npi_number",
  "message": "NPI number is required for claim submission",
  "severity": "error",
  "cmsReference": "CMS-1500 Box 24J",
  "suggestedFix": "Enter a valid 10-digit NPI number"
}
```

## Rate Limiting

- Real-time validation endpoints: 100 requests per minute per user
- Batch validation endpoints: 10 requests per minute per user
- NPI validation: 200 requests per minute per user

## Best Practices

### Real-time Validation
1. Use debouncing (1000ms recommended) to avoid excessive API calls
2. Only validate when minimum required fields are present
3. Cache validation results for identical data
4. Handle network errors gracefully with fallback validation

### Error Handling
1. Always check the `success` field in responses
2. Display user-friendly error messages from the `message` field
3. Use `cmsReference` for additional context
4. Implement retry logic for network failures

### Performance Optimization
1. Validate only changed fields when possible
2. Use batch validation for multiple claims
3. Implement client-side caching for validation rules
4. Consider using WebSocket connections for real-time updates

## Integration Examples

### React Hook Integration
```typescript
import { useCMSValidation } from '@/hooks/useCMSValidation';

const MyComponent = () => {
  const { validateClaim, validationResult, isValidating } = useCMSValidation();
  
  const handleValidate = async () => {
    await validateClaim(claimData);
  };
  
  return (
    <div>
      {validationResult && (
        <ValidationIndicator 
          isValid={validationResult.isValid}
          errors={validationResult.errors}
          warnings={validationResult.warnings}
        />
      )}
    </div>
  );
};
```

### Direct API Integration
```javascript
const validateClaim = async (claimData) => {
  try {
    const response = await fetch('/api/v1/rcm/claims/validate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(claimData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Validation result:', result.data);
    } else {
      console.error('Validation failed:', result.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial release with basic CMS validation
- NPI number validation
- Real-time claim validation
- NCCI edit checking

### Version 1.1.0 (2024-02-01)
- Added medical necessity validation
- Enhanced error reporting with CMS references
- Added validation recommendations
- Improved performance with caching

## Support

For API support and questions:
- Documentation: `/api/v1/rcm/docs`
- Health Check: `/api/v1/rcm/health`
- Status: `/api/v1/rcm/status`