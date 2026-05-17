import { useState, useEffect, useCallback } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging, VAPID_KEY } from "@/lib/firebase";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

interface UseNotificationsReturn {
  permission: PermissionState;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    // Send Firebase config to the service worker
    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
    const worker = reg.installing ?? reg.waiting ?? reg.active;
    if (worker) {
      worker.postMessage({ type: "FIREBASE_CONFIG", config });
    }
    return reg;
  } catch {
    return null;
  }
}

function getDeviceId(): string {
  const key = "kt_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

async function registerDevice(token: string): Promise<void> {
  await api.post("/users/me/devices", {
    device_id: getDeviceId(),
    device_token: token,
    device_name: navigator.userAgent.slice(0, 100),
    device_type: "web",
  });
}

export function useNotifications(): UseNotificationsReturn {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission as PermissionState;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Listen for foreground messages and show a browser notification
  useEffect(() => {
    if (permission !== "granted") return;
    const messaging = getFirebaseMessaging();
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      const notification = payload.notification;
      if (!notification) return;
      new Notification(notification.title ?? "KaravanTrack", {
        body: notification.body,
        icon: "/logo.svg",
      });
    });

    return unsubscribe;
  }, [permission]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window) || !isAuthenticated) return;
    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result !== "granted") return;

      const swReg = await registerServiceWorker();
      const messaging = getFirebaseMessaging();
      if (!messaging) return;

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg ?? undefined,
      });

      if (token) {
        await registerDevice(token);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  return { permission, isLoading, requestPermission };
}
