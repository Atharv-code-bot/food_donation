package com.donation.Donation.config;
import com.donation.Donation.config.OAuth2AuthenticationFailureHandler;
import com.donation.Donation.service.CustomOAuth2UserService;
import com.donation.Donation.service.UserDetailsServiceImpl;
import com.donation.Donation.config.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

@Configuration
public class SecurityConfig {

    private final UserDetailsServiceImpl userDetailsService;
    private final JwtFilter jwtFilter;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
    private final OAuth2AuthenticationFailureHandler oAuth2AuthenticationFailureHandler;


    public SecurityConfig(UserDetailsServiceImpl userDetailsService, JwtFilter jwtFilter,
                          CustomOAuth2UserService customOAuth2UserService,
                          OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler,
                          OAuth2AuthenticationFailureHandler oAuth2AuthenticationFailureHandler) {
        this.userDetailsService = userDetailsService;
        this.jwtFilter = jwtFilter;
        this.customOAuth2UserService = customOAuth2UserService;
        this.oAuth2AuthenticationSuccessHandler = oAuth2AuthenticationSuccessHandler;
        this.oAuth2AuthenticationFailureHandler = oAuth2AuthenticationFailureHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(request -> new CorsConfiguration().applyPermitDefaultValues())) // ✅ Enable CORS
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // Stateless session
                .authorizeHttpRequests(auth -> auth
                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // ✅ Preflight

                                .requestMatchers("/auth/register", "/auth/login", "/auth/logout", "/oauth2/**").permitAll()

// 🔹 1️⃣ OAuth2-Specific Endpoints (Keep these first)
                                .requestMatchers("/users/set-password").hasAnyAuthority("ROLE_OAUTH2_USER", "ROLE_ADMIN")  // ✅ Only OAuth2 users & Admin
                                .requestMatchers("/users/update-oauth2-user").hasAnyAuthority("ROLE_OAUTH2_USER", "ROLE_ADMIN")  // ✅ OAuth2 users & Admin

// 🔹 2️⃣ Admin Access (Keep this next)
                                .requestMatchers("/admin/**", "/users/admin").hasAuthority("ROLE_ADMIN")  // ✅ Only Admin

// 🔹 3️⃣ General User API Permissions
                                .requestMatchers("/users/{id}").hasAnyAuthority("ROLE_NGO", "ROLE_DONOR", "ROLE_ADMIN")  // ✅ Get user by ID
                                .requestMatchers("/users/update").hasAnyAuthority("ROLE_NGO", "ROLE_DONOR", "ROLE_ADMIN")  // ✅ Update user
                                .requestMatchers(HttpMethod.DELETE, "/users").hasAnyAuthority("ROLE_NGO", "ROLE_DONOR", "ROLE_ADMIN")  // ✅ Delete user
                                .requestMatchers("/users/password-change").hasAnyAuthority("ROLE_NGO", "ROLE_DONOR", "ROLE_ADMIN")  // ✅ Change password

// 🔹 4️⃣ Donation API Permissions
                                .requestMatchers(HttpMethod.POST, "/donations").hasAnyAuthority("ROLE_DONOR", "ROLE_ADMIN")  // ✅ Create donation

                                .requestMatchers(HttpMethod.PUT, "/donations/{id}").hasAnyAuthority("ROLE_DONOR", "ROLE_ADMIN")  // ✅ Update donation (Ensure this is before NGO rules)
                                .requestMatchers(HttpMethod.DELETE, "/donations/{id}").hasAnyAuthority("ROLE_DONOR", "ROLE_ADMIN")  // ✅ Delete donation (Ensure this is before NGO rules)

                                .requestMatchers("/donations/{id}").hasAnyAuthority("ROLE_NGO","ROLE_DONOR","ROLE_ADMIN")  // ✅ Get donation by ID
                                .requestMatchers("/donations/{id}/claim").hasAnyAuthority("ROLE_NGO")  // ✅ Claim donation
                                .requestMatchers("/donations/{id}/complete").hasAnyAuthority("ROLE_NGO", "ROLE_ADMIN")  // ✅ Complete donation
                                .requestMatchers("/donations/status/{stat}").hasAnyAuthority("ROLE_NGO", "ROLE_ADMIN")  // ✅ Get pending donations
                                .requestMatchers("/donations/images/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_DONOR", "ROLE_NGO")  // ✅ Get donation images
                                .requestMatchers("/donations/user/{stat}").hasAnyAuthority("ROLE_DONOR", "ROLE_ADMIN")  // ✅ Get claimed donations for donor
                                .requestMatchers("/donations/ngo/{stat}").hasAnyAuthority("ROLE_NGO", "ROLE_ADMIN")  // ✅ Get claimed donations for NGO

// 🔹 5️⃣ General rule at the END
                                .anyRequest().authenticated()


                )
                .oauth2Login(oauth2 -> oauth2
                        .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService)) // Fetch and store OAuth2 users
                        .successHandler(oAuth2AuthenticationSuccessHandler) // Generate JWT for OAuth2 users
                        .failureHandler(oAuth2AuthenticationFailureHandler) // Ensure JSON response on failure
                )
                .logout(logout -> logout
                        .logoutUrl("/auth/logout")
                        .clearAuthentication(true)
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID")
                )
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setContentType("application/json");
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.getWriter().write("{\"error\": \"Unauthorized\", \"message\": \"" + authException.getMessage() + "\"}");
                        })
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }


    @Bean
    public AuthenticationManager authenticationManager() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return new ProviderManager(authProvider);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        return objectMapper;
    }
}
