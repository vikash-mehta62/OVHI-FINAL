import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { servicesService, Service } from '@/services/operations/servicesService';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  onServiceDeleted: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  onOpenChange,
  service,
  onServiceDeleted,
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!service) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      const response = await servicesService.deleteService(service.id);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: response.message,
        });
        onServiceDeleted();
      } else {
        toast({
          title: 'Error',
          description: response.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Service
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the service
            from your system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{service.service_name}</span>
                <Badge variant="outline">{service.service_code}</Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Price: {formatCurrency(service.unit_price)}</span>
                <span>ID: {service.id}</span>
              </div>

              {service.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {service.description}
                </p>
              )}
            </div>
          </div>

          <div className="p-4 border border-amber-200 rounded-lg bg-amber-50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Warning</p>
                <p className="text-amber-700">
                  If this service is currently used in any bills or appointments, 
                  the deletion will fail. You may need to deactivate the service instead.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete Service'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmDialog;