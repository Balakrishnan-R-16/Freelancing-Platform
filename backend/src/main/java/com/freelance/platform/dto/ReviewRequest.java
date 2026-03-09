package com.freelance.platform.dto;

import lombok.Data;

@Data
public class ReviewRequest {
    private Long contractId;
    private Long revieweeId;
    private Integer rating;
    private String comment;
}
