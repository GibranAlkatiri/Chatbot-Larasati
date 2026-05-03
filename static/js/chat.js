export function initChat({
  chatContainer,
  inputElement,
  buttonUpdate,
  speakFunction,
  getSessionId,
  resetIdle,
}) {
  // ==========================
  // SEND MESSAGE
  // ==========================
  async function sendMessage() {
    const text = inputElement.value.trim();
    if (!text) return;

    appendMessage(text, "user");

    inputElement.value = "";
    buttonUpdate();
    resetIdle();

    const loading = createLoadingMessage();
    chatContainer.appendChild(loading);
    scrollToBottom();

    try {
      const safeSessionId = getSessionId() || "session_" + Date.now();

      const res = await fetch("/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question: text,
          session_id: safeSessionId,
        }),
      });

      loading.remove();

      const data = await res.json();
      const answer = data.output || data.answer || "Maaf, tidak ada jawaban.";

      appendMessage(answer, "bot");

      if (speakFunction) speakFunction(answer);
    } catch (err) {
      loading.remove();
      appendMessage("Gagal terhubung ke server.", "bot");
    }
  }

  // ==========================
  // APPEND MESSAGE
  // ==========================
  function appendMessage(text, sender) {
    const div = document.createElement("div");

    div.className = `message ${sender}`;
    div.innerHTML = formatMessage(text);

    chatContainer.appendChild(div);

    scrollToBottom();
  }

  // ==========================
  // LOADING MESSAGE
  // ==========================
  function createLoadingMessage() {
    const div = document.createElement("div");

    div.className = "message bot";
    div.textContent = "tunggu sebentar...";

    return div;
  }

  // ==========================
  // FORMAT MESSAGE
  // ==========================
  function formatMessage(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  // ==========================
  // SCROLL
  // ==========================
  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // ==========================
  // RETURN PUBLIC API
  // ==========================
  return {
    sendMessage,
    appendMessage,
  };
}
