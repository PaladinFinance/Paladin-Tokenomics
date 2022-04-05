const hre = require("hardhat");
import { ethers, waffle } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { PaladinToken } from "../typechain/PaladinToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractFactory } from "@ethersproject/contracts";
import { BigNumber } from "@ethersproject/bignumber";

chai.use(solidity);
const { expect } = chai;


const mineBlocks = async (n: number): Promise<any> => {
    for (let i = 0; i < n; i++) {
        await ethers.provider.send("evm_mine", [])
    }
    return Promise.resolve()
}

let tokenFactory: ContractFactory

const mint_amount = ethers.utils.parseEther('10000000') // 10 M tokens

describe('PaladinToken contract tests', () => {
    let deployer: SignerWithAddress
    let admin: SignerWithAddress
    let recipient: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress

    let token: PaladinToken

    before(async () => {
        tokenFactory = await ethers.getContractFactory("PaladinToken");
    })


    beforeEach(async () => {
        [deployer, admin, recipient, user1, user2] = await ethers.getSigners();

        token = (await tokenFactory.connect(deployer).deploy(mint_amount, admin.address, recipient.address)) as PaladinToken;
        await token.deployed();
    });


    it(' should be deployed & have correct parameters', async () => {
        expect(token.address).to.properAddress

        const tokenName = await token.name()
        const tokenSymbol = await token.symbol()
        const tokenDecimals = await token.decimals()

        expect(tokenName).to.be.eq("Paladin Token")
        expect(tokenSymbol).to.be.eq("PAL")
        expect(tokenDecimals).to.be.eq(18)

        expect(await token.transfersAllowed()).to.be.false

    });


    it(' should have mint the supply to the correct user', async () => {

        const tokenTotalSupply = await token.totalSupply()
        const recipientBalance = await token.balanceOf(recipient.address)

        expect(tokenTotalSupply).to.be.eq(mint_amount)
        expect(recipientBalance).to.be.eq(mint_amount)

    });


    it(' should have set the correct roles', async () => {

        const adminRole = await token.ADMIN_ROLE()
        const transferRole = await token.TRANSFER_ROLE()

        expect(await token.hasRole(adminRole, admin.address)).to.be.true
        expect(await token.hasRole(transferRole, admin.address)).to.be.true

        expect(await token.getRoleAdmin(transferRole)).to.be.eq(adminRole)

    });


    describe('transfersAllowed == false', async () => {

        const amount = ethers.utils.parseEther('100')

        it(' should block user transfers', async () => {

            await expect(
                token.connect(recipient).transfer(user1.address, amount)
            ).to.be.revertedWith('PaladinToken: caller cannot transfer')

            await token.connect(recipient).approve(user1.address, amount)

            await expect(
                token.connect(user1).transferFrom(recipient.address, user1.address, amount)
            ).to.be.revertedWith('PaladinToken: caller cannot transfer')
        });

        it(' should allow admin to make transfers', async () => {

            const oldBalance = await token.balanceOf(user1.address)

            await token.connect(recipient).approve(admin.address, amount)

            await token.connect(admin).transferFrom(recipient.address, user1.address, amount)

            const newBalance = await token.balanceOf(user1.address)

            expect(amount).to.be.eq(newBalance.sub(oldBalance))
        });

        it(' should grant TRANSFER role and allow to transfer', async () => {

            const transferRole = await token.TRANSFER_ROLE()

            await token.connect(admin).grantRole(transferRole, recipient.address);



            const oldBalance1 = await token.balanceOf(user1.address)

            await token.connect(recipient).transfer(user1.address, amount)

            const newBalance1 = await token.balanceOf(user1.address)

            expect(amount).to.be.eq(newBalance1.sub(oldBalance1))



            const oldBalance2 = await token.balanceOf(user2.address)

            await token.connect(recipient).transfer(admin.address, amount)

            await token.connect(admin).approve(recipient.address, amount)

            await token.connect(recipient).transferFrom(admin.address, user2.address, amount)

            const newBalance2 = await token.balanceOf(user2.address)

            expect(amount).to.be.eq(newBalance2.sub(oldBalance2))
        });

    });


    describe('approve', async () => {

        const allowance = ethers.utils.parseEther('150')
        const change_allowance = ethers.utils.parseEther('50')
        const over_allowance = ethers.utils.parseEther('200')

        it(' should update allowance correctly', async () => {

            await token.connect(user1).approve(user2.address, allowance)

            let newAllowance = await token.connect(user1).allowance(user1.address, user2.address)

            expect(newAllowance).to.be.eq(allowance)

        });

        it(' should increase allowance correctly', async () => {

            await token.connect(user1).approve(user2.address, allowance)

            let oldAllowance = await token.connect(user1).allowance(user1.address, user2.address)

            await token.connect(user1).increaseAllowance(user2.address, change_allowance)

            let newAllowance = await token.connect(user1).allowance(user1.address, user2.address)

            expect(newAllowance.sub(oldAllowance)).to.be.eq(change_allowance)

        });

        it(' should decrease allowance correctly', async () => {

            await token.connect(user1).approve(user2.address, allowance)

            let oldAllowance = await token.connect(user1).allowance(user1.address, user2.address)

            await token.connect(user1).decreaseAllowance(user2.address, change_allowance)

            let newAllowance = await token.connect(user1).allowance(user1.address, user2.address)

            expect(oldAllowance.sub(newAllowance)).to.be.eq(change_allowance)

        });

        it(' should emit the correct Event', async () => {

            await expect(token.connect(user1).approve(user2.address, allowance))
                .to.emit(token, 'Approval')
                .withArgs(user1.address, user2.address, allowance);

        });

        it(' should block address Zero approvals', async () => {

            await expect(
                token.connect(user1).approve(ethers.constants.AddressZero, allowance)
            ).to.be.revertedWith('ERC20: approve to the zero address')

        });

        it(' should fail to decrease allwoance under 0', async () => {

            await token.connect(user1).approve(user2.address, allowance)

            await expect(
                token.connect(user1).decreaseAllowance(user2.address, over_allowance)
            ).to.be.revertedWith('ERC20: decreased allowance below zero')

        });

    });


    describe('transfer', async () => {

        const amount = ethers.utils.parseEther('100')

        beforeEach(async () => {
            await token.connect(admin).setTransfersAllowed(true);

            await token.connect(recipient).transfer(user1.address, ethers.utils.parseEther('1000'))
        });

        it(' should transfer the amount', async () => {

            let oldBalance = await token.connect(user2).balanceOf(user2.address)

            await token.connect(user1).transfer(user2.address, amount)

            let newBalance = await token.connect(user2).balanceOf(user2.address)

            expect(amount).to.be.eq(newBalance.sub(oldBalance))

        });

        it(' should emit the correct Event', async () => {

            await expect(token.connect(user1).transfer(user2.address, amount))
                .to.emit(token, 'Transfer')
                .withArgs(user1.address, user2.address, amount);

        });

        it(' should not allow transfer if balance too low', async () => {

            await expect(
                token.connect(user2).transfer(user1.address, amount)
            ).to.be.revertedWith('ERC20: transfer amount exceeds balance')

        });

        it(' should block transfer to address Zero', async () => {

            await expect(
                token.connect(user1).transfer(ethers.constants.AddressZero, amount)
            ).to.be.revertedWith('ERC20: transfer to the zero address')

        });

        it(' should update delegation if set', async () => {

            await token.connect(user1).delegate(user2.address)

            let oldVotingPower = await token.getCurrentVotes(user2.address)

            await token.connect(user1).transfer(user2.address, amount)

            let newVotingPower = await token.getCurrentVotes(user2.address)

            expect(amount).to.be.eq(oldVotingPower.sub(newVotingPower))

        });

    });


    describe('transferFrom', async () => {

        const amount = ethers.utils.parseEther('100')
        const allowance = ethers.utils.parseEther('150')

        beforeEach(async () => {
            await token.connect(admin).setTransfersAllowed(true);

            await token.connect(recipient).transfer(user1.address, ethers.utils.parseEther('1000'));
        });

        it(' should transfer the amount', async () => {

            let oldBalance = await token.connect(user2).balanceOf(user2.address)

            await token.connect(user1).approve(user2.address, allowance)

            await token.connect(user2).transferFrom(user1.address, user2.address, amount)

            let newBalance = await token.connect(user2).balanceOf(user2.address)

            expect(amount).to.be.eq(newBalance.sub(oldBalance))

        });

        it(' should emit the correct Event', async () => {

            await token.connect(user1).approve(user2.address, allowance)

            await expect(token.connect(user2).transferFrom(user1.address, user2.address, amount))
                .to.emit(token, 'Transfer')
                .withArgs(user1.address, user2.address, amount);

        });

        it(' should update the allowance correctly', async () => {

            await token.connect(user1).approve(user2.address, allowance)

            await token.connect(user2).transferFrom(user1.address, user2.address, amount)

            let newAllowance = await token.connect(user1).allowance(user1.address, user2.address)

            expect(allowance.sub(amount)).to.be.eq(newAllowance)

        });

        it(' should not allow transfer if balance too low', async () => {

            await token.connect(user2).approve(user1.address, allowance)

            await expect(
                token.connect(user1).transferFrom(user2.address, user1.address, amount)
            ).to.be.revertedWith('ERC20: transfer amount exceeds balance')

        });

        it(' should not allow transfer if allowance too low', async () => {

            await token.connect(user1).approve(user2.address, ethers.utils.parseEther('10'))

            await expect(
                token.connect(user2).transferFrom(user1.address, user2.address, amount)
            ).to.be.revertedWith('ERC20: insufficient allowance')

        });

        it(' should not allow transfer if no allowance', async () => {

            await expect(
                token.connect(user2).transferFrom(user1.address, user2.address, amount)
            ).to.be.revertedWith('ERC20: insufficient allowance')

        });

        it(' should block transfer to/from address Zero', async () => {

            await token.connect(user1).approve(user2.address, allowance)

            await expect(
                token.connect(user2).transferFrom(user1.address, ethers.constants.AddressZero, amount)
            ).to.be.revertedWith('ERC20: transfer to the zero address')

            await expect(
                token.connect(user2).transferFrom(ethers.constants.AddressZero, user1.address, amount)
            ).to.be.revertedWith('ERC20: insufficient allowance')

        });


    });


    describe('delegate', async () => {

        const transfer_amount = ethers.utils.parseEther('100')

        beforeEach(async () => {
            await token.connect(admin).setTransfersAllowed(true);

            await token.connect(recipient).transfer(user1.address, ethers.utils.parseEther('1000'));
        });

        it(' should delegate to self', async () => {
            const userBalance = await token.balanceOf(user1.address);

            const oldDelegate = await token.delegates(user1.address);
            const oldCheckpointNb = await token.numCheckpoints(user1.address);
            const oldVotingPower = await token.getCurrentVotes(user1.address);

            expect(oldDelegate).to.be.eq(ethers.constants.AddressZero)
            expect(oldCheckpointNb).to.be.eq(0)
            expect(oldVotingPower).to.be.eq(0)

            await token.connect(user1).delegate(user1.address)

            const newDelegate = await token.delegates(user1.address);
            const newCheckpointNb = await token.numCheckpoints(user1.address);
            const newVotingPower = await token.getCurrentVotes(user1.address);

            expect(newDelegate).to.be.eq(user1.address)
            expect(newCheckpointNb).to.be.eq(1)
            expect(newVotingPower).to.be.eq(userBalance)

        });

        it(' should delegate to other address', async () => {

            const user1Balance = await token.balanceOf(user1.address);

            const oldDelegate = await token.delegates(user1.address);
            const oldCheckpointNb = await token.numCheckpoints(user2.address);
            const oldVotingPower = await token.getCurrentVotes(user2.address);

            expect(oldDelegate).to.be.eq(ethers.constants.AddressZero)
            expect(oldCheckpointNb).to.be.eq(0)
            expect(oldVotingPower).to.be.eq(0)

            await token.connect(user1).delegate(user2.address)

            const newDelegate = await token.delegates(user1.address);
            const newCheckpointNb = await token.numCheckpoints(user2.address);
            const newVotingPower = await token.getCurrentVotes(user2.address);

            expect(newDelegate).to.be.eq(user2.address)
            expect(newCheckpointNb).to.be.eq(1)
            expect(newVotingPower).to.be.eq(user1Balance)

        });

        it(' should update delegation on transfer (self-delegation)', async () => {

            await token.connect(user1).delegate(user1.address)

            const oldVotingPower = await token.getCurrentVotes(user1.address);

            await token.connect(user1).transfer(user2.address, transfer_amount)

            const newVotingPower = await token.getCurrentVotes(user1.address);

            expect(oldVotingPower.sub(newVotingPower)).to.be.eq(transfer_amount)

        });

        it(' should update delegation on transfer', async () => {

            await token.connect(user1).delegate(user2.address)

            const oldVotingPower = await token.getCurrentVotes(user2.address);
            const oldCheckpointNb = await token.numCheckpoints(user2.address);

            await token.connect(user1).transfer(recipient.address, transfer_amount)

            const newVotingPower = await token.getCurrentVotes(user2.address);
            const newCheckpointNb = await token.numCheckpoints(user2.address);

            expect(oldVotingPower.sub(newVotingPower)).to.be.eq(transfer_amount);
            expect(newCheckpointNb).to.be.gt(oldCheckpointNb);

        });

        it(' should update delegation on transferFrom (self-delegation)', async () => {

            await token.connect(user1).delegate(user1.address)

            const oldVotingPower = await token.getCurrentVotes(user1.address);

            await token.connect(user1).approve(recipient.address, transfer_amount)
            await token.connect(recipient).transferFrom(user1.address, recipient.address, transfer_amount)

            const newVotingPower = await token.getCurrentVotes(user1.address);

            expect(oldVotingPower.sub(newVotingPower)).to.be.eq(transfer_amount)

        });

        it(' should update delegation on transferFrom ', async () => {

            await token.connect(user1).delegate(user2.address)

            const oldVotingPower = await token.getCurrentVotes(user2.address);
            const oldCheckpointNb = await token.numCheckpoints(user2.address);

            await token.connect(user1).approve(recipient.address, transfer_amount)
            await token.connect(recipient).transferFrom(user1.address, recipient.address, transfer_amount)

            const newVotingPower = await token.getCurrentVotes(user2.address);
            const newCheckpointNb = await token.numCheckpoints(user2.address);

            expect(oldVotingPower.sub(newVotingPower)).to.be.eq(transfer_amount);
            expect(newCheckpointNb).to.be.gt(oldCheckpointNb);

        });

        it(' should not update delegation on receiving transfer', async () => {

            await token.connect(user2).delegate(user2.address)

            const oldVotingPower = await token.getCurrentVotes(user2.address);

            expect(oldVotingPower).to.be.eq(0)

            await token.connect(user1).transfer(user2.address, transfer_amount)

            const newVotingPower = await token.getCurrentVotes(user2.address);

            expect(newVotingPower).to.be.eq(transfer_amount)
            expect(newVotingPower).to.be.eq(await token.getCurrentVotes(user2.address))

        });

        it(' should not update delegation on transfer if delegation not set', async () => {

            const oldVotingPower = await token.getCurrentVotes(user2.address);

            expect(oldVotingPower).to.be.eq(0)

            await token.connect(user1).transfer(user2.address, transfer_amount)

            const newVotingPower = await token.getCurrentVotes(user2.address);

            expect(newVotingPower).to.be.eq(0)

        });

        it(' should cancel delegation', async () => {

            await token.connect(user1).delegate(user2.address)

            expect(await token.delegates(user1.address)).to.be.eq(user2.address)

            await token.connect(user1).delegate(ethers.constants.AddressZero)

            expect(await token.delegates(user1.address)).to.be.eq(ethers.constants.AddressZero)

        });

    });


    describe('delegateBySig', async () => {

        const chainId = hre.network.config.chainId;

        const types = {
            Delegation: [
                { name: 'delegatee', type: 'address' },
                { name: 'nonce', type: 'uint256' },
                { name: 'expiry', type: 'uint256' }
            ]
        }
        
        beforeEach(async () => {
            await token.connect(admin).setTransfersAllowed(true);

            await token.connect(recipient).transfer(user1.address, ethers.utils.parseEther('1000'));

        });

        it(' should delegate to the correct user', async () => {

            const user1Balance = await token.balanceOf(user1.address);

            const oldDelegate = await token.delegates(user1.address);
            const oldCheckpointNb = await token.numCheckpoints(user2.address);
            const oldVotingPower = await token.getCurrentVotes(user2.address);

            expect(oldDelegate).to.be.eq(ethers.constants.AddressZero)
            expect(oldCheckpointNb).to.be.eq(0)
            expect(oldVotingPower).to.be.eq(0)

            const user1_nonce = await token.nonces(user1.address);
            const expiry = BigNumber.from(10e9);

            const domain = {
                name: 'Paladin Token',
                chainId: chainId,
                verifyingContract: token.address
            }

            const delegation = { delegatee: user2.address, nonce: user1_nonce, expiry: expiry }

            const signature = await user1._signTypedData(domain, types, delegation)

            const r = '0x' + signature.substring(2).substring(0, 64);
            const s = '0x' + signature.substring(2).substring(64, 128);
            const v = '0x' + signature.substring(2).substring(128, 130);

            await token.connect(user2).delegateBySig(
                user2.address,
                user1_nonce,
                expiry,
                v,
                r,
                s
            )

            const newDelegate = await token.delegates(user1.address);
            const newCheckpointNb = await token.numCheckpoints(user2.address);
            const newVotingPower = await token.getCurrentVotes(user2.address);

            expect(newDelegate).to.be.eq(user2.address)
            expect(newCheckpointNb).to.be.eq(1)
            expect(newVotingPower).to.be.eq(user1Balance)

        });

        it(' should fail if signature invalid', async () => {

            const user1_nonce = await token.nonces(user1.address);
            const expiry = BigNumber.from(10e9);

            const domain = {
                name: 'Paladin Token',
                chainId: chainId,
                verifyingContract: token.address
            }

            const delegation = { delegatee: user2.address, nonce: user1_nonce, expiry: expiry }

            const signature = await user1._signTypedData(domain, types, delegation)

            const r = '0x' + signature.substring(2).substring(0, 64);
            const s = '0x' + signature.substring(2).substring(64, 128);
            const v = '0x' + signature.substring(2).substring(128, 130);

            await expect(token.connect(user2).delegateBySig(
                user2.address,
                user1_nonce,
                expiry,
                0,
                '0x' + ('a'.repeat(64)),
                '0x' + ('a'.repeat(64))
            )).to.be.revertedWith('PaladinToken: invalid signature')


        });

        it(' should fail if signature expired', async () => {

            const user1_nonce = await token.nonces(user1.address);
            const expiry = BigNumber.from(10e9);

            const domain = {
                name: 'Paladin Token',
                chainId: chainId,
                verifyingContract: token.address
            }

            const delegation = { delegatee: user2.address, nonce: user1_nonce, expiry: expiry }

            const signature = await user1._signTypedData(domain, types, delegation)

            const r = '0x' + signature.substring(2).substring(0, 64);
            const s = '0x' + signature.substring(2).substring(64, 128);
            const v = '0x' + signature.substring(2).substring(128, 130);

            await expect(token.connect(user2).delegateBySig(
                user2.address,
                user1_nonce,
                0,
                v,
                r,
                s
            )).to.be.revertedWith('PaladinToken: signature expired')

        });

        it(' should fail if nonce invalid', async () => {

            const user1_nonce = await token.nonces(user1.address);
            const expiry = BigNumber.from(10e9);

            const domain = {
                name: 'Paladin Token',
                chainId: chainId,
                verifyingContract: token.address
            }

            const delegation = { delegatee: user2.address, nonce: user1_nonce, expiry: expiry }

            const signature = await user1._signTypedData(domain, types, delegation)

            const r = '0x' + signature.substring(2).substring(0, 64);
            const s = '0x' + signature.substring(2).substring(64, 128);
            const v = '0x' + signature.substring(2).substring(128, 130);

            await expect(token.connect(user2).delegateBySig(
                user2.address,
                user1_nonce.add(12),
                expiry,
                v,
                r,
                s
            )).to.be.revertedWith('PaladinToken: invalid nonce')

        });

    });


    describe('getPastVotes', async () => {

        const transfer_amount = ethers.utils.parseEther('100')

        beforeEach(async () => {
            await token.connect(admin).setTransfersAllowed(true);

            await token.connect(recipient).transfer(user1.address, ethers.utils.parseEther('1000'));
            await token.connect(recipient).transfer(user2.address, ethers.utils.parseEther('1000'));
        });

        it(' should return 0 if no checkpoints', async () => {

            const currentBlock = await ethers.provider.getBlockNumber()

            const votes = await token.getPastVotes(user2.address, currentBlock - 1)

            expect(votes).to.be.eq(0)

        });

        it(' should return the correct amount of votes', async () => {

            const user1Balance = await token.balanceOf(user1.address)

            const delegate_call = await token.connect(user1).delegate(user2.address)

            const blockNumber1 = delegate_call.blockNumber || 0

            await mineBlocks(10)

            const delegate_call2 = await token.connect(user1).delegate(user1.address)

            const blockNumber2 = delegate_call2.blockNumber || 0

            await mineBlocks(10)

            const delegate_call3 = await token.connect(user1).delegate(user2.address)

            const blockNumber3 = delegate_call3.blockNumber || 0

            await mineBlocks(3)

            expect(await await token.getPastVotes(user2.address, blockNumber1 - 1)).to.be.eq(0)
            expect(await await token.getPastVotes(user2.address, blockNumber1)).to.be.eq(user1Balance)
            expect(await await token.getPastVotes(user2.address, blockNumber1 + 1)).to.be.eq(user1Balance)

            expect(await await token.getPastVotes(user2.address, blockNumber2 - 1)).to.be.eq(user1Balance)
            expect(await await token.getPastVotes(user2.address, blockNumber2)).to.be.eq(0)
            expect(await await token.getPastVotes(user2.address, blockNumber2 + 1)).to.be.eq(0)

            expect(await await token.getPastVotes(user2.address, blockNumber3 - 1)).to.be.eq(0)
            expect(await await token.getPastVotes(user2.address, blockNumber3)).to.be.eq(user1Balance)
            expect(await await token.getPastVotes(user2.address, blockNumber3 + 1)).to.be.eq(user1Balance)

        });

        it(' should return the 1st checkpoint', async () => {

            const delegate_call = await token.connect(user1).delegate(user2.address)

            const blockNumber = delegate_call.blockNumber || 0

            const nexBlock = blockNumber + 1

            await mineBlocks(10)

            await token.connect(user1).delegate(user1.address)

            const oldVotes = await token.getPastVotes(user2.address, nexBlock)

            const oldCheckpoint = await token.checkpoints(user2.address, 0)

            expect(oldCheckpoint.votes).to.be.eq(oldVotes)

        });

        it(' should return the last checkpoint', async () => {
            await token.connect(user1).delegate(user2.address)

            const currentBlock = await ethers.provider.getBlockNumber()

            const votes = await token.getPastVotes(user2.address, currentBlock - 100)

            expect(votes).to.be.eq(0)
        });

        it(' should fail if blockNumber did not happened yet', async () => {

            const currentBlock = await ethers.provider.getBlockNumber()

            await expect(
                token.getPastVotes(user2.address, currentBlock + 1000)
            ).to.be.revertedWith('PaladinToken: invalid blockNumber')

        });

    });

    
    describe('getPastDelegate', async () => {

        beforeEach(async () => {
            await token.connect(admin).setTransfersAllowed(true);

            await token.connect(recipient).transfer(user1.address, ethers.utils.parseEther('1000'));
            await token.connect(recipient).transfer(user2.address, ethers.utils.parseEther('1000'));
        });

        it(' should return address 0x000...000 if no checkpoints', async () => {

            const currentBlock = await ethers.provider.getBlockNumber()

            const votes = await token.getPastDelegate(user1.address, currentBlock - 1)

            expect(votes).to.be.eq(ethers.constants.AddressZero)

        });

        it(' should return the correct deelgate address', async () => {

            const delegate_call = await token.connect(user1).delegate(user2.address)

            const blockNumber1 = delegate_call.blockNumber || 0

            await mineBlocks(10)

            const delegate_call2 = await token.connect(user1).delegate(user1.address)

            const blockNumber2 = delegate_call2.blockNumber || 0

            await mineBlocks(10)

            const delegate_call3 = await token.connect(user1).delegate(ethers.constants.AddressZero)

            const blockNumber3 = delegate_call3.blockNumber || 0

            await mineBlocks(3)

            expect(await await token.getPastDelegate(user1.address, blockNumber1 - 1)).to.be.eq(ethers.constants.AddressZero)
            expect(await await token.getPastDelegate(user1.address, blockNumber1)).to.be.eq(user2.address)
            expect(await await token.getPastDelegate(user1.address, blockNumber1 + 1)).to.be.eq(user2.address)

            expect(await await token.getPastDelegate(user1.address, blockNumber2 - 1)).to.be.eq(user2.address)
            expect(await await token.getPastDelegate(user1.address, blockNumber2)).to.be.eq(user1.address)
            expect(await await token.getPastDelegate(user1.address, blockNumber2 + 1)).to.be.eq(user1.address)

            expect(await await token.getPastDelegate(user1.address, blockNumber3 - 1)).to.be.eq(user1.address)
            expect(await await token.getPastDelegate(user1.address, blockNumber3)).to.be.eq(ethers.constants.AddressZero)
            expect(await await token.getPastDelegate(user1.address, blockNumber3 + 1)).to.be.eq(ethers.constants.AddressZero)

        });

        it(' should return the 1st checkpoint', async () => {

            const delegate_call = await token.connect(user1).delegate(user2.address)

            const blockNumber = delegate_call.blockNumber || 0

            const nexBlock = blockNumber + 1

            await mineBlocks(10)

            await token.connect(user1).delegate(user1.address)

            const oldDelegate = await token.getPastDelegate(user1.address, nexBlock)

            const oldCheckpoint = await token.delegateCheckpoints(user1.address, 0)

            expect(oldCheckpoint.delegate).to.be.eq(oldDelegate)

        });

        it(' should return the last checkpoint', async () => {
            await token.connect(user1).delegate(user2.address)

            const currentBlock = await ethers.provider.getBlockNumber()

            const current_delegate = await token.getPastDelegate(user1.address, currentBlock - 100)

            expect(current_delegate).to.be.eq(ethers.constants.AddressZero)
        });

        it(' should fail if blockNumber did not happened yet', async () => {

            const currentBlock = await ethers.provider.getBlockNumber()

            await expect(
                token.getPastDelegate(user1.address, currentBlock + 1000)
            ).to.be.revertedWith('PaladinToken: invalid blockNumber')

        });

    });

});