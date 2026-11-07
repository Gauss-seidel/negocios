# BarberShifts — Baseline de esquema (snapshot)

- Proyecto Supabase: `mrktwxjlltqqxkvktkku`
- Generado: 2026-11-07T20:20:04+00:00
- Fuente: catálogos de PostgreSQL vía Management API (solo lectura)
- **No es DDL ejecutable.** Es una fotografía para revisión/diff.
- Baseline ejecutable: `supabase db pull` en una máquina con Docker.

## Resumen

- Tablas: 26
- Columnas: 222
- Restricciones: 90
- Índices: 69
- Políticas RLS: 117
- Funciones: 23
- Triggers: 25

## Tablas y columnas

### appointment_logs (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | appointment_id | uuid | no |  |
| 3 | changed_by | uuid | sí |  |
| 4 | old_status | text | sí |  |
| 5 | new_status | text | no |  |
| 6 | created_at | timestamp with time zone | sí | `now()` |
| 7 | action | text | sí | `'status_change'::text` |
| 8 | from_barber_id | uuid | sí |  |
| 9 | to_barber_id | uuid | sí |  |
| 10 | details | jsonb | sí | `'{}'::jsonb` |

### appointment_products (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | appointment_id | uuid | no |  |
| 3 | product_id | uuid | no |  |
| 4 | quantity | integer | no | `1` |
| 5 | price | numeric(10,2) | no |  |
| 6 | created_at | timestamp with time zone | no | `now()` |

### appointment_services (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | appointment_id | uuid | no |  |
| 3 | service_id | uuid | no |  |
| 4 | price | numeric(10,2) | no |  |

### appointments (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | business_id | uuid | no |  |
| 3 | client_id | uuid | no |  |
| 4 | barber_id | uuid | sí |  |
| 5 | date | date | no |  |
| 6 | start_time | time without time zone | no |  |
| 7 | end_time | time without time zone | no |  |
| 8 | status | text | no | `'pending'::text` |
| 9 | notes | text | sí |  |
| 10 | created_at | timestamp with time zone | sí | `now()` |
| 11 | updated_at | timestamp with time zone | sí | `now()` |
| 12 | service_id | uuid | sí |  |
| 13 | total | numeric(10,2) | sí | `0` |
| 14 | branch_id | uuid | sí |  |

### audit_log (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | table_name | text | no |  |
| 3 | record_id | uuid | sí |  |
| 4 | action | text | no |  |
| 5 | old_data | jsonb | sí |  |
| 6 | new_data | jsonb | sí |  |
| 7 | user_id | uuid | sí |  |
| 8 | user_email | text | sí |  |
| 9 | created_at | timestamp with time zone | sí | `now()` |

### audit_logs (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | business_id | uuid | sí |  |
| 3 | user_id | uuid | sí |  |
| 4 | action | text | no |  |
| 5 | entity_type | text | no |  |
| 6 | entity_id | uuid | sí |  |
| 7 | old_data | jsonb | sí |  |
| 8 | new_data | jsonb | sí |  |
| 9 | ip_address | text | sí |  |
| 10 | created_at | timestamp with time zone | sí | `now()` |

### barber_schedule (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | barber_id | uuid | no |  |
| 3 | day_of_week | integer | no |  |
| 4 | open_time | time without time zone | sí |  |
| 5 | close_time | time without time zone | sí |  |
| 6 | is_day_off | boolean | sí | `false` |

### barber_services (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | barber_id | uuid | no |  |
| 3 | service_id | uuid | no |  |
| 4 | price_override | numeric(10,2) | sí |  |
| 5 | duration_override | integer | sí |  |

### barber_vacations (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | barber_id | uuid | no |  |
| 3 | start_date | date | no |  |
| 4 | end_date | date | no |  |
| 5 | reason | text | sí |  |

### barbers (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | business_id | uuid | no |  |
| 3 | name | text | no |  |
| 4 | phone | text | sí |  |
| 5 | email | text | sí |  |
| 6 | photo_url | text | sí |  |
| 7 | specialty | text | sí |  |
| 8 | color_hex | text | sí | `'#3B82F6'::text` |
| 9 | is_active | boolean | sí | `true` |
| 10 | created_at | timestamp with time zone | sí | `now()` |
| 11 | branch_id | uuid | sí |  |

### branches (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | business_id | uuid | no |  |
| 3 | name | varchar(255) | no |  |
| 4 | slug | varchar(255) | no |  |
| 5 | address | text | sí |  |
| 6 | phone | varchar(50) | sí |  |
| 7 | google_maps_url | text | sí |  |
| 8 | is_active | boolean | sí | `true` |
| 9 | created_at | timestamp with time zone | sí | `now()` |
| 10 | updated_at | timestamp with time zone | sí | `now()` |

### business_holidays (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | business_id | uuid | no |  |
| 3 | date | date | no |  |
| 4 | type | text | no |  |
| 5 | description | text | sí |  |
| 6 | is_closed | boolean | sí | `true` |

### business_hours (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | business_id | uuid | no |  |
| 3 | day_of_week | integer | no |  |
| 4 | open_time | time without time zone | no | `'09:00:00'::time without time zone` |
| 5 | close_time | time without time zone | no | `'18:00:00'::time without time zone` |
| 6 | is_closed | boolean | sí | `false` |
| 7 | slot_duration | integer | sí | `30` |
| 8 | branch_id | uuid | sí |  |

### business_staff (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | user_id | uuid | no |  |
| 3 | business_id | uuid | no |  |
| 4 | role | text | no |  |
| 5 | barber_id | uuid | sí |  |
| 6 | is_active | boolean | sí | `true` |
| 7 | created_at | timestamp with time zone | sí | `now()` |

### business_templates (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | name | text | no |  |
| 3 | slug | text | no |  |
| 4 | description | text | sí |  |
| 5 | thumbnail_url | text | sí |  |
| 6 | config | jsonb | no | `'{}'::jsonb` |
| 7 | is_active | boolean | sí | `true` |
| 8 | created_at | timestamp with time zone | sí | `now()` |

### businesses (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | name | text | no |  |
| 3 | slug | text | no |  |
| 4 | email | text | sí |  |
| 5 | phone | text | sí |  |
| 6 | address | text | sí |  |
| 7 | description | text | sí |  |
| 8 | logo_url | text | sí |  |
| 9 | status | text | no | `'pending'::text` |
| 11 | template_id | text | sí | `'classic'::text` |
| 12 | template_colors | jsonb | sí | `'{}'::jsonb` |
| 13 | created_at | timestamp with time zone | sí | `now()` |
| 14 | updated_at | timestamp with time zone | sí | `now()` |
| 15 | plan | text | sí | `'basic'::text` |
| 16 | google_maps_url | text | sí |  |

