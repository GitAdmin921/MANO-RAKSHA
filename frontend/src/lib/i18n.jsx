export const LANGUAGES = [
  ['en','English'],['hi','Hindi']
].map(([value,label])=>({value,label}));
export const languageName = code => LANGUAGES.find(x=>x.value===code)?.label || 'English';
export function getLanguage(){ try{return localStorage.getItem('manoraksha-language')||'en'}catch{return 'en'} }
export function setLanguage(code){ try{localStorage.setItem('manoraksha-language',code); window.dispatchEvent(new CustomEvent('manoraksha:language',{detail:code}));}catch{} }
export function LanguageSelect({value,onChange,className=''}){ return <label className={`language-select ${className}`}><span>Language / भाषा</span><select value={value} onChange={e=>onChange(e.target.value)}>{LANGUAGES.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}</select></label>; }
