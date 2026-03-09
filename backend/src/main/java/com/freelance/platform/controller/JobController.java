package com.freelance.platform.controller;

import com.freelance.platform.dto.JobRequest;
import com.freelance.platform.entity.Job;
import com.freelance.platform.entity.User;
import com.freelance.platform.service.JobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@Tag(name = "Jobs", description = "Job marketplace operations")
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping
    @Operation(summary = "Get all open jobs")
    public ResponseEntity<List<Job>> getAllOpenJobs() {
        return ResponseEntity.ok(jobService.getAllOpenJobs());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get job by ID")
    public ResponseEntity<Job> getJobById(@PathVariable Long id) {
        return ResponseEntity.ok(jobService.getJobById(id));
    }

    @GetMapping("/employer/{employerId}")
    @Operation(summary = "Get jobs by employer")
    public ResponseEntity<List<Job>> getJobsByEmployer(@PathVariable Long employerId) {
        return ResponseEntity.ok(jobService.getJobsByEmployer(employerId));
    }

    @PostMapping
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Create a new job posting", description = "Employers only")
    public ResponseEntity<Job> createJob(@RequestBody JobRequest request,
            @AuthenticationPrincipal User employer) {
        return ResponseEntity.ok(jobService.createJob(request, employer));
    }

    @PutMapping("/{id}/status")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Update job status")
    public ResponseEntity<Job> updateJobStatus(@PathVariable Long id,
            @RequestParam String status,
            @AuthenticationPrincipal User employer) {
        return ResponseEntity.ok(jobService.updateJobStatus(id, status, employer));
    }

    @PutMapping("/{id}")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Update a job posting entirely")
    public ResponseEntity<Job> updateJob(@PathVariable Long id,
            @RequestBody JobRequest request,
            @AuthenticationPrincipal User employer) {
        return ResponseEntity.ok(jobService.updateJob(id, request, employer));
    }

    @DeleteMapping("/{id}")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Delete a job posting")
    public ResponseEntity<Void> deleteJob(@PathVariable Long id,
            @AuthenticationPrincipal User employer) {
        jobService.deleteJob(id, employer);
        return ResponseEntity.noContent().build();
    }
}
