const db = require('../../config/db');

class ServicesService {
  // Get all services
  async getAllServices() {
    try {
      const [services] = await db.execute(`
        SELECT 
          service_id as id,
          name as service_name,
          cpt_codes as service_code,
          description,
          price as unit_price,
          created_at
        FROM services 
        ORDER BY name ASC
      `);

      return {
        success: true,
        services,
        message: 'Services retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching services:', error);
      throw new Error('Failed to fetch services');
    }
  }

  // Get service by ID
  async getServiceById(serviceId) {
    try {
      const [services] = await db.execute(`
        SELECT 
          service_id as id,
          name as service_name,
          cpt_codes as service_code,
          description,
          price as unit_price,
          created_at
        FROM services 
        WHERE service_id = ?
      `, [serviceId]);

      if (services.length === 0) {
        return {
          success: false,
          message: 'Service not found'
        };
      }

      return {
        success: true,
        service: services[0],
        message: 'Service retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching service:', error);
      throw new Error('Failed to fetch service');
    }
  }

  // Create new service
  async createService(serviceData) {
    try {
      const {
        service_name,
        service_code,
        description,
        unit_price,
      } = serviceData;

      // Check if service code already exists
      const [existingServices] = await db.execute(
        'SELECT service_id FROM services WHERE cpt_codes = ?',
        [service_code]
      );

      if (existingServices.length > 0) {
        return {
          success: false,
          message: 'Service code already exists'
        };
      }

      const [result] = await db.execute(`
        INSERT INTO services (
          name,
          cpt_codes,
          description,
          price
        ) VALUES (?, ?, ?, ?)
      `, [
        service_name,
        service_code,
        description || '',
        unit_price
      ]);

      return {
        success: true,
        serviceId: result.insertId,
        message: 'Service created successfully'
      };
    } catch (error) {
      console.error('Error creating service:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return {
          success: false,
          message: 'Service code already exists'
        };
      }
      throw new Error('Failed to create service');
    }
  }

  // Update service
  async updateService(serviceId, serviceData) {
    try {
      const {
        service_name,
        service_code,
        description,
        unit_price
      } = serviceData;

      // Check if service exists
      const [existingServices] = await db.execute(
        'SELECT service_id FROM services WHERE service_id = ?',
        [serviceId]
      );

      if (existingServices.length === 0) {
        return {
          success: false,
          message: 'Service not found'
        };
      }

      // Check if service code already exists for other services
      const [duplicateServices] = await db.execute(
        'SELECT service_id FROM services WHERE cpt_codes = ? AND service_id != ?',
        [service_code, serviceId]
      );

      if (duplicateServices.length > 0) {
        return {
          success: false,
          message: 'Service code already exists'
        };
      }

      await db.execute(`
        UPDATE services SET
          name = ?,
          cpt_codes = ?,
          description = ?,
          price = ?
        WHERE service_id = ?
      `, [
        service_name,
        service_code,
        description || '',
        unit_price,
        serviceId
      ]);

      return {
        success: true,
        message: 'Service updated successfully'
      };
    } catch (error) {
      console.error('Error updating service:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return {
          success: false,
          message: 'Service code already exists'
        };
      }
      throw new Error('Failed to update service');
    }
  }

  // Delete service
  async deleteService(serviceId) {
    try {
      // Check if service exists
      const [existingServices] = await db.execute(
        'SELECT service_id FROM services WHERE service_id = ?',
        [serviceId]
      );

      if (existingServices.length === 0) {
        return {
          success: false,
          message: 'Service not found'
        };
      }

      // Check if service is used in any bills (optional check)
      try {
        const [billItems] = await db.execute(
          'SELECT id FROM bill_items WHERE service_id = ? LIMIT 1',
          [serviceId]
        );

        if (billItems.length > 0) {
          return {
            success: false,
            message: 'Cannot delete service as it is used in existing bills'
          };
        }
      } catch (error) {
        // If bill_items table doesn't exist, continue with deletion
        console.log('bill_items table not found, proceeding with deletion');
      }

      await db.execute('DELETE FROM services WHERE service_id = ?', [serviceId]);

      return {
        success: true,
        message: 'Service deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting service:', error);
      throw new Error('Failed to delete service');
    }
  }


}

module.exports = new ServicesService();