import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  FileText,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Save,
  Edit,
  Plus,
  Trash2,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Heart,
  Pill,
  Stethoscope
} from 'lucide-react';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

interface EnhancedPatientProfileProps {
  patientId: string;
  onUpdate?: (updatedData: any) => void;
}

interface PatientData {
  // Core Demographics
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  pronouns?: string;
  dateOfBirth: string;
  gender: string;
  
  // Contact Information
  email: string;
  phone: string;
  alternatePhone?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Enhanced Demographics
  ethnicity?: string;
  race?: string;
  languagePreference: string;
  preferredCommunication: 'phone' | 'email' | 'sms' | 'portal';
  maritalStatus?: string;
  
  // Accessibility & Special Needs
  disabilityStatus?: string;
  accessibilityNeeds?: string[];
  interpreterNeeded: boolean;
  wheelchairAccess: boolean;
  
  // Emergency Contact
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  
  // Identifiers
  ssn?: string; // Encrypted
  driverLicense?: string;
  passport?: string;
  
  // Insurance Information
  insurances: InsuranceInfo[];
  
  // Clinical Data
  allergies: AllergyInfo[];
  medications: MedicationInfo[];
  problemList: ProblemInfo[];
  riskScores: RiskScoreInfo[];
  
  // Compliance & Consent
  consents: ConsentInfo[];
  
  // System Fields
  profileCompleteness: number;
  lastUpdated: string;
  createdAt: string;
}

interface InsuranceInfo {
  id?: string;
  priority: 'primary' | 'secondary' | 'tertiary';
  payerName: string;
  planName: string;
  memberId: string;
  groupNumber?: string;
  policyHolderName: string;
  policyHolderDob: string;
  relationshipToPatient: string;
  effectiveDate: string;
  terminationDate?: string;
  copayAmount?: number;
  deductibleAmount?: number;
  isActive: boolean;
  eligibilityVerified: boolean;
  lastEligibilityCheck?: string;
  cardFrontImage?: string;
  cardBackImage?: string;
}

interface AllergyInfo {
  id?: string;
  allergen: string;
  category: 'food' | 'medication' | 'environmental' | 'other';
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  onsetDate?: string;
  notes?: string;
}

interface MedicationInfo {
  id?: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  prescribedBy: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'discontinued' | 'completed';
  indication?: string;
  notes?: string;
}

