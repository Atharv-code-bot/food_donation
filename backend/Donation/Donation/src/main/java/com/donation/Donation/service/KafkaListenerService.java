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
import java.util.List;

@Service
public class KafkaListenerService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final Logger logger = LoggerFactory.getLogger(KafkaListenerService.class);


    @KafkaListener(topics = "donation.created", groupId = "donation-group")
    public void listenDonationCreated(String message) {

        logger.info("Received message on topic 'donation.created': {}", message);

//        try {
//            DonationEventDTO event = objectMapper.readValue(message, DonationEventDTO.class);
//
//            List<User> ngos = userRepository.findAllByRole(Role.ROLE_NGO);
//
//            for (User ngo : ngos) {
//                Notification notification = new Notification();
//                notification.setUserId(ngo.getUserId());
//                notification.setMessage("New donation available near you. Donation ID: " + event.getDonationId());
//                notification.setTopic("donation.created");
//                notification.setCreatedAt(LocalDateTime.now());
//                notificationRepository.save(notification);
//            }
//
//        } catch (Exception e) {
//            e.printStackTrace();
//        }
    }

    @KafkaListener(topics = "donation.requested", groupId = "donation-group")
    public void listenDonationRequested(String message) {

        logger.info("Received message on topic 'donation.requested': {}", message);

//        try {
//            DonationEventDTO event = objectMapper.readValue(message, DonationEventDTO.class);
//
//            Notification notification = new Notification();
//            notification.setUserId(event.getDonorId());
//            notification.setMessage("Your donation #" + event.getDonationId() + " has been requested by an NGO.");
//            notification.setTopic("donation.requested");
//            notification.setCreatedAt(LocalDateTime.now());
//            notificationRepository.save(notification);
//
//        } catch (Exception e) {
//            e.printStackTrace();
//        }
    }

    @KafkaListener(topics = "donation.completed", groupId = "donation-group")
    public void listenDonationCompleted(String message) {

        logger.info("Received message on topic 'donation.completed': {}", message);

//        try {
//            DonationEventDTO event = objectMapper.readValue(message, DonationEventDTO.class);
//
//            // Notify donor
//            Notification donorNotification = new Notification();
//            donorNotification.setUserId(event.getDonorId());
//            donorNotification.setMessage("Your donation #" + event.getDonationId() + " was successfully completed.");
//            donorNotification.setTopic("donation.completed");
//            donorNotification.setCreatedAt(LocalDateTime.now());
//            notificationRepository.save(donorNotification);
//
//            // Notify NGO if present
//            if (event.getNgoId() != 0) {
//                Notification ngoNotification = new Notification();
//                ngoNotification.setUserId(event.getNgoId());
//                ngoNotification.setMessage("You have successfully received donation #" + event.getDonationId());
//                ngoNotification.setTopic("donation.completed");
//                ngoNotification.setCreatedAt(LocalDateTime.now());
//                notificationRepository.save(ngoNotification);
//            }
//
//        } catch (Exception e) {
//            e.printStackTrace();
//        }
    }
}