### cash_movements (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | register_id | uuid | no |  |
| 3 | appointment_id | uuid | sí |  |
| 4 | type | text | no |  |
| 5 | amount | numeric(10,2) | no |  |
| 6 | payment_method | text | sí |  |
| 7 | description | text | sí |  |
| 8 | created_at | timestamp with time zone | sí | `now()` |
| 9 | created_by | uuid | sí |  |
| 10 | branch_id | uuid | sí |  |

### cash_register (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | business_id | uuid | no |  |
| 3 | opened_at | timestamp with time zone | no | `now()` |
| 4 | closed_at | timestamp with time zone | sí |  |
| 5 | initial_amount | numeric(10,2) | no | `0` |
| 6 | opened_by | uuid | sí |  |
| 7 | closed_by | uuid | sí |  |
| 8 | final_amount | numeric(10,2) | sí |  |
| 9 | notes | text | sí |  |
| 10 | is_open | boolean | sí | `true` |

### clients (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | business_id | uuid | no |  |
| 3 | name | text | no |  |
| 4 | last_name | text | sí |  |
| 5 | phone | text | no |  |
| 6 | email | text | sí |  |
| 7 | birth_date | date | sí |  |
| 8 | notes | text | sí |  |
| 9 | total_visits | integer | sí | `0` |
| 10 | total_spent | numeric(10,2) | sí | `0` |
| 11 | created_at | timestamp with time zone | sí | `now()` |

### inventory_movements (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | product_id | uuid | no |  |
| 3 | type | text | no |  |
| 4 | quantity | integer | no |  |
| 5 | notes | text | sí |  |
| 6 | created_at | timestamp with time zone | sí | `now()` |
| 7 | created_by | uuid | sí |  |

### inventory_products (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | business_id | uuid | no |  |
| 3 | name | text | no |  |
| 4 | description | text | sí |  |
| 5 | price | numeric(10,2) | sí | `0` |
| 6 | current_stock | integer | no | `0` |
| 7 | min_stock | integer | sí | `5` |
| 8 | created_at | timestamp with time zone | sí | `now()` |
| 9 | unit | text | sí | `'pieza'::text` |
| 10 | is_product | boolean | no | `false` |
| 11 | image_url | text | sí |  |
| 12 | is_active | boolean | no | `true` |
| 13 | branch_id | uuid | sí |  |

### notifications (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | business_id | uuid | no |  |
| 3 | type | text | no |  |
| 4 | recipient | text | no |  |
| 5 | message | text | no |  |
| 6 | status | text | no | `'pending'::text` |
| 7 | reference_type | text | sí |  |
| 8 | reference_id | uuid | sí |  |
| 9 | created_at | timestamp with time zone | sí | `now()` |
| 10 | sent_at | timestamp with time zone | sí |  |

### plans (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | name | text | no |  |
| 3 | slug | text | no |  |
| 4 | description | text | sí |  |
| 5 | max_barbers | integer | no | `3` |
| 6 | max_branches | integer | no | `1` |
| 7 | max_monthly_bookings | integer | no | `100` |
| 8 | price | numeric(10,2) | no | `9.99` |
| 9 | features | jsonb | sí | `'[]'::jsonb` |
| 10 | is_active | boolean | sí | `true` |
| 11 | created_at | timestamp with time zone | sí | `now()` |

### service_categories (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | business_id | uuid | no |  |
| 3 | name | text | no |  |
| 4 | sort_order | integer | sí | `0` |

### services (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no | `gen_random_uuid()` |
| 2 | business_id | uuid | no |  |
| 3 | category_id | uuid | sí |  |
| 4 | name | text | no |  |
| 5 | description | text | sí |  |
| 6 | duration | integer | no | `30` |
| 7 | price | numeric(10,2) | no | `0` |
| 8 | is_active | boolean | sí | `true` |
| 9 | created_at | timestamp with time zone | sí | `now()` |

### super_admins (RLS: sí)

| # | Columna | Tipo | Null | Default |
|---|---------|------|------|---------|
| 1 | id | uuid | no |  |
| 2 | name | text | no |  |
| 3 | created_at | timestamp with time zone | sí | `now()` |

## Restricciones

