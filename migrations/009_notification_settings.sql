-- ============================================
-- NOTIFICATION SYSTEM
-- ============================================

-- Notification Channels (Email, Slack, Webhook, etc.)
CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Channel Info
  channel_name VARCHAR(255) NOT NULL,
  channel_type VARCHAR(50) CHECK (channel_type IN ('email', 'slack', 'webhook', 'telegram', 'sms')) NOT NULL,
  
  -- Channel Configuration
  config JSONB NOT NULL,
  /* Example for email:
  {
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_user": "alerts@example.com",
    "smtp_password": "encrypted_password",
    "from_email": "alerts@example.com",
    "from_name": "Traffic Control Alerts"
  }
  
  Example for webhook:
  {
    "url": "https://hooks.slack.com/services/...",
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "auth_type": "bearer_token",
    "auth_token": "encrypted_token"
  }
  */
  
  -- Status
  enabled BOOLEAN DEFAULT true,
  
  -- Testing
  last_test_at TIMESTAMP,
  last_test_status VARCHAR(20) CHECK (last_test_status IN ('success', 'failed', NULL)),
  last_test_error TEXT,
  
  -- Statistics
  total_sent INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  last_sent_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification Rules - Define when to send notifications
CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rule Info
  rule_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Trigger Conditions
  event_types TEXT[] NOT NULL, -- ['mass_attack', 'ddos_attempt', 'sql_injection', ...]
  min_severity VARCHAR(20) CHECK (min_severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  
  -- Additional Filters
  affected_domains TEXT[] DEFAULT ARRAY[]::TEXT[], -- Empty = all domains
  specific_ips TEXT[] DEFAULT ARRAY[]::TEXT[], -- Optional: only for specific IPs
  
  -- Throttling (prevent spam)
  throttle_enabled BOOLEAN DEFAULT true,
  throttle_window_minutes INTEGER DEFAULT 60, -- Minimum time between same alerts
  throttle_max_per_window INTEGER DEFAULT 5, -- Max alerts per window
  
  -- Recipients
  recipient_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  channel_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Foreign key to notification_channels
  
  -- Priority
  priority INTEGER DEFAULT 0, -- Higher = more important
  
  -- Status
  enabled BOOLEAN DEFAULT true,
  
  -- Statistics
  triggered_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification History - Track all sent notifications
CREATE TABLE IF NOT EXISTS notification_history (
  id BIGSERIAL PRIMARY KEY,
  
  -- Rule & Channel
  rule_id UUID REFERENCES notification_rules(id) ON DELETE SET NULL,
  channel_id UUID REFERENCES notification_channels(id) ON DELETE SET NULL,
  
  -- Event Info
  event_type VARCHAR(50),
  severity VARCHAR(20),
  event_id BIGINT, -- Reference to global_security_events.id if applicable
  
  -- Notification Content
  subject TEXT,
  message TEXT,
  recipient VARCHAR(255), -- Email address, phone number, etc.
  
  -- Status
  status VARCHAR(20) CHECK (status IN ('pending', 'sent', 'failed', 'throttled')) DEFAULT 'pending',
  error_message TEXT,
  
  -- Delivery Info
  sent_at TIMESTAMP,
  delivery_confirmed_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notification Templates - Reusable message templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template Info
  template_name VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) CHECK (template_type IN ('email', 'slack', 'generic')) NOT NULL,
  event_type VARCHAR(50), -- Which event this template is for
  
  -- Template Content
  subject_template TEXT, -- For email
  body_template TEXT NOT NULL,
  /* Templates can use variables:
     {{event_type}}, {{severity}}, {{affected_domains}}, {{ip_count}}, 
     {{timestamp}}, {{details}}, {{mitigation_action}}
  */
  
  -- Format
  format VARCHAR(20) CHECK (format IN ('html', 'text', 'markdown')) DEFAULT 'html',
  
  -- Status
  is_default BOOLEAN DEFAULT false, -- Default template for this event type
  enabled BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Throttle Tracking - Prevent notification spam
CREATE TABLE IF NOT EXISTS notification_throttle (
  id BIGSERIAL PRIMARY KEY,
  
  rule_id UUID REFERENCES notification_rules(id) ON DELETE CASCADE,
  event_type VARCHAR(50),
  event_signature VARCHAR(255), -- Hash of event details for deduplication
  
  notification_count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  window_end TIMESTAMP,
  
  last_notification_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(rule_id, event_signature, window_start)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_notification_history_rule_id ON notification_history(rule_id);
CREATE INDEX idx_notification_history_channel_id ON notification_history(channel_id);
CREATE INDEX idx_notification_history_status ON notification_history(status);
CREATE INDEX idx_notification_history_created_at ON notification_history(created_at DESC);
CREATE INDEX idx_notification_history_event_type ON notification_history(event_type);

CREATE INDEX idx_notification_rules_enabled ON notification_rules(enabled);
CREATE INDEX idx_notification_rules_event_types ON notification_rules USING GIN(event_types);

CREATE INDEX idx_notification_throttle_rule_signature ON notification_throttle(rule_id, event_signature);
CREATE INDEX idx_notification_throttle_window ON notification_throttle(window_start, window_end);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default email templates
INSERT INTO notification_templates (template_name, template_type, event_type, subject_template, body_template, format) VALUES
('Security Alert - Mass Attack', 'email', 'mass_attack', 
 '🚨 URGENT: Mass Attack Detected on {{affected_domains}}',
 '<h2 style="color: #dc2626;">Mass Attack Detected</h2>
  <p><strong>Severity:</strong> <span style="color: #dc2626;">{{severity}}</span></p>
  <p><strong>Affected Domains:</strong> {{affected_domains}}</p>
  <p><strong>IP Count:</strong> {{ip_count}}</p>
  <p><strong>Time:</strong> {{timestamp}}</p>
  <p><strong>Details:</strong></p>
  <pre>{{details}}</pre>
  <p><strong>Auto Mitigation:</strong> {{mitigation_action}}</p>
  <hr>
  <p style="color: #6b7280; font-size: 12px;">Traffic Control Alert System</p>',
 'html'),

('Security Alert - DDoS Attempt', 'email', 'ddos_attempt',
 '🚨 CRITICAL: DDoS Attack Attempt Detected',
 '<h2 style="color: #dc2626;">DDoS Attack Attempt</h2>
  <p><strong>Severity:</strong> <span style="color: #dc2626;">{{severity}}</span></p>
  <p><strong>Affected Domains:</strong> {{affected_domains}}</p>
  <p><strong>Request Rate:</strong> {{request_rate}}</p>
  <p><strong>Source IPs:</strong> {{ip_count}}</p>
  <p><strong>Time:</strong> {{timestamp}}</p>
  <p><strong>Auto Mitigation:</strong> {{mitigation_action}}</p>
  <hr>
  <p style="color: #6b7280; font-size: 12px;">Traffic Control Alert System</p>',
 'html'),

('Security Alert - SQL Injection', 'email', 'sql_injection',
 '⚠️ SQL Injection Attempt Detected',
 '<h2 style="color: #ea580c;">SQL Injection Attempt</h2>
  <p><strong>Severity:</strong> <span style="color: #ea580c;">{{severity}}</span></p>
  <p><strong>Affected Domain:</strong> {{affected_domains}}</p>
  <p><strong>Source IP:</strong> {{source_ip}}</p>
  <p><strong>Target Path:</strong> {{target_path}}</p>
  <p><strong>Time:</strong> {{timestamp}}</p>
  <p><strong>Action Taken:</strong> {{mitigation_action}}</p>
  <hr>
  <p style="color: #6b7280; font-size: 12px;">Traffic Control Alert System</p>',
 'html'),

('Security Alert - Generic', 'email', NULL,
 '🔔 Security Event: {{event_type}}',
 '<h2>Security Event Detected</h2>
  <p><strong>Event Type:</strong> {{event_type}}</p>
  <p><strong>Severity:</strong> {{severity}}</p>
  <p><strong>Affected Domains:</strong> {{affected_domains}}</p>
  <p><strong>Time:</strong> {{timestamp}}</p>
  <p><strong>Details:</strong></p>
  <pre>{{details}}</pre>
  <hr>
  <p style="color: #6b7280; font-size: 12px;">Traffic Control Alert System</p>',
 'html');

-- Mark generic template as default
UPDATE notification_templates SET is_default = true WHERE event_type IS NULL;
