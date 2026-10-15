// Tells the page whether live voice can work (a key is set on the server). Never returns the key itself.
export default function handler(req, res) {
  res.status(200).json({ voiceReady: Boolean(process.env.GEMINI_API_KEY) });
}
