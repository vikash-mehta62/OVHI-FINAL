import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import {
  getAllEncounterApi,
  deleteEncounterApi,
} from "@/services/operations/encounter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import CreateEncounter from "./CreateEncountert";
import EditEncounter from "./EditEncounter";

// Interface for Encounter data
interface EncounterData {
  _id: string;
  patient_id: any;
  provider_id: string;
  template_id: string;
  templateId?: {
    template_id: number;
    template_name: string;
  };
  encounter_id: any;
  encounter_type: string;
  reason_for_visit: string;
  notes: string;
  procedure_codes: string;
  diagnosis_codes: string;
  follow_up_plan: string;
  status: "pending" | "completed" | "cancelled";
  created: string;
  updated: string;
  updatedAt: string;
}

const EncounterTable = () => {
  const { token } = useSelector((state: RootState) => state.auth);
  const [encounters, setEncounters] = useState<EncounterData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEncounter, setSelectedEncounter] = useState<EncounterData | null>(
    null
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Fetch encounters
  const fetchEncounters = async () => {
    setIsLoading(true);
    try {
      const response = await getAllEncounterApi(token);
      console.log(response, "en");
      if (response?.success) {
        setEncounters(response.data || []);
      } else {
      }
    } catch (error) {
      console.error("Error fetching encounters:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    console.log(id, "eid");
    await deleteEncounterApi(id, token);
    fetchEncounters();
  };

  useEffect(() => {
    if (token) {
      fetchEncounters();
    }
  }, [token]);

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Handle edit
  const handleEdit = (encounter: EncounterData) => {
    setSelectedEncounter(encounter);
    setIsEditOpen(true);
  };

  // Handle successful operations (for real-time updates)
  const handleOperationSuccess = () => {
    fetchEncounters(); // Refresh the table
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-full p-6 space-y-6">
      <div>
             
              <CreateEncounter onSuccess={handleOperationSuccess} />

      </div>

      {/* Edit Dialog */}
       {selectedEncounter && (
        <EditEncounter
          encounter={selectedEncounter}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSuccess={handleOperationSuccess}
        />
      )}
    </div>
  );
};

export default EncounterTable;
