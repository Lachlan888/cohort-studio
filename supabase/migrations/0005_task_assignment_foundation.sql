-- Cohort Studio Phase 4 task assignment and publication foundation.
-- Score entry, moderation cases, finalisation, rubrics, exports and analytics
-- are intentionally deferred.

create table public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  status text not null default 'active',
  assigned_by uuid references public.profiles(id) on delete set null,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_assignments_status_check check (status in ('active', 'removed'))
);

comment on table public.task_assignments is 'Class-level task assignment records.';

create table public.task_marker_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  marker_profile_id uuid not null references public.profiles(id) on delete restrict,
  marker_role text not null,
  status text not null default 'active',
  assigned_by uuid references public.profiles(id) on delete set null,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_marker_assignments_marker_role_check check (
    marker_role in ('marker_1', 'marker_2')
  ),
  constraint task_marker_assignments_status_check check (status in ('active', 'removed'))
);

comment on table public.task_marker_assignments is 'Class-level Marker 1 and Marker 2 assignments for a task.';

create table public.student_task_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  status text not null default 'not_started',
  administrative_status text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_task_records_task_id_student_id_key unique (task_id, student_id),
  constraint student_task_records_status_check check (
    status in ('not_started', 'in_progress', 'submitted', 'finalised', 'archived')
  ),
  constraint student_task_records_administrative_status_check check (
    administrative_status in ('none', 'absent', 'exempt', 'withdrawn')
  )
);

comment on table public.student_task_records is 'Per-student task workflow records generated from active class enrolments.';
comment on column public.student_task_records.class_id is 'Class context preserved at the time the task record is generated.';

create trigger set_task_assignments_updated_at
before update on public.task_assignments
for each row
execute function public.set_updated_at();

create trigger set_task_marker_assignments_updated_at
before update on public.task_marker_assignments
for each row
execute function public.set_updated_at();

create trigger set_student_task_records_updated_at
before update on public.student_task_records
for each row
execute function public.set_updated_at();

create unique index task_assignments_active_task_class_key
on public.task_assignments(task_id, class_id)
where status = 'active';

create unique index task_marker_assignments_active_task_class_role_key
on public.task_marker_assignments(task_id, class_id, marker_role)
where status = 'active';

create unique index task_marker_assignments_active_task_class_profile_key
on public.task_marker_assignments(task_id, class_id, marker_profile_id)
where status = 'active';

create index task_assignments_school_id_idx on public.task_assignments(school_id);
create index task_assignments_task_id_idx on public.task_assignments(task_id);
create index task_assignments_class_id_idx on public.task_assignments(class_id);
create index task_marker_assignments_school_id_idx on public.task_marker_assignments(school_id);
create index task_marker_assignments_task_id_idx on public.task_marker_assignments(task_id);
create index task_marker_assignments_class_id_idx on public.task_marker_assignments(class_id);
create index task_marker_assignments_marker_profile_id_idx on public.task_marker_assignments(marker_profile_id);
create index student_task_records_school_id_idx on public.student_task_records(school_id);
create index student_task_records_task_id_idx on public.student_task_records(task_id);
create index student_task_records_student_id_idx on public.student_task_records(student_id);
create index student_task_records_class_id_idx on public.student_task_records(class_id);

alter table public.task_assignments enable row level security;
alter table public.task_marker_assignments enable row level security;
alter table public.student_task_records enable row level security;

create policy "assigned users can select task assignments"
on public.task_assignments
for select
using (
  public.is_system_admin(school_id)
  or exists (
    select 1
    from public.tasks t
    join public.classes c
      on c.id = task_assignments.class_id
    where t.id = task_assignments.task_id
      and t.school_id = task_assignments.school_id
      and c.school_id = task_assignments.school_id
      and c.subject_instance_id = t.subject_instance_id
      and task_assignments.school_id = public.current_school_id()
      and (
        public.has_subject_role(
          t.subject_instance_id,
          array['subject_moderator', 'assessment_owner', 'teacher', 'cohort_marker', 'viewer']::text[]
        )
        or public.has_class_role(c.id, array['class_teacher', 'class_viewer']::text[])
      )
  )
);

create policy "system admins can insert task assignments in their own school"
on public.task_assignments
for insert
with check (
  public.is_system_admin(school_id)
  and exists (
    select 1
    from public.tasks t
    join public.classes c
      on c.id = task_assignments.class_id
    where t.id = task_assignments.task_id
      and t.school_id = task_assignments.school_id
      and c.school_id = task_assignments.school_id
      and c.subject_instance_id = t.subject_instance_id
  )
);

create policy "system admins can update task assignments in their own school"
on public.task_assignments
for update
using (public.is_system_admin(school_id))
with check (
  public.is_system_admin(school_id)
  and exists (
    select 1
    from public.tasks t
    join public.classes c
      on c.id = task_assignments.class_id
    where t.id = task_assignments.task_id
      and t.school_id = task_assignments.school_id
      and c.school_id = task_assignments.school_id
      and c.subject_instance_id = t.subject_instance_id
  )
);

