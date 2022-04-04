// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;


import "../HolyPaladinToken.sol";
import "../open-zeppelin/interfaces/IERC20.sol";
import "../open-zeppelin/libraries/SafeERC20.sol";

/// @notice Mock contract trying to create a Lock over hPAL
/// Used to test the SmartWalletWhitelist system
contract MockLocker {
    using SafeERC20 for IERC20;

    address public pal;
    address public hPAL;

    uint256 public stakedAmount;
    uint256 public constant lockDuration = 31557600;

    constructor(address _pal, address _hPAL){
        pal = _pal;
        hPAL = _hPAL;
    }

    function stakeFunds(uint256 amount) external {
        stakedAmount += amount;

        IERC20(pal).transferFrom(msg.sender, address(this), amount);

        IERC20(pal).safeIncreaseAllowance(hPAL, amount);

        HolyPaladinToken(hPAL).stake(amount);
    }

    function tryLock() external {
        HolyPaladinToken(hPAL).lock(stakedAmount, lockDuration);
    }

    function tryStakeAndLock(uint256 amount) external {
        stakedAmount += amount;

        IERC20(pal).transferFrom(msg.sender, address(this), amount);

        IERC20(pal).safeIncreaseAllowance(hPAL, amount);

        HolyPaladinToken(hPAL).stakeAndLock(amount, lockDuration);
    }

    function tryIncreaseLock(uint256 amount) external {
        stakedAmount += amount;

        IERC20(pal).transferFrom(msg.sender, address(this), amount);

        IERC20(pal).safeIncreaseAllowance(hPAL, amount);

        HolyPaladinToken(hPAL).stake(amount);

        HolyPaladinToken(hPAL).increaseLock(stakedAmount);
    }

    function tryIncreaseLockDuration() external {
        HolyPaladinToken(hPAL).increaseLockDuration(lockDuration + 500);
    }

    function tryStakeAndIncreaseLock(uint256 amount) external {
        stakedAmount += amount;

        IERC20(pal).transferFrom(msg.sender, address(this), amount);

        IERC20(pal).safeIncreaseAllowance(hPAL, amount);

        HolyPaladinToken(hPAL).stakeAndIncreaseLock(amount, lockDuration);
    }

    function unlockAll() external {
        HolyPaladinToken(hPAL).unlock();
    }

    function withdraw(uint256 amount) external {
        stakedAmount -= amount;

        HolyPaladinToken(hPAL).unstake(amount, msg.sender);
    }
}