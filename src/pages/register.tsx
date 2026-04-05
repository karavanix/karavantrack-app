import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/auth-store";
import { getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, CheckSquare, Square } from "lucide-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError(t("register_error_password_match"));
      return;
    }

    if (form.password.length < 6) {
      setError(t("register_error_password_length"));
      return;
    }

    if (!termsAccepted) {
      setError(t("register_error_terms"));
      return;
    }

    try {
      await register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        role: "shipper",
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[128px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo as wordmark: [logo]ool */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center">
            <img src="/logo.svg" alt="Y" className="h-12 w-12" />
            <span className="text-4xl font-bold tracking-tight -ml-1">ool</span>
          </div>
          <p className="text-sm text-muted-foreground">{t("tagline_create")}</p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle>{t("register_get_started")}</CardTitle>
            <CardDescription>{t("register_subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="first_name">{t("register_first_name")}</Label>
                  <Input
                    id="first_name"
                    placeholder="John"
                    value={form.first_name}
                    onChange={(e) => update("first_name", e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">{t("register_last_name")}</Label>
                  <Input
                    id="last_name"
                    placeholder="Doe"
                    value={form.last_name}
                    onChange={(e) => update("last_name", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">{t("register_email")}</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  {t("register_phone")} <span className="text-muted-foreground">{t("register_phone_optional")}</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+998 90 123 45 67"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  autoComplete="tel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">{t("register_password")}</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder={t("register_password_placeholder")}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("register_confirm_password")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder={t("register_repeat_password")}
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              {/* Terms & Privacy checkbox */}
              <div
                id="terms-agreement"
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 cursor-pointer select-none"
                onClick={() => setTermsAccepted((v) => !v)}
              >
                <div className="mt-0.5 shrink-0 text-primary">
                  {termsAccepted ? (
                    <CheckSquare size={18} className="text-primary" />
                  ) : (
                    <Square size={18} className="text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("register_terms_agree")}{" "}
                  <Link
                    to="/terms-of-service"
                    target="_blank"
                    className="font-medium text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t("register_terms_link")}
                  </Link>
                  {" "}{t("register_and")}{" "}
                  <Link
                    to="/privacy-policy"
                    target="_blank"
                    className="font-medium text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t("register_privacy_link")}
                  </Link>
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Spinner size={16} className="text-primary-foreground" />
                    {t("register_creating")}
                  </>
                ) : (
                  t("register_create")
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t("register_already_account")}{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  {t("register_sign_in")}
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
