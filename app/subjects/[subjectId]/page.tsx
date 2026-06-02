import { AppShell } from "../../../components/layout/app-shell";
import { PageHeader } from "../../../components/layout/page-header";
import { SubjectOverviewPage as SubjectOverviewPageContent } from "../../../components/subjects/subject-overview-page";
import { Badge } from "../../../components/ui/badge";
import { getSubjectOverviewPageData } from "../../../lib/subjects/get-subject-overview-page-data";

export const dynamic = "force-dynamic";

type SubjectOverviewRouteProps = {
  params: Promise<{
    subjectId: string;
  }>;
};

export default async function SubjectOverviewPage({
  params,
}: SubjectOverviewRouteProps) {
  const { subjectId } = await params;
  const { currentProfile, subject } = await getSubjectOverviewPageData(
    subjectId,
  );

  return (
    <AppShell activeHref="/subjects">
      <PageHeader
        description={
          currentProfile
            ? `Read-only subject structure visible for ${currentProfile.school.name}.`
            : "Sign-in alone is not enough to access school subject data."
        }
        eyebrow="Subject overview"
        rightContent={
          currentProfile ? (
            <Badge variant="primary">{currentProfile.school.name}</Badge>
          ) : null
        }
        title={subject?.title ?? "Subject"}
      />

      <SubjectOverviewPageContent
        currentProfile={currentProfile}
        subject={subject}
      />
    </AppShell>
  );
}
