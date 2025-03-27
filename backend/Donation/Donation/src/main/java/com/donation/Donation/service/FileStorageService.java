package com.donation.Donation.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileStorageService {

    private final String uploadDir;

    public FileStorageService() {
        // Store files inside the project's root directory under "uploads" folder
        this.uploadDir = System.getProperty("user.dir") + File.separator + "uploads";

        // Create the directory if it does not exist
        File directory = new File(uploadDir);
        if (!directory.exists()) {
            directory.mkdirs();
        }
    }

    public String storeFile(MultipartFile file) {
        try {
            // Generate a unique filename
            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path filePath = Paths.get(uploadDir, fileName);

            // Save the file
            Files.write(filePath, file.getBytes());

            return fileName; // Return the file name for storing in DB
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    public byte[] getFile(String fileName) {
        try {
            Path filePath = Paths.get(uploadDir, fileName);
            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            throw new RuntimeException("File not found", e);
        }
    }

    public void deleteFile(String fileName) {
        Path filePath = Paths.get(uploadDir).resolve(fileName).normalize();
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file: " + fileName, e);
        }
    }

}
