import { AppShell } from "../../../../components/layout/app-shell";
import { PageHeader } from "../../../../components/layout/page-header";
import { TaskMarkingPage as TaskMarkingPageContent } from "../../../../components/marking/task-marking-page";
import { Badge } from "../../../../components/ui/badge";
import { getTaskMarkingPageData } from "../../../../lib/marking/get-task-marking-page-data";

export const dynamic = "force-dynamic";

type TaskMarkingRouteProps = {
  params: Promise<{ taskId: string }>;
};

export default async function TaskMarkingPage({
  params,
}: TaskMarkingRouteProps) {
  const { taskId } = await params;
  const { canManageAllScores, currentProfile, records, task } =
    await getTaskMarkingPageData(taskId);

  return (
    <AppShell activeHref="/subjects">
      <PageHeader
        description={
          currentProfile
            ? `Numeric marking for ${currentProfile.school.name}.`
            : "Sign-in alone is not enough to access task marking."
        }
        eyebrow="Task marking"
        rightContent={
          currentProfile ? (
            <Badge variant="primary">{currentProfile.school.name}</Badge>
          ) : null
        }
        title={task ? `${task.name} marking` : "Task marking"}
      />
      <TaskMarkingPageContent
        canManageAllScores={canManageAllScores}
        currentProfile={currentProfile}
        records={records}
        task={task}
      />
    </AppShell>
  );
}
