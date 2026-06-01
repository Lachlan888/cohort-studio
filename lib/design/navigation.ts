export type NavigationItem = {
  description?: string;
  href: string;
  label: string;
};

export const primaryNavigationItems: NavigationItem[] = [
  {
    description: "Project foundation and landing shell",
    href: "/",
    label: "Home",
  },
  {
    description: "Subject, year, class and student setup",
    href: "/subjects",
    label: "Subjects",
  },
  {
    description: "Assessment task setup and marking flow",
    href: "/tasks",
    label: "Tasks",
  },
  {
    description: "Variance checks and moderation cases",
    href: "/moderation",
    label: "Moderation",
  },
  {
    description: "Scoring criteria and rubric structures",
    href: "/rubrics",
    label: "Rubrics",
  },
  {
    description: "Cohort performance and final results review",
    href: "/analysis",
    label: "Analysis",
  },
  {
    description: "Export and reporting support",
    href: "/exports",
    label: "Exports",
  },
  {
    description: "Staff profiles and future access setup",
    href: "/people",
    label: "People",
  },
  {
    description: "School and workflow settings",
    href: "/settings",
    label: "Settings",
  },
];
