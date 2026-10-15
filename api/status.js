// Tells the page whether live voice can work (a key is set on the server) and whether the microphone
// needs a passcode (set MIC_PASSCODE on the hosted version). Never returns the key or the passcode.
export default function handler(req, res) {
  res.status(200).json({ voiceReady: Boolean(process.env.GEMINI_API_KEY), passcodeRequired: Boolean(process.env.MIC_PASSCODE) });
}
