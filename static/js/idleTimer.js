export function initIdleTimer({
  idleLimit = 2 * 60 * 1000,
  timerElement,
  countdownElement,
  onTimeout,
}) {
  let idleTimer = null;
  let countdownInterval = null;

  // ==========================
  // FORMAT TIME
  // ==========================
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ==========================
  // SHOW COUNTDOWN
  // ==========================
  function showCountdown(seconds = 60) {
    if (!timerElement || !countdownElement) return;

    timerElement.classList.remove("hidden");
    timerElement.classList.add("show");
    timerElement.classList.remove("warning");

    let remaining = seconds;

    countdownElement.textContent = formatTime(remaining);

    clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      remaining--;

      countdownElement.textContent = formatTime(remaining);

      if (remaining <= 10) {
        timerElement.classList.add("warning");
      }

      if (remaining <= 0) {
        clearInterval(countdownInterval);
        hideCountdown();
      }
    }, 1000);
  }

  // ==========================
  // HIDE COUNTDOWN
  // ==========================
  function hideCountdown() {
    if (!timerElement) return;

    timerElement.classList.remove("show");
    timerElement.classList.add("hidden");
    timerElement.classList.remove("warning");

    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  // ==========================
  // RESET IDLE TIMER
  // ==========================
  function resetIdleTimer() {
    clearTimeout(idleTimer);

    hideCountdown();

    idleTimer = setTimeout(() => {
      if (onTimeout) {
        onTimeout();
      }
    }, idleLimit);

    // countdown 60 detik sebelum reset
    setTimeout(() => {
      showCountdown(60);
    }, idleLimit - 60000);
  }

  // ==========================
  // SETUP IDLE DETECTION
  // ==========================
  function setupIdleDetection() {
    const events = ["mousedown", "keypress", "scroll", "touchstart", "click"];

    events.forEach((e) => {
      document.addEventListener(e, resetIdleTimer);
    });

    resetIdleTimer();
  }

  return {
    resetIdleTimer,
    setupIdleDetection,
    hideCountdown,
  };
}
