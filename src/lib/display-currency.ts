import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

type Currency='GBP'|'NGN';
type DisplayState={currency:Currency;rate:number|null;date:string|null;ready:boolean};
const KEY='outnow_display_currency_v1';
const WEB='https://www.outnowtickets.com/api/currency/display';
let state:DisplayState={currency:'GBP',rate:null,date:null,ready:false};
let loading:Promise<void>|null=null;
const listeners=new Set<(next:DisplayState)=>void>();
function notify(){for(const callback of listeners)callback({...state});}
function nigeriaLocale(){
  const locale=Intl.DateTimeFormat().resolvedOptions().locale;
  return /-NG\b/i.test(locale);
}
async function load(){
  if(loading)return loading;
  loading=(async()=>{
    let saved:string|null=null;
    try{saved=await SecureStore.getItemAsync(KEY);}catch{}
    if(saved==='NGN'||saved==='GBP'){state={...state,currency:saved};notify();}
    try{
      const response=await fetch(WEB,{headers:{'Accept':'application/json'}});
      if(!response.ok)throw Error('Unable to load exchange rate');
      const result=await response.json();
      const rate=Number(result.displayRate);
      const preferred:Currency=result.country==='NG'||(!result.country&&nigeriaLocale())?'NGN':'GBP';
      state={currency:saved==='NGN'||saved==='GBP'?saved:preferred,
        rate:Number.isFinite(rate)&&rate>0?rate:null,date:result.rateDate||null,ready:true};
    }catch{
      state={...state,currency:saved==='NGN'||saved==='GBP'?saved:nigeriaLocale()?'NGN':'GBP',ready:true};
    }
    notify();
  })();
  return loading;
}
export function useDisplayCurrency(){
  const [current,setCurrent]=useState(state);
  useEffect(()=>{listeners.add(setCurrent);setCurrent({...state});void load();return()=>{listeners.delete(setCurrent);};},[]);
  function setCurrency(currency:Currency){
    state={...state,currency};notify();
    void SecureStore.setItemAsync(KEY,currency).catch(()=>{});
  }
  function money(gbp:number){
    if(current.currency==='NGN'&&current.rate!==null)
      return new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(gbp*current.rate);
    return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(gbp);
  }
  return {...current,setCurrency,money,approximate:current.currency==='NGN'&&current.rate!==null};
}