| Tabla | Nombre | Tipo | Definición |
|-------|--------|------|------------|
| appointment_logs | appointment_logs_action_check | CHECK | CHECK ((action = ANY (ARRAY['status_change'::text, 'transfer'::text, 'claim'::text, 'create'::text, 'cancel'::text]))) |
| appointment_logs | appointment_logs_appointment_id_fkey | FK | FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE |
| appointment_logs | appointment_logs_from_barber_id_fkey | FK | FOREIGN KEY (from_barber_id) REFERENCES barbers(id) ON DELETE SET NULL |
| appointment_logs | appointment_logs_pkey | PK | PRIMARY KEY (id) |
| appointment_logs | appointment_logs_to_barber_id_fkey | FK | FOREIGN KEY (to_barber_id) REFERENCES barbers(id) ON DELETE SET NULL |
| appointment_products | appointment_products_appointment_id_fkey | FK | FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE |
| appointment_products | appointment_products_pkey | PK | PRIMARY KEY (id) |
| appointment_products | appointment_products_product_id_fkey | FK | FOREIGN KEY (product_id) REFERENCES inventory_products(id) ON DELETE RESTRICT |
| appointment_products | appointment_products_quantity_check | CHECK | CHECK ((quantity > 0)) |
| appointment_services | appointment_services_appointment_id_fkey | FK | FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE |
| appointment_services | appointment_services_pkey | PK | PRIMARY KEY (id) |
| appointment_services | appointment_services_service_id_fkey | FK | FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE |
| appointments | appointments_barber_id_fkey | FK | FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE SET NULL |
| appointments | appointments_branch_id_fkey | FK | FOREIGN KEY (branch_id) REFERENCES branches(id) |
| appointments | appointments_business_id_fkey | FK | FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE |
| appointments | appointments_client_id_fkey | FK | FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE |
| appointments | appointments_pkey | PK | PRIMARY KEY (id) |
| appointments | appointments_service_id_fkey | FK | FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL |
| appointments | appointments_status_check | CHECK | CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text]))) |
| audit_log | audit_log_pkey | PK | PRIMARY KEY (id) |
| audit_logs | audit_logs_business_id_fkey | FK | FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE |
| audit_logs | audit_logs_pkey | PK | PRIMARY KEY (id) |
| barber_schedule | barber_schedule_barber_id_day_of_week_key | UNIQUE | UNIQUE (barber_id, day_of_week) |
| barber_schedule | barber_schedule_barber_id_fkey | FK | FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE |
| barber_schedule | barber_schedule_day_of_week_check | CHECK | CHECK (((day_of_week >= 1) AND (day_of_week <= 7))) |
| barber_schedule | barber_schedule_pkey | PK | PRIMARY KEY (id) |
| barber_services | barber_services_barber_id_fkey | FK | FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE |
| barber_services | barber_services_barber_id_service_id_key | UNIQUE | UNIQUE (barber_id, service_id) |
| barber_services | barber_services_pkey | PK | PRIMARY KEY (id) |
| barber_services | barber_services_service_id_fkey | FK | FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE |
| barber_vacations | barber_vacations_barber_id_fkey | FK | FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE |
| barber_vacations | barber_vacations_check | CHECK | CHECK ((end_date >= start_date)) |
| barber_vacations | barber_vacations_pkey | PK | PRIMARY KEY (id) |
| barbers | barbers_branch_id_fkey | FK | FOREIGN KEY (branch_id) REFERENCES branches(id) |
| barbers | barbers_business_id_fkey | FK | FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE |
| barbers | barbers_pkey | PK | PRIMARY KEY (id) |
| branches | branches_business_id_fkey | FK | FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE |
| branches | branches_business_id_slug_key | UNIQUE | UNIQUE (business_id, slug) |
| branches | branches_pkey | PK | PRIMARY KEY (id) |
| business_holidays | business_holidays_business_id_date_key | UNIQUE | UNIQUE (business_id, date) |
| business_holidays | business_holidays_business_id_fkey | FK | FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE |
| business_holidays | business_holidays_pkey | PK | PRIMARY KEY (id) |
| business_holidays | business_holidays_type_check | CHECK | CHECK ((type = ANY (ARRAY['holiday'::text, 'vacation'::text, 'blocked'::text]))) |
| business_hours | business_hours_branch_id_fkey | FK | FOREIGN KEY (branch_id) REFERENCES branches(id) |
| business_hours | business_hours_business_id_branch_id_day_of_week_key | UNIQUE | UNIQUE (business_id, branch_id, day_of_week) |
| business_hours | business_hours_business_id_fkey | FK | FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE |
| business_hours | business_hours_day_of_week_check | CHECK | CHECK (((day_of_week >= 1) AND (day_of_week <= 7))) |
| business_hours | business_hours_pkey | PK | PRIMARY KEY (id) |
| business_staff | business_staff_business_id_fkey | FK | FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE |
| business_staff | business_staff_pkey | PK | PRIMARY KEY (id) |
| business_staff | business_staff_role_check | CHECK | CHECK ((role = ANY (ARRAY['business_admin'::text, 'barber'::text]))) |
| business_staff | business_staff_user_id_business_id_key | UNIQUE | UNIQUE (user_id, business_id) |
| business_staff | business_staff_user_id_fkey | FK | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE |
| business_staff | fk_business_staff_barber | FK | FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE SET NULL |
| business_templates | business_templates_pkey | PK | PRIMARY KEY (id) |
| business_templates | business_templates_slug_key | UNIQUE | UNIQUE (slug) |
| businesses | businesses_pkey | PK | PRIMARY KEY (id) |
| businesses | businesses_slug_key | UNIQUE | UNIQUE (slug) |
| businesses | businesses_status_check | CHECK | CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text]))) |
| cash_movements | cash_movements_appointment_id_fkey | FK | FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL |
| cash_movements | cash_movements_branch_id_fkey | FK | FOREIGN KEY (branch_id) REFERENCES branches(id) |
| cash_movements | cash_movements_payment_method_check | CHECK | CHECK ((payment_method = ANY (ARRAY['cash'::text, 'transfer'::text, 'card'::text, 'qr'::text]))) |
| cash_movements | cash_movements_pkey | PK | PRIMARY KEY (id) |
| cash_movements | cash_movements_register_id_fkey | FK | FOREIGN KEY (register_id) REFERENCES cash_register(id) ON DELETE CASCADE |
| cash_movements | cash_movements_type_check | CHECK | CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text, 'withdrawal'::text]))) |
| cash_register | cash_register_business_id_fkey | FK | FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE |
| cash_register | cash_register_pkey | PK | PRIMARY KEY (id) |
| clients | clients_business_id_fkey | FK | FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE |
| clients | clients_business_id_phone_key | UNIQUE | UNIQUE (business_id, phone) |
| clients | clients_pkey | PK | PRIMARY KEY (id) |
| inventory_movements | inventory_movements_pkey | PK | PRIMARY KEY (id) |
| inventory_movements | inventory_movements_product_id_fkey | FK | FOREIGN KEY (product_id) REFERENCES inventory_products(id) ON DELETE CASCADE |
| inventory_movements | inventory_movements_type_check | CHECK | CHECK ((type = ANY (ARRAY['in'::text, 'out'::text]))) |
| inventory_products | check_current_stock_non_negative | CHECK | CHECK ((current_stock >= 0)) |
| inventory_products | inventory_products_branch_id_fkey | FK | FOREIGN KEY (branch_id) REFERENCES branches(id) |
| inventory_products | inventory_products_business_id_fkey | FK | FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE |
| inventory_products | inventory_products_pkey | PK | PRIMARY KEY (id) |
| notifications | notifications_business_id_fkey | FK | FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE |
| notifications | notifications_pkey | PK | PRIMARY KEY (id) |
| notifications | notifications_status_check | CHECK | CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]))) |
| notifications | notifications_type_check | CHECK | CHECK ((type = ANY (ARRAY['whatsapp'::text, 'email'::text, 'sms'::text]))) |
| plans | plans_pkey | PK | PRIMARY KEY (id) |
| plans | plans_slug_key | UNIQUE | UNIQUE (slug) |
| service_categories | service_categories_business_id_fkey | FK | FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE |
| service_categories | service_categories_pkey | PK | PRIMARY KEY (id) |
| services | services_business_id_fkey | FK | FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE |
| services | services_category_id_fkey | FK | FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL |
| services | services_pkey | PK | PRIMARY KEY (id) |
| super_admins | super_admins_id_fkey | FK | FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE |
| super_admins | super_admins_pkey | PK | PRIMARY KEY (id) |

## Índices

