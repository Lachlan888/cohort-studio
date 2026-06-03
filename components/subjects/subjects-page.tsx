import type { SubjectsPageData } from "../../lib/subjects/get-subjects-page-data";
import { SubjectList } from "./subject-list";
import { SubjectStateCard } from "./subject-state-card";
import { SubjectSummaryCards } from "./subject-summary-card";

type SubjectsPageProps = SubjectsPageData;

export function SubjectsPage({
  currentProfile,
  subjects,
  summary,
}: SubjectsPageProps) {
  if (!currentProfile) {
    return (
      <SubjectStateCard
        badge="No active profile"
        description="Sign-in has succeeded, but this account is not linked to an active staff profile for a school. Ask a system administrator to complete staff provisioning before viewing subject setup."
        title="Subject setup is not available for this account."
      />
    );
  }

  return (
    <>
      <SubjectSummaryCards summary={summary} />
      <SubjectList subjects={subjects} />
    </>
  );
}
