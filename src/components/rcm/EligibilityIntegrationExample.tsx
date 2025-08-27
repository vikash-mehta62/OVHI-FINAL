import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, XCircle, AlertTriangle, Search } from 'lucide-react';
import QuickEligibilityCheck from './QuickEligibilityCheck';
import EligibilityChecker from './EligibilityChecker';

interface Patient {
  id: string;
  name: string;
  memberId?: string;
  eligibilityStatus?: 'active' | 'inactive' | 'pending' | 'unknown';
  lastChecked?: string;
}

interface EligibilityIntegrationExampleProps {
  patients?: Patient[];
}

const EligibilityIntegrationExample: React.FC<EligibilityIntegrationExampleProps> = ({
  patients = [
    { id: 'PAT001', name: 'John Doe', memberId: 'MEM123456', eligibilityStatus: 'active', lastChecked: '2024-01-15' },
    { id: 'PAT002', name: 'Jane Smith', memberId: 'MEM789012', eligibilityStatus: 'inactive', lastChecked: '2024-01-14' },
    { id: 'PAT003', name: 'Bob Johnson', memberId: 'MEM345678', eligibilityStatus: 'unknown' },
  ]
}) => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showEligibilityDialog, setShowEligibilityDialog] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleEligibilityCheck = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowEligibilityDialog(true);
  };

  const handleEligibilityResult = (result: any) => {
    console.log('Eligibility result for', selectedPatient?.name, ':', result);
    // Update patient eligibility status in your state management
    // This would typically update the patient record in your database
  };

  return (
    <div className="space-y-6">
      {/* Patient List with Eligibility Status */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Eligibility Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patients.map((patient) => (
              <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-medium">{patient.name}</h3>
                    <p className="text-sm text-gray-500">ID: {patient.id}</p>
                    {patient.memberId && (
                      <p className="text-sm text-gray-500">Member: {patient.memberId}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(patient.eligibilityStatus || 'unknown')}
                    <Badge variant={getStatusColor(patient.eligibilityStatus || 'unknown')}>
                      {patient.eligibilityStatus || 'Unknown'}
                    </Badge>
                  </div>
                  
                  {patient.lastChecked && (
                    <span className="text-sm text-gray-500">
                      Last checked: {patient.lastChecked}
                    </span>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEligibilityCheck(patient)}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Check Eligibility
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Eligibility Check Widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Eligibility Check</CardTitle>
          </CardHeader>
          <CardContent>
            <QuickEligibilityCheck 
              onResult={handleEligibilityResult}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eligibility Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 border rounded">
                  <div className="text-2xl font-bold text-green-600">
                    {patients.filter(p => p.eligibilityStatus === 'active').length}
                  </div>
                  <div className="text-sm text-gray-500">Active</div>
                </div>
                <div className="text-center p-3 border rounded">
                  <div className="text-2xl font-bold text-red-600">
                    {patients.filter(p => p.eligibilityStatus === 'inactive').length}
                  </div>
                  <div className="text-sm text-gray-500">Inactive</div>
                </div>
              </div>
              
              <div className="text-center">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Search className="h-4 w-4 mr-2" />
                      Comprehensive Eligibility Check
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Comprehensive Eligibility Verification</DialogTitle>
                    </DialogHeader>
                    <EligibilityChecker 
                      onEligibilityCheck={handleEligibilityResult}
                      onClaimValidation={(result) => {
                        console.log('Claim validation result:', result);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Eligibility Check Dialog */}
      <Dialog open={showEligibilityDialog} onOpenChange={setShowEligibilityDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check Eligibility - {selectedPatient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <QuickEligibilityCheck 
              patientId={selectedPatient?.id}
              onResult={(result) => {
                handleEligibilityResult(result);
                setShowEligibilityDialog(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EligibilityIntegrationExample;