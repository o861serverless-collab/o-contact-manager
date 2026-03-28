'use strict';

/**
 * contactMapper.js — Transform contact JSON thành các Firestore documents
 *
 * Hàm chính: buildContactDocs(contactJson, options)
 * Output: { contactId, indexDoc, detailDoc, emailLookupDocs, udKeyUpdates }
 *
 * Schema target: docs/database-architecture.md
 */

const { nanoid } = require('nanoid');
const { buildSearchTokens, normalize } = require('./searchTokens');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Encode document ID cho lookup collections
 * Dấu "." → "," (Firestore không cho "." trong path segments)
 * @param {string} key
 * @returns {string}
 */
function encodeDocId(key) {
  return key.replace(/\./g, ',');
}

/**
 * Extract domain từ email
 * "user@gmail.com" → "gmail.com"
 * @param {string} email
 * @returns {string|null}
 */
function domainOf(email) {
  if (!email || !email.includes('@')) return null;
  return email.split('@')[1].toLowerCase();
}

/**
 * Lấy tất cả emails từ contact JSON (dedup, lowercase)
 * @param {object} contact — object contact raw
 * @returns {string[]}
 */
function extractEmails(contact) {
  const emails = [];

  // Format mảng: contact.emails[].value
  if (Array.isArray(contact.emails)) {
    for (const e of contact.emails) {
      const v = (e.value || e.email || '').toLowerCase().trim();
      if (v && v.includes('@')) emails.push(v);
    }
  }

  // Format flat: contact.email (string hoặc mảng)
  if (contact.email) {
    const flat = Array.isArray(contact.email) ? contact.email : [contact.email];
    for (const e of flat) {
      const v = (e || '').toLowerCase().trim();
      if (v && v.includes('@')) emails.push(v);
    }
  }

  // Dedup
  return [...new Set(emails)];
}

/**
 * Lấy tất cả phones từ contact JSON
 * @param {object} contact
 * @returns {string[]}
 */
function extractPhones(contact) {
  const phones = [];

  if (Array.isArray(contact.phones)) {
    for (const p of contact.phones) {
      const v = (p.value || p.phone || '').trim();
      if (v) phones.push(v);
    }
  }

  if (contact.phone) {
    const flat = Array.isArray(contact.phone) ? contact.phone : [contact.phone];
    for (const p of flat) {
      if (p) phones.push(String(p).trim());
    }
  }

  return [...new Set(phones)];
}

/**
 * Lấy displayName từ nhiều format có thể
 * @param {object} contact
 * @returns {string}
 */
