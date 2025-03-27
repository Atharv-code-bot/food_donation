package com.donation.Donation.controller;

import com.donation.Donation.config.AuthUtil;
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


    @GetMapping("/admin")
    public ResponseEntity<?>getAllUsers(){
        try {
            List<UserResponse> response=userService.getAllUser();
            return ResponseEntity.ok(response);
        }
        catch (Exception e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?>getUserById(@PathVariable int id){
        try{
            UserResponse response=userService.getUserById(id);
            return ResponseEntity.ok(response);
        }
        catch (Exception e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/current")
    public ResponseEntity<?>getCurrentUser(){
        try{
            UserResponse response=userService.getCurrentUser();
            if(response!=null) {
                return ResponseEntity.ok(response);
            }
            else {
                return ResponseEntity.badRequest().body("User Not Found");
            }
        }
        catch (Exception e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/update")
    public ResponseEntity<?> updateUser(
            @RequestParam("userRequest") String userRequestJson,
            @RequestPart(value = "image", required = false) MultipartFile imageFile) {
        try {
            // Convert JSON request body to UserRequest object
            ObjectMapper objectMapper = new ObjectMapper();
            UserRequest request = objectMapper.readValue(userRequestJson, UserRequest.class);

            UserResponse response = userService.updateUser(request, imageFile);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }



    @DeleteMapping
    public ResponseEntity<?> deleteUser() {
        try {
            User user=authUtil.getLoggedInUser();
            if (user==null){
                return ResponseEntity.badRequest().body("You are not logged in");
            }
            userService.deleteUser();
            return ResponseEntity.ok().body("User deleted successfully");
        }
        catch (Exception e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/password-change")
    public ResponseEntity<?> changePassword(@RequestBody PasswordChangeRequest request) {
        try {
            ResponseEntity response=userService.changePassword(request);
            return ResponseEntity.ok(response);
        }
        catch (Exception e){
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
    public ResponseEntity<UserResponse> updateOAuth2User(@RequestBody Auth2UpdateRequest request) {
        UserResponse updatedUser = userService.updateOAuth2User(request);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/set-password")
    public ResponseEntity<?> setPassword(@RequestBody SetPasswordRequest request) {
        return userService.setPassword(request);
    }

}

