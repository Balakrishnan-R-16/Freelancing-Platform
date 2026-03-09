package com.freelance.platform.service;

import com.freelance.platform.dto.DashboardStats;
import com.freelance.platform.entity.Bid;
import com.freelance.platform.entity.Contract;
import com.freelance.platform.entity.FreelancerProfile;
import com.freelance.platform.entity.Job;
import com.freelance.platform.entity.User;
import com.freelance.platform.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class DashboardService {

        private final JobRepository jobRepository;
        private final UserRepository userRepository;
        private final ContractRepository contractRepository;
        private final BidRepository bidRepository;
        private final ReviewRepository reviewRepository;
        private final FreelancerProfileRepository freelancerProfileRepository;

        public DashboardService(JobRepository jobRepository,
                        UserRepository userRepository,
                        ContractRepository contractRepository,
                        BidRepository bidRepository,
                        ReviewRepository reviewRepository,
                        FreelancerProfileRepository freelancerProfileRepository) {
                this.jobRepository = jobRepository;
                this.userRepository = userRepository;
                this.contractRepository = contractRepository;
                this.bidRepository = bidRepository;
                this.reviewRepository = reviewRepository;
                this.freelancerProfileRepository = freelancerProfileRepository;
        }

        @Transactional(readOnly = true)
        public DashboardStats getOverallStats() {
                Map<String, Object> extras = new HashMap<>();

                // Sum all contract amounts to get "Secured via Escrow" amount
                double totalSecured = contractRepository.findAll().stream()
                                .filter(c -> c.getStatus() == Contract.ContractStatus.FUNDED ||
                                                c.getStatus() == Contract.ContractStatus.COMPLETED ||
                                                c.getStatus() == Contract.ContractStatus.WORK_SUBMITTED ||
                                                c.getStatus() == Contract.ContractStatus.APPROVED)
                                .mapToDouble(c -> c.getAmount() != null ? c.getAmount().doubleValue() : 0.0)
                                .sum();
                extras.put("totalSecured", totalSecured);

                // Average satisfaction rate across all reviews (out of 5 -> percentage)
                double avgRating = reviewRepository.findAll().stream()
                                .mapToDouble(com.freelance.platform.entity.Review::getRating)
                                .average()
                                .orElse(0.0);
                extras.put("satisfactionRate", avgRating > 0 ? (int) Math.round((avgRating / 5.0) * 100) : 100);

                return DashboardStats.builder()
                                .totalJobs(jobRepository.count())
                                .openJobs(jobRepository.countByStatus(Job.JobStatus.OPEN))
                                .activeContracts(contractRepository.countByStatus(Contract.ContractStatus.FUNDED))
                                .completedContracts(contractRepository.countByStatus(Contract.ContractStatus.COMPLETED))
                                .totalFreelancers(userRepository.countByRole(User.Role.FREELANCER))
                                .totalEmployers(userRepository.countByRole(User.Role.EMPLOYER))
                                .extras(extras)
                                .build();
        }

        @Transactional(readOnly = true)
        public DashboardStats getEmployerStats(Long employerId) {
                Map<String, Object> extras = new HashMap<>();
                extras.put("myJobs", jobRepository.findByEmployerId(employerId).size());
                extras.put("myContracts", contractRepository.findByEmployerId(employerId).size());

                return DashboardStats.builder()
                                .totalJobs(jobRepository.findByEmployerId(employerId).size())
                                .openJobs(jobRepository.findByEmployerId(employerId).stream()
                                                .filter(j -> j.getStatus() == Job.JobStatus.OPEN).count())
                                .activeContracts(contractRepository.findByEmployerId(employerId).stream()
                                                .filter(c -> c.getStatus() == Contract.ContractStatus.FUNDED).count())
                                .completedContracts(contractRepository.findByEmployerId(employerId).stream()
                                                .filter(c -> c.getStatus() == Contract.ContractStatus.COMPLETED)
                                                .count())
                                .totalFreelancers(0)
                                .totalEmployers(0)
                                .extras(extras)
                                .build();
        }

        @Transactional(readOnly = true)
        public DashboardStats getFreelancerStats(Long freelancerId) {
                Map<String, Object> extras = new HashMap<>();

                // Count only PENDING bids as "active"
                long activeBids = bidRepository.countByFreelancerIdAndStatus(freelancerId, Bid.BidStatus.PENDING);
                extras.put("myBids", activeBids);
                extras.put("myContracts", contractRepository.findByFreelancerId(freelancerId).size());

                // Calculate earnings from completed contracts
                double totalEarnings = contractRepository.findByFreelancerId(freelancerId).stream()
                                .filter(c -> c.getStatus() == Contract.ContractStatus.COMPLETED)
                                .mapToDouble(c -> c.getAmount() != null ? c.getAmount().doubleValue() : 0.0)
                                .sum();

                // Fallback: also check FreelancerProfile for stored earnings/completions
                Optional<FreelancerProfile> profileOpt = freelancerProfileRepository.findByUserId(freelancerId);
                if (profileOpt.isPresent()) {
                        FreelancerProfile profile = profileOpt.get();
                        if (totalEarnings == 0 && profile.getTotalEarnings() != null) {
                                totalEarnings = profile.getTotalEarnings().doubleValue();
                        }
                }
                extras.put("totalEarnings", totalEarnings);

                // Use efficient JPQL query instead of loading all reviews
                Double avgRating = reviewRepository.getAverageRatingForUser(freelancerId);
                extras.put("avgRating", String.format("%.1f", avgRating != null ? avgRating : 0.0));

                long completedContracts = contractRepository.findByFreelancerId(freelancerId).stream()
                                .filter(c -> c.getStatus() == Contract.ContractStatus.COMPLETED)
                                .count();

                return DashboardStats.builder()
                                .totalJobs(jobRepository.countByStatus(Job.JobStatus.OPEN))
                                .openJobs(jobRepository.countByStatus(Job.JobStatus.OPEN))
                                .activeContracts(contractRepository.findByFreelancerId(freelancerId).stream()
                                                .filter(c -> c.getStatus() == Contract.ContractStatus.FUNDED).count())
                                .completedContracts(completedContracts)
                                .totalFreelancers(0)
                                .totalEmployers(0)
                                .extras(extras)
                                .build();
        }
}
