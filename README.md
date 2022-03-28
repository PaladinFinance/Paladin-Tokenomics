# Paladin Tokenomics

## Overview

Smart contracts for the Paladin Token (PAL) & Holy Paladin Token (hPAL) 
  

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
