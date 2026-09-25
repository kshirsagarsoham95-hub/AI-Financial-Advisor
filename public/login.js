const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");


loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const email =
            document.getElementById("email").value;

        const password =
            document.getElementById("password").value;


        loginMessage.textContent =
            "Signing in...";

        loginMessage.style.color =
            "#94a3b8";


        try {

            const response =
                await fetch("/login", {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        email: email,
                        password: password

                    })

                });


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Login failed"
                );

            }


            loginMessage.textContent =
                "Login successful!";

            loginMessage.style.color =
                "#4ade80";


            setTimeout(() => {

                window.location.href =
                    "/advisor";

            }, 500);


        } catch (error) {

            loginMessage.textContent =
                error.message;

            loginMessage.style.color =
                "#f87171";

        }

    }
);