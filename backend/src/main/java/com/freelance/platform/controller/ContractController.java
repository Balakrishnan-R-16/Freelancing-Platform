package com.freelance.platform.controller;

import com.freelance.platform.dto.ApiResponse;
import com.freelance.platform.entity.Contract;
import com.freelance.platform.entity.EscrowTransaction;
import com.freelance.platform.entity.User;
import com.freelance.platform.repository.ContractRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.razorpay.RazorpayException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contracts")
@Tag(name = "Contracts", description = "Escrow and Contracts operations")
@SecurityRequirement(name = "bearerAuth")
public class ContractController {

    private final ContractRepository contractRepository;
    private final com.freelance.platform.service.ContractService contractService;

    public ContractController(ContractRepository contractRepository, com.freelance.platform.service.ContractService contractService) {
        this.contractRepository = contractRepository;
        this.contractService = contractService;
    }

    @GetMapping("/my")
    @Operation(summary = "Get all contracts for the authenticated user")
    public ResponseEntity<ApiResponse<List<Contract>>> getMyContracts(@AuthenticationPrincipal User user) {
        List<Contract> contracts;
        if (user.getRole() == User.Role.EMPLOYER) {
            contracts = contractRepository.findByEmployerId(user.getId());
        } else {
            contracts = contractRepository.findByFreelancerId(user.getId());
        }
        return ResponseEntity.ok(ApiResponse.success("Contracts retrieved successfully", contracts));
    }

    @PostMapping("/{id}/fund/initiate")
    @Operation(summary = "Initiate funding via Razorpay (Employer only)")
    public ResponseEntity<ApiResponse<EscrowTransaction>> initiateFunding(@PathVariable Long id, @AuthenticationPrincipal User user) throws RazorpayException {
        EscrowTransaction transaction = contractService.initiateFunding(id, user);
        return ResponseEntity.ok(ApiResponse.success("Funding initiated", transaction));
    }

    @PostMapping("/{id}/fund/verify")
    @Operation(summary = "Verify Razorpay payment signature (Employer only)")
    public ResponseEntity<ApiResponse<Contract>> verifyFunding(
            @PathVariable Long id, 
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> payload) {
        
        String orderId = payload.get("razorpay_order_id");
        String paymentId = payload.get("razorpay_payment_id");
        String signature = payload.get("razorpay_signature");
        
        Contract contract = contractService.verifyFunding(id, user, orderId, paymentId, signature);
        return ResponseEntity.ok(ApiResponse.success("Funding verified successfully", contract));
    }

    @PostMapping("/{id}/submit-work")
    @Operation(summary = "Submit work for a funded contract (Freelancer only)")
    public ResponseEntity<ApiResponse<Contract>> submitWork(
            @PathVariable Long id, 
            @AuthenticationPrincipal User user,
            @RequestBody(required = false) Map<String, String> payload) {
                
        String note = payload != null ? payload.get("submissionNote") : null;
        String link = payload != null ? payload.get("submissionLink") : null;
        
        Contract contract = contractService.submitWork(id, user, note, link);
        return ResponseEntity.ok(ApiResponse.success("Work submitted successfully", contract));
    }

    @PostMapping("/{id}/approve-work")
    @Operation(summary = "Approve work and release funds (Employer only)")
    public ResponseEntity<ApiResponse<Contract>> approveWork(@PathVariable Long id, @AuthenticationPrincipal User user) {
        Contract contract = contractService.approveWork(id, user);
        return ResponseEntity.ok(ApiResponse.success("Work approved and funds released", contract));
    }

    @PostMapping("/{id}/dispute")
    @Operation(summary = "Raise a dispute (Employer or Freelancer)")
    public ResponseEntity<ApiResponse<Contract>> raiseDispute(@PathVariable Long id, @AuthenticationPrincipal User user) {
        Contract contract = contractService.raiseDispute(id, user);
        return ResponseEntity.ok(ApiResponse.success("Dispute raised", contract));
    }

    @GetMapping("/disputed")
    @Operation(summary = "Get all disputed contracts (Admin only)")
    public ResponseEntity<ApiResponse<List<Contract>>> getDisputedContracts(@AuthenticationPrincipal User user) {
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).body(ApiResponse.error("Admin access required"));
        }
        List<Contract> disputed = contractRepository.findByStatus(Contract.ContractStatus.DISPUTED);
        return ResponseEntity.ok(ApiResponse.success("Disputed contracts retrieved", disputed));
    }

    @PostMapping("/{id}/resolve-release")
    @Operation(summary = "Admin resolves dispute: release funds to freelancer")
    public ResponseEntity<ApiResponse<Contract>> resolveRelease(@PathVariable Long id, @AuthenticationPrincipal User user) {
        Contract contract = contractService.resolveRelease(id, user);
        return ResponseEntity.ok(ApiResponse.success("Dispute resolved — funds released to freelancer", contract));
    }

    @PostMapping("/{id}/resolve-refund")
    @Operation(summary = "Admin resolves dispute: refund employer")
    public ResponseEntity<ApiResponse<Contract>> resolveRefund(@PathVariable Long id, @AuthenticationPrincipal User user) {
        Contract contract = contractService.resolveRefund(id, user);
        return ResponseEntity.ok(ApiResponse.success("Dispute resolved — funds refunded to employer. Job has been reopened in the marketplace.", contract));
    }

    @PostMapping("/jobs/{jobId}/reopen")
    @Operation(summary = "Manually reopen a job stuck in IN_PROGRESS (Employer only)")
    public ResponseEntity<ApiResponse<com.freelance.platform.entity.Job>> reopenJob(
            @PathVariable Long jobId,
            @AuthenticationPrincipal User user) {
        com.freelance.platform.entity.Job job = contractService.reopenJob(jobId, user);
        return ResponseEntity.ok(ApiResponse.success("Job reopened successfully and is now visible in the marketplace.", job));
    }
}
