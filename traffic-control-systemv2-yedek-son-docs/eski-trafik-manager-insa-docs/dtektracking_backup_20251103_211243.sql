-- DTekTracking Database Backup
-- Created: Mon Nov  3 21:12:43 CET 2025
-- Database: dtektracking


-- Table: activity_logs
                                                                    Table "public.activity_logs"
   Column    |            Type             | Collation | Nullable |                  Default                  | Storage  | Compression | Stats target | Description 
-------------+-----------------------------+-----------+----------+-------------------------------------------+----------+-------------+--------------+-------------
 id          | bigint                      |           | not null | nextval('activity_logs_id_seq'::regclass) | plain    |             |              | 
 user_id     | uuid                        |           |          |                                           | plain    |             |              | 
 action      | character varying(100)      |           | not null |                                           | extended |             |              | 
 entity_type | character varying(50)       |           |          |                                           | extended |             |              | 
 entity_id   | uuid                        |           |          |                                           | plain    |             |              | 
 old_values  | jsonb                       |           |          |                                           | extended |             |              | 
 new_values  | jsonb                       |           |          |                                           | extended |             |              | 
 ip_address  | inet                        |           |          |                                           | main     |             |              | 
 user_agent  | text                        |           |          |                                           | extended |             |              | 
 created_at  | timestamp without time zone |           |          | now()                                     | plain    |             |              | 
Indexes:
    "activity_logs_pkey" PRIMARY KEY, btree (id)
    "idx_activity_logs_created_at" btree (created_at)
    "idx_activity_logs_entity_id" btree (entity_id)
    "idx_activity_logs_entity_type" btree (entity_type)
    "idx_activity_logs_user_id" btree (user_id)
Foreign-key constraints:
    "activity_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
Access method: heap

-- Rows:      0


-- Table: api_requests_log
                                                                      Table "public.api_requests_log"
      Column      |            Type             | Collation | Nullable |                   Default                    | Storage  | Compression | Stats target | Description 
------------------+-----------------------------+-----------+----------+----------------------------------------------+----------+-------------+--------------+-------------
 id               | bigint                      |           | not null | nextval('api_requests_log_id_seq'::regclass) | plain    |             |              | 
 user_id          | uuid                        |           |          |                                              | plain    |             |              | 
 network_id       | uuid                        |           |          |                                              | plain    |             |              | 
 endpoint         | text                        |           |          |                                              | extended |             |              | 
 method           | character varying(10)       |           |          |                                              | extended |             |              | 
 ip_address       | inet                        |           |          |                                              | main     |             |              | 
 user_agent       | text                        |           |          |                                              | extended |             |              | 
 request_headers  | jsonb                       |           |          |                                              | extended |             |              | 
 request_body     | jsonb                       |           |          |                                              | extended |             |              | 
 response_status  | integer                     |           |          |                                              | plain    |             |              | 
 response_time_ms | integer                     |           |          |                                              | plain    |             |              | 
 created_at       | timestamp without time zone |           |          | now()                                        | plain    |             |              | 
Indexes:
    "api_requests_log_pkey" PRIMARY KEY, btree (id)
    "idx_api_requests_log_created_at" btree (created_at)
    "idx_api_requests_log_network_id" btree (network_id)
    "idx_api_requests_log_user_id" btree (user_id)
Foreign-key constraints:
    "api_requests_log_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE SET NULL
    "api_requests_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
Access method: heap

-- Rows:      0


-- Table: auto_rules
                                                            Table "public.auto_rules"
      Column      |            Type             | Collation | Nullable |      Default      | Storage  | Compression | Stats target | Description 
------------------+-----------------------------+-----------+----------+-------------------+----------+-------------+--------------+-------------
 id               | uuid                        |           | not null | gen_random_uuid() | plain    |             |              | 
 name             | character varying(255)      |           | not null |                   | extended |             |              | 
 description      | text                        |           |          |                   | extended |             |              | 
 conditions       | jsonb                       |           | not null |                   | extended |             |              | 
 action           | character varying(50)       |           | not null |                   | extended |             |              | 
 redirect_version | character varying(20)       |           |          |                   | extended |             |              | 
 priority         | integer                     |           |          | 0                 | plain    |             |              | 
 enabled          | boolean                     |           |          | true              | plain    |             |              | 
 triggered_count  | integer                     |           |          | 0                 | plain    |             |              | 
 created_at       | timestamp without time zone |           |          | now()             | plain    |             |              | 
 updated_at       | timestamp without time zone |           |          | now()             | plain    |             |              | 
 created_by       | uuid                        |           |          |                   | plain    |             |              | 
Indexes:
    "auto_rules_pkey" PRIMARY KEY, btree (id)
    "idx_auto_rules_action" btree (action)
    "idx_auto_rules_enabled" btree (enabled)
    "idx_auto_rules_priority" btree (priority)
Check constraints:
    "auto_rules_action_check" CHECK (action::text = ANY (ARRAY['whitelist'::character varying, 'graylist'::character varying, 'blacklist'::character varying, 'notify'::character varying]::text[]))
    "auto_rules_redirect_version_check" CHECK (redirect_version::text = ANY (ARRAY['clean'::character varying, 'gray'::character varying, 'aggressive'::character varying, 'forbidden'::character varying]::text[]))
Triggers:
    update_auto_rules_updated_at BEFORE UPDATE ON auto_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
Access method: heap

-- Rows:      3


-- Table: bot_detections
                                                                     Table "public.bot_detections"
     Column     |            Type             | Collation | Nullable |                  Default                   | Storage  | Compression | Stats target | Description 
----------------+-----------------------------+-----------+----------+--------------------------------------------+----------+-------------+--------------+-------------
 id             | bigint                      |           | not null | nextval('bot_detections_id_seq'::regclass) | plain    |             |              | 
 ip_address     | inet                        |           | not null |                                            | main     |             |              | 
 site_id        | uuid                        |           |          |                                            | plain    |             |              | 
 detection_type | character varying(50)       |           |          |                                            | extended |             |              | 
 signals        | jsonb                       |           |          |                                            | extended |             |              | 
 confidence     | numeric(5,2)                |           |          |                                            | main     |             |              | 
 action_taken   | character varying(50)       |           |          |                                            | extended |             |              | 
 created_at     | timestamp without time zone |           |          | now()                                      | plain    |             |              | 
Indexes:
    "bot_detections_pkey" PRIMARY KEY, btree (id)
    "idx_bot_detections_created_at" btree (created_at)
    "idx_bot_detections_ip_address" btree (ip_address)
Foreign-key constraints:
    "bot_detections_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
Access method: heap

-- Rows:      0


-- Table: campaigns
                                                                  Table "public.campaigns"
      Column       |            Type             | Collation | Nullable |           Default           | Storage  | Compression | Stats target | Description 
-------------------+-----------------------------+-----------+----------+-----------------------------+----------+-------------+--------------+-------------
 id                | uuid                        |           | not null | gen_random_uuid()           | plain    |             |              | 
 campaign_code     | character varying(50)       |           | not null |                             | extended |             |              | 
 campaign_name     | character varying(255)      |           | not null |                             | extended |             |              | 
 network_id        | uuid                        |           |          |                             | plain    |             |              | 
 site_id           | uuid                        |           |          |                             | plain    |             |              | 
 product_id        | uuid                        |           |          |                             | plain    |             |              | 
 utm_source        | character varying(100)      |           |          |                             | extended |             |              | 
 utm_medium        | character varying(100)      |           |          |                             | extended |             |              | 
 utm_campaign      | character varying(255)      |           | not null |                             | extended |             |              | 
 tracking_code     | character varying(100)      |           |          |                             | extended |             |              | 
 allowed_countries | character varying(2)[]      |           |          |                             | extended |             |              | 
 blocked_countries | character varying(2)[]      |           |          |                             | extended |             |              | 
 status            | character varying(20)       |           |          | 'active'::character varying | extended |             |              | 
 start_date        | date                        |           |          |                             | plain    |             |              | 
 end_date          | date                        |           |          |                             | plain    |             |              | 
 notes             | text                        |           |          |                             | extended |             |              | 
 created_by        | uuid                        |           |          |                             | plain    |             |              | 
 created_at        | timestamp without time zone |           |          | now()                       | plain    |             |              | 
 updated_at        | timestamp without time zone |           |          | now()                       | plain    |             |              | 
Indexes:
    "campaigns_pkey" PRIMARY KEY, btree (id)
    "campaigns_campaign_code_key" UNIQUE CONSTRAINT, btree (campaign_code)
    "campaigns_utm_campaign_key" UNIQUE CONSTRAINT, btree (utm_campaign)
    "idx_campaigns_campaign_code" btree (campaign_code)
    "idx_campaigns_network_id" btree (network_id)
    "idx_campaigns_site_id" btree (site_id)
    "idx_campaigns_status" btree (status)
    "idx_campaigns_utm_campaign" btree (utm_campaign)
Check constraints:
    "campaigns_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying, 'paused'::character varying, 'completed'::character varying, 'archived'::character varying]::text[]))
Foreign-key constraints:
    "campaigns_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id)
    "campaigns_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
    "campaigns_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    "campaigns_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
Referenced by:
    TABLE "daily_stats" CONSTRAINT "daily_stats_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    TABLE "form_submissions" CONSTRAINT "form_submissions_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    TABLE "leads" CONSTRAINT "leads_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    TABLE "page_visits" CONSTRAINT "page_visits_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
Triggers:
    update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
Access method: heap

-- Rows:      0


-- Table: daily_stats
                                                                      Table "public.daily_stats"
      Column      |            Type             | Collation | Nullable |                 Default                 | Storage | Compression | Stats target | Description 
