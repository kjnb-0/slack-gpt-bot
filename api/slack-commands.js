// api/slack-commands.js

export default async function handler(req, res) {
  // Let Slack "see" that the endpoint is alive
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  let body = req.body;

  // Handle both cases: Vercel may give body as string or as object
  if (typeof body === "string") {
    const params = new URLSearchParams(body);
    body = Object.fromEntries(params);
  }

  const { command, text, user_name } = body || {};

  const replyLines = [
    `Command: ${command || "(none)"}`,
    `User: ${user_name || "(unknown)"}`,
    `Text: ${text || "(empty)"}`
  ];

  return res.status(200).json({
    response_type: "ephemeral",
    text: replyLines.join("\n")
  });
}
