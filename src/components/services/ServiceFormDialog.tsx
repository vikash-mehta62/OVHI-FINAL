import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { useToast } from '@/hooks/use-toast';
import { servicesService, Service, CreateServiceData } from '@/services/operations/servicesService';

const serviceSchema = z.object({
  service_name: z.string().min(1, 'Service name is required').max(255, 'Service name too long'),
  service_code: z.string().min(1, 'Service code is required').max(50, 'Service code too long'),
  description: z.string().optional(),
  unit_price: z.number().min(0, 'Price must be positive'),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onServiceSaved: () => void;
}

const ServiceFormDialog: React.FC<ServiceFormDialogProps> = ({
  open,
  onOpenChange,
  service,
  onServiceSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      service_name: '',
      service_code: '',
      description: '',
      unit_price: 0,
    },
  });

  // Reset form when dialog opens/closes or service changes
  useEffect(() => {
    if (open) {
      if (service) {
        // Editing existing service
        form.reset({
          service_name: service.service_name,
          service_code: service.service_code,
          description: service.description || '',
          unit_price: service.unit_price,
        });
      } else {
        // Creating new service
        form.reset({
          service_name: '',
          service_code: '',
          description: '',
          unit_price: 0,
        });
      }
    }
  }, [open, service, form]);

  const onSubmit = async (data: ServiceFormData) => {
    try {
      setLoading(true);

      const serviceData: CreateServiceData = {
        ...data,
      };

      if (service) {
        // Update existing service
        const response = await servicesService.updateService(service.id, serviceData);
        if (response.success) {
          toast({
            title: 'Success',
            description: response.message,
          });
          onServiceSaved();
        } else {
          toast({
            title: 'Error',
            description: response.message,
            variant: 'destructive',
          });
        }
      } else {
        // Create new service
        const response = await servicesService.createService(serviceData);
        if (response.success) {
          toast({
            title: 'Success',
            description: response.message,
          });
          onServiceSaved();
        } else {
          toast({
            title: 'Error',
            description: response.message,
            variant: 'destructive',
          });
        }
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



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {service ? 'Edit Service' : 'Create New Service'}
          </DialogTitle>
          <DialogDescription>
            {service 
              ? 'Update the service information below.'
              : 'Fill in the details to create a new service.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="service_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Office Visit - New Patient" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 99201" {...field} />
                    </FormControl>
                    <FormDescription>
                      CPT code or internal service code
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed description of the service..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Price *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Price in USD
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : service ? 'Update Service' : 'Create Service'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceFormDialog;