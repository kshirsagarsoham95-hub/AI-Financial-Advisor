// ==========================================================================
// FINADVISOR AI - AUTHENTICATION SUITE (LOGIN & REGISTRATION)
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Respect stored theme
    const savedTheme = localStorage.getItem("finadvisor_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Elements
    const tabSignIn = document.getElementById("tabSignIn");
    const tabSignUp = document.getElementById("tabSignUp");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const demoBadge = document.getElementById("demoBadge");
    const authMessage = document.getElementById("authMessage");
    const btnLogin = document.getElementById("btnLogin");
    const btnRegister = document.getElementById("btnRegister");
    const linkToSignUp = document.getElementById("linkToSignUp");
    const linkToSignIn = document.getElementById("linkToSignIn");

    // Status message helpers
    function showMessage(text, isError = false) {
        authMessage.textContent = text;
        authMessage.style.color = isError ? "#fb7185" : "#00d2ff";
    }

    function clearMessage() {
        authMessage.textContent = "";
    }

    // Tab switching
    function switchTab(mode) {
        clearMessage();
        if (mode === "signup") {
            tabSignIn.classList.remove("active");
            tabSignIn.setAttribute("aria-selected", "false");
            tabSignUp.classList.add("active");
            tabSignUp.setAttribute("aria-selected", "true");

            loginForm.style.display = "none";
            registerForm.style.display = "block";
            if (demoBadge) demoBadge.style.display = "none";
            document.getElementById("regName").focus();
        } else {
            tabSignUp.classList.remove("active");
            tabSignUp.setAttribute("aria-selected", "false");
            tabSignIn.classList.add("active");
            tabSignIn.setAttribute("aria-selected", "true");

            registerForm.style.display = "none";
            loginForm.style.display = "block";
            if (demoBadge) demoBadge.style.display = "block";
            document.getElementById("email").focus();
        }
    }

    if (tabSignIn && tabSignUp) {
        tabSignIn.addEventListener("click", () => switchTab("signin"));
        tabSignUp.addEventListener("click", () => switchTab("signup"));
    }

    if (linkToSignUp) {
        linkToSignUp.addEventListener("click", (e) => {
            e.preventDefault();
            switchTab("signup");
        });
    }

    if (linkToSignIn) {
        linkToSignIn.addEventListener("click", (e) => {
            e.preventDefault();
            switchTab("signin");
        });
    }

    // Demo credentials autofill
    const demoClientBtn = document.getElementById("demoClientBtn");
    const demoAdminBtn = document.getElementById("demoAdminBtn");

    if (demoClientBtn) {
        demoClientBtn.addEventListener("click", () => {
            document.getElementById("email").value = "client@finadvisor.ai";
            document.getElementById("password").value = "password123";
            showMessage("Client credentials loaded (client@finadvisor.ai)", false);
        });
    }

    if (demoAdminBtn) {
        demoAdminBtn.addEventListener("click", () => {
            document.getElementById("email").value = "admin@finadvisor.ai";
            document.getElementById("password").value = "admin123";
            showMessage("👑 Admin credentials loaded (admin@finadvisor.ai)", false);
        });
    }

    // Handle Login submission
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;

            if (!email || !password) {
                showMessage("Please provide both email and password.", true);
                return;
            }

            showMessage("Authenticating session...", false);
            btnLogin.disabled = true;

            try {
                const response = await fetch("/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Authentication failed.");
                }

                if (data.role === "admin") {
                    showMessage("👑 Administrator access granted! Opening Database Hub...", false);
                    setTimeout(() => {
                        window.location.href = "/database.html";
                    }, 400);
                } else {
                    showMessage("Authentication successful! Redirecting...", false);
                    setTimeout(() => {
                        window.location.href = "/input.html";
                    }, 400);
                }

            } catch (error) {
                showMessage(error.message, true);
                btnLogin.disabled = false;
            }
        });
    }

    // Handle Register submission
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("regName").value.trim();
            const email = document.getElementById("regEmail").value.trim();
            const password = document.getElementById("regPassword").value;
            const confirmPassword = document.getElementById("regConfirmPassword").value;

            if (!name || !email || !password) {
                showMessage("Please fill out all required fields.", true);
                return;
            }

            if (password !== confirmPassword) {
                showMessage("Passwords do not match.", true);
                return;
            }

            if (password.length < 6) {
                showMessage("Password must be at least 6 characters long.", true);
                return;
            }

            showMessage("Creating your account...", false);
            btnRegister.disabled = true;

            try {
                const response = await fetch("/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Registration failed.");
                }

                showMessage("Account created! Entering advisory suite...", false);
                setTimeout(() => {
                    window.location.href = "/input.html";
                }, 500);

            } catch (error) {
                showMessage(error.message, true);
                btnRegister.disabled = false;
            }
        });
    }
});
