import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "created", label: "Created" },
  { value: "assigned", label: "Assigned" },
  { value: "in_transit", label: "In Transit" },
  { value: "completed", label: "Completed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { selectedCompanyId, companies } = useCompanyStore();
  const [loads, setLoads] = useState<Load[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");

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

  // Stats from loaded data
  const stats = {
    active: loads.filter((l) => ["assigned", "accepted", "in_transit"].includes(l.status)).length,
    pending: loads.filter((l) => l.status === "created").length,
    completed: loads.filter((l) => ["completed", "confirmed"].includes(l.status)).length,
    cancelled: loads.filter((l) => l.status === "cancelled").length,
  };

  const columns: ColumnDef<Load>[] = [
    {
      accessorKey: "reference_id",
      header: "Ref",
      cell: ({ row }) => (
        <code className="text-xs text-muted-foreground">{row.original.reference_id || "—"}</code>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "pickup_address",
      header: "Pickup",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.pickup_address || `${row.original.pickup_lat?.toFixed(4)}, ${row.original.pickup_lng?.toFixed(4)}`}
        </span>
      ),
    },
    {
      accessorKey: "dropoff_address",
      header: "Dropoff",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.dropoff_address || `${row.original.dropoff_lat?.toFixed(4)}, ${row.original.dropoff_lng?.toFixed(4)}`}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
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
          View
        </Button>
      ),
    },
  ];

  if (companies.length === 0) {
    return (
      <EmptyState
        icon={<Building2 size={32} />}
        title="Welcome to KaravanTrack"
        description="Start by creating your first company to begin managing loads and tracking shipments."
        action={{ label: "Create your first company", onClick: () => navigate("/company/new") }}
      />
    );
  }

  if (!selectedCompanyId) {
    return (
      <EmptyState
        icon={<Package size={32} />}
        title="No company selected"
        description="Select a company from the header to view loads."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your shipments and activity
          </p>
        </div>
        <Button onClick={() => navigate("/loads/new")}>
          <Plus size={16} />
          New Load
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active", value: stats.active, color: "text-info" },
          { label: "Pending", value: stats.pending, color: "text-warning" },
          { label: "Completed", value: stats.completed, color: "text-success" },
          { label: "Cancelled", value: stats.cancelled, color: "text-destructive" },
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
                title="No loads found"
                description={
                  activeTab === "all"
                    ? "Create your first load to get started."
                    : `No loads with status "${tab.label}".`
                }
                action={
                  activeTab === "all"
                    ? { label: "Create Load", onClick: () => navigate("/loads/new") }
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
