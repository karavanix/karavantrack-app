import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCompanyStore } from "@/stores/company-store";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { LoadKanban } from "@/components/loads/load-kanban";
import { CreateLoadModal } from "@/components/loads/create-load-modal";
import {
  Package,
  Plus,
  Building2,
  Eye,
  RefreshCw,
  LayoutGrid,
  List,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Carrier, Load, LoadStats, PaginatedResponse } from "@/types";
import { utcToLocalDateDisplay } from "@/lib/date-utils";

type ViewMode = "kanban" | "list";

const LS_VIEW_MODE_KEY = "dashboard_view_mode";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedCompanyId, companies } = useCompanyStore();

  const [loads, setLoads] = useState<Load[]>([]);
  const [stats, setStats] = useState<LoadStats | null>(null);
  const [carrierMap, setCarrierMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(LS_VIEW_MODE_KEY);
    return saved === "list" ? "list" : "kanban";
  });

  // Persist view mode preference
  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(LS_VIEW_MODE_KEY, mode);
  };

  const STATUS_TABS = [
    { value: "all",          label: t("dashboard_tab_all") },
    { value: "created",      label: t("dashboard_tab_created") },
    { value: "assigned",     label: t("dashboard_tab_assigned") },
    { value: "accepted",     label: "Accepted" },
    { value: "picking_up",   label: t("status_picking_up") },
    { value: "picked_up",    label: t("status_picked_up") },
    { value: "in_transit",   label: t("dashboard_tab_in_transit") },
    { value: "dropping_off", label: t("status_dropping_off") },
    { value: "dropped_off",  label: t("status_dropped_off") },
    { value: "confirmed",    label: t("dashboard_tab_confirmed") },
    { value: "cancelled",    label: t("dashboard_tab_cancelled") },
  ] as const;

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return;
    setIsLoading(true);
    setError("");
    try {
      // In kanban mode: always fetch all loads so all columns are populated
      // In list mode: filter by active tab
      const loadsParams: Record<string, string | number | string[]> = { limit: 200, offset: 0 };
      if (viewMode === "list" && activeTab !== "all") loadsParams.status = [activeTab];

      const [loadsRes, statsRes, carriersRes] = await Promise.all([
        api.get<PaginatedResponse<Load> | Load[]>(
          `/companies/${selectedCompanyId}/loads`,
          {
            params: loadsParams,
            paramsSerializer: (params) => {
              const parts: string[] = [];
              for (const [key, val] of Object.entries(params)) {
                if (Array.isArray(val)) {
                  val.forEach((v) => parts.push(`${key}=${encodeURIComponent(v)}`));
                } else {
                  parts.push(`${key}=${encodeURIComponent(val)}`);
                }
              }
              return parts.join("&");
            },
          }
        ),
        api.get<LoadStats>(`/companies/${selectedCompanyId}/loads/stats`),
        api.get<PaginatedResponse<Carrier> | Carrier[]>(`/companies/${selectedCompanyId}/carriers`),
      ]);

      setLoads(Array.isArray(loadsRes.data) ? loadsRes.data : (loadsRes.data?.result ?? []));
      setStats(statsRes.data);

      const carrierList = Array.isArray(carriersRes.data)
        ? carriersRes.data
        : (carriersRes.data?.result ?? []);
      const map: Record<string, string> = {};
      for (const c of carrierList) {
        map[c.carrier_id] = c.alias || `${c.first_name} ${c.last_name}`.trim();
      }
      setCarrierMap(map);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId, activeTab, viewMode]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Table columns ──
  const columns: ColumnDef<Load>[] = [
    {
      accessorKey: "reference_id",
      header: t("dashboard_col_ref"),
      cell: ({ row }) => (
        <code className="text-xs text-muted-foreground">{row.original.reference_id || "—"}</code>
      ),
    },
    {
      accessorKey: "title",
      header: t("dashboard_col_title"),
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    },
    {
      accessorKey: "status",
      header: t("dashboard_col_status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "carrier_id",
      header: t("dashboard_col_carrier"),
      cell: ({ row }) => {
        const name = row.original.carrier_id ? carrierMap[row.original.carrier_id] : null;
        return <span className="text-sm text-muted-foreground">{name ?? "—"}</span>;
      },
    },
    {
      accessorKey: "pickup_address",
      header: t("dashboard_col_pickup"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.pickup_address ||
            `${row.original.pickup_lat?.toFixed(4)}, ${row.original.pickup_lng?.toFixed(4)}`}
        </span>
      ),
    },
    {
      accessorKey: "dropoff_address",
      header: t("dashboard_col_dropoff"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.dropoff_address ||
            `${row.original.dropoff_lat?.toFixed(4)}, ${row.original.dropoff_lng?.toFixed(4)}`}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("dashboard_col_created"),
      cell: ({ row }) => utcToLocalDateDisplay(row.original.created_at),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); navigate(`/loads/${row.original.id}`); }}
          className="gap-1"
        >
          <Eye size={14} />
          {t("dashboard_view")}
        </Button>
      ),
    },
  ];

  // ── Empty / no-company states ──
  if (companies.length === 0) {
    return (
      <EmptyState
        icon={<Building2 size={32} />}
        title={t("dashboard_welcome_title")}
        description={t("dashboard_welcome_desc")}
        action={{ label: t("dashboard_welcome_action"), onClick: () => navigate("/company/new") }}
      />
    );
  }

  if (!selectedCompanyId) {
    return (
      <EmptyState
        icon={<Package size={32} />}
        title={t("dashboard_no_company")}
        description={t("dashboard_no_company_desc")}
      />
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("dashboard_title")}</h1>
            <p className="text-sm text-muted-foreground">{t("dashboard_subtitle")}</p>
          </div>
          <Button id="new-load-btn" onClick={() => setCreateModalOpen(true)} className="gap-1.5">
            <Plus size={16} />
            {t("dashboard_new_load")}
          </Button>
        </div>

        {/* ── View toggle + Reload ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center rounded-lg border overflow-hidden">
            <button
              id="view-kanban-btn"
              type="button"
              onClick={() => handleSetViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "kanban"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <LayoutGrid size={15} />
              {t("dashboard_view_kanban")}
            </button>
            <button
              id="view-list-btn"
              type="button"
              onClick={() => handleSetViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <List size={15} />
              {t("dashboard_view_list")}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            {t("common_reload", "Reload")}
          </Button>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {/* ── Kanban view ── */}
        {viewMode === "kanban" && (
          <LoadKanban
            loads={loads}
            stats={stats}
            carrierMap={carrierMap}
            isLoading={isLoading}
          />
        )}

        {/* ── List view ── */}
        {viewMode === "list" && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto gap-1">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {STATUS_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-4">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Spinner size={24} />
                  </div>
                ) : loads.length === 0 ? (
                  <EmptyState
                    icon={<Package size={32} />}
                    title={t("dashboard_no_loads")}
                    description={
                      activeTab === "all"
                        ? t("dashboard_no_loads_desc_all")
                        : t("dashboard_no_loads_desc_status", { status: tab.label })
                    }
                    action={
                      activeTab === "all"
                        ? { label: t("dashboard_create_load"), onClick: () => setCreateModalOpen(true) }
                        : undefined
                    }
                  />
                ) : (
                  <DataTable
                    columns={columns}
                    data={loads}
                    onRowClick={(load) => navigate(`/loads/${load.id}`)}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {/* ── Create Load Modal ── */}
      <CreateLoadModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={fetchData}
      />
    </>
  );
}
