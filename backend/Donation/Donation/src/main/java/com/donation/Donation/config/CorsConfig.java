package com.donation.Donation.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();

        // ✅ Allow credentials
        config.setAllowCredentials(true);

        // ✅ Allow frontend URLs
        config.setAllowedOrigins(List.of("http://localhost:4200", "http://localhost:5500", "http://127.0.0.1:5500", "https://food-donation-blue.vercel.app"));

        // ✅ Allow all HTTP methods
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // ✅ Allow all headers including Authorization
        config.setAllowedHeaders(List.of("*"));

        // ✅ Apply CORS config to all endpoints
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
