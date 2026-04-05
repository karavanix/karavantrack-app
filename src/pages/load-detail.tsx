import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCompanyStore } from "@/stores/company-store";
import { api, getApiErrorMessage } from "@/lib/api";
import { useLoadPositionWS } from "@/hooks/use-load-position-ws";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Gauge,
  Clock,
  Search,
  Timer,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type {
  Load,
  Carrier,
  Position,
  TrackPoint,
  TrackResponse,
  PaginatedResponse,
} from "@/types";
import { utcToLocalDisplay, utcToLocalTimeDisplay } from "@/lib/date-utils";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
  const [assignCarrierSearch, setAssignCarrierSearch] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [assignedCarrier, setAssignedCarrier] = useState<Carrier | null>(null);

  const isTrackable =
    load != null && ["assigned", "accepted", "in_transit"].includes(load.status);

  const { isConnected } = useLoadPositionWS({
    loadId: id,
    enabled: !!isTrackable,
    onPosition: (pos) => setPosition(pos),
  });

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

  // Resolve carrier name from carrier_id — check local state first, then fetch
  useEffect(() => {
    if (!load?.carrier_id || !selectedCompanyId) {
      setAssignedCarrier(null);
      return;
    }
    const cached = carriers.find((c) => c.carrier_id === load.carrier_id);
    if (cached) {
      setAssignedCarrier(cached);
      return;
    }
    api
      .get<PaginatedResponse<Carrier> | Carrier[]>(`/companies/${selectedCompanyId}/carriers`)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.result ?? []);
        setAssignedCarrier(list.find((c) => c.carrier_id === load.carrier_id) ?? null);
      })
      .catch(() => setAssignedCarrier(null));
  }, [load?.carrier_id, selectedCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setCancelLoading(true);
    try {
      await api.post(`/loads/${id}/cancel`);
      await fetchLoad();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setCancelLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!id) return;
    setActionError("");
    setConfirmLoading(true);
    try {
      await api.post(`/loads/${id}/confirm`);
      await fetchLoad();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setConfirmLoading(false);
    }
  };

  // ── Loading / Error states ──
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

  const speedKmh = position ? Math.round((position.speed_mps ?? 0) * 3.6) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ── Header ── */}
      <div className="shrink-0 border-b px-4 py-3 lg:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft size={18} />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Truck size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight truncate">{load.title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={load.status} />
                {load.reference_id && (
                  <code className="text-[11px] text-muted-foreground">#{load.reference_id}</code>
                )}
                {isTrackable && (
                  <Badge variant={isConnected ? "success" : "outline"} className="gap-1">
                    <Radio size={10} className={isConnected ? "animate-pulse" : ""} />
                    {isConnected ? "Live" : t("load_detail_ws_offline")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {canAssign && (
              <Button
                size="sm"
                onClick={() => { setAssignOpen(true); fetchCarriers(); }}
                className="gap-1"
              >
                <UserPlus size={14} />
                {t("load_detail_assign_carrier")}
              </Button>
            )}
            {canConfirm && (
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={confirmLoading}
                className="gap-1 bg-success hover:bg-success/90"
              >
                {confirmLoading ? (
                  <Spinner size={14} className="text-primary-foreground" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                {t("load_detail_confirm_delivery")}
              </Button>
            )}
            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1">
                    <XCircle size={14} />
                    {t("load_detail_cancel_load")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("load_detail_cancel_load")}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("load_detail_cancel_confirm_desc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common_cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      disabled={cancelLoading}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {cancelLoading && <Spinner size={14} className="text-destructive-foreground" />}
                      {t("load_detail_cancel_load")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">
            <AlertCircle size={14} className="shrink-0" />
            {actionError}
          </div>
        )}
      </div>

      {/* ── Main split layout ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* ── Map (right on desktop, first on mobile) ── */}
        <div className="h-[280px] lg:h-auto lg:flex-1 lg:order-2 lg:sticky lg:top-0 border-b lg:border-b-0 lg:border-l">
          <MapLibreTrackingMap
            className="h-full w-full"
            pickup={pickup}
            dropoff={dropoff}
            carrierPosition={carrierPosition}
            carrierHeading={position?.heading_deg}
            trackPoints={trackPoints.map((p) => ({
              lat: p.lat,
              lng: p.lng,
            }))}
            trackable={isTrackable}
          />
        </div>

        {/* ── Info panel (left on desktop, below map on mobile) ── */}
        <div className="w-full lg:w-[400px] xl:w-[440px] lg:order-1 overflow-y-auto">
          <div className="p-4 lg:p-6 space-y-5">

            {/* ── Pickup ── */}
            <section className="space-y-1.5">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Navigation size={12} className="text-green-500" />
                {t("load_detail_pickup")}
              </h2>
              <p className="text-sm font-medium">
                {load.pickup_address || t("load_detail_no_description")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                📍 {load.pickup_lat?.toFixed(5)}, {load.pickup_lng?.toFixed(5)}
              </p>
              {load.pickup_at && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock size={10} />
                  {utcToLocalDisplay(load.pickup_at)}
                </p>
              )}
            </section>

            <hr className="border-border" />

            {/* ── Dropoff ── */}
            <section className="space-y-1.5">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <MapPin size={12} className="text-red-500" />
                {t("load_detail_dropoff")}
              </h2>
              <p className="text-sm font-medium">
                {load.dropoff_address || t("load_detail_no_description")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                🏁 {load.dropoff_lat?.toFixed(5)}, {load.dropoff_lng?.toFixed(5)}
              </p>
              {load.dropoff_at && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock size={10} />
                  {utcToLocalDisplay(load.dropoff_at)}
                </p>
              )}
            </section>

            <hr className="border-border" />

            {/* ── Carrier + Live telemetry ── */}
            <section className="space-y-1.5">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <User size={12} />
                {t("load_detail_carrier")}
              </h2>
              {load.carrier_id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                      {assignedCarrier ? (
                        <span>
                          {assignedCarrier.first_name?.[0]}
                          {assignedCarrier.last_name?.[0]}
                        </span>
                      ) : (
                        <Truck size={14} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {assignedCarrier
                          ? assignedCarrier.alias ||
                            `${assignedCarrier.first_name} ${assignedCarrier.last_name}`.trim()
                          : load.carrier_id}
                      </p>
                      {assignedCarrier?.alias && (
                        <p className="text-xs text-muted-foreground truncate">
                          {assignedCarrier.first_name} {assignedCarrier.last_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Live telemetry */}
                  {isTrackable && position && (() => {
                    const etaMinutes =
                      dropoff && (position.speed_mps ?? 0) > 0.5
                        ? Math.round(
                            (haversineKm(position.lat, position.lng, dropoff.lat, dropoff.lng) /
                              (position.speed_mps * 3.6)) *
                              60
                          )
                        : null;
                    return (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            <Gauge size={11} />
                            <span className="text-[10px] uppercase">{t("load_detail_telemetry_speed")}</span>
                          </div>
                          <p className="text-sm font-bold tabular-nums">
                            {speedKmh} <span className="text-[10px] font-normal text-muted-foreground">km/h</span>
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            <Navigation size={11} />
                            <span className="text-[10px] uppercase">{t("load_detail_telemetry_heading")}</span>
                          </div>
                          <p className="text-sm font-bold tabular-nums">
                            {Math.round(position.heading_deg)}°
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            <Radio size={11} />
                            <span className="text-[10px] uppercase">{t("load_detail_telemetry_accuracy")}</span>
                          </div>
                          <p className="text-sm font-bold tabular-nums">
                            {Math.round(position.accuracy_m)} <span className="text-[10px] font-normal text-muted-foreground">m</span>
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            <Timer size={11} />
                            <span className="text-[10px] uppercase">{t("load_detail_eta")}</span>
                          </div>
                          <p className="text-sm font-bold tabular-nums">
                            {etaMinutes === null
                              ? "—"
                              : etaMinutes < 1
                              ? t("load_detail_eta_soon")
                              : etaMinutes < 60
                              ? `~${etaMinutes}m`
                              : `~${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60}m`}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {isTrackable && position?.recorded_at && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock size={10} />
                      {t("load_detail_last_update")} {utcToLocalTimeDisplay(position.recorded_at)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("load_detail_no_description")}
                </p>
              )}
            </section>

            {/* ── Description ── */}
            {load.description && (
              <>
                <hr className="border-border" />
                <section className="space-y-1.5">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("load_detail_description")}
                  </h2>
                  <p className="whitespace-pre-wrap text-sm">{load.description}</p>
                </section>
              </>
            )}

            <hr className="border-border" />

            {/* ── Timeline ── */}
            <section className="space-y-1.5">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Calendar size={12} />
                {t("load_detail_timeline")}
              </h2>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">{t("load_detail_created")}:</span>{" "}
                  {utcToLocalDisplay(load.created_at)}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("load_detail_updated")}:</span>{" "}
                  {utcToLocalDisplay(load.updated_at)}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ── Assign Carrier Dialog ── */}
      <Dialog open={assignOpen} onOpenChange={(open) => { setAssignOpen(open); if (!open) { setAssignCarrierSearch(""); setSelectedCarrierId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("load_detail_assign_carrier")}</DialogTitle>
            <DialogDescription>
              {t("load_detail_assign_dialog_desc")}
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
              {t("load_detail_no_carriers")}{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  setAssignOpen(false);
                  navigate("/carriers");
                }}
              >
                {t("load_detail_add_carrier_link")}
              </button>
            </p>
          ) : (() => {
            const q = assignCarrierSearch.toLowerCase();
            const filtered = q
              ? carriers.filter((c) => {
                  const name = `${c.first_name} ${c.last_name}`.toLowerCase();
                  return name.includes(q) || c.alias?.toLowerCase().includes(q);
                })
              : carriers;
            return (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("load_detail_carrier_search_placeholder")}
                    value={assignCarrierSearch}
                    onChange={(e) => setAssignCarrierSearch(e.target.value)}
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
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {carrier.first_name} {carrier.last_name}
                            </p>
                            <Badge
                              variant={carrier.is_free ? "success" : "secondary"}
                              className="px-1.5 py-0 text-[10px]"
                            >
                              {carrier.is_free ? t("carriers_status_available") : t("carriers_status_busy")}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            );
          })()}

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