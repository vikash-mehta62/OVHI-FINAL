import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
export function ClaimInfoSection({
    data,
    onChange,
  }: {
    data: any;
    onChange: (field: string, value: any) => void;
  }) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Claim Information (Box 22)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {/* Claim ID */}
          <div>
            <Label>Claim ID</Label>
            <Input
              value={data.resubmissionCode == 1 ? "" : data.claimId || ""}
              onChange={(e) => onChange("claimId", e.target.value)}
              placeholder="Enter Claim ID"
              disabled={data.resubmissionCode == 1}
            />
          </div>
  
          {/* Resubmission Code */}
          <div>
            <Label>Resubmission Code</Label>
            <Select
              value={data.resubmissionCode || ""}
              onValueChange={(val) => onChange("resubmissionCode", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Code" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Select Code</SelectItem>
                <SelectItem value="1">1 – Original Claim</SelectItem>
                <SelectItem value="7">7 – Replacement of Prior Claim</SelectItem>
                <SelectItem value="8">8 – Void/Cancel of Prior Claim</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  }