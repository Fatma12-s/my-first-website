// usage:
//   node set-admin.js <TARGET_UID> <true|false> [email] [displayName] [employeeId]
// examples:
//   node set-admin.js abc123 true fsalim@squ.edu.om "Fatma Admin" EMP001
//   node set-admin.js abc123 false
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

if (process.argv.length < 4) {
  console.error("usage: node set-admin.js <TARGET_UID> <true|false> [email] [displayName] [employeeId]");
  process.exit(1);
}

const targetUid = process.argv[2];
const adminValue = process.argv[3] === "true";
const emailArg = process.argv[4] || "";
const displayNameArg = process.argv[5] || "";
const employeeIdArg = process.argv[6] || "";

function readJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return null;
  }
}

function resolveProjectId() {
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;

  const firebasercPath = path.resolve(__dirname, "..", ".firebaserc");
  const firebaserc = readJsonIfExists(firebasercPath);
  if (firebaserc && firebaserc.projects && firebaserc.projects.default) {
    return firebaserc.projects.default;
  }

  return undefined;
}

function resolveCredential() {
  const serviceAccountPath = path.resolve(__dirname, "serviceAccountKey.json");
  if (fs.existsSync(serviceAccountPath)) {
    return admin.credential.cert(require(serviceAccountPath));
  }

  return admin.credential.applicationDefault();
}

admin.initializeApp({
  credential: resolveCredential(),
  projectId: resolveProjectId()
});

async function syncClaims(user, isAdmin) {
  const currentClaims = user.customClaims || {};
  const nextClaims = { ...currentClaims };

  if (isAdmin) {
    nextClaims.admin = true;
  } else {
    delete nextClaims.admin;
  }

  await admin.auth().setCustomUserClaims(user.uid, nextClaims);
}

async function upsertAdminDocument(user) {
  const db = admin.firestore();
  const docRef = db.collection("admins").doc(user.uid);
  const snapshot = await docRef.get();
  const existing = snapshot.exists ? snapshot.data() || {} : {};

  const payload = {
    displayName: displayNameArg || existing.displayName || user.displayName || user.email || "Admin",
    employeeId: employeeIdArg || existing.employeeId || "",
    email: emailArg || existing.email || user.email || "",
    role: "admin",
    active: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (!snapshot.exists) {
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await docRef.set(payload, { merge: true });
  return payload;
}

async function removeAdminDocument(uid) {
  const db = admin.firestore();
  await db.collection("admins").doc(uid).delete();
}

(async () => {
  try {
    const user = await admin.auth().getUser(targetUid);

    if (adminValue) {
      const profile = await upsertAdminDocument(user);
      await syncClaims(user, true);
      console.log(`تم تفعيل المستخدم ${targetUid} كمشرف.`);
      console.log(JSON.stringify({
        uid: targetUid,
        email: profile.email,
        displayName: profile.displayName,
        employeeId: profile.employeeId,
        role: profile.role,
        active: profile.active
      }, null, 2));
      return;
    }

    await removeAdminDocument(targetUid);
    await syncClaims(user, false);
    console.log(`تم إلغاء تفعيل المستخدم ${targetUid} كمشرف وحذف مستند admins/${targetUid}.`);
  } catch (err) {
    const errorMessage = String(err && err.message ? err.message : err);
    console.error("خطأ:", errorMessage);

    if (
      errorMessage.includes("Could not load the default credentials") ||
      errorMessage.includes("Failed to determine project ID") ||
      errorMessage.includes("metadata.google.internal")
    ) {
      console.error("\nلحل المشكلة على جهازك المحلي، نفذ أحد الخيارين:");
      console.error("1) ضع ملف serviceAccountKey.json داخل مجلد functions ثم أعد تشغيل الأمر.");
      console.error("2) أو عرّف GOOGLE_APPLICATION_CREDENTIALS ليشير إلى ملف service account صالح.");
      console.error("\nاسم المشروع المستخدم:", resolveProjectId() || "غير معروف");
    }

    process.exit(1);
  }
})();