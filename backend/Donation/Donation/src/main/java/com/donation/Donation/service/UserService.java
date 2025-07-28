package com.donation.Donation.service;

import com.donation.Donation.config.AuthUtil;
import com.donation.Donation.dto.*;
import com.donation.Donation.model.AuthProvider;
import com.donation.Donation.model.Role;
import com.donation.Donation.model.Status;
import com.donation.Donation.model.User;
import com.donation.Donation.repository.DonationRepository;
import com.donation.Donation.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    UserRepository userRepository;

    @Autowired
    DonationRepository donationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthUtil authUtil;

    @Autowired
    private EmailNotificationService emailService;

    @Autowired
    private SmsNotificationService smsService;

    @Autowired
    private ImageStorageService imageStorageService;

    private final String PLACEHOLDER_IMAGE_URL = "/profile_images/placeholder.png"; // Path to Placeholder

    @Transactional
    public UserResponse createUser(UserRequest request) {
        Optional<User> existingUser = userRepository.findByUsername(request.getUsername());
        if (existingUser.isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        existingUser = userRepository.findByEmail(request.getEmail());
        if (existingUser.isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setFullname(request.getFullname());
        user.setPhone(request.getPhone());
        user.setProvider(AuthProvider.LOCAL);
        user.setAddress(request.getAddress());
        user.setProfileImageUrl(PLACEHOLDER_IMAGE_URL);
        user.setDefaultLatitude(request.getLatitude());
        user.setDefaultLongitude(request.getLongitude());

        User savedUser = userRepository.save(user);

        try {

            String emailSubject = "Welcome to Food Donation Platform";
            String emailBody = "Hello " + user.getFullname()
                    + ",\n\nThank you for registering! Start donating and claiming food now.";
            emailService.sendEmail(user.getEmail(), emailSubject, emailBody);

            // if (user.getPhone() != null) {
            //     String smsMessage = "Welcome, " + user.getFullname() + "! Your account has been successfully created.";
            //     smsService.sendSms(user.getPhone(), smsMessage);
            // }

        } catch (Exception e) {
            logger.error("Failed to send notification: Rolling back user registration", e);
            throw new RuntimeException("User registration failed due to notification error.");
        }

        return mapToUserResponse(savedUser);
    }

    private UserResponse mapToUserResponse(User user) {
        UserResponse response = new UserResponse();
        response.setUserId(user.getUserId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setRole(user.getRole());
        response.setFullname(user.getFullname());
        response.setPhone(user.getPhone());
        response.setAddress(user.getAddress());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());
        response.setPhotoUrl("/users/images"+user.getProfileImageUrl());
        response.setLatitude(user.getDefaultLatitude());
        response.setLongitude(user.getDefaultLongitude());


        return response;
    }

    public List<UserResponse> getAllUser() {
        List<User> users = userRepository.findAll();

        List<UserResponse> userResponses = users
                .stream()
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());

        return userResponses;
    }

    public UserResponse getUserById(int id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        return mapToUserResponse(user);
    }

    @Transactional
    public UserResponse updateUser(UserRequest request, MultipartFile imageFile) {
        User user = authUtil.getLoggedInUser();

        if (user == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not logged in");
        }



        // Update user fields
        user.setFullname(request.getFullname());
        user.setPhone(request.getPhone());
        user.setAddress(request.getAddress());
        user.setDefaultLatitude(request.getLatitude());
        user.setDefaultLongitude(request.getLongitude());

        if (imageFile != null && !imageFile.isEmpty()) {
            String oldImageUrl = user.getProfileImageUrl();
            String newImageUrl = imageStorageService.saveImageFromMultipartFile(imageFile);

            if (newImageUrl != null) {
                if (oldImageUrl != null && !oldImageUrl.equals(PLACEHOLDER_IMAGE_URL)) {
                    imageStorageService.deleteImage(oldImageUrl);
                }
                user.setProfileImageUrl(newImageUrl);
            }
        }

        userRepository.save(user); // Ensure user is saved

        return mapToUserResponse(user);
    }

    @Transactional
    public void deleteUser() {
        User user = authUtil.getLoggedInUser();
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not logged in");
        }

        // 🚨 Prevent deletion if the user has any claimed but not collected donations
        if (user.getRole() == Role.ROLE_DONOR) {
            if (donationRepository.existsByDonorAndStatus(user, Status.CLAIMED)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete donor with claimed donations");
            }
        } else if (user.getRole() == Role.ROLE_NGO) {
            if (donationRepository.existsByClaimedByNgoAndStatus(user, Status.CLAIMED)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Cannot delete NGO with uncollected donations");
            }
        }

        // ✅ Handle donor deletion
        if (user.getRole() == Role.ROLE_DONOR) {
            donationRepository.deleteByDonorAndStatus(user, Status.AVAILABLE); // Delete available donations
            donationRepository.updateDonorToNull(user); // Nullify donor for collected donations
        }
        // ✅ Handle NGO deletion
        else if (user.getRole() == Role.ROLE_NGO) {
            donationRepository.updateNgoToNull(user);
        }

        // ✅ Delete user's profile image if it's not the placeholder
        if (user.getProfileImageUrl() != null && !user.getProfileImageUrl().equals(PLACEHOLDER_IMAGE_URL)) {
            imageStorageService.deleteImage(user.getProfileImageUrl());
        }

        // ✅ Delete user from the database
        userRepository.deleteById(user.getUserId());
    }

    public UserResponse getCurrentUser() {
        User currentUser = authUtil.getLoggedInUser();
        if (currentUser != null) {
            return mapToUserResponse(currentUser);
        } else {
            return null;
        }
    }

    @Transactional
    public ResponseEntity changePassword(PasswordChangeRequest request) {
        User user = authUtil.getLoggedInUser();
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not logged in");
        }

        String oldPassword = user.getPassword();
        String currentPassword = request.getCurrentPassword();

        if (!passwordEncoder.matches(currentPassword, oldPassword)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        try {

            String emailSubject = "Password Changed Successfully";
            String emailBody = "Hello " + user.getFullname()
                    + ",\n\nYour password has been changed successfully. If you did not make this change, please contact support immediately.";
            emailService.sendEmail(user.getEmail(), emailSubject, emailBody);

            // if (user.getPhone() != null) {
            //     String smsMessage = "Your password has been changed successfully. If this wasn't you, contact support immediately.";
            //     smsService.sendSms(user.getPhone(), smsMessage);
            // }

        } catch (Exception e) {
            logger.error("Failed to send notification: Password change will not be committed", e);
            throw new RuntimeException("Password change failed due to notification error.");
        }

        return ResponseEntity.ok("Password changed successfully!");
    }

    @Transactional
    public UserResponse updateOAuth2User(Auth2UpdateRequest request) {
        User user = authUtil.getLoggedInUser();

        if (user == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not logged in");
        }

        // Ensure the user is an OAuth2 user
        if (user.getProvider() == null || user.getProvider() == AuthProvider.LOCAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This update is only allowed for OAuth2 users");
        }

        // Validate phone number (example)
        if (request.getPhone() != null && !request.getPhone().matches("\\d{10}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid phone number");
        }

        // Update details only for OAuth2 users
        user.setPhone(request.getPhone());
        user.setAddress(request.getAddress());
        user.setDefaultLatitude(request.getLatitude());
        user.setDefaultLongitude(request.getLongitude());

        // Role update (optional, ensure security rules before allowing this)
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }

        User updatedUser = userRepository.save(user);

        try {

            String emailSubject = "Welcome to Food Donation Platform";
            String emailBody = "Hello " + user.getFullname()
                    + ",\n\nThank you for registering! Start donating and claiming food now.";
            emailService.sendEmail(user.getEmail(), emailSubject, emailBody);

            // if (user.getPhone() != null) {
            //     String smsMessage = "Welcome, " + user.getFullname() + "! Your account has been successfully created.";
            //     smsService.sendSms(user.getPhone(), smsMessage);
            // }

        } catch (Exception e) {
            logger.error("Failed to send notification: Rolling back user registration", e);
            throw new RuntimeException("User registration failed due to notification error.");
        }

        return mapToUserResponse(updatedUser);
    }

    public ResponseEntity<?> setPassword(SetPasswordRequest request) {
        User user = authUtil.getLoggedInUser(); // Get logged-in user directly

        if (user == null) {
            return ResponseEntity.badRequest().body("User is not authenticated.");
        }

        // Ensure the user signed up using OAuth2 (Google)
        if (user.getProvider() != AuthProvider.GOOGLE) {
            return ResponseEntity.badRequest().body("You are not an OAuth2 user.");
        }

        // Set the new password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return ResponseEntity.ok("Password set successfully. You can now log in with your email and password.");
    }

}
