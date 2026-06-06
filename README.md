# Cohort Studio

Assessment moderation, rubrics and cohort analysis for schools.

## Product positioning

Cohort Studio is an assessment moderation, rubrics and cohort analysis app for schools.

Public line:

- Assessment moderation, rubrics and cohort analysis for schools.

Product phrase:

- Build tasks. Moderate marks. Understand cohorts.

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
- a student-facing portal in the current MVP
- a replacement for official reporting systems
- a generic spreadsheet
- a spreadsheet clone
- an AI marking product

It is an internal assessment operations and moderation system.

## Core product thesis

Moderators configure and control the assessment system. Teachers work inside the configured system. The app stores the evidence, decisions and data.

## Current implementation status

The project currently has:

- Next.js App Router foundation
- TypeScript
- Tailwind-based static UI foundation
- reusable app shell layout
- Vercel deployment
- Supabase client/server helpers
- environment variable validation
- Supabase environment variables configured locally and in Vercel
- Phase 1 foundation database migration applied
- Phase 2 subject/class/student foundation migration added and applied
- Phase 4 task setup foundation migration added
- academic years simplified to the numeric `year` field only
- RLS enabled on foundation and subject/class/student tables
- RLS enabled on task setup foundation tables
- bootstrapped St Mary of the Angels school
- bootstrapped Lachlan Heycox `system_admin` profile
- login page
- logout route
- Supabase email/password sign-in
- current active profile lookup
- top bar profile display
- `/people` page loading real school-scoped profiles and global roles
- manual staff profile creation for `system_admin` users
- optional global role assignment during manual staff creation
- audit events for `profile_created`
- audit events for `global_role_assigned`
- `/subjects` page loading real school-scoped subject instances from Supabase in read-only mode
- subject overview, classes and students pages loading real school-scoped Supabase data in read-only mode
- admin-only subject creation UI
- admin-only subject structure management for classes, basic students and enrolments, units and outcomes
- admin-only pasted CSV student import for existing active subject classes, with row-level validation and partial valid-row commits
- task schema foundation for draft numeric task setup
- `/subjects/[subjectId]/tasks` page loading real subject-scoped task setup data from Supabase
- admin-only draft numeric task creation UI
- task assignment foundation for assigning draft tasks to active classes
- admin-only Marker 1 and Marker 2 assignment by task class
- admin-only task publishing that generates student task records from active class enrolments
- numeric marking foundation for assigned markers at `/tasks/[taskId]/marking`
- draft numeric score saving and submitted score locking for Marker 1 / Marker 2 records
- audit events for `task_created`
- audit events for `task_class_assigned`, `task_marker_assigned` and `task_published`
- audit events for `marker_score_draft_saved` and `marker_score_submitted`
- audit events for subject setup changes including class, student, enrolment, unit and outcome creation and student import commits
- temporary `/supabase-check` route removed after verification

Stage 2 database foundation, the read-only subject workspace, admin-only subject setup management, the bounded pasted CSV student import MVP, the Stage 4 task schema foundation, draft numeric task setup, class assignment, marker assignment, task publishing foundation and Phase 5 numeric marking foundation are now implemented. Normal users continue to see read-only subject workspace pages unless they are assigned markers for a published task.

The pasted CSV import supports the canonical `student_id,first_name,preferred_name,surname,email,class,status` template, the `student_code`, `last_name` and `class_code` aliases, simple quoted cells, blank-line trimming, extra-column warnings and duplicate student ID rejection inside an upload. It imports only into existing active classes and does not create classes automatically.

The app does not yet implement invite emails, XLSX import, drag-and-drop upload, full import history, staged import tables, column mapping UI, staff/class teacher assignment, variance checking, third-marker moderation, finalisation, analytics or exports.

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

## Current routes

Current implemented or scaffolded routes:

- `/`
- `/login`
- `/logout`
- `/people`
- `/subjects`
- `/subjects/new`
- `/subjects/[subjectId]`
- `/subjects/[subjectId]/classes`
- `/subjects/[subjectId]/students`
- `/subjects/[subjectId]/tasks`
- `/tasks/[taskId]/marking`
- `/tasks`
- `/moderation`
- `/analysis`
- `/exports`
- `/settings`

Real routes:

- `/login`
- `/logout`
- `/people`
- `/subjects`
- `/subjects/new`
- `/subjects/[subjectId]`
- `/subjects/[subjectId]/classes`
- `/subjects/[subjectId]/students`
- `/subjects/[subjectId]/tasks`
- `/tasks/[taskId]/marking`

Static/scaffolded routes:

- `/`
- `/tasks`
- `/moderation`
- `/analysis`
- `/exports`
- `/settings`

`/supabase-check` is no longer a current route.

## Intended route direction

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

## Supabase migration sync workflow

