import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// This page is opened as a popup by TelegramLoginButton.
// Telegram redirects here with ?code=...&state=... after the user authorises.
// We forward those params to the opener window and close the popup.
export default function TelegramCallbackPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code && window.opener) {
      window.opener.postMessage(
        { type: "telegram_oauth_callback", code, state },
        window.location.origin
      );
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Completing Telegram sign in…</p>
    </div>
  );
}
