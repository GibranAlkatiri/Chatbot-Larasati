// document.addEventListener("DOMContentLoaded", () => {
//   // ==================== ELEMEN ====================
//   const chatMessages = document.getElementById("chatMessages");
//   const userInput = document.getElementById("userInput");
//   const dynamicBtn = document.getElementById("dynamicBtn");
//   const voiceToggle = document.getElementById("voiceToggle");
//   const speakingStatus = document.querySelector(".speakingStatus");
//   const suggestionContainer = document.getElementById("suggestion-container");
//   const welcomeMessageElement = document.getElementById("welcomeMessage");
//   const welcomeText = welcomeMessageElement.textContent.trim();

//   // TIMER
//   const sessionTimer = document.getElementById("sessionTimer");
//   const timerCountdown = document.getElementById("timerCountdown");

//   // ==================== KONSTANTA ====================
//   const IDLE_LIMIT = 5 * 60 * 1000;

//   // ==================== STATE ====================
//   let recognition = null;
//   let synth = window.speechSynthesis || null;
//   let isVoiceEnabled = true;

//   let idleTimer = null;
//   let countdownInterval = null;

//   let currentSessionId = generateSessionId();
//   let greetingPlayed = false;

//   // ==================== GENERATE SESSION ID ====================
//   function generateSessionId() {
//     return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
//       /[xy]/g,
//       function (c) {
//         const r = (Math.random() * 16) | 0;
//         const v = c === "x" ? r : (r & 0x3) | 0x8;
//         return v.toString(16);
//       },
//     );
//   }

//   // ==================== SESSION TIMER ====================
//   function formatTime(seconds) {
//     const m = Math.floor(seconds / 60);
//     const s = seconds % 60;
//     return `${m}:${s.toString().padStart(2, "0")}`;
//   }

//   function showCountdown(seconds = 60) {
//     if (!sessionTimer || !timerCountdown) return;

//     sessionTimer.classList.remove("hidden");
//     sessionTimer.classList.add("show");
//     sessionTimer.classList.remove("warning");

//     let remaining = seconds;

//     timerCountdown.textContent = formatTime(remaining);

//     if (countdownInterval) {
//       clearInterval(countdownInterval);
//     }

//     countdownInterval = setInterval(() => {
//       remaining--;

//       timerCountdown.textContent = formatTime(remaining);

//       if (remaining <= 10) {
//         sessionTimer.classList.add("warning");
//       }

//       if (remaining <= 0) {
//         clearInterval(countdownInterval);
//         hideCountdown();
//       }
//     }, 1000);
//   }

//   function hideCountdown() {
//     if (!sessionTimer) return;

//     sessionTimer.classList.remove("show");
//     sessionTimer.classList.add("hidden");
//     sessionTimer.classList.remove("warning");

//     if (countdownInterval) {
//       clearInterval(countdownInterval);
//       countdownInterval = null;
//     }
//   }

//   // ==================== RESET APLIKASI ====================
//   function resetApplication() {
//     console.log("⏰ Idle timeout - reset aplikasi");

//     if (synth) {
//       synth.cancel();
//     }

//     setSpeakingStatus(false);

//     if (chatMessages) {
//       chatMessages.innerHTML = "";
//     }

//     greetingPlayed = false;

//     if (userInput) {
//       userInput.value = "";
//       updateButtonState();
//     }

//     currentSessionId = generateSessionId();
//     console.log("Session baru:", currentSessionId);

//     loadSuggestions();

//     hideCountdown();
//     resetIdleTimer();
//   }

//   // ==================== IDLE TIMER ====================
//   function resetIdleTimer() {
//     clearTimeout(idleTimer);

//     hideCountdown();

//     idleTimer = setTimeout(() => {
//       resetApplication();
//     }, IDLE_LIMIT);

//     setTimeout(() => {
//       showCountdown(60);
//     }, IDLE_LIMIT - 60000);
//   }

//   function setupIdleDetection() {
//     const events = ["mousedown", "keypress", "scroll", "touchstart", "click"];

//     events.forEach((event) => {
//       document.addEventListener(event, resetIdleTimer);
//     });

//     resetIdleTimer();
//   }

//   // ==================== BUTTON STATE ====================
//   function updateButtonState() {
//     const text = userInput.value.trim();

//     if (text.length > 0) {
//       dynamicBtn.textContent = "➤";
//       dynamicBtn.classList.add("sending");
//     } else {
//       dynamicBtn.textContent = "🎤";
//       dynamicBtn.classList.remove("sending");
//     }
//   }

//   userInput.addEventListener("input", updateButtonState);

//   // ==================== BUTTON CLICK ====================
//   dynamicBtn.addEventListener("click", (e) => {
//     e.preventDefault();

//     const text = userInput.value.trim();

//     if (text.length > 0) {
//       sendMessage();
//     } else {
//       if (!recognition) {
//         alert("Fitur suara tidak didukung browser ini.");
//         return;
//       }

//       recognition.start();
//     }
//   });

//   // ==================== SPEECH RECOGNITION ====================
//   if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
//     const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

//     recognition = new SR();
//     recognition.lang = "id-ID";
//     recognition.continuous = false;
//     recognition.interimResults = false;

//     recognition.onstart = () => {
//       userInput.placeholder = "Mendengarkan...";
//       dynamicBtn.style.backgroundColor = "#ff4444";
//       dynamicBtn.classList.add("pulse");
//     };

