package com.donation.Donation.model;

import com.donation.Donation.model.AuthProvider;
import com.donation.Donation.model.Role;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private int userId;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = true) // Nullable for OAuth2 users
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Role role;

    @Column(nullable = false, length = 100)
    private String fullname;

    @Column(nullable = true, length = 15) // Optional for OAuth2 users
    private String phone;

    @Column(nullable = true, columnDefinition = "TEXT") // Optional for OAuth2 users
    private String address;

    @Column(nullable = true)
    private Double defaultLatitude;

    @Column(nullable = true)
    private Double defaultLongitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuthProvider provider;  // OAuth provider (Google, Facebook, etc.)

    @Column(unique = true, nullable = true) // Nullable for non-OAuth users
    private String providerId;  // OAuth provider uniqu IeD

    @Column(nullable = true) // Optional field for profile images
    private String profileImageUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;




}
