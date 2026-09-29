# HueMind 🎨🧠

Ein minimalistisches **Farbgedächtnis-Trainingsspiel**. Du siehst eine Farbe, prägst sie dir ein – und triffst den Ton danach so genau wie möglich. Je näher dran, desto höher der Score (0–100).

Gebaut mit **Expo SDK 54** + **expo-router**, läuft direkt in **Expo Go** (kein Custom-Native-Build nötig zum Ausprobieren).

---

## 🚀 Auf dem Handy starten (Expo Go, SDK 54)

1. Installiere die **Expo Go** App aus dem Play Store / App Store (sie muss SDK 54 unterstützen).
2. Im Projektordner:

   ```bash
   npm install
   npm start
   ```

3. Scanne den QR-Code im Terminal mit Expo Go (Android) bzw. der Kamera (iOS).

> Die App ist auf **SDK 54** gepinnt, damit sie mit deiner Expo-Go-Version läuft. Bitte nicht versehentlich auf SDK 56 hochziehen.

Nützliche Skripte:

```bash
npm start            # Metro / Dev-Server
npm run android      # direkt auf Android starten
npm run typecheck    # TypeScript prüfen (tsc --noEmit)
npm run doctor       # expo-doctor
```

---

## 🎮 Spielprinzip & Modi

Eine zufällige Zielfarbe → einprägen → mit dem Farbwähler nachstellen → Score.

| Modus     | Merkzeit | Besonderheit |
|-----------|----------|--------------|
| **Easy**     | 10 s | entspanntes Training |
| **Normal**   | 5 s  | der Klassiker |
| **Hard**     | 3 s  | für schnelle Augen |
| **Hardcore** | 3 s  | erst Ablenkfarben, dann 3 s Ziel-Farbe |

**Scoring:** Ziel- und Auswahl­farbe werden in den Lab-Farbraum konvertiert und per **CIEDE2000** (perzeptuelle Farbdistanz) verglichen. Der Score ist `100 − Abweichung%`; 100 = pixelgenau getroffen. Schwierigere Modi geben einen Punkte-Bonus (fließt in die kumulierte „Bester Score"-Zahl auf dem Home-Screen).

---

## 🌍 Sprachen (i18n)

Deutsch, Englisch, Spanisch via `i18next` + `react-i18next`. Standard folgt der Gerätesprache (`expo-localization`), Fallback ist Deutsch. Umschaltbar in den Einstellungen.

Übersetzungen: `src/i18n/locales/{de,en,es}.json`. Neue Sprache = JSON-Datei ergänzen + in `src/i18n/index.ts` registrieren.

---

## 💳 RevenueCat (Premium)

`react-native-purchases` ist ein **Native-Modul und läuft NICHT in Expo Go**. Damit die App in Expo Go bundlet, ist `src/services/purchases.ts` ein **Mock**: Es setzt nur ein lokales `premium`-Flag im Store. Die komplette Paywall- und Premium-UI ist trotzdem voll bedienbar.

Für den Produktions-Launch (Dev-Client / EAS-Build) sind in `src/services/purchases.ts` Schritt-für-Schritt-Kommentare hinterlegt: `react-native-purchases` installieren, `Purchases.configure({ apiKey })`, `entitlements.active['premium']` lesen – die öffentliche API bleibt identisch, die Screens müssen nicht angefasst werden.

---

## 🧱 Architektur

```
app/                      expo-router Screens
  _layout.tsx             Root-Stack, Fonts, i18n, Splash-Gate
  index.tsx               Splash
  (tabs)/                 Home · Fortschritt · Einstellungen (Custom Tab Bar)
  modes · ready · game · result · paywall
src/
  theme.ts                Light/Dark-Paletten, Manrope-Typografie, useTheme()
  types.ts                Domain-Typen
  constants/modes.ts      Modus-Konfiguration
  i18n/                   i18next-Setup + Locales
  store/                  Zustand-Store (persistiert via AsyncStorage) + Selektoren
  services/               purchases (RevenueCat-Mock), feedback (Haptik/Sound)
  utils/                  color (HSV/RGB/HEX, CIEDE2000), scoring, colorName
  components/             UI-Kit (ColorPicker, CountdownRing, WeeklyChart, …)
```

**State:** ein `zustand`-Store mit `persist`-Middleware (AsyncStorage) speichert Einstellungen, Statistiken (Verlauf, Bestwert, Serie) und das Premium-Flag.

**Design:** „Soft Minimalism" – warme Neutraltöne, viel Weißraum, große Radien, sanfte Schatten. Die Spielfarbe ist immer der visuelle Fokus. Quelle: `stitch_huemind_ui_design_concept/` (Stitch-Designkonzept) + `BUILD_CONTRACT.md`.

**Stack (alles Expo-Go-kompatibel):** expo-router · react-native-svg · expo-linear-gradient · expo-haptics · expo-localization · @react-native-async-storage/async-storage · @expo/vector-icons · @expo-google-fonts/manrope · zustand · i18next. Animationen ausschließlich mit RN-`Animated` + `PanResponder` (kein reanimated).

---

## 📦 Richtung Store-Launch

- App-Icon / Splash: `assets/` (generiert via `node scripts/gen-assets.js`).
- Bundle-IDs: `de.pakumedia.huemind` (iOS & Android) in `app.json`.
- Für echte Builds & Store-Upload: `eas build` / `eas submit` (EAS-Konfiguration noch hinzuzufügen), dazu RevenueCat wie oben verdrahten.
