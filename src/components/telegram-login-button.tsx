import { Button } from "@/components/ui/button";

const TELEGRAM_AUTH_URL = "https://oauth.telegram.org/auth";
const TELEGRAM_TOKEN_URL = "https://oauth.telegram.org/token";

interface TelegramLoginButtonProps {
  clientId: string;
  redirectUri: string;
  onAuth: (idToken: string) => void;
  onError?: (err: Error) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<string> {
  const res = await fetch(TELEGRAM_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Telegram token exchange failed: ${res.status}`);
  }

  const json = await res.json();
  if (!json.id_token) throw new Error("Telegram: no id_token in token response");
  return json.id_token as string;
}

export function TelegramLoginButton({
  clientId,
  redirectUri,
  onAuth,
  onError,
  children,
  disabled,
}: TelegramLoginButtonProps) {
  const handleClick = () => {
    const state = crypto.randomUUID();
    sessionStorage.setItem("tg_oauth_state", state);

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "profile",
      state,
    });

    const popup = window.open(
      `${TELEGRAM_AUTH_URL}?${params}`,
      "telegram_auth",
      "width=550,height=470,left=200,top=100"
    );

    const clientSecret = import.meta.env.VITE_TELEGRAM_CLIENT_SECRET ?? "";

    const handler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== "telegram_oauth_callback") return;

      window.removeEventListener("message", handler);
      popup?.close();

      const { code, state: returnedState } = event.data as {
        type: string;
        code: string;
        state: string;
      };

      if (returnedState !== sessionStorage.getItem("tg_oauth_state")) {
        const err = new Error("Telegram OAuth: state mismatch");
        onError ? onError(err) : console.error(err);
        return;
      }
      sessionStorage.removeItem("tg_oauth_state");

      try {
        const idToken = await exchangeCode(code, clientId, clientSecret, redirectUri);
        onAuth(idToken);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        onError ? onError(e) : console.error(e);
      }
    };

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
