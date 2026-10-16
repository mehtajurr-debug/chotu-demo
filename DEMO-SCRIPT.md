# Chotu: 3-minute demo script

## Online version (to share)
- Link: **https://chotu-demo.vercel.app**. It works on any computer or phone, even when your laptop is off.
- Everything works without signing in, including the live microphone (in Chrome, allow the microphone when asked).
- The microphone uses your free Gemini allowance, so if many people try it on one day it can run out; the chips always keep working. A passcode can be switched back on by adding `MIC_PASSCODE` in the Vercel project settings and republishing.
- Each visitor gets their own copy of the demo in their own browser; **Reset demo** starts it fresh.
- After changes on your laptop, the online version is updated with: `npx.cmd vercel deploy --prod` (Claude can run it for you).

## Practising every workflow
Open **Demo settings** (top right) → **Rehearsal workflows**: 21 workflows (setup, prescription photo, reminders, safety, health check-in, stock, privacy, dashboard, AI summary, live voice). Pick one and click **Start this workflow**: it sets the clock, elder and caregiver, closes Demo settings, shows the right phone and opens a **guide card** at the bottom with one step at a time, Baba's answer chips and +10 / +30 min. **Next ›** goes through the steps; on the last step **Next workflow** starts the next one. Use it to rehearse; on stage, follow the script below.

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
| 1 | Caregiver phone: **ওষুধ যোগ করুন** → **বাবা** → **প্রেসক্রিপশনের ছবি থেকে** → **নমুনা ১** | About 4 seconds of "পড়া হচ্ছে…", then every medicine on the prescription with its time, meal and duration, and the line exactly as printed. Comet and Rosuva are unticked ("আগে থেকেই আছে"); Osartil, Camlodin and Linatab say the library packet has a different strength, so a real packet photo is needed | "The family photographs a printed prescription. Gemini reads only the medicine lines and the app turns ১ + ০ + ১ into morning and night. It never guesses: anything doubtful is flagged." |
| 2 | Untick the three without a packet photo → **১টি ওষুধ যোগ করুন** → **যাচাই করে সব চালু করুন** | Ecosprin 75 is added for 1:00 PM and switched on. Baba's card updates | "The AI fills the form; a person checks it, and nothing goes live until the primary caregiver verifies it." (No internet? Add it by name instead: type `eco` → Ecosprin 75.) |
| 3 | Demo settings: **Next dose →** | Chotu speaks on Baba's phone, then listens ("শুনছি…"). The medicine photo shows | "No taps needed. Chotu speaks first, then listens." |
| 4 | Say **"খেয়েছি"** or a full sentence like **"হ্যাঁ, সকালে নাস্তার পরেই খেয়ে নিয়েছি"** (mic), or click the chip **খেয়েছি** | "ধন্যবাদ, লিখে রাখলাম।" | "It understands the meaning, not just one word. If it is not sure, it reads the answer back first." |
| 5 | Tap **বাবা** on the caregiver phone | Today: Comet **খেয়েছেন**, timeline updated | "The family sees it straight away." Tap the back arrow afterwards. |
| 6 | Demo settings: **Next dose →** (1:00 PM), then straight away **+30 min** | Baba's phone: "আপনার উত্তর পাইনি, তাই আমি আপনার পরিবারকে জানাচ্ছি" | "No answer: Chotu repeats at +10 and +20 minutes, and at +30 tells the family." |
| 7 | Tap the **red banner** on the caregiver phone → **আমি দেখছি** | Alert shows Baba's photo and who was told when. Baba hears "আপনার পরিবারের একজন বিষয়টি দেখছেন" | "One tap and nobody else is disturbed. If Shumon had not answered, Rumana would be told after 10 minutes." |
| 8 | Back arrow twice (to home). Demo settings → Time: **+1 hour**, **+1 hour**, **+30 min** (clock reaches 4:00 PM) | Chotu starts the **afternoon check-in** by itself: "শরীর কেমন লাগছে আজ?" | "Every afternoon Chotu asks four short questions: how he feels, walking, water, sleep." |
| 9 | Answer with chips (or voice): **হাঁটুতে একটু ব্যথা** → **না, হয়নি** → **হ্যাঁ, হয়েছে** → **হ্যাঁ, হয়েছে** | Progress strip শরীর · হাঁটা · পানি · ঘুম. Caregiver home card: *আজ ব্যথার কথা বলেছেন: “হাঁটুতে একটু ব্যথা”* | "Fixed questions with simple answers, not free chat. Pain is noted for the family, without any diagnosis." |
| 10 | Demo settings: **Next dose →** (9:00 PM). When listening, say **"মনে নেই"** (or chip) | Chotu says **wait**, it never says "take it". Banner: *ওষুধ খাওয়ার কথা মনে নেই*. Tap it: the alert shows when the last dose was taken | "Not sure is the dangerous case. Chotu never tells him to take it again; it asks the family to check." |
| 11 | Elder phone: big red **জরুরি অবস্থা** | 5-second countdown with a huge Cancel. Then "শান্ত থাকুন, বাবা". Caregiver: red emergency screen with **৯৯৯-এ ফোন করুন** | "Voice works too: জরুরি or বাঁচাও. বাতিল cancels. Help and emergency always go through, whatever the consent settings." |
| 12 | Caregiver: back to home → **সারাংশ** tab, then tap **৪ সপ্তাহ** | At the top, **ছোটুর সারাংশ · AI**: one headline, a short story of the day or month, **লক্ষ্য করার মতো** (e.g. night doses missed more often, knee pain more frequent, less walking, each with the numbers) and **পরিবার যা করতে পারেন** (e.g. mention the knee pain at Thursday's doctor visit, from the family's note). Below it, the plain record it was built from | "Gemini turns weeks of records into a few lines the family can act on. It may only use what is recorded and what the elder agreed to share, it never diagnoses or touches medicines, and the facts are right underneath." |

