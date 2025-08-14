package com.donation.Donation.service;

import com.donation.Donation.config.AuthUtil;
import com.donation.Donation.model.Notification;
import com.donation.Donation.repository.NotificationRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private AuthUtil authUtil;

    // Run every day at midnight to delete notifications older than 30 days
    @Scheduled(cron = "0 0 0 * * ?")
    public void deleteOldNotifications() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
        notificationRepository.deleteAllByCreatedAtBefore(cutoff);
    }


    public long getUnreadCount() {
        int userId = authUtil.getLoggedInUser().getUserId();
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public List<Notification> getAllNotifications() {
        int userId = authUtil.getLoggedInUser().getUserId();
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public boolean markAsRead(Long notificationId) {
        int userId = authUtil.getLoggedInUser().getUserId();
        return notificationRepository.markAsRead(notificationId, userId) > 0;
    }
}
