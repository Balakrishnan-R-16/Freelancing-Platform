package com.freelance.platform.repository;

import com.freelance.platform.entity.Bid;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BidRepository extends JpaRepository<Bid, Long> {
    List<Bid> findByJobId(Long jobId);

    List<Bid> findByFreelancerId(Long freelancerId);

    boolean existsByJobIdAndFreelancerId(Long jobId, Long freelancerId);

    Optional<Bid> findByJobIdAndFreelancerId(Long jobId, Long freelancerId);

    long countByFreelancerIdAndStatus(Long freelancerId, Bid.BidStatus status);
}
