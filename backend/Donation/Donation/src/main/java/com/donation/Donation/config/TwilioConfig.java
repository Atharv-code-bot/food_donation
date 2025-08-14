package com.donation.Donation.config;

import com.twilio.Twilio;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

@Component  // ✅ Ensure this is a component so that Spring loads it
@ConfigurationProperties(prefix = "twilio")
public class TwilioConfig {

    private String accountSid;
    private String authToken;
    private String phoneNumber;  // Ensure the field name matches application.properties

    @PostConstruct
    public void init() {
        if (accountSid == null || authToken == null || phoneNumber == null) {
            throw new IllegalStateException("Twilio configuration properties are missing.");
        }
        Twilio.init(accountSid, authToken);
    }

    public String getAccountSid() {
        return accountSid;
    }

    public void setAccountSid(String accountSid) {
        this.accountSid = accountSid;
    }

    public String getAuthToken() {
        return authToken;
    }

    public void setAuthToken(String authToken) {
        this.authToken = authToken;
    }

    public String getPhoneNumber() {  // ✅ Ensure correct getter
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {  // ✅ Ensure correct setter
        this.phoneNumber = phoneNumber;
    }
}
