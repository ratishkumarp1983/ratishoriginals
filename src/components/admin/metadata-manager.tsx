"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TYPES = ["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT"] as const;

export interface FieldRow {
  id: string;
  name: string;
  key: string;
  type: string;
  displayOrder: number;
  active: boolean;
}

export function MetadataManager({ initialFields }: { initialFields: FieldRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("TEXT");
  const [order, setOrder] = useState("0");
  const [creating, setCreating] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        key: key || undefined,
        type,
        displayOrder: Number(order) || 0,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error ?? "Could not create field");
      return;
    }
    toast.success(`Field "${name}" added`);
    setName("");
    setKey("");
    setOrder("0");
    router.refresh();
  }

  async function toggleActive(field: FieldRow) {
    const res = await fetch(`/api/admin/metadata/${field.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !field.active }),
    });
    if (!res.ok) {
      toast.error("Could not update field");
      return;
    }
    router.refresh();
  }

  async function remove(field: FieldRow) {
    if (!confirm(`Delete "${field.name}"? Values on documents will be removed.`))
      return;
    const res = await fetch(`/api/admin/metadata/${field.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Could not delete field");
      return;
    }
    toast.success("Field deleted");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={create}
        className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-200 p-5 sm:grid-cols-2 dark:border-neutral-800"
      >
        <div className="space-y-2">
          <Label htmlFor="m-name">Name</Label>
          <Input
            id="m-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Reading Time"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-key">Key (optional)</Label>
          <Input
            id="m-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="reading_time"
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-order">Display order</Label>
          <Input
            id="m-order"
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={creating || !name}>
            {creating ? "Adding…" : "Add field"}
          </Button>
        </div>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialFields.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-neutral-500">
                No metadata fields yet.
              </TableCell>
            </TableRow>
          ) : (
            initialFields.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell className="font-mono text-xs text-neutral-500">
                  {f.key}
                </TableCell>
                <TableCell>{f.type}</TableCell>
                <TableCell>{f.displayOrder}</TableCell>
                <TableCell>
                  <Switch
                    checked={f.active}
                    onCheckedChange={() => toggleActive(f)}
                    aria-label="Active"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => remove(f)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
