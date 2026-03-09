package com.freelance.platform.service;

import com.freelance.platform.dto.ReviewRequest;
import com.freelance.platform.entity.Contract;
import com.freelance.platform.entity.Review;
import com.freelance.platform.entity.User;
import com.freelance.platform.repository.ContractRepository;
import com.freelance.platform.repository.FreelancerProfileRepository;
import com.freelance.platform.repository.ReviewRepository;
import com.freelance.platform.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ContractRepository contractRepository;
    private final UserRepository userRepository;
    private final FreelancerProfileRepository profileRepository;
    private final SseService sseService;

    public ReviewService(ReviewRepository reviewRepository,
            ContractRepository contractRepository,
            UserRepository userRepository,
            FreelancerProfileRepository profileRepository,
            SseService sseService) {
        this.reviewRepository = reviewRepository;
        this.contractRepository = contractRepository;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.sseService = sseService;
    }

    public List<Review> getReviewsForUser(Long userId) {
        return reviewRepository.findByRevieweeId(userId);
    }

    @Transactional
    public Review createReview(ReviewRequest request, User reviewer) {
        Contract contract = contractRepository.findById(request.getContractId())
                .orElseThrow(() -> new RuntimeException("Contract not found"));

        if (contract.getStatus() != Contract.ContractStatus.COMPLETED) {
            throw new RuntimeException("Can only review completed contracts");
        }

        User reviewee = userRepository.findById(request.getRevieweeId())
                .orElseThrow(() -> new RuntimeException("Reviewee not found"));

        Review review = Review.builder()
                .contract(contract)
                .reviewer(reviewer)
                .reviewee(reviewee)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        review = reviewRepository.save(review);
        sseService.dispatchEvent("review", "created", review);

        // Update average rating if reviewee is a freelancer
        if (reviewee.getRole() == User.Role.FREELANCER) {
            Double avgRating = reviewRepository.getAverageRatingForUser(reviewee.getId());
            profileRepository.findByUserId(reviewee.getId()).ifPresent(profile -> {
                profile.setAvgRating(BigDecimal.valueOf(avgRating != null ? avgRating : 0));
                profileRepository.save(profile);
            });
            sseService.dispatchEvent("freelancer_profile", "updated", reviewee.getId());
        }

        return review;
    }
}
