package com.freelance.platform.repository;

import com.freelance.platform.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ContractRepository extends JpaRepository<Contract, Long> {
    List<Contract> findByEmployerId(Long employerId);
    List<Contract> findByFreelancerId(Long freelancerId);
    long countByStatus(Contract.ContractStatus status);
}
