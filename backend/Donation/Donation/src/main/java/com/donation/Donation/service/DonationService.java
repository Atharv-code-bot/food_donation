package com.donation.Donation.service;

import com.donation.Donation.config.AuthUtil;
import com.donation.Donation.dto.DonationEventDTO;
import com.donation.Donation.dto.DonationRequest;
import com.donation.Donation.dto.DonationResponse;
import com.donation.Donation.model.*;
import com.donation.Donation.repository.DonationRepository;
import com.donation.Donation.repository.OtpRepository;
import com.donation.Donation.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.fasterxml.jackson.core.type.TypeReference;

import org.apache.coyote.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class DonationService {

    private static final Logger logger = LoggerFactory.getLogger(DonationService.class);
    @Autowired
    private DonationRepository donationRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private RedisService redisService;

    @Autowired
    private AuthUtil authUtil;

    @Autowired
    private OtpRepository otpRepository;

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private EmailNotificationService emailService;
    @Autowired
    private SmsNotificationService smsService;
    @Qualifier("objectMapper")
    @Autowired
    private ObjectMapper objectMapper;


    @Value("${donation.expiry.grace-hours}")
    private long graceHours;


    @Autowired
    private KafkaProducerService kafkaProducerService;



    @Transactional
    public DonationResponse createDonation(DonationRequest request, MultipartFile image) throws BadRequestException {

        User user=authUtil.getLoggedInUser();
        if(user==null){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not logged in");
        }
        Donations donation = new Donations();

        donation.setDonor(user);
        donation.setItemName(request.getItemName());
        donation.setQuantity(request.getQuantity());
        donation.setBestBeforeDate(request.getBestBeforeDate());
        donation.setPickupLocation(request.getPickupLocation());
        donation.setAvailabilityStart(request.getAvailabilityStart());
        donation.setAvailabilityEnd(request.getAvailabilityEnd());
        donation.setLatitude(request.getLatitude());
        donation.setLongitude(request.getLongitude());
        try {
            QuantityUnit unit = QuantityUnit.valueOf(request.getQuantityUnit());
            donation.setQuantityUnit(unit);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid quantity unit: " + request.getQuantityUnit());
        }

        // Handle image upload separately
        if (image != null && !image.isEmpty()) {
            String fileName = fileStorageService.storeFile(image);
            donation.setPhotoUrl(fileName);
        }

        Donations savedDonation = donationRepository.save(donation);

        DonationEventDTO event = new DonationEventDTO();
        event.setDonationId(savedDonation.getDonationId());
        event.setDonorId(savedDonation.getDonor().getUserId());
        event.setLatitude(savedDonation.getLatitude());
        event.setLongitude(savedDonation.getLongitude());

        kafkaProducerService.sendDonationCreated(event);

        try {
            String emailSubject = "Your Food Donation is Live!";
            String emailBody = "Thank you for donating food! Your donation is now available for NGOs to claim.";
            emailService.sendEmail(user.getEmail(), emailSubject, emailBody);

//            if (user.getPhone() != null) {
//                String smsMessage = "Your food donation is live! NGOs can now claim it.";
//                smsService.sendSms(user.getPhone(), smsMessage);
//            }
        }
        catch (Exception e) {
            logger.error("Failed to send notification: Donation will not be committed", e);
            throw new RuntimeException("Donation failed due to notification error.");
        }

        redisService.delete("donations:alllist");
        redisService.delete("donations:status:AVAILABLE");

        String userCacheKey = "donations:user:" + user.getUserId() + ":status:AVAILABLE";
        redisService.delete(userCacheKey);


        return mapToDonationResponse(savedDonation);
    }


    private DonationResponse mapToDonationResponse(Donations donation) {

        Integer ngoId = (donation.getClaimedByNgo() != null) ? donation.getClaimedByNgo().getUserId() : null;
        Integer donorId = (donation.getDonor() != null) ? donation.getDonor().getUserId() : null;

        String donorName = (donation.getDonor() != null) ? donation.getDonor().getFullname() : null;
        String ngoName = (donation.getClaimedByNgo() != null) ? donation.getClaimedByNgo().getFullname() : null;




        DonationResponse response = new DonationResponse();
        response.setDonationId(donation.getDonationId());
        response.setDonorId(donorId);
        response.setDonorName(donorName);
        response.setItemName(donation.getItemName());
        response.setQuantity(donation.getQuantity());
        response.setBestBeforeDate(donation.getBestBeforeDate());
        response.setPickupLocation(donation.getPickupLocation());
        response.setAvailabilityStart(donation.getAvailabilityStart());
        response.setAvailabilityEnd(donation.getAvailabilityEnd());
        response.setStatus(donation.getStatus());
        response.setPhotoUrl("/donations/images/" + donation.getPhotoUrl()); // Provide URL for frontend
        response.setCreatedAt(donation.getCreatedAt());
        response.setUpdatedAt(donation.getUpdatedAt());
        response.setNgoId(ngoId);
        response.setNgoName(ngoName);
        response.setLatitude(donation.getLatitude());
        response.setLongitude(donation.getLongitude());

        QuantityUnit unit = donation.getQuantityUnit();
        response.setQuantityUnit(unit.name());               // e.g. "KILOGRAMS"
        response.setQuantityUnitLabel(unit.getAbbreviation());  // e.g. "kgs"

        return response;
    }


    public DonationResponse getDonation(int id) {
        Donations donation = donationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Donations not found"));
        return mapToDonationResponse(donation);
    }

  //  @Transactional(readOnly = true) // Ensure Hibernate session is active
    public List<DonationResponse> getAllDonations() {
        String cacheKey = "donations:alllist";
        Object cachedData = redisService.get(cacheKey);

        if (cachedData != null) {
            try {
                List<DonationResponse> cachedDonations = objectMapper.convertValue(
                        cachedData, new TypeReference<List<DonationResponse>>() {});
                return cachedDonations;
            } catch (Exception e) {
                System.err.println("Redis Data Conversion Error: " + e.getMessage());
            }
        }

        List<Donations> donations = donationRepository.findAll();


        donations.forEach(donation -> {
            if (donation.getDonor() != null) {
                donation.getDonor().getUserId();
            }
        });

        List<DonationResponse> donationResponses = donations.stream()
                .map(this::mapToDonationResponse)
                .collect(Collectors.toList());

        redisService.set(cacheKey, donationResponses, 120, TimeUnit.SECONDS);
        return donationResponses;
    }

    //@Transactional(readOnly = true)
    public List<DonationResponse> getDonationsByStatus(String stat) {

      Status status;
        try {
            status = Status.valueOf(stat.toUpperCase()); // Convert to uppercase to handle case-insensitive input
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status: " + stat + ". Allowed values: " + Arrays.toString(Status.values()));
        }

        String cacheKey = "donations:status:" + status;
        Object cachedData = redisService.get(cacheKey);

        if (cachedData != null) {
            try {
                List<DonationResponse> cachedDonations = objectMapper.convertValue(
                        cachedData, new TypeReference<List<DonationResponse>>() {});
                return cachedDonations;
            } catch (Exception e) {
                System.err.println("Redis Data Conversion Error: " + e.getMessage());
            }
        }

        List<Donations> donations = donationRepository.findByStatus(status);

        // ✅ Ensure donor is initialized to avoid LazyInitializationException
        donations.forEach(donation -> {
            if (donation.getDonor() != null) {
                donation.getDonor().getUserId(); // Forces Hibernate to load donor
            }
        });

        List<DonationResponse> donationResponses = donations.stream()
                .map(this::mapToDonationResponse)
                .collect(Collectors.toList());

        redisService.set(cacheKey, donationResponses, 120, TimeUnit.SECONDS);
        return donationResponses;
    }


    @Transactional
    public DonationResponse claimDonation(int id) {
        // Get the currently logged-in NGO
        User ngo = authUtil.getLoggedInUser();

        Donations donation = donationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Donation not found"));

        // Get the donor who created the donation
        User donor = donation.getDonor();

        donation.setClaimedByNgo(ngo);
        donation.setClaimedAt(LocalDateTime.now());

        // Update donation status to CLAIMED
        donation.setStatus(Status.CLAIMED);
        donationRepository.save(donation);


        DonationEventDTO event = new DonationEventDTO();
        event.setDonationId(donation.getDonationId());
        event.setDonorId(donation.getDonor().getUserId());
        event.setNgoId(donation.getClaimedByNgo().getUserId());
        event.setLatitude(donation.getLatitude());
        event.setLongitude(donation.getLongitude());

        kafkaProducerService.sendDonationRequested(event);



        try {

            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy");
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("hh:mm a");


            String startDate = donation.getAvailabilityStart().format(dateFormatter);
            String startTime = donation.getAvailabilityStart().format(timeFormatter);
            String endDate = donation.getAvailabilityEnd().format(dateFormatter);
            String endTime = donation.getAvailabilityEnd().format(timeFormatter);

            String emailSubject = "Your Donation Has Been Claimed!";
            String emailBody = String.format(
                    """
                    <html>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <p>Hello <b>%s</b>,</p>
            
                        <p>Great news! Your donation has been <b>claimed</b> by <b>%s</b>. Thank you for your generosity! 🎉</p>
            
                        <h3>📦 Donation Details:</h3>
                        <ul>
                            <li><b>Food Item:</b> %s</li>
                            <li><b>Quantity:</b> %s</li>
                            <li><b>Pickup Location:</b> %s</li>
                        </ul>
            
                        <h3>⏳ Availability Period:</h3>
                        <ul>
                            <li>📅 <b>Start Date:</b> %s</li>
                            <li>🕒 <b>Start Time:</b> %s</li>
                            <li>📅 <b>End Date:</b> %s</li>
                            <li>🕒 <b>End Time:</b> %s</li>
                        </ul>
           
            
                        <p>Your contribution makes a real difference. We appreciate your kindness! ❤️</p>
            
                        <p>Best Regards,</p>
                        <p><b>✨ Food Donation Platform Team</b></p>
                    </body>
                    </html>
                    """,
                    donor.getFullname(),
                    ngo.getFullname(),
                    donation.getItemName(),
                    donation.getQuantity(),
                    donation.getPickupLocation(),
                    startDate,
                    startTime,
                    endDate,
                    endTime
            );



            emailService.sendEmail(donor.getEmail(), emailSubject, emailBody);

            if (donor.getPhone() != null) {
                String smsMessage = "Your donation has been claimed by " + ngo.getFullname() + "! Thank you for your generosity.";
                smsService.sendSms(donor.getPhone(), smsMessage);
            }
        }
        catch (Exception e) {
            logger.error("Failed to send notification: Donation claim will not be committed", e);
            throw new RuntimeException("Donation claim failed due to notification error.");
        }

        redisService.delete("donations:status:CLAIMED");
        String userCacheKey = "donations:user:" + donation.getDonor()+ ":status:CLAIMED";
        redisService.delete(userCacheKey);
        String ngoCacheKey = "donations:ngo:" + donation.getClaimedByNgo() + ":status:CLAIMED";
        redisService.delete(ngoCacheKey);


        return mapToDonationResponse(donation);
    }


    public DonationResponse completeDonation(int id,String enteredOtp) {

        Otp otpEntity = otpRepository.findByDonation_DonationId(id)
                .orElseThrow(() -> new RuntimeException("OTP not found for this donation."));

        if (otpEntity.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP has expired.");
        }

        if (!otpEntity.getCode().equals(enteredOtp)) {
            throw new RuntimeException("Invalid OTP.");
        }
        Donations donation = donationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Donation not found"));

        // Update status to COLLECTED
        donation.setStatus(Status.COLLECTED);
        donationRepository.save(donation);
        otpRepository.delete(otpEntity); // Clean up OTP


        DonationEventDTO event = new DonationEventDTO();
        event.setDonationId(donation.getDonationId());
        event.setDonorId(donation.getDonor().getUserId());
        event.setNgoId(donation.getClaimedByNgo().getUserId());
        event.setLatitude(donation.getLatitude());
        event.setLongitude(donation.getLongitude());

        kafkaProducerService.sendDonationCompleted(event);



        // Get donor details
        User donor = donation.getDonor();

        // Prepare email content
        String emailSubject = "Donation Collected Successfully!";
        String emailBody = String.format(
                """
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <p>Hello <b>%s</b>,</p>
            
                    <p>Your donation has been successfully <b>collected</b>. Thank you for your generous contribution!</p>
            
                    <h3>Donation Details:</h3>
                    <ul>
                        <li><b>Food Item:</b> %s</li>
                        <li><b>Quantity:</b> %s</li>
                        <li><b>Pickup Location:</b> %s</li>
                    </ul>
            
                    <p>We truly appreciate your kindness and generosity in helping those in need. ❤️</p>
            
                    <p>Best Regards,</p>
                    <p><b>Food Donation Platform Team</b></p>
                </body>
                </html>
                """,
                donor.getFullname(),
                donation.getItemName(),
                donation.getQuantity(),
                donation.getPickupLocation()
        );


        try {
            emailService.sendEmail(donor.getEmail(), emailSubject, emailBody);

        } catch (Exception e) {
            logger.error("❌ Failed to send email to donor {}", donor.getEmail(), e);
            throw new RuntimeException("Email sending failed: " + e.getMessage());
        }

        // Prepare SMS content
        if (donor.getPhone() != null && !donor.getPhone().isEmpty()) {
            String smsMessage = "Dear " + donor.getFullname() + ", your donation has been successfully collected! Thank you for your generosity.";
            try {
                smsService.sendSms(donor.getPhone(), smsMessage);

            } catch (Exception e) {
                logger.error("❌ Failed to send SMS to donor {}", donor.getPhone(), e);
                throw new RuntimeException("SMS sending failed: " + e.getMessage());
            }
        }

        redisService.delete("donations:status:COLLECTED");
        String userCacheKey = "donations:user:" + donation.getDonor() + ":status:COLLECTED";
        redisService.delete(userCacheKey);
        String ngoCacheKey = "donations:ngo:" + donation.getClaimedByNgo() + ":status:COLLECTED";
        redisService.delete(ngoCacheKey);

        return mapToDonationResponse(donation);
    }


    public List<DonationResponse> getDonationByDonor(String stat) {
        User user = authUtil.getLoggedInUser();

        if (user == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not logged in");
        }

        Status status;
        try {
            status = Status.valueOf(stat.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status value");
        }

        // ✅ Generate unique cache key
        String cacheKey = "donations:user:" + user.getUserId() + ":status:" + status;

        // ✅ Check Redis cache
        Object cachedData = redisService.get(cacheKey);
        if (cachedData != null) {
            try {
                return objectMapper.convertValue(cachedData, new TypeReference<List<DonationResponse>>() {});
            } catch (Exception e) {
                System.err.println("Redis Data Conversion Error: " + e.getMessage());
            }
        }

        // ✅ Fetch from DB if not in cache
        List<Donations> donationList = donationRepository.findByDonorAndStatus(user, status);

        List<DonationResponse> donationResponses = donationList.stream()
                .map(this::mapToDonationResponse)
                .collect(Collectors.toList());

        // ✅ Store result in Redis for future use (cache for 2 minutes)
        redisService.set(cacheKey, donationResponses, 120, TimeUnit.SECONDS);

        return donationResponses;
    }


    public List<DonationResponse> getDonationByNGO(String stat) {
        User user = authUtil.getLoggedInUser();

        if (user == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not logged in");
        }

        Status status;
        try {
            status = Status.valueOf(stat.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status value");
        }

        // ✅ Generate unique cache key
        String cacheKey = "donations:ngo:" + user.getUserId() + ":status:" + status;

        // ✅ Check Redis cache
        Object cachedData = redisService.get(cacheKey);
        if (cachedData != null) {
            try {
                return objectMapper.convertValue(cachedData, new TypeReference<List<DonationResponse>>() {});
            } catch (Exception e) {
                System.err.println("Redis Data Conversion Error: " + e.getMessage());
            }
        }

        // ✅ Fetch from DB if not in cache
        List<Donations> donationList = donationRepository.findByClaimedByNgoAndStatus(user, status);

        List<DonationResponse> donationResponses = donationList.stream()
                .map(this::mapToDonationResponse)
                .collect(Collectors.toList());

        // ✅ Store result in Redis for future use (cache for 2 minutes)
        redisService.set(cacheKey, donationResponses, 120, TimeUnit.SECONDS);

        return donationResponses;
    }



    public DonationResponse updateDonation(DonationRequest request, MultipartFile image, int id) throws BadRequestException {
        Donations donation = donationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Donation not found"));

        donation.setQuantity(request.getQuantity());
        donation.setItemName(request.getItemName());
        donation.setBestBeforeDate(request.getBestBeforeDate());
        donation.setPickupLocation(request.getPickupLocation());
        donation.setAvailabilityStart(request.getAvailabilityStart());
        donation.setAvailabilityEnd(request.getAvailabilityEnd());
        donation.setLatitude(request.getLatitude());
        donation.setLongitude(request.getLongitude());
        try {
            QuantityUnit unit = QuantityUnit.valueOf(request.getQuantityUnit());
            donation.setQuantityUnit(unit);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid quantity unit: " + request.getQuantityUnit());
        }

        if (image != null && !image.isEmpty()) {
            if (donation.getPhotoUrl() != null) {
                fileStorageService.deleteFile(donation.getPhotoUrl()); // Implement deleteFile method
            }
            String fileName = fileStorageService.storeFile(image);
            donation.setPhotoUrl(fileName);
        }

        Donations savedDonation = donationRepository.save(donation);
        return mapToDonationResponse(savedDonation);

    }

    public void deleteDonation(int id) {
        Donations donation = donationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Donation not found"));
        if (donation.getStatus() == Status.CLAIMED||donation.getStatus() == Status.COLLECTED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete a claimed or collected donation");
        }

        if(donation.getPhotoUrl() != null) {
            fileStorageService.deleteFile(donation.getPhotoUrl());
        }

        redisService.delete("donations:alllist");
        redisService.delete("donations:status:"+donation.getStatus());

        String userCacheKey = "donations:user:" + donation.getDonationId() + ":status:"+donation.getStatus();
        redisService.delete(userCacheKey);

        donationRepository.delete(donation);
    }

    @Scheduled(cron = "0 0 0 * * ?") // Runs daily at midnight
    @Transactional
    public void cleanupOrphanedDonations() {
        int deletedCount = donationRepository.deleteOrphanedDonations();
        System.out.println("🗑 Cleanup: " + deletedCount + " orphaned donations removed.");
    }

    @Scheduled(fixedRate = 60 * 60 * 1000) // Every hour
    public void deleteExpiredDonations() {
        String cacheKey = "donations:status:" + Status.AVAILABLE;
        Object cachedData = redisService.get(cacheKey);
        List<Donations> donations;

        if (cachedData != null) {
            try {
                donations = objectMapper.convertValue(
                        cachedData, new TypeReference<List<Donations>>() {});
            } catch (Exception e) {
                System.err.println("Redis Data Conversion Error: " + e.getMessage());
                // Fallback to DB if Redis fails
                donations = donationRepository.findByStatus(Status.AVAILABLE);
            }
        } else {
            // No cache, get fresh data
            donations = donationRepository.findByStatus(Status.AVAILABLE);
        }

        LocalDateTime now = LocalDateTime.now();

        for (Donations donation : donations) {
            LocalDateTime expiryThreshold = donation.getAvailabilityEnd().plusHours(graceHours);
            if (now.isAfter(expiryThreshold)) {
                donationRepository.delete(donation);
                System.out.println("Deleted expired donation with ID: " + donation.getDonationId());
            }
        }
    }


    // Fetch available donations for NGOs with filtering & sorting
    public List<DonationResponse> getAvailableDonations(String foodCategory, LocalDate expirationDate, String sortBy, boolean desc) {
        Sort sort = desc ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        List<Donations> donationList = donationRepository.findAvailableDonations(foodCategory, expirationDate, sort);
        return donationList.stream()
                .map(this::mapToDonationResponse)
                .collect(Collectors.toList());
    }

    // Fetch claimed donations for NGOs with filtering & sorting
    public List<DonationResponse> getClaimedDonationsForNgo(String foodCategory, LocalDate expirationDate, String sortBy, boolean desc) {
        User ngo = authUtil.getLoggedInUser();
        Sort sort = desc ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        List<Donations> donationList = donationRepository.findClaimedDonationsByNgo(ngo, foodCategory, expirationDate, sort);
        return donationList.stream()
                .map(this::mapToDonationResponse)
                .collect(Collectors.toList());
    }

    // Fetch past donations for donors with filtering & sorting
    public List<DonationResponse> getPastDonationsForDonor(String foodCategory, LocalDate expirationDate, String sortBy, boolean desc) {
        User donor = authUtil.getLoggedInUser();
        Sort sort = desc ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(0, 100, sort); // Change 100 to the desired max results

        Page<Donations> donationPage = donationRepository.findPastDonationsByDonor(donor, foodCategory, expirationDate, pageable);
        return donationPage.getContent().stream()
                .map(this::mapToDonationResponse)
                .collect(Collectors.toList());
    }


}
