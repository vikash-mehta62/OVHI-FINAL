import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  User, Building, Phone, Mail, MapPin, Calendar, Clock,
  FileText, AlertCircle, CheckCircle, Edit, Send, Download,
  History, Paperclip, Eye, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { referralService, type Referral } from '@/services/referralService';
import { templateService } from '@/services/templateService';
import { StatusBadge } from './shared/StatusBadge';
import { UrgencyIndicator } from './shared/UrgencyIndicator';

interface ReferralDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referral: Referral | null;
  onStatusUpdate?: (referralId: string, newStatus: string, notes?: string) => void;
  onReferralUpdated?: () => void;
}

export const ReferralDetailsDialog: React.FC<ReferralDetailsDialogProps> = ({
  open,
  onOpenChange,
  referral,
  onStatusUpdate,
  onReferralUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [statusNotes, setStatusNotes] = useState('');
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState('');

  useEffect(() => {
    if (referral && open) {
      loadAuditTrail();
    }
  }, [referral, open]);

  const loadAuditTrail = async () => {
    if (!referral) return;
    
    try {
      const response = await referralService.getAuditTrail(referral.id);
      setAuditTrail(response.auditTrail || []);
    } catch (error) {
      console.error('Error loading audit trail:', error);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!referral) return;

    try {
      setLoading(true);
      await onStatusUpdate?.(referral.id, newStatus, statusNotes);
      setShowStatusUpdate(false);
      setStatusNotes('');
      setSelectedNewStatus('');
      onReferralUpdated?.();
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDocument = async (format: 'pdf' | 'html' | 'text' = 'pdf') => {
    if (!referral) return;

    try {
      setLoading(true);
      const response = await templateService.generateDocumentFormat(
        referral.id,
        'default', // Use default template
        { format, letterhead: true, digitalSignature: true }
      );
      
      if (response.success) {
        toast.success('Document generated successfully');
        // In a real app, you might download the file or open it
      }
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    } finally {
      setLoading(false);
    }
  };

  const getStatusActions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'draft':
        return [
          { label: 'Mark as Pending', status: 'pending' },
          { label: 'Send Referral', status: 'sent' }
        ];
      case 'pending':
        return [
          { label: 'Send Referral', status: 'sent' },
          { label: 'Cancel', status: 'cancelled' }
        ];
      case 'sent':
        return [
          { label: 'Mark as Scheduled', status: 'scheduled' },
          { label: 'Cancel', status: 'cancelled' }
        ];
      case 'scheduled':
        return [
          { label: 'Mark as Completed', status: 'completed' },
          { label: 'Cancel', status: 'cancelled' }
        ];
      default:
        return [];
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!referral) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center space-x-3">
                <span>Referral {referral.referral_number}</span>
                <StatusBadge status={referral.status} />
                <UrgencyIndicator urgency={referral.urgency_level} />
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Created {formatDate(referral.created_at)}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateDocument('pdf')}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Generate PDF
              </Button>
              
              {getStatusActions(referral.status).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStatusUpdate(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Update Status
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="specialist">Specialist</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            {/* Referral Information */}
            <Card>
              <CardHeader>
                <CardTitle>Referral Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Patient ID</Label>
                    <p className="text-sm">{referral.patient_id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Provider ID</Label>
                    <p className="text-sm">{referral.provider_id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Specialty</Label>
                    <p className="text-sm">{referral.specialty_type}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Appointment Type</Label>
                    <p className="text-sm">{referral.appointment_type}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Reason for Referral</Label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 rounded">{referral.referral_reason}</p>
                </div>

                {referral.clinical_notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Clinical Notes</Label>
                    <p className="text-sm mt-1 p-3 bg-gray-50 rounded whitespace-pre-wrap">
                      {referral.clinical_notes}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {referral.expected_duration && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Expected Duration</Label>
                      <p className="text-sm">{referral.expected_duration}</p>
                    </div>
                  )}
                  
                  {referral.scheduled_date && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Scheduled Date</Label>
                      <p className="text-sm">{formatDate(referral.scheduled_date)}</p>
                    </div>
                  )}
                </div>

                {/* Authorization Information */}
                {referral.authorization_required && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Prior Authorization Required</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs font-medium text-yellow-700">Status</Label>
                        <p className="text-yellow-800">
                          {referral.authorization_status || 'Pending'}
                        </p>
                      </div>
                      {referral.authorization_number && (
                        <div>
                          <Label className="text-xs font-medium text-yellow-700">Authorization Number</Label>
                          <p className="text-yellow-800">{referral.authorization_number}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specialist" className="space-y-6">
            {referral.specialist_name ? (
              <Card>
                <CardHeader>
                  <CardTitle>Specialist Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-3 text-gray-500" />
                    <div>
                      <p className="font-medium">{referral.specialist_name}</p>
                      <p className="text-sm text-gray-600">{referral.specialty_type}</p>
                    </div>
                  </div>

                  {referral.specialist_practice && (
                    <div className="flex items-center">
                      <Building className="h-5 w-5 mr-3 text-gray-500" />
                      <p className="text-sm">{referral.specialist_practice}</p>
                    </div>
                  )}

                  {referral.specialist_phone && (
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 mr-3 text-gray-500" />
                      <p className="text-sm">{referral.specialist_phone}</p>
                    </div>
                  )}

                  {referral.specialist_email && (
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 mr-3 text-gray-500" />
                      <p className="text-sm">{referral.specialist_email}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <User className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Specialist Selected</h3>
                  <p className="text-gray-500 text-center">
                    This referral was created for {referral.specialty_type} but no specific specialist was selected.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="attachments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Paperclip className="h-5 w-5 mr-2" />
                  Attachments ({referral.attachment_count || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {referral.attachment_count && referral.attachment_count > 0 ? (
                  <div className="space-y-3">
                    {/* This would be populated with actual attachment data */}
                    <p className="text-sm text-gray-500">
                      {referral.attachment_count} attachment(s) associated with this referral
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Paperclip className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No attachments</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <History className="h-5 w-5 mr-2" />
                  Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditTrail.length > 0 ? (
                  <div className="space-y-4">
                    {auditTrail.map((entry, index) => (
                      <div key={index} className="flex items-start space-x-3 pb-4 border-b last:border-b-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{entry.action}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(entry.createdAt)}
                            </p>
                          </div>
                          {entry.userFirstname && (
                            <p className="text-xs text-gray-600">
                              by {entry.userFirstname} {entry.userLastname}
                            </p>
                          )}
                          {entry.oldValues && Object.keys(entry.oldValues).length > 0 && (
                            <div className="mt-2 text-xs">
                              <p className="text-gray-600">Changes:</p>
                              <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(entry.newValues, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No audit trail available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Status Update Dialog */}
        {showStatusUpdate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Update Referral Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>New Status</Label>
                  <div className="space-y-2 mt-2">
                    {getStatusActions(referral.status).map((action) => (
                      <Button
                        key={action.status}
                        variant={selectedNewStatus === action.status ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSelectedNewStatus(action.status)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="status-notes">Notes (Optional)</Label>
                  <Textarea
                    id="status-notes"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Add any notes about this status change..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowStatusUpdate(false);
                      setSelectedNewStatus('');
                      setStatusNotes('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate(selectedNewStatus)}
                    disabled={!selectedNewStatus || loading}
                  >
                    {loading ? 'Updating...' : 'Update Status'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};