| Tabla | Índice | Definición |
|-------|--------|------------|
| appointment_logs | appointment_logs_pkey | CREATE UNIQUE INDEX appointment_logs_pkey ON public.appointment_logs USING btree (id) |
| appointment_logs | idx_appointment_logs_action | CREATE INDEX idx_appointment_logs_action ON public.appointment_logs USING btree (action) |
| appointment_logs | idx_appointment_logs_appointment | CREATE INDEX idx_appointment_logs_appointment ON public.appointment_logs USING btree (appointment_id) |
| appointment_products | appointment_products_pkey | CREATE UNIQUE INDEX appointment_products_pkey ON public.appointment_products USING btree (id) |
| appointment_products | idx_appointment_products_appointment | CREATE INDEX idx_appointment_products_appointment ON public.appointment_products USING btree (appointment_id) |
| appointment_products | idx_appointment_products_product | CREATE INDEX idx_appointment_products_product ON public.appointment_products USING btree (product_id) |
| appointment_services | appointment_services_pkey | CREATE UNIQUE INDEX appointment_services_pkey ON public.appointment_services USING btree (id) |
| appointments | appointments_pkey | CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id) |
| appointments | idx_appointments_barber_date | CREATE INDEX idx_appointments_barber_date ON public.appointments USING btree (barber_id, date) |
| appointments | idx_appointments_branch_id | CREATE INDEX idx_appointments_branch_id ON public.appointments USING btree (branch_id) |
| appointments | idx_appointments_business_date | CREATE INDEX idx_appointments_business_date ON public.appointments USING btree (business_id, date) |
| appointments | idx_appointments_client | CREATE INDEX idx_appointments_client ON public.appointments USING btree (client_id) |
| appointments | idx_appointments_created_at | CREATE INDEX idx_appointments_created_at ON public.appointments USING btree (created_at) |
| appointments | idx_appointments_no_duplicate_start | CREATE UNIQUE INDEX idx_appointments_no_duplicate_start ON public.appointments USING btree (business_id, barber_id, date, start_time) WHERE ((barber_id IS NOT NULL) AND (status <> ALL (ARRAY['cancelled'::text, 'no_show'::text]))) |
| appointments | idx_appointments_status | CREATE INDEX idx_appointments_status ON public.appointments USING btree (status) |
| audit_log | audit_log_pkey | CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id) |
| audit_logs | audit_logs_pkey | CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id) |
| audit_logs | idx_audit_logs_business | CREATE INDEX idx_audit_logs_business ON public.audit_logs USING btree (business_id) |
| audit_logs | idx_audit_logs_created | CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at) |
| barber_schedule | barber_schedule_barber_id_day_of_week_key | CREATE UNIQUE INDEX barber_schedule_barber_id_day_of_week_key ON public.barber_schedule USING btree (barber_id, day_of_week) |
| barber_schedule | barber_schedule_pkey | CREATE UNIQUE INDEX barber_schedule_pkey ON public.barber_schedule USING btree (id) |
| barber_services | barber_services_barber_id_service_id_key | CREATE UNIQUE INDEX barber_services_barber_id_service_id_key ON public.barber_services USING btree (barber_id, service_id) |
| barber_services | barber_services_pkey | CREATE UNIQUE INDEX barber_services_pkey ON public.barber_services USING btree (id) |
| barber_vacations | barber_vacations_pkey | CREATE UNIQUE INDEX barber_vacations_pkey ON public.barber_vacations USING btree (id) |
| barbers | barbers_pkey | CREATE UNIQUE INDEX barbers_pkey ON public.barbers USING btree (id) |
| barbers | idx_barbers_branch_id | CREATE INDEX idx_barbers_branch_id ON public.barbers USING btree (branch_id) |
| barbers | idx_barbers_business | CREATE INDEX idx_barbers_business ON public.barbers USING btree (business_id) |
| branches | branches_business_id_slug_key | CREATE UNIQUE INDEX branches_business_id_slug_key ON public.branches USING btree (business_id, slug) |
| branches | branches_pkey | CREATE UNIQUE INDEX branches_pkey ON public.branches USING btree (id) |
| branches | idx_branches_business | CREATE INDEX idx_branches_business ON public.branches USING btree (business_id) |
| branches | idx_branches_business_id | CREATE INDEX idx_branches_business_id ON public.branches USING btree (business_id) |
| branches | idx_branches_slug | CREATE INDEX idx_branches_slug ON public.branches USING btree (business_id, slug) |
| business_holidays | business_holidays_business_id_date_key | CREATE UNIQUE INDEX business_holidays_business_id_date_key ON public.business_holidays USING btree (business_id, date) |
| business_holidays | business_holidays_pkey | CREATE UNIQUE INDEX business_holidays_pkey ON public.business_holidays USING btree (id) |
| business_hours | business_hours_business_id_branch_id_day_of_week_key | CREATE UNIQUE INDEX business_hours_business_id_branch_id_day_of_week_key ON public.business_hours USING btree (business_id, branch_id, day_of_week) |
| business_hours | business_hours_pkey | CREATE UNIQUE INDEX business_hours_pkey ON public.business_hours USING btree (id) |
| business_hours | idx_business_hours_branch_id | CREATE INDEX idx_business_hours_branch_id ON public.business_hours USING btree (branch_id) |
| business_hours | idx_business_hours_business | CREATE INDEX idx_business_hours_business ON public.business_hours USING btree (business_id) |
| business_staff | business_staff_pkey | CREATE UNIQUE INDEX business_staff_pkey ON public.business_staff USING btree (id) |
| business_staff | business_staff_user_id_business_id_key | CREATE UNIQUE INDEX business_staff_user_id_business_id_key ON public.business_staff USING btree (user_id, business_id) |
| business_templates | business_templates_pkey | CREATE UNIQUE INDEX business_templates_pkey ON public.business_templates USING btree (id) |
| business_templates | business_templates_slug_key | CREATE UNIQUE INDEX business_templates_slug_key ON public.business_templates USING btree (slug) |
| businesses | businesses_pkey | CREATE UNIQUE INDEX businesses_pkey ON public.businesses USING btree (id) |
| businesses | businesses_slug_key | CREATE UNIQUE INDEX businesses_slug_key ON public.businesses USING btree (slug) |
| businesses | idx_businesses_slug | CREATE INDEX idx_businesses_slug ON public.businesses USING btree (slug) |
| businesses | idx_businesses_status | CREATE INDEX idx_businesses_status ON public.businesses USING btree (status) |
| cash_movements | cash_movements_pkey | CREATE UNIQUE INDEX cash_movements_pkey ON public.cash_movements USING btree (id) |
| cash_movements | idx_cash_movements_branch_id | CREATE INDEX idx_cash_movements_branch_id ON public.cash_movements USING btree (branch_id) |
| cash_movements | idx_cash_movements_register | CREATE INDEX idx_cash_movements_register ON public.cash_movements USING btree (register_id) |
| cash_register | cash_register_pkey | CREATE UNIQUE INDEX cash_register_pkey ON public.cash_register USING btree (id) |
| clients | clients_business_id_phone_key | CREATE UNIQUE INDEX clients_business_id_phone_key ON public.clients USING btree (business_id, phone) |
| clients | clients_pkey | CREATE UNIQUE INDEX clients_pkey ON public.clients USING btree (id) |
| clients | idx_clients_business | CREATE INDEX idx_clients_business ON public.clients USING btree (business_id) |
| clients | idx_clients_phone | CREATE INDEX idx_clients_phone ON public.clients USING btree (business_id, phone) |
| inventory_movements | idx_inventory_movements_product | CREATE INDEX idx_inventory_movements_product ON public.inventory_movements USING btree (product_id) |
| inventory_movements | inventory_movements_pkey | CREATE UNIQUE INDEX inventory_movements_pkey ON public.inventory_movements USING btree (id) |
| inventory_products | idx_inventory_products_branch_id | CREATE INDEX idx_inventory_products_branch_id ON public.inventory_products USING btree (branch_id) |
| inventory_products | idx_inventory_products_business | CREATE INDEX idx_inventory_products_business ON public.inventory_products USING btree (business_id) |
| inventory_products | inventory_products_pkey | CREATE UNIQUE INDEX inventory_products_pkey ON public.inventory_products USING btree (id) |
| notifications | idx_notifications_business | CREATE INDEX idx_notifications_business ON public.notifications USING btree (business_id) |
| notifications | idx_notifications_status | CREATE INDEX idx_notifications_status ON public.notifications USING btree (status) |
| notifications | notifications_pkey | CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id) |
| plans | plans_pkey | CREATE UNIQUE INDEX plans_pkey ON public.plans USING btree (id) |
| plans | plans_slug_key | CREATE UNIQUE INDEX plans_slug_key ON public.plans USING btree (slug) |
| service_categories | service_categories_pkey | CREATE UNIQUE INDEX service_categories_pkey ON public.service_categories USING btree (id) |
| services | idx_services_business | CREATE INDEX idx_services_business ON public.services USING btree (business_id) |
| services | idx_services_category | CREATE INDEX idx_services_category ON public.services USING btree (category_id) |
| services | services_pkey | CREATE UNIQUE INDEX services_pkey ON public.services USING btree (id) |
| super_admins | super_admins_pkey | CREATE UNIQUE INDEX super_admins_pkey ON public.super_admins USING btree (id) |

