'use strict';

/**
 * writeContact.js — Atomic batch write & delete contacts
 *
 * writeContact(contactJson, options) — tạo mới hoặc overwrite 1 contact
 * deleteContact(contactId)           — xóa contact + cleanup lookups
 *
 * Nguyên tắc:
 * - 1 contact = 1 Firestore batch (atomically write index + detail + lookups)
 * - Batch limit 500 ops → an toàn vì 1 contact thường < 60 ops
 * - ud_key_lookup dùng FieldValue.arrayUnion / arrayRemove
 * - Luôn cleanup email_lookup cũ trước khi write mới (khi update)
 */

const { getFirestore, FieldValue } = require('./firebase-admin');
const { buildContactDocs, encodeDocId } = require('./contactMapper');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Lấy email_lookup docIds hiện tại của 1 contact (từ contacts_index)
 * Dùng khi update để biết cần xóa email_lookup nào cũ
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} contactId
 * @returns {Promise<string[]>} — mảng docIds (encoded) của email_lookup
 */
async function getExistingEmailDocIds(db, contactId) {
  const snap = await db.collection('contacts_index').doc(contactId).get();
  if (!snap.exists) return [];
  const data = snap.data();
  return (data.allEmails || []).map(email => encodeDocId(email));
}

/**
 * Lấy userDefinedKeys hiện tại của 1 contact (từ contacts_index)
 * Dùng khi update để biết cần arrayRemove ud_key_lookup nào cũ
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} contactId
 * @returns {Promise<string[]>} — mảng keys
 */
