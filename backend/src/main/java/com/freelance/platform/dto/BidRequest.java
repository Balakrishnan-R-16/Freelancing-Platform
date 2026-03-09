package com.freelance.platform.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class BidRequest {
    private Long jobId;
    private BigDecimal amount;
    private String proposal;
    private Integer deliveryDays;
}
