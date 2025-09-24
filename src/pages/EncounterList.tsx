import { Card, CardContent } from "@/components/ui/card";

interface EncounterListProps {
  encounters: any[];
}

export default function EncounterList({ encounters }: EncounterListProps) {
  return (
    <div className="max-w-6xl mx-auto">
      {encounters.length === 0 ? (
        <p>No encounters found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {encounters.map((enc) => (
            <Card key={enc?.id} className="shadow-md border rounded-lg">
              <CardContent className="p-4 space-y-2">
                {/* Patient Info */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    {enc?.patient?.name} ({enc?.patient?.gender})
                  </h3>
                  <span className="text-sm text-gray-500">
                    {enc?.patient?.birthDate
                      ? new Date(enc.patient.birthDate).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  <strong>Status:</strong> {enc?.patient?.status ?? "N/A"}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Phone:</strong> {enc?.patient?.phone ?? "N/A"}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Email:</strong> {enc?.patient?.email ?? "N/A"}
                </p>

                {/* Encounter Info */}
                <div className="mt-3 border-t pt-2">
                  <p className="text-sm">
                    <strong>Template:</strong> {enc?.template?.name ?? "N/A"} (
                    {enc?.template?.specialty ?? "N/A"})
                  </p>
                  <p className="text-sm">
                    <strong>Duration:</strong> {enc?.duration ?? "N/A"} mins
                  </p>
                  <p className="text-sm">
                    <strong>Completed At:</strong>{" "}
                    {enc?.completedAt
                      ? new Date(enc.completedAt).toLocaleString()
                      : "N/A"}
                  </p>
                </div>

                {/* SOAP Notes */}
                <div className="mt-3 border-t pt-2">
                  <h4 className="font-semibold">SOAP Notes</h4>
                  <p>
                    <strong>Subjective:</strong> {enc?.soapNotes?.subjective ?? "N/A"}
                  </p>
                  <p>
                    <strong>Objective:</strong> {enc?.soapNotes?.objective ?? "N/A"}
                  </p>
                  <p>
                    <strong>Assessment:</strong> {enc?.soapNotes?.assessment ?? "N/A"}
                  </p>
                  <p>
                    <strong>Plan:</strong> {enc?.soapNotes?.plan ?? "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
