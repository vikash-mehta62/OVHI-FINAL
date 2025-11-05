
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { updateNotificationSettingsAPI, getNotificationSettingsAPI } from '@/services/operations/enhancedSettings';

const NotificationSettings: React.FC = () => {
  const { token } = useSelector((state: RootState) => state.auth);
  const [settings, setSettings] = useState({
    emailNotifications: {
      appointments: true,
      labResults: true,
      patientRegistration: true,
      messages: true
    },
    inAppNotifications: {
      appointments: true,
      checkins: true,
      labResults: true,
      prescriptions: true
    },
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '07:00'
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (token) {
        const response = await getNotificationSettingsAPI(token);
        if (response?.data) {
          setSettings(response.data);
        }
        setLoading(false);
      }
    };
    fetchSettings();
  }, [token]);

  const handleSaveSettings = async () => {
    setSaving(true);
    const response = await updateNotificationSettingsAPI(settings, token);
    if (response) {
      // Settings saved successfully
    }
    setSaving(false);
  };

  const updateEmailNotification = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      emailNotifications: {
        ...prev.emailNotifications,
        [key]: value
      }
    }));
  };

  const updateInAppNotification = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      inAppNotifications: {
        ...prev.inAppNotifications,
        [key]: value
      }
    }));
  };

  const updateQuietHours = (key: string, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Configure how and when you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Email Notifications</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="email-appt" 
                  checked={settings.emailNotifications.appointments}
                  onCheckedChange={(checked) => updateEmailNotification('appointments', checked as boolean)}
                />
                <Label htmlFor="email-appt">Appointment reminders</Label>
              </div>
              {/* <Select defaultValue="24h">
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hour before</SelectItem>
                  <SelectItem value="2h">2 hours before</SelectItem>
                  <SelectItem value="24h">24 hours before</SelectItem>
                  <SelectItem value="48h">48 hours before</SelectItem>
                </SelectContent>
              </Select> */}
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="email-lab" 
                checked={settings.emailNotifications.labResults}
                onCheckedChange={(checked) => updateEmailNotification('labResults', checked as boolean)}
              />
              <Label htmlFor="email-lab">New lab results</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="email-patient" 
                checked={settings.emailNotifications.patientRegistration}
                onCheckedChange={(checked) => updateEmailNotification('patientRegistration', checked as boolean)}
              />
              <Label htmlFor="email-patient">New patient registrations</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="email-msg" 
                checked={settings.emailNotifications.messages}
                onCheckedChange={(checked) => updateEmailNotification('messages', checked as boolean)}
              />
              <Label htmlFor="email-msg">Patient messages</Label>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">In-App Notifications</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="app-appt" 
                checked={settings.inAppNotifications.appointments}
                onCheckedChange={(checked) => updateInAppNotification('appointments', checked as boolean)}
              />
              <Label htmlFor="app-appt">Appointment alerts</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="app-check" 
                checked={settings.inAppNotifications.checkins}
                onCheckedChange={(checked) => updateInAppNotification('checkins', checked as boolean)}
              />
              <Label htmlFor="app-check">Patient check-ins</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="app-lab" 
                checked={settings.inAppNotifications.labResults}
                onCheckedChange={(checked) => updateInAppNotification('labResults', checked as boolean)}
              />
              <Label htmlFor="app-lab">Critical lab results</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="app-rx" 
                checked={settings.inAppNotifications.prescriptions}
                onCheckedChange={(checked) => updateInAppNotification('prescriptions', checked as boolean)}
              />
              <Label htmlFor="app-rx">Prescription refills</Label>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notification Delivery</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="quiet-hours">Quiet Hours</Label>
              <Switch 
                id="quiet-hours" 
                checked={settings.quietHours.enabled}
                onCheckedChange={(checked) => updateQuietHours('enabled', checked)}
              />
            </div>
            {settings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <Select 
                    value={settings.quietHours.startTime} 
                    onValueChange={(value) => updateQuietHours('startTime', value)}
                  >
                    <SelectTrigger id="quiet-start">
                      <SelectValue placeholder="Select time" >{settings.quietHours.startTime}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20:00">8:00 PM</SelectItem>
                      <SelectItem value="21:00">9:00 PM</SelectItem>
                      <SelectItem value="22:00">10:00 PM</SelectItem>
                      <SelectItem value="23:00">11:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end">End Time</Label>
                  <Select 
                    value={settings.quietHours.endTime}
                    onValueChange={(value) => updateQuietHours('endTime', value)}
                  >
                    <SelectTrigger id="quiet-end">
                      <SelectValue placeholder="Select time">{settings.quietHours.endTime}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="06:00">6:00 AM</SelectItem>
                      <SelectItem value="07:00">7:00 AM</SelectItem>
                      <SelectItem value="08:00">8:00 AM</SelectItem>
                      <SelectItem value="09:00">9:00 AM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="ml-auto" 
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Notification Preferences'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default NotificationSettings;
