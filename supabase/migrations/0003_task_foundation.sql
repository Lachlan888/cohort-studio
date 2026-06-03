-- Cohort Studio Phase 4 task setup foundation.
-- Task UI, class assignment, student task records, marking, moderation, rubrics,
-- import/export and analytics workflows are intentionally deferred.

create table public.tasks (
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
  updated_at timestamptz not null default now(),
  constraint tasks_name_not_blank_check check (btrim(name) <> ''),
  constraint tasks_task_type_not_blank_check check (btrim(task_type) <> ''),
  constraint tasks_status_check check (
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
  )
);

comment on table public.tasks is 'Assessment task setup records inside a subject instance.';
comment on column public.tasks.task_type is 'MVP task type. Numeric task setup UI will initially use assessment.';
comment on column public.tasks.status is 'Workflow status for task setup and marking lifecycle.';

create table public.task_scoring_rules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  score_type text not null default 'numeric',
  max_score numeric not null,
  display_max_score numeric not null,
  pass_threshold numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_scoring_rules_task_id_key unique (task_id),
  constraint task_scoring_rules_score_type_check check (score_type in ('numeric')),
  constraint task_scoring_rules_max_score_check check (max_score > 0),
  constraint task_scoring_rules_display_max_score_check check (display_max_score > 0),
  constraint task_scoring_rules_pass_threshold_check check (
    pass_threshold is null
    or pass_threshold >= 0
  )
);

comment on table public.task_scoring_rules is 'Numeric scoring rule foundation for assessment tasks.';

create table public.task_moderation_rules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  required_initial_markers integer not null default 2,
  variance_threshold numeric not null,
  moderation_pathway text not null default 'third_marker_required',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_moderation_rules_task_id_key unique (task_id),
  constraint task_moderation_rules_required_initial_markers_check check (required_initial_markers >= 1),
  constraint task_moderation_rules_variance_threshold_check check (variance_threshold >= 0),
  constraint task_moderation_rules_moderation_pathway_check check (
    moderation_pathway in (
      'third_marker_required',
      'manual_review',
      'within_tolerance_only'
    )
  )
);

comment on table public.task_moderation_rules is 'Moderation threshold settings for assessment tasks.';

create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

create trigger set_task_scoring_rules_updated_at
before update on public.task_scoring_rules
for each row
execute function public.set_updated_at();

create trigger set_task_moderation_rules_updated_at
before update on public.task_moderation_rules
for each row
execute function public.set_updated_at();

create unique index tasks_school_subject_instance_lower_name_key
on public.tasks(school_id, subject_instance_id, lower(btrim(name)));

create index tasks_school_id_idx on public.tasks(school_id);
create index tasks_subject_instance_id_idx on public.tasks(subject_instance_id);
create index tasks_status_idx on public.tasks(status);
create index tasks_unit_id_idx on public.tasks(unit_id);
create index tasks_outcome_id_idx on public.tasks(outcome_id);
create index task_scoring_rules_school_id_idx on public.task_scoring_rules(school_id);
create index task_scoring_rules_task_id_idx on public.task_scoring_rules(task_id);
create index task_moderation_rules_school_id_idx on public.task_moderation_rules(school_id);
create index task_moderation_rules_task_id_idx on public.task_moderation_rules(task_id);

alter table public.tasks enable row level security;
alter table public.task_scoring_rules enable row level security;
alter table public.task_moderation_rules enable row level security;

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

create policy "system admins can delete tasks in their own school"
on public.tasks
for delete
using (public.is_system_admin(school_id));

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

create policy "system admins can delete task scoring rules in their own school"
on public.task_scoring_rules
for delete
using (public.is_system_admin(school_id));

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

create policy "system admins can delete task moderation rules in their own school"
on public.task_moderation_rules
for delete
using (public.is_system_admin(school_id));
