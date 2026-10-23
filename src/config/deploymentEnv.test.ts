import { describe, expect, it } from 'vitest';
import { alignChatGatewayToPage, alignUrlToPage, isProductionPageHost } from './deploymentEnv';

describe('alignUrlToPage', () => {
  it('rewrites staging API and socket when the page is production', () => {
    expect(alignUrlToPage('https://staging.myvagon.com/api/shipper/v1', 'www.myvagon.com')).toBe(
      'https://myvagon.com/api/shipper/v1',
    );
    expect(alignUrlToPage('https://staging.myvagon.com', 'myvagon.com')).toBe('https://myvagon.com');
    expect(alignUrlToPage('https://staging.myvagon.com/socket.io/?EIO=4', 'www.myvagon.com')).toBe(
      'https://myvagon.com/socket.io/?EIO=4',
    );
  });

  it('leaves staging pages and already-correct URLs alone', () => {
    expect(alignUrlToPage('https://staging.myvagon.com/api/shipper/v1', 'staging.myvagon.com')).toBe(
      'https://staging.myvagon.com/api/shipper/v1',
    );
    expect(alignUrlToPage('https://myvagon.com/api/shipper/v1', 'www.myvagon.com')).toBe(
      'https://myvagon.com/api/shipper/v1',
    );
    expect(alignUrlToPage('/api/shipper/v1', 'www.myvagon.com')).toBe('/api/shipper/v1');
    expect(alignUrlToPage('http://localhost:8000', 'localhost')).toBe('http://localhost:8000');
  });

  it('keeps www.myvagon.ai on the staging API and gateway', () => {
    expect(alignUrlToPage('https://staging.myvagon.com/api/shipper/v1', 'www.myvagon.ai')).toBe(
      'https://staging.myvagon.com/api/shipper/v1',
    );
    expect(alignChatGatewayToPage('https://98-82-195-67.sslip.io/chat', 'www.myvagon.ai')).toBe(
      'https://98-82-195-67.sslip.io/chat',
    );
  });

  it('recognises production hosts only', () => {
    expect(isProductionPageHost('www.myvagon.com')).toBe(true);
    // Served by the Amplify staging branch; no production API exists for it yet.
    expect(isProductionPageHost('www.myvagon.ai')).toBe(false);
    expect(isProductionPageHost('myvagon.ai')).toBe(false);
    expect(isProductionPageHost('staging.myvagon.com')).toBe(false);
    expect(isProductionPageHost('staging.dska1yaj62qsm.amplifyapp.com')).toBe(false);
  });

  it('drops the staging chat gateway on production pages only', () => {
    const stagingGateway = 'https://98-82-195-67.sslip.io/chat';
    expect(alignChatGatewayToPage(stagingGateway, 'www.myvagon.com')).toBe('');
    expect(alignChatGatewayToPage(stagingGateway, 'myvagon.com')).toBe('');
    expect(alignChatGatewayToPage('https://staging.myvagon.com/chat', 'www.myvagon.com')).toBe('');
    expect(alignChatGatewayToPage(stagingGateway, 'staging.dska1yaj62qsm.amplifyapp.com')).toBe(
      stagingGateway,
    );
    expect(alignChatGatewayToPage('https://chat.myvagon.com/chat', 'www.myvagon.com')).toBe(
      'https://chat.myvagon.com/chat',
    );
    expect(alignChatGatewayToPage('', 'www.myvagon.com')).toBe('');
  });
});
