import type React from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  Activity,
  Thermometer,
  Weight,
  Ruler,
  Shield,
  Pill,
  FileText,
  AlertTriangle,
  Stethoscope,
  Video,
  Users,
  Clock,
  Edit,
  Download,
  Share,
  MailCheck,
  HeartPulse,
  DollarSign,
  RefreshCw,
  Eye,
  MessageSquare,
  Trash2,
  Printer,
  History,
  Plus,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import PatientNotFound from "@/components/patient/PatientNotFound";
import HipaaNotice from "@/components/HipaaNotice";
import EditPatientDialog from "@/components/patient/EditPatientDialog";
import {
  getSinglePatientAPI,
  getPatinetNotes,
} from "@/services/operations/patient";
import CommunicationPanel from "@/ringcentral/components/calling/CommunicationPanel";
import Monitoring from "./Monitoring";
import AdvancedTaskManager from "@/components/tasks/AdvancedTaskManager";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import AddNotes from "@/components/patient/AddNotes";
import Loader from "@/components/Loader";
import { UnifiedDiagnosisManager } from "@/components/provider/UnifiedDiagnosisManager";
import ProgramClassificationWidget from "@/components/patient/ProgramClassificationWidget";
import SmartCarePlanTemplates from "@/components/patient/SmartCarePlanTemplates";
import { toast } from "sonner";
import Timer from "@/components/patient/Timer";
import AddMedicationsDialog from "@/components/patient/AddMedicationsDialog";
import AddInsuranceDialog from "@/components/patient/AddInsuranceDialog";
import AddAllergiesDialog from "@/components/patient/AddAllergiesDialog";
import AddVitalsDialog from "@/components/patient/AddVitalsDialog";
import PatientEncounter from "./PatientEncounter";
import generatePatientPdf from "./GenratePatientPdf";
import { getPdfAPI } from "@/services/operations/settings";
import GetSinglePatientAppointment from "./GetSinglePatientAppointment";
import PatientAccountManager from "@/components/patient/PatientAccountManager";

// Define the patient type based on the API response
interface PatientData {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  status: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  birthDate: string;
  lastVisit: string;
  emergencyContact: string;
  ethnicity: string;
  height: number;
  weight: number;
  bmi: number;
  bloodPressure: number;
  heartRate: number;
  temperature: number;
  allergies: Array<{
    category: string | null;
    allergen: string;
    reaction: string;
    id: number;
  }>;
  insurance: Array<{
    policyNumber: string;
    groupNumber: string;
    company: string;
    plan: string;
    expirationDate: string;
    type: string;
    effectiveDate: string;
    patient_insurance_id: number;
  }>;
  currentMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    prescribedBy: string;
    refills?: string;
    startDate: string;
    endDate: string;
    status: string;
    id: number;
  }>;
  diagnosis: Array<{
    date: string;
    icd10: string;
    diagnosis: string;
    status: string;
    id: number;
  }>;
  notes: Array<{
    note: string;
    created: string;
    created_by: number | null;
    note_id: number;
  }>;
  createdBy: number;
  patientService?: string;
}
interface Note {
  created: string;
  note: string;
  type?: string;
  duration?: number;
  note_id?: any;
  created_by?: any;
}

