-- Cohort Studio current app schema sync for Supabase SQL Editor.
-- Generated from the current Next.js/Supabase codebase and local migrations.
--
-- Safe-use notes:
-- - This script is intended for Supabase SQL Editor.
-- - It avoids destructive table/data changes.
-- - It does not drop academic_years.label if that legacy column already exists.
--   Instead, it makes the column nullable so current code can insert rows
--   using only academic_years.year.
-- - Review the optional bootstrap section at the end before using it.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.schools
  add column if not exists name text,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'schools_status_check'
  ) then
    alter table public.schools
      add constraint schools_status_check
      check (status in ('active', 'inactive', 'archived'));
  end if;
end $$;

comment on table public.schools is 'School boundary foundation for Cohort Studio.';

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  auth_user_id uuid unique,
  display_name text not null,
  email text not null,
  status text not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists school_id uuid references public.schools(id) on delete restrict,
  add column if not exists auth_user_id uuid,
  add column if not exists display_name text,
  add column if not exists email text,
  add column if not exists status text not null default 'invited',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_school_id_email_key'
  ) then
    alter table public.profiles
      add constraint profiles_school_id_email_key unique (school_id, email);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (status in ('invited', 'active', 'inactive', 'suspended', 'archived'));
  end if;
end $$;

comment on table public.profiles is 'App-level staff profiles. auth_user_id is nullable to support invited users before Supabase Auth linking.';
comment on column public.profiles.auth_user_id is 'Nullable Supabase Auth user id, linked after invitation acceptance or account creation.';

create table if not exists public.user_global_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.user_global_roles
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists role text,
  add column if not exists assigned_by uuid references public.profiles(id) on delete set null,
  add column if not exists assigned_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_global_roles_school_profile_role_key'
  ) then
    alter table public.user_global_roles
      add constraint user_global_roles_school_profile_role_key unique (school_id, profile_id, role);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_global_roles_role_check'
  ) then
    alter table public.user_global_roles
      add constraint user_global_roles_role_check
      check (role in ('system_admin', 'school_viewer', 'template_manager'));
  end if;
end $$;

comment on table public.user_global_roles is 'School-level global role assignments, stored separately from profiles.';

create table if not exists public.audit_events (
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

alter table public.audit_events
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists actor_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists actor_email text,
  add column if not exists actor_display_name text,
  add column if not exists event_type text,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists parent_entity_type text,
  add column if not exists parent_entity_id uuid,
  add column if not exists old_values jsonb,
  add column if not exists new_values jsonb,
  add column if not exists reason text,
  add column if not exists metadata jsonb,
  add column if not exists created_at timestamptz not null default now();

comment on table public.audit_events is 'Generic audit trail foundation. Contextual columns can be added later when domain tables exist.';

create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  year integer not null,
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.academic_years
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists year integer,
  add column if not exists starts_on date,
  add column if not exists ends_on date,
  add column if not exists is_current boolean not null default false,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'academic_years'
      and column_name = 'label'
      and is_nullable = 'NO'
  ) then
    alter table public.academic_years alter column label drop not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'academic_years_school_id_year_key'
  ) then
    alter table public.academic_years
      add constraint academic_years_school_id_year_key unique (school_id, year);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'academic_years_status_check'
  ) then
    alter table public.academic_years
      add constraint academic_years_status_check
      check (status in ('active', 'archived'));
  end if;
end $$;

comment on table public.academic_years is 'School academic years for subject and class setup. Uses the numeric year field for display.';

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  subject_type text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subjects
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists name text,
  add column if not exists subject_type text,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subjects_status_check'
  ) then
    alter table public.subjects
      add constraint subjects_status_check
      check (status in ('active', 'archived'));
  end if;
end $$;

comment on table public.subjects is 'School-level subject catalogue.';