async function getExistingUdKeys(db, contactId) {
  const snap = await db.collection('contacts_index').doc(contactId).get();
  if (!snap.exists) return [];
  return snap.data().userDefinedKeys || [];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Write 1 contact vào Firestore (tạo mới hoặc overwrite)
 *
 * @param {object} contactJson — dữ liệu contact đầu vào
 * @param {object} [options]
 * @param {string} [options.contactId]    — bắt buộc nếu update (không truyền = tạo mới)
 * @param {string} [options.sourceFile]
 * @param {Date}   [options.importedAt]
 * @param {boolean} [options.isUpdate]    — true nếu đang update contact đã có
 *
 * @returns {Promise<{ contactId: string, emailCount: number, udKeyCount: number }>}
 */
async function writeContact(contactJson, options = {}) {
  const db = getFirestore();
  const { isUpdate = false } = options;

  // Build tất cả documents
  const { contactId, indexDoc, detailDoc, emailLookupDocs, udKeyUpdates } =
    buildContactDocs(contactJson, options);

  // Nếu update: lấy data cũ để cleanup lookups thừa
  let oldEmailDocIds = [];
  let oldUdKeys = [];
  if (isUpdate && options.contactId) {
    [oldEmailDocIds, oldUdKeys] = await Promise.all([
      getExistingEmailDocIds(db, contactId),
      getExistingUdKeys(db, contactId),
    ]);
  }

  // ── Bắt đầu batch ──────────────────────────────────────────────────────────
  const batch = db.batch();

  // 1. contacts_index
  batch.set(db.collection('contacts_index').doc(contactId), indexDoc);

  // 2. contacts_detail
  batch.set(db.collection('contacts_detail').doc(contactId), detailDoc);

  // 3. email_lookup — xóa cũ trước
  const newEmailDocIds = new Set(emailLookupDocs.map(e => e.docId));
  for (const oldDocId of oldEmailDocIds) {
    if (!newEmailDocIds.has(oldDocId)) {
      batch.delete(db.collection('email_lookup').doc(oldDocId));
    }
  }
  // Ghi mới
  for (const { docId, data } of emailLookupDocs) {
    batch.set(db.collection('email_lookup').doc(docId), data);
  }

  // 4. ud_key_lookup — arrayRemove cũ, arrayUnion mới
  const newUdKeys = new Set(udKeyUpdates.map(u => u.key));

  // Remove contactId khỏi ud_key_lookup của keys cũ (nếu key không còn trong contact)
  for (const oldKey of oldUdKeys) {
    if (!newUdKeys.has(oldKey)) {
      const oldDocId = encodeDocId(oldKey);
      batch.set(
        db.collection('ud_key_lookup').doc(oldDocId),
        {
          key: oldKey,
          contactIds: FieldValue.arrayRemove(contactId),
          count: FieldValue.increment(-1),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  }

  // Add contactId vào ud_key_lookup của keys mới
  for (const { docId, key } of udKeyUpdates) {
    batch.set(
      db.collection('ud_key_lookup').doc(docId),
      {
        key,
        contactIds: FieldValue.arrayUnion(contactId),
        count: FieldValue.increment(1),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  // Commit
  await batch.commit();

  return {
    contactId,
    emailCount: emailLookupDocs.length,
    udKeyCount: udKeyUpdates.length,
  };
}

/**
 * Xóa 1 contact + cleanup toàn bộ lookup collections
 *
 * @param {string} contactId
 * @returns {Promise<{ contactId: string, deletedEmails: number, cleanedUdKeys: number }>}
 */
async function deleteContact(contactId) {
  const db = getFirestore();

  // Đọc contacts_index để lấy emails và udKeys cần cleanup
  const indexSnap = await db.collection('contacts_index').doc(contactId).get();
  if (!indexSnap.exists) {
    throw new Error(`Contact not found: ${contactId}`);
  }

  const indexData = indexSnap.data();
  const allEmails = indexData.allEmails || [];
  const userDefinedKeys = indexData.userDefinedKeys || [];

  const batch = db.batch();

  // 1. Xóa contacts_index
  batch.delete(db.collection('contacts_index').doc(contactId));

  // 2. Xóa contacts_detail
  batch.delete(db.collection('contacts_detail').doc(contactId));

  // 3. Xóa email_lookup docs
  for (const email of allEmails) {
    batch.delete(db.collection('email_lookup').doc(encodeDocId(email)));
  }

  // 4. Cleanup ud_key_lookup — arrayRemove contactId
  for (const key of userDefinedKeys) {
    batch.set(
      db.collection('ud_key_lookup').doc(encodeDocId(key)),
      {
        contactIds: FieldValue.arrayRemove(contactId),
        count: FieldValue.increment(-1),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  await batch.commit();

  return {
    contactId,
    deletedEmails: allEmails.length,
    cleanedUdKeys: userDefinedKeys.length,
  };
}

/**
 * Bulk write nhiều contacts (dùng cho import script)
 * Không dùng batch chung cho tất cả — mỗi contact vẫn là 1 batch riêng
 * nhưng chạy concurrent với concurrency limit
 *
 * @param {object[]} contactJsonArray
 * @param {object} [options]
 * @param {number} [options.concurrency] — số contacts ghi đồng thời, default 5
 * @param {Function} [options.onProgress] — callback(done, total)
 * @returns {Promise<{ success: number, errors: Array<{index: number, error: string}> }>}
 */
async function bulkWriteContacts(contactJsonArray, options = {}) {
  const { concurrency = 5, onProgress = null } = options;
  const total = contactJsonArray.length;
  let done = 0;
  const errors = [];

  // Chạy theo chunk để tránh quá nhiều concurrent Firestore connections
  for (let i = 0; i < total; i += concurrency) {
    const chunk = contactJsonArray.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      chunk.map((contact, idx) =>
        writeContact(contact, { ...options, contactId: undefined })
          .then(() => ({ ok: true }))
          .catch(err => ({ ok: false, index: i + idx, error: err.message }))
      )
    );

    for (const result of results) {
      done++;
      if (result.status === 'fulfilled' && !result.value.ok) {
        errors.push({ index: result.value.index, error: result.value.error });
      } else if (result.status === 'rejected') {
        errors.push({ index: i, error: result.reason?.message || 'Unknown error' });
      }
    }

    if (onProgress) onProgress(done, total);
  }

  return { success: done - errors.length, errors };
}

module.exports = {
  writeContact,
  deleteContact,
  bulkWriteContacts,
};
