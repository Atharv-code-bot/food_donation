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

    private final AwsS3Service awsS3Service;

    public FileStorageService(AwsS3Service awsS3Service) {
        this.awsS3Service = awsS3Service;
    }

    public String storeFile(MultipartFile file) {
        // Upload to S3 under "donations/" folder
        return awsS3Service.uploadFile(file, "donations");
    }

    public void deleteFile(String fileUrl) {
        awsS3Service.deleteFile(fileUrl);
    }

//    public String getFile(String fileUrl) {
//        // Simply return the public S3 URL (path)
//        return fileUrl;
//    }

}
