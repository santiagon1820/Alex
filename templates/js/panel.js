/**
 * ============================================================
 * panel.js — Lógica de Front-end para el Dashboard MG
 * ============================================================
 */

// Globales
let notifications = [];

async function checkPermissions() {
    try {
        const res = await fetch("/api/myPermissions");
        if (res.ok) {
            const data = await res.json();
            const allowedPages = data.pages || [];

            // Mostrar links del sidebar que estén en la lista de permitidos
            const sidebarLinks = document.querySelectorAll(
                ".fixed.inset-y-0.left-0 a",
            );
            sidebarLinks.forEach((link) => {
                const href = link.getAttribute("href");

                // Si es el logo (MG) lo dejamos como está
                if (!href) return;

                // Si el href está en la lista de permitidos, lo mostramos
                if (allowedPages.includes(href)) {
                    link.style.display = "flex";
                }
                // Mantenemos siempre visibles Dashboard e Inicio
                else if (href === "/panel" || href === "#") {
                    link.style.display = "flex";
                }
            });
        }
    } catch (e) {
        console.error("Error al verificar permisos:", e);
    }
}

async function handleLogout() {
    const btn = document.getElementById("btn-logout");
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = "0.6";
    }

    try {
        const res = await fetch("/api/logout", {
            method: "POST",
            credentials: "include",
        });

        if (res.ok) {
            window.location.href = "/";
        } else {
            const data = await res.json();
            alert(data.Error || "Error al cerrar sesión");
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = "1";
            }
        }
    } catch (err) {
        alert("Error de conexión al cerrar sesión");
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = "1";
        }
    }
}

// ── SIDEBAR MÓVIL ───────────────────────────────────────────

const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');

function toggleSidebar() {
    if (!sidebar || !sidebarOverlay) return;
    const isShowing = sidebar.classList.toggle('show');
    sidebarOverlay.classList.toggle('show', isShowing);
    
    // Bloquear scroll del body cuando el sidebar está abierto
    document.body.style.overflow = isShowing ? 'hidden' : '';
}

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', toggleSidebar);
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', toggleSidebar);
}

// Cerrar sidebar al hacer clic en un link (en móvil)
const sidebarLinks = document.querySelectorAll('#sidebar nav a');
sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth < 1024) {
            toggleSidebar();
        }
    });
});

// ── NOTIFICACIONES ──────────────────────────────────────────

const notificationBtn = document.getElementById('notification-btn');
const notificationDropdown = document.getElementById('notification-dropdown');
const notificationContainer = document.getElementById('notification-container');
const notificationCount = document.getElementById('notification-badge');

async function loadNotifications() {
    try {
        const res = await fetch('/api/notifications');
        if (!res.ok) throw new Error("Error al obtener notificaciones");
        
        notifications = await res.json();
        renderNotifications();
        updateNotificationIcon();
    } catch (e) {
        console.error(e);
        if (notificationContainer) {
            notificationContainer.innerHTML = `
                <div class="p-4 text-center text-xs text-red-500">
                    No se pudieron cargar las alertas
                </div>`;
        }
    }
}

function updateNotificationIcon() {
    if (!notificationCount) return;
    const unreadCount = notifications.filter(n => n.isRead === 0).length;
    
    if (unreadCount > 0) {
        notificationCount.style.display = 'flex';
        notificationCount.textContent = unreadCount > 9 ? '9+' : unreadCount;
    } else {
        notificationCount.style.display = 'none';
    }
}

function renderNotifications() {
    if (!notificationContainer) return;
    
    const unreadNotifications = notifications.filter(n => n.isRead === 0);
    
    if (unreadNotifications.length === 0) {
        notificationContainer.innerHTML = `
            <div class="p-8 text-center flex flex-col items-center gap-2">
                <span class="material-symbols-outlined text-gray-300 text-4xl">notifications_off</span>
                <p class="text-xs text-gray-500 font-medium">No tienes alertas pendientes</p>
            </div>`;
        return;
    }

    notificationContainer.innerHTML = unreadNotifications.map(notif => {
        const priorityClass = `priority-${notif.priority}`;
        const priorityLabel = notif.priority.charAt(0).toUpperCase() + notif.priority.slice(1);
        
        return `
            <div class="notification-item flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${priorityClass}" 
                 id="notif-${notif.id_notification}" 
                 onclick="markNotificationAsRead(${notif.id_notification})">
                <div class="size-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span class="priority-dot size-2 rounded-full animate-pulse"></span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-0.5">
                        <span class="text-[9px] font-black uppercase tracking-widest priority-text">${priorityLabel}</span>
                    </div>
                    <p class="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">${notif.message}</p>
                    <p class="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider">Notificación del sistema</p>
                </div>
            </div>
        `;
    }).join('');
}

async function markNotificationAsRead(id) {
    const el = document.getElementById(`notif-${id}`);
    if (!el) return;

    // Animación visual inmediata
    el.classList.add('removing');
    
    try {
        const res = await fetch(`/api/notifications/read/${id}`, { method: 'POST' });
        if (!res.ok) throw new Error("Error al marcar como leída");

        // Remover del arreglo global y actualizar vista tras animación
        setTimeout(() => {
            notifications = notifications.filter(n => n.id_notification !== id);
            renderNotifications();
            updateNotificationIcon();
        }, 300); // 300ms es la duración de la transición CSS 'removing'

    } catch (e) {
        console.error(e);
        // Revertir si falla
        el.classList.remove('removing');
        alert("Hubo un error al procesar la notificación.");
    }
}

// Alternar dropdown de notificaciones
if (notificationBtn) {
    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = notificationDropdown.classList.toggle('active');
        if (isActive) {
            loadNotifications();
        }
    });
}

// Cerrar dropdown al hacer clic fuera
document.addEventListener('click', (e) => {
    if (notificationDropdown && !notificationDropdown.contains(e.target) && !notificationBtn.contains(e.target)) {
        notificationDropdown.classList.remove('active');
    }
});

// Inicialización
window.onload = () => {
    checkPermissions();
    // Carga inicial de conteo de notificaciones (opcional, o podrías usar un polling/socket)
    loadNotifications();
};
