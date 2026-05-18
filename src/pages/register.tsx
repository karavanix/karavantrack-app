import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/auth-store";
import { getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, ArrowLeft, CheckSquare, Mail, Square } from "lucide-react";
import { TelegramLoginButton } from "@/components/telegram-login-button";
import type { TelegramSignInRequest } from "@/types";

type Step = "form" | "verify";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { register, verifyEmail, telegramSignIn, isLoading } = useAuthStore();
  const [step, setStep] = useState<Step>("form");
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

  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Step 1: Submit registration form ──
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
      setStep("verify");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleTelegramAuth = async (data: TelegramSignInRequest) => {
    setError("");
    try {
      await telegramSignIn(data);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  // ── Step 2: Verify OTP ──
  const handleVerify = async (code: string) => {
    setError("");
    try {
      await verifyEmail({ email: form.email, code });
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
      // Clear OTP on error
      setOtpDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  // Focus first OTP input on mount
  useEffect(() => {
    if (step === "verify") {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5) {
      const code = newDigits.join("");
      if (code.length === 6) {
        handleVerify(code);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);

    // Focus last filled input or submit
    if (pasted.length === 6) {
      handleVerify(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  // ── Render ──
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

        {step === "form" ? (
          // ════════════════ Registration Form ════════════════
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

                <TelegramLoginButton
                  botId={import.meta.env.VITE_TELEGRAM_BOT_ID ?? ""}
                  origin={import.meta.env.VITE_TELEGRAM_ORIGIN ?? window.location.origin}
                  onAuth={handleTelegramAuth}
                  disabled={isLoading}
                >
                  {t("auth_sign_up_telegram")}
                </TelegramLoginButton>

                <p className="text-center text-sm text-muted-foreground">
                  {t("register_already_account")}{" "}
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    {t("register_sign_in")}
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        ) : (
          // ════════════════ OTP Verification ════════════════
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Mail size={24} className="text-primary" />
              </div>
              <CardTitle>{t("verify_title")}</CardTitle>
              <CardDescription>
                {t("verify_subtitle", { email: form.email })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                  </div>
                )}

                {/* OTP Input */}
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <Input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="h-13 w-11 text-center text-xl font-semibold"
                      aria-label={`${t("verify_digit")} ${i + 1}`}
                    />
                  ))}
                </div>

                {isLoading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Spinner size={16} />
                    {t("verify_verifying")}
                  </div>
                )}

                <p className="text-center text-xs text-muted-foreground">
                  {t("verify_hint")}
                </p>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("form");
                    setError("");
                    setOtpDigits(["", "", "", "", "", ""]);
                  }}
                >
                  <ArrowLeft size={16} />
                  {t("verify_back")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