The repo is linked to the hosted Supabase project through the Supabase CLI. Use this workflow to keep local migrations and the hosted project in sync.

```bash
npx supabase login
npx supabase link
cat supabase/.temp/project-ref
npx supabase migration list
npx supabase db push
```

- `npx supabase login` is used when the CLI is not authenticated.
- `npx supabase link` is used only when the repo is not already linked to the hosted Supabase project.
- `cat supabase/.temp/project-ref` confirms which hosted project this repo is linked to.
- `npx supabase migration list` checks local vs remote migration state.
- `npx supabase db push` is the normal workflow once the repo is linked and migration history is synced. It applies pending local migrations to the linked hosted project.
- If `db push` fails with “relation already exists”, stop and do not rerun blindly.
- A “relation already exists” error usually means schema objects already exist but Supabase migration history is out of sync.
- In that case, inspect the remote schema first, then use the repair workflow only for migrations whose schema objects are already present:

```bash
npx supabase migration repair --status applied ...
```

- Do not rewrite committed migrations to add `if not exists` just to bypass migration-history mismatch.
- Do not drop or recreate tables to fix migration history.
- Do not commit `supabase/.temp/`.
- After migration sync, run `npm run build`, `npm run dev`, and test the affected route.

## Current architecture rules

- Routes compose.
- Loaders gather route-scoped data.
- Components render data and collect input.
- Server actions mutate state.
- Permission helpers decide what actions are allowed.
- Audit helpers record meaningful governance events.
- Do not put large query or mutation logic directly in page files.
- Do not fetch unauthorised rows and filter them in the browser.
- Do not rely on UI-only permission gates.
- Do not introduce Supabase patterns outside the existing helper files unless deliberately planned.

## Current database foundation

The applied database foundation has four layers.

### Phase 1 foundation tables

These tables are implemented and applied:

- schools
- profiles
- user_global_roles
- audit_events

Purposes:

- `schools`: school/account boundary
- `profiles`: app-level staff profiles linked to Supabase Auth where available
- `user_global_roles`: school-level global role assignments
- `audit_events`: general governance trail

The app is designed with a school boundary from day one. Profiles are app-level staff records linked to Supabase Auth via nullable auth_user_id. Global roles are stored separately from profiles, and audit_events provides the generic audit trail foundation.

### Phase 2 subject/class/student foundation tables

These tables are implemented and applied:

- `academic_years`: school academic years such as 2026
- `subjects`: school-level subject catalogue, such as English, Media or Legal Studies
- `subject_instances`: a subject in a specific academic year, such as VCE English 2026
- `units`: unit, semester or section structure inside a subject instance
- `outcomes`: Outcome, Area of Study or local outcome structure inside a unit
- `classes`: teaching groups inside a subject instance, such as 12ENGA
- `students`: school-level student identity, separate from class membership
- `class_enrolments`: links students to classes while preserving stable student identity
- `user_subject_roles`: subject-instance scoped staff roles
- `user_class_roles`: class-scoped staff roles

Marking, moderation, rubric, import/export and analytics tables remain intentionally deferred.

### Phase 4 task setup tables

These tables are implemented:

- `tasks`: assessment task setup records inside subject instances
- `task_scoring_rules`: numeric scoring rule foundation for assessment tasks
- `task_moderation_rules`: initial marker count, variance threshold and pathway settings

### Phase 4 task assignment and publication tables

These tables are implemented:

- `task_assignments`: class-level task assignment records
- `task_marker_assignments`: class-level Marker 1 and Marker 2 assignments
- `student_task_records`: per-student task workflow records generated from active class enrolments

Task assignment is class-based. Publishing a task creates missing student task records from active enrolments in the assigned classes and avoids duplicate task/student records.

### schools

Purpose: school/account boundary.

Key ideas:

- multi-school boundary exists from day one
- app may operate single-school initially
- `status` supports `active`, `inactive` and `archived`

### profiles

Purpose: app-level staff profiles linked to Supabase Auth where available.

Key ideas:

- profiles are not the same thing as Supabase Auth users
- `auth_user_id` is nullable
- nullable `auth_user_id` supports provisioned or invited users before Auth linking
- profile statuses include `invited`, `active`, `inactive`, `suspended` and `archived`
- profiles belong to schools

### user_global_roles

Purpose: school-level role assignments.

Current global roles:

- `system_admin`
- `school_viewer`
- `template_manager`

More scoped roles are planned later:

- subject roles
- class roles
- moderation case assignments

### audit_events

Purpose: general governance trail.

Currently used for:

- `profile_created`
- `global_role_assigned`

Future subject, task, marking and moderation actions should also write audit events.

## Student identity and class membership

Students are stable school-level objects. They are not created inside a class.

Conceptual structure:

- `students` = stable student identity
- `classes` = teaching groups inside subject instances
- `class_enrolments` = links between students and classes

