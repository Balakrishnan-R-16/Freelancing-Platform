package com.freelance.platform.scheduler;

import com.freelance.platform.entity.EscrowTransaction;
import com.freelance.platform.repository.EscrowTransactionRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class PaymentScheduler {

    private static final Logger log = LoggerFactory.getLogger(PaymentScheduler.class);
    private final EscrowTransactionRepository transactionRepository;

    public PaymentScheduler(EscrowTransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    // Runs every 5 minutes
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void cleanupPendingTransactions() {
        LocalDateTime fifteenMinsAgo = LocalDateTime.now().minusMinutes(15);
        List<EscrowTransaction> staleTransactions = transactionRepository.findByStatusAndCreatedAtBefore(
                EscrowTransaction.TransactionStatus.PENDING, fifteenMinsAgo);

        if (!staleTransactions.isEmpty()) {
            log.info("Found {} stale pending transactions. Marking as FAILED.", staleTransactions.size());
            for (EscrowTransaction tx : staleTransactions) {
                tx.setStatus(EscrowTransaction.TransactionStatus.FAILED);
                transactionRepository.save(tx);
            }
        }
    }
}
