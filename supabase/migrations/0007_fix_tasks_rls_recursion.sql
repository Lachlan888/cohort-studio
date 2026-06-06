-- Fix recursive RLS introduced by marker-scoped task access policies.
-- Marker access checks need to look through task_marker_assignments without
-- re-entering the tasks policy graph.

create function public.has_active_task_marker_assignment(
  target_task_id uuid,
  target_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_marker_assignments tma
    where tma.task_id = target_task_id
      and tma.school_id = target_school_id
      and tma.marker_profile_id = public.current_profile_id()
      and tma.status = 'active'
  );
$$;

create function public.has_active_task_marker_assignment_for_subject_instance(
  target_subject_instance_id uuid,
  target_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    join public.task_marker_assignments tma
      on tma.task_id = t.id
     and tma.school_id = t.school_id
     and tma.marker_profile_id = public.current_profile_id()
     and tma.status = 'active'
    where t.subject_instance_id = target_subject_instance_id
      and t.school_id = target_school_id
  );
$$;

create function public.has_active_task_marker_assignment_for_class(
  target_class_id uuid,
  target_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_marker_assignments tma
    where tma.class_id = target_class_id
      and tma.school_id = target_school_id
      and tma.marker_profile_id = public.current_profile_id()
      and tma.status = 'active'
  );
$$;

create function public.has_active_task_marker_assignment_for_student(
  target_student_id uuid,
  target_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.student_task_records str
    join public.task_marker_assignments tma
      on tma.task_id = str.task_id
     and tma.class_id = str.class_id
     and tma.school_id = str.school_id
     and tma.marker_profile_id = public.current_profile_id()
     and tma.status = 'active'
    where str.student_id = target_student_id
      and str.school_id = target_school_id
  );
$$;

drop policy if exists "assigned task markers can select subject instances for marking"
on public.subject_instances;

drop policy if exists "assigned task markers can select tasks for marking"
on public.tasks;

drop policy if exists "assigned task markers can select task scoring rules for marking"
on public.task_scoring_rules;

drop policy if exists "assigned task markers can select classes for marking"
on public.classes;

drop policy if exists "assigned task markers can select students for marking"
on public.students;

create policy "assigned task markers can select subject instances for marking"
on public.subject_instances
for select
using (
  school_id = public.current_school_id()
  and public.has_active_task_marker_assignment_for_subject_instance(id, school_id)
);

create policy "assigned task markers can select tasks for marking"
on public.tasks
for select
using (
  school_id = public.current_school_id()
  and public.has_active_task_marker_assignment(id, school_id)
);

create policy "assigned task markers can select task scoring rules for marking"
on public.task_scoring_rules
for select
using (
  school_id = public.current_school_id()
  and public.has_active_task_marker_assignment(task_id, school_id)
);

create policy "assigned task markers can select classes for marking"
on public.classes
for select
using (
  school_id = public.current_school_id()
  and public.has_active_task_marker_assignment_for_class(id, school_id)
);

create policy "assigned task markers can select students for marking"
on public.students
for select
using (
  school_id = public.current_school_id()
  and public.has_active_task_marker_assignment_for_student(id, school_id)
);
