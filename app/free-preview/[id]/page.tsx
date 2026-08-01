import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  flagged: "Outside typical range",
  normal: "Within typical range",
  info: "Result found",
};

const STATUS_STYLE: Record<string, string> = {
  flagged: "bg-amber-100 text-amber-800",
  normal: "bg-green-100 text-green-800",
  info: "bg-blue-100 text-blue-800",
};

export default async function FreePreviewResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: lead } = await supabase
    .from("lead_previews")
    .select("id, email, preview_parameter, preview_sentence, preview_status, markers_detected_count")
    .eq("id", id)
    .maybeSingle();

  if (!lead || !lead.preview_parameter || !lead.preview_sentence) {
    notFound();
  }

  const remaining = Math.max(lead.markers_detected_count - 1, 0);
  const badgeStyle = STATUS_STYLE[lead.preview_status ?? ""] ?? "bg-neutral-100 text-neutral-700";
  const badgeLabel = STATUS_LABEL[lead.preview_status ?? ""] ?? "Result found";

  return (
    <main className="min-h-screen bg-neutral-50 py-16 px-6">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="text-sm text-teal-700 hover:underline">
          ← Back home
        </Link>

        <p className="mt-4 text-sm font-medium text-teal-700">Your free preview</p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">
          Here&apos;s what your {lead.preview_parameter} result means
        </h1>

        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-neutral-900">{lead.preview_parameter}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${badgeStyle}`}>
              {badgeLabel}
            </span>
          </div>
          <p className="mt-3 text-sm text-neutral-700 leading-relaxed">{lead.preview_sentence}</p>
        </div>

        {remaining > 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center">
            <p className="text-sm text-neutral-600">
              🔒 We found <strong>{remaining} more result{remaining === 1 ? "" : "s"}</strong> in your
              report — cholesterol, liver function, kidney function, and more — each explained the
              same plain-language way.
            </p>
          </div>
        )}

        <div className="mt-6 rounded-xl bg-teal-700 text-white p-6 text-center">
          <h3 className="font-semibold">Want your full report?</h3>
          <p className="mt-1 text-sm text-teal-50">
            Submit your report properly and we&apos;ll send you the complete plain-language
            breakdown of every result — from RM29.
          </p>
          <Link
            href="/submit"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-white px-6 py-2.5 text-teal-800 font-semibold hover:bg-teal-50 transition-colors"
          >
            Get my full report
          </Link>
          <p className="mt-2 text-xs text-teal-100">
            Use the same email ({lead.email}) so we can keep everything linked.
          </p>
        </div>

        <p className="mt-4 text-xs text-neutral-400 text-center">
          This is an educational summary, not a diagnosis. Please discuss your results with your doctor.
        </p>
      </div>
    </main>
  );
}
