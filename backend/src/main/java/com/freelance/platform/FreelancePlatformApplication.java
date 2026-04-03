package com.freelance.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FreelancePlatformApplication {
    public static void main(String[] args) {
        SpringApplication.run(FreelancePlatformApplication.class, args);
    }
}
