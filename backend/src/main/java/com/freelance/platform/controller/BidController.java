package com.freelance.platform.controller;

import com.freelance.platform.dto.BidRequest;
import com.freelance.platform.entity.Bid;
import com.freelance.platform.entity.User;
import com.freelance.platform.service.BidService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bids")
@Tag(name = "Bids", description = "Job bidding operations")
@SecurityRequirement(name = "bearerAuth")
public class BidController {

    private final BidService bidService;

    public BidController(BidService bidService) {
        this.bidService = bidService;
    }

    @GetMapping("/job/{jobId}")
    @Operation(summary = "Get all bids for a job")
    public ResponseEntity<List<Bid>> getBidsForJob(@PathVariable Long jobId) {
        return ResponseEntity.ok(bidService.getBidsForJob(jobId));
    }

    @GetMapping("/freelancer/{freelancerId}")
    @Operation(summary = "Get all bids by a freelancer")
    public ResponseEntity<List<Bid>> getBidsForFreelancer(@PathVariable Long freelancerId) {
        return ResponseEntity.ok(bidService.getBidsForFreelancer(freelancerId));
    }

    @PostMapping
    @Operation(summary = "Place a bid on a job", description = "Freelancers only")
    public ResponseEntity<Bid> placeBid(@RequestBody BidRequest request,
                                         @AuthenticationPrincipal User freelancer) {
        return ResponseEntity.ok(bidService.placeBid(request, freelancer));
    }

    @PutMapping("/{bidId}/accept")
    @Operation(summary = "Accept a bid", description = "Employers only. Also creates a contract and rejects other bids.")
    public ResponseEntity<Bid> acceptBid(@PathVariable Long bidId,
                                          @AuthenticationPrincipal User employer) {
        return ResponseEntity.ok(bidService.acceptBid(bidId, employer));
    }

    @PutMapping("/{bidId}/reject")
    @Operation(summary = "Reject a bid", description = "Employers only")
    public ResponseEntity<Bid> rejectBid(@PathVariable Long bidId,
                                          @AuthenticationPrincipal User employer) {
        return ResponseEntity.ok(bidService.rejectBid(bidId, employer));
    }
}
