package com.freelance.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
@AllArgsConstructor
public class DashboardStats {
    private long totalJobs;
    private long openJobs;
    private long activeContracts;
    private long completedContracts;
    private long totalFreelancers;
    private long totalEmployers;
    private Map<String, Object> extras;
}
