// ==========================================================================
// AI FINANCIAL ADVISOR - LOGIN HANDLER
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");
    const btnLogin = document.getElementById("btnLogin");

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
            loginMessage.style.color = "#34d399";

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