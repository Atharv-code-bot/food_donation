package com.donation.Donation.service;

import com.donation.Donation.dto.DonationEventDTO;
import com.donation.Donation.dto.DonationResponse;
import com.donation.Donation.dto.UserResponse;
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
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class KafkaListenerService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailNotificationService emailService;

    @Autowired
    private UserService userService;

    @Autowired
    private DonationService donationService;

    @Autowired
    private SmsNotificationService smsService;

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
            UserResponse donor=userService.getUserById(event.getDonorId());

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

            String emailSubject = "Your Food Donation is Live!";
            String emailBody = "Thank you for donating food! Your donation is now available for NGOs to claim.";

            try {

                emailService.sendEmail(donor.getEmail(), emailSubject, emailBody);

//                 if (donor.getPhone() != null) {
//                 String smsMessage = "Your food donation is live! NGOs can now claim it.";
//                 smsService.sendSms(donor.getPhone(), smsMessage);
//                 }
            } catch (Exception e) {
                logger.error("Failed to send notification: Donation will not be committed", e);
                throw new RuntimeException("Donation failed due to notification error.");
            }

        } catch (Exception e) {
            logger.error("❌ Error processing donation.created event", e);
        }
    }

    @KafkaListener(topics = "donation.requested", groupId = "donation-group")
    @Transactional
    public void listenDonationRequested(String message) {
        logger.info("Received message on topic 'donation.requested': {}", message);

        try {
            DonationEventDTO event = objectMapper.readValue(message, DonationEventDTO.class);
            DonationResponse donation=donationService.getDonation(event.getDonationId());
            UserResponse donor=userService.getUserById(event.getDonorId());
            UserResponse ngo=userService.getUserById(event.getNgoId());

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

            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy");
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("hh:mm a");

            String startDate = donation.getAvailabilityStart().format(dateFormatter);
            String startTime = donation.getAvailabilityStart().format(timeFormatter);
            String endDate = donation.getAvailabilityEnd().format(dateFormatter);
            String endTime = donation.getAvailabilityEnd().format(timeFormatter);

            String emailSubject = "Your Donation Has Been Claimed!";
            String emailBody = String.format(
                    """
                            <html>
                            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                <p>Hello <b>%s</b>,</p>

                                <p>Great news! Your donation has been <b>claimed</b> by <b>%s</b>. Thank you for your generosity! 🎉</p>

                                <h3>📦 Donation Details:</h3>
                                <ul>
                                    <li><b>Food Item:</b> %s</li>
                                    <li><b>Quantity:</b> %s</li>
                                    <li><b>Pickup Location:</b> %s</li>
                                </ul>

                                <h3>⏳ Availability Period:</h3>
                                <ul>
                                    <li>📅 <b>Start Date:</b> %s</li>
                                    <li>🕒 <b>Start Time:</b> %s</li>
                                    <li>📅 <b>End Date:</b> %s</li>
                                    <li>🕒 <b>End Time:</b> %s</li>
                                </ul>


                                <p>Your contribution makes a real difference. We appreciate your kindness! ❤️</p>

                                <p>Best Regards,</p>
                                <p><b>✨ Food Donation Platform Team</b></p>
                            </body>
                            </html>
                            """,
                    donor.getFullname(),
                    ngo.getFullname(),
                    donation.getItemName(),
                    donation.getQuantity(),
                    donation.getPickupLocation(),
                    startDate,
                    startTime,
                    endDate,
                    endTime);

            try {
                emailService.sendEmail(donor.getEmail(), emailSubject, emailBody);

//                 if (donor.getPhone() != null) {
//                     String smsMessage = "Your donation has been claimed by " + ngo.getFullname()
//                     + "! Thank you for your generosity.";
//                     smsService.sendSms(donor.getPhone(), smsMessage);
//                 }
            } catch (Exception e) {
                logger.error("Failed to send notification: Donation claim will not be committed", e);
                throw new RuntimeException("Donation claim failed due to notification error.");
            }


        } catch (Exception e) {
            logger.error("Failed to process donation.requested message", e);
        }
    }

    @KafkaListener(topics = "donation.completed", groupId = "donation-group")
    public void listenDonationCompleted(String message) {
        logger.info("Received message on topic 'donation.completed': {}", message);

        try {
            DonationEventDTO event = objectMapper.readValue(message, DonationEventDTO.class);
            DonationResponse donation=donationService.getDonation(event.getDonationId());
            UserResponse donor=userService.getUserById(event.getDonorId());


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


            String emailSubject = "Donation Collected Successfully!";
            String emailBody = String.format(
                    """
                            <html>
                            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                <p>Hello <b>%s</b>,</p>
    
                                <p>Your donation has been successfully <b>collected</b>. Thank you for your generous contribution!</p>
    
                                <h3>Donation Details:</h3>
                                <ul>
                                    <li><b>Food Item:</b> %s</li>
                                    <li><b>Quantity:</b> %s</li>
                                    <li><b>Pickup Location:</b> %s</li>
                                </ul>
    
                                <p>We truly appreciate your kindness and generosity in helping those in need. ❤️</p>
    
                                <p>Best Regards,</p>
                                <p><b>Food Donation Platform Team</b></p>
                            </body>
                            </html>
                            """,
                    donor.getFullname(),
                    donation.getItemName(),
                    donation.getQuantity(),
                    donation.getPickupLocation());



            try {
                emailService.sendEmail(donor.getEmail(), emailSubject, emailBody);
//                if (donor.getPhone() != null && !donor.getPhone().isEmpty()) {
//                    String smsMessage = "Dear " + donor.getFullname() + ", your donation has been " +
//                            "successfully collected! Thank you for your generosity.";
//                    smsService.sendSms(donor.getPhone(), smsMessage);
//                }


            } catch (Exception e) {
                logger.error("❌ Failed to send email to donor {}", donor.getEmail(), e);
                throw new RuntimeException("Email sending failed: " + e.getMessage());
            }


        } catch (Exception e) {
            logger.error("Failed to process donation.completed message", e);
        }
    }
}
