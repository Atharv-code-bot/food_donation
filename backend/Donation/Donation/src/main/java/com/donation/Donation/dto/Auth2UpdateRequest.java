package com.donation.Donation.dto;

import com.donation.Donation.model.Role;
import lombok.Data;

@Data
public class Auth2UpdateRequest {
    private Role role;
    private String phone;
    private String address;
    private Double latitude;
    private Double longitude;
}
