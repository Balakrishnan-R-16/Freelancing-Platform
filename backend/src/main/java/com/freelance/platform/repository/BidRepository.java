package com.freelance.platform.repository;

import com.freelance.platform.entity.Bid;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BidRepository extends JpaRepository<Bid, Long> {
    List<Bid> findByJobId(Long jobId);

    List<Bid> findByFreelancerId(Long freelancerId);

    boolean existsByJobIdAndFreelancerId(Long jobId, Long freelancerId);

    long countByFreelancerIdAndStatus(Long freelancerId, Bid.BidStatus status);
}
