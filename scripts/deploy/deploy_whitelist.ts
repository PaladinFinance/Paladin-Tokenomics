export { };
const hre = require("hardhat");

const ethers = hre.ethers;

const network = hre.network.name;

const params_path = () => {
  if (network === 'kovan') {
    return '../utils/kovan_params'
  }
  else {
    return '../utils/main_params'
  }
}

const param_file_path = params_path();

const {
  ADMIN_ADDRESS
} = require(param_file_path);



async function main() {

  console.log('Deploying the SmartWallet Whitelist ...')
 
  const deployer = (await hre.ethers.getSigners())[0];
 
  const Checker = await ethers.getContractFactory("SmartWalletWhitelist");
 
  const checker = await Checker.deploy(
      ADMIN_ADDRESS
  );
  await checker.deployed();
 
  console.log('SmartWalletWhitelist : ')
  console.log(checker.address)

 
  await checker.deployTransaction.wait(30);
 
  await hre.run("verify:verify", {
    address: checker.address,
    constructorArguments: [
      ADMIN_ADDRESS
    ],
  });

}


main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });