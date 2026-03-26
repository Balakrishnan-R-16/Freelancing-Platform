package com.freelance.platform.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "freelancer_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FreelancerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(columnDefinition = "JSON")
    private String skills;

    @Column(name = "portfolio_links", columnDefinition = "JSON")
    private String portfolioLinks;

    @Column(name = "hourly_rate", precision = 10, scale = 2)
    private BigDecimal hourlyRate;

    @Column(name = "avg_rating", precision = 3, scale = 2)
    private BigDecimal avgRating;

    @Column(name = "total_earnings", precision = 15, scale = 2)
    private BigDecimal totalEarnings;

    @Column(name = "jobs_completed")
    private Integer jobsCompleted;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "resume_text", columnDefinition = "TEXT")
    private String resumeText;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (avgRating == null)
            avgRating = BigDecimal.ZERO;
        if (totalEarnings == null)
            totalEarnings = BigDecimal.ZERO;
        if (jobsCompleted == null)
            jobsCompleted = 0;
        if (hourlyRate == null)
            hourlyRate = BigDecimal.ZERO;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
