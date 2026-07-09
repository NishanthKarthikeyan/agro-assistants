importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCXK0KHqLhKVAAm5xr0ASbFKJM5IwVLeTY",
  authDomain: "agri--sps-project.firebaseapp.com",
  projectId: "agri--sps-project",
  storageBucket: "agri--sps-project.firebasestorage.app",
  messagingSenderId: "762110077628",
  appId: "1:762110077628:web:9d219b9d67bbecf270beb9"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title || "Agri Assistant Alert";
  const notificationOptions = {
    body: payload.notification.body || "",
    icon: '/favicon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