## Políticas RLS

### appointment_logs · admin_read_logs

- Comando: `SELECT`
- Roles: `{public}`
- USING: `(((current_user_role() = 'business_admin'::text) AND (EXISTS ( SELECT 1    FROM appointments   WHERE ((appointments.id = appointment_logs.appointment_id) AND (appointments.business_id = current_user_business_id()))))) OR (current_user_role() = 'super_admin'::text))`
- WITH CHECK: `—`

### appointment_logs · barber_insert

- Comando: `INSERT`
- Roles: `{public}`
- USING: `—`
- WITH CHECK: `((current_user_role() = 'barber'::text) AND (EXISTS ( SELECT 1    FROM (appointments a      JOIN barbers b ON ((b.business_id = current_user_business_id())))   WHERE ((a.id = appointment_logs.appointment_id) AND (a.business_id = b.business_id)))))`

### appointment_logs · barber_read_logs

- Comando: `SELECT`
- Roles: `{public}`
- USING: `((current_user_role() = 'barber'::text) AND (EXISTS ( SELECT 1    FROM appointments   WHERE ((appointments.id = appointment_logs.appointment_id) AND (appointments.business_id = current_user_business_id())))))`
- WITH CHECK: `—`

### appointment_logs · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (EXISTS ( SELECT 1    FROM appointments   WHERE ((appointments.id = appointment_logs.appointment_id) AND (appointments.business_id = current_user_business_id())))))`
- WITH CHECK: `—`

### appointment_logs · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### appointment_products · anon_insert_appointment_products

- Comando: `INSERT`
- Roles: `{anon}`
- USING: `—`
- WITH CHECK: `((appointment_id IN ( SELECT appointments.id    FROM appointments   WHERE (appointments.business_id IN ( SELECT businesses.id            FROM businesses           WHERE (businesses.status = 'active'::text))))) AND (product_id IN ( SELECT p.id    FROM (inventory_products p      JOIN appointments a ON ((a.id = appointment_products.appointment_id)))   WHERE ((p.business_id = a.business_id) AND (p.is_active = true) AND (p.is_product = true)))))`

### appointment_products · barber_read_appointment_products

- Comando: `SELECT`
- Roles: `{public}`
- USING: `(EXISTS ( SELECT 1    FROM (appointments a      JOIN business_staff bs ON (((bs.business_id = a.business_id) AND (bs.user_id = auth.uid()))))   WHERE ((a.id = appointment_products.appointment_id) AND (bs.role = 'barber'::text))))`
- WITH CHECK: `—`

### appointment_products · business_admin_all_appointment_products

- Comando: `ALL`
- Roles: `{public}`
- USING: `(EXISTS ( SELECT 1    FROM (appointments a      JOIN business_staff bs ON (((bs.business_id = a.business_id) AND (bs.user_id = auth.uid()))))   WHERE ((a.id = appointment_products.appointment_id) AND (bs.role = 'business_admin'::text))))`
- WITH CHECK: `—`

### appointment_products · client_insert_appointment_products

- Comando: `INSERT`
- Roles: `{public}`
- USING: `—`
- WITH CHECK: `(EXISTS ( SELECT 1    FROM (appointments a      JOIN clients c ON ((c.phone = auth.email())))   WHERE ((a.id = appointment_products.appointment_id) AND (a.client_id = c.id))))`

### appointment_products · public_insert

- Comando: `INSERT`
- Roles: `{public}`
- USING: `—`
- WITH CHECK: `(EXISTS ( SELECT 1    FROM (appointments a      JOIN businesses b ON ((a.business_id = b.id)))   WHERE ((a.id = appointment_products.appointment_id) AND (b.status = 'active'::text))))`

### appointment_products · public_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `(EXISTS ( SELECT 1    FROM (appointments a      JOIN businesses b ON ((a.business_id = b.id)))   WHERE ((a.id = appointment_products.appointment_id) AND (b.status = 'active'::text))))`
- WITH CHECK: `—`

### appointment_products · super_admin_all

- Comando: `ALL`
- Roles: `{authenticated}`
- USING: `is_super_admin()`
- WITH CHECK: `is_super_admin()`

### appointment_products · super_admin_all_appointment_products

- Comando: `ALL`
- Roles: `{public}`
- USING: `(EXISTS ( SELECT 1    FROM super_admins   WHERE (super_admins.id = auth.uid())))`
- WITH CHECK: `—`

### appointment_services · anon_insert_appointment_services

- Comando: `INSERT`
- Roles: `{anon}`
- USING: `—`
- WITH CHECK: `((appointment_id IN ( SELECT appointments.id    FROM appointments   WHERE (appointments.business_id IN ( SELECT businesses.id            FROM businesses           WHERE (businesses.status = 'active'::text))))) AND (service_id IN ( SELECT s.id    FROM (services s      JOIN appointments a ON ((a.id = appointment_services.appointment_id)))   WHERE ((s.business_id = a.business_id) AND (s.is_active = true)))))`

### appointment_services · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (EXISTS ( SELECT 1    FROM appointments   WHERE ((appointments.id = appointment_services.appointment_id) AND (appointments.business_id = current_user_business_id())))))`
- WITH CHECK: `—`

### appointment_services · public_insert

