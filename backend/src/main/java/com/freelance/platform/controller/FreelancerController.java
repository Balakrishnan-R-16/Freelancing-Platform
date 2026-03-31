package com.freelance.platform.controller;

import com.freelance.platform.entity.FreelancerProfile;
import com.freelance.platform.entity.User;
import com.freelance.platform.repository.FreelancerProfileRepository;
import com.freelance.platform.service.SseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/freelancers")
@Tag(name = "Freelancers", description = "Endpoints for dealing with freelancers")
public class FreelancerController {

    private final FreelancerProfileRepository freelancerProfileRepository;
    private final SseService sseService;

    public FreelancerController(FreelancerProfileRepository freelancerProfileRepository, SseService sseService) {
        this.freelancerProfileRepository = freelancerProfileRepository;
        this.sseService = sseService;
    }

    @GetMapping
    @Operation(summary = "Get all freelancer profiles")
    public ResponseEntity<List<FreelancerProfile>> getAllFreelancers() {
        return ResponseEntity.ok(freelancerProfileRepository.findAll());
    }

    @PutMapping("/profile")
    @Operation(summary = "Update freelancer profile from resume data (upsert)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> profileData) {

        com.fasterxml.jackson.databind.ObjectMapper mapper =
                new com.fasterxml.jackson.databind.ObjectMapper();

        // ── UPSERT: create profile row if it doesn't exist yet ──────────
        FreelancerProfile profile = freelancerProfileRepository
                .findByUserId(user.getId())
                .orElseGet(() -> {
                    FreelancerProfile p = new FreelancerProfile();
                    p.setUser(user);
                    return p;
                });

        // Update fields from resume parsing
        if (profileData.containsKey("title") && profileData.get("title") != null) {
            profile.setTitle((String) profileData.get("title"));
        }
        if (profileData.containsKey("bio") && profileData.get("bio") != null) {
            profile.setBio((String) profileData.get("bio"));
        }
        if (profileData.containsKey("skills") && profileData.get("skills") != null) {
            Object skills = profileData.get("skills");
            if (skills instanceof List) {
                try {
                    profile.setSkills(mapper.writeValueAsString(skills));
                } catch (Exception e) {
                    profile.setSkills("[]");
                }
            } else if (skills instanceof String) {
                profile.setSkills((String) skills);
            }
        }
        if (profileData.containsKey("resume_text") && profileData.get("resume_text") != null) {
            profile.setResumeText((String) profileData.get("resume_text"));
        }
        if (profileData.containsKey("hourlyRate") && profileData.get("hourlyRate") != null) {
            Object rate = profileData.get("hourlyRate");
            if (rate instanceof Number) {
                profile.setHourlyRate(java.math.BigDecimal.valueOf(((Number) rate).doubleValue()));
            }
        }

        FreelancerProfile saved = freelancerProfileRepository.save(profile);
        sseService.dispatchEvent("freelancer_profile", "updated", saved.getId());

        return ResponseEntity.ok(saved);
    }
}
