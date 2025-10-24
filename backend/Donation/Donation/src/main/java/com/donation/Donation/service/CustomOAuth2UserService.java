package com.donation.Donation.service;

import com.donation.Donation.model.Role;
import com.donation.Donation.model.User;
import com.donation.Donation.model.AuthProvider;
import com.donation.Donation.repository.UserRepository;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final ImageStorageService imageStorageService;

    private final String PLACEHOLDER_IMAGE_URL = "/profile_images/placeholder.png"; // Path to Placeholder

    public CustomOAuth2UserService(UserRepository userRepository, ImageStorageService imageStorageService) {
        this.userRepository = userRepository;
        this.imageStorageService = imageStorageService;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String googleId = oAuth2User.getAttribute("sub");
        String profileImageUrl = oAuth2User.getAttribute("picture");

        Optional<User> existingUser = userRepository.findByEmail(email);
        User user;

        if (existingUser.isPresent()) {
            user = existingUser.get();
        } else {
            user = new User();
            user.setEmail(email);
            user.setFullname(name);
            user.setProvider(AuthProvider.GOOGLE);
            user.setProviderId(googleId);

            String baseUsername = name.toLowerCase().replaceAll("\\s+", "_");
            String uniqueId = UUID.randomUUID().toString().substring(0, 4);
            user.setUsername(baseUsername + "_" + uniqueId);

            if (profileImageUrl != null && !profileImageUrl.isEmpty()) {
                String storedImagePath = imageStorageService.saveImageFromUrl(profileImageUrl);
                user.setProfileImageUrl(storedImagePath != null ? storedImagePath : PLACEHOLDER_IMAGE_URL);
            } else {
                user.setProfileImageUrl(PLACEHOLDER_IMAGE_URL);
            }

            user.setAddress("Not Provided");
            user.setPhone("Not Provided");

            // ✅ Ensure role is set if not already assigned
            user.setRole(Role.ROLE_OAUTH2_USER);

            userRepository.save(user);
        }

        // ✅ Convert Role Enum to Spring Security Authorities
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(user.getRole().name()));

// ✅ Return OAuth2User with correct authorities
        return new DefaultOAuth2User(authorities, oAuth2User.getAttributes(), "email");

    }
}