- Comando: `INSERT`
- Roles: `{public}`
- USING: `—`
- WITH CHECK: `(EXISTS ( SELECT 1    FROM (appointments a      JOIN businesses b ON ((a.business_id = b.id)))   WHERE ((a.id = appointment_services.appointment_id) AND (b.status = 'active'::text))))`

### appointment_services · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### appointments · anon_insert_appointments

- Comando: `INSERT`
- Roles: `{anon}`
- USING: `—`
- WITH CHECK: `((business_id IN ( SELECT businesses.id    FROM businesses   WHERE (businesses.status = 'active'::text))) AND ((barber_id IS NULL) OR (barber_id IN ( SELECT barbers.id    FROM barbers   WHERE (barbers.business_id = appointments.business_id)))) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT branches.id    FROM branches   WHERE ((branches.business_id = appointments.business_id) AND (branches.is_active = true))))))`

### appointments · barber_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'barber'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### appointments · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### appointments · public_insert

- Comando: `INSERT`
- Roles: `{public}`
- USING: `—`
- WITH CHECK: `(EXISTS ( SELECT 1    FROM businesses   WHERE ((businesses.id = appointments.business_id) AND (businesses.status = 'active'::text))))`

### appointments · public_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `(EXISTS ( SELECT 1    FROM businesses   WHERE ((businesses.id = appointments.business_id) AND (businesses.status = 'active'::text))))`
- WITH CHECK: `—`

### appointments · staff_select_appointments

- Comando: `SELECT`
- Roles: `{authenticated}`
- USING: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`
- WITH CHECK: `—`

### appointments · staff_update_appointments

- Comando: `UPDATE`
- Roles: `{authenticated}`
- USING: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`
- WITH CHECK: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`

### appointments · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### audit_log · super_admin_all

- Comando: `ALL`
- Roles: `{authenticated}`
- USING: `is_super_admin()`
- WITH CHECK: `is_super_admin()`

### audit_logs · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### audit_logs · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### barber_schedule · barber_read_own

- Comando: `SELECT`
- Roles: `{public}`
- USING: `((current_user_role() = 'barber'::text) AND (EXISTS ( SELECT 1    FROM barbers   WHERE ((barbers.id = barber_schedule.barber_id) AND (barbers.business_id = current_user_business_id())))))`
- WITH CHECK: `—`

### barber_schedule · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (EXISTS ( SELECT 1    FROM barbers   WHERE ((barbers.id = barber_schedule.barber_id) AND (barbers.business_id = current_user_business_id())))))`
- WITH CHECK: `—`

### barber_schedule · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### barber_services · barber_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `((current_user_role() = 'barber'::text) AND (EXISTS ( SELECT 1    FROM barbers   WHERE ((barbers.id = barber_services.barber_id) AND (barbers.business_id = current_user_business_id())))))`
- WITH CHECK: `—`

### barber_services · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (EXISTS ( SELECT 1    FROM barbers   WHERE ((barbers.id = barber_services.barber_id) AND (barbers.business_id = current_user_business_id())))))`
- WITH CHECK: `—`

### barber_services · public_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `(EXISTS ( SELECT 1    FROM (barbers b      JOIN businesses bs ON ((b.business_id = bs.id)))   WHERE ((b.id = barber_services.barber_id) AND (bs.status = 'active'::text))))`
- WITH CHECK: `—`

### barber_services · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### barber_vacations · barber_read_own

- Comando: `SELECT`
- Roles: `{public}`
- USING: `((current_user_role() = 'barber'::text) AND (EXISTS ( SELECT 1    FROM barbers   WHERE ((barbers.id = barber_vacations.barber_id) AND (barbers.business_id = current_user_business_id())))))`
- WITH CHECK: `—`

### barber_vacations · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (EXISTS ( SELECT 1    FROM barbers   WHERE ((barbers.id = barber_vacations.barber_id) AND (barbers.business_id = current_user_business_id())))))`
- WITH CHECK: `—`

### barber_vacations · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### barbers · barber_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `((current_user_role() = 'barber'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### barbers · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### barbers · public_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `(EXISTS ( SELECT 1    FROM businesses   WHERE ((businesses.id = barbers.business_id) AND (businesses.status = 'active'::text))))`
- WITH CHECK: `—`

### barbers · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### branches · anon_select_active_branches

- Comando: `SELECT`
- Roles: `{anon}`
- USING: `(is_active = true)`
- WITH CHECK: `—`

### branches · business_admin_delete_branches

- Comando: `DELETE`
- Roles: `{authenticated}`
- USING: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE ((business_staff.user_id = auth.uid()) AND (business_staff.role = 'business_admin'::text))))`
- WITH CHECK: `—`

### branches · business_admin_insert_branches

- Comando: `INSERT`
- Roles: `{authenticated}`
- USING: `—`
- WITH CHECK: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE ((business_staff.user_id = auth.uid()) AND (business_staff.role = 'business_admin'::text))))`

### branches · business_admin_update_branches

- Comando: `UPDATE`
- Roles: `{authenticated}`
- USING: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE ((business_staff.user_id = auth.uid()) AND (business_staff.role = 'business_admin'::text))))`
- WITH CHECK: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE ((business_staff.user_id = auth.uid()) AND (business_staff.role = 'business_admin'::text))))`

### branches · business_staff_select_branches

