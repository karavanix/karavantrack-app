import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCompanyStore } from "@/stores/company-store";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  AlertCircle,
  Truck,
  MapPin,
  Navigation,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  UserPlus,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Load, Carrier, Position } from "@/types";

// Fix Leaflet icons
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
  className: "hue-rotate-[120deg]",
});

const dropoffIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "hue-rotate-[0deg]",
});

const carrierIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "hue-rotate-[200deg]", // blue
});

export default function LoadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompanyStore();
  const [load, setLoad] = useState<Load | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carriersLoading, setCarriersLoading] = useState(false);
  const [selectedCarrierId, setSelectedCarrierId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchLoad = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data } = await api.get<Load>(`/loads/${id}`);
      setLoad(data);

      // Fetch position if load is in transit
      if (["assigned", "accepted", "in_transit"].includes(data.status)) {
        try {
          const posRes = await api.get<Position>(`/loads/${id}/position`);
          setPosition(posRes.data);
        } catch {
          // No position yet, that's fine
        }
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLoad();
  }, [fetchLoad]);

  const fetchCarriers = async () => {
    if (!selectedCompanyId) return;
    setCarriersLoading(true);
    try {
      const { data } = await api.get<Carrier[]>(`/companies/${selectedCompanyId}/carriers`);
      setCarriers(data ?? []);
    } catch {
      setCarriers([]);
    } finally {
      setCarriersLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!id || !selectedCarrierId) return;
    setActionError("");
    setAssignLoading(true);
    try {
      await api.post(`/loads/${id}/assign`, { carrier_id: selectedCarrierId });
      setAssignOpen(false);
      setSelectedCarrierId("");
      await fetchLoad();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setAssignLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    try {
      await api.post(`/loads/${id}/cancel`);
      await fetchLoad();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    }
  };

  const handleConfirm = async () => {
    if (!id) return;
    try {
      await api.post(`/loads/${id}/confirm`);
      await fetchLoad();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} />
      </div>
    );
  }

  if (error || !load) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12">
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle size={16} />
          {error || "Load not found"}
        </div>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Go back
        </Button>
      </div>
    );
  }

  const canAssign = load.status === "created";
  const canCancel = ["created", "assigned"].includes(load.status);
  const canConfirm = load.status === "completed";

  // Map center
  const mapCenter: [number, number] = position
    ? [position.lat, position.lng]
    : load.pickup_lat && load.pickup_lng
    ? [load.pickup_lat, load.pickup_lng]
    : [41.3111, 69.2797];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft size={16} />
        Back
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Truck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{load.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={load.status} />
              {load.reference_id && (
                <code className="text-xs text-muted-foreground">#{load.reference_id}</code>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canAssign && (
            <Button
              onClick={() => {
                setAssignOpen(true);
                fetchCarriers();
              }}
              className="gap-1"
            >
              <UserPlus size={16} />
              Assign Carrier
            </Button>
          )}
          {canConfirm && (
            <Button onClick={handleConfirm} variant="default" className="gap-1 bg-success hover:bg-success/90">
              <CheckCircle2 size={16} />
              Confirm Delivery
            </Button>
          )}
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-1">
                  <XCircle size={16} />
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this load?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel the load. This action can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Cancel Load
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          {actionError}
        </div>
      )}

      {/* Map */}
      <Card>
        <CardContent className="p-0 overflow-hidden rounded-xl">
          <div className="h-[350px]">
            <MapContainer center={mapCenter} zoom={12} className="h-full w-full rounded-xl">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {load.pickup_lat && load.pickup_lng && (
                <Marker position={[load.pickup_lat, load.pickup_lng]} icon={pickupIcon} />
              )}
              {load.dropoff_lat && load.dropoff_lng && (
                <Marker position={[load.dropoff_lat, load.dropoff_lng]} icon={dropoffIcon} />
              )}
              {position && (
                <Marker position={[position.lat, position.lng]} icon={carrierIcon} />
              )}
              {load.pickup_lat && load.dropoff_lat && (
                <Polyline
                  positions={[
                    [load.pickup_lat, load.pickup_lng],
                    ...(position ? [[position.lat, position.lng] as [number, number]] : []),
                    [load.dropoff_lat, load.dropoff_lng],
                  ]}
                  color="#3b82f6"
                  weight={2}
                  dashArray="8 4"
                  opacity={0.6}
                />
              )}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Details grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Navigation size={14} className="text-success" />
              Pickup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-medium">{load.pickup_address || "No address"}</p>
            <p className="text-xs text-muted-foreground">
              {load.pickup_lat?.toFixed(5)}, {load.pickup_lng?.toFixed(5)}
            </p>
            {load.pickup_at && (
              <p className="text-xs text-muted-foreground">
                🕒 {new Date(load.pickup_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin size={14} className="text-destructive" />
              Dropoff
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-medium">{load.dropoff_address || "No address"}</p>
            <p className="text-xs text-muted-foreground">
              {load.dropoff_lat?.toFixed(5)}, {load.dropoff_lng?.toFixed(5)}
            </p>
            {load.dropoff_at && (
              <p className="text-xs text-muted-foreground">
                🕒 {new Date(load.dropoff_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User size={14} />
              Carrier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {load.carrier_id ? (
              <code className="text-sm">{load.carrier_id}</code>
            ) : (
              <p className="text-sm text-muted-foreground">Not assigned</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar size={14} />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Created:</span>{" "}
              {load.created_at ? new Date(load.created_at).toLocaleString() : "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Updated:</span>{" "}
              {load.updated_at ? new Date(load.updated_at).toLocaleString() : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {load.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{load.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Assign Carrier Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Carrier</DialogTitle>
            <DialogDescription>
              Select a carrier from your company to assign to this load.
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle size={16} className="shrink-0" />
              {actionError}
            </div>
          )}

          {carriersLoading ? (
            <div className="flex justify-center py-6">
              <Spinner size={20} />
            </div>
          ) : carriers.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No carriers in this company.{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  setAssignOpen(false);
                  navigate("/carriers");
                }}
              >
                Add one first
              </button>
            </p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-1">
              {carriers.map((carrier) => (
                <button
                  key={carrier.carrier_id}
                  type="button"
                  onClick={() => setSelectedCarrierId(carrier.carrier_id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedCarrierId === carrier.carrier_id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
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
                    <p className="text-xs text-muted-foreground">
                      {carrier.first_name} {carrier.last_name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedCarrierId || assignLoading}
            >
              {assignLoading ? <Spinner size={16} className="text-primary-foreground" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
