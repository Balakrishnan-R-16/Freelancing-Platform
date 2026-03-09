// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Escrow
 * @dev Escrow smart contract for the AI-Powered Freelancing Platform.
 *      Manages secure fund transfers between employers and freelancers.
 *
 * Flow: Employer deposits → Contract holds → Employer approves work → Funds released to Freelancer
 */
contract Escrow {
    // ── State Variables ──────────────────────────────────────────
    enum State { AWAITING_DEPOSIT, FUNDED, WORK_SUBMITTED, APPROVED, COMPLETED, REFUNDED }

    struct Job {
        address payable employer;
        address payable freelancer;
        uint256 amount;
        State state;
        uint256 createdAt;
    }

    mapping(uint256 => Job) public jobs;
    uint256 public jobCounter;

    address public owner;

    // ── Events ───────────────────────────────────────────────────
    event JobCreated(uint256 indexed jobId, address employer, address freelancer, uint256 amount);
    event FundsDeposited(uint256 indexed jobId, uint256 amount);
    event WorkSubmitted(uint256 indexed jobId);
    event WorkApproved(uint256 indexed jobId);
    event PaymentReleased(uint256 indexed jobId, address freelancer, uint256 amount);
    event Refunded(uint256 indexed jobId, address employer, uint256 amount);

    // ── Modifiers ────────────────────────────────────────────────
    modifier onlyEmployer(uint256 _jobId) {
        require(msg.sender == jobs[_jobId].employer, "Only employer can call this");
        _;
    }

    modifier onlyFreelancer(uint256 _jobId) {
        require(msg.sender == jobs[_jobId].freelancer, "Only freelancer can call this");
        _;
    }

    modifier inState(uint256 _jobId, State _state) {
        require(jobs[_jobId].state == _state, "Invalid state for this action");
        _;
    }

    // ── Constructor ──────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ── Core Functions ───────────────────────────────────────────

    /**
     * @dev Create a new escrow job. Called by the employer.
     * @param _freelancer Address of the freelancer to be paid.
     */
    function createJob(address payable _freelancer) external payable returns (uint256) {
        require(_freelancer != address(0), "Invalid freelancer address");
        require(_freelancer != msg.sender, "Employer cannot be freelancer");

        uint256 jobId = jobCounter++;

        jobs[jobId] = Job({
            employer: payable(msg.sender),
            freelancer: _freelancer,
            amount: 0,
            state: State.AWAITING_DEPOSIT,
            createdAt: block.timestamp
        });

        emit JobCreated(jobId, msg.sender, _freelancer, 0);

        // If ETH was sent with the creation, treat it as a deposit
        if (msg.value > 0) {
            jobs[jobId].amount = msg.value;
            jobs[jobId].state = State.FUNDED;
            emit FundsDeposited(jobId, msg.value);
        }

        return jobId;
    }

    /**
     * @dev Employer deposits funds into escrow for a specific job.
     * @param _jobId The ID of the job to fund.
     */
    function deposit(uint256 _jobId) 
        external 
        payable 
        onlyEmployer(_jobId) 
        inState(_jobId, State.AWAITING_DEPOSIT) 
    {
        require(msg.value > 0, "Must deposit a positive amount");

        jobs[_jobId].amount = msg.value;
        jobs[_jobId].state = State.FUNDED;

        emit FundsDeposited(_jobId, msg.value);
    }

    /**
     * @dev Freelancer marks the work as submitted.
     * @param _jobId The ID of the completed job.
     */
    function submitWork(uint256 _jobId) 
        external 
        onlyFreelancer(_jobId) 
        inState(_jobId, State.FUNDED) 
    {
        jobs[_jobId].state = State.WORK_SUBMITTED;
        emit WorkSubmitted(_jobId);
    }

    /**
     * @dev Employer approves the submitted work.
     * @param _jobId The ID of the job to approve.
     */
    function approveWork(uint256 _jobId) 
        external 
        onlyEmployer(_jobId) 
        inState(_jobId, State.WORK_SUBMITTED) 
    {
        jobs[_jobId].state = State.APPROVED;
        emit WorkApproved(_jobId);
    }

    /**
     * @dev Release escrowed funds to the freelancer. Called after approval.
     * @param _jobId The ID of the job.
     */
    function releasePayment(uint256 _jobId) 
        external 
        onlyEmployer(_jobId) 
        inState(_jobId, State.APPROVED) 
    {
        Job storage job = jobs[_jobId];
        uint256 payment = job.amount;

        job.state = State.COMPLETED;
        job.amount = 0;

        (bool success, ) = job.freelancer.call{value: payment}("");
        require(success, "Payment transfer failed");

        emit PaymentReleased(_jobId, job.freelancer, payment);
    }

    /**
     * @dev Refund the employer. Only allowed before work is approved.
     * @param _jobId The ID of the job.
     */
    function refund(uint256 _jobId) 
        external 
        onlyEmployer(_jobId) 
    {
        Job storage job = jobs[_jobId];
        require(
            job.state == State.FUNDED || job.state == State.WORK_SUBMITTED,
            "Cannot refund in current state"
        );

        uint256 refundAmount = job.amount;
        job.state = State.REFUNDED;
        job.amount = 0;

        (bool success, ) = job.employer.call{value: refundAmount}("");
        require(success, "Refund transfer failed");

        emit Refunded(_jobId, job.employer, refundAmount);
    }

    // ── View Functions ───────────────────────────────────────────

    /**
     * @dev Get the details of a job.
     */
    function getJob(uint256 _jobId) external view returns (
        address employer,
        address freelancer,
        uint256 amount,
        State state,
        uint256 createdAt
    ) {
        Job storage job = jobs[_jobId];
        return (job.employer, job.freelancer, job.amount, job.state, job.createdAt);
    }

    /**
     * @dev Get the contract's ETH balance.
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
