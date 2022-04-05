const hre = require("hardhat");
import { ethers, waffle } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { PaladinToken } from "../typechain/PaladinToken";
import { HolyPaladinToken } from "../typechain/HolyPaladinToken";
import { SmartWalletWhitelist } from "../typechain/SmartWalletWhitelist";
import { MockLocker } from "../typechain/MockLocker";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractFactory } from "@ethersproject/contracts";
import { advanceTime } from "./utils/utils";

chai.use(solidity);
const { expect } = chai;


const mineBlocks = async (n: number): Promise<any> => {
    for (let i = 0; i < n; i++) {
        await ethers.provider.send("evm_mine", [])
    }
    return Promise.resolve()
}

let tokenFactory: ContractFactory
let hPAL_Factory: ContractFactory
let checkerFactory: ContractFactory
let mockLockerFactory: ContractFactory

const mint_amount = ethers.utils.parseEther('10000000') // 10 M tokens

const startDropPerSecond = ethers.utils.parseEther('0.0005')
const endDropPerSecond = ethers.utils.parseEther('0.00001')

const dropDecreaseDuration = 63115200

const baseLockBonusRatio = ethers.utils.parseEther('1')
const minLockBonusRatio = ethers.utils.parseEther('2')
const maxLockBonusRatio = ethers.utils.parseEther('6')

