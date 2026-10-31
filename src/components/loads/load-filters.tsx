import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import type { Carrier } from "@/types";

const STATUS_OPTIONS = [
  { value: "all", labelKey: "filter_status_all" },
  { value: "created", labelKey: "status_created" },
  { value: "assigned", labelKey: "status_assigned" },
  { value: "accepted", labelKey: "status_accepted" },
  { value: "picking_up", labelKey: "status_picking_up" },
  { value: "picked_up", labelKey: "status_picked_up" },
  { value: "in_transit", labelKey: "status_in_transit" },
  { value: "dropping_off", labelKey: "status_dropping_off" },
  { value: "dropped_off", labelKey: "status_dropped_off" },
  { value: "confirmed", labelKey: "status_confirmed" },
  { value: "cancelled", labelKey: "status_cancelled" },
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
  const { t } = useTranslation();
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
          placeholder={t("filter_search_loads")}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* Status filter */}
      {showStatusFilter && (
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="h-9 w-[160px] text-sm">
            <SelectValue placeholder={t("filter_status_all")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Carrier filter */}
      {carriers.length > 0 && (
        <Select value={carrierId || "__all__"} onValueChange={(v) => onCarrierIdChange(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-9 w-[160px] text-sm">
            <SelectValue placeholder={t("filter_carrier_all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("filter_carrier_all")}</SelectItem>
            {carriers.map((c) => (
              <SelectItem key={c.carrier_id} value={c.carrier_id}>
                {c.alias || `${c.first_name} ${c.last_name}`.trim()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-muted-foreground h-9">
          <X size={13} />
          {t("filter_clear")}
        </Button>
      )}
    </div>
  );
}