------------------+-----------------------------+-----------+----------+-----------------------------------------+---------+-------------+--------------+-------------
 id               | integer                     |           | not null | nextval('daily_stats_id_seq'::regclass) | plain   |             |              | 
 date             | date                        |           | not null |                                         | plain   |             |              | 
 network_id       | uuid                        |           |          |                                         | plain   |             |              | 
 site_id          | uuid                        |           |          |                                         | plain   |             |              | 
 campaign_id      | uuid                        |           |          |                                         | plain   |             |              | 
 total_visits     | integer                     |           |          | 0                                       | plain   |             |              | 
 unique_visitors  | integer                     |           |          | 0                                       | plain   |             |              | 
 bot_visits       | integer                     |           |          | 0                                       | plain   |             |              | 
 total_leads      | integer                     |           |          | 0                                       | plain   |             |              | 
 approved_leads   | integer                     |           |          | 0                                       | plain   |             |              | 
 rejected_leads   | integer                     |           |          | 0                                       | plain   |             |              | 
 pending_leads    | integer                     |           |          | 0                                       | plain   |             |              | 
 total_revenue    | numeric(10,2)               |           |          | 0.00                                    | main    |             |              | 
 total_commission | numeric(10,2)               |           |          | 0.00                                    | main    |             |              | 
 conversion_rate  | numeric(5,2)                |           |          |                                         | main    |             |              | 
 approval_rate    | numeric(5,2)                |           |          |                                         | main    |             |              | 
 created_at       | timestamp without time zone |           |          | now()                                   | plain   |             |              | 
Indexes:
    "daily_stats_pkey" PRIMARY KEY, btree (id)
    "daily_stats_date_network_id_site_id_campaign_id_key" UNIQUE CONSTRAINT, btree (date, network_id, site_id, campaign_id)
    "idx_daily_stats_campaign_id" btree (campaign_id)
    "idx_daily_stats_date" btree (date)
    "idx_daily_stats_network_id" btree (network_id)
    "idx_daily_stats_site_id" btree (site_id)
Foreign-key constraints:
    "daily_stats_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    "daily_stats_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
    "daily_stats_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
Access method: heap

-- Rows:      0


-- Table: deployed_sites
                                                               Table "public.deployed_sites"
      Column       |            Type             | Collation | Nullable |           Default           | Storage  | Compression | Stats target | Description 
-------------------+-----------------------------+-----------+----------+-----------------------------+----------+-------------+--------------+-------------
 id                | uuid                        |           | not null | gen_random_uuid()           | plain    |             |              | 
 name              | character varying(255)      |           | not null |                             | extended |             |              | 
 domain            | character varying(255)      |           |          |                             | extended |             |              | 
 file_path         | text                        |           | not null |                             | extended |             |              | 
 site_type         | character varying(50)       |           |          |                             | extended |             |              | 
 clean_port        | integer                     |           |          |                             | plain    |             |              | 
 gray_port         | integer                     |           |          |                             | plain    |             |              | 
 aggr_port         | integer                     |           |          |                             | plain    |             |              | 
 mobile_clean_port | integer                     |           |          |                             | plain    |             |              | 
 mobile_gray_port  | integer                     |           |          |                             | plain    |             |              | 
 mobile_aggr_port  | integer                     |           |          |                             | plain    |             |              | 
 ssl_enabled       | boolean                     |           |          | false                       | plain    |             |              | 
 ssl_expires_at    | timestamp without time zone |           |          |                             | plain    |             |              | 
 nginx_config_path | text                        |           |          |                             | extended |             |              | 
 pm2_processes     | jsonb                       |           |          |                             | extended |             |              | 
 status            | character varying(50)       |           |          | 'active'::character varying | extended |             |              | 
 deployed_at       | timestamp without time zone |           |          | now()                       | plain    |             |              | 
 updated_at        | timestamp without time zone |           |          | now()                       | plain    |             |              | 
 deployed_by       | uuid                        |           |          |                             | plain    |             |              | 
 pm2_name          | character varying(255)      |           |          |                             | extended |             |              | 
 pm2_id            | integer                     |           |          |                             | plain    |             |              | 
Indexes:
    "deployed_sites_pkey" PRIMARY KEY, btree (id)
    "deployed_sites_domain_unique" UNIQUE, btree (domain) WHERE domain IS NOT NULL
    "idx_deployed_sites_deployed_at" btree (deployed_at)
    "idx_deployed_sites_domain" btree (domain)
    "idx_deployed_sites_status" btree (status)
Check constraints:
    "deployed_sites_site_type_check" CHECK (site_type::text = ANY (ARRAY['static'::character varying, 'nodejs'::character varying, 'nextjs'::character varying, 'react'::character varying]::text[]))
    "deployed_sites_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying::text, 'stopped'::character varying::text, 'error'::character varying::text, 'deploying'::character varying::text, 'deleted'::character varying::text]))
Referenced by:
    TABLE "nginx_configs" CONSTRAINT "nginx_configs_site_id_fkey" FOREIGN KEY (site_id) REFERENCES deployed_sites(id) ON DELETE CASCADE
    TABLE "ssl_certificates" CONSTRAINT "ssl_certificates_site_id_fkey" FOREIGN KEY (site_id) REFERENCES deployed_sites(id) ON DELETE CASCADE
Triggers:
    update_deployed_sites_updated_at BEFORE UPDATE ON deployed_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
Access method: heap

-- Rows:      3


-- Table: deposit_transactions
                                                                     Table "public.deposit_transactions"
    Column     |            Type             | Collation | Nullable |                     Default                      | Storage  | Compression | Stats target | Description 
---------------+-----------------------------+-----------+----------+--------------------------------------------------+----------+-------------+--------------+-------------
 id            | integer                     |           | not null | nextval('deposit_transactions_id_seq'::regclass) | plain    |             |              | 
 network_id    | uuid                        |           |          |                                                  | plain    |             |              | 
 type          | character varying(20)       |           | not null |                                                  | extended |             |              | 
 amount        | numeric(10,2)               |           | not null |                                                  | main     |             |              | 
 balance_after | numeric(10,2)               |           | not null |                                                  | main     |             |              | 
 description   | text                        |           |          |                                                  | extended |             |              | 
 reference_id  | character varying(100)      |           |          |                                                  | extended |             |              | 
 created_at    | timestamp without time zone |           |          | now()                                            | plain    |             |              | 
Indexes:
    "deposit_transactions_pkey" PRIMARY KEY, btree (id)
Check constraints:
    "deposit_transactions_type_check" CHECK (type::text = ANY (ARRAY['deposit'::character varying, 'deduction'::character varying, 'refund'::character varying]::text[]))
Foreign-key constraints:
    "deposit_transactions_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: failed_network_requests
                                                                      Table "public.failed_network_requests"
     Column      |            Type             | Collation | Nullable |                       Default                       | Storage  | Compression | Stats target | Description 
-----------------+-----------------------------+-----------+----------+-----------------------------------------------------+----------+-------------+--------------+-------------
 id              | integer                     |           | not null | nextval('failed_network_requests_id_seq'::regclass) | plain    |             |              | 
 lead_id         | uuid                        |           |          |                                                     | plain    |             |              | 
 network_id      | uuid                        |           |          |                                                     | plain    |             |              | 
 request_type    | character varying(50)       |           |          |                                                     | extended |             |              | 
 request_payload | jsonb                       |           |          |                                                     | extended |             |              | 
 error_message   | text                        |           |          |                                                     | extended |             |              | 
 retry_count     | integer                     |           |          | 0                                                   | plain    |             |              | 
 max_retries     | integer                     |           |          | 3                                                   | plain    |             |              | 
 next_retry_at   | timestamp without time zone |           |          |                                                     | plain    |             |              | 
 status          | character varying(20)       |           |          | 'pending'::character varying                        | extended |             |              | 
 created_at      | timestamp without time zone |           |          | now()                                               | plain    |             |              | 
 updated_at      | timestamp without time zone |           |          | now()                                               | plain    |             |              | 
Indexes:
    "failed_network_requests_pkey" PRIMARY KEY, btree (id)
Check constraints:
    "failed_network_requests_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying, 'retrying'::character varying, 'failed'::character varying, 'resolved'::character varying]::text[]))
Foreign-key constraints:
    "failed_network_requests_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    "failed_network_requests_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: form_submission_history
                                                                        Table "public.form_submission_history"
       Column        |            Type             | Collation | Nullable |                       Default                       | Storage  | Compression | Stats target | Description 
---------------------+-----------------------------+-----------+----------+-----------------------------------------------------+----------+-------------+--------------+-------------
 id                  | bigint                      |           | not null | nextval('form_submission_history_id_seq'::regclass) | plain    |             |              | 
 ip                  | character varying(45)       |           | not null |                                                     | extended |             |              | 
 session_id          | character varying(255)      |           |          |                                                     | extended |             |              | 
 site_id             | uuid                        |           |          |                                                     | plain    |             |              | 
 site_domain         | character varying(255)      |           |          |                                                     | extended |             |              | 
 form_name           | character varying(255)      |           |          |                                                     | extended |             |              | 
 form_url            | text                        |           |          |                                                     | extended |             |              | 
 data_hash           | character varying(64)       |           |          |                                                     | extended |             |              | 
 field_count         | integer                     |           |          |                                                     | plain    |             |              | 
 time_to_fill        | integer                     |           |          |                                                     | plain    |             |              | 
 focus_changes       | integer                     |           |          |                                                     | plain    |             |              | 
 paste_detected      | boolean                     |           |          | false                                               | plain    |             |              | 
 autocomplete_used   | boolean                     |           |          | false                                               | plain    |             |              | 
 is_spam             | boolean                     |           |          | false                                               | plain    |             |              | 
 spam_score          | integer                     |           |          | 0                                                   | plain    |             |              | 
 spam_reasons        | jsonb                       |           |          |                                                     | extended |             |              | 
 same_form_count_24h | integer                     |           |          | 1                                                   | plain    |             |              | 
 same_data_count     | integer                     |           |          | 1                                                   | plain    |             |              | 
 action_taken        | character varying(50)       |           |          |                                                     | extended |             |              | 
 submitted_at        | timestamp without time zone |           |          | now()                                               | plain    |             |              | 
 ip_tracking_id      | bigint                      |           |          |                                                     | plain    |             |              | 
Indexes:
    "form_submission_history_pkey" PRIMARY KEY, btree (id)
    "idx_form_submission_data_hash" btree (data_hash)
    "idx_form_submission_form_name" btree (form_name)
    "idx_form_submission_ip" btree (ip)
    "idx_form_submission_is_spam" btree (is_spam)
    "idx_form_submission_site_id" btree (site_id)
    "idx_form_submission_submitted_at" btree (submitted_at)
Check constraints:
    "form_submission_history_action_taken_check" CHECK (action_taken::text = ANY (ARRAY['allow'::character varying, 'graylist'::character varying, 'blacklist'::character varying, 'manual_review'::character varying]::text[]))
    "form_submission_history_spam_score_check" CHECK (spam_score >= 0 AND spam_score <= 100)
