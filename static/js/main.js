import { initChat } from "./chat.js";
import { initSpeech } from "./speech.js";
import { initIdleTimer } from "./idleTimer.js";

// ==========================
// ELEMENT
// ==========================

const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const dynamicBtn = document.getElementById("dynamicBtn");
const voiceToggle = document.getElementById("voiceToggle");
const speakingStatus = document.querySelector(".speakingStatus");
const sessionTimer = document.getElementById("sessionTimer");
const timerCountdown = document.getElementById("timerCountdown");
const welcomeText = document
  .getElementById("welcomeMessage")
  .textContent.trim();

// ==========================
// SESSION
// ==========================

let currentSessionId = crypto.randomUUID();

function getSessionId() {
  return currentSessionId;
}

// ==========================
// BUTTON STATE
// ==========================

function updateButtonState() {
  const hasText = userInput.value.trim().length > 0;

  dynamicBtn.textContent = hasText ? "➤" : "🎤";
  dynamicBtn.classList.toggle("sending", hasText);
}

userInput.addEventListener("input", updateButtonState);

// ==========================
// SPEECH MODULE
// ==========================

const speech = initSpeech({
  inputElement: userInput,
  buttonElement: dynamicBtn,
  speakingStatus: speakingStatus,
  voiceToggle: voiceToggle,
  welcomeText: welcomeText,
});

// ==========================
// IDLE TIMER MODULE
// ==========================

const idle = initIdleTimer({
  timerElement: sessionTimer,
  countdownElement: timerCountdown,

  onTimeout: () => {
    console.log("Idle timeout - reset session");

    speech.stopSpeaking();
    speech.resetGreeting();

    chatMessages.innerHTML = `
    <div class="message bot" id="welcomeMessage">
      ${welcomeText}
    </div>
  `;

    userInput.blur();
    userInput.value = "";
    updateButtonState();

    currentSessionId = crypto.randomUUID();
  },
});

// ==========================
// CHAT MODULE
// ==========================

const chat = initChat({
  chatContainer: chatMessages,
  inputElement: userInput,
  buttonUpdate: updateButtonState,
  speakFunction: speech.speak,
  getSessionId: getSessionId,
  resetIdle: idle.resetIdleTimer,
});

// ==========================
// BUTTON CLICK
// ==========================

dynamicBtn.addEventListener("click", (e) => {
  e.preventDefault();

  const text = userInput.value.trim();

  if (text.length > 0) {
    chat.sendMessage();
  } else {
    speech.startListening();
  }
});

// ==========================
// ENTER KEY
// ==========================

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chat.sendMessage();
  }
});

userInput.addEventListener("focus", speech.triggerGreeting);
userInput.addEventListener("click", speech.triggerGreeting);

// ==========================
// INIT
// ==========================

idle.setupIdleDetection();
