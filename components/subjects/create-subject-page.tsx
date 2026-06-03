import type { CreateSubjectPageData } from "../../lib/subjects/get-create-subject-page-data";
import { AdminCreateSubjectForm } from "./create-subject-form";
import { SubjectStateCard } from "./subject-state-card";

type CreateSubjectPageProps = CreateSubjectPageData;

export function CreateSubjectPage({
  academicYears,
  canAdminCreateSubjectInstances,
  currentProfile,
  subjects,
}: CreateSubjectPageProps) {
  if (!currentProfile) {
    return (
      <SubjectStateCard
        badge="No active profile"
        description="Sign-in has succeeded, but this account is not linked to an active staff profile for a school. Ask a system administrator to complete staff provisioning before creating subject setup."
        title="Subject creation is not available for this account."
      />
    );
  }

  if (!canAdminCreateSubjectInstances) {
    return (
      <SubjectStateCard
        badge="System admin only"
        description="Subject setup changes are currently limited to system administrators. Your subject workspace remains read-only."
        linkHref="/subjects"
        linkLabel="Back to subjects"
        title="You do not have permission to create subject instances."
      />
    );
  }

  return (
    <AdminCreateSubjectForm academicYears={academicYears} subjects={subjects} />
  );
}
