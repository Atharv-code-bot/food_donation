package com.donation.Donation.config;


import com.donation.Donation.model.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
@Component
public class JwtUtil {

    private final String SECRET_KEY = "TaK+HaV^uvCHEFsEVfypW#7g9^k*Z8$V";

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET_KEY.getBytes());
    }

    public String extractUsername(String token) {
        try {
            return extractAllClaims(token).getSubject();
        } catch (Exception e) {
            return null; // Return null if the token is invalid
        }
    }

    public Date extractExpiration(String token) {
        try {
            return extractAllClaims(token).getExpiration();
        } catch (Exception e) {
            return null;
        }
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean isTokenExpired(String token) {
        Date expiration = extractExpiration(token);
        return expiration == null || expiration.before(new Date());
    }

    public String generateToken(String username, Role role, int userId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("id", userId);
        return createToken(claims, username);
    }
    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + 1000 * 60 * 50)) // 50 min validity
                .signWith(getSigningKey())
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            return !isTokenExpired(token); // Only check if token is expired
        } catch (Exception e) {
            return false;
        }
    }
}