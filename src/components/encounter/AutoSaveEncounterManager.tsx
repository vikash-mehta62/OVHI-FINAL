import React, { useEffect, useState, useCallback } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Save, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface EncounterData {
  id?: string;
  patientId: string;
  providerId: string;
  appointmentId?: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnoses: any[];
  procedures: any[];
  vitals?: any;
  status: 'draft' | 'in-progress' | 'completed';
  lastSaved?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AutoSaveEncounterManagerProps {
  patientId: string;
  providerId: string;
  appointmentId?: string;
  encounterData: EncounterData;
  onDataChange: (data: EncounterData) => void;
  children: React.ReactNode;
}

const AutoSaveEncounterManager: React.FC<AutoSaveEncounterManagerProps> = ({
  patientId,
  providerId,
  appointmentId,
  encounterData,
  onDataChange,
  children
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-save function
  const saveEncounter = useCallback(async (encounterToSave: EncounterData) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Add metadata
      const now = new Date();
      encounterToSave = {
        ...encounterToSave,
        id: encounterToSave.id || `encounter-${Date.now()}`,
        patientId,
        providerId,
        appointmentId,
        lastSaved: now,
        updatedAt: now,
        createdAt: encounterToSave.createdAt || now
      };

      // Save to localStorage first (offline capability)
      const localStorageKey = `encounter-${encounterToSave.id}`;
      localStorage.setItem(localStorageKey, JSON.stringify(encounterToSave));

      // Try to sync with backend if online
      if (isOnline) {
        try {
          // Simulate API call - replace with actual API endpoint
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log('Encounter saved to backend:', encounterToSave);
        } catch (apiError) {
          console.warn('Failed to sync with backend, saved locally:', apiError);
        }
      }

      setLastSaved(now);
      setHasUnsavedChanges(false);
      
      // Update parent component
      onDataChange(encounterToSave);

    } catch (error) {
      console.error('Error saving encounter:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save encounter');
      toast.error('Failed to save encounter');
    } finally {
      setIsSaving(false);
    }
  }, [patientId, providerId, appointmentId, isOnline, onDataChange]);

  // Auto-save effect
  useEffect(() => {
    // Check if there are meaningful changes
    const hasContent = 
      encounterData.subjective.trim() ||
      encounterData.objective.trim() ||
      encounterData.assessment.trim() ||
      encounterData.plan.trim() ||
      encounterData.diagnoses.length > 0 ||
      encounterData.procedures.length > 0;

    if (hasContent) {
      setHasUnsavedChanges(true);
      
      // Debounce auto-save
      const autoSaveTimer = setTimeout(() => {
        saveEncounter(encounterData);
      }, 3000); // Save after 3 seconds of inactivity

      return () => clearTimeout(autoSaveTimer);
    }
  }, [encounterData, saveEncounter]);

  // Manual save function
  const handleManualSave = useCallback(() => {
    saveEncounter(encounterData);
  }, [encounterData, saveEncounter]);

  // Load saved encounter on mount
  useEffect(() => {
    const loadSavedEncounter = () => {
      const savedEncounters = Object.keys(localStorage)
        .filter(key => key.startsWith('encounter-'))
        .map(key => {
          try {
            return JSON.parse(localStorage.getItem(key) || '{}');
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .filter(encounter => 
          encounter.patientId === patientId && 
          encounter.status !== 'completed'
        );

      if (savedEncounters.length > 0) {
        // Load the most recent draft
        const mostRecent = savedEncounters.sort((a, b) => 
          new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
        )[0];
        
        setLastSaved(new Date(mostRecent.lastSaved));
        onDataChange(mostRecent);
        toast.info('Loaded previous draft');
      }
    };

    loadSavedEncounter();
  }, [patientId, onDataChange]);

  // Format last saved time
  const formatLastSaved = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Auto-save Status Bar */}
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-4">
          {/* Online Status */}
          <div className="flex items-center gap-1">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            <span className="text-xs text-muted-foreground">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Save Status */}
          <div className="flex items-center gap-2">
            {isSaving ? (
              <Badge variant="secondary" className="text-xs">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-1"></div>
                Saving...
              </Badge>
            ) : hasUnsavedChanges ? (
              <Badge variant="outline" className="text-xs">
                <div className="w-2 h-2 bg-yellow-600 rounded-full mr-1"></div>
                Unsaved changes
              </Badge>
            ) : (
              <Badge variant="default" className="text-xs">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
                Saved
              </Badge>
            )}
            
            <span className="text-xs text-muted-foreground">
              Last saved: {formatLastSaved(lastSaved)}
            </span>
          </div>

          {/* Error Status */}
          {saveError && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">Save failed</span>
            </div>
          )}
        </div>

        {/* Manual Save Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualSave}
          disabled={isSaving}
          className="text-xs"
        >
          <Save className="w-3 h-3 mr-1" />
          {isSaving ? 'Saving...' : 'Save Now'}
        </Button>
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              You're offline. Changes are being saved locally and will sync when you're back online.
            </span>
          </div>
        </div>
      )}

      {/* Save Error */}
      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-800">
              Save error: {saveError}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSave}
              className="ml-auto text-xs"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {children}
    </div>
  );
};

export default AutoSaveEncounterManager;