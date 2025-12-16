// api/slack-commands.js

// Helper: normalize Slack's POST body into a plain object
function parseSlackBody(req) {
  if (typeof req.body === "string") {
    const params = new URLSearchParams(req.body);
    return Object.fromEntries(params);
  }

  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const raw = req.body ? req.body.toString() : "";
  const params = new URLSearchParams(raw);
  return Object.fromEntries(params);
}

export default async function handler(req, res) {
  // Health check / browser test
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  const body = parseSlackBody(req);
  const command = body.command;
  const text = body.text || "";
  const user = body.user_name || "there";

  if (command !== "/boolean") {
    return res.status(200).json({
      response_type: "ephemeral",
      text: "Unknown command. This endpoint currently only handles `/boolean`."
    });
  }

  if (!text.trim()) {
    return res.status(200).json({
      response_type: "ephemeral",
      text:
        "Please describe the role, e.g.:\n" +
        "`/boolean Staff Platform Engineer for Clarify AI, platform+product blend, workflows/schedulers, avoid infra-first SRE profiles`"
    });
  }

  // 🔹 1) Try to load the OpenAI library dynamically
  let OpenAI;
  try {
    ({ default: OpenAI } = await import("openai"));
  } catch (err) {
    console.error("Failed to import openai:", err);
    return res.status(200).json({
      response_type: "ephemeral",
      text:
        "Server misconfigured: the `openai` library is not available. " +
        "Make sure `openai` is in package.json and Vercel deployed successfully."
    });
  }

  // 🔹 2) Check API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY environment variable");
    return res.status(200).json({
      response_type: "ephemeral",
      text:
        "Server misconfigured: OPENAI_API_KEY is not set in Vercel. " +
        "Add it under Project → Settings → Environment Variables."
    });
  }

  const openai = new OpenAI({ apiKey });

  // 🔹 3) Build the prompt and call OpenAI
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

    const reply = completion.choices?.[0]?.message?.content || "(no response)";

    return res.status(200).json({
      response_type: "ephemeral",
      text: `Hi ${user}, here are your Boolean suggestions:\n\n${reply}`
    });
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(200).json({
      response_type: "ephemeral",
      text:
        "Sorry, something went wrong talking to OpenAI. " +
        "Check the Vercel logs for details and verify your API key and model."
    });
  }
}
