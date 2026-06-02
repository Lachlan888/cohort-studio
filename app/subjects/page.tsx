import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/layout/page-header";
import { SubjectsPage as SubjectsPageContent } from "../../components/subjects/subjects-page";
import { Badge } from "../../components/ui/badge";
import { getSubjectsPageData } from "../../lib/subjects/get-subjects-page-data";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const { currentProfile, subjects, summary } = await getSubjectsPageData();

  return (
    <AppShell activeHref="/subjects">
      <PageHeader
        description={
          currentProfile
            ? `Read-only subject instances visible for ${currentProfile.school.name}.`
            : "Sign-in alone is not enough to access school subject data."
        }
        eyebrow="Subject setup"
        rightContent={
          currentProfile ? (
            <Badge variant="primary">{currentProfile.school.name}</Badge>
          ) : null
        }
        title="Subjects"
      />

      <SubjectsPageContent
        currentProfile={currentProfile}
        subjects={subjects}
        summary={summary}
      />
    </AppShell>
  );
}
