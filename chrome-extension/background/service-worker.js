import { ensureFirebase, getFirebase, firebaseAuth, firestore } from "../shared/firebase.js";
import { getFirebaseConfig } from "../shared/storage.js";

let cachedConfig = null;
let presenceContext = null;

async function ensureFirebaseReady() {
  if (!cachedConfig) {
    cachedConfig = await getFirebaseConfig();
  }

  if (!cachedConfig) {
    throw new Error("Firebase 설정이 필요합니다. 옵션 페이지에서 설정을 저장하세요.");
  }

  return ensureFirebase(cachedConfig);
}

async function withFirebase(fn) {
  await ensureFirebaseReady();
  const { auth, db } = getFirebase();
  return fn({ auth, db });
}

async function updatePresence(payload) {
  await withFirebase(async ({ db }) => {
    const {
      uid,
      role,
      online,
      teacherId,
      adminId,
      displayName,
      email
    } = payload;

    const timestamp = firestore.serverTimestamp();
    const statusDoc = firestore.doc(db, "status", uid);
    await firestore.setDoc(
      statusDoc,
      {
        uid,
        role,
        teacherId: teacherId || null,
        adminId: adminId || null,
        displayName: displayName || null,
        email: email || null,
        online,
        lastActive: timestamp
      },
      { merge: true }
    );

    if (role === "student" && teacherId) {
      const studentRef = firestore.doc(
        db,
        "teachers",
        teacherId,
        "students",
        uid
      );
      await firestore.setDoc(
        studentRef,
        {
          studentUid: uid,
          displayName: displayName || email,
          email: email || null,
          online,
          lastActive: timestamp
        },
        { merge: true }
      );
    }

    if (role === "teacher") {
      const teacherRef = firestore.doc(db, "teachers", uid);
      await firestore.setDoc(
        teacherRef,
        {
          teacherUid: uid,
          displayName: displayName || email,
          email: email || null,
          adminId: adminId || null,
          online,
          lastActive: timestamp
        },
        { merge: true }
      );
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Classroom Relay service worker installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === "presence:update") {
    presenceContext = { ...message.payload, online: true };
    updatePresence({ ...message.payload, online: true })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        console.error("Presence update failed", error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (message.type === "presence:offline") {
    presenceContext = null;
    updatePresence({ ...message.payload, online: false })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        console.error("Presence offline update failed", error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (message.type === "invite:consume") {
    withFirebase(async ({ db }) => {
      const { code } = message.payload;
      const codeRef = firestore.doc(db, "inviteCodes", code);
      const snapshot = await firestore.getDoc(codeRef);
      if (!snapshot.exists()) {
        throw new Error("유효하지 않은 초대코드입니다.");
      }
      const data = snapshot.data();
      if (data.consumedBy) {
        throw new Error("이미 사용된 초대코드입니다.");
      }
      sendResponse({ ok: true, data });
    }).catch((error) => {
      sendResponse({ ok: false, error: error.message });
    });
    return true;
  }

  if (message.type === "invite:record-consumption") {
    withFirebase(async ({ db }) => {
      const { code, uid } = message.payload;
      const codeRef = firestore.doc(db, "inviteCodes", code);
      await firestore.updateDoc(codeRef, {
        consumedBy: uid,
        consumedAt: firestore.serverTimestamp(),
        publicLookup: false
      });
      sendResponse({ ok: true });
    }).catch((error) => {
      sendResponse({ ok: false, error: error.message });
    });
    return true;
  }
});

chrome.runtime.onSuspend?.addListener(() => {
  if (!presenceContext) {
    return;
  }
  updatePresence({ ...presenceContext, online: false }).catch((error) => {
    console.warn("Failed to mark offline on suspend", error);
  });
});
