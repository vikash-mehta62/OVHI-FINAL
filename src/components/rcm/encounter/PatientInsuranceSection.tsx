import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import React from "react"

export function PatientInsuranceSection({
  data,
  onChange,
}: {
  data: any;
  onChange: (field: string, value: any) => void;
}) {
  const [hasSecondary, setHasSecondary] = React.useState(Boolean(data.secondaryInsurance?.payerId));

  const handleSecondaryToggle = (checked: boolean) => {
    setHasSecondary(checked);
    if (!checked) {
      onChange("secondaryInsurance", {}); // clear all secondary data
    } else {
      onChange("secondaryInsurance", { relationship: "self" }); // initialize
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Patient & Insurance</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {/* Patient identity (CMS-1500 Box 2, 3, 5) */}
        <div>
          <Label>Patient Name</Label>
          <Input
            value={data.patientName || ""}
            onChange={(e) => onChange("patientName", e.target.value)}
            placeholder="First Last"
          />
        </div>
        <div>
          <Label>Patient ID (MRN)</Label>
          <Input
            value={data.patientId || ""}
            onChange={(e) => onChange("patientId", e.target.value)}
            placeholder="Internal ID"
          />
        </div>

        <div>
          <Label>Date of Birth</Label>
          <Input
            type="date"
            value={data.dob || ""}
            onChange={(e) => onChange("dob", e.target.value)}
          />
        </div>
        <div>
          <Label>Sex</Label>
          <Select value={data.sex || ""} onValueChange={(val) => onChange("sex", val)}>
            <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Male</SelectItem>
              <SelectItem value="F">Female</SelectItem>
              <SelectItem value="U">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Phone</Label>
          <Input
            value={data.patientPhone || ""}
            onChange={(e) => onChange("patientPhone", e.target.value)}
            placeholder="(555) 555-5555"
          />
        </div>
        <div className="col-span-2">
          <Label>Address</Label>
          <Input
            value={data.address || ""}
            onChange={(e) => onChange("address", e.target.value)}
            placeholder="123 Main St, City, State, ZIP"
          />
        </div>

        {/* Insurance type indicator (CMS-1500 Box 1) */}
        <div>
          <Label>Insurance Type</Label>
          <Select
            value={data.insurance?.type || ""}
            onValueChange={(val) => onChange("insurance.type", val)}
          >
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Medicare">Medicare</SelectItem>
              <SelectItem value="Medicaid">Medicaid</SelectItem>
              <SelectItem value="Tricare">Tricare</SelectItem>
              <SelectItem value="CHAMPVA">CHAMPVA</SelectItem>
              <SelectItem value="Group">Group Health Plan</SelectItem>
              <SelectItem value="FECA">FECA</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Primary Insurance (Boxes 1a, 11, 11c, 11a, 6) */}
        <div>
          <Label>Payer ID</Label>
          <Input
            value={data.insurance?.payerId || ""}
            onChange={(e) => onChange("insurance.payerId", e.target.value)}
          />
        </div>
        <div>
          <Label>Subscriber ID</Label>
          <Input
            value={data.insurance?.subscriberId || ""}
            onChange={(e) => onChange("insurance.subscriberId", e.target.value)}
          />
        </div>
        <div>
          <Label>Group Number (Box 11)</Label>
          <Input
            value={data.insurance?.groupNumber || ""}
            onChange={(e) => onChange("insurance.groupNumber", e.target.value)}
          />
        </div>
        <div>
          <Label>Plan Name (Box 11c)</Label>
          <Input
            value={data.insurance?.planName || ""}
            onChange={(e) => onChange("insurance.planName", e.target.value)}
          />
        </div>
        <div>
          <Label>Relationship to Subscriber (Box 6)</Label>
          <Select
            value={data.insurance?.relationship || ""}
            onValueChange={(val) => onChange("insurance.relationship", val)}
          >
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="self">Self</SelectItem>
              <SelectItem value="spouse">Spouse</SelectItem>
              <SelectItem value="child">Child</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Subscriber demographics (Box 11a) */}
        {data.insurance?.relationship !== "self" && (
          <>
            <div>
              <Label>Subscriber DOB (Box 11a)</Label>
              <Input
                type="date"
                value={data.insurance?.subscriberDob || ""}
                onChange={(e) => onChange("insurance.subscriberDob", e.target.value)}
              />
            </div>
            <div>
              <Label>Subscriber Sex (Box 11a)</Label>
              <Select
                value={data.insurance?.subscriberSex || ""}
                onValueChange={(val) => onChange("insurance.subscriberSex", val)}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="U">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Secondary Insurance (Boxes 9–9d) */}
        <div className="col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasSecondary}
            onChange={(e) => handleSecondaryToggle(e.target.checked)}
          />
          <Label>Has Secondary Insurance</Label>
        </div>

        {hasSecondary && (
          <>
            <div>
              <Label>Secondary Payer ID (Box 9d)</Label>
              <Input
                value={data.secondaryInsurance?.payerId || ""}
                onChange={(e) => onChange("secondaryInsurance.payerId", e.target.value)}
              />
            </div>
            <div>
              <Label>Secondary Subscriber ID (Box 9a)</Label>
              <Input
                value={data.secondaryInsurance?.subscriberId || ""}
                onChange={(e) => onChange("secondaryInsurance.subscriberId", e.target.value)}
              />
            </div>
            <div>
              <Label>Secondary Group # (Box 9a/9d)</Label>
              <Input
                value={data.secondaryInsurance?.groupNumber || ""}
                onChange={(e) => onChange("secondaryInsurance.groupNumber", e.target.value)}
              />
            </div>
            <div>
              <Label>Secondary Plan Name</Label>
              <Input
                value={data.secondaryInsurance?.planName || ""}
                onChange={(e) => onChange("secondaryInsurance.planName", e.target.value)}
              />
            </div>
            <div>
              <Label>Relationship</Label>
              <Select
                value={data.secondaryInsurance?.relationship || "self"}
                onValueChange={(val) => onChange("secondaryInsurance.relationship", val)}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
