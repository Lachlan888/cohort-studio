-- Cohort Studio Phase 2 subject/class/student foundation.
-- Task, marking, moderation, rubric, import/export and analytics tables are intentionally deferred.

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  year integer not null,
  label text not null,
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_years_school_id_year_key unique (school_id, year),
  constraint academic_years_status_check check (status in ('active', 'archived'))
);

comment on table public.academic_years is 'School academic years for subject and class setup.';

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  subject_type text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_status_check check (status in ('active', 'archived'))
);

comment on table public.subjects is 'School-level subject catalogue.';

create table public.subject_instances (
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
  updated_at timestamptz not null default now(),
  constraint subject_instances_school_subject_year_key unique (school_id, subject_id, academic_year_id),
  constraint subject_instances_status_check check (status in ('draft', 'active', 'archived'))
);

comment on table public.subject_instances is 'A school subject delivered in a specific academic year.';
comment on column public.subject_instances.source_template_version_id is 'Nullable until template tables are introduced.';

create table public.units (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  subject_instance_id uuid not null references public.subject_instances(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint units_subject_instance_id_name_key unique (subject_instance_id, name),
  constraint units_status_check check (status in ('active', 'archived'))
);

comment on table public.units is 'Unit, semester or section structure inside a subject instance.';

create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  subject_instance_id uuid not null references public.subject_instances(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outcomes_unit_id_name_key unique (unit_id, name),
  constraint outcomes_status_check check (status in ('active', 'archived'))
);

comment on table public.outcomes is 'Outcome, Area of Study or local outcome structure inside a unit.';

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  subject_instance_id uuid not null references public.subject_instances(id) on delete cascade,
  name text not null,
  primary_teacher_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_subject_instance_id_name_key unique (subject_instance_id, name),
  constraint classes_status_check check (status in ('active', 'archived'))
);

comment on table public.classes is 'Teaching groups inside a subject instance.';

create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  first_name text not null,
  surname text not null,
  preferred_name text,
  student_code text,
  email text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_status_check check (status in ('active', 'inactive', 'archived'))
);

comment on table public.students is 'School-level student identity, separate from class membership.';

create table public.class_enrolments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'active',
  enrolled_at date,
  left_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_enrolments_class_id_student_id_key unique (class_id, student_id),
  constraint class_enrolments_status_check check (status in ('active', 'moved', 'withdrawn', 'archived'))
);

comment on table public.class_enrolments is 'Student membership in classes, separate from student identity.';

create table public.user_subject_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  subject_instance_id uuid not null references public.subject_instances(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_subject_roles_subject_profile_role_key unique (subject_instance_id, profile_id, role),
  constraint user_subject_roles_role_check check (
    role in ('subject_moderator', 'assessment_owner', 'teacher', 'cohort_marker', 'viewer')
  )
);

comment on table public.user_subject_roles is 'Subject-instance scoped staff roles.';

create table public.user_class_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_class_roles_class_profile_role_key unique (class_id, profile_id, role),
  constraint user_class_roles_role_check check (
    role in ('class_teacher', 'class_viewer')
  )
);

comment on table public.user_class_roles is 'Class-scoped staff roles.';

create trigger set_academic_years_updated_at
before update on public.academic_years
for each row
execute function public.set_updated_at();

create trigger set_subjects_updated_at
before update on public.subjects
for each row
execute function public.set_updated_at();

create trigger set_subject_instances_updated_at
before update on public.subject_instances
for each row
execute function public.set_updated_at();

create trigger set_units_updated_at
before update on public.units
for each row
execute function public.set_updated_at();

create trigger set_outcomes_updated_at
before update on public.outcomes
for each row
execute function public.set_updated_at();

create trigger set_classes_updated_at
before update on public.classes
for each row
execute function public.set_updated_at();

create trigger set_students_updated_at
before update on public.students
for each row
execute function public.set_updated_at();

create trigger set_class_enrolments_updated_at
before update on public.class_enrolments
for each row
execute function public.set_updated_at();

create trigger set_user_subject_roles_updated_at
before update on public.user_subject_roles
for each row
execute function public.set_updated_at();

create trigger set_user_class_roles_updated_at
before update on public.user_class_roles
for each row
execute function public.set_updated_at();

create unique index subjects_school_id_lower_name_key
on public.subjects(school_id, lower(name));

create unique index students_school_id_student_code_key
on public.students(school_id, student_code)
where student_code is not null;

create index academic_years_school_id_idx on public.academic_years(school_id);
create index academic_years_school_id_year_idx on public.academic_years(school_id, year);
create index subjects_school_id_idx on public.subjects(school_id);
create index subjects_school_id_name_idx on public.subjects(school_id, name);
create index subject_instances_school_id_idx on public.subject_instances(school_id);
create index subject_instances_school_id_academic_year_id_idx on public.subject_instances(school_id, academic_year_id);
create index subject_instances_school_id_subject_id_idx on public.subject_instances(school_id, subject_id);
create index units_school_id_idx on public.units(school_id);
create index units_subject_instance_id_idx on public.units(subject_instance_id);
create index outcomes_school_id_idx on public.outcomes(school_id);
create index outcomes_unit_id_idx on public.outcomes(unit_id);
create index outcomes_subject_instance_id_idx on public.outcomes(subject_instance_id);
create index classes_school_id_idx on public.classes(school_id);
create index classes_subject_instance_id_idx on public.classes(subject_instance_id);
create index students_school_id_idx on public.students(school_id);
create index students_school_id_surname_first_name_idx on public.students(school_id, surname, first_name);
create index students_school_id_student_code_idx on public.students(school_id, student_code)
where student_code is not null;
create index class_enrolments_school_id_idx on public.class_enrolments(school_id);
create index class_enrolments_class_id_idx on public.class_enrolments(class_id);
create index class_enrolments_student_id_idx on public.class_enrolments(student_id);
create index user_subject_roles_school_id_idx on public.user_subject_roles(school_id);
create index user_subject_roles_profile_id_idx on public.user_subject_roles(profile_id);
create index user_subject_roles_subject_instance_id_idx on public.user_subject_roles(subject_instance_id);
create index user_class_roles_school_id_idx on public.user_class_roles(school_id);
create index user_class_roles_profile_id_idx on public.user_class_roles(profile_id);
create index user_class_roles_class_id_idx on public.user_class_roles(class_id);

