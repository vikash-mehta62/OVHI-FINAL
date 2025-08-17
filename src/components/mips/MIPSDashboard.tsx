import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  FileText, 
  Calendar,
  Target,
  Award,
  AlertCircle
} from 'lucide-react';
import { mipsService } from '@/services/mipsService';

interface MIPSDashboardProps {
  providerId: string;
  performanceYear?: number;
}

interface DashboardData {
  eligibility: any;
  submission: any;
  gaps: any[];
  measureProgress: any;
  timeline: any;
}

const MIPSDashboard: React.FC<MIPSDashboardProps> = ({ 
  providerId, 
  performanceYear = new Date().getFullYear() 
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [providerId, performanceYear]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await mipsService.getDashboardData(providerId, performanceYear);
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading MIPS dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = async () => {
    try {
      setCalculating(true);
      await mipsService.calculateCompositeScore(providerId, performanceYear);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error calculating MIPS score:', error);
    } finally {
      setCalculating(false);
    }
  };

  const identifyGaps = async () => {
    try {
      await mipsService.identifyDataGaps(providerId, performanceYear);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error identifying data gaps:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load MIPS dashboard data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const { eligibility, submission, gaps, measureProgress, timeline } = dashboardData;

  const getEligibilityBadge = (status: string) => {
    const variants = {
      eligible: 'default',
      not_eligible: 'destructive',
      exempt: 'secondary',
      pending: 'outline'
    };
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status.replace('_', ' ')}</Badge>;
  };

  const getTimelineStatus = () => {
    if (timeline.phase === 'performance_period') {
      return {
        icon: <Clock className="h-4 w-4" />,
        text: `${timeline.daysRemaining} days left in performance period`,
        variant: timeline.daysRemaining < 30 ? 'destructive' : 'default'
      };
    } else if (timeline.phase === 'submission_period') {
      return {
        icon: <FileText className="h-4 w-4" />,
        text: `${timeline.daysRemaining} days left to submit`,
        variant: timeline.daysRemaining < 30 ? 'destructive' : 'default'
      };
    } else {
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        text: 'Performance year completed',
        variant: 'secondary'
      };
    }
  };

  const timelineStatus = getTimelineStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MIPS Compliance Dashboard</h1>
          <p className="text-muted-foreground">Performance Year {performanceYear}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={identifyGaps} variant="outline">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Identify Gaps
          </Button>
          <Button onClick={calculateScore} disabled={calculating}>
            <TrendingUp className="h-4 w-4 mr-2" />
            {calculating ? 'Calculating...' : 'Calculate Score'}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Eligibility Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligibility Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {eligibility ? getEligibilityBadge(eligibility.eligibility_status) : <Badge variant="outline">Unknown</Badge>}
              {eligibility?.specialty_name && (
                <p className="text-xs text-muted-foreground">{eligibility.specialty_name}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {timelineStatus.icon}
              <span className="text-sm">{timelineStatus.text}</span>
            </div>
          </CardContent>
        </Card>

        {/* Composite Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Composite Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {submission?.composite_score ? `${submission.composite_score}` : '--'}
              </div>
              {submission?.payment_adjustment && (
                <p className="text-xs text-muted-foreground">
                  Payment Adjustment: {submission.payment_adjustment > 0 ? '+' : ''}{submission.payment_adjustment}%
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Gaps */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Gaps</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {gaps.reduce((sum, g) => sum + g.gap_count, 0)}
              </div>
              <div className="flex space-x-2">
                {gaps.map(gap => (
                  <Badge key={gap.gap_category} variant="outline" className="text-xs">
                    {gap.gap_category}: {gap.gap_count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quality">Quality Measures</TabsTrigger>
          <TabsTrigger value="pi">Promoting Interoperability</TabsTrigger>
          <TabsTrigger value="ia">Improvement Activities</TabsTrigger>
          <TabsTrigger value="gaps">Data Gaps</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Scores */}
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Performance across MIPS categories</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {submission && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Quality (45%)</span>
                        <span>{submission.quality_score || 0}/100</span>
                      </div>
                      <Progress value={submission.quality_score || 0} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Promoting Interoperability (25%)</span>
                        <span>{submission.pi_score || 0}/100</span>
                      </div>
                      <Progress value={submission.pi_score || 0} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Improvement Activities (15%)</span>
                        <span>{submission.ia_score || 0}/100</span>
                      </div>
                      <Progress value={submission.ia_score || 0} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Cost (15%)</span>
                        <span>{submission.cost_score || 0}/100</span>
                      </div>
                      <Progress value={submission.cost_score || 0} className="h-2" />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quality Measures Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Measures Progress</CardTitle>
                <CardDescription>Data collection and performance status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{measureProgress.total_measures || 0}</div>
                    <p className="text-xs text-muted-foreground">Selected Measures</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{measureProgress.measures_with_min_cases || 0}</div>
                    <p className="text-xs text-muted-foreground">Meeting Min Cases</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Avg Data Completeness</span>
                    <span>{Math.round(measureProgress.avg_completeness || 0)}%</span>
                  </div>
                  <Progress value={measureProgress.avg_completeness || 0} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Avg Performance Rate</span>
                    <span>{Math.round(measureProgress.avg_performance || 0)}%</span>
                  </div>
                  <Progress value={measureProgress.avg_performance || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submission Status */}
          {submission && (
            <Card>
              <CardHeader>
                <CardTitle>Submission Status</CardTitle>
                <CardDescription>Current submission and scoring status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge variant={submission.submission_status === 'submitted' ? 'default' : 'outline'}>
                      {submission.submission_status || 'Draft'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Submission Method</p>
                    <p className="text-sm text-muted-foreground">{submission.submission_method || 'Not selected'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Submission Date</p>
                    <p className="text-sm text-muted-foreground">
                      {submission.submission_date 
                        ? new Date(submission.submission_date).toLocaleDateString()
                        : 'Not submitted'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="quality">
          <QualityMeasuresTab providerId={providerId} performanceYear={performanceYear} />
        </TabsContent>

        <TabsContent value="pi">
          <PromotingInteroperabilityTab providerId={providerId} performanceYear={performanceYear} />
        </TabsContent>

        <TabsContent value="ia">
          <ImprovementActivitiesTab providerId={providerId} performanceYear={performanceYear} />
        </TabsContent>

        <TabsContent value="gaps">
          <DataGapsTab providerId={providerId} performanceYear={performanceYear} gaps={gaps} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Placeholder components for tabs - these would be separate components
const QualityMeasuresTab = ({ providerId, performanceYear }: { providerId: string; performanceYear: number }) => (
  <Card>
    <CardHeader>
      <CardTitle>Quality Measures</CardTitle>
      <CardDescription>Manage and track quality measure performance</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">Quality measures component will be implemented here.</p>
    </CardContent>
  </Card>
);

const PromotingInteroperabilityTab = ({ providerId, performanceYear }: { providerId: string; performanceYear: number }) => (
  <Card>
    <CardHeader>
      <CardTitle>Promoting Interoperability</CardTitle>
      <CardDescription>PI measure attestations and performance</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">PI measures component will be implemented here.</p>
    </CardContent>
  </Card>
);

const ImprovementActivitiesTab = ({ providerId, performanceYear }: { providerId: string; performanceYear: number }) => (
  <Card>
    <CardHeader>
      <CardTitle>Improvement Activities</CardTitle>
      <CardDescription>IA attestations and point tracking</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">IA activities component will be implemented here.</p>
    </CardContent>
  </Card>
);

const DataGapsTab = ({ providerId, performanceYear, gaps }: { providerId: string; performanceYear: number; gaps: any[] }) => (
  <Card>
    <CardHeader>
      <CardTitle>Data Gaps</CardTitle>
      <CardDescription>Identified gaps and remediation tasks</CardDescription>
    </CardHeader>
    <CardContent>
      {gaps.length > 0 ? (
        <div className="space-y-4">
          {gaps.map(gap => (
            <div key={gap.gap_category} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{gap.gap_category.replace('_', ' ')}</h4>
                <Badge variant="outline">{gap.gap_count} gaps</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {gap.critical_gaps > 0 && `${gap.critical_gaps} critical gaps identified`}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No data gaps identified.</p>
      )}
    </CardContent>
  </Card>
);

export default MIPSDashboard;