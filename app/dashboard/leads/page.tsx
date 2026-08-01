import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { LeadRow } from "./lead-row";
import type { LeadPreview } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = createServiceClient();

  const { data: leads, error } = await supabase
    .from("lead_previews")
    .select("id, email, preview_parameter, preview_status, markers_detected_count, contacted, created_at")
    .order("created_at", { ascending: false })
    .returns<LeadPreview[]>();

  const rows = leads ?? [];
  const contactedCount = rows.filter((l) => l.contacted).length;

  return (
    <main className="min-h-screen bg-neutral-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Leads</h1>
          <p className="text-sm text-neutral-500">
            People who tried the free preview but haven&apos;t submitted a full report yet.
            {" "}
            {rows.length} total · {rows.length - contactedCount} awaiting follow-up.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
            Something went wrong loading leads. Please try again.
          </div>
        )}

        {!error && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center text-neutral-500">
            No leads yet. Share{" "}
            <Link href="/free-preview" className="text-teal-700 hover:underline">
              /free-preview
            </Link>{" "}
            to start collecting them.
          </div>
        )}

        {!error && rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Free result shown</th>
                  <th className="px-4 py-3 font-medium">Markers found</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <LeadRow
                    key={l.id}
                    id={l.id}
                    email={l.email}
                    previewParameter={l.preview_parameter}
                    previewStatus={l.preview_status}
                    markersCount={l.markers_detected_count}
                    createdAt={l.created_at}
                    contacted={l.contacted}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
