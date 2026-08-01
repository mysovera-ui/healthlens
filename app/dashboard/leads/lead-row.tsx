"use client";

import { useState, useTransition } from "react";
import { toggleLeadContactedAction } from "./actions";
import { formatDateTime } from "@/lib/db/format";

const STATUS_STYLE: Record<string, string> = {
  flagged: "bg-amber-100 text-amber-800",
  normal: "bg-green-100 text-green-800",
  info: "bg-blue-100 text-blue-800",
};

export function LeadRow({
  id,
  email,
  previewParameter,
  previewStatus,
  markersCount,
  createdAt,
  contacted,
}: {
  id: string;
  email: string;
  previewParameter: string | null;
  previewStatus: string | null;
  markersCount: number;
  createdAt: string;
  contacted: boolean;
}) {
  const [isContacted, setIsContacted] = useState(contacted);
  const [isPending, startTransition] = useTransition();
  const badgeStyle = STATUS_STYLE[previewStatus ?? ""] ?? "bg-neutral-100 text-neutral-700";

  function toggle() {
    const next = !isContacted;
    setIsContacted(next);
    startTransition(async () => {
      await toggleLeadContactedAction(id, next);
    });
  }

  return (
    <tr className="border-b border-neutral-100 last:border-0">
      <td className="px-4 py-3">
        <a href={`mailto:${email}`} className="text-teal-700 hover:underline">
          {email}
        </a>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-2">
          {previewParameter ?? "—"}
          {previewStatus && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyle}`}>{previewStatus}</span>
          )}
        </span>
      </td>
      <td className="px-4 py-3 text-neutral-500">{markersCount}</td>
      <td className="px-4 py-3 text-neutral-500">{formatDateTime(createdAt)}</td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
            isContacted ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          {isContacted ? "✓ Contacted" : "Mark contacted"}
        </button>
      </td>
    </tr>
  );
}
