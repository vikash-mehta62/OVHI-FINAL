const express = require('express');

const router = express.Router();

// Test route to verify the system is working
router.get('/test', (req, res) => {
    res.json({
        message: 'Patient Outreach System is working!',
        timestamp: new Date().toISOString(),
        status: 'success'
    });
});

// Get communication dashboard stats
router.get('/dashboard/stats', (req, res) => {
    // Mock data for now - replace with actual database queries
    const stats = {
        totalSent: 1247,
        delivered: 1198,
        opened: 856,
        clicked: 234,
        replied: 89,
        bounced: 49
    };

    res.json(stats);
});

// Get recent communications
router.get('/communications/recent', (req, res) => {
    // Mock data for now
    const recentCommunications = [
        {
            id: 1,
            patientName: 'John Smith',
            channel: 'email',
            purpose: 'Appointment Reminder',
            status: 'opened',
            sentAt: '2024-01-25 10:30 AM'
        },
        {
            id: 2,
            patientName: 'Maria Garcia',
            channel: 'sms',
            purpose: 'Lab Results Ready',
            status: 'replied',
            sentAt: '2024-01-25 09:15 AM'
        },
        {
            id: 3,
            patientName: 'David Johnson',
            channel: 'whatsapp',
            purpose: 'Prescription Refill',
            status: 'delivered',
            sentAt: '2024-01-25 08:45 AM'
        }
    ];

    res.json(recentCommunications);
});

// Get active campaigns
router.get('/campaigns', (req, res) => {
    // Mock data for now
    const campaigns = [
        {
            id: 1,
            name: 'Hypertension Care Reminder',
            status: 'active',
            segment: 'HTN Patients >90 days',
            sent: 156,
            delivered: 152,
            opened: 98,
            clicked: 23,
            startDate: '2024-01-15'
        },
        {
            id: 2,
            name: 'New Patient Onboarding',
            status: 'active',
            segment: 'New Patients',
            sent: 45,
            delivered: 44,
            opened: 32,
            clicked: 18,
            startDate: '2024-01-20'
        },
        {
            id: 3,
            name: 'Diabetes A1C Reminder',
            status: 'draft',
            segment: 'Diabetic Patients',
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            startDate: '2024-02-01'
        }
    ];

    res.json(campaigns);
});

// Get analytics data
router.get('/analytics/stats', (req, res) => {
    // Mock analytics data
    const analyticsData = [
        { period: 'Week 1', totalSent: 245, delivered: 238, opened: 156, clicked: 42, replied: 18, bounced: 7, unsubscribed: 2 },
        { period: 'Week 2', totalSent: 312, delivered: 301, opened: 198, clicked: 58, replied: 24, bounced: 11, unsubscribed: 3 },
        { period: 'Week 3', totalSent: 289, delivered: 278, opened: 182, clicked: 51, replied: 21, bounced: 11, unsubscribed: 1 },
        { period: 'Week 4', totalSent: 401, delivered: 389, opened: 267, clicked: 78, replied: 32, bounced: 12, unsubscribed: 4 }
    ];

    res.json(analyticsData);
});

// Get channel performance
router.get('/analytics/channels', (req, res) => {
    const channelPerformance = [
        {
            channel: 'email',
            sent: 856,
            delivered: 832,
            opened: 567,
            clicked: 156,
            deliveryRate: 97.2,
            openRate: 68.1,
            clickRate: 27.5
        },
        {
            channel: 'sms',
            sent: 423,
            delivered: 418,
            opened: 0,
            clicked: 89,
            deliveryRate: 98.8,
            openRate: 0,
            clickRate: 21.3
        },
        {
            channel: 'whatsapp',
            sent: 168,
            delivered: 164,
            opened: 136,
            clicked: 34,
            deliveryRate: 97.6,
            openRate: 82.9,
            clickRate: 25.0
        }
    ];

    res.json(channelPerformance);
});

module.exports = router;