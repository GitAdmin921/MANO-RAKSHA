import React from "react";

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी / Hindi" },
];

export const languageName = (code) =>
  LANGUAGES.find((item) => item.value === code)?.label || "English";

export function getLanguage() {
  try {
    return localStorage.getItem("manoraksha-language") === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}

export function setLanguage(code) {
  const next = code === "hi" ? "hi" : "en";
  try {
    localStorage.setItem("manoraksha-language", next);
  } catch {}
  window.dispatchEvent(new CustomEvent("manoraksha:language", { detail: next }));
}

export function LanguageSelect({ value, onChange, className = "" }) {
  return (
    <label className={`language-select ${className}`}>
      <span>{value === "hi" ? "भाषा / Language" : "Language / भाषा"}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={value === "hi" ? "अपनी भाषा चुनें" : "Choose your language"}
      >
        <option value="en">English</option>
        <option value="hi">हिंदी / Hindi</option>
      </select>
    </label>
  );
}

// Visible UI phrases used throughout the current MANORAKSHA frontend.
const HI = {
  "Home": "होम", "Monitor": "मॉनिटर", "Support": "सहायता", "Profile": "प्रोफ़ाइल",
  "Privacy & Profile": "गोपनीयता और प्रोफ़ाइल", "Daily Check-in": "दैनिक जाँच",
  "MANORAKSHA AI": "MANORAKSHA AI", "Mental Health Monitor": "मानसिक स्वास्थ्य मॉनिटर",
  "Daily Journal": "दैनिक जर्नल", "Weekly Report": "साप्ताहिक रिपोर्ट",
  "Support & Resources": "सहायता और संसाधन", "Localized Support": "स्थानीय सहायता",
  "Language / भाषा": "भाषा / Language", "Choose your language": "अपनी भाषा चुनें",
  "English": "अंग्रेज़ी", "Hindi": "हिंदी", "Hindi / हिन्दी": "हिंदी / Hindi",
  "Personal details": "व्यक्तिगत विवरण", "Keep your profile up to date": "अपनी प्रोफ़ाइल अपडेट रखें",
  "Display name": "प्रदर्शित नाम", "Name": "नाम", "Age": "आयु", "Contact number": "संपर्क नंबर",
  "Phone number": "फ़ोन नंबर", "Email": "ईमेल", "Email address": "ईमेल पता",
  "Visual experience": "दृश्य अनुभव", "Female": "महिला", "Male": "पुरुष", "Neutral": "तटस्थ",
  "Save profile": "प्रोफ़ाइल सहेजें", "Sign out": "साइन आउट", "Log out": "लॉग आउट",
  "Start a conversation": "बातचीत शुरू करें", "Talk to MANORAKSHA AI": "MANORAKSHA AI से बात करें",
  "Tell MANORAKSHA what is on your mind…": "MANORAKSHA को बताएं कि आपके मन में क्या है…",
  "Tell MANORAKSHA what is on your mind...": "MANORAKSHA को बताएं कि आपके मन में क्या है…",
  "MANORAKSHA is listening…": "MANORAKSHA सुन रहा है…", "MANORAKSHA is listening...": "MANORAKSHA सुन रहा है…",
  "Send": "भेजें", "Cancel": "रद्द करें", "Close": "बंद करें", "Save": "सहेजें",
  "Private conversation space": "निजी बातचीत का स्थान",
  "Talk naturally. Type when you want. The camera can provide optional visual context.": "स्वाभाविक रूप से बात करें। जब चाहें टाइप करें। कैमरा वैकल्पिक दृश्य संदर्भ दे सकता है।",
  "Very low": "बहुत कम", "Low": "कम", "Okay": "ठीक", "Good": "अच्छा", "Great": "बहुत अच्छा",
  "How are you feeling today?": "आज आप कैसा महसूस कर रहे हैं?", "Save mood": "मूड सहेजें",
  "Daily mood": "दैनिक मूड", "Mood": "मूड", "Journal": "जर्नल", "My monitor": "मेरा मॉनिटर",
  "Preparing your safe space…": "आपका सुरक्षित स्थान तैयार हो रहा है…",
  "Preparing your safe space...": "आपका सुरक्षित स्थान तैयार हो रहा है…",
  "Refresh MANORAKSHA": "MANORAKSHA को रीफ़्रेश करें", "Something went wrong.": "कुछ गलत हो गया।",
  "Optional": "वैकल्पिक", "Saving…": "सहेजा जा रहा है…", "Saving...": "सहेजा जा रहा है…",
  "Profile saved securely.": "प्रोफ़ाइल सुरक्षित रूप से सहेजी गई।", "Resources": "संसाधन",
  "Your language preference is saved on this device. AI replies will be requested in the selected language.": "आपकी भाषा पसंद इस डिवाइस पर इस डिवाइस में सहेजी जाती है। AI उत्तर चुनी गई भाषा में मांगे जाएंगे।",
  "Supportive conversation only. MANORAKSHA AI does not diagnose or determine mental health from appearance. If you are in immediate danger, contact local emergency help or a trusted person.": "यह केवल सहायक बातचीत है। MANORAKSHA AI निदान नहीं करता और न ही दिखावट से मानसिक स्वास्थ्य निर्धारित करता है। यदि आप तत्काल खतरे में हैं, तो स्थानीय आपातकालीन सहायता या किसी विश्वसनीय व्यक्ति से संपर्क करें।",
  "Light": "लाइट", "Dark": "डार्क", "Notifications": "सूचनाएं", "Close notifications": "सूचनाएं बंद करें",
  "Open navigation menu": "नेविगेशन मेनू खोलें", "Close menu": "मेनू बंद करें",
  "Welcome back": "वापसी पर स्वागत है", "Create account": "खाता बनाएं", "Login": "लॉगिन",
  "Sign up": "साइन अप", "Password": "पासवर्ड", "Confirm password": "पासवर्ड की पुष्टि करें",
  "Forgot password?": "पासवर्ड भूल गए?", "Continue": "जारी रखें", "Back": "वापस",
  "Dashboard": "डैशबोर्ड", "Overview": "अवलोकन", "Settings": "सेटिंग्स", "Account": "खाता",
  "No data available yet.": "अभी कोई डेटा उपलब्ध नहीं है।", "Loading…": "लोड हो रहा है…", "Loading...": "लोड हो रहा है…",
  "Try again": "फिर कोशिश करें", "View details": "विवरण देखें", "Learn more": "और जानें",
  "Emergency help": "आपातकालीन सहायता", "Trusted person": "विश्वसनीय व्यक्ति", "Help": "मदद",
};

const EN_KEYS = Object.keys(HI).sort((a, b) => b.length - a.length);
const textOriginals = new WeakMap();
const attributeOriginals = new WeakMap();
let scheduled = false;
let observer;

function translateString(value, lang) {
  if (lang !== "hi" || typeof value !== "string" || !value.trim()) return value;
  let result = value;
  for (const key of EN_KEYS) {
    if (result.includes(key)) result = result.split(key).join(HI[key]);
  }
  return result;
}

function translateDom(lang) {
  if (typeof document === "undefined" || !document.body) return;
  document.documentElement.lang = lang === "hi" ? "hi" : "en";

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) continue;
    if (!textOriginals.has(node)) textOriginals.set(node, node.nodeValue || "");
    const original = textOriginals.get(node);
    const translated = translateString(original, lang);
    if (node.nodeValue !== translated) node.nodeValue = translated;
  }

  const elements = document.querySelectorAll("input[placeholder], textarea[placeholder], [aria-label], [title], button");
  for (const element of elements) {
    for (const attr of ["placeholder", "aria-label", "title"]) {
      if (!element.hasAttribute(attr)) continue;
      let originals = attributeOriginals.get(element);
      if (!originals) {
        originals = {};
        attributeOriginals.set(element, originals);
      }
      if (!(attr in originals)) originals[attr] = element.getAttribute(attr) || "";
      const translated = translateString(originals[attr], lang);
      if (element.getAttribute(attr) !== translated) element.setAttribute(attr, translated);
    }
  }
}

function scheduleTranslation() {
  if (scheduled) return;
  scheduled = true;
  const run = () => {
    scheduled = false;
    translateDom(getLanguage());
  };
  if (typeof window !== "undefined" && window.requestAnimationFrame) window.requestAnimationFrame(run);
  else setTimeout(run, 0);
}

export function installUiTranslations() {
  if (typeof window === "undefined" || typeof document === "undefined" || !document.body) return;
  if (window.__manorakshaI18nInstalled) {
    scheduleTranslation();
    return;
  }
  window.__manorakshaI18nInstalled = true;
  window.addEventListener("manoraksha:language", scheduleTranslation);
  observer = new MutationObserver(scheduleTranslation);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  scheduleTranslation();
}
