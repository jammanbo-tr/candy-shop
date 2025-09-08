/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.resetEmotionIcons = onSchedule({
  schedule: "59 23 * * *", // 매일 23:59
  timeZone: "Asia/Seoul", // 한국 시간대
}, async (context) => {
  const studentsRef = admin.firestore().collection("students");
  const snapshot = await studentsRef.get();
  const batch = admin.firestore().batch();
  snapshot.forEach((doc) => {
    batch.update(doc.ref, {emotionIcon: null});
  });
  await batch.commit();
  console.log("모든 학생 emotionIcon 초기화 완료");
  return null;
});

// 각 학급 mindmap 응답이 저장될 때마다 전역 집계 컬렉션에 누적 병합
// Source: mindmap_classes/{classId}/responses/data (문서 전체 덮어쓰기/추가를 감지)
exports.aggregateMindmapResponses = onDocumentWritten({
  document: "mindmap_classes/{classId}/responses/data",
  region: "asia-northeast3",
}, async (event) => {
  const hasAfter = event.data && event.data.after;
  const afterData = hasAfter ? event.data.after.data() : null;
  if (!afterData) {
    return null;
  }

  const db = admin.firestore();
  const globalRef = db.doc("mindmap_global/responses/data");
  const globalSnap = await globalRef.get();
  const globalData = globalSnap.exists ? globalSnap.data() : {};

  // 토픽별 배열을 병합
  const merged = {...globalData};
  Object.keys(afterData).forEach((topic) => {
    const incoming = Array.isArray(afterData[topic]) ? afterData[topic] : [];
    if (!merged[topic]) {
      merged[topic] = [];
    }

    // 중복 방지를 위해 timestamp + studentName + word + sentence로 키 생성
    const existingKeys = new Set(merged[topic].map((r) => (
      `${r.timestamp}|${r.studentName}|${r.word}|${r.sentence}`
    )));
    incoming.forEach((r) => {
      const key = `${r.timestamp}|${r.studentName}|${r.word}|${r.sentence}`;
      if (!existingKeys.has(key)) {
        merged[topic].push(r);
        existingKeys.add(key);
      }
    });
  });

  await globalRef.set(merged, {merge: true});
  console.log("mindmap_global 집계 갱신 완료");
  return null;
});
