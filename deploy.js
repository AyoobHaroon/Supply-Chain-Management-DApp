// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("========================================");
  console.log("Supply Chain Management DApp Deployment");
  console.log("Student: Ayoob Haroon (20I-0777)");
  console.log("========================================\n");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "MATIC\n");

  // Deploy the contract
  console.log("Deploying AyoobHaroon_supplychain contract...");
  const SupplyChain = await hre.ethers.getContractFactory("AyoobHaroon_supplychain");
  const supplyChain = await SupplyChain.deploy();
  
  await supplyChain.waitForDeployment();
  const contractAddress = await supplyChain.getAddress();
  
  console.log("✅ Contract deployed successfully!");
  console.log("Contract Address:", contractAddress);
  console.log("Transaction Hash:", supplyChain.deploymentTransaction().hash);
  console.log("Block Number:", supplyChain.deploymentTransaction().blockNumber);
  
  // Verify contract information
  console.log("\n========================================");
  console.log("Contract Information:");
  console.log("========================================");
  const studentName = await supplyChain.STUDENT_NAME();
  const rollNo = await supplyChain.ROLL_NO();
  console.log("Student Name:", studentName);
  console.log("Roll Number:", rollNo);
  console.log("Admin Address:", await supplyChain.admin());
  
  // Wait for block confirmations
  console.log("\nWaiting for block confirmations...");
  await supplyChain.deploymentTransaction().wait(5);
  console.log("✅ Confirmed!\n");

  // Save deployment information
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    transactionHash: supplyChain.deploymentTransaction().hash,
    deployer: deployer.address,
    studentName: studentName,
    rollNo: rollNo,
    timestamp: new Date().toISOString(),
    blockNumber: supplyChain.deploymentTransaction().blockNumber
  };

  const deploymentPath = './frontend/src/deployment.json';
  fs.mkdirSync('./frontend/src', { recursive: true });
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("📄 Deployment info saved to:", deploymentPath);

  // Verification instructions
  console.log("\n========================================");
  console.log("Next Steps:");
  console.log("========================================");
  console.log("1. Verify contract on PolygonScan:");
  console.log(`   npx hardhat verify --network ${hre.network.name} ${contractAddress}`);
  console.log("\n2. View on Amoy PolygonScan:");
  console.log(`   https://amoy.polygonscan.com/address/${contractAddress}`);
  console.log("\n3. Update frontend with contract address");
  console.log("\n4. Test the DApp with different roles\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });