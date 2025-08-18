import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
  Award,
  Target,
  Users,
  Clock
} from 'lucide-react';
import MIPSDashboard from '@/components/mips/MIPSDashboard';
import { mipsService } from '@/services/mipsService';

interface MIPSComplianceProps {}

const MIPSCompliance: React.FC<MIPSComplianceProps> = () => {
  const user = useSelector((state: any) => state.auth.user);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [performanceYear, setPerformanceYear] = useState(new Date().getFullYear());
  const [eligibilityStatus, setEligibilityStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadEligibilityStatus();
    }
  }, [user?.id, performanceYear]);

  const loadEligibilityStatus = async () => {
    try {
      setLoading(true);
      const response = await mipsService.getEligibilityStatus(user.id, performanceYear);
      setEligibilityStatus(response.data.eligibilityRecords[0] || null);
    } catch (error) {
      console.error('Error loading eligibility status:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async () => {
    if (!user?.npi || !user?.tin) {
      alert('NPI and TIN are required. Please update your provider profile.');
      return;
    }

    try {
      setLoading(true);
      await mipsService.checkEligibility({
        providerId: user.id,
        performanceYear,
        tin: user.tin,
        npi: user.npi,
        specialty: user.specialty
      });
      await loadEligibilityStatus();
    } catch (error) {
      console.error('Error checking eligibility:', error);
      alert('Failed to check MIPS eligibility. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !eligibilityStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MIPS Compliance</h1>
          <p className="text-muted-foreground">
            Merit-based Incentive Payment System - Performance Year {performanceYear}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={performanceYear} 
            onChange={(e) => setPerformanceYear(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-md"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
          {!eligibilityStatus && (
            <Button onClick={checkEligibility} disabled={loading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Check Eligibility
            </Button>
          )}
        </div>
      </div>

      {/* Eligibility Status Alert */}
      {!eligibilityStatus ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            MIPS eligibility has not been determined for {performanceYear}. 
            Click "Check Eligibility" to assess your participation requirements.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className={
          eligibilityStatus.eligibilityStatus === 'eligible' ? 'border-green-200 bg-green-50' :
          eligibilityStatus.eligibilityStatus === 'exempt' ? 'border-blue-200 bg-blue-50' :
          'border-red-200 bg-red-50'
        }>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                MIPS Status: <strong>{eligibilityStatus.eligibilityStatus.replace('_', ' ').toUpperCase()}</strong>
                {eligibilityStatus.eligibilityReason && ` - ${eligibilityStatus.eligibilityReason}`}
              </span>
              <Badge variant={
                eligibilityStatus.eligibilityStatus === 'eligible' ? 'default' :
                eligibilityStatus.eligibilityStatus === 'exempt' ? 'secondary' :
                'destructive'
              }>
                {eligibilityStatus.eligibilityStatus.replace('_', ' ')}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      {eligibilityStatus?.eligibilityStatus === 'eligible' ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="pi">PI</TabsTrigger>
            <TabsTrigger value="ia">IA</TabsTrigger>
            <TabsTrigger value="submission">Submission</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <MIPSDashboard 
              providerId={user.id} 
              performanceYear={performanceYear} 
            />
          </TabsContent>

          <TabsContent value="quality">
            <QualityMeasuresPage 
              providerId={user.id} 
              performanceYear={performanceYear} 
            />
          </TabsContent>

          <TabsContent value="pi">
            <PromotingInteroperabilityPage 
              providerId={user.id} 
              performanceYear={performanceYear} 
            />
          </TabsContent>

          <TabsContent value="ia">
            <ImprovementActivitiesPage 
              providerId={user.id} 
              performanceYear={performanceYear} 
            />
          </TabsContent>

          <TabsContent value="submission">
            <SubmissionPage 
              providerId={user.id} 
              performanceYear={performanceYear} 
            />
          </TabsContent>

          <TabsContent value="resources">
            <ResourcesPage />
          </TabsContent>
        </Tabs>
      ) : eligibilityStatus?.eligibilityStatus === 'exempt' ? (
        <ExemptProviderView eligibilityStatus={eligibilityStatus} />
      ) : eligibilityStatus?.eligibilityStatus === 'not_eligible' ? (
        <NotEligibleProviderView eligibilityStatus={eligibilityStatus} />
      ) : (
        <WelcomeView onCheckEligibility={checkEligibility} loading={loading} />
      )}
    </div>
  );
};

// Component for exempt providers
const ExemptProviderView: React.FC<{ eligibilityStatus: any }> = ({ eligibilityStatus }) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-blue-600" />
          MIPS Exemption Status
        </CardTitle>
        <CardDescription>
          You are exempt from MIPS reporting requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium">Exemption Reason</h4>
            <p className="text-sm text-muted-foreground">{eligibilityStatus.eligibilityReason}</p>
          </div>
          <div>
            <h4 className="font-medium">Specialty</h4>
            <p className="text-sm text-muted-foreground">{eligibilityStatus.specialty || 'Not specified'}</p>
          </div>
        </div>
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            While you're exempt from MIPS reporting, you may still choose to participate voluntarily 
            to earn positive payment adjustments and prepare for future years.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Learn About Voluntary Participation
          </Button>
          <Button variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Performance Trends
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Component for non-eligible providers
const NotEligibleProviderView: React.FC<{ eligibilityStatus: any }> = ({ eligibilityStatus }) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          MIPS Eligibility Status
        </CardTitle>
        <CardDescription>
          You do not currently meet MIPS participation thresholds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium">Medicare Volume</h4>
            <p className="text-sm text-muted-foreground">
              {eligibilityStatus.thresholds?.medicareVolume || 0}% (Need: 75%)
            </p>
          </div>
          <div>
            <h4 className="font-medium">Patient Volume</h4>
            <p className="text-sm text-muted-foreground">
              {eligibilityStatus.thresholds?.patientVolume || 0} (Need: 200)
            </p>
          </div>
          <div>
            <h4 className="font-medium">Allowed Charges</h4>
            <p className="text-sm text-muted-foreground">
              ${eligibilityStatus.thresholds?.allowedCharges || 0} (Need: $90,000)
            </p>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Monitor your Medicare volume and patient counts throughout the year. 
            You may become eligible if your practice grows.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            Track Progress
          </Button>
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Consider Group Reporting
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Welcome view for new users
const WelcomeView: React.FC<{ onCheckEligibility: () => void; loading: boolean }> = ({ 
  onCheckEligibility, 
  loading 
}) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-600" />
          Welcome to MIPS Compliance
        </CardTitle>
        <CardDescription>
          Merit-based Incentive Payment System helps improve healthcare quality and outcomes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <Target className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h4 className="font-medium">Quality Measures</h4>
            <p className="text-sm text-muted-foreground">Track clinical quality and outcomes</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <FileText className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <h4 className="font-medium">Promoting Interoperability</h4>
            <p className="text-sm text-muted-foreground">Meaningful use of certified EHR</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <h4 className="font-medium">Improvement Activities</h4>
            <p className="text-sm text-muted-foreground">Practice improvement initiatives</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <Award className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <h4 className="font-medium">Cost Category</h4>
            <p className="text-sm text-muted-foreground">Resource use efficiency</p>
          </div>
        </div>

        <div className="text-center">
          <Button onClick={onCheckEligibility} disabled={loading} size="lg">
            <CheckCircle className="h-4 w-4 mr-2" />
            {loading ? 'Checking...' : 'Check MIPS Eligibility'}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Determine your participation requirements and get started
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Placeholder components for other tabs
const QualityMeasuresPage: React.FC<{ providerId: string; performanceYear: number }> = () => (
  <Card>
    <CardHeader>
      <CardTitle>Quality Measures</CardTitle>
      <CardDescription>Select and track quality measure performance</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">Quality measures management interface will be implemented here.</p>
    </CardContent>
  </Card>
);

const PromotingInteroperabilityPage: React.FC<{ providerId: string; performanceYear: number }> = () => (
  <Card>
    <CardHeader>
      <CardTitle>Promoting Interoperability</CardTitle>
      <CardDescription>PI measure attestations and EHR requirements</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">PI measures interface will be implemented here.</p>
    </CardContent>
  </Card>
);

const ImprovementActivitiesPage: React.FC<{ providerId: string; performanceYear: number }> = () => (
  <Card>
    <CardHeader>
      <CardTitle>Improvement Activities</CardTitle>
      <CardDescription>IA attestations and point tracking</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">IA activities interface will be implemented here.</p>
    </CardContent>
  </Card>
);

const SubmissionPage: React.FC<{ providerId: string; performanceYear: number }> = () => (
  <Card>
    <CardHeader>
      <CardTitle>MIPS Submission</CardTitle>
      <CardDescription>Review and submit MIPS data to CMS</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">Submission interface will be implemented here.</p>
    </CardContent>
  </Card>
);

const ResourcesPage: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle>MIPS Resources</CardTitle>
      <CardDescription>Guidelines, documentation, and support materials</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">Resources and documentation will be implemented here.</p>
    </CardContent>
  </Card>
);

export default MIPSCompliance;