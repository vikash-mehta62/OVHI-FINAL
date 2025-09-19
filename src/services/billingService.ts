import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance with interceptors
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add request interceptor to include auth token from cookies
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      console.error('Authentication failed. Please login again.');
      // You can add redirect logic here if needed
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Service {
  service_id: number;
  name: string;
  description: string;
  cpt_codes: string;
  price: number;
  created_at: string;
}

export interface Patient {
  id: number;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  insurance_provider: string;
  insurance_id: string;
}

export interface BillItem {
  service_id: number;
  quantity: number;
  unit_price?: number;
}

export interface Bill {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  status: 'draft' | 'finalized';
  total_amount: number;
  notes: string;
  items: Array<{
    id: number;
    service_id: number;
    service_name: string;
    service_code: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  bill_id: number;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  patient_address: string;
  insurance_provider: string;
  insurance_id: string;
  status: 'pending' | 'paid' | 'discarded' | 'overdue';
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  due_date: string;
  notes: string;
  items: Array<{
    id: number;
    service_id: number;
    service_name: string;
    service_code: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  payments: Array<{
    id: number;
    amount_paid: number;
    payment_method: string;
    transaction_id: string;
    reference_number: string;
    notes: string;
    paid_at: string;
  }>;
  created_at: string;
}

export interface PaymentData {
  invoice_id: number;
  amount_paid: number;
  payment_method: 'cash' | 'card' | 'check' | 'bank_transfer' | 'insurance';
  transaction_id?: string;
  reference_number?: string;
  notes?: string;
}

class BillingService {
  // Create bill draft
  async createBill(billData: {
    patient_id: number;
    items: BillItem[];
    notes?: string;
    total?: number;
  }): Promise<Bill> {
    const response = await apiClient.post('/billings/bills', billData);
    return response.data.data;
  }

  // Get bill by ID
  async getBillById(billId: number): Promise<Bill> {
    const response = await apiClient.get(`/billings/bills/${billId}`);
    return response.data.data;
  }

  // Generate invoice from bill
  async generateInvoice(billId: number): Promise<Invoice> {
    const response = await apiClient.post(`/billings/invoices/${billId}/generate`);
    return response.data.data;
  }

  // Get invoice by ID
  async getInvoiceById(invoiceId: number): Promise<Invoice> {
    const response = await apiClient.get(`/billings/invoices/${invoiceId}`);
    return response.data.data;
  }

  // Record payment
  async recordPayment(paymentData: PaymentData): Promise<Invoice> {
    const response = await apiClient.post('/billings/payments', paymentData);
    return response.data.data;
  }

  // Get all invoices with filters
  async getInvoices(filters?: {
    status?: string;
    patient_id?: number;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }): Promise<Invoice[]> {
    const response = await apiClient.get('/billings/invoices', { params: filters });
    return response.data.data;
  }

  // Get all services
  async getServices(): Promise<Service[]> {
    const response = await apiClient.get('/billings/services');
    return response.data.data;
  }

  // Get all patients
  async getPatients(): Promise<Patient[]> {
    const response = await apiClient.get('/billings/patients');
    return response.data.data;
  }

  // Update invoice status
  async updateInvoiceStatus(invoiceId: number, status: string): Promise<Invoice> {
    const response = await apiClient.patch(`/billings/invoices/${invoiceId}/status`, { status });
    return response.data.data;
  }

  // Search patients
  async searchPatients(searchTerm: string): Promise<Array<{patient_id: number, patient_name: string}>> {
    const response = await apiClient.post('/billings/search-patients', { searchTerm });
    return response.data.data;
  }

  // Get all bills
  async getAllBills(): Promise<Array<{
    id: number;
    patient_id: number;
    status: string;
    total_amount: number;
    patient_name: string;
    physician_name?: string;
    created_at: string;
    items: Array<{
      id: number;
      bill_id: number;
      service_id: number;
      quantity: number;
      unit_price: number;
      service_name: string;
      service_code: string;
    }>;
  }>> {
    const response = await apiClient.get('/billings/get-all-bills');
    return response.data.data;
  }

  // Update bill status
  async updateBillStatus(billId: number, status: string): Promise<void> {
    const response = await apiClient.patch(`/billings/bills/${billId}/status`, { status });
    return response.data.data;
  }

  // Update bill items
  async updateBillItems(billData: {
    bill_id: number;
    items: Array<{
      service_id: number;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<{success: boolean; totalAmount: number; message: string}> {
    const response = await apiClient.put(`/billings/bills/${billData.bill_id}/items`, billData);
    return response.data;
  }

  // Get aging report (placeholder method)
  async getAgingReport(): Promise<any[]> {
    try {
      // This would be a real aging report endpoint when available
      const response = await apiClient.get('/billings/reports/aging');
      return response.data.data;
    } catch (error) {
      console.warn('Aging report endpoint not available');
      return [];
    }
  }

  // Get bill data formatted for PDF generation (without creating invoice)
  async getBillForPDF(billId: number): Promise<{
    invoice_number: string;
    bill_id: number;
    patient_name: string;
    patient_email?: string;
    patient_phone?: string;
    patient_address?: string;
    insurance_provider?: string;
    insurance_id?: string;
    physician_name?: string;
    issued_date: string;
    due_date: string;
    total_amount: number;
    amount_paid: number;
    balance_due: number;
    status: string;
    notes?: string;
    items: Array<{
      service_name: string;
      service_code: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }>;
    payments: Array<any>;
  }> {
    const response = await apiClient.get(`/billings/bills/${billId}/pdf-data`);
    return response.data.data;
  }

  // Generate and download invoice PDF
  async generateAndDownloadInvoicePDF(billId: number): Promise<Invoice> {
    // First generate the invoice
    const invoice = await this.generateInvoice(billId);
    
    // Get full invoice details with items and payments
    const fullInvoice = await this.getInvoiceById(invoice.id);
    
    return fullInvoice;
  }
}

export default new BillingService();