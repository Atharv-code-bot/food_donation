package com.donation.Donation.repository;

import com.donation.Donation.model.Donations;
import com.donation.Donation.model.Otp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OtpRepository extends JpaRepository<Otp, Long> {
    Optional<Otp> findByDonation(Donations donation);
    Optional<Otp> findByDonation_DonationId(int donationId);

}

