import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCompanyStore } from "@/stores/company-store";
import { api, getApiErrorMessage } from "@/lib/api";
import { reverseGeocode, formatPhotonFeature } from "@/lib/geocoding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  LocationAutocomplete,
  type LocationResult,
} from "@/components/location-autocomplete";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, ArrowLeft, AlertCircle, Navigation, Search, Truck, Mail } from "lucide-react";
import type { Carrier, GetCarrierByContactResponse, InviteResponse } from "@/types";

import MapLibrePickupMap, { type LatLng } from "@/components/map/MapLibrePickupMap";


export default function CreateLoadPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedCompanyId, hasPermission } = useCompanyStore();

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

  // ── Carrier selection state (three-tier) ──
  const [carrierQuery, setCarrierQuery] = useState("");
  const [carrierResults, setCarrierResults] = useState<Carrier[]>([]);
  const [carrierSearching, setCarrierSearching] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  const carrierTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const [carrierContact, setCarrierContact] = useState("");
  const [carrierContactResult, setCarrierContactResult] = useState<GetCarrierByContactResponse | null>(null);
  const [carrierContactSearching, setCarrierContactSearching] = useState(false);
  const [carrierContactNotFound, setCarrierContactNotFound] = useState(false);
  const [carrierContactSelected, setCarrierContactSelected] = useState<GetCarrierByContactResponse | null>(null);

  const [carrierInviteLoading, setCarrierInviteLoading] = useState(false);
  const [carrierInviteError, setCarrierInviteError] = useState("");

  const pickedCarrierId = selectedCarrier?.carrier_id ?? carrierContactSelected?.id ?? null;
  const pickedCarrierLabel = selectedCarrier
    ? selectedCarrier.alias || `${selectedCarrier.first_name || ''} ${selectedCarrier.last_name || ''}`.trim() || "?"
    : carrierContactSelected
    ? `${carrierContactSelected.first_name || ''} ${carrierContactSelected.last_name || ''}`.trim() || carrierContactSelected.email || carrierContactSelected.phone
    : null;
  const pickedCarrierFree = selectedCarrier?.is_free ?? true;

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const [center, setCenter] = useState<LatLng>({ lat: 41.3111, lng: 69.2797 });
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // ── Tier 1: search within my carriers ──
  const handleCarrierSearch = (value: string) => {
    setCarrierQuery(value);
    if (!value.trim()) {
      setCarrierResults([]);
      return;
    }
    if (carrierTimer.current) clearTimeout(carrierTimer.current);
    if (value.trim().length < 2) { setCarrierResults([]); return; }
    carrierTimer.current = setTimeout(async () => {
      if (!selectedCompanyId) return;
      setCarrierSearching(true);
      try {
        const { data } = await api.get<Carrier[]>(`/companies/${selectedCompanyId}/carriers`, {
          params: { q: value.trim() },
        });
        setCarrierResults(Array.isArray(data) ? data : []);
      } catch { setCarrierResults([]); } finally { setCarrierSearching(false); }
    }, 300);
  };

  // ── Tier 2: by-contact lookup ──
  const handleCarrierContactSearch = async () => {
    const c = carrierContact.trim();
    if (!c) return;
    setCarrierContactSearching(true);
    setCarrierContactResult(null);
    setCarrierContactNotFound(false);
    setCarrierContactSelected(null);
    try {
      const { data } = await api.get<GetCarrierByContactResponse>("/users/carriers/by-contact", {
        params: { contact: c },
      });
      const results = data ? [data] : [];
      if (results.length > 0 && results[0].id) {
        setCarrierContactResult(results[0]);
        setCarrierContactSelected(results[0]);
      } else { setCarrierContactNotFound(true); }
    } catch { setCarrierContactNotFound(true); }
    finally { setCarrierContactSearching(false); }
  };

  const handleCarrierInvite = async () => {
    setCarrierInviteLoading(true);
    setCarrierInviteError("");
    try {
      const { data } = await api.post<InviteResponse>("/users/invite", { contact: carrierContact.trim(), role: "carrier" });
      const mapped: GetCarrierByContactResponse = { ...data, is_free: true };
      setCarrierContactResult(mapped);
      setCarrierContactSelected(mapped);
      setCarrierContactNotFound(false);
    } catch (err) {
      setCarrierInviteError(getApiErrorMessage(err));
    } finally { setCarrierInviteLoading(false); }
  };

  const clearCarrierPicker = () => {
    setSelectedCarrier(null);
    setCarrierQuery("");
    setCarrierResults([]);
    setCarrierContact("");
    setCarrierContactResult(null);
    setCarrierContactNotFound(false);
    setCarrierContactSelected(null);
    setCarrierInviteError("");
  };

  // ── Map helpers ──
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

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedCompanyId) {
      setError(t("create_load_error_no_company"));
      return;
    }
    if (!pickup) {
      setError(t("create_load_error_no_pickup"));
      return;
    }
    if (!dropoff) {
      setError(t("create_load_error_no_dropoff"));
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.post("/loads", {
        company_id: selectedCompanyId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        reference_id: form.reference_id.trim() || undefined,
        pickup_address: pickupAddress.trim() || undefined,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        pickup_at: form.pickup_at || undefined,
        dropoff_address: dropoffAddress.trim() || undefined,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        dropoff_at: form.dropoff_at || undefined,
        carrier_id: pickedCarrierId || undefined,
      });
      navigate(`/loads/${data.id}`, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const canCreate = hasPermission("company.load.create");
  const canAssignCarrier = hasPermission("company.carrier.read");

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ── Header ── */}
      <div className="shrink-0 border-b px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">{t("create_load_title")}</h1>
            <p className="text-xs text-muted-foreground">{t("create_load_subtitle")}</p>
          </div>
        </div>
      </div>

      {/* ── Main split layout ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* ── Map (right on desktop, first on mobile) ── */}
        <div className="h-[280px] lg:h-auto lg:flex-1 lg:order-2 lg:sticky lg:top-0 border-b lg:border-b-0 lg:border-l relative">
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

          {/* Mode selector overlay on map */}
          <div className="absolute top-3 left-3 z-10 flex gap-1.5">
            <button
              type="button"
              onClick={() => setMapMode("pickup")}
              className={`
                flex items-center gap-1.5 rounded-lg px-3 py-1.5
                text-xs font-semibold shadow-lg backdrop-blur-sm
                transition-colors duration-150
                ${mapMode === "pickup"
                  ? "bg-green-600/90 text-white"
                  : "bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-900/90 dark:text-gray-200 dark:hover:bg-gray-800/90"
                }
              `}
            >
              <Navigation size={12} />
              {t("create_load_set_pickup")}
              {pickup && " ✓"}
            </button>
            <button
              type="button"
              onClick={() => setMapMode("dropoff")}
              className={`
                flex items-center gap-1.5 rounded-lg px-3 py-1.5
                text-xs font-semibold shadow-lg backdrop-blur-sm
                transition-colors duration-150
                ${mapMode === "dropoff"
                  ? "bg-red-600/90 text-white"
                  : "bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-900/90 dark:text-gray-200 dark:hover:bg-gray-800/90"
                }
              `}
            >
              <MapPin size={12} />
              {t("create_load_set_dropoff")}
              {dropoff && " ✓"}
            </button>
          </div>

          {/* Hint overlay on map */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
            <span className="rounded-lg bg-black/60 px-3 py-1.5 text-[11px] text-white/90 backdrop-blur-sm">
              {t("create_load_map_hint", {
                mode: mapMode === "pickup"
                  ? t("create_load_map_hint_pickup")
                  : t("create_load_map_hint_dropoff"),
              })}
            </span>
          </div>
        </div>

        {/* ── Form panel (left on desktop, below map on mobile) ── */}
        <div className="w-full lg:w-[420px] xl:w-[460px] lg:order-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4 lg:p-6 space-y-5">
            {!canCreate && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle size={16} className="shrink-0" />
                {t("create_load_no_permission")}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {/* ── Locations ── */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t("create_load_locations_card")}
              </h2>

              <div className="space-y-2">
                <Label htmlFor="pickup-search" className="text-xs">{t("create_load_pickup_addr")}</Label>
                <LocationAutocomplete
                  id="pickup-search"
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
                <Label htmlFor="dropoff-search" className="text-xs">{t("create_load_dropoff_addr")}</Label>
                <LocationAutocomplete
                  id="dropoff-search"
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

            {/* ── Load details ── */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t("create_load_details_card")}
              </h2>

              <div className="space-y-2">
                <Label htmlFor="load-title" className="text-xs">{t("create_load_title_label")}</Label>
                <Input
                  id="load-title"
                  placeholder={t("create_load_title_placeholder")}
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  required
                  minLength={2}
                  maxLength={255}
                  autoFocus
                  disabled={!canCreate}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="load-ref" className="text-xs">
                  {t("create_load_ref_label")}{" "}
                  <span className="text-muted-foreground">{t("register_phone_optional")}</span>
                </Label>
                <Input
                  id="load-ref"
                  placeholder={t("create_load_ref_placeholder")}
                  value={form.reference_id}
                  onChange={(e) => update("reference_id", e.target.value)}
                  maxLength={100}
                  disabled={!canCreate}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="load-desc" className="text-xs">{t("create_load_desc_label")}</Label>
                <textarea
                  id="load-desc"
                  placeholder={t("create_load_desc_placeholder")}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  disabled={!canCreate}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </section>

            <hr className="border-border" />

            {/* ── Schedule ── */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t("create_load_schedule_card")}
              </h2>
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pickup-at" className="text-xs">
                    {t("create_load_pickup_at")}{" "}
                    <span className="text-muted-foreground">{t("register_phone_optional")}</span>
                  </Label>
                  <Input
                    id="pickup-at"
                    type="datetime-local"
                    value={form.pickup_at}
                    onChange={(e) => update("pickup_at", e.target.value)}
                    disabled={!canCreate}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dropoff-at" className="text-xs">
                    {t("create_load_dropoff_at")}{" "}
                    <span className="text-muted-foreground">{t("register_phone_optional")}</span>
                  </Label>
                  <Input
                    id="dropoff-at"
                    type="datetime-local"
                    value={form.dropoff_at}
                    onChange={(e) => update("dropoff_at", e.target.value)}
                    disabled={!canCreate}
                  />
                </div>
              </div>
            </section>

            {/* ── Carrier ── */}
            {canAssignCarrier && (
              <>
                <hr className="border-border" />
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("create_load_carrier_card")}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">{t("create_load_carrier_hint")}</p>

                  {pickedCarrierId ? (
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                        <Truck size={14} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-medium text-sm truncate">{pickedCarrierLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {pickedCarrierFree ? t("carriers_status_available") : t("carriers_status_busy")}
                        </p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={clearCarrierPicker} className="text-muted-foreground">
                        {t("create_load_carrier_clear")}
                      </Button>
                    </div>
                  ) : (
                    <Tabs defaultValue="my-carriers" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-3">
                        <TabsTrigger value="my-carriers">{t("carriers_tab_my")}</TabsTrigger>
                        <TabsTrigger value="contact">{t("carriers_tab_contact")}</TabsTrigger>
                      </TabsList>

                      <TabsContent value="my-carriers" className="mt-0">
                        <div className="space-y-1">
                          <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder={t("create_load_carrier_search")}
                              value={carrierQuery}
                              onChange={(e) => handleCarrierSearch(e.target.value)}
                              className="pl-9"
                              disabled={!canCreate}
                            />
                          </div>
                          {carrierSearching && <div className="flex justify-center py-2"><Spinner size={16} /></div>}
                          {!carrierSearching && carrierResults.length > 0 && (
                            <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border p-1">
                              {carrierResults.map((c) => (
                                <button
                                  key={c.carrier_id}
                                  type="button"
                                  onClick={() => { setSelectedCarrier(c); setCarrierQuery(c.alias || `${c.first_name} ${c.last_name}`.trim()); setCarrierResults([]); }}
                                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                >
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold shrink-0 uppercase">
                                    {c.first_name?.[0] || c.alias?.[0] || "?"}
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                    <p className="font-medium truncate">{c.alias || `${c.first_name || ''} ${c.last_name || ''}`.trim() || "Unknown Carrier"}</p>
                                  </div>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                    c.is_free ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"
                                  }`}>
                                    {c.is_free ? t("carriers_status_available") : t("carriers_status_busy")}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="contact" className="mt-0 space-y-3">
                        <div className="space-y-1">
                          <div className="flex gap-2">
                            <Input
                              placeholder={t("carriers_contact_placeholder")}
                              value={carrierContact}
                              onChange={(e) => {
                                setCarrierContact(e.target.value);
                                setCarrierContactResult(null);
                                setCarrierContactNotFound(false);
                                setCarrierContactSelected(null);
                              }}
                              onKeyDown={(e) => e.key === "Enter" && handleCarrierContactSearch()}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCarrierContactSearch}
                              disabled={!carrierContact.trim() || carrierContactSearching}
                            >
                              {carrierContactSearching ? <Spinner size={16} /> : <Search size={16} />}
                            </Button>
                          </div>
                        </div>

                        {carrierContactResult && !carrierContactSelected && (
                          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0 uppercase">
                              {carrierContactResult.first_name?.[0] || carrierContactResult.email?.[0] || carrierContactResult.phone?.[0] || "?"}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="font-medium text-sm truncate">
                                {carrierContactResult.first_name || carrierContactResult.last_name
                                  ? `${carrierContactResult.first_name || ''} ${carrierContactResult.last_name || ''}`.trim()
                                  : carrierContactResult.email || carrierContactResult.phone || carrierContact}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{carrierContactResult.email || carrierContactResult.phone}</p>
                            </div>
                            <Button type="button" size="sm" onClick={() => setCarrierContactSelected(carrierContactResult)}>
                              {t("create_load_carrier_select")}
                            </Button>
                          </div>
                        )}

                        {carrierContactNotFound && (
                          <div className="rounded-lg border border-dashed p-3 text-center space-y-2">
                            <p className="text-xs text-muted-foreground">{t("carriers_not_found")}</p>
                            {carrierInviteError && <p className="text-xs text-destructive">{carrierInviteError}</p>}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleCarrierInvite}
                              disabled={carrierInviteLoading}
                              className="gap-2"
                            >
                              {carrierInviteLoading ? <Spinner size={14} /> : <Mail size={14} />}
                              {t("carriers_invite")}
                            </Button>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </section>
              </>
            )}

            {/* ── Submit ── */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
                {t("create_load_cancel")}
              </Button>
              <Button type="submit" disabled={isLoading || !canCreate} className="flex-1">
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
    </div>
  );
}
