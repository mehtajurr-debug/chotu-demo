# Chotu: 3-minute demo script

## Online version (to share)
- Link: **https://chotu-demo.vercel.app**. It works on any computer or phone, even when your laptop is off.
- Everything works without signing in, including the live microphone (in Chrome, allow the microphone when asked).
- The microphone uses your free Gemini allowance, so if many people try it on one day it can run out; the chips always keep working. A passcode can be switched back on by adding `MIC_PASSCODE` in the Vercel project settings and republishing.
- Each visitor gets their own copy of the demo in their own browser; **Reset demo** starts it fresh.
- After changes on your laptop, the online version is updated with: `npx.cmd vercel deploy --prod` (Claude can run it for you).

## Practising every workflow
Open **Demo settings** (top right) → **Rehearsal workflows**: 17 workflows (setup, reminders, safety, health check-in, privacy, dashboard, summary, live voice). Pick one, click **Start this workflow** (it sets the clock, elder and caregiver for you) and tick the steps as you go. **Next workflow** moves on. Use it to rehearse; on stage, follow the script below.

## How the screen works
- The header switches between **বাবার ফোন**, **শুমনের ফোন** and **দুটোই** (both side by side). A red dot on a tab means something new arrived on that phone.
- Everything for presenting (time, Next dose, Baba’s answers, microphone, special cases) is in **Demo settings**, which slides in from the right and closes with ×. Each section folds open or closed.
- First-time visitors see a 5-card tutorial. Demo settings → **Show the tutorial again** brings it back.
- Tap any medicine photo on Baba’s phone to see it full screen.

## Before you go on stage
1. Double-click **start-demo.bat** in the `chotu-demo` folder. Chrome opens Chotu after a few seconds. Keep the black window open; closing it stops the demo.
2. Make the browser window full screen (F11). Choose **দুটোই** in the header to see both phones side by side (or one phone at a time if the screen is small). Open **Demo settings** when you need the controls.
3. Click **Reset demo** (in Demo settings → Time). The clock shows **Day 1 · 7:50 AM**, the Elder phone shows **Baba**, and the Caregiver phone shows **শুমন (ছেলে)**.
4. Click anywhere on the page once. Browsers only allow sound after the first click.
5. Optional: if the venue has good internet and a quiet room, click **Turn on microphone** in Demo settings and allow the microphone. If anything goes wrong, use the buttons under **Baba answers** in Demo settings. They always work, even offline.

Tip: the **Next dose** button greys out while Chotu is talking ("wait: Chotu is busy"). Wait a second until the elder phone says "waiting".

## The script (about 3½ minutes; skip step 5 or 9's last two answers if you are short of time)

