import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Palette, 
  User,
  Save,
  Phone,
  Building,
  Stethoscope,
  FileText,
  Heart,
  CreditCard
} from "lucide-react";
import HipaaNotice from "@/components/HipaaNotice";

import AccountSettings from "@/components/settings/AccountSettings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import PrivacySettings from "@/components/settings/PrivacySettings";
import RingCentralSettings from "@/components/settings/RingCentralSettings";
import PracticeSetupSettings from "@/components/settings/PracticeSetupSettings";
import SpecialtyConfigurationSettings from "@/components/settings/SpecialtyConfigurationSettings";
import EncounterTemplateSettings from "@/components/settings/EncounterTemplateSettings";
import CareManagementSettings from "@/components/settings/CareManagementSettings";
import SmartSpecialtyManager from '@/components/settings/SmartSpecialtyManager';
import BillingConfigurationSettings from '@/components/settings/BillingConfigurationSettings';

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <HipaaNotice />
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <Button 
          onClick={() => toast.success("Settings saved successfully")}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Save All Changes
        </Button>
      </div>
      
      {/* ✅ Added relative container to allow absolute positioning */}
      <div className="relative">
        <Tabs defaultValue="practice-setup" className="w-full relative z-10">
          <div className="overflow-x-auto">
            {/* ✅ Allow overflow so badges aren’t clipped */}
            <TabsList className="grid grid-cols-10 mb-4 w-[1300px] h-20 overflow-visible relative z-10">
              <TabsTrigger value="practice-setup">
                <Building className="h-4 w-4 mr-2" />
                Practice
              </TabsTrigger>

                <TabsTrigger value="specialty" className="relative overflow-visible">
                <Stethoscope className="h-4 w-4 mr-2" />
                Specialty
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full z-[99999] pointer-events-none shadow-md">
                  Not Activated
                </span>
                </TabsTrigger>

              <TabsTrigger value="templates">
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </TabsTrigger>

              {/* ✅ Care Mgmt Tab with badge */}
              <TabsTrigger value="care-mgmt" className="relative overflow-visible">
                <Heart className="h-4 w-4 mr-2" />
                Care Mgmt
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full z-[99999] pointer-events-none shadow-md">
                  Not Activated
                </span>
              </TabsTrigger>

              {/* ✅ Billing Tab with badge */}
              <TabsTrigger value="billing" className="relative overflow-visible">
                <CreditCard className="h-4 w-4 mr-2" />
                Billing
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full z-[99999] pointer-events-none shadow-md">
                  Not Activated
                </span>
              </TabsTrigger>

              <TabsTrigger value="account">
                <User className="h-4 w-4 mr-2" />
                Account
              </TabsTrigger>

              <TabsTrigger value="appearance" className="relative overflow-visible">
                <Palette className="h-4 w-4 mr-2" />
                Appearance
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full z-[99999] pointer-events-none shadow-md">
                  Not Activated
                </span>
              </TabsTrigger>

              <TabsTrigger value="notifications">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>

              <TabsTrigger value="privacy" className="relative overflow-visible">
                <Shield className="h-4 w-4 mr-2" />
                Privacy
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full z-[99999] pointer-events-none shadow-md">
                  Not Activated
                </span>
              </TabsTrigger>

              <TabsTrigger value="ringcentral">
                <Phone className="h-4 w-4 mr-2" />
                RingCentral
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="practice-setup">
            <PracticeSetupSettings />
          </TabsContent>
          
          <TabsContent value="specialty">
            <SmartSpecialtyManager />
          </TabsContent>
          
          <TabsContent value="templates">
            <EncounterTemplateSettings />
          </TabsContent>
          
          <TabsContent value="care-mgmt">
            <CareManagementSettings />
          </TabsContent>
          
          <TabsContent value="billing">
            <BillingConfigurationSettings />
          </TabsContent>
          
          <TabsContent value="account">
            <AccountSettings />
          </TabsContent>
          
          <TabsContent value="appearance">
            <AppearanceSettings />
          </TabsContent>
          
          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>
          
          <TabsContent value="privacy">
            <PrivacySettings />
          </TabsContent>
          
          <TabsContent value="ringcentral">
            <RingCentralSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
