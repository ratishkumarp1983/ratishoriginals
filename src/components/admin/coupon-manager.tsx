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
import { Badge } from "@/components/ui/badge";

interface CouponRow {
  id: string;
  code: string;
  discountType: string;
  discountValue: string;
  expiryDate: string | null;
  usageLimit: number | null;
  usedCount: number;
  oneTimePerUser: boolean;
  memberOnly: boolean;
  active: boolean;
  documentTitle: string | null;
}

export function CouponManager({
  documents,
  initialCoupons,
}: {
  documents: { id: string; title: string }[];
  initialCoupons: CouponRow[];
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [value, setValue] = useState("");
  const [expiry, setExpiry] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [oneTime, setOneTime] = useState(false);
  const [memberOnly, setMemberOnly] = useState(false);
  const [documentId, setDocumentId] = useState("all");
  const [creating, setCreating] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        discountType,
        discountValue: value,
        expiryDate: expiry,
        usageLimit,
        oneTimePerUser: oneTime,
        memberOnly,
        documentId: documentId === "all" ? "" : documentId,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error ?? "Could not create coupon");
      return;
    }
    toast.success(`Coupon ${code.toUpperCase()} created`);
    setCode("");
    setValue("");
    setExpiry("");
    setUsageLimit("");
    setOneTime(false);
    setMemberOnly(false);
    setDocumentId("all");
    router.refresh();
  }

  async function toggleActive(c: CouponRow) {
    const res = await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    if (!res.ok) return toast.error("Could not update coupon");
    router.refresh();
  }

  async function remove(c: CouponRow) {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    const res = await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not delete coupon");
    toast.success("Coupon deleted");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={create}
        className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-200 p-5 sm:grid-cols-2 dark:border-neutral-800"
      >
        <div className="space-y-2">
          <Label htmlFor="c-code">Code</Label>
          <Input
            id="c-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="WELCOME10"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={discountType} onValueChange={(v) => setDiscountType(v as "PERCENTAGE" | "FIXED")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                <SelectItem value="FIXED">Fixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-value">
              {discountType === "PERCENTAGE" ? "Percent" : "Amount"}
            </Label>
            <Input
              id="c-value"
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-expiry">Expiry (optional)</Label>
          <Input id="c-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-limit">Usage limit (optional)</Label>
          <Input
            id="c-limit"
            type="number"
            min="1"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="Unlimited"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Applies to</Label>
          <Select value={documentId} onValueChange={(v) => setDocumentId(v ?? "all")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All titles</SelectItem>
              {documents.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={oneTime} onCheckedChange={setOneTime} /> One use per reader
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={memberOnly} onCheckedChange={setMemberOnly} /> Members only
        </label>
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          Each coupon is limited to one redemption per reader, enforced in the
          database. In the rare case a reader opens two checkouts at the exact
          same instant, the discount can apply to one extra paid order beyond the
          limit; the reader still pays the discounted price on each.
        </p>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={creating || !code || !value}>
            {creating ? "Creating..." : "Create coupon"}
          </Button>
        </div>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Used</TableHead>
            <TableHead>Rules</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialCoupons.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-neutral-500">
                No coupons yet.
              </TableCell>
            </TableRow>
          ) : (
            initialCoupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm font-medium">{c.code}</TableCell>
                <TableCell>
                  {c.discountType === "PERCENTAGE"
                    ? `${Number(c.discountValue)}%`
                    : Number(c.discountValue).toFixed(2)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {c.usedCount}
                  {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.documentTitle && <Badge variant="secondary">{c.documentTitle}</Badge>}
                    {c.memberOnly && <Badge variant="secondary">Members</Badge>}
                    {c.oneTimePerUser && <Badge variant="secondary">1 per reader</Badge>}
                    {c.expiryDate && <Badge variant="secondary">Ends {c.expiryDate}</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} aria-label="Active" />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => remove(c)}>
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
