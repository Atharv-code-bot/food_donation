package com.donation.Donation.controller;

import java.util.Optional;

import com.donation.Donation.dto.AuthResponse;
import com.donation.Donation.dto.LoginRequest;
import com.donation.Donation.dto.UserRequest;
import com.donation.Donation.dto.UserResponse;
import com.donation.Donation.model.AuthProvider;
import com.donation.Donation.model.User;
import com.donation.Donation.repository.UserRepository;
import com.donation.Donation.service.UserService;
import com.donation.Donation.config.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    // Register new user
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody UserRequest userRequest,
                                          @RequestHeader(value = "X-Firebase-Token", required = false) String firebaseToken) {
        try {
            UserResponse response = userService.createUser(userRequest);
            // Fetch newly created user
            Optional<User> newUser = userRepository.findByEmail(userRequest.getEmail());

            if (newUser.isPresent()) {
                User user = newUser.get();
                // 🔥 Save Firebase token if present
                if (firebaseToken != null && !firebaseToken.isBlank()) {
                    user.getFirebaseTokens().add(firebaseToken);
                    userRepository.save(user);
                }
                String token = jwtUtil.generateToken(user.getUsername());
                return ResponseEntity.ok(new AuthResponse(token, user.getRole().name(),user.getUserId()));
            }

            return ResponseEntity.badRequest().body("Error in user creation.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Login user
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody LoginRequest loginRequest,
                                       @RequestHeader(value = "X-Firebase-Token", required = false) String firebaseToken) {
        try {
            Optional<User> userOptional = userRepository.findByEmailOrUsername(loginRequest.getUsername(), loginRequest.getUsername());

            if (userOptional.isEmpty()) {
                return ResponseEntity.badRequest().body("User not found.");
            }

            User user = userOptional.get();

            if (user.getProvider() == AuthProvider.GOOGLE && (user.getPassword() == null || user.getPassword().isEmpty())) {
                return ResponseEntity.badRequest().body("You signed up with Google. Please set a password first.");
            }

            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getUsername(), loginRequest.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String token = jwtUtil.generateToken(userDetails.getUsername());

            // 🔥 Save Firebase token if present
            if (firebaseToken != null && !firebaseToken.isBlank()) {
                user.getFirebaseTokens().add(firebaseToken);
                userRepository.save(user);
            }

            return ResponseEntity.ok(new AuthResponse(token, user.getRole().name(), user.getUserId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Invalid credentials.");
        }
    }

}
