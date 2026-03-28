'use strict';

/**
 * tests/contactMapper.test.js
 * Unit tests cho TASK-04: searchTokens + contactMapper
 */

const { buildSearchTokens, normalize, tokensFromText } = require('../functions/utils/searchTokens');
const { buildContactDocs, encodeDocId, extractEmails } = require('../functions/utils/contactMapper');

// ─── searchTokens tests ───────────────────────────────────────────────────

describe('normalize()', () => {
  test('lowercase + trim', () => {
    expect(normalize('  John DOE  ')).toBe('john doe');
  });

  test('remove diacritics tiếng Việt', () => {
    expect(normalize('Nguyễn Văn An')).toBe('nguyen van an');
    expect(normalize('Trần Thị Bình')).toBe('tran thi binh');
    expect(normalize('Lê Hoàng Ký')).toBe('le hoang ky');
  });

  test('empty string', () => {
    expect(normalize('')).toBe('');
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
  });
});

describe('tokensFromText()', () => {
  test('prefix ngrams từ min length 2', () => {
    const tokens = tokensFromText('john');
    expect(tokens).toContain('jo');
    expect(tokens).toContain('joh');
    expect(tokens).toContain('john');
    expect(tokens).not.toContain('j'); // 1 char bị bỏ
  });

  test('multi-word: sinh prefix cho từng từ + full phrase', () => {
    const tokens = tokensFromText('john doe');
    expect(tokens).toContain('jo');
    expect(tokens).toContain('do');
    expect(tokens).toContain('doe');
    expect(tokens).toContain('john doe'); // full phrase
  });

  test('tiếng Việt normalize trước khi sinh token', () => {
    const tokens = tokensFromText('Nguyễn Hậu');
    expect(tokens).toContain('ng');
    expect(tokens).toContain('ngu');
    expect(tokens).toContain('ha');
    expect(tokens).toContain('hau');
  });
});

describe('buildSearchTokens()', () => {
  test('basic contact', () => {
    const tokens = buildSearchTokens({
      displayName: 'John Doe',
      organization: 'ACME Corp',
      primaryEmail: 'john@acme.com',
      allEmails: ['john@acme.com'],
    });
    expect(tokens).toContain('jo');
    expect(tokens).toContain('john');
    expect(tokens).toContain('ac');
    expect(tokens).toContain('acme');
    // email prefix (local part)
    expect(tokens).toContain('jo'); // từ "john" trong email
  });

  test('dedup tokens', () => {
    const tokens = buildSearchTokens({
      displayName: 'John',
      primaryEmail: 'john@test.com',
      allEmails: ['john@test.com'],
    });
    // "jo", "joh", "john" chỉ xuất hiện 1 lần mỗi token
    const joCount = tokens.filter(t => t === 'jo').length;
    expect(joCount).toBe(1);
  });

  test('empty input không crash', () => {
    const tokens = buildSearchTokens({ displayName: '' });
    expect(Array.isArray(tokens)).toBe(true);
  });
});

// ─── contactMapper tests ──────────────────────────────────────────────────

describe('encodeDocId()', () => {
  test('thay . bằng ,', () => {
    expect(encodeDocId('gitea.token')).toBe('gitea,token');
    expect(encodeDocId('go.2Fa.Secret')).toBe('go,2Fa,Secret');
    expect(encodeDocId('ongtrieuhau@gmail.com')).toBe('ongtrieuhau@gmail,com');
  });

  test('không có . thì giữ nguyên', () => {
    expect(encodeDocId('mykey')).toBe('mykey');
  });
});

describe('extractEmails()', () => {
  test('format mảng emails[].value', () => {
    const contact = {
      emails: [
        { type: ['INTERNET', 'WORK'], value: 'work@example.com' },
        { type: ['INTERNET', 'HOME'], value: 'home@gmail.com' },
      ],
    };
    const emails = extractEmails(contact);
    expect(emails).toEqual(['work@example.com', 'home@gmail.com']);
  });

  test('lowercase + dedup', () => {
    const contact = {
      emails: [
        { value: 'USER@GMAIL.COM' },
        { value: 'user@gmail.com' }, // duplicate
      ],
    };
    const emails = extractEmails(contact);
    expect(emails).toHaveLength(1);
    expect(emails[0]).toBe('user@gmail.com');
  });

  test('bỏ email không có @', () => {
    const contact = {
      emails: [{ value: 'notanemail' }, { value: 'valid@test.com' }],
    };
    const emails = extractEmails(contact);
    expect(emails).toEqual(['valid@test.com']);
  });
});

