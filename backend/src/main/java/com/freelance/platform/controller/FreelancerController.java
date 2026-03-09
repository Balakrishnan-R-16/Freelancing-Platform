package com.freelance.platform.controller;

import com.freelance.platform.entity.FreelancerProfile;
import com.freelance.platform.repository.FreelancerProfileRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/freelancers")
@Tag(name = "Freelancers", description = "Endpoints for dealing with freelancers")
public class FreelancerController {

    private final FreelancerProfileRepository freelancerProfileRepository;

    public FreelancerController(FreelancerProfileRepository freelancerProfileRepository) {
        this.freelancerProfileRepository = freelancerProfileRepository;
    }

    @GetMapping
    @Operation(summary = "Get all freelancer profiles")
    public ResponseEntity<List<FreelancerProfile>> getAllFreelancers() {
        return ResponseEntity.ok(freelancerProfileRepository.findAll());
    }
}
