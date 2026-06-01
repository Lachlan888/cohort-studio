# Cohort Studio

Assessment moderation, rubrics and cohort analysis for schools.

## Summary

Cohort Studio is a subject-level assessment operations and analysis tool for schools. It helps subject teams create assessment tasks, assign classes and markers, collect marks, manage moderation, finalise results, export data and analyse cohort performance.

## Product boundaries

Cohort Studio is:

- a subject-level assessment operations tool
- a moderation workflow tool
- a rubric and results analysis tool
- an export and reporting support tool

Cohort Studio is not:

- a full LMS
- a student learning platform, at least for MVP
- a replacement for official reporting systems
- a generic spreadsheet
- an AI marking product

## Core product thesis

Moderators configure and control the assessment system. Teachers work inside the configured system. The app stores the evidence, decisions and data.

## MVP workflow

The intended first complete workflow is:

1. Create subject/year
2. Create classes
3. Import students
4. Create or clone task
5. Attach scoring rules and, later, rubrics
6. Assign task to classes
7. Assign Marker 1 and Marker 2
8. Teachers submit marks
9. App checks variance
10. High-variance cases require a third marker
11. Moderator finalises results
12. App supports export and basic analysis

## Build phases

The intended build order is:

- Phase 0: project foundation
- Phase 1: people, roles and access
- Phase 2: subject, year, class and student setup
- Phase 3: student import
- Phase 4: task setup
- Phase 5: numeric marking
- Phase 6: variance checking and moderation case creation
- Phase 7: third-marker workflow
- Phase 8: final results and task finalisation
- Phase 9: basic exports
- Later: analytics, rubrics, templates, historical comparison

Future phases should not be mixed into early phases without deliberate decision.

## Intended route map

Likely route structure:

- /
- /subjects
- /subjects/new
- /subjects/[subjectId]
- /subjects/[subjectId]/classes
- /subjects/[subjectId]/students
- /subjects/[subjectId]/tasks
- /tasks/[taskId]
- /tasks/[taskId]/setup
- /tasks/[taskId]/marking
- /tasks/[taskId]/moderation
- /tasks/[taskId]/results
- /moderation
- /moderation/[caseId]
- /rubrics
- /analysis
- /exports
- /people
- /settings
- /archive

These routes should be added incrementally, not all at once.

## Architecture principles

- Routes load data.
- Components display and collect input.
- Server actions change state.
- Permission helpers decide what actions are allowed.
- Supabase RLS protects rows.
- Audit logs record sensitive changes.
- Do not rely on hiding buttons in the UI for security.
- Keep setup objects, workflow records, marker scores and final results separate.
- Avoid giant page files.
- Avoid duplicate versions of the same table/card/form.
- Prefer reusable domain components over one mega-component.

## Current database foundation

The implemented Phase 0 database foundation creates:

- schools
- profiles
- user_global_roles
- audit_events

The app is designed with a school boundary from day one. Profiles are app-level staff records linked to Supabase Auth via nullable auth_user_id. Global roles are stored separately from profiles, and audit_events provides the generic audit trail foundation.

Subject, class, student, task, marking, moderation, rubric, import/export and analytics tables are intentionally deferred.

## Data model direction

Intended core entities:

- schools
- profiles
- academic_years
- subjects
- subject_instances
- units
- outcomes
- classes
- students
- class_enrolments
- tasks
- task_scoring_rules
- task_moderation_rules
- task_assignments
- student_task_records
- task_marker_assignments
- marker_scores
- moderation_cases
- final_results
- rubrics
- rubric_versions
- grade_scales
- imports
- exports
- audit_events

Core model:

School → academic years → subject instances → classes/students → tasks → student task records → marker scores/moderation cases/final results.

## Workflow state principles

The app should use explicit workflow states rather than scattered booleans.

Intended task states:

- draft
- ready
- marking_open
- marking_closed
- moderation
- ready_to_finalise
- finalised
- locked
- archived

Intended student task record states:

- not_started
- partially_marked
- ready_for_variance_check
- within_tolerance
- third_marker_required
- awaiting_third_marker
- third_marker_submitted
- ready_to_finalise
- finalised
- locked

Administrative status should be separate from workflow status, for example:

- absent
- medical_certificate_received
- resit_required
- resit_completed
- exempt
- withdrawn
- zero_after_process
- not_assessable

## Role and permissions principles

The app should use a layered role model:

- global roles
- subject-specific roles
- class-specific roles
- task-specific marker assignments
- moderation-case assignments

Core roles:

- system admin
- subject moderator
- assessment owner
- teacher / marker
- third marker
- read-only viewer

A single profile.role field is not enough.

## Moderation rules

Basic moderation model:

- Marker 1 and Marker 2 submit independent scores.
- The app calculates absolute variance.
- If variance is within the task threshold, the record can move toward finalisation.
- If variance exceeds the threshold, the app creates a moderation case.
- A third marker submits a separate score and note.
- The moderator finalises the result.
- Original M1 and M2 scores must be preserved as evidence, not overwritten.

## Analytics principles

Analytics should:

- use final_results by default
- clearly label preliminary data
- show inclusion and exclusion notes
- distinguish pending, exempt, withdrawn, resit and zero-after-process records
- compare like with like
- show sample sizes for class/cohort comparisons

## Design direction

Visual direction should be:

- calm authority
- school-grade trust
- data clarity
- low-friction workflow
- not playful edtech
- not spreadsheet cosplay
- not corporate sludge

The design system should eventually live in:

- app/globals.css
- components/ui
- components/layout
- components/design-system
- lib/design/tokens.ts
- lib/design/status-styles.ts
- lib/design/navigation.ts

## Development workflow

Local workflow:

- npm run dev
- npm run build
- git add .
- git commit -m "message"
- git push

Local helper command:

- cship "commit message"

This should build first, then commit and push only if the build passes.

## Codex contribution rules

For future Codex passes:

- Work in one bounded pass at a time.
- State intended file changes before editing.
- Do not add future-phase features.
- Do not edit unrelated files.
- Do not add dependencies unless explicitly requested.
- Do not create database/schema/auth/RLS code unless the prompt asks for it.
- Run npm run build before considering the pass complete.
- Summarise exactly what changed.
- Keep product language and architecture aligned with this README.