create function public.has_subject_role(target_subject_instance_id uuid, allowed_roles text[])
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

create function public.has_class_role(target_class_id uuid, allowed_roles text[])
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

create policy "active users can select academic years in their own school"
on public.academic_years
for select
using (school_id = public.current_school_id());

create policy "system admins can insert academic years in their own school"
on public.academic_years
for insert
with check (public.is_system_admin(school_id));

create policy "system admins can update academic years in their own school"
on public.academic_years
for update
using (public.is_system_admin(school_id))
with check (public.is_system_admin(school_id));

create policy "system admins can delete academic years in their own school"
on public.academic_years
for delete
using (public.is_system_admin(school_id));

create policy "active users can select subjects in their own school"
on public.subjects
for select
using (school_id = public.current_school_id());

create policy "system admins can insert subjects in their own school"
on public.subjects
for insert
with check (public.is_system_admin(school_id));

create policy "system admins can update subjects in their own school"
on public.subjects
for update
using (public.is_system_admin(school_id))
with check (public.is_system_admin(school_id));

create policy "system admins can delete subjects in their own school"
on public.subjects
for delete
using (public.is_system_admin(school_id));

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

create policy "system admins can insert subject instances in their own school"
on public.subject_instances
for insert
with check (public.is_system_admin(school_id));

create policy "system admins can update subject instances in their own school"
on public.subject_instances
for update
using (public.is_system_admin(school_id))
with check (public.is_system_admin(school_id));

create policy "system admins can delete subject instances in their own school"
on public.subject_instances
for delete
using (public.is_system_admin(school_id));

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

create policy "system admins can insert units in their own school"
on public.units
for insert
with check (public.is_system_admin(school_id));

create policy "system admins can update units in their own school"
on public.units
for update
using (public.is_system_admin(school_id))
with check (public.is_system_admin(school_id));

create policy "system admins can delete units in their own school"
on public.units
for delete
using (public.is_system_admin(school_id));

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

create policy "system admins can insert outcomes in their own school"
on public.outcomes
for insert
with check (public.is_system_admin(school_id));

create policy "system admins can update outcomes in their own school"
on public.outcomes
for update
using (public.is_system_admin(school_id))
with check (public.is_system_admin(school_id));

create policy "system admins can delete outcomes in their own school"
on public.outcomes
for delete
using (public.is_system_admin(school_id));

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

create policy "system admins can insert classes in their own school"
on public.classes
for insert
with check (public.is_system_admin(school_id));

create policy "system admins can update classes in their own school"
on public.classes
for update
using (public.is_system_admin(school_id))
with check (public.is_system_admin(school_id));

create policy "system admins can delete classes in their own school"
on public.classes
for delete
using (public.is_system_admin(school_id));

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

create policy "system admins can insert students in their own school"
on public.students
for insert
with check (public.is_system_admin(school_id));

create policy "system admins can update students in their own school"
on public.students
for update
using (public.is_system_admin(school_id))
with check (public.is_system_admin(school_id));

create policy "system admins can delete students in their own school"
on public.students
for delete
using (public.is_system_admin(school_id));

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

create policy "system admins can insert class enrolments in their own school"
on public.class_enrolments
for insert
with check (public.is_system_admin(school_id));

create policy "system admins can update class enrolments in their own school"
on public.class_enrolments
for update
using (public.is_system_admin(school_id))
with check (public.is_system_admin(school_id));

create policy "system admins can delete class enrolments in their own school"
on public.class_enrolments
for delete
using (public.is_system_admin(school_id));

create policy "assigned users can select subject roles"
on public.user_subject_roles
for select
using (
  public.is_system_admin(school_id)
  or profile_id = public.current_profile_id()
  or public.has_subject_role(subject_instance_id, array['subject_moderator']::text[])
);

create policy "system admins can insert subject roles in their own school"
on public.user_subject_roles
for insert
with check (public.is_system_admin(school_id));

create policy "system admins can update subject roles in their own school"
on public.user_subject_roles
for update
using (public.is_system_admin(school_id))
with check (public.is_system_admin(school_id));

create policy "system admins can delete subject roles in their own school"
on public.user_subject_roles
for delete
using (public.is_system_admin(school_id));

create policy "assigned users can select class roles"
on public.user_class_roles
for select
using (
  public.is_system_admin(school_id)
  or profile_id = public.current_profile_id()
  or public.has_class_role(class_id, array['class_teacher']::text[])
);

create policy "system admins can insert class roles in their own school"
on public.user_class_roles
for insert
with check (public.is_system_admin(school_id));

create policy "system admins can update class roles in their own school"
on public.user_class_roles
for update
using (public.is_system_admin(school_id))
with check (public.is_system_admin(school_id));

create policy "system admins can delete class roles in their own school"
on public.user_class_roles
for delete
using (public.is_system_admin(school_id));
