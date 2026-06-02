import type { SubjectsPageData } from "../../lib/subjects/get-subjects-page-data";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { SubjectList } from "./subject-list";
import { SubjectSummaryCards } from "./subject-summary-card";

type SubjectsPageProps = SubjectsPageData;

export function SubjectsPage({
  currentProfile,
  subjects,
  summary,
}: SubjectsPageProps) {
  if (!currentProfile) {
    return (
      <Card as="section" className="border-amber-200 bg-amber-50">
        <Badge variant="warning">No active profile</Badge>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">
          This account is not provisioned for Cohort Studio.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          Ask a system administrator to link your Supabase auth account to an
          active staff profile before viewing school subject setup.
        </p>
      </Card>
    );
  }

  return (
    <>
      <SubjectSummaryCards summary={summary} />
      <SubjectList subjects={subjects} />
    </>
  );
}