create table if not exists public.subject_instances (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  name text not null,
  status text not null default 'draft',
  source_template_version_id uuid,
  comparison_subject_instance_id uuid references public.subject_instances(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subject_instances
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists subject_id uuid references public.subjects(id) on delete restrict,
  add column if not exists academic_year_id uuid references public.academic_years(id) on delete restrict,
  add column if not exists name text,
  add column if not exists status text not null default 'draft',
  add column if not exists source_template_version_id uuid,
  add column if not exists comparison_subject_instance_id uuid references public.subject_instances(id) on delete set null,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists archived_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subject_instances_school_subject_year_key'
  ) then
    alter table public.subject_instances
      add constraint subject_instances_school_subject_year_key unique (school_id, subject_id, academic_year_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'subject_instances_status_check'
  ) then
    alter table public.subject_instances
      add constraint subject_instances_status_check
      check (status in ('draft', 'active', 'archived'));
  end if;
end $$;

comment on table public.subject_instances is 'A school subject delivered in a specific academic year.';
comment on column public.subject_instances.source_template_version_id is 'Nullable until template tables are introduced.';

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  subject_instance_id uuid not null references public.subject_instances(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.units
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists subject_instance_id uuid references public.subject_instances(id) on delete cascade,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'units_subject_instance_id_name_key'
  ) then
    alter table public.units
      add constraint units_subject_instance_id_name_key unique (subject_instance_id, name);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'units_status_check'
  ) then
    alter table public.units
      add constraint units_status_check
      check (status in ('active', 'archived'));
  end if;
end $$;

comment on table public.units is 'Unit, semester or section structure inside a subject instance.';

create table if not exists public.outcomes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  subject_instance_id uuid not null references public.subject_instances(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.outcomes
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists unit_id uuid references public.units(id) on delete cascade,
  add column if not exists subject_instance_id uuid references public.subject_instances(id) on delete cascade,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'outcomes_unit_id_name_key'
  ) then
    alter table public.outcomes
      add constraint outcomes_unit_id_name_key unique (unit_id, name);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'outcomes_status_check'
  ) then
    alter table public.outcomes
      add constraint outcomes_status_check
      check (status in ('active', 'archived'));
  end if;
end $$;

comment on table public.outcomes is 'Outcome, Area of Study or local outcome structure inside a unit.';

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  subject_instance_id uuid not null references public.subject_instances(id) on delete cascade,
  name text not null,
  primary_teacher_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.classes
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists subject_instance_id uuid references public.subject_instances(id) on delete cascade,
  add column if not exists name text,
  add column if not exists primary_teacher_id uuid references public.profiles(id) on delete set null,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'classes_subject_instance_id_name_key'
  ) then
    alter table public.classes
      add constraint classes_subject_instance_id_name_key unique (subject_instance_id, name);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'classes_status_check'
  ) then
    alter table public.classes
      add constraint classes_status_check
      check (status in ('active', 'archived'));
  end if;
end $$;

comment on table public.classes is 'Teaching groups inside a subject instance.';

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  first_name text not null,
  surname text not null,
  preferred_name text,
  student_code text,
  email text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.students
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists first_name text,
  add column if not exists surname text,
  add column if not exists preferred_name text,
  add column if not exists student_code text,
  add column if not exists email text,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'students_status_check'
  ) then
    alter table public.students
      add constraint students_status_check
      check (status in ('active', 'inactive', 'archived'));
  end if;
end $$;

comment on table public.students is 'School-level student identity, separate from class membership.';

create table if not exists public.class_enrolments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'active',
  enrolled_at date,
  left_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.class_enrolments
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists class_id uuid references public.classes(id) on delete cascade,
  add column if not exists student_id uuid references public.students(id) on delete cascade,
  add column if not exists status text not null default 'active',
  add column if not exists enrolled_at date,
  add column if not exists left_at date,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'class_enrolments_class_id_student_id_key'
  ) then
    alter table public.class_enrolments
      add constraint class_enrolments_class_id_student_id_key unique (class_id, student_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'class_enrolments_status_check'
  ) then
    alter table public.class_enrolments
      add constraint class_enrolments_status_check
      check (status in ('active', 'moved', 'withdrawn', 'archived'));
  end if;
end $$;

comment on table public.class_enrolments is 'Student membership in classes, separate from student identity.';