function extractDisplayName(contact) {
  if (contact.displayName) return contact.displayName.trim();
  if (contact.fn) return contact.fn.trim(); // vCard FN field
  if (contact.name) {
    const n = contact.name;
    if (typeof n === 'string') return n.trim();
    const parts = [n.given, n.middle, n.family].filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  return '';
}

/**
 * Lấy tất cả userDefined keys từ contact
 * @param {object} userDefined — object key-value
 * @returns {string[]}
 */
function extractUdKeys(userDefined) {
  if (!userDefined || typeof userDefined !== 'object') return [];
  return Object.keys(userDefined).filter(k => k && userDefined[k] != null);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Build tất cả Firestore documents cho 1 contact
 *
 * @param {object} contactJson — dữ liệu contact đầu vào (nhiều format)
 * @param {object} [options]
 * @param {string} [options.contactId] — nếu không truyền, tự sinh nanoid
 * @param {string} [options.sourceFile] — tên file VCF gốc
 * @param {Date}   [options.importedAt] — thời điểm import
 * @param {number} [options.version] — version số, default 1
 *
 * @returns {{
 *   contactId: string,
 *   indexDoc: object,
 *   detailDoc: object,
 *   emailLookupDocs: Array<{ docId: string, data: object }>,
 *   udKeyUpdates: Array<{ docId: string, key: string, contactId: string, operation: 'add'|'remove' }>
 * }}
 */
function buildContactDocs(contactJson, options = {}) {
  const {
    contactId = `uid_${nanoid(12)}`,
    sourceFile = null,
    importedAt = new Date(),
    version = 1,
  } = options;

  // Normalize input — hỗ trợ format { contact: {...}, userDefined: {...} }
  // hoặc flat format { displayName, emails, ... }
  const contactData = contactJson.contact || contactJson;
  const userDefined = contactJson.userDefined || contactData.userDefined || {};

  // ── Extract fields ────────────────────────────────────────────────────────
  const displayName = extractDisplayName(contactData);
  const nameNormalized = normalize(displayName);
  const organization = (contactData.organization || contactData.org || '').trim();

  const allEmails = extractEmails(contactData);
  const primaryEmail = allEmails[0] || '';
  const emailDomain = domainOf(primaryEmail) || '';
  const allDomains = [...new Set(allEmails.map(domainOf).filter(Boolean))];

  const allPhones = extractPhones(contactData);
  const primaryPhone = allPhones[0] || '';

  const categories = Array.isArray(contactData.categories) ? contactData.categories : [];
  const tags = Array.isArray(contactData.tags) ? contactData.tags : [];

  const photoUrl = contactData.photoUrl || contactData.photo || null;

  const userDefinedKeys = extractUdKeys(userDefined);
  const hasUserDefined = userDefinedKeys.length > 0;

  const now = new Date().toISOString();
  const importedAtISO = importedAt instanceof Date ? importedAt.toISOString() : importedAt;

  // ── Search tokens ─────────────────────────────────────────────────────────
  const searchTokens = buildSearchTokens({
    displayName,
    organization,
    primaryEmail,
    allEmails,
  });

  // ── contacts_index document ───────────────────────────────────────────────
  const indexDoc = {
    id: contactId,
    displayName,
    nameNormalized,
    primaryEmail,
    emailDomain,
    allEmails,
    allDomains,
    primaryPhone,
    organization,
    photoUrl,
    categories,
    tags,
    searchTokens,
    userDefinedKeys,
    hasUserDefined,
    udKeyCount: userDefinedKeys.length,
    emailCount: allEmails.length,
    phoneCount: allPhones.length,
    createdAt: now,
    updatedAt: now,
    importedAt: importedAtISO,
    sourceFile,
    version,
  };

  // Bỏ null/undefined để giữ doc size nhỏ
  if (!photoUrl) delete indexDoc.photoUrl;
  if (!sourceFile) delete indexDoc.sourceFile;
  if (!organization) delete indexDoc.organization;
  if (!primaryPhone) delete indexDoc.primaryPhone;

  // ── contacts_detail document ──────────────────────────────────────────────
  const detailDoc = {
    id: contactId,
    contact: {
      displayName,
      name: contactData.name || null,
      emails: (contactData.emails || allEmails.map(v => ({ type: ['INTERNET'], value: v }))),
      phones: (contactData.phones || allPhones.map(v => ({ type: ['VOICE'], value: v }))),
      organization,
      categories,
    },
    userDefined,
    vcfRaw: contactJson.vcfRaw || contactData.vcfRaw || null,
    createdAt: now,
    updatedAt: now,
    version,
  };

  // Bỏ null fields
  if (!detailDoc.contact.name) delete detailDoc.contact.name;
  if (!detailDoc.vcfRaw) delete detailDoc.vcfRaw;

  // ── email_lookup documents ─────────────────────────────────────────────────
  const emailLookupDocs = allEmails.map((email, idx) => {
    // email type/label từ contact.emails nếu có
    const emailObj = Array.isArray(contactData.emails)
      ? contactData.emails.find(e => (e.value || '').toLowerCase() === email)
      : null;

    return {
      docId: encodeDocId(email),
      data: {
        email,
        contactId,
        isPrimary: idx === 0,
        type: emailObj ? (emailObj.type || ['INTERNET']) : ['INTERNET'],
        label: emailObj ? (emailObj.label || null) : null,
      },
    };
  });

  // ── ud_key_lookup updates (chỉ là instruction, writeContact sẽ thực thi) ──
  const udKeyUpdates = userDefinedKeys.map(key => ({
    docId: encodeDocId(key),
    key,
    contactId,
    operation: 'add',
  }));

  return {
    contactId,
    indexDoc,
    detailDoc,
    emailLookupDocs,
    udKeyUpdates,
  };
}

module.exports = {
  buildContactDocs,
  encodeDocId,
  extractEmails,
  extractPhones,
  extractDisplayName,
  extractUdKeys,
};
