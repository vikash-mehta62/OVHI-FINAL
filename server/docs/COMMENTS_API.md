# Comments API Documentation

## Overview

The Comments API provides a comprehensive threaded conversation system for healthcare claims. It supports file attachments, user mentions, priority levels, and privacy controls to facilitate effective collaboration between team members.

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

### 1. Get Claim Comments

Retrieves all comments for a specific claim with threading support.

**Endpoint:** `GET /claims/:claimId/comments`

**Parameters:**
- `claimId` (path, required): The ID of the claim

**Query Parameters:**
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Number of comments per page (default: 20)
- `type` (string, optional): Filter by comment type (internal, external, follow_up, resolution, appeal, denial)
- `priority` (string, optional): Filter by priority (low, medium, high, urgent)
- `status` (string, optional): Filter by status (active, resolved, archived) (default: active)
- `search` (string, optional): Search in comment text
- `showPrivate` (boolean, optional): Include private comments (default: true)

**Request Example:**
```bash
GET /api/v1/rcm/claims/123/comments?page=1&limit=10&type=internal&priority=high
```

**Response:**
```json
{
  "success": true,
  "message": "Comments retrieved successfully",
  "data": {
    "comments": [
      {
        "id": 1,
        "claim_id": 123,
        "parent_comment_id": null,
        "user_id": 5,
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "user_avatar": "https://example.com/avatar.jpg",
        "comment_text": "This claim needs additional documentation.",
        "comment_type": "internal",
        "is_private": false,
        "priority": "high",
        "status": "active",
        "attachments": [
          {
            "original_name": "document.pdf",
            "filename": "1640995200000_document.pdf",
            "size": 1024000,
            "mimetype": "application/pdf",
            "uploaded_at": "2024-01-01T10:00:00Z"
          }
        ],
        "mentions": ["jane@example.com"],
        "created_at": "2024-01-01T10:00:00Z",
        "updated_at": "2024-01-01T10:00:00Z",
        "can_edit": true,
        "can_delete": true,
        "replies": [
          {
            "id": 2,
            "parent_comment_id": 1,
            "user_name": "Jane Smith",
            "comment_text": "I'll handle this right away.",
            "comment_type": "internal",
            "priority": "medium",
            "created_at": "2024-01-01T10:30:00Z"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    },
    "total": 25
  }
}
```

### 2. Create Comment

Creates a new comment or reply to an existing comment.

**Endpoint:** `POST /claims/:claimId/comments`

**Parameters:**
- `claimId` (path, required): The ID of the claim

**Request Body:**
```json
{
  "comment_text": "This is a new comment",
  "comment_type": "internal",
  "parent_comment_id": null,
  "is_private": false,
  "priority": "medium",
  "mentions": ["user@example.com"]
}
```

**File Upload:**
- Supports multipart/form-data for file attachments
- Maximum file size: 10MB
- Allowed file types: .pdf, .doc, .docx, .jpg, .jpeg, .png, .txt, .csv, .xlsx

**Response:**
```json
{
  "success": true,
  "message": "Comment created successfully",
  "data": {
    "id": 3,
    "claim_id": 123,
    "user_name": "Current User",
    "comment_text": "This is a new comment",
    "comment_type": "internal",
    "priority": "medium",
    "created_at": "2024-01-01T11:00:00Z"
  }
}
```

### 3. Update Comment

Updates an existing comment (only by the comment author or admin).

**Endpoint:** `PUT /comments/:commentId`

**Parameters:**
- `commentId` (path, required): The ID of the comment to update

**Request Body:**
```json
{
  "comment_text": "Updated comment text",
  "priority": "high",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": {
    "id": 3,
    "comment_text": "Updated comment text",
    "priority": "high",
    "updated_at": "2024-01-01T11:30:00Z"
  }
}
```

### 4. Delete Comment

Soft deletes a comment (archives it).

**Endpoint:** `DELETE /comments/:commentId`

**Parameters:**
- `commentId` (path, required): The ID of the comment to delete

**Response:**
```json
{
  "success": true,
  "message": "Comment deleted successfully",
  "data": {
    "deleted": true
  }
}
```

### 5. Get Comment Replies

Retrieves all replies to a specific comment.

**Endpoint:** `GET /comments/:commentId/replies`

**Parameters:**
- `commentId` (path, required): The ID of the parent comment

**Query Parameters:**
- `showPrivate` (boolean, optional): Include private replies (default: true)

**Response:**
```json
{
  "success": true,
  "message": "Replies retrieved successfully",
  "data": {
    "replies": [
      {
        "id": 4,
        "parent_comment_id": 3,
        "user_name": "Jane Smith",
        "comment_text": "Thanks for the update!",
        "created_at": "2024-01-01T12:00:00Z"
      }
    ]
  }
}
```

### 6. Search Comments

Searches comments across claims or within a specific claim.

**Endpoint:** `GET /comments/search`

**Query Parameters:**
- `query` (string, required): Search query
- `claimId` (number, optional): Limit search to specific claim
- `userId` (number, optional): Filter by comment author
- `commentType` (string, optional): Filter by comment type
- `priority` (string, optional): Filter by priority
- `dateFrom` (string, optional): Start date (YYYY-MM-DD)
- `dateTo` (string, optional): End date (YYYY-MM-DD)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (default: 20)

**Request Example:**
```bash
GET /api/v1/rcm/comments/search?query=documentation&claimId=123&priority=high
```

