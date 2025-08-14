package com.donation.Donation.service;

import com.donation.Donation.model.Donations;
import com.donation.Donation.model.Otp;
import com.donation.Donation.model.Status;
import com.donation.Donation.repository.OtpRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.Random;
@Service
public class OtpService {

    @Autowired
    private OtpRepository otpRepository;

    @Autowired
    private SmsNotificationService smsNotificationService;

    public String generateOtp() {
        return String.valueOf(new Random().nextInt(900000) + 100000);
    }

    public void sendOtpToNgo(Donations donation) {
        String otp = generateOtp();
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(10);

        Otp existingOtp = otpRepository.findByDonation(donation).orElse(new Otp());
        existingOtp.setCode(otp);
        existingOtp.setExpiryTime(expiry);
        existingOtp.setDonation(donation);

        otpRepository.save(existingOtp);

        String ngoPhone = donation.getClaimedByNgo().getPhone();
        String message = "Your OTP for completing donation is: " + otp;
        smsNotificationService.sendSms(ngoPhone, message);
    }

}