describe('buildContactDocs()', () => {
  const sampleContact = {
    contact: {
      displayName: 'John Doe',
      name: { given: 'John', family: 'Doe' },
      emails: [
        { type: ['INTERNET', 'WORK'], value: 'john@work.com' },
        { type: ['INTERNET', 'HOME'], value: 'john@gmail.com' },
      ],
      phones: [{ type: ['CELL'], value: '0901234567' }],
      organization: 'ACME Corp',
      categories: ['myContacts'],
    },
    userDefined: {
      'github.token': 'ghp_xxx',
      'gitea.token': 'gta_yyy',
    },
  };

  let result;
  beforeAll(() => {
    result = buildContactDocs(sampleContact, {
      contactId: 'uid_test123',
      sourceFile: 'test.vcf',
    });
  });

  test('trả về đúng cấu trúc', () => {
    expect(result).toHaveProperty('contactId', 'uid_test123');
    expect(result).toHaveProperty('indexDoc');
    expect(result).toHaveProperty('detailDoc');
    expect(result).toHaveProperty('emailLookupDocs');
    expect(result).toHaveProperty('udKeyUpdates');
  });

  test('indexDoc có đủ fields quan trọng', () => {
    const idx = result.indexDoc;
    expect(idx.id).toBe('uid_test123');
    expect(idx.displayName).toBe('John Doe');
    expect(idx.primaryEmail).toBe('john@work.com');
    expect(idx.allEmails).toEqual(['john@work.com', 'john@gmail.com']);
    expect(idx.allDomains).toContain('work.com');
    expect(idx.allDomains).toContain('gmail.com');
    expect(idx.emailCount).toBe(2);
    expect(idx.phoneCount).toBe(1);
    expect(idx.hasUserDefined).toBe(true);
    expect(idx.udKeyCount).toBe(2);
    expect(idx.userDefinedKeys).toContain('github.token');
    expect(idx.userDefinedKeys).toContain('gitea.token');
    expect(idx.searchTokens.length).toBeGreaterThan(0);
  });

  test('emailLookupDocs có đúng số lượng', () => {
    expect(result.emailLookupDocs).toHaveLength(2);
    const primary = result.emailLookupDocs.find(e => e.data.isPrimary);
    expect(primary).toBeDefined();
    expect(primary.data.email).toBe('john@work.com');
    expect(primary.docId).toBe('john@work,com');
  });

  test('udKeyUpdates đúng', () => {
    expect(result.udKeyUpdates).toHaveLength(2);
    const githubUpdate = result.udKeyUpdates.find(u => u.key === 'github.token');
    expect(githubUpdate).toBeDefined();
    expect(githubUpdate.docId).toBe('github,token');
    expect(githubUpdate.operation).toBe('add');
  });

  test('detailDoc giữ nguyên userDefined', () => {
    expect(result.detailDoc.userDefined).toEqual({
      'github.token': 'ghp_xxx',
      'gitea.token': 'gta_yyy',
    });
  });

  test('tự sinh contactId nếu không truyền', () => {
    const r = buildContactDocs(sampleContact);
    expect(r.contactId).toMatch(/^uid_/);
    expect(r.contactId).not.toBe('uid_test123');
  });

  test('flat format contact (không có wrapper)', () => {
    const flat = {
      displayName: 'Jane Smith',
      emails: [{ value: 'jane@test.com' }],
    };
    const r = buildContactDocs(flat);
    expect(r.indexDoc.displayName).toBe('Jane Smith');
    expect(r.indexDoc.primaryEmail).toBe('jane@test.com');
  });
});