**Response:**
```json
{
  "success": true,
  "message": "Comment search completed",
  "data": {
    "results": [
      {
        "id": 1,
        "claim_id": 123,
        "patient_name": "John Patient",
        "user_name": "John Doe",
        "comment_text": "This claim needs additional documentation.",
        "comment_type": "internal",
        "priority": "high",
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### 7. Get Comment Statistics

Retrieves statistics about comments for analytics and reporting.

**Endpoint:** `GET /comments/statistics`

**Query Parameters:**
- `claimId` (number, optional): Get statistics for specific claim

**Response:**
```json
{
  "success": true,
  "message": "Comment statistics retrieved successfully",
  "data": {
    "statistics": {
      "total_comments": 150,
      "unique_commenters": 12,
      "internal_comments": 120,
      "external_comments": 30,
      "urgent_comments": 5,
      "private_comments": 25,
      "comments_with_attachments": 40,
      "avg_comment_length": 85.5
    },
    "recent_activity": [
      {
        "activity_date": "2024-01-01",
        "comment_count": 15
      },
      {
        "activity_date": "2023-12-31",
        "comment_count": 8
      }
    ]
  }
}
```

## Comment Types

- **internal**: Internal team communication (default)
- **external**: Communication with external parties
- **follow_up**: Requires follow-up action
- **resolution**: Resolution or solution provided
- **appeal**: Related to claim appeals
- **denial**: Related to claim denials

## Priority Levels

- **low**: Low priority (🟢)
- **medium**: Medium priority (🟡) (default)
- **high**: High priority (🟠)
- **urgent**: Urgent priority (🔴)

## Comment Status

- **active**: Active comment (default)
- **resolved**: Resolved/closed comment
- **archived**: Deleted/archived comment

## File Attachments

### Supported File Types
- Documents: .pdf, .doc, .docx, .txt
- Images: .jpg, .jpeg, .png
- Spreadsheets: .csv, .xlsx

### File Size Limits
- Maximum file size: 10MB per file
- Multiple files can be attached to a single comment

### File Storage
- Files are stored securely on the server
- Access is controlled through authentication
- Files are organized by claim ID

## User Mentions

### Mention Syntax
- Use `@username` or `@email` in comment text
- Mentioned users receive notifications

### Mention Notifications
- In-app notifications
- Email notifications (if enabled)
- Real-time updates in the UI

## Privacy Controls

### Private Comments
- Set `is_private: true` to create private comments
- Private comments are only visible to:
  - Comment author
  - System administrators
  - Users with appropriate permissions

### Access Control
- Users can only edit/delete their own comments
- Administrators can manage all comments
- Private comments respect user permissions

## Threading and Replies

### Thread Depth
- Maximum nesting depth: 3 levels
- Prevents overly deep conversation threads

### Reply Notifications
- Users are notified when someone replies to their comment
- Original comment author receives notifications for all replies

## Error Handling

### Common Error Codes

**400 Bad Request**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "comment_text",
      "message": "Comment text is required"
    }
  ]
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**403 Forbidden**
```json
{
  "success": false,
  "message": "Not authorized to edit this comment"
}
```

**404 Not Found**
```json
{
  "success": false,
  "message": "Comment not found"
}
```

**413 Payload Too Large**
```json
{
  "success": false,
  "message": "File size exceeds maximum limit (10MB)"
}
```

## Rate Limiting

- Comment creation: 30 requests per minute per user
- Comment updates: 60 requests per minute per user
- Search requests: 100 requests per minute per user

## Best Practices

### Comment Creation
1. Use appropriate comment types for better organization
2. Set priority levels to help with task management
3. Use mentions to notify relevant team members
4. Attach relevant files to provide context

### Threading
1. Reply to specific comments to maintain context
2. Avoid creating overly long threads
3. Use new top-level comments for new topics

### File Attachments
1. Use descriptive filenames
2. Compress large files when possible
3. Use appropriate file formats for the content

### Privacy
1. Mark sensitive information as private
2. Be mindful of who can see your comments
3. Use internal comments for team-only discussions

## Integration Examples

### React Component Integration
```typescript
import { useState, useEffect } from 'react';

const useComments = (claimId: number) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    const response = await fetch(`/api/v1/rcm/claims/${claimId}/comments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    setComments(data.data.comments);
    setLoading(false);
  };

  const addComment = async (commentData: any) => {
    const response = await fetch(`/api/v1/rcm/claims/${claimId}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commentData)
    });
    
    if (response.ok) {
      await fetchComments(); // Refresh comments
    }
  };

  useEffect(() => {
    fetchComments();
  }, [claimId]);

  return { comments, loading, addComment, fetchComments };
};
```

### File Upload Example
```javascript
const uploadCommentWithFiles = async (claimId, commentData, files) => {
  const formData = new FormData();
  
  // Add comment data
  Object.keys(commentData).forEach(key => {
    formData.append(key, commentData[key]);
  });
  
  // Add files
  files.forEach(file => {
    formData.append('attachments', file);
  });
  
  const response = await fetch(`/api/v1/rcm/claims/${claimId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};
```

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial release with basic commenting functionality
- Threaded conversations support
- File attachment system
- User mentions and notifications

### Version 1.1.0 (2024-02-01)
- Added comment search functionality
- Enhanced privacy controls
- Improved file upload handling
- Added comment statistics

## Support

For API support and questions:
- Documentation: `/api/v1/rcm/docs`
- Health Check: `/api/v1/rcm/health`
- Status: `/api/v1/rcm/status`