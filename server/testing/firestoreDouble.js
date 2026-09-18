// Minimal in-memory Firestore double for unit tests.
//
// The service modules under test talk to Firestore through a small surface:
//   collection(name).where(...).limit(n).get(),
//   collection(name).doc(id).get()/update(), collection(name).add(data),
//   document snapshots with .ref, collection(name).get(),
//   db.runTransaction(fn) with transaction.get/update,
//   and FieldValue.increment/delete/arrayUnion sentinels.
// This double implements exactly that surface so tests exercise the real
// service code without touching a live database.
//
// Usage (in a *.test.js file — `node --test` runs each file in its own
// process, so patching the shared `db` instance is safe):
//
//   import { db } from '../../config/firebase.js';
//   import { createFirestoreDouble, installFirestoreDouble } from '../../testing/firestoreDouble.js';
//
//   const double = installFirestoreDouble(db, createFirestoreDouble(seed));
//   const svc = await import('./admin.service.js'); // dynamic: the service
//   // captures collection refs at import time, so the double must be
//   // installed first.
//
// Call double.reset(seed) at the start of a test to get a fresh store —
// refs captured at import time stay valid because the same Map is cleared.

let autoIdCounter = 0;

function nextAutoId(collectionName) {
  autoIdCounter += 1;
  return `${collectionName.slice(0, 3)}_auto_${autoIdCounter}`;
}

function clone(value) {
  return structuredClone(value);
}

function storeValue(value) {
  if (value === null || typeof value !== "object") return value;
  return clone(value);
}

// firebase-admin emits sentinel objects for FieldValue.* helpers. Detect
// them structurally (by constructor name) so this double never needs to
// mock firebase-admin itself.
function transformKind(value) {
  if (!value || typeof value !== "object") return null;
  const name = value.constructor?.name;
  if (name === "NumericIncrementTransform") return "increment";
  if (name === "DeleteTransform") return "delete";
  if (name === "ArrayUnionTransform") return "arrayUnion";
  return null;
}

function valuesEqual(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

// Resolve one field update against its current value. Returns undefined for
// deleted fields (mirrors a missing key).
function resolveField(currentValue, updateValue) {
  const kind = transformKind(updateValue);
  if (kind === null) return updateValue;
  if (kind === "increment") {
    return (Number(currentValue) || 0) + Number(updateValue.operand);
  }
  if (kind === "delete") return undefined;
  if (kind === "arrayUnion") {
    const list = Array.isArray(currentValue) ? [...currentValue] : [];
    for (const element of updateValue.elements || []) {
      if (!list.some((entry) => valuesEqual(entry, element))) list.push(element);
    }
    return list;
  }
  return updateValue;
}

function applyUpdate(store, collectionName, id, fields, requireExists) {
  const collection = store.get(collectionName);
  let existing = collection.get(id);
  if (existing === undefined) {
    if (requireExists) {
      throw new Error(
        `Firestore double: update() on missing document ${collectionName}/${id}`,
      );
    }
    existing = {};
    collection.set(id, existing);
  }
  for (const [key, value] of Object.entries(fields)) {
    const resolved = resolveField(existing[key], value);
    if (resolved === undefined) delete existing[key];
    else existing[key] = storeValue(resolved);
  }
}

function makeDocSnapshot(store, collectionName, id) {
  const data = store.get(collectionName)?.get(id);
  return {
    id,
    exists: data !== undefined,
    ref: makeDocRef(store, collectionName, id),
    data() {
      return data === undefined ? undefined : clone(data);
    },
  };
}

function makeDocRef(store, collectionName, id) {
  return {
    id,
    __collectionName: collectionName,
    async get() {
      return makeDocSnapshot(store, collectionName, id);
    },
    async set(data, options = {}) {
      const collection = store.get(collectionName);
      if (options.merge) applyUpdate(store, collectionName, id, data, false);
      else collection.set(id, clone(data));
    },
    async update(data) {
      applyUpdate(store, collectionName, id, data, true);
    },
    async delete() {
      store.get(collectionName)?.delete(id);
    },
  };
}

function matchCondition(value, operator, expected) {
  if (operator === "==") return value === expected;
  if (operator === "array-contains") {
    return Array.isArray(value) && value.includes(expected);
  }
  if (operator === "in") {
    return Array.isArray(expected) && expected.includes(value);
  }
  throw new Error(`Firestore double: unsupported operator "${operator}"`);
}

function makeSnapshot(store, collectionName, entries) {
  const docs = entries.map(([id]) => makeDocSnapshot(store, collectionName, id));
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach(callback) {
      for (const doc of docs) callback(doc);
    },
  };
}