This means the same student can move between classes or appear in multiple subject contexts without becoming a duplicate student identity. This structure prepares the app for later task records, where `student_task_records` should point back to the stable student identity and preserve the class context at the time of the task.

## Auth and access model

- Supabase Auth handles authentication.
- Cohort Studio profiles handle app-level authorisation.
- A user being authenticated is not enough to access school data.
- The app looks for an active profile linked to the auth user.
- If no active profile exists, the app shows a controlled not-provisioned/no-access state.
- Staff access is provisioned, not open self-signup.
- System admins can manually create staff profiles in `/people`.
- Email invitation flow is not implemented yet.
- Manual profile creation currently creates an app profile, not a Supabase Auth user.

## Permission model, current and planned

Current implemented permissions:

- `system_admin` can manage people through manual staff profile creation
- current profile lookup includes school and global roles
- `/people` is scoped to the current profile's school
- people mutation is checked server-side, not only hidden in the UI

Current implemented role scopes:

Global:

- `system_admin`
- `school_viewer`
- `template_manager`

Subject-instance:

- `subject_moderator`
- `assessment_owner`
- `teacher`
- `cohort_marker`
- `viewer`

Class:

- `class_teacher`
- `class_viewer`

Planned permissions:

- marking pools
- moderation case assignment
- permission helpers such as `canViewSubject`, `canEditSubjectSetup`, `canSubmitMarkerScore`, `canAssignThirdMarker`, `canFinaliseTask` and `canExportSubjectData`

Task marker assignments now exist for the MVP class-level Marker 1 and Marker 2 setup. Later marker and task-scope roles may include:

- `marker_3`
- `assessment_owner` at task scope, if needed

The Stage 2 migration includes subject and class role tables, but the UI for assigning those roles beyond current manual/bootstrap workflows is not yet built.

UI visibility is not sufficient. Server actions must enforce permissions.

## RLS and permissions status

RLS is enabled on the Phase 1 foundation tables and the Phase 2 subject/class/student tables.

Current conservative rule:

- authenticated active users are resolved through profiles
- school boundary is enforced through `current_school_id()`
- `system_admin` can write setup data
- assigned subject/class users can read scoped data
- ordinary setup writes are currently `system_admin`-only
- subject moderator write policies can be deliberately expanded later

This is not the final RLS model. RLS protects rows. Server permission helpers protect actions. UI permission gates guide the user. Audit logs record sensitive changes.

## Data loading principle

- Fetch by page context, not whole session.
- Do not load the whole school dataset at login.
- Each route should use route-scoped loaders.
- Loaders should return one shaped object for the page.
- Use a small number of targeted Supabase queries or RPCs.
- Postgres/Supabase should handle school boundary filtering, RLS, joins, search, pagination and heavy aggregation.
- The UI can do small display calculations, formatting, local filters over already-loaded rows, badge styling and chart transforms.
- Analytics should eventually use database-backed definitions/views/RPCs, not loose client-only calculations.

Current pattern:

- `/people` uses `lib/people/get-people-page-data.ts` as a route-scoped loader
- `app/people/actions.ts` handles mutations
- components render data and collect input

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

## Existing file structure

Current implemented structure includes:

- `app/page.tsx`
- `app/login/page.tsx`
- `app/login/login-form.tsx`
- `app/auth/actions.ts`
- `app/logout/route.ts`
- `app/people/page.tsx`
- `app/people/actions.ts`
- `components/layout/app-shell.tsx`
- `components/layout/top-bar.tsx`
- `components/layout/side-nav.tsx`
- `components/layout/content-shell.tsx`
- `components/layout/page-header.tsx`
- `components/people/add-staff-profile-form.tsx`
- `components/people/people-table.tsx`
- `components/people/people-summary-cards.tsx`
- `lib/env.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/types.ts`
- `lib/auth/current-profile.ts`
- `lib/auth/permissions.ts`
- `lib/people/get-people-page-data.ts`
- `lib/audit/audit-events.ts`
- `lib/design/navigation.ts`
- `lib/design/status-styles.ts`
- `supabase/migrations/0001_foundation.sql`
- `supabase/migrations/0002_subject_foundation.sql`

## Moderation rules

Basic moderation model:

- Marker 1 and Marker 2 submit independent scores.
- The app calculates absolute variance.
- If variance is within the task threshold, the record can move toward finalisation.
- If variance exceeds the threshold, the app creates a moderation case.
- A third marker submits a separate score and note.
- The moderator finalises the result.
- Original M1 and M2 scores must be preserved as evidence, not overwritten.

## Planned task/marking model note

Cohort Studio should eventually treat each student's submitted assessment as a singular workflow object.

- The task is the assessment design.
- The `student_task_record` is the paper.
- Marker scores are readings of that paper.
- Moderation is the paper's movement through required readers.

