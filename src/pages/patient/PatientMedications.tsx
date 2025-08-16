
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, Plus, Download, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { formatDate } from '@/utils/formatHelpers';
import { toast } from '@/components/ui/use-toast';

interface Medication {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'discontinued' | 'completed';
  refillsRemaining: number;
  prescriber: string;
  createdAt: string;
}

const PatientMedications: React.FC = () => {
  const { user, token } = useSelector((state: RootState) => state.auth);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [refillDialog, setRefillDialog] = useState<{ open: boolean; medication?: Medication }>({ open: false });
  const [refillNotes, setRefillNotes] = useState('');
  const [submittingRefill, setSubmittingRefill] = useState(false);

  useEffect(() => {
    if (user?.id && token) {
      fetchMedications();
    }
  }, [user, token, statusFilter]);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/patients/${user?.id}/medications?status=${statusFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMedications(data.data.medications || []);
        setAllergies(data.data.allergies || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch medications",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching medications:', error);
      toast({
        title: "Error",
        description: "Failed to fetch medications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const requestRefill = async () => {
    if (!refillDialog.medication) return;

    try {
      setSubmittingRefill(true);
      const response = await fetch(`/api/v1/patients/${user?.id}/medications/refill`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          medicationId: refillDialog.medication.id,
          notes: refillNotes
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: "Refill request submitted successfully"
        });
        setRefillDialog({ open: false });
        setRefillNotes('');
        fetchMedications(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to submit refill request",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error requesting refill:', error);
      toast({
        title: "Error",
        description: "Failed to submit refill request",
        variant: "destructive"
      });
    } finally {
      setSubmittingRefill(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'discontinued': return 'destructive';
      case 'completed': return 'secondary';
      default: return 'outline';
    }
  };

  if (!user) {
    return <div className="text-center py-8">Please log in to view medications</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Medications</h1>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="all">All Medications</SelectItem>
              <SelectItem value="discontinued">Discontinued</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchMedications}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download List
          </Button>
        </div>
      </div>

      {/* Allergies Alert */}
      {allergies.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Drug Allergies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700">
              You have documented allergies to: <strong>{allergies.join(', ')}</strong>
            </p>
            <p className="text-sm text-orange-600 mt-1">
              Always inform your healthcare providers about these allergies before starting new medications.
            </p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medications.map((med) => (
            <Card key={med.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <Pill className="h-5 w-5 mr-2" />
                    {med.medicationName}
                  </CardTitle>
                  <Badge variant={getStatusColor(med.status)}>
                    {med.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Dosage</p>
                    <p className="text-lg font-semibold">{med.dosage}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Frequency</p>
                    <p>{med.frequency}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Prescribed By</p>
                    <p>{med.prescriber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                    <p className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                      {formatDate(med.startDate)}
                    </p>
                  </div>
                  {med.status === 'active' && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Refills Remaining</p>
                      <p className="font-semibold">{med.refillsRemaining}</p>
                    </div>
                  )}
                  {med.status === 'active' && med.refillsRemaining > 0 && (
                    <div className="pt-2 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setRefillDialog({ open: true, medication: med })}
                      >
                        Request Refill
                      </Button>
                    </div>
                  )}
                  {med.status === 'active' && med.refillsRemaining === 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground text-center">
                        No refills remaining - Contact provider
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && medications.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Pill className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Medications Found</h3>
            <p className="text-gray-500 text-center">
              {statusFilter === 'active' 
                ? 'You have no active medications.' 
                : 'No medications match your current filter.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Refill Request Dialog */}
      <Dialog open={refillDialog.open} onOpenChange={(open) => setRefillDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Medication Refill</DialogTitle>
            <DialogDescription>
              Request a refill for {refillDialog.medication?.medicationName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information for your provider..."
                value={refillNotes}
                onChange={(e) => setRefillNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setRefillDialog({ open: false })}>
                Cancel
              </Button>
              <Button onClick={requestRefill} disabled={submittingRefill}>
                {submittingRefill ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientMedications;
