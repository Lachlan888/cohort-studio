-- Cohort Studio academic year simplification.
-- Academic years now use the numeric year field only.

alter table public.academic_years
drop column label;

comment on table public.academic_years is 'School academic years for subject and class setup. Uses the numeric year field for display.';
