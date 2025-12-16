// api/slack-commands.js
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper: normalize Slack's body into a plain object
function parseSlackBody(req) {
  // Vercel might give us a string or an object
  if (typeof req.body === "string") {
    const params = new URLSearchParams(req.body);
    return Object.fromEntries(params);
  }

  // If it's already an object with text/command, just use it
  if (req.body && typeof req.body === "object" && "text" in req.body) {
    return req.body;
  }

  // Fallback: try to stringify and parse as URL-encoded
  const raw = req.body ? req.body.toString() : "";
  const params = new URLSearchParams(raw);
  return Object.fromEntries(params);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    // For browser sanity checks
    return res.status(200).send("OK");
  }

  const body = parseSlackBody(req);
  const command = body.command;
  const text = body.text || "";
  const user = body.user_name || "unknown";

  // Only handle /boolean for now
  if (command === "/boolean") {
    // If user didn’t type anything, give a friendly hint
    if (!text.trim()) {
      return res.status(200).json({
        response_type: "ephemeral",
        text: "Please describe the role, e.g.\n`/boolean Staff Platform Engineer for Clarify AI, platform+product blend...`"
      });
    }

    const prompt = `
You are a senior technical sourcer working for a boutique search firm.
Convert the user's role description into clear, usable Boolean search strings.

Return the result in this format:

LinkedIn:
<LinkedIn Boolean string>

GitHub:
<GitHub Boolean string>

Google X-Ray:
<Google X-Ray string>

Role details:
"${text}"
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "You help recruiters generate high-quality Boolean search strings for sourcing technical candidates."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3
      });

      const reply = completion.choices[0].message.content;

      return res.status(200).json({
        response_type: "ephemeral", // only the u_
