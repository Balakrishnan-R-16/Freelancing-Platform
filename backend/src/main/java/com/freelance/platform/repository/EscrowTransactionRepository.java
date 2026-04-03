package com.freelance.platform.repository;

import com.freelance.platform.entity.EscrowTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EscrowTransactionRepository extends JpaRepository<EscrowTransaction, Long> {
    List<EscrowTransaction> findByStatusAndCreatedAtBefore(EscrowTransaction.TransactionStatus status, LocalDateTime dateTime);
    List<EscrowTransaction> findByContractId(Long contractId);
    Optional<EscrowTransaction> findByRazorpayOrderId(String orderId);
}