create table if not exists public.user_subject_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  subject_instance_id uuid not null references public.subject_instances(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_subject_roles
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists subject_instance_id uuid references public.subject_instances(id) on delete cascade,
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists role text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_subject_roles_subject_profile_role_key'
  ) then
    alter table public.user_subject_roles
      add constraint user_subject_roles_subject_profile_role_key unique (subject_instance_id, profile_id, role);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_subject_roles_role_check'
  ) then
    alter table public.user_subject_roles
      add constraint user_subject_roles_role_check
      check (role in ('subject_moderator', 'assessment_owner', 'teacher', 'cohort_marker', 'viewer'));
  end if;
end $$;

comment on table public.user_subject_roles is 'Subject-instance scoped staff roles.';

create table if not exists public.user_class_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_class_roles
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists class_id uuid references public.classes(id) on delete cascade,
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists role text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_class_roles_class_profile_role_key'
  ) then
    alter table public.user_class_roles
      add constraint user_class_roles_class_profile_role_key unique (class_id, profile_id, role);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_class_roles_role_check'
  ) then
    alter table public.user_class_roles
      add constraint user_class_roles_role_check
      check (role in ('class_teacher', 'class_viewer'));
  end if;
end $$;

comment on table public.user_class_roles is 'Class-scoped staff roles.';

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  subject_instance_id uuid not null references public.subject_instances(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  outcome_id uuid references public.outcomes(id) on delete set null,
  name text not null,
  description text,
  task_type text not null default 'assessment',
  status text not null default 'draft',
  task_date date,
  marking_due_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists subject_instance_id uuid references public.subject_instances(id) on delete cascade,
  add column if not exists unit_id uuid references public.units(id) on delete set null,
  add column if not exists outcome_id uuid references public.outcomes(id) on delete set null,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists task_type text not null default 'assessment',
  add column if not exists status text not null default 'draft',
  add column if not exists task_date date,
  add column if not exists marking_due_date date,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_name_not_blank_check'
  ) then
    alter table public.tasks
      add constraint tasks_name_not_blank_check check (btrim(name) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tasks_task_type_not_blank_check'
  ) then
    alter table public.tasks
      add constraint tasks_task_type_not_blank_check check (btrim(task_type) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tasks_status_check'
  ) then
    alter table public.tasks
      add constraint tasks_status_check
      check (
        status in (
          'draft',
          'ready',
          'marking_open',
          'marking_closed',
          'moderation',
          'ready_to_finalise',
          'finalised',
          'locked',
          'archived'
        )
      );
  end if;
end $$;

comment on table public.tasks is 'Assessment task setup records inside a subject instance.';
comment on column public.tasks.task_type is 'MVP task type. Numeric task setup UI initially uses assessment.';
comment on column public.tasks.status is 'Workflow status for task setup and marking lifecycle.';

create table if not exists public.task_scoring_rules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  score_type text not null default 'numeric',
  max_score numeric not null,
  display_max_score numeric not null,
  pass_threshold numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.task_scoring_rules
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists task_id uuid references public.tasks(id) on delete cascade,
  add column if not exists score_type text not null default 'numeric',
  add column if not exists max_score numeric,
  add column if not exists display_max_score numeric,
  add column if not exists pass_threshold numeric,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'task_scoring_rules_task_id_key'
  ) then
    alter table public.task_scoring_rules
      add constraint task_scoring_rules_task_id_key unique (task_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'task_scoring_rules_score_type_check'
  ) then
    alter table public.task_scoring_rules
      add constraint task_scoring_rules_score_type_check
      check (score_type in ('numeric'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'task_scoring_rules_max_score_check'
  ) then
    alter table public.task_scoring_rules
      add constraint task_scoring_rules_max_score_check check (max_score > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'task_scoring_rules_display_max_score_check'
  ) then
    alter table public.task_scoring_rules
      add constraint task_scoring_rules_display_max_score_check check (display_max_score > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'task_scoring_rules_pass_threshold_check'
  ) then
    alter table public.task_scoring_rules
      add constraint task_scoring_rules_pass_threshold_check
      check (pass_threshold is null or pass_threshold >= 0);
  end if;
end $$;

comment on table public.task_scoring_rules is 'Numeric scoring rule foundation for assessment tasks.';

create table if not exists public.task_moderation_rules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  required_initial_markers integer not null default 2,
  variance_threshold numeric not null,
  moderation_pathway text not null default 'third_marker_required',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.task_moderation_rules
  add column if not exists school_id uuid references public.schools(id) on delete cascade,
  add column if not exists task_id uuid references public.tasks(id) on delete cascade,
  add column if not exists required_initial_markers integer not null default 2,
  add column if not exists variance_threshold numeric,
  add column if not exists moderation_pathway text not null default 'third_marker_required',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'task_moderation_rules_task_id_key'
  ) then
    alter table public.task_moderation_rules
      add constraint task_moderation_rules_task_id_key unique (task_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'task_moderation_rules_required_initial_markers_check'
  ) then
    alter table public.task_moderation_rules
      add constraint task_moderation_rules_required_initial_markers_check
      check (required_initial_markers >= 1);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'task_moderation_rules_variance_threshold_check'
  ) then
    alter table public.task_moderation_rules
      add constraint task_moderation_rules_variance_threshold_check
      check (variance_threshold >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'task_moderation_rules_moderation_pathway_check'
  ) then
    alter table public.task_moderation_rules
      add constraint task_moderation_rules_moderation_pathway_check
      check (moderation_pathway in ('third_marker_required', 'manual_review', 'within_tolerance_only'));
  end if;
