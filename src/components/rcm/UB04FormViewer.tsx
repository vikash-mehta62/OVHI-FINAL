import { toast } from "sonner";

import { Calculator } from "lucide-react";

import { Stethoscope } from "lucide-react";

import { Stethoscope } from "lucide-react";

import { CreditCard } from "lucide-react";

import { CreditCard } from "lucide-react";

import { User } from "lucide-react";

import { User } from "lucide-react";

import { Building2 } from "lucide-react";

import { Building2 } from "lucide-react";

import { Edit } from "lucide-react";

import { Edit } from "lucide-react";

import { Trash2 } from "lucide-react";

import { Trash2 } from "lucide-react";

import { Plus } from "lucide-react";

import { Plus } from "lucide-react";

import { Loader2 } from "lucide-react";

import { Loader2 } from "lucide-react";

import { AlertTriangle } from "lucide-react";

import { AlertTriangle } from "lucide-react";

import { FileCheck } from "lucide-react";

import { FileCheck } from "lucide-react";

import { Settings } from "lucide-react";

import { Settings } from "lucide-react";

import { RefreshCw } from "lucide-react";

import { RefreshCw } from "lucide-react";

import { Printer } from "lucide-react";

import { Printer } from "lucide-react";

import { Clock } from "lucide-react";

import { Clock } from "lucide-react";

import { CheckCircle } from "lucide-react";

import { CheckCircle } from "lucide-react";

import { AlertCircle } from "lucide-react";

import { AlertCircle } from "lucide-react";

import { Eye } from "lucide-react";

import { Eye } from "lucide-react";

import { Download } from "lucide-react";

import { Download } from "lucide-react";

import { FileText } from "lucide-react";

import { FileText } from "lucide-react";

import { TableRow } from "../ui/table";

import { TableRow } from "../ui/table";

import { TableHeader } from "../ui/table";

import { TableHeader } from "../ui/table";

import { TableHead } from "../ui/table";

import { TableHead } from "../ui/table";

import { TableCell } from "../ui/table";

import { TableCell } from "../ui/table";

import { TableBody } from "../ui/table";

import { TableBody } from "../ui/table";

import { Table } from "lucide-react";

import { Table } from "lucide-react";

import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";

import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";

import { DropdownMenuSeparator } from "@radix-ui/react-dropdown-menu";

import { DropdownMenuSeparator } from "@radix-ui/react-dropdown-menu";

import { DropdownMenuLabel } from "@radix-ui/react-dropdown-menu";

import { DropdownMenuLabel } from "@radix-ui/react-dropdown-menu";

import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";

import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";

import { DropdownMenuContent } from "@radix-ui/react-dropdown-menu";

import { DropdownMenuContent } from "@radix-ui/react-dropdown-menu";

import { DropdownMenu } from "@radix-ui/react-dropdown-menu";

import { DropdownMenu } from "@radix-ui/react-dropdown-menu";

import { DialogTrigger } from "@radix-ui/react-dialog";

import { DialogTrigger } from "@radix-ui/react-dialog";

import { DialogTitle } from "@radix-ui/react-dialog";

import { DialogTitle } from "@radix-ui/react-dialog";

import { DialogHeader } from "../ui/dialog";

import { DialogHeader } from "../ui/dialog";

import { DialogDescription } from "@radix-ui/react-dialog";

import { DialogDescription } from "@radix-ui/react-dialog";

import { DialogContent } from "@radix-ui/react-dialog";

import { DialogContent } from "@radix-ui/react-dialog";

import { Dialog } from "@radix-ui/react-dialog";

import { Dialog } from "@radix-ui/react-dialog";

import { SelectValue } from "@radix-ui/react-select";

import { SelectValue } from "@radix-ui/react-select";

import { SelectTrigger } from "@radix-ui/react-select";

import { SelectTrigger } from "@radix-ui/react-select";

import { SelectItem } from "@radix-ui/react-select";

import { SelectItem } from "@radix-ui/react-select";

import { SelectContent } from "@radix-ui/react-select";

import { SelectContent } from "@radix-ui/react-select";

import { Select } from "antd";

import { Select } from "antd";

import { Textarea } from "../ui/textarea";

import { Label } from "recharts";

import { Input } from "antd";

import { ScrollArea } from "@radix-ui/react-scroll-area";

import { Separator } from "@radix-ui/react-separator";

import { Progress } from "antd";

import { AlertDescription } from "../ui/alert";

import { Alert } from "antd";

import { Alert } from "antd";

import { TabsTrigger } from "@radix-ui/react-tabs";

import { TabsList } from "@radix-ui/react-tabs";

import { TabsContent } from "@radix-ui/react-tabs";

import { Tabs } from "antd";

import { Tabs } from "antd";

import { Tabs } from "antd";

import { Tabs } from "antd";

import { Badge } from "lucide-react";

import { Button } from "antd";

import { CardTitle } from "../ui/card";

import { CardHeader } from "../ui/card";

import { CardContent } from "../ui/card";

import { Card } from "antd";

import { Card } from "antd";

import { Card } from "antd";

import { Card } from "antd";

import { useCallback } from "react";

import { useEffect } from "react";

import { useState } from "react";

import React from "react";

import React from "react";

import { Calculator } from "lucide-react";

