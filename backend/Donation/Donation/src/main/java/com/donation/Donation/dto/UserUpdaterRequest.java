package com.donation.Donation.dto;

import com.donation.Donation.model.Role;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdaterRequest {
    private String fullname;
    private String phone;
    private String address;
    private Double latitude;
    private Double longitude;
}
