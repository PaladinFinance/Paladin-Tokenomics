from web3 import Web3, HTTPProvider
import sys
import os
import json
import time
from dotenv import load_dotenv, find_dotenv
from utils import fetch_events, hPAL_minimal_ABI, UserLock
from datetime import datetime
from decimal import *

load_dotenv(find_dotenv('.env'))

getcontext().prec = 18
getcontext().rounding = ROUND_FLOOR


MAINNET_URI = os.environ.get('MAINNET_URI')

w3 = Web3(HTTPProvider(MAINNET_URI,request_kwargs={'timeout':60}))

hPAL_address = "0x624D822934e87D3534E435b83ff5C19769Efd9f6" 

hPAL = w3.eth.contract(abi=hPAL_minimal_ABI, address=hPAL_address)

START_TS = Decimal('1651650836')
CURRENT_TS = Decimal('1697207621')

DECREASE_DELAY = Decimal('2628000') # 1 month
DROP_DECREASE_DURATION = Decimal('63072000')

START_DROP_PER_SEC = Decimal('0.0380517503805175')
END_DROP_PER_SEC = Decimal('0.01141552511415525')
DECREASE_PER_DELAY = ((START_DROP_PER_SEC - END_DROP_PER_SEC) * DECREASE_DELAY) / (DROP_DECREASE_DURATION)

total_distrib_budget = Decimal('0')
ts = START_TS
drop_per_sec = START_DROP_PER_SEC

while(ts < CURRENT_TS):
    next_ts = ts + DECREASE_DELAY
    if(next_ts > CURRENT_TS):
        next_ts = CURRENT_TS
    
    ellapsed = next_ts - ts
    period_distrib = ellapsed * drop_per_sec
    total_distrib_budget = total_distrib_budget + period_distrib

    ts = next_ts
    drop_per_sec = drop_per_sec - DECREASE_PER_DELAY
    if(drop_per_sec < END_DROP_PER_SEC):
        drop_per_sec = END_DROP_PER_SEC


print('Total distrib budget', total_distrib_budget)

# -----------------------------------------------------------------

start_block = 14709709
lockEvent = hPAL.events.Stake
claimEvent = hPAL.events.ClaimRewards
eventList = list(fetch_events(w3, lockEvent, from_block=start_block, address=hPAL_address))
eventListClaim = list(fetch_events(w3, claimEvent, from_block=start_block, address=hPAL_address))

seen_stakers = []
total_claimable = Decimal('0')
total_claimed = Decimal('0')

for e in eventList:
        usr_address = e.args.user

        if(usr_address in seen_stakers):
            continue
        seen_stakers.append(usr_address)

        user_claimable = Decimal(w3.from_wei(hPAL.functions.estimateClaimableRewards(usr_address).call(), 'ether'))
        if(user_claimable > 0):
            total_claimable = total_claimable + user_claimable


print('Total claimable rewards', total_claimable)

for e in eventListClaim:
        usr_address = e.args.user
        amount = Decimal(w3.from_wei(e.args.amount, 'ether'))

        if(amount > 0):
            total_claimed = total_claimed + amount


print('Total claimed rewards', total_claimed)


unspent = total_distrib_budget - total_claimable - total_claimed

print('Unspent budget', unspent)
print('Covers ', unspent / END_DROP_PER_SEC, ' more secs')
print('Covers ', (unspent / END_DROP_PER_SEC) / 86400, ' more days')
print('Covers ', (unspent / END_DROP_PER_SEC) / DECREASE_DELAY, ' more months')