package com.donation.Donation.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
public class Otp {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String code;
    private LocalDateTime expiryTime;

    @OneToOne
    @JoinColumn(name = "donation_id")  // specify join column explicitly
    private Donations donation;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public LocalDateTime getExpiryTime() {
        return expiryTime;
    }

    public void setExpiryTime(LocalDateTime expiryTime) {
        this.expiryTime = expiryTime;
    }

    public Donations getDonation() {
        return donation;
    }

    public void setDonation(Donations donation) {
        this.donation = donation;
    }
}

