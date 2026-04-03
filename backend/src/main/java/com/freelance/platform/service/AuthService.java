package com.freelance.platform.service;

import com.freelance.platform.dto.*;
import com.freelance.platform.entity.FreelancerProfile;
import com.freelance.platform.entity.User;
import com.freelance.platform.repository.FreelancerProfileRepository;
import com.freelance.platform.repository.UserRepository;
import com.freelance.platform.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.util.UUID;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final FreelancerProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final RestTemplate restTemplate = new RestTemplate();

    public AuthService(UserRepository userRepository,
                       FreelancerProfileRepository profileRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(User.Role.valueOf(request.getRole()))
                .build();

        user = userRepository.save(user);

        // Create freelancer profile automatically for freelancer users
        if (user.getRole() == User.Role.FREELANCER) {
            FreelancerProfile profile = FreelancerProfile.builder()
                    .user(user)
                    .title("New Freelancer")
                    .skills("[]")
                    .portfolioLinks("[]")
                    .build();
            profileRepository.save(profile);
        }

        String token = tokenProvider.generateToken(user.getEmail(), user.getRole().name());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }

    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Account not found. Please sign up."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }

        String token = tokenProvider.generateToken(user.getEmail(), user.getRole().name());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }

    @Transactional
    public AuthResponse googleLogin(GoogleAuthRequest request) {
        // 1. Verify token with Google and get user info
        String url = "https://www.googleapis.com/oauth2/v3/userinfo";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(request.getAccessToken());
        HttpEntity<String> entity = new HttpEntity<>("", headers);
        
        ResponseEntity<Map> response;
        try {
            response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to verify Google Token");
        }

        Map<String, Object> payload = response.getBody();
        if (payload == null || !payload.containsKey("email")) {
            throw new RuntimeException("Invalid Google Token response");
        }

        String email = (String) payload.get("email");
        String name = (String) payload.getOrDefault("name", "Google User");

        // 2. Find or Create User
        Optional<User> userOpt = userRepository.findByEmail(email);
        User user;

        if (userOpt.isPresent()) {
            user = userOpt.get();
        } else {
            // Do not allow login for non-existent accounts unless it's explicitly a registration request
            if (!request.isRegister()) {
                throw new RuntimeException("Account not found. Please sign up.");
            }

            // Auto Register
            User.Role requestedRole = User.Role.FREELANCER;
            if (request.getRole() != null && request.getRole().equalsIgnoreCase("EMPLOYER")) {
                requestedRole = User.Role.EMPLOYER;
            }

            user = User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString())) // Random password for OAuth
                    .fullName(name)
                    .role(requestedRole)
                    .build();
            user = userRepository.save(user);

            if (user.getRole() == User.Role.FREELANCER) {
                FreelancerProfile profile = FreelancerProfile.builder()
                        .user(user)
                        .title("Google Authenticated Freelancer")
                        .skills("[]")
                        .portfolioLinks("[]")
                        .build();
                profileRepository.save(profile);
            }
        }

        String token = tokenProvider.generateToken(user.getEmail(), user.getRole().name());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }
}
