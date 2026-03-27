import { Address, beginCell } from '@ton/core';
import { toNano, type TonClient } from '@ton/ton';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWallet } from './wallet';
import {
  getBalance,
  getTransactions,
  getTonClient,
  injectTonClientForTests,
  isValidAddress,
  parseTransferCommentFromBody,
  resetTonClientToDefault,
  sendTon,
  waitForTransaction,
} from './tonApi';

afterEach(() => {
  resetTonClientToDefault();
});

describe('isValidAddress', () => {
  let validUserFriendly: string;

  beforeAll(async () => {
    const w = await createWallet();
    validUserFriendly = w.address;
  });

  it('принимает user-friendly testnet-адрес кошелька', () => {
    expect(isValidAddress(validUserFriendly)).toBe(true);
  });

  it('отклоняет пустую строку и мусор', () => {
    expect(isValidAddress('')).toBe(false);
    expect(isValidAddress('not-an-address')).toBe(false);
    expect(isValidAddress('UQ' + 'x'.repeat(10))).toBe(false);
  });
});

describe('parseTransferCommentFromBody', () => {
  it('читает текст при op=0', () => {
    const body = beginCell().storeUint(0, 32).storeStringTail('payment').endCell();
    expect(parseTransferCommentFromBody(body)).toBe('payment');
  });

  it('пусто без body или при другом op', () => {
    expect(parseTransferCommentFromBody(undefined)).toBe('');
    const other = beginCell().storeUint(0xff, 32).endCell();
    expect(parseTransferCommentFromBody(other)).toBe('');
  });
});

describe('getTonClient', () => {
  it('после reset возвращает новый экземпляр', () => {
    const a = getTonClient();
    resetTonClientToDefault();
    const b = getTonClient();
    expect(a).not.toBe(b);
  });
});

describe('getBalance (mock TonClient)', () => {
  const addr = Address.parse(
    '0:0000000000000000000000000000000000000000000000000000000000000001'
  ).toString({ bounceable: false, testOnly: true });

  beforeEach(() => {
    const mock: Pick<TonClient, 'getBalance'> = {
      getBalance: vi.fn().mockResolvedValue(toNano('12.5')),
    };
    injectTonClientForTests(mock as unknown as TonClient);
  });

  it('возвращает баланс в TON как строку', async () => {
    const b = await getBalance(addr);
    expect(b).toBe('12.5');
  });
});

describe('getTransactions — нормализация (mock)', () => {
  const addr = Address.parse(
    '0:0000000000000000000000000000000000000000000000000000000000000003'
  ).toString({ bounceable: false, testOnly: true });

  const src = Address.parse(
    '0:0000000000000000000000000000000000000000000000000000000000000001'
  );
  const dest = Address.parse(
    '0:0000000000000000000000000000000000000000000000000000000000000002'
  );

  it('входящее: from, сумма, не исходящая', async () => {
    const mockTx = {
      inMessage: {
        info: { type: 'internal' as const, src, value: { coins: toNano('3') } },
        body: undefined,
      },
      outMessages: { values: () => [] as unknown[] },
      totalFees: { coins: toNano('0.01') },
      hash: () => Buffer.from('aabb', 'hex'),
      lt: 77n,
      now: 1_700_000_111,
    };
    const mock: Pick<TonClient, 'getTransactions'> = {
      getTransactions: vi.fn().mockResolvedValue([mockTx]),
    };
    injectTonClientForTests(mock as unknown as TonClient);

    const list = await getTransactions(addr, 5);
    expect(list).toHaveLength(1);
    expect(list[0].isOutgoing).toBe(false);
    expect(list[0].amount).toBe('3');
    expect(list[0].from).toBe(
      src.toString({ bounceable: false, testOnly: true })
    );
    expect(list[0].hash).toBe('aabb');
    expect(list[0].lt).toBe('77');
  });

  it('исходящее: to, isOutgoing', async () => {
    const mockTx = {
      inMessage: null,
      outMessages: {
        values: () => [
          {
            info: {
              type: 'internal' as const,
              dest,
              value: { coins: toNano('0.25') },
            },
            body: undefined,
          },
        ],
      },
      totalFees: { coins: toNano('0.02') },
      hash: () => Buffer.from('ccdd', 'hex'),
      lt: 88n,
      now: 1_700_000_222,
    };
    const mock: Pick<TonClient, 'getTransactions'> = {
      getTransactions: vi.fn().mockResolvedValue([mockTx]),
    };
    injectTonClientForTests(mock as unknown as TonClient);

    const list = await getTransactions(addr, 5);
    expect(list[0].isOutgoing).toBe(true);
    expect(list[0].to).toBe(
      dest.toString({ bounceable: false, testOnly: true })
    );
    expect(list[0].amount).toBe('0.25');
  });

  it('комментарий из входящего сообщения', async () => {
    const commentBody = beginCell()
      .storeUint(0, 32)
      .storeStringTail('memo-in')
      .endCell();
    const mockTx = {
      inMessage: {
        info: {
          type: 'internal' as const,
          src,
          value: { coins: toNano('1') },
        },
        body: commentBody,
      },
      outMessages: { values: () => [] as unknown[] },
      totalFees: { coins: toNano('0.01') },
      hash: () => Buffer.from('ee', 'hex'),
      lt: 3n,
      now: 200,
    };
    injectTonClientForTests({
      getTransactions: vi.fn().mockResolvedValue([mockTx]),
    } as unknown as TonClient);

    const list = await getTransactions(addr, 3);
    expect(list[0].comment).toBe('memo-in');
  });

  it('комментарий из исходящего сообщения', async () => {
    const commentBody = beginCell()
      .storeUint(0, 32)
      .storeStringTail('memo-out')
      .endCell();
    const mockTx = {
      inMessage: null,
      outMessages: {
        values: () => [
          {
            info: {
              type: 'internal' as const,
              dest,
              value: { coins: toNano('0.1') },
            },
            body: commentBody,
          },
        ],
      },
      totalFees: { coins: toNano('0.01') },
      hash: () => Buffer.from('ff', 'hex'),
      lt: 4n,
      now: 201,
    };
    injectTonClientForTests({
      getTransactions: vi.fn().mockResolvedValue([mockTx]),
    } as unknown as TonClient);

    const list = await getTransactions(addr, 3);
    expect(list[0].comment).toBe('memo-out');
  });
});

