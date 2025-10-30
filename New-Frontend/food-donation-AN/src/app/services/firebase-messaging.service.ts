// src/app/services/firebase-messaging.service.ts
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class FirebaseMessagingService {
  private messaging: any | null = null;
  private platformId = inject(PLATFORM_ID);
  private VAPID_KEY = 'BORi7zm4hRZC6o7iXm3mAyxVMUHjINrNddjcIEq8_o95Iylvkda8J0FrxHPHIv9ESJNXcJRqJkih7phMQR_rZ20';

  constructor() {
    this.initializeFirebase();
  }

  private async initializeFirebase(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getMessaging } = await import('firebase/messaging');

      const firebaseConfig = {
        apiKey: "AIzaSyBFY0MqFTTtNpSgARdzJc0kOfjP9M9AbV4",
        authDomain: "food-donation-app-8fba5.firebaseapp.com",
        projectId: "food-donation-app-8fba5",
        storageBucket: "food-donation-app-8fba5.firebasestorage.app",
        messagingSenderId: "437904569983",
        appId: "1:437904569983:web:94cc5141a093685687b14a",
        measurementId: "G-GF6ZCB266K"
      };

      try {
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        this.messaging = getMessaging(app);
        console.log("Firebase Messaging initialized on client.");
      } catch (err) {
        console.error("Error initializing Firebase Messaging:", err);
      }
    }
  }

  async requestPermissionAndGetToken(): Promise<string | null> {
    // We can't rely on `this.messaging` being a v8 object, so we must
    // dynamically import the `getToken` function.
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('Firebase Messaging is not initialized (not in a browser).');
      return null;
    }
    
    // ✅ FIX: The getToken function is now imported and used directly, not as a method
    const { getToken } = await import('firebase/messaging');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
      }
      
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      // No useServiceWorker in v9+
      
      // ✅ FIX: Use the getToken function with the messaging instance as the first argument
      const token = await getToken(this.messaging, { vapidKey: this.VAPID_KEY });
      if (token) {
        console.log('✅ FCM Token:', token);
        return token;
      } else {
        console.warn('No registration token available');
        return null;
      }
    } catch (err) {
      console.error('Error getting FCM token:', err);
      return null;
    }
  }
}