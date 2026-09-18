// One-time repair for driver identity data.
//
// Why this exists: driver records created before the `nameKey` field existed
// (hand-seeded data in the Firebase console) were invisible to the
// admin-confirmation lookup, so confirming a report created a second driver
// document (a duplicate "avatar") instead of linking to the existing one.
//
// The script repairs three things:
//   1. Driver field fixes   - backfills `nameKey` and repairs malformed seed
//                             field names (e.g. "name " with a trailing space).
//   2. Duplicate merges     - driver records that share the same normalised
//                             name are merged into the original record:
//                             incidents and verification checks are
//                             repointed, vehicle links are moved, the
//                             duplicate documents are deleted.
//   3. Legacy confirmations - confirmed incidents that never received their
//                             driver/vehicle linkage (confirmed before the
//                             linkage logic existed) are linked now. Junk
//                             plates are never minted into vehicle records;
//                             such incidents are flagged for manual review.
//   4. Driver platform fixes - stray hand-seeded platform keys are folded
//                             into `platforms`, and every platform reported
//                             on a confirmed incident is backfilled onto the
//                             linked driver (case-insensitive, no dupes).
//   Finally, every driver and vehicle incidentCount is recomputed from the
//   actual confirmed incident records so the counters cannot drift.
//
// Usage (from the server directory):
//   node scripts/fixDriverIdentity.js            dry run - prints the plan
//   node scripts/fixDriverIdentity.js --apply    executes the plan

import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import {
  createDriver,
  createVehicle,
  linkDriverVehiclePair,
} from "../modules/driverSearch/driverRepository.js";
import {
  normaliseNameKey,
  normalisePlate,
  isValidPlate,
} from "../modules/driverSearch/driverValidation.js";

const APPLY = process.argv.includes("--apply");

function toMillis(value) {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function describeDate(value) {
  const millis = toMillis(value);
  return millis === null ? "none" : new Date(millis).toISOString();
}

// Read a field, tolerating hand-seeded key typos like "name " or "platform "
// (the seed used keys with trailing spaces). Returns the value plus the key
// it came from so the apply phase can rename it.
function readField(record, field) {
  const direct = record[field];
  if (direct !== undefined && direct !== null) {
    return { value: direct, key: field };
  }

  const altKey = Object.keys(record).find(
    (key) =>
      key !== field &&
      key.trim() === field &&
      record[key] !== undefined &&
      record[key] !== null,
  );

  return altKey
    ? { value: record[altKey], key: altKey }
    : { value: undefined, key: null };
}

function unionArrays(...arrays) {
  const set = new Set();
  for (const array of arrays) {
    if (!Array.isArray(array)) continue;
    for (const value of array) set.add(value);
  }
  return Array.from(set);
}

// Build a platforms fix for one driver: fold the current platforms array,
// any stray hand-seeded platform key ("platform", "platforms " — matched
// after trimming), and the platforms of confirmed incidents into a single
// case-insensitively deduplicated list. Returns null when nothing changes.
function buildPlatformFix(target, data, fromIncidents) {
  const platforms = [];
  const keysToDelete = [];

  const add = (value) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    if (
      !platforms.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())
    ) {
      platforms.push(trimmed);
    }
  };

  for (const [key, value] of Object.entries(data)) {
    if (key === "platforms") {
      if (Array.isArray(value)) value.forEach(add);
      else add(value);
      continue;
    }
    const normalisedKey = key.trim();
    if (normalisedKey === "platforms" || normalisedKey === "platform") {
      keysToDelete.push(key);
      if (Array.isArray(value)) value.forEach(add);
      else add(value);
    }
  }

  for (const platform of fromIncidents) add(platform);

  const current = Array.isArray(data.platforms) ? data.platforms : [];
  if (
    keysToDelete.length === 0 &&
    JSON.stringify(current) === JSON.stringify(platforms)
  ) {
    return null;
  }

  return { ...target, platforms, keysToDelete };
}

