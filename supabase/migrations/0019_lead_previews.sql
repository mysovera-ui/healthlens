create table if not exists lead_previews (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  file_urls text[] not null default '{}',
  preview_parameter text,
  preview_sentence text,
  preview_status text,
  markers_detected_count integer not null default 0,
  contacted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table lead_previews enable row level security;
-- No permissive policy for anon/authenticated -- all access goes through
-- the service-role client in server actions, matching the RLS lockdown
-- pattern used across the rest of this app (staff_members, report_deliveries,
-- audit_logs, etc.).
