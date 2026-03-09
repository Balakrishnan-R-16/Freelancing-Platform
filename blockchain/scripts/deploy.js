const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying Escrow contract...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy();
    await escrow.waitForDeployment();

    const address = await escrow.getAddress();
    console.log("✅ Escrow contract deployed to:", address);
    console.log("\nSave this address in your .env file as ESCROW_CONTRACT_ADDRESS");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
