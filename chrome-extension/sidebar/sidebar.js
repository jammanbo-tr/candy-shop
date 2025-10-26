import {
  ensureFirebase,
  getFirebase,
  firebaseAuth,
  firestore
} from "../shared/firebase.js";
import { getFirebaseConfig } from "../shared/storage.js";

// DOM 요소
const dom = {
  notLoggedIn: document.getElementById("not-logged-in"),
  studentSidebar: document.getElementById("student-sidebar"),
  teacherSidebar: document.getElementById("teacher-sidebar"),
  adminSidebar: document.getElementById("admin-sidebar"),

  // 학생용
  sessionStatus: document.getElementById("session-status"),
  messages: document.getElementById("messages"),
  messageForm: document.getElementById("message-form"),
  messageInput: document.getElementById("message-input"),
  sendButton: document.getElementById("send-button"),
  infoText: document.getElementById("info-text"),

  // 교사용
  startSessionBtn: document.getElementById("start-session-btn"),
  endSessionBtn: document.getElementById("end-session-btn"),
  studentsList: document.getElementById("students-list"),
  studentCount: document.getElementById("student-count"),
  teacherMessages: document.getElementById("teacher-messages"),
  teacherMessageForm: document.getElementById("teacher-message-form"),
  teacherMessageInput: document.getElementById("teacher-message-input"),
  teacherSendButton: document.getElementById("teacher-send-button"),
  linkForm: document.getElementById("link-form"),
  linkInput: document.getElementById("link-input"),

  // 템플릿
  messageTemplate: document.getElementById("message-template"),
  linkTemplate: document.getElementById("link-template"),
  studentTemplate: document.getElementById("student-template")
};

// 상태 관리
const state = {
  config: null,
  user: null,
  role: null,
  teacherId: null,
  sessionActive: false,
  unsubscribes: []
};

// 유틸리티 함수
function showSection(section, show) {
  if (!section) return;
  section.classList.toggle("hidden", !show);
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  try {
    const date = typeof timestamp.toDate === "function"
      ? timestamp.toDate()
      : new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (error) {
    return "";
  }
}

function displayError(error) {
  console.error(error);
  alert(error.message || "오류가 발생했습니다.");
}

function clearSubscriptions() {
  state.unsubscribes.forEach(unsub => {
    if (typeof unsub === "function") unsub();
  });
  state.unsubscribes = [];
}

// 메시지 생성
function createMessageElement(messageData, isOwnMessage = false) {
  const template = messageData.type === "link"
    ? dom.linkTemplate
    : dom.messageTemplate;

  const fragment = template.content.cloneNode(true);
  const messageEl = fragment.querySelector(".message");

  if (isOwnMessage) {
    messageEl.classList.add("own-message");
  }

  if (messageData.type === "link") {
    const linkEl = messageEl.querySelector(".shared-link");
    linkEl.href = messageData.body;
    linkEl.textContent = messageData.body;
  } else {
    messageEl.querySelector(".sender-name").textContent =
      messageData.senderName || "익명";
    messageEl.querySelector(".message-body").textContent =
      messageData.body || "";
  }

  messageEl.querySelector(".timestamp").textContent =
    formatTime(messageData.createdAt);

  return messageEl;
}

// 학생 목록 아이템 생성
function createStudentElement(studentData) {
  const fragment = dom.studentTemplate.content.cloneNode(true);
  const li = fragment.querySelector(".student-item");

  li.querySelector(".student-name").textContent =
    studentData.displayName || studentData.email || "알 수 없음";

  const indicator = li.querySelector(".online-indicator");
  if (studentData.online) {
    indicator.classList.add("online");
  }

  return li;
}

// 학생용 기능
async function initStudentSidebar(roleData) {
  showSection(dom.studentSidebar, true);
  state.teacherId = roleData.teacherId;

  if (!state.teacherId) {
    dom.infoText.textContent = "담당 교사 정보를 찾을 수 없습니다.";
    return;
  }

  const { db } = getFirebase();

  // 세션 상태 감지
  const sessionRef = firestore.doc(db, "classSessions", state.teacherId);
  const sessionUnsub = firestore.onSnapshot(sessionRef, (snapshot) => {
    const data = snapshot.data();
    state.sessionActive = data?.active || false;

    if (state.sessionActive) {
      dom.sessionStatus.textContent = "수업 중";
      dom.sessionStatus.classList.add("active");
      dom.messageInput.disabled = false;
      dom.sendButton.disabled = false;
      dom.infoText.style.display = "none";
      subscribeToMessages(state.teacherId, dom.messages);
    } else {
      dom.sessionStatus.textContent = "대기 중";
      dom.sessionStatus.classList.remove("active");
      dom.messageInput.disabled = true;
      dom.sendButton.disabled = true;
      dom.infoText.style.display = "block";
      dom.messages.innerHTML = "";
    }
  }, displayError);

  state.unsubscribes.push(sessionUnsub);

  // 메시지 전송
  dom.messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await sendMessage(state.teacherId, dom.messageInput);
  });
}

