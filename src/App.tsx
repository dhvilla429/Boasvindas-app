export interface PushNotificationDetail {
  id: string;
  title: string;
  body: string;
  type: "notice" | "message" | "tour_reminder" | "tour_started" | "goal_reached" | "info";
  time: string;
}

/**
 * Utility to trigger browser-level Push Notifications AND dispatch a global CustomEvent
 * for the high-fidelity iOS/Android Simulated Notification Banner UI.
 */
export function sendPushNotification(
  title: string,
  body: string,
  type: PushNotificationDetail["type"] = "info"
) {
  const time = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const detail: PushNotificationDetail = {
    id: "notify-" + Math.random().toString(36).substring(2, 9),
    title,
    body,
    type,
    time,
  };

  // 1. Dispatch custom event for our React in-app device simulator banners
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app-web-push", { detail }));
  }

  // 2. Try triggering native browser notification if granted
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification(title, {
        body,
        icon: "https://cdn-icons-png.flaticon.com/512/3602/3652191.png",
      });
    } catch (e) {
      console.warn("Standard notification blocked or failed in sandboxed iframe. Falling back to in-app simulation.", e);
    }
  }
}
