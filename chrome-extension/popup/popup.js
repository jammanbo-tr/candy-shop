import {
  ensureFirebase,
  getFirebase,
  firebaseAuth,
  firestore
} from "../shared/firebase.js";
import { getFirebaseConfig } from "../shared/storage.js";
import { generateTeacherCode, generateStudentCode } from "../utils/codeGenerator.js";

const dom = {
  configWarning: document.getElementById("config-warning"),
  openOptions: document.getElementById("open-options"),
  authSection: document.getElementById("auth-section"),
  adminSection: document.getElementById("admin-section"),
  teacherSection: document.getElementById("teacher-section"),
  studentSection: document.getElementById("student-section"),
  currentUser: document.getElementById("current-user"),
  signOut: document.getElementById("sign-out"),
  teacherCodeList: document.getElementById("teacher-code-list"),
  studentCodeList: document.getElementById("student-code-list"),
  studentStatusList: document.getElementById("student-status-list"),
  teacherChat: document.getElementById("teacher-chat"),
  studentChat: document.getElementById("student-chat"),
  chatMessages: document.getElementById("chat-messages"),
  studentChatMessages: document.getElementById("student-chat-messages"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input"),
  studentChatForm: document.getElementById("student-chat-form"),
  studentChatInput: document.getElementById("student-chat-input"),
  startClassButton: document.getElementById("start-class-button"),
  endClassButton: document.getElementById("end-class-button"),
  createTeacherCodeForm: document.getElementById("create-teacher-code-form"),
  createStudentCodeForm: document.getElementById("create-student-code-form"),
  teacherCodeTemplate: document.getElementById("code-item-template"),
  studentTemplate: document.getElementById("student-item-template"),
  chatMessageTemplate: document.getElementById("chat-message-template"),
  loginForm: document.getElementById("login-form"),
  adminRegisterForm: document.getElementById("admin-register-form"),
  teacherRegisterForm: document.getElementById("teacher-register-form"),
  studentRegisterForm: document.getElementById("student-register-form"),
  studentSessionStatus: document.getElementById("student-session-status"),

  // 새로 추가
  roleSelection: document.getElementById("role-selection"),
  authFormContainer: document.getElementById("auth-form-container"),
  backToRole: document.getElementById("back-to-role"),
  registerTab: document.getElementById("register-tab")
};

const state = {
  config: null,
  user: null,
  role: null,
  selectedRole: null, // 선택된 역할 저장
  unsubscribes: [],
  chatUnsub: null,
  sessionUnsub: null,
  teacherInviteUnsub: null,
  studentCodeUnsub: null,
  studentStatusUnsub: null,
  presencePayload: null
};

function showSection(section, show) {
  if (!section) return;
  section.classList.toggle("hidden", !show);
}

// 역할 선택 화면 표시/숨김
function showRoleSelection(show) {
  if (!dom.roleSelection || !dom.authFormContainer) return;
  showSection(dom.roleSelection, show);
  showSection(dom.authFormContainer, !show);
}

// 역할에 따른 가입 폼 표시
function showRegisterForm(role) {
  if (!dom.adminRegisterForm || !dom.teacherRegisterForm || !dom.studentRegisterForm) return;

  dom.adminRegisterForm.classList.add("hidden");
  dom.teacherRegisterForm.classList.add("hidden");
  dom.studentRegisterForm.classList.add("hidden");

  if (role === "admin") {
    dom.adminRegisterForm.classList.remove("hidden");
  } else if (role === "teacher") {
    dom.teacherRegisterForm.classList.remove("hidden");
  } else if (role === "student") {
    dom.studentRegisterForm.classList.remove("hidden");
  }
}

function clearList(listEl) {
  if (listEl) {
    listEl.innerHTML = "";
  }
}

function displayError(error) {
  console.error(error);
  alert(error.message || "요청 처리 중 오류가 발생했습니다.");
}

function switchTab(targetId) {
  const buttons = document.querySelectorAll(".tab-button");
  const contents = document.querySelectorAll(".tab-content");

  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === targetId);
  });

  contents.forEach((content) => {
    content.classList.toggle("active", content.id === targetId);
  });
}

function formatTimestamp(ts) {
  if (!ts) return "-";
  try {
    const date =
      typeof ts.toDate === "function" ? ts.toDate() : new Date(ts.seconds * 1000);
    return date.toLocaleString();
  } catch (error) {
    return "-";
  }
}

