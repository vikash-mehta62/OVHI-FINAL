import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Save,
  Plus,
  Shield,
  AlertTriangle,
  CheckCircle,
  Calendar,
  FileText,
  Building,
  User,
  Trash2
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

interface CLIACertificate {
  id?: number;
  clia_number: string;
  certificate_type: string;
  laboratory_name: string;
  laboratory_director: string;
  director_license_number: string;
  director_license_state: string;
  effective_date: string;
  expiry_date: string;
  status: string;
  laboratory_address: string;
  specialties: string[];
}

interface DEARegistration {
  id?: number;
  provider_id: number;
  dea_number: string;
  registration_type: string;
  schedule_authority: string;
  business_activity: string;
  expiry_date: string;
  status: string;
  registered_address: string;
}

interface StateLicense {
  id?: number;
  provider_id: number;
  state_code: string;
  license_number: string;
  license_type: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  issuing_board: string;
}

const RegulatoryComplianceSettings: React.FC = () => {
  const [cliaCertificates, setCLIACertificates] = useState<CLIACertificate[]>([]);
  const [deaRegistrations, setDEARegistrations] = useState<DEARegistration[]>([]);
  const [stateLicenses, setStateLicenses] = useState<StateLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCLIADialog, setShowCLIADialog] = useState(false);
  const [showDEADialog, setShowDEADialog] = useState(false);
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<number>(1);

  const [newCLIA, setNewCLIA] = useState<CLIACertificate>({
    clia_number: '',
    certificate_type: 'waived',
    laboratory_name: '',
    laboratory_director: '',
    director_license_number: '',
    director_license_state: '',
    effective_date: '',
    expiry_date: '',
    status: 'active',
    laboratory_address: '',
    specialties: []
  });

  const [newDEA, setNewDEA] = useState<DEARegistration>({
    provider_id: 1,
    dea_number: '',
    registration_type: 'practitioner',
    schedule_authority: '2,3,4,5',
    business_activity: '',
    expiry_date: '',
    status: 'active',
    registered_address: ''
  });

  const [newLicense, setNewLicense] = useState<StateLicense>({
    provider_id: 1,
    state_code: '',
    license_number: '',
    license_type: 'Medical License',
    issue_date: '',
    expiry_date: '',
    status: 'active',
    issuing_board: ''
  });

  useEffect(() => {
    fetchAllData();
  }, [selectedProviderId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCLIACertificates(),
        fetchDEARegistrations(),
        fetchStateLicenses()
      ]);
    } catch (error) {
      console.error('Error fetching regulatory data:', error);
    } finally {
      setLoading(false);
    }
  }; const fetchCLIACertificates = async () => {
    try {
      const response = await fetch('/api/v1/settings/regulatory/clia', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCLIACertificates(data.data);
      }
    } catch (error) {
      console.error('Error fetching CLIA certificates:', error);
    }
  };

  const fetchDEARegistrations = async () => {
    try {
      const response = await fetch(`/api/v1/settings/regulatory/dea?providerId=${selectedProviderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDEARegistrations(data.data);
      }
    } catch (error) {
      console.error('Error fetching DEA registrations:', error);
    }
  };

  const fetchStateLicenses = async () => {
    try {
      const response = await fetch(`/api/v1/settings/regulatory/licenses?providerId=${selectedProviderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStateLicenses(data.data);
      }
    } catch (error) {
      console.error('Error fetching state licenses:', error);
    }
  };

  const saveCLIACertificate = async () => {
    try {
      const response = await fetch('/api/v1/settings/regulatory/clia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newCLIA)
      });

      if (response.ok) {
        toast.success('CLIA certificate saved successfully');
        setShowCLIADialog(false);
        fetchCLIACertificates();
        resetCLIAForm();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save CLIA certificate');
      }
    } catch (error) {
      console.error('Error saving CLIA certificate:', error);
      toast.error('Error saving CLIA certificate');
    }
  };

  const saveDEARegistration = async () => {
    try {
      const response = await fetch('/api/v1/settings/regulatory/dea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...newDEA, provider_id: selectedProviderId })
      });

      if (response.ok) {
        toast.success('DEA registration saved successfully');
        setShowDEADialog(false);
        fetchDEARegistrations();
        resetDEAForm();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save DEA registration');
      }
    } catch (error) {
      console.error('Error saving DEA registration:', error);
      toast.error('Error saving DEA registration');
    }
  };

  const saveStateLicense = async () => {
    try {
      const response = await fetch('/api/v1/settings/regulatory/licenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...newLicense, provider_id: selectedProviderId })
      });

      if (response.ok) {
        toast.success('State license saved successfully');
        setShowLicenseDialog(false);
        fetchStateLicenses();
        resetLicenseForm();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save state license');
      }
    } catch (error) {
      console.error('Error saving state license:', error);
      toast.error('Error saving state license');
    }
  };

  const validateRegulatoryNumber = async (type: 'clia' | 'dea', number: string) => {
    try {
      const response = await fetch('/api/v1/settings/regulatory/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ type, number })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data.isValid) {
          toast.success(data.data.message);
        } else {
          toast.error(data.data.message);
        }
        return data.data.isValid;
      }
    } catch (error) {
      console.error('Error validating number:', error);
      toast.error('Error validating number');
    }
    return false;
  };

  const resetCLIAForm = () => {
    setNewCLIA({
      clia_number: '',
      certificate_type: 'waived',
      laboratory_name: '',
      laboratory_director: '',
      director_license_number: '',
      director_license_state: '',
      effective_date: '',
      expiry_date: '',
      status: 'active',
      laboratory_address: '',
      specialties: []
    });
  };

  const resetDEAForm = () => {
    setNewDEA({
      provider_id: selectedProviderId,
      dea_number: '',
      registration_type: 'practitioner',
      schedule_authority: '2,3,4,5',
      business_activity: '',
      expiry_date: '',
      status: 'active',
      registered_address: ''
    });
  };

  const resetLicenseForm = () => {
    setNewLicense({
      provider_id: selectedProviderId,
      state_code: '',
      license_number: '',
      license_type: 'Medical License',
      issue_date: '',
      expiry_date: '',
      status: 'active',
      issuing_board: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      expired: { color: 'bg-red-100 text-red-800', label: 'Expired' },
      suspended: { color: 'bg-yellow-100 text-yellow-800', label: 'Suspended' },
      revoked: { color: 'bg-gray-100 text-gray-800', label: 'Revoked' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  } return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Regulatory Compliance</h2>
          <p className="text-muted-foreground">
            Manage CLIA certificates, DEA registrations, and state licenses
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedProviderId.toString()} onValueChange={(value) => setSelectedProviderId(parseInt(value))}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Dr. John Smith</SelectItem>
              <SelectItem value="2">Dr. Sarah Johnson</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="clia" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clia">CLIA Certificates</TabsTrigger>
          <TabsTrigger value="dea">DEA Registrations</TabsTrigger>
          <TabsTrigger value="licenses">State Licenses</TabsTrigger>
        </TabsList>

        <TabsContent value="clia" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    CLIA Certificates
                  </CardTitle>
                  <CardDescription>
                    Clinical Laboratory Improvement Amendments certificates for laboratory operations
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCLIADialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add CLIA Certificate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {cliaCertificates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No CLIA certificates found. Add one to enable laboratory operations.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CLIA Number</TableHead>
                      <TableHead>Laboratory Name</TableHead>
                      <TableHead>Certificate Type</TableHead>
                      <TableHead>Director</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cliaCertificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-mono">{cert.clia_number}</TableCell>
                        <TableCell>{cert.laboratory_name}</TableCell>
                        <TableCell className="capitalize">{cert.certificate_type.replace('_', ' ')}</TableCell>
                        <TableCell>{cert.laboratory_director}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {new Date(cert.expiry_date).toLocaleDateString()}
                            {isExpired(cert.expiry_date) && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                            {isExpiringSoon(cert.expiry_date) && !isExpired(cert.expiry_date) && (
                              <Calendar className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(cert.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dea" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    DEA Registrations
                  </CardTitle>
                  <CardDescription>
                    Drug Enforcement Administration registrations for controlled substance prescribing
                  </CardDescription>
                </div>
                <Button onClick={() => setShowDEADialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add DEA Registration
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {deaRegistrations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No DEA registrations found. Add one to enable controlled substance prescribing.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DEA Number</TableHead>
                      <TableHead>Registration Type</TableHead>
                      <TableHead>Schedule Authority</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deaRegistrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-mono">{reg.dea_number}</TableCell>
                        <TableCell className="capitalize">{reg.registration_type}</TableCell>
                        <TableCell>{reg.schedule_authority}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {new Date(reg.expiry_date).toLocaleDateString()}
                            {isExpired(reg.expiry_date) && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                            {isExpiringSoon(reg.expiry_date) && !isExpired(reg.expiry_date) && (
                              <Calendar className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(reg.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="licenses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    State Medical Licenses
                  </CardTitle>
                  <CardDescription>
                    State medical licenses for healthcare practice authorization
                  </CardDescription>
                </div>
                <Button onClick={() => setShowLicenseDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add State License
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stateLicenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No state licenses found. Add licenses for states where the provider practices.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>State</TableHead>
                      <TableHead>License Number</TableHead>
                      <TableHead>License Type</TableHead>
                      <TableHead>Issuing Board</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stateLicenses.map((license) => (
                      <TableRow key={license.id}>
                        <TableCell className="font-medium">{license.state_code}</TableCell>
                        <TableCell className="font-mono">{license.license_number}</TableCell>
                        <TableCell>{license.license_type}</TableCell>
                        <TableCell>{license.issuing_board}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {new Date(license.expiry_date).toLocaleDateString()}
                            {isExpired(license.expiry_date) && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                            {isExpiringSoon(license.expiry_date) && !isExpired(license.expiry_date) && (
                              <Calendar className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(license.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* CLIA Certificate Dialog */}
      <Dialog open={showCLIADialog} onOpenChange={setShowCLIADialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add CLIA Certificate</DialogTitle>
            <DialogDescription>
              Enter the details for the Clinical Laboratory Improvement Amendments certificate
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clia_number">CLIA Number *</Label>
              <Input
                id="clia_number"
                value={newCLIA.clia_number}
                onChange={(e) => setNewCLIA({ ...newCLIA, clia_number: e.target.value.toUpperCase() })}
                placeholder="12D3456789"
                maxLength={10}
                onBlur={() => {
                  if (newCLIA.clia_number.length === 10) {
                    validateRegulatoryNumber('clia', newCLIA.clia_number);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">Format: 2 digits + 1 letter + 7 digits</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="certificate_type">Certificate Type</Label>
              <Select value={newCLIA.certificate_type} onValueChange={(value) => setNewCLIA({ ...newCLIA, certificate_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waived">Waived</SelectItem>
                  <SelectItem value="moderate_complexity">Moderate Complexity</SelectItem>
                  <SelectItem value="high_complexity">High Complexity</SelectItem>
                  <SelectItem value="provider_performed">Provider Performed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="laboratory_name">Laboratory Name *</Label>
              <Input
                id="laboratory_name"
                value={newCLIA.laboratory_name}
                onChange={(e) => setNewCLIA({ ...newCLIA, laboratory_name: e.target.value })}
                placeholder="OVHI Medical Laboratory"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="laboratory_director">Laboratory Director</Label>
              <Input
                id="laboratory_director"
                value={newCLIA.laboratory_director}
                onChange={(e) => setNewCLIA({ ...newCLIA, laboratory_director: e.target.value })}
                placeholder="Dr. Sarah Johnson"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="director_license_number">Director License Number</Label>
              <Input
                id="director_license_number"
                value={newCLIA.director_license_number}
                onChange={(e) => setNewCLIA({ ...newCLIA, director_license_number: e.target.value })}
                placeholder="MD123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date *</Label>
              <Input
                id="effective_date"
                type="date"
                value={newCLIA.effective_date}
                onChange={(e) => setNewCLIA({ ...newCLIA, effective_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date *</Label>
              <Input
                id="expiry_date"
                type="date"
                value={newCLIA.expiry_date}
                onChange={(e) => setNewCLIA({ ...newCLIA, expiry_date: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="laboratory_address">Laboratory Address</Label>
              <Input
                id="laboratory_address"
                value={newCLIA.laboratory_address}
                onChange={(e) => setNewCLIA({ ...newCLIA, laboratory_address: e.target.value })}
                placeholder="123 Medical Center Dr, Suite 100, Los Angeles, CA 90210"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCLIADialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveCLIACertificate}>
              Save Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DEA Registration Dialog */}
      <Dialog open={showDEADialog} onOpenChange={setShowDEADialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add DEA Registration</DialogTitle>
            <DialogDescription>
              Enter the Drug Enforcement Administration registration details
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dea_number">DEA Number *</Label>
              <Input
                id="dea_number"
                value={newDEA.dea_number}
                onChange={(e) => setNewDEA({ ...newDEA, dea_number: e.target.value.toUpperCase() })}
                placeholder="AB1234563"
                maxLength={9}
                onBlur={() => {
                  if (newDEA.dea_number.length === 9) {
                    validateRegulatoryNumber('dea', newDEA.dea_number);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">Format: 2 letters + 7 digits with checksum</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_type">Registration Type</Label>
              <Select value={newDEA.registration_type} onValueChange={(value) => setNewDEA({ ...newDEA, registration_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="practitioner">Practitioner</SelectItem>
                  <SelectItem value="mid-level">Mid-Level Practitioner</SelectItem>
                  <SelectItem value="researcher">Researcher</SelectItem>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule_authority">Schedule Authority</Label>
              <Input
                id="schedule_authority"
                value={newDEA.schedule_authority}
                onChange={(e) => setNewDEA({ ...newDEA, schedule_authority: e.target.value })}
                placeholder="2,3,4,5"
              />
              <p className="text-xs text-muted-foreground">Comma-separated schedule numbers</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date_dea">Expiry Date *</Label>
              <Input
                id="expiry_date_dea"
                type="date"
                value={newDEA.expiry_date}
                onChange={(e) => setNewDEA({ ...newDEA, expiry_date: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="business_activity">Business Activity</Label>
              <Input
                id="business_activity"
                value={newDEA.business_activity}
                onChange={(e) => setNewDEA({ ...newDEA, business_activity: e.target.value })}
                placeholder="Prescribing controlled substances"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="registered_address">Registered Address</Label>
              <Input
                id="registered_address"
                value={newDEA.registered_address}
                onChange={(e) => setNewDEA({ ...newDEA, registered_address: e.target.value })}
                placeholder="123 Medical Center Dr, Los Angeles, CA 90210"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDEADialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveDEARegistration}>
              Save Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* State License Dialog */}
      <Dialog open={showLicenseDialog} onOpenChange={setShowLicenseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add State License</DialogTitle>
            <DialogDescription>
              Enter the state medical license details
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state_code">State *</Label>
              <Select value={newLicense.state_code} onValueChange={(value) => setNewLicense({ ...newLicense, state_code: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CA">California</SelectItem>
                  <SelectItem value="NY">New York</SelectItem>
                  <SelectItem value="TX">Texas</SelectItem>
                  <SelectItem value="FL">Florida</SelectItem>
                  <SelectItem value="NV">Nevada</SelectItem>
                  {/* Add more states as needed */}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="license_number_state">License Number *</Label>
              <Input
                id="license_number_state"
                value={newLicense.license_number}
                onChange={(e) => setNewLicense({ ...newLicense, license_number: e.target.value })}
                placeholder="A123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license_type">License Type</Label>
              <Input
                id="license_type"
                value={newLicense.license_type}
                onChange={(e) => setNewLicense({ ...newLicense, license_type: e.target.value })}
                placeholder="Medical License"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue_date">Issue Date</Label>
              <Input
                id="issue_date"
                type="date"
                value={newLicense.issue_date}
                onChange={(e) => setNewLicense({ ...newLicense, issue_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date_license">Expiry Date</Label>
              <Input
                id="expiry_date_license"
                type="date"
                value={newLicense.expiry_date}
                onChange={(e) => setNewLicense({ ...newLicense, expiry_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status_license">Status</Label>
              <Select value={newLicense.status} onValueChange={(value) => setNewLicense({ ...newLicense, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="issuing_board">Issuing Board</Label>
              <Input
                id="issuing_board"
                value={newLicense.issuing_board}
                onChange={(e) => setNewLicense({ ...newLicense, issuing_board: e.target.value })}
                placeholder="Medical Board of California"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLicenseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveStateLicense}>
              Save License
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegulatoryComplianceSettings;