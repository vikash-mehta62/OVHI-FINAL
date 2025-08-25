import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Share, 
  Users, 
  Mail, 
  Link, 
  Copy, 
  Eye, 
  Edit, 
  Download,
  MessageSquare,
  Clock,
  Shield,
  Globe,
  Lock,
  UserPlus,
  Settings,
  Trash2,
  Send
} from 'lucide-react';

interface SharedReport {
  id: string;
  reportId: string;
  reportName: string;
  reportType: string;
  sharedWith: string;
  shareType: 'user' | 'role' | 'public';
  permissions: {
    view: boolean;
    edit: boolean;
    export: boolean;
    share: boolean;
  };
  expiresAt?: string;
  sharedBy: string;
  sharedByName: string;
  createdAt: string;
  lastAccessed?: string;
}

interface ReportComment {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  commentText: string;
  commentType: 'note' | 'insight' | 'recommendation' | 'issue';
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface ReportSharingProps {
  reportId: string;
  reportName: string;
  reportType: string;
  onClose?: () => void;
}

const ReportSharing: React.FC<ReportSharingProps> = ({ 
  reportId, 
  reportName, 
  reportType, 
  onClose 
}) => {
  const [sharedReports, setSharedReports] = useState<SharedReport[]>([]);
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareForm, setShareForm] = useState({
    shareWith: '',
    shareType: 'user' as const,
    permissions: {
      view: true,
      edit: false,
      export: false,
      share: false
    },
    expiresAt: '',
    message: ''
  });
  const [newComment, setNewComment] = useState({
    text: '',
    type: 'note' as const,
    isPublic: false
  });
  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    fetchSharedReports();
    fetchComments();
    fetchUsers();
    generateShareLink();
  }, [reportId]);

  const fetchSharedReports = async () => {
    try {
      const response = await fetch(`/api/v1/rcm/reports/${reportId}/shares`);
      const data = await response.json();
      setSharedReports(data.shares || []);
    } catch (error) {
      console.error('Error fetching shared reports:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/v1/rcm/reports/${reportId}/comments`);
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/v1/users');
      const data = await response.json();
      setUsers(data.users || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const generateShareLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/reports/shared/${reportId}?token=${btoa(reportId + Date.now())}`;
    setShareLink(link);
  };

  const handleShareReport = async () => {
    try {
      const response = await fetch(`/api/v1/rcm/reports/${reportId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shareForm)
      });

      if (response.ok) {
        setShareDialogOpen(false);
        resetShareForm();
        fetchSharedReports();
      }
    } catch (error) {
      console.error('Error sharing report:', error);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      const response = await fetch(`/api/v1/rcm/reports/shares/${shareId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchSharedReports();
      }
    } catch (error) {
      console.error('Error revoking share:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.text.trim()) return;

    try {
      const response = await fetch(`/api/v1/rcm/reports/${reportId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newComment)
      });

      if (response.ok) {
        setNewComment({ text: '', type: 'note', isPublic: false });
        fetchComments();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    alert('Share link copied to clipboard!');
  };

  const resetShareForm = () => {
    setShareForm({
      shareWith: '',
      shareType: 'user',
      permissions: {
        view: true,
        edit: false,
        export: false,
        share: false
      },
      expiresAt: '',
      message: ''
    });
  };

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case 'insight':
        return 'bg-blue-100 text-blue-800';
      case 'recommendation':
        return 'bg-green-100 text-green-800';
      case 'issue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getShareTypeIcon = (shareType: string) => {
    switch (shareType) {
      case 'public':
        return <Globe className="h-4 w-4" />;
      case 'role':
        return <Users className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Share Report</h2>
          <p className="text-gray-500">{reportName}</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Share className="h-4 w-4 mr-2" />
                Share Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Share Report</DialogTitle>
                <DialogDescription>
                  Give others access to this report with specific permissions
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Share Type</Label>
                  <Select 
                    value={shareForm.shareType} 
                    onValueChange={(value) => setShareForm(prev => ({ ...prev, shareType: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Specific User</SelectItem>
                      <SelectItem value="role">User Role</SelectItem>
                      <SelectItem value="public">Public Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {shareForm.shareType === 'user' && (
                  <div className="space-y-2">
                    <Label>User</Label>
                    <Select 
                      value={shareForm.shareWith} 
                      onValueChange={(value) => setShareForm(prev => ({ ...prev, shareWith: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {shareForm.shareType === 'role' && (
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select 
                      value={shareForm.shareWith} 
                      onValueChange={(value) => setShareForm(prev => ({ ...prev, shareWith: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="analyst">Analyst</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={shareForm.permissions.view}
                        onCheckedChange={(checked) => 
                          setShareForm(prev => ({
                            ...prev,
                            permissions: { ...prev.permissions, view: checked as boolean }
                          }))
                        }
                      />
                      <Label className="text-sm">View report</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={shareForm.permissions.edit}
                        onCheckedChange={(checked) => 
                          setShareForm(prev => ({
                            ...prev,
                            permissions: { ...prev.permissions, edit: checked as boolean }
                          }))
                        }
                      />
                      <Label className="text-sm">Edit report</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={shareForm.permissions.export}
                        onCheckedChange={(checked) => 
                          setShareForm(prev => ({
                            ...prev,
                            permissions: { ...prev.permissions, export: checked as boolean }
                          }))
                        }
                      />
                      <Label className="text-sm">Export report</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={shareForm.permissions.share}
                        onCheckedChange={(checked) => 
                          setShareForm(prev => ({
                            ...prev,
                            permissions: { ...prev.permissions, share: checked as boolean }
                          }))
                        }
                      />
                      <Label className="text-sm">Share with others</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Expires At (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={shareForm.expiresAt}
                    onChange={(e) => setShareForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message (Optional)</Label>
                  <Textarea
                    value={shareForm.message}
                    onChange={(e) => setShareForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Add a message for the recipient"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleShareReport}>
                  <Send className="h-4 w-4 mr-2" />
                  Share Report
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="shares" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shares">Shared Access</TabsTrigger>
          <TabsTrigger value="link">Share Link</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="shares" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Shared Access</span>
              </CardTitle>
              <CardDescription>
                Manage who has access to this report and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sharedReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>This report hasn't been shared with anyone yet</p>
                  <Button className="mt-4" onClick={() => setShareDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Share Report
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sharedReports.map((share) => (
                    <div key={share.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          {getShareTypeIcon(share.shareType)}
                          <div>
                            <p className="font-medium">{share.sharedWith}</p>
                            <p className="text-sm text-gray-500">
                              Shared by {share.sharedByName} on {new Date(share.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          {share.permissions.view && <Badge variant="outline">View</Badge>}
                          {share.permissions.edit && <Badge variant="outline">Edit</Badge>}
                          {share.permissions.export && <Badge variant="outline">Export</Badge>}
                          {share.permissions.share && <Badge variant="outline">Share</Badge>}
                        </div>
                        
                        {share.expiresAt && (
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>Expires {new Date(share.expiresAt).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRevokeShare(share.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="link" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Link className="h-5 w-5" />
                <span>Share Link</span>
              </CardTitle>
              <CardDescription>
                Create a shareable link that anyone can use to access this report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input value={shareLink} readOnly className="flex-1" />
                <Button onClick={copyShareLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Security Notice</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Anyone with this link can view the report. Only share with trusted individuals.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Comments & Collaboration</span>
              </CardTitle>
              <CardDescription>
                Add comments, insights, and recommendations for this report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Comment Type</Label>
                    <Select 
                      value={newComment.type} 
                      onValueChange={(value) => setNewComment(prev => ({ ...prev, type: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="insight">Insight</SelectItem>
                        <SelectItem value="recommendation">Recommendation</SelectItem>
                        <SelectItem value="issue">Issue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-6">
                    <Checkbox
                      checked={newComment.isPublic}
                      onCheckedChange={(checked) => 
                        setNewComment(prev => ({ ...prev, isPublic: checked as boolean }))
                      }
                    />
                    <Label className="text-sm">Make comment public</Label>
                  </div>
                </div>
                
                <Textarea
                  value={newComment.text}
                  onChange={(e) => setNewComment(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Add your comment, insight, or recommendation..."
                  rows={3}
                />
                
                <Button onClick={handleAddComment} disabled={!newComment.text.trim()}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Comment
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No comments yet</p>
                    <p className="text-sm">Be the first to add insights or recommendations</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="border rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.userAvatar} />
                          <AvatarFallback>
                            {comment.userName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium">{comment.userName}</span>
                            <Badge className={getCommentTypeColor(comment.commentType)}>
                              {comment.commentType}
                            </Badge>
                            {comment.isPublic && (
                              <Badge variant="outline">
                                <Globe className="h-3 w-3 mr-1" />
                                Public
                              </Badge>
                            )}
                            <span className="text-sm text-gray-500">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          
                          <p className="text-sm">{comment.commentText}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportSharing;