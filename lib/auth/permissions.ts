import type { CurrentProfile } from "./current-profile";

export const allowedGlobalRoles = [
  "system_admin",
  "school_viewer",
  "template_manager",
] as const;

export type AllowedGlobalRole = (typeof allowedGlobalRoles)[number];

export function isSystemAdmin(currentProfile: CurrentProfile | null) {
  return currentProfile?.globalRoles.includes("system_admin") ?? false;
}

export function canManagePeople(currentProfile: CurrentProfile | null) {
  return isSystemAdmin(currentProfile);
}

export function isAllowedGlobalRole(
  role: string,
): role is AllowedGlobalRole {
  return allowedGlobalRoles.includes(role as AllowedGlobalRole);
}
