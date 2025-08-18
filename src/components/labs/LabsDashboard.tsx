import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Plus, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

interface LabOrder {
  id: string;
  patientName: string;
  patientId: string;
  orderDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  tests: string[];
  priority: 'routine' | 'urgent' | 'stat';
  providerId: string;
  facilityId: string;
}

interface LabResult {
  id: string;
  orderId: string;
  patientName: string;
  testName: string;
  result: string;
  status: 'pending' | 'completed' | 'reviewed';
  receivedDate: string;
  criticalFlag: boolean;
}

const LabsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchLabData();
  }, []);

  const fetchLabData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch lab orders
      const ordersResponse = await fetch('/api/v1/labs/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch lab results
      const resultsResponse = await fetch('/api/v1/labs/results', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (ordersResponse.ok && resultsResponse.ok) {
        const ordersData = await ordersResponse.json();
        const resultsData = await resultsResponse.json();
        
        setOrders(ordersData.orders || []);
        setResults(resultsData.results || []);
      }
    } catch (error) {
      console.error('Error fetching lab data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch lab data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
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
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredResults = results.filter(result => {
    const matchesSearch = result.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.testName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Stats calculations
  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    completedOrders: orders.filter(o => o.status === 'completed').length,
    criticalResults: results.filter(r => r.criticalFlag).length
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Laboratory Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // If we're on a sub-route, render the outlet
  if (location.pathname !== '/provider/labs') {
    return <Outlet />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Laboratory Management</h1>
        <Button onClick={() => navigate('/provider/labs/orders/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Lab Order
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Results</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalResults}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders or results..."
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
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Lab Orders</TabsTrigger>
          <TabsTrigger value="results">Lab Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders" className="space-y-4">
          <div className="grid gap-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/provider/labs/orders/${order.id}`)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{order.patientName}</CardTitle>
                      <CardDescription>Order ID: {order.id}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(order.status)}
                      {getStatusBadge(order.status)}
                      {getPriorityBadge(order.priority)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Order Date:</span>
                      <div>{new Date(order.orderDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tests:</span>
                      <div>{order.tests.length} test(s)</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Priority:</span>
                      <div className="capitalize">{order.priority}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="capitalize">{order.status.replace('_', ' ')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredOrders.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Lab Orders</h3>
                <p className="text-gray-500 text-center mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No orders match your current filters.' 
                    : 'Get started by creating your first lab order.'}
                </p>
                <Button onClick={() => navigate('/provider/labs/orders/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Lab Order
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="results" className="space-y-4">
          <div className="grid gap-4">
            {filteredResults.map((result) => (
              <Card key={result.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{result.patientName}</CardTitle>
                      <CardDescription>{result.testName}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {result.criticalFlag && (
                        <Badge variant="destructive">Critical</Badge>
                      )}
                      {getStatusBadge(result.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Received:</span>
                      <div>{new Date(result.receivedDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Order ID:</span>
                      <div>{result.orderId}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="capitalize">{result.status}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredResults.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Lab Results</h3>
                <p className="text-gray-500 text-center">
                  {searchTerm 
                    ? 'No results match your search criteria.' 
                    : 'Lab results will appear here once they are received.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LabsDashboard;