end $$;

comment on table public.task_moderation_rules is 'Moderation threshold settings for assessment tasks.';

do $$
begin
  create trigger set_schools_updated_at
  before update on public.schools
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$
begin
  create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$
begin
  create trigger set_academic_years_updated_at
  before update on public.academic_years
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$
begin
  create trigger set_subjects_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$
begin
  create trigger set_subject_instances_updated_at
  before update on public.subject_instances
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$
begin
  create trigger set_units_updated_at
  before update on public.units
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$
begin
  create trigger set_outcomes_updated_at
  before update on public.outcomes
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$
begin
  create trigger set_classes_updated_at
  before update on public.classes
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$
begin
  create trigger set_students_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$
begin
  create trigger set_class_enrolments_updated_at
  before update on public.class_enrolments
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$
begin
  create trigger set_user_subject_roles_updated_at
  before update on public.user_subject_roles
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$
begin
  create trigger set_user_class_roles_updated_at
  before update on public.user_class_roles
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$
begin
  create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$
begin
  create trigger set_task_scoring_rules_updated_at
  before update on public.task_scoring_rules
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$
begin
  create trigger set_task_moderation_rules_updated_at
  before update on public.task_moderation_rules
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

create unique index if not exists profiles_auth_user_id_key
on public.profiles(auth_user_id)
where auth_user_id is not null;

