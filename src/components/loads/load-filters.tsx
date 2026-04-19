import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Carrier } from "@/types";

const STATUS_OPTIONS = [
  { value: "all",          label: "All statuses" },
  { value: "created",      label: "New" },
  { value: "assigned",     label: "Assigned" },
  { value: "accepted",     label: "Accepted" },
  { value: "picking_up",   label: "Picking Up" },
  { value: "picked_up",    label: "Picked Up" },
  { value: "in_transit",   label: "In Transit" },
  { value: "dropping_off", label: "Dropping Off" },
  { value: "dropped_off",  label: "Dropped Off" },
  { value: "confirmed",    label: "Delivered" },
  { value: "cancelled",    label: "Cancelled" },
];

interface LoadFiltersProps {
  q: string;
  onQChange: (q: string) => void;
  carrierId: string;
  onCarrierIdChange: (id: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  carriers: Carrier[];
  showStatusFilter?: boolean;
}

export function LoadFilters({
  q,
  onQChange,
  carrierId,
  onCarrierIdChange,
  statusFilter,
  onStatusFilterChange,
  carriers,
  showStatusFilter = true,
}: LoadFiltersProps) {
  const [inputValue, setInputValue] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync input when parent resets q externally (e.g. Clear button)
  useEffect(() => { setInputValue(q); }, [q]);

  const handleSearchChange = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onQChange(value), 300);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const hasFilters = q !== "" || carrierId !== "" || (showStatusFilter && statusFilter !== "all");

  const clearAll = () => {
    onQChange("");
    onCarrierIdChange("");
    if (showStatusFilter) onStatusFilterChange("all");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Text search */}
      <div className="relative flex-1 min-w-[180px] max-w-[300px]">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={inputValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search loads…"
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* Status filter */}
      {showStatusFilter && (
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {/* Carrier filter */}
      {carriers.length > 0 && (
        <select
          value={carrierId}
          onChange={(e) => onCarrierIdChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All carriers</option>
          {carriers.map((c) => (
            <option key={c.carrier_id} value={c.carrier_id}>
              {c.alias || `${c.first_name} ${c.last_name}`.trim()}
            </option>
          ))}
        </select>
      )}

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-muted-foreground h-9">
          <X size={13} />
          Clear
        </Button>
      )}
    </div>
  );
}
