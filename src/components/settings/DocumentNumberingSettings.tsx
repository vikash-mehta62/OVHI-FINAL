import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Save, 
  RefreshCw, 
  Eye, 
  RotateCcw, 
  Hash, 
  FileText, 
  Settings,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DocumentSequence {
  id: number;
  document_type: string;
  prefix: string;
  current_number: number;
  number_length: number;
  suffix: string;
  format_template: string;
  reset_frequency: string;
  last_reset_date: string | null;
  is_active: boolean;
}

interface DocumentNumberHistory {
  id: number;
  document_type: string;
  document_id: number | null;
  generated_number: string;
  full_document_number: string;
  generated_by: number | null;
  generated_date: string;
}

const DOCUMENT_TYPES = [
  { value: 'invoice', label: 'Invoices', description: 'Patient invoices and billing documents' },
  { value: 'statement', label: 'Statements', description: 'Patient account statements' },
  { value: 'claim_batch', label: 'Claim Batches', description: 'Insurance claim batch submissions' },
  { value: 'receipt', label: 'Receipts', description: 'Payment receipts and confirmations' },
  { value: 'superbill', label: 'Superbills', description: 'Encounter superbills and summaries' },
  { value: 'referral', label: 'Referrals', description: 'Provider referral letters' },
  { value: 'lab_requisition', label: 'Lab Requisitions', description: 'Laboratory test orders' },
  { value: 'prescription', label: 'Prescriptions', description: 'Medication prescriptions' },
  { value: 'encounter', label: 'Encounters', description: 'Clinical encounter records' }
];

const RESET_FREQUENCIES = [
  { value: 'never', label: 'Never', description: 'Numbers continue indefinitely' },
  { value: 'yearly', label: 'Yearly', description: 'Reset at the beginning of each year' },
  { value: 'monthly', label: 'Monthly', description: 'Reset at the beginning of each month' },
  { value: 'daily', label: 'Daily', description: 'Reset at the beginning of each day' }
];

