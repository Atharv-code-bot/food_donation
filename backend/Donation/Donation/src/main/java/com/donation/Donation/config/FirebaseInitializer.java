package com.donation.Donation.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.io.InputStream;

@Component
public class FirebaseInitializer {

    @PostConstruct
    public void init() {
        try {
            // Load from resources folder via classpath
            InputStream serviceAccount = getClass()
                    .getClassLoader()
                    .getResourceAsStream("food-donation-app-8fba5-firebase-adminsdk-fbsvc-070e77bb25.json");

            if (serviceAccount == null) {
                throw new IllegalStateException("❌ Firebase service account file not found in resources!");
            }

            FirebaseOptions options = new FirebaseOptions.Builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
            }

            System.out.println("✅ Firebase Initialized");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
