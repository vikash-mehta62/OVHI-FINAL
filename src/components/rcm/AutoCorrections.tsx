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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Phone,
  Mail,
  RefreshCw,
  Settings,
  TrendingUp
} from 'lucide-react';
import { getAutoCorrectionAPI } from '@/services/operations/rcm';

interface AutoCorrection {
  claim_id: number;
  patient_name: string;
  cpt_code: string;
  status: number;
  corrections: Array<{
    type: string;
    priority: string;
    message: string;
    action: string;
    automated: boolean;
  }>;
}

const AutoCorrections: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [corrections, setCorrections] = useState<AutoCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCorrection, setSelectedCorrection] = useState<AutoCorrection | null>(null);
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());

  const fetchCorrections = async () => {
    try {
      setLoading(true);
      const response = await getAutoCorrectionAPI(token);
      if (response.success) {
        setCorrections(response.data);
      }
    } catch (error) {
      console.error('Error fetching auto corrections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrections();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'follow_up_payer': return <Phone className="h-4 w-4" />;
      case 'review_denial': return <FileText className="h-4 w-4" />;
      case 'submit_claim': return <Mail className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const handleApplyCorrection = async (claimId: number, correctionType: string, action: string) => {
    const actionKey = `${claimId}-${correctionType}`;
    setProcessingActions(prev => new Set(prev).add(actionKey));

    try {
      // Simulate API call for applying correction
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Remove the correction from the list after successful application
      setCorrections(prev => 
        prev.map(correction => 
          correction.claim_id === claimId 
            ? {
                ...correction,
                corrections: correction.corrections.filter(c => c.type !== correctionType)
              }
            : correction
        ).filter(correction => correction.corrections.length > 0)
      );
    } catch (error) {
      console.error('Error applying correction:', error);
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  const handleBulkApply = async () => {
    const automatedCorrections = corrections.flatMap(correction => 
      correction.corrections
        .filter(c => c.automated)
        .map(c => ({ claimId: correction.claim_id, type: c.type, action: c.action }))
    );

    for (const correction of automatedCorrections) {
      await handleApplyCorrection(correction.claimId, correction.type, correction.action);
    }
  };

  const totalCorrections = corrections.reduce((sum, correction) => sum + correction.corrections.length, 0);
  const urgentCorrections = corrections.reduce((sum, correction) => 
    sum + correction.corrections.filter(c => c.priority === 'urgent' || c.priority === 'high').length, 0
  );
  const automatedCorrections = corrections.reduce((sum, correction) => 
    sum + correction.corrections.filter(c => c.automated).length, 0
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading auto-corrections...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{totalCorrections}</div>
                <div className="text-sm text-gray-600">Total Corrections</div>
              </div>
              <Zap className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{urgentCorrections}</div>
                <div className="text-sm text-gray-600">High Priority</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{automatedCorrections}</div>
                <div className="text-sm text-gray-600">Automated</div>
              </div>
              <Settings className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{corrections.length}</div>
                <div className="text-sm text-gray-600">Claims Affected</div>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Auto-Correction Suggestions
              </CardTitle>
              <CardDescription>
                Intelligent suggestions to improve claim processing
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchCorrections}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {automatedCorrections > 0 && (
                <Button onClick={handleBulkApply}>
                  <Zap className="h-4 w-4 mr-2" />
                  Apply All Automated ({automatedCorrections})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {corrections.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
              <p className="text-gray-600">No corrections needed at this time.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>CPT Code</TableHead>
                  <TableHead>Corrections</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {corrections.map((correction) => (
                  <TableRow key={correction.claim_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{correction.patient_name}</div>
                        <div className="text-sm text-gray-600">Claim #{correction.claim_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{correction.cpt_code}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {correction.corrections.slice(0, 2).map((corr, index) => (
                          <div key={index} className="text-sm">
                            {corr.message}
                          </div>
                        ))}
                        {correction.corrections.length > 2 && (
                          <div className="text-sm text-gray-500">
                            +{correction.corrections.length - 2} more
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {correction.corrections.map((corr, index) => (
                          <Badge key={index} className={getPriorityColor(corr.priority)}>
                            {corr.priority}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedCorrection(correction)}
                            >
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                Corrections for {correction.patient_name}
                              </DialogTitle>
                              <DialogDescription>
                                Claim #{correction.claim_id} - {correction.cpt_code}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedCorrection && (
                              <div className="space-y-4">
                                {selectedCorrection.corrections.map((corr, index) => (
                                  <div key={index} className="border rounded-lg p-4">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        {getPriorityIcon(corr.priority)}
                                        <Badge className={getPriorityColor(corr.priority)}>
                                          {corr.priority}
                                        </Badge>
                                        {corr.automated && (
                                          <Badge variant="outline">Automated</Badge>
                                        )}
                                      </div>
                                      <Button
                                        size="sm"
                                        onClick={() => handleApplyCorrection(
                                          selectedCorrection.claim_id, 
                                          corr.type, 
                                          corr.action
                                        )}
                                        disabled={processingActions.has(`${selectedCorrection.claim_id}-${corr.type}`)}
                                      >
                                        {processingActions.has(`${selectedCorrection.claim_id}-${corr.type}`) ? (
                                          <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <>
                                            {getActionIcon(corr.action)}
                                            <span className="ml-2">Apply</span>
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                    <div className="text-sm text-gray-700 mb-2">
                                      {corr.message}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Action: {corr.action.replace('_', ' ')}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Correction Types Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Correction Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Follow-up Required</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              <span className="text-sm">Review Needed</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-purple-500" />
              <span className="text-sm">Submit Claim</span>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-orange-500" />
              <span className="text-sm">Update Required</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoCorrections;