const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const ALLOWED_SETTERS = new Set([
  // ضع هنا UIDs المصرح لهم بتعيين/إلغاء claims
  "OWNER_UID_1",
  "OWNER_UID_2"
]);

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