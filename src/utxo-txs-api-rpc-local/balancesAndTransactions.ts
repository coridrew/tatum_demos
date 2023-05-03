import fetch from 'node-fetch';
import fs from 'fs/promises';

interface DataItem {
  incoming: number;
  outgoing: number;
  incomingPending: number;
  outgoingPending: number;
}

async function main() {

  const fileContent = await fs.readFile('./src/utxo-txs-api-rpc-local/wallets.json', 'utf-8');
  const walletFile = JSON.parse(fileContent);

  const apiKey = '';
  const addresses = walletFile.wallets.map(wallet => wallet.address).join(',');

  const query = new URLSearchParams({
    addresses: addresses
  }).toString();
  
  const response = await fetch(
    `https://api.tatum.io/v3/bitcoin/address/balance/batch?${query}`,
    {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    }
  );

  const data: DataItem[] = await response.json() as DataItem[];
  console.log("response:")
  console.log(JSON.stringify(data, null, 2));
  
  walletFile.wallets.forEach((wallet, index) => {
    wallet.incoming = data[index].incoming,
    wallet.outgoing = data[index].outgoing,
    wallet.incomingPending = data[index].incomingPending,
    wallet.outgoingPending = data[index].outgoingPending,
    wallet.balance = (data[index].incoming - data[index].outgoing)
  });
  
  // Write the updated JSON data to the wallets.json file
  await fs.writeFile('./src/utxo-txs-api-rpc-local/wallets.json', JSON.stringify(walletFile, null, 2));

}

main().catch((error) => console.error(error));
