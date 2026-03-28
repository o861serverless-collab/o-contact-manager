'use strict';

/**
 * pagination.js — Cursor-based pagination cho Firestore
 *
 * Dùng DocumentSnapshot làm cursor thay vì offset (offset kém hiệu quả với Firestore)
 * Encode cursor thành base64 string để truyền qua API
 *
 * Flow:
 *   1. Client gọi GET /contacts?limit=50
 *   2. Server trả về data + nextCursor (base64 encoded docId)
 *   3. Client gọi GET /contacts?cursor=<nextCursor>&limit=50
 *   4. Server decode cursor → startAfter(snapshot) → trả trang tiếp
 */

const { getFirestore } = require('./firebase-admin');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// ─── Cursor encode/decode ──────────────────────────────────────────────────

/**
 * Encode documentId thành cursor string (base64)
 * @param {string} docId
 * @returns {string}
 */
function encodeCursor(docId) {
  return Buffer.from(docId, 'utf8').toString('base64url');
}

/**
 * Decode cursor string thành documentId
 * @param {string} cursor
 * @returns {string|null}
 */
function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    return Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

// ─── Query builder ─────────────────────────────────────────────────────────

/**
 * Parse và validate query params từ request
 * @param {object} query — req.query
 * @returns {{
 *   search: string|null,
 *   category: string|null,
 *   domain: string|null,
 *   email: string|null,
 *   udKey: string|null,
 *   hasUD: boolean|null,
 *   sort: string,
 *   order: string,
 *   limit: number,
 *   cursor: string|null
 * }}
 */
function parseQueryParams(query = {}) {
  const limit = Math.min(
    parseInt(query.limit, 10) || DEFAULT_LIMIT,
    MAX_LIMIT
  );

  const validSorts = ['updatedAt', 'createdAt', 'displayName'];
  const sort = validSorts.includes(query.sort) ? query.sort : 'updatedAt';
  const order = query.order === 'asc' ? 'asc' : 'desc';

  return {
    search: query.search?.trim().toLowerCase() || null,
    category: query.category?.trim() || null,
    domain: query.domain?.trim().toLowerCase() || null,
    email: query.email?.trim().toLowerCase() || null,
    udKey: query.udKey?.trim() || null,
    hasUD: query.hasUD === 'true' ? true : query.hasUD === 'false' ? false : null,
    sort,
    order,
    limit,
    cursor: query.cursor || null,
  };
}

/**
 * Build Firestore query từ parsed params (không execute)
 * @param {object} params — output của parseQueryParams
 * @returns {FirebaseFirestore.Query}
 */
function buildQuery(params) {
  const db = getFirestore();
  let q = db.collection('contacts_index');

  const { search, category, domain, email, udKey, hasUD, sort, order } = params;

  // Filters — Firestore chỉ cho 1 array-contains per query
  // Ưu tiên: search > email > udKey > category > domain
  if (search && search.length >= 2) {
    q = q.where('searchTokens', 'array-contains', search);
  } else if (email) {
    q = q.where('allEmails', 'array-contains', email);
  } else if (udKey) {
    if (category) {
      // Combo: category + udKey (cần composite index)
      q = q
        .where('categories', 'array-contains', category)
        .where('userDefinedKeys', 'array-contains', udKey);
    } else {
      q = q.where('userDefinedKeys', 'array-contains', udKey);
    }
  } else if (category) {
    q = q.where('categories', 'array-contains', category);
  } else if (domain) {
    q = q.where('allDomains', 'array-contains', domain);
  }

  // hasUD filter (boolean field)
  if (hasUD === true) {
    q = q.where('hasUserDefined', '==', true);
  } else if (hasUD === false) {
    q = q.where('hasUserDefined', '==', false);
  }

  // Order
  q = q.orderBy(sort, order);

  return q;
}

/**
 * Execute paginated query
 *
 * @param {object} params — output của parseQueryParams
 * @returns {Promise<{
 *   data: object[],
 *   nextCursor: string|null,
 *   hasMore: boolean,
 *   count: number
 * }>}
 */
async function paginateQuery(params) {
  const db = getFirestore();
  let q = buildQuery(params);

  // Apply cursor (startAfter)
  if (params.cursor) {
    const docId = decodeCursor(params.cursor);
    if (docId) {
      const cursorSnap = await db.collection('contacts_index').doc(docId).get();
      if (cursorSnap.exists) {
        q = q.startAfter(cursorSnap);
      }
    }
  }

  // Fetch limit+1 để biết có trang tiếp không
  q = q.limit(params.limit + 1);

  const snapshot = await q.get();
  const docs = snapshot.docs;

  const hasMore = docs.length > params.limit;
  const resultDocs = hasMore ? docs.slice(0, params.limit) : docs;

  const data = resultDocs.map(d => d.data());

  // nextCursor = docId của doc cuối cùng trong trang này
  const nextCursor = hasMore
    ? encodeCursor(resultDocs[resultDocs.length - 1].id)
    : null;

  return {
    data,
    nextCursor,
    hasMore,
    count: data.length,
  };
}

/**
 * Tạo response object chuẩn cho list endpoint
 * @param {object} paginateResult — output của paginateQuery
 * @param {object} params — parsed query params
 * @returns {object}
 */
function buildListResponse(paginateResult, params) {
  const { data, nextCursor, hasMore, count } = paginateResult;
  return {
    data,
    meta: {
      count,
      limit: params.limit,
      hasMore,
      nextCursor,
      sort: params.sort,
      order: params.order,
    },
  };
}

module.exports = {
  parseQueryParams,
  buildQuery,
  paginateQuery,
  buildListResponse,
  encodeCursor,
  decodeCursor,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