function formatTimeShort(ts) {
  if (!ts) return "";
  try {
    const date =
      typeof ts.toDate === "function" ? ts.toDate() : new Date(ts.seconds * 1000);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (error) {
    return "";
  }
}

function createCodeElement(codeData) {
  const fragment = dom.teacherCodeTemplate.content.cloneNode(true);
  const li = fragment.querySelector("li");
  li.dataset.code = codeData.code;
  li.querySelector(".code-value").textContent = codeData.code;
  const metaParts = [];
  if (codeData.note) {
    metaParts.push(codeData.note);
  }
  metaParts.push(`생성: ${formatTimestamp(codeData.createdAt)}`);
  if (codeData.consumedBy) {
    metaParts.push("사용 완료");
  }
  li.querySelector(".code-meta").textContent = metaParts.join(" · ");
  const copyBtn = li.querySelector(".copy-button");
  copyBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(codeData.code);
    copyBtn.textContent = "복사됨!";
    setTimeout(() => {
      copyBtn.textContent = "복사";
    }, 1200);
  });
  return li;
}

function createStudentStatusElement(studentData) {
  const fragment = dom.studentTemplate.content.cloneNode(true);
  const li = fragment.querySelector("li");
  li.querySelector(".student-name").textContent =
    studentData.displayName || studentData.email || "알 수 없음";
  li.querySelector(".student-email").textContent = studentData.email || "";
  li
    .querySelector(".student-status")
    .textContent = studentData.online ? "온라인" : "오프라인";
  return li;
}

function createMessageElement(data, currentUid) {
  const fragment = dom.chatMessageTemplate.content.cloneNode(true);
  const el = fragment.querySelector(".message");
  if (data.senderId === currentUid) {
    el.classList.add("me");
  }
  el.querySelector(".sender").textContent =
    data.senderName || (data.role === "teacher" ? "선생님" : "학생");
  el.querySelector(".body").textContent = data.body || "";
  el.querySelector(".timestamp").textContent = formatTimeShort(data.createdAt);
  return el;
}

function setPresence(payload) {
  if (!payload) return;
  state.presencePayload = payload;
  chrome.runtime.sendMessage(
    {
      type: "presence:update",
      payload
    },
    () => chrome.runtime.lastError && console.warn(chrome.runtime.lastError)
  );
}

function clearPresence() {
  if (!state.presencePayload) return;
  chrome.runtime.sendMessage(
    {
      type: "presence:offline",
      payload: state.presencePayload
    },
    () => chrome.runtime.lastError && console.warn(chrome.runtime.lastError)
  );
  state.presencePayload = null;
}

function clearSubscriptions() {
  [
    state.chatUnsub,
    state.sessionUnsub,
    state.teacherInviteUnsub,
    state.studentCodeUnsub,
    state.studentStatusUnsub,
    ...state.unsubscribes
  ].forEach((unsub) => {
    if (typeof unsub === "function") {
      unsub();
    }
  });
  state.chatUnsub = null;
  state.sessionUnsub = null;
  state.teacherInviteUnsub = null;
  state.studentCodeUnsub = null;
  state.studentStatusUnsub = null;
  state.unsubscribes = [];
}

function resetUI() {
  showSection(dom.authSection, true);
  showSection(dom.adminSection, false);
  showSection(dom.teacherSection, false);
  showSection(dom.studentSection, false);
  showSection(dom.teacherChat, false);
  showSection(dom.studentChat, false);

  // 역할 선택 화면 표시
  showRoleSelection(true);

  dom.currentUser.textContent = "";
  dom.signOut.classList.add("hidden");
  dom.startClassButton.disabled = false;
  dom.endClassButton.disabled = true;
  clearList(dom.teacherCodeList);
  clearList(dom.studentCodeList);
  clearList(dom.studentStatusList);
  clearList(dom.chatMessages);
  clearList(dom.studentChatMessages);
  dom.studentSessionStatus.textContent =
    "선생님이 수업을 시작하면 자동으로 채팅이 열립니다.";
}

async function handleAdminLoggedIn(roleData) {
  const { db } = getFirebase();
  showSection(dom.adminSection, true);
  dom.signOut.classList.remove("hidden");

  const q = firestore.query(
    firestore.collection(db, "inviteCodes"),
    firestore.where("adminId", "==", state.user.uid),
    firestore.where("type", "==", "teacher"),
    firestore.orderBy("createdAt", "desc")
  );

  state.teacherInviteUnsub = firestore.onSnapshot(
    q,
    (snapshot) => {
      clearList(dom.teacherCodeList);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const element = createCodeElement({
          ...data,
          code: docSnap.id
        });
        dom.teacherCodeList.appendChild(element);
      });
    },
    displayError
  );
}

