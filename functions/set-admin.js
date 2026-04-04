// usage:
//   node set-admin.js <TARGET_UID> <true|false> [email] [displayName] [employeeId]
// examples:
//   node set-admin.js abc123 true fsalim@squ.edu.om "Fatma Admin" EMP001
//   node set-admin.js abc123 false
const admin = require("firebase-admin");

if (process.argv.length < 4) {
  console.error("usage: node set-admin.js <TARGET_UID> <true|false> [email] [displayName] [employeeId]");
  process.exit(1);
}

const targetUid = process.argv[2];
const adminValue = process.argv[3] === "true";
const emailArg = process.argv[4] || "";
const displayNameArg = process.argv[5] || "";
const employeeIdArg = process.argv[6] || "";

admin.initializeApp({
  credential: admin.credential.applicationDefault()
  // أو استخدم ملف serviceAccountKey.json:
  // credential: admin.credential.cert(require("./serviceAccountKey.json"))
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
    console.error("خطأ:", err.message);
    process.exit(1);
  }
})();