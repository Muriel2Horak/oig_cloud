var Wa=Object.defineProperty;var ja=(t,i,e)=>i in t?Wa(t,i,{enumerable:!0,configurable:!0,writable:!0,value:e}):t[i]=e;var _=(t,i,e)=>ja(t,typeof i!="symbol"?i+"":i,e);import{f as qa,u as Va,i as P,a as M,b as d,r as Z,w as Et,A as I}from"./vendor.js";import{C as Ui,a as Mn,L as En,P as On,b as Dn,i as zn,p as In,c as An,d as Ya,T as Ua,e as Ga,B as Ka,f as Za,g as Qa,h as Xa,j as Ja,k as Ln}from"./charts.js";(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&r(s)}).observe(document,{childList:!0,subtree:!0});function e(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(n){if(n.ep)return;n.ep=!0;const a=e(n);fetch(n.href,a)}})();const Ut="[V2]";function ts(){return new Date().toISOString().substr(11,12)}function yi(t,i){const e=ts(),r=t.toUpperCase().padEnd(5);return`${e} ${r} ${i}`}const b={debug(t,i){typeof window<"u"&&window.OIG_DEBUG&&console.debug(Ut,yi("debug",t),i??"")},info(t,i){console.info(Ut,yi("info",t),i??"")},warn(t,i){console.warn(Ut,yi("warn",t),i??"")},error(t,i,e){const r=i?{error:i.message,stack:i.stack,...e}:e;console.error(Ut,yi("error",t),r??"")},time(t){console.time(`${Ut} ${t}`)},timeEnd(t){console.timeEnd(`${Ut} ${t}`)},group(t){console.group(`${Ut} ${t}`)},groupEnd(){console.groupEnd()}};function es(){window.addEventListener("error",is),window.addEventListener("unhandledrejection",rs),b.debug("Error handling setup complete")}function is(t){const i=t.error||new Error(t.message);b.error("Uncaught error",i,{filename:t.filename,lineno:t.lineno,colno:t.colno}),t.preventDefault()}function rs(t){const i=t.reason instanceof Error?t.reason:new Error(String(t.reason));b.error("Unhandled promise rejection",i),t.preventDefault()}class Bn extends Error{constructor(i,e,r=!1,n){super(i),this.code=e,this.recoverable=r,this.cause=n,this.name="AppError"}}class Le extends Bn{constructor(i="Authentication failed"){super(i,"AUTH_ERROR",!1),this.name="AuthError"}}class Rr extends Bn{constructor(i="Network error",e){super(i,"NETWORK_ERROR",!0,e),this.name="NetworkError"}}const ns="oig_v2_";function as(){var t;try{const i=((t=globalThis.navigator)==null?void 0:t.userAgent)||"";return/Home Assistant|HomeAssistant|HAcompanion/i.test(i)}catch{return!1}}function ss(){var t;try{const i=((t=globalThis.navigator)==null?void 0:t.userAgent)||"",e=/Android|iPhone|iPad|iPod|Mobile/i.test(i),r=globalThis.innerWidth<=768;return e||r}catch{return!1}}const vt={isHaApp:!1,isMobile:!1,reduceMotion:!1};async function os(){var e,r;b.info("Bootstrap starting"),es(),vt.isHaApp=as(),vt.isMobile=ss(),vt.reduceMotion=vt.isHaApp||vt.isMobile||((r=(e=globalThis.matchMedia)==null?void 0:e.call(globalThis,"(prefers-reduced-motion: reduce)"))==null?void 0:r.matches)||!1;const t=document.documentElement;vt.isHaApp&&t.classList.add("oig-ha-app"),vt.isMobile&&t.classList.add("oig-mobile"),vt.reduceMotion&&t.classList.add("oig-reduce-motion");const i={version:"2.0.0-beta.1",storagePrefix:ns};return b.info("Bootstrap complete",{...i,isHaApp:vt.isHaApp,isMobile:vt.isMobile,reduceMotion:vt.reduceMotion}),document.createElement("oig-app")}const o={bgPrimary:"var(--primary-background-color, #ffffff)",bgSecondary:"var(--secondary-background-color, #f5f5f5)",textPrimary:"var(--primary-text-color, #212121)",textSecondary:"var(--secondary-text-color, #757575)",accent:"var(--accent-color, #03a9f4)",divider:"var(--divider-color, #e0e0e0)",error:"var(--error-color, #db4437)",success:"var(--success-color, #0f9d58)",warning:"var(--warning-color, #f4b400)",cardBg:"var(--card-background-color, #ffffff)",cardShadow:"var(--shadow-elevation-2dp_-_box-shadow, 0 2px 2px 0 rgba(0,0,0,0.14))",fontFamily:"var(--primary-font-family, system-ui, sans-serif)"},Hr={"--primary-background-color":"#111936","--secondary-background-color":"#1a2044","--primary-text-color":"#e1e1e1","--secondary-text-color":"rgba(255,255,255,0.7)","--accent-color":"#03a9f4","--divider-color":"rgba(255,255,255,0.12)","--error-color":"#ef5350","--success-color":"#66bb6a","--warning-color":"#ffa726","--card-background-color":"rgba(255,255,255,0.06)","--shadow-elevation-2dp_-_box-shadow":"0 2px 4px 0 rgba(0,0,0,0.4)"},Wr={"--primary-background-color":"#ffffff","--secondary-background-color":"#f5f5f5","--primary-text-color":"#212121","--secondary-text-color":"#757575","--accent-color":"#03a9f4","--divider-color":"#e0e0e0","--error-color":"#db4437","--success-color":"#0f9d58","--warning-color":"#f4b400","--card-background-color":"#ffffff","--shadow-elevation-2dp_-_box-shadow":"0 2px 2px 0 rgba(0,0,0,0.14)"};function ir(){var t,i;try{if(window.parent&&window.parent!==window){const e=(i=(t=window.parent.document)==null?void 0:t.querySelector("home-assistant"))==null?void 0:i.hass;if(e!=null&&e.themes){if(typeof e.themes.darkMode=="boolean")return e.themes.darkMode;const r=(e.themes.theme||"").toLowerCase();if(r.includes("dark"))return!0;if(r.includes("light"))return!1}}}catch{}return window.matchMedia("(prefers-color-scheme: dark)").matches}function rr(t){const i=t?Hr:Wr,e=document.documentElement;for(const[r,n]of Object.entries(i))e.style.setProperty(r,n);e.classList.toggle("dark",t),document.body.style.background=t?Hr["--secondary-background-color"]:Wr["--secondary-background-color"]}function ls(){const t=ir();rr(t),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{const e=ir();rr(e)}),setInterval(()=>{const e=ir(),r=document.documentElement.classList.contains("dark");e!==r&&rr(e)},5e3)}const jr={mobile:768,tablet:1024};function me(t){return t<jr.mobile?"mobile":t<jr.tablet?"tablet":"desktop"}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const E=t=>(i,e)=>{e!==void 0?e.addInitializer(()=>{customElements.define(t,i)}):customElements.define(t,i)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const cs={attribute:!0,type:String,converter:Va,reflect:!1,hasChanged:qa},ds=(t=cs,i,e)=>{const{kind:r,metadata:n}=e;let a=globalThis.litPropertyMetadata.get(n);if(a===void 0&&globalThis.litPropertyMetadata.set(n,a=new Map),r==="setter"&&((t=Object.create(t)).wrapped=!0),a.set(e.name,t),r==="accessor"){const{name:s}=e;return{set(l){const c=i.get.call(this);i.set.call(this,l),this.requestUpdate(s,c,t,!0,l)},init(l){return l!==void 0&&this.C(s,void 0,t,l),l}}}if(r==="setter"){const{name:s}=e;return function(l){const c=this[s];i.call(this,l),this.requestUpdate(s,c,t,!0,l)}}throw Error("Unsupported decorator location: "+r)};function p(t){return(i,e)=>typeof e=="object"?ds(t,i,e):((r,n,a)=>{const s=n.hasOwnProperty(a);return n.constructor.createProperty(a,r),s?Object.getOwnPropertyDescriptor(n,a):void 0})(t,i,e)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function x(t){return p({...t,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const us=(t,i,e)=>(e.configurable=!0,e.enumerable=!0,Reflect.decorate&&typeof i!="object"&&Object.defineProperty(t,i,e),e);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Gi(t,i){return(e,r,n)=>{const a=s=>{var l;return((l=s.renderRoot)==null?void 0:l.querySelector(t))??null};return us(e,r,{get(){return a(this)}})}}class ps{constructor(){this.callbacks=new Set,this.watched=new Set,this.watchedPrefixes=new Set,this.unsub=null,this.running=!1,this.getHass=null}registerEntities(i){for(const e of i)typeof e=="string"&&e.length>0&&this.watched.add(e)}registerPrefix(i){var r;if(typeof i!="string"||i.length===0)return;this.watchedPrefixes.add(i);const e=(r=this.getHass)==null?void 0:r.call(this);if(e!=null&&e.states){const n=Object.keys(e.states).filter(a=>a.startsWith(i));this.registerEntities(n)}}onEntityChange(i){return this.callbacks.add(i),()=>{this.callbacks.delete(i)}}async start(i){if(this.running)return;this.getHass=i.getHass;const e=this.getHass();if(!(e!=null&&e.connection)){b.debug("StateWatcher: hass not ready, retrying in 500ms"),setTimeout(()=>this.start(i),500);return}this.running=!0;const r=i.prefixes??[];for(const n of r)this.registerPrefix(n);try{this.unsub=await e.connection.subscribeEvents(n=>this.handleStateChanged(n),"state_changed"),b.info("StateWatcher started",{prefixes:r,watchedCount:this.watched.size})}catch(n){this.running=!1,b.error("StateWatcher failed to subscribe",n)}}stop(){if(this.running=!1,this.unsub)try{this.unsub()}catch{}this.unsub=null,b.info("StateWatcher stopped")}isWatched(i){return this.matchesWatched(i)}destroy(){this.stop(),this.callbacks.clear(),this.watched.clear(),this.watchedPrefixes.clear(),this.getHass=null}matchesWatched(i){if(this.watched.has(i))return!0;for(const e of this.watchedPrefixes)if(i.startsWith(e))return!0;return!1}handleStateChanged(i){var n;const e=(n=i==null?void 0:i.data)==null?void 0:n.entity_id;if(!e||!this.matchesWatched(e))return;const r=i.data.new_state;for(const a of this.callbacks)try{a(e,r)}catch{}}}const be=new ps;class hs{constructor(i,e="2206237016"){this.subscriptions=new Map,this.cache=new Map,this.stateWatcherUnsub=null,this.hass=i,this.inverterSn=e,this.init()}init(){var i;if((i=this.hass)!=null&&i.states)for(const[e,r]of Object.entries(this.hass.states))this.cache.set(e,r);this.stateWatcherUnsub=be.onEntityChange((e,r)=>{r?this.cache.set(e,r):this.cache.delete(e),this.notifySubscribers(e,r)}),b.debug("EntityStore initialized",{entities:this.cache.size,inverterSn:this.inverterSn})}getSensorId(i){return`sensor.oig_${this.inverterSn}_${i}`}findSensorId(i){const e=this.getSensorId(i);for(const r of this.cache.keys()){if(r===e)return r;if(r.startsWith(e+"_")){const n=r.substring(e.length+1);if(/^\d+$/.test(n))return r}}return e}subscribe(i,e){this.subscriptions.has(i)||this.subscriptions.set(i,new Set),this.subscriptions.get(i).add(e),be.registerEntities([i]);const r=this.cache.get(i)??null;return e(r),()=>{var n,a;(n=this.subscriptions.get(i))==null||n.delete(e),((a=this.subscriptions.get(i))==null?void 0:a.size)===0&&this.subscriptions.delete(i)}}getNumeric(i){const e=this.cache.get(i);return e?{value:e.state!=="unavailable"&&e.state!=="unknown"&&parseFloat(e.state)||0,lastUpdated:e.last_updated?new Date(e.last_updated):null,attributes:e.attributes??{},exists:!0}:{value:0,lastUpdated:null,attributes:{},exists:!1}}getString(i){const e=this.cache.get(i);return e?{value:e.state!=="unavailable"&&e.state!=="unknown"?e.state:"",lastUpdated:e.last_updated?new Date(e.last_updated):null,attributes:e.attributes??{},exists:!0}:{value:"",lastUpdated:null,attributes:{},exists:!1}}get(i){return this.cache.get(i)??null}getAll(){return Object.fromEntries(this.cache)}batchLoad(i){const e={};for(const r of i)e[r]=this.getNumeric(r);return e}updateHass(i){if(this.hass=i,i!=null&&i.states)for(const[e,r]of Object.entries(i.states)){const n=this.cache.get(e),a=r;this.cache.set(e,a),((n==null?void 0:n.state)!==a.state||(n==null?void 0:n.last_updated)!==a.last_updated)&&this.notifySubscribers(e,a)}}notifySubscribers(i,e){const r=this.subscriptions.get(i);if(r)for(const n of r)try{n(e)}catch(a){b.error("Entity callback error",a,{entityId:i})}}destroy(){var i;(i=this.stateWatcherUnsub)==null||i.call(this),this.subscriptions.clear(),this.cache.clear(),b.debug("EntityStore destroyed")}}let Ge=null;function gs(t,i){return Ge&&Ge.destroy(),Ge=new hs(t,i),Ge}function ne(){return Ge}const fs=3,ms=1e3;class bs{constructor(){this.hass=null,this.initPromise=null}async getHass(){return this.hass?this.hass:this.initPromise?this.initPromise:(this.initPromise=this.initHass(),this.initPromise)}getHassSync(){return this.hass}async initHass(){b.debug("Initializing HASS client");const i=await this.findHass();return i?(this.hass=i,b.info("HASS client initialized"),i):(b.warn("HASS not found in parent context"),null)}async findHass(){var i,e;if(typeof window>"u")return null;if(window.hass)return window.hass;if(window.parent&&window.parent!==window)try{const r=(e=(i=window.parent.document)==null?void 0:i.querySelector("home-assistant"))==null?void 0:e.hass;if(r)return r}catch{b.debug("Cannot access parent HASS (cross-origin)")}return window.customPanel?window.customPanel.hass:null}async fetchWithAuth(i,e={}){var s,l;const r=await this.getHass();if(!r)throw new Le("Cannot get HASS context");try{const u=new URL(i,window.location.href).hostname;if(u!=="localhost"&&u!=="127.0.0.1"&&!i.startsWith("/api/"))throw new Error(`fetchWithAuth rejected for non-localhost URL: ${i}`)}catch(c){if(c.message.includes("rejected"))throw c}const n=(l=(s=r.auth)==null?void 0:s.data)==null?void 0:l.access_token;if(!n)throw new Le("No access token available");const a=new Headers(e.headers);return a.set("Authorization",`Bearer ${n}`),a.has("Content-Type")||a.set("Content-Type","application/json"),this.fetchWithRetry(i,{...e,headers:a})}async fetchWithRetry(i,e,r=fs){try{const n=await fetch(i,e);if(!n.ok)throw n.status===401?new Le("Token expired or invalid"):new Rr(`HTTP ${n.status}: ${n.statusText}`);return n}catch(n){if(r>0&&n instanceof Rr)return b.warn(`Retrying fetch (${r} left)`,{url:i}),await this.delay(ms),this.fetchWithRetry(i,e,r-1);throw n}}async callApi(i,e,r){const n=await this.getHass();if(!n)throw new Le("Cannot get HASS context");return n.callApi(i,e,r)}async callService(i,e,r){const n=await this.getHass();if(!(n!=null&&n.callService))return b.error("Cannot call service — hass not available"),!1;try{return await n.callService(i,e,r),!0}catch(a){return b.error(`Service call failed (${i}.${e})`,a),!1}}async callWS(i){const e=await this.getHass();if(!(e!=null&&e.callWS))throw new Le("Cannot get HASS context for WS call");return e.callWS(i)}async fetchOIGAPI(i,e={}){try{const r=`/api/oig_cloud${i.startsWith("/")?"":"/"}${i}`;return await(await this.fetchWithAuth(r,{...e,headers:{"Content-Type":"application/json",...Object.fromEntries(new Headers(e.headers).entries())}})).json()}catch(r){return b.error(`OIG API fetch error for ${i}`,r),null}}async loadBatteryTimeline(i,e="active"){return this.fetchOIGAPI(`/battery_forecast/${i}/timeline?type=${e}`)}async loadUnifiedCostTile(i){return this.fetchOIGAPI(`/battery_forecast/${i}/unified_cost_tile`)}async loadSpotPrices(i){return this.fetchOIGAPI(`/spot_prices/${i}/intervals`)}async loadAnalytics(i){return this.fetchOIGAPI(`/analytics/${i}`)}async loadPlannerSettings(i){return this.fetchOIGAPI(`/battery_forecast/${i}/planner_settings`)}async savePlannerSettings(i,e){return this.fetchOIGAPI(`/battery_forecast/${i}/planner_settings`,{method:"POST",body:JSON.stringify(e)})}async loadDetailTabs(i,e,r="hybrid"){return this.fetchOIGAPI(`/battery_forecast/${i}/detail_tabs?tab=${e}&plan=${r}`)}async loadModules(i){return this.fetchOIGAPI(`/${i}/modules`)}openEntityDialog(i){var e;try{const r=((e=window.parent.document)==null?void 0:e.querySelector("home-assistant"))??document.querySelector("home-assistant");if(!r)return b.warn("Cannot open entity dialog — home-assistant element not found"),!1;const n=new CustomEvent("hass-more-info",{bubbles:!0,composed:!0,detail:{entityId:i}});return r.dispatchEvent(n),!0}catch(r){return b.error("Cannot open entity dialog",r),!1}}async showNotification(i,e,r="success"){await this.callService("persistent_notification","create",{title:i,message:e,notification_id:`oig_dashboard_${Date.now()}`})||console.log(`[${r.toUpperCase()}] ${i}: ${e}`)}getToken(){var i,e,r;return((r=(e=(i=this.hass)==null?void 0:i.auth)==null?void 0:e.data)==null?void 0:r.access_token)??null}delay(i){return new Promise(e=>setTimeout(e,i))}}const rt=new bs,qr={solar:"#ffd54f",battery:"#4caf50",inverter:"#9575cd",grid:"#42a5f5",house:"#f06292"},Be={solar:"linear-gradient(135deg, rgba(255,213,79,0.15) 0%, rgba(255,179,0,0.08) 100%)",battery:"linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(56,142,60,0.08) 100%)",grid:"linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(33,150,243,0.08) 100%)",house:"linear-gradient(135deg, rgba(240,98,146,0.15) 0%, rgba(233,30,99,0.08) 100%)",inverter:"linear-gradient(135deg, rgba(149,117,205,0.15) 0%, rgba(126,87,194,0.08) 100%)"},Fe={solar:"rgba(255,213,79,0.4)",battery:"rgba(76,175,80,0.4)",grid:"rgba(66,165,245,0.4)",house:"rgba(240,98,146,0.4)",inverter:"rgba(149,117,205,0.4)"},de={solar:"#ffd54f",battery:"#ff9800",grid_import:"#f44336",grid_export:"#4caf50",house:"#f06292"},vi={solar:5400,battery:7e3,grid:17e3,house:1e4},vr={solarPower:0,solarP1:0,solarP2:0,solarV1:0,solarV2:0,solarI1:0,solarI2:0,solarPercent:0,solarToday:0,solarForecastToday:0,solarForecastTomorrow:0,batterySoC:0,batteryPower:0,batteryVoltage:0,batteryCurrent:0,batteryTemp:0,batteryChargeTotal:0,batteryDischargeTotal:0,batteryChargeSolar:0,batteryChargeGrid:0,isGridCharging:!1,timeToEmpty:"",timeToFull:"",balancingState:"standby",balancingTimeRemaining:"",gridChargingPlan:{hasBlocks:!1,totalEnergyKwh:0,totalCostCzk:0,windowLabel:null,durationMinutes:0,currentBlockLabel:null,nextBlockLabel:null,blocks:[]},gridPower:0,gridVoltage:0,gridFrequency:0,gridImportToday:0,gridExportToday:0,gridL1V:0,gridL2V:0,gridL3V:0,gridL1P:0,gridL2P:0,gridL3P:0,spotPrice:0,exportPrice:0,currentTariff:"",housePower:0,houseTodayWh:0,houseL1:0,houseL2:0,houseL3:0,inverterMode:"",inverterGridMode:"",inverterGridLimit:0,inverterTemp:0,bypassStatus:"off",notificationsUnread:0,notificationsError:0,boilerIsUse:!1,boilerPower:0,boilerDayEnergy:0,boilerManualMode:"",boilerInstallPower:3e3,plannerAutoMode:null,lastUpdate:""},Vr=new URLSearchParams(window.location.search),ys=Vr.get("sn")||Vr.get("inverter_sn")||"2206237016";function vs(t){return`sensor.oig_${ys}_${t}`}function B(t){if(!(t!=null&&t.state))return 0;const i=parseFloat(t.state);return isNaN(i)?0:i}function Pt(t){return!(t!=null&&t.state)||t.state==="unknown"||t.state==="unavailable"?"":t.state}function Yr(t,i="on"){if(!(t!=null&&t.state))return!1;const e=t.state.toLowerCase();return e===i||e==="1"||e==="zapnuto"}function xs(t){const i=(t||"").toLowerCase();return i==="charging"?"charging":i==="balancing"||i==="holding"?"holding":i==="completed"?"completed":i==="planned"?"planned":"standby"}function dr(t){return t==="tomorrow"?"zítra":t==="today"?"dnes":""}function Ur(t){if(!t)return null;const[i,e]=t.split(":").map(Number);return!Number.isFinite(i)||!Number.isFinite(e)?null:i*60+e}function ws(t){const i=Number(t.grid_import_kwh??t.grid_charge_kwh??0);if(Number.isFinite(i)&&i>0)return i;const e=Number(t.battery_start_kwh??0),r=Number(t.battery_end_kwh??0);return Number.isFinite(e)&&Number.isFinite(r)?Math.max(0,r-e):0}function Fn(t=[]){return[...t].sort((i,e)=>{const r=(i.day==="tomorrow"?1:0)-(e.day==="tomorrow"?1:0);return r!==0?r:(i.time_from||"").localeCompare(e.time_from||"")})}function $s(t){if(!Array.isArray(t)||t.length===0)return null;const i=Fn(t),e=i[0],r=i.at(-1),n=dr(e==null?void 0:e.day),a=dr(r==null?void 0:r.day);if(n===a){const w=n?`${n} `:"";return!(e!=null&&e.time_from)||!(r!=null&&r.time_to)?w.trim()||null:`${w}${e.time_from} – ${r.time_to}`}const s=n?`${n} `:"",l=a?`${a} `:"",c=(e==null?void 0:e.time_from)||"--",u=(r==null?void 0:r.time_to)||"--",h=e?`${s}${c}`:"--",f=r?`${l}${u}`:"--";return`${h} → ${f}`}function _s(t){if(!Array.isArray(t)||t.length===0)return 0;let i=0;return t.forEach(e=>{const r=Ur(e.time_from),n=Ur(e.time_to);if(r===null||n===null)return;const a=n-r;a>0&&(i+=a)}),i}function Gr(t){const i=dr(t.day),e=i?`${i} `:"",r=t.time_from||"--",n=t.time_to||"--";return`${e}${r} - ${n}`}function ks(t){const i=t.find(n=>{const a=(n.status||"").toLowerCase();return a==="running"||a==="active"})||null,e=i?t[t.indexOf(i)+1]||null:t[0]||null;return{runningBlock:i,upcomingBlock:e,shouldShowNext:!!(e&&(!i||e!==i))}}function Ss(t){const i=(t==null?void 0:t.attributes)||{},e=Array.isArray(i.charging_blocks)?i.charging_blocks:[],r=Fn(e),n=Number(i.total_energy_kwh)||0,a=n>0?n:r.reduce((m,y)=>m+ws(y),0),s=Number(i.total_cost_czk)||0,l=s>0?s:r.reduce((m,y)=>m+Number(y.total_cost_czk||0),0),c=$s(r),u=_s(r),{runningBlock:h,upcomingBlock:f,shouldShowNext:w}=ks(r);return{hasBlocks:r.length>0,totalEnergyKwh:a,totalCostCzk:l,windowLabel:c,durationMinutes:u,currentBlockLabel:h?Gr(h):null,nextBlockLabel:w&&f?Gr(f):null,blocks:r}}function Cs(t){var Ir,Ar,Lr,Br,Fr,Nr;const i=(t==null?void 0:t.states)||{},e=Ha=>i[vs(Ha)]||null,r=B(e("actual_fv_p1")),n=B(e("actual_fv_p2")),a=B(e("extended_fve_voltage_1")),s=B(e("extended_fve_voltage_2")),l=B(e("extended_fve_current_1")),c=B(e("extended_fve_current_2")),u=e("solar_forecast"),h=(Ir=u==null?void 0:u.attributes)!=null&&Ir.today_total_kwh?parseFloat(u.attributes.today_total_kwh)||0:(Ar=u==null?void 0:u.attributes)!=null&&Ar.today_total_sum_kw?parseFloat(u.attributes.today_total_sum_kw)||0:B(u),f=(Lr=u==null?void 0:u.attributes)!=null&&Lr.tomorrow_total_sum_kw?parseFloat(u.attributes.tomorrow_total_sum_kw)||0:(Br=u==null?void 0:u.attributes)!=null&&Br.total_tomorrow_kwh&&parseFloat(u.attributes.total_tomorrow_kwh)||0,w=B(e("batt_bat_c")),m=B(e("batt_batt_comp_p")),y=B(e("extended_battery_voltage")),g=B(e("extended_battery_current")),k=B(e("extended_battery_temperature")),C=B(e("computed_batt_charge_energy_today")),$=B(e("computed_batt_discharge_energy_today")),S=B(e("computed_batt_charge_fve_energy_today")),Y=B(e("computed_batt_charge_grid_energy_today")),K=e("grid_charging_planned"),v=Yr(K),H=Pt(e("time_to_empty")),z=Pt(e("time_to_full")),O=e("battery_balancing"),V=xs((Fr=O==null?void 0:O.attributes)==null?void 0:Fr.current_state),Q=Pt({state:(Nr=O==null?void 0:O.attributes)==null?void 0:Nr.time_remaining}),U=Ss(K),xt=B(e("actual_aci_wtotal")),qt=B(e("extended_grid_voltage")),Ji=B(e("ac_in_aci_f")),tr=B(e("ac_in_ac_ad")),Ct=B(e("ac_in_ac_pd")),Ie=B(e("ac_in_aci_vr")),Ae=B(e("ac_in_aci_vs")),yt=B(e("ac_in_aci_vt")),zr=B(e("actual_aci_wr")),Vt=B(e("actual_aci_ws")),Yt=B(e("actual_aci_wt")),va=B(e("spot_price_current_15min")),xa=B(e("export_price_current_15min")),wa=Pt(e("current_tariff")),$a=B(e("actual_aco_p")),_a=B(e("ac_out_en_day")),ka=B(e("ac_out_aco_pr")),Sa=B(e("ac_out_aco_ps")),Ca=B(e("ac_out_aco_pt")),Pa=Pt(e("box_prms_mode")),Ta=Pt(e("invertor_prms_to_grid")),Ma=B(e("invertor_prm1_p_max_feed_grid")),Ea=B(e("box_temp")),Oa=Pt(e("bypass_status"))||"off",Da=B(e("notification_count_unread")),za=B(e("notification_count_error")),er=e("boiler_is_use"),Ia=er?Yr(er)||Pt(er)==="Zapnuto":!1,Aa=B(e("boiler_current_cbb_w")),La=B(e("boiler_day_w")),Ba=Pt(e("boiler_manual_mode")),Fa=B(e("boiler_install_power"))||3e3,Na=e("real_data_update"),Ra=Pt(Na);return{solarPower:r+n,solarP1:r,solarP2:n,solarV1:a,solarV2:s,solarI1:l,solarI2:c,solarPercent:B(e("dc_in_fv_proc")),solarToday:B(e("dc_in_fv_ad")),solarForecastToday:h,solarForecastTomorrow:f,batterySoC:w,batteryPower:m,batteryVoltage:y,batteryCurrent:g,batteryTemp:k,batteryChargeTotal:C,batteryDischargeTotal:$,batteryChargeSolar:S,batteryChargeGrid:Y,isGridCharging:v,timeToEmpty:H,timeToFull:z,balancingState:V,balancingTimeRemaining:Q,gridChargingPlan:U,gridPower:xt,gridVoltage:qt,gridFrequency:Ji,gridImportToday:tr,gridExportToday:Ct,gridL1V:Ie,gridL2V:Ae,gridL3V:yt,gridL1P:zr,gridL2P:Vt,gridL3P:Yt,spotPrice:va,exportPrice:xa,currentTariff:wa,housePower:$a,houseTodayWh:_a,houseL1:ka,houseL2:Sa,houseL3:Ca,inverterMode:Pa,inverterGridMode:Ta,inverterGridLimit:Ma,inverterTemp:Ea,bypassStatus:Oa,notificationsUnread:Da,notificationsError:za,boilerIsUse:Ia,boilerPower:Aa,boilerDayEnergy:La,boilerManualMode:Ba,boilerInstallPower:Fa,plannerAutoMode:null,lastUpdate:Ra}}const Ne={};function xi(t,i,e){const r=Math.abs(t),n=Math.min(100,r/i*100),a=Math.max(500,Math.round(3500-n*30));let s=a;return e&&Ne[e]!==void 0&&(s=Math.round(.3*a+(1-.3)*Ne[e]),Math.abs(s-Ne[e])<100&&(s=Ne[e])),e&&(Ne[e]=s),{active:r>=50,intensity:n,count:Math.max(1,Math.min(4,Math.ceil(1+n/33))),speed:s,size:Math.round(6+n/10),opacity:Math.min(1,.3+n/150)}}function Re(t){return Math.abs(t)>=1e3?`${(t/1e3).toFixed(1)} kW`:`${Math.round(t)} W`}function Gt(t){return t>=1e3?`${(t/1e3).toFixed(2)} kWh`:`${Math.round(t)} Wh`}function Ps(t){return t==="VT"||t.includes("vysoký")?"⚡ VT":t==="NT"||t.includes("nízký")?"🌙 NT":t?`⏰ ${t}`:"--"}function Ts(t){return t.includes("Home 1")?{icon:"🏠",text:"Home 1"}:t.includes("Home 2")?{icon:"🔋",text:"Home 2"}:t.includes("Home 3")?{icon:"☀️",text:"Home 3"}:t.includes("UPS")?{icon:"⚡",text:"Home UPS"}:{icon:"⚙️",text:t||"--"}}function Ms(t){return t==="Vypnuto / Off"?{display:"Vypnuto",icon:"🚫"}:t==="Zapnuto / On"?{display:"Zapnuto",icon:"💧"}:t.includes("Limited")||t.includes("omezením")?{display:"Omezeno",icon:"🚰"}:{display:t||"--",icon:"💧"}}const Es={"HOME I":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"HOME II":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"HOME III":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"rgba(158, 158, 158, 0.18)",label:"DO NOTHING"},"Mode 0":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"Mode 1":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"Mode 2":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"Mode 3":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"}},Kr={timeline:[],labels:[],prices:[],exportPrices:[],modeSegments:[],cheapestBuyBlock:null,expensiveBuyBlock:null,bestExportBlock:null,worstExportBlock:null,solar:null,battery:null,initialZoomStart:null,initialZoomEnd:null,currentSpotPrice:0,currentExportPrice:0,avgSpotPrice:0,plannedConsumption:null,whatIf:null,solarForecastTotal:0},Zr=new URLSearchParams(window.location.search),ur=Zr.get("sn")||Zr.get("inverter_sn")||"2206237016";function xe(t){return`sensor.oig_${ur}_${t}`}function Qr(t){if(!(t!=null&&t.state))return 0;const i=parseFloat(t.state);return isNaN(i)?0:i}function pr(t){const i=t.getFullYear(),e=String(t.getMonth()+1).padStart(2,"0"),r=String(t.getDate()).padStart(2,"0"),n=String(t.getHours()).padStart(2,"0"),a=String(t.getMinutes()).padStart(2,"0"),s=String(t.getSeconds()).padStart(2,"0");return`${i}-${e}-${r}T${n}:${a}:${s}`}const Xr={},Os=5*60*1e3;async function Ds(t="hybrid"){const i=Xr[t];if(i&&Date.now()-i.ts<Os)return b.debug("Timeline cache hit",{plan:t,age:Math.round((Date.now()-i.ts)/1e3)}),i.data;try{const e=await rt.getHass();if(!e)return[];let r;e.callApi?r=await e.callApi("GET",`oig_cloud/battery_forecast/${ur}/timeline?type=active`):r=await rt.fetchOIGAPI(`battery_forecast/${ur}/timeline?type=active`);const n=(r==null?void 0:r.active)||(r==null?void 0:r.timeline)||[];return Xr[t]={data:n,ts:Date.now()},b.info("Timeline fetched",{plan:t,points:n.length}),n}catch(e){return b.error("Failed to fetch timeline",e),[]}}function zs(t){const i=new Date,e=new Date(i);return e.setMinutes(Math.floor(i.getMinutes()/15)*15,0,0),t.filter(r=>new Date(r.timestamp)>=e)}function Is(t){return t.map(i=>{if(!i.timestamp)return new Date;try{const[e,r]=i.timestamp.split("T");if(!e||!r)return new Date;const[n,a,s]=e.split("-").map(Number),[l,c,u=0]=r.split(":").map(Number);return new Date(n,a-1,s,l,c,u)}catch{return new Date}})}function As(t){const i=t.mode_name||t.mode_planned||t.mode||t.mode_display||null;if(!i||typeof i!="string")return null;const e=i.trim();return e.length?e:null}function Ls(t){return t.startsWith("HOME ")?t.replace("HOME ","").trim():t==="FULL HOME UPS"||t==="HOME UPS"?"UPS":t==="DO NOTHING"?"DN":t.substring(0,3).toUpperCase()}function Bs(t){return Es[t]||{icon:"❓",color:"rgba(158, 158, 158, 0.15)",label:t}}function Fs(t){if(!t.length)return[];const i=[];let e=null;for(const r of t){const n=As(r);if(!n){e=null;continue}const a=new Date(r.timestamp),s=new Date(a.getTime()+15*60*1e3);if(e!==null&&e.mode===n)e.end=s;else{const l={mode:n,start:a,end:s};i.push(l),e=l}}return i.map(r=>{const n=Bs(r.mode);return{...r,icon:n.icon,color:n.color,label:n.label,shortLabel:Ls(r.mode)}})}function wi(t,i,e=3){const r=Math.floor(e*60/15);if(t.length<r)return null;let n=null,a=i?1/0:-1/0;for(let s=0;s<=t.length-r;s++){const l=t.slice(s,s+r),c=l.map(h=>h.price),u=c.reduce((h,f)=>h+f,0)/c.length;(i&&u<a||!i&&u>a)&&(a=u,n={start:l[0].timestamp,end:l[l.length-1].timestamp,avg:u,min:Math.min(...c),max:Math.max(...c),values:c,type:"cheapest-buy"})}return n}function Ns(t,i){const r=((t==null?void 0:t.states)||{})[xe("solar_forecast")];if(!(r!=null&&r.attributes)||!i.length)return null;const n=r.attributes,a=n.today_total_kwh||0,s=n.today_hourly_string1_kw||{},l=n.tomorrow_hourly_string1_kw||{},c=n.today_hourly_string2_kw||{},u=n.tomorrow_hourly_string2_kw||{},h={...s,...l},f={...c,...u},w=(g,k,C)=>g==null||k==null?g||k||0:g+(k-g)*C,m=[],y=[];for(const g of i){const k=g.getHours(),C=g.getMinutes(),$=new Date(g);$.setMinutes(0,0,0);const S=pr($),Y=new Date($);Y.setHours(k+1);const K=pr(Y),v=h[S]||0,H=h[K]||0,z=f[S]||0,O=f[K]||0,V=C/60;m.push(w(v,H,V)),y.push(w(z,O,V))}return{string1:m,string2:y,todayTotal:a,hasString1:m.some(g=>g>0),hasString2:y.some(g=>g>0)}}function Rs(t,i){if(!t.length)return{arrays:{baseline:[],solarCharge:[],gridCharge:[],gridNet:[],consumption:[]},initialZoomStart:null,initialZoomEnd:null};const e=t.map(f=>new Date(f.timestamp)),r=e[0].getTime(),n=e[e.length-1],a=n?n.getTime():r,s=[],l=[],c=[],u=[],h=[];for(const f of i){const w=pr(f),m=t.find(y=>y.timestamp===w);if(m){const y=(m.battery_capacity_kwh??m.battery_soc??m.battery_start)||0,g=m.solar_charge_kwh||0,k=m.grid_charge_kwh||0,C=typeof m.grid_net=="number"?m.grid_net:(m.grid_import||0)-(m.grid_export||0),$=m.load_kwh??m.consumption_kwh??m.load??0,S=(Number($)||0)*4;s.push(y-g-k),l.push(g),c.push(k),u.push(C),h.push(S)}else s.push(null),l.push(null),c.push(null),u.push(null),h.push(null)}return{arrays:{baseline:s,solarCharge:l,gridCharge:c,gridNet:u,consumption:h},initialZoomStart:r,initialZoomEnd:a}}function Hs(t){const i=(t==null?void 0:t.states)||{},e=i[xe("battery_forecast")];if(!(e!=null&&e.attributes)||e.state==="unavailable"||e.state==="unknown")return null;const r=e.attributes,n=r.planned_consumption_today??null,a=r.planned_consumption_tomorrow??null,s=r.profile_today||"Žádný profil",l=i[xe("ac_out_en_day")],c=l==null?void 0:l.state,h=(c&&c!=="unavailable"&&parseFloat(c)||0)/1e3,f=h+(n||0),w=(n||0)+(a||0);let m=null;if(f>0&&a!=null){const g=a-f,k=g/f*100;Math.abs(k)<5?m="Zítra podobně":g>0?m=`Zítra více (+${Math.abs(k).toFixed(0)}%)`:m=`Zítra méně (-${Math.abs(k).toFixed(0)}%)`}return{todayConsumedKwh:h,todayPlannedKwh:n,todayTotalKwh:f,tomorrowKwh:a,totalPlannedKwh:w,profile:s!=="Žádný profil"&&s!=="Neznámý profil"?s:"Žádný profil",trendText:m}}function Ws(t){const e=((t==null?void 0:t.states)||{})[xe("battery_forecast")];if(!(e!=null&&e.attributes)||e.state==="unavailable"||e.state==="unknown")return null;const n=e.attributes.mode_optimization||{},a=n.alternatives||{},s=n.total_cost_czk||0,l=n.total_savings_vs_home_i_czk||0,c=a["DO NOTHING"],u=(c==null?void 0:c.current_mode)||null;return{totalCost:s,totalSavings:l,alternatives:a,activeMode:u}}async function js(t,i="hybrid"){const e=performance.now();b.info("[Pricing] loadPricingData START");try{const r=await Ds(i),n=zs(r);if(!n.length)return b.warn("[Pricing] No timeline data"),Kr;const a=n.map(U=>({timestamp:U.timestamp,price:U.spot_price_czk||0})),s=n.map(U=>({timestamp:U.timestamp,price:U.export_price_czk||0}));let l=Is(a);const c=Fs(n),u=wi(a,!0,3);u&&(u.type="cheapest-buy");const h=wi(a,!1,3);h&&(h.type="expensive-buy");const f=wi(s,!1,3);f&&(f.type="best-export");const w=wi(s,!0,3);w&&(w.type="worst-export");const m=n.map(U=>new Date(U.timestamp)),y=new Set([...l,...m].map(U=>U.getTime()));l=Array.from(y).sort((U,xt)=>U-xt).map(U=>new Date(U));const{arrays:g,initialZoomStart:k,initialZoomEnd:C}=Rs(n,l),$=Ns(t,l),S=(t==null?void 0:t.states)||{},Y=Qr(S[xe("spot_price_current_15min")]),K=Qr(S[xe("export_price_current_15min")]),v=a.length>0?a.reduce((U,xt)=>U+xt.price,0)/a.length:0,H=Hs(t),z=Ws(t),O=($==null?void 0:$.todayTotal)||0,V={timeline:n,labels:l,prices:a,exportPrices:s,modeSegments:c,cheapestBuyBlock:u,expensiveBuyBlock:h,bestExportBlock:f,worstExportBlock:w,solar:$,battery:g,initialZoomStart:k,initialZoomEnd:C,currentSpotPrice:Y,currentExportPrice:K,avgSpotPrice:v,plannedConsumption:H,whatIf:z,solarForecastTotal:O},Q=(performance.now()-e).toFixed(0);return b.info(`[Pricing] loadPricingData COMPLETE in ${Q}ms`,{points:n.length,segments:c.length}),V}catch(r){return b.error("[Pricing] loadPricingData failed",r),Kr}}const Jr={workday_spring:"Pracovní den - Jaro",workday_summer:"Pracovní den - Léto",workday_autumn:"Pracovní den - Podzim",workday_winter:"Pracovní den - Zima",weekend_spring:"Víkend - Jaro",weekend_summer:"Víkend - Léto",weekend_autumn:"Víkend - Podzim",weekend_winter:"Víkend - Zima"},qs={fve:"FVE",grid:"Síť",alternative:"Alternativa"},hr=new URLSearchParams(window.location.search),Vs=hr.get("sn")||hr.get("inverter_sn")||"2206237016",Ci=hr.get("entry_id")||"";function Ys(t,i,e){return isNaN(t)?i:Math.max(i,Math.min(e,t))}function Us(t,i,e){if(t==null)return null;const r=i-e;if(r<=0)return null;const n=(t-e)/r*100;return Ys(n,0,100)}function Pi(t){if(!t)return"--:--";const i=t instanceof Date?t:new Date(t);return isNaN(i.getTime())?"--:--":i.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}function tn(t){if(!t)return"--";const i=new Date(t);return isNaN(i.getTime())?"--":i.toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}function gr(t,i){return`${Pi(t)}–${Pi(i)}`}function en(t){return qs[t||""]||t||"--"}function Nn(t){return t?Object.values(t).reduce((i,e)=>i+(parseFloat(String(e))||0),0):0}function Rn(t){return t?Object.entries(t).map(([e,r])=>({hour:parseInt(e,10),value:parseFloat(String(r))||0})).filter(e=>isFinite(e.value)).sort((e,r)=>r.value-e.value).slice(0,3).filter(e=>e.value>0).map(e=>e.hour).sort((e,r)=>e-r):[]}function He(t){if(!t)return null;const i=t.split(":").map(e=>parseInt(e,10));return i.length<2||!isFinite(i[0])||!isFinite(i[1])?null:i[0]*60+i[1]}function rn(t,i,e){return i===null||e===null?!1:i<=e?t>=i&&t<e:t>=i||t<e}async function Gs(){try{return Ci?await rt.fetchOIGAPI(`/${Ci}/boiler_profile`):(b.warn("[Boiler] No entry_id — cannot fetch boiler profile"),null)}catch(t){return b.warn("[Boiler] Failed to fetch profile",{err:t}),null}}async function Ks(){try{return Ci?await rt.fetchOIGAPI(`/${Ci}/boiler_plan`):(b.warn("[Boiler] No entry_id — cannot fetch boiler plan"),null)}catch(t){return b.warn("[Boiler] Failed to fetch plan",{err:t}),null}}function Zs(t,i,e){const r=t||i,n=r==null?void 0:r.state,a=(n==null?void 0:n.temperatures)||{},s=(n==null?void 0:n.energy_state)||{},l=isFinite(a.upper_zone??a.top)?a.upper_zone??a.top??null:null,c=isFinite(a.lower_zone??a.bottom)?a.lower_zone??a.bottom??null:null,u=isFinite(s.avg_temp)?s.avg_temp??null:null,h=isFinite(s.energy_needed_kwh)?s.energy_needed_kwh??null:null,f=e.targetTempC??60,w=e.coldInletTempC??10,m=Us(u,f,w),y=(t==null?void 0:t.slots)||[],g=(t==null?void 0:t.next_slot)||Qs(y);let k="Neplánováno";if(g){const $=en(g.recommended_source);k=`${gr(g.start,g.end)} (${$})`}const C=en((n==null?void 0:n.recommended_source)||(g==null?void 0:g.recommended_source));return{currentTemp:(n==null?void 0:n.current_temp)||45,targetTemp:(n==null?void 0:n.target_temp)||f,heating:(n==null?void 0:n.heating)||!1,tempTop:l,tempBottom:c,avgTemp:u,heatingPercent:m,energyNeeded:h,planCost:(t==null?void 0:t.estimated_cost_czk)??null,nextHeating:k,recommendedSource:C,nextProfile:(n==null?void 0:n.next_profile)||"",nextStart:(n==null?void 0:n.next_start)||""}}function Qs(t){if(!Array.isArray(t))return null;const i=Date.now();return t.find(e=>{const r=new Date(e.end||e.end_time||"").getTime(),n=e.consumption_kwh??e.avg_consumption_kwh??0;return r>i&&n>0})||null}function Xs(t){var w,m,y;if(!((w=t==null?void 0:t.slots)!=null&&w.length))return null;const i=t.slots.map(g=>({start:g.start||"",end:g.end||"",consumptionKwh:g.consumption_kwh??g.avg_consumption_kwh??0,recommendedSource:g.recommended_source||"",spotPrice:isFinite(g.spot_price)?g.spot_price??null:null,tempTop:g.temp_top,soc:g.soc})),e=i.filter(g=>g.consumptionKwh>0),r=parseFloat(String(t.total_consumption_kwh))||0,n=parseFloat(String(t.fve_kwh))||0,a=parseFloat(String(t.grid_kwh))||0,s=parseFloat(String(t.alt_kwh))||0,l=parseFloat(String(t.estimated_cost_czk))||0;let c="Mix: --";if(r>0){const g=Math.round(n/r*100),k=Math.round(a/r*100),C=Math.round(s/r*100);c=`Mix: FVE ${g}% · Síť ${k}% · Alt ${C}%`}const u=i.filter(g=>g.consumptionKwh>0&&g.spotPrice!==null).map(g=>({slot:g,price:g.spotPrice}));let h="--",f="--";if(u.length){const g=u.reduce((C,$)=>$.price<C.price?$:C),k=u.reduce((C,$)=>$.price>C.price?$:C);h=`${gr(g.slot.start,g.slot.end)} (${g.price.toFixed(2)} Kč/kWh)`,f=`${gr(k.slot.start,k.slot.end)} (${k.price.toFixed(2)} Kč/kWh)`}return{slots:i,totalConsumptionKwh:r,fveKwh:n,gridKwh:a,altKwh:s,estimatedCostCzk:l,nextSlot:t.next_slot?{start:t.next_slot.start||"",end:t.next_slot.end||"",consumptionKwh:t.next_slot.consumption_kwh||0,recommendedSource:t.next_slot.recommended_source||"",spotPrice:t.next_slot.spot_price??null}:null,planStart:tn((m=t.slots[0])==null?void 0:m.start),planEnd:tn((y=t.slots[t.slots.length-1])==null?void 0:y.end),sourceDigest:c,activeSlotCount:e.length,cheapestSpot:h,mostExpensiveSpot:f}}function Js(t){const i=parseFloat(String(t==null?void 0:t.fve_kwh))||0,e=parseFloat(String(t==null?void 0:t.grid_kwh))||0,r=parseFloat(String(t==null?void 0:t.alt_kwh))||0,n=i+e+r;return{fveKwh:i,gridKwh:e,altKwh:r,fvePercent:n>0?i/n*100:0,gridPercent:n>0?e/n*100:0,altPercent:n>0?r/n*100:0}}function to(t,i,e){var w;const r=(t==null?void 0:t.summary)||{},n=(w=t==null?void 0:t.profiles)==null?void 0:w[e],a=(n==null?void 0:n.hourly_avg)||{},s=r.predicted_total_kwh??Nn(a),l=r.peak_hours??Rn(a),c=isFinite(r.water_liters_40c)?r.water_liters_40c??null:null,u=r.circulation_windows||[],h=u.length?u.map(m=>`${m.start}–${m.end}`).join(", "):"--";let f="--";if(u.length){const m=new Date,y=m.getHours()*60+m.getMinutes();if(u.some(k=>{const C=He(k.start),$=He(k.end);return rn(y,C,$)})){const k=u.find(C=>{const $=He(C.start),S=He(C.end);return rn(y,$,S)});f=k?`ANO (do ${k.end})`:"ANO"}else{const k=i==null?void 0:i.state,C=k==null?void 0:k.circulation_recommended;let $=1/0,S=null;for(const Y of u){const K=He(Y.start);if(K===null)continue;let v=K-y;v<0&&(v+=24*60),v<$&&($=v,S=Y)}C&&S?f=`DOPORUČENO (${S.start}–${S.end})`:S?f=`Ne (další ${S.start}–${S.end})`:f="Ne"}}return{predictedTodayKwh:s,peakHours:l,waterLiters40c:c,circulationWindows:h,circulationNow:f}}function eo(t){const i=(t==null?void 0:t.config)||{},e=isFinite(i.volume_l)?i.volume_l??null:null;return{volumeL:e,heaterPowerW:null,targetTempC:isFinite(i.target_temp_c)?i.target_temp_c??null:null,deadlineTime:i.deadline_time||"--:--",stratificationMode:i.stratification_mode||"--",kCoefficient:e?(e*.001163).toFixed(4):"--",coldInletTempC:isFinite(i.cold_inlet_temp_c)?i.cold_inlet_temp_c??10:10}}function io(t){return t!=null&&t.profiles?Object.entries(t.profiles).map(([i,e])=>({id:i,name:e.name||i,targetTemp:e.target_temp||55,startTime:e.start_time||"06:00",endTime:e.end_time||"22:00",days:e.days||[1,1,1,1,1,0,0],enabled:e.enabled!==!1})):[]}function ro(t){var r;const i=[],e=((r=t==null?void 0:t.summary)==null?void 0:r.today_hours)||[];for(let n=0;n<24;n++){const a=e.includes(n);i.push({hour:n,temp:a?55:25,heating:a})}return i}function no(t,i){var s;const e=(s=t==null?void 0:t.profiles)==null?void 0:s[i],r=["Po","Út","St","Čt","Pá","So","Ne"];if(!e)return r.map(l=>({day:l,hours:Array(24).fill(0)}));const n=e.heatmap||[];let a=[];if(n.length>0)a=n.map(l=>l.map(c=>c&&typeof c=="object"?parseFloat(c.consumption)||0:parseFloat(String(c))||0));else{const l=e.hourly_avg||{};a=Array.from({length:7},()=>Array.from({length:24},(c,u)=>parseFloat(String(l[u]||0))))}return r.map((l,c)=>({day:l,hours:a[c]||Array(24).fill(0)}))}function ao(t,i){var u;const e=(u=t==null?void 0:t.profiles)==null?void 0:u[i],r=(t==null?void 0:t.summary)||{},n=(e==null?void 0:e.hourly_avg)||{},a=Array.from({length:24},(h,f)=>parseFloat(String(n[f]||0))),s=r.predicted_total_kwh??Nn(n),l=r.peak_hours??Rn(n),c=isFinite(r.avg_confidence)?r.avg_confidence??null:null;return{hourlyAvg:a,peakHours:l,predictedTotalKwh:s,confidence:c,daysTracked:7}}function so(t,i){var h,f,w;if(!((h=t==null?void 0:t.slots)!=null&&h.length)||!(i!=null&&i.length))return{fve:"--",grid:"--"};const e=(f=t.slots[0])==null?void 0:f.start,r=(w=t.slots[t.slots.length-1])==null?void 0:w.end,n=e?new Date(e).getTime():null,a=r?new Date(r).getTime():null,s=i.filter(m=>{if(!n||!a)return!0;const y=m.timestamp||m.time;if(!y)return!1;const g=new Date(y).getTime();return g>=n&&g<=a}),l=m=>{const y=[];let g=null;for(const k of s){const C=k.timestamp||k.time;if(!C)continue;const $=new Date(C),S=m(k);S&&!g?g={start:$,end:$}:S&&g?g.end=$:!S&&g&&(y.push(g),g=null)}return g&&y.push(g),y.length?y.map(k=>`${Pi(k.start)}–${Pi(new Date(k.end.getTime()+15*6e4))}`).join(", "):"--"},c=l(m=>(parseFloat(m.solar_kwh??m.solar_charge_kwh??0)||0)>0),u=l(m=>(parseFloat(m.grid_charge_kwh??0)||0)>0);return{fve:c,grid:u}}async function oo(){return b.info("[Boiler] Planning heating..."),await rt.callService("oig_cloud","plan_boiler_heating",{})}async function lo(){return b.info("[Boiler] Applying plan..."),await rt.callService("oig_cloud","apply_boiler_plan",{})}async function co(){return b.info("[Boiler] Canceling plan..."),await rt.callService("oig_cloud","cancel_boiler_plan",{})}async function uo(t){const[i,e]=await Promise.all([Gs(),Ks()]);let r=null;try{const l=await rt.loadBatteryTimeline(Vs,"active");r=(l==null?void 0:l.active)||l||null,Array.isArray(r)&&r.length===0&&(r=null)}catch{}const n=(i==null?void 0:i.current_category)||Object.keys((i==null?void 0:i.profiles)||{})[0]||"workday_summer",a=Object.keys((i==null?void 0:i.profiles)||{}),s=eo(i);return{state:Zs(e,i,s),plan:Xs(e),energyBreakdown:Js(e),predictedUsage:to(i,e,n),config:s,profiles:io(i||e),heatmap:ro(e||i),heatmap7x24:no(i,n),profiling:ao(i,n),currentCategory:n,availableCategories:a,forecastWindows:so(e,r)}}const nn={efficiency:null,health:null,balancing:null,costComparison:null};function po(t){const i=ne();if(!i)return null;const e=i.findSensorId("battery_efficiency"),r=i.get(e);if(!r)return b.debug("Battery efficiency sensor not found"),null;const n=r.attributes||{},a=n.efficiency_last_month_pct!=null?{efficiency:Number(n.efficiency_last_month_pct??0),charged:Number(n.last_month_charge_kwh??0),discharged:Number(n.last_month_discharge_kwh??0),losses:Number(n.losses_last_month_kwh??0)}:null,s=n.efficiency_current_month_pct!=null?{efficiency:Number(n.efficiency_current_month_pct??0),charged:Number(n.current_month_charge_kwh??0),discharged:Number(n.current_month_discharge_kwh??0),losses:Number(n.losses_current_month_kwh??0)}:null,l=a??s;if(!l)return null;const c=a?"last_month":"current_month",u=a&&s?s.efficiency-a.efficiency:0;return{efficiency:l.efficiency,charged:l.charged,discharged:l.discharged,losses:l.losses,lossesPct:n[c==="last_month"?"losses_last_month_pct":"losses_current_month_pct"]??0,trend:u,period:c,currentMonthDays:n.current_month_days??0,lastMonth:a,currentMonth:s}}function ho(t){const i=ne();if(!i)return null;const e=i.findSensorId("battery_health"),r=i.get(e);if(!r)return b.debug("Battery health sensor not found"),null;const n=parseFloat(r.state)||0,a=r.attributes||{};let s,l;return n>=95?(s="excellent",l="Vynikající"):n>=90?(s="good",l="Dobrý"):n>=80?(s="fair",l="Uspokojivý"):(s="poor",l="Špatný"),{soh:n,capacity:a.capacity_p80_last_20??a.current_capacity_kwh??0,nominalCapacity:a.current_capacity_kwh??0,minCapacity:a.capacity_p20_last_20??0,measurementCount:a.measurement_count??0,lastAnalysis:a.last_analysis??"",qualityScore:a.quality_score??null,sohMethod:a.soh_selection_method??null,sohMethodDescription:a.soh_method_description??null,measurementHistory:Array.isArray(a.measurement_history)?a.measurement_history:[],degradation3m:a.degradation_3_months_percent??null,degradation6m:a.degradation_6_months_percent??null,degradation12m:a.degradation_12_months_percent??null,degradationPerYear:a.degradation_per_year_percent??null,estimatedEolDate:a.estimated_eol_date??null,yearsTo80Pct:a.years_to_80pct??null,trendConfidence:a.trend_confidence??null,status:s,statusLabel:l}}function an(t,i,e){if(!t||!i)return{daysRemaining:null,progressPercent:null,intervalDays:e||null};try{const r=new Date(t),n=new Date(i),a=new Date;if(isNaN(r.getTime())||isNaN(n.getTime()))return{daysRemaining:null,progressPercent:null,intervalDays:e||null};const s=n.getTime()-r.getTime(),l=a.getTime()-r.getTime(),c=Math.max(0,Math.round((n.getTime()-a.getTime())/(1e3*60*60*24))),u=s>0?Math.min(100,Math.max(0,Math.round(l/s*100))):null,h=e||Math.round(s/(1e3*60*60*24));return{daysRemaining:c,progressPercent:u,intervalDays:h||null}}catch{return{daysRemaining:null,progressPercent:null,intervalDays:e||null}}}function go(t){const i=ne();if(!i)return null;const e=i.findSensorId("battery_balancing"),r=i.get(e);if(!r){const c=i.get(i.findSensorId("battery_health")),u=c==null?void 0:c.attributes;if(u!=null&&u.balancing_status){const h=String(u.last_balancing??""),f=u.next_balancing?String(u.next_balancing):null,w=an(h,f,Number(u.balancing_interval_days??0));return{status:String(u.balancing_status??"unknown"),lastBalancing:h,cost:Number(u.balancing_cost??0),nextScheduled:f,...w,estimatedNextCost:u.estimated_next_cost!=null?Number(u.estimated_next_cost):null}}return null}const n=r.attributes||{},a=String(n.last_balancing??""),s=n.next_scheduled?String(n.next_scheduled):null,l=an(a,s,Number(n.interval_days??0));return{status:r.state||"unknown",lastBalancing:a,cost:Number(n.cost??0),nextScheduled:s,...l,estimatedNextCost:n.estimated_next_cost!=null?Number(n.estimated_next_cost):null}}async function fo(t){var i,e;try{const r=await rt.loadUnifiedCostTile(t);if(!r)return null;const n=r.hybrid??r,a=n.today??{},s=Math.round((a.actual_cost_so_far??a.actual_total_cost??0)*100)/100,l=a.future_plan_cost??0,c=a.plan_total_cost??s+l,u=((i=n.tomorrow)==null?void 0:i.plan_total_cost)??null;let h=null,f=null,w=null,m=null;try{const y=await rt.loadBatteryTimeline(t,"active"),g=(e=y==null?void 0:y.timeline_extended)==null?void 0:e.yesterday;g!=null&&g.summary&&(h=g.summary.planned_total_cost??null,f=g.summary.actual_total_cost??null,w=g.summary.delta_cost??null,m=g.summary.accuracy_pct??null)}catch{b.debug("Yesterday analysis not available")}return{activePlan:"hybrid",actualSpent:s,planTotalCost:c,futurePlanCost:l,tomorrowCost:u,yesterdayPlannedCost:h,yesterdayActualCost:f,yesterdayDelta:w,yesterdayAccuracy:m}}catch(r){return b.error("Failed to fetch cost comparison",r),null}}async function mo(t){const i=po(),e=ho(),r=go(),n=await fo(t);return{efficiency:i,health:e,balancing:r,costComparison:n}}const Ze={severity:0,warningsCount:0,eventType:"",description:"",instruction:"",onset:"",expires:"",etaHours:0,allWarnings:[],effectiveSeverity:0},bo={vítr:"💨",déšť:"🌧️",sníh:"❄️",bouřky:"⛈️",mráz:"🥶",vedro:"🥵",mlha:"🌫️",náledí:"🧊",laviny:"🏔️"};function Hn(t){const i=t.toLowerCase();for(const[e,r]of Object.entries(bo))if(i.includes(e))return r;return"⚠️"}const Wn={0:"Bez výstrahy",1:"Nízká",2:"Zvýšená",3:"Vysoká",4:"Extrémní"},Ti={0:"#4CAF50",1:"#8BC34A",2:"#FF9800",3:"#f44336",4:"#9C27B0"};function yo(t){const i=ne();if(!i)return Ze;const e=`sensor.oig_${t}_chmu_warning_level`,r=i.get(e);if(!r)return b.debug("ČHMÚ sensor not found",{entityId:e}),Ze;const n=parseInt(r.state,10)||0,a=r.attributes||{},s=Number(a.warnings_count??0),l=String(a.event_type??""),c=String(a.description??""),u=String(a.instruction??""),h=String(a.onset??""),f=String(a.expires??""),w=Number(a.eta_hours??0),m=a.all_warnings_details??[],y=Array.isArray(m)?m.map(C=>({event_type:C.event_type??C.event??"",severity:C.severity??n,description:C.description??"",instruction:C.instruction??"",onset:C.onset??"",expires:C.expires??"",eta_hours:C.eta_hours??0})):[],g=l.toLowerCase().includes("žádná výstraha");return{severity:n,warningsCount:s,eventType:l,description:c,instruction:u,onset:h,expires:f,etaHours:w,allWarnings:y,effectiveSeverity:s===0||g?0:n}}const jn={"HOME I":{icon:"🏠",color:"#4CAF50",label:"HOME I"},"HOME II":{icon:"⚡",color:"#2196F3",label:"HOME II"},"HOME III":{icon:"🔋",color:"#9C27B0",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"#FF9800",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"#FF9800",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"#9E9E9E",label:"DO NOTHING"}},qn={yesterday:"📊 Včera",today:"📆 Dnes",tomorrow:"📅 Zítra",history:"📈 Historie",detail:"💎 Detail"};function sn(t){return{modeHistorical:t.mode_historical??t.mode??"",modePlanned:t.mode_planned??"",modeMatch:t.mode_match??!1,status:t.status??"planned",startTime:t.start_time??"",endTime:t.end_time??"",durationHours:t.duration_hours??0,costHistorical:t.cost_historical??null,costPlanned:t.cost_planned??null,costDelta:t.cost_delta??null,solarKwh:t.solar_total_kwh??0,consumptionKwh:t.consumption_total_kwh??0,gridImportKwh:t.grid_import_total_kwh??0,gridExportKwh:t.grid_export_total_kwh??0,intervalReasons:Array.isArray(t.interval_reasons)?t.interval_reasons:[]}}function $i(t){return{plan:(t==null?void 0:t.plan)??0,actual:(t==null?void 0:t.actual)??null,hasActual:(t==null?void 0:t.has_actual)??!1,unit:(t==null?void 0:t.unit)??""}}function vo(t){const i=(t==null?void 0:t.metrics)??{};return{overallAdherence:(t==null?void 0:t.overall_adherence)??0,modeSwitches:(t==null?void 0:t.mode_switches)??0,totalCost:(t==null?void 0:t.total_cost)??0,metrics:{cost:$i(i.cost),solar:$i(i.solar),consumption:$i(i.consumption),grid:$i(i.grid)},completedSummary:t!=null&&t.completed_summary?{count:t.completed_summary.count??0,totalCost:t.completed_summary.total_cost??0,adherencePct:t.completed_summary.adherence_pct??0}:void 0,plannedSummary:t!=null&&t.planned_summary?{count:t.planned_summary.count??0,totalCost:t.planned_summary.total_cost??0}:void 0,progressPct:t==null?void 0:t.progress_pct,actualTotalCost:t==null?void 0:t.actual_total_cost,planTotalCost:t==null?void 0:t.plan_total_cost,vsPlanPct:t==null?void 0:t.vs_plan_pct,eodPrediction:t!=null&&t.eod_prediction?{predictedTotal:t.eod_prediction.predicted_total??0,predictedSavings:t.eod_prediction.predicted_savings??0}:void 0}}function xo(t){return t?{date:t.date??"",modeBlocks:Array.isArray(t.mode_blocks)?t.mode_blocks.map(sn):[],summary:vo(t.summary),metadata:t.metadata?{activePlan:t.metadata.active_plan??"hybrid",comparisonPlanAvailable:t.metadata.comparison_plan_available}:void 0,comparison:t.comparison?{plan:t.comparison.plan??"",modeBlocks:Array.isArray(t.comparison.mode_blocks)?t.comparison.mode_blocks.map(sn):[]}:void 0}:null}async function wo(t,i,e="hybrid"){try{const r=await rt.loadDetailTabs(t,i,e);if(!r)return null;const n=r[i]??r;return xo(n)}catch(r){return b.error(`Failed to load timeline tab: ${i}`,r),null}}const fr={tiles_left:[null,null,null,null,null,null],tiles_right:[null,null,null,null,null,null],left_count:4,right_count:4,visible:!0,version:1},Vn="oig_dashboard_tiles";function $o(t,i){return i==="W"&&Math.abs(t)>=1e3?{value:(t/1e3).toFixed(2),unit:"kW"}:i==="Wh"&&Math.abs(t)>=1e3?{value:(t/1e3).toFixed(2),unit:"kWh"}:i==="W"||i==="Wh"?{value:Math.round(t).toString(),unit:i}:{value:t.toFixed(1),unit:i}}async function _o(){var t;try{const i=await rt.callWS({type:"call_service",domain:"oig_cloud",service:"get_dashboard_tiles",service_data:{},return_response:!0}),e=(t=i==null?void 0:i.response)==null?void 0:t.config;if(e&&typeof e=="object")return b.debug("Loaded tiles config from HA"),ln(e)}catch(i){b.debug("WS tile config load failed, trying localStorage",{error:i.message})}try{const i=localStorage.getItem(Vn);if(i){const e=JSON.parse(i);return b.debug("Loaded tiles config from localStorage"),ln(e)}}catch{b.debug("localStorage tile config load failed")}return fr}async function on(t){try{return localStorage.setItem(Vn,JSON.stringify(t)),await rt.callService("oig_cloud","save_dashboard_tiles",{config:JSON.stringify(t)}),b.info("Tiles config saved"),!0}catch(i){return b.error("Failed to save tiles config",i),!1}}function ln(t){return{tiles_left:Array.isArray(t.tiles_left)?t.tiles_left.slice(0,6):fr.tiles_left,tiles_right:Array.isArray(t.tiles_right)?t.tiles_right.slice(0,6):fr.tiles_right,left_count:typeof t.left_count=="number"?t.left_count:4,right_count:typeof t.right_count=="number"?t.right_count:4,visible:t.visible!==!1,version:t.version??1}}function nr(t){var l;const i=ne();if(!i)return{value:"--",unit:"",isActive:!1,rawValue:0};const e=i.get(t);if(!e||e.state==="unavailable"||e.state==="unknown")return{value:"--",unit:"",isActive:!1,rawValue:0};const r=e.state,n=String(((l=e.attributes)==null?void 0:l.unit_of_measurement)??""),a=parseFloat(r)||0;if(e.entity_id.startsWith("switch.")||e.entity_id.startsWith("binary_sensor."))return{value:r==="on"?"Zapnuto":"Vypnuto",unit:"",isActive:r==="on",rawValue:r==="on"?1:0};const s=$o(a,n);return{value:s.value,unit:s.unit,isActive:a!==0,rawValue:a}}function We(t){const i=(e,r)=>{var a,s;const n=[];for(let l=0;l<r;l++){const c=e[l];if(!c)continue;const u=nr(c.entity_id),h={};if((a=c.support_entities)!=null&&a.top_right){const f=nr(c.support_entities.top_right);h.topRight={value:f.value,unit:f.unit}}if((s=c.support_entities)!=null&&s.bottom_right){const f=nr(c.support_entities.bottom_right);h.bottomRight={value:f.value,unit:f.unit}}n.push({config:c,value:u.value,unit:u.unit,isActive:u.isActive,isZero:u.rawValue===0,formattedValue:u.unit?`${u.value} ${u.unit}`:u.value,supportValues:h})}return n};return{left:i(t.tiles_left,t.left_count),right:i(t.tiles_right,t.right_count)}}async function ko(t,i="toggle"){const e=t.split(".")[0];return rt.callService(e,i,{entity_id:t})}function ye(t){return t==null||Number.isNaN(t)?"-- Wh":Math.abs(t)>=1e3?`${(t/1e3).toFixed(2)} kWh`:`${Math.round(t)} Wh`}function et(t,i="CZK"){return t==null||Number.isNaN(t)?`-- ${i}`:`${t.toFixed(2)} ${i}`}function ve(t,i=0){return t==null||Number.isNaN(t)?"-- %":`${t.toFixed(i)} %`}const So={fridge:"❄️","fridge-outline":"❄️",dishwasher:"🍽️","washing-machine":"🧺","tumble-dryer":"🌪️",stove:"🔥",microwave:"📦","coffee-maker":"☕",kettle:"🫖",toaster:"🍞",lightbulb:"💡","lightbulb-outline":"💡",lamp:"🪔","ceiling-light":"💡","floor-lamp":"🪔","led-strip":"✨","led-strip-variant":"✨","wall-sconce":"💡",chandelier:"💡",thermometer:"🌡️",thermostat:"🌡️",radiator:"♨️","radiator-disabled":"❄️","heat-pump":"♨️","air-conditioner":"❄️",fan:"🌀",hvac:"♨️",fire:"🔥",snowflake:"❄️","lightning-bolt":"⚡",flash:"⚡",battery:"🔋","battery-charging":"🔋","battery-50":"🔋","solar-panel":"☀️","solar-power":"☀️","meter-electric":"⚡","power-plug":"🔌","power-socket":"🔌",car:"🚗","car-electric":"🚘","car-battery":"🔋","ev-station":"🔌","ev-plug-type2":"🔌",garage:"🏠","garage-open":"🏠",door:"🚪","door-open":"🚪",lock:"🔒","lock-open":"🔓","shield-home":"🛡️",cctv:"📹",camera:"📹","motion-sensor":"👁️","alarm-light":"🚨",bell:"🔔","window-closed":"🪟","window-open":"🪟",blinds:"🪟","blinds-open":"🪟",curtains:"🪟","roller-shade":"🪟",television:"📺",speaker:"🔊","speaker-wireless":"🔊",music:"🎵","volume-high":"🔊",cast:"📡",chromecast:"📡","router-wireless":"📡",wifi:"📶","access-point":"📡",lan:"🌐",network:"🌐","home-assistant":"🏠",water:"💧","water-percent":"💧","water-boiler":"♨️","water-pump":"💧",shower:"🚿",toilet:"🚽",faucet:"🚰",pipe:"🔧","weather-sunny":"☀️","weather-cloudy":"☁️","weather-night":"🌙","weather-rainy":"🌧️","weather-snowy":"❄️","weather-windy":"💨",information:"ℹ️","help-circle":"❓","alert-circle":"⚠️","checkbox-marked-circle":"✅","toggle-switch":"🔘",power:"⚡",sync:"🔄"};function Mi(t){const i=t.replace(/^mdi:/,"");return So[i]||"⚙️"}function cn(t,i){let e=!1;return(...r)=>{e||(t(...r),e=!0,setTimeout(()=>e=!1,i))}}async function je(t,i=3,e=1e3){let r;for(let n=0;n<=i;n++)try{return await t()}catch(a){if(r=a,a instanceof Error&&(a.message.includes("401")||a.message.includes("403")))throw a;if(n<i){const s=Math.min(e*Math.pow(2,n),5e3);await new Promise(l=>setTimeout(l,s))}}throw r}const Yn={home_1:"Home 1",home_2:"Home 2",home_3:"Home 3",home_ups:"Home UPS",home_5:"Home 5",home_6:"Home 6"},dn={"Home 1":"home_1","Home 2":"home_2","Home 3":"home_3","Home UPS":"home_ups","Home 5":"home_5","Home 6":"home_6","Mode 0":"home_1","Mode 1":"home_2","Mode 2":"home_3","Mode 3":"home_ups","Mode 4":"home_5","Mode 5":"home_6","HOME I":"home_1","HOME II":"home_2","HOME III":"home_3","HOME UPS":"home_ups",0:"home_1",1:"home_2",2:"home_3",3:"home_ups",4:"home_5",5:"home_6"},Co={home_1:"Home 1",home_2:"Home 2",home_3:"Home 3",home_ups:"Home UPS",home_5:"Home 5",home_6:"Home 6"},Si={off:"Vypnuto",on:"Zapnuto",limited:"S omezením"},Po={off:"Vypnuto / Off",on:"Zapnuto / On",limited:"S omezením / Limited"},un={Vypnuto:"off",Zapnuto:"on",Omezeno:"limited",Off:"off",On:"on",Limited:"limited"},To={off:"🚫",on:"💧",limited:"🚰"},Un={cbb:"Inteligentní",manual:"Manuální"},Gn={cbb:"🤖",manual:"👤"},pn={CBB:"cbb",Manuální:"manual",Manual:"manual",Inteligentní:"cbb"},Mo={cbb:"CBB",manual:"Manual"},Eo={set_box_mode:"🏠 Změna režimu boxu",set_grid_delivery:"💧 Změna nastavení přetoků",set_grid_delivery_limit:"🔢 Změna limitu přetoků",set_boiler_mode:"🔥 Změna nastavení bojleru",set_formating_mode:"🔋 Změna nabíjení baterie",set_battery_capacity:"⚡ Změna kapacity baterie"},hn={CBB:"Inteligentní",Manual:"Manuální",Manuální:"Manuální"},Kn={status:"idle",activity:"",queueCount:0,runningRequests:[],queuedRequests:[],allRequests:[],currentBoxMode:"home_1",currentGridDelivery:"off",currentGridLimit:0,currentBoilerMode:"cbb",pendingServices:new Map,changingServices:new Set};class Oo{constructor(){this.state={...Kn,pendingServices:new Map,changingServices:new Set},this.listeners=new Set,this.watcherUnsub=null,this.queueUpdateInterval=null,this.started=!1}start(){this.started||(this.started=!0,this.watcherUnsub=be.onEntityChange((i,e)=>{i&&this.shouldRefreshShield(i)&&this.refresh()}),this.refresh(),this.queueUpdateInterval=window.setInterval(()=>{this.state.allRequests.length>0&&this.notify()},1e3),b.debug("ShieldController started"))}stop(){var i;(i=this.watcherUnsub)==null||i.call(this),this.watcherUnsub=null,this.queueUpdateInterval!==null&&(clearInterval(this.queueUpdateInterval),this.queueUpdateInterval=null),this.started=!1,b.debug("ShieldController stopped")}subscribe(i){return this.listeners.add(i),i(this.state),()=>this.listeners.delete(i)}getState(){return this.state}shouldRefreshShield(i){return["service_shield_","box_prms_mode","boiler_manual_mode","invertor_prms_to_grid","invertor_prm1_p_max_feed_grid"].some(r=>i.includes(r))}refresh(){const i=ne();if(i)try{const e=i.findSensorId("service_shield_activity"),r=i.get(e),n=(r==null?void 0:r.attributes)??{},a=n.running_requests??[],s=n.queued_requests??[],l=i.findSensorId("service_shield_status"),c=i.findSensorId("service_shield_queue"),u=i.getString(l).value,h=i.getNumeric(c).value,f=i.getString(i.getSensorId("box_prms_mode")).value,w=i.getString(i.getSensorId("invertor_prms_to_grid")).value,m=i.getNumeric(i.getSensorId("invertor_prm1_p_max_feed_grid")).value,y=i.getString(i.getSensorId("boiler_manual_mode")).value,g=dn[f.trim()]??"home_1",k=un[w.trim()]??"off",C=pn[y.trim()]??"cbb",$=a.map((z,O)=>this.parseRequest(z,O,!0)),S=s.map((z,O)=>this.parseRequest(z,O+a.length,!1)),Y=[...$,...S],K=new Map,v=new Set;for(const z of Y){const O=this.parseServiceRequest(z);O&&!K.has(O.type)&&(K.set(O.type,O.targetValue),v.add(O.type))}w.trim()==="Probíhá změna"&&v.add("grid_mode");const H=u==="Running"||u==="running";this.state={status:H?"running":"idle",activity:(r==null?void 0:r.state)??"",queueCount:h,runningRequests:$,queuedRequests:S,allRequests:Y,currentBoxMode:g,currentGridDelivery:k,currentGridLimit:m,currentBoilerMode:C,pendingServices:K,changingServices:v},this.notify()}catch(e){b.error("ShieldController refresh failed",e)}}parseRequest(i,e,r){const n=i.service??"",a=Array.isArray(i.changes)?i.changes:[],s=i.started_at??i.queued_at??i.created_at??i.timestamp??i.created??"",l=i.target_value??i.target_display??"";let c="mode_change";return n.includes("set_box_mode")?c="mode_change":n.includes("set_grid_delivery")&&!n.includes("limit")?c="grid_delivery":n.includes("grid_delivery_limit")||n.includes("set_grid_delivery")?c="grid_limit":n.includes("set_boiler_mode")?c="boiler_mode":n.includes("set_formating_mode")&&(c="battery_formating"),{id:`${n}_${e}_${s}`,type:c,status:r?"running":"queued",service:n,targetValue:l,changes:a,createdAt:s,position:e+1}}parseServiceRequest(i){const e=i.service;if(!e)return null;const r=i.changes.length>0?i.changes[0]:"";if(e.includes("set_grid_delivery")&&r.includes("p_max_feed_grid")){const s=r.match(/→\s*(\d+)/);return s?{type:"grid_limit",targetValue:s[1]}:null}const n=r.match(/→\s*'([^']+)'/),a=n?n[1]:i.targetValue;if(e.includes("set_box_mode"))return{type:"box_mode",targetValue:a};if(e.includes("set_boiler_mode"))return{type:"boiler_mode",targetValue:a};if(e.includes("set_grid_delivery")&&r.includes("prms_to_grid"))return{type:"grid_mode",targetValue:a};if(e.includes("set_grid_delivery")){const s=r.match(/→\s*(\d+)/);return s?{type:"grid_limit",targetValue:s[1]}:{type:"grid_mode",targetValue:a}}return null}getBoxModeButtonState(i){const e=this.state.pendingServices.get("box_mode");return e?dn[e]===i?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoxMode===i?"active":"idle"}getGridDeliveryButtonState(i){if(this.state.changingServices.has("grid_mode")){const e=this.state.pendingServices.get("grid_mode");return e&&un[e]===i?this.state.status==="running"?"processing":"pending":this.state.pendingServices.has("grid_limit")&&i==="limited"?this.state.status==="running"?"processing":"pending":"disabled-by-service"}return this.state.changingServices.has("grid_limit")?i==="limited"?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentGridDelivery===i?"active":"idle"}getBoilerModeButtonState(i){const e=this.state.pendingServices.get("boiler_mode");return e?pn[e]===i?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoilerMode===i?"active":"idle"}isAnyServiceChanging(){return this.state.changingServices.size>0}shouldProceedWithQueue(){return this.state.queueCount<3?!0:window.confirm(`⚠️ VAROVÁNÍ: Fronta již obsahuje ${this.state.queueCount} úkolů!

Každá změna může trvat až 10 minut.
Opravdu chcete přidat další úkol?`)}async setBoxMode(i){const e=Co[i];if(this.state.currentBoxMode===i&&!this.state.changingServices.has("box_mode"))return!1;const r=await rt.callService("oig_cloud","set_box_mode",{mode:e,acknowledgement:!0});return r&&this.refresh(),r}async setGridDelivery(i,e){const r=Po[i],n={acknowledgement:!0,warning:!0};i==="limited"&&e!=null?(this.state.currentGridDelivery==="limited"||(n.mode=r),n.limit=e):e!=null?n.limit=e:n.mode=r;const a=await rt.callService("oig_cloud","set_grid_delivery",n);return a&&this.refresh(),a}async setBoilerMode(i){const e=Mo[i];if(this.state.currentBoilerMode===i&&!this.state.changingServices.has("boiler_mode"))return!1;const r=await rt.callService("oig_cloud","set_boiler_mode",{mode:e,acknowledgement:!0});return r&&this.refresh(),r}async removeFromQueue(i){const e=await rt.callService("oig_cloud","shield_remove_from_queue",{position:i});return e&&this.refresh(),e}notify(){for(const i of this.listeners)try{i(this.state)}catch(e){b.error("ShieldController listener error",e)}}}const X=new Oo;var Do=Object.defineProperty,zo=Object.getOwnPropertyDescriptor,ae=(t,i,e,r)=>{for(var n=r>1?void 0:r?zo(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&Do(i,e,n),n};const ft=Z;let Dt=class extends M{constructor(){super(...arguments),this.title="Energetické Toky",this.time="",this.showStatus=!1,this.alertCount=0,this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1}onStatusClick(){this.dispatchEvent(new CustomEvent("status-click",{bubbles:!0}))}onEditClick(){this.dispatchEvent(new CustomEvent("edit-click",{bubbles:!0}))}onResetClick(){this.dispatchEvent(new CustomEvent("reset-click",{bubbles:!0}))}onToggleLeftPanel(){this.dispatchEvent(new CustomEvent("toggle-left-panel",{bubbles:!0}))}onToggleRightPanel(){this.dispatchEvent(new CustomEvent("toggle-right-panel",{bubbles:!0}))}render(){const t=this.alertCount>0?"warning":"ok";return d`
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
    `}};Dt.styles=P`
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
  `;ae([p({type:String})],Dt.prototype,"title",2);ae([p({type:String})],Dt.prototype,"time",2);ae([p({type:Boolean})],Dt.prototype,"showStatus",2);ae([p({type:Number})],Dt.prototype,"alertCount",2);ae([p({type:Boolean})],Dt.prototype,"leftPanelCollapsed",2);ae([p({type:Boolean})],Dt.prototype,"rightPanelCollapsed",2);Dt=ae([E("oig-header")],Dt);function Zn(t,i){let e=null;return function(...r){e!==null&&clearTimeout(e),e=window.setTimeout(()=>{t.apply(this,r),e=null},i)}}var Io=Object.defineProperty,Ao=Object.getOwnPropertyDescriptor,ui=(t,i,e,r)=>{for(var n=r>1?void 0:r?Ao(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&Io(i,e,n),n};const gn="oig_v2_theme";let Xt=class extends M{constructor(){super(...arguments),this.mode="auto",this.isDark=!1,this.breakpoint="desktop",this.width=1280,this.mediaQuery=null,this.resizeObserver=null,this.debouncedResize=Zn(this.updateBreakpoint.bind(this),100),this.onMediaChange=t=>{this.mode==="auto"&&(this.isDark=t.matches,this.dispatchEvent(new CustomEvent("theme-changed",{detail:{isDark:this.isDark}})))},this.onThemeChange=()=>{this.detectTheme()}}connectedCallback(){super.connectedCallback(),this.loadTheme(),this.setupMediaQuery(),this.setupResizeObserver(),this.detectTheme(),window.addEventListener("oig-theme-change",this.onThemeChange)}disconnectedCallback(){var t,i;super.disconnectedCallback(),(t=this.mediaQuery)==null||t.removeEventListener("change",this.onMediaChange),(i=this.resizeObserver)==null||i.disconnect(),window.removeEventListener("oig-theme-change",this.onThemeChange)}loadTheme(){const t=localStorage.getItem(gn);t&&["light","dark","auto"].includes(t)&&(this.mode=t)}saveTheme(){localStorage.setItem(gn,this.mode)}setupMediaQuery(){this.mediaQuery=window.matchMedia("(prefers-color-scheme: dark)"),this.mediaQuery.addEventListener("change",this.onMediaChange)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(this.debouncedResize),this.resizeObserver.observe(document.documentElement),this.updateBreakpoint()}updateBreakpoint(){this.width=window.innerWidth,this.breakpoint=me(this.width)}detectTheme(){this.mode==="auto"?this.isDark=window.matchMedia("(prefers-color-scheme: dark)").matches:this.isDark=this.mode==="dark"}setTheme(t){this.mode=t,this.saveTheme(),this.detectTheme(),this.dispatchEvent(new CustomEvent("theme-changed",{detail:{mode:t,isDark:this.isDark}})),b.info("Theme changed",{mode:t,isDark:this.isDark})}getThemeInfo(){return{mode:this.mode,isDark:this.isDark,breakpoint:this.breakpoint,width:this.width}}render(){return d`
      <slot></slot>
    `}};Xt.styles=P`
    :host {
      display: contents;
    }
  `;ui([p({type:String})],Xt.prototype,"mode",2);ui([x()],Xt.prototype,"isDark",2);ui([x()],Xt.prototype,"breakpoint",2);ui([x()],Xt.prototype,"width",2);Xt=ui([E("oig-theme-provider")],Xt);var Lo=Object.defineProperty,Bo=Object.getOwnPropertyDescriptor,xr=(t,i,e,r)=>{for(var n=r>1?void 0:r?Bo(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&Lo(i,e,n),n};let Qe=class extends M{constructor(){super(...arguments),this.tabs=[],this.activeTab=""}onTabClick(t){t!==this.activeTab&&(this.activeTab=t,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tabId:t},bubbles:!0})))}isActive(t){return this.activeTab===t}render(){return d`
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
  `;xr([p({type:Array})],Qe.prototype,"tabs",2);xr([p({type:String})],Qe.prototype,"activeTab",2);Qe=xr([E("oig-tabs")],Qe);var Fo=Object.defineProperty,No=Object.getOwnPropertyDescriptor,wr=(t,i,e,r)=>{for(var n=r>1?void 0:r?No(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&Fo(i,e,n),n};const Ro="oig_v2_layout_",ar=Z;let Xe=class extends M{constructor(){super(...arguments),this.editable=!1,this.breakpoint="desktop",this.onResize=Zn(()=>{this.breakpoint=me(window.innerWidth)},100)}connectedCallback(){super.connectedCallback(),this.breakpoint=me(window.innerWidth),window.addEventListener("resize",this.onResize)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("resize",this.onResize)}updated(t){t.has("breakpoint")&&this.setAttribute("breakpoint",this.breakpoint)}resetLayout(){const t=`${Ro}${this.breakpoint}`;localStorage.removeItem(t),this.requestUpdate()}render(){return d`<slot></slot>`}};Xe.styles=P`
    :host {
      display: grid;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      background: ${ar(o.bgSecondary)};
    }

    :host([breakpoint='mobile']) { grid-template-columns: 1fr; }
    :host([breakpoint='tablet']) { grid-template-columns: repeat(2, 1fr); }
    :host([breakpoint='desktop']) { grid-template-columns: repeat(3, 1fr); }

    .grid-item {
      position: relative;
      background: ${ar(o.cardBg)};
      border-radius: 8px;
      box-shadow: ${ar(o.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .grid-item.editable { cursor: move; }
    .grid-item.editable:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .grid-item.dragging { opacity: 0.8; transform: scale(1.02); z-index: 100; }

    @media (max-width: 768px) {
      :host { gap: 12px; padding: 12px; }
    }
  `;wr([p({type:Boolean})],Xe.prototype,"editable",2);wr([x()],Xe.prototype,"breakpoint",2);Xe=wr([E("oig-grid")],Xe);const Ho=t=>{const i=t.trim();return i?i.endsWith("W")?i:`${i}W`:""};function fn(t,i){const e=i.has("box_mode"),r=t.get("box_mode"),n=i.has("grid_mode")||i.has("grid_limit"),a=t.get("grid_limit"),s=t.get("grid_mode");let l=null;if(a){const c=Ho(a);l=c?`→ ${c}`:null}else s&&(l=`→ ${s}`);return{inverterModeChanging:e,inverterModeText:r?`→ ${r}`:null,gridExportChanging:n,gridExportText:l}}var Wo=Object.defineProperty,jo=Object.getOwnPropertyDescriptor,Ki=(t,i,e,r)=>{for(var n=r>1?void 0:r?jo(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&Wo(i,e,n),n};let we=class extends M{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1}get fillHeight(){return Math.max(0,Math.min(100,this.soc))/100*54}get fillY(){return 13+(54-this.fillHeight)}render(){return d`
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
  `;Ki([p({type:Number})],we.prototype,"soc",2);Ki([p({type:Boolean})],we.prototype,"charging",2);Ki([p({type:Boolean})],we.prototype,"gridCharging",2);we=Ki([E("oig-battery-gauge")],we);var qo=Object.defineProperty,Vo=Object.getOwnPropertyDescriptor,Zi=(t,i,e,r)=>{for(var n=r>1?void 0:r?Vo(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&qo(i,e,n),n};let $e=class extends M{constructor(){super(...arguments),this.power=0,this.percent=0,this.maxPower=5400}get isNight(){return this.percent<2}get level(){return this.percent<2?"night":this.percent<20?"low":this.percent<65?"mid":"high"}get sunColor(){const t=this.level;return t==="low"?"#b0bec5":t==="mid"?"#ffd54f":"#ffb300"}get rayLen(){const t=this.level;return t==="low"?4:t==="mid"?7:10}get rayOpacity(){const t=this.level;return t==="low"?.5:t==="mid"?.8:1}get coreRadius(){const t=this.level;return t==="low"?7:t==="mid"?9:11}renderMoon(){return Et`
      <circle cx="24" cy="24" r="20" fill="#3949ab" opacity="0.28"/>
      <g class="moon-body">
        <path d="M24 6 A18 18 0 1 0 24 42 A13 13 0 1 1 24 6Z" fill="#cfd8dc" opacity="0.95"/>
      </g>
      <circle class="star" cx="7" cy="10" r="1.5" fill="#e8eaf6" style="animation-delay:0s"/>
      <circle class="star" cx="41" cy="7" r="1.8" fill="#e8eaf6" style="animation-delay:0.7s"/>
      <circle class="star" cx="5" cy="30" r="1.2" fill="#c5cae9" style="animation-delay:1.4s"/>
      <circle class="star" cx="6" cy="44" r="1.0" fill="#c5cae9" style="animation-delay:2.1s"/>
      <circle class="star" cx="42" cy="39" r="1.3" fill="#e8eaf6" style="animation-delay:2.8s"/>
    `}renderSun(){const e=this.coreRadius,r=e+3,n=r+this.rayLen,a=this.sunColor,s=this.rayOpacity,c=[0,45,90,135,180,225,270,315].map(h=>{const f=h*Math.PI/180,w=24+Math.cos(f)*r,m=24+Math.sin(f)*r,y=24+Math.cos(f)*n,g=24+Math.sin(f)*n;return Et`
        <line class="ray"
          x1="${w}" y1="${m}" x2="${y}" y2="${g}"
          stroke="${a}" stroke-width="2.5" opacity="${s}"
        />
      `}),u=this.level==="low";return Et`
      <!-- Paprsky obaleny v <g> pro CSS rotaci -->
      <g class="rays-group">
        ${c}
      </g>
      <circle class="sun-core" cx="${24}" cy="${24}" r="${e}" fill="${a}" />
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
  `;Zi([p({type:Number})],$e.prototype,"power",2);Zi([p({type:Number})],$e.prototype,"percent",2);Zi([p({type:Number})],$e.prototype,"maxPower",2);$e=Zi([E("oig-solar-icon")],$e);var Yo=Object.defineProperty,Uo=Object.getOwnPropertyDescriptor,pi=(t,i,e,r)=>{for(var n=r>1?void 0:r?Uo(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&Yo(i,e,n),n};let Jt=class extends M{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1,this.discharging=!1,this._clipId=`batt-clip-${Math.random().toString(36).slice(2)}`}get fillColor(){return this.gridCharging?"#42a5f5":this.soc>50?"#4caf50":this.soc>20?"#ff9800":"#f44336"}get fillHeight(){return Math.max(1,Math.min(100,this.soc)/100*48)}get fillY(){return 14+(48-this.fillHeight)}get stripeColor(){return this.gridCharging?"#90caf9":"#a5d6a7"}render(){const t=this.charging||this.gridCharging,i=this.soc>=25;return d`
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
        ${i?Et`
          <text class="soc-text" x="16" y="${this.fillY+this.fillHeight/2}">
            ${Math.round(this.soc)}%
          </text>
        `:""}
      </svg>
    `}};Jt.styles=P`
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
  `;pi([p({type:Number})],Jt.prototype,"soc",2);pi([p({type:Boolean})],Jt.prototype,"charging",2);pi([p({type:Boolean})],Jt.prototype,"gridCharging",2);pi([p({type:Boolean})],Jt.prototype,"discharging",2);Jt=pi([E("oig-battery-icon")],Jt);var Go=Object.defineProperty,Ko=Object.getOwnPropertyDescriptor,Qn=(t,i,e,r)=>{for(var n=r>1?void 0:r?Ko(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&Go(i,e,n),n};let Ei=class extends M{constructor(){super(...arguments),this.power=0}get mode(){return this.power>50?"importing":this.power<-50?"exporting":"idle"}render(){const t=this.mode;return d`
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
    `}};Ei.styles=P`
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
  `;Qn([p({type:Number})],Ei.prototype,"power",2);Ei=Qn([E("oig-grid-icon")],Ei);var Zo=Object.defineProperty,Qo=Object.getOwnPropertyDescriptor,Qi=(t,i,e,r)=>{for(var n=r>1?void 0:r?Qo(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&Zo(i,e,n),n};let _e=class extends M{constructor(){super(...arguments),this.power=0,this.maxPower=1e4,this.boilerActive=!1}get percent(){return Math.min(100,this.power/Math.max(1,this.maxPower)*100)}get fillColor(){const t=this.percent;return t<15?"#546e7a":t<40?"#f06292":t<70?"#e91e63":"#c62828"}get level(){const t=this.percent;return t<15?"low":t<60?"mid":"high"}get windowColor(){const t=this.level;return t==="low"?"#37474f":t==="mid"?"#ffd54f":"#ffb300"}render(){const t=this.percent,i=24,e=22,r=Math.max(1,t/100*i),n=e+(i-r),a=this.level;return d`
      <svg viewBox="0 0 48 48">
        <defs>
          <clipPath id="house-clip">
            <rect x="8" y="${e}" width="32" height="${i}" rx="1"/>
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
          x="8" y="${e}" width="32" height="${i}" rx="1"
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
  `;Qi([p({type:Number})],_e.prototype,"power",2);Qi([p({type:Number})],_e.prototype,"maxPower",2);Qi([p({type:Boolean})],_e.prototype,"boilerActive",2);_e=Qi([E("oig-house-icon")],_e);var Xo=Object.defineProperty,Jo=Object.getOwnPropertyDescriptor,hi=(t,i,e,r)=>{for(var n=r>1?void 0:r?Jo(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&Xo(i,e,n),n};let te=class extends M{constructor(){super(...arguments),this.mode="",this.bypassActive=!1,this.hasAlarm=!1,this.plannerAuto=!1}get modeType(){return this.hasAlarm?"alarm":this.bypassActive?"bypass":this.mode.includes("UPS")?"ups":"normal"}render(){const t=this.modeType;return d`
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
    `}};te.styles=P`
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
  `;hi([p({type:String})],te.prototype,"mode",2);hi([p({type:Boolean})],te.prototype,"bypassActive",2);hi([p({type:Boolean})],te.prototype,"hasAlarm",2);hi([p({type:Boolean})],te.prototype,"plannerAuto",2);te=hi([E("oig-inverter-icon")],te);var tl=Object.defineProperty,el=Object.getOwnPropertyDescriptor,It=(t,i,e,r)=>{for(var n=r>1?void 0:r?el(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&tl(i,e,n),n};const W=Z,mn=new URLSearchParams(window.location.search),il=mn.get("sn")||mn.get("inverter_sn")||"2206237016",rl=t=>`sensor.oig_${il}_${t}`,sr="oig_v2_flow_layout_",Kt=["solar","battery","inverter","grid","house"],nl={solar:{top:"0%",left:"0%"},house:{top:"0%",left:"65%"},inverter:{top:"35%",left:"35%"},grid:{top:"70%",left:"0%"},battery:{top:"70%",left:"65%"}};function A(t){return()=>rt.openEntityDialog(rl(t))}let kt=class extends M{constructor(){super(...arguments),this.data=vr,this.editMode=!1,this.pendingServices=new Map,this.changingServices=new Set,this.shieldStatus="idle",this.shieldQueueCount=0,this.shieldUnsub=null,this.expandedNodes=new Set,this.customPositions={},this.draggedNodeId=null,this.dragStartX=0,this.dragStartY=0,this.dragStartTop=0,this.dragStartLeft=0,this.onShieldUpdate=t=>{this.pendingServices=t.pendingServices,this.changingServices=t.changingServices,this.shieldStatus=t.status,this.shieldQueueCount=t.queueCount},this.handleDragStart=t=>{if(!this.editMode)return;t.preventDefault(),t.stopPropagation();const e=t.target.closest(".node");if(!e)return;const r=this.findNodeId(e);if(!r)return;this.draggedNodeId=r,e.classList.add("dragging");const n=e.getBoundingClientRect();this.dragStartX=t.clientX,this.dragStartY=t.clientY,this.dragStartTop=n.top,this.dragStartLeft=n.left},this.handleTouchStart=t=>{if(!this.editMode)return;t.preventDefault();const e=t.target.closest(".node");if(!e)return;const r=this.findNodeId(e);if(!r)return;this.draggedNodeId=r,e.classList.add("dragging");const n=t.touches[0],a=e.getBoundingClientRect();this.dragStartX=n.clientX,this.dragStartY=n.clientY,this.dragStartTop=a.top,this.dragStartLeft=a.left},this.handleDragMove=t=>{!this.draggedNodeId||!this.editMode||(t.preventDefault(),this.updateDragPosition(t.clientX,t.clientY))},this.handleTouchMove=t=>{if(!this.draggedNodeId||!this.editMode)return;t.preventDefault();const i=t.touches[0];this.updateDragPosition(i.clientX,i.clientY)},this.handleDragEnd=t=>{var r;if(!this.draggedNodeId||!this.editMode)return;const i=(r=this.shadowRoot)==null?void 0:r.querySelector(".flow-grid"),e=i==null?void 0:i.querySelector(`.node-${this.draggedNodeId}`);e&&e.classList.remove("dragging"),this.saveLayout(),this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0})),this.draggedNodeId=null},this.handleTouchEnd=t=>{this.handleDragEnd(t)}}connectedCallback(){super.connectedCallback(),this.loadSavedLayout(),this.shieldUnsub=X.subscribe(this.onShieldUpdate)}disconnectedCallback(){var t;super.disconnectedCallback(),this.removeDragListeners(),(t=this.shieldUnsub)==null||t.call(this),this.shieldUnsub=null}updated(t){t.has("editMode")&&(this.editMode?(this.setAttribute("editmode",""),this.loadSavedLayout(),this.requestUpdate(),this.updateComplete.then(()=>this.applySavedPositions())):(this.removeAttribute("editmode"),this.removeDragListeners(),this.clearInlinePositions(),this.updateComplete.then(()=>this.applyCustomPositions()))),!this.editMode&&this.hasCustomLayout&&this.updateComplete.then(()=>this.applyCustomPositions())}loadSavedLayout(){const t=me(window.innerWidth),i=`${sr}${t}`;try{const e=localStorage.getItem(i);e&&(this.customPositions=JSON.parse(e),b.debug("[FlowNode] Loaded layout for "+t))}catch{}}applySavedPositions(){var i;if(!this.editMode)return;const t=(i=this.shadowRoot)==null?void 0:i.querySelector(".flow-grid");if(t){for(const e of Kt){const r=this.customPositions[e];if(!r)continue;const n=t.querySelector(`.node-${e}`);n&&(n.style.top=r.top,n.style.left=r.left)}this.initDragListeners()}}clearInlinePositions(){var i;const t=(i=this.shadowRoot)==null?void 0:i.querySelector(".flow-grid");if(t)for(const e of Kt){const r=t.querySelector(`.node-${e}`);r&&(r.style.top="",r.style.left="")}}saveLayout(){const t=me(window.innerWidth),i=`${sr}${t}`;try{localStorage.setItem(i,JSON.stringify(this.customPositions)),b.debug("[FlowNode] Saved layout for "+t)}catch{}}toggleExpand(t,i){const e=i.target;if(e.closest(".clickable")||e.closest(".indicator")||e.closest(".forecast-badge")||e.closest(".node-value")||e.closest(".node-subvalue")||e.closest(".gc-plan-btn"))return;const r=new Set(this.expandedNodes);r.has(t)?r.delete(t):r.add(t),this.expandedNodes=r}nodeClass(t,i=""){const e=this.expandedNodes.has(t)?" expanded":"";return`node node-${t}${e}${i?" "+i:""}`}get hasCustomLayout(){return Kt.some(t=>{const i=this.customPositions[t];return(i==null?void 0:i.top)!=null&&(i==null?void 0:i.left)!=null})}applyCustomPositions(){var i;if(this.editMode||!this.hasCustomLayout)return;const t=(i=this.shadowRoot)==null?void 0:i.querySelector(".flow-grid");if(t)for(const e of Kt){const r=t.querySelector(`.node-${e}`);if(!r)continue;const n=this.customPositions[e]??nl[e];r.style.top=n.top,r.style.left=n.left}}resetLayout(){const t=me(window.innerWidth),i=`${sr}${t}`;localStorage.removeItem(i),this.customPositions={},this.clearInlinePositions(),this.editMode&&this.requestUpdate(),b.debug("[FlowNode] Reset layout for "+t)}initDragListeners(){var i;const t=(i=this.shadowRoot)==null?void 0:i.querySelector(".flow-grid");if(t){for(const e of Kt){const r=t.querySelector(`.node-${e}`);r&&(r.addEventListener("mousedown",this.handleDragStart),r.addEventListener("touchstart",this.handleTouchStart,{passive:!1}))}document.addEventListener("mousemove",this.handleDragMove),document.addEventListener("mouseup",this.handleDragEnd),document.addEventListener("touchmove",this.handleTouchMove,{passive:!1}),document.addEventListener("touchend",this.handleTouchEnd)}}removeDragListeners(){document.removeEventListener("mousemove",this.handleDragMove),document.removeEventListener("mouseup",this.handleDragEnd),document.removeEventListener("touchmove",this.handleTouchMove),document.removeEventListener("touchend",this.handleTouchEnd)}findNodeId(t){for(const e of Kt)if(t.classList.contains(`node-${e}`))return e;const i=t.closest('[class*="node-"]');if(!i)return null;for(const e of Kt)if(i.classList.contains(`node-${e}`))return e;return null}updateDragPosition(t,i){var $;if(!this.draggedNodeId)return;const e=($=this.shadowRoot)==null?void 0:$.querySelector(".flow-grid");if(!e)return;const r=e.querySelector(`.node-${this.draggedNodeId}`);if(!r)return;const n=e.getBoundingClientRect(),a=r.getBoundingClientRect(),s=t-this.dragStartX,l=i-this.dragStartY,c=this.dragStartLeft+s,u=this.dragStartTop+l,h=n.left,f=n.right-a.width,w=n.top,m=n.bottom-a.height,y=Math.max(h,Math.min(f,c)),g=Math.max(w,Math.min(m,u)),k=(y-n.left)/n.width*100,C=(g-n.top)/n.height*100;r.style.left=`${k}%`,r.style.top=`${C}%`,this.customPositions[this.draggedNodeId]={top:`${C}%`,left:`${k}%`},this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0}))}renderSolar(){const t=this.data,i=t.solarPercent,e=i<2,r=e?"linear-gradient(135deg, rgba(57,73,171,0.25) 0%, rgba(26,35,126,0.18) 100%)":Be.solar,n=e?"rgba(121,134,203,0.5)":Fe.solar,a=e?"position:absolute;top:4px;left:6px;font-size:11px;background:rgba(57,73,171,0.35);color:#9fa8da;padding:3px 8px;border-radius:4px;border:1px solid rgba(121,134,203,0.4)":"position:absolute;top:4px;left:6px;font-size:9px",s=e?"position:absolute;top:4px;right:6px;font-size:11px;background:rgba(57,73,171,0.35);color:#9fa8da;padding:3px 8px;border-radius:4px;border:1px solid rgba(121,134,203,0.4)":"position:absolute;top:4px;right:6px;font-size:9px";return d`
      <div class="${this.nodeClass("solar",e?"night":"")}" style="--node-gradient: ${r}; --node-border: ${n};"
        @click=${l=>this.toggleExpand("solar",l)}>
        <div class="node-header" style="margin-top:16px">
          <oig-solar-icon .power=${t.solarPower} .percent=${i} .maxPower=${5400}></oig-solar-icon>
          <span class="node-label">Solár</span>
        </div>
        <div class="node-value" @click=${A("actual_fv_total")}>
          ${Re(t.solarPower)}
        </div>
        <div class="node-subvalue" @click=${A("dc_in_fv_ad")}>
          Dnes: ${(t.solarToday/1e3).toFixed(2)} kWh
        </div>
        <div class="node-subvalue" @click=${A("solar_forecast")}>
          Zítra: ${t.solarForecastTomorrow.toFixed(1)} kWh
        </div>

        <button class="indicator" style="${a}" @click=${A("solar_forecast")}>
          🔮 ${t.solarForecastToday.toFixed(1)} kWh
        </button>
        <button class="indicator" style="${s}" @click=${A("solar_forecast")}>
          🌅 ${t.solarForecastTomorrow.toFixed(1)} kWh
        </button>

        <div class="detail-section">
          <div class="solar-strings">
            <div>
              <div class="detail-header">🏭 String 1</div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${A("extended_fve_voltage_1")}>${Math.round(t.solarV1)}V</button>
              </div>
              <div class="detail-row">
                <span class="icon">〰️</span>
                <button class="clickable" @click=${A("extended_fve_current_1")}>${t.solarI1.toFixed(1)}A</button>
              </div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${A("dc_in_fv_p1")}>${Math.round(t.solarP1)} W</button>
              </div>
            </div>
            <div>
              <div class="detail-header">🏭 String 2</div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${A("extended_fve_voltage_2")}>${Math.round(t.solarV2)}V</button>
              </div>
              <div class="detail-row">
                <span class="icon">〰️</span>
                <button class="clickable" @click=${A("extended_fve_current_2")}>${t.solarI2.toFixed(1)}A</button>
              </div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${A("dc_in_fv_p2")}>${Math.round(t.solarP2)} W</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `}openGridChargingDialog(){this.dispatchEvent(new CustomEvent("oig-grid-charging-open",{bubbles:!0,composed:!0,detail:{data:this.data.gridChargingPlan}}))}getBatteryStatus(){const t=this.data;return t.batteryPower>10?{text:`⚡ Nabíjení${t.timeToFull?` (${t.timeToFull})`:""}`,cls:"status-charging pulse"}:t.batteryPower<-10?{text:`⚡ Vybíjení${t.timeToEmpty?` (${t.timeToEmpty})`:""}`,cls:"status-discharging pulse"}:{text:"◉ Klid",cls:"status-idle"}}getBalancingIndicator(){const t=this.data,i=t.balancingState;return i!=="charging"&&i!=="holding"&&i!=="completed"?{show:!1,text:"",icon:"",cls:""}:i==="charging"?{show:!0,text:`Nabíjení${t.balancingTimeRemaining?` (${t.balancingTimeRemaining})`:""}`,icon:"⚡",cls:"charging"}:i==="holding"?{show:!0,text:`Držení${t.balancingTimeRemaining?` (${t.balancingTimeRemaining})`:""}`,icon:"⏸️",cls:"holding"}:{show:!0,text:"Dokončeno",icon:"✅",cls:"completed"}}renderBattery(){const t=this.data,i=this.getBatteryStatus(),e=this.getBalancingIndicator(),r=t.batteryPower>10,n=t.batteryTemp>25?"🌡️":t.batteryTemp<15?"🧊":"🌡️",a=t.batteryTemp>25?"temp-hot":t.batteryTemp<15?"temp-cold":"";return d`
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

        <div class="node-value" @click=${A("batt_bat_c")}>
          ${Math.round(t.batterySoC)} %
        </div>
        <div class="node-subvalue" @click=${A("batt_batt_comp_p")}>
          ${Re(t.batteryPower)}
        </div>

        <div class="node-status ${i.cls}">${i.text}</div>

        ${t.isGridCharging?d`
          <span class="grid-charging-badge">⚡🔌 Síťové nabíjení</span>
        `:I}
        ${e.show?d`
          <span class="balancing-indicator ${e.cls}">
            <span>${e.icon}</span>
            <span>${e.text}</span>
          </span>
        `:I}

        <div class="battery-indicators">
          <button class="indicator" @click=${A("extended_battery_voltage")}>
            ⚡ ${t.batteryVoltage.toFixed(1)} V
          </button>
          <button class="indicator" @click=${A("extended_battery_current")}>
            〰️ ${t.batteryCurrent.toFixed(1)} A
          </button>
          <button class="indicator ${a}" @click=${A("extended_battery_temperature")}>
            ${n} ${t.batteryTemp.toFixed(1)} °C
          </button>
        </div>

        <!-- Energie + gc-plan vždy viditelné (ne v detail-section) -->
        <div class="battery-energy-section">
          <div class="detail-header">⚡ Energie dnes</div>
          <div class="energy-grid">
            <div class="detail-row">
              <span class="icon">⬆️</span>
              <button class="clickable" @click=${A("computed_batt_charge_energy_today")}>
                Nab: ${Gt(t.batteryChargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">⬇️</span>
              <button class="clickable" @click=${A("computed_batt_discharge_energy_today")}>
                Vyb: ${Gt(t.batteryDischargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">☀️</span>
              <button class="clickable" @click=${A("computed_batt_charge_fve_energy_today")}>
                FVE: ${Gt(t.batteryChargeSolar)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">🔌</span>
              <button class="clickable" @click=${A("computed_batt_charge_grid_energy_today")}>
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
    `}getInverterModeDesc(){const t=this.data.inverterMode;return t.includes("Home 1")?"🏠 Home 1: Max baterie + FVE":t.includes("Home 2")?"🔋 Home 2: Šetří baterii":t.includes("Home 3")?"☀️ Home 3: Priorita nabíjení":t.includes("UPS")?"⚡ UPS: Vše ze sítě":`⚙️ ${t||"--"}`}renderInverter(){const t=this.data,i=Ts(t.inverterMode),e=t.bypassStatus.toLowerCase()==="on"||t.bypassStatus==="1",r=t.inverterTemp>35?"🔥":"🌡️",n=Ms(t.inverterGridMode),a=(t.inverterGridLimit/1e3).toFixed(1),s=fn(this.pendingServices,this.changingServices);let l="planner-unknown",c="Plánovač: N/A";return t.plannerAutoMode===!0?(l="planner-auto",c="Plánovač: AUTO"):t.plannerAutoMode===!1&&(l="planner-off",c="Plánovač: VYPNUTO"),d`
      <div class="${this.nodeClass("inverter",s.inverterModeChanging?"mode-changing":"")}" style="--node-gradient: ${Be.inverter}; --node-border: ${Fe.inverter};"
        @click=${u=>this.toggleExpand("inverter",u)}>
        <div class="node-header">
          <oig-inverter-icon
            .mode=${t.inverterMode}
            ?bypassActive=${e}
            ?hasAlarm=${t.notificationsError>0}
            ?plannerAuto=${t.plannerAutoMode===!0}
          ></oig-inverter-icon>
          <span class="node-label">Střídač</span>
        </div>
        ${e?d`
          <button class="bypass-active bypass-warning" style="position:absolute;top:4px;right:6px;font-size:9px" @click=${A("bypass_status")}>
            🔴 Bypass
          </button>
        `:I}

        <div class="node-value" @click=${A("box_prms_mode")}>
          ${s.inverterModeChanging?d`<span class="spinner spinner--small"></span>`:I}
          ${i.icon} ${i.text}
        </div>
        <div class="node-subvalue">${this.getInverterModeDesc()}</div>
        ${s.inverterModeText?d`<div class="pending-text">${s.inverterModeText}</div>`:I}

        <div class="planner-badge ${l}">${c}</div>
        <div class="shield-badge ${this.shieldStatus==="running"?"shield-running":"shield-idle"}">
          🛡️ ${this.shieldStatus==="running"?"Zpracovávám":"Nečinný"}${this.shieldQueueCount>0?d` <span class="shield-queue">(${this.shieldQueueCount})</span>`:I}
        </div>

        <div class="battery-indicators" style="margin-top:6px">
          <button class="indicator" @click=${A("box_temp")}>
            ${r} ${t.inverterTemp.toFixed(1)} °C
          </button>
          <button class="indicator ${e?"bypass-warning":""}" @click=${A("bypass_status")}>
            <span id="inverter-bypass-icon">${e?"🔴":"🟢"}</span> Bypass: ${e?"ON":"OFF"}
          </button>
        </div>

        <!-- Přetoky + notifikace — vždy viditelné -->
        <div class="battery-indicators" style="margin-top:4px">
          <button class="indicator" @click=${A("invertor_prms_to_grid")}>
            ${n.icon} ${n.display}
          </button>
          <button class="clickable notif-badge ${t.notificationsError>0?"has-error":t.notificationsUnread>0?"has-unread":"indicator"}"
            @click=${A("notification_count_unread")}>
            🔔 ${t.notificationsUnread}/${t.notificationsError}
          </button>
        </div>

        <div class="detail-section">
          <div class="detail-header">🌊 Přetoky — limit</div>
          <div class="detail-row">
            <button class="clickable" @click=${A("invertor_prm1_p_max_feed_grid")}>
              Limit: ${a} kW
            </button>
          </div>
        </div>
      </div>
    `}getGridStatus(){const t=this.data.gridPower;return t>10?{text:"⬇ Import",cls:"status-importing pulse"}:t<-10?{text:"⬆ Export",cls:"status-exporting pulse"}:{text:"◉ Žádný tok",cls:"status-idle"}}renderGrid(){const t=this.data,i=this.getGridStatus(),e=fn(this.pendingServices,this.changingServices);return d`
      <div class="${this.nodeClass("grid",e.gridExportChanging?"mode-changing":"")}" style="--node-gradient: ${Be.grid}; --node-border: ${Fe.grid};"
        @click=${r=>this.toggleExpand("grid",r)}>

        <!-- Tarif badge vlevo nahoře -->
        <button class="indicator" style="position:absolute;top:4px;left:6px;font-size:9px" @click=${A("current_tariff")}>
          ${Ps(t.currentTariff)}
        </button>
        <!-- Frekvence vpravo nahoře -->
        <button class="indicator" style="position:absolute;top:4px;right:6px;font-size:9px" @click=${A("ac_in_aci_f")}>
          ${t.gridFrequency.toFixed(1)} Hz
        </button>

        <!-- SVG ikona -->
        <div class="node-svg-icon" style="margin-top:14px">
          <oig-grid-icon .power=${t.gridPower} style="width:44px;height:44px"></oig-grid-icon>
        </div>
        <div class="node-label" style="margin-bottom:2px">Síť</div>

        <!-- Hlavní hodnota -->
        <div class="node-value" @click=${A("actual_aci_wtotal")}>
          ${Re(t.gridPower)}
        </div>
        <div class="node-status ${i.cls}">${i.text}</div>
        ${e.gridExportText?d`
          <div class="pending-text">
            <span class="spinner spinner--small"></span>
            ${e.gridExportText}
          </div>
        `:I}

        <!-- Ceny — vždy viditelné jako rychlý přehled -->
        <div class="prices-row" style="margin-top:4px">
          <div class="price-cell">
            <span class="price-label">⬇ Spot</span>
            <button class="price-val price-spot" @click=${A("spot_price_current_15min")}>
              ${t.spotPrice.toFixed(2)} Kč
            </button>
          </div>
          <div class="energy-divider-v"></div>
          <div class="price-cell">
            <span class="price-label">⬆ Výkup</span>
            <button class="price-val price-export" @click=${A("export_price_current_15min")}>
              ${t.exportPrice.toFixed(2)} Kč
            </button>
          </div>
        </div>

        <!-- 3 fáze — vždy viditelné -->
        <div class="phases-grid" style="margin-top:6px">
          <div class="phase-cell">
            <span class="phase-label">L1</span>
            <button class="phase-val" @click=${A("actual_aci_wr")}>${Math.round(t.gridL1P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${W(o.textSecondary)}" @click=${A("ac_in_aci_vr")}>${Math.round(t.gridL1V)}V</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L2</span>
            <button class="phase-val" @click=${A("actual_aci_ws")}>${Math.round(t.gridL2P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${W(o.textSecondary)}" @click=${A("ac_in_aci_vs")}>${Math.round(t.gridL2V)}V</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L3</span>
            <button class="phase-val" @click=${A("actual_aci_wt")}>${Math.round(t.gridL3P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${W(o.textSecondary)}" @click=${A("ac_in_aci_vt")}>${Math.round(t.gridL3V)}V</button>
          </div>
        </div>

        <div class="detail-section">
          <!-- Energie dnes — odběr vlevo, dodávka vpravo -->
          <div class="energy-symmetric">
            <div class="energy-side">
              <span class="energy-side-label">⬇ Odběr</span>
              <button class="energy-side-val energy-import" @click=${A("ac_in_ac_ad")}>
                ${Gt(t.gridImportToday)}
              </button>
            </div>
            <div class="energy-divider-v"></div>
            <div class="energy-side">
              <span class="energy-side-label">⬆ Dodávka</span>
              <button class="energy-side-val energy-export" @click=${A("ac_in_ac_pd")}>
                ${Gt(t.gridExportToday)}
              </button>
            </div>
          </div>

        </div>
      </div>
    `}renderHouse(){const t=this.data;return d`
      <div class="${this.nodeClass("house")}" style="--node-gradient: ${Be.house}; --node-border: ${Fe.house};"
        @click=${i=>this.toggleExpand("house",i)}>
        <div class="node-header">
          <oig-house-icon
            .power=${t.housePower}
            .maxPower=${t.boilerInstallPower>0?1e4:8e3}
            ?boilerActive=${t.boilerIsUse}
          ></oig-house-icon>
          <span class="node-label">Spotřeba</span>
        </div>

        <div class="node-value" @click=${A("actual_aco_p")}>
          ${Re(t.housePower)}
        </div>
        <div class="node-subvalue" @click=${A("ac_out_en_day")}>
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
              <button class="clickable" @click=${A("boiler_current_cbb_w")}>
                ${Re(t.boilerPower)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">📊</span>
              <span>Nabito:</span>
              <button class="clickable" @click=${A("boiler_day_w")}>
                ${Gt(t.boilerDayEnergy)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">${t.boilerManualMode==="CBB"?"🤖":t.boilerManualMode==="Manual"?"👤":"⚙️"}</span>
              <span>Režim:</span>
              <button class="clickable" @click=${A("boiler_manual_mode")}>
                ${t.boilerManualMode==="CBB"?"🤖 Inteligentní":t.boilerManualMode==="Manual"?"👤 Manuální":t.boilerManualMode||"--"}
              </button>
            </div>
          </div>
        `:I}
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
  `;It([p({type:Object})],kt.prototype,"data",2);It([p({type:Boolean})],kt.prototype,"editMode",2);It([x()],kt.prototype,"pendingServices",2);It([x()],kt.prototype,"changingServices",2);It([x()],kt.prototype,"shieldStatus",2);It([x()],kt.prototype,"shieldQueueCount",2);It([x()],kt.prototype,"expandedNodes",2);It([x()],kt.prototype,"customPositions",2);kt=It([E("oig-flow-node")],kt);var al=Object.defineProperty,sl=Object.getOwnPropertyDescriptor,se=(t,i,e,r)=>{for(var n=r>1?void 0:r?sl(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&al(i,e,n),n};function ol(t,i){return{fromColor:qr[t]||"#9e9e9e",toColor:qr[i]||"#9e9e9e"}}const ll=Z;let zt=class extends M{constructor(){super(...arguments),this.data=vr,this.particlesEnabled=!0,this.active=!0,this.editMode=!1,this.lines=[],this.animationId=null,this.lastSpawnTime={},this.particleCount=0,this.MAX_PARTICLES=50,this.onVisibilityChange=()=>{this.updateAnimationState()},this.onLayoutChanged=()=>{this.drawConnectionsDeferred()}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this.onVisibilityChange),this.addEventListener("layout-changed",this.onLayoutChanged)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this.onVisibilityChange),this.removeEventListener("layout-changed",this.onLayoutChanged),this.stopAnimation()}updated(t){t.has("data")&&(this.updateLines(),this.animationId!==null&&this.spawnParticles()),(t.has("active")||t.has("particlesEnabled"))&&this.updateAnimationState(),this.drawConnectionsDeferred()}firstUpdated(){this.updateLines(),this.updateAnimationState(),new ResizeObserver(()=>this.drawConnectionsDeferred()).observe(this)}drawConnectionsDeferred(){requestAnimationFrame(()=>this.drawConnectionsSVG())}getParticlesLayer(){var t;return(t=this.renderRoot)==null?void 0:t.querySelector(".particles-layer")}getGridMetrics(){var a,s;const t=(a=this.renderRoot)==null?void 0:a.querySelector("oig-flow-node");if(!t)return null;const e=(t.renderRoot||t.shadowRoot||t).querySelector(".flow-grid");if(!e)return null;const r=(s=this.renderRoot)==null?void 0:s.querySelector(".canvas-container");if(!r)return null;const n=e.getBoundingClientRect();return n.width===0||n.height===0?null:{grid:e,gridRect:n,canvasRect:r.getBoundingClientRect()}}positionOverlayLayer(t,i,e){const r=i.left-e.left,n=i.top-e.top;t.style.left=`${r}px`,t.style.top=`${n}px`,t.style.width=`${i.width}px`,t.style.height=`${i.height}px`}updateLines(){const t=this.data,i=[],e=t.solarPower>50;i.push({id:"solar-inverter",from:"solar",to:"inverter",color:de.solar,power:e?t.solarPower:0,params:e?xi(t.solarPower,vi.solar,"solar"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:e});const r=Math.abs(t.batteryPower)>50,n=t.batteryPower>0;i.push({id:"battery-inverter",from:r&&n?"inverter":"battery",to:r&&n?"battery":"inverter",color:de.battery,power:r?Math.abs(t.batteryPower):0,params:r?xi(t.batteryPower,vi.battery,"battery"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:r});const a=Math.abs(t.gridPower)>50,s=t.gridPower>0;i.push({id:"grid-inverter",from:a?s?"grid":"inverter":"grid",to:a?s?"inverter":"grid":"inverter",color:a?s?de.grid_import:de.grid_export:de.grid_import,power:a?Math.abs(t.gridPower):0,params:a?xi(t.gridPower,vi.grid,"grid"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:a});const l=t.housePower>50;i.push({id:"inverter-house",from:"inverter",to:"house",color:de.house,power:l?t.housePower:0,params:l?xi(t.housePower,vi.house,"house"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:l}),this.lines=i}calcEdgePoint(t,i,e,r){const n=i.x-t.x,a=i.y-t.y;if(n===0&&a===0)return{...t};const s=Math.abs(n),l=Math.abs(a),c=s*r>l*e?e/s:r/l;return{x:t.x+n*c,y:t.y+a*c}}getNodeInfo(t,i,e){const r=t.querySelector(`.node-${e}`);if(!r)return null;const n=r.getBoundingClientRect();return{x:n.left+n.width/2-i.left,y:n.top+n.height/2-i.top,hw:n.width/2,hh:n.height/2}}drawConnectionsSVG(){const t=this.svgEl;if(!t)return;const i=this.getGridMetrics();if(!i)return;const{grid:e,gridRect:r,canvasRect:n}=i;this.positionOverlayLayer(t,r,n),t.setAttribute("viewBox",`0 0 ${r.width} ${r.height}`);const a=this.getParticlesLayer();a&&this.positionOverlayLayer(a,r,n),t.innerHTML="";const s="http://www.w3.org/2000/svg",l=document.createElementNS(s,"defs"),c=document.createElementNS(s,"filter");c.setAttribute("id","neon-glow"),c.setAttribute("x","-50%"),c.setAttribute("y","-50%"),c.setAttribute("width","200%"),c.setAttribute("height","200%");const u=document.createElementNS(s,"feGaussianBlur");u.setAttribute("in","SourceGraphic"),u.setAttribute("stdDeviation","3"),u.setAttribute("result","blur"),c.appendChild(u);const h=document.createElementNS(s,"feMerge"),f=document.createElementNS(s,"feMergeNode");f.setAttribute("in","blur"),h.appendChild(f);const w=document.createElementNS(s,"feMergeNode");w.setAttribute("in","SourceGraphic"),h.appendChild(w),c.appendChild(h),l.appendChild(c),t.appendChild(l);for(const m of this.lines){const y=this.getNodeInfo(e,r,m.from),g=this.getNodeInfo(e,r,m.to);if(!y||!g)continue;const k={x:y.x,y:y.y},C={x:g.x,y:g.y},$=this.calcEdgePoint(k,C,y.hw,y.hh),S=this.calcEdgePoint(C,k,g.hw,g.hh),Y=S.x-$.x,K=S.y-$.y,v=Math.sqrt(Y*Y+K*K),H=Math.min(v*.2,40),z=-K/v,O=Y/v,V=($.x+S.x)/2,Q=($.y+S.y)/2,U=V+z*H,xt=Q+O*H,qt=`grad-${m.id}`,{fromColor:Ji,toColor:tr}=ol(m.from,m.to),Ct=document.createElementNS(s,"linearGradient");Ct.setAttribute("id",qt),Ct.setAttribute("x1","0%"),Ct.setAttribute("y1","0%"),Ct.setAttribute("x2","100%"),Ct.setAttribute("y2","0%");const Ie=document.createElementNS(s,"stop");Ie.setAttribute("offset","0%"),Ie.setAttribute("stop-color",Ji);const Ae=document.createElementNS(s,"stop");Ae.setAttribute("offset","100%"),Ae.setAttribute("stop-color",tr),Ct.appendChild(Ie),Ct.appendChild(Ae),l.appendChild(Ct);const yt=document.createElementNS(s,"path");if(yt.setAttribute("d",`M ${$.x} ${$.y} Q ${U} ${xt} ${S.x} ${S.y}`),yt.setAttribute("stroke",`url(#${qt})`),yt.setAttribute("stroke-width","3"),yt.setAttribute("stroke-linecap","round"),yt.setAttribute("fill","none"),yt.setAttribute("opacity",m.active?"0.8":"0.18"),m.active&&yt.setAttribute("filter","url(#neon-glow)"),yt.classList.add("flow-line"),m.active||yt.classList.add("flow-line--inactive"),t.appendChild(yt),m.params.active){const Vt=document.createElementNS(s,"polygon");Vt.setAttribute("points",`0,-6 ${6*1.2},0 0,6`),Vt.setAttribute("fill",m.color),Vt.setAttribute("opacity","0.9");const Yt=document.createElementNS(s,"animateMotion");Yt.setAttribute("dur",`${Math.max(1,m.params.speed/1e3)}s`),Yt.setAttribute("repeatCount","indefinite"),Yt.setAttribute("path",`M ${$.x} ${$.y} Q ${U} ${xt} ${S.x} ${S.y}`),Yt.setAttribute("rotate","auto"),Vt.appendChild(Yt),t.appendChild(Vt)}}}updateAnimationState(){this.particlesEnabled&&this.active&&!document.hidden&&!vt.reduceMotion?(this.spawnParticles(),this.startAnimation()):this.stopAnimation()}startAnimation(){if(this.animationId!==null)return;const t=()=>{this.spawnParticles(),this.animationId=requestAnimationFrame(t)};this.animationId=requestAnimationFrame(t)}stopAnimation(){this.animationId!==null&&(cancelAnimationFrame(this.animationId),this.animationId=null)}spawnParticles(){if(this.particleCount>=this.MAX_PARTICLES)return;const t=this.getParticlesLayer();if(!t)return;const i=this.getGridMetrics();if(!i)return;const{grid:e,gridRect:r,canvasRect:n}=i;this.positionOverlayLayer(t,r,n);const a=performance.now();for(const s of this.lines){if(!s.params.active)continue;const l=s.params.speed,c=this.lastSpawnTime[s.id]||0;if(a-c<l)continue;const u=this.getNodeInfo(e,r,s.from),h=this.getNodeInfo(e,r,s.to);if(!u||!h)continue;const f={x:u.x,y:u.y},w={x:h.x,y:h.y},m=this.calcEdgePoint(f,w,u.hw,u.hh),y=this.calcEdgePoint(w,f,h.hw,h.hh);this.lastSpawnTime[s.id]=a;const g=s.params.count;for(let k=0;k<g&&!(this.particleCount>=this.MAX_PARTICLES);k++)this.createParticle(t,m,y,s.color,s.params,k*(s.params.speed/g/2))}}createParticle(t,i,e,r,n,a){const s=document.createElement("div");s.className="particle";const l=n.size;s.style.width=`${l}px`,s.style.height=`${l}px`,s.style.background=r,s.style.left=`${i.x}px`,s.style.top=`${i.y}px`,s.style.boxShadow=`0 0 ${l}px ${r}`,s.style.opacity="0",t.appendChild(s),this.particleCount++;const c=n.speed;setTimeout(()=>{let u=!1;const h=()=>{u||(u=!0,s.isConnected&&s.remove(),this.particleCount=Math.max(0,this.particleCount-1))};if(typeof s.animate=="function"){const f=s.animate([{left:`${i.x}px`,top:`${i.y}px`,opacity:0,offset:0},{opacity:n.opacity,offset:.1},{opacity:n.opacity,offset:.9},{left:`${e.x}px`,top:`${e.y}px`,opacity:0,offset:1}],{duration:c,easing:"linear"});f.onfinish=h,f.oncancel=h}else s.style.transition=`left ${c}ms linear, top ${c}ms linear, opacity ${c}ms linear`,s.style.opacity=`${n.opacity}`,requestAnimationFrame(()=>{s.style.left=`${e.x}px`,s.style.top=`${e.y}px`,s.style.opacity="0"}),s.addEventListener("transitionend",h,{once:!0}),window.setTimeout(h,c+50)},a)}render(){return d`
      <div class="canvas-container">
        <div class="flow-grid-wrapper">
          <oig-flow-node .data=${this.data} .editMode=${this.editMode}></oig-flow-node>
        </div>

        <svg class="connections-layer"></svg>

        <div class="particles-layer"></div>
      </div>
    `}resetLayout(){var i;const t=(i=this.shadowRoot)==null?void 0:i.querySelector("oig-flow-node");t!=null&&t.resetLayout&&t.resetLayout()}};zt.styles=P`
    :host {
      display: block;
      position: relative;
      width: 100%;
      background: ${ll(o.bgSecondary)};
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
  `;se([p({type:Object})],zt.prototype,"data",2);se([p({type:Boolean})],zt.prototype,"particlesEnabled",2);se([p({type:Boolean})],zt.prototype,"active",2);se([p({type:Boolean})],zt.prototype,"editMode",2);se([x()],zt.prototype,"lines",2);se([Gi(".connections-layer")],zt.prototype,"svgEl",2);zt=se([E("oig-flow-canvas")],zt);var cl=Object.defineProperty,dl=Object.getOwnPropertyDescriptor,$r=(t,i,e,r)=>{for(var n=r>1?void 0:r?dl(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&cl(i,e,n),n};const wt=Z;let Je=class extends M{constructor(){super(...arguments),this.data=null,this.open=!1,this.onKeyDown=t=>{t.key==="Escape"&&this.hide()}}show(){this.open=!0}hide(){this.open=!1}onOverlayClick(t){t.target===t.currentTarget&&this.hide()}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onKeyDown),this.addEventListener("oig-grid-charging-open",()=>this.show())}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onKeyDown)}formatTime(t){const i=t.time_from??"--:--",e=t.time_to??"--:--";return`${i} – ${e}`}isBlockActive(t){if(!t.time_from||!t.time_to)return!1;const i=new Date,e=i.toISOString().slice(0,10);if(t.day==="tomorrow")return!1;const r=`${e}T${t.time_from}`,n=`${e}T${t.time_to}`,a=new Date(r),s=new Date(n);return i>=a&&i<s}renderEmpty(){return d`
      <div class="empty-state">
        <div class="empty-icon">🔌</div>
        <div class="empty-text">Žádné plánované nabíjení</div>
        <div class="empty-sub">Plán nabíjení ze sítě není aktivní.</div>
      </div>
    `}renderContent(){const t=this.data;if(!t)return this.renderEmpty();const i=t.blocks.find(e=>this.isBlockActive(e));return d`
      ${t.hasBlocks?d`
        <!-- Summary chips -->
        <div class="summary-row">
          ${t.totalEnergyKwh>0?d`
            <span class="summary-chip energy">⚡ ${t.totalEnergyKwh.toFixed(1)} kWh</span>
          `:I}
          ${t.totalCostCzk>0?d`
            <span class="summary-chip cost">💰 ~${t.totalCostCzk.toFixed(0)} Kč</span>
          `:I}
          ${t.windowLabel?d`
            <span class="summary-chip time">🪟 ${t.windowLabel}</span>
          `:I}
          ${t.durationMinutes>0?d`
            <span class="summary-chip time">⏱️ ${Math.round(t.durationMinutes)} min</span>
          `:I}
        </div>

        <!-- Active block banner -->
        ${i?d`
          <div class="active-block-banner">
            <div class="pulse-dot"></div>
            <span>Probíhá: ${this.formatTime(i)}
              ${i.grid_charge_kwh!=null?` · ${i.grid_charge_kwh.toFixed(1)} kWh`:I}
            </span>
          </div>
        `:I}

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
            ${t.blocks.map((e,r)=>{const n=this.isBlockActive(e);return d`
                <tr class="${n?"is-active":!n&&r===0&&!i?"is-next":""}">
                  <td>${this.formatTime(e)}</td>
                  <td>
                    ${e.day?d`
                      <span class="day-badge ${e.day}">${e.day==="today"?"dnes":"zítra"}</span>
                    `:I}
                  </td>
                  <td>${e.grid_charge_kwh!=null?e.grid_charge_kwh.toFixed(1):"--"}</td>
                  <td>${e.total_cost_czk!=null?`${e.total_cost_czk.toFixed(0)} Kč`:"--"}</td>
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
              `:I}
            </div>
            <button class="close-btn" @click=${()=>this.hide()} aria-label="Zavřít">✕</button>
          </div>
          <div class="dialog-body">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `:I}};Je.styles=P`
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
  `;$r([p({type:Object})],Je.prototype,"data",2);$r([x()],Je.prototype,"open",2);Je=$r([E("oig-grid-charging-dialog")],Je);var ul=Object.defineProperty,pl=Object.getOwnPropertyDescriptor,dt=(t,i,e,r)=>{for(var n=r>1?void 0:r?pl(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&ul(i,e,n),n};const tt=Z;Ui.register(Mn,En,On,Dn,zn,In,An);let Ft=class extends M{constructor(){super(...arguments),this.values=[],this.color="rgba(76, 175, 80, 1)",this.startTime="",this.endTime="",this.chart=null,this.lastDataKey="",this.initializing=!1}render(){return d`<canvas></canvas>`}firstUpdated(){this.values.length>0&&(this.initializing=!0,requestAnimationFrame(()=>{this.createSparkline(),this.initializing=!1}))}updated(t){this.initializing||(t.has("values")||t.has("color"))&&this.updateOrCreateSparkline()}disconnectedCallback(){super.disconnectedCallback(),this.destroyChart()}updateOrCreateSparkline(){var i,e,r,n;if(!this.canvas||this.values.length===0)return;const t=JSON.stringify({v:this.values,c:this.color});if(!(t===this.lastDataKey&&this.chart)){if(this.lastDataKey=t,(r=(e=(i=this.chart)==null?void 0:i.data)==null?void 0:e.datasets)!=null&&r[0]){const a=this.chart.data.datasets[0];if(!((((n=this.chart.data.labels)==null?void 0:n.length)||0)!==this.values.length)){a.data=this.values,a.borderColor=this.color,a.backgroundColor=this.color.replace("1)","0.2)"),this.chart.update("none");return}}this.destroyChart(),this.createSparkline()}}createSparkline(){if(!this.canvas||this.values.length===0)return;this.destroyChart();const t=this.color,i=this.values,e=new Date(this.startTime),r=i.map((n,a)=>new Date(e.getTime()+a*15*60*1e3).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}));this.chart=new Ui(this.canvas,{type:"line",data:{labels:r,datasets:[{data:i,borderColor:t,backgroundColor:t.replace("1)","0.2)"),borderWidth:2,fill:!0,tension:.3,pointRadius:0,pointHoverRadius:5}]},plugins:[],options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:0},plugins:{legend:{display:!1},tooltip:{enabled:!0,backgroundColor:"rgba(0, 0, 0, 0.8)",titleColor:"#fff",bodyColor:"#fff",padding:8,displayColors:!1,callbacks:{title:n=>{var a;return((a=n[0])==null?void 0:a.label)||""},label:n=>`${n.parsed.y.toFixed(2)} Kč/kWh`}},datalabels:{display:!1},zoom:{pan:{enabled:!0,mode:"x",modifierKey:"shift"},zoom:{wheel:{enabled:!0,speed:.1},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)"},mode:"x"}}},scales:{x:{display:!1},y:{display:!0,position:"right",grace:"10%",ticks:{color:"rgba(255, 255, 255, 0.6)",font:{size:8},callback:n=>Number(n).toFixed(1),maxTicksLimit:3},grid:{display:!1}}},layout:{padding:0},interaction:{mode:"nearest",intersect:!1}}})}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}};Ft.styles=P`
    :host {
      display: block;
      width: 100%;
      height: 30px;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `;dt([p({type:Array})],Ft.prototype,"values",2);dt([p({type:String})],Ft.prototype,"color",2);dt([p({type:String})],Ft.prototype,"startTime",2);dt([p({type:String})],Ft.prototype,"endTime",2);dt([Gi("canvas")],Ft.prototype,"canvas",2);Ft=dt([E("oig-mini-sparkline")],Ft);let gt=class extends M{constructor(){super(...arguments),this.title="",this.time="",this.valueText="",this.value=0,this.unit="Kč/kWh",this.variant="default",this.clickable=!1,this.startTime="",this.endTime="",this.sparklineValues=[],this.sparklineColor="rgba(76, 175, 80, 1)",this.handleClick=()=>{this.clickable&&this.dispatchEvent(new CustomEvent("card-click",{detail:{startTime:this.startTime,endTime:this.endTime,value:this.value},bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),this.clickable&&this.addEventListener("click",this.handleClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleClick)}render(){const t=this.valueText||`${this.value.toFixed(2)} <span class="stat-unit">${this.unit}</span>`;return d`
      <div class="card-title">${this.title}</div>
      <div class="card-value ${this.variant}" .innerHTML=${t}></div>
      ${this.time?d`<div class="card-time">${this.time}</div>`:I}
      ${this.sparklineValues.length>0?d`
            <div class="sparkline-container">
              <oig-mini-sparkline
                .values=${this.sparklineValues}
                .color=${this.sparklineColor}
                .startTime=${this.startTime}
                .endTime=${this.endTime}
              ></oig-mini-sparkline>
            </div>
          `:I}
    `}};gt.styles=P`
    :host {
      display: block;
      background: ${tt(o.cardBg)};
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: ${tt(o.cardShadow)};
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
      color: ${tt(o.textSecondary)};
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 700;
      color: ${tt(o.textPrimary)};
      line-height: 1.2;
    }

    .card-value .stat-unit {
      font-size: 12px;
      font-weight: 400;
      color: ${tt(o.textSecondary)};
    }

    .card-value.success { color: #4CAF50; }
    .card-value.warning { color: #FFA726; }
    .card-value.danger { color: #F44336; }
    .card-value.info { color: #29B6F6; }

    .card-time {
      font-size: 10px;
      color: ${tt(o.textSecondary)};
      margin-top: 4px;
    }

    .sparkline-container {
      margin-top: 8px;
    }
  `;dt([p({type:String})],gt.prototype,"title",2);dt([p({type:String})],gt.prototype,"time",2);dt([p({type:String})],gt.prototype,"valueText",2);dt([p({type:Number})],gt.prototype,"value",2);dt([p({type:String})],gt.prototype,"unit",2);dt([p({type:String})],gt.prototype,"variant",2);dt([p({type:Boolean})],gt.prototype,"clickable",2);dt([p({type:String})],gt.prototype,"startTime",2);dt([p({type:String})],gt.prototype,"endTime",2);dt([p({type:Array})],gt.prototype,"sparklineValues",2);dt([p({type:String})],gt.prototype,"sparklineColor",2);gt=dt([E("oig-stats-card")],gt);function hl(t){const i=new Date(t.start),e=new Date(t.end),r=i.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit"}),n=i.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}),a=e.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"});return`${r} ${n} - ${a}`}let ti=class extends M{constructor(){super(...arguments),this.data=null,this.topOnly=!1}onCardClick(t){this.dispatchEvent(new CustomEvent("zoom-to-block",{detail:t.detail,bubbles:!0,composed:!0}))}renderPriceTiles(){if(!this.data)return I;const t=this.data.solarForecastTotal>0;return d`
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
    `}renderBlockCard(t,i,e,r){return i?d`
      <oig-stats-card
        title=${t}
        .value=${i.avg}
        unit="Kč/kWh"
        .time=${hl(i)}
        variant=${e}
        clickable
        .startTime=${i.start}
        .endTime=${i.end}
        .sparklineValues=${i.values}
        .sparklineColor=${r}
        @card-click=${this.onCardClick}
      ></oig-stats-card>
    `:I}renderExtremeBlocks(){if(!this.data)return I;const{cheapestBuyBlock:t,expensiveBuyBlock:i,bestExportBlock:e,worstExportBlock:r}=this.data;return d`
      ${this.renderBlockCard("Nejlevnější nákup",t,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejdražší nákup",i,"danger","rgba(244, 67, 54, 1)")}
      ${this.renderBlockCard("Nejlepší výkup",e,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejhorší výkup",r,"warning","rgba(255, 167, 38, 1)")}
    `}renderPlannedConsumption(){var s;const t=(s=this.data)==null?void 0:s.plannedConsumption;if(!t)return I;const i=t.todayTotalKwh,e=t.tomorrowKwh,r=i+(e||0),n=r>0?i/r*100:50,a=r>0?(e||0)/r*100:50;return d`
      <div class="planned-section">
        <div class="section-label" style="margin-bottom: 8px;">Plánovaná spotřeba</div>
        <div class="planned-header">
          <div>
            <div class="planned-main-value">
              ${t.totalPlannedKwh>0?d`${t.totalPlannedKwh.toFixed(1)} <span class="unit">kWh</span>`:"--"}
            </div>
            <div class="planned-profile">${t.profile}</div>
          </div>
          ${t.trendText?d`<div class="planned-trend">${t.trendText}</div>`:I}
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
              ${e!=null?`${e.toFixed(1)} kWh`:"--"}
            </div>
          </div>
        </div>

        ${r>0?d`
              <div class="planned-bars">
                <div class="bar-today" style="width: ${n}%"></div>
                <div class="bar-tomorrow" style="width: ${a}%"></div>
              </div>
              <div class="bar-labels">
                <span>Dnes: ${i.toFixed(1)}</span>
                <span>Zítra: ${e!=null?e.toFixed(1):"--"}</span>
              </div>
            `:I}
      </div>
    `}render(){return!this.data||this.data.timeline.length===0?this.topOnly?I:d`<div style="color: ${o.textSecondary}; padding: 16px;">Načítání cenových dat...</div>`:this.topOnly?d`
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
      background: ${tt(o.cardBg)};
      border-radius: 10px;
      padding: 10px 12px;
      box-shadow: ${tt(o.cardShadow)};
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 76px;
    }

    .price-tile.spot {
      background: linear-gradient(135deg, ${tt(o.accent)}22 0%, ${tt(o.accent)}11 100%);
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
      color: ${tt(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .price-tile-value {
      font-size: 16px;
      font-weight: 700;
      color: ${tt(o.textPrimary)};
      line-height: 1.2;
    }

    .price-tile-unit {
      font-size: 10px;
      font-weight: 400;
      color: ${tt(o.textSecondary)};
      opacity: 0.7;
    }

    .price-tile-sub {
      font-size: 9px;
      color: ${tt(o.textSecondary)};
      opacity: 0.55;
      margin-top: 3px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: ${tt(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    /* Planned consumption */
    .planned-section {
      background: ${tt(o.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: ${tt(o.cardShadow)};
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
      color: ${tt(o.textPrimary)};
    }

    .planned-main-value .unit {
      font-size: 12px;
      font-weight: 400;
      color: ${tt(o.textSecondary)};
    }

    .planned-trend {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
    }

    .planned-profile {
      font-size: 11px;
      color: ${tt(o.textSecondary)};
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
      color: ${tt(o.textSecondary)};
      text-transform: uppercase;
    }

    .planned-detail-value {
      font-size: 14px;
      font-weight: 600;
      color: ${tt(o.textPrimary)};
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
      color: ${tt(o.textSecondary)};
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
  `;dt([p({type:Object})],ti.prototype,"data",2);dt([p({type:Boolean})],ti.prototype,"topOnly",2);ti=dt([E("oig-pricing-stats")],ti);const Xn=6048e5,gl=864e5,gi=6e4,fi=36e5,fl=1e3,bn=Symbol.for("constructDateFrom");function st(t,i){return typeof t=="function"?t(i):t&&typeof t=="object"&&bn in t?t[bn](i):t instanceof Date?new t.constructor(i):new Date(i)}function L(t,i){return st(i||t,t)}function Xi(t,i,e){const r=L(t,e==null?void 0:e.in);return isNaN(i)?st((e==null?void 0:e.in)||t,NaN):(i&&r.setDate(r.getDate()+i),r)}function _r(t,i,e){const r=L(t,e==null?void 0:e.in);if(isNaN(i))return st(t,NaN);if(!i)return r;const n=r.getDate(),a=st(t,r.getTime());a.setMonth(r.getMonth()+i+1,0);const s=a.getDate();return n>=s?a:(r.setFullYear(a.getFullYear(),a.getMonth(),n),r)}function kr(t,i,e){return st(t,+L(t)+i)}function ml(t,i,e){return kr(t,i*fi)}let bl={};function oe(){return bl}function Ot(t,i){var l,c,u,h;const e=oe(),r=(i==null?void 0:i.weekStartsOn)??((c=(l=i==null?void 0:i.locale)==null?void 0:l.options)==null?void 0:c.weekStartsOn)??e.weekStartsOn??((h=(u=e.locale)==null?void 0:u.options)==null?void 0:h.weekStartsOn)??0,n=L(t,i==null?void 0:i.in),a=n.getDay(),s=(a<r?7:0)+a-r;return n.setDate(n.getDate()-s),n.setHours(0,0,0,0),n}function ke(t,i){return Ot(t,{...i,weekStartsOn:1})}function Jn(t,i){const e=L(t,i==null?void 0:i.in),r=e.getFullYear(),n=st(e,0);n.setFullYear(r+1,0,4),n.setHours(0,0,0,0);const a=ke(n),s=st(e,0);s.setFullYear(r,0,4),s.setHours(0,0,0,0);const l=ke(s);return e.getTime()>=a.getTime()?r+1:e.getTime()>=l.getTime()?r:r-1}function Oi(t){const i=L(t),e=new Date(Date.UTC(i.getFullYear(),i.getMonth(),i.getDate(),i.getHours(),i.getMinutes(),i.getSeconds(),i.getMilliseconds()));return e.setUTCFullYear(i.getFullYear()),+t-+e}function le(t,...i){const e=st.bind(null,i.find(r=>typeof r=="object"));return i.map(e)}function mr(t,i){const e=L(t,i==null?void 0:i.in);return e.setHours(0,0,0,0),e}function ta(t,i,e){const[r,n]=le(e==null?void 0:e.in,t,i),a=mr(r),s=mr(n),l=+a-Oi(a),c=+s-Oi(s);return Math.round((l-c)/gl)}function yl(t,i){const e=Jn(t,i),r=st(t,0);return r.setFullYear(e,0,4),r.setHours(0,0,0,0),ke(r)}function vl(t,i,e){const r=L(t,e==null?void 0:e.in);return r.setTime(r.getTime()+i*gi),r}function xl(t,i,e){return _r(t,i*3,e)}function wl(t,i,e){return kr(t,i*1e3)}function $l(t,i,e){return Xi(t,i*7,e)}function _l(t,i,e){return _r(t,i*12,e)}function Ke(t,i){const e=+L(t)-+L(i);return e<0?-1:e>0?1:e}function kl(t){return t instanceof Date||typeof t=="object"&&Object.prototype.toString.call(t)==="[object Date]"}function ea(t){return!(!kl(t)&&typeof t!="number"||isNaN(+L(t)))}function Sl(t,i,e){const[r,n]=le(e==null?void 0:e.in,t,i),a=r.getFullYear()-n.getFullYear(),s=r.getMonth()-n.getMonth();return a*12+s}function Cl(t,i,e){const[r,n]=le(e==null?void 0:e.in,t,i);return r.getFullYear()-n.getFullYear()}function ia(t,i,e){const[r,n]=le(e==null?void 0:e.in,t,i),a=yn(r,n),s=Math.abs(ta(r,n));r.setDate(r.getDate()-a*s);const l=+(yn(r,n)===-a),c=a*(s-l);return c===0?0:c}function yn(t,i){const e=t.getFullYear()-i.getFullYear()||t.getMonth()-i.getMonth()||t.getDate()-i.getDate()||t.getHours()-i.getHours()||t.getMinutes()-i.getMinutes()||t.getSeconds()-i.getSeconds()||t.getMilliseconds()-i.getMilliseconds();return e<0?-1:e>0?1:e}function mi(t){return i=>{const r=(t?Math[t]:Math.trunc)(i);return r===0?0:r}}function Pl(t,i,e){const[r,n]=le(e==null?void 0:e.in,t,i),a=(+r-+n)/fi;return mi(e==null?void 0:e.roundingMethod)(a)}function Sr(t,i){return+L(t)-+L(i)}function Tl(t,i,e){const r=Sr(t,i)/gi;return mi(e==null?void 0:e.roundingMethod)(r)}function ra(t,i){const e=L(t,i==null?void 0:i.in);return e.setHours(23,59,59,999),e}function na(t,i){const e=L(t,i==null?void 0:i.in),r=e.getMonth();return e.setFullYear(e.getFullYear(),r+1,0),e.setHours(23,59,59,999),e}function Ml(t,i){const e=L(t,i==null?void 0:i.in);return+ra(e,i)==+na(e,i)}function aa(t,i,e){const[r,n,a]=le(e==null?void 0:e.in,t,t,i),s=Ke(n,a),l=Math.abs(Sl(n,a));if(l<1)return 0;n.getMonth()===1&&n.getDate()>27&&n.setDate(30),n.setMonth(n.getMonth()-s*l);let c=Ke(n,a)===-s;Ml(r)&&l===1&&Ke(r,a)===1&&(c=!1);const u=s*(l-+c);return u===0?0:u}function El(t,i,e){const r=aa(t,i,e)/3;return mi(e==null?void 0:e.roundingMethod)(r)}function Ol(t,i,e){const r=Sr(t,i)/1e3;return mi(e==null?void 0:e.roundingMethod)(r)}function Dl(t,i,e){const r=ia(t,i,e)/7;return mi(e==null?void 0:e.roundingMethod)(r)}function zl(t,i,e){const[r,n]=le(e==null?void 0:e.in,t,i),a=Ke(r,n),s=Math.abs(Cl(r,n));r.setFullYear(1584),n.setFullYear(1584);const l=Ke(r,n)===-a,c=a*(s-+l);return c===0?0:c}function Il(t,i){const e=L(t,i==null?void 0:i.in),r=e.getMonth(),n=r-r%3;return e.setMonth(n,1),e.setHours(0,0,0,0),e}function Al(t,i){const e=L(t,i==null?void 0:i.in);return e.setDate(1),e.setHours(0,0,0,0),e}function Ll(t,i){const e=L(t,i==null?void 0:i.in),r=e.getFullYear();return e.setFullYear(r+1,0,0),e.setHours(23,59,59,999),e}function sa(t,i){const e=L(t,i==null?void 0:i.in);return e.setFullYear(e.getFullYear(),0,1),e.setHours(0,0,0,0),e}function Bl(t,i){const e=L(t,i==null?void 0:i.in);return e.setMinutes(59,59,999),e}function Fl(t,i){var l,c;const e=oe(),r=e.weekStartsOn??((c=(l=e.locale)==null?void 0:l.options)==null?void 0:c.weekStartsOn)??0,n=L(t,i==null?void 0:i.in),a=n.getDay(),s=(a<r?-7:0)+6-(a-r);return n.setDate(n.getDate()+s),n.setHours(23,59,59,999),n}function Nl(t,i){const e=L(t,i==null?void 0:i.in);return e.setSeconds(59,999),e}function Rl(t,i){const e=L(t,i==null?void 0:i.in),r=e.getMonth(),n=r-r%3+3;return e.setMonth(n,0),e.setHours(23,59,59,999),e}function Hl(t,i){const e=L(t,i==null?void 0:i.in);return e.setMilliseconds(999),e}const Wl={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},jl=(t,i,e)=>{let r;const n=Wl[t];return typeof n=="string"?r=n:i===1?r=n.one:r=n.other.replace("{{count}}",i.toString()),e!=null&&e.addSuffix?e.comparison&&e.comparison>0?"in "+r:r+" ago":r};function or(t){return(i={})=>{const e=i.width?String(i.width):t.defaultWidth;return t.formats[e]||t.formats[t.defaultWidth]}}const ql={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},Vl={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},Yl={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},Ul={date:or({formats:ql,defaultWidth:"full"}),time:or({formats:Vl,defaultWidth:"full"}),dateTime:or({formats:Yl,defaultWidth:"full"})},Gl={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},Kl=(t,i,e,r)=>Gl[t];function qe(t){return(i,e)=>{const r=e!=null&&e.context?String(e.context):"standalone";let n;if(r==="formatting"&&t.formattingValues){const s=t.defaultFormattingWidth||t.defaultWidth,l=e!=null&&e.width?String(e.width):s;n=t.formattingValues[l]||t.formattingValues[s]}else{const s=t.defaultWidth,l=e!=null&&e.width?String(e.width):t.defaultWidth;n=t.values[l]||t.values[s]}const a=t.argumentCallback?t.argumentCallback(i):i;return n[a]}}const Zl={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},Ql={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},Xl={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},Jl={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},tc={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},ec={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},ic=(t,i)=>{const e=Number(t),r=e%100;if(r>20||r<10)switch(r%10){case 1:return e+"st";case 2:return e+"nd";case 3:return e+"rd"}return e+"th"},rc={ordinalNumber:ic,era:qe({values:Zl,defaultWidth:"wide"}),quarter:qe({values:Ql,defaultWidth:"wide",argumentCallback:t=>t-1}),month:qe({values:Xl,defaultWidth:"wide"}),day:qe({values:Jl,defaultWidth:"wide"}),dayPeriod:qe({values:tc,defaultWidth:"wide",formattingValues:ec,defaultFormattingWidth:"wide"})};function Ve(t){return(i,e={})=>{const r=e.width,n=r&&t.matchPatterns[r]||t.matchPatterns[t.defaultMatchWidth],a=i.match(n);if(!a)return null;const s=a[0],l=r&&t.parsePatterns[r]||t.parsePatterns[t.defaultParseWidth],c=Array.isArray(l)?ac(l,f=>f.test(s)):nc(l,f=>f.test(s));let u;u=t.valueCallback?t.valueCallback(c):c,u=e.valueCallback?e.valueCallback(u):u;const h=i.slice(s.length);return{value:u,rest:h}}}function nc(t,i){for(const e in t)if(Object.prototype.hasOwnProperty.call(t,e)&&i(t[e]))return e}function ac(t,i){for(let e=0;e<t.length;e++)if(i(t[e]))return e}function sc(t){return(i,e={})=>{const r=i.match(t.matchPattern);if(!r)return null;const n=r[0],a=i.match(t.parsePattern);if(!a)return null;let s=t.valueCallback?t.valueCallback(a[0]):a[0];s=e.valueCallback?e.valueCallback(s):s;const l=i.slice(n.length);return{value:s,rest:l}}}const oc=/^(\d+)(th|st|nd|rd)?/i,lc=/\d+/i,cc={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},dc={any:[/^b/i,/^(a|c)/i]},uc={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},pc={any:[/1/i,/2/i,/3/i,/4/i]},hc={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},gc={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},fc={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},mc={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},bc={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},yc={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},vc={ordinalNumber:sc({matchPattern:oc,parsePattern:lc,valueCallback:t=>parseInt(t,10)}),era:Ve({matchPatterns:cc,defaultMatchWidth:"wide",parsePatterns:dc,defaultParseWidth:"any"}),quarter:Ve({matchPatterns:uc,defaultMatchWidth:"wide",parsePatterns:pc,defaultParseWidth:"any",valueCallback:t=>t+1}),month:Ve({matchPatterns:hc,defaultMatchWidth:"wide",parsePatterns:gc,defaultParseWidth:"any"}),day:Ve({matchPatterns:fc,defaultMatchWidth:"wide",parsePatterns:mc,defaultParseWidth:"any"}),dayPeriod:Ve({matchPatterns:bc,defaultMatchWidth:"any",parsePatterns:yc,defaultParseWidth:"any"})},oa={code:"en-US",formatDistance:jl,formatLong:Ul,formatRelative:Kl,localize:rc,match:vc,options:{weekStartsOn:0,firstWeekContainsDate:1}};function xc(t,i){const e=L(t,i==null?void 0:i.in);return ta(e,sa(e))+1}function la(t,i){const e=L(t,i==null?void 0:i.in),r=+ke(e)-+yl(e);return Math.round(r/Xn)+1}function Cr(t,i){var h,f,w,m;const e=L(t,i==null?void 0:i.in),r=e.getFullYear(),n=oe(),a=(i==null?void 0:i.firstWeekContainsDate)??((f=(h=i==null?void 0:i.locale)==null?void 0:h.options)==null?void 0:f.firstWeekContainsDate)??n.firstWeekContainsDate??((m=(w=n.locale)==null?void 0:w.options)==null?void 0:m.firstWeekContainsDate)??1,s=st((i==null?void 0:i.in)||t,0);s.setFullYear(r+1,0,a),s.setHours(0,0,0,0);const l=Ot(s,i),c=st((i==null?void 0:i.in)||t,0);c.setFullYear(r,0,a),c.setHours(0,0,0,0);const u=Ot(c,i);return+e>=+l?r+1:+e>=+u?r:r-1}function wc(t,i){var l,c,u,h;const e=oe(),r=(i==null?void 0:i.firstWeekContainsDate)??((c=(l=i==null?void 0:i.locale)==null?void 0:l.options)==null?void 0:c.firstWeekContainsDate)??e.firstWeekContainsDate??((h=(u=e.locale)==null?void 0:u.options)==null?void 0:h.firstWeekContainsDate)??1,n=Cr(t,i),a=st((i==null?void 0:i.in)||t,0);return a.setFullYear(n,0,r),a.setHours(0,0,0,0),Ot(a,i)}function ca(t,i){const e=L(t,i==null?void 0:i.in),r=+Ot(e,i)-+wc(e,i);return Math.round(r/Xn)+1}function G(t,i){const e=t<0?"-":"",r=Math.abs(t).toString().padStart(i,"0");return e+r}const Lt={y(t,i){const e=t.getFullYear(),r=e>0?e:1-e;return G(i==="yy"?r%100:r,i.length)},M(t,i){const e=t.getMonth();return i==="M"?String(e+1):G(e+1,2)},d(t,i){return G(t.getDate(),i.length)},a(t,i){const e=t.getHours()/12>=1?"pm":"am";switch(i){case"a":case"aa":return e.toUpperCase();case"aaa":return e;case"aaaaa":return e[0];case"aaaa":default:return e==="am"?"a.m.":"p.m."}},h(t,i){return G(t.getHours()%12||12,i.length)},H(t,i){return G(t.getHours(),i.length)},m(t,i){return G(t.getMinutes(),i.length)},s(t,i){return G(t.getSeconds(),i.length)},S(t,i){const e=i.length,r=t.getMilliseconds(),n=Math.trunc(r*Math.pow(10,e-3));return G(n,i.length)}},ue={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},vn={G:function(t,i,e){const r=t.getFullYear()>0?1:0;switch(i){case"G":case"GG":case"GGG":return e.era(r,{width:"abbreviated"});case"GGGGG":return e.era(r,{width:"narrow"});case"GGGG":default:return e.era(r,{width:"wide"})}},y:function(t,i,e){if(i==="yo"){const r=t.getFullYear(),n=r>0?r:1-r;return e.ordinalNumber(n,{unit:"year"})}return Lt.y(t,i)},Y:function(t,i,e,r){const n=Cr(t,r),a=n>0?n:1-n;if(i==="YY"){const s=a%100;return G(s,2)}return i==="Yo"?e.ordinalNumber(a,{unit:"year"}):G(a,i.length)},R:function(t,i){const e=Jn(t);return G(e,i.length)},u:function(t,i){const e=t.getFullYear();return G(e,i.length)},Q:function(t,i,e){const r=Math.ceil((t.getMonth()+1)/3);switch(i){case"Q":return String(r);case"QQ":return G(r,2);case"Qo":return e.ordinalNumber(r,{unit:"quarter"});case"QQQ":return e.quarter(r,{width:"abbreviated",context:"formatting"});case"QQQQQ":return e.quarter(r,{width:"narrow",context:"formatting"});case"QQQQ":default:return e.quarter(r,{width:"wide",context:"formatting"})}},q:function(t,i,e){const r=Math.ceil((t.getMonth()+1)/3);switch(i){case"q":return String(r);case"qq":return G(r,2);case"qo":return e.ordinalNumber(r,{unit:"quarter"});case"qqq":return e.quarter(r,{width:"abbreviated",context:"standalone"});case"qqqqq":return e.quarter(r,{width:"narrow",context:"standalone"});case"qqqq":default:return e.quarter(r,{width:"wide",context:"standalone"})}},M:function(t,i,e){const r=t.getMonth();switch(i){case"M":case"MM":return Lt.M(t,i);case"Mo":return e.ordinalNumber(r+1,{unit:"month"});case"MMM":return e.month(r,{width:"abbreviated",context:"formatting"});case"MMMMM":return e.month(r,{width:"narrow",context:"formatting"});case"MMMM":default:return e.month(r,{width:"wide",context:"formatting"})}},L:function(t,i,e){const r=t.getMonth();switch(i){case"L":return String(r+1);case"LL":return G(r+1,2);case"Lo":return e.ordinalNumber(r+1,{unit:"month"});case"LLL":return e.month(r,{width:"abbreviated",context:"standalone"});case"LLLLL":return e.month(r,{width:"narrow",context:"standalone"});case"LLLL":default:return e.month(r,{width:"wide",context:"standalone"})}},w:function(t,i,e,r){const n=ca(t,r);return i==="wo"?e.ordinalNumber(n,{unit:"week"}):G(n,i.length)},I:function(t,i,e){const r=la(t);return i==="Io"?e.ordinalNumber(r,{unit:"week"}):G(r,i.length)},d:function(t,i,e){return i==="do"?e.ordinalNumber(t.getDate(),{unit:"date"}):Lt.d(t,i)},D:function(t,i,e){const r=xc(t);return i==="Do"?e.ordinalNumber(r,{unit:"dayOfYear"}):G(r,i.length)},E:function(t,i,e){const r=t.getDay();switch(i){case"E":case"EE":case"EEE":return e.day(r,{width:"abbreviated",context:"formatting"});case"EEEEE":return e.day(r,{width:"narrow",context:"formatting"});case"EEEEEE":return e.day(r,{width:"short",context:"formatting"});case"EEEE":default:return e.day(r,{width:"wide",context:"formatting"})}},e:function(t,i,e,r){const n=t.getDay(),a=(n-r.weekStartsOn+8)%7||7;switch(i){case"e":return String(a);case"ee":return G(a,2);case"eo":return e.ordinalNumber(a,{unit:"day"});case"eee":return e.day(n,{width:"abbreviated",context:"formatting"});case"eeeee":return e.day(n,{width:"narrow",context:"formatting"});case"eeeeee":return e.day(n,{width:"short",context:"formatting"});case"eeee":default:return e.day(n,{width:"wide",context:"formatting"})}},c:function(t,i,e,r){const n=t.getDay(),a=(n-r.weekStartsOn+8)%7||7;switch(i){case"c":return String(a);case"cc":return G(a,i.length);case"co":return e.ordinalNumber(a,{unit:"day"});case"ccc":return e.day(n,{width:"abbreviated",context:"standalone"});case"ccccc":return e.day(n,{width:"narrow",context:"standalone"});case"cccccc":return e.day(n,{width:"short",context:"standalone"});case"cccc":default:return e.day(n,{width:"wide",context:"standalone"})}},i:function(t,i,e){const r=t.getDay(),n=r===0?7:r;switch(i){case"i":return String(n);case"ii":return G(n,i.length);case"io":return e.ordinalNumber(n,{unit:"day"});case"iii":return e.day(r,{width:"abbreviated",context:"formatting"});case"iiiii":return e.day(r,{width:"narrow",context:"formatting"});case"iiiiii":return e.day(r,{width:"short",context:"formatting"});case"iiii":default:return e.day(r,{width:"wide",context:"formatting"})}},a:function(t,i,e){const n=t.getHours()/12>=1?"pm":"am";switch(i){case"a":case"aa":return e.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"aaa":return e.dayPeriod(n,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return e.dayPeriod(n,{width:"narrow",context:"formatting"});case"aaaa":default:return e.dayPeriod(n,{width:"wide",context:"formatting"})}},b:function(t,i,e){const r=t.getHours();let n;switch(r===12?n=ue.noon:r===0?n=ue.midnight:n=r/12>=1?"pm":"am",i){case"b":case"bb":return e.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"bbb":return e.dayPeriod(n,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return e.dayPeriod(n,{width:"narrow",context:"formatting"});case"bbbb":default:return e.dayPeriod(n,{width:"wide",context:"formatting"})}},B:function(t,i,e){const r=t.getHours();let n;switch(r>=17?n=ue.evening:r>=12?n=ue.afternoon:r>=4?n=ue.morning:n=ue.night,i){case"B":case"BB":case"BBB":return e.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"BBBBB":return e.dayPeriod(n,{width:"narrow",context:"formatting"});case"BBBB":default:return e.dayPeriod(n,{width:"wide",context:"formatting"})}},h:function(t,i,e){if(i==="ho"){let r=t.getHours()%12;return r===0&&(r=12),e.ordinalNumber(r,{unit:"hour"})}return Lt.h(t,i)},H:function(t,i,e){return i==="Ho"?e.ordinalNumber(t.getHours(),{unit:"hour"}):Lt.H(t,i)},K:function(t,i,e){const r=t.getHours()%12;return i==="Ko"?e.ordinalNumber(r,{unit:"hour"}):G(r,i.length)},k:function(t,i,e){let r=t.getHours();return r===0&&(r=24),i==="ko"?e.ordinalNumber(r,{unit:"hour"}):G(r,i.length)},m:function(t,i,e){return i==="mo"?e.ordinalNumber(t.getMinutes(),{unit:"minute"}):Lt.m(t,i)},s:function(t,i,e){return i==="so"?e.ordinalNumber(t.getSeconds(),{unit:"second"}):Lt.s(t,i)},S:function(t,i){return Lt.S(t,i)},X:function(t,i,e){const r=t.getTimezoneOffset();if(r===0)return"Z";switch(i){case"X":return wn(r);case"XXXX":case"XX":return Qt(r);case"XXXXX":case"XXX":default:return Qt(r,":")}},x:function(t,i,e){const r=t.getTimezoneOffset();switch(i){case"x":return wn(r);case"xxxx":case"xx":return Qt(r);case"xxxxx":case"xxx":default:return Qt(r,":")}},O:function(t,i,e){const r=t.getTimezoneOffset();switch(i){case"O":case"OO":case"OOO":return"GMT"+xn(r,":");case"OOOO":default:return"GMT"+Qt(r,":")}},z:function(t,i,e){const r=t.getTimezoneOffset();switch(i){case"z":case"zz":case"zzz":return"GMT"+xn(r,":");case"zzzz":default:return"GMT"+Qt(r,":")}},t:function(t,i,e){const r=Math.trunc(+t/1e3);return G(r,i.length)},T:function(t,i,e){return G(+t,i.length)}};function xn(t,i=""){const e=t>0?"-":"+",r=Math.abs(t),n=Math.trunc(r/60),a=r%60;return a===0?e+String(n):e+String(n)+i+G(a,2)}function wn(t,i){return t%60===0?(t>0?"-":"+")+G(Math.abs(t)/60,2):Qt(t,i)}function Qt(t,i=""){const e=t>0?"-":"+",r=Math.abs(t),n=G(Math.trunc(r/60),2),a=G(r%60,2);return e+n+i+a}const $n=(t,i)=>{switch(t){case"P":return i.date({width:"short"});case"PP":return i.date({width:"medium"});case"PPP":return i.date({width:"long"});case"PPPP":default:return i.date({width:"full"})}},da=(t,i)=>{switch(t){case"p":return i.time({width:"short"});case"pp":return i.time({width:"medium"});case"ppp":return i.time({width:"long"});case"pppp":default:return i.time({width:"full"})}},$c=(t,i)=>{const e=t.match(/(P+)(p+)?/)||[],r=e[1],n=e[2];if(!n)return $n(t,i);let a;switch(r){case"P":a=i.dateTime({width:"short"});break;case"PP":a=i.dateTime({width:"medium"});break;case"PPP":a=i.dateTime({width:"long"});break;case"PPPP":default:a=i.dateTime({width:"full"});break}return a.replace("{{date}}",$n(r,i)).replace("{{time}}",da(n,i))},br={p:da,P:$c},_c=/^D+$/,kc=/^Y+$/,Sc=["D","DD","YY","YYYY"];function ua(t){return _c.test(t)}function pa(t){return kc.test(t)}function yr(t,i,e){const r=Cc(t,i,e);if(console.warn(r),Sc.includes(t))throw new RangeError(r)}function Cc(t,i,e){const r=t[0]==="Y"?"years":"days of the month";return`Use \`${t.toLowerCase()}\` instead of \`${t}\` (in \`${i}\`) for formatting ${r} to the input \`${e}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const Pc=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Tc=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Mc=/^'([^]*?)'?$/,Ec=/''/g,Oc=/[a-zA-Z]/;function Dc(t,i,e){var h,f,w,m,y,g,k,C;const r=oe(),n=(e==null?void 0:e.locale)??r.locale??oa,a=(e==null?void 0:e.firstWeekContainsDate)??((f=(h=e==null?void 0:e.locale)==null?void 0:h.options)==null?void 0:f.firstWeekContainsDate)??r.firstWeekContainsDate??((m=(w=r.locale)==null?void 0:w.options)==null?void 0:m.firstWeekContainsDate)??1,s=(e==null?void 0:e.weekStartsOn)??((g=(y=e==null?void 0:e.locale)==null?void 0:y.options)==null?void 0:g.weekStartsOn)??r.weekStartsOn??((C=(k=r.locale)==null?void 0:k.options)==null?void 0:C.weekStartsOn)??0,l=L(t,e==null?void 0:e.in);if(!ea(l))throw new RangeError("Invalid time value");let c=i.match(Tc).map($=>{const S=$[0];if(S==="p"||S==="P"){const Y=br[S];return Y($,n.formatLong)}return $}).join("").match(Pc).map($=>{if($==="''")return{isToken:!1,value:"'"};const S=$[0];if(S==="'")return{isToken:!1,value:zc($)};if(vn[S])return{isToken:!0,value:$};if(S.match(Oc))throw new RangeError("Format string contains an unescaped latin alphabet character `"+S+"`");return{isToken:!1,value:$}});n.localize.preprocessor&&(c=n.localize.preprocessor(l,c));const u={firstWeekContainsDate:a,weekStartsOn:s,locale:n};return c.map($=>{if(!$.isToken)return $.value;const S=$.value;(!(e!=null&&e.useAdditionalWeekYearTokens)&&pa(S)||!(e!=null&&e.useAdditionalDayOfYearTokens)&&ua(S))&&yr(S,i,String(t));const Y=vn[S[0]];return Y(l,S,n.localize,u)}).join("")}function zc(t){const i=t.match(Mc);return i?i[1].replace(Ec,"'"):t}function Ic(){return Object.assign({},oe())}function Ac(t,i){const e=L(t,i==null?void 0:i.in).getDay();return e===0?7:e}function Lc(t,i){const e=Bc(i)?new i(0):st(i,0);return e.setFullYear(t.getFullYear(),t.getMonth(),t.getDate()),e.setHours(t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()),e}function Bc(t){var i;return typeof t=="function"&&((i=t.prototype)==null?void 0:i.constructor)===t}const Fc=10;class ha{constructor(){_(this,"subPriority",0)}validate(i,e){return!0}}class Nc extends ha{constructor(i,e,r,n,a){super(),this.value=i,this.validateValue=e,this.setValue=r,this.priority=n,a&&(this.subPriority=a)}validate(i,e){return this.validateValue(i,this.value,e)}set(i,e,r){return this.setValue(i,e,this.value,r)}}class Rc extends ha{constructor(e,r){super();_(this,"priority",Fc);_(this,"subPriority",-1);this.context=e||(n=>st(r,n))}set(e,r){return r.timestampIsSet?e:st(e,Lc(e,this.context))}}class q{run(i,e,r,n){const a=this.parse(i,e,r,n);return a?{setter:new Nc(a.value,this.validate,this.set,this.priority,this.subPriority),rest:a.rest}:null}validate(i,e,r){return!0}}class Hc extends q{constructor(){super(...arguments);_(this,"priority",140);_(this,"incompatibleTokens",["R","u","t","T"])}parse(e,r,n){switch(r){case"G":case"GG":case"GGG":return n.era(e,{width:"abbreviated"})||n.era(e,{width:"narrow"});case"GGGGG":return n.era(e,{width:"narrow"});case"GGGG":default:return n.era(e,{width:"wide"})||n.era(e,{width:"abbreviated"})||n.era(e,{width:"narrow"})}}set(e,r,n){return r.era=n,e.setFullYear(n,0,1),e.setHours(0,0,0,0),e}}const lt={month:/^(1[0-2]|0?\d)/,date:/^(3[0-1]|[0-2]?\d)/,dayOfYear:/^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,week:/^(5[0-3]|[0-4]?\d)/,hour23h:/^(2[0-3]|[0-1]?\d)/,hour24h:/^(2[0-4]|[0-1]?\d)/,hour11h:/^(1[0-1]|0?\d)/,hour12h:/^(1[0-2]|0?\d)/,minute:/^[0-5]?\d/,second:/^[0-5]?\d/,singleDigit:/^\d/,twoDigits:/^\d{1,2}/,threeDigits:/^\d{1,3}/,fourDigits:/^\d{1,4}/,anyDigitsSigned:/^-?\d+/,singleDigitSigned:/^-?\d/,twoDigitsSigned:/^-?\d{1,2}/,threeDigitsSigned:/^-?\d{1,3}/,fourDigitsSigned:/^-?\d{1,4}/},Tt={basicOptionalMinutes:/^([+-])(\d{2})(\d{2})?|Z/,basic:/^([+-])(\d{2})(\d{2})|Z/,basicOptionalSeconds:/^([+-])(\d{2})(\d{2})((\d{2}))?|Z/,extended:/^([+-])(\d{2}):(\d{2})|Z/,extendedOptionalSeconds:/^([+-])(\d{2}):(\d{2})(:(\d{2}))?|Z/};function ct(t,i){return t&&{value:i(t.value),rest:t.rest}}function it(t,i){const e=i.match(t);return e?{value:parseInt(e[0],10),rest:i.slice(e[0].length)}:null}function Mt(t,i){const e=i.match(t);if(!e)return null;if(e[0]==="Z")return{value:0,rest:i.slice(1)};const r=e[1]==="+"?1:-1,n=e[2]?parseInt(e[2],10):0,a=e[3]?parseInt(e[3],10):0,s=e[5]?parseInt(e[5],10):0;return{value:r*(n*fi+a*gi+s*fl),rest:i.slice(e[0].length)}}function ga(t){return it(lt.anyDigitsSigned,t)}function ot(t,i){switch(t){case 1:return it(lt.singleDigit,i);case 2:return it(lt.twoDigits,i);case 3:return it(lt.threeDigits,i);case 4:return it(lt.fourDigits,i);default:return it(new RegExp("^\\d{1,"+t+"}"),i)}}function Di(t,i){switch(t){case 1:return it(lt.singleDigitSigned,i);case 2:return it(lt.twoDigitsSigned,i);case 3:return it(lt.threeDigitsSigned,i);case 4:return it(lt.fourDigitsSigned,i);default:return it(new RegExp("^-?\\d{1,"+t+"}"),i)}}function Pr(t){switch(t){case"morning":return 4;case"evening":return 17;case"pm":case"noon":case"afternoon":return 12;case"am":case"midnight":case"night":default:return 0}}function fa(t,i){const e=i>0,r=e?i:1-i;let n;if(r<=50)n=t||100;else{const a=r+50,s=Math.trunc(a/100)*100,l=t>=a%100;n=t+s-(l?100:0)}return e?n:1-n}function ma(t){return t%400===0||t%4===0&&t%100!==0}class Wc extends q{constructor(){super(...arguments);_(this,"priority",130);_(this,"incompatibleTokens",["Y","R","u","w","I","i","e","c","t","T"])}parse(e,r,n){const a=s=>({year:s,isTwoDigitYear:r==="yy"});switch(r){case"y":return ct(ot(4,e),a);case"yo":return ct(n.ordinalNumber(e,{unit:"year"}),a);default:return ct(ot(r.length,e),a)}}validate(e,r){return r.isTwoDigitYear||r.year>0}set(e,r,n){const a=e.getFullYear();if(n.isTwoDigitYear){const l=fa(n.year,a);return e.setFullYear(l,0,1),e.setHours(0,0,0,0),e}const s=!("era"in r)||r.era===1?n.year:1-n.year;return e.setFullYear(s,0,1),e.setHours(0,0,0,0),e}}class jc extends q{constructor(){super(...arguments);_(this,"priority",130);_(this,"incompatibleTokens",["y","R","u","Q","q","M","L","I","d","D","i","t","T"])}parse(e,r,n){const a=s=>({year:s,isTwoDigitYear:r==="YY"});switch(r){case"Y":return ct(ot(4,e),a);case"Yo":return ct(n.ordinalNumber(e,{unit:"year"}),a);default:return ct(ot(r.length,e),a)}}validate(e,r){return r.isTwoDigitYear||r.year>0}set(e,r,n,a){const s=Cr(e,a);if(n.isTwoDigitYear){const c=fa(n.year,s);return e.setFullYear(c,0,a.firstWeekContainsDate),e.setHours(0,0,0,0),Ot(e,a)}const l=!("era"in r)||r.era===1?n.year:1-n.year;return e.setFullYear(l,0,a.firstWeekContainsDate),e.setHours(0,0,0,0),Ot(e,a)}}class qc extends q{constructor(){super(...arguments);_(this,"priority",130);_(this,"incompatibleTokens",["G","y","Y","u","Q","q","M","L","w","d","D","e","c","t","T"])}parse(e,r){return Di(r==="R"?4:r.length,e)}set(e,r,n){const a=st(e,0);return a.setFullYear(n,0,4),a.setHours(0,0,0,0),ke(a)}}class Vc extends q{constructor(){super(...arguments);_(this,"priority",130);_(this,"incompatibleTokens",["G","y","Y","R","w","I","i","e","c","t","T"])}parse(e,r){return Di(r==="u"?4:r.length,e)}set(e,r,n){return e.setFullYear(n,0,1),e.setHours(0,0,0,0),e}}class Yc extends q{constructor(){super(...arguments);_(this,"priority",120);_(this,"incompatibleTokens",["Y","R","q","M","L","w","I","d","D","i","e","c","t","T"])}parse(e,r,n){switch(r){case"Q":case"QQ":return ot(r.length,e);case"Qo":return n.ordinalNumber(e,{unit:"quarter"});case"QQQ":return n.quarter(e,{width:"abbreviated",context:"formatting"})||n.quarter(e,{width:"narrow",context:"formatting"});case"QQQQQ":return n.quarter(e,{width:"narrow",context:"formatting"});case"QQQQ":default:return n.quarter(e,{width:"wide",context:"formatting"})||n.quarter(e,{width:"abbreviated",context:"formatting"})||n.quarter(e,{width:"narrow",context:"formatting"})}}validate(e,r){return r>=1&&r<=4}set(e,r,n){return e.setMonth((n-1)*3,1),e.setHours(0,0,0,0),e}}class Uc extends q{constructor(){super(...arguments);_(this,"priority",120);_(this,"incompatibleTokens",["Y","R","Q","M","L","w","I","d","D","i","e","c","t","T"])}parse(e,r,n){switch(r){case"q":case"qq":return ot(r.length,e);case"qo":return n.ordinalNumber(e,{unit:"quarter"});case"qqq":return n.quarter(e,{width:"abbreviated",context:"standalone"})||n.quarter(e,{width:"narrow",context:"standalone"});case"qqqqq":return n.quarter(e,{width:"narrow",context:"standalone"});case"qqqq":default:return n.quarter(e,{width:"wide",context:"standalone"})||n.quarter(e,{width:"abbreviated",context:"standalone"})||n.quarter(e,{width:"narrow",context:"standalone"})}}validate(e,r){return r>=1&&r<=4}set(e,r,n){return e.setMonth((n-1)*3,1),e.setHours(0,0,0,0),e}}class Gc extends q{constructor(){super(...arguments);_(this,"incompatibleTokens",["Y","R","q","Q","L","w","I","D","i","e","c","t","T"]);_(this,"priority",110)}parse(e,r,n){const a=s=>s-1;switch(r){case"M":return ct(it(lt.month,e),a);case"MM":return ct(ot(2,e),a);case"Mo":return ct(n.ordinalNumber(e,{unit:"month"}),a);case"MMM":return n.month(e,{width:"abbreviated",context:"formatting"})||n.month(e,{width:"narrow",context:"formatting"});case"MMMMM":return n.month(e,{width:"narrow",context:"formatting"});case"MMMM":default:return n.month(e,{width:"wide",context:"formatting"})||n.month(e,{width:"abbreviated",context:"formatting"})||n.month(e,{width:"narrow",context:"formatting"})}}validate(e,r){return r>=0&&r<=11}set(e,r,n){return e.setMonth(n,1),e.setHours(0,0,0,0),e}}class Kc extends q{constructor(){super(...arguments);_(this,"priority",110);_(this,"incompatibleTokens",["Y","R","q","Q","M","w","I","D","i","e","c","t","T"])}parse(e,r,n){const a=s=>s-1;switch(r){case"L":return ct(it(lt.month,e),a);case"LL":return ct(ot(2,e),a);case"Lo":return ct(n.ordinalNumber(e,{unit:"month"}),a);case"LLL":return n.month(e,{width:"abbreviated",context:"standalone"})||n.month(e,{width:"narrow",context:"standalone"});case"LLLLL":return n.month(e,{width:"narrow",context:"standalone"});case"LLLL":default:return n.month(e,{width:"wide",context:"standalone"})||n.month(e,{width:"abbreviated",context:"standalone"})||n.month(e,{width:"narrow",context:"standalone"})}}validate(e,r){return r>=0&&r<=11}set(e,r,n){return e.setMonth(n,1),e.setHours(0,0,0,0),e}}function Zc(t,i,e){const r=L(t,e==null?void 0:e.in),n=ca(r,e)-i;return r.setDate(r.getDate()-n*7),L(r,e==null?void 0:e.in)}class Qc extends q{constructor(){super(...arguments);_(this,"priority",100);_(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","i","t","T"])}parse(e,r,n){switch(r){case"w":return it(lt.week,e);case"wo":return n.ordinalNumber(e,{unit:"week"});default:return ot(r.length,e)}}validate(e,r){return r>=1&&r<=53}set(e,r,n,a){return Ot(Zc(e,n,a),a)}}function Xc(t,i,e){const r=L(t,e==null?void 0:e.in),n=la(r,e)-i;return r.setDate(r.getDate()-n*7),r}class Jc extends q{constructor(){super(...arguments);_(this,"priority",100);_(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","e","c","t","T"])}parse(e,r,n){switch(r){case"I":return it(lt.week,e);case"Io":return n.ordinalNumber(e,{unit:"week"});default:return ot(r.length,e)}}validate(e,r){return r>=1&&r<=53}set(e,r,n){return ke(Xc(e,n))}}const td=[31,28,31,30,31,30,31,31,30,31,30,31],ed=[31,29,31,30,31,30,31,31,30,31,30,31];class id extends q{constructor(){super(...arguments);_(this,"priority",90);_(this,"subPriority",1);_(this,"incompatibleTokens",["Y","R","q","Q","w","I","D","i","e","c","t","T"])}parse(e,r,n){switch(r){case"d":return it(lt.date,e);case"do":return n.ordinalNumber(e,{unit:"date"});default:return ot(r.length,e)}}validate(e,r){const n=e.getFullYear(),a=ma(n),s=e.getMonth();return a?r>=1&&r<=ed[s]:r>=1&&r<=td[s]}set(e,r,n){return e.setDate(n),e.setHours(0,0,0,0),e}}class rd extends q{constructor(){super(...arguments);_(this,"priority",90);_(this,"subpriority",1);_(this,"incompatibleTokens",["Y","R","q","Q","M","L","w","I","d","E","i","e","c","t","T"])}parse(e,r,n){switch(r){case"D":case"DD":return it(lt.dayOfYear,e);case"Do":return n.ordinalNumber(e,{unit:"date"});default:return ot(r.length,e)}}validate(e,r){const n=e.getFullYear();return ma(n)?r>=1&&r<=366:r>=1&&r<=365}set(e,r,n){return e.setMonth(0,n),e.setHours(0,0,0,0),e}}function Tr(t,i,e){var f,w,m,y;const r=oe(),n=(e==null?void 0:e.weekStartsOn)??((w=(f=e==null?void 0:e.locale)==null?void 0:f.options)==null?void 0:w.weekStartsOn)??r.weekStartsOn??((y=(m=r.locale)==null?void 0:m.options)==null?void 0:y.weekStartsOn)??0,a=L(t,e==null?void 0:e.in),s=a.getDay(),c=(i%7+7)%7,u=7-n,h=i<0||i>6?i-(s+u)%7:(c+u)%7-(s+u)%7;return Xi(a,h,e)}class nd extends q{constructor(){super(...arguments);_(this,"priority",90);_(this,"incompatibleTokens",["D","i","e","c","t","T"])}parse(e,r,n){switch(r){case"E":case"EE":case"EEE":return n.day(e,{width:"abbreviated",context:"formatting"})||n.day(e,{width:"short",context:"formatting"})||n.day(e,{width:"narrow",context:"formatting"});case"EEEEE":return n.day(e,{width:"narrow",context:"formatting"});case"EEEEEE":return n.day(e,{width:"short",context:"formatting"})||n.day(e,{width:"narrow",context:"formatting"});case"EEEE":default:return n.day(e,{width:"wide",context:"formatting"})||n.day(e,{width:"abbreviated",context:"formatting"})||n.day(e,{width:"short",context:"formatting"})||n.day(e,{width:"narrow",context:"formatting"})}}validate(e,r){return r>=0&&r<=6}set(e,r,n,a){return e=Tr(e,n,a),e.setHours(0,0,0,0),e}}class ad extends q{constructor(){super(...arguments);_(this,"priority",90);_(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","c","t","T"])}parse(e,r,n,a){const s=l=>{const c=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+c};switch(r){case"e":case"ee":return ct(ot(r.length,e),s);case"eo":return ct(n.ordinalNumber(e,{unit:"day"}),s);case"eee":return n.day(e,{width:"abbreviated",context:"formatting"})||n.day(e,{width:"short",context:"formatting"})||n.day(e,{width:"narrow",context:"formatting"});case"eeeee":return n.day(e,{width:"narrow",context:"formatting"});case"eeeeee":return n.day(e,{width:"short",context:"formatting"})||n.day(e,{width:"narrow",context:"formatting"});case"eeee":default:return n.day(e,{width:"wide",context:"formatting"})||n.day(e,{width:"abbreviated",context:"formatting"})||n.day(e,{width:"short",context:"formatting"})||n.day(e,{width:"narrow",context:"formatting"})}}validate(e,r){return r>=0&&r<=6}set(e,r,n,a){return e=Tr(e,n,a),e.setHours(0,0,0,0),e}}class sd extends q{constructor(){super(...arguments);_(this,"priority",90);_(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","e","t","T"])}parse(e,r,n,a){const s=l=>{const c=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+c};switch(r){case"c":case"cc":return ct(ot(r.length,e),s);case"co":return ct(n.ordinalNumber(e,{unit:"day"}),s);case"ccc":return n.day(e,{width:"abbreviated",context:"standalone"})||n.day(e,{width:"short",context:"standalone"})||n.day(e,{width:"narrow",context:"standalone"});case"ccccc":return n.day(e,{width:"narrow",context:"standalone"});case"cccccc":return n.day(e,{width:"short",context:"standalone"})||n.day(e,{width:"narrow",context:"standalone"});case"cccc":default:return n.day(e,{width:"wide",context:"standalone"})||n.day(e,{width:"abbreviated",context:"standalone"})||n.day(e,{width:"short",context:"standalone"})||n.day(e,{width:"narrow",context:"standalone"})}}validate(e,r){return r>=0&&r<=6}set(e,r,n,a){return e=Tr(e,n,a),e.setHours(0,0,0,0),e}}function od(t,i,e){const r=L(t,e==null?void 0:e.in),n=Ac(r,e),a=i-n;return Xi(r,a,e)}class ld extends q{constructor(){super(...arguments);_(this,"priority",90);_(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","E","e","c","t","T"])}parse(e,r,n){const a=s=>s===0?7:s;switch(r){case"i":case"ii":return ot(r.length,e);case"io":return n.ordinalNumber(e,{unit:"day"});case"iii":return ct(n.day(e,{width:"abbreviated",context:"formatting"})||n.day(e,{width:"short",context:"formatting"})||n.day(e,{width:"narrow",context:"formatting"}),a);case"iiiii":return ct(n.day(e,{width:"narrow",context:"formatting"}),a);case"iiiiii":return ct(n.day(e,{width:"short",context:"formatting"})||n.day(e,{width:"narrow",context:"formatting"}),a);case"iiii":default:return ct(n.day(e,{width:"wide",context:"formatting"})||n.day(e,{width:"abbreviated",context:"formatting"})||n.day(e,{width:"short",context:"formatting"})||n.day(e,{width:"narrow",context:"formatting"}),a)}}validate(e,r){return r>=1&&r<=7}set(e,r,n){return e=od(e,n),e.setHours(0,0,0,0),e}}class cd extends q{constructor(){super(...arguments);_(this,"priority",80);_(this,"incompatibleTokens",["b","B","H","k","t","T"])}parse(e,r,n){switch(r){case"a":case"aa":case"aaa":return n.dayPeriod(e,{width:"abbreviated",context:"formatting"})||n.dayPeriod(e,{width:"narrow",context:"formatting"});case"aaaaa":return n.dayPeriod(e,{width:"narrow",context:"formatting"});case"aaaa":default:return n.dayPeriod(e,{width:"wide",context:"formatting"})||n.dayPeriod(e,{width:"abbreviated",context:"formatting"})||n.dayPeriod(e,{width:"narrow",context:"formatting"})}}set(e,r,n){return e.setHours(Pr(n),0,0,0),e}}class dd extends q{constructor(){super(...arguments);_(this,"priority",80);_(this,"incompatibleTokens",["a","B","H","k","t","T"])}parse(e,r,n){switch(r){case"b":case"bb":case"bbb":return n.dayPeriod(e,{width:"abbreviated",context:"formatting"})||n.dayPeriod(e,{width:"narrow",context:"formatting"});case"bbbbb":return n.dayPeriod(e,{width:"narrow",context:"formatting"});case"bbbb":default:return n.dayPeriod(e,{width:"wide",context:"formatting"})||n.dayPeriod(e,{width:"abbreviated",context:"formatting"})||n.dayPeriod(e,{width:"narrow",context:"formatting"})}}set(e,r,n){return e.setHours(Pr(n),0,0,0),e}}class ud extends q{constructor(){super(...arguments);_(this,"priority",80);_(this,"incompatibleTokens",["a","b","t","T"])}parse(e,r,n){switch(r){case"B":case"BB":case"BBB":return n.dayPeriod(e,{width:"abbreviated",context:"formatting"})||n.dayPeriod(e,{width:"narrow",context:"formatting"});case"BBBBB":return n.dayPeriod(e,{width:"narrow",context:"formatting"});case"BBBB":default:return n.dayPeriod(e,{width:"wide",context:"formatting"})||n.dayPeriod(e,{width:"abbreviated",context:"formatting"})||n.dayPeriod(e,{width:"narrow",context:"formatting"})}}set(e,r,n){return e.setHours(Pr(n),0,0,0),e}}class pd extends q{constructor(){super(...arguments);_(this,"priority",70);_(this,"incompatibleTokens",["H","K","k","t","T"])}parse(e,r,n){switch(r){case"h":return it(lt.hour12h,e);case"ho":return n.ordinalNumber(e,{unit:"hour"});default:return ot(r.length,e)}}validate(e,r){return r>=1&&r<=12}set(e,r,n){const a=e.getHours()>=12;return a&&n<12?e.setHours(n+12,0,0,0):!a&&n===12?e.setHours(0,0,0,0):e.setHours(n,0,0,0),e}}class hd extends q{constructor(){super(...arguments);_(this,"priority",70);_(this,"incompatibleTokens",["a","b","h","K","k","t","T"])}parse(e,r,n){switch(r){case"H":return it(lt.hour23h,e);case"Ho":return n.ordinalNumber(e,{unit:"hour"});default:return ot(r.length,e)}}validate(e,r){return r>=0&&r<=23}set(e,r,n){return e.setHours(n,0,0,0),e}}class gd extends q{constructor(){super(...arguments);_(this,"priority",70);_(this,"incompatibleTokens",["h","H","k","t","T"])}parse(e,r,n){switch(r){case"K":return it(lt.hour11h,e);case"Ko":return n.ordinalNumber(e,{unit:"hour"});default:return ot(r.length,e)}}validate(e,r){return r>=0&&r<=11}set(e,r,n){return e.getHours()>=12&&n<12?e.setHours(n+12,0,0,0):e.setHours(n,0,0,0),e}}class fd extends q{constructor(){super(...arguments);_(this,"priority",70);_(this,"incompatibleTokens",["a","b","h","H","K","t","T"])}parse(e,r,n){switch(r){case"k":return it(lt.hour24h,e);case"ko":return n.ordinalNumber(e,{unit:"hour"});default:return ot(r.length,e)}}validate(e,r){return r>=1&&r<=24}set(e,r,n){const a=n<=24?n%24:n;return e.setHours(a,0,0,0),e}}class md extends q{constructor(){super(...arguments);_(this,"priority",60);_(this,"incompatibleTokens",["t","T"])}parse(e,r,n){switch(r){case"m":return it(lt.minute,e);case"mo":return n.ordinalNumber(e,{unit:"minute"});default:return ot(r.length,e)}}validate(e,r){return r>=0&&r<=59}set(e,r,n){return e.setMinutes(n,0,0),e}}class bd extends q{constructor(){super(...arguments);_(this,"priority",50);_(this,"incompatibleTokens",["t","T"])}parse(e,r,n){switch(r){case"s":return it(lt.second,e);case"so":return n.ordinalNumber(e,{unit:"second"});default:return ot(r.length,e)}}validate(e,r){return r>=0&&r<=59}set(e,r,n){return e.setSeconds(n,0),e}}class yd extends q{constructor(){super(...arguments);_(this,"priority",30);_(this,"incompatibleTokens",["t","T"])}parse(e,r){const n=a=>Math.trunc(a*Math.pow(10,-r.length+3));return ct(ot(r.length,e),n)}set(e,r,n){return e.setMilliseconds(n),e}}class vd extends q{constructor(){super(...arguments);_(this,"priority",10);_(this,"incompatibleTokens",["t","T","x"])}parse(e,r){switch(r){case"X":return Mt(Tt.basicOptionalMinutes,e);case"XX":return Mt(Tt.basic,e);case"XXXX":return Mt(Tt.basicOptionalSeconds,e);case"XXXXX":return Mt(Tt.extendedOptionalSeconds,e);case"XXX":default:return Mt(Tt.extended,e)}}set(e,r,n){return r.timestampIsSet?e:st(e,e.getTime()-Oi(e)-n)}}class xd extends q{constructor(){super(...arguments);_(this,"priority",10);_(this,"incompatibleTokens",["t","T","X"])}parse(e,r){switch(r){case"x":return Mt(Tt.basicOptionalMinutes,e);case"xx":return Mt(Tt.basic,e);case"xxxx":return Mt(Tt.basicOptionalSeconds,e);case"xxxxx":return Mt(Tt.extendedOptionalSeconds,e);case"xxx":default:return Mt(Tt.extended,e)}}set(e,r,n){return r.timestampIsSet?e:st(e,e.getTime()-Oi(e)-n)}}class wd extends q{constructor(){super(...arguments);_(this,"priority",40);_(this,"incompatibleTokens","*")}parse(e){return ga(e)}set(e,r,n){return[st(e,n*1e3),{timestampIsSet:!0}]}}class $d extends q{constructor(){super(...arguments);_(this,"priority",20);_(this,"incompatibleTokens","*")}parse(e){return ga(e)}set(e,r,n){return[st(e,n),{timestampIsSet:!0}]}}const _d={G:new Hc,y:new Wc,Y:new jc,R:new qc,u:new Vc,Q:new Yc,q:new Uc,M:new Gc,L:new Kc,w:new Qc,I:new Jc,d:new id,D:new rd,E:new nd,e:new ad,c:new sd,i:new ld,a:new cd,b:new dd,B:new ud,h:new pd,H:new hd,K:new gd,k:new fd,m:new md,s:new bd,S:new yd,X:new vd,x:new xd,t:new wd,T:new $d},kd=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Sd=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Cd=/^'([^]*?)'?$/,Pd=/''/g,Td=/\S/,Md=/[a-zA-Z]/;function Ed(t,i,e,r){var k,C,$,S,Y,K,v,H;const n=()=>st((r==null?void 0:r.in)||e,NaN),a=Ic(),s=(r==null?void 0:r.locale)??a.locale??oa,l=(r==null?void 0:r.firstWeekContainsDate)??((C=(k=r==null?void 0:r.locale)==null?void 0:k.options)==null?void 0:C.firstWeekContainsDate)??a.firstWeekContainsDate??((S=($=a.locale)==null?void 0:$.options)==null?void 0:S.firstWeekContainsDate)??1,c=(r==null?void 0:r.weekStartsOn)??((K=(Y=r==null?void 0:r.locale)==null?void 0:Y.options)==null?void 0:K.weekStartsOn)??a.weekStartsOn??((H=(v=a.locale)==null?void 0:v.options)==null?void 0:H.weekStartsOn)??0;if(!i)return t?n():L(e,r==null?void 0:r.in);const u={firstWeekContainsDate:l,weekStartsOn:c,locale:s},h=[new Rc(r==null?void 0:r.in,e)],f=i.match(Sd).map(z=>{const O=z[0];if(O in br){const V=br[O];return V(z,s.formatLong)}return z}).join("").match(kd),w=[];for(let z of f){!(r!=null&&r.useAdditionalWeekYearTokens)&&pa(z)&&yr(z,i,t),!(r!=null&&r.useAdditionalDayOfYearTokens)&&ua(z)&&yr(z,i,t);const O=z[0],V=_d[O];if(V){const{incompatibleTokens:Q}=V;if(Array.isArray(Q)){const xt=w.find(qt=>Q.includes(qt.token)||qt.token===O);if(xt)throw new RangeError(`The format string mustn't contain \`${xt.fullToken}\` and \`${z}\` at the same time`)}else if(V.incompatibleTokens==="*"&&w.length>0)throw new RangeError(`The format string mustn't contain \`${z}\` and any other token at the same time`);w.push({token:O,fullToken:z});const U=V.run(t,z,s.match,u);if(!U)return n();h.push(U.setter),t=U.rest}else{if(O.match(Md))throw new RangeError("Format string contains an unescaped latin alphabet character `"+O+"`");if(z==="''"?z="'":O==="'"&&(z=Od(z)),t.indexOf(z)===0)t=t.slice(z.length);else return n()}}if(t.length>0&&Td.test(t))return n();const m=h.map(z=>z.priority).sort((z,O)=>O-z).filter((z,O,V)=>V.indexOf(z)===O).map(z=>h.filter(O=>O.priority===z).sort((O,V)=>V.subPriority-O.subPriority)).map(z=>z[0]);let y=L(e,r==null?void 0:r.in);if(isNaN(+y))return n();const g={};for(const z of m){if(!z.validate(y,u))return n();const O=z.set(y,g,u);Array.isArray(O)?(y=O[0],Object.assign(g,O[1])):y=O}return y}function Od(t){return t.match(Cd)[1].replace(Pd,"'")}function Dd(t,i){const e=L(t,i==null?void 0:i.in);return e.setMinutes(0,0,0),e}function zd(t,i){const e=L(t,i==null?void 0:i.in);return e.setSeconds(0,0),e}function Id(t,i){const e=L(t,i==null?void 0:i.in);return e.setMilliseconds(0),e}function Ad(t,i){const e=()=>st(i==null?void 0:i.in,NaN),r=(i==null?void 0:i.additionalDigits)??2,n=Nd(t);let a;if(n.date){const u=Rd(n.date,r);a=Hd(u.restDateString,u.year)}if(!a||isNaN(+a))return e();const s=+a;let l=0,c;if(n.time&&(l=Wd(n.time),isNaN(l)))return e();if(n.timezone){if(c=jd(n.timezone),isNaN(c))return e()}else{const u=new Date(s+l),h=L(0,i==null?void 0:i.in);return h.setFullYear(u.getUTCFullYear(),u.getUTCMonth(),u.getUTCDate()),h.setHours(u.getUTCHours(),u.getUTCMinutes(),u.getUTCSeconds(),u.getUTCMilliseconds()),h}return L(s+l+c,i==null?void 0:i.in)}const _i={dateTimeDelimiter:/[T ]/,timeZoneDelimiter:/[Z ]/i,timezone:/([Z+-].*)$/},Ld=/^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/,Bd=/^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/,Fd=/^([+-])(\d{2})(?::?(\d{2}))?$/;function Nd(t){const i={},e=t.split(_i.dateTimeDelimiter);let r;if(e.length>2)return i;if(/:/.test(e[0])?r=e[0]:(i.date=e[0],r=e[1],_i.timeZoneDelimiter.test(i.date)&&(i.date=t.split(_i.timeZoneDelimiter)[0],r=t.substr(i.date.length,t.length))),r){const n=_i.timezone.exec(r);n?(i.time=r.replace(n[1],""),i.timezone=n[1]):i.time=r}return i}function Rd(t,i){const e=new RegExp("^(?:(\\d{4}|[+-]\\d{"+(4+i)+"})|(\\d{2}|[+-]\\d{"+(2+i)+"})$)"),r=t.match(e);if(!r)return{year:NaN,restDateString:""};const n=r[1]?parseInt(r[1]):null,a=r[2]?parseInt(r[2]):null;return{year:a===null?n:a*100,restDateString:t.slice((r[1]||r[2]).length)}}function Hd(t,i){if(i===null)return new Date(NaN);const e=t.match(Ld);if(!e)return new Date(NaN);const r=!!e[4],n=Ye(e[1]),a=Ye(e[2])-1,s=Ye(e[3]),l=Ye(e[4]),c=Ye(e[5])-1;if(r)return Gd(i,l,c)?qd(i,l,c):new Date(NaN);{const u=new Date(0);return!Yd(i,a,s)||!Ud(i,n)?new Date(NaN):(u.setUTCFullYear(i,a,Math.max(n,s)),u)}}function Ye(t){return t?parseInt(t):1}function Wd(t){const i=t.match(Bd);if(!i)return NaN;const e=lr(i[1]),r=lr(i[2]),n=lr(i[3]);return Kd(e,r,n)?e*fi+r*gi+n*1e3:NaN}function lr(t){return t&&parseFloat(t.replace(",","."))||0}function jd(t){if(t==="Z")return 0;const i=t.match(Fd);if(!i)return 0;const e=i[1]==="+"?-1:1,r=parseInt(i[2]),n=i[3]&&parseInt(i[3])||0;return Zd(r,n)?e*(r*fi+n*gi):NaN}function qd(t,i,e){const r=new Date(0);r.setUTCFullYear(t,0,4);const n=r.getUTCDay()||7,a=(i-1)*7+e+1-n;return r.setUTCDate(r.getUTCDate()+a),r}const Vd=[31,null,31,30,31,30,31,31,30,31,30,31];function ba(t){return t%400===0||t%4===0&&t%100!==0}function Yd(t,i,e){return i>=0&&i<=11&&e>=1&&e<=(Vd[i]||(ba(t)?29:28))}function Ud(t,i){return i>=1&&i<=(ba(t)?366:365)}function Gd(t,i,e){return i>=1&&i<=53&&e>=0&&e<=6}function Kd(t,i,e){return t===24?i===0&&e===0:e>=0&&e<60&&i>=0&&i<60&&t>=0&&t<25}function Zd(t,i){return i>=0&&i<=59}/*!
 * chartjs-adapter-date-fns v3.0.0
 * https://www.chartjs.org
 * (c) 2022 chartjs-adapter-date-fns Contributors
 * Released under the MIT license
 */const Qd={datetime:"MMM d, yyyy, h:mm:ss aaaa",millisecond:"h:mm:ss.SSS aaaa",second:"h:mm:ss aaaa",minute:"h:mm aaaa",hour:"ha",day:"MMM d",week:"PP",month:"MMM yyyy",quarter:"qqq - yyyy",year:"yyyy"};Ya._date.override({_id:"date-fns",formats:function(){return Qd},parse:function(t,i){if(t===null||typeof t>"u")return null;const e=typeof t;return e==="number"||t instanceof Date?t=L(t):e==="string"&&(typeof i=="string"?t=Ed(t,i,new Date,this.options):t=Ad(t,this.options)),ea(t)?t.getTime():null},format:function(t,i){return Dc(t,i,this.options)},add:function(t,i,e){switch(e){case"millisecond":return kr(t,i);case"second":return wl(t,i);case"minute":return vl(t,i);case"hour":return ml(t,i);case"day":return Xi(t,i);case"week":return $l(t,i);case"month":return _r(t,i);case"quarter":return xl(t,i);case"year":return _l(t,i);default:return t}},diff:function(t,i,e){switch(e){case"millisecond":return Sr(t,i);case"second":return Ol(t,i);case"minute":return Tl(t,i);case"hour":return Pl(t,i);case"day":return ia(t,i);case"week":return Dl(t,i);case"month":return aa(t,i);case"quarter":return El(t,i);case"year":return zl(t,i);default:return 0}},startOf:function(t,i,e){switch(i){case"second":return Id(t);case"minute":return zd(t);case"hour":return Dd(t);case"day":return mr(t);case"week":return Ot(t);case"isoWeek":return Ot(t,{weekStartsOn:+e});case"month":return Al(t);case"quarter":return Il(t);case"year":return sa(t);default:return t}},endOf:function(t,i){switch(i){case"second":return Hl(t);case"minute":return Nl(t);case"hour":return Bl(t);case"day":return ra(t);case"week":return Fl(t);case"month":return na(t);case"quarter":return Rl(t);case"year":return Ll(t);default:return t}}});function _n(t,i){if(!(i!=null&&i.start)||!(i!=null&&i.end))return null;const e=t.getPixelForValue(i.start.getTime()),r=t.getPixelForValue(i.end.getTime());if(!Number.isFinite(e)||!Number.isFinite(r))return null;const n=Math.min(e,r),a=Math.max(Math.abs(r-e),2);return!Number.isFinite(a)||a<=0?null:{left:n,width:a}}const Xd={id:"pricingModeIcons",beforeDatasetsDraw(t,i,e){var c;const r=e,n=r==null?void 0:r.segments;if(!(n!=null&&n.length))return;const a=t.chartArea,s=(c=t.scales)==null?void 0:c.x;if(!a||!s)return;const l=t.ctx;l.save(),l.globalAlpha=(r==null?void 0:r.backgroundOpacity)??.12;for(const u of n){const h=_n(s,u);h&&(l.fillStyle=u.color||"rgba(255, 255, 255, 0.1)",l.fillRect(h.left,a.top,h.width,a.bottom-a.top))}l.restore()},afterDatasetsDraw(t,i,e){var z;const r=e,n=r==null?void 0:r.segments;if(!(n!=null&&n.length))return;const a=(z=t.scales)==null?void 0:z.x,s=t.chartArea;if(!a||!s)return;const l=(r==null?void 0:r.iconSize)??16,c=(r==null?void 0:r.labelSize)??9,u=`${l}px "Inter", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,h=`${c}px "Inter", sans-serif`,f=(r==null?void 0:r.iconColor)||"rgba(255, 255, 255, 0.95)",w=(r==null?void 0:r.labelColor)||"rgba(255, 255, 255, 0.7)",m=(r==null?void 0:r.axisBandPadding)??10,y=(r==null?void 0:r.axisBandHeight)??l+c+10,g=(r==null?void 0:r.axisBandColor)||"rgba(6, 10, 18, 0.12)",k=(r==null?void 0:r.iconAlignment)||"start",C=(r==null?void 0:r.iconStartOffset)??12,$=(r==null?void 0:r.iconBaselineOffset)??4,S=(a.bottom||s.bottom)+m,Y=Math.min(S,t.height-y-2),K=s.right-s.left,v=Y+$,H=t.ctx;H.save(),H.globalCompositeOperation="destination-over",H.fillStyle=g,H.fillRect(s.left,Y,K,y),H.restore(),H.save(),H.globalCompositeOperation="destination-over",H.textAlign="center",H.textBaseline="top";for(const O of n){const V=_n(a,O);if(!V)continue;let Q;if(k==="start"){Q=V.left+C;const U=V.left+V.width-l/2;Q>U&&(Q=V.left+V.width/2)}else Q=V.left+V.width/2;H.font=u,H.fillStyle=f,H.fillText(O.icon||"❓",Q,v),O.shortLabel&&(H.font=h,H.fillStyle=w,H.fillText(O.shortLabel,Q,v+l-2))}H.restore()}};function kn(t,i){if(!t)return;t.layout||(t.layout={}),t.layout.padding||(t.layout.padding={});const e=t.layout.padding,r=12;e.top=e.top??12,e.bottom=Math.max(e.bottom||0,r)}var Jd=Object.defineProperty,tu=Object.getOwnPropertyDescriptor,Ee=(t,i,e,r)=>{for(var n=r>1?void 0:r?tu(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&Jd(i,e,n),n};const Bt=Z;Ui.register(Mn,En,Ua,Ga,On,Dn,Ka,zn,Za,Qa,In,An,Xa,Ja,Ln,Xd);function eu(t){const i=t.timeline.map(e=>e.spot_price_czk??0);return{label:"📊 Spotová cena nákupu",data:i,borderColor:"#2196F3",backgroundColor:"rgba(33, 150, 243, 0.15)",borderWidth:3,fill:!1,tension:.4,type:"line",yAxisID:"y-price",pointRadius:i.map(()=>0),pointHoverRadius:7,pointBackgroundColor:i.map(()=>"#42a5f5"),pointBorderColor:i.map(()=>"#42a5f5"),pointBorderWidth:2,order:1,datalabels:{display:!1}}}function iu(t){return{label:"💰 Výkupní cena",data:t.timeline.map(i=>i.export_price_czk??0),borderColor:"#4CAF50",backgroundColor:"rgba(76, 187, 106, 0.15)",borderWidth:2,fill:!1,type:"line",tension:.4,yAxisID:"y-price",pointRadius:0,pointHoverRadius:5,order:1,borderDash:[5,5]}}function ru(t){if(!t.solar)return[];const{string1:i,string2:e,hasString1:r,hasString2:n}=t.solar,a=(r?1:0)+(n?1:0),s={string1:{border:"rgba(255, 193, 7, 0.8)",bg:"rgba(255, 193, 7, 0.2)"},string2:{border:"rgba(255, 152, 0, 0.8)",bg:"rgba(255, 152, 0, 0.2)"}};if(a===1){const l=r?i:e,c=r?s.string1:s.string2;return[{label:"☀️ Solární předpověď",data:l,borderColor:c.border,backgroundColor:c.bg,borderWidth:2,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",pointRadius:0,pointHoverRadius:5,order:2}]}return a===2?[{label:"☀️ String 2",data:e,borderColor:s.string2.border,backgroundColor:s.string2.bg,borderWidth:1.5,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2},{label:"☀️ String 1",data:i,borderColor:s.string1.border,backgroundColor:s.string1.bg,borderWidth:1.5,fill:"-1",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2}]:[]}function nu(t){if(!t.battery)return[];const{baseline:i,solarCharge:e,gridCharge:r,gridNet:n,consumption:a}=t.battery,s=[],l={baseline:{border:"#78909C",bg:"rgba(120, 144, 156, 0.25)"},solar:{border:"transparent",bg:"rgba(255, 167, 38, 0.6)"},grid:{border:"transparent",bg:"rgba(33, 150, 243, 0.6)"}};return a.some(c=>c!=null&&c>0)&&s.push({label:"🏠 Spotřeba (plán)",data:a,borderColor:"rgba(255, 112, 67, 0.7)",backgroundColor:"rgba(255, 112, 67, 0.12)",borderWidth:1.5,type:"line",fill:!1,tension:.25,pointRadius:0,pointHoverRadius:5,yAxisID:"y-power",stack:"consumption",borderDash:[6,4],order:2}),r.some(c=>c!=null&&c>0)&&s.push({label:"⚡ Do baterie ze sítě",data:r,backgroundColor:l.grid.bg,borderColor:l.grid.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),e.some(c=>c!=null&&c>0)&&s.push({label:"☀️ Do baterie ze soláru",data:e,backgroundColor:l.solar.bg,borderColor:l.solar.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),s.push({label:"🔋 Zbývající kapacita",data:i,backgroundColor:l.baseline.bg,borderColor:l.baseline.border,borderWidth:3,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),n.some(c=>c!==null)&&s.push({label:"📡 Netto odběr ze sítě",data:n,borderColor:"#00BCD4",backgroundColor:"transparent",borderWidth:2,type:"line",fill:!1,tension:.2,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",order:2}),s}function Sn(t){const i=[];return t.prices.length>0&&i.push(eu(t)),t.exportPrices.length>0&&i.push(iu(t)),i.push(...ru(t)),i.push(...nu(t)),i}function ki(t,i,e=""){if(t==null)return"";const r=e?` ${e}`:"";return`${t.toFixed(i)}${r}`}function he(t){var n;const i=(n=t.scales)==null?void 0:n.x;if(!i)return"overview";const r=(i.max-i.min)/(1e3*60*60);return r<=6?"detail":r<=24?"day":"overview"}function Zt(t,i){var h,f,w,m,y,g,k,C,$,S,Y;if(!((h=t==null?void 0:t.scales)!=null&&h.x))return;const e=t.scales.x,n=(e.max-e.min)/(1e3*60*60),a=he(t),s=(w=(f=t.options.plugins)==null?void 0:f.legend)==null?void 0:w.labels;s&&(s.padding=10,s.font&&(s.font.size=11),a==="detail"&&(s.padding=12,s.font&&(s.font.size=12)));const l=["y-price","y-solar","y-power"];for(const K of l){const v=(m=t.options.scales)==null?void 0:m[K];v&&(a==="overview"?(v.title&&(v.title.display=!1),(y=v.ticks)!=null&&y.font&&(v.ticks.font.size=10),K==="y-solar"&&(v.display=!1)):a==="detail"?(v.title&&(v.title.display=!0,v.title.font&&(v.title.font.size=12)),(g=v.ticks)!=null&&g.font&&(v.ticks.font.size=11),v.display=!0):(v.title&&(v.title.display=!0,v.title.font&&(v.title.font.size=11)),(k=v.ticks)!=null&&k.font&&(v.ticks.font.size=10),v.display=!0))}const c=(C=t.options.scales)==null?void 0:C.x;c&&(a==="overview"?c.ticks&&(c.ticks.maxTicksLimit=12,c.ticks.font&&(c.ticks.font.size=10)):a==="detail"?(c.ticks&&(c.ticks.maxTicksLimit=24,c.ticks.font&&(c.ticks.font.size=11)),c.time&&(c.time.displayFormats.hour="HH:mm")):(c.ticks&&(c.ticks.maxTicksLimit=16,c.ticks.font&&(c.ticks.font.size=10)),c.time&&(c.time.displayFormats.hour="dd.MM HH:mm")));const u=i==="always"||i==="auto"&&n<=6;for(const K of t.data.datasets){const v=K;if(v.datalabels||(v.datalabels={}),i==="never"){v.datalabels.display=!1;continue}if(u){let H=1;n>3&&n<=6?H=2:n>6&&(H=4),v.datalabels.display=Q=>{const U=Q.dataset.data[Q.dataIndex];return U==null||U===0?!1:Q.dataIndex%H===0};const z=v.yAxisID==="y-price",O=(($=v.label)==null?void 0:$.includes("Solární"))||((S=v.label)==null?void 0:S.includes("String")),V=(Y=v.label)==null?void 0:Y.includes("kapacita");v.datalabels.align="top",v.datalabels.offset=6,v.datalabels.color="#fff",v.datalabels.font={size:9,weight:"bold"},z?(v.datalabels.formatter=Q=>ki(Q,2,"Kč"),v.datalabels.backgroundColor=v.borderColor||"rgba(33, 150, 243, 0.8)"):O?(v.datalabels.formatter=Q=>ki(Q,1,"kW"),v.datalabels.backgroundColor=v.borderColor||"rgba(255, 193, 7, 0.8)"):V?(v.datalabels.formatter=Q=>ki(Q,1,"kWh"),v.datalabels.backgroundColor=v.borderColor||"rgba(120, 144, 156, 0.8)"):(v.datalabels.formatter=Q=>ki(Q,1),v.datalabels.backgroundColor=v.borderColor||"rgba(33, 150, 243, 0.8)"),v.datalabels.borderRadius=4,v.datalabels.padding={top:3,bottom:3,left:5,right:5}}else v.datalabels.display=!1}t.update("none"),b.debug(`[PricingChart] Detail: ${n.toFixed(1)}h, Labels: ${u?"ON":"OFF"}, Mode: ${i}`)}let Nt=class extends M{constructor(){super(...arguments),this.data=null,this.datalabelMode="auto",this.zoomState={start:null,end:null},this.currentDetailLevel="overview",this.chart=null,this.resizeObserver=null}firstUpdated(){this.setupResizeObserver(),this.data&&this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())}updated(t){t.has("data")&&this.data&&(this.chart?this.updateChartData():this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())),t.has("datalabelMode")&&this.chart&&Zt(this.chart,this.datalabelMode)}disconnectedCallback(){var t;super.disconnectedCallback(),this.destroyChart(),(t=this.resizeObserver)==null||t.disconnect(),this.resizeObserver=null}zoomToTimeRange(t,i){if(!this.chart){b.warn("[PricingChart] Chart not available for zoom");return}const e=new Date(t),r=new Date(i),n=15*60*1e3,a=e.getTime()-n,s=r.getTime()+n;if(this.zoomState.start!==null&&Math.abs(this.zoomState.start-a)<6e4&&this.zoomState.end!==null&&Math.abs(this.zoomState.end-s)<6e4){b.debug("[PricingChart] Already zoomed to same range → reset"),this.resetZoom();return}try{const l=this.chart.options;l.scales.x.min=a,l.scales.x.max=s,this.chart.update("none"),this.zoomState={start:a,end:s},this.currentDetailLevel=he(this.chart),Zt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-change",{detail:{start:a,end:s,level:this.currentDetailLevel},bubbles:!0,composed:!0})),b.debug("[PricingChart] Zoomed to range",{start:new Date(a).toISOString(),end:new Date(s).toISOString()})}catch(l){b.error("[PricingChart] Zoom error",l)}}resetZoom(){if(!this.chart)return;const t=this.chart.options;delete t.scales.x.min,delete t.scales.x.max,this.chart.update("none"),this.zoomState={start:null,end:null},this.currentDetailLevel=he(this.chart),Zt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-reset",{bubbles:!0,composed:!0}))}getChart(){return this.chart}createChart(){if(!this.canvas||!this.data||this.data.timeline.length===0)return;this.chart&&this.destroyChart();const t=this.data,i=Sn(t),e={responsive:!0,maintainAspectRatio:!1,animation:{duration:0},interaction:{mode:"index",intersect:!1},plugins:{legend:{labels:{color:"#ffffff",font:{size:11,weight:"500"},padding:10,usePointStyle:!0,pointStyle:"circle",boxWidth:12,boxHeight:12},position:"top"},tooltip:{backgroundColor:"rgba(0,0,0,0.9)",titleColor:"#ffffff",bodyColor:"#ffffff",titleFont:{size:13,weight:"bold"},bodyFont:{size:11},padding:10,cornerRadius:6,displayColors:!0,callbacks:{title:n=>n.length>0?new Date(n[0].parsed.x).toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"",label:n=>{let a=n.dataset.label||"";return a&&(a+=": "),n.parsed.y!==null&&(n.dataset.yAxisID==="y-price"?a+=n.parsed.y.toFixed(2)+" Kč/kWh":n.dataset.yAxisID==="y-solar"?a+=n.parsed.y.toFixed(2)+" kWh":n.dataset.yAxisID==="y-power"?a+=n.parsed.y.toFixed(2)+" kW":a+=n.parsed.y),a}}},datalabels:{display:!1},zoom:{zoom:{wheel:{enabled:!0,modifierKey:null},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)",borderColor:"rgba(33, 150, 243, 0.8)",borderWidth:2},pinch:{enabled:!0},mode:"x",onZoomComplete:({chart:n})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=he(n),Zt(n,this.datalabelMode)}},pan:{enabled:!0,mode:"x",modifierKey:"shift",onPanComplete:({chart:n})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=he(n),Zt(n,this.datalabelMode)}},limits:{x:{minRange:36e5}}},pricingModeIcons:null},scales:{x:{type:"timeseries",time:{unit:"hour",displayFormats:{hour:"dd.MM HH:mm"},tooltipFormat:"dd.MM.yyyy HH:mm"},ticks:{color:this.getTextColor(),maxRotation:45,minRotation:45,font:{size:11},maxTicksLimit:20},grid:{color:this.getGridColor(),lineWidth:1}},"y-price":{type:"linear",position:"left",ticks:{color:"#2196F3",font:{size:11,weight:"500"},callback:n=>n.toFixed(2)+" Kč"},grid:{color:"rgba(33, 150, 243, 0.15)",lineWidth:1},title:{display:!0,text:"💰 Cena (Kč/kWh)",color:"#2196F3",font:{size:13,weight:"bold"}}},"y-solar":{type:"linear",position:"left",stacked:!0,ticks:{color:"#78909C",font:{size:11,weight:"500"},callback:n=>n.toFixed(1)+" kWh",display:!0},grid:{display:!0,color:"rgba(120, 144, 156, 0.15)",lineWidth:1,drawOnChartArea:!0},title:{display:!0,text:"🔋 Kapacita baterie (kWh)",color:"#78909C",font:{size:11,weight:"bold"}},beginAtZero:!1},"y-power":{type:"linear",position:"right",stacked:!0,ticks:{color:"#FFA726",font:{size:11,weight:"500"},callback:n=>n.toFixed(2)+" kW"},grid:{display:!1},title:{display:!0,text:"☀️ Výkon (kW)",color:"#FFA726",font:{size:13,weight:"bold"}}}}};kn(e);const r={type:"bar",data:{labels:t.labels,datasets:i},plugins:[Ln],options:e};try{this.chart=new Ui(this.canvas,r),Zt(this.chart,this.datalabelMode),t.initialZoomStart&&t.initialZoomEnd&&requestAnimationFrame(()=>{if(!this.chart)return;const n=this.chart.options;n.scales.x.min=t.initialZoomStart,n.scales.x.max=t.initialZoomEnd,this.chart.update("none"),this.currentDetailLevel=he(this.chart),Zt(this.chart,this.datalabelMode)}),b.info("[PricingChart] Chart created",{datasets:i.length,labels:t.labels.length,segments:t.modeSegments.length})}catch(n){b.error("[PricingChart] Failed to create chart",n)}}updateChartData(){var s;if(!this.chart||!this.data)return;const t=this.data,i=Sn(t),e=((s=this.chart.data.labels)==null?void 0:s.length)!==t.labels.length,r=this.chart.data.datasets.length!==i.length;e&&(this.chart.data.labels=t.labels);let n="none";r?(this.chart.data.datasets=i,n=void 0):i.forEach((l,c)=>{const u=this.chart.data.datasets[c];u&&(u.data=l.data,u.label=l.label,u.backgroundColor=l.backgroundColor,u.borderColor=l.borderColor)});const a=this.chart.options;a.plugins||(a.plugins={}),a.plugins.pricingModeIcons=null,kn(a),this.chart.update(n),b.debug("[PricingChart] Chart updated incrementally")}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(()=>{var t;(t=this.chart)==null||t.resize()}),this.resizeObserver.observe(this)}getTextColor(){try{return getComputedStyle(this).getPropertyValue("--oig-text-primary").trim()||"#e0e0e0"}catch{return"#e0e0e0"}}getGridColor(){try{return getComputedStyle(this).getPropertyValue("--oig-border").trim()||"rgba(255,255,255,0.1)"}catch{return"rgba(255,255,255,0.1)"}}setDatalabelMode(t){this.datalabelMode=t,this.dispatchEvent(new CustomEvent("datalabel-mode-change",{detail:{mode:t},bubbles:!0,composed:!0}))}get isZoomed(){return this.zoomState.start!==null||this.zoomState.end!==null}renderControls(){const t=i=>{const e=this.datalabelMode===i?"active":"";return i==="always"&&this.datalabelMode==="always"?`control-btn mode-always ${e}`:i==="never"&&this.datalabelMode==="never"?`control-btn mode-never ${e}`:`control-btn ${e}`};return d`
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
  `;Ee([p({type:Object})],Nt.prototype,"data",2);Ee([p({type:String})],Nt.prototype,"datalabelMode",2);Ee([x()],Nt.prototype,"zoomState",2);Ee([x()],Nt.prototype,"currentDetailLevel",2);Ee([Gi("#pricing-canvas")],Nt.prototype,"canvas",2);Nt=Ee([E("oig-pricing-chart")],Nt);var au=Object.defineProperty,su=Object.getOwnPropertyDescriptor,j=(t,i,e,r)=>{for(var n=r>1?void 0:r?su(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&au(i,e,n),n};const T=Z,ce=P`
  background: ${T(o.cardBg)};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${T(o.cardShadow)};
`,Wt=P`
  font-size: 15px;
  font-weight: 600;
  color: ${T(o.textPrimary)};
  margin: 0 0 12px 0;
`;function ou(t){return Math.max(0,Math.min(100,t))}function Cn(t){const r=Math.max(0,Math.min(1,(t-10)/60)),n={r:33,g:150,b:243},a={r:255,g:87,b:34},s=(l,c)=>Math.round(l+(c-l)*r);return`rgb(${s(n.r,a.r)}, ${s(n.g,a.g)}, ${s(n.b,a.b)})`}let ei=class extends M{constructor(){super(...arguments),this.collapsed=!0,this.busy=!1}toggle(){this.collapsed=!this.collapsed}async doAction(t,i){this.busy=!0;try{const e=await t();this.dispatchEvent(new CustomEvent("action-done",{detail:{success:e,label:i},bubbles:!0,composed:!0}))}finally{this.busy=!1}}render(){return d`
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
              @click=${()=>this.doAction(oo,"plan")}>
              Preplanovat (debug)
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(lo,"apply")}>
              Aplikovat rucne
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(co,"cancel")}>
              Zrusit plan
            </button>
          </div>
        </div>
      </div>
    `}};ei.styles=P`
    :host { display: block; }

    .panel {
      ${ce};
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
  `;j([x()],ei.prototype,"collapsed",2);j([x()],ei.prototype,"busy",2);ei=j([E("oig-boiler-debug-panel")],ei);let zi=class extends M{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return d`<div>Nacitani stavu...</div>`;const i=(e,r,n=1)=>e!=null?`${e.toFixed(n)} ${r}`:`-- ${r}`;return d`
      <h3>Stav bojleru</h3>
      <div class="grid">
        <div class="card">
          <div class="card-label">Nahrato</div>
          <div class="card-value">${i(t.heatingPercent,"%",0)}</div>
        </div>
        <div class="card">
          <div class="card-label">Teplota horni</div>
          <div class="card-value">${i(t.tempTop,"°C")}</div>
        </div>
        ${t.tempBottom!==null?d`
          <div class="card">
            <div class="card-label">Teplota spodni</div>
            <div class="card-value">${i(t.tempBottom,"°C")}</div>
          </div>
        `:I}
        <div class="card">
          <div class="card-label">Energie potrebna</div>
          <div class="card-value">${i(t.energyNeeded,"kWh",2)}</div>
        </div>
        <div class="card">
          <div class="card-label">Naklady planu</div>
          <div class="card-value">${i(t.planCost,"Kc",2)}</div>
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
    `}};zi.styles=P`
    :host { display: block; }

    h3 { ${Wt}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .card {
      ${ce};
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
  `;j([p({type:Object})],zi.prototype,"data",2);zi=j([E("oig-boiler-status-grid")],zi);let Ii=class extends M{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return I;const i=e=>`${e.toFixed(2)} kWh`;return d`
      <h3>Rozpad energie</h3>
      <div class="cards">
        <div class="card">
          <div class="card-label">Z FVE</div>
          <div class="card-value fve">${i(t.fveKwh)}</div>
        </div>
        <div class="card">
          <div class="card-label">Ze site</div>
          <div class="card-value grid-c">${i(t.gridKwh)}</div>
        </div>
        <div class="card">
          <div class="card-label">Alternativa</div>
          <div class="card-value alt">${i(t.altKwh)}</div>
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
    `}};Ii.styles=P`
    :host { display: block; }

    h3 { ${Wt}; }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .card {
      ${ce};
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
  `;j([p({type:Object})],Ii.prototype,"data",2);Ii=j([E("oig-boiler-energy-breakdown")],Ii);let Ai=class extends M{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return I;const i=t.peakHours.length?t.peakHours.map(n=>`${n}h`).join(", "):"--",e=t.waterLiters40c!==null?`${t.waterLiters40c.toFixed(0)} L`:"-- L",r=t.circulationNow.startsWith("ANO");return d`
      <h3>Planovane odbery</h3>
      <div class="list">
        <div class="item">
          <span class="label">Predpokladana spotreba:</span>
          <span class="value">${t.predictedTodayKwh.toFixed(2)} kWh</span>
        </div>
        <div class="item">
          <span class="label">Piky spotreby:</span>
          <span class="value">${i}</span>
        </div>
        <div class="item">
          <span class="label">Objem vody (40°C):</span>
          <span class="value">${e}</span>
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
    `}};Ai.styles=P`
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
  `;j([p({type:Object})],Ai.prototype,"data",2);Ai=j([E("oig-boiler-predicted-usage")],Ai);let ii=class extends M{constructor(){super(...arguments),this.plan=null,this.forecastWindows={fve:"--",grid:"--"}}render(){var r;const t=this.plan,i=this.forecastWindows,e=n=>n??"--";return d`
      <h3>Informace o planu</h3>
      <div class="rows">
        <div class="row">
          <span class="row-label">Mix zdroju:</span>
          <span class="row-value">${e(t==null?void 0:t.sourceDigest)}</span>
        </div>
        <div class="row">
          <span class="row-label">Slotu:</span>
          <span class="row-value">${((r=t==null?void 0:t.slots)==null?void 0:r.length)??"--"}</span>
        </div>
        <div class="row">
          <span class="row-label">Topeni aktivni:</span>
          <span class="row-value">${e(t==null?void 0:t.activeSlotCount)}</span>
        </div>
        <div class="row">
          <span class="row-label">Nejlevnejsi spot:</span>
          <span class="row-value">${e(t==null?void 0:t.cheapestSpot)}</span>
        </div>
        <div class="row">
          <span class="row-label">Nejdrazsi spot:</span>
          <span class="row-value">${e(t==null?void 0:t.mostExpensiveSpot)}</span>
        </div>
        <div class="row">
          <span class="row-label">FVE okna (forecast):</span>
          <span class="row-value">${i.fve}</span>
        </div>
        <div class="row">
          <span class="row-label">Grid okna (forecast):</span>
          <span class="row-value">${i.grid}</span>
        </div>
        <div class="row">
          <span class="row-label">Od:</span>
          <span class="row-value">${e(t==null?void 0:t.planStart)}</span>
        </div>
        <div class="row">
          <span class="row-label">Do:</span>
          <span class="row-value">${e(t==null?void 0:t.planEnd)}</span>
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
  `;j([p({type:Object})],ii.prototype,"plan",2);j([p({type:Object})],ii.prototype,"forecastWindows",2);ii=j([E("oig-boiler-plan-info")],ii);let ri=class extends M{constructor(){super(...arguments),this.boilerState=null,this.targetTemp=60}render(){const t=this.boilerState;if(!t)return d`<div>Nacitani...</div>`;const i=10,e=70,r=m=>ou((m-i)/(e-i)*100),n=t.heatingPercent??0,a=t.tempTop!==null?r(t.tempTop):null,s=t.tempBottom!==null?r(t.tempBottom):null,l=r(this.targetTemp),c=Cn(t.tempTop??this.targetTemp),u=Cn(t.tempBottom??10),h=`linear-gradient(180deg, ${c} 0%, ${u} 100%)`,f=t.heatingPercent!==null?`${t.heatingPercent.toFixed(0)}% nahrato`:"-- % nahrato";return d`
      <h3>Vizualizace bojleru</h3>

      <div class="tank-wrapper">
        <div class="temp-scale">
          ${[70,60,50,40,30,20,10].map(m=>d`<span>${m}°C</span>`)}
        </div>

        <div class="tank">
          <div class="water" style="height:${n}%; background:${h}"></div>

          <div class="target-line" style="bottom:${l}%">
            <span class="target-label">Cil</span>
          </div>

          ${a!==null?d`
            <div class="sensor top" style="bottom:${a}%">
              <span class="sensor-label">${t.tempTop.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:I}

          ${s!==null?d`
            <div class="sensor bottom" style="bottom:${s}%">
              <span class="sensor-label">${t.tempBottom.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:I}
        </div>
      </div>

      <div class="grade-label">${f}</div>
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
  `;j([p({type:Object})],ri.prototype,"boilerState",2);j([p({type:Number})],ri.prototype,"targetTemp",2);ri=j([E("oig-boiler-tank")],ri);let ni=class extends M{constructor(){super(...arguments),this.current="",this.available=[]}onChange(t){const i=t.target.value;this.dispatchEvent(new CustomEvent("category-change",{detail:{category:i},bubbles:!0,composed:!0}))}render(){const t=this.available.length?this.available:Object.keys(Jr);return d`
      <div class="row">
        <label>Profil:</label>
        <select @change=${this.onChange}>
          ${t.map(i=>d`
            <option value=${i} ?selected=${i===this.current}>
              ${Jr[i]||i}
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
  `;j([p({type:String})],ni.prototype,"current",2);j([p({type:Array})],ni.prototype,"available",2);ni=j([E("oig-boiler-category-select")],ni);let Li=class extends M{constructor(){super(...arguments),this.data=[]}render(){if(!this.data.length)return I;const t=this.data.flatMap(s=>s.hours),i=Math.max(...t,.1),e=i*.3,r=i*.7,n=Array.from({length:24},(s,l)=>l),a=s=>s===0?"none":s<e?"low":s<r?"medium":"high";return d`
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
    `}};Li.styles=P`
    :host { display: block; }

    h3 { ${Wt}; }

    .wrapper {
      ${ce};
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
  `;j([p({type:Array})],Li.prototype,"data",2);Li=j([E("oig-boiler-heatmap-grid")],Li);let Bi=class extends M{constructor(){super(...arguments),this.plan=null}render(){const t=this.plan,i=(e,r=2)=>e!=null?e.toFixed(r):"-";return d`
      <div class="grid">
        <div class="card">
          <div class="card-title">Celkova spotreba dnes</div>
          <div class="card-value total">${i(t==null?void 0:t.totalConsumptionKwh)} kWh</div>
        </div>
        <div class="card">
          <div class="card-title">Z FVE</div>
          <div class="card-value fve">${i(t==null?void 0:t.fveKwh)} kWh</div>
        </div>
        <div class="card">
          <div class="card-title">Ze site</div>
          <div class="card-value grid-c">${i(t==null?void 0:t.gridKwh)} kWh</div>
        </div>
        <div class="card">
          <div class="card-title">Odhadovana cena</div>
          <div class="card-value cost">${i(t==null?void 0:t.estimatedCostCzk)} Kc</div>
        </div>
      </div>
    `}};Bi.styles=P`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .card {
      ${ce};
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
  `;j([p({type:Object})],Bi.prototype,"plan",2);Bi=j([E("oig-boiler-stats-cards")],Bi);let Fi=class extends M{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return I;const i=Math.max(...t.hourlyAvg,.01),e=new Set(t.peakHours),r=t.peakHours.length?t.peakHours.map(a=>`${a}h`).join(", "):"--",n=t.confidence!==null?`${Math.round(t.confidence*100)} %`:"-- %";return d`
      <h3>Profil spotreby (tyden)</h3>
      <div class="wrapper">
        <div class="chart">
          ${t.hourlyAvg.map((a,s)=>{const l=i>0?a/i*100:0,c=e.has(s);return d`
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
    `}};Fi.styles=P`
    :host { display: block; }

    h3 { ${Wt}; }

    .wrapper {
      ${ce};
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
  `;j([p({type:Object})],Fi.prototype,"data",2);Fi=j([E("oig-boiler-profiling")],Fi);let Ni=class extends M{constructor(){super(...arguments),this.config=null}render(){const t=this.config;if(!t)return I;const i=(e,r="")=>e!=null?`${e}${r?" "+r:""}`:`--${r?" "+r:""}`;return d`
      <h3>Profil bojleru</h3>
      <div class="grid">
        <div class="card">
          <div class="card-label">Objem</div>
          <div class="card-value">${i(t.volumeL,"L")}</div>
        </div>
        <div class="card">
          <div class="card-label">Vykon topeni</div>
          <div class="card-value">${i(t.heaterPowerW,"W")}</div>
        </div>
        <div class="card">
          <div class="card-label">Cilova teplota</div>
          <div class="card-value">${i(t.targetTempC,"°C")}</div>
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
    `}};Ni.styles=P`
    :host { display: block; }

    h3 { ${Wt}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .card {
      ${ce};
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
  `;j([p({type:Object})],Ni.prototype,"config",2);Ni=j([E("oig-boiler-config-section")],Ni);let Ri=class extends M{constructor(){super(...arguments),this.state=null}render(){return this.state?d`
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
    `:d`<div>Nacitani...</div>`}};Ri.styles=P`
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
  `;j([p({type:Object})],Ri.prototype,"state",2);Ri=j([E("oig-boiler-state")],Ri);let Hi=class extends M{constructor(){super(...arguments),this.data=[]}render(){return I}};Hi.styles=P`
    :host { display: block; }
  `;j([p({type:Array})],Hi.prototype,"data",2);Hi=j([E("oig-boiler-heatmap")],Hi);let ai=class extends M{constructor(){super(...arguments),this.profiles=[],this.editMode=!1}render(){return I}};ai.styles=P`
    :host { display: block; }
  `;j([p({type:Array})],ai.prototype,"profiles",2);j([p({type:Boolean})],ai.prototype,"editMode",2);ai=j([E("oig-boiler-profiles")],ai);var lu=Object.defineProperty,cu=Object.getOwnPropertyDescriptor,bt=(t,i,e,r)=>{for(var n=r>1?void 0:r?cu(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&lu(i,e,n),n};const _t=Z,Mr=P`
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
`;let Se=class extends M{constructor(){super(...arguments),this.value="home_1",this.disabled=!1,this.buttonStates={home_1:"idle",home_2:"idle",home_3:"idle",home_ups:"idle",home_5:"idle",home_6:"idle"}}onModeClick(t){const i=this.buttonStates[t];this.disabled||i==="active"||i==="pending"||i==="processing"||i==="disabled-by-service"||this.dispatchEvent(new CustomEvent("mode-change",{detail:{mode:t},bubbles:!0}))}render(){return d`
      <div class="selector-label">
        Re\u017Eim st\u0159\u00EDda\u010De
      </div>
      <div class="mode-buttons">
        ${["home_1","home_2","home_3","home_ups","home_5","home_6"].map(i=>{const e=this.buttonStates[i],r=this.disabled||e==="pending"||e==="processing"||e==="disabled-by-service";return d`
            <button
              class="mode-btn ${e}"
              ?disabled=${r}
              @click=${()=>this.onModeClick(i)}
            >
              ${Yn[i]}
              ${e==="pending"?d`<span style="font-size:10px"> \u23F3</span>`:""}
              ${e==="processing"?d`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};Se.styles=[Mr];bt([p({type:String})],Se.prototype,"value",2);bt([p({type:Boolean})],Se.prototype,"disabled",2);bt([p({type:Object})],Se.prototype,"buttonStates",2);Se=bt([E("oig-box-mode-selector")],Se);let ee=class extends M{constructor(){super(...arguments),this.value="off",this.limit=0,this.disabled=!1,this.buttonStates={off:"idle",on:"idle",limited:"idle"}}onDeliveryClick(t){const i=this.buttonStates[t];this.disabled||i==="active"||i==="pending"||i==="processing"||i==="disabled-by-service"||this.dispatchEvent(new CustomEvent("delivery-change",{detail:{value:t,limit:t==="limited"?this.limit:null},bubbles:!0}))}onLimitInput(t){const i=t.target;this.limit=parseInt(i.value,10)||0,this.dispatchEvent(new CustomEvent("limit-change",{detail:{limit:this.limit},bubbles:!0}))}get showLimitInput(){return this.value==="limited"||this.buttonStates.limited==="active"}render(){const t=[{value:"off",label:Si.off},{value:"on",label:Si.on},{value:"limited",label:Si.limited}],i=this.buttonStates.limited,e=i==="pending"?"pending-border":i==="processing"?"processing-border":"";return d`
      <div class="selector-label">
        Dod\u00E1vka do s\u00EDt\u011B
      </div>
      <div class="mode-buttons">
        ${t.map(r=>{const n=this.buttonStates[r.value],a=this.disabled||n==="pending"||n==="processing"||n==="disabled-by-service";return d`
            <button
              class="mode-btn ${n}"
              ?disabled=${a}
              @click=${()=>this.onDeliveryClick(r.value)}
            >
              ${r.label}
              ${n==="pending"?d`<span style="font-size:10px"> \u23F3</span>`:""}
              ${n==="processing"?d`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>

      ${this.showLimitInput?d`
        <div class="limit-input-container">
          <input
            type="number"
            class="limit-input ${e}"
            .value=${String(this.limit)}
            min="0"
            step="100"
            @input=${this.onLimitInput}
            ?disabled=${this.disabled}
          />
          <span class="limit-unit">W</span>
        </div>
      `:null}
    `}};ee.styles=[Mr,P`
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
    `];bt([p({type:String})],ee.prototype,"value",2);bt([p({type:Number})],ee.prototype,"limit",2);bt([p({type:Boolean})],ee.prototype,"disabled",2);bt([p({type:Object})],ee.prototype,"buttonStates",2);ee=bt([E("oig-grid-delivery-selector")],ee);let Ce=class extends M{constructor(){super(...arguments),this.value="cbb",this.disabled=!1,this.buttonStates={cbb:"idle",manual:"idle"}}onModeClick(t){const i=this.buttonStates[t];this.disabled||i==="active"||i==="pending"||i==="processing"||i==="disabled-by-service"||this.dispatchEvent(new CustomEvent("boiler-mode-change",{detail:{mode:t},bubbles:!0}))}render(){return d`
      <div class="selector-label">
        Re\u017Eim bojleru
      </div>
      <div class="mode-buttons">
        ${["cbb","manual"].map(i=>{const e=this.buttonStates[i],r=this.disabled||e==="pending"||e==="processing"||e==="disabled-by-service";return d`
            <button
              class="mode-btn ${e}"
              ?disabled=${r}
              @click=${()=>this.onModeClick(i)}
            >
              ${Gn[i]} ${Un[i]}
              ${e==="pending"?d`<span style="font-size:10px"> \u23F3</span>`:""}
              ${e==="processing"?d`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};Ce.styles=[Mr];bt([p({type:String})],Ce.prototype,"value",2);bt([p({type:Boolean})],Ce.prototype,"disabled",2);bt([p({type:Object})],Ce.prototype,"buttonStates",2);Ce=bt([E("oig-boiler-mode-selector")],Ce);var du=Object.defineProperty,uu=Object.getOwnPropertyDescriptor,Oe=(t,i,e,r)=>{for(var n=r>1?void 0:r?uu(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&du(i,e,n),n};const mt=Z;let Rt=class extends M{constructor(){super(...arguments),this.items=[],this.expanded=!1,this.shieldStatus="idle",this.queueCount=0,this._now=Date.now(),this.updateInterval=null}connectedCallback(){super.connectedCallback(),this.updateInterval=window.setInterval(()=>{this._now=Date.now()},1e3)}disconnectedCallback(){super.disconnectedCallback(),this.updateInterval!==null&&clearInterval(this.updateInterval)}toggleExpanded(){this.expanded=!this.expanded}removeItem(t,i){i.stopPropagation(),this.dispatchEvent(new CustomEvent("remove-item",{detail:{position:t},bubbles:!0}))}formatServiceName(t){return Eo[t]||t||"N/A"}formatChanges(t){return!t||t.length===0?"N/A":t.map(i=>{const e=i.indexOf("→");if(e===-1)return i;const r=i.slice(0,e).trim(),n=i.slice(e+1).trim(),a=r.indexOf(":"),s=a===-1?r:r.slice(a+1),l=(hn[s.replace(/'/g,"").trim()]||s).replace(/'/g,"").trim(),c=(hn[n.replace(/'/g,"").trim()]||n).replace(/'/g,"").trim();return`${l} → ${c}`}).join(", ")}formatTimestamp(t){if(!t)return{time:"--",duration:"--"};try{const i=new Date(t),e=new Date(this._now),r=Math.floor((e.getTime()-i.getTime())/1e3),n=String(i.getHours()).padStart(2,"0"),a=String(i.getMinutes()).padStart(2,"0");let s=`${n}:${a}`;if(i.toDateString()!==e.toDateString()){const c=i.getDate(),u=i.getMonth()+1;s=`${c}.${u}. ${s}`}let l;if(r<60)l=`${r}s`;else if(r<3600){const c=Math.floor(r/60),u=r%60;l=`${c}m ${u}s`}else{const c=Math.floor(r/3600),u=Math.floor(r%3600/60);l=`${c}h ${u}m`}return{time:s,duration:l}}catch{return{time:"--",duration:"--"}}}get activeCount(){return this.items.length}render(){this._now;const t=this.shieldStatus==="running"?"running":"idle",i=this.shieldStatus==="running"?"🔄 Zpracovává":"✓ Připraveno";return d`
      <div class="queue-header" @click=${this.toggleExpanded}>
        <div class="queue-title-area">
          <span class="queue-title">Shield fronta</span>
          ${this.activeCount>0?d`
            <span class="queue-count">(${this.activeCount} aktivn\u00EDch)</span>
          `:I}
          <span class="shield-status ${t}">${i}</span>
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
                ${this.items.map((e,r)=>this.renderRow(e,r))}
              </tbody>
            </table>
          `}
        </div>
      `:I}
    `}renderRow(t,i){const e=t.status==="running",{time:r,duration:n}=this.formatTimestamp(t.createdAt);return d`
      <tr>
        <td class="${e?"status-running":"status-queued"}">
          ${e?"🔄 Zpracovává se":"⏳ Čeká"}
        </td>
        <td>${this.formatServiceName(t.service)}</td>
        <td class="hide-mobile" style="font-size: 11px;">${this.formatChanges(t.changes)}</td>
        <td class="queue-time">${r}</td>
        <td class="queue-time duration">${n}</td>
        <td style="text-align: center;">
          ${e?d`<span style="opacity: 0.4;">\u2014</span>`:d`
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
  `;Oe([p({type:Array})],Rt.prototype,"items",2);Oe([p({type:Boolean})],Rt.prototype,"expanded",2);Oe([p({type:String})],Rt.prototype,"shieldStatus",2);Oe([p({type:Number})],Rt.prototype,"queueCount",2);Oe([x()],Rt.prototype,"_now",2);Rt=Oe([E("oig-shield-queue")],Rt);var pu=Object.defineProperty,hu=Object.getOwnPropertyDescriptor,bi=(t,i,e,r)=>{for(var n=r>1?void 0:r?hu(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&pu(i,e,n),n};const pt=Z;let ie=class extends M{constructor(){super(...arguments),this.open=!1,this.config={title:"",message:""},this.acknowledged=!1,this.limitValue=5e3,this.resolver=null,this.onOverlayClick=()=>{this.closeDialog({confirmed:!1})},this.onDialogClick=t=>{t.stopPropagation()},this.onKeyDown=t=>{t.key==="Escape"&&this.open&&this.closeDialog({confirmed:!1})},this.onAckChange=t=>{this.acknowledged=t.target.checked},this.onLimitInput=t=>{this.limitValue=parseInt(t.target.value,10)||0},this.onCancel=()=>{this.closeDialog({confirmed:!1})},this.onConfirm=()=>{if(this.config.showLimitInput){const t=this.config.limitMin??1,i=this.config.limitMax??2e4;if(isNaN(this.limitValue)||this.limitValue<t||this.limitValue>i)return}this.closeDialog({confirmed:!0,limit:this.config.showLimitInput?this.limitValue:void 0})}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeyDown)}showDialog(t){return this.config=t,this.acknowledged=!1,this.limitValue=t.limitValue??5e3,this.open=!0,new Promise(i=>{this.resolver=i})}closeDialog(t){var i;this.open=!1,(i=this.resolver)==null||i.call(this,t),this.resolver=null}get canConfirm(){return!(this.config.requireAcknowledgement&&!this.acknowledged)}render(){if(!this.open)return I;const t=this.config;return d`
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
          `:I}

          ${t.warning?d`
            <div class="dialog-warning">
              \u26A0\uFE0F ${this.renderHTML(t.warning)}
            </div>
          `:I}

          ${t.requireAcknowledgement?d`
            <div class="ack-wrapper" @click=${()=>{this.acknowledged=!this.acknowledged}}>
              <input
                type="checkbox"
                .checked=${this.acknowledged}
                @change=${this.onAckChange}
                @click=${i=>i.stopPropagation()}
              />
              <label>
                ${t.acknowledgementText||d`
                  <strong>Souhlas\u00EDm</strong> s t\u00EDm, \u017Ee m\u011Bn\u00EDm nastaven\u00ED na vlastn\u00ED odpov\u011Bdnost.
                  Aplikace nenese odpov\u011Bdnost za p\u0159\u00EDpadn\u00E9 negativn\u00ED d\u016Fsledky t\u00E9to zm\u011Bny.
                `}
              </label>
            </div>
          `:I}

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
    `}renderHTML(t){const i=document.createElement("div");return i.innerHTML=t,d`<span .innerHTML=${t}></span>`}};ie.styles=P`
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
  `;bi([p({type:Boolean,reflect:!0})],ie.prototype,"open",2);bi([p({type:Object})],ie.prototype,"config",2);bi([x()],ie.prototype,"acknowledged",2);bi([x()],ie.prototype,"limitValue",2);ie=bi([E("oig-confirm-dialog")],ie);var gu=Object.defineProperty,fu=Object.getOwnPropertyDescriptor,ya=(t,i,e,r)=>{for(var n=r>1?void 0:r?fu(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&gu(i,e,n),n};const Ue=Z;let Wi=class extends M{constructor(){super(...arguments),this.shieldState=null}render(){if(!this.shieldState)return I;const t=this.determineStatus(this.shieldState),i=t.toLowerCase(),e=this.getStatusIcon(t),r=this.getStatusLabel(t),a=this.shieldState.queueCount>0?"has-items":"";return d`
      <div class="shield-status-container">
        <div class="shield-status-left">
          <span class="shield-status-icon">${e}</span>
          <div class="shield-status-info">
            <span class="shield-status-title">Shield ochrana</span>
            <span class="shield-status-subtitle">${this.getActivityText()}</span>
          </div>
        </div>
        <div class="shield-status-right">
          <span class="queue-count ${a}">
            Fronta: ${this.shieldState.queueCount}
          </span>
          <span class="shield-status-badge ${i}">${r}</span>
        </div>
      </div>
    `}determineStatus(t){return t.status==="running"?"processing":t.queueCount>0?"pending":"idle"}getStatusIcon(t){switch(t){case"idle":return"✓";case"pending":return"⏳";case"processing":return"🔄";default:return"✓"}}getStatusLabel(t){switch(t){case"idle":return"Připraveno";case"pending":return"Čeká";case"processing":return"Zpracovává";default:return"Neznámý"}}getActivityText(){return this.shieldState?this.shieldState.activity?this.shieldState.activity:this.shieldState.queueCount>0?`${this.shieldState.queueCount} operací ve frontě`:"Systém připraven":"Žádná aktivita"}};Wi.styles=P`
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
  `;ya([p({type:Object})],Wi.prototype,"shieldState",2);Wi=ya([E("oig-shield-status")],Wi);var mu=Object.defineProperty,bu=Object.getOwnPropertyDescriptor,Er=(t,i,e,r)=>{for(var n=r>1?void 0:r?bu(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&mu(i,e,n),n};const pe=Z;let si=class extends M{constructor(){super(...arguments),this.shieldState={...Kn,pendingServices:new Map,changingServices:new Set},this.unsubscribe=null,this.onShieldUpdate=t=>{this.shieldState=t}}connectedCallback(){super.connectedCallback(),this.unsubscribe=X.subscribe(this.onShieldUpdate)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this.unsubscribe)==null||t.call(this),this.unsubscribe=null}get boxModeButtonStates(){return{home_1:X.getBoxModeButtonState("home_1"),home_2:X.getBoxModeButtonState("home_2"),home_3:X.getBoxModeButtonState("home_3"),home_ups:X.getBoxModeButtonState("home_ups"),home_5:X.getBoxModeButtonState("home_5"),home_6:X.getBoxModeButtonState("home_6")}}get gridDeliveryButtonStates(){return{off:X.getGridDeliveryButtonState("off"),on:X.getGridDeliveryButtonState("on"),limited:X.getGridDeliveryButtonState("limited")}}get boilerModeButtonStates(){return{cbb:X.getBoilerModeButtonState("cbb"),manual:X.getBoilerModeButtonState("manual")}}async onBoxModeChange(t){const{mode:i}=t.detail,e=Yn[i];if(b.debug("Control panel: box mode change requested",{mode:i}),!(await this.confirmDialog.showDialog({title:"Změna režimu střídače",message:`Chystáte se změnit režim boxu na <strong>"${e}"</strong>.<br><br>Tato změna ovlivní chování celého systému a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!X.shouldProceedWithQueue())return;await X.setBoxMode(i)||b.warn("Box mode change failed or already active",{mode:i})}async onGridDeliveryChange(t){const{value:i,limit:e}=t.detail,r=Si[i],n=To[i],a=i==="limited",s=this.shieldState.currentGridLimit||5e3;b.debug("Control panel: grid delivery change requested",{delivery:i,limit:e});const l={title:`${n} Změna dodávky do sítě`,message:`Chystáte se změnit dodávku do sítě na: <strong>"${r}"</strong>`,warning:a?"Režim a limit budou změněny postupně (serializováno). Každá změna může trvat až 10 minut.":"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,acknowledgementText:"<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost. Aplikace nenese odpovědnost za případné negativní důsledky této změny.",confirmText:"Potvrdit změnu",cancelText:"Zrušit",showLimitInput:a,limitValue:s,limitMin:1,limitMax:2e4,limitStep:100},c=await this.confirmDialog.showDialog(l);if(!c.confirmed||!X.shouldProceedWithQueue())return;const u=this.shieldState.currentGridDelivery==="limited",h=i==="limited";u&&h&&c.limit!=null?await X.setGridDelivery(i,c.limit):h&&c.limit!=null?await X.setGridDelivery(i,c.limit):await X.setGridDelivery(i)}async onBoilerModeChange(t){const{mode:i}=t.detail,e=Un[i],r=Gn[i];if(b.debug("Control panel: boiler mode change requested",{mode:i}),!(await this.confirmDialog.showDialog({title:"Změna režimu bojleru",message:`Chystáte se změnit režim bojleru na <strong>"${r} ${e}"</strong>.<br><br>Tato změna ovlivní chování ohřevu vody a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!X.shouldProceedWithQueue())return;await X.setBoilerMode(i)||b.warn("Boiler mode change failed or already active",{mode:i})}async onQueueRemoveItem(t){const{position:i}=t.detail;b.debug("Control panel: queue remove requested",{position:i});const e=this.shieldState.allRequests.find(s=>s.position===i);let r="Operace";if(e&&(e.service.includes("set_box_mode")?r=`Změna režimu na ${e.targetValue||"neznámý"}`:e.service.includes("set_grid_delivery")?r=`Změna dodávky do sítě na ${e.targetValue||"neznámý"}`:e.service.includes("set_boiler_mode")&&(r=`Změna režimu bojleru na ${e.targetValue||"neznámý"}`)),!(await this.confirmDialog.showDialog({title:r,message:"Operace bude odstraněna z fronty bez provedení.",requireAcknowledgement:!1,confirmText:"OK",cancelText:"Zrušit"})).confirmed)return;await X.removeFromQueue(i)||b.warn("Failed to remove from queue",{position:i})}render(){const t=this.shieldState,i=t.status==="running"?"running":"idle",e=t.status==="running"?"Zpracovává":"Připraveno",r=t.allRequests.length>0;return d`
      <div class="control-panel">
        <div class="panel-header">
          <span class="panel-title">
            \u{1F6E1}\uFE0F Ovl\u00E1dac\u00ED panel
          </span>
          <span class="panel-status ${i}">
            ${t.status==="running"?"🔄 ":"✓ "}${e}
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
        `:I}
      </div>

      <!-- Shared confirm dialog instance -->
      <oig-confirm-dialog></oig-confirm-dialog>
    `}};si.styles=P`
    :host {
      display: block;
      margin-top: 16px;
    }

    .control-panel {
      background: ${pe(o.cardBg)};
      border-radius: 16px;
      box-shadow: ${pe(o.cardShadow)};
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid ${pe(o.divider)};
    }

    .panel-title {
      font-size: 15px;
      font-weight: 600;
      color: ${pe(o.textPrimary)};
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
      background: ${pe(o.divider)};
      margin: 16px 0;
    }

    .queue-section {
      border-top: 1px solid ${pe(o.divider)};
    }

    @media (max-width: 480px) {
      .panel-body {
        padding: 12px 14px;
      }
    }
  `;Er([x()],si.prototype,"shieldState",2);Er([Gi("oig-confirm-dialog")],si.prototype,"confirmDialog",2);si=Er([E("oig-control-panel")],si);var yu=Object.defineProperty,vu=Object.getOwnPropertyDescriptor,De=(t,i,e,r)=>{for(var n=r>1?void 0:r?vu(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&yu(i,e,n),n};const ht=Z;let Ht=class extends M{constructor(){super(...arguments),this.open=!1,this.currentSoc=0,this.maxSoc=100,this.estimate=null,this.targetSoc=80}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onSliderInput(t){this.targetSoc=parseInt(t.target.value,10),this.dispatchEvent(new CustomEvent("soc-change",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}onConfirm(){this.dispatchEvent(new CustomEvent("confirm",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}render(){return d`
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
  `;De([p({type:Boolean})],Ht.prototype,"open",2);De([p({type:Number})],Ht.prototype,"currentSoc",2);De([p({type:Number})],Ht.prototype,"maxSoc",2);De([p({type:Object})],Ht.prototype,"estimate",2);De([x()],Ht.prototype,"targetSoc",2);Ht=De([E("oig-battery-charge-dialog")],Ht);var xu=Object.defineProperty,wu=Object.getOwnPropertyDescriptor,St=(t,i,e,r)=>{for(var n=r>1?void 0:r?wu(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&xu(i,e,n),n};const cr=Z,Or=P`
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
      background: ${cr(o.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${cr(o.cardShadow)};
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
      color: ${cr(o.textPrimary)};
    }

    ${Or}
  `;St([p({type:String})],oi.prototype,"title",2);St([p({type:String})],oi.prototype,"icon",2);oi=St([E("oig-analytics-block")],oi);let ji=class extends M{constructor(){super(...arguments),this.data=null}render(){if(!this.data)return d`<div>Načítání...</div>`;const t=this.data.trend>=0?"positive":"negative",i=this.data.trend>=0?"+":"",e=this.data.period==="last_month"?"Minulý měsíc":`Aktuální měsíc (${this.data.currentMonthDays} dní)`;return d`
      <div class="efficiency-value">${ve(this.data.efficiency,1)}</div>
      <div class="period-label">${e}</div>

      ${this.data.trend!==0?d`
        <div class="comparison ${t}">
          ${i}${ve(this.data.trend)} vs minulý měsíc
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
    `}};ji.styles=P`
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
  `;St([p({type:Object})],ji.prototype,"data",2);ji=St([E("oig-battery-efficiency")],ji);let qi=class extends M{constructor(){super(...arguments),this.data=null}renderSparkline(){var c;const t=(c=this.data)==null?void 0:c.measurementHistory;if(!t||t.length<2)return null;const i=t.map(u=>u.soh_percent),e=Math.min(...i)-1,n=Math.max(...i)+1-e||1,a=200,s=40,l=i.map((u,h)=>{const f=h/(i.length-1)*a,w=s-(u-e)/n*s;return`${f},${w}`}).join(" ");return d`
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
    `:d`<div>Načítání...</div>`}};qi.styles=P`
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

    ${Or}

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
  `;St([p({type:Object})],qi.prototype,"data",2);qi=St([E("oig-battery-health")],qi);let Vi=class extends M{constructor(){super(...arguments),this.data=null}getProgressClass(t){return t==null?"ok":t>=95?"overdue":t>=80?"due-soon":"ok"}render(){return this.data?d`
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
          <span class="metric-value">${et(this.data.cost)}</span>
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
            <span class="metric-value">${et(this.data.estimatedNextCost)}</span>
          </div>
        `:null}
      </oig-analytics-block>
    `:d`<div>Načítání...</div>`}};Vi.styles=P`
    :host { display: block; }
    ${Or}

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
  `;St([p({type:Object})],Vi.prototype,"data",2);Vi=St([E("oig-battery-balancing")],Vi);let Yi=class extends M{constructor(){super(...arguments),this.data=null}render(){return this.data?d`
      <oig-analytics-block title="Porovnání nákladů" icon="💰">
        <div class="cost-row">
          <span class="cost-label">Skutečné náklady</span>
          <span class="cost-value">${et(this.data.actualSpent)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Plán celkem</span>
          <span class="cost-value">${et(this.data.planTotalCost)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Zbývající plán</span>
          <span class="cost-value">${et(this.data.futurePlanCost)}</span>
        </div>
        ${this.data.tomorrowCost!=null?d`
          <div class="cost-row">
            <span class="cost-label">Zítra odhad</span>
            <span class="cost-value">${et(this.data.tomorrowCost)}</span>
          </div>
        `:null}

        ${this.data.yesterdayActualCost!=null?d`
          <div class="yesterday-section">
            <div class="section-label">Včera</div>
            <div class="cost-row">
              <span class="cost-label">Plán</span>
              <span class="cost-value">${this.data.yesterdayPlannedCost!=null?et(this.data.yesterdayPlannedCost):"—"}</span>
            </div>
            <div class="cost-row">
              <span class="cost-label">Skutečnost</span>
              <span class="cost-value">${et(this.data.yesterdayActualCost)}</span>
            </div>
            ${this.data.yesterdayDelta!=null?d`
              <div class="cost-row">
                <span class="cost-label">Rozdíl</span>
                <span class="cost-value ${this.data.yesterdayDelta<=0?"delta-positive":"delta-negative"}">
                  ${this.data.yesterdayDelta>=0?"+":""}${et(this.data.yesterdayDelta)}
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
    `:d`<div>Načítání...</div>`}};Yi.styles=P`
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
  `;St([p({type:Object})],Yi.prototype,"data",2);Yi=St([E("oig-cost-comparison")],Yi);var $u=Object.defineProperty,_u=Object.getOwnPropertyDescriptor,ze=(t,i,e,r)=>{for(var n=r>1?void 0:r?_u(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&$u(i,e,n),n};const ge=Z;let li=class extends M{constructor(){super(...arguments),this.data=Ze,this.compact=!1,this.onClick=()=>{this.dispatchEvent(new CustomEvent("badge-click",{bubbles:!0}))}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.onClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.onClick)}render(){const t=this.data.effectiveSeverity,i=Ti[t]??Ti[0],e=this.data.warningsCount>0&&t>0,r=e?Hn(this.data.eventType):"✓";return d`
      <style>
        :host { background: ${ge(i)}; }
      </style>
      <span class="badge-icon">${r}</span>
      ${e?d`
        <span class="badge-count">${this.data.warningsCount}</span>
      `:null}
      <span class="badge-label">${e?Wn[t]??"Výstraha":"OK"}</span>
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
  `;ze([p({type:Object})],li.prototype,"data",2);ze([p({type:Boolean})],li.prototype,"compact",2);li=ze([E("oig-chmu-badge")],li);let ci=class extends M{constructor(){super(...arguments),this.open=!1,this.data=Ze}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}formatTime(t){return t?new Date(t).toLocaleString("cs-CZ"):"—"}renderWarning(t){const i=Ti[t.severity]??Ti[2],e=Hn(t.event_type),r=Wn[t.severity]??"Neznámá";return d`
      <div class="warning-item" style="background: ${i}">
        <div class="warning-header">
          <span class="warning-icon">${e}</span>
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
    `}render(){const t=this.data.allWarnings,i=t.length>0&&this.data.effectiveSeverity>0;return d`
      <div class="modal" @click=${e=>e.stopPropagation()}>
        <div class="modal-header">
          <span class="modal-title">⚠️ ČHMÚ výstrahy</span>
          <button class="close-btn" @click=${this.onClose}>✕</button>
        </div>

        ${i?t.map(e=>this.renderWarning(e)):d`
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
      background: ${ge(o.cardBg)};
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
      color: ${ge(o.textPrimary)};
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      font-size: 20px;
      cursor: pointer;
      color: ${ge(o.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${ge(o.bgSecondary)};
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
      color: ${ge(o.textSecondary)};
    }

    .eta-badge {
      display: inline-block;
      font-size: 10px;
      padding: 1px 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      margin-left: 6px;
    }
  `;ze([p({type:Boolean,reflect:!0})],ci.prototype,"open",2);ze([p({type:Object})],ci.prototype,"data",2);ci=ze([E("oig-chmu-modal")],ci);var ku=Object.defineProperty,Su=Object.getOwnPropertyDescriptor,At=(t,i,e,r)=>{for(var n=r>1?void 0:r?Su(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&ku(i,e,n),n};const F=Z;let re=class extends M{constructor(){super(...arguments),this.open=!1,this.activeTab="today",this.data=null,this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.open&&this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onTabClick(t){this.activeTab=t,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:t},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(t){return`${t.toFixed(0)}%`}adherenceColor(t){return t>=90?"#4caf50":t>=70?"#ff9800":"#f44336"}getModeConfig(t){return jn[t]??{icon:"❓",color:"#666",label:t}}renderModeBlock(t){const i=this.getModeConfig(t.modePlanned||t.modeHistorical),e=t.status==="current";return d`
      <div
        class="mode-block ${e?"current":""}"
        style="background: ${i.color}; flex: ${Math.max(t.durationHours,.5)}"
        title="${t.startTime}–${t.endTime} | ${i.label}"
      >
        ${t.modeMatch?null:d`<span class="mode-mismatch">!</span>`}
        <span class="mode-icon">${i.icon}</span>
        <span class="mode-name">${i.label}</span>
        <span class="mode-time">${t.startTime}–${t.endTime}</span>
        ${t.costPlanned!=null?d`
          <span class="mode-cost">${et(t.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(t,i){const e=i.unit==="Kč"?et(i.plan):`${i.plan.toFixed(1)} ${i.unit}`;let r="",n="";return i.hasActual&&i.actual!=null&&(n=i.unit==="Kč"?et(i.actual):`${i.actual.toFixed(1)} ${i.unit}`,i.unit==="Kč"?r=i.actual<=i.plan?"better":"worse":r=i.actual>=i.plan?"better":"worse"),d`
      <div class="metric-tile">
        <div class="metric-label">${t}</div>
        <div class="metric-values">
          <span class="metric-plan">${e}</span>
          ${i.hasActual?d`
            <span class="metric-actual ${r}">(${n})</span>
          `:null}
        </div>
      </div>
    `}render(){const t=["yesterday","today","tomorrow","history","detail"];return d`
      <div class="dialog" @click=${i=>i.stopPropagation()}>
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
          ${t.map(i=>d`
            <button
              class="tab ${this.activeTab===i?"active":""}"
              @click=${()=>this.onTabClick(i)}
            >
              ${qn[i]}
            </button>
          `)}
        </div>

        <div class="dialog-content">
          ${this.data?this.renderDayContent():d`
            <div class="empty-state">Načítání dat...</div>
          `}
        </div>
      </div>
    `}renderDayContent(){const t=this.data,i=t.summary;return d`
      <!-- Adherence bar -->
      ${i.overallAdherence>0?d`
        <div class="adherence-bar">
          <div class="adherence-header">
            <span>Soulad s plánem</span>
            <span>${this.fmtPct(i.overallAdherence)}</span>
          </div>
          <div class="adherence-track">
            <div
              class="adherence-fill"
              style="width: ${i.overallAdherence}%; background: ${this.adherenceColor(i.overallAdherence)}"
            ></div>
          </div>
        </div>
      `:null}

      <!-- Progress (today specific) -->
      ${i.progressPct!=null?d`
        <div class="progress-section">
          <div class="progress-item">
            Průběh: <span class="progress-value">${this.fmtPct(i.progressPct)}</span>
          </div>
          ${i.actualTotalCost!=null?d`
            <div class="progress-item">
              Skutečné: <span class="progress-value">${et(i.actualTotalCost)}</span>
            </div>
          `:null}
          ${i.planTotalCost!=null?d`
            <div class="progress-item">
              Plán: <span class="progress-value">${et(i.planTotalCost)}</span>
            </div>
          `:null}
          ${i.vsPlanPct!=null?d`
            <div class="progress-item">
              vs plán: <span class="progress-value" style="color: ${i.vsPlanPct<=100?"#4caf50":"#f44336"}">${this.fmtPct(i.vsPlanPct)}</span>
            </div>
          `:null}
        </div>
      `:null}

      <!-- EOD prediction -->
      ${i.eodPrediction?d`
        <div class="eod-prediction">
          Predikce konce dne: <span class="eod-value">${et(i.eodPrediction.predictedTotal)}</span>
          ${i.eodPrediction.predictedSavings>0?d`
            <span class="eod-savings"> (úspora ${et(i.eodPrediction.predictedSavings)})</span>
          `:null}
        </div>
      `:null}

      <!-- Metrics grid -->
      <div class="metrics-grid">
        ${this.renderMetricTile("Náklady",i.metrics.cost)}
        ${this.renderMetricTile("Solár",i.metrics.solar)}
        ${this.renderMetricTile("Spotřeba",i.metrics.consumption)}
        ${this.renderMetricTile("Síť",i.metrics.grid)}
      </div>

      <!-- Mode blocks timeline -->
      ${t.modeBlocks.length>0?d`
        <div class="modes-section">
          <div class="section-title">Režimy (${t.modeBlocks.length} bloků, ${i.modeSwitches} přepnutí)</div>
          <div class="mode-blocks-timeline">
            ${t.modeBlocks.map(e=>this.renderModeBlock(e))}
          </div>
        </div>
      `:null}

      <!-- Comparison plan (if available) -->
      ${t.comparison?d`
        <div class="modes-section">
          <div class="section-title">Srovnání: ${t.comparison.plan}</div>
          <div class="mode-blocks-timeline">
            ${t.comparison.modeBlocks.map(e=>this.renderModeBlock(e))}
          </div>
        </div>
      `:null}
    `}};re.styles=P`
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
  `;At([p({type:Boolean,reflect:!0})],re.prototype,"open",2);At([p({type:String})],re.prototype,"activeTab",2);At([p({type:Object})],re.prototype,"data",2);At([x()],re.prototype,"autoRefresh",2);re=At([E("oig-timeline-dialog")],re);let Pe=class extends M{constructor(){super(...arguments),this.data=null,this.activeTab="today",this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onTabClick(t){this.activeTab=t,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:t},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(t){return`${t.toFixed(0)}%`}adherenceColor(t){return t>=90?"#4caf50":t>=70?"#ff9800":"#f44336"}getModeConfig(t){return jn[t]??{icon:"❓",color:"#666",label:t}}renderModeBlock(t){const i=this.getModeConfig(t.modePlanned||t.modeHistorical),e=t.status==="current";return d`
      <div
        class="mode-block ${e?"current":""}"
        style="background: ${i.color}; flex: ${Math.max(t.durationHours,.5)}"
        title="${t.startTime}–${t.endTime} | ${i.label}"
      >
        ${t.modeMatch?null:d`<span class="mode-mismatch">!</span>`}
        <span class="mode-icon">${i.icon}</span>
        <span class="mode-name">${i.label}</span>
        <span class="mode-time">${t.startTime}–${t.endTime}</span>
        ${t.costPlanned!=null?d`
          <span class="mode-cost">${et(t.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(t,i){const e=i.unit==="Kč"?et(i.plan):`${i.plan.toFixed(1)} ${i.unit}`;let r="",n="";return i.hasActual&&i.actual!=null&&(n=i.unit==="Kč"?et(i.actual):`${i.actual.toFixed(1)} ${i.unit}`,i.unit==="Kč"?r=i.actual<=i.plan?"better":"worse":r=i.actual>=i.plan?"better":"worse"),d`
      <div class="metric-tile">
        <div class="metric-label">${t}</div>
        <div class="metric-values">
          <span class="metric-plan">${e}</span>
          ${i.hasActual?d`
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
          ${t.map(i=>d`
            <button
              class="tab ${this.activeTab===i?"active":""}"
              @click=${()=>this.onTabClick(i)}
            >
              ${qn[i]}
            </button>
          `)}
        </div>

        <div class="tile-content">
          ${this.data?this.renderDayContent():d`
            <div class="empty-state">Načítání dat...</div>
          `}
        </div>
      </div>
    `}renderDayContent(){const t=this.data,i=t.summary;return d`
      <!-- Adherence bar -->
      ${i.overallAdherence>0?d`
        <div class="adherence-bar">
          <div class="adherence-header">
            <span>Soulad s plánem</span>
            <span>${this.fmtPct(i.overallAdherence)}</span>
          </div>
          <div class="adherence-track">
            <div
              class="adherence-fill"
              style="width: ${i.overallAdherence}%; background: ${this.adherenceColor(i.overallAdherence)}"
            ></div>
          </div>
        </div>
      `:null}

      <!-- Progress (today specific) -->
      ${i.progressPct!=null?d`
        <div class="progress-section">
          <div class="progress-item">
            Průběh: <span class="progress-value">${this.fmtPct(i.progressPct)}</span>
          </div>
          ${i.actualTotalCost!=null?d`
            <div class="progress-item">
              Skutečné: <span class="progress-value">${et(i.actualTotalCost)}</span>
            </div>
          `:null}
          ${i.planTotalCost!=null?d`
            <div class="progress-item">
              Plán: <span class="progress-value">${et(i.planTotalCost)}</span>
            </div>
          `:null}
          ${i.vsPlanPct!=null?d`
            <div class="progress-item">
              vs plán: <span class="progress-value" style="color: ${i.vsPlanPct<=100?"#4caf50":"#f44336"}">${this.fmtPct(i.vsPlanPct)}</span>
            </div>
          `:null}
        </div>
      `:null}

      <!-- EOD prediction -->
      ${i.eodPrediction?d`
        <div class="eod-prediction">
          Predikce konce dne: <span class="eod-value">${et(i.eodPrediction.predictedTotal)}</span>
          ${i.eodPrediction.predictedSavings>0?d`
            <span class="eod-savings"> (úspora ${et(i.eodPrediction.predictedSavings)})</span>
          `:null}
        </div>
      `:null}

      <!-- Metrics grid -->
      <div class="metrics-grid">
        ${this.renderMetricTile("Náklady",i.metrics.cost)}
        ${this.renderMetricTile("Solár",i.metrics.solar)}
        ${this.renderMetricTile("Spotřeba",i.metrics.consumption)}
        ${this.renderMetricTile("Síť",i.metrics.grid)}
      </div>

      <!-- Mode blocks timeline -->
      ${t.modeBlocks.length>0?d`
        <div class="modes-section">
          <div class="section-title">Režimy (${t.modeBlocks.length} bloků, ${i.modeSwitches} přepnutí)</div>
          <div class="mode-blocks-timeline">
            ${t.modeBlocks.map(e=>this.renderModeBlock(e))}
          </div>
        </div>
      `:null}

      <!-- Comparison plan (if available) -->
      ${t.comparison?d`
        <div class="modes-section">
          <div class="section-title">Srovnání: ${t.comparison.plan}</div>
          <div class="mode-blocks-timeline">
            ${t.comparison.modeBlocks.map(e=>this.renderModeBlock(e))}
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
  `;At([p({type:Object})],Pe.prototype,"data",2);At([p({type:String})],Pe.prototype,"activeTab",2);At([x()],Pe.prototype,"autoRefresh",2);Pe=At([E("oig-timeline-tile")],Pe);var Cu=Object.defineProperty,Pu=Object.getOwnPropertyDescriptor,jt=(t,i,e,r)=>{for(var n=r>1?void 0:r?Pu(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&Cu(i,e,n),n};const at=Z;let Te=class extends M{constructor(){super(...arguments),this.data=null,this.editMode=!1,this.tileType="entity"}onTileClick(){var i;if(this.editMode)return;const t=(i=this.data)==null?void 0:i.config;t&&(t.type==="button"&&t.action?ko(t.entity_id,t.action):rt.openEntityDialog(t.entity_id))}onSupportClick(t,i){t.stopPropagation(),!this.editMode&&rt.openEntityDialog(i)}onEdit(){var t;this.dispatchEvent(new CustomEvent("edit-tile",{detail:{entityId:(t=this.data)==null?void 0:t.config.entity_id},bubbles:!0,composed:!0}))}onDelete(){var t;this.dispatchEvent(new CustomEvent("delete-tile",{detail:{entityId:(t=this.data)==null?void 0:t.config.entity_id},bubbles:!0,composed:!0}))}render(){var c,u;if(!this.data)return null;const t=this.data.config,i=t.type==="button";this.tileType!==t.type&&(this.tileType=t.type??"entity");const e=t.color||"",r=t.icon||(i?"⚡":"📊"),n=r.startsWith("mdi:")?Mi(r):r,a=(c=t.support_entities)==null?void 0:c.top_right,s=(u=t.support_entities)==null?void 0:u.bottom_right,l=this.data.supportValues.topRight||this.data.supportValues.bottomRight;return d`
      ${e?d`<style>:host { --tile-color: ${at(e)}; }</style>`:null}

      <div class="tile-top" @click=${this.onTileClick} title=${this.editMode?"":t.entity_id}>
        <span class="tile-icon">${n}</span>
        <span class="tile-label">${t.label||""}</span>
        ${l?d`
          <div class="support-values">
            ${this.data.supportValues.topRight?d`
              <span
                class="support-value ${a&&!this.editMode?"clickable":""}"
                @click=${a&&!this.editMode?h=>this.onSupportClick(h,a):null}
              >${this.data.supportValues.topRight.value} ${this.data.supportValues.topRight.unit}</span>
            `:null}
            ${this.data.supportValues.bottomRight?d`
              <span
                class="support-value ${s&&!this.editMode?"clickable":""}"
                @click=${s&&!this.editMode?h=>this.onSupportClick(h,s):null}
              >${this.data.supportValues.bottomRight.value} ${this.data.supportValues.bottomRight.unit}</span>
            `:null}
          </div>
        `:null}
      </div>

      <div class="tile-main" @click=${this.onTileClick}>
        <span class="tile-value">${this.data.value}</span>
        ${this.data.unit?d`<span class="tile-unit">${this.data.unit}</span>`:null}
        ${i?d`
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
  `;jt([p({type:Object})],Te.prototype,"data",2);jt([p({type:Boolean})],Te.prototype,"editMode",2);jt([p({type:String,reflect:!0})],Te.prototype,"tileType",2);Te=jt([E("oig-tile")],Te);let Me=class extends M{constructor(){super(...arguments),this.tiles=[],this.editMode=!1,this.position="left"}render(){return this.tiles.length===0?d`<div class="empty-state">Žádné dlaždice</div>`:d`
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
  `;jt([p({type:Array})],Me.prototype,"tiles",2);jt([p({type:Boolean})],Me.prototype,"editMode",2);jt([p({type:String,reflect:!0})],Me.prototype,"position",2);Me=jt([E("oig-tiles-container")],Me);var Tu=Object.defineProperty,Mu=Object.getOwnPropertyDescriptor,Dr=(t,i,e,r)=>{for(var n=r>1?void 0:r?Mu(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&Tu(i,e,n),n};const J=Z,Pn={Spotrebice:["fridge","fridge-outline","dishwasher","washing-machine","tumble-dryer","stove","microwave","coffee-maker","kettle","toaster","blender","food-processor","rice-cooker","slow-cooker","pressure-cooker","air-fryer","oven","range-hood"],Osvetleni:["lightbulb","lightbulb-outline","lamp","ceiling-light","floor-lamp","led-strip","led-strip-variant","wall-sconce","chandelier","desk-lamp","spotlight","light-switch"],"Vytapeni & Chlazeni":["thermometer","thermostat","radiator","radiator-disabled","heat-pump","air-conditioner","fan","hvac","fire","snowflake","fireplace","heating-coil"],"Energie & Baterie":["lightning-bolt","flash","battery","battery-charging","battery-50","battery-10","solar-panel","solar-power","meter-electric","power-plug","power-socket","ev-plug","transmission-tower","current-ac","current-dc"],"Auto & Doprava":["car","car-electric","car-battery","ev-station","ev-plug-type2","garage","garage-open","motorcycle","bicycle","scooter","bus","train","airplane"],Zabezpeceni:["door","door-open","lock","lock-open","shield-home","cctv","camera","motion-sensor","alarm-light","bell","eye","key","fingerprint","shield-check"],"Okna & Stineni":["window-closed","window-open","blinds","blinds-open","curtains","roller-shade","window-shutter","balcony","door-sliding"],"Media & Zabava":["television","speaker","speaker-wireless","music","volume-high","cast","chromecast","radio","headphones","microphone","gamepad","movie","spotify"],"Sit & IT":["router-wireless","wifi","access-point","lan","network","home-assistant","server","nas","cloud","ethernet","bluetooth","cellphone","tablet","laptop"],"Voda & Koupelna":["water","water-percent","water-boiler","water-pump","shower","toilet","faucet","pipe","bathtub","sink","water-heater","pool"],Pocasi:["weather-sunny","weather-cloudy","weather-night","weather-rainy","weather-snowy","weather-windy","weather-fog","weather-lightning","weather-hail","temperature","humidity","barometer"],"Ventilace & Kvalita vzduchu":["fan","air-filter","air-purifier","smoke-detector","co2","wind-turbine"],"Zahrada & Venku":["flower","tree","sprinkler","grass","garden-light","outdoor-lamp","grill","pool","hot-tub","umbrella","thermometer-lines"],Domacnost:["iron","vacuum","broom","mop","washing","basket","hanger","scissors"],"Notifikace & Stav":["information","help-circle","alert-circle","checkbox-marked-circle","check","close","minus","plus","arrow-up","arrow-down","refresh","sync","bell-ring"],Ovladani:["toggle-switch","power","play","pause","stop","skip-next","skip-previous","volume-up","volume-down","brightness-up","brightness-down"],"Cas & Planovani":["clock","timer","alarm","calendar","calendar-clock","schedule","history"],Ostatni:["home","cog","tools","wrench","hammer","chart-line","gauge","dots-vertical","menu","settings","account","logout"]};let di=class extends M{constructor(){super(...arguments),this.isOpen=!1,this.searchQuery=""}get filteredCategories(){const t=this.searchQuery.trim().toLowerCase();if(!t)return Pn;const i=Object.entries(Pn).map(([e,r])=>{const n=r.filter(a=>a.toLowerCase().includes(t));return[e,n]}).filter(([,e])=>e.length>0);return Object.fromEntries(i)}open(){this.isOpen=!0}close(){this.isOpen=!1,this.searchQuery=""}onOverlayClick(t){t.target===t.currentTarget&&this.close()}onSearchInput(t){const i=t.target;this.searchQuery=(i==null?void 0:i.value)??""}onIconClick(t){this.dispatchEvent(new CustomEvent("icon-selected",{detail:{icon:`mdi:${t}`},bubbles:!0,composed:!0})),this.close()}render(){if(!this.isOpen)return null;const t=this.filteredCategories,i=Object.entries(t);return d`
      <div class="overlay" @click=${this.onOverlayClick}>
        <div class="modal" @click=${e=>e.stopPropagation()}>
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
            ${i.length===0?d`
              <div class="empty">Žádné ikony nenalezeny</div>
            `:i.map(([e,r])=>d`
              <div class="category">
                <div class="category-title">${e}</div>
                <div class="icon-grid">
                  ${r.map(n=>d`
                    <button class="icon-item" type="button" @click=${()=>this.onIconClick(n)}>
                      <span class="icon-emoji">${Mi(n)}</span>
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
      background: color-mix(in srgb, ${J(o.bgPrimary)} 35%, transparent);
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
      background: ${J(o.cardBg)};
      box-shadow: ${J(o.cardShadow)};
      border-radius: 14px;
      border: 1px solid ${J(o.divider)};
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
      border-bottom: 1px solid ${J(o.divider)};
      gap: 12px;
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${J(o.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${J(o.bgSecondary)};
      color: ${J(o.textPrimary)};
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
      background: ${J(o.divider)};
      transform: scale(1.05);
    }

    .search {
      padding: 12px 18px;
      border-bottom: 1px solid ${J(o.divider)};
      background: ${J(o.bgSecondary)};
    }

    .search input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${J(o.divider)};
      background: ${J(o.bgPrimary)};
      color: ${J(o.textPrimary)};
      font-size: 13px;
      outline: none;
    }

    .search input::placeholder {
      color: ${J(o.textSecondary)};
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
      color: ${J(o.textSecondary)};
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
      background: ${J(o.bgSecondary)};
      cursor: pointer;
      transition: transform 0.15s ease, border 0.2s ease, background 0.2s ease;
      text-align: center;
      font-size: 10px;
      color: ${J(o.textSecondary)};
    }

    .icon-item:hover {
      background: ${J(o.bgPrimary)};
      border-color: ${J(o.accent)};
      transform: translateY(-2px);
      color: ${J(o.textPrimary)};
    }

    .icon-emoji {
      font-size: 22px;
      line-height: 1;
      color: ${J(o.textPrimary)};
    }

    .icon-name {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      font-size: 12px;
      color: ${J(o.textSecondary)};
      text-align: center;
      padding: 24px 0 12px;
    }
  `;Dr([p({type:Boolean,reflect:!0,attribute:"open"})],di.prototype,"isOpen",2);Dr([x()],di.prototype,"searchQuery",2);di=Dr([E("oig-icon-picker")],di);var Eu=Object.defineProperty,Ou=Object.getOwnPropertyDescriptor,ut=(t,i,e,r)=>{for(var n=r>1?void 0:r?Ou(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&Eu(i,e,n),n};const D=Z;let nt=class extends M{constructor(){super(...arguments),this.isOpen=!1,this.tileIndex=-1,this.tileSide="left",this.existingConfig=null,this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}loadTileConfig(t){var i,e;this.currentTab=t.type,t.type==="entity"?this.selectedEntityId=t.entity_id:this.selectedButtonEntityId=t.entity_id,this.label=t.label||"",this.icon=t.icon||"",this.color=t.color||"#03A9F4",this.action=t.action||"toggle",this.supportEntity1=((i=t.support_entities)==null?void 0:i.top_right)||"",this.supportEntity2=((e=t.support_entities)==null?void 0:e.bottom_right)||""}resetForm(){this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}handleClose(){this.isOpen=!1,this.resetForm(),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}getEntities(){const t=ne();return t?t.getAll():{}}getEntityItems(t,i){const e=i.trim().toLowerCase(),r=this.getEntities();return Object.entries(r).filter(([a])=>t.some(s=>a.startsWith(s))).map(([a,s])=>{const l=this.getAttributeValue(s,"friendly_name")||a,c=this.getAttributeValue(s,"unit_of_measurement"),u=this.getAttributeValue(s,"icon");return{id:a,name:l,value:s.state,unit:c,icon:u,state:s}}).filter(a=>e?a.name.toLowerCase().includes(e)||a.id.toLowerCase().includes(e):!0).sort((a,s)=>a.name.localeCompare(s.name))}getSupportEntities(t){const i=t.trim().toLowerCase();if(!i)return[];const e=this.getEntities();return Object.entries(e).map(([r,n])=>{const a=this.getAttributeValue(n,"friendly_name")||r,s=this.getAttributeValue(n,"unit_of_measurement"),l=this.getAttributeValue(n,"icon");return{id:r,name:a,value:n.state,unit:s,icon:l,state:n}}).filter(r=>r.name.toLowerCase().includes(i)||r.id.toLowerCase().includes(i)).sort((r,n)=>r.name.localeCompare(n.name)).slice(0,20)}getDisplayIcon(t){return t?t.startsWith("mdi:")?Mi(t):t:Mi("")}getColorForEntity(t){switch(t.split(".")[0]){case"sensor":return"#03A9F4";case"binary_sensor":return"#4CAF50";case"switch":return"#FFC107";case"light":return"#FF9800";case"fan":return"#00BCD4";case"input_boolean":return"#9C27B0";default:return"#03A9F4"}}applyEntityDefaults(t){if(!t)return;const e=this.getEntities()[t];if(!e)return;this.label||(this.label=this.getAttributeValue(e,"friendly_name"));const r=this.getAttributeValue(e,"icon");!this.icon&&r&&(this.icon=r),this.color=this.getColorForEntity(t)}handleEntitySelect(t){this.selectedEntityId=t,this.applyEntityDefaults(t)}handleButtonEntitySelect(t){this.selectedButtonEntityId=t,this.applyEntityDefaults(t)}handleSupportInput(t,i){const e=i.trim();t===1?(this.supportSearch1=i,this.showSupportList1=!!e,e||(this.supportEntity1="")):(this.supportSearch2=i,this.showSupportList2=!!e,e||(this.supportEntity2=""))}handleSupportSelect(t,i){const e=i.name||i.id;t===1?(this.supportEntity1=i.id,this.supportSearch1=e,this.showSupportList1=!1):(this.supportEntity2=i.id,this.supportSearch2=e,this.showSupportList2=!1)}getSupportInputValue(t,i){if(t)return t;if(!i)return"";const e=this.getEntities()[i];return e&&this.getAttributeValue(e,"friendly_name")||i}getAttributeValue(t,i){var r;const e=(r=t.attributes)==null?void 0:r[i];return e==null?"":String(e)}handleSave(){const t=this.currentTab==="entity"?this.selectedEntityId:this.selectedButtonEntityId;if(!t){window.alert("Vyberte entitu");return}const i={top_right:this.supportEntity1||void 0,bottom_right:this.supportEntity2||void 0},e={type:this.currentTab,entity_id:t,label:this.label||void 0,icon:this.icon||void 0,color:this.color||void 0,action:this.currentTab==="button"?this.action:void 0,support_entities:i};this.dispatchEvent(new CustomEvent("tile-saved",{detail:{index:this.tileIndex,side:this.tileSide,config:e},bubbles:!0,composed:!0})),this.handleClose()}onIconSelected(t){var i;this.icon=((i=t.detail)==null?void 0:i.icon)||"",this.iconPickerOpen=!1}renderEntityList(t,i,e,r){const n=this.getEntityItems(t,i);return n.length===0?d`<div class="support-empty">Žádné entity nenalezeny</div>`:d`
      ${n.map(a=>d`
        <div
          class="entity-item ${e===a.id?"selected":""}"
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
    `}renderSupportList(t,i){const e=this.getSupportEntities(t);return e.length===0?d`<div class="support-empty">Žádné entity nenalezeny</div>`:d`
      ${e.map(r=>d`
        <div
          class="support-item"
          @mousedown=${()=>this.handleSupportSelect(i,r)}
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
      font-family: ${D(o.fontFamily)};
    }

    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${D(o.bgPrimary)} 35%, transparent);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .dialog {
      width: min(520px, 100%);
      max-height: 85vh;
      background: ${D(o.cardBg)};
      border: 1px solid ${D(o.divider)};
      border-radius: 16px;
      box-shadow: ${D(o.cardShadow)};
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
      border-bottom: 1px solid ${D(o.divider)};
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${D(o.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${D(o.bgSecondary)};
      color: ${D(o.textPrimary)};
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
      background: ${D(o.divider)};
      transform: scale(1.05);
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 18px;
      background: ${D(o.bgSecondary)};
      border-bottom: 1px solid ${D(o.divider)};
    }

    .tab-btn {
      border: 1px solid transparent;
      background: ${D(o.cardBg)};
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: ${D(o.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: border 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }

    .tab-btn.active {
      border-color: ${D(o.accent)};
      color: ${D(o.textPrimary)};
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
      color: ${D(o.textSecondary)};
      font-weight: 600;
    }

    .input,
    select,
    .color-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${D(o.divider)};
      background: ${D(o.bgPrimary)};
      color: ${D(o.textPrimary)};
      font-size: 12px;
      outline: none;
      transition: border 0.2s ease, box-shadow 0.2s ease;
    }

    .input::placeholder {
      color: ${D(o.textSecondary)};
    }

    .input:focus,
    select:focus,
    .color-input:focus {
      border-color: ${D(o.accent)};
      box-shadow: 0 0 0 2px color-mix(in srgb, ${D(o.accent)} 20%, transparent);
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
      border: 1px dashed ${D(o.divider)};
      display: grid;
      place-items: center;
      font-size: 22px;
      cursor: pointer;
      background: ${D(o.bgSecondary)};
      transition: border 0.2s ease, transform 0.2s ease;
    }

    .icon-preview:hover {
      border-color: ${D(o.accent)};
      transform: translateY(-1px);
    }

    .icon-field {
      font-size: 11px;
    }

    .icon-btn {
      border: none;
      background: ${D(o.bgSecondary)};
      color: ${D(o.textPrimary)};
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .divider {
      height: 1px;
      background: ${D(o.divider)};
      margin: 6px 0;
      opacity: 0.8;
    }

    .entity-list {
      border: 1px solid ${D(o.divider)};
      border-radius: 12px;
      overflow: hidden;
      max-height: 200px;
      overflow-y: auto;
      background: ${D(o.bgPrimary)};
    }

    .entity-item {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid ${D(o.divider)};
      cursor: pointer;
      align-items: center;
      transition: background 0.2s ease;
    }

    .entity-item:last-child {
      border-bottom: none;
    }

    .entity-item:hover {
      background: ${D(o.bgSecondary)};
    }

    .entity-item.selected {
      background: color-mix(in srgb, ${D(o.accent)} 16%, transparent);
      border-left: 3px solid ${D(o.accent)};
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
      color: ${D(o.textPrimary)};
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-sub {
      font-size: 10px;
      color: ${D(o.textSecondary)};
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
      background: ${D(o.cardBg)};
      border: 1px solid ${D(o.divider)};
      border-radius: 12px;
      z-index: 10;
      max-height: 180px;
      overflow-y: auto;
      box-shadow: ${D(o.cardShadow)};
    }

    .support-item {
      padding: 10px 12px;
      border-bottom: 1px solid ${D(o.divider)};
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
      background: ${D(o.bgSecondary)};
    }

    .support-name {
      font-size: 12px;
      color: ${D(o.textPrimary)};
      font-weight: 600;
    }

    .support-value {
      font-size: 10px;
      color: ${D(o.textSecondary)};
    }

    .support-empty {
      padding: 12px;
      font-size: 11px;
      color: ${D(o.textSecondary)};
      text-align: center;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px 18px;
      border-top: 1px solid ${D(o.divider)};
      background: ${D(o.bgSecondary)};
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
      background: ${D(o.bgPrimary)};
      color: ${D(o.textPrimary)};
      border: 1px solid ${D(o.divider)};
    }

    .btn-primary {
      background: ${D(o.accent)};
      color: #fff;
      box-shadow: 0 6px 14px color-mix(in srgb, ${D(o.accent)} 40%, transparent);
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
  `;ut([p({type:Boolean,reflect:!0,attribute:"open"})],nt.prototype,"isOpen",2);ut([p({type:Number})],nt.prototype,"tileIndex",2);ut([p({attribute:!1})],nt.prototype,"tileSide",2);ut([p({attribute:!1})],nt.prototype,"existingConfig",2);ut([x()],nt.prototype,"currentTab",2);ut([x()],nt.prototype,"entitySearchText",2);ut([x()],nt.prototype,"buttonSearchText",2);ut([x()],nt.prototype,"selectedEntityId",2);ut([x()],nt.prototype,"selectedButtonEntityId",2);ut([x()],nt.prototype,"label",2);ut([x()],nt.prototype,"icon",2);ut([x()],nt.prototype,"color",2);ut([x()],nt.prototype,"action",2);ut([x()],nt.prototype,"supportEntity1",2);ut([x()],nt.prototype,"supportEntity2",2);ut([x()],nt.prototype,"supportSearch1",2);ut([x()],nt.prototype,"supportSearch2",2);ut([x()],nt.prototype,"showSupportList1",2);ut([x()],nt.prototype,"showSupportList2",2);ut([x()],nt.prototype,"iconPickerOpen",2);nt=ut([E("oig-tile-dialog")],nt);var Du=Object.defineProperty,zu=Object.getOwnPropertyDescriptor,R=(t,i,e,r)=>{for(var n=r>1?void 0:r?zu(i,e):i,a=t.length-1,s;a>=0;a--)(s=t[a])&&(n=(r?s(i,e,n):s(n))||n);return r&&n&&Du(i,e,n),n};const $t=Z,Tn=new URLSearchParams(window.location.search),fe=Tn.get("sn")||Tn.get("inverter_sn")||"2206237016",Iu=`sensor.oig_${fe}_`,Au=[{id:"flow",label:"Toky",icon:"⚡"},{id:"pricing",label:"Ceny",icon:"💰"},{id:"boiler",label:"Bojler",icon:"🔥"}];let N=class extends M{constructor(){super(...arguments),this.hass=null,this.loading=!0,this.error=null,this.activeTab="flow",this.editMode=!1,this.time="",this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1,this.flowData=vr,this.pricingData=null,this.pricingLoading=!1,this.boilerState=null,this.boilerLoading=!1,this.boilerPlan=null,this.boilerEnergyBreakdown=null,this.boilerPredictedUsage=null,this.boilerConfig=null,this.boilerHeatmap7x24=[],this.boilerProfiling=null,this.boilerCurrentCategory="",this.boilerAvailableCategories=[],this.boilerForecastWindows={fve:"--",grid:"--"},this.boilerRefreshTimer=null,this.analyticsData=nn,this.chmuData=Ze,this.chmuModalOpen=!1,this.timelineTab="today",this.timelineData=null,this.tilesConfig=null,this.tilesLeft=[],this.tilesRight=[],this.tileDialogOpen=!1,this.editingTileIndex=-1,this.editingTileSide="left",this.editingTileConfig=null,this.entityStore=null,this.timeInterval=null,this.stateWatcherUnsub=null,this.tileEntityUnsubs=[],this.throttledUpdateFlow=cn(()=>this.updateFlowData(),500),this.throttledUpdateSensors=cn(()=>this.updateSensorData(),1e3)}connectedCallback(){super.connectedCallback(),this.initApp(),this.startTimeUpdate()}disconnectedCallback(){super.disconnectedCallback(),this.cleanup()}updated(t){t.has("activeTab")&&(this.activeTab==="pricing"&&!this.pricingData&&this.loadPricingData(),this.activeTab==="pricing"&&this.analyticsData===nn&&this.loadAnalyticsAsync(),this.activeTab==="pricing"&&!this.timelineData&&this.loadTimelineTabData(this.timelineTab),this.activeTab==="boiler"&&!this.boilerState&&this.loadBoilerDataAsync())}async initApp(){try{const t=await rt.getHass();if(!t)throw new Error("Cannot access Home Assistant context");this.hass=t,this.entityStore=gs(t,fe),await be.start({getHass:()=>rt.getHassSync(),prefixes:[Iu]}),this.stateWatcherUnsub=be.onEntityChange((i,e)=>{this.throttledUpdateFlow(),this.throttledUpdateSensors()}),X.start(),this.updateFlowData(),this.updateSensorData(),this.loadPricingData(),this.loadBoilerDataAsync(),this.loadAnalyticsAsync(),this.loadTilesAsync(),this.loading=!1,b.info("App initialized",{entities:Object.keys(t.states||{}).length,inverterSn:fe})}catch(t){this.error=t.message,this.loading=!1,b.error("App init failed",t)}}cleanup(){var t,i;(t=this.stateWatcherUnsub)==null||t.call(this),this.stateWatcherUnsub=null,be.stop(),X.stop(),this.tileEntityUnsubs.forEach(e=>e()),this.tileEntityUnsubs=[],(i=this.entityStore)==null||i.destroy(),this.entityStore=null,this.timeInterval!==null&&(clearInterval(this.timeInterval),this.timeInterval=null),this.boilerRefreshTimer!==null&&(clearInterval(this.boilerRefreshTimer),this.boilerRefreshTimer=null)}updateFlowData(){if(this.hass)try{this.flowData=Cs(this.hass)}catch(t){b.error("Failed to extract flow data",t)}}updateSensorData(){if(this.chmuData=yo(fe),this.tilesConfig){const t=We(this.tilesConfig);this.tilesLeft=t.left,this.tilesRight=t.right}}updateTilesImmediate(){if(!this.tilesConfig)return;const t=We(this.tilesConfig);this.tilesLeft=t.left,this.tilesRight=t.right}subscribeTileEntities(){if(this.tileEntityUnsubs.forEach(i=>i()),this.tileEntityUnsubs=[],!this.tilesConfig||!this.entityStore)return;const t=new Set;[...this.tilesConfig.tiles_left,...this.tilesConfig.tiles_right].forEach(i=>{var e,r;i&&(t.add(i.entity_id),(e=i.support_entities)!=null&&e.top_right&&t.add(i.support_entities.top_right),(r=i.support_entities)!=null&&r.bottom_right&&t.add(i.support_entities.bottom_right))});for(const i of t){const e=this.entityStore.subscribe(i,()=>{this.updateTilesImmediate()});this.tileEntityUnsubs.push(e)}}async loadPricingData(){if(!(!this.hass||this.pricingLoading)){this.pricingLoading=!0;try{const t=await je(()=>js(this.hass));this.pricingData=t}catch(t){b.error("Failed to load pricing data",t)}finally{this.pricingLoading=!1}}}async loadBoilerDataAsync(){if(!(!this.hass||this.boilerLoading)){this.boilerLoading=!0;try{const t=await je(()=>uo(this.hass));this.boilerState=t.state,this.boilerPlan=t.plan,this.boilerEnergyBreakdown=t.energyBreakdown,this.boilerPredictedUsage=t.predictedUsage,this.boilerConfig=t.config,this.boilerHeatmap7x24=t.heatmap7x24,this.boilerProfiling=t.profiling,this.boilerCurrentCategory=t.currentCategory,this.boilerAvailableCategories=t.availableCategories,this.boilerForecastWindows=t.forecastWindows,this.boilerRefreshTimer||(this.boilerRefreshTimer=window.setInterval(()=>this.loadBoilerDataAsync(),5*60*1e3))}catch(t){b.error("Failed to load boiler data",t)}finally{this.boilerLoading=!1}}}async loadAnalyticsAsync(){try{this.analyticsData=await je(()=>mo(fe))}catch(t){b.error("Failed to load analytics",t)}}async loadTilesAsync(){try{this.tilesConfig=await je(()=>_o());const t=We(this.tilesConfig);this.tilesLeft=t.left,this.tilesRight=t.right,this.subscribeTileEntities()}catch(t){b.error("Failed to load tiles config",t)}}async loadTimelineTabData(t){try{this.timelineData=await je(()=>wo(fe,t))}catch(i){b.error(`Failed to load timeline tab: ${t}`,i)}}startTimeUpdate(){const t=()=>{this.time=new Date().toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})};t(),this.timeInterval=window.setInterval(t,1e3)}onTabChange(t){this.activeTab=t.detail.tabId}onGridChargingOpen(){var i;const t=(i=this.shadowRoot)==null?void 0:i.querySelector("oig-grid-charging-dialog");t==null||t.show()}onEditClick(){this.editMode=!this.editMode}onResetClick(){var e,r;const t=(e=this.shadowRoot)==null?void 0:e.querySelector("oig-flow-canvas");t!=null&&t.resetLayout&&t.resetLayout();const i=(r=this.shadowRoot)==null?void 0:r.querySelector("oig-grid");i&&i.resetLayout()}onToggleLeftPanel(){this.leftPanelCollapsed=!this.leftPanelCollapsed}onToggleRightPanel(){this.rightPanelCollapsed=!this.rightPanelCollapsed}onChmuBadgeClick(){this.chmuModalOpen=!0}onChmuModalClose(){this.chmuModalOpen=!1}onTimelineTabChange(t){this.timelineTab=t.detail.tab,this.loadTimelineTabData(t.detail.tab)}onTimelineRefresh(){this.loadTimelineTabData(this.timelineTab)}onBoilerCategoryChange(t){const i=t.detail.category;this.boilerCurrentCategory=i,this.loadBoilerDataAsync()}onBoilerActionDone(t){const{success:i,label:e}=t.detail;b.info(`[Boiler] Action ${e}: ${i?"OK":"FAIL"}`),i&&setTimeout(()=>this.loadBoilerDataAsync(),2e3)}onEditTile(t){const{entityId:i}=t.detail;let e=-1,r="left",n=null;if(this.tilesConfig){const a=this.tilesConfig.tiles_left.findIndex(s=>s&&s.entity_id===i);if(a>=0)e=a,r="left",n=this.tilesConfig.tiles_left[a];else{const s=this.tilesConfig.tiles_right.findIndex(l=>l&&l.entity_id===i);s>=0&&(e=s,r="right",n=this.tilesConfig.tiles_right[s])}}this.editingTileIndex=e,this.editingTileSide=r,this.editingTileConfig=n,this.tileDialogOpen=!0,n&&requestAnimationFrame(()=>{var s;const a=(s=this.shadowRoot)==null?void 0:s.querySelector("oig-tile-dialog");a==null||a.loadTileConfig(n)})}onDeleteTile(t){const{entityId:i}=t.detail;if(!this.tilesConfig||!i)return;const e={...this.tilesConfig};e.tiles_left=e.tiles_left.map(n=>n&&n.entity_id===i?null:n),e.tiles_right=e.tiles_right.map(n=>n&&n.entity_id===i?null:n),this.tilesConfig=e;const r=We(e);this.tilesLeft=r.left,this.tilesRight=r.right,on(e),this.subscribeTileEntities()}onTileSaved(t){const{index:i,side:e,config:r}=t.detail;if(!this.tilesConfig)return;const n={...this.tilesConfig},a=e==="left"?[...n.tiles_left]:[...n.tiles_right];if(i>=0&&i<a.length)a[i]=r;else{const l=a.findIndex(c=>c===null);l>=0?a[l]=r:a.push(r)}e==="left"?n.tiles_left=a:n.tiles_right=a,this.tilesConfig=n;const s=We(n);this.tilesLeft=s.left,this.tilesRight=s.right,on(n),this.subscribeTileEntities()}onTileDialogClose(){this.tileDialogOpen=!1,this.editingTileConfig=null,this.editingTileIndex=-1}render(){var i;if(this.loading)return d`<div class="loading"><div class="spinner"></div><span>Načítání...</span></div>`;if(this.error)return d`
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
          .tabs=${Au}
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
                `:I}
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
              `:I}

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
                  .targetTemp=${((i=this.boilerConfig)==null?void 0:i.targetTempC)??60}
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
  `;R([p({type:Object})],N.prototype,"hass",2);R([x()],N.prototype,"loading",2);R([x()],N.prototype,"error",2);R([x()],N.prototype,"activeTab",2);R([x()],N.prototype,"editMode",2);R([x()],N.prototype,"time",2);R([x()],N.prototype,"leftPanelCollapsed",2);R([x()],N.prototype,"rightPanelCollapsed",2);R([x()],N.prototype,"flowData",2);R([x()],N.prototype,"pricingData",2);R([x()],N.prototype,"pricingLoading",2);R([x()],N.prototype,"boilerState",2);R([x()],N.prototype,"boilerLoading",2);R([x()],N.prototype,"boilerPlan",2);R([x()],N.prototype,"boilerEnergyBreakdown",2);R([x()],N.prototype,"boilerPredictedUsage",2);R([x()],N.prototype,"boilerConfig",2);R([x()],N.prototype,"boilerHeatmap7x24",2);R([x()],N.prototype,"boilerProfiling",2);R([x()],N.prototype,"boilerCurrentCategory",2);R([x()],N.prototype,"boilerAvailableCategories",2);R([x()],N.prototype,"boilerForecastWindows",2);R([x()],N.prototype,"analyticsData",2);R([x()],N.prototype,"chmuData",2);R([x()],N.prototype,"chmuModalOpen",2);R([x()],N.prototype,"timelineTab",2);R([x()],N.prototype,"timelineData",2);R([x()],N.prototype,"tilesConfig",2);R([x()],N.prototype,"tilesLeft",2);R([x()],N.prototype,"tilesRight",2);R([x()],N.prototype,"tileDialogOpen",2);R([x()],N.prototype,"editingTileIndex",2);R([x()],N.prototype,"editingTileSide",2);R([x()],N.prototype,"editingTileConfig",2);N=R([E("oig-app")],N);b.info("V2 starting",{version:"2.0.0-beta.1"});ls();async function Lu(){try{const t=await os(),i=document.getElementById("app");i&&(i.innerHTML="",i.appendChild(t)),b.info("V2 mounted successfully")}catch(t){b.error("V2 bootstrap failed",t);const i=document.getElementById("app");i&&(i.innerHTML=`
        <div style="padding: 20px; font-family: system-ui;">
          <h2>Chyba načítání</h2>
          <p>Nepodařilo se načíst dashboard. Zkuste obnovit stránku.</p>
          <details>
            <summary>Detaily</summary>
            <pre>${t.message}</pre>
          </details>
        </div>`)}}Lu();
//# sourceMappingURL=index.js.map
