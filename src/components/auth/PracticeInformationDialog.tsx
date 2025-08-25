import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast"; // Assuming you have useToast hook
import {providerPracticeUpdate} from "@/services/operations/auth"
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";

export const PracticeInformationDialog = ({ isOpen,  onCancel }) => {
  const { toast } = useToast();
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [formData, setFormData] = useState({
    practiceName: "",
    practicePhone: "",
    fax: "",
    facilityName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
    country: "", 
    timeZone: "Pacific (GMT-8)", // Default value
    observesDaylightSaving: false,
  });

  const navigate = useNavigate()
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    // Clear error for the field as user types
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleSelectChange = (id, value) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleCheckboxChange = (checked) => {
    setFormData((prev) => ({ ...prev, observesDaylightSaving: checked }));
  };

  const validateForm = () => {
    let newErrors = {};
    if (!formData.practiceName.trim()) newErrors.practiceName = "Practice Name is required.";
    if (!formData.practicePhone.trim()) newErrors.practicePhone = "Practice Phone is required.";
    if (!formData.addressLine1.trim()) newErrors.addressLine1 = "Address Line 1 is required.";
    if (!formData.city.trim()) newErrors.city = "City is required.";
    if (!formData.state.trim()) newErrors.state = "State is required.";
    if (!formData.zip.trim()) newErrors.zip = "ZIP is required.";
    if (!formData.country.trim()) newErrors.country = "Country is required.";
    // Facility Name is not marked with * in the image, so making it optional for now

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async() => {
    if (validateForm()) {
      toast({
        title: "Practice Information Submitted",
        description: "Your practice details have been successfully saved.",
      });
      console.log("Form Data:", formData);
    const res = await providerPracticeUpdate(formData,token,dispatch)  
    console.log(res)
     if(res?.success){

    //    navigate("/provider/dashboard")
     }
    } else {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
    }
  };

  // Dummy data for states and countries (extend as needed)
  const US_STATES = [
    { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, // Delaware as seen in image
    { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" },
    { value: "ID", label: "Idaho" }, { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
    { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" },
    { value: "LA", label: "Louisiana" }, { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
    { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" },
    { value: "MS", label: "Mississippi" }, { value: "MO", "label": "Missouri" }, { value: "MT", label: "Montana" },
    { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" },
    { value: "NJ", label: "New Jersey" }, { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
    { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" },
    { value: "OK", label: "Oklahoma" }, { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
    { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" },
    { value: "TN", label: "Tennessee" }, { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
    { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" },
    { value: "WV", label: "West Virginia" }, { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" }
  ];

  const COUNTRIES = [
    { value: "United States of America", label: "United States of America" },
    { value: "Canada", label: "Canada" },
    { value: "Mexico", label: "Mexico" },
    // Add more countries as needed
  ];

  const TIME_ZONES = [
    { value: "Pacific (GMT-8)", label: "Pacific (GMT-8)" },
    { value: "Mountain (GMT-7)", label: "Mountain (GMT-7)" },
    { value: "Central (GMT-6)", label: "Central (GMT-6)" },
    { value: "Eastern (GMT-5)", label: "Eastern (GMT-5)" },
    // Add more time zones as needed
  ];


  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]"> {/* Increased max-width and added scroll */}
        <DialogHeader>
          <DialogTitle className="text-xl">Add practice information</DialogTitle>
         
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Practice Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="practiceName" className="text-right">
              PRACTICE NAME*
            </Label>
            <Input
              id="practiceName"
              value={formData.practiceName}
              onChange={handleChange}
              className="col-span-3"
            />
            {errors.practiceName && <p className="col-span-4 text-red-500 text-xs text-right">{errors.practiceName}</p>}
          </div>

          {/* Practice Phone & Fax */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="practicePhone" className="text-right">
              PRACTICE PHONE*
            </Label>
            <Input
              id="practicePhone"
              value={formData.practicePhone}
              onChange={handleChange}
              placeholder="(###) ###-####"
              className="col-span-1"
            />
            <Label htmlFor="fax" className="text-right">
              FAX
            </Label>
            <Input
              id="fax"
              value={formData.fax}
              onChange={handleChange}
              placeholder="(###) ###-####"
              className="col-span-1"
            />
            {errors.practicePhone && <p className="col-span-4 text-red-500 text-xs text-right">{errors.practicePhone}</p>}
          </div>

          {/* Facility Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="facilityName" className="text-right">
              FACILITY NAME
            </Label>
            <Input
              id="facilityName"
              value={formData.facilityName}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>

          {/* Address Line 1 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="addressLine1" className="text-right">
              ADDRESS LINE 1*
            </Label>
            <Input
              id="addressLine1"
              value={formData.addressLine1}
              onChange={handleChange}
              className="col-span-3"
            />
            {errors.addressLine1 && <p className="col-span-4 text-red-500 text-xs text-right">{errors.addressLine1}</p>}
          </div>

          {/* Address Line 2 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="addressLine2" className="text-right">
              ADDRESS LINE 2
            </Label>
            <Input
              id="addressLine2"
              value={formData.addressLine2}
              onChange={handleChange}
              placeholder="Apartment, suite, itc."
              className="col-span-3"
            />
          </div>

          {/* City */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="city" className="text-right">
              CITY*
            </Label>
            <Input
              id="city"
              value={formData.city}
              onChange={handleChange}
              className="col-span-3"
            />
            {errors.city && <p className="col-span-4 text-red-500 text-xs text-right">{errors.city}</p>}
          </div>

          {/* State & ZIP */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="state" className="text-right">
              STATE*
            </Label>
            <Select onValueChange={(value) => handleSelectChange("state", value)} value={formData.state}>
              <SelectTrigger className="col-span-1">
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label htmlFor="zip" className="text-right">
              ZIP*
            </Label>
            <Input
              id="zip"
              value={formData.zip}
              onChange={handleChange}
              className="col-span-1"
            />
            {errors.state && <p className="col-span-2 text-red-500 text-xs text-right">{errors.state}</p>}
            {errors.zip && <p className="col-span-2 text-red-500 text-xs text-right">{errors.zip}</p>}
          </div>

          {/* Country */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="country" className="text-right">
              COUNTRY*
            </Label>
            <Select onValueChange={(value) => handleSelectChange("country", value)} value={formData.country}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select Country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.country && <p className="col-span-4 text-red-500 text-xs text-right">{errors.country}</p>}
          </div>

          Time Zone & Daylight Saving
          {/* <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="timeZone" className="text-right">
              TIME ZONE*
            </Label>
            <Select onValueChange={(value) => handleSelectChange("timeZone", value)} value={formData.timeZone}>
              <SelectTrigger className="col-span-2">
                <SelectValue placeholder="Select Time Zone" />
              </SelectTrigger>
              <SelectContent>
                {TIME_ZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2 col-span-1">
              <Checkbox
                id="observesDaylightSaving"
                checked={formData.observesDaylightSaving}
                onCheckedChange={handleCheckboxChange}
              />
              <Label htmlFor="observesDaylightSaving">Observes daylight saving</Label>
            </div>
          </div> */}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};