import type { Json } from "../supabase/types";
import { createClient } from "../supabase/server";

type AuditEventInsert = {
  actor_display_name: string | null;
  actor_email: string | null;
  actor_profile_id: string | null;
  entity_id?: string | null;
  entity_type: string;
  event_type: string;
  metadata?: Json | null;
  new_values?: Json | null;
  old_values?: Json | null;
  parent_entity_id?: string | null;
  parent_entity_type?: string | null;
  reason?: string | null;
  school_id: string;
};

type QueryError = {
  message: string;
};

type AuditEventTable = {
  insert(row: AuditEventInsert): Promise<{ error: QueryError | null }>;
};

type AuditEventClient = {
  from(table: "audit_events"): AuditEventTable;
};

export async function insertAuditEvent(event: AuditEventInsert) {
  const supabase = await createClient();
  const tableClient = supabase as unknown as AuditEventClient;

  const { error } = await tableClient.from("audit_events").insert({
    actor_display_name: event.actor_display_name,
    actor_email: event.actor_email,
    actor_profile_id: event.actor_profile_id,
    entity_id: event.entity_id ?? null,
    entity_type: event.entity_type,
    event_type: event.event_type,
    metadata: event.metadata ?? null,
    new_values: event.new_values ?? null,
    old_values: event.old_values ?? null,
    parent_entity_id: event.parent_entity_id ?? null,
    parent_entity_type: event.parent_entity_type ?? null,
    reason: event.reason ?? null,
    school_id: event.school_id,
  });

  return { error };
}
