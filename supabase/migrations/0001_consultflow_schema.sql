-- ConsultFlow Dental: production schema (PostgreSQL / Supabase).
-- The demo runs on synthetic in-browser data and does NOT use this schema yet.
-- Every tenant-owned table carries clinic_id, and row level security limits
-- each authenticated user to the clinics they belong to.

create extension if not exists "pgcrypto";

create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text,
  address text,
  city text,
  phone text,
  whatsapp text,
  email text,
  website text,
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR',
  locale text not null default 'en-IN',
  parking text,
  payment_methods text[] not null default '{}',
  emergency_instructions text,
  escalation_instructions text,
  booking_rules jsonb not null default '{}'::jsonb,   -- consultation length, hours, blackout dates, reminders
  roi_assumptions jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table clinic_users (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  auth_user_id uuid not null,                          -- auth.users.id
  name text not null,
  email text not null,
  role text not null check (role in ('owner','manager','front_desk')),
  created_at timestamptz not null default now(),
  unique (clinic_id, auth_user_id)
);

create table services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  keywords text[] not null default '{}',
  consultation_type text not null,
  consultation_fee numeric(10,2),                      -- null = never quoted to patients
  estimated_case_value numeric(12,2) not null default 0, -- internal estimate only
  description text,
  active boolean not null default true
);

create table faqs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  question text not null,
  answer text not null,
  keywords text[] not null default '{}',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  source text not null check (source in ('website','whatsapp','google','instagram','directory','phone','referral')),
  channel text not null check (channel in ('whatsapp','sms','email','web_chat')),
  service_id uuid references services(id),
  status text not null default 'new' check (status in ('new','contacted','qualified','booked','attended','lost','needs_human','do_not_contact')),
  assigned_to uuid references clinic_users(id),
  intake jsonb not null default '{}'::jsonb,
  contacted_at timestamptz,
  qualified_at timestamptz,
  booked_at timestamptz,
  attended_at timestamptz,
  first_response_seconds integer,
  consent_to_contact boolean not null default true,
  consent_source text,                                 -- where consent was captured
  lost_reason text,
  reactivated_from_campaign_id uuid,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);
create index leads_clinic_status_idx on leads (clinic_id, status);
create index leads_clinic_created_idx on leads (clinic_id, created_at desc);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  channel text not null,
  mode text not null default 'ai' check (mode in ('ai','human')),
  taken_over_by uuid references clinic_users(id),
  status text not null default 'open' check (status in ('open','waiting_patient','needs_human','closed')),
  unread integer not null default 0,
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  author text not null check (author in ('patient','ai','staff','system')),
  author_id uuid references clinic_users(id),
  kind text not null default 'text',
  body text not null,
  slots jsonb,
  meta jsonb,                                          -- intent, guardrail, provider
  provider_message_id text,                            -- WhatsApp/SMS id for delivery receipts
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  service_id uuid references services(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','confirmed','attended','no_show','cancelled')),
  consultation_type text not null,
  booked_by text not null check (booked_by in ('ai','staff')),
  external_id text,                                    -- PMS / calendar id
  created_at timestamptz not null default now()
);
-- No two live appointments may start at the same time for one clinic (single chair demo rule).
create unique index appointments_no_double_book on appointments (clinic_id, starts_at) where status <> 'cancelled';

create table follow_ups (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  kind text not null check (kind in ('reminder_24h','reminder_2h','no_reply_nudge','post_consult_check','reactivation')),
  channel text not null,
  due_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','sent','cancelled','skipped')),
  body text not null
);
create index follow_ups_due_idx on follow_ups (status, due_at);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft','active','completed')),
  audience jsonb not null,
  message text not null,
  channel text not null default 'whatsapp',
  created_at timestamptz not null default now(),
  launched_at timestamptz
);

create table campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  status text not null default 'queued',
  sent_at timestamptz,
  replied_at timestamptz,
  reply text,
  unique (campaign_id, lead_id)
);

create table analytics_events (
  id bigint generated always as identity primary key,
  clinic_id uuid not null references clinics(id) on delete cascade,
  type text not null,
  lead_id uuid references leads(id) on delete set null,
  at timestamptz not null default now(),
  data jsonb
);
create index analytics_events_clinic_idx on analytics_events (clinic_id, type, at);

-- Row level security: a user sees only rows for clinics they belong to.
create or replace function public.user_clinic_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select clinic_id from clinic_users where auth_user_id = auth.uid()
$$;

do $$
declare t text;
begin
  foreach t in array array['services','faqs','leads','conversations','messages','appointments','follow_ups','campaigns','campaign_recipients','analytics_events','clinic_users'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all using (clinic_id in (select public.user_clinic_ids())) with check (clinic_id in (select public.user_clinic_ids()))', t || '_tenant', t);
  end loop;
end $$;

alter table clinics enable row level security;
create policy clinics_member on clinics for all using (id in (select public.user_clinic_ids())) with check (id in (select public.user_clinic_ids()));
