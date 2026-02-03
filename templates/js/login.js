const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginBtn = document.getElementById("loginBtn");

let isSubmitting = false;

function showMessage(type, text) {
  loginMessage.textContent = text;
  loginMessage.classList.remove("hidden", "error-msg", "success-msg");
  loginMessage.classList.add(type === "error" ? "error-msg" : "success-msg");
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (isSubmitting) return;

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const code = document.getElementById("twofaCode").value.trim();

  if (!username || !password || !code) {
    showMessage("error", "Por favor, completa todos los campos.");
    return;
  }

  // Bloqueo de UI
  isSubmitting = true;
  loginBtn.disabled = true;
  const originalBtnText = loginBtn.textContent;
  loginBtn.textContent = "Iniciando sesión...";
  loginMessage.classList.add("hidden");

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password, code }),
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.Error || "Usuario, contraseña o código incorrectos.",
      );
    }

    showMessage("success", "Credenciales correctas! Redirigiendo...");

    // Redirección suave
    setTimeout(() => {
      window.location.href = "/panel";
    }, 1500);
  } catch (err) {
    showMessage("error", err.message);
    isSubmitting = false;
    loginBtn.disabled = false;
    loginBtn.textContent = originalBtnText;
  }
});

// Auto-focus en el primer campo
window.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("username").focus();
  try {
    const res = await fetch("/api/isLogin");
    if (res.ok) {
      window.location.href = "/panel";
    }
  } catch (e) {
    // Si falla la verificación, simplemente nos quedamos en el login
  }
});
