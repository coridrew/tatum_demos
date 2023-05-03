import fetch from 'node-fetch';
import fs from 'fs/promises';

interface UtxosItem {
    txHash: string;
    index: number;
    value: number;
}
interface SignedTransactionResponse {
  result: {
    hex: string;
    complete: boolean;
  };
}
interface BroadcastTransactionResponse {
    result: {
        hex?: string;
        errors?: string[];
    };
}

const apiKey = '';
const senderAddress = 'tb1q5zmwxxn4wlqtqdlswl5awjsqyhqg0tapd8xfpg'
const senderPrivateKey = 'cTgid6cwAgVVrmpMr16c2Rae87RS6U9kVg68dnPooWMJoDYL2xuZ'
const recieverAddress = 'tb1qrktc77kw0cuuyp47cr95rgdq7xe6l740aw2utc'
// amount to send
const totalValue: number = 0.001


async function getUtxos(): Promise<UtxosItem[]> {
    const testTotalValue = totalValue * 1.10
    const query = new URLSearchParams({
        chain: 'bitcoin-testnet',
        address: senderAddress,
        totalValue: testTotalValue.toString()
    }).toString();

    const utxosResponse = await fetch(
        `https://api.tatum.io/v3/data/utxos?${query}`,
        {
            method: 'GET',
            headers: {
                'x-api-key': apiKey
            }
        }
    );

    try {
        const utxoJson: UtxosItem[] = await utxosResponse.json() as UtxosItem[];
        const utxos = utxoJson.map(utxo => ({
            txHash: utxo.txHash,
            index: utxo.index,
            value: utxo.value
        }));
        return utxos;
    } catch (error) {
        console.error("Error parsing or validating utxosResponse:", error);
        throw error;
    } 
}
async function estimateFee(utxos: UtxosItem[]): Promise<number> {
    const feesResponse = await fetch(
        `https://api.tatum.io/v3/blockchain/estimate`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                "chain": 'BTC',
                "type": "TRANSFER",
                "fromUTXO": utxos,
                "to": [
                    {
                        "address": recieverAddress,
                        "value": totalValue
                    }
                ]
            })
        }
    );
    const fee = await feesResponse.json() as { slow: number };
    return fee.slow;
}
async function createRawTransaction(utxos: UtxosItem[], fee: number, totalInputAmount: number): Promise<string> {
    const inputs = utxos.map(utxo => ({
        txid: utxo.txHash,
        vout: utxo.index
    }));
    const change = parseFloat((totalInputAmount - totalValue - fee).toFixed(8));
    const outputs = {
        [recieverAddress]: parseFloat(totalValue.toFixed(8)),
        [senderAddress]: parseFloat(change.toFixed(8))
    };
    console.log("inputs: ", inputs, "outputs: ", outputs, "fee: ", fee)
    const response = await fetch('https://api.tatum.io/v3/blockchain/node/BTC', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'createrawtransaction',
            params: [inputs, outputs],
        }),
    });

    if (!response.ok) {
        throw new Error(`Error creating raw transaction: ${response.statusText}`);
    }

    const result = await response.json() as { error?: { message: string }, result: string };
    return result.result;
}
async function signTransaction(rawTransaction) {
    const response = await fetch('https://api.tatum.io/v3/blockchain/node/BTC', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'signrawtransactionwithkey',
        params: [rawTransaction, [senderPrivateKey]],
      }),
    });
  
    const result = (await response.json()) as SignedTransactionResponse;
    return result;
  }
async function broadcastTransaction(signedTransaction: string) {
    const response = await fetch('https://api.tatum.io/v3/blockchain/node/BTC', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'sendrawtransaction',
            params: [signedTransaction],
        }),
    });
    const result = await response.json() as BroadcastTransactionResponse;
    console.log("Received result:", result);

     // Check for errors in the result
     if (result && result.result && result.result.errors && result.result.errors.length > 0) {
        console.error("Error(s) occurred during broadcasting:");
        console.error(result.result.errors);
        throw new Error("Error(s) occurred during broadcasting");
    }

    // Check if result and result.result exist before accessing hex
    if (result && result.result) {
        return result.result.hex;
    } else {
        throw new Error("Unable to access the 'hex' property in the result");
    }
}

async function main() {
    const fileContent = await fs.readFile('./src/utxo-txs-api-rpc-local/wallets.json', 'utf-8');
    const walletFile = JSON.parse(fileContent);

    // get uxtos to send
    const utxos = await getUtxos();
    console.log(utxos)
    // estimate fee
    const feeSlow = await estimateFee(utxos);
    // calculate totalInputAmount from utxos
    const suitableUtxo = utxos.find(utxo => utxo.value >= +totalValue + +feeSlow);
    const totalInputAmount = suitableUtxo
    ? suitableUtxo.value
    : utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    let filteredUtxos;
    if (suitableUtxo === undefined) {
        filteredUtxos = utxos;
    } else {
        filteredUtxos = [suitableUtxo];
    }
    
    // calculate change to return to sender
    const change = +totalInputAmount - +totalValue - +feeSlow;
    if (change > 0) {
        // create tx
        const rawTransaction = await createRawTransaction(filteredUtxos, feeSlow, totalInputAmount);
        console.log('Raw transaction:');
        console.log(JSON.stringify(rawTransaction, null, 2));
        const signedTransactionResponse = await signTransaction(rawTransaction) as SignedTransactionResponse;
        const signedTransaction = signedTransactionResponse.result.hex;
        console.log('Signed transaction:');
        console.log(signedTransactionResponse.result.hex);
        console.log( signedTransactionResponse.result.complete);
        await broadcastTransaction(signedTransaction);
        console.log('Transaction broadcasted successfully.');
    } else {
        console.log('Unable to create a transaction with enough btc from utxos:')
        console.log(JSON.stringify(utxos, null, 2));
        console.log("total to send:", totalValue);
        console.log("fees:", feeSlow);
        console.log(`totalInputAmount from utxos: ${totalInputAmount}`);
        const totalRequired = +totalValue + +feeSlow
        console.log("totalRequired:", totalRequired)
        console.log("difference: ", change)
    }
 
}

main().catch((error) => console.error(error));
