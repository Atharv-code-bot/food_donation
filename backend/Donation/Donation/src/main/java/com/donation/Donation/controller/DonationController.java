package com.donation.Donation.controller;

import com.donation.Donation.dto.DonationRequest;
import com.donation.Donation.dto.DonationResponse;
import com.donation.Donation.dto.UserResponse;
import com.donation.Donation.model.Donations;
import com.donation.Donation.repository.DonationRepository;
import com.donation.Donation.service.DonationService;
import com.donation.Donation.service.FileStorageService;
import com.donation.Donation.service.OtpService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/donations")
public class DonationController {
    @Autowired
    private DonationService donationService;

    @Autowired
    FileStorageService fileStorageService;

    @Autowired
    DonationRepository donationRepository;

    @Autowired
    OtpService otpService;

    @PostMapping
    public ResponseEntity<?> createDonation(
            @RequestParam("donationRequest") String donationRequest,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            DonationRequest donation = objectMapper.readValue(donationRequest, DonationRequest.class);

            DonationResponse response = donationService.createDonation(donation, image);
            return ResponseEntity.ok(response);
        }
        catch (Exception e) {

            return ResponseEntity.badRequest().body("Error parsing request: " + e.getMessage());
        }
    }





    @GetMapping("{id}")
    public ResponseEntity<?> getDonation(@PathVariable int id) {
        try {
            DonationResponse response = donationService.getDonation(id);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/admin")
    public ResponseEntity<?> getAllDonations() {
        try {
            List<DonationResponse> response = donationService.getAllDonations();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/user/{stat}")
    public ResponseEntity<?>  getDonationsByUser(@PathVariable String stat){
        try {
            List<DonationResponse> response  = donationService.getDonationByDonor(stat);
            return ResponseEntity.ok(response);
        }
        catch(Exception e){
            return ResponseEntity.status(500).body(e.getMessage());
        }

    }

    @GetMapping("/ngo/{stat}")
    public ResponseEntity<?>  getDonationsByngo(@PathVariable String stat){
        try {
            List<DonationResponse> response  = donationService.getDonationByNGO(stat);
            return ResponseEntity.ok(response);
        }
        catch(Exception e){
            return ResponseEntity.status(500).body(e.getMessage());
        }

    }

    @GetMapping("/status/{stat}")
    public ResponseEntity<?> getDonationByStatus(@PathVariable String stat) {
        try {
            List<DonationResponse> response = donationService.getDonationsByStatus(stat);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }


//    @GetMapping("/images/{fileName}")
//    public ResponseEntity<byte[]> getImage(@PathVariable String fileName) {
//        try {
//            byte[] image = fileStorageService.getFile(fileName);
//            return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).body(image);
//        } catch (Exception e) {
//            return ResponseEntity.status(404).body(null);
//        }
//    }

    @PutMapping("/{id}/claim")
    public ResponseEntity<?>claimDonation(@PathVariable int id) {
        try{
            DonationResponse response = donationService.claimDonation(id);
            return ResponseEntity.ok(response);
        }
        catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/{id}/send-otp")
    public ResponseEntity<String> sendOtp(@PathVariable int id) {
        Donations donation = donationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Donation not found"));
        otpService.sendOtpToNgo(donation);
        return ResponseEntity.ok("OTP sent to NGO successfully.");
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<?>completeDonation(@PathVariable int id, @RequestParam String otp) {
        try{
            DonationResponse response = donationService.completeDonation(id,otp);
            return ResponseEntity.ok(response);
        }
        catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateDonation(
            @RequestParam("donationRequest") String donationRequest,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @PathVariable int id) {

        try {
            ObjectMapper objectMapper = new ObjectMapper();
            DonationRequest donation = objectMapper.readValue(donationRequest, DonationRequest.class);

            DonationResponse response = donationService.updateDonation(donation, image, id);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error parsing request: " + e.getMessage());
        }
    }



    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDonation(@PathVariable int id) {
        try{
            donationService.deleteDonation(id);
            return ResponseEntity.ok("Donation deleted successfully");
        }
        catch (ResponseStatusException e){
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        }
    }


    // ✅ 1. Get Available Donations for NGOs (with filtering & sorting)
    @GetMapping("/available")
    public ResponseEntity<?> getAvailableDonations(
            @RequestParam(required = false) String foodCategory,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expirationDate,
            @RequestParam(defaultValue = "bestBeforeDate") String sortBy,
            @RequestParam(defaultValue = "false") boolean desc) {

        List<DonationResponse> donations = donationService.getAvailableDonations(foodCategory, expirationDate, sortBy, desc);
        return ResponseEntity.ok(donations);
    }

    // ✅ 2. Get Claimed Donations for NGOs (with filtering & sorting)
    @GetMapping("/claimed")
    public ResponseEntity<?> getClaimedDonationsForNgo(
            @RequestParam(required = false) String foodCategory,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expirationDate,
            @RequestParam(defaultValue = "bestBeforeDate") String sortBy,
            @RequestParam(defaultValue = "false") boolean desc) {

        List<DonationResponse> donations = donationService.getClaimedDonationsForNgo(foodCategory, expirationDate, sortBy, desc);
        return ResponseEntity.ok(donations);
    }

    // ✅ 3. Get Past Donations for Donors (with filtering & sorting)
    @GetMapping("/past")
    public ResponseEntity<?> getPastDonationsForDonor(
            @RequestParam(required = false) String foodCategory,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expirationDate,
            @RequestParam(defaultValue = "bestBeforeDate") String sortBy,
            @RequestParam(defaultValue = "false") boolean desc) {

        List<DonationResponse> donations = donationService.getPastDonationsForDonor(foodCategory, expirationDate, sortBy, desc);
        return ResponseEntity.ok(donations);
    }

}