Foreign-key constraints:
    "form_submission_history_ip_tracking_id_fkey" FOREIGN KEY (ip_tracking_id) REFERENCES ip_tracking(id) ON DELETE CASCADE
Access method: heap

-- Rows:      1


-- Table: form_submissions
                                                                         Table "public.form_submissions"
        Column         |            Type             | Collation | Nullable |                   Default                    | Storage  | Compression | Stats target | Description 
-----------------------+-----------------------------+-----------+----------+----------------------------------------------+----------+-------------+--------------+-------------
 id                    | bigint                      |           | not null | nextval('form_submissions_id_seq'::regclass) | plain    |             |              | 
 site_id               | uuid                        |           |          |                                              | plain    |             |              | 
 campaign_id           | uuid                        |           |          |                                              | plain    |             |              | 
 form_data             | jsonb                       |           | not null |                                              | extended |             |              | 
 ip_address            | inet                        |           | not null |                                              | main     |             |              | 
 session_id            | uuid                        |           | not null |                                              | plain    |             |              | 
 is_bot_form           | boolean                     |           |          | false                                        | plain    |             |              | 
 form_fill_time        | integer                     |           |          |                                              | plain    |             |              | 
 mouse_movements_count | integer                     |           |          |                                              | plain    |             |              | 
 keyboard_pattern      | character varying(50)       |           |          |                                              | extended |             |              | 
 honeypot_filled       | boolean                     |           |          | false                                        | plain    |             |              | 
 js_enabled            | boolean                     |           |          | true                                         | plain    |             |              | 
 canvas_fingerprint    | character varying(255)      |           |          |                                              | extended |             |              | 
 action_taken          | character varying(50)       |           |          |                                              | extended |             |              | 
 lead_created          | boolean                     |           |          | false                                        | plain    |             |              | 
 lead_id               | uuid                        |           |          |                                              | plain    |             |              | 
 created_at            | timestamp without time zone |           |          | now()                                        | plain    |             |              | 
Indexes:
    "form_submissions_pkey" PRIMARY KEY, btree (id)
    "idx_form_submissions_campaign_id" btree (campaign_id)
    "idx_form_submissions_created_at" btree (created_at)
    "idx_form_submissions_ip_address" btree (ip_address)
    "idx_form_submissions_is_bot_form" btree (is_bot_form)
    "idx_form_submissions_lead_id" btree (lead_id)
    "idx_form_submissions_site_id" btree (site_id)
Foreign-key constraints:
    "form_submissions_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    "form_submissions_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id)
    "form_submissions_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
Access method: heap

-- Rows:      0


-- Table: invoice_items
                                                                    Table "public.invoice_items"
   Column    |            Type             | Collation | Nullable |                  Default                  | Storage  | Compression | Stats target | Description 
-------------+-----------------------------+-----------+----------+-------------------------------------------+----------+-------------+--------------+-------------
 id          | integer                     |           | not null | nextval('invoice_items_id_seq'::regclass) | plain    |             |              | 
 invoice_id  | uuid                        |           |          |                                           | plain    |             |              | 
 description | text                        |           | not null |                                           | extended |             |              | 
 quantity    | integer                     |           | not null |                                           | plain    |             |              | 
 unit_price  | numeric(10,2)               |           | not null |                                           | main     |             |              | 
 total_price | numeric(10,2)               |           | not null |                                           | main     |             |              | 
 created_at  | timestamp without time zone |           |          | now()                                     | plain    |             |              | 
Indexes:
    "invoice_items_pkey" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "invoice_items_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: invoices
                                                                   Table "public.invoices"
      Column       |            Type             | Collation | Nullable |           Default            | Storage  | Compression | Stats target | Description 
-------------------+-----------------------------+-----------+----------+------------------------------+----------+-------------+--------------+-------------
 id                | uuid                        |           | not null | gen_random_uuid()            | plain    |             |              | 
 invoice_number    | character varying(50)       |           | not null |                              | extended |             |              | 
 network_id        | uuid                        |           |          |                              | plain    |             |              | 
 period_start      | date                        |           | not null |                              | plain    |             |              | 
 period_end        | date                        |           | not null |                              | plain    |             |              | 
 lead_count        | integer                     |           |          | 0                            | plain    |             |              | 
 sale_count        | integer                     |           |          | 0                            | plain    |             |              | 
 total_amount      | numeric(10,2)               |           | not null |                              | main     |             |              | 
 currency          | character varying(3)        |           |          | 'USD'::character varying     | extended |             |              | 
 status            | character varying(20)       |           |          | 'pending'::character varying | extended |             |              | 
 paid_at           | timestamp without time zone |           |          |                              | plain    |             |              | 
 payment_method    | character varying(50)       |           |          |                              | extended |             |              | 
 payment_reference | character varying(100)      |           |          |                              | extended |             |              | 
 receipt_url       | text                        |           |          |                              | extended |             |              | 
 due_date          | date                        |           | not null |                              | plain    |             |              | 
 notes             | text                        |           |          |                              | extended |             |              | 
 created_by        | uuid                        |           |          |                              | plain    |             |              | 
 created_at        | timestamp without time zone |           |          | now()                        | plain    |             |              | 
 updated_at        | timestamp without time zone |           |          | now()                        | plain    |             |              | 
Indexes:
    "invoices_pkey" PRIMARY KEY, btree (id)
    "invoices_invoice_number_key" UNIQUE CONSTRAINT, btree (invoice_number)
Check constraints:
    "invoices_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying, 'paid'::character varying, 'overdue'::character varying, 'cancelled'::character varying]::text[]))
Foreign-key constraints:
    "invoices_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id)
    "invoices_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
Referenced by:
    TABLE "invoice_items" CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    TABLE "payments" CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: ip_decision_history
                                                                        Table "public.ip_decision_history"
        Column        |            Type             | Collation | Nullable |                     Default                     | Storage  | Compression | Stats target | Description 
----------------------+-----------------------------+-----------+----------+-------------------------------------------------+----------+-------------+--------------+-------------
 id                   | bigint                      |           | not null | nextval('ip_decision_history_id_seq'::regclass) | plain    |             |              | 
 ip                   | character varying(45)       |           | not null |                                                 | extended |             |              | 
 old_status           | character varying(20)       |           |          |                                                 | extended |             |              | 
 new_status           | character varying(20)       |           |          |                                                 | extended |             |              | 
 redirect_version     | character varying(20)       |           |          |                                                 | extended |             |              | 
 decision_type        | character varying(50)       |           |          |                                                 | extended |             |              | 
 reason               | text                        |           |          |                                                 | extended |             |              | 
 notes                | text                        |           |          |                                                 | extended |             |              | 
 triggered_by_rule_id | uuid                        |           |          |                                                 | plain    |             |              | 
 rule_name            | character varying(255)      |           |          |                                                 | extended |             |              | 
 admin_user_id        | uuid                        |           |          |                                                 | plain    |             |              | 
 admin_username       | character varying(255)      |           |          |                                                 | extended |             |              | 
 decided_at           | timestamp without time zone |           |          | now()                                           | plain    |             |              | 
 ip_tracking_id       | bigint                      |           |          |                                                 | plain    |             |              | 
Indexes:
    "ip_decision_history_pkey" PRIMARY KEY, btree (id)
    "idx_ip_decision_decided_at" btree (decided_at)
    "idx_ip_decision_ip" btree (ip)
    "idx_ip_decision_new_status" btree (new_status)
    "idx_ip_decision_rule_id" btree (triggered_by_rule_id)
    "idx_ip_decision_type" btree (decision_type)
Check constraints:
    "ip_decision_history_decision_type_check" CHECK (decision_type::text = ANY (ARRAY['manual'::character varying, 'auto_rule'::character varying, 'spam_detection'::character varying]::text[]))
    "ip_decision_history_new_status_check" CHECK (new_status::text = ANY (ARRAY['whitelist'::character varying, 'graylist'::character varying, 'blacklist'::character varying, 'unknown'::character varying]::text[]))
    "ip_decision_history_redirect_version_check" CHECK (redirect_version::text = ANY (ARRAY['clean'::character varying, 'gray'::character varying, 'aggressive'::character varying]::text[]))