async function handleTeacherLoggedIn(roleData) {
  const { db } = getFirebase();
  showSection(dom.teacherSection, true);
  dom.signOut.classList.remove("hidden");

  dom.startClassButton.disabled = false;
  dom.endClassButton.disabled = true;

  const codeQuery = firestore.query(
    firestore.collection(db, "inviteCodes"),
    firestore.where("teacherId", "==", state.user.uid),
    firestore.where("type", "==", "student"),
    firestore.orderBy("createdAt", "desc")
  );

  state.studentCodeUnsub = firestore.onSnapshot(
    codeQuery,
    (snapshot) => {
      clearList(dom.studentCodeList);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        dom.studentCodeList.appendChild(
          createCodeElement({ ...data, code: docSnap.id })
        );
      });
    },
    displayError
  );

  const statusRef = firestore.collection(
    db,
    "teachers",
    state.user.uid,
    "students"
  );
  state.studentStatusUnsub = firestore.onSnapshot(
    statusRef,
    (snapshot) => {
      clearList(dom.studentStatusList);
      snapshot.forEach((docSnap) => {
        dom.studentStatusList.appendChild(createStudentStatusElement(docSnap.data()));
      });
    },
    displayError
  );

  const sessionRef = firestore.doc(db, "classSessions", state.user.uid);
  state.sessionUnsub = firestore.onSnapshot(
    sessionRef,
    (docSnap) => {
      const data = docSnap.data();
      const active = data?.active;
      dom.startClassButton.disabled = !!active;
      dom.endClassButton.disabled = !active;
      showSection(dom.teacherChat, !!active);
      if (!active) {
        clearList(dom.chatMessages);
        if (state.chatUnsub) {
          state.chatUnsub();
          state.chatUnsub = null;
        }
        return;
      }
      subscribeChatMessages(state.user.uid, true);
    },
    displayError
  );
}

async function handleStudentLoggedIn(roleData) {
  const { db } = getFirebase();
  showSection(dom.studentSection, true);
  dom.signOut.classList.remove("hidden");

  const teacherId = roleData.teacherId;
  if (!teacherId) {
    dom.studentSessionStatus.textContent =
      "담당 교사 정보를 찾을 수 없습니다. 관리자에게 문의하세요.";
    return;
  }

  const sessionRef = firestore.doc(db, "classSessions", teacherId);
  state.sessionUnsub = firestore.onSnapshot(
    sessionRef,
    (docSnap) => {
      const data = docSnap.data();
      if (!data || !data.active) {
        dom.studentSessionStatus.textContent =
          "선생님이 수업을 시작하면 자동으로 채팅이 열립니다.";
        showSection(dom.studentChat, false);
        clearList(dom.studentChatMessages);
        if (state.chatUnsub) {
          state.chatUnsub();
          state.chatUnsub = null;
        }
        return;
      }

      dom.studentSessionStatus.textContent = `수업 진행 중 - ${formatTimestamp(
        data.startedAt
      )}`;
      showSection(dom.studentChat, true);
      subscribeChatMessages(teacherId, false);
    },
    displayError
  );
}

function subscribeChatMessages(teacherId, isTeacher) {
  if (state.chatUnsub) {
    return;
  }
  const { db } = getFirebase();
  const messagesRef = firestore.collection(
    db,
    "classSessions",
    teacherId,
    "messages"
  );
  const q = firestore.query(messagesRef, firestore.orderBy("createdAt", "asc"));
  state.chatUnsub = firestore.onSnapshot(
    q,
    (snapshot) => {
      const container = isTeacher ? dom.chatMessages : dom.studentChatMessages;
      clearList(container);
      snapshot.forEach((docSnap) => {
        const el = createMessageElement(docSnap.data(), state.user.uid);
        container.appendChild(el);
      });
      container.scrollTop = container.scrollHeight;
    },
    displayError
  );
}

async function handleRoleAndPresence(roleData) {
  if (!state.user) return;
  const presencePayload = {
    uid: state.user.uid,
    role: roleData?.role || "unknown",
    teacherId: roleData?.teacherId || null,
    adminId: roleData?.adminId || null,
    displayName: state.user.displayName || null,
    email: state.user.email || null
  };
  setPresence(presencePayload);
}

