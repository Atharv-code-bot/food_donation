    package com.donation.Donation.service;

    import com.donation.Donation.config.TwilioConfig;
    import com.twilio.Twilio;
    import com.twilio.rest.api.v2010.account.Message;
    import com.twilio.type.PhoneNumber;
    import org.slf4j.Logger;
    import org.slf4j.LoggerFactory;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.stereotype.Service;
    @Service
    public class SmsNotificationService {
        private final TwilioConfig twilioConfig;
        private static final Logger logger = LoggerFactory.getLogger(SmsNotificationService.class);

        public SmsNotificationService(TwilioConfig twilioConfig) {
            this.twilioConfig = twilioConfig;
        }

        public void sendSms(String phoneNumber, String message) {
            try {

                if (!phoneNumber.startsWith("+")) {
                    phoneNumber = "+91" + phoneNumber;
                }

                Message sentMessage = Message.creator(
                        new PhoneNumber(phoneNumber),
                        new PhoneNumber(twilioConfig.getPhoneNumber()),  // From Twilio number
                        message
                ).create();

                logger.info(" SMS sent successfully to {}", phoneNumber);
            } catch (Exception e) {
                logger.error(" Failed to send SMS to {}", phoneNumber, e);
                throw new RuntimeException("SMS sending failed: " + e.getMessage());
            }
        }

    }
