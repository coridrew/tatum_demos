import fetch from 'node-fetch';
import fs from 'fs/promises';

const apiKey = '6fcc0b52-0069-4024-a00d-b3c050e66090';
const senderAddress = 'tb1qstegy523g9l4z35z4sr7kmt9c3ysrcxqzsxt6z'
const senderPrivateKey = 'cPajR9FCiNJ1eGd4sF92G8kNW8XCg6NxSpk6sJMEePahh1smk4s7'
const recieverAddress = 'tb1q5zmwxxn4wlqtqdlswl5awjsqyhqg0tapd8xfpg'
// amount to send
const totalValue: number = 0.00001
const fee = "0.00002998"

async function main() {
    const fileContent = await fs.readFile('./src/utxo-txs-api-rpc-local/wallets.json', 'utf-8');


    const resp = await fetch(
        `https://api.tatum.io/v3/bitcoin/transaction`,
        {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
        body: JSON.stringify({
            fromAddress: [
            {
                address: senderAddress,
                privateKey: senderPrivateKey
            }
            ],
            to: [
            {
                address: recieverAddress,
                value: totalValue
            }
            ],
            fee: fee,
            changeAddress: senderAddress
        })
        }
    );
  
  const data = await resp.json();
  console.log(data);
}

  main().catch((error) => console.error(error));
  main().catch((error) => console.error(error));
