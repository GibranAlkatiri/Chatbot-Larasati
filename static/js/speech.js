export function initSpeech({
  inputElement,
  buttonElement,
  speakingStatus,
  voiceToggle,
  welcomeText,
}) {
  let recognition = null;
  let synth = window.speechSynthesis || null;
  let isVoiceEnabled = true;
  let greetingPlayed = false;

  let selectedVoice = null;

  // ==========================
  // LOAD VOICES
  // ==========================

  function loadVoices() {
    const voices = synth.getVoices();

    selectedVoice =
      voices.find((v) => v.name.includes("Google") && v.lang.includes("id")) ||
      voices.find((v) => v.name.toLowerCase().includes("female")) ||
      voices[0];
  }

  if (synth) {
    loadVoices();

    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  // ==========================
  // SPEAKING STATUS
  // ==========================

  function setSpeakingStatus(state) {
    if (!speakingStatus) return;

    speakingStatus.style.display = state ? "block" : "none";
  }

  // ==========================
  // TEXT TO SPEECH
  // ==========================

  function speak(text) {
    if (!isVoiceEnabled || !synth || !text) return;

    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);

    utter.lang = "id-ID";
    utter.rate = 1.05;
    utter.pitch = 1.05;

    if (selectedVoice) {
      utter.voice = selectedVoice;
    }

    utter.onstart = () => setSpeakingStatus(true);
    utter.onend = () => setSpeakingStatus(false);
    utter.onerror = () => setSpeakingStatus(false);

    synth.speak(utter);
  }

  // ==========================
  // STOP SPEAKING
  // ==========================

  function stopSpeaking() {
    if (!synth) return;

    synth.cancel();
    setSpeakingStatus(false);
  }

  // ==========================
  // GREETING
  // ==========================

  function triggerGreeting() {
    if (greetingPlayed) return;
    if (!welcomeText) return;

    greetingPlayed = true;

    setTimeout(() => {
      speak(welcomeText);
    }, 200);
  }

  function resetGreeting() {
    greetingPlayed = false;
  }

  // ==========================
  // SPEECH RECOGNITION
  // ==========================

  if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    recognition = new SR();

    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      inputElement.placeholder = "Mendengarkan...";
      buttonElement.classList.add("pulse");
    };

    recognition.onend = () => {
      inputElement.placeholder = "Ketik pertanyaan...";
      buttonElement.classList.remove("pulse");
    };

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;

      inputElement.value = transcript;

      inputElement.dispatchEvent(new Event("input"));
    };
  }

  // ==========================
  // START LISTENING
  // ==========================

  function startListening() {
    if (!recognition) {
      alert("Browser tidak mendukung voice recognition.");
      return;
    }

    recognition.start();
  }

  // ==========================
  // VOICE TOGGLE
  // ==========================

  if (voiceToggle) {
    isVoiceEnabled = voiceToggle.checked;

    voiceToggle.addEventListener("change", (e) => {
      isVoiceEnabled = e.target.checked;

      if (!isVoiceEnabled && synth) {
        synth.cancel();
        setSpeakingStatus(false);
      }
    });
  }

  return {
    speak,
    startListening,
    stopSpeaking,
    triggerGreeting,
    resetGreeting,
  };
}
