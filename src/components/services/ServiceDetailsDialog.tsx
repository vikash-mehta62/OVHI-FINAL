import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Service } from '@/services/operations/servicesService';

interface ServiceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
}

const ServiceDetailsDialog: React.FC<ServiceDetailsDialogProps> = ({
  open,
  onOpenChange,
  service,
}) => {
  if (!service) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {service.service_name}
          </DialogTitle>
          <DialogDescription>
            Service details and information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Service Name
                  </label>
                  <p className="text-sm font-medium">{service.service_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Service Code
                  </label>
                  <p className="text-sm">
                    <Badge variant="outline">{service.service_code}</Badge>
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Unit Price
                </label>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(service.unit_price)}
                </p>
              </div>

              {service.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Description
                  </label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                    {service.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Service ID
                  </label>
                  <p className="text-sm font-mono">{service.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created At
                  </label>
                  <p className="text-sm">{formatDate(service.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p>
                  This service can be used in billing, appointments, and encounter documentation.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceDetailsDialog;