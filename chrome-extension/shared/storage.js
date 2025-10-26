export function getFirebaseConfig() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['firebaseConfig'], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(result.firebaseConfig || null);
    });
  });
}

export function saveFirebaseConfig(config) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ firebaseConfig: config }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

export function removeFirebaseConfig() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.remove('firebaseConfig', () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}
