package com.freelance.platform.repository;

import com.freelance.platform.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findByStatus(Job.JobStatus status);
    List<Job> findByEmployerId(Long employerId);
    long countByStatus(Job.JobStatus status);

    @Query("SELECT j FROM Job j WHERE j.status = 'OPEN' ORDER BY j.createdAt DESC")
    List<Job> findOpenJobs();
}
