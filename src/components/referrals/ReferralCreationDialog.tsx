import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, User, Building, Phone, MapPin, Shield, CreditCard,
  AlertCircle, CheckCircle, X, Loader2, Star, Clock, Award
} from 'lucide-react';
import { toast } from 'sonner';
import { referralService, type CreateReferralData, type Referral } from '@/services/referralService';
import { specialistService, type Specialist } from '@/services/specialistService';

interface ReferralCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  patientId?: string;
  encounterId?: string;
  onReferralCreated?: (referral: Referral) => void;
}

interface InsuranceVerification {
  isVerified: boolean;
  eligibilityStatus: 'active' | 'inactive' | 'pending' | 'unknown';
  authorizationRequired: boolean;
  copayAmount?: number;
  deductibleMet?: boolean;
  coverageDetails?: string;
  verificationDate?: string;
  priorAuthNumber?: string;
}

interface SmartSuggestion {
  specialist: Specialist;
  score: number;
  reasons: string[];
  matchType: 'location' | 'specialty' | 'rating' | 'availability' | 'network';
}

export const ReferralCreationDialog: React.FC<ReferralCreationDialogProps> = ({
  open,
  onOpenChange,
  providerId,
  patientId,
  encounterId,
  onReferralCreated
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [specialistSearch, setSpecialistSearch] = useState('');
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [insuranceVerification, setInsuranceVerification] = useState<InsuranceVerification>({
    isVerified: false,
    eligibilityStatus: 'unknown',
    authorizationRequired: false
  });
  const [verifyingInsurance, setVerifyingInsurance] = useState(false);
  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateReferralData>({
    patientId: patientId || '',
    providerId: providerId,
    encounterId: encounterId,
    specialtyType: '',
    referralReason: '',
    clinicalNotes: '',
    urgencyLevel: 'routine',
    appointmentType: 'consultation',
    authorizationRequired: false,
    followUpRequired: true
  });

  const specialties = [
    'Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology',
    'Hematology/Oncology', 'Nephrology', 'Neurology', 'Orthopedics',
    'Pulmonology', 'Rheumatology', 'Urology', 'Mental Health',
    'Physical Therapy', 'Radiology', 'Surgery', 'Ophthalmology',
    'ENT', 'Pediatrics', 'Obstetrics/Gynecology'
  ];

  // Load specialists when specialty changes
  useEffect(() => {
    if (formData.specialtyType) {
      loadSpecialists();
      generateSmartSuggestions();
    }
  }, [formData.specialtyType, diagnosisCodes]);

  // Verify insurance when patient changes
  useEffect(() => {
    if (formData.patientId && currentStep === 1) {
      verifyInsurance();
    }
  }, [formData.patientId]);

  const loadSpecialists = async () => {
    try {
      const response = await specialistService.searchSpecialists({
        specialty: formData.specialtyType,
        query: specialistSearch
      });
      
      if (response.success && response.specialists) {
        setSpecialists(response.specialists);
      }
    } catch (error) {
      console.error('Error loading specialists:', error);
      toast.error('Failed to load specialists');
    }
  };

  const verifyInsurance = async () => {
    if (!formData.patientId) return;
    
    try {
      setVerifyingInsurance(true);
      
      // Mock insurance verification - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockVerification: InsuranceVerification = {
        isVerified: true,
        eligibilityStatus: 'active',
        authorizationRequired: Math.random() > 0.5,
        copayAmount: Math.floor(Math.random() * 50) + 10,
        deductibleMet: Math.random() > 0.3,
        coverageDetails: 'Specialist visits covered at 80% after deductible',
        verificationDate: new Date().toISOString().split('T')[0],
        priorAuthNumber: Math.random() > 0.5 ? `PA${Math.floor(Math.random() * 1000000)}` : undefined
      };
      
      setInsuranceVerification(mockVerification);
      handleInputChange('authorizationRequired', mockVerification.authorizationRequired);
      
      if (mockVerification.authorizationRequired) {
        toast.info('Prior authorization required for this referral');
      }
    } catch (error) {
      console.error('Error verifying insurance:', error);
      toast.error('Failed to verify insurance eligibility');
    } finally {
      setVerifyingInsurance(false);
    }
  };

  const generateSmartSuggestions = async () => {
    if (!formData.specialtyType) return;
    
    try {
      // Mock smart suggestions based on diagnosis codes and specialty
      const response = await specialistService.searchSpecialists({
        specialty: formData.specialtyType,
        limit: 10
      });
      
      if (response.success && response.specialists) {
        const suggestions: SmartSuggestion[] = response.specialists.slice(0, 5).map(specialist => ({
          specialist,
          score: Math.floor(Math.random() * 30) + 70, // 70-100 score
          reasons: generateSuggestionReasons(specialist),
          matchType: getRandomMatchType()
        }));
        
        // Sort by score
        suggestions.sort((a, b) => b.score - a.score);
        setSmartSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
    }
  };

  const generateSuggestionReasons = (specialist: Specialist): string[] => {
    const reasons = [];
    if (specialist.patient_satisfaction_score && specialist.patient_satisfaction_score > 4.5) {
      reasons.push('High patient satisfaction rating');
    }
    if (specialist.accepts_new_patients) {
      reasons.push('Accepting new patients');
    }
    if (specialist.average_wait_time && specialist.average_wait_time < 14) {
      reasons.push('Short wait time');
    }
    if (Math.random() > 0.5) {
      reasons.push('In your insurance network');
    }
    if (Math.random() > 0.7) {
      reasons.push('Specializes in your diagnosis');
    }
    return reasons.slice(0, 3);
  };

  const getRandomMatchType = (): SmartSuggestion['matchType'] => {
    const types: SmartSuggestion['matchType'][] = ['location', 'specialty', 'rating', 'availability', 'network'];
    return types[Math.floor(Math.random() * types.length)];
  };

  const handleInputChange = (field: keyof CreateReferralData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSpecialistSelect = (specialist: Specialist) => {
    setSelectedSpecialist(specialist);
    handleInputChange('specialistId', specialist.id);
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.patientId) {
          toast.error('Please select a patient');
          return false;
        }
        if (!formData.specialtyType) {
          toast.error('Please select a specialty');
          return false;
        }
        if (!formData.referralReason.trim()) {
          toast.error('Please provide a reason for referral');
          return false;
        }
        if (insuranceVerification.authorizationRequired && !insuranceVerification.priorAuthNumber) {
          toast.warning('Prior authorization may be required - please verify before proceeding');
        }
        return true;
      case 2:
        // Specialist selection is optional but show warning if none selected
        if (!selectedSpecialist && smartSuggestions.length > 0) {
          toast.info('Consider selecting a specialist for better coordination');
        }
        return true;
      case 3:
        // Review step - all validation done in previous steps
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const response = await referralService.createReferral(formData);
      
      if (response.success && response.referral) {
        toast.success('Referral created successfully');
        onReferralCreated?.(response.referral);
        onOpenChange(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating referral:', error);
      toast.error('Failed to create referral');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedSpecialist(null);
    setSpecialists([]);
    setSpecialistSearch('');
    setSmartSuggestions([]);
    setDiagnosisCodes([]);
    setInsuranceVerification({
      isVerified: false,
      eligibilityStatus: 'unknown',
      authorizationRequired: false
    });
    setFormData({
      patientId: patientId || '',
      providerId: providerId,
      encounterId: encounterId,
      specialtyType: '',
      referralReason: '',
      clinicalNotes: '',
      urgencyLevel: 'routine',
      appointmentType: 'consultation',
      authorizationRequired: false,
      followUpRequired: true
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="patient-id">Patient ID *</Label>
              <Input
                id="patient-id"
                value={formData.patientId}
                onChange={(e) => handleInputChange('patientId', e.target.value)}
                placeholder="Enter patient ID"
                disabled={!!patientId}
              />
            </div>

            {/* Insurance Verification */}
            {formData.patientId && (
              <Card className={`${
                insuranceVerification.isVerified 
                  ? insuranceVerification.eligibilityStatus === 'active' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                  : 'border-gray-200'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Insurance Verification
                    </CardTitle>
                    {verifyingInsurance && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {verifyingInsurance ? (
                    <div className="flex items-center space-x-2">
                      <Progress value={66} className="flex-1" />
                      <span className="text-sm text-gray-600">Verifying...</span>
                    </div>
                  ) : insuranceVerification.isVerified ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Eligibility Status:</span>
                        <Badge variant={insuranceVerification.eligibilityStatus === 'active' ? 'default' : 'destructive'}>
                          {insuranceVerification.eligibilityStatus}
                        </Badge>
                      </div>
                      
                      {insuranceVerification.copayAmount && (
                        <div className="flex items-center justify-between text-sm">
                          <span>Estimated Copay:</span>
                          <span className="font-medium">${insuranceVerification.copayAmount}</span>
                        </div>
                      )}
                      
                      {insuranceVerification.authorizationRequired && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Prior authorization required for this specialty
                            {insuranceVerification.priorAuthNumber && (
                              <span className="block mt-1">Auth #: {insuranceVerification.priorAuthNumber}</span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {insuranceVerification.coverageDetails && (
                        <div className="text-sm text-gray-600 bg-white p-2 rounded border">
                          {insuranceVerification.coverageDetails}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Enter patient ID to verify insurance eligibility
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Diagnosis Codes */}
            <div>
              <Label htmlFor="diagnosis-codes">Diagnosis Codes (ICD-10)</Label>
              <Input
                id="diagnosis-codes"
                value={diagnosisCodes.join(', ')}
                onChange={(e) => setDiagnosisCodes(e.target.value.split(',').map(code => code.trim()).filter(Boolean))}
                placeholder="Enter ICD-10 codes (comma separated)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Adding diagnosis codes helps generate better specialist recommendations
              </p>
            </div>

            <div>
              <Label htmlFor="specialty">Specialty *</Label>
              <Select
                value={formData.specialtyType}
                onValueChange={(value) => handleInputChange('specialtyType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="referral-reason">Reason for Referral *</Label>
              <Textarea
                id="referral-reason"
                value={formData.referralReason}
                onChange={(e) => handleInputChange('referralReason', e.target.value)}
                placeholder="Describe the reason for this referral"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="clinical-notes">Clinical Notes</Label>
              <Textarea
                id="clinical-notes"
                value={formData.clinicalNotes}
                onChange={(e) => handleInputChange('clinicalNotes', e.target.value)}
                placeholder="Additional clinical information, history, or relevant details"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="urgency">Urgency Level</Label>
                <Select
                  value={formData.urgencyLevel}
                  onValueChange={(value) => handleInputChange('urgencyLevel', value)}
                >
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
                <Label htmlFor="appointment-type">Appointment Type</Label>
                <Select
                  value={formData.appointmentType}
                  onValueChange={(value) => handleInputChange('appointmentType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="treatment">Treatment</SelectItem>
                    <SelectItem value="second_opinion">Second Opinion</SelectItem>
                    <SelectItem value="procedure">Procedure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="authorization-required"
                  checked={formData.authorizationRequired}
                  onCheckedChange={(checked) => handleInputChange('authorizationRequired', checked)}
                />
                <Label htmlFor="authorization-required">Prior authorization required</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="follow-up-required"
                  checked={formData.followUpRequired}
                  onCheckedChange={(checked) => handleInputChange('followUpRequired', checked)}
                />
                <Label htmlFor="follow-up-required">Follow-up required with referring provider</Label>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Smart Suggestions */}
            {smartSuggestions.length > 0 && !specialistSearch && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Star className="h-4 w-4 mr-2 text-blue-600" />
                    Smart Recommendations
                  </CardTitle>
                  <p className="text-xs text-gray-600">
                    Based on your patient's diagnosis and location
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {smartSuggestions.slice(0, 3).map((suggestion, index) => (
                    <Card 
                      key={suggestion.specialist.id}
                      className={`cursor-pointer transition-colors border ${
                        selectedSpecialist?.id === suggestion.specialist.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => handleSpecialistSelect(suggestion.specialist)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center">
                              <Badge variant="secondary" className="text-xs mr-2">
                                #{index + 1}
                              </Badge>
                              <span className="font-medium text-sm">{suggestion.specialist.name}</span>
                              <div className="flex items-center ml-2">
                                <span className="text-xs text-green-600 font-medium">
                                  {suggestion.score}% match
                                </span>
                              </div>
                            </div>
                            
                            {suggestion.specialist.practice_name && (
                              <div className="flex items-center text-xs text-gray-600">
                                <Building className="h-3 w-3 mr-1" />
                                {suggestion.specialist.practice_name}
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-1 mt-2">
                              {suggestion.reasons.map((reason, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          {suggestion.specialist.patient_satisfaction_score && (
                            <div className="flex items-center text-xs">
                              <Star className="h-3 w-3 text-yellow-500 mr-1" />
                              {suggestion.specialist.patient_satisfaction_score.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}

            <div>
              <Label htmlFor="specialist-search">Search All Specialists</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="specialist-search"
                  value={specialistSearch}
                  onChange={(e) => setSpecialistSearch(e.target.value)}
                  placeholder="Search by name, practice, or location"
                  className="pl-10"
                />
              </div>
            </div>

            {selectedSpecialist && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Selected Specialist</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSpecialist(null);
                        handleInputChange('specialistId', undefined);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="font-medium">{selectedSpecialist.name}</span>
                      {selectedSpecialist.title && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedSpecialist.title}
                        </Badge>
                      )}
                    </div>
                    {selectedSpecialist.practice_name && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Building className="h-4 w-4 mr-2 text-gray-500" />
                        {selectedSpecialist.practice_name}
                      </div>
                    )}
                    {selectedSpecialist.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        {selectedSpecialist.phone}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {specialists.filter(s => !smartSuggestions.some(sg => sg.specialist.id === s.id) || specialistSearch).map((specialist) => (
                <Card 
                  key={specialist.id}
                  className={`cursor-pointer transition-colors ${
                    selectedSpecialist?.id === specialist.id 
                      ? 'border-green-500 bg-green-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSpecialistSelect(specialist)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="font-medium">{specialist.name}</span>
                          {specialist.title && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {specialist.title}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {specialist.accepts_new_patients && (
                            <Badge variant="default" className="text-xs">
                              Accepting New Patients
                            </Badge>
                          )}
                          {specialist.patient_satisfaction_score && (
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-500 mr-1" />
                              <span className="text-xs">{specialist.patient_satisfaction_score.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {specialist.practice_name && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Building className="h-4 w-4 mr-2 text-gray-500" />
                          {specialist.practice_name}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                          {specialist.city}, {specialist.state}
                        </div>
                        {specialist.average_wait_time && (
                          <div className="flex items-center text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {specialist.average_wait_time} days
                          </div>
                        )}
                      </div>

                      {/* Additional specialist info */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {specialist.board_certified && (
                          <Badge variant="outline" className="text-xs">
                            <Award className="h-3 w-3 mr-1" />
                            Board Certified
                          </Badge>
                        )}
                        {specialist.telehealth_available && (
                          <Badge variant="outline" className="text-xs">
                            Telehealth Available
                          </Badge>
                        )}
                        {insuranceVerification.isVerified && Math.random() > 0.3 && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            In Network
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {specialists.length === 0 && formData.specialtyType && (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No specialists found for {formData.specialtyType}</p>
                <p className="text-sm">You can still create the referral without selecting a specific specialist</p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Review Referral Details</h3>
            </div>

            {/* Insurance Summary */}
            {insuranceVerification.isVerified && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Insurance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge variant={insuranceVerification.eligibilityStatus === 'active' ? 'default' : 'destructive'} className="ml-2">
                        {insuranceVerification.eligibilityStatus}
                      </Badge>
                    </div>
                    {insuranceVerification.copayAmount && (
                      <div>
                        <span className="font-medium">Estimated Copay:</span>
                        <span className="ml-2">${insuranceVerification.copayAmount}</span>
                      </div>
                    )}
                  </div>
                  {insuranceVerification.authorizationRequired && (
                    <Alert className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Prior authorization will be required for this referral
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Referral Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Patient ID</Label>
                    <p className="text-sm">{formData.patientId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Specialty</Label>
                    <p className="text-sm">{formData.specialtyType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Urgency</Label>
                    <Badge variant="outline">{formData.urgencyLevel}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Appointment Type</Label>
                    <p className="text-sm">{formData.appointmentType}</p>
                  </div>
                </div>

                {diagnosisCodes.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Diagnosis Codes</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {diagnosisCodes.map((code, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-gray-700">Reason for Referral</Label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 rounded">{formData.referralReason}</p>
                </div>

                {formData.clinicalNotes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Clinical Notes</Label>
                    <p className="text-sm mt-1 p-3 bg-gray-50 rounded">{formData.clinicalNotes}</p>
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  {formData.authorizationRequired && (
                    <div className="flex items-center text-sm">
                      <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
                      <span>Prior authorization required</span>
                    </div>
                  )}
                  {formData.followUpRequired && (
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      <span>Follow-up required</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedSpecialist && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected Specialist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="font-medium">{selectedSpecialist.name}</span>
                      {selectedSpecialist.title && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedSpecialist.title}
                        </Badge>
                      )}
                    </div>
                    {selectedSpecialist.practice_name && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Building className="h-4 w-4 mr-2 text-gray-500" />
                        {selectedSpecialist.practice_name}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                      {selectedSpecialist.city}, {selectedSpecialist.state}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Referral</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === currentStep
                    ? 'bg-blue-600 text-white'
                    : step < currentStep
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step < currentStep ? <CheckCircle className="h-4 w-4" /> : step}
              </div>
              {step < 3 && (
                <div
                  className={`w-12 h-0.5 ${
                    step < currentStep ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between text-sm text-gray-600 mb-6">
          <span className={currentStep === 1 ? 'font-medium text-blue-600' : ''}>
            Details & Insurance
          </span>
          <span className={currentStep === 2 ? 'font-medium text-blue-600' : ''}>
            Smart Specialist Selection
          </span>
          <span className={currentStep === 3 ? 'font-medium text-blue-600' : ''}>
            Review & Submit
          </span>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            Previous
          </Button>

          <div className="space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            
            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creating...' : 'Create Referral'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};