describe('HolyPaladinToken contract tests - Admin', () => {
    let deployer: SignerWithAddress
    let admin: SignerWithAddress
    let recipient: SignerWithAddress
    let mockRewardsVault: SignerWithAddress
    let mockSecondaryChecker: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let newAdmin: SignerWithAddress

    let token: PaladinToken

    let hPAL: HolyPaladinToken

    let checker: SmartWalletWhitelist

    let locker: MockLocker

    before(async () => {
        tokenFactory = await ethers.getContractFactory("PaladinToken");
        hPAL_Factory = await ethers.getContractFactory("HolyPaladinToken");
        checkerFactory = await ethers.getContractFactory("SmartWalletWhitelist");
        mockLockerFactory = await ethers.getContractFactory("MockLocker");
    })


    beforeEach(async () => {
        [deployer, admin, newAdmin, recipient, mockRewardsVault, mockSecondaryChecker, user1, user2] = await ethers.getSigners();

        token = (await tokenFactory.connect(deployer).deploy(mint_amount, admin.address, recipient.address)) as PaladinToken;
        await token.deployed();

        await token.connect(admin).setTransfersAllowed(true);

        hPAL = (await hPAL_Factory.connect(deployer).deploy(
            token.address,
            admin.address,
            mockRewardsVault.address,
            ethers.constants.AddressZero,
            startDropPerSecond,
            endDropPerSecond,
            dropDecreaseDuration,
            baseLockBonusRatio,
            minLockBonusRatio,
            maxLockBonusRatio
        )) as HolyPaladinToken;
        await hPAL.deployed();

        checker = (await checkerFactory.connect(deployer).deploy(admin.address)) as SmartWalletWhitelist;
        await checker.deployed();

        locker = (await mockLockerFactory.connect(deployer).deploy(token.address, hPAL.address)) as MockLocker;
        await locker.deployed();
    });


    it(' should be deployed & have correct parameters', async () => {
        expect(hPAL.address).to.properAddress

        expect(await hPAL.pal()).to.be.eq(token.address)
        expect(await hPAL.emergency()).to.be.false
        
        expect(await hPAL.smartWalletChecker()).to.be.eq(ethers.constants.AddressZero)
        expect(await hPAL.futureSmartWalletChecker()).to.be.eq(ethers.constants.AddressZero)
        

        expect(checker.address).to.properAddress

        expect(await checker.admin()).to.be.eq(admin.address)
        expect(await checker.future_admin()).to.be.eq(ethers.constants.AddressZero)
        expect(await checker.checker()).to.be.eq(ethers.constants.AddressZero)
        expect(await checker.future_checker()).to.be.eq(ethers.constants.AddressZero)


        expect(await checker.wallets(locker.address)).to.be.false

    });

    describe('HolyPaladinToken - Commit & Apply Checker', async () => {

        it(' should set the correct future checker', async () => {

            expect(await hPAL.futureSmartWalletChecker()).to.be.eq(ethers.constants.AddressZero)

            await hPAL.connect(admin).commitSmartWalletChecker(checker.address)

            expect(await hPAL.futureSmartWalletChecker()).to.be.eq(checker.address)

        });

        it(' should update the correct new checker', async () => {

            await hPAL.connect(admin).commitSmartWalletChecker(checker.address)

            expect(await hPAL.smartWalletChecker()).to.be.eq(ethers.constants.AddressZero)

            await hPAL.connect(admin).applySmartWalletChecker()

            expect(await hPAL.smartWalletChecker()).to.be.eq(checker.address)

        });

        it(' should allow to set future checker as address 0', async () => {

            await hPAL.connect(admin).commitSmartWalletChecker(checker.address)

            expect(await hPAL.futureSmartWalletChecker()).to.be.eq(checker.address)

            await hPAL.connect(admin).applySmartWalletChecker()

            expect(await hPAL.smartWalletChecker()).to.be.eq(checker.address)

            expect(await hPAL.futureSmartWalletChecker()).to.be.eq(checker.address)

            await hPAL.connect(admin).commitSmartWalletChecker(ethers.constants.AddressZero)

            expect(await hPAL.futureSmartWalletChecker()).to.be.eq(ethers.constants.AddressZero)

        });

        it(' should allow to reset checker to address 0', async () => {

            await hPAL.connect(admin).commitSmartWalletChecker(checker.address)

            expect(await hPAL.smartWalletChecker()).to.be.eq(ethers.constants.AddressZero)

            await hPAL.connect(admin).applySmartWalletChecker()

            expect(await hPAL.smartWalletChecker()).to.be.eq(checker.address)

            await hPAL.connect(admin).commitSmartWalletChecker(ethers.constants.AddressZero)

            await hPAL.connect(admin).applySmartWalletChecker()

            expect(await hPAL.smartWalletChecker()).to.be.eq(ethers.constants.AddressZero)

        });

        it(' should only be callable by admin', async () => {

            await expect(
                hPAL.connect(user1).commitSmartWalletChecker(checker.address)
            ).to.be.revertedWith('Ownable: caller is not the owner')

            await expect(
                hPAL.connect(user1).applySmartWalletChecker()
            ).to.be.revertedWith('Ownable: caller is not the owner')

        });

    });


    describe('SmartWalletWhitelist - Approve & Revoke wallets', async () => {

        it(' should approve the wallet (& emit the correct event)', async () => {

            expect(await checker.wallets(locker.address)).to.be.false

            const approval_tx = await checker.connect(admin).approveWallet(locker.address)

            await expect(approval_tx)
                .to.emit(checker, 'ApproveWallet')
                .withArgs(locker.address);

            expect(await checker.wallets(locker.address)).to.be.true

        });

        it(' should not change previous approved wallets', async () => {

            await checker.connect(admin).approveWallet(locker.address)

            expect(await checker.wallets(locker.address)).to.be.true
            expect(await checker.wallets(mockRewardsVault.address)).to.be.false

            await checker.connect(admin).approveWallet(mockRewardsVault.address)

            expect(await checker.wallets(locker.address)).to.be.true
            expect(await checker.wallets(mockRewardsVault.address)).to.be.true

        });

        it(' should revoke wallet approval (& emit the correct Event)', async () => {

            await checker.connect(admin).approveWallet(locker.address)

            expect(await checker.wallets(locker.address)).to.be.true

            const revoke_tx = await checker.connect(admin).revokeWallet(locker.address)

            await expect(revoke_tx)
                .to.emit(checker, 'RevokeWallet')
                .withArgs(locker.address);

            expect(await checker.wallets(locker.address)).to.be.false

        });

        it(' should not revoke other wallets approval', async () => {

            await checker.connect(admin).approveWallet(locker.address)
            await checker.connect(admin).approveWallet(mockRewardsVault.address)

            expect(await checker.wallets(locker.address)).to.be.true
            expect(await checker.wallets(mockRewardsVault.address)).to.be.true

            await checker.connect(admin).revokeWallet(locker.address)

            expect(await checker.wallets(locker.address)).to.be.false
            expect(await checker.wallets(mockRewardsVault.address)).to.be.true

        });

        it(' should only be callable by admin', async () => {

            await expect(
                checker.connect(user1).approveWallet(locker.address)
            ).to.be.revertedWith('!admin')

            await expect(
                checker.connect(user1).revokeWallet(locker.address)
            ).to.be.revertedWith('!admin')

        });

    });


    describe('HolyPaladinToken - Checker not set', async () => {

        const stake_amount = ethers.utils.parseEther('1000')

        beforeEach(async () => {

            await token.connect(recipient).transfer(user1.address, ethers.utils.parseEther('10000'))

            await token.connect(user1).approve(locker.address, ethers.utils.parseEther('10000'))

            await locker.connect(user1).stakeFunds(stake_amount)

        });

        it(' should not block contract to lock', async () => {

            const tx = await locker.connect(user1).tryLock()

            const tx_block = (await tx).blockNumber
            const tx_timestamp = (await ethers.provider.getBlock(tx_block || 0)).timestamp

            const contract_lock = await hPAL.getUserLock(locker.address)

            expect(contract_lock.amount).to.be.eq(stake_amount)
            expect(contract_lock.startTimestamp).to.be.eq(tx_timestamp)
            expect(contract_lock.duration).to.be.eq(31557600)
            expect(contract_lock.fromBlock).to.be.eq(tx_block)

        });

        it(' should not block contract to increase', async () => {

            await locker.connect(user1).tryLock()

            const contract_previous_lock = await hPAL.getUserLock(locker.address)

            const tx = await locker.connect(user1).tryIncreaseLock(ethers.utils.parseEther('500'))

            const tx_block = (await tx).blockNumber
            const tx_timestamp = (await ethers.provider.getBlock(tx_block || 0)).timestamp

            const contract_lock = await hPAL.getUserLock(locker.address)

            expect(contract_lock.amount).to.be.eq(stake_amount.add(ethers.utils.parseEther('500')))
            expect(contract_lock.startTimestamp).to.be.eq(contract_previous_lock.startTimestamp)
            expect(contract_lock.duration).to.be.eq(31557600)
            expect(contract_lock.fromBlock).to.be.eq(tx_block)

            const tx2 = await locker.connect(user1).tryIncreaseLockDuration()

            const tx2_block = (await tx2).blockNumber
            const tx2_timestamp = (await ethers.provider.getBlock(tx2_block || 0)).timestamp

            const contract_lock2 = await hPAL.getUserLock(locker.address)

            expect(contract_lock2.amount).to.be.eq(stake_amount.add(ethers.utils.parseEther('500')))
            expect(contract_lock2.startTimestamp).to.be.eq(tx2_timestamp)
            expect(contract_lock2.duration).to.be.eq(31558100)
            expect(contract_lock2.fromBlock).to.be.eq(tx2_block)

        });

        it(' should not block contract to stake and lock', async () => {

            const tx = await locker.connect(user1).tryStakeAndLock(stake_amount)

            const tx_block = (await tx).blockNumber
            const tx_timestamp = (await ethers.provider.getBlock(tx_block || 0)).timestamp

            const contract_lock = await hPAL.getUserLock(locker.address)

            expect(contract_lock.amount).to.be.eq(stake_amount)
            expect(contract_lock.startTimestamp).to.be.eq(tx_timestamp)
            expect(contract_lock.duration).to.be.eq(31557600)
            expect(contract_lock.fromBlock).to.be.eq(tx_block)

        });

        it(' should not block contract to stake and increase lock', async () => {

            await locker.connect(user1).tryLock()

            const contract_previous_lock = await hPAL.getUserLock(locker.address)

            const tx = await locker.connect(user1).tryStakeAndIncreaseLock(ethers.utils.parseEther('500'))

            const tx_block = (await tx).blockNumber
            const tx_timestamp = (await ethers.provider.getBlock(tx_block || 0)).timestamp

            const contract_lock = await hPAL.getUserLock(locker.address)

            expect(contract_lock.amount).to.be.eq(stake_amount.add(ethers.utils.parseEther('500')))
            expect(contract_lock.startTimestamp).to.be.eq(contract_previous_lock.startTimestamp)
            expect(contract_lock.duration).to.be.eq(31557600)
            expect(contract_lock.fromBlock).to.be.eq(tx_block)

        });

    });


    describe('HolyPaladinToken - Checker set', async () => {

        const stake_amount = ethers.utils.parseEther('1000')

        beforeEach(async () => {

            await token.connect(recipient).transfer(user1.address, ethers.utils.parseEther('10000'))

            await token.connect(user1).approve(locker.address, ethers.utils.parseEther('10000'))

            await hPAL.connect(admin).commitSmartWalletChecker(checker.address)

            await hPAL.connect(admin).applySmartWalletChecker()

            await locker.connect(user1).stakeFunds(stake_amount)

        });

        it(' should block smart contract that is not allowed to lock', async () => {

            await expect(
                locker.connect(user1).tryLock()
            ).to.be.revertedWith('ContractNotAllowed')

            await expect(
                locker.connect(user1).tryStakeAndLock(stake_amount)
            ).to.be.revertedWith('ContractNotAllowed')

            await expect(
                locker.connect(user1).tryIncreaseLock(ethers.utils.parseEther('500'))
            ).to.be.revertedWith('ContractNotAllowed')

            await expect(
                locker.connect(user1).tryIncreaseLockDuration()
            ).to.be.revertedWith('ContractNotAllowed')

            await expect(
                locker.connect(user1).tryStakeAndIncreaseLock(ethers.utils.parseEther('500'))
            ).to.be.revertedWith('ContractNotAllowed')

        });

        it(' should allow an approved contract to lock', async () => {

            await checker.connect(admin).approveWallet(locker.address)

            const tx = await locker.connect(user1).tryLock()

            const tx_block = (await tx).blockNumber
            const tx_timestamp = (await ethers.provider.getBlock(tx_block || 0)).timestamp

            const contract_lock = await hPAL.getUserLock(locker.address)

            expect(contract_lock.amount).to.be.eq(stake_amount)
            expect(contract_lock.startTimestamp).to.be.eq(tx_timestamp)
            expect(contract_lock.duration).to.be.eq(31557600)
            expect(contract_lock.fromBlock).to.be.eq(tx_block)

            const tx2 = await locker.connect(user1).tryIncreaseLock(ethers.utils.parseEther('500'))

            const tx2_block = (await tx2).blockNumber
            const tx2_timestamp = (await ethers.provider.getBlock(tx2_block || 0)).timestamp

            const contract_lock2 = await hPAL.getUserLock(locker.address)

            expect(contract_lock2.amount).to.be.eq(stake_amount.add(ethers.utils.parseEther('500')))
            expect(contract_lock2.startTimestamp).to.be.eq(tx_timestamp)
            expect(contract_lock2.duration).to.be.eq(31557600)
            expect(contract_lock2.fromBlock).to.be.eq(tx2_block)

            const tx3 = await locker.connect(user1).tryIncreaseLockDuration()

            const tx3_block = (await tx3).blockNumber
            const tx3_timestamp = (await ethers.provider.getBlock(tx3_block || 0)).timestamp

            const contract_lock3 = await hPAL.getUserLock(locker.address)

            expect(contract_lock3.amount).to.be.eq(stake_amount.add(ethers.utils.parseEther('500')))
            expect(contract_lock3.startTimestamp).to.be.eq(tx3_timestamp)
            expect(contract_lock3.duration).to.be.eq(31558100)
            expect(contract_lock3.fromBlock).to.be.eq(tx3_block)

        });

        it(' should not block an user to lock', async () => {

            const lock_amount = ethers.utils.parseEther('700')

            const lock_duration = 31557600

            await token.connect(user1).approve(hPAL.address, stake_amount)

            await hPAL.connect(user1).stake(stake_amount)

            const lock_tx = await hPAL.connect(user1).lock(lock_amount, lock_duration)

            const current_totalLocked = await hPAL.currentTotalLocked()

            const tx_block = (await lock_tx).blockNumber
            const tx_timestamp = (await ethers.provider.getBlock(tx_block || 0)).timestamp

            await expect(lock_tx)
                .to.emit(hPAL, 'Lock')
                .withArgs(user1.address, lock_amount, tx_timestamp, lock_duration, current_totalLocked);

            const user_lock = await hPAL.getUserLock(user1.address)

            expect(user_lock.amount).to.be.eq(lock_amount)
            expect(user_lock.startTimestamp).to.be.eq(tx_timestamp)
            expect(user_lock.duration).to.be.eq(lock_duration)
            expect(user_lock.fromBlock).to.be.eq(tx_block)

        });

    });


    describe('HolyPaladinToken - Checker not set, then set', async () => {

        const stake_amount = ethers.utils.parseEther('1000')

        beforeEach(async () => {

            await token.connect(recipient).transfer(user1.address, ethers.utils.parseEther('10000'))

            await token.connect(user1).approve(locker.address, ethers.utils.parseEther('10000'))

            await locker.connect(user1).stakeFunds(stake_amount)

        });

        it(' should not allow the contract to lock after checker was set', async () => {

            const tx = await locker.connect(user1).tryLock()

            const tx_block = (await tx).blockNumber
            const tx_timestamp = (await ethers.provider.getBlock(tx_block || 0)).timestamp

            const contract_lock = await hPAL.getUserLock(locker.address)

            expect(contract_lock.amount).to.be.eq(stake_amount)
            expect(contract_lock.startTimestamp).to.be.eq(tx_timestamp)
            expect(contract_lock.duration).to.be.eq(31557600)
            expect(contract_lock.fromBlock).to.be.eq(tx_block)

            await hPAL.connect(admin).commitSmartWalletChecker(checker.address)

            await hPAL.connect(admin).applySmartWalletChecker()

            await expect(
                locker.connect(user1).tryLock()
            ).to.be.revertedWith('ContractNotAllowed')

            await expect(
                locker.connect(user1).tryStakeAndLock(stake_amount)
            ).to.be.revertedWith('ContractNotAllowed')

            await expect(
                locker.connect(user1).tryIncreaseLock(ethers.utils.parseEther('500'))
            ).to.be.revertedWith('ContractNotAllowed')

            await expect(
                locker.connect(user1).tryIncreaseLockDuration()
            ).to.be.revertedWith('ContractNotAllowed')

            await expect(
                locker.connect(user1).tryStakeAndIncreaseLock(ethers.utils.parseEther('500'))
            ).to.be.revertedWith('ContractNotAllowed')

        });

        it(' should allow the approved contract to lock after checker was set', async () => {

            const tx = await locker.connect(user1).tryLock()

            const tx_block = (await tx).blockNumber
            const tx_timestamp = (await ethers.provider.getBlock(tx_block || 0)).timestamp

            const contract_lock = await hPAL.getUserLock(locker.address)

            expect(contract_lock.amount).to.be.eq(stake_amount)
            expect(contract_lock.startTimestamp).to.be.eq(tx_timestamp)
            expect(contract_lock.duration).to.be.eq(31557600)
            expect(contract_lock.fromBlock).to.be.eq(tx_block)

            await hPAL.connect(admin).commitSmartWalletChecker(checker.address)

            await hPAL.connect(admin).applySmartWalletChecker()

            await checker.connect(admin).approveWallet(locker.address)

            const tx2 = await locker.connect(user1).tryIncreaseLock(ethers.utils.parseEther('500'))

            const tx2_block = (await tx2).blockNumber
            const tx2_timestamp = (await ethers.provider.getBlock(tx2_block || 0)).timestamp

            const contract_lock2 = await hPAL.getUserLock(locker.address)

            expect(contract_lock2.amount).to.be.eq(stake_amount.add(ethers.utils.parseEther('500')))
            expect(contract_lock2.startTimestamp).to.be.eq(tx_timestamp)
            expect(contract_lock2.duration).to.be.eq(31557600)
            expect(contract_lock2.fromBlock).to.be.eq(tx2_block)

            const tx3 = await locker.connect(user1).tryIncreaseLockDuration()

            const tx3_block = (await tx3).blockNumber
            const tx3_timestamp = (await ethers.provider.getBlock(tx3_block || 0)).timestamp

            const contract_lock3 = await hPAL.getUserLock(locker.address)

            expect(contract_lock3.amount).to.be.eq(stake_amount.add(ethers.utils.parseEther('500')))
            expect(contract_lock3.startTimestamp).to.be.eq(tx3_timestamp)
            expect(contract_lock3.duration).to.be.eq(31558100)
            expect(contract_lock3.fromBlock).to.be.eq(tx3_block)

        });

    });


    describe('HolyPaladinToken - Check set, then removed', async () => {

        const stake_amount = ethers.utils.parseEther('1000')

        beforeEach(async () => {

            await token.connect(recipient).transfer(user1.address, ethers.utils.parseEther('10000'))

            await token.connect(user1).approve(locker.address, ethers.utils.parseEther('10000'))

            await hPAL.connect(admin).commitSmartWalletChecker(checker.address)

            await hPAL.connect(admin).applySmartWalletChecker()

            await locker.connect(user1).stakeFunds(stake_amount)

        });

        it(' should allow the smart contract to lock after the checker was removed', async () => {

            await expect(
                locker.connect(user1).tryLock()
            ).to.be.revertedWith('ContractNotAllowed')

            await expect(
                locker.connect(user1).tryStakeAndLock(stake_amount)
            ).to.be.revertedWith('ContractNotAllowed')

            await expect(
                locker.connect(user1).tryIncreaseLock(ethers.utils.parseEther('500'))
            ).to.be.revertedWith('ContractNotAllowed')

            await expect(
                locker.connect(user1).tryIncreaseLockDuration()
            ).to.be.revertedWith('ContractNotAllowed')

            await expect(
                locker.connect(user1).tryStakeAndIncreaseLock(ethers.utils.parseEther('500'))
            ).to.be.revertedWith('ContractNotAllowed')

            await hPAL.connect(admin).commitSmartWalletChecker(ethers.constants.AddressZero)

            await hPAL.connect(admin).applySmartWalletChecker()

            const tx = await locker.connect(user1).tryLock()

            const tx_block = (await tx).blockNumber
            const tx_timestamp = (await ethers.provider.getBlock(tx_block || 0)).timestamp

            const contract_lock = await hPAL.getUserLock(locker.address)

            expect(contract_lock.amount).to.be.eq(stake_amount)
            expect(contract_lock.startTimestamp).to.be.eq(tx_timestamp)
            expect(contract_lock.duration).to.be.eq(31557600)
            expect(contract_lock.fromBlock).to.be.eq(tx_block)

            const tx2 = await locker.connect(user1).tryIncreaseLock(ethers.utils.parseEther('500'))

            const tx2_block = (await tx2).blockNumber
            const tx2_timestamp = (await ethers.provider.getBlock(tx2_block || 0)).timestamp

            const contract_lock2 = await hPAL.getUserLock(locker.address)

            expect(contract_lock2.amount).to.be.eq(stake_amount.add(ethers.utils.parseEther('500')))
            expect(contract_lock2.startTimestamp).to.be.eq(tx_timestamp)
            expect(contract_lock2.duration).to.be.eq(31557600)
            expect(contract_lock2.fromBlock).to.be.eq(tx2_block)

        });

    });


    describe('SmartWalletWhitelist - Commit & Apply admin', async () => {

        it(' should commit the correct new admin', async () => {

            expect(await checker.future_admin()).to.be.eq(ethers.constants.AddressZero)

            await checker.connect(admin).commitAdmin(newAdmin.address)

            expect(await checker.future_admin()).to.be.eq(newAdmin.address)

        });

        it(' should apply the new admin correctly', async () => {

            await checker.connect(admin).commitAdmin(newAdmin.address)

            expect(await checker.admin()).to.be.eq(admin.address)

            await checker.connect(admin).applyAdmin()

            expect(await checker.admin()).to.be.eq(newAdmin.address)

            await expect(
                checker.connect(admin).commitAdmin(admin.address)
            ).to.be.revertedWith('!admin')

        });

        it(' should fail to apply if future admin is not set', async () => {

            await expect(
                checker.connect(admin).applyAdmin()
            ).to.be.revertedWith('admin not set')

        });

        it(' should only be callable by current admin', async () => {

            await expect(
                checker.connect(user1).commitAdmin(newAdmin.address)
            ).to.be.revertedWith('!admin')

            await expect(
                checker.connect(user1).applyAdmin()
            ).to.be.revertedWith('!admin')

        });

    });


    describe('SmartWalletWhitelist - Commit & Apply checker', async () => {

        it(' should set the correct future checker', async () => {

            expect(await checker.future_checker()).to.be.eq(ethers.constants.AddressZero)

            await checker.connect(admin).commitSetChecker(mockSecondaryChecker.address)

            expect(await checker.future_checker()).to.be.eq(mockSecondaryChecker.address)

        });

        it(' should apply the new checker correctly', async () => {

            await checker.connect(admin).commitSetChecker(mockSecondaryChecker.address)

            expect(await checker.checker()).to.be.eq(ethers.constants.AddressZero)

            await checker.connect(admin).applySetChecker()

            expect(await checker.checker()).to.be.eq(mockSecondaryChecker.address)

        });

        it(' should allow to set the future checker to address 0', async () => {

            expect(await checker.future_checker()).to.be.eq(ethers.constants.AddressZero)

            await checker.connect(admin).commitSetChecker(mockSecondaryChecker.address)

            expect(await checker.future_checker()).to.be.eq(mockSecondaryChecker.address)

            await checker.connect(admin).commitSetChecker(ethers.constants.AddressZero)

            expect(await checker.future_checker()).to.be.eq(ethers.constants.AddressZero)

        });

        it(' should remove the checker (reset to address 0)', async () => {

            await checker.connect(admin).commitSetChecker(mockSecondaryChecker.address)

            expect(await checker.checker()).to.be.eq(ethers.constants.AddressZero)

            await checker.connect(admin).applySetChecker()

            expect(await checker.checker()).to.be.eq(mockSecondaryChecker.address)

            await checker.connect(admin).commitSetChecker(ethers.constants.AddressZero)

            await checker.connect(admin).applySetChecker()

            expect(await checker.checker()).to.be.eq(ethers.constants.AddressZero)

        });

        it(' should only be callable by admin', async () => {

            await expect(
                checker.connect(user1).commitSetChecker(mockSecondaryChecker.address)
            ).to.be.revertedWith('!admin')

            await expect(
                checker.connect(user1).applySetChecker()
            ).to.be.revertedWith('!admin')

        });

        it(' should use the set checker for extra check', async () => {

            let otherChecker = (await checkerFactory.connect(deployer).deploy(admin.address)) as SmartWalletWhitelist;
            await otherChecker.deployed();

            await otherChecker.connect(admin).approveWallet(locker.address)

            await checker.connect(admin).commitSetChecker(otherChecker.address)

            await checker.connect(admin).applySetChecker()

            const result = await checker.check(locker.address)

            expect(result).to.be.true

        });

    });

});