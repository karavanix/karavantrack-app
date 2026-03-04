import { useState, useEffect, useCallback } from "react";
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
import { Users, Plus, Trash2, AlertCircle } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Member, PaginatedResponse } from "@/types";

export default function MembersPage() {
  const { selectedCompanyId } = useCompanyStore();
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ user_id: "", alias: "", role: "member" as "admin" | "member" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchMembers = useCallback(async () => {
    if (!selectedCompanyId) return;
    setIsLoading(true);
    try {
      const { data } = await api.get<PaginatedResponse<Member> | Member[]>(`/companies/${selectedCompanyId}/members`);
      setMembers(Array.isArray(data) ? data : (data?.result ?? []));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      await api.post(`/companies/${selectedCompanyId}/members`, addForm);
      setAddOpen(false);
      setAddForm({ user_id: "", alias: "", role: "member" });
      await fetchMembers();
    } catch (err) {
      setAddError(getApiErrorMessage(err));
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.delete(`/companies/${selectedCompanyId}/members/${memberId}`);
      await fetchMembers();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const columns: ColumnDef<Member>[] = [
    {
      accessorKey: "alias",
      header: t("members_col_alias"),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.alias || "—"}</span>
      ),
    },
    {
      accessorKey: "member_id",
      header: t("members_col_user_id"),
      cell: ({ row }) => (
        <code className="text-xs text-muted-foreground">{row.original.member_id}</code>
      ),
    },
    {
      accessorKey: "role",
      header: t("members_col_role"),
      cell: ({ row }) => (
        <Badge variant={row.original.role === "admin" ? "default" : "secondary"}>
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("members_col_joined"),
      cell: ({ row }) =>
        row.original.created_at
          ? new Date(row.original.created_at).toLocaleDateString()
          : "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
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
      ),
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("members_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("members_subtitle")}</p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus size={16} />
              {t("members_add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("members_dialog_title")}</DialogTitle>
              <DialogDescription>{t("members_dialog_desc")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4">
              {addError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle size={16} className="shrink-0" />
                  {addError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="member-user-id">{t("members_user_id_label")}</Label>
                <Input
                  id="member-user-id"
                  placeholder={t("members_user_id_placeholder")}
                  value={addForm.user_id}
                  onChange={(e) => setAddForm((p) => ({ ...p, user_id: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-alias">{t("members_alias_label")}</Label>
                <Input
                  id="member-alias"
                  placeholder={t("members_alias_placeholder")}
                  value={addForm.alias}
                  onChange={(e) => setAddForm((p) => ({ ...p, alias: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("members_role_label")}</Label>
                <div className="flex gap-2">
                  {(["member", "admin"] as const).map((role) => (
                    <Button
                      key={role}
                      type="button"
                      variant={addForm.role === role ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAddForm((p) => ({ ...p, role }))}
                      className="capitalize"
                    >
                      {role}
                    </Button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                >
                  {t("members_cancel")}
                </Button>
                <Button type="submit" disabled={addLoading}>
                  {addLoading ? <Spinner size={16} className="text-primary-foreground" /> : null}
                  {t("members_add")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size={24} />
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title={t("members_empty")}
          description={t("members_empty_desc")}
          action={{ label: t("members_add"), onClick: () => setAddOpen(true) }}
        />
      ) : (
        <DataTable columns={columns} data={members} />
      )}
    </div>
  );
}
