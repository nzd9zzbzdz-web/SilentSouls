"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Loader2, MailPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { createMember, inviteMember, updateMember } from "@/actions/members";
import type { MemberStatus, SystemRole } from "@/lib/types";

interface MemberRow {
  id: string;
  displayName: string;
  roadName: string;
  rankId: string;
  status: MemberStatus;
  memberNumber: number;
  hasAccount: boolean;
  joinDate: string;
}

interface RankOption {
  id: string;
  name: string;
  isOfficer: boolean;
}

const STATUSES: MemberStatus[] = [
  "hangaround",
  "prospect",
  "patched",
  "retired",
  "exiled",
];

export function MemberAdmin({
  orgId,
  members,
  ranks,
}: {
  orgId: string;
  members: MemberRow[];
  ranks: RankOption[];
}) {
  const router = useRouter();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    roadName: "",
    rankId: "",
    status: "hangaround" as MemberStatus,
    joinDate: new Date().toISOString().slice(0, 10),
  });
  const [inviteTarget, setInviteTarget] = useState<MemberRow | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<SystemRole>("member");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rankById = new Map(ranks.map((r) => [r.id, r]));

  function openCreate() {
    setEditing(null);
    setForm({
      displayName: "",
      roadName: "",
      rankId: ranks.find((r) => !r.isOfficer)?.id ?? ranks[0]?.id ?? "",
      status: "hangaround",
      joinDate: new Date().toISOString().slice(0, 10),
    });
    setEditorOpen(true);
  }

  function openEdit(member: MemberRow) {
    setEditing(member);
    setForm({
      displayName: member.displayName,
      roadName: member.roadName,
      rankId: member.rankId,
      status: member.status,
      joinDate: member.joinDate,
    });
    setEditorOpen(true);
  }

  function save() {
    startTransition(async () => {
      const payload = {
        orgId,
        displayName: form.displayName.trim(),
        roadName: form.roadName.trim(),
        rankId: form.rankId,
        status: form.status,
        joinDate: new Date(form.joinDate),
      };
      const result = editing
        ? await updateMember({ ...payload, memberId: editing.id })
        : await createMember(payload);
      if (result.ok) {
        toast.success(editing ? "Member updated" : "Member created");
        setEditorOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Save failed");
      }
    });
  }

  function sendInvite() {
    if (!inviteTarget) return;
    startTransition(async () => {
      const result = await inviteMember({
        orgId,
        memberId: inviteTarget.id,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      if (result.ok && result.data) {
        setInviteUrl(result.data.inviteUrl);
        toast.success("Invite created");
      } else {
        toast.error(result.error ?? "Invite failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="size-4" aria-hidden />
          New member
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <p className="font-semibold">&ldquo;{member.roadName}&rdquo;</p>
                  <p className="text-xs text-muted-foreground">
                    {member.displayName} · #{member.memberNumber}
                  </p>
                </TableCell>
                <TableCell>{rankById.get(member.rankId)?.name ?? "—"}</TableCell>
                <TableCell className="capitalize">{member.status}</TableCell>
                <TableCell>
                  <Badge variant={member.hasAccount ? "default" : "secondary"}>
                    {member.hasAccount ? "Linked" : "No account"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(member)}>
                      Edit
                    </Button>
                    {!member.hasAccount && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setInviteTarget(member);
                          setInviteEmail("");
                          setInviteRole("member");
                          setInviteUrl(null);
                        }}
                      >
                        <MailPlus className="size-3.5" aria-hidden />
                        Invite
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create / edit dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit "${editing.roadName}"` : "New member"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Rank changes are logged to the service record."
                : "Creates the club record — send an invite afterwards to link an account."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="member-name">
                  Full name <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Input
                  id="member-name"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="member-road">
                  Road name <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Input
                  id="member-road"
                  value={form.roadName}
                  onChange={(e) => setForm({ ...form, roadName: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="member-rank">Rank</Label>
                <Select
                  value={form.rankId}
                  onValueChange={(v) => setForm({ ...form, rankId: v })}
                >
                  <SelectTrigger id="member-rank" className="mt-1 w-full">
                    <SelectValue placeholder="Pick a rank" />
                  </SelectTrigger>
                  <SelectContent>
                    {ranks.map((rank) => (
                      <SelectItem key={rank.id} value={rank.id}>
                        {rank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="member-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as MemberStatus })}
                >
                  <SelectTrigger id="member-status" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="member-joined">Join date</Label>
              <Input
                id="member-joined"
                type="date"
                value={form.joinDate}
                onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={
                pending ||
                form.displayName.trim().length < 2 ||
                !form.roadName.trim() ||
                !form.rankId
              }
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {editing ? "Save changes" : "Create member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog
        open={inviteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setInviteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite &ldquo;{inviteTarget?.roadName}&rdquo;</DialogTitle>
            <DialogDescription>
              Generates a one-time signup link (expires in 7 days). Share it through
              a channel you trust.
            </DialogDescription>
          </DialogHeader>
          {inviteUrl ? (
            <div className="space-y-3">
              <p className="text-sm">Invite link created:</p>
              <div className="flex items-center gap-2">
                <Input readOnly value={inviteUrl} className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copy invite link"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + inviteUrl);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-email">
                  Email <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Portal role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as SystemRole)}
                >
                  <SelectTrigger id="invite-role" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="officer">Officer</SelectItem>
                    <SelectItem value="admin">Organization Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Portal permissions — separate from club rank.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteTarget(null)}>
              {inviteUrl ? "Done" : "Cancel"}
            </Button>
            {!inviteUrl && (
              <Button
                onClick={sendInvite}
                disabled={pending || !inviteEmail.includes("@")}
              >
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Create invite
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
