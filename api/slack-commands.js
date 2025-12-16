// api/slack-commands.js
import OpenAI from "openai";

// OpenAI client using your Vercel env var
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper: normalize Slack's POST body into a plain object
function parseSlackBody(req) {
  // Vercel may give us a string or already-parsed object
  if (typeof req.body === "string") {
    const params = new URLSearchParams(req.body);
    return Object.fromEntries(params);
  }

  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  // Fallback: try to parse as URL-encoded from buffer
  const raw = req.body ? req.body.toString() : "";
  const params = new URLSearchParams(raw);
  return Object.fromEntries(params);
}

export default async function handler(req, res) {
  // Simple check for browser / health
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  const body = parseSlackBody(req);
  const command = body.command;
  const text = body.text || "";
  const user = body.user_name || "there";

  // Only handle /boolean for now
  if (command !== "/boolean") {
    return res.status(200).json({
      response_type: "ephemeral",
      text: "Unknown command. This endpoint currently only handles `/boolean`."
    });
  }

  // If they didn’t pass any text, nudge them
  if (!text.trim()) {
    return res.status(200).json({
      response_type: "ephemeral",
      text:
        "Please describe the role, e.g.:\n" +
        "`/boolean Staff Platform Engineer for Clarify AI, platform+product blend, workflows/schedulers, avoid infra-first SRE profiles`"
    });
  }

  // Prompt we send to GPT
  const prompt = `
You are a senior technical sourcer at a boutique search firm (Ingenium Search).
Convert the user's role description into clear, usable Boolean search strings for sourcing technical candidates.

Return the result in exactly this format:

LinkedIn:
<LinkedIn Boolean string>

GitHub:
<GitHub Boolean string>

Google X-Ray:
<Google X-Ray Boolean string>

Role details:
"${text}"
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You help recruiters generate high-quality Boolean search strings for sourcing software engineers and platform/AI talent. " +
            "Be concise but precise, using AND/OR/NOT and parentheses correctly."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3
    });

    const reply = completion.choices[0].message.content || "";

    return res.status(200).json({
      response_type: "ephemeral", // only the user sees this
      text: `Hi ${user}, here are your Boolean suggestions:\n\n${reply}`
    });
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(200).json({
      response_type: "ephemeral",
      text:
        "Sorry, something went wrong talking to OpenAI. " +
        "Double-check that OPENAI_API_KEY is set correctly in Vercel."
    });
  }
}
