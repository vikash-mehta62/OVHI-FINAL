/**
 * Enhanced ERA Processor Component
 * Advanced ERA file processing with intelligent matching
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  DollarSign,
  TrendingUp,
  Download,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface ERAFile {
  id: string;
  fileName: string;
  fileFormat: string;
  processingStatus: string;
  totalPayments: number;
  matchedPayments: number;
  unmatchedPayments: number;
  postedAmount: number;
  uploadedAt: string;
  processedAt?: string;
}

interface PaymentMatch {
  id: string;
  claimNumber: string;
  paymentAmount: number;
  matchType: string;
  confidence: number;
  claimId: string;
  status: string;
}

const EnhancedERAProcessor: React.FC = () => {
  const [eraFiles, setEraFiles] = useState<ERAFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileFormat, setFileFormat] = useState('X12_835');
  const [autoPost, setAutoPost] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<any>(null);
  const [paymentMatches, setPaymentMatches] = useState<PaymentMatch[]>([]);
  const [activeTab, setActiveTab] = useState('upload');

  // Sample data for demonstration
  useEffect(() => {
    const sampleFiles: ERAFile[] = [
      {
        id: '1',
        fileName: 'ERA_20240115_BCBS.835',
        fileFormat: 'X12_835',
        processingStatus: 'completed',
        totalPayments: 45,
        matchedPayments: 42,
        unmatchedPayments: 3,
        postedAmount: 12450.75,
        uploadedAt: '2024-01-15T10:30:00Z',
        processedAt: '2024-01-15T10:35:00Z'
      },
      {
        id: '2',
        fileName: 'ERA_20240116_Aetna.csv',
        fileFormat: 'CSV',
        processingStatus: 'processing',
        totalPayments: 28,
        matchedPayments: 25,
        unmatchedPayments: 3,
        postedAmount: 8750.25,
        uploadedAt: '2024-01-16T09:15:00Z'
      }
    ];

    const sampleMatches: PaymentMatch[] = [
      {
        id: '1',
        claimNumber: 'CLM-2024-001',
        paymentAmount: 250.00,
        matchType: 'exact',
        confidence: 100,
        claimId: '1001',
        status: 'posted'
      },
      {
        id: '2',
        claimNumber: 'CLM-2024-002',
        paymentAmount: 180.50,
        matchType: 'fuzzy',
        confidence: 85,
        claimId: '1002',
        status: 'matched'
      },
      {
        id: '3',
        claimNumber: 'CLM-2024-003',
        paymentAmount: 320.75,
        matchType: 'partial',
        confidence: 60,
        claimId: '1003',
        status: 'review_required'
      }
    ];

    setEraFiles(sampleFiles);
    setPaymentMatches(sampleMatches);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Auto-detect format based on file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === '835') setFileFormat('X12_835');
      else if (extension === 'csv') setFileFormat('CSV');
      else if (extension === 'xlsx' || extension === 'xls') setFileFormat('EXCEL');
    }
  };

  const handleProcessERA = async () => {
    if (!selectedFile) {
      toast.error('Please select an ERA file');
      return;
    }

    setProcessing(true);
    setUploadProgress(0);

    try {
      // Simulate file reading
      const fileContent = await readFileContent(selectedFile);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Process ERA file
      const response = await fetch('/api/v1/rcm/enhanced/era/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          era_data: fileContent,
          file_name: selectedFile.name,
          file_format: fileFormat,
          auto_post: autoPost
        })
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        
        // Add new file to list
        const newFile: ERAFile = {
          id: result.data.eraFileId,
          fileName: selectedFile.name,
          fileFormat,
          processingStatus: 'completed',
          totalPayments: result.data.summary.totalPayments,
          matchedPayments: result.data.summary.matchedPayments,
          unmatchedPayments: result.data.summary.unmatchedPayments,
          postedAmount: result.data.summary.postedAmount,
          uploadedAt: new Date().toISOString()
        };

        setEraFiles(prev => [newFile, ...prev]);
        setSelectedFile(null);
        setUploadProgress(0);
        setActiveTab('files');
        
        toast.success(`ERA file processed successfully! ${result.data.summary.matchedPayments} payments matched.`);
      } else {
        throw new Error('Failed to process ERA file');
      }

    } catch (error) {
      console.error('ERA processing error:', error);
      toast.error('Failed to process ERA file');
    } finally {
      setProcessing(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'bg-green-100 text-green-800';
      case 'fuzzy': return 'bg-blue-100 text-blue-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-blue-600';
    if (confidence >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enhanced ERA Processor</h2>
          <p className="text-gray-600">Advanced ERA file processing with intelligent payment matching</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload ERA</TabsTrigger>
          <TabsTrigger value="files">Processing History</TabsTrigger>
          <TabsTrigger value="matches">Payment Matches</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-500" />
                Upload ERA File
              </CardTitle>
              <CardDescription>
                Upload and process ERA files with advanced matching algorithms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="era-file">Select ERA File</Label>
                  <Input
                    id="era-file"
                    type="file"
                    accept=".835,.csv,.xlsx,.xls,.json"
                    onChange={handleFileSelect}
                    disabled={processing}
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600 mt-1">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
                
                <div>
                  <Label>File Format</Label>
                  <Select value={fileFormat} onValueChange={setFileFormat} disabled={processing}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="X12_835">X12 835 (EDI)</SelectItem>
                      <SelectItem value="CSV">CSV Format</SelectItem>
                      <SelectItem value="EXCEL">Excel Format</SelectItem>
                      <SelectItem value="JSON">JSON Format</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-post"
                  checked={autoPost}
                  onChange={(e) => setAutoPost(e.target.checked)}
                  disabled={processing}
                />
                <Label htmlFor="auto-post">Auto-post matched payments</Label>
              </div>

              {processing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Processing ERA file...</span>
                    <span className="text-sm font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              <Button 
                onClick={handleProcessERA}
                disabled={!selectedFile || processing}
                className="w-full"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Process ERA File
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ERA Processing History</CardTitle>
              <CardDescription>
                View all processed ERA files and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Payments</TableHead>
                      <TableHead>Matched</TableHead>
                      <TableHead>Unmatched</TableHead>
                      <TableHead>Posted Amount</TableHead>
                      <TableHead>Processed At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eraFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">{file.fileName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{file.fileFormat}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(file.processingStatus)}>
                            {file.processingStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{file.totalPayments}</TableCell>
                        <TableCell>
                          <span className="text-green-600 font-medium">{file.matchedPayments}</span>
                        </TableCell>
                        <TableCell>
                          <span className={file.unmatchedPayments > 0 ? 'text-red-600 font-medium' : ''}>
                            {file.unmatchedPayments}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">${file.postedAmount.toFixed(2)}</span>
                        </TableCell>
                        <TableCell>
                          {file.processedAt ? 
                            new Date(file.processedAt).toLocaleString() : 
                            'Processing...'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Matching Results</CardTitle>
              <CardDescription>
                Review payment matching results and confidence scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim Number</TableHead>
                      <TableHead>Payment Amount</TableHead>
                      <TableHead>Match Type</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMatches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell className="font-medium">{match.claimNumber}</TableCell>
                        <TableCell>${match.paymentAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getMatchTypeColor(match.matchType)}>
                            {match.matchType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={getConfidenceColor(match.confidence)}>
                            {match.confidence}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={match.status === 'posted' ? 'default' : 'secondary'}>
                            {match.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {match.status === 'matched' && (
                              <Button size="sm" variant="outline">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Post
                              </Button>
                            )}
                            {match.status === 'review_required' && (
                              <Button size="sm" variant="outline">
                                <Eye className="w-3 h-3 mr-1" />
                                Review
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total ERA Files</p>
                    <p className="text-2xl font-bold text-blue-600">{eraFiles.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Match Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {eraFiles.length > 0 ? 
                        ((eraFiles.reduce((sum, f) => sum + f.matchedPayments, 0) / 
                          eraFiles.reduce((sum, f) => sum + f.totalPayments, 0)) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Posted</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${eraFiles.reduce((sum, f) => sum + f.postedAmount, 0).toFixed(2)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Processing Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Average Match Rate</p>
                    <p className="text-lg font-bold text-green-600">93.5%</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Average Processing Time</p>
                    <p className="text-lg font-bold text-blue-600">2.3 minutes</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Files Requiring Review</p>
                    <p className="text-lg font-bold text-yellow-600">
                      {eraFiles.filter(f => f.unmatchedPayments > 0).length}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedERAProcessor;