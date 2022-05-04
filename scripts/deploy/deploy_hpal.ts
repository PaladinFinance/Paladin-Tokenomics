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
    PAL_ADDRESS,
    REWARD_VAULT_ADDRESS,
    ADMIN_ADDRESS,
    CHECKER_ADDRESS
} = require(param_file_path);


const startDropPerSecond = ethers.utils.parseEther('0.0380517503805175') // 100k/month
const endDropPerSecond = ethers.utils.parseEther('0.01141552511415525') // 30k/month

const dropDecreaseDuration = 63072000

const baseLockBonusRatio = ethers.utils.parseEther('1')
const minLockBonusRatio = ethers.utils.parseEther('2')
const maxLockBonusRatio = ethers.utils.parseEther('6')


async function main() {

    console.log('Deploying Holy Paladin Token ...')

    const deployer = (await hre.ethers.getSigners())[0];

    const Token = await ethers.getContractFactory("HolyPaladinToken");

    const checker_address = CHECKER_ADDRESS === "" ? ethers.constants.AddressZero : CHECKER_ADDRESS;

    const token = await Token.deploy(
        PAL_ADDRESS,
        ADMIN_ADDRESS,
        REWARD_VAULT_ADDRESS,
        checker_address,
        startDropPerSecond,
        endDropPerSecond,
        dropDecreaseDuration,
        baseLockBonusRatio,
        minLockBonusRatio,
        maxLockBonusRatio
    );
    await token.deployed();

    console.log('Holy Paladin Token : ')
    console.log(token.address)


    await token.deployTransaction.wait(30);

    await hre.run("verify:verify", {
        address: token.address,
        constructorArguments: [
            PAL_ADDRESS,
            ADMIN_ADDRESS,
            REWARD_VAULT_ADDRESS,
            checker_address,
            startDropPerSecond,
            endDropPerSecond,
            dropDecreaseDuration,
            baseLockBonusRatio,
            minLockBonusRatio,
            maxLockBonusRatio
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