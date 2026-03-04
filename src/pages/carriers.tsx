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
import { Truck, Plus, Trash2, AlertCircle, Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Carrier, CarrierSearchResult, PaginatedResponse } from "@/types";

export default function CarriersPage() {
  const { selectedCompanyId } = useCompanyStore();
  const { t } = useTranslation();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CarrierSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierSearchResult | null>(null);
  const [alias, setAlias] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchCarriers = useCallback(async () => {
    if (!selectedCompanyId) return;
    setIsLoading(true);
    try {
      const { data } = await api.get<PaginatedResponse<Carrier> | Carrier[]>(`/companies/${selectedCompanyId}/carriers`);
      setCarriers(Array.isArray(data) ? data : (data?.result ?? []));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    fetchCarriers();
  }, [fetchCarriers]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedCarrier(null);

    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await api.get<PaginatedResponse<CarrierSearchResult> | CarrierSearchResult[]>("/users/carriers/search", {
          params: { q: value.trim() },
        });
        setSearchResults(Array.isArray(data) ? data : (data?.result ?? []));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleAddCarrier = async () => {
    if (!selectedCarrier || !selectedCompanyId) return;
    setAddError("");
    setAddLoading(true);
    try {
      await api.post(`/companies/${selectedCompanyId}/carriers`, {
        carrier_id: selectedCarrier.id,
        alias: alias.trim() || `${selectedCarrier.first_name} ${selectedCarrier.last_name}`.trim(),
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
    setSearchQuery("");
    setSearchResults([]);
    setSelectedCarrier(null);
    setAlias("");
    setAddError("");
  };

  const handleRemoveCarrier = async (carrierId: string) => {
    try {
      await api.delete(`/companies/${selectedCompanyId}/carriers/${carrierId}`);
      await fetchCarriers();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

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
    },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("carriers_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("carriers_subtitle")}</p>
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

            {/* Search */}
            <div className="space-y-2">
              <Label>{t("carriers_search_label")}</Label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("carriers_search_placeholder")}
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
                {searchResults.map((carrier) => (
                  <button
                    key={carrier.id}
                    type="button"
                    onClick={() => {
                      setSelectedCarrier(carrier);
                      setAlias(`${carrier.first_name} ${carrier.last_name}`.trim());
                    }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                      selectedCarrier?.id === carrier.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {carrier.first_name?.[0]}
                      {carrier.last_name?.[0]}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium truncate">
                        {carrier.first_name} {carrier.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {carrier.email || carrier.phone}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="py-3 text-center text-sm text-muted-foreground">
                {t("carriers_no_results", { query: searchQuery })}
              </p>
            )}

            {/* Alias */}
            {selectedCarrier && (
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
                disabled={!selectedCarrier || addLoading}
              >
                {addLoading ? <Spinner size={16} className="text-primary-foreground" /> : null}
                {t("carriers_add")}
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
      ) : carriers.length === 0 ? (
        <EmptyState
          icon={<Truck size={32} />}
          title={t("carriers_empty")}
          description={t("carriers_empty_desc")}
          action={{ label: t("carriers_add"), onClick: () => setAddOpen(true) }}
        />
      ) : (
        <DataTable columns={columns} data={carriers} />
      )}
    </div>
  );
}
