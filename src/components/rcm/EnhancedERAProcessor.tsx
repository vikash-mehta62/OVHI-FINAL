/**
 * Enhanced ERA Processor Component
 * Handles ERA file processing with ClaimMD integration
 */

import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Eye,
  AlertTriangle,
  Clock,
  DollarSign,
  Activity
} from 'lucide-react';

interface ERAProcessingResult {
  eraId: number;
  fileName: string;
  totalPayments: number;
  totalAdjustments: number;
  processedCount: number;
  autoPostedCount: number;
  payments: any[];
  claimMdIntegration: {
    enabled: boolean;
    referenceId?: string;
    status?: string;
    message?: string;
  };
}

interface ProcessingStatus {
  stage: string;
  progress: number;
  message: string;
}

const EnhancedERAProcessor: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [result, setResult] = useState<ERAProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState({
    autoPost: false,
    claimMdIntegration: true,
    validateClaims: true
  });

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.835') && !file.name.toLowerCase().endsWith('.txt')) {
        setError('Please select a valid ERA file (.835 or .txt)');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      setError(null);
      setResult(null);
    }
  }, []);

  const simulateProcessingStages = useCallback(() => {
    const stages = [
      { stage: 'Uploading', progress: 10, message: 'Uploading ERA file...' },
      { stage: 'Parsing', progress: 30, message: 'Parsing X12 835 format...' },
      { stage: 'ClaimMD', progress: 50, message: 'Sending to ClaimMD API...' },
      { stage: 'Validation', progress: 70, message: 'Validating payment data...' },
      { stage: 'Processing', progress: 90, message: 'Processing payments...' },
      { stage: 'Complete', progress: 100, message: 'Processing complete!' }
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setProcessingStatus(stages[currentStage]);
        currentStage++;
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return interval;
  }, []);

  const handleProcessERA = useCallback(async () => {
    if (!selectedFile) return;

    try {
      setProcessing(true);
      setError(null);
      setResult(null);

      // Start processing animation
      const interval = simulateProcessingStages();

      // Read file content
      const fileContent = await selectedFile.text();

      // Process ERA file
      const response = await fetch('/api/v1/rcm/era/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          era_data: fileContent,
          file_name: selectedFile.name,
          auto_post: options.autoPost,
          claimMdIntegration: options.claimMdIntegration
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        setProcessingStatus({
          stage: 'Complete',
          progress: 100,
          message: 'ERA processing completed successfully!'
        });
      } else {
        throw new Error(data.message || 'ERA processing failed');
      }

      clearInterval(interval);
    } catch (error) {
      console.error('ERA processing error:', error);
      setError(error instanceof Error ? error.message : 'ERA processing failed');
      setProcessingStatus(null);
    } finally {
      setProcessing(false);
    }
  }, [selectedFile, options, token, simulateProcessingStages]);

  const handleCheckClaimMDStatus = useCallback(async (referenceId: string) => {
    try {
      const response = await fetch(`/api/v1/rcm/claimmd/era/${referenceId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        // Update result with latest status
        setResult(prev => prev ? {
          ...prev,
          claimMdIntegration: {
            ...prev.claimMdIntegration,
            status: data.data.status,
            message: data.data.message
          }
        } : null);
      }
    } catch (error) {
      console.error('Error checking ClaimMD status:', error);
    }
  }, [token]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Enhanced ERA Processor</h2>
        <p className="text-gray-500">Process ERA files with ClaimMD integration and automated posting</p>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload & Process</TabsTrigger>
          <TabsTrigger value="results" disabled={!result}>Results</TabsTrigger>
          <TabsTrigger value="history">Processing History</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>ERA File Upload</span>
                </CardTitle>
                <CardDescription>
                  Upload your ERA file (.835 or .txt format)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="era-file">Select ERA File</Label>
                  <Input
                    id="era-file"
                    type="file"
                    accept=".835,.txt"
                    onChange={handleFileSelect}
                    disabled={processing}
                  />
                  {selectedFile && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <FileText className="h-4 w-4" />
                      <span>{selectedFile.name}</span>
                      <span>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>

                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-post">Auto-post payments</Label>
                    <Switch
                      id="auto-post"
                      checked={options.autoPost}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, autoPost: checked }))}
                      disabled={processing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="claimmd-integration">ClaimMD integration</Label>
                    <Switch
                      id="claimmd-integration"
                      checked={options.claimMdIntegration}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, claimMdIntegration: checked }))}
                      disabled={processing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="validate-claims">Validate claims</Label>
                    <Switch
                      id="validate-claims"
                      checked={options.validateClaims}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, validateClaims: checked }))}
                      disabled={processing}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleProcessERA}
                  disabled={!selectedFile || processing}
                  className="w-full"
                >
                  {processing ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Activity className="h-4 w-4 mr-2" />
                  )}
                  {processing ? 'Processing...' : 'Process ERA File'}
                </Button>
              </CardContent>
            </Card>

            {/* Processing Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Processing Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {processingStatus ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{processingStatus.stage}</span>
                      <span className="text-sm text-gray-500">{processingStatus.progress}%</span>
                    </div>
                    <Progress value={processingStatus.progress} className="w-full" />
                    <p className="text-sm text-gray-600">{processingStatus.message}</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select and upload an ERA file to begin processing</p>
                  </div>
                )}

                {result && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-medium text-green-700">Processing Complete!</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Payments:</span>
                        <span className="ml-2 font-medium">{result.processedCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Auto-posted:</span>
                        <span className="ml-2 font-medium">{result.autoPostedCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Amount:</span>
                        <span className="ml-2 font-medium">{formatCurrency(result.totalPayments)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Adjustments:</span>
                        <span className="ml-2 font-medium">{formatCurrency(result.totalAdjustments)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="results">
          {result && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Payments Processed</p>
                        <p className="text-2xl font-bold">{result.processedCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Auto-posted</p>
                        <p className="text-2xl font-bold">{result.autoPostedCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Total Payments</p>
                        <p className="text-2xl font-bold">{formatCurrency(result.totalPayments)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium">Adjustments</p>
                        <p className="text-2xl font-bold">{formatCurrency(result.totalAdjustments)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ClaimMD Integration Status */}
              {result.claimMdIntegration.enabled && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>ClaimMD Integration Status</span>
                      {result.claimMdIntegration.referenceId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckClaimMDStatus(result.claimMdIntegration.referenceId!)}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Check Status
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Integration Status</span>
                        <Badge variant={result.claimMdIntegration.status === 'submitted' ? 'default' : 'secondary'}>
                          {result.claimMdIntegration.status || 'Unknown'}
                        </Badge>
                      </div>
                      
                      {result.claimMdIntegration.referenceId && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Reference ID</span>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {result.claimMdIntegration.referenceId}
                          </code>
                        </div>
                      )}
                      
                      {result.claimMdIntegration.message && (
                        <div>
                          <span className="text-sm text-gray-500">Message</span>
                          <p className="text-sm mt-1">{result.claimMdIntegration.message}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Details</CardTitle>
                  <CardDescription>
                    Individual payment records from the ERA file
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.payments.slice(0, 10).map((payment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {payment.auto_posted ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                          <div>
                            <p className="font-medium">Claim #{payment.claim_id}</p>
                            <p className="text-sm text-gray-500">
                              Patient ID: {payment.patient_id} | Service: {payment.service_date}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(payment.paid_amount)}</p>
                          <p className="text-sm text-gray-500">
                            {payment.auto_posted ? 'Auto-posted' : 'Pending'}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {result.payments.length > 10 && (
                      <div className="text-center py-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View All {result.payments.length} Payments
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Processing History</CardTitle>
              <CardDescription>
                View previously processed ERA files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>ERA processing history will be displayed here</p>
                <Button variant="outline" className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load History
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedERAProcessor;