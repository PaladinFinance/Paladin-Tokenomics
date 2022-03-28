from web3 import Web3, HTTPProvider
import sys
import os
import json
import time
from dotenv import load_dotenv, find_dotenv
from utils import fetch_events, hPAL_minimal_ABI, UserLock


load_dotenv(find_dotenv('.env'))

""" ======> currently override
MAINNET_URI = os.environ.get('MAINNET_URI')
PRIVATE_KEY = os.environ.get('MAINNET_PRIVATE_KEY')

w3 = Web3(HTTPProvider(MAINNET_URI,request_kwargs={'timeout':60}))

kicker_account = w3.eth.account.from_key(PRIVATE_KEY)
"""

w3 = Web3(HTTPProvider(os.environ.get('KOVAN_URI'),request_kwargs={'timeout':60}))

hPAL_address = "0x99D4BbE6D9D0d8DE84DF558621e2E686a7F45b75" # Kovan

start_block = 30574843 # Kovan


hPAL = w3.eth.contract(abi=hPAL_minimal_ABI, address=hPAL_address)


lockEvent = hPAL.events.Lock

eventList = list(fetch_events(lockEvent, from_block=start_block, address=hPAL_address))

UNLOCK_DELAY = hPAL.functions.UNLOCK_DELAY().call()

current_ts = w3.eth.get_block(w3.eth.get_block_number()).timestamp

for e in eventList:
    usr_address = e.args.user

    usr_current_balance = hPAL.functions.balanceOf(usr_address).call()

    if(usr_current_balance > 0):
        #we check that user still has a balance in hPAL

        usr_current_lock = UserLock(hPAL.functions.getUserLock(usr_address).call())
        
        if(usr_current_lock.amount > 0):
            #user lock is not empty
            end_lock_ts = usr_current_lock.start_ts + usr_current_lock.duration

            start_kick_ts = end_lock_ts + UNLOCK_DELAY

            print("User", usr_address, "can be kicked at ts :", str(start_kick_ts))