| # | What you do | What the judges see | What you can say |
|---|---|---|---|
| 1 | Caregiver phone: **ওষুধ যোগ করুন** → **বাবা** → type `eco` → tap **Ecosprin 75** → **হ্যাঁ, এটাই** → tap **সকাল** → **পরের ধাপ** | Medicine found by name with its packet photo, then a big-button schedule. "After breakfast" becomes **সকাল ৮:০০** from Baba's meal times | "A family member sets up medicines by name. The packet photo is what Baba will recognise." |
| 2 | **যাচাই করে চালু করুন** | Green toast. Baba's card: *Comet 500 + Ecosprin 75 · ১০ মিনিট পরে* | "Nothing goes live until the primary caregiver verifies it." |
| 3 | Demo settings: **Next dose →** | Chotu speaks on Baba's phone, then listens ("শুনছি…"). Both medicine photos show | "No taps needed. Chotu speaks first, then listens." |
| 4 | Say **"খেয়েছি"** (mic), or click the chip **খেয়েছি** | "লিখে রাখলাম, ভুল হলে না বলুন" with a 5-second bar | "Baba can undo by saying না. It is logged only after that." |
| 5 | Wait about 10 seconds, then tap **বাবা** on the caregiver phone | Today: Comet + Ecosprin **খেয়েছেন**, timeline updated | "The family sees it straight away." Tap the back arrow afterwards. |
| 6 | Demo settings: **Next dose →** (1:00 PM), then straight away **+30 min** | Baba's phone: "আপনার উত্তর পাইনি, তাই আমি আপনার পরিবারকে জানাচ্ছি" | "No answer: Chotu repeats at +10 and +20 minutes, and at +30 tells the family." |
| 7 | Tap the **red banner** on the caregiver phone → **আমি দেখছি** | Alert shows Baba's photo and who was told when. Baba hears "আপনার পরিবারের একজন বিষয়টি দেখছেন" | "One tap and nobody else is disturbed. If Shumon had not answered, Rumana would be told after 10 minutes." |
| 8 | Back arrow twice (to home). Demo settings → Time: **+1 hour**, **+1 hour**, **+30 min** (clock reaches 4:00 PM) | Chotu starts the **afternoon check-in** by itself: "শরীর কেমন লাগছে আজ?" | "Every afternoon Chotu asks four short questions: how he feels, walking, water, sleep." |
| 9 | Answer with chips (or voice): **হাঁটুতে একটু ব্যথা** → **না, হয়নি** → **হ্যাঁ, হয়েছে** → **হ্যাঁ, হয়েছে** | Progress strip শরীর · হাঁটা · পানি · ঘুম. Caregiver home card: *আজ ব্যথার কথা বলেছেন: “হাঁটুতে একটু ব্যথা”* | "Fixed questions with simple answers, not free chat. Pain is noted for the family, without any diagnosis." |
| 10 | Demo settings: **Next dose →** (9:00 PM). When listening, say **"মনে নেই"** (or chip) | Chotu says **wait**, it never says "take it". Banner: *ওষুধ খাওয়ার কথা মনে নেই*. Tap it: the alert shows when the last dose was taken | "Not sure is the dangerous case. Chotu never tells him to take it again; it asks the family to check." |
| 11 | Elder phone: big red **জরুরি অবস্থা** | 5-second countdown with a huge Cancel. Then "শান্ত থাকুন, বাবা". Caregiver: red emergency screen with **৯৯৯-এ ফোন করুন** | "Voice works too: জরুরি or বাঁচাও. বাতিল cancels. Help and emergency always go through, whatever the consent settings." |
| 12 | Caregiver: back to home → **সারাংশ** tab, then tap **৭ দিন** | Today: medicines, health and habits, alerts, notes. 7 days: *লক্ষ্য করার মতো* (e.g. knee pain on 3 days, 2 missed doses), adherence per medicine, and a colour grid of feeling / walk / water / sleep | "The family sees patterns, not just today. It comes from fixed templates and real records, not AI, and it is not medical advice, but they can show it to the doctor." |

## If something goes wrong
- **No sound:** click once anywhere on the page. Captions always show the words anyway.
- **Microphone did not understand or the internet is slow:** say "let me show it with the Demo settings" and click the chip. Chotu also asks again by itself ("আমি ঠিক বুঝতে পারিনি, আবার বলবেন?").
- **Lost your place:** click **Reset demo** and start again from step 1. It takes 2 seconds.
- **The page is blank or says it cannot connect:** the black window was closed. Double-click start-demo.bat again.

## Be honest with the judges (what is live, what is simulated)
- **Live:** the whole interface and logic: setup, verification, reminders, undo, escalation and alert ownership, safety rules, consent, summary. With the microphone on, Baba's answer really is understood by a Gemini model through our own small server (the API key never reaches the browser).
- **Simulated / scripted:** the people, their medicine history and the earlier days' check-ins are sample data (so the 7-day summary has something to show). The demo clock replaces real time. The two phones are on one screen; in real life they are separate phones. Calls and 999 are not dialled. "Ma answers on her own" is a presenter switch to keep the story simple.
- **Roadmap, not in the demo:** reading prescriptions automatically (OCR), free conversation with Chotu (the check-in uses four fixed questions), location sharing, real push notifications.
- **Do not claim** that it understands every Bangla dialect. We tested with a few synthetic voices only. Report the real hit rate from the 10-clip accent test with volunteer voices before saying anything about accuracy.

## Other things you can show if there is time
- Demo settings: **Afternoon check-in now** starts the check-in at any time (without moving the clock).
- Caregiver: Baba's dashboard shows today's **বিকেলের কথা**; on the **প্রোফাইল** tab the check-in time can be changed (default 4:00 PM).
- Switch the Demo settings to **Rumana**: she can add a medicine, but only Shumon can activate it (**যাচাই বাকি**).
- Demo settings: **Baba's phone unreachable**. The alert says "can't reach his phone" instead of "missed".
- Demo settings: **Show consent screen** on Baba's phone. Turn off "ওষুধ খাওয়ার খবর" and the family no longer sees dose details, but help and emergency still come through.
- Switch the elder phone to **Ma** and tap **এখন খেলাম** on Napa Extra: it is logged, and because it is only 1.5 hours after her last one, the family is alerted (the family's rule is 6 hours).