async function loadRoleData(user) {
  const { db } = getFirebase();
  const roleRef = firestore.doc(db, "roles", user.uid);
  const snapshot = await firestore.getDoc(roleRef);
  if (!snapshot.exists()) {
    throw new Error("역할 정보를 찾을 수 없습니다. 관리자에게 문의하세요.");
  }
  return snapshot.data();
}

async function registerAdmin(event) {
  event.preventDefault();
  const { displayName, email, password } = Object.fromEntries(
    new FormData(event.target).entries()
  );
  if (!displayName || !email || !password) {
    alert("모든 필드를 입력하세요.");
    return;
  }
  await ensureFirebase(state.config);
  const { auth, db } = getFirebase();
  try {
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await firebaseAuth.updateProfile(userCredential.user, { displayName });
    await firestore.setDoc(firestore.doc(db, "roles", userCredential.user.uid), {
      role: "admin",
      createdAt: firestore.serverTimestamp()
    });
    await firestore.setDoc(firestore.doc(db, "admins", userCredential.user.uid), {
      adminUid: userCredential.user.uid,
      displayName,
      email,
      createdAt: firestore.serverTimestamp()
    });
    event.target.reset();
  } catch (error) {
    displayError(error);
  }
}

async function validateInviteCode(code) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "invite:consume",
        payload: { code }
      },
      (response) => {
        if (!response || !response.ok) {
          const message = response?.error || "초대코드 확인에 실패했습니다.";
          reject(new Error(message));
          return;
        }
        resolve(response.data);
      }
    );
  });
}

async function recordInviteConsumption(code, uid) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "invite:record-consumption",
        payload: { code, uid }
      },
      (response) => {
        if (!response || !response.ok) {
          const message = response?.error || "초대코드 사용 기록에 실패했습니다.";
          reject(new Error(message));
          return;
        }
        resolve();
      }
    );
  });
}

async function registerTeacher(event) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());
  const { displayName, email, password, inviteCode } = formData;
  if (!displayName || !email || !password || !inviteCode) {
    alert("모든 필드를 입력하세요.");
    return;
  }
  await ensureFirebase(state.config);
  const { auth, db } = getFirebase();
  try {
    const codeInfo = await validateInviteCode(inviteCode.trim());
    if (codeInfo.type !== "teacher") {
      throw new Error("관리자가 발급한 교사용 코드가 아닙니다.");
    }
    const cred = await firebaseAuth.createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await firebaseAuth.updateProfile(cred.user, { displayName });
    await firestore.setDoc(firestore.doc(db, "roles", cred.user.uid), {
      role: "teacher",
      adminId: codeInfo.adminId || null,
      createdAt: firestore.serverTimestamp()
    });
    await firestore.setDoc(firestore.doc(db, "teachers", cred.user.uid), {
      teacherUid: cred.user.uid,
      displayName,
      email,
      adminId: codeInfo.adminId || null,
      createdAt: firestore.serverTimestamp()
    });
    await recordInviteConsumption(inviteCode.trim(), cred.user.uid);
    event.target.reset();
  } catch (error) {
    displayError(error);
  }
}

async function registerStudent(event) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());
  const { displayName, email, password, inviteCode } = formData;
  if (!displayName || !email || !password || !inviteCode) {
    alert("모든 필드를 입력하세요.");
    return;
  }
  await ensureFirebase(state.config);
  const { auth, db } = getFirebase();
  try {
    const codeInfo = await validateInviteCode(inviteCode.trim());
    if (codeInfo.type !== "student") {
      throw new Error("교사가 발급한 학생용 코드가 아닙니다.");
    }
    const cred = await firebaseAuth.createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await firebaseAuth.updateProfile(cred.user, { displayName });
    await firestore.setDoc(firestore.doc(db, "roles", cred.user.uid), {
      role: "student",
      adminId: codeInfo.adminId || null,
      teacherId: codeInfo.teacherId || null,
      createdAt: firestore.serverTimestamp()
    });
    await firestore.setDoc(firestore.doc(db, "students", cred.user.uid), {
      studentUid: cred.user.uid,
      displayName,
      email,
      teacherId: codeInfo.teacherId || null,
      adminId: codeInfo.adminId || null,
      createdAt: firestore.serverTimestamp()
    });
    await recordInviteConsumption(inviteCode.trim(), cred.user.uid);
    event.target.reset();
  } catch (error) {
    displayError(error);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const { email, password } = Object.fromEntries(
    new FormData(event.target).entries()
  );
  if (!email || !password) {
    alert("이메일과 비밀번호를 입력하세요.");
    return;
  }
  await ensureFirebase(state.config);
  const { auth } = getFirebase();
  try {
    await firebaseAuth.signInWithEmailAndPassword(auth, email, password);
    event.target.reset();
  } catch (error) {
    displayError(error);
  }
}

