import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, FileText, Search, Check } from 'lucide-react';
import billingService, { Service, BillItem } from '@/services/billingService';
import { toast } from 'sonner';

interface CreateBillFormProps {
  onSuccess: () => void;
}

interface BillFormData {
  patient_id: string;
  notes: string;
}

interface ServiceItem extends BillItem {
  id: string;
  service_name?: string;
  service_price?: number;
  line_total?: number;
}

interface PatientSearchResult {
  patient_id: number;
  patient_name: string;
}

const CreateBillForm: React.FC<CreateBillFormProps> = ({ onSuccess }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [items, setItems] = useState<ServiceItem[]>([
    { id: '1', service_id: 0, quantity: 1 }
  ]);
  const [loading, setLoading] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const { register, handleSubmit } = useForm<BillFormData>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const servicesData = await billingService.getServices();
      setServices(servicesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load form data');
    }
  };

  const searchPatients = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await billingService.searchPatients(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching patients:', error);
      toast.error('Failed to search patients');
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (patientSearchTerm) {
        searchPatients(patientSearchTerm);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [patientSearchTerm]);

  const addItem = () => {
    const newId = (Math.max(...items.map(item => parseInt(item.id))) + 1).toString();
    setItems([...items, { id: newId, service_id: 0, quantity: 1 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof ServiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };

        // If service_id changed, update service details and clear manual overrides
        if (field === 'service_id') {
          const service = services.find(s => s.service_id === parseInt(value));
          if (service) {
            updatedItem.service_name = service.name;
            updatedItem.service_price = service.price;
            updatedItem.unit_price = service.price;
            // Clear manual line total when service changes
            updatedItem.line_total = undefined;
          }
        }

        // If quantity or unit_price changed, clear manual line total to recalculate
        if ((field === 'quantity' || field === 'unit_price')) {
          updatedItem.line_total = undefined;
        }

        return updatedItem;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      // Use manual line_total if set, otherwise calculate from unit_price * quantity
      if (item.line_total !== undefined && item.line_total !== null) {
        return total + item.line_total;
      } else {
        const service = services.find(s => s.service_id === item.service_id);
        const price = item.unit_price || service?.price || 0;
        return total + (price * item.quantity);
      }
    }, 0);
  };

  const onSubmit = async (data: BillFormData) => {
    try {
      setLoading(true);

      // Validate patient selection
      if (!selectedPatient || !selectedPatient.patient_id) {
        toast.error('Please select a patient');
        return;
      }

      // Validate items
      const validItems = items.filter(item => item.service_id > 0);
      if (validItems.length === 0) {
        toast.error('Please add at least one service');
        return;
      }

      const billData = {
        patient_id: selectedPatient.patient_id,
        notes: data.notes,
        total: calculateTotal(), // Add the calculated total
        items: validItems.map(item => {
          // Calculate final unit price and line total
          const service = services.find(s => s.service_id === item.service_id);
          const finalUnitPrice = item.unit_price || service?.price || 0;
          const finalLineTotal = item.line_total !== undefined ? item.line_total : (finalUnitPrice * item.quantity);

          return {
            service_id: item.service_id,
            quantity: item.quantity,
            unit_price: item.line_total !== undefined ? (item.line_total / item.quantity) : finalUnitPrice,
            line_total: finalLineTotal
          };
        })
      };

      await billingService.createBill(billData);
      onSuccess();
    } catch (error) {
      console.error('Error creating bill:', error);
      toast.error('Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  const createAndGenerateInvoice = async (data: BillFormData) => {
    try {
      setGeneratingInvoice(true);

      // Validate patient selection
      if (!selectedPatient || !selectedPatient.patient_id) {
        toast.error('Please select a patient');
        return;
      }

      // Validate items
      const validItems = items.filter(item => item.service_id > 0);
      if (validItems.length === 0) {
        toast.error('Please add at least one service');
        return;
      }

      const billData = {
        patient_id: selectedPatient.patient_id,
        notes: data.notes,
        items: validItems.map(item => {
          // Calculate final unit price and line total
          const service = services.find(s => s.service_id === item.service_id);
          const finalUnitPrice = item.unit_price || service?.price || 0;
          const finalLineTotal = item.line_total !== undefined ? item.line_total : (finalUnitPrice * item.quantity);

          return {
            service_id: item.service_id,
            quantity: item.quantity,
            unit_price: item.line_total !== undefined ? (item.line_total / item.quantity) : finalUnitPrice,
            line_total: finalLineTotal
          };
        }),
        total: calculateTotal() // Add the calculated total as number
      };

      // Create bill
      const bill = await billingService.createBill(billData);

      // Generate invoice
      await billingService.generateInvoice(bill.id);

      toast.success('Bill created and invoice generated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating bill and invoice:', error);
      toast.error('Failed to create bill and generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getLineTotal = (item: ServiceItem) => {
    // Return manual line_total if set, otherwise calculate from unit_price * quantity
    if (item.line_total !== undefined && item.line_total !== null) {
      return item.line_total;
    } else {
      const service = services.find(s => s.service_id === item.service_id);
      const price = item.unit_price || service?.price || 0;
      return price * item.quantity;
    }
  };

  return (
    <form className="space-y-6">
      {/* Patient Selection - Autocomplete */}
      <div className="space-y-2">
        <Label>Patient *</Label>
        <div className="relative">
          <Input
            type="text"
            placeholder="Type patient name, email, or phone to search..."
            value={patientSearchTerm}
            onChange={(e) => {
              const value = e.target.value;
              setPatientSearchTerm(value);

              // Clear selection if user is typing new search
              if (selectedPatient && value !== selectedPatient.patient_name) {
                setSelectedPatient(null);
              }

              // Show dropdown when typing
              if (value.length >= 2) {
                setPatientSearchOpen(true);
              } else {
                setPatientSearchOpen(false);
                setSearchResults([]);
              }
            }}
            onFocus={() => {
              if (patientSearchTerm.length >= 2) {
                setPatientSearchOpen(true);
              }
            }}
            onBlur={() => {
              // Delay hiding to allow for selection
              setTimeout(() => setPatientSearchOpen(false), 200);
            }}
            className="pr-10"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

          {/* Dropdown Results */}
          {patientSearchOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto">
              {searchResults.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">
                  {patientSearchTerm.length < 2
                    ? "Type at least 2 characters to search..."
                    : "No patients found."
                  }
                </div>
              ) : (
                <div className="py-1">
                  {searchResults.map((patient) => (
                    <div
                      key={patient.patient_id}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center gap-3"
                      onClick={() => {
                        setSelectedPatient(patient);
                        setPatientSearchTerm(patient.patient_name);
                        setPatientSearchOpen(false);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {patient.patient_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {patient.patient_id}
                        </div>
                      </div>
                      {selectedPatient?.patient_id === patient.patient_id && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Patient Display */}
        {selectedPatient && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800">
              Selected: <strong>{selectedPatient.patient_name}</strong> (ID: {selectedPatient.patient_id})
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPatient(null);
                setPatientSearchTerm('');
                setPatientSearchOpen(false);
              }}
              className="ml-auto h-6 w-6 p-0 text-green-600 hover:text-green-800"
            >
              ×
            </Button>
          </div>
        )}

        {!selectedPatient && patientSearchTerm && (
          <p className="text-sm text-red-600">Please select a patient from the search results</p>
        )}
        {!selectedPatient && !patientSearchTerm && (
          <p className="text-sm text-red-600">Please search and select a patient</p>
        )}
      </div>

      {/* Services */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Services</CardTitle>
            <Button type="button" onClick={addItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 items-end p-4 border rounded-lg">
              <div className="flex-1">
                <Label>Service</Label>
                <Select
                  value={item.service_id.toString()}
                  onValueChange={(value) => updateItem(item.id, 'service_id', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.service_id} value={service.service_id.toString()}>
                        {service.name} ({service.cpt_codes}) - {formatCurrency(service.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-24">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="w-32">
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unit_price || ''}
                  onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                  placeholder="Auto"
                />
              </div>

              {/* <div className="w-32">
                <Label>Line Total</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.line_total !== undefined ? item.line_total : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateItem(item.id, 'line_total', undefined);
                    } else {
                      updateItem(item.id, 'line_total', parseFloat(value) || 0);
                    }
                  }}
                  placeholder={formatCurrency(getLineTotal({ ...item, line_total: undefined }))}
                  className={item.line_total !== undefined ? 'border-blue-300 bg-blue-50' : ''}
                />
              </div> */}

              {items.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <div className="flex justify-end">
            <div className="text-right">
              <div className="text-lg font-semibold">
                Total: {formatCurrency(calculateTotal())}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          {...register('notes')}
          placeholder="Additional notes for this bill..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={loading || generatingInvoice}
        >
          {loading ? 'Creating...' : 'Save as Draft'}
        </Button>
        {/* <Button
          type="button"
          onClick={handleSubmit(createAndGenerateInvoice)}
          disabled={loading || generatingInvoice}
        >
          <FileText className="h-4 w-4 mr-2" />
          {generatingInvoice ? 'Generating...' : 'Create & Generate Invoice'}
        </Button> */}
      </div>
    </form>
  );
};

export default CreateBillForm;