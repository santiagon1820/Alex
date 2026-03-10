let currentTicket = null;
let sseSource = null;
let sseActivityTimeout = null;
let sseInactivityPeriod = 60000; // 1 minuto
let sseCountdownTimeout = null;
let sseCountdownSeconds = 10; // 10 segundos de cuenta regresiva
let pendingFiles = [];
let fileIdCounter = 0;
let allTickets = [];
let activeFilter = "open";
let currentUsername = "";
let isAgentJoined = false; // Indica si el agente está unido
let isAutoJoining = false; // Para evitar bucles infinitos
let isGmailMode = false;
let providerEmail = "";
let gmailSubject = "";
let gmailSSESource = null;
let gmailActivityTimeout = null;
let gmailCountdownTimeout = null;
const gmailInactivityPeriod = 60000; // 1 minuto

// Traduce el estado del inglés al español
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
    const res = await fetch(`/api/getTickets?ticket_type=1`);
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
  isAgentJoined = false;
  isAutoJoining = false;
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
  // Solo resetear actividad si el ticket está abierto y el agente unido
  if (sseSource && currentTicket && isAgentJoined && currentTicket.status === 'open') {
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
        La conversación se cerrará por inactividad en:
      </p>
      <div style="font-size: 48px; font-weight: 700; color: var(--danger); margin-bottom: 20px;" id="countdownNumber">
        ${secondsLeft}
      </div>
      <div class="modal-actions" style="justify-content: center; gap: 10px;">
        <button class="btn-confirm" onclick="extendSession()">
          Mantener conversación (${secondsLeft}s)
        </button>
        <button class="btn-cancel" onclick="closeChat()">
          Cerrar ahora
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Actualizar el botón con el tiempo restante
  const updateButton = () => {
    const btn = modal.querySelector('.btn-confirm');
    if (btn) btn.innerHTML = `Mantener conversación (${secondsLeft}s)`;
  };
  
  sseCountdownTimeout = setInterval(() => {
    secondsLeft--;
    const countdownEl = document.getElementById("countdownNumber");
    if (countdownEl) countdownEl.textContent = secondsLeft;
    updateButton();
    
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

// Función para conectar SSE
function connectSSE(ticketId) {
  closeSSE();
  
  const url = `/api/chat?ticket_id=${ticketId}&user_type=2`;
  console.log('Connecting SSE to:', url);
  
  // Crear EventSource
  sseSource = new EventSource(url);

  sseSource.onopen = () => {
    console.log('SSE connected successfully - Status 200');
    const dot = document.getElementById("sseDot");
    const lbl = document.getElementById("sseLabel");
    if (dot) dot.classList.add("connected");
    
    // El agente está unido
    isAgentJoined = true;
    updateChatHeaderButtons();
    
    // Configurar según el estado del ticket
    if (currentTicket?.status === 'closed') {
      if (lbl) lbl.textContent = "Solo lectura";
      // Mostrar el footer de ticket cerrado
      showInputArea();
      
      // Para tickets cerrados, cerrar SSE después de cargar mensajes
      setTimeout(() => {
        if (sseSource && currentTicket?.status === 'closed') {
          console.log('Closing SSE for closed ticket');
          closeSSE();
          if (lbl) lbl.textContent = "Historial cargado";
        }
      }, 2000); // Esperar 2 segundos para asegurar que se carguen los mensajes
      
    } else {
      if (lbl) lbl.textContent = "Conectado";
      // Mostrar área de input para tickets abiertos
      showInputArea();
    }
    
    // Resetear el contador de inactividad
    resetSSEActivity();
    
    // Limpiar el área de mensajes si solo mostraba el spinner
    const messagesArea = document.getElementById("messagesArea");
    if (messagesArea) {
      if (messagesArea.querySelector('.spinner')) {
        messagesArea.innerHTML = '';
      }
    }
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
    } catch (error) {
      console.error('Error parsing SSE message:', error);
    }
  };
  
  sseSource.onerror = (e) => {
    console.error('SSE Error');
    
    const dot = document.getElementById("sseDot");
    const lbl = document.getElementById("sseLabel");
    
    // Si nunca recibimos onopen, es 403
    if (!isAgentJoined) {
      if (dot) dot.classList.remove("connected");
      
      if (currentTicket?.status === 'open') {
        // Tickets abiertos: mostrar botón de unirse manualmente
        if (lbl) lbl.textContent = "No unido";
        showAgentNotJoinedMessage();
      } else {
        // Tickets cerrados: hacer auto-join UNA SOLA VEZ
        if (lbl) lbl.textContent = "Auto-uniendo...";
        
        if (!isAutoJoining) {
          autoJoinClosedTicket(ticketId);
        } else {
          // Si ya intentamos auto-join y falló, mostrar error
          showClosedTicketErrorMessage();
        }
      }
    } else {
      if (dot) dot.classList.remove("connected");
      if (lbl) lbl.textContent = "Desconectado";
    }
    
    closeSSE();
  };
}

// Auto-join para tickets cerrados (solo una vez)
async function autoJoinClosedTicket(ticketId) {
  if (isAutoJoining) return;
  
  isAutoJoining = true;
  
  try {
    console.log('Auto-joining closed ticket:', ticketId);
    
    const res = await fetch(`/api/joinTicket/${ticketId}`, { method: "POST" });
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.Error || "Error al unirse");
    }
    
    console.log('Auto-join successful for closed ticket');
    showToast("Unido al chat automáticamente", "success");
    
    // Recargar el chat (ahora debería dar 200)
    if (currentTicket) {
      await openChat(currentTicket);
    }
  } catch (e) {
    console.error('Auto-join failed for closed ticket:', e);
    showClosedTicketErrorMessage();
  } finally {
    isAutoJoining = false;
  }
}

