package com.donation.Donation.service;

import com.donation.Donation.config.UserDetailsImpl;
import com.donation.Donation.model.User;
import com.donation.Donation.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;

import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(identifier)
                .orElseGet(() -> userRepository.findByEmail(identifier) // Check email if username is not found
                        .orElseThrow(() -> new UsernameNotFoundException("User Not Found with identifier: " + identifier)));

        return new UserDetailsImpl(user);
    }

}

