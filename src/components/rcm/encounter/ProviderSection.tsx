import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ProviderSection({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    onChange("sameAsBilling", checked);

    if (checked) {
      // Auto-fill billing with rendering provider
      onChange("billingProvider.organization", data.renderingProvider?.name || "");
      onChange("billingProvider.tin", data.renderingProvider?.tin || "");
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Provider / Billing Info</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {/* Rendering Provider */}
        <div>
          <Label>Rendering Provider NPI</Label>
          <Input
            value={data.renderingProvider?.npi || ""}
            onChange={(e) => onChange("renderingProvider.npi", e.target.value)}
          />
        </div>
        <div>
          <Label>Rendering Provider TIN</Label>
          <Input
            value={data.renderingProvider?.tin || ""}
            onChange={(e) => onChange("renderingProvider.tin", e.target.value)}
          />
        </div>

        {/* Checkbox */}
        <div className="col-span-2 flex items-center space-x-2">
          <input
            type="checkbox"
            checked={data.sameAsBilling || false}
            onChange={handleCheckboxChange}
          />
          <Label>Billing provider same as rendering provider</Label>
        </div>

        {/* Billing Provider */}
        <div className="col-span-2">
          <Label>Billing Organization Name</Label>
          <Input
            value={data.billingProvider?.organization || ""}
            onChange={(e) => onChange("billingProvider.organization", e.target.value)}
          />
        </div>
        <div>
          <Label>Billing Provider TIN</Label>
          <Input
            value={data.billingProvider?.tin || ""}
            onChange={(e) => onChange("billingProvider.tin", e.target.value)}
          />
        </div>
        <div>
          <Label>Billing Provider Phone</Label>
          <Input
            value={data.billingProvider?.phone || ""}
            onChange={(e) => onChange("billingProvider.phone", e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <Label>Billing Provider Address</Label>
          <Input
            value={data.billingProvider?.address || ""}
            onChange={(e) => onChange("billingProvider.address", e.target.value)}
          />
        </div>

        {/* Referring Provider */}
        <div>
          <Label>Referring Provider NPI (if any)</Label>
          <Input
            value={data.referringProvider?.npi || ""}
            onChange={(e) => onChange("referringProvider.npi", e.target.value)}
          />
        </div>
        <div>
          <Label>Referring Provider Name</Label>
          <Input
            value={data.referringProvider?.name || ""}
            onChange={(e) => onChange("referringProvider.name", e.target.value)}
          />
        </div>

        {/* Supervising Provider */}
        <div>
          <Label>Supervising Provider NPI (if any)</Label>
          <Input
            value={data.supervisingProvider?.npi || ""}
            onChange={(e) => onChange("supervisingProvider.npi", e.target.value)}
          />
        </div>
        <div>
          <Label>Supervising Provider Name</Label>
          <Input
            value={data.supervisingProvider?.name || ""}
            onChange={(e) => onChange("supervisingProvider.name", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}  