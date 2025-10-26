import {
  getFirebaseConfig,
  saveFirebaseConfig,
  removeFirebaseConfig
} from "../shared/storage.js";

const form = document.getElementById("config-form");
const resetButton = document.getElementById("reset-button");
const statusMessage = document.getElementById("status");

function setStatus(message, timeout = 2500) {
  statusMessage.textContent = message || "";
  if (message) {
    setTimeout(() => {
      if (statusMessage.textContent === message) {
        statusMessage.textContent = "";
      }
    }, timeout);
  }
}

function loadConfigToForm(config) {
  if (!config) {
    form.reset();
    return;
  }
  Object.entries(config).forEach(([key, value]) => {
    if (form.elements[key]) {
      form.elements[key].value = value;
    }
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const config = Object.fromEntries(formData.entries());
  try {
    await saveFirebaseConfig(config);
    setStatus("Firebase 설정을 저장했습니다.");
  } catch (error) {
    console.error(error);
    setStatus("설정 저장 중 오류가 발생했습니다.");
  }
});

resetButton.addEventListener("click", async () => {
  if (!confirm("저장된 Firebase 설정을 삭제할까요?")) {
    return;
  }
  try {
    await removeFirebaseConfig();
    form.reset();
    setStatus("설정을 초기화했습니다.");
  } catch (error) {
    console.error(error);
    setStatus("설정 초기화 중 오류가 발생했습니다.");
  }
});

(async function init() {
  try {
    const config = await getFirebaseConfig();
    loadConfigToForm(config);
  } catch (error) {
    console.error(error);
    setStatus("설정을 불러오지 못했습니다.");
  }
})();