//     recognition.onend = () => {
//       userInput.placeholder = "Ketik pertanyaan...";
//       dynamicBtn.style.backgroundColor = "";
//       dynamicBtn.classList.remove("pulse");
//       updateButtonState();
//     };

//     recognition.onresult = (e) => {
//       const transcript = e.results[0][0].transcript;
//       userInput.value = transcript;
//       sendMessage();
//     };
//   }

//   // ==================== LOAD SUGGESTIONS ====================
//   async function loadSuggestions() {
//     try {
//       const res = await fetch("/suggested-questions");
//       const data = await res.json();

//       renderButtons(data.questions);
//     } catch (err) {
//       renderButtons([
//         "Apa visi misi daerah?",
//         "Jelaskan isu strategis",
//         "Program prioritas",
//         "Target pembangunan",
//       ]);
//     }
//   }

//   function renderButtons(questions) {
//     if (!suggestionContainer) return;

//     suggestionContainer.innerHTML = "";

//     questions.forEach((q, index) => {
//       const btn = document.createElement("button");

//       btn.className = "suggest-btn fade-in";
//       btn.textContent = q;
//       btn.style.animationDelay = `${index * 0.1}s`;

//       btn.onclick = () => fillInputAndSend(q);

//       suggestionContainer.appendChild(btn);
//     });
//   }

//   function fillInputAndSend(text) {
//     userInput.value = text;
//     sendMessage();
//     resetIdleTimer();
//   }

//   // ==================== SEND MESSAGE ====================
//   async function sendMessage() {
//     const text = userInput.value.trim();

//     if (!text) return;

//     appendMessage(text, "user");

//     userInput.value = "";

//     updateButtonState();

//     resetIdleTimer();

//     const loading = document.createElement("div");
//     loading.classList.add("message", "bot");
//     loading.textContent = "Sedang memproses...";

//     chatMessages.appendChild(loading);

//     chatMessages.scrollTop = chatMessages.scrollHeight;

//     try {
//       const res = await fetch("/chat", {
//         method: "POST",

//         headers: {
//           "Content-Type": "application/json",
//         },

//         body: JSON.stringify({
//           question: text,
//           session_id: currentSessionId,
//         }),
//       });

//       loading.remove();

//       const data = await res.json();

//       const answer = data.answer || "Maaf, tidak ada jawaban.";

//       appendMessage(answer, "bot");

//       speak(answer);
//     } catch (err) {
//       loading.remove();

//       appendMessage("Gagal terhubung ke server.", "bot");
//     }
//   }

//   // ==================== APPEND MESSAGE ====================
//   function appendMessage(text, sender) {
//     const div = document.createElement("div");
//     div.classList.add("message", sender);
//     div.innerHTML = formatMessage(text);
//     chatMessages.appendChild(div);
//     chatMessages.scrollTop = chatMessages.scrollHeight;
//   }

//   // ==================== FORMAT MESSAGE ====================
//   function formatMessage(text) {
//     return text
//       .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
//       .replace(/\*(.*?)\*/g, "<em>$1</em>")
//       .replace(/\n/g, "<br>");
//   }

//   // ==================== SPEAK STATUS ====================
//   function setSpeakingStatus(state) {
//     if (!speakingStatus) return;

//     speakingStatus.style.display = state ? "block" : "none";
//   }

//   // ==================== SPEAK ====================
//   function speak(text) {
//     if (!isVoiceEnabled || !synth || !text) return;

//     synth.cancel();

//     const utter = new SpeechSynthesisUtterance(text);

//     utter.lang = "id-ID";
//     utter.rate = 0.9;
//     utter.pitch = 1;

//     utter.onstart = () => setSpeakingStatus(true);
//     utter.onend = () => setSpeakingStatus(false);
//     utter.onerror = () => setSpeakingStatus(false);

//     synth.speak(utter);
//   }

//   // ==================== GREETING ====================
//   function triggerGreeting() {
//     if (greetingPlayed) return;

//     greetingPlayed = true;

//     setTimeout(() => {
//       speak(welcomeText);
//     }, 300);
//   }

//   function stopSpeakingOnInteraction() {
//     if (!synth) return;

//     synth.cancel();
//     setSpeakingStatus(false);
//   }

//   // ==================== VOICE TOGGLE ====================
//   if (voiceToggle) {
//     isVoiceEnabled = voiceToggle.checked;

//     voiceToggle.addEventListener("change", (e) => {
//       isVoiceEnabled = e.target.checked;

//       if (!isVoiceEnabled && synth) {
//         synth.cancel();

//         setSpeakingStatus(false);
//       }
//     });
//   }

//   // ==================== ENTER ====================
//   userInput.addEventListener("keydown", (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();

//       sendMessage();
//     }
//   });

//   // ==================== INIT ====================
//   console.log("🚀 LARASATI initialized:", currentSessionId);
//   loadSuggestions();
//   setupIdleDetection();
//   updateButtonState();
//   document.addEventListener("click", triggerGreeting);
//   document.addEventListener("mousemove", triggerGreeting);
//   document.addEventListener("touchstart", triggerGreeting);
//   document.addEventListener("keydown", stopSpeakingOnInteraction);
//   document.addEventListener("mousedown", stopSpeakingOnInteraction);
//   document.addEventListener("touchstart", stopSpeakingOnInteraction);
// });
