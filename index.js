import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import OpenAI from "openai";

const app = express();
app.use(bodyParser.raw({ type: "*/*" })); // raw body for Slack signature verification

// Verify Slack signature
function verifySlackRequest(req, body) {
  const slackSignature = req.headers["x-slack-signature"];
  const slackTimestamp = req.headers["x-slack-request-timestamp"];
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;

  if (slackTimestamp < fiveMinutesAgo) return false;

  const sigBasestring = `v0:${slackTimestamp}:${body}`;
  const mySig =
    "v0=" +
    crypto
      .createHmac("sha256", process.env.SLACK_SIGNING_SECRET)
      .update(sigBasestring, "utf8")
      .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(mySig, "utf8"),
      Buffer.from(slackSignature, "utf8")
    );
  } catch (e) {
    return false;
  }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Single endpoint for Slack slash commands
app.post("/slack/commands", async (req, res) => {
  const rawBody = req.body.toString();

  if (!verifySlackRequest(req, rawBody)) {
    return res.status(400).send("Invalid signature");
  }

  const params = new URLSearchParams(rawBody);
  const command = params.get("command");
  const text = params.get("text") || "";

  if (command === "/boolean") {
    const prompt = `
You are a senior technical sourcer. Convert the user's role description into:
1) A LinkedIn Boolean search string
2) A GitHub Boolean search string
3) A Google X-Ray search string

Role details:
"${text}"
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "You help recruiters generate precise Boolean search strings."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3
      });

      const reply = completion.choices[0].message.content;

      return res.status(200).json({
        response_type: "ephemeral",
        text: reply
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        response_type: "ephemeral",
        text: "Error talking to OpenAI"
      });
    }
  }

  return res.status(200).json({
    response_type: "ephemeral",
    text: "Unknown command"
  });
});

// Root route just for sanity check
app.get("/", (_req, res) => {
  res.send("Ingenium Slack GPT bot is running.");
});

// IMPORTANT: Heroku gives us the port via env var
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
