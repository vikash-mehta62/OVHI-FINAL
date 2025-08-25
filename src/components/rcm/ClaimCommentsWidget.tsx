import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageSquare,
  Send,
  Plus,
  ChevronRight,
  Clock,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { formatDate } from '@/utils/rcmFormatters';

interface Comment {
  id: number;
  user_name: string;
  user_avatar?: string;
  comment_text: string;
  comment_type: string;
  priority: string;
  is_private: boolean;
  created_at: string;
  replies_count?: number;
}

interface ClaimCommentsWidgetProps {
  claimId: number;
  maxComments?: number;
  showAddComment?: boolean;
  onViewAll?: () => void;
  className?: string;
}

const ClaimCommentsWidget: React.FC<ClaimCommentsWidgetProps> = ({
  claimId,
  maxComments = 3,
  showAddComment = true,
  onViewAll,
  className = ''
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalComments, setTotalComments] = useState(0);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickComment, setQuickComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  // Fetch recent comments
  const fetchRecentComments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/v1/rcm/claims/${claimId}/comments?limit=${maxComments}&status=active`, {
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
        setTotalComments(data.data.total || 0);
      } else {
        throw new Error(data.message || 'Failed to fetch comments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Add quick comment
  const addQuickComment = async () => {
    if (!quickComment.trim()) return;

    try {
      setAddingComment(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/v1/rcm/claims/${claimId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment_text: quickComment,
          comment_type: 'internal',
          priority: 'medium',
          is_private: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const data = await response.json();
      
      if (data.success) {
        setQuickComment('');
        setShowQuickAdd(false);
        await fetchRecentComments();
      } else {
        throw new Error(data.message || 'Failed to add comment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  // Get comment type color
  const getCommentTypeColor = (type: string) => {
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

  // Get priority indicator
  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '';
    }
  };

  useEffect(() => {
    fetchRecentComments();
  }, [claimId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Recent Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Recent Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button 
              onClick={fetchRecentComments} 
              size="sm"
              variant="outline"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Recent Comments
            {totalComments > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalComments}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {showAddComment && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
            {totalComments > maxComments && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewAll}
                className="text-xs"
              >
                View All
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Quick add comment */}
        {showQuickAdd && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <Textarea
              value={quickComment}
              onChange={(e) => setQuickComment(e.target.value)}
              placeholder="Add a quick comment..."
              className="mb-3 min-h-[60px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowQuickAdd(false);
                  setQuickComment('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={addQuickComment}
                disabled={!quickComment.trim() || addingComment}
              >
                {addingComment ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Send className="h-3 w-3 mr-1" />
                )}
                Add
              </Button>
            </div>
          </div>
        )}

        {comments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No comments yet</p>
            {showAddComment && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickAdd(true)}
                className="mt-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add the first comment
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={comment.user_avatar} />
                  <AvatarFallback className="text-xs">
                    {comment.user_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">
                      {comment.user_name}
                    </span>
                    <Badge 
                      className={`text-xs ${getCommentTypeColor(comment.comment_type)}`}
                      variant="secondary"
                    >
                      {comment.comment_type}
                    </Badge>
                    {comment.priority !== 'medium' && (
                      <span className="text-xs" title={`${comment.priority} priority`}>
                        {getPriorityIndicator(comment.priority)}
                      </span>
                    )}
                    {comment.is_private && (
                      <EyeOff className="h-3 w-3 text-gray-400" title="Private comment" />
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-900 line-clamp-2 mb-1">
                    {comment.comment_text}
                  </p>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(comment.created_at)}</span>
                    </div>
                    {comment.replies_count && comment.replies_count > 0 && (
                      <span>{comment.replies_count} replies</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {totalComments > maxComments && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAll}
                  className="text-xs text-muted-foreground"
                >
                  View {totalComments - maxComments} more comments
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClaimCommentsWidget;