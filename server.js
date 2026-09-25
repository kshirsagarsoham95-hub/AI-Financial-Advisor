require("dotenv").config();

const express = require("express");
const session = require("express-session");
const { GoogleGenAI } = require("@google/genai");
const path = require("path");

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

    // Demo authentication: Accept credentials and store session
    req.session.loggedIn = true;
    req.session.email = email;

    res.json({
        success: true,
        email: email
    });
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
            email: req.session.email || "client@finadvisor.ai"
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

// ===============================
// AI GENERATION WITH FALLBACK
// ===============================
async function generateAIAnalysis(prompt) {
    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

    for (const model of candidateModels) {
        try {
            console.log(`Attempting analysis with model: ${model}...`);
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    temperature: 0.2
                }
            });

            if (response && response.text) {
                return response.text;
            }
        } catch (err) {
            console.warn(`Model ${model} failed:`, err.message);
        }
    }

    throw new Error("Unable to contact Gemini AI services at this moment. Please try again shortly.");
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

        const rawAiOutput = await generateAIAnalysis(prompt);

        let parsedAnalysis;
        try {
            // Remove markdown code fences if Gemini included them
            const cleanedText = rawAiOutput.replace(/```json\s*/i, "").replace(/```\s*$/i, "").trim();
            parsedAnalysis = JSON.parse(cleanedText);
        } catch (parseErr) {
            console.error("Failed to parse Gemini JSON:", parseErr);
            // Fallback object so the client UI always renders cleanly
            parsedAnalysis = {
                financialHealthScore: remaining >= 0 ? 70 : 45,
                healthStatus: remaining >= 0 ? "Financially Stable" : "Cashflow Deficit Alert",
                statusTone: remaining >= 0 ? "positive" : "danger",
                executiveSummary: rawAiOutput.slice(0, 300),
                rule50_30_20: {
                    needsPercentage: needsPct,
                    wantsPercentage: wantsPct,
                    savingsPercentage: surplusPct,
                    assessment: "Review your needs and wants allocation against the 50/30/20 standard."
                },
                spendingDiagnostics: {
                    summary: "Monthly expenses total ₹" + totalExpenses.toLocaleString("en-IN") + ".",
                    topExpenseCategory: "Living Expenses",
                    leaksOrOpportunities: "Focus on curbing discretionary spending."
                },
                goalRoadmap: {
                    feasibility: remaining >= monthlyGoalSaving ? "Achievable" : "Requires Adjustments",
                    requiredMonthlySavings: monthlyGoalSaving,
                    projectedCompletionMonths: targetMonths,
                    feasibilityVerdict: `Saving ₹${monthlyGoalSaving.toLocaleString("en-IN")}/mo is ${remaining >= monthlyGoalSaving ? "within" : "above"} your current surplus of ₹${remaining.toLocaleString("en-IN")}.`,
                    milestones: []
                },
                strategicRecommendations: [
                    {
                        priority: "High",
                        timeframe: "Immediate",
                        title: "Optimize Monthly Surplus",
                        impact: "Enhances cash buffer",
                        details: "Audit discretionary outflows and direct savings toward your target goal."
                    }
                ],
                riskRadar: {
                    emergencyFundRunwayMonths: emergencyRunwayMonths,
                    emergencyFundVerdict: emergencyRunwayMonths >= 3 ? "Adequate" : "Low",
                    primaryRisk: "Insufficient emergency buffer for unplanned shocks.",
                    protectiveMeasure: "Build a 3-to-6 month living expense reserve."
                },
                wealthAdvisorVerdict: "Consistent habits create long-term financial freedom."
            };
        }

        // Store latest assessment in user session for persistence across page refreshes
        req.session.latestAssessment = {
            analysis: parsedAnalysis,
            metrics: metrics,
            generatedAt: new Date().toISOString(),
            userEmail: req.session.email || "client@finadvisor.ai"
        };

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
// START SERVER
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Financial Advisor running at http://localhost:${PORT}`);
});