create index if not exists profiles_school_id_idx on public.profiles(school_id);
create index if not exists profiles_auth_user_id_idx on public.profiles(auth_user_id);
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists user_global_roles_school_id_idx on public.user_global_roles(school_id);
create index if not exists user_global_roles_profile_id_idx on public.user_global_roles(profile_id);
create index if not exists audit_events_school_id_idx on public.audit_events(school_id);
create index if not exists audit_events_actor_profile_id_idx on public.audit_events(actor_profile_id);
create index if not exists audit_events_event_type_idx on public.audit_events(event_type);
create index if not exists audit_events_entity_type_entity_id_idx on public.audit_events(entity_type, entity_id);
create index if not exists audit_events_created_at_idx on public.audit_events(created_at);
create index if not exists academic_years_school_id_idx on public.academic_years(school_id);
create index if not exists academic_years_school_id_year_idx on public.academic_years(school_id, year);
create unique index if not exists subjects_school_id_lower_name_key on public.subjects(school_id, lower(name));
create index if not exists subjects_school_id_idx on public.subjects(school_id);
create index if not exists subjects_school_id_name_idx on public.subjects(school_id, name);
create index if not exists subject_instances_school_id_idx on public.subject_instances(school_id);
create index if not exists subject_instances_school_id_academic_year_id_idx on public.subject_instances(school_id, academic_year_id);
create index if not exists subject_instances_school_id_subject_id_idx on public.subject_instances(school_id, subject_id);
create index if not exists units_school_id_idx on public.units(school_id);
create index if not exists units_subject_instance_id_idx on public.units(subject_instance_id);
create index if not exists outcomes_school_id_idx on public.outcomes(school_id);
create index if not exists outcomes_unit_id_idx on public.outcomes(unit_id);
create index if not exists outcomes_subject_instance_id_idx on public.outcomes(subject_instance_id);
create index if not exists classes_school_id_idx on public.classes(school_id);
create index if not exists classes_subject_instance_id_idx on public.classes(subject_instance_id);
create index if not exists students_school_id_idx on public.students(school_id);
create index if not exists students_school_id_surname_first_name_idx on public.students(school_id, surname, first_name);
create unique index if not exists students_school_id_student_code_key
on public.students(school_id, student_code)
where student_code is not null;
create index if not exists students_school_id_student_code_idx
on public.students(school_id, student_code)
where student_code is not null;
create index if not exists class_enrolments_school_id_idx on public.class_enrolments(school_id);
create index if not exists class_enrolments_class_id_idx on public.class_enrolments(class_id);
create index if not exists class_enrolments_student_id_idx on public.class_enrolments(student_id);
create index if not exists user_subject_roles_school_id_idx on public.user_subject_roles(school_id);
create index if not exists user_subject_roles_profile_id_idx on public.user_subject_roles(profile_id);
create index if not exists user_subject_roles_subject_instance_id_idx on public.user_subject_roles(subject_instance_id);
create index if not exists user_class_roles_school_id_idx on public.user_class_roles(school_id);
create index if not exists user_class_roles_profile_id_idx on public.user_class_roles(profile_id);
create index if not exists user_class_roles_class_id_idx on public.user_class_roles(class_id);
create unique index if not exists tasks_school_subject_instance_lower_name_key
on public.tasks(school_id, subject_instance_id, lower(btrim(name)));
create index if not exists tasks_school_id_idx on public.tasks(school_id);
create index if not exists tasks_subject_instance_id_idx on public.tasks(subject_instance_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_unit_id_idx on public.tasks(unit_id);
create index if not exists tasks_outcome_id_idx on public.tasks(outcome_id);
create index if not exists task_scoring_rules_school_id_idx on public.task_scoring_rules(school_id);
create index if not exists task_scoring_rules_task_id_idx on public.task_scoring_rules(task_id);
create index if not exists task_moderation_rules_school_id_idx on public.task_moderation_rules(school_id);
create index if not exists task_moderation_rules_task_id_idx on public.task_moderation_rules(task_id);

create or replace function public.current_profile_id()
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

create or replace function public.current_school_id()
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

create or replace function public.is_system_admin(target_school_id uuid)
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

create or replace function public.has_subject_role(target_subject_instance_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_subject_roles usr
    join public.subject_instances si
      on si.id = usr.subject_instance_id
    where usr.subject_instance_id = target_subject_instance_id
      and usr.profile_id = public.current_profile_id()
      and usr.school_id = public.current_school_id()
      and si.school_id = public.current_school_id()
      and usr.role = any(allowed_roles)
  );
$$;

create or replace function public.has_class_role(target_class_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_class_roles ucr
    join public.classes c
      on c.id = ucr.class_id
    where ucr.class_id = target_class_id
      and ucr.profile_id = public.current_profile_id()
      and ucr.school_id = public.current_school_id()
      and c.school_id = public.current_school_id()
      and ucr.role = any(allowed_roles)
  );
$$;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.user_global_roles enable row level security;
alter table public.audit_events enable row level security;
alter table public.academic_years enable row level security;
alter table public.subjects enable row level security;
alter table public.subject_instances enable row level security;
alter table public.units enable row level security;
alter table public.outcomes enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.class_enrolments enable row level security;
alter table public.user_subject_roles enable row level security;
alter table public.user_class_roles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_scoring_rules enable row level security;
alter table public.task_moderation_rules enable row level security;

do $$
begin
  create policy "active users can select their own school"
  on public.schools
  for select
  using (id = public.current_school_id());
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update their own school"
  on public.schools
  for update
  using (public.is_system_admin(id))
  with check (public.is_system_admin(id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "active users can select profiles in their own school"
  on public.profiles
  for select
  using (school_id = public.current_school_id());
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert profiles in their own school"
  on public.profiles
  for insert
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update profiles in their own school"
  on public.profiles
  for update
  using (public.is_system_admin(school_id))
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can select global roles in their own school"
  on public.user_global_roles
  for select
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "active users can select their own global roles"
  on public.user_global_roles
  for select
  using (profile_id = public.current_profile_id());
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert global roles in their own school"
  on public.user_global_roles
  for insert
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can delete global roles in their own school"
  on public.user_global_roles
  for delete
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can select audit events in their own school"
  on public.audit_events
  for select
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert audit events in their own school"
  on public.audit_events
  for insert
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "active users can select academic years in their own school"
  on public.academic_years
  for select
  using (school_id = public.current_school_id());
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert academic years in their own school"
  on public.academic_years
  for insert
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update academic years in their own school"
  on public.academic_years
  for update
  using (public.is_system_admin(school_id))
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can delete academic years in their own school"
  on public.academic_years
  for delete
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "active users can select subjects in their own school"
  on public.subjects
  for select
  using (school_id = public.current_school_id());
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert subjects in their own school"
  on public.subjects
  for insert
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update subjects in their own school"
  on public.subjects
  for update
  using (public.is_system_admin(school_id))
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can delete subjects in their own school"
  on public.subjects
  for delete
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "assigned users can select subject instances"
  on public.subject_instances
  for select
  using (
    public.is_system_admin(school_id)
    or public.has_subject_role(
      id,
      array['subject_moderator', 'assessment_owner', 'teacher', 'cohort_marker', 'viewer']::text[]
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert subject instances in their own school"
  on public.subject_instances
  for insert
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update subject instances in their own school"
  on public.subject_instances
  for update
  using (public.is_system_admin(school_id))
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can delete subject instances in their own school"
  on public.subject_instances
  for delete
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "assigned users can select units"
  on public.units
  for select
  using (
    public.is_system_admin(school_id)
    or public.has_subject_role(
      subject_instance_id,
      array['subject_moderator', 'assessment_owner', 'teacher', 'cohort_marker', 'viewer']::text[]
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert units in their own school"
  on public.units
  for insert
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update units in their own school"
  on public.units
  for update
  using (public.is_system_admin(school_id))
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can delete units in their own school"
  on public.units
  for delete
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "assigned users can select outcomes"
  on public.outcomes
  for select
  using (
    public.is_system_admin(school_id)
    or public.has_subject_role(
      subject_instance_id,
      array['subject_moderator', 'assessment_owner', 'teacher', 'cohort_marker', 'viewer']::text[]
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert outcomes in their own school"
  on public.outcomes
  for insert
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update outcomes in their own school"
  on public.outcomes
  for update
  using (public.is_system_admin(school_id))
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can delete outcomes in their own school"
  on public.outcomes
  for delete
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "assigned users can select classes"
  on public.classes
  for select
  using (
    public.is_system_admin(school_id)
    or public.has_subject_role(
      subject_instance_id,
      array['subject_moderator', 'assessment_owner', 'teacher', 'cohort_marker', 'viewer']::text[]
    )
    or public.has_class_role(id, array['class_teacher', 'class_viewer']::text[])
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert classes in their own school"
  on public.classes
  for insert
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update classes in their own school"
  on public.classes
  for update
  using (public.is_system_admin(school_id))
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can delete classes in their own school"
  on public.classes
  for delete
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "assigned users can select students"
  on public.students
  for select
  using (
    public.is_system_admin(school_id)
    or exists (
      select 1
      from public.class_enrolments ce
      join public.classes c
        on c.id = ce.class_id
      where ce.student_id = students.id
        and ce.school_id = public.current_school_id()
        and c.school_id = public.current_school_id()
        and (
          public.has_subject_role(
            c.subject_instance_id,
            array['subject_moderator', 'assessment_owner', 'teacher', 'cohort_marker', 'viewer']::text[]
          )
          or public.has_class_role(c.id, array['class_teacher', 'class_viewer']::text[])
        )
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert students in their own school"
  on public.students
  for insert
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update students in their own school"
  on public.students
  for update
  using (public.is_system_admin(school_id))
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can delete students in their own school"
  on public.students
  for delete
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "assigned users can select class enrolments"
  on public.class_enrolments
  for select
  using (
    public.is_system_admin(school_id)
    or exists (
      select 1
      from public.classes c
      where c.id = class_enrolments.class_id
        and c.school_id = public.current_school_id()
        and (
          public.has_subject_role(
            c.subject_instance_id,
            array['subject_moderator', 'assessment_owner', 'teacher', 'cohort_marker', 'viewer']::text[]
          )
          or public.has_class_role(c.id, array['class_teacher', 'class_viewer']::text[])
        )
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert class enrolments in their own school"
  on public.class_enrolments
  for insert
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update class enrolments in their own school"
  on public.class_enrolments
  for update
  using (public.is_system_admin(school_id))
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can delete class enrolments in their own school"
  on public.class_enrolments
  for delete
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "assigned users can select subject roles"
  on public.user_subject_roles
  for select
  using (
    public.is_system_admin(school_id)
    or profile_id = public.current_profile_id()
    or public.has_subject_role(subject_instance_id, array['subject_moderator']::text[])
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert subject roles in their own school"
  on public.user_subject_roles
  for insert
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update subject roles in their own school"
  on public.user_subject_roles
  for update
  using (public.is_system_admin(school_id))
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can delete subject roles in their own school"
  on public.user_subject_roles
  for delete
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "assigned users can select class roles"
  on public.user_class_roles
  for select
  using (
    public.is_system_admin(school_id)
    or profile_id = public.current_profile_id()
    or public.has_class_role(class_id, array['class_teacher']::text[])
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert class roles in their own school"
  on public.user_class_roles
  for insert
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update class roles in their own school"
  on public.user_class_roles
  for update
  using (public.is_system_admin(school_id))
  with check (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can delete class roles in their own school"
  on public.user_class_roles
  for delete
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "assigned users can select tasks"
  on public.tasks
  for select
  using (
    public.is_system_admin(school_id)
    or public.has_subject_role(
      subject_instance_id,
      array['subject_moderator', 'assessment_owner', 'teacher', 'cohort_marker', 'viewer']::text[]
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert tasks in their own school"
  on public.tasks
  for insert
  with check (
    public.is_system_admin(school_id)
    and exists (
      select 1
      from public.subject_instances si
      where si.id = tasks.subject_instance_id
        and si.school_id = tasks.school_id
    )
    and (
      unit_id is null
      or exists (
        select 1
        from public.units u
        where u.id = tasks.unit_id
          and u.school_id = tasks.school_id
          and u.subject_instance_id = tasks.subject_instance_id
      )
    )
    and (
      outcome_id is null
      or exists (
        select 1
        from public.outcomes o
        where o.id = tasks.outcome_id
          and o.school_id = tasks.school_id
          and o.subject_instance_id = tasks.subject_instance_id
          and (
            tasks.unit_id is null
            or o.unit_id = tasks.unit_id
          )
      )
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update tasks in their own school"
  on public.tasks
  for update
  using (public.is_system_admin(school_id))
  with check (
    public.is_system_admin(school_id)
    and exists (
      select 1
      from public.subject_instances si
      where si.id = tasks.subject_instance_id
        and si.school_id = tasks.school_id
    )
    and (
      unit_id is null
      or exists (
        select 1
        from public.units u
        where u.id = tasks.unit_id
          and u.school_id = tasks.school_id
          and u.subject_instance_id = tasks.subject_instance_id
      )
    )
    and (
      outcome_id is null
      or exists (
        select 1
        from public.outcomes o
        where o.id = tasks.outcome_id
          and o.school_id = tasks.school_id
          and o.subject_instance_id = tasks.subject_instance_id
          and (
            tasks.unit_id is null
            or o.unit_id = tasks.unit_id
          )
      )
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can delete tasks in their own school"
  on public.tasks
  for delete
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "assigned users can select task scoring rules"
  on public.task_scoring_rules
  for select
  using (
    public.is_system_admin(school_id)
    or exists (
      select 1
      from public.tasks t
      where t.id = task_scoring_rules.task_id
        and t.school_id = task_scoring_rules.school_id
        and t.school_id = public.current_school_id()
        and public.has_subject_role(
          t.subject_instance_id,
          array['subject_moderator', 'assessment_owner', 'teacher', 'cohort_marker', 'viewer']::text[]
        )
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert task scoring rules in their own school"
  on public.task_scoring_rules
  for insert
  with check (
    public.is_system_admin(school_id)
    and exists (
      select 1
      from public.tasks t
      where t.id = task_scoring_rules.task_id
        and t.school_id = task_scoring_rules.school_id
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update task scoring rules in their own school"
  on public.task_scoring_rules
  for update
  using (public.is_system_admin(school_id))
  with check (
    public.is_system_admin(school_id)
    and exists (
      select 1
      from public.tasks t
      where t.id = task_scoring_rules.task_id
        and t.school_id = task_scoring_rules.school_id
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can delete task scoring rules in their own school"
  on public.task_scoring_rules
  for delete
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "assigned users can select task moderation rules"
  on public.task_moderation_rules
  for select
  using (
    public.is_system_admin(school_id)
    or exists (
      select 1
      from public.tasks t
      where t.id = task_moderation_rules.task_id
        and t.school_id = task_moderation_rules.school_id
        and t.school_id = public.current_school_id()
        and public.has_subject_role(
          t.subject_instance_id,
          array['subject_moderator', 'assessment_owner', 'teacher', 'cohort_marker', 'viewer']::text[]
        )
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can insert task moderation rules in their own school"
  on public.task_moderation_rules
  for insert
  with check (
    public.is_system_admin(school_id)
    and exists (
      select 1
      from public.tasks t
      where t.id = task_moderation_rules.task_id
        and t.school_id = task_moderation_rules.school_id
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can update task moderation rules in their own school"
  on public.task_moderation_rules
  for update
  using (public.is_system_admin(school_id))
  with check (
    public.is_system_admin(school_id)
    and exists (
      select 1
      from public.tasks t
      where t.id = task_moderation_rules.task_id
        and t.school_id = task_moderation_rules.school_id
    )
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "system admins can delete task moderation rules in their own school"
  on public.task_moderation_rules
  for delete
  using (public.is_system_admin(school_id));
exception when duplicate_object then null;
end $$;

-- Optional bootstrap section.
-- 1. Find your Supabase Auth user id in Dashboard > Authentication > Users,
--    or run this in SQL Editor and copy the id:
--      select id, email from auth.users order by created_at desc;
-- 2. Uncomment the block below.
-- 3. Replace <AUTH_USER_ID_HERE>, <ADMIN_EMAIL_HERE> and <ADMIN_NAME_HERE>.
--
-- do $$
-- declare
--   target_school_id uuid;
--   target_profile_id uuid;
-- begin
--   select id into target_school_id
--   from public.schools
--   where name = 'Cohort Studio School'
--   order by created_at asc
--   limit 1;
--
--   if target_school_id is null then
--     insert into public.schools (name, status)
--     values ('Cohort Studio School', 'active')
--     returning id into target_school_id;
--   end if;
--
--   select id into target_profile_id
--   from public.profiles
--   where auth_user_id = '<AUTH_USER_ID_HERE>'::uuid
--   limit 1;
--
--   if target_profile_id is null then
--     insert into public.profiles (
--       school_id,
--       auth_user_id,
--       display_name,
--       email,
--       status
--     )
--     values (
--       target_school_id,
--       '<AUTH_USER_ID_HERE>'::uuid,
--       '<ADMIN_NAME_HERE>',
--       '<ADMIN_EMAIL_HERE>',
--       'active'
--     )
--     returning id into target_profile_id;
--   else
--     update public.profiles
--     set
--       school_id = target_school_id,
--       display_name = '<ADMIN_NAME_HERE>',
--       email = '<ADMIN_EMAIL_HERE>',
--       status = 'active'
--     where id = target_profile_id;
--   end if;
--
--   insert into public.user_global_roles (
--     school_id,
--     profile_id,
--     role,
--     assigned_by
--   )
--   values (
--     target_school_id,
--     target_profile_id,
--     'system_admin',
--     target_profile_id
--   )
--   on conflict (school_id, profile_id, role) do nothing;
-- end $$;
