package com.donation.Donation.repository;

import com.donation.Donation.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    void deleteAllByCreatedAtBefore(LocalDateTime dateTime);
    long countByUserIdAndIsReadFalse(int userId);

    List<Notification> findByUserIdOrderByCreatedAtDesc(int userId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.id = :notificationId AND n.userId = :userId")
    int markAsRead(Long notificationId, int userId);
}

