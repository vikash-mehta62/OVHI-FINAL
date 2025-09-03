import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  FileText,
  Mail,
  Printer,
  Download,
  Send,
  Calendar,
  DollarSign,
  User,
  RefreshCw,
  Plus,
  Eye,
  Search,
  Filter,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  CreditCard
} from 'lucide-react';

interface PatientStatement {
  id: string;
  statementNumber: string;
  patientId: string;
  patientName: string;
  patientAddress: string;
  patientPhone: string;
  patientEmail: string;
  statementDate: string;
  dueDate: string;
  totalAmount: number;
  previousBalance: number;
  newCharges: number;
  payments: number;
  adjustments: number;
  currentBalance: number;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue';
  deliveryMethod: 'mail' | 'email' | 'portal';
  lastSentDate: string;
  viewedDate?: string;
  paymentDate?: string;
  services: Array<{
    date: string;
    description: string;
    amount: number;
    provider: string;
  }>;
}

interface StatementTemplate {
  id: string;
  name: string;
  description: string;
  headerText: string;
  footerText: string;
  paymentInstructions: string;
  isDefault: boolean;
}

const PatientStatements: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [statements, setStatements] = useState<PatientStatement[]>([]);
  const [templates, setTemplates] = useState<StatementTemplate[]>([]);
  const [selectedStatements, setSelectedStatements] = useState<string[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<PatientStatement | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showBulkSend, setShowBulkSend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sample data
  useEffect(() => {
    const sampleStatements: PatientStatement[] = [
      {
        id: '1',
        statementNumber: 'STMT-2024-001',
        patientId: 'PAT001',
        patientName: 'John Smith',
        patientAddress: '123 Main St, Anytown, ST 12345',
        patientPhone: '(555) 123-4567',
        patientEmail: 'john.smith@email.com',
        statementDate: '2024-01-15',
        dueDate: '2024-02-14',
        totalAmount: 450.00,
        previousBalance: 0.00,
        newCharges: 450.00,
        payments: 0.00,
        adjustments: 0.00,
        currentBalance: 450.00,
        status: 'sent',
        deliveryMethod: 'email',
        lastSentDate: '2024-01-15',
        services: [
          {
            date: '2024-01-10',
            description: 'Office Visit - Routine Checkup',
            amount: 250.00,
            provider: 'Dr. Sarah Johnson'
          },
          {
            date: '2024-01-10',
            description: 'Laboratory Tests',
            amount: 200.00,
            provider: 'Lab Services'
          }
        ]
      },
      {
        id: '2',
        statementNumber: 'STMT-2024-002',
        patientId: 'PAT002',
        patientName: 'Jane Doe',
        patientAddress: '456 Oak Ave, Somewhere, ST 67890',
        patientPhone: '(555) 987-6543',
        patientEmail: 'jane.doe@email.com',
        statementDate: '2024-01-12',
        dueDate: '2024-02-11',
        totalAmount: 280.00,
        previousBalance: 50.00,
        newCharges: 280.00,
        payments: 50.00,
        adjustments: 0.00,
        currentBalance: 280.00,
        status: 'paid',
        deliveryMethod: 'mail',
        lastSentDate: '2024-01-12',
        paymentDate: '2024-01-18',
        services: [
          {
            date: '2024-01-08',
            description: 'Specialist Consultation',
            amount: 280.00,
            provider: 'Dr. Mike Wilson'
          }
        ]
      },
      {
        id: '3',
        statementNumber: 'STMT-2024-003',
        patientId: 'PAT003',
        patientName: 'Bob Johnson',
        patientAddress: '789 Pine St, Elsewhere, ST 13579',
        patientPhone: '(555) 456-7890',
        patientEmail: 'bob.johnson@email.com',
        statementDate: '2023-12-15',
        dueDate: '2024-01-14',
        totalAmount: 650.00,
        previousBalance: 200.00,
        newCharges: 450.00,
        payments: 0.00,
        adjustments: 0.00,
        currentBalance: 650.00,
        status: 'overdue',
        deliveryMethod: 'email',
        lastSentDate: '2023-12-15',
        services: [
          {
            date: '2023-12-10',
            description: 'Emergency Room Visit',
            amount: 450.00,
            provider: 'Emergency Department'
          }
        ]
      }
    ];

    const sampleTemplates: StatementTemplate[] = [
      {
        id: '1',
        name: 'Standard Statement',
        description: 'Default patient statement template',
        headerText: 'Thank you for choosing our healthcare services.',
        footerText: 'Please remit payment within 30 days of statement date.',
        paymentInstructions: 'Payment can be made online, by phone, or by mail.',
        isDefault: true
      },
      {
        id: '2',
        name: 'Friendly Reminder',
        description: 'Gentle reminder template for overdue accounts',
        headerText: 'We hope you are doing well. This is a friendly reminder about your account balance.',
        footerText: 'If you have any questions about your bill, please contact our billing department.',
        paymentInstructions: 'Multiple payment options are available for your convenience.',
        isDefault: false
      }
    ];

    setStatements(sampleStatements);
    setTemplates(sampleTemplates);
  }, []);

  const filteredStatements = statements.filter(statement => {
    const matchesStatus = filterStatus === 'all' || statement.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      statement.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      statement.statementNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      statement.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'viewed': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'sent': return <Send className="w-4 h-4" />;
      case 'viewed': return <Eye className="w-4 h-4" />;
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleSelectStatement = (statementId: string, checked: boolean) => {
    if (checked) {
      setSelectedStatements(prev => [...prev, statementId]);
    } else {
      setSelectedStatements(prev => prev.filter(id => id !== statementId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStatements(filteredStatements.map(s => s.id));
    } else {
      setSelectedStatements([]);
    }
  };

  const handlePreviewStatement = (statement: PatientStatement) => {
    setSelectedStatement(statement);
    setShowPreview(true);
  };

  const handleSendStatement = async (statementId: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStatements(prev => prev.map(statement => 
        statement.id === statementId 
          ? { 
              ...statement, 
              status: 'sent', 
              lastSentDate: new Date().toISOString().split('T')[0] 
            }
          : statement
      ));
      
      toast.success('Statement sent successfully');
    } catch (error) {
      toast.error('Failed to send statement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkSend = async () => {
    if (selectedStatements.length === 0) {
      toast.info('Please select statements to send');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate bulk send
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setStatements(prev => prev.map(statement => 
        selectedStatements.includes(statement.id)
          ? { 
              ...statement, 
              status: 'sent', 
              lastSentDate: new Date().toISOString().split('T')[0] 
            }
          : statement
      ));
      
      setSelectedStatements([]);
      setShowBulkSend(false);
      toast.success(`${selectedStatements.length} statements sent successfully`);
    } catch (error) {
      toast.error('Failed to send statements');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateStatements = async () => {
    setIsLoading(true);
    try {
      // Simulate statement generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('New statements generated successfully');
    } catch (error) {
      toast.error('Failed to generate statements');
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    totalStatements: statements.length,
    sentStatements: statements.filter(s => s.status === 'sent').length,
    paidStatements: statements.filter(s => s.status === 'paid').length,
    overdueStatements: statements.filter(s => s.status === 'overdue').length,
    totalAmount: statements.reduce((sum, s) => sum + s.currentBalance, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Patient Statements</h2>
          <p className="text-gray-600">Generate, send, and track patient billing statements</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setShowBulkSend(true)}
            disabled={selectedStatements.length === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Bulk Send ({selectedStatements.length})
          </Button>
          <Button 
            onClick={handleGenerateStatements}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Generate Statements
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Statement
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Statements</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalStatements}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sent</p>
                <p className="text-2xl font-bold text-green-600">{stats.sentStatements}</p>
              </div>
              <Send className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.paidStatements}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdueStatements}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${stats.totalAmount.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="statements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="statements">Statements</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="statements" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by patient name, statement number, or patient ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="viewed">Viewed</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Statements Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Patient Statements ({filteredStatements.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedStatements.length === filteredStatements.length && filteredStatements.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-gray-600">Select All</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Statement #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Statement Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Last Sent</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStatements.map((statement) => (
                      <TableRow key={statement.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStatements.includes(statement.id)}
                            onCheckedChange={(checked) => handleSelectStatement(statement.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{statement.statementNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{statement.patientName}</p>
                            <p className="text-sm text-gray-500">{statement.patientId}</p>
                          </div>
                        </TableCell>
                        <TableCell>{statement.statementDate}</TableCell>
                        <TableCell>
                          <span className={
                            new Date(statement.dueDate) < new Date() && statement.status !== 'paid'
                              ? 'text-red-600 font-bold' 
                              : ''
                          }>
                            {statement.dueDate}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="font-bold">${statement.currentBalance.toFixed(2)}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(statement.status)}>
                            {getStatusIcon(statement.status)}
                            <span className="ml-1 capitalize">{statement.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {statement.deliveryMethod === 'email' ? <Mail className="w-3 h-3 mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
                            {statement.deliveryMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>{statement.lastSentDate || 'Never'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreviewStatement(statement)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            {statement.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => handleSendStatement(statement.id)}
                                disabled={isLoading}
                              >
                                <Send className="w-3 h-3" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline">
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statement Templates</CardTitle>
              <CardDescription>
                Manage templates for patient statements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {template.isDefault && (
                          <Badge variant="default">Default</Badge>
                        )}
                        <Button size="sm" variant="outline">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">
                      <p><strong>Header:</strong> {template.headerText}</p>
                      <p><strong>Footer:</strong> {template.footerText}</p>
                      <p><strong>Payment Instructions:</strong> {template.paymentInstructions}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statement Settings</CardTitle>
              <CardDescription>
                Configure statement generation and delivery settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Default Delivery Method</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="mail">Mail</SelectItem>
                        <SelectItem value="portal">Patient Portal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Statement Frequency</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label>Minimum Balance for Statement</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                
                <div>
                  <Label>Days Before Due Date</Label>
                  <Input type="number" placeholder="30" />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="auto-send" />
                  <Label htmlFor="auto-send">Automatically send statements when generated</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="include-aging" />
                  <Label htmlFor="include-aging">Include aging summary on statements</Label>
                </div>

                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Statement Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Statement Preview</DialogTitle>
            <DialogDescription>
              {selectedStatement && `${selectedStatement.statementNumber} - ${selectedStatement.patientName}`}
            </DialogDescription>
          </DialogHeader>
          {selectedStatement && (
            <div className="space-y-4">
              <div className="border rounded-lg p-6 bg-white">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold">Healthcare Practice</h3>
                  <p className="text-gray-600">123 Medical Center Dr, Healthcare City, HC 12345</p>
                  <p className="text-gray-600">Phone: (555) 123-4567</p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-bold mb-2">Bill To:</h4>
                    <p>{selectedStatement.patientName}</p>
                    <p>{selectedStatement.patientAddress}</p>
                    <p>{selectedStatement.patientPhone}</p>
                  </div>
                  <div>
                    <h4 className="font-bold mb-2">Statement Details:</h4>
                    <p><strong>Statement #:</strong> {selectedStatement.statementNumber}</p>
                    <p><strong>Statement Date:</strong> {selectedStatement.statementDate}</p>
                    <p><strong>Due Date:</strong> {selectedStatement.dueDate}</p>
                    <p><strong>Patient ID:</strong> {selectedStatement.patientId}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-bold mb-3">Account Summary</h4>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="border rounded p-3">
                      <p className="text-sm text-gray-600">Previous Balance</p>
                      <p className="font-bold">${selectedStatement.previousBalance.toFixed(2)}</p>
                    </div>
                    <div className="border rounded p-3">
                      <p className="text-sm text-gray-600">New Charges</p>
                      <p className="font-bold">${selectedStatement.newCharges.toFixed(2)}</p>
                    </div>
                    <div className="border rounded p-3">
                      <p className="text-sm text-gray-600">Payments</p>
                      <p className="font-bold">${selectedStatement.payments.toFixed(2)}</p>
                    </div>
                    <div className="border rounded p-3 bg-blue-50">
                      <p className="text-sm text-gray-600">Current Balance</p>
                      <p className="font-bold text-blue-600">${selectedStatement.currentBalance.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-bold mb-3">Service Details</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedStatement.services.map((service, index) => (
                        <TableRow key={index}>
                          <TableCell>{service.date}</TableCell>
                          <TableCell>{service.description}</TableCell>
                          <TableCell>{service.provider}</TableCell>
                          <TableCell className="text-right">${service.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="text-center text-sm text-gray-600">
                  <p>Payment is due within 30 days of statement date.</p>
                  <p>For questions about your bill, please call (555) 123-4567.</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
                <Button variant="outline">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button>
                  <Send className="w-4 h-4 mr-2" />
                  Send Statement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Send Dialog */}
      <Dialog open={showBulkSend} onOpenChange={setShowBulkSend}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Send Statements</DialogTitle>
            <DialogDescription>
              Send {selectedStatements.length} selected statements
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Delivery Method</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="mail">Mail</SelectItem>
                  <SelectItem value="both">Both Email and Mail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Template</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBulkSend(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkSend} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Statements
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientStatements;
// import { 
//   generatePatientStatementAPI, 
//   getPatientStatementsAPI, 
//   sendPatientStatementAPI 
// } from '@/services/operations/rcm';
// import { formatCurrency, formatDate } from '@/utils/rcmFormatters';

// interface PatientStatement {
//   statement_id: number;
//   patient_id: number;
//   patient_name: string;
//   statement_date: string;
//   total_amount: number;
//   balance_due: number;
//   status: string;
//   created_at: string;
//   sent_date?: string;
// }

// const PatientStatements: React.FC = () => {
//   const { token } = useSelector((state: any) => state.auth);
//   const [statements, setStatements] = useState<PatientStatement[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showGenerateDialog, setShowGenerateDialog] = useState(false);
//   const [showSendDialog, setShowSendDialog] = useState(false);
//   const [selectedStatement, setSelectedStatement] = useState<PatientStatement | null>(null);
//   const [generating, setGenerating] = useState(false);
//   const [sending, setSending] = useState(false);

//   const [generateForm, setGenerateForm] = useState({
//     patient_id: '',
//     statement_date: new Date().toISOString().split('T')[0],
//     include_paid: false,
//     custom_message: ''
//   });

//   const [sendForm, setSendForm] = useState({
//     send_method: 'email',
//     email_address: '',
//     custom_message: ''
//   });

//   const [pagination, setPagination] = useState({
//     page: 1,
//     limit: 10,
//     total: 0,
//     totalPages: 0
//   });

//   const fetchStatements = async () => {
//     try {
//       setLoading(true);
//       const response = await getPatientStatementsAPI(token, {
//         page: pagination.page,
//         limit: pagination.limit
//       });
      
//       if (response.success) {
//         setStatements(response.data);
//         setPagination(response.pagination);
//       }
//     } catch (error) {
//       console.error('Error fetching statements:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchStatements();
//   }, [pagination.page]);

//   const handleGenerateStatement = async () => {
//     try {
//       setGenerating(true);
//       const response = await generatePatientStatementAPI(token, generateForm.patient_id, {
//         statement_date: generateForm.statement_date,
//         include_paid: generateForm.include_paid,
//         custom_message: generateForm.custom_message
//       });

//       if (response.success) {
//         setShowGenerateDialog(false);
//         setGenerateForm({
//           patient_id: '',
//           statement_date: new Date().toISOString().split('T')[0],
//           include_paid: false,
//           custom_message: ''
//         });
//         fetchStatements();
//       }
//     } catch (error) {
//       console.error('Error generating statement:', error);
//     } finally {
//       setGenerating(false);
//     }
//   };

//   const handleSendStatement = async () => {
//     if (!selectedStatement) return;

//     try {
//       setSending(true);
//       const response = await sendPatientStatementAPI(token, selectedStatement.statement_id, {
//         send_method: sendForm.send_method,
//         email_address: sendForm.email_address,
//         custom_message: sendForm.custom_message
//       });

//       if (response.success) {
//         setShowSendDialog(false);
//         setSendForm({
//           send_method: 'email',
//           email_address: '',
//           custom_message: ''
//         });
//         setSelectedStatement(null);
//         fetchStatements();
//       }
//     } catch (error) {
//       console.error('Error sending statement:', error);
//     } finally {
//       setSending(false);
//     }
//   };

//   const getStatusBadge = (status: string) => {
//     const statusConfig = {
//       draft: { color: 'bg-gray-500', text: 'Draft' },
//       generated: { color: 'bg-blue-500', text: 'Generated' },
//       sent: { color: 'bg-green-500', text: 'Sent' },
//       paid: { color: 'bg-green-600', text: 'Paid' },
//       partial_paid: { color: 'bg-yellow-500', text: 'Partial' }
//     };
    
//     const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
//     return (
//       <Badge className={`${config.color} text-white`}>
//         {config.text}
//       </Badge>
//     );
//   };



//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex justify-between items-center">
//         <div>
//           <h2 className="text-2xl font-bold">Patient Statements</h2>
//           <p className="text-muted-foreground">
//             Generate and manage patient billing statements
//           </p>
//         </div>
//         <div className="flex items-center space-x-2">
//           <Button variant="outline" onClick={fetchStatements}>
//             <RefreshCw className="h-4 w-4 mr-2" />
//             Refresh
//           </Button>
//           <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
//             <DialogTrigger asChild>
//               <Button>
//                 <Plus className="h-4 w-4 mr-2" />
//                 Generate Statement
//               </Button>
//             </DialogTrigger>
//             <DialogContent>
//               <DialogHeader>
//                 <DialogTitle>Generate Patient Statement</DialogTitle>
//                 <DialogDescription>
//                   Create a new billing statement for a patient
//                 </DialogDescription>
//               </DialogHeader>
//               <div className="space-y-4">
//                 <div>
//                   <Label htmlFor="patient_id">Patient ID</Label>
//                   <Input
//                     id="patient_id"
//                     type="number"
//                     value={generateForm.patient_id}
//                     onChange={(e) => setGenerateForm({...generateForm, patient_id: e.target.value})}
//                     placeholder="Enter patient ID"
//                   />
//                 </div>
//                 <div>
//                   <Label htmlFor="statement_date">Statement Date</Label>
//                   <Input
//                     id="statement_date"
//                     type="date"
//                     value={generateForm.statement_date}
//                     onChange={(e) => setGenerateForm({...generateForm, statement_date: e.target.value})}
//                   />
//                 </div>
//                 <div className="flex items-center space-x-2">
//                   <input
//                     type="checkbox"
//                     id="include_paid"
//                     checked={generateForm.include_paid}
//                     onChange={(e) => setGenerateForm({...generateForm, include_paid: e.target.checked})}
//                   />
//                   <Label htmlFor="include_paid">Include paid services</Label>
//                 </div>
//                 <div>
//                   <Label htmlFor="custom_message">Custom Message (Optional)</Label>
//                   <Textarea
//                     id="custom_message"
//                     value={generateForm.custom_message}
//                     onChange={(e) => setGenerateForm({...generateForm, custom_message: e.target.value})}
//                     placeholder="Add a custom message to the statement"
//                     rows={3}
//                   />
//                 </div>
//                 <div className="flex justify-end space-x-2">
//                   <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
//                     Cancel
//                   </Button>
//                   <Button onClick={handleGenerateStatement} disabled={generating}>
//                     {generating ? (
//                       <>
//                         <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
//                         Generating...
//                       </>
//                     ) : (
//                       <>
//                         <FileText className="h-4 w-4 mr-2" />
//                         Generate
//                       </>
//                     )}
//                   </Button>
//                 </div>
//               </div>
//             </DialogContent>
//           </Dialog>
//         </div>
//       </div>

//       {/* Summary Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <div className="text-2xl font-bold">{statements.length}</div>
//                 <div className="text-sm text-gray-600">Total Statements</div>
//               </div>
//               <FileText className="h-8 w-8 text-blue-500" />
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <div className="text-2xl font-bold text-green-600">
//                   {statements.filter(s => s.status === 'sent').length}
//                 </div>
//                 <div className="text-sm text-gray-600">Sent</div>
//               </div>
//               <Send className="h-8 w-8 text-green-500" />
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <div className="text-2xl font-bold text-yellow-600">
//                   {statements.filter(s => s.status === 'generated').length}
//                 </div>
//                 <div className="text-sm text-gray-600">Pending</div>
//               </div>
//               <Calendar className="h-8 w-8 text-yellow-500" />
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <div className="text-2xl font-bold text-purple-600">
//                   {formatCurrency(statements.reduce((sum, s) => sum + s.balance_due, 0))}
//                 </div>
//                 <div className="text-sm text-gray-600">Total Outstanding</div>
//               </div>
//               <DollarSign className="h-8 w-8 text-purple-500" />
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Statements Table */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Patient Statements</CardTitle>
//           <CardDescription>
//             {pagination.total} total statements
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           {loading ? (
//             <div className="flex items-center justify-center py-8">
//               <RefreshCw className="h-8 w-8 animate-spin" />
//               <span className="ml-2">Loading statements...</span>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Patient</TableHead>
//                     <TableHead>Statement Date</TableHead>
//                     <TableHead>Total Amount</TableHead>
//                     <TableHead>Balance Due</TableHead>
//                     <TableHead>Status</TableHead>
//                     <TableHead>Actions</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {statements.map((statement) => (
//                     <TableRow key={statement.statement_id}>
//                       <TableCell>
//                         <div>
//                           <div className="font-medium">{statement.patient_name}</div>
//                           <div className="text-sm text-gray-600">
//                             ID: {statement.patient_id}
//                           </div>
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex items-center">
//                           <Calendar className="h-4 w-4 mr-2 text-gray-400" />
//                           {formatDate(statement.statement_date)}
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         <div className="font-medium">
//                           {formatCurrency(statement.total_amount)}
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         <div className="font-medium text-red-600">
//                           {formatCurrency(statement.balance_due)}
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         {getStatusBadge(statement.status)}
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex items-center space-x-2">
//                           <Button variant="outline" size="sm">
//                             <Eye className="h-4 w-4" />
//                           </Button>
//                           <Button variant="outline" size="sm">
//                             <Download className="h-4 w-4" />
//                           </Button>
//                           {statement.status === 'generated' && (
//                             <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
//                               <DialogTrigger asChild>
//                                 <Button 
//                                   size="sm"
//                                   onClick={() => setSelectedStatement(statement)}
//                                 >
//                                   <Send className="h-4 w-4 mr-1" />
//                                   Send
//                                 </Button>
//                               </DialogTrigger>
//                               <DialogContent>
//                                 <DialogHeader>
//                                   <DialogTitle>Send Patient Statement</DialogTitle>
//                                   <DialogDescription>
//                                     Send statement to {statement.patient_name}
//                                   </DialogDescription>
//                                 </DialogHeader>
//                                 <div className="space-y-4">
//                                   <div>
//                                     <Label htmlFor="send_method">Send Method</Label>
//                                     <Select 
//                                       value={sendForm.send_method} 
//                                       onValueChange={(value) => setSendForm({...sendForm, send_method: value})}
//                                     >
//                                       <SelectTrigger>
//                                         <SelectValue />
//                                       </SelectTrigger>
//                                       <SelectContent>
//                                         <SelectItem value="email">Email</SelectItem>
//                                         <SelectItem value="mail">Postal Mail</SelectItem>
//                                         <SelectItem value="portal">Patient Portal</SelectItem>
//                                       </SelectContent>
//                                     </Select>
//                                   </div>
//                                   {sendForm.send_method === 'email' && (
//                                     <div>
//                                       <Label htmlFor="email_address">Email Address</Label>
//                                       <Input
//                                         id="email_address"
//                                         type="email"
//                                         value={sendForm.email_address}
//                                         onChange={(e) => setSendForm({...sendForm, email_address: e.target.value})}
//                                         placeholder="patient@email.com"
//                                       />
//                                     </div>
//                                   )}
//                                   <div>
//                                     <Label htmlFor="send_message">Additional Message (Optional)</Label>
//                                     <Textarea
//                                       id="send_message"
//                                       value={sendForm.custom_message}
//                                       onChange={(e) => setSendForm({...sendForm, custom_message: e.target.value})}
//                                       placeholder="Add a message to include with the statement"
//                                       rows={3}
//                                     />
//                                   </div>
//                                   <div className="flex justify-end space-x-2">
//                                     <Button variant="outline" onClick={() => setShowSendDialog(false)}>
//                                       Cancel
//                                     </Button>
//                                     <Button onClick={handleSendStatement} disabled={sending}>
//                                       {sending ? (
//                                         <>
//                                           <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
//                                           Sending...
//                                         </>
//                                       ) : (
//                                         <>
//                                           <Send className="h-4 w-4 mr-2" />
//                                           Send Statement
//                                         </>
//                                       )}
//                                     </Button>
//                                   </div>
//                                 </div>
//                               </DialogContent>
//                             </Dialog>
//                           )}
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>

//               {/* Pagination */}
//               <div className="flex items-center justify-between">
//                 <div className="text-sm text-muted-foreground">
//                   Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} statements
//                 </div>
//                 <div className="flex items-center space-x-2">
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     disabled={pagination.page === 1}
//                     onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
//                   >
//                     Previous
//                   </Button>
//                   <span className="text-sm">
//                     Page {pagination.page} of {pagination.totalPages}
//                   </span>
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     disabled={pagination.page === pagination.totalPages}
//                     onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
//                   >
//                     Next
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

// export default PatientStatements;