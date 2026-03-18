import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCompanyStore } from "@/stores/company-store";
import { api, getApiErrorMessage } from "@/lib/api";
import { useLoadPositionWS } from "@/hooks/use-load-position-ws";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/status-badge";
import MapLibreTrackingMap from "@/components/map/MapLibreTrackingMap";
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
  Radio,
} from "lucide-react";
import type {
  Load,
  Carrier,
  Position,
  TrackPoint,
  TrackResponse,
  PaginatedResponse,
} from "@/types";

export default function LoadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedCompanyId } = useCompanyStore();

  const [load, setLoad] = useState<Load | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [assignOpen, setAssignOpen] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carriersLoading, setCarriersLoading] = useState(false);
  const [selectedCarrierId, setSelectedCarrierId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const isTrackable =
    load != null && ["assigned", "accepted", "in_transit"].includes(load.status);

  const { isConnected, lastPosition } = useLoadPositionWS({
    loadId: id,
    enabled: !!isTrackable,
    onPosition: (pos) => setPosition(pos),
  });

  useEffect(() => {
    if (lastPosition) {
      setPosition(lastPosition);
    }
  }, [lastPosition]);

  const fetchLoad = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError("");

    try {
      const { data } = await api.get<Load>(`/loads/${id}`);
      setLoad(data);

      if (["assigned", "accepted", "in_transit"].includes(data.status)) {
        try {
          const posRes = await api.get<Position>(`/loads/${id}/position`);
          setPosition(posRes.data);
        } catch {
          setPosition(null);
        }
      } else {
        setPosition(null);
      }

      try {
        const trackRes = await api.get<TrackResponse>(`/loads/${id}/track`);
        setTrackPoints(trackRes.data?.points ?? []);
      } catch {
        setTrackPoints([]);
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
      const { data } = await api.get<PaginatedResponse<Carrier> | Carrier[]>(
        `/companies/${selectedCompanyId}/carriers`
      );
      setCarriers(Array.isArray(data) ? data : (data?.result ?? []));
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

    setActionError("");

    try {
      await api.post(`/loads/${id}/cancel`);
      await fetchLoad();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    }
  };

  const handleConfirm = async () => {
    if (!id) return;

    setActionError("");

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
          {error || t("load_detail_not_found")}
        </div>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          {t("load_detail_back")}
        </Button>
      </div>
    );
  }

  const canAssign = load.status === "created";
  const canCancel = ["created", "assigned"].includes(load.status);
  const canConfirm = load.status === "completed";

  const pickup =
    load.pickup_lat != null && load.pickup_lng != null
      ? { lat: load.pickup_lat, lng: load.pickup_lng }
      : null;

  const dropoff =
    load.dropoff_lat != null && load.dropoff_lng != null
      ? { lat: load.dropoff_lat, lng: load.dropoff_lng }
      : null;

  const carrierPosition = position
    ? { lat: position.lat, lng: position.lng }
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft size={16} />
        {t("load_detail_back")}
      </Button>

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
                <code className="text-xs text-muted-foreground">
                  #{load.reference_id}
                </code>
              )}

              {isTrackable && (
                <Badge variant={isConnected ? "success" : "outline"} className="gap-1">
                  <Radio size={10} className={isConnected ? "animate-pulse" : ""} />
                  {isConnected ? "Live" : t("common_error")}
                </Badge>
              )}
            </div>
          </div>
        </div>

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
              {t("load_detail_assign_carrier")}
            </Button>
          )}

          {canConfirm && (
            <Button
              onClick={handleConfirm}
              variant="default"
              className="gap-1 bg-success hover:bg-success/90"
            >
              <CheckCircle2 size={16} />
              Confirm Delivery
            </Button>
          )}

          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-1">
                  <XCircle size={16} />
                  {t("load_detail_cancel_load")}
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("load_detail_cancel_load")}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel the load. This action can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common_cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("load_detail_cancel_load")}
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

      <Card>
        <CardContent className="overflow-hidden rounded-xl p-0">
          <div className="h-[400px]">
            <MapLibreTrackingMap
              className="h-full w-full"
              pickup={pickup}
              dropoff={dropoff}
              carrierPosition={carrierPosition}
              trackPoints={trackPoints.map((p) => ({
                lat: p.lat,
                lng: p.lng,
              }))}
              followCarrier={isTrackable}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Navigation size={14} className="text-success" />
              {t("load_detail_pickup")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-medium">
              {load.pickup_address || t("load_detail_no_description")}
            </p>
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
              {t("load_detail_dropoff")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-medium">
              {load.dropoff_address || t("load_detail_no_description")}
            </p>
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
              {t("load_detail_carrier")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {load.carrier_id ? (
              <code className="text-sm">{load.carrier_id}</code>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("load_detail_no_description")}
              </p>
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
              <span className="text-muted-foreground">
                {t("load_detail_created")}:
              </span>{" "}
              {load.created_at ? new Date(load.created_at).toLocaleString() : "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Updated:</span>{" "}
              {load.updated_at ? new Date(load.updated_at).toLocaleString() : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {load.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("load_detail_description")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{load.description}</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("load_detail_assign_carrier")}</DialogTitle>
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
                      {carrier.alias ||
                        `${carrier.first_name} ${carrier.last_name}`.trim()}
                    </p>

                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {carrier.first_name} {carrier.last_name}
                      </p>
                      <Badge
                        variant={carrier.is_free ? "success" : "secondary"}
                        className="px-1.5 py-0 text-[10px]"
                      >
                        {carrier.is_free ? "Available" : "Busy"}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              {t("common_cancel")}
            </Button>
            <Button onClick={handleAssign} disabled={!selectedCarrierId || assignLoading}>
              {assignLoading ? (
                <Spinner size={16} className="text-primary-foreground" />
              ) : null}
              {t("load_detail_assign_carrier")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}