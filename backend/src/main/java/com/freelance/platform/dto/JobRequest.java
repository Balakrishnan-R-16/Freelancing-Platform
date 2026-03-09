package com.freelance.platform.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class JobRequest {
    private String title;
    private String description;
    private String skillsRequired; // JSON string
    private BigDecimal budget;
    private Integer durationDays;
}
