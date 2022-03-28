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
    TOTAL_SUPPLY,
    RECIPIENT_ADDRESS,
    ADMIN_ADDRESS
} = require(param_file_path);


async function main() {

    console.log('Deploying the Paladin Token (PAL)  ...')
  
    const deployer = (await hre.ethers.getSigners())[0];
  
    const Token = await ethers.getContractFactory("PaladinToken");
  
    const token = await Token.deploy(
        TOTAL_SUPPLY,
        ADMIN_ADDRESS,
        RECIPIENT_ADDRESS
    );
    await token.deployed();
  
    console.log('Paladin Token (PAL) : ')
    console.log(token.address)
  
    await token.deployTransaction.wait(5);
  
    await hre.run("verify:verify", {
      address: token.address,
      constructorArguments: [
        TOTAL_SUPPLY,
        ADMIN_ADDRESS,
        RECIPIENT_ADDRESS
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