import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCompanyStore } from "@/stores/company-store";
import { getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Building2, AlertCircle, ArrowLeft } from "lucide-react";

export default function CreateCompanyPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { createCompany } = useCompanyStore();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError(t("create_company_error_min"));
      return;
    }

    setIsLoading(true);
    try {
      await createCompany({ name: name.trim() });
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft size={16} />
        {t("create_company_back")}
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 size={20} />
            </div>
            <div>
              <CardTitle>{t("create_company_title")}</CardTitle>
              <CardDescription>{t("create_company_desc")}</CardDescription>
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

            <div className="space-y-2">
              <Label htmlFor="company-name">{t("create_company_name_label")}</Label>
              <Input
                id="company-name"
                placeholder={t("create_company_name_placeholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={255}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {t("create_company_name_hint")}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner size={16} className="text-primary-foreground" />
                  {t("create_company_creating")}
                </>
              ) : (
                t("create_company_submit")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
