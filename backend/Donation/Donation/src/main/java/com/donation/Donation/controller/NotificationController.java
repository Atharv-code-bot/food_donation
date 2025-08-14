package com.donation.Donation.controller;

import com.donation.Donation.model.Notification;
import com.donation.Donation.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    // 1. Get count of unread notifications
    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount() {
        return ResponseEntity.ok(notificationService.getUnreadCount());
    }

    // 2. Get all notifications in descending order
    @GetMapping
    public ResponseEntity<List<Notification>> getAllNotifications() {
        return ResponseEntity.ok(notificationService.getAllNotifications());
    }

    // 3. Mark as read
    @PutMapping("/{id}/mark-read")
    public ResponseEntity<String> markAsRead(@PathVariable Long id) {
        boolean updated = notificationService.markAsRead(id);
        if (updated) {
            return ResponseEntity.ok("Notification marked as read successfully");
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Notification not found");
        }
    }
}
