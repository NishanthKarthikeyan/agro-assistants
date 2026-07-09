import React from 'react';
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import app, { db } from "../config/firebase";
import api from "../utils/api";
import toast from "react-hot-toast";

const VAPID_KEY = "BOOKg6dGM71DswoBVKZ96G6CANFfTgDWQzsZJ4TErDWZv5GXcoBM838Btp8ZLNWa_a1e6MR4LVsY6yvNUqyg8xQ";

class NotificationService {
  constructor() {
    this.messaging = null;
    try {
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        this.messaging = getMessaging(app);
      }
    } catch (e) {
      console.warn("FCM is not supported in this browser environment.", e);
    }
  }

  async requestPermissionAndGetToken(uid) {
    if (!this.messaging) {
      console.warn("FCM messaging not available in this browser.");
      return null;
    }

    try {
      console.log("Requesting notification permission...");
      const permission = await Notification.requestPermission();
      console.log("Notification permission result:", permission);
      
      if (permission === "granted") {
        console.log("Permission granted! Generating FCM token with VAPID key...");
        try {
          const token = await getToken(this.messaging, {
            vapidKey: VAPID_KEY,
          });
          if (token) {
            console.log("FCM Token resolved:", token);
            await api.post("/api/notifications/register-token", { fcmToken: token });
            console.log("FCM Token registered with backend successfully!");
            return token;
          } else {
            console.warn("No FCM token returned. Check VAPID key in Firebase Console > Project Settings > Cloud Messaging > Web Push certificates");
          }
        } catch (tokenError) {
          console.error("FCM getToken() failed:", tokenError);
          console.error("This usually means the VAPID key is invalid or Cloud Messaging API is not enabled.");
          console.error("Current VAPID key length:", VAPID_KEY.length, "(should be ~87 chars)");
        }
      } else {
        console.warn("Notification permission denied by user.");
      }
    } catch (error) {
      console.error("An error occurred while requesting permission:", error);
    }
    return null;
  }

  listenForForegroundMessages() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log("Foreground Message received:", payload);
      const { title, body } = payload.notification || {};
      
      if (Notification.permission === "granted") {
        try {
          // Trigger a native OS-level browser notification
          new Notification(title || "AI Agro Assistant Alert", {
            body: body || "",
            icon: "/favicon.svg",
          });
        } catch (err) {
          console.warn("Could not show native notification in this environment:", err);
        }
      }
    });
  }

  listenForFirestoreNotifications(uid) {
    if (!db) {
      console.warn("Firestore database instance not available for notifications.");
      return () => {};
    }

    console.log(`Setting up real-time Firestore notification listener for user: ${uid}`);
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      where("isRead", "==", false),
      orderBy("timestamp", "desc"),
      limit(5)
    );

    let isInitialLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.title && data.body) {
            import('../utils/notifications').then(m => {
              m.triggerNotification(data.title, data.body);
            });
          }
        }
      });
    }, (error) => {
      console.warn("Error listening to Firestore notifications:", error);
    });

    return unsubscribe;
  }
}

export const notificationService = new NotificationService();
