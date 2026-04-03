package com.freelance.platform.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String password;
    private String fullName;
    private String role; // FREELANCER or EMPLOYER
}
