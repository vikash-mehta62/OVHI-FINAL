import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, Eye, Edit, Trash2, Download, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

interface LabOrder {
  id: string;
  patientName: string;
  patientId: string;
  orderDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  tests: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
  }>;
  priority: 'routine' | 'urgent' | 'stat';
  providerId: string;
  providerName: string;
  facilityId: string;
  facilityName: string;
  notes?: string;
  estimatedCompletionDate?: string;
}

const LabOrderList: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    fetchLabOrders();
  }, []);

  const fetchLabOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/labs/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        throw new Error('Failed to fetch lab orders');
      }
    } catch (error) {
      console.error('Error fetching lab orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch lab orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/labs/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setOrders(orders.filter(order => order.id !== orderId));
        toast({
          title: "Success",
          description: "Lab order deleted successfully"
        });
      } else {
        throw new Error('Failed to delete lab order');
      }
    } catch (error) {
      console.error('Error deleting lab order:', error);
      toast({
        title: "Error",
        description: "Failed to delete lab order",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = (order: LabOrder) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      in_progress: 'secondary',
      pending: 'outline',
      cancelled: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      stat: 'destructive',
      urgent: 'secondary',
      routine: 'outline'
    } as const;
    
    return <Badge variant={variants[priority as keyof typeof variants] || 'outline'}>{priority}</Badge>;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.providerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Lab Orders</h2>
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Lab Orders</h2>
        <Button onClick={() => navigate('/provider/labs/orders/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Lab Order
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, order ID, or provider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="stat">STAT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lab Orders ({filteredOrders.length})</CardTitle>
          <CardDescription>
            Manage and track laboratory orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Tests</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.patientName}</TableCell>
                  <TableCell>{order.providerName}</TableCell>
                  <TableCell>{order.tests.length} test(s)</TableCell>
                  <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(order)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/provider/labs/orders/${order.id}`)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteOrder(order.id)}
                        disabled={order.status === 'completed'}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Lab Orders Found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'No orders match your current filters.'
                  : 'Get started by creating your first lab order.'}
              </p>
              <Button onClick={() => navigate('/provider/labs/orders/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Lab Order
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lab Order Details</DialogTitle>
            <DialogDescription>
              Order ID: {selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Patient Information</h4>
                  <p><strong>Name:</strong> {selectedOrder.patientName}</p>
                  <p><strong>Patient ID:</strong> {selectedOrder.patientId}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Order Information</h4>
                  <p><strong>Provider:</strong> {selectedOrder.providerName}</p>
                  <p><strong>Facility:</strong> {selectedOrder.facilityName}</p>
                  <p><strong>Order Date:</strong> {new Date(selectedOrder.orderDate).toLocaleDateString()}</p>
                  {selectedOrder.estimatedCompletionDate && (
                    <p><strong>Est. Completion:</strong> {new Date(selectedOrder.estimatedCompletionDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Ordered Tests</h4>
                <div className="space-y-2">
                  {selectedOrder.tests.map((test) => (
                    <div key={test.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{test.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({test.code})</span>
                      </div>
                      {getStatusBadge(test.status)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  {getPriorityBadge(selectedOrder.priority)}
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/provider/labs/orders/${selectedOrder.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Order
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabOrderList;