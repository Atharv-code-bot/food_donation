package com.donation.Donation.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;



@Service
public class ImageStorageService {

    private final AwsS3Service awsS3Service;

    public ImageStorageService(AwsS3Service awsS3Service) {
        this.awsS3Service = awsS3Service;
    }

    public String saveImageFromUrl(String imageUrl) {
        try {
            if (!isValidImageUrl(imageUrl)) {
                throw new IllegalArgumentException("Invalid image URL: " + imageUrl);
            }

            // Ensure high-quality Google images (if applicable)
            if (imageUrl.contains("=s96-c")) {
                imageUrl = imageUrl.replace("=s96-c", "=s400-c");
            }

            // Download the image from URL
            try (InputStream inputStream = new URL(imageUrl).openStream()) {
                // Convert InputStream to MultipartFile-like object for S3 upload
                byte[] bytes = inputStream.readAllBytes();
                String originalFileName = "google_profile.jpg"; // default name
                // Wrap bytes into MultipartFile using Spring's MockMultipartFile
                org.springframework.mock.web.MockMultipartFile file =
                        new org.springframework.mock.web.MockMultipartFile(
                                "file",
                                originalFileName,
                                "image/jpeg",
                                bytes
                        );

                // Upload to S3 using the existing uploadFile method
                return awsS3Service.uploadFile(file, "profiles");
            }

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }


    private boolean isValidImageUrl(String imageUrl) {
        return imageUrl != null && (imageUrl.startsWith("https://") || imageUrl.startsWith("http://"));
    }

    public String saveImageFromMultipartFile(MultipartFile file) {
        return awsS3Service.uploadFile(file, "profiles");
    }



    public String getFile(String imageUrl) {
        return imageUrl;
    }


    public boolean deleteImage(String imageUrl) {
        try {
            awsS3Service.deleteFile(imageUrl);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }


}
