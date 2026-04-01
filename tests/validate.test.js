/**
 * اختبارات أساسية للتحقق من صحة ملفات الإعداد والأمان
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ ${description}`);
    failed++;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

const root = path.resolve(__dirname, '..');

// ─── 1. فحص وجود ملفات النماذج ─────────────────────────────────────────────
console.log('\n📁 فحص وجود ملفات النماذج:');

assert(
  fs.existsSync(path.join(root, 'firebase-config.example.js')),
  'يجب أن يوجد firebase-config.example.js'
);

assert(
  fs.existsSync(path.join(root, 'email-config.example.js')),
  'يجب أن يوجد email-config.example.js'
);

assert(
  fs.existsSync(path.join(root, '.gitignore')),
  'يجب أن يوجد .gitignore'
);

assert(
  fs.existsSync(path.join(root, 'README.md')),
  'يجب أن يوجد README.md'
);

// ─── 2. فحص .gitignore ───────────────────────────────────────────────────────
console.log('\n🔒 فحص .gitignore:');

const gitignore = readFile(path.join(root, '.gitignore')) || '';

assert(
  gitignore.includes('firebase-config.js'),
  'يجب أن يُدرج .gitignore ملف firebase-config.js'
);

assert(
  gitignore.includes('email-config.js'),
  'يجب أن يُدرج .gitignore ملف email-config.js'
);

assert(
  gitignore.includes('.env'),
  'يجب أن يُدرج .gitignore ملفات .env'
);

assert(
  gitignore.includes('node_modules'),
  'يجب أن يُدرج .gitignore مجلد node_modules'
);

// ─── 3. فحص عدم وجود مفاتيح حقيقية في ملفات النماذج ─────────────────────────
console.log('\n🔑 فحص ملفات النماذج (يجب ألا تحتوي على مفاتيح حقيقية):');

const firebaseExample = readFile(path.join(root, 'firebase-config.example.js')) || '';

assert(
  !firebaseExample.match(/AIzaSy[A-Za-z0-9_-]{30,}/),
  'firebase-config.example.js يجب ألا يحتوي على Firebase API key حقيقي'
);

assert(
  firebaseExample.includes('YOUR_') || firebaseExample.includes('your-'),
  'firebase-config.example.js يجب أن يحتوي على قيم نموذجية'
);

const emailExample = readFile(path.join(root, 'email-config.example.js')) || '';

assert(
  !emailExample.match(/service_[a-z0-9]{7,}/),
  'email-config.example.js يجب ألا يحتوي على Service ID حقيقي'
);

assert(
  emailExample.includes('YOUR_'),
  'email-config.example.js يجب أن يحتوي على قيم نموذجية'
);

// ─── 4. فحص عدم وجود مفاتيح حقيقية في firebase-config.js إن كان موجودًا ──────
console.log('\n🔐 فحص firebase-config.js (إن كان موجودًا):');

const firebaseConfig = readFile(path.join(root, 'firebase-config.js'));

if (firebaseConfig !== null) {
  assert(
    !firebaseConfig.match(/AIzaSy[A-Za-z0-9_-]{30,}/),
    'firebase-config.js يجب ألا يحتوي على Firebase API key حقيقي'
  );

  assert(
    !firebaseConfig.match(/messagingSenderId:\s*['"]\d{10,}['"]/),
    'firebase-config.js يجب ألا يحتوي على messagingSenderId حقيقي'
  );
} else {
  console.log('  ℹ️  firebase-config.js غير موجود (مُدرج في .gitignore — هذا صحيح)');
}

const emailConfig = readFile(path.join(root, 'email-config.js'));

if (emailConfig !== null) {
  assert(
    !emailConfig.match(/service_[a-z0-9]{7,}/),
    'email-config.js يجب ألا يحتوي على Service ID حقيقي'
  );
} else {
  console.log('  ℹ️  email-config.js غير موجود (مُدرج في .gitignore — هذا صحيح)');
}

// ─── 5. فحص بنية README.md ───────────────────────────────────────────────────
console.log('\n📚 فحص README.md:');

const readme = readFile(path.join(root, 'README.md')) || '';

assert(readme.length > 500, 'README.md يجب أن يكون شاملاً (أكثر من 500 حرف)');
assert(readme.includes('firebase-config.example.js'), 'README.md يجب أن يذكر ملف النموذج');
assert(readme.includes('email-config.example.js'), 'README.md يجب أن يذكر ملف نموذج EmailJS');

// ─── ملخص النتائج ─────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
console.log(`📊 النتائج: ${passed} نجح، ${failed} فشل`);

if (failed > 0) {
  console.error('\n❌ بعض الاختبارات فشلت!');
  process.exit(1);
} else {
  console.log('\n✅ جميع الاختبارات نجحت!');
}
