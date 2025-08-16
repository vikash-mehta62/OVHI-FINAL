
import { v4 as uuidv4 } from 'uuid';

// API Configuration
const API_BASE_URL = '/api/v1/rpm';

// Helper function to get auth token
const getAuthToken = () => {
  const token = localStorage.getItem('token');
  return token ? `Bearer ${token}` : '';
};

// Helper function for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthToken(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
};

export interface RPMDevice {
  id: string;
  patientId: string;
  deviceType: 'blood_pressure' | 'glucometer' | 'scale' | 'pulse_oximeter' | 'thermometer' | 'ecg';
  deviceModel: string;
  serialNumber: string;
  status: 'active' | 'inactive' | 'maintenance' | 'battery_low';
  lastSyncTime: Date;
  batteryLevel?: number;
  firmwareVersion?: string;
}

export interface RPMReading {
  id: string;
  patientId: string;
  deviceId: string;
  deviceType: RPMDevice['deviceType'];
  timestamp: Date;
  values: {
    [key: string]: number | string;
  };
  isAnomaly: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  validated: boolean;
}

export interface RPMAlert {
  id: string;
  patientId: string;
  alertType: 'threshold_exceeded' | 'device_offline' | 'missed_reading' | 'anomaly_detected' | 'battery_low';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface RPMMonitoringPlan {
  id: string;
  patientId: string;
  condition: string;
  devices: string[];
  thresholds: {
    [deviceType: string]: {
      [parameter: string]: {
        min?: number;
        max?: number;
        target?: number;
      };
    };
  };
  frequency: {
    [deviceType: string]: {
      required: number; // readings per day
      window: string; // time window (e.g., "daily", "weekly")
    };
  };
  active: boolean;
  startDate: Date;
  endDate?: Date;
}

export interface RPMTimeEntry {
  id: string;
  patientId: string;
  providerId: string;
  activityType: 'device_setup' | 'data_review' | 'patient_education' | 'clinical_assessment' | 'care_coordination';
  description: string;
  startTime: Date;
  endTime: Date | null;
  duration: number; // minutes
  automated: boolean;
  billable: boolean;
  cptCode?: string;
}

export interface RPMAnalytics {
  patientId: string;
  period: string;
  adherence: {
    overall: number;
    byDevice: { [deviceType: string]: number };
  };
  trends: {
    [parameter: string]: {
      direction: 'improving' | 'stable' | 'declining';
      change: number;
      significance: 'none' | 'minor' | 'moderate' | 'significant';
    };
  };
  riskScore: number;
  recommendations: string[];
}

class RPMService {
  // Device Management
  async registerDevice(device: Omit<RPMDevice, 'id'>): Promise<string> {
    try {
      const response = await apiCall('/devices', {
        method: 'POST',
        body: JSON.stringify({
          patientId: device.patientId,
          deviceType: device.deviceType,
          deviceModel: device.deviceModel,
          serialNumber: device.serialNumber
        })
      });

      return response.data.deviceId;
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  }

  async getPatientDevices(patientId: string): Promise<RPMDevice[]> {
    try {
      const response = await apiCall(`/devices?patientId=${patientId}`);
      
      return response.data.devices.map((device: any) => ({
        id: device.id,
        patientId: device.patientId,
        deviceType: device.deviceType,
        deviceModel: device.deviceModel,
        serialNumber: device.serialNumber,
        status: device.status,
        lastSyncTime: new Date(device.lastReading || device.createdAt),
        batteryLevel: 85, // Mock battery level for now
        firmwareVersion: '1.0.0' // Mock firmware version
      }));
    } catch (error) {
      console.error('Error fetching patient devices:', error);
      return [];
    }
  }

  async getDashboardData(): Promise<any> {
    try {
      const response = await apiCall('/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  async updateDeviceStatus(patientId: string, deviceId: string, status: RPMDevice['status']): Promise<void> {
    // This would be implemented when device management APIs are expanded
    console.log('Device status update not yet implemented in backend');
  }

  // Data Processing
  async processReading(patientId: string, deviceId: string, rawData: any): Promise<string> {
    try {
      const normalizedValues = this.normalizeReadingValues(rawData.deviceType, rawData);
      
      const response = await apiCall('/readings', {
        method: 'POST',
        body: JSON.stringify({
          deviceId,
          patientId,
          readingType: rawData.deviceType,
          value: normalizedValues.primaryValue || Object.values(normalizedValues)[0],
          unit: normalizedValues.unit || '',
          readingTimestamp: new Date().toISOString(),
          notes: rawData.notes || ''
        })
      });

      return response.data.readingId;
    } catch (error) {
      console.error('Error processing reading:', error);
      throw error;
    }
  }

  async getPatientReadings(patientId: string, deviceType?: string): Promise<RPMReading[]> {
    try {
      let endpoint = `/readings?patientId=${patientId}&limit=50`;
      if (deviceType) {
        endpoint += `&deviceType=${deviceType}`;
      }

      const response = await apiCall(endpoint);
      
      return response.data.readings.map((reading: any) => ({
        id: reading.id,
        patientId: reading.patientId,
        deviceId: reading.deviceId || '',
        deviceType: reading.deviceType,
        timestamp: new Date(reading.timestamp),
        values: this.parseReadingValues(reading.readingType, reading.value, reading.unit),
        isAlert: reading.isAlert,
        riskLevel: this.determineRiskLevel(reading.isAlert),
        validated: true
      }));
    } catch (error) {
      console.error('Error fetching patient readings:', error);
      return [];
    }
  }

  private parseReadingValues(readingType: string, value: number, unit: string): { [key: string]: number | string } {
    switch (readingType) {
      case 'blood_pressure_systolic':
        return { systolic: value, unit: 'mmHg' };
      case 'blood_pressure_diastolic':
        return { diastolic: value, unit: 'mmHg' };
      case 'heart_rate':
        return { heartRate: value, unit: 'bpm' };
      case 'blood_glucose':
        return { glucose: value, unit: unit || 'mg/dL' };
      case 'weight':
        return { weight: value, unit: unit || 'lbs' };
      case 'oxygen_saturation':
        return { spo2: value, unit: '%' };
      default:
        return { [readingType]: value, unit };
    }
  }

  private determineRiskLevel(isAlert: boolean): RPMReading['riskLevel'] {
    return isAlert ? 'high' : 'low';
  }

  private normalizeReadingValues(deviceType: RPMDevice['deviceType'], rawData: any): { [key: string]: number | string } {
    switch (deviceType) {
      case 'blood_pressure':
        return {
          systolic: rawData.systolic || 0,
          diastolic: rawData.diastolic || 0,
          pulse: rawData.pulse || 0
        };
      case 'glucometer':
        return {
          glucose: rawData.glucose || 0,
          unit: rawData.unit || 'mg/dL'
        };
      case 'scale':
        return {
          weight: rawData.weight || 0,
          unit: rawData.unit || 'lbs',
          bmi: rawData.bmi || 0
        };
      case 'pulse_oximeter':
        return {
          spo2: rawData.spo2 || 0,
          heartRate: rawData.heartRate || 0
        };
      case 'thermometer':
        return {
          temperature: rawData.temperature || 0,
          unit: rawData.unit || 'F'
        };
      default:
        return rawData;
    }
  }

  private detectAnomaly(reading: RPMReading): boolean {
    const patientReadings = this.readings.get(reading.patientId) || [];
    const recentReadings = patientReadings
      .filter(r => r.deviceType === reading.deviceType)
      .slice(-10);

    if (recentReadings.length < 3) return false;

    // Simple statistical anomaly detection
    for (const [key, value] of Object.entries(reading.values)) {
      if (typeof value === 'number') {
        const values = recentReadings.map(r => r.values[key] as number).filter(v => !isNaN(v));
        if (values.length > 0) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
          
          // Flag as anomaly if more than 2 standard deviations from mean
          if (Math.abs(value - mean) > 2 * std) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private calculateRiskLevel(reading: RPMReading): RPMReading['riskLevel'] {
    const plan = this.monitoringPlans.get(reading.patientId);
    if (!plan) return 'low';

    const thresholds = plan.thresholds[reading.deviceType];
    if (!thresholds) return 'low';

    let riskLevel: RPMReading['riskLevel'] = 'low';

    for (const [param, value] of Object.entries(reading.values)) {
      if (typeof value === 'number' && thresholds[param]) {
        const threshold = thresholds[param];
        
        if (threshold.max && value > threshold.max * 1.2) {
          riskLevel = 'critical';
        } else if (threshold.min && value < threshold.min * 0.8) {
          riskLevel = 'critical';
        } else if ((threshold.max && value > threshold.max) || (threshold.min && value < threshold.min)) {
          riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
        } else if (threshold.target) {
          const deviation = Math.abs(value - threshold.target) / threshold.target;
          if (deviation > 0.15) {
            riskLevel = riskLevel === 'critical' || riskLevel === 'high' ? riskLevel : 'medium';
          }
        }
      }
    }

    return riskLevel;
  }

  private checkThresholds(patientId: string, reading: RPMReading): void {
    if (reading.riskLevel === 'high' || reading.riskLevel === 'critical') {
      this.createAlert(
        patientId,
        'threshold_exceeded',
        reading.riskLevel === 'critical' ? 'critical' : 'high',
        `${reading.deviceType} reading outside normal range: ${JSON.stringify(reading.values)}`
      );
    }

    if (reading.isAnomaly) {
      this.createAlert(
        patientId,
        'anomaly_detected',
        'medium',
        `Unusual ${reading.deviceType} reading detected`
      );
    }
  }

  // Alert Management
  async createAlert(patientId: string, alertType: RPMAlert['alertType'], severity: RPMAlert['severity'], message: string): Promise<string> {
    // This would be implemented when alert creation APIs are expanded
    console.log('Alert creation not yet implemented in backend');
    return uuidv4();
  }

  async getPatientAlerts(patientId: string, activeOnly: boolean = false): Promise<RPMAlert[]> {
    try {
      let endpoint = `/alerts?status=${activeOnly ? 'active' : 'all'}`;
      
      const response = await apiCall(endpoint);
      
      return response.data.alerts
        .filter((alert: any) => alert.patientId === patientId)
        .map((alert: any) => ({
          id: alert.id,
          patientId: alert.patientId,
          alertType: alert.alertType,
          severity: alert.severity,
          message: alert.message,
          timestamp: new Date(alert.createdAt),
          acknowledged: alert.status === 'acknowledged',
          acknowledgedBy: alert.acknowledgedBy,
          acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
          resolved: alert.status === 'resolved',
          resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined
        }));
    } catch (error) {
      console.error('Error fetching patient alerts:', error);
      return [];
    }
  }

  async acknowledgeAlert(patientId: string, alertId: string, providerId: string): Promise<boolean> {
    try {
      // This would be implemented when alert management APIs are expanded
      console.log('Alert acknowledgment not yet implemented in backend');
      return true;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return false;
    }
  }

  // Monitoring Plans
  createMonitoringPlan(plan: Omit<RPMMonitoringPlan, 'id'>): string {
    const planId = uuidv4();
    const newPlan: RPMMonitoringPlan = {
      ...plan,
      id: planId
    };

    this.monitoringPlans.set(plan.patientId, newPlan);
    return planId;
  }

  getMonitoringPlan(patientId: string): RPMMonitoringPlan | null {
    return this.monitoringPlans.get(patientId) || null;
  }

  // Time Tracking
  startTimeTracking(patientId: string, providerId: string, activityType: RPMTimeEntry['activityType'], description: string, automated: boolean = false): string {
    const entryId = uuidv4();
    const timeEntry: RPMTimeEntry = {
      id: entryId,
      patientId,
      providerId,
      activityType,
      description,
      startTime: new Date(),
      endTime: null,
      duration: 0,
      automated,
      billable: true,
      cptCode: this.determineCPTCode(activityType)
    };

    const patientEntries = this.timeEntries.get(patientId) || [];
    patientEntries.push(timeEntry);
    this.timeEntries.set(patientId, patientEntries);

    return entryId;
  }

  stopTimeTracking(patientId: string, entryId: string): RPMTimeEntry | null {
    const entries = this.timeEntries.get(patientId) || [];
    const entryIndex = entries.findIndex(e => e.id === entryId);
    
    if (entryIndex !== -1 && !entries[entryIndex].endTime) {
      entries[entryIndex].endTime = new Date();
      entries[entryIndex].duration = Math.round(
        (entries[entryIndex].endTime!.getTime() - entries[entryIndex].startTime.getTime()) / 60000
      );
      this.timeEntries.set(patientId, entries);
      return entries[entryIndex];
    }
    
    return null;
  }

  private determineCPTCode(activityType: RPMTimeEntry['activityType']): string {
    const cptCodes = {
      'device_setup': '99453',
      'data_review': '99457',
      'patient_education': '99458',
      'clinical_assessment': '99457',
      'care_coordination': '99490'
    };
    return cptCodes[activityType] || '99457';
  }

  // Analytics
  async generateAnalytics(patientId: string, period: string = 'month'): Promise<RPMAnalytics> {
    try {
      const readings = await this.getPatientReadings(patientId);
      const devices = await this.getPatientDevices(patientId);
      
      // Calculate adherence
      const adherence = this.calculateAdherence(readings, devices, period);
      
      // Analyze trends
      const trends = this.analyzeTrends(readings, period);
      
      // Calculate risk score
      const riskScore = this.calculateOverallRisk(readings);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(patientId, adherence, trends, riskScore);

      const analytics: RPMAnalytics = {
        patientId,
        period,
        adherence,
        trends,
        riskScore,
        recommendations
      };

      return analytics;
    } catch (error) {
      console.error('Error generating analytics:', error);
      // Return default analytics on error
      return {
        patientId,
        period,
        adherence: { overall: 0, byDevice: {} },
        trends: {},
        riskScore: 0,
        recommendations: []
      };
    }
  }

  private calculateAdherence(readings: RPMReading[], devices: RPMDevice[], period: string): RPMAnalytics['adherence'] {
    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - 1); // Last month

    const recentReadings = readings.filter(r => r.timestamp >= periodStart);
    
    const adherence = { overall: 0, byDevice: {} as { [deviceType: string]: number } };
    
    // Group devices by type
    const devicesByType = devices.reduce((acc, device) => {
      if (!acc[device.deviceType]) acc[device.deviceType] = [];
      acc[device.deviceType].push(device);
      return acc;
    }, {} as { [key: string]: RPMDevice[] });

    // Calculate adherence for each device type
    Object.keys(devicesByType).forEach(deviceType => {
      const deviceReadings = recentReadings.filter(r => r.deviceType === deviceType);
      const expectedReadings = 30; // Assuming daily readings expected
      const actualReadings = deviceReadings.length;
      
      adherence.byDevice[deviceType] = Math.min(actualReadings / expectedReadings, 1) * 100;
    });

    adherence.overall = Object.values(adherence.byDevice).reduce((a, b) => a + b, 0) / Object.keys(adherence.byDevice).length || 0;
    
    return adherence;
  }

  private analyzeTrends(readings: RPMReading[], period: string): RPMAnalytics['trends'] {
    const trends: RPMAnalytics['trends'] = {};
    
    // Group readings by parameter
    const parameterData: { [param: string]: number[] } = {};
    
    readings.forEach(reading => {
      Object.entries(reading.values).forEach(([param, value]) => {
        if (typeof value === 'number') {
          if (!parameterData[param]) parameterData[param] = [];
          parameterData[param].push(value);
        }
      });
    });

    // Analyze each parameter
    Object.entries(parameterData).forEach(([param, values]) => {
      if (values.length >= 3) {
        const recent = values.slice(-5);
        const older = values.slice(-10, -5);
        
        if (older.length > 0) {
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
          const change = ((recentAvg - olderAvg) / olderAvg) * 100;
          
          trends[param] = {
            direction: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
            change: Math.abs(change),
            significance: Math.abs(change) > 20 ? 'significant' : Math.abs(change) > 10 ? 'moderate' : Math.abs(change) > 5 ? 'minor' : 'none'
          };
        }
      }
    });

    return trends;
  }

  private calculateOverallRisk(readings: RPMReading[]): number {
    if (readings.length === 0) return 0;

    const recentReadings = readings.slice(-20);
    let riskSum = 0;

    recentReadings.forEach(reading => {
      switch (reading.riskLevel) {
        case 'critical': riskSum += 4; break;
        case 'high': riskSum += 3; break;
        case 'medium': riskSum += 2; break;
        case 'low': riskSum += 1; break;
      }
    });

    return Math.round((riskSum / (recentReadings.length * 4)) * 100);
  }

  private generateRecommendations(patientId: string, adherence: RPMAnalytics['adherence'], trends: RPMAnalytics['trends'], riskScore: number): string[] {
    const recommendations: string[] = [];

    // Adherence recommendations
    if (adherence.overall < 80) {
      recommendations.push('Improve device usage adherence with patient education and reminders');
    }

    // Risk-based recommendations
    if (riskScore > 70) {
      recommendations.push('Schedule urgent clinical review due to high risk indicators');
    } else if (riskScore > 50) {
      recommendations.push('Consider adjusting monitoring frequency or intervention protocols');
    }

    // Trend-based recommendations
    Object.entries(trends).forEach(([param, trend]) => {
      if (trend.significance === 'significant' && trend.direction === 'declining') {
        recommendations.push(`Address declining trend in ${param} - consider intervention adjustment`);
      }
    });

    // Device-specific recommendations
    Object.entries(adherence.byDevice).forEach(([deviceType, adherenceRate]) => {
      if (adherenceRate < 70) {
        recommendations.push(`Improve ${deviceType} usage - current adherence: ${Math.round(adherenceRate)}%`);
      }
    });

    return recommendations;
  }

  // Utility methods
  getPatientReadings(patientId: string, deviceType?: string): RPMReading[] {
    const readings = this.readings.get(patientId) || [];
    return deviceType ? readings.filter(r => r.deviceType === deviceType) : readings;
  }

  getTimeEntries(patientId: string): RPMTimeEntry[] {
    return this.timeEntries.get(patientId) || [];
  }

  getTotalBillableTime(patientId: string, period: string = 'month'): number {
    const entries = this.getTimeEntries(patientId);
    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - 1);

    return entries
      .filter(e => e.billable && e.endTime && e.startTime >= periodStart)
      .reduce((total, entry) => total + entry.duration, 0);
  }
}

export const rpmService = new RPMService();
