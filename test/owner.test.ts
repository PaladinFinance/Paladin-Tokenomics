const hre = require("hardhat");
import { ethers, waffle } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { HolyPaladinToken } from "../typechain/HolyPaladinToken";
import { PaladinRewardReserve } from "../typechain/PaladinRewardReserve";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractFactory } from "@ethersproject/contracts";


chai.use(solidity);
const { expect } = chai;
const { provider } = ethers;

let reserveFactory: ContractFactory
let hPAL_Factory: ContractFactory

const startDropPerSecond = ethers.utils.parseEther('0.0005')
const endDropPerSecond = ethers.utils.parseEther('0.00001')

const dropDecreaseDuration = 63072000

const baseLockBonusRatio = ethers.utils.parseEther('1')
const minLockBonusRatio = ethers.utils.parseEther('2')
const maxLockBonusRatio = ethers.utils.parseEther('6')

describe('Owner contract tests', () => {
    let admin: SignerWithAddress
    let newOwner: SignerWithAddress
    let otherOwner: SignerWithAddress

    let fakeToken: SignerWithAddress

    let reserve: PaladinRewardReserve
    let hPAL: HolyPaladinToken

    before(async () => {
        [admin, newOwner, otherOwner, fakeToken] = await ethers.getSigners();

        reserveFactory = await ethers.getContractFactory("PaladinRewardReserve");
        hPAL_Factory = await ethers.getContractFactory("HolyPaladinToken");

    })

    beforeEach(async () => {

        reserve = (await reserveFactory.connect(admin).deploy(
            admin.address
        )) as PaladinRewardReserve;
        await reserve.deployed();

        hPAL = (await hPAL_Factory.connect(admin).deploy(
            fakeToken.address,
            admin.address,
            reserve.address,
            ethers.constants.AddressZero,
            startDropPerSecond,
            endDropPerSecond,
            dropDecreaseDuration,
            baseLockBonusRatio,
            minLockBonusRatio,
            maxLockBonusRatio
        )) as HolyPaladinToken;
        await hPAL.deployed();

    });


    it(' should be deployed & have correct owner', async () => {

        expect(await reserve.owner()).to.be.eq(admin.address)
        expect(await hPAL.owner()).to.be.eq(admin.address)

    });


    describe('transferOwnership', async () => {

        it(' should set the correct _pendingOwner', async () => {

            const tx = await reserve.connect(admin).transferOwnership(newOwner.address)

            await expect(
                tx
            ).to.emit(reserve, "NewPendingOwner")
            .withArgs(ethers.constants.AddressZero, newOwner.address);

            expect(await reserve.pendingOwner()).to.be.eq(newOwner.address)

            await hPAL.connect(admin).transferOwnership(newOwner.address)

            expect(await hPAL.pendingOwner()).to.be.eq(newOwner.address)

        });

        it(' should fail if address 0 is given', async () => {

            await expect(
                reserve.connect(admin).transferOwnership(ethers.constants.AddressZero)
            ).to.be.revertedWith('ZeroAddress')

            await expect(
                hPAL.connect(admin).transferOwnership(ethers.constants.AddressZero)
            ).to.be.revertedWith('ZeroAddress')

        });

        it(' should fail if not called by owner', async () => {

            await expect(
                reserve.connect(newOwner).transferOwnership(newOwner.address)
            ).to.be.revertedWith('Ownable: caller is not the owner')

            await expect(
                hPAL.connect(otherOwner).transferOwnership(newOwner.address)
            ).to.be.revertedWith('Ownable: caller is not the owner')

        });

        it(' should fail if giving the current owner as parameter', async () => {

            await expect(
                reserve.connect(admin).transferOwnership(admin.address)
            ).to.be.revertedWith('CannotBeOwner')

            await expect(
                hPAL.connect(admin).transferOwnership(admin.address)
            ).to.be.revertedWith('CannotBeOwner')

        });

    });


    describe('acceptOwnership', async () => {

        beforeEach(async () => {

            await reserve.connect(admin).transferOwnership(newOwner.address)
            await hPAL.connect(admin).transferOwnership(newOwner.address)

        });

        it(' should update the owner correctly', async () => {

            const tx = await reserve.connect(newOwner).acceptOwnership()

            await expect(
                tx
            ).to.emit(reserve, "OwnershipTransferred")
            .withArgs(admin.address, newOwner.address);

            await expect(
                tx
            ).to.emit(reserve, "NewPendingOwner")
            .withArgs(newOwner.address, ethers.constants.AddressZero);

            expect(await reserve.owner()).to.be.eq(newOwner.address)

            await hPAL.connect(newOwner).acceptOwnership()

            expect(await hPAL.owner()).to.be.eq(newOwner.address)

        });

        it(' should fail if not called by the pending owner', async () => {

            await expect(
                reserve.connect(admin).acceptOwnership()
            ).to.be.revertedWith('CallerNotPendingOwner')

            await expect(
                hPAL.connect(otherOwner).acceptOwnership()
            ).to.be.revertedWith('CallerNotPendingOwner')

        });

    });

});