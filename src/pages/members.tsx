import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useCompanyStore } from "@/stores/company-store";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, AlertCircle, Search, Mail } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Member, GetShipperByContactResponse } from "@/types";

export default function MembersPage() {
  const { selectedCompanyId, hasPermission } = useCompanyStore();
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Table search
  const [tableSearch, setTableSearch] = useState("");
  const tableSearchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);

  // By-contact
  const [contact, setContact] = useState("");
  const [contactResult, setContactResult] = useState<GetShipperByContactResponse | null>(null);
  const [contactSearching, setContactSearching] = useState(false);
  const [contactNotFound, setContactNotFound] = useState(false);
  const [selectedContact, setSelectedContact] = useState<GetShipperByContactResponse | null>(null);

  // Invite
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteDone, setInviteDone] = useState(false);

  // Alias, role & submit
  const [alias, setAlias] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Fetch member list
  const fetchMembers = useCallback(
    async (q?: string) => {
      if (!selectedCompanyId) return;
      setIsLoading(true);
      try {
        const { data } = await api.get<Member[]>(`/companies/${selectedCompanyId}/members`, {
          params: q ? { q } : undefined,
        });
        setMembers(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [selectedCompanyId]
  );

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleTableSearch = (value: string) => {
    setTableSearch(value);
    if (tableSearchTimer.current) clearTimeout(tableSearchTimer.current);
    tableSearchTimer.current = setTimeout(() => fetchMembers(value.trim() || undefined), 350);
  };

  // By-contact lookup
  const handleContactSearch = async () => {
    const c = contact.trim();
    if (!c) return;
    setContactSearching(true);
    setContactResult(null);
    setContactNotFound(false);
    setSelectedContact(null);
    try {
      const { data } = await api.get<GetShipperByContactResponse>("/users/shippers/by-contact", {
        params: { contact: c },
      });
      const results = data ? [data] : [];
      if (results.length > 0) {
        setContactResult(results[0]);
        setSelectedContact(results[0]);
        setAlias(`${results[0].first_name} ${results[0].last_name}`.trim());
      } else {
        setContactNotFound(true);
      }
    } catch {
      setContactNotFound(true);
    } finally {
      setContactSearching(false);
    }
  };

  // Invite
  const handleInvite = async () => {
    setInviteLoading(true);
    setAddError("");
    try {
      await api.post("/users/invite", { contact: contact.trim(), role: "shipper" });
      setInviteDone(true);
    } catch (err) {
      setAddError(getApiErrorMessage(err));
    } finally {
      setInviteLoading(false);
    }
  };

  // Add member
  const handleAddMember = async () => {
    if (!selectedContact || !selectedCompanyId) return;
    setAddError("");
    setAddLoading(true);
    try {
      await api.post(`/companies/${selectedCompanyId}/members`, {
        user_id: selectedContact.id,
        alias: alias.trim() || `${selectedContact.first_name} ${selectedContact.last_name}`.trim(),
        role,
      });
      setAddOpen(false);
      resetAddForm();
      await fetchMembers();
    } catch (err) {
      setAddError(getApiErrorMessage(err));
    } finally {
      setAddLoading(false);
    }
  };

  const resetAddForm = () => {
    setContact("");
    setContactResult(null);
    setContactNotFound(false);
    setSelectedContact(null);
    setInviteDone(false);
    setAlias("");
    setRole("member");
    setAddError("");
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.delete(`/companies/${selectedCompanyId}/members/${memberId}`);
      await fetchMembers(tableSearch.trim() || undefined);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const canCreateMember = hasPermission("company.member.create.member");
  const canCreateAdmin = hasPermission("company.member.create.admin");
  const canCreate = canCreateMember || canCreateAdmin;
  const canDeleteMember = hasPermission("company.member.delete.member");
  const canDeleteAdmin = hasPermission("company.member.delete.admin");
  const canDeleteRow = (row: Member) => row.role === "admin" ? canDeleteAdmin : canDeleteMember;

  const columns: ColumnDef<Member>[] = [
    {
      accessorKey: "alias",
      header: t("members_col_alias"),
      cell: ({ row }) => <span className="font-medium">{row.original.alias || "—"}</span>,
    },
    {
      id: "name",
      header: t("members_col_name"),
      cell: ({ row }) => <span>{row.original.first_name} {row.original.last_name}</span>,
    },
    {
      accessorKey: "member_id",
      header: t("members_col_user_id"),
      cell: ({ row }) => <code className="text-xs text-muted-foreground">{row.original.member_id}</code>,
    },
    {
      accessorKey: "role",
      header: t("members_col_role"),
      cell: ({ row }) => (
        <Badge variant={row.original.role === "admin" ? "default" : "secondary"}>{row.original.role}</Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("members_col_joined"),
      cell: ({ row }) => row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        canDeleteRow(row.original) ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 size={14} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("members_remove_title")}</AlertDialogTitle>
                <AlertDialogDescription>{t("members_remove_desc")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("members_remove_cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleRemoveMember(row.original.member_id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t("members_remove_confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null,
    },
  ];

  if (!selectedCompanyId) {
    return (
      <EmptyState
        icon={<Users size={32} />}
        title={t("members_no_company")}
        description={t("members_no_company_desc")}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("members_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("members_subtitle")}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("members_search_placeholder")}
              value={tableSearch}
              onChange={(e) => handleTableSearch(e.target.value)}
              className="pl-9 w-56"
            />
          </div>

          {canCreate && (
            <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus size={16} />{t("members_add")}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("members_dialog_title")}</DialogTitle>
                  <DialogDescription>{t("members_contact_hint")}</DialogDescription>
                </DialogHeader>

                {addError && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle size={16} className="shrink-0" />{addError}
                  </div>
                )}

                {/* Contact search */}
                <div className="space-y-2">
                  <Label>{t("members_contact_label")}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("members_contact_placeholder")}
                      value={contact}
                      onChange={(e) => {
                        setContact(e.target.value);
                        setContactResult(null);
                        setContactNotFound(false);
                        setSelectedContact(null);
                        setInviteDone(false);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleContactSearch()}
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleContactSearch}
                      disabled={!contact.trim() || contactSearching}
                    >
                      {contactSearching ? <Spinner size={16} /> : <Search size={16} />}
                    </Button>
                  </div>
                </div>

                {/* Found */}
                {contactResult && (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                      {contactResult.first_name?.[0]}{contactResult.last_name?.[0]}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium truncate">{contactResult.first_name} {contactResult.last_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{contactResult.email || contactResult.phone}</p>
                    </div>
                  </div>
                )}

                {/* Not found → invite */}
                {contactNotFound && !inviteDone && (
                  <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">{t("members_not_found")}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleInvite}
                      disabled={inviteLoading}
                      className="gap-2"
                    >
                      {inviteLoading ? <Spinner size={14} /> : <Mail size={14} />}
                      {t("members_invite")}
                    </Button>
                  </div>
                )}

                {inviteDone && (
                  <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-700 dark:text-green-400">
                    {t("members_invite_sent")}
                  </div>
                )}

                {/* Alias & role when result found */}
                {selectedContact && !inviteDone && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="member-alias">{t("members_alias_label")}</Label>
                      <Input
                        id="member-alias"
                        placeholder={t("members_alias_placeholder")}
                        value={alias}
                        onChange={(e) => setAlias(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("members_role_label")}</Label>
                      <div className="flex gap-2">
                        {canCreateMember && (
                          <Button type="button" variant={role === "member" ? "default" : "outline"} size="sm" onClick={() => setRole("member")}>
                            {t("members_role_member")}
                          </Button>
                        )}
                        {canCreateAdmin && (
                          <Button type="button" variant={role === "admin" ? "default" : "outline"} size="sm" onClick={() => setRole("admin")}>
                            {t("members_role_admin")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>{t("members_cancel")}</Button>
                  <Button onClick={handleAddMember} disabled={!selectedContact || addLoading || inviteDone}>
                    {addLoading ? <Spinner size={16} className="text-primary-foreground" /> : null}
                    {t("members_add")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle size={16} className="shrink-0" />{error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size={24} /></div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title={t("members_empty")}
          description={t("members_empty_desc")}
          action={canCreate ? { label: t("members_add"), onClick: () => setAddOpen(true) } : undefined}
        />
      ) : (
        <DataTable columns={columns} data={members} />
      )}
    </div>
  );
}
