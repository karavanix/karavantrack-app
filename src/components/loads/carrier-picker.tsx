import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Search } from "lucide-react";
import type { Carrier } from "@/types";

interface CarrierPickerProps {
  carriers: Carrier[];
  loading: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedCarrierId: string;
  onSelect: (carrierId: string) => void;
  onAddCarrier?: () => void;
}

export function CarrierPicker({
  carriers,
  loading,
  searchValue,
  onSearchChange,
  selectedCarrierId,
  onSelect,
  onAddCarrier,
}: CarrierPickerProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size={20} />
      </div>
    );
  }

  if (carriers.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {t("load_detail_no_carriers")}{" "}
        {onAddCarrier && (
          <button type="button" className="text-primary hover:underline" onClick={onAddCarrier}>
            {t("load_detail_add_carrier_link")}
          </button>
        )}
      </p>
    );
  }

  const q = searchValue.toLowerCase();
  const filtered = q
    ? carriers.filter((c) => {
        const name = `${c.first_name} ${c.last_name}`.toLowerCase();
        return name.includes(q) || c.alias?.toLowerCase().includes(q);
      })
    : carriers;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("load_detail_carrier_search_placeholder")}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border p-1">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {t("load_detail_carrier_no_results")}
          </p>
        ) : (
          filtered.map((carrier) => (
            <button
              key={carrier.carrier_id}
              type="button"
              onClick={() => onSelect(carrier.carrier_id)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                selectedCarrierId === carrier.carrier_id ? "bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {carrier.first_name?.[0]}
                {carrier.last_name?.[0]}
              </div>
              <div>
                <p className="font-medium">
                  {carrier.alias || `${carrier.first_name} ${carrier.last_name}`.trim()}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {carrier.first_name} {carrier.last_name}
                  </p>
                  <Badge variant={carrier.is_free ? "success" : "secondary"} className="px-1.5 py-0 text-[10px]">
                    {carrier.is_free ? t("carriers_status_available") : t("carriers_status_busy")}
                  </Badge>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
