import { Button } from "@/components/ui/button";
import type { TelegramSignInRequest } from "@/types";

interface TelegramAuthPayload {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginButtonProps {
  botId: string;
  origin: string;
  onAuth: (data: TelegramSignInRequest) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

declare global {
  interface Window {
    _telegramAuthMessageHandler?: (event: MessageEvent) => void;
  }
}

export function TelegramLoginButton({
  botId,
  origin,
  onAuth,
  children,
  disabled,
}: TelegramLoginButtonProps) {
  const handleClick = () => {
    const url =
      `https://oauth.telegram.org/auth?bot_id=${botId}` +
      `&origin=${encodeURIComponent(origin)}&embed=1&request_access=write`;

    const popup = window.open(url, "telegram_auth", "width=550,height=470,left=200,top=100");

    // Remove any existing listener
    if (window._telegramAuthMessageHandler) {
      window.removeEventListener("message", window._telegramAuthMessageHandler);
    }

    const handler = (event: MessageEvent) => {
      if (event.origin !== "https://oauth.telegram.org") return;
      if (typeof event.data !== "string") return;

      try {
        const msg = JSON.parse(event.data);
        if (msg.event === "auth_result" && msg.result) {
          const p = msg.result as TelegramAuthPayload;
          window.removeEventListener("message", handler);
          window._telegramAuthMessageHandler = undefined;
          popup?.close();
          onAuth({
            id: String(p.id),
            first_name: p.first_name,
            last_name: p.last_name,
            username: p.username,
            photo_url: p.photo_url,
            auth_date: String(p.auth_date),
            hash: p.hash,
            role: "shipper",
          });
        }
      } catch {
        // not a JSON message we care about
      }
    };

    window._telegramAuthMessageHandler = handler;
    window.addEventListener("message", handler);
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2"
      onClick={handleClick}
      disabled={disabled}
    >
      <TelegramIcon />
      {children}
    </Button>
  );
}

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#2AABEE" />
      <path
        d="M5.491 11.74L18.51 6.84c.607-.22 1.137.148.94.94l-2.217 10.45c-.165.74-.604.92-1.226.574l-3.4-2.507-1.64 1.578c-.18.18-.334.334-.686.334l.245-3.46 6.32-5.71c.274-.245-.06-.38-.424-.135L7.34 13.888 4.011 12.86c-.73-.23-.747-.73.48-1.12z"
        fill="white"
      />
    </svg>
  );
}