const DocumentNumberingSettings: React.FC = () => {
  const [sequences, setSequences] = useState<DocumentSequence[]>([]);
  const [history, setHistory] = useState<DocumentNumberHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<DocumentSequence | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetStartNumber, setResetStartNumber] = useState(1);
  const [previewNumbers, setPreviewNumbers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSequences();
    fetchHistory();
  }, []);

  const fetchSequences = async () => {
    try {
      const response = await fetch('/api/v1/settings/document-numbering/sequences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSequences(data.data);
        
        // Fetch preview numbers for all sequences
        const previews: Record<string, string> = {};
        for (const seq of data.data) {
          try {
            const previewResponse = await fetch(
              `/api/v1/settings/document-numbering/preview?documentType=${seq.document_type}`,
              {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              }
            );
            if (previewResponse.ok) {
              const previewData = await previewResponse.json();
              previews[seq.document_type] = previewData.data.previewNumber;
            }
          } catch (error) {
            console.error(`Error fetching preview for ${seq.document_type}:`, error);
          }
        }
        setPreviewNumbers(previews);
      } else {
        toast.error('Failed to fetch document sequences');
      }
    } catch (error) {
      console.error('Error fetching sequences:', error);
      toast.error('Error loading document sequences');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/v1/settings/document-numbering/history?limit=20', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const updateSequence = async (sequence: DocumentSequence) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/settings/document-numbering/sequences/${sequence.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          prefix: sequence.prefix,
          current_number: sequence.current_number,
          number_length: sequence.number_length,
          suffix: sequence.suffix,
          format_template: sequence.format_template,
          reset_frequency: sequence.reset_frequency,
          is_active: sequence.is_active
        })
      });

      if (response.ok) {
        toast.success('Document sequence updated successfully');
        fetchSequences();
      } else {
        toast.error('Failed to update document sequence');
      }
    } catch (error) {
      console.error('Error updating sequence:', error);
      toast.error('Error updating document sequence');
    } finally {
      setSaving(false);
    }
  };

  const resetSequence = async () => {
    if (!selectedSequence) return;

    try {
      const response = await fetch(`/api/v1/settings/document-numbering/sequences/${selectedSequence.id}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          newStartNumber: resetStartNumber
        })
      });

      if (response.ok) {
        toast.success('Document sequence reset successfully');
        setShowResetDialog(false);
        fetchSequences();
      } else {
        toast.error('Failed to reset document sequence');
      }
    } catch (error) {
      console.error('Error resetting sequence:', error);
      toast.error('Error resetting document sequence');
    }
  };

  const handleSequenceChange = (index: number, field: keyof DocumentSequence, value: any) => {
    const updatedSequences = [...sequences];
    updatedSequences[index] = {
      ...updatedSequences[index],
      [field]: value
    };
    setSequences(updatedSequences);
  };

  const getDocumentTypeInfo = (type: string) => {
    return DOCUMENT_TYPES.find(dt => dt.value === type) || { label: type, description: '' };
  };

  const getResetFrequencyInfo = (frequency: string) => {
    return RESET_FREQUENCIES.find(rf => rf.value === frequency) || { label: frequency, description: '' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Document Numbering</h2>
          <p className="text-muted-foreground">
            Configure automatic numbering sequences for all document types
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setShowHistory(true)}>
            <FileText className="h-4 w-4 mr-2" />
            View History
          </Button>
          <Button onClick={fetchSequences} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Document Sequences Configuration */}
      <div className="grid gap-6">
        {sequences.map((sequence, index) => {
          const docTypeInfo = getDocumentTypeInfo(sequence.document_type);
          const resetInfo = getResetFrequencyInfo(sequence.reset_frequency);
          const previewNumber = previewNumbers[sequence.document_type];

          return (
            <Card key={sequence.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="h-5 w-5" />
                      {docTypeInfo.label}
                      {!sequence.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{docTypeInfo.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {previewNumber && (
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Next Number:</div>
                        <div className="font-mono font-medium">{previewNumber}</div>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSequence(sequence);
                        setResetStartNumber(sequence.current_number);
                        setShowResetDialog(true);
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`prefix-${index}`}>Prefix</Label>
                    <Input
                      id={`prefix-${index}`}
                      value={sequence.prefix}
                      onChange={(e) => handleSequenceChange(index, 'prefix', e.target.value)}
                      placeholder="e.g., INV-"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`current-${index}`}>Current Number</Label>
                    <Input
                      id={`current-${index}`}
                      type="number"
                      value={sequence.current_number}
                      onChange={(e) => handleSequenceChange(index, 'current_number', parseInt(e.target.value) || 1)}
                      min="1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`length-${index}`}>Number Length</Label>
                    <Input
                      id={`length-${index}`}
                      type="number"
                      value={sequence.number_length}
                      onChange={(e) => handleSequenceChange(index, 'number_length', parseInt(e.target.value) || 6)}
                      min="1"
                      max="10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`suffix-${index}`}>Suffix</Label>
                    <Input
                      id={`suffix-${index}`}
                      value={sequence.suffix}
                      onChange={(e) => handleSequenceChange(index, 'suffix', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`reset-${index}`}>Reset Frequency</Label>
                    <Select
                      value={sequence.reset_frequency}
                      onValueChange={(value) => handleSequenceChange(index, 'reset_frequency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESET_FREQUENCIES.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>
                            <div>
                              <div>{freq.label}</div>
                              <div className="text-xs text-muted-foreground">{freq.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`template-${index}`}>Format Template</Label>
                    <Input
                      id={`template-${index}`}
                      value={sequence.format_template}
                      onChange={(e) => handleSequenceChange(index, 'format_template', e.target.value)}
                      placeholder="{prefix}{number}{suffix}"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={sequence.is_active}
                      onCheckedChange={(checked) => handleSequenceChange(index, 'is_active', checked)}
                    />
                    <Label>Active</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {sequence.last_reset_date && (
                      <div className="text-sm text-muted-foreground">
                        Last reset: {new Date(sequence.last_reset_date).toLocaleDateString()}
                      </div>
                    )}
                    <Button
                      onClick={() => updateSequence(sequence)}
                      disabled={saving}
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Document Sequence</DialogTitle>
            <DialogDescription>
              Reset the document sequence for {selectedSequence && getDocumentTypeInfo(selectedSequence.document_type).label}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resetNumber">New Starting Number</Label>
              <Input
                id="resetNumber"
                type="number"
                value={resetStartNumber}
                onChange={(e) => setResetStartNumber(parseInt(e.target.value) || 1)}
                min="1"
              />
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Resetting the sequence will change the next document number. 
                  This action cannot be undone. Make sure this won't create duplicate numbers.
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button onClick={resetSequence} variant="destructive">
              Reset Sequence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Document Number History</DialogTitle>
            <DialogDescription>
              Recent document number generations
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Document Number</TableHead>
                  <TableHead>Generated Date</TableHead>
                  <TableHead>Generated By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {getDocumentTypeInfo(item.document_type).label}
                    </TableCell>
                    <TableCell className="font-mono">
                      {item.full_document_number}
                    </TableCell>
                    <TableCell>
                      {new Date(item.generated_date).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {item.generated_by || 'System'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowHistory(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentNumberingSettings;