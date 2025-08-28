import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function PatientInsuranceSection({ data, onChange }: { 
  data: any; 
  onChange: (field: string, value: any) => void 
}) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Patient & Insurance</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        
        {/* Patient demographics */}
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
        <div className="col-span-2">
          <Label>Address</Label>
          <Input 
            value={data.address || ""} 
            onChange={(e) => onChange("address", e.target.value)} 
            placeholder="123 Main St, City, State, ZIP" 
          />
        </div>

        {/* Insurance info */}
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
          <Label>Group Number</Label>
          <Input 
            value={data.insurance?.groupNumber || ""} 
            onChange={(e) => onChange("insurance.groupNumber", e.target.value)} 
          />
        </div>
        <div>
          <Label>Relationship to Subscriber</Label>
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

      </CardContent>
    </Card>
  )
}
