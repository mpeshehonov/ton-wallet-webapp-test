import { TonClient, fromNano, internal, SendMode, toNano } from '@ton/ton';
import { Address, type Cell } from '@ton/core';
import { getWalletContract } from './wallet';

const TONCENTER_TESTNET = 'https://testnet.toncenter.com/api/v2/jsonRPC';

function createDefaultClient(): TonClient {
  return new TonClient({ endpoint: TONCENTER_TESTNET });
}

let client: TonClient = createDefaultClient();

export function getTonClient(): TonClient {
  return client;
}

/**
 * Подмена TonClient (только тесты). Возвращает функцию восстановления предыдущего клиента.
 */
export function injectTonClientForTests(next: TonClient): () => void {
  const prev = client;
  client = next;
  return () => {
    client = prev;
  };
}

/** Сброс клиента на реальный endpoint (после тестов с `injectTonClientForTests`). */
export function resetTonClientToDefault(): void {
  client = createDefaultClient();
}

export async function getBalance(address: string): Promise<string> {
  const balance = await client.getBalance(Address.parse(address));
  return fromNano(balance);
}

/** Текстовый комментарий к простому переводу (op = 0 + string tail). */
export function parseTransferCommentFromBody(body: Cell | null | undefined): string {
  if (!body) return '';
  try {
    const slice = body.beginParse();
    if (slice.remainingBits >= 32) {
      const op = slice.loadUint(32);
      if (op === 0 && slice.remainingBits > 0) {
        return slice.loadStringTail();
      }
    }
  } catch {
    // некорректное тело сообщения
  }
  return '';
}

export interface Transaction {
  hash: string;
  lt: string;
  timestamp: number;
  from: string;
  to: string;
  amount: string;
  fee: string;
  comment: string;
  isOutgoing: boolean;
}

export async function getTransactions(
  address: string,
  limit = 20
): Promise<Transaction[]> {
  const addr = Address.parse(address);
  const txs = await client.getTransactions(addr, { limit });

  return txs.map((tx) => {
    const inMsg = tx.inMessage;
    const outMsgs = tx.outMessages.values();
    const outMsg = outMsgs[0];

    let from = '';
    let to = '';
    let amount = '0';
    let comment = '';
    let isOutgoing = false;

    if (outMsg) {
      isOutgoing = true;
      to =
        outMsg.info.type === 'internal'
          ? outMsg.info.dest?.toString({ testOnly: true, bounceable: false }) ?? ''
          : '';
      amount =
        outMsg.info.type === 'internal' ? fromNano(outMsg.info.value.coins) : '0';
      comment = parseTransferCommentFromBody(outMsg.body ?? undefined);
    } else if (inMsg) {
      from =
        inMsg.info.type === 'internal'
          ? inMsg.info.src?.toString({ testOnly: true, bounceable: false }) ?? ''
          : 'external';
      amount =
        inMsg.info.type === 'internal' ? fromNano(inMsg.info.value.coins) : '0';
      comment = parseTransferCommentFromBody(inMsg.body ?? undefined);
    }

    const fee = fromNano(tx.totalFees.coins);

    return {
      hash: tx.hash().toString('hex'),
      lt: tx.lt.toString(),
      timestamp: tx.now,
      from,
      to,
      amount,
      fee,
      comment,
      isOutgoing,
    };
  });
}

export async function sendTon(params: {
  secretKey: Buffer;
  publicKey: Buffer;
  to: string;
  amount: string;
  comment?: string;
}): Promise<void> {
  const walletContract = getWalletContract(params.publicKey);
  const contract = client.open(walletContract);

  const seqno = await contract.getSeqno();

  await contract.sendTransfer({
    seqno,
    secretKey: params.secretKey,
    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    messages: [
      internal({
        to: Address.parse(params.to),
        value: toNano(params.amount),
        body: params.comment || undefined,
        bounce: false,
      }),
    ],
  });
}

export async function waitForTransaction(
  address: string,
  prevLt: string,
  timeoutMs = 60000
): Promise<boolean> {
  const addr = Address.parse(address);
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const txs = await client.getTransactions(addr, { limit: 1 });
    if (txs.length > 0 && txs[0].lt.toString() !== prevLt) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

export function isValidAddress(address: string): boolean {
  try {
    Address.parse(address);
    return true;
  } catch {
    return false;
  }
}
