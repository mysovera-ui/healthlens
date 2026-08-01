"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { requestFreePreviewAction, type FreePreviewState } from "./actions";
import { createClient } from "@/lib/supabase/client";

const initialState: FreePreviewState = {};
const MAX_FILES = 3;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024; // 5MB combined

type UploadedFile = { name: string; url: string; size: number };
type FileEntryStatus = "uploading" | "done" | "error";
type FileEntry = { name: string; size: number; status: FileEntryStatus; url?: string; message?: string };

export default function FreePreviewPage() {
  const [state, formAction, pending] = useActionState(requestFreePreviewAction, initialState);
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [fileError, setFileError] = useState<string>("");

  const uploadedFiles: UploadedFile[] = fileEntries
    .filter((f): f is FileEntry & { status: "done"; url: string } => f.status === "done" && !!f.url)
    .map((f) => ({ name: f.name, url: f.url!, size: f.size }));
  const isUploading = fileEntries.some((f) => f.status === "uploading");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length === 0) return;

    setFileError("");

    const existingDone = fileEntries.filter((f) => f.status !== "error");
    const combinedCount = existingDone.length + selected.length;
    if (combinedCount > MAX_FILES) {
      setFileError(`The free preview accepts up to ${MAX_FILES} file(s). You already have ${existingDone.length}.`);
      return;
    }
    const existingBytes = existingDone.reduce((sum, f) => sum + f.size, 0);
    const newBytes = selected.reduce((sum, f) => sum + f.size, 0);
    if (existingBytes + newBytes > MAX_TOTAL_BYTES) {
      setFileError("Combined file size is over 5MB. Please choose a smaller file.");
      return;
    }

    const startIndex = fileEntries.length;
    setFileEntries((prev) => [
      ...prev,
      ...selected.map((file) => ({ name: file.name, size: file.size, status: "uploading" as const })),
    ]);

    const supabase = createClient();
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      const idx = startIndex + i;
      const ext = file.name.split(".").pop() || "bin";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("report-files")
        .upload(path, file, { contentType: file.type || undefined });

      if (error) {
        console.error("upload error", error);
        setFileEntries((prev) =>
          prev.map((f, j) => (j === idx ? { ...f, status: "error", message: "Upload failed — please try again." } : f)),
        );
        continue;
      }
      const { data } = supabase.storage.from("report-files").getPublicUrl(path);
      setFileEntries((prev) =>
        prev.map((f, j) => (j === idx ? { ...f, status: "done", url: data.publicUrl } : f)),
      );
    }
  }

  function removeFile(index: number) {
    setFileEntries((prev) => prev.filter((_, i) => i !== index));
    setFileError("");
  }

  return (
    <main className="min-h-screen bg-neutral-50 py-16 px-6">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="text-sm text-teal-700 hover:underline">
          ← Back
        </Link>
        <p className="mt-4 text-sm font-medium text-teal-700">Free preview</p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">
          See one of your results explained — free
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Upload a photo or PDF of your lab report and we&apos;ll instantly show you one result
          explained in plain language, no payment required. Want the rest explained too? You can
          unlock the full report afterward.
        </p>

        {state.error && (
          <div className="mt-6 rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
            {state.error}
          </div>
        )}

        <form action={formAction} className="mt-8 space-y-5">
          <Field label="Email" error={state.fieldErrors?.email}>
            <input name="email" type="email" required className="input" placeholder="jane@example.com" />
          </Field>

          <Field label="Upload your report (PDF or image, up to 3 files, 5MB combined)" error={state.fieldErrors?.file_urls}>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 cursor-pointer transition-colors">
                📷 Take photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <label className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer transition-colors">
                📁 Choose file
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <input type="hidden" name="file_urls" value={JSON.stringify(uploadedFiles.map((f) => f.url))} />

            {fileEntries.length > 0 && (
              <ul className="mt-2 space-y-1">
                {fileEntries.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs rounded-md bg-neutral-100 px-2 py-1.5">
                    <span className="truncate text-neutral-700">{f.name}</span>
                    <span className="flex items-center gap-2 shrink-0 ml-2">
                      {f.status === "uploading" && <span className="text-neutral-500">Uploading…</span>}
                      {f.status === "done" && <span className="text-teal-700">✓ uploaded</span>}
                      {f.status === "error" && <span className="text-red-600">{f.message}</span>}
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-neutral-400 hover:text-red-600"
                        aria-label={`Remove ${f.name}`}
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {fileError && <span className="mt-1 block text-xs text-red-600">{fileError}</span>}
          </Field>

          <Field error={state.fieldErrors?.consent}>
            <label className="flex items-start gap-2 text-sm text-neutral-600">
              <input type="checkbox" name="consent" className="mt-0.5 rounded" />
              I&apos;m okay with HealthLens emailing me about my results.
            </label>
          </Field>

          <button
            type="submit"
            disabled={pending || isUploading}
            className="w-full rounded-lg bg-teal-700 px-6 py-3 text-white font-semibold hover:bg-teal-800 disabled:opacity-60 transition-colors"
          >
            {pending ? "Analyzing…" : isUploading ? "Uploading…" : "Show me my free result"}
          </button>

          <p className="text-xs text-neutral-400 text-center">
            This is an educational summary, not a diagnosis. Your file is used only to generate your preview.
          </p>
        </form>
      </div>

      <style>{`
        .input {
          width: 100%;
          border: 1px solid rgb(212 212 212);
          border-radius: 0.5rem;
          padding: 0.6rem 0.75rem;
          font-size: 0.9rem;
          background: white;
        }
        .input:focus {
          outline: 2px solid rgb(15 118 110);
          outline-offset: 1px;
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-neutral-700 mb-1">{label}</span>}
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
