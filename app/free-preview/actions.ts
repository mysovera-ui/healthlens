"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { logAudit } from "@/lib/db/audit";
import { extractMarkersFromFiles } from "@/lib/ai/extract-markers";
import { generateStructuredReport, pickFreePreviewFinding } from "@/lib/ai/rules";
import { sendFreePreviewEmail, sendLeadTeamAlert } from "@/lib/email/resend";
import { redirect } from "next/navigation";

export type FreePreviewState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function requestFreePreviewAction(
  _prevState: FreePreviewState,
  formData: FormData,
): Promise<FreePreviewState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const consent = formData.get("consent") === "on";

  let file_urls: string[] = [];
  try {
    const raw = String(formData.get("file_urls") || "[]");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      file_urls = parsed.filter((u): u is string => typeof u === "string" && u.length > 0).slice(0, 3);
    }
  } catch {
    file_urls = [];
  }

  const fieldErrors: Record<string, string> = {};
  if (!email || !email.includes("@")) fieldErrors.email = "A valid email is required";
  if (file_urls.length === 0) fieldErrors.file_urls = "Upload at least one photo or PDF of your lab report";
  if (!consent) fieldErrors.consent = "Please confirm you're okay with us emailing you about your results";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  let extractResult;
  try {
    extractResult = await extractMarkersFromFiles(file_urls);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "ANTHROPIC_NOT_CONFIGURED") {
      return { error: "The free preview isn't available right now — please try the full submission instead." };
    }
    return { error: `Could not read your report: ${message}. Try a clearer photo, or a different page.` };
  }

  const report = generateStructuredReport(extractResult.markerText);
  const finding = pickFreePreviewFinding(report);

  if (!finding) {
    return { error: "We couldn't confidently read any results from this file — try a clearer photo or a different page." };
  }

  const supabase = createServiceClient();

  const { data: lead, error: insertError } = await supabase
    .from("lead_previews")
    .insert({
      email,
      file_urls,
      preview_parameter: finding.parameter,
      preview_sentence: finding.sentence,
      preview_status: finding.status,
      markers_detected_count: report.markersDetected.length,
    })
    .select("id")
    .single();

  if (insertError || !lead) {
    console.error("lead_previews insert error", insertError);
    return { error: "Something went wrong, please try again." };
  }

  await logAudit(supabase, {
    actor: "system",
    action: "lead_preview_created",
    target_table: "lead_previews",
    target_id: lead.id,
    new_value: email,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  // Best-effort notifications -- the visitor's result page already shows
  // everything, so an email/alert failure here shouldn't block them from
  // seeing their preview.
  try {
    await sendFreePreviewEmail({
      to: email,
      parameter: finding.parameter,
      sentence: finding.sentence,
      markersCount: report.markersDetected.length,
      previewUrl: `${appUrl}/free-preview/${lead.id}`,
    });
  } catch (err) {
    console.error("sendFreePreviewEmail failed", err);
  }
  try {
    await sendLeadTeamAlert({
      email,
      parameter: finding.parameter,
      markersCount: report.markersDetected.length,
    });
  } catch (err) {
    console.error("sendLeadTeamAlert failed", err);
  }

  redirect(`/free-preview/${lead.id}`);
}
