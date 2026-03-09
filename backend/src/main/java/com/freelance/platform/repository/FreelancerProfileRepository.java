package com.freelance.platform.repository;

import com.freelance.platform.entity.FreelancerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FreelancerProfileRepository extends JpaRepository<FreelancerProfile, Long> {
    Optional<FreelancerProfile> findByUserId(Long userId);
}
