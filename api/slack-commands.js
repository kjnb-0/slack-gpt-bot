// api/slack-commands.js

function parseSlackBody(req) {
  // Vercel may give us string or object
  if (typeof req.body === "string") {
    const params = new URLSearchParams(req.body);
    return Object.fromEntries(params);
  }

  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  return {};
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  let body;
  try {
    body = parseSlackBody(req);
  } catch (e) {
    console.error("Body parse error:", e);
    return res.status(200).json({
      response_type: "ephemeral",
      text: "Body parse error on server."
    });
  }

  const command = body.command || "(no command)";
  const text = body.text || "(no text)";
  const user = body.user_name || "(no user)";

  const reply = [
    `Command: ${command}`,
    `User: ${user}`,
    `Text: ${text}`
  ].join("\n");

  return res.status(200).json({
    response_type: "ephemeral",
    text: reply
  });
}
