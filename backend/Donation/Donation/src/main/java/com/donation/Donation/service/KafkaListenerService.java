package com.donation.Donation.service;

import com.donation.Donation.dto.DonationEventDTO;
import com.donation.Donation.model.Notification;
import com.donation.Donation.model.Role;
import com.donation.Donation.model.User;
import com.donation.Donation.repository.NotificationRepository;
import com.donation.Donation.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class KafkaListenerService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FirebaseMessagingService firebaseMessagingService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final Logger logger = LoggerFactory.getLogger(KafkaListenerService.class);

    @KafkaListener(topics = "donation.created", groupId = "donation-group")
    public void listenDonationCreated(String message) {
        logger.info("Received message on topic 'donation.created': {}", message);

        try {
            DonationEventDTO event = objectMapper.readValue(message, DonationEventDTO.class);
            List<User> ngos = userRepository.findAllByRole(Role.ROLE_NGO);

            for (User ngo : ngos) {
                // Save to DB
                Notification notification = new Notification();
                notification.setUserId(ngo.getUserId());
                notification.setMessage("New donation available near you. Donation ID: " + event.getDonationId());
                notification.setTopic("donation.created");
                notification.setCreatedAt(LocalDateTime.now());
                notificationRepository.save(notification);

                Set<String> tokens = ngo.getFirebaseTokens();
                if (tokens == null || tokens.isEmpty()) continue;

                for (String token : tokens) {
                    Map<String, String> data = new HashMap<>();
                    data.put("donationId", String.valueOf(event.getDonationId()));

                    firebaseMessagingService.sendPushNotification(
                            token,
                            "New Donation Nearby",
                            "Donation ID: " + event.getDonationId(),
                            data
                    );
                }
            }

        } catch (Exception e) {
            logger.error("❌ Error processing donation.created event", e);
        }
    }

    @KafkaListener(topics = "donation.requested", groupId = "donation-group")
    public void listenDonationRequested(String message) {
        logger.info("Received message on topic 'donation.requested': {}", message);

        try {
            DonationEventDTO event = objectMapper.readValue(message, DonationEventDTO.class);

            Notification notification = new Notification();
            notification.setUserId(event.getDonorId());
            notification.setMessage("Your donation #" + event.getDonationId() + " has been requested by an NGO.");
            notification.setTopic("donation.requested");
            notification.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(notification);

            userRepository.findById(event.getDonorId()).ifPresent(user -> {
                for (String token : user.getFirebaseTokens()) {
                    Map<String, String> data = new HashMap<>();
                    data.put("donationId", String.valueOf(event.getDonationId()));

                    firebaseMessagingService.sendPushNotification(
                            token,
                            "Donation Requested",
                            "Your donation #" + event.getDonationId() + " has been requested.",
                            data
                    );
                }
            });

        } catch (Exception e) {
            logger.error("Failed to process donation.requested message", e);
        }
    }

    @KafkaListener(topics = "donation.completed", groupId = "donation-group")
    public void listenDonationCompleted(String message) {
        logger.info("Received message on topic 'donation.completed': {}", message);

        try {
            DonationEventDTO event = objectMapper.readValue(message, DonationEventDTO.class);

            // Donor notification
            Notification donorNotification = new Notification();
            donorNotification.setUserId(event.getDonorId());
            donorNotification.setMessage("Your donation #" + event.getDonationId() + " was successfully completed.");
            donorNotification.setTopic("donation.completed");
            donorNotification.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(donorNotification);

            userRepository.findById(event.getDonorId()).ifPresent(user -> {
                for (String token : user.getFirebaseTokens()) {
                    Map<String, String> data = new HashMap<>();
                    data.put("donationId", String.valueOf(event.getDonationId()));

                    firebaseMessagingService.sendPushNotification(
                            token,
                            "Donation Completed",
                            "Your donation #" + event.getDonationId() + " was completed.",
                            data
                    );
                }
            });

            // NGO notification
            if (event.getNgoId() != 0) {
                Notification ngoNotification = new Notification();
                ngoNotification.setUserId(event.getNgoId());
                ngoNotification.setMessage("You have successfully received donation #" + event.getDonationId());
                ngoNotification.setTopic("donation.completed");
                ngoNotification.setCreatedAt(LocalDateTime.now());
                notificationRepository.save(ngoNotification);

                userRepository.findById(event.getNgoId()).ifPresent(user -> {
                    for (String token : user.getFirebaseTokens()) {
                        Map<String, String> data = new HashMap<>();
                        data.put("donationId", String.valueOf(event.getDonationId()));

                        firebaseMessagingService.sendPushNotification(
                                token,
                                "Donation Received",
                                "You received donation #" + event.getDonationId(),
                                data
                        );
                    }
                });
            }

        } catch (Exception e) {
            logger.error("Failed to process donation.completed message", e);
        }
    }
}