function makeQuery(store, collectionName, filters, limitCount) {
  return {
    where(field, operator, expected) {
      return makeQuery(
        store,
        collectionName,
        [...filters, { field, operator, expected }],
        limitCount,
      );
    },
    orderBy() {
      // Ordering is not modelled — service code under test sorts in JS.
      return makeQuery(store, collectionName, filters, limitCount);
    },
    limit(count) {
      return makeQuery(store, collectionName, filters, count);
    },
    async get() {
      const collection = store.get(collectionName) ?? new Map();
      let entries = [...collection.entries()];
      for (const { field, operator, expected } of filters) {
        entries = entries.filter(([, data]) =>
          matchCondition(data[field], operator, expected),
        );
      }
      if (limitCount !== null) entries = entries.slice(0, limitCount);
      return makeSnapshot(store, collectionName, entries);
    },
  };
}

function makeCollectionRef(store, collectionName) {
  if (!store.has(collectionName)) store.set(collectionName, new Map());
  return {
    doc(id) {
      return makeDocRef(store, collectionName, id ?? nextAutoId(collectionName));
    },
    async add(data) {
      const id = nextAutoId(collectionName);
      store.get(collectionName).set(id, clone(data));
      return { id };
    },
    where(field, operator, expected) {
      return makeQuery(store, collectionName, [
        { field, operator, expected },
      ], null);
    },
    orderBy(field, direction) {
      return makeQuery(store, collectionName, [], null).orderBy(field, direction);
    },
    limit(count) {
      return makeQuery(store, collectionName, [], null).limit(count);
    },
    async get() {
      return makeQuery(store, collectionName, [], null).get();
    },
  };
}

function makeTransaction(store) {
  return {
    async get(ref) {
      return ref.get();
    },
    update(ref, data) {
      applyUpdate(store, ref.__collectionName, ref.id, data, true);
    },
    set(ref, data, options = {}) {
      if (options.merge) applyUpdate(store, ref.__collectionName, ref.id, data, false);
      else store.get(ref.__collectionName).set(ref.id, clone(data));
    },
  };
}

function loadSeed(store, seed) {
  for (const [collectionName, documents] of Object.entries(seed)) {
    if (!store.has(collectionName)) store.set(collectionName, new Map());
    const collection = store.get(collectionName);
    for (const [id, data] of Object.entries(documents)) {
      collection.set(id, clone(data));
    }
  }
}

export function createFirestoreDouble(seed = {}) {
  const store = new Map();
  loadSeed(store, seed);

  return {
    collection(name) {
      return makeCollectionRef(store, name);
    },
    runTransaction(handler) {
      return Promise.resolve(handler(makeTransaction(store)));
    },
    // ── test helpers ─────────────────────────────────────────────
    reset(nextSeed = {}) {
      store.clear();
      loadSeed(store, nextSeed);
    },
    seed(collectionName, id, data) {
      if (!store.has(collectionName)) store.set(collectionName, new Map());
      store.get(collectionName).set(id, clone(data));
    },
    read(collectionName, id) {
      const data = store.get(collectionName)?.get(id);
      return data === undefined ? null : clone(data);
    },
    readCollection(collectionName) {
      return [...(store.get(collectionName) ?? new Map()).entries()].map(
        ([id, data]) => ({ id, ...clone(data) }),
      );
    },
    count(collectionName) {
      return (store.get(collectionName) ?? new Map()).size;
    },
  };
}

// Shadow the shared db instance's methods with the double's own-property
// implementations (the SDK keeps them on the prototype, so assignment wins).
export function installFirestoreDouble(targetDb, double) {
  targetDb.collection = (name) => double.collection(name);
  targetDb.runTransaction = (handler) => double.runTransaction(handler);
  return double;
}