Foreign-key constraints:
    "ip_decision_history_ip_tracking_id_fkey" FOREIGN KEY (ip_tracking_id) REFERENCES ip_tracking(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: ip_pattern_detection
                                                                     Table "public.ip_pattern_detection"
     Column     |            Type             | Collation | Nullable |                     Default                      | Storage  | Compression | Stats target | Description 
----------------+-----------------------------+-----------+----------+--------------------------------------------------+----------+-------------+--------------+-------------
 id             | bigint                      |           | not null | nextval('ip_pattern_detection_id_seq'::regclass) | plain    |             |              | 
 ip             | character varying(45)       |           | not null |                                                  | extended |             |              | 
 pattern_type   | character varying(50)       |           |          |                                                  | extended |             |              | 
 pattern_score  | integer                     |           |          |                                                  | plain    |             |              | 
 detection_data | jsonb                       |           |          |                                                  | extended |             |              | 
 is_active      | boolean                     |           |          | true                                             | plain    |             |              | 
 resolved       | boolean                     |           |          | false                                            | plain    |             |              | 
 first_detected | timestamp without time zone |           |          | now()                                            | plain    |             |              | 
 last_detected  | timestamp without time zone |           |          | now()                                            | plain    |             |              | 
 resolved_at    | timestamp without time zone |           |          |                                                  | plain    |             |              | 
 ip_tracking_id | bigint                      |           |          |                                                  | plain    |             |              | 
Indexes:
    "ip_pattern_detection_pkey" PRIMARY KEY, btree (id)
    "idx_ip_pattern_ip" btree (ip)
    "idx_ip_pattern_is_active" btree (is_active)
    "idx_ip_pattern_resolved" btree (resolved)
    "idx_ip_pattern_type" btree (pattern_type)
Check constraints:
    "ip_pattern_detection_pattern_score_check" CHECK (pattern_score >= 0 AND pattern_score <= 100)
    "ip_pattern_detection_pattern_type_check" CHECK (pattern_type::text = ANY (ARRAY['rapid_visits'::character varying, 'form_spam'::character varying, 'bot_behavior'::character varying, 'scraping'::character varying, 'suspicious'::character varying]::text[]))
Foreign-key constraints:
    "ip_pattern_detection_ip_tracking_id_fkey" FOREIGN KEY (ip_tracking_id) REFERENCES ip_tracking(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: ip_pool
                                                                   Table "public.ip_pool"
   Column   |            Type             | Collation | Nullable |               Default               | Storage  | Compression | Stats target | Description 
------------+-----------------------------+-----------+----------+-------------------------------------+----------+-------------+--------------+-------------
 id         | integer                     |           | not null | nextval('ip_pool_id_seq'::regclass) | plain    |             |              | 
 ip_address | inet                        |           | not null |                                     | main     |             |              | 
 type       | character varying(20)       |           | not null |                                     | extended |             |              | 
 reason     | text                        |           |          |                                     | extended |             |              | 
 added_by   | uuid                        |           |          |                                     | plain    |             |              | 
 expires_at | timestamp without time zone |           |          |                                     | plain    |             |              | 
 created_at | timestamp without time zone |           |          | now()                               | plain    |             |              | 
Indexes:
    "ip_pool_pkey" PRIMARY KEY, btree (id)
    "idx_ip_pool_ip_address" btree (ip_address)
    "idx_ip_pool_type" btree (type)
Check constraints:
    "ip_pool_type_check" CHECK (type::text = ANY (ARRAY['whitelist'::character varying, 'blacklist'::character varying]::text[]))
Foreign-key constraints:
    "ip_pool_added_by_fkey" FOREIGN KEY (added_by) REFERENCES users(id)
Access method: heap

-- Rows:      0


-- Table: ip_rate_limits
                                                                    Table "public.ip_rate_limits"
    Column    |            Type             | Collation | Nullable |                  Default                   | Storage  | Compression | Stats target | Description 
--------------+-----------------------------+-----------+----------+--------------------------------------------+----------+-------------+--------------+-------------
 id           | integer                     |           | not null | nextval('ip_rate_limits_id_seq'::regclass) | plain    |             |              | 
 ip_address   | inet                        |           | not null |                                            | main     |             |              | 
 site_id      | uuid                        |           |          |                                            | plain    |             |              | 
 action       | character varying(50)       |           |          |                                            | extended |             |              | 
 count        | integer                     |           |          | 1                                          | plain    |             |              | 
 window_start | timestamp without time zone |           | not null |                                            | plain    |             |              | 
 window_end   | timestamp without time zone |           | not null |                                            | plain    |             |              | 
 blocked      | boolean                     |           |          | false                                      | plain    |             |              | 
 created_at   | timestamp without time zone |           |          | now()                                      | plain    |             |              | 
Indexes:
    "ip_rate_limits_pkey" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "ip_rate_limits_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id)
Access method: heap

-- Rows:      0


-- Table: ip_tracking
                                                                        Table "public.ip_tracking"
        Column        |            Type             | Collation | Nullable |                 Default                 | Storage  | Compression | Stats target | Description 
----------------------+-----------------------------+-----------+----------+-----------------------------------------+----------+-------------+--------------+-------------
 id                   | bigint                      |           | not null | nextval('ip_tracking_id_seq'::regclass) | plain    |             |              | 
 ip                   | character varying(45)       |           | not null |                                         | extended |             |              | 
 country              | character varying(2)        |           |          |                                         | extended |             |              | 
 country_name         | character varying(100)      |           |          |                                         | extended |             |              | 
 city                 | character varying(100)      |           |          |                                         | extended |             |              | 
 isp                  | character varying(255)      |           |          |                                         | extended |             |              | 
 device_type          | character varying(20)       |           |          |                                         | extended |             |              | 
 os                   | character varying(50)       |           |          |                                         | extended |             |              | 
 browser              | character varying(50)       |           |          |                                         | extended |             |              | 
 visit_count          | integer                     |           |          | 1                                       | plain    |             |              | 
 first_seen           | timestamp without time zone |           |          | now()                                   | plain    |             |              | 
 last_seen            | timestamp without time zone |           |          | now()                                   | plain    |             |              | 
 form_submissions     | integer                     |           |          | 0                                       | plain    |             |              | 
 same_form_spam_count | integer                     |           |          | 0                                       | plain    |             |              | 
 risk_score           | integer                     |           |          | 0                                       | plain    |             |              | 
 bot_score            | integer                     |           |          | 0                                       | plain    |             |              | 
 spam_score           | integer                     |           |          | 0                                       | plain    |             |              | 
 list_status          | character varying(20)       |           |          | 'unknown'::character varying            | extended |             |              | 
 redirect_version     | character varying(20)       |           |          | 'clean'::character varying              | extended |             |              | 
 admin_notes          | text                        |           |          |                                         | extended |             |              | 
 manual_decision      | boolean                     |           |          | false                                   | plain    |             |              | 
 admin_user_id        | uuid                        |           |          |                                         | plain    |             |              | 
 decision_date        | timestamp without time zone |           |          |                                         | plain    |             |              | 
 created_at           | timestamp without time zone |           |          | now()                                   | plain    |             |              | 
 updated_at           | timestamp without time zone |           |          | now()                                   | plain    |             |              | 
Indexes:
    "ip_tracking_pkey" PRIMARY KEY, btree (id)
    "idx_ip_tracking_country" btree (country)
    "idx_ip_tracking_ip" btree (ip)
    "idx_ip_tracking_last_seen" btree (last_seen)
    "idx_ip_tracking_list_status" btree (list_status)
    "idx_ip_tracking_risk_score" btree (risk_score)
    "ip_tracking_ip_key" UNIQUE CONSTRAINT, btree (ip)
Check constraints:
    "ip_tracking_bot_score_check" CHECK (bot_score >= 0 AND bot_score <= 100)
    "ip_tracking_list_status_check" CHECK (list_status::text = ANY (ARRAY['whitelist'::character varying, 'graylist'::character varying, 'blacklist'::character varying, 'unknown'::character varying]::text[]))
    "ip_tracking_redirect_version_check" CHECK (redirect_version::text = ANY (ARRAY['clean'::character varying, 'gray'::character varying, 'aggressive'::character varying]::text[]))
    "ip_tracking_risk_score_check" CHECK (risk_score >= 0 AND risk_score <= 100)
    "ip_tracking_spam_score_check" CHECK (spam_score >= 0 AND spam_score <= 100)
Referenced by:
    TABLE "form_submission_history" CONSTRAINT "form_submission_history_ip_tracking_id_fkey" FOREIGN KEY (ip_tracking_id) REFERENCES ip_tracking(id) ON DELETE CASCADE
    TABLE "ip_decision_history" CONSTRAINT "ip_decision_history_ip_tracking_id_fkey" FOREIGN KEY (ip_tracking_id) REFERENCES ip_tracking(id) ON DELETE CASCADE
    TABLE "ip_pattern_detection" CONSTRAINT "ip_pattern_detection_ip_tracking_id_fkey" FOREIGN KEY (ip_tracking_id) REFERENCES ip_tracking(id) ON DELETE CASCADE
    TABLE "ip_user_agent_history" CONSTRAINT "ip_user_agent_history_ip_tracking_id_fkey" FOREIGN KEY (ip_tracking_id) REFERENCES ip_tracking(id) ON DELETE CASCADE
    TABLE "ip_visit_history" CONSTRAINT "ip_visit_history_ip_tracking_id_fkey" FOREIGN KEY (ip_tracking_id) REFERENCES ip_tracking(id) ON DELETE CASCADE
Triggers:
    update_ip_tracking_updated_at BEFORE UPDATE ON ip_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
Access method: heap

-- Rows:      3


-- Table: ip_user_agent_history
                                                                          Table "public.ip_user_agent_history"
          Column          |            Type             | Collation | Nullable |                      Default                      | Storage  | Compression | Stats target | Description 
--------------------------+-----------------------------+-----------+----------+---------------------------------------------------+----------+-------------+--------------+-------------
 id                       | bigint                      |           | not null | nextval('ip_user_agent_history_id_seq'::regclass) | plain    |             |              | 
 ip                       | character varying(45)       |           | not null |                                                   | extended |             |              | 
 user_agent               | text                        |           | not null |                                                   | extended |             |              | 
 parsed_device            | character varying(20)       |           |          |                                                   | extended |             |              | 
 parsed_os                | character varying(50)       |           |          |                                                   | extended |             |              | 
 parsed_browser           | character varying(50)       |           |          |                                                   | extended |             |              | 
 is_bot                   | boolean                     |           |          | false                                             | plain    |             |              | 
 claims_to_be_bot         | boolean                     |           |          | false                                             | plain    |             |              | 
 bot_type                 | character varying(50)       |           |          |                                                   | extended |             |              | 
 dns_hostname             | character varying(255)      |           |          |                                                   | extended |             |              | 
 dns_verified             | boolean                     |           |          | false                                             | plain    |             |              | 
 dns_check_date           | timestamp without time zone |           |          |                                                   | plain    |             |              | 
 first_seen               | timestamp without time zone |           |          | now()                                             | plain    |             |              | 
 last_seen                | timestamp without time zone |           |          | now()                                             | plain    |             |              | 
 visit_count_with_this_ua | integer                     |           |          | 1                                                 | plain    |             |              | 
 ip_tracking_id           | bigint                      |           |          |                                                   | plain    |             |              | 
Indexes:
    "ip_user_agent_history_pkey" PRIMARY KEY, btree (id)
    "idx_ip_user_agent_dns_verified" btree (dns_verified)
    "idx_ip_user_agent_hash" btree (md5(user_agent))
    "idx_ip_user_agent_ip" btree (ip)
    "idx_ip_user_agent_is_bot" btree (is_bot)
Foreign-key constraints:
    "ip_user_agent_history_ip_tracking_id_fkey" FOREIGN KEY (ip_tracking_id) REFERENCES ip_tracking(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: ip_visit_history
                                                                       Table "public.ip_visit_history"
      Column       |            Type             | Collation | Nullable |                   Default                    | Storage  | Compression | Stats target | Description 
-------------------+-----------------------------+-----------+----------+----------------------------------------------+----------+-------------+--------------+-------------
 id                | bigint                      |           | not null | nextval('ip_visit_history_id_seq'::regclass) | plain    |             |              | 
 ip                | character varying(45)       |           | not null |                                              | extended |             |              | 
 session_id        | character varying(255)      |           |          |                                              | extended |             |              | 
 page_url          | text                        |           |          |                                              | extended |             |              | 
 page_title        | character varying(500)      |           |          |                                              | extended |             |              | 
 referer           | text                        |           |          |                                              | extended |             |              | 
 utm_source        | character varying(255)      |           |          |                                              | extended |             |              | 
 utm_medium        | character varying(255)      |           |          |                                              | extended |             |              | 
 utm_campaign      | character varying(255)      |           |          |                                              | extended |             |              | 
 user_agent        | text                        |           |          |                                              | extended |             |              | 
 device_type       | character varying(20)       |           |          |                                              | extended |             |              | 
 os                | character varying(50)       |           |          |                                              | extended |             |              | 
 browser           | character varying(50)       |           |          |                                              | extended |             |              | 
 screen_resolution | character varying(20)       |           |          |                                              | extended |             |              | 
 time_on_page      | integer                     |           |          |                                              | plain    |             |              | 
 scroll_depth      | integer                     |           |          |                                              | plain    |             |              | 
 clicks_count      | integer                     |           |          | 0                                            | plain    |             |              | 
 mouse_movements   | boolean                     |           |          | false                                        | plain    |             |              | 
 keyboard_inputs   | boolean                     |           |          | false                                        | plain    |             |              | 
 is_bot            | boolean                     |           |          | false                                        | plain    |             |              | 
 bot_type          | character varying(50)       |           |          |                                              | extended |             |              | 
 bot_verified      | boolean                     |           |          | false                                        | plain    |             |              | 
 visit_timestamp   | timestamp without time zone |           |          | now()                                        | plain    |             |              | 
 leave_timestamp   | timestamp without time zone |           |          |                                              | plain    |             |              | 
 ip_tracking_id    | bigint                      |           |          |                                              | plain    |             |              | 
Indexes:
    "ip_visit_history_pkey" PRIMARY KEY, btree (id)
    "idx_ip_visit_history_ip" btree (ip)
    "idx_ip_visit_history_is_bot" btree (is_bot)
    "idx_ip_visit_history_session_id" btree (session_id)
    "idx_ip_visit_history_visit_timestamp" btree (visit_timestamp)
Check constraints:
    "ip_visit_history_scroll_depth_check" CHECK (scroll_depth >= 0 AND scroll_depth <= 100)
Foreign-key constraints:
    "ip_visit_history_ip_tracking_id_fkey" FOREIGN KEY (ip_tracking_id) REFERENCES ip_tracking(id) ON DELETE CASCADE
Access method: heap

-- Rows:      1


-- Table: lead_call_history
                                                                    Table "public.lead_call_history"
    Column    |            Type             | Collation | Nullable |                    Default                    | Storage  | Compression | Stats target | Description 
--------------+-----------------------------+-----------+----------+-----------------------------------------------+----------+-------------+--------------+-------------
 id           | integer                     |           | not null | nextval('lead_call_history_id_seq'::regclass) | plain    |             |              | 
 lead_id      | uuid                        |           |          |                                               | plain    |             |              | 
 agent_id     | character varying(100)      |           |          |                                               | extended |             |              | 
 call_result  | character varying(50)       |           |          |                                               | extended |             |              | 
 call_notes   | text                        |           |          |                                               | extended |             |              | 
 status_after | character varying(50)       |           |          |                                               | extended |             |              | 
 called_at    | timestamp without time zone |           |          | now()                                         | plain    |             |              | 
Indexes:
    "lead_call_history_pkey" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "lead_call_history_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: lead_status_history
                                                                   Table "public.lead_status_history"
   Column   |            Type             | Collation | Nullable |                     Default                     | Storage  | Compression | Stats target | Description 
------------+-----------------------------+-----------+----------+-------------------------------------------------+----------+-------------+--------------+-------------
 id         | integer                     |           | not null | nextval('lead_status_history_id_seq'::regclass) | plain    |             |              | 
 lead_id    | uuid                        |           |          |                                                 | plain    |             |              | 
 old_status | character varying(50)       |           |          |                                                 | extended |             |              | 
 new_status | character varying(50)       |           |          |                                                 | extended |             |              | 
 changed_by | uuid                        |           |          |                                                 | plain    |             |              | 
 notes      | text                        |           |          |                                                 | extended |             |              | 
 created_at | timestamp without time zone |           |          | now()                                           | plain    |             |              | 
Indexes:
    "lead_status_history_pkey" PRIMARY KEY, btree (id)
    "idx_lead_status_history_created_at" btree (created_at)
    "idx_lead_status_history_lead_id" btree (lead_id)
Foreign-key constraints:
    "lead_status_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES users(id)
    "lead_status_history_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: leads
                                                                      Table "public.leads"
        Column         |            Type             | Collation | Nullable |           Default            | Storage  | Compression | Stats target | Description 
-----------------------+-----------------------------+-----------+----------+------------------------------+----------+-------------+--------------+-------------
 id                    | uuid                        |           | not null | gen_random_uuid()            | plain    |             |              | 
 lead_code             | character varying(50)       |           | not null |                              | extended |             |              | 
 campaign_id           | uuid                        |           |          |                              | plain    |             |              | 
 network_id            | uuid                        |           |          |                              | plain    |             |              | 
 site_id               | uuid                        |           |          |                              | plain    |             |              | 
 product_id            | uuid                        |           |          |                              | plain    |             |              | 
 first_name            | character varying(100)      |           | not null |                              | extended |             |              | 
 last_name             | character varying(100)      |           | not null |                              | extended |             |              | 
 phone                 | character varying(20)       |           | not null |                              | extended |             |              | 
 email                 | character varying(255)      |           |          |                              | extended |             |              | 
 country               | character varying(100)      |           |          |                              | extended |             |              | 
 city                  | character varying(100)      |           |          |                              | extended |             |              | 
 address               | text                        |           |          |                              | extended |             |              | 
 utm_source            | character varying(100)      |           |          |                              | extended |             |              | 
 utm_medium            | character varying(100)      |           |          |                              | extended |             |              | 
 utm_campaign          | character varying(255)      |           |          |                              | extended |             |              | 
 utm_content           | character varying(255)      |           |          |                              | extended |             |              | 
 utm_term              | character varying(255)      |           |          |                              | extended |             |              | 
 ip_address            | inet                        |           |          |                              | main     |             |              | 
 user_agent            | text                        |           |          |                              | extended |             |              | 
 device                | character varying(50)       |           |          |                              | extended |             |              | 
 browser               | character varying(50)       |           |          |                              | extended |             |              | 
 status                | character varying(50)       |           |          | 'pending'::character varying | extended |             |              | 
 sent_to_network       | boolean                     |           |          | false                        | plain    |             |              | 
 sent_to_network_at    | timestamp without time zone |           |          |                              | plain    |             |              | 
 network_lead_id       | character varying(100)      |           |          |                              | extended |             |              | 
 network_status        | character varying(50)       |           |          |                              | extended |             |              | 
 call_count            | integer                     |           |          | 0                            | plain    |             |              | 
 last_call_date        | timestamp without time zone |           |          |                              | plain    |             |              | 
 assigned_agent_id     | character varying(100)      |           |          |                              | extended |             |              | 
 agent_notes           | text                        |           |          |                              | extended |             |              | 
 order_confirmed       | boolean                     |           |          | false                        | plain    |             |              | 
 order_date            | timestamp without time zone |           |          |                              | plain    |             |              | 
 order_amount          | numeric(10,2)               |           |          |                              | main     |             |              | 
 sale_amount           | numeric(10,2)               |           |          |                              | main     |             |              | 
 shipping_address      | text                        |           |          |                              | extended |             |              | 
 shipping_city         | character varying(100)      |           |          |                              | extended |             |              | 
 shipping_district     | character varying(100)      |           |          |                              | extended |             |              | 
 cargo_company         | character varying(100)      |           |          |                              | extended |             |              | 
 cargo_tracking_number | character varying(100)      |           |          |                              | extended |             |              | 
 cargo_status          | character varying(50)       |           |          |                              | extended |             |              | 
 cargo_shipped_date    | timestamp without time zone |           |          |                              | plain    |             |              | 
 cargo_delivered_date  | timestamp without time zone |           |          |                              | plain    |             |              | 
 cargo_last_update     | timestamp without time zone |           |          |                              | plain    |             |              | 
 is_duplicate          | boolean                     |           |          | false                        | plain    |             |              | 
 original_lead_id      | uuid                        |           |          |                              | plain    |             |              | 
 duplicate_count       | integer                     |           |          | 0                            | plain    |             |              | 
 priority              | integer                     |           |          | 0                            | plain    |             |              | 
 created_at            | timestamp without time zone |           |          | now()                        | plain    |             |              | 
 updated_at            | timestamp without time zone |           |          | now()                        | plain    |             |              | 
 last_seen_at          | timestamp without time zone |           |          |                              | plain    |             |              | 
Indexes:
    "leads_pkey" PRIMARY KEY, btree (id)
    "idx_leads_campaign_id" btree (campaign_id)
    "idx_leads_created_at" btree (created_at)
    "idx_leads_is_duplicate" btree (is_duplicate)
    "idx_leads_lead_code" btree (lead_code)
    "idx_leads_network_id" btree (network_id)
    "idx_leads_network_lead_id" btree (network_lead_id)
    "idx_leads_phone" btree (phone)
    "idx_leads_site_id" btree (site_id)
    "idx_leads_status" btree (status)
    "leads_lead_code_key" UNIQUE CONSTRAINT, btree (lead_code)
Check constraints:
    "leads_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying, 'calling'::character varying, 'answered'::character varying, 'interested'::character varying, 'callback_scheduled'::character varying, 'sale_completed'::character varying, 'cargo_preparing'::character varying, 'cargo_shipped'::character varying, 'cargo_delivered'::character varying, 'unreachable'::character varying, 'not_interested'::character varying, 'trash'::character varying, 'cancelled'::character varying, 'returned'::character varying]::text[]))
Foreign-key constraints:
    "leads_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    "leads_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE SET NULL
    "leads_original_lead_id_fkey" FOREIGN KEY (original_lead_id) REFERENCES leads(id)
    "leads_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    "leads_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
Referenced by:
    TABLE "failed_network_requests" CONSTRAINT "failed_network_requests_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    TABLE "form_submissions" CONSTRAINT "form_submissions_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id)
    TABLE "lead_call_history" CONSTRAINT "lead_call_history_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    TABLE "lead_status_history" CONSTRAINT "lead_status_history_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    TABLE "leads" CONSTRAINT "leads_original_lead_id_fkey" FOREIGN KEY (original_lead_id) REFERENCES leads(id)
    TABLE "webhook_logs" CONSTRAINT "webhook_logs_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
Triggers:
    trigger_log_lead_status_change AFTER UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION log_lead_status_change()
    update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
Access method: heap

-- Rows:      5


-- Table: network_api_tokens
                                                                    Table "public.network_api_tokens"
    Column    |            Type             | Collation | Nullable |                    Default                     | Storage  | Compression | Stats target | Description 
--------------+-----------------------------+-----------+----------+------------------------------------------------+----------+-------------+--------------+-------------
 id           | integer                     |           | not null | nextval('network_api_tokens_id_seq'::regclass) | plain    |             |              | 
 network_id   | uuid                        |           |          |                                                | plain    |             |              | 
 token_hash   | character varying(255)      |           | not null |                                                | extended |             |              | 
 token_name   | character varying(100)      |           |          |                                                | extended |             |              | 
 last_used_at | timestamp without time zone |           |          |                                                | plain    |             |              | 
 expires_at   | timestamp without time zone |           |          |                                                | plain    |             |              | 
 status       | character varying(20)       |           |          | 'active'::character varying                    | extended |             |              | 
 created_at   | timestamp without time zone |           |          | now()                                          | plain    |             |              | 
Indexes:
    "network_api_tokens_pkey" PRIMARY KEY, btree (id)
    "idx_network_api_tokens_network_id" btree (network_id)
    "idx_network_api_tokens_token_hash" btree (token_hash)
Check constraints:
    "network_api_tokens_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying, 'revoked'::character varying]::text[]))
Foreign-key constraints:
    "network_api_tokens_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: network_products
                                                                         Table "public.network_products"
         Column         |            Type             | Collation | Nullable |                   Default                    | Storage  | Compression | Stats target | Description 
------------------------+-----------------------------+-----------+----------+----------------------------------------------+----------+-------------+--------------+-------------
 id                     | integer                     |           | not null | nextval('network_products_id_seq'::regclass) | plain    |             |              | 
 network_id             | uuid                        |           |          |                                              | plain    |             |              | 
 product_id             | uuid                        |           |          |                                              | plain    |             |              | 
 network_offer_id       | character varying(100)      |           | not null |                                              | extended |             |              | 
 commission_model       | character varying(20)       |           | not null |                                              | extended |             |              | 
 commission_amount      | numeric(10,2)               |           | not null |                                              | main     |             |              | 
 commission_sale_amount | numeric(10,2)               |           |          |                                              | main     |             |              | 
 status                 | character varying(20)       |           |          | 'active'::character varying                  | extended |             |              | 
 created_at             | timestamp without time zone |           |          | now()                                        | plain    |             |              | 
 updated_at             | timestamp without time zone |           |          | now()                                        | plain    |             |              | 
Indexes:
    "network_products_pkey" PRIMARY KEY, btree (id)
    "idx_network_products_network_id" btree (network_id)
    "idx_network_products_product_id" btree (product_id)
    "network_products_network_id_product_id_key" UNIQUE CONSTRAINT, btree (network_id, product_id)
Check constraints:
    "network_products_commission_model_check" CHECK (commission_model::text = ANY (ARRAY['cpl'::character varying, 'cps'::character varying, 'hybrid'::character varying]::text[]))
    "network_products_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[]))
Foreign-key constraints:
    "network_products_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
    "network_products_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: networks
                                                                    Table "public.networks"
        Column        |            Type             | Collation | Nullable |           Default           | Storage  | Compression | Stats target | Description 
----------------------+-----------------------------+-----------+----------+-----------------------------+----------+-------------+--------------+-------------
 id                   | uuid                        |           | not null | gen_random_uuid()           | plain    |             |              | 
 user_id              | uuid                        |           |          |                             | plain    |             |              | 
 network_name         | character varying(255)      |           | not null |                             | extended |             |              | 
 company_name         | character varying(255)      |           |          |                             | extended |             |              | 
 contact_email        | character varying(255)      |           | not null |                             | extended |             |              | 
 contact_phone        | character varying(20)       |           |          |                             | extended |             |              | 
 status               | character varying(20)       |           |          | 'active'::character varying | extended |             |              | 
 api_token_hash       | character varying(255)      |           |          |                             | extended |             |              | 
 api_add_lead_url     | text                        |           |          |                             | extended |             |              | 
 api_check_status_url | text                        |           |          |                             | extended |             |              | 
 api_auth_method      | character varying(50)       |           |          | 'bearer'::character varying | extended |             |              | 
 crm_login_url        | text                        |           |          |                             | extended |             |              | 
 call_center_hours    | jsonb                       |           |          |                             | extended |             |              | 
 deposit_balance      | numeric(10,2)               |           |          | 0.00                        | main     |             |              | 
 deposit_currency     | character varying(3)        |           |          | 'USD'::character varying    | extended |             |              | 
 notes                | text                        |           |          |                             | extended |             |              | 
 created_at           | timestamp without time zone |           |          | now()                       | plain    |             |              | 
 updated_at           | timestamp without time zone |           |          | now()                       | plain    |             |              | 
Indexes:
    "networks_pkey" PRIMARY KEY, btree (id)
    "idx_networks_api_token_hash" btree (api_token_hash)
    "idx_networks_status" btree (status)
    "idx_networks_user_id" btree (user_id)
    "networks_api_token_hash_key" UNIQUE CONSTRAINT, btree (api_token_hash)
Check constraints:
    "networks_api_auth_method_check" CHECK (api_auth_method::text = ANY (ARRAY['bearer'::character varying, 'api_key'::character varying, 'basic'::character varying]::text[]))
    "networks_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying, 'test'::character varying, 'suspended'::character varying, 'inactive'::character varying]::text[]))
Foreign-key constraints:
    "networks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
Referenced by:
    TABLE "api_requests_log" CONSTRAINT "api_requests_log_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE SET NULL
    TABLE "campaigns" CONSTRAINT "campaigns_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
    TABLE "daily_stats" CONSTRAINT "daily_stats_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
    TABLE "deposit_transactions" CONSTRAINT "deposit_transactions_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
    TABLE "failed_network_requests" CONSTRAINT "failed_network_requests_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
    TABLE "invoices" CONSTRAINT "invoices_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
    TABLE "leads" CONSTRAINT "leads_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE SET NULL
    TABLE "network_api_tokens" CONSTRAINT "network_api_tokens_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
    TABLE "network_products" CONSTRAINT "network_products_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
    TABLE "payments" CONSTRAINT "payments_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
    TABLE "webhook_logs" CONSTRAINT "webhook_logs_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE SET NULL
Triggers:
    update_networks_updated_at BEFORE UPDATE ON networks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
Access method: heap

-- Rows:      0


-- Table: nginx_configs
                                                         Table "public.nginx_configs"
     Column     |            Type             | Collation | Nullable |      Default      | Storage  | Compression | Stats target | Description 
----------------+-----------------------------+-----------+----------+-------------------+----------+-------------+--------------+-------------
 id             | uuid                        |           | not null | gen_random_uuid() | plain    |             |              | 
 site_id        | uuid                        |           |          |                   | plain    |             |              | 
 config_path    | text                        |           | not null |                   | extended |             |              | 
 config_content | text                        |           | not null |                   | extended |             |              | 
 is_active      | boolean                     |           |          | true              | plain    |             |              | 
 tested         | boolean                     |           |          | false             | plain    |             |              | 
 test_result    | text                        |           |          |                   | extended |             |              | 
 created_at     | timestamp without time zone |           |          | now()             | plain    |             |              | 
 updated_at     | timestamp without time zone |           |          | now()             | plain    |             |              | 
Indexes:
    "nginx_configs_pkey" PRIMARY KEY, btree (id)
    "idx_nginx_configs_is_active" btree (is_active)
    "idx_nginx_configs_site_id" btree (site_id)
Foreign-key constraints:
    "nginx_configs_site_id_fkey" FOREIGN KEY (site_id) REFERENCES deployed_sites(id) ON DELETE CASCADE
Triggers:
    update_nginx_configs_updated_at BEFORE UPDATE ON nginx_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
Access method: heap

-- Rows:      0


-- Table: page_visits
                                                                     Table "public.page_visits"
     Column     |            Type             | Collation | Nullable |                 Default                 | Storage  | Compression | Stats target | Description 
----------------+-----------------------------+-----------+----------+-----------------------------------------+----------+-------------+--------------+-------------
 id             | bigint                      |           | not null | nextval('page_visits_id_seq'::regclass) | plain    |             |              | 
 site_id        | uuid                        |           |          |                                         | plain    |             |              | 
 campaign_id    | uuid                        |           |          |                                         | plain    |             |              | 
 ip_address     | inet                        |           | not null |                                         | main     |             |              | 
 user_agent     | text                        |           |          |                                         | extended |             |              | 
 device         | character varying(50)       |           |          |                                         | extended |             |              | 
 browser        | character varying(50)       |           |          |                                         | extended |             |              | 
 os             | character varying(50)       |           |          |                                         | extended |             |              | 
 country        | character varying(100)      |           |          |                                         | extended |             |              | 
 city           | character varying(100)      |           |          |                                         | extended |             |              | 
 session_id     | uuid                        |           | not null |                                         | plain    |             |              | 
 page_path      | text                        |           |          |                                         | extended |             |              | 
 referrer       | text                        |           |          |                                         | extended |             |              | 
 utm_source     | character varying(100)      |           |          |                                         | extended |             |              | 
 utm_medium     | character varying(100)      |           |          |                                         | extended |             |              | 
 utm_campaign   | character varying(255)      |           |          |                                         | extended |             |              | 
 is_bot         | boolean                     |           |          | false                                   | plain    |             |              | 
 bot_confidence | numeric(5,2)                |           |          |                                         | main     |             |              | 
 bot_signals    | jsonb                       |           |          |                                         | extended |             |              | 
 time_on_page   | integer                     |           |          |                                         | plain    |             |              | 
 created_at     | timestamp without time zone |           |          | now()                                   | plain    |             |              | 
Indexes:
    "page_visits_pkey" PRIMARY KEY, btree (id)
    "idx_page_visits_campaign_id" btree (campaign_id)
    "idx_page_visits_created_at" btree (created_at)
    "idx_page_visits_ip_address" btree (ip_address)
    "idx_page_visits_is_bot" btree (is_bot)
    "idx_page_visits_session_id" btree (session_id)
    "idx_page_visits_site_id" btree (site_id)
Foreign-key constraints:
    "page_visits_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    "page_visits_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
Access method: heap

-- Rows:      0


-- Table: password_reset_tokens
                                                                   Table "public.password_reset_tokens"
   Column   |            Type             | Collation | Nullable |                      Default                      | Storage  | Compression | Stats target | Description 
------------+-----------------------------+-----------+----------+---------------------------------------------------+----------+-------------+--------------+-------------
 id         | integer                     |           | not null | nextval('password_reset_tokens_id_seq'::regclass) | plain    |             |              | 
 user_id    | uuid                        |           |          |                                                   | plain    |             |              | 
 token_hash | character varying(255)      |           | not null |                                                   | extended |             |              | 
 expires_at | timestamp without time zone |           | not null |                                                   | plain    |             |              | 
 used_at    | timestamp without time zone |           |          |                                                   | plain    |             |              | 
 created_at | timestamp without time zone |           |          | now()                                             | plain    |             |              | 
Indexes:
    "password_reset_tokens_pkey" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "password_reset_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: payments
                                                                    Table "public.payments"
      Column       |            Type             | Collation | Nullable |            Default             | Storage  | Compression | Stats target | Description 
-------------------+-----------------------------+-----------+----------+--------------------------------+----------+-------------+--------------+-------------
 id                | uuid                        |           | not null | gen_random_uuid()              | plain    |             |              | 
 invoice_id        | uuid                        |           |          |                                | plain    |             |              | 
 network_id        | uuid                        |           |          |                                | plain    |             |              | 
 amount            | numeric(10,2)               |           | not null |                                | main     |             |              | 
 currency          | character varying(3)        |           |          | 'USD'::character varying       | extended |             |              | 
 payment_method    | character varying(50)       |           |          |                                | extended |             |              | 
 payment_reference | character varying(100)      |           |          |                                | extended |             |              | 
 receipt_url       | text                        |           |          |                                | extended |             |              | 
 status            | character varying(20)       |           |          | 'completed'::character varying | extended |             |              | 
 paid_by           | uuid                        |           |          |                                | plain    |             |              | 
 paid_at           | timestamp without time zone |           |          | now()                          | plain    |             |              | 
 notes             | text                        |           |          |                                | extended |             |              | 
 created_at        | timestamp without time zone |           |          | now()                          | plain    |             |              | 
Indexes:
    "payments_pkey" PRIMARY KEY, btree (id)
Check constraints:
    "payments_status_check" CHECK (status::text = ANY (ARRAY['completed'::character varying, 'pending'::character varying, 'failed'::character varying, 'refunded'::character varying]::text[]))
Foreign-key constraints:
    "payments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    "payments_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE CASCADE
    "payments_paid_by_fkey" FOREIGN KEY (paid_by) REFERENCES users(id)
Access method: heap

-- Rows:      0


-- Table: products
                                                                Table "public.products"
    Column    |            Type             | Collation | Nullable |           Default           | Storage  | Compression | Stats target | Description 
--------------+-----------------------------+-----------+----------+-----------------------------+----------+-------------+--------------+-------------
 id           | uuid                        |           | not null | gen_random_uuid()           | plain    |             |              | 
 product_code | character varying(50)       |           | not null |                             | extended |             |              | 
 product_name | character varying(255)      |           | not null |                             | extended |             |              | 
 description  | text                        |           |          |                             | extended |             |              | 
 mockup_url   | text                        |           |          |                             | extended |             |              | 
 status       | character varying(20)       |           |          | 'active'::character varying | extended |             |              | 
 created_at   | timestamp without time zone |           |          | now()                       | plain    |             |              | 
 updated_at   | timestamp without time zone |           |          | now()                       | plain    |             |              | 
Indexes:
    "products_pkey" PRIMARY KEY, btree (id)
    "products_product_code_key" UNIQUE CONSTRAINT, btree (product_code)
Check constraints:
    "products_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[]))
Referenced by:
    TABLE "campaigns" CONSTRAINT "campaigns_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    TABLE "leads" CONSTRAINT "leads_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    TABLE "network_products" CONSTRAINT "network_products_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
Access method: heap

-- Rows:      2


-- Table: role_permissions
                                                                   Table "public.role_permissions"
   Column   |            Type             | Collation | Nullable |                   Default                    | Storage  | Compression | Stats target | Description 
------------+-----------------------------+-----------+----------+----------------------------------------------+----------+-------------+--------------+-------------
 id         | integer                     |           | not null | nextval('role_permissions_id_seq'::regclass) | plain    |             |              | 
 user_id    | uuid                        |           |          |                                              | plain    |             |              | 
 permission | character varying(100)      |           | not null |                                              | extended |             |              | 
 granted_by | uuid                        |           |          |                                              | plain    |             |              | 
 created_at | timestamp without time zone |           |          | now()                                        | plain    |             |              | 
Indexes:
    "role_permissions_pkey" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "role_permissions_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES users(id)
    "role_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: sessions
                                                              Table "public.sessions"
       Column       |            Type             | Collation | Nullable |      Default      | Storage  | Compression | Stats target | Description 
--------------------+-----------------------------+-----------+----------+-------------------+----------+-------------+--------------+-------------
 id                 | uuid                        |           | not null | gen_random_uuid() | plain    |             |              | 
 user_id            | uuid                        |           |          |                   | plain    |             |              | 
 token_hash         | character varying(255)      |           | not null |                   | extended |             |              | 
 refresh_token_hash | character varying(255)      |           |          |                   | extended |             |              | 
 ip_address         | inet                        |           |          |                   | main     |             |              | 
 user_agent         | text                        |           |          |                   | extended |             |              | 
 device_info        | jsonb                       |           |          |                   | extended |             |              | 
 expires_at         | timestamp without time zone |           | not null |                   | plain    |             |              | 
 created_at         | timestamp without time zone |           |          | now()             | plain    |             |              | 
Indexes:
    "sessions_pkey" PRIMARY KEY, btree (id)
    "idx_sessions_expires_at" btree (expires_at)
    "idx_sessions_token_hash" btree (token_hash)
    "idx_sessions_user_id" btree (user_id)
Foreign-key constraints:
    "sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: site_deployments
                                                                     Table "public.site_deployments"
    Column     |            Type             | Collation | Nullable |                   Default                    | Storage  | Compression | Stats target | Description 
---------------+-----------------------------+-----------+----------+----------------------------------------------+----------+-------------+--------------+-------------
 id            | integer                     |           | not null | nextval('site_deployments_id_seq'::regclass) | plain    |             |              | 
 site_id       | uuid                        |           |          |                                              | plain    |             |              | 
 version       | integer                     |           | not null |                                              | plain    |             |              | 
 zip_file_path | text                        |           |          |                                              | extended |             |              | 
 deployed_at   | timestamp without time zone |           |          | now()                                        | plain    |             |              | 
 deployed_by   | uuid                        |           |          |                                              | plain    |             |              | 
 status        | character varying(20)       |           |          | 'active'::character varying                  | extended |             |              | 
Indexes:
    "site_deployments_pkey" PRIMARY KEY, btree (id)
Check constraints:
    "site_deployments_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying, 'rollback'::character varying, 'archived'::character varying]::text[]))
Foreign-key constraints:
    "site_deployments_deployed_by_fkey" FOREIGN KEY (deployed_by) REFERENCES users(id)
    "site_deployments_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
Access method: heap

-- Rows:      0


-- Table: sites
                                                                                  Table "public.sites"
       Column        |            Type             | Collation | Nullable |           Default           | Storage  | Compression | Stats target |              Description               
---------------------+-----------------------------+-----------+----------+-----------------------------+----------+-------------+--------------+----------------------------------------
 id                  | uuid                        |           | not null | gen_random_uuid()           | plain    |             |              | 
 site_name           | character varying(255)      |           | not null |                             | extended |             |              | 
 slug                | character varying(100)      |           | not null |                             | extended |             |              | 
 domain              | character varying(255)      |           |          |                             | extended |             |              | 
 port                | integer                     |           | not null |                             | plain    |             |              | 
 file_path           | text                        |           | not null |                             | extended |             |              | 
 pm2_process_name    | character varying(100)      |           |          |                             | extended |             |              | 
 google_analytics_id | character varying(50)       |           |          |                             | extended |             |              | 
 facebook_pixel_id   | character varying(50)       |           |          |                             | extended |             |              | 
 tiktok_pixel_id     | character varying(50)       |           |          |                             | extended |             |              | 
 custom_scripts      | text                        |           |          |                             | extended |             |              | 
 status              | character varying(20)       |           |          | 'active'::character varying | extended |             |              | Current operational status of the site
 test_mode_ips       | inet[]                      |           |          |                             | extended |             |              | 
 version             | integer                     |           |          | 1                           | plain    |             |              | 
 uploaded_by         | uuid                        |           |          |                             | plain    |             |              | 
 created_at          | timestamp without time zone |           |          | now()                       | plain    |             |              | 
 updated_at          | timestamp without time zone |           |          | now()                       | plain    |             |              | 
Indexes:
    "sites_pkey" PRIMARY KEY, btree (id)
    "idx_sites_domain" btree (domain)
    "idx_sites_port" btree (port)
    "idx_sites_slug" btree (slug)
    "idx_sites_status" btree (status)
    "sites_port_key" UNIQUE CONSTRAINT, btree (port)
    "sites_slug_key" UNIQUE CONSTRAINT, btree (slug)
Check constraints:
    "sites_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying, 'test'::character varying, 'inactive'::character varying, 'archived'::character varying]::text[]))
Foreign-key constraints:
    "sites_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES users(id)
Referenced by:
    TABLE "bot_detections" CONSTRAINT "bot_detections_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
    TABLE "campaigns" CONSTRAINT "campaigns_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
    TABLE "daily_stats" CONSTRAINT "daily_stats_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
    TABLE "form_submissions" CONSTRAINT "form_submissions_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
    TABLE "ip_rate_limits" CONSTRAINT "ip_rate_limits_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id)
    TABLE "leads" CONSTRAINT "leads_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
    TABLE "page_visits" CONSTRAINT "page_visits_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
    TABLE "site_deployments" CONSTRAINT "site_deployments_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
Triggers:
    sites_updated_at_trigger BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_sites_updated_at()
    update_sites_updated_at BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
Access method: heap

-- Rows:      0


-- Table: ssl_certificates
                                                           Table "public.ssl_certificates"
        Column        |            Type             | Collation | Nullable |      Default      | Storage  | Compression | Stats target | Description 
----------------------+-----------------------------+-----------+----------+-------------------+----------+-------------+--------------+-------------
 id                   | uuid                        |           | not null | gen_random_uuid() | plain    |             |              | 
 domain               | character varying(255)      |           | not null |                   | extended |             |              | 
 site_id              | uuid                        |           |          |                   | plain    |             |              | 
 cert_path            | text                        |           |          |                   | extended |             |              | 
 key_path             | text                        |           |          |                   | extended |             |              | 
 fullchain_path       | text                        |           |          |                   | extended |             |              | 
 status               | character varying(50)       |           |          |                   | extended |             |              | 
 issued_at            | timestamp without time zone |           |          |                   | plain    |             |              | 
 expires_at           | timestamp without time zone |           |          |                   | plain    |             |              | 
 auto_renew           | boolean                     |           |          | true              | plain    |             |              | 
 last_renewal_attempt | timestamp without time zone |           |          |                   | plain    |             |              | 
 renewal_error        | text                        |           |          |                   | extended |             |              | 
 created_at           | timestamp without time zone |           |          | now()             | plain    |             |              | 
 updated_at           | timestamp without time zone |           |          | now()             | plain    |             |              | 
Indexes:
    "ssl_certificates_pkey" PRIMARY KEY, btree (id)
    "idx_ssl_certificates_domain" btree (domain)
    "idx_ssl_certificates_expires_at" btree (expires_at)
    "idx_ssl_certificates_site_id" btree (site_id)
    "idx_ssl_certificates_status" btree (status)
    "ssl_certificates_domain_key" UNIQUE CONSTRAINT, btree (domain)
Check constraints:
    "ssl_certificates_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying, 'active'::character varying, 'expired'::character varying, 'error'::character varying]::text[]))
Foreign-key constraints:
    "ssl_certificates_site_id_fkey" FOREIGN KEY (site_id) REFERENCES deployed_sites(id) ON DELETE CASCADE
Triggers:
    update_ssl_certificates_updated_at BEFORE UPDATE ON ssl_certificates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
Access method: heap

-- Rows:      0


-- Table: system_alerts
                                                                      Table "public.system_alerts"
     Column      |            Type             | Collation | Nullable |                  Default                  | Storage  | Compression | Stats target | Description 
-----------------+-----------------------------+-----------+----------+-------------------------------------------+----------+-------------+--------------+-------------
 id              | integer                     |           | not null | nextval('system_alerts_id_seq'::regclass) | plain    |             |              | 
 alert_type      | character varying(50)       |           |          |                                           | extended |             |              | 
 severity        | character varying(20)       |           |          |                                           | extended |             |              | 
 title           | character varying(255)      |           | not null |                                           | extended |             |              | 
 message         | text                        |           | not null |                                           | extended |             |              | 
 details         | jsonb                       |           |          |                                           | extended |             |              | 
 sent_to         | text[]                      |           |          |                                           | extended |             |              | 
 sent_at         | timestamp without time zone |           |          |                                           | plain    |             |              | 
 acknowledged    | boolean                     |           |          | false                                     | plain    |             |              | 
 acknowledged_by | uuid                        |           |          |                                           | plain    |             |              | 
 acknowledged_at | timestamp without time zone |           |          |                                           | plain    |             |              | 
 created_at      | timestamp without time zone |           |          | now()                                     | plain    |             |              | 
Indexes:
    "system_alerts_pkey" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "system_alerts_acknowledged_by_fkey" FOREIGN KEY (acknowledged_by) REFERENCES users(id)
Access method: heap

-- Rows:      0


-- Table: system_settings
                                                                    Table "public.system_settings"
   Column    |            Type             | Collation | Nullable |                   Default                   | Storage  | Compression | Stats target | Description 
-------------+-----------------------------+-----------+----------+---------------------------------------------+----------+-------------+--------------+-------------
 id          | integer                     |           | not null | nextval('system_settings_id_seq'::regclass) | plain    |             |              | 
 key         | character varying(100)      |           | not null |                                             | extended |             |              | 
 value       | text                        |           |          |                                             | extended |             |              | 
 value_type  | character varying(20)       |           |          | 'string'::character varying                 | extended |             |              | 
 description | text                        |           |          |                                             | extended |             |              | 
 updated_by  | uuid                        |           |          |                                             | plain    |             |              | 
 updated_at  | timestamp without time zone |           |          | now()                                       | plain    |             |              | 
Indexes:
    "system_settings_pkey" PRIMARY KEY, btree (id)
    "system_settings_key_key" UNIQUE CONSTRAINT, btree (key)
Foreign-key constraints:
    "system_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id)
Access method: heap

-- Rows:      8


-- Table: users
                                                                    Table "public.users"
       Column       |            Type             | Collation | Nullable |           Default           | Storage  | Compression | Stats target | Description 
--------------------+-----------------------------+-----------+----------+-----------------------------+----------+-------------+--------------+-------------
 id                 | uuid                        |           | not null | gen_random_uuid()           | plain    |             |              | 
 email              | character varying(255)      |           | not null |                             | extended |             |              | 
 password_hash      | character varying(255)      |           | not null |                             | extended |             |              | 
 role               | character varying(50)       |           | not null |                             | extended |             |              | 
 first_name         | character varying(100)      |           | not null |                             | extended |             |              | 
 last_name          | character varying(100)      |           | not null |                             | extended |             |              | 
 phone              | character varying(20)       |           |          |                             | extended |             |              | 
 status             | character varying(20)       |           |          | 'active'::character varying | extended |             |              | 
 two_factor_enabled | boolean                     |           |          | false                       | plain    |             |              | 
 two_factor_secret  | character varying(255)      |           |          |                             | extended |             |              | 
 last_login_at      | timestamp without time zone |           |          |                             | plain    |             |              | 
 last_login_ip      | inet                        |           |          |                             | main     |             |              | 
 created_at         | timestamp without time zone |           |          | now()                       | plain    |             |              | 
 updated_at         | timestamp without time zone |           |          | now()                       | plain    |             |              | 
Indexes:
    "users_pkey" PRIMARY KEY, btree (id)
    "idx_users_email" btree (email)
    "idx_users_role" btree (role)
    "idx_users_status" btree (status)
    "users_email_key" UNIQUE CONSTRAINT, btree (email)
Check constraints:
    "users_role_check" CHECK (role::text = ANY (ARRAY['admin'::character varying, 'sub_admin'::character varying, 'network'::character varying, 'lead_manager'::character varying]::text[]))
    "users_status_check" CHECK (status::text = ANY (ARRAY['active'::character varying, 'suspended'::character varying, 'inactive'::character varying]::text[]))
Referenced by:
    TABLE "activity_logs" CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    TABLE "api_requests_log" CONSTRAINT "api_requests_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    TABLE "campaigns" CONSTRAINT "campaigns_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id)
    TABLE "invoices" CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id)
    TABLE "ip_pool" CONSTRAINT "ip_pool_added_by_fkey" FOREIGN KEY (added_by) REFERENCES users(id)
    TABLE "lead_status_history" CONSTRAINT "lead_status_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES users(id)
    TABLE "networks" CONSTRAINT "networks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "password_reset_tokens" CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "payments" CONSTRAINT "payments_paid_by_fkey" FOREIGN KEY (paid_by) REFERENCES users(id)
    TABLE "role_permissions" CONSTRAINT "role_permissions_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES users(id)
    TABLE "role_permissions" CONSTRAINT "role_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "sessions" CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "site_deployments" CONSTRAINT "site_deployments_deployed_by_fkey" FOREIGN KEY (deployed_by) REFERENCES users(id)
    TABLE "sites" CONSTRAINT "sites_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES users(id)
    TABLE "system_alerts" CONSTRAINT "system_alerts_acknowledged_by_fkey" FOREIGN KEY (acknowledged_by) REFERENCES users(id)
    TABLE "system_settings" CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id)
