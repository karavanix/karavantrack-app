import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/auth-store";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { User as UserIcon, Mail, Phone, Shield, Calendar, Check, AlertCircle } from "lucide-react";
import { utcToLocalDateDisplay } from "@/lib/date-utils";

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const { t } = useTranslation();
  const [form, setForm] = useState({ first_name: "", last_name: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ first_name: user.first_name, last_name: user.last_name });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsSaving(true);
    try {
      await api.put("/users/me", {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
      });
      await fetchMe();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const isDirty =
    form.first_name !== (user?.first_name ?? "") ||
    form.last_name !== (user?.last_name ?? "");

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("profile_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("profile_subtitle")}</p>
      </div>

      {/* Avatar + Name */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl font-bold">
              {user.first_name?.[0]}
              {user.last_name?.[0]}
            </div>
            <div>
              <CardTitle>
                {user.first_name} {user.last_name}
              </CardTitle>
              <CardDescription className="capitalize">{user.role}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Edit name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("profile_personal_title")}</CardTitle>
          <CardDescription>{t("profile_personal_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
                <Check size={16} className="shrink-0" />
                {t("profile_success")}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-name">{t("profile_first_name")}</Label>
                <Input
                  id="first-name"
                  value={form.first_name}
                  onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">{t("profile_last_name")}</Label>
                <Input
                  id="last-name"
                  value={form.last_name}
                  onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Mail size={14} />
                  {t("profile_email")}
                </Label>
                <Input value={user.email} disabled className="opacity-60" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Phone size={14} />
                  {t("profile_phone")}
                </Label>
                <Input value={user.phone || "—"} disabled className="opacity-60" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={!isDirty || isSaving}>
                {isSaving ? (
                  <>
                    <Spinner size={16} className="text-primary-foreground" />
                    {t("profile_saving")}
                  </>
                ) : (
                  t("profile_save")
                )}
              </Button>
              {isDirty && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setForm({
                      first_name: user.first_name,
                      last_name: user.last_name,
                    })
                  }
                >
                  {t("profile_reset")}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("profile_account_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                <UserIcon size={12} />
                {t("profile_user_id")}
              </p>
              <p className="font-mono text-xs truncate">{user.id}</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                <Shield size={12} />
                {t("profile_role")}
              </p>
              <p className="text-sm capitalize">{user.role}</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                <Calendar size={12} />
                {t("profile_joined")}
              </p>
              <p className="text-sm">
                {utcToLocalDateDisplay(user.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
