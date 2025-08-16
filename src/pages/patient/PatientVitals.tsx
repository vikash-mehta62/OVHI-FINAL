
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, Activity, Thermometer, Weight, Ruler, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { formatDate } from '@/utils/formatHelpers';
import { toast } from '@/components/ui/use-toast';

interface VitalSigns {
  id: string;
  measurementDate: string;
  bloodPressure: {
    systolic: number;
    diastolic: number;
    normal: boolean;
  };
  heartRate: {
    value: number;
    normal: boolean;
  };
  temperature: {
    value: number;
    normal: boolean;
  };
  weight: number;
  height: number;
  oxygenSaturation?: {
    value: number;
    normal: boolean;
  };
  bmi?: {
    value: number;
    category: string;
  };
  recordedBy: string;
  createdAt: string;
}

interface VitalsSummary {
  latest: any;
  trends: any;
  totalReadings: number;
}

const PatientVitals: React.FC = () => {
  const { user, token } = useSelector((state: RootState) => state.auth);
  const [vitals, setVitals] = useState<VitalSigns[]>([]);
  const [summary, setSummary] = useState<VitalsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [addVitalsDialog, setAddVitalsDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newVitals, setNewVitals] = useState({
    measurementDate: new Date().toISOString().split('T')[0],
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    weight: '',
    height: '',
    oxygenSaturation: ''
  });

  useEffect(() => {
    if (user?.id && token) {
      fetchVitals();
    }
  }, [user, token]);

  const fetchVitals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/patients/${user?.id}/vitals?limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVitals(data.data.vitals || []);
        setSummary(data.data.summary);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch vitals",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching vitals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch vitals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addVitals = async () => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/v1/patients/${user?.id}/vitals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          measurementDate: newVitals.measurementDate,
          bloodPressureSystolic: newVitals.bloodPressureSystolic ? parseInt(newVitals.bloodPressureSystolic) : undefined,
          bloodPressureDiastolic: newVitals.bloodPressureDiastolic ? parseInt(newVitals.bloodPressureDiastolic) : undefined,
          heartRate: newVitals.heartRate ? parseInt(newVitals.heartRate) : undefined,
          temperature: newVitals.temperature ? parseFloat(newVitals.temperature) : undefined,
          weight: newVitals.weight ? parseFloat(newVitals.weight) : undefined,
          height: newVitals.height ? parseFloat(newVitals.height) : undefined,
          oxygenSaturation: newVitals.oxygenSaturation ? parseInt(newVitals.oxygenSaturation) : undefined
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Vitals recorded successfully"
        });
        setAddVitalsDialog(false);
        setNewVitals({
          measurementDate: new Date().toISOString().split('T')[0],
          bloodPressureSystolic: '',
          bloodPressureDiastolic: '',
          heartRate: '',
          temperature: '',
          weight: '',
          height: '',
          oxygenSaturation: ''
        });
        fetchVitals();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to record vitals",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding vitals:', error);
      toast({
        title: "Error",
        description: "Failed to record vitals",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (normal: boolean | null) => {
    if (normal === null) return null;
    return (
      <Badge variant={normal ? "default" : "destructive"}>
        {normal ? "Normal" : "Abnormal"}
      </Badge>
    );
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!user) {
    return <div className="text-center py-8">Please log in to view vitals</div>;
  }

  const latestVitals = vitals.length > 0 ? vitals[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Vital Signs</h1>
        <Dialog open={addVitalsDialog} onOpenChange={setAddVitalsDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Vitals
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record New Vital Signs</DialogTitle>
              <DialogDescription>
                Enter your vital signs measurements. All fields are optional.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="measurementDate">Measurement Date</Label>
                <Input
                  id="measurementDate"
                  type="date"
                  value={newVitals.measurementDate}
                  onChange={(e) => setNewVitals({ ...newVitals, measurementDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                <Input
                  id="heartRate"
                  type="number"
                  placeholder="72"
                  value={newVitals.heartRate}
                  onChange={(e) => setNewVitals({ ...newVitals, heartRate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="systolic">Blood Pressure - Systolic</Label>
                <Input
                  id="systolic"
                  type="number"
                  placeholder="120"
                  value={newVitals.bloodPressureSystolic}
                  onChange={(e) => setNewVitals({ ...newVitals, bloodPressureSystolic: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="diastolic">Blood Pressure - Diastolic</Label>
                <Input
                  id="diastolic"
                  type="number"
                  placeholder="80"
                  value={newVitals.bloodPressureDiastolic}
                  onChange={(e) => setNewVitals({ ...newVitals, bloodPressureDiastolic: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="temperature">Temperature (°F)</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  value={newVitals.temperature}
                  onChange={(e) => setNewVitals({ ...newVitals, temperature: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="oxygenSaturation">Oxygen Saturation (%)</Label>
                <Input
                  id="oxygenSaturation"
                  type="number"
                  placeholder="98"
                  value={newVitals.oxygenSaturation}
                  onChange={(e) => setNewVitals({ ...newVitals, oxygenSaturation: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="150"
                  value={newVitals.weight}
                  onChange={(e) => setNewVitals({ ...newVitals, weight: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="170"
                  value={newVitals.height}
                  onChange={(e) => setNewVitals({ ...newVitals, height: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setAddVitalsDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addVitals} disabled={submitting}>
                {submitting ? 'Recording...' : 'Record Vitals'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Vitals */}
      {latestVitals && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blood Pressure</CardTitle>
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                {summary?.trends?.bloodPressure && getTrendIcon(summary.trends.bloodPressure)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestVitals.bloodPressure.systolic}/{latestVitals.bloodPressure.diastolic}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">mmHg</p>
                {getStatusBadge(latestVitals.bloodPressure.normal)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Heart Rate</CardTitle>
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                {summary?.trends?.heartRate && getTrendIcon(summary.trends.heartRate)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestVitals.heartRate.value}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">bpm</p>
                {getStatusBadge(latestVitals.heartRate.normal)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temperature</CardTitle>
              <Thermometer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestVitals.temperature.value}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">°F</p>
                {getStatusBadge(latestVitals.temperature.normal)}
              </div>
            </CardContent>
          </Card>

          {latestVitals.weight && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weight</CardTitle>
                <div className="flex items-center space-x-2">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  {summary?.trends?.weight && getTrendIcon(summary.trends.weight)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{latestVitals.weight}</div>
                <p className="text-xs text-muted-foreground">lbs</p>
              </CardContent>
            </Card>
          )}

          {latestVitals.height && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Height</CardTitle>
                <Ruler className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{latestVitals.height}</div>
                <p className="text-xs text-muted-foreground">cm</p>
              </CardContent>
            </Card>
          )}

          {latestVitals.bmi && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">BMI</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{latestVitals.bmi.value}</div>
                <p className="text-xs text-muted-foreground">{latestVitals.bmi.category}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Vitals History */}
      <Card>
        <CardHeader>
          <CardTitle>Vital Signs History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {vitals.map((vital) => (
                <div key={vital.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold">{formatDate(vital.measurementDate)}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">Recorded by {vital.recordedBy}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Blood Pressure</p>
                      <p className="font-medium">
                        {vital.bloodPressure.systolic}/{vital.bloodPressure.diastolic} mmHg
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Heart Rate</p>
                      <p className="font-medium">{vital.heartRate.value} bpm</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Temperature</p>
                      <p className="font-medium">{vital.temperature.value}°F</p>
                    </div>
                    {vital.weight && (
                      <div>
                        <p className="text-muted-foreground">Weight</p>
                        <p className="font-medium">{vital.weight} lbs</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {vitals.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Vital Signs Recorded</h3>
                  <p className="text-gray-500 mb-4">
                    Start tracking your health by recording your first vital signs.
                  </p>
                  <Button onClick={() => setAddVitalsDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Record First Vitals
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientVitals;