interface ProblemInfo {
  id?: string;
  problemCode: string;
  description: string;
  icd10Code?: string;
  snomedCode?: string;
  onsetDate?: string;
  status: 'active' | 'inactive' | 'resolved' | 'chronic';
  severity: 'mild' | 'moderate' | 'severe';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface RiskScoreInfo {
  id?: string;
  scoreType: 'hcc_raf' | 'fall_risk' | 'readmission_risk' | 'mortality_risk';
  scoreValue: number;
  scoreCategory: string;
  assessmentDate: string;
  validThrough?: string;
  calculatedBy: string;
}

interface ConsentInfo {
  id?: string;
  consentType: 'hipaa' | 'treatment' | 'financial' | 'research' | 'marketing';
  consentStatus: 'granted' | 'denied' | 'withdrawn';
  consentDate: string;
  expirationDate?: string;
  digitalSignature?: string;
  witnessSignature?: string;
  notes?: string;
}

const EnhancedPatientProfile: React.FC<EnhancedPatientProfileProps> = ({
  patientId,
  onUpdate
}) => {
  const { token, user } = useSelector((state: RootState) => state.auth);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('demographics');
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [completenessScore, setCompletenessScore] = useState(0);

  // Load patient data
  useEffect(() => {
    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  const loadPatientData = async () => {
    setLoading(true);
    try {
      // This would be replaced with actual API call
      const response = await fetch(`/api/v1/patients/${patientId}/enhanced`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPatientData(data.patient);
        setCompletenessScore(data.completenessScore || 0);
      } else {
        toast.error('Failed to load patient data');
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
      toast.error('Error loading patient data');
    } finally {
      setLoading(false);
    }
  };

  const savePatientData = async () => {
    if (!patientData) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/patients/${patientId}/enhanced`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patientData)
      });
      
      if (response.ok) {
        const result = await response.json();
        setCompletenessScore(result.completenessScore || 0);
        toast.success('Patient profile updated successfully');
        setEditMode(false);
        onUpdate?.(patientData);
      } else {
        toast.error('Failed to update patient profile');
      }
    } catch (error) {
      console.error('Error saving patient data:', error);
      toast.error('Error saving patient data');
    } finally {
      setSaving(false);
    }
  };

  const calculateCompleteness = (data: PatientData): number => {
    const requiredFields = [
      'firstName', 'lastName', 'dateOfBirth', 'gender', 'email', 'phone',
      'address.line1', 'address.city', 'address.state', 'address.zipCode'
    ];
    
    const optionalFields = [
      'middleName', 'suffix', 'pronouns', 'ethnicity', 'race', 
      'languagePreference', 'maritalStatus', 'emergencyContact.name'
    ];
    
    let score = 0;
    let totalFields = requiredFields.length + optionalFields.length;
    
    // Check required fields (weighted more heavily)
    requiredFields.forEach(field => {
      if (getNestedValue(data, field)) score += 2;
    });
    
    // Check optional fields
    optionalFields.forEach(field => {
      if (getNestedValue(data, field)) score += 1;
    });
    
    // Add points for clinical data
    if (data.allergies?.length > 0) score += 2;
    if (data.medications?.length > 0) score += 2;
    if (data.problemList?.length > 0) score += 2;
    if (data.insurances?.length > 0) score += 3;
    
    totalFields += 10; // Adjust for clinical data fields
    
    return Math.round((score / (totalFields * 2)) * 100);
  };

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const renderCompletenessIndicator = () => {
    const getColor = (score: number) => {
      if (score >= 90) return 'text-green-600 bg-green-100';
      if (score >= 70) return 'text-yellow-600 bg-yellow-100';
      return 'text-red-600 bg-red-100';
    };

    return (
      <div className="flex items-center space-x-2">
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getColor(completenessScore)}`}>
          {completenessScore}% Complete
        </div>
        <div className="w-32 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              completenessScore >= 90 ? 'bg-green-500' :
              completenessScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${completenessScore}%` }}
          />
        </div>
      </div>
    );
  };

  const renderDemographicsTab = () => (
    <div className="space-y-6">
      {/* Basic Demographics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Basic Demographics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={patientData?.firstName || ''}
                onChange={(e) => setPatientData(prev => prev ? {...prev, firstName: e.target.value} : null)}
                disabled={!editMode}
                required
              />
            </div>
            <div>
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                value={patientData?.middleName || ''}
                onChange={(e) => setPatientData(prev => prev ? {...prev, middleName: e.target.value} : null)}
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={patientData?.lastName || ''}
                onChange={(e) => setPatientData(prev => prev ? {...prev, lastName: e.target.value} : null)}
                disabled={!editMode}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="suffix">Suffix</Label>
              <Select
                value={patientData?.suffix || ''}
                onValueChange={(value) => setPatientData(prev => prev ? {...prev, suffix: value} : null)}
                disabled={!editMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select suffix" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Jr.">Jr.</SelectItem>
                  <SelectItem value="Sr.">Sr.</SelectItem>
                  <SelectItem value="II">II</SelectItem>
                  <SelectItem value="III">III</SelectItem>
                  <SelectItem value="IV">IV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pronouns">Pronouns</Label>
              <Select
                value={patientData?.pronouns || ''}
                onValueChange={(value) => setPatientData(prev => prev ? {...prev, pronouns: value} : null)}
                disabled={!editMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pronouns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="he/him">He/Him</SelectItem>
                  <SelectItem value="she/her">She/Her</SelectItem>
                  <SelectItem value="they/them">They/Them</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={patientData?.dateOfBirth || ''}
                onChange={(e) => setPatientData(prev => prev ? {...prev, dateOfBirth: e.target.value} : null)}
                disabled={!editMode}
                required
              />
            </div>
            <div>
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={patientData?.gender || ''}
                onValueChange={(value) => setPatientData(prev => prev ? {...prev, gender: value} : null)}
                disabled={!editMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="ethnicity">Ethnicity</Label>
              <Select
                value={patientData?.ethnicity || ''}
                onValueChange={(value) => setPatientData(prev => prev ? {...prev, ethnicity: value} : null)}
                disabled={!editMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ethnicity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hispanic-latino">Hispanic or Latino</SelectItem>
                  <SelectItem value="not-hispanic-latino">Not Hispanic or Latino</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="race">Race</Label>
              <Select
                value={patientData?.race || ''}
                onValueChange={(value) => setPatientData(prev => prev ? {...prev, race: value} : null)}
                disabled={!editMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select race" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="black-african-american">Black or African American</SelectItem>
                  <SelectItem value="asian">Asian</SelectItem>
                  <SelectItem value="american-indian-alaska-native">American Indian or Alaska Native</SelectItem>
                  <SelectItem value="native-hawaiian-pacific-islander">Native Hawaiian or Other Pacific Islander</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="multiple">Multiple Races</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="maritalStatus">Marital Status</Label>
              <Select
                value={patientData?.maritalStatus || ''}
                onValueChange={(value) => setPatientData(prev => prev ? {...prev, maritalStatus: value} : null)}
                disabled={!editMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                  <SelectItem value="separated">Separated</SelectItem>
                  <SelectItem value="domestic-partner">Domestic Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Communication Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Communication Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="languagePreference">Preferred Language</Label>
              <Select
                value={patientData?.languagePreference || 'English'}
                onValueChange={(value) => setPatientData(prev => prev ? {...prev, languagePreference: value} : null)}
                disabled={!editMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                  <SelectItem value="German">German</SelectItem>
                  <SelectItem value="Chinese">Chinese</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="preferredCommunication">Preferred Communication Method</Label>
              <Select
                value={patientData?.preferredCommunication || 'phone'}
                onValueChange={(value: 'phone' | 'email' | 'sms' | 'portal') => 
                  setPatientData(prev => prev ? {...prev, preferredCommunication: value} : null)
                }
                disabled={!editMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">Text Message</SelectItem>
                  <SelectItem value="portal">Patient Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Accessibility Needs</Label>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="interpreterNeeded"
                  checked={patientData?.interpreterNeeded || false}
                  onCheckedChange={(checked) => 
                    setPatientData(prev => prev ? {...prev, interpreterNeeded: !!checked} : null)
                  }
                  disabled={!editMode}
                />
                <Label htmlFor="interpreterNeeded">Interpreter Needed</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wheelchairAccess"
                  checked={patientData?.wheelchairAccess || false}
                  onCheckedChange={(checked) => 
                    setPatientData(prev => prev ? {...prev, wheelchairAccess: !!checked} : null)
                  }
                  disabled={!editMode}
                />
                <Label htmlFor="wheelchairAccess">Wheelchair Access Required</Label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="accessibilityNeeds">Additional Accessibility Needs</Label>
            <Textarea
              id="accessibilityNeeds"
              value={patientData?.accessibilityNeeds?.join(', ') || ''}
              onChange={(e) => setPatientData(prev => prev ? {
                ...prev, 
                accessibilityNeeds: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              } : null)}
              disabled={!editMode}
              placeholder="Describe any additional accessibility needs..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Sensitive Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Sensitive Information
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSensitiveData(!showSensitiveData)}
              className="ml-auto"
            >
              {showSensitiveData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showSensitiveData ? 'Hide' : 'Show'}
            </Button>
          </CardTitle>
        </CardHeader>
        {showSensitiveData && (
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This section contains sensitive patient information. Access is logged and monitored.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ssn">Social Security Number</Label>
                <Input
                  id="ssn"
                  type={showSensitiveData ? 'text' : 'password'}
                  value={patientData?.ssn || ''}
                  onChange={(e) => setPatientData(prev => prev ? {...prev, ssn: e.target.value} : null)}
                  disabled={!editMode}
                  placeholder="XXX-XX-XXXX"
                />
              </div>
              <div>
                <Label htmlFor="driverLicense">Driver's License</Label>
                <Input
                  id="driverLicense"
                  value={patientData?.driverLicense || ''}
                  onChange={(e) => setPatientData(prev => prev ? {...prev, driverLicense: e.target.value} : null)}
                  disabled={!editMode}
                />
              </div>
              <div>
                <Label htmlFor="passport">Passport Number</Label>
                <Input
                  id="passport"
                  value={patientData?.passport || ''}
                  onChange={(e) => setPatientData(prev => prev ? {...prev, passport: e.target.value} : null)}
                  disabled={!editMode}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!patientData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Patient data not found or failed to load.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Enhanced Patient Profile
          </h2>
          <p className="text-gray-600">
            Comprehensive patient information management
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {renderCompletenessIndicator()}
          <div className="flex space-x-2">
            {editMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setEditMode(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={savePatientData}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditMode(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="demographics">
          {renderDemographicsTab()}
        </TabsContent>

        <TabsContent value="contact">
          <div className="text-center py-8 text-gray-500">
            Contact information tab content will be implemented here
          </div>
        </TabsContent>

        <TabsContent value="insurance">
          <div className="text-center py-8 text-gray-500">
            Insurance management tab content will be implemented here
          </div>
        </TabsContent>

        <TabsContent value="clinical">
          <div className="text-center py-8 text-gray-500">
            Clinical data tab content will be implemented here
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="text-center py-8 text-gray-500">
            Document management tab content will be implemented here
          </div>
        </TabsContent>

        <TabsContent value="compliance">
          <div className="text-center py-8 text-gray-500">
            Compliance and consent management tab content will be implemented here
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedPatientProfile;