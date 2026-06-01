-- Cohort Studio Phase 0 foundational schema only.
-- Subject, task, student, marking, moderation, rubric, import/export and analytics tables are intentionally deferred.

create extension if not exists pgcrypto;

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schools_status_check check (status in ('active', 'inactive', 'archived'))
);

comment on table public.schools is 'School boundary foundation for Cohort Studio.';

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  auth_user_id uuid unique,
  display_name text not null,
  email text not null,
  status text not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_school_id_email_key unique (school_id, email),
  constraint profiles_status_check check (
    status in ('invited', 'active', 'inactive', 'suspended', 'archived')
  )
);

comment on table public.profiles is 'App-level staff profiles. auth_user_id is nullable to support invited users before Supabase Auth linking.';
comment on column public.profiles.auth_user_id is 'Nullable Supabase Auth user id, linked after invitation acceptance or account creation.';

create table public.user_global_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint user_global_roles_school_profile_role_key unique (school_id, profile_id, role),
  constraint user_global_roles_role_check check (
    role in ('system_admin', 'school_viewer', 'template_manager')
  )
);

comment on table public.user_global_roles is 'School-level global role assignments, stored separately from profiles.';

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  actor_display_name text,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  parent_entity_type text,
  parent_entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_events is 'Generic audit trail foundation. Contextual columns can be added later when domain tables exist.';

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_schools_updated_at
before update on public.schools
for each row
execute function public.set_updated_at();

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create index profiles_school_id_idx on public.profiles(school_id);
create index profiles_auth_user_id_idx on public.profiles(auth_user_id);
create index profiles_email_idx on public.profiles(email);
create index user_global_roles_school_id_idx on public.user_global_roles(school_id);
create index user_global_roles_profile_id_idx on public.user_global_roles(profile_id);
create index audit_events_school_id_idx on public.audit_events(school_id);
create index audit_events_actor_profile_id_idx on public.audit_events(actor_profile_id);
create index audit_events_event_type_idx on public.audit_events(event_type);
create index audit_events_entity_type_entity_id_idx on public.audit_events(entity_type, entity_id);
create index audit_events_created_at_idx on public.audit_events(created_at);

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.user_global_roles enable row level security;
alter table public.audit_events enable row level security;

create function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.profiles
  where auth_user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id
  from public.profiles
  where auth_user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create function public.is_system_admin(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_global_roles
    where school_id = target_school_id
      and profile_id = public.current_profile_id()
      and role = 'system_admin'
  );
$$;

create policy "active users can select their own school"
on public.schools
for select
using (id = public.current_school_id());

create policy "system admins can update their own school"
on public.schools
for update
using (public.is_system_admin(id))
with check (public.is_system_admin(id));

create policy "active users can select profiles in their own school"
on public.profiles
for select
using (school_id = public.current_school_id());

create policy "system admins can insert profiles in their own school"
on public.profiles
for insert
with check (public.is_system_admin(school_id));

create policy "system admins can update profiles in their own school"
on public.profiles
for update
using (public.is_system_admin(school_id))
with check (public.is_system_admin(school_id));

create policy "system admins can select global roles in their own school"
on public.user_global_roles
for select
using (public.is_system_admin(school_id));

create policy "active users can select their own global roles"
on public.user_global_roles
for select
using (profile_id = public.current_profile_id());

create policy "system admins can insert global roles in their own school"
on public.user_global_roles
for insert
with check (public.is_system_admin(school_id));

create policy "system admins can delete global roles in their own school"
on public.user_global_roles
for delete
using (public.is_system_admin(school_id));

create policy "system admins can select audit events in their own school"
on public.audit_events
for select
using (public.is_system_admin(school_id));

create policy "system admins can insert audit events in their own school"
on public.audit_events
for insert
with check (public.is_system_admin(school_id));

comment on policy "system admins can insert audit events in their own school"
on public.audit_events
is 'Later migrations may add narrower audit insert paths for server-side workflows.';
