const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Escrow Contract", function () {
    let escrow, employer, freelancer, other;

    beforeEach(async function () {
        [employer, freelancer, other] = await ethers.getSigners();
        const Escrow = await ethers.getContractFactory("Escrow");
        escrow = await Escrow.deploy();
        await escrow.waitForDeployment();
    });

    describe("Job Creation", function () {
        it("should create a job without initial deposit", async function () {
            const tx = await escrow.connect(employer).createJob(freelancer.address);
            await expect(tx).to.emit(escrow, "JobCreated");

            const job = await escrow.getJob(0);
            expect(job.employer).to.equal(employer.address);
            expect(job.freelancer).to.equal(freelancer.address);
            expect(job.state).to.equal(0); // AWAITING_DEPOSIT
        });

        it("should create a job with initial deposit", async function () {
            const depositAmount = ethers.parseEther("1.0");
            const tx = await escrow.connect(employer).createJob(freelancer.address, { value: depositAmount });

            await expect(tx).to.emit(escrow, "JobCreated");
            await expect(tx).to.emit(escrow, "FundsDeposited").withArgs(0, depositAmount);

            const job = await escrow.getJob(0);
            expect(job.amount).to.equal(depositAmount);
            expect(job.state).to.equal(1); // FUNDED
        });

        it("should reject zero address freelancer", async function () {
            await expect(
                escrow.connect(employer).createJob(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid freelancer address");
        });

        it("should reject employer as freelancer", async function () {
            await expect(
                escrow.connect(employer).createJob(employer.address)
            ).to.be.revertedWith("Employer cannot be freelancer");
        });
    });

    describe("Deposit", function () {
        beforeEach(async function () {
            await escrow.connect(employer).createJob(freelancer.address);
        });

        it("should allow employer to deposit funds", async function () {
            const amount = ethers.parseEther("2.0");
            const tx = await escrow.connect(employer).deposit(0, { value: amount });

            await expect(tx).to.emit(escrow, "FundsDeposited").withArgs(0, amount);

            const job = await escrow.getJob(0);
            expect(job.amount).to.equal(amount);
            expect(job.state).to.equal(1); // FUNDED
        });

        it("should reject deposit from non-employer", async function () {
            await expect(
                escrow.connect(freelancer).deposit(0, { value: ethers.parseEther("1.0") })
            ).to.be.revertedWith("Only employer can call this");
        });

        it("should reject zero deposit", async function () {
            await expect(
                escrow.connect(employer).deposit(0, { value: 0 })
            ).to.be.revertedWith("Must deposit a positive amount");
        });
    });

    describe("Work Submission", function () {
        beforeEach(async function () {
            await escrow.connect(employer).createJob(freelancer.address, { value: ethers.parseEther("1.0") });
        });

        it("should allow freelancer to submit work", async function () {
            const tx = await escrow.connect(freelancer).submitWork(0);
            await expect(tx).to.emit(escrow, "WorkSubmitted").withArgs(0);

            const job = await escrow.getJob(0);
            expect(job.state).to.equal(2); // WORK_SUBMITTED
        });

        it("should reject submission from non-freelancer", async function () {
            await expect(
                escrow.connect(employer).submitWork(0)
            ).to.be.revertedWith("Only freelancer can call this");
        });
    });

    describe("Work Approval & Payment Release", function () {
        beforeEach(async function () {
            await escrow.connect(employer).createJob(freelancer.address, { value: ethers.parseEther("1.0") });
            await escrow.connect(freelancer).submitWork(0);
        });

        it("should allow employer to approve work", async function () {
            const tx = await escrow.connect(employer).approveWork(0);
            await expect(tx).to.emit(escrow, "WorkApproved").withArgs(0);

            const job = await escrow.getJob(0);
            expect(job.state).to.equal(3); // APPROVED
        });

        it("should release payment to freelancer after approval", async function () {
            await escrow.connect(employer).approveWork(0);

            const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);
            const tx = await escrow.connect(employer).releasePayment(0);
            await expect(tx).to.emit(escrow, "PaymentReleased");

            const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
            expect(freelancerBalanceAfter).to.be.gt(freelancerBalanceBefore);

            const job = await escrow.getJob(0);
            expect(job.state).to.equal(4); // COMPLETED
            expect(job.amount).to.equal(0);
        });
    });

    describe("Refund", function () {
        beforeEach(async function () {
            await escrow.connect(employer).createJob(freelancer.address, { value: ethers.parseEther("1.0") });
        });

        it("should allow employer to refund from FUNDED state", async function () {
            const employerBalanceBefore = await ethers.provider.getBalance(employer.address);
            const tx = await escrow.connect(employer).refund(0);
            await expect(tx).to.emit(escrow, "Refunded");

            const job = await escrow.getJob(0);
            expect(job.state).to.equal(5); // REFUNDED
            expect(job.amount).to.equal(0);
        });

        it("should allow employer to refund from WORK_SUBMITTED state", async function () {
            await escrow.connect(freelancer).submitWork(0);
            const tx = await escrow.connect(employer).refund(0);
            await expect(tx).to.emit(escrow, "Refunded");
        });

        it("should reject refund from non-employer", async function () {
            await expect(
                escrow.connect(freelancer).refund(0)
            ).to.be.revertedWith("Only employer can call this");
        });

        it("should reject refund after approval", async function () {
            await escrow.connect(freelancer).submitWork(0);
            await escrow.connect(employer).approveWork(0);

            await expect(
                escrow.connect(employer).refund(0)
            ).to.be.revertedWith("Cannot refund in current state");
        });
    });

    describe("View Functions", function () {
        it("should return correct balance", async function () {
            await escrow.connect(employer).createJob(freelancer.address, { value: ethers.parseEther("3.0") });
            const balance = await escrow.getBalance();
            expect(balance).to.equal(ethers.parseEther("3.0"));
        });

        it("should track job counter", async function () {
            await escrow.connect(employer).createJob(freelancer.address);
            await escrow.connect(employer).createJob(freelancer.address);
            expect(await escrow.jobCounter()).to.equal(2);
        });
    });
});