const PatientDetailsPage: React.FC = () => {
  const { id } = useParams();
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { token, user } = useSelector((state: RootState) => state.auth);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDiagonosesDialogOpen, setAddDiagonosesDialogOpen] = useState(false);
  const [addMedicationDialog, setAddMedicationDialog] = useState(false);
  const [addInsuranceDialog, setAddInsuranceDialog] = useState(false);
  const [addVitals, setAddVitals] = useState(false);
  const [addAllergiesDialog, setAddAllergiesDialog] = useState(false);
  const [enrolledPrograms, setEnrolledPrograms] = useState<string[]>([]);
  const [mount, setMount] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);

  // Claim Management States
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [showClaimDetails, setShowClaimDetails] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [showVoidClaim, setShowVoidClaim] = useState(false);
  const [showCorrectClaim, setShowCorrectClaim] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');
  const [accountData, setAccountData] = useState<any>(null);
  const [claimsData, setClaimsData] = useState<any[]>([]);
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [statementsData, setStatementsData] = useState<any[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);

  const serviceTypeMap: Record<number, string> = {
    1: "RPM",
    2: "CCM",
    3: "PCM",
  };
  const fetchPatient = async () => {
    setLoading(true);
    try {
      const res = await getSinglePatientAPI(id, token);
      setPatient(res);
      console.log(res, "single patinet");
    } catch (error) {
      console.error("Error fetching patient:", error);
    }
    setLoading(false);
  };

  const fetchPatientNotes = async () => {
    try {
      setLoading(true);
      const res = await getPatinetNotes(id, token);
      console.log(res, "notes");
      if (res && res.data) {
        setNotes(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch patient notes:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchPatient();
    fetchPatientNotes();
  }, [id]);


  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownlodPdf = async () => {
    if (patient) {
      setIsDownloading(true);
      const pdfHeaderResponse = await getPdfAPI(user.id, token);
      const pdfHeader = pdfHeaderResponse?.data;
      try {
        await generatePatientPdf(patient, pdfHeader);
      } catch (error) {
        console.error("PDF generation failed:", error);
      } finally {
        setIsDownloading(false);
      }
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit", // <-- numeric month (e.g., 07)
      day: "2-digit", // optional: ensures day is also 2-digit
    });
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "Active":
        return "bg-green-100 text-green-800 border-green-200";

      case "Chronic":
        return "bg-red-100 text-red-800 border-red-200";
      case "Resolved":
        return "bg-blue-100 text-blue-800 border-blue-200";

      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <>
        <div className="min-h-[600px] flex items-center justify-center min-w-full">
          <Loader />
        </div>
      </>
    );
  }
  // if (!patient) {
  //   return <PatientNotFound id={id} />;
  // }
  if (!patient) {
    return (
      <>
        <div className="min-h-[600px] flex items-center justify-center min-w-full">
          <Loader />
        </div>
      </>
    );
  }

  const fullAddress = `${patient.addressLine1}${patient.addressLine2 ? ", " + patient.addressLine2 : ""
    }, ${patient.city}, ${patient.state} ${patient.zipCode}, ${patient.country}`;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <HipaaNotice />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src="/placeholder-user.jpg" alt="Patient" />
              <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                {patient.firstName.charAt(0)}
                {patient.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {patient.firstName} {patient.middleName} {patient.lastName}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {calculateAge(patient.birthDate)} years old
                </span>
                <span className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  {patient.gender}
                </span>
                <Badge className={getStatusColor(patient.status)}>
                  {patient.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button> */}
            <div className="flex justify-end">
              <Button onClick={handleDownlodPdf} disabled={isDownloading}>
                {isDownloading ? 'Printing...' : 'Print'}
              </Button>
            </div>
            <div className="flex justify-end">
              <Button className="" onClick={() => setAddDialogOpen(true)}>
                Add Notes
              </Button>
            </div>
            <Button size="sm" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Patient
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patient Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Patient Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 mr-3 text-gray-400" />
                    <span className="text-gray-600">
                      {[
                        patient?.firstName,
                        patient?.middleName,
                        patient?.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </span>
                  </div>
                  <div className="flex  text-sm">
                    <MailCheck className="h-4 w-4 mr-3 mt-1 text-gray-400" />
                    <span className="text-gray-600 break-all whitespace-normal">
                      {patient.email}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-3 text-gray-400" />
                    <span className="text-gray-600">{patient.phone}</span>
                  </div>
                  <div className="flex items-start text-sm">
                    <MapPin className="h-4 w-4 mr-3 text-gray-400 mt-0.5" />
                    <span className="text-gray-600 leading-relaxed">
                      {fullAddress}
                    </span>
                  </div>

                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-3 text-gray-400" />
                    <span className="text-gray-600">
                      Last visit: {formatDate(patient.lastVisit)}
                    </span>
                  </div>

                  <div className="flex items-center text-sm">
                    <HeartPulse className="h-4 w-4 mr-2 text-red-500" />
                    <span className="text-gray-600">
                      Service Type :{" "}
                      <span className="text-gray-600">
                        {patient?.patientService && Array.isArray(patient.patientService) && patient.patientService.length
                          ? patient.patientService
                            .map((id: number) => serviceTypeMap[id])
                            .filter(Boolean)
                            .join(", ")
                          : patient?.patientService || "Not Added"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-3 text-gray-400" />
                    <span className="text-gray-600">
                      Enrolled In System :{" "}
                      <span className="text-gray-600">
                        {" "}
                        {patient?.createdBy
                          ? new Date().toLocaleDateString()
                          : "N/A"}
                      </span>
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Quick Vital Signs */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-red-500" />
                    Latest Vitals
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">BP</div>
                      <div className="font-medium">{patient.bloodPressure}</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">HR</div>
                      <div className="font-medium">{patient.heartRate}</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">Temp</div>
                      <div className="font-medium">{patient.temperature}°F</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">BMI</div>
                      <div className="font-medium">{patient.bmi}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-10 mb-6">
                <TabsTrigger value="overview" className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="vitals" className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  Vitals
                </TabsTrigger>
                <TabsTrigger value="telehealth" className="flex items-center gap-1">
                  <Video className="h-4 w-4" />
                  Telehealth
                </TabsTrigger>
                <TabsTrigger value="allergies" className="flex items-center gap-1">
                  <Stethoscope className="h-4 w-4" />
                  Allergies
                </TabsTrigger>
                <TabsTrigger value="medications" className="flex items-center gap-1">
                  <Pill className="h-4 w-4" />
                  Medications
                </TabsTrigger>
                <TabsTrigger value="diagnosis" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Diagnosis
                </TabsTrigger>
                <TabsTrigger value="account" className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Account
                </TabsTrigger>
                <TabsTrigger value="summary" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Summary
                </TabsTrigger>
                <TabsTrigger value="encounters" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Encounters
                </TabsTrigger>
                <TabsTrigger value="appointments" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Appointments
                </TabsTrigger>

              </TabsList>

              {/* <TabsContent value="overview">Overview Content</TabsContent>
      <TabsContent value="vitals">Vitals Content</TabsContent>
      <TabsContent value="telehealth">Telehealth Content</TabsContent>
      <TabsContent value="medical">Medical Content</TabsContent>
      <TabsContent value="insurance">Insurance Content</TabsContent>
      <TabsContent value="medications">Medications Content</TabsContent>
      <TabsContent value="diagnosis">Diagnosis Content</TabsContent> */}

              <TabsContent value="summary">
                <Tabs defaultValue="notes">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="notes" className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Notes
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Tasks
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="notes">
                    <TabsContent value="notes" className="space-y-6">
                      <Card>
                        <CardHeader className="flex justify-between">
                          {/* Left side */}
                          <div className="flex items-center space-x-2">
                            <FileText className="h-5 w-5 mt-1 text-gray-600" />
                            <CardTitle className="text-lg">Patient Notes</CardTitle>
                          </div>

                          {/* Right side */}
                          <div className="flex justify-end">
                            <Button
                              className=""
                              onClick={() => setAddDialogOpen(true)}
                            >
                              Add Notes
                            </Button>
                          </div>
                        </CardHeader>

                        <CardContent>
                          {notes && notes.length > 0 ? (
                            <div className="space-y-4">
                              {notes.map((note) => (
                                <div
                                  key={note.note_id}
                                  className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                                >
                                  {/* Top Row with Type on Right */}
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="text-gray-800 font-medium">
                                      Note
                                    </div>
                                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      {note.type || "NA"}
                                    </div>
                                  </div>

                                  <p className="text-gray-800 leading-relaxed mb-3">
                                    {note.note}
                                  </p>

                                  <div className="flex items-center text-xs text-gray-500">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    <span>Created on {formatDate(note.created)}</span>
                                    {note.created_by && (
                                      <>
                                        <span className="mx-2">•</span>
                                        <span>by User ID: {note.created_by}</span>
                                      </>
                                    )}
                                  </div>

                                  <p className="text-gray-800 text-xs leading-relaxed mt-2">
                                    Duration:{" "}
                                    {note?.duration ? `${note.duration} m` : "NA"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                              <p>No clinical notes available</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </TabsContent>
                  <TabsContent value="tasks">
                    <TabsContent value="tasks" className="space-y-6">
                      <AdvancedTaskManager
                        patientId={id || "unknown"}
                        patientConditions={patient.diagnosis.map((d) => d.diagnosis)}
                        patient={patient}
                      />
                    </TabsContent>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="overview" className="space-y-6">
                {/* Section 1: Personal, Contact, Address */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Personal Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <User className="h-5 w-5 mr-2 text-blue-600" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Full Name</span>
                          <p className="font-medium">
                            {patient.firstName} {patient.middleName} {patient.lastName}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Date of Birth</span>
                          <p className="font-medium">{formatDate(patient.birthDate)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Gender</span>
                          <p className="font-medium">{patient.gender}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Ethnicity</span>
                          <p className="font-medium">{patient.ethnicity}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contact Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Phone className="h-5 w-5 mr-2 text-green-600" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-500">Email Address</span>
                        <p className="font-medium">{patient.email}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone Number</span>
                        <p className="font-medium">{patient.phone}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Emergency Contact</span>
                        <p className="font-medium">{patient.emergencyContact}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Address Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <MapPin className="h-5 w-5 mr-2 text-purple-600" />
                        Address Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium">{fullAddress}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Section 2: Insurance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Shield className="h-5 w-5 mr-2 text-blue-600" />
                      Insurance Coverage
                    </CardTitle>
                    {patient && (
                      <div className="flex justify-end">
                        <Button
                          onClick={() => setAddInsuranceDialog(true)}
                          disabled={patient.insurance.length >= 2}
                        >
                          Add Insurance
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {patient.insurance && patient.insurance.length > 0 ? (
                      <div className="space-y-4">
                        {patient.insurance.map((ins) => (
                          <div
                            key={ins.patient_insurance_id}
                            className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-lg">{ins.company}</h4>
                                <p className="text-gray-600">{ins.plan}</p>
                              </div>
                              <Badge className={getStatusColor(ins.type)}>{ins.type}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Policy Number</span>
                                <p className="font-medium">{ins.policyNumber}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Group Number</span>
                                <p className="font-medium">{ins.groupNumber}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Effective Date</span>
                                <p className="font-medium">{formatDate(ins.effectiveDate)}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Expiration Date</span>
                                <p className="font-medium">{formatDate(ins.expirationDate)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No insurance information available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>



              <TabsContent value="encounters" className="space-y-6">
                <PatientEncounter />
              </TabsContent>

              <TabsContent value="telehealth">
                <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center text-xl font-semibold">
                      <Video className="h-6 w-6 mr-3 text-blue-100" />
                      Telehealth Communication
                      <div className="ml-auto">
                        <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 bg-white rounded-b-lg">
                    <CommunicationPanel
                      patient={{
                        id: String(id),
                        name: `${patient.firstName} ${patient.lastName}`,
                        phone: patient.phone,
                        email: patient.email,
                        age: calculateAge(patient.birthDate),
                        gender: patient.gender as "Male" | "Female" | "Other",
                        address: fullAddress,
                        medicalHistory: [],
                        lastVisit: formatDate(patient.lastVisit),
                        emergencyContact: {
                          name: patient.emergencyContact,
                          phone: patient.phone,
                          relation: "Emergency Contact",
                        },
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="appointments">
                <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center text-xl font-semibold">
                      <Video className="h-6 w-6 mr-3 text-blue-100" />
                      Patient Appointments

                      <div className="ml-auto">
                        <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 bg-white rounded-b-lg">
                    <GetSinglePatientAppointment id={id} token={token} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="allergies" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                      Allergies & Medical History
                    </CardTitle>

                    <div className="flex justify-end">
                      <Button
                        className=""
                        onClick={() => setAddAllergiesDialog(true)}
                      >
                        Add Allergies
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {patient.allergies && patient.allergies.length > 0 ? (
                      <div className="space-y-3">
                        {patient.allergies.map((allergy) => (
                          <div
                            key={allergy.id}
                            className="border border-gray-200 rounded-lg p-4 "
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-black flex items-center">
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  {allergy.allergen}
                                </h4>
                                <p className="text-sm text-black mt-1">
                                  <strong>Reaction:</strong> {allergy.reaction}
                                </p>
                                {allergy.category && (
                                  <p className="text-sm text-black mt-1">
                                    <strong>Category:</strong>{" "}
                                    {allergy.category}
                                  </p>
                                )}
                              </div>
                              <Badge className="bg-red-100 text-black border-red-200">
                                Allergy
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No allergies available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>



              <TabsContent value="medications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Pill className="h-5 w-5 mr-2 text-green-600" />
                      Current Medications
                    </CardTitle>

                    <div className="flex justify-end">
                      <Button
                        className=""
                        onClick={() => setAddMedicationDialog(true)}
                      >
                        Add Medications
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {patient.currentMedications &&
                      patient.currentMedications.length > 0 ? (
                      <div className="space-y-4">
                        {patient.currentMedications.map((med) => (
                          <div
                            key={med.id}
                            className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-lg flex items-center">
                                  <Pill className="h-4 w-4 mr-2 text-green-600" />
                                  {med.name}
                                </h4>
                                <p className="text-gray-600">
                                  {med.dosage} - {med.frequency}, Refills -{" "}
                                  {med?.refills}
                                </p>
                              </div>
                              <Badge className={getStatusColor(med.status)}>
                                {med.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {/* <div>
                                <span className="text-gray-500">
                                  Prescribed By
                                </span>
                                <p className="font-medium">
                                  {med.prescribedBy}
                                </p>
                              </div> */}
                              <div>
                                <span className="text-gray-500">
                                  Start Date
                                </span>
                                <p className="font-medium">
                                  {formatDate(med.startDate)}
                                </p>
                              </div>
                              {med.endDate && (
                                <div>
                                  <span className="text-gray-500">
                                    End Date
                                  </span>
                                  <p className="font-medium">
                                    {formatDate(med.endDate)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Pill className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No current medications on record</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="diagnosis" className="space-y-6">
                <div className="min-h-[600px]">
                  <UnifiedDiagnosisManager
                    selectedDiagnoses={patient.diagnosis.map(d => ({
                      id: d.id.toString(),
                      code: d.icd10,
                      description: d.diagnosis,
                      category: 'General',
                      status: (d.status?.toLowerCase() === 'active' ? 'active' :
                        d.status?.toLowerCase() === 'chronic' ? 'chronic' :
                          d.status?.toLowerCase() === 'resolved' ? 'resolved' : 'active') as 'active' | 'resolved' | 'rule-out' | 'chronic',
                      dateAdded: d.date,
                      isActive: d.status === 'Active',
                      isFavorite: false,
                      confidence: 95
                    }))}
                    patientId={id}
                    encounterId=""
                    mode="profile"
                    specialty="General"
                    onDiagnosisChange={(diagnoses) => {
                      console.log('Diagnoses updated:', diagnoses);
                      // Handle diagnosis updates
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="account" className="space-y-6">
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="summary">Account Summary</TabsTrigger>
                    <TabsTrigger value="claims">Claims Management</TabsTrigger>
                    <TabsTrigger value="payments">Payments & Adjustments</TabsTrigger>
                    <TabsTrigger value="statements">Patient Statements</TabsTrigger>
                  </TabsList>

                  {/* Account Summary Tab */}
                  <TabsContent value="summary" className="space-y-6">
                    {/* Financial Overview */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">$3,250.00</div>
                            <div className="text-sm text-gray-600">Total Charges</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">$2,100.00</div>
                            <div className="text-sm text-gray-600">Insurance Paid</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">$450.00</div>
                            <div className="text-sm text-gray-600">Adjustments</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">$700.00</div>
                            <div className="text-sm text-gray-600">Patient Responsibility</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Service Breakdown */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Service Details & CPT Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Service 1 */}
                          <div className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-semibold">Service Date: 2024-01-15</div>
                                <div className="text-sm text-gray-600">Provider: Dr. Smith</div>
                              </div>
                              <Badge className="bg-green-100 text-green-800">Processed</Badge>
                            </div>

                            <div className="space-y-3">
                              {/* CPT Code 1 */}
                              <div className="bg-gray-50 rounded p-3">
                                <div className="grid grid-cols-6 gap-4 text-sm">
                                  <div>
                                    <div className="font-medium">CPT: 99213</div>
                                    <div className="text-gray-600">Office Visit</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Charges</div>
                                    <div className="text-blue-600">$250.00</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Insurance Paid</div>
                                    <div className="text-green-600">$180.00</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Adjustment</div>
                                    <div className="text-orange-600">$20.00</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Patient Resp.</div>
                                    <div className="text-red-600">$50.00</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Status</div>
                                    <Badge className="bg-yellow-100 text-yellow-800">PR Pending</Badge>
                                  </div>
                                </div>
                              </div>

                              {/* CPT Code 2 */}
                              <div className="bg-gray-50 rounded p-3">
                                <div className="grid grid-cols-6 gap-4 text-sm">
                                  <div>
                                    <div className="font-medium">CPT: 93000</div>
                                    <div className="text-gray-600">EKG</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Charges</div>
                                    <div className="text-blue-600">$150.00</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Insurance Paid</div>
                                    <div className="text-green-600">$120.00</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Adjustment</div>
                                    <div className="text-orange-600">$10.00</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Patient Resp.</div>
                                    <div className="text-red-600">$20.00</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Status</div>
                                    <Badge className="bg-green-100 text-green-800">Paid</Badge>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Biller Comments */}
                            <div className="mt-4 p-3 bg-blue-50 rounded">
                              <div className="font-medium text-blue-800 mb-2">Biller Comments & Remarks:</div>
                              <div className="text-sm text-blue-700">
                                • Insurance processed with standard contractual adjustment<br />
                                • Patient copay of $50 collected at time of service<br />
                                • EKG fully covered under preventive care benefit
                              </div>
                            </div>
                          </div>

                          {/* Service 2 */}
                          <div className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-semibold">Service Date: 2024-02-10</div>
                                <div className="text-sm text-gray-600">Provider: Dr. Johnson</div>
                              </div>
                              <Badge className="bg-red-100 text-red-800">Denied</Badge>
                            </div>

                            <div className="space-y-3">
                              <div className="bg-gray-50 rounded p-3">
                                <div className="grid grid-cols-6 gap-4 text-sm">
                                  <div>
                                    <div className="font-medium">CPT: 99214</div>
                                    <div className="text-gray-600">Complex Visit</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Charges</div>
                                    <div className="text-blue-600">$350.00</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Insurance Paid</div>
                                    <div className="text-red-600">$0.00</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Adjustment</div>
                                    <div className="text-orange-600">$0.00</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Patient Resp.</div>
                                    <div className="text-red-600">$350.00</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Status</div>
                                    <Badge className="bg-red-100 text-red-800">Denied</Badge>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Denial Information */}
                            <div className="mt-4 p-3 bg-red-50 rounded">
                              <div className="font-medium text-red-800 mb-2">Denial Reason & Action Required:</div>
                              <div className="text-sm text-red-700">
                                • Denial Code: CO-97 - Benefit for this service not provided<br />
                                • Action: Verify patient eligibility and benefits<br />
                                • Recommended: Appeal with additional documentation
                              </div>
                              <div className="mt-3 flex gap-2">
                                <Button size="sm" variant="outline" className="text-red-600 border-red-300">
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Resubmit Claim
                                </Button>
                                <Button size="sm" variant="outline" className="text-blue-600 border-blue-300">
                                  <Edit className="h-4 w-4 mr-1" />
                                  Correct & Resubmit
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Claims Management Tab */}
                  <TabsContent value="claims" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Claims Management & Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Claim 1 */}
                          <div className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <Button
                                  variant="link"
                                  className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-800"
                                  onClick={() => {
                                    setSelectedClaim({
                                      id: 'CLM-2024-001',
                                      serviceDate: '2024-01-15',
                                      submittedDate: '2024-01-16',
                                      insurance: 'Blue Cross Blue Shield',
                                      status: 'Paid',
                                      billedAmount: 400.00,
                                      allowedAmount: 320.00,
                                      paidAmount: 300.00,
                                      patientResp: 70.00,
                                      cptCodes: ['99213', '93000'],
                                      provider: 'Dr. Smith'
                                    });
                                    setShowClaimDetails(true);
                                  }}
                                >
                                  Claim #CLM-2024-001
                                </Button>
                                <div className="text-sm text-gray-600">Submitted: 2024-01-16</div>
                                <Button
                                  variant="link"
                                  className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800"
                                  onClick={() => {
                                    setSelectedClaim({
                                      id: 'CLM-2024-001',
                                      serviceDate: '2024-01-15',
                                      submittedDate: '2024-01-16',
                                      insurance: 'Blue Cross Blue Shield',
                                      status: 'Paid',
                                      billedAmount: 400.00,
                                      allowedAmount: 320.00,
                                      paidAmount: 300.00,
                                      patientResp: 70.00,
                                      cptCodes: ['99213', '93000'],
                                      provider: 'Dr. Smith'
                                    });
                                    setShowClaimDetails(true);
                                  }}
                                >
                                  Service: 2024-01-15
                                </Button>
                                <div className="text-sm text-gray-600">Insurance: Blue Cross Blue Shield</div>
                              </div>
                              <div className="flex gap-2">
                                <Badge className="bg-green-100 text-green-800">Paid</Badge>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View EOB
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Printer className="h-4 w-4 mr-1" />
                                  Print CMS-1500
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                              <div>
                                <div className="text-gray-600">Billed Amount</div>
                                <div className="font-medium">$400.00</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Allowed Amount</div>
                                <div className="font-medium">$320.00</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Paid Amount</div>
                                <div className="font-medium text-green-600">$300.00</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Patient Responsibility</div>
                                <div className="font-medium text-red-600">$70.00</div>
                              </div>
                            </div>

                            <div className="bg-green-50 p-3 rounded mb-3">
                              <div className="font-medium text-green-800 mb-1">Latest Biller Notes:</div>
                              <div className="text-sm text-green-700">
                                Claim processed successfully. Standard contractual adjustment applied. Patient copay collected.
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedClaim({
                                    id: 'CLM-2024-001',
                                    serviceDate: '2024-01-15',
                                    submittedDate: '2024-01-16',
                                    insurance: 'Blue Cross Blue Shield',
                                    status: 'Paid'
                                  });
                                  setShowAddComment(true);
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Add Comment
                              </Button>
                              <Button size="sm" variant="outline">
                                <History className="h-4 w-4 mr-1" />
                                View Log
                              </Button>
                            </div>
                          </div>

                          {/* Claim 2 - Needs Action */}
                          <div className="border-2 border-red-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <Button
                                  variant="link"
                                  className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-800"
                                  onClick={() => {
                                    setSelectedClaim({
                                      id: 'CLM-2024-002',
                                      serviceDate: '2024-02-10',
                                      submittedDate: '2024-02-11',
                                      insurance: 'Aetna',
                                      status: 'Denied',
                                      billedAmount: 350.00,
                                      allowedAmount: 0.00,
                                      paidAmount: 0.00,
                                      patientResp: 350.00,
                                      denialCode: 'CO-97',
                                      denialReason: 'Benefit for this service not provided',
                                      cptCodes: ['99214'],
                                      provider: 'Dr. Johnson'
                                    });
                                    setShowClaimDetails(true);
                                  }}
                                >
                                  Claim #CLM-2024-002
                                </Button>
                                <div className="text-sm text-gray-600">Submitted: 2024-02-11</div>
                                <Button
                                  variant="link"
                                  className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800"
                                  onClick={() => {
                                    setSelectedClaim({
                                      id: 'CLM-2024-002',
                                      serviceDate: '2024-02-10',
                                      submittedDate: '2024-02-11',
                                      insurance: 'Aetna',
                                      status: 'Denied',
                                      billedAmount: 350.00,
                                      allowedAmount: 0.00,
                                      paidAmount: 0.00,
                                      patientResp: 350.00,
                                      denialCode: 'CO-97',
                                      denialReason: 'Benefit for this service not provided',
                                      cptCodes: ['99214'],
                                      provider: 'Dr. Johnson'
                                    });
                                    setShowClaimDetails(true);
                                  }}
                                >
                                  Service: 2024-02-10
                                </Button>
                                <div className="text-sm text-gray-600">Insurance: Aetna</div>
                              </div>
                              <div className="flex gap-2">
                                <Badge className="bg-red-100 text-red-800">Denied</Badge>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Denial
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Printer className="h-4 w-4 mr-1" />
                                  Print CMS-1500
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                              <div>
                                <div className="text-gray-600">Billed Amount</div>
                                <div className="font-medium">$350.00</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Denial Code</div>
                                <div className="font-medium text-red-600">CO-97</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Days Since Denial</div>
                                <div className="font-medium text-orange-600">15 days</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Appeal Deadline</div>
                                <div className="font-medium text-red-600">45 days</div>
                              </div>
                            </div>

                            <div className="bg-red-50 p-3 rounded mb-3">
                              <div className="font-medium text-red-800 mb-1">Action Required:</div>
                              <div className="text-sm text-red-700">
                                Claim denied for lack of medical necessity. Review documentation and consider appeal with additional clinical notes.
                              </div>
                            </div>

                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Resubmit Claim
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedClaim({
                                    id: 'CLM-2024-002',
                                    serviceDate: '2024-02-10',
                                    insurance: 'Aetna',
                                    status: 'Denied'
                                  });
                                  setShowCorrectClaim(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Correct & Resubmit
                              </Button>
                              <Button size="sm" variant="outline">
                                <FileText className="h-4 w-4 mr-1" />
                                File Appeal
                              </Button>
                              <Button size="sm" variant="outline">
                                <User className="h-4 w-4 mr-1" />
                                Transfer to Patient
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedClaim({
                                    id: 'CLM-2024-002',
                                    serviceDate: '2024-02-10',
                                    insurance: 'Aetna',
                                    status: 'Denied'
                                  });
                                  setShowAddComment(true);
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Add Comment
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedClaim({
                                    id: 'CLM-2024-002',
                                    serviceDate: '2024-02-10',
                                    insurance: 'Aetna',
                                    status: 'Denied'
                                  });
                                  setShowVoidClaim(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Void Claim
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Claim Details Dialog */}
                    {showClaimDetails && selectedClaim && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                          <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">Claim Details - {selectedClaim.id}</h2>
                            <Button variant="outline" onClick={() => setShowClaimDetails(false)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-6 mb-6">
                            <Card>
                              <CardHeader>
                                <CardTitle>Claim Information</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Claim Number:</span>
                                  <span className="font-medium">{selectedClaim.id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Service Date:</span>
                                  <span className="font-medium">{selectedClaim.serviceDate}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Submitted Date:</span>
                                  <span className="font-medium">{selectedClaim.submittedDate}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Insurance:</span>
                                  <span className="font-medium">{selectedClaim.insurance}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Provider:</span>
                                  <span className="font-medium">{selectedClaim.provider}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Status:</span>
                                  <Badge className={selectedClaim.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                    {selectedClaim.status}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle>Financial Summary</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Billed Amount:</span>
                                  <span className="font-medium">${selectedClaim.billedAmount?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Allowed Amount:</span>
                                  <span className="font-medium">${selectedClaim.allowedAmount?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Paid Amount:</span>
                                  <span className="font-medium text-green-600">${selectedClaim.paidAmount?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Patient Responsibility:</span>
                                  <span className="font-medium text-red-600">${selectedClaim.patientResp?.toFixed(2)}</span>
                                </div>
                                {selectedClaim.denialCode && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Denial Code:</span>
                                    <span className="font-medium text-red-600">{selectedClaim.denialCode}</span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>

                          {/* Claim Log */}
                          <Card className="mb-6">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Claim Activity Log
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="border-l-4 border-green-500 pl-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium">Claim Paid</div>
                                      <div className="text-sm text-gray-600">Payment received from insurance</div>
                                    </div>
                                    <div className="text-sm text-gray-500">2024-01-25 10:30 AM</div>
                                  </div>
                                </div>
                                <div className="border-l-4 border-blue-500 pl-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium">Claim Processed</div>
                                      <div className="text-sm text-gray-600">Insurance processed claim with adjustments</div>
                                    </div>
                                    <div className="text-sm text-gray-500">2024-01-20 2:15 PM</div>
                                  </div>
                                </div>
                                <div className="border-l-4 border-yellow-500 pl-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium">Claim Submitted</div>
                                      <div className="text-sm text-gray-600">Electronic submission to {selectedClaim.insurance}</div>
                                    </div>
                                    <div className="text-sm text-gray-500">2024-01-16 9:00 AM</div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Comments Section */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Biller Comments & Notes
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="bg-blue-50 p-3 rounded">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium text-blue-800">John Smith (Biller)</div>
                                    <div className="text-sm text-blue-600">2024-01-25 10:35 AM</div>
                                  </div>
                                  <div className="text-sm text-blue-700">
                                    Payment received and posted. Standard contractual adjustment applied as per contract terms. Patient copay collected at time of service.
                                  </div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium text-gray-800">Sarah Johnson (Biller)</div>
                                    <div className="text-sm text-gray-600">2024-01-16 9:05 AM</div>
                                  </div>
                                  <div className="text-sm text-gray-700">
                                    Claim submitted electronically. All required fields completed. Expecting processing within 14 business days.
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 pt-4 border-t">
                                <Button
                                  onClick={() => {
                                    setShowClaimDetails(false);
                                    setShowAddComment(true);
                                  }}
                                  className="w-full"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add New Comment
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}

                    {/* Add Comment Dialog */}
                    {showAddComment && selectedClaim && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Add Comment - {selectedClaim.id}</h3>
                            <Button variant="outline" onClick={() => setShowAddComment(false)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Comment</label>
                              <textarea
                                className="w-full p-3 border rounded-lg resize-none"
                                rows={4}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Enter your comment or notes about this claim..."
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  // Handle comment submission
                                  setNewComment('');
                                  setShowAddComment(false);
                                }}
                                className="flex-1"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Add Comment
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setShowAddComment(false)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Void Claim Dialog */}
                    {showVoidClaim && selectedClaim && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-red-600">Void Claim - {selectedClaim.id}</h3>
                            <Button variant="outline" onClick={() => setShowVoidClaim(false)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-4">
                            <div className="bg-red-50 p-3 rounded">
                              <div className="flex items-center gap-2 text-red-800 mb-2">
                                <AlertCircle className="h-4 w-4" />
                                <span className="font-medium">Warning</span>
                              </div>
                              <div className="text-sm text-red-700">
                                Voiding this claim will permanently mark it as cancelled. This action cannot be undone.
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-2">Reason for Voiding</label>
                              <textarea
                                className="w-full p-3 border rounded-lg resize-none"
                                rows={3}
                                value={voidReason}
                                onChange={(e) => setVoidReason(e.target.value)}
                                placeholder="Enter reason for voiding this claim..."
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  // Handle void submission
                                  setVoidReason('');
                                  setShowVoidClaim(false);
                                }}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Void Claim
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setShowVoidClaim(false)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Correct Claim Dialog */}
                    {showCorrectClaim && selectedClaim && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Correct Claim - {selectedClaim.id}</h3>
                            <Button variant="outline" onClick={() => setShowCorrectClaim(false)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Correction Notes</label>
                              <textarea
                                className="w-full p-3 border rounded-lg resize-none"
                                rows={4}
                                value={correctionNote}
                                onChange={(e) => setCorrectionNote(e.target.value)}
                                placeholder="Describe the corrections being made to this claim..."
                              />
                            </div>

                            <div className="bg-blue-50 p-3 rounded">
                              <div className="text-sm text-blue-700">
                                This will create a corrected claim with your notes and mark the original claim as corrected.
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  // Handle correction submission
                                  setCorrectionNote('');
                                  setShowCorrectClaim(false);
                                }}
                                className="flex-1"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Submit Correction
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setShowCorrectClaim(false)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Payments & Adjustments Tab */}
                  <TabsContent value="payments" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Payment History & Adjustments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Insurance Payment */}
                          <div className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-semibold">Insurance Payment</div>
                                <div className="text-sm text-gray-600">Date: 2024-01-25 | Check #: 123456</div>
                                <div className="text-sm text-gray-600">Payer: Blue Cross Blue Shield</div>
                              </div>
                              <Badge className="bg-green-100 text-green-800">Posted</Badge>
                            </div>

                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-gray-600">Payment Amount</div>
                                <div className="font-medium text-green-600">$300.00</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Contractual Adj.</div>
                                <div className="font-medium text-orange-600">$80.00</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Applied to Claim</div>
                                <div className="font-medium">CLM-2024-001</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Remaining Balance</div>
                                <div className="font-medium text-red-600">$70.00</div>
                              </div>
                            </div>
                          </div>

                          {/* Patient Payment */}
                          <div className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-semibold">Patient Payment</div>
                                <div className="text-sm text-gray-600">Date: 2024-01-15 | Method: Credit Card</div>
                                <div className="text-sm text-gray-600">Transaction: ****1234</div>
                              </div>
                              <Badge className="bg-blue-100 text-blue-800">Patient Paid</Badge>
                            </div>

                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-gray-600">Payment Amount</div>
                                <div className="font-medium text-green-600">$50.00</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Payment Type</div>
                                <div className="font-medium">Copay</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Applied to Service</div>
                                <div className="font-medium">2024-01-15 Visit</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Outstanding PR</div>
                                <div className="font-medium text-red-600">$20.00</div>
                              </div>
                            </div>
                          </div>

                          {/* Outstanding Patient Responsibility */}
                          <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-semibold text-orange-800">Outstanding Patient Responsibility</div>
                                <div className="text-sm text-orange-700">Requires Collection Action</div>
                              </div>
                              <Badge className="bg-orange-100 text-orange-800">Action Required</Badge>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Service 2024-01-15 (Deductible):</span>
                                <span className="font-medium text-red-600">$20.00</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Service 2024-02-10 (Patient Responsibility):</span>
                                <span className="font-medium text-red-600">$350.00</span>
                              </div>
                              <div className="border-t pt-2 flex justify-between font-semibold">
                                <span>Total Patient Balance:</span>
                                <span className="text-red-600">$370.00</span>
                              </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <DollarSign className="h-4 w-4 mr-1" />
                                Record Payment
                              </Button>
                              <Button size="sm" variant="outline">
                                <MailCheck className="h-4 w-4 mr-1" />
                                Send Statement
                              </Button>
                              <Button size="sm" variant="outline">
                                <Phone className="h-4 w-4 mr-1" />
                                Schedule Call
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Patient Statements Tab */}
                  <TabsContent value="statements" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Patient Statement Management</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-4 border rounded-lg">
                            <div>
                              <div className="font-semibold">Statement #STMT-2024-001</div>
                              <div className="text-sm text-gray-600">Generated: 2024-02-01 | Due: 2024-03-01</div>
                              <div className="text-sm text-gray-600">Balance: $370.00</div>
                            </div>
                            <div className="flex gap-2 items-center">
                              <Badge className="bg-yellow-100 text-yellow-800">Sent</Badge>
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                              <Button size="sm" variant="outline">
                                <MailCheck className="h-4 w-4 mr-1" />
                                Resend
                              </Button>
                            </div>
                          </div>

                          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-semibold mb-2">Generate New Statement</h4>
                            <p className="text-sm text-gray-600 mb-4">
                              Create and send a comprehensive patient statement with all outstanding balances and recent activity.
                            </p>
                            <Button className="w-full">
                              <MailCheck className="h-4 w-4 mr-2" />
                              Generate & Send Statement
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="vitals" className="space-y-6">
                <div className="flex justify-end">
                  <Button className="" onClick={() => setAddVitals(true)}>
                    Add Vitals
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Height
                          </p>
                          <p className="text-2xl font-bold">
                            {patient.height}cm
                          </p>
                        </div>
                        <Ruler className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Weight
                          </p>
                          <p className="text-2xl font-bold">
                            {patient.weight} lbs
                          </p>
                        </div>
                        <Weight className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            BMI
                          </p>
                          <p className="text-2xl font-bold">{patient.bmi}</p>
                        </div>
                        <Activity className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Blood Pressure
                          </p>
                          <p className="text-2xl font-bold">
                            {patient.bloodPressure}
                          </p>
                          <p className="text-xs text-gray-500">mmHg</p>
                        </div>
                        <Heart className="h-8 w-8 text-red-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Heart Rate
                          </p>
                          <p className="text-2xl font-bold">
                            {patient.heartRate}
                          </p>
                          <p className="text-xs text-gray-500">bpm</p>
                        </div>
                        <Activity className="h-8 w-8 text-pink-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Temperature
                          </p>
                          <p className="text-2xl font-bold">
                            {patient.temperature}°F
                          </p>
                        </div>
                        <Thermometer className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Monitoring patient={patient} />
              </TabsContent>




            </Tabs>
          </div>
        </div>
      </div>

      <AddNotes
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        fetchPatientNotes={fetchPatientNotes}
        patient={patient}
      />
      <AddMedicationsDialog
        open={addMedicationDialog}
        onOpenChange={setAddMedicationDialog}
        fetchPatient={fetchPatient}
      />
      <AddInsuranceDialog
        open={addInsuranceDialog}
        onOpenChange={setAddInsuranceDialog}
        fetchPatient={fetchPatient}
        patient={patient as any}
      />
      <AddAllergiesDialog
        open={addAllergiesDialog}
        onOpenChange={setAddAllergiesDialog}
        fetchPatient={fetchPatient}
      />
      <AddVitalsDialog
        open={addVitals}
        onOpenChange={setAddVitals}
        fetchPatient={fetchPatient}
      />

      {editDialogOpen && (
        <EditPatientDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          patient2={patient as any}
          fetchPatient={fetchPatient}
        />
      )}
    </div>
  );
};

export default PatientDetailsPage;
