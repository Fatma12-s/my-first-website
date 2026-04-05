const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const ALLOWED_SETTERS = new Set([
  // ضع هنا UIDs المصرح لهم بتعيين/إلغاء claims
  "OWNER_UID_1",
  "OWNER_UID_2"
]);

const SUBMISSIONS_COLLECTION = "formSubmissions";
const STORAGE_BUCKET_HOST = "firebasestorage.googleapis.com";
function isStorageUrl(value) {
  const normalized = String(value || "").trim();
  return normalized.startsWith("gs://") || normalized.includes(`${STORAGE_BUCKET_HOST}/v0/b/`);
}

function extractStorageLocation(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;

  if (normalized.startsWith("gs://")) {
    const withoutPrefix = normalized.slice(5);
    const slashIndex = withoutPrefix.indexOf("/");
    if (slashIndex === -1) return null;

    return {
      bucket: withoutPrefix.slice(0, slashIndex),
      objectPath: withoutPrefix.slice(slashIndex + 1)
    };
  }

  try {
    const parsed = new URL(normalized);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const bucketIndex = segments.indexOf("b");
    const objectIndex = segments.indexOf("o");
    if (bucketIndex === -1 || objectIndex === -1 || !segments[bucketIndex + 1] || !segments[objectIndex + 1]) {
      return null;
    }

    return {
      bucket: decodeURIComponent(segments[bucketIndex + 1]),
      objectPath: decodeURIComponent(segments[objectIndex + 1])
    };
  } catch (error) {
    functions.logger.warn("Failed to parse storage URL", { value: normalized, error: String(error && error.message || error) });
    return null;
  }
}

function collectStorageLocations(payload, seen = new Set()) {
  const locations = [];

  const visit = (value) => {
    if (!value) return;

    if (typeof value === "string") {
      if (!isStorageUrl(value)) return;
      const location = extractStorageLocation(value);
      if (!location) return;

      const key = `${location.bucket}/${location.objectPath}`;
      if (seen.has(key)) return;
      seen.add(key);
      locations.push(location);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  };

  visit(payload);
  return locations;
}

async function deleteSubmissionAttachments(submissionData) {
  const storageLocations = collectStorageLocations(submissionData);
  if (!storageLocations.length) {
    return { deletedCount: 0, attemptedCount: 0 };
  }

  const results = await Promise.allSettled(storageLocations.map(async ({ bucket, objectPath }) => {
    await admin.storage().bucket(bucket).file(objectPath).delete({ ignoreNotFound: true });
    return `${bucket}/${objectPath}`;
  }));

  const deletedCount = results.filter((result) => result.status === "fulfilled").length;
  const rejected = results.filter((result) => result.status === "rejected");
  rejected.forEach((result) => {
    functions.logger.error("Failed to delete attachment from Storage", {
      error: String(result.reason && result.reason.message || result.reason)
    });
  });

  return { deletedCount, attemptedCount: storageLocations.length };
}

async function deleteOldSubmissionsByField(fieldName, cutoffIso) {
  const db = admin.firestore();
  let deletedCount = 0;
  const chunkSize = 200;

  while (true) {
    const snapshot = await db.collection(SUBMISSIONS_COLLECTION)
      .where(fieldName, "<=", cutoffIso)
      .limit(chunkSize)
      .get();

    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deletedCount += snapshot.size;

    if (snapshot.size < chunkSize) break;
  }

  return deletedCount;
}

exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "يجب تسجيل الدخول.");
  }
  const callerUid = context.auth.uid;
  if (!ALLOWED_SETTERS.has(callerUid)) {
    throw new functions.https.HttpsError("permission-denied", "ليس لديك صلاحية.");
  }

  const targetUid = data && data.targetUid;
  const adminValue = data && data.admin;
  if (typeof targetUid !== "string" || !targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "targetUid مطلوب.");
  }
  if (typeof adminValue !== "boolean") {
    throw new functions.https.HttpsError("invalid-argument", "admin يجب أن يكون true أو false.");
  }

  const user = await admin.auth().getUser(targetUid);
  const currentClaims = user.customClaims || {};
  const newClaims = { ...currentClaims, admin: adminValue === true };

  if (adminValue === false) {
    delete newClaims.admin;
  }

  await admin.auth().setCustomUserClaims(targetUid, newClaims);

  return { ok: true, targetUid, admin: adminValue === true };
});

exports.deleteSubmissionAttachmentsOnDelete = functions.firestore
  .document(`${SUBMISSIONS_COLLECTION}/{submissionId}`)
  .onDelete(async (snapshot, context) => {
    const submissionData = snapshot.data() || {};
    const result = await deleteSubmissionAttachments(submissionData);

    functions.logger.info("Submission deleted and attachments cleanup attempted", {
      submissionId: context.params.submissionId,
      attemptedCount: result.attemptedCount,
      deletedCount: result.deletedCount
    });

    return null;
  });

exports.cleanupSubmissionsOlderThanThreeMonths = functions.pubsub
  .schedule("every 24 hours")
  .timeZone("Etc/UTC")
  .onRun(async () => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 3);
    const cutoffIso = cutoffDate.toISOString();

    const deletedByCreatedAt = await deleteOldSubmissionsByField("createdAt", cutoffIso);
    const deletedBySubmittedAtIso = await deleteOldSubmissionsByField("submittedAtISO", cutoffIso);

    functions.logger.info("Cleanup for old submissions finished", {
      cutoffIso,
      deletedByCreatedAt,
      deletedBySubmittedAtIso,
      totalDeleted: deletedByCreatedAt + deletedBySubmittedAtIso
    });

    return null;
  });