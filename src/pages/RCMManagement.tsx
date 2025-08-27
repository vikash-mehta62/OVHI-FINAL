import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  FileText,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  Settings,
  Download,
  RefreshCw,
  CreditCard,
  Calendar,
  Shield,
  Zap,
  FileText as FileTextIcon
} from 'lucide-react';

// Import RCM components
import RCMDashboard from '@/components/rcm/UnifiedRCMDashboard';
import ClaimsManagement from '@/components/rcm/ClaimsManagement';
import PaymentHistory from '@/components/payments/PaymentHistory';
import PaymentGatewaySettings from '@/components/payments/PaymentGatewaySettings';
import ClaimValidation from '@/components/rcm/ClaimValidation';
import AutoCorrections from '@/components/rcm/AutoCorrections';
import PatientStatements from '@/components/rcm/PatientStatements';
import ARAgingManagement from '../components/rcm/ARAgingManagement';

const RCMManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabConfig = [
    {
      value: 'dashboard',
      label: 'Dashboard',
      icon: <BarChart3 className="h-4 w-4" />,
      description: 'Overview and KPIs',
      component: <RCMDashboard />
    },
    {
      value: 'claims',
      label: 'Claims',
      icon: <FileText className="h-4 w-4" />,
      description: 'Manage claim submissions',
      component: <ClaimsManagement />
    },
    {
      value: 'payments',
      label: 'Payments',
      icon: <CreditCard className="h-4 w-4" />,
      description: 'Payment processing and history',
      component: <PaymentHistory />
    },
    {
      value: 'ar-aging',
      label: 'A/R Aging',
      icon: <Clock className="h-4 w-4" />,
      description: 'Accounts receivable aging',
      component: <ARAgingManagement />
    },
    {
      value: 'validation',
      label: 'Validation',
      icon: <Shield className="h-4 w-4" />,
      description: 'Claim validation and scoring',
      component: <ClaimValidation claimId={1} />
    },
    {
      value: 'corrections',
      label: 'Auto-Fix',
      icon: <Zap className="h-4 w-4" />,
      description: 'Auto-correction suggestions',
      component: <AutoCorrections />
    },
    {
      value: 'statements',
      label: 'Statements',
      icon: <FileTextIcon className="h-4 w-4" />,
      description: 'Patient billing statements',
      component: <PatientStatements />
    },
    {
      value: 'settings',
      label: 'Settings',
      icon: <Settings className="h-4 w-4" />,
      description: 'Payment gateway configuration',
      component: <PaymentGatewaySettings />
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Revenue Cycle Management</h1>
          <p className="text-lg text-gray-600 mt-2">
            Comprehensive RCM platform for healthcare practices
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="px-3 py-1">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            System Online
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$124,580</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.3%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2.1%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">+3</span> from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days in A/R</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">-2 days</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          {tabConfig.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center space-x-2"
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabConfig.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-6">
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

// Placeholder components for tabs not yet implemented
const DenialManagement: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle>Denial Management</CardTitle>
      <CardDescription>Manage claim denials and appeals</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Denial Management</h3>
        <p className="text-muted-foreground mb-4">
          Track and manage claim denials with automated appeal workflows
        </p>
        <Button>
          <RefreshCw className="h-4 w-4 mr-2" />
          Coming Soon
        </Button>
      </div>
    </CardContent>
  </Card>
);

const PaymentManagement: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle>Payment Management</CardTitle>
      <CardDescription>Payment posting and ERA processing</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-center py-12">
        <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Payment Processing</h3>
        <p className="text-muted-foreground mb-4">
          Automated payment posting and ERA file processing
        </p>
        <Button>
          <RefreshCw className="h-4 w-4 mr-2" />
          Coming Soon
        </Button>
      </div>
    </CardContent>
  </Card>
);

const CollectionsManagement: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle>Collections Management</CardTitle>
      <CardDescription>Automated collection workflows</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Collections Workflow</h3>
        <p className="text-muted-foreground mb-4">
          Automated patient communication and collection strategies
        </p>
        <Button>
          <RefreshCw className="h-4 w-4 mr-2" />
          Coming Soon
        </Button>
      </div>
    </CardContent>
  </Card>
);

const AnalyticsReporting: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle>Analytics & Reporting</CardTitle>
      <CardDescription>Advanced analytics and custom reports</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
        <p className="text-muted-foreground mb-4">
          Comprehensive reporting and business intelligence
        </p>
        <Button>
          <RefreshCw className="h-4 w-4 mr-2" />
          Coming Soon
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default RCMManagement;