import { AppShell } from "../../../../components/layout/app-shell";
import { PageHeader } from "../../../../components/layout/page-header";
import { SubjectStudentsPage as SubjectStudentsPageContent } from "../../../../components/subjects/subject-students-page";
import { Badge } from "../../../../components/ui/badge";
import { getSubjectStudentsPageData } from "../../../../lib/subjects/get-subject-students-page-data";

export const dynamic = "force-dynamic";

type SubjectStudentsRouteProps = {
  params: Promise<{ subjectId: string }>;
};

export default async function SubjectStudentsPage({
  params,
}: SubjectStudentsRouteProps) {
  const { subjectId } = await params;
  const { currentProfile, students, subject } =
    await getSubjectStudentsPageData(subjectId);

  return (
    <AppShell activeHref="/subjects">
      <PageHeader
        description={
          currentProfile
            ? `Read-only subject students visible for ${currentProfile.school.name}.`
            : "Sign-in alone is not enough to access school subject data."
        }
        eyebrow="Subject students"
        rightContent={
          currentProfile ? (
            <Badge variant="primary">{currentProfile.school.name}</Badge>
          ) : null
        }
        title={subject ? `${subject.title} students` : "Subject students"}
      />
      <SubjectStudentsPageContent
        currentProfile={currentProfile}
        students={students}
        subject={subject}
      />
    </AppShell>
  );
}
