package com.donation.Donation.service;

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

    private static final String IMAGE_UPLOAD_DIR = "D:\\food_donation\\backend\\Donation\\Donation\\uploads\\profile_images\\";

    public String saveImageFromUrl(String imageUrl) {
        try {
            if (!isValidImageUrl(imageUrl)) {
                throw new IllegalArgumentException("Invalid image URL: " + imageUrl);
            }

            // Ensure high-quality Google images (if applicable)
            if (imageUrl.contains("=s96-c")) {
                imageUrl = imageUrl.replace("=s96-c", "=s400-c");
            }

            try (InputStream inputStream = new URL(imageUrl).openStream()) {
                return saveImage(inputStream, "jpg");
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
        try (InputStream inputStream = file.getInputStream()) {
            String extension = getFileExtension(file.getOriginalFilename());
            return saveImage(inputStream, extension);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    private String saveImage(InputStream inputStream, String extension) {
        try {
            // Ensure the directory exists
            Files.createDirectories(Paths.get(IMAGE_UPLOAD_DIR));

            // Generate a unique filename
            String imageName = UUID.randomUUID().toString() + "." + extension;
            File outputFile = new File(IMAGE_UPLOAD_DIR + imageName);

            // Save image
            try (FileOutputStream outputStream = new FileOutputStream(outputFile)) {
                byte[] buffer = new byte[4096];
                int bytesRead;
                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, bytesRead);
                }
            }

            return "/profile_images/" + imageName; // Relative path for database storage
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    private String getFileExtension(String filename) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf(".") + 1);
        }
        return "jpg"; // Default extension if missing
    }

    public byte[] getFile(String fileName) throws IOException {
        Path filePath = Paths.get(IMAGE_UPLOAD_DIR).resolve(fileName);
        return Files.readAllBytes(filePath);
    }

    public boolean deleteImage(String imageUrl) {
        try {
            String fileName = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);  // Extract file name
            Path filePath = Paths.get(IMAGE_UPLOAD_DIR, fileName);

            System.out.println("Deleting image: " + filePath.toString());  // Debugging log

            return Files.deleteIfExists(filePath);
        } catch (IOException e) {
            e.printStackTrace();
            return false;
        }
    }


}
