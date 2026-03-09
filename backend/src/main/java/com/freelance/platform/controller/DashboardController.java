package com.freelance.platform.controller;

import com.freelance.platform.dto.DashboardStats;
import com.freelance.platform.entity.User;
import com.freelance.platform.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard", description = "Analytics and statistics")
@SecurityRequirement(name = "bearerAuth")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    @Operation(summary = "Get overall platform statistics")
    public ResponseEntity<DashboardStats> getOverallStats() {
        return ResponseEntity.ok(dashboardService.getOverallStats());
    }

    @GetMapping("/employer")
    @Operation(summary = "Get employer-specific dashboard stats")
    public ResponseEntity<DashboardStats> getEmployerStats(@AuthenticationPrincipal User employer) {
        return ResponseEntity.ok(dashboardService.getEmployerStats(employer.getId()));
    }

    @GetMapping("/freelancer")
    @Operation(summary = "Get freelancer-specific dashboard stats")
    public ResponseEntity<DashboardStats> getFreelancerStats(@AuthenticationPrincipal User freelancer) {
        return ResponseEntity.ok(dashboardService.getFreelancerStats(freelancer.getId()));
    }
}
