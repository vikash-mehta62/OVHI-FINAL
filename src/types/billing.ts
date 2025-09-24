// Shared billing types to ensure consistency across components

export interface BillItem {
  id: number;
  bill_id: number;
  service_id: number;
  service_name: string;
  service_code: string;
  quantity: number;
  unit_price: number;
  line_total?: number;
}

export interface Bill {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_email?: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
  physician_name?: string;
  items: BillItem[];
}

export interface Payment {
  id: number;
  bill_id?: number;
  invoice_id?: number;
  patient_name: string;
  patient_email?: string;
  payment_method: string;
  transaction_id?: string;
  amount: number;
  amount_paid?: number; // For compatibility
  payment_date: string;
  paid_at?: string;
  gateway_response?: any;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  notes?: string;
  bill_total_amount?: number;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  bill_id: number;
  patient_id: number;
  patient_name: string;
  patient_email?: string;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  issued_date: string;
  due_date: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  items: Array<{
    id: number;
    invoice_id: number;
    service_id: number;
    service_name: string;
    service_code: string;
    quantity: number;
    unit_price: number;
  }>;
  payments: Payment[];
}