import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Download,
  Phone,
  Mail,
  FileText
} from 'lucide-react';
import { getARAgingReportAPI } from '@/services/operations/rcm';
import { formatCurrency, formatDate } from '@/utils/rcmFormatters';

const ARAgingManagement: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [arData, setArData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchARData = async () => {
    try {
      setLoading(true);
      const response = await getARAgingReportAPI(token);
      if (response.success) {
        setArData(response.data);
      }
    } catch (error) {
      console.error('Error fetching A/R aging data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchARData();
  }, []);



  const getCollectabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      high: { color: 'bg-red-500', text: 'High' },
      medium: { color: 'bg-yellow-500', text: 'Medium' },
      low: { color: 'bg-green-500', text: 'Low' }
    };
    
    const { color, text } = config[priority as keyof typeof config] || config.medium;
    
    return (
      <Badge className={`${color} text-white`}>
        {text}
      </Badge>
    );
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading A/R aging data...</span>
      </div>
    );
  }

  if (!arData) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <p>Unable to load A/R aging data</p>
        <Button onClick={fetchARData} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">A/R Aging Management</h2>
          <p className="text-muted-foreground">
            Monitor and manage accounts receivable aging
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchARData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total A/R</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(arData.totalAR)}</div>
            <p className="text-xs text-muted-foreground">
              Outstanding receivables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">0-30 Days</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(arData.arBuckets.find((b: any) => b.range === '0-30 days')?.amount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {arData.arBuckets.find((b: any) => b.range === '0-30 days')?.percentage || 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">31-90 Days</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                (arData.arBuckets.find((b: any) => b.range === '31-60 days')?.amount || 0) +
                (arData.arBuckets.find((b: any) => b.range === '61-90 days')?.amount || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires follow-up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">90+ Days</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                (arData.arBuckets.find((b: any) => b.range === '91-120 days')?.amount || 0) +
                (arData.arBuckets.find((b: any) => b.range === '120+ days')?.amount || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Critical collection
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A/R Aging Chart */}
        <Card>
          <CardHeader>
            <CardTitle>A/R Aging Distribution</CardTitle>
            <CardDescription>
              Outstanding amounts by aging bucket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={arData.arBuckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis tickFormatter={(value) => `${value / 1000}K`} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="amount" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Collectability Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Collectability Analysis</CardTitle>
            <CardDescription>
              Expected collection rates by aging bucket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={arData.arBuckets}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, collectability }) => `${range}: ${collectability}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="collectability"
                >
                  {arData.arBuckets.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* A/R Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>A/R Accounts</CardTitle>
          <CardDescription>
            Individual accounts requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Days Past Due</TableHead>
                <TableHead>Collectability</TableHead>
                <TableHead>Recommended Action</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arData.arAccounts.slice(0, 10).map((account: any) => (
                <TableRow key={account.account_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{account.patient_name}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {account.patient_id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{account.payer_name || 'Self Pay'}</TableCell>
                  <TableCell>
                    <div className="font-medium">{formatCurrency(account.balance)}</div>
                    <div className="text-sm text-muted-foreground">
                      Last service: {formatDate(account.last_service_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{account.days_past_due} days</div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-medium ${getCollectabilityColor(account.collectability_score)}`}>
                      {account.collectability_score}%
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{account.recommended_action}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {account.contact_method === 'phone' && (
                        <Button variant="outline" size="sm">
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                      {account.contact_method === 'email' && (
                        <Button variant="outline" size="sm">
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ARAgingManagement;