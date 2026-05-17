importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Receive Firebase config from the main thread on first install.
// The main app calls: navigator.serviceWorker.ready.then(reg => reg.active.postMessage({ type: 'FIREBASE_CONFIG', config }))
let messaging = null;

self.addEventListener("message", (event) => {
  if (event.data?.type === "FIREBASE_CONFIG") {
    if (firebase.apps.length === 0) {
      firebase.initializeApp(event.data.config);
    }
    messaging = firebase.messaging();
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: "New notification", body: event.data.text() } };
  }

  const notification = payload.notification ?? {};
  const title = notification.title ?? "KaravanTrack";
  const options = {
    body: notification.body ?? "",
    icon: notification.icon ?? "/logo.svg",
    badge: "/logo.svg",
    data: payload.data ?? {},
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});
