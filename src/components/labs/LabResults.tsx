import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Eye, Download, AlertTriangle, CheckCircle, Clock, FileText, Filter } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface LabResult {
  id: string;
  orderId: string;
  patientId: string;
  patientName: string;
  testName: string;
  testCode: string;
  result: string;
  referenceRange: string;
  units: string;
  status: 'pending' | 'completed' | 'reviewed' | 'amended';
  criticalFlag: boolean;
  abnormalFlag: boolean;
  receivedDate: string;
  reportedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
  comments?: string;
  facility: string;
  providerName: string;
}

interface ResultDetail {
  id: string;
  resultId: string;
  parameter: string;
  value: string;
  referenceRange: string;
  units: string;
  flag: 'normal' | 'high' | 'low' | 'critical' | 'abnormal';
}

const LabResults: React.FC = () => {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [flagFilter, setFlagFilter] = useState('all');
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);
  const [resultDetails, setResultDetails] = useState<ResultDetail[]>([]);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    fetchLabResults();
  }, []);

  const fetchLabResults = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/labs/results', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        throw new Error('Failed to fetch lab results');
      }
    } catch (error) {
      console.error('Error fetching lab results:', error);
      toast({
        title: "Error",
        description: "Failed to fetch lab results",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchResultDetails = async (resultId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/labs/results/${resultId}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setResultDetails(data.details || []);
      }
    } catch (error) {
      console.error('Error fetching result details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch result details",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = async (result: LabResult) => {
    setSelectedResult(result);
    await fetchResultDetails(result.id);
    setShowDetailsDialog(true);
  };

  const handleMarkReviewed = async (resultId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/labs/results/${resultId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setResults(results.map(result => 
          result.id === resultId 
            ? { ...result, status: 'reviewed', reviewedDate: new Date().toISOString() }
            : result
        ));
        toast({
          title: "Success",
          description: "Result marked as reviewed"
        });
      }
    } catch (error) {
      console.error('Error marking result as reviewed:', error);
      toast({
        title: "Error",
        description: "Failed to mark result as reviewed",
        variant: "destructive"
      });
    }
  };

  const handleDownloadResult = async (resultId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/labs/results/${resultId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lab-result-${resultId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading result:', error);
      toast({
        title: "Error",
        description: "Failed to download result",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'reviewed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      reviewed: 'secondary',
      pending: 'outline',
      amended: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  const getFlagBadge = (result: LabResult) => {
    if (result.criticalFlag) {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (result.abnormalFlag) {
      return <Badge variant="secondary">Abnormal</Badge>;
    }
    return <Badge variant="outline">Normal</Badge>;
  };

  const getParameterFlagIcon = (flag: string) => {
    switch (flag) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <span className="text-red-500">↑</span>;
      case 'low':
        return <span className="text-blue-500">↓</span>;
      case 'abnormal':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const filteredResults = results.filter(result => {
    const matchesSearch = result.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || result.status === statusFilter;
    const matchesFlag = flagFilter === 'all' || 
                       (flagFilter === 'critical' && result.criticalFlag) ||
                       (flagFilter === 'abnormal' && result.abnormalFlag) ||
                       (flagFilter === 'normal' && !result.criticalFlag && !result.abnormalFlag);
    return matchesSearch && matchesStatus && matchesFlag;
  });

  // Separate results by status for tabs
  const pendingResults = filteredResults.filter(r => r.status === 'pending');
  const completedResults = filteredResults.filter(r => r.status === 'completed');
  const reviewedResults = filteredResults.filter(r => r.status === 'reviewed');
  const criticalResults = filteredResults.filter(r => r.criticalFlag);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Lab Results</h2>
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
        <h2 className="text-2xl font-bold">Lab Results</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Results</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedResults.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Results</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalResults.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewedResults.length}</div>
          </CardContent>
        </Card>
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
                placeholder="Search by patient name, test name, or order ID..."
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
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="amended">Amended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={flagFilter} onValueChange={setFlagFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by flag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="abnormal">Abnormal</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Results ({filteredResults.length})</TabsTrigger>
          <TabsTrigger value="critical">Critical ({criticalResults.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingResults.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedResults.length})</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed ({reviewedResults.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ResultsTable results={filteredResults} onViewDetails={handleViewDetails} onMarkReviewed={handleMarkReviewed} onDownload={handleDownloadResult} />
        </TabsContent>
        
        <TabsContent value="critical">
          <ResultsTable results={criticalResults} onViewDetails={handleViewDetails} onMarkReviewed={handleMarkReviewed} onDownload={handleDownloadResult} />
        </TabsContent>
        
        <TabsContent value="pending">
          <ResultsTable results={pendingResults} onViewDetails={handleViewDetails} onMarkReviewed={handleMarkReviewed} onDownload={handleDownloadResult} />
        </TabsContent>
        
        <TabsContent value="completed">
          <ResultsTable results={completedResults} onViewDetails={handleViewDetails} onMarkReviewed={handleMarkReviewed} onDownload={handleDownloadResult} />
        </TabsContent>
        
        <TabsContent value="reviewed">
          <ResultsTable results={reviewedResults} onViewDetails={handleViewDetails} onMarkReviewed={handleMarkReviewed} onDownload={handleDownloadResult} />
        </TabsContent>
      </Tabs>

      {/* Result Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lab Result Details</DialogTitle>
            <DialogDescription>
              {selectedResult?.testName} - {selectedResult?.patientName}
            </DialogDescription>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-6">
              {/* Result Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Patient Information</h4>
                  <p><strong>Name:</strong> {selectedResult.patientName}</p>
                  <p><strong>Order ID:</strong> {selectedResult.orderId}</p>
                  <p><strong>Provider:</strong> {selectedResult.providerName}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Test Information</h4>
                  <p><strong>Test:</strong> {selectedResult.testName}</p>
                  <p><strong>Code:</strong> {selectedResult.testCode}</p>
                  <p><strong>Facility:</strong> {selectedResult.facility}</p>
                  <p><strong>Received:</strong> {new Date(selectedResult.receivedDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Status and Flags */}
              <div className="flex items-center space-x-4">
                {getStatusIcon(selectedResult.status)}
                {getStatusBadge(selectedResult.status)}
                {getFlagBadge(selectedResult)}
              </div>

              {/* Result Details */}
              {resultDetails.length > 0 && (
                <div>
                  <h4 className="font-medium mb-4">Test Parameters</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parameter</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Reference Range</TableHead>
                        <TableHead>Units</TableHead>
                        <TableHead>Flag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultDetails.map((detail) => (
                        <TableRow key={detail.id}>
                          <TableCell className="font-medium">{detail.parameter}</TableCell>
                          <TableCell>{detail.value}</TableCell>
                          <TableCell>{detail.referenceRange}</TableCell>
                          <TableCell>{detail.units}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getParameterFlagIcon(detail.flag)}
                              <span className="capitalize">{detail.flag}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Comments */}
              {selectedResult.comments && (
                <div>
                  <h4 className="font-medium mb-2">Comments</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {selectedResult.comments}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                {selectedResult.status === 'completed' && (
                  <Button onClick={() => handleMarkReviewed(selectedResult.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Reviewed
                  </Button>
                )}
                <Button variant="outline" onClick={() => handleDownloadResult(selectedResult.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Results Table Component
interface ResultsTableProps {
  results: LabResult[];
  onViewDetails: (result: LabResult) => void;
  onMarkReviewed: (resultId: string) => void;
  onDownload: (resultId: string) => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results, onViewDetails, onMarkReviewed, onDownload }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'reviewed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      reviewed: 'secondary',
      pending: 'outline',
      amended: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  const getFlagBadge = (result: LabResult) => {
    if (result.criticalFlag) {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (result.abnormalFlag) {
      return <Badge variant="secondary">Abnormal</Badge>;
    }
    return <Badge variant="outline">Normal</Badge>;
  };

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Test</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Flag</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.id}>
                <TableCell className="font-medium">{result.patientName}</TableCell>
                <TableCell>{result.testName}</TableCell>
                <TableCell>{result.orderId}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(result.status)}
                    {getStatusBadge(result.status)}
                  </div>
                </TableCell>
                <TableCell>{getFlagBadge(result)}</TableCell>
                <TableCell>{new Date(result.receivedDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewDetails(result)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    {result.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onMarkReviewed(result.id)}
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDownload(result.id)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {results.length === 0 && (
          <div className="text-center py-12">
            <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-500">
              No lab results match your current filters.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LabResults;