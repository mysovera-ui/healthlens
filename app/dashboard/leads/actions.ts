"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { logAudit } from "@/lib/db/audit";
import { revalidatePath } from "next/cache";

export async function toggleLeadContactedAction(leadId: string, contacted: boolean) {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("lead_previews")
    .update({ contacted })
    .eq("id", leadId);

  if (error) {
    console.error("toggleLeadContactedAction error", error);
    return;
  }

  await logAudit(supabase, {
    actor: "healthbridge-team",
    action: contacted ? "lead_marked_contacted" : "lead_marked_uncontacted",
    target_table: "lead_previews",
    target_id: leadId,
    new_value: String(contacted),
  });

  revalidatePath("/dashboard/leads");
}
