package com.donation.Donation.service;

import com.donation.Donation.dto.DonationEventDTO;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class KafkaProducerService {

    private static final String TOPIC_DONATION_CREATED = "donation.created";
    private static final String TOPIC_DONATION_REQUESTED = "donation.requested";
    private static final String TOPIC_DONATION_COMPLETED = "donation.completed";

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public void sendDonationCreated(DonationEventDTO event) {
        sendMessage(TOPIC_DONATION_CREATED, event);
    }

    public void sendDonationRequested(DonationEventDTO event) {
        sendMessage(TOPIC_DONATION_REQUESTED, event);
    }

    public void sendDonationCompleted(DonationEventDTO event) {
        sendMessage(TOPIC_DONATION_COMPLETED, event);
    }

    private void sendMessage(String topic, DonationEventDTO event) {
        try {
            String json = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(topic, json);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }
    }
}

