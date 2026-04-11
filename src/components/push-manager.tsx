"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPush() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return;

  const registration = await navigator.serviceWorker.ready;

  // Check if already subscribed
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    // Send to server in case it's a new device/browser
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(existing.toJSON()),
    }).catch(() => {});
    return;
  }

  // Subscribe
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
  });

  // Send subscription to server
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  }).catch(() => {});
}

export default function PushManager() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading" || !session?.user) return;
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        // Request notification permission
        if (Notification.permission === "granted") {
          subscribeToPush();
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              subscribeToPush();
            }
          });
        }
      })
      .catch((err) => console.error("[SW] Registration failed:", err));
  }, [session]);

  return null;
}
