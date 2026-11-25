require("dotenv").config();

const express = require("express");
const session = require("express-session");
const { GoogleGenAI } = require("@google/genai");
const path = require("path");
const db = require("./db");
const { createUser, authenticateUser, findUserByEmail } = require("./users");

const app = express();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json());

// ===============================
// SESSION CONFIGURATION
// ===============================
app.use(
    session({
        secret: "financial-advisor-secret-key-2026",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 // 24 hours
        }
    })
);

// ===============================
// STATIC FILES
// ===============================
app.use(
    express.static(path.join(__dirname, "public"), {
        index: false
    })
);

// Auth check middleware
function requireAuth(req, res, next) {
    if (!req.session.loggedIn) {
        return res.redirect("/");
    }
    next();
}

// API auth check middleware
function requireAuthApi(req, res, next) {
    if (!req.session.loggedIn) {
        return res.status(401).json({
            error: "Authentication required. Please log in first."
        });
    }
    next();
}

// Admin role check middleware (Page Redirect)
function requireAdmin(req, res, next) {
    if (!req.session.loggedIn) {
        return res.redirect("/");
    }
    if (req.session.role !== "admin") {
        return res.status(403).redirect("/advisor?auth_error=admin_required");
    }
    next();
}

// Admin role check middleware (API JSON Response)
function requireAdminApi(req, res, next) {
    if (!req.session.loggedIn) {
        return res.status(401).json({
            error: "Authentication required. Please log in first."
        });
    }
    if (req.session.role !== "admin") {
        return res.status(403).json({
            error: "Access denied. Administrator privileges required to access database endpoints."
        });
    }
    next();
}

// ===============================
// ROUTE: ROOT & LOGIN
// ===============================
app.get("/", (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect("/input.html");
    }
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: "Email and password are required."
        });
    }

    const user = authenticateUser(email, password);
    if (!user) {
        return res.status(401).json({
            error: "Invalid email or password. Please verify your credentials or create a new account."
        });
    }

    req.session.loggedIn = true;
    req.session.email = user.email;
    req.session.userName = user.name;
    req.session.role = user.role || "client";

    res.json({
        success: true,
        email: user.email,
        name: user.name,
        role: req.session.role
    });
});

app.post("/register", (req, res) => {
    const { name, email, password } = req.body;

    try {
        const newUser = createUser({ name, email, password });

        req.session.loggedIn = true;
        req.session.email = newUser.email;
        req.session.userName = newUser.name;
        req.session.role = "client";

        res.status(201).json({
            success: true,
            message: "Account created successfully!",
            email: newUser.email,
            name: newUser.name,
            role: "client"
        });
    } catch (err) {
        res.status(400).json({
            error: err.message || "Failed to create account."
        });
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

app.get("/api/me", (req, res) => {
    if (req.session.loggedIn) {
        res.json({
            loggedIn: true,
            email: req.session.email || "client@finadvisor.ai",
            name: req.session.userName || (req.session.email ? req.session.email.split("@")[0] : "Client"),
            role: req.session.role || "client"
        });
    } else {
        res.status(401).json({ loggedIn: false });
    }
});

// ===============================
// PROTECTED PAGE ROUTES
// ===============================
// Input page (the primary entry after login)
app.get("/advisor", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "input.html"));
});

app.get("/input.html", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "input.html"));
});

// Legacy index.html redirects to input.html
app.get("/index.html", requireAuth, (req, res) => {
    res.redirect("/input.html");
});

// Separate response/report page
app.get("/report.html", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "report.html"));
});

app.get("/report", requireAuth, (req, res) => {
    res.redirect("/report.html");
});

// Dedicated Investments & Profit Multiplier Hub (Separate folder)
app.get("/investments", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "investments", "index.html"));
});

app.get("/investments/index.html", requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "investments", "index.html"));
});

// Dedicated SQLite Database Explorer & Inspector (Admin Only)
app.get("/database", requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "database.html"));
});

app.get("/database.html", requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "database.html"));
});