async function handleSignOut() {
  if (!state.user) return;
  await ensureFirebase(state.config);
  const { auth } = getFirebase();
  try {
    clearPresence();
    clearSubscriptions();
    await firebaseAuth.signOut(auth);
  } catch (error) {
    displayError(error);
  }
}

async function createInviteCode(type, note) {
  const { db } = getFirebase();
  const code = type === "teacher" ? generateTeacherCode() : generateStudentCode();
  const payload = {
    type,
    note: note || null,
    createdAt: firestore.serverTimestamp(),
    createdBy: state.user.uid,
    adminId: state.role.adminId || state.user.uid,
    consumedBy: null,
    publicLookup: true
  };
  if (type === "teacher") {
    payload.adminId = state.user.uid;
  }
  if (type === "student") {
    payload.teacherId = state.user.uid;
  }
  await firestore.setDoc(firestore.doc(db, "inviteCodes", code), payload);
  return code;
}

async function handleCreateTeacherCode(event) {
  event.preventDefault();
  const { note } = Object.fromEntries(new FormData(event.target).entries());
  try {
    await ensureFirebase(state.config);
    const code = await createInviteCode("teacher", note);
    alert(`교사 초대코드가 생성되었습니다: ${code}`);
    event.target.reset();
  } catch (error) {
    displayError(error);
  }
}

async function handleCreateStudentCode(event) {
  event.preventDefault();
  const { note } = Object.fromEntries(new FormData(event.target).entries());
  try {
    await ensureFirebase(state.config);
    const code = await createInviteCode("student", note);
    alert(`학생 초대코드가 생성되었습니다: ${code}`);
    event.target.reset();
  } catch (error) {
    displayError(error);
  }
}

async function handleStartClass() {
  if (!state.user) return;
  await ensureFirebase(state.config);
  const { db } = getFirebase();
  try {
    await firestore.setDoc(
      firestore.doc(db, "classSessions", state.user.uid),
      {
        active: true,
        startedAt: firestore.serverTimestamp(),
        teacherId: state.user.uid,
        teacherName: state.user.displayName || state.user.email || "Teacher"
      },
      { merge: true }
    );
  } catch (error) {
    displayError(error);
  }
}

async function handleEndClass() {
  if (!state.user) return;
  await ensureFirebase(state.config);
  const { db } = getFirebase();
  try {
    // 수업 종료
    await firestore.setDoc(
      firestore.doc(db, "classSessions", state.user.uid),
      {
        active: false,
        endedAt: firestore.serverTimestamp()
      },
      { merge: true }
    );

    // 수업 종료 후 자동으로 새로운 학생 초대 코드 생성
    const newCode = await createInviteCode("student", "수업 종료 후 자동 생성");
    console.log(`새로운 학생 초대 코드가 자동 생성되었습니다: ${newCode}`);
  } catch (error) {
    displayError(error);
  }
}

async function sendChatMessage(event, teacherId) {
  event.preventDefault();
  if (!state.user) return;
  if (!teacherId) {
    alert("채팅 방 정보를 찾을 수 없습니다.");
    return;
  }
  const input = event.target.querySelector("input");
  const text = input.value.trim();
  if (!text) return;

  await ensureFirebase(state.config);
  const { db } = getFirebase();
  try {
    await firestore.addDoc(
      firestore.collection(db, "classSessions", teacherId, "messages"),
      {
        body: text,
        senderId: state.user.uid,
        senderName:
          state.user.displayName || state.user.email || state.role?.role || "",
        role: state.role?.role || "unknown",
        createdAt: firestore.serverTimestamp()
      }
    );
    input.value = "";
  } catch (error) {
    displayError(error);
  }
}

