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
import { Truck, Plus, Trash2, AlertCircle, Search, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import type { Carrier, GetCarrierByContactResponse } from "@/types";

// ──── Search tabs ────
type SearchTab = "my-carriers" | "by-contact";

export default function CarriersPage() {
  const { selectedCompanyId, hasPermission } = useCompanyStore();
  const { t } = useTranslation();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Table search ──
  const [tableSearch, setTableSearch] = useState("");
  const tableSearchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // ── Add dialog state ──
  const [addOpen, setAddOpen] = useState(false);
  const [searchTab, setSearchTab] = useState<SearchTab>("my-carriers");

  // -- Tier 1: my carriers --
  const [myQuery, setMyQuery] = useState("");
  const [myResults, setMyResults] = useState<Carrier[]>([]);
  const [mySearching, setMySearching] = useState(false);
  const [selectedMyCarrier, setSelectedMyCarrier] = useState<Carrier | null>(null);
  const myTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // -- Tier 2: by contact --
  const [contact, setContact] = useState("");
  const [contactResult, setContactResult] = useState<GetCarrierByContactResponse | null>(null);
  const [contactSearching, setContactSearching] = useState(false);
  const [contactNotFound, setContactNotFound] = useState(false);
  const [selectedContact, setSelectedContact] = useState<GetCarrierByContactResponse | null>(null);

  // -- Invite --
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteDone, setInviteDone] = useState(false);

  // -- Alias & submit --
  const [alias, setAlias] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // ── Fetch carrier list (with optional search) ──
  const fetchCarriers = useCallback(
    async (q?: string) => {
      if (!selectedCompanyId) return;
      setIsLoading(true);
      try {
        const { data } = await api.get<Carrier[]>(`/companies/${selectedCompanyId}/carriers`, {
          params: q ? { q } : undefined,
        });
        setCarriers(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [selectedCompanyId]
  );

  useEffect(() => {
    fetchCarriers();
  }, [fetchCarriers]);

  // ── Table search with debounce ──
  const handleTableSearch = (value: string) => {
    setTableSearch(value);
    if (tableSearchTimer.current) clearTimeout(tableSearchTimer.current);
    tableSearchTimer.current = setTimeout(() => fetchCarriers(value.trim() || undefined), 350);
  };

  // ── Dialog tier-1: search within my carriers ──
  const handleMyQuery = (value: string) => {
    setMyQuery(value);
    setSelectedMyCarrier(null);
    if (myTimer.current) clearTimeout(myTimer.current);
    if (value.trim().length < 2) {
      setMyResults([]);
      return;
    }
    myTimer.current = setTimeout(async () => {
      setMySearching(true);
      try {
        const { data } = await api.get<Carrier[]>(`/companies/${selectedCompanyId}/carriers`, {
          params: { q: value.trim() },
        });
        setMyResults(Array.isArray(data) ? data : []);
      } catch {
        setMyResults([]);
      } finally {
        setMySearching(false);
      }
    }, 300);
  };

  // ── Dialog tier-2: lookup by contact ──
  const handleContactSearch = async () => {
    const c = contact.trim();
    if (!c) return;
    setContactSearching(true);
    setContactResult(null);
    setContactNotFound(false);
    setSelectedContact(null);
    try {
      const { data } = await api.get<GetCarrierByContactResponse[]>("/users/carriers/by-contact", {
        params: { contact: c },
      });
      const results = Array.isArray(data) ? data : [];
      if (results.length > 0) {
        setContactResult(results[0]);
      } else {
        setContactNotFound(true);
      }
    } catch {
      setContactNotFound(true);
    } finally {
      setContactSearching(false);
    }
  };

  // ── Invite ──
  const handleInvite = async () => {
    setInviteLoading(true);
    setAddError("");
    try {
      await api.post("/users/invite", { contact: contact.trim(), role: "carrier" });
      setInviteDone(true);
    } catch (err) {
      setAddError(getApiErrorMessage(err));
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Determine the selected result (either from my-carriers or by-contact) ──
  const activeSelection: { id: string; first_name: string; last_name: string } | null =
    searchTab === "my-carriers"
      ? selectedMyCarrier
        ? { id: selectedMyCarrier.carrier_id, first_name: selectedMyCarrier.first_name, last_name: selectedMyCarrier.last_name }
        : null
      : selectedContact
      ? { id: selectedContact.id, first_name: selectedContact.first_name, last_name: selectedContact.last_name }
      : null;

  // ── Add carrier ──
  const handleAddCarrier = async () => {
    if (!activeSelection || !selectedCompanyId) return;
    setAddError("");
    setAddLoading(true);
    try {
      await api.post(`/companies/${selectedCompanyId}/carriers`, {
        carrier_id: activeSelection.id,
        alias: alias.trim() || `${activeSelection.first_name} ${activeSelection.last_name}`.trim(),
      });
      setAddOpen(false);
      resetAddForm();
      await fetchCarriers();
    } catch (err) {
      setAddError(getApiErrorMessage(err));
    } finally {
      setAddLoading(false);
    }
  };

  const resetAddForm = () => {
    setSearchTab("my-carriers");
    setMyQuery("");
    setMyResults([]);
    setSelectedMyCarrier(null);
    setContact("");
    setContactResult(null);
    setContactNotFound(false);
    setSelectedContact(null);
    setInviteDone(false);
    setAlias("");
    setAddError("");
  };

  const handleRemoveCarrier = async (carrierId: string) => {
    try {
      await api.delete(`/companies/${selectedCompanyId}/carriers/${carrierId}`);
      await fetchCarriers(tableSearch.trim() || undefined);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const canCreate = hasPermission("company.carrier.create");
  const canDelete = hasPermission("company.carrier.delete");

  const columns: ColumnDef<Carrier>[] = [
    {
      accessorKey: "alias",
      header: t("carriers_col_alias"),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.alias || "—"}</span>
      ),
    },
    {
      id: "name",
      header: t("carriers_col_name"),
      cell: ({ row }) => (
        <span>
          {row.original.first_name} {row.original.last_name}
        </span>
      ),
    },
    {
      id: "status",
      header: t("carriers_col_status"),
      cell: ({ row }) => (
        <Badge variant={row.original.is_free ? "success" : "secondary"}>
          {row.original.is_free ? t("carriers_status_available") : t("carriers_status_busy")}
        </Badge>
      ),
    },
    {
      accessorKey: "carrier_id",
      header: t("carriers_col_id"),
      cell: ({ row }) => (
        <code className="text-xs text-muted-foreground">{row.original.carrier_id}</code>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("carriers_col_added"),
      cell: ({ row }) =>
        row.original.created_at
          ? new Date(row.original.created_at).toLocaleDateString()
          : "—",
    },
    ...(canDelete
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }: { row: { original: Carrier } }) => (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 size={14} />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("carriers_remove_title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("carriers_remove_desc", { name: row.original.alias || t("carriers_empty") })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("carriers_remove_cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemoveCarrier(row.original.carrier_id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("carriers_remove_confirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ),
          } as ColumnDef<Carrier>,
        ]
      : []),
  ];

  if (!selectedCompanyId) {
    return (
      <EmptyState
        icon={<Truck size={32} />}
        title={t("carriers_no_company")}
        description={t("carriers_no_company_desc")}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("carriers_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("carriers_subtitle")}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Table-level search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("carriers_search_placeholder")}
              value={tableSearch}
              onChange={(e) => handleTableSearch(e.target.value)}
              className="pl-9 w-56"
            />
          </div>

          {canCreate && (
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
                  {t("carriers_add")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("carriers_dialog_title")}</DialogTitle>
                  <DialogDescription>{t("carriers_dialog_desc")}</DialogDescription>
                </DialogHeader>

                {addError && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle size={16} className="shrink-0" />
                    {addError}
                  </div>
                )}

                {/* Tab switcher */}
                <div className="flex rounded-lg border overflow-hidden text-sm">
                  <button
                    type="button"
                    onClick={() => setSearchTab("my-carriers")}
                    className={`flex-1 py-2 px-3 transition-colors ${
                      searchTab === "my-carriers"
                        ? "bg-primary text-primary-foreground font-medium"
                        : "hover:bg-muted"
                    }`}
                  >
                    {t("carriers_tab_my")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchTab("by-contact")}
                    className={`flex-1 py-2 px-3 transition-colors ${
                      searchTab === "by-contact"
                        ? "bg-primary text-primary-foreground font-medium"
                        : "hover:bg-muted"
                    }`}
                  >
                    {t("carriers_tab_contact")}
                  </button>
                </div>

                {/* ──── Tab 1: My carriers ──── */}
                {searchTab === "my-carriers" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>{t("carriers_search_label")}</Label>
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder={t("carriers_search_placeholder")}
                          value={myQuery}
                          onChange={(e) => handleMyQuery(e.target.value)}
                          className="pl-9"
                          autoFocus
                        />
                      </div>
                    </div>

                    {mySearching && (
                      <div className="flex justify-center py-4">
                        <Spinner size={20} />
                      </div>
                    )}

                    {!mySearching && myResults.length > 0 && (
                      <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-1">
                        {myResults.map((c) => (
                          <button
                            key={c.carrier_id}
                            type="button"
                            onClick={() => {
                              setSelectedMyCarrier(c);
                              setAlias(c.alias || `${c.first_name} ${c.last_name}`.trim());
                            }}
                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                              selectedMyCarrier?.carrier_id === c.carrier_id
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted"
                            }`}
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold shrink-0">
                              {c.first_name?.[0]}
                              {c.last_name?.[0]}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="font-medium truncate">
                                {c.alias || `${c.first_name} ${c.last_name}`.trim()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {c.is_free ? t("carriers_status_available") : t("carriers_status_busy")}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!mySearching && myQuery.length >= 2 && myResults.length === 0 && (
                      <p className="py-2 text-center text-sm text-muted-foreground">
                        {t("carriers_no_results", { query: myQuery })}
                      </p>
                    )}
                  </div>
                )}

                {/* ──── Tab 2: By contact ──── */}
                {searchTab === "by-contact" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>{t("carriers_contact_label")}</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder={t("carriers_contact_placeholder")}
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
                      <p className="text-xs text-muted-foreground">{t("carriers_contact_hint")}</p>
                    </div>

                    {/* Found */}
                    {contactResult && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedContact(contactResult);
                          setAlias(`${contactResult.first_name} ${contactResult.last_name}`.trim());
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                          selectedContact?.id === contactResult.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold shrink-0">
                          {contactResult.first_name?.[0]}
                          {contactResult.last_name?.[0]}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-medium truncate">
                            {contactResult.first_name} {contactResult.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {contactResult.email || contactResult.phone}
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Not found → invite */}
                    {contactNotFound && !inviteDone && (
                      <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
                        <p className="text-sm text-muted-foreground">{t("carriers_not_found")}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleInvite}
                          disabled={inviteLoading}
                          className="gap-2"
                        >
                          {inviteLoading ? <Spinner size={14} /> : <Mail size={14} />}
                          {t("carriers_invite")}
                        </Button>
                      </div>
                    )}

                    {inviteDone && (
                      <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-700 dark:text-green-400">
                        {t("carriers_invite_sent")}
                      </div>
                    )}
                  </div>
                )}

                {/* Alias field when a carrier is selected */}
                {activeSelection && !inviteDone && (
                  <div className="space-y-2">
                    <Label htmlFor="carrier-alias">{t("carriers_alias_label")}</Label>
                    <Input
                      id="carrier-alias"
                      placeholder={t("carriers_alias_placeholder")}
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                    />
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    {t("carriers_cancel")}
                  </Button>
                  <Button
                    onClick={handleAddCarrier}
                    disabled={!activeSelection || addLoading || inviteDone}
                  >
                    {addLoading ? <Spinner size={16} className="text-primary-foreground" /> : null}
                    {t("carriers_add")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
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
      ) : carriers.length === 0 ? (
        <EmptyState
          icon={<Truck size={32} />}
          title={t("carriers_empty")}
          description={t("carriers_empty_desc")}
          action={
            canCreate
              ? { label: t("carriers_add"), onClick: () => setAddOpen(true) }
              : undefined
          }
        />
      ) : (
        <DataTable columns={columns} data={carriers} />
      )}
    </div>
  );
}
