import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  Users, 
  MessageSquare, 
  Calendar, 
  BarChart3, 
  Settings, 
  Plus,
  Mail,
  Phone,
  MessageCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  MousePointer,
  Reply
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { patientOutreachService } from '@/services/patientOutreachService';

interface CommunicationStats {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
}

interface Campaign {
  id: number;
  name: string;
  status: 'active' | 'draft' | 'paused' | 'completed';
  segment: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  startDate: string;
}

interface RecentCommunication {
  id: number;
  patientName: string;
  channel: 'email' | 'sms' | 'whatsapp';
  purpose: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced';
  sentAt: string;
}

const PatientOutreach: React.FC = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<CommunicationStats>({
    totalSent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
    bounced: 0
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentCommunications, setRecentCommunications] = useState<RecentCommunication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load actual data from API
      const [statsData, campaignsData, recentData] = await Promise.all([
        patientOutreachService.getDashboardStats(),
        patientOutreachService.getActiveCampaigns(),
        patientOutreachService.getRecentCommunications()
      ]);

      setStats(statsData);
      setCampaigns(campaignsData);
      setRecentCommunications(recentData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // Fallback to mock data if API fails
      setStats({
        totalSent: 1247,
        delivered: 1198,
        opened: 856,
        clicked: 234,
        replied: 89,
        bounced: 49
      });

      setCampaigns([
        {
          id: 1,
          name: 'Hypertension Care Reminder',
          status: 'active',
          segment: 'HTN Patients >90 days',
          sent: 156,
          delivered: 152,
          opened: 98,
          clicked: 23,
          startDate: '2024-01-15'
        },
        {
          id: 2,
          name: 'New Patient Onboarding',
          status: 'active',
          segment: 'New Patients',
          sent: 45,
          delivered: 44,
          opened: 32,
          clicked: 18,
          startDate: '2024-01-20'
        }
      ]);

      setRecentCommunications([
        {
          id: 1,
          patientName: 'John Smith',
          channel: 'email',
          purpose: 'Appointment Reminder',
          status: 'opened',
          sentAt: '2024-01-25 10:30 AM'
        },
        {
          id: 2,
          patientName: 'Maria Garcia',
          channel: 'sms',
          purpose: 'Lab Results Ready',
          status: 'replied',
          sentAt: '2024-01-25 09:15 AM'
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
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send className="h-4 w-4 text-blue-500" />;
      case 'delivered': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'opened': return <Eye className="h-4 w-4 text-purple-500" />;
      case 'clicked': return <MousePointer className="h-4 w-4 text-orange-500" />;
      case 'replied': return <Reply className="h-4 w-4 text-green-600" />;
      case 'bounced': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'draft': return 'secondary';
      case 'paused': return 'outline';
      case 'completed': return 'secondary';
      default: return 'outline';
    }
  };

  const deliveryRate = stats.totalSent > 0 ? ((stats.delivered / stats.totalSent) * 100).toFixed(1) : '0';
  const openRate = stats.delivered > 0 ? ((stats.opened / stats.delivered) * 100).toFixed(1) : '0';
  const clickRate = stats.opened > 0 ? ((stats.clicked / stats.opened) * 100).toFixed(1) : '0';

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
          <h1 className="text-3xl font-bold tracking-tight">Patient Outreach</h1>
          <p className="text-muted-foreground">
            Manage patient communications, campaigns, and engagement analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.delivered.toLocaleString()} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.opened.toLocaleString()} opened
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clickRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.clicked.toLocaleString()} clicked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="communications">Recent Communications</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="segments">Patient Segments</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Campaigns</CardTitle>
              <CardDescription>
                Manage your patient communication campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{campaign.name}</h3>
                        <Badge variant={getStatusBadgeVariant(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Target: {campaign.segment} • Started: {campaign.startDate}
                      </p>
                      <div className="flex gap-4 text-sm">
                        <span>Sent: {campaign.sent}</span>
                        <span>Delivered: {campaign.delivered}</span>
                        <span>Opened: {campaign.opened}</span>
                        <span>Clicked: {campaign.clicked}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Communications</CardTitle>
              <CardDescription>
                Latest patient communications and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCommunications.map((comm) => (
                  <div key={comm.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(comm.channel)}
                        <span className="font-medium">{comm.patientName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {comm.purpose}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(comm.status)}
                        <span className="text-sm capitalize">{comm.status}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {comm.sentAt}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Communication Templates</CardTitle>
              <CardDescription>
                Manage email, SMS, and WhatsApp templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Template Management</h3>
                <p className="text-muted-foreground mb-4">
                  Create and manage communication templates for different channels and purposes
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Segments</CardTitle>
              <CardDescription>
                Define patient groups for targeted communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Patient Segmentation</h3>
                <p className="text-muted-foreground mb-4">
                  Create patient segments based on demographics, conditions, and care gaps
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Segment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientOutreach;