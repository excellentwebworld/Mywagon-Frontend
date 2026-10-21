/**
 * QA retest #3 (2026-10-10), the shipper-facing side:
 *  1. a tool's model-facing error text ("(For the assistant: …") was drawn as a
 *     red banner above the reply;
 *  2. the gateway died mid "Create draft" and the page said "Working with your
 *     MYVAGON data…" for minutes;
 *  3. an aborted fetch read "Something went wrong: Failed to fetch".
 */
import { describe, expect, it, vi } from 'vitest';
import { readFrames } from './useChat';
import { GatewayStalledError } from './streamWatchdog';
import {
  isNetworkError,
  isRetryableError,
  networkMessage,
  shipperSafeSummary,
  stalledMessage,
  userFacingError,
} from '../utils/userFacingError';

const COPY: Record<string, string> = {
  'vagonai.live.timeout': 'TIMEOUT-COPY',
  'vagonai.live.network': 'NETWORK-COPY',
  'vagonai.live.stalled': 'STALLED-COPY',
};
const t = (key: string, fallback?: string) => COPY[key] ?? fallback ?? key;

function sseResponse(frames: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const f of frames) controller.enqueue(encoder.encode(f));
      controller.close();
    },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
}

const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

describe('item 1: a failed tool never paints model-facing text', () => {
  it('drops the SID-000001 summary the QA run saw', () => {
    expect(
      shipperSafeSummary(
        'No shipment found for SID-000001. (For the assistant: tell the shipper plainly and do not retry with another id.)',
      ),
    ).toBeNull();
    expect(shipperSafeSummary('MCP error -32602: Input validation error: Invalid arguments for tool get_shipment')).toBeNull();
    expect(shipperSafeSummary('SQLSTATE[42S22]: Column not found')).toBeNull();
  });

  it('keeps a summary written for the shipper, and ignores empty or non-text values', () => {
    expect(shipperSafeSummary('  Your plan allows 5 drafts a day.  ')).toBe('Your plan allows 5 drafts a day.');
    expect(shipperSafeSummary('')).toBeNull();
    expect(shipperSafeSummary(undefined)).toBeNull();
    expect(shipperSafeSummary({ text: 'x' })).toBeNull();
  });

  it('the banner a tool_result frame would set is the filtered summary', async () => {
    const banners: Array<string | null> = [];
    await readFrames(
      sseResponse([
        frame('tool_result', {
          name: 'get_shipment',
          status: 'error',
          summary: 'Shipment SID-000001 does not exist. (For the assistant: say so in the shipper\'s language.)',
        }),
        frame('done', { message: 'I could not find shipment SID-000001.' }),
      ]),
      (event, data) => {
        if (event === 'tool_result' && data.status === 'error') banners.push(shipperSafeSummary(data.summary));
      },
    );
    expect(banners).toEqual([null]);
  });
});

describe('item 2: the stream watchdog is fed by every chunk', () => {
  it('readFrames calls onChunk per chunk and dispatches split frames once whole', async () => {
    const onChunk = vi.fn();
    const events: string[] = [];
    const whole = frame('token', { text: 'hi' }) + frame('done', { message: 'hi' });
    await readFrames(
      sseResponse([whole.slice(0, 7), whole.slice(7, 30), whole.slice(30)]),
      (event) => events.push(event),
      undefined,
      'empty',
      onChunk,
    );
    expect(onChunk).toHaveBeenCalledTimes(3);
    expect(events).toEqual(['token', 'done']);
  });

  it('a stalled gateway reads as the stalled sentence, and is retryable', () => {
    const stalled = new GatewayStalledError();
    expect(userFacingError(stalled, t, 'fallback')).toBe('STALLED-COPY');
    expect(isRetryableError(stalled)).toBe(true);
    expect(stalledMessage(t)).toBe('STALLED-COPY');
  });
});

describe('item 3: network failures in plain words', () => {
  it.each([
    'Failed to fetch',
    'NetworkError when attempting to fetch resource.',
    'Load failed',
    'connection closed',
    'read ECONNRESET',
    'Bad Gateway',
  ])('"%s" maps to the network sentence', (message) => {
    expect(isNetworkError(new TypeError(message))).toBe(true);
    expect(userFacingError(new TypeError(message), t, 'fallback')).toBe('NETWORK-COPY');
    expect(isRetryableError(new TypeError(message))).toBe(true);
  });

  it('a timeout still reads as the timeout sentence (QA retest #2 copy)', () => {
    expect(userFacingError(new Error('The operation was aborted due to timeout'), t, 'fallback')).toBe('TIMEOUT-COPY');
    expect(userFacingError(new Error('Gateway responded 504'), t, 'fallback')).not.toBe('NETWORK-COPY');
  });

  it('leaves real messages alone and has an EN default', () => {
    expect(isNetworkError(new Error('Only Excel and CSV files can be imported.'))).toBe(false);
    expect(userFacingError(new Error('Only Excel and CSV files can be imported.'), t, 'fallback')).toBe(
      'Only Excel and CSV files can be imported.',
    );
    expect(networkMessage((_k, fb) => fb ?? '')).toMatch(/connection/i);
  });
});
