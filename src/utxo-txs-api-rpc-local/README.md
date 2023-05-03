### use case

User wants to prepare and sign a UTXO tx without the sdk or kms.

The tx will be prepared with utxos retrieved from the tatum api, the tx prepared via RPC, signed locally, and then broadcasted via ?

### starting condition

three wallets

wallet 0  and 1 start with some testnet btc

wallet 2 starts empty

[https://apidoc.tatum.io/tag/Bitcoin#operation/BtcGetBalanceOfAddressBatch](https://apidoc.tatum.io/tag/Bitcoin#operation/BtcGetBalanceOfAddressBatch)

show contents of wallets

### tx btc from 0 → 1

[https://apidoc.tatum.io/tag/Bitcoin#operation/BtcTransferBlockchain](https://apidoc.tatum.io/tag/Bitcoin#operation/BtcTransferBlockchain)

make initial transfer

[https://apidoc.tatum.io/tag/Bitcoin#operation/BtcGetBalanceOfAddressBatch](https://apidoc.tatum.io/tag/Bitcoin#operation/BtcGetBalanceOfAddressBatch)

show contents of wallets including pending tx

### get utxos

[https://apidoc.tatum.io/tag/Data-API#operation/GetUtxosByAddress](https://apidoc.tatum.io/tag/Data-API#operation/GetUtxosByAddress)

enter value to send as totalValue as query param

endpoint returns UTXOs available until requested value is reach

postman console outputs

```
totalValue:
0.001
 
totalInputAmount:
0.01451529
 
remainder:
0.01351529
```

### estimate fee

[https://apidoc.tatum.io/tag/Blockchain-fees#operation/getBlockchainFee](https://apidoc.tatum.io/tag/Blockchain-fees#operation/EstimateFeeBlockchain)

```
{
  "chain": "BTC",
  "type": "TRANSFER"
  "fromUTXO": [
      {
        "txHash": "d26d2611587c71f50c9c9c21008972434e12637fb782a20276eb3ffb62ffe01d",
        "index": 0
      },
      {
        "txHash": "67da3e39374062abbb8fa310e17b9a6754d67a728f33049c2e2d07f9f08eece8",
        "index": 0
      }
    ],
    "to": [
      {
        "address": "tb1q5zmwxxn4wlqtqdlswl5awjsqyhqg0tapd8xfpg",
        "value": 0.01451529 // totalInputAmount
      }
    ]
  }

// outputs fee
```

### create tx

[https://developer.bitcoin.org/reference/rpc/createrawtransaction.html](https://developer.bitcoin.org/reference/rpc/createrawtransaction.html)

create tx with rpc call

This TX will consume all btc from input utxos.

change = totalInputAmount - totalValue - fee

```
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "createrawtransaction",
  "params": [
    [
      {
        "txid": "d26d2611587c71f50c9c9c21008972434e12637fb782a20276eb3ffb62ffe01d",
        "vout": 0 // Index 
      },
			{
        "txid": "67da3e39374062abbb8fa310e17b9a6754d67a728f33049c2e2d07f9f08eece8",
        "vout": 0
      }
    ],
    {
			// change = total_input_amount - totalValue - transaction_fee

      "tb1qstegy523g9l4z35z4sr7kmt9c3ysrcxqzsxt6z": 0.00001, // Sender address: change
      "tb1q5zmwxxn4wlqtqdlswl5awjsqyhqg0tapd8xfpg": 0.00001  // Reciever address: totalValue  
    }
  ]
}
```

### sign and broadcast utxo

- Resources
    
    [s](https://github.com/tatumio/tatum-js/tree/v2/examples/btc-example/src/app)