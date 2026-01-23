import { createChat } from "https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js";
createChat({
  webhookUrl:
    "https://n8n.mglab/webhook/55d24c91-3acf-4207-bead-08233f76fcea/chat",
  webhookConfig: {
    method: "POST",
    headers: {},
  },
  target: "#n8n-chat",
  mode: "window",
  chatInputKey: "chatInput",
  chatSessionKey: "sessionId",
  loadPreviousSession: true,
  metadata: {},
  showWelcomeScreen: false,
  defaultLanguage: "es",
  initialMessages: [
    "Hola! 👋",
    "Mi nombre es InterBot. ¿En qué puedo ayudarte hoy?",
  ],
  i18n: {
    es: {
      title: "Hola! 👋",
      subtitle: "Soporte generado por IA 24/7.",
      footer: "",
      getStarted: "Nueva Conversación",
      inputPlaceholder: "Escribe tu pregunta...",
    },
  },
  enableStreaming: false,
});