// Mostrar mensaje de error para ticket cerrado
function showClosedTicketErrorMessage() {
  removeInputArea();
  
  const messagesArea = document.getElementById("messagesArea");
  const sseLabel = document.getElementById("sseLabel");
  
  if (sseLabel) sseLabel.textContent = "Error";
  
  if (messagesArea) {
    messagesArea.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; padding: 20px;">
        <div style="text-align: center; padding: 30px; background: var(--surface); border-radius: 12px; border: 1px solid var(--border); max-width: 320px;">
          <p style="color: var(--danger); margin-bottom: 10px;">Error de conexión</p>
          <p style="color: var(--text-dim); font-size: 13px;">No se pudo cargar el historial del ticket.</p>
        </div>
      </div>
    `;
  }
}

// Mostrar mensaje de agente no unido (solo para tickets abiertos)
function showAgentNotJoinedMessage() {
  removeInputArea();
  
  const messagesArea = document.getElementById("messagesArea");
  if (!messagesArea) return;
  
  messagesArea.innerHTML = `
    <div class="agent-not-joined-message">
      <div>
        <p>
          Aún no te has unido a esta conversación.<br>
          Debes unirte para poder gestionar el ticket.
        </p>
        <button class="btn-confirm" onclick="joinTicket(${currentTicket?.id}, this)">
          Unirse al chat
        </button>
      </div>
    </div>
  `;
}

function updateChatHeaderButtons() {
  const area = document.getElementById("chatHeaderButtons");
  if (!area || !currentTicket) return;

  const isClosed = currentTicket.status === "closed";
  
  // Gmail solo si está unido y abierto
  const gmailBtn = (isAgentJoined && !isClosed) ? `
    <button class="btn-status-toggle" 
            style="background: #ea4335; color: #fff; border: none; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(234, 67, 53, 0.2);"
            onclick="openGmailModal()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9-2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
      </svg>
      Gmail Proveedor
    </button>` : '';

  // Cerrar solo si está unido
  const statusBtn = (isAgentJoined) ? `
    <button class="btn-status-toggle ${currentTicket.status === 'closed' ? 'btn-reopen' : 'btn-close'}" 
            id="statusToggleBtn"
            onclick="changeTicketStatus(${currentTicket.id}, '${currentTicket.status}')">
      ${currentTicket.status === 'closed' ? 'Abrir ticket' : 'Cerrar ticket'}
    </button>` : '';

  area.innerHTML = gmailBtn + statusBtn;
}

// Función para mostrar el área de input o mensaje de ticket cerrado
function showInputArea() {
  removeInputArea();
  
  const chatWrap = document.querySelector('.chat-wrap');
  if (!chatWrap) return;
  
  // Si el ticket está cerrado, mostrar mensaje en lugar del input
  if (currentTicket?.status === 'closed') {
    const closedMessage = document.createElement('div');
    closedMessage.className = 'ticket-closed-footer';
    closedMessage.innerHTML = `
      <div>
        <p style="font-weight: 600; color: var(--text); margin-bottom: 4px;">Este ticket está cerrado</p>
        <p style="font-size: 12px;">Si necesitas mandar un mensaje, abre el ticket nuevamente.</p>
      </div>
    `;
    chatWrap.appendChild(closedMessage);
    return;
  }
  
  // Crear el footer normal para tickets abiertos
  const footer = document.createElement('div');
  footer.className = 'input-area';
  footer.innerHTML = `
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
  `;
  
  chatWrap.appendChild(footer);
}

// Función para eliminar el área de input y el mensaje de ticket cerrado
function removeInputArea() {
  const existingFooter = document.querySelector('.input-area');
  if (existingFooter) {
    existingFooter.remove();
  }
  
  const closedFooter = document.querySelector('.ticket-closed-footer');
  if (closedFooter) {
    closedFooter.remove();
  }
}

// Cerrar SSE / modal con Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeChat();
  }
});

// ── CHAT ──────────────────────────────────────────────────────────────────────
async function openChat(ticket) {
  const main = document.getElementById("mainArea");

  closeSSE();
  currentTicket = ticket;
  isAgentJoined = false;
  isAutoJoining = false;

  // Determinar si el ticket está cerrado
  const isClosed = ticket.status === "closed";
  
  // Mostrar estructura básica del chat
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
              <div class="chat-header-meta">Ticket: #${ticket.id} · ${isClosed ? 'Cerrado' : 'Abierto'}</div>
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap: 12px;">
          <div id="chatHeaderButtons" style="display:flex; align-items:center; gap: 12px;"></div>
          <div class="sse-indicator">
            <div class="sse-dot" id="sseDot"></div>
            <span id="sseLabel">Conectando…</span>
          </div>
        </div>
      </div>
      <div class="messages-area" id="messagesArea">
        <div style="display:flex; align-items:center; justify-content:center; height:100%;">
          <div class="spinner"></div>
        </div>
      </div>
    </div>`;

  // Conectar SSE
  connectSSE(ticket.id);
}

// Función para unirse manualmente (solo para tickets abiertos)
async function joinTicket(ticketId, btn) {
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner-small"></div>';
  }
  
  try {
    console.log('Manually joining open ticket:', ticketId);
    
    const res = await fetch(`/api/joinTicket/${ticketId}`, { method: "POST" });
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.Error || "Error al unirse");
    }
    
    showToast(data.message, "success");
    
    // Recargar el chat
    const ticket = allTickets.find((t) => t.id === ticketId);
    if (ticket) {
      await openChat(ticket);
    }
  } catch (e) {
    showToast(e.message, "error");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Unirse al chat';
    }
  }
}

