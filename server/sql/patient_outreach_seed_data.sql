-- Patient Outreach System Seed Data
-- Sample data for testing and development

-- Insert additional communication templates for different languages
INSERT INTO comm_templates (name, purpose, channel, language, subject, body, variables, is_marketing, organization_id) VALUES
-- Spanish Templates
('Confirmación de Cita - Email', 'appt_confirm', 'email', 'es', 'Cita Confirmada - {{appt_date}} a las {{appt_time}}', 
'<h2>Cita Confirmada</h2>
<p>Estimado/a {{first_name}},</p>
<p>Su cita ha sido confirmada para:</p>
<ul>
  <li><strong>Fecha:</strong> {{appt_date}}</li>
  <li><strong>Hora:</strong> {{appt_time}}</li>
  <li><strong>Proveedor:</strong> {{provider}}</li>
  <li><strong>Ubicación:</strong> {{location}}</li>
</ul>
<p>Si necesita reprogramar, <a href="{{reschedule_link}}">haga clic aquí</a> o llame a nuestra oficina.</p>
<p>Acceda a su portal de paciente: <a href="{{portal_link}}">Portal del Paciente</a></p>
<p>Gracias,<br>{{organization_name}}</p>', 
'["first_name", "appt_date", "appt_time", "provider", "location", "reschedule_link", "portal_link", "organization_name"]', 
false, 1),

('Recordatorio de Cita - SMS', 'appt_reminder', 'sms', 'es', NULL, 
'Hola {{first_name}}, recordatorio: cita {{appt_date}} a las {{appt_time}} con {{provider}}. Responda C para confirmar, R para reprogramar, o STOP para cancelar. {{portal_link}}', 
'["first_name", "appt_date", "appt_time", "provider", "portal_link"]', 
false, 1),

-- Hindi Templates
('अपॉइंटमेंट पुष्टि - Email', 'appt_confirm', 'email', 'hi', 'अपॉइंटमेंट की पुष्टि - {{appt_date}} को {{appt_time}} बजे', 
'<h2>अपॉइंटमेंट की पुष्टि</h2>
<p>प्रिय {{first_name}},</p>
<p>आपका अपॉइंटमेंट निम्नलिखित के लिए पुष्ट किया गया है:</p>
<ul>
  <li><strong>दिनांक:</strong> {{appt_date}}</li>
  <li><strong>समय:</strong> {{appt_time}}</li>
  <li><strong>डॉक्टर:</strong> {{provider}}</li>
  <li><strong>स्थान:</strong> {{location}}</li>
</ul>
<p>यदि आपको पुनर्निर्धारण की आवश्यकता है, तो <a href="{{reschedule_link}}">यहाँ क्लिक करें</a> या हमारे कार्यालय को कॉल करें।</p>
<p>अपने रोगी पोर्टल तक पहुँचें: <a href="{{portal_link}}">रोगी पोर्टल</a></p>
<p>धन्यवाद,<br>{{organization_name}}</p>', 
'["first_name", "appt_date", "appt_time", "provider", "location", "reschedule_link", "portal_link", "organization_name"]', 
false, 1),

-- Urgent/Emergency Templates
('Emergency Communication - SMS', 'urgent', 'sms', 'en', NULL, 
'URGENT: {{first_name}}, please contact our office immediately regarding your recent test results. Call {{phone}} now. This is time-sensitive.', 
'["first_name", "phone"]', 
false, 1),

('Emergency Communication - Email', 'urgent', 'email', 'en', 'URGENT: Immediate Action Required', 
'<h2 style="color: red;">URGENT COMMUNICATION</h2>
<p>Dear {{first_name}},</p>
<p><strong>This is an urgent message that requires your immediate attention.</strong></p>
<p>{{message}}</p>
<p>Please contact our office immediately at {{phone}} or visit the emergency department if this is a medical emergency.</p>
<p>Time sent: {{timestamp}}</p>
<p>{{organization_name}}<br>{{phone}}</p>', 
'["first_name", "message", "phone", "timestamp", "organization_name"]', 
false, 1),

-- WhatsApp Templates
('Appointment Reminder - WhatsApp', 'appt_reminder', 'whatsapp', 'en', NULL, 
'Hi {{first_name}}! 👋 Reminder: You have an appointment on {{appt_date}} at {{appt_time}} with {{provider}}. 

Reply:
✅ C to confirm
📅 R to reschedule  
🚫 STOP to opt out

Portal: {{portal_link}}', 
'["first_name", "appt_date", "appt_time", "provider", "portal_link"]', 
false, 1),

('Lab Results - WhatsApp', 'lab_ready', 'whatsapp', 'en', NULL, 
'Hi {{first_name}}! 🧪 Your lab results from {{test_date}} are ready. 

View them securely: {{portal_link}}

Questions? Call us at {{phone}}

Reply STOP to opt out of WhatsApp messages.', 
'["first_name", "test_date", "portal_link", "phone"]', 
false, 1);

-- Insert sample campaigns
INSERT INTO comm_campaigns (name, description, segment_id, steps, ab_variants, organization_id, created_by, status, start_date) VALUES
('Hypertension Care Reminder Campaign', 'Multi-step campaign for hypertension patients overdue for visits', 1, 
'[
  {"offset_days": 0, "template_id": 2, "channel": "sms"},
  {"offset_days": 7, "template_id": 1, "channel": "email"},
  {"offset_days": 14, "template_id": 2, "channel": "sms"}
]', 
'{"variants": [
  {"name": "A", "subject_variants": ["Appointment Reminder", "Don\'t Miss Your Appointment"]},
  {"name": "B", "subject_variants": ["Your Health Matters", "Time for Your Check-up"]}
]}', 
1, 1, 'active', CURDATE()),

