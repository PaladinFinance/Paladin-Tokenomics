# Paladin Tokenomics

## Overview

Smart contracts for the Paladin Token (PAL) & Holy Paladin Token (hPAL) 

PAL: [0xAB846Fb6C81370327e784Ae7CbB6d6a6af6Ff4BF](https://etherscan.io/address/0xab846fb6c81370327e784ae7cbb6d6a6af6ff4bf) 
hPAL: [0x624D822934e87D3534E435b83ff5C19769Efd9f6](https://etherscan.io/address/0x624d822934e87d3534e435b83ff5c19769efd9f6) 
  

## Dependencies & Installation


To start, make sure you have `node` & `npm` installed : 
* `node` - tested with v16.4.0
* `npm` - tested with v7.18.1

Then, clone this repo, and install the dependencies : 

```
git clone https://github.com/PaladinFinance/Paladin-Tokenomics.git
cd Paladin-Tokenomics
npm install
```

This will install `Hardhat`, `Ethers v5`, and all the hardhat plugins used in this project.


## Contracts


[PAL](https://github.com/PaladinFinance/Paladin-Tokenomics/blob/main/contracts/PaladinToken.sol)  
[hPAL](https://github.com/PaladinFinance/Paladin-Tokenomics/blob/main/contracts/HolyPaladinToken.sol)  



## Tests


Tests can be found in the `./test` directory.

To run the tests : 
```
npm run test
```


## Fuzzing

Fuzzing tests can be found in the `./src/test` directory.

To run the tests : 
```
npm run test-fuzz
```


## Deploy


Deploy to Kovan :
```
npm run build
npm run deploy_kovan <path_to_deploy_script>
```

Deploy to Mainnet :
```
npm run build
npm run deploy <path_to_deploy_script>
```
