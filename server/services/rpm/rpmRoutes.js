const express = require('express');
const router = express.Router();
const {
  getRPMDashboard,
  getRPMPatients,
  getRPMDevices,
  addRPMDevice,
  getRPMReadings,
  addRPMReading,
  getRPMAlerts
} = require('./rpmCtrl');

// RPM Dashboard
router.get('/dashboard', getRPMDashboard);

// RPM Patients
router.get('/patients', getRPMPatients);

// RPM Devices
router.get('/devices', getRPMDevices);
router.post('/devices', addRPMDevice);

// RPM Readings
router.get('/readings', getRPMReadings);
router.post('/readings', addRPMReading);

// RPM Alerts
router.get('/alerts', getRPMAlerts);

module.exports = router;