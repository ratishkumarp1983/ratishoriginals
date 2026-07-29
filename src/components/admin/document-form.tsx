"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface MetadataField {
  id: string;
  name: string;
  key: string;
  type: string;
}

export interface DocumentFormInitial {
  title: string;
  description: string;
  price: string;
  currency: string;
  samplePages: number;
  status: "DRAFT" | "PUBLISHED";
  seoTitle: string;
  seoDescription: string;
  hasCover: boolean;
  fileType: string;
  pageCount: number | null;
  metadataValues: Record<string, string>;
}

export function DocumentForm({
  mode,
  documentId,
  metadataFields,
  initial,
}: {
  mode: "create" | "edit";
  documentId?: string;
  metadataFields: MetadataField[];
  initial?: DocumentFormInitial;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    initial?.status ?? "DRAFT",
  );
  const [meta, setMeta] = useState<Record<string, string>>(
    initial?.metadataValues ?? {},
  );
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const form = e.currentTarget;
    const fd = new FormData(form);
    // Overwrite the controlled fields.
    fd.set("status", status);
    fd.set(
      "metadata",
      JSON.stringify(
        Object.entries(meta)
          .filter(([, v]) => v.trim())
          .map(([metadataId, value]) => ({ metadataId, value })),
      ),
    );

    const url =
      mode === "create"
        ? "/api/admin/documents"
        : `/api/admin/documents/${documentId}`;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      body: fd,
    });
    setSubmitting(false);

    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error ?? "Something went wrong");
      return;
    }
    toast.success(mode === "create" ? "Document created" : "Document updated");
    router.push("/admin/documents");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" defaultValue={initial?.title} required />
      </Field>

      <Field label="Description" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={initial?.description}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Price" htmlFor="price">
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.price ?? "0"}
            required
          />
        </Field>
        <Field label="Currency" htmlFor="currency">
          <Input
            id="currency"
            name="currency"
            defaultValue={initial?.currency ?? "INR"}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Sample pages" htmlFor="samplePages">
          <Input
            id="samplePages"
            name="samplePages"
            type="number"
            min="1"
            defaultValue={initial?.samplePages ?? 5}
            required
          />
        </Field>
        <Field label="Status" htmlFor="status">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        label={
          mode === "create"
            ? "Document file (PDF)"
            : "Replace document file (optional)"
        }
        htmlFor="file"
      >
        <Input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,.txt,.rtf"
          required={mode === "create"}
        />
        {mode === "edit" && initial && (
          <p className="text-xs text-neutral-500">
            Current: {initial.fileType.toUpperCase()}
            {initial.pageCount ? `, ${initial.pageCount} pages` : ""}. Leave empty
            to keep it.
          </p>
        )}
      </Field>

      <Field
        label={
          mode === "create"
            ? "Cover image"
            : "Replace cover image (optional)"
        }
        htmlFor="cover"
      >
        <Input
          id="cover"
          name="cover"
          type="file"
          accept="image/*"
          required={mode === "create"}
        />
        {mode === "edit" && initial?.hasCover && (
          <p className="text-xs text-neutral-500">
            A cover is set. Leave empty to keep it.
          </p>
        )}
      </Field>

      {metadataFields.length > 0 && (
        <fieldset className="space-y-4 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
          <legend className="px-1 text-sm font-medium text-neutral-500">
            Metadata (optional - blank fields stay hidden)
          </legend>
          {metadataFields.map((f) => (
            <Field key={f.id} label={f.name} htmlFor={`meta-${f.id}`}>
              <Input
                id={`meta-${f.id}`}
                type={f.type === "NUMBER" ? "number" : f.type === "DATE" ? "date" : "text"}
                value={meta[f.id] ?? ""}
                onChange={(e) =>
                  setMeta((m) => ({ ...m, [f.id]: e.target.value }))
                }
              />
            </Field>
          ))}
        </fieldset>
      )}

      <Field label="SEO title (optional)" htmlFor="seoTitle">
        <Input id="seoTitle" name="seoTitle" defaultValue={initial?.seoTitle} />
      </Field>
      <Field label="SEO description (optional)" htmlFor="seoDescription">
        <Textarea
          id="seoDescription"
          name="seoDescription"
          rows={2}
          defaultValue={initial?.seoDescription}
        />
      </Field>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? "Saving…"
            : mode === "create"
              ? "Create document"
              : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/documents")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
