package com.freelance.platform.service;

import com.freelance.platform.dto.JobRequest;
import com.freelance.platform.entity.Job;
import com.freelance.platform.entity.User;
import com.freelance.platform.repository.JobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final SseService sseService;

    public JobService(JobRepository jobRepository, SseService sseService) {
        this.jobRepository = jobRepository;
        this.sseService = sseService;
    }

    public List<Job> getAllOpenJobs() {
        return jobRepository.findOpenJobs();
    }

    public List<Job> getJobsByEmployer(Long employerId) {
        return jobRepository.findByEmployerId(employerId);
    }

    public Job getJobById(Long id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Job not found"));
    }

    @Transactional
    public Job createJob(JobRequest request, User employer) {
        Job job = Job.builder()
                .employer(employer)
                .title(request.getTitle())
                .description(request.getDescription())
                .skillsRequired(request.getSkillsRequired())
                .budget(request.getBudget())
                .durationDays(request.getDurationDays())
                .status(Job.JobStatus.OPEN)
                .build();

        Job savedJob = jobRepository.save(job);
        sseService.dispatchEvent("job", "created", savedJob);
        return savedJob;
    }

    @Transactional
    public Job updateJobStatus(Long jobId, String status, User employer) {
        Job job = getJobById(jobId);
        if (!job.getEmployer().getId().equals(employer.getId())) {
            throw new RuntimeException("Not authorized to update this job");
        }
        job.setStatus(Job.JobStatus.valueOf(status));
        Job updatedJob = jobRepository.save(job);
        sseService.dispatchEvent("job", "updated", updatedJob);
        return updatedJob;
    }

    @Transactional
    public Job updateJob(Long jobId, JobRequest request, User employer) {
        Job job = getJobById(jobId);
        if (!job.getEmployer().getId().equals(employer.getId())) {
            throw new RuntimeException("Not authorized to modify this job");
        }
        job.setTitle(request.getTitle());
        job.setDescription(request.getDescription());
        job.setSkillsRequired(request.getSkillsRequired());
        job.setBudget(request.getBudget());
        job.setDurationDays(request.getDurationDays());

        Job updatedJob = jobRepository.save(job);
        sseService.dispatchEvent("job", "updated", updatedJob);
        return updatedJob;
    }

    @Transactional
    public void deleteJob(Long jobId, User employer) {
        Job job = getJobById(jobId);
        if (!job.getEmployer().getId().equals(employer.getId())) {
            throw new RuntimeException("Not authorized to delete this job");
        }
        jobRepository.delete(job);
        sseService.dispatchEvent("job", "deleted", jobId);
    }
}