// 교사용 기능
async function initTeacherSidebar() {
  showSection(dom.teacherSidebar, true);
  state.teacherId = state.user.uid;

  const { db } = getFirebase();

  // 세션 상태 감지
  const sessionRef = firestore.doc(db, "classSessions", state.user.uid);
  const sessionUnsub = firestore.onSnapshot(sessionRef, (snapshot) => {
    const data = snapshot.data();
    state.sessionActive = data?.active || false;

    if (state.sessionActive) {
      dom.startSessionBtn.disabled = true;
      dom.endSessionBtn.disabled = false;
      dom.teacherMessageInput.disabled = false;
      dom.teacherSendButton.disabled = false;
      subscribeToMessages(state.user.uid, dom.teacherMessages);
    } else {
      dom.startSessionBtn.disabled = false;
      dom.endSessionBtn.disabled = true;
      dom.teacherMessageInput.disabled = true;
      dom.teacherSendButton.disabled = true;
      dom.teacherMessages.innerHTML = "";
    }
  }, displayError);

  state.unsubscribes.push(sessionUnsub);

  // 학생 목록 감지
  const studentsRef = firestore.collection(db, "teachers", state.user.uid, "students");
  const studentsUnsub = firestore.onSnapshot(studentsRef, (snapshot) => {
    dom.studentsList.innerHTML = "";
    dom.studentCount.textContent = snapshot.size.toString();

    snapshot.forEach((doc) => {
      const studentEl = createStudentElement(doc.data());
      dom.studentsList.appendChild(studentEl);
    });
  }, displayError);

  state.unsubscribes.push(studentsUnsub);

  // 이벤트 리스너
  dom.startSessionBtn.addEventListener("click", startSession);
  dom.endSessionBtn.addEventListener("click", endSession);

  dom.teacherMessageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await sendMessage(state.user.uid, dom.teacherMessageInput);
  });

  dom.linkForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await shareLink(state.user.uid, dom.linkInput.value);
    dom.linkInput.value = "";
  });
}

// 관리자용 기능
async function initAdminSidebar() {
  showSection(dom.adminSidebar, true);
}

// 메시지 구독
function subscribeToMessages(teacherId, container) {
  const { db } = getFirebase();
  const messagesRef = firestore.collection(db, "classSessions", teacherId, "messages");
  const q = firestore.query(messagesRef, firestore.orderBy("createdAt", "asc"));

  const messagesUnsub = firestore.onSnapshot(q, (snapshot) => {
    container.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const isOwn = data.senderId === state.user.uid;
      const messageEl = createMessageElement(data, isOwn);
      container.appendChild(messageEl);
    });
    container.scrollTop = container.scrollHeight;
  }, displayError);

  state.unsubscribes.push(messagesUnsub);
}

// 메시지 전송
async function sendMessage(teacherId, inputElement) {
  const text = inputElement.value.trim();
  if (!text) return;

  const { db } = getFirebase();

  try {
    await firestore.addDoc(
      firestore.collection(db, "classSessions", teacherId, "messages"),
      {
        type: "text",
        body: text,
        senderId: state.user.uid,
        senderName: state.user.displayName || state.user.email || "익명",
        role: state.role?.role || "unknown",
        createdAt: firestore.serverTimestamp()
      }
    );
    inputElement.value = "";
  } catch (error) {
    displayError(error);
  }
}

// 링크 공유
async function shareLink(teacherId, url) {
  if (!url) return;

  const { db } = getFirebase();

  try {
    await firestore.addDoc(
      firestore.collection(db, "classSessions", teacherId, "messages"),
      {
        type: "link",
        body: url,
        senderId: state.user.uid,
        senderName: state.user.displayName || state.user.email || "선생님",
        role: "teacher",
        createdAt: firestore.serverTimestamp()
      }
    );
  } catch (error) {
    displayError(error);
  }
}

// 세션 시작
async function startSession() {
  const { db } = getFirebase();

  try {
    await firestore.setDoc(
      firestore.doc(db, "classSessions", state.user.uid),
      {
        active: true,
        startedAt: firestore.serverTimestamp(),
        teacherId: state.user.uid,
        teacherName: state.user.displayName || state.user.email || "선생님"
      },
      { merge: true }
    );
  } catch (error) {
    displayError(error);
  }
}

// 세션 종료
async function endSession() {
  const { db } = getFirebase();

  try {
    await firestore.setDoc(
      firestore.doc(db, "classSessions", state.user.uid),
      {
        active: false,
        endedAt: firestore.serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    displayError(error);
  }
}

// 역할 데이터 로드
async function loadRoleData(user) {
  const { db } = getFirebase();
  const roleRef = firestore.doc(db, "roles", user.uid);
  const snapshot = await firestore.getDoc(roleRef);

  if (!snapshot.exists()) {
    throw new Error("역할 정보를 찾을 수 없습니다.");
  }

  return snapshot.data();
}

// 초기화
async function initialize() {
  try {
    // Firebase 설정 로드
    state.config = await getFirebaseConfig();

    if (!state.config) {
      showSection(dom.notLoggedIn, true);
      return;
    }

    await ensureFirebase(state.config);
    const { auth } = getFirebase();

    // 인증 상태 감지
    firebaseAuth.onAuthStateChanged(auth, async (user) => {
      clearSubscriptions();

      // 모든 섹션 숨기기
      showSection(dom.notLoggedIn, false);
      showSection(dom.studentSidebar, false);
      showSection(dom.teacherSidebar, false);
      showSection(dom.adminSidebar, false);

      if (!user) {
        showSection(dom.notLoggedIn, true);
        return;
      }

      state.user = user;

      try {
        state.role = await loadRoleData(user);

        const role = state.role.role;
        if (role === "student") {
          await initStudentSidebar(state.role);
        } else if (role === "teacher") {
          await initTeacherSidebar();
        } else if (role === "admin") {
          await initAdminSidebar();
        }
      } catch (error) {
        displayError(error);
        showSection(dom.notLoggedIn, true);
      }
    });
  } catch (error) {
    displayError(error);
    showSection(dom.notLoggedIn, true);
  }
}

// 앱 시작
initialize();
