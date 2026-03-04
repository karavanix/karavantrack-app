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
import { Users, Plus, Trash2, AlertCircle, Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Member, MemberSearchResult, PaginatedResponse } from "@/types";

export default function MembersPage() {
  const { selectedCompanyId } = useCompanyStore();
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MemberSearchResult | null>(null);
  const [alias, setAlias] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

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

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedUser(null);

    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await api.get<PaginatedResponse<MemberSearchResult> | MemberSearchResult[]>(
          "/users/shippers/search",
          { params: { q: value.trim() } }
        );
        setSearchResults(Array.isArray(data) ? data : (data?.result ?? []));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleAddMember = async () => {
    if (!selectedUser || !selectedCompanyId) return;
    setAddError("");
    setAddLoading(true);
    try {
      await api.post(`/companies/${selectedCompanyId}/members`, {
        user_id: selectedUser.id,
        alias: alias.trim() || `${selectedUser.first_name} ${selectedUser.last_name}`.trim(),
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
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setAlias("");
    setRole("member");
    setAddError("");
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

        <Dialog
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) resetAddForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus size={16} />
              {t("members_add")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("members_dialog_title")}</DialogTitle>
              <DialogDescription>{t("members_dialog_desc")}</DialogDescription>
            </DialogHeader>

            {addError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle size={16} className="shrink-0" />
                {addError}
              </div>
            )}

            {/* Search */}
            <div className="space-y-2">
              <Label>{t("members_search_label")}</Label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("members_search_placeholder")}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            {/* Search results */}
            {isSearching && (
              <div className="flex justify-center py-4">
                <Spinner size={20} />
              </div>
            )}
            {!isSearching && searchResults.length > 0 && (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-1">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(user);
                      setAlias(`${user.first_name} ${user.last_name}`.trim());
                    }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                      selectedUser?.id === user.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {user.first_name?.[0]}
                      {user.last_name?.[0]}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium truncate">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email || user.phone}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="py-3 text-center text-sm text-muted-foreground">
                {t("members_no_results", { query: searchQuery })}
              </p>
            )}

            {/* Alias & Role — only shown after selecting a user */}
            {selectedUser && (
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
                    {(["member", "admin"] as const).map((r) => (
                      <Button
                        key={r}
                        type="button"
                        variant={role === r ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRole(r)}
                        className="capitalize"
                      >
                        {r}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                {t("members_cancel")}
              </Button>
              <Button onClick={handleAddMember} disabled={!selectedUser || addLoading}>
                {addLoading ? <Spinner size={16} className="text-primary-foreground" /> : null}
                {t("members_add")}
              </Button>
            </DialogFooter>
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
