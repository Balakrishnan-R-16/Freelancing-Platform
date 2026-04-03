package com.freelance.platform.service;

import com.freelance.platform.dto.BidRequest;
import com.freelance.platform.entity.*;
import com.freelance.platform.repository.BidRepository;
import com.freelance.platform.repository.ContractRepository;
import com.freelance.platform.repository.JobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BidService {

    private final BidRepository bidRepository;
    private final JobRepository jobRepository;
    private final ContractRepository contractRepository;
    private final SseService sseService;

    public BidService(BidRepository bidRepository, JobRepository jobRepository,
            ContractRepository contractRepository, SseService sseService) {
        this.bidRepository = bidRepository;
        this.jobRepository = jobRepository;
        this.contractRepository = contractRepository;
        this.sseService = sseService;
    }

    public List<Bid> getBidsForJob(Long jobId) {
        return bidRepository.findByJobId(jobId);
    }

    public List<Bid> getBidsForFreelancer(Long freelancerId) {
        return bidRepository.findByFreelancerId(freelancerId);
    }

    @Transactional
    public Bid placeBid(BidRequest request, User freelancer) {
        if (freelancer.getRole() != User.Role.FREELANCER) {
            throw new RuntimeException("Only freelancers can place bids");
        }

        Job job = jobRepository.findById(request.getJobId())
                .orElseThrow(() -> new RuntimeException("Job not found"));

        if (job.getStatus() != Job.JobStatus.OPEN) {
            throw new RuntimeException("Job is not open for bidding");
        }

        // Check for an existing bid by this freelancer on this job
        java.util.Optional<Bid> existing = bidRepository.findByJobIdAndFreelancerId(job.getId(), freelancer.getId());
        if (existing.isPresent()) {
            Bid prev = existing.get();
            if (prev.getStatus() == Bid.BidStatus.PENDING) {
                // Freelancer already has an active pending bid — block duplicate
                throw new RuntimeException("You already have a pending bid on this job. Withdraw it first if you'd like to revise.");
            }
            // Bid was REJECTED (job was reopened after dispute/cancellation) — allow re-bid by updating the record
            prev.setAmount(request.getAmount());
            prev.setProposal(request.getProposal());
            prev.setDeliveryDays(request.getDeliveryDays());
            prev.setStatus(Bid.BidStatus.PENDING);
            Bid updated = bidRepository.save(prev);
            sseService.dispatchEvent("bid", "created", updated);
            return updated;
        }

        Bid bid = Bid.builder()
                .job(job)
                .freelancer(freelancer)
                .amount(request.getAmount())
                .proposal(request.getProposal())
                .deliveryDays(request.getDeliveryDays())
                .status(Bid.BidStatus.PENDING)
                .build();

        Bid savedBid = bidRepository.save(bid);
        sseService.dispatchEvent("bid", "created", savedBid);
        return savedBid;
    }

    @Transactional
    public Bid acceptBid(Long bidId, User employer) {
        Bid bid = bidRepository.findById(bidId)
                .orElseThrow(() -> new RuntimeException("Bid not found"));

        Job job = bid.getJob();
        if (!job.getEmployer().getId().equals(employer.getId())) {
            throw new RuntimeException("Not authorized to accept this bid");
        }

        // Accept this bid, reject all others
        bid.setStatus(Bid.BidStatus.ACCEPTED);
        bidRepository.save(bid);
        sseService.dispatchEvent("bid", "accepted", bid);

        bidRepository.findByJobId(job.getId()).stream()
                .filter(b -> !b.getId().equals(bidId))
                .forEach(b -> {
                    b.setStatus(Bid.BidStatus.REJECTED);
                    bidRepository.save(b);
                    sseService.dispatchEvent("bid", "rejected", b);
                });

        // Update job status
        job.setStatus(Job.JobStatus.IN_PROGRESS);
        jobRepository.save(job);
        sseService.dispatchEvent("job", "updated", job);

        // Create contract
        Contract contract = Contract.builder()
                .job(job)
                .freelancer(bid.getFreelancer())
                .employer(employer)
                .amount(bid.getAmount())
                .status(Contract.ContractStatus.CREATED)
                .build();
        Contract savedContract = contractRepository.save(contract);
        sseService.dispatchEvent("contract", "created", savedContract);

        return bid;
    }

    @Transactional
    public Bid rejectBid(Long bidId, User employer) {
        Bid bid = bidRepository.findById(bidId)
                .orElseThrow(() -> new RuntimeException("Bid not found"));

        if (!bid.getJob().getEmployer().getId().equals(employer.getId())) {
            throw new RuntimeException("Not authorized to reject this bid");
        }

        bid.setStatus(Bid.BidStatus.REJECTED);
        Bid savedBid = bidRepository.save(bid);
        sseService.dispatchEvent("bid", "rejected", savedBid);
        return savedBid;
    }
}