## If something goes wrong
- **No sound:** click once anywhere on the page. Captions always show the words anyway.
- **Microphone did not understand or the internet is slow:** say "let me show it with the Demo settings" and click the chip. Chotu also asks again by itself ("আমি ঠিক বুঝতে পারিনি, আবার বলবেন?").
- **Prescription reading or AI summary is slow or fails:** both need internet. Add the medicine by name instead (type `eco`); the summary screen still shows the full record below the AI card, and **আবার চেষ্টা করুন** retries.
- **Lost your place:** click **Reset demo** and start again from step 1. It takes 2 seconds.
- **The page is blank or says it cannot connect:** the black window was closed. Double-click start-demo.bat again.

## Be honest with the judges (what is live, what is simulated)
- **Live:** the whole interface and logic: setup, verification, reminders, escalation and alert ownership, safety rules, consent, stock count. Three real AI features, all through our own small server (the API key never reaches the browser): understanding Baba's spoken answer, **reading a printed prescription photo** into a medicine list, and the **AI summary** of days and weeks. On our three sample prescriptions it read all 18 medicine lines correctly; three natural, full-sentence spoken answers (synthetic voices) were all understood correctly.
- **Simulated / scripted:** the people, their medicine history and four weeks of earlier check-ins are sample data (so the summaries have something to show). The three prescriptions are synthetic samples marked "DEMO – NOT FOR DISPENSING". The demo clock replaces real time. The two phones are on one screen; in real life they are separate phones. Calls and 999 are not dialled. "Ma answers on her own" is a presenter switch to keep the story simple.
- **Roadmap, not in the demo:** handwritten prescriptions, weekly doses (e.g. D-Rise every Friday is flagged for the family, not reminded), free conversation with Chotu (the check-in uses four fixed questions), location sharing, real push notifications.
- **Do not claim** that it understands every Bangla dialect. We tested with a few synthetic voices only. Report the real hit rate from the 10-clip accent test with volunteer voices before saying anything about accuracy.

## Other things you can show if there is time
- **Exact times:** when adding a medicine, "অন্য সময়" takes any clock time (e.g. 10:00 PM) for people whose day doesn't follow meal times. Demo settings → Time → **Go to** jumps the clock straight there.
- **Running low:** each dose taken counts the tablets down. Baba has 6 Angilock Plus; after his noon dose (Go to 2:00 PM) Shumon gets an amber **ওষুধ কিনতে হবে** alert. Tap **কিনেছি, ৩০টি যোগ করুন** to close it.
- **Call the family:** on the elder phone, **পরিবারকে ফোন করুন** lets Baba pick who to call by photo. Say that the call is simulated in the demo. (Running out is tracked by the stock count, so there is no separate button for it.)
- Demo settings: **Afternoon check-in now** starts the check-in at any time (without moving the clock).
- Caregiver: Baba's dashboard shows today's **বিকেলের কথা**; on the **প্রোফাইল** tab the check-in time can be changed (default 4:00 PM).
- Switch the Demo settings to **Rumana**: she can add a medicine, but only Shumon can activate it (**যাচাই বাকি**).
- Demo settings: **Baba's phone unreachable**. The alert says "can't reach his phone" instead of "missed".
- Demo settings: **Show consent screen** on Baba's phone. Turn off "ওষুধ খাওয়ার খবর" and the family no longer sees dose details, but help and emergency still come through.
- Switch the elder phone to **Ma** and tap **এখন খেলাম** on Napa Extra: it is logged, and because it is only 1.5 hours after her last one, the family is alerted (the family's rule is 6 hours).