/**\n * UB04FormViewer Component\n * Comprehensive interface for viewing, generating, and managing UB-04 forms for institutional claims\n */\n\nimport React, { useState, useEffect, useCallback } from 'react';\nimport { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';\nimport { Button } from '@/components/ui/button';\nimport { Badge } from '@/components/ui/badge';\nimport { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';\nimport { Alert, AlertDescription } from '@/components/ui/alert';\nimport { Progress } from '@/components/ui/progress';\nimport { Separator } from '@/components/ui/separator';\nimport { ScrollArea } from '@/components/ui/scroll-area';\nimport { Input } from '@/components/ui/input';\nimport { Label } from '@/components/ui/label';\nimport { Textarea } from '@/components/ui/textarea';\nimport {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from '@/components/ui/select';\nimport {\n  Dialog,\n  DialogContent,\n  DialogDescription,\n  DialogHeader,\n  DialogTitle,\n  DialogTrigger,\n} from '@/components/ui/dialog';\nimport {\n  DropdownMenu,\n  DropdownMenuContent,\n  DropdownMenuItem,\n  DropdownMenuLabel,\n  DropdownMenuSeparator,\n  DropdownMenuTrigger,\n} from '@/components/ui/dropdown-menu';\nimport {\n  Table,\n  TableBody,\n  TableCell,\n  TableHead,\n  TableHeader,\n  TableRow,\n} from '@/components/ui/table';\nimport {\n  FileText,\n  Download,\n  Eye,\n  AlertCircle,\n  CheckCircle,\n  Clock,\n  Printer,\n  RefreshCw,\n  Settings,\n  History,\n  FileCheck,\n  AlertTriangle,\n  Loader2,\n  Plus,\n  Trash2,\n  Edit,\n  Building2,\n  User,\n  CreditCard,\n  Stethoscope,\n  Calculator\n} from 'lucide-react';\nimport { toast } from 'sonner';\nimport RevenueCodeDialog from './RevenueCodeDialog';\nimport DiagnosisCodeDialog from './DiagnosisCodeDialog';\n\n// Types\ninterface UB04FormViewerProps {\n  claimId: number;\n  onFormGenerated?: (formData: any) => void;\n  onError?: (error: string) => void;\n  className?: string;\n}\n\ninterface FormValidation {\n  isValid: boolean;\n  errors: string[];\n  warnings: string[];\n}\n\ninterface FormPreview {\n  claimId: number;\n  validation: FormValidation;\n  formData: Record<string, any>;\n  fieldCount: number;\n  estimatedSize: string;\n  revenueLineCount: number;\n  diagnosisCount: number;\n}\n\ninterface RevenueCodeLine {\n  id?: number;\n  revenueCode: string;\n  description: string;\n  hcpcsCode?: string;\n  serviceDate?: string;\n  serviceUnits?: number;\n  totalCharges: number;\n  nonCoveredCharges?: number;\n  lineNumber: number;\n}\n\ninterface DiagnosisCode {\n  id?: number;\n  diagnosisCode: string;\n  description: string;\n  poaIndicator: string;\n  diagnosisType: 'principal' | 'secondary';\n  sequenceNumber: number;\n}\n\ninterface ConditionCode {\n  id?: number;\n  conditionCode: string;\n  description: string;\n}\n\ninterface OccurrenceCode {\n  id?: number;\n  occurrenceCode: string;\n  occurrenceDate: string;\n  description: string;\n}\n\ninterface GenerationHistory {\n  id: number;\n  timestamp: string;\n  user_name: string;\n  success: boolean;\n  options: Record<string, any>;\n  error?: string;\n}\n\nconst UB04FormViewer: React.FC<UB04FormViewerProps> = ({\n  claimId,\n  onFormGenerated,\n  onError,\n  className\n}) => {\n  // State management\n  const [activeTab, setActiveTab] = useState('preview');\n  const [isLoading, setIsLoading] = useState(false);\n  const [isGenerating, setIsGenerating] = useState(false);\n  const [formPreview, setFormPreview] = useState<FormPreview | null>(null);\n  const [generationHistory, setGenerationHistory] = useState<GenerationHistory[]>([]);\n  const [validationResult, setValidationResult] = useState<FormValidation | null>(null);\n  const [generationOptions, setGenerationOptions] = useState({\n    includeFormBackground: true,\n    isDraft: false,\n    format: 'pdf'\n  });\n  \n  // Revenue code management\n  const [revenueLines, setRevenueLines] = useState<RevenueCodeLine[]>([]);\n  const [showRevenueDialog, setShowRevenueDialog] = useState(false);\n  const [editingRevenueLine, setEditingRevenueLine] = useState<RevenueCodeLine | null>(null);\n  \n  // Diagnosis code management\n  const [diagnosisCodes, setDiagnosisCodes] = useState<DiagnosisCode[]>([]);\n  const [showDiagnosisDialog, setShowDiagnosisDialog] = useState(false);\n  const [editingDiagnosis, setEditingDiagnosis] = useState<DiagnosisCode | null>(null);\n  \n  // Condition and occurrence codes\n  const [conditionCodes, setConditionCodes] = useState<ConditionCode[]>([]);\n  const [occurrenceCodes, setOccurrenceCodes] = useState<OccurrenceCode[]>([]);\n  \n  // Bill type and facility info\n  const [billType, setBillType] = useState('');\n  const [facilityInfo, setFacilityInfo] = useState({\n    name: '',\n    npi: '',\n    taxId: '',\n    address: ''\n  });\n\n  // Load initial data\n  useEffect(() => {\n    if (claimId) {\n      loadFormPreview();\n      loadValidation();\n      loadGenerationHistory();\n      loadInstitutionalClaimData();\n    }\n  }, [claimId]);\n\n  /**\n   * Load form preview data\n   */\n  const loadFormPreview = useCallback(async () => {\n    try {\n      setIsLoading(true);\n      const response = await fetch(`/api/v1/rcm/claims/${claimId}/ub04/preview`, {\n        headers: {\n          'Authorization': `Bearer ${localStorage.getItem('token')}`,\n        },\n      });\n\n      if (!response.ok) {\n        throw new Error('Failed to load form preview');\n      }\n\n      const data = await response.json();\n      setFormPreview(data.data);\n    } catch (error) {\n      console.error('Error loading form preview:', error);\n      onError?.(error instanceof Error ? error.message : 'Failed to load form preview');\n      toast.error('Failed to load form preview');\n    } finally {\n      setIsLoading(false);\n    }\n  }, [claimId, onError]);\n\n  /**\n   * Load validation results\n   */\n  const loadValidation = useCallback(async () => {\n    try {\n      const response = await fetch(`/api/v1/rcm/claims/${claimId}/ub04/validate`, {\n        headers: {\n          'Authorization': `Bearer ${localStorage.getItem('token')}`,\n        },\n      });\n\n      if (!response.ok) {\n        throw new Error('Failed to validate form data');\n      }\n\n      const data = await response.json();\n      setValidationResult(data.data.validation);\n    } catch (error) {\n      console.error('Error validating form:', error);\n      toast.error('Failed to validate form data');\n    }\n  }, [claimId]);\n\n  /**\n   * Load generation history\n   */\n  const loadGenerationHistory = useCallback(async () => {\n    try {\n      const response = await fetch(`/api/v1/rcm/claims/${claimId}/ub04/history`, {\n        headers: {\n          'Authorization': `Bearer ${localStorage.getItem('token')}`,\n        },\n      });\n\n      if (!response.ok) {\n        throw new Error('Failed to load generation history');\n      }\n\n      const data = await response.json();\n      setGenerationHistory(data.data.activities || []);\n    } catch (error) {\n      console.error('Error loading history:', error);\n      toast.error('Failed to load generation history');\n    }\n  }, [claimId]);\n\n  /**\n   * Load institutional claim data for editing\n   */\n  const loadInstitutionalClaimData = useCallback(async () => {\n    try {\n      // In a real implementation, you would load the institutional claim data\n      // For now, we'll use mock data\n      setRevenueLines([\n        {\n          id: 1,\n          revenueCode: '0110',\n          description: 'Room and Board - Private',\n          serviceUnits: 3,\n          totalCharges: 1500.00,\n          lineNumber: 1\n        },\n        {\n          id: 2,\n          revenueCode: '0300',\n          description: 'Laboratory',\n          serviceUnits: 5,\n          totalCharges: 250.00,\n          lineNumber: 2\n        }\n      ]);\n      \n      setDiagnosisCodes([\n        {\n          id: 1,\n          diagnosisCode: 'I21.9',\n          description: 'Acute myocardial infarction, unspecified',\n          poaIndicator: 'Y',\n          diagnosisType: 'principal',\n          sequenceNumber: 1\n        },\n        {\n          id: 2,\n          diagnosisCode: 'E11.9',\n          description: 'Type 2 diabetes mellitus without complications',\n          poaIndicator: 'Y',\n          diagnosisType: 'secondary',\n          sequenceNumber: 2\n        }\n      ]);\n      \n      setBillType('0111');\n      setFacilityInfo({\n        name: 'General Hospital',\n        npi: '1234567890',\n        taxId: '12-3456789',\n        address: '123 Hospital Way, Anytown, CA 90210'\n      });\n    } catch (error) {\n      console.error('Error loading institutional claim data:', error);\n    }\n  }, [claimId]);\n\n  /**\n   * Generate UB-04 form\n   */\n  const generateForm = async (options = generationOptions) => {\n    try {\n      setIsGenerating(true);\n      \n      const params = new URLSearchParams({\n        includeFormBackground: options.includeFormBackground.toString(),\n        isDraft: options.isDraft.toString(),\n        format: options.format\n      });\n\n      const response = await fetch(`/api/v1/rcm/claims/${claimId}/ub04/generate?${params}`, {\n        headers: {\n          'Authorization': `Bearer ${localStorage.getItem('token')}`,\n        },\n      });\n\n      if (!response.ok) {\n        const errorData = await response.json();\n        throw new Error(errorData.message || 'Failed to generate form');\n      }\n\n      // Handle PDF download\n      const blob = await response.blob();\n      const url = window.URL.createObjectURL(blob);\n      const link = document.createElement('a');\n      link.href = url;\n      link.download = `UB04-${claimId}.pdf`;\n      document.body.appendChild(link);\n      link.click();\n      document.body.removeChild(link);\n      window.URL.revokeObjectURL(url);\n\n      toast.success('UB-04 form generated successfully');\n      onFormGenerated?.({\n        claimId,\n        success: true,\n        options,\n        size: blob.size\n      });\n\n      // Refresh history\n      await loadGenerationHistory();\n    } catch (error) {\n      console.error('Error generating form:', error);\n      const errorMessage = error instanceof Error ? error.message : 'Failed to generate form';\n      onError?.(errorMessage);\n      toast.error(errorMessage);\n    } finally {\n      setIsGenerating(false);\n    }\n  };\n\n  /**\n   * Validate revenue code\n   */\n  const validateRevenueCode = async (revenueCode: string) => {\n    try {\n      const response = await fetch('/api/v1/rcm/ub04/validate-revenue-code', {\n        method: 'POST',\n        headers: {\n          'Authorization': `Bearer ${localStorage.getItem('token')}`,\n          'Content-Type': 'application/json',\n        },\n        body: JSON.stringify({ revenueCode }),\n      });\n\n      if (!response.ok) {\n        throw new Error('Failed to validate revenue code');\n      }\n\n      const data = await response.json();\n      return data.data;\n    } catch (error) {\n      console.error('Error validating revenue code:', error);\n      return { isValid: false, description: null };\n    }\n  };\n\n  /**\n   * Validate bill type\n   */\n  const validateBillType = async (billTypeCode: string) => {\n    try {\n      const response = await fetch('/api/v1/rcm/ub04/validate-bill-type', {\n        method: 'POST',\n        headers: {\n          'Authorization': `Bearer ${localStorage.getItem('token')}`,\n          'Content-Type': 'application/json',\n        },\n        body: JSON.stringify({ billType: billTypeCode }),\n      });\n\n      if (!response.ok) {\n        throw new Error('Failed to validate bill type');\n      }\n\n      const data = await response.json();\n      return data.data;\n    } catch (error) {\n      console.error('Error validating bill type:', error);\n      return { isValid: false, errors: ['Invalid bill type'] };\n    }\n  };\n\n  /**\n   * Add or update revenue line\n   */\n  const saveRevenueLine = (line: RevenueCodeLine) => {\n    if (line.id) {\n      // Update existing line\n      setRevenueLines(prev => prev.map(l => l.id === line.id ? line : l));\n    } else {\n      // Add new line\n      const newLine = {\n        ...line,\n        id: Date.now(),\n        lineNumber: revenueLines.length + 1\n      };\n      setRevenueLines(prev => [...prev, newLine]);\n    }\n    setShowRevenueDialog(false);\n    setEditingRevenueLine(null);\n    toast.success('Revenue line saved successfully');\n  };\n\n  /**\n   * Delete revenue line\n   */\n  const deleteRevenueLine = (id: number) => {\n    setRevenueLines(prev => prev.filter(l => l.id !== id));\n    toast.success('Revenue line deleted');\n  };\n\n  /**\n   * Add or update diagnosis code\n   */\n  const saveDiagnosisCode = (diagnosis: DiagnosisCode) => {\n    if (diagnosis.id) {\n      // Update existing diagnosis\n      setDiagnosisCodes(prev => prev.map(d => d.id === diagnosis.id ? diagnosis : d));\n    } else {\n      // Add new diagnosis\n      const newDiagnosis = {\n        ...diagnosis,\n        id: Date.now(),\n        sequenceNumber: diagnosisCodes.length + 1\n      };\n      setDiagnosisCodes(prev => [...prev, newDiagnosis]);\n    }\n    setShowDiagnosisDialog(false);\n    setEditingDiagnosis(null);\n    toast.success('Diagnosis code saved successfully');\n  };\n\n  /**\n   * Delete diagnosis code\n   */\n  const deleteDiagnosisCode = (id: number) => {\n    setDiagnosisCodes(prev => prev.filter(d => d.id !== id));\n    toast.success('Diagnosis code deleted');\n  };\n\n  /**\n   * Calculate total charges\n   */\n  const calculateTotalCharges = () => {\n    return revenueLines.reduce((total, line) => total + (line.totalCharges || 0), 0);\n  };\n\n  /**\n   * Print form\n   */\n  const printForm = async () => {\n    try {\n      const params = new URLSearchParams({\n        includeFormBackground: 'true',\n        isDraft: 'false'\n      });\n\n      const response = await fetch(`/api/v1/rcm/claims/${claimId}/ub04/generate?${params}`, {\n        headers: {\n          'Authorization': `Bearer ${localStorage.getItem('token')}`,\n        },\n      });\n\n      if (!response.ok) {\n        throw new Error('Failed to generate form for printing');\n      }\n\n      const blob = await response.blob();\n      const url = window.URL.createObjectURL(blob);\n      \n      // Open in new window for printing\n      const printWindow = window.open(url, '_blank');\n      if (printWindow) {\n        printWindow.onload = () => {\n          printWindow.print();\n        };\n      }\n    } catch (error) {\n      console.error('Error printing form:', error);\n      toast.error('Failed to print form');\n    }\n  };\n\n  /**\n   * Refresh all data\n   */\n  const refreshData = async () => {\n    await Promise.all([\n      loadFormPreview(),\n      loadValidation(),\n      loadGenerationHistory(),\n      loadInstitutionalClaimData()\n    ]);\n    toast.success('Data refreshed');\n  };"  // 
Render validation status\n  const renderValidationStatus = () => {\n    if (!validationResult) return null;\n\n    const { isValid, errors, warnings } = validationResult;\n\n    return (\n      <div className=\"space-y-2\">\n        <div className=\"flex items-center gap-2\">\n          {isValid ? (\n            <CheckCircle className=\"h-5 w-5 text-green-500\" />\n          ) : (\n            <AlertCircle className=\"h-5 w-5 text-red-500\" />\n          )}\n          <span className=\"font-medium\">\n            {isValid ? 'Institutional claim data is valid' : 'Institutional claim has issues'}\n          </span>\n          <Badge variant={isValid ? 'default' : 'destructive'}>\n            {isValid ? 'Ready to generate' : 'Needs attention'}\n          </Badge>\n        </div>\n\n        {errors.length > 0 && (\n          <Alert variant=\"destructive\">\n            <AlertCircle className=\"h-4 w-4\" />\n            <AlertDescription>\n              <div className=\"font-medium mb-1\">Errors ({errors.length}):</div>\n              <ul className=\"list-disc list-inside space-y-1\">\n                {errors.map((error, index) => (\n                  <li key={index} className=\"text-sm\">{error}</li>\n                ))}\n              </ul>\n            </AlertDescription>\n          </Alert>\n        )}\n\n        {warnings.length > 0 && (\n          <Alert>\n            <AlertTriangle className=\"h-4 w-4\" />\n            <AlertDescription>\n              <div className=\"font-medium mb-1\">Warnings ({warnings.length}):</div>\n              <ul className=\"list-disc list-inside space-y-1\">\n                {warnings.map((warning, index) => (\n                  <li key={index} className=\"text-sm\">{warning}</li>\n                ))}\n              </ul>\n            </AlertDescription>\n          </Alert>\n        )}\n      </div>\n    );\n  };\n\n  // Render form preview\n  const renderFormPreview = () => {\n    if (!formPreview) return null;\n\n    const { formData, fieldCount, estimatedSize, revenueLineCount, diagnosisCount } = formPreview;\n    const formFields = Object.entries(formData);\n\n    return (\n      <div className=\"space-y-4\">\n        <div className=\"flex items-center justify-between\">\n          <div className=\"flex items-center gap-4\">\n            <Badge variant=\"outline\">{fieldCount} fields</Badge>\n            <Badge variant=\"outline\">{estimatedSize}</Badge>\n            <Badge variant=\"outline\">{revenueLineCount} revenue lines</Badge>\n            <Badge variant=\"outline\">{diagnosisCount} diagnoses</Badge>\n          </div>\n          <Button\n            variant=\"outline\"\n            size=\"sm\"\n            onClick={refreshData}\n            disabled={isLoading}\n          >\n            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />\n            Refresh\n          </Button>\n        </div>\n\n        <ScrollArea className=\"h-96 border rounded-md p-4\">\n          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">\n            {formFields.map(([fieldName, value]) => (\n              <div key={fieldName} className=\"flex flex-col space-y-1\">\n                <label className=\"text-sm font-medium text-gray-600\">\n                  {formatUB04FieldLabel(fieldName)}\n                </label>\n                <div className=\"text-sm bg-gray-50 p-2 rounded border\">\n                  <span className=\"font-mono\">{value || '(empty)'}</span>\n                </div>\n              </div>\n            ))}\n          </div>\n        </ScrollArea>\n      </div>\n    );\n  };\n\n  // Render revenue code management\n  const renderRevenueCodeManagement = () => {\n    return (\n      <div className=\"space-y-4\">\n        <div className=\"flex items-center justify-between\">\n          <div>\n            <h3 className=\"text-lg font-medium\">Revenue Code Lines</h3>\n            <p className=\"text-sm text-gray-600\">\n              Manage revenue codes for institutional services (max 22 lines)\n            </p>\n          </div>\n          <Button\n            onClick={() => {\n              setEditingRevenueLine(null);\n              setShowRevenueDialog(true);\n            }}\n            disabled={revenueLines.length >= 22}\n          >\n            <Plus className=\"h-4 w-4 mr-2\" />\n            Add Revenue Line\n          </Button>\n        </div>\n\n        <div className=\"border rounded-md\">\n          <Table>\n            <TableHeader>\n              <TableRow>\n                <TableHead>Line</TableHead>\n                <TableHead>Revenue Code</TableHead>\n                <TableHead>Description</TableHead>\n                <TableHead>HCPCS</TableHead>\n                <TableHead>Units</TableHead>\n                <TableHead>Charges</TableHead>\n                <TableHead>Actions</TableHead>\n              </TableRow>\n            </TableHeader>\n            <TableBody>\n              {revenueLines.map((line) => (\n                <TableRow key={line.id}>\n                  <TableCell>{line.lineNumber}</TableCell>\n                  <TableCell>\n                    <Badge variant=\"outline\">{line.revenueCode}</Badge>\n                  </TableCell>\n                  <TableCell className=\"max-w-xs truncate\">{line.description}</TableCell>\n                  <TableCell>{line.hcpcsCode || '-'}</TableCell>\n                  <TableCell>{line.serviceUnits || '-'}</TableCell>\n                  <TableCell>${line.totalCharges.toFixed(2)}</TableCell>\n                  <TableCell>\n                    <div className=\"flex gap-2\">\n                      <Button\n                        variant=\"ghost\"\n                        size=\"sm\"\n                        onClick={() => {\n                          setEditingRevenueLine(line);\n                          setShowRevenueDialog(true);\n                        }}\n                      >\n                        <Edit className=\"h-3 w-3\" />\n                      </Button>\n                      <Button\n                        variant=\"ghost\"\n                        size=\"sm\"\n                        onClick={() => deleteRevenueLine(line.id!)}\n                      >\n                        <Trash2 className=\"h-3 w-3\" />\n                      </Button>\n                    </div>\n                  </TableCell>\n                </TableRow>\n              ))}\n            </TableBody>\n          </Table>\n        </div>\n\n        <div className=\"flex justify-between items-center p-4 bg-gray-50 rounded-md\">\n          <span className=\"font-medium\">Total Charges:</span>\n          <span className=\"text-lg font-bold\">${calculateTotalCharges().toFixed(2)}</span>\n        </div>\n      </div>\n    );\n  };\n\n  // Render diagnosis code management\n  const renderDiagnosisCodeManagement = () => {\n    return (\n      <div className=\"space-y-4\">\n        <div className=\"flex items-center justify-between\">\n          <div>\n            <h3 className=\"text-lg font-medium\">Diagnosis Codes</h3>\n            <p className=\"text-sm text-gray-600\">\n              Manage ICD-10-CM diagnosis codes with POA indicators (max 25 codes)\n            </p>\n          </div>\n          <Button\n            onClick={() => {\n              setEditingDiagnosis(null);\n              setShowDiagnosisDialog(true);\n            }}\n            disabled={diagnosisCodes.length >= 25}\n          >\n            <Plus className=\"h-4 w-4 mr-2\" />\n            Add Diagnosis\n          </Button>\n        </div>\n\n        <div className=\"border rounded-md\">\n          <Table>\n            <TableHeader>\n              <TableRow>\n                <TableHead>Seq</TableHead>\n                <TableHead>Code</TableHead>\n                <TableHead>Description</TableHead>\n                <TableHead>Type</TableHead>\n                <TableHead>POA</TableHead>\n                <TableHead>Actions</TableHead>\n              </TableRow>\n            </TableHeader>\n            <TableBody>\n              {diagnosisCodes.map((diagnosis) => (\n                <TableRow key={diagnosis.id}>\n                  <TableCell>{diagnosis.sequenceNumber}</TableCell>\n                  <TableCell>\n                    <Badge variant=\"outline\">{diagnosis.diagnosisCode}</Badge>\n                  </TableCell>\n                  <TableCell className=\"max-w-xs truncate\">{diagnosis.description}</TableCell>\n                  <TableCell>\n                    <Badge variant={diagnosis.diagnosisType === 'principal' ? 'default' : 'secondary'}>\n                      {diagnosis.diagnosisType}\n                    </Badge>\n                  </TableCell>\n                  <TableCell>\n                    <Badge variant=\"outline\">{diagnosis.poaIndicator}</Badge>\n                  </TableCell>\n                  <TableCell>\n                    <div className=\"flex gap-2\">\n                      <Button\n                        variant=\"ghost\"\n                        size=\"sm\"\n                        onClick={() => {\n                          setEditingDiagnosis(diagnosis);\n                          setShowDiagnosisDialog(true);\n                        }}\n                      >\n                        <Edit className=\"h-3 w-3\" />\n                      </Button>\n                      <Button\n                        variant=\"ghost\"\n                        size=\"sm\"\n                        onClick={() => deleteDiagnosisCode(diagnosis.id!)}\n                      >\n                        <Trash2 className=\"h-3 w-3\" />\n                      </Button>\n                    </div>\n                  </TableCell>\n                </TableRow>\n              ))}\n            </TableBody>\n          </Table>\n        </div>\n      </div>\n    );\n  };\n\n  // Render bill type and facility info\n  const renderFacilityInfo = () => {\n    return (\n      <div className=\"space-y-6\">\n        {/* Bill Type Section */}\n        <Card>\n          <CardHeader>\n            <CardTitle className=\"flex items-center gap-2\">\n              <FileCheck className=\"h-5 w-5\" />\n              Bill Type Information\n            </CardTitle>\n          </CardHeader>\n          <CardContent className=\"space-y-4\">\n            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">\n              <div>\n                <Label htmlFor=\"billType\">Bill Type (4 digits)</Label>\n                <Input\n                  id=\"billType\"\n                  value={billType}\n                  onChange={(e) => setBillType(e.target.value)}\n                  placeholder=\"0111\"\n                  maxLength={4}\n                />\n                <p className=\"text-xs text-gray-500 mt-1\">\n                  Format: Facility-Classification-Frequency-Reserved\n                </p>\n              </div>\n              <div className=\"flex items-end\">\n                <Button\n                  variant=\"outline\"\n                  onClick={() => validateBillType(billType)}\n                  disabled={!billType || billType.length !== 4}\n                >\n                  <CheckCircle className=\"h-4 w-4 mr-2\" />\n                  Validate Bill Type\n                </Button>\n              </div>\n            </div>\n          </CardContent>\n        </Card>\n\n        {/* Facility Information */}\n        <Card>\n          <CardHeader>\n            <CardTitle className=\"flex items-center gap-2\">\n              <Building2 className=\"h-5 w-5\" />\n              Facility Information\n            </CardTitle>\n          </CardHeader>\n          <CardContent className=\"space-y-4\">\n            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">\n              <div>\n                <Label htmlFor=\"facilityName\">Facility Name</Label>\n                <Input\n                  id=\"facilityName\"\n                  value={facilityInfo.name}\n                  onChange={(e) => setFacilityInfo(prev => ({ ...prev, name: e.target.value }))}\n                  placeholder=\"General Hospital\"\n                />\n              </div>\n              <div>\n                <Label htmlFor=\"facilityNpi\">Facility NPI</Label>\n                <Input\n                  id=\"facilityNpi\"\n                  value={facilityInfo.npi}\n                  onChange={(e) => setFacilityInfo(prev => ({ ...prev, npi: e.target.value }))}\n                  placeholder=\"1234567890\"\n                  maxLength={10}\n                />\n              </div>\n              <div>\n                <Label htmlFor=\"facilityTaxId\">Federal Tax ID</Label>\n                <Input\n                  id=\"facilityTaxId\"\n                  value={facilityInfo.taxId}\n                  onChange={(e) => setFacilityInfo(prev => ({ ...prev, taxId: e.target.value }))}\n                  placeholder=\"12-3456789\"\n                />\n              </div>\n              <div>\n                <Label htmlFor=\"facilityAddress\">Address</Label>\n                <Textarea\n                  id=\"facilityAddress\"\n                  value={facilityInfo.address}\n                  onChange={(e) => setFacilityInfo(prev => ({ ...prev, address: e.target.value }))}\n                  placeholder=\"123 Hospital Way, Anytown, CA 90210\"\n                  rows={2}\n                />\n              </div>\n            </div>\n          </CardContent>\n        </Card>\n      </div>\n    );\n  };\n\n  // Render generation history\n  const renderGenerationHistory = () => {\n    if (generationHistory.length === 0) {\n      return (\n        <div className=\"text-center py-8 text-gray-500\">\n          <FileText className=\"h-12 w-12 mx-auto mb-4 opacity-50\" />\n          <p>No generation history available</p>\n        </div>\n      );\n    }\n\n    return (\n      <div className=\"space-y-4\">\n        <Table>\n          <TableHeader>\n            <TableRow>\n              <TableHead>Date & Time</TableHead>\n              <TableHead>User</TableHead>\n              <TableHead>Status</TableHead>\n              <TableHead>Options</TableHead>\n              <TableHead>Actions</TableHead>\n            </TableRow>\n          </TableHeader>\n          <TableBody>\n            {generationHistory.map((entry) => (\n              <TableRow key={entry.id}>\n                <TableCell>\n                  <div className=\"flex items-center gap-2\">\n                    <Clock className=\"h-4 w-4 text-gray-400\" />\n                    {new Date(entry.timestamp).toLocaleString()}\n                  </div>\n                </TableCell>\n                <TableCell>{entry.user_name}</TableCell>\n                <TableCell>\n                  <Badge variant={entry.success ? 'default' : 'destructive'}>\n                    {entry.success ? 'Success' : 'Failed'}\n                  </Badge>\n                </TableCell>\n                <TableCell>\n                  <div className=\"text-sm text-gray-600\">\n                    {entry.options.isDraft && <Badge variant=\"outline\" className=\"mr-1\">Draft</Badge>}\n                    {entry.options.includeFormBackground && <Badge variant=\"outline\">Background</Badge>}\n                  </div>\n                </TableCell>\n                <TableCell>\n                  {entry.success ? (\n                    <Button\n                      variant=\"ghost\"\n                      size=\"sm\"\n                      onClick={() => generateForm(entry.options)}\n                    >\n                      <Download className=\"h-4 w-4\" />\n                    </Button>\n                  ) : (\n                    <span className=\"text-sm text-red-600\">{entry.error}</span>\n                  )}\n                </TableCell>\n              </TableRow>\n            ))}\n          </TableBody>\n        </Table>\n      </div>\n    );\n  };\n\n  // Format UB-04 field labels\n  const formatUB04FieldLabel = (fieldName: string): string => {\n    const labelMap: Record<string, string> = {\n      '1_provider_name': 'FL 1 - Provider Name',\n      '2_provider_address': 'FL 2 - Provider Address',\n      '3_patient_control_number': 'FL 3 - Patient Control Number',\n      '4_type_of_bill': 'FL 4 - Type of Bill',\n      '5_federal_tax_number': 'FL 5 - Federal Tax Number',\n      '8_patient_name': 'FL 8 - Patient Name',\n      '9_patient_address': 'FL 9 - Patient Address',\n      '10_patient_birth_date': 'FL 10 - Patient Birth Date',\n      '11_patient_sex': 'FL 11 - Patient Sex',\n      '12_admission_date': 'FL 12 - Admission Date',\n      '13_admission_hour': 'FL 13 - Admission Hour',\n      '14_type_of_admission': 'FL 14 - Type of Admission',\n      '15_source_of_admission': 'FL 15 - Source of Admission',\n      '17_patient_status': 'FL 17 - Patient Status',\n      '18_condition_codes': 'FL 18-28 - Condition Codes',\n      '31_occurrence_codes': 'FL 31-34 - Occurrence Codes',\n      '39_value_codes': 'FL 39-41 - Value Codes',\n      '50_payer_name_1': 'FL 50 - Payer Name',\n      '51_health_plan_id_1': 'FL 51 - Health Plan ID',\n      '55_estimated_amount_due': 'FL 55 - Estimated Amount Due',\n      '56_total_charges': 'FL 56 - Total Charges',\n      '76_attending_physician_npi': 'FL 76 - Attending Physician NPI',\n      '80_remarks': 'FL 80 - Remarks'\n    };\n\n    // Handle revenue code lines\n    if (fieldName.includes('revenue_code_') || fieldName.includes('total_charges_')) {\n      const parts = fieldName.split('_');\n      const lineNum = parts[parts.length - 1];\n      const fieldType = parts.slice(0, -1).join('_');\n      \n      const revenueFieldMap: Record<string, string> = {\n        '42_revenue_code': 'FL 42 - Revenue Code',\n        '43_revenue_description': 'FL 43 - Description',\n        '44_hcpcs_rates': 'FL 44 - HCPCS/Rates',\n        '45_service_date': 'FL 45 - Service Date',\n        '46_service_units': 'FL 46 - Service Units',\n        '47_total_charges': 'FL 47 - Total Charges',\n        '48_non_covered_charges': 'FL 48 - Non-Covered Charges'\n      };\n      \n      const fieldLabel = revenueFieldMap[fieldType] || fieldType;\n      return `${fieldLabel} (Line ${lineNum})`;\n    }\n\n    return labelMap[fieldName] || fieldName.replace(/_/g, ' ').toUpperCase();\n  };\n\n  if (isLoading) {\n    return (\n      <Card className={className}>\n        <CardContent className=\"flex items-center justify-center py-12\">\n          <Loader2 className=\"h-8 w-8 animate-spin\" />\n          <span className=\"ml-2\">Loading institutional claim data...</span>\n        </CardContent>\n      </Card>\n    );\n  }\n\n  return (\n    <div className={className}>\n      <Card>\n        <CardHeader>\n          <div className=\"flex items-center justify-between\">\n            <div>\n              <CardTitle className=\"flex items-center gap-2\">\n                <Building2 className=\"h-5 w-5\" />\n                UB-04 Form Generator\n              </CardTitle>\n              <div className=\"flex items-center gap-2 mt-2\">\n                <span className=\"text-sm text-gray-600\">Institutional Claim ID: {claimId}</span>\n                <Badge variant=\"outline\">UB-04</Badge>\n              </div>\n            </div>\n            \n            <div className=\"flex items-center gap-2\">\n              <DropdownMenu>\n                <DropdownMenuTrigger asChild>\n                  <Button variant=\"outline\" size=\"sm\">\n                    <Settings className=\"h-4 w-4 mr-2\" />\n                    Options\n                  </Button>\n                </DropdownMenuTrigger>\n                <DropdownMenuContent align=\"end\">\n                  <DropdownMenuLabel>Generation Options</DropdownMenuLabel>\n                  <DropdownMenuSeparator />\n                  <DropdownMenuItem\n                    onClick={() => setGenerationOptions(prev => ({\n                      ...prev,\n                      includeFormBackground: !prev.includeFormBackground\n                    }))}\n                  >\n                    <FileCheck className=\"h-4 w-4 mr-2\" />\n                    {generationOptions.includeFormBackground ? '✓' : ''} Form Background\n                  </DropdownMenuItem>\n                  <DropdownMenuItem\n                    onClick={() => setGenerationOptions(prev => ({\n                      ...prev,\n                      isDraft: !prev.isDraft\n                    }))}\n                  >\n                    <AlertTriangle className=\"h-4 w-4 mr-2\" />\n                    {generationOptions.isDraft ? '✓' : ''} Draft Watermark\n                  </DropdownMenuItem>\n                </DropdownMenuContent>\n              </DropdownMenu>\n              \n              <Button\n                variant=\"outline\"\n                size=\"sm\"\n                onClick={printForm}\n                disabled={!validationResult?.isValid}\n              >\n                <Printer className=\"h-4 w-4 mr-2\" />\n                Print\n              </Button>\n              \n              <Button\n                onClick={() => generateForm()}\n                disabled={isGenerating || !validationResult?.isValid}\n              >\n                {isGenerating ? (\n                  <Loader2 className=\"h-4 w-4 mr-2 animate-spin\" />\n                ) : (\n                  <Download className=\"h-4 w-4 mr-2\" />\n                )}\n                Generate PDF\n              </Button>\n            </div>\n          </div>\n        </CardHeader>\n        \n        <CardContent>\n          <Tabs value={activeTab} onValueChange={setActiveTab}>\n            <TabsList className=\"grid w-full grid-cols-6\">\n              <TabsTrigger value=\"preview\">Preview</TabsTrigger>\n              <TabsTrigger value=\"validation\">Validation</TabsTrigger>\n              <TabsTrigger value=\"revenue\">Revenue Codes</TabsTrigger>\n              <TabsTrigger value=\"diagnosis\">Diagnoses</TabsTrigger>\n              <TabsTrigger value=\"facility\">Facility Info</TabsTrigger>\n              <TabsTrigger value=\"history\">History</TabsTrigger>\n            </TabsList>\n            \n            <TabsContent value=\"preview\" className=\"mt-6\">\n              {renderFormPreview()}\n            </TabsContent>\n            \n            <TabsContent value=\"validation\" className=\"mt-6\">\n              {renderValidationStatus()}\n            </TabsContent>\n            \n            <TabsContent value=\"revenue\" className=\"mt-6\">\n              {renderRevenueCodeManagement()}\n            </TabsContent>\n            \n            <TabsContent value=\"diagnosis\" className=\"mt-6\">\n              {renderDiagnosisCodeManagement()}\n            </TabsContent>\n            \n            <TabsContent value=\"facility\" className=\"mt-6\">\n              {renderFacilityInfo()}\n            </TabsContent>\n            \n            <TabsContent value=\"history\" className=\"mt-6\">\n              {renderGenerationHistory()}\n            </TabsContent>\n          </Tabs>\n        </CardContent>\n      </Card>\n      \n      {/* Revenue Code Dialog */}\n      <RevenueCodeDialog\n        isOpen={showRevenueDialog}\n        onClose={() => {\n          setShowRevenueDialog(false);\n          setEditingRevenueLine(null);\n        }}\n        onSave={saveRevenueLine}\n        editingLine={editingRevenueLine}\n        validateRevenueCode={validateRevenueCode}\n      />\n      \n      {/* Diagnosis Code Dialog */}\n      <DiagnosisCodeDialog\n        isOpen={showDiagnosisDialog}\n        onClose={() => {\n          setShowDiagnosisDialog(false);\n          setEditingDiagnosis(null);\n        }}\n        onSave={saveDiagnosisCode}\n        editingDiagnosis={editingDiagnosis}\n      />\n    </div>\n  );\n};\n\nexport default UB04FormViewer;"