create policy "system admins can delete task assignments in their own school"
on public.task_assignments
for delete
using (public.is_system_admin(school_id));

create policy "assigned users can select task marker assignments"
on public.task_marker_assignments
for select
using (
  public.is_system_admin(school_id)
  or marker_profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.tasks t
    join public.classes c
      on c.id = task_marker_assignments.class_id
    where t.id = task_marker_assignments.task_id
      and t.school_id = task_marker_assignments.school_id
      and c.school_id = task_marker_assignments.school_id
      and c.subject_instance_id = t.subject_instance_id
      and task_marker_assignments.school_id = public.current_school_id()
      and (
        public.has_subject_role(
          t.subject_instance_id,
          array['subject_moderator', 'assessment_owner', 'teacher', 'cohort_marker', 'viewer']::text[]
        )
        or public.has_class_role(c.id, array['class_teacher', 'class_viewer']::text[])
      )
  )
);

create policy "system admins can insert task marker assignments in their own school"
on public.task_marker_assignments
for insert
with check (
  public.is_system_admin(school_id)
  and exists (
    select 1
    from public.tasks t
    join public.classes c
      on c.id = task_marker_assignments.class_id
    join public.profiles p
      on p.id = task_marker_assignments.marker_profile_id
    where t.id = task_marker_assignments.task_id
      and t.school_id = task_marker_assignments.school_id
      and c.school_id = task_marker_assignments.school_id
      and p.school_id = task_marker_assignments.school_id
      and p.status = 'active'
      and c.subject_instance_id = t.subject_instance_id
  )
);

create policy "system admins can update task marker assignments in their own school"
on public.task_marker_assignments
for update
using (public.is_system_admin(school_id))
with check (
  public.is_system_admin(school_id)
  and exists (
    select 1
    from public.tasks t
    join public.classes c
      on c.id = task_marker_assignments.class_id
    join public.profiles p
      on p.id = task_marker_assignments.marker_profile_id
    where t.id = task_marker_assignments.task_id
      and t.school_id = task_marker_assignments.school_id
      and c.school_id = task_marker_assignments.school_id
      and p.school_id = task_marker_assignments.school_id
      and p.status = 'active'
      and c.subject_instance_id = t.subject_instance_id
  )
);

create policy "system admins can delete task marker assignments in their own school"
on public.task_marker_assignments
for delete
using (public.is_system_admin(school_id));

create policy "assigned users can select student task records"
on public.student_task_records
for select
using (
  public.is_system_admin(school_id)
  or exists (
    select 1
    from public.tasks t
    join public.classes c
      on c.id = student_task_records.class_id
    where t.id = student_task_records.task_id
      and t.school_id = student_task_records.school_id
      and c.school_id = student_task_records.school_id
      and c.subject_instance_id = t.subject_instance_id
      and student_task_records.school_id = public.current_school_id()
      and (
        public.has_subject_role(
          t.subject_instance_id,
          array['subject_moderator', 'assessment_owner', 'teacher', 'cohort_marker', 'viewer']::text[]
        )
        or public.has_class_role(c.id, array['class_teacher', 'class_viewer']::text[])
        or exists (
          select 1
          from public.task_marker_assignments tma
          where tma.task_id = student_task_records.task_id
            and tma.class_id = student_task_records.class_id
            and tma.school_id = student_task_records.school_id
            and tma.marker_profile_id = public.current_profile_id()
            and tma.status = 'active'
        )
      )
  )
);

create policy "system admins can insert student task records in their own school"
on public.student_task_records
for insert
with check (
  public.is_system_admin(school_id)
  and exists (
    select 1
    from public.tasks t
    join public.classes c
      on c.id = student_task_records.class_id
    join public.students s
      on s.id = student_task_records.student_id
    where t.id = student_task_records.task_id
      and t.school_id = student_task_records.school_id
      and c.school_id = student_task_records.school_id
      and s.school_id = student_task_records.school_id
      and c.subject_instance_id = t.subject_instance_id
  )
);

create policy "system admins can update student task records in their own school"
on public.student_task_records
for update
using (public.is_system_admin(school_id))
with check (
  public.is_system_admin(school_id)
  and exists (
    select 1
    from public.tasks t
    join public.classes c
      on c.id = student_task_records.class_id
    join public.students s
      on s.id = student_task_records.student_id
    where t.id = student_task_records.task_id
      and t.school_id = student_task_records.school_id
      and c.school_id = student_task_records.school_id
      and s.school_id = student_task_records.school_id
      and c.subject_instance_id = t.subject_instance_id
  )
);

create policy "system admins can delete student task records in their own school"
on public.student_task_records
for delete
using (public.is_system_admin(school_id));