// 디폴트 관리자 계정 생성
async function createDefaultAdminIfNeeded() {
  await ensureFirebase(state.config);
  const { auth, db } = getFirebase();

  try {
    // jammanbo 계정이 이미 있는지 확인
    const usersSnapshot = await firestore.getDoc(
      firestore.doc(db, "users", "jammanbo")
    );

    if (usersSnapshot.exists()) {
      console.log("Default admin already exists");
      return;
    }

    // 디폴트 관리자 생성
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(
      auth,
      "jammanbo@candyshop.com",
      "vpdrnls123"
    );

    await firebaseAuth.updateProfile(userCredential.user, {
      displayName: "관리자"
    });

    await firestore.setDoc(firestore.doc(db, "roles", userCredential.user.uid), {
      role: "admin",
      createdAt: firestore.serverTimestamp()
    });

    await firestore.setDoc(firestore.doc(db, "admins", userCredential.user.uid), {
      adminUid: userCredential.user.uid,
      displayName: "관리자",
      email: "jammanbo@candyshop.com",
      createdAt: firestore.serverTimestamp()
    });

    console.log("Default admin created successfully");

    // 생성 후 로그아웃
    await firebaseAuth.signOut(auth);
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      console.log("Default admin email already exists");
    } else {
      console.error("Error creating default admin:", error);
    }
  }
}

function setupEventListeners() {
  // 역할 선택 버튼
  const roleButtons = document.querySelectorAll(".role-button");
  console.log("Found role buttons:", roleButtons.length);

  roleButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      console.log("Role button clicked:", button.dataset.role);
      e.preventDefault();
      e.stopPropagation();

      const role = button.dataset.role;
      state.selectedRole = role;
      showRoleSelection(false);
      showRegisterForm(role);
    });
  });

  // 뒤로 버튼
  if (dom.backToRole) {
    dom.backToRole.addEventListener("click", (e) => {
      console.log("Back button clicked");
      e.preventDefault();
      showRoleSelection(true);
      state.selectedRole = null;
    });
  }

  // 탭 전환
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      switchTab(button.dataset.tab);

      // 회원가입 탭이면 선택된 역할의 폼 표시
      if (button.dataset.tab === "register-tab" && state.selectedRole) {
        showRegisterForm(state.selectedRole);
      }
    });
  });

  dom.openOptions?.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
  dom.loginForm?.addEventListener("submit", handleLogin);
  dom.adminRegisterForm?.addEventListener("submit", registerAdmin);
  dom.teacherRegisterForm?.addEventListener("submit", registerTeacher);
  dom.studentRegisterForm?.addEventListener("submit", registerStudent);
  dom.signOut?.addEventListener("click", handleSignOut);
  dom.createTeacherCodeForm?.addEventListener("submit", handleCreateTeacherCode);
  dom.createStudentCodeForm?.addEventListener("submit", handleCreateStudentCode);
  dom.startClassButton?.addEventListener("click", handleStartClass);
  dom.endClassButton?.addEventListener("click", handleEndClass);
  dom.chatForm?.addEventListener("submit", (event) =>
    sendChatMessage(event, state.user.uid)
  );
  dom.studentChatForm?.addEventListener("submit", (event) =>
    sendChatMessage(event, state.role.teacherId)
  );
}

async function initialize() {
  console.log("Initialize started");
  resetUI();
  console.log("ResetUI done");
  setupEventListeners();
  console.log("Event listeners setup done");

  state.config = await getFirebaseConfig();
  const configMissing = !state.config;
  showSection(dom.configWarning, configMissing);
  if (configMissing) {
    console.log("Firebase config missing");
    return;
  }

  await ensureFirebase(state.config);
  console.log("Firebase initialized");

  // 디폴트 관리자 계정 생성 (백그라운드에서 실행)
  createDefaultAdminIfNeeded().catch(err => console.log("Default admin creation error:", err));

  const { auth } = getFirebase();
  firebaseAuth.onAuthStateChanged(auth, async (user) => {
    clearSubscriptions();
    clearPresence();
    state.user = user;
    state.role = null;
    if (!user) {
      resetUI();
      return;
    }
    dom.currentUser.textContent = `${user.displayName || ""} (${user.email})`;
    showSection(dom.authSection, false);
    try {
      state.role = await loadRoleData(user);
      await handleRoleAndPresence(state.role);
      const role = state.role.role;
      if (role === "admin") {
        await handleAdminLoggedIn(state.role);
      } else if (role === "teacher") {
        await handleTeacherLoggedIn(state.role);
      } else if (role === "student") {
        await handleStudentLoggedIn(state.role);
      } else {
        alert("지원하지 않는 역할입니다. 관리자에게 문의하세요.");
      }
    } catch (error) {
      displayError(error);
    }
  });
}

initialize().catch(displayError);
