'use strict';

/**
 * searchTokens.js — Build prefix-ngram search tokens
 *
 * Chiến lược:
 * - NFD normalize để xử lý tiếng Việt (ế, ồ, ă, ...)
 * - Prefix từ ký tự thứ 2 trở đi (bỏ 1-char quá ngắn)
 * - Lowercase toàn bộ
 * - Dedup cuối cùng bằng Set
 * - Cắt ngắn mỗi token tối đa MAX_TOKEN_LEN để tránh Firestore size limit
 */

const MAX_TOKEN_LEN = 20;
const MIN_TOKEN_LEN = 2;

/**
 * Chuẩn hóa chuỗi: lowercase + remove diacritics (NFD) + trim
 * Giữ lại khoảng trắng để tokenize theo từ
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ diacritics
    .toLowerCase()
    .trim();
}

/**
 * Sinh prefix tokens cho 1 từ
 * "john" → ["jo", "joh", "john"]
 * @param {string} word
 * @returns {string[]}
 */
function prefixesOf(word) {
  const tokens = [];
  const w = word.slice(0, MAX_TOKEN_LEN);
  for (let i = MIN_TOKEN_LEN; i <= w.length; i++) {
    tokens.push(w.slice(0, i));
  }
  return tokens;
}

/**
 * Build search tokens từ một chuỗi văn bản
 * Tách theo khoảng trắng, sinh prefix cho từng từ
 * Thêm cả toàn bộ chuỗi (tìm "john doe" exact)
 * @param {string} text
 * @returns {string[]}
 */
function tokensFromText(text) {
  const norm = normalize(text);
  if (!norm) return [];

  const tokens = [];
  const words = norm.split(/\s+/).filter(Boolean);

  for (const word of words) {
    tokens.push(...prefixesOf(word));
  }

  // Thêm full phrase nếu có nhiều từ (vd: "john doe")
  if (words.length > 1) {
    const phrase = words.join(' ').slice(0, MAX_TOKEN_LEN);
    if (phrase.length >= MIN_TOKEN_LEN) {
      tokens.push(phrase);
    }
  }

  return tokens;
}

/**
 * Build toàn bộ searchTokens cho 1 contact
 * Lấy từ: displayName, organization, primaryEmail, allEmails
 *
 * @param {object} params
 * @param {string} params.displayName
 * @param {string} [params.organization]
 * @param {string} [params.primaryEmail]
 * @param {string[]} [params.allEmails]
 * @returns {string[]} mảng token đã dedup, sorted
 */
function buildSearchTokens({ displayName, organization, primaryEmail, allEmails = [] }) {
  const tokenSet = new Set();

  // displayName — quan trọng nhất
  for (const t of tokensFromText(displayName || '')) tokenSet.add(t);

  // organization
  if (organization) {
    for (const t of tokensFromText(organization)) tokenSet.add(t);
  }

  // email prefix (phần trước @)
  const emailsToIndex = [primaryEmail, ...allEmails].filter(Boolean);
  for (const email of emailsToIndex) {
    const local = email.split('@')[0];
    if (local) {
      for (const t of tokensFromText(local)) tokenSet.add(t);
    }
  }

  return Array.from(tokenSet).sort();
}

module.exports = {
  buildSearchTokens,
  normalize,
  tokensFromText,
};
