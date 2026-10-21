import { describe, expect, it } from 'vitest';
import { shipperChatIconUrl } from './chatService';

describe('shipperChatIconUrl', () => {
  it('uses the account profile picture when one is set', () => {
    expect(
      shipperChatIconUrl({
        account_profile_picture: 'https://cdn.example/account.jpg',
        company_name: 'Aegean Transport',
        first_name: 'Bob',
        last_name: 'Anderson',
      })
    ).toBe('https://cdn.example/account.jpg');
  });

  it('generates initials from the company name when there is no profile picture', () => {
    const url = shipperChatIconUrl({
      account_profile_picture: '  ',
      company_name: 'Aegean Transport',
      first_name: 'Bob',
      last_name: 'Anderson',
    });
    expect(url).toContain('ui-avatars.com');
    expect(url).toContain(encodeURIComponent('Aegean Transport'));
    expect(url).not.toContain('logo');
  });
});
