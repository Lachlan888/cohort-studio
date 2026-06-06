-- Cohort Studio Phase 5 numeric marking foundation.
-- Variance checking, moderation cases, third-marker workflow, final results,
-- exports, analytics, rubrics, comments and file uploads are intentionally deferred.

create table public.marker_scores (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  student_task_record_id uuid not null references public.student_task_records(id) on delete cascade,
  marker_profile_id uuid not null references public.profiles(id) on delete restrict,
  marker_role text not null,
  score numeric,
  status text not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marker_scores_score_check check (score is null or score >= 0),
  constraint marker_scores_marker_role_check check (marker_role in ('marker_1', 'marker_2')),
  constraint marker_scores_status_check check (status in ('draft', 'submitted')),
  constraint marker_scores_student_record_role_key unique (student_task_record_id, marker_role)
);

comment on table public.marker_scores is 'Numeric marker-entered scores for student task records.';
comment on column public.marker_scores.marker_role is 'Initial marker role for this score: marker_1 or marker_2.';
comment on column public.marker_scores.status is 'Draft scores may be updated by the assigned marker. Submitted scores are locked in this foundation pass.';

create function public.prepare_marker_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  record_class_id uuid;
begin
  select str.class_id
  into record_class_id
  from public.student_task_records str
  where str.id = new.student_task_record_id
    and str.school_id = new.school_id
    and str.task_id = new.task_id;

  if record_class_id is null then
    raise exception 'marker score does not match a student task record in the same school and task';
  end if;

  if not exists (
    select 1
    from public.tasks t
    join public.classes c
      on c.id = record_class_id
    join public.task_marker_assignments tma
      on tma.task_id = new.task_id
     and tma.class_id = record_class_id
     and tma.school_id = new.school_id
     and tma.marker_profile_id = new.marker_profile_id
     and tma.marker_role = new.marker_role
     and tma.status = 'active'
    join public.profiles p
      on p.id = new.marker_profile_id
     and p.school_id = new.school_id
     and p.status = 'active'
    where t.id = new.task_id
      and t.school_id = new.school_id
      and c.school_id = new.school_id
      and c.subject_instance_id = t.subject_instance_id
  ) then
    raise exception 'marker score is not covered by an active marker assignment';
  end if;

  if new.status = 'submitted' and new.submitted_at is null then
    new.submitted_at = now();
  end if;

  if new.status = 'draft' then
    new.submitted_at = null;
  end if;

  return new;
end;
$$;

create trigger prepare_marker_score_before_insert_update
before insert or update on public.marker_scores
for each row
execute function public.prepare_marker_score();

create trigger set_marker_scores_updated_at
before update on public.marker_scores
for each row
execute function public.set_updated_at();

create index marker_scores_school_id_idx on public.marker_scores(school_id);
create index marker_scores_task_id_idx on public.marker_scores(task_id);
create index marker_scores_student_task_record_id_idx on public.marker_scores(student_task_record_id);
create index marker_scores_marker_profile_id_idx on public.marker_scores(marker_profile_id);
create index marker_scores_status_idx on public.marker_scores(status);

create policy "assigned task markers can select subject instances for marking"
on public.subject_instances
for select
using (
  school_id = public.current_school_id()
  and exists (
    select 1
    from public.tasks t
    join public.task_marker_assignments tma
      on tma.task_id = t.id
     and tma.school_id = t.school_id
     and tma.marker_profile_id = public.current_profile_id()
     and tma.status = 'active'
    where t.subject_instance_id = subject_instances.id
      and t.school_id = subject_instances.school_id
  )
);

create policy "assigned task markers can select tasks for marking"
on public.tasks
for select
using (
  school_id = public.current_school_id()
  and exists (
    select 1
    from public.task_marker_assignments tma
    where tma.task_id = tasks.id
      and tma.school_id = tasks.school_id
      and tma.marker_profile_id = public.current_profile_id()
      and tma.status = 'active'
  )
);

create policy "assigned task markers can select task scoring rules for marking"
on public.task_scoring_rules
for select
using (
  school_id = public.current_school_id()
  and exists (
    select 1
    from public.task_marker_assignments tma
    where tma.task_id = task_scoring_rules.task_id
      and tma.school_id = task_scoring_rules.school_id
      and tma.marker_profile_id = public.current_profile_id()
      and tma.status = 'active'
  )
);

create policy "assigned task markers can select classes for marking"
on public.classes
for select
using (
  school_id = public.current_school_id()
  and exists (
    select 1
    from public.task_marker_assignments tma
    where tma.class_id = classes.id
      and tma.school_id = classes.school_id
      and tma.marker_profile_id = public.current_profile_id()
      and tma.status = 'active'
  )
);

create policy "assigned task markers can select students for marking"
on public.students
for select
using (
  school_id = public.current_school_id()
  and exists (
    select 1
    from public.student_task_records str
    join public.task_marker_assignments tma
      on tma.task_id = str.task_id
     and tma.class_id = str.class_id
     and tma.school_id = str.school_id
     and tma.marker_profile_id = public.current_profile_id()
     and tma.status = 'active'
    where str.student_id = students.id
      and str.school_id = students.school_id
  )
);

create policy "active users can insert marker score audit events"
on public.audit_events
for insert
with check (
  school_id = public.current_school_id()
  and actor_profile_id = public.current_profile_id()
  and event_type in ('marker_score_draft_saved', 'marker_score_submitted')
  and entity_type = 'marker_score'
  and parent_entity_type = 'task'
);

alter table public.marker_scores enable row level security;

create policy "assigned markers can select their marker scores"
on public.marker_scores
for select
using (
  marker_profile_id = public.current_profile_id()
  and school_id = public.current_school_id()
);

create policy "system admins can select marker scores in their own school"
on public.marker_scores
for select
using (public.is_system_admin(school_id));

create policy "assigned markers can insert their draft marker scores"
on public.marker_scores
for insert
with check (
  marker_profile_id = public.current_profile_id()
  and school_id = public.current_school_id()
  and status = 'draft'
  and exists (
    select 1
    from public.student_task_records str
    join public.task_marker_assignments tma
      on tma.task_id = marker_scores.task_id
     and tma.class_id = str.class_id
     and tma.school_id = marker_scores.school_id
     and tma.marker_profile_id = marker_scores.marker_profile_id
     and tma.marker_role = marker_scores.marker_role
     and tma.status = 'active'
    where str.id = marker_scores.student_task_record_id
      and str.school_id = marker_scores.school_id
      and str.task_id = marker_scores.task_id
  )
);

create policy "assigned markers can update their draft marker scores"
on public.marker_scores
for update
using (
  marker_profile_id = public.current_profile_id()
  and school_id = public.current_school_id()
  and status = 'draft'
)
with check (
  marker_profile_id = public.current_profile_id()
  and school_id = public.current_school_id()
  and status in ('draft', 'submitted')
  and exists (
    select 1
    from public.student_task_records str
    join public.task_marker_assignments tma
      on tma.task_id = marker_scores.task_id
     and tma.class_id = str.class_id
     and tma.school_id = marker_scores.school_id
     and tma.marker_profile_id = marker_scores.marker_profile_id
     and tma.marker_role = marker_scores.marker_role
     and tma.status = 'active'
    where str.id = marker_scores.student_task_record_id
      and str.school_id = marker_scores.school_id
      and str.task_id = marker_scores.task_id
  )
);
