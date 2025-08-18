import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, X, Save, Send, User, Calendar, AlertCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
}

interface LabTest {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  price: number;
  turnaroundTime: string;
  requirements?: string;
}

interface LabFacility {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  capabilities: string[];
}

interface OrderForm {
  patientId: string;
  facilityId: string;
  priority: 'routine' | 'urgent' | 'stat';
  tests: string[];
  clinicalInfo: string;
  notes: string;
  collectionDate: string;
  collectionTime: string;
  fastingRequired: boolean;
  specialInstructions: string;
}

const LabOrderForm: React.FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const isEditing = !!orderId;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [facilities, setFacilities] = useState<LabFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [showTestSearch, setShowTestSearch] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [testSearchTerm, setTestSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTests, setSelectedTests] = useState<LabTest[]>([]);

  const [formData, setFormData] = useState<OrderForm>({
    patientId: '',
    facilityId: '',
    priority: 'routine',
    tests: [],
    clinicalInfo: '',
    notes: '',
    collectionDate: '',
    collectionTime: '',
    fastingRequired: false,
    specialInstructions: ''
  });

  useEffect(() => {
    fetchInitialData();
    if (isEditing) {
      fetchOrderData();
    }
  }, [orderId]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch patients, lab tests, and facilities
      const [patientsRes, testsRes, facilitiesRes] = await Promise.all([
        fetch('/api/v1/patients', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/labs/tests', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/labs/facilities', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (patientsRes.ok && testsRes.ok && facilitiesRes.ok) {
        const [patientsData, testsData, facilitiesData] = await Promise.all([
          patientsRes.json(),
          testsRes.json(),
          facilitiesRes.json()
        ]);

        setPatients(patientsData.patients || []);
        setLabTests(testsData.tests || []);
        setFacilities(facilitiesData.facilities || []);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast({
        title: "Error",
        description: "Failed to load form data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/labs/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const order = data.order;
        
        setFormData({
          patientId: order.patientId,
          facilityId: order.facilityId,
          priority: order.priority,
          tests: order.tests.map((t: any) => t.id),
          clinicalInfo: order.clinicalInfo || '',
          notes: order.notes || '',
          collectionDate: order.collectionDate || '',
          collectionTime: order.collectionTime || '',
          fastingRequired: order.fastingRequired || false,
          specialInstructions: order.specialInstructions || ''
        });

        // Set selected patient and tests
        const patient = patients.find(p => p.id === order.patientId);
        if (patient) setSelectedPatient(patient);
        
        const tests = labTests.filter(t => order.tests.some((ot: any) => ot.id === t.id));
        setSelectedTests(tests);
      }
    } catch (error) {
      console.error('Error fetching order data:', error);
      toast({
        title: "Error",
        description: "Failed to load order data",
        variant: "destructive"
      });
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({ ...formData, patientId: patient.id });
    setShowPatientSearch(false);
    setPatientSearchTerm('');
  };

  const handleTestSelect = (test: LabTest) => {
    if (!selectedTests.find(t => t.id === test.id)) {
      const newSelectedTests = [...selectedTests, test];
      setSelectedTests(newSelectedTests);
      setFormData({ ...formData, tests: newSelectedTests.map(t => t.id) });
    }
    setShowTestSearch(false);
    setTestSearchTerm('');
  };

  const handleTestRemove = (testId: string) => {
    const newSelectedTests = selectedTests.filter(t => t.id !== testId);
    setSelectedTests(newSelectedTests);
    setFormData({ ...formData, tests: newSelectedTests.map(t => t.id) });
  };

  const handleSubmit = async (isDraft = false) => {
    if (!formData.patientId || !formData.facilityId || formData.tests.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = isEditing 
        ? `/api/v1/labs/orders/${orderId}`
        : '/api/v1/labs/orders';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          status: isDraft ? 'draft' : 'pending'
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Lab order ${isEditing ? 'updated' : 'created'} successfully`
        });
        navigate('/provider/labs/orders');
      } else {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} lab order`);
      }
    } catch (error) {
      console.error('Error saving lab order:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} lab order`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
    patient.phone.includes(patientSearchTerm)
  );

  const filteredTests = labTests.filter(test =>
    test.name.toLowerCase().includes(testSearchTerm.toLowerCase()) ||
    test.code.toLowerCase().includes(testSearchTerm.toLowerCase()) ||
    test.category.toLowerCase().includes(testSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{isEditing ? 'Edit' : 'New'} Lab Order</h2>
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
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
        <h2 className="text-2xl font-bold">{isEditing ? 'Edit' : 'New'} Lab Order</h2>
        <Button variant="outline" onClick={() => navigate('/provider/labs/orders')}>
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
              <CardDescription>Select the patient for this lab order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPatient ? (
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <User className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium">{selectedPatient.name}</h4>
                      <p className="text-sm text-gray-600">
                        DOB: {new Date(selectedPatient.dateOfBirth).toLocaleDateString()} | 
                        Phone: {selectedPatient.phone}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(null);
                      setFormData({ ...formData, patientId: '' });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Dialog open={showPatientSearch} onOpenChange={setShowPatientSearch}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Search className="h-4 w-4 mr-2" />
                      Select Patient
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Select Patient</DialogTitle>
                      <DialogDescription>Search and select a patient for this lab order</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Search by name or phone..."
                        value={patientSearchTerm}
                        onChange={(e) => setPatientSearchTerm(e.target.value)}
                      />
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {filteredPatients.map((patient) => (
                          <div
                            key={patient.id}
                            className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                            onClick={() => handlePatientSelect(patient)}
                          >
                            <h4 className="font-medium">{patient.name}</h4>
                            <p className="text-sm text-gray-600">
                              DOB: {new Date(patient.dateOfBirth).toLocaleDateString()} | 
                              Phone: {patient.phone}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {/* Lab Tests Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Lab Tests</CardTitle>
              <CardDescription>Select the tests to be performed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog open={showTestSearch} onOpenChange={setShowTestSearch}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Lab Test
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Select Lab Tests</DialogTitle>
                    <DialogDescription>Search and select tests to add to this order</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Search by test name, code, or category..."
                      value={testSearchTerm}
                      onChange={(e) => setTestSearchTerm(e.target.value)}
                    />
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {filteredTests.map((test) => (
                        <div
                          key={test.id}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                          onClick={() => handleTestSelect(test)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{test.name}</h4>
                              <p className="text-sm text-gray-600">{test.description}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline">{test.code}</Badge>
                                <Badge variant="secondary">{test.category}</Badge>
                                <span className="text-sm text-gray-500">
                                  TAT: {test.turnaroundTime}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm font-medium">${test.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Selected Tests */}
              {selectedTests.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Tests ({selectedTests.length})</Label>
                  {selectedTests.map((test) => (
                    <div key={test.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium">{test.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{test.code}</Badge>
                          <Badge variant="secondary">{test.category}</Badge>
                          <span className="text-sm text-gray-500">${test.price}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestRemove(test.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="facility">Lab Facility *</Label>
                  <Select value={formData.facilityId} onValueChange={(value) => setFormData({ ...formData, facilityId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilities.map((facility) => (
                        <SelectItem key={facility.id} value={facility.id}>
                          {facility.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority *</Label>
                  <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stat">STAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="collectionDate">Collection Date</Label>
                  <Input
                    id="collectionDate"
                    type="date"
                    value={formData.collectionDate}
                    onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="collectionTime">Collection Time</Label>
                  <Input
                    id="collectionTime"
                    type="time"
                    value={formData.collectionTime}
                    onChange={(e) => setFormData({ ...formData, collectionTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fastingRequired"
                  checked={formData.fastingRequired}
                  onCheckedChange={(checked) => setFormData({ ...formData, fastingRequired: !!checked })}
                />
                <Label htmlFor="fastingRequired">Fasting Required</Label>
              </div>

              <div>
                <Label htmlFor="clinicalInfo">Clinical Information</Label>
                <Textarea
                  id="clinicalInfo"
                  placeholder="Relevant clinical information, symptoms, diagnosis..."
                  value={formData.clinicalInfo}
                  onChange={(e) => setFormData({ ...formData, clinicalInfo: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="specialInstructions">Special Instructions</Label>
                <Textarea
                  id="specialInstructions"
                  placeholder="Any special collection or handling instructions..."
                  value={formData.specialInstructions}
                  onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPatient && (
                <div>
                  <Label className="text-sm font-medium">Patient</Label>
                  <p className="text-sm">{selectedPatient.name}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Tests ({selectedTests.length})</Label>
                <div className="space-y-1">
                  {selectedTests.map((test) => (
                    <p key={test.id} className="text-sm">{test.name}</p>
                  ))}
                </div>
              </div>

              {formData.priority && (
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <p className="text-sm capitalize">{formData.priority}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Total Cost</Label>
                <p className="text-lg font-bold">
                  ${selectedTests.reduce((sum, test) => sum + test.price, 0).toFixed(2)}
                </p>
              </div>

              {formData.fastingRequired && (
                <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">Fasting Required</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => handleSubmit(false)}
                  disabled={saving || !formData.patientId || !formData.facilityId || formData.tests.length === 0}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {saving ? 'Submitting...' : isEditing ? 'Update Order' : 'Submit Order'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSubmit(true)}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LabOrderForm;