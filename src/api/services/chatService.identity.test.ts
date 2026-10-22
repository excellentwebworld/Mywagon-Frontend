import { describe, expect, it } from 'vitest';
import { chatInitials, shipperChatIconUrl } from './chatService';

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

  it('generates initials from the company name and skips the legal suffix', () => {
    expect(chatInitials('ΒΙΚΟΣ- ΗΠΕΙΡΩΤΙΚΗ ΒΙΟΜΗΧΑΝΙΑ ΕΜΦΙΑΛΩΣΕΩΝ Α.Ε')).toBe('ΒΗ');
    const url = shipperChatIconUrl({
      account_profile_picture: '  ',
      company_name: 'ΒΙΚΟΣ- ΗΠΕΙΡΩΤΙΚΗ ΒΙΟΜΗΧΑΝΙΑ ΕΜΦΙΑΛΩΣΕΩΝ Α.Ε',
      first_name: 'ΗΡΑΚΛΗΣ',
      last_name: 'ΣΑΚΚΑΣ',
    });
    expect(url).toContain(encodeURIComponent('ΒΗ'));
    expect(url).not.toContain(encodeURIComponent('Α.Ε'));
  });
});
