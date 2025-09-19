import { apiConnector } from '../apiConnector';

const BASE_URL = "http://localhost:8000/api/v1";
const SERVICES_API_BASE = `${BASE_URL}/services`;

export interface Service {
  id: number;
  service_name: string;
  service_code: string;
  description?: string;
  unit_price: number;
  created_at: string;
}

export interface CreateServiceData {
  service_name: string;
  service_code: string;
  description?: string;
  unit_price: number;
}

export interface UpdateServiceData extends CreateServiceData {
  id: number;
}

class ServicesService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Get all services
  async getAllServices(): Promise<{ success: boolean; services: Service[]; message: string }> {
    try {
      const response = await apiConnector('GET', SERVICES_API_BASE, null, this.getAuthHeaders());
      return response.data;
    } catch (error: any) {
      console.error('Error fetching services:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch services');
    }
  }

  // Get service by ID
  async getServiceById(serviceId: number): Promise<{ success: boolean; service: Service; message: string }> {
    try {
      const response = await apiConnector('GET', `${SERVICES_API_BASE}/${serviceId}`, null, this.getAuthHeaders());
      return response.data;
    } catch (error: any) {
      console.error('Error fetching service:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch service');
    }
  }

  // Create new service
  async createService(serviceData: CreateServiceData): Promise<{ success: boolean; serviceId: number; message: string }> {
    try {
      const response = await apiConnector('POST', SERVICES_API_BASE, serviceData, this.getAuthHeaders());
      return response.data;
    } catch (error: any) {
      console.error('Error creating service:', error);
      throw new Error(error.response?.data?.message || 'Failed to create service');
    }
  }

  // Update service
  async updateService(serviceId: number, serviceData: CreateServiceData): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiConnector('PUT', `${SERVICES_API_BASE}/${serviceId}`, serviceData, this.getAuthHeaders());
      return response.data;
    } catch (error: any) {
      console.error('Error updating service:', error);
      throw new Error(error.response?.data?.message || 'Failed to update service');
    }
  }

  // Delete service
  async deleteService(serviceId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiConnector('DELETE', `${SERVICES_API_BASE}/${serviceId}`, null, this.getAuthHeaders());
      return response.data;
    } catch (error: any) {
      console.error('Error deleting service:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete service');
    }
  }


}

export const servicesService = new ServicesService();