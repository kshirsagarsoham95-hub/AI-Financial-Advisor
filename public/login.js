// ==========================================================================
// AI FINANCIAL ADVISOR - LOGIN HANDLER
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Respect stored theme
    const savedTheme = localStorage.getItem("finadvisor_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");
    const btnLogin = document.getElementById("btnLogin");

    const demoBadge = document.querySelector(".demo-credentials-badge");
    if (demoBadge) {
        demoBadge.addEventListener("click", () => {
            document.getElementById("email").value = "client@finadvisor.ai";
            document.getElementById("password").value = "password123";
            loginMessage.textContent = "Demo credentials loaded! Click below to enter.";
            loginMessage.style.color = "#00d2ff";
        });
    }

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!email || !password) {
            loginMessage.textContent = "Please provide both email and password.";
            loginMessage.style.color = "#fb7185";
            return;
        }

        loginMessage.textContent = "Authenticating session...";
        loginMessage.style.color = "#94a3b8";
        btnLogin.disabled = true;

        try {
            const response = await fetch("/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Authentication failed.");
            }

            loginMessage.textContent = "Authentication successful! Redirecting...";
            loginMessage.style.color = "#00d2ff";

            setTimeout(() => {
                window.location.href = "/input.html";
            }, 400);

        } catch (error) {
            loginMessage.textContent = error.message;
            loginMessage.style.color = "#fb7185";
            btnLogin.disabled = false;
        }
    });
});