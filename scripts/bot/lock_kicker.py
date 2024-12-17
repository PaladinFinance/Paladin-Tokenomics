from web3 import Web3, HTTPProvider
import sys
import os
import json
import time
from dotenv import load_dotenv, find_dotenv
from utils import fetch_events, hPAL_minimal_ABI, UserLock
from datetime import datetime


load_dotenv(find_dotenv('.env'))


MAINNET_URI = os.environ.get('MAINNET_URI')
#PRIVATE_KEY = os.environ.get('MAINNET_PRIVATE_KEY')

w3 = Web3(HTTPProvider(MAINNET_URI,request_kwargs={'timeout':60}))

#kicker_account = w3.eth.account.from_key(PRIVATE_KEY)

hPAL_address = "0x624D822934e87D3534E435b83ff5C19769Efd9f6" 

start_block = 14709709

UNLOCK_DELAY = 1209600

WEEK = 604800


def checkLocks(hPAL):
    lockEvent = hPAL.events.Lock

    eventList = list(fetch_events(w3, lockEvent, from_block=start_block, address=hPAL_address))

    current_ts = w3.eth.get_block(w3.eth.get_block_number()).timestamp

    print('Current ts', current_ts)

    seen_user = []

    for e in eventList:
        usr_address = e.args.user

        if(usr_address in seen_user):
            continue

        seen_user.append(usr_address)

        usr_current_balance = hPAL.functions.balanceOf(usr_address).call()

        if(usr_current_balance > 0):
            #we check that user still has a balance in hPAL

            usr_current_lock = UserLock(hPAL.functions.getUserLock(usr_address).call())
            
            if(usr_current_lock.amount > 0):
                #user lock is not empty
                end_lock_ts = usr_current_lock.start_ts + usr_current_lock.duration

                start_kick_ts = end_lock_ts + UNLOCK_DELAY

                text_color = "\x1b[32m"
                if(start_kick_ts < (current_ts + (WEEK * 4))): text_color = "\x1b[33m"
                if(start_kick_ts < (current_ts + WEEK)): text_color = "\x1b[31m"

                print(
                    text_color, 
                    "User",
                    usr_address,
                    "- Balance:",
                    '{0:.{1}f}'.format(w3.from_wei(usr_current_balance, 'ether'), 4).rjust(12),
                    "& Locked:",
                    '{0:.{1}f}'.format(w3.from_wei(usr_current_lock.amount, 'ether'), 4).rjust(12),
                    "- can be kicked at ts :",
                    str(start_kick_ts),
                    " - ",
                    datetime.utcfromtimestamp(start_kick_ts).strftime('%d-%m-%Y %H:%M:%S'),
                    " UTC \x1b[0m"
                )

                if(start_kick_ts < (current_ts + WEEK)):
                    print('kick him')
                    
                    """try:
                        last_block = w3.eth.getBlock('latest')
                        baseFee = last_block.baseFeePerGas
                        prio_fee = w3.toWei(5, 'gwei')
                        tx_dict = hPAL.functions.kick(usr_address).buildTransaction({
                            'from' : account.address,
                            'nonce' : w3.eth.getTransactionCount(account.address),
                            'gas' : 1500000,
                            'maxFeePerGas': (baseFee * 2) + prio_fee,
                            'maxPriorityFeePerGas' : prio_fee
                        })
                        tx = w3.eth.account.signTransaction(tx_dict, account.key)
                        result = w3.eth.sendRawTransaction(tx.rawTransaction)
                        print('\033[91m Kick user ' + usr_address + ' -  Tx hash : ' + str(result.hex()) + ' \033[0m')
                        time.sleep(5)
                        txReceipt = w3.eth.waitForTransactionReceipt(result)

                        if(txReceipt['status'] == 1):
                            print('\033[91m Kick ' + usr_address + ' - Kick succeeded \033[0m')

                        else:
                            print('\033[91m Kick ' + usr_address + ' - Kick transaction failed \033[0m')
                    except Exception as e:
                        print(e)"""



try:
    hPAL = w3.eth.contract(abi=hPAL_minimal_ABI, address=hPAL_address)

    checkLocks(hPAL)

except KeyboardInterrupt:
    exit(0)