import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";

const LENGTH = 6;
const empty = () => Array.from({ length: LENGTH }, () => "");

interface OtpInputProps {
  /** Called with the full code once all digits are in (typed or pasted). */
  onComplete: (code: string) => void;
  /** Bump to clear the boxes and refocus the first one (e.g. after a wrong code). */
  resetKey?: number;
  disabled?: boolean;
}

/** Six one-digit boxes for the code from the email: auto-advance, backspace, paste of the whole code. */
export function OtpInput({ onComplete, resetKey = 0, disabled }: OtpInputProps) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState<string[]>(empty);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setDigits(empty());
    refs.current[0]?.focus();
  }, [resetKey]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < LENGTH - 1) refs.current[index + 1]?.focus();
    if (digit && index === LENGTH - 1) {
      const code = next.join("");
      if (code.length === LENGTH) onComplete(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) refs.current[index - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    const next = empty();
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    if (pasted.length === LENGTH) onComplete(pasted);
    else refs.current[pasted.length]?.focus();
  };

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <Input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-13 w-11 text-center text-xl font-semibold"
          aria-label={`${t("verify_digit")} ${i + 1}`}
        />
      ))}
    </div>
  );
}
