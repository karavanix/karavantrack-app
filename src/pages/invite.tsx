import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  AlertTriangle,
  Apple,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  PlayCircle,
  Smartphone,
  Truck,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { utcToLocalDisplay } from "@/lib/date-utils";
import type { InvitePublicResponse } from "@/types";

// TODO: replace with real store listing URL once published
const APP_STORE_URL = "https://apps.apple.com/app/idXXXXXXXXX";
// TODO: replace with real store listing URL once published
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=yool.live.app";
const APP_DEEP_LINK_PREFIX = "yoollive://invite/";

type ViewState = "loading" | "invalid" | "error" | "loaded";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();

  const [state, setState] = useState<ViewState>(token ? "loading" : "invalid");
  const [data, setData] = useState<InvitePublicResponse | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    api
      .get<InvitePublicResponse>(`/invites/${token}`)
      .then(({ data }) => {
        if (cancelled) return;
        setData(data);
        setState("loaded");
      })
      .catch((err) => {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setState("invalid");
        } else {
          setState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleOpenApp = () => {
    if (token) window.location.href = `${APP_DEEP_LINK_PREFIX}${token}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Yool" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">Yool</span>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <Card className="w-full max-w-md">
          {state === "loading" && (
            <CardContent className="flex flex-col items-center gap-3 py-16">
              <Spinner size={28} />
              <p className="text-sm text-muted-foreground">{t("invite_page_loading")}</p>
            </CardContent>
          )}

          {state === "invalid" && (
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <XCircle size={28} />
              </div>
              <h1 className="text-lg font-semibold">{t("invite_page_invalid_link")}</h1>
              <p className="text-sm text-muted-foreground">{t("invite_page_invalid_link_desc")}</p>
            </CardContent>
          )}

          {state === "error" && (
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle size={28} />
              </div>
              <h1 className="text-lg font-semibold">{t("common_error")}</h1>
              <p className="text-sm text-muted-foreground">{t("invite_page_error_desc")}</p>
            </CardContent>
          )}

          {state === "loaded" && data && (
            <>
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Truck size={26} />
                </div>
                <CardTitle className="text-xl">{data.load.title}</CardTitle>
                {data.load.company_name && (
                  <p className="text-sm text-muted-foreground">{data.load.company_name}</p>
                )}
                {data.load.reference_id && (
                  <code className="text-xs text-muted-foreground">#{data.load.reference_id}</code>
                )}
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="space-y-3 rounded-lg border bg-muted/30 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <Navigation size={14} className="mt-0.5 shrink-0 text-green-500" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("load_detail_pickup")}
                      </p>
                      <p className="text-sm font-medium">
                        {data.load.pickup_address || t("load_detail_no_description")}
                      </p>
                      {data.load.pickup_at && (
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock size={10} />
                          {utcToLocalDisplay(data.load.pickup_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-red-500" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("load_detail_dropoff")}
                      </p>
                      <p className="text-sm font-medium">
                        {data.load.dropoff_address || t("load_detail_no_description")}
                      </p>
                      {data.load.dropoff_at && (
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock size={10} />
                          {utcToLocalDisplay(data.load.dropoff_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {data.status === "pending" && (
                  <div className="space-y-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
                      <Smartphone size={16} />
                      {t("invite_page_status_pending_desc")}
                    </div>
                    <Button onClick={handleOpenApp} className="w-full gap-2">
                      <Smartphone size={16} />
                      {t("invite_page_open_app")}
                    </Button>
                    <div className="flex items-center justify-center gap-3">
                      {/* TODO: replace with real store listing URL once published */}
                      <a
                        href={APP_STORE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                      >
                        <Apple size={14} />
                        {t("invite_page_download_ios")}
                      </a>
                      {/* TODO: replace with real store listing URL once published */}
                      <a
                        href={PLAY_STORE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                      >
                        <PlayCircle size={14} />
                        {t("invite_page_download_android")}
                      </a>
                    </div>
                  </div>
                )}

                {data.status === "accepted" && (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <CheckCircle2 size={22} className="text-success" />
                    <p className="text-sm font-medium">{t("invite_page_status_accepted_desc")}</p>
                  </div>
                )}

                {data.status === "expired" && (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Clock size={22} className="text-muted-foreground" />
                    <p className="text-sm font-medium">{t("invite_page_status_expired_desc")}</p>
                  </div>
                )}

                {data.status === "revoked" && (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <XCircle size={22} className="text-destructive" />
                    <p className="text-sm font-medium">{t("invite_page_status_revoked_desc")}</p>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
