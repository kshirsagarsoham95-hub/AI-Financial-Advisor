require("dotenv").config();

const express = require("express");
const session = require("express-session");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json());


// ===============================
// SESSION
// ===============================

app.use(
    session({
        secret: "financial-advisor-secret-key",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60
        }
    })
);


// ===============================
// STATIC FILES
// ===============================

app.use(
    express.static("public", {
        index: false
    })
);


// ===============================
// LOGIN PAGE
// ===============================

app.get("/", (req, res) => {

    if (req.session.loggedIn) {
        return res.redirect("/advisor");
    }

    res.sendFile(
        __dirname + "/public/login.html"
    );

});


// ===============================
// LOGIN
// ===============================

app.post("/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {

        return res.status(400).json({
            error: "Email and password are required."
        });

    }

    // Demo login
    // Any non-empty email/password is accepted

    req.session.loggedIn = true;
    req.session.email = email;

    res.json({
        success: true
    });

});


// ===============================
// LOGOUT
// ===============================

app.get("/logout", (req, res) => {

    req.session.destroy(() => {

        res.redirect("/");

    });

});


// ===============================
// PROTECTED ADVISOR PAGE
// ===============================

app.get("/advisor", (req, res) => {

    if (!req.session.loggedIn) {

        return res.redirect("/");

    }

    res.sendFile(
        __dirname + "/public/index.html"
    );

});


// ===============================
// PROTECT index.html
// ===============================

app.get("/index.html", (req, res) => {

    if (!req.session.loggedIn) {

        return res.redirect("/");

    }

    res.sendFile(
        __dirname + "/public/index.html"
    );

});


// ===============================
// AI FUNCTION WITH RETRY
// ===============================

async function generateAI(prompt) {

    const maxAttempts = 3;

    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        try {

            const response =
                await ai.models.generateContent({

                    model:
                        "gemini-3.5-flash-lite",

                    contents: prompt

                });

            return response;

        }

        catch (error) {

            console.log(
                `AI attempt ${attempt} failed:`,
                error.message
            );


            // Retry only for temporary 503 errors

            if (
                attempt === maxAttempts ||
                !error.message.includes("503")
            ) {

                throw error;

            }


            const waitTime =
                attempt * 2000;


            console.log(
                `Retrying in ${waitTime / 1000} seconds...`
            );


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        waitTime
                    )
            );

        }

    }

}


// ===============================
// TEST AI
// ===============================

app.get("/test-ai", async (req, res) => {

    try {

        const response =
            await generateAI(
                "Give me one short personal finance tip."
            );


        res.json({

            answer: response.text

        });

    }

    catch (error) {

        console.error(
            "TEST AI ERROR:"
        );

        console.error(error);


        res.status(500).json({

            error: error.message

        });

    }

});


// ===============================
// FINANCIAL ANALYSIS
// ===============================

app.post("/analyze", async (req, res) => {


    // Check login

    if (!req.session.loggedIn) {

        return res.status(401).json({

            error:
                "Please login first."

        });

    }


    try {


        console.log(
            "Received financial data:"
        );

        console.log(req.body);


        const data = req.body;


        // ===============================
        // AI PROMPT
        // ===============================

        const prompt = `

You are an AI personal finance advisor.

Analyze the following monthly financial information.

MONTHLY INCOME:
₹${data.income}

MONTHLY EXPENSES:

Rent:
₹${data.rent}

Food:
₹${data.food}

Transport:
₹${data.transport}

Bills:
₹${data.bills}

Entertainment:
₹${data.entertainment}

Other:
₹${data.other}


CURRENT SAVINGS:
₹${data.savings}


FINANCIAL GOAL:
${data.goal}


GOAL AMOUNT:
₹${data.goalAmount}


TARGET TIME:
${data.targetMonths} months


CALCULATED VALUES:

Total Expenses:
₹${data.totalExpenses}

Remaining Income:
₹${data.remaining}

Savings Rate:
${Number(data.savingsRate).toFixed(2)}%

Required Monthly Saving For Goal:
₹${Number(data.monthlyGoalSaving).toFixed(2)}


Give a clear and practical analysis.

Use these sections:

1. Financial Summary

2. Spending Analysis

3. Savings Analysis

4. Goal Analysis

5. Three Practical Recommendations

6. One Risk To Watch


Keep the language simple enough for a college student.

Do not recommend specific stocks,
cryptocurrencies, or financial products.

This is educational financial guidance,
not professional financial advice.

`;


        console.log(
            "Sending data to Gemini..."
        );


        // ===============================
        // CALL GEMINI
        // ===============================

        const response =
            await generateAI(prompt);


        console.log(
            "Gemini response received."
        );


        // ===============================
        // SEND RESPONSE
        // ===============================

        res.json({

            advice:
                response.text

        });


    }

    catch (error) {


        console.error(
            "ANALYSIS ERROR:"
        );

        console.error(error);


        res.status(500).json({

            error:
                error.message

        });

    }

});


// ===============================
// START SERVER
// ===============================

app.listen(
    3000,
    () => {

        console.log(
            "Financial Advisor running at http://localhost:3000"
        );

    }
);