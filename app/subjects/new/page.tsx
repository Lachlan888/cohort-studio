import { AppShell } from "../../../components/layout/app-shell";
import { PageHeader } from "../../../components/layout/page-header";
import { CreateSubjectPage as CreateSubjectPageContent } from "../../../components/subjects/create-subject-page";
import { Badge } from "../../../components/ui/badge";
import { getCreateSubjectPageData } from "../../../lib/subjects/get-create-subject-page-data";

export const dynamic = "force-dynamic";

export default async function AdminCreateSubjectPage() {
  const {
    academicYears,
    canAdminCreateSubjectInstances,
    currentProfile,
    subjects,
  } = await getCreateSubjectPageData();

  return (
    <AppShell activeHref="/subjects">
      <PageHeader
        description={
          currentProfile
            ? `Admin-only subject creation for ${currentProfile.school.name}.`
            : "Sign-in alone is not enough to create school subject setup."
        }
        eyebrow="Subject setup"
        rightContent={
          currentProfile ? (
            <div className="flex flex-wrap items-center gap-3">
              {canAdminCreateSubjectInstances ? (
                <Badge>System admin</Badge>
              ) : null}
              <Badge variant="primary">{currentProfile.school.name}</Badge>
            </div>
          ) : null
        }
        title="Create subject"
      />

      <CreateSubjectPageContent
        academicYears={academicYears}
        canAdminCreateSubjectInstances={canAdminCreateSubjectInstances}
        currentProfile={currentProfile}
        subjects={subjects}
      />
    </AppShell>
  );
}
