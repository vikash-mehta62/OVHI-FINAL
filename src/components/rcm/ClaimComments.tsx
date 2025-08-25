import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  Reply,
  Send,
  Paperclip,
  MoreVertical,
  Edit,
  Trash2,
  Flag,
  Eye,
  EyeOff,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Filter,
  Search,
  AtSign
} from 'lucide-react';
import { formatDate } from '@/utils/rcmFormatters';

interface Comment {
  id: number;
  claim_id: number;
  parent_comment_id?: number;
  user_id: number;
  comment_text: string;
  comment_type: 'internal' | 'external' | 'follow_up' | 'resolution' | 'appeal' | 'denial';
  is_private: boolean;
  is_system_generated: boolean;
  attachments?: any[];
  mentions?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'resolved' | 'archived';
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
  replies?: Comment[];
  can_edit: boolean;
  can_delete: boolean;
}

interface ClaimCommentsProps {
  claimId: number;
  currentUserId?: number;
  className?: string;
}

const ClaimComments: React.FC<ClaimCommentsProps> = ({
  claimId,
  currentUserId,
  className = ''
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<Comment['comment_type']>('internal');
  const [priority, setPriority] = useState<Comment['priority']>('medium');
  const [isPrivate, setIsPrivate] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  
  // Filters
  const [filters, setFilters] = useState({
    type: '',
    priority: '',
    status: 'active',
    search: '',
    showPrivate: true
  });
  const [showFilters, setShowFilters] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch comments
  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const queryParams = new URLSearchParams({
        ...(filters.type && { type: filters.type }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        showPrivate: filters.showPrivate.toString()
      });

      const response = await fetch(`/api/v1/rcm/claims/${claimId}/comments?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      
      if (data.success) {
        setComments(data.data.comments || []);
      } else {
        throw new Error(data.message || 'Failed to fetch comments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Add new comment
  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const formData = new FormData();
      formData.append('comment_text', newComment);
      formData.append('comment_type', commentType);
      formData.append('priority', priority);
      formData.append('is_private', isPrivate.toString());
      if (replyingTo) {
        formData.append('parent_comment_id', replyingTo.toString());
      }
      if (mentions.length > 0) {
        formData.append('mentions', JSON.stringify(mentions));
      }

      // Add attachments
      attachments.forEach((file, index) => {
        formData.append(`attachments`, file);
      });

      const response = await fetch(`/api/v1/rcm/claims/${claimId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const data = await response.json();
      
      if (data.success) {
        // Reset form
        setNewComment('');
        setReplyingTo(null);
        setAttachments([]);
        setMentions([]);
        
        // Refresh comments
        await fetchComments();
      } else {
        throw new Error(data.message || 'Failed to add comment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    }
  };

  // Edit comment
  const editComment = async (commentId: number) => {
    if (!editText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/v1/rcm/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment_text: editText
        })
      });

      if (!response.ok) {
        throw new Error('Failed to edit comment');
      }

      const data = await response.json();
      
      if (data.success) {
        setEditingComment(null);
        setEditText('');
        await fetchComments();
      } else {
        throw new Error(data.message || 'Failed to edit comment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit comment');
    }
  };

  // Delete comment
  const deleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/v1/rcm/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchComments();
      } else {
        throw new Error(data.message || 'Failed to delete comment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  };

  // Handle file attachment
  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Handle mention detection
  const handleTextChange = (text: string) => {
    setNewComment(text);
    
    // Detect @ mentions
    const mentionMatch = text.match(/@(\w*)$/);
    if (mentionMatch) {
      setShowMentionSuggestions(true);
      // In a real app, you'd fetch user suggestions here
      setMentionSuggestions([
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
      ]);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  // Get comment type color
  const getCommentTypeColor = (type: Comment['comment_type']) => {
    switch (type) {
      case 'internal': return 'bg-blue-100 text-blue-800';
      case 'external': return 'bg-green-100 text-green-800';
      case 'follow_up': return 'bg-yellow-100 text-yellow-800';
      case 'resolution': return 'bg-emerald-100 text-emerald-800';
      case 'appeal': return 'bg-purple-100 text-purple-800';
      case 'denial': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: Comment['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Render comment thread
  const renderComment = (comment: Comment, level = 0) => {
    const isEditing = editingComment === comment.id;
    const canReply = level < 3; // Limit nesting depth

    return (
      <div key={comment.id} className={`${level > 0 ? 'ml-8 mt-4' : 'mb-6'}`}>
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          {/* Comment header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.user_avatar} />
                <AvatarFallback>
                  {comment.user_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{comment.user_name}</span>
                  <Badge className={`text-xs ${getCommentTypeColor(comment.comment_type)}`}>
                    {comment.comment_type}
                  </Badge>
                  {comment.priority !== 'medium' && (
                    <Badge className={`text-xs ${getPriorityColor(comment.priority)}`}>
                      {comment.priority}
                    </Badge>
                  )}
                  {comment.is_private && (
                    <Badge variant="outline" className="text-xs">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Private
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {formatDate(comment.created_at)}
                  {comment.updated_at !== comment.created_at && (
                    <span>(edited)</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Comment actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canReply && (
                  <DropdownMenuItem onClick={() => setReplyingTo(comment.id)}>
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                )}
                {comment.can_edit && (
                  <DropdownMenuItem onClick={() => {
                    setEditingComment(comment.id);
                    setEditText(comment.comment_text);
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {comment.can_delete && (
                  <DropdownMenuItem 
                    onClick={() => deleteComment(comment.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Comment content */}
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => editComment(comment.id)}>
                  Save
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setEditingComment(null);
                    setEditText('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-900 whitespace-pre-wrap">
                {comment.comment_text}
              </p>
              
              {/* Attachments */}
              {comment.attachments && comment.attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Attachments:</div>
                  <div className="flex flex-wrap gap-2">
                    {comment.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                        <Paperclip className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{attachment.name}</span>
                        <Button variant="ghost" size="sm">
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mentions */}
              {comment.mentions && comment.mentions.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <AtSign className="h-4 w-4" />
                  <span>Mentioned: {comment.mentions.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {/* Reply form */}
          {replyingTo === comment.id && (
            <div className="mt-4 pt-4 border-t">
              <div className="space-y-3">
                <Textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[80px]"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Attach
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileAttachment}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addComment}>
                      <Send className="h-4 w-4 mr-2" />
                      Reply
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setReplyingTo(null);
                        setNewComment('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4">
            {comment.replies.map(reply => renderComment(reply, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Initial load
  useEffect(() => {
    fetchComments();
  }, [claimId, filters]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments & Collaboration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading comments...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments & Collaboration
            {comments.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {comments.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchComments}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={filters.type} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, type: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="resolution">Resolution</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.priority} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, priority: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, status: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search comments..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {/* New comment form */}
        {!replyingTo && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={commentType} onValueChange={(value: Comment['comment_type']) => setCommentType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal Note</SelectItem>
                    <SelectItem value="external">External Communication</SelectItem>
                    <SelectItem value="follow_up">Follow-up Required</SelectItem>
                    <SelectItem value="resolution">Resolution</SelectItem>
                    <SelectItem value="appeal">Appeal</SelectItem>
                    <SelectItem value="denial">Denial</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priority} onValueChange={(value: Comment['priority']) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="private"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="private" className="text-sm">Private comment</label>
                </div>
              </div>

              <div className="relative">
                <Textarea
                  value={newComment}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Add a comment... Use @ to mention team members"
                  className="min-h-[100px]"
                />
                
                {/* Mention suggestions */}
                {showMentionSuggestions && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-10 mt-1">
                    {mentionSuggestions.map((user) => (
                      <div
                        key={user.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                        onClick={() => {
                          const newText = newComment.replace(/@\w*$/, `@${user.name} `);
                          setNewComment(newText);
                          setMentions(prev => [...prev, user.email]);
                          setShowMentionSuggestions(false);
                        }}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Attachments:</div>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                        <Paperclip className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attach Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileAttachment}
                />
                <Button onClick={addComment} disabled={!newComment.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Add Comment
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Comments list */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No comments yet</p>
            <p className="text-sm">Start the conversation by adding the first comment</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map(comment => renderComment(comment))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClaimComments;