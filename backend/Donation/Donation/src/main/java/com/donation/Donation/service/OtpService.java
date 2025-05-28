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

    @Value("${fast2sms.api.key}")
    private String fast2smsApiKey;

    public String generateOtp() {
        return String.valueOf(new Random().nextInt(900000) + 100000); // 6-digit
    }

    public void sendOtpToNgo(Donations donation) {
        String otp = generateOtp();
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(10);

        Otp otpEntity = new Otp();
        otpEntity.setCode(otp);
        otpEntity.setExpiryTime(expiry);
        otpEntity.setDonation(donation);
        otpRepository.save(otpEntity);

        String ngoPhone = donation.getClaimedByNgo().getPhone();
        String message = "Your OTP for completing donation is: " + otp;

        try {
            sendSmsViaFast2SMS(ngoPhone, message);
        } catch (Exception e) {
            throw new RuntimeException("SMS sending failed: " + e.getMessage());
        }
    }


    // Reuse your existing SMSService or call Fast2SMS API here
    private void sendSmsViaFast2SMS(String phone, String message) {
        String url = UriComponentsBuilder
                .fromHttpUrl("https://www.fast2sms.com/dev/bulkV2")
                .queryParam("authorization",fast2smsApiKey)
                .queryParam("route", "otp")
                .queryParam("variables_values", message)
                .queryParam("numbers", phone)
                .queryParam("flash", "0")
                .build()
                .toUriString();

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.set("accept", "application/json");
        HttpEntity<String> entity = new HttpEntity<>(headers);

        restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
    }
}

