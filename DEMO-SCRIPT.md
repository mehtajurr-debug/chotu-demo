# Chotu: 3-minute demo script

## Before you go on stage
1. Double-click **start-demo.bat** in the `chotu-demo` folder. Chrome opens Chotu after a few seconds. Keep the black window open; closing it stops the demo.
2. Make the browser window full screen (F11). You should see both phones side by side, with the presenter panel on the right.
3. Click **Reset demo** (top bar). The clock shows **Day 1 · 7:50 AM**, the Elder phone shows **Baba**, and the Caregiver phone shows **Shumon ★**.
4. Click anywhere on the page once. Browsers only allow sound after the first click.
5. Optional: if the venue has good internet and a quiet room, click **Turn on microphone** in the panel and allow the microphone. If anything goes wrong, use the chips under "Baba says". They always work, even offline.

Tip: the **Next dose** button greys out while Chotu is talking ("wait: Chotu is busy"). Wait a second until the elder phone says "waiting".

## The script (about 3 minutes)

| # | What you do | What the judges see | What you can say |
|---|---|---|---|
| 1 | Caregiver phone: **ওষুধ যোগ করুন** → **বাবা** → type `eco` → tap **Ecosprin 75** → **হ্যাঁ, এটাই** → tap **সকাল** → **পরের ধাপ** | Medicine found by name with its packet photo, then a big-button schedule. "After breakfast" becomes **সকাল ৮:০০** from Baba's meal times | "A family member sets up medicines by name. The packet photo is what Baba will recognise." |
| 2 | **যাচাই করে চালু করুন** | Green toast. Baba's card: *Comet 500 + Ecosprin 75 · ১০ মিনিট পরে* | "Nothing goes live until the primary caregiver verifies it." |
| 3 | Panel: **Next dose →** | Chotu speaks on Baba's phone, then listens ("শুনছি…"). Both medicine photos show | "No taps needed. Chotu speaks first, then listens." |
| 4 | Say **"খেয়েছি"** (mic), or click the chip **খেয়েছি** | "লিখে রাখলাম, ভুল হলে না বলুন" with a 5-second bar | "Baba can undo by saying না. It is logged only after that." |
| 5 | Wait about 10 seconds, then tap **বাবা** on the caregiver phone | Today: Comet + Ecosprin **খেয়েছেন**, timeline updated | "The family sees it straight away." Tap the back arrow afterwards. |
| 6 | Panel: **Next dose →** (1:00 PM), then straight away **+30 min** | Baba's phone: "আপনার উত্তর পাইনি, তাই আমি আপনার পরিবারকে জানাচ্ছি" | "No answer: Chotu repeats at +10 and +20 minutes, and at +30 tells the family." |
| 7 | Tap the **red banner** on the caregiver phone → **আমি দেখছি** | Alert shows Baba's photo and who was told when. Baba hears "আপনার পরিবারের একজন বিষয়টি দেখছেন" | "One tap and nobody else is disturbed. If Shumon had not answered, Rumana would be told after 10 minutes." |
| 8 | Back arrow twice (to home). Panel: **Next dose →** (9:00 PM). When listening, say **"মনে নেই"** (or chip) | Chotu says **wait**, it never says "take it". Banner: *ওষুধ খাওয়ার কথা মনে নেই*. Tap it: the alert shows when the last dose was taken | "Not sure is the dangerous case. Chotu never tells him to take it again; it asks the family to check." |
| 9 | Elder phone: big red **জরুরি অবস্থা** | 5-second countdown with a huge Cancel. Then "শান্ত থাকুন, বাবা". Caregiver: red emergency screen with **৯৯৯-এ ফোন করুন** | "Voice works too: জরুরি or বাঁচাও. বাতিল cancels. Help and emergency always go through, whatever the consent settings." |
| 10 | Caregiver: back to home → **সারাংশ** tab | Bangla daily summary: medicines, alerts, notes | "This summary comes from fixed templates and real records, not from AI. No medical advice anywhere." |

## If something goes wrong
- **No sound:** click once anywhere on the page. Captions always show the words anyway.
- **Microphone did not understand or the internet is slow:** say "let me show it with the presenter panel" and click the chip. Chotu also asks again by itself ("আমি ঠিক বুঝতে পারিনি, আবার বলবেন?").
- **Lost your place:** click **Reset demo** and start again from step 1. It takes 2 seconds.
- **The page is blank or says it cannot connect:** the black window was closed. Double-click start-demo.bat again.

## Be honest with the judges (what is live, what is simulated)
- **Live:** the whole interface and logic: setup, verification, reminders, undo, escalation and alert ownership, safety rules, consent, summary. With the microphone on, Baba's answer really is understood by a Gemini model through our own small server (the API key never reaches the browser).
- **Simulated / scripted:** the people and their medicine history are sample data. The demo clock replaces real time. The two phones are on one screen; in real life they are separate phones. Calls and 999 are not dialled. "Ma answers on her own" is a presenter switch to keep the story simple.
- **Roadmap, not in the demo:** reading prescriptions automatically (OCR), free conversation with Chotu, location sharing, real push notifications.
- **Do not claim** that it understands every Bangla dialect. We tested with a few synthetic voices only. Report the real hit rate from the 10-clip accent test with volunteer voices before saying anything about accuracy.

## Other things you can show if there is time
- Switch the top bar to **Rumana**: she can add a medicine, but only Shumon can activate it (**যাচাই বাকি**).
- Panel: **Baba's phone unreachable**. The alert says "can't reach his phone" instead of "missed".
- Panel: **Show consent screen** on Baba's phone. Turn off "ওষুধ খাওয়ার খবর" and the family no longer sees dose details, but help and emergency still come through.
- Switch the elder phone to **Ma** and tap **এখন খেলাম** on Napa Extra: it is logged, and because it is only 1.5 hours after her last one, the family is alerted (the family's rule is 6 hours).
