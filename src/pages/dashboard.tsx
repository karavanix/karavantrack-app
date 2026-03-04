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
import { Package, Plus, Building2, Eye } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Load, PaginatedResponse } from "@/types";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedCompanyId, companies } = useCompanyStore();
  const [loads, setLoads] = useState<Load[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const STATUS_TABS = [
    { value: "all", label: t("dashboard_tab_all") },
    { value: "created", label: t("dashboard_tab_created") },
    { value: "assigned", label: t("dashboard_tab_assigned") },
    { value: "in_transit", label: t("dashboard_tab_in_transit") },
    { value: "completed", label: t("dashboard_tab_completed") },
    { value: "confirmed", label: t("dashboard_tab_confirmed") },
    { value: "cancelled", label: t("dashboard_tab_cancelled") },
  ] as const;

  const fetchLoads = useCallback(async () => {
    if (!selectedCompanyId) return;
    setIsLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = {
        company_id: selectedCompanyId,
        limit: 100,
        offset: 0,
      };
      if (activeTab !== "all") {
        params.status = activeTab;
      }
      const { data } = await api.get<PaginatedResponse<Load>>("/loads", { params });
      setLoads(data?.result ?? []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId, activeTab]);

  useEffect(() => {
    fetchLoads();
  }, [fetchLoads]);

  const stats = {
    active: loads.filter((l) => ["assigned", "accepted", "in_transit"].includes(l.status)).length,
    pending: loads.filter((l) => l.status === "created").length,
    completed: loads.filter((l) => ["completed", "confirmed"].includes(l.status)).length,
    cancelled: loads.filter((l) => l.status === "cancelled").length,
  };

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
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "status",
      header: t("dashboard_col_status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "pickup_address",
      header: t("dashboard_col_pickup"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.pickup_address || `${row.original.pickup_lat?.toFixed(4)}, ${row.original.pickup_lng?.toFixed(4)}`}
        </span>
      ),
    },
    {
      accessorKey: "dropoff_address",
      header: t("dashboard_col_dropoff"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.dropoff_address || `${row.original.dropoff_lat?.toFixed(4)}, ${row.original.dropoff_lng?.toFixed(4)}`}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("dashboard_col_created"),
      cell: ({ row }) =>
        row.original.created_at
          ? new Date(row.original.created_at).toLocaleDateString()
          : "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/loads/${row.original.id}`)}
          className="gap-1"
        >
          <Eye size={14} />
          {t("dashboard_view")}
        </Button>
      ),
    },
  ];

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dashboard_subtitle")}</p>
        </div>
        <Button onClick={() => navigate("/loads/new")}>
          <Plus size={16} />
          {t("dashboard_new_load")}
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("dashboard_stat_active"), value: stats.active, color: "text-info" },
          { label: t("dashboard_stat_pending"), value: stats.pending, color: "text-warning" },
          { label: t("dashboard_stat_completed"), value: stats.completed, color: "text-success" },
          { label: t("dashboard_stat_cancelled"), value: stats.cancelled, color: "text-destructive" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Loads table with tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
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
                    ? { label: t("dashboard_create_load"), onClick: () => navigate("/loads/new") }
                    : undefined
                }
              />
            ) : (
              <DataTable columns={columns} data={loads} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