('New Patient Onboarding', 'Welcome series for new patients', 3, 
'[
  {"offset_days": 1, "template_id": 6, "channel": "email"},
  {"offset_days": 7, "template_id": 6, "channel": "email"},
  {"offset_days": 30, "template_id": 2, "channel": "sms"}
]', 
NULL, 
1, 1, 'active', CURDATE()),

('Diabetes A1C Reminder', 'Reminder campaign for diabetic patients needing A1C testing', 2, 
'[
  {"offset_days": 0, "template_id": 5, "channel": "email"},
  {"offset_days": 14, "template_id": 2, "channel": "sms"}
]', 
NULL, 
1, 1, 'draft', CURDATE());

-- Insert sample communication statistics (for analytics testing)
INSERT INTO comm_stats (date, organization_id, provider_id, channel, purpose, sent_count, delivered_count, opened_count, clicked_count, replied_count) VALUES
(CURDATE() - INTERVAL 1 DAY, 1, 1, 'email', 'appt_confirm', 25, 24, 18, 12, 3),
(CURDATE() - INTERVAL 1 DAY, 1, 1, 'sms', 'appt_reminder', 45, 43, 0, 0, 15),
(CURDATE() - INTERVAL 1 DAY, 1, 2, 'email', 'lab_ready', 12, 12, 8, 6, 1),
(CURDATE() - INTERVAL 2 DAY, 1, 1, 'email', 'campaign_education', 150, 145, 89, 23, 5),
(CURDATE() - INTERVAL 2 DAY, 1, 1, 'sms', 'appt_reminder', 67, 65, 0, 0, 22),
(CURDATE() - INTERVAL 3 DAY, 1, 2, 'whatsapp', 'appt_reminder', 8, 8, 6, 2, 4);

-- Insert sample audit log entries
INSERT INTO comm_audit_log (patient_id, user_id, action, entity_type, entity_id, details, ip_address) VALUES
(1, 1, 'send', 'job', 1, '{"channel": "email", "purpose": "appt_confirm", "template_id": 1}', '192.168.1.100'),
(2, 1, 'send', 'job', 2, '{"channel": "sms", "purpose": "appt_reminder", "template_id": 2}', '192.168.1.100'),
(1, NULL, 'opt_out', 'preference', 1, '{"channel": "sms", "method": "reply", "message": "STOP"}', '10.0.0.1'),
(3, 1, 'preference_change', 'preference', 3, '{"field": "marketing_opt_in_email", "old_value": false, "new_value": true}', '192.168.1.101');

-- Insert sample inbound communications
INSERT INTO comm_inbound (patient_id, channel, from_address, to_address, body, intent, confidence_score, related_job_id, processed) VALUES
(1, 'sms', '+15550101', '+15550123', 'C', 'confirm', 0.95, 2, true),
(2, 'sms', '+15550102', '+15550123', 'R', 'reschedule', 0.92, 3, true),
(3, 'sms', '+15550103', '+15550123', 'STOP', 'stop', 1.00, NULL, true),
(1, 'sms', '+15550101', '+15550123', 'Yes I can make it', 'confirm', 0.78, 4, true),
(2, 'whatsapp', '+15550102', '+15550123', 'Can I reschedule for next week?', 'reschedule', 0.85, 5, false);

-- Update patient preferences with some engagement data
UPDATE patient_comm_prefs SET 
  last_engagement = NOW() - INTERVAL FLOOR(RAND() * 30) DAY,
  fatigue_score = ROUND(RAND() * 0.5, 2)
WHERE id <= 3;

-- Insert sample queue jobs for testing
INSERT INTO comm_queue_jobs (job_id, queue_name, payload, priority, status, scheduled_at) VALUES
('urgent_001', 'comm:urgent', '{"patient_id": 1, "template_id": 8, "channel": "sms"}', 1, 'pending', NOW()),
('reminder_001', 'comm:reminders', '{"patient_id": 2, "template_id": 2, "channel": "email"}', 3, 'pending', NOW() + INTERVAL 1 HOUR),
('campaign_001', 'comm:campaigns', '{"campaign_id": 1, "step": 0, "patient_ids": [1,2,3]}', 5, 'pending', NOW() + INTERVAL 2 HOUR);

-- Create indexes for better performance (if not already created)
CREATE INDEX IF NOT EXISTS idx_comm_jobs_scheduled_urgent ON comm_jobs(scheduled_at, is_urgent);
CREATE INDEX IF NOT EXISTS idx_comm_stats_date_channel ON comm_stats(date, channel);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_action ON comm_audit_log(created_at, action);
CREATE INDEX IF NOT EXISTS idx_inbound_processed_created ON comm_inbound(processed, created_at);

-- Insert sample segment membership data
INSERT INTO patient_segment_membership (patient_id, segment_id, is_member, evaluation_data) VALUES
(1, 1, true, '{"diagnosis_match": true, "last_visit_days": 95, "age": 45}'),
(2, 2, true, '{"diabetes_type": "E11", "last_a1c_days": 200}'),
(3, 3, true, '{"registration_days": 15, "visit_count": 1}'),
(2, 4, true, '{"preferred_language": "es"}'),
(1, 2, false, '{"diagnosis_match": false}'),
(3, 1, false, '{"age_match": true, "diagnosis_match": false}');

COMMIT;