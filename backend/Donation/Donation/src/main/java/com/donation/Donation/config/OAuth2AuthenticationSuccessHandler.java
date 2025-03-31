package com.donation.Donation.config;

import com.donation.Donation.config.JwtUtil;
import com.donation.Donation.model.User;
import com.donation.Donation.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public OAuth2AuthenticationSuccessHandler(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");

        Optional<User> userOptional = userRepository.findByEmail(email);
        if (userOptional.isEmpty()) {
            response.sendRedirect("/login?error");
            return;
        }

        User user = userOptional.get();
        String token = jwtUtil.generateToken(user.getEmail()); // Generate JWT using email

        // ✅ Explicitly set authentication in SecurityContextHolder
        SecurityContextHolder.getContext().setAuthentication(authentication);

        Authentication authentication2 = SecurityContextHolder.getContext().getAuthentication();
        System.out.println("Authenticated User: " + authentication2.getName());
        System.out.println("Granted Authorities: " + authentication2.getAuthorities());

        // Redirect with token & role
        String redirectUrl = UriComponentsBuilder.fromUriString("http://localhost:5500s/oauth2/redirect")
                .queryParam("token", token)
                .queryParam("role", user.getRole().name())
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }

}
