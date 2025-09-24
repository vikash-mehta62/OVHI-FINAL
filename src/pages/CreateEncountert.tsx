"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { SmartEncounterWorkflow } from "@/components/encounter/SmartEncounterWorkflow";
import { creteNewEncounterAPI, getAllNewEncounterAPI } from "@/services/operations/encounter";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import EncounterList from "./EncounterList";

export default function EncounterPage() {
  const [encounters, setEncounters] = useState<any[]>([]);
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const { token } = useSelector((state: RootState) => state.auth);

  // ✅ fetch encounters
  const fetchEncounters = async () => {
    try {
      const resp = await getAllNewEncounterAPI(token);
      setEncounters(resp?.data || []);
    } catch (error) {
      console.error("Error fetching encounters:", error);
    }
  };

  useEffect(() => {
    if (token) fetchEncounters();
  }, [token]);

  // ✅ handle new encounter complete
  const handleEncounterComplete = async (encounterData: any) => {
    await creteNewEncounterAPI(encounterData, token);
    setIsWorkflowOpen(false);
    fetchEncounters(); // refresh list
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header + Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold">Encounter Management</h2>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={fetchEncounters}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => setIsWorkflowOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Smart Encounter
          </Button>
        </div>
      </div>

      {/* Smart Workflow Modal */}
      <SmartEncounterWorkflow
        isOpen={isWorkflowOpen}
        onClose={() => setIsWorkflowOpen(false)}
        onEncounterComplete={handleEncounterComplete}
      />

      {/* Encounter List */}
      <EncounterList encounters={encounters} />
    </div>
  );
}