- Comando: `SELECT`
- Roles: `{authenticated}`
- USING: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`
- WITH CHECK: `—`

### branches · public_select_active_branches

- Comando: `SELECT`
- Roles: `{anon,authenticated}`
- USING: `(is_active = true)`
- WITH CHECK: `—`

### branches · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `is_super_admin()`

### business_holidays · barber_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `((current_user_role() = 'barber'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### business_holidays · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### business_holidays · public_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `(EXISTS ( SELECT 1    FROM businesses   WHERE ((businesses.id = business_holidays.business_id) AND (businesses.status = 'active'::text))))`
- WITH CHECK: `—`

### business_holidays · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### business_hours · anon_select_business_hours

- Comando: `SELECT`
- Roles: `{anon}`
- USING: `true`
- WITH CHECK: `—`

### business_hours · barber_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `((current_user_role() = 'barber'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### business_hours · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### business_hours · public_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `(EXISTS ( SELECT 1    FROM businesses   WHERE ((businesses.id = business_hours.business_id) AND (businesses.status = 'active'::text))))`
- WITH CHECK: `—`

### business_hours · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### business_staff · staff_manage_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((business_id = current_user_business_id()) AND (current_user_role() = 'business_admin'::text))`
- WITH CHECK: `—`

### business_staff · staff_read_own

- Comando: `SELECT`
- Roles: `{public}`
- USING: `(user_id = current_user_id())`
- WITH CHECK: `—`

### business_staff · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### business_templates · public_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `true`
- WITH CHECK: `—`

### business_templates · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### businesses · barber_read_own

- Comando: `SELECT`
- Roles: `{public}`
- USING: `((current_user_role() = 'barber'::text) AND (id = current_user_business_id()))`
- WITH CHECK: `—`

### businesses · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (id = current_user_business_id()))`
- WITH CHECK: `—`

### businesses · public_read_active

- Comando: `SELECT`
- Roles: `{public}`
- USING: `(status = 'active'::text)`
- WITH CHECK: `—`

### businesses · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### cash_movements · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (EXISTS ( SELECT 1    FROM cash_register   WHERE ((cash_register.id = cash_movements.register_id) AND (cash_register.business_id = current_user_business_id())))))`
- WITH CHECK: `—`

### cash_movements · staff_insert_cash_movements

- Comando: `INSERT`
- Roles: `{authenticated}`
- USING: `—`
- WITH CHECK: `(branch_id IN ( SELECT branches.id    FROM branches   WHERE (branches.business_id IN ( SELECT business_staff.business_id            FROM business_staff           WHERE (business_staff.user_id = auth.uid())))))`

### cash_movements · staff_select_cash_movements

- Comando: `SELECT`
- Roles: `{authenticated}`
- USING: `(branch_id IN ( SELECT branches.id    FROM branches   WHERE (branches.business_id IN ( SELECT business_staff.business_id            FROM business_staff           WHERE (business_staff.user_id = auth.uid())))))`
- WITH CHECK: `—`

### cash_movements · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### cash_register · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### cash_register · staff_insert_cash_register

- Comando: `INSERT`
- Roles: `{authenticated}`
- USING: `—`
- WITH CHECK: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`

### cash_register · staff_select_cash_register

- Comando: `SELECT`
- Roles: `{authenticated}`
- USING: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`
- WITH CHECK: `—`

### cash_register · staff_update_cash_register

- Comando: `UPDATE`
- Roles: `{authenticated}`
- USING: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`
- WITH CHECK: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`

### cash_register · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### clients · anon_insert_clients

- Comando: `INSERT`
- Roles: `{anon}`
- USING: `—`
- WITH CHECK: `(business_id IN ( SELECT businesses.id    FROM businesses   WHERE (businesses.status = 'active'::text)))`

### clients · barber_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `((current_user_role() = 'barber'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### clients · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### clients · public_insert

- Comando: `INSERT`
- Roles: `{public}`
- USING: `—`
- WITH CHECK: `(EXISTS ( SELECT 1    FROM businesses   WHERE ((businesses.id = clients.business_id) AND (businesses.status = 'active'::text))))`

### clients · public_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `(EXISTS ( SELECT 1    FROM businesses   WHERE ((businesses.id = clients.business_id) AND (businesses.status = 'active'::text))))`
- WITH CHECK: `—`

### clients · staff_insert_clients

- Comando: `INSERT`
- Roles: `{authenticated}`
- USING: `—`
- WITH CHECK: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`

### clients · staff_select_clients

- Comando: `SELECT`
- Roles: `{authenticated}`
- USING: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`
- WITH CHECK: `—`

### clients · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### inventory_movements · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (EXISTS ( SELECT 1    FROM inventory_products   WHERE ((inventory_products.id = inventory_movements.product_id) AND (inventory_products.business_id = current_user_business_id())))))`
- WITH CHECK: `—`

### inventory_movements · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### inventory_products · anon_select_active_inventory

- Comando: `SELECT`
- Roles: `{anon}`
- USING: `(is_active = true)`
- WITH CHECK: `—`

### inventory_products · barber_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `((current_user_role() = 'barber'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### inventory_products · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### inventory_products · public_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `(EXISTS ( SELECT 1    FROM businesses   WHERE ((businesses.id = inventory_products.business_id) AND (businesses.status = 'active'::text))))`
- WITH CHECK: `—`

### inventory_products · staff_delete_inventory

- Comando: `DELETE`
- Roles: `{authenticated}`
- USING: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`
- WITH CHECK: `—`

### inventory_products · staff_insert_inventory

- Comando: `INSERT`
- Roles: `{authenticated}`
- USING: `—`
- WITH CHECK: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`

### inventory_products · staff_select_inventory

- Comando: `SELECT`
- Roles: `{authenticated}`
- USING: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`
- WITH CHECK: `—`

### inventory_products · staff_update_inventory

- Comando: `UPDATE`
- Roles: `{authenticated}`
- USING: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`
- WITH CHECK: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`

### inventory_products · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### notifications · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### notifications · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### plans · public_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `true`
- WITH CHECK: `—`

### plans · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### service_categories · barber_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `((current_user_role() = 'barber'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### service_categories · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### service_categories · public_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `(EXISTS ( SELECT 1    FROM businesses   WHERE ((businesses.id = service_categories.business_id) AND (businesses.status = 'active'::text))))`
- WITH CHECK: `—`

### service_categories · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### services · anon_select_active_services

- Comando: `SELECT`
- Roles: `{anon}`
- USING: `(is_active = true)`
- WITH CHECK: `—`

### services · barber_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `((current_user_role() = 'barber'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### services · business_admin_own

- Comando: `ALL`
- Roles: `{public}`
- USING: `((current_user_role() = 'business_admin'::text) AND (business_id = current_user_business_id()))`
- WITH CHECK: `—`

### services · public_read

- Comando: `SELECT`
- Roles: `{public}`
- USING: `(EXISTS ( SELECT 1    FROM businesses   WHERE ((businesses.id = services.business_id) AND (businesses.status = 'active'::text))))`
- WITH CHECK: `—`

### services · staff_delete_services

- Comando: `DELETE`
- Roles: `{authenticated}`
- USING: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`
- WITH CHECK: `—`

### services · staff_insert_services

- Comando: `INSERT`
- Roles: `{authenticated}`
- USING: `—`
- WITH CHECK: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`

### services · staff_select_services

- Comando: `SELECT`
- Roles: `{authenticated}`
- USING: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`
- WITH CHECK: `—`

### services · staff_update_services

- Comando: `UPDATE`
- Roles: `{authenticated}`
- USING: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`
- WITH CHECK: `(business_id IN ( SELECT business_staff.business_id    FROM business_staff   WHERE (business_staff.user_id = auth.uid())))`

### services · super_admin_all

- Comando: `ALL`
- Roles: `{public}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### super_admins · super_admin_all

- Comando: `ALL`
- Roles: `{authenticated}`
- USING: `is_super_admin()`
- WITH CHECK: `is_super_admin()`

### super_admins · super_admin_delete

- Comando: `DELETE`
- Roles: `{authenticated}`
- USING: `is_super_admin()`
- WITH CHECK: `—`

### super_admins · super_admin_insert

- Comando: `INSERT`
- Roles: `{authenticated}`
- USING: `—`
- WITH CHECK: `is_super_admin()`

### super_admins · super_admin_select_self

- Comando: `SELECT`
- Roles: `{authenticated}`
- USING: `(is_super_admin() OR (id = auth.uid()))`
- WITH CHECK: `—`

### super_admins · super_admin_update

- Comando: `UPDATE`
- Roles: `{authenticated}`
- USING: `is_super_admin()`
- WITH CHECK: `is_super_admin()`

## Funciones

| Función | Argumentos | SECURITY DEFINER | search_path | anon | authenticated |
|---------|------------|------------------|-------------|------|----------------|
| audit_trigger |  | sí | search_path=public | sí | sí |
| auto_cash_on_completion |  | sí | search_path=public | sí | sí |
| check_barber_limit |  | sí | search_path=public | sí | sí |
| check_booking_limit |  | sí | search_path=public | sí | sí |
| check_booking_spam |  | sí | search_path=public | sí | sí |
| check_cash_module_access |  | sí | search_path=public | sí | sí |
| check_module_access |  | sí | search_path=public | sí | sí |
| complete_appointment | p_appointment_id uuid, p_completed_products jsonb | sí | search_path=public | sí | sí |
| create_appointment_atomic | p_business_id uuid, p_branch_id uuid, p_service_id uuid, p_client_name text, p_client_phone text, p_client_email text, p_date date, p_start_time time without time zone, p_barber_id uuid, p_product_ids uuid[], p_product_quantities integer[] | sí | search_path=public | sí | sí |
| current_user_business_id |  | no | — | sí | sí |
| current_user_id |  | no | — | sí | sí |
| current_user_role |  | no | — | sí | sí |
| enforce_barber_limit |  | sí | search_path=public | sí | sí |
| enforce_branch_limit |  | sí | search_path=public | sí | sí |
| get_plan_limits | biz_id uuid | no | — | sí | sí |
| is_super_admin |  | sí | search_path=public | sí | sí |
| notify_new_appointment |  | no | — | sí | sí |
| plan_has_feature | biz_id uuid, feature_name text | no | — | sí | sí |
| recalc_appointment_total |  | sí | search_path=public | sí | sí |
| rls_auto_enable |  | sí | search_path=public | sí | sí |
| transfer_appointment | p_appointment_id uuid | sí | search_path=public | sí | sí |
| update_branches_updated_at |  | no | — | sí | sí |
| update_updated_at |  | no | — | sí | sí |

## Triggers

| Tabla | Trigger | Definición |
|-------|---------|------------|
| appointment_products | trg_recalc_total_product_delete | CREATE TRIGGER trg_recalc_total_product_delete AFTER DELETE ON public.appointment_products FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total() |
| appointment_products | trg_recalc_total_product_insert | CREATE TRIGGER trg_recalc_total_product_insert AFTER INSERT ON public.appointment_products FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total() |
| appointment_services | trg_recalc_total_delete | CREATE TRIGGER trg_recalc_total_delete AFTER DELETE ON public.appointment_services FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total() |
| appointment_services | trg_recalc_total_insert | CREATE TRIGGER trg_recalc_total_insert AFTER INSERT ON public.appointment_services FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total() |
| appointment_services | trg_recalc_total_update | CREATE TRIGGER trg_recalc_total_update AFTER UPDATE ON public.appointment_services FOR EACH ROW EXECUTE FUNCTION recalc_appointment_total() |
| appointments | on_appointment_created | CREATE TRIGGER on_appointment_created AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION notify_new_appointment() |
| appointments | trg_audit_appointments | CREATE TRIGGER trg_audit_appointments AFTER INSERT OR DELETE OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION audit_trigger() |
| appointments | trg_auto_cash_on_completion | CREATE TRIGGER trg_auto_cash_on_completion AFTER UPDATE OF status ON public.appointments FOR EACH ROW EXECUTE FUNCTION auto_cash_on_completion() |
| appointments | trg_check_booking_limit | CREATE TRIGGER trg_check_booking_limit BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION check_booking_limit() |
| appointments | trg_check_booking_spam | CREATE TRIGGER trg_check_booking_spam BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION check_booking_spam() |
| appointments | update_appointments_updated_at | CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at() |
| barbers | trg_check_barber_limit | CREATE TRIGGER trg_check_barber_limit BEFORE INSERT ON public.barbers FOR EACH ROW EXECUTE FUNCTION check_barber_limit() |
| barbers | trg_enforce_barber_limit | CREATE TRIGGER trg_enforce_barber_limit BEFORE INSERT ON public.barbers FOR EACH ROW EXECUTE FUNCTION enforce_barber_limit() |
| branches | branches_updated_at | CREATE TRIGGER branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION update_branches_updated_at() |
| branches | trg_enforce_branch_limit | CREATE TRIGGER trg_enforce_branch_limit BEFORE INSERT ON public.branches FOR EACH ROW EXECUTE FUNCTION enforce_branch_limit() |
| business_staff | trg_audit_business_staff | CREATE TRIGGER trg_audit_business_staff AFTER INSERT OR DELETE OR UPDATE ON public.business_staff FOR EACH ROW EXECUTE FUNCTION audit_trigger() |
| businesses | trg_audit_businesses | CREATE TRIGGER trg_audit_businesses AFTER INSERT OR DELETE OR UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION audit_trigger() |
| businesses | update_businesses_updated_at | CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at() |
| cash_movements | trg_audit_cash_movements | CREATE TRIGGER trg_audit_cash_movements AFTER INSERT OR DELETE OR UPDATE ON public.cash_movements FOR EACH ROW EXECUTE FUNCTION audit_trigger() |
| cash_register | trg_audit_cash_register | CREATE TRIGGER trg_audit_cash_register AFTER INSERT OR DELETE OR UPDATE ON public.cash_register FOR EACH ROW EXECUTE FUNCTION audit_trigger() |
| cash_register | trg_check_cash_register_access | CREATE TRIGGER trg_check_cash_register_access BEFORE INSERT ON public.cash_register FOR EACH ROW EXECUTE FUNCTION check_cash_module_access() |
| clients | trg_audit_clients | CREATE TRIGGER trg_audit_clients AFTER INSERT OR DELETE OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION audit_trigger() |
| inventory_products | trg_audit_inventory | CREATE TRIGGER trg_audit_inventory AFTER INSERT OR DELETE OR UPDATE ON public.inventory_products FOR EACH ROW EXECUTE FUNCTION audit_trigger() |
| inventory_products | trg_check_inventory_access | CREATE TRIGGER trg_check_inventory_access BEFORE INSERT ON public.inventory_products FOR EACH ROW EXECUTE FUNCTION check_module_access() |
| services | trg_audit_services | CREATE TRIGGER trg_audit_services AFTER INSERT OR DELETE OR UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION audit_trigger() |
