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
import { MapPin, ArrowLeft, AlertCircle, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

/**
 * Handles map click events and dispatches to the active mode's handler.
 */
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

/**
 * Flies the map to a position or fits bounds when both points exist.
 */
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
  const { selectedCompanyId } = useCompanyStore();

  const [form, setForm] = useState({
    title: "",
    description: "",
    reference_id: "",
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

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const [center, setCenter] = useState<LatLng>({ lat: 41.3111, lng: 69.2797 });
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // ── Reverse geocode on map click ──
  const handleMapPickup = useCallback(async (pos: LatLng) => {
    setPickup(pos);
    setFlyTarget(pos);
    try {
      const feature = await reverseGeocode(pos.lat, pos.lng);
      if (feature) {
        setPickupAddress(formatPhotonFeature(feature));
      } else {
        setPickupAddress(`${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
      }
    } catch {
      setPickupAddress(`${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
    }
  }, []);

  const handleMapDropoff = useCallback(async (pos: LatLng) => {
    setDropoff(pos);
    setFlyTarget(pos);
    try {
      const feature = await reverseGeocode(pos.lat, pos.lng);
      if (feature) {
        setDropoffAddress(formatPhotonFeature(feature));
      } else {
        setDropoffAddress(`${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
      }
    } catch {
      setDropoffAddress(`${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
    }
  }, []);

  // ── Autocomplete selection ──
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
        dropoff_address: dropoffAddress.trim() || undefined,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
      });
      navigate(`/loads/${data.id}`, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="load-desc">{t("create_load_desc_label")}</Label>
              <textarea
                id="load-desc"
                placeholder={t("create_load_desc_placeholder")}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
            </div>
          </CardContent>
        </Card>

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
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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

            {/* Paste hint */}
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
          <Button type="submit" disabled={isLoading}>
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
