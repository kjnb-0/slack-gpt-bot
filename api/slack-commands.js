// api/slack-commands.js

export default async function handler(req, res) {
  // Always respond 200 OK no matter what Slack sends
  return res.status(200).send("OK");
}
