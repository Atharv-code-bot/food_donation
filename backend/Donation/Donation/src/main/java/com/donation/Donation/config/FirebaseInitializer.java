package com.donation.Donation.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.FileInputStream;
import java.io.InputStream;

@Component
public class FirebaseInitializer {

    @Value("${firebase.config.path}")
    private String firebaseConfigPath;

    @PostConstruct
    public void init() {
        try {
            InputStream serviceAccount;

            if (firebaseConfigPath.startsWith("classpath:")) {
                serviceAccount = getClass()
                        .getClassLoader()
                        .getResourceAsStream(firebaseConfigPath.replace("classpath:", ""));
            } else {
                serviceAccount = new FileInputStream(firebaseConfigPath);
            }

            if (serviceAccount == null) {
                throw new IllegalStateException("❌ Firebase service account file not found at: " + firebaseConfigPath);
            }

            FirebaseOptions options = new FirebaseOptions.Builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
            }

            System.out.println("✅ Firebase Initialized from: " + firebaseConfigPath);
        } catch (Exception e) {
            System.err.println("❌ Firebase initialization failed: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
