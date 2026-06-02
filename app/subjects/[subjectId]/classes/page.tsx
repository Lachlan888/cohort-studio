import { AppShell } from "../../../../components/layout/app-shell";
import { PageHeader } from "../../../../components/layout/page-header";
import { SubjectClassesPage as SubjectClassesPageContent } from "../../../../components/subjects/subject-classes-page";
import { Badge } from "../../../../components/ui/badge";
import { getSubjectClassesPageData } from "../../../../lib/subjects/get-subject-classes-page-data";

export const dynamic = "force-dynamic";

type SubjectClassesRouteProps = {
  params: Promise<{ subjectId: string }>;
};

export default async function SubjectClassesPage({
  params,
}: SubjectClassesRouteProps) {
  const { subjectId } = await params;
  const { classes, currentProfile, subject } =
    await getSubjectClassesPageData(subjectId);

  return (
    <AppShell activeHref="/subjects">
      <PageHeader
        description={
          currentProfile
            ? `Read-only subject classes visible for ${currentProfile.school.name}.`
            : "Sign-in alone is not enough to access school subject data."
        }
        eyebrow="Subject classes"
        rightContent={
          currentProfile ? (
            <Badge variant="primary">{currentProfile.school.name}</Badge>
          ) : null
        }
        title={subject ? `${subject.title} classes` : "Subject classes"}
      />
      <SubjectClassesPageContent
        classes={classes}
        currentProfile={currentProfile}
        subject={subject}
      />
    </AppShell>
  );
}
