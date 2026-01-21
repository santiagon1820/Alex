const loginSection = document.getElementById("loginSection");
const alreadyActivatedSection = document.getElementById(
  "alreadyActivatedSection",
);
const activationSection = document.getElementById("activationSection");

const loginForm = document.getElementById("loginForm");
const verifyForm = document.getElementById("verifyForm");

const loginMessage = document.getElementById("loginMessage");
const verifyMessage = document.getElementById("verifyMessage");

let currentUsername = "";
let isSubmitting = false;

function showMessage(el, type, text) {
  el.textContent = text;
  el.classList.remove("hidden", "error-msg", "success-msg");
  el.classList.add(type === "error" ? "error-msg" : "success-msg");
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const loginBtn = document.getElementById("loginBtn");

  // Si ya se está enviando o el botón está deshabilitado, ignorar
  if (isSubmitting || loginBtn.disabled) return;

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  currentUsername = username;

  // Bloqueo inmediato y total
  isSubmitting = true;
  loginBtn.disabled = true;
  loginBtn.textContent = "Verificando...";

  try {
    const res = await fetch("/api/2FA", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, code: "" }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.Error || "Error al iniciar sesión");
    }

    // Login exitoso, ahora intentamos generar el secreto
    await checkAndGenerateSecret();
  } catch (err) {
    showMessage(loginMessage, "error", err.message);
    // Solo rehabilitamos si hubo error para permitir reintentar
    isSubmitting = false;
    loginBtn.disabled = false;
    loginBtn.textContent = "Continuar";
  } finally {
    // Si llegamos aquí y no hay error, el proceso de checkAndGenerateSecret
    // se encargará de ocultar la sección, por lo que no rehabilitamos el botón.
  }
});

async function checkAndGenerateSecret() {
  try {
    const res = await fetch("/api/generateSecret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: currentUsername }),
    });

    if (res.status === 400) {
      // Ya está activado
      loginSection.classList.add("hidden");
      alreadyActivatedSection.classList.remove("hidden");
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.Error || "Error al generar secreto");
    }

    const data = await res.json();

    // Mostrar panel de activación y generar QR
    loginSection.classList.add("hidden");
    activationSection.classList.remove("hidden");

    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), {
      text: data.url,
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  } catch (err) {
    loginSection.classList.remove("hidden");
    showMessage(loginMessage, "error", err.message);
  }
}

verifyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isSubmitting) return;

  const verifyBtn = document.getElementById("verifyBtn");
  const code = document.getElementById("otpCode").value;

  // Bloqueo total
  isSubmitting = true;
  verifyBtn.disabled = true;
  verifyBtn.textContent = "Verificando...";

  try {
    const res = await fetch("/api/config2FA", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: currentUsername,
        code: code,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.Error || "Error al configurar 2FA");
    }

    showMessage(
      verifyMessage,
      "success",
      "¡2FA activado correctamente! Redirigiendo...",
    );
    setTimeout(() => {
      window.location.href = "/login";
    }, 2000);
  } catch (err) {
    showMessage(verifyMessage, "error", err.message);
  } finally {
    isSubmitting = false;
    // Solo rehabilitar si no hay éxito (aunque aquí redirige)
    if (!verifyMessage.classList.contains("success-msg")) {
      verifyBtn.disabled = false;
      verifyBtn.textContent = "Verificar y Activar";
    }
  }
});

async function init() {
  const container = document.querySelector(".container");
  try {
    // 1. Prioridad: Si ya tiene sesión completa, fuera de aquí.
    const resMain = await fetch("/api/isLogin");
    if (resMain.ok) {
      window.location.href = "/";
      return;
    }

    // 2. Si no hay sesión completa, ver si hay sesión parcial de 2FA activa.
    const res2FA = await fetch("/api/isLogin2FA");
    if (res2FA.ok) {
      // Intentamos cargar el secreto directamente ya que el backend usará el token
      await checkAndGenerateSecret();
    } else {
      // No hay sesión de ningún tipo, mostramos login
      loginSection.classList.remove("hidden");
    }
  } catch (err) {
    console.error("Error en la inicialización:", err);
    loginSection.classList.remove("hidden");
  } finally {
    // Sea cual sea el resultado (mientras no haya redirección), mostramos el contenedor principal
    container.classList.remove("hidden");
  }
}

init();
