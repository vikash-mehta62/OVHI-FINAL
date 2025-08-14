const connection = require('../../config/database');
const { validationResult } = require('express-validator');

// Get comprehensive dashboard analytics
const getDashboardAnalytics = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { timeframe = '30d', specialty } = req.query;

    // Calculate date range
    const days = parseInt(timeframe.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get practice analytics
    const [practiceStats] = await connection.query(`
      SELECT 
        COUNT(DISTINCT p.user_id) as total_patients,
        COUNT(DISTINCT a.id) as total_appointments,
        COUNT(DISTINCT CASE WHEN a.appointment_date >= ? THEN a.id END) as recent_appointments,
        COUNT(DISTINCT CASE WHEN a.status = 'completed' AND a.appointment_date >= ? THEN a.id END) as completed_appointments,
        COUNT(DISTINCT CASE WHEN a.status = 'cancelled' AND a.appointment_date >= ? THEN a.id END) as cancelled_appointments,
        COUNT(DISTINCT CASE WHEN a.status = 'no_show' AND a.appointment_date >= ? THEN a.id END) as no_show_appointments
      FROM users_mappings um
      JOIN user_profiles p ON um.patient_id = p.user_id
      LEFT JOIN appointments a ON p.user_id = a.patient_id
      WHERE um.provider_id = ?
    `, [startDate, startDate, startDate, startDate, user_id]);

    // Get revenue analytics
    const [revenueStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_claims,
        SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status = 1 THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 3 THEN amount ELSE 0 END) as denied_amount,
        AVG(CASE WHEN status = 2 THEN amount ELSE NULL END) as avg_payment,
        COUNT(CASE WHEN status = 2 THEN 1 END) as paid_claims,
        COUNT(CASE WHEN status = 3 THEN 1 END) as denied_claims
      FROM cpt_billing cb
      JOIN users_mappings um ON cb.patient_id = um.patient_id
      WHERE um.provider_id = ? AND cb.created_at >= ?
    `, [user_id, startDate]);

    // Get patient demographics
    const [demographics] = await connection.query(`
      SELECT 
        CASE 
          WHEN TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) < 18 THEN 'Under 18'
          WHEN TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) BETWEEN 18 AND 35 THEN '18-35'
          WHEN TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) BETWEEN 36 AND 50 THEN '36-50'
          WHEN TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) BETWEEN 51 AND 65 THEN '51-65'
          ELSE 'Over 65'
        END as age_group,
        COUNT(*) as count,
        p.gender,
        COUNT(CASE WHEN p.gender = 'M' THEN 1 END) as male_count,
        COUNT(CASE WHEN p.gender = 'F' THEN 1 END) as female_count
      FROM users_mappings um
      JOIN user_profiles p ON um.patient_id = p.user_id
      WHERE um.provider_id = ?
      GROUP BY age_group, p.gender
    `, [user_id]);

    // Get appointment trends (last 12 weeks)
    const [appointmentTrends] = await connection.query(`
      SELECT 
        WEEK(a.appointment_date) as week_number,
        YEAR(a.appointment_date) as year,
        COUNT(*) as appointment_count,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN a.status = 'no_show' THEN 1 END) as no_show_count
      FROM appointments a
      JOIN users_mappings um ON a.patient_id = um.patient_id
      WHERE um.provider_id = ? 
        AND a.appointment_date >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
      GROUP BY YEAR(a.appointment_date), WEEK(a.appointment_date)
      ORDER BY year, week_number
    `, [user_id]);

    // Get top diagnoses
    const [topDiagnoses] = await connection.query(`
      SELECT 
        pd.diagnosis_code,
        pd.diagnosis_description,
        COUNT(*) as frequency,
        COUNT(DISTINCT pd.patient_id) as unique_patients
      FROM patient_diagnoses pd
      JOIN users_mappings um ON pd.patient_id = um.patient_id
      WHERE um.provider_id = ? AND pd.created_at >= ?
      GROUP BY pd.diagnosis_code, pd.diagnosis_description
      ORDER BY frequency DESC
      LIMIT 10
    `, [user_id, startDate]);

    // Get top procedures
    const [topProcedures] = await connection.query(`
      SELECT 
        c.code,
        c.description,
        COUNT(*) as frequency,
        SUM(cb.amount) as total_revenue,
        AVG(cb.amount) as avg_amount
      FROM cpt_billing cb
      JOIN cpt_codes c ON cb.cpt_code = c.code
      JOIN users_mappings um ON cb.patient_id = um.patient_id
      WHERE um.provider_id = ? AND cb.created_at >= ?
      GROUP BY c.code, c.description
      ORDER BY frequency DESC
      LIMIT 10
    `, [user_id, startDate]);

    // Calculate key performance indicators
    const totalRevenue = revenueStats[0].paid_amount || 0;
    const totalClaims = revenueStats[0].total_claims || 0;
    const collectionRate = totalClaims > 0 ? (revenueStats[0].paid_claims / totalClaims * 100) : 0;
    const denialRate = totalClaims > 0 ? (revenueStats[0].denied_claims / totalClaims * 100) : 0;
    const avgRevenuePerPatient = practiceStats[0].total_patients > 0 ? totalRevenue / practiceStats[0].total_patients : 0;

    res.json({
      success: true,
      data: {
        summary: {
          total_patients: practiceStats[0].total_patients,
          total_appointments: practiceStats[0].recent_appointments,
          completed_appointments: practiceStats[0].completed_appointments,
          total_revenue: totalRevenue,
          collection_rate: Math.round(collectionRate * 100) / 100,
          denial_rate: Math.round(denialRate * 100) / 100,
          avg_revenue_per_patient: Math.round(avgRevenuePerPatient * 100) / 100
        },
        revenue: revenueStats[0],
        demographics: demographics,
        appointment_trends: appointmentTrends,
        top_diagnoses: topDiagnoses,
        top_procedures: topProcedures,
        timeframe: timeframe,
        generated_at: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
      error: error.message
    });
  }
};

// Get patient analytics
const getPatientAnalytics = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { timeframe = '30d', segment } = req.query;

    const days = parseInt(timeframe.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Patient acquisition trends
    const [acquisitionTrends] = await connection.query(`
      SELECT 
        DATE(p.created_at) as date,
        COUNT(*) as new_patients,
        COUNT(CASE WHEN p.gender = 'M' THEN 1 END) as male_patients,
        COUNT(CASE WHEN p.gender = 'F' THEN 1 END) as female_patients
      FROM users_mappings um
      JOIN user_profiles p ON um.patient_id = p.user_id
      WHERE um.provider_id = ? AND p.created_at >= ?
      GROUP BY DATE(p.created_at)
      ORDER BY date
    `, [user_id, startDate]);

    // Patient retention analysis
    const [retentionAnalysis] = await connection.query(`
      SELECT 
        p.user_id,
        p.first_name,
        p.last_name,
        COUNT(a.id) as total_appointments,
        MAX(a.appointment_date) as last_visit,
        MIN(a.appointment_date) as first_visit,
        DATEDIFF(MAX(a.appointment_date), MIN(a.appointment_date)) as patient_lifespan_days,
        SUM(cb.amount) as total_spent
      FROM users_mappings um
      JOIN user_profiles p ON um.patient_id = p.user_id
      LEFT JOIN appointments a ON p.user_id = a.patient_id
      LEFT JOIN cpt_billing cb ON p.user_id = cb.patient_id AND cb.status = 2
      WHERE um.provider_id = ?
      GROUP BY p.user_id, p.first_name, p.last_name
      HAVING total_appointments > 0
      ORDER BY total_spent DESC
      LIMIT 50
    `, [user_id]);

    // Patient risk stratification
    const [riskStratification] = await connection.query(`
      SELECT 
        CASE 
          WHEN patient_age < 18 THEN 'Pediatric'
          WHEN patient_age >= 65 THEN 'Geriatric'
          WHEN chronic_conditions >= 3 THEN 'High Risk'
          WHEN chronic_conditions >= 1 THEN 'Moderate Risk'
          ELSE 'Low Risk'
        END as risk_category,
        COUNT(*) as patient_count,
        AVG(total_visits) as avg_visits,
        AVG(total_cost) as avg_cost
      FROM (
        SELECT 
          p.user_id,
          TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) as patient_age,
          COUNT(DISTINCT pd.diagnosis_code) as chronic_conditions,
          COUNT(a.id) as total_visits,
          COALESCE(SUM(cb.amount), 0) as total_cost
        FROM users_mappings um
        JOIN user_profiles p ON um.patient_id = p.user_id
        LEFT JOIN patient_diagnoses pd ON p.user_id = pd.patient_id
        LEFT JOIN appointments a ON p.user_id = a.patient_id
        LEFT JOIN cpt_billing cb ON p.user_id = cb.patient_id AND cb.status = 2
        WHERE um.provider_id = ?
        GROUP BY p.user_id, p.dob
      ) patient_summary
      GROUP BY risk_category
    `, [user_id]);

    res.json({
      success: true,
      data: {
        acquisition_trends: acquisitionTrends,
        retention_analysis: retentionAnalysis,
        risk_stratification: riskStratification,
        timeframe: timeframe,
        generated_at: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching patient analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient analytics',
      error: error.message
    });
  }
};

// Get financial analytics
const getFinancialAnalytics = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { timeframe = '30d', breakdown = 'daily' } = req.query;

    const days = parseInt(timeframe.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Revenue trends by time period
    let dateFormat = '%Y-%m-%d';
    if (breakdown === 'weekly') dateFormat = '%Y-%u';
    if (breakdown === 'monthly') dateFormat = '%Y-%m';

    const [revenueTrends] = await connection.query(`
      SELECT 
        DATE_FORMAT(cb.created_at, ?) as period,
        COUNT(*) as total_claims,
        SUM(cb.amount) as total_billed,
        SUM(CASE WHEN cb.status = 2 THEN cb.amount ELSE 0 END) as total_collected,
        SUM(CASE WHEN cb.status = 3 THEN cb.amount ELSE 0 END) as total_denied,
        SUM(CASE WHEN cb.status = 1 THEN cb.amount ELSE 0 END) as total_pending,
        COUNT(CASE WHEN cb.status = 2 THEN 1 END) as paid_claims,
        COUNT(CASE WHEN cb.status = 3 THEN 1 END) as denied_claims
      FROM cpt_billing cb
      JOIN users_mappings um ON cb.patient_id = um.patient_id
      WHERE um.provider_id = ? AND cb.created_at >= ?
      GROUP BY DATE_FORMAT(cb.created_at, ?)
      ORDER BY period
    `, [dateFormat, user_id, startDate, dateFormat]);

    // Payer mix analysis
    const [payerMix] = await connection.query(`
      SELECT 
        COALESCE(pi.insurance_name, 'Self Pay') as payer_name,
        COUNT(*) as claim_count,
        SUM(cb.amount) as total_amount,
        AVG(cb.amount) as avg_claim_amount,
        COUNT(CASE WHEN cb.status = 2 THEN 1 END) as paid_claims,
        COUNT(CASE WHEN cb.status = 3 THEN 1 END) as denied_claims,
        (COUNT(CASE WHEN cb.status = 2 THEN 1 END) / COUNT(*) * 100) as approval_rate
      FROM cpt_billing cb
      JOIN users_mappings um ON cb.patient_id = um.patient_id
      LEFT JOIN patient_insurances pi ON cb.patient_id = pi.patient_id
      WHERE um.provider_id = ? AND cb.created_at >= ?
      GROUP BY pi.insurance_name
      ORDER BY total_amount DESC
    `, [user_id, startDate]);

    // A/R aging analysis
    const [arAging] = await connection.query(`
      SELECT 
        CASE 
          WHEN DATEDIFF(NOW(), cb.created_at) <= 30 THEN '0-30 days'
          WHEN DATEDIFF(NOW(), cb.created_at) <= 60 THEN '31-60 days'
          WHEN DATEDIFF(NOW(), cb.created_at) <= 90 THEN '61-90 days'
          WHEN DATEDIFF(NOW(), cb.created_at) <= 120 THEN '91-120 days'
          ELSE '120+ days'
        END as aging_bucket,
        COUNT(*) as claim_count,
        SUM(cb.amount) as total_amount,
        AVG(cb.amount) as avg_amount
      FROM cpt_billing cb
      JOIN users_mappings um ON cb.patient_id = um.patient_id
      WHERE um.provider_id = ? AND cb.status IN (1, 3) -- Pending or Denied
      GROUP BY aging_bucket
      ORDER BY 
        CASE aging_bucket
          WHEN '0-30 days' THEN 1
          WHEN '31-60 days' THEN 2
          WHEN '61-90 days' THEN 3
          WHEN '91-120 days' THEN 4
          ELSE 5
        END
    `, [user_id]);

    // Top revenue generating procedures
    const [topRevenueProcedures] = await connection.query(`
      SELECT 
        c.code,
        c.description,
        COUNT(*) as procedure_count,
        SUM(cb.amount) as total_revenue,
        AVG(cb.amount) as avg_revenue,
        (SUM(cb.amount) / (SELECT SUM(amount) FROM cpt_billing cb2 
                          JOIN users_mappings um2 ON cb2.patient_id = um2.patient_id 
                          WHERE um2.provider_id = ? AND cb2.status = 2 AND cb2.created_at >= ?) * 100) as revenue_percentage
      FROM cpt_billing cb
      JOIN cpt_codes c ON cb.cpt_code = c.code
      JOIN users_mappings um ON cb.patient_id = um.patient_id
      WHERE um.provider_id = ? AND cb.status = 2 AND cb.created_at >= ?
      GROUP BY c.code, c.description
      ORDER BY total_revenue DESC
      LIMIT 15
    `, [user_id, startDate, user_id, startDate]);

    // Calculate financial KPIs
    const totalBilled = revenueTrends.reduce((sum, period) => sum + (period.total_billed || 0), 0);
    const totalCollected = revenueTrends.reduce((sum, period) => sum + (period.total_collected || 0), 0);
    const totalDenied = revenueTrends.reduce((sum, period) => sum + (period.total_denied || 0), 0);
    const totalPending = revenueTrends.reduce((sum, period) => sum + (period.total_pending || 0), 0);

    const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled * 100) : 0;
    const denialRate = totalBilled > 0 ? (totalDenied / totalBilled * 100) : 0;
    const pendingRate = totalBilled > 0 ? (totalPending / totalBilled * 100) : 0;

    res.json({
      success: true,
      data: {
        summary: {
          total_billed: totalBilled,
          total_collected: totalCollected,
          total_denied: totalDenied,
          total_pending: totalPending,
          collection_rate: Math.round(collectionRate * 100) / 100,
          denial_rate: Math.round(denialRate * 100) / 100,
          pending_rate: Math.round(pendingRate * 100) / 100
        },
        revenue_trends: revenueTrends,
        payer_mix: payerMix,
        ar_aging: arAging,
        top_procedures: topRevenueProcedures,
        timeframe: timeframe,
        breakdown: breakdown,
        generated_at: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching financial analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial analytics',
      error: error.message
    });
  }
};

// Get operational analytics
const getOperationalAnalytics = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { timeframe = '30d' } = req.query;

    const days = parseInt(timeframe.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Appointment scheduling efficiency
    const [schedulingMetrics] = await connection.query(`
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show_appointments,
        COUNT(CASE WHEN status = 'rescheduled' THEN 1 END) as rescheduled_appointments,
        AVG(TIMESTAMPDIFF(MINUTE, appointment_time, actual_start_time)) as avg_wait_time,
        AVG(TIMESTAMPDIFF(MINUTE, actual_start_time, actual_end_time)) as avg_visit_duration
      FROM appointments a
      JOIN users_mappings um ON a.patient_id = um.patient_id
      WHERE um.provider_id = ? AND a.appointment_date >= ?
    `, [user_id, startDate]);

    // Provider utilization
    const [utilizationMetrics] = await connection.query(`
      SELECT 
        DATE(a.appointment_date) as date,
        COUNT(*) as scheduled_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        SUM(TIMESTAMPDIFF(MINUTE, a.actual_start_time, a.actual_end_time)) as total_patient_time,
        (COUNT(CASE WHEN a.status = 'completed' THEN 1 END) / COUNT(*) * 100) as completion_rate
      FROM appointments a
      JOIN users_mappings um ON a.patient_id = um.patient_id
      WHERE um.provider_id = ? AND a.appointment_date >= ?
      GROUP BY DATE(a.appointment_date)
      ORDER BY date
    `, [user_id, startDate]);

    // Template usage analytics
    const [templateUsage] = await connection.query(`
      SELECT 
        st.template_name,
        st.specialty,
        st.category,
        COUNT(stu.id) as usage_count,
        AVG(stu.completion_time_seconds) as avg_completion_time,
        COUNT(DISTINCT stu.user_id) as unique_users
      FROM smart_templates st
      LEFT JOIN smart_template_usage stu ON st.id = stu.template_id
      WHERE stu.created_at >= ? OR stu.created_at IS NULL
      GROUP BY st.id, st.template_name, st.specialty, st.category
      ORDER BY usage_count DESC
      LIMIT 20
    `, [startDate]);

    // Patient flow analysis
    const [patientFlow] = await connection.query(`
      SELECT 
        HOUR(a.appointment_time) as hour_of_day,
        COUNT(*) as appointment_count,
        AVG(TIMESTAMPDIFF(MINUTE, a.appointment_time, a.actual_start_time)) as avg_delay,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_count
      FROM appointments a
      JOIN users_mappings um ON a.patient_id = um.patient_id
      WHERE um.provider_id = ? AND a.appointment_date >= ?
      GROUP BY HOUR(a.appointment_time)
      ORDER BY hour_of_day
    `, [user_id, startDate]);

    // Calculate operational KPIs
    const totalAppointments = schedulingMetrics[0].total_appointments || 0;
    const completedAppointments = schedulingMetrics[0].completed_appointments || 0;
    const cancelledAppointments = schedulingMetrics[0].cancelled_appointments || 0;
    const noShowAppointments = schedulingMetrics[0].no_show_appointments || 0;

    const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments * 100) : 0;
    const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments * 100) : 0;
    const noShowRate = totalAppointments > 0 ? (noShowAppointments / totalAppointments * 100) : 0;

    res.json({
      success: true,
      data: {
        summary: {
          total_appointments: totalAppointments,
          completion_rate: Math.round(completionRate * 100) / 100,
          cancellation_rate: Math.round(cancellationRate * 100) / 100,
          no_show_rate: Math.round(noShowRate * 100) / 100,
          avg_wait_time: Math.round((schedulingMetrics[0].avg_wait_time || 0) * 100) / 100,
          avg_visit_duration: Math.round((schedulingMetrics[0].avg_visit_duration || 0) * 100) / 100
        },
        scheduling_metrics: schedulingMetrics[0],
        utilization_trends: utilizationMetrics,
        template_usage: templateUsage,
        patient_flow: patientFlow,
        timeframe: timeframe,
        generated_at: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching operational analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch operational analytics',
      error: error.message
    });
  }
};

// Generate custom report
const generateCustomReport = async (req, res) => {
  try {
    const { user_id } = req.user;
    const {
      report_type,
      date_range,
      filters,
      metrics,
      format = 'json'
    } = req.body;

    // Validate report parameters
    const validReportTypes = ['financial', 'operational', 'patient', 'clinical'];
    if (!validReportTypes.includes(report_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type'
      });
    }

    // Build dynamic query based on report type and filters
    let baseQuery = '';
    let queryParams = [user_id];

    switch (report_type) {
      case 'financial':
        baseQuery = `
          SELECT 
            cb.id,
            cb.patient_id,
            p.first_name,
            p.last_name,
            cb.cpt_code,
            c.description as procedure_description,
            cb.amount,
            cb.status,
            cb.created_at,
            pi.insurance_name
          FROM cpt_billing cb
          JOIN users_mappings um ON cb.patient_id = um.patient_id
          JOIN user_profiles p ON cb.patient_id = p.user_id
          JOIN cpt_codes c ON cb.cpt_code = c.code
          LEFT JOIN patient_insurances pi ON cb.patient_id = pi.patient_id
          WHERE um.provider_id = ?
        `;
        break;

      case 'operational':
        baseQuery = `
          SELECT 
            a.id,
            a.patient_id,
            p.first_name,
            p.last_name,
            a.appointment_date,
            a.appointment_time,
            a.status,
            a.appointment_type,
            TIMESTAMPDIFF(MINUTE, a.appointment_time, a.actual_start_time) as wait_time,
            TIMESTAMPDIFF(MINUTE, a.actual_start_time, a.actual_end_time) as visit_duration
          FROM appointments a
          JOIN users_mappings um ON a.patient_id = um.patient_id
          JOIN user_profiles p ON a.patient_id = p.user_id
          WHERE um.provider_id = ?
        `;
        break;

      case 'patient':
        baseQuery = `
          SELECT 
            p.user_id,
            p.first_name,
            p.last_name,
            p.dob,
            p.gender,
            p.phone,
            p.email,
            COUNT(a.id) as total_appointments,
            MAX(a.appointment_date) as last_visit,
            SUM(CASE WHEN cb.status = 2 THEN cb.amount ELSE 0 END) as total_paid
          FROM users_mappings um
          JOIN user_profiles p ON um.patient_id = p.user_id
          LEFT JOIN appointments a ON p.user_id = a.patient_id
          LEFT JOIN cpt_billing cb ON p.user_id = cb.patient_id
          WHERE um.provider_id = ?
          GROUP BY p.user_id, p.first_name, p.last_name, p.dob, p.gender, p.phone, p.email
        `;
        break;

      case 'clinical':
        baseQuery = `
          SELECT 
            pd.patient_id,
            p.first_name,
            p.last_name,
            pd.diagnosis_code,
            pd.diagnosis_description,
            pd.created_at as diagnosis_date,
            COUNT(a.id) as related_appointments
          FROM patient_diagnoses pd
          JOIN users_mappings um ON pd.patient_id = um.patient_id
          JOIN user_profiles p ON pd.patient_id = p.user_id
          LEFT JOIN appointments a ON pd.patient_id = a.patient_id
          WHERE um.provider_id = ?
          GROUP BY pd.patient_id, p.first_name, p.last_name, pd.diagnosis_code, pd.diagnosis_description, pd.created_at
        `;
        break;
    }

    // Apply date range filter
    if (date_range && date_range.start && date_range.end) {
      baseQuery += ` AND DATE(${report_type === 'patient' ? 'p.created_at' : 'created_at'}) BETWEEN ? AND ?`;
      queryParams.push(date_range.start, date_range.end);
    }

    // Apply additional filters
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined) {
          baseQuery += ` AND ${key} = ?`;
          queryParams.push(filters[key]);
        }
      });
    }

    // Add ordering
    baseQuery += ` ORDER BY created_at DESC LIMIT 1000`;

    const [reportData] = await connection.query(baseQuery, queryParams);

    // Save report generation log
    await connection.query(`
      INSERT INTO report_generation_log (
        user_id, report_type, parameters, record_count, generated_at
      ) VALUES (?, ?, ?, ?, NOW())
    `, [
      user_id,
      report_type,
      JSON.stringify({ date_range, filters, metrics }),
      reportData.length
    ]);

    res.json({
      success: true,
      data: {
        report_type,
        parameters: { date_range, filters, metrics },
        record_count: reportData.length,
        data: reportData,
        generated_at: new Date()
      }
    });

  } catch (error) {
    console.error('Error generating custom report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate custom report',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardAnalytics,
  getPatientAnalytics,
  getFinancialAnalytics,
  getOperationalAnalytics,
  generateCustomReport
};