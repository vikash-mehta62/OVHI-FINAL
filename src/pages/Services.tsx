import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { servicesService, Service } from '@/services/operations/servicesService';
import ServiceFormDialog from '@/components/services/ServiceFormDialog';
import ServiceDetailsDialog from '@/components/services/ServiceDetailsDialog';
import DeleteConfirmDialog from '@/components/services/DeleteConfirmDialog';

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Dialog states
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Load services
  useEffect(() => {
    loadServices();
  }, []);

  // Filter services based on search
  useEffect(() => {
    let filtered = services;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.service_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredServices(filtered);
  }, [services, searchTerm]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await servicesService.getAllServices();
      if (response.success) {
        setServices(response.services);
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



  const handleCreateService = () => {
    setEditingService(null);
    setIsFormDialogOpen(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setIsFormDialogOpen(true);
  };

  const handleViewService = (service: Service) => {
    setSelectedService(service);
    setIsDetailsDialogOpen(true);
  };

  const handleDeleteService = (service: Service) => {
    setSelectedService(service);
    setIsDeleteDialogOpen(true);
  };



  const handleServiceSaved = () => {
    loadServices();
    setIsFormDialogOpen(false);
  };

  const handleServiceDeleted = () => {
    loadServices();
    setIsDeleteDialogOpen(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Services Management</h1>
          <p className="text-muted-foreground">
            Manage your medical services, codes, and pricing
          </p>
        </div>
        <Button onClick={handleCreateService} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {services.length > 0
                ? formatCurrency(services.reduce((sum, s) => sum + s.unit_price, 0) / services.length)
                : '$0.00'
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredServices.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search services by name, code, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Services ({filteredServices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div className="font-medium">{service.service_name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{service.service_code}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate">
                        {service.description || 'No description'}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(service.unit_price)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewService(service)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditService(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteService(service)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredServices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No services found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ServiceFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        service={editingService}
        onServiceSaved={handleServiceSaved}
      />

      <ServiceDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        service={selectedService}
      />

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        service={selectedService}
        onServiceDeleted={handleServiceDeleted}
      />
    </div>
  );
};

export default Services;