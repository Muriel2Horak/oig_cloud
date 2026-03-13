import{f as Es,u as Ms,i as _,a as S,b as l,r as j,w as vt,A as E}from"./vendor.js";import{C as vi,a as Lo,L as Bo,P as Fo,b as Ro,i as No,p as jo,c as Ho,T as zs,d as Os,B as As,e as Is,f as Ds,g as Ls,h as Bs,j as Vo}from"./charts.js";import"date-fns";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const n of a.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&s(n)}).observe(document,{childList:!0,subtree:!0});function i(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(o){if(o.ep)return;o.ep=!0;const a=i(o);fetch(o.href,a)}})();const At="[V2]";function Fs(){return new Date().toISOString().substr(11,12)}function Ue(t,e){const i=Fs(),s=t.toUpperCase().padEnd(5);return`${i} ${s} ${e}`}const b={debug(t,e){typeof window<"u"&&window.OIG_DEBUG&&console.debug(At,Ue("debug",t),e??"")},info(t,e){console.info(At,Ue("info",t),e??"")},warn(t,e){console.warn(At,Ue("warn",t),e??"")},error(t,e,i){const s=e?{error:e.message,stack:e.stack,...i}:i;console.error(At,Ue("error",t),s??"")},time(t){console.time(`${At} ${t}`)},timeEnd(t){console.timeEnd(`${At} ${t}`)},group(t){console.group(`${At} ${t}`)},groupEnd(){console.groupEnd()}};function Rs(){window.addEventListener("error",Ns),window.addEventListener("unhandledrejection",js),b.debug("Error handling setup complete")}function Ns(t){const e=t.error||new Error(t.message);b.error("Uncaught error",e,{filename:t.filename,lineno:t.lineno,colno:t.colno}),t.preventDefault()}function js(t){const e=t.reason instanceof Error?t.reason:new Error(String(t.reason));b.error("Unhandled promise rejection",e),t.preventDefault()}class Wo extends Error{constructor(e,i,s=!1,o){super(e),this.code=i,this.recoverable=s,this.cause=o,this.name="AppError"}}class be extends Wo{constructor(e="Authentication failed"){super(e,"AUTH_ERROR",!1),this.name="AuthError"}}class Ji extends Wo{constructor(e="Network error",i){super(e,"NETWORK_ERROR",!0,i),this.name="NetworkError"}}const Hs="oig_v2_";function Vs(){var t;try{const e=((t=globalThis.navigator)==null?void 0:t.userAgent)||"";return/Home Assistant|HomeAssistant|HAcompanion/i.test(e)}catch{return!1}}function Ws(){var t;try{const e=((t=globalThis.navigator)==null?void 0:t.userAgent)||"",i=/Android|iPhone|iPad|iPod|Mobile/i.test(e),s=globalThis.innerWidth<=768;return i||s}catch{return!1}}const dt={isHaApp:!1,isMobile:!1,reduceMotion:!1};async function qs(){var i,s;b.info("Bootstrap starting"),Rs(),dt.isHaApp=Vs(),dt.isMobile=Ws(),dt.reduceMotion=dt.isHaApp||dt.isMobile||((s=(i=globalThis.matchMedia)==null?void 0:i.call(globalThis,"(prefers-reduced-motion: reduce)"))==null?void 0:s.matches)||!1;const t=document.documentElement;dt.isHaApp&&t.classList.add("oig-ha-app"),dt.isMobile&&t.classList.add("oig-mobile"),dt.reduceMotion&&t.classList.add("oig-reduce-motion");const e={version:"2.0.0",storagePrefix:Hs};return b.info("Bootstrap complete",{...e,isHaApp:dt.isHaApp,isMobile:dt.isMobile,reduceMotion:dt.reduceMotion}),document.createElement("oig-app")}const r={bgPrimary:"var(--primary-background-color, #ffffff)",bgSecondary:"var(--secondary-background-color, #f5f5f5)",textPrimary:"var(--primary-text-color, #212121)",textSecondary:"var(--secondary-text-color, #757575)",accent:"var(--accent-color, #03a9f4)",divider:"var(--divider-color, #e0e0e0)",error:"var(--error-color, #db4437)",success:"var(--success-color, #0f9d58)",warning:"var(--warning-color, #f4b400)",cardBg:"var(--card-background-color, #ffffff)",cardShadow:"var(--shadow-elevation-2dp_-_box-shadow, 0 2px 2px 0 rgba(0,0,0,0.14))",fontFamily:"var(--primary-font-family, system-ui, sans-serif)"},to={"--primary-background-color":"#111936","--secondary-background-color":"#1a2044","--primary-text-color":"#e1e1e1","--secondary-text-color":"rgba(255,255,255,0.7)","--accent-color":"#03a9f4","--divider-color":"rgba(255,255,255,0.12)","--error-color":"#ef5350","--success-color":"#66bb6a","--warning-color":"#ffa726","--card-background-color":"rgba(255,255,255,0.06)","--shadow-elevation-2dp_-_box-shadow":"0 2px 4px 0 rgba(0,0,0,0.4)"},eo={"--primary-background-color":"#ffffff","--secondary-background-color":"#f5f5f5","--primary-text-color":"#212121","--secondary-text-color":"#757575","--accent-color":"#03a9f4","--divider-color":"#e0e0e0","--error-color":"#db4437","--success-color":"#0f9d58","--warning-color":"#f4b400","--card-background-color":"#ffffff","--shadow-elevation-2dp_-_box-shadow":"0 2px 2px 0 rgba(0,0,0,0.14)"};function Ci(){var t,e;try{if(window.parent&&window.parent!==window){const i=(e=(t=window.parent.document)==null?void 0:t.querySelector("home-assistant"))==null?void 0:e.hass;if(i!=null&&i.themes){if(typeof i.themes.darkMode=="boolean")return i.themes.darkMode;const s=(i.themes.theme||"").toLowerCase();if(s.includes("dark"))return!0;if(s.includes("light"))return!1}}}catch{}return window.matchMedia("(prefers-color-scheme: dark)").matches}function Pi(t){const e=t?to:eo,i=document.documentElement;for(const[s,o]of Object.entries(e))i.style.setProperty(s,o);i.classList.toggle("dark",t),document.body.style.background=t?to["--secondary-background-color"]:eo["--secondary-background-color"]}function Us(){const t=Ci();Pi(t),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{const i=Ci();Pi(i)}),setInterval(()=>{const i=Ci(),s=document.documentElement.classList.contains("dark");i!==s&&Pi(i)},5e3)}const io={mobile:768,tablet:1024};function Qt(t){return t<io.mobile?"mobile":t<io.tablet?"tablet":"desktop"}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const C=t=>(e,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Gs={attribute:!0,type:String,converter:Ms,reflect:!1,hasChanged:Es},Ks=(t=Gs,e,i)=>{const{kind:s,metadata:o}=i;let a=globalThis.litPropertyMetadata.get(o);if(a===void 0&&globalThis.litPropertyMetadata.set(o,a=new Map),s==="setter"&&((t=Object.create(t)).wrapped=!0),a.set(i.name,t),s==="accessor"){const{name:n}=i;return{set(c){const d=e.get.call(this);e.set.call(this,c),this.requestUpdate(n,d,t,!0,c)},init(c){return c!==void 0&&this.C(n,void 0,t,c),c}}}if(s==="setter"){const{name:n}=i;return function(c){const d=this[n];e.call(this,c),this.requestUpdate(n,d,t,!0,c)}}throw Error("Unsupported decorator location: "+s)};function u(t){return(e,i)=>typeof i=="object"?Ks(t,e,i):((s,o,a)=>{const n=o.hasOwnProperty(a);return o.constructor.createProperty(a,s),n?Object.getOwnPropertyDescriptor(o,a):void 0})(t,e,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function v(t){return u({...t,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Zs=(t,e,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof e!="object"&&Object.defineProperty(t,e,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function yi(t,e){return(i,s,o)=>{const a=n=>{var c;return((c=n.renderRoot)==null?void 0:c.querySelector(t))??null};return Zs(i,s,{get(){return a(this)}})}}class Ys{constructor(){this.callbacks=new Set,this.watched=new Set,this.watchedPrefixes=new Set,this.unsub=null,this.running=!1,this.getHass=null}registerEntities(e){for(const i of e)typeof i=="string"&&i.length>0&&this.watched.add(i)}registerPrefix(e){var s;if(typeof e!="string"||e.length===0)return;this.watchedPrefixes.add(e);const i=(s=this.getHass)==null?void 0:s.call(this);if(i!=null&&i.states){const o=Object.keys(i.states).filter(a=>a.startsWith(e));this.registerEntities(o)}}onEntityChange(e){return this.callbacks.add(e),()=>{this.callbacks.delete(e)}}async start(e){if(this.running)return;this.getHass=e.getHass;const i=this.getHass();if(!(i!=null&&i.connection)){b.debug("StateWatcher: hass not ready, retrying in 500ms"),setTimeout(()=>this.start(e),500);return}this.running=!0;const s=e.prefixes??[];for(const o of s)this.registerPrefix(o);try{this.unsub=await i.connection.subscribeEvents(o=>this.handleStateChanged(o),"state_changed"),b.info("StateWatcher started",{prefixes:s,watchedCount:this.watched.size})}catch(o){this.running=!1,b.error("StateWatcher failed to subscribe",o)}}stop(){if(this.running=!1,this.unsub)try{this.unsub()}catch{}this.unsub=null,b.info("StateWatcher stopped")}isWatched(e){return this.matchesWatched(e)}destroy(){this.stop(),this.callbacks.clear(),this.watched.clear(),this.watchedPrefixes.clear(),this.getHass=null}matchesWatched(e){if(this.watched.has(e))return!0;for(const i of this.watchedPrefixes)if(e.startsWith(i))return!0;return!1}handleStateChanged(e){var o;const i=(o=e==null?void 0:e.data)==null?void 0:o.entity_id;if(!i||!this.matchesWatched(i))return;const s=e.data.new_state;for(const a of this.callbacks)try{a(i,s)}catch{}}}const Xt=new Ys;class Qs{constructor(e,i="2206237016"){this.subscriptions=new Map,this.cache=new Map,this.stateWatcherUnsub=null,this.hass=e,this.inverterSn=i,this.init()}init(){var e;if((e=this.hass)!=null&&e.states)for(const[i,s]of Object.entries(this.hass.states))this.cache.set(i,s);this.stateWatcherUnsub=Xt.onEntityChange((i,s)=>{s?this.cache.set(i,s):this.cache.delete(i),this.notifySubscribers(i,s)}),b.debug("EntityStore initialized",{entities:this.cache.size,inverterSn:this.inverterSn})}getSensorId(e){return`sensor.oig_${this.inverterSn}_${e}`}findSensorId(e){const i=this.getSensorId(e);for(const s of this.cache.keys()){if(s===i)return s;if(s.startsWith(i+"_")){const o=s.substring(i.length+1);if(/^\d+$/.test(o))return s}}return i}subscribe(e,i){this.subscriptions.has(e)||this.subscriptions.set(e,new Set),this.subscriptions.get(e).add(i),Xt.registerEntities([e]);const s=this.cache.get(e)??null;return i(s),()=>{var o,a;(o=this.subscriptions.get(e))==null||o.delete(i),((a=this.subscriptions.get(e))==null?void 0:a.size)===0&&this.subscriptions.delete(e)}}getNumeric(e){const i=this.cache.get(e);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"&&parseFloat(i.state)||0,lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:0,lastUpdated:null,attributes:{},exists:!1}}getString(e){const i=this.cache.get(e);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"?i.state:"",lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:"",lastUpdated:null,attributes:{},exists:!1}}get(e){return this.cache.get(e)??null}getAll(){return Object.fromEntries(this.cache)}batchLoad(e){const i={};for(const s of e)i[s]=this.getNumeric(s);return i}updateHass(e){if(this.hass=e,e!=null&&e.states)for(const[i,s]of Object.entries(e.states)){const o=this.cache.get(i),a=s;this.cache.set(i,a),((o==null?void 0:o.state)!==a.state||(o==null?void 0:o.last_updated)!==a.last_updated)&&this.notifySubscribers(i,a)}}notifySubscribers(e,i){const s=this.subscriptions.get(e);if(s)for(const o of s)try{o(i)}catch(a){b.error("Entity callback error",a,{entityId:e})}}destroy(){var e;(e=this.stateWatcherUnsub)==null||e.call(this),this.subscriptions.clear(),this.cache.clear(),b.debug("EntityStore destroyed")}}let Ce=null;function Xs(t,e){return Ce&&Ce.destroy(),Ce=new Qs(t,e),Ce}function Vt(){return Ce}const Js=3,ta=1e3;class ea{constructor(){this.hass=null,this.initPromise=null}async getHass(){return this.hass?this.hass:this.initPromise?this.initPromise:(this.initPromise=this.initHass(),this.initPromise)}getHassSync(){return this.hass}async initHass(){b.debug("Initializing HASS client");const e=await this.findHass();return e?(this.hass=e,b.info("HASS client initialized"),e):(b.warn("HASS not found in parent context"),null)}async findHass(){var e,i;if(typeof window>"u")return null;if(window.hass)return window.hass;if(window.parent&&window.parent!==window)try{const s=(i=(e=window.parent.document)==null?void 0:e.querySelector("home-assistant"))==null?void 0:i.hass;if(s)return s}catch{b.debug("Cannot access parent HASS (cross-origin)")}return window.customPanel?window.customPanel.hass:null}async fetchWithAuth(e,i={}){var n,c;const s=await this.getHass();if(!s)throw new be("Cannot get HASS context");try{const p=new URL(e,window.location.href).hostname;if(p!=="localhost"&&p!=="127.0.0.1"&&!e.startsWith("/api/"))throw new Error(`fetchWithAuth rejected for non-localhost URL: ${e}`)}catch(d){if(d.message.includes("rejected"))throw d}const o=(c=(n=s.auth)==null?void 0:n.data)==null?void 0:c.access_token;if(!o)throw new be("No access token available");const a=new Headers(i.headers);return a.set("Authorization",`Bearer ${o}`),a.has("Content-Type")||a.set("Content-Type","application/json"),this.fetchWithRetry(e,{...i,headers:a})}async fetchWithRetry(e,i,s=Js){try{const o=await fetch(e,i);if(!o.ok)throw o.status===401?new be("Token expired or invalid"):new Ji(`HTTP ${o.status}: ${o.statusText}`);return o}catch(o){if(s>0&&o instanceof Ji)return b.warn(`Retrying fetch (${s} left)`,{url:e}),await this.delay(ta),this.fetchWithRetry(e,i,s-1);throw o}}async callApi(e,i,s){const o=await this.getHass();if(!o)throw new be("Cannot get HASS context");return o.callApi(e,i,s)}async callService(e,i,s){const o=await this.getHass();if(!(o!=null&&o.callService))return b.error("Cannot call service — hass not available"),!1;try{return await o.callService(e,i,s),!0}catch(a){return b.error(`Service call failed (${e}.${i})`,a),!1}}async callWS(e){const i=await this.getHass();if(!(i!=null&&i.callWS))throw new be("Cannot get HASS context for WS call");return i.callWS(e)}async fetchOIGAPI(e,i={}){try{const s=`/api/oig_cloud${e.startsWith("/")?"":"/"}${e}`;return await(await this.fetchWithAuth(s,{...i,headers:{"Content-Type":"application/json",...Object.fromEntries(new Headers(i.headers).entries())}})).json()}catch(s){return b.error(`OIG API fetch error for ${e}`,s),null}}async loadBatteryTimeline(e,i="active"){return this.fetchOIGAPI(`/battery_forecast/${e}/timeline?type=${i}`)}async loadUnifiedCostTile(e){return this.fetchOIGAPI(`/battery_forecast/${e}/unified_cost_tile`)}async loadSpotPrices(e){return this.fetchOIGAPI(`/spot_prices/${e}/intervals`)}async loadAnalytics(e){return this.fetchOIGAPI(`/analytics/${e}`)}async loadPlannerSettings(e){return this.fetchOIGAPI(`/battery_forecast/${e}/planner_settings`)}async savePlannerSettings(e,i){return this.fetchOIGAPI(`/battery_forecast/${e}/planner_settings`,{method:"POST",body:JSON.stringify(i)})}async loadDetailTabs(e,i,s="hybrid"){return this.fetchOIGAPI(`/battery_forecast/${e}/detail_tabs?tab=${i}&plan=${s}`)}async loadModules(e){return this.fetchOIGAPI(`/${e}/modules`)}openEntityDialog(e){var i;try{const s=((i=window.parent.document)==null?void 0:i.querySelector("home-assistant"))??document.querySelector("home-assistant");if(!s)return b.warn("Cannot open entity dialog — home-assistant element not found"),!1;const o=new CustomEvent("hass-more-info",{bubbles:!0,composed:!0,detail:{entityId:e}});return s.dispatchEvent(o),!0}catch(s){return b.error("Cannot open entity dialog",s),!1}}async showNotification(e,i,s="success"){await this.callService("persistent_notification","create",{title:e,message:i,notification_id:`oig_dashboard_${Date.now()}`})||console.log(`[${s.toUpperCase()}] ${e}: ${i}`)}getToken(){var e,i,s;return((s=(i=(e=this.hass)==null?void 0:e.auth)==null?void 0:i.data)==null?void 0:s.access_token)??null}delay(e){return new Promise(i=>setTimeout(i,e))}}const tt=new ea,oo={solar:"#ffd54f",battery:"#4caf50",inverter:"#9575cd",grid:"#42a5f5",house:"#f06292"},ve={solar:"linear-gradient(135deg, rgba(255,213,79,0.15) 0%, rgba(255,179,0,0.08) 100%)",battery:"linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(56,142,60,0.08) 100%)",grid:"linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(33,150,243,0.08) 100%)",house:"linear-gradient(135deg, rgba(240,98,146,0.15) 0%, rgba(233,30,99,0.08) 100%)",inverter:"linear-gradient(135deg, rgba(149,117,205,0.15) 0%, rgba(126,87,194,0.08) 100%)"},ye={solar:"rgba(255,213,79,0.4)",battery:"rgba(76,175,80,0.4)",grid:"rgba(66,165,245,0.4)",house:"rgba(240,98,146,0.4)",inverter:"rgba(149,117,205,0.4)"},Ut={solar:"#ffd54f",battery:"#ff9800",grid_import:"#f44336",grid_export:"#4caf50",house:"#f06292"},Ge={solar:5400,battery:7e3,grid:17e3,house:1e4},Fi={solarPower:0,solarP1:0,solarP2:0,solarV1:0,solarV2:0,solarI1:0,solarI2:0,solarPercent:0,solarToday:0,solarForecastToday:0,solarForecastTomorrow:0,batterySoC:0,batteryPower:0,batteryVoltage:0,batteryCurrent:0,batteryTemp:0,batteryChargeTotal:0,batteryDischargeTotal:0,batteryChargeSolar:0,batteryChargeGrid:0,isGridCharging:!1,timeToEmpty:"",timeToFull:"",balancingState:"standby",balancingTimeRemaining:"",gridChargingPlan:{hasBlocks:!1,totalEnergyKwh:0,totalCostCzk:0,windowLabel:null,durationMinutes:0,currentBlockLabel:null,nextBlockLabel:null,blocks:[]},gridPower:0,gridVoltage:0,gridFrequency:0,gridImportToday:0,gridExportToday:0,gridL1V:0,gridL2V:0,gridL3V:0,gridL1P:0,gridL2P:0,gridL3P:0,spotPrice:0,exportPrice:0,currentTariff:"",housePower:0,houseTodayWh:0,houseL1:0,houseL2:0,houseL3:0,inverterMode:"",inverterGridMode:"",inverterGridLimit:0,inverterTemp:0,bypassStatus:"off",notificationsUnread:0,notificationsError:0,boilerIsUse:!1,boilerPower:0,boilerDayEnergy:0,boilerManualMode:"",boilerInstallPower:3e3,plannerAutoMode:null,lastUpdate:""},so=new URLSearchParams(window.location.search),ia=so.get("sn")||so.get("inverter_sn")||"2206237016";function oa(t){return`sensor.oig_${ia}_${t}`}function z(t){if(!(t!=null&&t.state))return 0;const e=parseFloat(t.state);return isNaN(e)?0:e}function bt(t){return!(t!=null&&t.state)||t.state==="unknown"||t.state==="unavailable"?"":t.state}function ao(t,e="on"){if(!(t!=null&&t.state))return!1;const i=t.state.toLowerCase();return i===e||i==="1"||i==="zapnuto"}function sa(t){const e=(t||"").toLowerCase();return e==="charging"?"charging":e==="balancing"||e==="holding"?"holding":e==="completed"?"completed":e==="planned"?"planned":"standby"}function Oi(t){return t==="tomorrow"?"zítra":t==="today"?"dnes":""}function no(t){if(!t)return null;const[e,i]=t.split(":").map(Number);return!Number.isFinite(e)||!Number.isFinite(i)?null:e*60+i}function aa(t){const e=Number(t.grid_import_kwh??t.grid_charge_kwh??0);if(Number.isFinite(e)&&e>0)return e;const i=Number(t.battery_start_kwh??0),s=Number(t.battery_end_kwh??0);return Number.isFinite(i)&&Number.isFinite(s)?Math.max(0,s-i):0}function qo(t=[]){return[...t].sort((e,i)=>{const s=(e.day==="tomorrow"?1:0)-(i.day==="tomorrow"?1:0);return s!==0?s:(e.time_from||"").localeCompare(i.time_from||"")})}function na(t){if(!Array.isArray(t)||t.length===0)return null;const e=qo(t),i=e[0],s=e.at(-1),o=Oi(i==null?void 0:i.day),a=Oi(s==null?void 0:s.day);if(o===a){const w=o?`${o} `:"";return!(i!=null&&i.time_from)||!(s!=null&&s.time_to)?w.trim()||null:`${w}${i.time_from} – ${s.time_to}`}const n=o?`${o} `:"",c=a?`${a} `:"",d=(i==null?void 0:i.time_from)||"--",p=(s==null?void 0:s.time_to)||"--",g=i?`${n}${d}`:"--",f=s?`${c}${p}`:"--";return`${g} → ${f}`}function ra(t){if(!Array.isArray(t)||t.length===0)return 0;let e=0;return t.forEach(i=>{const s=no(i.time_from),o=no(i.time_to);if(s===null||o===null)return;const a=o-s;a>0&&(e+=a)}),e}function ro(t){const e=Oi(t.day),i=e?`${e} `:"",s=t.time_from||"--",o=t.time_to||"--";return`${i}${s} - ${o}`}function la(t){const e=t.find(o=>{const a=(o.status||"").toLowerCase();return a==="running"||a==="active"})||null,i=e?t[t.indexOf(e)+1]||null:t[0]||null;return{runningBlock:e,upcomingBlock:i,shouldShowNext:!!(i&&(!e||i!==e))}}function ca(t){const e=(t==null?void 0:t.attributes)||{},i=Array.isArray(e.charging_blocks)?e.charging_blocks:[],s=qo(i),o=Number(e.total_energy_kwh)||0,a=o>0?o:s.reduce((m,x)=>m+aa(x),0),n=Number(e.total_cost_czk)||0,c=n>0?n:s.reduce((m,x)=>m+Number(x.total_cost_czk||0),0),d=na(s),p=ra(s),{runningBlock:g,upcomingBlock:f,shouldShowNext:w}=la(s);return{hasBlocks:s.length>0,totalEnergyKwh:a,totalCostCzk:c,windowLabel:d,durationMinutes:p,currentBlockLabel:g?ro(g):null,nextBlockLabel:w&&f?ro(f):null,blocks:s}}function da(t){var Gi,Ki,Zi,Yi,Qi,Xi;const e=(t==null?void 0:t.states)||{},i=Ts=>e[oa(Ts)]||null,s=z(i("actual_fv_p1")),o=z(i("actual_fv_p2")),a=z(i("extended_fve_voltage_1")),n=z(i("extended_fve_voltage_2")),c=z(i("extended_fve_current_1")),d=z(i("extended_fve_current_2")),p=i("solar_forecast"),g=(Gi=p==null?void 0:p.attributes)!=null&&Gi.today_total_kwh?parseFloat(p.attributes.today_total_kwh)||0:(Ki=p==null?void 0:p.attributes)!=null&&Ki.today_total_sum_kw?parseFloat(p.attributes.today_total_sum_kw)||0:z(p),f=(Zi=p==null?void 0:p.attributes)!=null&&Zi.tomorrow_total_sum_kw?parseFloat(p.attributes.tomorrow_total_sum_kw)||0:(Yi=p==null?void 0:p.attributes)!=null&&Yi.total_tomorrow_kwh&&parseFloat(p.attributes.total_tomorrow_kwh)||0,w=z(i("batt_bat_c")),m=z(i("batt_batt_comp_p")),x=z(i("extended_battery_voltage")),h=z(i("extended_battery_current")),$=z(i("extended_battery_temperature")),P=z(i("computed_batt_charge_energy_today")),T=z(i("computed_batt_discharge_energy_today")),I=z(i("computed_batt_charge_fve_energy_today")),Y=z(i("computed_batt_charge_grid_energy_today")),H=i("grid_charging_planned"),y=ao(H),F=bt(i("time_to_empty")),it=bt(i("time_to_full")),N=i("battery_balancing"),et=sa((Qi=N==null?void 0:N.attributes)==null?void 0:Qi.current_state),W=bt({state:(Xi=N==null?void 0:N.attributes)==null?void 0:Xi.time_remaining}),V=ca(H),_t=z(i("actual_aci_wtotal")),qe=z(i("extended_grid_voltage")),_i=z(i("ac_in_aci_f")),ki=z(i("ac_in_ac_ad")),ft=z(i("ac_in_ac_pd")),me=z(i("ac_in_aci_vr")),fe=z(i("ac_in_aci_vs")),ct=z(i("ac_in_aci_vt")),Ui=z(i("actual_aci_wr")),zt=z(i("actual_aci_ws")),Ot=z(i("actual_aci_wt")),ns=z(i("spot_price_current_15min")),rs=z(i("export_price_current_15min")),ls=bt(i("current_tariff")),cs=z(i("actual_aco_p")),ds=z(i("ac_out_en_day")),ps=z(i("ac_out_aco_pr")),us=z(i("ac_out_aco_ps")),hs=z(i("ac_out_aco_pt")),gs=bt(i("box_prms_mode")),ms=bt(i("invertor_prms_to_grid")),fs=z(i("invertor_prm1_p_max_feed_grid")),bs=z(i("box_temp")),vs=bt(i("bypass_status"))||"off",ys=z(i("notification_count_unread")),xs=z(i("notification_count_error")),Si=i("boiler_is_use"),$s=Si?ao(Si)||bt(Si)==="Zapnuto":!1,ws=z(i("boiler_current_cbb_w")),_s=z(i("boiler_day_w")),ks=bt(i("boiler_manual_mode")),Ss=z(i("boiler_install_power"))||3e3,Cs=i("real_data_update"),Ps=bt(Cs);return{solarPower:s+o,solarP1:s,solarP2:o,solarV1:a,solarV2:n,solarI1:c,solarI2:d,solarPercent:z(i("dc_in_fv_proc")),solarToday:z(i("dc_in_fv_ad")),solarForecastToday:g,solarForecastTomorrow:f,batterySoC:w,batteryPower:m,batteryVoltage:x,batteryCurrent:h,batteryTemp:$,batteryChargeTotal:P,batteryDischargeTotal:T,batteryChargeSolar:I,batteryChargeGrid:Y,isGridCharging:y,timeToEmpty:F,timeToFull:it,balancingState:et,balancingTimeRemaining:W,gridChargingPlan:V,gridPower:_t,gridVoltage:qe,gridFrequency:_i,gridImportToday:ki,gridExportToday:ft,gridL1V:me,gridL2V:fe,gridL3V:ct,gridL1P:Ui,gridL2P:zt,gridL3P:Ot,spotPrice:ns,exportPrice:rs,currentTariff:ls,housePower:cs,houseTodayWh:ds,houseL1:ps,houseL2:us,houseL3:hs,inverterMode:gs,inverterGridMode:ms,inverterGridLimit:fs,inverterTemp:bs,bypassStatus:vs,notificationsUnread:ys,notificationsError:xs,boilerIsUse:$s,boilerPower:ws,boilerDayEnergy:_s,boilerManualMode:ks,boilerInstallPower:Ss,plannerAutoMode:null,lastUpdate:Ps}}const xe={};function Ke(t,e,i){const s=Math.abs(t),o=Math.min(100,s/e*100),a=Math.max(500,Math.round(3500-o*30));let n=a;return i&&xe[i]!==void 0&&(n=Math.round(.3*a+(1-.3)*xe[i]),Math.abs(n-xe[i])<100&&(n=xe[i])),i&&(xe[i]=n),{active:s>=50,intensity:o,count:Math.max(1,Math.min(4,Math.ceil(1+o/33))),speed:n,size:Math.round(6+o/10),opacity:Math.min(1,.3+o/150)}}function $e(t){return Math.abs(t)>=1e3?`${(t/1e3).toFixed(1)} kW`:`${Math.round(t)} W`}function It(t){return t>=1e3?`${(t/1e3).toFixed(2)} kWh`:`${Math.round(t)} Wh`}function pa(t){return t==="VT"||t.includes("vysoký")?"⚡ VT":t==="NT"||t.includes("nízký")?"🌙 NT":t?`⏰ ${t}`:"--"}function ua(t){return t.includes("Home 1")?{icon:"🏠",text:"Home 1"}:t.includes("Home 2")?{icon:"🔋",text:"Home 2"}:t.includes("Home 3")?{icon:"☀️",text:"Home 3"}:t.includes("UPS")?{icon:"⚡",text:"Home UPS"}:{icon:"⚙️",text:t||"--"}}function ha(t){return t==="Vypnuto / Off"?{display:"Vypnuto",icon:"🚫"}:t==="Zapnuto / On"?{display:"Zapnuto",icon:"💧"}:t.includes("Limited")||t.includes("omezením")?{display:"Omezeno",icon:"🚰"}:{display:t||"--",icon:"💧"}}const ga={"HOME I":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"HOME II":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"HOME III":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"rgba(158, 158, 158, 0.18)",label:"DO NOTHING"},"Mode 0":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"Mode 1":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"Mode 2":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"Mode 3":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"}},lo={timeline:[],labels:[],prices:[],exportPrices:[],modeSegments:[],cheapestBuyBlock:null,expensiveBuyBlock:null,bestExportBlock:null,worstExportBlock:null,solar:null,battery:null,initialZoomStart:null,initialZoomEnd:null,currentSpotPrice:0,currentExportPrice:0,avgSpotPrice:0,plannedConsumption:null,whatIf:null,solarForecastTotal:0},co=new URLSearchParams(window.location.search),Ai=co.get("sn")||co.get("inverter_sn")||"2206237016";function ee(t){return`sensor.oig_${Ai}_${t}`}function po(t){if(!(t!=null&&t.state))return 0;const e=parseFloat(t.state);return isNaN(e)?0:e}function Ii(t){const e=t.getFullYear(),i=String(t.getMonth()+1).padStart(2,"0"),s=String(t.getDate()).padStart(2,"0"),o=String(t.getHours()).padStart(2,"0"),a=String(t.getMinutes()).padStart(2,"0"),n=String(t.getSeconds()).padStart(2,"0");return`${e}-${i}-${s}T${o}:${a}:${n}`}const uo={},ma=5*60*1e3;async function fa(t="hybrid"){const e=uo[t];if(e&&Date.now()-e.ts<ma)return b.debug("Timeline cache hit",{plan:t,age:Math.round((Date.now()-e.ts)/1e3)}),e.data;try{const i=await tt.getHass();if(!i)return[];let s;i.callApi?s=await i.callApi("GET",`oig_cloud/battery_forecast/${Ai}/timeline?type=active`):s=await tt.fetchOIGAPI(`battery_forecast/${Ai}/timeline?type=active`);const o=(s==null?void 0:s.active)||(s==null?void 0:s.timeline)||[];return uo[t]={data:o,ts:Date.now()},b.info("Timeline fetched",{plan:t,points:o.length}),o}catch(i){return b.error("Failed to fetch timeline",i),[]}}function ba(t){const e=new Date,i=new Date(e);return i.setMinutes(Math.floor(e.getMinutes()/15)*15,0,0),t.filter(s=>new Date(s.timestamp)>=i)}function va(t){return t.map(e=>{if(!e.timestamp)return new Date;try{const[i,s]=e.timestamp.split("T");if(!i||!s)return new Date;const[o,a,n]=i.split("-").map(Number),[c,d,p=0]=s.split(":").map(Number);return new Date(o,a-1,n,c,d,p)}catch{return new Date}})}function ya(t){const e=t.mode_name||t.mode_planned||t.mode||t.mode_display||null;if(!e||typeof e!="string")return null;const i=e.trim();return i.length?i:null}function xa(t){return t.startsWith("HOME ")?t.replace("HOME ","").trim():t==="FULL HOME UPS"||t==="HOME UPS"?"UPS":t==="DO NOTHING"?"DN":t.substring(0,3).toUpperCase()}function $a(t){return ga[t]||{icon:"❓",color:"rgba(158, 158, 158, 0.15)",label:t}}function wa(t){if(!t.length)return[];const e=[];let i=null;for(const s of t){const o=ya(s);if(!o){i=null;continue}const a=new Date(s.timestamp),n=new Date(a.getTime()+15*60*1e3);if(i!==null&&i.mode===o)i.end=n;else{const c={mode:o,start:a,end:n};e.push(c),i=c}}return e.map(s=>{const o=$a(s.mode);return{...s,icon:o.icon,color:o.color,label:o.label,shortLabel:xa(s.mode)}})}function Ze(t,e,i=3){const s=Math.floor(i*60/15);if(t.length<s)return null;let o=null,a=e?1/0:-1/0;for(let n=0;n<=t.length-s;n++){const c=t.slice(n,n+s),d=c.map(g=>g.price),p=d.reduce((g,f)=>g+f,0)/d.length;(e&&p<a||!e&&p>a)&&(a=p,o={start:c[0].timestamp,end:c[c.length-1].timestamp,avg:p,min:Math.min(...d),max:Math.max(...d),values:d,type:"cheapest-buy"})}return o}function _a(t,e){const s=((t==null?void 0:t.states)||{})[ee("solar_forecast")];if(!(s!=null&&s.attributes)||!e.length)return null;const o=s.attributes,a=o.today_total_kwh||0,n=o.today_hourly_string1_kw||{},c=o.tomorrow_hourly_string1_kw||{},d=o.today_hourly_string2_kw||{},p=o.tomorrow_hourly_string2_kw||{},g={...n,...c},f={...d,...p},w=(h,$,P)=>h==null||$==null?h||$||0:h+($-h)*P,m=[],x=[];for(const h of e){const $=h.getHours(),P=h.getMinutes(),T=new Date(h);T.setMinutes(0,0,0);const I=Ii(T),Y=new Date(T);Y.setHours($+1);const H=Ii(Y),y=g[I]||0,F=g[H]||0,it=f[I]||0,N=f[H]||0,et=P/60;m.push(w(y,F,et)),x.push(w(it,N,et))}return{string1:m,string2:x,todayTotal:a,hasString1:m.some(h=>h>0),hasString2:x.some(h=>h>0)}}function ka(t,e){if(!t.length)return{arrays:{baseline:[],solarCharge:[],gridCharge:[],gridNet:[],consumption:[]},initialZoomStart:null,initialZoomEnd:null};const i=t.map(f=>new Date(f.timestamp)),s=i[0].getTime(),o=i[i.length-1],a=o?o.getTime():s,n=[],c=[],d=[],p=[],g=[];for(const f of e){const w=Ii(f),m=t.find(x=>x.timestamp===w);if(m){const x=(m.battery_capacity_kwh??m.battery_soc??m.battery_start)||0,h=m.solar_charge_kwh||0,$=m.grid_charge_kwh||0,P=typeof m.grid_net=="number"?m.grid_net:(m.grid_import||0)-(m.grid_export||0),T=m.load_kwh??m.consumption_kwh??m.load??0,I=(Number(T)||0)*4;n.push(x-h-$),c.push(h),d.push($),p.push(P),g.push(I)}else n.push(null),c.push(null),d.push(null),p.push(null),g.push(null)}return{arrays:{baseline:n,solarCharge:c,gridCharge:d,gridNet:p,consumption:g},initialZoomStart:s,initialZoomEnd:a}}function Sa(t){const e=(t==null?void 0:t.states)||{},i=e[ee("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const s=i.attributes,o=s.planned_consumption_today??null,a=s.planned_consumption_tomorrow??null,n=s.profile_today||"Žádný profil",c=e[ee("ac_out_en_day")],d=c==null?void 0:c.state,g=(d&&d!=="unavailable"&&parseFloat(d)||0)/1e3,f=g+(o||0),w=(o||0)+(a||0);let m=null;if(f>0&&a!=null){const h=a-f,$=h/f*100;Math.abs($)<5?m="Zítra podobně":h>0?m=`Zítra více (+${Math.abs($).toFixed(0)}%)`:m=`Zítra méně (-${Math.abs($).toFixed(0)}%)`}return{todayConsumedKwh:g,todayPlannedKwh:o,todayTotalKwh:f,tomorrowKwh:a,totalPlannedKwh:w,profile:n!=="Žádný profil"&&n!=="Neznámý profil"?n:"Žádný profil",trendText:m}}function Ca(t){const i=((t==null?void 0:t.states)||{})[ee("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const o=i.attributes.mode_optimization||{},a=o.alternatives||{},n=o.total_cost_czk||0,c=o.total_savings_vs_home_i_czk||0,d=a["DO NOTHING"],p=(d==null?void 0:d.current_mode)||null;return{totalCost:n,totalSavings:c,alternatives:a,activeMode:p}}async function Pa(t,e="hybrid"){const i=performance.now();b.info("[Pricing] loadPricingData START");try{const s=await fa(e),o=ba(s);if(!o.length)return b.warn("[Pricing] No timeline data"),lo;const a=o.map(V=>({timestamp:V.timestamp,price:V.spot_price_czk||0})),n=o.map(V=>({timestamp:V.timestamp,price:V.export_price_czk||0}));let c=va(a);const d=wa(o),p=Ze(a,!0,3);p&&(p.type="cheapest-buy");const g=Ze(a,!1,3);g&&(g.type="expensive-buy");const f=Ze(n,!1,3);f&&(f.type="best-export");const w=Ze(n,!0,3);w&&(w.type="worst-export");const m=o.map(V=>new Date(V.timestamp)),x=new Set([...c,...m].map(V=>V.getTime()));c=Array.from(x).sort((V,_t)=>V-_t).map(V=>new Date(V));const{arrays:h,initialZoomStart:$,initialZoomEnd:P}=ka(o,c),T=_a(t,c),I=(t==null?void 0:t.states)||{},Y=po(I[ee("spot_price_current_15min")]),H=po(I[ee("export_price_current_15min")]),y=a.length>0?a.reduce((V,_t)=>V+_t.price,0)/a.length:0,F=Sa(t),it=Ca(t),N=(T==null?void 0:T.todayTotal)||0,et={timeline:o,labels:c,prices:a,exportPrices:n,modeSegments:d,cheapestBuyBlock:p,expensiveBuyBlock:g,bestExportBlock:f,worstExportBlock:w,solar:T,battery:h,initialZoomStart:$,initialZoomEnd:P,currentSpotPrice:Y,currentExportPrice:H,avgSpotPrice:y,plannedConsumption:F,whatIf:it,solarForecastTotal:N},W=(performance.now()-i).toFixed(0);return b.info(`[Pricing] loadPricingData COMPLETE in ${W}ms`,{points:o.length,segments:d.length}),et}catch(s){return b.error("[Pricing] loadPricingData failed",s),lo}}const ho={workday_spring:"Pracovní den - Jaro",workday_summer:"Pracovní den - Léto",workday_autumn:"Pracovní den - Podzim",workday_winter:"Pracovní den - Zima",weekend_spring:"Víkend - Jaro",weekend_summer:"Víkend - Léto",weekend_autumn:"Víkend - Podzim",weekend_winter:"Víkend - Zima"},Ta={fve:"FVE",grid:"Síť",alternative:"Alternativa"},Di=new URLSearchParams(window.location.search),Ea=Di.get("sn")||Di.get("inverter_sn")||"2206237016",Je=Di.get("entry_id")||"";function Ma(t,e,i){return isNaN(t)?e:Math.max(e,Math.min(i,t))}function za(t,e,i){if(t==null)return null;const s=e-i;if(s<=0)return null;const o=(t-i)/s*100;return Ma(o,0,100)}function ti(t){if(!t)return"--:--";const e=t instanceof Date?t:new Date(t);return isNaN(e.getTime())?"--:--":e.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}function go(t){if(!t)return"--";const e=new Date(t);return isNaN(e.getTime())?"--":e.toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}function Li(t,e){return`${ti(t)}–${ti(e)}`}function mo(t){return Ta[t||""]||t||"--"}function Uo(t){return t?Object.values(t).reduce((e,i)=>e+(parseFloat(String(i))||0),0):0}function Go(t){return t?Object.entries(t).map(([i,s])=>({hour:parseInt(i,10),value:parseFloat(String(s))||0})).filter(i=>isFinite(i.value)).sort((i,s)=>s.value-i.value).slice(0,3).filter(i=>i.value>0).map(i=>i.hour).sort((i,s)=>i-s):[]}function we(t){if(!t)return null;const e=t.split(":").map(i=>parseInt(i,10));return e.length<2||!isFinite(e[0])||!isFinite(e[1])?null:e[0]*60+e[1]}function fo(t,e,i){return e===null||i===null?!1:e<=i?t>=e&&t<i:t>=e||t<i}async function Oa(){try{return Je?await tt.fetchOIGAPI(`/${Je}/boiler_profile`):(b.warn("[Boiler] No entry_id — cannot fetch boiler profile"),null)}catch(t){return b.warn("[Boiler] Failed to fetch profile",{err:t}),null}}async function Aa(){try{return Je?await tt.fetchOIGAPI(`/${Je}/boiler_plan`):(b.warn("[Boiler] No entry_id — cannot fetch boiler plan"),null)}catch(t){return b.warn("[Boiler] Failed to fetch plan",{err:t}),null}}function Ia(t,e,i){const s=t||e,o=s==null?void 0:s.state,a=(o==null?void 0:o.temperatures)||{},n=(o==null?void 0:o.energy_state)||{},c=isFinite(a.upper_zone??a.top)?a.upper_zone??a.top??null:null,d=isFinite(a.lower_zone??a.bottom)?a.lower_zone??a.bottom??null:null,p=isFinite(n.avg_temp)?n.avg_temp??null:null,g=isFinite(n.energy_needed_kwh)?n.energy_needed_kwh??null:null,f=i.targetTempC??60,w=i.coldInletTempC??10,m=za(p,f,w),x=(t==null?void 0:t.slots)||[],h=(t==null?void 0:t.next_slot)||Da(x);let $="Neplánováno";if(h){const T=mo(h.recommended_source);$=`${Li(h.start,h.end)} (${T})`}const P=mo((o==null?void 0:o.recommended_source)||(h==null?void 0:h.recommended_source));return{currentTemp:(o==null?void 0:o.current_temp)||45,targetTemp:(o==null?void 0:o.target_temp)||f,heating:(o==null?void 0:o.heating)||!1,tempTop:c,tempBottom:d,avgTemp:p,heatingPercent:m,energyNeeded:g,planCost:(t==null?void 0:t.estimated_cost_czk)??null,nextHeating:$,recommendedSource:P,nextProfile:(o==null?void 0:o.next_profile)||"",nextStart:(o==null?void 0:o.next_start)||""}}function Da(t){if(!Array.isArray(t))return null;const e=Date.now();return t.find(i=>{const s=new Date(i.end||i.end_time||"").getTime(),o=i.consumption_kwh??i.avg_consumption_kwh??0;return s>e&&o>0})||null}function La(t){var w,m,x;if(!((w=t==null?void 0:t.slots)!=null&&w.length))return null;const e=t.slots.map(h=>({start:h.start||"",end:h.end||"",consumptionKwh:h.consumption_kwh??h.avg_consumption_kwh??0,recommendedSource:h.recommended_source||"",spotPrice:isFinite(h.spot_price)?h.spot_price??null:null,tempTop:h.temp_top,soc:h.soc})),i=e.filter(h=>h.consumptionKwh>0),s=parseFloat(String(t.total_consumption_kwh))||0,o=parseFloat(String(t.fve_kwh))||0,a=parseFloat(String(t.grid_kwh))||0,n=parseFloat(String(t.alt_kwh))||0,c=parseFloat(String(t.estimated_cost_czk))||0;let d="Mix: --";if(s>0){const h=Math.round(o/s*100),$=Math.round(a/s*100),P=Math.round(n/s*100);d=`Mix: FVE ${h}% · Síť ${$}% · Alt ${P}%`}const p=e.filter(h=>h.consumptionKwh>0&&h.spotPrice!==null).map(h=>({slot:h,price:h.spotPrice}));let g="--",f="--";if(p.length){const h=p.reduce((P,T)=>T.price<P.price?T:P),$=p.reduce((P,T)=>T.price>P.price?T:P);g=`${Li(h.slot.start,h.slot.end)} (${h.price.toFixed(2)} Kč/kWh)`,f=`${Li($.slot.start,$.slot.end)} (${$.price.toFixed(2)} Kč/kWh)`}return{slots:e,totalConsumptionKwh:s,fveKwh:o,gridKwh:a,altKwh:n,estimatedCostCzk:c,nextSlot:t.next_slot?{start:t.next_slot.start||"",end:t.next_slot.end||"",consumptionKwh:t.next_slot.consumption_kwh||0,recommendedSource:t.next_slot.recommended_source||"",spotPrice:t.next_slot.spot_price??null}:null,planStart:go((m=t.slots[0])==null?void 0:m.start),planEnd:go((x=t.slots[t.slots.length-1])==null?void 0:x.end),sourceDigest:d,activeSlotCount:i.length,cheapestSpot:g,mostExpensiveSpot:f}}function Ba(t){const e=parseFloat(String(t==null?void 0:t.fve_kwh))||0,i=parseFloat(String(t==null?void 0:t.grid_kwh))||0,s=parseFloat(String(t==null?void 0:t.alt_kwh))||0,o=e+i+s;return{fveKwh:e,gridKwh:i,altKwh:s,fvePercent:o>0?e/o*100:0,gridPercent:o>0?i/o*100:0,altPercent:o>0?s/o*100:0}}function Fa(t,e,i){var w;const s=(t==null?void 0:t.summary)||{},o=(w=t==null?void 0:t.profiles)==null?void 0:w[i],a=(o==null?void 0:o.hourly_avg)||{},n=s.predicted_total_kwh??Uo(a),c=s.peak_hours??Go(a),d=isFinite(s.water_liters_40c)?s.water_liters_40c??null:null,p=s.circulation_windows||[],g=p.length?p.map(m=>`${m.start}–${m.end}`).join(", "):"--";let f="--";if(p.length){const m=new Date,x=m.getHours()*60+m.getMinutes();if(p.some($=>{const P=we($.start),T=we($.end);return fo(x,P,T)})){const $=p.find(P=>{const T=we(P.start),I=we(P.end);return fo(x,T,I)});f=$?`ANO (do ${$.end})`:"ANO"}else{const $=e==null?void 0:e.state,P=$==null?void 0:$.circulation_recommended;let T=1/0,I=null;for(const Y of p){const H=we(Y.start);if(H===null)continue;let y=H-x;y<0&&(y+=24*60),y<T&&(T=y,I=Y)}P&&I?f=`DOPORUČENO (${I.start}–${I.end})`:I?f=`Ne (další ${I.start}–${I.end})`:f="Ne"}}return{predictedTodayKwh:n,peakHours:c,waterLiters40c:d,circulationWindows:g,circulationNow:f}}function Ra(t){const e=(t==null?void 0:t.config)||{},i=isFinite(e.volume_l)?e.volume_l??null:null;return{volumeL:i,heaterPowerW:null,targetTempC:isFinite(e.target_temp_c)?e.target_temp_c??null:null,deadlineTime:e.deadline_time||"--:--",stratificationMode:e.stratification_mode||"--",kCoefficient:i?(i*.001163).toFixed(4):"--",coldInletTempC:isFinite(e.cold_inlet_temp_c)?e.cold_inlet_temp_c??10:10,configMode:e.config_mode||"simple"}}function Na(t){return t!=null&&t.profiles?Object.entries(t.profiles).map(([e,i])=>({id:e,name:i.name||e,targetTemp:i.target_temp||55,startTime:i.start_time||"06:00",endTime:i.end_time||"22:00",days:i.days||[1,1,1,1,1,0,0],enabled:i.enabled!==!1})):[]}function ja(t){var s;const e=[],i=((s=t==null?void 0:t.summary)==null?void 0:s.today_hours)||[];for(let o=0;o<24;o++){const a=i.includes(o);e.push({hour:o,temp:a?55:25,heating:a})}return e}function Ha(t,e){var n;const i=(n=t==null?void 0:t.profiles)==null?void 0:n[e],s=["Po","Út","St","Čt","Pá","So","Ne"];if(!i)return s.map(c=>({day:c,hours:Array(24).fill(0)}));const o=i.heatmap||[];let a=[];if(o.length>0)a=o.map(c=>c.map(d=>d&&typeof d=="object"?parseFloat(d.consumption)||0:parseFloat(String(d))||0));else{const c=i.hourly_avg||{};a=Array.from({length:7},()=>Array.from({length:24},(d,p)=>parseFloat(String(c[p]||0))))}return s.map((c,d)=>({day:c,hours:a[d]||Array(24).fill(0)}))}function Va(t,e){var p;const i=(p=t==null?void 0:t.profiles)==null?void 0:p[e],s=(t==null?void 0:t.summary)||{},o=(i==null?void 0:i.hourly_avg)||{},a=Array.from({length:24},(g,f)=>parseFloat(String(o[f]||0))),n=s.predicted_total_kwh??Uo(o),c=s.peak_hours??Go(o),d=isFinite(s.avg_confidence)?s.avg_confidence??null:null;return{hourlyAvg:a,peakHours:c,predictedTotalKwh:n,confidence:d,daysTracked:7}}function Wa(t,e){var g,f,w;if(!((g=t==null?void 0:t.slots)!=null&&g.length)||!(e!=null&&e.length))return{fve:"--",grid:"--"};const i=(f=t.slots[0])==null?void 0:f.start,s=(w=t.slots[t.slots.length-1])==null?void 0:w.end,o=i?new Date(i).getTime():null,a=s?new Date(s).getTime():null,n=e.filter(m=>{if(!o||!a)return!0;const x=m.timestamp||m.time;if(!x)return!1;const h=new Date(x).getTime();return h>=o&&h<=a}),c=m=>{const x=[];let h=null;for(const $ of n){const P=$.timestamp||$.time;if(!P)continue;const T=new Date(P),I=m($);I&&!h?h={start:T,end:T}:I&&h?h.end=T:!I&&h&&(x.push(h),h=null)}return h&&x.push(h),x.length?x.map($=>`${ti($.start)}–${ti(new Date($.end.getTime()+15*6e4))}`).join(", "):"--"},d=c(m=>(parseFloat(m.solar_kwh??m.solar_charge_kwh??0)||0)>0),p=c(m=>(parseFloat(m.grid_charge_kwh??0)||0)>0);return{fve:d,grid:p}}async function qa(t){const[e,i]=await Promise.all([Oa(),Aa()]);let s=null;try{const c=await tt.loadBatteryTimeline(Ea,"active");s=(c==null?void 0:c.active)||c||null,Array.isArray(s)&&s.length===0&&(s=null)}catch{}const o=(e==null?void 0:e.current_category)||Object.keys((e==null?void 0:e.profiles)||{})[0]||"workday_summer",a=Object.keys((e==null?void 0:e.profiles)||{}),n=Ra(e);return{state:Ia(i,e,n),plan:La(i),energyBreakdown:Ba(i),predictedUsage:Fa(e,i,o),config:n,profiles:Na(e||i),heatmap:ja(i||e),heatmap7x24:Ha(e,o),profiling:Va(e,o),currentCategory:o,availableCategories:a,forecastWindows:Wa(i,s)}}const bo={efficiency:null,health:null,balancing:null,costComparison:null};function Ua(t){const e=Vt();if(!e)return null;const i=e.findSensorId("battery_efficiency"),s=e.get(i);if(!s)return b.debug("Battery efficiency sensor not found"),null;const o=s.attributes||{},a=o.efficiency_last_month_pct!=null?{efficiency:Number(o.efficiency_last_month_pct??0),charged:Number(o.last_month_charge_kwh??0),discharged:Number(o.last_month_discharge_kwh??0),losses:Number(o.losses_last_month_kwh??0)}:null,n=o.efficiency_current_month_pct!=null?{efficiency:Number(o.efficiency_current_month_pct??0),charged:Number(o.current_month_charge_kwh??0),discharged:Number(o.current_month_discharge_kwh??0),losses:Number(o.losses_current_month_kwh??0)}:null,c=a??n;if(!c)return null;const d=a?"last_month":"current_month",p=a&&n?n.efficiency-a.efficiency:0;return{efficiency:c.efficiency,charged:c.charged,discharged:c.discharged,losses:c.losses,lossesPct:o[d==="last_month"?"losses_last_month_pct":"losses_current_month_pct"]??0,trend:p,period:d,currentMonthDays:o.current_month_days??0,lastMonth:a,currentMonth:n}}function Ga(t){const e=Vt();if(!e)return null;const i=e.findSensorId("battery_health"),s=e.get(i);if(!s)return b.debug("Battery health sensor not found"),null;const o=parseFloat(s.state)||0,a=s.attributes||{};let n,c;return o>=95?(n="excellent",c="Vynikající"):o>=90?(n="good",c="Dobrý"):o>=80?(n="fair",c="Uspokojivý"):(n="poor",c="Špatný"),{soh:o,capacity:a.capacity_p80_last_20??a.current_capacity_kwh??0,nominalCapacity:a.current_capacity_kwh??0,minCapacity:a.capacity_p20_last_20??0,measurementCount:a.measurement_count??0,lastAnalysis:a.last_analysis??"",qualityScore:a.quality_score??null,sohMethod:a.soh_selection_method??null,sohMethodDescription:a.soh_method_description??null,measurementHistory:Array.isArray(a.measurement_history)?a.measurement_history:[],degradation3m:a.degradation_3_months_percent??null,degradation6m:a.degradation_6_months_percent??null,degradation12m:a.degradation_12_months_percent??null,degradationPerYear:a.degradation_per_year_percent??null,estimatedEolDate:a.estimated_eol_date??null,yearsTo80Pct:a.years_to_80pct??null,trendConfidence:a.trend_confidence??null,status:n,statusLabel:c}}function vo(t,e,i){if(!t||!e)return{daysRemaining:null,progressPercent:null,intervalDays:i||null};try{const s=new Date(t),o=new Date(e),a=new Date;if(isNaN(s.getTime())||isNaN(o.getTime()))return{daysRemaining:null,progressPercent:null,intervalDays:i||null};const n=o.getTime()-s.getTime(),c=a.getTime()-s.getTime(),d=Math.max(0,Math.round((o.getTime()-a.getTime())/(1e3*60*60*24))),p=n>0?Math.min(100,Math.max(0,Math.round(c/n*100))):null,g=i||Math.round(n/(1e3*60*60*24));return{daysRemaining:d,progressPercent:p,intervalDays:g||null}}catch{return{daysRemaining:null,progressPercent:null,intervalDays:i||null}}}function Ka(t){const e=Vt();if(!e)return null;const i=e.findSensorId("battery_balancing"),s=e.get(i);if(!s){const d=e.get(e.findSensorId("battery_health")),p=d==null?void 0:d.attributes;if(p!=null&&p.balancing_status){const g=String(p.last_balancing??""),f=p.next_balancing?String(p.next_balancing):null,w=vo(g,f,Number(p.balancing_interval_days??0));return{status:String(p.balancing_status??"unknown"),lastBalancing:g,cost:Number(p.balancing_cost??0),nextScheduled:f,...w,estimatedNextCost:p.estimated_next_cost!=null?Number(p.estimated_next_cost):null}}return null}const o=s.attributes||{},a=String(o.last_balancing??""),n=o.next_scheduled?String(o.next_scheduled):null,c=vo(a,n,Number(o.interval_days??0));return{status:s.state||"unknown",lastBalancing:a,cost:Number(o.cost??0),nextScheduled:n,...c,estimatedNextCost:o.estimated_next_cost!=null?Number(o.estimated_next_cost):null}}async function Za(t){var e,i;try{const s=await tt.loadUnifiedCostTile(t);if(!s)return null;const o=s.hybrid??s,a=o.today??{},n=Math.round((a.actual_cost_so_far??a.actual_total_cost??0)*100)/100,c=a.future_plan_cost??0,d=a.plan_total_cost??n+c,p=((e=o.tomorrow)==null?void 0:e.plan_total_cost)??null;let g=null,f=null,w=null,m=null;try{const x=await tt.loadBatteryTimeline(t,"active"),h=(i=x==null?void 0:x.timeline_extended)==null?void 0:i.yesterday;h!=null&&h.summary&&(g=h.summary.planned_total_cost??null,f=h.summary.actual_total_cost??null,w=h.summary.delta_cost??null,m=h.summary.accuracy_pct??null)}catch{b.debug("Yesterday analysis not available")}return{activePlan:"hybrid",actualSpent:n,planTotalCost:d,futurePlanCost:c,tomorrowCost:p,yesterdayPlannedCost:g,yesterdayActualCost:f,yesterdayDelta:w,yesterdayAccuracy:m}}catch(s){return b.error("Failed to fetch cost comparison",s),null}}async function Ya(t){const e=Ua(),i=Ga(),s=Ka(),o=await Za(t);return{efficiency:e,health:i,balancing:s,costComparison:o}}const Pe={severity:0,warningsCount:0,eventType:"",description:"",instruction:"",onset:"",expires:"",etaHours:0,allWarnings:[],effectiveSeverity:0},Qa={vítr:"💨",déšť:"🌧️",sníh:"❄️",bouřky:"⛈️",mráz:"🥶",vedro:"🥵",mlha:"🌫️",náledí:"🧊",laviny:"🏔️"};function Ko(t){const e=t.toLowerCase();for(const[i,s]of Object.entries(Qa))if(e.includes(i))return s;return"⚠️"}const Zo={0:"Bez výstrahy",1:"Nízká",2:"Zvýšená",3:"Vysoká",4:"Extrémní"},ei={0:"#4CAF50",1:"#8BC34A",2:"#FF9800",3:"#f44336",4:"#9C27B0"};function Xa(t){const e=Vt();if(!e)return Pe;const i=`sensor.oig_${t}_chmu_warning_level`,s=e.get(i);if(!s)return b.debug("ČHMÚ sensor not found",{entityId:i}),Pe;const o=parseInt(s.state,10)||0,a=s.attributes||{},n=Number(a.warnings_count??0),c=String(a.event_type??""),d=String(a.description??""),p=String(a.instruction??""),g=String(a.onset??""),f=String(a.expires??""),w=Number(a.eta_hours??0),m=a.all_warnings_details??[],x=Array.isArray(m)?m.map(P=>({event_type:P.event_type??P.event??"",severity:P.severity??o,description:P.description??"",instruction:P.instruction??"",onset:P.onset??"",expires:P.expires??"",eta_hours:P.eta_hours??0})):[],h=c.toLowerCase().includes("žádná výstraha");return{severity:o,warningsCount:n,eventType:c,description:d,instruction:p,onset:g,expires:f,etaHours:w,allWarnings:x,effectiveSeverity:n===0||h?0:o}}const Yo={"HOME I":{icon:"🏠",color:"#4CAF50",label:"HOME I"},"HOME II":{icon:"⚡",color:"#2196F3",label:"HOME II"},"HOME III":{icon:"🔋",color:"#9C27B0",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"#FF9800",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"#FF9800",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"#9E9E9E",label:"DO NOTHING"}},Qo={yesterday:"📊 Včera",today:"📆 Dnes",tomorrow:"📅 Zítra",history:"📈 Historie",detail:"💎 Detail"};function yo(t){return{modeHistorical:t.mode_historical??t.mode??"",modePlanned:t.mode_planned??"",modeMatch:t.mode_match??!1,status:t.status??"planned",startTime:t.start_time??"",endTime:t.end_time??"",durationHours:t.duration_hours??0,costHistorical:t.cost_historical??null,costPlanned:t.cost_planned??null,costDelta:t.cost_delta??null,solarKwh:t.solar_total_kwh??0,consumptionKwh:t.consumption_total_kwh??0,gridImportKwh:t.grid_import_total_kwh??0,gridExportKwh:t.grid_export_total_kwh??0,intervalReasons:Array.isArray(t.interval_reasons)?t.interval_reasons:[]}}function Ye(t){return{plan:(t==null?void 0:t.plan)??0,actual:(t==null?void 0:t.actual)??null,hasActual:(t==null?void 0:t.has_actual)??!1,unit:(t==null?void 0:t.unit)??""}}function Ja(t){const e=(t==null?void 0:t.metrics)??{};return{overallAdherence:(t==null?void 0:t.overall_adherence)??0,modeSwitches:(t==null?void 0:t.mode_switches)??0,totalCost:(t==null?void 0:t.total_cost)??0,metrics:{cost:Ye(e.cost),solar:Ye(e.solar),consumption:Ye(e.consumption),grid:Ye(e.grid)},completedSummary:t!=null&&t.completed_summary?{count:t.completed_summary.count??0,totalCost:t.completed_summary.total_cost??0,adherencePct:t.completed_summary.adherence_pct??0}:void 0,plannedSummary:t!=null&&t.planned_summary?{count:t.planned_summary.count??0,totalCost:t.planned_summary.total_cost??0}:void 0,progressPct:t==null?void 0:t.progress_pct,actualTotalCost:t==null?void 0:t.actual_total_cost,planTotalCost:t==null?void 0:t.plan_total_cost,vsPlanPct:t==null?void 0:t.vs_plan_pct,eodPrediction:t!=null&&t.eod_prediction?{predictedTotal:t.eod_prediction.predicted_total??0,predictedSavings:t.eod_prediction.predicted_savings??0}:void 0}}function tn(t){return t?{date:t.date??"",modeBlocks:Array.isArray(t.mode_blocks)?t.mode_blocks.map(yo):[],summary:Ja(t.summary),metadata:t.metadata?{activePlan:t.metadata.active_plan??"hybrid",comparisonPlanAvailable:t.metadata.comparison_plan_available}:void 0,comparison:t.comparison?{plan:t.comparison.plan??"",modeBlocks:Array.isArray(t.comparison.mode_blocks)?t.comparison.mode_blocks.map(yo):[]}:void 0}:null}async function en(t,e,i="hybrid"){try{const s=await tt.loadDetailTabs(t,e,i);if(!s)return null;const o=s[e]??s;return tn(o)}catch(s){return b.error(`Failed to load timeline tab: ${e}`,s),null}}const Bi={tiles_left:[null,null,null,null,null,null],tiles_right:[null,null,null,null,null,null],left_count:4,right_count:4,visible:!0,version:1},Xo="oig_dashboard_tiles";function on(t,e){return e==="W"&&Math.abs(t)>=1e3?{value:(t/1e3).toFixed(2),unit:"kW"}:e==="Wh"&&Math.abs(t)>=1e3?{value:(t/1e3).toFixed(2),unit:"kWh"}:e==="W"||e==="Wh"?{value:Math.round(t).toString(),unit:e}:{value:t.toFixed(1),unit:e}}async function sn(){var t;try{const e=await tt.callWS({type:"call_service",domain:"oig_cloud",service:"get_dashboard_tiles",service_data:{},return_response:!0}),i=(t=e==null?void 0:e.response)==null?void 0:t.config;if(i&&typeof i=="object")return b.debug("Loaded tiles config from HA"),$o(i)}catch(e){b.debug("WS tile config load failed, trying localStorage",{error:e.message})}try{const e=localStorage.getItem(Xo);if(e){const i=JSON.parse(e);return b.debug("Loaded tiles config from localStorage"),$o(i)}}catch{b.debug("localStorage tile config load failed")}return Bi}async function xo(t){try{return localStorage.setItem(Xo,JSON.stringify(t)),await tt.callService("oig_cloud","save_dashboard_tiles",{config:JSON.stringify(t)}),b.info("Tiles config saved"),!0}catch(e){return b.error("Failed to save tiles config",e),!1}}function $o(t){return{tiles_left:Array.isArray(t.tiles_left)?t.tiles_left.slice(0,6):Bi.tiles_left,tiles_right:Array.isArray(t.tiles_right)?t.tiles_right.slice(0,6):Bi.tiles_right,left_count:typeof t.left_count=="number"?t.left_count:4,right_count:typeof t.right_count=="number"?t.right_count:4,visible:t.visible!==!1,version:t.version??1}}function Ti(t){var c;const e=Vt();if(!e)return{value:"--",unit:"",isActive:!1,rawValue:0};const i=e.get(t);if(!i||i.state==="unavailable"||i.state==="unknown")return{value:"--",unit:"",isActive:!1,rawValue:0};const s=i.state,o=String(((c=i.attributes)==null?void 0:c.unit_of_measurement)??""),a=parseFloat(s)||0;if(i.entity_id.startsWith("switch.")||i.entity_id.startsWith("binary_sensor."))return{value:s==="on"?"Zapnuto":"Vypnuto",unit:"",isActive:s==="on",rawValue:s==="on"?1:0};const n=on(a,o);return{value:n.value,unit:n.unit,isActive:a!==0,rawValue:a}}function _e(t){const e=(i,s)=>{var a,n;const o=[];for(let c=0;c<s;c++){const d=i[c];if(!d)continue;const p=Ti(d.entity_id),g={};if((a=d.support_entities)!=null&&a.top_right){const f=Ti(d.support_entities.top_right);g.topRight={value:f.value,unit:f.unit}}if((n=d.support_entities)!=null&&n.bottom_right){const f=Ti(d.support_entities.bottom_right);g.bottomRight={value:f.value,unit:f.unit}}o.push({config:d,value:p.value,unit:p.unit,isActive:p.isActive,isZero:p.rawValue===0,formattedValue:p.unit?`${p.value} ${p.unit}`:p.value,supportValues:g})}return o};return{left:e(t.tiles_left,t.left_count),right:e(t.tiles_right,t.right_count)}}async function an(t,e="toggle"){const i=t.split(".")[0];return tt.callService(i,e,{entity_id:t})}function Jt(t){return t==null||Number.isNaN(t)?"-- Wh":Math.abs(t)>=1e3?`${(t/1e3).toFixed(2)} kWh`:`${Math.round(t)} Wh`}function K(t,e="CZK"){return t==null||Number.isNaN(t)?`-- ${e}`:`${t.toFixed(2)} ${e}`}function te(t,e=0){return t==null||Number.isNaN(t)?"-- %":`${t.toFixed(e)} %`}const nn={fridge:"❄️","fridge-outline":"❄️",dishwasher:"🍽️","washing-machine":"🧺","tumble-dryer":"🌪️",stove:"🔥",microwave:"📦","coffee-maker":"☕",kettle:"🫖",toaster:"🍞",lightbulb:"💡","lightbulb-outline":"💡",lamp:"🪔","ceiling-light":"💡","floor-lamp":"🪔","led-strip":"✨","led-strip-variant":"✨","wall-sconce":"💡",chandelier:"💡",thermometer:"🌡️",thermostat:"🌡️",radiator:"♨️","radiator-disabled":"❄️","heat-pump":"♨️","air-conditioner":"❄️",fan:"🌀",hvac:"♨️",fire:"🔥",snowflake:"❄️","lightning-bolt":"⚡",flash:"⚡",battery:"🔋","battery-charging":"🔋","battery-50":"🔋","solar-panel":"☀️","solar-power":"☀️","meter-electric":"⚡","power-plug":"🔌","power-socket":"🔌",car:"🚗","car-electric":"🚘","car-battery":"🔋","ev-station":"🔌","ev-plug-type2":"🔌",garage:"🏠","garage-open":"🏠",door:"🚪","door-open":"🚪",lock:"🔒","lock-open":"🔓","shield-home":"🛡️",cctv:"📹",camera:"📹","motion-sensor":"👁️","alarm-light":"🚨",bell:"🔔","window-closed":"🪟","window-open":"🪟",blinds:"🪟","blinds-open":"🪟",curtains:"🪟","roller-shade":"🪟",television:"📺",speaker:"🔊","speaker-wireless":"🔊",music:"🎵","volume-high":"🔊",cast:"📡",chromecast:"📡","router-wireless":"📡",wifi:"📶","access-point":"📡",lan:"🌐",network:"🌐","home-assistant":"🏠",water:"💧","water-percent":"💧","water-boiler":"♨️","water-pump":"💧",shower:"🚿",toilet:"🚽",faucet:"🚰",pipe:"🔧","weather-sunny":"☀️","weather-cloudy":"☁️","weather-night":"🌙","weather-rainy":"🌧️","weather-snowy":"❄️","weather-windy":"💨",information:"ℹ️","help-circle":"❓","alert-circle":"⚠️","checkbox-marked-circle":"✅","toggle-switch":"🔘",power:"⚡",sync:"🔄"};function ii(t){const e=t.replace(/^mdi:/,"");return nn[e]||"⚙️"}function wo(t,e){let i=!1;return(...s)=>{i||(t(...s),i=!0,setTimeout(()=>i=!1,e))}}async function ke(t,e=3,i=1e3){let s;for(let o=0;o<=e;o++)try{return await t()}catch(a){if(s=a,a instanceof Error&&(a.message.includes("401")||a.message.includes("403")))throw a;if(o<e){const n=Math.min(i*Math.pow(2,o),5e3);await new Promise(c=>setTimeout(c,n))}}throw s}const Jo={home_1:"Home 1",home_2:"Home 2",home_3:"Home 3",home_ups:"Home UPS",home_5:"Home 5",home_6:"Home 6"},_o={"Home 1":"home_1","Home 2":"home_2","Home 3":"home_3","Home UPS":"home_ups","Mode 0":"home_1","Mode 1":"home_2","Mode 2":"home_3","Mode 3":"home_ups","HOME I":"home_1","HOME II":"home_2","HOME III":"home_3","HOME UPS":"home_ups",0:"home_1",1:"home_2",2:"home_3",3:"home_ups"},rn={home_1:"Home 1",home_2:"Home 2",home_3:"Home 3",home_ups:"Home UPS",home_5:"Home 5",home_6:"Home 6"},Xe={off:"Vypnuto",on:"Zapnuto",limited:"S omezením"},ln={off:"Vypnuto / Off",on:"Zapnuto / On",limited:"S omezením / Limited"},ko={Vypnuto:"off",Zapnuto:"on",Omezeno:"limited",Off:"off",On:"on",Limited:"limited"},cn={off:"🚫",on:"💧",limited:"🚰"},ts={cbb:"Inteligentní",manual:"Manuální"},es={cbb:"🤖",manual:"👤"},So={CBB:"cbb",Manuální:"manual",Manual:"manual",Inteligentní:"cbb"},dn={cbb:"CBB",manual:"Manual"},pn={set_box_mode:"🏠 Změna režimu boxu",set_grid_delivery:"💧 Změna nastavení přetoků",set_grid_delivery_limit:"🔢 Změna limitu přetoků",set_boiler_mode:"🔥 Změna nastavení bojleru",set_formating_mode:"🔋 Změna nabíjení baterie",set_battery_capacity:"⚡ Změna kapacity baterie"},Co={CBB:"Inteligentní",Manual:"Manuální",Manuální:"Manuální"},is={status:"idle",activity:"",queueCount:0,runningRequests:[],queuedRequests:[],allRequests:[],currentBoxMode:"home_1",currentGridDelivery:"off",currentGridLimit:0,currentBoilerMode:"cbb",pendingServices:new Map,changingServices:new Set};class un{constructor(){this.state={...is,pendingServices:new Map,changingServices:new Set},this.listeners=new Set,this.watcherUnsub=null,this.queueUpdateInterval=null,this.started=!1}start(){this.started||(this.started=!0,this.watcherUnsub=Xt.onEntityChange((e,i)=>{e&&this.shouldRefreshShield(e)&&this.refresh()}),this.refresh(),this.queueUpdateInterval=window.setInterval(()=>{this.state.allRequests.length>0&&this.notify()},1e3),b.debug("ShieldController started"))}stop(){var e;(e=this.watcherUnsub)==null||e.call(this),this.watcherUnsub=null,this.queueUpdateInterval!==null&&(clearInterval(this.queueUpdateInterval),this.queueUpdateInterval=null),this.started=!1,b.debug("ShieldController stopped")}subscribe(e){return this.listeners.add(e),e(this.state),()=>this.listeners.delete(e)}getState(){return this.state}shouldRefreshShield(e){return["service_shield_","box_prms_mode","boiler_manual_mode","invertor_prms_to_grid","invertor_prm1_p_max_feed_grid"].some(s=>e.includes(s))}refresh(){const e=Vt();if(e)try{const i=e.findSensorId("service_shield_activity"),s=e.get(i),o=(s==null?void 0:s.attributes)??{},a=o.running_requests??[],n=o.queued_requests??[],c=e.findSensorId("service_shield_status"),d=e.findSensorId("service_shield_queue"),p=e.getString(c).value,g=e.getNumeric(d).value,f=e.getString(e.getSensorId("box_prms_mode")).value,w=e.getString(e.getSensorId("invertor_prms_to_grid")).value,m=e.getNumeric(e.getSensorId("invertor_prm1_p_max_feed_grid")).value,x=e.getString(e.getSensorId("boiler_manual_mode")).value,h=_o[f.trim()]??"home_1",$=ko[w.trim()]??"off",P=So[x.trim()]??"cbb",T=a.map((it,N)=>this.parseRequest(it,N,!0)),I=n.map((it,N)=>this.parseRequest(it,N+a.length,!1)),Y=[...T,...I],H=new Map,y=new Set;for(const it of Y){const N=this.parseServiceRequest(it);N&&!H.has(N.type)&&(H.set(N.type,N.targetValue),y.add(N.type))}w.trim()==="Probíhá změna"&&y.add("grid_mode");const F=p==="Running"||p==="running";this.state={status:F?"running":"idle",activity:(s==null?void 0:s.state)??"",queueCount:g,runningRequests:T,queuedRequests:I,allRequests:Y,currentBoxMode:h,currentGridDelivery:$,currentGridLimit:m,currentBoilerMode:P,pendingServices:H,changingServices:y},this.notify()}catch(i){b.error("ShieldController refresh failed",i)}}parseRequest(e,i,s){const o=e.service??"",a=Array.isArray(e.changes)?e.changes:[],n=e.started_at??e.queued_at??e.created_at??e.timestamp??e.created??"",c=e.target_value??e.target_display??"";let d="mode_change";return o.includes("set_box_mode")?d="mode_change":o.includes("set_grid_delivery")&&!o.includes("limit")?d="grid_delivery":o.includes("grid_delivery_limit")||o.includes("set_grid_delivery")?d="grid_limit":o.includes("set_boiler_mode")?d="boiler_mode":o.includes("set_formating_mode")&&(d="battery_formating"),{id:`${o}_${i}_${n}`,type:d,status:s?"running":"queued",service:o,targetValue:c,changes:a,createdAt:n,position:i+1}}parseServiceRequest(e){const i=e.service;if(!i)return null;const s=e.changes.length>0?e.changes[0]:"";if(i.includes("set_grid_delivery")&&s.includes("p_max_feed_grid")){const n=s.match(/→\s*(\d+)/);return n?{type:"grid_limit",targetValue:n[1]}:null}const o=s.match(/→\s*'([^']+)'/),a=o?o[1]:e.targetValue;if(i.includes("set_box_mode"))return{type:"box_mode",targetValue:a};if(i.includes("set_boiler_mode"))return{type:"boiler_mode",targetValue:a};if(i.includes("set_grid_delivery")&&s.includes("prms_to_grid"))return{type:"grid_mode",targetValue:a};if(i.includes("set_grid_delivery")){const n=s.match(/→\s*(\d+)/);return n?{type:"grid_limit",targetValue:n[1]}:{type:"grid_mode",targetValue:a}}return null}getBoxModeButtonState(e){const i=this.state.pendingServices.get("box_mode");return i?_o[i]===e?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoxMode===e?"active":"idle"}getGridDeliveryButtonState(e){if(this.state.changingServices.has("grid_mode")){const i=this.state.pendingServices.get("grid_mode");return i&&ko[i]===e?this.state.status==="running"?"processing":"pending":this.state.pendingServices.has("grid_limit")&&e==="limited"?this.state.status==="running"?"processing":"pending":"disabled-by-service"}return this.state.changingServices.has("grid_limit")?e==="limited"?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentGridDelivery===e?"active":"idle"}getBoilerModeButtonState(e){const i=this.state.pendingServices.get("boiler_mode");return i?So[i]===e?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoilerMode===e?"active":"idle"}isAnyServiceChanging(){return this.state.changingServices.size>0}shouldProceedWithQueue(){return this.state.queueCount<3?!0:window.confirm(`⚠️ VAROVÁNÍ: Fronta již obsahuje ${this.state.queueCount} úkolů!

Každá změna může trvat až 10 minut.
Opravdu chcete přidat další úkol?`)}async setBoxMode(e){const i=rn[e];if(this.state.currentBoxMode===e&&!this.state.changingServices.has("box_mode"))return!1;const s=await tt.callService("oig_cloud","set_box_mode",{mode:i,acknowledgement:!0});return s&&this.refresh(),s}async setGridDelivery(e,i){const s=ln[e],o={acknowledgement:!0,warning:!0};e==="limited"&&i!=null?(this.state.currentGridDelivery==="limited"||(o.mode=s),o.limit=i):i!=null?o.limit=i:o.mode=s;const a=await tt.callService("oig_cloud","set_grid_delivery",o);return a&&this.refresh(),a}async setBoilerMode(e){const i=dn[e];if(this.state.currentBoilerMode===e&&!this.state.changingServices.has("boiler_mode"))return!1;const s=await tt.callService("oig_cloud","set_boiler_mode",{mode:i,acknowledgement:!0});return s&&this.refresh(),s}async removeFromQueue(e){const i=await tt.callService("oig_cloud","shield_remove_from_queue",{position:e});return i&&this.refresh(),i}notify(){for(const e of this.listeners)try{e(this.state)}catch(i){b.error("ShieldController listener error",i)}}}const q=new un;var hn=Object.defineProperty,gn=Object.getOwnPropertyDescriptor,Wt=(t,e,i,s)=>{for(var o=s>1?void 0:s?gn(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&hn(e,i,o),o};const nt=j;let yt=class extends S{constructor(){super(...arguments),this.title="Energetické Toky",this.time="",this.showStatus=!1,this.alertCount=0,this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1}onStatusClick(){this.dispatchEvent(new CustomEvent("status-click",{bubbles:!0}))}onEditClick(){this.dispatchEvent(new CustomEvent("edit-click",{bubbles:!0}))}onResetClick(){this.dispatchEvent(new CustomEvent("reset-click",{bubbles:!0}))}onToggleLeftPanel(){this.dispatchEvent(new CustomEvent("toggle-left-panel",{bubbles:!0}))}onToggleRightPanel(){this.dispatchEvent(new CustomEvent("toggle-right-panel",{bubbles:!0}))}render(){const t=this.alertCount>0?"warning":"ok";return l`
      <h1 class="title">
        <span class="title-icon">⚡</span>
        ${this.title}
        <span class="version">V2</span>
        ${this.time?l`<span class="time">${this.time}</span>`:null}
      </h1>
      
      <div class="spacer"></div>
      
      ${this.showStatus?l`
        <div class="status-badge ${t}" @click=${this.onStatusClick}>
          ${this.alertCount>0?l`
            <span class="status-count">${this.alertCount}</span>
          `:null}
          <span>${this.alertCount>0?"Výstrahy":"OK"}</span>
        </div>
      `:null}
      
       <div class="actions">
         <button class="action-btn ${this.leftPanelCollapsed?"active":""}" @click=${this.onToggleLeftPanel} title="Přepnout levý panel">
           ◀️
         </button>
         <button class="action-btn ${this.rightPanelCollapsed?"active":""}" @click=${this.onToggleRightPanel} title="Přepnout pravý panel">
           ▶️
         </button>
         <button class="action-btn" @click=${this.onEditClick} title="Upravit layout">
           ✏️
         </button>
         <button class="action-btn" @click=${this.onResetClick} title="Reset layout">
           ↺
         </button>
       </div>
    `}};yt.styles=_`
    :host {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: ${nt(r.bgPrimary)};
      border-bottom: 1px solid ${nt(r.divider)};
      gap: 12px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
      color: ${nt(r.textPrimary)};
      margin: 0;
    }

    .title-icon { font-size: 20px; }

    .version {
      font-size: 11px;
      color: ${nt(r.textSecondary)};
      background: ${nt(r.bgSecondary)};
      padding: 2px 6px;
      border-radius: 4px;
    }

    .time {
      font-size: 13px;
      color: ${nt(r.textSecondary)};
      margin-left: 8px;
    }

    .spacer { flex: 1; }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .status-badge.warning {
      background: ${nt(r.warning)};
      color: #fff;
    }

    .status-badge.error {
      background: ${nt(r.error)};
      color: #fff;
    }

    .status-badge.ok {
      background: ${nt(r.success)};
      color: #fff;
    }

    .status-badge:hover { opacity: 0.9; }

    .status-count {
      background: rgba(255,255,255,0.3);
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 11px;
    }

    .actions { display: flex; gap: 8px; }

    .action-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${nt(r.textSecondary)};
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: ${nt(r.bgSecondary)};
      color: ${nt(r.textPrimary)};
    }

    .action-btn.active {
      background: ${nt(r.accent)};
      color: #fff;
    }
  `;Wt([u({type:String})],yt.prototype,"title",2);Wt([u({type:String})],yt.prototype,"time",2);Wt([u({type:Boolean})],yt.prototype,"showStatus",2);Wt([u({type:Number})],yt.prototype,"alertCount",2);Wt([u({type:Boolean})],yt.prototype,"leftPanelCollapsed",2);Wt([u({type:Boolean})],yt.prototype,"rightPanelCollapsed",2);yt=Wt([C("oig-header")],yt);function os(t,e){let i=null;return function(...s){i!==null&&clearTimeout(i),i=window.setTimeout(()=>{t.apply(this,s),i=null},e)}}var mn=Object.defineProperty,fn=Object.getOwnPropertyDescriptor,je=(t,e,i,s)=>{for(var o=s>1?void 0:s?fn(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&mn(e,i,o),o};const Po="oig_v2_theme";let Bt=class extends S{constructor(){super(...arguments),this.mode="auto",this.isDark=!1,this.breakpoint="desktop",this.width=1280,this.mediaQuery=null,this.resizeObserver=null,this.debouncedResize=os(this.updateBreakpoint.bind(this),100),this.onMediaChange=t=>{this.mode==="auto"&&(this.isDark=t.matches,this.dispatchEvent(new CustomEvent("theme-changed",{detail:{isDark:this.isDark}})))},this.onThemeChange=()=>{this.detectTheme()}}connectedCallback(){super.connectedCallback(),this.loadTheme(),this.setupMediaQuery(),this.setupResizeObserver(),this.detectTheme(),window.addEventListener("oig-theme-change",this.onThemeChange)}disconnectedCallback(){var t,e;super.disconnectedCallback(),(t=this.mediaQuery)==null||t.removeEventListener("change",this.onMediaChange),(e=this.resizeObserver)==null||e.disconnect(),window.removeEventListener("oig-theme-change",this.onThemeChange)}loadTheme(){const t=localStorage.getItem(Po);t&&["light","dark","auto"].includes(t)&&(this.mode=t)}saveTheme(){localStorage.setItem(Po,this.mode)}setupMediaQuery(){this.mediaQuery=window.matchMedia("(prefers-color-scheme: dark)"),this.mediaQuery.addEventListener("change",this.onMediaChange)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(this.debouncedResize),this.resizeObserver.observe(document.documentElement),this.updateBreakpoint()}updateBreakpoint(){this.width=window.innerWidth,this.breakpoint=Qt(this.width)}detectTheme(){this.mode==="auto"?this.isDark=window.matchMedia("(prefers-color-scheme: dark)").matches:this.isDark=this.mode==="dark"}setTheme(t){this.mode=t,this.saveTheme(),this.detectTheme(),this.dispatchEvent(new CustomEvent("theme-changed",{detail:{mode:t,isDark:this.isDark}})),b.info("Theme changed",{mode:t,isDark:this.isDark})}getThemeInfo(){return{mode:this.mode,isDark:this.isDark,breakpoint:this.breakpoint,width:this.width}}render(){return l`
      <slot></slot>
    `}};Bt.styles=_`
    :host {
      display: contents;
    }
  `;je([u({type:String})],Bt.prototype,"mode",2);je([v()],Bt.prototype,"isDark",2);je([v()],Bt.prototype,"breakpoint",2);je([v()],Bt.prototype,"width",2);Bt=je([C("oig-theme-provider")],Bt);var bn=Object.defineProperty,vn=Object.getOwnPropertyDescriptor,Ri=(t,e,i,s)=>{for(var o=s>1?void 0:s?vn(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&bn(e,i,o),o};let Te=class extends S{constructor(){super(...arguments),this.tabs=[],this.activeTab=""}onTabClick(t){t!==this.activeTab&&(this.activeTab=t,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tabId:t},bubbles:!0})))}isActive(t){return this.activeTab===t}render(){return l`
      ${this.tabs.map(t=>l`
        <button 
          class="tab ${this.isActive(t.id)?"active":""}"
          @click=${()=>this.onTabClick(t.id)}
        >
          ${t.icon?l`<span class="tab-icon">${t.icon}</span>`:null}
          <span>${t.label}</span>
        </button>
      `)}
    `}};Te.styles=_`
    :host {
      display: flex;
      gap: 8px;
      padding: 0 16px;
      background: ${j(r.bgPrimary)};
      border-bottom: 1px solid ${j(r.divider)};
    }

    .tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 12px 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: ${j(r.textSecondary)};
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab:hover {
      color: ${j(r.textPrimary)};
      background: ${j(r.bgSecondary)};
    }

    .tab.active {
      color: ${j(r.accent)};
      border-bottom-color: ${j(r.accent)};
    }

    .tab-icon {
      font-size: 16px;
    }

    @media (max-width: 768px) {
      :host {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .tab {
        padding: 10px 12px;
        font-size: 13px;
      }

      .tab-icon {
        display: none;
      }
    }
  `;Ri([u({type:Array})],Te.prototype,"tabs",2);Ri([u({type:String})],Te.prototype,"activeTab",2);Te=Ri([C("oig-tabs")],Te);var yn=Object.defineProperty,xn=Object.getOwnPropertyDescriptor,Ni=(t,e,i,s)=>{for(var o=s>1?void 0:s?xn(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&yn(e,i,o),o};const $n="oig_v2_layout_",Ei=j;let Ee=class extends S{constructor(){super(...arguments),this.editable=!1,this.breakpoint="desktop",this.onResize=os(()=>{this.breakpoint=Qt(window.innerWidth)},100)}connectedCallback(){super.connectedCallback(),this.breakpoint=Qt(window.innerWidth),window.addEventListener("resize",this.onResize)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("resize",this.onResize)}updated(t){t.has("breakpoint")&&this.setAttribute("breakpoint",this.breakpoint)}resetLayout(){const t=`${$n}${this.breakpoint}`;localStorage.removeItem(t),this.requestUpdate()}render(){return l`<slot></slot>`}};Ee.styles=_`
    :host {
      display: grid;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      background: ${Ei(r.bgSecondary)};
    }

    :host([breakpoint='mobile']) { grid-template-columns: 1fr; }
    :host([breakpoint='tablet']) { grid-template-columns: repeat(2, 1fr); }
    :host([breakpoint='desktop']) { grid-template-columns: repeat(3, 1fr); }

    .grid-item {
      position: relative;
      background: ${Ei(r.cardBg)};
      border-radius: 8px;
      box-shadow: ${Ei(r.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .grid-item.editable { cursor: move; }
    .grid-item.editable:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .grid-item.dragging { opacity: 0.8; transform: scale(1.02); z-index: 100; }

    @media (max-width: 768px) {
      :host { gap: 12px; padding: 12px; }
    }
  `;Ni([u({type:Boolean})],Ee.prototype,"editable",2);Ni([v()],Ee.prototype,"breakpoint",2);Ee=Ni([C("oig-grid")],Ee);const wn=t=>{const e=t.trim();return e?e.endsWith("W")?e:`${e}W`:""};function To(t,e){const i=e.has("box_mode"),s=t.get("box_mode"),o=e.has("grid_mode")||e.has("grid_limit"),a=t.get("grid_limit"),n=t.get("grid_mode");let c=null;if(a){const d=wn(a);c=d?`→ ${d}`:null}else n&&(c=`→ ${n}`);return{inverterModeChanging:i,inverterModeText:s?`→ ${s}`:null,gridExportChanging:o,gridExportText:c}}var _n=Object.defineProperty,kn=Object.getOwnPropertyDescriptor,xi=(t,e,i,s)=>{for(var o=s>1?void 0:s?kn(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&_n(e,i,o),o};let ie=class extends S{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1}get fillHeight(){return Math.max(0,Math.min(100,this.soc))/100*54}get fillY(){return 13+(54-this.fillHeight)}render(){return l`
      <svg viewBox="0 0 50 80">
        <defs>
          <linearGradient id="bg" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#f44336" />
            <stop offset="25%" stop-color="#ff9800" />
            <stop offset="50%" stop-color="#ffeb3b" />
            <stop offset="75%" stop-color="#8bc34a" />
            <stop offset="100%" stop-color="#4caf50" />
          </linearGradient>
        </defs>
        <!-- Outline -->
        <rect x="5" y="10" width="40" height="60" rx="4" ry="4" class="battery-outline" />
        <!-- Terminal -->
        <rect x="18" y="2" width="14" height="8" rx="2" ry="2" class="battery-terminal" />
        <!-- Fill -->
        <rect
          x="8"
          y="${this.fillY}"
          width="34"
          height="${this.fillHeight}"
          rx="2"
          ry="2"
          class="battery-fill ${this.charging?"charging":""}"
          fill="url(#bg)"
        />
        <!-- Grid charging lightning -->
        <text
          x="25" y="45"
          class="battery-lightning ${this.gridCharging?"active":""}"
          text-anchor="middle"
          dominant-baseline="middle"
        >⚡</text>
      </svg>
    `}};ie.styles=_`
    :host {
      display: inline-block;
      width: 35px;
      height: 56px;
    }

    svg {
      width: 100%;
      height: 100%;
    }

    .battery-outline {
      fill: none;
      stroke: var(--primary-text-color, #212121);
      stroke-width: 2;
    }

    .battery-terminal {
      fill: var(--primary-text-color, #212121);
    }

    .battery-fill {
      transition: height 0.6s ease, y 0.6s ease;
    }

    .battery-fill.charging {
      animation: pulse-fill 1.5s ease-in-out infinite;
    }

    .battery-lightning {
      font-size: 22px;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }

    .battery-lightning.active {
      opacity: 1;
      animation: lightning-pulse 1s ease-in-out infinite;
    }

    @keyframes pulse-fill {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    @keyframes lightning-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
  `;xi([u({type:Number})],ie.prototype,"soc",2);xi([u({type:Boolean})],ie.prototype,"charging",2);xi([u({type:Boolean})],ie.prototype,"gridCharging",2);ie=xi([C("oig-battery-gauge")],ie);var Sn=Object.defineProperty,Cn=Object.getOwnPropertyDescriptor,$i=(t,e,i,s)=>{for(var o=s>1?void 0:s?Cn(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&Sn(e,i,o),o};let oe=class extends S{constructor(){super(...arguments),this.power=0,this.percent=0,this.maxPower=5400}get isNight(){return this.percent<2}get level(){return this.percent<2?"night":this.percent<20?"low":this.percent<65?"mid":"high"}get sunColor(){const t=this.level;return t==="low"?"#b0bec5":t==="mid"?"#ffd54f":"#ffb300"}get rayLen(){const t=this.level;return t==="low"?4:t==="mid"?7:10}get rayOpacity(){const t=this.level;return t==="low"?.5:t==="mid"?.8:1}get coreRadius(){const t=this.level;return t==="low"?7:t==="mid"?9:11}renderMoon(){return vt`
      <circle cx="24" cy="24" r="20" fill="#3949ab" opacity="0.28"/>
      <g class="moon-body">
        <path d="M24 6 A18 18 0 1 0 24 42 A13 13 0 1 1 24 6Z" fill="#cfd8dc" opacity="0.95"/>
      </g>
      <circle class="star" cx="7" cy="10" r="1.5" fill="#e8eaf6" style="animation-delay:0s"/>
      <circle class="star" cx="41" cy="7" r="1.8" fill="#e8eaf6" style="animation-delay:0.7s"/>
      <circle class="star" cx="5" cy="30" r="1.2" fill="#c5cae9" style="animation-delay:1.4s"/>
      <circle class="star" cx="6" cy="44" r="1.0" fill="#c5cae9" style="animation-delay:2.1s"/>
      <circle class="star" cx="42" cy="39" r="1.3" fill="#e8eaf6" style="animation-delay:2.8s"/>
    `}renderSun(){const i=this.coreRadius,s=i+3,o=s+this.rayLen,a=this.sunColor,n=this.rayOpacity,d=[0,45,90,135,180,225,270,315].map(g=>{const f=g*Math.PI/180,w=24+Math.cos(f)*s,m=24+Math.sin(f)*s,x=24+Math.cos(f)*o,h=24+Math.sin(f)*o;return vt`
        <line class="ray"
          x1="${w}" y1="${m}" x2="${x}" y2="${h}"
          stroke="${a}" stroke-width="2.5" opacity="${n}"
        />
      `}),p=this.level==="low";return vt`
      <!-- Paprsky obaleny v <g> pro CSS rotaci -->
      <g class="rays-group">
        ${d}
      </g>
      <circle class="sun-core" cx="${24}" cy="${24}" r="${i}" fill="${a}" />
      ${p?vt`
        <!-- Jednoduchý obláček -->
        <g class="cloud" opacity="0.85">
          <ellipse cx="30" cy="30" rx="9" ry="6" fill="#90a4ae"/>
          <ellipse cx="24" cy="32" rx="7" ry="5" fill="#90a4ae"/>
          <ellipse cx="36" cy="32" rx="6" ry="4.5" fill="#90a4ae"/>
        </g>
      `:""}
    `}render(){return this.percent>=20?this.classList.add("solar-active"):this.classList.remove("solar-active"),l`
      <svg viewBox="0 0 48 48">
        ${this.isNight?this.renderMoon():this.renderSun()}
      </svg>
    `}};oe.styles=_`
    :host { display: inline-block; width: 48px; height: 48px; }
    svg { width: 100%; height: 100%; overflow: visible; }

    .sun-core {
      transition: r 0.8s ease, fill 0.8s ease;
    }
    .ray {
      stroke-linecap: round;
      transition: stroke-dasharray 0.8s ease, stroke 0.8s ease, opacity 0.8s ease;
    }
    .moon-body {
      animation: moon-pulse 4s ease-in-out infinite;
    }
    @keyframes moon-pulse {
      0%, 100% { opacity: 0.85; }
      50% { opacity: 1; }
    }
    .star {
      animation: star-twinkle 3s ease-in-out infinite;
    }
    @keyframes star-twinkle {
      0%, 100% { opacity: 0.25; }
      50% { opacity: 1; }
    }
    .cloud {
      transition: opacity 0.6s ease;
    }

    /* Pomalá rotace paprsků při výkonu ≥ 20 % */
    :host(.solar-active) .rays-group {
      animation: solar-rotate 20s linear infinite;
      transform-origin: 24px 24px;
    }
    @keyframes solar-rotate {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
  `;$i([u({type:Number})],oe.prototype,"power",2);$i([u({type:Number})],oe.prototype,"percent",2);$i([u({type:Number})],oe.prototype,"maxPower",2);oe=$i([C("oig-solar-icon")],oe);var Pn=Object.defineProperty,Tn=Object.getOwnPropertyDescriptor,He=(t,e,i,s)=>{for(var o=s>1?void 0:s?Tn(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&Pn(e,i,o),o};let Ft=class extends S{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1,this.discharging=!1,this._clipId=`batt-clip-${Math.random().toString(36).slice(2)}`}get fillColor(){return this.gridCharging?"#42a5f5":this.soc>50?"#4caf50":this.soc>20?"#ff9800":"#f44336"}get fillHeight(){return Math.max(1,Math.min(100,this.soc)/100*48)}get fillY(){return 14+(48-this.fillHeight)}get stripeColor(){return this.gridCharging?"#90caf9":"#a5d6a7"}render(){const t=this.charging||this.gridCharging,e=this.soc>=25;return l`
      <svg viewBox="0 0 32 68">
        <!-- Terminal (horní pólík) -->
        <rect class="terminal" x="11" y="0" width="10" height="5" rx="1.5"/>

        <!-- Obrys baterie -->
        <rect class="outline" x="2" y="5" width="28" height="62" rx="4"/>

        <!-- Clippath pro výplň -->
        <defs>
          <clipPath id="${this._clipId}">
            <rect x="4" y="7" width="24" height="58" rx="3"/>
          </clipPath>
        </defs>

        <!-- Výplň podle SoC -->
        <rect
          class="fill-bar"
          x="4"
          y="${this.fillY}"
          width="24"
          height="${this.fillHeight}"
          rx="2"
          fill="${this.fillColor}"
          clip-path="url(#${this._clipId})"
        />

        <!-- Animovaný pruh při nabíjení -->
        ${t?vt`
          <rect
            class="charge-stripe active"
            x="4" y="52" width="24" height="8" rx="2"
            fill="${this.stripeColor}"
            clip-path="url(#${this._clipId})"
          />
        `:""}

        <!-- SoC text uvnitř -->
        ${e?vt`
          <text class="soc-text" x="16" y="${this.fillY+this.fillHeight/2}">
            ${Math.round(this.soc)}%
          </text>
        `:""}
      </svg>
    `}};Ft.styles=_`
    :host { display: inline-block; width: 32px; height: 52px; }
    svg { width: 100%; height: 100%; overflow: visible; }

    .outline {
      fill: none;
      stroke: var(--primary-text-color, #cfd8dc);
      stroke-width: 2;
      opacity: 0.7;
    }
    .terminal {
      fill: var(--primary-text-color, #cfd8dc);
      opacity: 0.7;
    }
    .fill-bar {
      transition: height 0.8s ease, y 0.8s ease, fill 0.8s ease;
    }
    .charge-stripe {
      opacity: 0;
    }
    .charge-stripe.active {
      opacity: 1;
      animation: stripe-move 1.2s linear infinite;
    }
    .soc-text {
      font-size: 8px;
      font-weight: 700;
      fill: rgba(255,255,255,0.9);
      dominant-baseline: middle;
      text-anchor: middle;
      pointer-events: none;
    }

    @keyframes stripe-move {
      0%   { transform: translateY(6px); opacity: 0.7; }
      80%  { opacity: 0.4; }
      100% { transform: translateY(-30px); opacity: 0; }
    }
  `;He([u({type:Number})],Ft.prototype,"soc",2);He([u({type:Boolean})],Ft.prototype,"charging",2);He([u({type:Boolean})],Ft.prototype,"gridCharging",2);He([u({type:Boolean})],Ft.prototype,"discharging",2);Ft=He([C("oig-battery-icon")],Ft);var En=Object.defineProperty,Mn=Object.getOwnPropertyDescriptor,ss=(t,e,i,s)=>{for(var o=s>1?void 0:s?Mn(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&En(e,i,o),o};let oi=class extends S{constructor(){super(...arguments),this.power=0}get mode(){return this.power>50?"importing":this.power<-50?"exporting":"idle"}render(){const t=this.mode;return l`
      <svg viewBox="0 0 48 48">
        <!-- Dva malé stožáry v pozadí — ikona sítě -->
        <line class="pylon" x1="8" y1="44" x2="8" y2="14"/>
        <line class="pylon" x1="4" y1="18" x2="12" y2="18"/>
        <line class="pylon" x1="5" y1="22" x2="11" y2="22"/>

        <line class="pylon" x1="40" y1="44" x2="40" y2="14"/>
        <line class="pylon" x1="36" y1="18" x2="44" y2="18"/>
        <line class="pylon" x1="37" y1="22" x2="43" y2="22"/>

        <!-- Dráty -->
        <line class="pylon" x1="8" y1="18" x2="40" y2="18" opacity="0.2"/>
        <line class="pylon" x1="8" y1="22" x2="40" y2="22" opacity="0.2"/>

        <!-- Sinusoida -->
        <path class="sine ${t}" d="${"M 2,28 C 8,28 8,16 14,20 C 20,24 20,32 26,32 C 32,32 32,20 38,20 C 44,20 44,28 46,28"}"/>

        <!-- Šipka směru -->
        ${t!=="idle"?l`
          <path
            class="arrow ${t==="importing"?"import":"export"}"
            d="${t==="importing"?"M 24,10 L 24,4 M 24,4 L 20,8 M 24,4 L 28,8":"M 24,4 L 24,10 M 24,10 L 20,6 M 24,10 L 28,6"}"
          />
        `:""}
      </svg>
    `}};oi.styles=_`
    :host { display: inline-block; width: 48px; height: 48px; }
    svg { width: 100%; height: 100%; overflow: visible; }

    .sine {
      fill: none;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: stroke 0.6s ease;
    }
    .sine.idle {
      stroke: #607d8b;
      opacity: 0.5;
    }
    .sine.importing {
      stroke: #42a5f5;
      stroke-dasharray: 60;
      animation: flow-right 1s linear infinite;
    }
    .sine.exporting {
      stroke: #66bb6a;
      stroke-dasharray: 60;
      animation: flow-left 1s linear infinite;
    }

    .arrow {
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
      transition: stroke 0.6s ease, opacity 0.4s ease;
    }
    .arrow.import { stroke: #42a5f5; }
    .arrow.export { stroke: #66bb6a; }
    .arrow.hidden { opacity: 0; }

    /* Vertikální stožáry přenosové soustavy — ikonický motiv */
    .pylon {
      stroke: var(--primary-text-color, #90a4ae);
      stroke-width: 1.2;
      fill: none;
      opacity: 0.35;
    }

    @keyframes flow-right {
      from { stroke-dashoffset: 60; }
      to   { stroke-dashoffset: 0; }
    }
    @keyframes flow-left {
      from { stroke-dashoffset: 0; }
      to   { stroke-dashoffset: 60; }
    }
  `;ss([u({type:Number})],oi.prototype,"power",2);oi=ss([C("oig-grid-icon")],oi);var zn=Object.defineProperty,On=Object.getOwnPropertyDescriptor,wi=(t,e,i,s)=>{for(var o=s>1?void 0:s?On(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&zn(e,i,o),o};let se=class extends S{constructor(){super(...arguments),this.power=0,this.maxPower=1e4,this.boilerActive=!1}get percent(){return Math.min(100,this.power/Math.max(1,this.maxPower)*100)}get fillColor(){const t=this.percent;return t<15?"#546e7a":t<40?"#f06292":t<70?"#e91e63":"#c62828"}get level(){const t=this.percent;return t<15?"low":t<60?"mid":"high"}get windowColor(){const t=this.level;return t==="low"?"#37474f":t==="mid"?"#ffd54f":"#ffb300"}render(){const t=this.percent,e=24,i=22,s=Math.max(1,t/100*e),o=i+(e-s),a=this.level;return l`
      <svg viewBox="0 0 48 48">
        <defs>
          <clipPath id="house-clip">
            <rect x="8" y="${i}" width="32" height="${e}" rx="1"/>
          </clipPath>
        </defs>

        <!-- Střecha (trojúhelník) -->
        <polygon
          class="roof ${a!=="low"?"active":""}"
          points="4,24 24,6 44,24"
        />
        <!-- Obrys střechy -->
        <polyline
          points="4,24 24,6 44,24"
          fill="none"
          stroke="var(--primary-text-color, #b0bec5)"
          stroke-width="1.8"
          opacity="0.55"
          stroke-linejoin="round"
        />

        <!-- Tělo domečku -->
        <rect
          class="walls ${a!=="low"?"active":""}"
          x="8" y="${i}" width="32" height="${e}" rx="1"
        />

        <!-- Výplň spotřeby -->
        <rect
          class="fill-bar"
          x="8" y="${o}" width="32" height="${s}"
          fill="${this.fillColor}"
          clip-path="url(#house-clip)"
        />

        <!-- Dvě okna -->
        <rect class="window" x="12" y="27" width="8" height="7" rx="1" fill="${this.windowColor}" opacity="${a==="low"?.3:.85}"/>
        <rect class="window" x="28" y="27" width="8" height="7" rx="1" fill="${this.windowColor}" opacity="${a==="low"?.3:.85}"/>

        <!-- Dveře -->
        <rect x="20" y="33" width="8" height="13" rx="1"
          fill="none"
          stroke="var(--primary-text-color, #b0bec5)"
          stroke-width="1.2"
          opacity="0.35"
        />

        <!-- Bojler indikátor (malý plamen vlevo dole) -->
        ${this.boilerActive?vt`
          <circle class="boiler-dot" cx="10" cy="43" r="3.5" fill="#ff5722" opacity="0.9"/>
          <text x="10" y="43" text-anchor="middle" dominant-baseline="middle" font-size="5" fill="white">🔥</text>
        `:""}
      </svg>
    `}};se.styles=_`
    :host { display: inline-block; width: 48px; height: 48px; }
    svg { width: 100%; height: 100%; overflow: visible; }

    .roof {
      fill: var(--primary-text-color, #b0bec5);
      opacity: 0.25;
      transition: opacity 0.6s ease;
    }
    .roof.active { opacity: 0.55; }

    .walls {
      fill: none;
      stroke: var(--primary-text-color, #b0bec5);
      stroke-width: 1.8;
      opacity: 0.45;
      transition: opacity 0.6s ease;
    }
    .walls.active { opacity: 0.8; }

    .fill-bar {
      transition: height 0.8s ease, y 0.8s ease, fill 0.8s ease;
      rx: 1;
    }

    .window {
      transition: fill 0.6s ease, opacity 0.6s ease;
    }

    .boiler-dot {
      transition: opacity 0.4s ease;
    }
  `;wi([u({type:Number})],se.prototype,"power",2);wi([u({type:Number})],se.prototype,"maxPower",2);wi([u({type:Boolean})],se.prototype,"boilerActive",2);se=wi([C("oig-house-icon")],se);var An=Object.defineProperty,In=Object.getOwnPropertyDescriptor,Ve=(t,e,i,s)=>{for(var o=s>1?void 0:s?In(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&An(e,i,o),o};let Rt=class extends S{constructor(){super(...arguments),this.mode="",this.bypassActive=!1,this.hasAlarm=!1,this.plannerAuto=!1}get modeType(){return this.hasAlarm?"alarm":this.bypassActive?"bypass":this.mode.includes("UPS")?"ups":"normal"}render(){const t=this.modeType;return l`
      <svg viewBox="0 0 48 48">
        <!-- Hlavní box střídače -->
        <rect
          class="box ${t}"
          x="4" y="8" width="40" height="34" rx="5"
        />

        <!-- Sinusoida výstupu -->
        <path class="sine-out ${t}" d="${"M 10,28 C 14,28 14,20 18,22 C 22,24 22,32 26,32 C 30,32 30,20 34,22 C 38,24 38,28 38,28"}"/>

        <!-- UPS blesk -->
        ${t==="ups"?vt`
          <path class="ups-bolt active"
            d="M 25,12 L 20,26 L 24,26 L 23,36 L 28,22 L 24,22 Z"
          />
        `:""}

        <!-- Bypass výstraha — trojúhelník nahoře -->
        ${t==="bypass"?vt`
          <polygon
            class="warning-triangle active"
            points="24,6 18,16 30,16"
          />
          <text x="24" y="15" text-anchor="middle" dominant-baseline="middle"
            font-size="6" font-weight="bold" fill="#fff">!</text>
        `:""}

        <!-- Alarm kroužek -->
        ${t==="alarm"?vt`
          <circle class="alarm-ring active" cx="24" cy="25" r="6"/>
          <text x="24" y="26" text-anchor="middle" dominant-baseline="middle"
            font-size="8" font-weight="bold" fill="#f44336">!</text>
        `:""}

        <!-- Plánovač aktivní — zelená tečka dole uprostřed -->
        <circle
          class="planner-dot ${this.plannerAuto?"active":""}"
          cx="24" cy="46" r="3"
        />

        <!-- Vstupní / výstupní konektory (dekorativní čárky) -->
        <line x1="4" y1="18" x2="0" y2="18"
          stroke="#9575cd" stroke-width="1.5" opacity="0.4"/>
        <line x1="44" y1="18" x2="48" y2="18"
          stroke="#9575cd" stroke-width="1.5" opacity="0.4"/>
      </svg>
    `}};Rt.styles=_`
    :host { display: inline-block; width: 48px; height: 48px; }
    svg { width: 100%; height: 100%; overflow: visible; }

    .box {
      fill: none;
      stroke: #9575cd;
      stroke-width: 2;
      rx: 5;
      opacity: 0.7;
      transition: stroke 0.5s ease;
    }
    .box.alarm { stroke: #f44336; }
    .box.bypass { stroke: #ff9800; }

    .sine-out {
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      transition: stroke 0.5s ease;
    }
    .sine-out.normal  { stroke: #9575cd; opacity: 0.9; }
    .sine-out.bypass  { stroke: #ff9800; opacity: 0.9; }
    .sine-out.alarm   { stroke: #f44336; }
    .sine-out.ups     { stroke: #42a5f5; }

    .warning-triangle {
      fill: #ff9800;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .warning-triangle.active { opacity: 1; }

    .alarm-ring {
      fill: none;
      stroke: #f44336;
      stroke-width: 2;
      opacity: 0;
    }
    .alarm-ring.active {
      opacity: 1;
      animation: alarm-pulse 1.4s ease-in-out infinite;
    }

    .planner-dot {
      fill: #4caf50;
      opacity: 0;
      transition: opacity 0.4s;
    }
    .planner-dot.active { opacity: 1; }

    .ups-bolt {
      fill: #42a5f5;
      opacity: 0;
    }
    .ups-bolt.active { opacity: 0.85; }

    @keyframes alarm-pulse {
      0%, 100% { opacity: 0.3; r: 6; }
      50%       { opacity: 1;   r: 8; }
    }
  `;Ve([u({type:String})],Rt.prototype,"mode",2);Ve([u({type:Boolean})],Rt.prototype,"bypassActive",2);Ve([u({type:Boolean})],Rt.prototype,"hasAlarm",2);Ve([u({type:Boolean})],Rt.prototype,"plannerAuto",2);Rt=Ve([C("oig-inverter-icon")],Rt);var Dn=Object.defineProperty,Ln=Object.getOwnPropertyDescriptor,$t=(t,e,i,s)=>{for(var o=s>1?void 0:s?Ln(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&Dn(e,i,o),o};const B=j,Eo=new URLSearchParams(window.location.search),Bn=Eo.get("sn")||Eo.get("inverter_sn")||"2206237016",Fn=t=>`sensor.oig_${Bn}_${t}`,Mi="oig_v2_flow_layout_",Dt=["solar","battery","inverter","grid","house"],Rn={solar:{top:"0%",left:"0%"},house:{top:"0%",left:"65%"},inverter:{top:"35%",left:"35%"},grid:{top:"70%",left:"0%"},battery:{top:"70%",left:"65%"}};function M(t){return()=>tt.openEntityDialog(Fn(t))}let gt=class extends S{constructor(){super(...arguments),this.data=Fi,this.editMode=!1,this.pendingServices=new Map,this.changingServices=new Set,this.shieldStatus="idle",this.shieldQueueCount=0,this.shieldUnsub=null,this.expandedNodes=new Set,this.customPositions={},this.draggedNodeId=null,this.dragStartX=0,this.dragStartY=0,this.dragStartTop=0,this.dragStartLeft=0,this.onShieldUpdate=t=>{this.pendingServices=t.pendingServices,this.changingServices=t.changingServices,this.shieldStatus=t.status,this.shieldQueueCount=t.queueCount},this.handleDragStart=t=>{if(!this.editMode)return;t.preventDefault(),t.stopPropagation();const i=t.target.closest(".node");if(!i)return;const s=this.findNodeId(i);if(!s)return;this.draggedNodeId=s,i.classList.add("dragging");const o=i.getBoundingClientRect();this.dragStartX=t.clientX,this.dragStartY=t.clientY,this.dragStartTop=o.top,this.dragStartLeft=o.left},this.handleTouchStart=t=>{if(!this.editMode)return;t.preventDefault();const i=t.target.closest(".node");if(!i)return;const s=this.findNodeId(i);if(!s)return;this.draggedNodeId=s,i.classList.add("dragging");const o=t.touches[0],a=i.getBoundingClientRect();this.dragStartX=o.clientX,this.dragStartY=o.clientY,this.dragStartTop=a.top,this.dragStartLeft=a.left},this.handleDragMove=t=>{!this.draggedNodeId||!this.editMode||(t.preventDefault(),this.updateDragPosition(t.clientX,t.clientY))},this.handleTouchMove=t=>{if(!this.draggedNodeId||!this.editMode)return;t.preventDefault();const e=t.touches[0];this.updateDragPosition(e.clientX,e.clientY)},this.handleDragEnd=t=>{var s;if(!this.draggedNodeId||!this.editMode)return;const e=(s=this.shadowRoot)==null?void 0:s.querySelector(".flow-grid"),i=e==null?void 0:e.querySelector(`.node-${this.draggedNodeId}`);i&&i.classList.remove("dragging"),this.saveLayout(),this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0})),this.draggedNodeId=null},this.handleTouchEnd=t=>{this.handleDragEnd(t)}}connectedCallback(){super.connectedCallback(),this.loadSavedLayout(),this.shieldUnsub=q.subscribe(this.onShieldUpdate)}disconnectedCallback(){var t;super.disconnectedCallback(),this.removeDragListeners(),(t=this.shieldUnsub)==null||t.call(this),this.shieldUnsub=null}updated(t){t.has("editMode")&&(this.editMode?(this.setAttribute("editmode",""),this.loadSavedLayout(),this.requestUpdate(),this.updateComplete.then(()=>this.applySavedPositions())):(this.removeAttribute("editmode"),this.removeDragListeners(),this.clearInlinePositions(),this.updateComplete.then(()=>this.applyCustomPositions()))),!this.editMode&&this.hasCustomLayout&&this.updateComplete.then(()=>this.applyCustomPositions())}loadSavedLayout(){const t=Qt(window.innerWidth),e=`${Mi}${t}`;try{const i=localStorage.getItem(e);i&&(this.customPositions=JSON.parse(i),b.debug("[FlowNode] Loaded layout for "+t))}catch{}}applySavedPositions(){var e;if(!this.editMode)return;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".flow-grid");if(t){for(const i of Dt){const s=this.customPositions[i];if(!s)continue;const o=t.querySelector(`.node-${i}`);o&&(o.style.top=s.top,o.style.left=s.left)}this.initDragListeners()}}clearInlinePositions(){var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".flow-grid");if(t)for(const i of Dt){const s=t.querySelector(`.node-${i}`);s&&(s.style.top="",s.style.left="")}}saveLayout(){const t=Qt(window.innerWidth),e=`${Mi}${t}`;try{localStorage.setItem(e,JSON.stringify(this.customPositions)),b.debug("[FlowNode] Saved layout for "+t)}catch{}}toggleExpand(t,e){const i=e.target;if(i.closest(".clickable")||i.closest(".indicator")||i.closest(".forecast-badge")||i.closest(".node-value")||i.closest(".node-subvalue")||i.closest(".gc-plan-btn"))return;const s=new Set(this.expandedNodes);s.has(t)?s.delete(t):s.add(t),this.expandedNodes=s}nodeClass(t,e=""){const i=this.expandedNodes.has(t)?" expanded":"";return`node node-${t}${i}${e?" "+e:""}`}get hasCustomLayout(){return Dt.some(t=>{const e=this.customPositions[t];return(e==null?void 0:e.top)!=null&&(e==null?void 0:e.left)!=null})}applyCustomPositions(){var e;if(this.editMode||!this.hasCustomLayout)return;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".flow-grid");if(t)for(const i of Dt){const s=t.querySelector(`.node-${i}`);if(!s)continue;const o=this.customPositions[i]??Rn[i];s.style.top=o.top,s.style.left=o.left}}resetLayout(){const t=Qt(window.innerWidth),e=`${Mi}${t}`;localStorage.removeItem(e),this.customPositions={},this.clearInlinePositions(),this.editMode&&this.requestUpdate(),b.debug("[FlowNode] Reset layout for "+t)}initDragListeners(){var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".flow-grid");if(t){for(const i of Dt){const s=t.querySelector(`.node-${i}`);s&&(s.addEventListener("mousedown",this.handleDragStart),s.addEventListener("touchstart",this.handleTouchStart,{passive:!1}))}document.addEventListener("mousemove",this.handleDragMove),document.addEventListener("mouseup",this.handleDragEnd),document.addEventListener("touchmove",this.handleTouchMove,{passive:!1}),document.addEventListener("touchend",this.handleTouchEnd)}}removeDragListeners(){document.removeEventListener("mousemove",this.handleDragMove),document.removeEventListener("mouseup",this.handleDragEnd),document.removeEventListener("touchmove",this.handleTouchMove),document.removeEventListener("touchend",this.handleTouchEnd)}findNodeId(t){for(const i of Dt)if(t.classList.contains(`node-${i}`))return i;const e=t.closest('[class*="node-"]');if(!e)return null;for(const i of Dt)if(e.classList.contains(`node-${i}`))return i;return null}updateDragPosition(t,e){var T;if(!this.draggedNodeId)return;const i=(T=this.shadowRoot)==null?void 0:T.querySelector(".flow-grid");if(!i)return;const s=i.querySelector(`.node-${this.draggedNodeId}`);if(!s)return;const o=i.getBoundingClientRect(),a=s.getBoundingClientRect(),n=t-this.dragStartX,c=e-this.dragStartY,d=this.dragStartLeft+n,p=this.dragStartTop+c,g=o.left,f=o.right-a.width,w=o.top,m=o.bottom-a.height,x=Math.max(g,Math.min(f,d)),h=Math.max(w,Math.min(m,p)),$=(x-o.left)/o.width*100,P=(h-o.top)/o.height*100;s.style.left=`${$}%`,s.style.top=`${P}%`,this.customPositions[this.draggedNodeId]={top:`${P}%`,left:`${$}%`},this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0}))}renderSolar(){const t=this.data,e=t.solarPercent,i=e<2,s=i?"linear-gradient(135deg, rgba(57,73,171,0.25) 0%, rgba(26,35,126,0.18) 100%)":ve.solar,o=i?"rgba(121,134,203,0.5)":ye.solar,a=i?"position:absolute;top:4px;left:6px;font-size:11px;background:rgba(57,73,171,0.35);color:#9fa8da;padding:3px 8px;border-radius:4px;border:1px solid rgba(121,134,203,0.4)":"position:absolute;top:4px;left:6px;font-size:9px",n=i?"position:absolute;top:4px;right:6px;font-size:11px;background:rgba(57,73,171,0.35);color:#9fa8da;padding:3px 8px;border-radius:4px;border:1px solid rgba(121,134,203,0.4)":"position:absolute;top:4px;right:6px;font-size:9px";return l`
      <div class="${this.nodeClass("solar",i?"night":"")}" style="--node-gradient: ${s}; --node-border: ${o};"
        @click=${c=>this.toggleExpand("solar",c)}>
        <div class="node-header" style="margin-top:16px">
          <oig-solar-icon .power=${t.solarPower} .percent=${e} .maxPower=${5400}></oig-solar-icon>
          <span class="node-label">Solár</span>
        </div>
        <div class="node-value" @click=${M("actual_fv_total")}>
          ${$e(t.solarPower)}
        </div>
        <div class="node-subvalue" @click=${M("dc_in_fv_ad")}>
          Dnes: ${(t.solarToday/1e3).toFixed(2)} kWh
        </div>
        <div class="node-subvalue" @click=${M("solar_forecast")}>
          Zítra: ${t.solarForecastTomorrow.toFixed(1)} kWh
        </div>

        <button class="indicator" style="${a}" @click=${M("solar_forecast")}>
          🔮 ${t.solarForecastToday.toFixed(1)} kWh
        </button>
        <button class="indicator" style="${n}" @click=${M("solar_forecast")}>
          🌅 ${t.solarForecastTomorrow.toFixed(1)} kWh
        </button>

        <div class="detail-section">
          <div class="solar-strings">
            <div>
              <div class="detail-header">🏭 String 1</div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${M("extended_fve_voltage_1")}>${Math.round(t.solarV1)}V</button>
              </div>
              <div class="detail-row">
                <span class="icon">〰️</span>
                <button class="clickable" @click=${M("extended_fve_current_1")}>${t.solarI1.toFixed(1)}A</button>
              </div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${M("dc_in_fv_p1")}>${Math.round(t.solarP1)} W</button>
              </div>
            </div>
            <div>
              <div class="detail-header">🏭 String 2</div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${M("extended_fve_voltage_2")}>${Math.round(t.solarV2)}V</button>
              </div>
              <div class="detail-row">
                <span class="icon">〰️</span>
                <button class="clickable" @click=${M("extended_fve_current_2")}>${t.solarI2.toFixed(1)}A</button>
              </div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${M("dc_in_fv_p2")}>${Math.round(t.solarP2)} W</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `}openGridChargingDialog(){this.dispatchEvent(new CustomEvent("oig-grid-charging-open",{bubbles:!0,composed:!0,detail:{data:this.data.gridChargingPlan}}))}getBatteryStatus(){const t=this.data;return t.batteryPower>10?{text:`⚡ Nabíjení${t.timeToFull?` (${t.timeToFull})`:""}`,cls:"status-charging pulse"}:t.batteryPower<-10?{text:`⚡ Vybíjení${t.timeToEmpty?` (${t.timeToEmpty})`:""}`,cls:"status-discharging pulse"}:{text:"◉ Klid",cls:"status-idle"}}getBalancingIndicator(){const t=this.data,e=t.balancingState;return e!=="charging"&&e!=="holding"&&e!=="completed"?{show:!1,text:"",icon:"",cls:""}:e==="charging"?{show:!0,text:`Nabíjení${t.balancingTimeRemaining?` (${t.balancingTimeRemaining})`:""}`,icon:"⚡",cls:"charging"}:e==="holding"?{show:!0,text:`Držení${t.balancingTimeRemaining?` (${t.balancingTimeRemaining})`:""}`,icon:"⏸️",cls:"holding"}:{show:!0,text:"Dokončeno",icon:"✅",cls:"completed"}}renderBattery(){const t=this.data,e=this.getBatteryStatus(),i=this.getBalancingIndicator(),s=t.batteryPower>10,o=t.batteryTemp>25?"🌡️":t.batteryTemp<15?"🧊":"🌡️",a=t.batteryTemp>25?"temp-hot":t.batteryTemp<15?"temp-cold":"";return l`
      <div class="${this.nodeClass("battery")}" style="--node-gradient: ${ve.battery}; --node-border: ${ye.battery};"
        @click=${n=>this.toggleExpand("battery",n)}>

        <div class="node-header">
          <!-- Jediná ikona: SVG baterie nahrazuje gauge + emoji -->
          <oig-battery-icon
            .soc=${t.batterySoC}
            ?charging=${s&&!t.isGridCharging}
            ?gridCharging=${t.isGridCharging&&s}
            ?discharging=${t.batteryPower<-10}
          ></oig-battery-icon>
          <span class="node-label">Baterie</span>
        </div>

        <div class="node-value" @click=${M("batt_bat_c")}>
          ${Math.round(t.batterySoC)} %
        </div>
        <div class="node-subvalue" @click=${M("batt_batt_comp_p")}>
          ${$e(t.batteryPower)}
        </div>

        <div class="node-status ${e.cls}">${e.text}</div>

        ${t.isGridCharging?l`
          <span class="grid-charging-badge">⚡🔌 Síťové nabíjení</span>
        `:E}
        ${i.show?l`
          <span class="balancing-indicator ${i.cls}">
            <span>${i.icon}</span>
            <span>${i.text}</span>
          </span>
        `:E}

        <div class="battery-indicators">
          <button class="indicator" @click=${M("extended_battery_voltage")}>
            ⚡ ${t.batteryVoltage.toFixed(1)} V
          </button>
          <button class="indicator" @click=${M("extended_battery_current")}>
            〰️ ${t.batteryCurrent.toFixed(1)} A
          </button>
          <button class="indicator ${a}" @click=${M("extended_battery_temperature")}>
            ${o} ${t.batteryTemp.toFixed(1)} °C
          </button>
        </div>

        <!-- Energie + gc-plan vždy viditelné (ne v detail-section) -->
        <div class="battery-energy-section">
          <div class="detail-header">⚡ Energie dnes</div>
          <div class="energy-grid">
            <div class="detail-row">
              <span class="icon">⬆️</span>
              <button class="clickable" @click=${M("computed_batt_charge_energy_today")}>
                Nab: ${It(t.batteryChargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">⬇️</span>
              <button class="clickable" @click=${M("computed_batt_discharge_energy_today")}>
                Vyb: ${It(t.batteryDischargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">☀️</span>
              <button class="clickable" @click=${M("computed_batt_charge_fve_energy_today")}>
                FVE: ${It(t.batteryChargeSolar)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">🔌</span>
              <button class="clickable" @click=${M("computed_batt_charge_grid_energy_today")}>
                Síť: ${It(t.batteryChargeGrid)}
              </button>
            </div>
          </div>

          <!-- Grid charging plan — always visible badge -->
          <div class="grid-charging-plan-summary">
            <button class="gc-plan-btn ${t.gridChargingPlan.hasBlocks?"has-plan":""}"
              @click=${n=>{n.stopPropagation(),this.openGridChargingDialog()}}>
              🔌
              ${t.gridChargingPlan.hasBlocks?l`Plán: ${t.gridChargingPlan.totalEnergyKwh.toFixed(1)} kWh`:l`Plán nabíjení`}
              <span class="gc-plan-arrow">›</span>
            </button>
          </div>
        </div>
      </div>
    `}getInverterModeDesc(){const t=this.data.inverterMode;return t.includes("Home 1")?"🏠 Home 1: Max baterie + FVE":t.includes("Home 2")?"🔋 Home 2: Šetří baterii":t.includes("Home 3")?"☀️ Home 3: Priorita nabíjení":t.includes("UPS")?"⚡ UPS: Vše ze sítě":`⚙️ ${t||"--"}`}renderInverter(){const t=this.data,e=ua(t.inverterMode),i=t.bypassStatus.toLowerCase()==="on"||t.bypassStatus==="1",s=t.inverterTemp>35?"🔥":"🌡️",o=ha(t.inverterGridMode),a=(t.inverterGridLimit/1e3).toFixed(1),n=To(this.pendingServices,this.changingServices);let c="planner-unknown",d="Plánovač: N/A";return t.plannerAutoMode===!0?(c="planner-auto",d="Plánovač: AUTO"):t.plannerAutoMode===!1&&(c="planner-off",d="Plánovač: VYPNUTO"),l`
      <div class="${this.nodeClass("inverter",n.inverterModeChanging?"mode-changing":"")}" style="--node-gradient: ${ve.inverter}; --node-border: ${ye.inverter};"
        @click=${p=>this.toggleExpand("inverter",p)}>
        <div class="node-header">
          <oig-inverter-icon
            .mode=${t.inverterMode}
            ?bypassActive=${i}
            ?hasAlarm=${t.notificationsError>0}
            ?plannerAuto=${t.plannerAutoMode===!0}
          ></oig-inverter-icon>
          <span class="node-label">Střídač</span>
        </div>
        ${i?l`
          <button class="bypass-active bypass-warning" style="position:absolute;top:4px;right:6px;font-size:9px" @click=${M("bypass_status")}>
            🔴 Bypass
          </button>
        `:E}

        <div class="node-value" @click=${M("box_prms_mode")}>
          ${n.inverterModeChanging?l`<span class="spinner spinner--small"></span>`:E}
          ${e.icon} ${e.text}
        </div>
        <div class="node-subvalue">${this.getInverterModeDesc()}</div>
        ${n.inverterModeText?l`<div class="pending-text">${n.inverterModeText}</div>`:E}

        <div class="planner-badge ${c}">${d}</div>
        <div class="shield-badge ${this.shieldStatus==="running"?"shield-running":"shield-idle"}">
          🛡️ ${this.shieldStatus==="running"?"Zpracovávám":"Nečinný"}${this.shieldQueueCount>0?l` <span class="shield-queue">(${this.shieldQueueCount})</span>`:E}
        </div>

        <div class="battery-indicators" style="margin-top:6px">
          <button class="indicator" @click=${M("box_temp")}>
            ${s} ${t.inverterTemp.toFixed(1)} °C
          </button>
          <button class="indicator ${i?"bypass-warning":""}" @click=${M("bypass_status")}>
            <span id="inverter-bypass-icon">${i?"🔴":"🟢"}</span> Bypass: ${i?"ON":"OFF"}
          </button>
        </div>

        <!-- Přetoky + notifikace — vždy viditelné -->
        <div class="battery-indicators" style="margin-top:4px">
          <button class="indicator" @click=${M("invertor_prms_to_grid")}>
            ${o.icon} ${o.display}
          </button>
          <button class="clickable notif-badge ${t.notificationsError>0?"has-error":t.notificationsUnread>0?"has-unread":"indicator"}"
            @click=${M("notification_count_unread")}>
            🔔 ${t.notificationsUnread}/${t.notificationsError}
          </button>
        </div>

        <div class="detail-section">
          <div class="detail-header">🌊 Přetoky — limit</div>
          <div class="detail-row">
            <button class="clickable" @click=${M("invertor_prm1_p_max_feed_grid")}>
              Limit: ${a} kW
            </button>
          </div>
        </div>
      </div>
    `}getGridStatus(){const t=this.data.gridPower;return t>10?{text:"⬇ Import",cls:"status-importing pulse"}:t<-10?{text:"⬆ Export",cls:"status-exporting pulse"}:{text:"◉ Žádný tok",cls:"status-idle"}}renderGrid(){const t=this.data,e=this.getGridStatus(),i=To(this.pendingServices,this.changingServices);return l`
      <div class="${this.nodeClass("grid",i.gridExportChanging?"mode-changing":"")}" style="--node-gradient: ${ve.grid}; --node-border: ${ye.grid};"
        @click=${s=>this.toggleExpand("grid",s)}>

        <!-- Tarif badge vlevo nahoře -->
        <button class="indicator" style="position:absolute;top:4px;left:6px;font-size:9px" @click=${M("current_tariff")}>
          ${pa(t.currentTariff)}
        </button>
        <!-- Frekvence vpravo nahoře -->
        <button class="indicator" style="position:absolute;top:4px;right:6px;font-size:9px" @click=${M("ac_in_aci_f")}>
          ${t.gridFrequency.toFixed(1)} Hz
        </button>

        <!-- SVG ikona -->
        <div class="node-svg-icon" style="margin-top:14px">
          <oig-grid-icon .power=${t.gridPower} style="width:44px;height:44px"></oig-grid-icon>
        </div>
        <div class="node-label" style="margin-bottom:2px">Síť</div>

        <!-- Hlavní hodnota -->
        <div class="node-value" @click=${M("actual_aci_wtotal")}>
          ${$e(t.gridPower)}
        </div>
        <div class="node-status ${e.cls}">${e.text}</div>
        ${i.gridExportText?l`
          <div class="pending-text">
            <span class="spinner spinner--small"></span>
            ${i.gridExportText}
          </div>
        `:E}

        <!-- Ceny — vždy viditelné jako rychlý přehled -->
        <div class="prices-row" style="margin-top:4px">
          <div class="price-cell">
            <span class="price-label">⬇ Spot</span>
            <button class="price-val price-spot" @click=${M("spot_price_current_15min")}>
              ${t.spotPrice.toFixed(2)} Kč
            </button>
          </div>
          <div class="energy-divider-v"></div>
          <div class="price-cell">
            <span class="price-label">⬆ Výkup</span>
            <button class="price-val price-export" @click=${M("export_price_current_15min")}>
              ${t.exportPrice.toFixed(2)} Kč
            </button>
          </div>
        </div>

        <!-- 3 fáze — vždy viditelné -->
        <div class="phases-grid" style="margin-top:6px">
          <div class="phase-cell">
            <span class="phase-label">L1</span>
            <button class="phase-val" @click=${M("actual_aci_wr")}>${Math.round(t.gridL1P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${B(r.textSecondary)}" @click=${M("ac_in_aci_vr")}>${Math.round(t.gridL1V)}V</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L2</span>
            <button class="phase-val" @click=${M("actual_aci_ws")}>${Math.round(t.gridL2P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${B(r.textSecondary)}" @click=${M("ac_in_aci_vs")}>${Math.round(t.gridL2V)}V</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L3</span>
            <button class="phase-val" @click=${M("actual_aci_wt")}>${Math.round(t.gridL3P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${B(r.textSecondary)}" @click=${M("ac_in_aci_vt")}>${Math.round(t.gridL3V)}V</button>
          </div>
        </div>

        <div class="detail-section">
          <!-- Energie dnes — odběr vlevo, dodávka vpravo -->
          <div class="energy-symmetric">
            <div class="energy-side">
              <span class="energy-side-label">⬇ Odběr</span>
              <button class="energy-side-val energy-import" @click=${M("ac_in_ac_ad")}>
                ${It(t.gridImportToday)}
              </button>
            </div>
            <div class="energy-divider-v"></div>
            <div class="energy-side">
              <span class="energy-side-label">⬆ Dodávka</span>
              <button class="energy-side-val energy-export" @click=${M("ac_in_ac_pd")}>
                ${It(t.gridExportToday)}
              </button>
            </div>
          </div>

        </div>
      </div>
    `}renderHouse(){const t=this.data;return l`
      <div class="${this.nodeClass("house")}" style="--node-gradient: ${ve.house}; --node-border: ${ye.house};"
        @click=${e=>this.toggleExpand("house",e)}>
        <div class="node-header">
          <oig-house-icon
            .power=${t.housePower}
            .maxPower=${t.boilerInstallPower>0?1e4:8e3}
            ?boilerActive=${t.boilerIsUse}
          ></oig-house-icon>
          <span class="node-label">Spotřeba</span>
        </div>

        <div class="node-value" @click=${M("actual_aco_p")}>
          ${$e(t.housePower)}
        </div>
        <div class="node-subvalue" @click=${M("ac_out_en_day")}>
          Dnes: ${(t.houseTodayWh/1e3).toFixed(1)} kWh
        </div>

        <!-- Per-phase consumption (plain, not clickable — same as V1) -->
        <div class="phases">
          <span>${Math.round(t.houseL1)}W</span>
          <span class="phase-sep">|</span>
          <span>${Math.round(t.houseL2)}W</span>
          <span class="phase-sep">|</span>
          <span>${Math.round(t.houseL3)}W</span>
        </div>

        ${t.boilerIsUse?l`
          <div class="boiler-section">
            <div class="detail-header">🔥 Bojler</div>
            <div class="detail-row">
              <span class="icon">⚡</span>
              <span>Výkon:</span>
              <button class="clickable" @click=${M("boiler_current_cbb_w")}>
                ${$e(t.boilerPower)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">📊</span>
              <span>Nabito:</span>
              <button class="clickable" @click=${M("boiler_day_w")}>
                ${It(t.boilerDayEnergy)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">${t.boilerManualMode==="CBB"?"🤖":t.boilerManualMode==="Manual"?"👤":"⚙️"}</span>
              <span>Režim:</span>
              <button class="clickable" @click=${M("boiler_manual_mode")}>
                ${t.boilerManualMode==="CBB"?"🤖 Inteligentní":t.boilerManualMode==="Manual"?"👤 Manuální":t.boilerManualMode||"--"}
              </button>
            </div>
          </div>
        `:E}
      </div>
    `}render(){return l`
      <div class="flow-grid ${this.hasCustomLayout&&!this.editMode?"custom-layout":""}">
        ${this.renderSolar()}
        ${this.renderBattery()}
        ${this.renderInverter()}
        ${this.renderGrid()}
        ${this.renderHouse()}
      </div>
    `}};gt.styles=_`
    :host {
      display: block;
      width: 100%;
    }

    .flow-grid {
      display: grid !important;
      grid-template-columns: 1fr 1.2fr 1fr !important;
      grid-template-rows: auto auto auto !important;
      gap: 12px;
      width: 100%;
      max-width: 860px;
      margin: 0 auto;
      min-height: auto;
      padding: 16px;
      box-sizing: border-box;
    }

    .node-solar    { grid-column: 1; grid-row: 1; justify-self: center; }
    .node-house    { grid-column: 3; grid-row: 1; justify-self: center; }
    .node-inverter { grid-column: 2; grid-row: 2; align-self: center; justify-self: center; }
    .node-grid     { grid-column: 1; grid-row: 3; justify-self: center; }
    .node-battery  { grid-column: 3; grid-row: 3; justify-self: center; }

    .node {
      position: relative;
      background: var(--node-gradient);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      padding: 10px 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: visible;
      width: fit-content;
      min-width: 170px;
      max-width: 230px;
      text-align: center;
    }

    .node:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    }

    .flow-grid.custom-layout {
      position: relative;
      min-height: 650px;
      display: block !important;
    }

    .flow-grid.custom-layout .node {
      position: absolute;
      width: 30%;
    }

    /* Edit mode: grid with draggable nodes */
    :host([editmode]) .flow-grid {
      display: grid !important;
      grid-template-columns: 1fr 1.2fr 1fr;
      grid-template-rows: auto 1fr auto;
      min-height: 80vh;
    }

    :host([editmode]) .node {
      position: absolute;
      width: 30%;
      cursor: move;
      user-select: none;
      -webkit-user-select: none;
    }

    :host([editmode]) .node:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      outline: 2px dashed var(--oig-accent, #3b82f6);
    }

    :host([editmode]) .node.dragging {
      opacity: 0.85;
      transform: scale(1.03);
      z-index: 100;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }

    :host([editmode]) .node::after {
      content: '⠿';
      position: absolute;
      top: 4px;
      right: 6px;
      font-size: 14px;
      color: var(--oig-text-secondary, #94a3b8);
      opacity: 0.6;
    }

    :host([editmode]) .node-solar    { top: 0%;  left: 0%; }
    :host([editmode]) .node-house    { top: 0%;  left: 65%; }
    :host([editmode]) .node-inverter { top: 35%; left: 35%; }
    :host([editmode]) .node-grid     { top: 70%; left: 0%; }
    :host([editmode]) .node-battery  { top: 70%; left: 65%; }

    .node-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      margin-bottom: 4px;
    }

    .node-icon {
      font-size: 24px;
    }

    .node-label {
      font-size: 10px;
      font-weight: 600;
      color: ${B(r.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .node-value {
      font-size: 22px;
      font-weight: 700;
      color: ${B(r.textPrimary)};
      cursor: pointer;
      padding: 0;
      margin: 2px 0;
      line-height: 1;
    }

    .node-value:hover {
      text-decoration: underline;
    }

    .node-subvalue {
      font-size: 10px;
      color: ${B(r.textSecondary)};
      cursor: pointer;
      padding: 0;
    }

    .node-subvalue:hover {
      text-decoration: underline;
    }

    .node-status {
      font-size: 10px;
      font-weight: 500;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin: 3px 0;
    }

    .pending-text {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${B(r.textSecondary)};
      margin-top: 4px;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid ${B(r.divider)};
      border-top-color: ${B(r.accent)};
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner--small {
      width: 12px;
      height: 12px;
      border-width: 2px;
    }

    .mode-changing {
      border-color: rgba(255, 255, 255, 0.55);
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.35), 0 0 18px rgba(59, 130, 246, 0.25);
      animation: modePulse 1.6s ease-in-out infinite;
    }

    .status-charging { background: #e8f5e9; color: #2e7d32; }
    .status-discharging { background: #fff3e0; color: #e65100; }
    .status-importing { background: #fce4ec; color: #c62828; }
    .status-exporting { background: #e8f5e9; color: #2e7d32; }
    .status-idle { background: #f5f5f5; color: #757575; }

    .pulse { animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }

    @keyframes modePulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.78; }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .temp-hot { animation: pulse-hot 1s ease-in-out infinite; }
    @keyframes pulse-hot { 
      0%,100%{opacity:1; transform:scale(1);} 
      50%{opacity:0.8; transform:scale(1.1); filter:hue-rotate(-10deg);} 
    }
    
    .temp-cold { animation: pulse-cold 1.5s ease-in-out infinite; }
    @keyframes pulse-cold { 
      0%,100%{opacity:1; transform:scale(1);} 
      50%{opacity:0.7; transform:scale(1.05); filter:hue-rotate(180deg);} 
    }

    /* ---- Collapsible detail sections — vždy collapsed, rozbalí se klikem ---- */
    .detail-section {
      max-height: 0;
      overflow: hidden;
      margin-top: 0;
      padding-top: 0;
      border-top: none;
      transition: max-height 0.3s ease, margin-top 0.15s ease, padding-top 0.15s ease;
      text-align: left;
    }

    .node.expanded .detail-section {
      max-height: 500px;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid ${B(r.divider)};
    }

    /* Expand indicator arrow — vždy viditelný */
    .node::after {
      content: '▼';
      position: absolute;
      bottom: 2px;
      right: 5px;
      font-size: 8px;
      opacity: 0.35;
      transition: transform 0.3s ease, opacity 0.2s ease;
      pointer-events: none;
    }

    .node.expanded::after {
      transform: rotate(180deg);
      opacity: 0.65;
    }

    .node:hover::after {
      opacity: 0.6;
    }

    /* forecast-badges a boiler-section — vždy collapsed */
    .forecast-badges,
    .boiler-section,
    .grid-charging-plan {
      max-height: 0;
      overflow: hidden;
      margin: 0;
      padding: 0;
      border: none;
      transition: max-height 0.3s ease;
    }

    .node.expanded .forecast-badges,
    .node.expanded .boiler-section,
    .node.expanded .grid-charging-plan {
      max-height: 500px;
      margin-top: 6px;
      padding-top: 6px;
    }

    .node.expanded .boiler-section,
    .node.expanded .grid-charging-plan {
      border-top: 1px dashed ${B(r.divider)};
    }

    .detail-header {
      font-size: 10px;
      font-weight: 600;
      color: ${B(r.textSecondary)};
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: ${B(r.textSecondary)};
      margin-bottom: 2px;
    }

    .detail-row .icon { width: 14px; text-align: center; flex-shrink: 0; }

    .clickable {
      cursor: pointer;
      color: ${B(r.textPrimary)};
      padding: 0;
      margin: 0;
      background: none;
      border: none;
      font: inherit;
      text-align: left;
    }

    .clickable:hover { text-decoration: underline; }

    .solar-strings {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    .forecast-badges {
      display: flex;
      gap: 8px;
      margin-top: 6px;
    }

    .forecast-badge {
      font-size: 10px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      background: #fff8e1;
      color: #f57f17;
      border: none;
      font-family: inherit;
    }

    .forecast-badge:hover { background: #fff3c4; }

    .phases {
      display: flex;
      gap: 4px;
      font-size: 11px;
      color: ${B(r.textSecondary)};
      margin: 4px 0;
      align-items: center;
    }

    .phase-sep { color: ${B(r.divider)}; }

    .battery-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      margin: 4px 0;
    }

    .battery-indicators {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
      justify-content: center;
    }

    .indicator {
      font-size: 10px;
      cursor: pointer;
      padding: 1px 4px;
      border-radius: 3px;
      background: ${B(r.bgSecondary)};
      border: none;
      font-family: inherit;
      color: ${B(r.textSecondary)};
    }

    .indicator:hover { background: ${B(r.divider)}; }

    .grid-charging-badge {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      background: #e3f2fd;
      color: #1565c0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .balancing-indicator {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 1px solid transparent;
      margin-left: 6px;
    }

    .balancing-indicator.charging {
      background: linear-gradient(135deg, rgba(255,193,7,0.25), rgba(255,152,0,0.18));
      border-color: rgba(255,193,7,0.45);
      color: #b26a00;
      animation: pulse 2s ease-in-out infinite;
    }

    .balancing-indicator.holding {
      background: linear-gradient(135deg, rgba(66,165,245,0.25), rgba(33,150,243,0.18));
      border-color: rgba(66,165,245,0.45);
      color: #0d47a1;
      animation: pulse 2s ease-in-out infinite;
    }

    .balancing-indicator.completed {
      background: linear-gradient(135deg, rgba(76,175,80,0.25), rgba(56,142,60,0.18));
      border-color: rgba(76,175,80,0.45);
      color: #1b5e20;
    }

    /* Battery energie section — always visible (never collapsed) */
    .battery-energy-section {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid ${B(r.divider)};
      text-align: left;
    }

    /* Grid charging plan — compact clickable badge (opens popup) */
    .grid-charging-plan-summary {
      margin-top: 6px;
      text-align: center;
    }

    .gc-plan-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid ${B(r.divider)};
      background: transparent;
      color: ${B(r.textSecondary)};
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .gc-plan-btn:hover {
      background: rgba(255,255,255,0.06);
      color: ${B(r.textPrimary)};
    }

    .gc-plan-btn.has-plan {
      border-color: rgba(33,150,243,0.4);
      color: #42a5f5;
      background: rgba(33,150,243,0.08);
    }

    .gc-plan-btn.has-plan:hover {
      background: rgba(33,150,243,0.15);
    }

    .gc-plan-arrow {
      font-size: 14px;
      opacity: 0.6;
      line-height: 1;
    }

    .energy-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px 8px;
      font-size: 11px;
    }

    .energy-grid .clickable { font-size: 11px; }

    .planner-badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 4px;
      margin-top: 4px;
      display: inline-block;
    }

    .planner-auto { background: #e8f5e9; color: #2e7d32; }
    .planner-off { background: #fff3e0; color: #e65100; }
    .planner-unknown { background: #f5f5f5; color: #757575; }

    .shield-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 600;
      margin-top: 4px;
    }
    .shield-idle {
      background: rgba(76, 175, 80, 0.15);
      color: #4caf50;
    }
    .shield-running {
      background: rgba(33, 150, 243, 0.15);
      color: #2196f3;
    }
    .shield-queue {
      font-weight: 400;
      opacity: 0.8;
    }

    .bypass-active {
      background: #fce4ec;
      color: #c62828;
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .notif-badge {
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 3px;
    }

    .notif-badge.has-error { background: #fce4ec; color: #c62828; }
    .notif-badge.has-unread { background: #fff8e1; color: #f57f17; }

    .boiler-section {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed ${B(r.divider)};
    }

    /* ---- SVG ikony ---- */
    .node-svg-icon {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 2px;
    }

    /* Explicitní velikosti ikon v node-header */
    .node-header oig-solar-icon    { display: block; width: 48px; height: 48px; }
    .node-header oig-battery-icon  { display: block; width: 32px; height: 52px; }
    .node-header oig-inverter-icon { display: block; width: 48px; height: 48px; }
    .node-header oig-house-icon    { display: block; width: 48px; height: 48px; }

    /* ---- Grid node: 3-fázové hodnoty jako symetrická tabulka ---- */
    .phases-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 2px 4px;
      text-align: center;
      margin: 4px 0;
    }
    .phase-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
    }
    .phase-label {
      font-size: 8px;
      color: ${B(r.textSecondary)};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .phase-val {
      font-size: 11px;
      font-weight: 600;
      color: ${B(r.textPrimary)};
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    .phase-val:hover { text-decoration: underline; }
    .phase-divider {
      border: none;
      border-top: 1px solid ${B(r.divider)};
      margin: 2px 0;
    }

    /* ---- Energie symetricky (odběr vlevo, dodávka vpravo) ---- */
    .energy-symmetric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      padding: 4px 0;
    }
    .energy-side {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      flex: 1;
    }
    .energy-side-label {
      font-size: 9px;
      color: ${B(r.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .energy-side-val {
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: ${B(r.textPrimary)};
    }
    .energy-side-val:hover { text-decoration: underline; }
    .energy-import { color: #ef5350; }
    .energy-export { color: #66bb6a; }
    .energy-divider-v {
      width: 1px;
      height: 28px;
      background: ${B(r.divider)};
      flex-shrink: 0;
    }

    /* ---- Ceny vedle sebe ---- */
    .prices-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      padding: 2px 0;
    }
    .price-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      flex: 1;
    }
    .price-label {
      font-size: 8px;
      color: ${B(r.textSecondary)};
      text-transform: uppercase;
    }
    .price-val {
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: ${B(r.textPrimary)};
    }
    .price-val:hover { text-decoration: underline; }
    .price-spot { color: #ef5350; }
    .price-export { color: #66bb6a; }

    @media (min-width: 1025px) {
      .detail-section {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid ${B(r.divider)};
      }
      .node-solar .detail-section {
        max-height: 0;
        margin-top: 0;
        padding-top: 0;
        border-top: none;
      }
      .boiler-section,
      .grid-charging-plan {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed ${B(r.divider)};
      }
      .node::after { display: none; }
    }

    /* ---- Tablet (768-1024px) ---- */
    @media (min-width: 769px) and (max-width: 1024px) {
      .node {
        min-width: 140px;
        max-width: 200px;
        padding: 8px 10px;
      }
      .node-icon { font-size: 20px; }
      .node-value { font-size: 18px; }
      .node-label { font-size: 9px; }
      .node-subvalue { font-size: 9px; }
      .node-status { font-size: 9px; }
      .indicator { font-size: 9px; }
      .phases { font-size: 10px; }
      .flow-grid { gap: 6px; padding: 12px; }
    }

    /* ---- Mobile (<768px) ---- */
    @media (max-width: 768px) {
      .flow-grid {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto auto auto auto;
        gap: 6px;
        padding: 8px;
      }
      .node-solar { grid-column: 1; grid-row: 1; justify-self: center; }
      .node-house { grid-column: 2; grid-row: 1; justify-self: center; }
      .node-inverter { grid-column: 1 / span 2; grid-row: 2; justify-self: center; }
      .node-grid { grid-column: 1; grid-row: 3; }
      .node-battery { grid-column: 2; grid-row: 3; }

      .node {
        min-width: 120px;
        max-width: 170px;
        padding: 8px 8px;
      }
      .node-icon { font-size: 20px; }
      .node-value { font-size: 18px; }
      .node-label { font-size: 9px; }
      .node-subvalue { font-size: 9px; }
      .node-status { font-size: 8px; padding: 1px 4px; }
      .phases { font-size: 9px; gap: 2px; }
      .indicator { font-size: 9px; padding: 1px 3px; }
      .battery-indicators { gap: 3px; }
    }

    /* ---- Nest Hub landscape (769-1200px landscape) ---- */
    @media (min-width: 769px) and (max-width: 1200px) and (orientation: landscape) {
      .flow-grid {
        transform: scale(0.82);
        transform-origin: top center;
      }
      .node {
        min-width: 130px;
        max-width: 180px;
        padding: 8px 10px;
      }
      .node-icon { font-size: 20px; }
      .node-value { font-size: 20px; }
      .node-label { font-size: 9px; }
    }

    /* ---- Extra small (<380px) ---- */
    @media (max-width: 380px) {
      .flow-grid {
        transform: scale(0.88);
        transform-origin: top center;
      }
      .node {
        min-width: 100px;
        max-width: 150px;
        padding: 6px;
      }
      .node-icon { font-size: 18px; }
      .node-value { font-size: 16px; }
      .node-label { font-size: 8px; }
    }
  `;$t([u({type:Object})],gt.prototype,"data",2);$t([u({type:Boolean})],gt.prototype,"editMode",2);$t([v()],gt.prototype,"pendingServices",2);$t([v()],gt.prototype,"changingServices",2);$t([v()],gt.prototype,"shieldStatus",2);$t([v()],gt.prototype,"shieldQueueCount",2);$t([v()],gt.prototype,"expandedNodes",2);$t([v()],gt.prototype,"customPositions",2);gt=$t([C("oig-flow-node")],gt);var Nn=Object.defineProperty,jn=Object.getOwnPropertyDescriptor,qt=(t,e,i,s)=>{for(var o=s>1?void 0:s?jn(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&Nn(e,i,o),o};function Hn(t,e){return{fromColor:oo[t]||"#9e9e9e",toColor:oo[e]||"#9e9e9e"}}const Vn=j;let xt=class extends S{constructor(){super(...arguments),this.data=Fi,this.particlesEnabled=!0,this.active=!0,this.editMode=!1,this.lines=[],this.animationId=null,this.lastSpawnTime={},this.particleCount=0,this.MAX_PARTICLES=50,this.onVisibilityChange=()=>{this.updateAnimationState()},this.onLayoutChanged=()=>{this.drawConnectionsDeferred()}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this.onVisibilityChange),this.addEventListener("layout-changed",this.onLayoutChanged)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this.onVisibilityChange),this.removeEventListener("layout-changed",this.onLayoutChanged),this.stopAnimation()}updated(t){t.has("data")&&(this.updateLines(),this.animationId!==null&&this.spawnParticles()),(t.has("active")||t.has("particlesEnabled"))&&this.updateAnimationState(),this.drawConnectionsDeferred()}firstUpdated(){this.updateLines(),this.updateAnimationState(),new ResizeObserver(()=>this.drawConnectionsDeferred()).observe(this)}drawConnectionsDeferred(){requestAnimationFrame(()=>this.drawConnectionsSVG())}getParticlesLayer(){var t;return(t=this.renderRoot)==null?void 0:t.querySelector(".particles-layer")}getGridMetrics(){var a,n;const t=(a=this.renderRoot)==null?void 0:a.querySelector("oig-flow-node");if(!t)return null;const i=(t.renderRoot||t.shadowRoot||t).querySelector(".flow-grid");if(!i)return null;const s=(n=this.renderRoot)==null?void 0:n.querySelector(".canvas-container");if(!s)return null;const o=i.getBoundingClientRect();return o.width===0||o.height===0?null:{grid:i,gridRect:o,canvasRect:s.getBoundingClientRect()}}positionOverlayLayer(t,e,i){const s=e.left-i.left,o=e.top-i.top;t.style.left=`${s}px`,t.style.top=`${o}px`,t.style.width=`${e.width}px`,t.style.height=`${e.height}px`}updateLines(){const t=this.data,e=[],i=t.solarPower>50;e.push({id:"solar-inverter",from:"solar",to:"inverter",color:Ut.solar,power:i?t.solarPower:0,params:i?Ke(t.solarPower,Ge.solar,"solar"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:i});const s=Math.abs(t.batteryPower)>50,o=t.batteryPower>0;e.push({id:"battery-inverter",from:s&&o?"inverter":"battery",to:s&&o?"battery":"inverter",color:Ut.battery,power:s?Math.abs(t.batteryPower):0,params:s?Ke(t.batteryPower,Ge.battery,"battery"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:s});const a=Math.abs(t.gridPower)>50,n=t.gridPower>0;e.push({id:"grid-inverter",from:a?n?"grid":"inverter":"grid",to:a?n?"inverter":"grid":"inverter",color:a?n?Ut.grid_import:Ut.grid_export:Ut.grid_import,power:a?Math.abs(t.gridPower):0,params:a?Ke(t.gridPower,Ge.grid,"grid"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:a});const c=t.housePower>50;e.push({id:"inverter-house",from:"inverter",to:"house",color:Ut.house,power:c?t.housePower:0,params:c?Ke(t.housePower,Ge.house,"house"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:c}),this.lines=e}calcEdgePoint(t,e,i,s){const o=e.x-t.x,a=e.y-t.y;if(o===0&&a===0)return{...t};const n=Math.abs(o),c=Math.abs(a),d=n*s>c*i?i/n:s/c;return{x:t.x+o*d,y:t.y+a*d}}getNodeInfo(t,e,i){const s=t.querySelector(`.node-${i}`);if(!s)return null;const o=s.getBoundingClientRect();return{x:o.left+o.width/2-e.left,y:o.top+o.height/2-e.top,hw:o.width/2,hh:o.height/2}}drawConnectionsSVG(){const t=this.svgEl;if(!t)return;const e=this.getGridMetrics();if(!e)return;const{grid:i,gridRect:s,canvasRect:o}=e;this.positionOverlayLayer(t,s,o),t.setAttribute("viewBox",`0 0 ${s.width} ${s.height}`);const a=this.getParticlesLayer();a&&this.positionOverlayLayer(a,s,o),t.innerHTML="";const n="http://www.w3.org/2000/svg",c=document.createElementNS(n,"defs"),d=document.createElementNS(n,"filter");d.setAttribute("id","neon-glow"),d.setAttribute("x","-50%"),d.setAttribute("y","-50%"),d.setAttribute("width","200%"),d.setAttribute("height","200%");const p=document.createElementNS(n,"feGaussianBlur");p.setAttribute("in","SourceGraphic"),p.setAttribute("stdDeviation","3"),p.setAttribute("result","blur"),d.appendChild(p);const g=document.createElementNS(n,"feMerge"),f=document.createElementNS(n,"feMergeNode");f.setAttribute("in","blur"),g.appendChild(f);const w=document.createElementNS(n,"feMergeNode");w.setAttribute("in","SourceGraphic"),g.appendChild(w),d.appendChild(g),c.appendChild(d),t.appendChild(c);for(const m of this.lines){const x=this.getNodeInfo(i,s,m.from),h=this.getNodeInfo(i,s,m.to);if(!x||!h)continue;const $={x:x.x,y:x.y},P={x:h.x,y:h.y},T=this.calcEdgePoint($,P,x.hw,x.hh),I=this.calcEdgePoint(P,$,h.hw,h.hh),Y=I.x-T.x,H=I.y-T.y,y=Math.sqrt(Y*Y+H*H),F=Math.min(y*.2,40),it=-H/y,N=Y/y,et=(T.x+I.x)/2,W=(T.y+I.y)/2,V=et+it*F,_t=W+N*F,qe=`grad-${m.id}`,{fromColor:_i,toColor:ki}=Hn(m.from,m.to),ft=document.createElementNS(n,"linearGradient");ft.setAttribute("id",qe),ft.setAttribute("x1","0%"),ft.setAttribute("y1","0%"),ft.setAttribute("x2","100%"),ft.setAttribute("y2","0%");const me=document.createElementNS(n,"stop");me.setAttribute("offset","0%"),me.setAttribute("stop-color",_i);const fe=document.createElementNS(n,"stop");fe.setAttribute("offset","100%"),fe.setAttribute("stop-color",ki),ft.appendChild(me),ft.appendChild(fe),c.appendChild(ft);const ct=document.createElementNS(n,"path");if(ct.setAttribute("d",`M ${T.x} ${T.y} Q ${V} ${_t} ${I.x} ${I.y}`),ct.setAttribute("stroke",`url(#${qe})`),ct.setAttribute("stroke-width","3"),ct.setAttribute("stroke-linecap","round"),ct.setAttribute("fill","none"),ct.setAttribute("opacity",m.active?"0.8":"0.18"),m.active&&ct.setAttribute("filter","url(#neon-glow)"),ct.classList.add("flow-line"),m.active||ct.classList.add("flow-line--inactive"),t.appendChild(ct),m.params.active){const zt=document.createElementNS(n,"polygon");zt.setAttribute("points",`0,-6 ${6*1.2},0 0,6`),zt.setAttribute("fill",m.color),zt.setAttribute("opacity","0.9");const Ot=document.createElementNS(n,"animateMotion");Ot.setAttribute("dur",`${Math.max(1,m.params.speed/1e3)}s`),Ot.setAttribute("repeatCount","indefinite"),Ot.setAttribute("path",`M ${T.x} ${T.y} Q ${V} ${_t} ${I.x} ${I.y}`),Ot.setAttribute("rotate","auto"),zt.appendChild(Ot),t.appendChild(zt)}}}updateAnimationState(){this.particlesEnabled&&this.active&&!document.hidden&&!dt.reduceMotion?(this.spawnParticles(),this.startAnimation()):this.stopAnimation()}startAnimation(){if(this.animationId!==null)return;const t=()=>{this.spawnParticles(),this.animationId=requestAnimationFrame(t)};this.animationId=requestAnimationFrame(t)}stopAnimation(){this.animationId!==null&&(cancelAnimationFrame(this.animationId),this.animationId=null)}spawnParticles(){if(this.particleCount>=this.MAX_PARTICLES)return;const t=this.getParticlesLayer();if(!t)return;const e=this.getGridMetrics();if(!e)return;const{grid:i,gridRect:s,canvasRect:o}=e;this.positionOverlayLayer(t,s,o);const a=performance.now();for(const n of this.lines){if(!n.params.active)continue;const c=n.params.speed,d=this.lastSpawnTime[n.id]||0;if(a-d<c)continue;const p=this.getNodeInfo(i,s,n.from),g=this.getNodeInfo(i,s,n.to);if(!p||!g)continue;const f={x:p.x,y:p.y},w={x:g.x,y:g.y},m=this.calcEdgePoint(f,w,p.hw,p.hh),x=this.calcEdgePoint(w,f,g.hw,g.hh);this.lastSpawnTime[n.id]=a;const h=n.params.count;for(let $=0;$<h&&!(this.particleCount>=this.MAX_PARTICLES);$++)this.createParticle(t,m,x,n.color,n.params,$*(n.params.speed/h/2))}}createParticle(t,e,i,s,o,a){const n=document.createElement("div");n.className="particle";const c=o.size;n.style.width=`${c}px`,n.style.height=`${c}px`,n.style.background=s,n.style.left=`${e.x}px`,n.style.top=`${e.y}px`,n.style.boxShadow=`0 0 ${c}px ${s}`,n.style.opacity="0",t.appendChild(n),this.particleCount++;const d=o.speed;setTimeout(()=>{let p=!1;const g=()=>{p||(p=!0,n.isConnected&&n.remove(),this.particleCount=Math.max(0,this.particleCount-1))};if(typeof n.animate=="function"){const f=n.animate([{left:`${e.x}px`,top:`${e.y}px`,opacity:0,offset:0},{opacity:o.opacity,offset:.1},{opacity:o.opacity,offset:.9},{left:`${i.x}px`,top:`${i.y}px`,opacity:0,offset:1}],{duration:d,easing:"linear"});f.onfinish=g,f.oncancel=g}else n.style.transition=`left ${d}ms linear, top ${d}ms linear, opacity ${d}ms linear`,n.style.opacity=`${o.opacity}`,requestAnimationFrame(()=>{n.style.left=`${i.x}px`,n.style.top=`${i.y}px`,n.style.opacity="0"}),n.addEventListener("transitionend",g,{once:!0}),window.setTimeout(g,d+50)},a)}render(){return l`
      <div class="canvas-container">
        <div class="flow-grid-wrapper">
          <oig-flow-node .data=${this.data} .editMode=${this.editMode}></oig-flow-node>
        </div>

        <svg class="connections-layer"></svg>

        <div class="particles-layer"></div>
      </div>
    `}resetLayout(){var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector("oig-flow-node");t!=null&&t.resetLayout&&t.resetLayout()}};xt.styles=_`
    :host {
      display: block;
      position: relative;
      width: 100%;
      background: ${Vn(r.bgSecondary)};
      border-radius: 12px;
      overflow: visible;
    }

    .canvas-container {
      position: relative;
      width: 100%;
    }

    .flow-grid-wrapper {
      position: relative;
      z-index: 1;
      min-height: 500px;
    }

    /* Tablet: reduce min-height */
    @media (min-width: 769px) and (max-width: 1024px) {
      .flow-grid-wrapper { min-height: 500px; }
    }

    /* Mobile: compact */
    @media (max-width: 768px) {
      .flow-grid-wrapper { min-height: auto; }
    }

    /* Nest Hub landscape */
    @media (min-width: 769px) and (max-width: 1200px) and (orientation: landscape) {
      :host { max-height: 600px; overflow: auto; }
      .flow-grid-wrapper { min-height: auto; }
    }

    /* HA App / reduced motion — no particles via CSS */
    :host(.no-particles) .particles-layer { display: none; }

    .connections-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: unset;
      height: unset;
      pointer-events: none;
      z-index: 2;
    }

    .particles-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 3;
    }

    .particle {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
    }

    .flow-line {
      fill: none;
      stroke-linecap: round;
    }
  `;qt([u({type:Object})],xt.prototype,"data",2);qt([u({type:Boolean})],xt.prototype,"particlesEnabled",2);qt([u({type:Boolean})],xt.prototype,"active",2);qt([u({type:Boolean})],xt.prototype,"editMode",2);qt([v()],xt.prototype,"lines",2);qt([yi(".connections-layer")],xt.prototype,"svgEl",2);xt=qt([C("oig-flow-canvas")],xt);var Wn=Object.defineProperty,qn=Object.getOwnPropertyDescriptor,ji=(t,e,i,s)=>{for(var o=s>1?void 0:s?qn(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&Wn(e,i,o),o};const pt=j;let Me=class extends S{constructor(){super(...arguments),this.data=null,this.open=!1,this.onKeyDown=t=>{t.key==="Escape"&&this.hide()}}show(){this.open=!0}hide(){this.open=!1}onOverlayClick(t){t.target===t.currentTarget&&this.hide()}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onKeyDown),this.addEventListener("oig-grid-charging-open",()=>this.show())}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onKeyDown)}formatTime(t){const e=t.time_from??"--:--",i=t.time_to??"--:--";return`${e} – ${i}`}isBlockActive(t){if(!t.time_from||!t.time_to)return!1;const e=new Date,i=e.toISOString().slice(0,10);if(t.day==="tomorrow")return!1;const s=`${i}T${t.time_from}`,o=`${i}T${t.time_to}`,a=new Date(s),n=new Date(o);return e>=a&&e<n}renderEmpty(){return l`
      <div class="empty-state">
        <div class="empty-icon">🔌</div>
        <div class="empty-text">Žádné plánované nabíjení</div>
        <div class="empty-sub">Plán nabíjení ze sítě není aktivní.</div>
      </div>
    `}renderContent(){const t=this.data;if(!t)return this.renderEmpty();const e=t.blocks.find(i=>this.isBlockActive(i));return l`
      ${t.hasBlocks?l`
        <!-- Summary chips -->
        <div class="summary-row">
          ${t.totalEnergyKwh>0?l`
            <span class="summary-chip energy">⚡ ${t.totalEnergyKwh.toFixed(1)} kWh</span>
          `:E}
          ${t.totalCostCzk>0?l`
            <span class="summary-chip cost">💰 ~${t.totalCostCzk.toFixed(0)} Kč</span>
          `:E}
          ${t.windowLabel?l`
            <span class="summary-chip time">🪟 ${t.windowLabel}</span>
          `:E}
          ${t.durationMinutes>0?l`
            <span class="summary-chip time">⏱️ ${Math.round(t.durationMinutes)} min</span>
          `:E}
        </div>

        <!-- Active block banner -->
        ${e?l`
          <div class="active-block-banner">
            <div class="pulse-dot"></div>
            <span>Probíhá: ${this.formatTime(e)}
              ${e.grid_charge_kwh!=null?` · ${e.grid_charge_kwh.toFixed(1)} kWh`:E}
            </span>
          </div>
        `:E}

        <!-- Blocks table -->
        <div class="section-title">Bloky nabíjení</div>
        <table class="blocks-table">
          <thead>
            <tr>
              <th>Čas</th>
              <th>Den</th>
              <th>kWh</th>
              <th>Cena</th>
            </tr>
          </thead>
          <tbody>
            ${t.blocks.map((i,s)=>{const o=this.isBlockActive(i);return l`
                <tr class="${o?"is-active":!o&&s===0&&!e?"is-next":""}">
                  <td>${this.formatTime(i)}</td>
                  <td>
                    ${i.day?l`
                      <span class="day-badge ${i.day}">${i.day==="today"?"dnes":"zítra"}</span>
                    `:E}
                  </td>
                  <td>${i.grid_charge_kwh!=null?i.grid_charge_kwh.toFixed(1):"--"}</td>
                  <td>${i.total_cost_czk!=null?`${i.total_cost_czk.toFixed(0)} Kč`:"--"}</td>
                </tr>
              `})}
          </tbody>
        </table>
      `:this.renderEmpty()}
    `}render(){var t;return this.open?l`
      <div class="overlay" @click=${this.onOverlayClick}>
        <div class="dialog" role="dialog" aria-modal="true" aria-label="Plánované síťové nabíjení">
          <div class="dialog-header">
            <span class="dialog-header-icon">🔌</span>
            <div>
              <div class="dialog-header-title">Plánované síťové nabíjení</div>
              ${(t=this.data)!=null&&t.hasBlocks?l`
                <div class="dialog-header-subtitle">
                  ${this.data.blocks.length} blok${this.data.blocks.length>1?"ů":""}
                </div>
              `:E}
            </div>
            <button class="close-btn" @click=${()=>this.hide()} aria-label="Zavřít">✕</button>
          </div>
          <div class="dialog-body">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `:E}};Me.styles=_`
    :host {
      display: contents;
    }

    /* ---- Overlay ---- */
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 9000;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.18s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* ---- Dialog box ---- */
    .dialog {
      position: relative;
      background: ${pt(r.cardBg)};
      border: 1px solid rgba(33,150,243,0.3);
      border-radius: 16px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      max-width: 480px;
      width: 100%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.2s ease;
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* ---- Header ---- */
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 20px 14px;
      border-bottom: 1px solid ${pt(r.divider)};
      flex-shrink: 0;
    }

    .dialog-header-icon {
      font-size: 22px;
      line-height: 1;
    }

    .dialog-header-title {
      flex: 1;
      font-size: 15px;
      font-weight: 700;
      color: ${pt(r.textPrimary)};
    }

    .dialog-header-subtitle {
      font-size: 11px;
      color: ${pt(r.textSecondary)};
      margin-top: 2px;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: ${pt(r.textSecondary)};
      font-size: 20px;
      line-height: 1;
      padding: 4px;
      border-radius: 6px;
      transition: background 0.15s, color 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: rgba(255,255,255,0.08);
      color: ${pt(r.textPrimary)};
    }

    /* ---- Body ---- */
    .dialog-body {
      padding: 16px 20px 20px;
      overflow-y: auto;
      flex: 1;
    }

    /* ---- Summary chips ---- */
    .summary-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .summary-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(33,150,243,0.12);
      color: #42a5f5;
      border: 1px solid rgba(33,150,243,0.25);
    }

    .summary-chip.energy {
      background: rgba(76,175,80,0.12);
      color: #66bb6a;
      border-color: rgba(76,175,80,0.25);
    }

    .summary-chip.cost {
      background: rgba(255,152,0,0.12);
      color: #ffa726;
      border-color: rgba(255,152,0,0.25);
    }

    .summary-chip.time {
      background: rgba(149,117,205,0.12);
      color: #ab91d0;
      border-color: rgba(149,117,205,0.25);
    }

    /* ---- Section header ---- */
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${pt(r.textSecondary)};
      margin-bottom: 8px;
    }

    /* ---- Active block banner ---- */
    .active-block-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(76,175,80,0.12);
      border: 1px solid rgba(76,175,80,0.3);
      font-size: 13px;
      color: #81c784;
      margin-bottom: 14px;
    }

    .active-block-banner .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4caf50;
      flex-shrink: 0;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }

    /* ---- Blocks table ---- */
    .blocks-table {
      width: 100%;
      border-collapse: collapse;
    }

    .blocks-table th {
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${pt(r.textSecondary)};
      padding: 0 6px 8px;
      border-bottom: 1px solid ${pt(r.divider)};
    }

    .blocks-table th:last-child,
    .blocks-table td:last-child {
      text-align: right;
    }

    .blocks-table td {
      padding: 8px 6px;
      font-size: 12px;
      color: ${pt(r.textPrimary)};
      border-bottom: 1px solid rgba(255,255,255,0.04);
      vertical-align: middle;
    }

    .blocks-table tr:last-child td {
      border-bottom: none;
    }

    .blocks-table tr.is-active td {
      color: #81c784;
      background: rgba(76,175,80,0.06);
    }

    .blocks-table tr.is-next td {
      color: #42a5f5;
    }

    .day-badge {
      display: inline-block;
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 999px;
      margin-left: 4px;
      font-weight: 600;
      vertical-align: middle;
    }

    .day-badge.today {
      background: rgba(33,150,243,0.15);
      color: #42a5f5;
    }

    .day-badge.tomorrow {
      background: rgba(149,117,205,0.15);
      color: #ab91d0;
    }

    /* ---- Empty state ---- */
    .empty-state {
      text-align: center;
      padding: 32px 16px;
      color: ${pt(r.textSecondary)};
    }

    .empty-state .empty-icon {
      font-size: 40px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-state .empty-text {
      font-size: 14px;
      margin-bottom: 4px;
    }

    .empty-state .empty-sub {
      font-size: 12px;
      opacity: 0.6;
    }
  `;ji([u({type:Object})],Me.prototype,"data",2);ji([v()],Me.prototype,"open",2);Me=ji([C("oig-grid-charging-dialog")],Me);var Un=Object.defineProperty,Gn=Object.getOwnPropertyDescriptor,X=(t,e,i,s)=>{for(var o=s>1?void 0:s?Gn(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&Un(e,i,o),o};const G=j;vi.register(Lo,Bo,Fo,Ro,No,jo,Ho);let St=class extends S{constructor(){super(...arguments),this.values=[],this.color="rgba(76, 175, 80, 1)",this.startTime="",this.endTime="",this.chart=null,this.lastDataKey="",this.initializing=!1}render(){return l`<canvas></canvas>`}firstUpdated(){this.values.length>0&&(this.initializing=!0,requestAnimationFrame(()=>{this.createSparkline(),this.initializing=!1}))}updated(t){this.initializing||(t.has("values")||t.has("color"))&&this.updateOrCreateSparkline()}disconnectedCallback(){super.disconnectedCallback(),this.destroyChart()}updateOrCreateSparkline(){var e,i,s,o;if(!this.canvas||this.values.length===0)return;const t=JSON.stringify({v:this.values,c:this.color});if(!(t===this.lastDataKey&&this.chart)){if(this.lastDataKey=t,(s=(i=(e=this.chart)==null?void 0:e.data)==null?void 0:i.datasets)!=null&&s[0]){const a=this.chart.data.datasets[0];if(!((((o=this.chart.data.labels)==null?void 0:o.length)||0)!==this.values.length)){a.data=this.values,a.borderColor=this.color,a.backgroundColor=this.color.replace("1)","0.2)"),this.chart.update("none");return}}this.destroyChart(),this.createSparkline()}}createSparkline(){if(!this.canvas||this.values.length===0)return;this.destroyChart();const t=this.color,e=this.values,i=new Date(this.startTime),s=e.map((o,a)=>new Date(i.getTime()+a*15*60*1e3).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}));this.chart=new vi(this.canvas,{type:"line",data:{labels:s,datasets:[{data:e,borderColor:t,backgroundColor:t.replace("1)","0.2)"),borderWidth:2,fill:!0,tension:.3,pointRadius:0,pointHoverRadius:5}]},plugins:[],options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:0},plugins:{legend:{display:!1},tooltip:{enabled:!0,backgroundColor:"rgba(0, 0, 0, 0.8)",titleColor:"#fff",bodyColor:"#fff",padding:8,displayColors:!1,callbacks:{title:o=>{var a;return((a=o[0])==null?void 0:a.label)||""},label:o=>`${o.parsed.y.toFixed(2)} Kč/kWh`}},datalabels:{display:!1},zoom:{pan:{enabled:!0,mode:"x",modifierKey:"shift"},zoom:{wheel:{enabled:!0,speed:.1},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)"},mode:"x"}}},scales:{x:{display:!1},y:{display:!0,position:"right",grace:"10%",ticks:{color:"rgba(255, 255, 255, 0.6)",font:{size:8},callback:o=>Number(o).toFixed(1),maxTicksLimit:3},grid:{display:!1}}},layout:{padding:0},interaction:{mode:"nearest",intersect:!1}}})}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}};St.styles=_`
    :host {
      display: block;
      width: 100%;
      height: 30px;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `;X([u({type:Array})],St.prototype,"values",2);X([u({type:String})],St.prototype,"color",2);X([u({type:String})],St.prototype,"startTime",2);X([u({type:String})],St.prototype,"endTime",2);X([yi("canvas")],St.prototype,"canvas",2);St=X([C("oig-mini-sparkline")],St);let at=class extends S{constructor(){super(...arguments),this.title="",this.time="",this.valueText="",this.value=0,this.unit="Kč/kWh",this.variant="default",this.clickable=!1,this.startTime="",this.endTime="",this.sparklineValues=[],this.sparklineColor="rgba(76, 175, 80, 1)",this.handleClick=()=>{this.clickable&&this.dispatchEvent(new CustomEvent("card-click",{detail:{startTime:this.startTime,endTime:this.endTime,value:this.value},bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),this.clickable&&this.addEventListener("click",this.handleClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleClick)}render(){const t=this.valueText||`${this.value.toFixed(2)} <span class="stat-unit">${this.unit}</span>`;return l`
      <div class="card-title">${this.title}</div>
      <div class="card-value ${this.variant}" .innerHTML=${t}></div>
      ${this.time?l`<div class="card-time">${this.time}</div>`:E}
      ${this.sparklineValues.length>0?l`
            <div class="sparkline-container">
              <oig-mini-sparkline
                .values=${this.sparklineValues}
                .color=${this.sparklineColor}
                .startTime=${this.startTime}
                .endTime=${this.endTime}
              ></oig-mini-sparkline>
            </div>
          `:E}
    `}};at.styles=_`
    :host {
      display: block;
      background: ${G(r.cardBg)};
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: ${G(r.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
      border: 1px solid transparent;
    }

    :host([clickable]) {
      cursor: pointer;
    }

    :host([clickable]:hover) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    :host(.zoom-active) {
      border-color: rgba(33, 150, 243, 0.5);
      box-shadow: 0 0 12px rgba(33, 150, 243, 0.3);
    }

    .card-title {
      font-size: 11px;
      color: ${G(r.textSecondary)};
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 700;
      color: ${G(r.textPrimary)};
      line-height: 1.2;
    }

    .card-value .stat-unit {
      font-size: 12px;
      font-weight: 400;
      color: ${G(r.textSecondary)};
    }

    .card-value.success { color: #4CAF50; }
    .card-value.warning { color: #FFA726; }
    .card-value.danger { color: #F44336; }
    .card-value.info { color: #29B6F6; }

    .card-time {
      font-size: 10px;
      color: ${G(r.textSecondary)};
      margin-top: 4px;
    }

    .sparkline-container {
      margin-top: 8px;
    }
  `;X([u({type:String})],at.prototype,"title",2);X([u({type:String})],at.prototype,"time",2);X([u({type:String})],at.prototype,"valueText",2);X([u({type:Number})],at.prototype,"value",2);X([u({type:String})],at.prototype,"unit",2);X([u({type:String})],at.prototype,"variant",2);X([u({type:Boolean})],at.prototype,"clickable",2);X([u({type:String})],at.prototype,"startTime",2);X([u({type:String})],at.prototype,"endTime",2);X([u({type:Array})],at.prototype,"sparklineValues",2);X([u({type:String})],at.prototype,"sparklineColor",2);at=X([C("oig-stats-card")],at);function Kn(t){const e=new Date(t.start),i=new Date(t.end),s=e.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit"}),o=e.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}),a=i.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"});return`${s} ${o} - ${a}`}let ze=class extends S{constructor(){super(...arguments),this.data=null,this.topOnly=!1}onCardClick(t){this.dispatchEvent(new CustomEvent("zoom-to-block",{detail:t.detail,bubbles:!0,composed:!0}))}renderPriceTiles(){if(!this.data)return E;const t=this.data.solarForecastTotal>0;return l`
      <div class="price-tile spot">
        <div class="price-tile-label">Spot</div>
        <div class="price-tile-value">${this.data.currentSpotPrice.toFixed(2)} <span class="price-tile-unit">Kč/kWh</span></div>
        <div class="price-tile-sub">Aktuální hodina</div>
      </div>

      <div class="price-tile export">
        <div class="price-tile-label">Výkup</div>
        <div class="price-tile-value">${this.data.currentExportPrice.toFixed(2)} <span class="price-tile-unit">Kč/kWh</span></div>
        <div class="price-tile-sub">Za přetok</div>
      </div>

      <div class="price-tile solar">
        <div class="price-tile-label">☀ Solar dnes</div>
        <div class="price-tile-value">
          ${t?l`${this.data.solarForecastTotal.toFixed(1)} <span class="price-tile-unit">kWh</span>`:l`-- <span class="price-tile-unit">kWh</span>`}
        </div>
        <div class="price-tile-sub">${t?"Předpověď":"Nedostupná"}</div>
      </div>
    `}renderBlockCard(t,e,i,s){return e?l`
      <oig-stats-card
        title=${t}
        .value=${e.avg}
        unit="Kč/kWh"
        .time=${Kn(e)}
        variant=${i}
        clickable
        .startTime=${e.start}
        .endTime=${e.end}
        .sparklineValues=${e.values}
        .sparklineColor=${s}
        @card-click=${this.onCardClick}
      ></oig-stats-card>
    `:E}renderExtremeBlocks(){if(!this.data)return E;const{cheapestBuyBlock:t,expensiveBuyBlock:e,bestExportBlock:i,worstExportBlock:s}=this.data;return l`
      ${this.renderBlockCard("Nejlevnější nákup",t,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejdražší nákup",e,"danger","rgba(244, 67, 54, 1)")}
      ${this.renderBlockCard("Nejlepší výkup",i,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejhorší výkup",s,"warning","rgba(255, 167, 38, 1)")}
    `}renderPlannedConsumption(){var n;const t=(n=this.data)==null?void 0:n.plannedConsumption;if(!t)return E;const e=t.todayTotalKwh,i=t.tomorrowKwh,s=e+(i||0),o=s>0?e/s*100:50,a=s>0?(i||0)/s*100:50;return l`
      <div class="planned-section">
        <div class="section-label" style="margin-bottom: 8px;">Plánovaná spotřeba</div>
        <div class="planned-header">
          <div>
            <div class="planned-main-value">
              ${t.totalPlannedKwh>0?l`${t.totalPlannedKwh.toFixed(1)} <span class="unit">kWh</span>`:"--"}
            </div>
            <div class="planned-profile">${t.profile}</div>
          </div>
          ${t.trendText?l`<div class="planned-trend">${t.trendText}</div>`:E}
        </div>

        <div class="planned-details">
          <div class="planned-detail-item">
            <div class="planned-detail-label">Dnes spotřeba</div>
            <div class="planned-detail-value">${t.todayConsumedKwh.toFixed(1)} kWh</div>
          </div>
          <div class="planned-detail-item">
            <div class="planned-detail-label">Dnes zbývá</div>
            <div class="planned-detail-value">
              ${t.todayPlannedKwh!=null?`${t.todayPlannedKwh.toFixed(1)} kWh`:"--"}
            </div>
          </div>
          <div class="planned-detail-item">
            <div class="planned-detail-label">Zítra celkem</div>
            <div class="planned-detail-value">
              ${i!=null?`${i.toFixed(1)} kWh`:"--"}
            </div>
          </div>
        </div>

        ${s>0?l`
              <div class="planned-bars">
                <div class="bar-today" style="width: ${o}%"></div>
                <div class="bar-tomorrow" style="width: ${a}%"></div>
              </div>
              <div class="bar-labels">
                <span>Dnes: ${e.toFixed(1)}</span>
                <span>Zítra: ${i!=null?i.toFixed(1):"--"}</span>
              </div>
            `:E}
      </div>
    `}render(){return!this.data||this.data.timeline.length===0?this.topOnly?E:l`<div style="color: ${r.textSecondary}; padding: 16px;">Načítání cenových dat...</div>`:this.topOnly?l`
        <div class="top-row">
          ${this.renderPriceTiles()}
          ${this.renderExtremeBlocks()}
        </div>
      `:l`${this.renderPlannedConsumption()}`}};ze.styles=_`
    :host {
      display: block;
      margin-bottom: 16px;
    }

    /* Top row: price tiles + extreme blocks in one line */
    .top-row {
      display: grid;
      grid-template-columns: auto auto auto 1fr 1fr 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
      align-items: stretch;
    }

    /* Compact price tiles: spot, export, solar */
    .price-tile {
      background: ${G(r.cardBg)};
      border-radius: 10px;
      padding: 10px 12px;
      box-shadow: ${G(r.cardShadow)};
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 76px;
    }

    .price-tile.spot {
      background: linear-gradient(135deg, ${G(r.accent)}22 0%, ${G(r.accent)}11 100%);
      border-color: rgba(76, 175, 80, 0.3);
    }

    .price-tile.export {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%);
      border-color: rgba(76, 175, 80, 0.3);
    }

    .price-tile.solar {
      background: linear-gradient(135deg, rgba(255, 167, 38, 0.2) 0%, rgba(255, 167, 38, 0.1) 100%);
      border-color: rgba(255, 167, 38, 0.3);
    }

    .price-tile-label {
      font-size: 10px;
      color: ${G(r.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .price-tile-value {
      font-size: 16px;
      font-weight: 700;
      color: ${G(r.textPrimary)};
      line-height: 1.2;
    }

    .price-tile-unit {
      font-size: 10px;
      font-weight: 400;
      color: ${G(r.textSecondary)};
      opacity: 0.7;
    }

    .price-tile-sub {
      font-size: 9px;
      color: ${G(r.textSecondary)};
      opacity: 0.55;
      margin-top: 3px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: ${G(r.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    /* Planned consumption */
    .planned-section {
      background: ${G(r.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: ${G(r.cardShadow)};
    }

    .planned-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .planned-main-value {
      font-size: 22px;
      font-weight: 700;
      color: ${G(r.textPrimary)};
    }

    .planned-main-value .unit {
      font-size: 12px;
      font-weight: 400;
      color: ${G(r.textSecondary)};
    }

    .planned-trend {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
    }

    .planned-profile {
      font-size: 11px;
      color: ${G(r.textSecondary)};
      margin-bottom: 10px;
    }

    .planned-details {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }

    .planned-detail-item {
      text-align: center;
    }

    .planned-detail-label {
      font-size: 10px;
      color: ${G(r.textSecondary)};
      text-transform: uppercase;
    }

    .planned-detail-value {
      font-size: 14px;
      font-weight: 600;
      color: ${G(r.textPrimary)};
      margin-top: 2px;
    }

    .planned-bars {
      display: flex;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 10px;
      background: rgba(255, 255, 255, 0.05);
    }

    .bar-today {
      background: #4CAF50;
      transition: width 0.3s;
    }

    .bar-tomorrow {
      background: #FFA726;
      transition: width 0.3s;
    }

    .bar-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      font-size: 9px;
      color: ${G(r.textSecondary)};
    }


    @media (max-width: 700px) {
      .top-row {
        grid-template-columns: repeat(4, 1fr);
      }
      .planned-details {
        grid-template-columns: 1fr 1fr;
      }
      .bottom-row {
        grid-template-columns: 1fr;
      }
    }
  `;X([u({type:Object})],ze.prototype,"data",2);X([u({type:Boolean})],ze.prototype,"topOnly",2);ze=X([C("oig-pricing-stats")],ze);function Mo(t,e){if(!(e!=null&&e.start)||!(e!=null&&e.end))return null;const i=t.getPixelForValue(e.start.getTime()),s=t.getPixelForValue(e.end.getTime());if(!Number.isFinite(i)||!Number.isFinite(s))return null;const o=Math.min(i,s),a=Math.max(Math.abs(s-i),2);return!Number.isFinite(a)||a<=0?null:{left:o,width:a}}const Zn={id:"pricingModeIcons",beforeDatasetsDraw(t,e,i){var d;const s=i,o=s==null?void 0:s.segments;if(!(o!=null&&o.length))return;const a=t.chartArea,n=(d=t.scales)==null?void 0:d.x;if(!a||!n)return;const c=t.ctx;c.save(),c.globalAlpha=(s==null?void 0:s.backgroundOpacity)??.12;for(const p of o){const g=Mo(n,p);g&&(c.fillStyle=p.color||"rgba(255, 255, 255, 0.1)",c.fillRect(g.left,a.top,g.width,a.bottom-a.top))}c.restore()},afterDatasetsDraw(t,e,i){var it;const s=i,o=s==null?void 0:s.segments;if(!(o!=null&&o.length))return;const a=(it=t.scales)==null?void 0:it.x,n=t.chartArea;if(!a||!n)return;const c=(s==null?void 0:s.iconSize)??16,d=(s==null?void 0:s.labelSize)??9,p=`${c}px "Inter", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,g=`${d}px "Inter", sans-serif`,f=(s==null?void 0:s.iconColor)||"rgba(255, 255, 255, 0.95)",w=(s==null?void 0:s.labelColor)||"rgba(255, 255, 255, 0.7)",m=(s==null?void 0:s.axisBandPadding)??10,x=(s==null?void 0:s.axisBandHeight)??c+d+10,h=(s==null?void 0:s.axisBandColor)||"rgba(6, 10, 18, 0.12)",$=(s==null?void 0:s.iconAlignment)||"start",P=(s==null?void 0:s.iconStartOffset)??12,T=(s==null?void 0:s.iconBaselineOffset)??4,I=(a.bottom||n.bottom)+m,Y=Math.min(I,t.height-x-2),H=n.right-n.left,y=Y+T,F=t.ctx;F.save(),F.globalCompositeOperation="destination-over",F.fillStyle=h,F.fillRect(n.left,Y,H,x),F.restore(),F.save(),F.globalCompositeOperation="destination-over",F.textAlign="center",F.textBaseline="top";for(const N of o){const et=Mo(a,N);if(!et)continue;let W;if($==="start"){W=et.left+P;const V=et.left+et.width-c/2;W>V&&(W=et.left+et.width/2)}else W=et.left+et.width/2;F.font=p,F.fillStyle=f,F.fillText(N.icon||"❓",W,y),N.shortLabel&&(F.font=g,F.fillStyle=w,F.fillText(N.shortLabel,W,y+c-2))}F.restore()}};function zo(t,e){if(!t)return;t.layout||(t.layout={}),t.layout.padding||(t.layout.padding={});const i=t.layout.padding,s=12;i.top=i.top??12,i.bottom=Math.max(i.bottom||0,s)}var Yn=Object.defineProperty,Qn=Object.getOwnPropertyDescriptor,de=(t,e,i,s)=>{for(var o=s>1?void 0:s?Qn(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&Yn(e,i,o),o};const kt=j;vi.register(Lo,Bo,zs,Os,Fo,Ro,As,No,Is,Ds,jo,Ho,Ls,Bs,Vo,Zn);function Xn(t){const e=t.timeline.map(i=>i.spot_price_czk??0);return{label:"📊 Spotová cena nákupu",data:e,borderColor:"#2196F3",backgroundColor:"rgba(33, 150, 243, 0.15)",borderWidth:3,fill:!1,tension:.4,type:"line",yAxisID:"y-price",pointRadius:e.map(()=>0),pointHoverRadius:7,pointBackgroundColor:e.map(()=>"#42a5f5"),pointBorderColor:e.map(()=>"#42a5f5"),pointBorderWidth:2,order:1,datalabels:{display:!1}}}function Jn(t){return{label:"💰 Výkupní cena",data:t.timeline.map(e=>e.export_price_czk??0),borderColor:"#4CAF50",backgroundColor:"rgba(76, 187, 106, 0.15)",borderWidth:2,fill:!1,type:"line",tension:.4,yAxisID:"y-price",pointRadius:0,pointHoverRadius:5,order:1,borderDash:[5,5]}}function tr(t){if(!t.solar)return[];const{string1:e,string2:i,hasString1:s,hasString2:o}=t.solar,a=(s?1:0)+(o?1:0),n={string1:{border:"rgba(255, 193, 7, 0.8)",bg:"rgba(255, 193, 7, 0.2)"},string2:{border:"rgba(255, 152, 0, 0.8)",bg:"rgba(255, 152, 0, 0.2)"}};if(a===1){const c=s?e:i,d=s?n.string1:n.string2;return[{label:"☀️ Solární předpověď",data:c,borderColor:d.border,backgroundColor:d.bg,borderWidth:2,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",pointRadius:0,pointHoverRadius:5,order:2}]}return a===2?[{label:"☀️ String 2",data:i,borderColor:n.string2.border,backgroundColor:n.string2.bg,borderWidth:1.5,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2},{label:"☀️ String 1",data:e,borderColor:n.string1.border,backgroundColor:n.string1.bg,borderWidth:1.5,fill:"-1",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2}]:[]}function er(t){if(!t.battery)return[];const{baseline:e,solarCharge:i,gridCharge:s,gridNet:o,consumption:a}=t.battery,n=[],c={baseline:{border:"#78909C",bg:"rgba(120, 144, 156, 0.25)"},solar:{border:"transparent",bg:"rgba(255, 167, 38, 0.6)"},grid:{border:"transparent",bg:"rgba(33, 150, 243, 0.6)"}};return a.some(d=>d!=null&&d>0)&&n.push({label:"🏠 Spotřeba (plán)",data:a,borderColor:"rgba(255, 112, 67, 0.7)",backgroundColor:"rgba(255, 112, 67, 0.12)",borderWidth:1.5,type:"line",fill:!1,tension:.25,pointRadius:0,pointHoverRadius:5,yAxisID:"y-power",stack:"consumption",borderDash:[6,4],order:2}),s.some(d=>d!=null&&d>0)&&n.push({label:"⚡ Do baterie ze sítě",data:s,backgroundColor:c.grid.bg,borderColor:c.grid.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),i.some(d=>d!=null&&d>0)&&n.push({label:"☀️ Do baterie ze soláru",data:i,backgroundColor:c.solar.bg,borderColor:c.solar.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),n.push({label:"🔋 Zbývající kapacita",data:e,backgroundColor:c.baseline.bg,borderColor:c.baseline.border,borderWidth:3,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),o.some(d=>d!==null)&&n.push({label:"📡 Netto odběr ze sítě",data:o,borderColor:"#00BCD4",backgroundColor:"transparent",borderWidth:2,type:"line",fill:!1,tension:.2,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",order:2}),n}function Oo(t){const e=[];return t.prices.length>0&&e.push(Xn(t)),t.exportPrices.length>0&&e.push(Jn(t)),e.push(...tr(t)),e.push(...er(t)),e}function Qe(t,e,i=""){if(t==null)return"";const s=i?` ${i}`:"";return`${t.toFixed(e)}${s}`}function Kt(t){var o;const e=(o=t.scales)==null?void 0:o.x;if(!e)return"overview";const s=(e.max-e.min)/(1e3*60*60);return s<=6?"detail":s<=24?"day":"overview"}function Lt(t,e){var g,f,w,m,x,h,$,P,T,I,Y;if(!((g=t==null?void 0:t.scales)!=null&&g.x))return;const i=t.scales.x,o=(i.max-i.min)/(1e3*60*60),a=Kt(t),n=(w=(f=t.options.plugins)==null?void 0:f.legend)==null?void 0:w.labels;n&&(n.padding=10,n.font&&(n.font.size=11),a==="detail"&&(n.padding=12,n.font&&(n.font.size=12)));const c=["y-price","y-solar","y-power"];for(const H of c){const y=(m=t.options.scales)==null?void 0:m[H];y&&(a==="overview"?(y.title&&(y.title.display=!1),(x=y.ticks)!=null&&x.font&&(y.ticks.font.size=10),H==="y-solar"&&(y.display=!1)):a==="detail"?(y.title&&(y.title.display=!0,y.title.font&&(y.title.font.size=12)),(h=y.ticks)!=null&&h.font&&(y.ticks.font.size=11),y.display=!0):(y.title&&(y.title.display=!0,y.title.font&&(y.title.font.size=11)),($=y.ticks)!=null&&$.font&&(y.ticks.font.size=10),y.display=!0))}const d=(P=t.options.scales)==null?void 0:P.x;d&&(a==="overview"?d.ticks&&(d.ticks.maxTicksLimit=12,d.ticks.font&&(d.ticks.font.size=10)):a==="detail"?(d.ticks&&(d.ticks.maxTicksLimit=24,d.ticks.font&&(d.ticks.font.size=11)),d.time&&(d.time.displayFormats.hour="HH:mm")):(d.ticks&&(d.ticks.maxTicksLimit=16,d.ticks.font&&(d.ticks.font.size=10)),d.time&&(d.time.displayFormats.hour="dd.MM HH:mm")));const p=e==="always"||e==="auto"&&o<=6;for(const H of t.data.datasets){const y=H;if(y.datalabels||(y.datalabels={}),e==="never"){y.datalabels.display=!1;continue}if(p){let F=1;o>3&&o<=6?F=2:o>6&&(F=4),y.datalabels.display=W=>{const V=W.dataset.data[W.dataIndex];return V==null||V===0?!1:W.dataIndex%F===0};const it=y.yAxisID==="y-price",N=((T=y.label)==null?void 0:T.includes("Solární"))||((I=y.label)==null?void 0:I.includes("String")),et=(Y=y.label)==null?void 0:Y.includes("kapacita");y.datalabels.align="top",y.datalabels.offset=6,y.datalabels.color="#fff",y.datalabels.font={size:9,weight:"bold"},it?(y.datalabels.formatter=W=>Qe(W,2,"Kč"),y.datalabels.backgroundColor=y.borderColor||"rgba(33, 150, 243, 0.8)"):N?(y.datalabels.formatter=W=>Qe(W,1,"kW"),y.datalabels.backgroundColor=y.borderColor||"rgba(255, 193, 7, 0.8)"):et?(y.datalabels.formatter=W=>Qe(W,1,"kWh"),y.datalabels.backgroundColor=y.borderColor||"rgba(120, 144, 156, 0.8)"):(y.datalabels.formatter=W=>Qe(W,1),y.datalabels.backgroundColor=y.borderColor||"rgba(33, 150, 243, 0.8)"),y.datalabels.borderRadius=4,y.datalabels.padding={top:3,bottom:3,left:5,right:5}}else y.datalabels.display=!1}t.update("none"),b.debug(`[PricingChart] Detail: ${o.toFixed(1)}h, Labels: ${p?"ON":"OFF"}, Mode: ${e}`)}let Ct=class extends S{constructor(){super(...arguments),this.data=null,this.datalabelMode="auto",this.zoomState={start:null,end:null},this.currentDetailLevel="overview",this.chart=null,this.resizeObserver=null}firstUpdated(){this.setupResizeObserver(),this.data&&this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())}updated(t){t.has("data")&&this.data&&(this.chart?this.updateChartData():this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())),t.has("datalabelMode")&&this.chart&&Lt(this.chart,this.datalabelMode)}disconnectedCallback(){var t;super.disconnectedCallback(),this.destroyChart(),(t=this.resizeObserver)==null||t.disconnect(),this.resizeObserver=null}zoomToTimeRange(t,e){if(!this.chart){b.warn("[PricingChart] Chart not available for zoom");return}const i=new Date(t),s=new Date(e),o=15*60*1e3,a=i.getTime()-o,n=s.getTime()+o;if(this.zoomState.start!==null&&Math.abs(this.zoomState.start-a)<6e4&&this.zoomState.end!==null&&Math.abs(this.zoomState.end-n)<6e4){b.debug("[PricingChart] Already zoomed to same range → reset"),this.resetZoom();return}try{const c=this.chart.options;c.scales.x.min=a,c.scales.x.max=n,this.chart.update("none"),this.zoomState={start:a,end:n},this.currentDetailLevel=Kt(this.chart),Lt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-change",{detail:{start:a,end:n,level:this.currentDetailLevel},bubbles:!0,composed:!0})),b.debug("[PricingChart] Zoomed to range",{start:new Date(a).toISOString(),end:new Date(n).toISOString()})}catch(c){b.error("[PricingChart] Zoom error",c)}}resetZoom(){if(!this.chart)return;const t=this.chart.options;delete t.scales.x.min,delete t.scales.x.max,this.chart.update("none"),this.zoomState={start:null,end:null},this.currentDetailLevel=Kt(this.chart),Lt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-reset",{bubbles:!0,composed:!0}))}getChart(){return this.chart}createChart(){if(!this.canvas||!this.data||this.data.timeline.length===0)return;this.chart&&this.destroyChart();const t=this.data,e=Oo(t),i={responsive:!0,maintainAspectRatio:!1,animation:{duration:0},interaction:{mode:"index",intersect:!1},plugins:{legend:{labels:{color:"#ffffff",font:{size:11,weight:"500"},padding:10,usePointStyle:!0,pointStyle:"circle",boxWidth:12,boxHeight:12},position:"top"},tooltip:{backgroundColor:"rgba(0,0,0,0.9)",titleColor:"#ffffff",bodyColor:"#ffffff",titleFont:{size:13,weight:"bold"},bodyFont:{size:11},padding:10,cornerRadius:6,displayColors:!0,callbacks:{title:o=>o.length>0?new Date(o[0].parsed.x).toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"",label:o=>{let a=o.dataset.label||"";return a&&(a+=": "),o.parsed.y!==null&&(o.dataset.yAxisID==="y-price"?a+=o.parsed.y.toFixed(2)+" Kč/kWh":o.dataset.yAxisID==="y-solar"?a+=o.parsed.y.toFixed(2)+" kWh":o.dataset.yAxisID==="y-power"?a+=o.parsed.y.toFixed(2)+" kW":a+=o.parsed.y),a}}},datalabels:{display:!1},zoom:{zoom:{wheel:{enabled:!0,modifierKey:null},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)",borderColor:"rgba(33, 150, 243, 0.8)",borderWidth:2},pinch:{enabled:!0},mode:"x",onZoomComplete:({chart:o})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=Kt(o),Lt(o,this.datalabelMode)}},pan:{enabled:!0,mode:"x",modifierKey:"shift",onPanComplete:({chart:o})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=Kt(o),Lt(o,this.datalabelMode)}},limits:{x:{minRange:36e5}}},pricingModeIcons:null},scales:{x:{type:"timeseries",time:{unit:"hour",displayFormats:{hour:"dd.MM HH:mm"},tooltipFormat:"dd.MM.yyyy HH:mm"},ticks:{color:this.getTextColor(),maxRotation:45,minRotation:45,font:{size:11},maxTicksLimit:20},grid:{color:this.getGridColor(),lineWidth:1}},"y-price":{type:"linear",position:"left",ticks:{color:"#2196F3",font:{size:11,weight:"500"},callback:o=>o.toFixed(2)+" Kč"},grid:{color:"rgba(33, 150, 243, 0.15)",lineWidth:1},title:{display:!0,text:"💰 Cena (Kč/kWh)",color:"#2196F3",font:{size:13,weight:"bold"}}},"y-solar":{type:"linear",position:"left",stacked:!0,ticks:{color:"#78909C",font:{size:11,weight:"500"},callback:o=>o.toFixed(1)+" kWh",display:!0},grid:{display:!0,color:"rgba(120, 144, 156, 0.15)",lineWidth:1,drawOnChartArea:!0},title:{display:!0,text:"🔋 Kapacita baterie (kWh)",color:"#78909C",font:{size:11,weight:"bold"}},beginAtZero:!1},"y-power":{type:"linear",position:"right",stacked:!0,ticks:{color:"#FFA726",font:{size:11,weight:"500"},callback:o=>o.toFixed(2)+" kW"},grid:{display:!1},title:{display:!0,text:"☀️ Výkon (kW)",color:"#FFA726",font:{size:13,weight:"bold"}}}}};zo(i);const s={type:"bar",data:{labels:t.labels,datasets:e},plugins:[Vo],options:i};try{this.chart=new vi(this.canvas,s),Lt(this.chart,this.datalabelMode),t.initialZoomStart&&t.initialZoomEnd&&requestAnimationFrame(()=>{if(!this.chart)return;const o=this.chart.options;o.scales.x.min=t.initialZoomStart,o.scales.x.max=t.initialZoomEnd,this.chart.update("none"),this.currentDetailLevel=Kt(this.chart),Lt(this.chart,this.datalabelMode)}),b.info("[PricingChart] Chart created",{datasets:e.length,labels:t.labels.length,segments:t.modeSegments.length})}catch(o){b.error("[PricingChart] Failed to create chart",o)}}updateChartData(){var n;if(!this.chart||!this.data)return;const t=this.data,e=Oo(t),i=((n=this.chart.data.labels)==null?void 0:n.length)!==t.labels.length,s=this.chart.data.datasets.length!==e.length;i&&(this.chart.data.labels=t.labels);let o="none";s?(this.chart.data.datasets=e,o=void 0):e.forEach((c,d)=>{const p=this.chart.data.datasets[d];p&&(p.data=c.data,p.label=c.label,p.backgroundColor=c.backgroundColor,p.borderColor=c.borderColor)});const a=this.chart.options;a.plugins||(a.plugins={}),a.plugins.pricingModeIcons=null,zo(a),this.chart.update(o),b.debug("[PricingChart] Chart updated incrementally")}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(()=>{var t;(t=this.chart)==null||t.resize()}),this.resizeObserver.observe(this)}getTextColor(){try{return getComputedStyle(this).getPropertyValue("--oig-text-primary").trim()||"#e0e0e0"}catch{return"#e0e0e0"}}getGridColor(){try{return getComputedStyle(this).getPropertyValue("--oig-border").trim()||"rgba(255,255,255,0.1)"}catch{return"rgba(255,255,255,0.1)"}}setDatalabelMode(t){this.datalabelMode=t,this.dispatchEvent(new CustomEvent("datalabel-mode-change",{detail:{mode:t},bubbles:!0,composed:!0}))}get isZoomed(){return this.zoomState.start!==null||this.zoomState.end!==null}renderControls(){const t=e=>{const i=this.datalabelMode===e?"active":"";return e==="always"&&this.datalabelMode==="always"?`control-btn mode-always ${i}`:e==="never"&&this.datalabelMode==="never"?`control-btn mode-never ${i}`:`control-btn ${i}`};return l`
      <div class="chart-controls">
        <button class=${t("auto")} @click=${()=>this.setDatalabelMode("auto")}>
          Auto
        </button>
        <button class=${t("always")} @click=${()=>this.setDatalabelMode("always")}>
          Vždy
        </button>
        <button class=${t("never")} @click=${()=>this.setDatalabelMode("never")}>
          Nikdy
        </button>
        ${this.isZoomed?l`<button class="control-btn reset-btn" @click=${()=>this.resetZoom()}>
              Reset zoom
            </button>`:null}
      </div>
    `}render(){const t=this.data&&this.data.timeline.length>0;return l`
      <div class="chart-header">
        <span class="chart-title">Ceny elektřiny & předpověď</span>
        ${this.renderControls()}
      </div>

      <div class="chart-container">
        ${t?l`<canvas id="pricing-canvas"></canvas>`:l`<div class="no-data">Žádná data o cenách</div>`}
      </div>

      ${t?l`<div class="chart-hint">
            Kolečko myši = zoom | Shift + tah = posun | Tah = výběr oblasti
          </div>`:null}
    `}};Ct.styles=_`
    :host {
      display: block;
      background: ${kt(r.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${kt(r.cardShadow)};
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chart-title {
      font-size: 14px;
      font-weight: 600;
      color: ${kt(r.textPrimary)};
    }

    .chart-controls {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .control-btn {
      padding: 5px 10px;
      border: 1px solid rgba(76, 175, 80, 0.5);
      background: rgba(76, 175, 80, 0.2);
      color: ${kt(r.textSecondary)};
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .control-btn:hover {
      background: ${kt(r.accent)};
      color: #fff;
    }

    .control-btn.active {
      background: ${kt(r.accent)};
      color: #fff;
    }

    .control-btn.mode-always {
      background: rgba(76, 175, 80, 0.3);
      border-color: rgba(76, 175, 80, 0.7);
    }

    .control-btn.mode-never {
      background: rgba(244, 67, 54, 0.2);
      border-color: rgba(244, 67, 54, 0.5);
    }

    .control-btn.reset-btn {
      background: rgba(33, 150, 243, 0.2);
      border-color: rgba(33, 150, 243, 0.5);
      color: #64b5f6;
    }

    .control-btn.reset-btn:hover {
      background: rgba(33, 150, 243, 0.4);
    }

    .chart-container {
      position: relative;
      width: 100%;
      height: 380px;
      max-height: 400px;
    }

    @media (max-width: 768px) {
      .chart-container {
        height: 300px;
      }
    }

    canvas {
      width: 100% !important;
    }

    .no-data {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: ${kt(r.textSecondary)};
      font-size: 14px;
    }

    .chart-hint {
      font-size: 10px;
      color: ${kt(r.textSecondary)};
      opacity: 0.7;
      margin-top: 6px;
      text-align: center;
    }
  `;de([u({type:Object})],Ct.prototype,"data",2);de([u({type:String})],Ct.prototype,"datalabelMode",2);de([v()],Ct.prototype,"zoomState",2);de([v()],Ct.prototype,"currentDetailLevel",2);de([yi("#pricing-canvas")],Ct.prototype,"canvas",2);Ct=de([C("oig-pricing-chart")],Ct);var ir=Object.defineProperty,or=Object.getOwnPropertyDescriptor,R=(t,e,i,s)=>{for(var o=s>1?void 0:s?or(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&ir(e,i,o),o};const O=j,pe=_`
  background: ${O(r.cardBg)};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${O(r.cardShadow)};
`,Et=_`
  font-size: 15px;
  font-weight: 600;
  color: ${O(r.textPrimary)};
  margin: 0 0 12px 0;
`;function sr(t){return Math.max(0,Math.min(100,t))}function Ao(t){const s=Math.max(0,Math.min(1,(t-10)/60)),o={r:33,g:150,b:243},a={r:255,g:87,b:34},n=(c,d)=>Math.round(c+(d-c)*s);return`rgb(${n(o.r,a.r)}, ${n(o.g,a.g)}, ${n(o.b,a.b)})`}let si=class extends S{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return l`<div>Nacitani stavu...</div>`;const e=(i,s,o=1)=>i!=null?`${i.toFixed(o)} ${s}`:`-- ${s}`;return l`
      <h3>Stav bojleru</h3>
      <div class="grid">
        <div class="card">
          <div class="card-label">Nahrato</div>
          <div class="card-value">${e(t.heatingPercent,"%",0)}</div>
        </div>
        <div class="card">
          <div class="card-label">Teplota horni</div>
          <div class="card-value">${e(t.tempTop,"°C")}</div>
        </div>
        ${t.tempBottom!==null?l`
          <div class="card">
            <div class="card-label">Teplota spodni</div>
            <div class="card-value">${e(t.tempBottom,"°C")}</div>
          </div>
        `:E}
        <div class="card">
          <div class="card-label">Energie potrebna</div>
          <div class="card-value">${e(t.energyNeeded,"kWh",2)}</div>
        </div>
        <div class="card">
          <div class="card-label">Naklady planu</div>
          <div class="card-value">${e(t.planCost,"Kc",2)}</div>
        </div>
        <div class="card">
          <div class="card-label">Dalsi ohrev</div>
          <div class="card-value small">${t.nextHeating}</div>
        </div>
        <div class="card">
          <div class="card-label">Doporuceny zdroj</div>
          <div class="card-value small">${t.recommendedSource}</div>
        </div>
      </div>
    `}};si.styles=_`
    :host { display: block; }

    h3 { ${Et}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .card {
      ${pe};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${O(r.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 18px;
      font-weight: 600;
      color: ${O(r.textPrimary)};
    }

    .card-value.small {
      font-size: 13px;
      font-weight: 500;
    }
  `;R([u({type:Object})],si.prototype,"data",2);si=R([C("oig-boiler-status-grid")],si);let ai=class extends S{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return E;const e=i=>`${i.toFixed(2)} kWh`;return l`
      <h3>Rozpad energie</h3>
      <div class="cards">
        <div class="card">
          <div class="card-label">Z FVE</div>
          <div class="card-value fve">${e(t.fveKwh)}</div>
        </div>
        <div class="card">
          <div class="card-label">Ze site</div>
          <div class="card-value grid-c">${e(t.gridKwh)}</div>
        </div>
        <div class="card">
          <div class="card-label">Alternativa</div>
          <div class="card-value alt">${e(t.altKwh)}</div>
        </div>
      </div>

      <div class="ratio-bar">
        <div class="ratio-fve" style="width:${t.fvePercent.toFixed(1)}%"></div>
        <div class="ratio-grid" style="width:${t.gridPercent.toFixed(1)}%"></div>
        <div class="ratio-alt" style="width:${t.altPercent.toFixed(1)}%"></div>
      </div>
      <div class="ratio-labels">
        <span>${t.fvePercent.toFixed(0)}% FVE</span>
        <span>${t.gridPercent.toFixed(0)}% sit</span>
        <span>${t.altPercent.toFixed(0)}% alternativa</span>
      </div>
    `}};ai.styles=_`
    :host { display: block; }

    h3 { ${Et}; }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .card {
      ${pe};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${O(r.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 600;
    }

    .fve { color: #4CAF50; }
    .grid-c { color: #FF9800; }
    .alt { color: #2196F3; }

    .ratio-bar {
      display: flex;
      height: 14px;
      border-radius: 7px;
      overflow: hidden;
      background: ${O(r.bgSecondary)};
    }

    .ratio-fve { background: #4CAF50; }
    .ratio-grid { background: #FF9800; }
    .ratio-alt { background: #2196F3; }

    .ratio-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 11px;
      color: ${O(r.textSecondary)};
    }
  `;R([u({type:Object})],ai.prototype,"data",2);ai=R([C("oig-boiler-energy-breakdown")],ai);let ni=class extends S{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return E;const e=t.peakHours.length?t.peakHours.map(o=>`${o}h`).join(", "):"--",i=t.waterLiters40c!==null?`${t.waterLiters40c.toFixed(0)} L`:"-- L",s=t.circulationNow.startsWith("ANO");return l`
      <h3>Planovane odbery</h3>
      <div class="list">
        <div class="item">
          <span class="label">Predpokladana spotreba:</span>
          <span class="value">${t.predictedTodayKwh.toFixed(2)} kWh</span>
        </div>
        <div class="item">
          <span class="label">Piky spotreby:</span>
          <span class="value">${e}</span>
        </div>
        <div class="item">
          <span class="label">Objem vody (40°C):</span>
          <span class="value">${i}</span>
        </div>
        <div class="item">
          <span class="label">Doporucena cirkulace:</span>
          <span class="value">${t.circulationWindows}</span>
        </div>
        <div class="item">
          <span class="label">Cirkulace prave ted:</span>
          <span class="value ${s?"active":"idle"}">${t.circulationNow}</span>
        </div>
      </div>
    `}};ni.styles=_`
    :host { display: block; }

    h3 { ${Et}; }

    .list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid ${O(r.divider)};
      font-size: 13px;
    }

    .item:last-child { border-bottom: none; }

    .label { color: ${O(r.textSecondary)}; }

    .value {
      font-weight: 600;
      color: ${O(r.textPrimary)};
    }

    .value.active { color: #4CAF50; }
    .value.idle { color: ${O(r.textSecondary)}; }
  `;R([u({type:Object})],ni.prototype,"data",2);ni=R([C("oig-boiler-predicted-usage")],ni);let Oe=class extends S{constructor(){super(...arguments),this.plan=null,this.forecastWindows={fve:"--",grid:"--"}}render(){var s;const t=this.plan,e=this.forecastWindows,i=o=>o??"--";return l`
      <h3>Informace o planu</h3>
      <div class="sections">

        <!-- Základní info -->
        <div class="section">
          <div class="section-label">Základní info</div>
          <div class="rows">
            <div class="row">
              <span class="row-label">Mix zdrojů:</span>
              <span class="row-value">${i(t==null?void 0:t.sourceDigest)}</span>
            </div>
            <div class="row">
              <span class="row-label">Slotů:</span>
              <span class="row-value">${((s=t==null?void 0:t.slots)==null?void 0:s.length)??"--"}</span>
            </div>
            <div class="row">
              <span class="row-label">Topení aktivní:</span>
              <span class="row-value">${i(t==null?void 0:t.activeSlotCount)}</span>
            </div>
          </div>
        </div>

        <!-- Cenové info -->
        <div class="section">
          <div class="section-label">Cenové info</div>
          <div class="rows">
            <div class="row">
              <span class="row-label">Nejlevnější spot:</span>
              <span class="row-value">${i(t==null?void 0:t.cheapestSpot)}</span>
            </div>
            <div class="row">
              <span class="row-label">Nejdražší spot:</span>
              <span class="row-value">${i(t==null?void 0:t.mostExpensiveSpot)}</span>
            </div>
          </div>
        </div>

        <!-- Forecast info -->
        <div class="section">
          <div class="section-label">Forecast info</div>
          <div class="rows">
            <div class="row">
              <span class="row-label">FVE okna:</span>
              <span class="row-value">${e.fve}</span>
            </div>
            <div class="row">
              <span class="row-label">Grid okna:</span>
              <span class="row-value">${e.grid}</span>
            </div>
          </div>
        </div>

        <!-- Časové info -->
        <div class="section">
          <div class="section-label">Časové info</div>
          <div class="rows">
            <div class="row">
              <span class="row-label">Od:</span>
              <span class="row-value">${i(t==null?void 0:t.planStart)}</span>
            </div>
            <div class="row">
              <span class="row-label">Do:</span>
              <span class="row-value">${i(t==null?void 0:t.planEnd)}</span>
            </div>
          </div>
        </div>

      </div>
    `}};Oe.styles=_`
    :host { display: block; }

    h3 { ${Et}; }

    .sections {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .section {
      padding: 8px 0 4px;
    }

    .section + .section {
      border-top: 1px solid ${O(r.divider)};
      padding-top: 10px;
      margin-top: 4px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${O(r.accent)};
      margin-bottom: 6px;
      opacity: 0.85;
    }

    .rows {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 13px;
    }

    .row-label { color: ${O(r.textSecondary)}; }
    .row-value {
      font-weight: 500;
      color: ${O(r.textPrimary)};
      text-align: right;
      max-width: 60%;
      word-break: break-word;
    }
  `;R([u({type:Object})],Oe.prototype,"plan",2);R([u({type:Object})],Oe.prototype,"forecastWindows",2);Oe=R([C("oig-boiler-plan-info")],Oe);let Ae=class extends S{constructor(){super(...arguments),this.boilerState=null,this.targetTemp=60}render(){const t=this.boilerState;if(!t)return l`<div>Nacitani...</div>`;const e=10,i=70,s=m=>sr((m-e)/(i-e)*100),o=t.heatingPercent??0,a=t.tempTop!==null?s(t.tempTop):null,n=t.tempBottom!==null?s(t.tempBottom):null,c=s(this.targetTemp),d=Ao(t.tempTop??this.targetTemp),p=Ao(t.tempBottom??10),g=`linear-gradient(180deg, ${d} 0%, ${p} 100%)`,f=t.heatingPercent!==null?`${t.heatingPercent.toFixed(0)}% nahrato`:"-- % nahrato";return l`
      <h3>Vizualizace bojleru</h3>

      <div class="tank-wrapper">
        <div class="temp-scale">
          ${[70,60,50,40,30,20,10].map(m=>l`<span>${m}°C</span>`)}
        </div>

        <div class="tank">
          <div class="water" style="height:${o}%; background:${g}"></div>

          <div class="target-line" style="bottom:${c}%">
            <span class="target-label">Cil</span>
          </div>

          ${a!==null?l`
            <div class="sensor top" style="bottom:${a}%">
              <span class="sensor-label">${t.tempTop.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:E}

          ${n!==null?l`
            <div class="sensor bottom" style="bottom:${n}%">
              <span class="sensor-label">${t.tempBottom.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:E}
        </div>
      </div>

      <div class="grade-label">${f}</div>
    `}};Ae.styles=_`
    :host { display: block; }

    h3 { ${Et}; }

    .tank-wrapper {
      display: flex;
      align-items: stretch;
      gap: 8px;
      height: 280px;
      max-width: 200px;
      margin: 0 auto;
    }

    /* Temperature scale */
    .temp-scale {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 36px;
      font-size: 10px;
      color: ${O(r.textSecondary)};
      text-align: right;
      padding: 2px 0;
    }

    /* Tank body */
    .tank {
      flex: 1;
      position: relative;
      border: 2px solid ${O(r.divider)};
      border-radius: 12px;
      overflow: hidden;
      background: ${O(r.bgSecondary)};
    }

    /* Water fill */
    .water {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      transition: height 0.6s ease, background 0.4s ease;
      border-radius: 0 0 10px 10px;
    }

    /* Target line */
    .target-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: rgba(255,255,255,0.8);
      border-top: 2px dashed ${O(r.accent)};
      z-index: 3;
    }

    .target-label {
      position: absolute;
      right: 4px;
      top: -14px;
      font-size: 9px;
      color: ${O(r.accent)};
      font-weight: 600;
    }

    /* Sensor markers */
    .sensor {
      position: absolute;
      left: 4px;
      right: 4px;
      height: 2px;
      z-index: 4;
      display: flex;
      align-items: center;
    }

    .sensor-line {
      flex: 1;
      height: 1px;
      background: rgba(255,255,255,0.6);
    }

    .sensor-label {
      font-size: 9px;
      font-weight: 600;
      color: #fff;
      background: rgba(0,0,0,0.45);
      padding: 1px 4px;
      border-radius: 3px;
      white-space: nowrap;
    }

    .sensor.top .sensor-label { color: #fff3e0; }
    .sensor.bottom .sensor-label { color: #e3f2fd; }

    /* Grade label */
    .grade-label {
      text-align: center;
      margin-top: 8px;
      font-size: 14px;
      font-weight: 600;
      color: ${O(r.textPrimary)};
    }
  `;R([u({type:Object})],Ae.prototype,"boilerState",2);R([u({type:Number})],Ae.prototype,"targetTemp",2);Ae=R([C("oig-boiler-tank")],Ae);let Ie=class extends S{constructor(){super(...arguments),this.current="",this.available=[]}onChange(t){const e=t.target.value;this.dispatchEvent(new CustomEvent("category-change",{detail:{category:e},bubbles:!0,composed:!0}))}render(){const t=this.available.length?this.available:Object.keys(ho);return l`
      <div class="row">
        <label>Profil:</label>
        <select @change=${this.onChange}>
          ${t.map(e=>l`
            <option value=${e} ?selected=${e===this.current}>
              ${ho[e]||e}
            </option>
          `)}
        </select>
      </div>
    `}};Ie.styles=_`
    :host { display: block; margin: 12px 0; }

    .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    label {
      font-size: 13px;
      font-weight: 600;
      color: ${O(r.textPrimary)};
    }

    select {
      padding: 6px 10px;
      font-size: 13px;
      border: 1px solid ${O(r.divider)};
      border-radius: 6px;
      background: ${O(r.cardBg)};
      color: ${O(r.textPrimary)};
      cursor: pointer;
    }
  `;R([u({type:String})],Ie.prototype,"current",2);R([u({type:Array})],Ie.prototype,"available",2);Ie=R([C("oig-boiler-category-select")],Ie);let ri=class extends S{constructor(){super(...arguments),this.data=[]}render(){if(!this.data.length)return E;const t=this.data.flatMap(n=>n.hours),e=Math.max(...t,.1),i=e*.3,s=e*.7,o=Array.from({length:24},(n,c)=>c),a=n=>n===0?"none":n<i?"low":n<s?"medium":"high";return l`
      <h3>Mapa spotreby (7 dni)</h3>
      <div class="wrapper">
        <div class="grid">
          <!-- Header row -->
          <div></div>
          ${o.map(n=>l`<div class="hour-header">${n}</div>`)}

          <!-- Day rows -->
          ${this.data.map(n=>l`
            <div class="day-label">${n.day}</div>
            ${n.hours.map((c,d)=>l`
              <div class="cell ${a(c)}"
                   title="${n.day} ${d}h: ${c.toFixed(2)} kWh"></div>
            `)}
          `)}
        </div>

        <div class="legend">
          <span class="legend-item"><span class="legend-dot" style="background:#c8e6c9"></span> Nizka</span>
          <span class="legend-item"><span class="legend-dot" style="background:#ff9800"></span> Stredni</span>
          <span class="legend-item"><span class="legend-dot" style="background:#f44336"></span> Vysoka</span>
        </div>
      </div>
    `}};ri.styles=_`
    :host { display: block; }

    h3 { ${Et}; }

    .wrapper {
      ${pe};
      overflow-x: auto;
    }

    .grid {
      display: grid;
      grid-template-columns: 32px repeat(24, 1fr);
      gap: 2px;
      min-width: 500px;
    }

    .hour-header {
      font-size: 9px;
      color: ${O(r.textSecondary)};
      text-align: center;
      padding: 2px 0;
    }

    .day-label {
      font-size: 10px;
      font-weight: 600;
      color: ${O(r.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cell {
      height: 18px;
      border-radius: 2px;
      cursor: default;
      transition: opacity 0.15s;
    }
    .cell:hover { opacity: 0.75; }

    .cell.none   { background: ${O(r.bgSecondary)}; }
    .cell.low    { background: #c8e6c9; }
    .cell.medium { background: #ff9800; }
    .cell.high   { background: #f44336; }

    .legend {
      display: flex;
      gap: 14px;
      margin-top: 10px;
      font-size: 11px;
      color: ${O(r.textSecondary)};
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }
  `;R([u({type:Array})],ri.prototype,"data",2);ri=R([C("oig-boiler-heatmap-grid")],ri);let li=class extends S{constructor(){super(...arguments),this.plan=null}render(){const t=this.plan,e=(i,s=2)=>i!=null?i.toFixed(s):"-";return l`
      <div class="grid">
        <div class="card">
          <div class="card-title">Celkova spotreba dnes</div>
          <div class="card-value total">${e(t==null?void 0:t.totalConsumptionKwh)} kWh</div>
        </div>
        <div class="card">
          <div class="card-title">Z FVE</div>
          <div class="card-value fve">${e(t==null?void 0:t.fveKwh)} kWh</div>
        </div>
        <div class="card">
          <div class="card-title">Ze site</div>
          <div class="card-value grid-c">${e(t==null?void 0:t.gridKwh)} kWh</div>
        </div>
        <div class="card">
          <div class="card-title">Odhadovana cena</div>
          <div class="card-value cost">${e(t==null?void 0:t.estimatedCostCzk)} Kc</div>
        </div>
      </div>
    `}};li.styles=_`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .card {
      ${pe};
      padding: 14px;
    }

    .card-title {
      font-size: 12px;
      color: ${O(r.textSecondary)};
      margin-bottom: 6px;
    }

    .card-value {
      font-size: 22px;
      font-weight: 700;
    }

    .total { color: ${O(r.textPrimary)}; }
    .fve { color: #4CAF50; }
    .grid-c { color: #FF9800; }
    .cost { color: #2196F3; }
  `;R([u({type:Object})],li.prototype,"plan",2);li=R([C("oig-boiler-stats-cards")],li);let ci=class extends S{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return E;const e=Math.max(...t.hourlyAvg,.01),i=new Set(t.peakHours),s=t.peakHours.length?t.peakHours.map(a=>`${a}h`).join(", "):"--",o=t.confidence!==null?`${Math.round(t.confidence*100)} %`:"-- %";return l`
      <h3>Profil spotreby (tyden)</h3>
      <div class="wrapper">
        <div class="chart">
          ${t.hourlyAvg.map((a,n)=>{const c=e>0?a/e*100:0,d=i.has(n);return l`
              <div class="bar-col" title="${n}h: ${a.toFixed(3)} kWh">
                <div class="bar ${d?"peak":"normal"}"
                     style="height:${c}%"></div>
                <span class="bar-label">${n}</span>
              </div>
            `})}
        </div>

        <div class="stats">
          <div class="stat-item">
            <span class="stat-label">Dnes:</span>
            <span class="stat-value">${t.predictedTotalKwh.toFixed(2)} kWh</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Piky:</span>
            <span class="stat-value">${s}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Spolehlivost:</span>
            <span class="stat-value">${o}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Sledovano:</span>
            <span class="stat-value">${t.daysTracked} dni</span>
          </div>
        </div>
      </div>
    `}};ci.styles=_`
    :host { display: block; }

    h3 { ${Et}; }

    .wrapper {
      ${pe};
    }

    /* CSS-only bar chart */
    .chart {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 120px;
      padding: 0 2px;
      margin-bottom: 10px;
    }

    .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
    }

    .bar {
      width: 100%;
      min-width: 4px;
      max-width: 18px;
      border-radius: 3px 3px 0 0;
      transition: height 0.4s ease;
    }

    .bar.normal { background: rgba(33, 150, 243, 0.6); }
    .bar.peak { background: rgba(244, 67, 54, 0.6); }

    .bar-label {
      font-size: 8px;
      color: ${O(r.textSecondary)};
      margin-top: 3px;
    }

    /* Stats row */
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid ${O(r.divider)};
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .stat-label { color: ${O(r.textSecondary)}; }
    .stat-value { font-weight: 600; color: ${O(r.textPrimary)}; }
  `;R([u({type:Object})],ci.prototype,"data",2);ci=R([C("oig-boiler-profiling")],ci);let di=class extends S{constructor(){super(...arguments),this.config=null}render(){const t=this.config;if(!t)return E;const e=(s,o="")=>s!=null?`${s}${o?" "+o:""}`:`--${o?" "+o:""}`,i=t.configMode==="advanced"?"Pokrocily":"Jednoduchy";return l`
      <h3>Profil bojleru</h3>
      <div class="grid">
 <div class="card">
        <div class="card-label">Rezim</div>
        <div class="card-value">${i}</div>
 </div>
        <div class="card">
          <div class="card-label">Objem</div>
          <div class="card-value">${e(t.volumeL,"L")}</div>
        </div>
        <div class="card">
          <div class="card-label">Vykon topeni</div>
          <div class="card-value">${e(t.heaterPowerW,"W")}</div>
        </div>
        <div class="card">
          <div class="card-label">Cilova teplota</div>
          <div class="card-value">${e(t.targetTempC,"°C")}</div>
        </div>
        <div class="card">
          <div class="card-label">Deadline</div>
          <div class="card-value">${t.deadlineTime}</div>
        </div>
        <div class="card">
          <div class="card-label">Stratifikace</div>
          <div class="card-value">${t.stratificationMode}</div>
        </div>
        <div class="card">
          <div class="card-label">Koeficient K</div>
          <div class="card-value">${t.kCoefficient}</div>
        </div>
      </div>
    `}};di.styles=_`
    :host { display: block; }

    h3 { ${Et}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .card {
      ${pe};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${O(r.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 600;
      color: ${O(r.textPrimary)};
    }
  `;R([u({type:Object})],di.prototype,"config",2);di=R([C("oig-boiler-config-section")],di);let pi=class extends S{constructor(){super(...arguments),this.state=null}render(){return this.state?l`
      <div class="temp-display">
        <div class="current-temp">${this.state.currentTemp}°C</div>
        <div class="target-temp">Cil: ${this.state.targetTemp}°C</div>
      </div>

      <div class="status-indicator">
        <div class="status-dot ${this.state.heating?"heating":"idle"}"></div>
        <span>${this.state.heating?"Topi":"Necinny"}</span>
      </div>

      ${this.state.nextProfile?l`
        <div class="next-info">
          <div>Dalsi: ${this.state.nextProfile}</div>
          <div>${this.state.nextStart}</div>
        </div>
      `:null}
    `:l`<div>Nacitani...</div>`}};pi.styles=_`
    :host {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: ${O(r.cardBg)};
      border-radius: 12px;
      box-shadow: ${O(r.cardShadow)};
    }

    .temp-display { text-align: center; }

    .current-temp {
      font-size: 36px;
      font-weight: 600;
      color: ${O(r.textPrimary)};
    }

    .target-temp {
      font-size: 14px;
      color: ${O(r.textSecondary)};
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .status-dot.heating {
      background: #f44336;
      animation: pulse 1s infinite;
    }

    .status-dot.idle { background: #4caf50; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .next-info {
      margin-left: auto;
      text-align: right;
      font-size: 12px;
      color: ${O(r.textSecondary)};
    }
  `;R([u({type:Object})],pi.prototype,"state",2);pi=R([C("oig-boiler-state")],pi);let ui=class extends S{constructor(){super(...arguments),this.data=[]}render(){return E}};ui.styles=_`
    :host { display: block; }
  `;R([u({type:Array})],ui.prototype,"data",2);ui=R([C("oig-boiler-heatmap")],ui);let De=class extends S{constructor(){super(...arguments),this.profiles=[],this.editMode=!1}render(){return E}};De.styles=_`
    :host { display: block; }
  `;R([u({type:Array})],De.prototype,"profiles",2);R([u({type:Boolean})],De.prototype,"editMode",2);De=R([C("oig-boiler-profiles")],De);var ar=Object.defineProperty,nr=Object.getOwnPropertyDescriptor,lt=(t,e,i,s)=>{for(var o=s>1?void 0:s?nr(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&ar(e,i,o),o};const ht=j,Hi=_`
  .selector-label {
    font-size: 12px;
    color: ${ht(r.textSecondary)};
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-text {
    font-size: 11px;
    font-weight: 500;
  }

  .status-text.transitioning {
    color: #ff9800;
  }

  .mode-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .mode-btn {
    flex: 1;
    min-width: 80px;
    padding: 10px 12px;
    border: 2px solid ${ht(r.divider)};
    background: ${ht(r.bgSecondary)};
    color: ${ht(r.textPrimary)};
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .mode-btn:hover:not(:disabled):not(.active) {
    border-color: ${ht(r.accent)};
  }

  .mode-btn.active {
    background: ${ht(r.accent)};
    border-color: ${ht(r.accent)};
    color: #fff;
  }

  .mode-btn.pending {
    border-color: #ffc107;
    animation: pulse-pending 1.5s ease-in-out infinite;
    opacity: 0.8;
  }

  .mode-btn.processing {
    border-color: #42a5f5;
    animation: pulse-processing 1s ease-in-out infinite;
    opacity: 0.9;
  }

  .mode-btn.disabled-by-service {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .mode-btn:disabled {
    cursor: not-allowed;
  }

  @keyframes pulse-pending {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  @keyframes pulse-processing {
    0%, 100% { opacity: 0.7; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.02); }
  }

  @media (max-width: 480px) {
    .mode-buttons {
      flex-direction: column;
    }

    .mode-btn {
      min-width: auto;
    }
  }
`;let ae=class extends S{constructor(){super(...arguments),this.value="home_1",this.disabled=!1,this.buttonStates={home_1:"idle",home_2:"idle",home_3:"idle",home_ups:"idle",home_5:"idle",home_6:"idle"}}onModeClick(t){const e=this.buttonStates[t];this.disabled||e==="active"||e==="pending"||e==="processing"||e==="disabled-by-service"||this.dispatchEvent(new CustomEvent("mode-change",{detail:{mode:t},bubbles:!0}))}render(){return l`
      <div class="selector-label">
        Re\u017Eim st\u0159\u00EDda\u010De
      </div>
      <div class="mode-buttons">
        ${["home_1","home_2","home_3","home_ups"].map(e=>{const i=this.buttonStates[e],s=this.disabled||i==="pending"||i==="processing"||i==="disabled-by-service";return l`
            <button
              class="mode-btn ${i}"
              ?disabled=${s}
              @click=${()=>this.onModeClick(e)}
            >
              ${Jo[e]}
              ${i==="pending"?l`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?l`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};ae.styles=[Hi];lt([u({type:String})],ae.prototype,"value",2);lt([u({type:Boolean})],ae.prototype,"disabled",2);lt([u({type:Object})],ae.prototype,"buttonStates",2);ae=lt([C("oig-box-mode-selector")],ae);let Nt=class extends S{constructor(){super(...arguments),this.value="off",this.limit=0,this.disabled=!1,this.buttonStates={off:"idle",on:"idle",limited:"idle"}}onDeliveryClick(t){const e=this.buttonStates[t];this.disabled||e==="active"||e==="pending"||e==="processing"||e==="disabled-by-service"||this.dispatchEvent(new CustomEvent("delivery-change",{detail:{value:t,limit:t==="limited"?this.limit:null},bubbles:!0}))}onLimitInput(t){const e=t.target;this.limit=parseInt(e.value,10)||0,this.dispatchEvent(new CustomEvent("limit-change",{detail:{limit:this.limit},bubbles:!0}))}get showLimitInput(){return this.value==="limited"||this.buttonStates.limited==="active"}render(){const t=[{value:"off",label:Xe.off},{value:"on",label:Xe.on},{value:"limited",label:Xe.limited}],e=this.buttonStates.limited,i=e==="pending"?"pending-border":e==="processing"?"processing-border":"";return l`
      <div class="selector-label">
        Dod\u00E1vka do s\u00EDt\u011B
      </div>
      <div class="mode-buttons">
        ${t.map(s=>{const o=this.buttonStates[s.value],a=this.disabled||o==="pending"||o==="processing"||o==="disabled-by-service";return l`
            <button
              class="mode-btn ${o}"
              ?disabled=${a}
              @click=${()=>this.onDeliveryClick(s.value)}
            >
              ${s.label}
              ${o==="pending"?l`<span style="font-size:10px"> \u23F3</span>`:""}
              ${o==="processing"?l`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>

      ${this.showLimitInput?l`
        <div class="limit-input-container">
          <input
            type="number"
            class="limit-input ${i}"
            .value=${String(this.limit)}
            min="0"
            step="100"
            @input=${this.onLimitInput}
            ?disabled=${this.disabled}
          />
          <span class="limit-unit">W</span>
        </div>
      `:null}
    `}};Nt.styles=[Hi,_`
      .limit-input-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
      }

      .limit-input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid ${ht(r.divider)};
        border-radius: 6px;
        font-size: 14px;
        background: ${ht(r.bgPrimary)};
        color: ${ht(r.textPrimary)};
        transition: border-color 0.2s;
      }

      .limit-input.pending-border {
        border-color: #ffc107;
      }

      .limit-input.processing-border {
        border-color: #42a5f5;
      }

      .limit-unit {
        font-size: 12px;
        color: ${ht(r.textSecondary)};
      }
    `];lt([u({type:String})],Nt.prototype,"value",2);lt([u({type:Number})],Nt.prototype,"limit",2);lt([u({type:Boolean})],Nt.prototype,"disabled",2);lt([u({type:Object})],Nt.prototype,"buttonStates",2);Nt=lt([C("oig-grid-delivery-selector")],Nt);let ne=class extends S{constructor(){super(...arguments),this.value="cbb",this.disabled=!1,this.buttonStates={cbb:"idle",manual:"idle"}}onModeClick(t){const e=this.buttonStates[t];this.disabled||e==="active"||e==="pending"||e==="processing"||e==="disabled-by-service"||this.dispatchEvent(new CustomEvent("boiler-mode-change",{detail:{mode:t},bubbles:!0}))}render(){return l`
      <div class="selector-label">
        Re\u017Eim bojleru
      </div>
      <div class="mode-buttons">
        ${["cbb","manual"].map(e=>{const i=this.buttonStates[e],s=this.disabled||i==="pending"||i==="processing"||i==="disabled-by-service";return l`
            <button
              class="mode-btn ${i}"
              ?disabled=${s}
              @click=${()=>this.onModeClick(e)}
            >
              ${es[e]} ${ts[e]}
              ${i==="pending"?l`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?l`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};ne.styles=[Hi];lt([u({type:String})],ne.prototype,"value",2);lt([u({type:Boolean})],ne.prototype,"disabled",2);lt([u({type:Object})],ne.prototype,"buttonStates",2);ne=lt([C("oig-boiler-mode-selector")],ne);var rr=Object.defineProperty,lr=Object.getOwnPropertyDescriptor,ue=(t,e,i,s)=>{for(var o=s>1?void 0:s?lr(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&rr(e,i,o),o};const rt=j;let Pt=class extends S{constructor(){super(...arguments),this.items=[],this.expanded=!1,this.shieldStatus="idle",this.queueCount=0,this._now=Date.now(),this.updateInterval=null}connectedCallback(){super.connectedCallback(),this.updateInterval=window.setInterval(()=>{this._now=Date.now()},1e3)}disconnectedCallback(){super.disconnectedCallback(),this.updateInterval!==null&&clearInterval(this.updateInterval)}toggleExpanded(){this.expanded=!this.expanded}removeItem(t,e){e.stopPropagation(),this.dispatchEvent(new CustomEvent("remove-item",{detail:{position:t},bubbles:!0}))}formatServiceName(t){return pn[t]||t||"N/A"}formatChanges(t){return!t||t.length===0?"N/A":t.map(e=>{const i=e.indexOf("→");if(i===-1)return e;const s=e.slice(0,i).trim(),o=e.slice(i+1).trim(),a=s.indexOf(":"),n=a===-1?s:s.slice(a+1),c=(Co[n.replace(/'/g,"").trim()]||n).replace(/'/g,"").trim(),d=(Co[o.replace(/'/g,"").trim()]||o).replace(/'/g,"").trim();return`${c} → ${d}`}).join(", ")}formatTimestamp(t){if(!t)return{time:"--",duration:"--"};try{const e=new Date(t),i=new Date(this._now),s=Math.floor((i.getTime()-e.getTime())/1e3),o=String(e.getHours()).padStart(2,"0"),a=String(e.getMinutes()).padStart(2,"0");let n=`${o}:${a}`;if(e.toDateString()!==i.toDateString()){const d=e.getDate(),p=e.getMonth()+1;n=`${d}.${p}. ${n}`}let c;if(s<60)c=`${s}s`;else if(s<3600){const d=Math.floor(s/60),p=s%60;c=`${d}m ${p}s`}else{const d=Math.floor(s/3600),p=Math.floor(s%3600/60);c=`${d}h ${p}m`}return{time:n,duration:c}}catch{return{time:"--",duration:"--"}}}get activeCount(){return this.items.length}render(){this._now;const t=this.shieldStatus==="running"?"running":"idle",e=this.shieldStatus==="running"?"🔄 Zpracovává":"✓ Připraveno";return l`
      <div class="queue-header" @click=${this.toggleExpanded}>
        <div class="queue-title-area">
          <span class="queue-title">Shield fronta</span>
          ${this.activeCount>0?l`
            <span class="queue-count">(${this.activeCount} aktivn\u00EDch)</span>
          `:E}
          <span class="shield-status ${t}">${e}</span>
        </div>
        <span class="queue-toggle ${this.expanded?"expanded":""}">\u25BC</span>
      </div>

      ${this.expanded?l`
        <div class="queue-content">
          ${this.items.length===0?l`
            <div class="empty-state">\u2705 Fronta je pr\u00E1zdn\u00E1</div>
          `:l`
            <table class="queue-table">
              <thead>
                <tr>
                  <th>Stav</th>
                  <th>Slu\u017Eba</th>
                  <th class="hide-mobile">Zm\u011Bny</th>
                  <th>Vytvo\u0159eno</th>
                  <th>Trv\u00E1n\u00ED</th>
                  <th>Akce</th>
                </tr>
              </thead>
              <tbody>
                ${this.items.map((i,s)=>this.renderRow(i,s))}
              </tbody>
            </table>
          `}
        </div>
      `:E}
    `}renderRow(t,e){const i=t.status==="running",{time:s,duration:o}=this.formatTimestamp(t.createdAt);return l`
      <tr>
        <td class="${i?"status-running":"status-queued"}">
          ${i?"🔄 Zpracovává se":"⏳ Čeká"}
        </td>
        <td>${this.formatServiceName(t.service)}</td>
        <td class="hide-mobile" style="font-size: 11px;">${this.formatChanges(t.changes)}</td>
        <td class="queue-time">${s}</td>
        <td class="queue-time duration">${o}</td>
        <td style="text-align: center;">
          ${i?l`<span style="opacity: 0.4;">\u2014</span>`:l`
            <button
              class="remove-btn"
              title="Odstranit z fronty"
              @click=${a=>this.removeItem(t.position,a)}
            >\uD83D\uDDD1\uFE0F</button>
          `}
        </td>
      </tr>
    `}};Pt.styles=_`
    :host {
      display: block;
      background: ${rt(r.cardBg)};
      border-radius: 12px;
      box-shadow: ${rt(r.cardShadow)};
      overflow: hidden;
    }

    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: ${rt(r.bgSecondary)};
      user-select: none;
    }

    .queue-header:hover {
      opacity: 0.9;
    }

    .queue-title-area {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .queue-title {
      font-size: 14px;
      font-weight: 500;
      color: ${rt(r.textPrimary)};
    }

    .queue-count {
      font-size: 12px;
      color: ${rt(r.textSecondary)};
    }

    .shield-status {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 500;
    }

    .shield-status.idle {
      color: #4caf50;
      background: rgba(76, 175, 80, 0.1);
    }

    .shield-status.running {
      color: #2196f3;
      background: rgba(33, 150, 243, 0.1);
    }

    .queue-toggle {
      font-size: 12px;
      color: ${rt(r.accent)};
      transition: transform 0.2s;
    }

    .queue-toggle.expanded {
      transform: rotate(180deg);
    }

    .queue-content {
      padding: 0;
      border-top: 1px solid ${rt(r.divider)};
    }

    /* Table layout (matches V1) */
    .queue-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .queue-table th {
      text-align: left;
      padding: 8px 12px;
      font-weight: 600;
      color: ${rt(r.textSecondary)};
      border-bottom: 1px solid ${rt(r.divider)};
      background: ${rt(r.bgSecondary)};
    }

    .queue-table td {
      padding: 8px 12px;
      color: ${rt(r.textPrimary)};
      border-bottom: 1px solid ${rt(r.divider)};
      vertical-align: middle;
    }

    .queue-table tr:last-child td {
      border-bottom: none;
    }

    .status-running {
      color: #2196f3;
      font-weight: 500;
    }

    .status-queued {
      color: #ff9800;
      font-weight: 500;
    }

    .queue-time {
      font-variant-numeric: tabular-nums;
    }

    .duration {
      font-weight: 600;
    }

    .remove-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      opacity: 0.6;
      padding: 4px 8px;
      transition: all 0.2s;
    }

    .remove-btn:hover {
      opacity: 1;
      transform: scale(1.2);
    }

    .empty-state {
      text-align: center;
      padding: 16px;
      color: ${rt(r.textSecondary)};
      font-size: 12px;
    }

    /* Responsive: hide some columns on mobile */
    @media (max-width: 600px) {
      .hide-mobile {
        display: none;
      }

      .queue-table td,
      .queue-table th {
        padding: 6px 8px;
        font-size: 11px;
      }
    }
  `;ue([u({type:Array})],Pt.prototype,"items",2);ue([u({type:Boolean})],Pt.prototype,"expanded",2);ue([u({type:String})],Pt.prototype,"shieldStatus",2);ue([u({type:Number})],Pt.prototype,"queueCount",2);ue([v()],Pt.prototype,"_now",2);Pt=ue([C("oig-shield-queue")],Pt);var cr=Object.defineProperty,dr=Object.getOwnPropertyDescriptor,We=(t,e,i,s)=>{for(var o=s>1?void 0:s?dr(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&cr(e,i,o),o};const ot=j;let jt=class extends S{constructor(){super(...arguments),this.open=!1,this.config={title:"",message:""},this.acknowledged=!1,this.limitValue=5e3,this.resolver=null,this.onOverlayClick=()=>{this.closeDialog({confirmed:!1})},this.onDialogClick=t=>{t.stopPropagation()},this.onKeyDown=t=>{t.key==="Escape"&&this.open&&this.closeDialog({confirmed:!1})},this.onAckChange=t=>{this.acknowledged=t.target.checked},this.onLimitInput=t=>{this.limitValue=parseInt(t.target.value,10)||0},this.onCancel=()=>{this.closeDialog({confirmed:!1})},this.onConfirm=()=>{if(this.config.showLimitInput){const t=this.config.limitMin??1,e=this.config.limitMax??2e4;if(isNaN(this.limitValue)||this.limitValue<t||this.limitValue>e)return}this.closeDialog({confirmed:!0,limit:this.config.showLimitInput?this.limitValue:void 0})}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeyDown)}showDialog(t){return this.config=t,this.acknowledged=!1,this.limitValue=t.limitValue??5e3,this.open=!0,new Promise(e=>{this.resolver=e})}closeDialog(t){var e;this.open=!1,(e=this.resolver)==null||e.call(this,t),this.resolver=null}get canConfirm(){return!(this.config.requireAcknowledgement&&!this.acknowledged)}render(){if(!this.open)return E;const t=this.config;return l`
      <div @click=${this.onOverlayClick}>
        <div class="dialog" @click=${this.onDialogClick}>
          <div class="dialog-header">
            ${t.title}
          </div>

          <div class="dialog-body">
            ${this.renderHTML(t.message)}
          </div>

          ${t.showLimitInput?l`
            <div class="limit-section">
              <label class="limit-label" for="confirm-limit-input">
                Zadejte limit p\u0159etok\u016F (W):
              </label>
              <input
                type="number"
                id="confirm-limit-input"
                class="limit-input"
                .value=${String(this.limitValue)}
                min=${t.limitMin??1}
                max=${t.limitMax??2e4}
                step=${t.limitStep??100}
                @input=${this.onLimitInput}
                placeholder="nap\u0159. 5000"
              />
              <small class="limit-hint">Rozsah: ${t.limitMin??1}\u2013${t.limitMax??2e4} W</small>
            </div>
          `:E}

          ${t.warning?l`
            <div class="dialog-warning">
              \u26A0\uFE0F ${this.renderHTML(t.warning)}
            </div>
          `:E}

          ${t.requireAcknowledgement?l`
            <div class="ack-wrapper" @click=${()=>{this.acknowledged=!this.acknowledged}}>
              <input
                type="checkbox"
                .checked=${this.acknowledged}
                @change=${this.onAckChange}
                @click=${e=>e.stopPropagation()}
              />
              <label>
                ${t.acknowledgementText||l`
                  <strong>Souhlas\u00EDm</strong> s t\u00EDm, \u017Ee m\u011Bn\u00EDm nastaven\u00ED na vlastn\u00ED odpov\u011Bdnost.
                  Aplikace nenese odpov\u011Bdnost za p\u0159\u00EDpadn\u00E9 negativn\u00ED d\u016Fsledky t\u00E9to zm\u011Bny.
                `}
              </label>
            </div>
          `:E}

          <div class="dialog-actions">
            <button class="btn btn-cancel" @click=${this.onCancel}>
              ${t.cancelText||"Zrušit"}
            </button>
            <button
              class="btn btn-confirm"
              ?disabled=${!this.canConfirm}
              @click=${this.onConfirm}
            >
              ${t.confirmText||"Potvrdit změnu"}
            </button>
          </div>
        </div>
      </div>
    `}renderHTML(t){const e=document.createElement("div");return e.innerHTML=t,l`<span .innerHTML=${t}></span>`}};jt.styles=_`
    :host {
      display: none;
    }

    :host([open]) {
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .dialog {
      background: ${ot(r.cardBg)};
      border-radius: 16px;
      padding: 0;
      min-width: 340px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      animation: scaleIn 0.15s ease-out;
    }

    @keyframes scaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .dialog-header {
      padding: 16px 20px;
      font-size: 16px;
      font-weight: 600;
      color: ${ot(r.textPrimary)};
      border-bottom: 1px solid ${ot(r.divider)};
    }

    .dialog-body {
      padding: 16px 20px;
      font-size: 14px;
      line-height: 1.5;
      color: ${ot(r.textPrimary)};
    }

    .dialog-warning {
      margin: 0 20px 12px;
      padding: 10px 14px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      font-size: 13px;
      color: ${ot(r.textPrimary)};
      line-height: 1.4;
    }

    .dialog-warning strong {
      color: #ff9800;
    }

    .ack-wrapper {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 0 20px 16px;
      padding: 12px 14px;
      background: ${ot(r.bgSecondary)};
      border-radius: 8px;
      cursor: pointer;
    }

    .ack-wrapper input[type="checkbox"] {
      margin-top: 2px;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${ot(r.accent)};
    }

    .ack-wrapper label {
      font-size: 13px;
      line-height: 1.4;
      color: ${ot(r.textPrimary)};
      cursor: pointer;
    }

    .limit-section {
      margin: 0 20px 16px;
    }

    .limit-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      font-size: 13px;
      color: ${ot(r.textPrimary)};
    }

    .limit-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid ${ot(r.divider)};
      border-radius: 8px;
      font-size: 14px;
      background: ${ot(r.bgPrimary)};
      color: ${ot(r.textPrimary)};
      box-sizing: border-box;
    }

    .limit-hint {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      opacity: 0.7;
      color: ${ot(r.textSecondary)};
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 12px 20px 16px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }

    .btn-cancel {
      background: ${ot(r.bgSecondary)};
      color: ${ot(r.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${ot(r.divider)};
    }

    .btn-confirm {
      background: ${ot(r.accent)};
      color: #fff;
    }

    .btn-confirm:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-confirm:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;We([u({type:Boolean,reflect:!0})],jt.prototype,"open",2);We([u({type:Object})],jt.prototype,"config",2);We([v()],jt.prototype,"acknowledged",2);We([v()],jt.prototype,"limitValue",2);jt=We([C("oig-confirm-dialog")],jt);var pr=Object.defineProperty,ur=Object.getOwnPropertyDescriptor,as=(t,e,i,s)=>{for(var o=s>1?void 0:s?ur(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&pr(e,i,o),o};const Se=j;let hi=class extends S{constructor(){super(...arguments),this.shieldState=null}render(){if(!this.shieldState)return E;const t=this.determineStatus(this.shieldState),e=t.toLowerCase(),i=this.getStatusIcon(t),s=this.getStatusLabel(t),a=this.shieldState.queueCount>0?"has-items":"";return l`
      <div class="shield-status-container">
        <div class="shield-status-left">
          <span class="shield-status-icon">${i}</span>
          <div class="shield-status-info">
            <span class="shield-status-title">Shield ochrana</span>
            <span class="shield-status-subtitle">${this.getActivityText()}</span>
          </div>
        </div>
        <div class="shield-status-right">
          <span class="queue-count ${a}">
            Fronta: ${this.shieldState.queueCount}
          </span>
          <span class="shield-status-badge ${e}">${s}</span>
        </div>
      </div>
    `}determineStatus(t){return t.status==="running"?"processing":t.queueCount>0?"pending":"idle"}getStatusIcon(t){switch(t){case"idle":return"✓";case"pending":return"⏳";case"processing":return"🔄";default:return"✓"}}getStatusLabel(t){switch(t){case"idle":return"Připraveno";case"pending":return"Čeká";case"processing":return"Zpracovává";default:return"Neznámý"}}getActivityText(){return this.shieldState?this.shieldState.activity?this.shieldState.activity:this.shieldState.queueCount>0?`${this.shieldState.queueCount} operací ve frontě`:"Systém připraven":"Žádná aktivita"}};hi.styles=_`
    :host {
      display: block;
      padding: 16px 20px;
      border-top: 1px solid ${Se(r.divider)};
    }

    .shield-status-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .shield-status-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }

    .shield-status-icon {
      font-size: 20px;
    }

    .shield-status-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .shield-status-title {
      font-size: 13px;
      font-weight: 600;
      color: ${Se(r.textPrimary)};
    }

    .shield-status-subtitle {
      font-size: 11px;
      color: ${Se(r.textSecondary)};
    }

    .shield-status-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .shield-status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .shield-status-badge.idle {
      color: #4caf50;
      background: rgba(76, 175, 80, 0.1);
    }

    .shield-status-badge.pending {
      color: #ffc107;
      background: rgba(255, 193, 7, 0.1);
    }

    .shield-status-badge.processing {
      color: #42a5f5;
      background: rgba(66, 165, 245, 0.1);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    .queue-count {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 8px;
      background: ${Se(r.bgSecondary)};
      color: ${Se(r.textSecondary)};
      font-weight: 500;
    }

    .queue-count.has-items {
      color: #ff9800;
      background: rgba(255, 152, 0, 0.1);
    }

    @media (max-width: 480px) {
      :host {
        padding: 12px 14px;
      }

      .shield-status-badge {
        padding: 3px 8px;
        font-size: 10px;
      }

      .queue-count {
        font-size: 10px;
        padding: 2px 6px;
      }
    }
  `;as([u({type:Object})],hi.prototype,"shieldState",2);hi=as([C("oig-shield-status")],hi);var hr=Object.defineProperty,gr=Object.getOwnPropertyDescriptor,Vi=(t,e,i,s)=>{for(var o=s>1?void 0:s?gr(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&hr(e,i,o),o};const Gt=j;let Le=class extends S{constructor(){super(...arguments),this.shieldState={...is,pendingServices:new Map,changingServices:new Set},this.unsubscribe=null,this.onShieldUpdate=t=>{this.shieldState=t}}connectedCallback(){super.connectedCallback(),this.unsubscribe=q.subscribe(this.onShieldUpdate)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this.unsubscribe)==null||t.call(this),this.unsubscribe=null}get boxModeButtonStates(){return{home_1:q.getBoxModeButtonState("home_1"),home_2:q.getBoxModeButtonState("home_2"),home_3:q.getBoxModeButtonState("home_3"),home_ups:q.getBoxModeButtonState("home_ups"),home_5:q.getBoxModeButtonState("home_5"),home_6:q.getBoxModeButtonState("home_6")}}get gridDeliveryButtonStates(){return{off:q.getGridDeliveryButtonState("off"),on:q.getGridDeliveryButtonState("on"),limited:q.getGridDeliveryButtonState("limited")}}get boilerModeButtonStates(){return{cbb:q.getBoilerModeButtonState("cbb"),manual:q.getBoilerModeButtonState("manual")}}async onBoxModeChange(t){const{mode:e}=t.detail,i=Jo[e];if(b.debug("Control panel: box mode change requested",{mode:e}),!(await this.confirmDialog.showDialog({title:"Změna režimu střídače",message:`Chystáte se změnit režim boxu na <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování celého systému a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!q.shouldProceedWithQueue())return;await q.setBoxMode(e)||b.warn("Box mode change failed or already active",{mode:e})}async onGridDeliveryChange(t){const{value:e,limit:i}=t.detail,s=Xe[e],o=cn[e],a=e==="limited",n=this.shieldState.currentGridLimit||5e3;b.debug("Control panel: grid delivery change requested",{delivery:e,limit:i});const c={title:`${o} Změna dodávky do sítě`,message:`Chystáte se změnit dodávku do sítě na: <strong>"${s}"</strong>`,warning:a?"Režim a limit budou změněny postupně (serializováno). Každá změna může trvat až 10 minut.":"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,acknowledgementText:"<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost. Aplikace nenese odpovědnost za případné negativní důsledky této změny.",confirmText:"Potvrdit změnu",cancelText:"Zrušit",showLimitInput:a,limitValue:n,limitMin:1,limitMax:2e4,limitStep:100},d=await this.confirmDialog.showDialog(c);if(!d.confirmed||!q.shouldProceedWithQueue())return;const p=this.shieldState.currentGridDelivery==="limited",g=e==="limited";p&&g&&d.limit!=null?await q.setGridDelivery(e,d.limit):g&&d.limit!=null?await q.setGridDelivery(e,d.limit):await q.setGridDelivery(e)}async onBoilerModeChange(t){const{mode:e}=t.detail,i=ts[e],s=es[e];if(b.debug("Control panel: boiler mode change requested",{mode:e}),!(await this.confirmDialog.showDialog({title:"Změna režimu bojleru",message:`Chystáte se změnit režim bojleru na <strong>"${s} ${i}"</strong>.<br><br>Tato změna ovlivní chování ohřevu vody a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!q.shouldProceedWithQueue())return;await q.setBoilerMode(e)||b.warn("Boiler mode change failed or already active",{mode:e})}async onQueueRemoveItem(t){const{position:e}=t.detail;b.debug("Control panel: queue remove requested",{position:e});const i=this.shieldState.allRequests.find(n=>n.position===e);let s="Operace";if(i&&(i.service.includes("set_box_mode")?s=`Změna režimu na ${i.targetValue||"neznámý"}`:i.service.includes("set_grid_delivery")?s=`Změna dodávky do sítě na ${i.targetValue||"neznámý"}`:i.service.includes("set_boiler_mode")&&(s=`Změna režimu bojleru na ${i.targetValue||"neznámý"}`)),!(await this.confirmDialog.showDialog({title:s,message:"Operace bude odstraněna z fronty bez provedení.",requireAcknowledgement:!1,confirmText:"OK",cancelText:"Zrušit"})).confirmed)return;await q.removeFromQueue(e)||b.warn("Failed to remove from queue",{position:e})}render(){const t=this.shieldState,e=t.status==="running"?"running":"idle",i=t.status==="running"?"Zpracovává":"Připraveno",s=t.allRequests.length>0;return l`
      <div class="control-panel">
        <div class="panel-header">
          <span class="panel-title">
            \u{1F6E1}\uFE0F Ovl\u00E1dac\u00ED panel
          </span>
          <span class="panel-status ${e}">
            ${t.status==="running"?"🔄 ":"✓ "}${i}
          </span>
        </div>

        <div class="panel-body">
          <!-- Box Mode Selector -->
          <div class="selector-section">
            <oig-box-mode-selector
              .value=${t.currentBoxMode}
              .buttonStates=${this.boxModeButtonStates}
              @mode-change=${this.onBoxModeChange}
            ></oig-box-mode-selector>
          </div>

          <div class="section-divider"></div>

          <!-- Grid Delivery Selector -->
          <div class="selector-section">
            <oig-grid-delivery-selector
              .value=${t.currentGridDelivery}
              .limit=${t.currentGridLimit}
              .buttonStates=${this.gridDeliveryButtonStates}
              @delivery-change=${this.onGridDeliveryChange}
            ></oig-grid-delivery-selector>
          </div>

          <div class="section-divider"></div>

          <!-- Boiler Mode Selector -->
          <div class="selector-section">
            <oig-boiler-mode-selector
              .value=${t.currentBoilerMode}
              .buttonStates=${this.boilerModeButtonStates}
              @boiler-mode-change=${this.onBoilerModeChange}
            ></oig-boiler-mode-selector>
          </div>
        </div>

        <!-- Shield Status (always shown) -->
        <oig-shield-status .shieldState=${t}></oig-shield-status>

        <!-- Shield Queue (always rendered, collapsible) -->
        ${s?l`
          <div class="queue-section">
            <oig-shield-queue
              .items=${t.allRequests}
              .shieldStatus=${t.status}
              .queueCount=${t.queueCount}
              .expanded=${!1}
              @remove-item=${this.onQueueRemoveItem}
            ></oig-shield-queue>
          </div>
        `:E}
      </div>

      <!-- Shared confirm dialog instance -->
      <oig-confirm-dialog></oig-confirm-dialog>
    `}};Le.styles=_`
    :host {
      display: block;
      margin-top: 16px;
    }

    .control-panel {
      background: ${Gt(r.cardBg)};
      border-radius: 16px;
      box-shadow: ${Gt(r.cardShadow)};
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid ${Gt(r.divider)};
    }

    .panel-title {
      font-size: 15px;
      font-weight: 600;
      color: ${Gt(r.textPrimary)};
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .panel-status {
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 10px;
      font-weight: 500;
    }

    .panel-status.idle {
      color: #4caf50;
      background: rgba(76, 175, 80, 0.1);
    }

    .panel-status.running {
      color: #2196f3;
      background: rgba(33, 150, 243, 0.1);
    }

    .panel-body {
      padding: 16px 20px;
    }

    .selector-section {
      margin-bottom: 20px;
    }

    .selector-section:last-child {
      margin-bottom: 0;
    }

    .section-divider {
      height: 1px;
      background: ${Gt(r.divider)};
      margin: 16px 0;
    }

    .queue-section {
      border-top: 1px solid ${Gt(r.divider)};
    }

    @media (max-width: 480px) {
      .panel-body {
        padding: 12px 14px;
      }
    }
  `;Vi([v()],Le.prototype,"shieldState",2);Vi([yi("oig-confirm-dialog")],Le.prototype,"confirmDialog",2);Le=Vi([C("oig-control-panel")],Le);var mr=Object.defineProperty,fr=Object.getOwnPropertyDescriptor,he=(t,e,i,s)=>{for(var o=s>1?void 0:s?fr(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&mr(e,i,o),o};const st=j;let Tt=class extends S{constructor(){super(...arguments),this.open=!1,this.currentSoc=0,this.maxSoc=100,this.estimate=null,this.targetSoc=80}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onSliderInput(t){this.targetSoc=parseInt(t.target.value,10),this.dispatchEvent(new CustomEvent("soc-change",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}onConfirm(){this.dispatchEvent(new CustomEvent("confirm",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}render(){return l`
      <div class="dialog" @click=${t=>t.stopPropagation()}>
        <div class="dialog-title">Nabít baterii</div>
        
        <div class="dialog-content">
          <div class="soc-display">
            <div class="soc-current">
              <div class="soc-label">Aktuální</div>
              <div class="soc-value">${this.currentSoc}%</div>
            </div>
            <div class="soc-arrow">→</div>
            <div class="soc-target">
              <div class="soc-label">Cílový</div>
              <div class="soc-value">${this.targetSoc}%</div>
            </div>
          </div>
          
          <div class="slider-container">
            <input
              type="range"
              class="slider"
              min=${this.currentSoc}
              max=${this.maxSoc}
              .value=${String(this.targetSoc)}
              @input=${this.onSliderInput}
            />
          </div>
          
          ${this.estimate?l`
            <div class="estimate">
              <div class="estimate-row">
                <span class="estimate-label">Odhadovaná cena:</span>
                <span class="estimate-value">${this.estimate.estimatedCost.toFixed(2)} Kč</span>
              </div>
              <div class="estimate-row">
                <span class="estimate-label">Odhadovaný čas:</span>
                <span class="estimate-value">${Math.round(this.estimate.estimatedTime/60)} min</span>
              </div>
            </div>
          `:null}
        </div>
        
        <div class="dialog-actions">
          <button class="btn btn-cancel" @click=${this.onClose}>
            Zrušit
          </button>
          <button class="btn btn-confirm" @click=${this.onConfirm}>
            Nabít
          </button>
        </div>
      </div>
    `}};Tt.styles=_`
    :host {
      display: none;
    }

    :host([open]) {
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background: ${st(r.cardBg)};
      border-radius: 16px;
      padding: 24px;
      min-width: 320px;
      max-width: 90vw;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${st(r.textPrimary)};
      margin-bottom: 16px;
    }

    .dialog-content {
      margin-bottom: 20px;
    }

    .soc-display {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .soc-current, .soc-target {
      text-align: center;
    }

    .soc-label {
      font-size: 11px;
      color: ${st(r.textSecondary)};
    }

    .soc-value {
      font-size: 24px;
      font-weight: 600;
      color: ${st(r.textPrimary)};
    }

    .soc-arrow {
      font-size: 20px;
      color: ${st(r.textSecondary)};
    }

    .slider-container {
      margin: 16px 0;
    }

    .slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: ${st(r.bgSecondary)};
      -webkit-appearance: none;
      appearance: none;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${st(r.accent)};
      cursor: pointer;
    }

    .estimate {
      background: ${st(r.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
      margin-top: 16px;
    }

    .estimate-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .estimate-row:last-child {
      margin-bottom: 0;
    }

    .estimate-label {
      color: ${st(r.textSecondary)};
    }

    .estimate-value {
      color: ${st(r.textPrimary)};
      font-weight: 500;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel {
      background: ${st(r.bgSecondary)};
      color: ${st(r.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${st(r.divider)};
    }

    .btn-confirm {
      background: ${st(r.accent)};
      color: #fff;
    }

    .btn-confirm:hover {
      opacity: 0.9;
    }
  `;he([u({type:Boolean})],Tt.prototype,"open",2);he([u({type:Number})],Tt.prototype,"currentSoc",2);he([u({type:Number})],Tt.prototype,"maxSoc",2);he([u({type:Object})],Tt.prototype,"estimate",2);he([v()],Tt.prototype,"targetSoc",2);Tt=he([C("oig-battery-charge-dialog")],Tt);var br=Object.defineProperty,vr=Object.getOwnPropertyDescriptor,mt=(t,e,i,s)=>{for(var o=s>1?void 0:s?vr(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&br(e,i,o),o};const zi=j,Wi=_`
  .metric {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.1));
  }

  .metric:last-child {
    border-bottom: none;
  }

  .metric-label {
    font-size: 12px;
    color: var(--secondary-text-color, #999);
  }

  .metric-value {
    font-size: 12px;
    font-weight: 500;
    color: var(--primary-text-color, #fff);
  }

  .metric-value.positive { color: var(--success-color, #4caf50); }
  .metric-value.negative { color: var(--error-color, #f44336); }
`;let Be=class extends S{constructor(){super(...arguments),this.title="",this.icon="📊"}render(){return l`
      <div class="block-header">
        <span class="block-icon">${this.icon}</span>
        <span class="block-title">${this.title}</span>
      </div>
      <slot></slot>
    `}};Be.styles=_`
    :host {
      display: block;
      background: ${zi(r.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${zi(r.cardShadow)};
    }

    .block-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .block-icon {
      font-size: 20px;
    }

    .block-title {
      font-size: 14px;
      font-weight: 500;
      color: ${zi(r.textPrimary)};
    }

    ${Wi}
  `;mt([u({type:String})],Be.prototype,"title",2);mt([u({type:String})],Be.prototype,"icon",2);Be=mt([C("oig-analytics-block")],Be);let gi=class extends S{constructor(){super(...arguments),this.data=null}render(){if(!this.data)return l`<div>Načítání...</div>`;const t=this.data.trend>=0?"positive":"negative",e=this.data.trend>=0?"+":"",i=this.data.period==="last_month"?"Minulý měsíc":`Aktuální měsíc (${this.data.currentMonthDays} dní)`;return l`
      <div class="efficiency-value">${te(this.data.efficiency,1)}</div>
      <div class="period-label">${i}</div>

      ${this.data.trend!==0?l`
        <div class="comparison ${t}">
          ${e}${te(this.data.trend)} vs minulý měsíc
        </div>
      `:null}

      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${Jt(this.data.charged)}</div>
          <div class="stat-label">Nabito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${Jt(this.data.discharged)}</div>
          <div class="stat-label">Vybito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${Jt(this.data.losses)}</div>
          <div class="stat-label">Ztráty</div>
          ${this.data.lossesPct?l`
            <div class="losses-pct">${te(this.data.lossesPct,1)}</div>
          `:null}
        </div>
      </div>
    `}};gi.styles=_`
    :host {
      display: block;
    }

    .efficiency-value {
      font-size: 32px;
      font-weight: 600;
      color: var(--primary-text-color);
      margin-bottom: 4px;
    }

    .period-label {
      font-size: 11px;
      color: var(--secondary-text-color);
      margin-bottom: 12px;
    }

    .comparison {
      font-size: 12px;
      margin-bottom: 12px;
    }

    .comparison.positive { color: var(--success-color, #4caf50); }
    .comparison.negative { color: var(--error-color, #f44336); }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .stat {
      text-align: center;
      padding: 8px;
      background: var(--secondary-background-color);
      border-radius: 6px;
    }

    .stat-value {
      font-size: 14px;
      font-weight: 600;
    }

    .stat-label {
      font-size: 10px;
      color: var(--secondary-text-color);
    }

    .losses-pct {
      font-size: 10px;
      color: var(--error-color, #f44336);
    }
  `;mt([u({type:Object})],gi.prototype,"data",2);gi=mt([C("oig-battery-efficiency")],gi);let mi=class extends S{constructor(){super(...arguments),this.data=null}renderSparkline(){var d;const t=(d=this.data)==null?void 0:d.measurementHistory;if(!t||t.length<2)return null;const e=t.map(p=>p.soh_percent),i=Math.min(...e)-1,o=Math.max(...e)+1-i||1,a=200,n=40,c=e.map((p,g)=>{const f=g/(e.length-1)*a,w=n-(p-i)/o*n;return`${f},${w}`}).join(" ");return l`
      <div class="sparkline-container">
        <svg viewBox="0 0 ${a} ${n}" preserveAspectRatio="none">
          <polyline
            points="${c}"
            fill="none"
            stroke="#4caf50"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
    `}render(){return this.data?l`
      <oig-analytics-block title="Zdraví baterie" icon="❤️">
        <span class="status-badge ${this.data.status}">${this.data.statusLabel}</span>

        ${this.renderSparkline()}

        <div class="metric">
          <span class="metric-label">State of Health</span>
          <span class="metric-value">${te(this.data.soh,1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Kapacita (P80)</span>
          <span class="metric-value">${Jt(this.data.capacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Min. kapacita (P20)</span>
          <span class="metric-value">${Jt(this.data.minCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Nominální kapacita</span>
          <span class="metric-value">${Jt(this.data.nominalCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Počet měření</span>
          <span class="metric-value">${this.data.measurementCount}</span>
        </div>
        ${this.data.qualityScore!=null?l`
          <div class="metric">
            <span class="metric-label">Kvalita dat</span>
            <span class="metric-value">${te(this.data.qualityScore,0)}</span>
          </div>
        `:null}

        ${this.data.degradation3m!=null||this.data.degradation6m!=null||this.data.degradation12m!=null?l`
          <div class="degradation-section">
            <div class="section-label">Degradace</div>
            ${this.data.degradation3m!=null?l`
              <div class="metric">
                <span class="metric-label">3 měsíce</span>
                <span class="metric-value ${this.data.degradation3m>0?"negative":""}">${this.data.degradation3m.toFixed(2)} %</span>
              </div>
            `:null}
            ${this.data.degradation6m!=null?l`
              <div class="metric">
                <span class="metric-label">6 měsíců</span>
                <span class="metric-value ${this.data.degradation6m>0?"negative":""}">${this.data.degradation6m.toFixed(2)} %</span>
              </div>
            `:null}
            ${this.data.degradation12m!=null?l`
              <div class="metric">
                <span class="metric-label">12 měsíců</span>
                <span class="metric-value ${this.data.degradation12m>0?"negative":""}">${this.data.degradation12m.toFixed(2)} %</span>
              </div>
            `:null}
          </div>
        `:null}

        ${this.data.degradationPerYear!=null||this.data.estimatedEolDate!=null?l`
          <div class="degradation-section">
            <div class="section-label">Predikce</div>
            ${this.data.degradationPerYear!=null?l`
              <div class="prediction">
                Degradace: <span class="prediction-value">${this.data.degradationPerYear.toFixed(2)} %/rok</span>
              </div>
            `:null}
            ${this.data.yearsTo80Pct!=null?l`
              <div class="prediction">
                80% SoH za: <span class="prediction-value">${this.data.yearsTo80Pct.toFixed(1)} let</span>
              </div>
            `:null}
            ${this.data.estimatedEolDate?l`
              <div class="prediction">
                Odhad EOL: <span class="prediction-value">${this.data.estimatedEolDate}</span>
              </div>
            `:null}
            ${this.data.trendConfidence!=null?l`
              <div class="prediction">
                Spolehlivost: <span class="prediction-value">${te(this.data.trendConfidence,0)}</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:l`<div>Načítání...</div>`}};mi.styles=_`
    :host { display: block; }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 12px;
    }

    .status-badge.excellent { background: #4caf50; }
    .status-badge.good { background: #8bc34a; }
    .status-badge.fair { background: #ff9800; }
    .status-badge.poor { background: #f44336; }

    .sparkline-container {
      margin: 8px 0 12px;
      height: 40px;
    }

    .sparkline-container svg {
      width: 100%;
      height: 100%;
    }

    ${Wi}

    .degradation-section {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1));
    }

    .section-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--secondary-text-color);
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .prediction {
      font-size: 11px;
      color: var(--secondary-text-color);
      padding: 4px 0;
    }

    .prediction-value {
      font-weight: 500;
      color: var(--primary-text-color);
    }
  `;mt([u({type:Object})],mi.prototype,"data",2);mi=mt([C("oig-battery-health")],mi);let fi=class extends S{constructor(){super(...arguments),this.data=null}getProgressClass(t){return t==null?"ok":t>=95?"overdue":t>=80?"due-soon":"ok"}render(){return this.data?l`
      <oig-analytics-block title="Balancování" icon="⚖️">
        <div class="metric">
          <span class="metric-label">Stav</span>
          <span class="metric-value">${this.data.status}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Poslední</span>
          <span class="metric-value">${this.data.lastBalancing}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Náklady</span>
          <span class="metric-value">${K(this.data.cost)}</span>
        </div>
        ${this.data.nextScheduled?l`
          <div class="metric">
            <span class="metric-label">Plánováno</span>
            <span class="metric-value">${this.data.nextScheduled}</span>
          </div>
        `:null}

        ${this.data.progressPercent!=null?l`
          <div class="progress-container">
            <div class="progress-label">
              <span>Průběh cyklu</span>
              <span>${this.data.daysRemaining!=null?`${this.data.daysRemaining} dní zbývá`:`${this.data.progressPercent}%`}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ${this.getProgressClass(this.data.progressPercent)}"
                   style="width: ${this.data.progressPercent}%"></div>
            </div>
          </div>
        `:null}

        ${this.data.intervalDays!=null?l`
          <div class="metric">
            <span class="metric-label">Interval</span>
            <span class="metric-value">${this.data.intervalDays} dní</span>
          </div>
        `:null}
        ${this.data.estimatedNextCost!=null?l`
          <div class="metric">
            <span class="metric-label">Odhad dalších nákladů</span>
            <span class="metric-value">${K(this.data.estimatedNextCost)}</span>
          </div>
        `:null}
      </oig-analytics-block>
    `:l`<div>Načítání...</div>`}};fi.styles=_`
    :host { display: block; }
    ${Wi}

    .progress-container {
      margin: 8px 0;
      padding: 8px 0;
      border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.1));
    }

    .progress-label {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--secondary-text-color, #999);
      margin-bottom: 4px;
    }

    .progress-bar {
      height: 6px;
      background: var(--divider-color, rgba(255,255,255,0.15));
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.5s ease;
    }

    .progress-fill.ok { background: #4caf50; }
    .progress-fill.due-soon { background: #ff9800; }
    .progress-fill.overdue { background: #f44336; }
  `;mt([u({type:Object})],fi.prototype,"data",2);fi=mt([C("oig-battery-balancing")],fi);let bi=class extends S{constructor(){super(...arguments),this.data=null}render(){return this.data?l`
      <oig-analytics-block title="Porovnání nákladů" icon="💰">
        <div class="cost-row">
          <span class="cost-label">Skutečné náklady</span>
          <span class="cost-value">${K(this.data.actualSpent)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Plán celkem</span>
          <span class="cost-value">${K(this.data.planTotalCost)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Zbývající plán</span>
          <span class="cost-value">${K(this.data.futurePlanCost)}</span>
        </div>
        ${this.data.tomorrowCost!=null?l`
          <div class="cost-row">
            <span class="cost-label">Zítra odhad</span>
            <span class="cost-value">${K(this.data.tomorrowCost)}</span>
          </div>
        `:null}

        ${this.data.yesterdayActualCost!=null?l`
          <div class="yesterday-section">
            <div class="section-label">Včera</div>
            <div class="cost-row">
              <span class="cost-label">Plán</span>
              <span class="cost-value">${this.data.yesterdayPlannedCost!=null?K(this.data.yesterdayPlannedCost):"—"}</span>
            </div>
            <div class="cost-row">
              <span class="cost-label">Skutečnost</span>
              <span class="cost-value">${K(this.data.yesterdayActualCost)}</span>
            </div>
            ${this.data.yesterdayDelta!=null?l`
              <div class="cost-row">
                <span class="cost-label">Rozdíl</span>
                <span class="cost-value ${this.data.yesterdayDelta<=0?"delta-positive":"delta-negative"}">
                  ${this.data.yesterdayDelta>=0?"+":""}${K(this.data.yesterdayDelta)}
                </span>
              </div>
            `:null}
            ${this.data.yesterdayAccuracy!=null?l`
              <div class="cost-row">
                <span class="cost-label">Přesnost</span>
                <span class="cost-value">${this.data.yesterdayAccuracy.toFixed(0)}%</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:l`<div>Načítání...</div>`}};bi.styles=_`
    :host { display: block; }

    .cost-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.1));
    }

    .cost-row:last-child { border-bottom: none; }

    .cost-label {
      font-size: 12px;
      color: var(--secondary-text-color, #999);
    }

    .cost-value {
      font-size: 12px;
      font-weight: 500;
      color: var(--primary-text-color, #fff);
    }

    .yesterday-section {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1));
    }

    .section-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--secondary-text-color);
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .delta-positive { color: var(--success-color, #4caf50); }
    .delta-negative { color: var(--error-color, #f44336); }
  `;mt([u({type:Object})],bi.prototype,"data",2);bi=mt([C("oig-cost-comparison")],bi);var yr=Object.defineProperty,xr=Object.getOwnPropertyDescriptor,ge=(t,e,i,s)=>{for(var o=s>1?void 0:s?xr(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&yr(e,i,o),o};const Zt=j;let Fe=class extends S{constructor(){super(...arguments),this.data=Pe,this.compact=!1,this.onClick=()=>{this.dispatchEvent(new CustomEvent("badge-click",{bubbles:!0}))}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.onClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.onClick)}render(){const t=this.data.effectiveSeverity,e=ei[t]??ei[0],i=this.data.warningsCount>0&&t>0,s=i?Ko(this.data.eventType):"✓";return l`
      <style>
        :host { background: ${Zt(e)}; }
      </style>
      <span class="badge-icon">${s}</span>
      ${i?l`
        <span class="badge-count">${this.data.warningsCount}</span>
      `:null}
      <span class="badge-label">${i?Zo[t]??"Výstraha":"OK"}</span>
    `}};Fe.styles=_`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
      color: #fff;
    }

    :host(:hover) {
      opacity: 0.9;
    }

    .badge-icon {
      font-size: 14px;
    }

    .badge-count {
      background: rgba(255,255,255,0.3);
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 11px;
    }

    :host([compact]) .badge-label {
      display: none;
    }
  `;ge([u({type:Object})],Fe.prototype,"data",2);ge([u({type:Boolean})],Fe.prototype,"compact",2);Fe=ge([C("oig-chmu-badge")],Fe);let Re=class extends S{constructor(){super(...arguments),this.open=!1,this.data=Pe}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}formatTime(t){return t?new Date(t).toLocaleString("cs-CZ"):"—"}renderWarning(t){const e=ei[t.severity]??ei[2],i=Ko(t.event_type),s=Zo[t.severity]??"Neznámá";return l`
      <div class="warning-item" style="background: ${e}">
        <div class="warning-header">
          <span class="warning-icon">${i}</span>
          <span class="warning-type">${t.event_type}</span>
          <span class="warning-level">${s}</span>
          ${t.eta_hours>0?l`
            <span class="eta-badge">za ${t.eta_hours.toFixed(0)}h</span>
          `:null}
        </div>
        ${t.description?l`
          <div class="warning-description">${t.description}</div>
        `:null}
        ${t.instruction?l`
          <div class="warning-instruction">${t.instruction}</div>
        `:null}
        <div class="warning-time">
          ${this.formatTime(t.onset)} — ${this.formatTime(t.expires)}
        </div>
      </div>
    `}render(){const t=this.data.allWarnings,e=t.length>0&&this.data.effectiveSeverity>0;return l`
      <div class="modal" @click=${i=>i.stopPropagation()}>
        <div class="modal-header">
          <span class="modal-title">⚠️ ČHMÚ výstrahy</span>
          <button class="close-btn" @click=${this.onClose}>✕</button>
        </div>

        ${e?t.map(i=>this.renderWarning(i)):l`
          <div class="empty-state">Žádné aktivní výstrahy</div>
        `}
      </div>
    `}};Re.styles=_`
    :host {
      display: none;
    }

    :host([open]) {
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: ${Zt(r.cardBg)};
      border-radius: 16px;
      padding: 20px;
      width: 90vw;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 600;
      color: ${Zt(r.textPrimary)};
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      font-size: 20px;
      cursor: pointer;
      color: ${Zt(r.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${Zt(r.bgSecondary)};
    }

    .warning-item {
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 12px;
      color: #fff;
    }

    .warning-item:last-child {
      margin-bottom: 0;
    }

    .warning-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .warning-icon { font-size: 18px; }

    .warning-type {
      font-size: 14px;
      font-weight: 600;
    }

    .warning-level {
      font-size: 11px;
      padding: 2px 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
    }

    .warning-description {
      font-size: 12px;
      margin-bottom: 4px;
    }

    .warning-instruction {
      font-size: 11px;
      font-style: italic;
      opacity: 0.85;
      margin-bottom: 8px;
    }

    .warning-time {
      font-size: 11px;
      opacity: 0.8;
    }

    .empty-state {
      text-align: center;
      padding: 20px;
      color: ${Zt(r.textSecondary)};
    }

    .eta-badge {
      display: inline-block;
      font-size: 10px;
      padding: 1px 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      margin-left: 6px;
    }
  `;ge([u({type:Boolean,reflect:!0})],Re.prototype,"open",2);ge([u({type:Object})],Re.prototype,"data",2);Re=ge([C("oig-chmu-modal")],Re);var $r=Object.defineProperty,wr=Object.getOwnPropertyDescriptor,wt=(t,e,i,s)=>{for(var o=s>1?void 0:s?wr(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&$r(e,i,o),o};const A=j;let Ht=class extends S{constructor(){super(...arguments),this.open=!1,this.activeTab="today",this.data=null,this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.open&&this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onTabClick(t){this.activeTab=t,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:t},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(t){return`${t.toFixed(0)}%`}adherenceColor(t){return t>=90?"#4caf50":t>=70?"#ff9800":"#f44336"}getModeConfig(t){return Yo[t]??{icon:"❓",color:"#666",label:t}}renderModeBlock(t){const e=this.getModeConfig(t.modePlanned||t.modeHistorical),i=t.status==="current";return l`
      <div
        class="mode-block ${i?"current":""}"
        style="background: ${e.color}; flex: ${Math.max(t.durationHours,.5)}"
        title="${t.startTime}–${t.endTime} | ${e.label}"
      >
        ${t.modeMatch?null:l`<span class="mode-mismatch">!</span>`}
        <span class="mode-icon">${e.icon}</span>
        <span class="mode-name">${e.label}</span>
        <span class="mode-time">${t.startTime}–${t.endTime}</span>
        ${t.costPlanned!=null?l`
          <span class="mode-cost">${K(t.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(t,e){const i=e.unit==="Kč"?K(e.plan):`${e.plan.toFixed(1)} ${e.unit}`;let s="",o="";return e.hasActual&&e.actual!=null&&(o=e.unit==="Kč"?K(e.actual):`${e.actual.toFixed(1)} ${e.unit}`,e.unit==="Kč"?s=e.actual<=e.plan?"better":"worse":s=e.actual>=e.plan?"better":"worse"),l`
      <div class="metric-tile">
        <div class="metric-label">${t}</div>
        <div class="metric-values">
          <span class="metric-plan">${i}</span>
          ${e.hasActual?l`
            <span class="metric-actual ${s}">(${o})</span>
          `:null}
        </div>
      </div>
    `}render(){const t=["yesterday","today","tomorrow","history","detail"];return l`
      <div class="dialog" @click=${e=>e.stopPropagation()}>
        <div class="dialog-header">
          <span class="dialog-title">📅 Timeline</span>
          <div class="header-controls">
            <label class="auto-refresh">
              <input type="checkbox" .checked=${this.autoRefresh} @change=${this.toggleAutoRefresh} />
              Auto
            </label>
            <button class="close-btn" @click=${this.onClose}>✕</button>
          </div>
        </div>

        <div class="tabs">
          ${t.map(e=>l`
            <button
              class="tab ${this.activeTab===e?"active":""}"
              @click=${()=>this.onTabClick(e)}
            >
              ${Qo[e]}
            </button>
          `)}
        </div>

        <div class="dialog-content">
          ${this.data?this.renderDayContent():l`
            <div class="empty-state">Načítání dat...</div>
          `}
        </div>
      </div>
    `}renderDayContent(){const t=this.data,e=t.summary;return l`
      <!-- Adherence bar -->
      ${e.overallAdherence>0?l`
        <div class="adherence-bar">
          <div class="adherence-header">
            <span>Soulad s plánem</span>
            <span>${this.fmtPct(e.overallAdherence)}</span>
          </div>
          <div class="adherence-track">
            <div
              class="adherence-fill"
              style="width: ${e.overallAdherence}%; background: ${this.adherenceColor(e.overallAdherence)}"
            ></div>
          </div>
        </div>
      `:null}

      <!-- Progress (today specific) -->
      ${e.progressPct!=null?l`
        <div class="progress-section">
          <div class="progress-item">
            Průběh: <span class="progress-value">${this.fmtPct(e.progressPct)}</span>
          </div>
          ${e.actualTotalCost!=null?l`
            <div class="progress-item">
              Skutečné: <span class="progress-value">${K(e.actualTotalCost)}</span>
            </div>
          `:null}
          ${e.planTotalCost!=null?l`
            <div class="progress-item">
              Plán: <span class="progress-value">${K(e.planTotalCost)}</span>
            </div>
          `:null}
          ${e.vsPlanPct!=null?l`
            <div class="progress-item">
              vs plán: <span class="progress-value" style="color: ${e.vsPlanPct<=100?"#4caf50":"#f44336"}">${this.fmtPct(e.vsPlanPct)}</span>
            </div>
          `:null}
        </div>
      `:null}

      <!-- EOD prediction -->
      ${e.eodPrediction?l`
        <div class="eod-prediction">
          Predikce konce dne: <span class="eod-value">${K(e.eodPrediction.predictedTotal)}</span>
          ${e.eodPrediction.predictedSavings>0?l`
            <span class="eod-savings"> (úspora ${K(e.eodPrediction.predictedSavings)})</span>
          `:null}
        </div>
      `:null}

      <!-- Metrics grid -->
      <div class="metrics-grid">
        ${this.renderMetricTile("Náklady",e.metrics.cost)}
        ${this.renderMetricTile("Solár",e.metrics.solar)}
        ${this.renderMetricTile("Spotřeba",e.metrics.consumption)}
        ${this.renderMetricTile("Síť",e.metrics.grid)}
      </div>

      <!-- Mode blocks timeline -->
      ${t.modeBlocks.length>0?l`
        <div class="modes-section">
          <div class="section-title">Režimy (${t.modeBlocks.length} bloků, ${e.modeSwitches} přepnutí)</div>
          <div class="mode-blocks-timeline">
            ${t.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}

      <!-- Comparison plan (if available) -->
      ${t.comparison?l`
        <div class="modes-section">
          <div class="section-title">Srovnání: ${t.comparison.plan}</div>
          <div class="mode-blocks-timeline">
            ${t.comparison.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}
    `}};Ht.styles=_`
    :host {
      display: none;
    }

    :host([open]) {
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background: ${A(r.cardBg)};
      border-radius: 16px;
      width: 90vw;
      max-width: 800px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid ${A(r.divider)};
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${A(r.textPrimary)};
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      font-size: 20px;
      cursor: pointer;
      color: ${A(r.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${A(r.bgSecondary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${A(r.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${A(r.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 12px 16px;
      border: none;
      background: transparent;
      font-size: 13px;
      color: ${A(r.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${A(r.textPrimary)};
    }

    .tab.active {
      color: ${A(r.accent)};
      border-bottom-color: ${A(r.accent)};
    }

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    /* ---- Adherence bar ---- */
    .adherence-bar {
      margin-bottom: 16px;
    }

    .adherence-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: ${A(r.textSecondary)};
      margin-bottom: 4px;
    }

    .adherence-track {
      height: 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .adherence-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }

    /* ---- Metric tiles ---- */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .metric-tile {
      background: ${A(r.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
    }

    .metric-label {
      font-size: 11px;
      color: ${A(r.textSecondary)};
      margin-bottom: 4px;
    }

    .metric-values {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .metric-plan {
      font-size: 16px;
      font-weight: 600;
      color: ${A(r.textPrimary)};
    }

    .metric-actual {
      font-size: 12px;
      font-weight: 500;
    }

    .metric-actual.better { color: var(--success-color, #4caf50); }
    .metric-actual.worse { color: var(--error-color, #f44336); }

    /* ---- Mode blocks ---- */
    .modes-section {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 500;
      color: ${A(r.textPrimary)};
      margin-bottom: 12px;
    }

    .mode-blocks-timeline {
      display: flex;
      gap: 2px;
      overflow-x: auto;
      padding: 4px 0;
    }

    .mode-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 11px;
      color: #fff;
      min-width: 50px;
      position: relative;
      cursor: default;
    }

    .mode-block.current {
      box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(255,255,255,0.3);
    }

    .mode-block .mode-icon { font-size: 14px; }
    .mode-block .mode-time { font-size: 9px; opacity: 0.8; }
    .mode-block .mode-name { font-size: 10px; font-weight: 500; }

    .mode-mismatch {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 12px;
      height: 12px;
      background: #f44336;
      border-radius: 50%;
      font-size: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mode-cost {
      font-size: 9px;
      opacity: 0.7;
      margin-top: 2px;
    }

    /* ---- Progress section (today) ---- */
    .progress-section {
      margin-bottom: 16px;
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .progress-item {
      font-size: 12px;
      color: ${A(r.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${A(r.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${A(r.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 12px;
      color: ${A(r.textSecondary)};
    }

    .eod-value {
      font-size: 16px;
      font-weight: 600;
      color: ${A(r.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: ${A(r.textSecondary)};
    }

    @media (max-width: 600px) {
      .dialog {
        width: 100vw;
        max-width: 100vw;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
      }
    }
  `;wt([u({type:Boolean,reflect:!0})],Ht.prototype,"open",2);wt([u({type:String})],Ht.prototype,"activeTab",2);wt([u({type:Object})],Ht.prototype,"data",2);wt([v()],Ht.prototype,"autoRefresh",2);Ht=wt([C("oig-timeline-dialog")],Ht);let re=class extends S{constructor(){super(...arguments),this.data=null,this.activeTab="today",this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onTabClick(t){this.activeTab=t,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:t},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(t){return`${t.toFixed(0)}%`}adherenceColor(t){return t>=90?"#4caf50":t>=70?"#ff9800":"#f44336"}getModeConfig(t){return Yo[t]??{icon:"❓",color:"#666",label:t}}renderModeBlock(t){const e=this.getModeConfig(t.modePlanned||t.modeHistorical),i=t.status==="current";return l`
      <div
        class="mode-block ${i?"current":""}"
        style="background: ${e.color}; flex: ${Math.max(t.durationHours,.5)}"
        title="${t.startTime}–${t.endTime} | ${e.label}"
      >
        ${t.modeMatch?null:l`<span class="mode-mismatch">!</span>`}
        <span class="mode-icon">${e.icon}</span>
        <span class="mode-name">${e.label}</span>
        <span class="mode-time">${t.startTime}–${t.endTime}</span>
        ${t.costPlanned!=null?l`
          <span class="mode-cost">${K(t.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(t,e){const i=e.unit==="Kč"?K(e.plan):`${e.plan.toFixed(1)} ${e.unit}`;let s="",o="";return e.hasActual&&e.actual!=null&&(o=e.unit==="Kč"?K(e.actual):`${e.actual.toFixed(1)} ${e.unit}`,e.unit==="Kč"?s=e.actual<=e.plan?"better":"worse":s=e.actual>=e.plan?"better":"worse"),l`
      <div class="metric-tile">
        <div class="metric-label">${t}</div>
        <div class="metric-values">
          <span class="metric-plan">${i}</span>
          ${e.hasActual?l`
            <span class="metric-actual ${s}">(${o})</span>
          `:null}
        </div>
      </div>
    `}render(){const t=["yesterday","today","tomorrow","history","detail"];return l`
      <div class="tile">
        <div class="tile-header">
          <span class="tile-title">📅 Plán režimů</span>
          <label class="auto-refresh">
            <input type="checkbox" .checked=${this.autoRefresh} @change=${this.toggleAutoRefresh} />
            Auto
          </label>
        </div>

        <div class="tabs">
          ${t.map(e=>l`
            <button
              class="tab ${this.activeTab===e?"active":""}"
              @click=${()=>this.onTabClick(e)}
            >
              ${Qo[e]}
            </button>
          `)}
        </div>

        <div class="tile-content">
          ${this.data?this.renderDayContent():l`
            <div class="empty-state">Načítání dat...</div>
          `}
        </div>
      </div>
    `}renderDayContent(){const t=this.data,e=t.summary;return l`
      <!-- Adherence bar -->
      ${e.overallAdherence>0?l`
        <div class="adherence-bar">
          <div class="adherence-header">
            <span>Soulad s plánem</span>
            <span>${this.fmtPct(e.overallAdherence)}</span>
          </div>
          <div class="adherence-track">
            <div
              class="adherence-fill"
              style="width: ${e.overallAdherence}%; background: ${this.adherenceColor(e.overallAdherence)}"
            ></div>
          </div>
        </div>
      `:null}

      <!-- Progress (today specific) -->
      ${e.progressPct!=null?l`
        <div class="progress-section">
          <div class="progress-item">
            Průběh: <span class="progress-value">${this.fmtPct(e.progressPct)}</span>
          </div>
          ${e.actualTotalCost!=null?l`
            <div class="progress-item">
              Skutečné: <span class="progress-value">${K(e.actualTotalCost)}</span>
            </div>
          `:null}
          ${e.planTotalCost!=null?l`
            <div class="progress-item">
              Plán: <span class="progress-value">${K(e.planTotalCost)}</span>
            </div>
          `:null}
          ${e.vsPlanPct!=null?l`
            <div class="progress-item">
              vs plán: <span class="progress-value" style="color: ${e.vsPlanPct<=100?"#4caf50":"#f44336"}">${this.fmtPct(e.vsPlanPct)}</span>
            </div>
          `:null}
        </div>
      `:null}

      <!-- EOD prediction -->
      ${e.eodPrediction?l`
        <div class="eod-prediction">
          Predikce konce dne: <span class="eod-value">${K(e.eodPrediction.predictedTotal)}</span>
          ${e.eodPrediction.predictedSavings>0?l`
            <span class="eod-savings"> (úspora ${K(e.eodPrediction.predictedSavings)})</span>
          `:null}
        </div>
      `:null}

      <!-- Metrics grid -->
      <div class="metrics-grid">
        ${this.renderMetricTile("Náklady",e.metrics.cost)}
        ${this.renderMetricTile("Solár",e.metrics.solar)}
        ${this.renderMetricTile("Spotřeba",e.metrics.consumption)}
        ${this.renderMetricTile("Síť",e.metrics.grid)}
      </div>

      <!-- Mode blocks timeline -->
      ${t.modeBlocks.length>0?l`
        <div class="modes-section">
          <div class="section-title">Režimy (${t.modeBlocks.length} bloků, ${e.modeSwitches} přepnutí)</div>
          <div class="mode-blocks-timeline">
            ${t.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}

      <!-- Comparison plan (if available) -->
      ${t.comparison?l`
        <div class="modes-section">
          <div class="section-title">Srovnání: ${t.comparison.plan}</div>
          <div class="mode-blocks-timeline">
            ${t.comparison.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}
    `}};re.styles=_`
    :host {
      display: block;
    }

    .tile {
      background: ${A(r.cardBg)};
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
    }

    .tile-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid ${A(r.divider)};
    }

    .tile-title {
      font-size: 13px;
      font-weight: 600;
      color: ${A(r.textPrimary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${A(r.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${A(r.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 6px 10px;
      border: none;
      background: transparent;
      font-size: 11px;
      color: ${A(r.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${A(r.textPrimary)};
    }

    .tab.active {
      color: ${A(r.accent)};
      border-bottom-color: ${A(r.accent)};
    }

    .tile-content {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
    }

    /* ---- Adherence bar ---- */
    .adherence-bar {
      margin-bottom: 12px;
    }

    .adherence-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: ${A(r.textSecondary)};
      margin-bottom: 4px;
    }

    .adherence-track {
      height: 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .adherence-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }

    /* ---- Metric tiles ---- */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }

    .metric-tile {
      background: ${A(r.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
    }

    .metric-label {
      font-size: 10px;
      color: ${A(r.textSecondary)};
      margin-bottom: 2px;
    }

    .metric-values {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .metric-plan {
      font-size: 14px;
      font-weight: 600;
      color: ${A(r.textPrimary)};
    }

    .metric-actual {
      font-size: 11px;
      font-weight: 500;
    }

    .metric-actual.better { color: var(--success-color, #4caf50); }
    .metric-actual.worse { color: var(--error-color, #f44336); }

    /* ---- Mode blocks ---- */
    .modes-section {
      margin-bottom: 12px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 500;
      color: ${A(r.textPrimary)};
      margin-bottom: 8px;
    }

    .mode-blocks-timeline {
      display: flex;
      gap: 2px;
      overflow-x: auto;
      padding: 2px 0;
    }

    .mode-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 5px 6px;
      border-radius: 6px;
      font-size: 10px;
      color: #fff;
      min-width: 44px;
      position: relative;
      cursor: default;
    }

    .mode-block.current {
      box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(255,255,255,0.3);
    }

    .mode-block .mode-icon { font-size: 12px; }
    .mode-block .mode-time { font-size: 8px; opacity: 0.8; }
    .mode-block .mode-name { font-size: 9px; font-weight: 500; }

    .mode-mismatch {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 12px;
      height: 12px;
      background: #f44336;
      border-radius: 50%;
      font-size: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mode-cost {
      font-size: 8px;
      opacity: 0.7;
      margin-top: 1px;
    }

    /* ---- Progress section ---- */
    .progress-section {
      margin-bottom: 12px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .progress-item {
      font-size: 11px;
      color: ${A(r.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${A(r.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${A(r.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${A(r.textSecondary)};
    }

    .eod-value {
      font-size: 14px;
      font-weight: 600;
      color: ${A(r.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 24px 16px;
      color: ${A(r.textSecondary)};
      font-size: 12px;
    }
  `;wt([u({type:Object})],re.prototype,"data",2);wt([u({type:String})],re.prototype,"activeTab",2);wt([v()],re.prototype,"autoRefresh",2);re=wt([C("oig-timeline-tile")],re);var _r=Object.defineProperty,kr=Object.getOwnPropertyDescriptor,Mt=(t,e,i,s)=>{for(var o=s>1?void 0:s?kr(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&_r(e,i,o),o};const Q=j;let le=class extends S{constructor(){super(...arguments),this.data=null,this.editMode=!1,this.tileType="entity"}onTileClick(){var e;if(this.editMode)return;const t=(e=this.data)==null?void 0:e.config;t&&(t.type==="button"&&t.action?an(t.entity_id,t.action):tt.openEntityDialog(t.entity_id))}onSupportClick(t,e){t.stopPropagation(),!this.editMode&&tt.openEntityDialog(e)}onEdit(){var t;this.dispatchEvent(new CustomEvent("edit-tile",{detail:{entityId:(t=this.data)==null?void 0:t.config.entity_id},bubbles:!0,composed:!0}))}onDelete(){var t;this.dispatchEvent(new CustomEvent("delete-tile",{detail:{entityId:(t=this.data)==null?void 0:t.config.entity_id},bubbles:!0,composed:!0}))}render(){var d,p;if(!this.data)return null;const t=this.data.config,e=t.type==="button";this.tileType!==t.type&&(this.tileType=t.type??"entity");const i=t.color||"",s=t.icon||(e?"⚡":"📊"),o=s.startsWith("mdi:")?ii(s):s,a=(d=t.support_entities)==null?void 0:d.top_right,n=(p=t.support_entities)==null?void 0:p.bottom_right,c=this.data.supportValues.topRight||this.data.supportValues.bottomRight;return l`
      ${i?l`<style>:host { --tile-color: ${Q(i)}; }</style>`:null}

      <div class="tile-top" @click=${this.onTileClick} title=${this.editMode?"":t.entity_id}>
        <span class="tile-icon">${o}</span>
        <span class="tile-label">${t.label||""}</span>
        ${c?l`
          <div class="support-values">
            ${this.data.supportValues.topRight?l`
              <span
                class="support-value ${a&&!this.editMode?"clickable":""}"
                @click=${a&&!this.editMode?g=>this.onSupportClick(g,a):null}
              >${this.data.supportValues.topRight.value} ${this.data.supportValues.topRight.unit}</span>
            `:null}
            ${this.data.supportValues.bottomRight?l`
              <span
                class="support-value ${n&&!this.editMode?"clickable":""}"
                @click=${n&&!this.editMode?g=>this.onSupportClick(g,n):null}
              >${this.data.supportValues.bottomRight.value} ${this.data.supportValues.bottomRight.unit}</span>
            `:null}
          </div>
        `:null}
      </div>

      <div class="tile-main" @click=${this.onTileClick}>
        <span class="tile-value">${this.data.value}</span>
        ${this.data.unit?l`<span class="tile-unit">${this.data.unit}</span>`:null}
        ${e?l`
          <span class="state-dot ${this.data.isActive?"on":"off"}"></span>
        `:null}
      </div>

      ${this.editMode?l`
        <div class="edit-actions">
          <button class="edit-btn" @click=${this.onEdit}>⚙</button>
          <button class="delete-btn" @click=${this.onDelete}>✕</button>
        </div>
      `:null}
    `}};le.styles=_`
    /* ===== BASE ===== */
    :host {
      display: flex;
      flex-direction: column;
      padding: 10px 12px;
      background: ${Q(r.cardBg)};
      border-radius: 10px;
      box-shadow: ${Q(r.cardShadow)};
      min-width: 0;
      position: relative;
      transition: opacity 0.2s, transform 0.15s, box-shadow 0.15s;
      overflow: hidden;
      box-sizing: border-box;
      border: 1px solid transparent;
    }

    /* Barevný pruh vlevo (entity tiles) */
    :host([tiletype="entity"])::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--tile-color, transparent);
      border-radius: 10px 0 0 10px;
    }

    /* ===== ENTITY TILE HOVER ===== */
    :host([tiletype="entity"]:not([editmode]):hover) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.16);
      cursor: pointer;
    }

    :host([tiletype="entity"]:not([editmode]):active) {
      transform: translateY(0);
      opacity: 0.82;
    }

    /* Hint ikona — ukazuje, že klik otevírá entity detail */
    :host([tiletype="entity"]:not([editmode]):hover)::after {
      content: 'ℹ';
      position: absolute;
      bottom: 5px;
      right: 7px;
      font-size: 9px;
      color: ${Q(r.textSecondary)};
      opacity: 0.45;
      font-style: normal;
    }

    /* ===== BUTTON TILE ===== */
    :host([tiletype="button"]) {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--tile-color, ${Q(r.accent)}) 10%, ${Q(r.cardBg)}),
        ${Q(r.cardBg)}
      );
      border: 1px solid color-mix(in srgb, var(--tile-color, ${Q(r.accent)}) 38%, transparent);
    }

    :host([tiletype="button"]:not([editmode]):hover) {
      transform: translateY(-2px);
      cursor: pointer;
      box-shadow:
        0 4px 14px color-mix(in srgb, var(--tile-color, ${Q(r.accent)}) 28%, transparent),
        ${Q(r.cardShadow)};
    }

    :host([tiletype="button"]:not([editmode]):active) {
      transform: translateY(0) scale(0.98);
      opacity: 0.85;
    }

    :host([tiletype="button"]) .tile-icon {
      background: color-mix(in srgb, var(--tile-color, ${Q(r.accent)}) 18%, transparent);
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    :host([tiletype="button"]) .tile-label {
      font-weight: 600;
      letter-spacing: 0.1px;
    }

    /* Edit mode hover */
    :host([editmode]:hover) {
      transform: translateY(-1px);
    }

    /* Inactive / zero value */
    :host(.inactive) {
      opacity: 0.45;
    }

    /* ===== HEADER ROW ===== */
    .tile-top {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      margin-bottom: 3px;
    }

    .tile-icon {
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
      width: 24px;
      text-align: center;
    }

    .tile-label {
      flex: 1;
      font-size: 10px;
      font-weight: 500;
      color: ${Q(r.textSecondary)};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
      line-height: 1.2;
      letter-spacing: 0.2px;
    }

    /* Support values (top-right, bottom-right) */
    .support-values {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      flex-shrink: 0;
    }

    .support-value {
      font-size: 11px;
      font-weight: 500;
      color: ${Q(r.textSecondary)};
      white-space: nowrap;
      line-height: 1.2;
    }

    .support-value.clickable {
      cursor: pointer;
    }

    .support-value.clickable:hover {
      text-decoration: underline;
      color: ${Q(r.textPrimary)};
    }

    /* ===== VALUE ROW ===== */
    .tile-main {
      display: flex;
      align-items: baseline;
      gap: 3px;
      min-width: 0;
      overflow: hidden;
      margin-top: 1px;
    }

    .tile-value {
      font-size: 20px;
      font-weight: 700;
      color: ${Q(r.textPrimary)};
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .tile-unit {
      font-size: 11px;
      font-weight: 400;
      color: ${Q(r.textSecondary)};
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* State dot for button tiles */
    .state-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-left: 4px;
      flex-shrink: 0;
      align-self: center;
      margin-bottom: 2px;
    }

    .state-dot.on {
      background: ${Q(r.success)};
      box-shadow: 0 0 4px ${Q(r.success)};
    }

    .state-dot.off {
      background: ${Q(r.textSecondary)};
      opacity: 0.5;
    }

    /* ===== EDIT ACTIONS ===== */
    .edit-actions {
      position: absolute;
      top: 4px;
      right: 4px;
      display: flex;
      gap: 3px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    :host(:hover) .edit-actions {
      opacity: 1;
    }

    .edit-btn,
    .delete-btn {
      width: 18px;
      height: 18px;
      border: none;
      background: ${Q(r.bgSecondary)};
      border-radius: 50%;
      font-size: 9px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .delete-btn:hover {
      background: ${Q(r.error)};
      color: #fff;
    }
  `;Mt([u({type:Object})],le.prototype,"data",2);Mt([u({type:Boolean})],le.prototype,"editMode",2);Mt([u({type:String,reflect:!0})],le.prototype,"tileType",2);le=Mt([C("oig-tile")],le);let ce=class extends S{constructor(){super(...arguments),this.tiles=[],this.editMode=!1,this.position="left"}render(){return this.tiles.length===0?l`<div class="empty-state">Žádné dlaždice</div>`:l`
      ${this.tiles.map(t=>l`
        <oig-tile
          .data=${t}
          .editMode=${this.editMode}
          .tileType=${t.config.type??"entity"}
          class="${t.isZero?"inactive":""}"
        ></oig-tile>
      `)}
    `}};ce.styles=_`
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }

    .empty-state {
      font-size: 12px;
      color: ${Q(r.textSecondary)};
      padding: 8px;
      text-align: center;
      opacity: 0.6;
    }
  `;Mt([u({type:Array})],ce.prototype,"tiles",2);Mt([u({type:Boolean})],ce.prototype,"editMode",2);Mt([u({type:String,reflect:!0})],ce.prototype,"position",2);ce=Mt([C("oig-tiles-container")],ce);var Sr=Object.defineProperty,Cr=Object.getOwnPropertyDescriptor,qi=(t,e,i,s)=>{for(var o=s>1?void 0:s?Cr(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&Sr(e,i,o),o};const U=j,Io={Spotrebice:["fridge","fridge-outline","dishwasher","washing-machine","tumble-dryer","stove","microwave","coffee-maker","kettle","toaster","blender","food-processor","rice-cooker","slow-cooker","pressure-cooker","air-fryer","oven","range-hood"],Osvetleni:["lightbulb","lightbulb-outline","lamp","ceiling-light","floor-lamp","led-strip","led-strip-variant","wall-sconce","chandelier","desk-lamp","spotlight","light-switch"],"Vytapeni & Chlazeni":["thermometer","thermostat","radiator","radiator-disabled","heat-pump","air-conditioner","fan","hvac","fire","snowflake","fireplace","heating-coil"],"Energie & Baterie":["lightning-bolt","flash","battery","battery-charging","battery-50","battery-10","solar-panel","solar-power","meter-electric","power-plug","power-socket","ev-plug","transmission-tower","current-ac","current-dc"],"Auto & Doprava":["car","car-electric","car-battery","ev-station","ev-plug-type2","garage","garage-open","motorcycle","bicycle","scooter","bus","train","airplane"],Zabezpeceni:["door","door-open","lock","lock-open","shield-home","cctv","camera","motion-sensor","alarm-light","bell","eye","key","fingerprint","shield-check"],"Okna & Stineni":["window-closed","window-open","blinds","blinds-open","curtains","roller-shade","window-shutter","balcony","door-sliding"],"Media & Zabava":["television","speaker","speaker-wireless","music","volume-high","cast","chromecast","radio","headphones","microphone","gamepad","movie","spotify"],"Sit & IT":["router-wireless","wifi","access-point","lan","network","home-assistant","server","nas","cloud","ethernet","bluetooth","cellphone","tablet","laptop"],"Voda & Koupelna":["water","water-percent","water-boiler","water-pump","shower","toilet","faucet","pipe","bathtub","sink","water-heater","pool"],Pocasi:["weather-sunny","weather-cloudy","weather-night","weather-rainy","weather-snowy","weather-windy","weather-fog","weather-lightning","weather-hail","temperature","humidity","barometer"],"Ventilace & Kvalita vzduchu":["fan","air-filter","air-purifier","smoke-detector","co2","wind-turbine"],"Zahrada & Venku":["flower","tree","sprinkler","grass","garden-light","outdoor-lamp","grill","pool","hot-tub","umbrella","thermometer-lines"],Domacnost:["iron","vacuum","broom","mop","washing","basket","hanger","scissors"],"Notifikace & Stav":["information","help-circle","alert-circle","checkbox-marked-circle","check","close","minus","plus","arrow-up","arrow-down","refresh","sync","bell-ring"],Ovladani:["toggle-switch","power","play","pause","stop","skip-next","skip-previous","volume-up","volume-down","brightness-up","brightness-down"],"Cas & Planovani":["clock","timer","alarm","calendar","calendar-clock","schedule","history"],Ostatni:["home","cog","tools","wrench","hammer","chart-line","gauge","dots-vertical","menu","settings","account","logout"]};let Ne=class extends S{constructor(){super(...arguments),this.isOpen=!1,this.searchQuery=""}get filteredCategories(){const t=this.searchQuery.trim().toLowerCase();if(!t)return Io;const e=Object.entries(Io).map(([i,s])=>{const o=s.filter(a=>a.toLowerCase().includes(t));return[i,o]}).filter(([,i])=>i.length>0);return Object.fromEntries(e)}open(){this.isOpen=!0}close(){this.isOpen=!1,this.searchQuery=""}onOverlayClick(t){t.target===t.currentTarget&&this.close()}onSearchInput(t){const e=t.target;this.searchQuery=(e==null?void 0:e.value)??""}onIconClick(t){this.dispatchEvent(new CustomEvent("icon-selected",{detail:{icon:`mdi:${t}`},bubbles:!0,composed:!0})),this.close()}render(){if(!this.isOpen)return null;const t=this.filteredCategories,e=Object.entries(t);return l`
      <div class="overlay" @click=${this.onOverlayClick}>
        <div class="modal" @click=${i=>i.stopPropagation()}>
          <div class="header">
            <div class="title">Vyberte ikonu</div>
            <button class="close-btn" type="button" @click=${this.close} aria-label="Zavřít">×</button>
          </div>
          <div class="search">
            <input
              type="text"
              .value=${this.searchQuery}
              @input=${this.onSearchInput}
              placeholder="Hledejte ikonu..."
            />
          </div>
          <div class="content">
            ${e.length===0?l`
              <div class="empty">Žádné ikony nenalezeny</div>
            `:e.map(([i,s])=>l`
              <div class="category">
                <div class="category-title">${i}</div>
                <div class="icon-grid">
                  ${s.map(o=>l`
                    <button class="icon-item" type="button" @click=${()=>this.onIconClick(o)}>
                      <span class="icon-emoji">${ii(o)}</span>
                      <span class="icon-name">${o}</span>
                    </button>
                  `)}
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}};Ne.styles=_`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${U(r.bgPrimary)} 35%, transparent);
      backdrop-filter: blur(6px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    :host([open]) .overlay {
      opacity: 1;
      pointer-events: auto;
    }

    .modal {
      width: min(720px, 100%);
      max-height: 80vh;
      background: ${U(r.cardBg)};
      box-shadow: ${U(r.cardShadow)};
      border-radius: 14px;
      border: 1px solid ${U(r.divider)};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: translateY(8px) scale(0.98);
      transition: transform 0.2s ease;
    }

    :host([open]) .modal {
      transform: translateY(0) scale(1);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px 10px;
      border-bottom: 1px solid ${U(r.divider)};
      gap: 12px;
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${U(r.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${U(r.bgSecondary)};
      color: ${U(r.textPrimary)};
      width: 28px;
      height: 28px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      display: grid;
      place-items: center;
      transition: background 0.2s ease, transform 0.2s ease;
    }

    .close-btn:hover {
      background: ${U(r.divider)};
      transform: scale(1.05);
    }

    .search {
      padding: 12px 18px;
      border-bottom: 1px solid ${U(r.divider)};
      background: ${U(r.bgSecondary)};
    }

    .search input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${U(r.divider)};
      background: ${U(r.bgPrimary)};
      color: ${U(r.textPrimary)};
      font-size: 13px;
      outline: none;
    }

    .search input::placeholder {
      color: ${U(r.textSecondary)};
    }

    .content {
      padding: 16px 18px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .category {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .category-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${U(r.textSecondary)};
    }

    .icon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
      gap: 10px;
    }

    .icon-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 8px 6px;
      border-radius: 10px;
      border: 1px solid transparent;
      background: ${U(r.bgSecondary)};
      cursor: pointer;
      transition: transform 0.15s ease, border 0.2s ease, background 0.2s ease;
      text-align: center;
      font-size: 10px;
      color: ${U(r.textSecondary)};
    }

    .icon-item:hover {
      background: ${U(r.bgPrimary)};
      border-color: ${U(r.accent)};
      transform: translateY(-2px);
      color: ${U(r.textPrimary)};
    }

    .icon-emoji {
      font-size: 22px;
      line-height: 1;
      color: ${U(r.textPrimary)};
    }

    .icon-name {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      font-size: 12px;
      color: ${U(r.textSecondary)};
      text-align: center;
      padding: 24px 0 12px;
    }
  `;qi([u({type:Boolean,reflect:!0,attribute:"open"})],Ne.prototype,"isOpen",2);qi([v()],Ne.prototype,"searchQuery",2);Ne=qi([C("oig-icon-picker")],Ne);var Pr=Object.defineProperty,Tr=Object.getOwnPropertyDescriptor,J=(t,e,i,s)=>{for(var o=s>1?void 0:s?Tr(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&Pr(e,i,o),o};const k=j;let Z=class extends S{constructor(){super(...arguments),this.isOpen=!1,this.tileIndex=-1,this.tileSide="left",this.existingConfig=null,this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}loadTileConfig(t){var e,i;this.currentTab=t.type,t.type==="entity"?this.selectedEntityId=t.entity_id:this.selectedButtonEntityId=t.entity_id,this.label=t.label||"",this.icon=t.icon||"",this.color=t.color||"#03A9F4",this.action=t.action||"toggle",this.supportEntity1=((e=t.support_entities)==null?void 0:e.top_right)||"",this.supportEntity2=((i=t.support_entities)==null?void 0:i.bottom_right)||""}resetForm(){this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}handleClose(){this.isOpen=!1,this.resetForm(),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}getEntities(){const t=Vt();return t?t.getAll():{}}getEntityItems(t,e){const i=e.trim().toLowerCase(),s=this.getEntities();return Object.entries(s).filter(([a])=>t.some(n=>a.startsWith(n))).map(([a,n])=>{const c=this.getAttributeValue(n,"friendly_name")||a,d=this.getAttributeValue(n,"unit_of_measurement"),p=this.getAttributeValue(n,"icon");return{id:a,name:c,value:n.state,unit:d,icon:p,state:n}}).filter(a=>i?a.name.toLowerCase().includes(i)||a.id.toLowerCase().includes(i):!0).sort((a,n)=>a.name.localeCompare(n.name))}getSupportEntities(t){const e=t.trim().toLowerCase();if(!e)return[];const i=this.getEntities();return Object.entries(i).map(([s,o])=>{const a=this.getAttributeValue(o,"friendly_name")||s,n=this.getAttributeValue(o,"unit_of_measurement"),c=this.getAttributeValue(o,"icon");return{id:s,name:a,value:o.state,unit:n,icon:c,state:o}}).filter(s=>s.name.toLowerCase().includes(e)||s.id.toLowerCase().includes(e)).sort((s,o)=>s.name.localeCompare(o.name)).slice(0,20)}getDisplayIcon(t){return t?t.startsWith("mdi:")?ii(t):t:ii("")}getColorForEntity(t){switch(t.split(".")[0]){case"sensor":return"#03A9F4";case"binary_sensor":return"#4CAF50";case"switch":return"#FFC107";case"light":return"#FF9800";case"fan":return"#00BCD4";case"input_boolean":return"#9C27B0";default:return"#03A9F4"}}applyEntityDefaults(t){if(!t)return;const i=this.getEntities()[t];if(!i)return;this.label||(this.label=this.getAttributeValue(i,"friendly_name"));const s=this.getAttributeValue(i,"icon");!this.icon&&s&&(this.icon=s),this.color=this.getColorForEntity(t)}handleEntitySelect(t){this.selectedEntityId=t,this.applyEntityDefaults(t)}handleButtonEntitySelect(t){this.selectedButtonEntityId=t,this.applyEntityDefaults(t)}handleSupportInput(t,e){const i=e.trim();t===1?(this.supportSearch1=e,this.showSupportList1=!!i,i||(this.supportEntity1="")):(this.supportSearch2=e,this.showSupportList2=!!i,i||(this.supportEntity2=""))}handleSupportSelect(t,e){const i=e.name||e.id;t===1?(this.supportEntity1=e.id,this.supportSearch1=i,this.showSupportList1=!1):(this.supportEntity2=e.id,this.supportSearch2=i,this.showSupportList2=!1)}getSupportInputValue(t,e){if(t)return t;if(!e)return"";const i=this.getEntities()[e];return i&&this.getAttributeValue(i,"friendly_name")||e}getAttributeValue(t,e){var s;const i=(s=t.attributes)==null?void 0:s[e];return i==null?"":String(i)}handleSave(){const t=this.currentTab==="entity"?this.selectedEntityId:this.selectedButtonEntityId;if(!t){window.alert("Vyberte entitu");return}const e={top_right:this.supportEntity1||void 0,bottom_right:this.supportEntity2||void 0},i={type:this.currentTab,entity_id:t,label:this.label||void 0,icon:this.icon||void 0,color:this.color||void 0,action:this.currentTab==="button"?this.action:void 0,support_entities:e};this.dispatchEvent(new CustomEvent("tile-saved",{detail:{index:this.tileIndex,side:this.tileSide,config:i},bubbles:!0,composed:!0})),this.handleClose()}onIconSelected(t){var e;this.icon=((e=t.detail)==null?void 0:e.icon)||"",this.iconPickerOpen=!1}renderEntityList(t,e,i,s){const o=this.getEntityItems(t,e);return o.length===0?l`<div class="support-empty">Žádné entity nenalezeny</div>`:l`
      ${o.map(a=>l`
        <div
          class="entity-item ${i===a.id?"selected":""}"
          @click=${()=>s(a.id)}
        >
          <div class="entity-icon">${this.getDisplayIcon(a.icon)}</div>
          <div class="entity-meta">
            <div class="entity-name">${a.name}</div>
            <div class="entity-sub">
              <span>${a.id}</span>
              <span>${a.value} ${a.unit}</span>
            </div>
          </div>
        </div>
      `)}
    `}renderSupportList(t,e){const i=this.getSupportEntities(t);return i.length===0?l`<div class="support-empty">Žádné entity nenalezeny</div>`:l`
      ${i.map(s=>l`
        <div
          class="support-item"
          @mousedown=${()=>this.handleSupportSelect(e,s)}
        >
          <div class="support-name">${s.name}</div>
          <div class="support-value">${s.value} ${s.unit}</div>
        </div>
      `)}
    `}renderEntityTab(){return l`
      <div class="form-group">
        <label>Vyberte hlavní entitu:</label>
        <input
          class="input"
          type="text"
          placeholder="🔍 Hledat entitu..."
          .value=${this.entitySearchText}
          @input=${t=>{this.entitySearchText=t.target.value}}
        />
      </div>

      <div class="entity-list">
        ${this.renderEntityList(["sensor.","binary_sensor."],this.entitySearchText,this.selectedEntityId,t=>this.handleEntitySelect(t))}
      </div>

      <div class="form-group">
        <label>Vlastní popisek (volitelné):</label>
        <input
          class="input"
          type="text"
          placeholder="Např. Lednice v garáži"
          .value=${this.label}
          @input=${t=>{this.label=t.target.value}}
        />
      </div>

      <div class="row">
        <div class="form-group">
          <label>Ikona (volitelné):</label>
          <div class="icon-input">
            <button class="icon-preview" type="button" @click=${()=>{this.iconPickerOpen=!0}}>
              ${this.getDisplayIcon(this.icon||"")}
            </button>
            <input
              class="input icon-field"
              type="text"
              .value=${this.icon}
              readonly
              placeholder="Klikni na ikonu..."
            />
            <button class="icon-btn" type="button" @click=${()=>{this.iconPickerOpen=!0}}>📋</button>
          </div>
        </div>

        <div class="form-group">
          <label>Barva:</label>
          <input
            class="color-input"
            type="color"
            .value=${this.color}
            @input=${t=>{this.color=t.target.value}}
          />
        </div>
      </div>

      <div class="divider"></div>

      <div class="form-group support-field">
        <label>🔹 Podpůrná entita 1 (pravý horní roh, volitelné):</label>
        <input
          class="input"
          type="text"
          placeholder="🔍 Hledat entitu nebo ponechat prázdné..."
          .value=${this.getSupportInputValue(this.supportSearch1,this.supportEntity1)}
          @input=${t=>{this.handleSupportInput(1,t.target.value)}}
          @focus=${()=>{this.supportSearch1.trim()&&(this.showSupportList1=!0)}}
          @blur=${()=>{this.showSupportList1=!1}}
        />
        ${this.showSupportList1?l`
          <div class="support-list">
            ${this.renderSupportList(this.supportSearch1,1)}
          </div>
        `:null}
      </div>

      <div class="form-group support-field">
        <label>🔹 Podpůrná entita 2 (pravý dolní roh, volitelné):</label>
        <input
          class="input"
          type="text"
          placeholder="🔍 Hledat entitu nebo ponechat prázdné..."
          .value=${this.getSupportInputValue(this.supportSearch2,this.supportEntity2)}
          @input=${t=>{this.handleSupportInput(2,t.target.value)}}
          @focus=${()=>{this.supportSearch2.trim()&&(this.showSupportList2=!0)}}
          @blur=${()=>{this.showSupportList2=!1}}
        />
        ${this.showSupportList2?l`
          <div class="support-list">
            ${this.renderSupportList(this.supportSearch2,2)}
          </div>
        `:null}
      </div>
    `}renderButtonTab(){return l`
      <div class="form-group">
        <label>Akce:</label>
        <select
          .value=${this.action}
          @change=${t=>{this.action=t.target.value}}
        >
          <option value="toggle">Přepnout (Toggle)</option>
          <option value="turn_on">Zapnout</option>
          <option value="turn_off">Vypnout</option>
        </select>
      </div>

      <div class="form-group">
        <label>Vyberte entitu pro tlačítko:</label>
        <input
          class="input"
          type="text"
          placeholder="🔍 Hledat entitu..."
          .value=${this.buttonSearchText}
          @input=${t=>{this.buttonSearchText=t.target.value}}
        />
      </div>

      <div class="entity-list">
        ${this.renderEntityList(["switch.","light.","fan.","input_boolean."],this.buttonSearchText,this.selectedButtonEntityId,t=>this.handleButtonEntitySelect(t))}
      </div>

      <div class="form-group">
        <label>Popisek:</label>
        <input
          class="input"
          type="text"
          placeholder="Světlo obývák"
          .value=${this.label}
          @input=${t=>{this.label=t.target.value}}
        />
      </div>

      <div class="row">
        <div class="form-group">
          <label>Ikona:</label>
          <div class="icon-input">
            <button class="icon-preview" type="button" @click=${()=>{this.iconPickerOpen=!0}}>
              ${this.getDisplayIcon(this.icon||"")}
            </button>
            <input
              class="input icon-field"
              type="text"
              .value=${this.icon}
              readonly
              placeholder="Klikni na ikonu..."
            />
            <button class="icon-btn" type="button" @click=${()=>{this.iconPickerOpen=!0}}>📋</button>
          </div>
        </div>

        <div class="form-group">
          <label>Barva:</label>
          <input
            class="color-input"
            type="color"
            .value=${this.color}
            @input=${t=>{this.color=t.target.value}}
          />
        </div>
      </div>

      <div class="divider"></div>

      <div class="form-group support-field">
        <label>🔹 Podpůrná entita 1 (pravý horní roh, volitelné):</label>
        <input
          class="input"
          type="text"
          placeholder="🔍 Hledat entitu nebo ponechat prázdné..."
          .value=${this.getSupportInputValue(this.supportSearch1,this.supportEntity1)}
          @input=${t=>{this.handleSupportInput(1,t.target.value)}}
          @focus=${()=>{this.supportSearch1.trim()&&(this.showSupportList1=!0)}}
          @blur=${()=>{this.showSupportList1=!1}}
        />
        ${this.showSupportList1?l`
          <div class="support-list">
            ${this.renderSupportList(this.supportSearch1,1)}
          </div>
        `:null}
      </div>

      <div class="form-group support-field">
        <label>🔹 Podpůrná entita 2 (pravý dolní roh, volitelné):</label>
        <input
          class="input"
          type="text"
          placeholder="🔍 Hledat entitu nebo ponechat prázdné..."
          .value=${this.getSupportInputValue(this.supportSearch2,this.supportEntity2)}
          @input=${t=>{this.handleSupportInput(2,t.target.value)}}
          @focus=${()=>{this.supportSearch2.trim()&&(this.showSupportList2=!0)}}
          @blur=${()=>{this.showSupportList2=!1}}
        />
        ${this.showSupportList2?l`
          <div class="support-list">
            ${this.renderSupportList(this.supportSearch2,2)}
          </div>
        `:null}
      </div>
    `}render(){return this.isOpen?l`
      <div class="overlay" @click=${t=>{t.target===t.currentTarget&&this.handleClose()}}>
        <div class="dialog" @click=${t=>t.stopPropagation()}>
          <div class="header">
            <div class="title">Konfigurace dlaždice</div>
            <button class="close-btn" type="button" @click=${this.handleClose} aria-label="Zavřít">×</button>
          </div>

          <div class="tabs">
            <button
              class="tab-btn ${this.currentTab==="entity"?"active":""}"
              type="button"
              @click=${()=>{this.currentTab="entity"}}
            >📊 Entity</button>
            <button
              class="tab-btn ${this.currentTab==="button"?"active":""}"
              type="button"
              @click=${()=>{this.currentTab="button",this.color==="#03A9F4"&&(this.color="#FFC107")}}
            >🔘 Tlačítko</button>
          </div>

          <div class="content">
            <div class="tab-content ${this.currentTab==="entity"?"active":""}">
              ${this.renderEntityTab()}
            </div>
            <div class="tab-content ${this.currentTab==="button"?"active":""}">
              ${this.renderButtonTab()}
            </div>
          </div>

          <div class="footer">
            <button class="btn btn-secondary" type="button" @click=${this.handleClose}>Zrušit</button>
            <button class="btn btn-primary" type="button" @click=${this.handleSave}>Uložit</button>
          </div>
        </div>
      </div>

      <oig-icon-picker
        ?open=${this.iconPickerOpen}
        @icon-selected=${this.onIconSelected}
        @close=${()=>{this.iconPickerOpen=!1}}
      ></oig-icon-picker>
    `:null}};Z.styles=_`
    :host {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      font-family: ${k(r.fontFamily)};
    }

    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${k(r.bgPrimary)} 35%, transparent);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .dialog {
      width: min(520px, 100%);
      max-height: 85vh;
      background: ${k(r.cardBg)};
      border: 1px solid ${k(r.divider)};
      border-radius: 16px;
      box-shadow: ${k(r.cardShadow)};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: translateY(6px) scale(0.99);
      transition: transform 0.2s ease;
    }

    :host([open]) .dialog {
      transform: translateY(0) scale(1);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px 12px;
      border-bottom: 1px solid ${k(r.divider)};
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${k(r.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${k(r.bgSecondary)};
      color: ${k(r.textPrimary)};
      width: 30px;
      height: 30px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 16px;
      display: grid;
      place-items: center;
      transition: background 0.2s ease, transform 0.2s ease;
    }

    .close-btn:hover {
      background: ${k(r.divider)};
      transform: scale(1.05);
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 18px;
      background: ${k(r.bgSecondary)};
      border-bottom: 1px solid ${k(r.divider)};
    }

    .tab-btn {
      border: 1px solid transparent;
      background: ${k(r.cardBg)};
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: ${k(r.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: border 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }

    .tab-btn.active {
      border-color: ${k(r.accent)};
      color: ${k(r.textPrimary)};
      transform: translateY(-1px);
    }

    .content {
      padding: 16px 18px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    label {
      font-size: 12px;
      color: ${k(r.textSecondary)};
      font-weight: 600;
    }

    .input,
    select,
    .color-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${k(r.divider)};
      background: ${k(r.bgPrimary)};
      color: ${k(r.textPrimary)};
      font-size: 12px;
      outline: none;
      transition: border 0.2s ease, box-shadow 0.2s ease;
    }

    .input::placeholder {
      color: ${k(r.textSecondary)};
    }

    .input:focus,
    select:focus,
    .color-input:focus {
      border-color: ${k(r.accent)};
      box-shadow: 0 0 0 2px color-mix(in srgb, ${k(r.accent)} 20%, transparent);
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 120px;
      gap: 12px;
      align-items: end;
    }

    .icon-input {
      display: grid;
      grid-template-columns: 46px 1fr auto;
      gap: 8px;
      align-items: center;
    }

    .icon-preview {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      border: 1px dashed ${k(r.divider)};
      display: grid;
      place-items: center;
      font-size: 22px;
      cursor: pointer;
      background: ${k(r.bgSecondary)};
      transition: border 0.2s ease, transform 0.2s ease;
    }

    .icon-preview:hover {
      border-color: ${k(r.accent)};
      transform: translateY(-1px);
    }

    .icon-field {
      font-size: 11px;
    }

    .icon-btn {
      border: none;
      background: ${k(r.bgSecondary)};
      color: ${k(r.textPrimary)};
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .divider {
      height: 1px;
      background: ${k(r.divider)};
      margin: 6px 0;
      opacity: 0.8;
    }

    .entity-list {
      border: 1px solid ${k(r.divider)};
      border-radius: 12px;
      overflow: hidden;
      max-height: 200px;
      overflow-y: auto;
      background: ${k(r.bgPrimary)};
    }

    .entity-item {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid ${k(r.divider)};
      cursor: pointer;
      align-items: center;
      transition: background 0.2s ease;
    }

    .entity-item:last-child {
      border-bottom: none;
    }

    .entity-item:hover {
      background: ${k(r.bgSecondary)};
    }

    .entity-item.selected {
      background: color-mix(in srgb, ${k(r.accent)} 16%, transparent);
      border-left: 3px solid ${k(r.accent)};
      padding-left: 9px;
    }

    .entity-icon {
      font-size: 20px;
      line-height: 1;
      text-align: center;
    }

    .entity-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .entity-name {
      font-size: 12px;
      color: ${k(r.textPrimary)};
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-sub {
      font-size: 10px;
      color: ${k(r.textSecondary)};
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    .support-field {
      position: relative;
    }

    .support-list {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      background: ${k(r.cardBg)};
      border: 1px solid ${k(r.divider)};
      border-radius: 12px;
      z-index: 10;
      max-height: 180px;
      overflow-y: auto;
      box-shadow: ${k(r.cardShadow)};
    }

    .support-item {
      padding: 10px 12px;
      border-bottom: 1px solid ${k(r.divider)};
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: background 0.2s ease;
    }

    .support-item:last-child {
      border-bottom: none;
    }

    .support-item:hover {
      background: ${k(r.bgSecondary)};
    }

    .support-name {
      font-size: 12px;
      color: ${k(r.textPrimary)};
      font-weight: 600;
    }

    .support-value {
      font-size: 10px;
      color: ${k(r.textSecondary)};
    }

    .support-empty {
      padding: 12px;
      font-size: 11px;
      color: ${k(r.textSecondary)};
      text-align: center;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px 18px;
      border-top: 1px solid ${k(r.divider)};
      background: ${k(r.bgSecondary)};
    }

    .btn {
      border: none;
      border-radius: 12px;
      padding: 10px 16px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .btn-secondary {
      background: ${k(r.bgPrimary)};
      color: ${k(r.textPrimary)};
      border: 1px solid ${k(r.divider)};
    }

    .btn-primary {
      background: ${k(r.accent)};
      color: #fff;
      box-shadow: 0 6px 14px color-mix(in srgb, ${k(r.accent)} 40%, transparent);
    }

    .btn:hover {
      transform: translateY(-1px);
    }

    .tab-content {
      display: none;
      flex-direction: column;
      gap: 14px;
    }

    .tab-content.active {
      display: flex;
    }
  `;J([u({type:Boolean,reflect:!0,attribute:"open"})],Z.prototype,"isOpen",2);J([u({type:Number})],Z.prototype,"tileIndex",2);J([u({attribute:!1})],Z.prototype,"tileSide",2);J([u({attribute:!1})],Z.prototype,"existingConfig",2);J([v()],Z.prototype,"currentTab",2);J([v()],Z.prototype,"entitySearchText",2);J([v()],Z.prototype,"buttonSearchText",2);J([v()],Z.prototype,"selectedEntityId",2);J([v()],Z.prototype,"selectedButtonEntityId",2);J([v()],Z.prototype,"label",2);J([v()],Z.prototype,"icon",2);J([v()],Z.prototype,"color",2);J([v()],Z.prototype,"action",2);J([v()],Z.prototype,"supportEntity1",2);J([v()],Z.prototype,"supportEntity2",2);J([v()],Z.prototype,"supportSearch1",2);J([v()],Z.prototype,"supportSearch2",2);J([v()],Z.prototype,"showSupportList1",2);J([v()],Z.prototype,"showSupportList2",2);J([v()],Z.prototype,"iconPickerOpen",2);Z=J([C("oig-tile-dialog")],Z);var Er=Object.defineProperty,Mr=Object.getOwnPropertyDescriptor,L=(t,e,i,s)=>{for(var o=s>1?void 0:s?Mr(e,i):e,a=t.length-1,n;a>=0;a--)(n=t[a])&&(o=(s?n(e,i,o):n(o))||o);return s&&o&&Er(e,i,o),o};const ut=j,Do=new URLSearchParams(window.location.search),Yt=Do.get("sn")||Do.get("inverter_sn")||"2206237016",zr=`sensor.oig_${Yt}_`,Or=[{id:"flow",label:"Toky",icon:"⚡"},{id:"pricing",label:"Ceny",icon:"💰"},{id:"boiler",label:"Bojler",icon:"🔥"}];let D=class extends S{constructor(){super(...arguments),this.hass=null,this.loading=!0,this.error=null,this.activeTab="flow",this.editMode=!1,this.time="",this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1,this.flowData=Fi,this.pricingData=null,this.pricingLoading=!1,this.boilerState=null,this.boilerLoading=!1,this.boilerPlan=null,this.boilerEnergyBreakdown=null,this.boilerPredictedUsage=null,this.boilerConfig=null,this.boilerHeatmap7x24=[],this.boilerProfiling=null,this.boilerCurrentCategory="",this.boilerAvailableCategories=[],this.boilerForecastWindows={fve:"--",grid:"--"},this.boilerRefreshTimer=null,this.analyticsData=bo,this.chmuData=Pe,this.chmuModalOpen=!1,this.timelineTab="today",this.timelineData=null,this.tilesConfig=null,this.tilesLeft=[],this.tilesRight=[],this.tileDialogOpen=!1,this.editingTileIndex=-1,this.editingTileSide="left",this.editingTileConfig=null,this.entityStore=null,this.timeInterval=null,this.stateWatcherUnsub=null,this.tileEntityUnsubs=[],this.throttledUpdateFlow=wo(()=>this.updateFlowData(),500),this.throttledUpdateSensors=wo(()=>this.updateSensorData(),1e3)}connectedCallback(){super.connectedCallback(),this.initApp(),this.startTimeUpdate()}disconnectedCallback(){super.disconnectedCallback(),this.cleanup()}updated(t){t.has("activeTab")&&(this.activeTab==="pricing"&&!this.pricingData&&this.loadPricingData(),this.activeTab==="pricing"&&this.analyticsData===bo&&this.loadAnalyticsAsync(),this.activeTab==="pricing"&&!this.timelineData&&this.loadTimelineTabData(this.timelineTab),this.activeTab==="boiler"&&!this.boilerState&&this.loadBoilerDataAsync())}async initApp(){try{const t=await tt.getHass();if(!t)throw new Error("Cannot access Home Assistant context");this.hass=t,this.entityStore=Xs(t,Yt),await Xt.start({getHass:()=>tt.getHassSync(),prefixes:[zr]}),this.stateWatcherUnsub=Xt.onEntityChange((e,i)=>{this.throttledUpdateFlow(),this.throttledUpdateSensors()}),q.start(),this.updateFlowData(),this.updateSensorData(),this.loadPricingData(),this.loadBoilerDataAsync(),this.loadAnalyticsAsync(),this.loadTilesAsync(),this.loading=!1,b.info("App initialized",{entities:Object.keys(t.states||{}).length,inverterSn:Yt})}catch(t){this.error=t.message,this.loading=!1,b.error("App init failed",t)}}cleanup(){var t,e;(t=this.stateWatcherUnsub)==null||t.call(this),this.stateWatcherUnsub=null,Xt.stop(),q.stop(),this.tileEntityUnsubs.forEach(i=>i()),this.tileEntityUnsubs=[],(e=this.entityStore)==null||e.destroy(),this.entityStore=null,this.timeInterval!==null&&(clearInterval(this.timeInterval),this.timeInterval=null),this.boilerRefreshTimer!==null&&(clearInterval(this.boilerRefreshTimer),this.boilerRefreshTimer=null)}updateFlowData(){if(this.hass)try{this.flowData=da(this.hass)}catch(t){b.error("Failed to extract flow data",t)}}updateSensorData(){if(this.chmuData=Xa(Yt),this.tilesConfig){const t=_e(this.tilesConfig);this.tilesLeft=t.left,this.tilesRight=t.right}}updateTilesImmediate(){if(!this.tilesConfig)return;const t=_e(this.tilesConfig);this.tilesLeft=t.left,this.tilesRight=t.right}subscribeTileEntities(){if(this.tileEntityUnsubs.forEach(e=>e()),this.tileEntityUnsubs=[],!this.tilesConfig||!this.entityStore)return;const t=new Set;[...this.tilesConfig.tiles_left,...this.tilesConfig.tiles_right].forEach(e=>{var i,s;e&&(t.add(e.entity_id),(i=e.support_entities)!=null&&i.top_right&&t.add(e.support_entities.top_right),(s=e.support_entities)!=null&&s.bottom_right&&t.add(e.support_entities.bottom_right))});for(const e of t){const i=this.entityStore.subscribe(e,()=>{this.updateTilesImmediate()});this.tileEntityUnsubs.push(i)}}async loadPricingData(){if(!(!this.hass||this.pricingLoading)){this.pricingLoading=!0;try{const t=await ke(()=>Pa(this.hass));this.pricingData=t}catch(t){b.error("Failed to load pricing data",t)}finally{this.pricingLoading=!1}}}async loadBoilerDataAsync(){if(!(!this.hass||this.boilerLoading)){this.boilerLoading=!0;try{const t=await ke(()=>qa(this.hass));this.boilerState=t.state,this.boilerPlan=t.plan,this.boilerEnergyBreakdown=t.energyBreakdown,this.boilerPredictedUsage=t.predictedUsage,this.boilerConfig=t.config,this.boilerHeatmap7x24=t.heatmap7x24,this.boilerProfiling=t.profiling,this.boilerCurrentCategory=t.currentCategory,this.boilerAvailableCategories=t.availableCategories,this.boilerForecastWindows=t.forecastWindows,this.boilerRefreshTimer||(this.boilerRefreshTimer=window.setInterval(()=>this.loadBoilerDataAsync(),5*60*1e3))}catch(t){b.error("Failed to load boiler data",t)}finally{this.boilerLoading=!1}}}async loadAnalyticsAsync(){try{this.analyticsData=await ke(()=>Ya(Yt))}catch(t){b.error("Failed to load analytics",t)}}async loadTilesAsync(){try{this.tilesConfig=await ke(()=>sn());const t=_e(this.tilesConfig);this.tilesLeft=t.left,this.tilesRight=t.right,this.subscribeTileEntities()}catch(t){b.error("Failed to load tiles config",t)}}async loadTimelineTabData(t){try{this.timelineData=await ke(()=>en(Yt,t))}catch(e){b.error(`Failed to load timeline tab: ${t}`,e)}}startTimeUpdate(){const t=()=>{this.time=new Date().toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})};t(),this.timeInterval=window.setInterval(t,1e3)}onTabChange(t){this.activeTab=t.detail.tabId}onGridChargingOpen(){var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector("oig-grid-charging-dialog");t==null||t.show()}onEditClick(){this.editMode=!this.editMode}onResetClick(){var i,s;const t=(i=this.shadowRoot)==null?void 0:i.querySelector("oig-flow-canvas");t!=null&&t.resetLayout&&t.resetLayout();const e=(s=this.shadowRoot)==null?void 0:s.querySelector("oig-grid");e&&e.resetLayout()}onToggleLeftPanel(){this.leftPanelCollapsed=!this.leftPanelCollapsed}onToggleRightPanel(){this.rightPanelCollapsed=!this.rightPanelCollapsed}onChmuBadgeClick(){this.chmuModalOpen=!0}onChmuModalClose(){this.chmuModalOpen=!1}onTimelineTabChange(t){this.timelineTab=t.detail.tab,this.loadTimelineTabData(t.detail.tab)}onTimelineRefresh(){this.loadTimelineTabData(this.timelineTab)}onBoilerCategoryChange(t){const e=t.detail.category;this.boilerCurrentCategory=e,this.loadBoilerDataAsync()}onEditTile(t){const{entityId:e}=t.detail;let i=-1,s="left",o=null;if(this.tilesConfig){const a=this.tilesConfig.tiles_left.findIndex(n=>n&&n.entity_id===e);if(a>=0)i=a,s="left",o=this.tilesConfig.tiles_left[a];else{const n=this.tilesConfig.tiles_right.findIndex(c=>c&&c.entity_id===e);n>=0&&(i=n,s="right",o=this.tilesConfig.tiles_right[n])}}this.editingTileIndex=i,this.editingTileSide=s,this.editingTileConfig=o,this.tileDialogOpen=!0,o&&requestAnimationFrame(()=>{var n;const a=(n=this.shadowRoot)==null?void 0:n.querySelector("oig-tile-dialog");a==null||a.loadTileConfig(o)})}onDeleteTile(t){const{entityId:e}=t.detail;if(!this.tilesConfig||!e)return;const i={...this.tilesConfig};i.tiles_left=i.tiles_left.map(o=>o&&o.entity_id===e?null:o),i.tiles_right=i.tiles_right.map(o=>o&&o.entity_id===e?null:o),this.tilesConfig=i;const s=_e(i);this.tilesLeft=s.left,this.tilesRight=s.right,xo(i),this.subscribeTileEntities()}onTileSaved(t){const{index:e,side:i,config:s}=t.detail;if(!this.tilesConfig)return;const o={...this.tilesConfig},a=i==="left"?[...o.tiles_left]:[...o.tiles_right];if(e>=0&&e<a.length)a[e]=s;else{const c=a.findIndex(d=>d===null);c>=0?a[c]=s:a.push(s)}i==="left"?o.tiles_left=a:o.tiles_right=a,this.tilesConfig=o;const n=_e(o);this.tilesLeft=n.left,this.tilesRight=n.right,xo(o),this.subscribeTileEntities()}onTileDialogClose(){this.tileDialogOpen=!1,this.editingTileConfig=null,this.editingTileIndex=-1}render(){var e;if(this.loading)return l`<div class="loading"><div class="spinner"></div><span>Načítání...</span></div>`;if(this.error)return l`
        <div class="error">
          <h2>Chyba připojení</h2>
          <p>${this.error}</p>
          <button @click=${()=>{this.error=null,this.loading=!0,this.initApp()}}>Zkusit znovu</button>
        </div>
      `;const t=this.chmuData.effectiveSeverity>0?this.chmuData.warningsCount:0;return l`
      <oig-theme-provider>
        <oig-header
          title="Energetické Toky"
          .time=${this.time}
          .showStatus=${!0}
          .alertCount=${t}
          .leftPanelCollapsed=${this.leftPanelCollapsed}
          .rightPanelCollapsed=${this.rightPanelCollapsed}
          @edit-click=${this.onEditClick}
          @reset-click=${this.onResetClick}
          @status-click=${this.onChmuBadgeClick}
          @toggle-left-panel=${this.onToggleLeftPanel}
          @toggle-right-panel=${this.onToggleRightPanel}
        >
        </oig-header>

        <oig-tabs
          .tabs=${Or}
          .activeTab=${this.activeTab}
          @tab-change=${this.onTabChange}
        ></oig-tabs>

        <main>
          <oig-grid .editable=${this.editMode}>
            <!-- ===== FLOW TAB ===== -->
            <div class="tab-content ${this.activeTab==="flow"?"active":""}">
              <div class="flow-layout">
                <!-- Tiles: sloupec vlevo -->
                <div class="flow-tiles-stack">
                  <oig-tiles-container
                    .tiles=${[...this.tilesLeft,...this.tilesRight]}
                    .editMode=${this.editMode}
                    @edit-tile=${this.onEditTile}
                    @delete-tile=${this.onDeleteTile}
                  ></oig-tiles-container>
                </div>

                <!-- Canvas: střed -->
                <div class="flow-center">
                  <oig-flow-canvas
                    .data=${this.flowData}
                    particlesEnabled
                    .active=${this.activeTab==="flow"}
                    .editMode=${this.editMode}
                    @oig-grid-charging-open=${this.onGridChargingOpen}
                  ></oig-flow-canvas>
                </div>

                <!-- Ovládací panel: pravý sloupec -->
                <div class="flow-control">
                  <oig-control-panel></oig-control-panel>
                </div>
              </div>
            </div>

            <!-- ===== PRICING TAB ===== -->
            <div class="tab-content ${this.activeTab==="pricing"?"active":""}">
              <div class="pricing-layout">
                ${this.pricingLoading?l`
                  <div class="tab-loading-overlay">
                    <div class="spinner spinner--small"></div>
                    <span>Načítání cen...</span>
                  </div>
                `:E}
                <oig-pricing-stats ?topOnly=${!0} .data=${this.pricingData}></oig-pricing-stats>
                <oig-pricing-chart .data=${this.pricingData}></oig-pricing-chart>

                <div class="below-chart-pair">
                  <oig-pricing-stats .data=${this.pricingData}></oig-pricing-stats>
                  <oig-timeline-tile
                    .data=${this.timelineData}
                    .activeTab=${this.timelineTab}
                    @tab-change=${this.onTimelineTabChange}
                    @refresh=${this.onTimelineRefresh}
                  ></oig-timeline-tile>
                </div>

                <div class="analytics-row">
                  <oig-analytics-block title="Účinnost baterie" icon="⚡">
                    <oig-battery-efficiency .data=${this.analyticsData.efficiency}></oig-battery-efficiency>
                  </oig-analytics-block>

                  <oig-battery-health .data=${this.analyticsData.health}></oig-battery-health>

                  <oig-battery-balancing .data=${this.analyticsData.balancing}></oig-battery-balancing>

                  <oig-cost-comparison .data=${this.analyticsData.costComparison}></oig-cost-comparison>
                </div>
              </div>
            </div>

            <!-- ===== BOILER TAB ===== -->
            <div class="tab-content boiler-layout ${this.activeTab==="boiler"?"active":""}" style="position:relative">
              ${this.boilerLoading?l`
                <div class="tab-loading-overlay">
                  <div class="spinner spinner--small"></div>
                  <span>Načítání bojleru...</span>
                </div>
              `:E}

              <!-- State header (current temp + heating dot) -->
              <oig-boiler-state .state=${this.boilerState}></oig-boiler-state>

              <!-- Status grid (7 cards) -->
              <oig-boiler-status-grid .data=${this.boilerState}></oig-boiler-status-grid>

              <!-- Energy breakdown + ratio bar -->
              <oig-boiler-energy-breakdown .data=${this.boilerEnergyBreakdown}></oig-boiler-energy-breakdown>

              <!-- Predicted usage (5 items) -->
              <oig-boiler-predicted-usage .data=${this.boilerPredictedUsage}></oig-boiler-predicted-usage>

              <!-- Plan info (9 rows) -->
              <oig-boiler-plan-info
                .plan=${this.boilerPlan}
                .forecastWindows=${this.boilerForecastWindows}
              ></oig-boiler-plan-info>

              <!-- Visual section: Tank + Profiling side by side -->
              <div class="boiler-visual-grid" style="display:grid; grid-template-columns: 1fr 2fr; gap:16px;">
                <!-- Tank thermometer -->
                <oig-boiler-tank
                  .boilerState=${this.boilerState}
                  .targetTemp=${((e=this.boilerConfig)==null?void 0:e.targetTempC)??60}
                ></oig-boiler-tank>

                <div>
                  <!-- Category selector -->
                  <oig-boiler-category-select
                    .current=${this.boilerCurrentCategory}
                    .available=${this.boilerAvailableCategories}
                    @category-change=${this.onBoilerCategoryChange}
                  ></oig-boiler-category-select>

                  <!-- Profiling (CSS bar chart + stats) -->
                  <oig-boiler-profiling .data=${this.boilerProfiling}></oig-boiler-profiling>
                </div>
              </div>

              <!-- 7x24 heatmap grid -->
              <oig-boiler-heatmap-grid .data=${this.boilerHeatmap7x24}></oig-boiler-heatmap-grid>

              <!-- Stats cards (4 large) -->
              <oig-boiler-stats-cards .plan=${this.boilerPlan}></oig-boiler-stats-cards>

              <!-- Config section (6 cards) -->
              <oig-boiler-config-section .config=${this.boilerConfig}></oig-boiler-config-section>
            </div>
          </oig-grid>
        </main>

        <!-- ===== GLOBAL OVERLAYS ===== -->
        <oig-chmu-modal
          ?open=${this.chmuModalOpen}
          .data=${this.chmuData}
          @close=${this.onChmuModalClose}
        ></oig-chmu-modal>

        <oig-tile-dialog
          ?open=${this.tileDialogOpen}
          .tileIndex=${this.editingTileIndex}
          .tileSide=${this.editingTileSide}
          .existingConfig=${this.editingTileConfig}
          @tile-saved=${this.onTileSaved}
          @close=${this.onTileDialogClose}
        ></oig-tile-dialog>

        <oig-grid-charging-dialog
          .data=${this.flowData.gridChargingPlan}
        ></oig-grid-charging-dialog>
      </oig-theme-provider>
    `}};D.styles=_`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      font-family: ${ut(r.fontFamily)};
      color: ${ut(r.textPrimary)};
      background: ${ut(r.bgPrimary)};
    }

    /* ---- Loading & Error ---- */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 12px;
      font-size: 14px;
      color: ${ut(r.textSecondary)};
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid ${ut(r.divider)};
      border-top-color: ${ut(r.accent)};
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner--small {
      width: 14px;
      height: 14px;
      border-width: 2px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error {
      padding: 20px;
      color: ${ut(r.error)};
      text-align: center;
      animation: fadeIn 0.3s ease;
    }

    .error h2 {
      margin-bottom: 8px;
    }

    .error button {
      margin-top: 12px;
      padding: 8px 16px;
      background: ${ut(r.accent)};
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }

    .error button:hover { opacity: 0.9; }

    /* ---- Main layout ---- */
    main {
      flex: 1;
      overflow: auto;
      padding: 16px;
      background: ${ut(r.bgSecondary)};
    }

    .tab-content {
      display: none;
      grid-column: 1 / -1;
    }

    .tab-content.active {
      display: block;
      animation: fadeIn 0.25s ease;
    }

    .tab-content.boiler-layout.active {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ---- Flow tab layout: tiles | canvas | control ---- */
    .flow-layout {
      display: grid;
      grid-template-columns: 200px 1fr 300px;
      grid-template-areas: 'tiles canvas control';
      gap: 12px;
      width: 100%;
      align-items: start;
    }

    .flow-tiles-stack {
      grid-area: tiles;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }

    .flow-center {
      grid-area: canvas;
      min-width: 0;
    }

    .flow-control {
      grid-area: control;
      min-width: 0;
    }

    /* ---- Pricing tab layout ---- */
    .pricing-layout {
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
    }

    .tab-loading-overlay {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: ${ut(r.cardBg)};
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      font-size: 12px;
      color: ${ut(r.textSecondary)};
      z-index: 10;
      animation: fadeIn 0.2s ease;
    }

    .analytics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }

    .below-chart-pair {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 12px;
    }

    /* ---- Animations ---- */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ---- Reduced motion ---- */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* ---- Responsive ---- */
    /* Tablet 768–1200: canvas + control, tiles skryté nebo nahoře */
    @media (max-width: 1200px) {
      .flow-layout {
        grid-template-columns: 160px 1fr 260px;
        gap: 8px;
      }
    }

    /* Mobile <768: Single column */
    @media (max-width: 768px) {
      .flow-layout {
        grid-template-columns: 1fr;
        grid-template-areas:
          'canvas'
          'control'
          'tiles';
        gap: 8px;
      }
      .analytics-row {
        grid-template-columns: 1fr;
      }
      .below-chart-pair {
        grid-template-columns: 1fr;
      }
      .boiler-visual-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `;L([u({type:Object})],D.prototype,"hass",2);L([v()],D.prototype,"loading",2);L([v()],D.prototype,"error",2);L([v()],D.prototype,"activeTab",2);L([v()],D.prototype,"editMode",2);L([v()],D.prototype,"time",2);L([v()],D.prototype,"leftPanelCollapsed",2);L([v()],D.prototype,"rightPanelCollapsed",2);L([v()],D.prototype,"flowData",2);L([v()],D.prototype,"pricingData",2);L([v()],D.prototype,"pricingLoading",2);L([v()],D.prototype,"boilerState",2);L([v()],D.prototype,"boilerLoading",2);L([v()],D.prototype,"boilerPlan",2);L([v()],D.prototype,"boilerEnergyBreakdown",2);L([v()],D.prototype,"boilerPredictedUsage",2);L([v()],D.prototype,"boilerConfig",2);L([v()],D.prototype,"boilerHeatmap7x24",2);L([v()],D.prototype,"boilerProfiling",2);L([v()],D.prototype,"boilerCurrentCategory",2);L([v()],D.prototype,"boilerAvailableCategories",2);L([v()],D.prototype,"boilerForecastWindows",2);L([v()],D.prototype,"analyticsData",2);L([v()],D.prototype,"chmuData",2);L([v()],D.prototype,"chmuModalOpen",2);L([v()],D.prototype,"timelineTab",2);L([v()],D.prototype,"timelineData",2);L([v()],D.prototype,"tilesConfig",2);L([v()],D.prototype,"tilesLeft",2);L([v()],D.prototype,"tilesRight",2);L([v()],D.prototype,"tileDialogOpen",2);L([v()],D.prototype,"editingTileIndex",2);L([v()],D.prototype,"editingTileSide",2);L([v()],D.prototype,"editingTileConfig",2);D=L([C("oig-app")],D);b.info("V2 starting",{version:"2.0.0"});Us();async function Ar(){try{const t=await qs(),e=document.getElementById("app");e&&(e.innerHTML="",e.appendChild(t)),b.info("V2 mounted successfully")}catch(t){b.error("V2 bootstrap failed",t);const e=document.getElementById("app");e&&(e.innerHTML=`
        <div style="padding: 20px; font-family: system-ui;">
          <h2>Chyba načítání</h2>
          <p>Nepodařilo se načíst dashboard. Zkuste obnovit stránku.</p>
          <details>
            <summary>Detaily</summary>
            <pre>${t.message}</pre>
          </details>
        </div>`)}}Ar();
//# sourceMappingURL=index.js.map
