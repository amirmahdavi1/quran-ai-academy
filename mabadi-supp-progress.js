/* v170: local, separate progress for supplementary Mabadi 3 modules */
(() => {
"use strict";
const KEY="quran-mabadi3-supplement-progress-v1", FIRST=122, LAST=168, N=12;
const fa=n=>Number(n).toLocaleString("fa-IR");
const validId=id=>/^v\d+$/.test(id)&&+id.slice(1)>=FIRST&&+id.slice(1)<=LAST;
const empty=()=>({read:false,cards:[],attempts:0,last:null,best:null});
const validScore=n=>Number.isInteger(n)&&n>=0&&n<=N;
function sanitize(x){
  const out={schema:1,modules:{}};
  if(!x||x.schema!==1||!x.modules||typeof x.modules!=="object")return out;
  for(const [id,m] of Object.entries(x.modules)){
    if(!validId(id)||!m||typeof m!=="object")continue;
    const a=empty();a.read=m.read===true;
    a.cards=Array.isArray(m.cards)?[...new Set(m.cards.filter(i=>Number.isInteger(i)&&i>=0&&i<N))].sort((a,b)=>a-b):[];
    a.attempts=Number.isSafeInteger(m.attempts)&&m.attempts>=0?m.attempts:0;
    a.last=m.last&&validScore(m.last.right)&&validScore(m.last.answered)&&m.last.right<=m.last.answered&&Number.isFinite(m.last.at)?{right:m.last.right,answered:m.last.answered,at:m.last.at}:null;
    a.best=validScore(m.best)?Math.max(m.best,a.last?.right??0):a.last?.right??null;
    out.modules[id]=a;
  }return out;
}
let available=true;
function load(){try{return sanitize(JSON.parse(localStorage.getItem(KEY)||"null"));}catch(e){available=false;return sanitize(null);}}
let state=load();
function get(id){return state.modules[id]||empty();}
function mutate(id,fn){
  const fresh=load();if(available)state=fresh;
  const m=get(id);fn(m);state.modules[id]=m;
  try{localStorage.setItem(KEY,JSON.stringify(state));available=true;}catch(e){available=false;}
  refresh();
}
function stats(){
  const ms=Object.values(state.modules);
  const attempts=ms.filter(m=>m.last!==null);
  return {read:ms.filter(m=>m.read).length,cards:ms.reduce((s,m)=>s+m.cards.length,0),tested:attempts.length,
    totalAttempts:ms.reduce((s,m)=>s+m.attempts,0),avg:attempts.length?Math.round(100*attempts.reduce((s,m)=>s+m.last.right,0)/(N*attempts.length)):null};
}
function text(tag,t){const e=document.createElement(tag);e.textContent=t;return e;}
function refresh(){
  const s=stats();
  document.querySelectorAll("[data-mabadi-supp-summary]").forEach(e=>{
    e.textContent="مطالعه: "+fa(s.read)+" از "+fa(LAST-FIRST+1)+" بخش | کارت دیده‌شده: "+fa(s.cards)+" از "+fa((LAST-FIRST+1)*N)+" | بخش آزمون‌داده: "+fa(s.tested)+" | دفعات ثبت: "+fa(s.totalAttempts)+(s.avg===null?"":" | میانگین آخرین نمره‌ها: "+fa(s.avg)+"٪");
  });
  document.querySelectorAll("[data-mabadi-supp-status]").forEach(e=>{
    const id=e.dataset.mabadiSuppStatus,m=get(id);
    e.textContent="کارت دیده‌شده: "+fa(m.cards.length)+" از ۱۲ | دفعات آزمون: "+fa(m.attempts)+(m.last?" | آخرین نمره: "+fa(m.last.right)+" از ۱۲ | بهترین: "+fa(m.best)+" از ۱۲":" | هنوز آزمونی ثبت نشده");
  });
  document.querySelectorAll("input[data-mabadi-supp-read]").forEach(e=>{e.checked=get(e.dataset.mabadiSuppRead).read;});
  document.querySelectorAll("[data-mabadi-supp-warning]").forEach(e=>{e.textContent=available?"ذخیره محلی در همین مرورگر؛ بازدید کارت به معنای تسلط نیست.":"ذخیره مرورگر در دسترس نیست؛ پیشرفت این نشست ممکن است با خروج از صفحه از بین برود.";});
}
function init(){
  for(let v=FIRST;v<=LAST;v++){
    const id="v"+v, sec=document.getElementById(id);if(!sec)continue;
    const form=sec.querySelector("form[data-mabadi-answer-key]");
    if(!form)continue;
    let key;try{key=JSON.parse(form.dataset.mabadiAnswerKey)}catch(e){continue}
    if(!Array.isArray(key)||key.length!==N||!key.every(a=>Number.isInteger(a)&&a>=0&&a<=3))continue;
    const panel=document.createElement("div");panel.style.cssText="border:1px solid #dce4db;border-radius:10px;padding:10px;margin:12px 0";
    const label=document.createElement("label"),box=document.createElement("input");box.type="checkbox";box.dataset.mabadiSuppRead=id;
    label.append(box,document.createTextNode(" مطالعه این بخش انجام شد"));panel.append(label);
    const status=text("p","");status.dataset.mabadiSuppStatus=id;status.setAttribute("aria-live","polite");panel.append(status);
    const h=sec.querySelector("h1");if(h)h.after(panel);else sec.prepend(panel);
    box.addEventListener("change",()=>{const checked=box.checked;mutate(id,m=>{m.read=checked;});});
    [...sec.querySelectorAll("details")].slice(0,N).forEach((d,i)=>d.addEventListener("toggle",()=>{if(d.open&&!get(id).cards.includes(i))mutate(id,m=>{m.cards=[...new Set([...m.cards,i])];});}));
    form.addEventListener("submit",()=>{
      const data=new FormData(form);let right=0,answered=0;
      key.forEach((a,i)=>{const v=data.get(id+"q"+i);if(v!==null&&/^[0-3]$/.test(v)){answered++;if(Number(v)===a)right++;}});
      if(!answered)return; // all-blank submits do not count as attempted
      mutate(id,m=>{m.attempts++;m.last={right,answered,at:Date.now()};m.best=Math.max(m.best??0,right);});
    });
  }
  refresh();
  window.addEventListener("storage",e=>{if(e.key===KEY||e.key===null){state=load();refresh();}});
  window.addEventListener("pageshow",()=>{const fresh=load();if(available)state=fresh;refresh();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