describe('sendTon (mock open / contract)', () => {
  let sendTransfer: ReturnType<typeof vi.fn>;
  let getSeqno: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendTransfer = vi.fn().mockResolvedValue(undefined);
    getSeqno = vi.fn().mockResolvedValue(3);
    const open = vi.fn().mockReturnValue({ getSeqno, sendTransfer });
    const mock: Pick<TonClient, 'open'> = { open };
    injectTonClientForTests(mock as unknown as TonClient);
  });

  it('вызывает sendTransfer с ожидаемыми аргументами', async () => {
    const to = Address.parse(
      '0:0000000000000000000000000000000000000000000000000000000000000002'
    ).toString({ bounceable: false, testOnly: true });

    await sendTon({
      publicKey: Buffer.alloc(32, 7),
      secretKey: Buffer.alloc(64, 8),
      to,
      amount: '1.5',
      comment: 'hi',
    });

    expect(getSeqno).toHaveBeenCalled();
    expect(sendTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        seqno: 3,
        secretKey: expect.any(Buffer),
      })
    );
  });
});

describe('waitForTransaction', () => {
  it('возвращает true, когда появилась транзакция с новым lt', async () => {
    const addr = Address.parse(
      '0:0000000000000000000000000000000000000000000000000000000000000004'
    ).toString({ bounceable: false, testOnly: true });

    const mockTx = {
      lt: 999n,
      inMessage: null,
      outMessages: { values: () => [] },
      totalFees: { coins: 0n },
      hash: () => Buffer.alloc(0),
      now: 0,
    };
    const mock: Pick<TonClient, 'getTransactions'> = {
      getTransactions: vi.fn().mockResolvedValue([mockTx]),
    };
    injectTonClientForTests(mock as unknown as TonClient);

    const ok = await waitForTransaction(addr, '1', 5000);
    expect(ok).toBe(true);
  });

  it('возвращает false по таймауту', async () => {
    vi.useFakeTimers();
    const addr = Address.parse(
      '0:0000000000000000000000000000000000000000000000000000000000000005'
    ).toString({ bounceable: false, testOnly: true });

    const mockTx = {
      lt: 5n,
      inMessage: null,
      outMessages: { values: () => [] },
      totalFees: { coins: 0n },
      hash: () => Buffer.alloc(0),
      now: 0,
    };
    const mock: Pick<TonClient, 'getTransactions'> = {
      getTransactions: vi.fn().mockResolvedValue([mockTx]),
    };
    injectTonClientForTests(mock as unknown as TonClient);

    const p = waitForTransaction(addr, '5', 8000);
    await vi.advanceTimersByTimeAsync(9000);
    const ok = await p;
    expect(ok).toBe(false);
    vi.useRealTimers();
  });
});
