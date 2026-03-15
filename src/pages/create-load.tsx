import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCompanyStore } from "@/stores/company-store";
import { api, getApiErrorMessage } from "@/lib/api";
import { reverseGeocode, formatPhotonFeature } from "@/lib/geocoding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  LocationAutocomplete,
  type LocationResult,
} from "@/components/location-autocomplete";
import { MapPin, ArrowLeft, AlertCircle, Navigation, Search, Truck } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Carrier } from "@/types";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const pickupIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "hue-rotate-[120deg]",
});

const dropoffIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "hue-rotate-[0deg]",
});

interface LatLng {
  lat: number;
  lng: number;
}

function MapClickHandler({
  mode,
  onPickup,
  onDropoff,
}: {
  mode: "pickup" | "dropoff";
  onPickup: (pos: LatLng) => void;
  onDropoff: (pos: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (mode === "pickup") {
        onPickup({ lat: e.latlng.lat, lng: e.latlng.lng });
      } else {
        onDropoff({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

function MapFlyTo({
  pickup,
  dropoff,
  flyTarget,
}: {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  flyTarget: LatLng | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (pickup && dropoff) {
      const bounds = L.latLngBounds(
        [pickup.lat, pickup.lng],
        [dropoff.lat, dropoff.lng]
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else if (flyTarget) {
      map.flyTo([flyTarget.lat, flyTarget.lng], 14, { duration: 0.8 });
    }
  }, [pickup, dropoff, flyTarget, map]);

  return null;
}

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
  const mapRef = useRef<L.Map | null>(null);

  // ── Carrier selection state ──
  const [carrierQuery, setCarrierQuery] = useState("");
  const [carrierResults, setCarrierResults] = useState<Carrier[]>([]);
  const [carrierSearching, setCarrierSearching] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  const carrierTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const [center, setCenter] = useState<LatLng>({ lat: 41.3111, lng: 69.2797 });
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // ── Carrier search ──
  const handleCarrierSearch = (value: string) => {
    setCarrierQuery(value);
    if (!value.trim()) {
      setSelectedCarrier(null);
    }
    if (carrierTimer.current) clearTimeout(carrierTimer.current);
    if (value.trim().length < 2) {
      setCarrierResults([]);
      return;
    }
    carrierTimer.current = setTimeout(async () => {
      if (!selectedCompanyId) return;
      setCarrierSearching(true);
      try {
        const { data } = await api.get<Carrier[]>(`/companies/${selectedCompanyId}/carriers`, {
          params: { q: value.trim() },
        });
        setCarrierResults(Array.isArray(data) ? data : []);
      } catch {
        setCarrierResults([]);
      } finally {
        setCarrierSearching(false);
      }
    }, 300);
  };

  // ── Map helpers ──
  const handleMapPickup = useCallback(async (pos: LatLng) => {
    setPickup(pos);
    setFlyTarget(pos);
    try {
      const feature = await reverseGeocode(pos.lat, pos.lng);
      setPickupAddress(feature ? formatPhotonFeature(feature) : `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
    } catch {
      setPickupAddress(`${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
    }
  }, []);

  const handleMapDropoff = useCallback(async (pos: LatLng) => {
    setDropoff(pos);
    setFlyTarget(pos);
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
        carrier_id: selectedCarrier?.carrier_id || undefined,
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
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft size={16} />
        {t("create_load_back")}
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("create_load_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("create_load_subtitle")}</p>
      </div>

      {!canCreate && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          {t("create_load_no_permission")}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("create_load_details_card")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="load-title">{t("create_load_title_label")}</Label>
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
              <Label htmlFor="load-ref">
                {t("create_load_ref_label")}{" "}
                <span className="text-xs text-muted-foreground">{t("register_phone_optional")}</span>
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
              <Label htmlFor="load-desc">{t("create_load_desc_label")}</Label>
              <textarea
                id="load-desc"
                placeholder={t("create_load_desc_placeholder")}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                disabled={!canCreate}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("create_load_schedule_card")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pickup-at">
                  {t("create_load_pickup_at")}{" "}
                  <span className="text-xs text-muted-foreground">{t("register_phone_optional")}</span>
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
                <Label htmlFor="dropoff-at">
                  {t("create_load_dropoff_at")}{" "}
                  <span className="text-xs text-muted-foreground">{t("register_phone_optional")}</span>
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
          </CardContent>
        </Card>

        {/* Carrier assignment */}
        {canAssignCarrier && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("create_load_carrier_card")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{t("create_load_carrier_hint")}</p>

              {selectedCarrier ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                    <Truck size={14} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-medium text-sm truncate">
                      {selectedCarrier.alias || `${selectedCarrier.first_name} ${selectedCarrier.last_name}`.trim()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedCarrier.is_free ? t("carriers_status_available") : t("carriers_status_busy")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCarrier(null);
                      setCarrierQuery("");
                      setCarrierResults([]);
                    }}
                    className="text-muted-foreground"
                  >
                    {t("create_load_carrier_clear")}
                  </Button>
                </div>
              ) : (
                <>
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

                  {carrierSearching && (
                    <div className="flex justify-center py-3">
                      <Spinner size={18} />
                    </div>
                  )}

                  {!carrierSearching && carrierResults.length > 0 && (
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-1">
                      {carrierResults.map((c) => (
                        <button
                          key={c.carrier_id}
                          type="button"
                          onClick={() => {
                            setSelectedCarrier(c);
                            setCarrierQuery(c.alias || `${c.first_name} ${c.last_name}`.trim());
                            setCarrierResults([]);
                          }}
                          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold shrink-0">
                            {c.first_name?.[0]}{c.last_name?.[0]}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="font-medium truncate">
                              {c.alias || `${c.first_name} ${c.last_name}`.trim()}
                            </p>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.is_free ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                            {c.is_free ? t("carriers_status_available") : t("carriers_status_busy")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("create_load_locations_card")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Address search inputs */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pickup-search">{t("create_load_pickup_addr")}</Label>
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
                  <p className="text-xs text-muted-foreground">
                    📍 {pickup.lat.toFixed(5)}, {pickup.lng.toFixed(5)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dropoff-search">{t("create_load_dropoff_addr")}</Label>
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
                  <p className="text-xs text-muted-foreground">
                    🏁 {dropoff.lat.toFixed(5)}, {dropoff.lng.toFixed(5)}
                  </p>
                )}
              </div>
            </div>

            {/* Mode selector + hint */}
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mapMode === "pickup" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMapMode("pickup")}
                  className="gap-1"
                >
                  <Navigation size={14} />
                  {t("create_load_set_pickup")}
                  {pickup && " ✓"}
                </Button>
                <Button
                  type="button"
                  variant={mapMode === "dropoff" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMapMode("dropoff")}
                  className="gap-1"
                >
                  <MapPin size={14} />
                  {t("create_load_set_dropoff")}
                  {dropoff && " ✓"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("create_load_map_hint", {
                  mode: mapMode === "pickup"
                    ? t("create_load_map_hint_pickup")
                    : t("create_load_map_hint_dropoff"),
                })}
              </p>
            </div>

            {/* Map */}
            <div className="h-[350px] overflow-hidden rounded-lg border">
              <MapContainer
                center={[center.lat, center.lng]}
                zoom={12}
                className="h-full w-full"
                ref={mapRef}
                preferCanvas={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  updateWhenZooming={false}
                  updateWhenIdle={true}
                  keepBuffer={4}
                  detectRetina={false}
                />
                <MapClickHandler
                  mode={mapMode}
                  onPickup={handleMapPickup}
                  onDropoff={handleMapDropoff}
                />
                <MapFlyTo
                  pickup={pickup}
                  dropoff={dropoff}
                  flyTarget={flyTarget}
                />
                {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
                {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon} />}
              </MapContainer>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              💡 {t("create_load_paste_hint")}
            </p>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            {t("create_load_cancel")}
          </Button>
          <Button type="submit" disabled={isLoading || !canCreate}>
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
  );
}
