import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCompanyStore } from "@/stores/company-store";
import { api, getApiErrorMessage } from "@/lib/api";
import { reverseGeocode, formatPhotonFeature } from "@/lib/geocoding";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { LocationAutocomplete, type LocationResult } from "@/components/location-autocomplete";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyLinkPanel } from "@/components/shared/copy-link-panel";
import { CarrierPicker } from "@/components/loads/carrier-picker";
import { MapPin, AlertCircle, Navigation, CheckCircle2 } from "lucide-react";
import type { Carrier, CreateLoadResponse, InviteLinkResponse, PaginatedResponse } from "@/types";
import { localToUtc } from "@/lib/date-utils";
import MapLibrePickupMap, { type LatLng } from "@/components/map/MapLibrePickupMap";

interface CreateLoadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateLoadModal({ open, onOpenChange, onSuccess }: CreateLoadModalProps) {
  const { t } = useTranslation();
  const { selectedCompanyId } = useCompanyStore();

  const [step, setStep] = useState<"details" | "assign">("details");
  const [createdLoadId, setCreatedLoadId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    reference_id: "",
    pickup_at: "",
    dropoff_at: "",
  });

  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [mapMode, setMapMode] = useState<"pickup" | "dropoff">("pickup");
  const [flyTarget, setFlyTarget] = useState<LatLng | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 2: assign
  const [assignTab, setAssignTab] = useState<"existing" | "invite">("existing");
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carriersLoading, setCarriersLoading] = useState(false);
  const [carrierSearch, setCarrierSearch] = useState("");
  const [selectedCarrierId, setSelectedCarrierId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");

  const [center, setCenter] = useState<LatLng>({ lat: 41.3111, lng: 69.2797 });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setStep("details");
      setCreatedLoadId(null);
      setForm({ title: "", description: "", reference_id: "", pickup_at: "", dropoff_at: "" });
      setPickup(null);
      setDropoff(null);
      setPickupAddress("");
      setDropoffAddress("");
      setMapMode("pickup");
      setFlyTarget(null);
      setError("");
      setAssignTab("existing");
      setCarriers([]);
      setCarrierSearch("");
      setSelectedCarrierId("");
      setAssignError("");
    }
  }, [open]);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const fetchCarriers = useCallback(async () => {
    if (!selectedCompanyId) return;
    setCarriersLoading(true);
    try {
      const { data } = await api.get<PaginatedResponse<Carrier> | Carrier[]>(
        `/companies/${selectedCompanyId}/carriers`
      );
      setCarriers(Array.isArray(data) ? data : (data?.result ?? []));
    } catch {
      setCarriers([]);
    } finally {
      setCarriersLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (step === "assign") fetchCarriers();
  }, [step, fetchCarriers]);

  const handleMapPickup = useCallback(async (pos: LatLng) => {
    setPickup(pos);
    setFlyTarget({ lat: pos.lat, lng: pos.lng });
    try {
      const feature = await reverseGeocode(pos.lat, pos.lng);
      setPickupAddress(feature ? formatPhotonFeature(feature) : `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
    } catch {
      setPickupAddress(`${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
    }
  }, []);

  const handleMapDropoff = useCallback(async (pos: LatLng) => {
    setDropoff(pos);
    setFlyTarget({ lat: pos.lat, lng: pos.lng });
    try {
      const feature = await reverseGeocode(pos.lat, pos.lng);
      setDropoffAddress(feature ? formatPhotonFeature(feature) : `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
    } catch {
      setDropoffAddress(`${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
    }
  }, []);

  const handlePickupSelect = useCallback((result: LocationResult) => {
    setPickup({ lat: result.lat, lng: result.lng });
    setPickupAddress(result.address);
    setFlyTarget({ lat: result.lat, lng: result.lng });
  }, []);

  const handleDropoffSelect = useCallback((result: LocationResult) => {
    setDropoff({ lat: result.lat, lng: result.lng });
    setDropoffAddress(result.address);
    setFlyTarget({ lat: result.lat, lng: result.lng });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedCompanyId) { setError(t("create_load_error_no_company")); return; }
    if (!pickup) { setError(t("create_load_error_no_pickup")); return; }
    if (!dropoff) { setError(t("create_load_error_no_dropoff")); return; }

    setIsLoading(true);
    try {
      const { data } = await api.post<CreateLoadResponse>("/loads", {
        company_id: selectedCompanyId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        reference_id: form.reference_id.trim() || undefined,
        pickup_address: pickupAddress.trim() || undefined,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        pickup_at: localToUtc(form.pickup_at),
        dropoff_address: dropoffAddress.trim() || undefined,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        dropoff_at: localToUtc(form.dropoff_at),
      });
      setCreatedLoadId(data.id);
      setStep("assign");
      onSuccess();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!createdLoadId || !selectedCarrierId) return;
    setAssignError("");
    setAssignLoading(true);
    try {
      await api.post(`/loads/${createdLoadId}/assign`, { carrier_id: selectedCarrierId });
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setAssignError(getApiErrorMessage(err));
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {step === "details" ? (
        <DialogContent className="max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
            <DialogTitle>{t("create_load_title")}</DialogTitle>
            <DialogDescription>{t("create_load_subtitle")}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            {/* Map — right on desktop */}
            <div className="h-[240px] lg:h-auto lg:flex-1 lg:order-2 border-b lg:border-b-0 lg:border-l relative">
              <MapLibrePickupMap
                center={center}
                pickup={pickup}
                dropoff={dropoff}
                mapMode={mapMode}
                flyTarget={flyTarget}
                onPickup={handleMapPickup}
                onDropoff={handleMapDropoff}
                className="h-full w-full"
              />
              {/* Mode selector overlay */}
              <div className="absolute top-3 left-3 z-10 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setMapMode("pickup")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-sm transition-colors duration-150 ${
                    mapMode === "pickup"
                      ? "bg-green-600/90 text-white"
                      : "bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-900/90 dark:text-gray-200"
                  }`}
                >
                  <Navigation size={12} />
                  {t("create_load_set_pickup")}
                  {pickup && " ✓"}
                </button>
                <button
                  type="button"
                  onClick={() => setMapMode("dropoff")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-sm transition-colors duration-150 ${
                    mapMode === "dropoff"
                      ? "bg-red-600/90 text-white"
                      : "bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-900/90 dark:text-gray-200"
                  }`}
                >
                  <MapPin size={12} />
                  {t("create_load_set_dropoff")}
                  {dropoff && " ✓"}
                </button>
              </div>
              {/* Hint overlay */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
                <span className="rounded-lg bg-black/60 px-3 py-1.5 text-[11px] text-white/90 backdrop-blur-sm">
                  {t("create_load_map_hint", {
                    mode: mapMode === "pickup" ? t("create_load_map_hint_pickup") : t("create_load_map_hint_dropoff"),
                  })}
                </span>
              </div>
            </div>

            {/* Form panel — left on desktop */}
            <div className="w-full lg:w-[420px] xl:w-[460px] lg:order-1 overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                  </div>
                )}

                {/* Locations */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("create_load_locations_card")}
                  </h2>
                  <div className="space-y-2">
                    <Label htmlFor="modal-pickup-search" className="text-xs">{t("create_load_pickup_addr")}</Label>
                    <LocationAutocomplete
                      id="modal-pickup-search"
                      placeholder={t("create_load_search_pickup")}
                      value={pickupAddress}
                      onSelect={handlePickupSelect}
                      onFocus={() => setMapMode("pickup")}
                      biasLat={center.lat}
                      biasLon={center.lng}
                    />
                    {pickup && (
                      <p className="text-[11px] text-muted-foreground">
                        📍 {pickup.lat.toFixed(5)}, {pickup.lng.toFixed(5)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-dropoff-search" className="text-xs">{t("create_load_dropoff_addr")}</Label>
                    <LocationAutocomplete
                      id="modal-dropoff-search"
                      placeholder={t("create_load_search_dropoff")}
                      value={dropoffAddress}
                      onSelect={handleDropoffSelect}
                      onFocus={() => setMapMode("dropoff")}
                      biasLat={center.lat}
                      biasLon={center.lng}
                    />
                    {dropoff && (
                      <p className="text-[11px] text-muted-foreground">
                        🏁 {dropoff.lat.toFixed(5)}, {dropoff.lng.toFixed(5)}
                      </p>
                    )}
                  </div>
                </section>

                <hr className="border-border" />

                {/* Load details */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("create_load_details_card")}
                  </h2>
                  <div className="space-y-2">
                    <Label htmlFor="modal-load-title" className="text-xs">{t("create_load_title_label")}</Label>
                    <Input
                      id="modal-load-title"
                      placeholder={t("create_load_title_placeholder")}
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                      required
                      minLength={2}
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-load-ref" className="text-xs">
                      {t("create_load_ref_label")}{" "}
                      <span className="text-muted-foreground">{t("register_phone_optional")}</span>
                    </Label>
                    <Input
                      id="modal-load-ref"
                      placeholder={t("create_load_ref_placeholder")}
                      value={form.reference_id}
                      onChange={(e) => update("reference_id", e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-load-desc" className="text-xs">{t("create_load_desc_label")}</Label>
                    <textarea
                      id="modal-load-desc"
                      placeholder={t("create_load_desc_placeholder")}
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                    />
                  </div>
                </section>

                <hr className="border-border" />

                {/* Schedule */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("create_load_schedule_card")}
                  </h2>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="modal-pickup-at" className="text-xs">
                        {t("create_load_pickup_at")}{" "}
                        <span className="text-muted-foreground">{t("register_phone_optional")}</span>
                      </Label>
                      <Input
                        id="modal-pickup-at"
                        type="datetime-local"
                        value={form.pickup_at}
                        onChange={(e) => update("pickup_at", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modal-dropoff-at" className="text-xs">
                        {t("create_load_dropoff_at")}{" "}
                        <span className="text-muted-foreground">{t("register_phone_optional")}</span>
                      </Label>
                      <Input
                        id="modal-dropoff-at"
                        type="datetime-local"
                        value={form.dropoff_at}
                        onChange={(e) => update("dropoff_at", e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                {/* Submit */}
                <div className="flex gap-3 pt-2 pb-1">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                    {t("create_load_cancel")}
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? (
                      <>
                        <Spinner size={16} className="text-primary-foreground" />
                        {t("create_load_creating")}
                      </>
                    ) : (
                      t("create_load_submit")
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      ) : (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 size={18} />
              <DialogTitle>{t("create_load_assign_step_title")}</DialogTitle>
            </div>
            <DialogDescription>{t("create_load_assign_step_desc")}</DialogDescription>
          </DialogHeader>

          {assignError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle size={16} className="shrink-0" />
              {assignError}
            </div>
          )}

          <Tabs value={assignTab} onValueChange={(v) => setAssignTab(v as "existing" | "invite")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">{t("load_detail_assign_tab_existing")}</TabsTrigger>
              <TabsTrigger value="invite">{t("load_detail_assign_tab_invite")}</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-3">
              <CarrierPicker
                carriers={carriers}
                loading={carriersLoading}
                searchValue={carrierSearch}
                onSearchChange={setCarrierSearch}
                selectedCarrierId={selectedCarrierId}
                onSelect={setSelectedCarrierId}
              />
            </TabsContent>

            <TabsContent value="invite">
              <CopyLinkPanel
                description={t("load_detail_invite_link_desc")}
                generateLabel={t("load_detail_generate_invite_link")}
                onGenerate={async () => {
                  const { data } = await api.post<InviteLinkResponse>(
                    `/loads/${createdLoadId}/invite-link`
                  );
                  return { url: data.url };
                }}
              />
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t("create_load_assign_later")}
            </Button>
            {assignTab === "existing" && (
              <Button onClick={handleAssign} disabled={!selectedCarrierId || assignLoading} className="flex-1">
                {assignLoading && <Spinner size={16} className="text-primary-foreground" />}
                {t("load_detail_assign_carrier")}
              </Button>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