function appendMessage(msg) {
  const area = document.getElementById("messagesArea");
  if (!area) return;
  
  // Si el área está vacía o solo tiene el spinner, limpiarlo
  if (area.children.length === 1) {
    const firstChild = area.children[0];
    if (firstChild.querySelector('.spinner') || firstChild.classList.contains('agent-not-joined-message')) {
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
  const avatarClass = isMe ? "avatar-client" : (isAgent ? "avatar-agent" : "avatar-client");

  let filesHtml = "";
  if (msg.files) {
    const files = msg.files.split('|');
    filesHtml = "<div class='msg-files'>" +
      files.map((u) => u.trim()).filter(u => u).map(
        (u) => `
        <a class="msg-file" href="${u}" target="_blank" rel="noopener noreferrer">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7 1H3a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V4L7 1zm0 0v3h3"
                  stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          ${escHtml(decodeURIComponent(u.split('/').pop() || u.split('\\').pop() || 'archivo'))}
        </a>`
      )
      .join("") +
      "</div>";
  }

  const div = document.createElement("div");
  div.className = `msg-row ${isMe ? "mine" : "theirs"}`;
  if (msg.id) div.dataset.msgId = msg.id;
  
  const time = msg.created_at ? formatDateOnly(msg.created_at) : new Date().toLocaleDateString();
  
  div.innerHTML = `
      <div class="msg-avatar ${avatarClass}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <div>
        <div class="msg-bubble">${escHtml(msg.message || '')}${filesHtml}</div>
        <div class="msg-meta">${msg.user} · ${time}</div>
      </div>`;
  
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

// ── SEND MESSAGE ──────────────────────────────────────────────────────────────
async function sendMessage() {
  const btn = document.getElementById("sendBtn");
  if (!btn || btn.disabled) return;

  // Verificar si el ticket está cerrado
  if (currentTicket?.status === 'closed') {
    showToast("No puedes enviar mensajes en tickets cerrados", "warning");
    return;
  }

  // Verificar si el agente está unido
  if (!isAgentJoined) {
    showToast("El agente no está unido al chat", "warning");
    return;
  }

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
    // Esperar a que terminen los que aún están subiendo
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
      type: 2,
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
  // No permitir adjuntar archivos si el ticket está cerrado
  if (currentTicket?.status === 'closed') {
    showToast("No puedes adjuntar archivos en tickets cerrados", "warning");
    e.target.value = "";
    return;
  }

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

function closeChat() {
  closeSSE();
  currentTicket = null;
  pendingFiles = [];
  isAgentJoined = false;
  isAutoJoining = false;
  
  // Eliminar cualquier footer existente
  removeInputArea();
  
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

// ── HELPERS ───────────────────────────────────────────────────────────────────
async function changeTicketStatus(ticketId, currentStatus) {
  const newStatus = currentStatus === "closed" ? "open" : "closed";
  const btn = document.getElementById("statusToggleBtn");
  if (btn) btn.disabled = true;
  
  closeChat();
  
  try {
    const res = await fetch(`/api/changeStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        ticket_id: ticketId,
        type: 2
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.Error || "Error al cambiar estado");
    
    showToast(`Ticket ${newStatus === "closed" ? "cerrado" : "abierto"} exitosamente`, "success");
    
    const ticket = allTickets.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.status = newStatus;
      renderTickets();
      
      // Si estamos viendo este ticket, recargarlo
      if (currentTicket?.id === ticketId) {
        await openChat(ticket);
      }
    }
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── GMAIL CHAT MODAL ──────────────────────────────────────────────────────────
async function openGmailModal() {
  if (!currentTicket) return;
  
  // Guardar datos del ticket antes de cerrar la conversación interna
  const ticketData = { ...currentTicket };
  
  // Cerrar la conversación actual por completo (limpia UI, cierra SSE y pone currentTicket = null)
  closeChat();
  
  // Restaurar el objeto ticket para que el modal funcione correctamente
  currentTicket = ticketData;

  // 2. Preparar datos de Gmail
  providerEmail = currentTicket.provider_email || "";
  
  if (!providerEmail) {
    providerEmail = prompt("Ingresa el correo del proveedor para este ticket:", "");
    if (!providerEmail) {
      showToast("Se requiere un correo para contactar al proveedor", "warning");
      return;
    }
    // Guardar el correo en la BD
    fetch(`/api/updateProviderEmail?ticket_id=${currentTicket.id}&email=${encodeURIComponent(providerEmail)}`, { method: "POST" })
      .then(r => r.json())
      .then(data => {
        if (data.message) {
          currentTicket.provider_email = providerEmail;
          const t = allTickets.find(x => x.id === currentTicket.id);
          if (t) {
            t.provider_email = providerEmail;
            renderTickets(); // Actualizar el onclick de los tickets en el sidebar
          }
        }
      });
  }
  
  gmailSubject = currentTicket.subject;
  
  // Crear el modal si no existe
  let modal = document.getElementById("gmailModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "gmailModal";
    modal.className = "modal-overlay";
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="modal modal-gmail">
      <div class="modal-gmail-header">
        <div>
          <div style="font-weight: 700; display:flex; align-items:center; gap:8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ea4335">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            Contacto Proveedor (Gmail)
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top:2px;">
            ${providerEmail} · Ticket #${currentTicket.id}
          </div>
        </div>
        <button class="btn-close-modal" onclick="closeGmailModal()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="modal-gmail-content">
        <div class="modal-gmail-messages" id="gmailMessages">
          <div style="display:flex; align-items:center; justify-content:center; height:100%;">
            <div class="spinner"></div>
          </div>
        </div>
        <div class="modal-gmail-footer">
          <div class="input-files-preview" id="gmailFilesPreview"></div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 0 4px;">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; width: 34px;">CCO:</div>
            <input type="text" id="gmailBccInput" placeholder="correos@ejemplo.com, otro@ejemplo.com..." 
                   style="flex: 1; background: var(--surface2); border: 1px solid var(--border2); border-radius: 6px; padding: 4px 10px; font-size: 12px; color: var(--text); outline: none;">
          </div>
          <div class="input-row">
            <button class="btn-attach" title="Adjuntar archivo" onclick="document.getElementById('gmailFileInput').click()">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 7.5l-6 6a4 4 0 01-5.657-5.657l6-6a2.5 2.5 0 013.536 3.536l-6 6a1 1 0 01-1.414-1.414l5.5-5.5"
                      stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </button>
            <textarea id="gmailMsgInput" placeholder="Escribe un correo al proveedor…" rows="1"
                      onkeydown="handleGmailKey(event)" oninput="autoResize(this)"></textarea>
            <button class="btn-send" id="gmailSendBtn" onclick="sendGmailMessage()">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 2L7 9M14 2L9 14 7 9 2 7l12-5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <input type="file" id="gmailFileInput" multiple style="display:none" onchange="handleGmailFileSelect(event)">
        </div>
      </div>
    </div>
  `;
  
  modal.classList.add("open");
  connectGmailSSE(currentTicket.id);
}

function closeGmailModal() {
  cancelGmailCountdown();
  if (gmailActivityTimeout) {
    clearTimeout(gmailActivityTimeout);
    gmailActivityTimeout = null;
  }
  if (gmailSSESource) {
    gmailSSESource.close();
    gmailSSESource = null;
  }
  const modal = document.getElementById("gmailModal");
  if (modal) modal.classList.remove("open");
  pendingGmailFiles = [];
}

function resetGmailActivity() {
  cancelGmailCountdown();
  if (gmailActivityTimeout) {
    clearTimeout(gmailActivityTimeout);
  }
  if (gmailSSESource && currentTicket) {
    gmailActivityTimeout = setTimeout(() => {
      showGmailInactivityCountdown();
    }, gmailInactivityPeriod);
  }
}

function cancelGmailCountdown() {
  if (gmailCountdownTimeout) {
    clearInterval(gmailCountdownTimeout);
    gmailCountdownTimeout = null;
  }
  const modal = document.getElementById("gmailInactivityModal");
  if (modal) modal.remove();
}

function showGmailInactivityCountdown() {
  let secondsLeft = 10;
  const modal = document.createElement("div");
  modal.id = "gmailInactivityModal";
  modal.className = "modal-overlay open";
  modal.style.zIndex = "2000"; // Por encima del modal de gmail
  modal.innerHTML = `
    <div class="modal" style="text-align: center;">
      <div class="modal-title">¿Continuar conversación de Gmail?</div>
      <p style="color: var(--text-dim); margin-bottom: 20px;">
        La conexión se cerrará por inactividad en:
      </p>
      <div style="font-size: 48px; font-weight: 700; color: var(--danger); margin-bottom: 20px;" id="gmailCountdownNumber">
        ${secondsLeft}
      </div>
      <div class="modal-actions" style="justify-content: center; gap: 10px;">
        <button class="btn-confirm" onclick="extendGmailSession()">
          Mantener conectado (${secondsLeft}s)
        </button>
        <button class="btn-cancel" onclick="closeGmailModal()">
          Cerrar ahora
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  const updateBtn = () => {
    const btn = modal.querySelector('.btn-confirm');
    if (btn) btn.innerHTML = `Mantener conectado (${secondsLeft}s)`;
  };
  
  gmailCountdownTimeout = setInterval(() => {
    secondsLeft--;
    const el = document.getElementById("gmailCountdownNumber");
    if (el) el.textContent = secondsLeft;
    updateBtn();
    
    if (secondsLeft <= 0) {
      closeGmailModal();
      showToast("Conexión de Gmail cerrada por inactividad", "error");
    }
  }, 1000);
}

function extendGmailSession() {
  cancelGmailCountdown();
  resetGmailActivity();
}

function connectGmailSSE(ticketId) {
  if (gmailSSESource) gmailSSESource.close();
  
  const url = `/api/gmailChat?ticket_id=${ticketId}`;
  gmailSSESource = new EventSource(url);

  gmailSSESource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.current_user) {
        const area = document.getElementById("gmailMessages");
        if (area && area.querySelector('.spinner')) area.innerHTML = '';
        resetGmailActivity();
        return;
      }
      appendGmailMessage(data);
      resetGmailActivity();
    } catch (error) {
      console.error('Error parsing Gmail SSE message:', error);
    }
  };
  
  gmailSSESource.onerror = () => {
    console.error('Gmail SSE Error');
    closeGmailModal();
  };
  
  gmailSSESource.addEventListener("close", (e) => {
    closeGmailModal();
    showToast("Chat de Gmail cerrado por el servidor", "warning");
  });

  resetGmailActivity();
}

let pendingGmailFiles = [];
let gmailFileIdCounter = 0;

async function loadGmailMessages(ticketId) {
  // Ya no se usa polling, pero mantenemos la firma por si acaso
}

function appendGmailMessage(msg) {
  const area = document.getElementById("gmailMessages");
  if (!area) return;
  
  if (area.querySelector('.spinner')) area.innerHTML = '';
  
  if (msg.id) {
    const existing = area.querySelector(`[data-msg-id="${msg.id}"]`);
    if (existing) return;
  }
  
  const isMe = msg.is_me;
  const div = document.createElement("div");
  div.className = `msg-row ${isMe ? "mine" : "theirs"}`;
  if (msg.id) div.dataset.msgId = msg.id;
  
  let filesHtml = "";
  if (msg.files) {
    const files = msg.files.split('|');
    filesHtml = "<div class='msg-files' style='margin-top: 8px; display: flex; flex-direction: column; gap: 4px;'>" +
      files.map(f => `
        <a href="/api/getGmailAttachment?ticket_id=${currentTicket.id}&msg_id=${msg.id}&filename=${encodeURIComponent(f)}" 
           target="_blank" class="msg-file" 
           style="background: ${isMe ? 'rgba(255,255,255,0.1)' : 'var(--surface2)'}; border-color: ${isMe ? 'rgba(255,255,255,0.2)' : 'var(--border)'}; display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; text-decoration: none; color: ${isMe ? '#fff' : 'var(--accent)'}; font-size: 11px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          ${escHtml(f)}
        </a>`).join("") + "</div>";
  }

  div.innerHTML = `
      <div style="width: 100%">
        <div class="msg-bubble" style="${isMe ? 'background: #ea4335; border-color: #ea4335;' : ''} max-width: 100%">
          ${escHtml(msg.message || '')}${filesHtml}
        </div>
      </div>`;
  
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

async function sendGmailMessage() {
  const btn = document.getElementById("gmailSendBtn");
  if (!btn || btn.disabled) return;

  const input = document.getElementById("gmailMsgInput");
  const message = input.value.trim();
  if (!message && pendingGmailFiles.length === 0) return;

  btn.disabled = true;
  const savedMessage = message;
  const savedFiles = [...pendingGmailFiles];
  input.value = "";
  input.style.height = "auto";

  try {
    const formData = new FormData();
    formData.append("ticket_id", currentTicket.id);
    formData.append("to_email", providerEmail);
    formData.append("subject", gmailSubject);
    formData.append("message", savedMessage);
    
    const bcc = document.getElementById("gmailBccInput")?.value || "";
    formData.append("bcc", bcc);
    
    savedFiles.forEach(pf => {
      formData.append("files", pf.file);
    });

    const res = await fetch(`/api/sendGmailMessage`, {
      method: "POST",
      body: formData,
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.Error || "Error al enviar correo");

    pendingGmailFiles = [];
    renderGmailFilesPreview();
    const bccInput = document.getElementById("gmailBccInput");
    if (bccInput) bccInput.value = "";
    
    resetGmailActivity();
    showToast("Correo enviado al proveedor", "success");
  } catch (e) {
    showToast(e.message, "error");
    input.value = savedMessage;
    autoResize(input);
  } finally {
    btn.disabled = false;
  }
}

function handleGmailFileSelect(e) {
  Array.from(e.target.files).forEach((file) => {
    const pf = { file, id: ++gmailFileIdCounter };
    pendingGmailFiles.push(pf);
  });
  renderGmailFilesPreview();
  e.target.value = ""; // Limpiar input para permitir re-selección
}

function removeGmailFile(id) {
  pendingGmailFiles = pendingGmailFiles.filter(f => f.id !== id);
  renderGmailFilesPreview();
}

function renderGmailFilesPreview() {
  const preview = document.getElementById("gmailFilesPreview");
  if (!preview) return;
  preview.innerHTML = pendingGmailFiles.map((pf) => `
    <div class="file-chip done">
      ${pf.file.name}
      <button onclick="removeGmailFile(${pf.id})">×</button>
    </div>`).join("");
}

function isUploading() {
  return pendingFiles.some((f) => f.state === "uploading");
}

function handleGmailKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    sendGmailMessage();
    return false;
  }
  return true;
}

// Manejador de tecla Enter mejorado
function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    
    const btn = document.getElementById("sendBtn");
    const input = document.getElementById("msgInput");
    
    // Verificar si hay mensaje
    if (input && input.value.trim()) {
      if (!isUploading() && isAgentJoined) {
        sendMessage();
      } else if (!isAgentJoined) {
        showToast("El agente no está unido al chat", "warning");
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
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateOnly(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleDateString("es-MX", { month: "short" }).toUpperCase();
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

function showToast(msg, type = "success") {
  const c = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = `toast-item ${type}`;
  el.innerHTML = `<div class="toast-dot"></div><span>${escHtml(msg)}</span>`;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}