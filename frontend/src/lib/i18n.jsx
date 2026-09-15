import React from "react";

export const LANGUAGES = [{ value: "en", label: "English" }, { value: "hi", label: "Hindi / हिन्दी" }];
export const languageName = code => LANGUAGES.find(x => x.value === code)?.label || "English";
export function getLanguage() { try { return localStorage.getItem("manoraksha-language") || "en"; } catch { return "en"; } }
export function setLanguage(code) {
  try { localStorage.setItem("manoraksha-language", code); window.dispatchEvent(new CustomEvent("manoraksha:language", { detail: code })); } catch {}
}
export function LanguageSelect({ value, onChange, className = "" }) {
  return <label className={`language-select ${className}`}><span>Language / भाषा</span><select value={value} onChange={e => onChange(e.target.value)} aria-label="Choose your language">{LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></label>;
}

// UI translation catalog. English remains the source language; unknown or dynamic
// content safely falls back to English instead of being incorrectly translated.
const HI = {
  "Home":"होम", "Monitor":"मॉनिटर", "Support":"सहायता", "Profile":"प्रोफ़ाइल", "Privacy & Profile":"गोपनीयता और प्रोफ़ाइल",
  "Daily Check-in":"दैनिक जाँच", "MANORAKSHA AI":"MANORAKSHA AI", "Mental Health Monitor":"मानसिक स्वास्थ्य मॉनिटर", "Daily Journal":"दैनिक जर्नल", "Weekly Report":"साप्ताहिक रिपोर्ट", "Support & Resources":"सहायता और संसाधन", "Localized Support":"स्थानीय सहायता",
  "Language / भाषा":"भाषा / Language", "Choose your language":"अपनी भाषा चुनें", "English":"अंग्रेज़ी", "Hindi / हिन्दी":"हिंदी / हिन्दी", "Hindi":"हिंदी",
  "Personal details":"व्यक्तिगत विवरण", "Keep your profile up to date":"अपनी प्रोफ़ाइल अपडेट रखें", "Display name":"प्रदर्शित नाम", "Age":"आयु", "Contact number":"संपर्क नंबर", "Visual experience":"दृश्य अनुभव", "Female":"महिला", "Male":"पुरुष", "Neutral":"तटस्थ", "Save profile":"प्रोफ़ाइल सहेजें", "Sign out":"साइन आउट",
  "Start a conversation":"बातचीत शुरू करें", "Talk to MANORAKSHA AI":"MANORAKSHA AI से बात करें", "Tell MANORAKSHA what is on your mind…":"MANORAKSHA को बताएं कि आपके मन में क्या है…", "MANORAKSHA is listening…":"MANORAKSHA सुन रहा है…", "Send":"भेजें", "Private conversation space":"निजी बातचीत का स्थान", "Talk naturally. Type when you want. The camera can provide optional visual context.":"स्वाभाविक रूप से बात करें। जब चाहें टाइप करें। कैमरा वैकल्पिक दृश्य संदर्भ दे सकता है।",
  "Very low":"बहुत कम", "Low":"कम", "Okay":"ठीक", "Good":"अच्छा", "Great":"बहुत अच्छा", "How are you feeling today?":"आज आप कैसा महसूस कर रहे हैं?", "Save mood":"मूड सहेजें",
  "Preparing your safe space…":"आपका सुरक्षित स्थान तैयार हो रहा है…", "Refresh MANORAKSHA":"MANORAKSHA को रीफ़्रेश करें", "Something went wrong.":"कुछ गलत हो गया।", "Optional":"वैकल्पिक", "Saving…":"सहेजा जा रहा है…", "Profile saved securely.":"प्रोफ़ाइल सुरक्षित रूप से सहेजी गई।",
  "Your language preference is saved on this device. AI replies will be requested in the selected language.":"आपकी भाषा पसंद इस डिवाइस पर सहेजी जाती है। AI उत्तर चुनी गई भाषा में मांगे जाएंगे।",
  "Supportive conversation only. MANORAKSHA AI does not diagnose or determine mental health from appearance. If you are in immediate danger, contact local emergency help or a trusted person.":"यह केवल सहायक बातचीत है। MANORAKSHA AI निदान नहीं करता और न ही दिखावट से मानसिक स्वास्थ्य निर्धारित करता है। यदि आप तत्काल खतरे में हैं, तो स्थानीय आपातकालीन सहायता या किसी विश्वसनीय व्यक्ति से संपर्क करें।",
  "Light":"लाइट", "Dark":"डार्क", "Notifications":"सूचनाएं", "Close notifications":"सूचनाएं बंद करें", "Open navigation menu":"नेविगेशन मेनू खोलें", "Close menu":"मेनू बंद करें", "Resources":"संसाधन", "Journal":"जर्नल", "My monitor":"मेरा मॉनिटर"
};
const EN_KEYS = Object.keys(HI).sort((a,b)=>b.length-a.length);
function translateString(value, lang) {
  if (lang !== "hi" || !value || !value.trim()) return value;
  const trimmed = value.trim();
  return HI[trimmed] ? value.replace(trimmed, HI[trimmed]) : value;
}
function translateDom(lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang === "hi" ? "hi" : "en";
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (!node.parentElement || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(node.parentElement.tagName)) return;
    if (!node.dataset.manorakshaOriginal) node.dataset.manorakshaOriginal = node.nodeValue;
    const original = node.dataset.manorakshaOriginal;
    const next = lang === "hi" ? translateString(original, lang) : original;
    if (node.nodeValue !== next) node.nodeValue = next;
  });
  document.querySelectorAll("input[placeholder], textarea[placeholder], [aria-label], button[title]").forEach(el => {
    ["placeholder", "aria-label", "title"].forEach(attr => {
      if (!el.hasAttribute(attr)) return;
      const key = `manorakshaOriginal${attr[0].toUpperCase()}${attr.slice(1)}`;
      if (!el.dataset[key]) el.dataset[key] = el.getAttribute(attr);
      const original = el.dataset[key];
      const next = lang === "hi" ? translateString(original, lang) : original;
      if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
    });
  });
}
let observer;
export function installUiTranslations() {
  if (typeof window === "undefined" || typeof document === "undefined" || window.__manorakshaI18nInstalled) return;
  window.__manorakshaI18nInstalled = true;
  const apply = () => window.requestAnimationFrame(() => translateDom(getLanguage()));
  window.addEventListener("manoraksha:language", apply);
  observer = new MutationObserver(apply);
  observer.observe(document.body, { childList: true, subtree: true });
  apply();
}
