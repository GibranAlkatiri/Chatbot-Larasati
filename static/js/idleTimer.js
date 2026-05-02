export function initIdleTimer({
  idleLimit = 5 * 60 * 1000,
  warningPeriod = 60 * 1000,
  timerElement,
  countdownElement,
  onTimeout,
}) {
  let endTime = 0;
  let mainInterval = null;

  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function update() {
    const now = Date.now();
    const timeLeft = endTime - now;

    // Tampilkan timer hanya saat memasuki masa warning
    if (timeLeft <= warningPeriod && timeLeft > 0) {
      if (timerElement.classList.contains("hidden")) {
        timerElement.classList.remove("hidden");
        timerElement.classList.add("fade-in");
      }

      countdownElement.textContent = formatTime(timeLeft);

      if (timeLeft <= 10000) {
        timerElement.classList.add("warning-pulse");
      }
    } else if (timeLeft > warningPeriod) {
      timerElement.classList.add("hidden");
      timerElement.classList.remove("warning-pulse");
    }

    if (timeLeft <= 0) {
      stop();
      if (onTimeout) onTimeout();
    }
  }

  function resetIdleTimer() {
    endTime = Date.now() + idleLimit;
    if (!mainInterval) {
      mainInterval = setInterval(update, 1000);
    }
  }

  function stop() {
    clearInterval(mainInterval);
    mainInterval = null;
  }

  function setupIdleDetection() {
    const events = ["mousedown", "keypress", "scroll", "touchstart", "click"];
    events.forEach((e) => document.addEventListener(e, resetIdleTimer));
    resetIdleTimer();
  }

  return { setupIdleDetection, resetIdleTimer };
}