// The pre-existing record wins: confirmation-created duplicates always carry
// a createdAt, so a missing date counts as the older record. A record with a
// real avatar beats one without as a tiebreaker.
function pickSurvivor(group) {
  return [...group].sort((a, b) => {
    const aTime = toMillis(a.data.createdAt) ?? -1;
    const bTime = toMillis(b.data.createdAt) ?? -1;
    if (aTime !== bTime) return aTime - bTime;

    const aPhoto = a.data.photoUrl ? 0 : 1;
    const bPhoto = b.data.photoUrl ? 0 : 1;
    if (aPhoto !== bPhoto) return aPhoto - bPhoto;

    return a.id.localeCompare(b.id);
  })[0];
}

async function countConfirmedIncidents(field, id) {
  const snapshot = await db
    .collection("incidents")
    .where(field, "==", id)
    .where("status", "==", "confirmed")
    .get();
  return snapshot.size;
}

async function main() {
  const [driversSnapshot, vehiclesSnapshot, incidentsSnapshot] =
    await Promise.all([
      db.collection("drivers").get(),
      db.collection("vehicles").get(),
      db.collection("incidents").get(),
    ]);

  const drivers = driversSnapshot.docs.map((document) => ({
    id: document.id,
    data: document.data(),
  }));
  const vehicles = vehiclesSnapshot.docs.map((document) => ({
    id: document.id,
    data: document.data(),
  }));
  const incidents = incidentsSnapshot.docs.map((document) => ({
    id: document.id,
    data: document.data(),
    updateTime: document.updateTime,
  }));

  console.log(
    `Loaded ${drivers.length} driver(s), ${vehicles.length} vehicle(s), ${incidents.length} incident(s).`,
  );

  // ── Group drivers by normalised name ──
  const groups = new Map();
  const unnamed = [];

  for (const driver of drivers) {
    const name = readField(driver.data, "name");
    const value = typeof name.value === "string" ? name.value.trim() : "";
    if (!value) {
      unnamed.push(driver.id);
      continue;
    }
    const nameKey = normaliseNameKey(value);
    if (!groups.has(nameKey)) groups.set(nameKey, []);
    groups.get(nameKey).push({
      ...driver,
      name: value,
      nameFieldKey: name.key,
    });
  }

  const backfills = [];
  const merges = [];
  const driverByKey = new Map();

  for (const [nameKey, group] of groups) {
    if (group.length === 1) {
      const [driver] = group;
      driverByKey.set(nameKey, driver.id);

      const storedNameKey = readField(driver.data, "nameKey").value;
      if (storedNameKey !== nameKey || driver.nameFieldKey !== "name") {
        backfills.push({
          id: driver.id,
          name: driver.name,
          nameKey,
          renameFrom:
            driver.nameFieldKey === "name" ? null : driver.nameFieldKey,
        });
      }
      continue;
    }

    const survivor = pickSurvivor(group);
    const duplicates = group.filter((driver) => driver.id !== survivor.id);
    driverByKey.set(nameKey, survivor.id);

    const duplicateIds = duplicates.map((driver) => driver.id);

    const incidentsToRepoint = [];
    const verificationsToRepoint = [];
    for (const duplicateId of duplicateIds) {
      const incidentSnapshot = await db
        .collection("incidents")
        .where("driverId", "==", duplicateId)
        .get();
      for (const document of incidentSnapshot.docs) {
        incidentsToRepoint.push(document.id);
      }

      const verificationSnapshot = await db
        .collection("verificationChecks")
        .where("driverId", "==", duplicateId)
        .get();
      for (const document of verificationSnapshot.docs) {
        verificationsToRepoint.push(document.id);
      }
    }

    const vehiclesToRelink = new Map();
    for (const duplicateId of duplicateIds) {
      const vehicleSnapshot = await db
        .collection("vehicles")
        .where("driverIds", "array-contains", duplicateId)
        .get();
      for (const document of vehicleSnapshot.docs) {
        vehiclesToRelink.set(document.id, document.data());
      }
    }

    merges.push({
      nameKey,
      survivor,
      duplicates,
      renameFrom:
        survivor.nameFieldKey === "name" ? null : survivor.nameFieldKey,
      incidentsToRepoint,
      verificationsToRepoint,
      vehiclesToRelink,
      vehicleIds: unionArrays(
        readField(survivor.data, "vehicleIds").value,
        ...duplicates.map(
          (driver) => readField(driver.data, "vehicleIds").value,
        ),
        Array.from(vehiclesToRelink.keys()),
      ),
      platforms: unionArrays(
        readField(survivor.data, "platforms").value,
        ...duplicates.map(
          (driver) => readField(driver.data, "platforms").value,
        ),
      ),
    });
  }

  // ── Confirmed incidents missing their driver/vehicle linkage ──
  const vehicleByPlate = new Map();
  for (const vehicle of vehicles) {
    const plate = readField(vehicle.data, "plateNumber").value;
    if (typeof plate === "string" && plate.trim()) {
      vehicleByPlate.set(normalisePlate(plate), vehicle.id);
    }
  }

  const legacyLinks = [];
  for (const incident of incidents) {
    const { data } = incident;
    if (data.status !== "confirmed") continue;

    const plan = {
      incidentId: incident.id,
      confirmedAt: incident.updateTime,
      driverId: null,
      vehicleId: null,
      createDriver: null,
      createVehicle: null,
      skippedVehiclePlate: null,
    };

    const nameValue =
      typeof data.driverName === "string" ? data.driverName.trim() : "";
    if (!data.driverId && nameValue) {
      const nameKey = normaliseNameKey(nameValue);
      const existing = driverByKey.get(nameKey);
      if (existing) {
        plan.driverId = existing;
      } else {
        plan.createDriver = { name: nameValue, nameKey };
      }
    }

    const plate =
      typeof data.plate === "string" && data.plate.trim()
        ? normalisePlate(data.plate)
        : null;
    if (!data.vehicleId && plate) {
      const existing = vehicleByPlate.get(plate);
      if (existing) {
        plan.vehicleId = existing;
      } else if (isValidPlate(plate)) {
        plan.createVehicle = { plate };
      } else {
        // A plate that fails normalisePlate + isValidPlate can never be
        // searched — never mint a junk vehicle; flag it for manual review.
        plan.skippedVehiclePlate = plate;
      }
    }

    if (
      plan.driverId ||
      plan.vehicleId ||
      plan.createDriver ||
      plan.createVehicle ||
      plan.skippedVehiclePlate
    ) {
      legacyLinks.push(plan);
    }
  }

  // ── Projected final counts (read-only preview of the outcome) ──
  const duplicateToSurvivor = new Map();
  for (const merge of merges) {
    for (const duplicate of merge.duplicates) {
      duplicateToSurvivor.set(duplicate.id, merge.survivor.id);
    }
  }
  const legacyByIncident = new Map(
    legacyLinks.map((plan) => [plan.incidentId, plan]),
  );

  const projectedDriverCounts = new Map();
  const projectedVehicleCounts = new Map();
  const newDriverCounts = new Map();
  const newVehicleCounts = new Map();

  for (const incident of incidents) {
    if (incident.data.status !== "confirmed") continue;
    const legacy = legacyByIncident.get(incident.id);

    let driverId = incident.data.driverId || null;
    if (driverId && duplicateToSurvivor.has(driverId)) {
      driverId = duplicateToSurvivor.get(driverId);
    }
    if (legacy && !driverId) {
      if (legacy.driverId) {
        driverId = legacy.driverId;
      } else if (legacy.createDriver) {
        newDriverCounts.set(
          legacy.createDriver.nameKey,
          (newDriverCounts.get(legacy.createDriver.nameKey) || 0) + 1,
        );
      }
    }
    if (driverId) {
      projectedDriverCounts.set(
        driverId,
        (projectedDriverCounts.get(driverId) || 0) + 1,
      );
    }

    let vehicleId = incident.data.vehicleId || null;
    if (legacy && !vehicleId) {
      if (legacy.vehicleId) {
        vehicleId = legacy.vehicleId;
      } else if (legacy.createVehicle) {
        newVehicleCounts.set(
          legacy.createVehicle.plate,
          (newVehicleCounts.get(legacy.createVehicle.plate) || 0) + 1,
        );
      }
    }
    if (vehicleId) {
      projectedVehicleCounts.set(
        vehicleId,
        (projectedVehicleCounts.get(vehicleId) || 0) + 1,
      );
    }
  }

  // ── Driver platform plan ──
  // Every platform reported on a confirmed incident should appear on the
  // linked driver, and stray hand-seeded keys must be folded into the
  // platforms array.
  const incidentPlatformsByDriver = new Map();
  const incidentPlatformsByNewDriver = new Map();

  const addPlatformTo = (map, key, platform) => {
    if (!map.has(key)) map.set(key, []);
    const list = map.get(key);
    if (!list.some((entry) => entry.toLowerCase() === platform.toLowerCase())) {
      list.push(platform);
    }
  };

  for (const incident of incidents) {
    if (incident.data.status !== "confirmed") continue;
    const platform =
      typeof incident.data.platform === "string"
        ? incident.data.platform.trim()
        : "";
    if (!platform) continue;

    let targetId = incident.data.driverId || null;
    if (targetId && duplicateToSurvivor.has(targetId)) {
      targetId = duplicateToSurvivor.get(targetId);
    }

    if (targetId) {
      addPlatformTo(incidentPlatformsByDriver, targetId, platform);
      continue;
    }

    const legacy = legacyByIncident.get(incident.id);
    if (!legacy) continue;
    if (legacy.driverId) {
      let resolvedId = legacy.driverId;
      if (duplicateToSurvivor.has(resolvedId)) {
        resolvedId = duplicateToSurvivor.get(resolvedId);
      }
      addPlatformTo(incidentPlatformsByDriver, resolvedId, platform);
    } else if (legacy.createDriver) {
      addPlatformTo(
        incidentPlatformsByNewDriver,
        legacy.createDriver.nameKey,
        platform,
      );
    }
  }

  const platformFixes = [];
  for (const driver of drivers) {
    if (duplicateToSurvivor.has(driver.id)) continue;
    const merge = merges.find((item) => item.survivor.id === driver.id);
    const effectiveData = merge
      ? { ...driver.data, platforms: merge.platforms }
      : driver.data;
    const fix = buildPlatformFix(
      {
        id: driver.id,
        name: readField(driver.data, "name").value || "(unnamed)",
      },
      effectiveData,
      incidentPlatformsByDriver.get(driver.id) || [],
    );
    if (fix) platformFixes.push(fix);
  }
  for (const [nameKey, platforms] of incidentPlatformsByNewDriver) {
    const fix = buildPlatformFix({ nameKey }, {}, platforms);
    if (fix) platformFixes.push(fix);
  }

  // ── Report the plan ──
  console.log(`\n1. Driver field fixes: ${backfills.length}`);
  for (const item of backfills) {
    const rename = item.renameFrom
      ? ` (renames field "${item.renameFrom}" -> "name")`
      : "";
    console.log(
      `   ${item.id} "${item.name}": nameKey -> "${item.nameKey}"${rename}`,
    );
  }

  console.log(`\n2. Duplicate driver merges: ${merges.length}`);
  for (const merge of merges) {
    console.log(`   "${merge.survivor.name}" (key "${merge.nameKey}"):`);
    console.log(
      `     keep  ${merge.survivor.id} [photo: ${merge.survivor.data.photoUrl ? "yes" : "no"}, createdAt: ${describeDate(merge.survivor.data.createdAt)}]`,
    );
    for (const duplicate of merge.duplicates) {
      console.log(
        `     merge ${duplicate.id} [photo: ${duplicate.data.photoUrl ? "yes" : "no"}, createdAt: ${describeDate(duplicate.data.createdAt)}]`,
      );
    }
    console.log(
      `     -> ${merge.incidentsToRepoint.length} incident(s) repointed, ${merge.verificationsToRepoint.length} verification(s) repointed, ${merge.vehiclesToRelink.size} vehicle(s) relinked, ${merge.duplicates.length} record(s) deleted`,
    );
  }

  console.log(
    `\n3. Confirmed incidents missing linkage: ${legacyLinks.length}`,
  );
  for (const plan of legacyLinks) {
    const incident = incidents.find((item) => item.id === plan.incidentId);
    const actions = [];
    if (plan.driverId) actions.push(`driver=${plan.driverId}`);
    if (plan.createDriver)
      actions.push(`create driver "${plan.createDriver.name}"`);
    if (plan.vehicleId) actions.push(`vehicle=${plan.vehicleId}`);
    if (plan.createVehicle)
      actions.push(`create vehicle "${plan.createVehicle.plate}"`);
    if (plan.skippedVehiclePlate)
      actions.push(
        `SKIP invalid plate "${plan.skippedVehiclePlate}" (manual review)`,
      );
    console.log(
      `   ${plan.incidentId} ("${incident.data.driverName ?? "no driver name"}", plate ${incident.data.plate}): ${actions.join(", ")}`,
    );
  }

  console.log(`\n4. Driver platform fixes: ${platformFixes.length}`);
  for (const fix of platformFixes) {
    const label = fix.id
      ? `driver ${fix.id} "${fix.name}"`
      : `new driver "${fix.nameKey}"`;
    const stray = fix.keysToDelete.length
      ? ` (removes stray key(s): ${fix.keysToDelete.map((key) => `"${key}"`).join(", ")})`
      : "";
    console.log(
      `   ${label}: platforms -> [${fix.platforms.map((platform) => `"${platform}"`).join(", ")}]${stray}`,
    );
  }

  console.log("\nProjected incident-count changes (current -> after repair):");
  let printedCounts = false;
  for (const driver of drivers) {
    if (duplicateToSurvivor.has(driver.id)) {
      console.log(
        `   driver ${driver.id}: deleted, its count moves to ${duplicateToSurvivor.get(driver.id)}`,
      );
      printedCounts = true;
      continue;
    }
    const current = driver.data.incidentCount ?? 0;
    const projected = projectedDriverCounts.get(driver.id) || 0;
    if (current !== projected) {
      console.log(`   driver ${driver.id}: ${current} -> ${projected}`);
      printedCounts = true;
    }
  }
  for (const vehicle of vehicles) {
    const current = vehicle.data.incidentCount ?? 0;
    const projected = projectedVehicleCounts.get(vehicle.id) || 0;
    if (current !== projected) {
      console.log(
        `   vehicle ${vehicle.id} (${vehicle.data.plateNumber}): ${current} -> ${projected}`,
      );
      printedCounts = true;
    }
  }
  for (const [nameKey, count] of newDriverCounts) {
    console.log(
      `   new driver "${nameKey}" created with incidentCount ${count}`,
    );
    printedCounts = true;
  }
  for (const [plate, count] of newVehicleCounts) {
    console.log(
      `   new vehicle "${plate}" created with incidentCount ${count}`,
    );
    printedCounts = true;
  }
  if (!printedCounts) {
    console.log("   (no changes)");
  }

  if (unnamed.length) {
    console.log(
      `\nDrivers without a usable name (left untouched): ${unnamed.join(", ")}`,
    );
  }

  if (!APPLY) {
    console.log("\nDry run only - re-run with --apply to execute this plan.");
    return;
  }

  // ── Apply ──
  console.log("\nApplying repairs...");

  // 1. Driver field fixes
  for (const item of backfills) {
    const update = { nameKey: item.nameKey };
    if (item.renameFrom) {
      update.name = item.name;
      update[item.renameFrom] = FieldValue.delete();
    }
    await db.collection("drivers").doc(item.id).update(update);
  }
  console.log(`   Applied ${backfills.length} driver field fix(es).`);

  // 2. Duplicate merges
  for (const merge of merges) {
    const { survivor, duplicates } = merge;
    const duplicateIds = duplicates.map((driver) => driver.id);

    for (const incidentId of merge.incidentsToRepoint) {
      await db.collection("incidents").doc(incidentId).update({
        driverId: survivor.id,
      });
    }
    for (const verificationId of merge.verificationsToRepoint) {
      await db.collection("verificationChecks").doc(verificationId).update({
        driverId: survivor.id,
      });
    }
    for (const [vehicleId, vehicleData] of merge.vehiclesToRelink) {
      const driverIds = unionArrays(vehicleData.driverIds).filter(
        (id) => !duplicateIds.includes(id),
      );
      if (!driverIds.includes(survivor.id)) {
        driverIds.push(survivor.id);
      }
      await db.collection("vehicles").doc(vehicleId).update({ driverIds });
    }

    const survivorUpdate = {
      nameKey: merge.nameKey,
      vehicleIds: merge.vehicleIds,
      platforms: merge.platforms,
    };
    if (merge.renameFrom) {
      survivorUpdate.name = survivor.name;
      survivorUpdate[merge.renameFrom] = FieldValue.delete();
    }
    await db.collection("drivers").doc(survivor.id).update(survivorUpdate);

    for (const duplicate of duplicates) {
      await db.collection("drivers").doc(duplicate.id).delete();
    }
    console.log(
      `   Merged "${survivor.name}" - kept ${survivor.id}, removed ${duplicateIds.join(", ")}.`,
    );
  }

  // 3. Legacy confirmed incidents
  for (const plan of legacyLinks) {
    let driverId = plan.driverId;
    if (!driverId && plan.createDriver) {
      const existing = driverByKey.get(plan.createDriver.nameKey);
      if (existing) {
        driverId = existing;
      } else {
        const created = await createDriver({
          name: plan.createDriver.name,
          nameKey: plan.createDriver.nameKey,
          incidentCount: 0,
          vehicleIds: [],
          platforms: [],
          createdAt: new Date(),
        });
        driverId = created.id;
        driverByKey.set(plan.createDriver.nameKey, created.id);
        console.log(
          `   Created driver "${plan.createDriver.name}" (${created.id}).`,
        );
      }
    }

    let vehicleId = plan.vehicleId;
    if (!vehicleId && plan.createVehicle) {
      const created = await createVehicle({
        plateNumber: plan.createVehicle.plate,
        status: "KNOWN",
        driverIds: [],
        verificationCount: 0,
        incidentCount: 0,
        createdAt: new Date(),
      });
      vehicleId = created.id;
      vehicleByPlate.set(plan.createVehicle.plate, created.id);
      console.log(
        `   Created vehicle "${plan.createVehicle.plate}" (${created.id}).`,
      );
    }

    if (driverId && vehicleId) {
      await linkDriverVehiclePair(vehicleId, driverId);
    }

    if (plan.skippedVehiclePlate) {
      console.log(
        `   ${plan.incidentId}: plate "${plan.skippedVehiclePlate}" fails validation - vehicle skipped, needs manual review.`,
      );
    }

    const update = {};
    if (driverId) update.driverId = driverId;
    if (vehicleId) update.vehicleId = vehicleId;
    const incidentRecord = incidents.find(
      (item) => item.id === plan.incidentId,
    );
    if (plan.confirmedAt && !incidentRecord?.data.confirmedAt) {
      update.confirmedAt = plan.confirmedAt;
    }
    if (Object.keys(update).length) {
      await db.collection("incidents").doc(plan.incidentId).update(update);
    }
    console.log(
      `   Linked ${plan.incidentId} (driver: ${driverId ?? "none"}, vehicle: ${vehicleId ?? "none"}).`,
    );
  }

  // 4. Driver platform backfill: fold stray seed keys and the platforms of
  //    confirmed incidents into drivers.platforms.
  console.log("\nBackfilling driver platforms from confirmed incidents...");
  let platformUpdates = 0;
  for (const fix of platformFixes) {
    const driverId = fix.id || driverByKey.get(fix.nameKey);
    if (!driverId) {
      console.log(
        `   Skipped platform fix for "${fix.nameKey}" - no live driver record.`,
      );
      continue;
    }
    const update = { platforms: fix.platforms };
    for (const key of fix.keysToDelete) update[key] = FieldValue.delete();
    await db.collection("drivers").doc(driverId).update(update);
    platformUpdates += 1;
    console.log(
      `   Updated platforms for ${driverId} "${fix.name || fix.nameKey}".`,
    );
  }
  console.log(`   Applied ${platformUpdates} platform fix(es).`);

  // 5. Recompute every counter from the actual confirmed incidents so the
  //    stored incidentCount always matches the public safety profile.
  console.log("\nRecomputing incident counts from confirmed incidents...");
  const finalDrivers = await db.collection("drivers").get();
  for (const document of finalDrivers.docs) {
    const count = await countConfirmedIncidents("driverId", document.id);
    if ((document.data().incidentCount ?? 0) !== count) {
      await document.ref.update({ incidentCount: count });
      console.log(
        `   driver ${document.id} "${document.data().name}": incidentCount -> ${count}`,
      );
    }
  }
  const finalVehicles = await db.collection("vehicles").get();
  for (const document of finalVehicles.docs) {
    const count = await countConfirmedIncidents("vehicleId", document.id);
    if ((document.data().incidentCount ?? 0) !== count) {
      await document.ref.update({ incidentCount: count });
      console.log(
        `   vehicle ${document.id} "${document.data().plateNumber}": incidentCount -> ${count}`,
      );
    }
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error("Repair failed:", error);
  process.exitCode = 1;
});
