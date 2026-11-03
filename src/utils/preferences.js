export const readSidebarLockPreference = () => {
  try {
    return window.localStorage.getItem("csm-sidebar-locked") === "1";
  } catch (error) {
    return false;
  }
};

// ========================================================
// 1. SOUND SYNTHESIZER (Web Audio API - Pure Client-Side)
// ========================================================
