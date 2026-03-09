package com.freelance.platform.controller;

import com.freelance.platform.dto.ReviewRequest;
import com.freelance.platform.entity.Review;
import com.freelance.platform.entity.User;
import com.freelance.platform.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@Tag(name = "Reviews", description = "Ratings and reviews")
@SecurityRequirement(name = "bearerAuth")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get reviews for a user")
    public ResponseEntity<List<Review>> getReviewsForUser(@PathVariable Long userId) {
        return ResponseEntity.ok(reviewService.getReviewsForUser(userId));
    }

    @PostMapping
    @Operation(summary = "Create a review", description = "Only for completed contracts")
    public ResponseEntity<Review> createReview(@RequestBody ReviewRequest request,
                                                @AuthenticationPrincipal User reviewer) {
        return ResponseEntity.ok(reviewService.createReview(request, reviewer));
    }
}
