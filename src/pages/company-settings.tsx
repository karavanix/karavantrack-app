import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCompanyStore } from "@/stores/company-store";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Building2, AlertCircle, Check } from "lucide-react";
import type { Company } from "@/types";
import { utcToLocalDateDisplay } from "@/lib/date-utils";

export default function CompanySettingsPage() {
  const { selectedCompanyId, fetchCompanies } = useCompanyStore();
  const { t } = useTranslation();
  const [company, setCompany] = useState<Company | null>(null);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!selectedCompanyId) return;
    setIsLoading(true);
    api
      .get<Company>(`/companies/${selectedCompanyId}`)
      .then(({ data }) => {
        setCompany(data);
        setName(data.name);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [selectedCompanyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;
    setError("");
    setSuccess(false);

    if (name.trim().length < 2) {
      setError(t("company_settings_error_min"));
      return;
    }

    setIsSaving(true);
    try {
      await api.put(`/companies/${selectedCompanyId}`, { name: name.trim() });
      setSuccess(true);
      await fetchCompanies();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-sm text-muted-foreground">{t("company_settings_select")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("company_settings_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("company_settings_subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 size={20} />
            </div>
            <div>
              <CardTitle>{t("company_settings_general")}</CardTitle>
              <CardDescription>
                {t("company_settings_id_label")} <code className="text-xs">{company?.id}</code>
              </CardDescription>
            </div>
          </div>
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
                {t("company_settings_success")}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("company_settings_name_label")}</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("company_settings_name_placeholder")}
                required
                minLength={2}
                maxLength={255}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isSaving || name === company?.name}>
                {isSaving ? (
                  <>
                    <Spinner size={16} className="text-primary-foreground" />
                    {t("company_settings_saving")}
                  </>
                ) : (
                  t("company_settings_save")
                )}
              </Button>
              {name !== company?.name && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setName(company?.name ?? "")}
                >
                  {t("company_settings_reset")}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Additional info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">{t("company_settings_owner_id")}</p>
              <p className="mt-1 text-sm font-mono">{company?.owner_id}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">{t("company_settings_status")}</p>
              <p className="mt-1 text-sm capitalize">{company?.status}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">{t("company_settings_your_role")}</p>
              <p className="mt-1 text-sm capitalize">{company?.role}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">{t("company_settings_created")}</p>
              <p className="mt-1 text-sm">
                {utcToLocalDateDisplay(company?.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
