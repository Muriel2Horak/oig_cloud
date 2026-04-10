var Ya=Object.defineProperty;var Ua=(t,e,i)=>e in t?Ya(t,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[e]=i;var _=(t,e,i)=>Ua(t,typeof e!="symbol"?e+"":e,i);import{f as Ga,u as Ka,i as P,a as M,b as d,r as Z,w as Et,A}from"./vendor.js";import{C as Ki,a as En,L as Dn,P as On,b as zn,i as An,p as In,c as Ln,d as Za,T as Qa,e as Xa,B as Ja,f as ts,g as es,h as is,j as rs,k as Bn}from"./charts.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&r(s)}).observe(document,{childList:!0,subtree:!0});function i(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(n){if(n.ep)return;n.ep=!0;const a=i(n);fetch(n.href,a)}})();const Ut="[V2]";function ns(){return new Date().toISOString().substr(11,12)}function yi(t,e){const i=ns(),r=t.toUpperCase().padEnd(5);return`${i} ${r} ${e}`}const y={debug(t,e){typeof window<"u"&&window.OIG_DEBUG&&console.debug(Ut,yi("debug",t),e??"")},info(t,e){console.info(Ut,yi("info",t),e??"")},warn(t,e){console.warn(Ut,yi("warn",t),e??"")},error(t,e,i){const r=e?{error:e.message,stack:e.stack,...i}:i;console.error(Ut,yi("error",t),r??"")},time(t){console.time(`${Ut} ${t}`)},timeEnd(t){console.timeEnd(`${Ut} ${t}`)},group(t){console.group(`${Ut} ${t}`)},groupEnd(){console.groupEnd()}};function as(){window.addEventListener("error",ss),window.addEventListener("unhandledrejection",os),y.debug("Error handling setup complete")}function ss(t){const e=t.error||new Error(t.message);y.error("Uncaught error",e,{filename:t.filename,lineno:t.lineno,colno:t.colno}),t.preventDefault()}function os(t){const e=t.reason instanceof Error?t.reason:new Error(String(t.reason));y.error("Unhandled promise rejection",e),t.preventDefault()}class Fn extends Error{constructor(e,i,r=!1,n){super(e),this.code=i,this.recoverable=r,this.cause=n,this.name="AppError"}}class Le extends Fn{constructor(e="Authentication failed"){super(e,"AUTH_ERROR",!1),this.name="AuthError"}}class jr extends Fn{constructor(e="Network error",i){super(e,"NETWORK_ERROR",!0,i),this.name="NetworkError"}}const ls="oig_v2_";function cs(){var t;try{const e=((t=globalThis.navigator)==null?void 0:t.userAgent)||"";return/Home Assistant|HomeAssistant|HAcompanion/i.test(e)}catch{return!1}}function ds(){var t;try{const e=((t=globalThis.navigator)==null?void 0:t.userAgent)||"",i=/Android|iPhone|iPad|iPod|Mobile/i.test(e),r=globalThis.innerWidth<=768;return i||r}catch{return!1}}const vt={isHaApp:!1,isMobile:!1,reduceMotion:!1};async function us(){var i,r;y.info("Bootstrap starting"),as(),vt.isHaApp=cs(),vt.isMobile=ds(),vt.reduceMotion=vt.isHaApp||vt.isMobile||((r=(i=globalThis.matchMedia)==null?void 0:i.call(globalThis,"(prefers-reduced-motion: reduce)"))==null?void 0:r.matches)||!1;const t=document.documentElement;vt.isHaApp&&t.classList.add("oig-ha-app"),vt.isMobile&&t.classList.add("oig-mobile"),vt.reduceMotion&&t.classList.add("oig-reduce-motion");const e={version:"2.0.0-beta.1",storagePrefix:ls};return y.info("Bootstrap complete",{...e,isHaApp:vt.isHaApp,isMobile:vt.isMobile,reduceMotion:vt.reduceMotion}),document.createElement("oig-app")}const o={bgPrimary:"var(--primary-background-color, #ffffff)",bgSecondary:"var(--secondary-background-color, #f5f5f5)",textPrimary:"var(--primary-text-color, #212121)",textSecondary:"var(--secondary-text-color, #757575)",accent:"var(--accent-color, #03a9f4)",divider:"var(--divider-color, #e0e0e0)",error:"var(--error-color, #db4437)",success:"var(--success-color, #0f9d58)",warning:"var(--warning-color, #f4b400)",cardBg:"var(--card-background-color, #ffffff)",cardShadow:"var(--shadow-elevation-2dp_-_box-shadow, 0 2px 2px 0 rgba(0,0,0,0.14))",fontFamily:"var(--primary-font-family, system-ui, sans-serif)"},Vr={"--primary-background-color":"#111936","--secondary-background-color":"#1a2044","--primary-text-color":"#e1e1e1","--secondary-text-color":"rgba(255,255,255,0.7)","--accent-color":"#03a9f4","--divider-color":"rgba(255,255,255,0.12)","--error-color":"#ef5350","--success-color":"#66bb6a","--warning-color":"#ffa726","--card-background-color":"rgba(255,255,255,0.06)","--shadow-elevation-2dp_-_box-shadow":"0 2px 4px 0 rgba(0,0,0,0.4)"},qr={"--primary-background-color":"#ffffff","--secondary-background-color":"#f5f5f5","--primary-text-color":"#212121","--secondary-text-color":"#757575","--accent-color":"#03a9f4","--divider-color":"#e0e0e0","--error-color":"#db4437","--success-color":"#0f9d58","--warning-color":"#f4b400","--card-background-color":"#ffffff","--shadow-elevation-2dp_-_box-shadow":"0 2px 2px 0 rgba(0,0,0,0.14)"};function nr(){var t,e;try{if(window.parent&&window.parent!==window){const i=(e=(t=window.parent.document)==null?void 0:t.querySelector("home-assistant"))==null?void 0:e.hass;if(i!=null&&i.themes){if(typeof i.themes.darkMode=="boolean")return i.themes.darkMode;const r=(i.themes.theme||"").toLowerCase();if(r.includes("dark"))return!0;if(r.includes("light"))return!1}}}catch{}return window.matchMedia("(prefers-color-scheme: dark)").matches}function ar(t){const e=t?Vr:qr,i=document.documentElement;for(const[r,n]of Object.entries(e))i.style.setProperty(r,n);i.classList.toggle("dark",t),document.body.style.background=t?Vr["--secondary-background-color"]:qr["--secondary-background-color"]}function ps(){const t=nr();ar(t),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{const i=nr();ar(i)}),setInterval(()=>{const i=nr(),r=document.documentElement.classList.contains("dark");i!==r&&ar(i)},5e3)}const Yr={mobile:768,tablet:1024};function be(t){return t<Yr.mobile?"mobile":t<Yr.tablet?"tablet":"desktop"}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const E=t=>(e,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const hs={attribute:!0,type:String,converter:Ka,reflect:!1,hasChanged:Ga},gs=(t=hs,e,i)=>{const{kind:r,metadata:n}=i;let a=globalThis.litPropertyMetadata.get(n);if(a===void 0&&globalThis.litPropertyMetadata.set(n,a=new Map),r==="setter"&&((t=Object.create(t)).wrapped=!0),a.set(i.name,t),r==="accessor"){const{name:s}=i;return{set(l){const c=e.get.call(this);e.set.call(this,l),this.requestUpdate(s,c,t,!0,l)},init(l){return l!==void 0&&this.C(s,void 0,t,l),l}}}if(r==="setter"){const{name:s}=i;return function(l){const c=this[s];e.call(this,l),this.requestUpdate(s,c,t,!0,l)}}throw Error("Unsupported decorator location: "+r)};function h(t){return(e,i)=>typeof i=="object"?gs(t,e,i):((r,n,a)=>{const s=n.hasOwnProperty(a);return n.constructor.createProperty(a,r),s?Object.getOwnPropertyDescriptor(n,a):void 0})(t,e,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function w(t){return h({...t,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const fs=(t,e,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof e!="object"&&Object.defineProperty(t,e,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Zi(t,e){return(i,r,n)=>{const a=s=>{var l;return((l=s.renderRoot)==null?void 0:l.querySelector(t))??null};return fs(i,r,{get(){return a(this)}})}}class ms{constructor(){this.callbacks=new Set,this.watched=new Set,this.watchedPrefixes=new Set,this.unsub=null,this.running=!1,this.getHass=null,this.activeConnection=null}registerEntities(e){for(const i of e)typeof i=="string"&&i.length>0&&this.watched.add(i)}registerPrefix(e){var r;if(typeof e!="string"||e.length===0)return;this.watchedPrefixes.add(e);const i=(r=this.getHass)==null?void 0:r.call(this);if(i!=null&&i.states){const n=Object.keys(i.states).filter(a=>a.startsWith(e));this.registerEntities(n)}}onEntityChange(e){return this.callbacks.add(e),()=>{this.callbacks.delete(e)}}async start(e){this.getHass=e.getHass;const i=this.getHass();if(!(i!=null&&i.connection)){y.debug("StateWatcher: hass not ready, retrying in 500ms"),setTimeout(()=>this.start(e),500);return}if(this.running&&this.activeConnection===i.connection){const n=e.prefixes??[];for(const a of n)this.registerPrefix(a);return}this.running&&this.stop(),this.running=!0,this.activeConnection=i.connection;const r=e.prefixes??[];for(const n of r)this.registerPrefix(n);try{this.unsub=await i.connection.subscribeEvents(n=>this.handleStateChanged(n),"state_changed"),y.info("StateWatcher started",{prefixes:r,watchedCount:this.watched.size})}catch(n){this.running=!1,this.activeConnection=null,y.error("StateWatcher failed to subscribe",n)}}stop(){if(this.running=!1,this.activeConnection=null,this.unsub)try{this.unsub()}catch{}this.unsub=null,y.info("StateWatcher stopped")}isWatched(e){return this.matchesWatched(e)}destroy(){this.stop(),this.callbacks.clear(),this.watched.clear(),this.watchedPrefixes.clear(),this.getHass=null}matchesWatched(e){if(this.watched.has(e))return!0;for(const i of this.watchedPrefixes)if(e.startsWith(i))return!0;return!1}handleStateChanged(e){var n;const i=(n=e==null?void 0:e.data)==null?void 0:n.entity_id;if(!i||!this.matchesWatched(i))return;const r=e.data.new_state;for(const a of this.callbacks)try{a(i,r)}catch{}}}const Xt=new ms;class bs{constructor(e,i="2206237016"){this.subscriptions=new Map,this.cache=new Map,this.stateWatcherUnsub=null,this.hass=e,this.inverterSn=i,this.init()}init(){var e;if((e=this.hass)!=null&&e.states)for(const[i,r]of Object.entries(this.hass.states))this.cache.set(i,r);this.stateWatcherUnsub=Xt.onEntityChange((i,r)=>{r?this.cache.set(i,r):this.cache.delete(i),this.notifySubscribers(i,r)}),y.debug("EntityStore initialized",{entities:this.cache.size,inverterSn:this.inverterSn})}getSensorId(e){return`sensor.oig_${this.inverterSn}_${e}`}findSensorId(e){const i=this.getSensorId(e);for(const r of this.cache.keys()){if(r===i)return r;if(r.startsWith(i+"_")){const n=r.substring(i.length+1);if(/^\d+$/.test(n))return r}}return i}subscribe(e,i){this.subscriptions.has(e)||this.subscriptions.set(e,new Set),this.subscriptions.get(e).add(i),Xt.registerEntities([e]);const r=this.cache.get(e)??null;return i(r),()=>{var n,a;(n=this.subscriptions.get(e))==null||n.delete(i),((a=this.subscriptions.get(e))==null?void 0:a.size)===0&&this.subscriptions.delete(e)}}getNumeric(e){const i=this.cache.get(e);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"&&parseFloat(i.state)||0,lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:0,lastUpdated:null,attributes:{},exists:!1}}getString(e){const i=this.cache.get(e);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"?i.state:"",lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:"",lastUpdated:null,attributes:{},exists:!1}}get(e){return this.cache.get(e)??null}getAll(){return Object.fromEntries(this.cache)}batchLoad(e){const i={};for(const r of e)i[r]=this.getNumeric(r);return i}updateHass(e){if(this.hass=e,e!=null&&e.states){const i=new Set(Object.keys(e.states));for(const r of Array.from(this.cache.keys()))i.has(r)||(this.cache.delete(r),this.notifySubscribers(r,null));for(const[r,n]of Object.entries(e.states)){const a=this.cache.get(r),s=n;this.cache.set(r,s),((a==null?void 0:a.state)!==s.state||(a==null?void 0:a.last_updated)!==s.last_updated)&&this.notifySubscribers(r,s)}}}notifySubscribers(e,i){const r=this.subscriptions.get(e);if(r)for(const n of r)try{n(i)}catch(a){y.error("Entity callback error",a,{entityId:e})}}destroy(){var e;(e=this.stateWatcherUnsub)==null||e.call(this),this.subscriptions.clear(),this.cache.clear(),y.debug("EntityStore destroyed")}}let Ge=null;function ys(t,e){return Ge&&Ge.destroy(),Ge=new bs(t,e),Ge}function ae(){return Ge}const vs=3,xs=1e3;class ws{constructor(){this.hass=null,this.initPromise=null}async getHass(){return this.hass?this.hass:this.initPromise?this.initPromise:(this.initPromise=this.initHass(),this.initPromise)}getHassSync(){return this.hass}async refreshHass(){const e=await this.findHass();return e?(this.hass=e,y.info("HASS client refreshed"),e):this.hass}async initHass(){y.debug("Initializing HASS client");const e=await this.findHass();return e?(this.hass=e,y.info("HASS client initialized"),e):(y.warn("HASS not found in parent context"),null)}async findHass(){var e,i;if(typeof window>"u")return null;if(window.hass)return window.hass;if(window.parent&&window.parent!==window)try{const r=(i=(e=window.parent.document)==null?void 0:e.querySelector("home-assistant"))==null?void 0:i.hass;if(r)return r}catch{y.debug("Cannot access parent HASS (cross-origin)")}return window.customPanel?window.customPanel.hass:null}async fetchWithAuth(e,i={}){var s,l;const r=await this.getHass();if(!r)throw new Le("Cannot get HASS context");try{const u=new URL(e,window.location.href).hostname;if(u!=="localhost"&&u!=="127.0.0.1"&&!e.startsWith("/api/"))throw new Error(`fetchWithAuth rejected for non-localhost URL: ${e}`)}catch(c){if(c.message.includes("rejected"))throw c}const n=(l=(s=r.auth)==null?void 0:s.data)==null?void 0:l.access_token;if(!n)throw new Le("No access token available");const a=new Headers(i.headers);return a.set("Authorization",`Bearer ${n}`),a.has("Content-Type")||a.set("Content-Type","application/json"),this.fetchWithRetry(e,{...i,headers:a})}async fetchWithRetry(e,i,r=vs){try{const n=await fetch(e,i);if(!n.ok)throw n.status===401?new Le("Token expired or invalid"):new jr(`HTTP ${n.status}: ${n.statusText}`);return n}catch(n){if(r>0&&n instanceof jr)return y.warn(`Retrying fetch (${r} left)`,{url:e}),await this.delay(xs),this.fetchWithRetry(e,i,r-1);throw n}}async callApi(e,i,r){const n=await this.getHass();if(!n)throw new Le("Cannot get HASS context");return n.callApi(e,i,r)}async callService(e,i,r){const n=await this.getHass();if(!(n!=null&&n.callService))return y.error("Cannot call service — hass not available"),!1;try{return await n.callService(e,i,r),!0}catch(a){return y.error(`Service call failed (${e}.${i})`,a),!1}}async callWS(e){const i=await this.getHass();if(!(i!=null&&i.callWS))throw new Le("Cannot get HASS context for WS call");return i.callWS(e)}async fetchOIGAPI(e,i={}){try{const r=`/api/oig_cloud${e.startsWith("/")?"":"/"}${e}`;return await(await this.fetchWithAuth(r,{...i,headers:{"Content-Type":"application/json",...Object.fromEntries(new Headers(i.headers).entries())}})).json()}catch(r){return y.error(`OIG API fetch error for ${e}`,r),null}}async loadBatteryTimeline(e,i="active"){return this.fetchOIGAPI(`/battery_forecast/${e}/timeline?type=${i}`)}async loadUnifiedCostTile(e){return this.fetchOIGAPI(`/battery_forecast/${e}/unified_cost_tile`)}async loadSpotPrices(e){return this.fetchOIGAPI(`/spot_prices/${e}/intervals`)}async loadAnalytics(e){return this.fetchOIGAPI(`/analytics/${e}`)}async loadPlannerSettings(e){return this.fetchOIGAPI(`/battery_forecast/${e}/planner_settings`)}async savePlannerSettings(e,i){return this.fetchOIGAPI(`/battery_forecast/${e}/planner_settings`,{method:"POST",body:JSON.stringify(i)})}async loadDetailTabs(e,i,r="hybrid"){return this.fetchOIGAPI(`/battery_forecast/${e}/detail_tabs?tab=${i}&plan=${r}`)}async loadModules(e){return this.fetchOIGAPI(`/${e}/modules`)}openEntityDialog(e){var i;try{const r=((i=window.parent.document)==null?void 0:i.querySelector("home-assistant"))??document.querySelector("home-assistant");if(!r)return y.warn("Cannot open entity dialog — home-assistant element not found"),!1;const n=new CustomEvent("hass-more-info",{bubbles:!0,composed:!0,detail:{entityId:e}});return r.dispatchEvent(n),!0}catch(r){return y.error("Cannot open entity dialog",r),!1}}async showNotification(e,i,r="success"){await this.callService("persistent_notification","create",{title:e,message:i,notification_id:`oig_dashboard_${Date.now()}`})||console.log(`[${r.toUpperCase()}] ${e}: ${i}`)}getToken(){var e,i,r;return((r=(i=(e=this.hass)==null?void 0:e.auth)==null?void 0:i.data)==null?void 0:r.access_token)??null}delay(e){return new Promise(i=>setTimeout(i,e))}}const X=new ws,Ur={solar:"#ffd54f",battery:"#4caf50",inverter:"#9575cd",grid:"#42a5f5",house:"#f06292"},Be={solar:"linear-gradient(135deg, rgba(255,213,79,0.15) 0%, rgba(255,179,0,0.08) 100%)",battery:"linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(56,142,60,0.08) 100%)",grid:"linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(33,150,243,0.08) 100%)",house:"linear-gradient(135deg, rgba(240,98,146,0.15) 0%, rgba(233,30,99,0.08) 100%)",inverter:"linear-gradient(135deg, rgba(149,117,205,0.15) 0%, rgba(126,87,194,0.08) 100%)"},Fe={solar:"rgba(255,213,79,0.4)",battery:"rgba(76,175,80,0.4)",grid:"rgba(66,165,245,0.4)",house:"rgba(240,98,146,0.4)",inverter:"rgba(149,117,205,0.4)"},ue={solar:"#ffd54f",battery:"#ff9800",grid_import:"#f44336",grid_export:"#4caf50",house:"#f06292"},vi={solar:5400,battery:7e3,grid:17e3,house:1e4},$r={solarPower:0,solarP1:0,solarP2:0,solarV1:0,solarV2:0,solarI1:0,solarI2:0,solarPercent:0,solarToday:0,solarForecastToday:0,solarForecastTomorrow:0,batterySoC:0,batteryPower:0,batteryVoltage:0,batteryCurrent:0,batteryTemp:0,batteryChargeTotal:0,batteryDischargeTotal:0,batteryChargeSolar:0,batteryChargeGrid:0,isGridCharging:!1,timeToEmpty:"",timeToFull:"",balancingState:"standby",balancingTimeRemaining:"",gridChargingPlan:{hasBlocks:!1,totalEnergyKwh:0,totalCostCzk:0,windowLabel:null,durationMinutes:0,currentBlockLabel:null,nextBlockLabel:null,blocks:[]},gridPower:0,gridVoltage:0,gridFrequency:0,gridImportToday:0,gridExportToday:0,gridL1V:0,gridL2V:0,gridL3V:0,gridL1P:0,gridL2P:0,gridL3P:0,spotPrice:0,exportPrice:0,currentTariff:"",housePower:0,houseTodayWh:0,houseL1:0,houseL2:0,houseL3:0,inverterMode:"",inverterGridMode:"",inverterGridLimit:0,inverterTemp:0,bypassStatus:"off",notificationsUnread:0,notificationsError:0,boilerIsUse:!1,boilerPower:0,boilerDayEnergy:0,boilerManualMode:"",boilerInstallPower:3e3,plannerAutoMode:null,lastUpdate:""},Gr=new URLSearchParams(window.location.search),$s=Gr.get("sn")||Gr.get("inverter_sn")||"2206237016";function _s(t){return`sensor.oig_${$s}_${t}`}function B(t){if(!(t!=null&&t.state))return 0;const e=parseFloat(t.state);return isNaN(e)?0:e}function Pt(t){return!(t!=null&&t.state)||t.state==="unknown"||t.state==="unavailable"?"":t.state}function Kr(t,e="on"){if(!(t!=null&&t.state))return!1;const i=t.state.toLowerCase();return i===e||i==="1"||i==="zapnuto"}function ks(t){const e=(t||"").toLowerCase();return e==="charging"?"charging":e==="balancing"||e==="holding"?"holding":e==="completed"?"completed":e==="planned"?"planned":"standby"}function hr(t){return t==="tomorrow"?"zítra":t==="today"?"dnes":""}function Zr(t){if(!t)return null;const[e,i]=t.split(":").map(Number);return!Number.isFinite(e)||!Number.isFinite(i)?null:e*60+i}function Ss(t){const e=Number(t.grid_import_kwh??t.grid_charge_kwh??0);if(Number.isFinite(e)&&e>0)return e;const i=Number(t.battery_start_kwh??0),r=Number(t.battery_end_kwh??0);return Number.isFinite(i)&&Number.isFinite(r)?Math.max(0,r-i):0}function Nn(t=[]){return[...t].sort((e,i)=>{const r=(e.day==="tomorrow"?1:0)-(i.day==="tomorrow"?1:0);return r!==0?r:(e.time_from||"").localeCompare(i.time_from||"")})}function Cs(t){if(!Array.isArray(t)||t.length===0)return null;const e=Nn(t),i=e[0],r=e.at(-1),n=hr(i==null?void 0:i.day),a=hr(r==null?void 0:r.day);if(n===a){const m=n?`${n} `:"";return!(i!=null&&i.time_from)||!(r!=null&&r.time_to)?m.trim()||null:`${m}${i.time_from} – ${r.time_to}`}const s=n?`${n} `:"",l=a?`${a} `:"",c=(i==null?void 0:i.time_from)||"--",u=(r==null?void 0:r.time_to)||"--",p=i?`${s}${c}`:"--",g=r?`${l}${u}`:"--";return`${p} → ${g}`}function Ps(t){if(!Array.isArray(t)||t.length===0)return 0;let e=0;return t.forEach(i=>{const r=Zr(i.time_from),n=Zr(i.time_to);if(r===null||n===null)return;const a=n-r;a>0&&(e+=a)}),e}function Qr(t){const e=hr(t.day),i=e?`${e} `:"",r=t.time_from||"--",n=t.time_to||"--";return`${i}${r} - ${n}`}function Ts(t){const e=t.find(n=>{const a=(n.status||"").toLowerCase();return a==="running"||a==="active"})||null,i=e?t[t.indexOf(e)+1]||null:t[0]||null;return{runningBlock:e,upcomingBlock:i,shouldShowNext:!!(i&&(!e||i!==e))}}function Ms(t){const e=(t==null?void 0:t.attributes)||{},i=Array.isArray(e.charging_blocks)?e.charging_blocks:[],r=Nn(i),n=Number(e.total_energy_kwh)||0,a=n>0?n:r.reduce((b,v)=>b+Ss(v),0),s=Number(e.total_cost_czk)||0,l=s>0?s:r.reduce((b,v)=>b+Number(v.total_cost_czk||0),0),c=Cs(r),u=Ps(r),{runningBlock:p,upcomingBlock:g,shouldShowNext:m}=Ts(r);return{hasBlocks:r.length>0,totalEnergyKwh:a,totalCostCzk:l,windowLabel:c,durationMinutes:u,currentBlockLabel:p?Qr(p):null,nextBlockLabel:m&&g?Qr(g):null,blocks:r}}function Es(t){var Br,Fr,Nr,Rr,Hr,Wr;const e=(t==null?void 0:t.states)||t||{},i=qa=>e[_s(qa)]||null,r=B(i("actual_fv_p1")),n=B(i("actual_fv_p2")),a=B(i("extended_fve_voltage_1")),s=B(i("extended_fve_voltage_2")),l=B(i("extended_fve_current_1")),c=B(i("extended_fve_current_2")),u=i("solar_forecast"),p=(Br=u==null?void 0:u.attributes)!=null&&Br.today_total_kwh?parseFloat(u.attributes.today_total_kwh)||0:(Fr=u==null?void 0:u.attributes)!=null&&Fr.today_total_sum_kw?parseFloat(u.attributes.today_total_sum_kw)||0:B(u),g=(Nr=u==null?void 0:u.attributes)!=null&&Nr.tomorrow_total_sum_kw?parseFloat(u.attributes.tomorrow_total_sum_kw)||0:(Rr=u==null?void 0:u.attributes)!=null&&Rr.total_tomorrow_kwh&&parseFloat(u.attributes.total_tomorrow_kwh)||0,m=B(i("batt_bat_c")),b=B(i("batt_batt_comp_p")),v=B(i("extended_battery_voltage")),f=B(i("extended_battery_current")),k=B(i("extended_battery_temperature")),C=B(i("computed_batt_charge_energy_today")),$=B(i("computed_batt_discharge_energy_today")),S=B(i("computed_batt_charge_fve_energy_today")),Y=B(i("computed_batt_charge_grid_energy_today")),K=i("grid_charging_planned"),x=Kr(K),H=Pt(i("time_to_empty")),z=Pt(i("time_to_full")),D=i("battery_balancing"),q=ks((Hr=D==null?void 0:D.attributes)==null?void 0:Hr.current_state),Q=Pt({state:(Wr=D==null?void 0:D.attributes)==null?void 0:Wr.time_remaining}),U=Ms(K),xt=B(i("actual_aci_wtotal")),Vt=B(i("extended_grid_voltage")),er=B(i("ac_in_aci_f")),ir=B(i("ac_in_ac_ad")),Ct=B(i("ac_in_ac_pd")),Ae=B(i("ac_in_aci_vr")),Ie=B(i("ac_in_aci_vs")),yt=B(i("ac_in_aci_vt")),Lr=B(i("actual_aci_wr")),qt=B(i("actual_aci_ws")),Yt=B(i("actual_aci_wt")),_a=B(i("spot_price_current_15min")),ka=B(i("export_price_current_15min")),Sa=Pt(i("current_tariff")),Ca=B(i("actual_aco_p")),Pa=B(i("ac_out_en_day")),Ta=B(i("ac_out_aco_pr")),Ma=B(i("ac_out_aco_ps")),Ea=B(i("ac_out_aco_pt")),Da=Pt(i("box_prms_mode")),Oa=Pt(i("invertor_prms_to_grid")),za=B(i("invertor_prm1_p_max_feed_grid")),Aa=B(i("box_temp")),Ia=Pt(i("bypass_status"))||"off",La=B(i("notification_count_unread")),Ba=B(i("notification_count_error")),rr=i("boiler_is_use"),Fa=rr?Kr(rr)||Pt(rr)==="Zapnuto":!1,Na=B(i("boiler_current_cbb_w")),Ra=B(i("boiler_day_w")),Ha=Pt(i("boiler_manual_mode")),Wa=B(i("boiler_install_power"))||3e3,ja=i("real_data_update"),Va=Pt(ja);return{solarPower:r+n,solarP1:r,solarP2:n,solarV1:a,solarV2:s,solarI1:l,solarI2:c,solarPercent:B(i("dc_in_fv_proc")),solarToday:B(i("dc_in_fv_ad")),solarForecastToday:p,solarForecastTomorrow:g,batterySoC:m,batteryPower:b,batteryVoltage:v,batteryCurrent:f,batteryTemp:k,batteryChargeTotal:C,batteryDischargeTotal:$,batteryChargeSolar:S,batteryChargeGrid:Y,isGridCharging:x,timeToEmpty:H,timeToFull:z,balancingState:q,balancingTimeRemaining:Q,gridChargingPlan:U,gridPower:xt,gridVoltage:Vt,gridFrequency:er,gridImportToday:ir,gridExportToday:Ct,gridL1V:Ae,gridL2V:Ie,gridL3V:yt,gridL1P:Lr,gridL2P:qt,gridL3P:Yt,spotPrice:_a,exportPrice:ka,currentTariff:Sa,housePower:Ca,houseTodayWh:Pa,houseL1:Ta,houseL2:Ma,houseL3:Ea,inverterMode:Da,inverterGridMode:Oa,inverterGridLimit:za,inverterTemp:Aa,bypassStatus:Ia,notificationsUnread:La,notificationsError:Ba,boilerIsUse:Fa,boilerPower:Na,boilerDayEnergy:Ra,boilerManualMode:Ha,boilerInstallPower:Wa,plannerAutoMode:null,lastUpdate:Va}}const Ne={};function xi(t,e,i){const r=Math.abs(t),n=Math.min(100,r/e*100),a=Math.max(500,Math.round(3500-n*30));let s=a;return i&&Ne[i]!==void 0&&(s=Math.round(.3*a+(1-.3)*Ne[i]),Math.abs(s-Ne[i])<100&&(s=Ne[i])),i&&(Ne[i]=s),{active:r>=50,intensity:n,count:Math.max(1,Math.min(4,Math.ceil(1+n/33))),speed:s,size:Math.round(6+n/10),opacity:Math.min(1,.3+n/150)}}function Re(t){return Math.abs(t)>=1e3?`${(t/1e3).toFixed(1)} kW`:`${Math.round(t)} W`}function Gt(t){return t>=1e3?`${(t/1e3).toFixed(2)} kWh`:`${Math.round(t)} Wh`}function Ds(t){return t==="VT"||t.includes("vysoký")?"⚡ VT":t==="NT"||t.includes("nízký")?"🌙 NT":t?`⏰ ${t}`:"--"}function Os(t){return t.includes("Home 1")?{icon:"🏠",text:"Home 1"}:t.includes("Home 2")?{icon:"🔋",text:"Home 2"}:t.includes("Home 3")?{icon:"☀️",text:"Home 3"}:t.includes("UPS")?{icon:"⚡",text:"Home UPS"}:{icon:"⚙️",text:t||"--"}}function zs(t){return t==="Vypnuto / Off"?{display:"Vypnuto",icon:"🚫"}:t==="Zapnuto / On"?{display:"Zapnuto",icon:"💧"}:t.includes("Limited")||t.includes("omezením")?{display:"Omezeno",icon:"🚰"}:{display:t||"--",icon:"💧"}}const As={"HOME I":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"HOME II":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"HOME III":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"rgba(158, 158, 158, 0.18)",label:"DO NOTHING"},"Mode 0":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"Mode 1":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"Mode 2":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"Mode 3":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"}},Xr={timeline:[],labels:[],prices:[],exportPrices:[],modeSegments:[],cheapestBuyBlock:null,expensiveBuyBlock:null,bestExportBlock:null,worstExportBlock:null,solar:null,battery:null,initialZoomStart:null,initialZoomEnd:null,currentSpotPrice:0,currentExportPrice:0,avgSpotPrice:0,plannedConsumption:null,whatIf:null,solarForecastTotal:0},Jr=new URLSearchParams(window.location.search),gr=Jr.get("sn")||Jr.get("inverter_sn")||"2206237016";function xe(t){return`sensor.oig_${gr}_${t}`}function tn(t){if(!(t!=null&&t.state))return 0;const e=parseFloat(t.state);return isNaN(e)?0:e}function fr(t){const e=t.getFullYear(),i=String(t.getMonth()+1).padStart(2,"0"),r=String(t.getDate()).padStart(2,"0"),n=String(t.getHours()).padStart(2,"0"),a=String(t.getMinutes()).padStart(2,"0"),s=String(t.getSeconds()).padStart(2,"0");return`${e}-${i}-${r}T${n}:${a}:${s}`}const Pi={},Is=5*60*1e3;async function Ls(t="hybrid"){const e=Pi[t];if(e&&Date.now()-e.ts<Is)return y.debug("Timeline cache hit",{plan:t,age:Math.round((Date.now()-e.ts)/1e3)}),e.data;try{const i=await X.getHass();if(!i)return[];let r;i.callApi?r=await i.callApi("GET",`oig_cloud/battery_forecast/${gr}/timeline?type=active`):r=await X.fetchOIGAPI(`battery_forecast/${gr}/timeline?type=active`);const n=(r==null?void 0:r.active)||(r==null?void 0:r.timeline)||[];return Pi[t]={data:n,ts:Date.now()},y.info("Timeline fetched",{plan:t,points:n.length}),n}catch(i){return y.error("Failed to fetch timeline",i),[]}}function Bs(t){Object.keys(Pi).forEach(e=>delete Pi[e])}function Fs(t){const e=new Date,i=new Date(e);return i.setMinutes(Math.floor(e.getMinutes()/15)*15,0,0),t.filter(r=>new Date(r.timestamp)>=i)}function Ns(t){return t.map(e=>{if(!e.timestamp)return new Date;try{const[i,r]=e.timestamp.split("T");if(!i||!r)return new Date;const[n,a,s]=i.split("-").map(Number),[l,c,u=0]=r.split(":").map(Number);return new Date(n,a-1,s,l,c,u)}catch{return new Date}})}function Rs(t){const e=t.mode_name||t.mode_planned||t.mode||t.mode_display||null;if(!e||typeof e!="string")return null;const i=e.trim();return i.length?i:null}function Hs(t){return t.startsWith("HOME ")?t.replace("HOME ","").trim():t==="FULL HOME UPS"||t==="HOME UPS"?"UPS":t==="DO NOTHING"?"DN":t.substring(0,3).toUpperCase()}function Ws(t){return As[t]||{icon:"❓",color:"rgba(158, 158, 158, 0.15)",label:t}}function js(t){if(!t.length)return[];const e=[];let i=null;for(const r of t){const n=Rs(r);if(!n){i=null;continue}const a=new Date(r.timestamp),s=new Date(a.getTime()+15*60*1e3);if(i!==null&&i.mode===n)i.end=s;else{const l={mode:n,start:a,end:s};e.push(l),i=l}}return e.map(r=>{const n=Ws(r.mode);return{...r,icon:n.icon,color:n.color,label:n.label,shortLabel:Hs(r.mode)}})}function wi(t,e,i=3){const r=Math.floor(i*60/15);if(t.length<r)return null;let n=null,a=e?1/0:-1/0;for(let s=0;s<=t.length-r;s++){const l=t.slice(s,s+r),c=l.map(p=>p.price),u=c.reduce((p,g)=>p+g,0)/c.length;(e&&u<a||!e&&u>a)&&(a=u,n={start:l[0].timestamp,end:l[l.length-1].timestamp,avg:u,min:Math.min(...c),max:Math.max(...c),values:c,type:"cheapest-buy"})}return n}function Vs(t,e){const r=((t==null?void 0:t.states)||{})[xe("solar_forecast")];if(!(r!=null&&r.attributes)||!e.length)return null;const n=r.attributes,a=n.today_total_kwh||0,s=n.today_hourly_string1_kw||{},l=n.tomorrow_hourly_string1_kw||{},c=n.today_hourly_string2_kw||{},u=n.tomorrow_hourly_string2_kw||{},p={...s,...l},g={...c,...u},m=(f,k,C)=>f==null||k==null?f||k||0:f+(k-f)*C,b=[],v=[];for(const f of e){const k=f.getHours(),C=f.getMinutes(),$=new Date(f);$.setMinutes(0,0,0);const S=fr($),Y=new Date($);Y.setHours(k+1);const K=fr(Y),x=p[S]||0,H=p[K]||0,z=g[S]||0,D=g[K]||0,q=C/60;b.push(m(x,H,q)),v.push(m(z,D,q))}return{string1:b,string2:v,todayTotal:a,hasString1:b.some(f=>f>0),hasString2:v.some(f=>f>0)}}function qs(t,e){if(!t.length)return{arrays:{baseline:[],solarCharge:[],gridCharge:[],gridNet:[],consumption:[]},initialZoomStart:null,initialZoomEnd:null};const i=t.map(g=>new Date(g.timestamp)),r=i[0].getTime(),n=i[i.length-1],a=n?n.getTime():r,s=[],l=[],c=[],u=[],p=[];for(const g of e){const m=fr(g),b=t.find(v=>v.timestamp===m);if(b){const v=(b.battery_capacity_kwh??b.battery_soc??b.battery_start)||0,f=b.solar_charge_kwh||0,k=b.grid_charge_kwh||0,C=typeof b.grid_net=="number"?b.grid_net:(b.grid_import||0)-(b.grid_export||0),$=b.load_kwh??b.consumption_kwh??b.load??0,S=(Number($)||0)*4;s.push(v-f-k),l.push(f),c.push(k),u.push(C),p.push(S)}else s.push(null),l.push(null),c.push(null),u.push(null),p.push(null)}return{arrays:{baseline:s,solarCharge:l,gridCharge:c,gridNet:u,consumption:p},initialZoomStart:r,initialZoomEnd:a}}function Ys(t){const e=(t==null?void 0:t.states)||{},i=e[xe("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const r=i.attributes,n=r.planned_consumption_today??null,a=r.planned_consumption_tomorrow??null,s=r.profile_today||"Žádný profil",l=e[xe("ac_out_en_day")],c=l==null?void 0:l.state,p=(c&&c!=="unavailable"&&parseFloat(c)||0)/1e3,g=p+(n||0),m=(n||0)+(a||0);let b=null;if(g>0&&a!=null){const f=a-g,k=f/g*100;Math.abs(k)<5?b="Zítra podobně":f>0?b=`Zítra více (+${Math.abs(k).toFixed(0)}%)`:b=`Zítra méně (-${Math.abs(k).toFixed(0)}%)`}return{todayConsumedKwh:p,todayPlannedKwh:n,todayTotalKwh:g,tomorrowKwh:a,totalPlannedKwh:m,profile:s!=="Žádný profil"&&s!=="Neznámý profil"?s:"Žádný profil",trendText:b}}function Us(t){const i=((t==null?void 0:t.states)||{})[xe("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const n=i.attributes.mode_optimization||{},a=n.alternatives||{},s=n.total_cost_czk||0,l=n.total_savings_vs_home_i_czk||0,c=a["DO NOTHING"],u=(c==null?void 0:c.current_mode)||null;return{totalCost:s,totalSavings:l,alternatives:a,activeMode:u}}async function Gs(t,e="hybrid"){const i=performance.now();y.info("[Pricing] loadPricingData START");try{const r=await Ls(e),n=Fs(r);if(!n.length)return y.warn("[Pricing] No timeline data"),Xr;const a=n.map(U=>({timestamp:U.timestamp,price:U.spot_price_czk||0})),s=n.map(U=>({timestamp:U.timestamp,price:U.export_price_czk||0}));let l=Ns(a);const c=js(n),u=wi(a,!0,3);u&&(u.type="cheapest-buy");const p=wi(a,!1,3);p&&(p.type="expensive-buy");const g=wi(s,!1,3);g&&(g.type="best-export");const m=wi(s,!0,3);m&&(m.type="worst-export");const b=n.map(U=>new Date(U.timestamp)),v=new Set([...l,...b].map(U=>U.getTime()));l=Array.from(v).sort((U,xt)=>U-xt).map(U=>new Date(U));const{arrays:f,initialZoomStart:k,initialZoomEnd:C}=qs(n,l),$=Vs(t,l),S=(t==null?void 0:t.states)||{},Y=tn(S[xe("spot_price_current_15min")]),K=tn(S[xe("export_price_current_15min")]),x=a.length>0?a.reduce((U,xt)=>U+xt.price,0)/a.length:0,H=Ys(t),z=Us(t),D=($==null?void 0:$.todayTotal)||0,q={timeline:n,labels:l,prices:a,exportPrices:s,modeSegments:c,cheapestBuyBlock:u,expensiveBuyBlock:p,bestExportBlock:g,worstExportBlock:m,solar:$,battery:f,initialZoomStart:k,initialZoomEnd:C,currentSpotPrice:Y,currentExportPrice:K,avgSpotPrice:x,plannedConsumption:H,whatIf:z,solarForecastTotal:D},Q=(performance.now()-i).toFixed(0);return y.info(`[Pricing] loadPricingData COMPLETE in ${Q}ms`,{points:n.length,segments:c.length}),q}catch(r){return y.error("[Pricing] loadPricingData failed",r),Xr}}const en={workday_spring:"Pracovní den - Jaro",workday_summer:"Pracovní den - Léto",workday_autumn:"Pracovní den - Podzim",workday_winter:"Pracovní den - Zima",weekend_spring:"Víkend - Jaro",weekend_summer:"Víkend - Léto",weekend_autumn:"Víkend - Podzim",weekend_winter:"Víkend - Zima"},Ks={fve:"FVE",grid:"Síť",alternative:"Alternativa"},mr=new URLSearchParams(window.location.search),Zs=mr.get("sn")||mr.get("inverter_sn")||"2206237016",Ti=mr.get("entry_id")||"";function Qs(t,e,i){return isNaN(t)?e:Math.max(e,Math.min(i,t))}function Xs(t,e,i){if(t==null)return null;const r=e-i;if(r<=0)return null;const n=(t-i)/r*100;return Qs(n,0,100)}function Mi(t){if(!t)return"--:--";const e=t instanceof Date?t:new Date(t);return isNaN(e.getTime())?"--:--":e.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}function rn(t){if(!t)return"--";const e=new Date(t);return isNaN(e.getTime())?"--":e.toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}function br(t,e){return`${Mi(t)}–${Mi(e)}`}function nn(t){return Ks[t||""]||t||"--"}function Rn(t){return t?Object.values(t).reduce((e,i)=>e+(parseFloat(String(i))||0),0):0}function Hn(t){return t?Object.entries(t).map(([i,r])=>({hour:parseInt(i,10),value:parseFloat(String(r))||0})).filter(i=>isFinite(i.value)).sort((i,r)=>r.value-i.value).slice(0,3).filter(i=>i.value>0).map(i=>i.hour).sort((i,r)=>i-r):[]}function He(t){if(!t)return null;const e=t.split(":").map(i=>parseInt(i,10));return e.length<2||!isFinite(e[0])||!isFinite(e[1])?null:e[0]*60+e[1]}function an(t,e,i){return e===null||i===null?!1:e<=i?t>=e&&t<i:t>=e||t<i}async function Js(){try{return Ti?await X.fetchOIGAPI(`/${Ti}/boiler_profile`):(y.warn("[Boiler] No entry_id — cannot fetch boiler profile"),null)}catch(t){return y.warn("[Boiler] Failed to fetch profile",{err:t}),null}}async function to(){try{return Ti?await X.fetchOIGAPI(`/${Ti}/boiler_plan`):(y.warn("[Boiler] No entry_id — cannot fetch boiler plan"),null)}catch(t){return y.warn("[Boiler] Failed to fetch plan",{err:t}),null}}function eo(t,e,i){const r=t||e,n=r==null?void 0:r.state,a=(n==null?void 0:n.temperatures)||{},s=(n==null?void 0:n.energy_state)||{},l=isFinite(a.upper_zone??a.top)?a.upper_zone??a.top??null:null,c=isFinite(a.lower_zone??a.bottom)?a.lower_zone??a.bottom??null:null,u=isFinite(s.avg_temp)?s.avg_temp??null:null,p=isFinite(s.energy_needed_kwh)?s.energy_needed_kwh??null:null,g=i.targetTempC??60,m=i.coldInletTempC??10,b=Xs(u,g,m),v=(t==null?void 0:t.slots)||[],f=(t==null?void 0:t.next_slot)||io(v);let k="Neplánováno";if(f){const $=nn(f.recommended_source);k=`${br(f.start,f.end)} (${$})`}const C=nn((n==null?void 0:n.recommended_source)||(f==null?void 0:f.recommended_source));return{currentTemp:(n==null?void 0:n.current_temp)||45,targetTemp:(n==null?void 0:n.target_temp)||g,heating:(n==null?void 0:n.heating)||!1,tempTop:l,tempBottom:c,avgTemp:u,heatingPercent:b,energyNeeded:p,planCost:(t==null?void 0:t.estimated_cost_czk)??null,nextHeating:k,recommendedSource:C,nextProfile:(n==null?void 0:n.next_profile)||"",nextStart:(n==null?void 0:n.next_start)||""}}function io(t){if(!Array.isArray(t))return null;const e=Date.now();return t.find(i=>{const r=new Date(i.end||i.end_time||"").getTime(),n=i.consumption_kwh??i.avg_consumption_kwh??0;return r>e&&n>0})||null}function ro(t){var m,b,v;if(!((m=t==null?void 0:t.slots)!=null&&m.length))return null;const e=t.slots.map(f=>({start:f.start||"",end:f.end||"",consumptionKwh:f.consumption_kwh??f.avg_consumption_kwh??0,recommendedSource:f.recommended_source||"",spotPrice:isFinite(f.spot_price)?f.spot_price??null:null,tempTop:f.temp_top,soc:f.soc})),i=e.filter(f=>f.consumptionKwh>0),r=parseFloat(String(t.total_consumption_kwh))||0,n=parseFloat(String(t.fve_kwh))||0,a=parseFloat(String(t.grid_kwh))||0,s=parseFloat(String(t.alt_kwh))||0,l=parseFloat(String(t.estimated_cost_czk))||0;let c="Mix: --";if(r>0){const f=Math.round(n/r*100),k=Math.round(a/r*100),C=Math.round(s/r*100);c=`Mix: FVE ${f}% · Síť ${k}% · Alt ${C}%`}const u=e.filter(f=>f.consumptionKwh>0&&f.spotPrice!==null).map(f=>({slot:f,price:f.spotPrice}));let p="--",g="--";if(u.length){const f=u.reduce((C,$)=>$.price<C.price?$:C),k=u.reduce((C,$)=>$.price>C.price?$:C);p=`${br(f.slot.start,f.slot.end)} (${f.price.toFixed(2)} Kč/kWh)`,g=`${br(k.slot.start,k.slot.end)} (${k.price.toFixed(2)} Kč/kWh)`}return{slots:e,totalConsumptionKwh:r,fveKwh:n,gridKwh:a,altKwh:s,estimatedCostCzk:l,nextSlot:t.next_slot?{start:t.next_slot.start||"",end:t.next_slot.end||"",consumptionKwh:t.next_slot.consumption_kwh||0,recommendedSource:t.next_slot.recommended_source||"",spotPrice:t.next_slot.spot_price??null}:null,planStart:rn((b=t.slots[0])==null?void 0:b.start),planEnd:rn((v=t.slots[t.slots.length-1])==null?void 0:v.end),sourceDigest:c,activeSlotCount:i.length,cheapestSpot:p,mostExpensiveSpot:g}}function no(t){const e=parseFloat(String(t==null?void 0:t.fve_kwh))||0,i=parseFloat(String(t==null?void 0:t.grid_kwh))||0,r=parseFloat(String(t==null?void 0:t.alt_kwh))||0,n=e+i+r;return{fveKwh:e,gridKwh:i,altKwh:r,fvePercent:n>0?e/n*100:0,gridPercent:n>0?i/n*100:0,altPercent:n>0?r/n*100:0}}function ao(t,e,i){var m;const r=(t==null?void 0:t.summary)||{},n=(m=t==null?void 0:t.profiles)==null?void 0:m[i],a=(n==null?void 0:n.hourly_avg)||{},s=r.predicted_total_kwh??Rn(a),l=r.peak_hours??Hn(a),c=isFinite(r.water_liters_40c)?r.water_liters_40c??null:null,u=r.circulation_windows||[],p=u.length?u.map(b=>`${b.start}–${b.end}`).join(", "):"--";let g="--";if(u.length){const b=new Date,v=b.getHours()*60+b.getMinutes();if(u.some(k=>{const C=He(k.start),$=He(k.end);return an(v,C,$)})){const k=u.find(C=>{const $=He(C.start),S=He(C.end);return an(v,$,S)});g=k?`ANO (do ${k.end})`:"ANO"}else{const k=e==null?void 0:e.state,C=k==null?void 0:k.circulation_recommended;let $=1/0,S=null;for(const Y of u){const K=He(Y.start);if(K===null)continue;let x=K-v;x<0&&(x+=24*60),x<$&&($=x,S=Y)}C&&S?g=`DOPORUČENO (${S.start}–${S.end})`:S?g=`Ne (další ${S.start}–${S.end})`:g="Ne"}}return{predictedTodayKwh:s,peakHours:l,waterLiters40c:c,circulationWindows:p,circulationNow:g}}function so(t){const e=(t==null?void 0:t.config)||{},i=isFinite(e.volume_l)?e.volume_l??null:null;return{volumeL:i,heaterPowerW:null,targetTempC:isFinite(e.target_temp_c)?e.target_temp_c??null:null,deadlineTime:e.deadline_time||"--:--",stratificationMode:e.stratification_mode||"--",kCoefficient:i?(i*.001163).toFixed(4):"--",coldInletTempC:isFinite(e.cold_inlet_temp_c)?e.cold_inlet_temp_c??10:10}}function oo(t){return t!=null&&t.profiles?Object.entries(t.profiles).map(([e,i])=>({id:e,name:i.name||e,targetTemp:i.target_temp||55,startTime:i.start_time||"06:00",endTime:i.end_time||"22:00",days:i.days||[1,1,1,1,1,0,0],enabled:i.enabled!==!1})):[]}function lo(t){var r;const e=[],i=((r=t==null?void 0:t.summary)==null?void 0:r.today_hours)||[];for(let n=0;n<24;n++){const a=i.includes(n);e.push({hour:n,temp:a?55:25,heating:a})}return e}function co(t,e){var s;const i=(s=t==null?void 0:t.profiles)==null?void 0:s[e],r=["Po","Út","St","Čt","Pá","So","Ne"];if(!i)return r.map(l=>({day:l,hours:Array(24).fill(0)}));const n=i.heatmap||[];let a=[];if(n.length>0)a=n.map(l=>l.map(c=>c&&typeof c=="object"?parseFloat(c.consumption)||0:parseFloat(String(c))||0));else{const l=i.hourly_avg||{};a=Array.from({length:7},()=>Array.from({length:24},(c,u)=>parseFloat(String(l[u]||0))))}return r.map((l,c)=>({day:l,hours:a[c]||Array(24).fill(0)}))}function uo(t,e){var u;const i=(u=t==null?void 0:t.profiles)==null?void 0:u[e],r=(t==null?void 0:t.summary)||{},n=(i==null?void 0:i.hourly_avg)||{},a=Array.from({length:24},(p,g)=>parseFloat(String(n[g]||0))),s=r.predicted_total_kwh??Rn(n),l=r.peak_hours??Hn(n),c=isFinite(r.avg_confidence)?r.avg_confidence??null:null;return{hourlyAvg:a,peakHours:l,predictedTotalKwh:s,confidence:c,daysTracked:7}}function po(t,e){var p,g,m;if(!((p=t==null?void 0:t.slots)!=null&&p.length)||!(e!=null&&e.length))return{fve:"--",grid:"--"};const i=(g=t.slots[0])==null?void 0:g.start,r=(m=t.slots[t.slots.length-1])==null?void 0:m.end,n=i?new Date(i).getTime():null,a=r?new Date(r).getTime():null,s=e.filter(b=>{if(!n||!a)return!0;const v=b.timestamp||b.time;if(!v)return!1;const f=new Date(v).getTime();return f>=n&&f<=a}),l=b=>{const v=[];let f=null;for(const k of s){const C=k.timestamp||k.time;if(!C)continue;const $=new Date(C),S=b(k);S&&!f?f={start:$,end:$}:S&&f?f.end=$:!S&&f&&(v.push(f),f=null)}return f&&v.push(f),v.length?v.map(k=>`${Mi(k.start)}–${Mi(new Date(k.end.getTime()+15*6e4))}`).join(", "):"--"},c=l(b=>(parseFloat(b.solar_kwh??b.solar_charge_kwh??0)||0)>0),u=l(b=>(parseFloat(b.grid_charge_kwh??0)||0)>0);return{fve:c,grid:u}}async function ho(){return y.info("[Boiler] Planning heating..."),await X.callService("oig_cloud","plan_boiler_heating",{})}async function go(){return y.info("[Boiler] Applying plan..."),await X.callService("oig_cloud","apply_boiler_plan",{})}async function fo(){return y.info("[Boiler] Canceling plan..."),await X.callService("oig_cloud","cancel_boiler_plan",{})}async function mo(t){const[e,i]=await Promise.all([Js(),to()]);let r=null;try{const l=await X.loadBatteryTimeline(Zs,"active");r=(l==null?void 0:l.active)||l||null,Array.isArray(r)&&r.length===0&&(r=null)}catch{}const n=(e==null?void 0:e.current_category)||Object.keys((e==null?void 0:e.profiles)||{})[0]||"workday_summer",a=Object.keys((e==null?void 0:e.profiles)||{}),s=so(e);return{state:eo(i,e,s),plan:ro(i),energyBreakdown:no(i),predictedUsage:ao(e,i,n),config:s,profiles:oo(e||i),heatmap:lo(i||e),heatmap7x24:co(e,n),profiling:uo(e,n),currentCategory:n,availableCategories:a,forecastWindows:po(i,r)}}const sn={efficiency:null,health:null,balancing:null,costComparison:null};function Wn(t){const e=ae();if(!e)return null;const i=e.findSensorId("battery_efficiency"),r=e.get(i);if(!r)return y.debug("Battery efficiency sensor not found"),null;const n=r.attributes||{},a=n.efficiency_last_month_pct!=null?{efficiency:Number(n.efficiency_last_month_pct??0),charged:Number(n.last_month_charge_kwh??0),discharged:Number(n.last_month_discharge_kwh??0),losses:Number(n.losses_last_month_kwh??0)}:null,s=n.efficiency_current_month_pct!=null?{efficiency:Number(n.efficiency_current_month_pct??0),charged:Number(n.current_month_charge_kwh??0),discharged:Number(n.current_month_discharge_kwh??0),losses:Number(n.losses_current_month_kwh??0)}:null,l=a??s;if(!l)return null;const c=a?"last_month":"current_month",u=a&&s?s.efficiency-a.efficiency:0;return{efficiency:l.efficiency,charged:l.charged,discharged:l.discharged,losses:l.losses,lossesPct:n[c==="last_month"?"losses_last_month_pct":"losses_current_month_pct"]??0,trend:u,period:c,currentMonthDays:n.current_month_days??0,lastMonth:a,currentMonth:s}}function jn(t){const e=ae();if(!e)return null;const i=e.findSensorId("battery_health"),r=e.get(i);if(!r)return y.debug("Battery health sensor not found"),null;const n=parseFloat(r.state)||0,a=r.attributes||{};let s,l;return n>=95?(s="excellent",l="Vynikající"):n>=90?(s="good",l="Dobrý"):n>=80?(s="fair",l="Uspokojivý"):(s="poor",l="Špatný"),{soh:n,capacity:a.capacity_p80_last_20??a.current_capacity_kwh??0,nominalCapacity:a.current_capacity_kwh??0,minCapacity:a.capacity_p20_last_20??0,measurementCount:a.measurement_count??0,lastAnalysis:a.last_analysis??"",qualityScore:a.quality_score??null,sohMethod:a.soh_selection_method??null,sohMethodDescription:a.soh_method_description??null,measurementHistory:Array.isArray(a.measurement_history)?a.measurement_history:[],degradation3m:a.degradation_3_months_percent??null,degradation6m:a.degradation_6_months_percent??null,degradation12m:a.degradation_12_months_percent??null,degradationPerYear:a.degradation_per_year_percent??null,estimatedEolDate:a.estimated_eol_date??null,yearsTo80Pct:a.years_to_80pct??null,trendConfidence:a.trend_confidence??null,status:s,statusLabel:l}}function on(t,e,i){if(!t||!e)return{daysRemaining:null,progressPercent:null,intervalDays:i||null};try{const r=new Date(t),n=new Date(e),a=new Date;if(isNaN(r.getTime())||isNaN(n.getTime()))return{daysRemaining:null,progressPercent:null,intervalDays:i||null};const s=n.getTime()-r.getTime(),l=a.getTime()-r.getTime(),c=Math.max(0,Math.round((n.getTime()-a.getTime())/(1e3*60*60*24))),u=s>0?Math.min(100,Math.max(0,Math.round(l/s*100))):null,p=i||Math.round(s/(1e3*60*60*24));return{daysRemaining:c,progressPercent:u,intervalDays:p||null}}catch{return{daysRemaining:null,progressPercent:null,intervalDays:i||null}}}function Vn(t){const e=ae();if(!e)return null;const i=e.findSensorId("battery_balancing"),r=e.get(i);if(!r){const c=e.get(e.findSensorId("battery_health")),u=c==null?void 0:c.attributes;if(u!=null&&u.balancing_status){const p=String(u.last_balancing??""),g=u.next_balancing?String(u.next_balancing):null,m=on(p,g,Number(u.balancing_interval_days??0));return{status:String(u.balancing_status??"unknown"),lastBalancing:p,cost:Number(u.balancing_cost??0),nextScheduled:g,...m,estimatedNextCost:u.estimated_next_cost!=null?Number(u.estimated_next_cost):null}}return null}const n=r.attributes||{},a=String(n.last_balancing??""),s=n.next_scheduled?String(n.next_scheduled):null,l=on(a,s,Number(n.interval_days??0));return{status:r.state||"unknown",lastBalancing:a,cost:Number(n.cost??0),nextScheduled:s,...l,estimatedNextCost:n.estimated_next_cost!=null?Number(n.estimated_next_cost):null}}async function bo(t){var e,i;try{const r=await X.loadUnifiedCostTile(t);if(!r)return null;const n=r.hybrid??r,a=n.today??{},s=Math.round((a.actual_cost_so_far??a.actual_total_cost??0)*100)/100,l=a.future_plan_cost??0,c=a.plan_total_cost??s+l,u=((e=n.tomorrow)==null?void 0:e.plan_total_cost)??null;let p=null,g=null,m=null,b=null;try{const v=await X.loadBatteryTimeline(t,"active"),f=(i=v==null?void 0:v.timeline_extended)==null?void 0:i.yesterday;f!=null&&f.summary&&(p=f.summary.planned_total_cost??null,g=f.summary.actual_total_cost??null,m=f.summary.delta_cost??null,b=f.summary.accuracy_pct??null)}catch{y.debug("Yesterday analysis not available")}return{activePlan:"hybrid",actualSpent:s,planTotalCost:c,futurePlanCost:l,tomorrowCost:u,yesterdayPlannedCost:p,yesterdayActualCost:g,yesterdayDelta:m,yesterdayAccuracy:b}}catch(r){return y.error("Failed to fetch cost comparison",r),null}}async function yo(t){const e=Wn(),i=jn(),r=Vn(),n=await bo(t);return{efficiency:e,health:i,balancing:r,costComparison:n}}function vo(t){return{efficiency:Wn(),health:jn(),balancing:Vn()}}const Ze={severity:0,warningsCount:0,eventType:"",description:"",instruction:"",onset:"",expires:"",etaHours:0,allWarnings:[],effectiveSeverity:0},xo={vítr:"💨",déšť:"🌧️",sníh:"❄️",bouřky:"⛈️",mráz:"🥶",vedro:"🥵",mlha:"🌫️",náledí:"🧊",laviny:"🏔️"};function qn(t){const e=t.toLowerCase();for(const[i,r]of Object.entries(xo))if(e.includes(i))return r;return"⚠️"}const Yn={0:"Bez výstrahy",1:"Nízká",2:"Zvýšená",3:"Vysoká",4:"Extrémní"},Ei={0:"#4CAF50",1:"#8BC34A",2:"#FF9800",3:"#f44336",4:"#9C27B0"};function wo(t){const e=ae();if(!e)return Ze;const i=`sensor.oig_${t}_chmu_warning_level`,r=e.get(i);if(!r)return y.debug("ČHMÚ sensor not found",{entityId:i}),Ze;const n=parseInt(r.state,10)||0,a=r.attributes||{},s=Number(a.warnings_count??0),l=String(a.event_type??""),c=String(a.description??""),u=String(a.instruction??""),p=String(a.onset??""),g=String(a.expires??""),m=Number(a.eta_hours??0),b=a.all_warnings_details??[],v=Array.isArray(b)?b.map(C=>({event_type:C.event_type??C.event??"",severity:C.severity??n,description:C.description??"",instruction:C.instruction??"",onset:C.onset??"",expires:C.expires??"",eta_hours:C.eta_hours??0})):[],f=l.toLowerCase().includes("žádná výstraha");return{severity:n,warningsCount:s,eventType:l,description:c,instruction:u,onset:p,expires:g,etaHours:m,allWarnings:v,effectiveSeverity:s===0||f?0:n}}const Un={"HOME I":{icon:"🏠",color:"#4CAF50",label:"HOME I"},"HOME II":{icon:"⚡",color:"#2196F3",label:"HOME II"},"HOME III":{icon:"🔋",color:"#9C27B0",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"#FF9800",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"#FF9800",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"#9E9E9E",label:"DO NOTHING"}},Gn={yesterday:"📊 Včera",today:"📆 Dnes",tomorrow:"📅 Zítra",history:"📈 Historie",detail:"💎 Detail"};function ln(t){return{modeHistorical:t.mode_historical??t.mode??"",modePlanned:t.mode_planned??"",modeMatch:t.mode_match??!1,status:t.status??"planned",startTime:t.start_time??"",endTime:t.end_time??"",durationHours:t.duration_hours??0,costHistorical:t.cost_historical??null,costPlanned:t.cost_planned??null,costDelta:t.cost_delta??null,solarKwh:t.solar_total_kwh??0,consumptionKwh:t.consumption_total_kwh??0,gridImportKwh:t.grid_import_total_kwh??0,gridExportKwh:t.grid_export_total_kwh??0,intervalReasons:Array.isArray(t.interval_reasons)?t.interval_reasons:[]}}function $i(t){return{plan:(t==null?void 0:t.plan)??0,actual:(t==null?void 0:t.actual)??null,hasActual:(t==null?void 0:t.has_actual)??!1,unit:(t==null?void 0:t.unit)??""}}function $o(t){const e=(t==null?void 0:t.metrics)??{};return{overallAdherence:(t==null?void 0:t.overall_adherence)??0,modeSwitches:(t==null?void 0:t.mode_switches)??0,totalCost:(t==null?void 0:t.total_cost)??0,metrics:{cost:$i(e.cost),solar:$i(e.solar),consumption:$i(e.consumption),grid:$i(e.grid)},completedSummary:t!=null&&t.completed_summary?{count:t.completed_summary.count??0,totalCost:t.completed_summary.total_cost??0,adherencePct:t.completed_summary.adherence_pct??0}:void 0,plannedSummary:t!=null&&t.planned_summary?{count:t.planned_summary.count??0,totalCost:t.planned_summary.total_cost??0}:void 0,progressPct:t==null?void 0:t.progress_pct,actualTotalCost:t==null?void 0:t.actual_total_cost,planTotalCost:t==null?void 0:t.plan_total_cost,vsPlanPct:t==null?void 0:t.vs_plan_pct,eodPrediction:t!=null&&t.eod_prediction?{predictedTotal:t.eod_prediction.predicted_total??0,predictedSavings:t.eod_prediction.predicted_savings??0}:void 0}}function _o(t){return t?{date:t.date??"",modeBlocks:Array.isArray(t.mode_blocks)?t.mode_blocks.map(ln):[],summary:$o(t.summary),metadata:t.metadata?{activePlan:t.metadata.active_plan??"hybrid",comparisonPlanAvailable:t.metadata.comparison_plan_available}:void 0,comparison:t.comparison?{plan:t.comparison.plan??"",modeBlocks:Array.isArray(t.comparison.mode_blocks)?t.comparison.mode_blocks.map(ln):[]}:void 0}:null}async function ko(t,e,i="hybrid"){try{const r=await X.loadDetailTabs(t,e,i);if(!r)return null;const n=r[e]??r;return _o(n)}catch(r){return y.error(`Failed to load timeline tab: ${e}`,r),null}}const yr={tiles_left:[null,null,null,null,null,null],tiles_right:[null,null,null,null,null,null],left_count:4,right_count:4,visible:!0,version:1},Kn="oig_dashboard_tiles";function So(t,e){return e==="W"&&Math.abs(t)>=1e3?{value:(t/1e3).toFixed(2),unit:"kW"}:e==="Wh"&&Math.abs(t)>=1e3?{value:(t/1e3).toFixed(2),unit:"kWh"}:e==="W"||e==="Wh"?{value:Math.round(t).toString(),unit:e}:{value:t.toFixed(1),unit:e}}async function Co(){var t;try{const e=await X.callWS({type:"call_service",domain:"oig_cloud",service:"get_dashboard_tiles",service_data:{},return_response:!0}),i=(t=e==null?void 0:e.response)==null?void 0:t.config;if(i&&typeof i=="object")return y.debug("Loaded tiles config from HA"),dn(i)}catch(e){y.debug("WS tile config load failed, trying localStorage",{error:e.message})}try{const e=localStorage.getItem(Kn);if(e){const i=JSON.parse(e);return y.debug("Loaded tiles config from localStorage"),dn(i)}}catch{y.debug("localStorage tile config load failed")}return yr}async function cn(t){try{return localStorage.setItem(Kn,JSON.stringify(t)),await X.callService("oig_cloud","save_dashboard_tiles",{config:JSON.stringify(t)}),y.info("Tiles config saved"),!0}catch(e){return y.error("Failed to save tiles config",e),!1}}function dn(t){return{tiles_left:Array.isArray(t.tiles_left)?t.tiles_left.slice(0,6):yr.tiles_left,tiles_right:Array.isArray(t.tiles_right)?t.tiles_right.slice(0,6):yr.tiles_right,left_count:typeof t.left_count=="number"?t.left_count:4,right_count:typeof t.right_count=="number"?t.right_count:4,visible:t.visible!==!1,version:t.version??1}}function sr(t){var l;const e=ae();if(!e)return{value:"--",unit:"",isActive:!1,rawValue:0};const i=e.get(t);if(!i||i.state==="unavailable"||i.state==="unknown")return{value:"--",unit:"",isActive:!1,rawValue:0};const r=i.state,n=String(((l=i.attributes)==null?void 0:l.unit_of_measurement)??""),a=parseFloat(r)||0;if(i.entity_id.startsWith("switch.")||i.entity_id.startsWith("binary_sensor."))return{value:r==="on"?"Zapnuto":"Vypnuto",unit:"",isActive:r==="on",rawValue:r==="on"?1:0};const s=So(a,n);return{value:s.value,unit:s.unit,isActive:a!==0,rawValue:a}}function We(t){const e=(i,r)=>{var a,s;const n=[];for(let l=0;l<r;l++){const c=i[l];if(!c)continue;const u=sr(c.entity_id),p={};if((a=c.support_entities)!=null&&a.top_right){const g=sr(c.support_entities.top_right);p.topRight={value:g.value,unit:g.unit}}if((s=c.support_entities)!=null&&s.bottom_right){const g=sr(c.support_entities.bottom_right);p.bottomRight={value:g.value,unit:g.unit}}n.push({config:c,value:u.value,unit:u.unit,isActive:u.isActive,isZero:u.rawValue===0,formattedValue:u.unit?`${u.value} ${u.unit}`:u.value,supportValues:p})}return n};return{left:e(t.tiles_left,t.left_count),right:e(t.tiles_right,t.right_count)}}async function Po(t,e="toggle"){const i=t.split(".")[0];return X.callService(i,e,{entity_id:t})}function ye(t){return t==null||Number.isNaN(t)?"-- Wh":Math.abs(t)>=1e3?`${(t/1e3).toFixed(2)} kWh`:`${Math.round(t)} Wh`}function it(t,e="CZK"){return t==null||Number.isNaN(t)?`-- ${e}`:`${t.toFixed(2)} ${e}`}function ve(t,e=0){return t==null||Number.isNaN(t)?"-- %":`${t.toFixed(e)} %`}const To={fridge:"❄️","fridge-outline":"❄️",dishwasher:"🍽️","washing-machine":"🧺","tumble-dryer":"🌪️",stove:"🔥",microwave:"📦","coffee-maker":"☕",kettle:"🫖",toaster:"🍞",lightbulb:"💡","lightbulb-outline":"💡",lamp:"🪔","ceiling-light":"💡","floor-lamp":"🪔","led-strip":"✨","led-strip-variant":"✨","wall-sconce":"💡",chandelier:"💡",thermometer:"🌡️",thermostat:"🌡️",radiator:"♨️","radiator-disabled":"❄️","heat-pump":"♨️","air-conditioner":"❄️",fan:"🌀",hvac:"♨️",fire:"🔥",snowflake:"❄️","lightning-bolt":"⚡",flash:"⚡",battery:"🔋","battery-charging":"🔋","battery-50":"🔋","solar-panel":"☀️","solar-power":"☀️","meter-electric":"⚡","power-plug":"🔌","power-socket":"🔌",car:"🚗","car-electric":"🚘","car-battery":"🔋","ev-station":"🔌","ev-plug-type2":"🔌",garage:"🏠","garage-open":"🏠",door:"🚪","door-open":"🚪",lock:"🔒","lock-open":"🔓","shield-home":"🛡️",cctv:"📹",camera:"📹","motion-sensor":"👁️","alarm-light":"🚨",bell:"🔔","window-closed":"🪟","window-open":"🪟",blinds:"🪟","blinds-open":"🪟",curtains:"🪟","roller-shade":"🪟",television:"📺",speaker:"🔊","speaker-wireless":"🔊",music:"🎵","volume-high":"🔊",cast:"📡",chromecast:"📡","router-wireless":"📡",wifi:"📶","access-point":"📡",lan:"🌐",network:"🌐","home-assistant":"🏠",water:"💧","water-percent":"💧","water-boiler":"♨️","water-pump":"💧",shower:"🚿",toilet:"🚽",faucet:"🚰",pipe:"🔧","weather-sunny":"☀️","weather-cloudy":"☁️","weather-night":"🌙","weather-rainy":"🌧️","weather-snowy":"❄️","weather-windy":"💨",information:"ℹ️","help-circle":"❓","alert-circle":"⚠️","checkbox-marked-circle":"✅","toggle-switch":"🔘",power:"⚡",sync:"🔄"};function Di(t){const e=t.replace(/^mdi:/,"");return To[e]||"⚙️"}function or(t,e){let i=!1;return(...r)=>{i||(t(...r),i=!0,setTimeout(()=>i=!1,e))}}async function je(t,e=3,i=1e3){let r;for(let n=0;n<=e;n++)try{return await t()}catch(a){if(r=a,a instanceof Error&&(a.message.includes("401")||a.message.includes("403")))throw a;if(n<e){const s=Math.min(i*Math.pow(2,n),5e3);await new Promise(l=>setTimeout(l,s))}}throw r}const Zn={home_1:"Home 1",home_2:"Home 2",home_3:"Home 3",home_ups:"Home UPS",home_5:"Home 5",home_6:"Home 6"},un={"Home 1":"home_1","Home 2":"home_2","Home 3":"home_3","Home UPS":"home_ups","Home 5":"home_5","Home 6":"home_6","Mode 0":"home_1","Mode 1":"home_2","Mode 2":"home_3","Mode 3":"home_ups","Mode 4":"home_5","Mode 5":"home_6","HOME I":"home_1","HOME II":"home_2","HOME III":"home_3","HOME UPS":"home_ups",0:"home_1",1:"home_2",2:"home_3",3:"home_ups",4:"home_5",5:"home_6"},Si={off:"Vypnuto",on:"Zapnuto",limited:"S omezením"},Ci={Vypnuto:"off",Zapnuto:"on",Omezeno:"limited",omezeno:"limited",vypnuto:"off",zapnuto:"on",Off:"off",On:"on",Limited:"limited",off:"off",on:"on",limited:"limited",0:"off",1:"on",2:"limited"};function Mo(t){const e=t.trim();if(e in Ci)return Ci[e];const i=e.toLowerCase(),r=Object.entries(Ci).find(([n])=>n.toLowerCase()===i);return r?r[1]:i.startsWith("omez")||i.includes("limit")?"limited":i.startsWith("zapn")||i==="on"?"on":(i.startsWith("vypn")||i==="off","off")}const Eo={off:"🚫",on:"💧",limited:"🚰"},Qn={cbb:"Inteligentní",manual:"Manuální"},Xn={cbb:"🤖",manual:"👤"},pn={CBB:"cbb",Manuální:"manual",Manual:"manual",Inteligentní:"cbb"},Do={set_box_mode:"🏠 Změna režimu boxu",set_grid_delivery:"💧 Změna nastavení přetoků",set_grid_delivery_limit:"🔢 Změna limitu přetoků",set_boiler_mode:"🔥 Změna nastavení bojleru",set_formating_mode:"🔋 Změna nabíjení baterie",set_battery_capacity:"⚡ Změna kapacity baterie"},hn={CBB:"Inteligentní",Manual:"Manuální",Manuální:"Manuální"},Jn={status:"idle",activity:"",queueCount:0,runningRequests:[],queuedRequests:[],allRequests:[],currentBoxMode:"home_1",currentGridDelivery:"off",currentGridLimit:0,currentBoilerMode:"cbb",pendingServices:new Map,changingServices:new Set};class Oo{constructor(){this.state={...Jn,pendingServices:new Map,changingServices:new Set},this.listeners=new Set,this.watcherUnsub=null,this.queueUpdateInterval=null,this.started=!1}start(){this.started||(this.started=!0,this.watcherUnsub=Xt.onEntityChange((e,i)=>{e&&this.shouldRefreshShield(e)&&this.refresh()}),this.refresh(),this.queueUpdateInterval=window.setInterval(()=>{this.state.allRequests.length>0&&this.notify()},1e3),y.debug("ShieldController started"))}stop(){var e;(e=this.watcherUnsub)==null||e.call(this),this.watcherUnsub=null,this.queueUpdateInterval!==null&&(clearInterval(this.queueUpdateInterval),this.queueUpdateInterval=null),this.started=!1,y.debug("ShieldController stopped")}subscribe(e){return this.listeners.add(e),e(this.state),()=>this.listeners.delete(e)}getState(){return this.state}shouldRefreshShield(e){return["service_shield_","box_prms_mode","boiler_manual_mode","invertor_prms_to_grid","invertor_prm1_p_max_feed_grid"].some(r=>e.includes(r))}refresh(){const e=ae();if(e)try{const i=e.findSensorId("service_shield_activity"),r=e.get(i),n=(r==null?void 0:r.attributes)??{},a=n.running_requests??[],s=n.queued_requests??[],l=e.findSensorId("service_shield_status"),c=e.findSensorId("service_shield_queue"),u=e.getString(l).value,p=e.getNumeric(c).value,g=e.getString(e.getSensorId("box_prms_mode")).value,m=e.getString(e.getSensorId("invertor_prms_to_grid")).value,b=e.getNumeric(e.getSensorId("invertor_prm1_p_max_feed_grid")).value,v=e.getString(e.getSensorId("boiler_manual_mode")).value,f=un[g.trim()]??"home_1",k=m.trim()==="Probíhá změna"?this.state.currentGridDelivery:Mo(m),C=pn[v.trim()]??"cbb",$=a.map((z,D)=>this.parseRequest(z,D,!0)),S=s.map((z,D)=>this.parseRequest(z,D+a.length,!1)),Y=[...$,...S],K=new Map,x=new Set;m.trim()==="Probíhá změna"&&x.add("grid_mode");for(const z of Y){const D=this.parseServiceRequest(z);D&&!K.has(D.type)&&(K.set(D.type,D.targetValue),x.add(D.type))}const H=u==="Running"||u==="running";this.state={status:H?"running":"idle",activity:(r==null?void 0:r.state)??"",queueCount:p,runningRequests:$,queuedRequests:S,allRequests:Y,currentBoxMode:f,currentGridDelivery:k,currentGridLimit:b,currentBoilerMode:C,pendingServices:K,changingServices:x},this.notify()}catch(i){y.error("ShieldController refresh failed",i)}}parseRequest(e,i,r){const n=e.service??"",a=Array.isArray(e.changes)?e.changes:[],s=e.started_at??e.queued_at??e.created_at??e.timestamp??e.created??"",l=Array.isArray(e.targets)?e.targets.map(m=>({param:String((m==null?void 0:m.param)??""),value:String((m==null?void 0:m.value)??(m==null?void 0:m.to)??""),entityId:String((m==null?void 0:m.entity_id)??(m==null?void 0:m.entityId)??""),from:String((m==null?void 0:m.from)??""),to:String((m==null?void 0:m.to)??(m==null?void 0:m.value)??""),current:String((m==null?void 0:m.current)??"")})):[],c=this.extractRequestParams(e.params),u=this.extractGridDeliveryStep(e,c),p=this.resolveRequestTargetValue(e,l,c,u);let g="mode_change";return n.includes("set_box_mode")?g="mode_change":n.includes("set_grid_delivery")&&!n.includes("limit")?g="grid_delivery":n.includes("grid_delivery_limit")||n.includes("set_grid_delivery")?g="grid_limit":n.includes("set_boiler_mode")?g="boiler_mode":n.includes("set_formating_mode")&&(g="battery_formating"),{id:`${n}_${i}_${s}`,type:g,status:r?"running":"queued",service:n,targetValue:p,changes:a,createdAt:s,position:i+1,description:typeof e.description=="string"?e.description:void 0,params:c,targets:l,traceId:typeof e.trace_id=="string"?e.trace_id:void 0,gridDeliveryStep:u}}parseServiceRequest(e){const i=e.service;if(!i)return null;const r=e.changes.length>0?e.changes[0]:"",n=e.params,a=e.gridDeliveryStep,s=this.extractStructuredTarget(e);if(i.includes("set_grid_delivery")&&s)return s;if(i.includes("set_grid_delivery")&&r.includes("p_max_feed_grid")){const u=r.match(/→\s*'?(\d+)'?/),p=u?u[1]:e.targetValue;return p?{type:"grid_limit",targetValue:p}:null}const l=r.match(/→\s*'([^']+)'/),c=l?l[1]:e.targetValue||"";if(i.includes("set_box_mode"))return{type:"box_mode",targetValue:c};if(i.includes("set_boiler_mode"))return{type:"boiler_mode",targetValue:c};if(i.includes("set_grid_delivery")&&r.includes("prms_to_grid"))return{type:"grid_mode",targetValue:c};if(i.includes("set_grid_delivery")){if(a==="limit"){const p=this.normalizeNumericTargetValue((n==null?void 0:n.limit)??e.targetValue);return p?{type:"grid_limit",targetValue:p}:null}if(a==="mode"){const p=this.normalizeModeTargetValue((n==null?void 0:n.mode)??e.targetValue);return p?{type:"grid_mode",targetValue:p}:null}const u=r.match(/→\s*'?(\d+)'?/);return u?{type:"grid_limit",targetValue:u[1]}:e.targetValue&&/^\d+$/.test(e.targetValue.trim())?{type:"grid_limit",targetValue:e.targetValue}:{type:"grid_mode",targetValue:c}}return null}extractRequestParams(e){if(!(!e||typeof e!="object"||Array.isArray(e)))return e}extractGridDeliveryStep(e,i){const r=(e==null?void 0:e.grid_delivery_step)??(i==null?void 0:i._grid_delivery_step);return typeof r=="string"?r:void 0}resolveRequestTargetValue(e,i,r,n){const a=this.extractStructuredTarget({service:(e==null?void 0:e.service)??"",targetValue:"",params:r,targets:i,gridDeliveryStep:n});if(a!=null&&a.targetValue)return a.targetValue;const s=e.target_value??e.target_display;return typeof s=="string"?s:""}extractStructuredTarget(e){if(!e.service.includes("set_grid_delivery"))return null;const i=e.gridDeliveryStep,r=e.params,n=e.targets??[];if(i==="limit"){const l=this.findTargetValue(n,["limit"]),c=this.normalizeNumericTargetValue(l??(r==null?void 0:r.limit)??e.targetValue);return c?{type:"grid_limit",targetValue:c}:null}if(i==="mode"){const l=this.findTargetValue(n,["mode"]),c=this.normalizeModeTargetValue(l??(r==null?void 0:r.mode)??e.targetValue);return c?{type:"grid_mode",targetValue:c}:null}const a=this.findTargetValue(n,["limit"]);if(a){const l=this.normalizeNumericTargetValue(a);if(l)return{type:"grid_limit",targetValue:l}}const s=this.findTargetValue(n,["mode"]);if(s){const l=this.normalizeModeTargetValue(s);if(l)return{type:"grid_mode",targetValue:l}}return null}findTargetValue(e,i){const r=new Set(i),n=e.find(a=>r.has(a.param));return(n==null?void 0:n.to)||(n==null?void 0:n.value)||void 0}normalizeNumericTargetValue(e){if(typeof e=="number"&&Number.isFinite(e))return String(Math.round(e));if(typeof e!="string")return"";const i=e.trim().match(/(\d+)/);return i?i[1]:""}normalizeModeTargetValue(e){if(typeof e!="string")return"";const i=e.trim();switch(i.toLowerCase()){case"off":return"Vypnuto";case"on":return"Zapnuto";case"limited":return"Omezeno";default:return i}}getBoxModeButtonState(e){const i=this.state.pendingServices.get("box_mode");return i?un[i]===e?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoxMode===e?"active":"idle"}getGridDeliveryButtonState(e){if(this.state.changingServices.has("grid_mode")){const i=this.state.pendingServices.get("grid_mode");return i&&Ci[i]===e?this.state.status==="running"?"processing":"pending":this.state.pendingServices.has("grid_limit")&&e==="limited"?this.state.status==="running"?"processing":"pending":"disabled-by-service"}return this.state.changingServices.has("grid_limit")?e==="limited"?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentGridDelivery===e?"active":"idle"}getBoilerModeButtonState(e){const i=this.state.pendingServices.get("boiler_mode");return i?pn[i]===e?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoilerMode===e?"active":"idle"}isAnyServiceChanging(){return this.state.changingServices.size>0}shouldProceedWithQueue(){return this.state.queueCount<3?!0:window.confirm(`⚠️ VAROVÁNÍ: Fronta již obsahuje ${this.state.queueCount} úkolů!

Každá změna může trvat až 10 minut.
Opravdu chcete přidat další úkol?`)}async setBoxMode(e){if(this.state.currentBoxMode===e&&!this.state.changingServices.has("box_mode"))return!1;const i=await X.callService("oig_cloud","set_box_mode",{mode:e,acknowledgement:!0});return i&&this.refresh(),i}async setGridDelivery(e,i){const r={acknowledgement:!0,warning:!0};e==="limited"&&i!=null?(this.state.currentGridDelivery==="limited"||(r.mode=e),r.limit=i):i!=null?r.limit=i:r.mode=e;const n=await X.callService("oig_cloud","set_grid_delivery",r);return n&&this.refresh(),n}async setBoilerMode(e){if(this.state.currentBoilerMode===e&&!this.state.changingServices.has("boiler_mode"))return!1;const i=await X.callService("oig_cloud","set_boiler_mode",{mode:e,acknowledgement:!0});return i&&this.refresh(),i}async removeFromQueue(e){const i=await X.callService("oig_cloud","shield_remove_from_queue",{position:e});return i&&this.refresh(),i}notify(){for(const e of this.listeners)try{e(this.state)}catch(i){y.error("ShieldController listener error",i)}}}const J=new Oo;var zo=Object.defineProperty,Ao=Object.getOwnPropertyDescriptor,se=(t,e,i,r)=>{for(var n=r>1?void 0:r?Ao(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&zo(e,i,n),n};const ft=Z;let Ot=class extends M{constructor(){super(...arguments),this.title="Energetické Toky",this.time="",this.showStatus=!1,this.alertCount=0,this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1}onStatusClick(){this.dispatchEvent(new CustomEvent("status-click",{bubbles:!0}))}onEditClick(){this.dispatchEvent(new CustomEvent("edit-click",{bubbles:!0}))}onResetClick(){this.dispatchEvent(new CustomEvent("reset-click",{bubbles:!0}))}onToggleLeftPanel(){this.dispatchEvent(new CustomEvent("toggle-left-panel",{bubbles:!0}))}onToggleRightPanel(){this.dispatchEvent(new CustomEvent("toggle-right-panel",{bubbles:!0}))}render(){const t=this.alertCount>0?"warning":"ok";return d`
      <h1 class="title">
        <span class="title-icon">⚡</span>
        ${this.title}
        <span class="version">V2</span>
        ${this.time?d`<span class="time">${this.time}</span>`:null}
      </h1>
      
      <div class="spacer"></div>
      
      ${this.showStatus?d`
        <div class="status-badge ${t}" @click=${this.onStatusClick}>
          ${this.alertCount>0?d`
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
    `}};Ot.styles=P`
    :host {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: ${ft(o.bgPrimary)};
      border-bottom: 1px solid ${ft(o.divider)};
      gap: 12px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
      color: ${ft(o.textPrimary)};
      margin: 0;
    }

    .title-icon { font-size: 20px; }

    .version {
      font-size: 11px;
      color: ${ft(o.textSecondary)};
      background: ${ft(o.bgSecondary)};
      padding: 2px 6px;
      border-radius: 4px;
    }

    .time {
      font-size: 13px;
      color: ${ft(o.textSecondary)};
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
      background: ${ft(o.warning)};
      color: #fff;
    }

    .status-badge.error {
      background: ${ft(o.error)};
      color: #fff;
    }

    .status-badge.ok {
      background: ${ft(o.success)};
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
      color: ${ft(o.textSecondary)};
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: ${ft(o.bgSecondary)};
      color: ${ft(o.textPrimary)};
    }

    .action-btn.active {
      background: ${ft(o.accent)};
      color: #fff;
    }
  `;se([h({type:String})],Ot.prototype,"title",2);se([h({type:String})],Ot.prototype,"time",2);se([h({type:Boolean})],Ot.prototype,"showStatus",2);se([h({type:Number})],Ot.prototype,"alertCount",2);se([h({type:Boolean})],Ot.prototype,"leftPanelCollapsed",2);se([h({type:Boolean})],Ot.prototype,"rightPanelCollapsed",2);Ot=se([E("oig-header")],Ot);function ta(t,e){let i=null;return function(...r){i!==null&&clearTimeout(i),i=window.setTimeout(()=>{t.apply(this,r),i=null},e)}}var Io=Object.defineProperty,Lo=Object.getOwnPropertyDescriptor,ui=(t,e,i,r)=>{for(var n=r>1?void 0:r?Lo(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&Io(e,i,n),n};const gn="oig_v2_theme";let Jt=class extends M{constructor(){super(...arguments),this.mode="auto",this.isDark=!1,this.breakpoint="desktop",this.width=1280,this.mediaQuery=null,this.resizeObserver=null,this.debouncedResize=ta(this.updateBreakpoint.bind(this),100),this.onMediaChange=t=>{this.mode==="auto"&&(this.isDark=t.matches,this.dispatchEvent(new CustomEvent("theme-changed",{detail:{isDark:this.isDark}})))},this.onThemeChange=()=>{this.detectTheme()}}connectedCallback(){super.connectedCallback(),this.loadTheme(),this.setupMediaQuery(),this.setupResizeObserver(),this.detectTheme(),window.addEventListener("oig-theme-change",this.onThemeChange)}disconnectedCallback(){var t,e;super.disconnectedCallback(),(t=this.mediaQuery)==null||t.removeEventListener("change",this.onMediaChange),(e=this.resizeObserver)==null||e.disconnect(),window.removeEventListener("oig-theme-change",this.onThemeChange)}loadTheme(){const t=localStorage.getItem(gn);t&&["light","dark","auto"].includes(t)&&(this.mode=t)}saveTheme(){localStorage.setItem(gn,this.mode)}setupMediaQuery(){this.mediaQuery=window.matchMedia("(prefers-color-scheme: dark)"),this.mediaQuery.addEventListener("change",this.onMediaChange)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(this.debouncedResize),this.resizeObserver.observe(document.documentElement),this.updateBreakpoint()}updateBreakpoint(){this.width=window.innerWidth,this.breakpoint=be(this.width)}detectTheme(){this.mode==="auto"?this.isDark=window.matchMedia("(prefers-color-scheme: dark)").matches:this.isDark=this.mode==="dark"}setTheme(t){this.mode=t,this.saveTheme(),this.detectTheme(),this.dispatchEvent(new CustomEvent("theme-changed",{detail:{mode:t,isDark:this.isDark}})),y.info("Theme changed",{mode:t,isDark:this.isDark})}getThemeInfo(){return{mode:this.mode,isDark:this.isDark,breakpoint:this.breakpoint,width:this.width}}render(){return d`
      <slot></slot>
    `}};Jt.styles=P`
    :host {
      display: contents;
    }
  `;ui([h({type:String})],Jt.prototype,"mode",2);ui([w()],Jt.prototype,"isDark",2);ui([w()],Jt.prototype,"breakpoint",2);ui([w()],Jt.prototype,"width",2);Jt=ui([E("oig-theme-provider")],Jt);var Bo=Object.defineProperty,Fo=Object.getOwnPropertyDescriptor,_r=(t,e,i,r)=>{for(var n=r>1?void 0:r?Fo(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&Bo(e,i,n),n};let Qe=class extends M{constructor(){super(...arguments),this.tabs=[],this.activeTab=""}onTabClick(t){t!==this.activeTab&&(this.activeTab=t,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tabId:t},bubbles:!0})))}isActive(t){return this.activeTab===t}render(){return d`
      ${this.tabs.map(t=>d`
        <button 
          class="tab ${this.isActive(t.id)?"active":""}"
          @click=${()=>this.onTabClick(t.id)}
        >
          ${t.icon?d`<span class="tab-icon">${t.icon}</span>`:null}
          <span>${t.label}</span>
        </button>
      `)}
    `}};Qe.styles=P`
    :host {
      display: flex;
      gap: 8px;
      padding: 0 16px;
      background: ${Z(o.bgPrimary)};
      border-bottom: 1px solid ${Z(o.divider)};
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
      color: ${Z(o.textSecondary)};
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab:hover {
      color: ${Z(o.textPrimary)};
      background: ${Z(o.bgSecondary)};
    }

    .tab.active {
      color: ${Z(o.accent)};
      border-bottom-color: ${Z(o.accent)};
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
  `;_r([h({type:Array})],Qe.prototype,"tabs",2);_r([h({type:String})],Qe.prototype,"activeTab",2);Qe=_r([E("oig-tabs")],Qe);var No=Object.defineProperty,Ro=Object.getOwnPropertyDescriptor,kr=(t,e,i,r)=>{for(var n=r>1?void 0:r?Ro(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&No(e,i,n),n};const Ho="oig_v2_layout_",lr=Z;let Xe=class extends M{constructor(){super(...arguments),this.editable=!1,this.breakpoint="desktop",this.onResize=ta(()=>{this.breakpoint=be(window.innerWidth)},100)}connectedCallback(){super.connectedCallback(),this.breakpoint=be(window.innerWidth),window.addEventListener("resize",this.onResize)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("resize",this.onResize)}updated(t){t.has("breakpoint")&&this.setAttribute("breakpoint",this.breakpoint)}resetLayout(){const t=`${Ho}${this.breakpoint}`;localStorage.removeItem(t),this.requestUpdate()}render(){return d`<slot></slot>`}};Xe.styles=P`
    :host {
      display: grid;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      background: ${lr(o.bgSecondary)};
    }

    :host([breakpoint='mobile']) { grid-template-columns: 1fr; }
    :host([breakpoint='tablet']) { grid-template-columns: repeat(2, 1fr); }
    :host([breakpoint='desktop']) { grid-template-columns: repeat(3, 1fr); }

    .grid-item {
      position: relative;
      background: ${lr(o.cardBg)};
      border-radius: 8px;
      box-shadow: ${lr(o.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .grid-item.editable { cursor: move; }
    .grid-item.editable:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .grid-item.dragging { opacity: 0.8; transform: scale(1.02); z-index: 100; }

    @media (max-width: 768px) {
      :host { gap: 12px; padding: 12px; }
    }
  `;kr([h({type:Boolean})],Xe.prototype,"editable",2);kr([w()],Xe.prototype,"breakpoint",2);Xe=kr([E("oig-grid")],Xe);const Wo=t=>{const e=t.trim();return e?e.endsWith("W")?e:`${e}W`:""};function fn(t,e){const i=e.has("box_mode"),r=t.get("box_mode"),n=e.has("grid_mode")||e.has("grid_limit"),a=t.get("grid_limit"),s=t.get("grid_mode");let l=null;if(a){const c=Wo(a);l=c?`→ ${c}`:null}else s&&(l=`→ ${s}`);return{inverterModeChanging:i,inverterModeText:r?`→ ${r}`:null,gridExportChanging:n,gridExportText:l}}var jo=Object.defineProperty,Vo=Object.getOwnPropertyDescriptor,Qi=(t,e,i,r)=>{for(var n=r>1?void 0:r?Vo(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&jo(e,i,n),n};let we=class extends M{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1}get fillHeight(){return Math.max(0,Math.min(100,this.soc))/100*54}get fillY(){return 13+(54-this.fillHeight)}render(){return d`
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
    `}};we.styles=P`
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
  `;Qi([h({type:Number})],we.prototype,"soc",2);Qi([h({type:Boolean})],we.prototype,"charging",2);Qi([h({type:Boolean})],we.prototype,"gridCharging",2);we=Qi([E("oig-battery-gauge")],we);var qo=Object.defineProperty,Yo=Object.getOwnPropertyDescriptor,Xi=(t,e,i,r)=>{for(var n=r>1?void 0:r?Yo(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&qo(e,i,n),n};let $e=class extends M{constructor(){super(...arguments),this.power=0,this.percent=0,this.maxPower=5400}get isNight(){return this.percent<2}get level(){return this.percent<2?"night":this.percent<20?"low":this.percent<65?"mid":"high"}get sunColor(){const t=this.level;return t==="low"?"#b0bec5":t==="mid"?"#ffd54f":"#ffb300"}get rayLen(){const t=this.level;return t==="low"?4:t==="mid"?7:10}get rayOpacity(){const t=this.level;return t==="low"?.5:t==="mid"?.8:1}get coreRadius(){const t=this.level;return t==="low"?7:t==="mid"?9:11}renderMoon(){return Et`
      <circle cx="24" cy="24" r="20" fill="#3949ab" opacity="0.28"/>
      <g class="moon-body">
        <path d="M24 6 A18 18 0 1 0 24 42 A13 13 0 1 1 24 6Z" fill="#cfd8dc" opacity="0.95"/>
      </g>
      <circle class="star" cx="7" cy="10" r="1.5" fill="#e8eaf6" style="animation-delay:0s"/>
      <circle class="star" cx="41" cy="7" r="1.8" fill="#e8eaf6" style="animation-delay:0.7s"/>
      <circle class="star" cx="5" cy="30" r="1.2" fill="#c5cae9" style="animation-delay:1.4s"/>
      <circle class="star" cx="6" cy="44" r="1.0" fill="#c5cae9" style="animation-delay:2.1s"/>
      <circle class="star" cx="42" cy="39" r="1.3" fill="#e8eaf6" style="animation-delay:2.8s"/>
    `}renderSun(){const i=this.coreRadius,r=i+3,n=r+this.rayLen,a=this.sunColor,s=this.rayOpacity,c=[0,45,90,135,180,225,270,315].map(p=>{const g=p*Math.PI/180,m=24+Math.cos(g)*r,b=24+Math.sin(g)*r,v=24+Math.cos(g)*n,f=24+Math.sin(g)*n;return Et`
        <line class="ray"
          x1="${m}" y1="${b}" x2="${v}" y2="${f}"
          stroke="${a}" stroke-width="2.5" opacity="${s}"
        />
      `}),u=this.level==="low";return Et`
      <!-- Paprsky obaleny v <g> pro CSS rotaci -->
      <g class="rays-group">
        ${c}
      </g>
      <circle class="sun-core" cx="${24}" cy="${24}" r="${i}" fill="${a}" />
      ${u?Et`
        <!-- Jednoduchý obláček -->
        <g class="cloud" opacity="0.85">
          <ellipse cx="30" cy="30" rx="9" ry="6" fill="#90a4ae"/>
          <ellipse cx="24" cy="32" rx="7" ry="5" fill="#90a4ae"/>
          <ellipse cx="36" cy="32" rx="6" ry="4.5" fill="#90a4ae"/>
        </g>
      `:""}
    `}render(){return this.percent>=20?this.classList.add("solar-active"):this.classList.remove("solar-active"),d`
      <svg viewBox="0 0 48 48">
        ${this.isNight?this.renderMoon():this.renderSun()}
      </svg>
    `}};$e.styles=P`
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
  `;Xi([h({type:Number})],$e.prototype,"power",2);Xi([h({type:Number})],$e.prototype,"percent",2);Xi([h({type:Number})],$e.prototype,"maxPower",2);$e=Xi([E("oig-solar-icon")],$e);var Uo=Object.defineProperty,Go=Object.getOwnPropertyDescriptor,pi=(t,e,i,r)=>{for(var n=r>1?void 0:r?Go(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&Uo(e,i,n),n};let te=class extends M{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1,this.discharging=!1,this._clipId=`batt-clip-${Math.random().toString(36).slice(2)}`}get fillColor(){return this.gridCharging?"#42a5f5":this.soc>50?"#4caf50":this.soc>20?"#ff9800":"#f44336"}get fillHeight(){return Math.max(1,Math.min(100,this.soc)/100*48)}get fillY(){return 14+(48-this.fillHeight)}get stripeColor(){return this.gridCharging?"#90caf9":"#a5d6a7"}render(){const t=this.charging||this.gridCharging,e=this.soc>=25;return d`
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
        ${t?Et`
          <rect
            class="charge-stripe active"
            x="4" y="52" width="24" height="8" rx="2"
            fill="${this.stripeColor}"
            clip-path="url(#${this._clipId})"
          />
        `:""}

        <!-- SoC text uvnitř -->
        ${e?Et`
          <text class="soc-text" x="16" y="${this.fillY+this.fillHeight/2}">
            ${Math.round(this.soc)}%
          </text>
        `:""}
      </svg>
    `}};te.styles=P`
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
  `;pi([h({type:Number})],te.prototype,"soc",2);pi([h({type:Boolean})],te.prototype,"charging",2);pi([h({type:Boolean})],te.prototype,"gridCharging",2);pi([h({type:Boolean})],te.prototype,"discharging",2);te=pi([E("oig-battery-icon")],te);var Ko=Object.defineProperty,Zo=Object.getOwnPropertyDescriptor,ea=(t,e,i,r)=>{for(var n=r>1?void 0:r?Zo(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&Ko(e,i,n),n};let Oi=class extends M{constructor(){super(...arguments),this.power=0}get mode(){return this.power>50?"importing":this.power<-50?"exporting":"idle"}render(){const t=this.mode;return d`
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
        ${t!=="idle"?d`
          <path
            class="arrow ${t==="importing"?"import":"export"}"
            d="${t==="importing"?"M 24,10 L 24,4 M 24,4 L 20,8 M 24,4 L 28,8":"M 24,4 L 24,10 M 24,10 L 20,6 M 24,10 L 28,6"}"
          />
        `:""}
      </svg>
    `}};Oi.styles=P`
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
  `;ea([h({type:Number})],Oi.prototype,"power",2);Oi=ea([E("oig-grid-icon")],Oi);var Qo=Object.defineProperty,Xo=Object.getOwnPropertyDescriptor,Ji=(t,e,i,r)=>{for(var n=r>1?void 0:r?Xo(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&Qo(e,i,n),n};let _e=class extends M{constructor(){super(...arguments),this.power=0,this.maxPower=1e4,this.boilerActive=!1}get percent(){return Math.min(100,this.power/Math.max(1,this.maxPower)*100)}get fillColor(){const t=this.percent;return t<15?"#546e7a":t<40?"#f06292":t<70?"#e91e63":"#c62828"}get level(){const t=this.percent;return t<15?"low":t<60?"mid":"high"}get windowColor(){const t=this.level;return t==="low"?"#37474f":t==="mid"?"#ffd54f":"#ffb300"}render(){const t=this.percent,e=24,i=22,r=Math.max(1,t/100*e),n=i+(e-r),a=this.level;return d`
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
          x="8" y="${n}" width="32" height="${r}"
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
        ${this.boilerActive?Et`
          <circle class="boiler-dot" cx="10" cy="43" r="3.5" fill="#ff5722" opacity="0.9"/>
          <text x="10" y="43" text-anchor="middle" dominant-baseline="middle" font-size="5" fill="white">🔥</text>
        `:""}
      </svg>
    `}};_e.styles=P`
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
  `;Ji([h({type:Number})],_e.prototype,"power",2);Ji([h({type:Number})],_e.prototype,"maxPower",2);Ji([h({type:Boolean})],_e.prototype,"boilerActive",2);_e=Ji([E("oig-house-icon")],_e);var Jo=Object.defineProperty,tl=Object.getOwnPropertyDescriptor,hi=(t,e,i,r)=>{for(var n=r>1?void 0:r?tl(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&Jo(e,i,n),n};let ee=class extends M{constructor(){super(...arguments),this.mode="",this.bypassActive=!1,this.hasAlarm=!1,this.plannerAuto=!1}get modeType(){return this.hasAlarm?"alarm":this.bypassActive?"bypass":this.mode.includes("UPS")?"ups":"normal"}render(){const t=this.modeType;return d`
      <svg viewBox="0 0 48 48">
        <!-- Hlavní box střídače -->
        <rect
          class="box ${t}"
          x="4" y="8" width="40" height="34" rx="5"
        />

        <!-- Sinusoida výstupu -->
        <path class="sine-out ${t}" d="${"M 10,28 C 14,28 14,20 18,22 C 22,24 22,32 26,32 C 30,32 30,20 34,22 C 38,24 38,28 38,28"}"/>

        <!-- UPS blesk -->
        ${t==="ups"?Et`
          <path class="ups-bolt active"
            d="M 25,12 L 20,26 L 24,26 L 23,36 L 28,22 L 24,22 Z"
          />
        `:""}

        <!-- Bypass výstraha — trojúhelník nahoře -->
        ${t==="bypass"?Et`
          <polygon
            class="warning-triangle active"
            points="24,6 18,16 30,16"
          />
          <text x="24" y="15" text-anchor="middle" dominant-baseline="middle"
            font-size="6" font-weight="bold" fill="#fff">!</text>
        `:""}

        <!-- Alarm kroužek -->
        ${t==="alarm"?Et`
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
    `}};ee.styles=P`
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
  `;hi([h({type:String})],ee.prototype,"mode",2);hi([h({type:Boolean})],ee.prototype,"bypassActive",2);hi([h({type:Boolean})],ee.prototype,"hasAlarm",2);hi([h({type:Boolean})],ee.prototype,"plannerAuto",2);ee=hi([E("oig-inverter-icon")],ee);var el=Object.defineProperty,il=Object.getOwnPropertyDescriptor,At=(t,e,i,r)=>{for(var n=r>1?void 0:r?il(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&el(e,i,n),n};const W=Z,mn=new URLSearchParams(window.location.search),rl=mn.get("sn")||mn.get("inverter_sn")||"2206237016",nl=t=>`sensor.oig_${rl}_${t}`,cr="oig_v2_flow_layout_",Kt=["solar","battery","inverter","grid","house"],al={solar:{top:"0%",left:"0%"},house:{top:"0%",left:"65%"},inverter:{top:"35%",left:"35%"},grid:{top:"70%",left:"0%"},battery:{top:"70%",left:"65%"}};function I(t){return()=>X.openEntityDialog(nl(t))}let kt=class extends M{constructor(){super(...arguments),this.data=$r,this.editMode=!1,this.pendingServices=new Map,this.changingServices=new Set,this.shieldStatus="idle",this.shieldQueueCount=0,this.shieldUnsub=null,this.expandedNodes=new Set,this.customPositions={},this.draggedNodeId=null,this.dragStartX=0,this.dragStartY=0,this.dragStartTop=0,this.dragStartLeft=0,this.onShieldUpdate=t=>{this.pendingServices=t.pendingServices,this.changingServices=t.changingServices,this.shieldStatus=t.status,this.shieldQueueCount=t.queueCount},this.handleDragStart=t=>{if(!this.editMode)return;t.preventDefault(),t.stopPropagation();const i=t.target.closest(".node");if(!i)return;const r=this.findNodeId(i);if(!r)return;this.draggedNodeId=r,i.classList.add("dragging");const n=i.getBoundingClientRect();this.dragStartX=t.clientX,this.dragStartY=t.clientY,this.dragStartTop=n.top,this.dragStartLeft=n.left},this.handleTouchStart=t=>{if(!this.editMode)return;t.preventDefault();const i=t.target.closest(".node");if(!i)return;const r=this.findNodeId(i);if(!r)return;this.draggedNodeId=r,i.classList.add("dragging");const n=t.touches[0],a=i.getBoundingClientRect();this.dragStartX=n.clientX,this.dragStartY=n.clientY,this.dragStartTop=a.top,this.dragStartLeft=a.left},this.handleDragMove=t=>{!this.draggedNodeId||!this.editMode||(t.preventDefault(),this.updateDragPosition(t.clientX,t.clientY))},this.handleTouchMove=t=>{if(!this.draggedNodeId||!this.editMode)return;t.preventDefault();const e=t.touches[0];this.updateDragPosition(e.clientX,e.clientY)},this.handleDragEnd=t=>{var r;if(!this.draggedNodeId||!this.editMode)return;const e=(r=this.shadowRoot)==null?void 0:r.querySelector(".flow-grid"),i=e==null?void 0:e.querySelector(`.node-${this.draggedNodeId}`);i&&i.classList.remove("dragging"),this.saveLayout(),this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0})),this.draggedNodeId=null},this.handleTouchEnd=t=>{this.handleDragEnd(t)}}connectedCallback(){super.connectedCallback(),this.loadSavedLayout(),this.shieldUnsub=J.subscribe(this.onShieldUpdate)}disconnectedCallback(){var t;super.disconnectedCallback(),this.removeDragListeners(),(t=this.shieldUnsub)==null||t.call(this),this.shieldUnsub=null}updated(t){t.has("editMode")&&(this.editMode?(this.setAttribute("editmode",""),this.loadSavedLayout(),this.requestUpdate(),this.updateComplete.then(()=>this.applySavedPositions())):(this.removeAttribute("editmode"),this.removeDragListeners(),this.clearInlinePositions(),this.updateComplete.then(()=>this.applyCustomPositions()))),!this.editMode&&this.hasCustomLayout&&this.updateComplete.then(()=>this.applyCustomPositions())}loadSavedLayout(){const t=be(window.innerWidth),e=`${cr}${t}`;try{const i=localStorage.getItem(e);i&&(this.customPositions=JSON.parse(i),y.debug("[FlowNode] Loaded layout for "+t))}catch{}}applySavedPositions(){var e;if(!this.editMode)return;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".flow-grid");if(t){for(const i of Kt){const r=this.customPositions[i];if(!r)continue;const n=t.querySelector(`.node-${i}`);n&&(n.style.top=r.top,n.style.left=r.left)}this.initDragListeners()}}clearInlinePositions(){var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".flow-grid");if(t)for(const i of Kt){const r=t.querySelector(`.node-${i}`);r&&(r.style.top="",r.style.left="")}}saveLayout(){const t=be(window.innerWidth),e=`${cr}${t}`;try{localStorage.setItem(e,JSON.stringify(this.customPositions)),y.debug("[FlowNode] Saved layout for "+t)}catch{}}toggleExpand(t,e){const i=e.target;if(i.closest(".clickable")||i.closest(".indicator")||i.closest(".forecast-badge")||i.closest(".node-value")||i.closest(".node-subvalue")||i.closest(".gc-plan-btn"))return;const r=new Set(this.expandedNodes);r.has(t)?r.delete(t):r.add(t),this.expandedNodes=r}nodeClass(t,e=""){const i=this.expandedNodes.has(t)?" expanded":"";return`node node-${t}${i}${e?" "+e:""}`}get hasCustomLayout(){return Kt.some(t=>{const e=this.customPositions[t];return(e==null?void 0:e.top)!=null&&(e==null?void 0:e.left)!=null})}applyCustomPositions(){var e;if(this.editMode||!this.hasCustomLayout)return;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".flow-grid");if(t)for(const i of Kt){const r=t.querySelector(`.node-${i}`);if(!r)continue;const n=this.customPositions[i]??al[i];r.style.top=n.top,r.style.left=n.left}}resetLayout(){const t=be(window.innerWidth),e=`${cr}${t}`;localStorage.removeItem(e),this.customPositions={},this.clearInlinePositions(),this.editMode&&this.requestUpdate(),y.debug("[FlowNode] Reset layout for "+t)}initDragListeners(){var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".flow-grid");if(t){for(const i of Kt){const r=t.querySelector(`.node-${i}`);r&&(r.addEventListener("mousedown",this.handleDragStart),r.addEventListener("touchstart",this.handleTouchStart,{passive:!1}))}document.addEventListener("mousemove",this.handleDragMove),document.addEventListener("mouseup",this.handleDragEnd),document.addEventListener("touchmove",this.handleTouchMove,{passive:!1}),document.addEventListener("touchend",this.handleTouchEnd)}}removeDragListeners(){document.removeEventListener("mousemove",this.handleDragMove),document.removeEventListener("mouseup",this.handleDragEnd),document.removeEventListener("touchmove",this.handleTouchMove),document.removeEventListener("touchend",this.handleTouchEnd)}findNodeId(t){for(const i of Kt)if(t.classList.contains(`node-${i}`))return i;const e=t.closest('[class*="node-"]');if(!e)return null;for(const i of Kt)if(e.classList.contains(`node-${i}`))return i;return null}updateDragPosition(t,e){var $;if(!this.draggedNodeId)return;const i=($=this.shadowRoot)==null?void 0:$.querySelector(".flow-grid");if(!i)return;const r=i.querySelector(`.node-${this.draggedNodeId}`);if(!r)return;const n=i.getBoundingClientRect(),a=r.getBoundingClientRect(),s=t-this.dragStartX,l=e-this.dragStartY,c=this.dragStartLeft+s,u=this.dragStartTop+l,p=n.left,g=n.right-a.width,m=n.top,b=n.bottom-a.height,v=Math.max(p,Math.min(g,c)),f=Math.max(m,Math.min(b,u)),k=(v-n.left)/n.width*100,C=(f-n.top)/n.height*100;r.style.left=`${k}%`,r.style.top=`${C}%`,this.customPositions[this.draggedNodeId]={top:`${C}%`,left:`${k}%`},this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0}))}renderSolar(){const t=this.data,e=t.solarPercent,i=e<2,r=i?"linear-gradient(135deg, rgba(57,73,171,0.25) 0%, rgba(26,35,126,0.18) 100%)":Be.solar,n=i?"rgba(121,134,203,0.5)":Fe.solar,a=i?"position:absolute;top:4px;left:6px;font-size:11px;background:rgba(57,73,171,0.35);color:#9fa8da;padding:3px 8px;border-radius:4px;border:1px solid rgba(121,134,203,0.4)":"position:absolute;top:4px;left:6px;font-size:9px",s=i?"position:absolute;top:4px;right:6px;font-size:11px;background:rgba(57,73,171,0.35);color:#9fa8da;padding:3px 8px;border-radius:4px;border:1px solid rgba(121,134,203,0.4)":"position:absolute;top:4px;right:6px;font-size:9px";return d`
      <div class="${this.nodeClass("solar",i?"night":"")}" style="--node-gradient: ${r}; --node-border: ${n};"
        @click=${l=>this.toggleExpand("solar",l)}>
        <div class="node-header" style="margin-top:16px">
          <oig-solar-icon .power=${t.solarPower} .percent=${e} .maxPower=${5400}></oig-solar-icon>
          <span class="node-label">Solár</span>
        </div>
        <div class="node-value" @click=${I("actual_fv_total")}>
          ${Re(t.solarPower)}
        </div>
        <div class="node-subvalue" @click=${I("dc_in_fv_ad")}>
          Dnes: ${(t.solarToday/1e3).toFixed(2)} kWh
        </div>
        <div class="node-subvalue" @click=${I("solar_forecast")}>
          Zítra: ${t.solarForecastTomorrow.toFixed(1)} kWh
        </div>

        <button class="indicator" style="${a}" @click=${I("solar_forecast")}>
          🔮 ${t.solarForecastToday.toFixed(1)} kWh
        </button>
        <button class="indicator" style="${s}" @click=${I("solar_forecast")}>
          🌅 ${t.solarForecastTomorrow.toFixed(1)} kWh
        </button>

        <div class="detail-section">
          <div class="solar-strings">
            <div>
              <div class="detail-header">🏭 String 1</div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${I("extended_fve_voltage_1")}>${Math.round(t.solarV1)}V</button>
              </div>
              <div class="detail-row">
                <span class="icon">〰️</span>
                <button class="clickable" @click=${I("extended_fve_current_1")}>${t.solarI1.toFixed(1)}A</button>
              </div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${I("dc_in_fv_p1")}>${Math.round(t.solarP1)} W</button>
              </div>
            </div>
            <div>
              <div class="detail-header">🏭 String 2</div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${I("extended_fve_voltage_2")}>${Math.round(t.solarV2)}V</button>
              </div>
              <div class="detail-row">
                <span class="icon">〰️</span>
                <button class="clickable" @click=${I("extended_fve_current_2")}>${t.solarI2.toFixed(1)}A</button>
              </div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${I("dc_in_fv_p2")}>${Math.round(t.solarP2)} W</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `}openGridChargingDialog(){this.dispatchEvent(new CustomEvent("oig-grid-charging-open",{bubbles:!0,composed:!0,detail:{data:this.data.gridChargingPlan}}))}getBatteryStatus(){const t=this.data;return t.batteryPower>10?{text:`⚡ Nabíjení${t.timeToFull?` (${t.timeToFull})`:""}`,cls:"status-charging pulse"}:t.batteryPower<-10?{text:`⚡ Vybíjení${t.timeToEmpty?` (${t.timeToEmpty})`:""}`,cls:"status-discharging pulse"}:{text:"◉ Klid",cls:"status-idle"}}getBalancingIndicator(){const t=this.data,e=t.balancingState;return e!=="charging"&&e!=="holding"&&e!=="completed"?{show:!1,text:"",icon:"",cls:""}:e==="charging"?{show:!0,text:`Nabíjení${t.balancingTimeRemaining?` (${t.balancingTimeRemaining})`:""}`,icon:"⚡",cls:"charging"}:e==="holding"?{show:!0,text:`Držení${t.balancingTimeRemaining?` (${t.balancingTimeRemaining})`:""}`,icon:"⏸️",cls:"holding"}:{show:!0,text:"Dokončeno",icon:"✅",cls:"completed"}}renderBattery(){const t=this.data,e=this.getBatteryStatus(),i=this.getBalancingIndicator(),r=t.batteryPower>10,n=t.batteryTemp>25?"🌡️":t.batteryTemp<15?"🧊":"🌡️",a=t.batteryTemp>25?"temp-hot":t.batteryTemp<15?"temp-cold":"";return d`
      <div class="${this.nodeClass("battery")}" style="--node-gradient: ${Be.battery}; --node-border: ${Fe.battery};"
        @click=${s=>this.toggleExpand("battery",s)}>

        <div class="node-header">
          <!-- Jediná ikona: SVG baterie nahrazuje gauge + emoji -->
          <oig-battery-icon
            .soc=${t.batterySoC}
            ?charging=${r&&!t.isGridCharging}
            ?gridCharging=${t.isGridCharging&&r}
            ?discharging=${t.batteryPower<-10}
          ></oig-battery-icon>
          <span class="node-label">Baterie</span>
        </div>

        <div class="node-value" @click=${I("batt_bat_c")}>
          ${Math.round(t.batterySoC)} %
        </div>
        <div class="node-subvalue" @click=${I("batt_batt_comp_p")}>
          ${Re(t.batteryPower)}
        </div>

        <div class="node-status ${e.cls}">${e.text}</div>

        ${t.isGridCharging?d`
          <span class="grid-charging-badge">⚡🔌 Síťové nabíjení</span>
        `:A}
        ${i.show?d`
          <span class="balancing-indicator ${i.cls}">
            <span>${i.icon}</span>
            <span>${i.text}</span>
          </span>
        `:A}

        <div class="battery-indicators">
          <button class="indicator" @click=${I("extended_battery_voltage")}>
            ⚡ ${t.batteryVoltage.toFixed(1)} V
          </button>
          <button class="indicator" @click=${I("extended_battery_current")}>
            〰️ ${t.batteryCurrent.toFixed(1)} A
          </button>
          <button class="indicator ${a}" @click=${I("extended_battery_temperature")}>
            ${n} ${t.batteryTemp.toFixed(1)} °C
          </button>
        </div>

        <!-- Energie + gc-plan vždy viditelné (ne v detail-section) -->
        <div class="battery-energy-section">
          <div class="detail-header">⚡ Energie dnes</div>
          <div class="energy-grid">
            <div class="detail-row">
              <span class="icon">⬆️</span>
              <button class="clickable" @click=${I("computed_batt_charge_energy_today")}>
                Nab: ${Gt(t.batteryChargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">⬇️</span>
              <button class="clickable" @click=${I("computed_batt_discharge_energy_today")}>
                Vyb: ${Gt(t.batteryDischargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">☀️</span>
              <button class="clickable" @click=${I("computed_batt_charge_fve_energy_today")}>
                FVE: ${Gt(t.batteryChargeSolar)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">🔌</span>
              <button class="clickable" @click=${I("computed_batt_charge_grid_energy_today")}>
                Síť: ${Gt(t.batteryChargeGrid)}
              </button>
            </div>
          </div>

          <!-- Grid charging plan — always visible badge -->
          <div class="grid-charging-plan-summary">
            <button class="gc-plan-btn ${t.gridChargingPlan.hasBlocks?"has-plan":""}"
              @click=${s=>{s.stopPropagation(),this.openGridChargingDialog()}}>
              🔌
              ${t.gridChargingPlan.hasBlocks?d`Plán: ${t.gridChargingPlan.totalEnergyKwh.toFixed(1)} kWh`:d`Plán nabíjení`}
              <span class="gc-plan-arrow">›</span>
            </button>
          </div>
        </div>
      </div>
    `}getInverterModeDesc(){const t=this.data.inverterMode;return t.includes("Home 1")?"🏠 Home 1: Max baterie + FVE":t.includes("Home 2")?"🔋 Home 2: Šetří baterii":t.includes("Home 3")?"☀️ Home 3: Priorita nabíjení":t.includes("UPS")?"⚡ UPS: Vše ze sítě":`⚙️ ${t||"--"}`}renderInverter(){const t=this.data,e=Os(t.inverterMode),i=t.bypassStatus.toLowerCase()==="on"||t.bypassStatus==="1",r=t.inverterTemp>35?"🔥":"🌡️",n=zs(t.inverterGridMode),a=(t.inverterGridLimit/1e3).toFixed(1),s=fn(this.pendingServices,this.changingServices);let l="planner-unknown",c="Plánovač: N/A";return t.plannerAutoMode===!0?(l="planner-auto",c="Plánovač: AUTO"):t.plannerAutoMode===!1&&(l="planner-off",c="Plánovač: VYPNUTO"),d`
      <div class="${this.nodeClass("inverter",s.inverterModeChanging?"mode-changing":"")}" style="--node-gradient: ${Be.inverter}; --node-border: ${Fe.inverter};"
        @click=${u=>this.toggleExpand("inverter",u)}>
        <div class="node-header">
          <oig-inverter-icon
            .mode=${t.inverterMode}
            ?bypassActive=${i}
            ?hasAlarm=${t.notificationsError>0}
            ?plannerAuto=${t.plannerAutoMode===!0}
          ></oig-inverter-icon>
          <span class="node-label">Střídač</span>
        </div>
        ${i?d`
          <button class="bypass-active bypass-warning" style="position:absolute;top:4px;right:6px;font-size:9px" @click=${I("bypass_status")}>
            🔴 Bypass
          </button>
        `:A}

        <div class="node-value" @click=${I("box_prms_mode")}>
          ${s.inverterModeChanging?d`<span class="spinner spinner--small"></span>`:A}
          ${e.icon} ${e.text}
        </div>
        <div class="node-subvalue">${this.getInverterModeDesc()}</div>
        ${s.inverterModeText?d`<div class="pending-text">${s.inverterModeText}</div>`:A}

        <div class="planner-badge ${l}">${c}</div>
        <div class="shield-badge ${this.shieldStatus==="running"?"shield-running":"shield-idle"}">
          🛡️ ${this.shieldStatus==="running"?"Zpracovávám":"Nečinný"}${this.shieldQueueCount>0?d` <span class="shield-queue">(${this.shieldQueueCount})</span>`:A}
        </div>

        <div class="battery-indicators" style="margin-top:6px">
          <button class="indicator" @click=${I("box_temp")}>
            ${r} ${t.inverterTemp.toFixed(1)} °C
          </button>
          <button class="indicator ${i?"bypass-warning":""}" @click=${I("bypass_status")}>
            <span id="inverter-bypass-icon">${i?"🔴":"🟢"}</span> Bypass: ${i?"ON":"OFF"}
          </button>
        </div>

        <!-- Přetoky + notifikace — vždy viditelné -->
        <div class="battery-indicators" style="margin-top:4px">
          <button class="indicator" @click=${I("invertor_prms_to_grid")}>
            ${n.icon} ${n.display}
          </button>
          <button class="clickable notif-badge ${t.notificationsError>0?"has-error":t.notificationsUnread>0?"has-unread":"indicator"}"
            @click=${I("notification_count_unread")}>
            🔔 ${t.notificationsUnread}/${t.notificationsError}
          </button>
        </div>

        <div class="detail-section">
          <div class="detail-header">🌊 Přetoky — limit</div>
          <div class="detail-row">
            <button class="clickable" @click=${I("invertor_prm1_p_max_feed_grid")}>
              Limit: ${a} kW
            </button>
          </div>
        </div>
      </div>
    `}getGridStatus(){const t=this.data.gridPower;return t>10?{text:"⬇ Import",cls:"status-importing pulse"}:t<-10?{text:"⬆ Export",cls:"status-exporting pulse"}:{text:"◉ Žádný tok",cls:"status-idle"}}renderGrid(){const t=this.data,e=this.getGridStatus(),i=fn(this.pendingServices,this.changingServices);return d`
      <div class="${this.nodeClass("grid",i.gridExportChanging?"mode-changing":"")}" style="--node-gradient: ${Be.grid}; --node-border: ${Fe.grid};"
        @click=${r=>this.toggleExpand("grid",r)}>

        <!-- Tarif badge vlevo nahoře -->
        <button class="indicator" style="position:absolute;top:4px;left:6px;font-size:9px" @click=${I("current_tariff")}>
          ${Ds(t.currentTariff)}
        </button>
        <!-- Frekvence vpravo nahoře -->
        <button class="indicator" style="position:absolute;top:4px;right:6px;font-size:9px" @click=${I("ac_in_aci_f")}>
          ${t.gridFrequency.toFixed(1)} Hz
        </button>

        <!-- SVG ikona -->
        <div class="node-svg-icon" style="margin-top:14px">
          <oig-grid-icon .power=${t.gridPower} style="width:44px;height:44px"></oig-grid-icon>
        </div>
        <div class="node-label" style="margin-bottom:2px">Síť</div>

        <!-- Hlavní hodnota -->
        <div class="node-value" @click=${I("actual_aci_wtotal")}>
          ${Re(t.gridPower)}
        </div>
        <div class="node-status ${e.cls}">${e.text}</div>
        ${i.gridExportText?d`
          <div class="pending-text">
            <span class="spinner spinner--small"></span>
            ${i.gridExportText}
          </div>
        `:A}

        <!-- Ceny — vždy viditelné jako rychlý přehled -->
        <div class="prices-row" style="margin-top:4px">
          <div class="price-cell">
            <span class="price-label">⬇ Spot</span>
            <button class="price-val price-spot" @click=${I("spot_price_current_15min")}>
              ${t.spotPrice.toFixed(2)} Kč
            </button>
          </div>
          <div class="energy-divider-v"></div>
          <div class="price-cell">
            <span class="price-label">⬆ Výkup</span>
            <button class="price-val price-export" @click=${I("export_price_current_15min")}>
              ${t.exportPrice.toFixed(2)} Kč
            </button>
          </div>
        </div>

        <!-- 3 fáze — vždy viditelné -->
        <div class="phases-grid" style="margin-top:6px">
          <div class="phase-cell">
            <span class="phase-label">L1</span>
            <button class="phase-val" @click=${I("actual_aci_wr")}>${Math.round(t.gridL1P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${W(o.textSecondary)}" @click=${I("ac_in_aci_vr")}>${Math.round(t.gridL1V)}V</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L2</span>
            <button class="phase-val" @click=${I("actual_aci_ws")}>${Math.round(t.gridL2P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${W(o.textSecondary)}" @click=${I("ac_in_aci_vs")}>${Math.round(t.gridL2V)}V</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L3</span>
            <button class="phase-val" @click=${I("actual_aci_wt")}>${Math.round(t.gridL3P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${W(o.textSecondary)}" @click=${I("ac_in_aci_vt")}>${Math.round(t.gridL3V)}V</button>
          </div>
        </div>

        <div class="detail-section">
          <!-- Energie dnes — odběr vlevo, dodávka vpravo -->
          <div class="energy-symmetric">
            <div class="energy-side">
              <span class="energy-side-label">⬇ Odběr</span>
              <button class="energy-side-val energy-import" @click=${I("ac_in_ac_ad")}>
                ${Gt(t.gridImportToday)}
              </button>
            </div>
            <div class="energy-divider-v"></div>
            <div class="energy-side">
              <span class="energy-side-label">⬆ Dodávka</span>
              <button class="energy-side-val energy-export" @click=${I("ac_in_ac_pd")}>
                ${Gt(t.gridExportToday)}
              </button>
            </div>
          </div>

        </div>
      </div>
    `}renderHouse(){const t=this.data;return d`
      <div class="${this.nodeClass("house")}" style="--node-gradient: ${Be.house}; --node-border: ${Fe.house};"
        @click=${e=>this.toggleExpand("house",e)}>
        <div class="node-header">
          <oig-house-icon
            .power=${t.housePower}
            .maxPower=${t.boilerInstallPower>0?1e4:8e3}
            ?boilerActive=${t.boilerIsUse}
          ></oig-house-icon>
          <span class="node-label">Spotřeba</span>
        </div>

        <div class="node-value" @click=${I("actual_aco_p")}>
          ${Re(t.housePower)}
        </div>
        <div class="node-subvalue" @click=${I("ac_out_en_day")}>
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

        ${t.boilerIsUse?d`
          <div class="boiler-section">
            <div class="detail-header">🔥 Bojler</div>
            <div class="detail-row">
              <span class="icon">⚡</span>
              <span>Výkon:</span>
              <button class="clickable" @click=${I("boiler_current_cbb_w")}>
                ${Re(t.boilerPower)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">📊</span>
              <span>Nabito:</span>
              <button class="clickable" @click=${I("boiler_day_w")}>
                ${Gt(t.boilerDayEnergy)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">${t.boilerManualMode==="CBB"?"🤖":t.boilerManualMode==="Manual"?"👤":"⚙️"}</span>
              <span>Režim:</span>
              <button class="clickable" @click=${I("boiler_manual_mode")}>
                ${t.boilerManualMode==="CBB"?"🤖 Inteligentní":t.boilerManualMode==="Manual"?"👤 Manuální":t.boilerManualMode||"--"}
              </button>
            </div>
          </div>
        `:A}
      </div>
    `}render(){return d`
      <div class="flow-grid ${this.hasCustomLayout&&!this.editMode?"custom-layout":""}">
        ${this.renderSolar()}
        ${this.renderBattery()}
        ${this.renderInverter()}
        ${this.renderGrid()}
        ${this.renderHouse()}
      </div>
    `}};kt.styles=P`
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
      color: ${W(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .node-value {
      font-size: 22px;
      font-weight: 700;
      color: ${W(o.textPrimary)};
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
      color: ${W(o.textSecondary)};
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
      color: ${W(o.textSecondary)};
      margin-top: 4px;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid ${W(o.divider)};
      border-top-color: ${W(o.accent)};
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
      border-top: 1px solid ${W(o.divider)};
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
      border-top: 1px dashed ${W(o.divider)};
    }

    .detail-header {
      font-size: 10px;
      font-weight: 600;
      color: ${W(o.textSecondary)};
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: ${W(o.textSecondary)};
      margin-bottom: 2px;
    }

    .detail-row .icon { width: 14px; text-align: center; flex-shrink: 0; }

    .clickable {
      cursor: pointer;
      color: ${W(o.textPrimary)};
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
      color: ${W(o.textSecondary)};
      margin: 4px 0;
      align-items: center;
    }

    .phase-sep { color: ${W(o.divider)}; }

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
      background: ${W(o.bgSecondary)};
      border: none;
      font-family: inherit;
      color: ${W(o.textSecondary)};
    }

    .indicator:hover { background: ${W(o.divider)}; }

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
      border-top: 1px solid ${W(o.divider)};
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
      border: 1px solid ${W(o.divider)};
      background: transparent;
      color: ${W(o.textSecondary)};
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .gc-plan-btn:hover {
      background: rgba(255,255,255,0.06);
      color: ${W(o.textPrimary)};
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
      border-top: 1px dashed ${W(o.divider)};
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
      color: ${W(o.textSecondary)};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .phase-val {
      font-size: 11px;
      font-weight: 600;
      color: ${W(o.textPrimary)};
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    .phase-val:hover { text-decoration: underline; }
    .phase-divider {
      border: none;
      border-top: 1px solid ${W(o.divider)};
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
      color: ${W(o.textSecondary)};
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
      color: ${W(o.textPrimary)};
    }
    .energy-side-val:hover { text-decoration: underline; }
    .energy-import { color: #ef5350; }
    .energy-export { color: #66bb6a; }
    .energy-divider-v {
      width: 1px;
      height: 28px;
      background: ${W(o.divider)};
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
      color: ${W(o.textSecondary)};
      text-transform: uppercase;
    }
    .price-val {
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: ${W(o.textPrimary)};
    }
    .price-val:hover { text-decoration: underline; }
    .price-spot { color: #ef5350; }
    .price-export { color: #66bb6a; }

    @media (min-width: 1025px) {
      .detail-section {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid ${W(o.divider)};
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
        border-top: 1px dashed ${W(o.divider)};
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
  `;At([h({type:Object})],kt.prototype,"data",2);At([h({type:Boolean})],kt.prototype,"editMode",2);At([w()],kt.prototype,"pendingServices",2);At([w()],kt.prototype,"changingServices",2);At([w()],kt.prototype,"shieldStatus",2);At([w()],kt.prototype,"shieldQueueCount",2);At([w()],kt.prototype,"expandedNodes",2);At([w()],kt.prototype,"customPositions",2);kt=At([E("oig-flow-node")],kt);var sl=Object.defineProperty,ol=Object.getOwnPropertyDescriptor,oe=(t,e,i,r)=>{for(var n=r>1?void 0:r?ol(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&sl(e,i,n),n};function ll(t,e){return{fromColor:Ur[t]||"#9e9e9e",toColor:Ur[e]||"#9e9e9e"}}const cl=Z;let zt=class extends M{constructor(){super(...arguments),this.data=$r,this.particlesEnabled=!0,this.active=!0,this.editMode=!1,this.lines=[],this.animationId=null,this.lastSpawnTime={},this.particleCount=0,this.MAX_PARTICLES=50,this.onVisibilityChange=()=>{this.updateAnimationState()},this.onLayoutChanged=()=>{this.drawConnectionsDeferred()}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this.onVisibilityChange),this.addEventListener("layout-changed",this.onLayoutChanged)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this.onVisibilityChange),this.removeEventListener("layout-changed",this.onLayoutChanged),this.stopAnimation()}updated(t){t.has("data")&&(this.updateLines(),this.animationId!==null&&this.spawnParticles()),(t.has("active")||t.has("particlesEnabled"))&&this.updateAnimationState(),this.drawConnectionsDeferred()}firstUpdated(){this.updateLines(),this.updateAnimationState(),new ResizeObserver(()=>this.drawConnectionsDeferred()).observe(this)}drawConnectionsDeferred(){requestAnimationFrame(()=>this.drawConnectionsSVG())}getParticlesLayer(){var t;return(t=this.renderRoot)==null?void 0:t.querySelector(".particles-layer")}getGridMetrics(){var a,s;const t=(a=this.renderRoot)==null?void 0:a.querySelector("oig-flow-node");if(!t)return null;const i=(t.renderRoot||t.shadowRoot||t).querySelector(".flow-grid");if(!i)return null;const r=(s=this.renderRoot)==null?void 0:s.querySelector(".canvas-container");if(!r)return null;const n=i.getBoundingClientRect();return n.width===0||n.height===0?null:{grid:i,gridRect:n,canvasRect:r.getBoundingClientRect()}}positionOverlayLayer(t,e,i){const r=e.left-i.left,n=e.top-i.top;t.style.left=`${r}px`,t.style.top=`${n}px`,t.style.width=`${e.width}px`,t.style.height=`${e.height}px`}updateLines(){const t=this.data,e=[],i=t.solarPower>50;e.push({id:"solar-inverter",from:"solar",to:"inverter",color:ue.solar,power:i?t.solarPower:0,params:i?xi(t.solarPower,vi.solar,"solar"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:i});const r=Math.abs(t.batteryPower)>50,n=t.batteryPower>0;e.push({id:"battery-inverter",from:r&&n?"inverter":"battery",to:r&&n?"battery":"inverter",color:ue.battery,power:r?Math.abs(t.batteryPower):0,params:r?xi(t.batteryPower,vi.battery,"battery"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:r});const a=Math.abs(t.gridPower)>50,s=t.gridPower>0;e.push({id:"grid-inverter",from:a?s?"grid":"inverter":"grid",to:a?s?"inverter":"grid":"inverter",color:a?s?ue.grid_import:ue.grid_export:ue.grid_import,power:a?Math.abs(t.gridPower):0,params:a?xi(t.gridPower,vi.grid,"grid"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:a});const l=t.housePower>50;e.push({id:"inverter-house",from:"inverter",to:"house",color:ue.house,power:l?t.housePower:0,params:l?xi(t.housePower,vi.house,"house"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:l}),this.lines=e}calcEdgePoint(t,e,i,r){const n=e.x-t.x,a=e.y-t.y;if(n===0&&a===0)return{...t};const s=Math.abs(n),l=Math.abs(a),c=s*r>l*i?i/s:r/l;return{x:t.x+n*c,y:t.y+a*c}}getNodeInfo(t,e,i){const r=t.querySelector(`.node-${i}`);if(!r)return null;const n=r.getBoundingClientRect();return{x:n.left+n.width/2-e.left,y:n.top+n.height/2-e.top,hw:n.width/2,hh:n.height/2}}drawConnectionsSVG(){const t=this.svgEl;if(!t)return;const e=this.getGridMetrics();if(!e)return;const{grid:i,gridRect:r,canvasRect:n}=e;this.positionOverlayLayer(t,r,n),t.setAttribute("viewBox",`0 0 ${r.width} ${r.height}`);const a=this.getParticlesLayer();a&&this.positionOverlayLayer(a,r,n),t.innerHTML="";const s="http://www.w3.org/2000/svg",l=document.createElementNS(s,"defs"),c=document.createElementNS(s,"filter");c.setAttribute("id","neon-glow"),c.setAttribute("x","-50%"),c.setAttribute("y","-50%"),c.setAttribute("width","200%"),c.setAttribute("height","200%");const u=document.createElementNS(s,"feGaussianBlur");u.setAttribute("in","SourceGraphic"),u.setAttribute("stdDeviation","3"),u.setAttribute("result","blur"),c.appendChild(u);const p=document.createElementNS(s,"feMerge"),g=document.createElementNS(s,"feMergeNode");g.setAttribute("in","blur"),p.appendChild(g);const m=document.createElementNS(s,"feMergeNode");m.setAttribute("in","SourceGraphic"),p.appendChild(m),c.appendChild(p),l.appendChild(c),t.appendChild(l);for(const b of this.lines){const v=this.getNodeInfo(i,r,b.from),f=this.getNodeInfo(i,r,b.to);if(!v||!f)continue;const k={x:v.x,y:v.y},C={x:f.x,y:f.y},$=this.calcEdgePoint(k,C,v.hw,v.hh),S=this.calcEdgePoint(C,k,f.hw,f.hh),Y=S.x-$.x,K=S.y-$.y,x=Math.sqrt(Y*Y+K*K),H=Math.min(x*.2,40),z=-K/x,D=Y/x,q=($.x+S.x)/2,Q=($.y+S.y)/2,U=q+z*H,xt=Q+D*H,Vt=`grad-${b.id}`,{fromColor:er,toColor:ir}=ll(b.from,b.to),Ct=document.createElementNS(s,"linearGradient");Ct.setAttribute("id",Vt),Ct.setAttribute("x1","0%"),Ct.setAttribute("y1","0%"),Ct.setAttribute("x2","100%"),Ct.setAttribute("y2","0%");const Ae=document.createElementNS(s,"stop");Ae.setAttribute("offset","0%"),Ae.setAttribute("stop-color",er);const Ie=document.createElementNS(s,"stop");Ie.setAttribute("offset","100%"),Ie.setAttribute("stop-color",ir),Ct.appendChild(Ae),Ct.appendChild(Ie),l.appendChild(Ct);const yt=document.createElementNS(s,"path");if(yt.setAttribute("d",`M ${$.x} ${$.y} Q ${U} ${xt} ${S.x} ${S.y}`),yt.setAttribute("stroke",`url(#${Vt})`),yt.setAttribute("stroke-width","3"),yt.setAttribute("stroke-linecap","round"),yt.setAttribute("fill","none"),yt.setAttribute("opacity",b.active?"0.8":"0.18"),b.active&&yt.setAttribute("filter","url(#neon-glow)"),yt.classList.add("flow-line"),b.active||yt.classList.add("flow-line--inactive"),t.appendChild(yt),b.params.active){const qt=document.createElementNS(s,"polygon");qt.setAttribute("points",`0,-6 ${6*1.2},0 0,6`),qt.setAttribute("fill",b.color),qt.setAttribute("opacity","0.9");const Yt=document.createElementNS(s,"animateMotion");Yt.setAttribute("dur",`${Math.max(1,b.params.speed/1e3)}s`),Yt.setAttribute("repeatCount","indefinite"),Yt.setAttribute("path",`M ${$.x} ${$.y} Q ${U} ${xt} ${S.x} ${S.y}`),Yt.setAttribute("rotate","auto"),qt.appendChild(Yt),t.appendChild(qt)}}}updateAnimationState(){this.particlesEnabled&&this.active&&!document.hidden&&!vt.reduceMotion?(this.spawnParticles(),this.startAnimation()):this.stopAnimation()}startAnimation(){if(this.animationId!==null)return;const t=()=>{this.spawnParticles(),this.animationId=requestAnimationFrame(t)};this.animationId=requestAnimationFrame(t)}stopAnimation(){this.animationId!==null&&(cancelAnimationFrame(this.animationId),this.animationId=null)}spawnParticles(){if(this.particleCount>=this.MAX_PARTICLES)return;const t=this.getParticlesLayer();if(!t)return;const e=this.getGridMetrics();if(!e)return;const{grid:i,gridRect:r,canvasRect:n}=e;this.positionOverlayLayer(t,r,n);const a=performance.now();for(const s of this.lines){if(!s.params.active)continue;const l=s.params.speed,c=this.lastSpawnTime[s.id]||0;if(a-c<l)continue;const u=this.getNodeInfo(i,r,s.from),p=this.getNodeInfo(i,r,s.to);if(!u||!p)continue;const g={x:u.x,y:u.y},m={x:p.x,y:p.y},b=this.calcEdgePoint(g,m,u.hw,u.hh),v=this.calcEdgePoint(m,g,p.hw,p.hh);this.lastSpawnTime[s.id]=a;const f=s.params.count;for(let k=0;k<f&&!(this.particleCount>=this.MAX_PARTICLES);k++)this.createParticle(t,b,v,s.color,s.params,k*(s.params.speed/f/2))}}createParticle(t,e,i,r,n,a){const s=document.createElement("div");s.className="particle";const l=n.size;s.style.width=`${l}px`,s.style.height=`${l}px`,s.style.background=r,s.style.left=`${e.x}px`,s.style.top=`${e.y}px`,s.style.boxShadow=`0 0 ${l}px ${r}`,s.style.opacity="0",t.appendChild(s),this.particleCount++;const c=n.speed;setTimeout(()=>{let u=!1;const p=()=>{u||(u=!0,s.isConnected&&s.remove(),this.particleCount=Math.max(0,this.particleCount-1))};if(typeof s.animate=="function"){const g=s.animate([{left:`${e.x}px`,top:`${e.y}px`,opacity:0,offset:0},{opacity:n.opacity,offset:.1},{opacity:n.opacity,offset:.9},{left:`${i.x}px`,top:`${i.y}px`,opacity:0,offset:1}],{duration:c,easing:"linear"});g.onfinish=p,g.oncancel=p}else s.style.transition=`left ${c}ms linear, top ${c}ms linear, opacity ${c}ms linear`,s.style.opacity=`${n.opacity}`,requestAnimationFrame(()=>{s.style.left=`${i.x}px`,s.style.top=`${i.y}px`,s.style.opacity="0"}),s.addEventListener("transitionend",p,{once:!0}),window.setTimeout(p,c+50)},a)}render(){return d`
      <div class="canvas-container">
        <div class="flow-grid-wrapper">
          <oig-flow-node .data=${this.data} .editMode=${this.editMode}></oig-flow-node>
        </div>

        <svg class="connections-layer"></svg>

        <div class="particles-layer"></div>
      </div>
    `}resetLayout(){var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector("oig-flow-node");t!=null&&t.resetLayout&&t.resetLayout()}};zt.styles=P`
    :host {
      display: block;
      position: relative;
      width: 100%;
      background: ${cl(o.bgSecondary)};
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
  `;oe([h({type:Object})],zt.prototype,"data",2);oe([h({type:Boolean})],zt.prototype,"particlesEnabled",2);oe([h({type:Boolean})],zt.prototype,"active",2);oe([h({type:Boolean})],zt.prototype,"editMode",2);oe([w()],zt.prototype,"lines",2);oe([Zi(".connections-layer")],zt.prototype,"svgEl",2);zt=oe([E("oig-flow-canvas")],zt);var dl=Object.defineProperty,ul=Object.getOwnPropertyDescriptor,Sr=(t,e,i,r)=>{for(var n=r>1?void 0:r?ul(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&dl(e,i,n),n};const wt=Z;let Je=class extends M{constructor(){super(...arguments),this.data=null,this.open=!1,this.onKeyDown=t=>{t.key==="Escape"&&this.hide()}}show(){this.open=!0}hide(){this.open=!1}onOverlayClick(t){t.target===t.currentTarget&&this.hide()}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onKeyDown),this.addEventListener("oig-grid-charging-open",()=>this.show())}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onKeyDown)}formatTime(t){const e=t.time_from??"--:--",i=t.time_to??"--:--";return`${e} – ${i}`}isBlockActive(t){if(!t.time_from||!t.time_to)return!1;const e=new Date,i=e.toISOString().slice(0,10);if(t.day==="tomorrow")return!1;const r=`${i}T${t.time_from}`,n=`${i}T${t.time_to}`,a=new Date(r),s=new Date(n);return e>=a&&e<s}renderEmpty(){return d`
      <div class="empty-state">
        <div class="empty-icon">🔌</div>
        <div class="empty-text">Žádné plánované nabíjení</div>
        <div class="empty-sub">Plán nabíjení ze sítě není aktivní.</div>
      </div>
    `}renderContent(){const t=this.data;if(!t)return this.renderEmpty();const e=t.blocks.find(i=>this.isBlockActive(i));return d`
      ${t.hasBlocks?d`
        <!-- Summary chips -->
        <div class="summary-row">
          ${t.totalEnergyKwh>0?d`
            <span class="summary-chip energy">⚡ ${t.totalEnergyKwh.toFixed(1)} kWh</span>
          `:A}
          ${t.totalCostCzk>0?d`
            <span class="summary-chip cost">💰 ~${t.totalCostCzk.toFixed(0)} Kč</span>
          `:A}
          ${t.windowLabel?d`
            <span class="summary-chip time">🪟 ${t.windowLabel}</span>
          `:A}
          ${t.durationMinutes>0?d`
            <span class="summary-chip time">⏱️ ${Math.round(t.durationMinutes)} min</span>
          `:A}
        </div>

        <!-- Active block banner -->
        ${e?d`
          <div class="active-block-banner">
            <div class="pulse-dot"></div>
            <span>Probíhá: ${this.formatTime(e)}
              ${e.grid_charge_kwh!=null?` · ${e.grid_charge_kwh.toFixed(1)} kWh`:A}
            </span>
          </div>
        `:A}

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
            ${t.blocks.map((i,r)=>{const n=this.isBlockActive(i);return d`
                <tr class="${n?"is-active":!n&&r===0&&!e?"is-next":""}">
                  <td>${this.formatTime(i)}</td>
                  <td>
                    ${i.day?d`
                      <span class="day-badge ${i.day}">${i.day==="today"?"dnes":"zítra"}</span>
                    `:A}
                  </td>
                  <td>${i.grid_charge_kwh!=null?i.grid_charge_kwh.toFixed(1):"--"}</td>
                  <td>${i.total_cost_czk!=null?`${i.total_cost_czk.toFixed(0)} Kč`:"--"}</td>
                </tr>
              `})}
          </tbody>
        </table>
      `:this.renderEmpty()}
    `}render(){var t;return this.open?d`
      <div class="overlay" @click=${this.onOverlayClick}>
        <div class="dialog" role="dialog" aria-modal="true" aria-label="Plánované síťové nabíjení">
          <div class="dialog-header">
            <span class="dialog-header-icon">🔌</span>
            <div>
              <div class="dialog-header-title">Plánované síťové nabíjení</div>
              ${(t=this.data)!=null&&t.hasBlocks?d`
                <div class="dialog-header-subtitle">
                  ${this.data.blocks.length} blok${this.data.blocks.length>1?"ů":""}
                </div>
              `:A}
            </div>
            <button class="close-btn" @click=${()=>this.hide()} aria-label="Zavřít">✕</button>
          </div>
          <div class="dialog-body">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `:A}};Je.styles=P`
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
      background: ${wt(o.cardBg)};
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
      border-bottom: 1px solid ${wt(o.divider)};
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
      color: ${wt(o.textPrimary)};
    }

    .dialog-header-subtitle {
      font-size: 11px;
      color: ${wt(o.textSecondary)};
      margin-top: 2px;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: ${wt(o.textSecondary)};
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
      color: ${wt(o.textPrimary)};
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
      color: ${wt(o.textSecondary)};
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
      color: ${wt(o.textSecondary)};
      padding: 0 6px 8px;
      border-bottom: 1px solid ${wt(o.divider)};
    }

    .blocks-table th:last-child,
    .blocks-table td:last-child {
      text-align: right;
    }

    .blocks-table td {
      padding: 8px 6px;
      font-size: 12px;
      color: ${wt(o.textPrimary)};
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
      color: ${wt(o.textSecondary)};
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
  `;Sr([h({type:Object})],Je.prototype,"data",2);Sr([w()],Je.prototype,"open",2);Je=Sr([E("oig-grid-charging-dialog")],Je);var pl=Object.defineProperty,hl=Object.getOwnPropertyDescriptor,dt=(t,e,i,r)=>{for(var n=r>1?void 0:r?hl(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&pl(e,i,n),n};const et=Z;Ki.register(En,Dn,On,zn,An,In,Ln);let Ft=class extends M{constructor(){super(...arguments),this.values=[],this.color="rgba(76, 175, 80, 1)",this.startTime="",this.endTime="",this.chart=null,this.lastDataKey="",this.initializing=!1}render(){return d`<canvas></canvas>`}firstUpdated(){this.values.length>0&&(this.initializing=!0,requestAnimationFrame(()=>{this.createSparkline(),this.initializing=!1}))}updated(t){this.initializing||(t.has("values")||t.has("color"))&&this.updateOrCreateSparkline()}disconnectedCallback(){super.disconnectedCallback(),this.destroyChart()}updateOrCreateSparkline(){var e,i,r,n;if(!this.canvas||this.values.length===0)return;const t=JSON.stringify({v:this.values,c:this.color});if(!(t===this.lastDataKey&&this.chart)){if(this.lastDataKey=t,(r=(i=(e=this.chart)==null?void 0:e.data)==null?void 0:i.datasets)!=null&&r[0]){const a=this.chart.data.datasets[0];if(!((((n=this.chart.data.labels)==null?void 0:n.length)||0)!==this.values.length)){a.data=this.values,a.borderColor=this.color,a.backgroundColor=this.color.replace("1)","0.2)"),this.chart.update("none");return}}this.destroyChart(),this.createSparkline()}}createSparkline(){if(!this.canvas||this.values.length===0)return;this.destroyChart();const t=this.color,e=this.values,i=new Date(this.startTime),r=e.map((n,a)=>new Date(i.getTime()+a*15*60*1e3).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}));this.chart=new Ki(this.canvas,{type:"line",data:{labels:r,datasets:[{data:e,borderColor:t,backgroundColor:t.replace("1)","0.2)"),borderWidth:2,fill:!0,tension:.3,pointRadius:0,pointHoverRadius:5}]},plugins:[],options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:0},plugins:{legend:{display:!1},tooltip:{enabled:!0,backgroundColor:"rgba(0, 0, 0, 0.8)",titleColor:"#fff",bodyColor:"#fff",padding:8,displayColors:!1,callbacks:{title:n=>{var a;return((a=n[0])==null?void 0:a.label)||""},label:n=>`${n.parsed.y.toFixed(2)} Kč/kWh`}},datalabels:{display:!1},zoom:{pan:{enabled:!0,mode:"x",modifierKey:"shift"},zoom:{wheel:{enabled:!0,speed:.1},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)"},mode:"x"}}},scales:{x:{display:!1},y:{display:!0,position:"right",grace:"10%",ticks:{color:"rgba(255, 255, 255, 0.6)",font:{size:8},callback:n=>Number(n).toFixed(1),maxTicksLimit:3},grid:{display:!1}}},layout:{padding:0},interaction:{mode:"nearest",intersect:!1}}})}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}};Ft.styles=P`
    :host {
      display: block;
      width: 100%;
      height: 30px;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `;dt([h({type:Array})],Ft.prototype,"values",2);dt([h({type:String})],Ft.prototype,"color",2);dt([h({type:String})],Ft.prototype,"startTime",2);dt([h({type:String})],Ft.prototype,"endTime",2);dt([Zi("canvas")],Ft.prototype,"canvas",2);Ft=dt([E("oig-mini-sparkline")],Ft);let gt=class extends M{constructor(){super(...arguments),this.title="",this.time="",this.valueText="",this.value=0,this.unit="Kč/kWh",this.variant="default",this.clickable=!1,this.startTime="",this.endTime="",this.sparklineValues=[],this.sparklineColor="rgba(76, 175, 80, 1)",this.handleClick=()=>{this.clickable&&this.dispatchEvent(new CustomEvent("card-click",{detail:{startTime:this.startTime,endTime:this.endTime,value:this.value},bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),this.clickable&&this.addEventListener("click",this.handleClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleClick)}render(){const t=this.valueText||`${this.value.toFixed(2)} <span class="stat-unit">${this.unit}</span>`;return d`
      <div class="card-title">${this.title}</div>
      <div class="card-value ${this.variant}" .innerHTML=${t}></div>
      ${this.time?d`<div class="card-time">${this.time}</div>`:A}
      ${this.sparklineValues.length>0?d`
            <div class="sparkline-container">
              <oig-mini-sparkline
                .values=${this.sparklineValues}
                .color=${this.sparklineColor}
                .startTime=${this.startTime}
                .endTime=${this.endTime}
              ></oig-mini-sparkline>
            </div>
          `:A}
    `}};gt.styles=P`
    :host {
      display: block;
      background: ${et(o.cardBg)};
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: ${et(o.cardShadow)};
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
      color: ${et(o.textSecondary)};
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 700;
      color: ${et(o.textPrimary)};
      line-height: 1.2;
    }

    .card-value .stat-unit {
      font-size: 12px;
      font-weight: 400;
      color: ${et(o.textSecondary)};
    }

    .card-value.success { color: #4CAF50; }
    .card-value.warning { color: #FFA726; }
    .card-value.danger { color: #F44336; }
    .card-value.info { color: #29B6F6; }

    .card-time {
      font-size: 10px;
      color: ${et(o.textSecondary)};
      margin-top: 4px;
    }

    .sparkline-container {
      margin-top: 8px;
    }
  `;dt([h({type:String})],gt.prototype,"title",2);dt([h({type:String})],gt.prototype,"time",2);dt([h({type:String})],gt.prototype,"valueText",2);dt([h({type:Number})],gt.prototype,"value",2);dt([h({type:String})],gt.prototype,"unit",2);dt([h({type:String})],gt.prototype,"variant",2);dt([h({type:Boolean})],gt.prototype,"clickable",2);dt([h({type:String})],gt.prototype,"startTime",2);dt([h({type:String})],gt.prototype,"endTime",2);dt([h({type:Array})],gt.prototype,"sparklineValues",2);dt([h({type:String})],gt.prototype,"sparklineColor",2);gt=dt([E("oig-stats-card")],gt);function gl(t){const e=new Date(t.start),i=new Date(t.end),r=e.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit"}),n=e.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}),a=i.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"});return`${r} ${n} - ${a}`}let ti=class extends M{constructor(){super(...arguments),this.data=null,this.topOnly=!1}onCardClick(t){this.dispatchEvent(new CustomEvent("zoom-to-block",{detail:t.detail,bubbles:!0,composed:!0}))}renderPriceTiles(){if(!this.data)return A;const t=this.data.solarForecastTotal>0;return d`
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
          ${t?d`${this.data.solarForecastTotal.toFixed(1)} <span class="price-tile-unit">kWh</span>`:d`-- <span class="price-tile-unit">kWh</span>`}
        </div>
        <div class="price-tile-sub">${t?"Předpověď":"Nedostupná"}</div>
      </div>
    `}renderBlockCard(t,e,i,r){return e?d`
      <oig-stats-card
        title=${t}
        .value=${e.avg}
        unit="Kč/kWh"
        .time=${gl(e)}
        variant=${i}
        clickable
        .startTime=${e.start}
        .endTime=${e.end}
        .sparklineValues=${e.values}
        .sparklineColor=${r}
        @card-click=${this.onCardClick}
      ></oig-stats-card>
    `:A}renderExtremeBlocks(){if(!this.data)return A;const{cheapestBuyBlock:t,expensiveBuyBlock:e,bestExportBlock:i,worstExportBlock:r}=this.data;return d`
      ${this.renderBlockCard("Nejlevnější nákup",t,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejdražší nákup",e,"danger","rgba(244, 67, 54, 1)")}
      ${this.renderBlockCard("Nejlepší výkup",i,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejhorší výkup",r,"warning","rgba(255, 167, 38, 1)")}
    `}renderPlannedConsumption(){var s;const t=(s=this.data)==null?void 0:s.plannedConsumption;if(!t)return A;const e=t.todayTotalKwh,i=t.tomorrowKwh,r=e+(i||0),n=r>0?e/r*100:50,a=r>0?(i||0)/r*100:50;return d`
      <div class="planned-section">
        <div class="section-label" style="margin-bottom: 8px;">Plánovaná spotřeba</div>
        <div class="planned-header">
          <div>
            <div class="planned-main-value">
              ${t.totalPlannedKwh>0?d`${t.totalPlannedKwh.toFixed(1)} <span class="unit">kWh</span>`:"--"}
            </div>
            <div class="planned-profile">${t.profile}</div>
          </div>
          ${t.trendText?d`<div class="planned-trend">${t.trendText}</div>`:A}
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

        ${r>0?d`
              <div class="planned-bars">
                <div class="bar-today" style="width: ${n}%"></div>
                <div class="bar-tomorrow" style="width: ${a}%"></div>
              </div>
              <div class="bar-labels">
                <span>Dnes: ${e.toFixed(1)}</span>
                <span>Zítra: ${i!=null?i.toFixed(1):"--"}</span>
              </div>
            `:A}
      </div>
    `}render(){return!this.data||this.data.timeline.length===0?this.topOnly?A:d`<div style="color: ${o.textSecondary}; padding: 16px;">Načítání cenových dat...</div>`:this.topOnly?d`
        <div class="top-row">
          ${this.renderPriceTiles()}
          ${this.renderExtremeBlocks()}
        </div>
      `:d`${this.renderPlannedConsumption()}`}};ti.styles=P`
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
      background: ${et(o.cardBg)};
      border-radius: 10px;
      padding: 10px 12px;
      box-shadow: ${et(o.cardShadow)};
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 76px;
    }

    .price-tile.spot {
      background: linear-gradient(135deg, ${et(o.accent)}22 0%, ${et(o.accent)}11 100%);
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
      color: ${et(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .price-tile-value {
      font-size: 16px;
      font-weight: 700;
      color: ${et(o.textPrimary)};
      line-height: 1.2;
    }

    .price-tile-unit {
      font-size: 10px;
      font-weight: 400;
      color: ${et(o.textSecondary)};
      opacity: 0.7;
    }

    .price-tile-sub {
      font-size: 9px;
      color: ${et(o.textSecondary)};
      opacity: 0.55;
      margin-top: 3px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: ${et(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    /* Planned consumption */
    .planned-section {
      background: ${et(o.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: ${et(o.cardShadow)};
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
      color: ${et(o.textPrimary)};
    }

    .planned-main-value .unit {
      font-size: 12px;
      font-weight: 400;
      color: ${et(o.textSecondary)};
    }

    .planned-trend {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
    }

    .planned-profile {
      font-size: 11px;
      color: ${et(o.textSecondary)};
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
      color: ${et(o.textSecondary)};
      text-transform: uppercase;
    }

    .planned-detail-value {
      font-size: 14px;
      font-weight: 600;
      color: ${et(o.textPrimary)};
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
      color: ${et(o.textSecondary)};
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
  `;dt([h({type:Object})],ti.prototype,"data",2);dt([h({type:Boolean})],ti.prototype,"topOnly",2);ti=dt([E("oig-pricing-stats")],ti);const ia=6048e5,fl=864e5,gi=6e4,fi=36e5,ml=1e3,bn=Symbol.for("constructDateFrom");function st(t,e){return typeof t=="function"?t(e):t&&typeof t=="object"&&bn in t?t[bn](e):t instanceof Date?new t.constructor(e):new Date(e)}function L(t,e){return st(e||t,t)}function tr(t,e,i){const r=L(t,i==null?void 0:i.in);return isNaN(e)?st((i==null?void 0:i.in)||t,NaN):(e&&r.setDate(r.getDate()+e),r)}function Cr(t,e,i){const r=L(t,i==null?void 0:i.in);if(isNaN(e))return st(t,NaN);if(!e)return r;const n=r.getDate(),a=st(t,r.getTime());a.setMonth(r.getMonth()+e+1,0);const s=a.getDate();return n>=s?a:(r.setFullYear(a.getFullYear(),a.getMonth(),n),r)}function Pr(t,e,i){return st(t,+L(t)+e)}function bl(t,e,i){return Pr(t,e*fi)}let yl={};function le(){return yl}function Dt(t,e){var l,c,u,p;const i=le(),r=(e==null?void 0:e.weekStartsOn)??((c=(l=e==null?void 0:e.locale)==null?void 0:l.options)==null?void 0:c.weekStartsOn)??i.weekStartsOn??((p=(u=i.locale)==null?void 0:u.options)==null?void 0:p.weekStartsOn)??0,n=L(t,e==null?void 0:e.in),a=n.getDay(),s=(a<r?7:0)+a-r;return n.setDate(n.getDate()-s),n.setHours(0,0,0,0),n}function ke(t,e){return Dt(t,{...e,weekStartsOn:1})}function ra(t,e){const i=L(t,e==null?void 0:e.in),r=i.getFullYear(),n=st(i,0);n.setFullYear(r+1,0,4),n.setHours(0,0,0,0);const a=ke(n),s=st(i,0);s.setFullYear(r,0,4),s.setHours(0,0,0,0);const l=ke(s);return i.getTime()>=a.getTime()?r+1:i.getTime()>=l.getTime()?r:r-1}function zi(t){const e=L(t),i=new Date(Date.UTC(e.getFullYear(),e.getMonth(),e.getDate(),e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()));return i.setUTCFullYear(e.getFullYear()),+t-+i}function ce(t,...e){const i=st.bind(null,e.find(r=>typeof r=="object"));return e.map(i)}function vr(t,e){const i=L(t,e==null?void 0:e.in);return i.setHours(0,0,0,0),i}function na(t,e,i){const[r,n]=ce(i==null?void 0:i.in,t,e),a=vr(r),s=vr(n),l=+a-zi(a),c=+s-zi(s);return Math.round((l-c)/fl)}function vl(t,e){const i=ra(t,e),r=st(t,0);return r.setFullYear(i,0,4),r.setHours(0,0,0,0),ke(r)}function xl(t,e,i){const r=L(t,i==null?void 0:i.in);return r.setTime(r.getTime()+e*gi),r}function wl(t,e,i){return Cr(t,e*3,i)}function $l(t,e,i){return Pr(t,e*1e3)}function _l(t,e,i){return tr(t,e*7,i)}function kl(t,e,i){return Cr(t,e*12,i)}function Ke(t,e){const i=+L(t)-+L(e);return i<0?-1:i>0?1:i}function Sl(t){return t instanceof Date||typeof t=="object"&&Object.prototype.toString.call(t)==="[object Date]"}function aa(t){return!(!Sl(t)&&typeof t!="number"||isNaN(+L(t)))}function Cl(t,e,i){const[r,n]=ce(i==null?void 0:i.in,t,e),a=r.getFullYear()-n.getFullYear(),s=r.getMonth()-n.getMonth();return a*12+s}function Pl(t,e,i){const[r,n]=ce(i==null?void 0:i.in,t,e);return r.getFullYear()-n.getFullYear()}function sa(t,e,i){const[r,n]=ce(i==null?void 0:i.in,t,e),a=yn(r,n),s=Math.abs(na(r,n));r.setDate(r.getDate()-a*s);const l=+(yn(r,n)===-a),c=a*(s-l);return c===0?0:c}function yn(t,e){const i=t.getFullYear()-e.getFullYear()||t.getMonth()-e.getMonth()||t.getDate()-e.getDate()||t.getHours()-e.getHours()||t.getMinutes()-e.getMinutes()||t.getSeconds()-e.getSeconds()||t.getMilliseconds()-e.getMilliseconds();return i<0?-1:i>0?1:i}function mi(t){return e=>{const r=(t?Math[t]:Math.trunc)(e);return r===0?0:r}}function Tl(t,e,i){const[r,n]=ce(i==null?void 0:i.in,t,e),a=(+r-+n)/fi;return mi(i==null?void 0:i.roundingMethod)(a)}function Tr(t,e){return+L(t)-+L(e)}function Ml(t,e,i){const r=Tr(t,e)/gi;return mi(i==null?void 0:i.roundingMethod)(r)}function oa(t,e){const i=L(t,e==null?void 0:e.in);return i.setHours(23,59,59,999),i}function la(t,e){const i=L(t,e==null?void 0:e.in),r=i.getMonth();return i.setFullYear(i.getFullYear(),r+1,0),i.setHours(23,59,59,999),i}function El(t,e){const i=L(t,e==null?void 0:e.in);return+oa(i,e)==+la(i,e)}function ca(t,e,i){const[r,n,a]=ce(i==null?void 0:i.in,t,t,e),s=Ke(n,a),l=Math.abs(Cl(n,a));if(l<1)return 0;n.getMonth()===1&&n.getDate()>27&&n.setDate(30),n.setMonth(n.getMonth()-s*l);let c=Ke(n,a)===-s;El(r)&&l===1&&Ke(r,a)===1&&(c=!1);const u=s*(l-+c);return u===0?0:u}function Dl(t,e,i){const r=ca(t,e,i)/3;return mi(i==null?void 0:i.roundingMethod)(r)}function Ol(t,e,i){const r=Tr(t,e)/1e3;return mi(i==null?void 0:i.roundingMethod)(r)}function zl(t,e,i){const r=sa(t,e,i)/7;return mi(i==null?void 0:i.roundingMethod)(r)}function Al(t,e,i){const[r,n]=ce(i==null?void 0:i.in,t,e),a=Ke(r,n),s=Math.abs(Pl(r,n));r.setFullYear(1584),n.setFullYear(1584);const l=Ke(r,n)===-a,c=a*(s-+l);return c===0?0:c}function Il(t,e){const i=L(t,e==null?void 0:e.in),r=i.getMonth(),n=r-r%3;return i.setMonth(n,1),i.setHours(0,0,0,0),i}function Ll(t,e){const i=L(t,e==null?void 0:e.in);return i.setDate(1),i.setHours(0,0,0,0),i}function Bl(t,e){const i=L(t,e==null?void 0:e.in),r=i.getFullYear();return i.setFullYear(r+1,0,0),i.setHours(23,59,59,999),i}function da(t,e){const i=L(t,e==null?void 0:e.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}function Fl(t,e){const i=L(t,e==null?void 0:e.in);return i.setMinutes(59,59,999),i}function Nl(t,e){var l,c;const i=le(),r=i.weekStartsOn??((c=(l=i.locale)==null?void 0:l.options)==null?void 0:c.weekStartsOn)??0,n=L(t,e==null?void 0:e.in),a=n.getDay(),s=(a<r?-7:0)+6-(a-r);return n.setDate(n.getDate()+s),n.setHours(23,59,59,999),n}function Rl(t,e){const i=L(t,e==null?void 0:e.in);return i.setSeconds(59,999),i}function Hl(t,e){const i=L(t,e==null?void 0:e.in),r=i.getMonth(),n=r-r%3+3;return i.setMonth(n,0),i.setHours(23,59,59,999),i}function Wl(t,e){const i=L(t,e==null?void 0:e.in);return i.setMilliseconds(999),i}const jl={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},Vl=(t,e,i)=>{let r;const n=jl[t];return typeof n=="string"?r=n:e===1?r=n.one:r=n.other.replace("{{count}}",e.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+r:r+" ago":r};function dr(t){return(e={})=>{const i=e.width?String(e.width):t.defaultWidth;return t.formats[i]||t.formats[t.defaultWidth]}}const ql={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},Yl={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},Ul={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},Gl={date:dr({formats:ql,defaultWidth:"full"}),time:dr({formats:Yl,defaultWidth:"full"}),dateTime:dr({formats:Ul,defaultWidth:"full"})},Kl={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},Zl=(t,e,i,r)=>Kl[t];function Ve(t){return(e,i)=>{const r=i!=null&&i.context?String(i.context):"standalone";let n;if(r==="formatting"&&t.formattingValues){const s=t.defaultFormattingWidth||t.defaultWidth,l=i!=null&&i.width?String(i.width):s;n=t.formattingValues[l]||t.formattingValues[s]}else{const s=t.defaultWidth,l=i!=null&&i.width?String(i.width):t.defaultWidth;n=t.values[l]||t.values[s]}const a=t.argumentCallback?t.argumentCallback(e):e;return n[a]}}const Ql={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},Xl={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},Jl={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},tc={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},ec={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},ic={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},rc=(t,e)=>{const i=Number(t),r=i%100;if(r>20||r<10)switch(r%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},nc={ordinalNumber:rc,era:Ve({values:Ql,defaultWidth:"wide"}),quarter:Ve({values:Xl,defaultWidth:"wide",argumentCallback:t=>t-1}),month:Ve({values:Jl,defaultWidth:"wide"}),day:Ve({values:tc,defaultWidth:"wide"}),dayPeriod:Ve({values:ec,defaultWidth:"wide",formattingValues:ic,defaultFormattingWidth:"wide"})};function qe(t){return(e,i={})=>{const r=i.width,n=r&&t.matchPatterns[r]||t.matchPatterns[t.defaultMatchWidth],a=e.match(n);if(!a)return null;const s=a[0],l=r&&t.parsePatterns[r]||t.parsePatterns[t.defaultParseWidth],c=Array.isArray(l)?sc(l,g=>g.test(s)):ac(l,g=>g.test(s));let u;u=t.valueCallback?t.valueCallback(c):c,u=i.valueCallback?i.valueCallback(u):u;const p=e.slice(s.length);return{value:u,rest:p}}}function ac(t,e){for(const i in t)if(Object.prototype.hasOwnProperty.call(t,i)&&e(t[i]))return i}function sc(t,e){for(let i=0;i<t.length;i++)if(e(t[i]))return i}function oc(t){return(e,i={})=>{const r=e.match(t.matchPattern);if(!r)return null;const n=r[0],a=e.match(t.parsePattern);if(!a)return null;let s=t.valueCallback?t.valueCallback(a[0]):a[0];s=i.valueCallback?i.valueCallback(s):s;const l=e.slice(n.length);return{value:s,rest:l}}}const lc=/^(\d+)(th|st|nd|rd)?/i,cc=/\d+/i,dc={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},uc={any:[/^b/i,/^(a|c)/i]},pc={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},hc={any:[/1/i,/2/i,/3/i,/4/i]},gc={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},fc={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},mc={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},bc={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},yc={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},vc={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},xc={ordinalNumber:oc({matchPattern:lc,parsePattern:cc,valueCallback:t=>parseInt(t,10)}),era:qe({matchPatterns:dc,defaultMatchWidth:"wide",parsePatterns:uc,defaultParseWidth:"any"}),quarter:qe({matchPatterns:pc,defaultMatchWidth:"wide",parsePatterns:hc,defaultParseWidth:"any",valueCallback:t=>t+1}),month:qe({matchPatterns:gc,defaultMatchWidth:"wide",parsePatterns:fc,defaultParseWidth:"any"}),day:qe({matchPatterns:mc,defaultMatchWidth:"wide",parsePatterns:bc,defaultParseWidth:"any"}),dayPeriod:qe({matchPatterns:yc,defaultMatchWidth:"any",parsePatterns:vc,defaultParseWidth:"any"})},ua={code:"en-US",formatDistance:Vl,formatLong:Gl,formatRelative:Zl,localize:nc,match:xc,options:{weekStartsOn:0,firstWeekContainsDate:1}};function wc(t,e){const i=L(t,e==null?void 0:e.in);return na(i,da(i))+1}function pa(t,e){const i=L(t,e==null?void 0:e.in),r=+ke(i)-+vl(i);return Math.round(r/ia)+1}function Mr(t,e){var p,g,m,b;const i=L(t,e==null?void 0:e.in),r=i.getFullYear(),n=le(),a=(e==null?void 0:e.firstWeekContainsDate)??((g=(p=e==null?void 0:e.locale)==null?void 0:p.options)==null?void 0:g.firstWeekContainsDate)??n.firstWeekContainsDate??((b=(m=n.locale)==null?void 0:m.options)==null?void 0:b.firstWeekContainsDate)??1,s=st((e==null?void 0:e.in)||t,0);s.setFullYear(r+1,0,a),s.setHours(0,0,0,0);const l=Dt(s,e),c=st((e==null?void 0:e.in)||t,0);c.setFullYear(r,0,a),c.setHours(0,0,0,0);const u=Dt(c,e);return+i>=+l?r+1:+i>=+u?r:r-1}function $c(t,e){var l,c,u,p;const i=le(),r=(e==null?void 0:e.firstWeekContainsDate)??((c=(l=e==null?void 0:e.locale)==null?void 0:l.options)==null?void 0:c.firstWeekContainsDate)??i.firstWeekContainsDate??((p=(u=i.locale)==null?void 0:u.options)==null?void 0:p.firstWeekContainsDate)??1,n=Mr(t,e),a=st((e==null?void 0:e.in)||t,0);return a.setFullYear(n,0,r),a.setHours(0,0,0,0),Dt(a,e)}function ha(t,e){const i=L(t,e==null?void 0:e.in),r=+Dt(i,e)-+$c(i,e);return Math.round(r/ia)+1}function G(t,e){const i=t<0?"-":"",r=Math.abs(t).toString().padStart(e,"0");return i+r}const Lt={y(t,e){const i=t.getFullYear(),r=i>0?i:1-i;return G(e==="yy"?r%100:r,e.length)},M(t,e){const i=t.getMonth();return e==="M"?String(i+1):G(i+1,2)},d(t,e){return G(t.getDate(),e.length)},a(t,e){const i=t.getHours()/12>=1?"pm":"am";switch(e){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(t,e){return G(t.getHours()%12||12,e.length)},H(t,e){return G(t.getHours(),e.length)},m(t,e){return G(t.getMinutes(),e.length)},s(t,e){return G(t.getSeconds(),e.length)},S(t,e){const i=e.length,r=t.getMilliseconds(),n=Math.trunc(r*Math.pow(10,i-3));return G(n,e.length)}},pe={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},vn={G:function(t,e,i){const r=t.getFullYear()>0?1:0;switch(e){case"G":case"GG":case"GGG":return i.era(r,{width:"abbreviated"});case"GGGGG":return i.era(r,{width:"narrow"});case"GGGG":default:return i.era(r,{width:"wide"})}},y:function(t,e,i){if(e==="yo"){const r=t.getFullYear(),n=r>0?r:1-r;return i.ordinalNumber(n,{unit:"year"})}return Lt.y(t,e)},Y:function(t,e,i,r){const n=Mr(t,r),a=n>0?n:1-n;if(e==="YY"){const s=a%100;return G(s,2)}return e==="Yo"?i.ordinalNumber(a,{unit:"year"}):G(a,e.length)},R:function(t,e){const i=ra(t);return G(i,e.length)},u:function(t,e){const i=t.getFullYear();return G(i,e.length)},Q:function(t,e,i){const r=Math.ceil((t.getMonth()+1)/3);switch(e){case"Q":return String(r);case"QQ":return G(r,2);case"Qo":return i.ordinalNumber(r,{unit:"quarter"});case"QQQ":return i.quarter(r,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(r,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(r,{width:"wide",context:"formatting"})}},q:function(t,e,i){const r=Math.ceil((t.getMonth()+1)/3);switch(e){case"q":return String(r);case"qq":return G(r,2);case"qo":return i.ordinalNumber(r,{unit:"quarter"});case"qqq":return i.quarter(r,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(r,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(r,{width:"wide",context:"standalone"})}},M:function(t,e,i){const r=t.getMonth();switch(e){case"M":case"MM":return Lt.M(t,e);case"Mo":return i.ordinalNumber(r+1,{unit:"month"});case"MMM":return i.month(r,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(r,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(r,{width:"wide",context:"formatting"})}},L:function(t,e,i){const r=t.getMonth();switch(e){case"L":return String(r+1);case"LL":return G(r+1,2);case"Lo":return i.ordinalNumber(r+1,{unit:"month"});case"LLL":return i.month(r,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(r,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(r,{width:"wide",context:"standalone"})}},w:function(t,e,i,r){const n=ha(t,r);return e==="wo"?i.ordinalNumber(n,{unit:"week"}):G(n,e.length)},I:function(t,e,i){const r=pa(t);return e==="Io"?i.ordinalNumber(r,{unit:"week"}):G(r,e.length)},d:function(t,e,i){return e==="do"?i.ordinalNumber(t.getDate(),{unit:"date"}):Lt.d(t,e)},D:function(t,e,i){const r=wc(t);return e==="Do"?i.ordinalNumber(r,{unit:"dayOfYear"}):G(r,e.length)},E:function(t,e,i){const r=t.getDay();switch(e){case"E":case"EE":case"EEE":return i.day(r,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(r,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(r,{width:"short",context:"formatting"});case"EEEE":default:return i.day(r,{width:"wide",context:"formatting"})}},e:function(t,e,i,r){const n=t.getDay(),a=(n-r.weekStartsOn+8)%7||7;switch(e){case"e":return String(a);case"ee":return G(a,2);case"eo":return i.ordinalNumber(a,{unit:"day"});case"eee":return i.day(n,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(n,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(n,{width:"short",context:"formatting"});case"eeee":default:return i.day(n,{width:"wide",context:"formatting"})}},c:function(t,e,i,r){const n=t.getDay(),a=(n-r.weekStartsOn+8)%7||7;switch(e){case"c":return String(a);case"cc":return G(a,e.length);case"co":return i.ordinalNumber(a,{unit:"day"});case"ccc":return i.day(n,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(n,{width:"narrow",context:"standalone"});case"cccccc":return i.day(n,{width:"short",context:"standalone"});case"cccc":default:return i.day(n,{width:"wide",context:"standalone"})}},i:function(t,e,i){const r=t.getDay(),n=r===0?7:r;switch(e){case"i":return String(n);case"ii":return G(n,e.length);case"io":return i.ordinalNumber(n,{unit:"day"});case"iii":return i.day(r,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(r,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(r,{width:"short",context:"formatting"});case"iiii":default:return i.day(r,{width:"wide",context:"formatting"})}},a:function(t,e,i){const n=t.getHours()/12>=1?"pm":"am";switch(e){case"a":case"aa":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(n,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(n,{width:"wide",context:"formatting"})}},b:function(t,e,i){const r=t.getHours();let n;switch(r===12?n=pe.noon:r===0?n=pe.midnight:n=r/12>=1?"pm":"am",e){case"b":case"bb":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(n,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(n,{width:"wide",context:"formatting"})}},B:function(t,e,i){const r=t.getHours();let n;switch(r>=17?n=pe.evening:r>=12?n=pe.afternoon:r>=4?n=pe.morning:n=pe.night,e){case"B":case"BB":case"BBB":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(n,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(n,{width:"wide",context:"formatting"})}},h:function(t,e,i){if(e==="ho"){let r=t.getHours()%12;return r===0&&(r=12),i.ordinalNumber(r,{unit:"hour"})}return Lt.h(t,e)},H:function(t,e,i){return e==="Ho"?i.ordinalNumber(t.getHours(),{unit:"hour"}):Lt.H(t,e)},K:function(t,e,i){const r=t.getHours()%12;return e==="Ko"?i.ordinalNumber(r,{unit:"hour"}):G(r,e.length)},k:function(t,e,i){let r=t.getHours();return r===0&&(r=24),e==="ko"?i.ordinalNumber(r,{unit:"hour"}):G(r,e.length)},m:function(t,e,i){return e==="mo"?i.ordinalNumber(t.getMinutes(),{unit:"minute"}):Lt.m(t,e)},s:function(t,e,i){return e==="so"?i.ordinalNumber(t.getSeconds(),{unit:"second"}):Lt.s(t,e)},S:function(t,e){return Lt.S(t,e)},X:function(t,e,i){const r=t.getTimezoneOffset();if(r===0)return"Z";switch(e){case"X":return wn(r);case"XXXX":case"XX":return Qt(r);case"XXXXX":case"XXX":default:return Qt(r,":")}},x:function(t,e,i){const r=t.getTimezoneOffset();switch(e){case"x":return wn(r);case"xxxx":case"xx":return Qt(r);case"xxxxx":case"xxx":default:return Qt(r,":")}},O:function(t,e,i){const r=t.getTimezoneOffset();switch(e){case"O":case"OO":case"OOO":return"GMT"+xn(r,":");case"OOOO":default:return"GMT"+Qt(r,":")}},z:function(t,e,i){const r=t.getTimezoneOffset();switch(e){case"z":case"zz":case"zzz":return"GMT"+xn(r,":");case"zzzz":default:return"GMT"+Qt(r,":")}},t:function(t,e,i){const r=Math.trunc(+t/1e3);return G(r,e.length)},T:function(t,e,i){return G(+t,e.length)}};function xn(t,e=""){const i=t>0?"-":"+",r=Math.abs(t),n=Math.trunc(r/60),a=r%60;return a===0?i+String(n):i+String(n)+e+G(a,2)}function wn(t,e){return t%60===0?(t>0?"-":"+")+G(Math.abs(t)/60,2):Qt(t,e)}function Qt(t,e=""){const i=t>0?"-":"+",r=Math.abs(t),n=G(Math.trunc(r/60),2),a=G(r%60,2);return i+n+e+a}const $n=(t,e)=>{switch(t){case"P":return e.date({width:"short"});case"PP":return e.date({width:"medium"});case"PPP":return e.date({width:"long"});case"PPPP":default:return e.date({width:"full"})}},ga=(t,e)=>{switch(t){case"p":return e.time({width:"short"});case"pp":return e.time({width:"medium"});case"ppp":return e.time({width:"long"});case"pppp":default:return e.time({width:"full"})}},_c=(t,e)=>{const i=t.match(/(P+)(p+)?/)||[],r=i[1],n=i[2];if(!n)return $n(t,e);let a;switch(r){case"P":a=e.dateTime({width:"short"});break;case"PP":a=e.dateTime({width:"medium"});break;case"PPP":a=e.dateTime({width:"long"});break;case"PPPP":default:a=e.dateTime({width:"full"});break}return a.replace("{{date}}",$n(r,e)).replace("{{time}}",ga(n,e))},xr={p:ga,P:_c},kc=/^D+$/,Sc=/^Y+$/,Cc=["D","DD","YY","YYYY"];function fa(t){return kc.test(t)}function ma(t){return Sc.test(t)}function wr(t,e,i){const r=Pc(t,e,i);if(console.warn(r),Cc.includes(t))throw new RangeError(r)}function Pc(t,e,i){const r=t[0]==="Y"?"years":"days of the month";return`Use \`${t.toLowerCase()}\` instead of \`${t}\` (in \`${e}\`) for formatting ${r} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const Tc=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Mc=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Ec=/^'([^]*?)'?$/,Dc=/''/g,Oc=/[a-zA-Z]/;function zc(t,e,i){var p,g,m,b,v,f,k,C;const r=le(),n=(i==null?void 0:i.locale)??r.locale??ua,a=(i==null?void 0:i.firstWeekContainsDate)??((g=(p=i==null?void 0:i.locale)==null?void 0:p.options)==null?void 0:g.firstWeekContainsDate)??r.firstWeekContainsDate??((b=(m=r.locale)==null?void 0:m.options)==null?void 0:b.firstWeekContainsDate)??1,s=(i==null?void 0:i.weekStartsOn)??((f=(v=i==null?void 0:i.locale)==null?void 0:v.options)==null?void 0:f.weekStartsOn)??r.weekStartsOn??((C=(k=r.locale)==null?void 0:k.options)==null?void 0:C.weekStartsOn)??0,l=L(t,i==null?void 0:i.in);if(!aa(l))throw new RangeError("Invalid time value");let c=e.match(Mc).map($=>{const S=$[0];if(S==="p"||S==="P"){const Y=xr[S];return Y($,n.formatLong)}return $}).join("").match(Tc).map($=>{if($==="''")return{isToken:!1,value:"'"};const S=$[0];if(S==="'")return{isToken:!1,value:Ac($)};if(vn[S])return{isToken:!0,value:$};if(S.match(Oc))throw new RangeError("Format string contains an unescaped latin alphabet character `"+S+"`");return{isToken:!1,value:$}});n.localize.preprocessor&&(c=n.localize.preprocessor(l,c));const u={firstWeekContainsDate:a,weekStartsOn:s,locale:n};return c.map($=>{if(!$.isToken)return $.value;const S=$.value;(!(i!=null&&i.useAdditionalWeekYearTokens)&&ma(S)||!(i!=null&&i.useAdditionalDayOfYearTokens)&&fa(S))&&wr(S,e,String(t));const Y=vn[S[0]];return Y(l,S,n.localize,u)}).join("")}function Ac(t){const e=t.match(Ec);return e?e[1].replace(Dc,"'"):t}function Ic(){return Object.assign({},le())}function Lc(t,e){const i=L(t,e==null?void 0:e.in).getDay();return i===0?7:i}function Bc(t,e){const i=Fc(e)?new e(0):st(e,0);return i.setFullYear(t.getFullYear(),t.getMonth(),t.getDate()),i.setHours(t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()),i}function Fc(t){var e;return typeof t=="function"&&((e=t.prototype)==null?void 0:e.constructor)===t}const Nc=10;class ba{constructor(){_(this,"subPriority",0)}validate(e,i){return!0}}class Rc extends ba{constructor(e,i,r,n,a){super(),this.value=e,this.validateValue=i,this.setValue=r,this.priority=n,a&&(this.subPriority=a)}validate(e,i){return this.validateValue(e,this.value,i)}set(e,i,r){return this.setValue(e,i,this.value,r)}}class Hc extends ba{constructor(i,r){super();_(this,"priority",Nc);_(this,"subPriority",-1);this.context=i||(n=>st(r,n))}set(i,r){return r.timestampIsSet?i:st(i,Bc(i,this.context))}}class V{run(e,i,r,n){const a=this.parse(e,i,r,n);return a?{setter:new Rc(a.value,this.validate,this.set,this.priority,this.subPriority),rest:a.rest}:null}validate(e,i,r){return!0}}class Wc extends V{constructor(){super(...arguments);_(this,"priority",140);_(this,"incompatibleTokens",["R","u","t","T"])}parse(i,r,n){switch(r){case"G":case"GG":case"GGG":return n.era(i,{width:"abbreviated"})||n.era(i,{width:"narrow"});case"GGGGG":return n.era(i,{width:"narrow"});case"GGGG":default:return n.era(i,{width:"wide"})||n.era(i,{width:"abbreviated"})||n.era(i,{width:"narrow"})}}set(i,r,n){return r.era=n,i.setFullYear(n,0,1),i.setHours(0,0,0,0),i}}const lt={month:/^(1[0-2]|0?\d)/,date:/^(3[0-1]|[0-2]?\d)/,dayOfYear:/^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,week:/^(5[0-3]|[0-4]?\d)/,hour23h:/^(2[0-3]|[0-1]?\d)/,hour24h:/^(2[0-4]|[0-1]?\d)/,hour11h:/^(1[0-1]|0?\d)/,hour12h:/^(1[0-2]|0?\d)/,minute:/^[0-5]?\d/,second:/^[0-5]?\d/,singleDigit:/^\d/,twoDigits:/^\d{1,2}/,threeDigits:/^\d{1,3}/,fourDigits:/^\d{1,4}/,anyDigitsSigned:/^-?\d+/,singleDigitSigned:/^-?\d/,twoDigitsSigned:/^-?\d{1,2}/,threeDigitsSigned:/^-?\d{1,3}/,fourDigitsSigned:/^-?\d{1,4}/},Tt={basicOptionalMinutes:/^([+-])(\d{2})(\d{2})?|Z/,basic:/^([+-])(\d{2})(\d{2})|Z/,basicOptionalSeconds:/^([+-])(\d{2})(\d{2})((\d{2}))?|Z/,extended:/^([+-])(\d{2}):(\d{2})|Z/,extendedOptionalSeconds:/^([+-])(\d{2}):(\d{2})(:(\d{2}))?|Z/};function ct(t,e){return t&&{value:e(t.value),rest:t.rest}}function rt(t,e){const i=e.match(t);return i?{value:parseInt(i[0],10),rest:e.slice(i[0].length)}:null}function Mt(t,e){const i=e.match(t);if(!i)return null;if(i[0]==="Z")return{value:0,rest:e.slice(1)};const r=i[1]==="+"?1:-1,n=i[2]?parseInt(i[2],10):0,a=i[3]?parseInt(i[3],10):0,s=i[5]?parseInt(i[5],10):0;return{value:r*(n*fi+a*gi+s*ml),rest:e.slice(i[0].length)}}function ya(t){return rt(lt.anyDigitsSigned,t)}function ot(t,e){switch(t){case 1:return rt(lt.singleDigit,e);case 2:return rt(lt.twoDigits,e);case 3:return rt(lt.threeDigits,e);case 4:return rt(lt.fourDigits,e);default:return rt(new RegExp("^\\d{1,"+t+"}"),e)}}function Ai(t,e){switch(t){case 1:return rt(lt.singleDigitSigned,e);case 2:return rt(lt.twoDigitsSigned,e);case 3:return rt(lt.threeDigitsSigned,e);case 4:return rt(lt.fourDigitsSigned,e);default:return rt(new RegExp("^-?\\d{1,"+t+"}"),e)}}function Er(t){switch(t){case"morning":return 4;case"evening":return 17;case"pm":case"noon":case"afternoon":return 12;case"am":case"midnight":case"night":default:return 0}}function va(t,e){const i=e>0,r=i?e:1-e;let n;if(r<=50)n=t||100;else{const a=r+50,s=Math.trunc(a/100)*100,l=t>=a%100;n=t+s-(l?100:0)}return i?n:1-n}function xa(t){return t%400===0||t%4===0&&t%100!==0}class jc extends V{constructor(){super(...arguments);_(this,"priority",130);_(this,"incompatibleTokens",["Y","R","u","w","I","i","e","c","t","T"])}parse(i,r,n){const a=s=>({year:s,isTwoDigitYear:r==="yy"});switch(r){case"y":return ct(ot(4,i),a);case"yo":return ct(n.ordinalNumber(i,{unit:"year"}),a);default:return ct(ot(r.length,i),a)}}validate(i,r){return r.isTwoDigitYear||r.year>0}set(i,r,n){const a=i.getFullYear();if(n.isTwoDigitYear){const l=va(n.year,a);return i.setFullYear(l,0,1),i.setHours(0,0,0,0),i}const s=!("era"in r)||r.era===1?n.year:1-n.year;return i.setFullYear(s,0,1),i.setHours(0,0,0,0),i}}class Vc extends V{constructor(){super(...arguments);_(this,"priority",130);_(this,"incompatibleTokens",["y","R","u","Q","q","M","L","I","d","D","i","t","T"])}parse(i,r,n){const a=s=>({year:s,isTwoDigitYear:r==="YY"});switch(r){case"Y":return ct(ot(4,i),a);case"Yo":return ct(n.ordinalNumber(i,{unit:"year"}),a);default:return ct(ot(r.length,i),a)}}validate(i,r){return r.isTwoDigitYear||r.year>0}set(i,r,n,a){const s=Mr(i,a);if(n.isTwoDigitYear){const c=va(n.year,s);return i.setFullYear(c,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),Dt(i,a)}const l=!("era"in r)||r.era===1?n.year:1-n.year;return i.setFullYear(l,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),Dt(i,a)}}class qc extends V{constructor(){super(...arguments);_(this,"priority",130);_(this,"incompatibleTokens",["G","y","Y","u","Q","q","M","L","w","d","D","e","c","t","T"])}parse(i,r){return Ai(r==="R"?4:r.length,i)}set(i,r,n){const a=st(i,0);return a.setFullYear(n,0,4),a.setHours(0,0,0,0),ke(a)}}class Yc extends V{constructor(){super(...arguments);_(this,"priority",130);_(this,"incompatibleTokens",["G","y","Y","R","w","I","i","e","c","t","T"])}parse(i,r){return Ai(r==="u"?4:r.length,i)}set(i,r,n){return i.setFullYear(n,0,1),i.setHours(0,0,0,0),i}}class Uc extends V{constructor(){super(...arguments);_(this,"priority",120);_(this,"incompatibleTokens",["Y","R","q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"Q":case"QQ":return ot(r.length,i);case"Qo":return n.ordinalNumber(i,{unit:"quarter"});case"QQQ":return n.quarter(i,{width:"abbreviated",context:"formatting"})||n.quarter(i,{width:"narrow",context:"formatting"});case"QQQQQ":return n.quarter(i,{width:"narrow",context:"formatting"});case"QQQQ":default:return n.quarter(i,{width:"wide",context:"formatting"})||n.quarter(i,{width:"abbreviated",context:"formatting"})||n.quarter(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=1&&r<=4}set(i,r,n){return i.setMonth((n-1)*3,1),i.setHours(0,0,0,0),i}}class Gc extends V{constructor(){super(...arguments);_(this,"priority",120);_(this,"incompatibleTokens",["Y","R","Q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"q":case"qq":return ot(r.length,i);case"qo":return n.ordinalNumber(i,{unit:"quarter"});case"qqq":return n.quarter(i,{width:"abbreviated",context:"standalone"})||n.quarter(i,{width:"narrow",context:"standalone"});case"qqqqq":return n.quarter(i,{width:"narrow",context:"standalone"});case"qqqq":default:return n.quarter(i,{width:"wide",context:"standalone"})||n.quarter(i,{width:"abbreviated",context:"standalone"})||n.quarter(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=1&&r<=4}set(i,r,n){return i.setMonth((n-1)*3,1),i.setHours(0,0,0,0),i}}class Kc extends V{constructor(){super(...arguments);_(this,"incompatibleTokens",["Y","R","q","Q","L","w","I","D","i","e","c","t","T"]);_(this,"priority",110)}parse(i,r,n){const a=s=>s-1;switch(r){case"M":return ct(rt(lt.month,i),a);case"MM":return ct(ot(2,i),a);case"Mo":return ct(n.ordinalNumber(i,{unit:"month"}),a);case"MMM":return n.month(i,{width:"abbreviated",context:"formatting"})||n.month(i,{width:"narrow",context:"formatting"});case"MMMMM":return n.month(i,{width:"narrow",context:"formatting"});case"MMMM":default:return n.month(i,{width:"wide",context:"formatting"})||n.month(i,{width:"abbreviated",context:"formatting"})||n.month(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=11}set(i,r,n){return i.setMonth(n,1),i.setHours(0,0,0,0),i}}class Zc extends V{constructor(){super(...arguments);_(this,"priority",110);_(this,"incompatibleTokens",["Y","R","q","Q","M","w","I","D","i","e","c","t","T"])}parse(i,r,n){const a=s=>s-1;switch(r){case"L":return ct(rt(lt.month,i),a);case"LL":return ct(ot(2,i),a);case"Lo":return ct(n.ordinalNumber(i,{unit:"month"}),a);case"LLL":return n.month(i,{width:"abbreviated",context:"standalone"})||n.month(i,{width:"narrow",context:"standalone"});case"LLLLL":return n.month(i,{width:"narrow",context:"standalone"});case"LLLL":default:return n.month(i,{width:"wide",context:"standalone"})||n.month(i,{width:"abbreviated",context:"standalone"})||n.month(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=0&&r<=11}set(i,r,n){return i.setMonth(n,1),i.setHours(0,0,0,0),i}}function Qc(t,e,i){const r=L(t,i==null?void 0:i.in),n=ha(r,i)-e;return r.setDate(r.getDate()-n*7),L(r,i==null?void 0:i.in)}class Xc extends V{constructor(){super(...arguments);_(this,"priority",100);_(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","i","t","T"])}parse(i,r,n){switch(r){case"w":return rt(lt.week,i);case"wo":return n.ordinalNumber(i,{unit:"week"});default:return ot(r.length,i)}}validate(i,r){return r>=1&&r<=53}set(i,r,n,a){return Dt(Qc(i,n,a),a)}}function Jc(t,e,i){const r=L(t,i==null?void 0:i.in),n=pa(r,i)-e;return r.setDate(r.getDate()-n*7),r}class td extends V{constructor(){super(...arguments);_(this,"priority",100);_(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","e","c","t","T"])}parse(i,r,n){switch(r){case"I":return rt(lt.week,i);case"Io":return n.ordinalNumber(i,{unit:"week"});default:return ot(r.length,i)}}validate(i,r){return r>=1&&r<=53}set(i,r,n){return ke(Jc(i,n))}}const ed=[31,28,31,30,31,30,31,31,30,31,30,31],id=[31,29,31,30,31,30,31,31,30,31,30,31];class rd extends V{constructor(){super(...arguments);_(this,"priority",90);_(this,"subPriority",1);_(this,"incompatibleTokens",["Y","R","q","Q","w","I","D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"d":return rt(lt.date,i);case"do":return n.ordinalNumber(i,{unit:"date"});default:return ot(r.length,i)}}validate(i,r){const n=i.getFullYear(),a=xa(n),s=i.getMonth();return a?r>=1&&r<=id[s]:r>=1&&r<=ed[s]}set(i,r,n){return i.setDate(n),i.setHours(0,0,0,0),i}}class nd extends V{constructor(){super(...arguments);_(this,"priority",90);_(this,"subpriority",1);_(this,"incompatibleTokens",["Y","R","q","Q","M","L","w","I","d","E","i","e","c","t","T"])}parse(i,r,n){switch(r){case"D":case"DD":return rt(lt.dayOfYear,i);case"Do":return n.ordinalNumber(i,{unit:"date"});default:return ot(r.length,i)}}validate(i,r){const n=i.getFullYear();return xa(n)?r>=1&&r<=366:r>=1&&r<=365}set(i,r,n){return i.setMonth(0,n),i.setHours(0,0,0,0),i}}function Dr(t,e,i){var g,m,b,v;const r=le(),n=(i==null?void 0:i.weekStartsOn)??((m=(g=i==null?void 0:i.locale)==null?void 0:g.options)==null?void 0:m.weekStartsOn)??r.weekStartsOn??((v=(b=r.locale)==null?void 0:b.options)==null?void 0:v.weekStartsOn)??0,a=L(t,i==null?void 0:i.in),s=a.getDay(),c=(e%7+7)%7,u=7-n,p=e<0||e>6?e-(s+u)%7:(c+u)%7-(s+u)%7;return tr(a,p,i)}class ad extends V{constructor(){super(...arguments);_(this,"priority",90);_(this,"incompatibleTokens",["D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"E":case"EE":case"EEE":return n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"EEEEE":return n.day(i,{width:"narrow",context:"formatting"});case"EEEEEE":return n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"EEEE":default:return n.day(i,{width:"wide",context:"formatting"})||n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=6}set(i,r,n,a){return i=Dr(i,n,a),i.setHours(0,0,0,0),i}}class sd extends V{constructor(){super(...arguments);_(this,"priority",90);_(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","c","t","T"])}parse(i,r,n,a){const s=l=>{const c=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+c};switch(r){case"e":case"ee":return ct(ot(r.length,i),s);case"eo":return ct(n.ordinalNumber(i,{unit:"day"}),s);case"eee":return n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"eeeee":return n.day(i,{width:"narrow",context:"formatting"});case"eeeeee":return n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"eeee":default:return n.day(i,{width:"wide",context:"formatting"})||n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=6}set(i,r,n,a){return i=Dr(i,n,a),i.setHours(0,0,0,0),i}}class od extends V{constructor(){super(...arguments);_(this,"priority",90);_(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","e","t","T"])}parse(i,r,n,a){const s=l=>{const c=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+c};switch(r){case"c":case"cc":return ct(ot(r.length,i),s);case"co":return ct(n.ordinalNumber(i,{unit:"day"}),s);case"ccc":return n.day(i,{width:"abbreviated",context:"standalone"})||n.day(i,{width:"short",context:"standalone"})||n.day(i,{width:"narrow",context:"standalone"});case"ccccc":return n.day(i,{width:"narrow",context:"standalone"});case"cccccc":return n.day(i,{width:"short",context:"standalone"})||n.day(i,{width:"narrow",context:"standalone"});case"cccc":default:return n.day(i,{width:"wide",context:"standalone"})||n.day(i,{width:"abbreviated",context:"standalone"})||n.day(i,{width:"short",context:"standalone"})||n.day(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=0&&r<=6}set(i,r,n,a){return i=Dr(i,n,a),i.setHours(0,0,0,0),i}}function ld(t,e,i){const r=L(t,i==null?void 0:i.in),n=Lc(r,i),a=e-n;return tr(r,a,i)}class cd extends V{constructor(){super(...arguments);_(this,"priority",90);_(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","E","e","c","t","T"])}parse(i,r,n){const a=s=>s===0?7:s;switch(r){case"i":case"ii":return ot(r.length,i);case"io":return n.ordinalNumber(i,{unit:"day"});case"iii":return ct(n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"}),a);case"iiiii":return ct(n.day(i,{width:"narrow",context:"formatting"}),a);case"iiiiii":return ct(n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"}),a);case"iiii":default:return ct(n.day(i,{width:"wide",context:"formatting"})||n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"}),a)}}validate(i,r){return r>=1&&r<=7}set(i,r,n){return i=ld(i,n),i.setHours(0,0,0,0),i}}class dd extends V{constructor(){super(...arguments);_(this,"priority",80);_(this,"incompatibleTokens",["b","B","H","k","t","T"])}parse(i,r,n){switch(r){case"a":case"aa":case"aaa":return n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaaa":return n.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaa":default:return n.dayPeriod(i,{width:"wide",context:"formatting"})||n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,n){return i.setHours(Er(n),0,0,0),i}}class ud extends V{constructor(){super(...arguments);_(this,"priority",80);_(this,"incompatibleTokens",["a","B","H","k","t","T"])}parse(i,r,n){switch(r){case"b":case"bb":case"bbb":return n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbbb":return n.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbb":default:return n.dayPeriod(i,{width:"wide",context:"formatting"})||n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,n){return i.setHours(Er(n),0,0,0),i}}class pd extends V{constructor(){super(...arguments);_(this,"priority",80);_(this,"incompatibleTokens",["a","b","t","T"])}parse(i,r,n){switch(r){case"B":case"BB":case"BBB":return n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBBB":return n.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBB":default:return n.dayPeriod(i,{width:"wide",context:"formatting"})||n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,n){return i.setHours(Er(n),0,0,0),i}}class hd extends V{constructor(){super(...arguments);_(this,"priority",70);_(this,"incompatibleTokens",["H","K","k","t","T"])}parse(i,r,n){switch(r){case"h":return rt(lt.hour12h,i);case"ho":return n.ordinalNumber(i,{unit:"hour"});default:return ot(r.length,i)}}validate(i,r){return r>=1&&r<=12}set(i,r,n){const a=i.getHours()>=12;return a&&n<12?i.setHours(n+12,0,0,0):!a&&n===12?i.setHours(0,0,0,0):i.setHours(n,0,0,0),i}}class gd extends V{constructor(){super(...arguments);_(this,"priority",70);_(this,"incompatibleTokens",["a","b","h","K","k","t","T"])}parse(i,r,n){switch(r){case"H":return rt(lt.hour23h,i);case"Ho":return n.ordinalNumber(i,{unit:"hour"});default:return ot(r.length,i)}}validate(i,r){return r>=0&&r<=23}set(i,r,n){return i.setHours(n,0,0,0),i}}class fd extends V{constructor(){super(...arguments);_(this,"priority",70);_(this,"incompatibleTokens",["h","H","k","t","T"])}parse(i,r,n){switch(r){case"K":return rt(lt.hour11h,i);case"Ko":return n.ordinalNumber(i,{unit:"hour"});default:return ot(r.length,i)}}validate(i,r){return r>=0&&r<=11}set(i,r,n){return i.getHours()>=12&&n<12?i.setHours(n+12,0,0,0):i.setHours(n,0,0,0),i}}class md extends V{constructor(){super(...arguments);_(this,"priority",70);_(this,"incompatibleTokens",["a","b","h","H","K","t","T"])}parse(i,r,n){switch(r){case"k":return rt(lt.hour24h,i);case"ko":return n.ordinalNumber(i,{unit:"hour"});default:return ot(r.length,i)}}validate(i,r){return r>=1&&r<=24}set(i,r,n){const a=n<=24?n%24:n;return i.setHours(a,0,0,0),i}}class bd extends V{constructor(){super(...arguments);_(this,"priority",60);_(this,"incompatibleTokens",["t","T"])}parse(i,r,n){switch(r){case"m":return rt(lt.minute,i);case"mo":return n.ordinalNumber(i,{unit:"minute"});default:return ot(r.length,i)}}validate(i,r){return r>=0&&r<=59}set(i,r,n){return i.setMinutes(n,0,0),i}}class yd extends V{constructor(){super(...arguments);_(this,"priority",50);_(this,"incompatibleTokens",["t","T"])}parse(i,r,n){switch(r){case"s":return rt(lt.second,i);case"so":return n.ordinalNumber(i,{unit:"second"});default:return ot(r.length,i)}}validate(i,r){return r>=0&&r<=59}set(i,r,n){return i.setSeconds(n,0),i}}class vd extends V{constructor(){super(...arguments);_(this,"priority",30);_(this,"incompatibleTokens",["t","T"])}parse(i,r){const n=a=>Math.trunc(a*Math.pow(10,-r.length+3));return ct(ot(r.length,i),n)}set(i,r,n){return i.setMilliseconds(n),i}}class xd extends V{constructor(){super(...arguments);_(this,"priority",10);_(this,"incompatibleTokens",["t","T","x"])}parse(i,r){switch(r){case"X":return Mt(Tt.basicOptionalMinutes,i);case"XX":return Mt(Tt.basic,i);case"XXXX":return Mt(Tt.basicOptionalSeconds,i);case"XXXXX":return Mt(Tt.extendedOptionalSeconds,i);case"XXX":default:return Mt(Tt.extended,i)}}set(i,r,n){return r.timestampIsSet?i:st(i,i.getTime()-zi(i)-n)}}class wd extends V{constructor(){super(...arguments);_(this,"priority",10);_(this,"incompatibleTokens",["t","T","X"])}parse(i,r){switch(r){case"x":return Mt(Tt.basicOptionalMinutes,i);case"xx":return Mt(Tt.basic,i);case"xxxx":return Mt(Tt.basicOptionalSeconds,i);case"xxxxx":return Mt(Tt.extendedOptionalSeconds,i);case"xxx":default:return Mt(Tt.extended,i)}}set(i,r,n){return r.timestampIsSet?i:st(i,i.getTime()-zi(i)-n)}}class $d extends V{constructor(){super(...arguments);_(this,"priority",40);_(this,"incompatibleTokens","*")}parse(i){return ya(i)}set(i,r,n){return[st(i,n*1e3),{timestampIsSet:!0}]}}class _d extends V{constructor(){super(...arguments);_(this,"priority",20);_(this,"incompatibleTokens","*")}parse(i){return ya(i)}set(i,r,n){return[st(i,n),{timestampIsSet:!0}]}}const kd={G:new Wc,y:new jc,Y:new Vc,R:new qc,u:new Yc,Q:new Uc,q:new Gc,M:new Kc,L:new Zc,w:new Xc,I:new td,d:new rd,D:new nd,E:new ad,e:new sd,c:new od,i:new cd,a:new dd,b:new ud,B:new pd,h:new hd,H:new gd,K:new fd,k:new md,m:new bd,s:new yd,S:new vd,X:new xd,x:new wd,t:new $d,T:new _d},Sd=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Cd=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Pd=/^'([^]*?)'?$/,Td=/''/g,Md=/\S/,Ed=/[a-zA-Z]/;function Dd(t,e,i,r){var k,C,$,S,Y,K,x,H;const n=()=>st((r==null?void 0:r.in)||i,NaN),a=Ic(),s=(r==null?void 0:r.locale)??a.locale??ua,l=(r==null?void 0:r.firstWeekContainsDate)??((C=(k=r==null?void 0:r.locale)==null?void 0:k.options)==null?void 0:C.firstWeekContainsDate)??a.firstWeekContainsDate??((S=($=a.locale)==null?void 0:$.options)==null?void 0:S.firstWeekContainsDate)??1,c=(r==null?void 0:r.weekStartsOn)??((K=(Y=r==null?void 0:r.locale)==null?void 0:Y.options)==null?void 0:K.weekStartsOn)??a.weekStartsOn??((H=(x=a.locale)==null?void 0:x.options)==null?void 0:H.weekStartsOn)??0;if(!e)return t?n():L(i,r==null?void 0:r.in);const u={firstWeekContainsDate:l,weekStartsOn:c,locale:s},p=[new Hc(r==null?void 0:r.in,i)],g=e.match(Cd).map(z=>{const D=z[0];if(D in xr){const q=xr[D];return q(z,s.formatLong)}return z}).join("").match(Sd),m=[];for(let z of g){!(r!=null&&r.useAdditionalWeekYearTokens)&&ma(z)&&wr(z,e,t),!(r!=null&&r.useAdditionalDayOfYearTokens)&&fa(z)&&wr(z,e,t);const D=z[0],q=kd[D];if(q){const{incompatibleTokens:Q}=q;if(Array.isArray(Q)){const xt=m.find(Vt=>Q.includes(Vt.token)||Vt.token===D);if(xt)throw new RangeError(`The format string mustn't contain \`${xt.fullToken}\` and \`${z}\` at the same time`)}else if(q.incompatibleTokens==="*"&&m.length>0)throw new RangeError(`The format string mustn't contain \`${z}\` and any other token at the same time`);m.push({token:D,fullToken:z});const U=q.run(t,z,s.match,u);if(!U)return n();p.push(U.setter),t=U.rest}else{if(D.match(Ed))throw new RangeError("Format string contains an unescaped latin alphabet character `"+D+"`");if(z==="''"?z="'":D==="'"&&(z=Od(z)),t.indexOf(z)===0)t=t.slice(z.length);else return n()}}if(t.length>0&&Md.test(t))return n();const b=p.map(z=>z.priority).sort((z,D)=>D-z).filter((z,D,q)=>q.indexOf(z)===D).map(z=>p.filter(D=>D.priority===z).sort((D,q)=>q.subPriority-D.subPriority)).map(z=>z[0]);let v=L(i,r==null?void 0:r.in);if(isNaN(+v))return n();const f={};for(const z of b){if(!z.validate(v,u))return n();const D=z.set(v,f,u);Array.isArray(D)?(v=D[0],Object.assign(f,D[1])):v=D}return v}function Od(t){return t.match(Pd)[1].replace(Td,"'")}function zd(t,e){const i=L(t,e==null?void 0:e.in);return i.setMinutes(0,0,0),i}function Ad(t,e){const i=L(t,e==null?void 0:e.in);return i.setSeconds(0,0),i}function Id(t,e){const i=L(t,e==null?void 0:e.in);return i.setMilliseconds(0),i}function Ld(t,e){const i=()=>st(e==null?void 0:e.in,NaN),r=(e==null?void 0:e.additionalDigits)??2,n=Rd(t);let a;if(n.date){const u=Hd(n.date,r);a=Wd(u.restDateString,u.year)}if(!a||isNaN(+a))return i();const s=+a;let l=0,c;if(n.time&&(l=jd(n.time),isNaN(l)))return i();if(n.timezone){if(c=Vd(n.timezone),isNaN(c))return i()}else{const u=new Date(s+l),p=L(0,e==null?void 0:e.in);return p.setFullYear(u.getUTCFullYear(),u.getUTCMonth(),u.getUTCDate()),p.setHours(u.getUTCHours(),u.getUTCMinutes(),u.getUTCSeconds(),u.getUTCMilliseconds()),p}return L(s+l+c,e==null?void 0:e.in)}const _i={dateTimeDelimiter:/[T ]/,timeZoneDelimiter:/[Z ]/i,timezone:/([Z+-].*)$/},Bd=/^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/,Fd=/^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/,Nd=/^([+-])(\d{2})(?::?(\d{2}))?$/;function Rd(t){const e={},i=t.split(_i.dateTimeDelimiter);let r;if(i.length>2)return e;if(/:/.test(i[0])?r=i[0]:(e.date=i[0],r=i[1],_i.timeZoneDelimiter.test(e.date)&&(e.date=t.split(_i.timeZoneDelimiter)[0],r=t.substr(e.date.length,t.length))),r){const n=_i.timezone.exec(r);n?(e.time=r.replace(n[1],""),e.timezone=n[1]):e.time=r}return e}function Hd(t,e){const i=new RegExp("^(?:(\\d{4}|[+-]\\d{"+(4+e)+"})|(\\d{2}|[+-]\\d{"+(2+e)+"})$)"),r=t.match(i);if(!r)return{year:NaN,restDateString:""};const n=r[1]?parseInt(r[1]):null,a=r[2]?parseInt(r[2]):null;return{year:a===null?n:a*100,restDateString:t.slice((r[1]||r[2]).length)}}function Wd(t,e){if(e===null)return new Date(NaN);const i=t.match(Bd);if(!i)return new Date(NaN);const r=!!i[4],n=Ye(i[1]),a=Ye(i[2])-1,s=Ye(i[3]),l=Ye(i[4]),c=Ye(i[5])-1;if(r)return Kd(e,l,c)?qd(e,l,c):new Date(NaN);{const u=new Date(0);return!Ud(e,a,s)||!Gd(e,n)?new Date(NaN):(u.setUTCFullYear(e,a,Math.max(n,s)),u)}}function Ye(t){return t?parseInt(t):1}function jd(t){const e=t.match(Fd);if(!e)return NaN;const i=ur(e[1]),r=ur(e[2]),n=ur(e[3]);return Zd(i,r,n)?i*fi+r*gi+n*1e3:NaN}function ur(t){return t&&parseFloat(t.replace(",","."))||0}function Vd(t){if(t==="Z")return 0;const e=t.match(Nd);if(!e)return 0;const i=e[1]==="+"?-1:1,r=parseInt(e[2]),n=e[3]&&parseInt(e[3])||0;return Qd(r,n)?i*(r*fi+n*gi):NaN}function qd(t,e,i){const r=new Date(0);r.setUTCFullYear(t,0,4);const n=r.getUTCDay()||7,a=(e-1)*7+i+1-n;return r.setUTCDate(r.getUTCDate()+a),r}const Yd=[31,null,31,30,31,30,31,31,30,31,30,31];function wa(t){return t%400===0||t%4===0&&t%100!==0}function Ud(t,e,i){return e>=0&&e<=11&&i>=1&&i<=(Yd[e]||(wa(t)?29:28))}function Gd(t,e){return e>=1&&e<=(wa(t)?366:365)}function Kd(t,e,i){return e>=1&&e<=53&&i>=0&&i<=6}function Zd(t,e,i){return t===24?e===0&&i===0:i>=0&&i<60&&e>=0&&e<60&&t>=0&&t<25}function Qd(t,e){return e>=0&&e<=59}/*!
 * chartjs-adapter-date-fns v3.0.0
 * https://www.chartjs.org
 * (c) 2022 chartjs-adapter-date-fns Contributors
 * Released under the MIT license
 */const Xd={datetime:"MMM d, yyyy, h:mm:ss aaaa",millisecond:"h:mm:ss.SSS aaaa",second:"h:mm:ss aaaa",minute:"h:mm aaaa",hour:"ha",day:"MMM d",week:"PP",month:"MMM yyyy",quarter:"qqq - yyyy",year:"yyyy"};Za._date.override({_id:"date-fns",formats:function(){return Xd},parse:function(t,e){if(t===null||typeof t>"u")return null;const i=typeof t;return i==="number"||t instanceof Date?t=L(t):i==="string"&&(typeof e=="string"?t=Dd(t,e,new Date,this.options):t=Ld(t,this.options)),aa(t)?t.getTime():null},format:function(t,e){return zc(t,e,this.options)},add:function(t,e,i){switch(i){case"millisecond":return Pr(t,e);case"second":return $l(t,e);case"minute":return xl(t,e);case"hour":return bl(t,e);case"day":return tr(t,e);case"week":return _l(t,e);case"month":return Cr(t,e);case"quarter":return wl(t,e);case"year":return kl(t,e);default:return t}},diff:function(t,e,i){switch(i){case"millisecond":return Tr(t,e);case"second":return Ol(t,e);case"minute":return Ml(t,e);case"hour":return Tl(t,e);case"day":return sa(t,e);case"week":return zl(t,e);case"month":return ca(t,e);case"quarter":return Dl(t,e);case"year":return Al(t,e);default:return 0}},startOf:function(t,e,i){switch(e){case"second":return Id(t);case"minute":return Ad(t);case"hour":return zd(t);case"day":return vr(t);case"week":return Dt(t);case"isoWeek":return Dt(t,{weekStartsOn:+i});case"month":return Ll(t);case"quarter":return Il(t);case"year":return da(t);default:return t}},endOf:function(t,e){switch(e){case"second":return Wl(t);case"minute":return Rl(t);case"hour":return Fl(t);case"day":return oa(t);case"week":return Nl(t);case"month":return la(t);case"quarter":return Hl(t);case"year":return Bl(t);default:return t}}});function _n(t,e){if(!(e!=null&&e.start)||!(e!=null&&e.end))return null;const i=t.getPixelForValue(e.start.getTime()),r=t.getPixelForValue(e.end.getTime());if(!Number.isFinite(i)||!Number.isFinite(r))return null;const n=Math.min(i,r),a=Math.max(Math.abs(r-i),2);return!Number.isFinite(a)||a<=0?null:{left:n,width:a}}const Jd={id:"pricingModeIcons",beforeDatasetsDraw(t,e,i){var c;const r=i,n=r==null?void 0:r.segments;if(!(n!=null&&n.length))return;const a=t.chartArea,s=(c=t.scales)==null?void 0:c.x;if(!a||!s)return;const l=t.ctx;l.save(),l.globalAlpha=(r==null?void 0:r.backgroundOpacity)??.12;for(const u of n){const p=_n(s,u);p&&(l.fillStyle=u.color||"rgba(255, 255, 255, 0.1)",l.fillRect(p.left,a.top,p.width,a.bottom-a.top))}l.restore()},afterDatasetsDraw(t,e,i){var z;const r=i,n=r==null?void 0:r.segments;if(!(n!=null&&n.length))return;const a=(z=t.scales)==null?void 0:z.x,s=t.chartArea;if(!a||!s)return;const l=(r==null?void 0:r.iconSize)??16,c=(r==null?void 0:r.labelSize)??9,u=`${l}px "Inter", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,p=`${c}px "Inter", sans-serif`,g=(r==null?void 0:r.iconColor)||"rgba(255, 255, 255, 0.95)",m=(r==null?void 0:r.labelColor)||"rgba(255, 255, 255, 0.7)",b=(r==null?void 0:r.axisBandPadding)??10,v=(r==null?void 0:r.axisBandHeight)??l+c+10,f=(r==null?void 0:r.axisBandColor)||"rgba(6, 10, 18, 0.12)",k=(r==null?void 0:r.iconAlignment)||"start",C=(r==null?void 0:r.iconStartOffset)??12,$=(r==null?void 0:r.iconBaselineOffset)??4,S=(a.bottom||s.bottom)+b,Y=Math.min(S,t.height-v-2),K=s.right-s.left,x=Y+$,H=t.ctx;H.save(),H.globalCompositeOperation="destination-over",H.fillStyle=f,H.fillRect(s.left,Y,K,v),H.restore(),H.save(),H.globalCompositeOperation="destination-over",H.textAlign="center",H.textBaseline="top";for(const D of n){const q=_n(a,D);if(!q)continue;let Q;if(k==="start"){Q=q.left+C;const U=q.left+q.width-l/2;Q>U&&(Q=q.left+q.width/2)}else Q=q.left+q.width/2;H.font=u,H.fillStyle=g,H.fillText(D.icon||"❓",Q,x),D.shortLabel&&(H.font=p,H.fillStyle=m,H.fillText(D.shortLabel,Q,x+l-2))}H.restore()}};function kn(t,e){if(!t)return;t.layout||(t.layout={}),t.layout.padding||(t.layout.padding={});const i=t.layout.padding,r=12;i.top=i.top??12,i.bottom=Math.max(i.bottom||0,r)}var tu=Object.defineProperty,eu=Object.getOwnPropertyDescriptor,Ee=(t,e,i,r)=>{for(var n=r>1?void 0:r?eu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&tu(e,i,n),n};const Bt=Z;Ki.register(En,Dn,Qa,Xa,On,zn,Ja,An,ts,es,In,Ln,is,rs,Bn,Jd);function iu(t){const e=t.timeline.map(i=>i.spot_price_czk??0);return{label:"📊 Spotová cena nákupu",data:e,borderColor:"#2196F3",backgroundColor:"rgba(33, 150, 243, 0.15)",borderWidth:3,fill:!1,tension:.4,type:"line",yAxisID:"y-price",pointRadius:e.map(()=>0),pointHoverRadius:7,pointBackgroundColor:e.map(()=>"#42a5f5"),pointBorderColor:e.map(()=>"#42a5f5"),pointBorderWidth:2,order:1,datalabels:{display:!1}}}function ru(t){return{label:"💰 Výkupní cena",data:t.timeline.map(e=>e.export_price_czk??0),borderColor:"#4CAF50",backgroundColor:"rgba(76, 187, 106, 0.15)",borderWidth:2,fill:!1,type:"line",tension:.4,yAxisID:"y-price",pointRadius:0,pointHoverRadius:5,order:1,borderDash:[5,5]}}function nu(t){if(!t.solar)return[];const{string1:e,string2:i,hasString1:r,hasString2:n}=t.solar,a=(r?1:0)+(n?1:0),s={string1:{border:"rgba(255, 193, 7, 0.8)",bg:"rgba(255, 193, 7, 0.2)"},string2:{border:"rgba(255, 152, 0, 0.8)",bg:"rgba(255, 152, 0, 0.2)"}};if(a===1){const l=r?e:i,c=r?s.string1:s.string2;return[{label:"☀️ Solární předpověď",data:l,borderColor:c.border,backgroundColor:c.bg,borderWidth:2,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",pointRadius:0,pointHoverRadius:5,order:2}]}return a===2?[{label:"☀️ String 2",data:i,borderColor:s.string2.border,backgroundColor:s.string2.bg,borderWidth:1.5,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2},{label:"☀️ String 1",data:e,borderColor:s.string1.border,backgroundColor:s.string1.bg,borderWidth:1.5,fill:"-1",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2}]:[]}function au(t){if(!t.battery)return[];const{baseline:e,solarCharge:i,gridCharge:r,gridNet:n,consumption:a}=t.battery,s=[],l={baseline:{border:"#78909C",bg:"rgba(120, 144, 156, 0.25)"},solar:{border:"transparent",bg:"rgba(255, 167, 38, 0.6)"},grid:{border:"transparent",bg:"rgba(33, 150, 243, 0.6)"}};return a.some(c=>c!=null&&c>0)&&s.push({label:"🏠 Spotřeba (plán)",data:a,borderColor:"rgba(255, 112, 67, 0.7)",backgroundColor:"rgba(255, 112, 67, 0.12)",borderWidth:1.5,type:"line",fill:!1,tension:.25,pointRadius:0,pointHoverRadius:5,yAxisID:"y-power",stack:"consumption",borderDash:[6,4],order:2}),r.some(c=>c!=null&&c>0)&&s.push({label:"⚡ Do baterie ze sítě",data:r,backgroundColor:l.grid.bg,borderColor:l.grid.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),i.some(c=>c!=null&&c>0)&&s.push({label:"☀️ Do baterie ze soláru",data:i,backgroundColor:l.solar.bg,borderColor:l.solar.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),s.push({label:"🔋 Zbývající kapacita",data:e,backgroundColor:l.baseline.bg,borderColor:l.baseline.border,borderWidth:3,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),n.some(c=>c!==null)&&s.push({label:"📡 Netto odběr ze sítě",data:n,borderColor:"#00BCD4",backgroundColor:"transparent",borderWidth:2,type:"line",fill:!1,tension:.2,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",order:2}),s}function Sn(t){const e=[];return t.prices.length>0&&e.push(iu(t)),t.exportPrices.length>0&&e.push(ru(t)),e.push(...nu(t)),e.push(...au(t)),e}function ki(t,e,i=""){if(t==null)return"";const r=i?` ${i}`:"";return`${t.toFixed(e)}${r}`}function ge(t){var n;const e=(n=t.scales)==null?void 0:n.x;if(!e)return"overview";const r=(e.max-e.min)/(1e3*60*60);return r<=6?"detail":r<=24?"day":"overview"}function Zt(t,e){var p,g,m,b,v,f,k,C,$,S,Y;if(!((p=t==null?void 0:t.scales)!=null&&p.x))return;const i=t.scales.x,n=(i.max-i.min)/(1e3*60*60),a=ge(t),s=(m=(g=t.options.plugins)==null?void 0:g.legend)==null?void 0:m.labels;s&&(s.padding=10,s.font&&(s.font.size=11),a==="detail"&&(s.padding=12,s.font&&(s.font.size=12)));const l=["y-price","y-solar","y-power"];for(const K of l){const x=(b=t.options.scales)==null?void 0:b[K];x&&(a==="overview"?(x.title&&(x.title.display=!1),(v=x.ticks)!=null&&v.font&&(x.ticks.font.size=10),K==="y-solar"&&(x.display=!1)):a==="detail"?(x.title&&(x.title.display=!0,x.title.font&&(x.title.font.size=12)),(f=x.ticks)!=null&&f.font&&(x.ticks.font.size=11),x.display=!0):(x.title&&(x.title.display=!0,x.title.font&&(x.title.font.size=11)),(k=x.ticks)!=null&&k.font&&(x.ticks.font.size=10),x.display=!0))}const c=(C=t.options.scales)==null?void 0:C.x;c&&(a==="overview"?c.ticks&&(c.ticks.maxTicksLimit=12,c.ticks.font&&(c.ticks.font.size=10)):a==="detail"?(c.ticks&&(c.ticks.maxTicksLimit=24,c.ticks.font&&(c.ticks.font.size=11)),c.time&&(c.time.displayFormats.hour="HH:mm")):(c.ticks&&(c.ticks.maxTicksLimit=16,c.ticks.font&&(c.ticks.font.size=10)),c.time&&(c.time.displayFormats.hour="dd.MM HH:mm")));const u=e==="always"||e==="auto"&&n<=6;for(const K of t.data.datasets){const x=K;if(x.datalabels||(x.datalabels={}),e==="never"){x.datalabels.display=!1;continue}if(u){let H=1;n>3&&n<=6?H=2:n>6&&(H=4),x.datalabels.display=Q=>{const U=Q.dataset.data[Q.dataIndex];return U==null||U===0?!1:Q.dataIndex%H===0};const z=x.yAxisID==="y-price",D=(($=x.label)==null?void 0:$.includes("Solární"))||((S=x.label)==null?void 0:S.includes("String")),q=(Y=x.label)==null?void 0:Y.includes("kapacita");x.datalabels.align="top",x.datalabels.offset=6,x.datalabels.color="#fff",x.datalabels.font={size:9,weight:"bold"},z?(x.datalabels.formatter=Q=>ki(Q,2,"Kč"),x.datalabels.backgroundColor=x.borderColor||"rgba(33, 150, 243, 0.8)"):D?(x.datalabels.formatter=Q=>ki(Q,1,"kW"),x.datalabels.backgroundColor=x.borderColor||"rgba(255, 193, 7, 0.8)"):q?(x.datalabels.formatter=Q=>ki(Q,1,"kWh"),x.datalabels.backgroundColor=x.borderColor||"rgba(120, 144, 156, 0.8)"):(x.datalabels.formatter=Q=>ki(Q,1),x.datalabels.backgroundColor=x.borderColor||"rgba(33, 150, 243, 0.8)"),x.datalabels.borderRadius=4,x.datalabels.padding={top:3,bottom:3,left:5,right:5}}else x.datalabels.display=!1}t.update("none"),y.debug(`[PricingChart] Detail: ${n.toFixed(1)}h, Labels: ${u?"ON":"OFF"}, Mode: ${e}`)}let Nt=class extends M{constructor(){super(...arguments),this.data=null,this.datalabelMode="auto",this.zoomState={start:null,end:null},this.currentDetailLevel="overview",this.chart=null,this.resizeObserver=null}firstUpdated(){this.setupResizeObserver(),this.data&&this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())}updated(t){t.has("data")&&this.data&&(this.chart?this.updateChartData():this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())),t.has("datalabelMode")&&this.chart&&Zt(this.chart,this.datalabelMode)}disconnectedCallback(){var t;super.disconnectedCallback(),this.destroyChart(),(t=this.resizeObserver)==null||t.disconnect(),this.resizeObserver=null}zoomToTimeRange(t,e){if(!this.chart){y.warn("[PricingChart] Chart not available for zoom");return}const i=new Date(t),r=new Date(e),n=15*60*1e3,a=i.getTime()-n,s=r.getTime()+n;if(this.zoomState.start!==null&&Math.abs(this.zoomState.start-a)<6e4&&this.zoomState.end!==null&&Math.abs(this.zoomState.end-s)<6e4){y.debug("[PricingChart] Already zoomed to same range → reset"),this.resetZoom();return}try{const l=this.chart.options;l.scales.x.min=a,l.scales.x.max=s,this.chart.update("none"),this.zoomState={start:a,end:s},this.currentDetailLevel=ge(this.chart),Zt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-change",{detail:{start:a,end:s,level:this.currentDetailLevel},bubbles:!0,composed:!0})),y.debug("[PricingChart] Zoomed to range",{start:new Date(a).toISOString(),end:new Date(s).toISOString()})}catch(l){y.error("[PricingChart] Zoom error",l)}}resetZoom(){if(!this.chart)return;const t=this.chart.options;delete t.scales.x.min,delete t.scales.x.max,this.chart.update("none"),this.zoomState={start:null,end:null},this.currentDetailLevel=ge(this.chart),Zt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-reset",{bubbles:!0,composed:!0}))}getChart(){return this.chart}createChart(){if(!this.canvas||!this.data||this.data.timeline.length===0)return;this.chart&&this.destroyChart();const t=this.data,e=Sn(t),i={responsive:!0,maintainAspectRatio:!1,animation:{duration:0},interaction:{mode:"index",intersect:!1},plugins:{legend:{labels:{color:"#ffffff",font:{size:11,weight:"500"},padding:10,usePointStyle:!0,pointStyle:"circle",boxWidth:12,boxHeight:12},position:"top"},tooltip:{backgroundColor:"rgba(0,0,0,0.9)",titleColor:"#ffffff",bodyColor:"#ffffff",titleFont:{size:13,weight:"bold"},bodyFont:{size:11},padding:10,cornerRadius:6,displayColors:!0,callbacks:{title:n=>n.length>0?new Date(n[0].parsed.x).toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"",label:n=>{let a=n.dataset.label||"";return a&&(a+=": "),n.parsed.y!==null&&(n.dataset.yAxisID==="y-price"?a+=n.parsed.y.toFixed(2)+" Kč/kWh":n.dataset.yAxisID==="y-solar"?a+=n.parsed.y.toFixed(2)+" kWh":n.dataset.yAxisID==="y-power"?a+=n.parsed.y.toFixed(2)+" kW":a+=n.parsed.y),a}}},datalabels:{display:!1},zoom:{zoom:{wheel:{enabled:!0,modifierKey:null},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)",borderColor:"rgba(33, 150, 243, 0.8)",borderWidth:2},pinch:{enabled:!0},mode:"x",onZoomComplete:({chart:n})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=ge(n),Zt(n,this.datalabelMode)}},pan:{enabled:!0,mode:"x",modifierKey:"shift",onPanComplete:({chart:n})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=ge(n),Zt(n,this.datalabelMode)}},limits:{x:{minRange:36e5}}},pricingModeIcons:null},scales:{x:{type:"timeseries",time:{unit:"hour",displayFormats:{hour:"dd.MM HH:mm"},tooltipFormat:"dd.MM.yyyy HH:mm"},ticks:{color:this.getTextColor(),maxRotation:45,minRotation:45,font:{size:11},maxTicksLimit:20},grid:{color:this.getGridColor(),lineWidth:1}},"y-price":{type:"linear",position:"left",ticks:{color:"#2196F3",font:{size:11,weight:"500"},callback:n=>n.toFixed(2)+" Kč"},grid:{color:"rgba(33, 150, 243, 0.15)",lineWidth:1},title:{display:!0,text:"💰 Cena (Kč/kWh)",color:"#2196F3",font:{size:13,weight:"bold"}}},"y-solar":{type:"linear",position:"left",stacked:!0,ticks:{color:"#78909C",font:{size:11,weight:"500"},callback:n=>n.toFixed(1)+" kWh",display:!0},grid:{display:!0,color:"rgba(120, 144, 156, 0.15)",lineWidth:1,drawOnChartArea:!0},title:{display:!0,text:"🔋 Kapacita baterie (kWh)",color:"#78909C",font:{size:11,weight:"bold"}},beginAtZero:!1},"y-power":{type:"linear",position:"right",stacked:!0,ticks:{color:"#FFA726",font:{size:11,weight:"500"},callback:n=>n.toFixed(2)+" kW"},grid:{display:!1},title:{display:!0,text:"☀️ Výkon (kW)",color:"#FFA726",font:{size:13,weight:"bold"}}}}};kn(i);const r={type:"bar",data:{labels:t.labels,datasets:e},plugins:[Bn],options:i};try{this.chart=new Ki(this.canvas,r),Zt(this.chart,this.datalabelMode),t.initialZoomStart&&t.initialZoomEnd&&requestAnimationFrame(()=>{if(!this.chart)return;const n=this.chart.options;n.scales.x.min=t.initialZoomStart,n.scales.x.max=t.initialZoomEnd,this.chart.update("none"),this.currentDetailLevel=ge(this.chart),Zt(this.chart,this.datalabelMode)}),y.info("[PricingChart] Chart created",{datasets:e.length,labels:t.labels.length,segments:t.modeSegments.length})}catch(n){y.error("[PricingChart] Failed to create chart",n)}}updateChartData(){var s;if(!this.chart||!this.data)return;const t=this.data,e=Sn(t),i=((s=this.chart.data.labels)==null?void 0:s.length)!==t.labels.length,r=this.chart.data.datasets.length!==e.length;i&&(this.chart.data.labels=t.labels);let n="none";r?(this.chart.data.datasets=e,n=void 0):e.forEach((l,c)=>{const u=this.chart.data.datasets[c];u&&(u.data=l.data,u.label=l.label,u.backgroundColor=l.backgroundColor,u.borderColor=l.borderColor)});const a=this.chart.options;a.plugins||(a.plugins={}),a.plugins.pricingModeIcons=null,kn(a),this.chart.update(n),y.debug("[PricingChart] Chart updated incrementally")}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(()=>{var t;(t=this.chart)==null||t.resize()}),this.resizeObserver.observe(this)}getTextColor(){try{return getComputedStyle(this).getPropertyValue("--oig-text-primary").trim()||"#e0e0e0"}catch{return"#e0e0e0"}}getGridColor(){try{return getComputedStyle(this).getPropertyValue("--oig-border").trim()||"rgba(255,255,255,0.1)"}catch{return"rgba(255,255,255,0.1)"}}setDatalabelMode(t){this.datalabelMode=t,this.dispatchEvent(new CustomEvent("datalabel-mode-change",{detail:{mode:t},bubbles:!0,composed:!0}))}get isZoomed(){return this.zoomState.start!==null||this.zoomState.end!==null}renderControls(){const t=e=>{const i=this.datalabelMode===e?"active":"";return e==="always"&&this.datalabelMode==="always"?`control-btn mode-always ${i}`:e==="never"&&this.datalabelMode==="never"?`control-btn mode-never ${i}`:`control-btn ${i}`};return d`
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
        ${this.isZoomed?d`<button class="control-btn reset-btn" @click=${()=>this.resetZoom()}>
              Reset zoom
            </button>`:null}
      </div>
    `}render(){const t=this.data&&this.data.timeline.length>0;return d`
      <div class="chart-header">
        <span class="chart-title">Ceny elektřiny & předpověď</span>
        ${this.renderControls()}
      </div>

      <div class="chart-container">
        ${t?d`<canvas id="pricing-canvas"></canvas>`:d`<div class="no-data">Žádná data o cenách</div>`}
      </div>

      ${t?d`<div class="chart-hint">
            Kolečko myši = zoom | Shift + tah = posun | Tah = výběr oblasti
          </div>`:null}
    `}};Nt.styles=P`
    :host {
      display: block;
      background: ${Bt(o.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${Bt(o.cardShadow)};
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
      color: ${Bt(o.textPrimary)};
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
      color: ${Bt(o.textSecondary)};
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .control-btn:hover {
      background: ${Bt(o.accent)};
      color: #fff;
    }

    .control-btn.active {
      background: ${Bt(o.accent)};
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
      color: ${Bt(o.textSecondary)};
      font-size: 14px;
    }

    .chart-hint {
      font-size: 10px;
      color: ${Bt(o.textSecondary)};
      opacity: 0.7;
      margin-top: 6px;
      text-align: center;
    }
  `;Ee([h({type:Object})],Nt.prototype,"data",2);Ee([h({type:String})],Nt.prototype,"datalabelMode",2);Ee([w()],Nt.prototype,"zoomState",2);Ee([w()],Nt.prototype,"currentDetailLevel",2);Ee([Zi("#pricing-canvas")],Nt.prototype,"canvas",2);Nt=Ee([E("oig-pricing-chart")],Nt);var su=Object.defineProperty,ou=Object.getOwnPropertyDescriptor,j=(t,e,i,r)=>{for(var n=r>1?void 0:r?ou(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&su(e,i,n),n};const T=Z,de=P`
  background: ${T(o.cardBg)};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${T(o.cardShadow)};
`,Wt=P`
  font-size: 15px;
  font-weight: 600;
  color: ${T(o.textPrimary)};
  margin: 0 0 12px 0;
`;function lu(t){return Math.max(0,Math.min(100,t))}function Cn(t){const r=Math.max(0,Math.min(1,(t-10)/60)),n={r:33,g:150,b:243},a={r:255,g:87,b:34},s=(l,c)=>Math.round(l+(c-l)*r);return`rgb(${s(n.r,a.r)}, ${s(n.g,a.g)}, ${s(n.b,a.b)})`}let ei=class extends M{constructor(){super(...arguments),this.collapsed=!0,this.busy=!1}toggle(){this.collapsed=!this.collapsed}async doAction(t,e){this.busy=!0;try{const i=await t();this.dispatchEvent(new CustomEvent("action-done",{detail:{success:i,label:e},bubbles:!0,composed:!0}))}finally{this.busy=!1}}render(){return d`
      <div class="panel">
        <button class="panel-header" @click=${this.toggle}>
          <span class="panel-title">
            Pokrocile ovladani (Debug)
            <span class="info-bubble">?
              <span class="tooltip">
                <strong>Automaticky rezim</strong><br/>
                Bojler funguje plne automaticky! System automaticky planuje ohrev kazdych 5 minut,
                optimalizuje podle spotovych cen a profilu spotreby.<br/><br/>
                <strong>Tlacitka nize jsou jen pro debug/override.</strong>
              </span>
            </span>
          </span>
          <span class="toggle-icon">${this.collapsed?"+":"−"}</span>
        </button>

        <div class="panel-content ${this.collapsed?"":"open"}">
          <div class="section-label">Manualni akce (override)</div>
          <div class="button-group">
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(ho,"plan")}>
              Preplanovat (debug)
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(go,"apply")}>
              Aplikovat rucne
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(fo,"cancel")}>
              Zrusit plan
            </button>
          </div>
        </div>
      </div>
    `}};ei.styles=P`
    :host { display: block; }

    .panel {
      ${de};
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
      padding: 0;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      color: ${T(o.textPrimary)};
      font: inherit;
    }

    .panel-header:hover { opacity: 0.85; }

    .panel-title {
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .info-bubble {
      position: relative;
      cursor: help;
      font-size: 12px;
      color: ${T(o.textSecondary)};
    }

    .info-bubble .tooltip {
      display: none;
      position: absolute;
      left: 0;
      top: 24px;
      width: 280px;
      padding: 10px;
      background: ${T(o.cardBg)};
      border: 1px solid ${T(o.divider)};
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      font-size: 11px;
      line-height: 1.5;
      color: ${T(o.textSecondary)};
      z-index: 100;
      white-space: normal;
    }

    .info-bubble:hover .tooltip { display: block; }

    .toggle-icon {
      font-size: 18px;
      font-weight: bold;
      color: ${T(o.textSecondary)};
      transition: transform 0.2s;
    }

    .panel-content {
      display: none;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid ${T(o.divider)};
    }

    .panel-content.open { display: block; }

    .section-label {
      font-size: 12px;
      font-weight: 600;
      color: ${T(o.textSecondary)};
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .button-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .action-btn {
      padding: 8px 14px;
      border: 1px solid ${T(o.divider)};
      border-radius: 8px;
      background: ${T(o.bgSecondary)};
      color: ${T(o.textPrimary)};
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      white-space: nowrap;
    }

    .action-btn:hover { background: ${T(o.divider)}; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `;j([w()],ei.prototype,"collapsed",2);j([w()],ei.prototype,"busy",2);ei=j([E("oig-boiler-debug-panel")],ei);let Ii=class extends M{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return d`<div>Nacitani stavu...</div>`;const e=(i,r,n=1)=>i!=null?`${i.toFixed(n)} ${r}`:`-- ${r}`;return d`
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
        ${t.tempBottom!==null?d`
          <div class="card">
            <div class="card-label">Teplota spodni</div>
            <div class="card-value">${e(t.tempBottom,"°C")}</div>
          </div>
        `:A}
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
    `}};Ii.styles=P`
    :host { display: block; }

    h3 { ${Wt}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .card {
      ${de};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${T(o.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 18px;
      font-weight: 600;
      color: ${T(o.textPrimary)};
    }

    .card-value.small {
      font-size: 13px;
      font-weight: 500;
    }
  `;j([h({type:Object})],Ii.prototype,"data",2);Ii=j([E("oig-boiler-status-grid")],Ii);let Li=class extends M{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return A;const e=i=>`${i.toFixed(2)} kWh`;return d`
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
    `}};Li.styles=P`
    :host { display: block; }

    h3 { ${Wt}; }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .card {
      ${de};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${T(o.textSecondary)};
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
      background: ${T(o.bgSecondary)};
    }

    .ratio-fve { background: #4CAF50; }
    .ratio-grid { background: #FF9800; }
    .ratio-alt { background: #2196F3; }

    .ratio-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 11px;
      color: ${T(o.textSecondary)};
    }
  `;j([h({type:Object})],Li.prototype,"data",2);Li=j([E("oig-boiler-energy-breakdown")],Li);let Bi=class extends M{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return A;const e=t.peakHours.length?t.peakHours.map(n=>`${n}h`).join(", "):"--",i=t.waterLiters40c!==null?`${t.waterLiters40c.toFixed(0)} L`:"-- L",r=t.circulationNow.startsWith("ANO");return d`
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
          <span class="value ${r?"active":"idle"}">${t.circulationNow}</span>
        </div>
      </div>
    `}};Bi.styles=P`
    :host { display: block; }

    h3 { ${Wt}; }

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
      border-bottom: 1px solid ${T(o.divider)};
      font-size: 13px;
    }

    .item:last-child { border-bottom: none; }

    .label { color: ${T(o.textSecondary)}; }

    .value {
      font-weight: 600;
      color: ${T(o.textPrimary)};
    }

    .value.active { color: #4CAF50; }
    .value.idle { color: ${T(o.textSecondary)}; }
  `;j([h({type:Object})],Bi.prototype,"data",2);Bi=j([E("oig-boiler-predicted-usage")],Bi);let ii=class extends M{constructor(){super(...arguments),this.plan=null,this.forecastWindows={fve:"--",grid:"--"}}render(){var r;const t=this.plan,e=this.forecastWindows,i=n=>n??"--";return d`
      <h3>Informace o planu</h3>
      <div class="rows">
        <div class="row">
          <span class="row-label">Mix zdroju:</span>
          <span class="row-value">${i(t==null?void 0:t.sourceDigest)}</span>
        </div>
        <div class="row">
          <span class="row-label">Slotu:</span>
          <span class="row-value">${((r=t==null?void 0:t.slots)==null?void 0:r.length)??"--"}</span>
        </div>
        <div class="row">
          <span class="row-label">Topeni aktivni:</span>
          <span class="row-value">${i(t==null?void 0:t.activeSlotCount)}</span>
        </div>
        <div class="row">
          <span class="row-label">Nejlevnejsi spot:</span>
          <span class="row-value">${i(t==null?void 0:t.cheapestSpot)}</span>
        </div>
        <div class="row">
          <span class="row-label">Nejdrazsi spot:</span>
          <span class="row-value">${i(t==null?void 0:t.mostExpensiveSpot)}</span>
        </div>
        <div class="row">
          <span class="row-label">FVE okna (forecast):</span>
          <span class="row-value">${e.fve}</span>
        </div>
        <div class="row">
          <span class="row-label">Grid okna (forecast):</span>
          <span class="row-value">${e.grid}</span>
        </div>
        <div class="row">
          <span class="row-label">Od:</span>
          <span class="row-value">${i(t==null?void 0:t.planStart)}</span>
        </div>
        <div class="row">
          <span class="row-label">Do:</span>
          <span class="row-value">${i(t==null?void 0:t.planEnd)}</span>
        </div>
      </div>
    `}};ii.styles=P`
    :host { display: block; }

    h3 { ${Wt}; }

    .rows {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
      border-bottom: 1px solid ${T(o.divider)};
      font-size: 13px;
    }

    .row:last-child { border-bottom: none; }

    .row-label { color: ${T(o.textSecondary)}; }
    .row-value {
      font-weight: 500;
      color: ${T(o.textPrimary)};
      text-align: right;
      max-width: 60%;
      word-break: break-word;
    }
  `;j([h({type:Object})],ii.prototype,"plan",2);j([h({type:Object})],ii.prototype,"forecastWindows",2);ii=j([E("oig-boiler-plan-info")],ii);let ri=class extends M{constructor(){super(...arguments),this.boilerState=null,this.targetTemp=60}render(){const t=this.boilerState;if(!t)return d`<div>Nacitani...</div>`;const e=10,i=70,r=b=>lu((b-e)/(i-e)*100),n=t.heatingPercent??0,a=t.tempTop!==null?r(t.tempTop):null,s=t.tempBottom!==null?r(t.tempBottom):null,l=r(this.targetTemp),c=Cn(t.tempTop??this.targetTemp),u=Cn(t.tempBottom??10),p=`linear-gradient(180deg, ${c} 0%, ${u} 100%)`,g=t.heatingPercent!==null?`${t.heatingPercent.toFixed(0)}% nahrato`:"-- % nahrato";return d`
      <h3>Vizualizace bojleru</h3>

      <div class="tank-wrapper">
        <div class="temp-scale">
          ${[70,60,50,40,30,20,10].map(b=>d`<span>${b}°C</span>`)}
        </div>

        <div class="tank">
          <div class="water" style="height:${n}%; background:${p}"></div>

          <div class="target-line" style="bottom:${l}%">
            <span class="target-label">Cil</span>
          </div>

          ${a!==null?d`
            <div class="sensor top" style="bottom:${a}%">
              <span class="sensor-label">${t.tempTop.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:A}

          ${s!==null?d`
            <div class="sensor bottom" style="bottom:${s}%">
              <span class="sensor-label">${t.tempBottom.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:A}
        </div>
      </div>

      <div class="grade-label">${g}</div>
    `}};ri.styles=P`
    :host { display: block; }

    h3 { ${Wt}; }

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
      color: ${T(o.textSecondary)};
      text-align: right;
      padding: 2px 0;
    }

    /* Tank body */
    .tank {
      flex: 1;
      position: relative;
      border: 2px solid ${T(o.divider)};
      border-radius: 12px;
      overflow: hidden;
      background: ${T(o.bgSecondary)};
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
      border-top: 2px dashed ${T(o.accent)};
      z-index: 3;
    }

    .target-label {
      position: absolute;
      right: 4px;
      top: -14px;
      font-size: 9px;
      color: ${T(o.accent)};
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
      color: ${T(o.textPrimary)};
    }
  `;j([h({type:Object})],ri.prototype,"boilerState",2);j([h({type:Number})],ri.prototype,"targetTemp",2);ri=j([E("oig-boiler-tank")],ri);let ni=class extends M{constructor(){super(...arguments),this.current="",this.available=[]}onChange(t){const e=t.target.value;this.dispatchEvent(new CustomEvent("category-change",{detail:{category:e},bubbles:!0,composed:!0}))}render(){const t=this.available.length?this.available:Object.keys(en);return d`
      <div class="row">
        <label>Profil:</label>
        <select @change=${this.onChange}>
          ${t.map(e=>d`
            <option value=${e} ?selected=${e===this.current}>
              ${en[e]||e}
            </option>
          `)}
        </select>
      </div>
    `}};ni.styles=P`
    :host { display: block; margin: 12px 0; }

    .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    label {
      font-size: 13px;
      font-weight: 600;
      color: ${T(o.textPrimary)};
    }

    select {
      padding: 6px 10px;
      font-size: 13px;
      border: 1px solid ${T(o.divider)};
      border-radius: 6px;
      background: ${T(o.cardBg)};
      color: ${T(o.textPrimary)};
      cursor: pointer;
    }
  `;j([h({type:String})],ni.prototype,"current",2);j([h({type:Array})],ni.prototype,"available",2);ni=j([E("oig-boiler-category-select")],ni);let Fi=class extends M{constructor(){super(...arguments),this.data=[]}render(){if(!this.data.length)return A;const t=this.data.flatMap(s=>s.hours),e=Math.max(...t,.1),i=e*.3,r=e*.7,n=Array.from({length:24},(s,l)=>l),a=s=>s===0?"none":s<i?"low":s<r?"medium":"high";return d`
      <h3>Mapa spotreby (7 dni)</h3>
      <div class="wrapper">
        <div class="grid">
          <!-- Header row -->
          <div></div>
          ${n.map(s=>d`<div class="hour-header">${s}</div>`)}

          <!-- Day rows -->
          ${this.data.map(s=>d`
            <div class="day-label">${s.day}</div>
            ${s.hours.map((l,c)=>d`
              <div class="cell ${a(l)}"
                   title="${s.day} ${c}h: ${l.toFixed(2)} kWh"></div>
            `)}
          `)}
        </div>

        <div class="legend">
          <span class="legend-item"><span class="legend-dot" style="background:#c8e6c9"></span> Nizka</span>
          <span class="legend-item"><span class="legend-dot" style="background:#ff9800"></span> Stredni</span>
          <span class="legend-item"><span class="legend-dot" style="background:#f44336"></span> Vysoka</span>
        </div>
      </div>
    `}};Fi.styles=P`
    :host { display: block; }

    h3 { ${Wt}; }

    .wrapper {
      ${de};
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
      color: ${T(o.textSecondary)};
      text-align: center;
      padding: 2px 0;
    }

    .day-label {
      font-size: 10px;
      font-weight: 600;
      color: ${T(o.textSecondary)};
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

    .cell.none   { background: ${T(o.bgSecondary)}; }
    .cell.low    { background: #c8e6c9; }
    .cell.medium { background: #ff9800; }
    .cell.high   { background: #f44336; }

    .legend {
      display: flex;
      gap: 14px;
      margin-top: 10px;
      font-size: 11px;
      color: ${T(o.textSecondary)};
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
  `;j([h({type:Array})],Fi.prototype,"data",2);Fi=j([E("oig-boiler-heatmap-grid")],Fi);let Ni=class extends M{constructor(){super(...arguments),this.plan=null}render(){const t=this.plan,e=(i,r=2)=>i!=null?i.toFixed(r):"-";return d`
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
    `}};Ni.styles=P`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .card {
      ${de};
      padding: 14px;
    }

    .card-title {
      font-size: 12px;
      color: ${T(o.textSecondary)};
      margin-bottom: 6px;
    }

    .card-value {
      font-size: 22px;
      font-weight: 700;
    }

    .total { color: ${T(o.textPrimary)}; }
    .fve { color: #4CAF50; }
    .grid-c { color: #FF9800; }
    .cost { color: #2196F3; }
  `;j([h({type:Object})],Ni.prototype,"plan",2);Ni=j([E("oig-boiler-stats-cards")],Ni);let Ri=class extends M{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return A;const e=Math.max(...t.hourlyAvg,.01),i=new Set(t.peakHours),r=t.peakHours.length?t.peakHours.map(a=>`${a}h`).join(", "):"--",n=t.confidence!==null?`${Math.round(t.confidence*100)} %`:"-- %";return d`
      <h3>Profil spotreby (tyden)</h3>
      <div class="wrapper">
        <div class="chart">
          ${t.hourlyAvg.map((a,s)=>{const l=e>0?a/e*100:0,c=i.has(s);return d`
              <div class="bar-col" title="${s}h: ${a.toFixed(3)} kWh">
                <div class="bar ${c?"peak":"normal"}"
                     style="height:${l}%"></div>
                <span class="bar-label">${s}</span>
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
            <span class="stat-value">${r}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Spolehlivost:</span>
            <span class="stat-value">${n}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Sledovano:</span>
            <span class="stat-value">${t.daysTracked} dni</span>
          </div>
        </div>
      </div>
    `}};Ri.styles=P`
    :host { display: block; }

    h3 { ${Wt}; }

    .wrapper {
      ${de};
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
      color: ${T(o.textSecondary)};
      margin-top: 3px;
    }

    /* Stats row */
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid ${T(o.divider)};
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .stat-label { color: ${T(o.textSecondary)}; }
    .stat-value { font-weight: 600; color: ${T(o.textPrimary)}; }
  `;j([h({type:Object})],Ri.prototype,"data",2);Ri=j([E("oig-boiler-profiling")],Ri);let Hi=class extends M{constructor(){super(...arguments),this.config=null}render(){const t=this.config;if(!t)return A;const e=(i,r="")=>i!=null?`${i}${r?" "+r:""}`:`--${r?" "+r:""}`;return d`
      <h3>Profil bojleru</h3>
      <div class="grid">
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
    `}};Hi.styles=P`
    :host { display: block; }

    h3 { ${Wt}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .card {
      ${de};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${T(o.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 600;
      color: ${T(o.textPrimary)};
    }
  `;j([h({type:Object})],Hi.prototype,"config",2);Hi=j([E("oig-boiler-config-section")],Hi);let Wi=class extends M{constructor(){super(...arguments),this.state=null}render(){return this.state?d`
      <div class="temp-display">
        <div class="current-temp">${this.state.currentTemp}°C</div>
        <div class="target-temp">Cil: ${this.state.targetTemp}°C</div>
      </div>

      <div class="status-indicator">
        <div class="status-dot ${this.state.heating?"heating":"idle"}"></div>
        <span>${this.state.heating?"Topi":"Necinny"}</span>
      </div>

      ${this.state.nextProfile?d`
        <div class="next-info">
          <div>Dalsi: ${this.state.nextProfile}</div>
          <div>${this.state.nextStart}</div>
        </div>
      `:null}
    `:d`<div>Nacitani...</div>`}};Wi.styles=P`
    :host {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: ${T(o.cardBg)};
      border-radius: 12px;
      box-shadow: ${T(o.cardShadow)};
    }

    .temp-display { text-align: center; }

    .current-temp {
      font-size: 36px;
      font-weight: 600;
      color: ${T(o.textPrimary)};
    }

    .target-temp {
      font-size: 14px;
      color: ${T(o.textSecondary)};
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
      color: ${T(o.textSecondary)};
    }
  `;j([h({type:Object})],Wi.prototype,"state",2);Wi=j([E("oig-boiler-state")],Wi);let ji=class extends M{constructor(){super(...arguments),this.data=[]}render(){return A}};ji.styles=P`
    :host { display: block; }
  `;j([h({type:Array})],ji.prototype,"data",2);ji=j([E("oig-boiler-heatmap")],ji);let ai=class extends M{constructor(){super(...arguments),this.profiles=[],this.editMode=!1}render(){return A}};ai.styles=P`
    :host { display: block; }
  `;j([h({type:Array})],ai.prototype,"profiles",2);j([h({type:Boolean})],ai.prototype,"editMode",2);ai=j([E("oig-boiler-profiles")],ai);var cu=Object.defineProperty,du=Object.getOwnPropertyDescriptor,bt=(t,e,i,r)=>{for(var n=r>1?void 0:r?du(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&cu(e,i,n),n};const _t=Z,Or=P`
  .selector-label {
    font-size: 12px;
    color: ${_t(o.textSecondary)};
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
    border: 2px solid ${_t(o.divider)};
    background: ${_t(o.bgSecondary)};
    color: ${_t(o.textPrimary)};
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .mode-btn:hover:not(:disabled):not(.active) {
    border-color: ${_t(o.accent)};
  }

  .mode-btn.active {
    background: ${_t(o.accent)};
    border-color: ${_t(o.accent)};
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
`;let Se=class extends M{constructor(){super(...arguments),this.value="home_1",this.disabled=!1,this.buttonStates={home_1:"idle",home_2:"idle",home_3:"idle",home_ups:"idle",home_5:"idle",home_6:"idle"}}onModeClick(t){const e=this.buttonStates[t];this.disabled||e==="active"||e==="pending"||e==="processing"||e==="disabled-by-service"||this.dispatchEvent(new CustomEvent("mode-change",{detail:{mode:t},bubbles:!0}))}render(){return d`
      <div class="selector-label">
        Re\u017Eim st\u0159\u00EDda\u010De
      </div>
      <div class="mode-buttons">
        ${["home_1","home_2","home_3","home_ups","home_5","home_6"].map(e=>{const i=this.buttonStates[e],r=this.disabled||i==="pending"||i==="processing"||i==="disabled-by-service";return d`
            <button
              class="mode-btn ${i}"
              ?disabled=${r}
              @click=${()=>this.onModeClick(e)}
            >
              ${Zn[e]}
              ${i==="pending"?d`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?d`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};Se.styles=[Or];bt([h({type:String})],Se.prototype,"value",2);bt([h({type:Boolean})],Se.prototype,"disabled",2);bt([h({type:Object})],Se.prototype,"buttonStates",2);Se=bt([E("oig-box-mode-selector")],Se);let ie=class extends M{constructor(){super(...arguments),this.value="off",this.limit=0,this.disabled=!1,this.buttonStates={off:"idle",on:"idle",limited:"idle"}}onDeliveryClick(t){const e=this.buttonStates[t];this.disabled||e==="active"||e==="pending"||e==="processing"||e==="disabled-by-service"||this.dispatchEvent(new CustomEvent("delivery-change",{detail:{value:t,limit:t==="limited"?this.limit:null},bubbles:!0}))}onLimitInput(t){const e=t.target;this.limit=parseInt(e.value,10)||0,this.dispatchEvent(new CustomEvent("limit-change",{detail:{limit:this.limit},bubbles:!0}))}get showLimitInput(){return this.value==="limited"||this.buttonStates.limited==="active"}render(){const t=[{value:"off",label:Si.off},{value:"on",label:Si.on},{value:"limited",label:Si.limited}],e=this.buttonStates.limited,i=e==="pending"?"pending-border":e==="processing"?"processing-border":"",n=(this.value==="limited"||this.buttonStates.limited==="active")&&this.limit>0?d`<span class="status-text">${this.limit}\u00A0W</span>`:null;return d`
      <div class="selector-label">
        Dod\u00E1vka do s\u00EDt\u011B ${n}
      </div>
      <div class="mode-buttons">
        ${t.map(a=>{const s=this.buttonStates[a.value],l=this.disabled||s==="pending"||s==="processing"||s==="disabled-by-service";return d`
            <button
              class="mode-btn ${s}"
              ?disabled=${l}
              @click=${()=>this.onDeliveryClick(a.value)}
            >
              ${a.label}
              ${s==="pending"?d`<span style="font-size:10px"> \u23F3</span>`:""}
              ${s==="processing"?d`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>

      ${this.showLimitInput?d`
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
    `}};ie.styles=[Or,P`
      .limit-input-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
      }

      .limit-input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid ${_t(o.divider)};
        border-radius: 6px;
        font-size: 14px;
        background: ${_t(o.bgPrimary)};
        color: ${_t(o.textPrimary)};
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
        color: ${_t(o.textSecondary)};
      }
    `];bt([h({type:String})],ie.prototype,"value",2);bt([h({type:Number})],ie.prototype,"limit",2);bt([h({type:Boolean})],ie.prototype,"disabled",2);bt([h({type:Object})],ie.prototype,"buttonStates",2);ie=bt([E("oig-grid-delivery-selector")],ie);let Ce=class extends M{constructor(){super(...arguments),this.value="cbb",this.disabled=!1,this.buttonStates={cbb:"idle",manual:"idle"}}onModeClick(t){const e=this.buttonStates[t];this.disabled||e==="active"||e==="pending"||e==="processing"||e==="disabled-by-service"||this.dispatchEvent(new CustomEvent("boiler-mode-change",{detail:{mode:t},bubbles:!0}))}render(){return d`
      <div class="selector-label">
        Re\u017Eim bojleru
      </div>
      <div class="mode-buttons">
        ${["cbb","manual"].map(e=>{const i=this.buttonStates[e],r=this.disabled||i==="pending"||i==="processing"||i==="disabled-by-service";return d`
            <button
              class="mode-btn ${i}"
              ?disabled=${r}
              @click=${()=>this.onModeClick(e)}
            >
              ${Xn[e]} ${Qn[e]}
              ${i==="pending"?d`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?d`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};Ce.styles=[Or];bt([h({type:String})],Ce.prototype,"value",2);bt([h({type:Boolean})],Ce.prototype,"disabled",2);bt([h({type:Object})],Ce.prototype,"buttonStates",2);Ce=bt([E("oig-boiler-mode-selector")],Ce);var uu=Object.defineProperty,pu=Object.getOwnPropertyDescriptor,De=(t,e,i,r)=>{for(var n=r>1?void 0:r?pu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&uu(e,i,n),n};const mt=Z;let Rt=class extends M{constructor(){super(...arguments),this.items=[],this.expanded=!1,this.shieldStatus="idle",this.queueCount=0,this._now=Date.now(),this.updateInterval=null}connectedCallback(){super.connectedCallback(),this.updateInterval=window.setInterval(()=>{this._now=Date.now()},1e3)}disconnectedCallback(){super.disconnectedCallback(),this.updateInterval!==null&&clearInterval(this.updateInterval)}toggleExpanded(){this.expanded=!this.expanded}removeItem(t,e){e.stopPropagation(),this.dispatchEvent(new CustomEvent("remove-item",{detail:{position:t},bubbles:!0}))}formatServiceName(t){return Do[t]||t||"N/A"}formatChanges(t){return!t||t.length===0?"N/A":t.map(e=>{const i=e.indexOf("→");if(i===-1)return e;const r=e.slice(0,i).trim(),n=e.slice(i+1).trim(),a=r.indexOf(":"),s=a===-1?r:r.slice(a+1),l=(hn[s.replace(/'/g,"").trim()]||s).replace(/'/g,"").trim(),c=(hn[n.replace(/'/g,"").trim()]||n).replace(/'/g,"").trim();return`${l} → ${c}`}).join(", ")}formatTimestamp(t){if(!t)return{time:"--",duration:"--"};try{const e=new Date(t),i=new Date(this._now),r=Math.floor((i.getTime()-e.getTime())/1e3),n=String(e.getHours()).padStart(2,"0"),a=String(e.getMinutes()).padStart(2,"0");let s=`${n}:${a}`;if(e.toDateString()!==i.toDateString()){const c=e.getDate(),u=e.getMonth()+1;s=`${c}.${u}. ${s}`}let l;if(r<60)l=`${r}s`;else if(r<3600){const c=Math.floor(r/60),u=r%60;l=`${c}m ${u}s`}else{const c=Math.floor(r/3600),u=Math.floor(r%3600/60);l=`${c}h ${u}m`}return{time:s,duration:l}}catch{return{time:"--",duration:"--"}}}get activeCount(){return this.items.length}render(){this._now;const t=this.shieldStatus==="running"?"running":"idle",e=this.shieldStatus==="running"?"🔄 Zpracovává":"✓ Připraveno";return d`
      <div class="queue-header" @click=${this.toggleExpanded}>
        <div class="queue-title-area">
          <span class="queue-title">Shield fronta</span>
          ${this.activeCount>0?d`
            <span class="queue-count">(${this.activeCount} aktivn\u00EDch)</span>
          `:A}
          <span class="shield-status ${t}">${e}</span>
        </div>
        <span class="queue-toggle ${this.expanded?"expanded":""}">\u25BC</span>
      </div>

      ${this.expanded?d`
        <div class="queue-content">
          ${this.items.length===0?d`
            <div class="empty-state">\u2705 Fronta je pr\u00E1zdn\u00E1</div>
          `:d`
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
                ${this.items.map((i,r)=>this.renderRow(i,r))}
              </tbody>
            </table>
          `}
        </div>
      `:A}
    `}renderRow(t,e){const i=t.status==="running",{time:r,duration:n}=this.formatTimestamp(t.createdAt);return d`
      <tr>
        <td class="${i?"status-running":"status-queued"}">
          ${i?"🔄 Zpracovává se":"⏳ Čeká"}
        </td>
        <td>${this.formatServiceName(t.service)}</td>
        <td class="hide-mobile" style="font-size: 11px;">${this.formatChanges(t.changes)}</td>
        <td class="queue-time">${r}</td>
        <td class="queue-time duration">${n}</td>
        <td style="text-align: center;">
          ${i?d`<span style="opacity: 0.4;">\u2014</span>`:d`
            <button
              class="remove-btn"
              title="Odstranit z fronty"
              @click=${a=>this.removeItem(t.position,a)}
            >\uD83D\uDDD1\uFE0F</button>
          `}
        </td>
      </tr>
    `}};Rt.styles=P`
    :host {
      display: block;
      background: ${mt(o.cardBg)};
      border-radius: 12px;
      box-shadow: ${mt(o.cardShadow)};
      overflow: hidden;
    }

    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: ${mt(o.bgSecondary)};
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
      color: ${mt(o.textPrimary)};
    }

    .queue-count {
      font-size: 12px;
      color: ${mt(o.textSecondary)};
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
      color: ${mt(o.accent)};
      transition: transform 0.2s;
    }

    .queue-toggle.expanded {
      transform: rotate(180deg);
    }

    .queue-content {
      padding: 0;
      border-top: 1px solid ${mt(o.divider)};
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
      color: ${mt(o.textSecondary)};
      border-bottom: 1px solid ${mt(o.divider)};
      background: ${mt(o.bgSecondary)};
    }

    .queue-table td {
      padding: 8px 12px;
      color: ${mt(o.textPrimary)};
      border-bottom: 1px solid ${mt(o.divider)};
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
      color: ${mt(o.textSecondary)};
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
  `;De([h({type:Array})],Rt.prototype,"items",2);De([h({type:Boolean})],Rt.prototype,"expanded",2);De([h({type:String})],Rt.prototype,"shieldStatus",2);De([h({type:Number})],Rt.prototype,"queueCount",2);De([w()],Rt.prototype,"_now",2);Rt=De([E("oig-shield-queue")],Rt);var hu=Object.defineProperty,gu=Object.getOwnPropertyDescriptor,bi=(t,e,i,r)=>{for(var n=r>1?void 0:r?gu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&hu(e,i,n),n};const pt=Z;let re=class extends M{constructor(){super(...arguments),this.open=!1,this.config={title:"",message:""},this.acknowledged=!1,this.limitValue=5e3,this.resolver=null,this.onOverlayClick=()=>{this.closeDialog({confirmed:!1})},this.onDialogClick=t=>{t.stopPropagation()},this.onKeyDown=t=>{t.key==="Escape"&&this.open&&this.closeDialog({confirmed:!1})},this.onAckChange=t=>{this.acknowledged=t.target.checked},this.onLimitInput=t=>{this.limitValue=parseInt(t.target.value,10)||0},this.onCancel=()=>{this.closeDialog({confirmed:!1})},this.onConfirm=()=>{if(this.config.showLimitInput){const t=this.config.limitMin??1,e=this.config.limitMax??2e4;if(isNaN(this.limitValue)||this.limitValue<t||this.limitValue>e)return}this.closeDialog({confirmed:!0,limit:this.config.showLimitInput?this.limitValue:void 0})}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeyDown)}showDialog(t){return this.config=t,this.acknowledged=!1,this.limitValue=t.limitValue??5e3,this.open=!0,new Promise(e=>{this.resolver=e})}closeDialog(t){var e;this.open=!1,(e=this.resolver)==null||e.call(this,t),this.resolver=null}get canConfirm(){return!(this.config.requireAcknowledgement&&!this.acknowledged)}render(){if(!this.open)return A;const t=this.config;return d`
      <div @click=${this.onOverlayClick}>
        <div class="dialog" @click=${this.onDialogClick}>
          <div class="dialog-header">
            ${t.title}
          </div>

          <div class="dialog-body">
            ${this.renderHTML(t.message)}
          </div>

          ${t.showLimitInput?d`
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
          `:A}

          ${t.warning?d`
            <div class="dialog-warning">
              \u26A0\uFE0F ${this.renderHTML(t.warning)}
            </div>
          `:A}

          ${t.requireAcknowledgement?d`
            <div class="ack-wrapper" @click=${()=>{this.acknowledged=!this.acknowledged}}>
              <input
                type="checkbox"
                .checked=${this.acknowledged}
                @change=${this.onAckChange}
                @click=${e=>e.stopPropagation()}
              />
              <label>
                ${t.acknowledgementText?this.renderHTML(t.acknowledgementText):d`
                  <strong>Souhlas\u00EDm</strong> s t\u00EDm, \u017Ee m\u011Bn\u00EDm nastaven\u00ED na vlastn\u00ED odpov\u011Bdnost.
                  Aplikace nenese odpov\u011Bdnost za p\u0159\u00EDpadn\u00E9 negativn\u00ED d\u016Fsledky t\u00E9to zm\u011Bny.
                `}
              </label>
            </div>
          `:A}

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
    `}renderHTML(t){const e=document.createElement("div");return e.innerHTML=t,d`<span .innerHTML=${t}></span>`}};re.styles=P`
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
      background: ${pt(o.cardBg)};
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
      color: ${pt(o.textPrimary)};
      border-bottom: 1px solid ${pt(o.divider)};
    }

    .dialog-body {
      padding: 16px 20px;
      font-size: 14px;
      line-height: 1.5;
      color: ${pt(o.textPrimary)};
    }

    .dialog-warning {
      margin: 0 20px 12px;
      padding: 10px 14px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      font-size: 13px;
      color: ${pt(o.textPrimary)};
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
      background: ${pt(o.bgSecondary)};
      border-radius: 8px;
      cursor: pointer;
    }

    .ack-wrapper input[type="checkbox"] {
      margin-top: 2px;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${pt(o.accent)};
    }

    .ack-wrapper label {
      font-size: 13px;
      line-height: 1.4;
      color: ${pt(o.textPrimary)};
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
      color: ${pt(o.textPrimary)};
    }

    .limit-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid ${pt(o.divider)};
      border-radius: 8px;
      font-size: 14px;
      background: ${pt(o.bgPrimary)};
      color: ${pt(o.textPrimary)};
      box-sizing: border-box;
    }

    .limit-hint {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      opacity: 0.7;
      color: ${pt(o.textSecondary)};
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
      background: ${pt(o.bgSecondary)};
      color: ${pt(o.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${pt(o.divider)};
    }

    .btn-confirm {
      background: ${pt(o.accent)};
      color: #fff;
    }

    .btn-confirm:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-confirm:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;bi([h({type:Boolean,reflect:!0})],re.prototype,"open",2);bi([h({type:Object})],re.prototype,"config",2);bi([w()],re.prototype,"acknowledged",2);bi([w()],re.prototype,"limitValue",2);re=bi([E("oig-confirm-dialog")],re);var fu=Object.defineProperty,mu=Object.getOwnPropertyDescriptor,$a=(t,e,i,r)=>{for(var n=r>1?void 0:r?mu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&fu(e,i,n),n};const Ue=Z;let Vi=class extends M{constructor(){super(...arguments),this.shieldState=null}render(){if(!this.shieldState)return A;const t=this.determineStatus(this.shieldState),e=t.toLowerCase(),i=this.getStatusIcon(t),r=this.getStatusLabel(t),a=this.shieldState.queueCount>0?"has-items":"";return d`
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
          <span class="shield-status-badge ${e}">${r}</span>
        </div>
      </div>
    `}determineStatus(t){return t.status==="running"?"processing":t.queueCount>0?"pending":"idle"}getStatusIcon(t){switch(t){case"idle":return"✓";case"pending":return"⏳";case"processing":return"🔄";default:return"✓"}}getStatusLabel(t){switch(t){case"idle":return"Připraveno";case"pending":return"Čeká";case"processing":return"Zpracovává";default:return"Neznámý"}}getActivityText(){return this.shieldState?this.shieldState.activity?this.shieldState.activity:this.shieldState.queueCount>0?`${this.shieldState.queueCount} operací ve frontě`:"Systém připraven":"Žádná aktivita"}};Vi.styles=P`
    :host {
      display: block;
      padding: 16px 20px;
      border-top: 1px solid ${Ue(o.divider)};
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
      color: ${Ue(o.textPrimary)};
    }

    .shield-status-subtitle {
      font-size: 11px;
      color: ${Ue(o.textSecondary)};
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
      background: ${Ue(o.bgSecondary)};
      color: ${Ue(o.textSecondary)};
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
  `;$a([h({type:Object})],Vi.prototype,"shieldState",2);Vi=$a([E("oig-shield-status")],Vi);var bu=Object.defineProperty,yu=Object.getOwnPropertyDescriptor,zr=(t,e,i,r)=>{for(var n=r>1?void 0:r?yu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&bu(e,i,n),n};const he=Z;let si=class extends M{constructor(){super(...arguments),this.shieldState={...Jn,pendingServices:new Map,changingServices:new Set},this.unsubscribe=null,this.onShieldUpdate=t=>{this.shieldState=t}}connectedCallback(){super.connectedCallback(),this.unsubscribe=J.subscribe(this.onShieldUpdate)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this.unsubscribe)==null||t.call(this),this.unsubscribe=null}get boxModeButtonStates(){return{home_1:J.getBoxModeButtonState("home_1"),home_2:J.getBoxModeButtonState("home_2"),home_3:J.getBoxModeButtonState("home_3"),home_ups:J.getBoxModeButtonState("home_ups"),home_5:J.getBoxModeButtonState("home_5"),home_6:J.getBoxModeButtonState("home_6")}}get gridDeliveryButtonStates(){return{off:J.getGridDeliveryButtonState("off"),on:J.getGridDeliveryButtonState("on"),limited:J.getGridDeliveryButtonState("limited")}}get boilerModeButtonStates(){return{cbb:J.getBoilerModeButtonState("cbb"),manual:J.getBoilerModeButtonState("manual")}}async onBoxModeChange(t){const{mode:e}=t.detail,i=Zn[e];if(y.debug("Control panel: box mode change requested",{mode:e}),!(await this.confirmDialog.showDialog({title:"Změna režimu střídače",message:`Chystáte se změnit režim boxu na <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování celého systému a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!J.shouldProceedWithQueue())return;await J.setBoxMode(e)||y.warn("Box mode change failed or already active",{mode:e})}async onGridDeliveryChange(t){const{value:e,limit:i}=t.detail,r=Si[e],n=Eo[e],a=e==="limited",s=this.shieldState.currentGridLimit||5e3;y.debug("Control panel: grid delivery change requested",{delivery:e,limit:i});const l={title:`${n} Změna dodávky do sítě`,message:`Chystáte se změnit dodávku do sítě na: <strong>"${r}"</strong>`,warning:a?"Režim a limit budou změněny postupně (serializováno). Každá změna může trvat až 10 minut.":"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,acknowledgementText:"<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost. Aplikace nenese odpovědnost za případné negativní důsledky této změny.",confirmText:"Potvrdit změnu",cancelText:"Zrušit",showLimitInput:a,limitValue:s,limitMin:1,limitMax:2e4,limitStep:100},c=await this.confirmDialog.showDialog(l);if(!c.confirmed||!J.shouldProceedWithQueue())return;const u=this.shieldState.currentGridDelivery==="limited",p=e==="limited";u&&p&&c.limit!=null?await J.setGridDelivery(e,c.limit):p&&c.limit!=null?await J.setGridDelivery(e,c.limit):await J.setGridDelivery(e)}async onBoilerModeChange(t){const{mode:e}=t.detail,i=Qn[e],r=Xn[e];if(y.debug("Control panel: boiler mode change requested",{mode:e}),!(await this.confirmDialog.showDialog({title:"Změna režimu bojleru",message:`Chystáte se změnit režim bojleru na <strong>"${r} ${i}"</strong>.<br><br>Tato změna ovlivní chování ohřevu vody a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!J.shouldProceedWithQueue())return;await J.setBoilerMode(e)||y.warn("Boiler mode change failed or already active",{mode:e})}async onQueueRemoveItem(t){const{position:e}=t.detail;y.debug("Control panel: queue remove requested",{position:e});const i=this.shieldState.allRequests.find(s=>s.position===e);let r="Operace";if(i&&(i.service.includes("set_box_mode")?r=`Změna režimu na ${i.targetValue||"neznámý"}`:i.service.includes("set_grid_delivery")?r=`Změna dodávky do sítě na ${i.targetValue||"neznámý"}`:i.service.includes("set_boiler_mode")&&(r=`Změna režimu bojleru na ${i.targetValue||"neznámý"}`)),!(await this.confirmDialog.showDialog({title:r,message:"Operace bude odstraněna z fronty bez provedení.",requireAcknowledgement:!1,confirmText:"OK",cancelText:"Zrušit"})).confirmed)return;await J.removeFromQueue(e)||y.warn("Failed to remove from queue",{position:e})}render(){const t=this.shieldState,e=t.status==="running"?"running":"idle",i=t.status==="running"?"Zpracovává":"Připraveno",r=t.allRequests.length>0;return d`
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
        ${r?d`
          <div class="queue-section">
            <oig-shield-queue
              .items=${t.allRequests}
              .shieldStatus=${t.status}
              .queueCount=${t.queueCount}
              .expanded=${!1}
              @remove-item=${this.onQueueRemoveItem}
            ></oig-shield-queue>
          </div>
        `:A}
      </div>

      <!-- Shared confirm dialog instance -->
      <oig-confirm-dialog></oig-confirm-dialog>
    `}};si.styles=P`
    :host {
      display: block;
      margin-top: 16px;
    }

    .control-panel {
      background: ${he(o.cardBg)};
      border-radius: 16px;
      box-shadow: ${he(o.cardShadow)};
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid ${he(o.divider)};
    }

    .panel-title {
      font-size: 15px;
      font-weight: 600;
      color: ${he(o.textPrimary)};
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
      background: ${he(o.divider)};
      margin: 16px 0;
    }

    .queue-section {
      border-top: 1px solid ${he(o.divider)};
    }

    @media (max-width: 480px) {
      .panel-body {
        padding: 12px 14px;
      }
    }
  `;zr([w()],si.prototype,"shieldState",2);zr([Zi("oig-confirm-dialog")],si.prototype,"confirmDialog",2);si=zr([E("oig-control-panel")],si);var vu=Object.defineProperty,xu=Object.getOwnPropertyDescriptor,Oe=(t,e,i,r)=>{for(var n=r>1?void 0:r?xu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&vu(e,i,n),n};const ht=Z;let Ht=class extends M{constructor(){super(...arguments),this.open=!1,this.currentSoc=0,this.maxSoc=100,this.estimate=null,this.targetSoc=80}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onSliderInput(t){this.targetSoc=parseInt(t.target.value,10),this.dispatchEvent(new CustomEvent("soc-change",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}onConfirm(){this.dispatchEvent(new CustomEvent("confirm",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}render(){return d`
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
          
          ${this.estimate?d`
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
    `}};Ht.styles=P`
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
      background: ${ht(o.cardBg)};
      border-radius: 16px;
      padding: 24px;
      min-width: 320px;
      max-width: 90vw;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${ht(o.textPrimary)};
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
      color: ${ht(o.textSecondary)};
    }

    .soc-value {
      font-size: 24px;
      font-weight: 600;
      color: ${ht(o.textPrimary)};
    }

    .soc-arrow {
      font-size: 20px;
      color: ${ht(o.textSecondary)};
    }

    .slider-container {
      margin: 16px 0;
    }

    .slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: ${ht(o.bgSecondary)};
      -webkit-appearance: none;
      appearance: none;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${ht(o.accent)};
      cursor: pointer;
    }

    .estimate {
      background: ${ht(o.bgSecondary)};
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
      color: ${ht(o.textSecondary)};
    }

    .estimate-value {
      color: ${ht(o.textPrimary)};
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
      background: ${ht(o.bgSecondary)};
      color: ${ht(o.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${ht(o.divider)};
    }

    .btn-confirm {
      background: ${ht(o.accent)};
      color: #fff;
    }

    .btn-confirm:hover {
      opacity: 0.9;
    }
  `;Oe([h({type:Boolean})],Ht.prototype,"open",2);Oe([h({type:Number})],Ht.prototype,"currentSoc",2);Oe([h({type:Number})],Ht.prototype,"maxSoc",2);Oe([h({type:Object})],Ht.prototype,"estimate",2);Oe([w()],Ht.prototype,"targetSoc",2);Ht=Oe([E("oig-battery-charge-dialog")],Ht);var wu=Object.defineProperty,$u=Object.getOwnPropertyDescriptor,St=(t,e,i,r)=>{for(var n=r>1?void 0:r?$u(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&wu(e,i,n),n};const pr=Z,Ar=P`
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
`;let oi=class extends M{constructor(){super(...arguments),this.title="",this.icon="📊"}render(){return d`
      <div class="block-header">
        <span class="block-icon">${this.icon}</span>
        <span class="block-title">${this.title}</span>
      </div>
      <slot></slot>
    `}};oi.styles=P`
    :host {
      display: block;
      background: ${pr(o.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${pr(o.cardShadow)};
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
      color: ${pr(o.textPrimary)};
    }

    ${Ar}
  `;St([h({type:String})],oi.prototype,"title",2);St([h({type:String})],oi.prototype,"icon",2);oi=St([E("oig-analytics-block")],oi);let qi=class extends M{constructor(){super(...arguments),this.data=null}render(){if(!this.data)return d`<div>Načítání...</div>`;const t=this.data.trend>=0?"positive":"negative",e=this.data.trend>=0?"+":"",i=this.data.period==="last_month"?"Minulý měsíc":`Aktuální měsíc (${this.data.currentMonthDays} dní)`;return d`
      <div class="efficiency-value">${ve(this.data.efficiency,1)}</div>
      <div class="period-label">${i}</div>

      ${this.data.trend!==0?d`
        <div class="comparison ${t}">
          ${e}${ve(this.data.trend)} vs minulý měsíc
        </div>
      `:null}

      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${ye(this.data.charged)}</div>
          <div class="stat-label">Nabito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${ye(this.data.discharged)}</div>
          <div class="stat-label">Vybito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${ye(this.data.losses)}</div>
          <div class="stat-label">Ztráty</div>
          ${this.data.lossesPct?d`
            <div class="losses-pct">${ve(this.data.lossesPct,1)}</div>
          `:null}
        </div>
      </div>
    `}};qi.styles=P`
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
  `;St([h({type:Object})],qi.prototype,"data",2);qi=St([E("oig-battery-efficiency")],qi);let Yi=class extends M{constructor(){super(...arguments),this.data=null}renderSparkline(){var c;const t=(c=this.data)==null?void 0:c.measurementHistory;if(!t||t.length<2)return null;const e=t.map(u=>u.soh_percent),i=Math.min(...e)-1,n=Math.max(...e)+1-i||1,a=200,s=40,l=e.map((u,p)=>{const g=p/(e.length-1)*a,m=s-(u-i)/n*s;return`${g},${m}`}).join(" ");return d`
      <div class="sparkline-container">
        <svg viewBox="0 0 ${a} ${s}" preserveAspectRatio="none">
          <polyline
            points="${l}"
            fill="none"
            stroke="#4caf50"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
    `}render(){return this.data?d`
      <oig-analytics-block title="Zdraví baterie" icon="❤️">
        <span class="status-badge ${this.data.status}">${this.data.statusLabel}</span>

        ${this.renderSparkline()}

        <div class="metric">
          <span class="metric-label">State of Health</span>
          <span class="metric-value">${ve(this.data.soh,1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Kapacita (P80)</span>
          <span class="metric-value">${ye(this.data.capacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Min. kapacita (P20)</span>
          <span class="metric-value">${ye(this.data.minCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Nominální kapacita</span>
          <span class="metric-value">${ye(this.data.nominalCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Počet měření</span>
          <span class="metric-value">${this.data.measurementCount}</span>
        </div>
        ${this.data.qualityScore!=null?d`
          <div class="metric">
            <span class="metric-label">Kvalita dat</span>
            <span class="metric-value">${ve(this.data.qualityScore,0)}</span>
          </div>
        `:null}

        ${this.data.degradation3m!=null||this.data.degradation6m!=null||this.data.degradation12m!=null?d`
          <div class="degradation-section">
            <div class="section-label">Degradace</div>
            ${this.data.degradation3m!=null?d`
              <div class="metric">
                <span class="metric-label">3 měsíce</span>
                <span class="metric-value ${this.data.degradation3m>0?"negative":""}">${this.data.degradation3m.toFixed(2)} %</span>
              </div>
            `:null}
            ${this.data.degradation6m!=null?d`
              <div class="metric">
                <span class="metric-label">6 měsíců</span>
                <span class="metric-value ${this.data.degradation6m>0?"negative":""}">${this.data.degradation6m.toFixed(2)} %</span>
              </div>
            `:null}
            ${this.data.degradation12m!=null?d`
              <div class="metric">
                <span class="metric-label">12 měsíců</span>
                <span class="metric-value ${this.data.degradation12m>0?"negative":""}">${this.data.degradation12m.toFixed(2)} %</span>
              </div>
            `:null}
          </div>
        `:null}

        ${this.data.degradationPerYear!=null||this.data.estimatedEolDate!=null?d`
          <div class="degradation-section">
            <div class="section-label">Predikce</div>
            ${this.data.degradationPerYear!=null?d`
              <div class="prediction">
                Degradace: <span class="prediction-value">${this.data.degradationPerYear.toFixed(2)} %/rok</span>
              </div>
            `:null}
            ${this.data.yearsTo80Pct!=null?d`
              <div class="prediction">
                80% SoH za: <span class="prediction-value">${this.data.yearsTo80Pct.toFixed(1)} let</span>
              </div>
            `:null}
            ${this.data.estimatedEolDate?d`
              <div class="prediction">
                Odhad EOL: <span class="prediction-value">${this.data.estimatedEolDate}</span>
              </div>
            `:null}
            ${this.data.trendConfidence!=null?d`
              <div class="prediction">
                Spolehlivost: <span class="prediction-value">${ve(this.data.trendConfidence,0)}</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:d`<div>Načítání...</div>`}};Yi.styles=P`
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

    ${Ar}

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
  `;St([h({type:Object})],Yi.prototype,"data",2);Yi=St([E("oig-battery-health")],Yi);let Ui=class extends M{constructor(){super(...arguments),this.data=null}getProgressClass(t){return t==null?"ok":t>=95?"overdue":t>=80?"due-soon":"ok"}render(){return this.data?d`
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
          <span class="metric-value">${it(this.data.cost)}</span>
        </div>
        ${this.data.nextScheduled?d`
          <div class="metric">
            <span class="metric-label">Plánováno</span>
            <span class="metric-value">${this.data.nextScheduled}</span>
          </div>
        `:null}

        ${this.data.progressPercent!=null?d`
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

        ${this.data.intervalDays!=null?d`
          <div class="metric">
            <span class="metric-label">Interval</span>
            <span class="metric-value">${this.data.intervalDays} dní</span>
          </div>
        `:null}
        ${this.data.estimatedNextCost!=null?d`
          <div class="metric">
            <span class="metric-label">Odhad dalších nákladů</span>
            <span class="metric-value">${it(this.data.estimatedNextCost)}</span>
          </div>
        `:null}
      </oig-analytics-block>
    `:d`<div>Načítání...</div>`}};Ui.styles=P`
    :host { display: block; }
    ${Ar}

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
  `;St([h({type:Object})],Ui.prototype,"data",2);Ui=St([E("oig-battery-balancing")],Ui);let Gi=class extends M{constructor(){super(...arguments),this.data=null}render(){return this.data?d`
      <oig-analytics-block title="Porovnání nákladů" icon="💰">
        <div class="cost-row">
          <span class="cost-label">Skutečné náklady</span>
          <span class="cost-value">${it(this.data.actualSpent)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Plán celkem</span>
          <span class="cost-value">${it(this.data.planTotalCost)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Zbývající plán</span>
          <span class="cost-value">${it(this.data.futurePlanCost)}</span>
        </div>
        ${this.data.tomorrowCost!=null?d`
          <div class="cost-row">
            <span class="cost-label">Zítra odhad</span>
            <span class="cost-value">${it(this.data.tomorrowCost)}</span>
          </div>
        `:null}

        ${this.data.yesterdayActualCost!=null?d`
          <div class="yesterday-section">
            <div class="section-label">Včera</div>
            <div class="cost-row">
              <span class="cost-label">Plán</span>
              <span class="cost-value">${this.data.yesterdayPlannedCost!=null?it(this.data.yesterdayPlannedCost):"—"}</span>
            </div>
            <div class="cost-row">
              <span class="cost-label">Skutečnost</span>
              <span class="cost-value">${it(this.data.yesterdayActualCost)}</span>
            </div>
            ${this.data.yesterdayDelta!=null?d`
              <div class="cost-row">
                <span class="cost-label">Rozdíl</span>
                <span class="cost-value ${this.data.yesterdayDelta<=0?"delta-positive":"delta-negative"}">
                  ${this.data.yesterdayDelta>=0?"+":""}${it(this.data.yesterdayDelta)}
                </span>
              </div>
            `:null}
            ${this.data.yesterdayAccuracy!=null?d`
              <div class="cost-row">
                <span class="cost-label">Přesnost</span>
                <span class="cost-value">${this.data.yesterdayAccuracy.toFixed(0)}%</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:d`<div>Načítání...</div>`}};Gi.styles=P`
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
  `;St([h({type:Object})],Gi.prototype,"data",2);Gi=St([E("oig-cost-comparison")],Gi);var _u=Object.defineProperty,ku=Object.getOwnPropertyDescriptor,ze=(t,e,i,r)=>{for(var n=r>1?void 0:r?ku(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&_u(e,i,n),n};const fe=Z;let li=class extends M{constructor(){super(...arguments),this.data=Ze,this.compact=!1,this.onClick=()=>{this.dispatchEvent(new CustomEvent("badge-click",{bubbles:!0}))}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.onClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.onClick)}render(){const t=this.data.effectiveSeverity,e=Ei[t]??Ei[0],i=this.data.warningsCount>0&&t>0,r=i?qn(this.data.eventType):"✓";return d`
      <style>
        :host { background: ${fe(e)}; }
      </style>
      <span class="badge-icon">${r}</span>
      ${i?d`
        <span class="badge-count">${this.data.warningsCount}</span>
      `:null}
      <span class="badge-label">${i?Yn[t]??"Výstraha":"OK"}</span>
    `}};li.styles=P`
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
  `;ze([h({type:Object})],li.prototype,"data",2);ze([h({type:Boolean})],li.prototype,"compact",2);li=ze([E("oig-chmu-badge")],li);let ci=class extends M{constructor(){super(...arguments),this.open=!1,this.data=Ze}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}formatTime(t){return t?new Date(t).toLocaleString("cs-CZ"):"—"}renderWarning(t){const e=Ei[t.severity]??Ei[2],i=qn(t.event_type),r=Yn[t.severity]??"Neznámá";return d`
      <div class="warning-item" style="background: ${e}">
        <div class="warning-header">
          <span class="warning-icon">${i}</span>
          <span class="warning-type">${t.event_type}</span>
          <span class="warning-level">${r}</span>
          ${t.eta_hours>0?d`
            <span class="eta-badge">za ${t.eta_hours.toFixed(0)}h</span>
          `:null}
        </div>
        ${t.description?d`
          <div class="warning-description">${t.description}</div>
        `:null}
        ${t.instruction?d`
          <div class="warning-instruction">${t.instruction}</div>
        `:null}
        <div class="warning-time">
          ${this.formatTime(t.onset)} — ${this.formatTime(t.expires)}
        </div>
      </div>
    `}render(){const t=this.data.allWarnings,e=t.length>0&&this.data.effectiveSeverity>0;return d`
      <div class="modal" @click=${i=>i.stopPropagation()}>
        <div class="modal-header">
          <span class="modal-title">⚠️ ČHMÚ výstrahy</span>
          <button class="close-btn" @click=${this.onClose}>✕</button>
        </div>

        ${e?t.map(i=>this.renderWarning(i)):d`
          <div class="empty-state">Žádné aktivní výstrahy</div>
        `}
      </div>
    `}};ci.styles=P`
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
      background: ${fe(o.cardBg)};
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
      color: ${fe(o.textPrimary)};
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      font-size: 20px;
      cursor: pointer;
      color: ${fe(o.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${fe(o.bgSecondary)};
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
      color: ${fe(o.textSecondary)};
    }

    .eta-badge {
      display: inline-block;
      font-size: 10px;
      padding: 1px 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      margin-left: 6px;
    }
  `;ze([h({type:Boolean,reflect:!0})],ci.prototype,"open",2);ze([h({type:Object})],ci.prototype,"data",2);ci=ze([E("oig-chmu-modal")],ci);var Su=Object.defineProperty,Cu=Object.getOwnPropertyDescriptor,It=(t,e,i,r)=>{for(var n=r>1?void 0:r?Cu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&Su(e,i,n),n};const F=Z;let ne=class extends M{constructor(){super(...arguments),this.open=!1,this.activeTab="today",this.data=null,this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.open&&this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onTabClick(t){this.activeTab=t,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:t},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(t){return`${t.toFixed(0)}%`}adherenceColor(t){return t>=90?"#4caf50":t>=70?"#ff9800":"#f44336"}getModeConfig(t){return Un[t]??{icon:"❓",color:"#666",label:t}}renderModeBlock(t){const e=this.getModeConfig(t.modePlanned||t.modeHistorical),i=t.status==="current";return d`
      <div
        class="mode-block ${i?"current":""}"
        style="background: ${e.color}; flex: ${Math.max(t.durationHours,.5)}"
        title="${t.startTime}–${t.endTime} | ${e.label}"
      >
        ${t.modeMatch?null:d`<span class="mode-mismatch">!</span>`}
        <span class="mode-icon">${e.icon}</span>
        <span class="mode-name">${e.label}</span>
        <span class="mode-time">${t.startTime}–${t.endTime}</span>
        ${t.costPlanned!=null?d`
          <span class="mode-cost">${it(t.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(t,e){const i=e.unit==="Kč"?it(e.plan):`${e.plan.toFixed(1)} ${e.unit}`;let r="",n="";return e.hasActual&&e.actual!=null&&(n=e.unit==="Kč"?it(e.actual):`${e.actual.toFixed(1)} ${e.unit}`,e.unit==="Kč"?r=e.actual<=e.plan?"better":"worse":r=e.actual>=e.plan?"better":"worse"),d`
      <div class="metric-tile">
        <div class="metric-label">${t}</div>
        <div class="metric-values">
          <span class="metric-plan">${i}</span>
          ${e.hasActual?d`
            <span class="metric-actual ${r}">(${n})</span>
          `:null}
        </div>
      </div>
    `}render(){const t=["yesterday","today","tomorrow","history","detail"];return d`
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
          ${t.map(e=>d`
            <button
              class="tab ${this.activeTab===e?"active":""}"
              @click=${()=>this.onTabClick(e)}
            >
              ${Gn[e]}
            </button>
          `)}
        </div>

        <div class="dialog-content">
          ${this.data?this.renderDayContent():d`
            <div class="empty-state">Načítání dat...</div>
          `}
        </div>
      </div>
    `}renderDayContent(){const t=this.data,e=t.summary;return d`
      <!-- Adherence bar -->
      ${e.overallAdherence>0?d`
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
      ${e.progressPct!=null?d`
        <div class="progress-section">
          <div class="progress-item">
            Průběh: <span class="progress-value">${this.fmtPct(e.progressPct)}</span>
          </div>
          ${e.actualTotalCost!=null?d`
            <div class="progress-item">
              Skutečné: <span class="progress-value">${it(e.actualTotalCost)}</span>
            </div>
          `:null}
          ${e.planTotalCost!=null?d`
            <div class="progress-item">
              Plán: <span class="progress-value">${it(e.planTotalCost)}</span>
            </div>
          `:null}
          ${e.vsPlanPct!=null?d`
            <div class="progress-item">
              vs plán: <span class="progress-value" style="color: ${e.vsPlanPct<=100?"#4caf50":"#f44336"}">${this.fmtPct(e.vsPlanPct)}</span>
            </div>
          `:null}
        </div>
      `:null}

      <!-- EOD prediction -->
      ${e.eodPrediction?d`
        <div class="eod-prediction">
          Predikce konce dne: <span class="eod-value">${it(e.eodPrediction.predictedTotal)}</span>
          ${e.eodPrediction.predictedSavings>0?d`
            <span class="eod-savings"> (úspora ${it(e.eodPrediction.predictedSavings)})</span>
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
      ${t.modeBlocks.length>0?d`
        <div class="modes-section">
          <div class="section-title">Režimy (${t.modeBlocks.length} bloků, ${e.modeSwitches} přepnutí)</div>
          <div class="mode-blocks-timeline">
            ${t.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}

      <!-- Comparison plan (if available) -->
      ${t.comparison?d`
        <div class="modes-section">
          <div class="section-title">Srovnání: ${t.comparison.plan}</div>
          <div class="mode-blocks-timeline">
            ${t.comparison.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}
    `}};ne.styles=P`
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
      background: ${F(o.cardBg)};
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
      border-bottom: 1px solid ${F(o.divider)};
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${F(o.textPrimary)};
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
      color: ${F(o.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${F(o.bgSecondary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${F(o.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${F(o.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 12px 16px;
      border: none;
      background: transparent;
      font-size: 13px;
      color: ${F(o.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${F(o.textPrimary)};
    }

    .tab.active {
      color: ${F(o.accent)};
      border-bottom-color: ${F(o.accent)};
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
      color: ${F(o.textSecondary)};
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
      background: ${F(o.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
    }

    .metric-label {
      font-size: 11px;
      color: ${F(o.textSecondary)};
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
      color: ${F(o.textPrimary)};
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
      color: ${F(o.textPrimary)};
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
      color: ${F(o.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${F(o.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${F(o.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 12px;
      color: ${F(o.textSecondary)};
    }

    .eod-value {
      font-size: 16px;
      font-weight: 600;
      color: ${F(o.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: ${F(o.textSecondary)};
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
  `;It([h({type:Boolean,reflect:!0})],ne.prototype,"open",2);It([h({type:String})],ne.prototype,"activeTab",2);It([h({type:Object})],ne.prototype,"data",2);It([w()],ne.prototype,"autoRefresh",2);ne=It([E("oig-timeline-dialog")],ne);let Pe=class extends M{constructor(){super(...arguments),this.data=null,this.activeTab="today",this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onTabClick(t){this.activeTab=t,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:t},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(t){return`${t.toFixed(0)}%`}adherenceColor(t){return t>=90?"#4caf50":t>=70?"#ff9800":"#f44336"}getModeConfig(t){return Un[t]??{icon:"❓",color:"#666",label:t}}renderModeBlock(t){const e=this.getModeConfig(t.modePlanned||t.modeHistorical),i=t.status==="current";return d`
      <div
        class="mode-block ${i?"current":""}"
        style="background: ${e.color}; flex: ${Math.max(t.durationHours,.5)}"
        title="${t.startTime}–${t.endTime} | ${e.label}"
      >
        ${t.modeMatch?null:d`<span class="mode-mismatch">!</span>`}
        <span class="mode-icon">${e.icon}</span>
        <span class="mode-name">${e.label}</span>
        <span class="mode-time">${t.startTime}–${t.endTime}</span>
        ${t.costPlanned!=null?d`
          <span class="mode-cost">${it(t.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(t,e){const i=e.unit==="Kč"?it(e.plan):`${e.plan.toFixed(1)} ${e.unit}`;let r="",n="";return e.hasActual&&e.actual!=null&&(n=e.unit==="Kč"?it(e.actual):`${e.actual.toFixed(1)} ${e.unit}`,e.unit==="Kč"?r=e.actual<=e.plan?"better":"worse":r=e.actual>=e.plan?"better":"worse"),d`
      <div class="metric-tile">
        <div class="metric-label">${t}</div>
        <div class="metric-values">
          <span class="metric-plan">${i}</span>
          ${e.hasActual?d`
            <span class="metric-actual ${r}">(${n})</span>
          `:null}
        </div>
      </div>
    `}render(){const t=["yesterday","today","tomorrow","history","detail"];return d`
      <div class="tile">
        <div class="tile-header">
          <span class="tile-title">📅 Plán režimů</span>
          <label class="auto-refresh">
            <input type="checkbox" .checked=${this.autoRefresh} @change=${this.toggleAutoRefresh} />
            Auto
          </label>
        </div>

        <div class="tabs">
          ${t.map(e=>d`
            <button
              class="tab ${this.activeTab===e?"active":""}"
              @click=${()=>this.onTabClick(e)}
            >
              ${Gn[e]}
            </button>
          `)}
        </div>

        <div class="tile-content">
          ${this.data?this.renderDayContent():d`
            <div class="empty-state">Načítání dat...</div>
          `}
        </div>
      </div>
    `}renderDayContent(){const t=this.data,e=t.summary;return d`
      <!-- Adherence bar -->
      ${e.overallAdherence>0?d`
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
      ${e.progressPct!=null?d`
        <div class="progress-section">
          <div class="progress-item">
            Průběh: <span class="progress-value">${this.fmtPct(e.progressPct)}</span>
          </div>
          ${e.actualTotalCost!=null?d`
            <div class="progress-item">
              Skutečné: <span class="progress-value">${it(e.actualTotalCost)}</span>
            </div>
          `:null}
          ${e.planTotalCost!=null?d`
            <div class="progress-item">
              Plán: <span class="progress-value">${it(e.planTotalCost)}</span>
            </div>
          `:null}
          ${e.vsPlanPct!=null?d`
            <div class="progress-item">
              vs plán: <span class="progress-value" style="color: ${e.vsPlanPct<=100?"#4caf50":"#f44336"}">${this.fmtPct(e.vsPlanPct)}</span>
            </div>
          `:null}
        </div>
      `:null}

      <!-- EOD prediction -->
      ${e.eodPrediction?d`
        <div class="eod-prediction">
          Predikce konce dne: <span class="eod-value">${it(e.eodPrediction.predictedTotal)}</span>
          ${e.eodPrediction.predictedSavings>0?d`
            <span class="eod-savings"> (úspora ${it(e.eodPrediction.predictedSavings)})</span>
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
      ${t.modeBlocks.length>0?d`
        <div class="modes-section">
          <div class="section-title">Režimy (${t.modeBlocks.length} bloků, ${e.modeSwitches} přepnutí)</div>
          <div class="mode-blocks-timeline">
            ${t.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}

      <!-- Comparison plan (if available) -->
      ${t.comparison?d`
        <div class="modes-section">
          <div class="section-title">Srovnání: ${t.comparison.plan}</div>
          <div class="mode-blocks-timeline">
            ${t.comparison.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}
    `}};Pe.styles=P`
    :host {
      display: block;
    }

    .tile {
      background: ${F(o.cardBg)};
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
      border-bottom: 1px solid ${F(o.divider)};
    }

    .tile-title {
      font-size: 13px;
      font-weight: 600;
      color: ${F(o.textPrimary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${F(o.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${F(o.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 6px 10px;
      border: none;
      background: transparent;
      font-size: 11px;
      color: ${F(o.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${F(o.textPrimary)};
    }

    .tab.active {
      color: ${F(o.accent)};
      border-bottom-color: ${F(o.accent)};
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
      color: ${F(o.textSecondary)};
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
      background: ${F(o.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
    }

    .metric-label {
      font-size: 10px;
      color: ${F(o.textSecondary)};
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
      color: ${F(o.textPrimary)};
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
      color: ${F(o.textPrimary)};
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
      color: ${F(o.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${F(o.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${F(o.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${F(o.textSecondary)};
    }

    .eod-value {
      font-size: 14px;
      font-weight: 600;
      color: ${F(o.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 24px 16px;
      color: ${F(o.textSecondary)};
      font-size: 12px;
    }
  `;It([h({type:Object})],Pe.prototype,"data",2);It([h({type:String})],Pe.prototype,"activeTab",2);It([w()],Pe.prototype,"autoRefresh",2);Pe=It([E("oig-timeline-tile")],Pe);var Pu=Object.defineProperty,Tu=Object.getOwnPropertyDescriptor,jt=(t,e,i,r)=>{for(var n=r>1?void 0:r?Tu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&Pu(e,i,n),n};const at=Z;let Te=class extends M{constructor(){super(...arguments),this.data=null,this.editMode=!1,this.tileType="entity"}onTileClick(){var e;if(this.editMode)return;const t=(e=this.data)==null?void 0:e.config;t&&(t.type==="button"&&t.action?Po(t.entity_id,t.action):X.openEntityDialog(t.entity_id))}onSupportClick(t,e){t.stopPropagation(),!this.editMode&&X.openEntityDialog(e)}onEdit(){var t;this.dispatchEvent(new CustomEvent("edit-tile",{detail:{entityId:(t=this.data)==null?void 0:t.config.entity_id},bubbles:!0,composed:!0}))}onDelete(){var t;this.dispatchEvent(new CustomEvent("delete-tile",{detail:{entityId:(t=this.data)==null?void 0:t.config.entity_id},bubbles:!0,composed:!0}))}render(){var c,u;if(!this.data)return null;const t=this.data.config,e=t.type==="button";this.tileType!==t.type&&(this.tileType=t.type??"entity");const i=t.color||"",r=t.icon||(e?"⚡":"📊"),n=r.startsWith("mdi:")?Di(r):r,a=(c=t.support_entities)==null?void 0:c.top_right,s=(u=t.support_entities)==null?void 0:u.bottom_right,l=this.data.supportValues.topRight||this.data.supportValues.bottomRight;return d`
      ${i?d`<style>:host { --tile-color: ${at(i)}; }</style>`:null}

      <div class="tile-top" @click=${this.onTileClick} title=${this.editMode?"":t.entity_id}>
        <span class="tile-icon">${n}</span>
        <span class="tile-label">${t.label||""}</span>
        ${l?d`
          <div class="support-values">
            ${this.data.supportValues.topRight?d`
              <span
                class="support-value ${a&&!this.editMode?"clickable":""}"
                @click=${a&&!this.editMode?p=>this.onSupportClick(p,a):null}
              >${this.data.supportValues.topRight.value} ${this.data.supportValues.topRight.unit}</span>
            `:null}
            ${this.data.supportValues.bottomRight?d`
              <span
                class="support-value ${s&&!this.editMode?"clickable":""}"
                @click=${s&&!this.editMode?p=>this.onSupportClick(p,s):null}
              >${this.data.supportValues.bottomRight.value} ${this.data.supportValues.bottomRight.unit}</span>
            `:null}
          </div>
        `:null}
      </div>

      <div class="tile-main" @click=${this.onTileClick}>
        <span class="tile-value">${this.data.value}</span>
        ${this.data.unit?d`<span class="tile-unit">${this.data.unit}</span>`:null}
        ${e?d`
          <span class="state-dot ${this.data.isActive?"on":"off"}"></span>
        `:null}
      </div>

      ${this.editMode?d`
        <div class="edit-actions">
          <button class="edit-btn" @click=${this.onEdit}>⚙</button>
          <button class="delete-btn" @click=${this.onDelete}>✕</button>
        </div>
      `:null}
    `}};Te.styles=P`
    /* ===== BASE ===== */
    :host {
      display: flex;
      flex-direction: column;
      padding: 10px 12px;
      background: ${at(o.cardBg)};
      border-radius: 10px;
      box-shadow: ${at(o.cardShadow)};
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
      color: ${at(o.textSecondary)};
      opacity: 0.45;
      font-style: normal;
    }

    /* ===== BUTTON TILE ===== */
    :host([tiletype="button"]) {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--tile-color, ${at(o.accent)}) 10%, ${at(o.cardBg)}),
        ${at(o.cardBg)}
      );
      border: 1px solid color-mix(in srgb, var(--tile-color, ${at(o.accent)}) 38%, transparent);
    }

    :host([tiletype="button"]:not([editmode]):hover) {
      transform: translateY(-2px);
      cursor: pointer;
      box-shadow:
        0 4px 14px color-mix(in srgb, var(--tile-color, ${at(o.accent)}) 28%, transparent),
        ${at(o.cardShadow)};
    }

    :host([tiletype="button"]:not([editmode]):active) {
      transform: translateY(0) scale(0.98);
      opacity: 0.85;
    }

    :host([tiletype="button"]) .tile-icon {
      background: color-mix(in srgb, var(--tile-color, ${at(o.accent)}) 18%, transparent);
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
      color: ${at(o.textSecondary)};
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
      color: ${at(o.textSecondary)};
      white-space: nowrap;
      line-height: 1.2;
    }

    .support-value.clickable {
      cursor: pointer;
    }

    .support-value.clickable:hover {
      text-decoration: underline;
      color: ${at(o.textPrimary)};
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
      color: ${at(o.textPrimary)};
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .tile-unit {
      font-size: 11px;
      font-weight: 400;
      color: ${at(o.textSecondary)};
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
      background: ${at(o.success)};
      box-shadow: 0 0 4px ${at(o.success)};
    }

    .state-dot.off {
      background: ${at(o.textSecondary)};
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
      background: ${at(o.bgSecondary)};
      border-radius: 50%;
      font-size: 9px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .delete-btn:hover {
      background: ${at(o.error)};
      color: #fff;
    }
  `;jt([h({type:Object})],Te.prototype,"data",2);jt([h({type:Boolean})],Te.prototype,"editMode",2);jt([h({type:String,reflect:!0})],Te.prototype,"tileType",2);Te=jt([E("oig-tile")],Te);let Me=class extends M{constructor(){super(...arguments),this.tiles=[],this.editMode=!1,this.position="left"}render(){return this.tiles.length===0?d`<div class="empty-state">Žádné dlaždice</div>`:d`
      ${this.tiles.map(t=>d`
        <oig-tile
          .data=${t}
          .editMode=${this.editMode}
          .tileType=${t.config.type??"entity"}
          class="${t.isZero?"inactive":""}"
        ></oig-tile>
      `)}
    `}};Me.styles=P`
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }

    .empty-state {
      font-size: 12px;
      color: ${at(o.textSecondary)};
      padding: 8px;
      text-align: center;
      opacity: 0.6;
    }
  `;jt([h({type:Array})],Me.prototype,"tiles",2);jt([h({type:Boolean})],Me.prototype,"editMode",2);jt([h({type:String,reflect:!0})],Me.prototype,"position",2);Me=jt([E("oig-tiles-container")],Me);var Mu=Object.defineProperty,Eu=Object.getOwnPropertyDescriptor,Ir=(t,e,i,r)=>{for(var n=r>1?void 0:r?Eu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&Mu(e,i,n),n};const tt=Z,Pn={Spotrebice:["fridge","fridge-outline","dishwasher","washing-machine","tumble-dryer","stove","microwave","coffee-maker","kettle","toaster","blender","food-processor","rice-cooker","slow-cooker","pressure-cooker","air-fryer","oven","range-hood"],Osvetleni:["lightbulb","lightbulb-outline","lamp","ceiling-light","floor-lamp","led-strip","led-strip-variant","wall-sconce","chandelier","desk-lamp","spotlight","light-switch"],"Vytapeni & Chlazeni":["thermometer","thermostat","radiator","radiator-disabled","heat-pump","air-conditioner","fan","hvac","fire","snowflake","fireplace","heating-coil"],"Energie & Baterie":["lightning-bolt","flash","battery","battery-charging","battery-50","battery-10","solar-panel","solar-power","meter-electric","power-plug","power-socket","ev-plug","transmission-tower","current-ac","current-dc"],"Auto & Doprava":["car","car-electric","car-battery","ev-station","ev-plug-type2","garage","garage-open","motorcycle","bicycle","scooter","bus","train","airplane"],Zabezpeceni:["door","door-open","lock","lock-open","shield-home","cctv","camera","motion-sensor","alarm-light","bell","eye","key","fingerprint","shield-check"],"Okna & Stineni":["window-closed","window-open","blinds","blinds-open","curtains","roller-shade","window-shutter","balcony","door-sliding"],"Media & Zabava":["television","speaker","speaker-wireless","music","volume-high","cast","chromecast","radio","headphones","microphone","gamepad","movie","spotify"],"Sit & IT":["router-wireless","wifi","access-point","lan","network","home-assistant","server","nas","cloud","ethernet","bluetooth","cellphone","tablet","laptop"],"Voda & Koupelna":["water","water-percent","water-boiler","water-pump","shower","toilet","faucet","pipe","bathtub","sink","water-heater","pool"],Pocasi:["weather-sunny","weather-cloudy","weather-night","weather-rainy","weather-snowy","weather-windy","weather-fog","weather-lightning","weather-hail","temperature","humidity","barometer"],"Ventilace & Kvalita vzduchu":["fan","air-filter","air-purifier","smoke-detector","co2","wind-turbine"],"Zahrada & Venku":["flower","tree","sprinkler","grass","garden-light","outdoor-lamp","grill","pool","hot-tub","umbrella","thermometer-lines"],Domacnost:["iron","vacuum","broom","mop","washing","basket","hanger","scissors"],"Notifikace & Stav":["information","help-circle","alert-circle","checkbox-marked-circle","check","close","minus","plus","arrow-up","arrow-down","refresh","sync","bell-ring"],Ovladani:["toggle-switch","power","play","pause","stop","skip-next","skip-previous","volume-up","volume-down","brightness-up","brightness-down"],"Cas & Planovani":["clock","timer","alarm","calendar","calendar-clock","schedule","history"],Ostatni:["home","cog","tools","wrench","hammer","chart-line","gauge","dots-vertical","menu","settings","account","logout"]};let di=class extends M{constructor(){super(...arguments),this.isOpen=!1,this.searchQuery=""}get filteredCategories(){const t=this.searchQuery.trim().toLowerCase();if(!t)return Pn;const e=Object.entries(Pn).map(([i,r])=>{const n=r.filter(a=>a.toLowerCase().includes(t));return[i,n]}).filter(([,i])=>i.length>0);return Object.fromEntries(e)}open(){this.isOpen=!0}close(){this.isOpen=!1,this.searchQuery=""}onOverlayClick(t){t.target===t.currentTarget&&this.close()}onSearchInput(t){const e=t.target;this.searchQuery=(e==null?void 0:e.value)??""}onIconClick(t){this.dispatchEvent(new CustomEvent("icon-selected",{detail:{icon:`mdi:${t}`},bubbles:!0,composed:!0})),this.close()}render(){if(!this.isOpen)return null;const t=this.filteredCategories,e=Object.entries(t);return d`
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
            ${e.length===0?d`
              <div class="empty">Žádné ikony nenalezeny</div>
            `:e.map(([i,r])=>d`
              <div class="category">
                <div class="category-title">${i}</div>
                <div class="icon-grid">
                  ${r.map(n=>d`
                    <button class="icon-item" type="button" @click=${()=>this.onIconClick(n)}>
                      <span class="icon-emoji">${Di(n)}</span>
                      <span class="icon-name">${n}</span>
                    </button>
                  `)}
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}};di.styles=P`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${tt(o.bgPrimary)} 35%, transparent);
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
      background: ${tt(o.cardBg)};
      box-shadow: ${tt(o.cardShadow)};
      border-radius: 14px;
      border: 1px solid ${tt(o.divider)};
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
      border-bottom: 1px solid ${tt(o.divider)};
      gap: 12px;
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${tt(o.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${tt(o.bgSecondary)};
      color: ${tt(o.textPrimary)};
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
      background: ${tt(o.divider)};
      transform: scale(1.05);
    }

    .search {
      padding: 12px 18px;
      border-bottom: 1px solid ${tt(o.divider)};
      background: ${tt(o.bgSecondary)};
    }

    .search input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${tt(o.divider)};
      background: ${tt(o.bgPrimary)};
      color: ${tt(o.textPrimary)};
      font-size: 13px;
      outline: none;
    }

    .search input::placeholder {
      color: ${tt(o.textSecondary)};
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
      color: ${tt(o.textSecondary)};
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
      background: ${tt(o.bgSecondary)};
      cursor: pointer;
      transition: transform 0.15s ease, border 0.2s ease, background 0.2s ease;
      text-align: center;
      font-size: 10px;
      color: ${tt(o.textSecondary)};
    }

    .icon-item:hover {
      background: ${tt(o.bgPrimary)};
      border-color: ${tt(o.accent)};
      transform: translateY(-2px);
      color: ${tt(o.textPrimary)};
    }

    .icon-emoji {
      font-size: 22px;
      line-height: 1;
      color: ${tt(o.textPrimary)};
    }

    .icon-name {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      font-size: 12px;
      color: ${tt(o.textSecondary)};
      text-align: center;
      padding: 24px 0 12px;
    }
  `;Ir([h({type:Boolean,reflect:!0,attribute:"open"})],di.prototype,"isOpen",2);Ir([w()],di.prototype,"searchQuery",2);di=Ir([E("oig-icon-picker")],di);var Du=Object.defineProperty,Ou=Object.getOwnPropertyDescriptor,ut=(t,e,i,r)=>{for(var n=r>1?void 0:r?Ou(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&Du(e,i,n),n};const O=Z;let nt=class extends M{constructor(){super(...arguments),this.isOpen=!1,this.tileIndex=-1,this.tileSide="left",this.existingConfig=null,this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}loadTileConfig(t){var e,i;this.currentTab=t.type,t.type==="entity"?this.selectedEntityId=t.entity_id:this.selectedButtonEntityId=t.entity_id,this.label=t.label||"",this.icon=t.icon||"",this.color=t.color||"#03A9F4",this.action=t.action||"toggle",this.supportEntity1=((e=t.support_entities)==null?void 0:e.top_right)||"",this.supportEntity2=((i=t.support_entities)==null?void 0:i.bottom_right)||""}resetForm(){this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}handleClose(){this.isOpen=!1,this.resetForm(),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}getEntities(){const t=ae();return t?t.getAll():{}}getEntityItems(t,e){const i=e.trim().toLowerCase(),r=this.getEntities();return Object.entries(r).filter(([a])=>t.some(s=>a.startsWith(s))).map(([a,s])=>{const l=this.getAttributeValue(s,"friendly_name")||a,c=this.getAttributeValue(s,"unit_of_measurement"),u=this.getAttributeValue(s,"icon");return{id:a,name:l,value:s.state,unit:c,icon:u,state:s}}).filter(a=>i?a.name.toLowerCase().includes(i)||a.id.toLowerCase().includes(i):!0).sort((a,s)=>a.name.localeCompare(s.name))}getSupportEntities(t){const e=t.trim().toLowerCase();if(!e)return[];const i=this.getEntities();return Object.entries(i).map(([r,n])=>{const a=this.getAttributeValue(n,"friendly_name")||r,s=this.getAttributeValue(n,"unit_of_measurement"),l=this.getAttributeValue(n,"icon");return{id:r,name:a,value:n.state,unit:s,icon:l,state:n}}).filter(r=>r.name.toLowerCase().includes(e)||r.id.toLowerCase().includes(e)).sort((r,n)=>r.name.localeCompare(n.name)).slice(0,20)}getDisplayIcon(t){return t?t.startsWith("mdi:")?Di(t):t:Di("")}getColorForEntity(t){switch(t.split(".")[0]){case"sensor":return"#03A9F4";case"binary_sensor":return"#4CAF50";case"switch":return"#FFC107";case"light":return"#FF9800";case"fan":return"#00BCD4";case"input_boolean":return"#9C27B0";default:return"#03A9F4"}}applyEntityDefaults(t){if(!t)return;const i=this.getEntities()[t];if(!i)return;this.label||(this.label=this.getAttributeValue(i,"friendly_name"));const r=this.getAttributeValue(i,"icon");!this.icon&&r&&(this.icon=r),this.color=this.getColorForEntity(t)}handleEntitySelect(t){this.selectedEntityId=t,this.applyEntityDefaults(t)}handleButtonEntitySelect(t){this.selectedButtonEntityId=t,this.applyEntityDefaults(t)}handleSupportInput(t,e){const i=e.trim();t===1?(this.supportSearch1=e,this.showSupportList1=!!i,i||(this.supportEntity1="")):(this.supportSearch2=e,this.showSupportList2=!!i,i||(this.supportEntity2=""))}handleSupportSelect(t,e){const i=e.name||e.id;t===1?(this.supportEntity1=e.id,this.supportSearch1=i,this.showSupportList1=!1):(this.supportEntity2=e.id,this.supportSearch2=i,this.showSupportList2=!1)}getSupportInputValue(t,e){if(t)return t;if(!e)return"";const i=this.getEntities()[e];return i&&this.getAttributeValue(i,"friendly_name")||e}getAttributeValue(t,e){var r;const i=(r=t.attributes)==null?void 0:r[e];return i==null?"":String(i)}handleSave(){const t=this.currentTab==="entity"?this.selectedEntityId:this.selectedButtonEntityId;if(!t){window.alert("Vyberte entitu");return}const e={top_right:this.supportEntity1||void 0,bottom_right:this.supportEntity2||void 0},i={type:this.currentTab,entity_id:t,label:this.label||void 0,icon:this.icon||void 0,color:this.color||void 0,action:this.currentTab==="button"?this.action:void 0,support_entities:e};this.dispatchEvent(new CustomEvent("tile-saved",{detail:{index:this.tileIndex,side:this.tileSide,config:i},bubbles:!0,composed:!0})),this.handleClose()}onIconSelected(t){var e;this.icon=((e=t.detail)==null?void 0:e.icon)||"",this.iconPickerOpen=!1}renderEntityList(t,e,i,r){const n=this.getEntityItems(t,e);return n.length===0?d`<div class="support-empty">Žádné entity nenalezeny</div>`:d`
      ${n.map(a=>d`
        <div
          class="entity-item ${i===a.id?"selected":""}"
          @click=${()=>r(a.id)}
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
    `}renderSupportList(t,e){const i=this.getSupportEntities(t);return i.length===0?d`<div class="support-empty">Žádné entity nenalezeny</div>`:d`
      ${i.map(r=>d`
        <div
          class="support-item"
          @mousedown=${()=>this.handleSupportSelect(e,r)}
        >
          <div class="support-name">${r.name}</div>
          <div class="support-value">${r.value} ${r.unit}</div>
        </div>
      `)}
    `}renderEntityTab(){return d`
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
        ${this.showSupportList1?d`
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
        ${this.showSupportList2?d`
          <div class="support-list">
            ${this.renderSupportList(this.supportSearch2,2)}
          </div>
        `:null}
      </div>
    `}renderButtonTab(){return d`
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
        ${this.showSupportList1?d`
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
        ${this.showSupportList2?d`
          <div class="support-list">
            ${this.renderSupportList(this.supportSearch2,2)}
          </div>
        `:null}
      </div>
    `}render(){return this.isOpen?d`
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
    `:null}};nt.styles=P`
    :host {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      font-family: ${O(o.fontFamily)};
    }

    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${O(o.bgPrimary)} 35%, transparent);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .dialog {
      width: min(520px, 100%);
      max-height: 85vh;
      background: ${O(o.cardBg)};
      border: 1px solid ${O(o.divider)};
      border-radius: 16px;
      box-shadow: ${O(o.cardShadow)};
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
      border-bottom: 1px solid ${O(o.divider)};
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${O(o.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${O(o.bgSecondary)};
      color: ${O(o.textPrimary)};
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
      background: ${O(o.divider)};
      transform: scale(1.05);
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 18px;
      background: ${O(o.bgSecondary)};
      border-bottom: 1px solid ${O(o.divider)};
    }

    .tab-btn {
      border: 1px solid transparent;
      background: ${O(o.cardBg)};
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: ${O(o.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: border 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }

    .tab-btn.active {
      border-color: ${O(o.accent)};
      color: ${O(o.textPrimary)};
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
      color: ${O(o.textSecondary)};
      font-weight: 600;
    }

    .input,
    select,
    .color-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${O(o.divider)};
      background: ${O(o.bgPrimary)};
      color: ${O(o.textPrimary)};
      font-size: 12px;
      outline: none;
      transition: border 0.2s ease, box-shadow 0.2s ease;
    }

    .input::placeholder {
      color: ${O(o.textSecondary)};
    }

    .input:focus,
    select:focus,
    .color-input:focus {
      border-color: ${O(o.accent)};
      box-shadow: 0 0 0 2px color-mix(in srgb, ${O(o.accent)} 20%, transparent);
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
      border: 1px dashed ${O(o.divider)};
      display: grid;
      place-items: center;
      font-size: 22px;
      cursor: pointer;
      background: ${O(o.bgSecondary)};
      transition: border 0.2s ease, transform 0.2s ease;
    }

    .icon-preview:hover {
      border-color: ${O(o.accent)};
      transform: translateY(-1px);
    }

    .icon-field {
      font-size: 11px;
    }

    .icon-btn {
      border: none;
      background: ${O(o.bgSecondary)};
      color: ${O(o.textPrimary)};
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .divider {
      height: 1px;
      background: ${O(o.divider)};
      margin: 6px 0;
      opacity: 0.8;
    }

    .entity-list {
      border: 1px solid ${O(o.divider)};
      border-radius: 12px;
      overflow: hidden;
      max-height: 200px;
      overflow-y: auto;
      background: ${O(o.bgPrimary)};
    }

    .entity-item {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid ${O(o.divider)};
      cursor: pointer;
      align-items: center;
      transition: background 0.2s ease;
    }

    .entity-item:last-child {
      border-bottom: none;
    }

    .entity-item:hover {
      background: ${O(o.bgSecondary)};
    }

    .entity-item.selected {
      background: color-mix(in srgb, ${O(o.accent)} 16%, transparent);
      border-left: 3px solid ${O(o.accent)};
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
      color: ${O(o.textPrimary)};
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-sub {
      font-size: 10px;
      color: ${O(o.textSecondary)};
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
      background: ${O(o.cardBg)};
      border: 1px solid ${O(o.divider)};
      border-radius: 12px;
      z-index: 10;
      max-height: 180px;
      overflow-y: auto;
      box-shadow: ${O(o.cardShadow)};
    }

    .support-item {
      padding: 10px 12px;
      border-bottom: 1px solid ${O(o.divider)};
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
      background: ${O(o.bgSecondary)};
    }

    .support-name {
      font-size: 12px;
      color: ${O(o.textPrimary)};
      font-weight: 600;
    }

    .support-value {
      font-size: 10px;
      color: ${O(o.textSecondary)};
    }

    .support-empty {
      padding: 12px;
      font-size: 11px;
      color: ${O(o.textSecondary)};
      text-align: center;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px 18px;
      border-top: 1px solid ${O(o.divider)};
      background: ${O(o.bgSecondary)};
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
      background: ${O(o.bgPrimary)};
      color: ${O(o.textPrimary)};
      border: 1px solid ${O(o.divider)};
    }

    .btn-primary {
      background: ${O(o.accent)};
      color: #fff;
      box-shadow: 0 6px 14px color-mix(in srgb, ${O(o.accent)} 40%, transparent);
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
  `;ut([h({type:Boolean,reflect:!0,attribute:"open"})],nt.prototype,"isOpen",2);ut([h({type:Number})],nt.prototype,"tileIndex",2);ut([h({attribute:!1})],nt.prototype,"tileSide",2);ut([h({attribute:!1})],nt.prototype,"existingConfig",2);ut([w()],nt.prototype,"currentTab",2);ut([w()],nt.prototype,"entitySearchText",2);ut([w()],nt.prototype,"buttonSearchText",2);ut([w()],nt.prototype,"selectedEntityId",2);ut([w()],nt.prototype,"selectedButtonEntityId",2);ut([w()],nt.prototype,"label",2);ut([w()],nt.prototype,"icon",2);ut([w()],nt.prototype,"color",2);ut([w()],nt.prototype,"action",2);ut([w()],nt.prototype,"supportEntity1",2);ut([w()],nt.prototype,"supportEntity2",2);ut([w()],nt.prototype,"supportSearch1",2);ut([w()],nt.prototype,"supportSearch2",2);ut([w()],nt.prototype,"showSupportList1",2);ut([w()],nt.prototype,"showSupportList2",2);ut([w()],nt.prototype,"iconPickerOpen",2);nt=ut([E("oig-tile-dialog")],nt);var zu=Object.defineProperty,Au=Object.getOwnPropertyDescriptor,R=(t,e,i,r)=>{for(var n=r>1?void 0:r?Au(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(e,i,n):s(n))||n);return r&&n&&zu(e,i,n),n};const $t=Z,Tn=new URLSearchParams(window.location.search),me=Tn.get("sn")||Tn.get("inverter_sn")||"2206237016",Mn=`sensor.oig_${me}_`,Iu=[{id:"flow",label:"Toky",icon:"⚡"},{id:"pricing",label:"Ceny",icon:"💰"},{id:"boiler",label:"Bojler",icon:"🔥"}];let N=class extends M{constructor(){super(...arguments),this.hass=null,this.loading=!0,this.error=null,this.activeTab="flow",this.editMode=!1,this.time="",this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1,this.flowData=$r,this.pricingData=null,this.pricingLoading=!1,this.boilerState=null,this.boilerLoading=!1,this.boilerPlan=null,this.boilerEnergyBreakdown=null,this.boilerPredictedUsage=null,this.boilerConfig=null,this.boilerHeatmap7x24=[],this.boilerProfiling=null,this.boilerCurrentCategory="",this.boilerAvailableCategories=[],this.boilerForecastWindows={fve:"--",grid:"--"},this.boilerRefreshTimer=null,this.analyticsData=sn,this.chmuData=Ze,this.chmuModalOpen=!1,this.timelineTab="today",this.timelineData=null,this.tilesConfig=null,this.tilesLeft=[],this.tilesRight=[],this.tileDialogOpen=!1,this.editingTileIndex=-1,this.editingTileSide="left",this.editingTileConfig=null,this.entityStore=null,this.timeInterval=null,this.stateWatcherUnsub=null,this.tileEntityUnsubs=[],this.pricingDirty=!1,this.timelineDirty=!1,this.analyticsDirty=!1,this.boilerDirty=!1,this.reconnecting=!1,this.throttledUpdateFlow=or(()=>this.updateFlowData(),500),this.throttledUpdateSensors=or(()=>this.updateSensorData(),1e3),this.throttledRefreshDerivedData=or(()=>this.refreshDerivedData(),5e3),this.onPageShow=()=>{this.rebindHassContext()},this.onDocumentVisibilityChange=()=>{document.visibilityState==="visible"&&this.rebindHassContext()}}connectedCallback(){super.connectedCallback(),window.addEventListener("pageshow",this.onPageShow),document.addEventListener("visibilitychange",this.onDocumentVisibilityChange),this.initApp(),this.startTimeUpdate()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("pageshow",this.onPageShow),document.removeEventListener("visibilitychange",this.onDocumentVisibilityChange),this.cleanup()}updated(t){t.has("hass")&&!t.has("loading")&&this.rebindHassContext(),t.has("activeTab")&&(this.activeTab==="pricing"&&(!this.pricingData||this.pricingDirty)&&this.loadPricingData(),this.activeTab==="pricing"&&(this.analyticsData===sn||this.analyticsDirty)&&this.loadAnalyticsAsync(),this.activeTab==="pricing"&&(!this.timelineData||this.timelineDirty)&&this.loadTimelineTabData(this.timelineTab),this.activeTab==="boiler"&&(!this.boilerState||this.boilerDirty)&&this.loadBoilerDataAsync())}async initApp(){try{const t=await X.getHass();if(!t)throw new Error("Cannot access Home Assistant context");this.hass=t,this.entityStore=ys(t,me),await Xt.start({getHass:()=>X.getHassSync(),prefixes:[Mn]}),this.stateWatcherUnsub=Xt.onEntityChange((e,i)=>{this.syncHassState(e,i),this.throttledUpdateFlow(),this.throttledUpdateSensors(),this.throttledRefreshDerivedData()}),J.start(),this.updateFlowData(),this.updateSensorData(),this.loadPricingData(),this.loadBoilerDataAsync(),this.loadAnalyticsAsync(),this.loadTilesAsync(),this.loading=!1,y.info("App initialized",{entities:Object.keys(t.states||{}).length,inverterSn:me})}catch(t){this.error=t.message,this.loading=!1,y.error("App init failed",t)}}cleanup(){var t,e;(t=this.stateWatcherUnsub)==null||t.call(this),this.stateWatcherUnsub=null,Xt.stop(),J.stop(),this.tileEntityUnsubs.forEach(i=>i()),this.tileEntityUnsubs=[],(e=this.entityStore)==null||e.destroy(),this.entityStore=null,this.timeInterval!==null&&(clearInterval(this.timeInterval),this.timeInterval=null),this.boilerRefreshTimer!==null&&(clearInterval(this.boilerRefreshTimer),this.boilerRefreshTimer=null)}async rebindHassContext(){var t;if(!this.reconnecting){this.reconnecting=!0;try{const e=await X.refreshHass();if(!e)return;this.hass=e,(t=this.entityStore)==null||t.updateHass(e),await Xt.start({getHass:()=>X.getHassSync(),prefixes:[Mn]}),this.updateFlowData(),this.updateSensorData()}catch(e){y.error("Failed to rebind hass context",e)}finally{this.reconnecting=!1}}}updateFlowData(){var t;if(this.hass)try{const e=((t=this.entityStore)==null?void 0:t.getAll())??this.hass;this.flowData=Es(e)}catch(e){y.error("Failed to extract flow data",e)}}updateSensorData(){if(this.chmuData=wo(me),this.activeTab==="pricing"&&(this.analyticsData={...this.analyticsData,...vo()}),this.tilesConfig){const t=We(this.tilesConfig);this.tilesLeft=t.left,this.tilesRight=t.right}}updateTilesImmediate(){if(!this.tilesConfig)return;const t=We(this.tilesConfig);this.tilesLeft=t.left,this.tilesRight=t.right}subscribeTileEntities(){if(this.tileEntityUnsubs.forEach(e=>e()),this.tileEntityUnsubs=[],!this.tilesConfig||!this.entityStore)return;const t=new Set;[...this.tilesConfig.tiles_left,...this.tilesConfig.tiles_right].forEach(e=>{var i,r;e&&(t.add(e.entity_id),(i=e.support_entities)!=null&&i.top_right&&t.add(e.support_entities.top_right),(r=e.support_entities)!=null&&r.bottom_right&&t.add(e.support_entities.bottom_right))});for(const e of t){const i=this.entityStore.subscribe(e,()=>{this.updateTilesImmediate()});this.tileEntityUnsubs.push(i)}}async loadPricingData(){if(!(!this.hass||this.pricingLoading)){this.pricingLoading=!0;try{const t=await je(()=>Gs(this.hass));this.pricingData=t,this.pricingDirty=!1}catch(t){y.error("Failed to load pricing data",t)}finally{this.pricingLoading=!1}}}async loadBoilerDataAsync(){if(!(!this.hass||this.boilerLoading)){this.boilerLoading=!0;try{const t=await je(()=>mo(this.hass));this.boilerState=t.state,this.boilerPlan=t.plan,this.boilerEnergyBreakdown=t.energyBreakdown,this.boilerPredictedUsage=t.predictedUsage,this.boilerConfig=t.config,this.boilerHeatmap7x24=t.heatmap7x24,this.boilerProfiling=t.profiling,this.boilerCurrentCategory=t.currentCategory,this.boilerAvailableCategories=t.availableCategories,this.boilerForecastWindows=t.forecastWindows,this.boilerDirty=!1,this.boilerRefreshTimer||(this.boilerRefreshTimer=window.setInterval(()=>this.loadBoilerDataAsync(),5*60*1e3))}catch(t){y.error("Failed to load boiler data",t)}finally{this.boilerLoading=!1}}}async loadAnalyticsAsync(){try{this.analyticsData=await je(()=>yo(me)),this.analyticsDirty=!1}catch(t){y.error("Failed to load analytics",t)}}async loadTilesAsync(){try{this.tilesConfig=await je(()=>Co());const t=We(this.tilesConfig);this.tilesLeft=t.left,this.tilesRight=t.right,this.subscribeTileEntities()}catch(t){y.error("Failed to load tiles config",t)}}async loadTimelineTabData(t){try{this.timelineData=await je(()=>ko(me,t)),this.timelineDirty=!1}catch(e){y.error(`Failed to load timeline tab: ${t}`,e)}}syncHassState(t,e){if(this.hass){if(this.hass.states||(this.hass.states={}),e){this.hass.states[t]=e;return}delete this.hass.states[t]}}refreshDerivedData(){if(this.pricingDirty=!0,this.timelineDirty=!0,this.analyticsDirty=!0,this.boilerDirty=!0,this.activeTab==="pricing"){Bs(),this.loadPricingData(),this.loadTimelineTabData(this.timelineTab),this.loadAnalyticsAsync();return}this.activeTab==="boiler"&&this.loadBoilerDataAsync()}startTimeUpdate(){const t=()=>{this.time=new Date().toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})};t(),this.timeInterval=window.setInterval(t,1e3)}onTabChange(t){this.activeTab=t.detail.tabId}onGridChargingOpen(){var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector("oig-grid-charging-dialog");t==null||t.show()}onEditClick(){this.editMode=!this.editMode}onResetClick(){var i,r;const t=(i=this.shadowRoot)==null?void 0:i.querySelector("oig-flow-canvas");t!=null&&t.resetLayout&&t.resetLayout();const e=(r=this.shadowRoot)==null?void 0:r.querySelector("oig-grid");e&&e.resetLayout()}onToggleLeftPanel(){this.leftPanelCollapsed=!this.leftPanelCollapsed}onToggleRightPanel(){this.rightPanelCollapsed=!this.rightPanelCollapsed}onChmuBadgeClick(){this.chmuModalOpen=!0}onChmuModalClose(){this.chmuModalOpen=!1}onTimelineTabChange(t){this.timelineTab=t.detail.tab,this.loadTimelineTabData(t.detail.tab)}onTimelineRefresh(){this.loadTimelineTabData(this.timelineTab)}onBoilerCategoryChange(t){const e=t.detail.category;this.boilerCurrentCategory=e,this.loadBoilerDataAsync()}onBoilerActionDone(t){const{success:e,label:i}=t.detail;y.info(`[Boiler] Action ${i}: ${e?"OK":"FAIL"}`),e&&setTimeout(()=>this.loadBoilerDataAsync(),2e3)}onEditTile(t){const{entityId:e}=t.detail;let i=-1,r="left",n=null;if(this.tilesConfig){const a=this.tilesConfig.tiles_left.findIndex(s=>s&&s.entity_id===e);if(a>=0)i=a,r="left",n=this.tilesConfig.tiles_left[a];else{const s=this.tilesConfig.tiles_right.findIndex(l=>l&&l.entity_id===e);s>=0&&(i=s,r="right",n=this.tilesConfig.tiles_right[s])}}this.editingTileIndex=i,this.editingTileSide=r,this.editingTileConfig=n,this.tileDialogOpen=!0,n&&requestAnimationFrame(()=>{var s;const a=(s=this.shadowRoot)==null?void 0:s.querySelector("oig-tile-dialog");a==null||a.loadTileConfig(n)})}onDeleteTile(t){const{entityId:e}=t.detail;if(!this.tilesConfig||!e)return;const i={...this.tilesConfig};i.tiles_left=i.tiles_left.map(n=>n&&n.entity_id===e?null:n),i.tiles_right=i.tiles_right.map(n=>n&&n.entity_id===e?null:n),this.tilesConfig=i;const r=We(i);this.tilesLeft=r.left,this.tilesRight=r.right,cn(i),this.subscribeTileEntities()}onTileSaved(t){const{index:e,side:i,config:r}=t.detail;if(!this.tilesConfig)return;const n={...this.tilesConfig},a=i==="left"?[...n.tiles_left]:[...n.tiles_right];if(e>=0&&e<a.length)a[e]=r;else{const l=a.findIndex(c=>c===null);l>=0?a[l]=r:a.push(r)}i==="left"?n.tiles_left=a:n.tiles_right=a,this.tilesConfig=n;const s=We(n);this.tilesLeft=s.left,this.tilesRight=s.right,cn(n),this.subscribeTileEntities()}onTileDialogClose(){this.tileDialogOpen=!1,this.editingTileConfig=null,this.editingTileIndex=-1}render(){var e;if(this.loading)return d`<div class="loading"><div class="spinner"></div><span>Načítání...</span></div>`;if(this.error)return d`
        <div class="error">
          <h2>Chyba připojení</h2>
          <p>${this.error}</p>
          <button @click=${()=>{this.error=null,this.loading=!0,this.initApp()}}>Zkusit znovu</button>
        </div>
      `;const t=this.chmuData.effectiveSeverity>0?this.chmuData.warningsCount:0;return d`
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
          .tabs=${Iu}
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
                ${this.pricingLoading?d`
                  <div class="tab-loading-overlay">
                    <div class="spinner spinner--small"></div>
                    <span>Načítání cen...</span>
                  </div>
                `:A}
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
              ${this.boilerLoading?d`
                <div class="tab-loading-overlay">
                  <div class="spinner spinner--small"></div>
                  <span>Načítání bojleru...</span>
                </div>
              `:A}

              <!-- State header (current temp + heating dot) -->
              <oig-boiler-state .state=${this.boilerState}></oig-boiler-state>

              <!-- Debug control panel (collapsible) -->
              <oig-boiler-debug-panel
                @action-done=${this.onBoilerActionDone}
              ></oig-boiler-debug-panel>

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
    `}};N.styles=P`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      font-family: ${$t(o.fontFamily)};
      color: ${$t(o.textPrimary)};
      background: ${$t(o.bgPrimary)};
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
      color: ${$t(o.textSecondary)};
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid ${$t(o.divider)};
      border-top-color: ${$t(o.accent)};
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
      color: ${$t(o.error)};
      text-align: center;
      animation: fadeIn 0.3s ease;
    }

    .error h2 {
      margin-bottom: 8px;
    }

    .error button {
      margin-top: 12px;
      padding: 8px 16px;
      background: ${$t(o.accent)};
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
      background: ${$t(o.bgSecondary)};
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
      background: ${$t(o.cardBg)};
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      font-size: 12px;
      color: ${$t(o.textSecondary)};
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
  `;R([h({type:Object})],N.prototype,"hass",2);R([w()],N.prototype,"loading",2);R([w()],N.prototype,"error",2);R([w()],N.prototype,"activeTab",2);R([w()],N.prototype,"editMode",2);R([w()],N.prototype,"time",2);R([w()],N.prototype,"leftPanelCollapsed",2);R([w()],N.prototype,"rightPanelCollapsed",2);R([w()],N.prototype,"flowData",2);R([w()],N.prototype,"pricingData",2);R([w()],N.prototype,"pricingLoading",2);R([w()],N.prototype,"boilerState",2);R([w()],N.prototype,"boilerLoading",2);R([w()],N.prototype,"boilerPlan",2);R([w()],N.prototype,"boilerEnergyBreakdown",2);R([w()],N.prototype,"boilerPredictedUsage",2);R([w()],N.prototype,"boilerConfig",2);R([w()],N.prototype,"boilerHeatmap7x24",2);R([w()],N.prototype,"boilerProfiling",2);R([w()],N.prototype,"boilerCurrentCategory",2);R([w()],N.prototype,"boilerAvailableCategories",2);R([w()],N.prototype,"boilerForecastWindows",2);R([w()],N.prototype,"analyticsData",2);R([w()],N.prototype,"chmuData",2);R([w()],N.prototype,"chmuModalOpen",2);R([w()],N.prototype,"timelineTab",2);R([w()],N.prototype,"timelineData",2);R([w()],N.prototype,"tilesConfig",2);R([w()],N.prototype,"tilesLeft",2);R([w()],N.prototype,"tilesRight",2);R([w()],N.prototype,"tileDialogOpen",2);R([w()],N.prototype,"editingTileIndex",2);R([w()],N.prototype,"editingTileSide",2);R([w()],N.prototype,"editingTileConfig",2);N=R([E("oig-app")],N);y.info("V2 starting",{version:"2.0.0-beta.1"});ps();async function Lu(){try{const t=await us(),e=document.getElementById("app");e&&(e.innerHTML="",e.appendChild(t)),y.info("V2 mounted successfully")}catch(t){y.error("V2 bootstrap failed",t);const e=document.getElementById("app");e&&(e.innerHTML=`
        <div style="padding: 20px; font-family: system-ui;">
          <h2>Chyba načítání</h2>
          <p>Nepodařilo se načíst dashboard. Zkuste obnovit stránku.</p>
          <details>
            <summary>Detaily</summary>
            <pre>${t.message}</pre>
          </details>
        </div>`)}}Lu();
//# sourceMappingURL=index.js.map