Triggers:
    update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
Access method: heap

-- Rows:      1


-- Table: webhook_logs
                                                                      Table "public.webhook_logs"
      Column      |            Type             | Collation | Nullable |                 Default                  | Storage  | Compression | Stats target | Description 
------------------+-----------------------------+-----------+----------+------------------------------------------+----------+-------------+--------------+-------------
 id               | bigint                      |           | not null | nextval('webhook_logs_id_seq'::regclass) | plain    |             |              | 
 network_id       | uuid                        |           |          |                                          | plain    |             |              | 
 webhook_type     | character varying(50)       |           |          |                                          | extended |             |              | 
 direction        | character varying(10)       |           |          |                                          | extended |             |              | 
 endpoint         | text                        |           |          |                                          | extended |             |              | 
 method           | character varying(10)       |           |          |                                          | extended |             |              | 
 request_headers  | jsonb                       |           |          |                                          | extended |             |              | 
 request_body     | jsonb                       |           |          |                                          | extended |             |              | 
 response_status  | integer                     |           |          |                                          | plain    |             |              | 
 response_headers | jsonb                       |           |          |                                          | extended |             |              | 
 response_body    | jsonb                       |           |          |                                          | extended |             |              | 
 duration_ms      | integer                     |           |          |                                          | plain    |             |              | 
 success          | boolean                     |           |          |                                          | plain    |             |              | 
 error_message    | text                        |           |          |                                          | extended |             |              | 
 lead_id          | uuid                        |           |          |                                          | plain    |             |              | 
 created_at       | timestamp without time zone |           |          | now()                                    | plain    |             |              | 
Indexes:
    "webhook_logs_pkey" PRIMARY KEY, btree (id)
    "idx_webhook_logs_created_at" btree (created_at)
    "idx_webhook_logs_lead_id" btree (lead_id)
    "idx_webhook_logs_network_id" btree (network_id)
    "idx_webhook_logs_webhook_type" btree (webhook_type)
Foreign-key constraints:
    "webhook_logs_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
    "webhook_logs_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) ON DELETE SET NULL
Access method: heap

-- Rows:      0

