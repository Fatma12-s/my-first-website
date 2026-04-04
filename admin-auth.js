(function () {
  function readStoredSession() {
    try {
      return JSON.parse(sessionStorage.getItem('adminSession') || 'null');
    } catch (err) {
      return null;
    }
  }

  function writeStoredSession(user, profile) {
    const session = {
      uid: user.uid,
      email: user.email || profile.email || '',
      employeeId: profile.employeeId || '',
      displayName: profile.displayName || profile.name || user.email || 'Admin',
      role: profile.role || 'admin',
      loginAt: new Date().toISOString()
    };
    sessionStorage.setItem('adminSession', JSON.stringify(session));
    sessionStorage.setItem('adminToken', user.uid);
    return session;
  }

  function clearStoredSession() {
    sessionStorage.removeItem('adminSession');
    sessionStorage.removeItem('adminToken');
  }

  function normalizeAdminProfile(data, user) {
    return {
      uid: user.uid,
      email: data.email || user.email || '',
      employeeId: data.employeeId || '',
      displayName: data.displayName || data.name || user.email || 'Admin',
      role: String(data.role || '').toLowerCase(),
      active: data.active === true
    };
  }

  function isAuthorizedProfile(profile) {
    return !!profile && profile.active === true && profile.role === 'admin';
  }

  async function ensureFirebase() {
    if (typeof window.ensureFirebaseReady === 'function') {
      const ok = await window.ensureFirebaseReady();
      if (!ok) throw new Error('Firebase initialization failed');
      return ok;
    }
    throw new Error('Firebase bootstrap غير متوفر');
  }

  function getAuth() {
    return (window.firebaseAuth || (window.firebase && window.firebase.auth && window.firebase.auth())) || null;
  }

  function getDb() {
    return window.db || (window.firebase && window.firebase.firestore && window.firebase.firestore()) || null;
  }

  async function getAdminProfile(user) {
    const db = getDb();
    if (!db) throw new Error('Firestore غير متوفر');

    const snapshot = await db.collection('admins').doc(user.uid).get();
    if (!snapshot.exists) return null;
    return normalizeAdminProfile(snapshot.data() || {}, user);
  }

  async function signIn(email, password) {
    await ensureFirebase();
    const auth = getAuth();
    if (!auth) throw new Error('Firebase Auth غير متوفر');

    const credential = await auth.signInWithEmailAndPassword(email, password);
    const user = credential.user;
    const profile = await getAdminProfile(user);

    if (!isAuthorizedProfile(profile)) {
      await auth.signOut();
      clearStoredSession();
      throw new Error('not-authorized');
    }

    const session = writeStoredSession(user, profile);
    return { user, profile, session };
  }

  async function waitForAuthState() {
    await ensureFirebase();
    const auth = getAuth();
    if (!auth) return null;

    if (auth.currentUser) return auth.currentUser;

    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user || null);
      }, () => resolve(null));
    });
  }

  async function requireAdmin() {
    const user = await waitForAuthState();
    if (!user) {
      clearStoredSession();
      return { ok: false, reason: 'unauthenticated' };
    }

    const profile = await getAdminProfile(user);
    if (!isAuthorizedProfile(profile)) {
      const auth = getAuth();
      if (auth) await auth.signOut();
      clearStoredSession();
      return { ok: false, reason: 'forbidden' };
    }

    const session = writeStoredSession(user, profile);
    return { ok: true, user, profile, session };
  }

  async function signOut() {
    try {
      await ensureFirebase();
      const auth = getAuth();
      if (auth) {
        await auth.signOut();
      }
    } finally {
      clearStoredSession();
    }
  }

  async function sendPasswordReset(email) {
    await ensureFirebase();
    const auth = getAuth();
    if (!auth) throw new Error('Firebase Auth غير متوفر');
    await auth.sendPasswordResetEmail(email);
  }

  window.adminAuth = {
    ensureFirebase,
    signIn,
    requireAdmin,
    signOut,
    sendPasswordReset,
    readStoredSession,
    clearStoredSession
  };
})();