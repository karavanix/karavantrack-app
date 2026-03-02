import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanyStore } from "@/stores/company-store";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { MapPin, ArrowLeft, AlertCircle, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon
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
  className: "hue-rotate-[120deg]", // green tint
});

const dropoffIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "hue-rotate-[0deg]", // red (default)
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

export default function CreateLoadPage() {
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompanyStore();
  const [form, setForm] = useState({
    title: "",
    description: "",
    pickup_address: "",
    dropoff_address: "",
  });
  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [mapMode, setMapMode] = useState<"pickup" | "dropoff">("pickup");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const mapRef = useRef<L.Map | null>(null);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Try to get user location for initial map center
  const [center, setCenter] = useState<LatLng>({ lat: 41.3111, lng: 69.2797 }); // Tashkent default
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {} // silently fail
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedCompanyId) {
      setError("Please select a company first");
      return;
    }
    if (!pickup) {
      setError("Click on the map to set pickup location");
      return;
    }
    if (!dropoff) {
      setError("Click on the map to set dropoff location");
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.post("/loads", {
        company_id: selectedCompanyId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        pickup_address: form.pickup_address.trim() || undefined,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: form.dropoff_address.trim() || undefined,
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
        Back
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create New Load</h1>
        <p className="text-sm text-muted-foreground">
          Set up a new shipment with pickup and dropoff locations
        </p>
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
            <CardTitle className="text-base">Load Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="load-title">Title *</Label>
              <Input
                id="load-title"
                placeholder="e.g. Cotton delivery to warehouse"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                required
                minLength={2}
                maxLength={255}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="load-desc">Description</Label>
              <textarea
                id="load-desc"
                placeholder="Additional details about the load..."
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode selector */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mapMode === "pickup" ? "default" : "outline"}
                size="sm"
                onClick={() => setMapMode("pickup")}
                className="gap-1"
              >
                <Navigation size={14} />
                Set Pickup
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
                Set Dropoff
                {dropoff && " ✓"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Click on the map to place the{" "}
              <strong>{mapMode === "pickup" ? "pickup" : "dropoff"}</strong> marker
            </p>

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
                  onPickup={setPickup}
                  onDropoff={setDropoff}
                />
                {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
                {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon} />}
              </MapContainer>
            </div>

            {/* Address inputs */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pickup-addr">Pickup address</Label>
                <Input
                  id="pickup-addr"
                  placeholder="Address or leave empty"
                  value={form.pickup_address}
                  onChange={(e) => update("pickup_address", e.target.value)}
                />
                {pickup && (
                  <p className="text-xs text-muted-foreground">
                    📍 {pickup.lat.toFixed(5)}, {pickup.lng.toFixed(5)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dropoff-addr">Dropoff address</Label>
                <Input
                  id="dropoff-addr"
                  placeholder="Address or leave empty"
                  value={form.dropoff_address}
                  onChange={(e) => update("dropoff_address", e.target.value)}
                />
                {dropoff && (
                  <p className="text-xs text-muted-foreground">
                    🏁 {dropoff.lat.toFixed(5)}, {dropoff.lng.toFixed(5)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner size={16} className="text-primary-foreground" />
                Creating...
              </>
            ) : (
              "Create Load"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
