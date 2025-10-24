// src/firebase-messaging-sw.js
// ✅ FIX: Import Firebase modular SDK scripts for service worker
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js"); // Use latest version
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js"); // Use latest version

// Your Firebase config
firebase.initializeApp({
  apiKey: "AIzaSyBFY0MqFTTtNpSgARdzJc0kOfjP9M9AbV4",
  authDomain: "food-donation-app-8fba5.firebaseapp.com",
  projectId: "food-donation-app-8fba5",
  storageBucket: "food-donation-app-8fba5.firebasestorage.app",
  messagingSenderId: "437904569983",
  appId: "1:437904569983:web:94cc5141a093685687b14a",
  measurementId: "G-GF6ZCB266K"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon.png"
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ✅ Optional: Handle onMessage for foreground notifications
// messaging.onMessage(payload => {
//   console.log("[firebase-messaging-sw.js] Received foreground message ", payload);
//   // You can handle foreground notifications here
// });