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
  Eye
} from 'lucide-react';
import { 
  generatePatientStatementAPI, 
  getPatientStatementsAPI, 
  sendPatientStatementAPI 
} from '@/services/operations/rcm';

interface PatientStatement {
  statement_id: number;
  patient_id: number;
  patient_name: string;
  statement_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
  created_at: string;
  sent_date?: string;
}

const PatientStatements: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [statements, setStatements] = useState<PatientStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<PatientStatement | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const [generateForm, setGenerateForm] = useState({
    patient_id: '',
    statement_date: new Date().toISOString().split('T')[0],
    include_paid: false,
    custom_message: ''
  });

  const [sendForm, setSendForm] = useState({
    send_method: 'email',
    email_address: '',
    custom_message: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const fetchStatements = async () => {
    try {
      setLoading(true);
      const response = await getPatientStatementsAPI(token, {
        page: pagination.page,
        limit: pagination.limit
      });
      
      if (response.success) {
        setStatements(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching statements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatements();
  }, [pagination.page]);

  const handleGenerateStatement = async () => {
    try {
      setGenerating(true);
      const response = await generatePatientStatementAPI(token, generateForm.patient_id, {
        statement_date: generateForm.statement_date,
        include_paid: generateForm.include_paid,
        custom_message: generateForm.custom_message
      });

      if (response.success) {
        setShowGenerateDialog(false);
        setGenerateForm({
          patient_id: '',
          statement_date: new Date().toISOString().split('T')[0],
          include_paid: false,
          custom_message: ''
        });
        fetchStatements();
      }
    } catch (error) {
      console.error('Error generating statement:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendStatement = async () => {
    if (!selectedStatement) return;

    try {
      setSending(true);
      const response = await sendPatientStatementAPI(token, selectedStatement.statement_id, {
        send_method: sendForm.send_method,
        email_address: sendForm.email_address,
        custom_message: sendForm.custom_message
      });

      if (response.success) {
        setShowSendDialog(false);
        setSendForm({
          send_method: 'email',
          email_address: '',
          custom_message: ''
        });
        setSelectedStatement(null);
        fetchStatements();
      }
    } catch (error) {
      console.error('Error sending statement:', error);
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-500', text: 'Draft' },
      generated: { color: 'bg-blue-500', text: 'Generated' },
      sent: { color: 'bg-green-500', text: 'Sent' },
      paid: { color: 'bg-green-600', text: 'Paid' },
      partial_paid: { color: 'bg-yellow-500', text: 'Partial' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Patient Statements</h2>
          <p className="text-muted-foreground">
            Generate and manage patient billing statements
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchStatements}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generate Statement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Patient Statement</DialogTitle>
                <DialogDescription>
                  Create a new billing statement for a patient
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="patient_id">Patient ID</Label>
                  <Input
                    id="patient_id"
                    type="number"
                    value={generateForm.patient_id}
                    onChange={(e) => setGenerateForm({...generateForm, patient_id: e.target.value})}
                    placeholder="Enter patient ID"
                  />
                </div>
                <div>
                  <Label htmlFor="statement_date">Statement Date</Label>
                  <Input
                    id="statement_date"
                    type="date"
                    value={generateForm.statement_date}
                    onChange={(e) => setGenerateForm({...generateForm, statement_date: e.target.value})}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="include_paid"
                    checked={generateForm.include_paid}
                    onChange={(e) => setGenerateForm({...generateForm, include_paid: e.target.checked})}
                  />
                  <Label htmlFor="include_paid">Include paid services</Label>
                </div>
                <div>
                  <Label htmlFor="custom_message">Custom Message (Optional)</Label>
                  <Textarea
                    id="custom_message"
                    value={generateForm.custom_message}
                    onChange={(e) => setGenerateForm({...generateForm, custom_message: e.target.value})}
                    placeholder="Add a custom message to the statement"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleGenerateStatement} disabled={generating}>
                    {generating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{statements.length}</div>
                <div className="text-sm text-gray-600">Total Statements</div>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {statements.filter(s => s.status === 'sent').length}
                </div>
                <div className="text-sm text-gray-600">Sent</div>
              </div>
              <Send className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {statements.filter(s => s.status === 'generated').length}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(statements.reduce((sum, s) => sum + s.balance_due, 0))}
                </div>
                <div className="text-sm text-gray-600">Total Outstanding</div>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Statements</CardTitle>
          <CardDescription>
            {pagination.total} total statements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading statements...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Statement Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Balance Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((statement) => (
                    <TableRow key={statement.statement_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{statement.patient_name}</div>
                          <div className="text-sm text-gray-600">
                            ID: {statement.patient_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {formatDate(statement.statement_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(statement.total_amount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-red-600">
                          {formatCurrency(statement.balance_due)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(statement.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          {statement.status === 'generated' && (
                            <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm"
                                  onClick={() => setSelectedStatement(statement)}
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  Send
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Send Patient Statement</DialogTitle>
                                  <DialogDescription>
                                    Send statement to {statement.patient_name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="send_method">Send Method</Label>
                                    <Select 
                                      value={sendForm.send_method} 
                                      onValueChange={(value) => setSendForm({...sendForm, send_method: value})}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="mail">Postal Mail</SelectItem>
                                        <SelectItem value="portal">Patient Portal</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {sendForm.send_method === 'email' && (
                                    <div>
                                      <Label htmlFor="email_address">Email Address</Label>
                                      <Input
                                        id="email_address"
                                        type="email"
                                        value={sendForm.email_address}
                                        onChange={(e) => setSendForm({...sendForm, email_address: e.target.value})}
                                        placeholder="patient@email.com"
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <Label htmlFor="send_message">Additional Message (Optional)</Label>
                                    <Textarea
                                      id="send_message"
                                      value={sendForm.custom_message}
                                      onChange={(e) => setSendForm({...sendForm, custom_message: e.target.value})}
                                      placeholder="Add a message to include with the statement"
                                      rows={3}
                                    />
                                  </div>
                                  <div className="flex justify-end space-x-2">
                                    <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                                      Cancel
                                    </Button>
                                    <Button onClick={handleSendStatement} disabled={sending}>
                                      {sending ? (
                                        <>
                                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                          Sending...
                                        </>
                                      ) : (
                                        <>
                                          <Send className="h-4 w-4 mr-2" />
                                          Send Statement
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} statements
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientStatements;