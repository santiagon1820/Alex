let currentTicket = null;
let sseSource = null;
let sseActivityTimeout = null;
let sseInactivityPeriod = 60000;
let sseCountdownTimeout = null;
let sseCountdownSeconds = 10;
let pendingFiles = [];
let fileIdCounter = 0;
let allTickets = [];
let activeFilter = "open";
let currentUsername = "";

// NUEVA FUNCIÓN: Traduce el estado del inglés al español
function translateStatus(status) {
  const translations = {
    open: "Abierto",
    closed: "Cerrado",
  };
  return translations[status] || status;
}

function backToSidebar() {
  document.querySelector(".sidebar").classList.remove("mobile-hidden");
  closeSSE();
  currentTicket = null;
}

window.onload = () => loadTickets();

// ── TICKETS ───────────────────────────────────────────────────────────────────
async function loadTickets() {
  const list = document.getElementById("ticketsList");
  list.innerHTML =
    '<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    const res = await fetch(`/api/getTicketsByUser?ticket_type=2`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.Error || "Error al cargar tickets");
    allTickets = data;
    renderTickets();
  } catch (e) {
    showToast(e.message, "error");
    list.innerHTML =
      '<div class="empty-state">No se pudieron cargar los tickets</div>';
  }
}

function setFilter(f) {
  activeFilter = f;
  ["all", "open", "closed"].forEach((x) => {
    const key = "filter" + x.charAt(0).toUpperCase() + x.slice(1);
    document.getElementById(key).classList.toggle("active", x === f);
  });
  renderTickets();
}

function renderTickets() {
  const list = document.getElementById("ticketsList");
  const filtered =
    activeFilter === "all"
      ? allTickets
      : allTickets.filter((t) => t.status === activeFilter);
  if (!filtered.length) {
    list.innerHTML =
      '<div class="empty-state">No hay tickets en esta vista</div>';
    return;
  }
  list.innerHTML = filtered
    .map((t) => {
      // AQUÍ SE APLICA LA TRADUCCIÓN AL ESTADO
      const statusSpanish = translateStatus(t.status);
      return `
      <div class="ticket-item ${currentTicket?.id === t.id ? "active" : ""}" data-id="${t.id}"
           onclick="selectTicket(${JSON.stringify(t).replace(/"/g, "&quot;")}, this)">
        <div class="ticket-item-head">
          <span class="ticket-id">#${t.id}</span>
          <span class="ticket-status status-${t.status}">${statusSpanish}</span>
        </div>
        <div class="ticket-subject">${escHtml(t.subject)}</div>
      </div>
    `;
    })
    .join("");
}

function selectTicket(ticket, el) {
  currentTicket = ticket;
  pendingFiles = [];
  document
    .querySelectorAll(".ticket-item")
    .forEach((e) => e.classList.remove("active"));
  el.classList.add("active");

  if (window.innerWidth <= 768) {
    document.querySelector(".sidebar").classList.add("mobile-hidden");
  }

  openChat(ticket);
}

// ── SSE ───────────────────────────────────────────────────────────────────────
function closeSSE() {
  cancelCountdown();
  if (sseActivityTimeout) {
    clearTimeout(sseActivityTimeout);
    sseActivityTimeout = null;
  }
  if (sseSource) {
    sseSource.close();
    sseSource = null;
  }
}

function resetSSEActivity() {
  cancelCountdown();
  if (sseActivityTimeout) {
    clearTimeout(sseActivityTimeout);
  }
  if (sseSource && currentTicket) {
    sseActivityTimeout = setTimeout(() => {
      showInactivityCountdown();
    }, sseInactivityPeriod);
  }
}

function cancelCountdown() {
  if (sseCountdownTimeout) {
    clearInterval(sseCountdownTimeout);
    sseCountdownTimeout = null;
  }
  const modal = document.getElementById("inactivityModal");
  if (modal) modal.remove();
}

function showInactivityCountdown() {
  cancelCountdown();
  
  let secondsLeft = sseCountdownSeconds;
  
  const modal = document.createElement("div");
  modal.id = "inactivityModal";
  modal.className = "modal-overlay open";
  modal.innerHTML = `
    <div class="modal" style="text-align: center;">
      <div class="modal-title">Conversación por cerrar</div>
      <p style="color: var(--text-dim); margin-bottom: 20px;">
        Tu conversación se cerrará por inactividad en:
      </p>
      <div style="font-size: 48px; font-weight: 700; color: var(--danger); margin-bottom: 20px;" id="countdownNumber">
        ${secondsLeft}
      </div>
      <div class="modal-actions" style="justify-content: center;">
        <button class="btn-confirm" onclick="extendSession()">
          Mantener conversación
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  sseCountdownTimeout = setInterval(() => {
    secondsLeft--;
    const countdownEl = document.getElementById("countdownNumber");
    if (countdownEl) countdownEl.textContent = secondsLeft;
    
    if (secondsLeft <= 0) {
      cancelCountdown();
      closeChat();
      showToast("Conversación cerrada por inactividad", "error");
    }
  }, 1000);
}

function extendSession() {
  cancelCountdown();
  resetSSEActivity();
  showToast("Conversación extendida por 1 minuto más", "success");
}

function reconnectSSE() {
  cancelCountdown();
  if (currentTicket) {
    closeSSE();
    connectSSE(currentTicket.id);
  }
}

function connectSSE(ticketId) {
  closeSSE(); // siempre cierra la conexión previa
  const url = `/api/chat?ticket_id=${ticketId}&user_type=3`;
  sseSource = new EventSource(url);

  sseSource.onopen = () => {
    const dot = document.getElementById("sseDot");
    const lbl = document.getElementById("sseLabel");
    if (dot) dot.classList.add("connected");
    if (lbl) lbl.textContent = "Conectado";
    resetSSEActivity();
  };
  sseSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
        if (data.current_user !== undefined) {
        currentUsername = data.current_user;
        resetSSEActivity();
        return;
      }
      appendMessage(data);
      resetSSEActivity();
    } catch {}
  };
  sseSource.onerror = () => {
    const dot = document.getElementById("sseDot");
    const lbl = document.getElementById("sseLabel");
    if (dot) dot.classList.remove("connected");
    if (lbl) lbl.textContent = "Desconectado";
    closeSSE();
  };
}

function closeChat() {
  closeSSE();
  currentTicket = null;
  pendingFiles = [];
  document
    .querySelectorAll(".ticket-item")
    .forEach((el) => el.classList.remove("active"));
  document.getElementById("mainArea").innerHTML = `
      <div class="no-ticket">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" stroke-width="2"/>
          <path d="M14 20h20M14 26h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p>Selecciona un ticket para gestionar la conversación</p>
      </div>`;
}

// Cerrar SSE / modal con Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (document.getElementById("newModal").classList.contains("open")) {
      closeNewModal();
    } else {
      closeChat();
    }
  }
});

// ── CHAT ──────────────────────────────────────────────────────────────────────
function openChat(ticket) {
  const main = document.getElementById("mainArea");
  
  // Cerrar SSE anterior
  closeSSE();
  currentTicket = ticket;
  main.innerHTML = `
      <div class="chat-wrap">
        <div class="chat-header">
            <div class="chat-header-info">
              <div style="display:flex; align-items:center;">
                <button class="mobile-back" onclick="backToSidebar()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                <div>
                  <div class="chat-header-subject">${escHtml(ticket.subject)}</div>
                  <div class="chat-header-meta">Ticket: #${ticket.id}</div>
                </div>
              </div>
            </div>
          <div class="sse-indicator">
            <div class="sse-dot" id="sseDot"></div>
            <span id="sseLabel">Conectando…</span>
          </div>
        </div>
        <div class="messages-area" id="messagesArea"></div>
        ${
          ticket.status === "closed"
            ? `
          <div style="padding: 24px; text-align: center; background: var(--surface2); border-top: 1px solid var(--border); color: var(--text-dim); font-size: 13px;">
            <p style="margin-bottom: 4px; font-weight: 600; color: var(--text);">Este ticket está cerrado</p>
            <p>Si necesitas mandar otro mensaje abre un nuevo ticket.</p>
          </div>
        `
            : `
          <div class="input-area">
            <div class="input-files-preview" id="filesPreview"></div>
            <div class="input-row">
              <button class="btn-attach" title="Adjuntar archivo" onclick="document.getElementById('fileInput').click()">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 7.5l-6 6a4 4 0 01-5.657-5.657l6-6a2.5 2.5 0 013.536 3.536l-6 6a1 1 0 01-1.414-1.414l5.5-5.5"
                        stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
              </button>
              <textarea id="msgInput" placeholder="Escribe tu respuesta…" rows="1"
                        onkeydown="handleKey(event)" oninput="autoResize(this)"></textarea>
              <button class="btn-send" id="sendBtn" onclick="sendMessage()">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 2L7 9M14 2L9 14 7 9 2 7l12-5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        `
        }
      </div>`;
  connectSSE(ticket.id);
}

function appendMessage(msg) {
  const area = document.getElementById("messagesArea");
  if (!area) return;
  
  // Si el área tiene el spinner o está vacía con mensajes de error, limpiarla
  if (area.children.length <= 1) {
    const firstChild = area.children[0];
    if (firstChild && (firstChild.querySelector('.spinner') || firstChild.innerHTML.includes('No hay tickets') || firstChild.innerHTML.includes('Selecciona'))) {
      area.innerHTML = '';
    }
  }
  
  // Evitar duplicados por ID
  if (msg.id) {
    const existing = area.querySelector(`[data-msg-id="${msg.id}"]`);
    if (existing) return;
  }
  
  const isMe = msg.user === currentUsername;
  const isAgent = msg.user === "admin";
  const initials = isAgent ? "AG" : (isMe ? "YO" : msg.user.slice(0, 2).toUpperCase());
  const avatarClass = isMe ? "avatar-client" : (isAgent ? "avatar-agent" : "avatar-client");

  let filesHtml = "";
  if (msg.files) {
    filesHtml =
      "<div>" +
      msg.files
        .split("|")
        .map(
          (u) => `
        <a class="msg-file" href="${u}" target="_blank">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7 1H3a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V4L7 1zm0 0v3h3"
                  stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          ${escHtml(u.split("/").pop())}
        </a>`,
        )
        .join("") +
      "</div>";
  }

  const time = msg.created_at ? formatDateOnly(msg.created_at) : new Date().toLocaleDateString();

  const div = document.createElement("div");
  div.className = `msg-row ${isMe ? "mine" : "theirs"}`;
  if (msg.id) div.dataset.msgId = msg.id;
  div.innerHTML = `
      <div class="msg-avatar ${avatarClass}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <div>
        <div class="msg-bubble">${escHtml(msg.message)}${filesHtml}</div>
        <div class="msg-meta">${msg.user} · ${time}</div>
      </div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

// ── SEND MESSAGE ──────────────────────────────────────────────────────────────
async function sendMessage() {
  const btn = document.getElementById("sendBtn");
  if (!btn || btn.disabled) return;

  const input = document.getElementById("msgInput");
  const message = input.value.trim();
  if (!message && pendingFiles.length === 0) return;
  if (!currentTicket) return;
  if (isUploading()) return;

  btn.disabled = true;

  // Limpiar input de inmediato (optimista)
  const savedMessage = message;
  input.value = "";
  input.style.height = "auto";

  try {
    // Esperar a que terminen los que aún están subiendo (ignorar los que fallaron)
    await Promise.all(
      pendingFiles
        .filter((pf) => pf.state === "uploading")
        .map(
          (pf) =>
            new Promise((resolve) => {
              const check = setInterval(() => {
                if (pf.state !== "uploading") {
                  clearInterval(check);
                  resolve();
                }
              }, 100);
            }),
        ),
    );

    // Solo usar los que subieron exitosamente
    const urls = pendingFiles
      .filter((f) => f.state === "done" && f.url)
      .map((f) => f.url);
    const body = {
      message: savedMessage,
      ticket_id: currentTicket.id,
      type: 3,
      ...(urls.length ? { files: urls.join("|") } : {}),
    };

    const res = await fetch(`/api/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.Error || "Error al enviar mensaje");

    // Limpiar archivos
    pendingFiles = [];
    const preview = document.getElementById("filesPreview");
    if (preview) preview.innerHTML = "";
    
    // Resetear actividad después de enviar
    resetSSEActivity();
  } catch (e) {
    showToast(e.message, "error");
    input.value = savedMessage;
    autoResize(input);
  } finally {
    btn.disabled = false;
  }
}

// ── FILE UPLOAD ───────────────────────────────────────────────────────────────
async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/uploadFile`, {
    method: "POST",
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.Error || "Error al subir archivo");
  return data.url;
}

function handleFileSelect(e) {
  Array.from(e.target.files).forEach((file) => {
    const pf = { file, state: "uploading", url: null, id: ++fileIdCounter };
    pendingFiles.push(pf);
    const btn = document.getElementById("sendBtn");
    if (btn) btn.disabled = true;
    renderFilesPreview();
    uploadFile(file)
      .then((url) => {
        pf.url = url;
        pf.state = "done";
        renderFilesPreview();
      })
      .catch((err) => {
        pf.state = "error";
        pf.errorMsg = err.message;
        renderFilesPreview();
        showToast(err.message || "Error al subir archivo", "error");
      });
  });
  renderFilesPreview();
  e.target.value = "";
}

function renderFilesPreview() {
  const preview = document.getElementById("filesPreview");
  if (!preview) return;
  preview.innerHTML = pendingFiles
    .map((pf) => {
      let icon = "";
      if (pf.state === "uploading") icon = `<div class="chip-spinner"></div>`;
      else if (pf.state === "done")
        icon = `<span class="chip-done-icon">✓</span>`;
      else if (pf.state === "error")
        icon = `<span class="chip-error-icon">✕</span>`;
      else
        icon = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M7 1H3a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V4L7 1zm0 0v3h3"
                stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>`;
      const removable = pf.state !== "uploading";
      return `<div class="file-chip ${pf.state}" id="chip-${pf.id}">
        ${icon}${escHtml(pf.file.name)}
        ${removable ? `<button onclick="removeFile(${pf.id})">×</button>` : ""}
      </div>`;
    })
    .join("");
  // Bloquear enviar si hay archivos subiendo
  const btn = document.getElementById("sendBtn");
  if (btn) btn.disabled = pendingFiles.some((f) => f.state === "uploading");
}

function removeFile(id) {
  pendingFiles = pendingFiles.filter((f) => f.id !== id);
  renderFilesPreview();
}

// ── NEW TICKET ────────────────────────────────────────────────────────────────
function openNewModal() {
  document.getElementById("newModal").classList.add("open");
  setTimeout(() => document.getElementById("modalSubject").focus(), 50);
}
function closeNewModal() {
  document.getElementById("newModal").classList.remove("open");
  document.getElementById("modalSubject").value = "";
}

async function createTicket() {
  const subject = document.getElementById("modalSubject").value.trim();
  if (!subject) return showToast("Ingresa un asunto", "error");
  const btn = document.querySelector("#newModal .btn-confirm");
  btn.disabled = true;
  try {
    const res = await fetch(`/api/generateTicket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type_ticket: 2, subject }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.Error || "Error al crear ticket");
    showToast(data.message || "Ticket creado exitosamente", "success");
    closeNewModal();
    loadTickets();
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    btn.disabled = false;
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function isUploading() {
  return pendingFiles.some((f) => f.state === "uploading");
}

// Manejador de tecla Enter mejorado
function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    
    const input = document.getElementById("msgInput");
    
    // Verificar si hay mensaje o archivos
    if ((input && input.value.trim()) || pendingFiles.length > 0) {
      if (!isUploading()) {
        sendMessage();
      }
    }
    return false;
  }
  return true;
}
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}
function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function formatDateOnly(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("es-MX", { month: "short" }).toUpperCase();
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}
function showToast(msg, type = "success") {
  const c = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = `toast-item ${type}`;
  el.innerHTML = `<div class="toast-dot"></div><span>${escHtml(msg)}</span>`;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
