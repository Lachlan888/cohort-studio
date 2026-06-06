import { AppShell } from "../../../../components/layout/app-shell";
import { PageHeader } from "../../../../components/layout/page-header";
import { SubjectTasksPage as SubjectTasksPageContent } from "../../../../components/subjects/subject-tasks-page";
import { Badge } from "../../../../components/ui/badge";
import { getSubjectTasksPageData } from "../../../../lib/subjects/get-subject-tasks-page-data";

export const dynamic = "force-dynamic";

type SubjectTasksRouteProps = {
  params: Promise<{ subjectId: string }>;
};

export default async function SubjectTasksPage({
  params,
}: SubjectTasksRouteProps) {
  const { subjectId } = await params;
  const {
    canAdminManageSubjectTasks,
    classes,
    currentProfile,
    outcomes,
    staffProfiles,
    subject,
    tasks,
    units,
  } = await getSubjectTasksPageData(subjectId);

  return (
    <AppShell activeHref="/subjects">
      <PageHeader
        description={
          currentProfile
            ? `Subject task setup visible for ${currentProfile.school.name}.`
            : "Sign-in alone is not enough to access school subject data."
        }
        eyebrow="Subject tasks"
        rightContent={
          currentProfile ? (
            <Badge variant="primary">{currentProfile.school.name}</Badge>
          ) : null
        }
        title={subject ? `${subject.title} tasks` : "Subject tasks"}
      />
      <SubjectTasksPageContent
        canAdminManageSubjectTasks={canAdminManageSubjectTasks}
        classes={classes}
        currentProfile={currentProfile}
        outcomes={outcomes}
        staffProfiles={staffProfiles}
        subject={subject}
        tasks={tasks}
        units={units}
      />
    </AppShell>
  );
}
