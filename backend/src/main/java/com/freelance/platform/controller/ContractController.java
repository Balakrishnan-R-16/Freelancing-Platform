package com.freelance.platform.controller;

import com.freelance.platform.entity.Contract;
import com.freelance.platform.entity.User;
import com.freelance.platform.repository.ContractRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contracts")
@Tag(name = "Contracts", description = "Escrow and Contracts operations")
@SecurityRequirement(name = "bearerAuth")
public class ContractController {

    private final ContractRepository contractRepository;

    public ContractController(ContractRepository contractRepository) {
        this.contractRepository = contractRepository;
    }

    @GetMapping("/my")
    @Operation(summary = "Get all contracts for the authenticated user")
    public ResponseEntity<List<Contract>> getMyContracts(@AuthenticationPrincipal User user) {
        if (user.getRole() == User.Role.EMPLOYER) {
            return ResponseEntity.ok(contractRepository.findByEmployerId(user.getId()));
        } else {
            return ResponseEntity.ok(contractRepository.findByFreelancerId(user.getId()));
        }
    }
}
