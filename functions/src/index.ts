import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const ALLOWED_SETTERS = new Set([
  // ضع هنا UIDs المصرح لهم بتعيين/إلغاء claims
  "OWNER_UID_1",
  "OWNER_UID_2"
]);

export const setAdminClaim = functions.https.onCall(async (data, context) => {
  // تحقق من المصادقة
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "يجب تسجيل الدخول.");
  }
  const callerUid = context.auth.uid;
  if (!ALLOWED_SETTERS.has(callerUid)) {
    throw new functions.https.HttpsError("permission-denied", "ليس لديك صلاحية.");
  }

  // تحقق من المدخلات
  const targetUid = data?.targetUid;
  const adminValue = data?.admin;
  if (typeof targetUid !== "string" || !targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "targetUid مطلوب.");
  }
  if (typeof adminValue !== "boolean") {
    throw new functions.https.HttpsError("invalid-argument", "admin يجب أن يكون true أو false.");
  }

  // جلب claims الحالية ودمجها
  const user = await admin.auth().getUser(targetUid);
  const currentClaims = user.customClaims || {};
  const newClaims = { ...currentClaims, admin: adminValue === true };

  // إذا admin=false، أزل الخاصية
  if (adminValue === false) {
    delete newClaims.admin;
  }

  await admin.auth().setCustomUserClaims(targetUid, newClaims);

  return { ok: true, targetUid, admin: adminValue === true };
});