import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, KeyRound, Mail } from "lucide-react";
import { api, getApiErrorCode, getApiErrorMessage } from "@/lib/api";
import { PASSWORD_MIN_LENGTH } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { OtpInput } from "@/components/shared/otp-input";

type Step = "email" | "reset";

/** The server's OTP codes → our texts; anything else falls back to the server's message. */
const OTP_ERROR_KEYS: Record<string, string> = {
  OTP_MISMATCH: "otp_error_mismatch",
  OTP_NOT_FOUND: "otp_error_not_found",
  OTP_EXPIRED: "otp_error_expired",
  OTP_TOO_MANY_ATTEMPTS: "otp_error_too_many",
};

/**
 * Password reset: email → the code from the email + a new password. `POST /auth/password/forgot`
 * always answers 200 (one cannot tell from it whether the email exists; a repeat within a minute
 * sends no new code); `POST /auth/password/reset` returns no tokens and signs the person out
 * everywhere, so after success it is back to the login page.
 */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpReset, setOtpReset] = useState(0);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const requestCode = async () => {
    await api.post("/auth/password/forgot", { email: email.trim() });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestCode();
      setStep("reset");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResending(true);
    try {
      await requestCode();
      setCode("");
      setOtpReset((n) => n + 1);
      toast.success(t("forgot_code_resent"));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.length !== 6) {
      setError(t("forgot_error_code"));
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(t("register_error_password_length", { count: PASSWORD_MIN_LENGTH }));
      return;
    }
    if (password !== confirm) {
      setError(t("register_error_password_match"));
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/password/reset", { email: email.trim(), code, new_password: password });
      toast.success(t("forgot_success"));
      navigate("/login", { replace: true });
    } catch (err) {
      const key = OTP_ERROR_KEYS[getApiErrorCode(err) ?? ""];
      setError(key ? t(key) : getApiErrorMessage(err));
      if (key) {
        setCode("");
        setOtpReset((n) => n + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[128px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center">
            <img src="/logo.svg" alt="Y" className="h-12 w-12" />
            <span className="text-4xl font-bold tracking-tight -ml-1">ool</span>
          </div>
          <p className="text-sm text-muted-foreground">{t("tagline_shipper")}</p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              {step === "email" ? (
                <KeyRound size={24} className="text-primary" />
              ) : (
                <Mail size={24} className="text-primary" />
              )}
            </div>
            <CardTitle>{step === "email" ? t("forgot_title") : t("forgot_code_sent_title")}</CardTitle>
            <CardDescription>
              {step === "email" ? t("forgot_subtitle") : t("forgot_code_sent_subtitle", { email: email.trim() })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "email" ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="forgot-email">{t("login_email")}</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner size={16} className="text-primary-foreground" />
                      {t("forgot_sending")}
                    </>
                  ) : (
                    t("forgot_send_code")
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                    <ArrowLeft size={14} />
                    {t("forgot_back_to_login")}
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="block text-center">{t("forgot_code")}</Label>
                  <OtpInput onComplete={setCode} resetKey={otpReset} disabled={loading} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">{t("forgot_new_password")}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder={t("register_password_placeholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">{t("register_confirm_password")}</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder={t("register_repeat_password")}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner size={16} className="text-primary-foreground" />
                      {t("forgot_submitting")}
                    </>
                  ) : (
                    t("forgot_submit")
                  )}
                </Button>

                <div className="space-y-1 text-center text-xs text-muted-foreground">
                  <p>{t("verify_hint_short")}</p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={handleResend}
                    disabled={resending || loading}
                  >
                    {resending && <Spinner size={12} />}
                    {t("forgot_resend")}
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("email");
                    setError("");
                    setCode("");
                  }}
                >
                  <ArrowLeft size={16} />
                  {t("forgot_change_email")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
