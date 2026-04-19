import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCompanyStore } from "@/stores/company-store";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/status-badge";
import { LoadKanban, PHASE_COLUMNS } from "@/components/loads/load-kanban";
import type { PhaseLoads } from "@/components/loads/load-kanban";
import { LoadFilters } from "@/components/loads/load-filters";
import { CreateLoadModal } from "@/components/loads/create-load-modal";
import {
  Package,
  Plus,
  Building2,
  Eye,
  RefreshCw,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Carrier, Load, LoadStats, PaginatedResponse } from "@/types";
import { utcToLocalDateDisplay } from "@/lib/date-utils";

type ViewMode = "kanban" | "list";

const LS_VIEW_MODE_KEY = "dashboard_view_mode";
const LIST_LIMIT = 25;
const KANBAN_LIMIT = 20;

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractLoads(data: PaginatedResponse<Load> | Load[]): Load[] {
  return Array.isArray(data) ? data : (data?.result ?? []);
}

function extractCount(data: PaginatedResponse<Load> | Load[], fallback: number): number {
  return Array.isArray(data) ? fallback : (data?.count ?? fallback);
}

function serializeParams(params: Record<string, string | number | string[]>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(params)) {
    if (Array.isArray(val)) {
      val.forEach((v) => parts.push(`${key}=${encodeURIComponent(v)}`));
    } else {
      parts.push(`${key}=${encodeURIComponent(String(val))}`);
    }
  }
  return parts.join("&");
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedCompanyId, companies } = useCompanyStore();

  // ── Common state ──
  const [stats, setStats] = useState<LoadStats | null>(null);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carrierMap, setCarrierMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ── View mode ──
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(LS_VIEW_MODE_KEY);
    return saved === "list" ? "list" : "kanban";
  });

  // ── Filter state ──
  const [q, setQ] = useState("");
  const [carrierId, setCarrierId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ── List state ──
  const [listLoads, setListLoads] = useState<Load[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  // ── Kanban state ──
  const [kanbanPhaseData, setKanbanPhaseData] = useState<Record<string, PhaseLoads>>({});
  const [cancelledState, setCancelledState] = useState<PhaseLoads>({
    loads: [],
    hasMore: false,
    loadingMore: false,
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);

  // ── Fetch carriers once per company ──
  useEffect(() => {
    if (!selectedCompanyId) return;
    api
      .get<PaginatedResponse<Carrier> | Carrier[]>(`/companies/${selectedCompanyId}/carriers`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.result ?? []);
        setCarriers(list);
        const map: Record<string, string> = {};
        for (const c of list) map[c.carrier_id] = c.alias || `${c.first_name} ${c.last_name}`.trim();
        setCarrierMap(map);
      })
      .catch(() => {});
  }, [selectedCompanyId]);

  // ── Fetch kanban (parallel per phase) ──
  const fetchKanban = useCallback(async () => {
    if (!selectedCompanyId) return;
    setIsLoading(true);
    setError("");
    try {
      const extra: Record<string, string> = {};
      if (q) extra.q = q;
      if (carrierId) extra.carrier_id = carrierId;

      const [statsRes, ...allPhaseRes] = await Promise.all([
        api.get<LoadStats>(`/companies/${selectedCompanyId}/loads/stats`),
        ...PHASE_COLUMNS.map((phase) =>
          api.get<PaginatedResponse<Load> | Load[]>(`/companies/${selectedCompanyId}/loads`, {
            params: { ...extra, status: phase.statuses, limit: KANBAN_LIMIT, offset: 0 },
            paramsSerializer: serializeParams,
          })
        ),
        api.get<PaginatedResponse<Load> | Load[]>(`/companies/${selectedCompanyId}/loads`, {
          params: { ...extra, status: ["cancelled"], limit: KANBAN_LIMIT, offset: 0 },
          paramsSerializer: serializeParams,
        }),
      ]);

      setStats(statsRes.data);

      const newPhaseData: Record<string, PhaseLoads> = {};
      PHASE_COLUMNS.forEach((phase, i) => {
        const data = allPhaseRes[i].data;
        const loads = extractLoads(data);
        const total = extractCount(data, loads.length);
        newPhaseData[phase.label] = { loads, hasMore: loads.length < total, loadingMore: false };
      });
      setKanbanPhaseData(newPhaseData);

      const cancelledData = allPhaseRes[PHASE_COLUMNS.length].data;
      const cancelledLoads = extractLoads(cancelledData);
      const cancelledTotal = extractCount(cancelledData, cancelledLoads.length);
      setCancelledState({ loads: cancelledLoads, hasMore: cancelledLoads.length < cancelledTotal, loadingMore: false });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId, q, carrierId]);

  // ── Fetch list (paginated) ──
  const fetchList = useCallback(async () => {
    if (!selectedCompanyId) return;
    setIsLoading(true);
    setError("");
    try {
      const params: Record<string, string | number | string[]> = {
        limit: LIST_LIMIT,
        offset: page * LIST_LIMIT,
      };
      if (statusFilter !== "all") params.status = [statusFilter];
      if (q) params.q = q;
      if (carrierId) params.carrier_id = carrierId;

      const [loadsRes, statsRes] = await Promise.all([
        api.get<PaginatedResponse<Load> | Load[]>(`/companies/${selectedCompanyId}/loads`, {
          params,
          paramsSerializer: serializeParams,
        }),
        api.get<LoadStats>(`/companies/${selectedCompanyId}/loads/stats`),
      ]);

      const loads = extractLoads(loadsRes.data);
      setListLoads(loads);
      setTotalCount(extractCount(loadsRes.data, loads.length));
      setStats(statsRes.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId, statusFilter, page, q, carrierId]);

  // ── Unified refresh (used by button + interval) ──
  const fetchData = useCallback(() => {
    if (viewMode === "kanban") return fetchKanban();
    return fetchList();
  }, [viewMode, fetchKanban, fetchList]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Kanban: load more per phase ──
  const handleLoadMore = useCallback(
    async (phaseLabel: string, currentOffset: number) => {
      if (!selectedCompanyId) return;
      const phase = PHASE_COLUMNS.find((p) => p.label === phaseLabel);
      if (!phase) return;

      setKanbanPhaseData((prev) => ({
        ...prev,
        [phaseLabel]: { ...prev[phaseLabel], loadingMore: true },
      }));

      try {
        const params: Record<string, string | number | string[]> = {
          status: phase.statuses,
          limit: KANBAN_LIMIT,
          offset: currentOffset,
        };
        if (q) params.q = q;
        if (carrierId) params.carrier_id = carrierId;

        const res = await api.get<PaginatedResponse<Load> | Load[]>(
          `/companies/${selectedCompanyId}/loads`,
          { params, paramsSerializer: serializeParams }
        );
        const newLoads = extractLoads(res.data);
        const total = extractCount(res.data, currentOffset + newLoads.length);

        setKanbanPhaseData((prev) => ({
          ...prev,
          [phaseLabel]: {
            loads: [...(prev[phaseLabel]?.loads ?? []), ...newLoads],
            hasMore: currentOffset + newLoads.length < total,
            loadingMore: false,
          },
        }));
      } catch {
        setKanbanPhaseData((prev) => ({
          ...prev,
          [phaseLabel]: { ...prev[phaseLabel], loadingMore: false },
        }));
      }
    },
    [selectedCompanyId, q, carrierId]
  );

  // ── Kanban: load more cancelled ──
  const handleLoadMoreCancelled = useCallback(
    async (currentOffset: number) => {
      if (!selectedCompanyId) return;

      setCancelledState((prev) => ({ ...prev, loadingMore: true }));

      try {
        const params: Record<string, string | number | string[]> = {
          status: ["cancelled"],
          limit: KANBAN_LIMIT,
          offset: currentOffset,
        };
        if (q) params.q = q;
        if (carrierId) params.carrier_id = carrierId;

        const res = await api.get<PaginatedResponse<Load> | Load[]>(
          `/companies/${selectedCompanyId}/loads`,
          { params, paramsSerializer: serializeParams }
        );
        const newLoads = extractLoads(res.data);
        const total = extractCount(res.data, currentOffset + newLoads.length);

        setCancelledState((prev) => ({
          loads: [...prev.loads, ...newLoads],
          hasMore: currentOffset + newLoads.length < total,
          loadingMore: false,
        }));
      } catch {
        setCancelledState((prev) => ({ ...prev, loadingMore: false }));
      }
    },
    [selectedCompanyId, q, carrierId]
  );

  // ── Filter handlers (always reset page/kanban on filter change) ──
  const handleQChange = (val: string) => {
    setQ(val);
    setPage(0);
    setKanbanPhaseData({});
  };
  const handleCarrierIdChange = (val: string) => {
    setCarrierId(val);
    setPage(0);
    setKanbanPhaseData({});
  };
  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setPage(0);
  };

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setPage(0);
    localStorage.setItem(LS_VIEW_MODE_KEY, mode);
  };

  // ── Pagination helpers ──
  const totalPages = Math.max(1, Math.ceil(totalCount / LIST_LIMIT));
  const pageStart = page * LIST_LIMIT + 1;
  const pageEnd = Math.min((page + 1) * LIST_LIMIT, totalCount);

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
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/loads/${row.original.id}`);
          }}
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

        {/* ── Filters ── */}
        <LoadFilters
          q={q}
          onQChange={handleQChange}
          carrierId={carrierId}
          onCarrierIdChange={handleCarrierIdChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          carriers={carriers}
          showStatusFilter={viewMode === "list"}
        />

        {/* ── Error banner ── */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {/* ── Kanban view ── */}
        {viewMode === "kanban" && (
          <LoadKanban
            phaseData={kanbanPhaseData}
            cancelledLoads={cancelledState.loads}
            cancelledHasMore={cancelledState.hasMore}
            cancelledLoadingMore={cancelledState.loadingMore}
            stats={stats}
            carrierMap={carrierMap}
            isLoading={isLoading}
            onLoadMore={handleLoadMore}
            onLoadMoreCancelled={handleLoadMoreCancelled}
          />
        )}

        {/* ── List view ── */}
        {viewMode === "list" && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size={24} />
              </div>
            ) : listLoads.length === 0 ? (
              <EmptyState
                icon={<Package size={32} />}
                title={t("dashboard_no_loads")}
                description={
                  q || carrierId || statusFilter !== "all"
                    ? "No loads match your filters."
                    : t("dashboard_no_loads_desc_all")
                }
                action={
                  !q && !carrierId && statusFilter === "all"
                    ? {
                        label: t("dashboard_create_load"),
                        onClick: () => setCreateModalOpen(true),
                      }
                    : undefined
                }
              />
            ) : (
              <DataTable
                columns={columns}
                data={listLoads}
                onRowClick={(load) => navigate(`/loads/${load.id}`)}
              />
            )}

            {/* ── Pagination controls ── */}
            {!isLoading && totalCount > LIST_LIMIT && (
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
                <span>{`Showing ${pageStart}–${pageEnd} of ${totalCount}`}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  <span className="px-2 tabular-nums">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
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
