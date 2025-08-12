package com.donation.Donation.controller;

import com.donation.Donation.config.AuthUtil;
import com.donation.Donation.config.JwtUtil;
import com.donation.Donation.dto.*;
import com.donation.Donation.model.User;
import com.donation.Donation.service.ImageStorageService;
import com.donation.Donation.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/users")
public class UserController {

    @Autowired
    UserService userService;

    @Autowired
    private AuthUtil authUtil;

    @Autowired
    private ImageStorageService imageStorageService;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping("/admin")
    public ResponseEntity<?> getAllUsers() {
        try {
            List<UserResponse> response = userService.getAllUser();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable int id) {
        try {
            UserResponse response = userService.getUserById(id);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/current")
    public ResponseEntity<?> getCurrentUser() {
        try {
            UserResponse response = userService.getCurrentUser();
            if (response != null) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body("User Not Found");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // UserController.java (or similar)

    @PutMapping("/update")
    public ResponseEntity<?> updateUser(
            @RequestParam(value = "UserRequest", required = false) String userRequestJson,
            @RequestPart(value = "image", required = false) MultipartFile imageFile) {
        try {
            UserUpdaterRequest request = null;
            if (userRequestJson != null && !userRequestJson.isBlank()) {
                ObjectMapper objectMapper = new ObjectMapper();
                // This is where the JSON string is parsed into your UserRequest DTO
                request = objectMapper.readValue(userRequestJson, UserUpdaterRequest.class);
            }

            // Call your userService method, passing the potentially null request object.
            // The service layer should handle null checks for individual fields.
            UserResponse response = userService.updateUser(request, imageFile); // Pass 'request' as is
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Log the exception for debugging on the server side
            e.printStackTrace();
            // Return a more descriptive error message to the frontend if possible
            return ResponseEntity.badRequest().body("Error updating user: " + e.getMessage());
        }
    }

    @DeleteMapping
    public ResponseEntity<?> deleteUser() {
        try {
            User user = authUtil.getLoggedInUser();
            if (user == null) {
                return ResponseEntity.badRequest().body("You are not logged in");
            }
            userService.deleteUser();
            return ResponseEntity.ok().body("User deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/password-change")
    public ResponseEntity<?> changePassword(@RequestBody PasswordChangeRequest request) {
        try {
            ResponseEntity response = userService.changePassword(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }

    }

    @GetMapping("/images/profile_images/{fileName}")
    public ResponseEntity<byte[]> getUserProfileImage(@PathVariable String fileName) {
        try {
            byte[] image = imageStorageService.getFile(fileName);
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_JPEG) // Adjust content type dynamically if needed
                    .body(image);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }
    }

    @PutMapping("/update-oauth2-user")
    public ResponseEntity<?> updateOAuth2User(@RequestBody Auth2UpdateRequest request) {
        UserResponse updatedUser = userService.updateOAuth2User(request);
        String token = jwtUtil.generateToken(updatedUser.getUsername(), updatedUser.getRole(), updatedUser.getUserId());
        return ResponseEntity.ok(new AuthResponse(token, updatedUser.getRole().name(), updatedUser.getUserId()));
    }

    @PutMapping("/set-password")
    public ResponseEntity<?> setPassword(@RequestBody SetPasswordRequest request) {
        return userService.setPassword(request);
    }

}
