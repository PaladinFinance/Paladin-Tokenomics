from web3._utils.abi import get_constructor_abi, merge_args_and_kwargs
from web3._utils.events import get_event_data
from web3._utils.filters import construct_event_filter_params
from web3._utils.contracts import encode_abi


hPAL_minimal_ABI = [
    {"anonymous": False,"inputs": [
        {
        "indexed": True,
        "internalType": "address",
        "name": "user",
        "type": "address"
        },
        {
        "indexed": False,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
        },
        {
        "indexed": True,
        "internalType": "uint256",
        "name": "startTimestamp",
        "type": "uint256"
        },
        {
        "indexed": True,
        "internalType": "uint256",
        "name": "duration",
        "type": "uint256"
        },
        {
        "indexed": False,
        "internalType": "uint256",
        "name": "totalLocked",
        "type": "uint256"
        }
    ],"name": "Lock","type": "event"},
    {"inputs": [],"name": "UNLOCK_DELAY","outputs": [{"internalType": "uint256","name": "","type": "uint256"}],"stateMutability": "view","type": "function"},
    {"inputs": [{"internalType": "address","name": "account","type": "address"}],"name": "balanceOf","outputs": [{"internalType": "uint256","name": "","type": "uint256"}],"stateMutability": "view","type": "function"},
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getUserLock",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint128",
              "name": "amount",
              "type": "uint128"
            },
            {
              "internalType": "uint48",
              "name": "startTimestamp",
              "type": "uint48"
            },
            {
              "internalType": "uint48",
              "name": "duration",
              "type": "uint48"
            },
            {
              "internalType": "uint32",
              "name": "fromBlock",
              "type": "uint32"
            }
          ],
          "internalType": "struct HolyPaladinToken.UserLock",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {"inputs": [{"internalType": "address","name": "user","type": "address"}],"name": "kick","outputs": [],"stateMutability": "nonpayable","type": "function"},
    {"inputs": [],"name": "kickRatioPerWeek","outputs": [{"internalType": "uint256","name": "","type": "uint256"}],"stateMutability": "view","type": "function"},
]


class UserLock:
    def __init__(self, callData):
        self.amount = callData[0]
        self.start_ts = callData[1]
        self.duration = callData[2]
        self.from_block = callData[3]


def fetch_events(
    event,
    argument_filters=None,
    from_block=None,
    to_block="latest",
    address=None,
    topics=None):
    """Get events using eth_getLogs API.

    This is a stateless method, as opposite to createFilter and works with
    stateless nodes like QuikNode and Infura.

    :param event: Event instance from your contract.events
    :param argument_filters:
    :param from_block: Start block. Use 0 for all history/
    :param to_block: Fetch events until this contract
    :param address:
    :param topics:
    :return:
    """

    if from_block is None:
        raise TypeError("Missing mandatory keyword argument to getLogs: from_Block")

    abi = event._get_event_abi()
    abi_codec = event.web3.codec

    # Set up any indexed event filters if needed
    argument_filters = dict()
    _filters = dict(**argument_filters)

    data_filter_set, event_filter_params = construct_event_filter_params(
        abi,
        abi_codec,
        contract_address=event.address,
        argument_filters=_filters,
        fromBlock=from_block,
        toBlock=to_block,
        address=address,
        topics=topics,
    )

    # Call node over JSON-RPC API
    logs = event.web3.eth.getLogs(event_filter_params)

    # Convert raw binary event data to easily manipulable Python objects
    for entry in logs:
        data = get_event_data(abi_codec, abi, entry)
        yield data