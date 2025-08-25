# Follow-up Management API Documentation

## Overview

The Follow-up Management API provides comprehensive task management capabilities for claims processing, including scheduling, assignment, tracking, and completion of follow-up activities.

## Base URL
```
/api/v1/rcm
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Follow-up Types

The system supports the following follow-up types:

| Type | Name | Default Priority | Est. Minutes | Escalation Days |
|------|------|------------------|--------------|-----------------|
| `payment_inquiry` | Payment Inquiry | medium | 30 | 7 |
| `denial_appeal` | Denial Appeal | high | 60 | 3 |
| `prior_auth` | Prior Authorization | high | 45 | 2 |
| `patient_contact` | Patient Contact | medium | 20 | 5 |
| `insurance_verification` | Insurance Verification | medium | 25 | 3 |
| `medical_records` | Medical Records | medium | 40 | 5 |
| `corrected_claim` | Corrected Claim | high | 35 | 2 |
| `timely_filing` | Timely Filing | urgent | 30 | 1 |
| `collections` | Collections | medium | 45 | 10 |
| `write_off_review` | Write-off Review | low | 20 | 14 |

## Priority Levels

- `urgent` - Requires immediate attention
- `high` - High priority, escalate quickly
- `medium` - Standard priority
- `low` - Low priority, can be delayed

## Status Values

- `pending` - Task is scheduled but not started
- `in_progress` - Task is currently being worked on
- `completed` - Task has been completed
- `overdue` - Task is past its due date
- `cancelled` - Task has been cancelled

## Endpoints

### 1. Get Follow-ups

Retrieve follow-ups with filtering and pagination.

**Endpoint:** `GET /followups`

**Query Parameters:**
- `claimId` (integer, optional) - Filter by specific claim ID
- `assignedUser` (integer, optional) - Filter by assigned user ID
- `createdBy` (integer, optional) - Filter by creator user ID
- `type` (string, optional) - Filter by follow-up type
- `status` (string, optional) - Filter by status (comma-separated for multiple)
- `priority` (string, optional) - Filter by priority level
- `dateFrom` (date, optional) - Filter from date (YYYY-MM-DD)
- `dateTo` (date, optional) - Filter to date (YYYY-MM-DD)
- `search` (string, optional) - Search in title and description
- `page` (integer, optional, default: 1) - Page number
- `limit` (integer, optional, default: 20) - Items per page
- `sortBy` (string, optional, default: 'scheduled_date') - Sort field
- `sortOrder` (string, optional, default: 'ASC') - Sort order (ASC/DESC)

**Response:**
```json
{
  "success": true,
  "message": "Follow-ups retrieved successfully",
  "data": {
    "followups": [
      {
        "id": 1,
        "claim_id": 123,
        "assigned_user_id": 5,
        "assigned_user_name": "John Doe",
        "created_by": 3,
        "created_by_name": "Jane Smith",
        "followup_type": "payment_inquiry",
        "followup_type_name": "Payment Inquiry",
        "title": "Follow up on payment status",
        "description": "Check with insurance about payment delay",
        "scheduled_date": "2024-01-15T09:00:00Z",
        "due_date": "2024-01-22T17:00:00Z",
        "priority": "medium",
        "status": "pending",
        "estimated_minutes": 30,
        "actual_minutes": null,
        "tags": ["insurance", "payment"],
        "escalation_level": 0,
        "reminder_sent": false,
        "patient_name": "Alice Johnson",
        "created_at": "2024-01-10T14:30:00Z",
        "updated_at": "2024-01-10T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    },
    "total": 45
  }
}
```

### 2. Get Claim Follow-ups

Retrieve follow-ups for a specific claim.

**Endpoint:** `GET /claims/{claimId}/followups`

**Path Parameters:**
- `claimId` (integer, required) - Claim ID

**Query Parameters:**
- `status` (string, optional) - Filter by status
- `priority` (string, optional) - Filter by priority
- `assignedUser` (integer, optional) - Filter by assigned user
- `page` (integer, optional, default: 1) - Page number
- `limit` (integer, optional, default: 20) - Items per page

**Response:** Same format as Get Follow-ups

### 3. Create Follow-up

Create a new follow-up task.

**Endpoint:** `POST /followups`

**Request Body:**
```json
{
  "claim_id": 123,
  "assigned_user_id": 5,
  "followup_type": "payment_inquiry",
  "title": "Follow up on payment status",
  "description": "Check with insurance about payment delay",
  "scheduled_date": "2024-01-15T09:00:00Z",
  "due_date": "2024-01-22T17:00:00Z",
  "priority": "medium",
  "estimated_minutes": 30,
  "tags": ["insurance", "payment"]
}
```

**Required Fields:**
- `claim_id` - Claim ID
- `assigned_user_id` - User ID to assign the task to
- `followup_type` - Type of follow-up
- `title` - Task title
- `scheduled_date` - When the task is scheduled

**Response:**
```json
{
  "success": true,
  "message": "Follow-up created successfully",
  "data": {
    "id": 1,
    "claim_id": 123,
    "assigned_user_id": 5,
    "assigned_user_name": "John Doe",
    "created_by": 3,
    "created_by_name": "Jane Smith",
    "followup_type": "payment_inquiry",
    "followup_type_name": "Payment Inquiry",
    "title": "Follow up on payment status",
    "description": "Check with insurance about payment delay",
    "scheduled_date": "2024-01-15T09:00:00Z",
    "due_date": "2024-01-22T17:00:00Z",
    "priority": "medium",
    "status": "pending",
    "estimated_minutes": 30,
    "actual_minutes": null,
    "tags": ["insurance", "payment"],
    "escalation_level": 0,
    "reminder_sent": false,
    "patient_name": "Alice Johnson",
    "created_at": "2024-01-10T14:30:00Z",
    "updated_at": "2024-01-10T14:30:00Z"
  }
}
```

### 4. Update Follow-up

Update an existing follow-up task.

**Endpoint:** `PUT /followups/{followUpId}`

**Path Parameters:**
- `followUpId` (integer, required) - Follow-up ID

**Request Body:**
```json
{
  "title": "Updated follow-up title",
  "description": "Updated description",
  "scheduled_date": "2024-01-16T10:00:00Z",
  "due_date": "2024-01-23T17:00:00Z",
  "priority": "high",
  "status": "in_progress",
  "assigned_user_id": 6,
  "estimated_minutes": 45,
  "actual_minutes": 35,
  "tags": ["insurance", "urgent"]
}
```

**Response:** Same format as Create Follow-up

### 5. Complete Follow-up

Mark a follow-up as completed with outcome details.

**Endpoint:** `POST /followups/{followUpId}/complete`

**Path Parameters:**
- `followUpId` (integer, required) - Follow-up ID

**Request Body:**
```json
{
  "outcome": "Contacted insurance, payment will be processed within 5 business days",
  "actual_minutes": 25,
  "next_followup_date": "2024-01-20T09:00:00Z",
  "next_followup_type": "payment_inquiry",
  "next_followup_title": "Verify payment received"
}
```

**Required Fields:**
- `outcome` - Description of the task outcome

**Response:**
```json
{
  "success": true,
  "message": "Follow-up completed successfully",
  "data": {
    "id": 1,
    "status": "completed",
    "outcome": "Contacted insurance, payment will be processed within 5 business days",
    "actual_minutes": 25,
    "completed_at": "2024-01-15T11:30:00Z",
    "next_followup_date": "2024-01-20T09:00:00Z"
  }
}
```

### 6. Delete Follow-up

Cancel/delete a follow-up task.

**Endpoint:** `DELETE /followups/{followUpId}`

**Path Parameters:**
- `followUpId` (integer, required) - Follow-up ID

**Response:**
```json
{
  "success": true,
  "message": "Follow-up deleted successfully",
  "data": {
    "deleted": true
  }
}
```

### 7. Get Follow-up Statistics

Retrieve statistics and metrics for follow-ups.

**Endpoint:** `GET /followups/statistics`

**Query Parameters:**
- `claimId` (integer, optional) - Filter by claim ID
- `assignedUser` (integer, optional) - Filter by assigned user
- `dateFrom` (date, optional) - Filter from date
- `dateTo` (date, optional) - Filter to date

**Response:**
```json
{
  "success": true,
  "message": "Follow-up statistics retrieved successfully",
  "data": {
    "statistics": {
      "total_followups": 150,
      "pending_count": 45,
      "in_progress_count": 20,
      "completed_count": 80,
      "overdue_count": 5,
      "urgent_count": 10,
      "high_priority_count": 25,
      "avg_actual_minutes": 32.5,
      "avg_estimated_minutes": 35.2,
      "unique_assignees": 8,
      "unique_claims": 95,
      "completion_rate": "53.33"
    },
    "type_breakdown": [
      {
        "followup_type": "payment_inquiry",
        "count": 45,
        "completed_count": 30
      },
      {
        "followup_type": "denial_appeal",
        "count": 25,
        "completed_count": 15
      }
    ],
    "daily_activity": [
      {
        "activity_date": "2024-01-15",
        "followup_count": 8,
        "completed_count": 5
      }
    ]
  }
}
```

### 8. Get Calendar Events

Retrieve follow-ups formatted for calendar display.

**Endpoint:** `GET /followups/calendar`

**Query Parameters:**
- `startDate` (date, optional) - Calendar start date
- `endDate` (date, optional) - Calendar end date
- `assignedUser` (integer, optional) - Filter by assigned user
- `claimId` (integer, optional) - Filter by claim ID

**Response:**
```json
{
  "success": true,
  "message": "Calendar events retrieved successfully",
  "data": {
    "events": [
      {
        "id": 1,
        "title": "Follow up on payment status",
        "start": "2024-01-15T09:00:00Z",
        "end": "2024-01-15T09:30:00Z",
        "description": "Check with insurance about payment delay",
        "priority": "medium",
        "status": "pending",
        "type": "payment_inquiry",
        "assignedUser": "John Doe",
        "patient": "Alice Johnson",
        "estimatedMinutes": 30,
        "color": "#ca8a04"
      }
    ]
  }
}
```

### 9. Search Follow-ups

Search follow-ups by text query.

**Endpoint:** `GET /followups/search`

**Query Parameters:**
- `query` (string, required) - Search query
- `claimId` (integer, optional) - Filter by claim ID
- `assignedUser` (integer, optional) - Filter by assigned user
- `followupType` (string, optional) - Filter by type
- `priority` (string, optional) - Filter by priority
- `status` (string, optional) - Filter by status
- `dateFrom` (date, optional) - Filter from date
- `dateTo` (date, optional) - Filter to date
- `page` (integer, optional, default: 1) - Page number
- `limit` (integer, optional, default: 20) - Items per page

**Response:**
```json
{
  "success": true,
  "message": "Follow-up search completed",
  "data": {
    "results": [
      {
        "id": 1,
        "title": "Follow up on payment status",
        "description": "Check with insurance about payment delay",
        "followup_type": "payment_inquiry",
        "priority": "medium",
        "status": "pending",
        "assigned_user_name": "John Doe",
        "patient_name": "Alice Johnson",
        "scheduled_date": "2024-01-15T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### 10. Process Overdue Follow-ups (Admin)

Process and escalate overdue follow-ups.

**Endpoint:** `POST /admin/followups/process-overdue`

**Response:**
```json
{
  "success": true,
  "message": "Overdue follow-ups processed successfully",
  "data": {
    "processed_count": 12,
    "escalated_count": 3,
    "overdue_followups": 12
  }
}
```

### 11. Send Follow-up Reminders (Admin)

Send reminder notifications for upcoming follow-ups.

**Endpoint:** `POST /admin/followups/send-reminders`

**Response:**
```json
{
  "success": true,
  "message": "Follow-up reminders sent successfully",
  "data": {
    "reminders_sent": 8,
    "total_eligible": 10
  }
}
```

## Error Responses

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Invalid input data
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `DATABASE_ERROR` - Database operation failed
- `INTERNAL_ERROR` - Internal server error

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- Standard endpoints: 100 requests per minute
- Search endpoints: 50 requests per minute
- Admin endpoints: 20 requests per minute

## Webhooks

The system can send webhook notifications for follow-up events:

### Events
- `followup.created` - New follow-up created
- `followup.updated` - Follow-up updated
- `followup.completed` - Follow-up completed
- `followup.overdue` - Follow-up became overdue
- `followup.escalated` - Follow-up escalated

### Webhook Payload
```json
{
  "event": "followup.created",
  "timestamp": "2024-01-15T14:30:00Z",
  "data": {
    "followup_id": 1,
    "claim_id": 123,
    "assigned_user_id": 5,
    "followup_type": "payment_inquiry",
    "priority": "medium",
    "status": "pending"
  }
}
```

## Best Practices

1. **Pagination**: Always use pagination for list endpoints to avoid performance issues
2. **Filtering**: Use appropriate filters to reduce data transfer
3. **Caching**: Results are cached for 3-5 minutes; use cache headers appropriately
4. **Error Handling**: Always check the `success` field in responses
5. **Rate Limiting**: Implement exponential backoff for rate limit errors
6. **Webhooks**: Use webhooks for real-time updates instead of polling

## Examples

### Create a Payment Inquiry Follow-up
```bash
curl -X POST /api/v1/rcm/followups \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "claim_id": 123,
    "assigned_user_id": 5,
    "followup_type": "payment_inquiry",
    "title": "Check payment status with Aetna",
    "description": "Claim submitted 30 days ago, no response",
    "scheduled_date": "2024-01-15T09:00:00Z",
    "priority": "high",
    "tags": ["aetna", "overdue"]
  }'
```

### Get Overdue Follow-ups
```bash
curl -X GET "/api/v1/rcm/followups?status=overdue&priority=urgent,high" \
  -H "Authorization: Bearer <token>"
```

### Complete Follow-up with Next Action
```bash
curl -X POST /api/v1/rcm/followups/123/complete \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "outcome": "Spoke with Aetna - claim approved, payment in 5 days",
    "actual_minutes": 15,
    "next_followup_date": "2024-01-20T09:00:00Z",
    "next_followup_type": "payment_inquiry",
    "next_followup_title": "Verify Aetna payment received"
  }'
```