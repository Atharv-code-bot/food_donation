package com.donation.Donation.repository;

import com.donation.Donation.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    void deleteAllByCreatedAtBefore(LocalDateTime dateTime);
}

