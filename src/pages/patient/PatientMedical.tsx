
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, AlertTriangle, Shield, Users, Download, Filter, Calendar } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { formatDate } from '@/utils/formatHelpers';
import { toast } from '@/components/ui/use-toast';

interface MedicalRecord {
  id: string;
  type: 'diagnosis' | 'procedure' | 'note' | 'document' | 'lab_result' | 'imaging';
  title: string;
  description: string;
  dateRecorded: string;
  provider: string;
  documentUrl?: string;
  createdAt: string;
}

interface Allergy {
  id: string;
  allergyName: string;
  allergyType: 'drug' | 'food' | 'environmental' | 'other';
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  reactionDescription: string;
}

const PatientMedical: React.FC = () => {
  const { user, token } = useSelector((state: RootState) => state.auth);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (user?.id && token) {
      fetchMedicalRecords();
      fetchAllergies();
    }
  }, [user, token, filterType, dateRange]);

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('type', filterType);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      const response = await fetch(`/api/v1/patients/${user?.id}/medical-records?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMedicalRecords(data.data.records || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch medical records",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
      toast({
        title: "Error",
        description: "Failed to fetch medical records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllergies = async () => {
    try {
      // This would be part of the medical records or a separate allergies endpoint
      // For now, we'll simulate allergy data
      setAllergies([
        {
          id: '1',
          allergyName: 'Penicillin',
          allergyType: 'drug',
          severity: 'severe',
          reactionDescription: 'Causes severe rash and difficulty breathing'
        },
        {
          id: '2',
          allergyName: 'Shellfish',
          allergyType: 'food',
          severity: 'moderate',
          reactionDescription: 'Causes hives and swelling'
        }
      ]);
    } catch (error) {
      console.error('Error fetching allergies:', error);
    }
  };

  if (!user) {
    return <div className="text-center py-8">Please log in to view medical records</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Medical Records</h1>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Records
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filter Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Record Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="diagnosis">Diagnoses</SelectItem>
                <SelectItem value="procedure">Procedures</SelectItem>
                <SelectItem value="lab_result">Lab Results</SelectItem>
                <SelectItem value="imaging">Imaging</SelectItem>
                <SelectItem value="note">Notes</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              placeholder="Start Date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            
            <Input
              type="date"
              placeholder="End Date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
            
            <Button onClick={fetchMedicalRecords} variant="outline">
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Allergies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Allergies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allergies.map((allergy) => (
                <div key={allergy.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{allergy.allergyName}</h4>
                      <p className="text-sm text-muted-foreground">{allergy.reactionDescription}</p>
                      <p className="text-xs text-muted-foreground capitalize">{allergy.allergyType} allergy</p>
                    </div>
                    <Badge variant={allergy.severity === 'severe' || allergy.severity === 'life_threatening' ? 'destructive' : 
                                 allergy.severity === 'moderate' ? 'secondary' : 'outline'}>
                      {allergy.severity}
                    </Badge>
                  </div>
                </div>
              ))}
              {allergies.length === 0 && (
                <p className="text-muted-foreground">No known allergies</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Records Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Recent Records Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Records:</span>
                <span className="font-medium">{medicalRecords.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Diagnoses:</span>
                <span className="font-medium">
                  {medicalRecords.filter(r => r.type === 'diagnosis').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Lab Results:</span>
                <span className="font-medium">
                  {medicalRecords.filter(r => r.type === 'lab_result').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Procedures:</span>
                <span className="font-medium">
                  {medicalRecords.filter(r => r.type === 'procedure').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medical Records List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Medical Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-3 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {medicalRecords.map((record) => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold">{record.title}</h4>
                        <Badge variant="outline" className="capitalize">
                          {record.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{record.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(record.dateRecorded)}
                        </span>
                        <span>{record.provider}</span>
                      </div>
                    </div>
                    {record.documentUrl && (
                      <Button size="sm" variant="outline">
                        <Download className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {medicalRecords.length === 0 && !loading && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Medical Records Found</h3>
                  <p className="text-gray-500">
                    {filterType !== 'all' || dateRange.start || dateRange.end
                      ? 'No records match your current filters.'
                      : 'Your medical records will appear here once they are available.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientMedical;
