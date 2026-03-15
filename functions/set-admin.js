// usage: node set-admin.js <TARGET_UID> <true|false>
const admin = require("firebase-admin");
const path = require("path");

if (process.argv.length !== 4) {
  console.error("usage: node set-admin.js <TARGET_UID> <true|false>");
  process.exit(1);
}

const targetUid = process.argv[2];
const adminValue = process.argv[3] === "true";

admin.initializeApp({
  credential: admin.credential.applicationDefault()
  // أو استخدم ملف serviceAccountKey.json:
  // credential: admin.credential.cert(require("./serviceAccountKey.json"))
});

(async () => {
  try {
    const user = await admin.auth().getUser(targetUid);
    const currentClaims = user.customClaims || {};
    const newClaims = { ...currentClaims };

    // تراجع عن خطوة تعيين admin=true
    delete newClaims.admin;

    await admin.auth().setCustomUserClaims(targetUid, newClaims);
    console.log(`تم إزالة claim admin من المستخدم ${targetUid}`);
  } catch (err) {
    console.error("خطأ:", err.message);
    process.exit(1);
  }
})();