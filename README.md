# ⚡ VoltCalc Deployment Fix

If you are seeing a blank screen, follow these steps exactly:

### 🚀 HOW TO DEPLOY CORRECTLY
1.  **Download all files** into a clean folder on your desktop.
2.  Go to **[Netlify Drop](https://app.netlify.com/drop)**.
3.  **DO NOT** upload individual files. Select the **ENTIRE FOLDER** and drag it into the upload box.
4.  Once uploaded, click the generated link. It should show "⚡ STARTING SECURE VAULT..." for a moment before loading.

### ❓ WHY THE BLANK SCREEN?
The browser needs to load `index.tsx` as a "module". My updated `index.html` includes a new "Import Map" that tells the browser where to find React. This fixes the common Netlify/Vercel white screen issue.

### 🧮 CALCULATION FORMULA
- **C** = Current Meter Reading (What you see on the meter now)
- **P** = Previous Meter Reading (What was recorded last time)
- **Units Used** = C - P
- **Total** = (Units × Rate) + Rent + Arrears
