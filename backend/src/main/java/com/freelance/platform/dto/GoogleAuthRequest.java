package com.freelance.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class GoogleAuthRequest {
    private String accessToken;
    private String role; // Optional: Only used during first-time signup via Google
}