Moderation groups should be created from a teacher's first-read pile inside a subject/task, then passed forward to another teacher. In teams larger than two, pass-forward mode should not facilitate two-way swaps. It should enforce a one-direction rotation unless the moderator deliberately chooses a different allocation mode.

This is planned for the later task/marking schema and is not part of the current Stage 2 migration.

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

## Environment variables

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Use the Supabase project URL and the publishable/anon public key. Do not put `sb_secret` keys in `NEXT_PUBLIC` variables. Do not commit `.env.local`. Vercel must also have these environment variables set.

## Current local workflow

Local workflow:

- `npm run dev`
- `npm run build`
- `git add .`
- `git commit -m "message"`
- `git push`

Local user workflow shortcuts may include:

- `cohort`
- `cohortdev`
- `cohortbuild`
- `cship "Commit message"`

Recommended workflow:

1. Ask Codex for one bounded pass.
2. Review changed files.
3. Run `npm run build`.
4. Test the route locally.
5. Use `cship "message"` to build, commit and push if clean.

## Codex prompt discipline

For future Codex passes:

- prompts should name exact files to inspect
- prompts should name exact files that may be created
- prompts should name exact files that may be edited
- prompts should state files that must not be touched
- prompts should state the current build phase
- prompts should state out-of-scope future features
- Codex should not run `npm run build` automatically unless explicitly allowed
- Codex should summarise files created, files edited, routes changed, dependencies changed, assumptions and recommended local checks
- README is product/architecture intent, not a complete file map
- prompts should use current project files as implementation source of truth
- the user will run `npm run build` or `cship` locally before committing
- future passes should be narrow and route-scoped
- do not add future-phase features
- do not edit unrelated files
- do not add dependencies unless explicitly requested
- do not create database/schema/auth/RLS code unless the prompt asks for it
- keep product language and architecture aligned with this README

## Stage 4 current position

Stage 2 database foundation is now in place. The app has the database structure needed for academic years, subjects, subject instances, units, outcomes, classes, students, class enrolments, subject roles and class roles. Academic years now use the numeric `year` field only; there is no separate app-facing academic year label.

The read-only subject workspace is now implemented. `/subjects`, `/subjects/[subjectId]`, `/subjects/[subjectId]/classes` and `/subjects/[subjectId]/students` load real school-scoped Supabase data for normal users.

Admin-only subject setup management is now implemented. System admins can create subject instances, add classes, add basic student records, enrol students into classes, add simple units and outcomes, and paste CSV student imports into existing active classes using the existing Stage 2 schema.

The pasted CSV import has been hardened for manual QA. It validates required headers and row fields, reports row-level errors, warns on missing student IDs and ignored extra columns, skips unsupported statuses and unknown classes, rejects duplicate student IDs within the upload, and can commit valid rows while skipping invalid rows.

The Stage 4 task setup foundation is now in place. The schema has `tasks`, `task_scoring_rules` and `task_moderation_rules` tables for draft numeric task setup inside subject instances. `/subjects/[subjectId]/tasks` shows the subject task list and lets system admins create draft numeric tasks. It captures optional unit/outcome links, numeric maximum scores, optional display maximum scores, optional pass thresholds, required initial marker counts, variance thresholds and moderation pathway settings.

The task assignment and publication foundation is now in place. The schema has `task_assignments`, `task_marker_assignments` and `student_task_records` tables. System admins can assign draft tasks to active classes, assign Marker 1 and Marker 2 by class, preview active student counts and publish tasks. Publishing a task generates missing student task records from active class enrolments and moves the task to `marking_open`.

Normal users can view the task list read-only when they can view the subject. Task creation, assignment and publishing controls remain system-admin only.

## Recommended next app pass

The next implementation pass should be one of:

- task assignment and publication QA across admin and read-only task views
- numeric marker score entry foundation for `marking_open` tasks

Keep the next pass limited to task assignment polish or first-pass numeric score entry. Do not move to variance checking, moderation or finalisation yet.

Explicitly out of scope until later:

- numeric score submission beyond the next focused marker-entry pass
- variance checking
- third-marker workflow
- finalisation
- exports
- analytics
- rubrics
- templates
- email invitations
- audit log UI
- staff/class teacher assignment

## Deferred features

- Supabase Auth email invite flow
- password reset
- profile edit/deactivate
- XLSX import
- drag-and-drop upload
- full import history
- staged import tables
- column mapping UI
- staff/class teacher assignment
- staff email invitations
- pass-forward moderation groups
- read requirements
- marking interface
- marker scores
- variance checking
- moderation cases
- moderation workflow
- final results
- imports/exports
- analytics
- rubrics and rubric versions
- templates
- audit log UI
- middleware/protected-route redirects
- generated Supabase types
