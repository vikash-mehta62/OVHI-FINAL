import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ProviderSection({
  data,
  onChange,
}: {
  data: any;
  onChange: (field: string, value: any) => void;
}) {
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    onChange("sameAsBilling", checked);

    if (checked) {
      // Auto-fill billing with rendering provider
      onChange("billingProvider.organization", data.renderingProvider?.name || "");
      onChange("billingProvider.npi", data.renderingProvider?.npi || "");
      onChange("billingProvider.tin", data.renderingProvider?.tin || "");
      onChange("billingProvider.phone", data.renderingProvider?.phone || "");
      onChange("billingProvider.address", data.renderingProvider?.address || "");
      onChange("billingProvider.zip4", data.renderingProvider?.zip4 || "");
    }
  };

  return (
<Card className="mt-6 p-4">
  <CardHeader className="mb-3">
    <CardTitle className="text-xl font-bold">Provider / Billing Info</CardTitle>
  </CardHeader>

  <CardContent className="grid grid-cols-2 gap-5">

    {/* -------------------- Rendering Provider -------------------- */}
    <div className="col-span-2 py-2 border-b border-gray-300 mb-3">
      <Label className="font-semibold text-lg">Rendering Provider (24J)</Label>
    </div>
    <div>
      <Label className="mb-1">Name</Label>
      <Input
        value={data.renderingProvider?.name || ""}
        onChange={(e) => onChange("renderingProvider.name", e.target.value)}
        className="mb-2"
      />
    </div>
    <div>
      <Label className="mb-1">NPI</Label>
      <Input
        value={data.renderingProvider?.npi || ""}
        onChange={(e) => onChange("renderingProvider.npi", e.target.value)}
        className="mb-2"
      />
    </div>
    <div>
      <Label className="mb-1">TIN</Label>
      <Input
        value={data.renderingProvider?.tin || ""}
        onChange={(e) => onChange("renderingProvider.tin", e.target.value)}
        className="mb-2"
      />
    </div>
    <div>
      <Label className="mb-1">Taxonomy (optional)</Label>
      <Input
        value={data.renderingProvider?.taxonomy || ""}
        onChange={(e) => onChange("renderingProvider.taxonomy", e.target.value)}
        placeholder="e.g., 207Q00000X"
        className="mb-2"
      />
    </div>

    {/* -------------------- Billing Provider -------------------- */}
    <div className="col-span-2 py-2 border-b border-gray-300 mb-3">
      <Label className="font-semibold text-lg">Billing Provider (33/33a)</Label>
      <div className="flex items-center space-x-2 mt-1">
        <input
          type="checkbox"
          checked={data.sameAsBilling || false}
          onChange={handleCheckboxChange}
        />
        <Label className="text-sm">Same as Rendering Provider</Label>
      </div>
    </div>
    <div>
      <Label className="mb-1">Organization Name</Label>
      <Input
        value={data.billingProvider?.organization || ""}
        onChange={(e) => onChange("billingProvider.organization", e.target.value)}
        className="mb-2"
      />
    </div>
    <div>
      <Label className="mb-1">NPI</Label>
      <Input
        value={data.billingProvider?.npi || ""}
        onChange={(e) => onChange("billingProvider.npi", e.target.value)}
        className="mb-2"
      />
    </div>
    <div>
      <Label className="mb-1">TIN</Label>
      <Input
        value={data.billingProvider?.tin || ""}
        onChange={(e) => onChange("billingProvider.tin", e.target.value)}
        className="mb-2"
      />
    </div>
    <div>
      <Label className="mb-1">Phone</Label>
      <Input
        value={data.billingProvider?.phone || ""}
        onChange={(e) => onChange("billingProvider.phone", e.target.value)}
        className="mb-2"
      />
    </div>
    <div className="col-span-2">
      <Label className="mb-1">Address</Label>
      <Input
        value={data.billingProvider?.address || ""}
        onChange={(e) => onChange("billingProvider.address", e.target.value)}
        className="mb-2"
      />
    </div>
    <div>
      <Label className="mb-1">ZIP+4 (recommended)</Label>
      <Input
        value={data.billingProvider?.zip4 || ""}
        onChange={(e) => onChange("billingProvider.zip4", e.target.value)}
        placeholder="62704-1234"
        className="mb-2"
      />
    </div>

    {/* -------------------- Referring Provider -------------------- */}
    <div className="col-span-2 py-2 border-b border-gray-300 mb-3">
      <Label className="font-semibold text-lg">Referring Provider (17)</Label>
    </div>
    <div>
      <Label className="mb-1">Name</Label>
      <Input
        value={data.referringProvider?.name || ""}
        onChange={(e) => onChange("referringProvider.name", e.target.value)}
        className="mb-2"
      />
    </div>
    <div>
      <Label className="mb-1">NPI (if any)</Label>
      <Input
        value={data.referringProvider?.npi || ""}
        onChange={(e) => onChange("referringProvider.npi", e.target.value)}
        className="mb-2"
      />
    </div>

    {/* -------------------- Supervising Provider -------------------- */}
    <div className="col-span-2 py-2 border-b border-gray-300 mb-3">
      <Label className="font-semibold text-lg">Supervising Provider (when required)</Label>
    </div>
    <div>
      <Label className="mb-1">Name</Label>
      <Input
        value={data.supervisingProvider?.name || ""}
        onChange={(e) => onChange("supervisingProvider.name", e.target.value)}
        className="mb-2"
      />
    </div>
    <div>
      <Label className="mb-1">NPI (if any)</Label>
      <Input
        value={data.supervisingProvider?.npi || ""}
        onChange={(e) => onChange("supervisingProvider.npi", e.target.value)}
        className="mb-2"
      />
    </div>

    {/* -------------------- Service Facility -------------------- */}
    <div className="col-span-2 py-2 border-b border-gray-300 mb-3">
      <Label className="font-semibold text-lg">
        Service Facility (32/32a) — if different from billing
      </Label>
    </div>
    <div>
      <Label className="mb-1">Facility Name</Label>
      <Input
        value={data.serviceFacility?.name || ""}
        onChange={(e) => onChange("serviceFacility.name", e.target.value)}
        className="mb-2"
      />
    </div>
    <div>
      <Label className="mb-1">NPI</Label>
      <Input
        value={data.serviceFacility?.npi || ""}
        onChange={(e) => onChange("serviceFacility.npi", e.target.value)}
        className="mb-2"
      />
    </div>
    <div className="col-span-2">
      <Label className="mb-1">Address</Label>
      <Input
        value={data.serviceFacility?.address || ""}
        onChange={(e) => onChange("serviceFacility.address", e.target.value)}
        className="mb-2"
      />
    </div>

  </CardContent>
</Card>

  );
  
  
}
  