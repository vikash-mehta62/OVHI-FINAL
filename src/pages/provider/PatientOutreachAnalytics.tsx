import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Mail,
  Phone,
  MessageCircle,
  Eye,
  MousePointer,
  Reply,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { patientOutreachService } from '@/services/patientOutreachService';

interface AnalyticsData {
  period: string;
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
}

interface ChannelPerformance {
  channel: 'email' | 'sms' | 'whatsapp';
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

interface CampaignPerformance {
  id: number;
  name: string;
  channel: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  roi: number;
  cost: number;
}

const PatientOutreachAnalytics: React.FC = () => {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [channelPerformance, setChannelPerformance] = useState<ChannelPerformance[]>([]);
  const [campaignPerformance, setCampaignPerformance] = useState<CampaignPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load actual data from API
      const [analyticsData, channelData] = await Promise.all([
        patientOutreachService.getAnalyticsData(),
        patientOutreachService.getChannelPerformance()
      ]);

      setAnalyticsData(analyticsData);
      setChannelPerformance(channelData);

      // Mock campaign performance for now
      setCampaignPerformance([
        {
          id: 1,
          name: 'Hypertension Care Reminder',
          channel: 'Email + SMS',
          sent: 156,
          delivered: 152,
          opened: 98,
          clicked: 23,
          replied: 8,
          roi: 340,
          cost: 78.50
        },
        {
          id: 2,
          name: 'New Patient Onboarding',
          channel: 'Email',
          sent: 45,
          delivered: 44,
          opened: 32,
          clicked: 18,
          replied: 12,
          roi: 520,
          cost: 22.50
        }
      ]);

    } catch (error) {
      console.error('Error loading analytics data:', error);
      
      // Fallback to mock data
      setAnalyticsData([
        { period: 'Week 1', totalSent: 245, delivered: 238, opened: 156, clicked: 42, replied: 18, bounced: 7, unsubscribed: 2 },
        { period: 'Week 2', totalSent: 312, delivered: 301, opened: 198, clicked: 58, replied: 24, bounced: 11, unsubscribed: 3 },
        { period: 'Week 3', totalSent: 289, delivered: 278, opened: 182, clicked: 51, replied: 21, bounced: 11, unsubscribed: 1 },
        { period: 'Week 4', totalSent: 401, delivered: 389, opened: 267, clicked: 78, replied: 32, bounced: 12, unsubscribed: 4 }
      ]);

      setChannelPerformance([
        {
          channel: 'email',
          sent: 856,
          delivered: 832,
          opened: 567,
          clicked: 156,
          deliveryRate: 97.2,
          openRate: 68.1,
          clickRate: 27.5
        },
        {
          channel: 'sms',
          sent: 423,
          delivered: 418,
          opened: 0,
          clicked: 89,
          deliveryRate: 98.8,
          openRate: 0,
          clickRate: 21.3
        }
      ]);

      toast({
        title: 'Info',
        description: 'Using demo data - API connection not available',
        variant: 'default'
      });
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const totalStats = analyticsData.reduce((acc, curr) => ({
    totalSent: acc.totalSent + curr.totalSent,
    delivered: acc.delivered + curr.delivered,
    opened: acc.opened + curr.opened,
    clicked: acc.clicked + curr.clicked,
    replied: acc.replied + curr.replied,
    bounced: acc.bounced + curr.bounced,
    unsubscribed: acc.unsubscribed + curr.unsubscribed
  }), { totalSent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, unsubscribed: 0 });

  const deliveryRate = totalStats.totalSent > 0 ? ((totalStats.delivered / totalStats.totalSent) * 100).toFixed(1) : '0';
  const openRate = totalStats.delivered > 0 ? ((totalStats.opened / totalStats.delivered) * 100).toFixed(1) : '0';
  const clickRate = totalStats.opened > 0 ? ((totalStats.clicked / totalStats.opened) * 100).toFixed(1) : '0';
  const replyRate = totalStats.delivered > 0 ? ((totalStats.replied / totalStats.delivered) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communication Analytics</h1>
          <p className="text-muted-foreground">
            Analyze patient communication performance and engagement metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.delivered.toLocaleString()} of {totalStats.totalSent.toLocaleString()} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.opened.toLocaleString()} opened
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clickRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.clicked.toLocaleString()} clicked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
            <Reply className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{replyRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.replied.toLocaleString()} replied
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="channels">Channel Performance</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign ROI</TabsTrigger>
          <TabsTrigger value="engagement">Patient Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Communication Volume Trend</CardTitle>
                <CardDescription>
                  Weekly communication volume over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.map((data, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{data.period}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Sent: {data.totalSent}</span>
                        <span>Delivered: {data.delivered}</span>
                        <span>Opened: {data.opened}</span>
                        <span>Clicked: {data.clicked}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Funnel</CardTitle>
                <CardDescription>
                  Patient engagement at each stage of communication
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Messages Sent</span>
                    <span className="font-medium">{totalStats.totalSent.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Delivered</span>
                    <span className="font-medium">{totalStats.delivered.toLocaleString()} ({deliveryRate}%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Opened</span>
                    <span className="font-medium">{totalStats.opened.toLocaleString()} ({openRate}%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Clicked</span>
                    <span className="font-medium">{totalStats.clicked.toLocaleString()} ({clickRate}%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Replied</span>
                    <span className="font-medium">{totalStats.replied.toLocaleString()} ({replyRate}%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Channel Performance Comparison</CardTitle>
              <CardDescription>
                Performance metrics across different communication channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {channelPerformance.map((channel) => (
                  <div key={channel.channel} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(channel.channel)}
                        <h3 className="font-medium capitalize">{channel.channel}</h3>
                      </div>
                      <Badge variant="outline">
                        {channel.sent.toLocaleString()} sent
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Delivery Rate</span>
                        <div className="font-medium">{channel.deliveryRate}%</div>
                      </div>
                      {channel.channel !== 'sms' && (
                        <div>
                          <span className="text-muted-foreground">Open Rate</span>
                          <div className="font-medium">{channel.openRate}%</div>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Click Rate</span>
                        <div className="font-medium">{channel.clickRate}%</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Engagement</span>
                        <div className="font-medium">{channel.clicked} clicks</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign ROI Analysis</CardTitle>
              <CardDescription>
                Return on investment and performance metrics for active campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaignPerformance.map((campaign) => (
                  <div key={campaign.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{campaign.name}</h3>
                        <p className="text-sm text-muted-foreground">{campaign.channel}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{campaign.roi}% ROI</div>
                        <div className="text-sm text-muted-foreground">Cost: ${campaign.cost}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Sent</span>
                        <div className="font-medium">{campaign.sent}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Delivered</span>
                        <div className="font-medium">{campaign.delivered}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Opened</span>
                        <div className="font-medium">{campaign.opened}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Clicked</span>
                        <div className="font-medium">{campaign.clicked}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Replied</span>
                        <div className="font-medium">{campaign.replied}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Engagement Insights</CardTitle>
              <CardDescription>
                Detailed analysis of patient communication preferences and behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Advanced Analytics Coming Soon</h3>
                <p className="text-muted-foreground mb-4">
                  Detailed patient engagement analytics, best-hour optimization, and behavioral insights
                </p>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Configure Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientOutreachAnalytics;