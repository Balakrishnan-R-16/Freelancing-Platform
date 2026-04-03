package com.freelance.platform.service;

import com.freelance.platform.entity.Contract;
import com.freelance.platform.entity.EscrowTransaction;
import com.freelance.platform.entity.Job;
import com.freelance.platform.entity.User;
import com.freelance.platform.repository.ContractRepository;
import com.freelance.platform.repository.EscrowTransactionRepository;
import com.freelance.platform.repository.JobRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class ContractService {

    private final ContractRepository contractRepository;
    private final EscrowTransactionRepository transactionRepository;
    private final PaymentService paymentService;
    private final JobRepository jobRepository;
    private final SseService sseService;

    public ContractService(ContractRepository contractRepository, EscrowTransactionRepository transactionRepository,
                           PaymentService paymentService, JobRepository jobRepository, SseService sseService) {
        this.contractRepository = contractRepository;
        this.transactionRepository = transactionRepository;
        this.paymentService = paymentService;
        this.jobRepository = jobRepository;
        this.sseService = sseService;
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ, propagation = Propagation.REQUIRES_NEW)
    public EscrowTransaction initiateFunding(Long contractId, User user) throws RazorpayException {
        Contract contract = getContractForUser(contractId, user, true);
        
        if (contract.getStatus() != Contract.ContractStatus.CREATED) {
            throw new IllegalStateException("Contract cannot be funded in its current state.");
        }

        Order order = paymentService.createOrder(contract.getAmount());
        
        EscrowTransaction transaction = EscrowTransaction.builder()
                .contract(contract)
                .type(EscrowTransaction.TransactionType.FUND)
                .amount(contract.getAmount())
                .status(EscrowTransaction.TransactionStatus.PENDING)
                .razorpayOrderId(order.get("id"))
                .build();
                
        return transactionRepository.save(transaction);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ, propagation = Propagation.REQUIRES_NEW)
    public Contract verifyFunding(Long contractId, User user, String orderId, String paymentId, String signature) {
        Contract contract = getContractForUser(contractId, user, true);
        
        if (contract.getStatus() != Contract.ContractStatus.CREATED) {
            throw new IllegalStateException("Contract is already funded or in an invalid state.");
        }

        EscrowTransaction transaction = transactionRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found."));

        if (!transaction.getContract().getId().equals(contract.getId())) {
            throw new IllegalArgumentException("Transaction does not belong to this contract.");
        }

        if (transaction.getStatus() != EscrowTransaction.TransactionStatus.PENDING) {
            throw new IllegalStateException("Transaction is already processed.");
        }

        boolean isValid = paymentService.verifySignature(orderId, paymentId, signature);
        if (!isValid) {
            transaction.setStatus(EscrowTransaction.TransactionStatus.FAILED);
            transactionRepository.save(transaction);
            throw new IllegalStateException("Payment verification failed. Invalid signature.");
        }

        transaction.setStatus(EscrowTransaction.TransactionStatus.SUCCESS);
        transaction.setRazorpayPaymentId(paymentId);
        transaction.setRazorpaySignature(signature);
        transactionRepository.save(transaction);

        contract.setStatus(Contract.ContractStatus.FUNDED);
        contract.setFundedAt(LocalDateTime.now());
        Contract funded = contractRepository.save(contract);
        sseService.dispatchEvent("contract", "updated", funded);
        return funded;
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ, propagation = Propagation.REQUIRES_NEW)
    public Contract submitWork(Long contractId, User user, String submissionNote, String submissionLink) {
        Contract contract = getContractForUser(contractId, user, false);
        if (contract.getStatus() != Contract.ContractStatus.FUNDED) {
            throw new IllegalStateException("Work cannot be submitted unless contract is FUNDED.");
        }
        
        contract.setSubmissionNote(submissionNote);
        contract.setSubmissionLink(submissionLink);
        contract.setStatus(Contract.ContractStatus.WORK_SUBMITTED);
        Contract submitted = contractRepository.save(contract);
        sseService.dispatchEvent("contract", "updated", submitted);
        return submitted;
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ, propagation = Propagation.REQUIRES_NEW)
    public Contract approveWork(Long contractId, User user) {
        Contract contract = getContractForUser(contractId, user, true);
        if (contract.getStatus() != Contract.ContractStatus.WORK_SUBMITTED) {
            throw new IllegalStateException("Cannot approve work unless it is SUBMITTED.");
        }

        contract.setStatus(Contract.ContractStatus.COMPLETED);
        contract.setCompletedAt(LocalDateTime.now());
        
        EscrowTransaction transaction = EscrowTransaction.builder()
                .contract(contract)
                .type(EscrowTransaction.TransactionType.RELEASE)
                .amount(contract.getAmount())
                .status(EscrowTransaction.TransactionStatus.SUCCESS)
                .build();
        transactionRepository.save(transaction);

        // Update the associated Job to COMPLETED directly
        Job job = jobRepository.findById(contract.getJob().getId()).orElse(null);
        if (job != null && (job.getStatus() == Job.JobStatus.IN_PROGRESS || job.getStatus() == Job.JobStatus.OPEN)) {
            job.setStatus(Job.JobStatus.COMPLETED);
            jobRepository.save(job);
            sseService.dispatchEvent("job", "updated", job);
        }

        Contract completed = contractRepository.save(contract);
        // Fire contract_updated so both dashboards refresh stats/earnings in real-time
        sseService.dispatchEvent("contract", "updated", completed);
        return completed;
    }


    @Transactional(isolation = Isolation.REPEATABLE_READ, propagation = Propagation.REQUIRES_NEW)
    public Contract raiseDispute(Long contractId, User user) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Contract not found"));

        if (!contract.getEmployer().getId().equals(user.getId()) && !contract.getFreelancer().getId().equals(user.getId())) {
             throw new SecurityException("Only involved parties can raise a dispute.");
        }

        if (contract.getStatus() != Contract.ContractStatus.FUNDED && contract.getStatus() != Contract.ContractStatus.WORK_SUBMITTED) {
            throw new IllegalStateException("Disputes can only be raised when funds are held in escrow.");
        }

        contract.setStatus(Contract.ContractStatus.DISPUTED);
        Contract disputed = contractRepository.save(contract);
        sseService.dispatchEvent("contract", "updated", disputed);
        return disputed;
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ, propagation = Propagation.REQUIRES_NEW)
    public Contract resolveRelease(Long contractId, User admin) {
        if (admin.getRole() != User.Role.ADMIN) {
            throw new SecurityException("Only an admin can resolve disputes.");
        }
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Contract not found"));

        if (contract.getStatus() != Contract.ContractStatus.DISPUTED) {
            throw new IllegalStateException("Only disputed contracts can be resolved.");
        }

        contract.setStatus(Contract.ContractStatus.COMPLETED);
        contract.setCompletedAt(LocalDateTime.now());

        EscrowTransaction transaction = EscrowTransaction.builder()
                .contract(contract)
                .type(EscrowTransaction.TransactionType.RELEASE)
                .amount(contract.getAmount())
                .status(EscrowTransaction.TransactionStatus.SUCCESS)
                .build();
        transactionRepository.save(transaction);

        // Also update Job to COMPLETED if still IN_PROGRESS directly
        Job releaseJob = jobRepository.findById(contract.getJob().getId()).orElse(null);
        if (releaseJob != null && (releaseJob.getStatus() == Job.JobStatus.IN_PROGRESS || releaseJob.getStatus() == Job.JobStatus.OPEN)) {
            releaseJob.setStatus(Job.JobStatus.COMPLETED);
            jobRepository.save(releaseJob);
            sseService.dispatchEvent("job", "updated", releaseJob);
        }

        Contract resolvedRelease = contractRepository.save(contract);
        sseService.dispatchEvent("contract", "updated", resolvedRelease);
        return resolvedRelease;
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ, propagation = Propagation.REQUIRES_NEW)
    public Contract resolveRefund(Long contractId, User admin) {
        if (admin.getRole() != User.Role.ADMIN) {
            throw new SecurityException("Only an admin can resolve disputes.");
        }
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Contract not found"));

        if (contract.getStatus() != Contract.ContractStatus.DISPUTED) {
            throw new IllegalStateException("Only disputed contracts can be resolved.");
        }

        contract.setStatus(Contract.ContractStatus.REFUNDED);

        EscrowTransaction transaction = EscrowTransaction.builder()
                .contract(contract)
                .type(EscrowTransaction.TransactionType.REFUND)
                .amount(contract.getAmount())
                .status(EscrowTransaction.TransactionStatus.SUCCESS)
                .build();
        transactionRepository.save(transaction);

        // Automatically reopen the job so it reappears in the marketplace directly
        Job job = jobRepository.findById(contract.getJob().getId()).orElse(null);
        if (job != null && (job.getStatus() == Job.JobStatus.IN_PROGRESS || job.getStatus() == Job.JobStatus.COMPLETED)) {
            job.setStatus(Job.JobStatus.OPEN);
            jobRepository.save(job);
            sseService.dispatchEvent("job", "updated", job);
        }

        Contract refunded = contractRepository.save(contract);
        sseService.dispatchEvent("contract", "updated", refunded);
        return refunded;
    }

    /**
     * Allows an employer to manually reopen a job that is stuck in IN_PROGRESS
     * (e.g. after a refund or cancellation). Only the job's owner can do this.
     */
    @Transactional
    public Job reopenJob(Long jobId, User employer) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found"));
        if (!job.getEmployer().getId().equals(employer.getId())) {
            throw new SecurityException("Only the job owner can reopen it.");
        }
        if (job.getStatus() != Job.JobStatus.IN_PROGRESS) {
            throw new IllegalStateException("Only IN_PROGRESS jobs can be manually reopened.");
        }
        job.setStatus(Job.JobStatus.OPEN);
        Job updated = jobRepository.save(job);
        sseService.dispatchEvent("job", "updated", updated);
        return updated;
    }

    private Contract getContractForUser(Long contractId, User user, boolean mustBeEmployer) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Contract not found"));

        if (mustBeEmployer) {
            if (!contract.getEmployer().getId().equals(user.getId())) {
                throw new SecurityException("Only the employer can perform this action.");
            }
        } else {
            if (!contract.getFreelancer().getId().equals(user.getId())) {
                throw new SecurityException("Only the freelancer can perform this action.");
            }
        }
        return contract;
    }
}
