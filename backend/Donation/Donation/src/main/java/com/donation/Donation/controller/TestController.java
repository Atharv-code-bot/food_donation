package com.donation.Donation.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    @GetMapping("/test")
    public String testWebhook() {
        return "Ganpati bappa morya ";
    }
}