// ===============================
// AI GENERATION WITH FAST FALLBACK
// ===============================
async function generateAIAnalysis(prompt) {
    const candidateModels = [
        {
            model: "gemini-3.5-flash-lite",
            config: {
                responseMimeType: "application/json",
                temperature: 0.2
            }
        },
        {
            model: "gemini-2.5-flash",
            config: {
                responseMimeType: "application/json",
                temperature: 0.2,
                thinkingConfig: { thinkingBudget: 0 }
            }
        },
        {
            model: "gemini-3.8-flash",
            config: {
                responseMimeType: "application/json",
                temperature: 0.2
            }
        }
    ];

    for (const item of candidateModels) {
        try {
            console.log(`Attempting analysis with model: ${item.model}...`);
            
            // 15 second timeout per attempt
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Timeout after 15s with model ${item.model}`)), 15000)
            );

            const aiPromise = ai.models.generateContent({
                model: item.model,
                contents: prompt,
                config: item.config
            });

            const response = await Promise.race([aiPromise, timeoutPromise]);

            if (response && response.text) {
                console.log(`Analysis successfully received from ${item.model}`);
                return response.text;
            }
        } catch (err) {
            console.warn(`Model ${item.model} failed or timed out:`, err.message);
        }
    }

    throw new Error("All AI models were unavailable or timed out.");
}

// ===============================
// FINANCIAL ANALYSIS ENDPOINT
// ===============================
app.post("/analyze", requireAuthApi, async (req, res) => {
    try {
        const body = req.body || {};

        const income = Math.max(0, Number(body.income) || 0);
        const rent = Math.max(0, Number(body.rent) || 0);
        const food = Math.max(0, Number(body.food) || 0);
        const transport = Math.max(0, Number(body.transport) || 0);
        const bills = Math.max(0, Number(body.bills) || 0);
        const entertainment = Math.max(0, Number(body.entertainment) || 0);
        const other = Math.max(0, Number(body.other) || 0);
        const savings = Math.max(0, Number(body.savings) || 0);
        const goal = (body.goal || "General Financial Security").trim();
        const goalAmount = Math.max(0, Number(body.goalAmount) || 0);
        const targetMonths = Math.max(1, Number(body.targetMonths) || 12);

        if (income <= 0) {
            return res.status(400).json({
                error: "Please specify a monthly income greater than 0."
            });
        }

        // Mathematical diagnostics
        const totalExpenses = rent + food + transport + bills + entertainment + other;
        const remaining = income - totalExpenses;
        const savingsRate = Number(((remaining / income) * 100).toFixed(1));
        const expenseRate = Number(((totalExpenses / income) * 100).toFixed(1));

        // 50/30/20 breakdown
        const needsExpenses = rent + food + transport + bills;
        const wantsExpenses = entertainment + other;
        const needsPct = Number(((needsExpenses / income) * 100).toFixed(1));
        const wantsPct = Number(((wantsExpenses / income) * 100).toFixed(1));
        const surplusPct = Number(((remaining / income) * 100).toFixed(1));

        // Goal and Emergency Fund metrics
        const monthlyGoalSaving = goalAmount > 0 ? Number((goalAmount / targetMonths).toFixed(0)) : 0;
        const emergencyRunwayMonths = totalExpenses > 0 ? Number((savings / totalExpenses).toFixed(1)) : 0;

        const metrics = {
            income,
            rent,
            food,
            transport,
            bills,
            entertainment,
            other,
            savings,
            goal,
            goalAmount,
            targetMonths,
            totalExpenses,
            remaining,
            savingsRate,
            expenseRate,
            needsExpenses,
            wantsExpenses,
            needsPct,
            wantsPct,
            surplusPct,
            monthlyGoalSaving,
            emergencyRunwayMonths
        };

        // Construct high-precision Wealth Advisory Prompt
        const prompt = `
You are an elite Senior Wealth & Chartered Financial Planning Advisor.
Analyze the following client financial profile and deliver an authoritative, structured, and practical financial advisory report.

CLIENT FINANCIAL DOSSIER:
- Monthly Net Inflow (Income): ₹${income.toLocaleString("en-IN")}
- Essential Needs Expenses:
  * Rent / Housing: ₹${rent.toLocaleString("en-IN")}
  * Groceries & Food: ₹${food.toLocaleString("en-IN")}
  * Commute & Transport: ₹${transport.toLocaleString("en-IN")}
  * Utilities & Essential Bills: ₹${bills.toLocaleString("en-IN")}
  * Total Needs: ₹${needsExpenses.toLocaleString("en-IN")} (${needsPct}% of Income)
- Discretionary Wants Expenses:
  * Entertainment, Leisure & Dining: ₹${entertainment.toLocaleString("en-IN")}
  * Miscellaneous & Other: ₹${other.toLocaleString("en-IN")}
  * Total Wants: ₹${wantsExpenses.toLocaleString("en-IN")} (${wantsPct}% of Income)
- Total Outflow (Monthly Expenses): ₹${totalExpenses.toLocaleString("en-IN")} (${expenseRate}% of Income)
- Net Monthly Cashflow Surplus: ₹${remaining.toLocaleString("en-IN")} (${surplusPct}% of Income)
- Current Liquid Reserves / Savings: ₹${savings.toLocaleString("en-IN")}
- Emergency Fund Runway: ${emergencyRunwayMonths} months of basic expenses
- Target Financial Objective: "${goal}"
- Target Capital: ₹${goalAmount.toLocaleString("en-IN")}
- Target Horizon: ${targetMonths} months
- Required Monthly Allocation for Objective: ₹${monthlyGoalSaving.toLocaleString("en-IN")}

ADVISORY STANDARDS:
- Provide an objective, empowering, and actionable diagnosis.
- Tone: Executive wealth advisory, analytical, empathetic, and professional.
- Do NOT recommend specific speculative individual stocks, crypto, or registered investment schemes.
- Focus on cashflow allocation, capital preservation, expense optimization, runway adequacy, and milestone execution.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching the following structure exactly (without markdown backticks or commentary):
{
  "financialHealthScore": 80,
  "healthStatus": "Robust & Growth-Ready",
  "statusTone": "positive",
  "executiveSummary": "A concise, 2-3 sentence strategic executive assessment.",
  "rule50_30_20": {
    "needsPercentage": ${needsPct},
    "wantsPercentage": ${wantsPct},
    "savingsPercentage": ${surplusPct},
    "assessment": "Detailed evaluation contrasting client's actual allocation with the 50/30/20 standard benchmark."
  },
  "spendingDiagnostics": {
    "summary": "Detailed diagnosis of monthly cashflow trends and expense concentrations.",
    "topExpenseCategory": "Primary expense driver name and % of income",
    "leaksOrOpportunities": "Concrete areas where expense restructuring can immediately free up cashflow."
  },
  "goalRoadmap": {
    "feasibility": "Highly Achievable",
    "requiredMonthlySavings": ${monthlyGoalSaving},
    "projectedCompletionMonths": ${targetMonths},
    "feasibilityVerdict": "Clear quantitative analysis of whether ₹${monthlyGoalSaving.toLocaleString("en-IN")}/mo for '${goal}' is realistic with current surplus of ₹${remaining.toLocaleString("en-IN")}.",
    "milestones": [
      {
        "period": "Phase 1 (Months 1-2)",
        "targetAmount": "₹X",
        "focus": "Immediate structural foundation."
      },
      {
        "period": "Phase 2 (Mid-way)",
        "targetAmount": "₹Y",
        "focus": "Momentum and compounding."
      },
      {
        "period": "Final Phase",
        "targetAmount": "₹${goalAmount.toLocaleString("en-IN")}",
        "focus": "Target achievement and milestone review."
      }
    ]
  },
  "strategicRecommendations": [
    {
      "priority": "High",
      "timeframe": "Immediate (0-30 Days)",
      "title": "Actionable strategy title",
      "impact": "Estimated savings impact e.g., Unlocks ₹3,000/month",
      "details": "Specific, practical step-by-step guidance."
    },
    {
      "priority": "Medium",
      "timeframe": "Month 2-3",
      "title": "Actionable strategy title",
      "impact": "Estimated financial impact",
      "details": "Specific, practical step-by-step guidance."
    },
    {
      "priority": "Growth",
      "timeframe": "Ongoing",
      "title": "Actionable strategy title",
      "impact": "Long-term stability",
      "details": "Specific, practical step-by-step guidance."
    }
  ],
  "riskRadar": {
    "emergencyFundRunwayMonths": ${emergencyRunwayMonths},
    "emergencyFundVerdict": "Adequate",
    "primaryRisk": "The most significant financial risk or blindspot identified.",
    "protectiveMeasure": "Specific contingency protocol to shield client from this vulnerability."
  },
  "wealthAdvisorVerdict": "An inspiring, formal concluding message from the Senior Wealth Advisor."
}
`;

        let parsedAnalysis;
        try {
            const rawAiOutput = await generateAIAnalysis(prompt);
            const cleanedText = rawAiOutput.replace(/```json\s*/i, "").replace(/```\s*$/i, "").trim();
            parsedAnalysis = JSON.parse(cleanedText);
        } catch (aiErr) {
            console.warn("AI generation or parsing had an issue, synthesizing high-precision advisory model:", aiErr.message);
            const isSurplus = remaining > 0;
            const healthScore = Math.min(95, Math.max(35, Math.round(
                (isSurplus ? 50 : 20) + 
                (savingsRate >= 20 ? 25 : Math.max(0, savingsRate) * 1.25) + 
                (emergencyRunwayMonths >= 3 ? 20 : emergencyRunwayMonths * 6)
            )));

            parsedAnalysis = {
                financialHealthScore: healthScore,
                healthStatus: healthScore >= 75 ? "Robust & Growth-Ready" : healthScore >= 55 ? "Stable with Optimization Opportunities" : "Cashflow Deficit Alert",
                statusTone: healthScore >= 70 ? "positive" : healthScore >= 50 ? "warning" : "danger",
                executiveSummary: `Your financial profile exhibits an inflow of ₹${income.toLocaleString("en-IN")} against monthly commitments of ₹${totalExpenses.toLocaleString("en-IN")}, leaving a net monthly ${isSurplus ? 'surplus' : 'deficit'} of ₹${Math.abs(remaining).toLocaleString("en-IN")}. Capital allocation should focus on liquid resilience and milestone discipline for '${goal}'.`,
                rule50_30_20: {
                    needsPercentage: needsPct,
                    wantsPercentage: wantsPct,
                    savingsPercentage: surplusPct,
                    assessment: `Your essential living needs consume ${needsPct}% of income (ideal: 50%), discretionary wants account for ${wantsPct}% (ideal: 30%), and your net savings potential is ${surplusPct}% (ideal: ≥20%).`
                },
                spendingDiagnostics: {
                    summary: `Total monthly commitments amount to ₹${totalExpenses.toLocaleString("en-IN")} (${expenseRate}% of net earnings).`,
                    topExpenseCategory: rent >= food ? "Housing & Rent" : "Food & Groceries",
                    leaksOrOpportunities: "Audit non-essential subscriptions and optimize discretionary lifestyle spending to unlock an additional 5-10% monthly savings buffer."
                },
                goalRoadmap: {
                    feasibility: remaining >= monthlyGoalSaving ? "Highly Achievable" : remaining > 0 ? "Requires Timeline Adjustment" : "Challenging",
                    requiredMonthlySavings: monthlyGoalSaving,
                    projectedCompletionMonths: targetMonths,
                    feasibilityVerdict: `Your target '${goal}' requires ₹${monthlyGoalSaving.toLocaleString("en-IN")}/month. With your current monthly surplus of ₹${remaining.toLocaleString("en-IN")}, ${remaining >= monthlyGoalSaving ? 'you are well-positioned to hit this target within ' + targetMonths + ' months.' : 'adjusting your target timeframe will ensure sustainable capital accumulation without straining day-to-day liquidity.'}`,
                    milestones: [
                        { period: "Phase 1 (Month 1)", targetAmount: `₹${Math.round(goalAmount * 0.33).toLocaleString("en-IN")}`, focus: "Automate dedicated monthly transfer on salary credit." },
                        { period: "Phase 2 (Mid-way)", targetAmount: `₹${Math.round(goalAmount * 0.66).toLocaleString("en-IN")}`, focus: "Review progress and lock in surplus capital." },
                        { period: "Target Phase", targetAmount: `₹${goalAmount.toLocaleString("en-IN")}`, focus: "Milestone objective fulfilled." }
                    ]
                },
                strategicRecommendations: [
                    {
                        priority: "High",
                        timeframe: "Immediate (0-30 Days)",
                        title: "Automate Target Goal Accumulation",
                        impact: `Safeguards ₹${Math.min(remaining > 0 ? remaining : 0, monthlyGoalSaving).toLocaleString("en-IN")}/mo`,
                        details: "Establish an automated standing instruction on your primary bank account to direct savings surplus immediately upon salary credit."
                    },
                    {
                        priority: "Medium",
                        timeframe: "Month 2-3",
                        title: "Strengthen Liquid Emergency Buffer",
                        impact: "Target 3-6 months runway",
                        details: `Your current liquid reserves cover ${emergencyRunwayMonths} months of basic living costs. Direct initial excess cash into high-yield liquid instruments.`
                    },
                    {
                        priority: "Growth",
                        timeframe: "Ongoing",
                        title: "Deploy Unallocated Cash into Compounding Assets",
                        impact: "12-14% compounding growth",
                        details: "Once emergency cushions are secured, deploy recurring monthly surplus into broad-market index vehicles."
                    }
                ],
                riskRadar: {
                    emergencyFundRunwayMonths: emergencyRunwayMonths,
                    emergencyFundVerdict: emergencyRunwayMonths >= 3 ? "Adequate" : "Low",
                    primaryRisk: emergencyRunwayMonths < 3 ? "Concentration of fixed expenses with limited emergency cushion for unplanned shocks." : "Market volatility risk on liquid capital.",
                    protectiveMeasure: "Maintain liquid shock-absorbers in arbitrage or flexi-deposits before aggressive capital lock-in."
                },
                wealthAdvisorVerdict: "Consistent, automated micro-disciplines compound into undeniable long-term financial independence."
            };
        }

        // Store latest assessment in user session for persistence across page refreshes
        req.session.latestAssessment = {
            analysis: parsedAnalysis,
            metrics: metrics,
            generatedAt: new Date().toISOString(),
            userEmail: req.session.email || "client@finadvisor.ai"
        };

        // Persist assessment into SQLite database
        try {
            db.saveAssessment({
                userEmail: req.session.email || "client@finadvisor.ai",
                metrics: metrics,
                analysis: parsedAnalysis
            });
        } catch (dbErr) {
            console.warn("Notice: could not save assessment to SQLite:", dbErr.message);
        }

        res.json({
            success: true,
            analysis: parsedAnalysis,
            metrics: metrics,
            client: req.session.email || "client@finadvisor.ai"
        });

    } catch (error) {
        console.error("ANALYSIS SERVER ERROR:", error);
        res.status(500).json({
            error: error.message || "Failed to process financial analysis."
        });
    }
});

// ===============================
// GET LATEST REPORT (SESSION API)
// ===============================
app.get("/api/latest-analysis", requireAuthApi, (req, res) => {
    if (req.session.latestAssessment) {
        return res.json({
            success: true,
            data: req.session.latestAssessment
        });
    }
    res.status(404).json({
        success: false,
        error: "No analysis has been generated yet for this session."
    });
});

// ===============================
// AI COPILOT INTERACTIVE CHAT API
// ===============================
app.post("/api/copilot", requireAuthApi, async (req, res) => {
    try {
        const { message, history } = req.body || {};
        if (!message || !message.trim()) {
            return res.status(400).json({ error: "Message is required." });
        }

        const assessment = req.session.latestAssessment || {};
        const metrics = assessment.metrics || {
            income: 75000,
            rent: 20000,
            food: 10000,
            transport: 5000,
            bills: 4000,
            entertainment: 6000,
            other: 3000,
            savings: 150000,
            remaining: 27000,
            surplusPct: 36,
            emergencyRunwayMonths: 3.1,
            goal: "Financial Independence",
            goalAmount: 500000,
            targetMonths: 24
        };

        const prompt = `
You are FinAdvisor AI Copilot, an elite chartered wealth manager and principal fintech advisor embedded directly inside the client's executive dashboard.
The user is asking you a question about their finances.

CLIENT FINANCIAL DOSSIER:
- Monthly Income: ₹${metrics.income ? Number(metrics.income).toLocaleString("en-IN") : "75,000"}
- Total Monthly Expenses: ₹${metrics.totalExpenses ? Number(metrics.totalExpenses).toLocaleString("en-IN") : "48,000"}
  * Housing/Rent: ₹${Number(metrics.rent || 0).toLocaleString("en-IN")}
  * Food/Groceries: ₹${Number(metrics.food || 0).toLocaleString("en-IN")}
  * Transit: ₹${Number(metrics.transport || 0).toLocaleString("en-IN")}
  * Bills/Utilities: ₹${Number(metrics.bills || 0).toLocaleString("en-IN")}
  * Leisure/Wants: ₹${Number(metrics.entertainment || 0).toLocaleString("en-IN")}
  * Other: ₹${Number(metrics.other || 0).toLocaleString("en-IN")}
- Net Monthly Surplus: ₹${Number(metrics.remaining || 0).toLocaleString("en-IN")} (${metrics.surplusPct || 0}% of income)
- Liquid Reserves / Savings: ₹${Number(metrics.savings || 0).toLocaleString("en-IN")}
- Emergency Buffer Runway: ${metrics.emergencyRunwayMonths || 3.0} months
- Current Financial Goal: "${metrics.goal || "Wealth Accumulation"}" (Target: ₹${Number(metrics.goalAmount || 0).toLocaleString("en-IN")} in ${metrics.targetMonths || 12} months)

CLIENT QUESTION:
"${message}"

INSTRUCTIONS:
1. Provide a direct, authoritative, and practical answer referencing their specific numbers where relevant.
2. Format cleanly with markdown: use bold text for key figures, concise bullet points for action items.
3. Keep it punchy (around 120-180 words max), clear, and professional.
4. Do NOT give speculative stock tips or legal disclaimers. Focus on strategic capital allocation, cashflow optimization, and compounding.
`;

        try {
            const candidateModels = [
                { model: "gemini-3.5-flash-lite", config: { temperature: 0.3 } },
                { model: "gemini-2.5-flash", config: { temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } } }
            ];

            let aiReply = null;
            for (const item of candidateModels) {
                try {
                    const aiPromise = ai.models.generateContent({
                        model: item.model,
                        contents: prompt,
                        config: item.config
                    });
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("Timeout after 10s")), 10000)
                    );
                    const response = await Promise.race([aiPromise, timeoutPromise]);
                    if (response && response.text) {
                        aiReply = response.text;
                        break;
                    }
                } catch (e) {
                    console.warn(`Copilot model ${item.model} failed:`, e.message);
                }
            }

            if (aiReply) {
                return res.json({ success: true, reply: aiReply });
            }
        } catch (apiErr) {
            console.warn("Copilot Gemini API error:", apiErr.message);
        }

        // High-precision algorithmic contextual fallback
        const lower = message.toLowerCase();
        let fallbackReply = "";
        const surplus = Number(metrics.remaining || 25000);
        const savings = Number(metrics.savings || 100000);
        const runway = Number(metrics.emergencyRunwayMonths || 3.0);

        if (lower.includes("invest") || lower.includes("surplus") || lower.includes("where")) {
            fallbackReply = `With your current monthly surplus of **₹${surplus.toLocaleString("en-IN")}**, here is the optimal 3-tier wealth deployment blueprint:\n\n` +
                `1. **Core Index SIP (50% • ₹${Math.round(surplus * 0.5).toLocaleString("en-IN")}/mo):** Direct into low-cost broad index funds (Nifty 50 / S&P 500) for consistent 12-14% compounding.\n` +
                `2. **Passive Yield & Real Estate (25% • ₹${Math.round(surplus * 0.25).toLocaleString("en-IN")}/mo):** Allocate to REITs and Sovereign Gold Bonds (SGB) for dividend flow and inflation hedging.\n` +
                `3. **Liquid Buffer Accelerator (25% • ₹${Math.round(surplus * 0.25).toLocaleString("en-IN")}/mo):** Channel into flexi-deposits until your emergency runway covers 6 full months.`;
        } else if (lower.includes("expense") || lower.includes("cut") || lower.includes("save") || lower.includes("reduc")) {
            fallbackReply = `Auditing your current monthly outflow of **₹${Number(metrics.totalExpenses || 48000).toLocaleString("en-IN")}** reveals two key restructuring levers:\n\n` +
                `* **Discretionary Optimization:** Lifestyle dining & leisure currently takes **₹${Number(metrics.entertainment || 6000).toLocaleString("en-IN")}**. Trimming this by 20% immediately frees up **₹${Math.round(Number(metrics.entertainment || 6000) * 0.2).toLocaleString("en-IN")}/month**.\n` +
                `* **Utility & Subscription Audit:** Bundle recurring mobile/internet and cancel redundant streaming tiers to unlock an estimated **₹1,000 - ₹2,000/month**.\n` +
                `Redirecting these gains straight into your primary goal accelerates completion by up to 2.5 months!`;
        } else if (lower.includes("emergency") || lower.includes("runway") || lower.includes("safe")) {
            fallbackReply = `Your emergency runway currently stands at **${runway} months** of essential baseline commitments (Reserve: **₹${savings.toLocaleString("en-IN")}**).\n\n` +
                `* **Verdict:** ${runway >= 3 ? "Your emergency cushion meets institutional baseline standards (≥3 months)." : "Your liquid cushion is under the ideal 3-month threshold."}\n` +
                `* **Next Step:** Maintain this reserve in high-yield auto-sweep fixed deposits or liquid arbitrage funds so you earn ~7% yield while retaining instantaneous T+0 liquidity.`;
        } else {
            fallbackReply = `Based on your balance sheet featuring **₹${Number(metrics.income).toLocaleString("en-IN")}** monthly inflow and **₹${surplus.toLocaleString("en-IN")}** recurring surplus:\n\n` +
                `* **Capital Efficiency:** You are saving at a healthy **${metrics.surplusPct || 35}% rate**, comfortably beating the 50/30/20 rule (20% standard).\n` +
                `* **Goal Traction:** For your target **'${metrics.goal}'**, automate an SIP on salary credit day to eliminate behavioral friction.\n` +
                `* **Compounding Advantage:** Staying invested over a 5-year horizon at 12% CAGR can multiply this surplus into **₹${Math.round(surplus * 82).toLocaleString("en-IN")}** in accumulated wealth!`;
        }

        res.json({
            success: true,
            reply: fallbackReply
        });

    } catch (err) {
        console.error("Copilot Error:", err);
        res.status(500).json({ error: "Failed to generate AI Copilot response." });
    }
});

// ===============================
// INVESTMENT STRATEGY ENDPOINT (AI WEALTH DEPLOYMENT)
// ===============================
app.post("/api/investment-strategy", requireAuthApi, async (req, res) => {
    try {
        const body = req.body || {};
        const monthlySurplus = Math.max(0, Number(body.monthlySurplus) || 0);
        const currentSavings = Math.max(0, Number(body.currentSavings) || 0);
        const riskTolerance = (body.riskTolerance || "Balanced").trim();
        const horizonYears = Math.max(1, Number(body.horizonYears) || 5);
        const goal = (body.goal || "Wealth Accumulation & Financial Freedom").trim();

        const prompt = `
You are a Senior Portfolio Manager and Alternative Investments Strategist.
Formulate an actionable, high-yielding, and diversified wealth deployment strategy for this client profile:

CLIENT PROFILE:
- Available Monthly Inflow for Deployment: ₹${monthlySurplus.toLocaleString("en-IN")}
- Lump-sum Capital Available in Reserves: ₹${currentSavings.toLocaleString("en-IN")}
- Target Horizon: ${horizonYears} years
- Risk Tolerance Profile: "${riskTolerance}"
- Primary Ambition: "${goal}"

ALLOCATION FRAMEWORK:
Design a 4-Tier Strategic Capital Allocation covering both conventional assets and alternative high-yield avenues:
- Tier 1: Emergency & Capital Preservation (Flexi-FDs, Arbitrage, Liquid Funds)
- Tier 2: Core Compounding Wealth Engine (Broad Index, Flexi-Cap Equities, S&P 500)
- Tier 3: Passive Yield & Inflation Hedging (Real Estate Investment Trusts - REITs, Sovereign Gold Bonds - SGBs)
- Tier 4: Alternative High-Alpha Vehicles (Strategic Sectoral Growth, Small-Cap, Senior Secured Debt)

OUTPUT SPECIFICATION:
Return ONLY valid JSON matching this exact structure:
{
  "portfolioName": "Strategic Growth & Yield Blueprint",
  "expectedCagr": "12.0% - 14.5%",
  "riskTier": "${riskTolerance}",
  "executiveRationale": "Strategic summary of how this deployment model maximizes profit while protecting against drawdowns.",
  "tierAllocations": [
    {
      "tier": "Tier 1: Liquidity & Capital Preservation",
      "percentage": 20,
      "monthlyAmount": ${Math.round(monthlySurplus * 0.20)},
      "lumpSumAmount": ${Math.round(currentSavings * 0.40)},
      "recommendedInstruments": ["Liquid Mutual Funds", "High-Yield Flexi FDs", "Arbitrage Funds"],
      "expectedYield": "6.8% - 7.4%",
      "strategicRole": "Emergency shock-absorber and dry powder for market dips."
    },
    {
      "tier": "Tier 2: Core Compounding Wealth Engine",
      "percentage": 45,
      "monthlyAmount": ${Math.round(monthlySurplus * 0.45)},
      "lumpSumAmount": ${Math.round(currentSavings * 0.40)},
      "recommendedInstruments": ["Nifty 50 Index Fund", "Nifty Next 50", "Parag Parikh Flexi Cap"],
      "expectedYield": "12.0% - 14.0%",
      "strategicRole": "Primary engine for beating inflation and multiplying net worth."
    },
    {
      "tier": "Tier 3: Passive Yield & Inflation Hedging",
      "percentage": 20,
      "monthlyAmount": ${Math.round(monthlySurplus * 0.20)},
      "lumpSumAmount": ${Math.round(currentSavings * 0.15)},
      "recommendedInstruments": ["REITs (Embassy / Nexus Select)", "RBI Sovereign Gold Bonds (SGB)", "Infrastructure InvITs"],
      "expectedYield": "7.5% - 9.5% + Capital Growth",
      "strategicRole": "Generates quarterly dividend payouts and sovereign gold appreciation."
    },
    {
      "tier": "Tier 4: Alternative High-Alpha Growth",
      "percentage": 15,
      "monthlyAmount": ${Math.round(monthlySurplus * 0.15)},
      "lumpSumAmount": ${Math.round(currentSavings * 0.05)},
      "recommendedInstruments": ["Small-Cap Quality Funds", "Thematic Clean Energy / Tech ETFs", "Senior Secured Debt Bonds"],
      "expectedYield": "14.0% - 17.0%",
      "strategicRole": "High-profit multiplier with controlled downside allocation."
    }
  ],
  "profitMaximizationTactics": [
    "Reinvest all quarterly REIT dividend distributions directly into your equity SIP for compounding velocity.",
    "Implement an annual 10% Step-Up SIP whenever annual income increases.",
    "Use Sovereign Gold Bonds to hedge rupee currency depreciation without physical locker expenses."
  ],
  "wealthMilestoneProjection": "Projected trajectory over ${horizonYears} years combining lump-sum deployment and recurring monthly allocations."
}
`;

        const rawOutput = await generateAIAnalysis(prompt);
        const cleanedText = rawOutput.replace(/```json\s*/i, "").replace(/```\s*$/i, "").trim();
        const parsedStrategy = JSON.parse(cleanedText);

        res.json({
            success: true,
            strategy: parsedStrategy
        });
    } catch (err) {
        console.error("Investment strategy API error:", err);
        res.status(500).json({
            error: err.message || "Failed to generate investment strategy."
        });
    }
});

// ===============================
// DATABASE EXPLORER API (ADMIN PRIVILEGED)
// ===============================
app.get("/api/database/stats", requireAdminApi, (req, res) => {
    try {
        const stats = db.getDatabaseStats();
        res.json({ success: true, stats });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/database/table/:tableName", requireAdminApi, (req, res) => {
    try {
        const { tableName } = req.params;
        let rows = [];
        if (tableName === "users") {
            rows = db.getAllUsers(true);
        } else if (tableName === "assessments") {
            rows = db.getAllAssessments(100);
        } else if (tableName === "activity_logs") {
            rows = db.getActivityLogs(100);
        } else {
            return res.status(404).json({ error: "Table not found." });
        }
        res.json({
            success: true,
            table: tableName,
            columns: rows.length > 0 ? Object.keys(rows[0]) : [],
            rowCount: rows.length,
            rows
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/database/query", requireAdminApi, (req, res) => {
    try {
        const { query } = req.body;
        const result = db.executeSafeQuery(query);
        db.logActivity(req.session.email, "ADMIN_SQL_QUERY", (query || "").substring(0, 80));
        res.json({ success: true, ...result });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.get("/api/database/download", requireAdmin, (req, res) => {
    res.download(db.DB_PATH, "financial_advisor.db");
});

// ===============================
// TEST ENDPOINT
// ===============================
app.get("/test-ai", async (req, res) => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Give me one short personal finance rule in 20 words."
        });
        res.json({ answer: response.text });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===============================
// START SERVER (OR EXPORT FOR VERCEL)
// ===============================
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Financial Advisor running at http://localhost:${PORT}`);
    });
}

module.exports = app;