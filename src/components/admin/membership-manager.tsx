"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface PlanRow {
  id: string;
  name: string;
  price: string;
  currency: string;
  durationDays: number;
  benefits: string;
  active: boolean;
  subscribers: number;
  documentIds: string[];
}

export function MembershipManager({
  documents,
  initialPlans,
}: {
  documents: { id: string; title: string }[];
  initialPlans: PlanRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("365");
  const [benefits, setBenefits] = useState("");
  const [creating, setCreating] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, durationDays, benefits }),
    });
    setCreating(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error ?? "Could not create plan");
      return;
    }
    toast.success(`Plan "${name}" created`);
    setName("");
    setPrice("");
    setDurationDays("365");
    setBenefits("");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={create}
        className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-200 p-5 sm:grid-cols-2 dark:border-neutral-800"
      >
        <div className="space-y-2">
          <Label htmlFor="p-name">Plan name</Label>
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Premium Reader" required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="p-price">Price</Label>
            <Input id="p-price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-duration">Duration (days)</Label>
            <Input id="p-duration" type="number" min="1" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} required />
          </div>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="p-benefits">Benefits (one per line)</Label>
          <Textarea id="p-benefits" rows={3} value={benefits} onChange={(e) => setBenefits(e.target.value)} placeholder={"Member-only titles\nMember discounts\nEarly access"} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={creating || !name || !price}>
            {creating ? "Creating..." : "Create plan"}
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        {initialPlans.length === 0 ? (
          <p className="text-sm text-neutral-500">No plans yet.</p>
        ) : (
          initialPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} documents={documents} />
          ))
        )}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  documents,
}: {
  plan: PlanRow;
  documents: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(plan.documentIds));
  const [saving, setSaving] = useState(false);
  const dirty =
    selected.size !== plan.documentIds.length ||
    plan.documentIds.some((id) => !selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function patch(data: Record<string, unknown>, message?: string) {
    const res = await fetch(`/api/admin/memberships/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error ?? "Update failed");
      return false;
    }
    if (message) toast.success(message);
    router.refresh();
    return true;
  }

  async function remove() {
    if (!confirm(`Delete plan "${plan.name}"?`)) return;
    const res = await fetch(`/api/admin/memberships/${plan.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error ?? "Delete failed");
      return;
    }
    toast.success("Plan deleted");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{plan.name}</p>
          <p className="text-sm text-neutral-500">
            {plan.currency} {Number(plan.price).toFixed(2)} / {plan.durationDays} days ·{" "}
            {plan.subscribers} subscriber{plan.subscribers === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={plan.active}
              onCheckedChange={() => patch({ active: !plan.active })}
              aria-label="Active"
            />
            Active
          </label>
          <Button variant="ghost" size="sm" onClick={remove}>
            Delete
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Member-only titles
        </p>
        {documents.length === 0 ? (
          <p className="text-sm text-neutral-500">No documents yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {documents.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(d.id)}
                  onChange={() => toggle(d.id)}
                />
                {d.title}
              </label>
            ))}
          </div>
        )}
        {dirty && (
          <Button
            size="sm"
            className="mt-3"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await patch({ documentIds: [...selected] }, "Titles updated");
              setSaving(false);
            }}
          >
            {saving ? "Saving..." : "Save titles"}
          </Button>
        )}
      </div>
    </div>
  );
}
