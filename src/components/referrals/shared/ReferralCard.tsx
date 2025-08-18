import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Clock, User, Building, Phone, Mail, 
  FileText, AlertCircle, CheckCircle, XCircle, 
  Eye, Edit, Send, Archive, MoreHorizontal,
  Paperclip
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StatusBadge } from './StatusBadge';
import { UrgencyIndicator } from './UrgencyIndicator';
import { type Referral } from '@/services/referralService';

interface ReferralCardProps {
  referral: Referral;
  onClick?: (referral: Referral) => void;
  onStatusUpdate?: (referralId: string, newStatus: string, notes?: string) => void;
  onEdit?: (referral: Referral) => void;
  onGenerateDocument?: (referral: Referral) => void;
  onSendReferral?: (referral: Referral) => void;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({
  referral,
  onClick,
  onStatusUpdate,
  onEdit,
  onGenerateDocument,
  onSendReferral
}) => {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick?.(referral);
  };

  const handleStatusUpdate = (newStatus: string) => {
    onStatusUpdate?.(referral.id, newStatus);
  };

  const getStatusActions = () => {
    switch (referral.status) {
      case 'draft':
        return [
          { label: 'Mark as Pending', status: 'pending', icon: Clock },
          { label: 'Send Referral', status: 'sent', icon: Send }
        ];
      case 'pending':
        return [
          { label: 'Send Referral', status: 'sent', icon: Send },
          { label: 'Cancel', status: 'cancelled', icon: XCircle }
        ];
      case 'sent':
        return [
          { label: 'Mark as Scheduled', status: 'scheduled', icon: Calendar },
          { label: 'Cancel', status: 'cancelled', icon: XCircle }
        ];
      case 'scheduled':
        return [
          { label: 'Mark as Completed', status: 'completed', icon: CheckCircle },
          { label: 'Cancel', status: 'cancelled', icon: XCircle }
        ];
      default:
        return [];
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <UrgencyIndicator urgency={referral.urgency_level} />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-lg">{referral.referral_number}</h3>
                <StatusBadge status={referral.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {referral.specialty_type} • Created {formatDate(referral.created_at)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {referral.attachment_count && referral.attachment_count > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Paperclip className="h-3 w-3 mr-1" />
                {referral.attachment_count}
              </Badge>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onClick?.(referral)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(referral)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Referral
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onGenerateDocument?.(referral)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Letter
                </DropdownMenuItem>
                {getStatusActions().map((action) => (
                  <DropdownMenuItem 
                    key={action.status}
                    onClick={() => handleStatusUpdate(action.status)}
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Referral Reason */}
          <div className="col-span-full">
            <h4 className="font-medium text-sm text-gray-700 mb-1">Reason for Referral</h4>
            <p className="text-sm text-gray-600 line-clamp-2">
              {referral.referral_reason}
            </p>
          </div>

          {/* Specialist Information */}
          {referral.specialist_name && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Specialist</h4>
              <div className="space-y-1">
                <div className="flex items-center text-sm">
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  {referral.specialist_name}
                </div>
                {referral.specialist_practice && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Building className="h-4 w-4 mr-2 text-gray-400" />
                    {referral.specialist_practice}
                  </div>
                )}
                {referral.specialist_phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {referral.specialist_phone}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Appointment Information */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-1">Appointment</h4>
            <div className="space-y-1">
              <div className="flex items-center text-sm">
                <FileText className="h-4 w-4 mr-2 text-gray-400" />
                {referral.appointment_type}
              </div>
              {referral.scheduled_date && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {formatDate(referral.scheduled_date)}
                </div>
              )}
              {referral.expected_duration && (
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  {referral.expected_duration}
                </div>
              )}
            </div>
          </div>

          {/* Status Information */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-1">Status</h4>
            <div className="space-y-1">
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                Updated {formatDate(referral.updated_at)}
              </div>
              {referral.authorization_required && (
                <div className="flex items-center text-sm">
                  <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
                  <span className="text-yellow-700">Authorization Required</span>
                  {referral.authorization_status && (
                    <Badge 
                      variant={referral.authorization_status === 'approved' ? 'default' : 'secondary'}
                      className="ml-2 text-xs"
                    >
                      {referral.authorization_status}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center space-x-2">
            {getStatusActions().slice(0, 2).map((action) => (
              <Button
                key={action.status}
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusUpdate(action.status);
                }}
              >
                <action.icon className="h-4 w-4 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>
          
          <div className="text-xs text-gray-500">
            ID: {referral.id.slice(-8)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};