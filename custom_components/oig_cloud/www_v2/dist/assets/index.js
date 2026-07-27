var Ec=Object.defineProperty;var Ic=(e,t,i)=>t in e?Ec(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var B=(e,t,i)=>Ic(e,typeof t!="symbol"?t+"":t,i);import{f as Fc,u as Bc,b as s,i as z,a as O,r as X,w as N,A as x,E as Xl}from"./vendor.js";import{C as Mn,a as Jl,L as ed,P as td,b as id,i as rd,p as ad,c as nd,d as jc,T as Nc,e as Rc,B as Wc,f as Kc,g as Zc,h as qc,j as Gc,k as od}from"./charts.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const n of a)if(n.type==="childList")for(const o of n.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&r(o)}).observe(document,{childList:!0,subtree:!0});function i(a){const n={};return a.integrity&&(n.integrity=a.integrity),a.referrerPolicy&&(n.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?n.credentials="include":a.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function r(a){if(a.ep)return;a.ep=!0;const n=i(a);fetch(a.href,n)}})();const oi="[V2]";function Uc(){return new Date().toISOString().substr(11,12)}function Ha(e,t){const i=Uc(),r=e.toUpperCase().padEnd(5);return`${i} ${r} ${t}`}const L={debug(e,t){typeof window<"u"&&window.OIG_DEBUG&&console.debug(oi,Ha("debug",e),t??"")},info(e,t){console.info(oi,Ha("info",e),t??"")},warn(e,t){console.warn(oi,Ha("warn",e),t??"")},error(e,t,i){const r=t?{error:t.message,stack:t.stack,...i}:i;console.error(oi,Ha("error",e),r??"")},time(e){console.time(`${oi} ${e}`)},timeEnd(e){console.timeEnd(`${oi} ${e}`)},group(e){console.group(`${oi} ${e}`)},groupEnd(){console.groupEnd()}};function Yc(){window.addEventListener("error",Qc),window.addEventListener("unhandledrejection",Xc),L.debug("Error handling setup complete")}function Qc(e){const t=e.error||new Error(e.message);L.error("Uncaught error",t,{filename:e.filename,lineno:e.lineno,colno:e.colno}),e.preventDefault()}function Xc(e){const t=e.reason instanceof Error?e.reason:new Error(String(e.reason));L.error("Unhandled promise rejection",t),e.preventDefault()}class sd extends Error{constructor(t,i,r=!1,a){super(t),this.code=i,this.recoverable=r,this.cause=a,this.name="AppError"}}class Sr extends sd{constructor(t="Authentication failed"){super(t,"AUTH_ERROR",!1),this.name="AuthError"}}class us extends sd{constructor(t="Network error",i){super(t,"NETWORK_ERROR",!0,i),this.name="NetworkError"}}const Jc="oig_v2_";function ep(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"";return/Home Assistant|HomeAssistant|HAcompanion/i.test(t)}catch{return!1}}function tp(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"",i=/Android|iPhone|iPad|iPod|Mobile/i.test(t),r=globalThis.innerWidth<=768;return i||r}catch{return!1}}const at={isHaApp:!1,isMobile:!1,reduceMotion:!1};async function ip(){var i,r;L.info("Bootstrap starting"),Yc(),at.isHaApp=ep(),at.isMobile=tp(),at.reduceMotion=at.isHaApp||at.isMobile||((r=(i=globalThis.matchMedia)==null?void 0:i.call(globalThis,"(prefers-reduced-motion: reduce)"))==null?void 0:r.matches)||!1;const e=document.documentElement;at.isHaApp&&e.classList.add("oig-ha-app"),at.isMobile&&e.classList.add("oig-mobile"),at.reduceMotion&&e.classList.add("oig-reduce-motion");const t={version:"2.0.0-beta.1",storagePrefix:Jc};return L.info("Bootstrap complete",{...t,isHaApp:at.isHaApp,isMobile:at.isMobile,reduceMotion:at.reduceMotion}),document.createElement("oig-app")}const d={bgPrimary:"var(--primary-background-color, #ffffff)",bgSecondary:"var(--secondary-background-color, #f5f5f5)",textPrimary:"var(--primary-text-color, #212121)",textSecondary:"var(--secondary-text-color, #757575)",accent:"var(--accent-color, #03a9f4)",divider:"var(--divider-color, #e0e0e0)",error:"var(--error-color, #db4437)",success:"var(--success-color, #0f9d58)",warning:"var(--warning-color, #f4b400)",cardBg:"var(--card-background-color, #ffffff)",cardBgSolid:"var(--oig-surface, #ffffff)",cardShadow:"var(--shadow-elevation-2dp_-_box-shadow, 0 2px 2px 0 rgba(0,0,0,0.14))",fontFamily:"var(--primary-font-family, system-ui, sans-serif)"},hs={"color-scheme":"dark","--primary-background-color":"#111936","--secondary-background-color":"#1a2044","--primary-text-color":"#e1e1e1","--secondary-text-color":"rgba(255,255,255,0.7)","--accent-color":"#03a9f4","--divider-color":"rgba(255,255,255,0.12)","--error-color":"#ef5350","--success-color":"#66bb6a","--warning-color":"#ffa726","--card-background-color":"rgba(255,255,255,0.06)","--oig-surface":"#1b2440","--shadow-elevation-2dp_-_box-shadow":"0 2px 4px 0 rgba(0,0,0,0.4)"},gs={"color-scheme":"light","--primary-background-color":"#ffffff","--secondary-background-color":"#f5f5f5","--primary-text-color":"#212121","--secondary-text-color":"#757575","--accent-color":"#03a9f4","--divider-color":"#e0e0e0","--error-color":"#db4437","--success-color":"#0f9d58","--warning-color":"#f4b400","--card-background-color":"#ffffff","--oig-surface":"#ffffff","--shadow-elevation-2dp_-_box-shadow":"0 2px 2px 0 rgba(0,0,0,0.14)"};function Un(){var e,t;try{if(window.parent&&window.parent!==window){const i=(t=(e=window.parent.document)==null?void 0:e.querySelector("home-assistant"))==null?void 0:t.hass;if(i!=null&&i.themes){if(typeof i.themes.darkMode=="boolean")return i.themes.darkMode;const r=(i.themes.theme||"").toLowerCase();if(r.includes("dark"))return!0;if(r.includes("light"))return!1}}}catch{}return window.matchMedia("(prefers-color-scheme: dark)").matches}function Yn(e){const t=e?hs:gs,i=document.documentElement;for(const[r,a]of Object.entries(t))i.style.setProperty(r,a);i.classList.toggle("dark",e),document.body.style.background=e?hs["--secondary-background-color"]:gs["--secondary-background-color"]}function rp(){const e=Un();Yn(e),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{const i=Un();Yn(i)}),setInterval(()=>{const i=Un(),r=document.documentElement.classList.contains("dark");i!==r&&Yn(i)},5e3)}const bs={mobile:768,tablet:1024};function Ki(e){return e<bs.mobile?"mobile":e<bs.tablet?"tablet":"desktop"}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const E=e=>(t,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ap={attribute:!0,type:String,converter:Bc,reflect:!1,hasChanged:Fc},np=(e=ap,t,i)=>{const{kind:r,metadata:a}=i;let n=globalThis.litPropertyMetadata.get(a);if(n===void 0&&globalThis.litPropertyMetadata.set(a,n=new Map),r==="setter"&&((e=Object.create(e)).wrapped=!0),n.set(i.name,e),r==="accessor"){const{name:o}=i;return{set(l){const c=t.get.call(this);t.set.call(this,l),this.requestUpdate(o,c,e,!0,l)},init(l){return l!==void 0&&this.C(o,void 0,e,l),l}}}if(r==="setter"){const{name:o}=i;return function(l){const c=this[o];t.call(this,l),this.requestUpdate(o,c,e,!0,l)}}throw Error("Unsupported decorator location: "+r)};function m(e){return(t,i)=>typeof i=="object"?np(e,t,i):((r,a,n)=>{const o=a.hasOwnProperty(n);return a.constructor.createProperty(n,r),o?Object.getOwnPropertyDescriptor(a,n):void 0})(e,t,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function S(e){return m({...e,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const op=(e,t,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof t!="object"&&Object.defineProperty(e,t,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function An(e,t){return(i,r,a)=>{const n=o=>{var l;return((l=o.renderRoot)==null?void 0:l.querySelector(e))??null};return op(i,r,{get(){return n(this)}})}}class sp{constructor(){this.callbacks=new Set,this.watched=new Set,this.watchedPrefixes=new Set,this.unsub=null,this.running=!1,this.getHass=null,this.activeConnection=null}registerEntities(t){for(const i of t)typeof i=="string"&&i.length>0&&this.watched.add(i)}registerPrefix(t){var r;if(typeof t!="string"||t.length===0)return;this.watchedPrefixes.add(t);const i=(r=this.getHass)==null?void 0:r.call(this);if(i!=null&&i.states){const a=Object.keys(i.states).filter(n=>n.startsWith(t));this.registerEntities(a)}}onEntityChange(t){return this.callbacks.add(t),()=>{this.callbacks.delete(t)}}async start(t){this.getHass=t.getHass;const i=this.getHass();if(!(i!=null&&i.connection)){L.debug("StateWatcher: hass not ready, retrying in 500ms"),setTimeout(()=>this.start(t),500);return}if(this.running&&this.activeConnection===i.connection){const a=t.prefixes??[];for(const n of a)this.registerPrefix(n);return}this.running&&this.stop(),this.running=!0,this.activeConnection=i.connection;const r=t.prefixes??[];for(const a of r)this.registerPrefix(a);try{this.unsub=await i.connection.subscribeEvents(a=>this.handleStateChanged(a),"state_changed"),L.info("StateWatcher started",{prefixes:r,watchedCount:this.watched.size})}catch(a){this.running=!1,this.activeConnection=null,L.error("StateWatcher failed to subscribe",a)}}stop(){if(this.running=!1,this.activeConnection=null,this.unsub)try{this.unsub()}catch{}this.unsub=null,L.info("StateWatcher stopped")}isWatched(t){return this.matchesWatched(t)}destroy(){this.stop(),this.callbacks.clear(),this.watched.clear(),this.watchedPrefixes.clear(),this.getHass=null}matchesWatched(t){if(this.watched.has(t))return!0;for(const i of this.watchedPrefixes)if(t.startsWith(i))return!0;return!1}handleStateChanged(t){var a;const i=(a=t==null?void 0:t.data)==null?void 0:a.entity_id;if(!i||!this.matchesWatched(i))return;const r=t.data.new_state;for(const n of this.callbacks)try{n(i,r)}catch{}}}const gi=new sp;class lp{constructor(t,i=""){this.subscriptions=new Map,this.cache=new Map,this.stateWatcherUnsub=null,this.hass=t,this.inverterSn=i,this.init()}init(){var t;if((t=this.hass)!=null&&t.states)for(const[i,r]of Object.entries(this.hass.states))this.cache.set(i,r);this.stateWatcherUnsub=gi.onEntityChange((i,r)=>{r?this.cache.set(i,r):this.cache.delete(i),this.notifySubscribers(i,r)}),L.debug("EntityStore initialized",{entities:this.cache.size,inverterSn:this.inverterSn})}getSensorId(t){return`sensor.oig_${this.inverterSn}_${t}`}findSensorId(t){const i=this.getSensorId(t);for(const r of this.cache.keys()){if(r===i)return r;if(r.startsWith(i+"_")){const a=r.substring(i.length+1);if(/^\d+$/.test(a))return r}}return i}subscribe(t,i){this.subscriptions.has(t)||this.subscriptions.set(t,new Set),this.subscriptions.get(t).add(i),gi.registerEntities([t]);const r=this.cache.get(t)??null;return i(r),()=>{var a,n;(a=this.subscriptions.get(t))==null||a.delete(i),((n=this.subscriptions.get(t))==null?void 0:n.size)===0&&this.subscriptions.delete(t)}}getNumeric(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"&&parseFloat(i.state)||0,lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:0,lastUpdated:null,attributes:{},exists:!1}}getString(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"?i.state:"",lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:"",lastUpdated:null,attributes:{},exists:!1}}get(t){return this.cache.get(t)??null}getAll(){return Object.fromEntries(this.cache)}batchLoad(t){const i={};for(const r of t)i[r]=this.getNumeric(r);return i}updateHass(t){if(this.hass=t,t!=null&&t.states){const i=new Set(Object.keys(t.states));for(const r of Array.from(this.cache.keys()))i.has(r)||(this.cache.delete(r),this.notifySubscribers(r,null));for(const[r,a]of Object.entries(t.states)){const n=this.cache.get(r),o=a;this.cache.set(r,o),((n==null?void 0:n.state)!==o.state||(n==null?void 0:n.last_updated)!==o.last_updated)&&this.notifySubscribers(r,o)}}}notifySubscribers(t,i){const r=this.subscriptions.get(t);if(r)for(const a of r)try{a(i)}catch(n){L.error("Entity callback error",n,{entityId:t})}}destroy(){var t;(t=this.stateWatcherUnsub)==null||t.call(this),this.subscriptions.clear(),this.cache.clear(),L.debug("EntityStore destroyed")}}let Fr=null;function dp(e,t){return Fr&&Fr.destroy(),Fr=new lp(e,t),Fr}function It(){return Fr}const cp=3,pp=1e3;class up{constructor(){this.hass=null,this.initPromise=null}async getHass(){return this.hass?this.hass:this.initPromise?this.initPromise:(this.initPromise=this.initHass(),this.initPromise)}getHassSync(){return this.hass}async refreshHass(){const t=await this.findHass();return t?(this.hass=t,L.info("HASS client refreshed"),t):this.hass}async initHass(){L.debug("Initializing HASS client");const t=await this.findHass();return t?(this.hass=t,L.info("HASS client initialized"),t):(L.warn("HASS not found in parent context"),null)}async findHass(){var t,i;if(typeof window>"u")return null;if(window.hass)return window.hass;if(window.parent&&window.parent!==window)try{const r=(i=(t=window.parent.document)==null?void 0:t.querySelector("home-assistant"))==null?void 0:i.hass;if(r)return r}catch{L.debug("Cannot access parent HASS (cross-origin)")}return window.customPanel?window.customPanel.hass:null}async fetchWithAuth(t,i={}){var o,l;const r=await this.getHass();if(!r)throw new Sr("Cannot get HASS context");try{const p=new URL(t,window.location.href).hostname;if(p!=="localhost"&&p!=="127.0.0.1"&&!t.startsWith("/api/"))throw new Error(`fetchWithAuth rejected for non-localhost URL: ${t}`)}catch(c){if(c.message.includes("rejected"))throw c}const a=(l=(o=r.auth)==null?void 0:o.data)==null?void 0:l.access_token;if(!a)throw new Sr("No access token available");const n=new Headers(i.headers);return n.set("Authorization",`Bearer ${a}`),n.has("Content-Type")||n.set("Content-Type","application/json"),this.fetchWithRetry(t,{...i,headers:n})}async fetchWithRetry(t,i,r=cp){try{const a=await fetch(t,i);if(!a.ok)throw a.status===401?new Sr("Token expired or invalid"):new us(`HTTP ${a.status}: ${a.statusText}`);return a}catch(a){if(r>0&&a instanceof us)return L.warn(`Retrying fetch (${r} left)`,{url:t}),await this.delay(pp),this.fetchWithRetry(t,i,r-1);throw a}}async callApi(t,i,r){const a=await this.getHass();if(!a)throw new Sr("Cannot get HASS context");return a.callApi(t,i,r)}async callService(t,i,r){const a=await this.getHass();if(!(a!=null&&a.callService))return L.error("Cannot call service — hass not available"),!1;try{return await a.callService(t,i,r),!0}catch(n){return L.error(`Service call failed (${t}.${i})`,n),!1}}async callWS(t){const i=await this.getHass();if(!(i!=null&&i.callWS))throw new Sr("Cannot get HASS context for WS call");return i.callWS(t)}async fetchOIGAPI(t,i={}){try{const r=`/api/oig_cloud${t.startsWith("/")?"":"/"}${t}`;return await(await this.fetchWithAuth(r,{...i,headers:{"Content-Type":"application/json",...Object.fromEntries(new Headers(i.headers).entries())}})).json()}catch(r){return L.error(`OIG API fetch error for ${t}`,r),null}}async fetchOIGAPITyped(t,i={}){var p,u;const r=`/api/oig_cloud${t.startsWith("/")?"":"/"}${t}`,a=await this.getHass();if(!a)return{ok:!1,status:0,code:"provider_unreachable",error:"Cannot get HASS context"};const n=(u=(p=a.auth)==null?void 0:p.data)==null?void 0:u.access_token;if(!n)return{ok:!1,status:0,code:"auth",error:"No access token available"};const o=new Headers(i.headers);o.set("Authorization",`Bearer ${n}`),o.has("Content-Type")||o.set("Content-Type","application/json");let l;try{l=await fetch(r,{...i,headers:o})}catch(h){const g=h;return g.name==="AbortError"?{ok:!1,status:0,code:"aborted",error:g.message}:(L.error(`OIG API typed fetch error for ${t}`,g),{ok:!1,status:0,code:"provider_unreachable",error:g.message})}let c=null;try{c=await l.json()}catch{c=null}if(!l.ok){const h=c??{};return{ok:!1,status:l.status,code:h.code??"provider_unreachable",error:h.error??l.statusText}}return{ok:!0,status:l.status,data:c}}async loadBatteryTimeline(t,i="active"){return this.fetchOIGAPI(`/battery_forecast/${t}/timeline?type=${i}`)}async loadUnifiedCostTile(t){return this.fetchOIGAPI(`/battery_forecast/${t}/unified_cost_tile`)}async loadSpotPrices(t){return this.fetchOIGAPI(`/spot_prices/${t}/intervals`)}async loadAnalytics(t){return this.fetchOIGAPI(`/analytics/${t}`)}async loadPlannerSettings(t){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`)}async savePlannerSettings(t,i){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`,{method:"POST",body:JSON.stringify(i)})}async loadDetailTabs(t,i,r="hybrid"){return this.fetchOIGAPI(`/battery_forecast/${t}/detail_tabs?tab=${i}&plan=${r}`)}async loadModules(t){return this.fetchOIGAPI(`/${t}/modules`)}openEntityDialog(t){var i;try{const r=((i=window.parent.document)==null?void 0:i.querySelector("home-assistant"))??document.querySelector("home-assistant");if(!r)return L.warn("Cannot open entity dialog — home-assistant element not found"),!1;const a=new CustomEvent("hass-more-info",{bubbles:!0,composed:!0,detail:{entityId:t}});return r.dispatchEvent(a),!0}catch(r){return L.error("Cannot open entity dialog",r),!1}}async showNotification(t,i,r="success"){await this.callService("persistent_notification","create",{title:t,message:i,notification_id:`oig_dashboard_${Date.now()}`})||console.log(`[${r.toUpperCase()}] ${t}: ${i}`)}getToken(){var t,i,r;return((r=(i=(t=this.hass)==null?void 0:t.auth)==null?void 0:i.data)==null?void 0:r.access_token)??null}delay(t){return new Promise(i=>setTimeout(i,t))}}const J=new up,fs={solar:"#ffd54f",battery:"#4caf50",inverter:"#9575cd",grid:"#42a5f5",house:"#f06292"},Mr={solar:"linear-gradient(135deg, rgba(255,213,79,0.15) 0%, rgba(255,179,0,0.08) 100%)",battery:"linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(56,142,60,0.08) 100%)",grid:"linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(33,150,243,0.08) 100%)",house:"linear-gradient(135deg, rgba(240,98,146,0.15) 0%, rgba(233,30,99,0.08) 100%)",inverter:"linear-gradient(135deg, rgba(149,117,205,0.15) 0%, rgba(126,87,194,0.08) 100%)"},Va={battery:"rgba(76,175,80,0.4)",grid:"rgba(66,165,245,0.4)",house:"rgba(240,98,146,0.4)",inverter:"rgba(149,117,205,0.4)"},Hi={solar:"#ffd54f",battery:"#ff9800",grid_import:"#f44336",grid_export:"#4caf50",house:"#f06292"},za={solar:5400,battery:7e3,grid:17e3,house:1e4},Eo={solarPower:0,solarP1:0,solarP2:0,solarV1:0,solarV2:0,solarI1:0,solarI2:0,solarPercent:0,solarToday:0,solarForecastToday:0,solarForecastTomorrow:0,solarForecastStale:!1,batterySoC:0,batteryPower:0,batteryVoltage:0,batteryCurrent:0,batteryTemp:0,batteryChargeTotal:0,batteryDischargeTotal:0,batteryChargeSolar:0,batteryChargeGrid:0,batteryChargeMonth:0,batteryDischargeMonth:0,batteryFloorPct:0,batteryUsableKwh:0,batteryInstalledKwh:0,batteryMissingKwh:0,batterySoH:0,batteryEfficiency:0,batteryForecastKwh:0,isGridCharging:!1,timeToEmpty:"",timeToFull:"",balancingState:"standby",balancingTimeRemaining:"",gridChargingPlan:{hasBlocks:!1,totalEnergyKwh:0,totalCostCzk:0,windowLabel:null,durationMinutes:0,currentBlockLabel:null,nextBlockLabel:null,blocks:[]},gridPower:0,gridVoltage:0,gridFrequency:0,gridImportToday:0,gridExportToday:0,gridL1V:0,gridL2V:0,gridL3V:0,gridL1P:0,gridL2P:0,gridL3P:0,spotPrice:0,exportPrice:0,currentTariff:"",gridImportCostToday:null,gridImportCostMonth:null,gridExportEarningsToday:null,gridExportEarningsMonth:null,housePower:0,houseTodayWh:0,houseL1:0,houseL2:0,houseL3:0,nonbackupPower:0,nonbackupTodayWh:0,nonbackupL1:0,nonbackupL2:0,nonbackupL3:0,zalohaPlannedRemainingKwh:0,selfSufficiencyTodayPct:0,srcFveTodayKwh:0,srcBatteryTodayKwh:0,srcGridTodayKwh:0,inverterMode:"",inverterGridMode:"unknown",inverterGridLimit:0,inverterTemp:0,bypassStatus:"off",notificationsUnread:0,notificationsError:0,boilerIsUse:!1,boilerPower:0,boilerDayEnergy:0,boilerManualMode:"",boilerInstallPower:3e3,plannerAutoMode:null,plannerRecommendedMode:"",lastUpdate:""},ld={home_1:"Home 1",home_2:"Home 2",home_3:"Home 3",home_ups:"Home UPS"},ms={"Home 1":"home_1","Home 2":"home_2","Home 3":"home_3","Home UPS":"home_ups","Mode 0":"home_1","Mode 1":"home_2","Mode 2":"home_3","Mode 3":"home_ups","HOME I":"home_1","HOME II":"home_2","HOME III":"home_3","HOME UPS":"home_ups",0:"home_1",1:"home_2",2:"home_3",3:"home_ups"},Br={off:"Vypnuto",on:"Zapnuto",limited:"S omezením"},Qn={Vypnuto:"off",Zapnuto:"on",Omezeno:"limited",omezeno:"limited",vypnuto:"off",zapnuto:"on",Off:"off",On:"on",Limited:"limited",off:"off",on:"on",limited:"limited",0:"off",1:"on",2:"limited"},hp={off:"🚫",on:"💧",limited:"🚰"},dd={cbb:"Inteligentní",manual:"Manuální"},cd={cbb:"🤖",manual:"👤"},vs={CBB:"cbb",Manuální:"manual",Manual:"manual",Inteligentní:"cbb"},gp={set_box_mode:"🏠 Změna režimu boxu",set_grid_delivery:"💧 Změna nastavení přetoků",set_grid_delivery_limit:"🔢 Změna limitu přetoků",set_boiler_mode:"🔥 Změna nastavení bojleru",set_formating_mode:"🔋 Změna nabíjení baterie",set_battery_capacity:"⚡ Změna kapacity baterie"},bp={CBB:"Inteligentní",Manual:"Manuální",Manuální:"Manuální"},pd={0:"Žádný",1:"Home 5",2:"Home 6",3:"Home 5 + Home 6",4:"Flexibilita"},ud={status:"idle",activity:"",queueCount:0,runningRequests:[],queuedRequests:[],allRequests:[],currentBoxMode:"home_1",currentGridDelivery:"off",currentGridLimit:0,currentBoilerMode:"cbb",pendingServices:new Map,changingServices:new Set,gridDeliveryState:{currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},supplementary:{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1}},fp="probíhá změna";function xo(e){return e.trim().toLowerCase().includes(fp)}function Io(e){const t=e.trim();if(t in Qn)return Qn[t];const i=t.toLowerCase(),r=Object.entries(Qn).find(([a])=>a.toLowerCase()===i);return r?r[1]:i.startsWith("omez")||i.includes("limit")?"limited":i.startsWith("zapn")||i==="on"?"on":i.startsWith("vypn")||i==="off"?"off":"unknown"}function mp(e){const t=e.get("grid_mode");if(!t)return null;const i=Io(t);return i==="unknown"?null:i}function vp(e){const t=e.get("grid_limit");if(!t)return null;const i=parseInt(t,10);return Number.isFinite(i)&&i>=0?i:null}function yp(e){return e.changingServices.has("grid_mode")||e.changingServices.has("grid_limit")}function hd(e,t){const{gridModeRaw:i,gridLimit:r}=e,a=i.trim().toLowerCase(),n=a==="unavailable"||a==="unknown"||a==="",o=xo(i),l=yp(t),c=o||l;let p;n||o?p="unknown":p=Io(i);let u=null;!n&&Number.isFinite(r)&&r>=0&&(u=r);const h=mp(t.pendingServices),g=vp(t.pendingServices);return{currentLiveDelivery:p,currentLiveLimit:u,pendingDeliveryTarget:h,pendingLimitTarget:g,isTransitioning:c,isUnavailable:n}}function xp(e){return e.isTransitioning&&e.pendingDeliveryTarget?e.pendingDeliveryTarget:e.currentLiveDelivery}const ys=new URLSearchParams(window.location.search),Fo=ys.get("sn")||ys.get("inverter_sn")||"";function Ga(e,t=Fo){return`sensor.oig_${t}_${e}`}function xs(e,t,i=Fo){var n;const r=Ga(t,i);return r in e?r:((n=Object.keys(e).filter(o=>o.startsWith(r+"_")).map(o=>({id:o,suffix:parseInt(o.substring(r.length+1),10)})).filter(o=>Number.isFinite(o.suffix)).sort((o,l)=>o.suffix-l.suffix)[0])==null?void 0:n.id)??null}function K(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function bt(e){return!(e!=null&&e.state)||e.state==="unknown"||e.state==="unavailable"?"":e.state}function ws(e,t="on"){if(!(e!=null&&e.state))return!1;const i=e.state.toLowerCase();return i===t||i==="1"||i==="zapnuto"}function wp(e){const t=(e||"").toLowerCase();return t==="charging"?"charging":t==="balancing"||t==="holding"?"holding":t==="completed"?"completed":t==="planned"?"planned":"standby"}function wo(e){return e==="tomorrow"?"zítra":e==="today"?"dnes":""}function _s(e){if(!e)return null;const[t,i]=e.split(":").map(Number);return!Number.isFinite(t)||!Number.isFinite(i)?null:t*60+i}function _p(e){const t=Number(e.grid_import_kwh??e.grid_charge_kwh??0);if(Number.isFinite(t)&&t>0)return t;const i=Number(e.battery_start_kwh??0),r=Number(e.battery_end_kwh??0);return Number.isFinite(i)&&Number.isFinite(r)?Math.max(0,r-i):0}function gd(e=[]){return[...e].sort((t,i)=>{const r=(t.day==="tomorrow"?1:0)-(i.day==="tomorrow"?1:0);return r!==0?r:(t.time_from||"").localeCompare(i.time_from||"")})}function $p(e){if(!Array.isArray(e)||e.length===0)return null;const t=gd(e),i=t[0],r=t.at(-1),a=wo(i==null?void 0:i.day),n=wo(r==null?void 0:r.day);if(a===n){const g=a?`${a} `:"";return!(i!=null&&i.time_from)||!(r!=null&&r.time_to)?g.trim()||null:`${g}${i.time_from} – ${r.time_to}`}const o=a?`${a} `:"",l=n?`${n} `:"",c=(i==null?void 0:i.time_from)||"--",p=(r==null?void 0:r.time_to)||"--",u=i?`${o}${c}`:"--",h=r?`${l}${p}`:"--";return`${u} → ${h}`}function kp(e){if(!Array.isArray(e)||e.length===0)return 0;let t=0;return e.forEach(i=>{const r=_s(i.time_from),a=_s(i.time_to);if(r===null||a===null)return;const n=a-r;n>0&&(t+=n)}),t}function $s(e){const t=wo(e.day),i=t?`${t} `:"",r=e.time_from||"--",a=e.time_to||"--";return`${i}${r} - ${a}`}function Cp(e){const t=e.find(a=>{const n=(a.status||"").toLowerCase();return n==="running"||n==="active"})||null,i=t?e[e.indexOf(t)+1]||null:e[0]||null;return{runningBlock:t,upcomingBlock:i,shouldShowNext:!!(i&&(!t||i!==t))}}function Sp(e){const t=(e==null?void 0:e.attributes)||{},i=Array.isArray(t.charging_blocks)?t.charging_blocks:[],r=gd(i),a=Number(t.total_energy_kwh)||0,n=a>0?a:r.reduce((v,f)=>v+_p(f),0),o=Number(t.total_cost_czk)||0,l=o>0?o:r.reduce((v,f)=>v+Number(f.total_cost_czk||0),0),c=$p(r),p=kp(r),{runningBlock:u,upcomingBlock:h,shouldShowNext:g}=Cp(r);return{hasBlocks:r.length>0,totalEnergyKwh:n,totalCostCzk:l,windowLabel:c,durationMinutes:p,currentBlockLabel:u?$s(u):null,nextBlockLabel:g&&h?$s(h):null,blocks:r}}function Mp(e){const t=b=>Number.isFinite(b)&&b>=0?b:0,i=t(e.fveTodayWh),r=t(e.battDischargeTodayWh),a=t(e.battChargeFveTodayWh),n=t(e.gridExportTodayWh),o=t(e.zalohaConsumptionWh),l=t(e.nezalohaConsumptionWh),c=o+l;if(c<=0)return{pct:0,fveKwh:0,batteryKwh:0,gridKwh:0,arcFve:0,arcBattery:0,arcGrid:0};const p=Math.min(r,c),u=Math.max(0,i-a-n),h=Math.min(u,Math.max(0,c-p)),g=Math.max(0,c-h-p),v=(h+p)/c*100,f=b=>b/1e3;return{pct:Math.min(100,Math.max(0,v)),fveKwh:f(h),batteryKwh:f(p),gridKwh:f(g),arcFve:h/c,arcBattery:p/c,arcGrid:g/c}}function Ap(e,t=Fo){var os,ss,ls,ds;const i=(e==null?void 0:e.states)||e||{},r=St=>i[Ga(St,t)]||null,a=K(r("actual_fv_p1")),n=K(r("actual_fv_p2")),o=K(r("extended_fve_voltage_1")),l=K(r("extended_fve_voltage_2")),c=K(r("extended_fve_current_1")),p=K(r("extended_fve_current_2")),u=r("solar_forecast"),h=St=>{var ps;const ni=(ps=u==null?void 0:u.attributes)==null?void 0:ps[St];if(ni==null||ni==="")return null;const cs=parseFloat(ni);return Number.isFinite(cs)?cs:null},g=h("today_total_kwh")??h("today_total_sum_kw")??K(u),v=h("tomorrow_total_kwh")??h("tomorrow_total_sum_kw")??0,f=((os=u==null?void 0:u.attributes)==null?void 0:os.forecast_stale)===!0,b=K(r("batt_bat_c")),$=K(r("batt_batt_comp_p")),_=K(r("extended_battery_voltage")),w=K(r("extended_battery_current")),C=K(r("extended_battery_temperature")),D=K(r("computed_batt_charge_energy_today")),T=K(r("computed_batt_discharge_energy_today")),I=K(r("computed_batt_charge_fve_energy_today")),k=K(r("computed_batt_charge_grid_energy_today")),P=K(r("computed_batt_charge_energy_month")),V=K(r("computed_batt_discharge_energy_month")),Y=K(r("batt_bat_min")),U=K(r("usable_battery_capacity")),Z=K(r("installed_battery_capacity_kwh"))/1e3,Q=K(r("missing_battery_kwh")),Se=K(r("battery_health")),re=K(r("battery_efficiency")),q=K(r("battery_forecast")),de=r("grid_charging_planned"),F=ws(de),ae=bt(r("time_to_empty")),M=bt(r("time_to_full")),H=r("battery_balancing"),oe=wp((ss=H==null?void 0:H.attributes)==null?void 0:ss.current_state),be=bt({state:(ls=H==null?void 0:H.attributes)==null?void 0:ls.time_remaining}),dt=Sp(de),Jt=K(r("actual_aci_wtotal")),ei=K(r("extended_grid_voltage")),ti=K(r("ac_in_aci_f")),Li=K(r("ac_in_ac_ad")),ya=K(r("ac_in_ac_pd")),Bn=K(r("ac_in_aci_vr")),xa=K(r("ac_in_aci_vs")),ii=K(r("ac_in_aci_vt")),wa=K(r("actual_aci_wr")),_a=K(r("actual_aci_ws")),Ti=K(r("actual_aci_wt")),jn=K(r("spot_price_current_15min")),wr=K(r("export_price_current_15min")),Nn=bt(r("current_tariff")),ri=St=>{if(!St||!St.state||St.state==="unknown"||St.state==="unavailable")return null;const ni=parseFloat(St.state);return isNaN(ni)?null:ni},Rn=ri(r("computed_grid_import_cost_today")),$a=ri(r("computed_grid_import_cost_month")),Wn=ri(r("computed_grid_export_earnings_today")),ka=ri(r("computed_grid_export_earnings_month")),Ca=K(r("actual_aco_p")),Sa=K(r("ac_out_en_day")),Kn=K(r("ac_out_aco_pr")),Zn=K(r("ac_out_aco_ps")),Ma=K(r("ac_out_aco_pt")),Aa=K(r("actual_acinb_wtotal")),Pi=K(r("computed_nonbackup_consumption_today")),qn=K(r("actual_acinb_wr")),La=K(r("actual_acinb_ws")),Ta=K(r("actual_acinb_wt")),A=r("battery_forecast"),fe=Number((ds=A==null?void 0:A.attributes)==null?void 0:ds.planned_consumption_today)||0,_r=bt(r("box_prms_mode")),$r=xs(i,"invertor_prms_to_grid",t)||Ga("invertor_prms_to_grid",t),ai=xs(i,"invertor_prm1_p_max_feed_grid",t)||Ga("invertor_prm1_p_max_feed_grid",t),kr=i[$r],Cr=i[ai],_c=(kr==null?void 0:kr.state)??"",$c=parseFloat((Cr==null?void 0:Cr.state)??"")||0,as=hd({gridModeRaw:_c,gridLimit:$c},{pendingServices:new Map,changingServices:new Set}),kc=as.currentLiveDelivery,Cc=as.currentLiveLimit??0,Sc=K(r("box_temp")),Mc=bt(r("bypass_status"))||"off",Ac=K(r("notification_count_unread")),Lc=K(r("notification_count_error")),Gn=r("boiler_is_use"),Tc=Gn?ws(Gn)||bt(Gn)==="Zapnuto":!1,Pc=K(r("boiler_current_cbb_w")),Hc=K(r("boiler_day_w")),Vc=bt(r("boiler_manual_mode")),zc=K(r("boiler_install_power"))||3e3,Dc=r("real_data_update"),Oc=bt(Dc),ns=K(r("dc_in_fv_ad")),Pa=Mp({fveTodayWh:ns,battDischargeTodayWh:T,battChargeFveTodayWh:I,zalohaConsumptionWh:Sa,nezalohaConsumptionWh:Pi,gridExportTodayWh:ya});return{solarPower:a+n,solarP1:a,solarP2:n,solarV1:o,solarV2:l,solarI1:c,solarI2:p,solarPercent:K(r("dc_in_fv_proc")),solarToday:ns,solarForecastToday:g,solarForecastTomorrow:v,solarForecastStale:f,batterySoC:b,batteryPower:$,batteryVoltage:_,batteryCurrent:w,batteryTemp:C,batteryChargeTotal:D,batteryDischargeTotal:T,batteryChargeSolar:I,batteryChargeGrid:k,batteryChargeMonth:P,batteryDischargeMonth:V,batteryFloorPct:Y,batteryUsableKwh:U,batteryInstalledKwh:Z,batteryMissingKwh:Q,batterySoH:Se,batteryEfficiency:re,batteryForecastKwh:q,isGridCharging:F,timeToEmpty:ae,timeToFull:M,balancingState:oe,balancingTimeRemaining:be,gridChargingPlan:dt,gridPower:Jt,gridVoltage:ei,gridFrequency:ti,gridImportToday:Li,gridExportToday:ya,gridL1V:Bn,gridL2V:xa,gridL3V:ii,gridL1P:wa,gridL2P:_a,gridL3P:Ti,spotPrice:jn,exportPrice:wr,currentTariff:Nn,gridImportCostToday:Rn,gridImportCostMonth:$a,gridExportEarningsToday:Wn,gridExportEarningsMonth:ka,housePower:Ca,houseTodayWh:Sa,houseL1:Kn,houseL2:Zn,houseL3:Ma,nonbackupPower:Aa,nonbackupTodayWh:Pi,nonbackupL1:qn,nonbackupL2:La,nonbackupL3:Ta,zalohaPlannedRemainingKwh:fe,selfSufficiencyTodayPct:Pa.pct,srcFveTodayKwh:Pa.fveKwh,srcBatteryTodayKwh:Pa.batteryKwh,srcGridTodayKwh:Pa.gridKwh,inverterMode:_r,inverterGridMode:kc,inverterGridLimit:Cc,inverterTemp:Sc,bypassStatus:Mc,notificationsUnread:Ac,notificationsError:Lc,boilerIsUse:Tc,boilerPower:Pc,boilerDayEnergy:Hc,boilerManualMode:Vc,boilerInstallPower:zc,plannerAutoMode:null,plannerRecommendedMode:bt(r("planner_recommended_mode")),lastUpdate:Oc}}const Ar={};function Da(e,t,i){const r=Math.abs(e),a=Math.min(100,r/t*100),n=Math.max(500,Math.round(3500-a*30));let o=n;return i&&Ar[i]!==void 0&&(o=Math.round(.3*n+(1-.3)*Ar[i]),Math.abs(o-Ar[i])<100&&(o=Ar[i])),i&&(Ar[i]=o),{active:r>=50,intensity:a,count:Math.max(1,Math.min(4,Math.ceil(1+a/33))),speed:o,size:Math.round(6+a/10),opacity:Math.min(1,.3+a/150)}}function si(e){return Math.abs(e)>=1e3?`${(e/1e3).toFixed(1)} kW`:`${Math.round(e)} W`}function Vi(e){return e>=1e3?`${(e/1e3).toFixed(2)} kWh`:`${Math.round(e)} Wh`}function ks(e){return e.includes("Home 1")?{icon:"🏠",text:"Home 1"}:e.includes("Home 2")?{icon:"🔋",text:"Home 2"}:e.includes("Home 3")?{icon:"☀️",text:"Home 3"}:e.includes("UPS")?{icon:"⚡",text:"Home UPS"}:{icon:"⚙️",text:e||"--"}}const Lp={"HOME I":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"HOME II":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"HOME III":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"rgba(158, 158, 158, 0.18)",label:"DO NOTHING"},"Mode 0":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"Mode 1":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"Mode 2":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"Mode 3":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"}},Cs={timeline:[],labels:[],prices:[],exportPrices:[],modeSegments:[],cheapestBuyBlock:null,expensiveBuyBlock:null,bestExportBlock:null,worstExportBlock:null,solar:null,battery:null,initialZoomStart:null,initialZoomEnd:null,currentSpotPrice:0,currentExportPrice:0,plannedConsumption:null,whatIf:null,solarForecastTotal:0,solarForecastTomorrow:0,solarForecastStale:!1},Ss=new URLSearchParams(window.location.search),_o=Ss.get("sn")||Ss.get("inverter_sn")||"";function Gi(e){return`sensor.oig_${_o}_${e}`}function Ms(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function $o(e){const t=e.getFullYear(),i=String(e.getMonth()+1).padStart(2,"0"),r=String(e.getDate()).padStart(2,"0"),a=String(e.getHours()).padStart(2,"0"),n=String(e.getMinutes()).padStart(2,"0"),o=String(e.getSeconds()).padStart(2,"0");return`${t}-${i}-${r}T${a}:${n}:${o}`}const tn={},Tp=5*60*1e3;async function Pp(e="hybrid"){const t=tn[e];if(t&&Date.now()-t.ts<Tp)return L.debug("Timeline cache hit",{plan:e,age:Math.round((Date.now()-t.ts)/1e3)}),t.data;try{const i=await J.getHass();if(!i)return[];let r;i.callApi?r=await i.callApi("GET",`oig_cloud/battery_forecast/${_o}/timeline?type=active`):r=await J.fetchOIGAPI(`battery_forecast/${_o}/timeline?type=active`);const a=(r==null?void 0:r.active)||(r==null?void 0:r.timeline)||[];return tn[e]={data:a,ts:Date.now()},L.info("Timeline fetched",{plan:e,points:a.length}),a}catch(i){return L.error("Failed to fetch timeline",i),[]}}function Hp(e){Object.keys(tn).forEach(t=>delete tn[t])}function Vp(e){const t=new Date,i=new Date(t);return i.setMinutes(Math.floor(t.getMinutes()/15)*15,0,0),e.filter(r=>new Date(r.timestamp)>=i)}function zp(e){return e.map(t=>{if(!t.timestamp)return new Date;try{const[i,r]=t.timestamp.split("T");if(!i||!r)return new Date;const[a,n,o]=i.split("-").map(Number),[l,c,p=0]=r.split(":").map(Number);return new Date(a,n-1,o,l,c,p)}catch{return new Date}})}function Dp(e){const t=e.mode_name||e.mode_planned||e.mode||e.mode_display||null;if(!t||typeof t!="string")return null;const i=t.trim();return i.length?i:null}function Op(e){return e.startsWith("HOME ")?e.replace("HOME ","").trim():e==="FULL HOME UPS"||e==="HOME UPS"?"UPS":e==="DO NOTHING"?"DN":e.substring(0,3).toUpperCase()}function Ep(e){return Lp[e]||{icon:"❓",color:"rgba(158, 158, 158, 0.15)",label:e}}function Ip(e){if(!e.length)return[];const t=[];let i=null;for(const r of e){const a=Dp(r);if(!a){i=null;continue}const n=new Date(r.timestamp),o=new Date(n.getTime()+15*60*1e3);if(i!==null&&i.mode===a)i.end=o;else{const l={mode:a,start:n,end:o};t.push(l),i=l}}return t.map(r=>{const a=Ep(r.mode);return{...r,icon:a.icon,color:a.color,label:a.label,shortLabel:Op(r.mode)}})}function Oa(e,t,i=3){const r=Math.floor(i*60/15);if(e.length<r)return null;let a=null,n=t?1/0:-1/0;for(let o=0;o<=e.length-r;o++){const l=e.slice(o,o+r),c=l.map(u=>u.price),p=c.reduce((u,h)=>u+h,0)/c.length;(t&&p<n||!t&&p>n)&&(n=p,a={start:l[0].timestamp,end:l[l.length-1].timestamp,avg:p,min:Math.min(...c),max:Math.max(...c),values:c,type:"cheapest-buy"})}return a}function Fp(e,t){const r=((e==null?void 0:e.states)||{})[Gi("solar_forecast")];if(!(r!=null&&r.attributes)||!t.length)return null;const a=r.attributes,n=a.today_total_kwh||0,o=a.tomorrow_total_kwh||0,l=a.forecast_stale===!0,c=a.today_hourly_string1_kw||{},p=a.tomorrow_hourly_string1_kw||{},u=a.today_hourly_string2_kw||{},h=a.tomorrow_hourly_string2_kw||{},g={...c,...p},v={...u,...h},f=(_,w,C)=>_==null||w==null?_||w||0:_+(w-_)*C,b=[],$=[];for(const _ of t){const w=_.getHours(),C=_.getMinutes(),D=new Date(_);D.setMinutes(0,0,0);const T=$o(D),I=new Date(D);I.setHours(w+1);const k=$o(I),P=g[T]||0,V=g[k]||0,Y=v[T]||0,U=v[k]||0,Z=C/60;b.push(f(P,V,Z)),$.push(f(Y,U,Z))}return{string1:b,string2:$,todayTotal:n,tomorrowTotal:o,stale:l,hasString1:b.some(_=>_>0),hasString2:$.some(_=>_>0)}}function Bp(e,t){if(!e.length)return{arrays:{baseline:[],solarCharge:[],gridCharge:[],gridNet:[],consumption:[]},initialZoomStart:null,initialZoomEnd:null};const i=e.map(h=>new Date(h.timestamp)),r=i[0].getTime(),a=i[i.length-1],n=a?a.getTime():r,o=[],l=[],c=[],p=[],u=[];for(const h of t){const g=$o(h),v=e.find(f=>f.timestamp===g);if(v){const f=(v.battery_capacity_kwh??v.battery_soc??v.battery_start)||0,b=v.solar_charge_kwh||0,$=v.grid_charge_kwh||0,_=typeof v.grid_net=="number"?v.grid_net:(v.grid_import||0)-(v.grid_export||0),w=v.load_kwh??v.consumption_kwh??v.load??0,C=(Number(w)||0)*4;o.push(f-b-$),l.push(b),c.push($),p.push(_),u.push(C)}else o.push(null),l.push(null),c.push(null),p.push(null),u.push(null)}return{arrays:{baseline:o,solarCharge:l,gridCharge:c,gridNet:p,consumption:u},initialZoomStart:r,initialZoomEnd:n}}function jp(e){const t=(e==null?void 0:e.states)||{},i=t[Gi("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const r=i.attributes,a=r.planned_consumption_today??null,n=r.planned_consumption_tomorrow??null,o=r.profile_today||"Žádný profil",l=t[Gi("ac_out_en_day")],c=l==null?void 0:l.state,u=(c&&c!=="unavailable"&&parseFloat(c)||0)/1e3,h=u+(a||0),g=(a||0)+(n||0);let v=null;if(h>0&&n!=null){const b=n-h,$=b/h*100;Math.abs($)<5?v="Zítra podobně":b>0?v=`Zítra více (+${Math.abs($).toFixed(0)}%)`:v=`Zítra méně (-${Math.abs($).toFixed(0)}%)`}return{todayConsumedKwh:u,todayPlannedKwh:a,todayTotalKwh:h,tomorrowKwh:n,totalPlannedKwh:g,profile:o!=="Žádný profil"&&o!=="Neznámý profil"?o:"Žádný profil",trendText:v}}function Np(e){const i=((e==null?void 0:e.states)||{})[Gi("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const a=i.attributes.mode_optimization||{},n=a.alternatives||{},o=a.total_cost_czk||0,l=a.total_savings_vs_home_i_czk||0,c=n["DO NOTHING"],p=(c==null?void 0:c.current_mode)||null;return{totalCost:o,totalSavings:l,alternatives:n,activeMode:p}}async function Rp(e,t="hybrid"){const i=performance.now();L.info("[Pricing] loadPricingData START");try{const r=await Pp(t),a=Vp(r);if(!a.length)return L.warn("[Pricing] No timeline data"),Cs;const n=a.map(Q=>({timestamp:Q.timestamp,price:Q.spot_price_czk||0})),o=a.map(Q=>({timestamp:Q.timestamp,price:Q.export_price_czk||0}));let l=zp(n);const c=Ip(a),p=Oa(n,!0,3);p&&(p.type="cheapest-buy");const u=Oa(n,!1,3);u&&(u.type="expensive-buy");const h=Oa(o,!1,3);h&&(h.type="best-export");const g=Oa(o,!0,3);g&&(g.type="worst-export");const v=a.map(Q=>new Date(Q.timestamp)),f=new Set([...l,...v].map(Q=>Q.getTime()));l=Array.from(f).sort((Q,Se)=>Q-Se).map(Q=>new Date(Q));const{arrays:b,initialZoomStart:$,initialZoomEnd:_}=Bp(a,l),w=Fp(e,l),C=(e==null?void 0:e.states)||{},D=Ms(C[Gi("spot_price_current_15min")]),T=Ms(C[Gi("export_price_current_15min")]),I=jp(e),k=Np(e),P=(w==null?void 0:w.todayTotal)||0,V=(w==null?void 0:w.tomorrowTotal)||0,Y=(w==null?void 0:w.stale)||!1,U={timeline:a,labels:l,prices:n,exportPrices:o,modeSegments:c,cheapestBuyBlock:p,expensiveBuyBlock:u,bestExportBlock:h,worstExportBlock:g,solar:w,battery:b,initialZoomStart:$,initialZoomEnd:_,currentSpotPrice:D,currentExportPrice:T,plannedConsumption:I,whatIf:k,solarForecastTotal:P,solarForecastTomorrow:V,solarForecastStale:Y},Z=(performance.now()-i).toFixed(0);return L.info(`[Pricing] loadPricingData COMPLETE in ${Z}ms`,{points:a.length,segments:c.length}),U}catch(r){return L.error("[Pricing] loadPricingData failed",r),Cs}}const Wp=120,ko={workday_spring:"Pracovní den - Jaro",workday_summer:"Pracovní den - Léto",workday_autumn:"Pracovní den - Podzim",workday_winter:"Pracovní den - Zima",weekend_spring:"Víkend - Jaro",weekend_summer:"Víkend - Léto",weekend_autumn:"Víkend - Podzim",weekend_winter:"Víkend - Zima"},Kp={fve:"#4CAF50",overflow:"#8BC34A",grid:"#FF9800",discharge:"#2196F3"},Zp={fve:"FVE",grid:"Síť",alternative:"Alternativa"},qp={fve:"fve",pv:"fve",overflow:"overflow",grid:"grid",alternative:"alternative",alt:"alternative",battery:"battery"},Gp={fve:"fve",pv:"fve",overflow:"overflow",grid:"grid",alternative:"alternative",alt:"alternative",discharge:"discharge",discharging:"discharge"};function Xn(e){if(e==null||e==="")return{source:null,sourceInvalid:!1};const t=qp[e.toLowerCase()];return t!==void 0?{source:t,sourceInvalid:!1}:{source:null,sourceInvalid:!0}}function Jn(e){return e==null||e===""?null:Gp[e.toLowerCase()]??null}const Up=new Set(["temperature_unavailable","temperature_stale","source_stale","activity_stale","source_invalid","power_sign_mismatch_charge","power_sign_mismatch_discharge","runtime_cache_empty"]);function eo(e){return e.filter(t=>Up.has(t))}const Co=new URLSearchParams(window.location.search);let So=Co.get("sn")||Co.get("inverter_sn")||"",to=Co.get("entry_id")||"";function Yp(e,t,i){return isNaN(e)?t:Math.max(t,Math.min(i,e))}function Qp(e,t,i){if(e==null)return null;const r=t-i;if(r<=0)return null;const a=(e-i)/r*100;return Yp(a,0,100)}function rn(e){if(!e)return"--:--";const t=e instanceof Date?e:new Date(e);return isNaN(t.getTime())?"--:--":t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}function As(e){if(!e)return"--";const t=new Date(e);return isNaN(t.getTime())?"--":t.toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}function Mo(e,t){return`${rn(e)}–${rn(t)}`}function Ls(e){return Zp[e||""]||e||"--"}function bd(e){return e?Object.values(e).reduce((t,i)=>t+(parseFloat(String(i))||0),0):0}function fd(e){return e?Object.entries(e).map(([i,r])=>({hour:parseInt(i,10),value:parseFloat(String(r))||0})).filter(i=>isFinite(i.value)).sort((i,r)=>r.value-i.value).slice(0,3).filter(i=>i.value>0).map(i=>i.hour).sort((i,r)=>i-r):[]}function Lr(e){if(!e)return null;const t=e.split(":").map(i=>parseInt(i,10));return t.length<2||!isFinite(t[0])||!isFinite(t[1])?null:t[0]*60+t[1]}function Ts(e,t,i){return t===null||i===null?!1:t<=i?e>=t&&e<i:e>=t||e<i}async function Xp(){var e,t,i,r,a;try{if(!to||!So)return L.warn("[Boiler] No entry_id or inverter_sn — cannot fetch boiler canonical"),{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null};const n=await J.fetchOIGAPI(`/boiler/${to}/${So}`);if(!n)return{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null};let o=!1,l=null;try{const p=await J.fetchOIGAPI(`/${to}/boiler_profile`);p!=null&&p.config?l=p.config:o=!0}catch{o=!0}const c={state:{current_temp:((e=n.current_state.temperatures)==null?void 0:e.upper_zone)??((t=n.current_state.temperatures)==null?void 0:t.top),target_temp:void 0,heating:n.current_state.heating,temperatures:n.current_state.temperatures,energy_state:n.current_state.energy_state,recommended_source:n.selected_source||n.current_state.recommended_source||void 0,circulation_recommended:!1},slots:n.plan_slots.map(p=>({start:p.start,end:p.end,consumption_kwh:p.consumption_kwh,avg_consumption_kwh:p.consumption_kwh,recommended_source:p.recommended_source,spot_price:p.spot_price??void 0})),total_consumption_kwh:n.plan_slots.reduce((p,u)=>p+(u.consumption_kwh||0),0),fve_kwh:((i=n.current_state.energy_tracking)==null?void 0:i.fve_kwh)??0,grid_kwh:((r=n.current_state.energy_tracking)==null?void 0:r.grid_kwh)??0,alt_kwh:((a=n.current_state.energy_tracking)==null?void 0:a.alt_kwh)??0,next_slot:n.plan_slots[0]||void 0,profiles:{}};return{profileData:c,planData:c,canonical:n,configProfileUnavailable:o,boilerProfileConfig:l}}catch(n){return L.warn("[Boiler] Failed to fetch canonical",{err:n}),{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null}}}function Jp(e,t,i){const r=e||t,a=r==null?void 0:r.state,n=(a==null?void 0:a.temperatures)||{},o=(a==null?void 0:a.energy_state)||{},l=isFinite(n.upper_zone??n.top)?n.upper_zone??n.top??null:null,c=isFinite(n.lower_zone??n.bottom)?n.lower_zone??n.bottom??null:null,p=isFinite(o.avg_temp)?o.avg_temp??null:null,u=isFinite(o.energy_needed_kwh)?o.energy_needed_kwh??null:null,h=i.targetTempC??60,g=i.coldInletTempC??10,v=Qp(p,h,g),f=(e==null?void 0:e.slots)||[],b=(e==null?void 0:e.next_slot)||e1(f);let $="Neplánováno";if(b){const w=Ls(b.recommended_source);$=`${Mo(b.start,b.end)} (${w})`}const _=Ls((a==null?void 0:a.recommended_source)||(b==null?void 0:b.recommended_source));return{currentTemp:isFinite(a==null?void 0:a.current_temp)?(a==null?void 0:a.current_temp)??null:null,targetTemp:(a==null?void 0:a.target_temp)||h,heating:(a==null?void 0:a.heating)||!1,tempTop:l,tempBottom:c,avgTemp:p,heatingPercent:v,energyNeeded:u,planCost:(e==null?void 0:e.estimated_cost_czk)??null,nextHeating:$,recommendedSource:_,nextProfile:(a==null?void 0:a.next_profile)||"",nextStart:(a==null?void 0:a.next_start)||""}}function e1(e){if(!Array.isArray(e))return null;const t=Date.now();return e.find(i=>{const r=new Date(i.end||i.end_time||"").getTime(),a=i.consumption_kwh??i.avg_consumption_kwh??0;return r>t&&a>0})||null}function t1(e){var g,v,f;if(!((g=e==null?void 0:e.slots)!=null&&g.length))return null;const t=e.slots.map(b=>({start:b.start||"",end:b.end||"",consumptionKwh:b.consumption_kwh??b.avg_consumption_kwh??0,recommendedSource:b.recommended_source||"",spotPrice:isFinite(b.spot_price)?b.spot_price??null:null,tempTop:b.temp_top,soc:b.soc})),i=t.filter(b=>b.consumptionKwh>0),r=parseFloat(String(e.total_consumption_kwh))||0,a=parseFloat(String(e.fve_kwh))||0,n=parseFloat(String(e.grid_kwh))||0,o=parseFloat(String(e.alt_kwh))||0,l=parseFloat(String(e.estimated_cost_czk))||0;let c="Mix: --";if(r>0){const b=Math.round(a/r*100),$=Math.round(n/r*100),_=Math.round(o/r*100);c=`Mix: FVE ${b}% · Síť ${$}% · Alt ${_}%`}const p=t.filter(b=>b.consumptionKwh>0&&b.spotPrice!==null).map(b=>({slot:b,price:b.spotPrice}));let u="--",h="--";if(p.length){const b=p.reduce((_,w)=>w.price<_.price?w:_),$=p.reduce((_,w)=>w.price>_.price?w:_);u=`${Mo(b.slot.start,b.slot.end)} (${b.price.toFixed(2)} Kč/kWh)`,h=`${Mo($.slot.start,$.slot.end)} (${$.price.toFixed(2)} Kč/kWh)`}return{slots:t,totalConsumptionKwh:r,fveKwh:a,gridKwh:n,altKwh:o,estimatedCostCzk:l,nextSlot:e.next_slot?{start:e.next_slot.start||"",end:e.next_slot.end||"",consumptionKwh:e.next_slot.consumption_kwh||0,recommendedSource:e.next_slot.recommended_source||"",spotPrice:e.next_slot.spot_price??null}:null,planStart:As((v=e.slots[0])==null?void 0:v.start),planEnd:As((f=e.slots[e.slots.length-1])==null?void 0:f.end),sourceDigest:c,activeSlotCount:i.length,cheapestSpot:u,mostExpensiveSpot:h}}function i1(e){const t=parseFloat(String(e==null?void 0:e.fve_kwh))||0,i=parseFloat(String(e==null?void 0:e.grid_kwh))||0,r=parseFloat(String(e==null?void 0:e.alt_kwh))||0,a=t+i+r;return{fveKwh:t,gridKwh:i,altKwh:r,fvePercent:a>0?t/a*100:0,gridPercent:a>0?i/a*100:0,altPercent:a>0?r/a*100:0}}function r1(e,t,i){var g;const r=(e==null?void 0:e.summary)||{},a=(g=e==null?void 0:e.profiles)==null?void 0:g[i],n=(a==null?void 0:a.hourly_avg)||{},o=r.predicted_total_kwh??bd(n),l=r.peak_hours??fd(n),c=isFinite(r.water_liters_40c)?r.water_liters_40c??null:null,p=r.circulation_windows||[],u=p.length?p.map(v=>`${v.start}–${v.end}`).join(", "):"--";let h="--";if(p.length){const v=new Date,f=v.getHours()*60+v.getMinutes();if(p.some($=>{const _=Lr($.start),w=Lr($.end);return Ts(f,_,w)})){const $=p.find(_=>{const w=Lr(_.start),C=Lr(_.end);return Ts(f,w,C)});h=$?`ANO (do ${$.end})`:"ANO"}else{const $=t==null?void 0:t.state,_=$==null?void 0:$.circulation_recommended;let w=1/0,C=null;for(const D of p){const T=Lr(D.start);if(T===null)continue;let I=T-f;I<0&&(I+=24*60),I<w&&(w=I,C=D)}_&&C?h=`DOPORUČENO (${C.start}–${C.end})`:C?h=`Ne (další ${C.start}–${C.end})`:h="Ne"}}return{predictedTodayKwh:o,peakHours:l,waterLiters40c:c,circulationWindows:u,circulationNow:h}}function a1(e){const t=e??{},i=isFinite(t.volume_l)?t.volume_l??null:null,r=isFinite(t.heater_power_kw)?t.heater_power_kw??null:null,a=r!==null?r*1e3:null;return{volumeL:i,heaterPowerW:a,heaterPowerKw:r,targetTempC:isFinite(t.target_temp_c)?t.target_temp_c??null:null,deadlineTime:t.deadline_time||"--:--",stratificationMode:t.stratification_mode||"--",kCoefficient:i?(i*.001163).toFixed(4):"--",coldInletTempC:isFinite(t.cold_inlet_temp_c)?t.cold_inlet_temp_c??10:10,auraMaxTempC:isFinite(t.aura_max_temp_c)?t.aura_max_temp_c??null:null}}function n1(e){return e!=null&&e.profiles?Object.entries(e.profiles).map(([t,i])=>({id:t,name:i.name||t,targetTemp:i.target_temp||55,startTime:i.start_time||"06:00",endTime:i.end_time||"22:00",days:i.days||[1,1,1,1,1,0,0],enabled:i.enabled!==!1})):[]}function o1(e){var r;const t=[],i=((r=e==null?void 0:e.summary)==null?void 0:r.today_hours)||[];for(let a=0;a<24;a++){const n=i.includes(a);t.push({hour:a,temp:n?55:25,heating:n})}return t}function s1(e,t){var o;const i=(o=e==null?void 0:e.profiles)==null?void 0:o[t],r=["Po","Út","St","Čt","Pá","So","Ne"];if(!i)return r.map(l=>({day:l,hours:Array(24).fill(0)}));const a=i.heatmap||[];let n=[];if(a.length>0)n=a.map(l=>l.map(c=>c&&typeof c=="object"?parseFloat(c.consumption)||0:parseFloat(String(c))||0));else{const l=i.hourly_avg||{};n=Array.from({length:7},()=>Array.from({length:24},(c,p)=>parseFloat(String(l[p]||0))))}return r.map((l,c)=>({day:l,hours:n[c]||Array(24).fill(0)}))}function l1(e,t){var p;const i=(p=e==null?void 0:e.profiles)==null?void 0:p[t],r=(e==null?void 0:e.summary)||{},a=(i==null?void 0:i.hourly_avg)||{},n=Array.from({length:24},(u,h)=>parseFloat(String(a[h]||0))),o=r.predicted_total_kwh??bd(a),l=r.peak_hours??fd(a),c=isFinite(r.avg_confidence)?r.avg_confidence??null:null;return{hourlyAvg:n,peakHours:l,predictedTotalKwh:o,confidence:c,daysTracked:7}}function d1(e,t){var u,h,g;if(!((u=e==null?void 0:e.slots)!=null&&u.length)||!(t!=null&&t.length))return{fve:"--",grid:"--"};const i=(h=e.slots[0])==null?void 0:h.start,r=(g=e.slots[e.slots.length-1])==null?void 0:g.end,a=i?new Date(i).getTime():null,n=r?new Date(r).getTime():null,o=t.filter(v=>{if(!a||!n)return!0;const f=v.timestamp||v.time;if(!f)return!1;const b=new Date(f).getTime();return b>=a&&b<=n}),l=v=>{const f=[];let b=null;for(const $ of o){const _=$.timestamp||$.time;if(!_)continue;const w=new Date(_),C=v($);C&&!b?b={start:w,end:w}:C&&b?b.end=w:!C&&b&&(f.push(b),b=null)}return b&&f.push(b),f.length?f.map($=>`${rn($.start)}–${rn(new Date($.end.getTime()+15*6e4))}`).join(", "):"--"},c=l(v=>(parseFloat(v.solar_kwh??v.solar_charge_kwh??0)||0)>0),p=l(v=>(parseFloat(v.grid_charge_kwh??0)||0)>0);return{fve:c,grid:p}}async function c1(){return L.info("[Boiler] Planning heating..."),await J.callService("oig_cloud","plan_boiler_heating",{})}async function p1(){return L.info("[Boiler] Applying plan..."),await J.callService("oig_cloud","apply_boiler_plan",{})}async function u1(){return L.info("[Boiler] Canceling plan..."),await J.callService("oig_cloud","cancel_boiler_plan",{})}const h1=new Set(["charging_fve","charging_overflow","charging_grid","charging_alt","discharging","standby","unknown"]);function Ps(e){return e&&h1.has(e)?e:"unknown"}function g1(e){return e==="on"?"on":e==="off"?"off":"unavailable"}function b1(e,t=!1){var de,F,ae;const i={entryId:null,boxId:null,available:!1};if(!e)return{status:null,planSlots:[],explanation:null,manualOverride:null,identity:i,activity:null,sourceSegments:[],timeline:[],sparkline:null,demandMap:null,drawMap:null,circulationRuns:[],legionella:null,planSummary:null,energyToday:null,loading:!1,loadError:"Nepodařilo se načíst data bojleru",altSourceType:null};const r=e.current_state,a=r.temperatures??{},n=isFinite(a.top)?a.top??null:isFinite(a.upper_zone)?a.upper_zone??null:null,o=isFinite(a.bottom)?a.bottom??null:isFinite(a.lower_zone)?a.lower_zone??null:null,l={currentState:r.heating?"heating":"idle",comfortSatisfied:e.comfort_status.comfort_satisfied,comfortStatusCode:e.comfort_status.comfort_status_code,selectedSource:Xn(e.selected_source).source,actuatedSource:Xn(e.actuated_source).source,temperatureTop:n,temperatureBottom:o,energyNeededKwh:isFinite((de=r.energy_state)==null?void 0:de.energy_needed_kwh)?((F=r.energy_state)==null?void 0:F.energy_needed_kwh)??null:null,heating:r.heating,lastUpdate:r.last_update??null,degraded:e.degraded_flags.degraded,degradedFlags:eo(e.degraded_flags.flags??[])},c=(e.plan_slots??[]).map(M=>{const{source:H,sourceInvalid:oe}=Xn(M.recommended_source);return{start:M.start,end:M.end,consumptionKwh:M.consumption_kwh,confidence:M.confidence,recommendedSource:H,sourceInvalid:oe||null,spotPrice:isFinite(M.spot_price)?M.spot_price??null:null,altPrice:isFinite(M.alt_price)?M.alt_price??null:null,overflowAvailable:M.overflow_available,heatingKwh:M.heating_kwh??null,pvKwh:M.pv_kwh??null,gridKwh:M.grid_kwh??null,altKwh:M.alt_kwh??null,expectedTempTopC:M.predicted_top_temp_c??M.predicted_temperature_c??null,readyLiters:M.ready_liters??null,comfortSatisfied:M.comfort_satisfied??null,estimatedCostCzk:M.estimated_cost_czk??null,pvShare:typeof M.pv_share=="number"?M.pv_share:M.consumption_kwh&&M.pv_contribution_kwh!=null?M.pv_contribution_kwh/M.consumption_kwh:null,purpose:M.purpose??null}}),p=eo(e.degraded_flags.flags??[]),u=t?[...p,"config_profile_unavailable"]:p,h=e.freshness??{},g={reasonCodes:e.reason_codes??[],planCreatedAt:h.plan_created_at??null,planValidUntil:h.plan_valid_until??null,dataAgeSecs:isFinite(h.data_age_seconds)?h.data_age_seconds??null:null,degradedReasons:u,unsatisfiedComfortGapC:e.comfort_status.unsatisfied_comfort_gap_c??null,temperatureAtDeadlineC:e.comfort_status.temperature_at_deadline_c??null},v={active:((ae=e.manual_override)==null?void 0:ae.active)??!1,ttlMinutes:Wp,reason:"",capabilityAvailable:e.manual_override!=null},f={entryId:e.entry_id,boxId:e.box_id,available:!!(e.entry_id&&e.box_id)},b=e.activity??null,$=b!=null?{state:Ps(b.state),source:Jn(b.source),temperatureTrendCPerMin:isFinite(b.temperature_trend_c_per_min)?b.temperature_trend_c_per_min??null:null,fillLevelPct:isFinite(b.fill_level_pct)?b.fill_level_pct??null:null,auraMaxTempC:isFinite(b.aura_max_temp_c)?b.aura_max_temp_c:0,heaterStates:Object.fromEntries(Object.entries(b.heater_states??{}).map(([M,H])=>[M,g1(H)])),staleFlags:eo(Array.isArray(b.stale_flags)?b.stale_flags:[]),sourceEstimated:b.source_estimated===!0}:null,_=(e.source_segments??[]).map(M=>({key:Jn(M.key),start:M.start,end:M.end,energyKwh:isFinite(M.energy_kwh)?M.energy_kwh:0,fillPct:isFinite(M.fill_pct)?M.fill_pct:0,active:M.active})),w=(e.timeline??[]).map(M=>({timestamp:M.timestamp,topTempC:isFinite(M.top_temp_c)?M.top_temp_c??null:null,bottomTempC:isFinite(M.bottom_temp_c)?M.bottom_temp_c??null:null,powerKw:isFinite(M.power_kw)?M.power_kw??null:null,sourceKey:Jn(M.source_key),activityState:Ps(M.activity_state)})),C=e.sparkline??null,D=C!=null?{temperature:Array.isArray(C.temperature)?C.temperature:[],power:Array.isArray(C.power)?C.power:[]}:null,T=e.demand_map??null,I=T!=null?{slotDurationMin:T.slot_duration_min,slotsP50:Array.isArray(T.slots_p50)?T.slots_p50:[],slotsP80:Array.isArray(T.slots_p80)?T.slots_p80:[],windows:Array.isArray(T.windows)?T.windows.map(M=>({slotIndex:M.slot_index,startMinute:M.start_minute,p80Kwh:M.p80_kwh,liters:M.liters,label:M.label})):[],profile:{category:T.profile.category,level:T.profile.level,daysUsed:T.profile.days_used,label:T.profile.label,fallbackUsed:T.profile.fallback_used},confidence:T.confidence,minConfidence:typeof T.min_confidence=="number"?T.min_confidence:.3,drivesPlan:T.drives_plan??(T.confidence>=.3&&T.profile.level!=="bootstrap")}:null,k=e.draw_map??null,P=k!=null?{slotDurationMin:k.slot_duration_min,weekly:Array.isArray(k.weekly)?k.weekly.map(M=>({date:M.date,category:M.category,dayType:M.day_type,slotsLiters:Array.isArray(M.slots_liters)?M.slots_liters:[],totalLiters:M.total_liters})):[],profiles:Object.fromEntries(Object.entries(k.profiles??{}).map(([M,H])=>[M,{slotsLitersP90:Array.isArray(H.slots_liters_p90)?H.slots_liters_p90:[],days:H.days}]))}:null,V=e.circulation_runs??[],Y=Array.isArray(V)?V.map(M=>({start:M.start,end:M.end,label:M.label||""})):[],U=e.legionella??null,Z=U!=null?{enabled:U.enabled===!0,daysSinceLast:typeof U.days_since_last=="number"?U.days_since_last:null,intervalDays:typeof U.interval_days=="number"?U.interval_days:null,scheduledStart:U.scheduled_start??null}:null,Q=e.plan_summary??null,Se=Q!=null?{estimatedCostCzk:typeof Q.estimated_cost_czk=="number"?Q.estimated_cost_czk:null,costIfAllGrid:typeof Q.cost_if_all_grid=="number"?Q.cost_if_all_grid:null,costIfAllAlt:typeof Q.cost_if_all_alt=="number"?Q.cost_if_all_alt:null,deadlineTime:Q.deadline_time||"18:00"}:null,re=e.energy_today??null,q=re!=null?{totalKwh:typeof re.total_kwh=="number"?re.total_kwh:0,fveKwh:typeof re.fve_kwh=="number"?re.fve_kwh:0,gridKwh:typeof re.grid_kwh=="number"?re.grid_kwh:0,altKwh:typeof re.alt_kwh=="number"?re.alt_kwh:0,batteryKwh:typeof re.battery_kwh=="number"?re.battery_kwh:0,unattributedKwh:typeof re.unattributed_kwh=="number"?re.unattributed_kwh:0,sourceInvalid:re.source_invalid===!0,costCzk:typeof re.cost_czk=="number"?re.cost_czk:null,gridCostCzk:typeof re.grid_cost_czk=="number"?re.grid_cost_czk:null,altCostCzk:typeof re.alt_cost_czk=="number"?re.alt_cost_czk:null,savingsVsAltCzk:typeof re.savings_vs_alt_czk=="number"?re.savings_vs_alt_czk:null}:null;return{status:l,planSlots:c,explanation:g,manualOverride:v,identity:f,activity:$,sourceSegments:_,timeline:w,sparkline:D,demandMap:I,drawMap:P,circulationRuns:Y,legionella:Z,planSummary:Se,energyToday:q,loading:!1,loadError:null,altSourceType:typeof e.alt_source_type=="string"?e.alt_source_type:null}}async function f1(e){const{profileData:t,planData:i,canonical:r,configProfileUnavailable:a,boilerProfileConfig:n}=await Xp();let o=null;try{const u=await J.loadBatteryTimeline(So,"active");o=(u==null?void 0:u.active)||u||null,Array.isArray(o)&&o.length===0&&(o=null)}catch{}const l=(t==null?void 0:t.current_category)||Object.keys((t==null?void 0:t.profiles)||{})[0]||"workday_summer",c=Object.keys((t==null?void 0:t.profiles)||{}),p=a1(n);return{state:Jp(i,t,p),plan:t1(i),energyBreakdown:i1(i),predictedUsage:r1(t,i,l),config:p,profiles:n1(t||i),heatmap:o1(i||t),heatmap7x24:s1(t,l),profiling:l1(t,l),currentCategory:l,availableCategories:c,forecastWindows:d1(i,o),v2Data:b1(r,a)}}function Ln(e){var i;const t=((i=e==null?void 0:e.locale)==null?void 0:i.language)??(e==null?void 0:e.language)??"cs";return/^en/i.test(t)?"en":"cs"}const ot={cs:{"boiler.status.heading":"Stav bojleru","boiler.status.heating":"Ohřev","boiler.status.idle":"Nečinný","boiler.status.unknown":"Neznámý","boiler.status.selected_source":"Vybraný zdroj","boiler.status.actuated_source":"Aktivní zdroj","boiler.status.temp_top":"Teplota nahoře","boiler.status.temp_bottom":"Teplota dole","boiler.status.energy_needed":"Zbývající energie","boiler.status.last_update":"Poslední aktualizace","boiler.status.degraded":"Degradováno","boiler.status.comfort_satisfied":"Komfort splněn","boiler.status.comfort_unsatisfied":"Komfort nesplněn","boiler.status.comfort_unknown":"Komfort neznámý","boiler.timeline.heading":"Plán nabíjení (15 min sloty)","boiler.timeline.empty":"Plán bojleru zatím není k dispozici.","boiler.timeline.col_time":"Čas","boiler.timeline.col_source":"Zdroj","boiler.timeline.col_temp":"Teplota","boiler.timeline.col_kwh":"Energie","boiler.timeline.col_cost":"Cena","boiler.timeline.col_pv":"FVE podíl","boiler.timeline.comfort_ok":"Komfort OK","boiler.timeline.comfort_gap":"Komfort nesplněn","boiler.explanation.heading":"Vysvětlení","boiler.explanation.empty":"Žádné vysvětlení od plánovače.","boiler.explanation.plan_created":"Plán vytvořen","boiler.explanation.plan_valid_until":"Plán platí do","boiler.explanation.data_age":"Stáří dat","boiler.explanation.freshness_heading":"Čerstvost vstupů","boiler.explanation.freshness_fresh":"vstupy aktuální","boiler.explanation.degraded_heading":"Degradované stavy","boiler.explanation.unsatisfied_gap":"Komfortní mezera","boiler.explanation.temp_at_deadline":"Předpokládaná teplota na deadline","boiler.override.heading":"Ruční přepis (sekundární)","boiler.override.subtitle":"Automatický plán je primární — přepis použijte jen výjimečně.","boiler.override.ttl_label":"Délka přepisu (minuty)","boiler.override.reason_label":"Důvod přepisu","boiler.override.submit":"Aktivovat přepis","boiler.override.identity_unavailable":"Nedostupné – identita bojleru není rozpoznána.","boiler.override.capability_unavailable":"Aktuátor neumožňuje ruční přepis.","boiler.override.active":"Přepis aktivní","boiler.override.ttl_remaining_min":"Zbývá","boiler.unavailable.loading":"Načítání dat bojleru…","boiler.unavailable.error":"Chyba při načítání bojleru","boiler.unavailable.degraded":"Bojler v degradovaném režimu","boiler.unavailable.unavailable":"Data bojleru nejsou k dispozici","boiler.source.fve":"FVE","boiler.source.grid":"Síť","boiler.source.alternative":"Alternativa","boiler.source.overflow":"Přetoky","boiler.source.discharge":"Vybíjení","boiler.source.none":"—","boiler.reason.comfort_satisfied":"Komfort splněn","boiler.reason.comfort_unsatisfied":"Komfort nelze splnit","boiler.reason.no_feasible_plan":"Žádný proveditelný plán","boiler.reason.bootstrap_profile":"Učící režim profilu (málo dat)","boiler.reason.history_profile_low_confidence":"Profil s nízkou důvěrou","boiler.reason.input_stale_price":"Ceny nejsou aktuální","boiler.reason.input_stale_pv":"FVE predikce není aktuální","boiler.reason.input_missing_recorder":"Chybí historie z recorderu","boiler.reason.input_adapter_error":"Chyba vstupního adapteru","boiler.reason.input_stale_temperature":"Teplota není aktuální","boiler.reason.top_sensor_unavailable":"Horní teploměr není dostupný","boiler.reason.bottom_sensor_unavailable_top_only_degraded":"Dolní teploměr není dostupný (top-only režim)","boiler.reason.primary_actuator_unavailable":"Hlavní topný aktuátor není dostupný","boiler.reason.alternative_actuator_unavailable_benchmark_only":"Alternativní zdroj jen jako benchmark","boiler.reason.circulation_pump_unavailable":"Cirkulační čerpadlo není dostupné","boiler.reason.actuator_rate_limited":"Aktuátor omezen rychlostním limitem","boiler.reason.actuator_serializer_error":"Chyba serializéru aktuátoru","boiler.reason.override_active":"Ruční přepis aktivní","boiler.reason.override_expired":"Ruční přepis vypršel","boiler.reason.planner_timeout":"Plánovač překročil časový limit","boiler.reason.replan_coalesced":"Přeplánování sloučeno","boiler.reason.source_selected_grid":"Vybrán zdroj: síť","boiler.reason.source_selected_pv":"Vybrán zdroj: FVE","boiler.reason.source_selected_alternative":"Vybrán zdroj: alternativa","boiler.reason.source_benchmark_only":"Alternativa pouze jako srovnání","boiler.reason.setup_incomplete":"Konfigurace bojleru není dokončena","boiler.reason.migration_required":"Vyžaduje se migrace bojleru","boiler.reason.api_repair_required":"Vyžaduje se oprava API","boiler.reason.storage_write_failed":"Selhalo uložení stavu bojleru","boiler.activity.state.charging_fve":"Nabíjení z FVE","boiler.activity.state.charging_overflow":"Nabíjení z přetoků","boiler.activity.state.charging_grid":"Nabíjení ze sítě","boiler.activity.state.charging_alt":"🔥 Ohřev plynem","boiler.activity.state.discharging":"Vybíjení","boiler.activity.state.standby":"Pohotovost","boiler.activity.state.unknown":"Neznámý stav","boiler.activity.fill_level":"Úroveň naplnění","boiler.activity.temp_trend":"Trend teploty","boiler.activity.aura_max_temp":"Max. teplota AURA","boiler.activity.stale_warning":"Zastaralá data","boiler.eta.label":"Odhadovaný čas do cíle","boiler.eta.already_reached":"Cíl dosažen","boiler.eta.unavailable":"Nelze odhadnout","boiler.config.heater_power_kw":"Výkon topení (kW)","boiler.config.deadline":"Deadline","boiler.config.goal_temp":"Cílová teplota","boiler.aria.status_panel":"Panel stavu bojleru","boiler.aria.plan_timeline":"Časová osa plánu bojleru","boiler.aria.source_explanation":"Vysvětlení zdroje","boiler.aria.override_panel":"Panel ručního přepisu","boiler.aria.svg_summary":"Vizualizace bojleru","boiler.aria.stale":"Data mohou být zastaralá","boiler.aria.source_unknown":"Neznámý zdroj","boiler.demand_map.heading":"Mapa odběrů","boiler.demand_map.empty":"Sbírám data o odběrech — mapa se objeví po pár dnech","boiler.demand_map.confidence":"Spolehlivost","boiler.demand_map.fallback_notice":"Přibližný profil (málo dat)","boiler.demand_map.meta":"Profil z historie ({n} dní, {cat})","boiler.demand_map.window.morning":"Ráno","boiler.demand_map.window.afternoon":"Odpoledne","boiler.demand_map.window.evening":"Večer","boiler.demand_map.window.night":"Noc","boiler.demand_map.drives_plan":"řídí plán","boiler.demand_map.learning":"učí se — mimo plán","boiler.draw_map.heading":"Mapa odběrů vody (L ≥ 40 °C)","boiler.draw_map.empty":"Sbírám data o odběrech — mapa se objeví po pár dnech","boiler.draw_map.heatmap_cap":"Řádek = den, sloupec = 15 min, barva = objem. Vpravo denní součet.","boiler.draw_map.scale_low":"málo","boiler.draw_map.scale_high":"hodně","boiler.draw_map.profile_heading":"Typický den (P90)","boiler.draw_map.profile_cap":"Špičky popsané součtem za celý odběr.","boiler.draw_map.workday":"Pracovní den","boiler.draw_map.weekend":"Víkend","boiler.draw_map.no_profile":"Pro tuto kategorii zatím není dost dat","boiler.draw_map.biggest":"Největší odběry:","boiler.plan.heading":"Plán ohřevu","boiler.plan.status_heating":"Topí se","boiler.plan.status_waiting":"Čeká na ohřev","boiler.plan.status_satisfied":"Komfort splněn","boiler.plan.deadline":"Komfort do","boiler.plan.next_action":"Příští ohřev","boiler.plan.cost_today":"Odhad ceny","boiler.plan.vs_grid":"vs síť","boiler.plan.overflow":"Přetok","boiler.plan.overflow_yes":"využije se","boiler.plan.overflow_no":"nečeká se","boiler.plan.legionella":"Legionella","boiler.plan.circulation":"Cirkulace","boiler.plan.on":"zapnuto","boiler.plan.off":"vypnuto","boiler.plan.why_idle":"Komfort je splněný, ohřev se zatím neplánuje. Pojistka hlídá případný dotop.","boiler.plan.why_next":"Příští ohřev:","boiler.plan.why_generic":"Plán optimalizuje ohřev podle ceny a odběrů.","boiler.plan.upcoming":"Nadcházející akce","boiler.plan.nothing":"Žádný ohřev neplánován — komfort je splněný.","boiler.plan.safety":"Pojistka","boiler.plan.src_fve":"Přetok / FVE","boiler.plan.src_grid":"Síť (ELE)","boiler.plan.src_battery":"Baterie","boiler.soc.heading":"Připravená voda, nabíjení & odběry — 24 h","boiler.soc.empty":"Plán zatím není k dispozici","boiler.soc.charging":"nabíjení","boiler.soc.draw":"odběr","boiler.soc.now":"TEĎ","boiler.soc.legend_soc":"SoC: voda ≥40 °C (L)","boiler.soc.legend_draw":"Odběr","boiler.soc.legend_overflow":"Přetok (forecast)","boiler.soc.legend_temp":"Teplota °C","boiler.model.top":"nahoře","boiler.model.bottom":"dole","boiler.model.element":"patrona","boiler.model.today":"dnes","boiler.model.trend":"Trend","boiler.model.ready_line":"hranice ≥ 40 °C","boiler.model.usable":"L vlažné (≈38 °C)","boiler.plan_strip.heading":"Plán ohřevu 24 h","boiler.plan_strip.meta":"zdroje + odběry + teplota + cirkulace","boiler.plan_strip.empty":"Plán ohřevu zatím není k dispozici.","boiler.plan_strip.now_label":"TEĎ","boiler.plan_strip.deadline_label":"pojistka","boiler.plan_strip.temp_zone_label":"°C horní zóna","boiler.plan_strip.legend_overflow":"☀️ Přetoky FVE","boiler.plan_strip.legend_grid":"🔌 Levné okno (síť)","boiler.plan_strip.legend_battery":"🔋→🔥 Ohřev z baterie","boiler.plan_strip.legend_alt":"🔥 Alternativní zdroj","boiler.plan_strip.legend_demands":"odběry (dolů)","boiler.plan_strip.legend_circ":"💧 cirkulace","boiler.plan_strip.source_overflow":"☀️ Přetoky FVE","boiler.plan_strip.source_grid":"🔌 Levné okno","boiler.plan_strip.source_battery":"🔋→🔥 Ohřev z baterie","boiler.plan_strip.source_alt":"🔥 Alternativní zdroj","boiler.plan_strip.source_legionella_prefix":"🦠","boiler.plan_strip.source_legionella":"🦠 Ochrana proti legionelle","boiler.plan_strip.circ_tooltip":"cirkulace","boiler.tank.ready_caption":"≥ 40 °C připraveno","boiler.tank.source_fve":"☀️ Nabíjí z přetoků FVE","boiler.tank.source_grid":"🔌 Nabíjí ze sítě","boiler.tank.source_battery":"🔋→🔥 Ohřev z baterie","boiler.tank.source_alt":"🔥 Ohřev plynem","boiler.tank.source_idle":"Neohřívá","boiler.tank.source_estimated_suffix":"(odhad)","boiler.energy_today.heading":"⚡ Z čeho se bojler nabil — dnes","boiler.energy_today.meta":"skutečné zdroje k dnešnímu datu","boiler.energy_today.empty":"Dnes zatím žádný ohřev","boiler.energy_today.source_fve":"☀️ FVE přetoky","boiler.energy_today.source_grid":"🔌 Síť","boiler.energy_today.source_alt":"🔥 Alternativní zdroj","boiler.energy_today.source_battery":"🔋→🔥 Baterie","boiler.energy_today.benchmark_prefix":"Kdyby vše ze sítě ≈","boiler.energy_today.benchmark_savings":"→ plán šetří","boiler.panel.source_title":"Zdroj & náklady","boiler.panel.comfort_title":"Komfort","boiler.panel.cost_today":"Cena dnes","boiler.panel.energy_today":"Energie dnes","boiler.panel.fve_label":"☀️ z FVE","boiler.panel.grid_label":"🔌 ze sítě","boiler.panel.unattributed_label":"⚡ el. (nerozlišený zdroj)","boiler.panel.alt_label":"🔥 z plynu","boiler.panel.battery_label":"🔋→🔥 z baterie","boiler.panel.savings_label":"Ušetřeno vs. plyn","boiler.panel.current_source":"Aktuální zdroj","boiler.panel.next_action":"Další akce","boiler.panel.tomorrow":"zítra","boiler.panel.source_overflow":"☀️ přetoky","boiler.panel.source_grid":"🔌 levné okno","boiler.panel.source_grid_short":"🔌 síť","boiler.panel.source_battery":"🔋→🔥 Ohřev z baterie","boiler.panel.source_battery_short":"🔋→🔥","boiler.panel.source_alt":"🔥 plyn","boiler.panel.deadline_label":"Pojistka (deadline)","boiler.panel.legionella_label":"Anti-legionella","boiler.panel.legionella_off":"vypnuto","boiler.panel.legionella_plan":"plán","boiler.panel.legionella_in":"za","boiler.panel.legionella_days":"dní","boiler.panel.legionella_overdue":"přesčas","boiler.panel.legionella_scheduled":"naplánováno","boiler.panel.trend_label":"Trend","boiler.panel.circ_label":"Cirkulace","boiler.panel.circ_before_peak":"před špičkou","boiler.panel.circ_off":"vypnuta"},en:{"boiler.status.heading":"Boiler status","boiler.status.heating":"Heating","boiler.status.idle":"Idle","boiler.status.unknown":"Unknown","boiler.status.selected_source":"Selected source","boiler.status.actuated_source":"Actuated source","boiler.status.temp_top":"Top temperature","boiler.status.temp_bottom":"Bottom temperature","boiler.status.energy_needed":"Energy needed","boiler.status.last_update":"Last update","boiler.status.degraded":"Degraded","boiler.status.comfort_satisfied":"Comfort satisfied","boiler.status.comfort_unsatisfied":"Comfort not satisfied","boiler.status.comfort_unknown":"Comfort unknown","boiler.timeline.heading":"Heating plan (15 min slots)","boiler.timeline.empty":"No boiler plan available yet.","boiler.timeline.col_time":"Time","boiler.timeline.col_source":"Source","boiler.timeline.col_temp":"Temp","boiler.timeline.col_kwh":"Energy","boiler.timeline.col_cost":"Cost","boiler.timeline.col_pv":"PV share","boiler.timeline.comfort_ok":"Comfort OK","boiler.timeline.comfort_gap":"Comfort gap","boiler.explanation.heading":"Explanation","boiler.explanation.empty":"No planner explanation yet.","boiler.explanation.plan_created":"Plan created","boiler.explanation.plan_valid_until":"Plan valid until","boiler.explanation.data_age":"Data age","boiler.explanation.freshness_heading":"Input freshness","boiler.explanation.freshness_fresh":"inputs fresh","boiler.explanation.degraded_heading":"Degraded state","boiler.explanation.unsatisfied_gap":"Comfort gap","boiler.explanation.temp_at_deadline":"Predicted deadline temperature","boiler.override.heading":"Manual override (secondary)","boiler.override.subtitle":"Automatic plan is primary — use override only when necessary.","boiler.override.ttl_label":"Override duration (minutes)","boiler.override.reason_label":"Override reason","boiler.override.submit":"Activate override","boiler.override.identity_unavailable":"Unavailable – boiler identity is not resolved.","boiler.override.capability_unavailable":"Actuator does not support manual override.","boiler.override.active":"Override active","boiler.override.ttl_remaining_min":"remaining","boiler.unavailable.loading":"Loading boiler data…","boiler.unavailable.error":"Failed to load boiler data","boiler.unavailable.degraded":"Boiler in degraded mode","boiler.unavailable.unavailable":"Boiler data unavailable","boiler.source.fve":"PV","boiler.source.grid":"Grid","boiler.source.alternative":"Alternative","boiler.source.overflow":"Overflow","boiler.source.discharge":"Discharge","boiler.source.none":"—","boiler.reason.comfort_satisfied":"Comfort satisfied","boiler.reason.comfort_unsatisfied":"Comfort cannot be met","boiler.reason.no_feasible_plan":"No feasible plan","boiler.reason.bootstrap_profile":"Bootstrap profile (low data)","boiler.reason.history_profile_low_confidence":"Low-confidence profile","boiler.reason.input_stale_price":"Spot prices are stale","boiler.reason.input_stale_pv":"PV forecast is stale","boiler.reason.input_missing_recorder":"Recorder history missing","boiler.reason.input_adapter_error":"Input adapter error","boiler.reason.input_stale_temperature":"Temperature reading stale","boiler.reason.top_sensor_unavailable":"Top sensor unavailable","boiler.reason.bottom_sensor_unavailable_top_only_degraded":"Bottom sensor unavailable (top-only mode)","boiler.reason.primary_actuator_unavailable":"Primary heating actuator unavailable","boiler.reason.alternative_actuator_unavailable_benchmark_only":"Alternative source benchmark only","boiler.reason.circulation_pump_unavailable":"Circulation pump unavailable","boiler.reason.actuator_rate_limited":"Actuator rate limited","boiler.reason.actuator_serializer_error":"Actuator serializer error","boiler.reason.override_active":"Manual override active","boiler.reason.override_expired":"Manual override expired","boiler.reason.planner_timeout":"Planner timeout","boiler.reason.replan_coalesced":"Replan coalesced","boiler.reason.source_selected_grid":"Source selected: grid","boiler.reason.source_selected_pv":"Source selected: PV","boiler.reason.source_selected_alternative":"Source selected: alternative","boiler.reason.source_benchmark_only":"Alternative is benchmark only","boiler.reason.setup_incomplete":"Boiler setup incomplete","boiler.reason.migration_required":"Boiler migration required","boiler.reason.api_repair_required":"API repair required","boiler.reason.storage_write_failed":"Failed to persist boiler state","boiler.activity.state.charging_fve":"Charging from PV","boiler.activity.state.charging_overflow":"Charging from overflow","boiler.activity.state.charging_grid":"Charging from grid","boiler.activity.state.charging_alt":"🔥 Gas heating","boiler.activity.state.discharging":"Discharging","boiler.activity.state.standby":"Standby","boiler.activity.state.unknown":"Unknown state","boiler.activity.fill_level":"Fill level","boiler.activity.temp_trend":"Temperature trend","boiler.activity.aura_max_temp":"AURA max temperature","boiler.activity.stale_warning":"Stale data","boiler.eta.label":"Estimated time to target","boiler.eta.already_reached":"Target reached","boiler.eta.unavailable":"Cannot estimate","boiler.config.heater_power_kw":"Heater power (kW)","boiler.config.deadline":"Deadline","boiler.config.goal_temp":"Target temperature","boiler.aria.status_panel":"Boiler status panel","boiler.aria.plan_timeline":"Boiler plan timeline","boiler.aria.source_explanation":"Source explanation","boiler.aria.override_panel":"Manual override panel","boiler.aria.svg_summary":"Boiler visualization","boiler.aria.stale":"Data may be stale","boiler.aria.source_unknown":"Unknown source","boiler.demand_map.heading":"Demand Map","boiler.demand_map.empty":"Collecting usage data — map will appear in a few days","boiler.demand_map.confidence":"Confidence","boiler.demand_map.fallback_notice":"Approximate profile (low data)","boiler.demand_map.meta":"Profile from history ({n} days, {cat})","boiler.demand_map.window.morning":"Morning","boiler.demand_map.window.afternoon":"Afternoon","boiler.demand_map.window.evening":"Evening","boiler.demand_map.window.night":"Night","boiler.demand_map.drives_plan":"drives plan","boiler.demand_map.learning":"learning — not driving plan","boiler.draw_map.heading":"Water draw map (L ≥ 40 °C)","boiler.draw_map.empty":"Collecting draw data — map appears in a few days","boiler.draw_map.heatmap_cap":"Row = day, column = 15 min, colour = volume. Daily total on the right.","boiler.draw_map.scale_low":"low","boiler.draw_map.scale_high":"high","boiler.draw_map.profile_heading":"Typical day (P90)","boiler.draw_map.profile_cap":"Peaks labelled with the whole-draw total.","boiler.draw_map.workday":"Workday","boiler.draw_map.weekend":"Weekend","boiler.draw_map.no_profile":"Not enough data for this category yet","boiler.draw_map.biggest":"Biggest draws:","boiler.plan.heading":"Heating plan","boiler.plan.status_heating":"Heating","boiler.plan.status_waiting":"Waiting to heat","boiler.plan.status_satisfied":"Comfort met","boiler.plan.deadline":"Comfort by","boiler.plan.next_action":"Next heating","boiler.plan.cost_today":"Cost estimate","boiler.plan.vs_grid":"vs grid","boiler.plan.overflow":"Overflow","boiler.plan.overflow_yes":"will be used","boiler.plan.overflow_no":"none expected","boiler.plan.legionella":"Legionella","boiler.plan.circulation":"Circulation","boiler.plan.on":"on","boiler.plan.off":"off","boiler.plan.why_idle":"Comfort is met, no heating planned. The deadline safety-net guards any top-up.","boiler.plan.why_next":"Next heating:","boiler.plan.why_generic":"The plan optimises heating by price and draws.","boiler.plan.upcoming":"Upcoming actions","boiler.plan.nothing":"No heating planned — comfort is met.","boiler.plan.safety":"Safety-net","boiler.plan.src_fve":"Overflow / PV","boiler.plan.src_grid":"Grid (ELE)","boiler.plan.src_battery":"Battery","boiler.soc.heading":"Ready water, charging & draws — 24 h","boiler.soc.empty":"No plan available yet","boiler.soc.charging":"charging","boiler.soc.draw":"draw","boiler.soc.now":"NOW","boiler.soc.legend_soc":"SoC: water ≥40 °C (L)","boiler.soc.legend_draw":"Draw","boiler.soc.legend_overflow":"Overflow (forecast)","boiler.soc.legend_temp":"Temperature °C","boiler.model.top":"top","boiler.model.bottom":"bottom","boiler.model.element":"element","boiler.model.today":"today","boiler.model.trend":"Trend","boiler.model.ready_line":"≥ 40 °C line","boiler.model.usable":"L usable (≈38 °C)","boiler.plan_strip.heading":"Heating plan 24 h","boiler.plan_strip.meta":"sources + demands + temperature + circulation","boiler.plan_strip.empty":"Heating plan not available yet.","boiler.plan_strip.now_label":"NOW","boiler.plan_strip.deadline_label":"deadline","boiler.plan_strip.temp_zone_label":"°C top zone","boiler.plan_strip.legend_overflow":"☀️ PV overflow","boiler.plan_strip.legend_grid":"🔌 Cheap window (grid)","boiler.plan_strip.legend_battery":"🔋→🔥 Battery heating","boiler.plan_strip.legend_alt":"🔥 Alternative source","boiler.plan_strip.legend_demands":"demands (down)","boiler.plan_strip.legend_circ":"💧 circulation","boiler.plan_strip.source_overflow":"☀️ PV overflow","boiler.plan_strip.source_grid":"🔌 Cheap window","boiler.plan_strip.source_battery":"🔋→🔥 Battery heating","boiler.plan_strip.source_alt":"🔥 Alternative source","boiler.plan_strip.source_legionella_prefix":"🦠","boiler.plan_strip.source_legionella":"🦠 Legionella protection","boiler.plan_strip.circ_tooltip":"circulation","boiler.tank.ready_caption":"≥ 40 °C ready","boiler.tank.source_fve":"☀️ Charging from PV overflow","boiler.tank.source_grid":"🔌 Charging from grid","boiler.tank.source_battery":"🔋→🔥 Battery heating","boiler.tank.source_alt":"🔥 Gas heating","boiler.tank.source_idle":"Not heating","boiler.tank.source_estimated_suffix":"(estimated)","boiler.energy_today.heading":"⚡ What powered the boiler today","boiler.energy_today.meta":"actual sources to date","boiler.energy_today.empty":"No heating today yet","boiler.energy_today.source_fve":"☀️ PV overflow","boiler.energy_today.source_grid":"🔌 Grid","boiler.energy_today.source_alt":"🔥 Alternative source","boiler.energy_today.source_battery":"🔋→🔥 Battery","boiler.energy_today.benchmark_prefix":"If all from grid ≈","boiler.energy_today.benchmark_savings":"→ plan saves","boiler.panel.source_title":"Source & costs","boiler.panel.comfort_title":"Comfort","boiler.panel.cost_today":"Cost today","boiler.panel.energy_today":"Energy today","boiler.panel.fve_label":"☀️ from PV","boiler.panel.grid_label":"🔌 from grid","boiler.panel.unattributed_label":"⚡ electric (unattributed)","boiler.panel.alt_label":"🔥 from gas","boiler.panel.battery_label":"🔋→🔥 from battery","boiler.panel.savings_label":"Saved vs. gas","boiler.panel.current_source":"Current source","boiler.panel.next_action":"Next action","boiler.panel.tomorrow":"tomorrow","boiler.panel.source_overflow":"☀️ overflow","boiler.panel.source_grid":"🔌 cheap window","boiler.panel.source_grid_short":"🔌 grid","boiler.panel.source_battery":"🔋→🔥 Battery heat","boiler.panel.source_battery_short":"🔋→🔥","boiler.panel.source_alt":"🔥 gas","boiler.panel.deadline_label":"Deadline (guard)","boiler.panel.legionella_label":"Anti-legionella","boiler.panel.legionella_off":"disabled","boiler.panel.legionella_plan":"scheduled","boiler.panel.legionella_in":"in","boiler.panel.legionella_days":"days","boiler.panel.legionella_overdue":"overdue","boiler.panel.legionella_scheduled":"scheduled","boiler.panel.trend_label":"Trend","boiler.panel.circ_label":"Circulation","boiler.panel.circ_before_peak":"before peak","boiler.panel.circ_off":"off"}};function y(e,t){const i=ot[t]??ot.cs;return e in i?i[e]:e in ot.cs?ot.cs[e]:e}function Ua(e,t){const i=`boiler.reason.${e}`;return ot[t][i]?ot[t][i]:ot.cs[i]?ot.cs[i]:e}function Ui(e,t){if(!e)return y("boiler.source.none",t);const i=`boiler.source.${e}`;return ot[t][i]?ot[t][i]:ot.cs[i]?ot.cs[i]:e}const Hs=new URLSearchParams(window.location.search),Bo=Hs.get("sn")||Hs.get("inverter_sn")||"";async function Ao(e){const t=await J.fetchOIGAPI(`/${Bo}/module_config`,{signal:e});return!t||t.error?(L.warn("[Settings] module_config load failed",t),null):t}async function md(e,t,i=[2e3,4e3,8e3,15e3,3e4]){for(const r of i){await new Promise(n=>setTimeout(n,r));let a;try{a=await J.fetchOIGAPI(`/${Bo}/module_config`)}catch{t();return}if(a&&!a.error){e(a);return}}t()}async function vd(e,t){const i=await J.fetchOIGAPI(`/${Bo}/module_config`,{method:"POST",body:JSON.stringify({section:e,values:t})});return i&&(i.updated===!0||i.updated===!1)?{ok:!0}:{ok:!1,fields:i==null?void 0:i.fields}}const Vs={efficiency:null,health:null,balancing:null,costComparison:null};function yd(e){const t=It();if(!t)return null;const i=t.findSensorId("battery_efficiency"),r=t.get(i);if(!r)return L.debug("Battery efficiency sensor not found"),null;const a=r.attributes||{},n=a.efficiency_last_month_pct!=null?{efficiency:Number(a.efficiency_last_month_pct??0),charged:Number(a.last_month_charge_kwh??0),discharged:Number(a.last_month_discharge_kwh??0),losses:Number(a.losses_last_month_kwh??0)}:null,o=a.efficiency_current_month_pct!=null?{efficiency:Number(a.efficiency_current_month_pct??0),charged:Number(a.current_month_charge_kwh??0),discharged:Number(a.current_month_discharge_kwh??0),losses:Number(a.losses_current_month_kwh??0)}:null,l=n??o;if(!l)return null;const c=n?"last_month":"current_month",p=n&&o?o.efficiency-n.efficiency:0;return{efficiency:l.efficiency,charged:l.charged,discharged:l.discharged,losses:l.losses,lossesPct:a[c==="last_month"?"losses_last_month_pct":"losses_current_month_pct"]??0,trend:p,period:c,currentMonthDays:a.current_month_days??0,lastMonth:n,currentMonth:o}}function xd(e){const t=It();if(!t)return null;const i=t.findSensorId("battery_health"),r=t.get(i);if(!r)return L.debug("Battery health sensor not found"),null;const a=parseFloat(r.state)||0,n=r.attributes||{};let o,l;return a>=95?(o="excellent",l="Vynikající"):a>=90?(o="good",l="Dobrý"):a>=80?(o="fair",l="Uspokojivý"):(o="poor",l="Špatný"),{soh:a,capacity:n.capacity_p80_last_20??n.current_capacity_kwh??0,nominalCapacity:n.current_capacity_kwh??0,minCapacity:n.capacity_p20_last_20??0,measurementCount:n.measurement_count??0,lastAnalysis:n.last_analysis??"",qualityScore:n.quality_score??null,sohMethod:n.soh_selection_method??null,sohMethodDescription:n.soh_method_description??null,measurementHistory:Array.isArray(n.measurement_history)?n.measurement_history:[],degradation3m:n.degradation_3_months_percent??null,degradation6m:n.degradation_6_months_percent??null,degradation12m:n.degradation_12_months_percent??null,degradationPerYear:n.degradation_per_year_percent??null,estimatedEolDate:n.estimated_eol_date??null,yearsTo80Pct:n.years_to_80pct??null,trendConfidence:n.trend_confidence??null,status:o,statusLabel:l}}function zs(e,t,i){if(!e||!t)return{daysRemaining:null,progressPercent:null,intervalDays:i||null};try{const r=new Date(e),a=new Date(t),n=new Date;if(isNaN(r.getTime())||isNaN(a.getTime()))return{daysRemaining:null,progressPercent:null,intervalDays:i||null};const o=a.getTime()-r.getTime(),l=n.getTime()-r.getTime(),c=Math.max(0,Math.round((a.getTime()-n.getTime())/(1e3*60*60*24))),p=o>0?Math.min(100,Math.max(0,Math.round(l/o*100))):null,u=i||Math.round(o/(1e3*60*60*24));return{daysRemaining:c,progressPercent:p,intervalDays:u||null}}catch{return{daysRemaining:null,progressPercent:null,intervalDays:i||null}}}function wd(e){const t=It();if(!t)return null;const i=t.findSensorId("battery_balancing"),r=t.get(i);if(!r){const c=t.get(t.findSensorId("battery_health")),p=c==null?void 0:c.attributes;if(p!=null&&p.balancing_status){const u=String(p.last_balancing??""),h=p.next_balancing?String(p.next_balancing):null,g=zs(u,h,Number(p.balancing_interval_days??0));return{status:String(p.balancing_status??"unknown"),lastBalancing:u,cost:Number(p.balancing_cost??0),nextScheduled:h,...g,estimatedNextCost:p.estimated_next_cost!=null?Number(p.estimated_next_cost):null}}return null}const a=r.attributes||{},n=String(a.last_balancing??""),o=a.next_scheduled?String(a.next_scheduled):null,l=zs(n,o,Number(a.interval_days??0));return{status:r.state||"unknown",lastBalancing:n,cost:Number(a.cost??0),nextScheduled:o,...l,estimatedNextCost:a.estimated_next_cost!=null?Number(a.estimated_next_cost):null}}async function m1(e){var t,i,r;try{const a=await J.loadUnifiedCostTile(e);if(!a)return null;const n=a.hybrid??a,o=n.today??{},l=Math.round((o.actual_cost_so_far??o.actual_total_cost??0)*100)/100,c=o.future_plan_cost??0,p=o.blended_total_cost??l+c,u=((t=n.tomorrow)==null?void 0:t.plan_total_cost)??null,h=!!((i=n.tomorrow)!=null&&i.mode_distribution),g=u===0&&!h?null:u;let v=null,f=null,b=null,$=null;try{const _=await J.loadBatteryTimeline(e,"active"),w=(r=_==null?void 0:_.timeline_extended)==null?void 0:r.yesterday;w!=null&&w.summary&&(v=w.summary.planned_total_cost??null,f=w.summary.actual_total_cost??null,b=w.summary.delta_cost??null,$=w.summary.accuracy_pct??null)}catch{L.debug("Yesterday analysis not available")}return{activePlan:"hybrid",actualSpent:l,planTotalCost:p,futurePlanCost:c,tomorrowCost:g,yesterdayPlannedCost:v,yesterdayActualCost:f,yesterdayDelta:b,yesterdayAccuracy:$}}catch(a){return L.error("Failed to fetch cost comparison",a),null}}async function v1(e){const t=yd(),i=xd(),r=wd(),a=await m1(e);return{efficiency:t,health:i,balancing:r,costComparison:a}}function y1(e){return{efficiency:yd(),health:xd(),balancing:wd()}}const an={severity:0,warningsCount:0,eventType:"",description:"",instruction:"",onset:"",expires:"",etaHours:0,allWarnings:[],effectiveSeverity:0},x1={vítr:"mdi:weather-windy",déšť:"mdi:weather-pouring",sníh:"mdi:weather-snowy",bouřky:"mdi:weather-lightning",mráz:"mdi:snowflake",vedro:"mdi:weather-sunny",mlha:"mdi:weather-fog",náledí:"mdi:snowflake",laviny:"mdi:alert-circle"};function w1(e){const t=e.toLowerCase();for(const[i,r]of Object.entries(x1))if(t.includes(i))return r;return"mdi:alert-circle"}const _1={0:"Bez výstrahy",1:"Nízká",2:"Zvýšená",3:"Vysoká",4:"Extrémní"},Ds={0:"#4CAF50",1:"#8BC34A",2:"#FF9800",3:"#f44336",4:"#9C27B0"};function $1(e){const t=It();if(!t)return an;const i=`sensor.oig_${e}_chmu_warning_level`,r=t.get(i);if(!r)return L.debug("ČHMÚ sensor not found",{entityId:i}),an;const a=parseInt(r.state,10)||0,n=r.attributes||{},o=Number(n.warnings_count??0),l=String(n.event_type??""),c=String(n.description??""),p=String(n.instruction??""),u=String(n.onset??""),h=String(n.expires??""),g=Number(n.eta_hours??0),v=n.all_warnings_details??[],f=Array.isArray(v)?v.map(_=>({event_type:_.event_type??_.event??"",severity:_.severity??a,description:_.description??"",instruction:_.instruction??"",onset:_.onset??"",expires:_.expires??"",eta_hours:_.eta_hours??0})):[],b=l.toLowerCase().includes("žádná výstraha");return{severity:a,warningsCount:o,eventType:l,description:c,instruction:p,onset:u,expires:h,etaHours:g,allWarnings:f,effectiveSeverity:o===0||b?0:a}}const nn={available:!1,entityId:null,condition:"",temperature:null,apparentTemperature:null,humidity:null,windSpeed:null,tempUnit:"°C",windUnit:"km/h",hourly:[],daily:[]},k1={"clear-night":"mdi:weather-night",cloudy:"mdi:weather-cloudy",fog:"mdi:weather-fog",hail:"mdi:weather-hail",lightning:"mdi:weather-lightning","lightning-rainy":"mdi:weather-lightning-rainy",partlycloudy:"mdi:weather-partly-cloudy",pouring:"mdi:weather-pouring",rainy:"mdi:weather-rainy",snowy:"mdi:weather-snowy","snowy-rainy":"mdi:weather-snowy-rainy",sunny:"mdi:weather-sunny",windy:"mdi:weather-windy","windy-variant":"mdi:weather-windy-variant",exceptional:"mdi:weather-cloudy"},C1={"clear-night":"Jasná noc",cloudy:"Zataženo",fog:"Mlha",hail:"Krupobití",lightning:"Bouřky","lightning-rainy":"Bouřky s deštěm",partlycloudy:"Polojasno",pouring:"Vydatný déšť",rainy:"Déšť",snowy:"Sněžení","snowy-rainy":"Déšť se sněhem",sunny:"Slunečno",windy:"Větrno","windy-variant":"Větrno",exceptional:"Výjimečné počasí"};function Ya(e){return k1[e]??"mdi:weather-cloudy"}function S1(e){return C1[e]??(e||"Počasí")}function M1(){var r;const e=((r=J.getHassSync())==null?void 0:r.states)??{},t=Object.keys(e).filter(a=>a.startsWith("weather."));return t.find(a=>{var o;const n=(o=e[a])==null?void 0:o.state;return n&&n!=="unavailable"&&n!=="unknown"})??t[0]??null}function Tt(e){const t=typeof e=="number"?e:parseFloat(String(e));return Number.isFinite(t)?t:null}function A1(e){return{datetime:String(e.datetime??""),condition:String(e.condition??""),temperature:Tt(e.temperature),templow:Tt(e.templow),precipitation:Tt(e.precipitation),precipitationProbability:Tt(e.precipitation_probability),windSpeed:Tt(e.wind_speed)}}async function Os(e,t){var i,r;try{const a=await J.callWS({type:"call_service",domain:"weather",service:"get_forecasts",service_data:{type:t},target:{entity_id:e},return_response:!0});return(((r=(i=a==null?void 0:a.response)==null?void 0:i[e])==null?void 0:r.forecast)??[]).map(A1)}catch(a){return L.debug(`weather.get_forecasts(${t}) failed`,{entityId:e,err:String(a)}),[]}}async function L1(){var n,o;const e=M1();if(!e)return nn;const t=(o=(n=J.getHassSync())==null?void 0:n.states)==null?void 0:o[e];if(!t)return{...nn,entityId:e};const i=t.attributes??{},[r,a]=await Promise.all([Os(e,"hourly"),Os(e,"daily")]);return{available:!0,entityId:e,condition:t.state||"",temperature:Tt(i.temperature),apparentTemperature:Tt(i.apparent_temperature),humidity:Tt(i.humidity),windSpeed:Tt(i.wind_speed),tempUnit:String(i.temperature_unit??"°C"),windUnit:String(i.wind_speed_unit??"km/h"),hourly:r,daily:a}}const _d={"HOME I":{icon:"🏠",color:"#4CAF50",label:"HOME I"},"HOME II":{icon:"⚡",color:"#2196F3",label:"HOME II"},"HOME III":{icon:"🔋",color:"#9C27B0",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"#FF9800",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"#FF9800",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"#9E9E9E",label:"DO NOTHING"}},$d={yesterday:"📊 Včera",today:"📆 Dnes",tomorrow:"📅 Zítra",history:"📈 Historie",detail:"💎 Detail"};function Es(e){return{modeHistorical:e.mode_historical??e.mode??"",modePlanned:e.mode_planned??"",modeMatch:e.mode_match??!1,status:e.status??"planned",startTime:e.start_time??"",endTime:e.end_time??"",durationHours:e.duration_hours??0,costHistorical:e.cost_historical??null,costPlanned:e.cost_planned??null,costDelta:e.cost_delta??null,solarKwh:e.solar_total_kwh??0,consumptionKwh:e.consumption_total_kwh??0,gridImportKwh:e.grid_import_total_kwh??0,gridExportKwh:e.grid_export_total_kwh??0,intervalReasons:Array.isArray(e.interval_reasons)?e.interval_reasons:[]}}function Ea(e){return{plan:(e==null?void 0:e.plan)??0,actual:(e==null?void 0:e.actual)??null,hasActual:(e==null?void 0:e.has_actual)??!1,unit:(e==null?void 0:e.unit)??""}}function T1(e){const t=(e==null?void 0:e.metrics)??{};return{overallAdherence:(e==null?void 0:e.overall_adherence)??0,modeSwitches:(e==null?void 0:e.mode_switches)??0,totalCost:(e==null?void 0:e.total_cost)??0,metrics:{cost:Ea(t.cost),solar:Ea(t.solar),consumption:Ea(t.consumption),grid:Ea(t.grid)},completedSummary:e!=null&&e.completed_summary?{count:e.completed_summary.count??0,totalCost:e.completed_summary.total_cost??0,adherencePct:e.completed_summary.adherence_pct??0}:void 0,plannedSummary:e!=null&&e.planned_summary?{count:e.planned_summary.count??0,totalCost:e.planned_summary.total_cost??0}:void 0,progressPct:e==null?void 0:e.progress_pct,actualTotalCost:e==null?void 0:e.actual_total_cost,planTotalCost:e==null?void 0:e.plan_total_cost,vsPlanPct:e==null?void 0:e.vs_plan_pct,backupBaselineCost:e==null?void 0:e.backup_baseline_cost,backupActualCost:e==null?void 0:e.backup_actual_cost,backupSavings:e==null?void 0:e.backup_savings,eodPrediction:e!=null&&e.eod_prediction?{predictedTotal:e.eod_prediction.predicted_total??0,predictedSavings:e.eod_prediction.predicted_savings??0}:void 0}}function P1(e){return e?{date:e.date??"",modeBlocks:Array.isArray(e.mode_blocks)?e.mode_blocks.map(Es):[],summary:T1(e.summary),metadata:e.metadata?{activePlan:e.metadata.active_plan??"hybrid",comparisonPlanAvailable:e.metadata.comparison_plan_available}:void 0,comparison:e.comparison?{plan:e.comparison.plan??"",modeBlocks:Array.isArray(e.comparison.mode_blocks)?e.comparison.mode_blocks.map(Es):[]}:void 0}:null}async function H1(e,t,i="hybrid"){try{const r=await J.loadDetailTabs(e,t,i);if(!r)return null;const a=r[t]??r;return P1(a)}catch(r){return L.error(`Failed to load timeline tab: ${t}`,r),null}}const Lo={tiles_left:[null,null,null,null,null,null],tiles_right:[null,null,null,null,null,null],left_count:4,right_count:4,visible:!0,version:1},To="oig_dashboard_tiles",kd="oig_dashboard_tiles_prev";function V1(e,t){return t==="W"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kW"}:t==="Wh"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kWh"}:t==="W"||t==="Wh"?{value:Math.round(e).toString(),unit:t}:{value:e.toFixed(1),unit:t}}function io(e){if(!e)return!0;const t=e.tiles_left??[],i=e.tiles_right??[];return!t.some(Boolean)&&!i.some(Boolean)}async function z1(){var e;try{const t=await J.callWS({type:"call_service",domain:"oig_cloud",service:"get_dashboard_tiles",service_data:{},return_response:!0}),i=(e=t==null?void 0:t.response)==null?void 0:e.config;if(i&&typeof i=="object"){const r=ro(i);if(!io(r))return L.debug("Loaded tiles config from HA"),r}}catch(t){L.debug("WS tile config load failed, trying localStorage",{error:t.message})}try{const t=localStorage.getItem(To);if(t){const i=ro(JSON.parse(t));if(!io(i))return L.debug("Loaded tiles config from localStorage"),i}}catch{L.debug("localStorage tile config load failed")}try{const t=localStorage.getItem(kd);if(t){const i=ro(JSON.parse(t));if(!io(i))return L.info("Recovered tiles config from previous-version backup"),i}}catch{L.debug("localStorage previous-version tile config recovery failed")}return Lo}async function Is(e){try{const t=localStorage.getItem(To);return localStorage.setItem(kd,t??JSON.stringify(e)),localStorage.setItem(To,JSON.stringify(e)),await J.callService("oig_cloud","save_dashboard_tiles",{config:JSON.stringify(e)}),L.info("Tiles config saved"),!0}catch(t){return L.error("Failed to save tiles config",t),!1}}const D1=[{module:"pricing",markers:["spot_price_","export_price_","current_tariff","eur_czk_exchange_rate","adjusted_spot_electricity_prices","computed_grid_"]},{module:"statistics",markers:["battery_load_median","load_avg_","hourly_"]},{module:"battery_prediction",markers:["battery_efficiency","battery_balancing","adaptive_load_profiles","grid_charging_planned","planner_recommended_mode"]},{module:"boiler",markers:["boiler_","bojler_"],prefixes:["sensor.oig_bojler"]}];function jo(e){return e==="core"||e==="pricing"||e==="boiler"||e==="statistics"||e==="battery_prediction"}function Cd(e){var i;const t=e.toLowerCase();for(const r of D1)if(r.markers.some(a=>t.includes(a))||(i=r.prefixes)!=null&&i.some(a=>t.startsWith(a)))return r.module;return"core"}function Sd(e){return jo(e.module)?e:{...e,module:Cd(e.entity_id)}}function ro(e){const t=i=>{if(!i||typeof i!="object")return null;const r=typeof i.entity_id=="string"?i.entity_id:"",a=i.support_entities&&typeof i.support_entities=="object"?{top_right:typeof i.support_entities.top_right=="string"?i.support_entities.top_right:void 0,bottom_right:typeof i.support_entities.bottom_right=="string"?i.support_entities.bottom_right:void 0}:void 0;return Sd({type:i.type==="button"?"button":"entity",entity_id:r,label:typeof i.label=="string"?i.label:void 0,icon:typeof i.icon=="string"?i.icon:void 0,color:typeof i.color=="string"?i.color:void 0,action:i.action==="toggle"||i.action==="turn_on"||i.action==="turn_off"?i.action:void 0,support_entities:a,module:jo(i.module)?i.module:void 0})};return{tiles_left:Array.isArray(e.tiles_left)?e.tiles_left.slice(0,6).map(t):Lo.tiles_left,tiles_right:Array.isArray(e.tiles_right)?e.tiles_right.slice(0,6).map(t):Lo.tiles_right,left_count:typeof e.left_count=="number"?e.left_count:4,right_count:typeof e.right_count=="number"?e.right_count:4,visible:e.visible!==!1,version:e.version??1}}function ao(e){var l;const t=It();if(!t)return{value:"--",unit:"",isActive:!1,rawValue:0};const i=t.get(e);if(!i||i.state==="unavailable"||i.state==="unknown")return{value:"--",unit:"",isActive:!1,rawValue:0};const r=i.state,a=String(((l=i.attributes)==null?void 0:l.unit_of_measurement)??""),n=parseFloat(r)||0;if(i.entity_id.startsWith("switch.")||i.entity_id.startsWith("binary_sensor."))return{value:r==="on"?"Zapnuto":"Vypnuto",unit:"",isActive:r==="on",rawValue:r==="on"?1:0};const o=V1(n,a);return{value:o.value,unit:o.unit,isActive:n!==0,rawValue:n}}function Tr(e){const t=i=>{var a,n;const r=[];for(const o of i){if(!o)continue;const l=ao(o.entity_id),c={};if((a=o.support_entities)!=null&&a.top_right){const p=ao(o.support_entities.top_right);c.topRight={value:p.value,unit:p.unit}}if((n=o.support_entities)!=null&&n.bottom_right){const p=ao(o.support_entities.bottom_right);c.bottomRight={value:p.value,unit:p.unit}}r.push({config:o,value:l.value,unit:l.unit,isActive:l.isActive,isZero:l.rawValue===0,formattedValue:l.unit?`${l.value} ${l.unit}`:l.value,supportValues:c})}return r};return{left:t(e.tiles_left),right:t(e.tiles_right)}}function O1(e,t={}){switch(jo(e.config.module)?e.config.module:Cd(e.config.entity_id)){case"pricing":return t.enablePricing!==!1;case"boiler":return t.enableBoiler!==!1;case"statistics":return t.enableStatistics!==!1;case"battery_prediction":return t.enablePrediction!==!1;case"core":default:return!0}}function E1(e,t={}){return e.filter(i=>O1(i,t))}async function I1(e,t="toggle"){const i=e.split(".")[0];return J.callService(i,t,{entity_id:e})}function ge(e,t="CZK"){return e==null||Number.isNaN(e)?`-- ${t}`:`${e.toFixed(2)} ${t}`}function Zi(e,t=0){return e==null||Number.isNaN(e)?"-- %":`${e.toFixed(t)} %`}const F1={fridge:"❄️","fridge-outline":"❄️",dishwasher:"🍽️","washing-machine":"🧺","tumble-dryer":"🌪️",stove:"🔥",microwave:"📦","coffee-maker":"☕",kettle:"🫖",toaster:"🍞",lightbulb:"💡","lightbulb-outline":"💡",lamp:"🪔","ceiling-light":"💡","floor-lamp":"🪔","led-strip":"✨","led-strip-variant":"✨","wall-sconce":"💡",chandelier:"💡",thermometer:"🌡️",thermostat:"🌡️",radiator:"♨️","radiator-disabled":"❄️","heat-pump":"♨️","air-conditioner":"❄️",fan:"🌀",hvac:"♨️",fire:"🔥",snowflake:"❄️","lightning-bolt":"⚡",flash:"⚡",battery:"🔋","battery-charging":"🔋","battery-50":"🔋","solar-panel":"☀️","solar-power":"☀️","meter-electric":"⚡","power-plug":"🔌","power-socket":"🔌",car:"🚗","car-electric":"🚘","car-battery":"🔋","ev-station":"🔌","ev-plug-type2":"🔌",garage:"🏠","garage-open":"🏠",door:"🚪","door-open":"🚪",lock:"🔒","lock-open":"🔓","shield-home":"🛡️",cctv:"📹",camera:"📹","motion-sensor":"👁️","alarm-light":"🚨",bell:"🔔","window-closed":"🪟","window-open":"🪟",blinds:"🪟","blinds-open":"🪟",curtains:"🪟","roller-shade":"🪟",television:"📺",speaker:"🔊","speaker-wireless":"🔊",music:"🎵","volume-high":"🔊",cast:"📡",chromecast:"📡","router-wireless":"📡",wifi:"📶","access-point":"📡",lan:"🌐",network:"🌐","home-assistant":"🏠",water:"💧","water-percent":"💧","water-boiler":"♨️","water-pump":"💧",shower:"🚿",toilet:"🚽",faucet:"🚰",pipe:"🔧","weather-sunny":"☀️","weather-cloudy":"☁️","weather-night":"🌙","weather-rainy":"🌧️","weather-snowy":"❄️","weather-windy":"💨",information:"ℹ️","help-circle":"❓","alert-circle":"⚠️","checkbox-marked-circle":"✅","toggle-switch":"🔘",power:"⚡",sync:"🔄"};function B1(e){const t=e.replace(/^mdi:/,"");return F1[t]||"⚙️"}function no(e,t){let i=!1;return(...r)=>{i||(e(...r),i=!0,setTimeout(()=>i=!1,t))}}async function Pr(e,t=3,i=1e3){let r;for(let a=0;a<=t;a++)try{return await e()}catch(n){if(r=n,n instanceof Error&&(n.message.includes("401")||n.message.includes("403")))throw n;if(a<t){const o=Math.min(i*Math.pow(2,a),5e3);await new Promise(l=>setTimeout(l,o))}}throw r}class j1{constructor(){this.state={...ud,pendingServices:new Map,changingServices:new Set},this.listeners=new Set,this.watcherUnsub=null,this.queueUpdateInterval=null,this.started=!1}start(){this.started||(this.started=!0,this.watcherUnsub=gi.onEntityChange((t,i)=>{t&&this.shouldRefreshShield(t)&&this.refresh()}),this.refresh(),this.queueUpdateInterval=window.setInterval(()=>{this.state.allRequests.length>0&&this.notify()},1e3),L.debug("ShieldController started"))}stop(){var t;(t=this.watcherUnsub)==null||t.call(this),this.watcherUnsub=null,this.queueUpdateInterval!==null&&(clearInterval(this.queueUpdateInterval),this.queueUpdateInterval=null),this.started=!1,L.debug("ShieldController stopped")}subscribe(t){return this.listeners.add(t),t(this.state),()=>this.listeners.delete(t)}getState(){return this.state}shouldRefreshShield(t){return["service_shield_","box_prms_mode","box_mode_extended","box_prm2_app","boiler_manual_mode","invertor_prms_to_grid","invertor_prm1_p_max_feed_grid"].some(r=>t.includes(r))}readSupplementaryState(t){const i=t.findSensorId("box_mode_extended"),r=t.get(i);if(!r||r.state==="unavailable"||r.state==="unknown"||r.state==="")return{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1};const a=r.attributes??{};return{home_grid_v:a.home_grid_v===!0,home_grid_vi:a.home_grid_vi===!0,flexibilita:a.flexibilita===!0,available:!0}}refresh(){const t=It();if(t)try{const i=t.findSensorId("service_shield_activity"),r=t.get(i),a=(r==null?void 0:r.attributes)??{},n=a.running_requests??[],o=a.queued_requests??[],l=t.findSensorId("service_shield_status"),c=t.findSensorId("service_shield_queue"),p=t.getString(l).value,u=t.getNumeric(c).value,h=t.getString(t.findSensorId("box_prms_mode")).value,g=t.getString(t.findSensorId("invertor_prms_to_grid")).value,v=t.getNumeric(t.findSensorId("invertor_prm1_p_max_feed_grid")).value,f=t.getString(t.findSensorId("boiler_manual_mode")).value,b=ms[h.trim()]??"home_1",$=vs[f.trim()]??"cbb",_=n.map((U,Z)=>this.parseRequest(U,Z,!0)),w=o.map((U,Z)=>this.parseRequest(U,Z+n.length,!1)),C=[..._,...w],D=new Map,T=new Set;for(const U of C){const Z=this.parseServiceRequest(U);Z&&!D.has(Z.type)&&(D.set(Z.type,Z.targetValue),T.add(Z.type))}const I=p==="Running"||p==="running",V=hd({gridModeRaw:g,gridLimit:v},{pendingServices:D,changingServices:T,shieldStatus:I?"running":"idle"}),Y=xo(g)||V.currentLiveDelivery==="unknown"?this.state.currentGridDelivery:V.currentLiveDelivery;this.state={status:I?"running":"idle",activity:(r==null?void 0:r.state)??"",queueCount:u,runningRequests:_,queuedRequests:w,allRequests:C,currentBoxMode:b,currentGridDelivery:Y,currentGridLimit:V.currentLiveLimit??0,currentBoilerMode:$,pendingServices:D,changingServices:T,gridDeliveryState:V,supplementary:this.readSupplementaryState(t)},this.notify()}catch(i){L.error("ShieldController refresh failed",i)}}parseRequest(t,i,r){const a=t||{},n=a.service??"",l=(Array.isArray(a.changes)?a.changes:[]).map(f=>typeof f=="string"?f:String(f??"")).filter(f=>f.length>0),c=a.started_at??a.queued_at??a.created_at??a.timestamp??a.created??"",p=Array.isArray(a.targets)?a.targets.map(f=>({param:String((f==null?void 0:f.param)??""),value:String((f==null?void 0:f.value)??(f==null?void 0:f.to)??""),entityId:String((f==null?void 0:f.entity_id)??(f==null?void 0:f.entityId)??""),from:String((f==null?void 0:f.from)??""),to:String((f==null?void 0:f.to)??(f==null?void 0:f.value)??""),current:String((f==null?void 0:f.current)??"")})):[],u=this.extractRequestParams(a.params),h=this.extractGridDeliveryStep(a,u),g=this.resolveRequestTargetValue(a,p,u,h);let v="mode_change";if(n.includes("set_box_mode")){const f=this.extractRequestParams(a.params);v=(f==null?void 0:f.home_grid_v)!==void 0||(f==null?void 0:f.home_grid_vi)!==void 0||Array.isArray(a.targets)&&a.targets.some($=>($==null?void 0:$.param)==="app")?"supplementary_toggle":"mode_change"}else n.includes("set_grid_delivery")&&!n.includes("limit")?v="grid_delivery":n.includes("grid_delivery_limit")||n.includes("set_grid_delivery")?v="grid_limit":n.includes("set_boiler_mode")?v="boiler_mode":n.includes("set_formating_mode")&&(v="battery_formating");return{id:`${n}_${i}_${c}`,type:v,status:r?"running":"queued",service:n,targetValue:g,changes:l,createdAt:c,position:i+1,description:typeof a.description=="string"?a.description:void 0,params:u,targets:p,traceId:typeof a.trace_id=="string"?a.trace_id:void 0,gridDeliveryStep:h}}parseServiceRequest(t){var p,u;const i=t.service;if(!i)return null;const r=t.changes.length>0?t.changes[0]:"",a=t.params,n=t.gridDeliveryStep,o=this.extractStructuredTarget(t);if(i.includes("set_grid_delivery")&&o)return o;if(i.includes("set_grid_delivery")&&r.includes("p_max_feed_grid")){const h=r.match(/→\s*'?(\d+)'?/),g=h?h[1]:t.targetValue;return g?{type:"grid_limit",targetValue:g}:null}const l=r.match(/→\s*'([^']+)'/),c=l?l[1]:t.targetValue||"";if(i.includes("set_box_mode")){if(((p=t.targets)==null?void 0:p.some(g=>g.param==="app"))||(a==null?void 0:a.home_grid_v)!==void 0||(a==null?void 0:a.home_grid_vi)!==void 0){const g=(u=t.targets)==null?void 0:u.find(b=>b.param==="app"),v=(g==null?void 0:g.to)||t.targetValue;return{type:"supplementary",targetValue:pd[v]??v??""}}return{type:"box_mode",targetValue:c}}if(i.includes("set_boiler_mode"))return{type:"boiler_mode",targetValue:c};if(i.includes("set_grid_delivery")&&r.includes("prms_to_grid"))return{type:"grid_mode",targetValue:c};if(i.includes("set_grid_delivery")){if(n==="limit"){const g=this.normalizeNumericTargetValue((a==null?void 0:a.limit)??t.targetValue);return g?{type:"grid_limit",targetValue:g}:null}if(n==="mode"){const g=this.normalizeModeTargetValue((a==null?void 0:a.mode)??t.targetValue);return g?{type:"grid_mode",targetValue:g}:null}const h=r.match(/→\s*'?(\d+)'?/);return h?{type:"grid_limit",targetValue:h[1]}:t.targetValue&&/^\d+$/.test(t.targetValue.trim())?{type:"grid_limit",targetValue:t.targetValue}:{type:"grid_mode",targetValue:c}}return null}extractRequestParams(t){if(!(!t||typeof t!="object"||Array.isArray(t)))return t}extractGridDeliveryStep(t,i){const r=(t==null?void 0:t.grid_delivery_step)??(i==null?void 0:i._grid_delivery_step);return typeof r=="string"?r:void 0}resolveRequestTargetValue(t,i,r,a){const n=this.extractStructuredTarget({service:(t==null?void 0:t.service)??"",targetValue:"",params:r,targets:i,gridDeliveryStep:a});if(n!=null&&n.targetValue)return n.targetValue;const o=t.target_value??t.target_display;return typeof o=="string"?o:""}extractStructuredTarget(t){if(!t.service.includes("set_grid_delivery"))return null;const i=t.gridDeliveryStep,r=t.params,a=t.targets??[];if(i==="limit"){const l=this.findTargetValue(a,["limit"]),c=this.normalizeNumericTargetValue(l??(r==null?void 0:r.limit)??t.targetValue);return c?{type:"grid_limit",targetValue:c}:null}if(i==="mode"){const l=this.findTargetValue(a,["mode"]),c=this.normalizeModeTargetValue(l??(r==null?void 0:r.mode)??t.targetValue);return c?{type:"grid_mode",targetValue:c}:null}const n=this.findTargetValue(a,["limit"]);if(n){const l=this.normalizeNumericTargetValue(n);if(l)return{type:"grid_limit",targetValue:l}}const o=this.findTargetValue(a,["mode"]);if(o){const l=this.normalizeModeTargetValue(o);if(l)return{type:"grid_mode",targetValue:l}}return null}findTargetValue(t,i){const r=new Set(i),a=t.find(n=>r.has(n.param));return(a==null?void 0:a.to)||(a==null?void 0:a.value)||void 0}normalizeNumericTargetValue(t){if(typeof t=="number"&&Number.isFinite(t))return String(Math.round(t));if(typeof t!="string")return"";const i=t.trim().match(/(\d+)/);return i?i[1]:""}normalizeModeTargetValue(t){if(typeof t!="string")return"";const i=t.trim();switch(i.toLowerCase()){case"off":return"Vypnuto";case"on":return"Zapnuto";case"limited":return"Omezeno";default:return i}}isLimitedGridDeliveryActiveOrPending(){const t=this.state.gridDeliveryState;if(t.pendingDeliveryTarget==="limited"||t.pendingLimitTarget!==null||t.currentLiveDelivery==="limited"||t.currentLiveDelivery==="unknown"&&(xp(t)==="limited"||this.state.currentGridDelivery==="limited"))return!0;const i=It();if(i){const r=i.getString(i.findSensorId("invertor_prms_to_grid")).value;if(!xo(r)&&Io(r)==="limited")return!0}return!1}needsGridModeChangeForLimitedRequest(){return!this.isLimitedGridDeliveryActiveOrPending()}getBoxModeButtonState(t){const i=this.state.pendingServices.get("box_mode");return i?ms[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoxMode===t?"active":"idle"}getGridDeliveryButtonState(t){return this.getGridDeliveryButtonStateV2(t)}getGridDeliveryButtonStateV2(t){const i=this.state.gridDeliveryState,a=this.state.status==="running"?"processing":"pending",n=i.pendingDeliveryTarget,o=i.pendingLimitTarget,l=i.currentLiveDelivery;return n!==null?n===t?a:t==="limited"&&l==="limited"||t==="limited"&&l==="unknown"&&this.state.currentGridDelivery==="limited"?"active":"disabled-by-service":o!==null?t==="limited"?a:"disabled-by-service":l===t?"active":"idle"}getBoilerModeButtonState(t){const i=this.state.pendingServices.get("boiler_mode");return i?vs[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoilerMode===t?"active":"idle"}isAnyServiceChanging(){return this.state.changingServices.size>0}shouldProceedWithQueue(){return this.state.queueCount<3?!0:window.confirm(`⚠️ VAROVÁNÍ: Fronta již obsahuje ${this.state.queueCount} úkolů!

Každá změna může trvat až 10 minut.
Opravdu chcete přidat další úkol?`)}async setBoxMode(t){if(this.state.currentBoxMode===t&&!this.state.changingServices.has("box_mode"))return!1;const i=await J.callService("oig_cloud","set_box_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async setGridDelivery(t,i){const r={acknowledgement:!0,warning:!0};t==="limited"&&i!=null?(this.needsGridModeChangeForLimitedRequest()&&(r.mode=t),r.limit=i):i!=null?r.limit=i:r.mode=t;const a=await J.callService("oig_cloud","set_grid_delivery",r);return a&&this.refresh(),a}async setBoilerMode(t){if(this.state.currentBoilerMode===t&&!this.state.changingServices.has("boiler_mode"))return!1;const i=await J.callService("oig_cloud","set_boiler_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async removeFromQueue(t){const i=await J.callService("oig_cloud","shield_remove_from_queue",{position:t});return i&&this.refresh(),i}async setSupplementaryToggle(t,i){const r=await J.callService("oig_cloud","set_box_mode",{[t]:i,acknowledgement:!0});return r&&this.refresh(),r}notify(){for(const t of this.listeners)try{t(this.state)}catch(i){L.error("ShieldController listener error",i)}}}const ye=new j1,on=["modules","ai","solar","pricing_distribution","pricing_supplier","pricing_supplier_sell","battery","boiler","connection"];function Tn(e){const t=e.steps??{},i=e.timestamps??{},r=Object.keys(t).filter(o=>!on.includes(o));r.length>0&&L.debug("Ignoring unknown onboarding step id(s)",{unknown:r});const a={},n={};for(const o of on)t[o]!==void 0&&(a[o]=t[o]),i[o]!==void 0&&(n[o]=i[o]);return{...e,steps:a,timestamps:n}}async function No(e,t){if(!e)return null;const i=await J.fetchOIGAPI(`/${e}/onboarding`,{signal:t});return i?Tn(i):null}async function N1(e,t){if(!on.includes(t))throw new Error(`unknown onboarding step: ${t}`);const i=await J.fetchOIGAPI(`/${e}/onboarding`,{method:"POST",body:JSON.stringify({action:"complete_step",step:t})});return i?Tn(i):null}async function R1(e,t){if(!on.includes(t))throw new Error(`unknown onboarding step: ${t}`);const i=await J.fetchOIGAPI(`/${e}/onboarding`,{method:"POST",body:JSON.stringify({action:"skip",step:t})});return i?Tn(i):null}async function W1(e){if(!e)return null;const t=await J.fetchOIGAPI(`/${e}/onboarding`,{method:"POST",body:JSON.stringify({action:"dismiss_banner"})});return t?Tn(t):null}async function K1(e,t,i){return e?J.fetchOIGAPI(`/${e}/ai`,{method:"POST",body:JSON.stringify({action:"verify",provider:t,api_key:i})}):null}var Z1="M4.93,4.93C3.12,6.74 2,9.24 2,12C2,14.76 3.12,17.26 4.93,19.07L6.34,17.66C4.89,16.22 4,14.22 4,12C4,9.79 4.89,7.78 6.34,6.34L4.93,4.93M19.07,4.93L17.66,6.34C19.11,7.78 20,9.79 20,12C20,14.22 19.11,16.22 17.66,17.66L19.07,19.07C20.88,17.26 22,14.76 22,12C22,9.24 20.88,6.74 19.07,4.93M7.76,7.76C6.67,8.85 6,10.35 6,12C6,13.65 6.67,15.15 7.76,16.24L9.17,14.83C8.45,14.11 8,13.11 8,12C8,10.89 8.45,9.89 9.17,9.17L7.76,7.76M16.24,7.76L14.83,9.17C15.55,9.89 16,10.89 16,12C16,13.11 15.55,14.11 14.83,14.83L16.24,16.24C17.33,15.15 18,13.65 18,12C18,10.35 17.33,8.85 16.24,7.76M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10Z",q1="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z",G1="M6.59,0.66C8.93,-1.15 11.47,1.06 12.04,4.5C12.47,4.5 12.89,4.62 13.27,4.84C13.79,4.24 14.25,3.42 14.07,2.5C13.65,0.35 16.06,-1.39 18.35,1.58C20.16,3.92 17.95,6.46 14.5,7.03C14.5,7.46 14.39,7.89 14.16,8.27C14.76,8.78 15.58,9.24 16.5,9.06C18.63,8.64 20.38,11.04 17.41,13.34C15.07,15.15 12.53,12.94 11.96,9.5C11.53,9.5 11.11,9.37 10.74,9.15C10.22,9.75 9.75,10.58 9.93,11.5C10.35,13.64 7.94,15.39 5.65,12.42C3.83,10.07 6.05,7.53 9.5,6.97C9.5,6.54 9.63,6.12 9.85,5.74C9.25,5.23 8.43,4.76 7.5,4.94C5.37,5.36 3.62,2.96 6.59,0.66M5,16H7A2,2 0 0,1 9,18V24H7V22H5V24H3V18A2,2 0 0,1 5,16M5,18V20H7V18H5M12.93,16H15L12.07,24H10L12.93,16M18,16H21V18H18V22H21V24H18A2,2 0 0,1 16,22V18A2,2 0 0,1 18,16Z",Fs="M19,18.31V20A2,2 0 0,1 17,22H7A2,2 0 0,1 5,20V16.3C4.54,16.12 3.95,16 3,16A1,1 0 0,1 2,15A1,1 0 0,1 3,14C3.82,14 4.47,14.08 5,14.21V12.3C4.54,12.12 3.95,12 3,12A1,1 0 0,1 2,11A1,1 0 0,1 3,10C3.82,10 4.47,10.08 5,10.21V8.3C4.54,8.12 3.95,8 3,8A1,1 0 0,1 2,7A1,1 0 0,1 3,6C3.82,6 4.47,6.08 5,6.21V4A2,2 0 0,1 7,2H17A2,2 0 0,1 19,4V6.16C20.78,6.47 21.54,7.13 21.71,7.29C22.1,7.68 22.1,8.32 21.71,8.71C21.32,9.1 20.8,9.09 20.29,8.71V8.71C20.29,8.71 19.25,8 17,8C15.74,8 14.91,8.41 13.95,8.9C12.91,9.41 11.74,10 10,10C9.64,10 9.31,10 9,9.96V7.95C9.3,8 9.63,8 10,8C11.26,8 12.09,7.59 13.05,7.11C14.09,6.59 15.27,6 17,6V4H7V20H17V18C18.5,18 18.97,18.29 19,18.31M17,10C15.27,10 14.09,10.59 13.05,11.11C12.09,11.59 11.26,12 10,12C9.63,12 9.3,12 9,11.95V13.96C9.31,14 9.64,14 10,14C11.74,14 12.91,13.41 13.95,12.9C14.91,12.42 15.74,12 17,12C19.25,12 20.29,12.71 20.29,12.71V12.71C20.8,13.1 21.32,13.1 21.71,12.71C22.1,12.32 22.1,11.69 21.71,11.29C21.5,11.08 20.25,10 17,10M17,14C15.27,14 14.09,14.59 13.05,15.11C12.09,15.59 11.26,16 10,16C9.63,16 9.3,16 9,15.95V17.96C9.31,18 9.64,18 10,18C11.74,18 12.91,17.41 13.95,16.9C14.91,16.42 15.74,16 17,16C19.25,16 20.29,16.71 20.29,16.71V16.71C20.8,17.1 21.32,17.1 21.71,16.71C22.1,16.32 22.1,15.69 21.71,15.29C21.5,15.08 20.25,14 17,14Z",U1="M11,9A4,4 0 0,1 15,13A4,4 0 0,1 11,17A4,4 0 0,1 7,13A4,4 0 0,1 11,9M11,11A2,2 0 0,0 9,13A2,2 0 0,0 11,15A2,2 0 0,0 13,13A2,2 0 0,0 11,11M7,4H14A4,4 0 0,1 18,8V9H16V8A2,2 0 0,0 14,6H7A2,2 0 0,0 5,8V20H16V18H18V22H3V8A4,4 0 0,1 7,4M16,11C18.5,11 18.5,9 21,9V11C18.5,11 18.5,13 16,13V11M16,15C18.5,15 18.5,13 21,13V15C18.5,15 18.5,17 16,17V15Z",Y1="M20.56 3.91C21.15 4.5 21.15 5.45 20.56 6.03L16.67 9.92L18.79 19.11L17.38 20.53L13.5 13.1L9.6 17L9.96 19.47L8.89 20.53L7.13 17.35L3.94 15.58L5 14.5L7.5 14.87L11.37 11L3.94 7.09L5.36 5.68L14.55 7.8L18.44 3.91C19 3.33 20 3.33 20.56 3.91Z",Q1="M12,20A7,7 0 0,1 5,13A7,7 0 0,1 12,6A7,7 0 0,1 19,13A7,7 0 0,1 12,20M12,4A9,9 0 0,0 3,13A9,9 0 0,0 12,22A9,9 0 0,0 21,13A9,9 0 0,0 12,4M12.5,8H11V14L15.75,16.85L16.5,15.62L12.5,13.25V8M7.88,3.39L6.6,1.86L2,5.71L3.29,7.24L7.88,3.39M22,5.72L17.4,1.86L16.11,3.39L20.71,7.25L22,5.72Z",X1="M6,6.9L3.87,4.78L5.28,3.37L7.4,5.5L6,6.9M13,1V4H11V1H13M20.13,4.78L18,6.9L16.6,5.5L18.72,3.37L20.13,4.78M4.5,10.5V12.5H1.5V10.5H4.5M19.5,10.5H22.5V12.5H19.5V10.5M6,20H18A2,2 0 0,1 20,22H4A2,2 0 0,1 6,20M12,5A6,6 0 0,1 18,11V19H6V11A6,6 0 0,1 12,5Z",J1="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",eu="M11,4H13V16L18.5,10.5L19.92,11.92L12,19.84L4.08,11.92L5.5,10.5L11,16V4Z",tu="M13,20H11V8L5.5,13.5L4.08,12.08L12,4.16L19.92,12.08L18.5,13.5L13,8V20Z",iu="M10 10V12H8V10H10M16 12V10H14V12H16M21 14V22H3V14H4V10C4 5.58 7.58 2 12 2S20 5.58 20 10V14H21M7 16H5V20H7V16M11 16H9V20H11V16M11 4.08C8.16 4.56 6 7.03 6 10V14H11V4.08M13 14H18V10C18 7.03 15.84 4.56 13 4.08V14M15 16H13V20H15V16M19 16H17V20H19V16Z",ru="M5.5,21C4.72,21 4.04,20.55 3.71,19.9V19.9L1.1,10.44L1,10A1,1 0 0,1 2,9H6.58L11.18,2.43C11.36,2.17 11.66,2 12,2C12.34,2 12.65,2.17 12.83,2.44L17.42,9H22A1,1 0 0,1 23,10L22.96,10.29L20.29,19.9C19.96,20.55 19.28,21 18.5,21H5.5M12,4.74L9,9H15L12,4.74M12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13Z",au="M7 5C8.11 5 9 5.9 9 7S8.11 9 7 9 5 8.11 5 7 5.9 5 7 5M20 13V4.83C20 3.27 18.73 2 17.17 2C16.42 2 15.7 2.3 15.17 2.83L13.92 4.08C13.76 4.03 13.59 4 13.41 4C13 4 12.64 4.12 12.33 4.32L15.09 7.08C15.29 6.77 15.41 6.4 15.41 6C15.41 5.82 15.38 5.66 15.34 5.5L16.59 4.24C16.74 4.09 16.95 4 17.17 4C17.63 4 18 4.37 18 4.83V13H11.15C10.85 12.79 10.58 12.55 10.33 12.28L8.93 10.73C8.74 10.5 8.5 10.35 8.24 10.23C7.93 10.08 7.59 10 7.24 10C6 10 5 11 5 12.25V13H2V19C2 20.1 2.9 21 4 21C4 21.55 4.45 22 5 22H19C19.55 22 20 21.55 20 21C21.1 21 22 20.1 22 19V13H20Z",nu="M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",ou="M16,18H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",su="M16,13H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",lu="M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.66C6,21.4 6.6,22 7.33,22H16.66C17.4,22 18,21.4 18,20.67V5.33C18,4.6 17.4,4 16.67,4M11,20V14.5H9L13,7V12.5H15",du="M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21",cu="M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21M19.75,3.19L18.33,4.61C20.04,6.3 21,8.6 21,11H23C23,8.07 21.84,5.25 19.75,3.19M1,11H3C3,8.6 3.96,6.3 5.67,4.61L4.25,3.19C2.16,5.25 1,8.07 1,11Z",pu="M19 10C18.44 10 17.91 10.11 17.41 10.28L14.46 4.5H11V6H13.54L14.42 7.72L12 13.13L10.23 8.95C10.5 8.85 10.74 8.58 10.74 8.25C10.74 7.84 10.41 7.5 10 7.5H8C7.58 7.5 7.24 7.84 7.24 8.25S7.58 9 8 9H8.61L10.86 14.25H9.92C9.56 11.85 7.5 10 5 10C2.24 10 0 12.24 0 15S2.24 20 5 20C7.5 20 9.56 18.15 9.92 15.75H12.5L15.29 9.43L16.08 10.96C14.82 11.87 14 13.34 14 15C14 17.76 16.24 20 19 20S24 17.76 24 15 21.76 10 19 10M5 18.5C3.07 18.5 1.5 16.93 1.5 15S3.07 11.5 5 11.5C6.67 11.5 8.07 12.68 8.41 14.25H4V15.75H8.41C8.07 17.32 6.67 18.5 5 18.5M19 18.5C17.07 18.5 15.5 16.93 15.5 15C15.5 13.92 16 12.97 16.77 12.33L18.57 15.85L19.89 15.13L18.1 11.63C18.39 11.56 18.69 11.5 19 11.5C20.93 11.5 22.5 13.07 22.5 15S20.93 18.5 19 18.5Z",Bs="M16.13 15.13L18 3H14V2H10V3H5C3.9 3 3 3.9 3 5V9C3 10.1 3.9 11 5 11H7.23L7.87 15.13C6.74 16.05 6 17.43 6 19V20C6 21.1 6.9 22 8 22H16C17.1 22 18 21.1 18 20V19C18 17.43 17.26 16.05 16.13 15.13M5 9V5H6.31L6.93 9H5M12 19C11.45 19 11 18.55 11 18S11.45 17 12 17 13 17.45 13 18 12.55 19 12 19M14.29 14H9.72L8.33 5H15.67L14.29 14Z",uu="M3,2H21A1,1 0 0,1 22,3V5A1,1 0 0,1 21,6H20V13A1,1 0 0,1 19,14H13V16.17C14.17,16.58 15,17.69 15,19A3,3 0 0,1 12,22A3,3 0 0,1 9,19C9,17.69 9.83,16.58 11,16.17V14H5A1,1 0 0,1 4,13V6H3A1,1 0 0,1 2,5V3A1,1 0 0,1 3,2M12,18A1,1 0 0,0 11,19A1,1 0 0,0 12,20A1,1 0 0,0 13,19A1,1 0 0,0 12,18Z",hu="M3 2H21C21.55 2 22 2.45 22 3V5C22 5.55 21.55 6 21 6H20V7C20 7.55 19.55 8 19 8H13V10.17C14.17 10.58 15 11.7 15 13C15 14.66 13.66 16 12 16C10.34 16 9 14.66 9 13C9 11.69 9.84 10.58 11 10.17V8H5C4.45 8 4 7.55 4 7V6H3C2.45 6 2 5.55 2 5V3C2 2.45 2.45 2 3 2M12 12C11.45 12 11 12.45 11 13C11 13.55 11.45 14 12 14C12.55 14 13 13.55 13 13C13 12.45 12.55 12 12 12Z",gu="M14.88,16.29L13,18.17V14.41M13,5.83L14.88,7.71L13,9.58M17.71,7.71L12,2H11V9.58L6.41,5L5,6.41L10.59,12L5,17.58L6.41,19L11,14.41V22H12L17.71,16.29L13.41,12L17.71,7.71Z",bu="M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,15.31L23.31,12L20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31Z",fu="M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z",js="M19.36,2.72L20.78,4.14L15.06,9.85C16.13,11.39 16.28,13.24 15.38,14.44L9.06,8.12C10.26,7.22 12.11,7.37 13.65,8.44L19.36,2.72M5.93,17.57C3.92,15.56 2.69,13.16 2.35,10.92L7.23,8.83L14.67,16.27L12.58,21.15C10.34,20.81 7.94,19.58 5.93,17.57Z",mu="M18,11H6V6H18M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M4,16C4,16.88 4.39,17.67 5,18.22V20A1,1 0 0,0 6,21H7A1,1 0 0,0 8,20V19H16V20A1,1 0 0,0 17,21H18A1,1 0 0,0 19,20V18.22C19.61,17.67 20,16.88 20,16V6C20,2.5 16.42,2 12,2C7.58,2 4,2.5 4,6V16Z",vu="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z",Ns="M15,13H16.5V15.82L18.94,17.23L18.19,18.53L15,16.69V13M19,8H5V19H9.67C9.24,18.09 9,17.07 9,16A7,7 0 0,1 16,9C17.07,9 18.09,9.24 19,9.67V8M5,21C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H6V1H8V3H16V1H18V3H19A2,2 0 0,1 21,5V11.1C22.24,12.36 23,14.09 23,16A7,7 0 0,1 16,23C14.09,23 12.36,22.24 11.1,21H5M16,11.15A4.85,4.85 0 0,0 11.15,16C11.15,18.68 13.32,20.85 16,20.85A4.85,4.85 0 0,0 20.85,16C20.85,13.32 18.68,11.15 16,11.15Z",yu="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z",xu="M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z",wu="M4,3V6H1V20H23V6H20V3H14V6H10V3H4M3,8H21V18H3V8M15,10V12H13V14H15V16H17V14H19V12H17V10H15M5,12V14H11V12H5Z",_u="M18.92 2C18.72 1.42 18.16 1 17.5 1H6.5C5.84 1 5.29 1.42 5.08 2L3 8V16C3 16.55 3.45 17 4 17H5C5.55 17 6 16.55 6 16V15H18V16C18 16.55 18.45 17 19 17H20C20.55 17 21 16.55 21 16V8L18.92 2M6.5 12C5.67 12 5 11.33 5 10.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12M17.5 12C16.67 12 16 11.33 16 10.5S16.67 9 17.5 9 19 9.67 19 10.5 18.33 12 17.5 12M5 7L6.5 2.5H17.5L19 7H5M7 20H11V18L17 21H13V23L7 20Z",$u="M3,6H21V18H3V6M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M7,8A2,2 0 0,1 5,10V14A2,2 0 0,1 7,16H17A2,2 0 0,1 19,14V10A2,2 0 0,1 17,8H7Z",Rs="M1,10V12A9,9 0 0,1 10,21H12C12,14.92 7.07,10 1,10M1,14V16A5,5 0 0,1 6,21H8A7,7 0 0,0 1,14M1,18V21H4A3,3 0 0,0 1,18M21,3H3C1.89,3 1,3.89 1,5V8H3V5H21V19H14V21H21A2,2 0 0,0 23,19V5C23,3.89 22.1,3 21,3Z",ku="M6.03 12.03L8.03 15.5L5.5 18.68L2 12.62L6.03 12.03M17 18V15.29C17.88 14.9 18.5 14.03 18.5 13C18.5 12.43 18.3 11.9 17.97 11.5L19.94 10.35C20.95 9.76 21.3 8.47 20.71 7.46L19.33 5.06C18.74 4.05 17.45 3.7 16.44 4.28L8.31 9C7.36 9.53 7.03 10.75 7.58 11.71L9.08 14.31C9.63 15.26 10.86 15.59 11.81 15.04L13.69 13.96C13.94 14.55 14.41 15.03 15 15.29V18C15 19.1 15.9 20 17 20H22V18H17Z",Cu="M8,9H11V4H13V9H16L20,17H4L8,9M14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18H14Z",Su="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z",Mu="M15 13.1C15 14.76 13.66 16.1 12 16.1S9 14.76 9 13.1 10.34 10.1 12 10.1 15 11.44 15 13.1M9 2V3C9 4.11 9.9 5 11 5V9.1C11.32 9.04 11.66 9 12 9S12.68 9.04 13 9.1V5C14.11 5 15 4.11 15 3V2H9M4 11.1C2.34 11.1 1 12.44 1 14.1S2.34 17.1 4 17.1 7 15.76 7 14.1 5.66 11.1 4 11.1M20 11.1C18.34 11.1 17 12.44 17 14.1S18.34 17.1 20 17.1 23 15.76 23 14.1 21.66 11.1 20 11.1M20 18.1C19.32 18.1 18.67 17.96 18.08 17.71C17.6 17.95 17.07 18.1 16.5 18.1C15.39 18.1 14.41 17.57 13.77 16.77C13.22 17 12.63 17.1 12 17.1S10.78 17 10.23 16.77C9.59 17.57 8.61 18.1 7.5 18.1C6.93 18.1 6.4 17.95 5.92 17.71C5.33 17.96 4.68 18.1 4 18.1C3.73 18.1 3.46 18.06 3.2 18C4.21 19.29 5.76 20.1 7.5 20.1C8.83 20.1 10.05 19.63 11 18.84V21.1C11 21.65 11.45 22.1 12 22.1C12.55 22.1 13 21.65 13 21.1V18.84C13.95 19.63 15.17 20.1 16.5 20.1C18.24 20.1 19.79 19.29 20.8 18C20.54 18.06 20.27 18.1 20 18.1Z",Au="M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z",Lu="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",Tu="M10,17L5,12L6.41,10.58L10,14.17L17.59,6.58L19,8M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",Pu="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z",Hu="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",Vu="M6.5 20Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20Z",zu="M18 6V4H20V2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H20V20H15.97C17.2 19.09 18 17.64 18 16V11H8V16C8 17.64 8.81 19.09 10.03 20H6V4H8V6C8 6.55 8.45 7 9 7H17C17.55 7 18 6.55 18 6M13 8C13.55 8 14 8.45 14 9S13.55 10 13 10 12 9.55 12 9 12.45 8 13 8Z",Ws="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z",Du="M19,3L13,9L15,11L22,4V3M12,12.5A0.5,0.5 0 0,1 11.5,12A0.5,0.5 0 0,1 12,11.5A0.5,0.5 0 0,1 12.5,12A0.5,0.5 0 0,1 12,12.5M6,20A2,2 0 0,1 4,18C4,16.89 4.9,16 6,16A2,2 0 0,1 8,18C8,19.11 7.1,20 6,20M6,8A2,2 0 0,1 4,6C4,4.89 4.9,4 6,4A2,2 0 0,1 8,6C8,7.11 7.1,8 6,8M9.64,7.64C9.87,7.14 10,6.59 10,6A4,4 0 0,0 6,2A4,4 0 0,0 2,6A4,4 0 0,0 6,10C6.59,10 7.14,9.87 7.64,9.64L10,12L7.64,14.36C7.14,14.13 6.59,14 6,14A4,4 0 0,0 2,18A4,4 0 0,0 6,22A4,4 0 0,0 10,18C10,17.41 9.87,16.86 9.64,16.36L12,14L19,21H22V20L9.64,7.64Z",Ou="M12.43 11C12.28 10.84 10 7 7 7S2.32 10.18 2 11V13H11.57C11.72 13.16 14 17 17 17S21.68 13.82 22 13V11H12.43M7 9C8.17 9 9.18 9.85 10 11H4.31C4.78 10.17 5.54 9 7 9M17 15C15.83 15 14.82 14.15 14 13H19.69C19.22 13.83 18.46 15 17 15Z",Eu="M2,9V11H22V9H2M2,13V15H7V13H2M9,13V15H15V13H9M17,13V15H22V13H17Z",Iu="M23 3H1V1H23V3M2 22H6C6 19 4 17 4 17C10 13 11 4 11 4H2V22M22 4H13C13 4 14 13 20 17C20 17 18 19 18 22H22V4Z",Fu="M10.85,2L9.18,4.5L10.32,5.25L7.14,10C7.1,10 7.05,10 7,10A2,2 0 0,0 5,12C5,12.94 5.66,13.75 6.58,13.95L10.62,20H7V22H17V20H13L8.53,13.28C8.83,12.92 9,12.47 9,12C9,11.7 8.93,11.4 8.8,11.13L12,6.37C11.78,8.05 12.75,9.89 14.45,11L18.89,4.37C17.2,3.24 15.12,3.04 13.65,3.87L10.85,2M18.33,7L16.67,9.5C17.35,9.95 18.29,9.77 18.75,9.08C19.21,8.39 19,7.46 18.33,7Z",Bu="M18,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V4A2,2 0 0,0 18,2M10,4A1,1 0 0,1 11,5A1,1 0 0,1 10,6A1,1 0 0,1 9,5A1,1 0 0,1 10,4M7,4A1,1 0 0,1 8,5A1,1 0 0,1 7,6A1,1 0 0,1 6,5A1,1 0 0,1 7,4M18,20H6V8H18V20M14.67,15.33C14.69,16.03 14.41,16.71 13.91,17.21C12.86,18.26 11.15,18.27 10.09,17.21C9.59,16.71 9.31,16.03 9.33,15.33C9.4,14.62 9.63,13.94 10,13.33C10.37,12.5 10.81,11.73 11.33,11L12,10C13.79,12.59 14.67,14.36 14.67,15.33",ju="M8,3C6.89,3 6,3.89 6,5V21H18V5C18,3.89 17.11,3 16,3H8M8,5H16V19H8V5M13,11V13H15V11H13Z",Nu="M12,3C10.89,3 10,3.89 10,5H3V19H2V21H22V19H21V5C21,3.89 20.11,3 19,3H12M12,5H19V19H12V5M5,11H7V13H5V11Z",Ru="M10 13H8V11H10V13M16 11H14V13H16V11M21 19V21H3V19H4V5C4 3.9 4.9 3 6 3H18C19.1 3 20 3.9 20 5V19H21M11 5H6V19H11V5M18 5H13V19H18V5Z",Wu="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z",Ku="M7,15H9V18H11V15H13V18H15V15H17V18H19V9H15V6H9V9H5V18H7V15M4.38,3H19.63C20.94,3 22,4.06 22,5.38V19.63A2.37,2.37 0 0,1 19.63,22H4.38C3.06,22 2,20.94 2,19.63V5.38C2,4.06 3.06,3 4.38,3Z",Zu="M17.3 5C19 6.5 20 8.6 20 11C20 15.4 16.4 19 12 19S4 15.4 4 11C4 8.6 5.1 6.5 6.7 5H17.3M18 3H6L5.4 3.5C3.2 5.4 2 8.1 2 11C2 16.5 6.5 21 12 21S22 16.5 22 11C22 8.1 20.8 5.4 18.6 3.5L18 3M13 7.5C13 8.3 13.7 9 14.5 9S16 8.3 16 7.5 15.3 6 14.5 6 13 6.7 13 7.5M8 7.5C8 8.3 8.7 9 9.5 9S11 8.3 11 7.5 10.3 6 9.5 6 8 6.7 8 7.5M7 13C8.1 13 9 12.1 9 11C9 9.9 8.1 9 7 9S5 9.9 5 11C5 12.1 5.9 13 7 13M11.5 15C11.5 13.9 10.6 13 9.5 13S7.5 13.9 7.5 15C7.5 16.1 8.4 17 9.5 17S11.5 16.1 11.5 15M12 13C13.1 13 14 12.1 14 11C14 9.9 13.1 9 12 9S10 9.9 10 11C10 12.1 10.9 13 12 13M16.5 15C16.5 13.9 15.6 13 14.5 13S12.5 13.9 12.5 15C12.5 16.1 13.4 17 14.5 17S16.5 16.1 16.5 15M19 11C19 9.9 18.1 9 17 9S15 9.9 15 11C15 12.1 15.9 13 17 13S19 12.1 19 11",Ks="M19.77,7.23L19.78,7.22L16.06,3.5L15,4.56L17.11,6.67C16.17,7.03 15.5,7.93 15.5,9A2.5,2.5 0 0,0 18,11.5C18.36,11.5 18.69,11.42 19,11.29V18.5A1,1 0 0,1 18,19.5A1,1 0 0,1 17,18.5V14A2,2 0 0,0 15,12H14V5A2,2 0 0,0 12,3H6A2,2 0 0,0 4,5V21H14V13.5H15.5V18.5A2.5,2.5 0 0,0 18,21A2.5,2.5 0 0,0 20.5,18.5V9C20.5,8.31 20.22,7.68 19.77,7.23M18,10A1,1 0 0,1 17,9A1,1 0 0,1 18,8A1,1 0 0,1 19,9A1,1 0 0,1 18,10M8,18V13.5H6L10,6V11H12L8,18Z",qu="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z",Gu="M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z",Zs="M19 14V16H16V14.28L19 14M19 13C19 11.9 18 11 16.8 11H10V10H5V21H10V13.91L19 13M5 9H10V7L15.36 5.21C15.74 5.09 16 4.73 16 4.33C16 3.68 15.36 3.23 14.75 3.45L5 7V9Z",Uu="M17.81,4.47C17.73,4.47 17.65,4.45 17.58,4.41C15.66,3.42 14,3 12,3C10.03,3 8.15,3.47 6.44,4.41C6.2,4.54 5.9,4.45 5.76,4.21C5.63,3.97 5.72,3.66 5.96,3.53C7.82,2.5 9.86,2 12,2C14.14,2 16,2.47 18.04,3.5C18.29,3.65 18.38,3.95 18.25,4.19C18.16,4.37 18,4.47 17.81,4.47M3.5,9.72C3.4,9.72 3.3,9.69 3.21,9.63C3,9.47 2.93,9.16 3.09,8.93C4.08,7.53 5.34,6.43 6.84,5.66C10,4.04 14,4.03 17.15,5.65C18.65,6.42 19.91,7.5 20.9,8.9C21.06,9.12 21,9.44 20.78,9.6C20.55,9.76 20.24,9.71 20.08,9.5C19.18,8.22 18.04,7.23 16.69,6.54C13.82,5.07 10.15,5.07 7.29,6.55C5.93,7.25 4.79,8.25 3.89,9.5C3.81,9.65 3.66,9.72 3.5,9.72M9.75,21.79C9.62,21.79 9.5,21.74 9.4,21.64C8.53,20.77 8.06,20.21 7.39,19C6.7,17.77 6.34,16.27 6.34,14.66C6.34,11.69 8.88,9.27 12,9.27C15.12,9.27 17.66,11.69 17.66,14.66A0.5,0.5 0 0,1 17.16,15.16A0.5,0.5 0 0,1 16.66,14.66C16.66,12.24 14.57,10.27 12,10.27C9.43,10.27 7.34,12.24 7.34,14.66C7.34,16.1 7.66,17.43 8.27,18.5C8.91,19.66 9.35,20.15 10.12,20.93C10.31,21.13 10.31,21.44 10.12,21.64C10,21.74 9.88,21.79 9.75,21.79M16.92,19.94C15.73,19.94 14.68,19.64 13.82,19.05C12.33,18.04 11.44,16.4 11.44,14.66A0.5,0.5 0 0,1 11.94,14.16A0.5,0.5 0 0,1 12.44,14.66C12.44,16.07 13.16,17.4 14.38,18.22C15.09,18.7 15.92,18.93 16.92,18.93C17.16,18.93 17.56,18.9 17.96,18.83C18.23,18.78 18.5,18.96 18.54,19.24C18.59,19.5 18.41,19.77 18.13,19.82C17.56,19.93 17.06,19.94 16.92,19.94M14.91,22C14.87,22 14.82,22 14.78,22C13.19,21.54 12.15,20.95 11.06,19.88C9.66,18.5 8.89,16.64 8.89,14.66C8.89,13.04 10.27,11.72 11.97,11.72C13.67,11.72 15.05,13.04 15.05,14.66C15.05,15.73 16,16.6 17.13,16.6C18.28,16.6 19.21,15.73 19.21,14.66C19.21,10.89 15.96,7.83 11.96,7.83C9.12,7.83 6.5,9.41 5.35,11.86C4.96,12.67 4.76,13.62 4.76,14.66C4.76,15.44 4.83,16.67 5.43,18.27C5.53,18.53 5.4,18.82 5.14,18.91C4.88,19 4.59,18.87 4.5,18.62C4,17.31 3.77,16 3.77,14.66C3.77,13.46 4,12.37 4.45,11.42C5.78,8.63 8.73,6.82 11.96,6.82C16.5,6.82 20.21,10.33 20.21,14.65C20.21,16.27 18.83,17.59 17.13,17.59C15.43,17.59 14.05,16.27 14.05,14.65C14.05,13.58 13.12,12.71 11.97,12.71C10.82,12.71 9.89,13.58 9.89,14.65C9.89,16.36 10.55,17.96 11.76,19.16C12.71,20.1 13.62,20.62 15.03,21C15.3,21.08 15.45,21.36 15.38,21.62C15.33,21.85 15.12,22 14.91,22Z",Yu="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5 14.47C5.06 14.97 5.12 15.47 5.29 15.97C5.43 16.57 5.7 17.17 6 17.7C7.08 19.43 8.95 20.67 10.96 20.92C13.1 21.19 15.39 20.8 17.03 19.32C18.86 17.66 19.5 15 18.56 12.72L18.43 12.46C18.22 12 17.66 11.2 17.66 11.2M14.5 17.5C14.22 17.74 13.76 18 13.4 18.1C12.28 18.5 11.16 17.94 10.5 17.28C11.69 17 12.4 16.12 12.61 15.23C12.78 14.43 12.46 13.77 12.33 13C12.21 12.26 12.23 11.63 12.5 10.94C12.69 11.32 12.89 11.7 13.13 12C13.9 13 15.11 13.44 15.37 14.8C15.41 14.94 15.43 15.08 15.43 15.23C15.46 16.05 15.1 16.95 14.5 17.5H14.5Z",Qu="M22,22H2V20H22V22M22,6H2V3H22V6M20,7V19H17V11C17,11 14.5,10 12,10C9.5,10 7,11 7,11V19H4V7H20M14.5,14.67H14.47L14.81,15.22L14.87,15.34C15.29,16.35 15,17.5 14.21,18.24C13.5,18.9 12.5,19.07 11.58,18.95C10.71,18.84 9.9,18.29 9.45,17.53C9.3,17.3 9.19,17.03 9.13,16.77L9,16.11C8.96,15.15 9.34,14.14 10.06,13.54C9.73,14.26 9.81,15.16 10.3,15.79L10.36,15.87C10.44,15.94 10.55,15.97 10.64,15.92C10.73,15.89 10.8,15.8 10.8,15.7L10.76,15.56C10.23,14.17 10.68,12.55 11.79,11.63C12.1,11.38 12.5,11.15 12.87,11.05C12.46,11.87 12.61,12.93 13.25,13.57L14.14,14.3L14.5,14.67M13.11,17.44V17.44C13.37,17.2 13.53,16.8 13.5,16.44V16.25C13.38,15.65 12.85,15.46 12.5,15L12.26,14.55C12.13,14.85 12.12,15.13 12.17,15.46C12.23,15.8 12.37,16.09 12.29,16.44C12.2,16.83 11.9,17.22 11.37,17.35C11.67,17.64 12.15,17.87 12.64,17.71L13.11,17.44Z",Xu="M7,2V13H10V22L17,10H13L17,2H7Z",Ju="M15,2L17,9H7L9,2M11,10H13V20H16V22H8V20H11V10Z",eh="M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",th="M7,2H17A2,2 0 0,1 19,4V9H5V4A2,2 0 0,1 7,2M19,19A2,2 0 0,1 17,21V22H15V21H9V22H7V21A2,2 0 0,1 5,19V10H19V19M8,5V7H10V5H8M8,12V15H10V12H8Z",ih="M9,21V22H7V21A2,2 0 0,1 5,19V4A2,2 0 0,1 7,2H17A2,2 0 0,1 19,4V19A2,2 0 0,1 17,21V22H15V21H9M7,4V9H17V4H7M7,19H17V11H7V19M8,12H10V15H8V12M8,6H10V8H8V6Z",rh="M16.5,9L13.5,12L16.5,15H22V9M9,16.5V22H15V16.5L12,13.5M7.5,9H2V15H7.5L10.5,12M15,7.5V2H9V7.5L12,10.5L15,7.5Z",ah="M19,20H17V11H7V20H5V9L12,5L19,9V20M8,12H16V14H8V12M8,15H16V17H8V15M16,18V20H8V18H16Z",nh="M19,20H17V11H7V20H5V9L12,5L19,9V20M8,12H16V14H8V12Z",qs="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12C20,14.4 19,16.5 17.3,18C15.9,16.7 14,16 12,16C10,16 8.2,16.7 6.7,18C5,16.5 4,14.4 4,12A8,8 0 0,1 12,4M14,5.89C13.62,5.9 13.26,6.15 13.1,6.54L11.81,9.77L11.71,10C11,10.13 10.41,10.6 10.14,11.26C9.73,12.29 10.23,13.45 11.26,13.86C12.29,14.27 13.45,13.77 13.86,12.74C14.12,12.08 14,11.32 13.57,10.76L13.67,10.5L14.96,7.29L14.97,7.26C15.17,6.75 14.92,6.17 14.41,5.96C14.28,5.91 14.15,5.89 14,5.89M10,6A1,1 0 0,0 9,7A1,1 0 0,0 10,8A1,1 0 0,0 11,7A1,1 0 0,0 10,6M7,9A1,1 0 0,0 6,10A1,1 0 0,0 7,11A1,1 0 0,0 8,10A1,1 0 0,0 7,9M17,9A1,1 0 0,0 16,10A1,1 0 0,0 17,11A1,1 0 0,0 18,10A1,1 0 0,0 17,9Z",oh="M12 20H2V18H7.75C7 15.19 4.81 13 2 12.26C2.64 12.1 3.31 12 4 12C8.42 12 12 15.58 12 20M22 12.26C21.36 12.1 20.69 12 20 12C17.07 12 14.5 13.58 13.12 15.93C13.41 16.59 13.65 17.28 13.79 18C13.92 18.65 14 19.32 14 20H22V18H16.24C17 15.19 19.19 13 22 12.26M15.64 11C16.42 8.93 17.87 7.18 19.73 6C15.44 6.16 12 9.67 12 14V14C12.95 12.75 14.2 11.72 15.64 11M11.42 8.85C10.58 6.66 8.88 4.89 6.7 4C8.14 5.86 9 8.18 9 10.71C9 10.92 8.97 11.12 8.96 11.32C9.39 11.56 9.79 11.84 10.18 12.14C10.39 10.96 10.83 9.85 11.42 8.85Z",sh="M8.06,2C7.88,3.17 8.17,4.16 8.95,4.97C9.45,5.47 9.61,6.14 9.42,7H10.41C10.53,6.45 10.55,6 10.45,5.55C10.36,5.13 10.05,4.63 9.5,4.03C9.05,3.47 8.89,2.8 9.05,2H8.06M10.55,2C10.36,3.17 10.66,4.16 11.44,4.97C11.94,5.47 12.09,6.14 11.91,7H12.89C13,6.45 13.03,6 12.94,5.55C12.84,5.13 12.53,4.63 12,4.03C11.53,3.47 11.38,2.8 11.53,2H10.55M13.08,2C12.89,3.17 13.19,4.16 13.97,4.97C14.47,5.47 14.61,6.14 14.39,7H15.42C15.55,6.45 15.56,6 15.47,5.55C15.38,5.13 15.06,4.63 14.53,4.03C14.06,3.47 13.91,2.8 14.06,2H13.08M5,8C5,9.42 5.39,10.7 6.14,11.84C6.87,12.96 7.91,13.85 9.14,14.39L5.16,20.44C5.06,20.56 5,20.75 5,21C5,21.41 5.16,21.69 5.44,21.84C5.56,21.94 5.75,22 6,22C6.41,22 6.69,21.84 6.84,21.56L7.83,19.97H14.2C14.41,20.55 14.79,21.05 15.28,21.42C15.78,21.8 16.36,22 17,22C17.83,22 18.53,21.69 19.13,21.09C19.72,20.5 20,19.8 20,19C20,18.17 19.72,17.47 19.13,16.88C18.53,16.28 17.83,16 17,16C16.36,16 15.78,16.17 15.28,16.55C14.78,16.92 14.42,17.41 14.2,18H9.14L11.11,14.95C11.27,15 11.56,15 12,15C12.44,15 12.73,15 12.89,14.95L13.88,16.5C14.29,15.96 14.84,15.54 15.47,15.28L14.91,14.39C16.03,13.89 17,13 17.79,11.77C18.59,10.5 19,9.27 19,8H5M17,18C17.3,18 17.53,18.09 17.72,18.28C17.91,18.47 18,18.72 18,19C18,19.27 17.91,19.5 17.72,19.71C17.54,19.91 17.28,20 17,20C16.74,20 16.5,19.91 16.29,19.71C16.09,19.5 16,19.26 16,19C16,18.7 16.09,18.47 16.29,18.28C16.5,18.09 16.73,18 17,18Z",lh="M2 19.63L13.43 8.2L12.72 7.5L14.14 6.07L12 3.89C13.2 2.7 15.09 2.7 16.27 3.89L19.87 7.5L18.45 8.91H21.29L22 9.62L18.45 13.21L17.74 12.5V9.62L16.27 11.04L15.56 10.33L4.13 21.76L2 19.63Z",dh="M12 4A3.5 3.5 0 0 0 8.5 7.5H10.5A1.5 1.5 0 0 1 12 6A1.5 1.5 0 0 1 13.5 7.5A1.5 1.5 0 0 1 12 9C11.45 9 11 9.45 11 10V11.75L2.4 18.2A1 1 0 0 0 3 20H21A1 1 0 0 0 21.6 18.2L13 11.75V10.85A3.5 3.5 0 0 0 15.5 7.5A3.5 3.5 0 0 0 12 4M12 13.5L18 18H6Z",ch="M12,1C7,1 3,5 3,10V17A3,3 0 0,0 6,20H9V12H5V10A7,7 0 0,1 12,3A7,7 0 0,1 19,10V12H15V20H18A3,3 0 0,0 21,17V10C21,5 16.97,1 12,1Z",ph="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M12.75 7.08C13.57 7.2 14.32 7.5 14.95 8L12.75 10.19V7.08M11.25 7.08V10.19L9.05 8C9.68 7.5 10.43 7.2 11.25 7.08M8 9.05L10.19 11.25H7.08C7.2 10.43 7.5 9.68 8 9.05M7.08 12.75H10.19L8 14.95C7.5 14.32 7.2 13.57 7.08 12.75M11.25 16.92C10.43 16.8 9.68 16.5 9.05 16L11.25 13.81V16.92M12 13C11.45 13 11 12.55 11 12S11.45 11 12 11 13 11.45 13 12 12.55 13 12 13M12.75 16.92V13.81L14.95 16C14.32 16.5 13.57 16.8 12.75 16.92M16 14.95L13.81 12.75H16.92C16.8 13.57 16.5 14.32 16 14.95M13.81 11.25L16 9.05C16.5 9.69 16.8 10.44 16.92 11.25H13.81Z",uh="M19 17C20.21 17 22 16.2 22 14S20.21 11 19 11H17V9H19C21.2 9 22 7.21 22 6C22 3.8 20.21 3 19 3H17V2H16V3H8V2H7V3H2V5H7V7H5C3.79 7 2 7.8 2 10S3.79 13 5 13H7V15H5C3.79 15 2 15.8 2 18S3.79 21 5 21H7V22H8V21H16V22H17V21H22V19H17V17H19M19 13C19.45 13 20 13.19 20 14S19.45 15 19 15H17V13H19M16 11H8V9H16V11M19 5C19.45 5 20 5.2 20 6C20 6.45 19.81 7 19 7H17V5H19M8 5H16V7H8V5M5 11C4.55 11 4 10.81 4 10S4.55 9 5 9H7V11H5M8 13H16V15H8V13M5 19C4.55 19 4 18.81 4 18S4.55 17 5 17H7V19H5M16 19H8V17H16V19Z",hh="M15.07,11.25L14.17,12.17C13.45,12.89 13,13.5 13,15H11V14.5C11,13.39 11.45,12.39 12.17,11.67L13.41,10.41C13.78,10.05 14,9.55 14,9C14,7.89 13.1,7 12,7A2,2 0 0,0 10,9H8A4,4 0 0,1 12,5A4,4 0 0,1 16,9C16,9.88 15.64,10.67 15.07,11.25M13,19H11V17H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z",gh="M13.5,8H12V13L16.28,15.54L17,14.33L13.5,12.25V8M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3",bh="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z",fh="M21.8,13H20V21H13V17.67L15.79,14.88L16.5,15C17.66,15 18.6,14.06 18.6,12.9C18.6,11.74 17.66,10.8 16.5,10.8A2.1,2.1 0 0,0 14.4,12.9L14.5,13.61L13,15.13V9.65C13.66,9.29 14.1,8.6 14.1,7.8A2.1,2.1 0 0,0 12,5.7A2.1,2.1 0 0,0 9.9,7.8C9.9,8.6 10.34,9.29 11,9.65V15.13L9.5,13.61L9.6,12.9A2.1,2.1 0 0,0 7.5,10.8A2.1,2.1 0 0,0 5.4,12.9A2.1,2.1 0 0,0 7.5,15L8.21,14.88L11,17.67V21H4V13H2.25C1.83,13 1.42,13 1.42,12.79C1.43,12.57 1.85,12.15 2.28,11.72L11,3C11.33,2.67 11.67,2.33 12,2.33C12.33,2.33 12.67,2.67 13,3L17,7V6H19V9L21.78,11.78C22.18,12.18 22.59,12.59 22.6,12.8C22.6,13 22.2,13 21.8,13M7.5,12A0.9,0.9 0 0,1 8.4,12.9A0.9,0.9 0 0,1 7.5,13.8A0.9,0.9 0 0,1 6.6,12.9A0.9,0.9 0 0,1 7.5,12M16.5,12C17,12 17.4,12.4 17.4,12.9C17.4,13.4 17,13.8 16.5,13.8A0.9,0.9 0 0,1 15.6,12.9A0.9,0.9 0 0,1 16.5,12M12,6.9C12.5,6.9 12.9,7.3 12.9,7.8C12.9,8.3 12.5,8.7 12,8.7C11.5,8.7 11.1,8.3 11.1,7.8C11.1,7.3 11.5,6.9 12,6.9Z",mh="M7,4A2,2 0 0,1 9,6A2,2 0 0,1 7,8A2,2 0 0,1 5,6A2,2 0 0,1 7,4M11.15,12H22V20A2,2 0 0,1 20,22H4A2,2 0 0,1 2,20V12H5V11.25C5,10 6,9 7.25,9H7.28C7.62,9 7.95,9.09 8.24,9.23C8.5,9.35 8.74,9.5 8.93,9.73L10.33,11.28C10.56,11.54 10.84,11.78 11.15,12M7,20V14H5V20H7M11,20V14H9V20H11M15,20V14H13V20H15M19,20V14H17V20H19M18.65,5.86C19.68,6.86 20.16,8.21 19.95,9.57L19.89,10H18L18.09,9.41C18.24,8.62 18,7.83 17.42,7.21L17.35,7.15C16.32,6.14 15.85,4.79 16.05,3.43L16.11,3H18L17.91,3.59C17.76,4.38 18,5.17 18.58,5.79L18.65,5.86M14.65,5.86C15.68,6.86 16.16,8.21 15.95,9.57L15.89,10H14L14.09,9.41C14.24,8.62 14,7.83 13.42,7.21L13.35,7.15C12.32,6.14 11.85,4.79 12.05,3.43L12.11,3H14L13.91,3.59C13.76,4.38 14,5.17 14.58,5.79L14.65,5.86Z",vh="M8.58 14C8.3 13.55 8.11 13.03 8.06 12.5H15.94C15.89 13.03 15.7 13.55 15.47 14H8.58M12 16C10.97 16 10.08 15.61 9.38 15H14.63C13.92 15.61 13.03 16 12 16M12 8C13.03 8 13.92 8.39 14.63 9H9.38C10.08 8.39 10.97 8 12 8M8.58 10H15.42C15.7 10.45 15.89 10.97 15.94 11.5H8.06C8.11 10.97 8.3 10.45 8.58 10M3 3V21H21V3H3M12 18C8.67 18 6 15.33 6 12S8.67 6 12 6 18 8.67 18 12 15.33 18 12 18Z",yh="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",xh="M21 6C19.34 6 18 7.34 18 9V13C18 13.55 17.55 14 17 14V10C17 8.34 15.66 7 14 7H10C8.34 7 7 8.34 7 10H9C9 9.45 9.45 9 10 9H14C14.55 9 15 9.45 15 10V11H6C3.79 11 2 12.79 2 15V18H17V16C18.66 16 20 14.66 20 13V9C20 8.45 20.45 8 21 8H22V6H21Z",wh="M12.5,3C7.81,3 4,5.69 4,9V9C4,10.19 4.5,11.34 5.44,12.33C4.53,13.5 4,14.96 4,16.5C4,17.64 4,18.83 4,20C4,21.11 4.89,22 6,22H19C20.11,22 21,21.11 21,20C21,18.85 21,17.61 21,16.5C21,15.28 20.66,14.07 20,13L22,11L19,8L16.9,10.1C15.58,9.38 14.05,9 12.5,9C10.65,9 8.95,9.53 7.55,10.41C7.19,9.97 7,9.5 7,9C7,7.21 9.46,5.75 12.5,5.75V5.75C13.93,5.75 15.3,6.08 16.33,6.67L18.35,4.65C16.77,3.59 14.68,3 12.5,3M12.5,11C12.84,11 13.17,11.04 13.5,11.09C10.39,11.57 8,14.25 8,17.5V20H6V17.5A6.5,6.5 0 0,1 12.5,11Z",_h="M7 14C5.9 14 5 13.1 5 12S5.9 10 7 10 9 10.9 9 12 8.1 14 7 14M12.6 10C11.8 7.7 9.6 6 7 6C3.7 6 1 8.7 1 12S3.7 18 7 18C9.6 18 11.8 16.3 12.6 14H16V18H20V14H23V10H12.6Z",$h="M8,2H16L20,14H4L8,2M11,15H13V20H18V22H6V20H11V15Z",kh="M10,2C8.89,2 8,2.89 8,4V7C8,8.11 8.89,9 10,9H11V11H2V13H6V15H5C3.89,15 3,15.89 3,17V20C3,21.11 3.89,22 5,22H9C10.11,22 11,21.11 11,20V17C11,15.89 10.11,15 9,15H8V13H16V15H15C13.89,15 13,15.89 13,17V20C13,21.11 13.89,22 15,22H19C20.11,22 21,21.11 21,20V17C21,15.89 20.11,15 19,15H18V13H22V11H13V9H14C15.11,9 16,8.11 16,7V4C16,2.89 15.11,2 14,2H10M10,4H14V7H10V4M5,17H9V20H5V17M15,17H19V20H15V17Z",Ch="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z",Sh="M2.81,8.46L14.83,20.5L15.54,19.78L16.95,21.19L18.36,19.78L16.95,18.36L18.36,16.95L19.78,18.36L21.19,16.95L19.78,15.54L20.5,14.83L8.46,2.81L2.81,8.46M5.64,8.46L8.46,5.64L17.66,14.83L14.83,17.66L5.64,8.46M7.05,8.46L8.46,9.88L9.88,8.46L8.46,7.05L7.05,8.46M9.17,10.59L10.59,12L12,10.59L10.59,9.17L9.17,10.59M11.29,12.71L12.71,14.12L14.12,12.71L12.71,11.29L11.29,12.71M13.41,14.83L14.83,16.24L16.24,14.83L14.83,13.41L13.41,14.83Z",Mh="M2.95 3L2 6.91L19.34 11.25L20.29 7.34L2.95 3M6.09 6.89L4.16 6.41L4.64 4.46L6.57 4.94L6.09 6.89M9.94 7.86L8 7.38L8.5 5.42L10.42 5.91L9.94 7.86M13.8 8.82L11.87 8.34L12.35 6.39L14.27 6.87L13.8 8.82M17.65 9.79L15.72 9.31L16.2 7.35L18.13 7.84L17.65 9.79M4.66 12.75L3.71 16.66L21.05 21L22 17.1L4.66 12.75M7.8 16.65L5.88 16.16L6.35 14.21L8.28 14.69L7.8 16.65M11.65 17.61L9.73 17.13L10.2 15.18L12.13 15.66L11.65 17.61M15.5 18.58L13.58 18.09L14.06 16.14L16 16.62L15.5 18.58M19.36 19.54L17.43 19.06L17.91 17.11L19.84 17.59L19.36 19.54M6.25 12.11L11 10.2L17.75 11.89L13 13.8L6.25 12.11Z",Ah="M8 6V18H16V6H8M14 10H10V8H14V10M19.4 1.6C19 1.2 18.5 1 18 1H6C5.5 1 5 1.2 4.6 1.6C4.2 2 4 2.5 4 3V21C4 21.5 4.2 22 4.6 22.4C5 22.8 5.5 23 6 23H18C18.5 23 19 22.8 19.4 22.4C19.8 22 20 21.5 20 21V3C20 2.5 19.8 2 19.4 1.6M18 21H6V3H18V21Z",Lh="M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z",Th="M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2M9,21V20H15V21A1,1 0 0,1 14,22H10A1,1 0 0,1 9,21M12,4A5,5 0 0,0 7,9C7,11.05 8.23,12.81 10,13.58V16H14V13.58C15.77,12.81 17,11.05 17,9A5,5 0 0,0 12,4Z",Ph="M11 15H6L13 1V9H18L11 23V15Z",Hh="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z",Vh="M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17Z",zh="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.58L17 17L22 12M4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z",Dh="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",Oh="M12 2C7.04 2 3 6.04 3 11C3 14.91 5.5 18.24 9 19.47V22H11V19.94C11.33 20 11.66 20 12 20S12.67 20 13 19.94V22H15V19.47C18.5 18.23 21 14.9 21 11C21 6.04 16.96 2 12 2M14.25 14L11.25 17L9.75 15.5L11 14.25L9.75 13L12.75 10L14.25 11.5L13 12.75L14.25 14M16 9H8V7H16V9Z",Eh="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z",Ih="M4,5A2,2 0 0,0 2,7V17A2,2 0 0,0 4,19H20A2,2 0 0,0 22,17V7A2,2 0 0,0 20,5H4M4,7H16V17H4V7M19,7A1,1 0 0,1 20,8A1,1 0 0,1 19,9A1,1 0 0,1 18,8A1,1 0 0,1 19,7M13,9V15H15V9H13M19,11A1,1 0 0,1 20,12A1,1 0 0,1 19,13A1,1 0 0,1 18,12A1,1 0 0,1 19,11Z",Fh="M19,13H5V11H19V13Z",Bh="M5,7A2,2 0 0,0 3,9V15A2,2 0 0,0 5,17H8V15H5V9H8V7H5M11,7A2,2 0 0,0 9,9V15A2,2 0 0,0 11,17H13A2,2 0 0,0 15,15V9A2,2 0 0,0 13,7H11M11,9H13V15H11V9M16,10.5V12H19V13.5H17.5A1.5,1.5 0 0,0 16,15V18H20.5V16.5H17.5V15H19A1.5,1.5 0 0,0 20.5,13.5V12A1.5,1.5 0 0,0 19,10.5H16Z",jh="M10,0.2C9,0.2 8.2,1 8.2,2C8.2,3 9,3.8 10,3.8C11,3.8 11.8,3 11.8,2C11.8,1 11,0.2 10,0.2M15.67,1A7.33,7.33 0 0,0 23,8.33V7A6,6 0 0,1 17,1H15.67M18.33,1C18.33,3.58 20.42,5.67 23,5.67V4.33C21.16,4.33 19.67,2.84 19.67,1H18.33M21,1A2,2 0 0,0 23,3V1H21M7.92,4.03C7.75,4.03 7.58,4.06 7.42,4.11L2,5.8V11H3.8V7.33L5.91,6.67L2,22H3.8L6.67,13.89L9,17V22H10.8V15.59L8.31,11.05L9.04,8.18L10.12,10H15V8.2H11.38L9.38,4.87C9.08,4.37 8.54,4.03 7.92,4.03Z",Nh="M17.42,10L13.41,6H9V8H12.59L14.59,10H6.5C4,10 2,12 2,14.5C2,17 4,19 6.5,19C8.72,19 10.56,17.38 10.92,15.27L13.04,14C13,14.17 13,14.33 13,14.5C13,17 15,19 17.5,19C20,19 22,17 22,14.5C22,12 20,10 17.5,10M8.84,15.26C8.5,16.27 7.58,17 6.47,17C5.09,17 3.97,15.88 3.97,14.5C3.97,13.12 5.09,12 6.47,12C7.59,12 8.5,12.74 8.84,13.75H6V15.25L8.84,15.26M17.47,17C16.09,17 14.97,15.88 14.97,14.5C14.97,13.12 16.09,12 17.47,12A2.5,2.5 0 0,1 19.97,14.5A2.5,2.5 0 0,1 17.47,17Z",Rh="M18,4L20,8H17L15,4H13L15,8H12L10,4H8L10,8H7L5,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V4H18Z",Wh="M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z",Kh="M4,5C2.89,5 2,5.89 2,7V17C2,18.11 2.89,19 4,19H20C21.11,19 22,18.11 22,17V7C22,5.89 21.11,5 20,5H4M4.5,7A1,1 0 0,1 5.5,8A1,1 0 0,1 4.5,9A1,1 0 0,1 3.5,8A1,1 0 0,1 4.5,7M7,7H20V17H7V7M8,8V16H11V8H8M12,8V16H15V8H12M16,8V16H19V8H16M9,9H10V10H9V9M13,9H14V10H13V9M17,9H18V10H17V9Z",Zh="M17,3A2,2 0 0,1 19,5V15A2,2 0 0,1 17,17H13V19H14A1,1 0 0,1 15,20H22V22H15A1,1 0 0,1 14,23H10A1,1 0 0,1 9,22H2V20H9A1,1 0 0,1 10,19H11V17H7C5.89,17 5,16.1 5,15V5A2,2 0 0,1 7,3H17Z",Gs="M15 22H13C11.9 22 11 21.1 11 20V15H17V20C17 21.1 16.1 22 15 22M7 14H21L15 9.71V6C15 4.39 13.94 2 11 2S7 4.39 7 6C7 6.45 6.81 7 6 7H5V3H3V12H5V9H6C8.2 9 9 7.21 9 6C9 5.67 9.1 4 11 4C12.83 4 13 5.54 13 6V9.71L7 14Z",qh="M14,19H18V5H14M6,19H10V5H6V19Z",Gh="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z",Uh="M22,14H20V16H14V13H16V11H14V6A2,2 0 0,0 12,4H4V2H2V10H4V8H10V11H8V13H10V18A2,2 0 0,0 12,20H20V22H22",Yh="M8,5.14V19.14L19,12.14L8,5.14Z",Qh="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",Xh="M2,15C3.67,14.25 5.33,13.5 7,13.17V5A3,3 0 0,1 10,2C11.31,2 12.42,2.83 12.83,4H10A1,1 0 0,0 9,5V6H14V5A3,3 0 0,1 17,2C18.31,2 19.42,2.83 19.83,4H17A1,1 0 0,0 16,5V14.94C18,14.62 20,13 22,13V15C19.78,15 17.56,17 15.33,17C13.11,17 10.89,15 8.67,15C6.44,15 4.22,16 2,17V15M14,8H9V10H14V8M14,12H9V13C10.67,13.16 12.33,14.31 14,14.79V12M2,19C4.22,18 6.44,17 8.67,17C10.89,17 13.11,19 15.33,19C17.56,19 19.78,17 22,17V19C19.78,19 17.56,21 15.33,21C13.11,21 10.89,19 8.67,19C6.44,19 4.22,20 2,21V19Z",Jh="M19 19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V12H3V10H21V12H19V19Z",eg="M19 19C19 20.11 18.11 21 17 21H7C5.9 21 5 20.11 5 19V12H3V10H21V12H19M8 1.5C6.15 1.5 4.65 3 4.65 4.85C4.65 6.7 6.15 8.2 8 8.2H9.53C9.92 8.2 10.29 8.3 10.61 8.5H12.63C12.05 7.45 10.86 6.75 9.53 6.75H8C7 6.75 6.15 5.77 6.15 4.75C6.15 3.73 7 3 8 3M12.85 2C12.85 3 12 3.85 11 3.85V5.35C12.92 5.35 14.5 6.7 14.89 8.5H16.42C16.12 6.67 14.96 5.15 13.35 4.38C13.97 3.77 14.35 2.93 14.35 2Z",tg="M8 1.5C6.15 1.5 4.65 3 4.65 4.85C4.65 6.7 6.15 8.2 8 8.2H9.53C9.92 8.2 10.29 8.3 10.61 8.5H12.63C12.05 7.45 10.86 6.75 9.53 6.75H8C7 6.75 6.15 5.77 6.15 4.75C6.15 3.73 7 3 8 3V1.5M12.85 2C12.85 3 12 3.85 11 3.85V5.35C12.92 5.35 14.5 6.7 14.89 8.5H16.42C16.12 6.67 14.96 5.15 13.35 4.38C13.97 3.77 14.35 2.93 14.35 2H12.85M3 10V12H5V19C5 20.11 5.9 21 7 21H17C18.11 21 19 20.11 19 19V12H21V10H3M7 12H17V19H7V12Z",ig="M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13",rg="M16,7V3H14V7H10V3H8V7H8C7,7 6,8 6,9V14.5L9.5,18V21H14.5V18L18,14.5V9C18,8 17,7 16,7Z",ag="M15,15H17V11H15M7,15H9V11H7M11,13H13V9H11M8.83,7H15.2L19,10.8V17H5V10.8M8,5L3,10V19H21V10L16,5H8Z",ng="M7.95,3L6.53,5.19L7.95,7.4H7.94L5.95,10.5L4.22,9.6L5.64,7.39L4.22,5.19L6.22,2.09L7.95,3M13.95,2.89L12.53,5.1L13.95,7.3L13.94,7.31L11.95,10.4L10.22,9.5L11.64,7.3L10.22,5.1L12.22,2L13.95,2.89M20,2.89L18.56,5.1L20,7.3V7.31L18,10.4L16.25,9.5L17.67,7.3L16.25,5.1L18.25,2L20,2.89M2,22V14A2,2 0 0,1 4,12H20A2,2 0 0,1 22,14V22H20V20H4V22H2M6,14A1,1 0 0,0 5,15V17A1,1 0 0,0 6,18A1,1 0 0,0 7,17V15A1,1 0 0,0 6,14M10,14A1,1 0 0,0 9,15V17A1,1 0 0,0 10,18A1,1 0 0,0 11,17V15A1,1 0 0,0 10,14M14,14A1,1 0 0,0 13,15V17A1,1 0 0,0 14,18A1,1 0 0,0 15,17V15A1,1 0 0,0 14,14M18,14A1,1 0 0,0 17,15V17A1,1 0 0,0 18,18A1,1 0 0,0 19,17V15A1,1 0 0,0 18,14Z",og="M20,12H4A2,2 0 0,0 2,14V22H4V20H20V22H22V14A2,2 0 0,0 20,12M7,17A1,1 0 0,1 6,18A1,1 0 0,1 5,17V15A1,1 0 0,1 6,14A1,1 0 0,1 7,15V17M11,17A1,1 0 0,1 10,18A1,1 0 0,1 9,17V15A1,1 0 0,1 10,14A1,1 0 0,1 11,15V17M15,17A1,1 0 0,1 14,18A1,1 0 0,1 13,17V15A1,1 0 0,1 14,14A1,1 0 0,1 15,15V17M19,17A1,1 0 0,1 18,18A1,1 0 0,1 17,17V15A1,1 0 0,1 18,14A1,1 0 0,1 19,15V17Z",sg="M20,6A2,2 0 0,1 22,8V20A2,2 0 0,1 20,22H4A2,2 0 0,1 2,20V8C2,7.15 2.53,6.42 3.28,6.13L15.71,1L16.47,2.83L8.83,6H20M20,8H4V12H16V10H18V12H20V8M7,14A3,3 0 0,0 4,17A3,3 0 0,0 7,20A3,3 0 0,0 10,17A3,3 0 0,0 7,14Z",lg="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z",dg="M20 19V3H4V19H2V21H22V19H20M6 19V13H11V14.8C10.6 15.1 10.2 15.6 10.2 16.2C10.2 17.2 11 18 12 18S13.8 17.2 13.8 16.2C13.8 15.6 13.5 15.1 13 14.8V13H18V19H6Z",cg="M20.2,5.9L21,5.1C19.6,3.7 17.8,3 16,3C14.2,3 12.4,3.7 11,5.1L11.8,5.9C13,4.8 14.5,4.2 16,4.2C17.5,4.2 19,4.8 20.2,5.9M19.3,6.7C18.4,5.8 17.2,5.3 16,5.3C14.8,5.3 13.6,5.8 12.7,6.7L13.5,7.5C14.2,6.8 15.1,6.5 16,6.5C16.9,6.5 17.8,6.8 18.5,7.5L19.3,6.7M19,13H17V9H15V13H5A2,2 0 0,0 3,15V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V15A2,2 0 0,0 19,13M8,18H6V16H8V18M11.5,18H9.5V16H11.5V18M15,18H13V16H15V18Z",pg="M7.82 19H15V18C15 15.79 16.79 14 19 14H19.74L17.84 5.56C17.63 4.65 16.82 4 15.89 4H12V6H15.89L17.29 12.25H17.28C15.12 12.9 13.47 14.73 13.09 17H7.82C7.34 15.66 5.96 14.76 4.4 15.06C3.22 15.29 2.27 16.26 2.05 17.44C1.7 19.34 3.16 21 5 21C6.3 21 7.4 20.16 7.82 19M5 19C4.45 19 4 18.55 4 18S4.45 17 5 17 6 17.45 6 18 5.55 19 5 19M19 15C17.34 15 16 16.34 16 18S17.34 21 19 21 22 19.66 22 18 20.66 15 19 15M19 19C18.45 19 18 18.55 18 18S18.45 17 19 17 20 17.45 20 18 19.55 19 19 19Z",ug="M4,1H20A1,1 0 0,1 21,2V6A1,1 0 0,1 20,7H4A1,1 0 0,1 3,6V2A1,1 0 0,1 4,1M4,9H20A1,1 0 0,1 21,10V14A1,1 0 0,1 20,15H4A1,1 0 0,1 3,14V10A1,1 0 0,1 4,9M4,17H20A1,1 0 0,1 21,18V22A1,1 0 0,1 20,23H4A1,1 0 0,1 3,22V18A1,1 0 0,1 4,17M9,5H10V3H9V5M9,13H10V11H9V13M9,21H10V19H9V21M5,3V5H7V3H5M5,11V13H7V11H5M5,19V21H7V19H5Z",hg="M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z",gg="M11,13H13V16H16V11H18L12,6L6,11H8V16H11V13M12,1L21,5V11C21,16.55 17.16,21.74 12,23C6.84,21.74 3,16.55 3,11V5L12,1Z",bg="M21,14V15C21,16.91 19.93,18.57 18.35,19.41L19,22H17L16.5,20C16.33,20 16.17,20 16,20H8C7.83,20 7.67,20 7.5,20L7,22H5L5.65,19.41C4.07,18.57 3,16.91 3,15V14H2V12H20V5A1,1 0 0,0 19,4C18.5,4 18.12,4.34 18,4.79C18.63,5.33 19,6.13 19,7H13A3,3 0 0,1 16,4C16.06,4 16.11,4 16.17,4C16.58,2.84 17.69,2 19,2A3,3 0 0,1 22,5V14H21V14M19,14H5V15A3,3 0 0,0 8,18H16A3,3 0 0,0 19,15V14Z",fg="M16,18H18V6H16M6,18L14.5,12L6,6V18Z",mg="M6,18V6H8V18H6M9.5,12L18,6V18L9.5,12Z",vg="M12,18A6,6 0 0,0 18,12C18,8.68 15.31,6 12,6C8.68,6 6,8.68 6,12A6,6 0 0,0 12,18M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H19M8,12A4,4 0 0,1 12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12Z",yg="M20.79,13.95L18.46,14.57L16.46,13.44V10.56L18.46,9.43L20.79,10.05L21.31,8.12L19.54,7.65L20,5.88L18.07,5.36L17.45,7.69L15.45,8.82L13,7.38V5.12L14.71,3.41L13.29,2L12,3.29L10.71,2L9.29,3.41L11,5.12V7.38L8.5,8.82L6.5,7.69L5.92,5.36L4,5.88L4.47,7.65L2.7,8.12L3.22,10.05L5.55,9.43L7.55,10.56V13.45L5.55,14.58L3.22,13.96L2.7,15.89L4.47,16.36L4,18.12L5.93,18.64L6.55,16.31L8.55,15.18L11,16.62V18.88L9.29,20.59L10.71,22L12,20.71L13.29,22L14.7,20.59L13,18.88V16.62L15.5,15.17L17.5,16.3L18.12,18.63L20,18.12L19.53,16.35L21.3,15.88L20.79,13.95M9.5,10.56L12,9.11L14.5,10.56V13.44L12,14.89L9.5,13.44V10.56Z",xg="M4,2H20A2,2 0 0,1 22,4V14A2,2 0 0,1 20,16H15V20H18V22H13V16H11V22H6V20H9V16H4A2,2 0 0,1 2,14V4A2,2 0 0,1 4,2M4,4V8H11V4H4M4,14H11V10H4V14M20,14V10H13V14H20M20,4H13V8H20V4Z",wg="M11.45,2V5.55L15,3.77L11.45,2M10.45,8L8,10.46L11.75,11.71L10.45,8M2,11.45L3.77,15L5.55,11.45H2M10,2H2V10C2.57,10.17 3.17,10.25 3.77,10.25C7.35,10.26 10.26,7.35 10.27,3.75C10.26,3.16 10.17,2.57 10,2M17,22V16H14L19,7V13H22L17,22Z",_g="M12,12A3,3 0 0,0 9,15A3,3 0 0,0 12,18A3,3 0 0,0 15,15A3,3 0 0,0 12,12M12,20A5,5 0 0,1 7,15A5,5 0 0,1 12,10A5,5 0 0,1 17,15A5,5 0 0,1 12,20M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8C10.89,8 10,7.1 10,6C10,4.89 10.89,4 12,4M17,2H7C5.89,2 5,2.89 5,4V20A2,2 0 0,0 7,22H17A2,2 0 0,0 19,20V4C19,2.89 18.1,2 17,2Z",$g="M20.07,19.07L18.66,17.66C20.11,16.22 21,14.21 21,12C21,9.78 20.11,7.78 18.66,6.34L20.07,4.93C21.88,6.74 23,9.24 23,12C23,14.76 21.88,17.26 20.07,19.07M17.24,16.24L15.83,14.83C16.55,14.11 17,13.11 17,12C17,10.89 16.55,9.89 15.83,9.17L17.24,7.76C18.33,8.85 19,10.35 19,12C19,13.65 18.33,15.15 17.24,16.24M4,3H12A2,2 0 0,1 14,5V19A2,2 0 0,1 12,21H4A2,2 0 0,1 2,19V5A2,2 0 0,1 4,3M8,5A2,2 0 0,0 6,7A2,2 0 0,0 8,9A2,2 0 0,0 10,7A2,2 0 0,0 8,5M8,11A4,4 0 0,0 4,15A4,4 0 0,0 8,19A4,4 0 0,0 12,15A4,4 0 0,0 8,11M8,13A2,2 0 0,1 10,15A2,2 0 0,1 8,17A2,2 0 0,1 6,15A2,2 0 0,1 8,13Z",kg="M17.9,10.9C14.7,9 9.35,8.8 6.3,9.75C5.8,9.9 5.3,9.6 5.15,9.15C5,8.65 5.3,8.15 5.75,8C9.3,6.95 15.15,7.15 18.85,9.35C19.3,9.6 19.45,10.2 19.2,10.65C18.95,11 18.35,11.15 17.9,10.9M17.8,13.7C17.55,14.05 17.1,14.2 16.75,13.95C14.05,12.3 9.95,11.8 6.8,12.8C6.4,12.9 5.95,12.7 5.85,12.3C5.75,11.9 5.95,11.45 6.35,11.35C10,10.25 14.5,10.8 17.6,12.7C17.9,12.85 18.05,13.35 17.8,13.7M16.6,16.45C16.4,16.75 16.05,16.85 15.75,16.65C13.4,15.2 10.45,14.9 6.95,15.7C6.6,15.8 6.3,15.55 6.2,15.25C6.1,14.9 6.35,14.6 6.65,14.5C10.45,13.65 13.75,14 16.35,15.6C16.7,15.75 16.75,16.15 16.6,16.45M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",Cg="M2,6L7.09,8.55C6.4,9.5 6,10.71 6,12C6,13.29 6.4,14.5 7.09,15.45L2,18V6M6,3H18L15.45,7.09C14.5,6.4 13.29,6 12,6C10.71,6 9.5,6.4 8.55,7.09L6,3M22,6V18L16.91,15.45C17.6,14.5 18,13.29 18,12C18,10.71 17.6,9.5 16.91,8.55L22,6M18,21H6L8.55,16.91C9.5,17.6 10.71,18 12,18C13.29,18 14.5,17.6 15.45,16.91L18,21M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10Z",Sg="M11 7H13V9H11V7M5 22H9V10H5V22M14 11H16V9H14V11M17 10H19V8H17V10M17 5V7H19V5H17M14 8H16V6H14V8M17 13H19V11H17V13M5 7H5.33L6 9H8L8.67 7H9V6H5V7Z",Mg="M18,18H6V6H18V18Z",Ag="M6,14H8L11,17H9L6,14M4,4H5V3A1,1 0 0,1 6,2H10A1,1 0 0,1 11,3V4H13V3A1,1 0 0,1 14,2H18A1,1 0 0,1 19,3V4H20A2,2 0 0,1 22,6V19A2,2 0 0,1 20,21V22H17V21H7V22H4V21A2,2 0 0,1 2,19V6A2,2 0 0,1 4,4M18,7A1,1 0 0,1 19,8A1,1 0 0,1 18,9A1,1 0 0,1 17,8A1,1 0 0,1 18,7M14,7A1,1 0 0,1 15,8A1,1 0 0,1 14,9A1,1 0 0,1 13,8A1,1 0 0,1 14,7M20,6H4V10H20V6M4,19H20V12H4V19M6,7A1,1 0 0,1 7,8A1,1 0 0,1 6,9A1,1 0 0,1 5,8A1,1 0 0,1 6,7M13,14H15L18,17H16L13,14Z",Lg="M12,18A6,6 0 0,1 6,12C6,11 6.25,10.03 6.7,9.2L5.24,7.74C4.46,8.97 4,10.43 4,12A8,8 0 0,0 12,20V23L16,19L12,15M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12C18,13 17.75,13.97 17.3,14.8L18.76,16.26C19.54,15.03 20,13.57 20,12A8,8 0 0,0 12,4Z",Tg="M19,18H5V6H19M21,4H3C1.89,4 1,4.89 1,6V18A2,2 0 0,0 3,20H21A2,2 0 0,0 23,18V6C23,4.89 22.1,4 21,4Z",Pg="M21,17H3V5H21M21,3H3A2,2 0 0,0 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,0 23,17V5A2,2 0 0,0 21,3Z",Us="M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z",Hg="M17 3H21V5H17V3M17 7H21V9H17V7M17 11H21V13H17.75L17 12.1V11M21 15V17H19C19 16.31 18.9 15.63 18.71 15H21M7 3V5H3V3H7M7 7V9H3V7H7M7 11V12.1L6.25 13H3V11H7M3 15H5.29C5.1 15.63 5 16.31 5 17H3V15M15 13V5C15 3.34 13.66 2 12 2S9 3.34 9 5V13C6.79 14.66 6.34 17.79 8 20S12.79 22.66 15 21 17.66 16.21 16 14C15.72 13.62 15.38 13.28 15 13M12 4C12.55 4 13 4.45 13 5V8H11V5C11 4.45 11.45 4 12 4Z",Vg="M16.95,16.95L14.83,14.83C15.55,14.1 16,13.1 16,12C16,11.26 15.79,10.57 15.43,10L17.6,7.81C18.5,9 19,10.43 19,12C19,13.93 18.22,15.68 16.95,16.95M12,5C13.57,5 15,5.5 16.19,6.4L14,8.56C13.43,8.21 12.74,8 12,8A4,4 0 0,0 8,12C8,13.1 8.45,14.1 9.17,14.83L7.05,16.95C5.78,15.68 5,13.93 5,12A7,7 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z",zg="M19.03 7.39L20.45 5.97C20 5.46 19.55 5 19.04 4.56L17.62 6C16.07 4.74 14.12 4 12 4C7.03 4 3 8.03 3 13S7.03 22 12 22C17 22 21 17.97 21 13C21 10.88 20.26 8.93 19.03 7.39M13 14H11V7H13V14M15 1H9V3H15V1Z",Dg="M21 11A2 2 0 0 0 19 9H5A2 2 0 0 0 3 11H2V13H3V20H21V13H22V11M17 15A2 2 0 1 1 19 13A2 2 0 0 1 17 15M18 8H6C6.33 5.75 8.88 4 12 4S17.63 5.75 18 8Z",Ys="M4,5A2,2 0 0,0 2,7V17A2,2 0 0,0 4,19H20A2,2 0 0,0 22,17V7A2,2 0 0,0 20,5H4M4,7H16V17H4V7M19,7A1,1 0 0,1 20,8A1,1 0 0,1 19,9A1,1 0 0,1 18,8A1,1 0 0,1 19,7M6,9V11H14V9H6M19,11A1,1 0 0,1 20,12A1,1 0 0,1 19,13A1,1 0 0,1 18,12A1,1 0 0,1 19,11Z",Og="M17,7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7M17,15A3,3 0 0,1 14,12A3,3 0 0,1 17,9A3,3 0 0,1 20,12A3,3 0 0,1 17,15Z",Eg="M9,22H17V19.5C19.41,17.87 21,15.12 21,12V4A2,2 0 0,0 19,2H15C13.89,2 13,2.9 13,4V12H3C3,15.09 5,18 9,19.5V22M5.29,14H18.71C18.14,15.91 16.77,17.5 15,18.33V20H11V18.33C9,18 5.86,15.91 5.29,14M15,4H19V12H15V4M16,5V8H18V5H16Z",Ig="M21.71 20.29L20.29 21.71A1 1 0 0 1 18.88 21.71L7 9.85A3.81 3.81 0 0 1 6 10A4 4 0 0 1 2.22 4.7L4.76 7.24L5.29 6.71L6.71 5.29L7.24 4.76L4.7 2.22A4 4 0 0 1 10 6A3.81 3.81 0 0 1 9.85 7L21.71 18.88A1 1 0 0 1 21.71 20.29M2.29 18.88A1 1 0 0 0 2.29 20.29L3.71 21.71A1 1 0 0 0 5.12 21.71L10.59 16.25L7.76 13.42M20 2L16 4V6L13.83 8.17L15.83 10.17L18 8H20L22 4Z",Fg="M12,2C8,2 4,2.5 4,6V15.5A3.5,3.5 0 0,0 7.5,19L6,20.5V21H8.23L10.23,19H14L16,21H18V20.5L16.5,19A3.5,3.5 0 0,0 20,15.5V6C20,2.5 16.42,2 12,2M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M11,10H6V6H11V10M13,10V6H18V10H13M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17Z",Bg="M8.28,5.45L6.5,4.55L7.76,2H16.23L17.5,4.55L15.72,5.44L15,4H9L8.28,5.45M18.62,8H14.09L13.3,5H10.7L9.91,8H5.38L4.1,10.55L5.89,11.44L6.62,10H17.38L18.1,11.45L19.89,10.56L18.62,8M17.77,22H15.7L15.46,21.1L12,15.9L8.53,21.1L8.3,22H6.23L9.12,11H11.19L10.83,12.35L12,14.1L13.16,12.35L12.81,11H14.88L17.77,22M11.4,15L10.5,13.65L9.32,18.13L11.4,15M14.68,18.12L13.5,13.64L12.6,15L14.68,18.12Z",jg="M11,21V16.74C10.53,16.91 10.03,17 9.5,17C7,17 5,15 5,12.5C5,11.23 5.5,10.09 6.36,9.27C6.13,8.73 6,8.13 6,7.5C6,5 8,3 10.5,3C12.06,3 13.44,3.8 14.25,5C14.33,5 14.41,5 14.5,5A5.5,5.5 0 0,1 20,10.5A5.5,5.5 0 0,1 14.5,16C14,16 13.5,15.93 13,15.79V21H11Z",Ng="M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M7,4A1,1 0 0,0 6,5A1,1 0 0,0 7,6A1,1 0 0,0 8,5A1,1 0 0,0 7,4M10,4A1,1 0 0,0 9,5A1,1 0 0,0 10,6A1,1 0 0,0 11,5A1,1 0 0,0 10,4M12,8A6,6 0 0,0 6,14A6,6 0 0,0 12,20A6,6 0 0,0 18,14A6,6 0 0,0 12,8M8.11,10.5H10C9.76,11.88 10,12.67 10.58,13.29C11.68,14.36 12.16,15.71 11.89,17.5H10C10.24,16.12 10,15.33 9.42,14.71C8.32,13.64 7.85,12.29 8.11,10.5M12.11,10.5H14C13.76,11.88 14,12.67 14.58,13.29C15.68,14.36 16.16,15.71 15.89,17.5H14C14.24,16.12 14,15.33 13.42,14.71C12.32,13.64 11.85,12.29 12.11,10.5Z",Rg="M12,2A9,9 0 0,1 21,11H13V19A3,3 0 0,1 10,22A3,3 0 0,1 7,19V18H9V19A1,1 0 0,0 10,20A1,1 0 0,0 11,19V11H3A9,9 0 0,1 12,2Z",Wg="M23 20V22H16L16 20H18.46L12 4.61C11.81 4.14 11.5 3.76 11.06 3.46S10.14 3 9.61 3C8.9 3 8.28 3.27 7.76 3.79S7 4.92 7 5.64L7 9H8C10.21 9 12 10.79 12 13V22H8C8.61 21.16 9 20.13 9 19C9 16.24 6.76 14 4 14C3.29 14 2.61 14.15 2 14.42V9H5V5.64C5 4.8 5.23 4 5.63 3.32C6.04 2.62 6.59 2.06 7.3 1.63C8 1.21 8.77 1 9.61 1C10.55 1 11.4 1.26 12.16 1.77S13.5 2.97 13.87 3.81L20.66 20H23M7 19C7 20.66 5.66 22 4 22S1 20.66 1 19 2.34 16 4 16 7 17.34 7 19M5 19C5 18.45 4.55 18 4 18S3 18.45 3 19 3.45 20 4 20 5 19.55 5 19Z",Qs="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z",Kg="M7,9V15H11L16,20V4L11,9H7Z",Zg="M11,4L7,13H19L15,4H11M4,14V22H6V19H14V14H12V17H6V14H4Z",Xs="M14.83,11.17C16.39,12.73 16.39,15.27 14.83,16.83C13.27,18.39 10.73,18.39 9.17,16.83L14.83,11.17M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M7,4A1,1 0 0,0 6,5A1,1 0 0,0 7,6A1,1 0 0,0 8,5A1,1 0 0,0 7,4M10,4A1,1 0 0,0 9,5A1,1 0 0,0 10,6A1,1 0 0,0 11,5A1,1 0 0,0 10,4M12,8A6,6 0 0,0 6,14A6,6 0 0,0 12,20A6,6 0 0,0 18,14A6,6 0 0,0 12,8Z",qg="M12,20A6,6 0 0,1 6,14C6,10 12,3.25 12,3.25C12,3.25 18,10 18,14A6,6 0 0,1 12,20Z",Js="M8 2C6.89 2 6 2.89 6 4V16C6 17.11 6.89 18 8 18H9V20H6V22H9C10.11 22 11 21.11 11 20V18H13V20C13 21.11 13.89 22 15 22H18V20H15V18H16C17.11 18 18 17.11 18 16V4C18 2.89 17.11 2 16 2H8M12 4.97A2 2 0 0 1 14 6.97A2 2 0 0 1 12 8.97A2 2 0 0 1 10 6.97A2 2 0 0 1 12 4.97M10 14.5H14V16H10V14.5Z",el="M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25,1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25,14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13,15.75A1.25,1.25 0 0,1 14.25,14.5Z",Gg="M19,14.5C19,14.5 21,16.67 21,18A2,2 0 0,1 19,20A2,2 0 0,1 17,18C17,16.67 19,14.5 19,14.5M5,18V9A2,2 0 0,1 3,7A2,2 0 0,1 5,5V4A2,2 0 0,1 7,2H9A2,2 0 0,1 11,4V5H19A2,2 0 0,1 21,7V9L21,11A1,1 0 0,1 22,12A1,1 0 0,1 21,13H17A1,1 0 0,1 16,12A1,1 0 0,1 17,11V9H11V18H12A2,2 0 0,1 14,20V22H2V20A2,2 0 0,1 4,18H5Z",Ug="M6,19A5,5 0 0,1 1,14A5,5 0 0,1 6,9C7,6.65 9.3,5 12,5C15.43,5 18.24,7.66 18.5,11.03L19,11A4,4 0 0,1 23,15A4,4 0 0,1 19,19H6M19,13H17V12A5,5 0 0,0 12,7C9.5,7 7.45,8.82 7.06,11.19C6.73,11.07 6.37,11 6,11A3,3 0 0,0 3,14A3,3 0 0,0 6,17H19A2,2 0 0,0 21,15A2,2 0 0,0 19,13Z",Yg="M3,15H13A1,1 0 0,1 14,16A1,1 0 0,1 13,17H3A1,1 0 0,1 2,16A1,1 0 0,1 3,15M16,15H21A1,1 0 0,1 22,16A1,1 0 0,1 21,17H16A1,1 0 0,1 15,16A1,1 0 0,1 16,15M1,12A5,5 0 0,1 6,7C7,4.65 9.3,3 12,3C15.43,3 18.24,5.66 18.5,9.03L19,9C21.19,9 22.97,10.76 23,13H21A2,2 0 0,0 19,11H17V10A5,5 0 0,0 12,5C9.5,5 7.45,6.82 7.06,9.19C6.73,9.07 6.37,9 6,9A3,3 0 0,0 3,12C3,12.35 3.06,12.69 3.17,13H1.1L1,12M3,19H5A1,1 0 0,1 6,20A1,1 0 0,1 5,21H3A1,1 0 0,1 2,20A1,1 0 0,1 3,19M8,19H21A1,1 0 0,1 22,20A1,1 0 0,1 21,21H8A1,1 0 0,1 7,20A1,1 0 0,1 8,19Z",Qg="M6,14A1,1 0 0,1 7,15A1,1 0 0,1 6,16A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H18A1,1 0 0,1 17,15A1,1 0 0,1 18,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14M10,18A2,2 0 0,1 12,20A2,2 0 0,1 10,22A2,2 0 0,1 8,20A2,2 0 0,1 10,18M14.5,16A1.5,1.5 0 0,1 16,17.5A1.5,1.5 0 0,1 14.5,19A1.5,1.5 0 0,1 13,17.5A1.5,1.5 0 0,1 14.5,16M10.5,12A1.5,1.5 0 0,1 12,13.5A1.5,1.5 0 0,1 10.5,15A1.5,1.5 0 0,1 9,13.5A1.5,1.5 0 0,1 10.5,12Z",Xg="M6,16A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H18A1,1 0 0,1 17,15A1,1 0 0,1 18,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14H7A1,1 0 0,1 8,15A1,1 0 0,1 7,16H6M12,11H15L13,15H15L11.25,22L12,17H9.5L12,11Z",Jg="M4.5,13.59C5,13.87 5.14,14.5 4.87,14.96C4.59,15.44 4,15.6 3.5,15.33V15.33C2,14.47 1,12.85 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16A1,1 0 0,1 18,15A1,1 0 0,1 19,14A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11C3,12.11 3.6,13.08 4.5,13.6V13.59M9.5,11H12.5L10.5,15H12.5L8.75,22L9.5,17H7L9.5,11M17.5,18.67C17.5,19.96 16.5,21 15.25,21C14,21 13,19.96 13,18.67C13,17.12 15.25,14.5 15.25,14.5C15.25,14.5 17.5,17.12 17.5,18.67Z",e0="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z",t0="M12.74,5.47C15.1,6.5 16.35,9.03 15.92,11.46C17.19,12.56 18,14.19 18,16V16.17C18.31,16.06 18.65,16 19,16A3,3 0 0,1 22,19A3,3 0 0,1 19,22H6A4,4 0 0,1 2,18A4,4 0 0,1 6,14H6.27C5,12.45 4.6,10.24 5.5,8.26C6.72,5.5 9.97,4.24 12.74,5.47M11.93,7.3C10.16,6.5 8.09,7.31 7.31,9.07C6.85,10.09 6.93,11.22 7.41,12.13C8.5,10.83 10.16,10 12,10C12.7,10 13.38,10.12 14,10.34C13.94,9.06 13.18,7.86 11.93,7.3M13.55,3.64C13,3.4 12.45,3.23 11.88,3.12L14.37,1.82L15.27,4.71C14.76,4.29 14.19,3.93 13.55,3.64M6.09,4.44C5.6,4.79 5.17,5.19 4.8,5.63L4.91,2.82L7.87,3.5C7.25,3.71 6.65,4.03 6.09,4.44M18,9.71C17.91,9.12 17.78,8.55 17.59,8L19.97,9.5L17.92,11.73C18.03,11.08 18.05,10.4 18,9.71M3.04,11.3C3.11,11.9 3.24,12.47 3.43,13L1.06,11.5L3.1,9.28C3,9.93 2.97,10.61 3.04,11.3M19,18H16V16A4,4 0 0,0 12,12A4,4 0 0,0 8,16H6A2,2 0 0,0 4,18A2,2 0 0,0 6,20H19A1,1 0 0,0 20,19A1,1 0 0,0 19,18Z",i0="M12.75,4.47C15.1,5.5 16.35,8.03 15.92,10.46C17.19,11.56 18,13.19 18,15V15.17C18.31,15.06 18.65,15 19,15A3,3 0 0,1 22,18A3,3 0 0,1 19,21H17C17,21 16,21 16,20C16,19 17,19 17,19H19A1,1 0 0,0 20,18A1,1 0 0,0 19,17H16V15A4,4 0 0,0 12,11A4,4 0 0,0 8,15H6A2,2 0 0,0 4,17A2,2 0 0,0 6,19H7C7,19 8,19 8,20C8,21 7,21 7,21H6A4,4 0 0,1 2,17A4,4 0 0,1 6,13H6.27C5,11.45 4.6,9.24 5.5,7.25C6.72,4.5 9.97,3.24 12.75,4.47M11.93,6.3C10.16,5.5 8.09,6.31 7.31,8.07C6.85,9.09 6.93,10.22 7.41,11.13C8.5,9.83 10.16,9 12,9C12.7,9 13.38,9.12 14,9.34C13.94,8.06 13.18,6.86 11.93,6.3M13.55,2.63C13,2.4 12.45,2.23 11.88,2.12L14.37,0.82L15.27,3.71C14.76,3.29 14.19,2.93 13.55,2.63M6.09,3.44C5.6,3.79 5.17,4.19 4.8,4.63L4.91,1.82L7.87,2.5C7.25,2.71 6.65,3.03 6.09,3.44M18,8.71C17.91,8.12 17.78,7.55 17.59,7L19.97,8.5L17.92,10.73C18.03,10.08 18.05,9.4 18,8.71M3.04,10.3C3.11,10.9 3.25,11.47 3.43,12L1.06,10.5L3.1,8.28C3,8.93 2.97,9.61 3.04,10.3M12,18.91C12.59,19.82 13,20.63 13,21A1,1 0 0,1 12,22A1,1 0 0,1 11,21C11,20.63 11.41,19.82 12,18.91M12,15.62C12,15.62 9,19 9,21A3,3 0 0,0 12,24A3,3 0 0,0 15,21C15,19 12,15.62 12,15.62Z",r0="M9,12C9.53,12.14 9.85,12.69 9.71,13.22L8.41,18.05C8.27,18.59 7.72,18.9 7.19,18.76C6.65,18.62 6.34,18.07 6.5,17.54L7.78,12.71C7.92,12.17 8.47,11.86 9,12M13,12C13.53,12.14 13.85,12.69 13.71,13.22L11.64,20.95C11.5,21.5 10.95,21.8 10.41,21.66C9.88,21.5 9.56,20.97 9.7,20.43L11.78,12.71C11.92,12.17 12.47,11.86 13,12M17,12C17.53,12.14 17.85,12.69 17.71,13.22L16.41,18.05C16.27,18.59 15.72,18.9 15.19,18.76C14.65,18.62 14.34,18.07 14.5,17.54L15.78,12.71C15.92,12.17 16.47,11.86 17,12M17,10V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11C3,12.11 3.6,13.08 4.5,13.6V13.59C5,13.87 5.14,14.5 4.87,14.96C4.59,15.43 4,15.6 3.5,15.32V15.33C2,14.47 1,12.85 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12C23,13.5 22.2,14.77 21,15.46V15.46C20.5,15.73 19.91,15.57 19.63,15.09C19.36,14.61 19.5,14 20,13.72V13.73C20.6,13.39 21,12.74 21,12A2,2 0 0,0 19,10H17Z",a0="M6,14.03A1,1 0 0,1 7,15.03C7,15.58 6.55,16.03 6,16.03C3.24,16.03 1,13.79 1,11.03C1,8.27 3.24,6.03 6,6.03C7,3.68 9.3,2.03 12,2.03C15.43,2.03 18.24,4.69 18.5,8.06L19,8.03A4,4 0 0,1 23,12.03C23,14.23 21.21,16.03 19,16.03H18C17.45,16.03 17,15.58 17,15.03C17,14.47 17.45,14.03 18,14.03H19A2,2 0 0,0 21,12.03A2,2 0 0,0 19,10.03H17V9.03C17,6.27 14.76,4.03 12,4.03C9.5,4.03 7.45,5.84 7.06,8.21C6.73,8.09 6.37,8.03 6,8.03A3,3 0 0,0 3,11.03A3,3 0 0,0 6,14.03M12,14.15C12.18,14.39 12.37,14.66 12.56,14.94C13,15.56 14,17.03 14,18C14,19.11 13.1,20 12,20A2,2 0 0,1 10,18C10,17.03 11,15.56 11.44,14.94C11.63,14.66 11.82,14.4 12,14.15M12,11.03L11.5,11.59C11.5,11.59 10.65,12.55 9.79,13.81C8.93,15.06 8,16.56 8,18A4,4 0 0,0 12,22A4,4 0 0,0 16,18C16,16.56 15.07,15.06 14.21,13.81C13.35,12.55 12.5,11.59 12.5,11.59",n0="M6,14A1,1 0 0,1 7,15A1,1 0 0,1 6,16A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H18A1,1 0 0,1 17,15A1,1 0 0,1 18,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14M7.88,18.07L10.07,17.5L8.46,15.88C8.07,15.5 8.07,14.86 8.46,14.46C8.85,14.07 9.5,14.07 9.88,14.46L11.5,16.07L12.07,13.88C12.21,13.34 12.76,13.03 13.29,13.17C13.83,13.31 14.14,13.86 14,14.4L13.41,16.59L15.6,16C16.14,15.86 16.69,16.17 16.83,16.71C16.97,17.24 16.66,17.79 16.12,17.93L13.93,18.5L15.54,20.12C15.93,20.5 15.93,21.15 15.54,21.54C15.15,21.93 14.5,21.93 14.12,21.54L12.5,19.93L11.93,22.12C11.79,22.66 11.24,22.97 10.71,22.83C10.17,22.69 9.86,22.14 10,21.6L10.59,19.41L8.4,20C7.86,20.14 7.31,19.83 7.17,19.29C7.03,18.76 7.34,18.21 7.88,18.07Z",o0="M18.5,18.67C18.5,19.96 17.5,21 16.25,21C15,21 14,19.96 14,18.67C14,17.12 16.25,14.5 16.25,14.5C16.25,14.5 18.5,17.12 18.5,18.67M4,17.36C3.86,16.82 4.18,16.25 4.73,16.11L7,15.5L5.33,13.86C4.93,13.46 4.93,12.81 5.33,12.4C5.73,12 6.4,12 6.79,12.4L8.45,14.05L9.04,11.8C9.18,11.24 9.75,10.92 10.29,11.07C10.85,11.21 11.17,11.78 11,12.33L10.42,14.58L12.67,14C13.22,13.83 13.79,14.15 13.93,14.71C14.08,15.25 13.76,15.82 13.2,15.96L10.95,16.55L12.6,18.21C13,18.6 13,19.27 12.6,19.67C12.2,20.07 11.54,20.07 11.15,19.67L9.5,18L8.89,20.27C8.75,20.83 8.18,21.14 7.64,21C7.08,20.86 6.77,20.29 6.91,19.74L7.5,17.5L5.26,18.09C4.71,18.23 4.14,17.92 4,17.36M1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16A1,1 0 0,1 18,15A1,1 0 0,1 19,14A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11C3,11.85 3.35,12.61 3.91,13.16C4.27,13.55 4.26,14.16 3.88,14.54C3.5,14.93 2.85,14.93 2.47,14.54C1.56,13.63 1,12.38 1,11Z",s0="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z",l0="M4,10A1,1 0 0,1 3,9A1,1 0 0,1 4,8H12A2,2 0 0,0 14,6A2,2 0 0,0 12,4C11.45,4 10.95,4.22 10.59,4.59C10.2,5 9.56,5 9.17,4.59C8.78,4.2 8.78,3.56 9.17,3.17C9.9,2.45 10.9,2 12,2A4,4 0 0,1 16,6A4,4 0 0,1 12,10H4M19,12A1,1 0 0,0 20,11A1,1 0 0,0 19,10C18.72,10 18.47,10.11 18.29,10.29C17.9,10.68 17.27,10.68 16.88,10.29C16.5,9.9 16.5,9.27 16.88,8.88C17.42,8.34 18.17,8 19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14H5A1,1 0 0,1 4,13A1,1 0 0,1 5,12H19M18,18H4A1,1 0 0,1 3,17A1,1 0 0,1 4,16H18A3,3 0 0,1 21,19A3,3 0 0,1 18,22C17.17,22 16.42,21.66 15.88,21.12C15.5,20.73 15.5,20.1 15.88,19.71C16.27,19.32 16.9,19.32 17.29,19.71C17.47,19.89 17.72,20 18,20A1,1 0 0,0 19,19A1,1 0 0,0 18,18Z",d0="M6,6L6.69,6.06C7.32,3.72 9.46,2 12,2A5.5,5.5 0 0,1 17.5,7.5L17.42,8.45C17.88,8.16 18.42,8 19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14H6A4,4 0 0,1 2,10A4,4 0 0,1 6,6M6,8A2,2 0 0,0 4,10A2,2 0 0,0 6,12H19A1,1 0 0,0 20,11A1,1 0 0,0 19,10H15.5V7.5A3.5,3.5 0 0,0 12,4A3.5,3.5 0 0,0 8.5,7.5V8H6M18,18H4A1,1 0 0,1 3,17A1,1 0 0,1 4,16H18A3,3 0 0,1 21,19A3,3 0 0,1 18,22C17.17,22 16.42,21.66 15.88,21.12C15.5,20.73 15.5,20.1 15.88,19.71C16.27,19.32 16.9,19.32 17.29,19.71C17.47,19.89 17.72,20 18,20A1,1 0 0,0 19,19A1,1 0 0,0 18,18Z",c0="M12,21L15.6,16.2C14.6,15.45 13.35,15 12,15C10.65,15 9.4,15.45 8.4,16.2L12,21M12,3C7.95,3 4.21,4.34 1.2,6.6L3,9C5.5,7.12 8.62,6 12,6C15.38,6 18.5,7.12 21,9L22.8,6.6C19.79,4.34 16.05,3 12,3M12,9C9.3,9 6.81,9.89 4.8,11.4L6.6,13.8C8.1,12.67 9.97,12 12,12C14.03,12 15.9,12.67 17.4,13.8L19.2,11.4C17.19,9.89 14.7,9 12,9Z",p0="M13.33,11.67L16.21,14.58C17.62,13.16 16.21,11.75 16.21,11.75L14.72,10.24C14.9,9.86 15,9.44 15,9C15,7.95 14.46,7.03 13.64,6.5L15,2.11C13.09,1.53 12.5,3.44 12.5,3.44L11.69,6.03C10.46,6.16 9.46,7 9.13,8.18L4.67,9.63C5.31,11.53 7.2,10.9 7.2,10.9L9.27,10.23C9.61,10.97 10.23,11.54 11,11.82V19C11,19 9,19 9,21C9,21.5 9,21.81 9,22H15V21C15,21 15,19 13,19V11.82C13.12,11.78 13.23,11.72 13.33,11.67M10.5,9A1.5,1.5 0 0,1 12,7.5A1.5,1.5 0 0,1 13.5,9A1.5,1.5 0 0,1 12,10.5A1.5,1.5 0 0,1 10.5,9Z",u0="M6,11H10V9H14V11H18V4H6V11M18,13H6V20H18V13M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2Z",h0="M6,8H10V6H14V8H18V4H6V8M18,10H6V15H18V10M6,20H18V17H6V20M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2Z",g0="M3 4H21V8H19V20H17V8H7V20H5V8H3V4M8 9H16V11H8V9M8 12H16V14H8V12M8 15H16V17H8V15M8 18H16V20H8V18Z",b0="M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.6,4.7C0.4,7.1 0.9,10.1 2.9,12.1C4.8,14 7.5,14.5 9.8,13.6L18.9,22.7C19.3,23.1 19.9,23.1 20.3,22.7L22.6,20.4C23.1,20 23.1,19.3 22.7,19Z";const Md={fridge:th,"fridge-outline":ih,dishwasher:Bu,"washing-machine":Xs,"tumble-dryer":Ng,stove:Ag,microwave:Ih,"coffee-maker":zu,kettle:wh,toaster:Dg,blender:Bs,"food-processor":Bs,"rice-cooker":eg,"slow-cooker":tg,"pressure-cooker":Jh,"air-fryer":Ys,oven:Ys,"range-hood":Fs,lightbulb:Lh,"lightbulb-outline":Th,lamp:$h,"ceiling-light":Cu,"floor-lamp":Ju,"led-strip":Sh,"led-strip-variant":Mh,"wall-sconce":Zg,chandelier:Mu,"desk-lamp":Fu,spotlight:Cg,"light-switch":Ah,thermometer:Us,thermostat:Vg,radiator:ng,"radiator-disabled":og,"heat-pump":ph,"air-conditioner":G1,fan:Gu,hvac:vh,fire:Yu,snowflake:yg,fireplace:Qu,"heating-coil":uh,"lightning-bolt":Ph,flash:Xu,pencil:Gh,battery:nu,"battery-charging":lu,"battery-50":su,"battery-10":ou,"solar-panel":xg,"solar-power":wg,"meter-electric":Oh,"power-plug":rg,"power-socket":ag,"ev-plug":Ks,"transmission-tower":Bg,"current-ac":Ou,"current-dc":Eu,car:xu,"car-electric":_u,"car-battery":wu,"ev-station":Ks,"ev-plug-type2":Zu,garage:ah,"garage-open":nh,motorcycle:Nh,bicycle:pu,scooter:pg,bus:mu,train:Fg,airplane:Y1,door:ju,"door-open":Nu,lock:Hh,"lock-open":Vh,"shield-home":gg,cctv:ku,camera:yu,"motion-sensor":jh,"alarm-light":X1,bell:du,eye:qu,key:_h,fingerprint:Uu,"shield-check":hg,"window-closed":u0,"window-open":h0,blinds:uu,"blinds-open":hu,curtains:Iu,"roller-shade":dg,"window-shutter":g0,balcony:iu,"door-sliding":Ru,television:Pg,speaker:_g,"speaker-wireless":$g,music:Wh,"volume-high":Qs,cast:Rs,chromecast:Rs,radio:sg,headphones:ch,microphone:Eh,gamepad:rh,movie:Rh,spotify:kg,"router-wireless":cg,wifi:c0,"access-point":Z1,lan:kh,network:Zh,"home-assistant":fh,server:ug,nas:Kh,cloud:Vu,ethernet:Ku,bluetooth:gu,cellphone:Su,tablet:Tg,laptop:Ch,water:qg,"water-percent":el,"water-boiler":Js,"water-pump":Gg,shower:bg,toilet:Eg,faucet:Zs,pipe:Uh,bathtub:au,sink:Zs,"water-heater":Js,pool:Xh,"weather-sunny":s0,"weather-cloudy":Ug,"weather-night":e0,"weather-rainy":a0,"weather-snowy":n0,"weather-windy":l0,"weather-fog":Yg,"weather-lightning":Xg,"weather-lightning-rainy":Jg,"weather-hail":Qg,"weather-partly-cloudy":t0,"weather-partly-rainy":i0,"weather-pouring":r0,"weather-snowy-rainy":o0,"weather-windy-variant":d0,temperature:Us,humidity:el,barometer:qs,"air-filter":Fs,"air-purifier":U1,"smoke-detector":vg,co2:Bh,"wind-turbine":p0,flower:eh,tree:jg,sprinkler:Sg,grass:oh,"garden-light":Gs,"outdoor-lamp":Gs,grill:sh,"hot-tub":mh,umbrella:Rg,"thermometer-lines":Hg,iron:xh,vacuum:Wg,broom:js,mop:js,washing:Xs,basket:ru,hanger:dh,scissors:Du,information:yh,"help-circle":hh,"alert-circle":J1,"checkbox-marked-circle":Tu,check:Lu,close:Hu,minus:Fh,plus:Qh,"arrow-up":tu,"arrow-down":eu,refresh:lg,sync:Lg,"bell-ring":cu,"toggle-switch":Og,power:ig,play:Yh,pause:qh,stop:Mg,"skip-next":fg,"skip-previous":mg,"volume-up":Qs,"volume-down":Kg,"brightness-up":fu,"brightness-down":bu,clock:Pu,timer:zg,alarm:Q1,calendar:vu,"calendar-clock":Ns,schedule:Ns,history:gh,home:bh,cog:Ws,tools:Ig,wrench:b0,hammer:lh,"chart-line":Au,cash:$u,gauge:qs,"dots-vertical":Wu,menu:Dh,settings:Ws,account:q1,logout:zh};function f0(e){return e&&Md[e.replace(/^mdi:/,"")]||""}function Le(e){if(!e)return"";if(e.startsWith("mdi:")){const t=f0(e);return t?s`<svg class="oig-mdi" viewBox="0 0 24 24" aria-hidden="true"><path d=${t}></path></svg>`:B1(e)}return e}var m0=Object.defineProperty,v0=Object.getOwnPropertyDescriptor,Gt=(e,t,i,r)=>{for(var a=r>1?void 0:r?v0(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&m0(t,i,a),a};const Fe=X;let xt=class extends O{constructor(){super(...arguments),this.title="Energetické Toky",this.time="",this.showStatus=!1,this.alertCount=0,this.weatherAvailable=!1,this.weatherCondition="",this.weatherTemp=null}onStatusClick(){this.dispatchEvent(new CustomEvent("status-click",{bubbles:!0}))}onEditClick(){this.dispatchEvent(new CustomEvent("edit-click",{bubbles:!0}))}onResetClick(){this.dispatchEvent(new CustomEvent("reset-click",{bubbles:!0}))}render(){const e=this.alertCount>0?"warning":"ok";return s`
      <h1 class="title">
        <span class="title-icon">${Le("mdi:lightning-bolt")}</span>
        ${this.title}
        ${this.time?s`<span class="time">${this.time}</span>`:null}
      </h1>

      <div class="spacer"></div>

      ${this.showStatus?this.weatherAvailable?s`
          <button class="weather-badge ${this.alertCount>0?"has-warn":""}"
            @click=${this.onStatusClick} title="Počasí a výstrahy">
            <span class="wb-icon">${Le(Ya(this.weatherCondition))}</span>
            <span class="wb-temp">${this.weatherTemp!=null?`${Math.round(this.weatherTemp)} °C`:"—"}</span>
            ${this.alertCount>0?s`
              <span class="wb-warn">${Le("mdi:alert-circle")} ${this.alertCount}</span>
            `:null}
          </button>
        `:s`
          <div class="status-badge ${e}" @click=${this.onStatusClick}>
            ${this.alertCount>0?s`<span class="status-count">${this.alertCount}</span>`:null}
            <span>${this.alertCount>0?"Výstrahy":"OK"}</span>
          </div>
        `:null}

       <div class="actions">
         <button class="action-btn" @click=${this.onEditClick} title="Upravit rozložení dlaždic">
           ${Le("mdi:pencil")}
         </button>
         <button class="action-btn" @click=${this.onResetClick} title="Obnovit rozložení">
           ${Le("mdi:refresh")}
         </button>
       </div>
    `}};xt.styles=z`
    :host {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: ${Fe(d.bgPrimary)};
      border-bottom: 1px solid ${Fe(d.divider)};
      gap: 12px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
      color: ${Fe(d.textPrimary)};
      margin: 0;
    }

    .title-icon { font-size: 20px; color: ${Fe(d.accent)}; display: inline-flex; }
    .oig-mdi { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; display: inline-block; }

    .time {
      font-size: 13px;
      color: ${Fe(d.textSecondary)};
      margin-left: 8px;
    }

    .spacer { flex: 1; }

    /* ── Weather badge (current conditions + optional warning chip) ── */
    .weather-badge {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 4px 10px 4px 8px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid ${Fe(d.divider)};
      background: ${Fe(d.bgSecondary)};
      color: ${Fe(d.textPrimary)};
      transition: background 0.2s, border-color 0.2s;
    }
    .weather-badge:hover { background: ${Fe(d.divider)}; }
    .weather-badge.has-warn { border-color: ${Fe(d.warning)}; }

    .wb-icon { font-size: 18px; display: inline-flex; color: ${Fe(d.accent)}; }
    .wb-temp { font-variant-numeric: tabular-nums; }

    .wb-warn {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      margin-left: 2px;
      padding: 1px 7px 1px 5px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
      background: ${Fe(d.warning)};
      color: #fff;
    }
    .wb-warn .oig-mdi { font-size: 12px; }

    /* Fallback OK/warning pill when no weather entity is configured */
    .status-badge {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 16px;
      font-size: 12px; font-weight: 500; cursor: pointer;
      transition: background 0.2s; color: #fff;
    }
    .status-badge.warning { background: ${Fe(d.warning)}; }
    .status-badge.ok { background: ${Fe(d.success)}; }
    .status-badge:hover { opacity: 0.9; }
    .status-count { background: rgba(255,255,255,0.3); padding: 1px 6px; border-radius: 10px; font-size: 11px; }

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
      color: ${Fe(d.textSecondary)};
      transition: all 0.2s;
      font-size: 18px;
    }

    .action-btn:hover {
      background: ${Fe(d.bgSecondary)};
      color: ${Fe(d.textPrimary)};
    }

    .action-btn.active {
      background: ${Fe(d.accent)};
      color: #fff;
    }
  `;Gt([m({type:String})],xt.prototype,"title",2);Gt([m({type:String})],xt.prototype,"time",2);Gt([m({type:Boolean})],xt.prototype,"showStatus",2);Gt([m({type:Number})],xt.prototype,"alertCount",2);Gt([m({type:Boolean})],xt.prototype,"weatherAvailable",2);Gt([m({type:String})],xt.prototype,"weatherCondition",2);Gt([m({type:Number})],xt.prototype,"weatherTemp",2);xt=Gt([E("oig-header")],xt);function Ad(e,t){let i=null;return function(...r){i!==null&&clearTimeout(i),i=window.setTimeout(()=>{e.apply(this,r),i=null},t)}}var y0=Object.defineProperty,x0=Object.getOwnPropertyDescriptor,la=(e,t,i,r)=>{for(var a=r>1?void 0:r?x0(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&y0(t,i,a),a};const tl="oig_v2_theme";let fi=class extends O{constructor(){super(...arguments),this.mode="auto",this.isDark=!1,this.breakpoint="desktop",this.width=1280,this.mediaQuery=null,this.resizeObserver=null,this.debouncedResize=Ad(this.updateBreakpoint.bind(this),100),this.onMediaChange=e=>{this.mode==="auto"&&(this.isDark=e.matches,this.dispatchEvent(new CustomEvent("theme-changed",{detail:{isDark:this.isDark}})))},this.onThemeChange=()=>{this.detectTheme()}}connectedCallback(){super.connectedCallback(),this.loadTheme(),this.setupMediaQuery(),this.setupResizeObserver(),this.detectTheme(),window.addEventListener("oig-theme-change",this.onThemeChange)}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mediaQuery)==null||e.removeEventListener("change",this.onMediaChange),(t=this.resizeObserver)==null||t.disconnect(),window.removeEventListener("oig-theme-change",this.onThemeChange)}loadTheme(){const e=localStorage.getItem(tl);e&&["light","dark","auto"].includes(e)&&(this.mode=e)}saveTheme(){localStorage.setItem(tl,this.mode)}setupMediaQuery(){this.mediaQuery=window.matchMedia("(prefers-color-scheme: dark)"),this.mediaQuery.addEventListener("change",this.onMediaChange)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(this.debouncedResize),this.resizeObserver.observe(document.documentElement),this.updateBreakpoint()}updateBreakpoint(){this.width=window.innerWidth,this.breakpoint=Ki(this.width)}detectTheme(){this.mode==="auto"?this.isDark=window.matchMedia("(prefers-color-scheme: dark)").matches:this.isDark=this.mode==="dark"}setTheme(e){this.mode=e,this.saveTheme(),this.detectTheme(),this.dispatchEvent(new CustomEvent("theme-changed",{detail:{mode:e,isDark:this.isDark}})),L.info("Theme changed",{mode:e,isDark:this.isDark})}getThemeInfo(){return{mode:this.mode,isDark:this.isDark,breakpoint:this.breakpoint,width:this.width}}render(){return s`
      <slot></slot>
    `}};fi.styles=z`
    :host {
      display: contents;
    }
  `;la([m({type:String})],fi.prototype,"mode",2);la([S()],fi.prototype,"isDark",2);la([S()],fi.prototype,"breakpoint",2);la([S()],fi.prototype,"width",2);fi=la([E("oig-theme-provider")],fi);var w0=Object.defineProperty,_0=Object.getOwnPropertyDescriptor,Ro=(e,t,i,r)=>{for(var a=r>1?void 0:r?_0(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&w0(t,i,a),a};let qr=class extends O{constructor(){super(...arguments),this.tabs=[],this.activeTab=""}onTabClick(e){e!==this.activeTab&&(this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tabId:e},bubbles:!0})))}isActive(e){return this.activeTab===e}render(){return s`
      ${this.tabs.map(e=>s`
        <button 
          class="tab ${this.isActive(e.id)?"active":""}"
          @click=${()=>this.onTabClick(e.id)}
        >
          ${e.icon?s`<span class="tab-icon">${Le(e.icon)}</span>`:null}
          <span>${e.label}</span>
        </button>
      `)}
    `}};qr.styles=z`
    :host {
      display: flex;
      gap: 8px;
      padding: 0 16px;
      background: ${X(d.bgPrimary)};
      border-bottom: 1px solid ${X(d.divider)};
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
      color: ${X(d.textSecondary)};
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab:hover {
      color: ${X(d.textPrimary)};
      background: ${X(d.bgSecondary)};
    }

    .tab.active {
      color: ${X(d.accent)};
      border-bottom-color: ${X(d.accent)};
    }

    .tab-icon {
      font-size: 16px;
      display: inline-flex;
    }

    .oig-mdi { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; display: inline-block; }

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

    /* Landscape kiosk (Google Nest Hub): nižší lišta tabů */
    @media (orientation: landscape) and (max-height: 600px) {
      .tab { padding: 5px 14px; font-size: 13px; }
    }
  `;Ro([m({type:Array})],qr.prototype,"tabs",2);Ro([m({type:String})],qr.prototype,"activeTab",2);qr=Ro([E("oig-tabs")],qr);var $0=Object.defineProperty,k0=Object.getOwnPropertyDescriptor,Wo=(e,t,i,r)=>{for(var a=r>1?void 0:r?k0(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&$0(t,i,a),a};const C0="oig_v2_layout_",oo=X;let Gr=class extends O{constructor(){super(...arguments),this.editable=!1,this.breakpoint="desktop",this.onResize=Ad(()=>{this.breakpoint=Ki(window.innerWidth)},100)}connectedCallback(){super.connectedCallback(),this.breakpoint=Ki(window.innerWidth),window.addEventListener("resize",this.onResize)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("resize",this.onResize)}updated(e){e.has("breakpoint")&&this.setAttribute("breakpoint",this.breakpoint)}resetLayout(){const e=`${C0}${this.breakpoint}`;localStorage.removeItem(e),this.requestUpdate()}render(){return s`<slot></slot>`}};Gr.styles=z`
    :host {
      display: grid;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      background: ${oo(d.bgSecondary)};
    }

    :host([breakpoint='mobile']) { grid-template-columns: 1fr; }
    :host([breakpoint='tablet']) { grid-template-columns: repeat(2, 1fr); }
    :host([breakpoint='desktop']) { grid-template-columns: repeat(3, 1fr); }

    .grid-item {
      position: relative;
      background: ${oo(d.cardBg)};
      border-radius: 8px;
      box-shadow: ${oo(d.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .grid-item.editable { cursor: move; }
    .grid-item.editable:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .grid-item.dragging { opacity: 0.8; transform: scale(1.02); z-index: 100; }

    @media (max-width: 768px) {
      :host { gap: 12px; padding: 12px; }
    }
  `;Wo([m({type:Boolean})],Gr.prototype,"editable",2);Wo([S()],Gr.prototype,"breakpoint",2);Gr=Wo([E("oig-grid")],Gr);const S0={off:"Vypnuto",on:"Zapnuto",limited:"Omezeno",unknown:"?"};function il(e){return S0[e]??e}const Ld=e=>{const t=e.trim();return t?t.endsWith("W")?t:`${t}W`:""};function M0(e){const t=e.isUnavailable;let i;t||e.currentLiveDelivery==="unknown"?i="?":e.currentLiveDelivery==="limited"&&e.currentLiveLimit!==null?i=`Omezeno ${e.currentLiveLimit}W`:i=il(e.currentLiveDelivery);const r=!t&&e.currentLiveDelivery==="limited";let a=null,n=null;!t&&e.currentLiveLimit!==null&&(n=`${e.currentLiveLimit}W`,a=r?"Aktivní limit":"Nastavený limit");let o=null,l=null;return e.pendingDeliveryTarget!==null&&(o=`Ve frontě: ${il(e.pendingDeliveryTarget)}`),e.pendingLimitTarget!==null&&(l=`Ve frontě: limit ${Ld(String(e.pendingLimitTarget))}`),{currentModeText:i,limitLabel:a,limitValue:n,showLimitAsActive:r,isUnavailable:t,isTransitioning:e.isTransitioning,pendingModeText:o,pendingLimitText:l}}function A0(e,t){const i=t.has("box_mode"),r=e.get("box_mode"),a=t.has("grid_mode")||t.has("grid_limit"),n=e.get("grid_limit"),o=e.get("grid_mode");let l=null;if(n){const c=Ld(n);l=c?`→ ${c}`:null}else o&&(l=`→ ${o}`);return{inverterModeChanging:i,inverterModeText:r?`→ ${r}`:null,gridExportChanging:a,gridExportText:l}}var L0=Object.defineProperty,T0=Object.getOwnPropertyDescriptor,Pn=(e,t,i,r)=>{for(var a=r>1?void 0:r?T0(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&L0(t,i,a),a};let Yi=class extends O{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1}get fillHeight(){return Math.max(0,Math.min(100,this.soc))/100*54}get fillY(){return 13+(54-this.fillHeight)}render(){return s`
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
    `}};Yi.styles=z`
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
  `;Pn([m({type:Number})],Yi.prototype,"soc",2);Pn([m({type:Boolean})],Yi.prototype,"charging",2);Pn([m({type:Boolean})],Yi.prototype,"gridCharging",2);Yi=Pn([E("oig-battery-gauge")],Yi);var P0=Object.defineProperty,H0=Object.getOwnPropertyDescriptor,Hn=(e,t,i,r)=>{for(var a=r>1?void 0:r?H0(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&P0(t,i,a),a};let Qi=class extends O{constructor(){super(...arguments),this.power=0,this.percent=0,this.maxPower=5400}get isNight(){return this.percent<2}get level(){return this.percent<2?"night":this.percent<20?"low":this.percent<65?"mid":"high"}get sunColor(){const e=this.level;return e==="low"?"#b0bec5":e==="mid"?"#ffd54f":"#ffb300"}get rayLen(){const e=this.level;return e==="low"?4:e==="mid"?7:10}get rayOpacity(){const e=this.level;return e==="low"?.5:e==="mid"?.8:1}get coreRadius(){const e=this.level;return e==="low"?7:e==="mid"?9:11}renderMoon(){return N`
      <circle cx="24" cy="24" r="20" fill="#3949ab" opacity="0.28"/>
      <g class="moon-body">
        <path d="M24 6 A18 18 0 1 0 24 42 A13 13 0 1 1 24 6Z" fill="#cfd8dc" opacity="0.95"/>
      </g>
      <circle class="star" cx="7" cy="10" r="1.5" fill="#e8eaf6" style="animation-delay:0s"/>
      <circle class="star" cx="41" cy="7" r="1.8" fill="#e8eaf6" style="animation-delay:0.7s"/>
      <circle class="star" cx="5" cy="30" r="1.2" fill="#c5cae9" style="animation-delay:1.4s"/>
      <circle class="star" cx="6" cy="44" r="1.0" fill="#c5cae9" style="animation-delay:2.1s"/>
      <circle class="star" cx="42" cy="39" r="1.3" fill="#e8eaf6" style="animation-delay:2.8s"/>
    `}renderSun(){const i=this.coreRadius,r=i+3,a=r+this.rayLen,n=this.sunColor,o=this.rayOpacity,c=[0,45,90,135,180,225,270,315].map(u=>{const h=u*Math.PI/180,g=24+Math.cos(h)*r,v=24+Math.sin(h)*r,f=24+Math.cos(h)*a,b=24+Math.sin(h)*a;return N`
        <line class="ray"
          x1="${g}" y1="${v}" x2="${f}" y2="${b}"
          stroke="${n}" stroke-width="2.5" opacity="${o}"
        />
      `}),p=this.level==="low";return N`
      <!-- Paprsky obaleny v <g> pro CSS rotaci -->
      <g class="rays-group">
        ${c}
      </g>
      <circle class="sun-core" cx="${24}" cy="${24}" r="${i}" fill="${n}" />
      ${p?N`
        <!-- Jednoduchý obláček -->
        <g class="cloud" opacity="0.85">
          <ellipse cx="30" cy="30" rx="9" ry="6" fill="#90a4ae"/>
          <ellipse cx="24" cy="32" rx="7" ry="5" fill="#90a4ae"/>
          <ellipse cx="36" cy="32" rx="6" ry="4.5" fill="#90a4ae"/>
        </g>
      `:""}
    `}render(){return this.percent>=20?this.classList.add("solar-active"):this.classList.remove("solar-active"),s`
      <svg viewBox="0 0 48 48">
        ${this.isNight?this.renderMoon():this.renderSun()}
      </svg>
    `}};Qi.styles=z`
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
  `;Hn([m({type:Number})],Qi.prototype,"power",2);Hn([m({type:Number})],Qi.prototype,"percent",2);Hn([m({type:Number})],Qi.prototype,"maxPower",2);Qi=Hn([E("oig-solar-icon")],Qi);var V0=Object.defineProperty,z0=Object.getOwnPropertyDescriptor,da=(e,t,i,r)=>{for(var a=r>1?void 0:r?z0(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&V0(t,i,a),a};let mi=class extends O{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1,this.discharging=!1,this._clipId=`batt-clip-${Math.random().toString(36).slice(2)}`}get fillColor(){return this.gridCharging?"#42a5f5":this.soc>50?"#4caf50":this.soc>20?"#ff9800":"#f44336"}get fillHeight(){return Math.max(1,Math.min(100,this.soc)/100*48)}get fillY(){return 14+(48-this.fillHeight)}get stripeColor(){return this.gridCharging?"#90caf9":"#a5d6a7"}render(){const e=this.charging||this.gridCharging,t=this.soc>=25;return s`
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
        ${e?N`
          <rect
            class="charge-stripe active"
            x="4" y="52" width="24" height="8" rx="2"
            fill="${this.stripeColor}"
            clip-path="url(#${this._clipId})"
          />
        `:""}

        <!-- SoC text uvnitř -->
        ${t?N`
          <text class="soc-text" x="16" y="${this.fillY+this.fillHeight/2}">
            ${Math.round(this.soc)}%
          </text>
        `:""}
      </svg>
    `}};mi.styles=z`
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
  `;da([m({type:Number})],mi.prototype,"soc",2);da([m({type:Boolean})],mi.prototype,"charging",2);da([m({type:Boolean})],mi.prototype,"gridCharging",2);da([m({type:Boolean})],mi.prototype,"discharging",2);mi=da([E("oig-battery-icon")],mi);var D0=Object.defineProperty,O0=Object.getOwnPropertyDescriptor,Td=(e,t,i,r)=>{for(var a=r>1?void 0:r?O0(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&D0(t,i,a),a};let sn=class extends O{constructor(){super(...arguments),this.power=0}get mode(){return this.power>50?"importing":this.power<-50?"exporting":"idle"}render(){const e=this.mode;return s`
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
        <path class="sine ${e}" d="${"M 2,28 C 8,28 8,16 14,20 C 20,24 20,32 26,32 C 32,32 32,20 38,20 C 44,20 44,28 46,28"}"/>

        <!-- Šipka směru -->
        ${e!=="idle"?s`
          <path
            class="arrow ${e==="importing"?"import":"export"}"
            d="${e==="importing"?"M 24,10 L 24,4 M 24,4 L 20,8 M 24,4 L 28,8":"M 24,4 L 24,10 M 24,10 L 20,6 M 24,10 L 28,6"}"
          />
        `:""}
      </svg>
    `}};sn.styles=z`
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
  `;Td([m({type:Number})],sn.prototype,"power",2);sn=Td([E("oig-grid-icon")],sn);var E0=Object.defineProperty,I0=Object.getOwnPropertyDescriptor,Vn=(e,t,i,r)=>{for(var a=r>1?void 0:r?I0(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&E0(t,i,a),a};let Xi=class extends O{constructor(){super(...arguments),this.power=0,this.maxPower=1e4,this.boilerActive=!1}get percent(){return Math.min(100,this.power/Math.max(1,this.maxPower)*100)}get fillColor(){const e=this.percent;return e<15?"#546e7a":e<40?"#f06292":e<70?"#e91e63":"#c62828"}get level(){const e=this.percent;return e<15?"low":e<60?"mid":"high"}get windowColor(){const e=this.level;return e==="low"?"#37474f":e==="mid"?"#ffd54f":"#ffb300"}render(){const e=this.percent,t=24,i=22,r=Math.max(1,e/100*t),a=i+(t-r),n=this.level;return s`
      <svg viewBox="0 0 48 48">
        <defs>
          <clipPath id="house-clip">
            <rect x="8" y="${i}" width="32" height="${t}" rx="1"/>
          </clipPath>
        </defs>

        <!-- Střecha (trojúhelník) -->
        <polygon
          class="roof ${n!=="low"?"active":""}"
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
          class="walls ${n!=="low"?"active":""}"
          x="8" y="${i}" width="32" height="${t}" rx="1"
        />

        <!-- Výplň spotřeby -->
        <rect
          class="fill-bar"
          x="8" y="${a}" width="32" height="${r}"
          fill="${this.fillColor}"
          clip-path="url(#house-clip)"
        />

        <!-- Dvě okna -->
        <rect class="window" x="12" y="27" width="8" height="7" rx="1" fill="${this.windowColor}" opacity="${n==="low"?.3:.85}"/>
        <rect class="window" x="28" y="27" width="8" height="7" rx="1" fill="${this.windowColor}" opacity="${n==="low"?.3:.85}"/>

        <!-- Dveře -->
        <rect x="20" y="33" width="8" height="13" rx="1"
          fill="none"
          stroke="var(--primary-text-color, #b0bec5)"
          stroke-width="1.2"
          opacity="0.35"
        />

        <!-- Bojler indikátor (malý plamen vlevo dole) -->
        ${this.boilerActive?N`
          <circle class="boiler-dot" cx="10" cy="43" r="3.5" fill="#ff5722" opacity="0.9"/>
          <text x="10" y="43" text-anchor="middle" dominant-baseline="middle" font-size="5" fill="white">🔥</text>
        `:""}
      </svg>
    `}};Xi.styles=z`
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
  `;Vn([m({type:Number})],Xi.prototype,"power",2);Vn([m({type:Number})],Xi.prototype,"maxPower",2);Vn([m({type:Boolean})],Xi.prototype,"boilerActive",2);Xi=Vn([E("oig-house-icon")],Xi);var F0=Object.defineProperty,B0=Object.getOwnPropertyDescriptor,ca=(e,t,i,r)=>{for(var a=r>1?void 0:r?B0(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&F0(t,i,a),a};let vi=class extends O{constructor(){super(...arguments),this.mode="",this.bypassActive=!1,this.hasAlarm=!1,this.plannerAuto=!1}get modeType(){return this.hasAlarm?"alarm":this.bypassActive?"bypass":this.mode.includes("UPS")?"ups":"normal"}render(){const e=this.modeType;return s`
      <svg viewBox="0 0 48 48">
        <!-- Hlavní box střídače -->
        <rect
          class="box ${e}"
          x="4" y="8" width="40" height="34" rx="5"
        />

        <!-- Sinusoida výstupu -->
        <path class="sine-out ${e}" d="${"M 10,28 C 14,28 14,20 18,22 C 22,24 22,32 26,32 C 30,32 30,20 34,22 C 38,24 38,28 38,28"}"/>

        <!-- UPS blesk -->
        ${e==="ups"?N`
          <path class="ups-bolt active"
            d="M 25,12 L 20,26 L 24,26 L 23,36 L 28,22 L 24,22 Z"
          />
        `:""}

        <!-- Bypass výstraha — trojúhelník nahoře -->
        ${e==="bypass"?N`
          <polygon
            class="warning-triangle active"
            points="24,6 18,16 30,16"
          />
          <text x="24" y="15" text-anchor="middle" dominant-baseline="middle"
            font-size="6" font-weight="bold" fill="#fff">!</text>
        `:""}

        <!-- Alarm kroužek -->
        ${e==="alarm"?N`
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
    `}};vi.styles=z`
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
  `;ca([m({type:String})],vi.prototype,"mode",2);ca([m({type:Boolean})],vi.prototype,"bypassActive",2);ca([m({type:Boolean})],vi.prototype,"hasAlarm",2);ca([m({type:Boolean})],vi.prototype,"plannerAuto",2);vi=ca([E("oig-inverter-icon")],vi);var j0=Object.defineProperty,N0=Object.getOwnPropertyDescriptor,lt=(e,t,i,r)=>{for(var a=r>1?void 0:r?N0(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&j0(t,i,a),a};const ce=X,rl=new URLSearchParams(window.location.search),R0=rl.get("sn")||rl.get("inverter_sn")||"",W0=e=>`sensor.oig_${R0}_${e}`,so="oig_v2_flow_layout_",zt=["solar","battery","inverter","grid","house"],K0={solar:{top:"0%",left:"0%"},house:{top:"0%",left:"65%"},inverter:{top:"35%",left:"35%"},grid:{top:"70%",left:"0%"},battery:{top:"70%",left:"65%"}},Pd="oig_v2_flow_expanded_nodes";function Z0(){try{const e=localStorage.getItem(Pd);if(e)return new Set(JSON.parse(e))}catch{}return new Set(["solar","house"])}function q0(e){try{localStorage.setItem(Pd,JSON.stringify([...e]))}catch{}}function me(e){return()=>J.openEntityDialog(W0(e))}const G0=1e3,ln=3300,Hd=300;function U0(e){const[t,i,r]=e.map(v=>Math.max(0,isFinite(v)?v:0)),a=t+i+r,n=Math.max(t,i,r)-Math.min(t,i,r),o=a<Hd,l=n<=G0,p=Math.max(t,i,r)/ln*100,u=["L1","L2","L3"],h=[t,i,r].findIndex(v=>v>=ln),g=h>=0?u[h]:null;return{spreadW:n,balanced:l,calm:o,worstPct:p,overloadPhase:g}}function Y0(e,t){if(t<Hd)return{leftPct:0,widthPct:0};const i=Math.min(...e),r=Math.max(...e);return{leftPct:i,widthPct:r-i}}let Ye=class extends O{constructor(){super(...arguments),this.data=Eo,this.editMode=!1,this.pendingServices=new Map,this.changingServices=new Set,this.shieldStatus="idle",this.shieldQueueCount=0,this.gridDeliveryState={currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},this.shieldUnsub=null,this.expandedNodes=Z0(),this.gaugeDetailOpen=null,this.customPositions={},this.draggedNodeId=null,this.dragStartX=0,this.dragStartY=0,this.dragStartTop=0,this.dragStartLeft=0,this.onShieldUpdate=e=>{this.pendingServices=e.pendingServices,this.changingServices=e.changingServices,this.shieldStatus=e.status,this.shieldQueueCount=e.queueCount,this.gridDeliveryState=e.gridDeliveryState},this.nodeDims={},this.handleDragStart=e=>{if(!this.editMode)return;e.preventDefault(),e.stopPropagation();const i=e.target.closest(".node");if(!i)return;const r=this.findNodeId(i);if(!r)return;this.draggedNodeId=r,i.classList.add("dragging");const a=i.getBoundingClientRect();this.dragStartX=e.clientX,this.dragStartY=e.clientY,this.dragStartTop=a.top,this.dragStartLeft=a.left},this.handleTouchStart=e=>{if(!this.editMode)return;e.preventDefault();const i=e.target.closest(".node");if(!i)return;const r=this.findNodeId(i);if(!r)return;this.draggedNodeId=r,i.classList.add("dragging");const a=e.touches[0],n=i.getBoundingClientRect();this.dragStartX=a.clientX,this.dragStartY=a.clientY,this.dragStartTop=n.top,this.dragStartLeft=n.left},this.handleDragMove=e=>{!this.draggedNodeId||!this.editMode||(e.preventDefault(),this.updateDragPosition(e.clientX,e.clientY))},this.handleTouchMove=e=>{if(!this.draggedNodeId||!this.editMode)return;e.preventDefault();const t=e.touches[0];this.updateDragPosition(t.clientX,t.clientY)},this.handleDragEnd=e=>{var r;if(!this.draggedNodeId||!this.editMode)return;const t=(r=this.shadowRoot)==null?void 0:r.querySelector(".flow-grid"),i=t==null?void 0:t.querySelector(`.node-${this.draggedNodeId}`);i&&i.classList.remove("dragging"),this.saveLayout(),this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0})),this.draggedNodeId=null},this.handleTouchEnd=e=>{this.handleDragEnd(e)}}connectedCallback(){super.connectedCallback(),this.loadSavedLayout(),this.shieldUnsub=ye.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),this.removeDragListeners(),(e=this.shieldUnsub)==null||e.call(this),this.shieldUnsub=null}updated(e){e.has("editMode")&&(this.editMode?(this.setAttribute("editmode",""),this.loadSavedLayout(),this.requestUpdate(),this.updateComplete.then(()=>this.applySavedPositions())):(this.removeAttribute("editmode"),this.removeDragListeners(),this.clearInlinePositions(),this.updateComplete.then(()=>this.applyCustomPositions()))),!this.editMode&&this.hasCustomLayout&&this.updateComplete.then(()=>this.applyCustomPositions()),this.measureNodes()}measureNodes(){var r;const e=(r=this.shadowRoot)==null?void 0:r.querySelector(".flow-grid");if(!e)return;let t=!1;const i={...this.nodeDims};for(const a of zt){const n=e.querySelector(`.node-${a}`);if(!n)continue;const o=Math.round(n.offsetWidth),l=Math.round(n.offsetHeight);if(o<10||l<10)continue;const c=i[a];(!c||Math.abs(c.w-o)>1||Math.abs(c.h-l)>1)&&(i[a]={w:o,h:l},t=!0)}t&&(this.nodeDims=i)}loadSavedLayout(){const e=Ki(window.innerWidth),t=`${so}${e}`;try{const i=localStorage.getItem(t);i&&(this.customPositions=JSON.parse(i),L.debug("[FlowNode] Loaded layout for "+e))}catch{}}applySavedPositions(){var t;if(!this.editMode)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of zt){const r=this.customPositions[i];if(!r)continue;const a=e.querySelector(`.node-${i}`);a&&(a.style.top=r.top,a.style.left=r.left)}this.initDragListeners()}}clearInlinePositions(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of zt){const r=e.querySelector(`.node-${i}`);r&&(r.style.top="",r.style.left="")}}saveLayout(){const e=Ki(window.innerWidth),t=`${so}${e}`;try{localStorage.setItem(t,JSON.stringify(this.customPositions)),L.debug("[FlowNode] Saved layout for "+e)}catch{}}toggleExpand(e,t){const i=t.target;if(i.closest(".clickable")||i.closest(".indicator")||i.closest(".node-value")||i.closest(".node-subvalue")||i.closest(".gc-plan-btn"))return;const r=new Set(this.expandedNodes);r.has(e)?r.delete(e):r.add(e),this.expandedNodes=r,q0(r)}nodeClass(e,t=""){const i=this.expandedNodes.has(e)?" expanded":"";return`node node-${e}${i}${t?" "+t:""}`}gaugePill(e,t,i,r){const a=this.gaugeDetailOpen===e;return s`
      <button class="ss-pill" style="color:${i};border-color:${i}55"
        @click=${n=>{n.stopPropagation(),this.gaugeDetailOpen=a?null:e}}>${t}</button>
      ${a?s`
        <div class="ss-pop" style="border-color:${i}66"
          @click=${n=>n.stopPropagation()}>${r}</div>`:x}
    `}edgeGauge(e){const t=Math.max(0,Math.min(100,e.pct)),i=Math.max(1.5,Math.min(6,e.width??2.5)),r=e.nodeId?this.nodeDims[e.nodeId]:void 0,a=(r==null?void 0:r.w)??180,n=(r==null?void 0:r.h)??180,o=1.5,l=e.full?0:100-t,c=e.stops.map(([u,h])=>N`<stop offset="${u}" stop-color="${h}"></stop>`),p=e.pulseDur?`--pulse-dur:${e.pulseDur}s`:"";return N`
      <svg class="edge-gauge ${e.pulse?"pulse":""}" viewBox="0 0 ${a} ${n}"
        preserveAspectRatio="none" style=${p}>
        <defs>
          <linearGradient id=${e.id} x1="0" y1="1" x2="0" y2="0">${c}</linearGradient>
        </defs>
        <rect class="edge-track" x=${o} y=${o}
          width=${a-o*2} height=${n-o*2} rx="10.5"></rect>
        <rect class="edge-fill" x=${o} y=${o}
          width=${a-o*2} height=${n-o*2} rx="10.5"
          stroke=${`url(#${e.id})`} stroke-width=${i} pathLength="100"
          stroke-dasharray="100" stroke-dashoffset=${l}></rect>
      </svg>`}edgeGaugeSegments(e){const t=Math.max(1.5,Math.min(6,e.width??3.5)),i=this.nodeDims[e.nodeId],r=(i==null?void 0:i.w)??180,a=(i==null?void 0:i.h)??180,n=1.5,o=10.5,l=e.segments.filter(u=>u.frac>.001);let c=0;const p=l.map(u=>{const h=-c;return c+=u.frac,N`<rect x=${n} y=${n}
        width=${r-n*2} height=${a-n*2} rx=${o}
        fill="none" stroke=${u.color} stroke-width=${t}
        pathLength="100"
        stroke-dasharray="${u.frac} 100"
        stroke-dashoffset="${h}"></rect>`});return N`
      <svg class="edge-gauge" viewBox="0 0 ${r} ${a}" preserveAspectRatio="none">
        <rect class="edge-track" x=${n} y=${n}
          width=${r-n*2} height=${a-n*2} rx=${o}></rect>
        ${p}
      </svg>`}get hasCustomLayout(){return zt.some(e=>{const t=this.customPositions[e];return(t==null?void 0:t.top)!=null&&(t==null?void 0:t.left)!=null})}applyCustomPositions(){var t;if(this.editMode||!this.hasCustomLayout)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of zt){const r=e.querySelector(`.node-${i}`);if(!r)continue;const a=this.customPositions[i]??K0[i];r.style.top=a.top,r.style.left=a.left}}resetLayout(){const e=Ki(window.innerWidth),t=`${so}${e}`;localStorage.removeItem(t),this.customPositions={},this.clearInlinePositions(),this.editMode&&this.requestUpdate(),L.debug("[FlowNode] Reset layout for "+e)}initDragListeners(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of zt){const r=e.querySelector(`.node-${i}`);r&&(r.addEventListener("mousedown",this.handleDragStart),r.addEventListener("touchstart",this.handleTouchStart,{passive:!1}))}document.addEventListener("mousemove",this.handleDragMove),document.addEventListener("mouseup",this.handleDragEnd),document.addEventListener("touchmove",this.handleTouchMove,{passive:!1}),document.addEventListener("touchend",this.handleTouchEnd)}}removeDragListeners(){document.removeEventListener("mousemove",this.handleDragMove),document.removeEventListener("mouseup",this.handleDragEnd),document.removeEventListener("touchmove",this.handleTouchMove),document.removeEventListener("touchend",this.handleTouchEnd)}findNodeId(e){for(const i of zt)if(e.classList.contains(`node-${i}`))return i;const t=e.closest('[class*="node-"]');if(!t)return null;for(const i of zt)if(t.classList.contains(`node-${i}`))return i;return null}updateDragPosition(e,t){var w;if(!this.draggedNodeId)return;const i=(w=this.shadowRoot)==null?void 0:w.querySelector(".flow-grid");if(!i)return;const r=i.querySelector(`.node-${this.draggedNodeId}`);if(!r)return;const a=i.getBoundingClientRect(),n=r.getBoundingClientRect(),o=e-this.dragStartX,l=t-this.dragStartY,c=this.dragStartLeft+o,p=this.dragStartTop+l,u=a.left,h=a.right-n.width,g=a.top,v=a.bottom-n.height,f=Math.max(u,Math.min(h,c)),b=Math.max(g,Math.min(v,p)),$=(f-a.left)/a.width*100,_=(b-a.top)/a.height*100;r.style.left=`${$}%`,r.style.top=`${_}%`,this.customPositions[this.draggedNodeId]={top:`${_}%`,left:`${$}%`},this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0}))}renderSolar(){const e=this.data,t=V=>V>=1e3?`${(V/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(V)} W`,i=e.solarPercent,r=e.solarPower<5,a=r?"linear-gradient(160deg,#1a1f30,#161a28)":Mr.solar,n="transparent",o=e.solarToday/1e3,l=e.solarForecastToday>.1?e.solarForecastToday:o,c=Math.max(0,l-o),p=Math.max(0,o-l),u=p>.05,h=l>0?Math.round(o/l*100):100,g=Math.max(l,o,.1),v=Math.min(100,o/g*100),f=l/g*100,b=e.solarPower/1e3,$=r?"#5c6bc0":i<20?"#ff7043":i<50?"#ffa726":"#ffd54f",_=r?0:i,w=r?"#5a6480":$,C=r?"#9fa8da":$,D=r?"🌙 Noc":`${Math.round(i)} %`,T=u?"linear-gradient(90deg,#ffd54f,#66bb6a)":r?"linear-gradient(90deg,#6b7390,#8a93b5)":"linear-gradient(90deg,#ffd54f,#ffa726)",I=e.solarP1>0||e.solarV1>0,k=e.solarP2>0||e.solarV2>0,P=r?s`0 <small>W</small>`:(()=>{const V=e.solarPower;return V>=1e3?s`${(V/1e3).toFixed(1).replace(".",",")} <small>kW</small>`:s`${Math.round(V)} <small>W</small>`})();return s`
      <div class="${this.nodeClass("solar",r?"sol-night":"")}"
        style="--node-gradient: ${a}; --node-border: ${n};">

        ${this.edgeGauge({id:"gauge-solar",nodeId:"solar",pct:_,stops:[[0,w],[1,w]],width:r?2:2+Math.min(3,b),pulse:!r&&e.solarPower>30,pulseDur:Math.max(.9,2.2-b*.35),full:r})}

        <div class="node-tint" style="background: radial-gradient(120% 70% at 50% 0, ${r?"rgba(57,73,171,0.18)":$+"22"}, transparent 70%)"></div>

        <!-- GAUGE PILL: peak % špičky or 🌙 Noc -->
        ${this.gaugePill("solar",D,C,s`
          <div class="ss-pop-h"><span>Solární výkon</span><b style="color:${C}">${r?"🌙 Noc":`${Math.round(i)} % špičky`}</b></div>
          <div class="gp-r"><span>Aktuální výkon</span><b>${r?"0 W":`${si(e.solarPower)} · ${Math.round(i)} % špičky`}</b></div>
          <div class="gp-r"><span>Vyrobeno</span><b>${o.toFixed(1).replace(".",",")} kWh</b></div>
          <div class="gp-r"><span>Předpověď</span><b>${l.toFixed(1).replace(".",",")} kWh</b></div>
          <div class="gp-r"><span>${u?"Nad plánem":"Ještě vyrobí"}</span><b>${u?`+${p.toFixed(1).replace(".",",")} kWh`:r?"den skončil":c<.05?"splněno":`~${c.toFixed(1).replace(".",",")} kWh`}</b></div>
          <div class="gp-r"><span>Zítra</span><b>${e.solarForecastTomorrow.toFixed(1).replace(".",",")} kWh${e.solarForecastStale?" ⚠":""}</b></div>
        `)}

        <!-- HEADER: animated sun SVG by day / moon SVG at night -->
        <div class="sol-head">
          ${r?N`<svg class="sol-ico" viewBox="0 0 24 24" fill="none" stroke="#9fa8da" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 14.5A8 8 0 1 1 9.5 4 6.2 6.2 0 0 0 20 14.5z" fill="#2a3050"/>
              </svg>`:N`<svg class="sol-ico" viewBox="0 0 24 24" fill="none" stroke="${$}" stroke-width="2" stroke-linecap="round">
                <g class="sol-rays"><path d="M12 1.5v2.5M12 20v2.5M1.5 12h2.5M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8"/></g>
                <circle class="sol-core" cx="12" cy="12" r="4.2" fill="${$}" stroke="none"/>
              </svg>`}
          <span class="sol-cap">SOLÁR</span>
        </div>

        <!-- BIG CURRENT POWER -->
        <div class="sol-power" @click=${me("actual_fv_total")}>
          ${P}
        </div>

        <!-- TINY SUBLINE: dnes X z Y kWh -->
        <div class="sol-sub" @click=${me("dc_in_fv_ad")}>
          dnes ${o.toFixed(1).replace(".",",")} z ${l.toFixed(1).replace(".",",")} kWh
        </div>

        <!-- PRODUCTION BAR: fill = vyrobeno, target tick = plán, přerůstá nad plán -->
        <div class="sol-pbar">
          <div class="sol-pbar-fill" style="width:${v.toFixed(1)}%;background:${T}">
            ${v>=30?`${o.toFixed(1).replace(".",",")} kWh`:""}
          </div>
          ${u?s`<div class="sol-pbar-tick" style="left:${f.toFixed(1)}%" title="Plán ${l.toFixed(1).replace(".",",")} kWh"></div>`:x}
        </div>
        <div class="sol-pbar-lbl">
          <span>vyrobeno ${h} %</span>
          <span>${u?s`<span class="sol-over">+${p.toFixed(1).replace(".",",")} kWh</span>`:r?"den skončil":c<.05?"splněno":`ještě ~${c.toFixed(1).replace(".",",")} kWh`}</span>
        </div>

        <!-- COMPACT STRINGS (always visible, 2-col) -->
        <div class="sol-str">
          <div class="sol-sc ${I?"":"sol-off"}">
            <div class="sol-sh">🔆 String 1</div>
            <div class="sol-sw">${t(e.solarP1)}</div>
            <div class="sol-sd">${Math.round(e.solarV1)} V · ${e.solarI1.toFixed(1).replace(".",",")} A</div>
          </div>
          <div class="sol-sc ${k?"":"sol-off"}">
            <div class="sol-sh">🔆 String 2</div>
            <div class="sol-sw">${t(e.solarP2)}</div>
            <div class="sol-sd">${Math.round(e.solarV2)} V · ${e.solarI2.toFixed(1).replace(".",",")} A</div>
          </div>
        </div>

        <!-- TOMORROW CHIP -->
        <div class="sol-tmr" @click=${me("solar_forecast")}>
          ${N`<svg class="sol-tmr-ico" viewBox="0 0 24 24" fill="none" stroke="#ffd479" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18h18"></path><path d="M7 18a5 5 0 0 1 10 0"></path><path d="M12 5v2M5.6 8.6l1.4 1.4M18.4 8.6l-1.4 1.4M2.5 13h2M19.5 13h2"></path></svg>`}
          Zítra <b>${e.solarForecastTomorrow.toFixed(1).replace(".",",")} kWh</b>
          ${e.solarForecastStale?s`<span title="Předpověď zastaralá">⚠</span>`:x}
        </div>
      </div>
    `}getBalancingIndicator(){const e=this.data,t=e.balancingState;return t!=="charging"&&t!=="holding"&&t!=="completed"?{show:!1,text:"",icon:"",cls:""}:t==="charging"?{show:!0,text:`Nabíjení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⚡",cls:"charging"}:t==="holding"?{show:!0,text:`Držení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⏸️",cls:"holding"}:{show:!0,text:"Dokončeno",icon:"✅",cls:"completed"}}batteryIconDefs(){return N`
      <svg width="0" height="0" style="position:absolute;pointer-events:none"><defs>
        <g id="bt-dn"><path d="M12 4v14M6 12l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g id="bt-up"><path d="M12 20V6M6 12l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g id="bt-bolt"><path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor"/></g>
        <g id="bt-temp"><path d="M12 3a2 2 0 0 1 2 2v8.5a4 4 0 1 1-4 0V5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="2"/></g>
        <g id="bt-amp"><path d="M3 12h4l2-5 4 10 2-5h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g id="bt-clock"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g>
        <g id="bt-heart"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z" fill="currentColor"/></g>
        <g id="bt-sun"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g>
        <g id="bt-plug"><path d="M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0zM12 16v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g id="bt-home"><path d="M3 11l9-8 9 8M5 10v10h14V10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g id="bt-floor"><path d="M4 18h16M12 4v9M8 9l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>
      </defs></svg>`}renderBattery(){const e=this.data,t=this.getBalancingIndicator(),i=e.batteryTemp>35?"bt-hot":e.batteryTemp<10?"bt-cold":"",r=Math.abs(e.batteryPower)/1e3,a=Math.abs(e.batteryPower)>10,n=e.batteryPower>10,o=e.batteryPower<-10,l=n?"Nabíjí":o?"Vybíjí":"Klid",c=n?"bt-chg":o?"bt-dis":"",p=V=>!!V&&/\d/.test(V),h=(n&&p(e.timeToFull)?e.timeToFull:o&&p(e.timeToEmpty)?e.timeToEmpty:"").replace(/ {0,2}hodin[aquy]{0,3}/gi," h").replace(/ {0,2}minut[ay]{0,3}/gi," min").replace(/ {2,}/g," ").trim(),g=Math.round(e.batterySoC),v=g>=66?"rgba(67,160,71,0.13)":g>=33?"rgba(253,216,53,0.10)":"rgba(229,57,53,0.12)",f=g>=66?"#43a047":g>=33?"#fdd835":"#e53935",b=Math.round(e.batteryFloorPct),$=V=>V.toFixed(1).replace(".",","),_=Math.max(0,(e.batterySoC-e.batteryFloorPct)/100)*e.batteryInstalledKwh,w=n?"do plna":o?"do vybití":"stav",C=n||o?h||"…":"klid",D=n?"Za jak dlouho se baterie nabije":o?"Za jak dlouho se baterie vybije při aktuálním odběru":"Baterie se právě nenabíjí ani nevybíjí (FVE pokrývá spotřebu)",T=e.batteryChargeSolar+e.batteryChargeGrid,I=T>0?e.batteryChargeSolar/T*100:0,k=100-I,P=e.batterySoH>=90?"#9fe6a8":e.batterySoH>=75?"#ffcc80":"#ff8a80";return s`
      <div class="${this.nodeClass("battery")}" style="--node-gradient: ${Mr.battery}; --node-border: ${Va.battery};"
        @click=${V=>this.toggleExpand("battery",V)}>

        ${this.batteryIconDefs()}

        ${this.edgeGauge({id:"gauge-battery",nodeId:"battery",pct:e.batterySoC,stops:[[0,"#e53935"],[.45,"#fb8c00"],[.7,"#fdd835"],[1,"#43a047"]],width:2+Math.min(3,r),pulse:a,pulseDur:Math.max(.9,2.2-r*.35)})}

        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 100%, ${v}, transparent 72%)"></div>

        ${this.gaugePill("battery",`${g} %`,f,s`
          <div class="ss-pop-h"><span>Nabití baterie</span><b style="color:${f}">${g} % · ${$(e.batteryUsableKwh)} kWh</b></div>
          <div class="gp-r"><span>Stav</span><b>${l}${a?` ${si(Math.abs(e.batteryPower))}`:""}</b></div>
          ${h?s`<div class="gp-r"><span>${n?"Do plna":"Do vybití"}</span><b>${h}</b></div>`:x}
          <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px"><span>Kapacita</span><b>${$(e.batteryUsableKwh)} / ${$(e.batteryInstalledKwh)} kWh</b></div>
          <div class="gp-r"><span>Do plna chybí</span><b>${$(e.batteryMissingKwh)} kWh</b></div>
          <div class="gp-r"><span>Podlaha</span><b>${b} %</b></div>
          <div class="gp-r"><span>Zdraví (SoH)</span><b style="color:${P}">${Math.round(e.batterySoH)} %</b></div>
          <div class="gp-r"><span>Účinnost</span><b>${e.batteryEfficiency.toFixed(1).replace(".",",")} %</b></div>
          <div class="gp-r"><span>Predikce kapacity</span><b>${$(e.batteryForecastKwh)} kWh</b></div>
          <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px"><span>Nabito dnes / měsíc</span><b>${Vi(e.batteryChargeTotal)} / ${Vi(e.batteryChargeMonth)}</b></div>
          <div class="gp-r"><span>Vybito dnes / měsíc</span><b>${Vi(e.batteryDischargeTotal)} / ${Vi(e.batteryDischargeMonth)}</b></div>
          ${t.show?s`<div class="gp-r"><span>Vyrovnávání</span><b>${t.icon} ${t.text}</b></div>`:x}
        `)}

        <!-- HEADER: battery · BATERIE · SoH badge -->
        <div class="bt-head">
          ${N`<svg class="bt-head-ico" viewBox="0 0 24 24" fill="none" stroke="#cfe0ff" stroke-width="2" stroke-linejoin="round">
            <rect x="4" y="7" width="15" height="10" rx="2"/><path d="M21 10v4"/>
            <rect x="6" y="9.5" width="${Math.max(1,g/100*11).toFixed(1)}" height="5" rx="1" fill="${f}" stroke="none"/>
          </svg>`}
          <span class="bt-cap">BATERIE</span>
          <button class="bt-soh" style="color:${P};border-color:${P}66;background:${P}1f"
            @click=${me("battery_health")} title="Zdraví baterie (SoH)">
            ${N`<svg viewBox="0 0 24 24"><use href="#bt-heart"/></svg>`} ${Math.round(e.batterySoH)} %
          </button>
        </div>

        <!-- HERO: power + direction -->
        <div class="bt-pure">
          <button class="bt-pn" @click=${me("batt_batt_comp_p")}>${this.fmtKwGrid(Math.abs(e.batteryPower))}</button>
          <div class="bt-pd ${c}">
            ${n?s`${N`<svg class="bt-ic" viewBox="0 0 24 24"><use href="#bt-up"/></svg>`} Nabíjí`:o?s`${N`<svg class="bt-ic" viewBox="0 0 24 24"><use href="#bt-dn"/></svg>`} Vybíjí`:"◉ Klid"}
          </div>
        </div>

        <!-- SoC: backup autonomy (hero) + usable kWh above floor + bar -->
        <div class="bt-soc">
          <div class="bt-soctop">
            <div class="bt-aut" title="${D}">
              ${N`<svg class="bt-aut-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><use href="#bt-clock"/></svg>`}
              <div><div class="bt-aut-lbl">${w}</div><div class="bt-aut-v ${!n&&!o?"bt-dis":""}">${C}</div></div>
            </div>
            <button class="bt-use" @click=${me("usable_battery_capacity")}>
              <span class="bt-use-lbl">využitelných</span>
              <span class="bt-use-v">${$(_)} <small>kWh</small></span>
            </button>
          </div>
          <div class="bt-socbar">
            ${b>0?s`<div class="bt-socres" style="width:${b}%"></div>`:x}
            <div class="bt-socfill" style="width:${g}%;background:${f}"></div>
            ${b>0?s`<div class="bt-socfloor" style="left:${b}%" title="Podlaha ${b} %">
              ${N`<svg viewBox="0 0 24 24"><use href="#bt-floor"/></svg>`}</div>`:x}
          </div>
          <div class="bt-socsc"><span>0 %</span>${b>0?s`<span class="bt-fl">podlaha ${b} %</span>`:x}<span>100 %</span></div>
        </div>

        <!-- TODAY: charge (FVE/grid split) · discharge -->
        <div class="bt-today">
          <button class="bt-tc" @click=${me("computed_batt_charge_energy_today")}>
            <div class="bt-tch bt-chg">${N`<svg class="bt-ic" viewBox="0 0 24 24"><use href="#bt-up"/></svg>`} ${$(e.batteryChargeTotal/1e3)} <small>kWh</small></div>
            ${T>0?s`
              <div class="bt-split"><div class="bt-sp-fve" style="width:${I.toFixed(0)}%"></div><div class="bt-sp-grid" style="width:${k.toFixed(0)}%"></div></div>
              <div class="bt-splitleg">
                <span style="color:#ffd54f">${N`<svg viewBox="0 0 24 24"><use href="#bt-sun"/></svg>`} ${$(e.batteryChargeSolar/1e3)}</span>
                <span style="color:#fb8c00">${N`<svg viewBox="0 0 24 24"><use href="#bt-plug"/></svg>`} ${$(e.batteryChargeGrid/1e3)}</span>
              </div>`:x}
          </button>
          <button class="bt-tc" @click=${me("computed_batt_discharge_energy_today")}>
            <div class="bt-tch bt-dis">${N`<svg class="bt-ic" viewBox="0 0 24 24"><use href="#bt-dn"/></svg>`} ${$(e.batteryDischargeTotal/1e3)} <small>kWh</small></div>
            <div class="bt-tc-mid">${N`<svg viewBox="0 0 24 24"><use href="#bt-home"/></svg>`}</div>
          </button>
        </div>

        <!-- METRICS: voltage · current · temperature -->
        <div class="bt-met">
          <button @click=${me("extended_battery_voltage")}>${N`<svg viewBox="0 0 24 24"><use href="#bt-bolt"/></svg>`} ${e.batteryVoltage.toFixed(1).replace(".",",")} V</button>
          <button @click=${me("extended_battery_current")}>${N`<svg viewBox="0 0 24 24"><use href="#bt-amp"/></svg>`} ${Math.abs(e.batteryCurrent).toFixed(1).replace(".",",")} A</button>
          <button class="${i}" @click=${me("extended_battery_temperature")}>${N`<svg viewBox="0 0 24 24"><use href="#bt-temp"/></svg>`} ${e.batteryTemp.toFixed(1).replace(".",",")} °C</button>
        </div>
      </div>
    `}getInverterModeDesc(){const e=this.data.inverterMode;return e.includes("Home 1")?"Max baterie + FVE":e.includes("Home 2")?"Šetří baterii":e.includes("Home 3")?"Priorita nabíjení":e.includes("UPS")?"Vše ze sítě":""}inverterIconDefs(){return N`
      <svg width="0" height="0" style="position:absolute;pointer-events:none"><defs>
        <g id="iv-cog"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM3 12h2M19 12h2M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g>
        <g id="iv-bolt"><path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor"/></g>
        <g id="iv-swap"><path d="M7 7h11l-3-3M17 17H6l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g id="iv-exp"><path d="M4 20h16M12 16V6M8 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g id="iv-bot"><rect x="4" y="8" width="16" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4v4M8.5 13h.01M15.5 13h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></g>
        <g id="iv-bell"><path d="M6 9a6 6 0 0 1 12 0c0 7 2 8 2 8H4s2-1 2-8M10 21a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g id="iv-warn"><path d="M12 3l9 16H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v4M12 17h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></g>
      </defs></svg>`}renderInverter(){const e=this.data,t=ks(e.inverterMode),i=e.bypassStatus.toLowerCase()==="on"||e.bypassStatus==="1",r=A0(this.pendingServices,this.changingServices),a=M0(this.gridDeliveryState),n=e.inverterMode,o=n.includes("UPS")?"#ffa726":n.includes("Home 2")?"#42a5f5":n.includes("Home 3")?"#ba68c8":"#5cc46a",l=e.inverterTemp>=45?"#e53935":e.inverterTemp>=35?"#ffa726":"#43a047",c=Math.max(0,Math.min(100,e.inverterTemp/55*100)),p=i?"#e53935":l,u=e.plannerAutoMode,h=u===!0?"řídí · AUTO":u===!1?"VYPNUTO":"N/A",g=u===!0?"iv-plan-auto":"iv-plan-off",v=e.plannerRecommendedMode?ks(e.plannerRecommendedMode):null,f=!!v&&!!v.text&&v.text!==t.text,b=e.inverterGridMode,$=b==="limited"?this.fmtKwGrid(e.inverterGridLimit):b==="on"?"Zap":b==="off"?"Vyp":"—",_=b==="on"?"iv-ok":b==="limited"?"iv-warn":"iv-off",w=this.getInverterModeDesc(),C=this.shieldStatus==="running"?`Zpracovávám${this.shieldQueueCount>0?` (${this.shieldQueueCount})`:""}`:"Nečinný",D=(k,P,V,Y)=>k===1?P:k>=2&&k<=4?V:Y,T=D(e.notificationsError,"chyba","chyby","chyb"),I=D(e.notificationsUnread,"nepřečtená","nepřečtené","nepřečtených");return s`
      <div class="${this.nodeClass("inverter",r.inverterModeChanging?"mode-changing":"")}" style="--node-gradient: ${Mr.inverter}; --node-border: ${Va.inverter};"
        @click=${k=>this.toggleExpand("inverter",k)}>

        ${this.inverterIconDefs()}

        ${this.edgeGauge({id:"gauge-inverter",nodeId:"inverter",pct:i?100:c,stops:[[0,p],[1,p]],width:i?4:2.5,pulse:i,pulseDur:1.1})}
        <div class="node-tint" style="background: radial-gradient(120% 90% at 50% 0, ${o}22, transparent 72%)"></div>

        ${this.gaugePill("inverter",i?"⚠ BYPASS":`${e.inverterTemp.toFixed(0)} °C`,p,s`
          <div class="ss-pop-h"><span>Střídač</span><b style="color:${o}">${t.text}</b></div>
          <div class="gp-r"><span>Teplota</span><b style="color:${l}">${e.inverterTemp.toFixed(1)} °C</b></div>
          <div class="gp-r"><span>Bypass</span><b style="color:${i?"#ff8a80":"inherit"}">${i?"AKTIVNÍ":"Vypnutý"}</b></div>
          ${w?s`<div class="gp-r"><span>Režim</span><b>${w}</b></div>`:x}
          <div class="gp-r"><span>Dodávka</span><b>${a.currentModeText}${b==="limited"?` · ${this.fmtKwGrid(e.inverterGridLimit)}`:""}</b></div>
          <div class="gp-r"><span>Plánovač</span><b>${h}${f?` · doporučuje ${v.text}`:""}</b></div>
          <div class="gp-r"><span>Shield</span><b>${C}</b></div>
        `)}

        <!-- HEADER: ⚙️ STŘÍDAČ · bypass badge (when active) -->
        <div class="iv-head">
          ${N`<svg class="iv-head-ico" viewBox="0 0 24 24" fill="none" stroke="#cfe0ff" stroke-width="2"><use href="#iv-cog"/></svg>`}
          <span class="iv-cap">STŘÍDAČ</span>
          ${i?s`<span class="iv-bpbadge">${N`<svg viewBox="0 0 24 24"><use href="#iv-warn"/></svg>`} BYPASS</span>`:x}
        </div>

        <!-- HERO: working mode + description -->
        <div class="iv-mode">
          <button class="iv-mn" style="color:${o}" @click=${me("box_prms_mode")}>
            ${r.inverterModeChanging?s`<span class="spinner spinner--small"></span>`:N`<svg class="iv-ic" viewBox="0 0 24 24"><use href="#iv-bolt"/></svg>`}
            ${t.text}
          </button>
          ${w?s`<div class="iv-md">${w}</div>`:x}
          ${r.inverterModeText?s`<div class="pending-text">${r.inverterModeText}</div>`:x}
        </div>

        <!-- PLANNER chip -->
        <div class="iv-plan ${g}">
          ${N`<svg viewBox="0 0 24 24"><use href="#iv-bot"/></svg>`} Plánovač ${h}${f?s`<span class="iv-rec"> · doporučuje ${v.text}</span>`:x}
        </div>

        <!-- STATUS strip: Bypass · Dodávka -->
        <div class="iv-strip">
          <button class="iv-sp" @click=${me("bypass_status")}>
            <div class="iv-spl">${N`<svg viewBox="0 0 24 24"><use href="#iv-swap"/></svg>`} Bypass</div>
            <div class="iv-spv ${i?"iv-bad":"iv-ok"}">${i?"ZAP":"Vyp"}</div>
          </button>
          <button class="iv-sp" @click=${me(b==="limited"?"invertor_prm1_p_max_feed_grid":"invertor_prms_to_grid")}>
            <div class="iv-spl">${N`<svg viewBox="0 0 24 24"><use href="#iv-exp"/></svg>`} Dodávka</div>
            <div class="iv-spv ${_}">${$}</div>
          </button>
        </div>

        <!-- NOTIFICATIONS -->
        <button class="iv-notif ${e.notificationsError>0?"warn":""}" @click=${me("notification_count_unread")}>
          ${e.notificationsError>0?s`${N`<svg viewBox="0 0 24 24"><use href="#iv-warn"/></svg>`} ${e.notificationsError} ${T} · ${e.notificationsUnread} ${I}`:e.notificationsUnread>0?s`${N`<svg viewBox="0 0 24 24"><use href="#iv-bell"/></svg>`} ${e.notificationsUnread} ${I}`:s`${N`<svg viewBox="0 0 24 24"><use href="#iv-bell"/></svg>`} Bez notifikací`}
        </button>

        ${a.pendingModeText?s`
          <div class="pending-overlay"><span class="spinner spinner--small"></span>${a.pendingModeText}</div>
        `:x}
        ${a.pendingLimitText?s`
          <div class="pending-overlay"><span class="spinner spinner--small"></span>${a.pendingLimitText}</div>
        `:x}
      </div>
    `}gridIconDefs(){return N`
      <svg width="0" height="0" style="position:absolute;pointer-events:none">
        <defs>
          <g id="gi-imp">
            <path d="M4 20h16M12 4v10M8 10l4 4 4-4"
              fill="none" stroke="currentColor" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round"/>
          </g>
          <g id="gi-exp">
            <path d="M4 20h16M12 16V6M8 10l4-4 4 4"
              fill="none" stroke="currentColor" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round"/>
          </g>
          <g id="gi-cost">
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M9 12h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
          </g>
          <g id="gi-earn">
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M12 9v6M9 12h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
          </g>
        </defs>
      </svg>`}iImp(){return N`<svg class="gd-ic" viewBox="0 0 24 24"><use href="#gi-imp"/></svg>`}iExp(){return N`<svg class="gd-ic" viewBox="0 0 24 24"><use href="#gi-exp"/></svg>`}fmtKwGrid(e){const t=Math.abs(e);return t>=1e3?`${(t/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(t)} W`}renderGrid(){var La,Ta;const e=this.data,t=[e.gridL1P,e.gridL2P,e.gridL3P],i=t.some(A=>A>10),r=t.some(A=>A<-10),a=i&&r,n=i&&!r,o=r&&!i,l=t.reduce((A,fe)=>A+fe,0),c=Math.abs(l),p=t.filter(A=>A>0).reduce((A,fe)=>A+fe,0),u=t.filter(A=>A<0).reduce((A,fe)=>A+Math.abs(fe),0),h=c/1e3,g=e.gridImportCostToday!==null||e.gridExportEarningsToday!==null,v=e.gridImportCostToday??0,f=e.gridExportEarningsToday??0,b=f-v,$=(e.gridExportEarningsMonth??0)-(e.gridImportCostMonth??0),_=b>=0?"#9fe6a8":"#ff8a80",w=A=>A.toFixed(2).replace(".",","),C=A=>(A>=0?"+":"−")+w(Math.abs(A)),D=25*230*3,T=e.inverterGridLimit>0?e.inverterGridLimit:5e3,I=o?c/T*100:c/D*100,k=A=>A>=1e3?`${(A/1e3).toFixed(1).replace(".",",")}k`:A>=10?`${Math.round(A)}`:A.toFixed(1).replace(".",","),P=A=>{const fe=A<0;return{txt:(fe?"−":"")+k(Math.abs(A)),cls:fe?"gd-col-imp":"gd-col-exp",earn:!fe}},V=A=>{const fe=A<0;return{txt:(fe?"+":"")+k(Math.abs(A)),cls:fe?"gd-col-exp":"gd-col-imp",earn:fe}},Y=P(f),U=P(e.gridExportEarningsMonth??0),Z=V(v),Q=V(e.gridImportCostMonth??0),Se=e.spotPrice<=2?"gd-col-exp":e.spotPrice<=4?"gd-col-warn":"gd-col-imp",re=e.exportPrice>=2?"gd-col-exp":e.exportPrice>=.5?"gd-col-warn":"gd-col-imp",q=207,de=253,F=212,ae=248,M=[{v:e.gridL1V,label:"L1",entity:"ac_in_aci_vr"},{v:e.gridL2V,label:"L2",entity:"ac_in_aci_vs"},{v:e.gridL3V,label:"L3",entity:"ac_in_aci_vt"}],H=M.filter(A=>A.v>0),oe=H.length>0,be=oe?H.reduce((A,fe)=>A+fe.v,0)/H.length:230,dt=oe?Math.min(...H.map(A=>A.v)):230,Jt=oe?Math.max(...H.map(A=>A.v)):230,ei=Math.max((Jt-dt)/2+1.5,2.5),ti=be-ei,Li=be+ei,ya=Li-ti,Bn=A=>A<q||A>de?"crit":A<F||A>ae?"warn":"ok",xa=A=>Math.max(0,Math.min(100,(A-ti)/ya*100));let ii=M.map((A,fe)=>({...A,sev:A.v>0?Bn(A.v):"na",pct:A.v>0?xa(A.v):50,lcls:`l${fe+1}`,below:!1}));const wa=ii.filter(A=>A.v>0).slice().sort((A,fe)=>A.pct-fe.pct),_a=wa.length===3?wa[1].pct:null;ii=ii.map(A=>({...A,below:A.v>0&&_a!==null&&A.pct===_a}));const Ti=A=>A<q||A>de?"rgba(229,57,53,.6)":A<F||A>ae?"rgba(255,167,38,.55)":"rgba(76,175,80,.4)",jn=[q,F,ae,de].filter(A=>A>ti&&A<Li),wr=[`${Ti(ti+.001)} 0%`];for(const A of jn){const fe=xa(A).toFixed(1);wr.push(`${Ti(A-.001)} ${fe}%`,`${Ti(A+.001)} ${fe}%`)}wr.push(`${Ti(Li-.001)} 100%`);const Nn=`linear-gradient(90deg, ${wr.join(", ")})`,ri=e.gridFrequency>0?Math.abs(e.gridFrequency-50):0,Rn=e.gridFrequency>0&&ri>.5,$a=e.gridFrequency>0&&ri>.2,Wn=Rn?"gd-hz crit":$a?"gd-hz warn":"gd-hz",ka=e.currentTariff==="VT"||((La=e.currentTariff)==null?void 0:La.includes("vysoký")),Ca=e.currentTariff==="NT"||((Ta=e.currentTariff)==null?void 0:Ta.includes("nízký")),Sa=ka?"gd-tar vt":Ca?"gd-tar nt":"gd-tar",Kn=ka?"VT":Ca?"NT":e.currentTariff||"--",Zn=Math.max(0,...t.filter(A=>A>0)),Ma=Math.max(0,...t.filter(A=>A<0).map(Math.abs)),Aa=Math.max(50,Zn+Ma),Pi=Ma/Aa*100,qn=s`
      <div class="ss-pop-h"><span>Bilance dnes</span>
        <b style="color:${_}">${C(b)} Kč</b></div>
      <div class="gp-r"><span>Výdělek z dodávky</span><b class="gd-col-exp">${w(f)} Kč</b></div>
      <div class="gp-r"><span>Náklad za odběr</span><b class="gd-col-imp">${w(v)} Kč</b></div>
      ${e.gridImportCostMonth!==null||e.gridExportEarningsMonth!==null?s`
        <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px">
          <span>Bilance měsíc</span><b style="color:${$>=0?"#9fe6a8":"#ff8a80"}">${C($)} Kč</b></div>
      `:x}
      <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px">
        <span>Odběr dnes</span><b class="gd-col-imp">${Vi(e.gridImportToday)}</b></div>
      <div class="gp-r"><span>Dodávka dnes</span><b class="gd-col-exp">${Vi(e.gridExportToday)}</b></div>
      ${oe?s`<div class="gp-r"><span>Napětí fází</span><b>${M.map(A=>A.v>0?A.v.toFixed(0):"–").join(" · ")} V</b></div>`:x}
      <div class="gp-r"><span>Frekvence</span><b>${e.gridFrequency>0?e.gridFrequency.toFixed(2):"–"} Hz</b></div>
    `;return s`
      <div class="${this.nodeClass("grid")}" style="--node-gradient: ${Mr.grid}; --node-border: ${Va.grid};"
        @click=${A=>this.toggleExpand("grid",A)}>

        ${this.gridIconDefs()}

        ${this.edgeGauge({id:"gauge-grid",nodeId:"grid",pct:g?100:I,stops:[[0,_],[1,_]],width:g?3:2+Math.min(3,h),pulse:i||r,pulseDur:Math.max(.9,2.2-h*.35)})}

        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 50%, ${_}22, transparent 72%)"></div>

        ${this.gaugePill("grid",g?`${C(b)} Kč`:`${Math.round(I)} %`,_,qn)}

        <!-- ── HEADER: frequency (left) · SÍŤ · tariff (right) ── -->
        <div class="gd-head" style="margin-top:16px">
          ${e.gridFrequency>0?s`
            <button class="${Wn}" @click=${me("ac_in_aci_f")}>
              ${$a?"⚠":"⚡"} ${e.gridFrequency.toFixed(2)} Hz
            </button>`:x}
          ${N`<svg class="gd-head-ico" viewBox="0 0 24 24" fill="none" stroke="#cfe0ff" stroke-width="2" stroke-linejoin="round">
            <path d="M12 2v20M5 6l7-4 7 4M5 6v5l7 4 7-4V6M5 16l7 4 7-4"/>
          </svg>`}
          <span class="gd-cap">SÍŤ</span>
          <button class="${Sa}" @click=${me("current_tariff")}>
            ${N`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/></svg>`}
            ${Kn}
          </button>
        </div>

        <!-- ── POWER / DIRECTION (3 states) ── -->
        ${a?s`
          <div class="gd-combo">
            <div class="gd-cside gd-col-exp">
              ${this.iExp()} ${this.fmtKwGrid(u)}
            </div>
            <button class="gd-cbal ${l>=0?"gd-col-imp":"gd-col-exp"}" @click=${me("actual_aci_wtotal")}>
              ${l>=0?this.iImp():this.iExp()}
              ${this.fmtKwGrid(c)}
            </button>
            <div class="gd-cside gd-col-imp">
              ${this.iImp()} ${this.fmtKwGrid(p)}
            </div>
          </div>
        `:s`
          <div class="gd-pure">
            <button class="gd-pn" @click=${me("actual_aci_wtotal")}>
              ${this.fmtKwGrid(c)}
            </button>
            <div class="gd-pd ${n?"gd-col-imp":o?"gd-col-exp":""}">
              ${n?s`${this.iImp()} Odběr ze sítě`:o?s`${this.iExp()} Dodávka do sítě`:"◉ Žádný tok"}
            </div>
          </div>
        `}

        <!-- ── MONEY COLUMNS: dodávka (prodej) left · odběr (nákup) right ──
             rate = hero · accumulated dnes (left) · měsíc (right, muted),
             units kept, no text labels (what-is-what is on hover). -->
        ${g?s`
          <div class="gd-cols">
            <div class="gd-col">
              <div class="gd-crate ${re}">${this.iExp()} ${w(e.exportPrice)} <small>Kč/kWh</small></div>
              <button class="gd-cmoney" @click=${me("computed_grid_export_earnings_today")}
                title="dodávka — dnes ${Y.txt} Kč · tento měsíc ${U.txt} Kč">
                <span class="gd-md ${Y.cls}">${Y.txt}<small> Kč</small></span>
                <span class="gd-mm ${U.cls}">${U.txt}<small> Kč</small></span>
              </button>
            </div>
            <div class="gd-col">
              <div class="gd-crate ${Se}">${this.iImp()} ${w(e.spotPrice)} <small>Kč/kWh</small></div>
              <button class="gd-cmoney" @click=${me("computed_grid_import_cost_today")}
                title="odběr — dnes ${Z.txt} Kč · tento měsíc ${Q.txt} Kč">
                <span class="gd-md ${Z.cls}">${Z.txt}<small> Kč</small></span>
                <span class="gd-mm ${Q.cls}">${Q.txt}<small> Kč</small></span>
              </button>
            </div>
          </div>
        `:s`
          <div class="gd-price">
            <button class="gd-chip ${e.exportPrice>=0?"good":"bad"}" @click=${me("export_price_current_15min")}>
              ${this.iExp()} ${w(e.exportPrice)} <small>Kč</small>
            </button>
            <button class="gd-chip ${e.spotPrice<=3?"good":e.spotPrice>5?"bad":"neutral"}" @click=${me("spot_price_current_15min")}>
              ${this.iImp()} ${w(e.spotPrice)} <small>Kč</small>
            </button>
          </div>
        `}

        <!-- ── PHASE BARS: bidirectional, dynamic zero ── -->
        <div class="gd-ph">
          ${["L1","L2","L3"].map((A,fe)=>{const _r=t[fe],$r=Math.abs(_r),ai=Math.min(100,$r/Aa*100),kr=_r>10,Cr=_r<-10;return s`
              <div class="gd-phr">
                <div class="gd-ptr">
                  <div class="gd-zero" style="left:${Pi.toFixed(1)}%"></div>
                  ${Cr?s`
                    <div class="gd-seg l${fe+1}" style="left:${(Pi-ai).toFixed(1)}%;width:${ai.toFixed(1)}%">
                      ${ai>=22?s`${this.fmtKwGrid($r)}`:x}
                    </div>`:x}
                  ${kr?s`
                    <div class="gd-seg l${fe+1}" style="left:${Pi.toFixed(1)}%;width:${ai.toFixed(1)}%">
                      ${ai>=22?s`${this.fmtKwGrid($r)}`:x}
                    </div>`:x}
                </div>
              </div>`})}
        </div>

        <!-- ── VOLTAGE: dynamic-zoom axis · phase-coloured ticks · value on axis
             (outer above, middle below); window bounds sit on the below line at
             the edges so a near-edge value never collides with them. ── -->
        ${oe?s`
          <div class="gd-volt">
            <div class="gd-vband" style="background:${Nn}">
              ${ii.filter(A=>A.v>0).map(A=>s`
                <div class="gd-vtick ${A.lcls}" style="left:${A.pct.toFixed(1)}%"></div>`)}
              ${ii.filter(A=>A.v>0).map(A=>s`
                <button class="gd-vlab ${A.below?"below":"above"} ${A.sev==="ok"?A.lcls:""}"
                  style="left:${A.pct.toFixed(1)}%;${A.sev==="crit"?"color:#ff8a80":A.sev==="warn"?"color:#ffcc80":""}"
                  @click=${me(A.entity)}>${A.v.toFixed(0)}<small> V</small></button>`)}
              <span class="gd-vbound lo">${ti.toFixed(0)} V</span>
              <span class="gd-vbound hi">${Li.toFixed(0)} V</span>
            </div>
          </div>
        `:x}

      </div>
    `}renderHouse(){const e=this.data,t=e.houseTodayWh/1e3,i=e.nonbackupTodayWh/1e3,r=t+i,a=e.housePower+e.nonbackupPower,n=t+e.zalohaPlannedRemainingKwh,o=e.selfSufficiencyTodayPct,l=e.houseTodayWh+e.nonbackupTodayWh,c=l>0?e.srcBatteryTodayKwh*1e3/l*100:0,p=l>0?e.srcFveTodayKwh*1e3/l*100:0,u=l>0?e.srcGridTodayKwh*1e3/l*100:0,h=o>=66?"#43a047":o>=33?"#fdd835":"#e53935",g=`hsl(${Math.round(Math.max(0,Math.min(120,o*1.2)))}, 72%, 46%)`,v=r>0,f=v?r:1,b=v?Math.round(e.srcFveTodayKwh/f*100):0,$=v?Math.round(e.srcBatteryTodayKwh/f*100):0,_=v?Math.max(0,100-b-$):0,w=`Denní soběstačnost ${Math.round(o)} % · FVE ${b} % · Baterie ${$} % · Síť ${_} %`,C=U0([e.houseL1,e.houseL2,e.houseL3]),D=[{z:e.houseL1,n:e.nonbackupL1,ze:"ac_out_aco_pr"},{z:e.houseL2,n:e.nonbackupL2,ze:"ac_out_aco_ps"},{z:e.houseL3,n:e.nonbackupL3,ze:"ac_out_aco_pt"}],T=Math.max(300,...D.map(q=>q.z+q.n)),I=ln/T*100,k=I<=100,P=C.spreadW>=1e3?`${(C.spreadW/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(C.spreadW)} W`,V=D.map(q=>Math.max(0,q.z)/T*100),Y=e.houseL1+e.houseL2+e.houseL3,U=Y0(V,Y),Z=q=>q>=1e3?`${(q/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(q)} W`,Q=26,Se=`Záloha ${si(e.housePower)} · dnes ${t.toFixed(1)} kWh${e.zalohaPlannedRemainingKwh>0?` · plán ${n.toFixed(1)} kWh`:""}`,re=`Nezáloha ${si(e.nonbackupPower)} · dnes ${i.toFixed(1)} kWh`;return s`
      <div class="${this.nodeClass("house")}" style="--node-gradient: ${Mr.house}; --node-border: ${Va.house};"
        @click=${q=>this.toggleExpand("house",q)} title=${w}>

        <!-- MULTI-SEGMENT AURA: battery (green) → FVE (yellow) → grid (red) — UNCHANGED -->
        ${this.edgeGaugeSegments({nodeId:"house",segments:[{frac:c,color:"#43a047"},{frac:p,color:"#ffca28"},{frac:u,color:"#e53935"}],width:3.5})}
        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 100%, ${h}22, transparent 72%)"></div>

        <!-- GAUGE PILL: daily self-sufficiency with kWh popover — UNCHANGED -->
        ${this.gaugePill("house",`${Math.round(o)} %`,g,s`
          <div class="ss-pop-h"><span>Denní soběstačnost</span><b style="color:${g}">${Math.round(o)} %</b></div>
          ${v?s`
            <div class="ss-bar">
              <i style="width:${$}%;background:#43a047"></i>
              <i style="width:${b}%;background:#ffca28"></i>
              <i style="width:${_}%;background:#e53935"></i>
            </div>
            <div class="gp-r"><span>☀️ FVE</span><b>${e.srcFveTodayKwh.toFixed(1)} kWh · ${b} %</b></div>
            <div class="gp-r"><span>🔋 Baterie</span><b>${e.srcBatteryTodayKwh.toFixed(1)} kWh · ${$} %</b></div>
            <div class="gp-r"><span>🔌 Síť</span><b>${e.srcGridTodayKwh.toFixed(1)} kWh · ${_} %</b></div>
            <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px">
              <span>Celkem dnes</span><b>${r.toFixed(1)} kWh</b>
            </div>
          `:s`<div class="gp-r" style="opacity:.6"><span>Žádná spotřeba dnes zatím</span></div>`}
        `)}

        <!-- COMPACT HEADER: SVG house icon · big kW · tiny kWh -->
        <div class="house-head">
          ${N`<svg class="house-ico" viewBox="0 0 24 24" fill="none" stroke="#cfe0ff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 11l9-7 9 7"></path><path d="M5 10v10h14V10"></path></svg>`}
          <span class="house-cap">SPOTŘEBA</span>
        </div>
        <div class="node-value" @click=${me("actual_aco_p")}>${si(a)}</div>
        <div class="node-subvalue" @click=${me("ac_out_en_day")}>${r.toFixed(1).replace(".",",")} kWh</div>

        <!-- COMPACT SPLIT ROW: colored dot + value, tooltip carries detail -->
        <div class="csplit">
          <button class="cs" @click=${me("actual_aco_p")} title=${Se}>
            <span class="cs-top"><span class="d" style="background:#43a047"></span>${si(e.housePower)}</span>
            <span class="cs-day">${t.toFixed(1).replace(".",",")} kWh</span>
          </button>
          <button class="cs" @click=${me("actual_acinb_wtotal")} title=${re}>
            <span class="cs-top"><span class="d" style="background:#fb8c00"></span>${si(e.nonbackupPower)}</span>
            <span class="cs-day">${i.toFixed(1).replace(".",",")} kWh</span>
          </button>
        </div>

        <!-- PHASE GRAPH (phasegraph2 design) -->
        <div class="pg">
          <!-- Spread band = imbalance "thermometer" (no text); red shimmer when unbalanced -->
          ${U.widthPct>0?s`
            <div class="pg-spread ${C.balanced?"balanced":"unbal"}"
              title=${C.balanced?"Fáze vyvážené":`Fáze nevyvážené — rozdíl ${P}`}
              style="left:calc(10px + ${U.leftPct.toFixed(2)}% * (100% - 75px) / 100);width:calc(${U.widthPct.toFixed(2)}% * (100% - 75px) / 100)"></div>`:x}
          <!-- Phase rows: whole bar in the ČSN phase colour (záloha solid,
               nezáloha faded); no L1/L2/L3 text — colour identifies the phase. -->
          ${D.map((q,de)=>{const F=q.z>=ln,ae=q.z+q.n,M=Math.max(0,q.z)/T*100,H=Math.max(0,q.n)/T*100,oe=M>=Q&&q.z>100,be=H>=Q&&q.n>100;return s`
              <div class="pg-row l${de+1}">
                <div class="pg-track">
                  <div class="pg-z ${F?"crit":""}" style="width:${M.toFixed(1)}%">
                    ${oe?Z(q.z):x}
                  </div>
                  ${q.n>0?s`
                    <div class="pg-div"></div>
                    <div class="pg-n" style="width:${H.toFixed(1)}%">
                      ${be?Z(q.n):x}
                    </div>`:x}
                  ${k?s`<div class="pg-lim" style="left:${I.toFixed(1)}%"></div>`:x}
                </div>
                <span class="pg-tot">${Z(ae)}</span>
              </div>`})}
        </div>

      </div>
    `}render(){return s`
      <div class="flow-grid ${this.hasCustomLayout&&!this.editMode?"custom-layout":""}">
        ${this.renderSolar()}
        ${this.renderBattery()}
        ${this.renderInverter()}
        ${this.renderGrid()}
        ${this.renderHouse()}
      </div>
    `}};Ye.styles=z`
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
      /* The edge-gauge is the only ring — a visible card border would read
         as a permanently "full" gauge (caught by user on the solar node). */
      border: 1px solid transparent;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      /* extra bottom padding so the (now larger) bottom pill clears the last row */
      padding: 10px 12px 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: visible;
      /* Uniform width so every tile matches the refactored ones (no content-driven
         width drift). Per-breakpoint widths are set in the media queries below. */
      width: 230px;
      max-width: 100%;
      text-align: center;
    }

    /* Desktop: keep the star layout visually balanced (similar node heights). */
    @media (min-width: 769px) {
      .node { min-height: 206px; }
    }

    /* Edge-gauge: perimeter progress hugging the node border. */
    .node > * { position: relative; z-index: 1; }
    .edge-gauge {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
      border-radius: 12px;
    }
    .edge-track { fill: none; stroke: rgba(255,255,255,0.07); stroke-width: 1.4; }
    .edge-fill {
      fill: none;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.6s ease, stroke-width 0.4s ease;
      filter: drop-shadow(0 0 4px rgba(255,255,255,0.18));
    }
    @keyframes edgePulse { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
    .edge-gauge.pulse .edge-fill {
      animation: edgePulse var(--pulse-dur, 1.8s) ease-in-out infinite;
    }

    /* Faint state tint behind content */
    .node-tint {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      border-radius: 12px;
    }

    /* Header with label left + state right (approved node skin) */
    .node-header--split {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }
    .node-state { font-size: 11px; font-weight: 700; white-space: nowrap; }
    .node-state.st-charge { color: #9fe6a8; }
    .node-state.st-discharge { color: #ffcc80; }
    .node-state.st-idle { color: rgba(255,255,255,0.55); }

    /* Solar: forecast headline ref */
    .nv-sub { font-size: 14px; font-weight: 600; opacity: 0.6; }

    /* ---- Solar V2 compact tile ---- */
    /* Animated sun icon (rays + core) */
    @keyframes sol-spin  { to { transform: rotate(360deg); } }
    @keyframes sol-pulse { 0%,100% { opacity:.85; } 50% { opacity:1; } }
    .sol-rays { transform-origin: 12px 12px; animation: sol-spin 18s linear infinite; }
    .sol-core { filter: drop-shadow(0 0 4px #ffca5a); animation: sol-pulse 2.6s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .sol-rays { animation: none; }
      .sol-core { animation: none; }
    }
    /* Compact header row: icon + SOLÁR caps */
    .sol-head { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 14px; margin-bottom: 2px; }
    .sol-ico  { width: 18px; height: 18px; flex-shrink: 0; }
    .sol-cap  { font-size: 11px; font-weight: 700; letter-spacing: .6px; opacity: .75; }
    /* Big power value */
    .sol-power { text-align: center; font-size: 26px; font-weight: 800; line-height: 1.05; cursor: pointer; }
    .sol-power:hover { text-decoration: underline; }
    .sol-power small { font-size: 13px; opacity: .6; }
    .sol-night .sol-power { color: #aeb9d4; }
    /* Tiny subline: dnes X z Y kWh */
    .sol-sub { text-align: center; font-size: 10px; opacity: .55; margin: 1px 0 8px; cursor: pointer; }
    /* Production bar */
    .sol-pbar { position: relative; height: 14px; background: rgba(255,255,255,.06); border-radius: 7px; overflow: hidden; }
    .sol-pbar-fill { height: 100%; display: flex; align-items: center; padding-left: 7px; font-size: 8.5px; font-weight: 800; color: #3a2600; white-space: nowrap; }
    .sol-night .sol-pbar-fill { color: #dde3f5; }
    .sol-pbar-lbl { display: flex; justify-content: space-between; font-size: 9px; opacity: .6; margin-top: 3px; white-space: nowrap; }
    .sol-pbar-tick { position: absolute; top: -2px; bottom: -2px; width: 2px; background: #fff; box-shadow: 0 0 4px rgba(255,255,255,.7); }
    .sol-over { color: #9fe6a8; font-weight: 800; opacity: 1; }
    /* Compact 2-col strings */
    .sol-str { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: rgba(0,0,0,.18); border-radius: 9px; padding: 7px 8px; margin-top: 10px; }
    .sol-sc { text-align: center; }
    .sol-sc .sol-sh { font-size: 9px; opacity: .55; margin-bottom: 2px; white-space: nowrap; }
    .sol-sc .sol-sw { font-size: 14px; font-weight: 800; color: #ffca5a; white-space: nowrap; }
    .sol-sc .sol-sd { font-size: 9px; opacity: .6; margin-top: 1px; white-space: nowrap; }
    .sol-sc.sol-off .sol-sw { color: #5a6677; }
    /* Tomorrow chip */
    .sol-tmr { display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 9px;
      font-size: 10.5px; background: rgba(255,202,90,.1); border: 1px solid rgba(255,202,90,.3);
      border-radius: 8px; padding: 4px 8px; color: #ffe0a0; cursor: pointer; }
    .sol-tmr b { font-weight: 800; color: #fff; }
    .sol-tmr-ico { width: 14px; height: 14px; flex-shrink: 0; }
    /* Kiosk: hide strings in landscape-kiosk, keep header+power+bar+tomorrow */
    @media (orientation: landscape) and (max-height: 600px) {
      .sol-str { display: none; }
    }

    /* (Phase balance legacy CSS removed — replaced by .pblock/.prow/.pseg/.ptrack system) */

    /* Inverter — clean rows (approved mockup C) */
    .inv-chip {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      border-radius: 6px;
      padding: 2px 9px;
      margin: 4px auto 7px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
    }
    .inv-chip.planner-auto { background: rgba(76,175,80,0.16); border-color: rgba(76,175,80,0.35); color: #bdf0c4; }
    .inv-chip.planner-off { background: rgba(244,67,54,0.14); border-color: rgba(244,67,54,0.3); color: #ff9d93; }
    .inv-rows { text-align: left; }
    .inv-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      padding: 4px 2px;
      border-bottom: 1px dashed rgba(255,255,255,0.1);
    }
    .inv-row:last-child { border-bottom: none; }
    .inv-lab { opacity: 0.62; white-space: nowrap; }
    .inv-val { font-weight: 600; background: none; border: none; color: inherit; cursor: pointer; font-size: 11px; text-align: right; padding: 0; }
    .inv-pill { font-size: 10px; font-weight: 700; border: none; border-radius: 5px; padding: 1px 8px; cursor: pointer; }
    .inv-pill.pill-green { background: rgba(76,175,80,0.2); color: #bdf0c4; }
    .inv-pill.pill-red { background: rgba(244,67,54,0.22); color: #ff9d93; }
    .inv-note {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      width: 100%;
      font-size: 10px;
      background: rgba(120,160,255,0.12);
      border: 1px solid rgba(120,160,255,0.25);
      color: inherit;
      border-radius: 7px;
      padding: 4px 8px;
      margin-top: 7px;
      cursor: pointer;
    }
    .inv-note.warn { background: rgba(244,67,54,0.14); border-color: rgba(244,67,54,0.35); color: #ffb3ab; }

    /* Gauge detail pill + popover (tap-friendly; sits on the bottom edge) */
    .ss-pill {
      position: absolute;
      bottom: -11px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 4;
      font-size: 15px;
      font-weight: 800;
      background: #131f33;
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 11px;
      padding: 3px 13px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    }
    /* House tile: pill sits at the TOP (center-top, approved design) */
    .node-house .ss-pill {
      bottom: auto;
      top: -13px;
      font-size: 15px;
      padding: 3px 13px;
      border-radius: 11px;
    }
    /* House popover drops DOWN from the top pill */
    .node-house .ss-pop { bottom: auto; top: 16px; }
    /* Solar tile: pill sits at the TOP (variant B approved design) */
    .node-solar .ss-pill {
      bottom: auto;
      top: -13px;
      font-size: 15px;
      padding: 3px 13px;
      border-radius: 11px;
    }
    /* Solar popover drops DOWN from the top pill */
    .node-solar .ss-pop { bottom: auto; top: 16px; }
    /* House header: SVG icon + caps label */
    .house-head { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 16px; }
    .house-ico { width: 15px; height: 15px; opacity: .85; }
    .house-cap { font-size: 11px; font-weight: 700; letter-spacing: .6px; opacity: .7; }
    .ss-pop {
      position: absolute;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 6;
      width: 180px;
      background: #0e1828;
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 10px;
      padding: 9px 11px;
      box-shadow: 0 10px 26px rgba(0,0,0,0.55);
      text-align: left;
    }
    .ss-pop-h { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 6px; }
    .ss-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 5px; background: rgba(255,255,255,0.06); }
    .ss-bar i { display: block; }
    .ss-leg { display: flex; justify-content: space-between; font-size: 9px; opacity: 0.85; }
    .gp-r { display: flex; justify-content: space-between; gap: 10px; font-size: 11px; padding: 3px 0; border-bottom: 1px dashed rgba(255,255,255,0.1); }
    .gp-r:last-child { border-bottom: none; }
    .gp-r span { opacity: 0.65; }
    .gp-r b { font-weight: 600; }

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
      color: ${ce(d.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .node-value {
      font-size: 22px;
      font-weight: 700;
      color: ${ce(d.textPrimary)};
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
      color: ${ce(d.textSecondary)};
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
      color: ${ce(d.textSecondary)};
      margin-top: 4px;
    }

    .pending-overlay {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: ${ce(d.accent)};
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 4px;
      padding: 2px 6px;
      margin-top: 4px;
    }

    .current-state-unknown {
      color: ${ce(d.textSecondary)};
      font-style: italic;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid ${ce(d.divider)};
      border-top-color: ${ce(d.accent)};
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
      border-top: 1px solid ${ce(d.divider)};
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

    /* Baterie nemá rozbalovací detail (vše je vždy viditelné) — skrýt mrtvou šipku */
    .node-battery::after {
      display: none;
    }

    /* boiler-section / grid-charging-plan — vždy collapsed */
    .boiler-section,
    .grid-charging-plan {
      max-height: 0;
      overflow: hidden;
      margin: 0;
      padding: 0;
      border: none;
      transition: max-height 0.3s ease;
    }

    .node.expanded .boiler-section,
    .node.expanded .grid-charging-plan {
      max-height: 500px;
      margin-top: 6px;
      padding-top: 6px;
    }

    .node.expanded .boiler-section,
    .node.expanded .grid-charging-plan {
      border-top: 1px dashed ${ce(d.divider)};
    }

    .detail-header {
      font-size: 10px;
      font-weight: 600;
      color: ${ce(d.textSecondary)};
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: ${ce(d.textSecondary)};
      margin-bottom: 2px;
    }

    .detail-row .icon { width: 14px; text-align: center; flex-shrink: 0; }

    .clickable {
      cursor: pointer;
      color: ${ce(d.textPrimary)};
      padding: 0;
      margin: 0;
      background: none;
      border: none;
      font: inherit;
      text-align: left;
    }

    .clickable:hover { text-decoration: underline; }


    .phases {
      display: flex;
      gap: 4px;
      font-size: 11px;
      color: ${ce(d.textSecondary)};
      margin: 4px 0;
      align-items: center;
      justify-content: center;
    }

    .phase-sep { color: ${ce(d.divider)}; }

    .cons-split {
      display: flex;
      height: 5px;
      border-radius: 3px;
      overflow: hidden;
      margin: 5px 0 2px;
      background: rgba(255, 255, 255, 0.06);
    }
    .cons-split-z { background: #4CAF50; transition: width 0.3s; }
    .cons-split-n { background: #FFA726; transition: width 0.3s; }

    /* (house-corner legacy CSS removed — replaced by .sc-chip system) */
    .hc-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }

    /* ---- Spotřeba: compact split row (dot + kW inline) ---- */
    .csplit {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin: 4px 0 9px;
    }
    .cs {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      white-space: nowrap;
      cursor: pointer;
      background: none;
      border: none;
      color: inherit;
      padding: 0;
    }
    .cs:hover { opacity: .8; }
    .cs-top { display: flex; align-items: center; gap: 5px; font-size: 14px; font-weight: 800; }
    .cs-top .d { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .cs-day { font-size: 9.5px; font-weight: 600; opacity: .55; }

    /* ---- Spotřeba: phase graph ---- */
    .pg {
      position: relative;
      background: rgba(0,0,0,.18);
      border-radius: 9px;
      padding: 8px 10px;
      cursor: pointer;
    }
    .pg:hover { background: rgba(0,0,0,.24); }
    .pg-row {
      position: relative;
      display: flex;
      align-items: center;
      gap: 7px;
      height: 18px;
      margin: 4px 0;
    }
    .pg-track {
      position: relative;
      flex: 1;
      height: 100%;
      background: rgba(255,255,255,.05);
      border-radius: 4px;
      overflow: visible;
      display: flex;
    }
    /* Záloha (solid) + nezáloha (faded) — both in the row's ČSN phase colour. */
    .pg-z {
      height: 100%;
      background: #43a047; /* fallback; overridden per-phase below */
      display: flex;
      align-items: center;
      padding-left: 4px;
      font-size: 8.5px;
      font-weight: 800;
      color: #0c1320;
      white-space: nowrap;
      overflow: hidden;
      border-radius: 4px 0 0 4px;
    }
    .pg-z.crit { background: #e53935 !important; color: #fff; opacity: 1; }
    .pg-div { width: 1.5px; background: #0d1526; height: 100%; flex-shrink: 0; }
    .pg-n {
      height: 100%;
      background: #fb8c00; /* fallback; overridden per-phase below */
      opacity: .45;
      display: flex;
      align-items: center;
      padding-left: 4px;
      font-size: 8.5px;
      font-weight: 800;
      color: #0c1320;
      white-space: nowrap;
      overflow: hidden;
      border-radius: 0 4px 4px 0;
    }
    .pg-row.l1 .pg-z, .pg-row.l1 .pg-n { background: var(--phase-l1); }
    .pg-row.l2 .pg-z, .pg-row.l2 .pg-n { background: var(--phase-l2); }
    .pg-row.l3 .pg-z, .pg-row.l3 .pg-n { background: var(--phase-l3); }
    .pg-lim {
      position: absolute;
      top: -3px;
      bottom: -3px;
      width: 2px;
      background: #fff;
      box-shadow: 0 0 5px rgba(255,255,255,.7);
      z-index: 4;
      pointer-events: none;
    }
    .pg-tot {
      font-size: 9px;
      font-weight: 700;
      opacity: .8;
      color: ${ce(d.textPrimary)};
      width: 48px;
      text-align: right;
      font-variant-numeric: tabular-nums;
      flex-shrink: 0;
    }
    /* Spread band: absolute overlay spanning záloha spread region */
    .pg-spread {
      position: absolute;
      top: 4px;
      bottom: 4px;
      z-index: 3;
      border-left: 1.5px dashed rgba(255,255,255,.45);
      border-right: 1.5px dashed rgba(255,255,255,.45);
      background: linear-gradient(90deg,rgba(76,175,80,0),rgba(76,175,80,.12),rgba(76,175,80,0));
      pointer-events: none;
    }
    .pg-spread.balanced {
      border-color: rgba(76,175,80,.45);
    }
    .pg-spread.unbal {
      border-color: rgba(229,57,53,.9);
      background: linear-gradient(90deg,rgba(229,57,53,.05),rgba(229,57,53,.28),rgba(229,57,53,.05));
      box-shadow: 0 0 8px rgba(229,57,53,.45);
      animation: pg-shimmer 1.4s ease-in-out infinite;
    }
    @keyframes pg-shimmer { 0%,100% { opacity:.55; } 50% { opacity:1; } } 50% { opacity:1; } } 50% { opacity:1; } }
    /* ⚖️ warning marker sitting on top of an unbalanced band */
    .pg-spread-mark {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      line-height: 1;
      background: #e53935;
      border-radius: 5px;
      padding: 1px 3px;
      box-shadow: 0 1px 4px rgba(0,0,0,.5);
      white-space: nowrap;
    }

    /* mobile: tighten phase graph a bit */
    @media (max-width: 768px) {
      .pg { padding: 6px 8px; }
      .pg-row { height: 15px; }
      /* solar strings: keep on one line in the narrow 2-col mobile node */
      .sol-str { gap: 4px; padding: 6px 5px; }
      .sol-sc .sol-sw { font-size: 12px; }
      .sol-sc .sol-sh { font-size: 8px; }
      .sol-sc .sol-sd { font-size: 7.5px; }
    }

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
      background: ${ce(d.bgSecondary)};
      border: none;
      font-family: inherit;
      color: ${ce(d.textSecondary)};
    }

    .indicator:hover { background: ${ce(d.divider)}; }

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
      border-top: 1px solid ${ce(d.divider)};
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
      border: 1px solid ${ce(d.divider)};
      background: transparent;
      color: ${ce(d.textSecondary)};
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .gc-plan-btn:hover {
      background: rgba(255,255,255,0.06);
      color: ${ce(d.textPrimary)};
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
      border-top: 1px dashed ${ce(d.divider)};
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
      color: ${ce(d.textSecondary)};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .phase-val {
      font-size: 11px;
      font-weight: 600;
      color: ${ce(d.textPrimary)};
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    .phase-val:hover { text-decoration: underline; }
    .phase-divider {
      border: none;
      border-top: 1px solid ${ce(d.divider)};
      margin: 2px 0;
    }

    /* ── Phase identity colours (ČSN 33 2000-5-51, adapted for dark theme) ── */
    /* L1 hnědá → bronz · L2 černá → posvícená světlá · L3 šedá */
    :host {
      --phase-l1: #d49a63;
      --phase-l2: #cdd6e6;
      --phase-l3: #7d8aa1;
    }
    .l1 { color: var(--phase-l1); }
    .l2 { color: var(--phase-l2); }
    .l3 { color: var(--phase-l3); }

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
      color: ${ce(d.textSecondary)};
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
      color: ${ce(d.textPrimary)};
    }
    .energy-side-val:hover { text-decoration: underline; }
    .energy-import { color: #ef5350; }
    .energy-export { color: #66bb6a; }
    .energy-divider-v {
      width: 1px;
      height: 28px;
      background: ${ce(d.divider)};
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
      color: ${ce(d.textSecondary)};
      text-transform: uppercase;
    }
    .price-val {
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: ${ce(d.textPrimary)};
    }
    .price-val:hover { text-decoration: underline; }
    .price-spot { color: #ef5350; }
    .price-export { color: #66bb6a; }

    /* ====================================================================
       Grid tile V4 — .gd-* namespace (compact, approved mock grid4.html)
       ==================================================================== */

    /* Shared icon (1em square SVG, inline) */
    .gd-ic { width: 1em; height: 1em; vertical-align: -2px; }

    /* Header row */
    .gd-head {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .5px;
      opacity: .85;
      position: relative;
    }
    .gd-head-ico { width: 15px; height: 15px; }
    .gd-cap { font-size: 11px; font-weight: 700; letter-spacing: .6px; }

    /* Frequency (top-left inside header) */
    .gd-hz {
      position: absolute; left: 0; top: -1px;
      background: none; border: none; cursor: pointer; font-family: inherit;
      font-size: 9px; font-weight: 800; opacity: .7; color: inherit; padding: 0;
    }
    .gd-hz:hover { text-decoration: underline; opacity: 1; }
    .gd-hz.warn { color: #ffcc80; opacity: 1; }
    .gd-hz.crit { color: #ff8a80; opacity: 1; }

    /* Tariff badge (top-right inside header) */
    .gd-tar {
      position: absolute;
      right: 0;
      top: -1px;
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 9px;
      font-weight: 800;
      border-radius: 6px;
      padding: 1px 6px;
      cursor: pointer;
      border: none;
      font-family: inherit;
    }
    .gd-tar svg { width: 10px; height: 10px; }
    .gd-tar.vt { background: rgba(255,167,38,.16); border: 1px solid rgba(255,167,38,.45); color: #ffcc80; }
    .gd-tar.nt { background: rgba(76,175,80,.16); border: 1px solid rgba(76,175,80,.45); color: #9fe6a8; }
    .gd-tar:not(.vt):not(.nt) { background: rgba(120,160,255,.12); border: 1px solid rgba(120,160,255,.25); color: #cfe0ff; }

    /* Colours for import/export */
    .gd-col-imp { color: #ff8a80; }
    .gd-col-exp { color: #9fe6a8; }
    .gd-col-warn { color: #ffcc80; }

    /* ── Pure state ── */
    .gd-pure { text-align: center; margin: 5px 0 2px; }
    .gd-pn {
      font-size: 26px; font-weight: 800; line-height: 1;
      background: none; border: none; color: inherit; cursor: pointer; padding: 0;
    }
    .gd-pn:hover { text-decoration: underline; }
    .gd-pd {
      font-size: 11px; font-weight: 800; margin-top: 2px;
      display: flex; align-items: center; justify-content: center; gap: 4px;
    }

    /* ── Combination ── */
    .gd-combo {
      display: flex; justify-content: center; align-items: center;
      gap: 8px; margin: 5px 0 0;
    }
    .gd-cside {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; font-weight: 700; line-height: 1; opacity: .55;
    }
    .gd-cbal {
      font-size: 24px; font-weight: 800; line-height: 1;
      display: flex; align-items: center; gap: 4px;
      background: none; border: none; cursor: pointer; padding: 0 2px; color: inherit;
    }
    .gd-cbal:hover { text-decoration: underline; }

    /* ── Price chips ── */
    .gd-price {
      display: flex; gap: 6px; margin: 6px 0 5px;
    }
    .gd-chip {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
      border-radius: 8px; padding: 4px 3px; border: 1px solid;
      font-weight: 800; font-size: 12px; cursor: pointer; font-family: inherit;
    }
    .gd-chip small { font-size: 8px; opacity: .6; font-weight: 600; }
    .gd-chip:hover { opacity: .85; }
    .gd-chip.good  { background: rgba(76,175,80,.15);  border-color: rgba(76,175,80,.4);  color: #9fe6a8; }
    .gd-chip.bad   { background: rgba(229,57,53,.16);  border-color: rgba(229,57,53,.5);  color: #ff8a80; }
    .gd-chip.neutral { background: rgba(120,160,255,.10); border-color: rgba(120,160,255,.3); color: #cfe0ff; }

    /* ── Money columns: prodej (dodávka) left · nákup (odběr) right ──
       Compact: line1 = directional arrow + price · line2 = dnes · měsíc Kč.
       Single direction cue (arrow); colour = sign of wallet impact. */
    .gd-cols { display: flex; gap: 8px; margin: 7px 0 7px; }
    .gd-col {
      flex: 1; border-radius: 9px; padding: 5px 7px;
      border: 1px solid rgba(255,255,255,.08); background: rgba(0,0,0,.14);
    }
    /* RATE = hero */
    .gd-crate {
      font-size: 15px; font-weight: 800; white-space: nowrap;
      display: flex; align-items: baseline; justify-content: center; gap: 4px;
    }
    .gd-crate small { font-size: 8px; opacity: .55; font-weight: 600; }
    .gd-crate .gd-ic { width: 11px; height: 11px; align-self: center; flex: none; }
    /* Accumulated: dnes (left, full) · měsíc (right, muted); units kept, no labels */
    .gd-cmoney {
      display: flex; align-items: baseline; justify-content: space-between;
      margin-top: 4px; white-space: nowrap; font-size: 9.5px; font-weight: 800;
      background: none; border: none; cursor: pointer;
      font-family: inherit; padding: 0; color: inherit; width: 100%;
    }
    .gd-cmoney:hover { text-decoration: underline; }
    .gd-cmoney small { font-size: 7px; opacity: .55; font-weight: 700; margin-left: 1px; }
    .gd-md { } /* dnes — full */
    .gd-mm { opacity: .55; } /* měsíc — muted */

    /* ── Phase bars ── */
    .gd-ph {
      background: rgba(0,0,0,.18); border-radius: 9px;
      padding: 6px 8px; margin-bottom: 7px;
    }
    .gd-phr {
      display: flex; align-items: center; gap: 5px; height: 15px; margin: 3px 0;
    }
    .gd-ptr {
      position: relative; flex: 1; height: 13px;
      background: rgba(255,255,255,.05); border-radius: 4px; overflow: hidden;
    }
    /* Vertical centre line */
    .gd-zero {
      position: absolute; left: 50%; top: 0; bottom: 0;
      width: 1.5px; background: rgba(255,255,255,.28); z-index: 2;
    }
    /* Bar fill = phase colour (ČSN); direction = which side of the zero line */
    .gd-seg {
      position: absolute; top: 0; bottom: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 8px; font-weight: 800; white-space: nowrap;
      color: #0c1320; border-radius: 3px; padding: 0 3px;
    }
    .gd-seg.l1 { background: var(--phase-l1); }
    .gd-seg.l2 { background: var(--phase-l2); }
    .gd-seg.l3 { background: var(--phase-l3); }

    /* ── Voltage: dynamic-zoom axis, criticality gradient, value ON the axis ──
       No bubbles: a thin phase-coloured tick marks each phase's position, the
       value sits above (outer two) / below (middle) so they never overlap. The
       window bounds live on the below line at the edges (no extra row). */
    .gd-volt {
      background: rgba(0,0,0,.18); border-radius: 9px;
      padding: 15px 11px 14px; margin-bottom: 2px;
    }
    .gd-vband {
      position: relative; height: 7px; border-radius: 4px;
      background: rgba(255,255,255,.07); /* overridden inline with criticality gradient */
    }
    .gd-vtick {
      position: absolute; top: -2px; bottom: -2px; width: 2px;
      transform: translateX(-50%); border-radius: 1px; z-index: 2;
    }
    .gd-vtick.l1 { background: var(--phase-l1); }
    .gd-vtick.l2 { background: var(--phase-l2); }
    .gd-vtick.l3 { background: var(--phase-l3); }
    .gd-vlab {
      position: absolute; transform: translateX(-50%);
      font-size: 10px; font-weight: 800; white-space: nowrap; z-index: 3;
      background: none; border: none; cursor: pointer; font-family: inherit; padding: 0;
    }
    .gd-vlab small { font-size: 7px; opacity: .6; font-weight: 700; }
    .gd-vlab.above { top: -14px; }
    .gd-vlab.below { top: 11px; }
    .gd-vlab.l1 { color: var(--phase-l1); }
    .gd-vlab.l2 { color: var(--phase-l2); }
    .gd-vlab.l3 { color: var(--phase-l3); }
    .gd-vlab:hover { text-decoration: underline; }
    .gd-vbound {
      position: absolute; top: 11px; font-size: 8px; font-weight: 700; opacity: .5;
    }
    .gd-vbound.lo { left: 0; }
    .gd-vbound.hi { right: 0; }

    /* ====================================================================
       Battery tile — .bt-* namespace (compact, approved mock bat2.html)
       ==================================================================== */
    .bt-ic { width: 1em; height: 1em; vertical-align: -2px; }
    .bt-head {
      position: relative; display: flex; align-items: center; justify-content: center;
      gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: .5px; opacity: .85;
      margin-top: 16px;
    }
    .bt-head-ico { width: 17px; height: 17px; }
    .bt-cap { font-size: 11px; font-weight: 700; letter-spacing: .6px; }
    .bt-soh {
      position: absolute; right: 0; top: -2px; display: flex; align-items: center; gap: 3px;
      font-size: 9px; font-weight: 800; border-radius: 6px; padding: 1px 7px;
      border: 1px solid; cursor: pointer; font-family: inherit;
    }
    .bt-soh svg { width: 10px; height: 10px; }

    .bt-pure { text-align: center; margin: 4px 0 2px; }
    .bt-pn {
      font-size: 25px; font-weight: 800; line-height: 1;
      background: none; border: none; color: inherit; cursor: pointer; padding: 0;
    }
    .bt-pn:hover { text-decoration: underline; }
    .bt-pd {
      font-size: 11px; font-weight: 800; margin-top: 2px;
      display: flex; align-items: center; justify-content: center; gap: 4px;
    }
    .bt-pd .bt-sep { opacity: .4; font-weight: 400; }
    .bt-chg { color: #9fe6a8; }
    .bt-dis { color: #ffcc80; }

    /* SoC bar: reserve (below floor) + fill + floor marker + usable kWh */
    .bt-soc { background: rgba(0,0,0,.18); border-radius: 9px; padding: 9px 11px 7px; margin: 8px 0 7px; }
    .bt-soctop { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
    /* autonomy (left, hero of the block) */
    .bt-aut { display: flex; align-items: center; gap: 5px; }
    .bt-aut-ico { width: 14px; height: 14px; opacity: .8; }
    .bt-aut-lbl { font-size: 8px; opacity: .5; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; }
    .bt-aut-v { font-size: 18px; font-weight: 800; line-height: 1.05; white-space: nowrap; }
    .bt-aut-v.bt-dis { color: #ff8a80; }
    /* usable kWh above floor (right) */
    .bt-use { text-align: right; background: none; border: none; cursor: pointer; padding: 0; color: inherit; font-family: inherit; }
    .bt-use:hover { text-decoration: underline; }
    .bt-use-lbl { display: block; font-size: 8px; opacity: .5; font-weight: 700; }
    .bt-use-v { font-size: 14px; font-weight: 800; }
    .bt-use-v small { font-size: 8px; opacity: .6; }
    .bt-socbar { position: relative; height: 12px; border-radius: 5px; background: rgba(255,255,255,.06); overflow: hidden; }
    .bt-socres {
      position: absolute; left: 0; top: 0; bottom: 0;
      background: repeating-linear-gradient(45deg, rgba(229,57,53,.30) 0, rgba(229,57,53,.30) 4px, rgba(229,57,53,.12) 4px, rgba(229,57,53,.12) 8px);
    }
    .bt-socfill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 5px; }
    .bt-socfloor { position: absolute; top: -3px; bottom: -3px; width: 0; border-left: 2px solid #ff8a80; z-index: 3; }
    .bt-socfloor svg { position: absolute; top: -9px; left: -5px; width: 9px; height: 9px; color: #ff8a80; }
    .bt-socsc { display: flex; justify-content: space-between; font-size: 7.5px; opacity: .5; margin-top: 7px; }
    .bt-socsc .bt-fl { color: #ff8a80; opacity: .8; }

    /* Today: charge (FVE/grid split) · discharge → home */
    .bt-today { display: flex; gap: 8px; }
    .bt-tc {
      flex: 1; border-radius: 9px; padding: 6px 8px; text-align: center;
      border: 1px solid rgba(255,255,255,.08); background: rgba(0,0,0,.14);
      cursor: pointer; font-family: inherit; color: inherit;
    }
    .bt-tc:hover { text-decoration: underline; }
    .bt-tch { display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 14px; font-weight: 800; }
    .bt-tch svg { width: 12px; height: 12px; }
    .bt-tch small { font-size: 8px; opacity: .6; }
    .bt-split { display: flex; height: 5px; border-radius: 3px; overflow: hidden; margin-top: 5px; }
    .bt-sp-fve { background: #ffd54f; }
    .bt-sp-grid { background: #fb8c00; }
    .bt-splitleg { display: flex; justify-content: space-between; font-size: 8px; opacity: .75; margin-top: 3px; font-weight: 700; }
    .bt-splitleg span { display: flex; align-items: center; gap: 2px; }
    .bt-splitleg svg { width: 9px; height: 9px; }
    .bt-tc-mid { display: flex; align-items: center; justify-content: center; margin-top: 8px; opacity: .4; }
    .bt-tc-mid svg { width: 14px; height: 14px; }

    /* Metrics: V · A · °C */
    .bt-met { display: flex; justify-content: space-between; gap: 6px; margin-top: 8px; }
    .bt-met button {
      flex: 1; background: rgba(0,0,0,.14); border: 1px solid rgba(255,255,255,.07);
      border-radius: 8px; padding: 4px 2px; font-size: 9.5px; font-weight: 700;
      color: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 3px;
      font-family: inherit;
    }
    .bt-met button svg { width: 11px; height: 11px; opacity: .7; }
    .bt-met button.bt-hot { color: #ff8a80; }
    .bt-met button.bt-cold { color: #80d8ff; }

    /* ====================================================================
       Inverter (Střídač) tile — .iv-* namespace (compact, approved mock inv1)
       ==================================================================== */
    .iv-ic { width: 1em; height: 1em; vertical-align: -2px; }
    .iv-head {
      position: relative; display: flex; align-items: center; justify-content: center;
      gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: .5px; opacity: .85;
      margin-top: 16px;
    }
    .iv-head-ico { width: 16px; height: 16px; }
    .iv-cap { font-size: 11px; font-weight: 700; letter-spacing: .6px; }
    .iv-bpbadge {
      position: absolute; right: 0; top: -2px; display: flex; align-items: center; gap: 3px;
      font-size: 9px; font-weight: 800; border-radius: 6px; padding: 1px 7px;
      background: rgba(229,57,53,.18); border: 1px solid rgba(229,57,53,.5); color: #ff8a80;
    }
    .iv-bpbadge svg { width: 10px; height: 10px; }

    /* hero = working mode */
    .iv-mode { text-align: center; margin: 5px 0 1px; }
    .iv-mn {
      font-size: 23px; font-weight: 800; line-height: 1;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      background: none; border: none; cursor: pointer; padding: 0;
    }
    .iv-mn:hover { text-decoration: underline; }
    .iv-mn svg { width: 20px; height: 20px; }
    .iv-md { font-size: 11px; font-weight: 700; opacity: .6; margin-top: 2px; }

    /* planner chip */
    .iv-plan {
      display: flex; align-items: center; justify-content: center; gap: 5px;
      font-size: 10px; font-weight: 800; border-radius: 8px; padding: 4px 8px; margin: 8px 0 7px;
    }
    .iv-plan svg { width: 13px; height: 13px; }
    .iv-plan.iv-plan-auto { background: rgba(76,175,80,.14); border: 1px solid rgba(76,175,80,.4); color: #9fe6a8; }
    .iv-plan.iv-plan-off { background: rgba(120,140,200,.12); border: 1px solid rgba(120,140,200,.3); color: #cfe0ff; }
    .iv-rec { opacity: .7; font-weight: 700; }

    /* status strip: Bypass · Dodávka */
    .iv-strip { display: flex; gap: 8px; margin-bottom: 7px; }
    .iv-sp {
      flex: 1; border-radius: 9px; padding: 6px 7px; text-align: center;
      border: 1px solid rgba(255,255,255,.08); background: rgba(0,0,0,.14);
      cursor: pointer; font-family: inherit; color: inherit;
    }
    .iv-sp:hover { text-decoration: underline; }
    .iv-spl {
      display: flex; align-items: center; justify-content: center; gap: 4px;
      font-size: 8px; font-weight: 700; opacity: .6; text-transform: uppercase; letter-spacing: .3px;
    }
    .iv-spl svg { width: 11px; height: 11px; }
    .iv-spv { font-size: 13px; font-weight: 800; margin-top: 2px; }
    .iv-ok { color: #9fe6a8; }
    .iv-warn { color: #ffcc80; }
    .iv-bad { color: #ff8a80; }
    .iv-off { color: #9aa7ba; }

    /* notifications */
    .iv-notif {
      display: flex; align-items: center; justify-content: center; gap: 5px;
      font-size: 10px; font-weight: 700; border-radius: 8px; padding: 4px 8px; width: 100%;
      background: rgba(0,0,0,.14); border: 1px solid rgba(255,255,255,.07);
      cursor: pointer; font-family: inherit; color: inherit;
    }
    .iv-notif svg { width: 12px; height: 12px; opacity: .7; }
    .iv-notif.warn { background: rgba(255,167,38,.12); border-color: rgba(255,167,38,.4); color: #ffcc80; }
    .iv-notif.warn svg { opacity: 1; }

    @media (min-width: 1025px) {
      .detail-section {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid ${ce(d.divider)};
      }
      .boiler-section,
      .grid-charging-plan {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed ${ce(d.divider)};
      }
      .node::after { display: none; }
    }

    /* ---- Tablet (768-1024px) ---- */
    @media (min-width: 769px) and (max-width: 1024px) {
      .node {
        width: 205px;
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
      /* SAME star/pentagon as the web with FULL-detail tiles (nothing hidden) —
         the whole pentagon is just zoomed down to fit the narrow screen. Using
         zoom (not transform) reflows the box, so there is no empty space below
         and no horizontal overflow; connector lines measure the zoomed rects. */
      .flow-grid {
        grid-template-columns: 1fr 1.15fr 1fr !important;
        grid-template-rows: auto auto auto !important;
        width: 870px;
        max-width: 870px;
        gap: 8px;
        padding: 6px;
        margin: 0 auto;
        zoom: 0.42;
      }
      .node-solar    { grid-column: 1; grid-row: 1; justify-self: center; }
      .node-house    { grid-column: 3; grid-row: 1; justify-self: center; }
      .node-inverter { grid-column: 2; grid-row: 2; justify-self: center; }
      .node-grid     { grid-column: 1; grid-row: 3; justify-self: center; }
      .node-battery  { grid-column: 3; grid-row: 3; justify-self: center; }

      /* Wider tiles than desktop so iOS's wider font doesn't spill (Solár plán,
         fáze). Extra bottom padding gives the bottom pill (SoC%/°C/bilance)
         room so it doesn't overlap the last row (tiles are content-height here,
         no min-height slack like the desktop has). */
      .node {
        width: 260px;
        min-width: 260px;
        max-width: 260px;
        min-height: 0;
        padding-bottom: 20px;
      }
    }

    /* ---- Nest Hub landscape (769-1200px landscape) ---- */
    @media (min-width: 769px) and (max-width: 1200px) and (orientation: landscape) {
      .flow-grid {
        transform: scale(0.82);
        transform-origin: top center;
      }
      .node {
        width: 185px;
        padding: 8px 10px;
      }
      .node-icon { font-size: 20px; }
      .node-value { font-size: 20px; }
      .node-label { font-size: 9px; }
    }

    /* ---- Extra small (<380px) — zoom the full pentagon down a touch more ---- */
    @media (max-width: 380px) {
      .flow-grid { zoom: 0.40; }
      .node {
        width: 260px;
        min-width: 260px;
        max-width: 260px;
        padding-bottom: 20px;
      }
      .node-icon { font-size: 18px; }
      .node-value { font-size: 16px; }
      .node-label { font-size: 8px; }
    }

    /* ---- Landscape kiosk (Google Nest Hub ~768×543) — kompaktní pentagon ---- */
    @media (orientation: landscape) and (max-height: 600px) {
      .flow-grid {
        grid-template-columns: 1fr 1.05fr 1fr;
        grid-template-rows: auto auto auto;
        gap: 2px;
        padding: 0;
      }
      .node-solar    { grid-column: 1; grid-row: 1; justify-self: center; }
      .node-house    { grid-column: 3; grid-row: 1; justify-self: center; }
      .node-inverter { grid-column: 2; grid-row: 2; justify-self: center; }
      .node-grid     { grid-column: 1; grid-row: 3; justify-self: center; }
      .node-battery  { grid-column: 3; grid-row: 3; justify-self: center; }
      .node { width: 140px; max-width: 100%; min-width: 0; padding: 3px 6px; }
      .node-header { margin-bottom: 0; }
      .node-value { font-size: 14px; margin: 0; }
      .node-label { font-size: 8px; }
      .node-subvalue { font-size: 8px; }
      .node-status { font-size: 8px; padding: 0 4px; margin: 1px 0; }
      .indicator { font-size: 8px; padding: 1px 3px; }
      .planner-badge, .shield-badge { font-size: 8px; margin: 1px 0; padding: 0 4px; }
      .battery-indicators { gap: 2px; margin-top: 1px; }
      .battery-energy-section { margin-top: 2px; }
      .detail-header { font-size: 8px; margin-bottom: 0; }
      .detail-row { font-size: 8px; margin-bottom: 0; }
      .energy-grid { gap: 0 6px; }
      .prices-row { margin-top: 2px; }
      .price-label, .price-val { font-size: 9px; }
      .phases { font-size: 8px; margin: 1px 0; }
      .phases-grid { margin-top: 2px; }
      .phase-label, .phase-val { font-size: 8px; }
      .planner-badge, .shield-badge { font-size: 8px; }
      .gc-plan-btn { font-size: 8px; padding: 1px 4px; }
      .node::after { display: none; }
      /* Kiosk = přehledový pohled: skrýt těžké rozpady (jsou na ostatních tabech/po rozkliknutí) */
      .battery-energy-section,
      .prices-row,
      .phases-grid,
      .pg { display: none; }
      /* Grid tile kiosk: hide heavy sections (price is on the Ceny tab) */
      .gd-ph, .gd-volt, .gd-costrow, .gd-cols { display: none; }
      /* Střídač kiosk: keep mode + planner; hide status strip + notifications. */
      .iv-strip, .iv-notif { display: none; }
      /* Battery kiosk: keep SoC (aura+pill) + power; hide heavy blocks */
      .bt-soc, .bt-today, .bt-met { display: none; }
    }
  `;lt([m({type:Object})],Ye.prototype,"data",2);lt([m({type:Boolean})],Ye.prototype,"editMode",2);lt([S()],Ye.prototype,"pendingServices",2);lt([S()],Ye.prototype,"changingServices",2);lt([S()],Ye.prototype,"shieldStatus",2);lt([S()],Ye.prototype,"shieldQueueCount",2);lt([S()],Ye.prototype,"gridDeliveryState",2);lt([S()],Ye.prototype,"expandedNodes",2);lt([S()],Ye.prototype,"gaugeDetailOpen",2);lt([S()],Ye.prototype,"customPositions",2);lt([S()],Ye.prototype,"nodeDims",2);Ye=lt([E("oig-flow-node")],Ye);var Q0=Object.defineProperty,X0=Object.getOwnPropertyDescriptor,Si=(e,t,i,r)=>{for(var a=r>1?void 0:r?X0(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&Q0(t,i,a),a};function J0(e,t){return{fromColor:fs[e]||"#9e9e9e",toColor:fs[t]||"#9e9e9e"}}const eb=X;let Pt=class extends O{constructor(){super(...arguments),this.data=Eo,this.particlesEnabled=!0,this.active=!0,this.editMode=!1,this.lines=[],this.animationId=null,this.resizeObserver=null,this.lastSpawnTime={},this.particleCount=0,this.MAX_PARTICLES=50,this.onVisibilityChange=()=>{this.updateAnimationState()},this.onLayoutChanged=()=>{this.drawConnectionsDeferred()}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this.onVisibilityChange),this.addEventListener("layout-changed",this.onLayoutChanged)}disconnectedCallback(){var e;super.disconnectedCallback(),document.removeEventListener("visibilitychange",this.onVisibilityChange),this.removeEventListener("layout-changed",this.onLayoutChanged),(e=this.resizeObserver)==null||e.disconnect(),this.resizeObserver=null,this.stopAnimation()}updated(e){e.has("data")&&(this.updateLines(),this.animationId!==null&&this.spawnParticles()),(e.has("active")||e.has("particlesEnabled"))&&this.updateAnimationState(),this.drawConnectionsDeferred()}firstUpdated(){var e;this.updateLines(),this.updateAnimationState(),(e=this.resizeObserver)==null||e.disconnect(),this.resizeObserver=new ResizeObserver(()=>this.drawConnectionsDeferred()),this.resizeObserver.observe(this)}drawConnectionsDeferred(){requestAnimationFrame(()=>this.drawConnectionsSVG())}getParticlesLayer(){var e;return(e=this.renderRoot)==null?void 0:e.querySelector(".particles-layer")}getGridMetrics(){var n,o;const e=(n=this.renderRoot)==null?void 0:n.querySelector("oig-flow-node");if(!e)return null;const i=(e.renderRoot||e.shadowRoot||e).querySelector(".flow-grid");if(!i)return null;const r=(o=this.renderRoot)==null?void 0:o.querySelector(".canvas-container");if(!r)return null;const a=i.getBoundingClientRect();return a.width===0||a.height===0?null:{grid:i,gridRect:a,canvasRect:r.getBoundingClientRect()}}positionOverlayLayer(e,t,i){const r=t.left-i.left,a=t.top-i.top;e.style.left=`${r}px`,e.style.top=`${a}px`,e.style.width=`${t.width}px`,e.style.height=`${t.height}px`}updateLines(){const e=this.data,t=[],i=e.solarPower>50;t.push({id:"solar-inverter",from:"solar",to:"inverter",color:Hi.solar,power:i?e.solarPower:0,params:i?Da(e.solarPower,za.solar,"solar"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:i});const r=Math.abs(e.batteryPower)>50,a=e.batteryPower>0;t.push({id:"battery-inverter",from:r&&a?"inverter":"battery",to:r&&a?"battery":"inverter",color:Hi.battery,power:r?Math.abs(e.batteryPower):0,params:r?Da(e.batteryPower,za.battery,"battery"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:r});const n=Math.abs(e.gridPower)>50,o=e.gridPower>0;t.push({id:"grid-inverter",from:n?o?"grid":"inverter":"grid",to:n?o?"inverter":"grid":"inverter",color:n?o?Hi.grid_import:Hi.grid_export:Hi.grid_import,power:n?Math.abs(e.gridPower):0,params:n?Da(e.gridPower,za.grid,"grid"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:n});const l=e.housePower>50;t.push({id:"inverter-house",from:"inverter",to:"house",color:Hi.house,power:l?e.housePower:0,params:l?Da(e.housePower,za.house,"house"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:l}),this.lines=t}calcEdgePoint(e,t,i,r){const a=t.x-e.x,n=t.y-e.y;if(a===0&&n===0)return{...e};const o=Math.abs(a),l=Math.abs(n),c=o*r>l*i?i/o:r/l;return{x:e.x+a*c,y:e.y+n*c}}getNodeInfo(e,t,i){const r=e.querySelector(`.node-${i}`);if(!r)return null;const a=r.getBoundingClientRect();return{x:a.left+a.width/2-t.left,y:a.top+a.height/2-t.top,hw:a.width/2,hh:a.height/2}}drawConnectionsSVG(){const e=this.svgEl;if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:r,canvasRect:a}=t;this.positionOverlayLayer(e,r,a),e.setAttribute("viewBox",`0 0 ${r.width} ${r.height}`);const n=this.getParticlesLayer();n&&this.positionOverlayLayer(n,r,a),e.innerHTML="";const o="http://www.w3.org/2000/svg",l=document.createElementNS(o,"defs"),c=document.createElementNS(o,"filter");c.setAttribute("id","neon-glow"),c.setAttribute("x","-50%"),c.setAttribute("y","-50%"),c.setAttribute("width","200%"),c.setAttribute("height","200%");const p=document.createElementNS(o,"feGaussianBlur");p.setAttribute("in","SourceGraphic"),p.setAttribute("stdDeviation","3"),p.setAttribute("result","blur"),c.appendChild(p);const u=document.createElementNS(o,"feMerge"),h=document.createElementNS(o,"feMergeNode");h.setAttribute("in","blur"),u.appendChild(h);const g=document.createElementNS(o,"feMergeNode");g.setAttribute("in","SourceGraphic"),u.appendChild(g),c.appendChild(u),l.appendChild(c),e.appendChild(l);for(const v of this.lines){const f=this.getNodeInfo(i,r,v.from),b=this.getNodeInfo(i,r,v.to);if(!f||!b)continue;const $={x:f.x,y:f.y},_={x:b.x,y:b.y},w=this.calcEdgePoint($,_,f.hw,f.hh),C=this.calcEdgePoint(_,$,b.hw,b.hh),D=C.x-w.x,T=C.y-w.y,I=Math.sqrt(D*D+T*T),k=Math.min(I*.2,40),P=-T/I,V=D/I,Y=(w.x+C.x)/2,U=(w.y+C.y)/2,Z=Y+P*k,Q=U+V*k,Se=`grad-${v.id}`,{fromColor:re,toColor:q}=J0(v.from,v.to),de=document.createElementNS(o,"linearGradient");de.setAttribute("id",Se),de.setAttribute("x1","0%"),de.setAttribute("y1","0%"),de.setAttribute("x2","100%"),de.setAttribute("y2","0%");const F=document.createElementNS(o,"stop");F.setAttribute("offset","0%"),F.setAttribute("stop-color",re);const ae=document.createElementNS(o,"stop");ae.setAttribute("offset","100%"),ae.setAttribute("stop-color",q),de.appendChild(F),de.appendChild(ae),l.appendChild(de);const M=document.createElementNS(o,"path");if(M.setAttribute("d",`M ${w.x} ${w.y} Q ${Z} ${Q} ${C.x} ${C.y}`),M.setAttribute("stroke",`url(#${Se})`),M.setAttribute("stroke-width","3"),M.setAttribute("stroke-linecap","round"),M.setAttribute("fill","none"),M.setAttribute("opacity",v.active?"0.8":"0.18"),v.active&&M.setAttribute("filter","url(#neon-glow)"),M.classList.add("flow-line"),v.active||M.classList.add("flow-line--inactive"),e.appendChild(M),v.params.active){const oe=document.createElementNS(o,"polygon");oe.setAttribute("points",`0,-6 ${6*1.2},0 0,6`),oe.setAttribute("fill",v.color),oe.setAttribute("opacity","0.9");const be=document.createElementNS(o,"animateMotion");be.setAttribute("dur",`${Math.max(1,v.params.speed/1e3)}s`),be.setAttribute("repeatCount","indefinite"),be.setAttribute("path",`M ${w.x} ${w.y} Q ${Z} ${Q} ${C.x} ${C.y}`),be.setAttribute("rotate","auto"),oe.appendChild(be),e.appendChild(oe)}}}updateAnimationState(){this.particlesEnabled&&this.active&&!document.hidden&&!at.reduceMotion?(this.spawnParticles(),this.startAnimation()):this.stopAnimation()}startAnimation(){if(this.animationId!==null)return;const e=()=>{this.spawnParticles(),this.animationId=requestAnimationFrame(e)};this.animationId=requestAnimationFrame(e)}stopAnimation(){this.animationId!==null&&(cancelAnimationFrame(this.animationId),this.animationId=null)}spawnParticles(){if(this.particleCount>=this.MAX_PARTICLES)return;const e=this.getParticlesLayer();if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:r,canvasRect:a}=t;this.positionOverlayLayer(e,r,a);const n=performance.now();for(const o of this.lines){if(!o.params.active)continue;const l=o.params.speed,c=this.lastSpawnTime[o.id]||0;if(n-c<l)continue;const p=this.getNodeInfo(i,r,o.from),u=this.getNodeInfo(i,r,o.to);if(!p||!u)continue;const h={x:p.x,y:p.y},g={x:u.x,y:u.y},v=this.calcEdgePoint(h,g,p.hw,p.hh),f=this.calcEdgePoint(g,h,u.hw,u.hh);this.lastSpawnTime[o.id]=n;const b=o.params.count;for(let $=0;$<b&&!(this.particleCount>=this.MAX_PARTICLES);$++)this.createParticle(e,v,f,o.color,o.params,$*(o.params.speed/b/2))}}createParticle(e,t,i,r,a,n){const o=document.createElement("div");o.className="particle";const l=a.size;o.style.width=`${l}px`,o.style.height=`${l}px`,o.style.background=r,o.style.left=`${t.x}px`,o.style.top=`${t.y}px`,o.style.boxShadow=`0 0 ${l}px ${r}`,o.style.opacity="0",e.appendChild(o),this.particleCount++;const c=a.speed;setTimeout(()=>{let p=!1;const u=()=>{p||(p=!0,o.isConnected&&o.remove(),this.particleCount=Math.max(0,this.particleCount-1))};if(typeof o.animate=="function"){const h=o.animate([{left:`${t.x}px`,top:`${t.y}px`,opacity:0,offset:0},{opacity:a.opacity,offset:.1},{opacity:a.opacity,offset:.9},{left:`${i.x}px`,top:`${i.y}px`,opacity:0,offset:1}],{duration:c,easing:"linear"});h.onfinish=u,h.oncancel=u}else o.style.transition=`left ${c}ms linear, top ${c}ms linear, opacity ${c}ms linear`,o.style.opacity=`${a.opacity}`,requestAnimationFrame(()=>{o.style.left=`${i.x}px`,o.style.top=`${i.y}px`,o.style.opacity="0"}),o.addEventListener("transitionend",u,{once:!0}),window.setTimeout(u,c+50)},n)}render(){return s`
      <div class="canvas-container">
        <div class="flow-grid-wrapper">
          <oig-flow-node .data=${this.data} .editMode=${this.editMode}></oig-flow-node>
        </div>

        <svg class="connections-layer"></svg>

        <div class="particles-layer"></div>
      </div>
    `}resetLayout(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-flow-node");e!=null&&e.resetLayout&&e.resetLayout()}};Pt.styles=z`
    :host {
      display: block;
      position: relative;
      width: 100%;
      background: ${eb(d.bgSecondary)};
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

    /* Mobile: compact pentagon (star), connector lines kept */
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
  `;Si([m({type:Object})],Pt.prototype,"data",2);Si([m({type:Boolean})],Pt.prototype,"particlesEnabled",2);Si([m({type:Boolean})],Pt.prototype,"active",2);Si([m({type:Boolean})],Pt.prototype,"editMode",2);Si([S()],Pt.prototype,"lines",2);Si([An(".connections-layer")],Pt.prototype,"svgEl",2);Pt=Si([E("oig-flow-canvas")],Pt);var tb=Object.defineProperty,ib=Object.getOwnPropertyDescriptor,Ko=(e,t,i,r)=>{for(var a=r>1?void 0:r?ib(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&tb(t,i,a),a};const ct=X;let Ur=class extends O{constructor(){super(...arguments),this.data=null,this.open=!1,this.onKeyDown=e=>{e.key==="Escape"&&this.hide()}}show(){this.open=!0}hide(){this.open=!1}onOverlayClick(e){e.target===e.currentTarget&&this.hide()}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onKeyDown),this.addEventListener("oig-grid-charging-open",()=>this.show())}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onKeyDown)}formatTime(e){const t=e.time_from??"--:--",i=e.time_to??"--:--";return`${t} – ${i}`}isBlockActive(e){if(!e.time_from||!e.time_to)return!1;const t=new Date,i=t.toISOString().slice(0,10);if(e.day==="tomorrow")return!1;const r=`${i}T${e.time_from}`,a=`${i}T${e.time_to}`,n=new Date(r),o=new Date(a);return t>=n&&t<o}renderEmpty(){return s`
      <div class="empty-state">
        <div class="empty-icon">🔌</div>
        <div class="empty-text">Žádné plánované nabíjení</div>
        <div class="empty-sub">Plán nabíjení ze sítě není aktivní.</div>
      </div>
    `}renderContent(){const e=this.data;if(!e)return this.renderEmpty();const t=e.blocks.find(i=>this.isBlockActive(i));return s`
      ${e.hasBlocks?s`
        <!-- Summary chips -->
        <div class="summary-row">
          ${e.totalEnergyKwh>0?s`
            <span class="summary-chip energy">⚡ ${e.totalEnergyKwh.toFixed(1)} kWh</span>
          `:x}
          ${e.totalCostCzk>0?s`
            <span class="summary-chip cost">💰 ~${e.totalCostCzk.toFixed(0)} Kč</span>
          `:x}
          ${e.windowLabel?s`
            <span class="summary-chip time">🪟 ${e.windowLabel}</span>
          `:x}
          ${e.durationMinutes>0?s`
            <span class="summary-chip time">⏱️ ${Math.round(e.durationMinutes)} min</span>
          `:x}
        </div>

        <!-- Active block banner -->
        ${t?s`
          <div class="active-block-banner">
            <div class="pulse-dot"></div>
            <span>Probíhá: ${this.formatTime(t)}
              ${t.grid_charge_kwh!=null?` · ${t.grid_charge_kwh.toFixed(1)} kWh`:x}
            </span>
          </div>
        `:x}

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
            ${e.blocks.map((i,r)=>{const a=this.isBlockActive(i);return s`
                <tr class="${a?"is-active":!a&&r===0&&!t?"is-next":""}">
                  <td>${this.formatTime(i)}</td>
                  <td>
                    ${i.day?s`
                      <span class="day-badge ${i.day}">${i.day==="today"?"dnes":"zítra"}</span>
                    `:x}
                  </td>
                  <td>${i.grid_charge_kwh!=null?i.grid_charge_kwh.toFixed(1):"--"}</td>
                  <td>${i.total_cost_czk!=null?`${i.total_cost_czk.toFixed(0)} Kč`:"--"}</td>
                </tr>
              `})}
          </tbody>
        </table>
      `:this.renderEmpty()}
    `}render(){var e;return this.open?s`
      <div class="overlay" @click=${this.onOverlayClick}>
        <div class="dialog" role="dialog" aria-modal="true" aria-label="Plánované síťové nabíjení">
          <div class="dialog-header">
            <span class="dialog-header-icon">🔌</span>
            <div>
              <div class="dialog-header-title">Plánované síťové nabíjení</div>
              ${(e=this.data)!=null&&e.hasBlocks?s`
                <div class="dialog-header-subtitle">
                  ${this.data.blocks.length} blok${this.data.blocks.length>1?"ů":""}
                </div>
              `:x}
            </div>
            <button class="close-btn" @click=${()=>this.hide()} aria-label="Zavřít">✕</button>
          </div>
          <div class="dialog-body">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `:x}};Ur.styles=z`
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
      background: ${ct(d.cardBg)};
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
      border-bottom: 1px solid ${ct(d.divider)};
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
      color: ${ct(d.textPrimary)};
    }

    .dialog-header-subtitle {
      font-size: 11px;
      color: ${ct(d.textSecondary)};
      margin-top: 2px;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: ${ct(d.textSecondary)};
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
      color: ${ct(d.textPrimary)};
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
      color: ${ct(d.textSecondary)};
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
      color: ${ct(d.textSecondary)};
      padding: 0 6px 8px;
      border-bottom: 1px solid ${ct(d.divider)};
    }

    .blocks-table th:last-child,
    .blocks-table td:last-child {
      text-align: right;
    }

    .blocks-table td {
      padding: 8px 6px;
      font-size: 12px;
      color: ${ct(d.textPrimary)};
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
      color: ${ct(d.textSecondary)};
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
  `;Ko([m({type:Object})],Ur.prototype,"data",2);Ko([S()],Ur.prototype,"open",2);Ur=Ko([E("oig-grid-charging-dialog")],Ur);var rb=Object.defineProperty,ab=Object.getOwnPropertyDescriptor,ze=(e,t,i,r)=>{for(var a=r>1?void 0:r?ab(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&rb(t,i,a),a};const $e=X;Mn.register(Jl,ed,td,id,rd,ad,nd);let Ft=class extends O{constructor(){super(...arguments),this.values=[],this.color="rgba(76, 175, 80, 1)",this.startTime="",this.endTime="",this.chart=null,this.lastDataKey="",this.initializing=!1}render(){return s`<canvas></canvas>`}firstUpdated(){this.values.length>0&&(this.initializing=!0,requestAnimationFrame(()=>{this.createSparkline(),this.initializing=!1}))}updated(e){this.initializing||(e.has("values")||e.has("color"))&&this.updateOrCreateSparkline()}disconnectedCallback(){super.disconnectedCallback(),this.destroyChart()}updateOrCreateSparkline(){var t,i,r,a;if(!this.canvas||this.values.length===0)return;const e=JSON.stringify({v:this.values,c:this.color});if(!(e===this.lastDataKey&&this.chart)){if(this.lastDataKey=e,(r=(i=(t=this.chart)==null?void 0:t.data)==null?void 0:i.datasets)!=null&&r[0]){const n=this.chart.data.datasets[0];if(!((((a=this.chart.data.labels)==null?void 0:a.length)||0)!==this.values.length)){n.data=this.values,n.borderColor=this.color,n.backgroundColor=this.color.replace("1)","0.2)"),this.chart.update("none");return}}this.destroyChart(),this.createSparkline()}}createSparkline(){if(!this.canvas||this.values.length===0)return;this.destroyChart();const e=this.color,t=this.values,i=new Date(this.startTime),r=t.map((a,n)=>new Date(i.getTime()+n*15*60*1e3).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}));this.chart=new Mn(this.canvas,{type:"line",data:{labels:r,datasets:[{data:t,borderColor:e,backgroundColor:e.replace("1)","0.2)"),borderWidth:2,fill:!0,tension:.3,pointRadius:0,pointHoverRadius:5}]},plugins:[],options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:0},plugins:{legend:{display:!1},tooltip:{enabled:!0,backgroundColor:"rgba(0, 0, 0, 0.8)",titleColor:"#fff",bodyColor:"#fff",padding:8,displayColors:!1,callbacks:{title:a=>{var n;return((n=a[0])==null?void 0:n.label)||""},label:a=>`${a.parsed.y.toFixed(2)} Kč/kWh`}},datalabels:{display:!1},zoom:{pan:{enabled:!0,mode:"x",modifierKey:"shift"},zoom:{wheel:{enabled:!0,speed:.1},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)"},mode:"x"}}},scales:{x:{display:!1},y:{display:!0,position:"right",grace:"10%",ticks:{color:"rgba(255, 255, 255, 0.6)",font:{size:8},callback:a=>Number(a).toFixed(1),maxTicksLimit:3},grid:{display:!1}}},layout:{padding:0},interaction:{mode:"nearest",intersect:!1}}})}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}};Ft.styles=z`
    :host {
      display: block;
      width: 100%;
      height: 30px;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `;ze([m({type:Array})],Ft.prototype,"values",2);ze([m({type:String})],Ft.prototype,"color",2);ze([m({type:String})],Ft.prototype,"startTime",2);ze([m({type:String})],Ft.prototype,"endTime",2);ze([An("canvas")],Ft.prototype,"canvas",2);Ft=ze([E("oig-mini-sparkline")],Ft);let Qe=class extends O{constructor(){super(...arguments),this.title="",this.time="",this.valueText="",this.value=0,this.unit="Kč/kWh",this.variant="default",this.clickable=!1,this.startTime="",this.endTime="",this.sparklineValues=[],this.sparklineColor="rgba(76, 175, 80, 1)",this.handleClick=()=>{this.clickable&&this.dispatchEvent(new CustomEvent("card-click",{detail:{startTime:this.startTime,endTime:this.endTime,value:this.value},bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),this.clickable&&this.addEventListener("click",this.handleClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleClick)}render(){const e=this.valueText||`${this.value.toFixed(2)} <span class="stat-unit">${this.unit}</span>`;return s`
      <div class="card-title">${this.title}</div>
      <div class="card-value ${this.variant}" .innerHTML=${e}></div>
      ${this.time?s`<div class="card-time">${this.time}</div>`:x}
      ${this.sparklineValues.length>0?s`
            <div class="sparkline-container">
              <oig-mini-sparkline
                .values=${this.sparklineValues}
                .color=${this.sparklineColor}
                .startTime=${this.startTime}
                .endTime=${this.endTime}
              ></oig-mini-sparkline>
            </div>
          `:x}
    `}};Qe.styles=z`
    :host {
      display: block;
      background: ${$e(d.cardBg)};
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: ${$e(d.cardShadow)};
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
      color: ${$e(d.textSecondary)};
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 700;
      color: ${$e(d.textPrimary)};
      line-height: 1.2;
    }

    .card-value .stat-unit {
      font-size: 12px;
      font-weight: 400;
      color: ${$e(d.textSecondary)};
    }

    .card-value.success { color: #4CAF50; }
    .card-value.warning { color: #FFA726; }
    .card-value.danger { color: #F44336; }
    .card-value.info { color: #29B6F6; }

    .card-time {
      font-size: 10px;
      color: ${$e(d.textSecondary)};
      margin-top: 4px;
    }

    .sparkline-container {
      margin-top: 8px;
    }
  `;ze([m({type:String})],Qe.prototype,"title",2);ze([m({type:String})],Qe.prototype,"time",2);ze([m({type:String})],Qe.prototype,"valueText",2);ze([m({type:Number})],Qe.prototype,"value",2);ze([m({type:String})],Qe.prototype,"unit",2);ze([m({type:String})],Qe.prototype,"variant",2);ze([m({type:Boolean})],Qe.prototype,"clickable",2);ze([m({type:String})],Qe.prototype,"startTime",2);ze([m({type:String})],Qe.prototype,"endTime",2);ze([m({type:Array})],Qe.prototype,"sparklineValues",2);ze([m({type:String})],Qe.prototype,"sparklineColor",2);Qe=ze([E("oig-stats-card")],Qe);function nb(e){const t=new Date(e.start),i=new Date(e.end),r=t.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit"}),a=t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}),n=i.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"});return`${r} ${a} - ${n}`}let Yr=class extends O{constructor(){super(...arguments),this.data=null,this.topOnly=!1}onCardClick(e){this.dispatchEvent(new CustomEvent("zoom-to-block",{detail:e.detail,bubbles:!0,composed:!0}))}renderPriceTiles(){if(!this.data)return x;const e=this.data.solarForecastTotal,t=this.data.solarForecastTomorrow,i=this.data.solarForecastStale,r=e>0||t>0,a=this.data.whatIf,n=(a==null?void 0:a.totalSavings)??null,o=(a==null?void 0:a.totalCost)??null,l=n==null?"":n>=.005?"pos":n<=-.005?"neg":"";return s`
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

      <div class="price-tile savings">
        <div class="price-tile-label">💰 Úspora vs Home I</div>
        <div class="price-tile-value ${l}">
          ${n!=null?s`${n>=0?"+":""}${n.toFixed(0)} <span class="price-tile-unit">Kč</span>`:s`-- <span class="price-tile-unit">Kč</span>`}
        </div>
        <div class="price-tile-sub">
          ${o!=null?`Náklady ${o.toFixed(0)} Kč`:x}
        </div>
      </div>

      <div class="price-tile solar">
        <div class="price-tile-label">☀ Solár předpověď</div>
        <div class="price-tile-value">
          ${r?s`${i?"⚠ ":""}${e.toFixed(1)} <span class="price-tile-unit">kWh</span>`:s`-- <span class="price-tile-unit">kWh</span>`}
        </div>
        <div class="price-tile-sub">
          ${r?i?"Zastaralá":`Zítra ${t.toFixed(1)} kWh`:"Nedostupná"}
        </div>
      </div>
    `}renderBlockCard(e,t,i,r){return t?s`
      <oig-stats-card
        title=${e}
        .value=${t.avg}
        unit="Kč/kWh"
        .time=${nb(t)}
        variant=${i}
        clickable
        .startTime=${t.start}
        .endTime=${t.end}
        .sparklineValues=${t.values}
        .sparklineColor=${r}
        @card-click=${this.onCardClick}
      ></oig-stats-card>
    `:x}renderExtremeBlocks(){if(!this.data)return x;const{cheapestBuyBlock:e,expensiveBuyBlock:t,bestExportBlock:i,worstExportBlock:r}=this.data;return s`
      ${this.renderBlockCard("Nejlevnější nákup",e,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejdražší nákup",t,"danger","rgba(244, 67, 54, 1)")}
      ${this.renderBlockCard("Nejlepší výkup",i,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejhorší výkup",r,"warning","rgba(255, 167, 38, 1)")}
    `}renderPlannedConsumption(){var o;const e=(o=this.data)==null?void 0:o.plannedConsumption;if(!e)return x;const t=e.todayTotalKwh,i=e.tomorrowKwh,r=t+(i||0),a=r>0?t/r*100:50,n=r>0?(i||0)/r*100:50;return s`
      <div class="planned-section">
        <div class="section-label" style="margin-bottom: 8px;">Plánovaná spotřeba (dnes + zítra)</div>
        <div class="planned-header">
          <div>
            <div class="planned-main-value">
              ${r>0?s`${r.toFixed(1)} <span class="unit">kWh</span>`:"--"}
            </div>
            <div class="planned-profile">${e.profile}</div>
          </div>
          ${e.trendText?s`<div class="planned-trend">${e.trendText}</div>`:x}
        </div>

        <div class="planned-details">
          <div class="planned-detail-item">
            <div class="planned-detail-label">Dnes spotřebováno</div>
            <div class="planned-detail-value">${e.todayConsumedKwh.toFixed(1)} kWh</div>
          </div>
          <div class="planned-detail-item">
            <div class="planned-detail-label">Dnes zbývá</div>
            <div class="planned-detail-value">
              ${e.todayPlannedKwh!=null?`${e.todayPlannedKwh.toFixed(1)} kWh`:"--"}
            </div>
          </div>
          <div class="planned-detail-item">
            <div class="planned-detail-label">Zítra plán</div>
            <div class="planned-detail-value">
              ${i!=null?`${i.toFixed(1)} kWh`:"--"}
            </div>
          </div>
        </div>

        ${r>0?s`
              <div class="planned-bars">
                <div class="bar-today" style="width: ${a}%"></div>
                <div class="bar-tomorrow" style="width: ${n}%"></div>
              </div>
              <div class="bar-labels">
                <span>Dnes celkem: ${t.toFixed(1)}</span>
                <span>Zítra: ${i!=null?i.toFixed(1):"--"}</span>
              </div>
            `:x}
      </div>
    `}render(){return!this.data||this.data.timeline.length===0?this.topOnly?x:s`<div style="color: ${d.textSecondary}; padding: 16px;">Načítání cenových dat...</div>`:this.topOnly?s`
        <div class="top-row">
          ${this.renderPriceTiles()}
          ${this.renderExtremeBlocks()}
        </div>
      `:s`${this.renderPlannedConsumption()}`}};Yr.styles=z`
    :host {
      display: block;
      margin-bottom: 16px;
    }

    /* Top row: 4 price/summary tiles + 4 extreme blocks.
       minmax(0,…) lets columns shrink below content width so nothing
       overflows the row; price tiles a touch narrower than the blocks. */
    .top-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 0.8fr)) repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 12px;
      align-items: stretch;
    }

    .top-row > * {
      min-width: 0;
    }

    /* Compact price tiles: spot, export, solar */
    .price-tile {
      background: ${$e(d.cardBg)};
      border-radius: 10px;
      padding: 10px 12px;
      box-shadow: ${$e(d.cardShadow)};
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 76px;
    }

    .price-tile.spot {
      background: linear-gradient(135deg, ${$e(d.accent)}22 0%, ${$e(d.accent)}11 100%);
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

    .price-tile.savings {
      background: linear-gradient(135deg, rgba(41, 182, 246, 0.2) 0%, rgba(41, 182, 246, 0.1) 100%);
      border-color: rgba(41, 182, 246, 0.3);
    }

    .price-tile-value.pos { color: #4CAF50; }
    .price-tile-value.neg { color: #F44336; }

    .price-tile-label {
      font-size: 10px;
      color: ${$e(d.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .price-tile-value {
      font-size: 16px;
      font-weight: 700;
      color: ${$e(d.textPrimary)};
      line-height: 1.2;
    }

    .price-tile-unit {
      font-size: 10px;
      font-weight: 400;
      color: ${$e(d.textSecondary)};
      opacity: 0.7;
    }

    .price-tile-sub {
      font-size: 9px;
      color: ${$e(d.textSecondary)};
      opacity: 0.55;
      margin-top: 3px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: ${$e(d.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    /* Planned consumption */
    .planned-section {
      background: ${$e(d.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: ${$e(d.cardShadow)};
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
      color: ${$e(d.textPrimary)};
    }

    .planned-main-value .unit {
      font-size: 12px;
      font-weight: 400;
      color: ${$e(d.textSecondary)};
    }

    .planned-trend {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
    }

    .planned-profile {
      font-size: 11px;
      color: ${$e(d.textSecondary)};
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
      color: ${$e(d.textSecondary)};
      text-transform: uppercase;
    }

    .planned-detail-value {
      font-size: 14px;
      font-weight: 600;
      color: ${$e(d.textPrimary)};
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
      color: ${$e(d.textSecondary)};
    }


    /* Nest Hub / tablets: 4 tiles per row (price tiles row, then blocks row) */
    @media (max-width: 1100px) {
      .top-row {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }

    /* Phones: 2 per row */
    @media (max-width: 560px) {
      .top-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 700px) {
      .planned-details {
        grid-template-columns: 1fr 1fr;
      }
      .bottom-row {
        grid-template-columns: 1fr;
      }
    }
  `;ze([m({type:Object})],Yr.prototype,"data",2);ze([m({type:Boolean})],Yr.prototype,"topOnly",2);Yr=ze([E("oig-pricing-stats")],Yr);const Vd=6048e5,ob=864e5,pa=6e4,ua=36e5,sb=1e3,al=Symbol.for("constructDateFrom");function Te(e,t){return typeof e=="function"?e(t):e&&typeof e=="object"&&al in e?e[al](t):e instanceof Date?new e.constructor(t):new Date(t)}function te(e,t){return Te(t||e,e)}function zn(e,t,i){const r=te(e,i==null?void 0:i.in);return isNaN(t)?Te((i==null?void 0:i.in)||e,NaN):(t&&r.setDate(r.getDate()+t),r)}function Zo(e,t,i){const r=te(e,i==null?void 0:i.in);if(isNaN(t))return Te(e,NaN);if(!t)return r;const a=r.getDate(),n=Te(e,r.getTime());n.setMonth(r.getMonth()+t+1,0);const o=n.getDate();return a>=o?n:(r.setFullYear(n.getFullYear(),n.getMonth(),a),r)}function qo(e,t,i){return Te(e,+te(e)+t)}function lb(e,t,i){return qo(e,t*ua)}let db={};function Mi(){return db}function wt(e,t){var l,c,p,u;const i=Mi(),r=(t==null?void 0:t.weekStartsOn)??((c=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:c.weekStartsOn)??i.weekStartsOn??((u=(p=i.locale)==null?void 0:p.options)==null?void 0:u.weekStartsOn)??0,a=te(e,t==null?void 0:t.in),n=a.getDay(),o=(n<r?7:0)+n-r;return a.setDate(a.getDate()-o),a.setHours(0,0,0,0),a}function Ji(e,t){return wt(e,{...t,weekStartsOn:1})}function zd(e,t){const i=te(e,t==null?void 0:t.in),r=i.getFullYear(),a=Te(i,0);a.setFullYear(r+1,0,4),a.setHours(0,0,0,0);const n=Ji(a),o=Te(i,0);o.setFullYear(r,0,4),o.setHours(0,0,0,0);const l=Ji(o);return i.getTime()>=n.getTime()?r+1:i.getTime()>=l.getTime()?r:r-1}function dn(e){const t=te(e),i=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()));return i.setUTCFullYear(t.getFullYear()),+e-+i}function Ai(e,...t){const i=Te.bind(null,t.find(r=>typeof r=="object"));return t.map(i)}function Po(e,t){const i=te(e,t==null?void 0:t.in);return i.setHours(0,0,0,0),i}function Dd(e,t,i){const[r,a]=Ai(i==null?void 0:i.in,e,t),n=Po(r),o=Po(a),l=+n-dn(n),c=+o-dn(o);return Math.round((l-c)/ob)}function cb(e,t){const i=zd(e,t),r=Te(e,0);return r.setFullYear(i,0,4),r.setHours(0,0,0,0),Ji(r)}function pb(e,t,i){const r=te(e,i==null?void 0:i.in);return r.setTime(r.getTime()+t*pa),r}function ub(e,t,i){return Zo(e,t*3,i)}function hb(e,t,i){return qo(e,t*1e3)}function gb(e,t,i){return zn(e,t*7,i)}function bb(e,t,i){return Zo(e,t*12,i)}function Wr(e,t){const i=+te(e)-+te(t);return i<0?-1:i>0?1:i}function fb(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function Od(e){return!(!fb(e)&&typeof e!="number"||isNaN(+te(e)))}function mb(e,t,i){const[r,a]=Ai(i==null?void 0:i.in,e,t),n=r.getFullYear()-a.getFullYear(),o=r.getMonth()-a.getMonth();return n*12+o}function vb(e,t,i){const[r,a]=Ai(i==null?void 0:i.in,e,t);return r.getFullYear()-a.getFullYear()}function Ed(e,t,i){const[r,a]=Ai(i==null?void 0:i.in,e,t),n=nl(r,a),o=Math.abs(Dd(r,a));r.setDate(r.getDate()-n*o);const l=+(nl(r,a)===-n),c=n*(o-l);return c===0?0:c}function nl(e,t){const i=e.getFullYear()-t.getFullYear()||e.getMonth()-t.getMonth()||e.getDate()-t.getDate()||e.getHours()-t.getHours()||e.getMinutes()-t.getMinutes()||e.getSeconds()-t.getSeconds()||e.getMilliseconds()-t.getMilliseconds();return i<0?-1:i>0?1:i}function ha(e){return t=>{const r=(e?Math[e]:Math.trunc)(t);return r===0?0:r}}function yb(e,t,i){const[r,a]=Ai(i==null?void 0:i.in,e,t),n=(+r-+a)/ua;return ha(i==null?void 0:i.roundingMethod)(n)}function Go(e,t){return+te(e)-+te(t)}function xb(e,t,i){const r=Go(e,t)/pa;return ha(i==null?void 0:i.roundingMethod)(r)}function Id(e,t){const i=te(e,t==null?void 0:t.in);return i.setHours(23,59,59,999),i}function Fd(e,t){const i=te(e,t==null?void 0:t.in),r=i.getMonth();return i.setFullYear(i.getFullYear(),r+1,0),i.setHours(23,59,59,999),i}function wb(e,t){const i=te(e,t==null?void 0:t.in);return+Id(i,t)==+Fd(i,t)}function Bd(e,t,i){const[r,a,n]=Ai(i==null?void 0:i.in,e,e,t),o=Wr(a,n),l=Math.abs(mb(a,n));if(l<1)return 0;a.getMonth()===1&&a.getDate()>27&&a.setDate(30),a.setMonth(a.getMonth()-o*l);let c=Wr(a,n)===-o;wb(r)&&l===1&&Wr(r,n)===1&&(c=!1);const p=o*(l-+c);return p===0?0:p}function _b(e,t,i){const r=Bd(e,t,i)/3;return ha(i==null?void 0:i.roundingMethod)(r)}function $b(e,t,i){const r=Go(e,t)/1e3;return ha(i==null?void 0:i.roundingMethod)(r)}function kb(e,t,i){const r=Ed(e,t,i)/7;return ha(i==null?void 0:i.roundingMethod)(r)}function Cb(e,t,i){const[r,a]=Ai(i==null?void 0:i.in,e,t),n=Wr(r,a),o=Math.abs(vb(r,a));r.setFullYear(1584),a.setFullYear(1584);const l=Wr(r,a)===-n,c=n*(o-+l);return c===0?0:c}function Sb(e,t){const i=te(e,t==null?void 0:t.in),r=i.getMonth(),a=r-r%3;return i.setMonth(a,1),i.setHours(0,0,0,0),i}function Mb(e,t){const i=te(e,t==null?void 0:t.in);return i.setDate(1),i.setHours(0,0,0,0),i}function Ab(e,t){const i=te(e,t==null?void 0:t.in),r=i.getFullYear();return i.setFullYear(r+1,0,0),i.setHours(23,59,59,999),i}function jd(e,t){const i=te(e,t==null?void 0:t.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}function Lb(e,t){const i=te(e,t==null?void 0:t.in);return i.setMinutes(59,59,999),i}function Tb(e,t){var l,c;const i=Mi(),r=i.weekStartsOn??((c=(l=i.locale)==null?void 0:l.options)==null?void 0:c.weekStartsOn)??0,a=te(e,t==null?void 0:t.in),n=a.getDay(),o=(n<r?-7:0)+6-(n-r);return a.setDate(a.getDate()+o),a.setHours(23,59,59,999),a}function Pb(e,t){const i=te(e,t==null?void 0:t.in);return i.setSeconds(59,999),i}function Hb(e,t){const i=te(e,t==null?void 0:t.in),r=i.getMonth(),a=r-r%3+3;return i.setMonth(a,0),i.setHours(23,59,59,999),i}function Vb(e,t){const i=te(e,t==null?void 0:t.in);return i.setMilliseconds(999),i}const zb={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},Db=(e,t,i)=>{let r;const a=zb[e];return typeof a=="string"?r=a:t===1?r=a.one:r=a.other.replace("{{count}}",t.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+r:r+" ago":r};function lo(e){return(t={})=>{const i=t.width?String(t.width):e.defaultWidth;return e.formats[i]||e.formats[e.defaultWidth]}}const Ob={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},Eb={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},Ib={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},Fb={date:lo({formats:Ob,defaultWidth:"full"}),time:lo({formats:Eb,defaultWidth:"full"}),dateTime:lo({formats:Ib,defaultWidth:"full"})},Bb={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},jb=(e,t,i,r)=>Bb[e];function Hr(e){return(t,i)=>{const r=i!=null&&i.context?String(i.context):"standalone";let a;if(r==="formatting"&&e.formattingValues){const o=e.defaultFormattingWidth||e.defaultWidth,l=i!=null&&i.width?String(i.width):o;a=e.formattingValues[l]||e.formattingValues[o]}else{const o=e.defaultWidth,l=i!=null&&i.width?String(i.width):e.defaultWidth;a=e.values[l]||e.values[o]}const n=e.argumentCallback?e.argumentCallback(t):t;return a[n]}}const Nb={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},Rb={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},Wb={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},Kb={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},Zb={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},qb={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},Gb=(e,t)=>{const i=Number(e),r=i%100;if(r>20||r<10)switch(r%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},Ub={ordinalNumber:Gb,era:Hr({values:Nb,defaultWidth:"wide"}),quarter:Hr({values:Rb,defaultWidth:"wide",argumentCallback:e=>e-1}),month:Hr({values:Wb,defaultWidth:"wide"}),day:Hr({values:Kb,defaultWidth:"wide"}),dayPeriod:Hr({values:Zb,defaultWidth:"wide",formattingValues:qb,defaultFormattingWidth:"wide"})};function Vr(e){return(t,i={})=>{const r=i.width,a=r&&e.matchPatterns[r]||e.matchPatterns[e.defaultMatchWidth],n=t.match(a);if(!n)return null;const o=n[0],l=r&&e.parsePatterns[r]||e.parsePatterns[e.defaultParseWidth],c=Array.isArray(l)?Qb(l,h=>h.test(o)):Yb(l,h=>h.test(o));let p;p=e.valueCallback?e.valueCallback(c):c,p=i.valueCallback?i.valueCallback(p):p;const u=t.slice(o.length);return{value:p,rest:u}}}function Yb(e,t){for(const i in e)if(Object.prototype.hasOwnProperty.call(e,i)&&t(e[i]))return i}function Qb(e,t){for(let i=0;i<e.length;i++)if(t(e[i]))return i}function Xb(e){return(t,i={})=>{const r=t.match(e.matchPattern);if(!r)return null;const a=r[0],n=t.match(e.parsePattern);if(!n)return null;let o=e.valueCallback?e.valueCallback(n[0]):n[0];o=i.valueCallback?i.valueCallback(o):o;const l=t.slice(a.length);return{value:o,rest:l}}}const Jb=/^(\d+)(th|st|nd|rd)?/i,ef=/\d+/i,tf={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},rf={any:[/^b/i,/^(a|c)/i]},af={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},nf={any:[/1/i,/2/i,/3/i,/4/i]},of={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},sf={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},lf={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},df={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},cf={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},pf={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},uf={ordinalNumber:Xb({matchPattern:Jb,parsePattern:ef,valueCallback:e=>parseInt(e,10)}),era:Vr({matchPatterns:tf,defaultMatchWidth:"wide",parsePatterns:rf,defaultParseWidth:"any"}),quarter:Vr({matchPatterns:af,defaultMatchWidth:"wide",parsePatterns:nf,defaultParseWidth:"any",valueCallback:e=>e+1}),month:Vr({matchPatterns:of,defaultMatchWidth:"wide",parsePatterns:sf,defaultParseWidth:"any"}),day:Vr({matchPatterns:lf,defaultMatchWidth:"wide",parsePatterns:df,defaultParseWidth:"any"}),dayPeriod:Vr({matchPatterns:cf,defaultMatchWidth:"any",parsePatterns:pf,defaultParseWidth:"any"})},Nd={code:"en-US",formatDistance:Db,formatLong:Fb,formatRelative:jb,localize:Ub,match:uf,options:{weekStartsOn:0,firstWeekContainsDate:1}};function hf(e,t){const i=te(e,t==null?void 0:t.in);return Dd(i,jd(i))+1}function Rd(e,t){const i=te(e,t==null?void 0:t.in),r=+Ji(i)-+cb(i);return Math.round(r/Vd)+1}function Uo(e,t){var u,h,g,v;const i=te(e,t==null?void 0:t.in),r=i.getFullYear(),a=Mi(),n=(t==null?void 0:t.firstWeekContainsDate)??((h=(u=t==null?void 0:t.locale)==null?void 0:u.options)==null?void 0:h.firstWeekContainsDate)??a.firstWeekContainsDate??((v=(g=a.locale)==null?void 0:g.options)==null?void 0:v.firstWeekContainsDate)??1,o=Te((t==null?void 0:t.in)||e,0);o.setFullYear(r+1,0,n),o.setHours(0,0,0,0);const l=wt(o,t),c=Te((t==null?void 0:t.in)||e,0);c.setFullYear(r,0,n),c.setHours(0,0,0,0);const p=wt(c,t);return+i>=+l?r+1:+i>=+p?r:r-1}function gf(e,t){var l,c,p,u;const i=Mi(),r=(t==null?void 0:t.firstWeekContainsDate)??((c=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:c.firstWeekContainsDate)??i.firstWeekContainsDate??((u=(p=i.locale)==null?void 0:p.options)==null?void 0:u.firstWeekContainsDate)??1,a=Uo(e,t),n=Te((t==null?void 0:t.in)||e,0);return n.setFullYear(a,0,r),n.setHours(0,0,0,0),wt(n,t)}function Wd(e,t){const i=te(e,t==null?void 0:t.in),r=+wt(i,t)-+gf(i,t);return Math.round(r/Vd)+1}function he(e,t){const i=e<0?"-":"",r=Math.abs(e).toString().padStart(t,"0");return i+r}const Dt={y(e,t){const i=e.getFullYear(),r=i>0?i:1-i;return he(t==="yy"?r%100:r,t.length)},M(e,t){const i=e.getMonth();return t==="M"?String(i+1):he(i+1,2)},d(e,t){return he(e.getDate(),t.length)},a(e,t){const i=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(e,t){return he(e.getHours()%12||12,t.length)},H(e,t){return he(e.getHours(),t.length)},m(e,t){return he(e.getMinutes(),t.length)},s(e,t){return he(e.getSeconds(),t.length)},S(e,t){const i=t.length,r=e.getMilliseconds(),a=Math.trunc(r*Math.pow(10,i-3));return he(a,t.length)}},zi={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},ol={G:function(e,t,i){const r=e.getFullYear()>0?1:0;switch(t){case"G":case"GG":case"GGG":return i.era(r,{width:"abbreviated"});case"GGGGG":return i.era(r,{width:"narrow"});case"GGGG":default:return i.era(r,{width:"wide"})}},y:function(e,t,i){if(t==="yo"){const r=e.getFullYear(),a=r>0?r:1-r;return i.ordinalNumber(a,{unit:"year"})}return Dt.y(e,t)},Y:function(e,t,i,r){const a=Uo(e,r),n=a>0?a:1-a;if(t==="YY"){const o=n%100;return he(o,2)}return t==="Yo"?i.ordinalNumber(n,{unit:"year"}):he(n,t.length)},R:function(e,t){const i=zd(e);return he(i,t.length)},u:function(e,t){const i=e.getFullYear();return he(i,t.length)},Q:function(e,t,i){const r=Math.ceil((e.getMonth()+1)/3);switch(t){case"Q":return String(r);case"QQ":return he(r,2);case"Qo":return i.ordinalNumber(r,{unit:"quarter"});case"QQQ":return i.quarter(r,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(r,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(r,{width:"wide",context:"formatting"})}},q:function(e,t,i){const r=Math.ceil((e.getMonth()+1)/3);switch(t){case"q":return String(r);case"qq":return he(r,2);case"qo":return i.ordinalNumber(r,{unit:"quarter"});case"qqq":return i.quarter(r,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(r,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(r,{width:"wide",context:"standalone"})}},M:function(e,t,i){const r=e.getMonth();switch(t){case"M":case"MM":return Dt.M(e,t);case"Mo":return i.ordinalNumber(r+1,{unit:"month"});case"MMM":return i.month(r,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(r,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(r,{width:"wide",context:"formatting"})}},L:function(e,t,i){const r=e.getMonth();switch(t){case"L":return String(r+1);case"LL":return he(r+1,2);case"Lo":return i.ordinalNumber(r+1,{unit:"month"});case"LLL":return i.month(r,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(r,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(r,{width:"wide",context:"standalone"})}},w:function(e,t,i,r){const a=Wd(e,r);return t==="wo"?i.ordinalNumber(a,{unit:"week"}):he(a,t.length)},I:function(e,t,i){const r=Rd(e);return t==="Io"?i.ordinalNumber(r,{unit:"week"}):he(r,t.length)},d:function(e,t,i){return t==="do"?i.ordinalNumber(e.getDate(),{unit:"date"}):Dt.d(e,t)},D:function(e,t,i){const r=hf(e);return t==="Do"?i.ordinalNumber(r,{unit:"dayOfYear"}):he(r,t.length)},E:function(e,t,i){const r=e.getDay();switch(t){case"E":case"EE":case"EEE":return i.day(r,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(r,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(r,{width:"short",context:"formatting"});case"EEEE":default:return i.day(r,{width:"wide",context:"formatting"})}},e:function(e,t,i,r){const a=e.getDay(),n=(a-r.weekStartsOn+8)%7||7;switch(t){case"e":return String(n);case"ee":return he(n,2);case"eo":return i.ordinalNumber(n,{unit:"day"});case"eee":return i.day(a,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(a,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(a,{width:"short",context:"formatting"});case"eeee":default:return i.day(a,{width:"wide",context:"formatting"})}},c:function(e,t,i,r){const a=e.getDay(),n=(a-r.weekStartsOn+8)%7||7;switch(t){case"c":return String(n);case"cc":return he(n,t.length);case"co":return i.ordinalNumber(n,{unit:"day"});case"ccc":return i.day(a,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(a,{width:"narrow",context:"standalone"});case"cccccc":return i.day(a,{width:"short",context:"standalone"});case"cccc":default:return i.day(a,{width:"wide",context:"standalone"})}},i:function(e,t,i){const r=e.getDay(),a=r===0?7:r;switch(t){case"i":return String(a);case"ii":return he(a,t.length);case"io":return i.ordinalNumber(a,{unit:"day"});case"iii":return i.day(r,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(r,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(r,{width:"short",context:"formatting"});case"iiii":default:return i.day(r,{width:"wide",context:"formatting"})}},a:function(e,t,i){const a=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.dayPeriod(a,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(a,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(a,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(a,{width:"wide",context:"formatting"})}},b:function(e,t,i){const r=e.getHours();let a;switch(r===12?a=zi.noon:r===0?a=zi.midnight:a=r/12>=1?"pm":"am",t){case"b":case"bb":return i.dayPeriod(a,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(a,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(a,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(a,{width:"wide",context:"formatting"})}},B:function(e,t,i){const r=e.getHours();let a;switch(r>=17?a=zi.evening:r>=12?a=zi.afternoon:r>=4?a=zi.morning:a=zi.night,t){case"B":case"BB":case"BBB":return i.dayPeriod(a,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(a,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(a,{width:"wide",context:"formatting"})}},h:function(e,t,i){if(t==="ho"){let r=e.getHours()%12;return r===0&&(r=12),i.ordinalNumber(r,{unit:"hour"})}return Dt.h(e,t)},H:function(e,t,i){return t==="Ho"?i.ordinalNumber(e.getHours(),{unit:"hour"}):Dt.H(e,t)},K:function(e,t,i){const r=e.getHours()%12;return t==="Ko"?i.ordinalNumber(r,{unit:"hour"}):he(r,t.length)},k:function(e,t,i){let r=e.getHours();return r===0&&(r=24),t==="ko"?i.ordinalNumber(r,{unit:"hour"}):he(r,t.length)},m:function(e,t,i){return t==="mo"?i.ordinalNumber(e.getMinutes(),{unit:"minute"}):Dt.m(e,t)},s:function(e,t,i){return t==="so"?i.ordinalNumber(e.getSeconds(),{unit:"second"}):Dt.s(e,t)},S:function(e,t){return Dt.S(e,t)},X:function(e,t,i){const r=e.getTimezoneOffset();if(r===0)return"Z";switch(t){case"X":return ll(r);case"XXXX":case"XX":return pi(r);case"XXXXX":case"XXX":default:return pi(r,":")}},x:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"x":return ll(r);case"xxxx":case"xx":return pi(r);case"xxxxx":case"xxx":default:return pi(r,":")}},O:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"O":case"OO":case"OOO":return"GMT"+sl(r,":");case"OOOO":default:return"GMT"+pi(r,":")}},z:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"z":case"zz":case"zzz":return"GMT"+sl(r,":");case"zzzz":default:return"GMT"+pi(r,":")}},t:function(e,t,i){const r=Math.trunc(+e/1e3);return he(r,t.length)},T:function(e,t,i){return he(+e,t.length)}};function sl(e,t=""){const i=e>0?"-":"+",r=Math.abs(e),a=Math.trunc(r/60),n=r%60;return n===0?i+String(a):i+String(a)+t+he(n,2)}function ll(e,t){return e%60===0?(e>0?"-":"+")+he(Math.abs(e)/60,2):pi(e,t)}function pi(e,t=""){const i=e>0?"-":"+",r=Math.abs(e),a=he(Math.trunc(r/60),2),n=he(r%60,2);return i+a+t+n}const dl=(e,t)=>{switch(e){case"P":return t.date({width:"short"});case"PP":return t.date({width:"medium"});case"PPP":return t.date({width:"long"});case"PPPP":default:return t.date({width:"full"})}},Kd=(e,t)=>{switch(e){case"p":return t.time({width:"short"});case"pp":return t.time({width:"medium"});case"ppp":return t.time({width:"long"});case"pppp":default:return t.time({width:"full"})}},bf=(e,t)=>{const i=e.match(/(P+)(p+)?/)||[],r=i[1],a=i[2];if(!a)return dl(e,t);let n;switch(r){case"P":n=t.dateTime({width:"short"});break;case"PP":n=t.dateTime({width:"medium"});break;case"PPP":n=t.dateTime({width:"long"});break;case"PPPP":default:n=t.dateTime({width:"full"});break}return n.replace("{{date}}",dl(r,t)).replace("{{time}}",Kd(a,t))},Ho={p:Kd,P:bf},ff=/^D+$/,mf=/^Y+$/,vf=["D","DD","YY","YYYY"];function Zd(e){return ff.test(e)}function qd(e){return mf.test(e)}function Vo(e,t,i){const r=yf(e,t,i);if(console.warn(r),vf.includes(e))throw new RangeError(r)}function yf(e,t,i){const r=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${t}\`) for formatting ${r} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const xf=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,wf=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,_f=/^'([^]*?)'?$/,$f=/''/g,kf=/[a-zA-Z]/;function Cf(e,t,i){var u,h,g,v,f,b,$,_;const r=Mi(),a=(i==null?void 0:i.locale)??r.locale??Nd,n=(i==null?void 0:i.firstWeekContainsDate)??((h=(u=i==null?void 0:i.locale)==null?void 0:u.options)==null?void 0:h.firstWeekContainsDate)??r.firstWeekContainsDate??((v=(g=r.locale)==null?void 0:g.options)==null?void 0:v.firstWeekContainsDate)??1,o=(i==null?void 0:i.weekStartsOn)??((b=(f=i==null?void 0:i.locale)==null?void 0:f.options)==null?void 0:b.weekStartsOn)??r.weekStartsOn??((_=($=r.locale)==null?void 0:$.options)==null?void 0:_.weekStartsOn)??0,l=te(e,i==null?void 0:i.in);if(!Od(l))throw new RangeError("Invalid time value");let c=t.match(wf).map(w=>{const C=w[0];if(C==="p"||C==="P"){const D=Ho[C];return D(w,a.formatLong)}return w}).join("").match(xf).map(w=>{if(w==="''")return{isToken:!1,value:"'"};const C=w[0];if(C==="'")return{isToken:!1,value:Sf(w)};if(ol[C])return{isToken:!0,value:w};if(C.match(kf))throw new RangeError("Format string contains an unescaped latin alphabet character `"+C+"`");return{isToken:!1,value:w}});a.localize.preprocessor&&(c=a.localize.preprocessor(l,c));const p={firstWeekContainsDate:n,weekStartsOn:o,locale:a};return c.map(w=>{if(!w.isToken)return w.value;const C=w.value;(!(i!=null&&i.useAdditionalWeekYearTokens)&&qd(C)||!(i!=null&&i.useAdditionalDayOfYearTokens)&&Zd(C))&&Vo(C,t,String(e));const D=ol[C[0]];return D(l,C,a.localize,p)}).join("")}function Sf(e){const t=e.match(_f);return t?t[1].replace($f,"'"):e}function Mf(){return Object.assign({},Mi())}function Af(e,t){const i=te(e,t==null?void 0:t.in).getDay();return i===0?7:i}function Lf(e,t){const i=Tf(t)?new t(0):Te(t,0);return i.setFullYear(e.getFullYear(),e.getMonth(),e.getDate()),i.setHours(e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()),i}function Tf(e){var t;return typeof e=="function"&&((t=e.prototype)==null?void 0:t.constructor)===e}const Pf=10;class Gd{constructor(){B(this,"subPriority",0)}validate(t,i){return!0}}class Hf extends Gd{constructor(t,i,r,a,n){super(),this.value=t,this.validateValue=i,this.setValue=r,this.priority=a,n&&(this.subPriority=n)}validate(t,i){return this.validateValue(t,this.value,i)}set(t,i,r){return this.setValue(t,i,this.value,r)}}class Vf extends Gd{constructor(i,r){super();B(this,"priority",Pf);B(this,"subPriority",-1);this.context=i||(a=>Te(r,a))}set(i,r){return r.timestampIsSet?i:Te(i,Lf(i,this.context))}}class pe{run(t,i,r,a){const n=this.parse(t,i,r,a);return n?{setter:new Hf(n.value,this.validate,this.set,this.priority,this.subPriority),rest:n.rest}:null}validate(t,i,r){return!0}}class zf extends pe{constructor(){super(...arguments);B(this,"priority",140);B(this,"incompatibleTokens",["R","u","t","T"])}parse(i,r,a){switch(r){case"G":case"GG":case"GGG":return a.era(i,{width:"abbreviated"})||a.era(i,{width:"narrow"});case"GGGGG":return a.era(i,{width:"narrow"});case"GGGG":default:return a.era(i,{width:"wide"})||a.era(i,{width:"abbreviated"})||a.era(i,{width:"narrow"})}}set(i,r,a){return r.era=a,i.setFullYear(a,0,1),i.setHours(0,0,0,0),i}}const He={month:/^(1[0-2]|0?\d)/,date:/^(3[0-1]|[0-2]?\d)/,dayOfYear:/^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,week:/^(5[0-3]|[0-4]?\d)/,hour23h:/^(2[0-3]|[0-1]?\d)/,hour24h:/^(2[0-4]|[0-1]?\d)/,hour11h:/^(1[0-1]|0?\d)/,hour12h:/^(1[0-2]|0?\d)/,minute:/^[0-5]?\d/,second:/^[0-5]?\d/,singleDigit:/^\d/,twoDigits:/^\d{1,2}/,threeDigits:/^\d{1,3}/,fourDigits:/^\d{1,4}/,anyDigitsSigned:/^-?\d+/,singleDigitSigned:/^-?\d/,twoDigitsSigned:/^-?\d{1,2}/,threeDigitsSigned:/^-?\d{1,3}/,fourDigitsSigned:/^-?\d{1,4}/},vt={basicOptionalMinutes:/^([+-])(\d{2})(\d{2})?|Z/,basic:/^([+-])(\d{2})(\d{2})|Z/,basicOptionalSeconds:/^([+-])(\d{2})(\d{2})((\d{2}))?|Z/,extended:/^([+-])(\d{2}):(\d{2})|Z/,extendedOptionalSeconds:/^([+-])(\d{2}):(\d{2})(:(\d{2}))?|Z/};function Ve(e,t){return e&&{value:t(e.value),rest:e.rest}}function ke(e,t){const i=t.match(e);return i?{value:parseInt(i[0],10),rest:t.slice(i[0].length)}:null}function yt(e,t){const i=t.match(e);if(!i)return null;if(i[0]==="Z")return{value:0,rest:t.slice(1)};const r=i[1]==="+"?1:-1,a=i[2]?parseInt(i[2],10):0,n=i[3]?parseInt(i[3],10):0,o=i[5]?parseInt(i[5],10):0;return{value:r*(a*ua+n*pa+o*sb),rest:t.slice(i[0].length)}}function Ud(e){return ke(He.anyDigitsSigned,e)}function Pe(e,t){switch(e){case 1:return ke(He.singleDigit,t);case 2:return ke(He.twoDigits,t);case 3:return ke(He.threeDigits,t);case 4:return ke(He.fourDigits,t);default:return ke(new RegExp("^\\d{1,"+e+"}"),t)}}function cn(e,t){switch(e){case 1:return ke(He.singleDigitSigned,t);case 2:return ke(He.twoDigitsSigned,t);case 3:return ke(He.threeDigitsSigned,t);case 4:return ke(He.fourDigitsSigned,t);default:return ke(new RegExp("^-?\\d{1,"+e+"}"),t)}}function Yo(e){switch(e){case"morning":return 4;case"evening":return 17;case"pm":case"noon":case"afternoon":return 12;case"am":case"midnight":case"night":default:return 0}}function Yd(e,t){const i=t>0,r=i?t:1-t;let a;if(r<=50)a=e||100;else{const n=r+50,o=Math.trunc(n/100)*100,l=e>=n%100;a=e+o-(l?100:0)}return i?a:1-a}function Qd(e){return e%400===0||e%4===0&&e%100!==0}class Df extends pe{constructor(){super(...arguments);B(this,"priority",130);B(this,"incompatibleTokens",["Y","R","u","w","I","i","e","c","t","T"])}parse(i,r,a){const n=o=>({year:o,isTwoDigitYear:r==="yy"});switch(r){case"y":return Ve(Pe(4,i),n);case"yo":return Ve(a.ordinalNumber(i,{unit:"year"}),n);default:return Ve(Pe(r.length,i),n)}}validate(i,r){return r.isTwoDigitYear||r.year>0}set(i,r,a){const n=i.getFullYear();if(a.isTwoDigitYear){const l=Yd(a.year,n);return i.setFullYear(l,0,1),i.setHours(0,0,0,0),i}const o=!("era"in r)||r.era===1?a.year:1-a.year;return i.setFullYear(o,0,1),i.setHours(0,0,0,0),i}}class Of extends pe{constructor(){super(...arguments);B(this,"priority",130);B(this,"incompatibleTokens",["y","R","u","Q","q","M","L","I","d","D","i","t","T"])}parse(i,r,a){const n=o=>({year:o,isTwoDigitYear:r==="YY"});switch(r){case"Y":return Ve(Pe(4,i),n);case"Yo":return Ve(a.ordinalNumber(i,{unit:"year"}),n);default:return Ve(Pe(r.length,i),n)}}validate(i,r){return r.isTwoDigitYear||r.year>0}set(i,r,a,n){const o=Uo(i,n);if(a.isTwoDigitYear){const c=Yd(a.year,o);return i.setFullYear(c,0,n.firstWeekContainsDate),i.setHours(0,0,0,0),wt(i,n)}const l=!("era"in r)||r.era===1?a.year:1-a.year;return i.setFullYear(l,0,n.firstWeekContainsDate),i.setHours(0,0,0,0),wt(i,n)}}class Ef extends pe{constructor(){super(...arguments);B(this,"priority",130);B(this,"incompatibleTokens",["G","y","Y","u","Q","q","M","L","w","d","D","e","c","t","T"])}parse(i,r){return cn(r==="R"?4:r.length,i)}set(i,r,a){const n=Te(i,0);return n.setFullYear(a,0,4),n.setHours(0,0,0,0),Ji(n)}}class If extends pe{constructor(){super(...arguments);B(this,"priority",130);B(this,"incompatibleTokens",["G","y","Y","R","w","I","i","e","c","t","T"])}parse(i,r){return cn(r==="u"?4:r.length,i)}set(i,r,a){return i.setFullYear(a,0,1),i.setHours(0,0,0,0),i}}class Ff extends pe{constructor(){super(...arguments);B(this,"priority",120);B(this,"incompatibleTokens",["Y","R","q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,r,a){switch(r){case"Q":case"QQ":return Pe(r.length,i);case"Qo":return a.ordinalNumber(i,{unit:"quarter"});case"QQQ":return a.quarter(i,{width:"abbreviated",context:"formatting"})||a.quarter(i,{width:"narrow",context:"formatting"});case"QQQQQ":return a.quarter(i,{width:"narrow",context:"formatting"});case"QQQQ":default:return a.quarter(i,{width:"wide",context:"formatting"})||a.quarter(i,{width:"abbreviated",context:"formatting"})||a.quarter(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=1&&r<=4}set(i,r,a){return i.setMonth((a-1)*3,1),i.setHours(0,0,0,0),i}}class Bf extends pe{constructor(){super(...arguments);B(this,"priority",120);B(this,"incompatibleTokens",["Y","R","Q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,r,a){switch(r){case"q":case"qq":return Pe(r.length,i);case"qo":return a.ordinalNumber(i,{unit:"quarter"});case"qqq":return a.quarter(i,{width:"abbreviated",context:"standalone"})||a.quarter(i,{width:"narrow",context:"standalone"});case"qqqqq":return a.quarter(i,{width:"narrow",context:"standalone"});case"qqqq":default:return a.quarter(i,{width:"wide",context:"standalone"})||a.quarter(i,{width:"abbreviated",context:"standalone"})||a.quarter(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=1&&r<=4}set(i,r,a){return i.setMonth((a-1)*3,1),i.setHours(0,0,0,0),i}}class jf extends pe{constructor(){super(...arguments);B(this,"incompatibleTokens",["Y","R","q","Q","L","w","I","D","i","e","c","t","T"]);B(this,"priority",110)}parse(i,r,a){const n=o=>o-1;switch(r){case"M":return Ve(ke(He.month,i),n);case"MM":return Ve(Pe(2,i),n);case"Mo":return Ve(a.ordinalNumber(i,{unit:"month"}),n);case"MMM":return a.month(i,{width:"abbreviated",context:"formatting"})||a.month(i,{width:"narrow",context:"formatting"});case"MMMMM":return a.month(i,{width:"narrow",context:"formatting"});case"MMMM":default:return a.month(i,{width:"wide",context:"formatting"})||a.month(i,{width:"abbreviated",context:"formatting"})||a.month(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=11}set(i,r,a){return i.setMonth(a,1),i.setHours(0,0,0,0),i}}class Nf extends pe{constructor(){super(...arguments);B(this,"priority",110);B(this,"incompatibleTokens",["Y","R","q","Q","M","w","I","D","i","e","c","t","T"])}parse(i,r,a){const n=o=>o-1;switch(r){case"L":return Ve(ke(He.month,i),n);case"LL":return Ve(Pe(2,i),n);case"Lo":return Ve(a.ordinalNumber(i,{unit:"month"}),n);case"LLL":return a.month(i,{width:"abbreviated",context:"standalone"})||a.month(i,{width:"narrow",context:"standalone"});case"LLLLL":return a.month(i,{width:"narrow",context:"standalone"});case"LLLL":default:return a.month(i,{width:"wide",context:"standalone"})||a.month(i,{width:"abbreviated",context:"standalone"})||a.month(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=0&&r<=11}set(i,r,a){return i.setMonth(a,1),i.setHours(0,0,0,0),i}}function Rf(e,t,i){const r=te(e,i==null?void 0:i.in),a=Wd(r,i)-t;return r.setDate(r.getDate()-a*7),te(r,i==null?void 0:i.in)}class Wf extends pe{constructor(){super(...arguments);B(this,"priority",100);B(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","i","t","T"])}parse(i,r,a){switch(r){case"w":return ke(He.week,i);case"wo":return a.ordinalNumber(i,{unit:"week"});default:return Pe(r.length,i)}}validate(i,r){return r>=1&&r<=53}set(i,r,a,n){return wt(Rf(i,a,n),n)}}function Kf(e,t,i){const r=te(e,i==null?void 0:i.in),a=Rd(r,i)-t;return r.setDate(r.getDate()-a*7),r}class Zf extends pe{constructor(){super(...arguments);B(this,"priority",100);B(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","e","c","t","T"])}parse(i,r,a){switch(r){case"I":return ke(He.week,i);case"Io":return a.ordinalNumber(i,{unit:"week"});default:return Pe(r.length,i)}}validate(i,r){return r>=1&&r<=53}set(i,r,a){return Ji(Kf(i,a))}}const qf=[31,28,31,30,31,30,31,31,30,31,30,31],Gf=[31,29,31,30,31,30,31,31,30,31,30,31];class Uf extends pe{constructor(){super(...arguments);B(this,"priority",90);B(this,"subPriority",1);B(this,"incompatibleTokens",["Y","R","q","Q","w","I","D","i","e","c","t","T"])}parse(i,r,a){switch(r){case"d":return ke(He.date,i);case"do":return a.ordinalNumber(i,{unit:"date"});default:return Pe(r.length,i)}}validate(i,r){const a=i.getFullYear(),n=Qd(a),o=i.getMonth();return n?r>=1&&r<=Gf[o]:r>=1&&r<=qf[o]}set(i,r,a){return i.setDate(a),i.setHours(0,0,0,0),i}}class Yf extends pe{constructor(){super(...arguments);B(this,"priority",90);B(this,"subpriority",1);B(this,"incompatibleTokens",["Y","R","q","Q","M","L","w","I","d","E","i","e","c","t","T"])}parse(i,r,a){switch(r){case"D":case"DD":return ke(He.dayOfYear,i);case"Do":return a.ordinalNumber(i,{unit:"date"});default:return Pe(r.length,i)}}validate(i,r){const a=i.getFullYear();return Qd(a)?r>=1&&r<=366:r>=1&&r<=365}set(i,r,a){return i.setMonth(0,a),i.setHours(0,0,0,0),i}}function Qo(e,t,i){var h,g,v,f;const r=Mi(),a=(i==null?void 0:i.weekStartsOn)??((g=(h=i==null?void 0:i.locale)==null?void 0:h.options)==null?void 0:g.weekStartsOn)??r.weekStartsOn??((f=(v=r.locale)==null?void 0:v.options)==null?void 0:f.weekStartsOn)??0,n=te(e,i==null?void 0:i.in),o=n.getDay(),c=(t%7+7)%7,p=7-a,u=t<0||t>6?t-(o+p)%7:(c+p)%7-(o+p)%7;return zn(n,u,i)}class Qf extends pe{constructor(){super(...arguments);B(this,"priority",90);B(this,"incompatibleTokens",["D","i","e","c","t","T"])}parse(i,r,a){switch(r){case"E":case"EE":case"EEE":return a.day(i,{width:"abbreviated",context:"formatting"})||a.day(i,{width:"short",context:"formatting"})||a.day(i,{width:"narrow",context:"formatting"});case"EEEEE":return a.day(i,{width:"narrow",context:"formatting"});case"EEEEEE":return a.day(i,{width:"short",context:"formatting"})||a.day(i,{width:"narrow",context:"formatting"});case"EEEE":default:return a.day(i,{width:"wide",context:"formatting"})||a.day(i,{width:"abbreviated",context:"formatting"})||a.day(i,{width:"short",context:"formatting"})||a.day(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=6}set(i,r,a,n){return i=Qo(i,a,n),i.setHours(0,0,0,0),i}}class Xf extends pe{constructor(){super(...arguments);B(this,"priority",90);B(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","c","t","T"])}parse(i,r,a,n){const o=l=>{const c=Math.floor((l-1)/7)*7;return(l+n.weekStartsOn+6)%7+c};switch(r){case"e":case"ee":return Ve(Pe(r.length,i),o);case"eo":return Ve(a.ordinalNumber(i,{unit:"day"}),o);case"eee":return a.day(i,{width:"abbreviated",context:"formatting"})||a.day(i,{width:"short",context:"formatting"})||a.day(i,{width:"narrow",context:"formatting"});case"eeeee":return a.day(i,{width:"narrow",context:"formatting"});case"eeeeee":return a.day(i,{width:"short",context:"formatting"})||a.day(i,{width:"narrow",context:"formatting"});case"eeee":default:return a.day(i,{width:"wide",context:"formatting"})||a.day(i,{width:"abbreviated",context:"formatting"})||a.day(i,{width:"short",context:"formatting"})||a.day(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=6}set(i,r,a,n){return i=Qo(i,a,n),i.setHours(0,0,0,0),i}}class Jf extends pe{constructor(){super(...arguments);B(this,"priority",90);B(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","e","t","T"])}parse(i,r,a,n){const o=l=>{const c=Math.floor((l-1)/7)*7;return(l+n.weekStartsOn+6)%7+c};switch(r){case"c":case"cc":return Ve(Pe(r.length,i),o);case"co":return Ve(a.ordinalNumber(i,{unit:"day"}),o);case"ccc":return a.day(i,{width:"abbreviated",context:"standalone"})||a.day(i,{width:"short",context:"standalone"})||a.day(i,{width:"narrow",context:"standalone"});case"ccccc":return a.day(i,{width:"narrow",context:"standalone"});case"cccccc":return a.day(i,{width:"short",context:"standalone"})||a.day(i,{width:"narrow",context:"standalone"});case"cccc":default:return a.day(i,{width:"wide",context:"standalone"})||a.day(i,{width:"abbreviated",context:"standalone"})||a.day(i,{width:"short",context:"standalone"})||a.day(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=0&&r<=6}set(i,r,a,n){return i=Qo(i,a,n),i.setHours(0,0,0,0),i}}function em(e,t,i){const r=te(e,i==null?void 0:i.in),a=Af(r,i),n=t-a;return zn(r,n,i)}class tm extends pe{constructor(){super(...arguments);B(this,"priority",90);B(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","E","e","c","t","T"])}parse(i,r,a){const n=o=>o===0?7:o;switch(r){case"i":case"ii":return Pe(r.length,i);case"io":return a.ordinalNumber(i,{unit:"day"});case"iii":return Ve(a.day(i,{width:"abbreviated",context:"formatting"})||a.day(i,{width:"short",context:"formatting"})||a.day(i,{width:"narrow",context:"formatting"}),n);case"iiiii":return Ve(a.day(i,{width:"narrow",context:"formatting"}),n);case"iiiiii":return Ve(a.day(i,{width:"short",context:"formatting"})||a.day(i,{width:"narrow",context:"formatting"}),n);case"iiii":default:return Ve(a.day(i,{width:"wide",context:"formatting"})||a.day(i,{width:"abbreviated",context:"formatting"})||a.day(i,{width:"short",context:"formatting"})||a.day(i,{width:"narrow",context:"formatting"}),n)}}validate(i,r){return r>=1&&r<=7}set(i,r,a){return i=em(i,a),i.setHours(0,0,0,0),i}}class im extends pe{constructor(){super(...arguments);B(this,"priority",80);B(this,"incompatibleTokens",["b","B","H","k","t","T"])}parse(i,r,a){switch(r){case"a":case"aa":case"aaa":return a.dayPeriod(i,{width:"abbreviated",context:"formatting"})||a.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaaa":return a.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaa":default:return a.dayPeriod(i,{width:"wide",context:"formatting"})||a.dayPeriod(i,{width:"abbreviated",context:"formatting"})||a.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,a){return i.setHours(Yo(a),0,0,0),i}}class rm extends pe{constructor(){super(...arguments);B(this,"priority",80);B(this,"incompatibleTokens",["a","B","H","k","t","T"])}parse(i,r,a){switch(r){case"b":case"bb":case"bbb":return a.dayPeriod(i,{width:"abbreviated",context:"formatting"})||a.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbbb":return a.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbb":default:return a.dayPeriod(i,{width:"wide",context:"formatting"})||a.dayPeriod(i,{width:"abbreviated",context:"formatting"})||a.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,a){return i.setHours(Yo(a),0,0,0),i}}class am extends pe{constructor(){super(...arguments);B(this,"priority",80);B(this,"incompatibleTokens",["a","b","t","T"])}parse(i,r,a){switch(r){case"B":case"BB":case"BBB":return a.dayPeriod(i,{width:"abbreviated",context:"formatting"})||a.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBBB":return a.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBB":default:return a.dayPeriod(i,{width:"wide",context:"formatting"})||a.dayPeriod(i,{width:"abbreviated",context:"formatting"})||a.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,a){return i.setHours(Yo(a),0,0,0),i}}class nm extends pe{constructor(){super(...arguments);B(this,"priority",70);B(this,"incompatibleTokens",["H","K","k","t","T"])}parse(i,r,a){switch(r){case"h":return ke(He.hour12h,i);case"ho":return a.ordinalNumber(i,{unit:"hour"});default:return Pe(r.length,i)}}validate(i,r){return r>=1&&r<=12}set(i,r,a){const n=i.getHours()>=12;return n&&a<12?i.setHours(a+12,0,0,0):!n&&a===12?i.setHours(0,0,0,0):i.setHours(a,0,0,0),i}}class om extends pe{constructor(){super(...arguments);B(this,"priority",70);B(this,"incompatibleTokens",["a","b","h","K","k","t","T"])}parse(i,r,a){switch(r){case"H":return ke(He.hour23h,i);case"Ho":return a.ordinalNumber(i,{unit:"hour"});default:return Pe(r.length,i)}}validate(i,r){return r>=0&&r<=23}set(i,r,a){return i.setHours(a,0,0,0),i}}class sm extends pe{constructor(){super(...arguments);B(this,"priority",70);B(this,"incompatibleTokens",["h","H","k","t","T"])}parse(i,r,a){switch(r){case"K":return ke(He.hour11h,i);case"Ko":return a.ordinalNumber(i,{unit:"hour"});default:return Pe(r.length,i)}}validate(i,r){return r>=0&&r<=11}set(i,r,a){return i.getHours()>=12&&a<12?i.setHours(a+12,0,0,0):i.setHours(a,0,0,0),i}}class lm extends pe{constructor(){super(...arguments);B(this,"priority",70);B(this,"incompatibleTokens",["a","b","h","H","K","t","T"])}parse(i,r,a){switch(r){case"k":return ke(He.hour24h,i);case"ko":return a.ordinalNumber(i,{unit:"hour"});default:return Pe(r.length,i)}}validate(i,r){return r>=1&&r<=24}set(i,r,a){const n=a<=24?a%24:a;return i.setHours(n,0,0,0),i}}class dm extends pe{constructor(){super(...arguments);B(this,"priority",60);B(this,"incompatibleTokens",["t","T"])}parse(i,r,a){switch(r){case"m":return ke(He.minute,i);case"mo":return a.ordinalNumber(i,{unit:"minute"});default:return Pe(r.length,i)}}validate(i,r){return r>=0&&r<=59}set(i,r,a){return i.setMinutes(a,0,0),i}}class cm extends pe{constructor(){super(...arguments);B(this,"priority",50);B(this,"incompatibleTokens",["t","T"])}parse(i,r,a){switch(r){case"s":return ke(He.second,i);case"so":return a.ordinalNumber(i,{unit:"second"});default:return Pe(r.length,i)}}validate(i,r){return r>=0&&r<=59}set(i,r,a){return i.setSeconds(a,0),i}}class pm extends pe{constructor(){super(...arguments);B(this,"priority",30);B(this,"incompatibleTokens",["t","T"])}parse(i,r){const a=n=>Math.trunc(n*Math.pow(10,-r.length+3));return Ve(Pe(r.length,i),a)}set(i,r,a){return i.setMilliseconds(a),i}}class um extends pe{constructor(){super(...arguments);B(this,"priority",10);B(this,"incompatibleTokens",["t","T","x"])}parse(i,r){switch(r){case"X":return yt(vt.basicOptionalMinutes,i);case"XX":return yt(vt.basic,i);case"XXXX":return yt(vt.basicOptionalSeconds,i);case"XXXXX":return yt(vt.extendedOptionalSeconds,i);case"XXX":default:return yt(vt.extended,i)}}set(i,r,a){return r.timestampIsSet?i:Te(i,i.getTime()-dn(i)-a)}}class hm extends pe{constructor(){super(...arguments);B(this,"priority",10);B(this,"incompatibleTokens",["t","T","X"])}parse(i,r){switch(r){case"x":return yt(vt.basicOptionalMinutes,i);case"xx":return yt(vt.basic,i);case"xxxx":return yt(vt.basicOptionalSeconds,i);case"xxxxx":return yt(vt.extendedOptionalSeconds,i);case"xxx":default:return yt(vt.extended,i)}}set(i,r,a){return r.timestampIsSet?i:Te(i,i.getTime()-dn(i)-a)}}class gm extends pe{constructor(){super(...arguments);B(this,"priority",40);B(this,"incompatibleTokens","*")}parse(i){return Ud(i)}set(i,r,a){return[Te(i,a*1e3),{timestampIsSet:!0}]}}class bm extends pe{constructor(){super(...arguments);B(this,"priority",20);B(this,"incompatibleTokens","*")}parse(i){return Ud(i)}set(i,r,a){return[Te(i,a),{timestampIsSet:!0}]}}const fm={G:new zf,y:new Df,Y:new Of,R:new Ef,u:new If,Q:new Ff,q:new Bf,M:new jf,L:new Nf,w:new Wf,I:new Zf,d:new Uf,D:new Yf,E:new Qf,e:new Xf,c:new Jf,i:new tm,a:new im,b:new rm,B:new am,h:new nm,H:new om,K:new sm,k:new lm,m:new dm,s:new cm,S:new pm,X:new um,x:new hm,t:new gm,T:new bm},mm=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,vm=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,ym=/^'([^]*?)'?$/,xm=/''/g,wm=/\S/,_m=/[a-zA-Z]/;function $m(e,t,i,r){var $,_,w,C,D,T,I,k;const a=()=>Te((r==null?void 0:r.in)||i,NaN),n=Mf(),o=(r==null?void 0:r.locale)??n.locale??Nd,l=(r==null?void 0:r.firstWeekContainsDate)??((_=($=r==null?void 0:r.locale)==null?void 0:$.options)==null?void 0:_.firstWeekContainsDate)??n.firstWeekContainsDate??((C=(w=n.locale)==null?void 0:w.options)==null?void 0:C.firstWeekContainsDate)??1,c=(r==null?void 0:r.weekStartsOn)??((T=(D=r==null?void 0:r.locale)==null?void 0:D.options)==null?void 0:T.weekStartsOn)??n.weekStartsOn??((k=(I=n.locale)==null?void 0:I.options)==null?void 0:k.weekStartsOn)??0;if(!t)return e?a():te(i,r==null?void 0:r.in);const p={firstWeekContainsDate:l,weekStartsOn:c,locale:o},u=[new Vf(r==null?void 0:r.in,i)],h=t.match(vm).map(P=>{const V=P[0];if(V in Ho){const Y=Ho[V];return Y(P,o.formatLong)}return P}).join("").match(mm),g=[];for(let P of h){!(r!=null&&r.useAdditionalWeekYearTokens)&&qd(P)&&Vo(P,t,e),!(r!=null&&r.useAdditionalDayOfYearTokens)&&Zd(P)&&Vo(P,t,e);const V=P[0],Y=fm[V];if(Y){const{incompatibleTokens:U}=Y;if(Array.isArray(U)){const Q=g.find(Se=>U.includes(Se.token)||Se.token===V);if(Q)throw new RangeError(`The format string mustn't contain \`${Q.fullToken}\` and \`${P}\` at the same time`)}else if(Y.incompatibleTokens==="*"&&g.length>0)throw new RangeError(`The format string mustn't contain \`${P}\` and any other token at the same time`);g.push({token:V,fullToken:P});const Z=Y.run(e,P,o.match,p);if(!Z)return a();u.push(Z.setter),e=Z.rest}else{if(V.match(_m))throw new RangeError("Format string contains an unescaped latin alphabet character `"+V+"`");if(P==="''"?P="'":V==="'"&&(P=km(P)),e.indexOf(P)===0)e=e.slice(P.length);else return a()}}if(e.length>0&&wm.test(e))return a();const v=u.map(P=>P.priority).sort((P,V)=>V-P).filter((P,V,Y)=>Y.indexOf(P)===V).map(P=>u.filter(V=>V.priority===P).sort((V,Y)=>Y.subPriority-V.subPriority)).map(P=>P[0]);let f=te(i,r==null?void 0:r.in);if(isNaN(+f))return a();const b={};for(const P of v){if(!P.validate(f,p))return a();const V=P.set(f,b,p);Array.isArray(V)?(f=V[0],Object.assign(b,V[1])):f=V}return f}function km(e){return e.match(ym)[1].replace(xm,"'")}function Cm(e,t){const i=te(e,t==null?void 0:t.in);return i.setMinutes(0,0,0),i}function Sm(e,t){const i=te(e,t==null?void 0:t.in);return i.setSeconds(0,0),i}function Mm(e,t){const i=te(e,t==null?void 0:t.in);return i.setMilliseconds(0),i}function Am(e,t){const i=()=>Te(t==null?void 0:t.in,NaN),r=(t==null?void 0:t.additionalDigits)??2,a=Hm(e);let n;if(a.date){const p=Vm(a.date,r);n=zm(p.restDateString,p.year)}if(!n||isNaN(+n))return i();const o=+n;let l=0,c;if(a.time&&(l=Dm(a.time),isNaN(l)))return i();if(a.timezone){if(c=Om(a.timezone),isNaN(c))return i()}else{const p=new Date(o+l),u=te(0,t==null?void 0:t.in);return u.setFullYear(p.getUTCFullYear(),p.getUTCMonth(),p.getUTCDate()),u.setHours(p.getUTCHours(),p.getUTCMinutes(),p.getUTCSeconds(),p.getUTCMilliseconds()),u}return te(o+l+c,t==null?void 0:t.in)}const Ia={dateTimeDelimiter:/[T ]/,timeZoneDelimiter:/[Z ]/i,timezone:/([Z+-].*)$/},Lm=/^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/,Tm=/^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/,Pm=/^([+-])(\d{2})(?::?(\d{2}))?$/;function Hm(e){const t={},i=e.split(Ia.dateTimeDelimiter);let r;if(i.length>2)return t;if(/:/.test(i[0])?r=i[0]:(t.date=i[0],r=i[1],Ia.timeZoneDelimiter.test(t.date)&&(t.date=e.split(Ia.timeZoneDelimiter)[0],r=e.substr(t.date.length,e.length))),r){const a=Ia.timezone.exec(r);a?(t.time=r.replace(a[1],""),t.timezone=a[1]):t.time=r}return t}function Vm(e,t){const i=new RegExp("^(?:(\\d{4}|[+-]\\d{"+(4+t)+"})|(\\d{2}|[+-]\\d{"+(2+t)+"})$)"),r=e.match(i);if(!r)return{year:NaN,restDateString:""};const a=r[1]?parseInt(r[1]):null,n=r[2]?parseInt(r[2]):null;return{year:n===null?a:n*100,restDateString:e.slice((r[1]||r[2]).length)}}function zm(e,t){if(t===null)return new Date(NaN);const i=e.match(Lm);if(!i)return new Date(NaN);const r=!!i[4],a=zr(i[1]),n=zr(i[2])-1,o=zr(i[3]),l=zr(i[4]),c=zr(i[5])-1;if(r)return jm(t,l,c)?Em(t,l,c):new Date(NaN);{const p=new Date(0);return!Fm(t,n,o)||!Bm(t,a)?new Date(NaN):(p.setUTCFullYear(t,n,Math.max(a,o)),p)}}function zr(e){return e?parseInt(e):1}function Dm(e){const t=e.match(Tm);if(!t)return NaN;const i=co(t[1]),r=co(t[2]),a=co(t[3]);return Nm(i,r,a)?i*ua+r*pa+a*1e3:NaN}function co(e){return e&&parseFloat(e.replace(",","."))||0}function Om(e){if(e==="Z")return 0;const t=e.match(Pm);if(!t)return 0;const i=t[1]==="+"?-1:1,r=parseInt(t[2]),a=t[3]&&parseInt(t[3])||0;return Rm(r,a)?i*(r*ua+a*pa):NaN}function Em(e,t,i){const r=new Date(0);r.setUTCFullYear(e,0,4);const a=r.getUTCDay()||7,n=(t-1)*7+i+1-a;return r.setUTCDate(r.getUTCDate()+n),r}const Im=[31,null,31,30,31,30,31,31,30,31,30,31];function Xd(e){return e%400===0||e%4===0&&e%100!==0}function Fm(e,t,i){return t>=0&&t<=11&&i>=1&&i<=(Im[t]||(Xd(e)?29:28))}function Bm(e,t){return t>=1&&t<=(Xd(e)?366:365)}function jm(e,t,i){return t>=1&&t<=53&&i>=0&&i<=6}function Nm(e,t,i){return e===24?t===0&&i===0:i>=0&&i<60&&t>=0&&t<60&&e>=0&&e<25}function Rm(e,t){return t>=0&&t<=59}/*!
 * chartjs-adapter-date-fns v3.0.0
 * https://www.chartjs.org
 * (c) 2022 chartjs-adapter-date-fns Contributors
 * Released under the MIT license
 */const Wm={datetime:"MMM d, yyyy, h:mm:ss aaaa",millisecond:"h:mm:ss.SSS aaaa",second:"h:mm:ss aaaa",minute:"h:mm aaaa",hour:"ha",day:"MMM d",week:"PP",month:"MMM yyyy",quarter:"qqq - yyyy",year:"yyyy"};jc._date.override({_id:"date-fns",formats:function(){return Wm},parse:function(e,t){if(e===null||typeof e>"u")return null;const i=typeof e;return i==="number"||e instanceof Date?e=te(e):i==="string"&&(typeof t=="string"?e=$m(e,t,new Date,this.options):e=Am(e,this.options)),Od(e)?e.getTime():null},format:function(e,t){return Cf(e,t,this.options)},add:function(e,t,i){switch(i){case"millisecond":return qo(e,t);case"second":return hb(e,t);case"minute":return pb(e,t);case"hour":return lb(e,t);case"day":return zn(e,t);case"week":return gb(e,t);case"month":return Zo(e,t);case"quarter":return ub(e,t);case"year":return bb(e,t);default:return e}},diff:function(e,t,i){switch(i){case"millisecond":return Go(e,t);case"second":return $b(e,t);case"minute":return xb(e,t);case"hour":return yb(e,t);case"day":return Ed(e,t);case"week":return kb(e,t);case"month":return Bd(e,t);case"quarter":return _b(e,t);case"year":return Cb(e,t);default:return 0}},startOf:function(e,t,i){switch(t){case"second":return Mm(e);case"minute":return Sm(e);case"hour":return Cm(e);case"day":return Po(e);case"week":return wt(e);case"isoWeek":return wt(e,{weekStartsOn:+i});case"month":return Mb(e);case"quarter":return Sb(e);case"year":return jd(e);default:return e}},endOf:function(e,t){switch(t){case"second":return Vb(e);case"minute":return Pb(e);case"hour":return Lb(e);case"day":return Id(e);case"week":return Tb(e);case"month":return Fd(e);case"quarter":return Hb(e);case"year":return Ab(e);default:return e}}});function cl(e,t){if(!(t!=null&&t.start)||!(t!=null&&t.end))return null;const i=e.getPixelForValue(t.start.getTime()),r=e.getPixelForValue(t.end.getTime());if(!Number.isFinite(i)||!Number.isFinite(r))return null;const a=Math.min(i,r),n=Math.max(Math.abs(r-i),2);return!Number.isFinite(n)||n<=0?null:{left:a,width:n}}const Km={id:"pricingModeIcons",beforeDatasetsDraw(e,t,i){var c;const r=i,a=r==null?void 0:r.segments;if(!(a!=null&&a.length))return;const n=e.chartArea,o=(c=e.scales)==null?void 0:c.x;if(!n||!o)return;const l=e.ctx;l.save(),l.globalAlpha=(r==null?void 0:r.backgroundOpacity)??.12;for(const p of a){const u=cl(o,p);u&&(l.fillStyle=p.color||"rgba(255, 255, 255, 0.1)",l.fillRect(u.left,n.top,u.width,n.bottom-n.top))}l.restore()},afterDatasetsDraw(e,t,i){var P;const r=i,a=r==null?void 0:r.segments;if(!(a!=null&&a.length))return;const n=(P=e.scales)==null?void 0:P.x,o=e.chartArea;if(!n||!o)return;const l=(r==null?void 0:r.iconSize)??16,c=(r==null?void 0:r.labelSize)??9,p=`${l}px "Inter", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,u=`${c}px "Inter", sans-serif`,h=(r==null?void 0:r.iconColor)||"rgba(255, 255, 255, 0.95)",g=(r==null?void 0:r.labelColor)||"rgba(255, 255, 255, 0.7)",v=(r==null?void 0:r.axisBandPadding)??10,f=(r==null?void 0:r.axisBandHeight)??l+c+10,b=(r==null?void 0:r.axisBandColor)||"rgba(6, 10, 18, 0.12)",$=(r==null?void 0:r.iconAlignment)||"start",_=(r==null?void 0:r.iconStartOffset)??12,w=(r==null?void 0:r.iconBaselineOffset)??4,C=(n.bottom||o.bottom)+v,D=Math.min(C,e.height-f-2),T=o.right-o.left,I=D+w,k=e.ctx;k.save(),k.globalCompositeOperation="destination-over",k.fillStyle=b,k.fillRect(o.left,D,T,f),k.restore(),k.save(),k.globalCompositeOperation="destination-over",k.textAlign="center",k.textBaseline="top";for(const V of a){const Y=cl(n,V);if(!Y)continue;let U;if($==="start"){U=Y.left+_;const Z=Y.left+Y.width-l/2;U>Z&&(U=Y.left+Y.width/2)}else U=Y.left+Y.width/2;k.font=p,k.fillStyle=h,k.fillText(V.icon||"❓",U,I),V.shortLabel&&(k.font=u,k.fillStyle=g,k.fillText(V.shortLabel,U,I+l-2))}k.restore()}};function pl(e,t){if(!e)return;e.layout||(e.layout={}),e.layout.padding||(e.layout.padding={});const i=e.layout.padding,r=12;i.top=i.top??12,i.bottom=Math.max(i.bottom||0,r)}var Zm=Object.defineProperty,qm=Object.getOwnPropertyDescriptor,hr=(e,t,i,r)=>{for(var a=r>1?void 0:r?qm(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&Zm(t,i,a),a};const Ot=X;Mn.register(Jl,ed,Nc,Rc,td,id,Wc,rd,Kc,Zc,ad,nd,qc,Gc,od,Km);function Gm(e){const t=e.timeline.map(i=>i.spot_price_czk??0);return{label:"📊 Spot",data:t,borderColor:"#2196F3",backgroundColor:"rgba(33, 150, 243, 0.15)",borderWidth:3,fill:!1,tension:.4,type:"line",yAxisID:"y-price",pointRadius:t.map(()=>0),pointHoverRadius:7,pointBackgroundColor:t.map(()=>"#42a5f5"),pointBorderColor:t.map(()=>"#42a5f5"),pointBorderWidth:2,order:1,datalabels:{display:!1}}}function Um(e){return{label:"💰 Výkup",data:e.timeline.map(t=>t.export_price_czk??0),borderColor:"#4CAF50",backgroundColor:"rgba(76, 187, 106, 0.15)",borderWidth:2,fill:!1,type:"line",tension:.4,yAxisID:"y-price",pointRadius:0,pointHoverRadius:5,order:1,borderDash:[5,5]}}function Ym(e){if(!e.solar)return[];const{string1:t,string2:i,hasString1:r,hasString2:a}=e.solar,n=(r?1:0)+(a?1:0),o={string1:{border:"rgba(255, 193, 7, 0.8)",bg:"rgba(255, 193, 7, 0.2)"},string2:{border:"rgba(255, 152, 0, 0.8)",bg:"rgba(255, 152, 0, 0.2)"}};if(n===1){const l=r?t:i,c=r?o.string1:o.string2;return[{label:"☀️ FVE předpověď",data:l,borderColor:c.border,backgroundColor:c.bg,borderWidth:2,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",pointRadius:0,pointHoverRadius:5,order:2}]}return n===2?[{label:"☀️ String 2",data:i,borderColor:o.string2.border,backgroundColor:o.string2.bg,borderWidth:1.5,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2},{label:"☀️ String 1",data:t,borderColor:o.string1.border,backgroundColor:o.string1.bg,borderWidth:1.5,fill:"-1",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2}]:[]}function Qm(e){if(!e.battery)return[];const{baseline:t,solarCharge:i,gridCharge:r,gridNet:a,consumption:n}=e.battery,o=[],l={baseline:{border:"#78909C",bg:"rgba(120, 144, 156, 0.25)"},solar:{border:"transparent",bg:"rgba(255, 167, 38, 0.6)"},grid:{border:"transparent",bg:"rgba(33, 150, 243, 0.6)"}};return n.some(c=>c!=null&&c>0)&&o.push({label:"🏠 Spotřeba",data:n,borderColor:"rgba(255, 112, 67, 0.7)",backgroundColor:"rgba(255, 112, 67, 0.12)",borderWidth:1.5,type:"line",fill:!1,tension:.25,pointRadius:0,pointHoverRadius:5,yAxisID:"y-power",stack:"consumption",borderDash:[6,4],order:2}),r.some(c=>c!=null&&c>0)&&o.push({label:"⚡ Síť → baterie",data:r,backgroundColor:l.grid.bg,borderColor:l.grid.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),i.some(c=>c!=null&&c>0)&&o.push({label:"☀️ FVE → baterie",data:i,backgroundColor:l.solar.bg,borderColor:l.solar.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),o.push({label:"🔋 Kapacita",data:t,backgroundColor:l.baseline.bg,borderColor:l.baseline.border,borderWidth:3,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),a.some(c=>c!==null)&&o.push({label:"📡 Netto síť",data:a,borderColor:"#00BCD4",backgroundColor:"transparent",borderWidth:2,type:"line",fill:!1,tension:.2,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",order:2}),o}function ul(e){const t=[];return e.prices.length>0&&t.push(Gm(e)),e.exportPrices.length>0&&t.push(Um(e)),t.push(...Ym(e)),t.push(...Qm(e)),t}function Fa(e,t,i=""){if(e==null)return"";const r=i?` ${i}`:"";return`${e.toFixed(t)}${r}`}function ji(e){var a;const t=(a=e.scales)==null?void 0:a.x;if(!t)return"overview";const r=(t.max-t.min)/(1e3*60*60);return r<=6?"detail":r<=24?"day":"overview"}function li(e,t){var h,g,v,f,b,$,_,w,C,D,T;if(!((h=e==null?void 0:e.scales)!=null&&h.x))return;const i=e.scales.x,a=(i.max-i.min)/(1e3*60*60),n=ji(e),o=(v=(g=e.options.plugins)==null?void 0:g.legend)==null?void 0:v.labels;o&&(o.padding=10,o.font&&(o.font.size=11),n==="detail"&&(o.padding=12,o.font&&(o.font.size=12)));const l=window.innerWidth<520,c=["y-price","y-solar","y-power"];for(const I of c){const k=(f=e.options.scales)==null?void 0:f[I];if(k){if(I==="y-solar"&&l){k.display=!1;continue}n==="overview"?(k.title&&(k.title.display=!1),(b=k.ticks)!=null&&b.font&&(k.ticks.font.size=10),I==="y-solar"&&(k.display=!1)):n==="detail"?(k.title&&(k.title.display=!0,k.title.font&&(k.title.font.size=12)),($=k.ticks)!=null&&$.font&&(k.ticks.font.size=11),k.display=!0):(k.title&&(k.title.display=!0,k.title.font&&(k.title.font.size=11)),(_=k.ticks)!=null&&_.font&&(k.ticks.font.size=10),k.display=!0)}}const p=(w=e.options.scales)==null?void 0:w.x;p&&(n==="overview"?p.ticks&&(p.ticks.maxTicksLimit=12,p.ticks.font&&(p.ticks.font.size=10)):n==="detail"?(p.ticks&&(p.ticks.maxTicksLimit=24,p.ticks.font&&(p.ticks.font.size=11)),p.time&&(p.time.displayFormats.hour="HH:mm")):(p.ticks&&(p.ticks.maxTicksLimit=16,p.ticks.font&&(p.ticks.font.size=10)),p.time&&(p.time.displayFormats.hour=l?"HH:mm":"dd.MM HH:mm")));const u=t==="always"||t==="auto"&&a<=6;for(const I of e.data.datasets){const k=I;if(k.datalabels||(k.datalabels={}),t==="never"){k.datalabels.display=!1;continue}if(u){let P=1;a>3&&a<=6?P=2:a>6&&(P=4),k.datalabels.display=Z=>{const Q=Z.dataset.data[Z.dataIndex];return Q==null||Q===0?!1:Z.dataIndex%P===0};const V=k.yAxisID==="y-price",Y=((C=k.label)==null?void 0:C.includes("Solární"))||((D=k.label)==null?void 0:D.includes("String")),U=(T=k.label)==null?void 0:T.includes("kapacita");k.datalabels.align="top",k.datalabels.offset=6,k.datalabels.color="#fff",k.datalabels.font={size:9,weight:"bold"},V?(k.datalabels.formatter=Z=>Fa(Z,2,"Kč"),k.datalabels.backgroundColor=k.borderColor||"rgba(33, 150, 243, 0.8)"):Y?(k.datalabels.formatter=Z=>Fa(Z,1,"kW"),k.datalabels.backgroundColor=k.borderColor||"rgba(255, 193, 7, 0.8)"):U?(k.datalabels.formatter=Z=>Fa(Z,1,"kWh"),k.datalabels.backgroundColor=k.borderColor||"rgba(120, 144, 156, 0.8)"):(k.datalabels.formatter=Z=>Fa(Z,1),k.datalabels.backgroundColor=k.borderColor||"rgba(33, 150, 243, 0.8)"),k.datalabels.borderRadius=4,k.datalabels.padding={top:3,bottom:3,left:5,right:5}}else k.datalabels.display=!1}e.update("none"),L.debug(`[PricingChart] Detail: ${a.toFixed(1)}h, Labels: ${u?"ON":"OFF"}, Mode: ${t}`)}let Bt=class extends O{constructor(){super(...arguments),this.data=null,this.datalabelMode="auto",this.zoomState={start:null,end:null},this.currentDetailLevel="overview",this.chart=null,this.resizeObserver=null}firstUpdated(){this.setupResizeObserver(),this.data&&this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())}updated(e){e.has("data")&&this.data&&(this.chart?this.updateChartData():this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())),e.has("datalabelMode")&&this.chart&&li(this.chart,this.datalabelMode)}disconnectedCallback(){var e;super.disconnectedCallback(),this.destroyChart(),(e=this.resizeObserver)==null||e.disconnect(),this.resizeObserver=null}zoomToTimeRange(e,t){if(!this.chart){L.warn("[PricingChart] Chart not available for zoom");return}const i=new Date(e),r=new Date(t),a=15*60*1e3,n=i.getTime()-a,o=r.getTime()+a;if(this.zoomState.start!==null&&Math.abs(this.zoomState.start-n)<6e4&&this.zoomState.end!==null&&Math.abs(this.zoomState.end-o)<6e4){L.debug("[PricingChart] Already zoomed to same range → reset"),this.resetZoom();return}try{const l=this.chart.options;l.scales.x.min=n,l.scales.x.max=o,this.chart.update("none"),this.zoomState={start:n,end:o},this.currentDetailLevel=ji(this.chart),li(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-change",{detail:{start:n,end:o,level:this.currentDetailLevel},bubbles:!0,composed:!0})),L.debug("[PricingChart] Zoomed to range",{start:new Date(n).toISOString(),end:new Date(o).toISOString()})}catch(l){L.error("[PricingChart] Zoom error",l)}}resetZoom(){if(!this.chart)return;const e=this.chart.options;delete e.scales.x.min,delete e.scales.x.max,this.chart.update("none"),this.zoomState={start:null,end:null},this.currentDetailLevel=ji(this.chart),li(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-reset",{bubbles:!0,composed:!0}))}getChart(){return this.chart}createChart(){if(!this.canvas||!this.data||this.data.timeline.length===0)return;this.chart&&this.destroyChart();const e=this.data,t=ul(e),i=window.innerWidth<520,r={responsive:!0,maintainAspectRatio:!1,animation:{duration:0},interaction:{mode:"index",intersect:!1},plugins:{legend:{labels:{color:"#ffffff",font:{size:i?10:11,weight:"500"},padding:i?6:10,usePointStyle:!0,pointStyle:"circle",boxWidth:i?8:12,boxHeight:i?8:12},position:"top"},tooltip:{backgroundColor:"rgba(0,0,0,0.9)",titleColor:"#ffffff",bodyColor:"#ffffff",titleFont:{size:13,weight:"bold"},bodyFont:{size:11},padding:10,cornerRadius:6,displayColors:!0,callbacks:{title:n=>n.length>0?new Date(n[0].parsed.x).toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"",label:n=>{let o=n.dataset.label||"";return o&&(o+=": "),n.parsed.y!==null&&(n.dataset.yAxisID==="y-price"?o+=n.parsed.y.toFixed(2)+" Kč/kWh":n.dataset.yAxisID==="y-solar"?o+=n.parsed.y.toFixed(2)+" kWh":n.dataset.yAxisID==="y-power"?o+=n.parsed.y.toFixed(2)+" kW":o+=n.parsed.y),o}}},datalabels:{display:!1},zoom:{zoom:{wheel:{enabled:!0,modifierKey:null},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)",borderColor:"rgba(33, 150, 243, 0.8)",borderWidth:2},pinch:{enabled:!0},mode:"x",onZoomComplete:({chart:n})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=ji(n),li(n,this.datalabelMode)}},pan:{enabled:!0,mode:"x",modifierKey:"shift",onPanComplete:({chart:n})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=ji(n),li(n,this.datalabelMode)}},limits:{x:{minRange:36e5}}},pricingModeIcons:null},scales:{x:{type:"timeseries",time:{unit:"hour",displayFormats:{hour:i?"HH:mm":"dd.MM HH:mm"},tooltipFormat:"dd.MM.yyyy HH:mm"},ticks:{color:this.getTextColor(),maxRotation:i?0:45,minRotation:i?0:45,font:{size:i?10:11},maxTicksLimit:i?6:20},grid:{color:this.getGridColor(),lineWidth:1}},"y-price":{type:"linear",position:"left",ticks:{color:"#2196F3",font:{size:11,weight:"500"},callback:n=>n.toFixed(2)+" Kč"},grid:{color:"rgba(33, 150, 243, 0.15)",lineWidth:1},title:{display:!i,text:"💰 Cena (Kč/kWh)",color:"#2196F3",font:{size:13,weight:"bold"}}},"y-solar":{type:"linear",position:"left",stacked:!0,display:!i,ticks:{color:"#78909C",font:{size:11,weight:"500"},callback:n=>n.toFixed(1)+" kWh",display:!0},grid:{display:!0,color:"rgba(120, 144, 156, 0.15)",lineWidth:1,drawOnChartArea:!0},title:{display:!0,text:"🔋 Kapacita baterie (kWh)",color:"#78909C",font:{size:11,weight:"bold"}},beginAtZero:!1},"y-power":{type:"linear",position:"right",stacked:!0,ticks:{color:"#FFA726",font:{size:11,weight:"500"},callback:n=>n.toFixed(2)+" kW"},grid:{display:!1},title:{display:!i,text:"☀️ Výkon (kW)",color:"#FFA726",font:{size:13,weight:"bold"}}}}};pl(r);const a={type:"bar",data:{labels:e.labels,datasets:t},plugins:[od],options:r};try{this.chart=new Mn(this.canvas,a),li(this.chart,this.datalabelMode),e.initialZoomStart&&e.initialZoomEnd&&requestAnimationFrame(()=>{if(!this.chart)return;const n=this.chart.options;n.scales.x.min=e.initialZoomStart,n.scales.x.max=e.initialZoomEnd,this.chart.update("none"),this.currentDetailLevel=ji(this.chart),li(this.chart,this.datalabelMode)}),L.info("[PricingChart] Chart created",{datasets:t.length,labels:e.labels.length,segments:e.modeSegments.length})}catch(n){L.error("[PricingChart] Failed to create chart",n)}}updateChartData(){var o;if(!this.chart||!this.data)return;const e=this.data,t=ul(e),i=((o=this.chart.data.labels)==null?void 0:o.length)!==e.labels.length,r=this.chart.data.datasets.length!==t.length;i&&(this.chart.data.labels=e.labels);let a="none";r?(this.chart.data.datasets=t,a=void 0):t.forEach((l,c)=>{const p=this.chart.data.datasets[c];p&&(p.data=l.data,p.label=l.label,p.backgroundColor=l.backgroundColor,p.borderColor=l.borderColor)});const n=this.chart.options;n.plugins||(n.plugins={}),n.plugins.pricingModeIcons=null,pl(n),this.chart.update(a),L.debug("[PricingChart] Chart updated incrementally")}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(()=>{var e;(e=this.chart)==null||e.resize()}),this.resizeObserver.observe(this)}getTextColor(){try{return getComputedStyle(this).getPropertyValue("--oig-text-primary").trim()||"#e0e0e0"}catch{return"#e0e0e0"}}getGridColor(){try{return getComputedStyle(this).getPropertyValue("--oig-border").trim()||"rgba(255,255,255,0.1)"}catch{return"rgba(255,255,255,0.1)"}}setDatalabelMode(e){this.datalabelMode=e,this.dispatchEvent(new CustomEvent("datalabel-mode-change",{detail:{mode:e},bubbles:!0,composed:!0}))}get isZoomed(){return this.zoomState.start!==null||this.zoomState.end!==null}renderControls(){const e=t=>{const i=this.datalabelMode===t?"active":"";return t==="always"&&this.datalabelMode==="always"?`control-btn mode-always ${i}`:t==="never"&&this.datalabelMode==="never"?`control-btn mode-never ${i}`:`control-btn ${i}`};return s`
      <div class="chart-controls">
        <button class=${e("auto")} @click=${()=>this.setDatalabelMode("auto")}>
          Auto
        </button>
        <button class=${e("always")} @click=${()=>this.setDatalabelMode("always")}>
          Vždy
        </button>
        <button class=${e("never")} @click=${()=>this.setDatalabelMode("never")}>
          Nikdy
        </button>
        ${this.isZoomed?s`<button class="control-btn reset-btn" @click=${()=>this.resetZoom()}>
              Reset zoom
            </button>`:null}
      </div>
    `}render(){const e=this.data&&this.data.timeline.length>0;return s`
      <div class="chart-header">
        <span class="chart-title">Ceny elektřiny & předpověď</span>
        ${this.renderControls()}
      </div>

      <div class="chart-container">
        ${e?s`<canvas id="pricing-canvas"></canvas>`:s`<div class="no-data">Žádná data o cenách</div>`}
      </div>

      ${e?s`<div class="chart-hint">
            Kolečko myši = zoom | Shift + tah = posun | Tah = výběr oblasti
          </div>`:null}
    `}};Bt.styles=z`
    :host {
      display: block;
      background: ${Ot(d.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${Ot(d.cardShadow)};
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
      color: ${Ot(d.textPrimary)};
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
      color: ${Ot(d.textSecondary)};
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .control-btn:hover {
      background: ${Ot(d.accent)};
      color: #fff;
    }

    .control-btn.active {
      background: ${Ot(d.accent)};
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
      color: ${Ot(d.textSecondary)};
      font-size: 14px;
    }

    .chart-hint {
      font-size: 10px;
      color: ${Ot(d.textSecondary)};
      opacity: 0.7;
      margin-top: 6px;
      text-align: center;
    }
  `;hr([m({type:Object})],Bt.prototype,"data",2);hr([m({type:String})],Bt.prototype,"datalabelMode",2);hr([S()],Bt.prototype,"zoomState",2);hr([S()],Bt.prototype,"currentDetailLevel",2);hr([An("#pricing-canvas")],Bt.prototype,"canvas",2);Bt=hr([E("oig-pricing-chart")],Bt);const gr="—";function er(e){return e==null||!Number.isFinite(e)?gr:`${e.toFixed(1)} °C`}function Jd(e){return e==null||!Number.isFinite(e)?gr:`${e.toFixed(2)} kWh`}function Xm(e){return e==null||!Number.isFinite(e)?gr:`${e.toFixed(2)} Kč`}function Jm(e){return e==null||!Number.isFinite(e)?gr:`${Math.round(e*100)} %`}function e2(e,t){const i=r=>{const a=new Date(r);return Number.isNaN(a.getTime())?r:`${String(a.getHours()).padStart(2,"0")}:${String(a.getMinutes()).padStart(2,"0")}`};return`${i(e)} – ${i(t)}`}function t2(e){return e==null||!Number.isFinite(e)?gr:e<60?`${Math.round(e)} s`:e<3600?`${Math.round(e/60)} min`:`${Math.round(e/3600)} h`}function i2(e){if(e==null||!Number.isFinite(e)||e<0)return gr;const t=Math.floor(e/60),i=Math.round(e%60);return t===0?`${i} min`:i===0?`${t} h`:`${t} h ${i} min`}function r2(e){const t=e.topTempC;if(t==null||!Number.isFinite(t))return null;if(e.targetTempC<=t)return 0;const i=e.targetTempC-t;return e.temperatureTrendCPerMin!=null&&Number.isFinite(e.temperatureTrendCPerMin)&&e.temperatureTrendCPerMin>0?i/e.temperatureTrendCPerMin:e.heaterPowerKw!==null&&Number.isFinite(e.heaterPowerKw)&&e.volumeL!=null&&Number.isFinite(e.volumeL)?e.heaterPowerKw===0?null:e.volumeL*.001163*i/e.heaterPowerKw*60:null}var a2=Object.defineProperty,n2=Object.getOwnPropertyDescriptor,G=(e,t,i,r)=>{for(var a=r>1?void 0:r?n2(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&a2(t,i,a),a};const W=X,Ut=z`
  background: ${W(d.cardBg)};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${W(d.cardShadow)};
`,Ht=z`
  font-size: 15px;
  font-weight: 600;
  color: ${W(d.textPrimary)};
  margin: 0 0 12px 0;
`;function o2(e){return Math.max(0,Math.min(100,e))}function hl(e){const r=Math.max(0,Math.min(1,(e-10)/60)),a={r:33,g:150,b:243},n={r:255,g:87,b:34},o=(l,c)=>Math.round(l+(c-l)*r);return`rgb(${o(a.r,n.r)}, ${o(a.g,n.g)}, ${o(a.b,n.b)})`}let Qr=class extends O{constructor(){super(...arguments),this.collapsed=!0,this.busy=!1}toggle(){this.collapsed=!this.collapsed}async doAction(e,t){this.busy=!0;try{const i=await e();this.dispatchEvent(new CustomEvent("action-done",{detail:{success:i,label:t},bubbles:!0,composed:!0}))}finally{this.busy=!1}}render(){return s`
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
              @click=${()=>this.doAction(c1,"plan")}>
              Preplanovat (debug)
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(p1,"apply")}>
              Aplikovat rucne
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(u1,"cancel")}>
              Zrusit plan
            </button>
          </div>
        </div>
      </div>
    `}};Qr.styles=z`
    :host { display: block; }

    .panel {
      ${Ut};
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
      color: ${W(d.textPrimary)};
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
      color: ${W(d.textSecondary)};
    }

    .info-bubble .tooltip {
      display: none;
      position: absolute;
      left: 0;
      top: 24px;
      width: 280px;
      padding: 10px;
      background: ${W(d.cardBg)};
      border: 1px solid ${W(d.divider)};
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      font-size: 11px;
      line-height: 1.5;
      color: ${W(d.textSecondary)};
      z-index: 100;
      white-space: normal;
    }

    .info-bubble:hover .tooltip { display: block; }

    .toggle-icon {
      font-size: 18px;
      font-weight: bold;
      color: ${W(d.textSecondary)};
      transition: transform 0.2s;
    }

    .panel-content {
      display: none;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid ${W(d.divider)};
    }

    .panel-content.open { display: block; }

    .section-label {
      font-size: 12px;
      font-weight: 600;
      color: ${W(d.textSecondary)};
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
      border: 1px solid ${W(d.divider)};
      border-radius: 8px;
      background: ${W(d.bgSecondary)};
      color: ${W(d.textPrimary)};
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      white-space: nowrap;
    }

    .action-btn:hover { background: ${W(d.divider)}; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `;G([S()],Qr.prototype,"collapsed",2);G([S()],Qr.prototype,"busy",2);Qr=G([E("oig-boiler-debug-panel")],Qr);let pn=class extends O{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return s`<div>Nacitani stavu...</div>`;const t=(i,r,a=1)=>i!=null?`${i.toFixed(a)} ${r}`:`-- ${r}`;return s`
      <h3>Stav bojleru</h3>
      <div class="grid">
        <div class="card">
          <div class="card-label">Nahrato</div>
          <div class="card-value">${t(e.heatingPercent,"%",0)}</div>
        </div>
        <div class="card">
          <div class="card-label">Teplota horni</div>
          <div class="card-value">${t(e.tempTop,"°C")}</div>
        </div>
        ${e.tempBottom!==null?s`
          <div class="card">
            <div class="card-label">Teplota spodni</div>
            <div class="card-value">${t(e.tempBottom,"°C")}</div>
          </div>
        `:x}
        <div class="card">
          <div class="card-label">Energie potrebna</div>
          <div class="card-value">${t(e.energyNeeded,"kWh",2)}</div>
        </div>
        <div class="card">
          <div class="card-label">Naklady planu</div>
          <div class="card-value">${t(e.planCost,"Kc",2)}</div>
        </div>
        <div class="card">
          <div class="card-label">Dalsi ohrev</div>
          <div class="card-value small">${e.nextHeating}</div>
        </div>
        <div class="card">
          <div class="card-label">Doporuceny zdroj</div>
          <div class="card-value small">${e.recommendedSource}</div>
        </div>
      </div>
    `}};pn.styles=z`
    :host { display: block; }

    h3 { ${Ht}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .card {
      ${Ut};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${W(d.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 18px;
      font-weight: 600;
      color: ${W(d.textPrimary)};
    }

    .card-value.small {
      font-size: 13px;
      font-weight: 500;
    }
  `;G([m({type:Object})],pn.prototype,"data",2);pn=G([E("oig-boiler-status-grid")],pn);let un=class extends O{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return x;const t=i=>`${i.toFixed(2)} kWh`;return s`
      <h3>Rozpad energie</h3>
      <div class="cards">
        <div class="card">
          <div class="card-label">Z FVE</div>
          <div class="card-value fve">${t(e.fveKwh)}</div>
        </div>
        <div class="card">
          <div class="card-label">Ze site</div>
          <div class="card-value grid-c">${t(e.gridKwh)}</div>
        </div>
        <div class="card">
          <div class="card-label">Alternativa</div>
          <div class="card-value alt">${t(e.altKwh)}</div>
        </div>
      </div>

      <div class="ratio-bar">
        <div class="ratio-fve" style="width:${e.fvePercent.toFixed(1)}%"></div>
        <div class="ratio-grid" style="width:${e.gridPercent.toFixed(1)}%"></div>
        <div class="ratio-alt" style="width:${e.altPercent.toFixed(1)}%"></div>
      </div>
      <div class="ratio-labels">
        <span>${e.fvePercent.toFixed(0)}% FVE</span>
        <span>${e.gridPercent.toFixed(0)}% sit</span>
        <span>${e.altPercent.toFixed(0)}% alternativa</span>
      </div>
    `}};un.styles=z`
    :host { display: block; }

    h3 { ${Ht}; }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .card {
      ${Ut};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${W(d.textSecondary)};
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
      background: ${W(d.bgSecondary)};
    }

    .ratio-fve { background: #4CAF50; }
    .ratio-grid { background: #FF9800; }
    .ratio-alt { background: #2196F3; }

    .ratio-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 11px;
      color: ${W(d.textSecondary)};
    }
  `;G([m({type:Object})],un.prototype,"data",2);un=G([E("oig-boiler-energy-breakdown")],un);let hn=class extends O{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return x;const t=e.peakHours.length?e.peakHours.map(a=>`${a}h`).join(", "):"--",i=e.waterLiters40c!==null?`${e.waterLiters40c.toFixed(0)} L`:"-- L",r=e.circulationNow.startsWith("ANO");return s`
      <h3>Planovane odbery</h3>
      <div class="list">
        <div class="item">
          <span class="label">Predpokladana spotreba:</span>
          <span class="value">${e.predictedTodayKwh.toFixed(2)} kWh</span>
        </div>
        <div class="item">
          <span class="label">Piky spotreby:</span>
          <span class="value">${t}</span>
        </div>
        <div class="item">
          <span class="label">Objem vody (40°C):</span>
          <span class="value">${i}</span>
        </div>
        <div class="item">
          <span class="label">Doporucena cirkulace:</span>
          <span class="value">${e.circulationWindows}</span>
        </div>
        <div class="item">
          <span class="label">Cirkulace prave ted:</span>
          <span class="value ${r?"active":"idle"}">${e.circulationNow}</span>
        </div>
      </div>
    `}};hn.styles=z`
    :host { display: block; }

    h3 { ${Ht}; }

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
      border-bottom: 1px solid ${W(d.divider)};
      font-size: 13px;
    }

    .item:last-child { border-bottom: none; }

    .label { color: ${W(d.textSecondary)}; }

    .value {
      font-weight: 600;
      color: ${W(d.textPrimary)};
    }

    .value.active { color: #4CAF50; }
    .value.idle { color: ${W(d.textSecondary)}; }
  `;G([m({type:Object})],hn.prototype,"data",2);hn=G([E("oig-boiler-predicted-usage")],hn);let Xr=class extends O{constructor(){super(...arguments),this.plan=null,this.forecastWindows={fve:"--",grid:"--"}}render(){var r;const e=this.plan,t=this.forecastWindows,i=a=>a??"--";return s`
      <h3>Informace o planu</h3>
      <div class="rows">
        <div class="row">
          <span class="row-label">Mix zdroju:</span>
          <span class="row-value">${i(e==null?void 0:e.sourceDigest)}</span>
        </div>
        <div class="row">
          <span class="row-label">Slotu:</span>
          <span class="row-value">${((r=e==null?void 0:e.slots)==null?void 0:r.length)??"--"}</span>
        </div>
        <div class="row">
          <span class="row-label">Topeni aktivni:</span>
          <span class="row-value">${i(e==null?void 0:e.activeSlotCount)}</span>
        </div>
        <div class="row">
          <span class="row-label">Nejlevnejsi spot:</span>
          <span class="row-value">${i(e==null?void 0:e.cheapestSpot)}</span>
        </div>
        <div class="row">
          <span class="row-label">Nejdrazsi spot:</span>
          <span class="row-value">${i(e==null?void 0:e.mostExpensiveSpot)}</span>
        </div>
        <div class="row">
          <span class="row-label">FVE okna (forecast):</span>
          <span class="row-value">${t.fve}</span>
        </div>
        <div class="row">
          <span class="row-label">Grid okna (forecast):</span>
          <span class="row-value">${t.grid}</span>
        </div>
        <div class="row">
          <span class="row-label">Od:</span>
          <span class="row-value">${i(e==null?void 0:e.planStart)}</span>
        </div>
        <div class="row">
          <span class="row-label">Do:</span>
          <span class="row-value">${i(e==null?void 0:e.planEnd)}</span>
        </div>
      </div>
    `}};Xr.styles=z`
    :host { display: block; }

    h3 { ${Ht}; }

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
      border-bottom: 1px solid ${W(d.divider)};
      font-size: 13px;
    }

    .row:last-child { border-bottom: none; }

    .row-label { color: ${W(d.textSecondary)}; }
    .row-value {
      font-weight: 500;
      color: ${W(d.textPrimary)};
      text-align: right;
      max-width: 60%;
      word-break: break-word;
    }
  `;G([m({type:Object})],Xr.prototype,"plan",2);G([m({type:Object})],Xr.prototype,"forecastWindows",2);Xr=G([E("oig-boiler-plan-info")],Xr);let Jr=class extends O{constructor(){super(...arguments),this.boilerState=null,this.targetTemp=60}render(){const e=this.boilerState;if(!e)return s`<div>Nacitani...</div>`;const t=10,i=70,r=v=>o2((v-t)/(i-t)*100),a=e.heatingPercent??0,n=e.tempTop!==null?r(e.tempTop):null,o=e.tempBottom!==null?r(e.tempBottom):null,l=r(this.targetTemp),c=hl(e.tempTop??this.targetTemp),p=hl(e.tempBottom??10),u=`linear-gradient(180deg, ${c} 0%, ${p} 100%)`,h=e.heatingPercent!==null?`${e.heatingPercent.toFixed(0)}% nahrato`:"-- % nahrato";return s`
      <h3>Vizualizace bojleru</h3>

      <div class="tank-wrapper">
        <div class="temp-scale">
          ${[70,60,50,40,30,20,10].map(v=>s`<span>${v}°C</span>`)}
        </div>

        <div class="tank">
          <div class="water" style="height:${a}%; background:${u}"></div>

          <div class="target-line" style="bottom:${l}%">
            <span class="target-label">Cil</span>
          </div>

          ${n!==null?s`
            <div class="sensor top" style="bottom:${n}%">
              <span class="sensor-label">${e.tempTop.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:x}

          ${o!==null?s`
            <div class="sensor bottom" style="bottom:${o}%">
              <span class="sensor-label">${e.tempBottom.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:x}
        </div>
      </div>

      <div class="grade-label">${h}</div>
    `}};Jr.styles=z`
    :host { display: block; }

    h3 { ${Ht}; }

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
      color: ${W(d.textSecondary)};
      text-align: right;
      padding: 2px 0;
    }

    /* Tank body */
    .tank {
      flex: 1;
      position: relative;
      border: 2px solid ${W(d.divider)};
      border-radius: 12px;
      overflow: hidden;
      background: ${W(d.bgSecondary)};
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
      border-top: 2px dashed ${W(d.accent)};
      z-index: 3;
    }

    .target-label {
      position: absolute;
      right: 4px;
      top: -14px;
      font-size: 9px;
      color: ${W(d.accent)};
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
      color: ${W(d.textPrimary)};
    }
  `;G([m({type:Object})],Jr.prototype,"boilerState",2);G([m({type:Number})],Jr.prototype,"targetTemp",2);Jr=G([E("oig-boiler-tank")],Jr);let ea=class extends O{constructor(){super(...arguments),this.current="",this.available=[]}onChange(e){const t=e.target.value;this.dispatchEvent(new CustomEvent("category-change",{detail:{category:t},bubbles:!0,composed:!0}))}render(){const e=this.available.length?this.available:Object.keys(ko);return s`
      <div class="row">
        <label>Profil:</label>
        <select @change=${this.onChange}>
          ${e.map(t=>s`
            <option value=${t} ?selected=${t===this.current}>
              ${ko[t]||t}
            </option>
          `)}
        </select>
      </div>
    `}};ea.styles=z`
    :host { display: block; margin: 12px 0; }

    .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    label {
      font-size: 13px;
      font-weight: 600;
      color: ${W(d.textPrimary)};
    }

    select {
      padding: 6px 10px;
      font-size: 13px;
      border: 1px solid ${W(d.divider)};
      border-radius: 6px;
      background: ${W(d.cardBg)};
      color: ${W(d.textPrimary)};
      cursor: pointer;
    }
  `;G([m({type:String})],ea.prototype,"current",2);G([m({type:Array})],ea.prototype,"available",2);ea=G([E("oig-boiler-category-select")],ea);let gn=class extends O{constructor(){super(...arguments),this.data=[]}render(){if(!this.data.length)return x;const e=this.data.flatMap(o=>o.hours),t=Math.max(...e,.1),i=t*.3,r=t*.7,a=Array.from({length:24},(o,l)=>l),n=o=>o===0?"none":o<i?"low":o<r?"medium":"high";return s`
      <h3>Mapa spotreby (7 dni)</h3>
      <div class="wrapper">
        <div class="grid">
          <!-- Header row -->
          <div></div>
          ${a.map(o=>s`<div class="hour-header">${o}</div>`)}

          <!-- Day rows -->
          ${this.data.map(o=>s`
            <div class="day-label">${o.day}</div>
            ${o.hours.map((l,c)=>s`
              <div class="cell ${n(l)}"
                   title="${o.day} ${c}h: ${l.toFixed(2)} kWh"></div>
            `)}
          `)}
        </div>

        <div class="legend">
          <span class="legend-item"><span class="legend-dot" style="background:#c8e6c9"></span> Nizka</span>
          <span class="legend-item"><span class="legend-dot" style="background:#ff9800"></span> Stredni</span>
          <span class="legend-item"><span class="legend-dot" style="background:#f44336"></span> Vysoka</span>
        </div>
      </div>
    `}};gn.styles=z`
    :host { display: block; }

    h3 { ${Ht}; }

    .wrapper {
      ${Ut};
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
      color: ${W(d.textSecondary)};
      text-align: center;
      padding: 2px 0;
    }

    .day-label {
      font-size: 10px;
      font-weight: 600;
      color: ${W(d.textSecondary)};
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

    .cell.none   { background: ${W(d.bgSecondary)}; }
    .cell.low    { background: #c8e6c9; }
    .cell.medium { background: #ff9800; }
    .cell.high   { background: #f44336; }

    .legend {
      display: flex;
      gap: 14px;
      margin-top: 10px;
      font-size: 11px;
      color: ${W(d.textSecondary)};
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
  `;G([m({type:Array})],gn.prototype,"data",2);gn=G([E("oig-boiler-heatmap-grid")],gn);let bn=class extends O{constructor(){super(...arguments),this.plan=null}render(){const e=this.plan,t=(i,r=2)=>i!=null?i.toFixed(r):"-";return s`
      <div class="grid">
        <div class="card">
          <div class="card-title">Celkova spotreba dnes</div>
          <div class="card-value total">${t(e==null?void 0:e.totalConsumptionKwh)} kWh</div>
        </div>
        <div class="card">
          <div class="card-title">Z FVE</div>
          <div class="card-value fve">${t(e==null?void 0:e.fveKwh)} kWh</div>
        </div>
        <div class="card">
          <div class="card-title">Ze site</div>
          <div class="card-value grid-c">${t(e==null?void 0:e.gridKwh)} kWh</div>
        </div>
        <div class="card">
          <div class="card-title">Odhadovana cena</div>
          <div class="card-value cost">${t(e==null?void 0:e.estimatedCostCzk)} Kc</div>
        </div>
      </div>
    `}};bn.styles=z`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .card {
      ${Ut};
      padding: 14px;
    }

    .card-title {
      font-size: 12px;
      color: ${W(d.textSecondary)};
      margin-bottom: 6px;
    }

    .card-value {
      font-size: 22px;
      font-weight: 700;
    }

    .total { color: ${W(d.textPrimary)}; }
    .fve { color: #4CAF50; }
    .grid-c { color: #FF9800; }
    .cost { color: #2196F3; }
  `;G([m({type:Object})],bn.prototype,"plan",2);bn=G([E("oig-boiler-stats-cards")],bn);let fn=class extends O{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return x;const t=Math.max(...e.hourlyAvg,.01),i=new Set(e.peakHours),r=e.peakHours.length?e.peakHours.map(n=>`${n}h`).join(", "):"--",a=e.confidence!==null?`${Math.round(e.confidence*100)} %`:"-- %";return s`
      <h3>Profil spotreby (tyden)</h3>
      <div class="wrapper">
        <div class="chart">
          ${e.hourlyAvg.map((n,o)=>{const l=t>0?n/t*100:0,c=i.has(o);return s`
              <div class="bar-col" title="${o}h: ${n.toFixed(3)} kWh">
                <div class="bar ${c?"peak":"normal"}"
                     style="height:${l}%"></div>
                <span class="bar-label">${o}</span>
              </div>
            `})}
        </div>

        <div class="stats">
          <div class="stat-item">
            <span class="stat-label">Dnes:</span>
            <span class="stat-value">${e.predictedTotalKwh.toFixed(2)} kWh</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Piky:</span>
            <span class="stat-value">${r}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Spolehlivost:</span>
            <span class="stat-value">${a}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Sledovano:</span>
            <span class="stat-value">${e.daysTracked} dni</span>
          </div>
        </div>
      </div>
    `}};fn.styles=z`
    :host { display: block; }

    h3 { ${Ht}; }

    .wrapper {
      ${Ut};
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
      color: ${W(d.textSecondary)};
      margin-top: 3px;
    }

    /* Stats row */
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid ${W(d.divider)};
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .stat-label { color: ${W(d.textSecondary)}; }
    .stat-value { font-weight: 600; color: ${W(d.textPrimary)}; }
  `;G([m({type:Object})],fn.prototype,"data",2);fn=G([E("oig-boiler-profiling")],fn);let mn=class extends O{constructor(){super(...arguments),this.config=null}render(){const e=this.config;if(!e)return x;const t=(i,r="")=>i!=null?`${i}${r?" "+r:""}`:`--${r?" "+r:""}`;return s`
      <h3>Profil bojleru</h3>
      <div class="grid">
        <div class="card">
          <div class="card-label">Objem</div>
          <div class="card-value">${t(e.volumeL,"L")}</div>
        </div>
        <div class="card">
          <div class="card-label">Vykon topeni</div>
          <div class="card-value">${t(e.heaterPowerW,"W")}</div>
        </div>
        <div class="card">
          <div class="card-label">Cilova teplota</div>
          <div class="card-value">${t(e.targetTempC,"°C")}</div>
        </div>
        <div class="card">
          <div class="card-label">Deadline</div>
          <div class="card-value">${e.deadlineTime}</div>
        </div>
        <div class="card">
          <div class="card-label">Stratifikace</div>
          <div class="card-value">${e.stratificationMode}</div>
        </div>
        <div class="card">
          <div class="card-label">Koeficient K</div>
          <div class="card-value">${e.kCoefficient}</div>
        </div>
      </div>
    `}};mn.styles=z`
    :host { display: block; }

    h3 { ${Ht}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .card {
      ${Ut};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${W(d.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 600;
      color: ${W(d.textPrimary)};
    }
  `;G([m({type:Object})],mn.prototype,"config",2);mn=G([E("oig-boiler-config-section")],mn);function gl(e,t){const i=e*t,r=Math.floor(i/60)%24,a=i%60;return`${String(r).padStart(2,"0")}:${String(a).padStart(2,"0")}`}function s2(e){switch(e){case"morning":return"🌅";case"afternoon":return"☀️";case"evening":return"🌆";case"night":return"🌙";default:return"💧"}}let ta=class extends O{constructor(){super(...arguments),this.data=null,this.lang="cs"}render(){const e=this.lang,t=y("boiler.demand_map.heading",e);if(!this.data)return s`
        <div class="card" data-testid="boiler-demand-map">
          <div class="heading">💧 ${t}</div>
          <div class="empty-state">${y("boiler.demand_map.empty",e)}</div>
        </div>
      `;const i=this.data,r=i.slotDurationMin||15,a=48,n=Math.ceil(i.slotsP80.length/a),o=[];for(let g=0;g<a;g++){let v=0,f=0;for(let b=0;b<n;b++){const $=g*n+b;v+=i.slotsP80[$]??0,f+=i.slotsP50[$]??0}o.push(v)}const l=Math.max(...o,.001),c=g=>{const v=Math.min(1,g/l);if(v<.08)return"rgba(255,255,255,.05)";const f=Math.round(120+135*v),b=Math.round(60+50*(1-v));return`rgba(${f}, ${b}, 60, ${(.12+.85*v).toFixed(2)})`},p=y("boiler.demand_map.meta",e).replace("{n}",String(i.profile.daysUsed)).replace("{cat}",ko[i.profile.category]||i.profile.label),u=`${y("boiler.demand_map.confidence",e)} ${Math.round(i.confidence*100)} %`,h=i.drivesPlan?s`<span class="plan-badge" data-testid="demand-plan-badge" title="${y("boiler.demand_map.confidence",e)} ≥ ${Math.round(i.minConfidence*100)} %">${y("boiler.demand_map.drives_plan",e)}</span>`:s`<span class="plan-badge learning" data-testid="demand-plan-badge" title="${y("boiler.demand_map.confidence",e)} &lt; ${Math.round(i.minConfidence*100)} %">${y("boiler.demand_map.learning",e)}</span>`;return s`
      <div class="card" data-testid="boiler-demand-map">
        <div class="heading">
          💧 ${t}
          ${h}
          <span class="meta-inline">${p} · ${u}${i.profile.fallbackUsed?s` · <span class="fallback-notice">${y("boiler.demand_map.fallback_notice",e)}</span>`:x}</span>
        </div>

        <div class="heatmap-wrap">
          <div class="heatmap">
            ${o.map((g,v)=>{const f=gl(v*n,r),b=g.toFixed(2);return s`
                <div class="heatmap-col" title="${f}: ${b} kWh">
                  <div class="heatmap-bar" style="background:${c(g)};"></div>
                </div>
              `})}
          </div>

          <div class="hour-axis">
            ${["00:00","06:00","12:00","18:00","24:00"].map(g=>s`<span class="hour-label">${g}</span>`)}
          </div>
        </div>

        ${i.windows.length>0?s`
          <div class="chips">
            ${i.windows.slice(0,3).map(g=>{const v=gl(g.slotIndex,r),f=s2(g.label),b=Math.round(g.liters),$=g.p80Kwh.toFixed(1);return s`
                <span class="chip">
                  ${f}
                  <span class="chip-time">${v}</span>
                  &ge; <b>${b} L</b> (${$} kWh)
                </span>
              `})}
          </div>
        `:x}
      </div>
    `}};ta.styles=z`
    :host { display: block; }

    .card {
      ${Ut};
      padding: 16px;
    }

    .heading {
      ${Ht};
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Empty / collecting state */
    .empty-state {
      text-align: center;
      padding: 24px 0;
      color: ${W(d.textSecondary)};
      font-size: 13px;
    }

    /* Heatmap: 48 columns (2 slots aggregated per column) */
    .heatmap-wrap {
      overflow-x: auto;
    }

    /* Mockup .heat: row of equal-height rounded cells, red intensity ramp */
    .heatmap {
      display: grid;
      grid-template-columns: repeat(48, 1fr);
      gap: 1.5px;
      height: 30px;
      min-width: 280px;
      margin-bottom: 5px;
    }

    .heatmap-col {
      display: flex;
      height: 100%;
    }

    .heatmap-bar {
      width: 100%;
      height: 100%;
      border-radius: 2px;
      transition: opacity 0.15s;
    }

    .heatmap-bar:hover { opacity: 0.75; }

    /* Mockup .hl: five labels spread across the strip */
    .hour-axis {
      display: flex;
      justify-content: space-between;
      min-width: 280px;
      margin-bottom: 8px;
    }

    .hour-label {
      font-size: 9px;
      color: ${W(d.textSecondary)};
      opacity: 0.7;
    }

    /* Readiness chips */
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(33,150,243,0.12);
      color: ${W(d.textPrimary)};
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }

    .chip-time {
      font-weight: 700;
      color: ${W(d.accent)};
    }

    /* Meta line — now inline in heading */
    .meta-inline {
      font-size: 10.5px;
      opacity: 0.55;
      font-weight: 400;
      margin-left: auto;
    }

    /* Legacy meta block (kept for backwards compat if still used elsewhere) */
    .meta {
      font-size: 11px;
      color: ${W(d.textSecondary)};
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .confidence-badge {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      background: rgba(76,175,80,0.15);
      color: #2e7d32;
    }

    .confidence-badge.low {
      background: rgba(255,152,0,0.18);
      color: #b75d00;
    }

    .plan-badge {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      background: rgba(76,175,80,0.15);
      color: #2e7d32;
    }

    .plan-badge.learning {
      background: rgba(255,152,0,0.18);
      color: #b75d00;
    }

    .fallback-notice {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 6px;
      font-size: 10px;
      background: rgba(255,152,0,0.12);
      color: #b75d00;
    }
  `;G([m({attribute:!1})],ta.prototype,"data",2);G([m({type:String})],ta.prototype,"lang",2);ta=G([E("oig-boiler-demand-map")],ta);let vn=class extends O{constructor(){super(...arguments),this.state=null}render(){return this.state?s`
      <div class="temp-display">
        <div class="current-temp">${this.state.currentTemp!=null?`${this.state.currentTemp}°C`:"--"}</div>
        <div class="target-temp">Cil: ${this.state.targetTemp}°C</div>
      </div>

      <div class="status-indicator">
        <div class="status-dot ${this.state.heating?"heating":"idle"}"></div>
        <span>${this.state.heating?"Topi":"Necinny"}</span>
      </div>

      ${this.state.nextProfile?s`
        <div class="next-info">
          <div>Dalsi: ${this.state.nextProfile}</div>
          <div>${this.state.nextStart}</div>
        </div>
      `:null}
    `:s`<div>Nacitani...</div>`}};vn.styles=z`
    :host {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: ${W(d.cardBg)};
      border-radius: 12px;
      box-shadow: ${W(d.cardShadow)};
    }

    .temp-display { text-align: center; }

    .current-temp {
      font-size: 36px;
      font-weight: 600;
      color: ${W(d.textPrimary)};
    }

    .target-temp {
      font-size: 14px;
      color: ${W(d.textSecondary)};
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
      color: ${W(d.textSecondary)};
    }
  `;G([m({type:Object})],vn.prototype,"state",2);vn=G([E("oig-boiler-state")],vn);let yn=class extends O{constructor(){super(...arguments),this.data=[]}render(){return x}};yn.styles=z`
    :host { display: block; }
  `;G([m({type:Array})],yn.prototype,"data",2);yn=G([E("oig-boiler-heatmap")],yn);let ia=class extends O{constructor(){super(...arguments),this.profiles=[],this.editMode=!1}render(){return x}};ia.styles=z`
    :host { display: block; }
  `;G([m({type:Array})],ia.prototype,"profiles",2);G([m({type:Boolean})],ia.prototype,"editMode",2);ia=G([E("oig-boiler-profiles")],ia);let ra=class extends O{constructor(){super(...arguments),this.data=null,this.lang="cs"}render(){const e=this.data,t=this.lang,i=(e==null?void 0:e.currentState)??"unknown",r=y(`boiler.status.${i}`,t),a=(e==null?void 0:e.comfortSatisfied)===!0?y("boiler.status.comfort_satisfied",t):(e==null?void 0:e.comfortSatisfied)===!1?y("boiler.status.comfort_unsatisfied",t):y("boiler.status.comfort_unknown",t),n=(e==null?void 0:e.comfortSatisfied)===!0?"ok":(e==null?void 0:e.comfortSatisfied)===!1?"bad":"unknown",o=(e==null?void 0:e.degradedFlags)??[];return s`
      <div data-testid="boiler-status-panel" class="panel">
        <div class="row">
          <div class="heading">${y("boiler.status.heading",t)}</div>
          <span data-testid="boiler-status-current-state" class="pill ${i}">${r}</span>
        </div>
        <div class="degraded-banner" ?hidden=${!(e!=null&&e.degraded)}>${y("boiler.status.degraded",t)}</div>
        <div class="grid">
          <div class="field"><label>${y("boiler.status.temp_top",t)}</label><span>${er((e==null?void 0:e.temperatureTop)??null)}</span></div>
          <div class="field"><label>${y("boiler.status.temp_bottom",t)}</label><span>${er((e==null?void 0:e.temperatureBottom)??null)}</span></div>
          <div class="field"><label>${y("boiler.status.selected_source",t)}</label><span data-testid="boiler-status-selected-source">${Ui((e==null?void 0:e.selectedSource)??null,t)}</span></div>
          <div class="field"><label>${y("boiler.status.actuated_source",t)}</label><span data-testid="boiler-status-actuated-source">${Ui((e==null?void 0:e.actuatedSource)??null,t)}</span></div>
          <div class="field"><label>${y("boiler.status.energy_needed",t)}</label><span>${Jd((e==null?void 0:e.energyNeededKwh)??null)}</span></div>
          <div class="field"><label>${y("boiler.status.last_update",t)}</label><span>${(e==null?void 0:e.lastUpdate)??"—"}</span></div>
        </div>
        <div data-testid="boiler-status-comfort" class="comfort ${n}">${a}</div>
        ${o.length?s`<div data-testid="boiler-status-degraded-flags" class="degraded-list">${o.map(l=>s`<span class="degraded-tag">${Ua(l,t)}</span>`)}</div>`:""}
      </div>
    `}};ra.styles=z`
    :host { display: block; }
    .panel { display: grid; gap: 12px; padding: 16px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .heading { font-size: 1.05rem; font-weight: 600; color: var(--primary-text-color, #222); }
    .pill { padding: 2px 10px; border-radius: 999px; font-size: 0.85rem; font-weight: 600; }
    .pill.heating { background: rgba(255,152,0,0.15); color: #b75d00; }
    .pill.idle { background: rgba(76,175,80,0.15); color: #2e7d32; }
    .pill.unknown { background: rgba(120,120,120,0.15); color: #555; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .field label { font-size: 0.75rem; color: var(--secondary-text-color, #666); text-transform: uppercase; letter-spacing: 0.04em; }
    .field span { font-size: 1.05rem; color: var(--primary-text-color, #111); font-variant-numeric: tabular-nums; }
    .comfort { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
    .comfort.ok { color: #2e7d32; }
    .comfort.bad { color: #c62828; }
    .comfort.unknown { color: #777; }
    .degraded-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .degraded-tag { padding: 2px 8px; border-radius: 6px; background: rgba(244,67,54,0.12); color: #b71c1c; font-size: 0.8rem; }
    .degraded-banner { padding: 6px 10px; border-radius: 8px; background: rgba(244,67,54,0.15); color: #b71c1c; font-weight: 600; font-size: 0.85rem; }
  `;G([m({attribute:!1})],ra.prototype,"data",2);G([m({type:String})],ra.prototype,"lang",2);ra=G([E("oig-boiler-status-panel")],ra);let aa=class extends O{constructor(){super(...arguments),this.slots=[],this.lang="cs"}srcClass(e){return e&&["fve","grid","alternative","overflow","discharge"].includes(e)?e:"other"}render(){const e=this.lang;return!this.slots||this.slots.length===0?s`<div data-testid="boiler-plan-timeline" class="wrap"><div class="heading">${y("boiler.timeline.heading",e)}</div><div class="empty">${y("boiler.timeline.empty",e)}</div></div>`:s`
      <div data-testid="boiler-plan-timeline" class="wrap">
        <div class="heading">${y("boiler.timeline.heading",e)}</div>
        <table>
          <thead>
            <tr>
              <th>${y("boiler.timeline.col_time",e)}</th>
              <th>${y("boiler.timeline.col_source",e)}</th>
              <th>${y("boiler.timeline.col_temp",e)}</th>
              <th>${y("boiler.timeline.col_kwh",e)}</th>
              <th>${y("boiler.timeline.col_cost",e)}</th>
              <th>${y("boiler.timeline.col_pv",e)}</th>
            </tr>
          </thead>
          <tbody>
            ${this.slots.map(t=>{const i=t.comfortSatisfied===!0?s`<span class="badge ok">${y("boiler.timeline.comfort_ok",e)}</span>`:t.comfortSatisfied===!1?s`<span class="badge bad">${y("boiler.timeline.comfort_gap",e)}</span>`:"";return s`
                <tr>
                  <td>${e2(t.start,t.end)}</td>
                  <td><span class="src ${this.srcClass(t.recommendedSource)}">${Ui(t.recommendedSource,e)}</span></td>
                  <td>${er(t.expectedTempTopC??null)} ${i}</td>
                  <td>${Jd(t.consumptionKwh)}</td>
                  <td>${Xm(t.estimatedCostCzk??null)}</td>
                  <td>${Jm(t.pvShare??null)}</td>
                </tr>
              `})}
          </tbody>
        </table>
      </div>
    `}};aa.styles=z`
    :host { display: block; }
    .wrap { padding: 16px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .heading { font-size: 1.05rem; font-weight: 600; margin-bottom: 12px; }
    .empty { color: var(--secondary-text-color, #666); padding: 24px 0; text-align: center; }
    table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--divider-color, #eee); font-size: 0.9rem; }
    th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--secondary-text-color, #666); font-weight: 600; }
    .src { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }
    .src.fve { background: rgba(76,175,80,0.15); color: #2e7d32; }
    .src.grid { background: rgba(255,152,0,0.15); color: #b75d00; }
    .src.alternative { background: rgba(33,150,243,0.15); color: #0d47a1; }
    .src.other { background: rgba(120,120,120,0.15); color: #555; }
    .badge { padding: 1px 6px; border-radius: 4px; font-size: 0.75rem; }
    .badge.ok { background: rgba(76,175,80,0.15); color: #2e7d32; }
    .badge.bad { background: rgba(244,67,54,0.15); color: #b71c1c; }
  `;G([m({attribute:!1})],aa.prototype,"slots",2);G([m({type:String})],aa.prototype,"lang",2);aa=G([E("oig-boiler-plan-timeline")],aa);const bl=new Set(["input_stale_price","input_stale_pv","input_stale_temperature","input_missing_recorder","input_adapter_error"]);let na=class extends O{constructor(){super(...arguments),this.explanation=null,this.lang="cs"}render(){const e=this.explanation,t=this.lang;if(!e)return s`<div data-testid="boiler-source-explanation" class="wrap"><div class="heading">${y("boiler.explanation.heading",t)}</div><div class="empty">${y("boiler.explanation.empty",t)}</div></div>`;const i=e.reasonCodes??[],r=i.filter(o=>bl.has(o)),a=i.filter(o=>!bl.has(o)),n=e.degradedReasons??[];return s`
      <div data-testid="boiler-source-explanation" class="wrap">
        <div class="heading">${y("boiler.explanation.heading",t)}</div>

        <div class="section" data-testid="boiler-explanation-freshness">
          <h4>${y("boiler.explanation.freshness_heading",t)}</h4>
          ${r.length===0?s`<div class="chips"><span class="chip fresh">${y("boiler.explanation.freshness_fresh",t)}</span></div>`:s`<div class="chips">${r.map(o=>s`<span class="chip stale">${Ua(o,t)}</span>`)}</div>`}
        </div>

        <div class="section" data-testid="boiler-explanation-degraded">
          <h4>${y("boiler.explanation.degraded_heading",t)}</h4>
          ${n.length===0?s`<div class="empty">—</div>`:s`<div class="chips">${n.map(o=>s`<span class="chip degraded">${Ua(o,t)}</span>`)}</div>`}
        </div>

        ${a.length?s`<div class="section" data-testid="boiler-explanation-reasons"><h4>Reason codes</h4><div class="chips">${a.map(o=>s`<span class="chip">${Ua(o,t)}</span>`)}</div></div>`:""}

        <div class="meta-grid" data-testid="boiler-explanation-meta">
          ${e.planCreatedAt?s`<div class="meta"><label>${y("boiler.explanation.plan_created",t)}</label><span>${e.planCreatedAt}</span></div>`:""}
          ${e.planValidUntil?s`<div class="meta"><label>${y("boiler.explanation.plan_valid_until",t)}</label><span>${e.planValidUntil}</span></div>`:""}
          ${e.dataAgeSecs!=null?s`<div class="meta"><label>${y("boiler.explanation.data_age",t)}</label><span>${t2(e.dataAgeSecs)}</span></div>`:""}
          ${e.unsatisfiedComfortGapC!=null?s`<div class="meta"><label>${y("boiler.explanation.unsatisfied_gap",t)}</label><span>${e.unsatisfiedComfortGapC} °C</span></div>`:""}
          ${e.temperatureAtDeadlineC!=null?s`<div class="meta"><label>${y("boiler.explanation.temp_at_deadline",t)}</label><span>${er(e.temperatureAtDeadlineC)}</span></div>`:""}
        </div>
      </div>
    `}};na.styles=z`
    :host { display: block; }
    .wrap { padding: 16px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); display: grid; gap: 12px; }
    .heading { font-size: 1.05rem; font-weight: 600; }
    .section { display: flex; flex-direction: column; gap: 6px; }
    .section h4 { margin: 0; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--secondary-text-color, #666); font-weight: 600; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; background: rgba(33,150,243,0.12); color: #0d47a1; }
    .chip.fresh { background: rgba(76,175,80,0.15); color: #2e7d32; }
    .chip.stale { background: rgba(255,152,0,0.18); color: #b75d00; }
    .chip.degraded { background: rgba(244,67,54,0.15); color: #b71c1c; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
    .meta { display: flex; flex-direction: column; }
    .meta label { font-size: 0.72rem; text-transform: uppercase; color: var(--secondary-text-color, #666); }
    .meta span { font-size: 0.95rem; font-variant-numeric: tabular-nums; }
    .empty { color: var(--secondary-text-color, #666); }
  `;G([m({attribute:!1})],na.prototype,"explanation",2);G([m({type:String})],na.prototype,"lang",2);na=G([E("oig-boiler-source-explanation")],na);let tr=class extends O{constructor(){super(...arguments),this.identity={entryId:null,boxId:null,available:!1},this.currentOverride=null,this.lang="cs"}render(){var n,o;const e=this.lang,t=this.identity.available,i=((n=this.currentOverride)==null?void 0:n.capabilityAvailable)??!1,r=t&&i,a=((o=this.currentOverride)==null?void 0:o.active)===!0;return s`
      <div data-testid="boiler-override-panel" class="wrap">
        <div class="heading">${y("boiler.override.heading",e)}</div>
        <div class="subtitle">${y("boiler.override.subtitle",e)}</div>
        ${a?s`<span class="active-badge">${y("boiler.override.active",e)}</span>`:""}
        <div class="notice" ?hidden=${t}>${y("boiler.override.identity_unavailable",e)}</div>
        <div class="notice capability-notice" ?hidden=${!t||i}>${y("boiler.override.capability_unavailable",e)}</div>
        <label>
          ${y("boiler.override.ttl_label",e)}
          <input data-testid="override-ttl-input" type="number" min="15" max="1440" step="15" value="120" ?disabled=${!r} />
        </label>
        <label>
          ${y("boiler.override.reason_label",e)}
          <textarea data-testid="override-reason-input" required ?disabled=${!r}></textarea>
        </label>
        <button data-testid="override-submit-btn" ?disabled=${!r}>${y("boiler.override.submit",e)}</button>
      </div>
    `}};tr.styles=z`
    :host { display: block; }
    .wrap { padding: 16px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); display: grid; gap: 10px; opacity: 0.95; }
    .heading { font-size: 1rem; font-weight: 600; }
    .subtitle { font-size: 0.85rem; color: var(--secondary-text-color, #666); }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; }
    input, textarea { font: inherit; padding: 6px 8px; border: 1px solid var(--divider-color, #ccc); border-radius: 6px; background: var(--secondary-background-color, #fafafa); color: var(--primary-text-color); }
    button { padding: 8px 14px; border-radius: 6px; border: 1px solid var(--divider-color, #ccc); background: var(--primary-color, #1976d2); color: #fff; font-weight: 600; cursor: pointer; }
    button[disabled] { opacity: 0.5; cursor: not-allowed; }
    .notice { padding: 6px 10px; border-radius: 6px; background: rgba(244,67,54,0.12); color: #b71c1c; font-size: 0.85rem; }
    .active-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(255,152,0,0.2); color: #b75d00; font-weight: 600; font-size: 0.85rem; width: max-content; }
  `;G([m({attribute:!1})],tr.prototype,"identity",2);G([m({attribute:!1})],tr.prototype,"currentOverride",2);G([m({type:String})],tr.prototype,"lang",2);tr=G([E("oig-boiler-override-panel")],tr);let ir=class extends O{constructor(){super(...arguments),this.reason="unavailable",this.message="",this.lang="cs"}render(){const e=this.lang,t=this.reason==="loading"?"⏳":this.reason==="error"?"⚠️":this.reason==="degraded"?"🟠":"ℹ️";return s`
      <div data-testid="boiler-unavailable-state" class="wrap">
        <span class="icon">${t}</span>
        <div class="headline loading-notice" ?hidden=${this.reason!=="loading"}>${y("boiler.unavailable.loading",e)}</div>
        <div class="headline error-notice" ?hidden=${this.reason!=="error"}>${y("boiler.unavailable.error",e)}</div>
        <div class="headline degraded-notice" ?hidden=${this.reason!=="degraded"}>${y("boiler.unavailable.degraded",e)}</div>
        <div class="headline unavailable-notice" ?hidden=${this.reason!=="unavailable"}>${y("boiler.unavailable.unavailable",e)}</div>
        ${this.message?s`<div class="message">${this.message}</div>`:""}
      </div>
    `}};ir.styles=z`
    :host { display: block; }
    .wrap { padding: 24px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; }
    .icon { font-size: 1.6rem; }
    .headline { font-size: 1rem; font-weight: 600; }
    .message { color: var(--secondary-text-color, #666); font-size: 0.9rem; }
  `;G([m({type:String})],ir.prototype,"reason",2);G([m({type:String})],ir.prototype,"message",2);G([m({type:String})],ir.prototype,"lang",2);ir=G([E("oig-boiler-unavailable-state")],ir);var l2=Object.defineProperty,d2=Object.getOwnPropertyDescriptor,ga=(e,t,i,r)=>{for(var a=r>1?void 0:r?d2(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&l2(t,i,a),a};const c2=X;function rr(e,t){const i={gas:{cs:"🔥 Plyn",en:"🔥 Gas"},heat_pump:{cs:"🔥 Tepelné čerpadlo",en:"🔥 Heat pump"},fireplace:{cs:"🔥 Krb",en:"🔥 Fireplace"},other:{cs:"🔥 Alternativní zdroj",en:"🔥 Alternative source"}};return e&&i[e]?i[e][t]:t==="en"?"🔥 Alternative source":"🔥 Alternativní zdroj"}function p2(e,t,i){const r=[];return r.push({key:"fve",label:y("boiler.energy_today.source_fve",t),kwh:e.fveKwh,color:"#ffa726",costLabel:e.fveKwh>0?"≈ 0 Kč":null}),r.push({key:"grid",label:y("boiler.energy_today.source_grid",t),kwh:e.gridKwh,color:"#2196f3",costLabel:null}),e.batteryKwh>.05&&r.push({key:"battery",label:y("boiler.energy_today.source_battery",t),kwh:e.batteryKwh,color:"#7e57c2",costLabel:null}),e.altKwh>0&&r.push({key:"alt",label:rr(i,t),kwh:e.altKwh,color:"#e64a19",costLabel:null}),r}function u2(e,t){if(!e)return null;const{estimatedCostCzk:i,costIfAllGrid:r}=e;if(i==null||r==null||r<=0)return null;const a=r-i;return a<0?null:`${y("boiler.energy_today.benchmark_savings",t)} ${a.toFixed(1)} Kč`}function h2(e){return`${e.toFixed(1).replace(".",",")} kWh`}let yi=class extends O{constructor(){super(...arguments),this.energy=null,this.planSummary=null,this.lang="cs",this.altType=null}render(){const e=this.lang,t=y("boiler.energy_today.heading",e),i=y("boiler.energy_today.meta",e),r=this.energy,a=this.planSummary,n=r?p2(r,e,this.altType):[],o=(r==null?void 0:r.totalKwh)??0,l=o<.1,c=l?[]:n.filter(g=>g.kwh>0).map(g=>({pct:g.kwh/o*100,color:g.color,key:g.key})),p=(a==null?void 0:a.costIfAllGrid)??null,u=p!=null&&p>0?p:null,h=u2(a,e);return s`
      <div class="card">
        <h2 class="card-header">
          ${t}
          <span class="card-header-meta">${i}</span>
        </h2>

        ${l?s`
          <div class="empty">${y("boiler.energy_today.empty",e)}</div>
        `:s`
          <div class="tiles" data-testid="energy-tiles">
            ${n.map(g=>s`
              <div class="tile" data-source="${g.key}" data-testid="energy-tile-${g.key}">
                <span class="tile-label">${g.label}</span>
                <b class="tile-kwh">${h2(g.kwh)}</b>
                ${g.costLabel?s`<span class="tile-czk" style="color:#9fe6a8">${g.costLabel}</span>`:x}
              </div>
            `)}
          </div>
        `}

        ${c.length>0?s`
          <div class="prop-bar" data-testid="prop-bar">
            ${c.map(g=>s`
              <span
                style="width:${g.pct.toFixed(1)}%;background:${g.color}"
                data-source="${g.key}"
              ></span>
            `)}
          </div>
        `:x}

        ${u!=null||h?s`
          <div class="benchmark" data-testid="benchmark">
            ${u!=null?s`
              <span class="benchmark-text">
                ${y("boiler.energy_today.benchmark_prefix",e)} ${u.toFixed(1)} Kč
                ${h?s`<strong> ${h}</strong>`:x}
              </span>
            `:x}
          </div>
        `:x}
      </div>
    `}};yi.styles=z`
    :host {
      display: block;
    }

    .card {
      background: ${c2(d.cardBg)};
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 6px 18px rgba(0,0,0,.35);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 0 0 10px;
      font-size: 13px;
    }

    .card-header-meta {
      font-size: 10.5px;
      opacity: 0.55;
      font-weight: 400;
    }

    /* Source tiles grid */
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 10px;
      margin-bottom: 8px;
    }

    .tile {
      background: rgba(255,255,255,.05);
      border-radius: 9px;
      padding: 8px 10px;
      text-align: center;
    }

    .tile-label {
      font-size: 10px;
      opacity: 0.65;
      display: block;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tile-kwh {
      display: block;
      font-size: 16px;
      font-weight: 800;
    }

    .tile-czk {
      font-size: 10.5px;
      font-weight: 600;
      margin-top: 2px;
      display: block;
    }

    /* Proportion bar */
    .prop-bar {
      display: flex;
      height: 9px;
      border-radius: 5px;
      overflow: hidden;
      margin-bottom: 6px;
    }

    /* Benchmark legend */
    .benchmark {
      display: flex;
      gap: 12px;
      font-size: 10px;
      opacity: 0.85;
      flex-wrap: wrap;
    }

    .benchmark-text {
      opacity: 0.6;
    }

    /* Empty state */
    .empty {
      font-size: 12px;
      opacity: 0.55;
      text-align: center;
      padding: 12px 0 4px;
    }
  `;ga([m({type:Object})],yi.prototype,"energy",2);ga([m({type:Object})],yi.prototype,"planSummary",2);ga([m({type:String})],yi.prototype,"lang",2);ga([m({type:String})],yi.prototype,"altType",2);yi=ga([E("oig-boiler-energy-today")],yi);var g2=Object.defineProperty,b2=Object.getOwnPropertyDescriptor,Yt=(e,t,i,r)=>{for(var a=r>1?void 0:r?b2(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&g2(t,i,a),a};const Di=X,f2=new Set(["fve","grid","battery","alternative"]);function m2(e){if(!e)return null;const t=e.toLowerCase();return t==="fve"||t==="overflow"||t==="pv"?"fve":t==="grid"?"grid":t==="battery"||t==="discharge"?"battery":t==="alternative"||t==="alt"?"alternative":null}function Dn(e){const t=new Date(e);return new Date(t.getFullYear(),t.getMonth(),t.getDate(),0,0,0,0).getTime()}function bi(e,t){const i=Dn(t),r=new Date(e).getTime(),a=24*3600*1e3;return Math.max(0,Math.min(1,(r-i)/a))}function v2(e,t){const i=[];let r=null;for(const a of e){const n=a.heatingKwh??0;if(n<=0){r&&(i.push(r),r=null);continue}const o=m2(a.recommendedSource);if(!o||!f2.has(o)){r&&(i.push(r),r=null);continue}const l=a.purpose==="legionella";r&&r.source===o?(r.xEnd=bi(a.end,t),r.endIso=a.end,r.heatingKwh+=n,l&&(r.hasLegionella=!0)):(r&&i.push(r),r={xStart:bi(a.start,t),xEnd:bi(a.end,t),source:o,hasLegionella:l,heatingKwh:n,startIso:a.start,endIso:a.end})}return r&&i.push(r),i}function y2(e,t){const i=Date.now(),r=Dn(e),a=24*3600*1e3,n=(i-r)/a;return n<0||n>1?null:n}function x2(e,t){if(!t||!t.includes(":"))return null;const[i,r]=t.split(":").map(Number);if(!Number.isFinite(i)||!Number.isFinite(r))return null;const a=Dn(e),n=new Date(a);n.setHours(i,r,0,0);const o=n.getTime(),l=24*3600*1e3,c=(o-a)/l;return c<0||c>1.0001?null:Math.min(1,c)}const po={fve:{gradStart:"#ffd54f",gradEnd:"#ffa726",legendColor:"#ffa726",textColor:"#101a10"},grid:{gradStart:"#4fc3f7",gradEnd:"#2196f3",legendColor:"#2196f3",textColor:"#062033"},battery:{gradStart:"#b39ddb",gradEnd:"#7e57c2",legendColor:"#7e57c2",textColor:"#1c1430"},alternative:{gradStart:"#ff8a65",gradEnd:"#e64a19",legendColor:"#e64a19",textColor:"#2b0d05"}};let _t=class extends O{constructor(){super(...arguments),this.slots=[],this.demandMap=null,this.circulationRuns=[],this.legionella=null,this.planSummary=null,this.lang="cs",this.altSourceType=null}render(){var f;const e=this.lang;if(!this.slots||this.slots.length===0)return s`
        <div class="card" data-testid="boiler-plan-strip">
          <div class="heading">
            🗓️ ${y("boiler.plan_strip.heading",e)}
            <span class="meta">${y("boiler.plan_strip.meta",e)}</span>
          </div>
          <div class="empty">${y("boiler.plan_strip.empty",e)}</div>
        </div>
      `;const t=this.slots[0].start,i=v2(this.slots,t),r=this._buildDrawItems(t),a=this._buildTempCurve(t),n=y2(t),o=((f=this.planSummary)==null?void 0:f.deadlineTime)??null,l=o?o.slice(0,5):null,c=l?x2(t,o):null,p=this._legionellaStandaloneMarker(t,i),u=new Set(i.map(b=>b.source)),h=r.length>0,g=this.circulationRuns.length>0,v=a.length>1;return s`
      <div class="card" data-testid="boiler-plan-strip">
        <div class="heading">
          🗓️ ${y("boiler.plan_strip.heading",e)}
          <span class="meta">${y("boiler.plan_strip.meta",e)}</span>
        </div>

        <div class="tl" data-testid="plan-strip-tl">
          <!-- Temperature SVG curve -->
          ${v?this._renderTempSvg(a,e):x}

          <!-- Axis line -->
          <div class="axis"></div>

          <!-- Source bands -->
          ${i.map(b=>this._renderBand(b,e))}

          <!-- Demand draws (below axis) -->
          ${r.map(b=>this._renderDraw(b))}

          <!-- Circulation ticks -->
          ${this.circulationRuns.map(b=>this._renderCircTick(b,t,e))}

          <!-- Legionella standalone marker -->
          ${p!==null?s`
            <div class="leg-marker" style="left:${(p*100).toFixed(2)}%" title="🦠 Legionella">🦠</div>
          `:x}

          <!-- NOW line -->
          ${n!==null?s`
            <div class="nowl"
              style="left:${(n*100).toFixed(2)}%"
              data-label="${y("boiler.plan_strip.now_label",e)}"
              data-testid="plan-strip-now-line">
            </div>
          `:x}

          <!-- Deadline line -->
          ${c!==null?s`
            <div class="dline"
              style="left:${(c*100).toFixed(2)}%"
              data-label="${y("boiler.plan_strip.deadline_label",e)} ${l}"
              data-testid="plan-strip-deadline-line">
            </div>
          `:x}
        </div>

        <!-- Time axis -->
        <div class="tlx" data-testid="plan-strip-time-axis">
          <span>00</span><span>03</span><span>06</span><span>09</span>
          <span>12</span><span>15</span><span>18</span><span>21</span>
          <span>24</span>
        </div>

        <!-- Legend -->
        <div class="leg" data-testid="plan-strip-legend">
          ${["fve","grid","battery","alternative"].filter(b=>u.has(b)).map(b=>s`
            <span>
              <i class="dot" style="background:${po[b].legendColor}"></i>
              ${this._sourceLegendLabel(b,e)}
            </span>
          `)}
          ${h?s`
            <span>
              <i class="dot" style="background:#e53935"></i>
              ${y("boiler.plan_strip.legend_demands",e)}
            </span>
          `:x}
          ${g?s`
            <span>${y("boiler.plan_strip.legend_circ",e)}</span>
          `:x}
        </div>
      </div>
    `}_renderBand(e,t){const i=po[e.source]??po.fve,r=(e.xStart*100).toFixed(2),a=((e.xEnd-e.xStart)*100).toFixed(2),o=(e.xEnd-e.xStart)*100>=6,l=e.hasLegionella?y("boiler.plan_strip.source_legionella",t):this._sourceBandLabel(e.source,t),c=`${l} · ${e.heatingKwh.toFixed(2)} kWh`,p=`plan-band-${e.source}${e.hasLegionella?"-legionella":""}`;return s`
      <div class="band ${e.hasLegionella?"legionella-border":""}"
        style="left:${r}%;width:${a}%;background:linear-gradient(180deg,${i.gradStart},${i.gradEnd});color:${i.textColor}"
        title="${c}"
        data-source="${e.source}"
        data-legionella="${e.hasLegionella}"
        data-testid="${p}">
        ${o?l:x}
      </div>
    `}_renderDraw(e){const t=(e.frac*100).toFixed(2),r=Math.max(2,Math.round(e.heightPct*29));return s`
      <div class="draw"
        style="left:${t}%;width:${.9}%;height:${r}px"
        title="${e.kwh.toFixed(2)} kWh">
      </div>
    `}_renderCircTick(e,t,i){const r=bi(e.start,t);if(r<0||r>1)return x;const a=(r*100).toFixed(2),o=(bi(e.end,t)*100).toFixed(2),l=`${y("boiler.plan_strip.circ_tooltip",i)} ${fl(e.start)}–${fl(e.end)}`;return s`
      <div class="circ"
        style="left:${a}%"
        title="${l}"
        data-testid="plan-strip-circ"
        data-end-frac="${o}">
        💧
      </div>
    `}_renderTempSvg(e,t){if(e.length<2)return x;const i=960,r=84,a=Math.min(...e.map(u=>u.temp)),o=Math.max(...e.map(u=>u.temp))-a||1,l=u=>u*i,c=u=>r-(u-a)/o*(r-16)-8,p=e.map((u,h)=>`${h===0?"M":"L"}${l(u.frac).toFixed(1)},${c(u.temp).toFixed(1)}`).join(" ");return s`
      <svg class="temp-svg" viewBox="0 0 ${i} ${r}" preserveAspectRatio="none"
        data-testid="plan-strip-temp-svg"
        aria-hidden="true">
        <path d="${p}" fill="none" stroke="#ffca5a" stroke-width="2.5" opacity="0.9"/>
        <text x="6" y="12" fill="#ffca5a" font-size="10" font-family="system-ui,sans-serif">
          ${y("boiler.plan_strip.temp_zone_label",t)}
        </text>
      </svg>
    `}_buildDrawItems(e){const t=this.demandMap;if(!t)return[];const i=t.slotsP80;if(!i||i.length===0)return[];const r=Math.max(...i,.001),a=t.slotDurationMin||15,n=Dn(e);return i.map((o,l)=>{if(o<.05)return null;const p=(n+l*a*60*1e3-n)/(24*3600*1e3);return p<0||p>=1?null:{frac:p,heightPct:o/r,kwh:o}}).filter(o=>o!==null)}_buildTempCurve(e){const t=[];for(const i of this.slots){const r=i.expectedTempTopC??null;if(r==null||!Number.isFinite(r))continue;const a=bi(i.start,e);t.push({frac:a,temp:r})}return t}_legionellaStandaloneMarker(e,t){const i=this.legionella;if(!(i!=null&&i.scheduledStart))return null;const r=bi(i.scheduledStart,e);return r<0||r>1||t.some(n=>n.hasLegionella&&r>=n.xStart&&r<=n.xEnd)?null:r}_sourceBandLabel(e,t){switch(e){case"fve":return y("boiler.plan_strip.source_overflow",t);case"grid":return y("boiler.plan_strip.source_grid",t);case"battery":return y("boiler.plan_strip.source_battery",t);case"alternative":return rr(this.altSourceType,t);default:return e}}_sourceLegendLabel(e,t){switch(e){case"fve":return y("boiler.plan_strip.legend_overflow",t);case"grid":return y("boiler.plan_strip.legend_grid",t);case"battery":return y("boiler.plan_strip.legend_battery",t);case"alternative":return rr(this.altSourceType,t);default:return e}}};_t.styles=z`
    :host { display: block; }

    .card {
      background: ${Di(d.cardBg)};
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: ${Di(d.cardShadow)};
    }

    .heading {
      font-size: 13px;
      font-weight: 600;
      color: ${Di(d.textPrimary)};
      margin: 0 0 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .heading .meta {
      font-size: 10.5px;
      opacity: 0.55;
      font-weight: 400;
    }

    .empty {
      color: ${Di(d.textSecondary)};
      padding: 24px 0;
      text-align: center;
      font-size: 13px;
    }

    /* Timeline container: position:relative, fixed height 170px */
    .tl {
      position: relative;
      height: 170px;
      margin: 6px 0 2px;
      overflow: visible;
    }

    /* Axis line */
    .tl .axis {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 38px;
      height: 1px;
      background: rgba(255,255,255,0.18);
    }

    /* Source band */
    .band {
      position: absolute;
      bottom: 39px;
      height: 34px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9.5px;
      font-weight: 700;
      overflow: hidden;
      white-space: nowrap;
      box-sizing: border-box;
    }

    .band.legionella-border {
      outline: 1.5px solid rgba(255,255,255,0.45);
      outline-offset: -1px;
    }

    /* Demand draw (below axis) */
    .draw {
      position: absolute;
      bottom: 9px;
      border-radius: 0 0 3px 3px;
      background: linear-gradient(180deg, #ef9a9a, #e53935);
      min-height: 2px;
    }

    /* Temp SVG */
    .temp-svg {
      position: absolute;
      left: 0;
      right: 0;
      top: 8px;
      height: 84px;
      width: 100%;
    }

    /* Circulation tick */
    .circ {
      position: absolute;
      top: 120px;
      font-size: 11px;
      cursor: default;
    }

    /* NOW line */
    .nowl {
      position: absolute;
      top: 0;
      bottom: 24px;
      width: 2px;
      background: #fff;
      opacity: 0.85;
    }

    .nowl::after {
      content: attr(data-label);
      position: absolute;
      top: -2px;
      left: 5px;
      font-size: 9px;
      font-weight: 700;
      opacity: 0.9;
      color: #fff;
    }

    /* Deadline line */
    .dline {
      position: absolute;
      top: 0;
      bottom: 24px;
      width: 2px;
      background: #29b6f6;
      opacity: 0.6;
    }

    .dline::after {
      content: attr(data-label);
      position: absolute;
      top: -2px;
      left: 5px;
      font-size: 9px;
      color: #81d4fa;
      white-space: nowrap;
    }

    /* Legionella standalone marker */
    .leg-marker {
      position: absolute;
      bottom: 39px;
      font-size: 11px;
      transform: translateX(-50%);
      cursor: default;
    }

    /* Time axis row */
    .tlx {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      opacity: 0.5;
      color: ${Di(d.textPrimary)};
    }

    /* Legend row */
    .leg {
      display: flex;
      gap: 12px;
      font-size: 10px;
      opacity: 0.85;
      margin-top: 8px;
      flex-wrap: wrap;
      color: ${Di(d.textPrimary)};
    }

    .leg span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .dot {
      width: 9px;
      height: 9px;
      border-radius: 2px;
      display: inline-block;
      flex-shrink: 0;
    }
  `;Yt([m({attribute:!1})],_t.prototype,"slots",2);Yt([m({attribute:!1})],_t.prototype,"demandMap",2);Yt([m({attribute:!1})],_t.prototype,"circulationRuns",2);Yt([m({attribute:!1})],_t.prototype,"legionella",2);Yt([m({attribute:!1})],_t.prototype,"planSummary",2);Yt([m({type:String})],_t.prototype,"lang",2);Yt([m({type:String})],_t.prototype,"altSourceType",2);_t=Yt([E("oig-boiler-plan-strip")],_t);function fl(e){const t=new Date(e);return isNaN(t.getTime())?e:`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ec={ATTRIBUTE:1,CHILD:2},tc=e=>(...t)=>({_$litDirective$:e,values:t});class ic{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,r){this._$Ct=t,this._$AM=i,this._$Ci=r}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let zo=class extends ic{constructor(t){if(super(t),this.it=x,t.type!==ec.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===x||t==null)return this._t=void 0,this.it=t;if(t===Xl)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}};zo.directiveName="unsafeHTML",zo.resultType=1;const mt=tc(zo);var w2=Object.defineProperty,_2=Object.getOwnPropertyDescriptor,ba=(e,t,i,r)=>{for(var a=r>1?void 0:r?_2(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&w2(t,i,a),a};const pt=X,Ba=96,$2=["Po","Út","St","Čt","Pá","So","Ne"],k2=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];function C2(e){return e>=3&&e<=5?"spring":e>=6&&e<=8?"summer":e>=9&&e<=11?"autumn":"winter"}function S2(e,t,i){if(!e)return null;const r=`${t}_${C2(i)}`;if(e[r])return e[r];const a=Object.keys(e).find(n=>n.startsWith(t+"_"));return a?e[a]:null}function ml(e){const t=[];let i=0;for(;i<e.length;)if(e[i]>.3){let r=i,a=0,n=i;for(;r<e.length&&e[r]>.3;)a+=e[r],e[r]>e[n]&&(n=r),r++;t.push({s:i,pk:n,sum:a}),i=r}else i++;return t}function vl(e){return e>=100?"🛁":e>=30?"🚿":"🚰"}function yl(e){const t=Math.floor(e/4),i=e%4*15;return`${String(t).padStart(2,"0")}:${String(i).padStart(2,"0")}`}function xl(e,t){const r=(new Date(e+"T00:00:00").getDay()+6)%7;return`${(t==="cs"?$2:k2)[r]} ${e.slice(8)}.${e.slice(5,7)}.`}let xi=class extends O{constructor(){super(...arguments),this.data=null,this.lang="cs",this.month=new Date().getMonth()+1,this.dayType="workday"}_heatmapSvg(){const t=this.data.weekly,i=Math.max(1,...t.flatMap(f=>f.slotsLiters)),r=940,a=70,n=52,o=20,l=4,c=8,p=r-a-n,u=p/Ba,h=c+t.length*(o+l)+14,g=f=>{const b=Math.min(1,f/i);if(b<.04)return"rgba(255,255,255,.03)";const $=Math.round(25+30*b),_=Math.round(125+100*b),w=Math.round(160+95*b);return`rgba(${$},${_},${w},${(.3+.7*b).toFixed(2)})`};let v=`<svg viewBox="0 0 ${r} ${h}" preserveAspectRatio="xMidYMid meet">`;for(let f=0;f<=24;f+=3){const b=a+f*4*u;v+=`<text x="${b}" y="${h-2}" fill="#6b7785" font-size="9" text-anchor="middle">${String(f).padStart(2,"0")}</text>`}return t.forEach((f,b)=>{const $=c+b*(o+l);v+=`<text x="${a-6}" y="${$+o/2+4}" fill="#9fb0c0" font-size="10" text-anchor="end">${xl(f.date,this.lang)}</text>`;for(let _=0;_<Ba;_++){const w=f.slotsLiters[_]??0;v+=`<rect x="${(a+_*u).toFixed(1)}" y="${$}" width="${(u-.3).toFixed(1)}" height="${o}" rx="1.5" fill="${g(w)}"><title>${xl(f.date,this.lang)} ${yl(_)} — ${w.toFixed(1)} L</title></rect>`}v+=`<text x="${a+p+6}" y="${$+o/2+4}" fill="#cfe0ee" font-size="11" font-weight="600">${Math.round(f.totalLiters)} L</text>`}),v+="</svg>",v}_profileSvg(e){const p=Math.max(1,...e),u=896/Ba,h=f=>30+f*u,g=f=>190-f/p*158;let v='<svg viewBox="0 0 940 214" preserveAspectRatio="xMidYMid meet">';for(let f=0;f<=24;f+=3){const b=h(f*4);v+=`<line x1="${b}" y1="32" x2="${b}" y2="190" stroke="rgba(255,255,255,.05)"/><text x="${b}" y="207" fill="#6b7785" font-size="9" text-anchor="middle">${String(f).padStart(2,"0")}</text>`}for(let f=0;f<Ba;f++)e[f]>.05&&(v+=`<rect x="${(h(f)+.4).toFixed(1)}" y="${g(e[f]).toFixed(1)}" width="${(u-.8).toFixed(1)}" height="${(190-g(e[f])).toFixed(1)}" fill="#38bdf8" opacity=".85" rx="1"/>`);for(const f of ml(e))f.sum>=5&&(v+=`<text x="${h(f.pk)+u/2}" y="${Math.max(12,g(e[f.pk])-6).toFixed(1)}" fill="#9bdcff" font-size="11" font-weight="700" text-anchor="middle">${vl(f.sum)} ${Math.round(f.sum)} L</text>`);return v+='<text x="26" y="40" fill="#6b7785" font-size="8" text-anchor="end">L</text>',v+="</svg>",v}render(){const e=this.lang,t=`💧 ${y("boiler.draw_map.heading",e)}`;if(!this.data||this.data.weekly.length===0)return s`<div class="card" data-testid="boiler-draw-map">
        <div class="heading">${t}</div>
        <div class="empty-state">${y("boiler.draw_map.empty",e)}</div>
      </div>`;const i=S2(this.data.profiles,this.dayType,this.month),r=(i==null?void 0:i.slotsLitersP90)??[],a=ml(r).filter(n=>n.sum>=5).sort((n,o)=>o.sum-n.sum);return s`
      <div class="card" data-testid="boiler-draw-map">
        <div class="heading">${t}</div>
        <div class="cap">${y("boiler.draw_map.heatmap_cap",e)}</div>
        <div class="svg-wrap">${mt(this._heatmapSvg())}</div>
        <div class="scalebar"><span>${y("boiler.draw_map.scale_low",e)}</span><div class="grad"></div><span>${y("boiler.draw_map.scale_high",e)}</span></div>

        <div class="divider"></div>

        <div class="prof-head">
          <div class="heading" style="margin:0">📈 ${y("boiler.draw_map.profile_heading",e)}</div>
          <div class="toggle">
            <button class=${this.dayType==="workday"?"on":""} @click=${()=>{this.dayType="workday"}}>${y("boiler.draw_map.workday",e)}</button>
            <button class=${this.dayType==="weekend"?"on":""} @click=${()=>{this.dayType="weekend"}}>${y("boiler.draw_map.weekend",e)}</button>
          </div>
        </div>
        <div class="cap">${y("boiler.draw_map.profile_cap",e)}</div>
        ${r.length?s`<div class="svg-wrap">${mt(this._profileSvg(r))}</div>`:s`<div class="empty-state">${y("boiler.draw_map.no_profile",e)}</div>`}
        ${a.length?s`
          <div class="chips">
            <span class="lbl">${y("boiler.draw_map.biggest",e)}</span>
            ${a.slice(0,4).map(n=>s`<span class="chip">${vl(n.sum)} ${yl(n.s)} · <b>${Math.round(n.sum)} L</b></span>`)}
          </div>`:x}
      </div>
    `}};xi.styles=z`
    :host { display: block; }
    .card { ${pt("")}
      background: ${pt(d.cardBg)};
      border-radius: 14px;
      box-shadow: ${pt(d.cardShadow)};
      padding: 16px 18px;
    }
    .heading { font-size: 14px; font-weight: 600; margin: 0 0 4px; display: flex; align-items: center; gap: 8px; color: ${pt(d.textPrimary)}; }
    .cap { font-size: 11px; color: ${pt(d.textSecondary)}; margin: 2px 0 10px; }
    .empty-state { text-align: center; padding: 24px 0; color: ${pt(d.textSecondary)}; font-size: 13px; }
    .svg-wrap { width: 100%; overflow-x: auto; }
    .svg-wrap svg { display: block; width: 100%; height: auto; min-width: 320px; }
    .scalebar { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 10.5px; color: ${pt(d.textSecondary)}; }
    .scalebar .grad { height: 9px; width: 130px; border-radius: 5px; background: linear-gradient(90deg,#19202a,#2a7d9e,#38bdf8,#9be7ff); }
    .divider { height: 1px; background: rgba(255,255,255,0.08); margin: 14px 0; }
    .prof-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .toggle { display: flex; gap: 6px; margin-left: auto; }
    .toggle button { font: 600 11px system-ui; padding: 4px 11px; border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.05);
      color: ${pt(d.textSecondary)}; cursor: pointer; }
    .toggle button.on { background: rgba(56,189,248,0.2); color: #9bdcff; border-color: rgba(56,189,248,0.5); }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; align-items: center; }
    .chips .lbl { font-size: 11px; color: ${pt(d.textSecondary)}; }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px;
      background: rgba(56,189,248,0.13); font-size: 12px; font-weight: 600; color: ${pt(d.textPrimary)}; }
    .chip b { color: ${pt(d.accent)}; }
  `;ba([m({attribute:!1})],xi.prototype,"data",2);ba([m({type:String})],xi.prototype,"lang",2);ba([m({type:Number})],xi.prototype,"month",2);ba([S()],xi.prototype,"dayType",2);xi=ba([E("oig-boiler-draw-map")],xi);/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const M2=tc(class extends ic{constructor(e){var t;if(super(e),e.type!==ec.ATTRIBUTE||e.name!=="class"||((t=e.strings)==null?void 0:t.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(t=>e[t]).join(" ")+" "}update(e,[t]){var r,a;if(this.st===void 0){this.st=new Set,e.strings!==void 0&&(this.nt=new Set(e.strings.join(" ").split(/\s/).filter(n=>n!=="")));for(const n in t)t[n]&&!((r=this.nt)!=null&&r.has(n))&&this.st.add(n);return this.render(t)}const i=e.element.classList;for(const n of this.st)n in t||(i.remove(n),this.st.delete(n));for(const n in t){const o=!!t[n];o===this.st.has(n)||(a=this.nt)!=null&&a.has(n)||(o?(i.add(n),this.st.add(n)):(i.remove(n),this.st.delete(n)))}return Xl}});var A2=Object.defineProperty,L2=Object.getOwnPropertyDescriptor,Ke=(e,t,i,r)=>{for(var a=r>1?void 0:r?L2(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&A2(t,i,a),a};const Dr=X,wl={gas:"🔥",heat_pump:"♨️",fireplace:"🪵",other:"⚙️"};function Oi(e){return e==null?"—":e.toLocaleString("cs-CZ",{minimumFractionDigits:1,maximumFractionDigits:1})}const T2=38,P2=50,H2=140;function V2(e,t,i,r,a=T2){if(e==null||r<=0)return null;const n=t??e,o=a-i;if(o<=0)return null;const l=40;let c=0;for(let p=0;p<l;p++){const u=(p+.5)/l,h=n+u*(e-n);h>=a&&(c+=r/l*(h-i)/o)}return c}const z2=[[16,[21,101,192]],[30,[0,172,193]],[42,[255,213,79]],[52,[255,122,61]],[62,[229,57,53]]];function ja(e){const t=i=>Math.max(0,Math.min(255,i)).toString(16).padStart(2,"0");return`#${t(e[0])}${t(e[1])}${t(e[2])}`}function uo(e){if(e==null)return"#3b4654";const t=z2;if(e<=t[0][0])return ja(t[0][1]);const i=t[t.length-1];if(e>=i[0])return ja(i[1]);for(let r=1;r<t.length;r++){const[a,n]=t[r];if(e<=a){const[o,l]=t[r-1],c=(e-o)/(a-o);return ja([Math.round(l[0]+(n[0]-l[0])*c),Math.round(l[1]+(n[1]-l[1])*c),Math.round(l[2]+(n[2]-l[2])*c)])}}return ja(i[1])}function D2(e,t){return t==="en"?e===1?"shower":"showers":e===1?"sprcha":e>=2&&e<=4?"sprchy":"sprch"}let Ee=class extends O{constructor(){super(...arguments),this.topTempC=null,this.bottomTempC=null,this.readyLiters=null,this.readyFraction=null,this.volumeL=null,this.coldInletTempC=null,this.heatMode="idle",this.electricSource="grid",this.altSourceType="gas",this.elementKwhToday=null,this.altKwhToday=null,this.altPowerKw=null,this.circulationEnabled=!1,this.circulationActive=!1,this.trendCPerMin=null,this.lang="cs"}render(){const e=this.lang,t=this.altSourceType&&wl[this.altSourceType]?this.altSourceType:"gas",i={wrap:!0,[`mode-${this.heatMode}`]:!0,[`alt-${t}`]:!0,"circ-shown":this.circulationEnabled,"circ-on":this.circulationEnabled&&this.circulationActive},r=rr(this.altSourceType,e),a=wl[t],n=this.trendCPerMin,o=n!=null&&Math.abs(n)>=.05?`${n>0?"↑":"↓"} ${Oi(Math.abs(n))} °C/min`:"",l=V2(this.topTempC,this.bottomTempC,this.coldInletTempC??16,this.volumeL??200),c=l!=null?Math.floor(l/P2):0,p=l!=null&&l>=H2,u=c>=1?`🚿 ${c} ${D2(c,e)}`:e==="en"?"🚿 not even a shower":"🚿 ani sprcha",h=p?e==="en"?"🛁 bath ✓":"🛁 vana ✓":e==="en"?"🛁 no bath":"🛁 na vanu nestačí",g=uo(this.bottomTempC??this.topTempC),v=uo(this.topTempC??this.bottomTempC),f=this.topTempC!=null&&this.bottomTempC!=null?(this.topTempC+this.bottomTempC)/2:this.topTempC??this.bottomTempC??null,b=uo(f),$=64,_=172,w=this.readyFraction!=null?Math.max(0,Math.min(1,this.readyFraction)):1,C=w*_,D=$+C,T=_-C,I=this.readyFraction!=null&&w>0&&w<1;return s`
      <div class=${M2(i)}>
        <svg viewBox="0 0 430 290" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="bmwater" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stop-color=${g}/>
              <stop offset=".5" stop-color=${b}/>
              <stop offset="1" stop-color=${v}/>
            </linearGradient>
            <linearGradient id="bmround" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".22" stop-color="#000" stop-opacity=".12"/>
              <stop offset=".5" stop-color="#fff" stop-opacity=".10"/><stop offset=".78" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".55"/>
            </linearGradient>
            <linearGradient id="bmcasing" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#2c3644"/><stop offset=".5" stop-color="#586676"/><stop offset="1" stop-color="#2c3644"/>
            </linearGradient>
            <linearGradient id="bmcap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b7989"/><stop offset="1" stop-color="#39434f"/></linearGradient>
            <linearGradient id="bmtube" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a2129"/><stop offset=".45" stop-color="#3b4654"/><stop offset="1" stop-color="#1a2129"/></linearGradient>
            <radialGradient id="bmehot" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff7a45" stop-opacity=".95"/><stop offset=".5" stop-color="#ff3b30" stop-opacity=".5"/><stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient>
            <clipPath id="bmclip"><rect x="166" y="64" width="88" height="172" rx="20"/></clipPath>
            <filter id="bmsoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
          </defs>

          <!-- ALT pipes (left) -->
          <path d="M162 210 L106 210 L106 196" stroke="url(#bmtube)" stroke-width="9" fill="none" stroke-linecap="round" opacity=".5"/>
          <path d="M106 176 L106 78 L162 78" stroke="url(#bmtube)" stroke-width="9" fill="none" stroke-linecap="round" opacity=".5"/>
          <path class="flow-pipe pipe-return" d="M162 210 L106 210 L106 196"/>
          <path class="flow-pipe pipe-supply" d="M106 176 L106 78 L162 78"/>

          <!-- ALT source — type-specific -->
          <g class="gas-box">
            <g class="altg gas">
              <rect x="62" y="166" width="76" height="62" rx="10" fill="url(#bmcasing)" stroke="rgba(255,255,255,.16)"/>
              <rect x="70" y="174" width="60" height="18" rx="4" fill="#0b0f14" opacity=".6"/>
              <path class="flame-flick" d="M100 222 q-9 -10 -3 -20 q4 7 7 4 q5 -5 1 -13 q12 8 9 22 q-2 9 -14 7 z" fill="#ff8a3d"/>
            </g>
            <g class="altg hp">
              <rect x="58" y="170" width="84" height="56" rx="9" fill="url(#bmcasing)" stroke="rgba(255,255,255,.16)"/>
              <line x1="66" y1="178" x2="134" y2="178" stroke="#10161d" stroke-width="2"/>
              <line x1="66" y1="184" x2="134" y2="184" stroke="#10161d" stroke-width="2"/>
              <circle cx="112" cy="200" r="20" fill="#0b0f14" stroke="rgba(255,255,255,.12)"/>
              <g class="hp-fan">
                <path d="M112 200 q3 -15 11 -13 q-2 9 -11 13 z" fill="#4aa8ff" opacity=".85"/>
                <path d="M112 200 q15 3 13 11 q-9 -2 -13 -11 z" fill="#4aa8ff" opacity=".85"/>
                <path d="M112 200 q-3 15 -11 13 q2 -9 11 -13 z" fill="#4aa8ff" opacity=".85"/>
                <path d="M112 200 q-15 -3 -13 -11 q9 2 13 11 z" fill="#4aa8ff" opacity=".85"/>
              </g>
            </g>
            <g class="altg fire">
              <rect x="98" y="156" width="8" height="14" fill="#3b4654"/>
              <rect x="68" y="170" width="64" height="58" rx="6" fill="url(#bmcasing)" stroke="rgba(255,255,255,.16)"/>
              <rect x="78" y="182" width="44" height="36" rx="4" fill="#160a06"/>
              <path class="flame-flick" d="M100 216 q-11 -12 -4 -26 q5 9 9 5 q6 -7 1 -17 q16 10 12 28 q-3 12 -18 10 z" fill="#ff6a2c"/>
            </g>
            <g class="altg other">
              <rect x="62" y="166" width="76" height="62" rx="10" fill="url(#bmcasing)" stroke="rgba(255,255,255,.16)"/>
              <text x="100" y="206" font-size="22" text-anchor="middle">⚙️</text>
            </g>
          </g>
          <text x="100" y="244" font-size="10" text-anchor="middle" font-weight="700" fill="#fff">${r}</text>
          <text x="100" y="256" fill="#cdd8e3" font-size="9" text-anchor="middle">${this.altPowerKw!=null?`${Oi(this.altPowerKw)} kW · `:""}${y("boiler.model.today",e)} ${Oi(this.altKwhToday)} kWh</text>

          <!-- distribution + circulation (right) -->
          <g class="circ-group">
            <path d="M254 108 L330 108 L330 206 L262 206" stroke="url(#bmtube)" stroke-width="9" fill="none" stroke-linecap="round" opacity=".5"/>
            <path class="flow-pipe pipe-circ-ret" d="M254 108 L330 108 L330 206 L262 206"/>
            <g class="circ-pump"><circle cx="330" cy="157" r="12" fill="#11331f" stroke="#5eead4" stroke-width="1.5"/><path d="M330 149 l5 6 -10 0 z M330 165 l-5 -6 10 0 z" fill="#5eead4"/></g>
          </g>

          <!-- bottom shadow + casing + water -->
          <ellipse cx="210" cy="240" rx="52" ry="11" fill="#000" opacity=".4" filter="url(#bmsoft)"/>
          <rect x="158" y="50" width="104" height="192" rx="26" fill="url(#bmcasing)" stroke="rgba(255,255,255,.12)"/>
          <g clip-path="url(#bmclip)">
            <rect x="166" y="64" width="88" height="172" fill="url(#bmwater)"/>
            <rect x="166" y="64" width="88" height="172" fill="url(#bmround)"/>
            <!-- M18: cooler (not-yet-ready) reservoir below the ready waterline -->
            ${T>.5?N`<rect x="166" y=${D} width="88" height=${T} fill="#0a0e13" opacity=".4"/>`:""}
            ${I?N`<rect x="166" y=${D-1} width="88" height="2" fill="#fff" opacity=".5"/>`:""}
            <ellipse class="water-gloss" cx="188" cy="150" rx="11" ry="78" fill="#fff" opacity=".5" filter="url(#bmsoft)"/>
          </g>

          <ellipse cx="210" cy="60" rx="48" ry="13" fill="url(#bmcap)" stroke="rgba(255,255,255,.18)"/>
          <ellipse cx="210" cy="57" rx="30" ry="6" fill="#fff" opacity=".18"/>

          <!-- temps -->
          <rect x="258" y="64" width="42" height="20" rx="6" fill="rgba(10,14,19,.7)" stroke="rgba(255,255,255,.12)"/>
          <text x="279" y="58" fill="#9fb0c0" font-size="8" text-anchor="middle">${y("boiler.model.top",e)}</text>
          <text x="279" y="78" fill="#ffd9b0" font-size="12" font-weight="800" text-anchor="middle">${this.topTempC!=null?Math.round(this.topTempC):"–"} °C</text>
          <rect x="258" y="214" width="42" height="20" rx="6" fill="rgba(10,14,19,.7)" stroke="rgba(255,255,255,.12)"/>
          <text x="279" y="228" fill="#aad4ff" font-size="12" font-weight="800" text-anchor="middle">${this.bottomTempC!=null?Math.round(this.bottomTempC):"–"} °C</text>
          <text x="279" y="246" fill="#9fb0c0" font-size="8" text-anchor="middle">${y("boiler.model.bottom",e)}</text>

          <!-- element -->
          <ellipse class="element-glow" cx="210" cy="186" rx="40" ry="34" fill="url(#bmehot)"/>
          <g class="element-core" stroke-linecap="round" fill="none">
            <path class="el-hot" d="M198 232 L198 168 a12 12 0 0 1 24 0 L222 232" stroke="#9aa6b2" stroke-width="5"/>
          </g>
          <rect x="194" y="230" width="32" height="8" rx="2" fill="#475160"/>
          <text x="210" y="252" fill="#ffd1cb" font-size="9" text-anchor="middle" font-weight="600">${y("boiler.model.element",e)} · ${y("boiler.model.today",e)} ${Oi(this.elementKwhToday)} kWh</text>

          <!-- charge-in badge (electric source / alt) -->
          ${this.heatMode==="ele"?s`
            <g class="charge-in active">
              <circle cx="210" cy="40" r="13" fill="${this.electricSource==="fve"?"#ffb300":this.electricSource==="battery"?"#7e57c2":"#1b6fd6"}"/>
              <text x="210" y="45" font-size="13" text-anchor="middle">${this.electricSource==="fve"?"☀️":this.electricSource==="battery"?"🔋":"🔌"}</text>
            </g>`:x}
          ${this.heatMode==="alt"?s`
            <g class="charge-in active"><circle cx="210" cy="40" r="13" fill="#e64a19"/><text x="210" y="45" font-size="13" text-anchor="middle">${a}</text></g>`:x}
        </svg>

        <div class="ready-readout" data-testid="boiler-ready-readout">
          <span class="rr-main">💧 ~${l!=null?Math.round(l):"—"} ${y("boiler.model.usable",e)}</span>
          <span class="rr-sep">·</span>
          <span class="rr-eq">${u}</span>
          <span class="rr-sep">·</span>
          <span class="rr-eq ${p?"ok":"no"}">${h}</span>
        </div>

        <div class="kpi-row">
          <div class="kpi">${y("boiler.model.element",e)}<b>${Oi(this.elementKwhToday)} kWh</b></div>
          <div class="kpi">${r}<b>${Oi(this.altKwhToday)} kWh</b></div>
          <div class="kpi">${y("boiler.model.trend",e)}<b>${o||"—"}</b></div>
        </div>
      </div>
    `}};Ee.styles=z`
    :host { display: block; }
    .wrap { width: 100%; }
    svg { display: block; width: 100%; height: auto; filter: drop-shadow(0 14px 22px rgba(0,0,0,.4)); }
    .ready-readout { display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
      gap: 8px; margin-top: 6px; font-size: 13px; font-weight: 650; color: ${Dr(d.textPrimary)}; }
    .ready-readout .rr-main { color: #7fd0f5; }
    .ready-readout .rr-sep { color: ${Dr(d.textSecondary)}; opacity: .5; }
    .ready-readout .rr-eq.ok { color: #5ec98a; }
    .ready-readout .rr-eq.no { color: ${Dr(d.textSecondary)}; }
    .kpi-row { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
    .kpi { flex: 1; min-width: 80px; text-align: center; padding: 7px 6px; border-radius: 10px;
      background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
      font-size: 10.5px; color: ${Dr(d.textSecondary)}; }
    .kpi b { display: block; color: ${Dr(d.textPrimary)}; font-size: 14px; margin-top: 2px; }

    .flow-pipe { fill: none; stroke-width: 6; stroke-linecap: round; stroke-dasharray: 9 9; opacity: .3; }
    .pipe-supply { stroke: #ff5a4d; } .pipe-return { stroke: #4aa8ff; }
    .pipe-dist { stroke: #ff9a6a; } .pipe-circ-ret { stroke: #4aa8ff; }
    .element-glow { opacity: 0; }
    .charge-in { opacity: 0; }
    .altg { display: none; }
    .circ-group { opacity: 0; }
    .water-gloss { animation: bm-shimmer 4s ease-in-out infinite; }
    .hp-fan { transform-box: fill-box; transform-origin: center; animation: bm-spin 7s linear infinite; }
    .circ-pump { transform-box: fill-box; transform-origin: center; }

    @keyframes bm-flow { to { stroke-dashoffset: -36; } }
    @keyframes bm-flowrev { to { stroke-dashoffset: 36; } }
    @keyframes bm-glow { 0%,100% { opacity: .35; } 50% { opacity: 1; } }
    @keyframes bm-shimmer { 0%,100% { opacity: .5; } 50% { opacity: .85; } }
    @keyframes bm-spin { to { transform: rotate(360deg); } }
    @keyframes bm-flick { from { transform: scaleY(.9); opacity: .7; } to { transform: scaleY(1.08); opacity: 1; } }

    /* electric element heating */
    .mode-ele .element-core { filter: drop-shadow(0 0 6px #ff3b30); }
    .mode-ele .element-core .el-hot { stroke: #ff5a4d; }
    .mode-ele .element-glow { opacity: 1; animation: bm-glow 1.4s ease-in-out infinite; }
    .mode-ele .charge-in.active { opacity: 1; }
    /* alt source heating */
    .mode-alt .pipe-supply { opacity: 1; animation: bm-flow 1s linear infinite; }
    .mode-alt .pipe-return { opacity: 1; animation: bm-flowrev 1s linear infinite; }
    .mode-alt .gas-box { filter: drop-shadow(0 0 10px rgba(255,106,61,.6)); }
    .mode-alt .charge-in.active { opacity: 1; }
    .mode-alt .hp-fan { animation: bm-spin 1.1s linear infinite; }
    .flame-flick { transform-box: fill-box; transform-origin: bottom center; opacity: .35; }
    .mode-alt .flame-flick { opacity: 1; animation: bm-flick .5s ease-in-out infinite alternate; }
    .alt-fireplace .flame-flick { opacity: .8; }
    /* alt type selection */
    .alt-gas .altg.gas { display: block; }
    .alt-heat_pump .altg.hp { display: block; }
    .alt-fireplace .altg.fire { display: block; }
    .alt-other .altg.other { display: block; }
    /* circulation */
    .circ-shown .circ-group { opacity: 1; }
    .circ-on .pipe-dist { opacity: .9; animation: bm-flow .9s linear infinite; }
    .circ-on .pipe-circ-ret { opacity: 1; animation: bm-flow .9s linear infinite; }
    .circ-on .circ-pump { animation: bm-spin 2.4s linear infinite; }
  `;Ke([m({type:Number})],Ee.prototype,"topTempC",2);Ke([m({type:Number})],Ee.prototype,"bottomTempC",2);Ke([m({type:Number})],Ee.prototype,"readyLiters",2);Ke([m({type:Number})],Ee.prototype,"readyFraction",2);Ke([m({type:Number})],Ee.prototype,"volumeL",2);Ke([m({type:Number})],Ee.prototype,"coldInletTempC",2);Ke([m({type:String})],Ee.prototype,"heatMode",2);Ke([m({type:String})],Ee.prototype,"electricSource",2);Ke([m({type:String})],Ee.prototype,"altSourceType",2);Ke([m({type:Number})],Ee.prototype,"elementKwhToday",2);Ke([m({type:Number})],Ee.prototype,"altKwhToday",2);Ke([m({type:Number})],Ee.prototype,"altPowerKw",2);Ke([m({type:Boolean})],Ee.prototype,"circulationEnabled",2);Ke([m({type:Boolean})],Ee.prototype,"circulationActive",2);Ke([m({type:Number})],Ee.prototype,"trendCPerMin",2);Ke([m({type:String})],Ee.prototype,"lang",2);Ee=Ke([E("oig-boiler-model")],Ee);var O2=Object.defineProperty,E2=Object.getOwnPropertyDescriptor,Qt=(e,t,i,r)=>{for(var a=r>1?void 0:r?E2(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&O2(t,i,a),a};const tt=X;function I2(e){if(!e)return null;const t=e.toLowerCase();return t==="fve"||t==="overflow"||t==="pv"?"fve":t==="grid"?"grid":t==="battery"||t==="discharge"?"battery":t==="alternative"||t==="alt"?"alternative":null}function F2(e){const t=[];let i=null;for(const r of e){const a=r.heatingKwh??0,n=I2(r.recommendedSource);if(a>.001&&n!==null){const l=r.purpose==="legionella";i&&i.source===n&&i.legionella===l&&i.endIso===r.start?(i.endIso=r.end,i.kwh+=a):(i&&t.push(i),i={startIso:r.start,endIso:r.end,source:n,kwh:a,legionella:l})}else i&&(t.push(i),i=null)}return i&&t.push(i),t}const _l={fve:{icon:"☀️",color:"#ffb300"},grid:{icon:"🔌",color:"#38a3ff"},battery:{icon:"🔋",color:"#a78bfa"},alternative:{icon:"🔥",color:"#ff6a3d"}};function Na(e){const t=new Date(e);return`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`}let $t=class extends O{constructor(){super(...arguments),this.planSlots=[],this.planSummary=null,this.legionella=null,this.circulationRuns=[],this.status=null,this.altSourceType=null,this.lang="cs"}_sourceLabel(e){return e==="alternative"?rr(this.altSourceType,this.lang):y(`boiler.plan.src_${e}`,this.lang)}render(){var f,b,$,_,w,C,D,T,I;const e=this.lang,t=this.planSlots??[],i=F2(t).filter(k=>new Date(k.endIso).getTime()>Date.now()),r=((f=this.status)==null?void 0:f.comfortSatisfied)??null,n=((b=this.status)==null?void 0:b.heating)??!1?s`<span class="chip heat">${y("boiler.plan.status_heating",e)}</span>`:r===!1?s`<span class="chip warn">${y("boiler.plan.status_waiting",e)}</span>`:s`<span class="chip ok">${y("boiler.plan.status_satisfied",e)}</span>`,o=((_=($=this.planSummary)==null?void 0:$.deadlineTime)==null?void 0:_.slice(0,5))??"—",l=i[0]??null,c=(w=this.planSummary)==null?void 0:w.estimatedCostCzk,p=(C=this.planSummary)==null?void 0:C.costIfAllGrid,u=t.some(k=>k.overflowAvailable&&new Date(k.end).getTime()>Date.now()),h=((D=this.legionella)==null?void 0:D.enabled)??!1,g=(((T=this.circulationRuns)==null?void 0:T.length)??0)>0,v=r!==!1&&i.length===0?y("boiler.plan.why_idle",e):l?`${y("boiler.plan.why_next",e)} ${this._sourceLabel(l.source)} (${Na(l.startIso)})`:y("boiler.plan.why_generic",e);return s`
      <div class="card" data-testid="boiler-plan">
        <div class="hd"><div class="ttl">🗓️ ${y("boiler.plan.heading",e)}</div>${n}</div>

        <div class="sum">
          <div class="kv"><div class="k">🎯 ${y("boiler.plan.deadline",e)}</div><div class="v">${o}</div></div>
          <div class="kv"><div class="k">⏭ ${y("boiler.plan.next_action",e)}</div>
            <div class="v">${l?s`${Na(l.startIso)} · ${_l[l.source].icon} ${this._sourceLabel(l.source)}`:"—"}</div></div>
          <div class="kv"><div class="k">💰 ${y("boiler.plan.cost_today",e)}</div>
            <div class="v">${c!=null?`${c.toFixed(2)} Kč`:"—"}${p!=null?s` <small>${y("boiler.plan.vs_grid",e)} ${p.toFixed(2)}</small>`:x}</div></div>
          <div class="kv"><div class="k">☀️ ${y("boiler.plan.overflow",e)}</div><div class="v">${y(u?"boiler.plan.overflow_yes":"boiler.plan.overflow_no",e)}</div></div>
          <div class="kv"><div class="k">🦠 ${y("boiler.plan.legionella",e)}</div><div class="v">${y(h?"boiler.plan.on":"boiler.plan.off",e)}</div></div>
          <div class="kv"><div class="k">🔁 ${y("boiler.plan.circulation",e)}</div><div class="v">${y(g?"boiler.plan.on":"boiler.plan.off",e)}</div></div>
        </div>

        <div class="why">💡 ${v}</div>

        <p class="agtitle">⏱ ${y("boiler.plan.upcoming",e)}</p>
        <div class="ag">
          ${i.length===0?s`<div class="empty">${y("boiler.plan.nothing",e)} 👍</div>`:i.slice(0,6).map(k=>{const P=_l[k.source];return s`<div class="ai">
                  <div class="dot" style="background:${P.color}"></div>
                  <div class="t">${Na(k.startIso)}–${Na(k.endIso)}</div>
                  <div class="src">${P.icon} ${this._sourceLabel(k.source)}${k.legionella?" 🦠":""}</div>
                  <div class="amt">${k.kwh.toFixed(1)} kWh</div>
                </div>`})}
          ${(I=this.planSummary)!=null&&I.deadlineTime?s`<div class="ai deadline">
            <div class="dot" style="background:#29b6f6"></div>
            <div class="t">🛡 ${o}</div>
            <div class="src">${y("boiler.plan.safety",e)}</div>
          </div>`:x}
        </div>
      </div>
    `}};$t.styles=z`
    :host { display: block; }
    .card { background: ${tt(d.cardBg)}; border-radius: 14px; box-shadow: ${tt(d.cardShadow)}; padding: 16px 18px; }
    .hd { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .ttl { font-size: 15px; font-weight: 650; display: flex; align-items: center; gap: 8px; color: ${tt(d.textPrimary)}; }
    .chip { font-size: 11px; padding: 3px 10px; border-radius: 999px; font-weight: 600; }
    .chip.ok { background: rgba(94,234,212,.16); color: #2e9c89; }
    .chip.heat { background: rgba(56,163,255,.18); color: #2b80d6; }
    .chip.warn { background: rgba(251,191,36,.18); color: #b7791f; }
    .sum { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin: 14px 0; }
    @media (max-width: 640px) { .sum { grid-template-columns: 1fr 1fr; } }
    .kv { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 10px 12px; }
    .kv .k { font-size: 11px; color: ${tt(d.textSecondary)}; display: flex; gap: 6px; align-items: center; }
    .kv .v { font-size: 15px; font-weight: 650; margin-top: 3px; color: ${tt(d.textPrimary)}; }
    .kv .v small { font-weight: 400; color: ${tt(d.textSecondary)}; font-size: 11px; }
    .why { background: rgba(56,163,255,.08); border: 1px solid rgba(56,163,255,.18); border-radius: 12px; padding: 11px 14px; font-size: 13px; margin-bottom: 14px; color: ${tt(d.textPrimary)}; }
    .agtitle { font-size: 12px; color: ${tt(d.textSecondary)}; margin: 0 0 8px; font-weight: 600; }
    .ag { display: flex; flex-direction: column; gap: 8px; }
    .ai { display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); }
    .ai .dot { width: 10px; height: 30px; border-radius: 4px; flex: 0 0 auto; }
    .ai .t { font-weight: 700; font-size: 13px; min-width: 104px; color: ${tt(d.textPrimary)}; }
    .ai .src { font-weight: 600; font-size: 13px; flex: 1; color: ${tt(d.textPrimary)}; }
    .ai .amt { font-size: 12px; color: ${tt(d.textSecondary)}; }
    .ai.deadline { background: rgba(41,182,246,.08); border-color: rgba(41,182,246,.3); }
    .empty { color: ${tt(d.textSecondary)}; font-size: 13px; padding: 14px; text-align: center; }
  `;Qt([m({attribute:!1})],$t.prototype,"planSlots",2);Qt([m({attribute:!1})],$t.prototype,"planSummary",2);Qt([m({attribute:!1})],$t.prototype,"legionella",2);Qt([m({attribute:!1})],$t.prototype,"circulationRuns",2);Qt([m({attribute:!1})],$t.prototype,"status",2);Qt([m({type:String})],$t.prototype,"altSourceType",2);Qt([m({type:String})],$t.prototype,"lang",2);$t=Qt([E("oig-boiler-plan")],$t);var B2=Object.defineProperty,j2=Object.getOwnPropertyDescriptor,br=(e,t,i,r)=>{for(var a=r>1?void 0:r?j2(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&B2(t,i,a),a};const ut=X,$l=["fve","grid","battery","alt"];function N2(e){const t={times:[],liters:[],fve:[],grid:[],battery:[],alt:[],draw:[],temp:[],overflow:[]};for(const i of e){const r=i.pvKwh??0,a=i.gridKwh??0,n=i.altKwh??0,o=i.heatingKwh??0,l=Math.max(0,o-r-a-n);t.times.push(new Date(i.start).getTime()),t.liters.push(i.readyLiters??null),t.fve.push(r),t.grid.push(a),t.battery.push(l),t.alt.push(n),t.draw.push(i.consumptionKwh??0),t.temp.push(i.expectedTempTopC??null),t.overflow.push(!!i.overflowAvailable)}return t}const nt={fve:"#ffb300",grid:"#38a3ff",battery:"#a78bfa",alt:"#ff6a3d",draw:"#38bdf8",temp:"#ff7a45",soc:"#22d3ee",ov:"#ffd54f",ok:"#5eead4"};let jt=class extends O{constructor(){super(...arguments),this.planSlots=[],this.capacityLiters=200,this.nowLiters=null,this.drivesPlan=!0,this.lang="cs"}_svg(e){const t=e.times.length,i=Math.max(1,this.capacityLiters),r=960,a=40,n=38,o=14,l=10,c=150,p=120,h=o+c+l+p+22,g=r-a-n,v=o+c,f=v+l,b=f+p*.6,$=f+p,_=g/t,w=H=>a+H*_,C=H=>v-H/i*c,D=Math.max(.4,...$l.map(H=>Math.max(...e[H])))*1.05,T=Math.max(.3,...e.draw)*1.05,I=b-f,k=$-b,P=H=>b-H/D*I,V=H=>b+H/T*k,Y=e.temp.filter(H=>H!=null),U=20,Z=Math.max(72,...Y),Q=H=>v-(H-U)/(Z-U)*c,Se=e.times[0]??0,re=H=>new Date(e.times[H]??Se).getHours();let q=`<svg viewBox="0 0 ${r} ${h}" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="bsocg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity=".55"/><stop offset="1" stop-color="#0891b2" stop-opacity=".06"/></linearGradient></defs>`,de=0;for(;de<t;)if(e.overflow[de]){let H=de;for(;H<t&&e.overflow[H];)H++;q+=`<rect x="${w(de)}" y="${o}" width="${w(H)-w(de)}" height="${c+l+p}" fill="${nt.ov}" opacity=".1"/>`,de=H}else de++;for(let H=0;H<t;H++)if(re(H)%3===0&&(H===0||re(H)!==re(H-1))){const oe=w(H);q+=`<line x1="${oe}" y1="${o}" x2="${oe}" y2="${$}" stroke="rgba(255,255,255,.05)"/><text x="${oe}" y="${h-6}" fill="#6b7785" font-size="10" text-anchor="middle">${String(re(H)).padStart(2,"0")}:00</text>`}[0,Math.round(i/2),i].forEach(H=>{q+=`<text x="${a-4}" y="${C(H)+3}" fill="#6b7785" font-size="9" text-anchor="end">${H}L</text>`});const F=[];if(e.liters.forEach((H,oe)=>{H!=null&&F.push([w(oe)+_/2,C(H)])}),F.length){let H=`M${F[0][0].toFixed(1)} ${v}`;for(const[be,dt]of F)H+=` L${be.toFixed(1)} ${dt.toFixed(1)}`;H+=` L${F[F.length-1][0].toFixed(1)} ${v} Z`,q+=`<path d="${H}" fill="url(#bsocg)"/>`;let oe="";F.forEach(([be,dt],Jt)=>{oe+=(Jt?"L":"M")+be.toFixed(1)+" "+dt.toFixed(1)+" "}),q+=`<path d="${oe}" fill="none" stroke="${nt.soc}" stroke-width="2.6"/>`}this.nowLiters!=null&&(q+=`<circle cx="${w(0)+_/2}" cy="${C(this.nowLiters)}" r="3.5" fill="#fff"/>`);let ae="",M=!1;e.temp.forEach((H,oe)=>{H!=null&&(ae+=(M?"L":"M")+(w(oe)+_/2).toFixed(1)+" "+Q(H).toFixed(1)+" ",M=!0)}),M&&(q+=`<path d="${ae}" fill="none" stroke="${nt.temp}" stroke-width="1.3" opacity=".75"/>`),[40,60].forEach(H=>{H>=U&&H<=Z&&(q+=`<text x="${a+g+4}" y="${Q(H)+3}" fill="${nt.temp}" font-size="8" opacity=".6">${H}°</text>`)}),q+=`<line x1="${a}" y1="${b}" x2="${a+g}" y2="${b}" stroke="rgba(255,255,255,.12)"/>`;for(let H=0;H<t;H++){let oe=0;for(const be of $l){const dt=e[be][H];if(dt>.001){const Jt=P(oe),ei=P(oe+dt);q+=`<rect x="${(w(H)+.3).toFixed(1)}" y="${ei.toFixed(1)}" width="${(_-.6).toFixed(1)}" height="${(Jt-ei).toFixed(1)}" fill="${nt[be]}" opacity=".9"/>`,oe+=dt}}if(e.draw[H]>.001){const be=V(e.draw[H]);q+=`<rect x="${(w(H)+.3).toFixed(1)}" y="${b}" width="${(_-.6).toFixed(1)}" height="${(be-b).toFixed(1)}" fill="${nt.draw}" opacity=".8"/>`}}return q+=`<text x="${a-4}" y="${f+10}" fill="#6b7785" font-size="8" text-anchor="end">${y("boiler.soc.charging",this.lang)}</text>`,q+=`<text x="${a-4}" y="${$-2}" fill="#6b7785" font-size="8" text-anchor="end">${y("boiler.soc.draw",this.lang)}</text>`,q+=`<line x1="${w(0)}" y1="${o}" x2="${w(0)}" y2="${$}" stroke="#fff" stroke-width="1.5"/><text x="${w(0)+12}" y="${o+10}" fill="#fff" font-size="9">${y("boiler.soc.now",this.lang)}</text>`,q+="</svg>",q}render(){const e=this.lang,t=`📊 ${y("boiler.soc.heading",e)}`,i=this.planSlots??[];if(i.length===0)return s`<div class="card" data-testid="boiler-soc-chart"><div class="hd"><span class="ttl">${t}</span></div><div class="empty-state">${y("boiler.soc.empty",e)}</div></div>`;const r=N2(i);return s`
      <div class="card" data-testid="boiler-soc-chart">
        <div class="hd">
          <span class="ttl">${t}</span>
          ${this.drivesPlan?s`<span class="badge ok">${y("boiler.demand_map.drives_plan",e)}</span>`:s`<span class="badge learn">${y("boiler.demand_map.learning",e)}</span>`}
        </div>
        <div class="svg-wrap">${mt(this._svg(r))}</div>
        <div class="legend">
          <span><i class="soc"></i>${y("boiler.soc.legend_soc",e)}</span>
          <span><i style="background:${ut(nt.fve)}"></i>${y("boiler.plan.src_fve",e)}</span>
          <span><i style="background:${ut(nt.grid)}"></i>${y("boiler.plan.src_grid",e)}</span>
          <span><i style="background:${ut(nt.battery)}"></i>${y("boiler.plan.src_battery",e)}</span>
          <span><i style="background:${ut(nt.alt)}"></i>${y("boiler.soc.legend_draw",e)}</span>
          <span><i class="ov"></i>${y("boiler.soc.legend_overflow",e)}</span>
          <span><span class="lnT"></span>${y("boiler.soc.legend_temp",e)}</span>
        </div>
      </div>
    `}};jt.styles=z`
    :host { display: block; }
    .card { background: ${ut(d.cardBg)}; border-radius: 14px; box-shadow: ${ut(d.cardShadow)}; padding: 16px 18px; }
    .hd { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
    .ttl { font-size: 14px; font-weight: 600; color: ${ut(d.textPrimary)}; }
    .badge { font-size: 10.5px; padding: 2px 8px; border-radius: 7px; font-weight: 600; margin-left: auto; }
    .badge.ok { background: rgba(94,234,212,.16); color: #2e9c89; }
    .badge.learn { background: rgba(255,179,0,.18); color: #b7791f; }
    .svg-wrap { width: 100%; overflow-x: auto; }
    .svg-wrap svg { display: block; width: 100%; height: auto; min-width: 340px; }
    .legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; font-size: 11px; color: ${ut(d.textSecondary)}; }
    .legend i { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
    .legend .soc { background: linear-gradient(90deg,#22d3ee,#0891b2); }
    .legend .ov { background: ${ut(nt.ov)}; opacity: .6; }
    .legend .lnT { width: 16px; height: 0; border-top: 2px solid ${ut(nt.temp)}; display: inline-block; margin-right: 5px; vertical-align: 3px; }
    .empty-state { text-align: center; padding: 24px 0; color: ${ut(d.textSecondary)}; font-size: 13px; }
  `;br([m({attribute:!1})],jt.prototype,"planSlots",2);br([m({type:Number})],jt.prototype,"capacityLiters",2);br([m({type:Number})],jt.prototype,"nowLiters",2);br([m({type:Boolean})],jt.prototype,"drivesPlan",2);br([m({type:String})],jt.prototype,"lang",2);jt=br([E("oig-boiler-soc-chart")],jt);var R2=Object.defineProperty,W2=Object.getOwnPropertyDescriptor,Ge=(e,t,i,r)=>{for(var a=r>1?void 0:r?W2(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&R2(t,i,a),a};function kl(e){if(e==null||!isFinite(e))return"#37474f";const t=[[10,[21,101,192]],[25,[38,198,218]],[40,[255,183,77]],[55,[255,112,67]],[70,[230,74,25]]];if(e<=t[0][0])return Ra(t[0][1]);if(e>=t[t.length-1][0])return Ra(t[t.length-1][1]);for(let i=1;i<t.length;i++)if(e<=t[i][0]){const[r,a]=t[i-1],[n,o]=t[i],l=(e-r)/(n-r);return Ra([Math.round(a[0]+(o[0]-a[0])*l),Math.round(a[1]+(o[1]-a[1])*l),Math.round(a[2]+(o[2]-a[2])*l)])}return Ra(t[t.length-1][1])}function Ra(e){return`rgb(${e[0]},${e[1]},${e[2]})`}function K2(e){return e==null||!isFinite(e)||e<=.005||e>=.995?null:(1-e)*100}function Z2(e,t,i,r,a){const n=[y("boiler.aria.svg_summary",a)];n.push(`${y("boiler.status.temp_top",a)}: ${er(e)}`),n.push(`${y("boiler.status.temp_bottom",a)}: ${er(t)}`);const o=i?Ui(i,a):y("boiler.aria.source_unknown",a);return n.push(o),r&&n.push(y("boiler.aria.stale",a)),n.join(". ")}let Ne=class extends O{constructor(){super(...arguments),this.fillLevelPct=null,this.sourceSegments=[],this.energyMix=null,this.topTempC=null,this.bottomTempC=null,this.lowerZoneTempC=null,this.volumeL=null,this.readyLiters=null,this.etaText=null,this.sourceKey=null,this.stale=!1,this.chargingLabel=null,this.altCharging=!1,this.sourceEstimated=!1,this.lang="cs"}render(){try{return this._renderTank()}catch{return s`
        <div class="bwrap" data-testid="boiler-svg" role="img"
             aria-label="${y("boiler.aria.svg_summary",this.lang)}">
        </div>
      `}}_renderTank(){const e=Z2(this.topTempC,this.bottomTempC,this.sourceKey,this.stale,this.lang),t=this.fillLevelPct??null,i=this.topTempC!=null?`${this.topTempC.toFixed(1)} °C`:"— °C",r=this.bottomTempC??this.lowerZoneTempC??null,a=r!=null?`dole ${r.toFixed(1)} °C`:null,n=this.readyLiters??(t!=null&&this.volumeL!=null?Math.round(t*this.volumeL):null),o=n??null,l=this._renderTrendChip(),c=this.chargingLabel!=null,p=kl(this.topTempC),u=kl(r??this.topTempC),h=`linear-gradient(180deg, ${p} 0%, ${u} 100%)`,g=K2(t),v=this._renderSourceChipBelow();return s`
      <div class="bwrap" data-testid="boiler-svg" role="img" aria-label="${e}">
        <div class="tank">
          <div class="shell">
            <div
              class="thermal"
              data-testid="boiler-thermal-fill"
              style="background:${h};"
            >
              ${c?s`<div class="surf surf--charging"></div>`:x}
              ${g!=null?s`
                <div
                  class="ready-line"
                  data-testid="boiler-ready-line"
                  style="top:${g.toFixed(1)}%;"
                ></div>
              `:x}
            </div>
          </div>

          ${l}

          <div
            class="ttop"
            data-testid="boiler-temp-top-label"
          >${i}</div>

          ${o!=null?s`
            <div class="vol" data-testid="boiler-volume-badge">
              ${o} L
              <s class="vol-caption">${y("boiler.tank.ready_caption",this.lang)}</s>
            </div>
          `:x}

          ${r!=null?s`
            <div class="tbot" data-testid="boiler-temp-bottom-label">${a}</div>
          `:x}
        </div>

        ${v}

        ${this.etaText!=null?s`
          <div class="eta" data-testid="boiler-eta-chip">${this.etaText}</div>
        `:x}
      </div>
    `}_renderTrendChip(){const e=this.chargingLabel;if(e!=null){const t=this.altCharging?"trend trend--alt":"trend";return s`
        <div class="${t}" data-testid="boiler-trend-chip">${e}</div>
      `}return x}_renderSourceChipBelow(){const e=this.sourceKey;if(e==null)return s`
        <div class="srcchip srcchip--idle" data-testid="boiler-source-chip">
          ${y("boiler.tank.source_idle",this.lang)}
        </div>
      `;const t={fve:y("boiler.tank.source_fve",this.lang),overflow:y("boiler.tank.source_fve",this.lang),grid:y("boiler.tank.source_grid",this.lang),battery:y("boiler.tank.source_battery",this.lang),discharge:y("boiler.tank.source_battery",this.lang),alternative:y("boiler.tank.source_alt",this.lang)},i={fve:"srcchip",overflow:"srcchip",grid:"srcchip srcchip--grid",battery:"srcchip srcchip--battery",discharge:"srcchip srcchip--battery",alternative:"srcchip srcchip--alt"},r=t[e]??Ui(e,this.lang),a=i[e]??"srcchip",n=this.sourceEstimated?s` <small data-testid="boiler-source-estimated">${y("boiler.tank.source_estimated_suffix",this.lang)}</small>`:x;return s`
      <div class="${a}" data-testid="boiler-source-chip">${r}${n}</div>
    `}};Ne.styles=z`
    :host {
      display: block;
      width: 100%;
    }

    /* ── tank wrapper (mockup .bwrap) ── */
    .bwrap {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* ── tank container (mockup .tank) ── */
    .tank {
      position: relative;
      width: 150px;
      height: 300px;
    }

    /* ── outer shell ── */
    .shell {
      position: absolute;
      inset: 0;
      border-radius: 42px;
      background: #0d1526;
      border: 2px solid rgba(255,255,255,.16);
      overflow: hidden;
      box-shadow: inset 0 0 26px rgba(0,0,0,.6), 0 10px 26px rgba(0,0,0,.5);
    }

    /* ── full-tank thermal gradient (stratification) ── */
    .thermal {
      position: absolute;
      inset: 0;
    }

    /* thin marker at the 40 °C ready boundary */
    .ready-line {
      position: absolute;
      left: 6%;
      right: 6%;
      height: 0;
      border-top: 1.5px dashed rgba(255, 255, 255, 0.55);
      box-shadow: 0 0 6px rgba(255, 255, 255, 0.25);
    }

    /* ── aura fill (legacy, kept for tests/back-compat) ── */
    .aura {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      /* height is set inline = fill_level_pct% */
    }

    /* ── individual source layers ── */
    .seg {
      position: absolute;
      left: 0;
      right: 0;
      /* bottom + height set inline */
    }

    /* ── glossy surf ellipse on top of aura ── */
    .surf {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      height: 10px;
      border-radius: 50%;
      background: rgba(255,255,255,.35);
      box-shadow: 0 0 12px rgba(255,255,255,.35);
    }

    /* ── surf pulse when charging ── */
    .surf--charging {
      animation: surfPulse 1.8s ease-in-out infinite;
    }

    @keyframes surfPulse {
      0%, 100% { opacity: 1; transform: scaleX(1); }
      50% { opacity: 0.6; transform: scaleX(0.92); }
    }

    /* ── trend chip top-center ── */
    .trend {
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 9.5px;
      font-weight: 700;
      background: rgba(76,175,80,.2);
      border: 1px solid rgba(76,175,80,.45);
      color: #b8f0bf;
      border-radius: 6px;
      padding: 2px 8px;
      white-space: nowrap;
      z-index: 2;
    }

    .trend--idle {
      background: rgba(120,130,150,.18);
      border-color: rgba(120,130,150,.35);
      color: #9aa6b2;
    }

    .trend--cooling {
      background: rgba(33,150,243,.15);
      border-color: rgba(33,150,243,.35);
      color: #81d4fa;
    }

    /* ── alt/gas heating: orange tint ── */
    .trend--alt {
      background: rgba(255,138,101,.18);
      border-color: rgba(255,138,101,.4);
      color: #ffab91;
    }

    /* ── top temperature ── */
    .ttop {
      position: absolute;
      top: 34px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 24px;
      font-weight: 800;
      text-shadow: 0 2px 5px rgba(0,0,0,.85);
      color: #fff;
      z-index: 2;
    }

    /* ── bottom temperature ── */
    .tbot {
      position: absolute;
      bottom: 30px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      opacity: .9;
      text-shadow: 0 2px 4px rgba(0,0,0,.85);
      color: #fff;
      z-index: 2;
    }

    /* ── volume pill (center) ── */
    .vol {
      position: absolute;
      top: 46%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(13,21,38,.85);
      border: 1px solid rgba(255,255,255,.25);
      border-radius: 9px;
      padding: 5px 12px;
      font-size: 15px;
      font-weight: 800;
      color: #fff;
      text-align: center;
      white-space: nowrap;
      z-index: 2;
    }

    .vol-caption {
      display: block;
      font-size: 8.5px;
      font-weight: 600;
      opacity: .6;
      text-align: center;
      text-decoration: none;
    }

    /* ── below-tank elements ── */
    .srcchip {
      margin-top: 10px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(255,167,38,.16);
      border: 1px solid rgba(255,167,38,.4);
      color: #ffd479;
      border-radius: 7px;
      padding: 4px 12px;
      text-align: center;
    }

    .srcchip--grid {
      background: rgba(79,195,247,.13);
      border-color: rgba(79,195,247,.35);
      color: #81d4fa;
    }

    .srcchip--battery {
      background: rgba(179,157,219,.16);
      border-color: rgba(179,157,219,.4);
      color: #ce93d8;
    }

    .srcchip--alt {
      background: rgba(255,138,101,.16);
      border-color: rgba(255,138,101,.4);
      color: #ffab91;
    }

    .srcchip--idle {
      background: rgba(120,130,150,.12);
      border-color: rgba(120,130,150,.3);
      color: #9aa6b2;
    }

    .eta {
      margin-top: 6px;
      font-size: 10.5px;
      opacity: .7;
      color: #eef4fb;
      text-align: center;
    }
  `;Ge([m({type:Number})],Ne.prototype,"fillLevelPct",2);Ge([m({type:Array})],Ne.prototype,"sourceSegments",2);Ge([m({type:Object})],Ne.prototype,"energyMix",2);Ge([m({type:Number})],Ne.prototype,"topTempC",2);Ge([m({type:Number})],Ne.prototype,"bottomTempC",2);Ge([m({type:Number})],Ne.prototype,"lowerZoneTempC",2);Ge([m({type:Number})],Ne.prototype,"volumeL",2);Ge([m({type:Number})],Ne.prototype,"readyLiters",2);Ge([m({type:String})],Ne.prototype,"etaText",2);Ge([m({type:String})],Ne.prototype,"sourceKey",2);Ge([m({type:Boolean})],Ne.prototype,"stale",2);Ge([m({type:String})],Ne.prototype,"chargingLabel",2);Ge([m({type:Boolean})],Ne.prototype,"altCharging",2);Ge([m({type:Boolean})],Ne.prototype,"sourceEstimated",2);Ge([m({type:String})],Ne.prototype,"lang",2);Ne=Ge([E("oig-boiler-v2-svg")],Ne);var q2=Object.defineProperty,G2=Object.getOwnPropertyDescriptor,On=(e,t,i,r)=>{for(var a=r>1?void 0:r?G2(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&q2(t,i,a),a};const Cl=X,ho=new Set(["temperature_unavailable","temperature_stale","activity_stale","source_invalid","runtime_cache_empty","config_profile_unavailable"]);function U2(e){var t,i,r,a;if((t=e.status)!=null&&t.degraded)return!0;for(const n of((i=e.status)==null?void 0:i.degradedFlags)??[])if(ho.has(n))return!0;for(const n of((r=e.activity)==null?void 0:r.staleFlags)??[])if(ho.has(n))return!0;for(const n of((a=e.explanation)==null?void 0:a.degradedReasons)??[])if(ho.has(n))return!0;return!1}function Y2(e,t,i){var p,u,h;const r=e.activity;if(!r)return null;const a=t.targetTempC??0,n=r2({targetTempC:a,topTempC:((p=e.status)==null?void 0:p.temperatureTop)??null,temperatureTrendCPerMin:r.temperatureTrendCPerMin,volumeL:t.volumeL,heaterPowerKw:t.heaterPowerKw});if(n===null)return y("boiler.eta.unavailable",i);if(n===0)return y("boiler.eta.already_reached",i);const o=`na ${a.toFixed(0)} °C za ~${i2(n)}`,l=((u=e.planSummary)==null?void 0:u.deadlineTime)??t.deadlineTime,c=((h=e.status)==null?void 0:h.comfortSatisfied)??null;if(l&&l!=="--:--"){const g=l.substring(0,5);return`${o} · ${i==="cs"?"komfort":"comfort"} ${g}${c===!0?" ✓":""}`}return o}let ar=class extends O{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs"}render(){try{return this._renderShell()}catch{return s`
        <div class="shell" data-testid="boiler-v2-shell">
          <div class="stale-warning" data-testid="boiler-stale-warning" role="alert">
            ${y("boiler.aria.stale",this.lang)}
          </div>
        </div>
      `}}_renderShell(){var v,f;const e=this.data,t=e?U2(e):!1,i=(e==null?void 0:e.activity)??null,r=(e==null?void 0:e.status)??null,a=this.config,n=e&&a?Y2(e,a,this.lang):null,l=((v=i==null?void 0:i.state)==null?void 0:v.startsWith("charging_"))??!1?(i==null?void 0:i.source)??null:null,c=(i==null?void 0:i.state)==="charging_alt",p=(()=>{var $;if(!(($=i==null?void 0:i.state)!=null&&$.startsWith("charging_")))return null;const b=c?"🔥 OHŘÍVÁ":"⚡ NABÍJÍ";if(i.temperatureTrendCPerMin!=null){const _=i.temperatureTrendCPerMin>=0?"+":"",w=i.temperatureTrendCPerMin.toLocaleString("cs-CZ",{minimumFractionDigits:1,maximumFractionDigits:1});return`${b} ${_}${w} °C/min`}return b})(),u=((f=e==null?void 0:e.status)==null?void 0:f.lowerZoneTempC)??null,h=(i==null?void 0:i.fillLevelPct)??null,g=h!=null&&(a==null?void 0:a.volumeL)!=null?Math.round(h*a.volumeL):null;return s`
      <div class="shell" data-testid="boiler-v2-shell">
        ${t?s`
              <div class="stale-warning" data-testid="boiler-stale-warning" role="alert">
                ${y("boiler.aria.stale",this.lang)}
              </div>
            `:x}

        <div class="svg-wrapper">
          <oig-boiler-v2-svg
            .fillLevelPct="${h}"
            .sourceSegments="${(e==null?void 0:e.sourceSegments)??[]}"
            .energyMix="${e!=null&&e.energyToday?{fve:e.energyToday.fveKwh,grid:e.energyToday.gridKwh,battery:e.energyToday.batteryKwh,alt:e.energyToday.altKwh,unattributed:e.energyToday.unattributedKwh}:null}"
            .topTempC="${(r==null?void 0:r.temperatureTop)??null}"
            .bottomTempC="${(r==null?void 0:r.temperatureBottom)??null}"
            .lowerZoneTempC="${u}"
            .volumeL="${(a==null?void 0:a.volumeL)??null}"
            .readyLiters="${g}"
            .etaText="${n}"
            .sourceKey="${l}"
            .chargingLabel="${p}"
            .altCharging="${c}"
            .sourceEstimated="${(i==null?void 0:i.sourceEstimated)===!0}"
            .stale="${t}"
            .lang="${this.lang}"
          ></oig-boiler-v2-svg>
        </div>
        <span aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">${(r==null?void 0:r.temperatureTop)??""}</span>

        <div class="advanced-slot" data-testid="boiler-advanced-slot">
          <slot name="advanced"></slot>
        </div>
      </div>
    `}};ar.styles=z`
    :host {
      display: block;
      font-family: ${Cl(d.fontFamily)};
    }

    .shell {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px;
      max-width: 300px;
      margin: 0 auto;
      /* mockup .bwrap: the tank sits on its own card */
      background: ${Cl(d.cardBg)};
      border-radius: 12px;
    }

    /* Compact corner chip — mockup has no full-width banner. */
    .stale-warning {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(255, 152, 0, 0.15);
      border: 1px solid rgba(255, 152, 0, 0.4);
      color: #ffcc80;
      font-size: 10.5px;
      font-weight: 600;
    }

    .svg-wrapper {
      width: 100%;
    }

    .advanced-slot {
      width: 100%;
    }
  `;On([m({type:Object})],ar.prototype,"data",2);On([m({type:Object})],ar.prototype,"config",2);On([m({type:String})],ar.prototype,"lang",2);ar=On([E("oig-boiler-v2-shell")],ar);var Q2=Object.defineProperty,X2=Object.getOwnPropertyDescriptor,fr=(e,t,i,r)=>{for(var a=r>1?void 0:r?X2(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&Q2(t,i,a),a};let Nt=class extends O{constructor(){super(...arguments),this.values=[],this.color="#4CAF50",this.sparkWidth=100,this.sparkHeight=30,this.label=""}render(){try{return this._renderSparkline()}catch{return s`<svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      ></svg>`}}_renderSparkline(){const e=Array.isArray(this.values)?this.values:[],t=e.filter(u=>typeof u=="number"&&isFinite(u));if(t.length<2)return s`<svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        viewBox="0 0 ${this.sparkWidth} ${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      ></svg>`;const i=Math.min(...t),a=Math.max(...t)-i||1,n=2,o=this.sparkHeight-n*2,l=this.sparkWidth,c=e.length,p=e.map((u,h)=>{if(typeof u!="number"||!isFinite(u))return null;const g=c>1?h/(c-1)*l:l/2,v=n+o-(u-i)/a*o;return`${g.toFixed(2)},${v.toFixed(2)}`}).filter(u=>u!==null).join(" ");return s`
      <svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        viewBox="0 0 ${this.sparkWidth} ${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      >
        ${N`<polyline
          points="${p}"
          fill="none"
          stroke="${this.color}"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />`}
      </svg>
    `}};Nt.styles=z`
    :host {
      display: inline-block;
    }
    svg {
      display: block;
      overflow: visible;
    }
  `;fr([m({type:Array})],Nt.prototype,"values",2);fr([m({type:String})],Nt.prototype,"color",2);fr([m({type:Number})],Nt.prototype,"sparkWidth",2);fr([m({type:Number})],Nt.prototype,"sparkHeight",2);fr([m({type:String})],Nt.prototype,"label",2);Nt=fr([E("oig-boiler-sparkline")],Nt);var J2=Object.defineProperty,ev=Object.getOwnPropertyDescriptor,fa=(e,t,i,r)=>{for(var a=r>1?void 0:r?ev(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&J2(t,i,a),a};const Wa=X;function tv(e,t){switch(e){case"fve":case"overflow":return y("boiler.panel.source_overflow",t);case"grid":return y("boiler.panel.source_grid",t);case"battery":return y("boiler.panel.source_battery_short",t);case"alternative":return y("boiler.panel.source_alt",t);default:return e??"—"}}function iv(e){switch(e){case"morning":return"🌅";case"afternoon":return"☀️";case"evening":return"🌆";case"night":return"🌙";default:return"💧"}}function rv(e,t){const i=`boiler.demand_map.window.${e}`,r=y(i,t);return r!==i?r.toLowerCase():e}function av(e){const t=e*15,i=Math.floor(t/60)%24,r=t%60;return`${String(i).padStart(2,"0")}:${String(r).padStart(2,"0")}`}function Sl(e){const t=new Date(e);return Number.isNaN(t.getTime())?"??:??":`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`}function nv(e,t){const i=Date.now();for(const r of e){const a=new Date(r.start).getTime();if(!Number.isFinite(a)||a<i-6e4)continue;const n=r.heatingKwh??null;if(n!==null&&n<=0)continue;const o=r.recommendedSource;if(!o)continue;const l=new Date(a),c=new Date,p=l.getDate()!==c.getDate()||l.getMonth()!==c.getMonth()||l.getFullYear()!==c.getFullYear(),u=tv(o,t),h=`${String(l.getHours()).padStart(2,"0")}:${String(l.getMinutes()).padStart(2,"0")}`;return{label:u,timeStr:h,isTomorrow:p}}return null}let wi=class extends O{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs",this.panelType="source"}render(){try{return this.panelType==="source"?this._renderSourcePanel():this._renderComfortPanel()}catch{return s`
        <div class="panel">
          <div class="empty-panel">—</div>
        </div>
      `}}_renderSourcePanel(){var V;const e=this.data,t=this.lang,i=(e==null?void 0:e.energyToday)??null,r=(e==null?void 0:e.planSummary)??null,a=(e==null?void 0:e.activity)??null,n=(e==null?void 0:e.planSlots)??[],o=(i==null?void 0:i.costCzk)??(r==null?void 0:r.estimatedCostCzk)??null,l=(i==null?void 0:i.totalKwh)??null,c=(i==null?void 0:i.fveKwh)??null,p=(i==null?void 0:i.gridKwh)??null,u=(i==null?void 0:i.altKwh)??null,h=u!=null&&u>0,g=(i==null?void 0:i.unattributedKwh)??null,v=g!=null&&g>.05,f=rr(e==null?void 0:e.altSourceType,t),b=(i==null?void 0:i.batteryKwh)??null,$=b!=null&&b>0,_=(i==null?void 0:i.savingsVsAltCzk)??null,w=_!=null&&_>=0?`${_.toFixed(1).replace(".",",")} Kč`:null,D=((V=a==null?void 0:a.state)==null?void 0:V.startsWith("charging_"))??!1?(a==null?void 0:a.source)??null:null,T=(a==null?void 0:a.sourceEstimated)===!0,I=(()=>{switch(D){case"fve":case"overflow":return y("boiler.panel.source_overflow",t);case"grid":return y("boiler.panel.source_grid_short",t);case"discharge":return y("boiler.panel.source_battery_short",t);case"alternative":return y("boiler.panel.source_alt",t);default:return"—"}})(),k=T&&D!=null?`${I} (${y("boiler.tank.source_estimated_suffix",t)})`:I,P=nv(n,t);return s`
      <div class="panel" data-testid="boiler-source-panel">
        <h3 class="panel-title">${y("boiler.panel.source_title",t)}</h3>

        <div class="kv">
          <span>${y("boiler.panel.cost_today",t)}</span>
          <b>${o!=null?`${o.toFixed(1).replace(".",",")} Kč`:"—"}</b>
        </div>

        <div class="kv">
          <span>${y("boiler.panel.energy_today",t)}</span>
          <b>${l!=null?`${l.toFixed(1).replace(".",",")} kWh`:"—"}</b>
        </div>

        <div class="kv">
          <span>${y("boiler.panel.fve_label",t)}</span>
          <b style="color:#ffd479">${c!=null?`${c.toFixed(1).replace(".",",")} kWh`:"—"}</b>
        </div>

        <div class="kv">
          <span>${y("boiler.panel.grid_label",t)}</span>
          <b style="color:#81d4fa">${p!=null?`${p.toFixed(1).replace(".",",")} kWh`:"—"}</b>
        </div>

        ${v?s`
          <div class="kv">
            <span>${y("boiler.panel.unattributed_label",t)}</span>
            <b style="color:#9aa6b2">${g.toFixed(1).replace(".",",")} kWh</b>
          </div>
        `:x}

        ${h||u!=null?s`
          <div class="kv">
            <span>${f}</span>
            <b style="color:#ffab91">${u!=null?`${u.toFixed(1).replace(".",",")} kWh`:"—"}</b>
          </div>
        `:x}

        ${$?s`
          <div class="kv">
            <span>${y("boiler.panel.battery_label",t)}</span>
            <b style="color:#ce93d8">${b.toFixed(1).replace(".",",")} kWh</b>
          </div>
        `:x}

        <div class="kv">
          <span>${y("boiler.panel.savings_label",t)}</span>
          <b style="color:#9fe6a8">${w??"—"}</b>
        </div>

        <div class="kv" data-testid="boiler-current-source-row">
          <span>${y("boiler.panel.current_source",t)}</span>
          <b>${k}</b>
        </div>

        <div class="kv" data-testid="boiler-next-action">
          <span>${y("boiler.panel.next_action",t)}</span>
          <b>${P!=null?P.isTomorrow?s`${P.label} ${y("boiler.panel.tomorrow",t)} ${P.timeStr}`:s`${P.label} ${P.timeStr}`:"—"}</b>
        </div>
      </div>
    `}_renderComfortPanel(){var $,_,w,C,D;const e=this.data,t=this.lang,r=(($=e==null?void 0:e.status)==null?void 0:$.comfortSatisfied)??null,a=(e==null?void 0:e.demandMap)??null,n=((_=a==null?void 0:a.windows)==null?void 0:_.slice(0,3))??[],o=(e==null?void 0:e.planSummary)??null,l=(o==null?void 0:o.deadlineTime)??(((w=this.config)==null?void 0:w.deadlineTime)!=="--:--"?(C=this.config)==null?void 0:C.deadlineTime:null)??null,c=((D=this.config)==null?void 0:D.targetTempC)??null,p=(e==null?void 0:e.legionella)??null,u=(()=>{if(!p)return null;if(!p.enabled)return y("boiler.panel.legionella_off",t);if(p.scheduledStart){const k=p.scheduledStart,P=k.includes("T")?Sl(k):k.substring(0,5);return`${y("boiler.panel.legionella_plan",t)} ${P}`}const T=p.daysSinceLast??null,I=p.intervalDays??null;if(T!==null&&I!==null){const k=I-T;return k<=0?y("boiler.panel.legionella_overdue",t):`${y("boiler.panel.legionella_in",t)} ${k} ${y("boiler.panel.legionella_days",t)}`}return y("boiler.panel.legionella_scheduled",t)})(),h=(e==null?void 0:e.activity)??null,g=(h==null?void 0:h.temperatureTrendCPerMin)??null,v=g!=null?`${g>=0?"+":""}${g.toFixed(1).replace(".",",")} °C/min`:null,f=(e==null?void 0:e.circulationRuns)??[],b=(()=>{if(!f.length)return null;const T=f[0];return`💧 ${Sl(T.start)} (${y("boiler.panel.circ_before_peak",t)})`})();return s`
      <div class="panel" data-testid="boiler-comfort-panel">
        <h3 class="panel-title">${y("boiler.panel.comfort_title",t)}</h3>

        ${r===!0?s`<span class="okchip" data-testid="boiler-comfort-chip">✓ ${y("boiler.status.comfort_satisfied",t)}</span>`:r===!1?s`<span class="gapcip" data-testid="boiler-comfort-chip">⚠ ${y("boiler.status.comfort_unsatisfied",t)}</span>`:x}

        ${n.map(T=>{const I=iv(T.label),k=rv(T.label,t),P=av(T.slotIndex),V=Math.round(T.liters);return s`
            <div class="kv" data-testid="boiler-demand-window">
              <span>${I} ${k} ${P}</span>
              <b>≥${V} L</b>
            </div>
          `})}

        ${l&&l!=="--:--"?s`
          <div class="kv" data-testid="boiler-deadline-row">
            <span>${y("boiler.panel.deadline_label",t)}</span>
            <b>${l.substring(0,5)}${c!=null?s` · ${c.toFixed(0)} °C`:x}</b>
          </div>
        `:x}

        ${u!=null?s`
          <div class="kv" data-testid="boiler-legionella-row">
            <span>${y("boiler.panel.legionella_label",t)}</span>
            <b>${u}</b>
          </div>
        `:x}

        ${v!=null?s`
          <div class="kv" data-testid="boiler-trend-row">
            <span>${y("boiler.panel.trend_label",t)}</span>
            <b>${v}</b>
          </div>
        `:x}

        ${b!=null?s`
          <div class="kv" data-testid="boiler-circ-row">
            <span>${y("boiler.panel.circ_label",t)}</span>
            <b>${b}</b>
          </div>
        `:s`
          <div class="kv" data-testid="boiler-circ-row">
            <span>${y("boiler.panel.circ_label",t)}</span>
            <b style="opacity:0.5">${y("boiler.panel.circ_off",t)}</b>
          </div>
        `}
      </div>
    `}};wi.styles=z`
    :host {
      display: block;
      font-family: ${Wa(d.fontFamily)};
    }

    /* ── Side panel wrapper ── */
    :host { height: 100%; }

    .panel {
      background: ${Wa(d.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
      box-sizing: border-box;
      height: 100%;
    }

    /* ── Section heading: UPPERCASE muted ── */
    .panel-title {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.7;
      color: ${Wa(d.textPrimary)};
    }

    /* ── KV row: label left (muted), bold value right, dashed separator ── */
    .kv {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      padding: 4px 0;
      border-bottom: 1px dashed rgba(255,255,255,.1);
    }
    .kv:last-child { border-bottom: none; }
    .kv span { opacity: 0.6; }
    .kv b { font-weight: 600; }

    /* ── OK chip: green, per mockup ── */
    .okchip {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      background: rgba(76,175,80,.16);
      border: 1px solid rgba(76,175,80,.35);
      color: #9fe6a8;
      border-radius: 7px;
      padding: 3px 10px;
      margin-bottom: 8px;
    }

    /* ── Gap chip: amber ── */
    .gapcip {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      background: rgba(255,152,0,.16);
      border: 1px solid rgba(255,152,0,.35);
      color: #ffd17c;
      border-radius: 7px;
      padding: 3px 10px;
      margin-bottom: 8px;
    }

    /* fallback panel */
    .empty-panel {
      color: ${Wa(d.textSecondary)};
      font-size: 12px;
      font-style: italic;
      padding: 4px 0;
    }
  `;fa([m({type:Object})],wi.prototype,"data",2);fa([m({type:Object})],wi.prototype,"config",2);fa([m({type:String})],wi.prototype,"lang",2);fa([m({type:String})],wi.prototype,"panelType",2);wi=fa([E("oig-boiler-metric-panel")],wi);var ov=Object.defineProperty,sv=Object.getOwnPropertyDescriptor,mr=(e,t,i,r)=>{for(var a=r>1?void 0:r?sv(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&ov(t,i,a),a};const go=X,jr=1e3,Ni=200,Ml=20,bo=80,di=3,Mt=100,ui=1440;function lv(e){return e??Date.now()}function dv(e,t){var n,o;const i=new Intl.DateTimeFormat("en-US",{timeZone:t,hour:"numeric",minute:"2-digit",hour12:!1}).formatToParts(new Date(e)),r=parseInt(((n=i.find(l=>l.type==="hour"))==null?void 0:n.value)??"0",10)%24,a=parseInt(((o=i.find(l=>l.type==="minute"))==null?void 0:o.value)??"0",10);return r*60+a}function cv(e,t){const i=new Intl.DateTimeFormat("en-US",{timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}).formatToParts(new Date(e)),r=_=>{var w;return((w=i.find(C=>C.type===_))==null?void 0:w.value)??"00"},a=r("year"),n=r("month"),o=r("day"),l=parseInt(r("hour"),10)%24,c=r("minute"),p=r("second"),u=String(l).padStart(2,"0"),h=Date.UTC(parseInt(a),parseInt(n)-1,parseInt(o),l,parseInt(c),parseInt(p)),g=Math.round((h-e)/6e4),v=g>=0?"+":"-",f=Math.abs(g),b=String(Math.floor(f/60)).padStart(2,"0"),$=String(f%60).padStart(2,"0");return`${a}-${n}-${o}T${u}:${c}:${p}${v}${b}:${$}`}function At(e){return e/ui*jr}function Ei(e){return String(parseFloat(e.toFixed(3)))}function fo(e){const t=Math.max(Ml,Math.min(bo,e));return(bo-t)/(bo-Ml)*Ni}function pv(e,t){const i=dv(e,t);return e-i*6e4}function uv(e){if(e.length<=1)return e;const t=[];let i={...e[0]};for(let r=1;r<e.length;r++){const a=e[r],n=i.recommendedSource===a.recommendedSource,o=(i.heatingKwh!=null?i.heatingKwh>0:!1)==(a.heatingKwh!=null?a.heatingKwh>0:!1),l=i.end===a.start;n&&o&&l?i={...i,end:a.end}:(t.push(i),i={...a})}return t.push(i),t}function Al(e,t,i){let r=null,a=-1/0;for(const n of t){const o=Date.parse(n.start);if(!isFinite(o))continue;const l=n.end!==null?Date.parse(n.end):i;isFinite(l)&&o<=e&&e<=l&&o>a&&(a=o,r=n)}return r}function Ll(e,t){const i=Date.parse(e.start),r=e.end!==null?Date.parse(e.end):t;if(!isFinite(i)||!isFinite(r))return null;const a=(r-i)/36e5;return a<=0||!isFinite(a)||!isFinite(e.energyKwh)||e.energyKwh<0?null:e.energyKwh/a}function hv(e,t,i,r,a){const n=[y("boiler.aria.plan_timeline",a)];n.push(`NOW: ${e}`),t&&n.push(`${y("boiler.config.deadline",a)}: ${t}`),i!=null&&n.push(`${y("boiler.config.goal_temp",a)}: ${i}°C`);const o=[...new Set(r.filter(Boolean))];return o.length>0&&n.push(o.map(l=>Ui(l,a)).join(", ")),n.join(". ")}let Rt=class extends O{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs",this.nowMs=null,this.timeZone=null}render(){try{return this._renderTimeline()}catch{return s`
        <div class="timeline-section">
          <div class="empty-timeline" data-testid="boiler-timeline">${y("boiler.timeline.empty",this.lang)}</div>
        </div>
      `}}_resolveTimeZone(){if(this.timeZone)return this.timeZone;try{return Intl.DateTimeFormat().resolvedOptions().timeZone}catch{return"Europe/Prague"}}_renderTimeline(){var de;const e=lv(this.nowMs??void 0),t=this._resolveTimeZone();let i;try{i=pv(e,t)}catch{i=e-e%864e5}const r=(e-i)/6e4,a=At(r);let n="";try{n=cv(e,t)}catch{n=new Date(e).toISOString()}const o=this.config,l=o!=null&&o.deadlineTime&&o.deadlineTime!=="--:--"?o.deadlineTime:null;let c=null;if(l)try{const[F,ae]=l.split(":"),M=parseInt(F,10)*60+parseInt(ae,10);c=At(M)}catch{c=null}const p=(o==null?void 0:o.targetTempC)!=null&&isFinite(o.targetTempC)?o.targetTempC:60,u=fo(p),h=this.data,g=Array.isArray(h==null?void 0:h.planSlots)?h.planSlots:[],v=Array.isArray(h==null?void 0:h.timeline)?h.timeline:[],f=Array.isArray(h==null?void 0:h.sourceSegments)?h.sourceSegments:[],b=g.length>0&&g.every(F=>(F.heatingKwh??0)===0&&(F.pvKwh??0)===0&&(F.gridKwh??0)===0&&(F.altKwh??0)===0),$=this._buildPlanBands(g,i),_=this._buildTempPointsFromSlots(g,i),w=this._buildTempPointsFromTimeline(v,i),C=_.length>0?_:w,D=this._buildPowerBarsFromSlots(g,i),T=this._buildPowerBars(v,f,i,e),I=$.map(F=>F.source);let k="";try{k=hv(n,l,p,I,this.lang)}catch{k=y("boiler.aria.plan_timeline",this.lang)}const P=C.length>=2?C.map(F=>`${F.x.toFixed(2)},${F.y.toFixed(2)}`).join(" "):null,V=g.reduce((F,ae)=>F+(ae.gridKwh??0),0),Y=g.reduce((F,ae)=>F+(ae.pvKwh??0)+(ae.altKwh??0),0),U=g.reduce((F,ae)=>F+(ae.estimatedCostCzk??0),0),Z=V+Y,Q=((de=h==null?void 0:h.status)==null?void 0:de.degradedFlags)??[],Se=Q.includes("price_degraded"),re=Q.includes("forecast_degraded"),q=["00","03","06","09","12","15","18","21","24"];return s`
      <div class="timeline-section">
        <div class="timeline-header">
          <h3>📅 24h plán: teplota, výkon &amp; zdroje</h3>
          ${g.length>0?s`
            <div class="timeline-summary">
              Dnes: <strong>${V.toFixed(1)} kWh</strong> ze sítě
              · <strong style="color:#f5b800">${Y.toFixed(1)} kWh</strong> z FVE/přetoku
              ${U>0?s` · <strong>~${U.toFixed(2)} Kč</strong>`:""}
              ${Z>0?s` · spotřeba <strong>~${Z.toFixed(1)} kWh</strong>`:""}
            </div>
          `:""}
        </div>

        ${b?s`
          <div class="empty-timeline" data-testid="boiler-timeline">Plán nedostupný (degraded)</div>
        `:s`
          <div class="chart-wrap">
            <div class="y-axis-label left">
              <span>80°</span><span>60°</span><span>40°</span><span>20°</span>
            </div>
            <div class="y-axis-label right">
              <span>3kW</span><span>1.5kW</span><span>0</span>
            </div>
            <svg
              class="chart-svg"
              viewBox="0 0 ${jr} ${Ni}"
              role="img"
              aria-label="${k}"
              data-testid="boiler-timeline"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              ${N`<rect x="0" y="0" width="${jr}" height="${Ni}" fill="transparent" />`}

              ${$.map(F=>{const ae=F.source?Kp[F.source]??"#9E9E9E":"#9E9E9E",M=F.x2-F.x1;return N`<rect
                  class="plan-band"
                  data-source="${F.source??"unknown"}"
                  x="${F.x1.toFixed(2)}"
                  y="0"
                  width="${M.toFixed(2)}"
                  height="${Ni}"
                  fill="${ae}"
                />`})}

              ${N`<line x1="0" y1="${Mt}" x2="${jr}" y2="${Mt}" stroke="rgba(255,255,255,.08)" stroke-width="1"/>`}

              ${N`<line
                class="goal-line"
                x1="0" y1="${u.toFixed(2)}"
                x2="${jr}" y2="${u.toFixed(2)}"
              />`}
              ${N`<text x="4" y="${(u-3).toFixed(2)}" font-size="8" fill="#4ade80">CÍL ${p}°C</text>`}

              ${c!=null&&l!=null?N`
                <line class="deadline-marker"
                  data-testid="boiler-deadline-marker"
                  data-deadline-time="${l}"
                  data-deadline-x="${Ei(c)}"
                  x1="${Ei(c)}" y1="0"
                  x2="${Ei(c)}" y2="${Ni}"
                />
                <text x="${(c+3).toFixed(2)}" y="12" font-size="8" fill="#E65100">${l}</text>
              `:""}

              ${D.map(F=>{if(F.isCharge){const ae=Mt-F.barH;return N`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    x="${(F.x-2).toFixed(2)}" y="${ae.toFixed(2)}" width="4" height="${F.barH.toFixed(2)}"/>`}else return N`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    x="${(F.x-2).toFixed(2)}" y="${Mt}" width="4" height="${F.barH.toFixed(2)}"/>`})}

              ${T.map(F=>{if(F.isCharge){const ae=Mt-F.barH;return N`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    data-estimated-power="${F.isEstimated?"true":"false"}"
                    x="${(F.x-2).toFixed(2)}" y="${ae.toFixed(2)}" width="4" height="${F.barH.toFixed(2)}"/>`}else return N`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    data-estimated-power="${F.isEstimated?"true":"false"}"
                    x="${(F.x-2).toFixed(2)}" y="${Mt}" width="4" height="${F.barH.toFixed(2)}"/>`})}

              ${v.map(F=>{let ae;try{ae=Date.parse(F.timestamp)}catch{return""}if(!isFinite(ae))return"";const M=(ae-i)/6e4;if(M<0||M>ui||F.powerKw!==null)return"";const H=Al(ae,f,e),oe=H?Ll(H,e):null;if(oe!==null&&oe>0)return"";const be=At(M);return N`<rect
                  class="placeholder-bar"
                  data-testid="boiler-power-placeholder"
                  data-estimated-power="true"
                  x="${(be-2).toFixed(2)}" y="99" width="4" height="2"
                />`})}

              ${P!=null?N`<polyline class="temp-line" points="${P}" />`:""}

              ${N`<line
                class="now-marker"
                data-testid="boiler-now-marker"
                data-now-time="${n}"
                data-now-x="${Ei(a)}"
                x1="${Ei(a)}" y1="0"
                x2="${Ei(a)}" y2="${Ni}"
              />`}
              ${N`<text x="${(a+3).toFixed(2)}" y="12" font-size="8" fill="#60a5fa">TEĎ</text>`}
            </svg>
          </div>

          <div class="timeline-axis">
            ${q.map(F=>s`<span>${F}</span>`)}
          </div>

          <div class="timeline-legend">
            <div class="legend-item"><span class="legend-dot" style="background:#f5b800"></span>FVE</div>
            <div class="legend-item"><span class="legend-dot" style="background:#4ade80"></span>Přetok</div>
            <div class="legend-item"><span class="legend-dot" style="background:#7c8694"></span>Síť</div>
            <div class="legend-item"><span class="legend-dot" style="background:#4ade80;opacity:.75"></span>Nabíjení kW</div>
            <div class="legend-item"><span class="legend-dot" style="background:#60a5fa;opacity:.75"></span>Odběr kW</div>
            <div class="legend-item"><span class="legend-dot" style="background:#ff7a45"></span>°C predikce</div>
          </div>
        `}

        <div class="footer-meta">
          <div>
            ${Se?s`<span class="degraded-chip">⚠ Ceny: stará data</span>`:""}
            ${re?s`<span class="degraded-chip">⚠ FVE predikce: stará data</span>`:""}
          </div>
        </div>
      </div>
    `}_buildTempPointsFromTimeline(e,t){const i=[],r=t+ui*6e4;for(const a of e)try{if(a.topTempC==null||!isFinite(a.topTempC))continue;const n=Date.parse(a.timestamp);if(!isFinite(n)||n<t||n>r)continue;const o=(n-t)/6e4;i.push({x:At(o),y:fo(a.topTempC)})}catch{continue}return i}_buildTempPointsFromSlots(e,t){const i=[],r=t+ui*6e4;for(const a of e)try{const n=a.expectedTempTopC;if(n==null||!isFinite(n))continue;const o=Date.parse(a.start);if(!isFinite(o)||o<t||o>r)continue;const l=(o-t)/6e4;i.push({x:At(l),y:fo(n)})}catch{continue}return i}_buildPowerBarsFromSlots(e,t){const i=[],r=t+ui*6e4;for(let a=0;a<e.length;a++){const n=e[a];try{const o=Date.parse(n.start);if(!isFinite(o)||o<t||o>r)continue;const l=(o-t)/6e4,c=At(l),p=(n.pvKwh??0)+(n.gridKwh??0)+(n.altKwh??0);if(p<=0)continue;const u=p*4,g=Math.min(u,di)/di*Mt;i.push({x:c,barH:g,isCharge:!0,isEstimated:!1})}catch{continue}}return i}_buildPlanBands(e,t){if(!e.length)return[];const i=[],r=t+ui*6e4,a=[];for(const o of e)try{const l=Date.parse(o.start),c=Date.parse(o.end);if(!isFinite(l)||!isFinite(c)||c<=t||l>=r)continue;const p=Math.max(l,t),u=Math.min(c,r);if(u<=p)continue;a.push({...o,start:new Date(p).toISOString(),end:new Date(u).toISOString()})}catch{continue}const n=uv(a);for(const o of n)try{const l=Date.parse(o.start),c=Date.parse(o.end);if(!isFinite(l)||!isFinite(c))continue;const p=At((l-t)/6e4),u=At((c-t)/6e4);if(u<=p)continue;i.push({x1:p,x2:u,source:o.recommendedSource,heating:(o.heatingKwh??0)>0})}catch{continue}return i}_buildPowerBars(e,t,i,r){const a=[],n=i+ui*6e4;for(const o of e)try{const l=Date.parse(o.timestamp);if(!isFinite(l)||l<i||l>n)continue;const c=(l-i)/6e4,p=At(c);if(o.powerKw!==null&&isFinite(o.powerKw)){const u=Math.max(-di,Math.min(di,o.powerKw));if(Math.abs(u)<.001)continue;const h=Math.abs(u)/di*Mt;a.push({x:p,barH:h,isCharge:u>0,isEstimated:!1})}else{const u=Al(l,t,r);if(u!==null){const h=Ll(u,r);if(h!==null&&h>0){const g=u.key==="discharge",f=Math.min(h,di)/di*Mt;a.push({x:p,barH:f,isCharge:!g,isEstimated:!0})}}}}catch{continue}return a}};Rt.styles=z`
    :host {
      display: block;
      font-family: ${go(d.fontFamily)};
    }

    .timeline-section {
      width: 100%;
    }

    .timeline-header {
      margin-bottom: 10px;
    }

    .timeline-header h3 {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 600;
      color: ${go(d.textPrimary)};
    }

    .timeline-summary {
      font-size: 11px;
      color: #9aa6b2;
    }

    .timeline-summary strong {
      color: #e6edf3;
    }

    .chart-wrap {
      position: relative;
      width: 100%;
    }

    .y-axis-label {
      position: absolute;
      top: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      font-size: 9px;
      color: #9aa6b2;
      pointer-events: none;
    }

    .y-axis-label.left { left: 0; text-align: right; padding-right: 4px; }
    .y-axis-label.right { right: 0; text-align: left; padding-left: 4px; }

    svg.chart-svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .plan-band {
      opacity: 0.18;
    }

    .temp-line {
      fill: none;
      stroke: #ff7a45;
      stroke-width: 1.5;
      stroke-linejoin: round;
      stroke-linecap: round;
    }

    .goal-line {
      stroke: #4ade80;
      stroke-width: 1;
      stroke-dasharray: 6 3;
      opacity: 0.8;
    }

    .now-marker {
      stroke: #60a5fa;
      stroke-width: 2;
    }

    .deadline-marker {
      stroke: #E65100;
      stroke-width: 1.5;
      stroke-dasharray: 4 2;
    }

    .charge-bar {
      fill: #4ade80;
      opacity: 0.75;
    }

    .draw-bar {
      fill: #60a5fa;
      opacity: 0.75;
    }

    .placeholder-bar {
      fill: #9E9E9E;
      opacity: 0.4;
    }

    .timeline-axis {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #9aa6b2;
      margin-top: 4px;
    }

    .timeline-legend {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 8px;
      font-size: 10px;
      color: #9aa6b2;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }

    .footer-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      font-size: 11px;
      color: #9aa6b2;
    }

    .degraded-chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(245,184,0,.12);
      color: #f5b800;
      font-size: 10px;
      margin-right: 6px;
    }

    .empty-timeline {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 60px;
      font-size: 13px;
      color: ${go(d.textSecondary)};
      font-style: italic;
    }

    @media (max-width: 599px) {
      :host { font-size: 12px; }
    }
  `;mr([m({type:Object})],Rt.prototype,"data",2);mr([m({type:Object})],Rt.prototype,"config",2);mr([m({type:String})],Rt.prototype,"lang",2);mr([m({type:Number})],Rt.prototype,"nowMs",2);mr([m({type:String})],Rt.prototype,"timeZone",2);Rt=mr([E("oig-boiler-timeline-chart")],Rt);var gv=Object.defineProperty,bv=Object.getOwnPropertyDescriptor,Oe=(e,t,i,r)=>{for(var a=r>1?void 0:r?bv(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&gv(t,i,a),a};const ci=X,En=z`
  .selector-label {
    font-size: 12px;
    color: ${ci(d.textSecondary)};
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
    border: 2px solid ${ci(d.divider)};
    background: ${ci(d.bgSecondary)};
    color: ${ci(d.textPrimary)};
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .mode-btn:hover:not(:disabled):not(.active) {
    border-color: ${ci(d.accent)};
  }

  .mode-btn.active {
    background: ${ci(d.accent)};
    border-color: ${ci(d.accent)};
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
`;let nr=class extends O{constructor(){super(...arguments),this.value="home_1",this.disabled=!1,this.buttonStates={home_1:"idle",home_2:"idle",home_3:"idle",home_ups:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("mode-change",{detail:{mode:e},bubbles:!0}))}render(){return s`
      <div class="selector-label">
        Re\u017Eim st\u0159\u00EDda\u010De
      </div>
      <div class="mode-buttons">
        ${["home_1","home_2","home_3","home_ups"].map(t=>{const i=this.buttonStates[t],r=this.disabled||i==="pending"||i==="processing"||i==="disabled-by-service";return s`
            <button
              class="mode-btn ${i}"
              ?disabled=${r}
              @click=${()=>this.onModeClick(t)}
            >
              ${ld[t]}
              ${i==="pending"?s`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?s`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};nr.styles=[En];Oe([m({type:String})],nr.prototype,"value",2);Oe([m({type:Boolean})],nr.prototype,"disabled",2);Oe([m({type:Object})],nr.prototype,"buttonStates",2);nr=Oe([E("oig-box-mode-selector")],nr);let Wt=class extends O{constructor(){super(...arguments),this.value="off",this.limit=0,this.disabled=!1,this.pendingTarget=null,this.buttonStates={off:"idle",on:"idle",limited:"idle"}}onDeliveryClick(e){const t=this.buttonStates[e];this.disabled||t==="pending"||t==="processing"||t==="disabled-by-service"||t==="active"&&e!=="limited"||this.dispatchEvent(new CustomEvent("delivery-change",{detail:{value:e,limit:e==="limited"?this.limit:null},bubbles:!0}))}render(){const e=[{value:"off",label:Br.off},{value:"on",label:Br.on},{value:"limited",label:Br.limited}],i=this.pendingTarget!==null&&this.pendingTarget!==this.value?s`<span class="status-text transitioning">\u23F3\u00A0${Br[this.pendingTarget]}</span>`:null;return s`
      <div class="selector-label">
        Dod\u00E1vka do s\u00EDt\u011B ${i}
      </div>
      <div class="mode-buttons">
        ${e.map(r=>{const a=this.buttonStates[r.value],n=r.value===this.value,o=r.value===this.pendingTarget&&!n,l=this.disabled||a==="pending"||a==="processing"||a==="disabled-by-service",c=n&&a==="disabled-by-service"?"active disabled-by-service":o?`${a} pending-target`:a;return s`
            <button
              class="mode-btn ${c}"
              ?disabled=${l}
              @click=${()=>this.onDeliveryClick(r.value)}
            >
              ${r.label}
              ${a==="pending"?s`<span style="font-size:10px"> \u23F3</span>`:""}
              ${a==="processing"?s`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};Wt.styles=[En,z`
      .mode-btn.pending-target {
        border-color: #ffc107;
        color: #ffc107;
        background: rgba(255, 193, 7, 0.08);
      }
    `];Oe([m({type:String})],Wt.prototype,"value",2);Oe([m({type:Number})],Wt.prototype,"limit",2);Oe([m({type:Boolean})],Wt.prototype,"disabled",2);Oe([m({type:String})],Wt.prototype,"pendingTarget",2);Oe([m({type:Object})],Wt.prototype,"buttonStates",2);Wt=Oe([E("oig-grid-delivery-selector")],Wt);let or=class extends O{constructor(){super(...arguments),this.value="cbb",this.disabled=!1,this.buttonStates={cbb:"idle",manual:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("boiler-mode-change",{detail:{mode:e},bubbles:!0}))}render(){return s`
      <div class="selector-label">
        Re\u017Eim bojleru
      </div>
      <div class="mode-buttons">
        ${["cbb","manual"].map(t=>{const i=this.buttonStates[t],r=this.disabled||i==="pending"||i==="processing"||i==="disabled-by-service";return s`
            <button
              class="mode-btn ${i}"
              ?disabled=${r}
              @click=${()=>this.onModeClick(t)}
            >
              ${cd[t]} ${dd[t]}
              ${i==="pending"?s`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?s`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};or.styles=[En];Oe([m({type:String})],or.prototype,"value",2);Oe([m({type:Boolean})],or.prototype,"disabled",2);Oe([m({type:Object})],or.prototype,"buttonStates",2);or=Oe([E("oig-boiler-mode-selector")],or);let Kt=class extends O{constructor(){super(...arguments),this.homeGridV=!1,this.homeGridVi=!1,this.flexibilita=!1,this.available=!1,this.disabled=!1}getButtonClass(e){return e&&this.disabled?"active disabled-by-service":e?"active":this.disabled?"disabled-by-service":"idle"}onToggleClick(e){this.disabled||this.dispatchEvent(new CustomEvent("supplementary-toggle",{detail:{key:e},bubbles:!0}))}render(){const e=this.getButtonClass(this.homeGridV),t=this.getButtonClass(this.homeGridVi),i=this.flexibilita?s`<span class="flexibilita-badge">\u26A1 Flexibilita</span>`:"";return s`
      <div class="selector-label">
        Dopl\u0148kov\u00FD re\u017Eim ${i}
      </div>
      <div class="mode-buttons">
        <button
          class="mode-btn ${e}"
          ?disabled=${this.disabled}
          @click=${()=>this.onToggleClick("home_grid_v")}
        >
          Home 5
          ${this.homeGridV&&!this.disabled?s`<span style="font-size:10px"> \u2713</span>`:""}
        </button>
        <button
          class="mode-btn ${t}"
          ?disabled=${this.disabled}
          @click=${()=>this.onToggleClick("home_grid_vi")}
        >
          Home 6
          ${this.homeGridVi&&!this.disabled?s`<span style="font-size:10px"> \u2713</span>`:""}
        </button>
      </div>
    `}};Kt.styles=[En,z`
      .flexibilita-badge {
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 8px;
        background: rgba(255, 152, 0, 0.15);
        color: #ff9800;
        font-weight: 600;
        margin-left: 4px;
        white-space: nowrap;
      }
    `];Oe([m({type:Boolean})],Kt.prototype,"homeGridV",2);Oe([m({type:Boolean})],Kt.prototype,"homeGridVi",2);Oe([m({type:Boolean})],Kt.prototype,"flexibilita",2);Oe([m({type:Boolean})],Kt.prototype,"available",2);Oe([m({type:Boolean})],Kt.prototype,"disabled",2);Kt=Oe([E("oig-supplementary-selector")],Kt);function fv(e){const t=!e.available||e.flexibilita;return e.available?{home_grid_v:e.home_grid_v,home_grid_vi:e.home_grid_vi,flexibilita:e.flexibilita,available:e.available,disabled:t}:{home_grid_v:!1,home_grid_vi:!1,flexibilita:e.flexibilita,available:!1,disabled:!0}}var mv=Object.defineProperty,vv=Object.getOwnPropertyDescriptor,vr=(e,t,i,r)=>{for(var a=r>1?void 0:r?vv(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&mv(t,i,a),a};const Xe=X;let Zt=class extends O{constructor(){super(...arguments),this.items=[],this.expanded=!1,this.shieldStatus="idle",this.queueCount=0,this._now=Date.now(),this.updateInterval=null}connectedCallback(){super.connectedCallback(),this.updateInterval=window.setInterval(()=>{this._now=Date.now()},1e3)}disconnectedCallback(){super.disconnectedCallback(),this.updateInterval!==null&&clearInterval(this.updateInterval)}toggleExpanded(){this.expanded=!this.expanded}removeItem(e,t){t.stopPropagation(),this.dispatchEvent(new CustomEvent("remove-item",{detail:{position:e},bubbles:!0}))}formatServiceName(e,t){return t==="supplementary_toggle"?"⚙️ Změna doplňkového režimu":gp[e]||e||"N/A"}stripCurrentSuffix(e){const i=e.indexOf("(nyní:");return i===-1?e.trim():e.slice(0,i).trim()}formatChanges(e){return!e||e.length===0?"N/A":e.map(t=>{const i=t.indexOf("→");if(i===-1)return t;const r=t.slice(0,i).trim(),a=t.slice(i+1).trim(),n=r.indexOf(":"),o=n===-1?r:r.slice(n+1),l=r.includes("prm2_app")?pd:bp,c=o.replaceAll("'","").trim(),p=this.stripCurrentSuffix(a).replaceAll("'","").trim(),u=l[c]||c,h=l[p]||p;return`${u} → ${h}`}).join(", ")}formatTimestamp(e){if(!e)return{time:"--",duration:"--"};try{const t=new Date(e);if(isNaN(t.getTime()))return{time:"--",duration:"--"};const i=new Date(this._now),r=Math.floor((i.getTime()-t.getTime())/1e3),a=String(t.getHours()).padStart(2,"0"),n=String(t.getMinutes()).padStart(2,"0");let o=`${a}:${n}`;if(t.toDateString()!==i.toDateString()){const c=t.getDate(),p=t.getMonth()+1;o=`${c}.${p}. ${o}`}let l;if(r<60)l=`${r}s`;else if(r<3600){const c=Math.floor(r/60),p=r%60;l=`${c}m ${p}s`}else{const c=Math.floor(r/3600),p=Math.floor(r%3600/60);l=`${c}h ${p}m`}return{time:o,duration:l}}catch{return{time:"--",duration:"--"}}}get activeCount(){return this.items.length}render(){this._now;const e=this.shieldStatus==="running"?"running":"idle",t=this.shieldStatus==="running"?"🔄 Zpracovává":"✓ Připraveno";return s`
      <div class="queue-header" @click=${this.toggleExpanded}>
        <div class="queue-title-area">
          <span class="queue-title">Shield fronta</span>
          ${this.activeCount>0?s`
            <span class="queue-count">(${this.activeCount} aktivn\u00EDch)</span>
          `:x}
          <span class="shield-status ${e}">${t}</span>
        </div>
        <span class="queue-toggle ${this.expanded?"expanded":""}">\u25BC</span>
      </div>

      ${this.expanded?s`
        <div class="queue-content">
          ${this.items.length===0?s`
            <div class="empty-state">\u2705 Fronta je pr\u00E1zdn\u00E1</div>
          `:s`
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
      `:x}
    `}renderRow(e,t){const i=e.status==="running",{time:r,duration:a}=this.formatTimestamp(e.createdAt);return s`
      <tr>
        <td class="${i?"status-running":"status-queued"}">
          ${i?"🔄 Zpracovává se":"⏳ Čeká"}
        </td>
        <td>${this.formatServiceName(e.service,e.type)}</td>
        <td class="hide-mobile" style="font-size: 11px;">${this.formatChanges(e.changes)}</td>
        <td class="queue-time">${r}</td>
        <td class="queue-time duration">${a}</td>
        <td style="text-align: center;">
          ${i?s`<span style="opacity: 0.4;">\u2014</span>`:s`
            <button
              class="remove-btn"
              title="Odstranit z fronty"
              @click=${n=>this.removeItem(e.position,n)}
            >\uD83D\uDDD1\uFE0F</button>
          `}
        </td>
      </tr>
    `}};Zt.styles=z`
    :host {
      display: block;
      background: ${Xe(d.cardBg)};
      border-radius: 12px;
      box-shadow: ${Xe(d.cardShadow)};
      overflow: hidden;
    }

    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: ${Xe(d.bgSecondary)};
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
      color: ${Xe(d.textPrimary)};
    }

    .queue-count {
      font-size: 12px;
      color: ${Xe(d.textSecondary)};
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
      color: ${Xe(d.accent)};
      transition: transform 0.2s;
    }

    .queue-toggle.expanded {
      transform: rotate(180deg);
    }

    .queue-content {
      padding: 0;
      border-top: 1px solid ${Xe(d.divider)};
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
      color: ${Xe(d.textSecondary)};
      border-bottom: 1px solid ${Xe(d.divider)};
      background: ${Xe(d.bgSecondary)};
    }

    .queue-table td {
      padding: 8px 12px;
      color: ${Xe(d.textPrimary)};
      border-bottom: 1px solid ${Xe(d.divider)};
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
      color: ${Xe(d.textSecondary)};
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
  `;vr([m({type:Array})],Zt.prototype,"items",2);vr([m({type:Boolean})],Zt.prototype,"expanded",2);vr([m({type:String})],Zt.prototype,"shieldStatus",2);vr([m({type:Number})],Zt.prototype,"queueCount",2);vr([S()],Zt.prototype,"_now",2);Zt=vr([E("oig-shield-queue")],Zt);var yv=Object.defineProperty,xv=Object.getOwnPropertyDescriptor,ma=(e,t,i,r)=>{for(var a=r>1?void 0:r?xv(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&yv(t,i,a),a};const Re=X;let _i=class extends O{constructor(){super(...arguments),this.open=!1,this.config={title:"",message:""},this.acknowledged=!1,this.limitValue=5e3,this.resolver=null,this.onOverlayClick=()=>{this.closeDialog({confirmed:!1})},this.onDialogClick=e=>{e.stopPropagation()},this.onKeyDown=e=>{e.key==="Escape"&&this.open&&this.closeDialog({confirmed:!1})},this.onAckChange=e=>{this.acknowledged=e.target.checked},this.onLimitInput=e=>{this.limitValue=parseInt(e.target.value,10)||0},this.onCancel=()=>{this.closeDialog({confirmed:!1})},this.onConfirm=()=>{const e=this.config.showLimitInput||this.config.limitOnly;if(e){const t=this.config.limitMin??1,i=this.config.limitMax??2e4;if(isNaN(this.limitValue)||this.limitValue<t||this.limitValue>i)return}this.closeDialog({confirmed:!0,limit:e?this.limitValue:void 0})}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeyDown)}showDialog(e){return this.config=e,this.acknowledged=!1,this.limitValue=e.limitValue??5e3,this.open=!0,new Promise(t=>{this.resolver=t})}closeDialog(e){var t;this.open=!1,(t=this.resolver)==null||t.call(this,e),this.resolver=null}get canConfirm(){return!(this.config.requireAcknowledgement&&!this.acknowledged)}render(){if(!this.open)return x;const e=this.config;return e.limitOnly?s`
        <div @click=${this.onOverlayClick}>
          <div class="dialog" @click=${this.onDialogClick}>
            <div class="dialog-header">
              ${e.title||"Změnit limit přetoků"}
            </div>

            <div class="limit-section" style="margin-top: 16px;">
              <label class="limit-label" for="confirm-limit-input">
                Zadejte limit přetoků (W):
              </label>
              <input
                type="number"
                id="confirm-limit-input"
                class="limit-input"
                .value=${String(this.limitValue)}
                min=${e.limitMin??1}
                max=${e.limitMax??2e4}
                step=${e.limitStep??100}
                @input=${this.onLimitInput}
                placeholder="např. 5000"
              />
              <small class="limit-hint">Rozsah: ${e.limitMin??1}–${e.limitMax??2e4} W</small>
            </div>

            <div class="dialog-actions">
              <button class="btn btn-cancel" @click=${this.onCancel}>
                ${e.cancelText||"Zrušit"}
              </button>
              <button
                class="btn btn-confirm"
                ?disabled=${!this.canConfirm}
                @click=${this.onConfirm}
              >
                ${e.confirmText||"Uložit limit"}
              </button>
            </div>
          </div>
        </div>
      `:s`
      <div @click=${this.onOverlayClick}>
        <div class="dialog" @click=${this.onDialogClick}>
          <div class="dialog-header">
            ${e.title}
          </div>

          <div class="dialog-body">
            ${this.renderHTML(e.message)}
          </div>

          ${e.showLimitInput?s`
            <div class="limit-section">
              <label class="limit-label" for="confirm-limit-input">
                Zadejte limit p\u0159etok\u016F (W):
              </label>
              <input
                type="number"
                id="confirm-limit-input"
                class="limit-input"
                .value=${String(this.limitValue)}
                min=${e.limitMin??1}
                max=${e.limitMax??2e4}
                step=${e.limitStep??100}
                @input=${this.onLimitInput}
                placeholder="nap\u0159. 5000"
              />
              <small class="limit-hint">Rozsah: ${e.limitMin??1}\u2013${e.limitMax??2e4} W</small>
            </div>
          `:x}

          ${e.warning?s`
            <div class="dialog-warning">
              \u26A0\uFE0F ${this.renderHTML(e.warning)}
            </div>
          `:x}

          ${e.requireAcknowledgement?s`
            <div class="ack-wrapper" @click=${()=>{this.acknowledged=!this.acknowledged}}>
              <input
                type="checkbox"
                .checked=${this.acknowledged}
                @change=${this.onAckChange}
                @click=${t=>t.stopPropagation()}
              />
              <label>
                ${e.acknowledgementText?this.renderHTML(e.acknowledgementText):s`
                  <strong>Souhlas\u00EDm</strong> s t\u00EDm, \u017Ee m\u011Bn\u00EDm nastaven\u00ED na vlastn\u00ED odpov\u011Bdnost.
                  Aplikace nenese odpov\u011Bdnost za p\u0159\u00EDpadn\u00E9 negativn\u00ED d\u016Fsledky t\u00E9to zm\u011Bny.
                `}
              </label>
            </div>
          `:x}

          <div class="dialog-actions">
            <button class="btn btn-cancel" @click=${this.onCancel}>
              ${e.cancelText||"Zrušit"}
            </button>
            <button
              class="btn btn-confirm"
              ?disabled=${!this.canConfirm}
              @click=${this.onConfirm}
            >
              ${e.confirmText||"Potvrdit změnu"}
            </button>
          </div>
        </div>
      </div>
    `}renderHTML(e){return mt(e)}};_i.styles=z`
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
      background: rgba(0, 0, 0, 0.62);
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
      /* SOLID surface — cardBg is translucent in dark mode (6% white) which made
         the dialog almost see-through and the text illegible. */
      background: ${Re(d.cardBgSolid)};
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 16px;
      padding: 0;
      min-width: 340px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
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
      color: ${Re(d.textPrimary)};
      border-bottom: 1px solid ${Re(d.divider)};
    }

    .dialog-body {
      padding: 16px 20px;
      font-size: 14px;
      line-height: 1.5;
      color: ${Re(d.textPrimary)};
    }

    .dialog-warning {
      margin: 0 20px 12px;
      padding: 10px 14px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      font-size: 13px;
      color: ${Re(d.textPrimary)};
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
      background: ${Re(d.bgSecondary)};
      border-radius: 8px;
      cursor: pointer;
    }

    .ack-wrapper input[type="checkbox"] {
      margin-top: 2px;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${Re(d.accent)};
    }

    .ack-wrapper label {
      font-size: 13px;
      line-height: 1.4;
      color: ${Re(d.textPrimary)};
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
      color: ${Re(d.textPrimary)};
    }

    .limit-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid ${Re(d.divider)};
      border-radius: 8px;
      font-size: 14px;
      background: ${Re(d.bgPrimary)};
      color: ${Re(d.textPrimary)};
      box-sizing: border-box;
    }

    .limit-hint {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      opacity: 0.7;
      color: ${Re(d.textSecondary)};
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
      background: ${Re(d.bgSecondary)};
      color: ${Re(d.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${Re(d.divider)};
    }

    .btn-confirm {
      background: ${Re(d.accent)};
      color: #fff;
    }

    .btn-confirm:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-confirm:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;ma([m({type:Boolean,reflect:!0})],_i.prototype,"open",2);ma([m({type:Object})],_i.prototype,"config",2);ma([S()],_i.prototype,"acknowledged",2);ma([S()],_i.prototype,"limitValue",2);_i=ma([E("oig-confirm-dialog")],_i);var wv=Object.defineProperty,_v=Object.getOwnPropertyDescriptor,rc=(e,t,i,r)=>{for(var a=r>1?void 0:r?_v(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&wv(t,i,a),a};const Or=X;let xn=class extends O{constructor(){super(...arguments),this.shieldState=null}render(){if(!this.shieldState)return x;const e=this.determineStatus(this.shieldState),t=e.toLowerCase(),i=this.getStatusIcon(e),r=this.getStatusLabel(e),n=this.shieldState.queueCount>0?"has-items":"";return s`
      <div class="shield-status-container">
        <div class="shield-status-left">
          <span class="shield-status-icon">${i}</span>
          <div class="shield-status-info">
            <span class="shield-status-title">Shield ochrana</span>
            <span class="shield-status-subtitle">${this.getActivityText()}</span>
          </div>
        </div>
        <div class="shield-status-right">
          <span class="queue-count ${n}">
            Fronta: ${this.shieldState.queueCount}
          </span>
          <span class="shield-status-badge ${t}">${r}</span>
        </div>
      </div>
    `}determineStatus(e){return e.status==="running"?"processing":e.queueCount>0?"pending":"idle"}getStatusIcon(e){switch(e){case"idle":return"✓";case"pending":return"⏳";case"processing":return"🔄";default:return"✓"}}getStatusLabel(e){switch(e){case"idle":return"Připraveno";case"pending":return"Čeká";case"processing":return"Zpracovává";default:return"Neznámý"}}getActivityText(){return this.shieldState?this.shieldState.activity?this.shieldState.activity:this.shieldState.queueCount>0?`${this.shieldState.queueCount} operací ve frontě`:"Systém připraven":"Žádná aktivita"}};xn.styles=z`
    :host {
      display: block;
      padding: 16px 20px;
      border-top: 1px solid ${Or(d.divider)};
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
      color: ${Or(d.textPrimary)};
    }

    .shield-status-subtitle {
      font-size: 11px;
      color: ${Or(d.textSecondary)};
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
      background: ${Or(d.bgSecondary)};
      color: ${Or(d.textSecondary)};
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
  `;rc([m({type:Object})],xn.prototype,"shieldState",2);xn=rc([E("oig-shield-status")],xn);var $v=Object.defineProperty,kv=Object.getOwnPropertyDescriptor,va=(e,t,i,r)=>{for(var a=r>1?void 0:r?kv(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&$v(t,i,a),a};const Ii=X;let $i=class extends O{constructor(){super(...arguments),this.boxHasHome56=!1,this.embedded=!1,this.shieldState={...ud,pendingServices:new Map,changingServices:new Set},this._confirmDialogOverride=null,this.unsubscribe=null,this.onShieldUpdate=e=>{this.shieldState=e}}get confirmDialog(){return this._confirmDialogOverride??this._confirmDialogQuery}set confirmDialog(e){this._confirmDialogOverride=e}connectedCallback(){super.connectedCallback(),this.unsubscribe=ye.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.unsubscribe)==null||e.call(this),this.unsubscribe=null}get boxModeButtonStates(){return{home_1:ye.getBoxModeButtonState("home_1"),home_2:ye.getBoxModeButtonState("home_2"),home_3:ye.getBoxModeButtonState("home_3"),home_ups:ye.getBoxModeButtonState("home_ups")}}get gridDeliveryButtonStates(){return{off:ye.getGridDeliveryButtonState("off"),on:ye.getGridDeliveryButtonState("on"),limited:ye.getGridDeliveryButtonState("limited")}}get boilerModeButtonStates(){return{cbb:ye.getBoilerModeButtonState("cbb"),manual:ye.getBoilerModeButtonState("manual")}}get supplementaryView(){return fv(this.shieldState.supplementary)}async onBoxModeChange(e){const{mode:t}=e.detail,i=ld[t];if(L.debug("Control panel: box mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu střídače",message:`Chystáte se změnit režim boxu na <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování celého systému a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!ye.shouldProceedWithQueue())return;await ye.setBoxMode(t)||L.warn("Box mode change failed or already active",{mode:t})}async onGridDeliveryChange(e){const{value:t,limit:i}=e.detail,r=Br[t],a=hp[t],n=t==="limited",o=this.shieldState.gridDeliveryState.currentLiveLimit??5e3;L.debug("Control panel: grid delivery change requested",{delivery:t,limit:i});const l=this.shieldState.gridDeliveryState.currentLiveDelivery;if(!this.shieldState.gridDeliveryState.isTransitioning&&l==="limited"&&t==="limited"){const v={title:"🚰 Změnit limit přetoků",message:"",limitOnly:!0,showLimitInput:!0,limitValue:o,limitMin:1,limitMax:2e4,limitStep:100,confirmText:"Uložit limit",cancelText:"Zrušit"},f=await this.confirmDialog.showDialog(v);if(!f.confirmed||!ye.shouldProceedWithQueue())return;await ye.setGridDelivery("limited",f.limit);return}const p={title:`${a} Změna dodávky do sítě`,message:`Chystáte se změnit dodávku do sítě na: <strong>"${r}"</strong>`,warning:n?"Režim a limit budou změněny postupně (serializováno). Každá změna může trvat až 10 minut.":"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,acknowledgementText:"<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost. Aplikace nenese odpovědnost za případné negativní důsledky této změny.",confirmText:"Potvrdit změnu",cancelText:"Zrušit",showLimitInput:n,limitValue:o,limitMin:1,limitMax:2e4,limitStep:100},u=await this.confirmDialog.showDialog(p);if(!u.confirmed||!ye.shouldProceedWithQueue())return;const h=this.shieldState.gridDeliveryState.currentLiveDelivery==="limited",g=t==="limited";h&&g&&u.limit!=null?await ye.setGridDelivery(t,u.limit):g&&u.limit!=null?await ye.setGridDelivery(t,u.limit):await ye.setGridDelivery(t)}async onBoilerModeChange(e){const{mode:t}=e.detail,i=dd[t],r=cd[t];if(L.debug("Control panel: boiler mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu bojleru",message:`Chystáte se změnit režim bojleru na <strong>"${r} ${i}"</strong>.<br><br>Tato změna ovlivní chování ohřevu vody a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!ye.shouldProceedWithQueue())return;await ye.setBoilerMode(t)||L.warn("Boiler mode change failed or already active",{mode:t})}async onSupplementaryToggle(e){const{key:t}=e.detail,i=t==="home_grid_v"?"Home 5":"Home 6",r=!this.shieldState.supplementary[t];if(L.debug("Control panel: supplementary toggle requested",{key:t}),!(await this.confirmDialog.showDialog({title:"Změna doplňkového režimu",message:`Chystáte se přepnout <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování systému a může trvat až 10 minut.`,warning:"Změna může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!ye.shouldProceedWithQueue())return;await ye.setSupplementaryToggle(t,r)||L.warn("Supplementary toggle failed",{key:t})}async onQueueRemoveItem(e){const{position:t}=e.detail;L.debug("Control panel: queue remove requested",{position:t});const i=this.shieldState.allRequests.find(o=>o.position===t);let r="Operace";if(i&&(i.service.includes("set_box_mode")?r=`Změna režimu na ${i.targetValue||"neznámý"}`:i.service.includes("set_grid_delivery")?r=`Změna dodávky do sítě na ${i.targetValue||"neznámý"}`:i.service.includes("set_boiler_mode")&&(r=`Změna režimu bojleru na ${i.targetValue||"neznámý"}`)),!(await this.confirmDialog.showDialog({title:r,message:"Operace bude odstraněna z fronty bez provedení.",requireAcknowledgement:!1,confirmText:"OK",cancelText:"Zrušit"})).confirmed)return;await ye.removeFromQueue(t)||L.warn("Failed to remove from queue",{position:t})}render(){const e=this.shieldState,t=e.status==="running"?"running":"idle",i=e.status==="running"?"Zpracovává":"Připraveno",r=e.allRequests.length>0;return s`
      <div class="control-panel">
        <div class="panel-header">
          <span class="panel-title">
            \u{1F6E1}\uFE0F Ovl\u00E1dac\u00ED panel
          </span>
          <span class="panel-status ${t}">
            ${e.status==="running"?"🔄 ":"✓ "}${i}
          </span>
        </div>

        <div class="panel-body">
          <!-- Box Mode Selector -->
          <div class="selector-section">
            <oig-box-mode-selector
              .value=${e.currentBoxMode}
              .buttonStates=${this.boxModeButtonStates}
              @mode-change=${this.onBoxModeChange}
            ></oig-box-mode-selector>
          </div>

          <div class="section-divider"></div>

          <!-- Supplementary Toggles (Home 5 / Home 6) — hidden when box_has_home56=false -->
          ${this.boxHasHome56?s`
          <div class="selector-section">
            <oig-supplementary-selector
              .homeGridV=${this.supplementaryView.home_grid_v}
              .homeGridVi=${this.supplementaryView.home_grid_vi}
              .flexibilita=${this.supplementaryView.flexibilita}
              .available=${this.supplementaryView.available}
              .disabled=${this.supplementaryView.disabled}
              @supplementary-toggle=${this.onSupplementaryToggle}
            ></oig-supplementary-selector>
          </div>
          <div class="section-divider"></div>
          `:x}

          <!-- Grid Delivery Selector -->
          <div class="selector-section">
            <oig-grid-delivery-selector
              .value=${e.gridDeliveryState.currentLiveDelivery}
              .limit=${e.gridDeliveryState.currentLiveLimit??0}
              .pendingTarget=${e.gridDeliveryState.pendingDeliveryTarget}
              .buttonStates=${this.gridDeliveryButtonStates}
              @delivery-change=${this.onGridDeliveryChange}
            ></oig-grid-delivery-selector>
          </div>

          <div class="section-divider"></div>

          <!-- Boiler Mode Selector -->
          <div class="selector-section">
            <oig-boiler-mode-selector
              .value=${e.currentBoilerMode}
              .buttonStates=${this.boilerModeButtonStates}
              @boiler-mode-change=${this.onBoilerModeChange}
            ></oig-boiler-mode-selector>
          </div>
        </div>

        <!-- Shield Status (always shown) -->
        <oig-shield-status .shieldState=${e}></oig-shield-status>

        <!-- Shield Queue (always rendered, collapsible) -->
        ${r?s`
          <div class="queue-section">
            <oig-shield-queue
              .items=${e.allRequests}
              .shieldStatus=${e.status}
              .queueCount=${e.queueCount}
              .expanded=${!1}
              @remove-item=${this.onQueueRemoveItem}
            ></oig-shield-queue>
          </div>
        `:x}
      </div>

      <!-- Shared confirm dialog instance -->
      <oig-confirm-dialog></oig-confirm-dialog>
    `}};$i.styles=z`
    :host {
      display: block;
      margin-top: 16px;
    }

    .control-panel {
      background: ${Ii(d.cardBg)};
      border-radius: 16px;
      box-shadow: ${Ii(d.cardShadow)};
      overflow: hidden;
    }

    /* Embedded in the unified Ovládání card: no own chrome / header. */
    :host([embedded]) { margin-top: 0; }
    :host([embedded]) .control-panel {
      background: transparent;
      box-shadow: none;
      border-radius: 0;
      overflow: visible;
    }
    :host([embedded]) .panel-header { display: none; }
    :host([embedded]) .panel-body { padding: 0; }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid ${Ii(d.divider)};
    }

    .panel-title {
      font-size: 15px;
      font-weight: 600;
      color: ${Ii(d.textPrimary)};
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
      background: ${Ii(d.divider)};
      margin: 16px 0;
    }

    .queue-section {
      border-top: 1px solid ${Ii(d.divider)};
    }

    @media (max-width: 480px) {
      .panel-body {
        padding: 12px 14px;
      }
    }
  `;va([m({type:Boolean})],$i.prototype,"boxHasHome56",2);va([m({type:Boolean,reflect:!0})],$i.prototype,"embedded",2);va([S()],$i.prototype,"shieldState",2);va([An("oig-confirm-dialog")],$i.prototype,"_confirmDialogQuery",2);$i=va([E("oig-control-panel")],$i);var Cv=Object.defineProperty,Sv=Object.getOwnPropertyDescriptor,yr=(e,t,i,r)=>{for(var a=r>1?void 0:r?Sv(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&Cv(t,i,a),a};const Ue=X;let qt=class extends O{constructor(){super(...arguments),this.open=!1,this.currentSoc=0,this.maxSoc=100,this.estimate=null,this.targetSoc=80}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onSliderInput(e){this.targetSoc=parseInt(e.target.value,10),this.dispatchEvent(new CustomEvent("soc-change",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}onConfirm(){this.dispatchEvent(new CustomEvent("confirm",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}render(){return s`
      <div class="dialog" @click=${e=>e.stopPropagation()}>
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
          
          ${this.estimate?s`
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
    `}};qt.styles=z`
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
      background: rgba(0, 0, 0, 0.62);
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      /* SOLID surface (cardBg is translucent in dark mode → see-through dialog) */
      background: ${Ue(d.cardBgSolid)};
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 16px;
      padding: 24px;
      min-width: 320px;
      max-width: 90vw;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${Ue(d.textPrimary)};
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
      color: ${Ue(d.textSecondary)};
    }

    .soc-value {
      font-size: 24px;
      font-weight: 600;
      color: ${Ue(d.textPrimary)};
    }

    .soc-arrow {
      font-size: 20px;
      color: ${Ue(d.textSecondary)};
    }

    .slider-container {
      margin: 16px 0;
    }

    .slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: ${Ue(d.bgSecondary)};
      -webkit-appearance: none;
      appearance: none;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${Ue(d.accent)};
      cursor: pointer;
    }

    .estimate {
      background: ${Ue(d.bgSecondary)};
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
      color: ${Ue(d.textSecondary)};
    }

    .estimate-value {
      color: ${Ue(d.textPrimary)};
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
      background: ${Ue(d.bgSecondary)};
      color: ${Ue(d.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${Ue(d.divider)};
    }

    .btn-confirm {
      background: ${Ue(d.accent)};
      color: #fff;
    }

    .btn-confirm:hover {
      opacity: 0.9;
    }
  `;yr([m({type:Boolean})],qt.prototype,"open",2);yr([m({type:Number})],qt.prototype,"currentSoc",2);yr([m({type:Number})],qt.prototype,"maxSoc",2);yr([m({type:Object})],qt.prototype,"estimate",2);yr([S()],qt.prototype,"targetSoc",2);qt=yr([E("oig-battery-charge-dialog")],qt);var Mv=Object.defineProperty,Av=Object.getOwnPropertyDescriptor,ht=(e,t,i,r)=>{for(var a=r>1?void 0:r?Av(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&Mv(t,i,a),a};function qi(e){return e==null||Number.isNaN(e)?"-- kWh":`${e.toFixed(Math.abs(e)>=10?1:2)} kWh`}const mo=X,Xo=z`
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
`;let oa=class extends O{constructor(){super(...arguments),this.title="",this.icon="📊"}render(){return s`
      <div class="block-header">
        <span class="block-icon">${this.icon}</span>
        <span class="block-title">${this.title}</span>
      </div>
      <slot></slot>
    `}};oa.styles=z`
    :host {
      display: block;
      background: ${mo(d.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${mo(d.cardShadow)};
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
      color: ${mo(d.textPrimary)};
    }

    ${Xo}
  `;ht([m({type:String})],oa.prototype,"title",2);ht([m({type:String})],oa.prototype,"icon",2);oa=ht([E("oig-analytics-block")],oa);let wn=class extends O{constructor(){super(...arguments),this.data=null}render(){if(!this.data)return s`<div>Načítání...</div>`;const e=this.data.trend>=0?"positive":"negative",t=this.data.trend>=0?"+":"",i=this.data.period==="last_month"?"Minulý měsíc":`Aktuální měsíc (${this.data.currentMonthDays} dní)`;return s`
      <div class="efficiency-value">${Zi(this.data.efficiency,1)}</div>
      <div class="period-label"
        title="Coulombická (DC) účinnost článků baterie. Celková AC účinnost vč. střídače, se kterou počítá ekonomika plánovače, je ~84 %.">
        ${i} · DC (články)
      </div>

      ${this.data.trend!==0?s`
        <div class="comparison ${e}">
          ${t}${Zi(this.data.trend)} vs minulý měsíc
        </div>
      `:null}

      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${qi(this.data.charged)}</div>
          <div class="stat-label">Nabito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${qi(this.data.discharged)}</div>
          <div class="stat-label">Vybito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${qi(this.data.losses)}</div>
          <div class="stat-label">Ztráty</div>
          ${this.data.lossesPct?s`
            <div class="losses-pct">${Zi(this.data.lossesPct,1)}</div>
          `:null}
        </div>
      </div>
    `}};wn.styles=z`
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
  `;ht([m({type:Object})],wn.prototype,"data",2);wn=ht([E("oig-battery-efficiency")],wn);let _n=class extends O{constructor(){super(...arguments),this.data=null}renderSparkline(){var c;const e=(c=this.data)==null?void 0:c.measurementHistory;if(!e||e.length<2)return null;const t=e.map(p=>p.soh_percent),i=Math.min(...t)-1,a=Math.max(...t)+1-i||1,n=200,o=40,l=t.map((p,u)=>{const h=u/(t.length-1)*n,g=o-(p-i)/a*o;return`${h},${g}`}).join(" ");return s`
      <div class="sparkline-container">
        <svg viewBox="0 0 ${n} ${o}" preserveAspectRatio="none">
          <polyline
            points="${l}"
            fill="none"
            stroke="#4caf50"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
    `}render(){return this.data?s`
      <oig-analytics-block title="Zdraví baterie" icon="❤️">
        <span class="status-badge ${this.data.status}">${this.data.statusLabel}</span>

        ${this.renderSparkline()}

        <div class="metric">
          <span class="metric-label">State of Health</span>
          <span class="metric-value">${Zi(this.data.soh,1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Kapacita (P80)</span>
          <span class="metric-value">${qi(this.data.capacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Min. kapacita (P20)</span>
          <span class="metric-value">${qi(this.data.minCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Nominální kapacita</span>
          <span class="metric-value">${qi(this.data.nominalCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Počet měření</span>
          <span class="metric-value">${this.data.measurementCount}</span>
        </div>
        ${this.data.qualityScore!=null?s`
          <div class="metric">
            <span class="metric-label">Kvalita dat</span>
            <span class="metric-value">${Zi(this.data.qualityScore,0)}</span>
          </div>
        `:null}

        ${this.data.degradation3m!=null||this.data.degradation6m!=null||this.data.degradation12m!=null?s`
          <div class="degradation-section">
            <div class="section-label">Degradace</div>
            ${this.data.degradation3m!=null?s`
              <div class="metric">
                <span class="metric-label">3 měsíce</span>
                <span class="metric-value ${this.data.degradation3m>0?"negative":""}">${this.data.degradation3m.toFixed(2)} %</span>
              </div>
            `:null}
            ${this.data.degradation6m!=null?s`
              <div class="metric">
                <span class="metric-label">6 měsíců</span>
                <span class="metric-value ${this.data.degradation6m>0?"negative":""}">${this.data.degradation6m.toFixed(2)} %</span>
              </div>
            `:null}
            ${this.data.degradation12m!=null?s`
              <div class="metric">
                <span class="metric-label">12 měsíců</span>
                <span class="metric-value ${this.data.degradation12m>0?"negative":""}">${this.data.degradation12m.toFixed(2)} %</span>
              </div>
            `:null}
          </div>
        `:null}

        ${this.data.degradationPerYear!=null||this.data.estimatedEolDate!=null?s`
          <div class="degradation-section">
            <div class="section-label">Predikce</div>
            ${this.data.degradationPerYear!=null?s`
              <div class="prediction">
                Degradace: <span class="prediction-value">${this.data.degradationPerYear.toFixed(2)} %/rok</span>
              </div>
            `:null}
            ${this.data.yearsTo80Pct!=null?s`
              <div class="prediction">
                80% SoH za: <span class="prediction-value">${this.data.yearsTo80Pct.toFixed(1)} let</span>
              </div>
            `:null}
            ${this.data.estimatedEolDate?s`
              <div class="prediction">
                Odhad EOL: <span class="prediction-value">${this.data.estimatedEolDate}</span>
              </div>
            `:null}
            ${this.data.trendConfidence!=null?s`
              <div class="prediction">
                Spolehlivost: <span class="prediction-value">${Zi(this.data.trendConfidence,0)}</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:s`<div>Načítání...</div>`}};_n.styles=z`
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

    ${Xo}

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
  `;ht([m({type:Object})],_n.prototype,"data",2);_n=ht([E("oig-battery-health")],_n);let $n=class extends O{constructor(){super(...arguments),this.data=null}getProgressClass(e){return e==null?"ok":e>=95?"overdue":e>=80?"due-soon":"ok"}statusLabel(e){var i;return{unknown:"Žádné",idle:"Nečinné",charging:"Nabíjení",holding:"Držení 100 %",completed:"Dokončeno"}[(i=e==null?void 0:e.toLowerCase)==null?void 0:i.call(e)]??e}render(){return this.data?!(this.data.lastBalancing&&this.data.lastBalancing!=="—"||this.data.nextScheduled!=null||this.data.progressPercent!=null)&&(this.data.status??"unknown").toLowerCase()==="unknown"?s`
        <oig-analytics-block title="Balancování" icon="⚖️">
          <div class="metric">
            <span class="metric-label">Stav</span>
            <span class="metric-value">Žádné balancování zaznamenáno</span>
          </div>
        </oig-analytics-block>
      `:s`
      <oig-analytics-block title="Balancování" icon="⚖️">
        <div class="metric">
          <span class="metric-label">Stav</span>
          <span class="metric-value">${this.statusLabel(this.data.status)}</span>
        </div>
        ${this.data.lastBalancing&&this.data.lastBalancing!=="—"?s`
          <div class="metric">
            <span class="metric-label">Poslední</span>
            <span class="metric-value">${this.data.lastBalancing}</span>
          </div>
        `:null}
        ${this.data.cost>0?s`
          <div class="metric">
            <span class="metric-label">Náklady</span>
            <span class="metric-value">${ge(this.data.cost)}</span>
          </div>
        `:null}
        ${this.data.nextScheduled?s`
          <div class="metric">
            <span class="metric-label">Plánováno</span>
            <span class="metric-value">${this.data.nextScheduled}</span>
          </div>
        `:null}

        ${this.data.progressPercent!=null?s`
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

        ${this.data.intervalDays!=null?s`
          <div class="metric">
            <span class="metric-label">Interval</span>
            <span class="metric-value">${this.data.intervalDays} dní</span>
          </div>
        `:null}
        ${this.data.estimatedNextCost!=null?s`
          <div class="metric">
            <span class="metric-label">Odhad dalších nákladů</span>
            <span class="metric-value">${ge(this.data.estimatedNextCost)}</span>
          </div>
        `:null}
      </oig-analytics-block>
    `:s`<div>Načítání...</div>`}};$n.styles=z`
    :host { display: block; }
    ${Xo}

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
  `;ht([m({type:Object})],$n.prototype,"data",2);$n=ht([E("oig-battery-balancing")],$n);let kn=class extends O{constructor(){super(...arguments),this.data=null}render(){return this.data?s`
      <oig-analytics-block title="Porovnání nákladů" icon="💰">
        <div class="cost-row">
          <span class="cost-label">Skutečné náklady</span>
          <span class="cost-value">${ge(this.data.actualSpent)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Odhad dnes celkem</span>
          <span class="cost-value">${ge(this.data.planTotalCost)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Zbývající plán</span>
          <span class="cost-value">${ge(this.data.futurePlanCost)}</span>
        </div>
        ${this.data.tomorrowCost!=null?s`
          <div class="cost-row">
            <span class="cost-label">Zítra odhad</span>
            <span class="cost-value">${ge(this.data.tomorrowCost)}</span>
          </div>
        `:null}

        ${this.data.yesterdayActualCost!=null?s`
          <div class="yesterday-section">
            <div class="section-label">Včera</div>
            <div class="cost-row">
              <span class="cost-label">Plán</span>
              <span class="cost-value">${this.data.yesterdayPlannedCost!=null?ge(this.data.yesterdayPlannedCost):"—"}</span>
            </div>
            <div class="cost-row">
              <span class="cost-label">Skutečnost</span>
              <span class="cost-value">${ge(this.data.yesterdayActualCost)}</span>
            </div>
            ${this.data.yesterdayDelta!=null?s`
              <div class="cost-row">
                <span class="cost-label">Rozdíl</span>
                <span class="cost-value ${this.data.yesterdayDelta<=0?"delta-positive":"delta-negative"}">
                  ${this.data.yesterdayDelta>=0?"+":""}${ge(this.data.yesterdayDelta)}
                </span>
              </div>
            `:null}
            ${this.data.yesterdayAccuracy!=null?s`
              <div class="cost-row">
                <span class="cost-label">Přesnost</span>
                <span class="cost-value">${this.data.yesterdayAccuracy.toFixed(0)}%</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:s`<div>Načítání...</div>`}};kn.styles=z`
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
  `;ht([m({type:Object})],kn.prototype,"data",2);kn=ht([E("oig-cost-comparison")],kn);var Lv=Object.defineProperty,Tv=Object.getOwnPropertyDescriptor,In=(e,t,i,r)=>{for(var a=r>1?void 0:r?Tv(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&Lv(t,i,a),a};const xe=X;let sr=class extends O{constructor(){super(...arguments),this.open=!1,this.weather=nn,this.chmu=an}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}hhmm(e){return e?new Date(e).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}):"—"}dayName(e){return e?new Date(e).toLocaleDateString("cs-CZ",{weekday:"short"}).replace(".",""):"—"}fmtTemp(e){return e!=null?`${Math.round(e)}°`:"—"}fmtDateTime(e){return e?new Date(e).toLocaleString("cs-CZ"):"—"}renderHour(e){const t=e.precipitationProbability;return s`
      <div class="h-cell">
        <span class="h-time">${this.hhmm(e.datetime)}</span>
        <span class="h-icon">${Le(Ya(e.condition))}</span>
        <span class="h-temp">${this.fmtTemp(e.temperature)}</span>
        <span class="h-pop">${t!=null&&t>0?s`💧${Math.round(t)}%`:x}</span>
      </div>
    `}renderDay(e){const t=e.precipitationProbability;return s`
      <div class="d-row">
        <span class="d-day">${this.dayName(e.datetime)}</span>
        <span class="d-icon">${Le(Ya(e.condition))}</span>
        <span class="d-pop">${t!=null&&t>0?s`💧 ${Math.round(t)} %`:x}</span>
        <span class="d-temps"><span class="d-hi">${this.fmtTemp(e.temperature)}</span><span class="d-lo">${this.fmtTemp(e.templow)}</span></span>
      </div>
    `}renderWarning(e){const t=Ds[e.severity]??Ds[2],i=_1[e.severity]??"Neznámá";return s`
      <div class="warning-item" style="background: ${t}">
        <div class="warning-header">
          <span class="warning-icon">${Le(w1(e.event_type))}</span>
          <span class="warning-type">${e.event_type}</span>
          <span class="warning-level">${i}</span>
          ${e.eta_hours>0?s`<span class="eta-badge">za ${e.eta_hours.toFixed(0)} h</span>`:x}
        </div>
        ${e.description?s`<div class="warning-description">${e.description}</div>`:x}
        ${e.instruction?s`<div class="warning-instruction">${e.instruction}</div>`:x}
        <div class="warning-time">${this.fmtDateTime(e.onset)} — ${this.fmtDateTime(e.expires)}</div>
      </div>
    `}render(){const e=this.weather,t=this.chmu.allWarnings??[],i=t.length>0&&this.chmu.effectiveSeverity>0,r=e.hourly.slice(0,12),a=e.daily.slice(0,6);return s`
      <div class="modal" @click=${n=>n.stopPropagation()}>
        <div class="modal-header">
          <span class="modal-title">
            ${Le("mdi:weather-partly-cloudy")} Počasí a výstrahy
          </span>
          <button class="close-btn" @click=${this.onClose} aria-label="Zavřít">✕</button>
        </div>

        ${e.available?s`
          <div class="now">
            <span class="now-icon">${Le(Ya(e.condition))}</span>
            <div class="now-main">
              <span class="now-temp">${e.temperature!=null?`${Math.round(e.temperature)} ${e.tempUnit}`:"—"}</span>
              <span class="now-label">${S1(e.condition)}</span>
            </div>
            <div class="now-meta">
              ${e.apparentTemperature!=null?s`<span>${Le("mdi:thermometer")} pocitově ${Math.round(e.apparentTemperature)}°</span>`:x}
              ${e.humidity!=null?s`<span>${Le("mdi:water-percent")} ${Math.round(e.humidity)} %</span>`:x}
              ${e.windSpeed!=null?s`<span>${Le("mdi:weather-windy")} ${Math.round(e.windSpeed)} ${e.windUnit}</span>`:x}
            </div>
          </div>

          ${r.length?s`
            <div class="section">
              <div class="section-title">Po hodinách</div>
              <div class="hourly">${r.map(n=>this.renderHour(n))}</div>
            </div>
          `:x}

          ${a.length?s`
            <div class="section">
              <div class="section-title">Další dny</div>
              <div class="daily">${a.map(n=>this.renderDay(n))}</div>
            </div>
          `:x}
        `:s`
          <div class="empty-state">Není nakonfigurována žádná weather entita v Home Assistantu.</div>
        `}

        <div class="section">
          <div class="section-title">ČHMÚ výstrahy</div>
          ${i?t.map(n=>this.renderWarning(n)):s`<div class="no-warn">${Le("mdi:checkbox-marked-circle")} Žádné aktivní výstrahy</div>`}
        </div>
      </div>
    `}};sr.styles=z`
    :host { display: none; }
    :host([open]) {
      display: flex;
      position: fixed; inset: 0;
      background: rgba(0, 0, 0, 0.5);
      align-items: center; justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: ${xe(d.cardBgSolid)};
      border: 1px solid ${xe(d.divider)};
      border-radius: 16px;
      padding: 18px 20px 20px;
      width: 92vw; max-width: 560px;
      max-height: 86vh; overflow-y: auto;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
    }

    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 14px;
    }
    .modal-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 17px; font-weight: 700; color: ${xe(d.textPrimary)};
    }
    .modal-title .oig-mdi { color: ${xe(d.accent)}; }
    .close-btn {
      width: 32px; height: 32px; border: none; background: transparent;
      font-size: 18px; cursor: pointer; color: ${xe(d.textSecondary)};
      border-radius: 50%;
    }
    .close-btn:hover { background: ${xe(d.bgSecondary)}; }

    .oig-mdi { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; display: inline-block; }

    /* ── Current conditions ── */
    .now {
      display: flex; align-items: center; gap: 14px;
      padding: 12px 14px; border-radius: 12px;
      background: ${xe(d.bgSecondary)};
      margin-bottom: 16px;
    }
    .now-icon { font-size: 46px; color: ${xe(d.accent)}; display: inline-flex; line-height: 1; }
    .now-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .now-temp { font-size: 30px; font-weight: 800; line-height: 1; color: ${xe(d.textPrimary)}; font-variant-numeric: tabular-nums; }
    .now-label { font-size: 13px; color: ${xe(d.textSecondary)}; }
    .now-meta { margin-left: auto; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: ${xe(d.textSecondary)}; text-align: right; }
    .now-meta span { display: inline-flex; align-items: center; gap: 5px; justify-content: flex-end; }

    /* ── Section ── */
    .section-title {
      font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      color: ${xe(d.textSecondary)}; margin: 0 0 8px;
    }
    .section { margin-bottom: 18px; }
    .section:last-child { margin-bottom: 0; }

    /* ── Hourly strip ── */
    .hourly {
      display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px;
      scrollbar-width: thin;
    }
    .h-cell {
      flex: 0 0 auto; width: 56px;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 8px 4px; border-radius: 10px;
      background: ${xe(d.bgSecondary)};
    }
    .h-time { font-size: 11px; color: ${xe(d.textSecondary)}; font-variant-numeric: tabular-nums; }
    .h-icon { font-size: 20px; color: ${xe(d.accent)}; display: inline-flex; }
    .h-temp { font-size: 13px; font-weight: 700; color: ${xe(d.textPrimary)}; font-variant-numeric: tabular-nums; }
    .h-pop { font-size: 10px; color: #4aa3ff; display: inline-flex; align-items: center; gap: 1px; min-height: 13px; }

    /* ── Daily rows ── */
    .daily { display: flex; flex-direction: column; gap: 2px; }
    .d-row {
      display: grid; grid-template-columns: 42px 24px 1fr auto; align-items: center; gap: 10px;
      padding: 7px 6px; border-radius: 8px;
    }
    .d-row:nth-child(odd) { background: ${xe(d.bgSecondary)}; }
    .d-day { font-size: 13px; font-weight: 600; color: ${xe(d.textPrimary)}; text-transform: capitalize; }
    .d-icon { font-size: 18px; color: ${xe(d.accent)}; display: inline-flex; }
    .d-pop { font-size: 11px; color: #4aa3ff; display: inline-flex; align-items: center; gap: 2px; }
    .d-temps { font-size: 13px; font-variant-numeric: tabular-nums; }
    .d-hi { font-weight: 700; color: ${xe(d.textPrimary)}; }
    .d-lo { color: ${xe(d.textSecondary)}; margin-left: 6px; }

    /* ── Warnings ── */
    .warning-item { padding: 11px 12px; border-radius: 10px; margin-bottom: 10px; color: #fff; }
    .warning-item:last-child { margin-bottom: 0; }
    .warning-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .warning-icon { font-size: 18px; display: inline-flex; }
    .warning-type { font-size: 14px; font-weight: 700; }
    .warning-level { font-size: 11px; padding: 2px 7px; background: rgba(255,255,255,0.22); border-radius: 5px; }
    .eta-badge { font-size: 10px; padding: 1px 6px; background: rgba(255,255,255,0.22); border-radius: 5px; margin-left: auto; }
    .warning-description { font-size: 12px; margin-bottom: 4px; }
    .warning-instruction { font-size: 11px; font-style: italic; opacity: 0.9; margin-bottom: 6px; }
    .warning-time { font-size: 11px; opacity: 0.85; }

    .no-warn { font-size: 12px; color: ${xe(d.textSecondary)}; display: inline-flex; align-items: center; gap: 6px; }
    .no-warn .oig-mdi { color: ${xe(d.success)}; }
    .empty-state { text-align: center; padding: 18px; color: ${xe(d.textSecondary)}; font-size: 13px; }
  `;In([m({type:Boolean,reflect:!0})],sr.prototype,"open",2);In([m({type:Object})],sr.prototype,"weather",2);In([m({type:Object})],sr.prototype,"chmu",2);sr=In([E("oig-weather-modal")],sr);const Pv={"field.enable_battery_prediction.label":"Predikce baterie a plánovač","field.enable_solar_forecast.label":"Solární předpověď","field.enable_pricing.label":"Ceny energie","field.enable_boiler.label":"Bojler","field.enable_statistics.label":"Statistiky","field.enable_extended_sensors.label":"Rozšířené senzory","field.enable_chmu_warnings.label":"Výstrahy ČHMÚ","field.auto_mode_switch_enabled.label":"Automatické přepínání režimů","field.charge_rate_kw.label":"Nabíjecí výkon ze sítě (kW)","field.expensive_percentile.label":"Práh drahých hodin (%)","field.battery_comfort_soc_percent.label":"Komfortní rezerva baterie (%)","field.balancing_enabled.label":"Balancování článků","field.balancing_interval_days.label":"Interval balancování (dny)","field.balancing_hold_hours.label":"Držení 100 % (hodiny)","field.cheap_window_percentile.label":"Levné okno pro balancování (%)","field.solar_forecast_provider.label":"Poskytovatel","field.solcast_site_id.label":"Solcast site ID","field.solcast_api_key.label":"Solcast API klíč","field.solar_forecast_latitude.label":"Zeměpisná šířka","field.solar_forecast_longitude.label":"Zeměpisná délka","field.solar_forecast_string1_enabled.label":"String 1 aktivní","field.solar_forecast_string1_kwp.label":"String 1 výkon (kWp)","field.solar_forecast_string1_declination.label":"String 1 sklon (°)","field.solar_forecast_string1_azimuth.label":"String 1 azimut (°)","field.solar_forecast_string2_enabled.label":"String 2 aktivní","field.solar_forecast_string2_kwp.label":"String 2 výkon (kWp)","field.solar_forecast_string2_declination.label":"String 2 sklon (°)","field.solar_forecast_string2_azimuth.label":"String 2 azimut (°)","field.boiler_volume_l.label":"Objem nádrže (l)","field.boiler_temp_sensor_top.label":"Čidlo teploty — vrchní","field.boiler_temp_sensor_bottom.label":"Čidlo teploty — spodní","field.boiler_enable_second_thermometer.label":"Druhý teploměr aktivní","field.boiler_current_power_entity.label":"Senzor příkonu bojleru","field.boiler_target_temp_c.label":"Cílová teplota (°C)","field.boiler_deadline_time.label":"Deadline (HH:MM)","field.boiler_thermal_arbitrage_enabled.label":"💰 Tepelná arbitráž","field.boiler_max_temp_c.label":"Strop arbitráže (°C)","field.boiler_alt_power_kw.label":"Výkon alt. zdroje (kW)","field.boiler_has_alternative_heating.label":"Alternativní zdroj tepla","field.boiler_alt_source_type.label":"Typ alternativního zdroje","field.boiler_alt_cost_kwh.label":"Cena tepla (Kč/kWh)","field.boiler_alt_energy_sensor.label":"Senzor energie alt. zdroje","field.boiler_alt_energy_daily.label":"Denní přírůstek energie","field.box_has_home56.label":"Box má Home 5/6","field.boiler_home5_maneuver_enabled.label":"🔋→🔥 Ohřev z baterie","field.boiler_battery_cycle_cost_czk_kwh.label":"Cena cyklu baterie (Kč/kWh)","field.boiler_circulation_enabled.label":"Cirkulace teplé vody","field.boiler_circulation_lead_minutes.label":"Předstih cirkulace (min)","field.boiler_circulation_run_minutes.label":"Délka běhu cirkulace (min)","field.boiler_circulation_max_runs_per_day.label":"Max. počet běhů/den","field.boiler_circulation_min_gap_minutes.label":"Min. pauza mezi běhy (min)","field.boiler_legionella_interval_days.label":"Interval ochrany (dny)","field.boiler_legionella_target_temp_c.label":"Teplota dezinfekce (°C)","field.solar_forecast_api_key.label":"forecast.solar API klíč","field.solar_forecast_mode.label":"Frekvence aktualizace","field.confirmed_distribution_distributor.label":"Distributor","field.confirmed_distribution_tariff.label":"Sazba (tarif)","field.confirmed_distribution_price_incl_vat.label":"Cena s DPH","field.confirmed_distribution_price_excl_vat.label":"Cena bez DPH","field.confirmed_distribution_unit.label":"Jednotka","field.balancing_opportunistic_threshold.label":"Oportunní práh balancování (%)","field.balancing_economic_threshold.label":"Ekonomický práh balancování (%)","field.spot_pricing_model.label":"Scénář nákupní ceny","field.spot_positive_fee_percent.label":"Přirážka při kladné spotové ceně, VT (%)","field.spot_positive_fee_percent_nt.label":"Přirážka při kladné spotové ceně, NT (%)","field.spot_negative_fee_percent.label":"Přirážka při záporné spotové ceně, VT (%)","field.spot_negative_fee_percent_nt.label":"Přirážka při záporné spotové ceně, NT (%)","field.spot_fixed_fee_mwh.label":"Fixní poplatek, VT (CZK/MWh)","field.spot_fixed_fee_mwh_nt.label":"Fixní poplatek, NT (CZK/MWh)","field.fixed_commercial_price_vt.label":"Fixní nákupní cena VT (CZK/kWh)","field.fixed_commercial_price_nt.label":"Fixní nákupní cena NT (CZK/kWh)","field.export_pricing_model.label":"Scénář prodejní ceny","field.export_fee_percent.label":"Srážka z exportu, VT (%)","field.export_fee_percent_nt.label":"Srážka z exportu, NT (%)","field.export_fixed_fee_czk.label":"Fixní srážka exportu, VT (CZK/kWh)","field.export_fixed_fee_czk_nt.label":"Fixní srážka exportu, NT (CZK/kWh)","field.export_fixed_price.label":"Fixní výkupní cena (CZK/kWh)","field.distribution_fee_vt_kwh.label":"Poplatek za distribuci VT (CZK/kWh)","field.distribution_fee_nt_kwh.label":"Poplatek za distribuci NT (CZK/kWh)","field.vat_rate.label":"DPH (%)","field.tariff_vt_start_weekday.label":"VT začátek, pracovní den (hodina)","field.tariff_nt_start_weekday.label":"NT začátek, pracovní den (hodina1,hodina2)","field.tariff_weekend_same_as_weekday.label":"Víkend stejně jako pracovní dny","field.tariff_vt_start_weekend.label":"VT začátek, víkend (hodina)","field.tariff_nt_start_weekend.label":"NT začátek, víkend (hodina1,hodina2)","field.dual_tariff_enabled.label":"Dvoutarifní sazba (odvozeno automaticky)","field.tariff_schedule_weekday.label":"Rozvrh NT/VT — pracovní dny","field.tariff_schedule_weekend.label":"Rozvrh NT/VT — víkend","field.data_source_mode.label":"Zdroj telemetrie","field.standard_scan_interval.label":"Základní data (sekund)","field.extended_scan_interval.label":"Rozšířená data (sekund)","field.local_proxy_stale_minutes.label":"Fallback na cloud po (minut)","field.local_event_debounce_ms.label":"Local event debounce (ms)","field.enable_dashboard.label":"📊 Webový dashboard s grafy","field.ai_provider.label":"Poskytovatel AI","field.ai_base_url.label":"Base URL API","field.ai_model.label":"Model","simulator.card.settings.label":"Nastavení, které simulace používá","simulator.card.readonly.label":"Z boxu (jen pro čtení)","simulator.common.unavailable.label":"nedostupné","simulator.common.retry.label":"Zkusit znovu","simulator.kpi.day_cost.label":"Náklad dne","simulator.kpi.base_cost.label":"Bez plánovače","simulator.kpi.savings.label":"Úspora","simulator.kpi.ups_hours.label":"Hodin v UPS","simulator.kpi.energy_today.label":"Energie dne","simulator.kpi.solar_share.label":"Ze slunce","simulator.chart.mode.label":"Plán režimů","simulator.chart.soc.label":"Stav baterie","simulator.chart.price.label":"Spotová cena","simulator.chart.heating_windows.label":"Okna ohřevu","simulator.chart.water_temp.label":"Teplota vody","simulator.chart.draw.label":"Odběr teplé vody","simulator.battery.charge_rate_kw.label":"Nabíjecí výkon ze sítě","simulator.battery.reserve.label":"Komfortní rezerva","simulator.battery.expensive_percentile.label":"Práh drahých hodin","simulator.boiler.target_temp_c.label":"Cílová teplota","simulator.boiler.min_temp_c.label":"Minimální teplota","simulator.box.capacity_kwh.label":"Kapacita baterie","simulator.box.hw_min_soc_percent.label":"Minimální SoC (HW)","simulator.box.top_temp_c.label":"Teplota nahoře","simulator.box.bottom_temp_c.label":"Teplota dole","simulator.box.cold_inlet_c.label":"Studená voda na vstupu"},Hv={"field.enable_battery_prediction.hint":"Ekonomické plánování nabíjení, timeline, úspory","field.enable_solar_forecast.hint":"Předpověď výroby FVE (forecast.solar / Solcast)","field.enable_pricing.hint":"Spotové ceny OTE, výkup, distribuce","field.enable_boiler.hint":"Inteligentní ohřev vody","field.auto_mode_switch_enabled.hint":"Plánovač sám přepíná Home 1 / Home UPS podle plánu","field.charge_rate_kw.hint":"Kolik kW box bere při nabíjení ze sítě (UPS)","field.expensive_percentile.hint":"Importy nad tímto denním percentilem cen se plánovač snaží pokrýt levným přednabitím. Výchozí 70 %.","field.battery_comfort_soc_percent.hint":"Baterku drží nad touto úrovní, ale jen dobíjením v nejlevnějších oknech — aby ji box sám nenatáhl na 80 % za jakoukoli cenu. 0 = vypnuto. Výchozí 50 %.","field.balancing_enabled.hint":"Pravidelné nabití na 100 % kvůli vyrovnání článků","field.cheap_window_percentile.hint":"Balancování se plánuje do hodin pod tímto cenovým percentilem","field.solcast_site_id.hint":"Jen pro Solcast (z rooftop site URL)","field.solcast_api_key.hint":"Nech prázdné = beze změny","field.solar_forecast_string1_azimuth.hint":"0 = jih, −90 = východ, 90 = západ","field.boiler_volume_l.hint":"Jmenovitý objem zásobníku v litrech","field.boiler_temp_sensor_top.hint":"ID entity senzoru teploty (např. sensor.bojler_top)","field.boiler_temp_sensor_bottom.hint":"Jen pokud máš druhý teploměr (ID entity senzoru)","field.boiler_enable_second_thermometer.hint":"Zapni, pokud máš spodní čidlo teploty","field.boiler_current_power_entity.hint":"ID entity senzoru výkonu (W); upřesňuje plánovač","field.boiler_target_temp_c.hint":"Požadovaná teplota vody před deadline","field.boiler_deadline_time.hint":"Čas, do kdy musí být voda nahřátá (formát HH:MM, např. 07:00)","field.boiler_thermal_arbitrage_enabled.hint":"Přetápět levným proudem (spot pod cenou alt. zdroje) a podržet; rezerva na přetok FVE","field.boiler_max_temp_c.hint":"Kam až smí arbitráž dotopit nad cílovou teplotu","field.boiler_alt_power_kw.hint":"Tepelný výkon alt. zdroje do nádrže; 0 = neznámý","field.boiler_has_alternative_heating.hint":"Bojler má jiný zdroj ohřevu (plyn, TČ, krb…)","field.boiler_alt_cost_kwh.hint":"Cena tepla z alternativního zdroje v Kč/kWh","field.boiler_alt_energy_sensor.hint":"ID entity senzoru energie (kWh)","field.boiler_alt_energy_daily.hint":"Zapni, pokud senzor měří denní (ne celkový) přírůstek","field.box_has_home56.hint":"Aktivuje Home 5/6 (OIG CBB) — umožňuje 🔋→🔥 ohřev z baterie","field.boiler_home5_maneuver_enabled.hint":"Plánovač může použít baterii k ohřevu (vyžaduje Home 5/6)","field.boiler_battery_cycle_cost_czk_kwh.hint":"Degradace baterie za kWh; plánovač porovná s cenou sítě","field.boiler_circulation_enabled.hint":"Zapnutí cirkulačního čerpadla TUV","field.boiler_circulation_lead_minutes.hint":"Jak dlouho před odběrem pustit čerpadlo","field.boiler_legionella_interval_days.hint":"0 = vypnuto; doporučeno 7–14 dní","field.boiler_legionella_target_temp_c.hint":"Min. 60 °C pro spolehlivé usmrcení legionelly","field.solar_forecast_mode.hint":"Hodinově a po 4 h vyžaduje API klíč forecast.solar","field.confirmed_distribution_distributor.hint":"Vyberte svého distributora elektřiny (ČEZ, EG.D, PRE)","field.confirmed_distribution_tariff.hint":"Vaše distribuční sazba dle smlouvy s distributorem","field.confirmed_distribution_price_incl_vat.hint":"Doplněno automaticky z ceníku distributora","field.confirmed_distribution_price_excl_vat.hint":"Doplněno automaticky z ceníku distributora","field.confirmed_distribution_unit.hint":"Doplněno automaticky z ceníku distributora","field.balancing_opportunistic_threshold.hint":"Balancování proběhne dřív, pokud je v tomto okně dost levné energie","field.balancing_economic_threshold.hint":"Nad tímto cenovým prahem se balancování odkládá, aby se nenabíjelo draze","field.spot_pricing_model.hint":"💰 SPOT + procento — variabilní cena podle burzy · 💵 SPOT + fixní poplatek — stabilnější · 🔒 FIX cena — předvídatelná","field.spot_positive_fee_percent.hint":"Při kladné spotové ceně: cena × (1 + procento/100). Např. 15 % = spot × 1,15","field.spot_positive_fee_percent_nt.hint":"Stejný vzorec jako VT, NT větev","field.spot_negative_fee_percent.hint":"Při záporné spotové ceně: cena × (1 − procento/100). Např. 9 % = spot × 0,91","field.spot_negative_fee_percent_nt.hint":"Stejný vzorec jako VT, NT větev","field.spot_fixed_fee_mwh.hint":"Konstantní poplatek přičtený ke spotové ceně","field.spot_fixed_fee_mwh_nt.hint":"Konstantní poplatek přičtený ke spotové ceně, NT větev","field.fixed_commercial_price_vt.hint":"⚠️ Zadávejte bez DPH a distribuce","field.fixed_commercial_price_nt.hint":"⚠️ Zadávejte bez DPH a distribuce","field.export_pricing_model.hint":"💰 SPOT − procento — výhodné při vysokých cenách · 💵 SPOT − fixní srážka — stabilnější výkup · 🔒 FIX cena — stabilní po celý rok","field.export_fee_percent.hint":"Např. 15 % = dostanete 85 % ze spotové ceny (spot × 0,85)","field.export_fee_percent_nt.hint":"Stejný vzorec jako VT, NT větev","field.export_fixed_fee_czk.hint":"Fixní srážka od spotové ceny. Např. 0,20 CZK/kWh = spot − 0,20","field.export_fixed_fee_czk_nt.hint":"Fixní srážka od spotové ceny, NT větev","field.export_fixed_price.hint":"Výkupní cena bez ohledu na spot","field.distribution_fee_vt_kwh.hint":"Např. 1,42 CZK/kWh","field.distribution_fee_nt_kwh.hint":"Např. 0,91 CZK/kWh","field.vat_rate.hint":"Standardně 21 %","field.tariff_vt_start_weekday.hint":"Např. '6' = 06:00","field.tariff_nt_start_weekday.hint":"Např. '22,2' = 22:00 večer a 02:00 ráno","field.tariff_weekend_same_as_weekday.hint":"Vypněte, pokud se víkendové tarify liší","field.tariff_vt_start_weekend.hint":"Nechte prázdné pro NT celý den","field.tariff_nt_start_weekend.hint":"Např. '0' = NT celý den","field.dual_tariff_enabled.hint":"Odvozeno z tarifu vybraného v kroku Ceny — distribuce; drženo pro zpětnou kompatibilitu.","field.data_source_mode.hint":"Cloud only = všechny senzory čtou z cloudu; Local only = čtení z lokálních entit (při výpadku proxy > limit minut se dočasně vrátí na cloud)","field.standard_scan_interval.hint":"Jak často načítat spotřebu, výrobu, stav baterie a další základní údaje (minimálně 30 sekund, doporučeno 30-60 sekund)","field.extended_scan_interval.hint":"Jak často načítat napětí článků, teploty, proudy a další detailní údaje (minimálně 300 sekund, doporučeno 300-600 sekund)","field.local_proxy_stale_minutes.hint":"Po kolika minutách bez lokálních dat se přepnout do cloudu. Jakmile proxy znovu odpoví, vrátí se zpět na local.","field.local_event_debounce_ms.hint":"Debounce pro event-driven refresh z lokálních entit (nižší = rychlejší reakce, vyšší = méně aktualizací)","field.enable_dashboard.hint":"Webové rozhraní s grafy přístupné v HA","field.ai_provider.hint":"Volitelné; žádný poskytovatel není předvybrán ani zvýhodněn.","field.ai_base_url.hint":"Volitelná vlastní OpenAI-compatible URL.","field.ai_model.hint":"Volitelný identifikátor modelu.","simulator.battery.charge_rate_kw.hint":"Kolik box bere při nabíjení v režimu UPS. Vyšší = stihne nabít v kratším levném okně.","simulator.battery.reserve.hint":"Pod tuto úroveň baterku nepustí — dobíjí ale jen v levných oknech. 0 = vypnuto.","simulator.battery.expensive_percentile.hint":"Hodiny nad tímto percentilem cen se plánovač snaží pokrýt levným přednabitím. Vyšší = útočnější spoření.","simulator.boiler.target_temp_c.hint":"Na kolik stupňů se bojler snaží ohřát v levných/solárních oknech.","simulator.boiler.min_temp_c.hint":"Pod tohle nesmí spadnout — ohřeje se hned, i za draho. Komfortní pojistka."};function ue(e,t){return Pv[t]??e.replace(/_/g," ")}function Ri(e,t){return Hv[t]}const Vv={"field.solar_forecast_provider.enum.forecast_solar":"Forecast.Solar (zdarma, bez registrace)","field.solar_forecast_provider.enum.solcast":"Solcast (přesnější, vyžaduje registraci)","field.solar_forecast_mode.enum.hourly":"Každou hodinu (vyžaduje API klíč)","field.solar_forecast_mode.enum.every_4h":"Každé 4 hodiny (vyžaduje API klíč)","field.solar_forecast_mode.enum.daily_optimized":"Denně, optimalizovaně (výchozí)","field.data_source_mode.enum.cloud_only":"Přes OIG Cloud (výchozí — funguje vždy)","field.data_source_mode.enum.local_only":"Přímo z boxu po domácí síti (rychlejší, bez internetu)","field.boiler_alt_source_type.enum.gas":"Plyn","field.boiler_alt_source_type.enum.heat_pump":"Tepelné čerpadlo","field.boiler_alt_source_type.enum.fireplace":"Krb","field.boiler_alt_source_type.enum.other":"Jiný","field.spot_pricing_model.enum.percentage":"SPOT + procento (variabilní)","field.spot_pricing_model.enum.fixed":"SPOT + fixní poplatek","field.spot_pricing_model.enum.fixed_prices":"Fixní cena (FIX)","field.export_pricing_model.enum.percentage":"SPOT − procento (variabilní)","field.export_pricing_model.enum.fixed":"SPOT − fixní srážka","field.export_pricing_model.enum.fixed_prices":"Fixní cena (FIX)","field.ai_provider.enum.ai_task":"Vlastní AI v Home Assistantu (ai_task)","field.ai_provider.enum.groq":"Groq","field.ai_provider.enum.nvidia":"NVIDIA","field.confirmed_distribution_distributor.enum.cez":"ČEZ Distribuce","field.confirmed_distribution_distributor.enum.egd":"EG.D","field.confirmed_distribution_distributor.enum.pre":"PREdistribuce"};function zv(e,t){return Vv[`field.${e}.enum.${t}`]??t}const Tl=new URLSearchParams(window.location.search),Dv=Tl.get("sn")||Tl.get("inverter_sn")||"";async function ac(e){const t=await J.fetchOIGAPI(`/${Dv}/config_registry`,{signal:e});return!t||t.error||!t.fields?null:t}function Ov(e){return e.widget?e.widget:e.type==="bool"?"bool":e.enum?"select":e.type==="int"||e.type==="float"?"number":"text"}function We(e,t){return Object.entries(e.fields).filter(([,i])=>i.section===t).map(([i,r])=>{var a;return{key:i,label:ue(i,r.label),hint:Ri(i,r.hint),type:Ov(r),min:r.min,max:r.max,step:r.step,options:(a=r.enum)==null?void 0:a.map(n=>[n,zv(i,n)]),scale:r.scale,optional:r.optional,secret:r.secret,showIf:r.show_if,entity:r.entity_domain?{domain:r.entity_domain}:void 0}})}function xr(e,t){return e.showIf?e.showIf.in.some(i=>i===t(e.showIf.field)):!0}var Ev=Object.defineProperty,Iv=Object.getOwnPropertyDescriptor,Ct=(e,t,i,r)=>{for(var a=r>1?void 0:r?Iv(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&Ev(t,i,a),a};const Be=X;function Er(e){return e.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")}function Fv(e,t,i,r=50){const a=Er(i.trim()),n=t?`${t}.`:"",o=e.filter(u=>n&&!u.entity_id.startsWith(n)?!1:a?Er(u.entity_id).includes(a)||Er(u.friendly_name).includes(a):!0);if(!a)return o.slice(0,r);const l=[],c=[],p=[];for(const u of o){const h=Er(u.entity_id),g=Er(u.friendly_name);h.startsWith(a)||h.includes(`.${a}`)?l.push(u):g.startsWith(a)?c.push(u):p.push(u)}return[...l,...c,...p].slice(0,r)}function Bv(e,t){if(!e)return"";const i=t.find(r=>r.entity_id===e);return i!=null&&i.friendly_name&&i.friendly_name!==e?i.friendly_name:e}function jv(e){return Object.entries(e??{}).map(([t,i])=>{var r;return{entity_id:t,friendly_name:((r=i==null?void 0:i.attributes)==null?void 0:r.friendly_name)??t}})}let st=class extends O{constructor(){super(...arguments),this.value="",this.domain="",this.optional=!1,this.entities=[],this.dirty=!1,this.placeholder="nevyplněno",this.open=!1,this.query="",this.highlightIndex=-1}get results(){return Fv(this.entities,this.domain,this.query)}get displayValue(){return this.value?Bv(this.value,this.entities):""}openDropdown(){this.open=!0,this.query="",this.highlightIndex=-1,requestAnimationFrame(()=>{var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".search-box input");e==null||e.focus()})}closeDropdown(){this.open=!1,this.query="",this.highlightIndex=-1}selectEntity(e){this.closeDropdown(),e!==this.value&&(this.value=e,this.dispatchEvent(new CustomEvent("entity-change",{detail:{value:e},bubbles:!0,composed:!0})))}clearValue(e){e.stopPropagation(),this.selectEntity("")}onInputClick(){this.open?this.closeDropdown():this.openDropdown()}onSearchInput(e){this.query=e.target.value,this.highlightIndex=-1}onSearchKeydown(e){const t=this.results;if(e.key==="Escape"){this.closeDropdown();return}if(e.key==="ArrowDown"){e.preventDefault(),this.highlightIndex=Math.min(this.highlightIndex+1,t.length-1),this.scrollHighlightedIntoView();return}if(e.key==="ArrowUp"){e.preventDefault(),this.highlightIndex=Math.max(this.highlightIndex-1,-1),this.scrollHighlightedIntoView();return}if(e.key==="Enter"){e.preventDefault(),this.highlightIndex>=0&&this.highlightIndex<t.length&&this.selectEntity(t[this.highlightIndex].entity_id);return}}scrollHighlightedIntoView(){requestAnimationFrame(()=>{var i;const e=(i=this.shadowRoot)==null?void 0:i.querySelector(".option-list"),t=e==null?void 0:e.querySelector(".option.hl");t==null||t.scrollIntoView({block:"nearest"})})}render(){const e=this.displayValue,t=this.open?this.results:[];return s`
      <div class="picker-wrap">
        <div
          class="picker-input ${this.dirty?"dirty":""} ${this.open?"open":""}"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded=${this.open}
          tabindex="0"
          title=${this.value||""}
          @click=${this.onInputClick}
          @keydown=${i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),this.onInputClick()),i.key==="Escape"&&this.closeDropdown()}}
        >
          ${e||s`<span style="color:${d.textSecondary};opacity:0.6">${this.optional?this.placeholder:"— vyberte —"}</span>`}
        </div>
        ${this.optional&&this.value?s`<button class="clear-btn" title="Vymazat" @click=${this.clearValue} tabindex="-1">×</button>`:x}
        ${this.open?s`
          <div class="dropdown" role="listbox">
            <div class="search-box">
              <input
                type="text"
                .value=${this.query}
                placeholder="Hledat entitu…"
                autocomplete="off"
                @input=${this.onSearchInput}
                @keydown=${this.onSearchKeydown}
              />
            </div>
            <div class="option-list">
              ${this.optional?s`
                <div class="option opt-none" @click=${()=>this.selectEntity("")}>— žádné —</div>
              `:x}
              ${t.length===0&&this.query?s`<div class="empty-msg">Žádné entity nenalezeny</div>`:t.map((i,r)=>s`
                  <div
                    class="option ${r===this.highlightIndex?"hl":""}"
                    role="option"
                    @click=${()=>this.selectEntity(i.entity_id)}
                    @mouseenter=${()=>{this.highlightIndex=r}}
                  >
                    <span class="opt-name">${i.friendly_name!==i.entity_id?i.friendly_name:i.entity_id}</span>
                    ${i.friendly_name!==i.entity_id?s`<span class="opt-id">${i.entity_id}</span>`:x}
                  </div>
                `)}
            </div>
          </div>
        `:x}
      </div>
    `}};st.styles=z`
    :host { display: block; position: relative; }

    .picker-wrap {
      position: relative;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .picker-input {
      background: ${Be(d.bgSecondary)};
      color: ${Be(d.textPrimary)};
      border: 1px solid ${Be(d.divider)};
      border-radius: 7px;
      padding: 5px 8px;
      font-size: 12.5px;
      width: 170px;
      cursor: pointer;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      box-sizing: border-box;
    }

    .picker-input.dirty {
      border-color: ${Be(d.accent)};
    }

    .picker-input.open {
      border-color: ${Be(d.accent)};
      border-radius: 7px 7px 0 0;
    }

    .clear-btn {
      border: none;
      background: transparent;
      color: ${Be(d.textSecondary)};
      cursor: pointer;
      font-size: 15px;
      padding: 0 2px;
      line-height: 1;
      flex-shrink: 0;
    }

    .clear-btn:hover { color: ${Be(d.textPrimary)}; }

    .dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      width: 300px;
      max-height: 280px;
      overflow-y: auto;
      background: ${Be(d.cardBg)};
      border: 1px solid ${Be(d.accent)};
      border-radius: 0 0 8px 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      z-index: 999;
      display: flex;
      flex-direction: column;
    }

    .search-box {
      padding: 6px 8px;
      border-bottom: 1px solid ${Be(d.divider)};
      background: ${Be(d.bgSecondary)};
      flex-shrink: 0;
    }

    .search-box input {
      width: 100%;
      background: ${Be(d.bgSecondary)};
      color: ${Be(d.textPrimary)};
      border: none;
      outline: none;
      font-size: 12px;
      padding: 2px 4px;
      box-sizing: border-box;
    }

    .option-list {
      overflow-y: auto;
      flex: 1;
    }

    .option {
      padding: 6px 10px;
      cursor: pointer;
      border-bottom: 1px solid ${Be(d.divider)};
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .option:last-of-type { border-bottom: none; }

    .option:hover,
    .option.hl {
      background: rgba(3, 169, 244, 0.12);
    }

    .opt-name {
      font-size: 12.5px;
      color: ${Be(d.textPrimary)};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .opt-id {
      font-size: 10.5px;
      color: ${Be(d.textSecondary)};
      font-family: monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .opt-none {
      padding: 6px 10px;
      font-size: 12px;
      color: ${Be(d.textSecondary)};
      font-style: italic;
    }

    .empty-msg {
      padding: 10px;
      font-size: 12px;
      color: ${Be(d.textSecondary)};
      text-align: center;
    }
  `;Ct([m({type:String})],st.prototype,"value",2);Ct([m({type:String})],st.prototype,"domain",2);Ct([m({type:Boolean})],st.prototype,"optional",2);Ct([m({attribute:!1})],st.prototype,"entities",2);Ct([m({type:Boolean})],st.prototype,"dirty",2);Ct([m({type:String})],st.prototype,"placeholder",2);Ct([S()],st.prototype,"open",2);Ct([S()],st.prototype,"query",2);Ct([S()],st.prototype,"highlightIndex",2);st=Ct([E("oig-entity-picker")],st);var Nv=Object.defineProperty,Rv=Object.getOwnPropertyDescriptor,nc=(e,t,i,r)=>{for(var a=r>1?void 0:r?Rv(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&Nv(t,i,a),a};let Cn=class extends O{constructor(){super(...arguments),this.message=""}render(){return s`
      <div class="overlay" data-testid="reload-overlay">
        <div class="modal" role="dialog" aria-modal="true" data-testid="reload-overlay-modal">
          <div class="reload-panel">
            <div class="reload-spinner" aria-hidden="true"></div>
            <p data-testid="reload-overlay-message">${this.message}</p>
          </div>
        </div>
      </div>
    `}};Cn.styles=z`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.12s ease-out;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
      }
    }

    .modal {
      width: min(420px, calc(100vw - 32px));
      background: var(--card-bg, #1d2330);
      color: inherit;
      border-radius: 14px;
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
    }

    .reload-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px 24px;
      text-align: center;
    }

    .reload-spinner {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 3px solid var(--divider-color, rgba(255, 255, 255, 0.18));
      border-top-color: var(--primary-color, #4f7cff);
      animation: reload-spin 0.8s linear infinite;
    }

    @keyframes reload-spin { to { transform: rotate(360deg); } }
  `;nc([m()],Cn.prototype,"message",2);Cn=nc([E("oig-reload-overlay")],Cn);const it=X;function Fi(e){return s`
    <span class="lab">
      ${e.label}${e.optional?s`<span class="optional-badge"> (volitelné)</span>`:x}
      ${e.hint?s`<span class="hint">${e.hint}</span>`:x}
    </span>`}function Pl(e,t){if(e.type==="bool")return t?"Zapnuto":"Vypnuto";if(t==null||t==="")return"—";if(e.type==="number"){const i=e.scale??1;return String(Math.round((Number(t)*i+Number.EPSILON)*1e4)/1e4)}if(e.type==="select"){const i=(e.options??[]).find(([r])=>r===String(t));return i?i[1]:String(t)}return String(t)}function Bi(e,t){if(e.secret)return!t.reviewMode||!t.dirty?x:s`<span class="diff-hint" data-testid="diff-hint">Bylo: (nastaveno) → Nyní: (změněno)</span>`;if(t.originalValue===void 0)return x;const i=Pl(e,t.originalValue),r=Pl(e,t.value);return i===r?x:s`<span class="diff-hint" data-testid="diff-hint">Bylo: ${i} → Nyní: ${r}</span>`}function Lt(e,t){const{value:i,dirty:r,secretSet:a,onChange:n,entityCatalog:o,disabled:l}=t;if(e.type==="bool"){const h=!l&&!!i;return s`
      <div class="row" style=${l?"opacity:0.45;pointer-events:none":""}>
        ${Fi(e)}
        <div class="row-control">
          <label class="switch">
            <input type="checkbox" .checked=${h} ?disabled=${!!l}
              @change=${g=>n(g.target.checked)} />
            <span class="slider"></span>
          </label>
        </div>
        ${Bi(e,t)}
      </div>`}if(e.type==="select"){const h=String(i??"");return s`
      <div class="row">
        ${Fi(e)}
        <div class="row-control">
          <select class=${r?"dirty":""}
            @change=${g=>n(g.target.value)}>
            ${(e.options??[]).map(([g,v])=>s`<option value=${g} ?selected=${g===h}>${v}</option>`)}
          </select>
        </div>
        ${Bi(e,t)}
      </div>`}if(e.type==="number"){const h=e.scale??1,g=i==null||i===""?"":String(Math.round((Number(i)*h+Number.EPSILON)*1e4)/1e4);return s`
      <div class="row">
        ${Fi(e)}
        <div class="row-control">
          <input type="number" class=${r?"dirty":""} .value=${g}
            min=${e.min??x} max=${e.max??x} step=${e.step??x}
            @change=${v=>{const f=v.target.value;f!==""&&n(Number(f)/h)}} />
        </div>
        ${Bi(e,t)}
      </div>`}if(e.entity){const h=String(i??"");return s`
      <div class="row">
        ${Fi(e)}
        <div class="row-control">
          <oig-entity-picker
            .value=${h}
            .domain=${e.entity.domain}
            .optional=${!!e.optional}
            .dirty=${r}
            .entities=${o}
            @entity-change=${g=>n(g.detail.value)}
          ></oig-entity-picker>
        </div>
        ${Bi(e,t)}
      </div>`}const c=e.secret??e.key.endsWith("api_key");if(c&&a&&t.onRevealSecret&&!t.secretRevealed)return s`
      <div class="row">
        ${Fi(e)}
        <div class="row-control">
          <span class="secret-badge" data-testid="secret-badge">
            <span aria-hidden="true">✓</span> nastaveno
            <button
              type="button"
              class="secret-badge-change"
              data-testid="secret-badge-change"
              @click=${()=>t.onRevealSecret()}
            >Změnit</button>
          </span>
        </div>
        ${Bi(e,t)}
      </div>`;const p=c?"":String(i??""),u=c?a?t.onRevealSecret?"(zadejte novou hodnotu)":"••••• (nastaveno)":"nenastaveno":e.optional?"nevyplněno":"";return s`
    <div class="row">
      ${Fi(e)}
      <div class="row-control">
        <input type=${c?"password":"text"} class=${r?"dirty":""} .value=${p}
          placeholder=${u}
          @change=${h=>n(h.target.value)} />
      </div>
      ${Bi(e,t)}
    </div>`}const oc=z`
  /* ---- Rows ---- */
  .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px dashed ${it(d.divider)};
  }
  .row:last-of-type { border-bottom: none; }

  /* Review-mode diff hint (UX-SPEC §3/§6) — full-width, directly under the
     control, muted like the existing field-help .hint treatment. */
  .diff-hint {
    flex-basis: 100%;
    display: block;
    font-size: 10.5px;
    color: ${it(d.textSecondary)};
    margin-top: 2px;
    line-height: 1.4;
  }

  .lab {
    font-size: 12.5px;
    color: ${it(d.textPrimary)};
    flex: 1;
    min-width: 0;
  }

  .hint {
    display: block;
    font-size: 10.5px;
    color: ${it(d.textSecondary)};
    margin-top: 3px;
    line-height: 1.4;
  }

  .optional-badge {
    font-size: 10px;
    color: ${it(d.textSecondary)};
    font-style: italic;
    margin-left: 2px;
  }

  .row-control {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  input[type='number'], input[type='text'], input[type='password'], select {
    background: ${it(d.bgSecondary)};
    color: ${it(d.textPrimary)};
    border: 1px solid ${it(d.divider)};
    border-radius: 7px;
    padding: 5px 8px;
    font-size: 12.5px;
    max-width: 120px;
  }
  input[type='text'], input[type='password'] { max-width: 170px; }
  input.dirty, select.dirty { border-color: ${it(d.accent)}; }
  select option {
    background: ${it(d.bgSecondary)};
    color: ${it(d.textPrimary)};
  }

  /* toggle */
  .switch { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider {
    position: absolute; inset: 0; cursor: pointer; border-radius: 11px;
    background: rgba(255,255,255,0.15); transition: 0.2s;
  }
  .slider:before {
    content: ''; position: absolute; width: 16px; height: 16px;
    left: 3px; top: 3px; border-radius: 50%; background: #fff; transition: 0.2s;
  }
  .switch input:checked + .slider { background: ${it(d.accent)}; }
  .switch input:checked + .slider:before { transform: translateX(18px); }
`,Jo=z`
  .oneliner {
    border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
    border-radius: 12px;
    padding: 10px 14px;
    color: inherit;
    font-size: 13px;
    margin-bottom: 12px;
    background: var(--card-bg, transparent);
  }
  .oneliner details p {
    opacity: 0.7;
    margin-top: 6px;
  }

  details.inline {
    display: block;
    margin-top: 6px;
  }
  details.inline summary {
    cursor: pointer;
    color: var(--primary-color, #4f7cff);
    font-size: 12.5px;
    list-style: none;
  }
  details.inline summary::before {
    content: '▸ ';
  }
  details.inline[open] summary::before {
    content: '▾ ';
  }
  details.inline p,
  details.inline ol {
    margin: 6px 0 0 4px;
    font-size: 12.5px;
    opacity: 0.7;
  }
  details.inline summary::-webkit-details-marker {
    display: none;
  }

  .ptiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }
  .ptile {
    background: var(--card-bg, transparent);
    border: 1.5px solid var(--divider-color, rgba(255, 255, 255, 0.14));
    border-radius: 13px;
    padding: 12px;
    text-align: left;
    cursor: pointer;
    color: inherit;
    display: flex;
    flex-direction: column;
    gap: 3px;
    font: inherit;
  }
  .ptile .pic {
    font-size: 20px;
  }
  .ptile b {
    font-size: 13.5px;
  }
  .ptile i {
    font-style: normal;
    opacity: 0.65;
    font-size: 11.5px;
    line-height: 1.35;
  }
  .ptile.on {
    border-color: var(--sc, var(--primary-color, #4f7cff));
    background: color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 10%, transparent);
    box-shadow: 0 0 16px color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 25%, transparent);
  }
  .chipok {
    color: #9fe8c6;
    font-size: 11px;
    margin-top: 3px;
  }
  .chipmut {
    opacity: 0.65;
    font-size: 11px;
    margin-top: 3px;
  }
`,Qa={ai_task:{label:"Moje vlastní AI v Home Assistantu (ai_task)",steps:["Použije se AI, kterou už máš v HA nastavenou."],disclosureKey:"onboarding.ai.disclosure.ai_task"},groq:{label:"Groq",registerUrl:"https://console.groq.com",keysUrl:"https://console.groq.com/keys",keyPrefix:"gsk_",freeTier:"30k TPM / 30 RPM / 14400 RPD",steps:["Otevři console.groq.com a zaregistruj se (email/Google/GitHub, bez karty).","Přejdi na console.groq.com/keys.","Klikni na [Create API Key].","Zkopíruj klíč (zobrazí se jen jednou) a vlož ho níže."],disclosureKey:"onboarding.ai.disclosure.groq"},nvidia:{label:"NVIDIA",registerUrl:"https://build.nvidia.com",keysUrl:"https://build.nvidia.com/settings/api-keys",keyPrefix:"nvapi-",freeTier:"1000 kreditů (až 5000 na požádání), 40 RPM",steps:["Otevři build.nvidia.com a zaregistruj se (bez karty).","Přejdi na build.nvidia.com/settings/api-keys.","Klikni na [Generate API Key].","Zkopíruj klíč a vlož ho níže."],disclosureKey:"onboarding.ai.disclosure.nvidia"}},Wv={skippable:!0};function sc(e){const t=Qa[e];return t==null?void 0:t.keyPrefix}function Kv(e,t){const i=sc(e);return i?typeof t!="string"||t.length<i.length+8?{ok:!1,reason:"too_short"}:t.startsWith(i)?{ok:!0}:{ok:!1,reason:"wrong_prefix"}:{ok:!1,reason:"no_key_required"}}const Wi={id:"solar",section:"solar",blocksDashboard:!1,skippable:!0,fields:e=>We(e,"solar"),visibleFields:(e,t)=>We(e,"solar").filter(i=>xr(i,r=>t[r]))},Zv={forecast_solar:{label:"Forecast.Solar",registerUrl:"https://forecast.solar/en/pricing.html",keysUrl:"https://account.forecast.solar",steps:['Zdarma funguje i bez klíče — ale jen v režimu "Denně, optimalizovaně". Klíč je potřeba jen pro rychlejší aktualizace (každou hodinu / každé 4 hodiny).',"Otevři forecast.solar/en/pricing.html a vyber si placený tarif (Personal apod.) — platba probíhá přes PayPal.","Po zaplacení přijdou na tvůj PayPal e-mail dva e-maily: jeden od PayPal, druhý od Forecast.Solar s API klíčem.","Klíč kdykoliv najdeš nebo obnovíš na account.forecast.solar (přihlášení přes PayPal subscription ID + e-mail)."]},solcast:{label:"Solcast",registerUrl:"https://toolkit.solcast.com.au",keysUrl:"https://toolkit.solcast.com.au",steps:["Solcast vyžaduje bezplatnou registraci — API klíč i Site ID najdete ve svém Toolkit účtu.","Otevřete toolkit.solcast.com.au a zaregistrujte se (e-mail).","API klíč najdete v nastavení účtu (API Key) — zkopírujte ho do pole níže."],siteIdSteps:["V Toolkitu přidejte svou střechu jako Rooftop Site (adresa, výkon a orientace panelů).","Otevřete vytvořenou instalaci — v jejím detailu (případně v adrese URL) najdete Site ID.","Zkopírujte Site ID do pole níže — je to jiná hodnota než API klíč, potřebujete obě."]}},qv="/oig_cloud_static_v2/assets/cez-distribuce.svg",Gv="data:image/svg+xml,%3csvg%20width='88'%20height='40'%20viewBox='0%200%2088%2040'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20fill='%23EA1C0A'%20d='M24.462%2021.6c.061-.554.092-1.17.092-1.723%200-6.8-4.308-12.615-12.092-12.615C5.6%207.262%200%2012.554%200%2019.477c0%206.615%204.862%2012.738%2012.8%2012.738%205.262%200%209.354-3.138%2011.138-6.584l-5.753-1.293c-1.354%201.416-3.231%202.093-5.077%202.093-2.831%200-5.508-1.662-6.062-4.862h17.416v.031zM7.169%2016.83c.923-2.676%203.293-4.06%205.57-4.06%202.184%200%204.307%201.322%204.953%204.06H7.17zM87.231%200h-7.046v8.585a10.684%2010.684%200%200%200-5.17-1.323c-6.4%200-12.184%204.923-12.184%2012.523%200%207.292%205.477%2012.461%2012.707%2012.461%202.124%200%204.985-.646%207.293-2.37H87.2V0h.03zM75.323%2025.446c-3.046%200-5.6-2.554-5.6-5.661%200-3.077%202.585-5.662%205.6-5.662%203.2%200%205.508%202.462%205.508%205.57.03%203.045-2.093%205.753-5.508%205.753m-48.215-7.2c0%206.123%205.261%2010.954%2010.707%2010.954%201.385%200%203.139-.338%204.493-1.077v1.046c0%203.323-2.4%205.046-4.831%205.046-1.815%200-3.63-.953-4.492-2.984l-5.693%201.323c1.477%203.846%205.17%207.261%2010.462%207.261%206.83%200%2011.077-4.707%2011.077-13.107V9.415h-4.277a10.864%2010.864%200%200%200-6.462-2.153%2010.971%2010.971%200%200%200-10.984%2010.984m6.492%200c0-2.461%202.03-4.492%204.492-4.492s4.493%202.03%204.493%204.492-2.031%204.492-4.493%204.492c-2.461%200-4.492-2-4.492-4.492m17.938%201.785c0%202.43%201.939%204.369%204.37%204.369%202.43%200%204.4-1.938%204.4-4.37%200-2.43-1.939-4.368-4.37-4.368-2.43%200-4.4%201.938-4.4%204.369'/%3e%3c/svg%3e",Uv="/oig_cloud_static_v2/assets/predistribuce.svg",es=["D25d","D26d","D27d","D35d","D45d","D56d","D57d","D61d"];function vo(e){return typeof e=="string"&&es.includes(e)}const Yv={cez:qv,egd:Gv,pre:Uv},Do=["tariff_vt_start_weekday","tariff_nt_start_weekday","tariff_weekend_same_as_weekday","tariff_vt_start_weekend","tariff_nt_start_weekend"],Qv=["distribution_fee_vt_kwh","distribution_fee_nt_kwh"],Et="vat_rate";function ts(e,t,i){var a;if(!xr(e,i))return!1;const r=(a=t.fields[e.key])==null?void 0:a.show_if_all;return r?r.every(n=>n.in.some(o=>o===i(n.field))):!0}function Hl(e){const t=[...Do];return[...We(e,"pricing"),...We(e,"pricing_supplier").filter(i=>t.includes(i.key))]}const hi={id:"pricing_distribution",blocksDashboard:!1,skippable:!0,fields:Hl,visibleFields:(e,t)=>Hl(e).filter(i=>ts(i,e,r=>t[r]))},Je=24;function Vl(e){const t=e.trim();if(t==="")return[];const i=t.split(",").map(a=>a.trim()).filter(a=>a!==""),r=[];for(const a of i){if(!/^-?\d+$/.test(a))return null;r.push(Number(a))}return r.some(a=>a<0||a>23)?null:r}function Xv(e,t){const i=e.indexOf(t);if(i===-1)return(t+1)%Je;const r=i+1;return r<e.length?e[r]:e[0]}function zl(e,t,i,r){for(const a of[...t].sort((n,o)=>n-o)){const n=Xv(i,a);let o=a,l=0;for(;o!==n;){if(e.has(o))return!1;if(e.set(o,r),o=(o+1)%Je,l+=1,l>Je)break}}return!0}function Jv(e,t){if(e.length===0||t.length===0)return null;const i=[...e,...t].sort((n,o)=>n-o),r=new Map;if(!zl(r,e,i,"VT")||!zl(r,t,i,"NT")||r.size!==Je)return null;const a=[];for(let n=0;n<Je;n+=1){const o=r.get(n);if(!o)return null;a.push(o)}return a}function is(e,t,i){const r=Vl(e),a=Vl(t);if(r===null||a===null||r.length===0&&a.length===0)return null;if(i){if(r.length===0)return Array(Je).fill("NT");if(a.length===0)return Array(Je).fill("VT")}else if(r.length===0||a.length===0)return null;return Jv(r,a)}function lc(e){if(e.every(r=>r==="VT"))return{vt:[0],nt:[]};if(e.every(r=>r==="NT"))return{vt:[],nt:[0]};const t=[],i=[];for(let r=0;r<Je;r+=1){const a=e[(r+Je-1)%Je];e[r]!==a&&(e[r]==="VT"?t:i).push(r)}return{vt:t,nt:i}}function ey(e,t){return e.length===t.length&&e.every((i,r)=>i===t[r])}function ty(e,t){if(e.length!==Je)return null;const{vt:i,nt:r}=lc(e);if(!t&&(i.length===0||r.length===0))return null;const a=i.join(","),n=r.join(","),o=is(a,n,t);return!o||!ey(o,e)?null:{vt:a,nt:n}}function dc(e){const t=a=>`${String(a%24).padStart(2,"0")}:00`;if(e.every(a=>a==="NT"))return"NT: 00:00-24:00 (celý den)";if(e.every(a=>a==="VT"))return"NT: žádné (celý den VT)";const{nt:i}=lc(e),r=[...i].sort((a,n)=>a-n).map(a=>{let n=(a+1)%Je;for(;e[n]==="NT"&&n!==a;)n=(n+1)%Je;return{start:a,end:n}});return r.sort((a,n)=>{const o=a.end<=a.start?0:1,l=n.end<=n.start?0:1;return o!==l?o-l:a.start-n.start}),`NT: ${r.map(a=>`${t(a.start)}-${t(a.end)}`).join(", ")}`}function cc(e){return We(e,"pricing_supplier").filter(t=>iy.includes(t.key))}const iy=["spot_pricing_model","spot_positive_fee_percent","spot_positive_fee_percent_nt","spot_negative_fee_percent","spot_negative_fee_percent_nt","spot_fixed_fee_mwh","spot_fixed_fee_mwh_nt","fixed_commercial_price_vt","fixed_commercial_price_nt"],ry=[{value:"percentage",title:"SPOT + procento",hint:"Variabilní cena podle burzy — cena roste a klesá se spotovým trhem."},{value:"fixed",title:"SPOT + pevná přirážka",hint:"Stabilnější než procento — k burzovní ceně se přičte fixní poplatek."},{value:"fixed_prices",title:"Pevná cena",hint:"Předvídatelná cena bez ohledu na burzu, dle vaší smlouvy."}];function ay(e,t,i){const r=a=>a==="confirmed_distribution_tariff"?i?es[0]:void 0:t[a];return cc(e).filter(a=>ts(a,e,r))}const Xa={id:"pricing_supplier",blocksDashboard:!1,skippable:!0,fields:cc,visibleFields:ay};function pc(e){return We(e,"pricing_supplier").filter(t=>ny.includes(t.key))}const ny=["export_pricing_model","export_fee_percent","export_fee_percent_nt","export_fixed_fee_czk","export_fixed_fee_czk_nt","export_fixed_price"],oy=[{value:"percentage",title:"SPOT − procento",hint:"Výhodné při vysokých cenách — dostanete spotovou cenu sníženou o srážku."},{value:"fixed",title:"SPOT − pevná srážka",hint:"Stabilnější výkup — od spotové ceny se odečte fixní částka."},{value:"fixed_prices",title:"Pevná výkupní cena",hint:"Stabilní výkupní cena po celý rok, bez ohledu na burzu."}];function sy(e,t,i){const r=a=>a==="confirmed_distribution_tariff"?i?es[0]:void 0:t[a];return pc(e).filter(a=>ts(a,e,r))}const Ja={id:"pricing_supplier_sell",blocksDashboard:!1,skippable:!0,fields:pc,visibleFields:sy};function Dl(e,t,i,r){return s`
    <div class="scenario-cards" data-testid=${r} role="radiogroup">
      ${e.map(a=>s`
        <button
          type="button"
          class="scenario-card ${t===a.value?"selected":""}"
          data-scenario-card=${a.value}
          role="radio"
          aria-checked=${t===a.value}
          @click=${()=>i(a.value)}
        >
          <span class="scenario-card-title">${a.title}</span>
          <span class="scenario-card-hint">${a.hint}</span>
        </button>
      `)}
    </div>
  `}const ly=z`
  .scenario-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
    margin-bottom: 10px;
  }

  .scenario-card {
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: flex-start;
    text-align: left;
    padding: 12px;
    border: 1.5px solid var(--divider-color, rgba(255, 255, 255, 0.14));
    border-radius: 13px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .scenario-card:hover { border-color: var(--sc, var(--primary-color, #4f7cff)); }

  .scenario-card.selected {
    border-color: var(--sc, var(--primary-color, #4f7cff));
    background: color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 10%, transparent);
    box-shadow: 0 0 16px color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 25%, transparent);
  }

  .scenario-card-title { font-weight: 700; font-size: 13.5px; }

  .scenario-card-hint { font-size: 11.5px; opacity: 0.65; line-height: 1.35; }
`;function dy(e,t){return e*(1+t/100)}const uc=["charge_rate_kw","battery_comfort_soc_percent"],cy=new Set(uc),py=[{id:"nabijeni",heading:"Nabíjení",keys:uc}],uy=[{id:"battery-capacity-chip",labelKey:"onboarding.battery.hardware.capacity",attr:"max_capacity_kwh"},{id:"battery-hw-min-chip",labelKey:"onboarding.battery.hardware.hw_min_soc",attr:"min_capacity_kwh"}];function hy(e,t,i){var o;if(!t||!(e!=null&&e.states))return null;const r=e.states[`sensor.oig_${t}_battery_forecast`];if(!r||r.state==="unknown"||r.state==="unavailable")return null;const a=(o=r.attributes)==null?void 0:o[i],n=typeof a=="number"?a:Number(a);return Number.isFinite(n)?n:null}function gy(e){return cy.has(e)}const by=new Set(["balancing_interval_days","balancing_hold_hours","balancing_opportunistic_threshold","balancing_economic_threshold"]);function fy(e,t){return by.has(e)&&!t.balancing_enabled}const Nr={id:"battery",section:"battery",blocksDashboard:!1,skippable:!0,fields:e=>We(e,"battery"),visibleFields:(e,t)=>We(e,"battery").filter(i=>gy(i.key)).filter(i=>xr(i,r=>t[r])).filter(i=>!fy(i.key,t))},Rr={id:"boiler",section:"boiler",blocksDashboard:!1,skippable:!0,fields:e=>We(e,"boiler"),visibleFields:(e,t)=>We(e,"boiler").filter(i=>xr(i,r=>t[r]))},my=["boiler_volume_l","boiler_temp_sensor_top","boiler_temp_sensor_bottom","boiler_enable_second_thermometer","boiler_target_temp_c","boiler_deadline_time","boiler_has_alternative_heating"],Oo=[{id:"core",heading:"Základní údaje o bojleru",keys:my,collapsible:!1},{id:"circulation",heading:"Cirkulace teplé vody",keys:["boiler_circulation_enabled","boiler_circulation_lead_minutes","boiler_circulation_run_minutes","boiler_circulation_max_runs_per_day","boiler_circulation_min_gap_minutes"],collapsible:!0,summaryKey:"onboarding.boiler.advanced.circulation_summary"},{id:"legionella",heading:"Ochrana proti legionele",keys:["boiler_legionella_interval_days","boiler_legionella_target_temp_c"],collapsible:!0,summaryKey:"onboarding.boiler.advanced.legionella_summary"},{id:"alt-source",heading:"Alternativní zdroj tepla",keys:["boiler_alt_source_type","boiler_alt_cost_kwh","boiler_alt_energy_sensor","boiler_alt_energy_daily","boiler_battery_cycle_cost_czk_kwh","boiler_thermal_arbitrage_enabled","boiler_max_temp_c","boiler_alt_power_kw","boiler_current_power_entity","box_has_home56","boiler_home5_maneuver_enabled"],collapsible:!0,summaryKey:"onboarding.boiler.advanced.alt_source_summary"}];function vy(e){const t=new Set(Oo.flatMap(i=>i.keys));return We(e,"boiler").filter(i=>!t.has(i.key))}function Ol(e){return e.map(t=>t.key==="data_source_mode"&&t.options?{...t,options:t.options.filter(([i])=>i!=="hybrid")}:t)}const en={id:"connection",section:"basic",blocksDashboard:!1,skippable:!0,fields:e=>Ol(We(e,"basic")),visibleFields:(e,t)=>Ol(We(e,"basic")).filter(i=>xr(i,r=>t[r]))},Ka={cs:{"onboarding.solar_test.error.timeout":"Test vypršel — zkuste to znovu.","onboarding.solar_test.error.auth":"Neplatný přístupový klíč.","onboarding.solar_test.error.provider_unreachable":"Poskytovatel je nedostupný.","onboarding.solar_test.error.rate_limited":"Příliš mnoho pokusů — zkuste to za chvíli.","onboarding.solar_test.error.invalid_response":"Neočekávaná odpověď poskytovatele.","onboarding.solar_test.error.aborted":"Test byl přerušen.","onboarding.solar_test.error.generic":"Test selhal.","onboarding.bootstrap.load_failed":"Načtení dat selhalo.","onboarding.bootstrap.state_load_failed":"Stav průvodce se nepodařilo načíst.","onboarding.bootstrap.retry_button":"Zkusit znovu","onboarding.pricing.save_error":"Uložení se nezdařilo.","onboarding.pricing.stale_warning":"Ceny jsou z předchozího roku.","onboarding.finish.error.in_progress":"Dokončení už probíhá.","onboarding.finish.error.save_failed":"Dokončení se nepodařilo uložit.","onboarding.finish.error.reload_timeout":"Integrace se po uložení nevrátila. Zkuste to znovu.","onboarding.finish.error.generic":"Dokončení se nepodařilo.","onboarding.banner.title":"Průvodce nastavením je připraven","onboarding.banner.body":"Nastavení můžete doplnit teď nebo se k němu kdykoli vrátit později.","onboarding.banner.launch":"Spustit průvodce","onboarding.banner.close_label":"Skrýt průvodce nastavením","onboarding.banner.grandfathered_title":"Zkontrolujte svou stávající konfiguraci","onboarding.banner.grandfathered_body":"Váš box je už nastavený. Průvodcem můžete kdykoli projít a zkontrolovat svou stávající konfiguraci — nic se tím neztratí.","onboarding.banner.grandfathered_close_label":"Skrýt tuto nabídku","onboarding.ai.disclosure.ai_task":"Zpracování probíhá u AI, kterou už máte nastavenou v Home Assistantu — nezavádíme žádnou novou třetí stranu.","onboarding.ai.disclosure.groq":"Dle smluvních podmínek Groq NETRÉNUJE na vstupech. Naše integrace posílá výhradně anonymní číselné hodnoty, žádné osobní údaje.","onboarding.ai.disclosure.nvidia":'Free tier NVIDIA je dle ToS „trial/evaluation, ne produkce" — trvalé použití je šedá zóna. Dle §3.3 smí NVIDIA deidentifikovaně používat vstupy ke zlepšování modelů; osobní údaje v promptech jsou zakázané. Naše integrace posílá výhradně anonymní číselné hodnoty.',"onboarding.welcome.new_install":"Vítejte v průvodci nastavením OIG Cloud. Projdeme spolu pár kroků — solární předpověď, ceny energie, volitelně AI a bojler. Nic nemusíte vyplnit najednou, průvodce si pamatuje, kde jste skončili.","onboarding.welcome.review":"Váš stávající nastavení zůstává beze změny, dokud ho výslovně nepotvrdíte. V každém kroku uvidíte svou aktuální hodnotu a můžete ji ověřit nebo upravit — nic se nesmaže, dokud nedáte Uložit.","onboarding.summary.new_install_heading":"Shrnutí nastavení — zkontrolujte prosím před uložením:","settings.ai.badge.awaiting_verification":"AI čeká na ověření","settings.ai.badge.no_credits":"AI došly kredity","settings.ai.badge.backing_off":"AI zrovna čeká na další pokus","onboarding.summary.validate_ai_config_button":"Zkontrolovat konfiguraci AI","onboarding.summary.validate_ai_config_result_heading":"Výsledek ověření AI","onboarding.summary.validate_ai_config_result_empty":"Nebyly nalezeny žádné problémy.","onboarding.summary.validate_ai_config_error.network":"Ověření AI se nepodařilo spustit.","onboarding.summary.validate_ai_config_error.ai_not_verified":"AI ještě není ověřená.","onboarding.summary.validate_ai_config_error.no_credits":"AI došly kredity.","onboarding.summary.validate_ai_config_error.generic":"Ověření AI selhalo.","onboarding.summary.confirm_notice":"Toto se změní. Dokud nekliknete na Uložit, nic se neuloží.","onboarding.summary.diff_empty":"Žádné změny oproti stávajícímu nastavení.","onboarding.battery.simulator_button":"🧪 Vyzkoušet chování","onboarding.battery.hardware.capacity":"Kapacita baterie z boxu","onboarding.battery.hardware.hw_min_soc":"HW min SoC z boxu","onboarding.battery.hardware.unavailable":"nedostupné","onboarding.pricing_supplier.recovered_note":"Tyto hodnoty jsme našli ve vašem stávajícím nastavení — dosud nebyly v průvodci vidět, teď je můžete zkontrolovat.","onboarding.modules.off_warning":"Vypnutím modulu se jeho nastavení skryje, ale zůstane uloženo — pokud modul znovu zapnete, hodnoty budou stále tady.","onboarding.ai.intro_heading":"🤖 K čemu je tu AI","onboarding.ai.intro_body":'Když nastavíte AI, vaše instalace (OIG Cloud) získá vlastní „AI Task" entitu přímo ve vaší Home Assistant instanci. To znamená, že si ve svých automatizacích a skriptech můžete nechat od AI vygenerovat strukturovanou odpověď — založenou na pár anonymních číslech z vaší instalace (výkon a orientace panelů, kapacita a nastavení baterie), nikdy na vaší poloze, jménu nebo e-mailu. Tahle čísla nikam neodejdou bez vašeho souhlasu — a pokud zvolíte „moje vlastní AI v Home Assistantu", neodejdou vůbec, protože se použije AI, kterou už máte nastavenou u sebe doma.',"onboarding.ai.intro_why_it_matters":"Nejde o žádnou skrytou magii navíc — je to stejná AI Task funkce, kterou Home Assistant nabízí pro cokoliv jiného, jen předpřipravená s čísly z vaší FVE a baterie, abyste je nemuseli do každé automatizace přepisovat ručně.","onboarding.ai.intro_optionality":"AI je volitelná — dashboard i všechny výpočty (predikce baterie, ceny, bojler) fungují úplně stejně bez ní. Nic se kvůli vynechání tohoto kroku nezhorší.","onboarding.modules.group_hlavni":"Hlavní moduly","onboarding.modules.group_doplnkove":"Doplňkové","onboarding.modules.dep_hard_prefix":"Nejdřív zapněte:","onboarding.modules.dep_enable_btn":"Zapnout předpoklady","onboarding.modules.dep_soft.enable_battery_prediction":"Doporučujeme zapnout i Ceny energie — bez nich plánovač nespočítá ekonomická doporučení a plán zůstane prázdný.","onboarding.modules.dep_soft.enable_boiler":"Doporučujeme zapnout i Ceny energie a Predikci baterie — bez nich bojler plánuje jen podle síťového tarifu a ztrácí přednostní ohřev z přetoků FVE.","onboarding.modules.prereq_off_confirm":"Tento modul potřebují jiné zapnuté moduly. Když ho vypnete, vypnou se i ony. Hodnoty zůstanou uložené — po opětovném zapnutí budou zpět.","onboarding.modules.prereq_off_confirm_yes":"Vypnout i závislé moduly","onboarding.modules.prereq_off_cancel":"Zrušit","onboarding.connection.explainer_cloud":"Bez proxy (přes OIG Cloud): box posílá data do cloudu výrobce a my je odtud čteme. Funguje vždy a odkudkoliv, data jdou přes internet a obnovují se v nastaveném intervalu.","onboarding.connection.explainer_local":"S lokální proxy: čteme data přímo z boxu ve vaší domácí síti — rychlejší odezva a funguje i při výpadku internetu. Vyžaduje běžící doplněk lokální proxy.","onboarding.boiler.core_example":"Při 60 °C a 200 l trvá ohřev zhruba 1–1,5 hodiny.","onboarding.boiler.simulator_button":"🧪 Vyzkoušet chování","onboarding.boiler.advanced.circulation_summary":"Řídí oběhové čerpadlo, předstih a dobu běhu.","onboarding.boiler.advanced.legionella_summary":"Periodicky ohřívá vodu na dezinfekční teplotu.","onboarding.boiler.advanced.alt_source_summary":"Nastavení alternativního zdroje tepla a souvisejících voleb.","onboarding.reload.message":"Ukládám a přenačítám…","onboarding.quicksave.bar_label":"Máte neuložené změny","onboarding.quicksave.save":"Uložit","onboarding.quicksave.discard":"Zahodit","onboarding.quicksave.discard_confirm":"Opravdu chcete zahodit neuložené změny? Vrátí se k naposledy uloženým hodnotám.","onboarding.quicksave.discard_confirm_yes":"Zahodit změny","onboarding.quicksave.discard_cancel":"Zrušit"},en:{"onboarding.solar_test.error.timeout":"Test timed out — try again.","onboarding.solar_test.error.auth":"Invalid access key.","onboarding.solar_test.error.provider_unreachable":"Provider is unreachable.","onboarding.solar_test.error.rate_limited":"Too many attempts — try again shortly.","onboarding.solar_test.error.invalid_response":"Unexpected response from provider.","onboarding.solar_test.error.aborted":"Test was aborted.","onboarding.solar_test.error.generic":"Test failed.","onboarding.bootstrap.load_failed":"Failed to load data.","onboarding.bootstrap.state_load_failed":"Failed to load wizard state.","onboarding.bootstrap.retry_button":"Try again","onboarding.pricing.save_error":"Save failed.","onboarding.pricing.stale_warning":"Prices are from a previous year.","onboarding.finish.error.in_progress":"Finish is already in progress.","onboarding.finish.error.save_failed":"Failed to save on finish.","onboarding.finish.error.reload_timeout":"The integration did not come back after saving. Try again.","onboarding.finish.error.generic":"Finish failed.","onboarding.banner.title":"Setup wizard is ready","onboarding.banner.body":"You can finish setup now or come back to it anytime.","onboarding.banner.launch":"Launch wizard","onboarding.banner.close_label":"Hide setup wizard","onboarding.banner.grandfathered_title":"Review your existing configuration","onboarding.banner.grandfathered_body":"Your box is already set up. You can walk through the wizard anytime to review your existing configuration — nothing will be lost.","onboarding.banner.grandfathered_close_label":"Hide this prompt","onboarding.ai.disclosure.ai_task":"Processing stays with whichever AI backend you already configured in Home Assistant — we don’t introduce any new third party.","onboarding.ai.disclosure.groq":"Per its terms of service, Groq contractually does not train on your inputs. Our integration sends only anonymous numeric values — no personal data.","onboarding.ai.disclosure.nvidia":'NVIDIA’s free tier is, per its ToS, "trial/evaluation, not production" — permanent use is a gray area. Under §3.3, NVIDIA may use deidentified inputs to improve its models; personal data in prompts is prohibited. Our integration sends only anonymous numeric values.',"onboarding.welcome.new_install":"Welcome to the OIG Cloud setup wizard. We'll walk through a few steps together — solar forecast, energy prices, optionally AI and boiler. You don't need to fill everything in one go, the wizard remembers where you left off.","onboarding.welcome.review":"Your existing setup stays unchanged until you explicitly confirm it. On every step you'll see your current value and can verify or edit it — nothing is deleted until you click Save.","onboarding.summary.new_install_heading":"Setup summary — please review before saving:","settings.ai.badge.awaiting_verification":"AI is waiting for verification","settings.ai.badge.no_credits":"AI credits exhausted","settings.ai.badge.backing_off":"AI is backing off for now","onboarding.summary.validate_ai_config_button":"Check AI configuration","onboarding.summary.validate_ai_config_result_heading":"AI validation result","onboarding.summary.validate_ai_config_result_empty":"No issues were found.","onboarding.summary.validate_ai_config_error.network":"AI validation could not be started.","onboarding.summary.validate_ai_config_error.ai_not_verified":"AI is not verified yet.","onboarding.summary.validate_ai_config_error.no_credits":"AI credits exhausted.","onboarding.summary.validate_ai_config_error.generic":"AI validation failed.","onboarding.summary.confirm_notice":"This will change. Nothing is saved until you click Save.","onboarding.summary.diff_empty":"No changes from your existing configuration.","onboarding.battery.simulator_button":"🧪 Test behavior","onboarding.battery.hardware.capacity":"Battery capacity from box","onboarding.battery.hardware.hw_min_soc":"HW min SoC from box","onboarding.battery.hardware.unavailable":"unavailable","onboarding.pricing_supplier.recovered_note":"We found these values in your existing configuration — they weren't visible in the wizard until now, so you can review them.","onboarding.modules.off_warning":"Turning off a module hides its settings, but they stay saved — if you turn the module back on, the values will still be there.","onboarding.modules.group_hlavni":"Main modules","onboarding.modules.group_doplnkove":"Additional","onboarding.boiler.core_example":"At 60 °C and 200 l, heating takes about 1–1.5 hours.","onboarding.boiler.simulator_button":"🧪 Try behavior","onboarding.boiler.advanced.circulation_summary":"Controls the circulation pump, lead time, and run duration.","onboarding.boiler.advanced.legionella_summary":"Periodically heats water to a disinfection temperature.","onboarding.boiler.advanced.alt_source_summary":"Settings for the alternative heat source and related expert options.","onboarding.reload.message":"Saving and reloading…","onboarding.quicksave.bar_label":"You have unsaved changes","onboarding.quicksave.save":"Save","onboarding.quicksave.discard":"Discard","onboarding.quicksave.discard_confirm":"Discard unsaved changes? This reverts to the last saved values.","onboarding.quicksave.discard_confirm_yes":"Discard changes","onboarding.quicksave.discard_cancel":"Cancel"}};function R(e,t="cs"){const i=Ka[t]??Ka.cs;return e in i?i[e]:e in Ka.cs?Ka.cs[e]:e}var yy=Object.defineProperty,xy=Object.getOwnPropertyDescriptor,ie=(e,t,i,r)=>{for(var a=r>1?void 0:r?xy(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&yy(t,i,a),a};function wy(e,t){return!e||!e.provider||e.status==="verified"?null:e.status==="no_credits"?{status:e.status,text:R("settings.ai.badge.no_credits",t)}:e.status==="backing_off"?{status:e.status,text:R("settings.ai.badge.backing_off",t)}:{status:e.status,text:R("settings.ai.badge.awaiting_verification",t)}}function _y(e,t){return R(e==="ai_not_verified"?"onboarding.summary.validate_ai_config_error.ai_not_verified":e==="no_credits"?"onboarding.summary.validate_ai_config_error.no_credits":e==="provider_unreachable"?"onboarding.summary.validate_ai_config_error.network":"onboarding.summary.validate_ai_config_error.generic",t)}async function hc(e,t){return J.fetchOIGAPI(`/${e}/ai`,{signal:t})}function Kr(e){const{aiState:t,lang:i,showValidateButton:r=!1,validationState:a={kind:"idle"},buttonDisabled:n=!1,onValidate:o}=e,l=wy(t,i),c=r&&(t==null?void 0:t.status)==="verified";return s`
    <div class="ai-status-panel">
      ${l?s`<div class="ai-status-badge" data-testid="ai-status-badge" data-status=${l.status}>
            ${l.text}
          </div>`:x}
      ${c?s`
            <button
              type="button"
              class="ai-validate-button"
              data-testid="validate-ai-config-button"
              ?disabled=${n||a.kind==="loading"}
              @click=${()=>o==null?void 0:o()}
            >${R("onboarding.summary.validate_ai_config_button",i)}</button>
          `:x}
      ${a.kind==="success"?s`
            <div class="ai-validate-findings" data-testid="validate-ai-config-findings">
              <div class="ai-validate-heading">${R("onboarding.summary.validate_ai_config_result_heading",i)}</div>
              ${a.findings.length===0?s`<div class="ai-validate-empty">${R("onboarding.summary.validate_ai_config_result_empty",i)}</div>`:s`
                    <ul>
                      ${a.findings.map(p=>s`
                        <li data-severity=${p.severity}>${p.message}</li>
                      `)}
                    </ul>
                  `}
            </div>
          `:a.kind==="error"?s`
              <div class="ai-validate-error" data-testid="validate-ai-config-error">
                ${_y(a.code,i)}
              </div>
            `:x}
    </div>
  `}let kt=class extends O{constructor(){super(...arguments),this.inverterSn="",this.onboardingState=void 0,this.hass=null,this.state=null,this.verifying=null,this.lastVerify=null,this.selectedProvider="groq"}get stepLang(){return Ln(this.hass)}connectedCallback(){super.connectedCallback(),this.onboardingState===void 0&&this.inverterSn&&this.refresh()}async refresh(){this.state=await No(this.inverterSn)}async verify(e,t){const i=Kv(e,t);if(!i.ok){this.lastVerify={ok:!1,provider:e,verified:!1,reason:i.reason};return}this.verifying=e;try{this.lastVerify=await K1(this.inverterSn,e,t)}finally{this.verifying=null}}renderProviderDetail(e){var r;const t=Qa[e];if(!t)return x;const i=sc(e);return s`
      <div class="card" data-provider=${e}>
        <h3>
          ${t.label}
          ${s`<span class="skippable-badge">(volitelné)</span>`}
        </h3>
        <div class="disclosure" data-testid=${`disclosure-${e}`}>
          ${R(t.disclosureKey,this.stepLang)}
        </div>
        ${t.registerUrl?s`
              <details class="inline">
                <summary>Jak získat klíč (${t.steps.length} kroky)</summary>
                <ol>${t.steps.map(a=>s`<li>${a}</li>`)}</ol>
              </details>
            `:x}
        ${t.freeTier?s`<div class="tier">${t.freeTier}</div>`:x}
        ${i?s`
              <input
                class="paste"
                type="password"
                placeholder=${`API klíč (začíná ${i}…)`}
                @change=${a=>{const n=a.target.value;n&&this.verify(e,n)}}
              />
              <div class="verify">
                ${this.verifying===e?s`Ověřuji…`:((r=this.lastVerify)==null?void 0:r.provider)===e?this.lastVerify.verified?s`✓ Ověřeno`:s`⚠ Neověřeno — klíč se uloží a onboarding pokračuje (#5/#6)`:x}
              </div>
            `:s`<div class="tier">Použije se AI, kterou už máte v HA nastavenou. Žádný klíč není potřeba.</div>`}
      </div>
    `}render(){var i;const e={ai_task:{ic:"🏠",tag:"Nic neopouští váš Home Assistant."},groq:{ic:"⚡",tag:"Zdarma, rychlé, smluvně netrénuje na vstupech."},nvidia:{ic:"🟩",tag:"Zdarma (trial), velký katalog modelů."}},t=this.selectedProvider;return s`
      <section aria-labelledby="step-ai-heading" style="--sc: var(--c-ai, #9d7bff)">
        <h2 id="step-ai-heading">
          ① AI${s` <span class="skippable-badge">(volitelné)</span>`}
          ${((i=this.onboardingState!==void 0?this.onboardingState:this.state)==null?void 0:i.steps.ai)==="done"?s`<span class="done-badge">✓ hotovo</span>`:x}
        </h2>
        <div class="oneliner" data-testid="ai-intro">
          Posíláme <b>jen anonymní čísla</b> (výkon panelů, kapacita baterie) — nikdy polohu, jméno či e-mail.
          <details class="inline"><summary>více o soukromí</summary>
            <p>AI Task entita vznikne ve vaší HA instanci. U volby „Moje AI v HA" data neopouští váš dům vůbec.
            Dashboard i všechny výpočty fungují stejně i bez AI.</p>
          </details>
        </div>
        <div class="ptiles" data-testid="ai-provider-tiles">
          ${Object.keys(Qa).map(r=>{const a=e[r]??{ic:"🤖",tag:""};return s`
              <button
                type="button"
                class="ptile ${r===t?"on":""}"
                data-provider-tile=${r}
                @click=${()=>{this.selectedProvider=r}}
              >
                <span class="pic">${a.ic}</span>
                <b>${Qa[r].label}</b>
                <i>${a.tag}</i>
              </button>
            `})}
        </div>
        ${this.renderProviderDetail(t)}
      </section>
    `}};kt.styles=z`
    ${Jo}

    :host {
      display: block;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }
    .card {
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: 10px;
      padding: 12px;
      background: var(--card-bg, transparent);
    }
    .card h3 { margin: 0 0 6px; font-size: 14px; }
    .card ol { padding-left: 18px; margin: 6px 0; }
    .card li { font-size: 12px; line-height: 1.45; margin-bottom: 3px; }
    .tier { font-size: 11px; opacity: 0.75; margin-top: 6px; }
    .disclosure {
      font-size: 11px;
      line-height: 1.4;
      opacity: 0.85;
      margin-top: 8px;
      padding: 6px 8px;
      border-left: 2px solid var(--divider-color, rgba(255, 255, 255, 0.25));
    }
    .paste {
      width: 100%;
      box-sizing: border-box;
      margin-top: 6px;
    }
    .verify {
      margin-top: 6px;
      font-size: 12px;
    }
    .skippable-badge {
      font-size: 10px;
      font-style: italic;
      opacity: 0.7;
      margin-left: 6px;
    }
  `;ie([m({attribute:!1})],kt.prototype,"inverterSn",2);ie([m({attribute:!1})],kt.prototype,"onboardingState",2);ie([m({attribute:!1})],kt.prototype,"hass",2);ie([S()],kt.prototype,"state",2);ie([S()],kt.prototype,"verifying",2);ie([S()],kt.prototype,"lastVerify",2);ie([S()],kt.prototype,"selectedProvider",2);kt=ie([E("oig-onboarding-step-ai")],kt);const $y=["welcome","modules","ai","solar","pricing_distribution","pricing_supplier","pricing_supplier_sell","battery","boiler","connection","summary"],Za={welcome:"Vítejte",modules:"Moduly",ai:"AI",solar:"Solár",pricing_distribution:"Distribuce",pricing_supplier:"Nákup",pricing_supplier_sell:"Prodej",battery:"Baterie",boiler:"Bojler",connection:"Připojení",summary:"Shrnutí"},ky={welcome:"Úvod do průvodce nastavením",modules:"Které části wizardu chcete projít",ai:"Volitelný AI asistent pro doporučení",solar:"Předpověď výroby vaší fotovoltaiky",pricing_distribution:"Sazba a poplatky vašeho distributora",pricing_supplier:"Nákupní cena od dodavatele elektřiny",pricing_supplier_sell:"Prodejní (výkupní) cena do sítě",battery:"Jak agresivně má systém pracovat s cenou",boiler:"Nastavení ohřevu vody",connection:"Připojení k OIG Cloud a Home Assistantu",summary:"Kontrola a dokončení nastavení"},Me={welcome:"var(--c-welcome)",modules:"var(--c-mod)",ai:"var(--c-ai)",solar:"var(--c-solar)",pricing_distribution:"var(--c-price)",pricing_supplier:"var(--c-price)",pricing_supplier_sell:"var(--c-price)",battery:"var(--c-batt)",boiler:"var(--c-boiler)",connection:"var(--c-conn)",summary:"var(--c-sum)"},El={welcome:"👋",modules:"🧩",ai:"🤖",solar:"☀️",pricing_distribution:"🏭",pricing_supplier:"🛒",pricing_supplier_sell:"📤",battery:"🔋",boiler:"🔥",connection:"📡",summary:"📋"},Cy={welcome:!1,modules:!1,ai:Wv.skippable,solar:Wi.skippable,pricing_distribution:hi.skippable,pricing_supplier:Xa.skippable,pricing_supplier_sell:Ja.skippable,battery:Nr.skippable,boiler:Rr.skippable,connection:en.skippable,summary:!1},Ir={modules:"A",ai:"A",solar:"A",pricing_distribution:"A",boiler:"A",connection:"A",pricing_supplier:"B",pricing_supplier_sell:"B",battery:"B"},Il={A:"Nastavuje se jednou",B:"Mění se v čase"},Sy={ai:"",solar:"enable_solar_forecast",pricing_distribution:"enable_pricing",pricing_supplier:"enable_pricing",pricing_supplier_sell:"enable_pricing",battery:"enable_battery_prediction",boiler:"enable_boiler"},qa={enable_battery_prediction:["enable_solar_forecast","enable_extended_sensors"]},My={enable_battery_prediction:["enable_pricing"],enable_boiler:["enable_pricing","enable_battery_prediction"]},Fl=["enable_solar_forecast","enable_pricing","enable_battery_prediction","enable_boiler"],Bl=["enable_statistics","enable_extended_sensors","enable_chmu_warnings"],Ay=["spot_pricing_model","spot_positive_fee_percent","spot_negative_fee_percent","spot_fixed_fee_mwh","fixed_commercial_price_vt","fixed_commercial_price_nt","export_pricing_model","export_fee_percent","export_fixed_fee_czk","export_fixed_price","distribution_fee_vt_kwh","distribution_fee_nt_kwh","vat_rate","tariff_vt_start_weekday","tariff_nt_start_weekday","tariff_weekend_same_as_weekday","tariff_vt_start_weekend","tariff_nt_start_weekend","dual_tariff_enabled"],Ly={pending:"čeká",done:"hotovo",skipped:"přeskočeno"},Ty={solar_forecast_provider:"provider"},Py=new Set(["provider","solar_forecast_api_key","solcast_api_key","solcast_site_id","solar_forecast_latitude","solar_forecast_longitude","solar_forecast_string1_enabled","solar_forecast_string1_kwp","solar_forecast_string1_declination","solar_forecast_string1_azimuth","solar_forecast_string2_enabled","solar_forecast_string2_kwp","solar_forecast_string2_declination","solar_forecast_string2_azimuth"]),Hy={timeout:"onboarding.solar_test.error.timeout",auth:"onboarding.solar_test.error.auth",provider_unreachable:"onboarding.solar_test.error.provider_unreachable",rate_limited:"onboarding.solar_test.error.rate_limited",invalid_response:"onboarding.solar_test.error.invalid_response",aborted:"onboarding.solar_test.error.aborted"};function Vy(e,t){const i=Hy[e];return i?R(i,t):void 0}function zy(e){const t={};for(const i of Object.values(e))if(i)for(const[r,a]of Object.entries(i))t[r]=a;return t}function jl(e){return typeof e=="boolean"?e?"Zapnuto":"Vypnuto":e==null||e===""?"—":String(e)}function Nl(e,t,i){const r=is(e,t,i);return r?dc(r):!e&&!t?"—":`VT ${e||"—"} / NT ${t||"—"}`}let le=class extends O{constructor(){super(...arguments),this.open=!1,this.inverterSn="",this.hass=null,this.currentStep="welcome",this.modulesDraft={enable_solar_forecast:!0,enable_pricing:!0,enable_battery_prediction:!0,enable_boiler:!0},this._pendingPrereqOff=null,this.onboardingState=null,this.pricing=null,this.pricingLoading=!1,this.pricingLoadFailed=!1,this.finishing=!1,this.finishError=null,this._onboardingStateLoadedFor=null,this.postSaveReloading=!1,this._pendingDiscardDrafts=!1,this._pricingConfigLoaded=!1,this.pricingDraft={},this.connectionDraft={},this.boilerDraft={},this.isDualTariff=!1,this.tariffMatrixOverride={},this.tariffMatrixError={},this.showVatOverride=!1,this.revealedSecretKeys=new Set,this._dragGroup=null,this._dragPaint=null,this.originalValues={},this._registry=null,this._registryLoaded=!1,this.solarDraft={},this.batteryDraft={},this.solarTestLoading=!1,this.solarTestResult=null,this.solarTestError=null,this.solarTestMatchesDraft=!1,this._bootstrapController=null,this._bootstrapAbortTimer=null,this._bootstrapDeadlineTimer=null,this._onboardingStateOutcome="pending",this._registryOutcome="pending",this._pricingOutcome="pending",this._pricingConfigOutcome="pending",this.aiState=null,this.aiValidation={kind:"idle"},this.bootstrapRetry={onboardingState:!1,registry:!1,pricing:!1,pricingConfig:!1},this.endMatrixDrag=()=>{this._dragGroup=null,this._dragPaint=null}}get wizardLang(){return Ln(this.hass)}revealSecret(e){this.revealedSecretKeys.has(e)||(this.revealedSecretKeys=new Set(this.revealedSecretKeys).add(e))}async refreshOnboardingState(e=!1,t){if(this.inverterSn&&!(!e&&this._onboardingStateLoadedFor===this.inverterSn)){this._onboardingStateLoadedFor=this.inverterSn;try{this.onboardingState=await No(this.inverterSn,t),this._onboardingStateOutcome=t!=null&&t.aborted?"aborted":this.onboardingState!==null?"success":"failed"}catch{this._onboardingStateOutcome=t!=null&&t.aborted?"aborted":"failed"}finally{this._onboardingStateOutcome==="success"&&this.bootstrapRetry.onboardingState&&(this.bootstrapRetry={...this.bootstrapRetry,onboardingState:!1})}}}completeCurrentStepIfNeeded(){if(this.inverterSn&&!(this.currentStep==="solar"&&!this.solarTestMatchesDraft))return this.persistCurrentStep()}async persistCurrentStep(){try{const e=await N1(this.inverterSn,this.currentStep);e&&(this.onboardingState=e),this.dispatchEvent(new CustomEvent("onboarding-changed",{bubbles:!0,composed:!0}))}catch{}}finishErrorMessage(e,t){return e==="finish_in_progress"?R("onboarding.finish.error.in_progress",this.wizardLang):e==="finish_save_failed"?R("onboarding.finish.error.save_failed",this.wizardLang):e==="reload_timeout"?R("onboarding.finish.error.reload_timeout",this.wizardLang):t||R("onboarding.finish.error.generic",this.wizardLang)}saveSectionForKey(e,t){var i,r;switch((r=(i=this._registry)==null?void 0:i.fields[e])==null?void 0:r.section){case"basic":case"modules":case"battery":case"solar":case"boiler":case"pricing":case"pricing_supplier":return this._registry.fields[e].section;default:return t}}stepForFieldKey(e){if(!this._registry)return null;const t=this._registry,i=[["modules",We(t,"modules")],["solar",Wi.fields(t)],["pricing_distribution",hi.fields(t)],["pricing_supplier",Xa.fields(t)],["pricing_supplier_sell",Ja.fields(t)],["battery",Nr.fields(t)],["boiler",Rr.fields(t)],["connection",en.fields(t)]];for(const[r,a]of i)if(a.some(n=>n.key===e))return r;return null}async saveAllChangedSections(){var a,n,o,l;const e=[],t=new Map,i=(c,p)=>{for(const[u,h]of Object.entries(p)){if(String(this.originalValues[u])===String(h))continue;const g=this.saveSectionForKey(u,c),v=t.get(g)??{};v[u]=h,t.set(g,v)}};i("solar",this.solarDraft),i("pricing",this.pricingDraft),(a=this._registry)!=null&&a.sections.includes("modules")&&i("modules",this.modulesDraft),(n=this._registry)!=null&&n.sections.includes("battery")&&i("battery",this.batteryDraft),(o=this._registry)!=null&&o.sections.includes("basic")&&i("basic",this.connectionDraft),(l=this._registry)!=null&&l.sections.includes("boiler")&&i("boiler",this.boilerDraft);const r=["solar","pricing","pricing_supplier","modules","battery","basic","boiler"];for(const c of r){const p=t.get(c);if(!p||Object.keys(p).length===0)continue;const u=await vd(c,p);if(!u.ok&&u.fields)for(const[h,g]of Object.entries(u.fields))e.push({step:this.stepForFieldKey(h)??this.currentStep,key:h,message:g})}return e}async runPostSaveReload(){this.postSaveReloading=!0;let e=!1;if(await new Promise(t=>{md(()=>{e=!0,t()},()=>{e=!1,t()})}),!e){this.postSaveReloading=!1,this.finishError=this.finishErrorMessage("reload_timeout");return}this.reloadPanel()}reloadPanel(){window.location.reload()}async sendFinishRequest(){const e=await this.saveAllChangedSections();if(e.length>0){this.finishError=e.map(i=>`${i.key}: ${i.message}`).join(", "),this.currentStep=e[0].step;return}const t=await J.fetchOIGAPITyped(`/${this.inverterSn}/onboarding`,{method:"POST",body:JSON.stringify({action:"finish"})});if(!t.ok){this.finishError=this.finishErrorMessage(t.code,t.error);return}t.data&&(this.onboardingState=t.data),this.dispatchEvent(new CustomEvent("onboarding-changed",{bubbles:!0,composed:!0})),await this.runPostSaveReload()}async finish(){if(!this.inverterSn){this.close();return}if(!this.finishing){this.finishing=!0,this.finishError=null;try{await this.sendFinishRequest()}finally{this.finishing=!1}}}visibleWizardSteps(){return $y.filter(e=>{const t=Sy[e];return!t||!!this.modulesDraft[t]})}async advanceFromCurrentStep(){const e=this.visibleWizardSteps(),t=e.indexOf(this.currentStep);if(!(t<0)){if(t>=e.length-1){await this.finish();return}this.finishError=null,this.currentStep=e[t+1]}}async goNext(){const e=this.visibleWizardSteps(),t=e.indexOf(this.currentStep);if(t<0)return;if(t>=e.length-1){if(this.finishing)return;this.finishing=!0,this.finishError=null;try{const r=this.completeCurrentStepIfNeeded();r&&await r,this.inverterSn?await this.sendFinishRequest():this.close()}finally{this.finishing=!1}return}const i=this.completeCurrentStepIfNeeded();i&&await i,this.finishError=null,this.currentStep=e[t+1]}goPrev(){const e=this.visibleWizardSteps(),t=e.indexOf(this.currentStep);t<=0||(this.currentStep=e[t-1])}async skip(){if(this.inverterSn)try{const e=await R1(this.inverterSn,this.currentStep);e&&(this.onboardingState=e),this.dispatchEvent(new CustomEvent("onboarding-changed",{bubbles:!0,composed:!0}))}catch{}await this.advanceFromCurrentStep()}close(){this.open=!1,this.stopBootstrap(),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}seedSolarDraft(){if(!this._registry)return;const e={};for(const t of Wi.fields(this._registry)){const i=this._registry.fields[t.key],r=this.originalValues[t.key]??(i==null?void 0:i.default);r!==void 0&&(e[t.key]=r)}this.solarDraft=e}seedBatteryDraft(){if(!this._registry)return;const e={};for(const t of Nr.fields(this._registry)){const i=this._registry.fields[t.key],r=this.originalValues[t.key]??(i==null?void 0:i.default);r!==void 0&&(e[t.key]=r)}this.batteryDraft=e}seedModulesDraft(){if(!this._registry||!this._registry.sections.includes("modules"))return;const e={};for(const t of[...Fl,...Bl]){const i=this._registry.fields[t],r=this.originalValues[t]??(i==null?void 0:i.default);r!==void 0&&(e[t]=r)}for(const[t,i]of Object.entries(qa))e[t]===!0&&i.some(r=>e[r]!==!0)&&(e[t]=!1);this.modulesDraft=e}seedConnectionDraft(){if(!this._registry)return;const e={};for(const t of en.fields(this._registry)){const i=this._registry.fields[t.key],r=this.originalValues[t.key]??(i==null?void 0:i.default);r!==void 0&&(e[t.key]=r)}this.connectionDraft=e}boilerCurrentValues(){if(!this._registry)return{};const e={};for(const t of Rr.fields(this._registry)){const i=this._registry.fields[t.key],r=this.boilerDraft[t.key]??this.originalValues[t.key]??(i==null?void 0:i.default);r!==void 0&&(e[t.key]=r)}return e}openBoilerSimulator(){this.dispatchEvent(new CustomEvent("oig-simulator-open",{bubbles:!0,composed:!0,detail:{domain:"boiler",box:this.inverterSn,draft:this.boilerCurrentValues()}}))}resetAllDraftsToOriginal(){this.seedSolarDraft(),this.seedBatteryDraft(),this.seedModulesDraft(),this.seedConnectionDraft();const e={};for(const t of Object.keys(this.pricingDraft))e[t]=this.originalValues[t];this.pricingDraft=e,this.boilerDraft={},this.tariffMatrixOverride={},this.tariffMatrixError={}}requestDiscardDrafts(){this._pendingDiscardDrafts=!0}cancelDiscardDrafts(){this._pendingDiscardDrafts=!1}confirmDiscardDrafts(){this._pendingDiscardDrafts=!1,this.resetAllDraftsToOriginal()}async loadSolarRegistry(e){if(!this._registryLoaded){this._registryLoaded=!0;try{this._registry=await ac(e),this._registryOutcome=e!=null&&e.aborted?"aborted":this._registry!==null?"success":"failed",this.seedSolarDraft(),this.seedBatteryDraft(),this.seedModulesDraft(),this.seedConnectionDraft()}catch{this._registry=null,this._registryOutcome=e!=null&&e.aborted?"aborted":"failed"}finally{this._registryOutcome==="success"&&this.bootstrapRetry.registry&&(this.bootstrapRetry={...this.bootstrapRetry,registry:!1})}}}async loadPricingConfig(e){if(!(this._pricingConfigLoaded||!this.inverterSn)){this._pricingConfigLoaded=!0;try{const t=await J.fetchOIGAPI(`/${this.inverterSn}/module_config`,{signal:e});this._pricingConfigOutcome=e!=null&&e.aborted?"aborted":t!==null?"success":"failed",t&&(this.originalValues=Object.freeze(zy(t)),(t.pricing||t.pricing_supplier)&&(this.pricingDraft={...t.pricing,...t.pricing_supplier},t.pricing&&(this.isDualTariff=vo(this.pricingDraft.confirmed_distribution_tariff))),this.seedSolarDraft(),this.seedBatteryDraft(),this.seedModulesDraft(),this.seedConnectionDraft())}catch{this._pricingConfigOutcome=e!=null&&e.aborted?"aborted":"failed"}finally{this._pricingConfigOutcome==="success"&&this.bootstrapRetry.pricingConfig&&(this.bootstrapRetry={...this.bootstrapRetry,pricingConfig:!1})}}}startBootstrap(){this.stopBootstrap();const e=new AbortController;this._bootstrapController=e,this._onboardingStateLoadedFor=null,this._onboardingStateOutcome="pending",this._registryLoaded=!1,this._registry=null,this._registryOutcome="pending",this._pricingConfigLoaded=!1,this._pricingConfigOutcome="pending",this._pricingOutcome="pending",this.aiState=null,this.aiValidation={kind:"idle"},this.originalValues={},this.pricing=null,this.pricingLoadFailed=!1,this._pendingPrereqOff=null,this.bootstrapRetry={onboardingState:!1,registry:!1,pricing:!1,pricingConfig:!1},this._bootstrapAbortTimer=setTimeout(()=>{this._bootstrapController===e&&e.abort()},3e3),this._bootstrapDeadlineTimer=setTimeout(()=>{this._bootstrapController===e&&(this.bootstrapRetry={onboardingState:this._onboardingStateOutcome!=="success",registry:this._registryOutcome!=="success",pricing:this._pricingOutcome!=="success",pricingConfig:this._pricingConfigOutcome!=="success"})},5e3),this.refreshOnboardingState(!0,e.signal),this.refreshPricing(e.signal),this.loadSolarRegistry(e.signal),this.loadPricingConfig(e.signal),this.refreshAiState(e.signal)}stopBootstrap(){var e;this._bootstrapAbortTimer!==null&&(clearTimeout(this._bootstrapAbortTimer),this._bootstrapAbortTimer=null),this._bootstrapDeadlineTimer!==null&&(clearTimeout(this._bootstrapDeadlineTimer),this._bootstrapDeadlineTimer=null),(e=this._bootstrapController)==null||e.abort()}retrySolarBootstrap(){this.bootstrapRetry={...this.bootstrapRetry,registry:!1},this._registryLoaded=!1,this.loadSolarRegistry()}retryPricingBootstrap(){this.bootstrapRetry={...this.bootstrapRetry,registry:!1,pricing:!1,pricingConfig:!1},this._registryLoaded=!1,this._pricingConfigLoaded=!1,this.pricingLoadFailed=!1,this.loadSolarRegistry(),this.refreshPricing(),this.loadPricingConfig()}retryOnboardingStateBootstrap(){this.bootstrapRetry={...this.bootstrapRetry,onboardingState:!1},this._onboardingStateLoadedFor=null,this.refreshOnboardingState(!0)}connectedCallback(){super.connectedCallback(),window.addEventListener("mouseup",this.endMatrixDrag)}disconnectedCallback(){super.disconnectedCallback(),this.stopBootstrap(),window.removeEventListener("mouseup",this.endMatrixDrag)}renderSolarProviderGuide(){const e=String(this.solarDraft.solar_forecast_provider??""),t=Zv[e];return t?s`
      <details class="inline" data-testid="solar-provider-guide" data-provider=${e}>
        <summary>${t.label} — jak získat přístup</summary>
        <div class="provider-guide-links">
          <a href=${t.registerUrl} target="_blank" rel="noopener">Registrace</a>
          ${t.keysUrl&&t.keysUrl!==t.registerUrl?s`<a href=${t.keysUrl} target="_blank" rel="noopener">Správa klíčů</a>`:x}
        </div>
        <ol>${t.steps.map(i=>s`<li>${i}</li>`)}</ol>
        ${t.siteIdSteps?s`
              <details class="inline">
                <summary>Jak najít Site ID</summary>
                <ol>${t.siteIdSteps.map(i=>s`<li>${i}</li>`)}</ol>
              </details>
            `:x}
      </details>
    `:x}buildSolarTestBody(){const e={};if(!this._registry)return e;const t=Wi.visibleFields(this._registry,this.solarDraft);for(const i of t){const r=Ty[i.key]??i.key;Py.has(r)&&(e[r]=this.solarDraft[i.key])}return e}async runSolarTest(){if(!this.inverterSn||this.solarTestLoading)return;this.solarTestLoading=!0,this.solarTestResult=null,this.solarTestError=null;const e=await J.fetchOIGAPITyped(`/${this.inverterSn}/solar_test`,{method:"POST",body:JSON.stringify(this.buildSolarTestBody())});this.solarTestLoading=!1,e.ok?(this.solarTestResult=e.data,this.solarTestMatchesDraft=!0):(this.solarTestError={code:e.code,message:Vy(e.code,this.wizardLang)??e.error??R("onboarding.solar_test.error.generic",this.wizardLang)},this.solarTestMatchesDraft=!1)}updated(e){super.updated(e),(e.has("open")||e.has("inverterSn"))&&this.open&&this.inverterSn&&this.startBootstrap()}async refreshPricing(e){if(!(!this.inverterSn||this.pricingLoading)){this.pricingLoading=!0,this.pricingLoadFailed=!1;try{this.pricing=await J.fetchOIGAPI(`/${this.inverterSn}/pricelists`,{signal:e}),this._pricingOutcome=e!=null&&e.aborted?"aborted":this.pricing!==null?"success":"failed"}catch{this.pricing=null,this.pricingLoadFailed=!0,this._pricingOutcome=e!=null&&e.aborted?"aborted":"failed"}finally{this.pricingLoading=!1,this._pricingOutcome==="success"&&this.bootstrapRetry.pricing&&(this.bootstrapRetry={...this.bootstrapRetry,pricing:!1})}}}async refreshAiState(e){if(this.inverterSn)try{this.aiState=await hc(this.inverterSn,e)}catch{this.aiState=null}}async validateAiConfig(){var t,i,r;if(!this.inverterSn||((t=this.aiState)==null?void 0:t.status)!=="verified"||this.aiValidation.kind==="loading")return;this.aiValidation={kind:"loading"};const e=await J.fetchOIGAPITyped(`/${this.inverterSn}/ai/validate_config`,{method:"POST"});if(!e.ok){this.aiValidation={kind:"error",code:e.code};return}if((i=e.data)!=null&&i.ok){this.aiValidation={kind:"success",findings:e.data.findings??[]};return}this.aiValidation={kind:"error",code:((r=e.data)==null?void 0:r.code)??"error"}}jumpTo(e){this.currentStep=e}currentIndex(){return this.visibleWizardSteps().indexOf(this.currentStep)}showRecoveredPricingNote(){var e;return!!this.modulesDraft.enable_pricing&&((e=this.onboardingState)==null?void 0:e.grandfathered)===!0&&Object.keys(this.originalValues).some(t=>Ay.includes(t))}turnedOffModuleKeys(){var e;return((e=this.onboardingState)==null?void 0:e.grandfathered)!==!0?[]:Object.keys(this.modulesDraft).filter(t=>this.originalValues[t]===!0&&this.modulesDraft[t]===!1)}moduleIsOn(e){return this.modulesDraft[e]===!0}moduleDepState(e){const t=(qa[e]??[]).filter(r=>!this.moduleIsOn(r)),i=(My[e]??[]).filter(r=>!this.moduleIsOn(r));return{hardMissing:t,softMissing:i}}activeHardDependents(e){return Object.keys(qa).filter(t=>this.moduleIsOn(t)&&qa[t].includes(e))}onModuleToggle(e,t){if(t===!1){const i=this.activeHardDependents(e);if(i.length>0){this._pendingPrereqOff={prereq:e,dependents:i};return}}this.modulesDraft={...this.modulesDraft,[e]:t}}enableModulePrereqs(e){const{hardMissing:t}=this.moduleDepState(e);if(t.length===0)return;const i={...this.modulesDraft};for(const r of t)i[r]=!0;this.modulesDraft=i}confirmPrereqOff(){const e=this._pendingPrereqOff;if(!e)return;const t={...this.modulesDraft,[e.prereq]:!1};for(const i of e.dependents)t[i]=!1;this.modulesDraft=t,this._pendingPrereqOff=null}cancelPrereqOff(){this._pendingPrereqOff=null}allDraftValues(){var t;const e=(t=this._registry)!=null&&t.sections.includes("modules")?this.modulesDraft:{};return{...this.solarDraft,...this.pricingDraft,...this.batteryDraft,...this.boilerDraft,...this.connectionDraft,...e}}summaryDiffRows(){const e=this.allDraftValues(),t=new Set(Do),i=Object.entries(e).filter(([r,a])=>!t.has(r)&&String(this.originalValues[r])!==String(a)).map(([r,a])=>({key:r,oldValue:this.originalValues[r],newValue:a}));for(const r of["weekday","weekend"]){const a=`tariff_vt_start_${r}`,n=`tariff_nt_start_${r}`,o=r==="weekend",l=String(this.originalValues[a]??""),c=String(this.originalValues[n]??""),p=String(e[a]??""),u=String(e[n]??"");l===p&&c===u||i.push({key:`tariff_schedule_${r}`,oldValue:Nl(l,c,o),newValue:Nl(p,u,o)})}return i}renderDistributorIconSlot(){const e=this.pricingDraft.confirmed_distribution_distributor,t=e?Yv[e]:void 0;return s`
      <span class="distributor-icon" data-testid="distributor-icon">
        ${t?s`<img src=${t} alt="" width="18" height="18" />`:x}
      </span>`}applyDistributionFeeSuggestion(){var n,o,l;if(!this._registry)return;const e=this.pricingDraft.confirmed_distribution_distributor,t=this.pricingDraft.confirmed_distribution_tariff;if(!e||!t)return;const i=(l=(o=(n=this.pricing)==null?void 0:n.distributors)==null?void 0:o[e])==null?void 0:l[t];if(!i)return;const r=(c,p)=>{var v;if(!p)return null;const u=this.pricingDraft[c],h=(v=this._registry.fields[c])==null?void 0:v.default;return u===void 0||u===h?[c,Math.round(p.price_excl_vat/1e3*100)/100]:null},a=[r("distribution_fee_vt_kwh",i.vt),r("distribution_fee_nt_kwh",i.nt)].filter(c=>c!==null);a.length!==0&&(this.pricingDraft={...this.pricingDraft,...Object.fromEntries(a)})}renderDistributionPriceBlock(e,t,i,r,a){var l;const n=1+a/100,o=(c,p)=>{const u=this.pricingDraft[c.key],h=u==null||u===""?null:Number(u),g=h==null?null:Math.round(h*n*100)/100;return s`
        <div class="price-cell pcard" data-testid=${p}>
          <span class="lab">${c.label}</span>
          <input
            type="number" step="0.01" min="0"
            data-testid="${p}-input"
            .value=${h==null?"":String(h)}
            @change=${v=>{const f=v.target.value;this.pricingDraft={...this.pricingDraft,[c.key]:f===""?null:Number(f)}}}
          />
          <span class="hint" data-testid="${p}-incl-vat">
            ${g==null?x:s`s DPH ${a} %: ${g.toFixed(2)} Kč/kWh`}
          </span>
        </div>`};return s`
      <div class="row distribution-price-pair" data-testid="distribution-price-pair">
        ${o(t,"distribution-fee-vt")}
        ${e&&i?o(i,"distribution-fee-nt"):x}
      </div>
      ${r?s`
            <button
              type="button" class="link-button" data-testid="vat-rate-toggle"
              @click=${()=>{this.showVatOverride=!this.showVatOverride}}
            >${this.showVatOverride?"Skrýt DPH":"Upravit DPH"}</button>
            ${this.showVatOverride?s`<div data-key=${Et}>
                  ${Lt(r,{value:this.pricingDraft[Et],dirty:!1,secretSet:!1,originalValue:this.originalValues[Et],reviewMode:((l=this.onboardingState)==null?void 0:l.grandfathered)===!0,onChange:c=>{this.pricingDraft={...this.pricingDraft,[Et]:c}},entityCatalog:[]})}
                </div>`:x}
          `:x}
    `}matrixKeysFor(e){return e==="weekday"?{vt:"tariff_vt_start_weekday",nt:"tariff_nt_start_weekday",allowSingleTariff:!1}:{vt:"tariff_vt_start_weekend",nt:"tariff_nt_start_weekend",allowSingleTariff:!0}}matrixGridFor(e){const t=this.tariffMatrixOverride[e];if(t)return t;const{vt:i,nt:r,allowSingleTariff:a}=this.matrixKeysFor(e);return is(String(this.pricingDraft[i]??""),String(this.pricingDraft[r]??""),a)??Array(24).fill("VT")}commitMatrixGrid(e,t){const{vt:i,nt:r,allowSingleTariff:a}=this.matrixKeysFor(e),n=ty(t,a);if(!n){this.tariffMatrixOverride={...this.tariffMatrixOverride,[e]:t},this.tariffMatrixError={...this.tariffMatrixError,[e]:"Tento vzor zatím neumíme uložit - intervaly musí být souvislé bloky NT/VT"};return}const o={...this.tariffMatrixOverride};delete o[e];const l={...this.tariffMatrixError};delete l[e],this.tariffMatrixOverride=o,this.tariffMatrixError=l,this.pricingDraft={...this.pricingDraft,[i]:n.vt,[r]:n.nt}}paintMatrixCell(e,t,i){const r=this.matrixGridFor(e);if(r[t]===i)return;const a=[...r];a[t]=i,this.commitMatrixGrid(e,a)}beginMatrixPaint(e,t){const r=this.matrixGridFor(e)[t]==="NT"?"VT":"NT";this._dragGroup=e,this._dragPaint=r,this.paintMatrixCell(e,t,r)}continueMatrixPaint(e,t){this._dragGroup!==e||!this._dragPaint||this.paintMatrixCell(e,t,this._dragPaint)}renderMatrixHourLabels(){return s`
      <div class="tariff-matrix-hours" aria-hidden="true">
        ${Array.from({length:24},(e,t)=>s`<i>${t%6===0||t===23?t:""}</i>`)}
      </div>`}renderTariffMatrix(){return s`
      <div class="tariff-matrix" data-testid="tariff-matrix">
        <div class="tariff-matrix-legend">
          <span class="legend-swatch vt"></span> VT
          <span class="legend-swatch nt"></span> NT
        </div>
        ${[{id:"weekday",label:"Pracovní dny (Po–Pá)"},{id:"weekend",label:"Víkend (So–Ne)"}].map(({id:t,label:i})=>{const r=this.matrixGridFor(t),a=this.tariffMatrixError[t];return s`
            <div class="tariff-matrix-row" data-testid="tariff-matrix-row-${t}">
              <div class="tariff-matrix-row-label">${i}</div>
              ${this.renderMatrixHourLabels()}
              <div class="tariff-matrix-cells" data-testid="tariff-matrix-cells-${t}">
                ${r.map((n,o)=>s`
                  <button
                    type="button"
                    class="tariff-cell ${n==="NT"?"nt":"vt"}"
                    data-testid="tariff-cell-${t}-${o}"
                    title="${String(o).padStart(2,"0")}:00"
                    @mousedown=${l=>{l.preventDefault(),this.beginMatrixPaint(t,o)}}
                    @mouseenter=${l=>{l.buttons===1&&this.continueMatrixPaint(t,o)}}
                  ></button>
                `)}
              </div>
              <p class="tariff-matrix-summary" data-testid="tariff-matrix-summary-${t}">
                ${dc(r)}
              </p>
              ${a?s`<p class="tariff-matrix-error" data-testid="tariff-matrix-error-${t}">${a}</p>`:x}
            </div>
          `})}
      </div>`}hasBlockingTariffMatrixError(){return this.currentStep==="pricing_distribution"&&(this.tariffMatrixError.weekday!==void 0||this.tariffMatrixError.weekend!==void 0)}renderInclVatLine(e){const t=Number(this.pricingDraft[e]??0),i=Number(this.pricingDraft.vat_rate??21),r=dy(t,i);return s`
      <div class="row" data-testid=${`incl-vat-${e}`}>
        <span class="lab">Cena s DPH</span>
        <div class="row-control">${r.toFixed(2)} Kč/kWh</div>
      </div>
    `}renderScenarioFields(e,t){const i=new Map(e.map(l=>[l.key,l])),r=l=>{var c;return s`
      <div class="pcard" data-key=${l.key}>
        ${Lt(l,{value:this.pricingDraft[l.key],dirty:!1,secretSet:!1,originalValue:this.originalValues[l.key],reviewMode:((c=this.onboardingState)==null?void 0:c.grandfathered)===!0,onChange:p=>{this.pricingDraft={...this.pricingDraft,[l.key]:p}},entityCatalog:[]})}
        ${l.key==="fixed_commercial_price_vt"||l.key==="fixed_commercial_price_nt"?this.renderInclVatLine(l.key):x}
      </div>
    `},a=l=>l==="fixed_commercial_price_vt"?"fixed_commercial_price_nt":`${l}_nt`,n=new Set;e.forEach(l=>{const c=a(l.key);i.has(c)&&n.add(c)});const o=e.flatMap(l=>{if(n.has(l.key))return[];const c=i.get(a(l.key));if(c){const p=l.key==="fixed_commercial_price_vt"?"fixed-price-vt-nt-row":`${l.key.replace(/_/g,"-")}-vt-nt-row`;return[s`<div class="vt-nt-row" data-testid=${p}>${r(l)}${r(c)}</div>`]}return[r(l)]});return s`<div class="scenario-fields" data-testid=${t}>${o}</div>`}renderStepHead(e){return s`
      <div class="step-head">
        <div class="step-head-icon" aria-hidden="true">${El[e]}</div>
        <div>
          <h3>${Za[e]}</h3>
          <p class="step-head-sub">${ky[e]}</p>
        </div>
      </div>`}renderStepContent(){var e,t,i,r,a,n,o;if(this.currentStep==="welcome"){const l=((e=this.onboardingState)==null?void 0:e.grandfathered)===!0;return s`
        <section class="step step-welcome" data-step="welcome" style=${`--sc:${Me.welcome}`}>
          ${this.renderStepHead("welcome")}
          <div class="step-card">
            <div class="oneliner">
              ${R(l?"onboarding.welcome.review":"onboarding.welcome.new_install",this.wizardLang)}
            </div>
          </div>
        </section>`}if(this.currentStep==="ai")return s`
        <div class="step step-ai">
          ${Kr({aiState:this.aiState,lang:this.wizardLang})}
          <oig-onboarding-step-ai
            .inverterSn=${this.inverterSn}
            .onboardingState=${this.onboardingState}
            .hass=${this.hass}
          ></oig-onboarding-step-ai>
        </div>
      `;if(this.currentStep==="solar"){if(this.bootstrapRetry.registry)return s`
          <section class="step step-solar" data-step="solar" style=${`--sc:${Me.solar}`}>
            ${this.renderStepHead("solar")}
            <div class="step-card">
              <p data-testid="solar-bootstrap-retry">${R("onboarding.bootstrap.load_failed",this.wizardLang)}</p>
              <button
                type="button"
                data-testid="solar-bootstrap-retry-button"
                @click=${()=>this.retrySolarBootstrap()}
              >${R("onboarding.bootstrap.retry_button",this.wizardLang)}</button>
            </div>
          </section>
        `;if(!this._registry||Wi.fields(this._registry).length===0)return s`
          <section class="step step-solar" data-step="solar" style=${`--sc:${Me.solar}`}>
            ${this.renderStepHead("solar")}
            <div class="step-card">
              <p data-testid="solar-not-available">
                Solární pole nejsou k dispozici.
              </p>
            </div>
          </section>
        `;const l=Wi.visibleFields(this._registry,this.solarDraft),c=!this.solarDraft.solar_forecast_string1_enabled&&!this.solarDraft.solar_forecast_string2_enabled;return s`
        <section class="step step-solar" data-step="solar" style=${`--sc:${Me.solar}`}>
          ${this.renderStepHead("solar")}
          <div class="step-card">
            ${c?s`<p data-testid="solar-all-hidden" class="hint">
                  Povolte alespoň jeden string pro zobrazení polí výkonu a orientace.
                </p>`:x}
            ${l.flatMap(p=>{var h,g,v;const u=Lt(p,{value:this.solarDraft[p.key],dirty:!1,secretSet:!!p.secret&&!!this.originalValues[`${p.key}_set`],originalValue:this.originalValues[p.key],reviewMode:((h=this.onboardingState)==null?void 0:h.grandfathered)===!0,secretRevealed:this.revealedSecretKeys.has(p.key),onRevealSecret:()=>this.revealSecret(p.key),onChange:f=>{this.solarDraft={...this.solarDraft,[p.key]:f},this.solarTestMatchesDraft=!1},entityCatalog:[]});return p.key==="solar_forecast_provider"?[u,this.renderSolarProviderGuide()]:p.key!=="solar_forecast_longitude"?[u]:[u,s`<button
                  type="button"
                  data-testid="solar-gps-from-hass"
                  ?disabled=${!((v=(g=this.hass)==null?void 0:g.config)!=null&&v.latitude)}
                  @click=${()=>{var f,b,$,_;this.solarDraft={...this.solarDraft,solar_forecast_latitude:(b=(f=this.hass)==null?void 0:f.config)==null?void 0:b.latitude,solar_forecast_longitude:(_=($=this.hass)==null?void 0:$.config)==null?void 0:_.longitude},this.solarTestMatchesDraft=!1}}
                >📍 Převzít z Home Assistanta</button>`]})}
            <button
              type="button"
              data-testid="solar-test"
              ?disabled=${this.solarTestLoading}
              @click=${()=>void this.runSolarTest()}
            >${this.solarTestLoading?"Testuji…":"Otestovat"}</button>
            ${this.solarTestResult?s`<p data-testid="solar-test-success">
                  Odhad na zítra: ${this.solarTestResult.tomorrow_total_kwh} kWh
                  ${this.solarTestResult.forecast_covers_tomorrow?x:s` (neúplná předpověď)`}
                </p>`:x}
            ${this.solarTestError?s`<p data-testid="solar-test-error">${this.solarTestError.message}</p>`:x}
          </div>
        </section>
      `}if(this.currentStep==="battery"){if(this.bootstrapRetry.registry)return s`
          <section class="step step-battery" data-step="battery" style=${`--sc:${Me.battery}`}>
            ${this.renderStepHead("battery")}
            <div class="step-card">
              <p data-testid="battery-bootstrap-retry">${R("onboarding.bootstrap.load_failed",this.wizardLang)}</p>
              <button
                type="button"
                data-testid="battery-bootstrap-retry-button"
                @click=${()=>this.retrySolarBootstrap()}
              >${R("onboarding.bootstrap.retry_button",this.wizardLang)}</button>
            </div>
          </section>
        `;if(!this._registry||Nr.fields(this._registry).length===0)return s`
          <section class="step step-battery" data-step="battery" style=${`--sc:${Me.battery}`}>
            ${this.renderStepHead("battery")}
            <div class="step-card">
              <p data-testid="battery-not-available">
                Pole baterie nejsou k dispozici.
              </p>
            </div>
          </section>
        `;const l=Nr.visibleFields(this._registry,this.batteryDraft),c=new Map(l.map(h=>[h.key,h])),p=h=>{const g=hy(this.hass,this.inverterSn,h.attr),v=g==null?R("onboarding.battery.hardware.unavailable",this.wizardLang):`${String(g)} kWh`;return s`
          <div class="battery-chip" data-testid=${h.id}>
            <span class="battery-chip-label">${R(h.labelKey,this.wizardLang)}</span>
            <span class="battery-chip-value">${v}</span>
          </div>
        `},u=()=>{this.dispatchEvent(new CustomEvent("oig-simulator-open",{bubbles:!0,composed:!0,detail:{domain:"battery",box:this.inverterSn,draft:{...this.batteryDraft}}}))};return s`
        <section class="step step-battery" data-step="battery" style=${`--sc:${Me.battery}`}>
          ${this.renderStepHead("battery")}
          <div class="step-card">
            <div class="battery-hardware" data-testid="battery-hardware">
              ${uy.map(p)}
            </div>
            ${py.map(h=>{const g=h.keys.map(b=>c.get(b)).filter(b=>!!b),v=h.id==="nabijeni",f=b=>{var $;return s`
                <div class=${v?"pcard":""} data-key=${b.key}>
                  ${Lt(b,{value:this.batteryDraft[b.key],dirty:!1,secretSet:!!b.secret&&!!this.originalValues[`${b.key}_set`],originalValue:this.originalValues[b.key],reviewMode:(($=this.onboardingState)==null?void 0:$.grandfathered)===!0,secretRevealed:this.revealedSecretKeys.has(b.key),onRevealSecret:()=>this.revealSecret(b.key),onChange:_=>{this.batteryDraft={...this.batteryDraft,[b.key]:_}},entityCatalog:[]})}
                </div>
              `};return s`
              <div class="battery-group" data-group=${h.id}>
                <h4 data-testid="battery-group-heading">${h.heading}</h4>
                ${v?s`<div class="pair">${g.map(f)}</div>`:g.map(f)}
              </div>`})}
            <div class="battery-actions">
              <button
                type="button"
                class="battery-sim-button"
                data-testid="battery-simulator-button"
                @click=${u}
              >${R("onboarding.battery.simulator_button",this.wizardLang)}</button>
            </div>
          </div>
        </section>
      `}if((this.currentStep==="pricing_distribution"||this.currentStep==="pricing_supplier"||this.currentStep==="pricing_supplier_sell")&&(this.bootstrapRetry.registry||this.bootstrapRetry.pricing||this.bootstrapRetry.pricingConfig))return s`
          <section class="step step-stub" data-step=${this.currentStep} style=${`--sc:${Me[this.currentStep]}`}>
            ${this.renderStepHead(this.currentStep)}
            <div class="step-card">
              <p data-testid="pricing-bootstrap-retry">${R("onboarding.bootstrap.load_failed",this.wizardLang)}</p>
              <button
                type="button"
                data-testid="pricing-bootstrap-retry-button"
                @click=${()=>this.retryPricingBootstrap()}
              >${R("onboarding.bootstrap.retry_button",this.wizardLang)}</button>
            </div>
          </section>
        `;if(this.currentStep==="pricing_distribution"){if(!this._registry||hi.fields(this._registry).length===0)return s`
          <section class="step step-pricing-distribution" data-step="pricing_distribution" style=${`--sc:${Me.pricing_distribution}`}>
            ${this.renderStepHead("pricing_distribution")}
            <div class="step-card">
              <p data-testid="pricing-distribution-not-available">Ceny nejsou dostupné.</p>
            </div>
          </section>
        `;const l=this.pricingDraft.confirmed_distribution_tariff,c=vo(l),p=this._registry,u=[...Do,...Qv,Et,"confirmed_distribution_price_incl_vat","confirmed_distribution_price_excl_vat","confirmed_distribution_unit"],h=hi.visibleFields(p,this.pricingDraft).filter(w=>!u.includes(w.key)),g=this.pricingDraft.confirmed_distribution_distributor,v=g&&l?(r=(i=(t=this.pricing)==null?void 0:t.distributors)==null?void 0:i[g])==null?void 0:r[l]:void 0,f=hi.fields(p).find(w=>w.key==="distribution_fee_vt_kwh"),b=hi.fields(p).find(w=>w.key==="distribution_fee_nt_kwh"),$=hi.fields(p).find(w=>w.key===Et),_=Number(this.pricingDraft[Et]??((a=p==null?void 0:p.fields[Et])==null?void 0:a.default)??21);return s`
        <section class="step step-pricing-distribution" data-step="pricing_distribution" style=${`--sc:${Me.pricing_distribution}`}>
          ${this.renderStepHead("pricing_distribution")}
          <div class="step-card">
            ${h.map(w=>{var C;return s`
              <div data-key=${w.key}>
                ${w.key==="confirmed_distribution_distributor"?this.renderDistributorIconSlot():x}
                ${Lt(w,{value:this.pricingDraft[w.key],dirty:!1,secretSet:!!w.secret&&!!this.originalValues[`${w.key}_set`],originalValue:this.originalValues[w.key],reviewMode:((C=this.onboardingState)==null?void 0:C.grandfathered)===!0,secretRevealed:this.revealedSecretKeys.has(w.key),onRevealSecret:()=>this.revealSecret(w.key),onChange:D=>{this.pricingDraft={...this.pricingDraft,[w.key]:D},w.key==="confirmed_distribution_tariff"&&(this.isDualTariff=vo(D)),(w.key==="confirmed_distribution_tariff"||w.key==="confirmed_distribution_distributor")&&this.applyDistributionFeeSuggestion()},entityCatalog:[]})}
                ${w.key==="confirmed_distribution_tariff"?s`
                      ${v!=null&&v.description?s`<p class="hint" data-testid="tariff-description">${v.description}</p>`:x}
                      <details class="inline" data-testid="tariff-invoice-hint">
                        <summary>Jak najít svou sazbu</summary>
                        <p>Svou sazbu najdete na faktuře za elektřinu, obvykle v části „Distribuční sazba" nebo „Sazba".</p>
                      </details>
                    `:x}
              </div>
            `})}
            ${l?s`<p data-testid="tariff-dual-info" class="hint">
                  ${c?"Dvoutarifní — ceny zvlášť pro VT a NT.":"Jednotarifní — jedna cena po celý den."}
                </p>`:x}
            ${l&&f?this.renderDistributionPriceBlock(c,f,b,$,_):x}
            ${c?this.renderTariffMatrix():x}
            ${this.pricingLoadFailed?s`<p data-testid="pricing-stale-warning" class="hint">Ceny nejsou dostupné.</p>`:x}
          </div>
        </section>
      `}if(this.currentStep==="pricing_supplier"){const l=!!this._registry&&Xa.fields(this._registry).length>0,c=l?Xa.visibleFields(this._registry,this.pricingDraft,this.isDualTariff):[],p=this.pricingDraft.spot_pricing_model,u=c.filter(h=>h.key!=="spot_pricing_model");return s`
        <section class="step step-pricing-supplier" data-step="pricing_supplier" style=${`--sc:${Me.pricing_supplier}`}>
          ${this.renderStepHead("pricing_supplier")}
          <div class="step-card">
            ${this.showRecoveredPricingNote()?s`<p data-testid="recovered-pricing-note" class="hint">
                  ${R("onboarding.pricing_supplier.recovered_note",this.wizardLang)}
                </p>`:x}
            <div class="oneliner" data-testid="pricing-supplier-intro">
              Nákupní cena od dodavatele — vyberte scénář dle vaší smlouvy.
            </div>
            ${l?s`
                  ${Dl(ry,p,h=>{this.pricingDraft={...this.pricingDraft,spot_pricing_model:h}},"scenario-cards-buy")}
                  ${p?this.renderScenarioFields(u,"scenario-fields-buy"):x}
                `:s`<p data-testid="pricing-supplier-not-available">Ceny nejsou dostupné.</p>`}
          </div>
        </section>
      `}if(this.currentStep==="pricing_supplier_sell"){const l=!!this._registry&&Ja.fields(this._registry).length>0,c=l?Ja.visibleFields(this._registry,this.pricingDraft,this.isDualTariff):[],p=this.pricingDraft.export_pricing_model,u=c.filter(h=>h.key!=="export_pricing_model");return s`
        <section class="step step-pricing-supplier-sell" data-step="pricing_supplier_sell" style=${`--sc:${Me.pricing_supplier_sell}`}>
          ${this.renderStepHead("pricing_supplier_sell")}
          <div class="step-card">
            <div class="oneliner" data-testid="pricing-supplier-sell-intro">
              Prodejní (výkupní) cena — vyberte scénář dle vaší smlouvy.
            </div>
            ${l?s`
                  ${Dl(oy,p,h=>{this.pricingDraft={...this.pricingDraft,export_pricing_model:h}},"scenario-cards-sell")}
                  ${p?this.renderScenarioFields(u,"scenario-fields-sell"):x}
                `:s`<p data-testid="pricing-supplier-sell-not-available">Ceny nejsou dostupné.</p>`}
          </div>
        </section>
      `}if(this.currentStep==="boiler"){if(!this._registry||Rr.fields(this._registry).length===0)return s`
          <section class="step step-boiler" data-step="boiler" style=${`--sc:${Me.boiler}`}>
            ${this.renderStepHead("boiler")}
            <div class="step-card">
              <p data-testid="boiler-not-available">Pole bojleru nejsou k dispozici.</p>
            </div>
          </section>
        `;const l=this._registry,c=new Map(Rr.fields(l).map(_=>[_.key,_])),p=((n=this.onboardingState)==null?void 0:n.grandfathered)===!0,u=_=>{var w;return s`
        <div data-key=${_.key}>
          ${Lt(_,{value:this.boilerDraft[_.key]??this.originalValues[_.key]??((w=l.fields[_.key])==null?void 0:w.default),dirty:!1,secretSet:!!_.secret&&!!this.originalValues[`${_.key}_set`],originalValue:this.originalValues[_.key],reviewMode:p,secretRevealed:this.revealedSecretKeys.has(_.key),onRevealSecret:()=>this.revealSecret(_.key),onChange:C=>{this.boilerDraft={...this.boilerDraft,[_.key]:C}},entityCatalog:[]})}
        </div>
      `},h=_=>{const w=_.keys.map(C=>c.get(C)).filter(C=>!!C);return w.length===0?x:w.map(u)},g=Oo.find(_=>!_.collapsible),v=Oo.filter(_=>_.collapsible),f=vy(l),b=_=>{const w=_.keys.map(C=>c.get(C)).filter(C=>!!C);return w.length===0?x:s`
          <div class="field-group boiler-core" data-testid="boiler-core">
            <h4>${_.heading}</h4>
            <details class="inline">
              <summary>Příklad</summary>
              <p>${R("onboarding.boiler.core_example",this.wizardLang)}</p>
            </details>
            <button
              type="button"
              class="boiler-simulator-button"
              data-testid="boiler-simulator-button"
              @click=${()=>this.openBoilerSimulator()}
            >
              ${R("onboarding.boiler.simulator_button",this.wizardLang)}
            </button>
            ${w.map(u)}
          </div>
        `},$=_=>_.keys.map(C=>c.get(C)).filter(C=>!!C).length===0?x:s`
          <details class="boiler-expander" data-testid=${`boiler-advanced-${_.id}`}>
            <summary>
              <span class="boiler-expander-title">${_.heading}</span>
              <span class="boiler-expander-copy">
                ${_.summaryKey?R(_.summaryKey,this.wizardLang):""}
              </span>
            </summary>
            <div class="boiler-expander-body">
              ${h(_)}
            </div>
          </details>
        `;return s`
        <section class="step step-boiler" data-step="boiler" style=${`--sc:${Me.boiler}`}>
          ${this.renderStepHead("boiler")}
          <div class="step-card">
            ${g?b(g):x}
            ${v.map($)}
            ${f.length===0?x:s`
              <details class="boiler-expander boiler-expander--other" data-testid="boiler-advanced-other">
                <summary>
                  <span class="boiler-expander-title">Další pokročilé</span>
                  <span class="boiler-expander-copy">Nová pole z registry, která ještě nejsou zařazená.</span>
                </summary>
                <div class="boiler-expander-body">
                  ${f.map(u)}
                </div>
              </details>
            `}
          </div>
        </section>
      `}if(this.currentStep==="modules"){const l=this.turnedOffModuleKeys(),c=this._registry?We(this._registry,"modules"):[],p=new Map(c.map(f=>[f.key,f])),u=Fl.map(f=>p.get(f)).filter(f=>!!f),h=Bl.map(f=>p.get(f)).filter(f=>!!f),g=f=>f.map(b=>{var C;const{hardMissing:$,softMissing:_}=this.moduleDepState(b.key),w=$.length>0;return s`
        <div data-key=${b.key}>
          ${Lt(b,{value:this.modulesDraft[b.key],dirty:!1,disabled:w,secretSet:!!b.secret&&!!this.originalValues[`${b.key}_set`],originalValue:this.originalValues[b.key],reviewMode:((C=this.onboardingState)==null?void 0:C.grandfathered)===!0,secretRevealed:this.revealedSecretKeys.has(b.key),onRevealSecret:()=>this.revealSecret(b.key),onChange:D=>this.onModuleToggle(b.key,D),entityCatalog:[]})}
          ${w?s`<p class="dep-explain dep-hard" data-testid="dep-hard-${b.key}">
                ${R("onboarding.modules.dep_hard_prefix",this.wizardLang)}
                ${$.map(D=>ue(D,`field.${D}.label`)).join(", ")}
                <button type="button" class="dep-enable" data-testid="dep-enable-${b.key}"
                  @click=${()=>this.enableModulePrereqs(b.key)}>
                  ${R("onboarding.modules.dep_enable_btn",this.wizardLang)}
                </button>
              </p>`:x}
          ${!w&&this.moduleIsOn(b.key)&&_.length>0?s`<p class="dep-explain dep-soft" data-testid="dep-soft-${b.key}">
                ${R(`onboarding.modules.dep_soft.${b.key}`,this.wizardLang)}
              </p>`:x}
        </div>
      `}),v=this._pendingPrereqOff;return s`
        <section class="step step-modules" data-step="modules" style=${`--sc:${Me.modules}`}>
          ${this.renderStepHead("modules")}
          <div class="step-card">
            ${v?s`<div class="prereq-confirm" data-testid="prereq-off-confirm" role="alertdialog">
                  <p>${R("onboarding.modules.prereq_off_confirm",this.wizardLang)}</p>
                  <div class="prereq-confirm-actions">
                    <button type="button" data-testid="prereq-off-cancel"
                      @click=${()=>this.cancelPrereqOff()}>
                      ${R("onboarding.modules.prereq_off_cancel",this.wizardLang)}
                    </button>
                    <button type="button" class="danger" data-testid="prereq-off-confirm-yes"
                      @click=${()=>this.confirmPrereqOff()}>
                      ${R("onboarding.modules.prereq_off_confirm_yes",this.wizardLang)}
                    </button>
                  </div>
                </div>`:x}
            ${l.length>0?s`<p data-testid="module-off-warning" class="hint">
                  ${R("onboarding.modules.off_warning",this.wizardLang)}
                </p>`:x}
            ${u.length===0&&h.length===0?s`<p data-testid="modules-not-available">Moduly nejsou k dispozici.</p>`:s`
                  <div class="module-group" data-group="hlavni">
                    <h4>${R("onboarding.modules.group_hlavni",this.wizardLang)}</h4>
                    ${g(u)}
                  </div>
                  <div class="module-group" data-group="doplnkove">
                    <h4>${R("onboarding.modules.group_doplnkove",this.wizardLang)}</h4>
                    ${g(h)}
                  </div>
                `}
          </div>
        </section>
      `}if(this.currentStep==="summary"){if(((o=this.onboardingState)==null?void 0:o.grandfathered)===!0){const p=this.summaryDiffRows();return s`
          <section class="step step-summary" data-step="summary" style=${`--sc:${Me.summary}`}>
            ${this.renderStepHead("summary")}
            <div class="step-card">
              ${p.length===0?s`<p data-testid="summary-diff-empty">${R("onboarding.summary.diff_empty",this.wizardLang)}</p>`:s`
                    <table data-testid="summary-diff-table">
                      <thead><tr><th>Pole</th><th>Bylo</th><th>Nyní</th></tr></thead>
                      <tbody>
                        ${p.map(u=>s`
                          <tr data-testid="summary-diff-row">
                            <td>${ue(u.key,`field.${u.key}.label`)}</td>
                            <td>${jl(u.oldValue)}</td>
                            <td>${jl(u.newValue)}</td>
                          </tr>
                        `)}
                      </tbody>
                    </table>
                  `}
              <p>${R("onboarding.summary.confirm_notice",this.wizardLang)}</p>
              ${Kr({aiState:this.aiState,lang:this.wizardLang,showValidateButton:!0,validationState:this.aiValidation,onValidate:()=>void this.validateAiConfig()})}
            </div>
          </section>
        `}const c=Object.entries(this.modulesDraft).filter(([p,u])=>p.startsWith("enable_")&&u===!0).map(([p])=>ue(p,`field.${p}.label`));return s`
        <section class="step step-summary" data-step="summary" style=${`--sc:${Me.summary}`}>
          ${this.renderStepHead("summary")}
          <div class="step-card">
            <p>${R("onboarding.summary.new_install_heading",this.wizardLang)}</p>
            <ul>
              ${c.map(p=>s`<li>${p}</li>`)}
            </ul>
            ${Kr({aiState:this.aiState,lang:this.wizardLang,showValidateButton:!0,validationState:this.aiValidation,onValidate:()=>void this.validateAiConfig()})}
          </div>
        </section>
      `}if(this.currentStep==="connection"){if(!this._registry)return s`
          <section class="step step-stub" data-step="connection" style=${`--sc:${Me.connection}`}>
            ${this.renderStepHead("connection")}
            <div class="step-card">
              <p data-testid="step-stub-placeholder">
                Tento krok bude doplněn v další verzi průvodce.
              </p>
            </div>
          </section>
        `;const l=en.visibleFields(this._registry,this.connectionDraft);return s`
        <section class="step step-connection" data-step="connection" style=${`--sc:${Me.connection}`}>
          ${this.renderStepHead("connection")}
          <div class="step-card">
            <div class="oneliner" data-testid="connection-explainer">
              Data čteme z cloudu výrobce nebo lokálně z boxu ve vaší síti.
              <details class="inline"><summary>více o připojení</summary>
                <p>${R("onboarding.connection.explainer_cloud",this.wizardLang)}</p>
                <p>${R("onboarding.connection.explainer_local",this.wizardLang)}</p>
              </details>
            </div>
            ${l.map(c=>{var p;return s`
              <div data-key=${c.key}>
                ${Lt(c,{value:this.connectionDraft[c.key],dirty:!1,secretSet:!!c.secret&&!!this.originalValues[`${c.key}_set`],originalValue:this.originalValues[c.key],reviewMode:((p=this.onboardingState)==null?void 0:p.grandfathered)===!0,secretRevealed:this.revealedSecretKeys.has(c.key),onRevealSecret:()=>this.revealSecret(c.key),onChange:u=>{this.connectionDraft={...this.connectionDraft,[c.key]:u}},entityCatalog:[]})}
              </div>
            `})}
          </div>
        </section>
      `}return s`
      <section class="step step-stub" data-step=${this.currentStep} style=${`--sc:${Me[this.currentStep]}`}>
        ${this.renderStepHead(this.currentStep)}
        <div class="step-card">
          <p data-testid="step-stub-placeholder">
            Tento krok bude doplněn v další verzi průvodce.
          </p>
        </div>
      </section>
    `}render(){var l;if(!this.open)return x;if(this.postSaveReloading)return s`
        <div class="overlay" data-testid="onboarding-wizard-overlay">
          <div class="modal" role="dialog" aria-modal="true" data-testid="onboarding-wizard-reloading">
            <div class="reload-panel">
              <div class="reload-spinner" aria-hidden="true"></div>
              <p data-testid="wizard-reload-message">${R("onboarding.reload.message",this.wizardLang)}</p>
            </div>
          </div>
        </div>
      `;const e=this.visibleWizardSteps(),t=this.currentIndex(),i=t<=0,r=t>=e.length-1,a=Cy[this.currentStep],n=((l=this.onboardingState)==null?void 0:l.grandfathered)===!0,o=this.summaryDiffRows().length;return s`
      <div
        class="overlay"
        data-testid="onboarding-wizard-overlay"
        @click=${this.close}
      >
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-wizard-title"
          data-testid="onboarding-wizard"
          @click=${c=>c.stopPropagation()}
        >
          <header>
            <h2 id="onboarding-wizard-title">Průvodce nastavením</h2>
            <button
              class="close"
              type="button"
              aria-label="Zavřít"
              data-testid="wizard-close"
              @click=${this.close}
            >×</button>
          </header>

          <div class="navwrap">
            <div class="phasebar" data-testid="wizard-phasebar">
              ${e.map((c,p)=>s`
                <i
                  data-testid="wizard-phasebar-segment"
                  data-phase=${Ir[c]??""}
                  style=${`background:${Ir[c]==="A"?"var(--phA)":Ir[c]==="B"?"var(--phB)":"transparent"};opacity:${p===t?1:.35}`}
                ></i>
              `)}
            </div>

            <nav class="steps" data-testid="wizard-steps" aria-label="Kroky průvodce">
              ${e.map(c=>{var g;const p=((g=this.onboardingState)==null?void 0:g.steps[c])??"pending",u=this.currentStep===c,h=u?"právě zde":Ly[p];return s`
                  <button
                    type="button"
                    class="st ${u?"cur active":p==="done"?"done":""}"
                    style=${`--sc:${Me[c]}`}
                    data-step=${c}
                    title=${`${Za[c]} — ${h}`}
                    aria-current=${u?"step":x}
                    @click=${()=>this.jumpTo(c)}
                  >
                    <span class="ic" aria-hidden="true">${El[c]}</span>
                    <span class="stlabel">${Za[c]}</span>
                    <span
                      class="step-status sr-only"
                      data-testid=${`wizard-step-status-${c}`}
                      data-status=${p}
                    >${h}</span>
                  </button>
                `})}
            </nav>

            <div class="stepmeta" data-testid="wizard-stepmeta">
              <b>Krok ${t+1} z ${e.length} · ${Ir[this.currentStep]==="A"?Il.A:Ir[this.currentStep]==="B"?Il.B:this.currentStep==="welcome"?"Úvod":"Závěr"}</b>
              <em style=${`--sc:${Me[this.currentStep]}`}>${Za[this.currentStep]}</em>
            </div>
          </div>

          ${this.bootstrapRetry.onboardingState?s`
                <div class="finish-status">
                  <p data-testid="onboarding-state-retry">${R("onboarding.bootstrap.state_load_failed",this.wizardLang)}</p>
                  <button
                    type="button"
                    data-testid="onboarding-state-retry-button"
                    @click=${()=>this.retryOnboardingStateBootstrap()}
                  >${R("onboarding.bootstrap.retry_button",this.wizardLang)}</button>
                </div>
              `:x}

          <div class="content" data-testid="wizard-content">
            ${this.renderStepContent()}
          </div>

          ${this.finishError?s`
                <div class="finish-status">
                  <p data-testid="wizard-finish-error">${this.finishError}</p>
                  <button
                    type="button"
                    data-testid="wizard-finish-retry"
                    ?disabled=${this.finishing}
                    @click=${()=>void this.finish()}
                  >${R("onboarding.bootstrap.retry_button",this.wizardLang)}</button>
                </div>
              `:x}

          ${this._pendingDiscardDrafts?s`
                <div class="quicksave-discard-confirm" data-testid="quicksave-discard-confirm" role="alertdialog">
                  <p>${R("onboarding.quicksave.discard_confirm",this.wizardLang)}</p>
                  <div class="quicksave-discard-confirm-actions">
                    <button type="button" data-testid="quicksave-discard-cancel"
                      @click=${()=>this.cancelDiscardDrafts()}>
                      ${R("onboarding.quicksave.discard_cancel",this.wizardLang)}
                    </button>
                    <button type="button" class="danger" data-testid="quicksave-discard-confirm-yes"
                      @click=${()=>this.confirmDiscardDrafts()}>
                      ${R("onboarding.quicksave.discard_confirm_yes",this.wizardLang)}
                    </button>
                  </div>
                </div>
              `:x}

          ${o>0?s`
                <div class="quicksave-bar" data-testid="quicksave-bar">
                  <span class="quicksave-label" data-testid="quicksave-count">
                    ${R("onboarding.quicksave.bar_label",this.wizardLang)} (${o})
                  </span>
                  <button
                    type="button"
                    data-testid="quicksave-discard"
                    ?disabled=${this.finishing}
                    @click=${()=>this.requestDiscardDrafts()}
                  >${R("onboarding.quicksave.discard",this.wizardLang)}</button>
                  <button
                    type="button"
                    class="primary"
                    data-testid="quicksave-save"
                    ?disabled=${this.finishing||this.hasBlockingTariffMatrixError()}
                    @click=${()=>void this.finish()}
                  >${this.finishing?"Ukládám…":R("onboarding.quicksave.save",this.wizardLang)}</button>
                </div>
              `:x}

          <footer>
            <button
              type="button"
              class="back"
              data-testid="wizard-back"
              ?disabled=${i}
              @click=${this.goPrev}
            >← Zpět</button>
            <button
              type="button"
              class="skip"
              data-testid="wizard-skip"
              ?disabled=${!a}
              @click=${this.skip}
            >Přeskočit</button>
            <button
              type="button"
              class="primary next"
              data-testid="wizard-next"
              ?disabled=${this.finishing||this.hasBlockingTariffMatrixError()}
              @click=${()=>void this.goNext()}
            >${this.finishing?"Dokončuji…":r?n?"Uložit":"Dokončit":"Další →"}</button>
          </footer>
        </div>
      </div>
    `}};le.styles=z`
    ${oc}
    ${ly}
    ${Jo}

    :host {
      display: contents;
      /* Owner-approved design rev 3 — per-step domain colors + phase-bar
         colors, fixed hex (not theme tokens): accent colors, not surfaces,
         so they read the same in light and dark HA themes. */
      --c-welcome: #5b8cff;
      --c-mod: #5b8cff;
      --c-ai: #9d7bff;
      --c-solar: #ffb547;
      --c-price: #3fd18b;
      --c-batt: #3ec6dc;
      --c-boiler: #ff7a59;
      --c-conn: #8fa1c4;
      --c-sum: #5b8cff;
      --phA: #5b8cff;
      --phB: #3fd18b;
    }

    .sr-only {
      position: absolute;
      width: 1px; height: 1px;
      padding: 0; margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.12s ease-out;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    .modal {
      width: min(720px, calc(100vw - 32px));
      max-height: calc(100vh - 48px);
      overflow: auto;
      background: var(--card-bg, #1d2330);
      color: inherit;
      border-radius: 14px;
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
      display: flex;
      flex-direction: column;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
    }

    header h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    button.close {
      background: transparent;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.18));
      color: inherit;
      border-radius: 8px;
      width: 30px; height: 30px;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
    }

    /* ── Navigation (design rev 3) ──────────────────────────────────────
       Centerpiece fix: chips are flex:none at a fixed width so .steps
       truly scrolls horizontally instead of shrinking every chip until
       their labels overlap (the mobile-broken bug this slice fixes). */
    .navwrap {
      padding: 10px 18px 0;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
      background: rgba(255, 255, 255, 0.02);
    }

    .phasebar {
      display: flex;
      height: 4px;
      border-radius: 99px;
      overflow: hidden;
      margin: 0 2px 8px;
      gap: 1px;
    }
    .phasebar i { display: block; flex: 1; }

    .steps {
      display: flex;
      flex-wrap: nowrap;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      padding: 2px 2px 10px;
    }
    .steps::-webkit-scrollbar { display: none; }

    .st {
      flex: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      width: 64px;
      padding: 6px 4px 4px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      font: inherit;
      color: inherit;
      position: relative;
    }

    .st .ic {
      width: 32px; height: 32px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 14px;
      background: var(--card-bg, rgba(255, 255, 255, 0.06));
      border: 1.5px solid var(--divider-color, rgba(255, 255, 255, 0.18));
      transition: background-color 0.09s ease-out, border-color 0.09s ease-out, color 0.09s ease-out, box-shadow 0.09s ease-out;
    }
    .st .stlabel {
      font-size: 10.5px;
      color: inherit;
      opacity: 0.65;
      white-space: nowrap;
    }

    .st.done .ic {
      border-color: var(--sc);
      color: var(--sc);
    }
    .st.done .ic { position: relative; }
    .st.done .ic::after {
      content: '✓';
      position: absolute;
      top: -3px; right: -5px;
      font-size: 9px;
      color: var(--sc);
      background: var(--card-bg, #1d2330);
      border-radius: 50%;
      padding: 0 2px;
    }

    .st.cur {
      border-color: var(--sc);
      background: color-mix(in srgb, var(--sc) 10%, transparent);
    }
    .st.cur .ic {
      background: var(--sc);
      color: #0a1124;
      border-color: var(--sc);
      box-shadow: 0 0 14px color-mix(in srgb, var(--sc) 55%, transparent);
    }
    .st.cur .stlabel { opacity: 1; font-weight: 600; }

    .stepmeta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      padding: 0 4px 8px;
      font-size: 11px;
    }
    .stepmeta b { font-weight: 500; opacity: 0.7; }
    .stepmeta em { font-style: normal; font-size: 11.5px; color: var(--sc, inherit); font-weight: 600; }

    /* <=480px: hide labels, chips shrink to icon-only, row scrolls (never wraps). */
    @media (max-width: 480px) {
      .st { width: 44px; }
      .st .stlabel { display: none; }
    }

    /* Low-height viewports (Nest Hub 1024x600 kiosk): compact chips, body
       scrolls internally, footer stays reachable without page-scrolling. */
    @media (max-height: 650px) {
      .st { width: 44px; padding: 5px 2px 4px; }
      .st .stlabel { display: none; }
      .st .ic { width: 26px; height: 26px; font-size: 12px; }
      .content { max-height: 260px; }
      footer { position: sticky; bottom: 0; background: var(--card-bg, #1d2330); }
    }

    .content {
      padding: 16px 18px;
      min-height: 120px;
      overflow-y: auto;
    }

    .step-card {
      font-size: 14px;
      line-height: 1.5;
    }

    .step-card p { margin: 0 0 8px; }

    .module-group + .module-group { margin-top: 16px; }
    .module-group h4 {
      margin: 0 0 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      opacity: 0.7;
    }

    /* f1/wv2-modules-fix §3 — dependency gating hints under a toggle. */
    .dep-explain {
      margin: 2px 0 10px;
      font-size: 12px;
      line-height: 1.4;
    }
    .dep-hard { color: var(--warning-color, #e0a52b); }
    .dep-soft { opacity: 0.75; }
    .dep-enable {
      margin-left: 6px;
      padding: 1px 8px;
      font: inherit;
      font-size: 11px;
      cursor: pointer;
      border: 1px solid currentColor;
      border-radius: 6px;
      background: transparent;
      color: inherit;
    }
    .prereq-confirm {
      margin-bottom: 12px;
      padding: 12px 14px;
      border: 1px solid var(--warning-color, #e0a52b);
      border-radius: 10px;
      background: color-mix(in srgb, var(--warning-color, #e0a52b) 12%, transparent);
    }
    .prereq-confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .prereq-confirm-actions button {
      padding: 4px 12px;
      font: inherit;
      cursor: pointer;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.2));
      border-radius: 8px;
      background: transparent;
      color: inherit;
    }
    .prereq-confirm-actions .danger {
      border-color: var(--warning-color, #e0a52b);
      color: var(--warning-color, #e0a52b);
    }

    /* fe/fix defect #2 — quick-save bar, every step, non-empty diff only. A
       static flex child AFTER .content (never inside its own scroll box),
       so it stays visible without fighting .content's internal scroll —
       same trick footer already relies on. */
    .quicksave-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      border-top: 1px solid var(--primary-color, #4f7cff);
      background: color-mix(in srgb, var(--primary-color, #4f7cff) 8%, transparent);
    }
    .quicksave-bar .quicksave-label {
      flex: 1;
      font-size: 12.5px;
    }
    .quicksave-bar button {
      padding: 7px 14px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.18));
      background: var(--card-bg, transparent);
      color: inherit;
      cursor: pointer;
      font: inherit;
    }
    .quicksave-bar button.primary {
      background: linear-gradient(135deg, var(--primary-color, #4f7cff), #7ba4ff);
      border-color: transparent;
      color: #fff;
      font-weight: 600;
    }
    .quicksave-bar button:disabled { opacity: 0.4; cursor: not-allowed; }

    .quicksave-discard-confirm {
      margin: 0 18px 10px;
      padding: 12px 14px;
      border: 1px solid var(--warning-color, #e0a52b);
      border-radius: 10px;
      background: color-mix(in srgb, var(--warning-color, #e0a52b) 12%, transparent);
    }
    .quicksave-discard-confirm p { margin: 0 0 10px; font-size: 13px; }
    .quicksave-discard-confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .quicksave-discard-confirm-actions button {
      padding: 4px 12px;
      font: inherit;
      cursor: pointer;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.2));
      border-radius: 8px;
      background: transparent;
      color: inherit;
    }
    .quicksave-discard-confirm-actions .danger {
      border-color: var(--warning-color, #e0a52b);
      color: var(--warning-color, #e0a52b);
    }

    /* fe/fix defect #1 — blocking post-save reload overlay. Replaces the
       whole modal body; no close control, by design (Do-NOT: no dead ends,
       ever — the wizard must not be dismissible mid-reload). */
    .reload-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px 24px;
      text-align: center;
    }
    .reload-spinner {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 3px solid var(--divider-color, rgba(255, 255, 255, 0.18));
      border-top-color: var(--primary-color, #4f7cff);
      animation: reload-spin 0.8s linear infinite;
    }
    @keyframes reload-spin { to { transform: rotate(360deg); } }

    /* Section grouping within a step (UX-SPEC §6, "cards over a flat list")
       — mirrors the admin tile dialog's numbered-section pattern (164c622a8,
       tile-dialog.ts .sec/.sect), reused here rather than a new mechanism. */
    .field-group {
      margin-bottom: 14px;
      padding: 12px 14px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
      border-left: 3px solid color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 55%, transparent);
      border-radius: 10px;
    }

    .boiler-core {
      margin-bottom: 12px;
    }

    .boiler-core-example {
      margin: 0 0 10px;
      font-size: 12px;
      opacity: 0.8;
    }

    .boiler-simulator-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      gap: 8px;
      margin: 0 0 12px;
      padding: 11px 14px;
      border: none;
      border-radius: 11px;
      background: linear-gradient(135deg, var(--c-boiler), color-mix(in srgb, var(--c-boiler) 65%, #ffb07c));
      color: #fff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 26px color-mix(in srgb, var(--c-boiler) 34%, transparent);
    }

    .boiler-expander {
      margin-bottom: 12px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      overflow: hidden;
      background: color-mix(in srgb, var(--card-bg, #0c1530) 94%, transparent);
    }

    .boiler-expander > summary {
      list-style: none;
      cursor: pointer;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .boiler-expander > summary::-webkit-details-marker { display: none; }
    .boiler-expander[open] > summary {
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
    }

    .boiler-expander-title {
      font-size: 12.5px;
      font-weight: 700;
    }

    .boiler-expander-copy {
      font-size: 12px;
      line-height: 1.4;
      opacity: 0.78;
    }

    .boiler-expander-body {
      padding: 12px 14px 14px;
    }

    /* Step header — glow icon tile + title + one-line subtitle (design rev 3). */
    .step-head {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    .step-head-icon {
      flex: none;
      width: 40px; height: 40px;
      border-radius: 13px;
      display: grid;
      place-items: center;
      font-size: 19px;
      background: color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 16%, transparent);
      border: 1px solid color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 45%, transparent);
      box-shadow: 0 0 20px color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 25%, transparent);
    }
    .step-head h3 { margin: 0; font-size: 16px; }
    .step-head-sub { margin: 2px 0 0; font-size: 12px; opacity: 0.7; font-weight: 400; }

    /* Number+unit fields as a "pcard" — label small caps, big value, unit
       (design rev 3 item 2) — a visual wrapper over the shared .row
       control, not a second input implementation. */
    .pcard {
      background: color-mix(in srgb, var(--card-bg, #0c1530) 92%, transparent);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: 11px;
      padding: 10px 12px;
    }
    .pcard .row {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 0;
      border-bottom: 0;
    }
    .pcard .lab {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }
    .pcard input[type=number],
    .pcard input[type=text] {
      font-size: 16px;
      font-weight: 600;
    }

    /* Secret set-state badge (design rev 3 item 3d) — replaces the plain
       always-editable input once a secret is confirmed set; "Změnit"
       reveals the real input to overwrite it. */
    .secret-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: color-mix(in srgb, var(--c-price) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--c-price) 45%, transparent);
      color: #9fe8c6;
      border-radius: 9px;
      padding: 6px 12px;
      font-size: 12.5px;
    }
    .secret-badge-change {
      background: none;
      border: none;
      color: var(--primary-color, #4f7cff);
      font-size: 12px;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
      font: inherit;
    }

    .field-group:last-child { margin-bottom: 0; }

    .field-group-heading {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      opacity: 0.7;
      margin-bottom: 8px;
    }

    .field-group-heading .field-group-badge {
      width: 17px;
      height: 17px;
      border-radius: 50%;
      background: var(--primary-color, #4f7cff);
      color: #06121f;
      display: grid;
      place-items: center;
      font-size: 10px;
    }

    /* Live-walk defect 3 — solar provider acquisition guide, same visual
       weight as .field-group (UX-SPEC §6 cards over a flat list). */
    .provider-guide {
      margin: 4px 0 14px;
      padding: 10px 14px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      font-size: 12.5px;
    }
    .provider-guide h4 { margin: 0 0 6px; font-size: 12px; }
    .provider-guide-links { display: flex; gap: 12px; margin-bottom: 6px; }
    .provider-guide ol { margin: 4px 0; padding-left: 18px; }
    .provider-guide li { margin-bottom: 3px; line-height: 1.4; }

    /* Fixed-price purchase scenario, dual tariff: VT/NT side by side
       (supplier-step redesign brief item 2). */
    .vt-nt-row {
      display: flex;
      gap: 12px;
    }
    .vt-nt-row > div { flex: 1; min-width: 0; }

    /* Number+unit pcard pairs (battery charge-rate/reserve, item 2) — grid,
       single column on mobile. */
    .pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 10px;
    }
    .battery-hardware {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 2px 0 14px;
    }
    .battery-chip {
      display: inline-flex;
      align-items: baseline;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 11px;
      border: 1px solid color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 28%, var(--divider-color, rgba(255, 255, 255, 0.12)));
      background: color-mix(in srgb, var(--card-bg, #0c1530) 92%, transparent);
    }
    .battery-chip-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.35px;
      opacity: 0.7;
    }
    .battery-chip-value {
      font-size: 13px;
      font-weight: 700;
    }
    .battery-actions {
      margin-top: 14px;
      display: flex;
      justify-content: flex-start;
    }
    .battery-sim-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 92%, white 8%),
        color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 68%, #ffffff 32%)
      );
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      box-shadow: 0 10px 24px color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 28%, transparent);
      transition: transform 0.12s ease, box-shadow 0.12s ease;
    }
    .battery-sim-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 28px color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 34%, transparent);
    }
    @media (max-width: 480px) {
      .pair { grid-template-columns: 1fr; }
    }

    footer {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 12px 18px 16px;
      border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
    }

    footer button {
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.18));
      background: var(--card-bg, transparent);
      color: inherit;
      cursor: pointer;
      font: inherit;
    }

    footer button.primary {
      background: linear-gradient(135deg, var(--primary-color, #4f7cff), #7ba4ff);
      border-color: transparent;
      color: #fff;
      font-weight: 600;
      box-shadow: 0 4px 18px rgba(79, 124, 255, 0.35);
    }

    footer button.skip {
      font-style: italic;
    }

    footer button:disabled { opacity: 0.4; cursor: not-allowed; }

    @media (max-width: 480px) {
      footer { flex-wrap: wrap; }
      footer button.primary.next { flex: 1; }
    }

    .finish-status {
      padding: 0 18px 12px;
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .finish-status p {
      margin: 0;
      font-size: 13px;
      color: var(--error-color, #ff8a80);
    }

    .finish-status button {
      padding: 7px 12px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.18));
      background: var(--card-bg, transparent);
      color: inherit;
      cursor: pointer;
      font: inherit;
    }

    /* Owner live-walk UX rev (F1 dist-ux) — distributor icon slot, VT/NT
       price pair, NT/VT schedule grid. */
    .distributor-icon {
      display: inline-flex;
      width: 18px; height: 18px;
      margin-right: 6px;
      vertical-align: middle;
    }
    .distributor-icon img { width: 100%; height: 100%; object-fit: contain; }

    .distribution-price-pair {
      display: flex;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px dashed var(--divider-color, rgba(255, 255, 255, 0.12));
    }
    .price-cell { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
    .price-cell input { max-width: 100px; }

    .link-button {
      background: transparent;
      border: none;
      color: var(--primary-color, #4f7cff);
      font-size: 11.5px;
      cursor: pointer;
      padding: 4px 0;
      text-decoration: underline;
    }

    .tariff-matrix { padding: 10px 0; }
    .tariff-matrix-legend {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; opacity: 0.8; margin-bottom: 8px;
    }
    .legend-swatch {
      display: inline-block; width: 11px; height: 11px; border-radius: 2px;
    }
    .legend-swatch.vt { background: var(--card-bg, rgba(255, 255, 255, 0.12)); border: 1px solid var(--divider-color, rgba(255,255,255,0.3)); }
    .legend-swatch.nt { background: var(--primary-color, #4f7cff); }

    .tariff-matrix-hours {
      display: grid;
      grid-template-columns: repeat(24, 1fr);
      gap: 1px;
      margin-bottom: 3px;
    }
    .tariff-matrix-hours i {
      font-style: normal;
      font-size: 9px;
      opacity: 0.6;
      text-align: center;
    }

    .tariff-matrix-row { margin-bottom: 12px; }
    .tariff-matrix-row-label { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
    .tariff-matrix-cells {
      display: grid;
      grid-template-columns: repeat(24, 1fr);
      gap: 2px;
    }
    .tariff-cell {
      height: 26px;
      padding: 0;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      background: var(--card-bg, rgba(255, 255, 255, 0.12));
      transition: transform 0.1s;
    }
    .tariff-cell:hover { transform: scale(1.12); }
    .tariff-cell.nt {
      background: var(--primary-color, #4f7cff);
      box-shadow: 0 0 6px color-mix(in srgb, var(--primary-color, #4f7cff) 50%, transparent);
    }
    .tariff-matrix-summary { font-size: 11px; opacity: 0.85; font-weight: 600; margin: 4px 0 0; }
    .tariff-matrix-error { font-size: 11px; color: var(--error-color, #ff8a80); margin: 4px 0 0; }
  `;ie([m({type:Boolean,reflect:!0})],le.prototype,"open",2);ie([m({attribute:!1})],le.prototype,"inverterSn",2);ie([m({attribute:!1})],le.prototype,"hass",2);ie([S()],le.prototype,"currentStep",2);ie([S()],le.prototype,"modulesDraft",2);ie([S()],le.prototype,"_pendingPrereqOff",2);ie([S()],le.prototype,"onboardingState",2);ie([S()],le.prototype,"pricing",2);ie([S()],le.prototype,"pricingLoading",2);ie([S()],le.prototype,"pricingLoadFailed",2);ie([S()],le.prototype,"finishing",2);ie([S()],le.prototype,"finishError",2);ie([S()],le.prototype,"postSaveReloading",2);ie([S()],le.prototype,"_pendingDiscardDrafts",2);ie([S()],le.prototype,"pricingDraft",2);ie([S()],le.prototype,"connectionDraft",2);ie([S()],le.prototype,"boilerDraft",2);ie([S()],le.prototype,"isDualTariff",2);ie([S()],le.prototype,"tariffMatrixOverride",2);ie([S()],le.prototype,"tariffMatrixError",2);ie([S()],le.prototype,"showVatOverride",2);ie([S()],le.prototype,"revealedSecretKeys",2);ie([S()],le.prototype,"originalValues",2);ie([S()],le.prototype,"solarDraft",2);ie([S()],le.prototype,"batteryDraft",2);ie([S()],le.prototype,"solarTestLoading",2);ie([S()],le.prototype,"solarTestResult",2);ie([S()],le.prototype,"solarTestError",2);ie([S()],le.prototype,"solarTestMatchesDraft",2);ie([S()],le.prototype,"aiState",2);ie([S()],le.prototype,"aiValidation",2);ie([S()],le.prototype,"bootstrapRetry",2);le=ie([E("oig-onboarding-wizard")],le);var Dy=Object.defineProperty,Oy=Object.getOwnPropertyDescriptor,gt=(e,t,i,r)=>{for(var a=r>1?void 0:r?Oy(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&Dy(t,i,a),a};const ve=X,Rl=new URLSearchParams(window.location.search).get("sn")||new URLSearchParams(window.location.search).get("inverter_sn")||"",Ey=new Set(["boiler","modules"]),gc=[["ai_task","Vlastní AI v Home Assistantu (ai_task)"],["groq","Groq"],["nvidia","NVIDIA"]],Wl=[{key:"ai_provider",label:"Poskytovatel AI",type:"select",options:gc,hint:"Volitelné; žádný poskytovatel není předvybrán ani zvýhodněn."},{key:"ai_base_url",label:"Base URL API",type:"text",optional:!0,hint:"Volitelná vlastní OpenAI-compatible URL."},{key:"ai_model",label:"Model",type:"text",optional:!0,hint:"Volitelný identifikátor modelu."},{key:"ai_api_key",label:"API klíč",type:"text",optional:!0,secret:!0,hint:"Prázdné pole zachová dříve uložený klíč."}];function Iy(e){return e==="gas"?"Plyn — cena tepla včetně účinnosti kotle (např. 1,5 Kč/kWh)":e==="heat_pump"?"Tepelné čerpadlo — cena ≈ cena elektřiny / COP":e==="fireplace"?"Krb — orientační cena tepla z dřeva/pelet":"Zadej orientační cenu tepla v Kč/kWh"}const Fy=["boiler_volume_l","boiler_temp_sensor_top","boiler_enable_second_thermometer","boiler_temp_sensor_bottom","boiler_current_power_entity","boiler_target_temp_c","boiler_deadline_time"];function By(e){return e==="gas"?"plyn":e==="heat_pump"?"TČ":e==="fireplace"?"krb":e||"jiný"}function jy(e,t,i,r,a){const n=[];if(e){const o=By(t),l=i!=null?` · ${Number(i).toFixed(1).replace(".",",")} Kč/kWh`:"";n.push(`${o}${l}`)}return r&&a&&n.push("🔋→🔥"),n.length===0?r?"Home 5/6":"pouze elektřina":n.join(" · ")}function Ny(e){return e?"zapnuto":"vypnuto"}function Ry(e){return e<=0?"vypnuto":`1×/${e} dní`}let et=class extends O{constructor(){super(...arguments),this.hassStates=null,this.config=null,this.registry=null,this.loading=!0,this.pending={},this.saving=null,this.toast=null,this.aiState=null,this.aiValidation={kind:"idle"},this.reloading=!1,this._entityCatalog=[],this._lastHassStates=null}get uiLang(){return Ln(J.getHassSync())}reloadPanel(){window.location.reload()}launchOnboarding(){this.dispatchEvent(new CustomEvent("launch-onboarding",{bubbles:!0,composed:!0}))}connectedCallback(){super.connectedCallback(),this.refresh()}get entityCatalog(){return this.hassStates!==this._lastHassStates&&(this._lastHassStates=this.hassStates,this._entityCatalog=this.hassStates?jv(this.hassStates):[]),this._entityCatalog}async refresh(){this.loading=!0;const[e,t]=await Promise.all([Ao(),ac()]),i=await hc(Rl);t===null&&L.warn("[Settings] /config_registry unavailable"),this.registry=t,this.config=e,this.aiState=i,this.aiValidation={kind:"idle"},this.pending={},this.loading=!1}fieldsFor(e){return e==="ai"?[...this.registry?We(this.registry,"ai"):Wl.slice(0,3),Wl[3]]:this.registry?We(this.registry,e):[]}current(e,t){var a;const i=this.pending[e];if(i&&t in i)return i[t];const r=(a=this.config)==null?void 0:a[e];return r?r[t]:void 0}currentCrossSection(e,t){const i=this.current(e,t);if(i!==void 0)return i;for(const a of Object.keys(this.pending)){if(a===e)continue;const n=this.pending[a];if(n&&t in n)return n[t]}const r=this.config;if(r){for(const a of Object.keys(r))if(a!==e&&r[a]&&t in r[a])return r[a][t]}}isFieldVisible(e,t){var n;const i=o=>this.currentCrossSection(e,o);if(!xr(t,i))return!1;const r=(n=this.registry)==null?void 0:n.fields[t.key],a=r==null?void 0:r.show_if_all;return a?a.every(o=>o.in.some(l=>l===i(o.field))):!0}setPending(e,t,i){this.pending={...this.pending,[e]:{...this.pending[e]??{},[t]:i}}}isDirty(e){return Object.keys(this.pending[e]??{}).length>0}discardPending(e){this.pending={...this.pending,[e]:{}},this.toast=null}async save(e){const t=this.pending[e];if(!t||this.saving)return;this.saving=e,this.toast=null;const i=await vd(e,t);if(this.saving=null,!i.ok){const r=i.fields?Object.entries(i.fields).map(([a,n])=>`${a}: ${n}`).join(", "):"uložení selhalo";this.toast={section:e,ok:!1,text:`✗ ${r}`};return}if(this.config&&(this.config={...this.config,[e]:{...this.config[e],...t}}),this.pending={...this.pending,[e]:{}},e!=="ai"&&Ey.has(e))this.reloading=!0,md(()=>{this.reloadPanel()},()=>{this.reloading=!1,this.toast={section:e,ok:!0,text:"Integrace se restartuje déle než obvykle — obnov stránku"}});else{this.toast={section:e,ok:!0,text:"✓ Uloženo"},this.loading=!0;const r=await Ao();r&&(this.config=r),this.loading=!1}}renderField(e,t,i=!1){const r=!!(this.pending[e]&&t.key in this.pending[e]),n=(t.secret??t.key.endsWith("api_key"))&&!!this.current(e,`${t.key}_set`);return Lt(t,{value:this.current(e,t.key),dirty:r,secretSet:n,onChange:o=>this.setPending(e,t.key,o),entityCatalog:this.entityCatalog,disabled:i})}renderRegistryUnavailable(e,t,i){return s`
      <div class="card">
        <h2>${t}</h2>
        <div class="sub">${i}</div>
        <div class="error" role="alert" data-testid=${`registry-error-${e}`}>
          <p>Registry polí se nepodařilo načíst.</p>
          <button type="button" @click=${()=>void this.refresh()}>Zkusit znovu</button>
        </div>
      </div>
    `}async validateAiConfig(){var t,i,r;if(((t=this.aiState)==null?void 0:t.status)!=="verified"||this.aiValidation.kind==="loading")return;this.aiValidation={kind:"loading"};const e=await J.fetchOIGAPITyped(`/${Rl}/ai/validate_config`,{method:"POST"});if(!e.ok){this.aiValidation={kind:"error",code:e.code};return}if((i=e.data)!=null&&i.ok){this.aiValidation={kind:"success",findings:e.data.findings??[]};return}this.aiValidation={kind:"error",code:((r=e.data)==null?void 0:r.code)??"error"}}renderCard(e,t,i,r){var l;if(!this.registry&&e!=="ai")return this.renderRegistryUnavailable(e,t,i);const a=((l=this.toast)==null?void 0:l.section)===e?this.toast:null,n=this.isDirty(e),o=r.filter(c=>this.isFieldVisible(e,c));return s`
      <div class="card">
        <h2>${t}</h2>
        <div class="sub">${i}</div>
        ${o.map(c=>this.renderField(e,c))}
        ${e==="ai"?Kr({aiState:this.aiState,lang:this.uiLang,showValidateButton:!0,validationState:this.aiValidation,onValidate:()=>void this.validateAiConfig()}):x}
        <div class="actions">
          <button class="save" ?disabled=${!n||this.saving===e}
            @click=${()=>this.save(e)}>
            ${this.saving===e?"Ukládám…":"Uložit"}
          </button>
          ${a?s`<span class="toast ${a.ok?"ok":"err"}">${a.text}</span>`:x}
        </div>
      </div>`}renderFieldDisableable(e,t,i){return t.type!=="bool"?this.renderField(e,t):this.renderField(e,t,i)}renderBoilerCard(){var I;const e="boiler";if(!this.registry)return this.renderRegistryUnavailable(e,"🔥 Bojler","Parametry inteligentního ohřevu vody — mirroruje průvodce v HA.");const t=((I=this.toast)==null?void 0:I.section)===e?this.toast:null,i=this.fieldsFor(e),r=new Map(i.map(k=>[k.key,k])),a=k=>r.get(k),n=(k,P=!1)=>{const V=a(k);return V?P?this.renderFieldDisableable(e,V,!0):this.renderField(e,V):x},o=!!this.current(e,"boiler_has_alternative_heating"),l=String(this.current(e,"boiler_alt_source_type")??"gas"),c=this.current(e,"boiler_alt_cost_kwh"),p=!!this.current(e,"box_has_home56"),u=!!this.current(e,"boiler_home5_maneuver_enabled"),h=!!this.current(e,"boiler_circulation_enabled"),g=Number(this.current(e,"boiler_legionella_interval_days")??0),v=!!this.current(e,"boiler_enable_second_thermometer"),f=this.isDirty(e),b=a("boiler_alt_cost_kwh"),$=b?{...b,hint:Iy(l)}:void 0,_=a("boiler_home5_maneuver_enabled"),w=_?{..._,hint:p?"Plánovač použije baterii (Home 5) k ohřevu, pokud je levnější než síť":'Vyžaduje aktivaci „Box má Home 5/6" výše'}:void 0,C=jy(o,l,c,p,u),D=Ny(h),T=Ry(g);return s`
      <div class="card">
        <h2>🔥 Bojler</h2>
        <div class="sub">Parametry inteligentního ohřevu vody — mirroruje průvodce v HA.</div>

        <!-- ══ Nádrž a čidla — OPEN by default ══ -->
        <details class="bsec" open>
          <summary>Nádrž a čidla</summary>
          <div class="bsec-body">
            ${Fy.map(k=>k==="boiler_temp_sensor_bottom"&&!v?x:n(k))}
          </div>
        </details>

        <!-- ══ Zdroje tepla — collapsed ══ -->
        <details class="bsec">
          <summary>
            Zdroje tepla
            <span class="bsec-badge" data-testid="badge-sources">${C}</span>
          </summary>
          <div class="bsec-body">
            ${n("boiler_has_alternative_heating")}
            ${o?s`
              ${a("boiler_alt_source_type")?this.renderField(e,{...a("boiler_alt_source_type"),hint:void 0}):x}
              ${$?this.renderField(e,$):x}
              ${n("boiler_alt_energy_sensor")}
              ${n("boiler_alt_energy_daily")}
              ${n("boiler_alt_power_kw")}
              ${n("boiler_thermal_arbitrage_enabled")}
              ${this.current(e,"boiler_thermal_arbitrage_enabled")?n("boiler_max_temp_c"):x}
            `:x}
            ${n("box_has_home56")}
            <div class="note" style="margin-top:6px;margin-bottom:2px">
              Po změně „Box má Home 5/6" a uložení nastavení je nutné obnovit stránku (F5), aby se ovládací panel správně aktualizoval.
            </div>
            ${w?this.renderFieldDisableable(e,w,!p):x}
            ${p?n("boiler_battery_cycle_cost_czk_kwh"):x}
          </div>
        </details>

        <!-- ══ Cirkulace teplé vody — collapsed ══ -->
        <details class="bsec">
          <summary>
            Cirkulace teplé vody
            <span class="bsec-badge" data-testid="badge-circulation">${D}</span>
          </summary>
          <div class="bsec-body">
            ${n("boiler_circulation_enabled")}
            ${h?s`
              ${n("boiler_circulation_lead_minutes")}
              ${n("boiler_circulation_run_minutes")}
              ${n("boiler_circulation_max_runs_per_day")}
              ${n("boiler_circulation_min_gap_minutes")}
            `:x}
          </div>
        </details>

        <!-- ══ Ochrana proti legionelle — collapsed ══ -->
        <details class="bsec">
          <summary>
            Ochrana proti legionelle
            <span class="bsec-badge" data-testid="badge-legionella">${T}</span>
          </summary>
          <div class="bsec-body">
            ${n("boiler_legionella_interval_days")}
            ${g>0?n("boiler_legionella_target_temp_c"):x}
          </div>
        </details>

        <!-- ══ Dirty bar / Actions ══ -->
        ${f?s`
          <div class="dirty-bar" data-testid="boiler-dirty-bar">
            <span class="dirty-bar-label">Neuložené změny</span>
            ${t?s`<span class="toast ${t.ok?"ok":"err"}">${t.text}</span>`:x}
            <button class="discard" @click=${()=>this.discardPending(e)}>Zahodit</button>
            <button class="save" ?disabled=${this.saving===e}
              @click=${()=>this.save(e)}>
              ${this.saving===e?"Ukládám…":"Uložit"}
            </button>
          </div>
        `:s`
          <div class="actions">
            <button class="save" disabled>Uložit</button>
            ${t?s`<span class="toast ${t.ok?"ok":"err"}">${t.text}</span>`:x}
          </div>
        `}
      </div>`}renderAiCard(){var c;const e="ai",i=this.fieldsFor(e).filter(p=>this.isFieldVisible(e,p)),r=((c=this.toast)==null?void 0:c.section)===e?this.toast:null,a=this.isDirty(e),n={ai_task:{ic:"🏠",tag:"Nic neopouští váš Home Assistant."},groq:{ic:"⚡",tag:"Zdarma, rychlé, smluvně netrénuje na vstupech."},nvidia:{ic:"🟩",tag:"Zdarma (trial), velký katalog modelů."}},o=String(this.current(e,"ai_provider")??""),l=i.filter(p=>p.key!=="ai_provider");return s`
      <div class="card" style="--sc: var(--c-ai, #9d7bff)">
        <h2>🤖 AI</h2>
        <div class="sub">Konfigurace asistenta a ověření stavu.</div>
        <div class="oneliner">
          Posíláme <b>jen anonymní čísla</b> — nikdy polohu, jméno či e-mail.
          <details class="inline"><summary>více</summary>
            <p>AI Task entita vznikne ve vaší HA instanci. Dashboard i výpočty fungují stejně i bez AI.</p>
          </details>
        </div>
        <div class="ptiles">
          ${gc.map(([p,u])=>{const h=n[p]??{ic:"🤖",tag:""};return s`
              <button
                type="button"
                class="ptile ${o===p?"on":""}"
                data-provider-tile=${p}
                @click=${()=>this.setPending(e,"ai_provider",p)}
              >
                <span class="pic">${h.ic}</span>
                <b>${u}</b>
                <i>${h.tag}</i>
              </button>
            `})}
        </div>
        ${l.map(p=>this.renderField(e,p))}
        ${Kr({aiState:this.aiState,lang:this.uiLang,showValidateButton:!0,validationState:this.aiValidation,onValidate:()=>void this.validateAiConfig()})}
        <div class="actions">
          <button class="save" ?disabled=${!a||this.saving===e}
            @click=${()=>this.save(e)}>
            ${this.saving===e?"Ukládám…":"Uložit"}
          </button>
          ${r?s`<span class="toast ${r.ok?"ok":"err"}">${r.text}</span>`:x}
        </div>
      </div>`}render(){if(this.reloading)return s`
        <oig-reload-overlay
          .message=${R("onboarding.reload.message",this.uiLang)}
        ></oig-reload-overlay>
      `;const e=s`
      <div class="onboarding-launcher">
        <span>Průvodce lze kdykoli znovu otevřít a upravit jednotlivé kroky.</span>
        <button
          type="button"
          data-testid="launch-onboarding"
          @click=${this.launchOnboarding}
        >Spustit průvodce nastavením</button>
      </div>
    `;return this.loading?s`${e}<div class="loading">Načítání nastavení…</div>`:this.config?s`
      ${e}
      <div class="grid">
        ${this.renderCard("modules","🧩 Moduly","Zapnutí modulu přidá senzory a záložky; konfigurace níže.",this.fieldsFor("modules"))}
        ${this.renderCard("battery","🔋 Baterie a plánovač","Parametry ekonomického plánovače a balancování.",this.fieldsFor("battery"))}
        ${this.renderCard("solar","☀️ Solární předpověď","Poskytovatel a geometrie stringů.",this.fieldsFor("solar"))}
        ${this.renderAiCard()}
        ${this.renderCard("pricing_supplier","💳 Dodavatelské a distribuční ceny","Obchodní podmínky vaší smlouvy s dodavatelem a distributorem elektřiny.",this.fieldsFor("pricing_supplier"))}
        ${this.renderBoilerCard()}
      </div>
    `:s`${e}<div class="loading">Nastavení se nepodařilo načíst (vyžaduje administrátorský účet).</div>`}};et.styles=z`
    :host { display: block; }

    .onboarding-launcher {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      padding: 12px 16px;
      border: 1px solid ${ve(d.divider)};
      border-radius: 12px;
      background: ${ve(d.cardBg)};
      color: ${ve(d.textPrimary)};
      box-shadow: ${ve(d.cardShadow)};
    }

    .onboarding-launcher span {
      font-size: 12.5px;
      color: ${ve(d.textSecondary)};
    }

    .onboarding-launcher button {
      flex-shrink: 0;
      border: none;
      border-radius: 8px;
      padding: 7px 12px;
      background: ${ve(d.accent)};
      color: #fff;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 14px;
      align-items: start;
    }

    .card {
      background: ${ve(d.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${ve(d.cardShadow)};
      position: relative;
    }

    .card h2 {
      margin: 0 0 4px;
      font-size: 15px;
      color: ${ve(d.textPrimary)};
    }

    .card .sub {
      font-size: 11px;
      color: ${ve(d.textSecondary)};
      margin-bottom: 12px;
    }

    ${oc}
    ${Jo}

    /* ---- Actions ---- */
    .actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
    button.save {
      background: ${ve(d.accent)};
      color: #fff; border: none; border-radius: 8px;
      padding: 7px 16px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    button.save:disabled { opacity: 0.45; cursor: default; }
    .toast { font-size: 12px; }
    .toast.ok { color: #9fe6a8; }
    .toast.err { color: #ff9d93; }

    .error {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 10px;
      padding: 10px 12px;
      border: 1px solid rgba(255, 128, 128, 0.35);
      border-radius: 10px;
      background: rgba(255, 128, 128, 0.08);
    }

    .error p {
      margin: 0;
      font-size: 12px;
      color: ${ve(d.textSecondary)};
      line-height: 1.45;
    }

    .error button {
      border: none;
      border-radius: 8px;
      padding: 7px 12px;
      background: ${ve(d.accent)};
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
    }

    /* ---- Note box ---- */
    .note {
      font-size: 11.5px;
      color: ${ve(d.textSecondary)};
      background: rgba(120,160,255,0.08);
      border: 1px solid rgba(120,160,255,0.2);
      border-radius: 8px;
      padding: 8px 10px;
      margin-top: 12px;
      line-height: 1.45;
    }

    .loading { padding: 30px; text-align: center; color: ${ve(d.textSecondary)}; }

    /* ---- Group label (non-boiler cards) ---- */
    .group-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${ve(d.textSecondary)};
      margin: 12px 0 4px;
      padding-top: 6px;
      border-top: 1px solid ${ve(d.divider)};
    }
    .group-label:first-of-type { border-top: none; margin-top: 0; }

    /* ---- Collapsible boiler sub-sections ---- */
    .bsec {
      border-top: 1px solid ${ve(d.divider)};
      margin-top: 10px;
    }

    .bsec > summary {
      cursor: pointer;
      list-style: none;
      padding: 9px 0 7px;
      display: flex;
      align-items: center;
      gap: 8px;
      user-select: none;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: ${ve(d.textSecondary)};
    }
    .bsec > summary::-webkit-details-marker { display: none; }
    .bsec > summary::before {
      content: '▶';
      font-size: 8px;
      opacity: 0.5;
      transition: transform 0.15s;
      flex-shrink: 0;
    }
    .bsec[open] > summary::before {
      transform: rotate(90deg);
    }

    .bsec-badge {
      margin-left: auto;
      font-size: 10.5px;
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
      color: ${ve(d.textSecondary)};
      background: rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 2px 7px;
      white-space: nowrap;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bsec-body {
      padding-bottom: 6px;
    }

    /* ---- Sticky dirty bar ---- */
    .dirty-bar {
      position: sticky;
      bottom: 0;
      left: 0;
      right: 0;
      background: ${ve(d.cardBg)};
      border-top: 1px solid ${ve(d.accent)};
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 -16px -16px;
      border-radius: 0 0 12px 12px;
      z-index: 10;
    }

    .dirty-bar-label {
      font-size: 11.5px;
      color: ${ve(d.textSecondary)};
      flex: 1;
    }

    button.discard {
      background: transparent;
      border: 1px solid ${ve(d.divider)};
      color: ${ve(d.textSecondary)};
      border-radius: 7px;
      padding: 5px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    button.discard:hover { border-color: ${ve(d.textSecondary)}; }
  `;gt([m({attribute:!1})],et.prototype,"hassStates",2);gt([S()],et.prototype,"config",2);gt([S()],et.prototype,"registry",2);gt([S()],et.prototype,"loading",2);gt([S()],et.prototype,"pending",2);gt([S()],et.prototype,"saving",2);gt([S()],et.prototype,"toast",2);gt([S()],et.prototype,"aiState",2);gt([S()],et.prototype,"aiValidation",2);gt([S()],et.prototype,"reloading",2);et=gt([E("oig-settings")],et);var Wy=Object.defineProperty,Ky=Object.getOwnPropertyDescriptor,Vt=(e,t,i,r)=>{for(var a=r>1?void 0:r?Ky(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&Wy(t,i,a),a};const ee=X;function Zy(e,t,i,r){const a=Math.abs(e);return a===1?t:a>=2&&a<=4?i:r}function bc(e){return`${e} ${Zy(e,"blok","bloky","bloků")}`}function fc(e){return`${e} přepnutí`}let ki=class extends O{constructor(){super(...arguments),this.open=!1,this.activeTab="today",this.data=null,this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.open&&this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return _d[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return s`
      <div
        class="mode-block ${i?"current":""}"
        style="background: ${t.color}; flex: ${Math.max(e.durationHours,.5)}"
        title="${e.startTime}–${e.endTime} | ${t.label}"
      >
        ${e.modeMatch?null:s`<span class="mode-mismatch">!</span>`}
        <span class="mode-icon">${t.icon}</span>
        <span class="mode-name">${t.label}</span>
        <span class="mode-time">${e.startTime}–${e.endTime}</span>
        ${e.costPlanned!=null?s`
          <span class="mode-cost">${ge(e.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(e,t){const i=t.unit==="Kč"?ge(t.plan):`${t.plan.toFixed(1)} ${t.unit}`;let r="",a="";return t.hasActual&&t.actual!=null&&(a=t.unit==="Kč"?ge(t.actual):`${t.actual.toFixed(1)} ${t.unit}`,t.unit==="Kč"?r=t.actual<=t.plan?"better":"worse":r=t.actual>=t.plan?"better":"worse"),s`
      <div class="metric-tile">
        <div class="metric-label">${e}</div>
        <div class="metric-values">
          <span class="metric-plan">${i}</span>
          ${t.hasActual?s`
            <span class="metric-actual ${r}">(${a})</span>
          `:null}
        </div>
      </div>
    `}render(){const e=["yesterday","today","tomorrow"];return s`
      <div class="dialog" @click=${t=>t.stopPropagation()}>
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
          ${e.map(t=>s`
            <button
              class="tab ${this.activeTab===t?"active":""}"
              @click=${()=>this.onTabClick(t)}
            >
              ${$d[t]}
            </button>
          `)}
        </div>

        <div class="dialog-content">
          ${this.data?this.renderDayContent():s`
            <div class="empty-state">Načítání dat...</div>
          `}
        </div>
      </div>
    `}renderDayContent(){const e=this.data,t=e.summary;return s`
      <!-- Battery savings on the backed-up load only (excludes car + balancing) -->
      ${t.backupSavings!=null?s`
            <div class="backup-savings" title="Jen zálohová spotřeba — bez auta a nabíjení baterie ze sítě">
              <span>Úspora baterie:</span>
              <span class="bs-value ${t.backupSavings>=0?"pos":"neg"}">
                ${t.backupSavings>=0?"+":""}${ge(t.backupSavings)}
              </span>
              <span class="bs-detail">
                záloha ${ge(t.backupActualCost??0)} vs. nedělat nic
                ${ge(t.backupBaselineCost??0)}
              </span>
            </div>
          `:null}

      <!-- Adherence bar -->
      ${e.modeBlocks.length>1&&t.overallAdherence>0?s`
        <div class="adherence-bar">
          <div class="adherence-header">
            <span>Soulad s plánem</span>
            <span>${this.fmtPct(t.overallAdherence)}</span>
          </div>
          <div class="adherence-track">
            <div
              class="adherence-fill"
              style="width: ${t.overallAdherence}%; background: ${this.adherenceColor(t.overallAdherence)}"
            ></div>
          </div>
        </div>
      `:null}

      <!-- Progress (today specific) -->
      ${t.progressPct!=null?s`
        <div class="progress-section">
          <div class="progress-item">
            Průběh: <span class="progress-value">${this.fmtPct(t.progressPct)}</span>
          </div>
          ${t.actualTotalCost!=null?s`
            <div class="progress-item">
              Skutečné: <span class="progress-value">${ge(t.actualTotalCost)}</span>
            </div>
          `:null}
          ${t.planTotalCost!=null?s`
            <div class="progress-item">
              Plán: <span class="progress-value">${ge(t.planTotalCost)}</span>
            </div>
          `:null}
          ${t.vsPlanPct!=null?s`
            <div class="progress-item">
              vs plán: <span class="progress-value" style="color: ${t.vsPlanPct<=100?"#4caf50":"#f44336"}">${this.fmtPct(t.vsPlanPct)}</span>
            </div>
          `:null}
        </div>
      `:null}

      <!-- EOD prediction -->
      ${t.eodPrediction?s`
        <div class="eod-prediction">
          Predikce konce dne: <span class="eod-value">${ge(t.eodPrediction.predictedTotal)}</span>
          ${t.eodPrediction.predictedSavings>0?s`
            <span class="eod-savings"> (úspora ${ge(t.eodPrediction.predictedSavings)})</span>
          `:null}
        </div>
      `:null}

      <!-- Metrics grid -->
      <div class="metrics-grid">
        ${this.renderMetricTile("Náklady zálohy (vs nedělat nic)",t.metrics.cost)}
        ${this.renderMetricTile("Solár",t.metrics.solar)}
        ${this.renderMetricTile("Spotřeba",t.metrics.consumption)}
        ${this.renderMetricTile("Síť",t.metrics.grid)}
      </div>

      <!-- Mode blocks timeline -->
      ${e.modeBlocks.length>0?s`
        <div class="modes-section">
          <div class="section-title">Režimy (${bc(e.modeBlocks.length)}, ${fc(t.modeSwitches)})</div>
          <div class="mode-blocks-timeline">
            ${e.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}

      <!-- Comparison plan (if available) -->
      ${e.comparison?s`
        <div class="modes-section">
          <div class="section-title">Srovnání: ${e.comparison.plan}</div>
          <div class="mode-blocks-timeline">
            ${e.comparison.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}
    `}};ki.styles=z`
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
      background: ${ee(d.cardBg)};
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
      border-bottom: 1px solid ${ee(d.divider)};
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${ee(d.textPrimary)};
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
      color: ${ee(d.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${ee(d.bgSecondary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${ee(d.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${ee(d.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 12px 16px;
      border: none;
      background: transparent;
      font-size: 13px;
      color: ${ee(d.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${ee(d.textPrimary)};
    }

    .tab.active {
      color: ${ee(d.accent)};
      border-bottom-color: ${ee(d.accent)};
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
      color: ${ee(d.textSecondary)};
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
      background: ${ee(d.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
    }

    .metric-label {
      font-size: 11px;
      color: ${ee(d.textSecondary)};
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
      color: ${ee(d.textPrimary)};
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
      color: ${ee(d.textPrimary)};
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
      color: ${ee(d.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${ee(d.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${ee(d.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 12px;
      color: ${ee(d.textSecondary)};
    }

    .eod-value {
      font-size: 16px;
      font-weight: 600;
      color: ${ee(d.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: ${ee(d.textSecondary)};
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
  `;Vt([m({type:Boolean,reflect:!0})],ki.prototype,"open",2);Vt([m({type:String})],ki.prototype,"activeTab",2);Vt([m({type:Object})],ki.prototype,"data",2);Vt([S()],ki.prototype,"autoRefresh",2);ki=Vt([E("oig-timeline-dialog")],ki);let lr=class extends O{constructor(){super(...arguments),this.data=null,this.activeTab="today",this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return _d[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return s`
      <div
        class="mode-block ${i?"current":""}"
        style="background: ${t.color}; flex: ${Math.max(e.durationHours,.5)}"
        title="${e.startTime}–${e.endTime} | ${t.label}"
      >
        ${e.modeMatch?null:s`<span class="mode-mismatch">!</span>`}
        <span class="mode-icon">${t.icon}</span>
        <span class="mode-name">${t.label}</span>
        <span class="mode-time">${e.startTime}–${e.endTime}</span>
        ${e.costPlanned!=null?s`
          <span class="mode-cost">${ge(e.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(e,t){const i=t.unit==="Kč"?ge(t.plan):`${t.plan.toFixed(1)} ${t.unit}`;let r="",a="";return t.hasActual&&t.actual!=null&&(a=t.unit==="Kč"?ge(t.actual):`${t.actual.toFixed(1)} ${t.unit}`,t.unit==="Kč"?r=t.actual<=t.plan?"better":"worse":r=t.actual>=t.plan?"better":"worse"),s`
      <div class="metric-tile">
        <div class="metric-label">${e}</div>
        <div class="metric-values">
          <span class="metric-plan">${i}</span>
          ${t.hasActual?s`
            <span class="metric-actual ${r}">(${a})</span>
          `:null}
        </div>
      </div>
    `}render(){const e=["yesterday","today","tomorrow"];return s`
      <div class="tile">
        <div class="tile-header">
          <span class="tile-title">📊 Plán &amp; realita</span>
          <label class="auto-refresh">
            <input type="checkbox" .checked=${this.autoRefresh} @change=${this.toggleAutoRefresh} />
            Auto
          </label>
        </div>

        <div class="tabs">
          ${e.map(t=>s`
            <button
              class="tab ${this.activeTab===t?"active":""}"
              @click=${()=>this.onTabClick(t)}
            >
              ${$d[t]}
            </button>
          `)}
        </div>

        <div class="tile-content">
          ${this.data?this.renderDayContent():s`
            <div class="empty-state">Načítání dat...</div>
          `}
        </div>
      </div>
    `}renderDayContent(){const e=this.data,t=e.summary;return s`
      <!-- Battery savings on the backed-up load only (excludes car + balancing) -->
      ${t.backupSavings!=null?s`
            <div class="backup-savings" title="Jen zálohová spotřeba — bez auta a nabíjení baterie ze sítě">
              <span>Úspora baterie:</span>
              <span class="bs-value ${t.backupSavings>=0?"pos":"neg"}">
                ${t.backupSavings>=0?"+":""}${ge(t.backupSavings)}
              </span>
              <span class="bs-detail">
                záloha ${ge(t.backupActualCost??0)} vs. nedělat nic
                ${ge(t.backupBaselineCost??0)}
              </span>
            </div>
          `:null}

      <!-- Adherence bar -->
      ${e.modeBlocks.length>1&&t.overallAdherence>0?s`
        <div class="adherence-bar">
          <div class="adherence-header">
            <span>Soulad s plánem</span>
            <span>${this.fmtPct(t.overallAdherence)}</span>
          </div>
          <div class="adherence-track">
            <div
              class="adherence-fill"
              style="width: ${t.overallAdherence}%; background: ${this.adherenceColor(t.overallAdherence)}"
            ></div>
          </div>
        </div>
      `:null}

      <!-- Progress (today specific) -->
      ${t.progressPct!=null?s`
        <div class="progress-section">
          <div class="progress-item">
            Průběh: <span class="progress-value">${this.fmtPct(t.progressPct)}</span>
          </div>
          ${t.actualTotalCost!=null?s`
            <div class="progress-item">
              Skutečné: <span class="progress-value">${ge(t.actualTotalCost)}</span>
            </div>
          `:null}
          ${t.planTotalCost!=null?s`
            <div class="progress-item">
              Plán: <span class="progress-value">${ge(t.planTotalCost)}</span>
            </div>
          `:null}
          ${t.vsPlanPct!=null?s`
            <div class="progress-item">
              vs plán: <span class="progress-value" style="color: ${t.vsPlanPct<=100?"#4caf50":"#f44336"}">${this.fmtPct(t.vsPlanPct)}</span>
            </div>
          `:null}
        </div>
      `:null}

      <!-- EOD prediction -->
      ${t.eodPrediction?s`
        <div class="eod-prediction">
          Predikce konce dne: <span class="eod-value">${ge(t.eodPrediction.predictedTotal)}</span>
          ${t.eodPrediction.predictedSavings>0?s`
            <span class="eod-savings"> (úspora ${ge(t.eodPrediction.predictedSavings)})</span>
          `:null}
        </div>
      `:null}

      <!-- Metrics grid -->
      <div class="metrics-grid">
        ${this.renderMetricTile("Náklady zálohy (vs nedělat nic)",t.metrics.cost)}
        ${this.renderMetricTile("Solár",t.metrics.solar)}
        ${this.renderMetricTile("Spotřeba",t.metrics.consumption)}
        ${this.renderMetricTile("Síť",t.metrics.grid)}
      </div>

      <!-- Mode blocks timeline -->
      ${e.modeBlocks.length>0?s`
        <div class="modes-section">
          <div class="section-title">Režimy (${bc(e.modeBlocks.length)}, ${fc(t.modeSwitches)})</div>
          <div class="mode-blocks-timeline">
            ${e.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}

      <!-- Comparison plan (if available) -->
      ${e.comparison?s`
        <div class="modes-section">
          <div class="section-title">Srovnání: ${e.comparison.plan}</div>
          <div class="mode-blocks-timeline">
            ${e.comparison.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}
    `}};lr.styles=z`
    :host {
      display: block;
    }

    .tile {
      background: ${ee(d.cardBg)};
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
      border-bottom: 1px solid ${ee(d.divider)};
    }

    .tile-title {
      font-size: 13px;
      font-weight: 600;
      color: ${ee(d.textPrimary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${ee(d.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${ee(d.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 6px 10px;
      border: none;
      background: transparent;
      font-size: 11px;
      color: ${ee(d.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${ee(d.textPrimary)};
    }

    .tab.active {
      color: ${ee(d.accent)};
      border-bottom-color: ${ee(d.accent)};
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
      color: ${ee(d.textSecondary)};
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
      background: ${ee(d.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
    }

    .metric-label {
      font-size: 10px;
      color: ${ee(d.textSecondary)};
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
      color: ${ee(d.textPrimary)};
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
      color: ${ee(d.textPrimary)};
      margin-bottom: 8px;
    }

    .mode-blocks-timeline {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      padding: 2px 0;
    }

    .mode-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      padding: 5px 8px;
      border-radius: 8px;
      font-size: 10px;
      color: #fff;
      min-width: 56px;
      min-height: 40px;
      position: relative;
      cursor: default;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 3px rgba(0,0,0,0.25);
    }

    .mode-block.current {
      box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(255,255,255,0.3);
    }

    .mode-block .mode-icon { font-size: 15px; line-height: 1; }
    .mode-block .mode-time { font-size: 9px; opacity: 0.85; }
    .mode-block .mode-name { font-size: 10px; font-weight: 600; letter-spacing: 0.2px; }

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
      color: ${ee(d.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${ee(d.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${ee(d.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${ee(d.textSecondary)};
    }

    .eod-value {
      font-size: 14px;
      font-weight: 600;
      color: ${ee(d.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 24px 16px;
      color: ${ee(d.textSecondary)};
      font-size: 12px;
    }

    /* ---- Battery savings (záloha-only, fair) ---- */
    .backup-savings {
      background: ${ee(d.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${ee(d.textSecondary)};
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 6px;
    }

    .backup-savings .bs-value {
      font-size: 15px;
      font-weight: 700;
    }

    .backup-savings .bs-value.pos { color: var(--success-color, #4caf50); }
    .backup-savings .bs-value.neg { color: var(--error-color, #f44336); }

    .backup-savings .bs-detail {
      font-size: 10px;
      opacity: 0.8;
    }
  `;Vt([m({type:Object})],lr.prototype,"data",2);Vt([m({type:String})],lr.prototype,"activeTab",2);Vt([S()],lr.prototype,"autoRefresh",2);lr=Vt([E("oig-timeline-tile")],lr);var qy=Object.defineProperty,Gy=Object.getOwnPropertyDescriptor,Xt=(e,t,i,r)=>{for(var a=r>1?void 0:r?Gy(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&qy(t,i,a),a};const Ae=X;let dr=class extends O{constructor(){super(...arguments),this.data=null,this.editMode=!1,this.tileType="entity"}onTileClick(){var t;if(this.editMode)return;const e=(t=this.data)==null?void 0:t.config;e&&(e.type==="button"&&e.action?I1(e.entity_id,e.action):J.openEntityDialog(e.entity_id))}onSupportClick(e,t){e.stopPropagation(),!this.editMode&&J.openEntityDialog(t)}onEdit(){var e;this.dispatchEvent(new CustomEvent("edit-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}onDelete(){var e;this.dispatchEvent(new CustomEvent("delete-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}render(){var c,p;if(!this.data)return null;const e=this.data.config,t=e.type==="button";this.tileType!==e.type&&(this.tileType=e.type??"entity");const i=e.color||"",r=e.icon||(t?"⚡":"📊"),a=Le(r),n=(c=e.support_entities)==null?void 0:c.top_right,o=(p=e.support_entities)==null?void 0:p.bottom_right,l=this.data.supportValues.topRight||this.data.supportValues.bottomRight;return s`
      ${i?s`<style>:host { --tile-color: ${Ae(i)}; }</style>`:null}

      <div class="tile-top" @click=${this.onTileClick} title=${this.editMode?"":e.entity_id}>
        <span class="tile-icon">${a}</span>
        <span class="tile-label">${e.label||""}</span>
        ${l?s`
          <div class="support-values">
            ${this.data.supportValues.topRight?s`
              <span
                class="support-value ${n&&!this.editMode?"clickable":""}"
                @click=${n&&!this.editMode?u=>this.onSupportClick(u,n):null}
              >${this.data.supportValues.topRight.value} ${this.data.supportValues.topRight.unit}</span>
            `:null}
            ${this.data.supportValues.bottomRight?s`
              <span
                class="support-value ${o&&!this.editMode?"clickable":""}"
                @click=${o&&!this.editMode?u=>this.onSupportClick(u,o):null}
              >${this.data.supportValues.bottomRight.value} ${this.data.supportValues.bottomRight.unit}</span>
            `:null}
          </div>
        `:null}
      </div>

      <div class="tile-main" @click=${this.onTileClick}>
        <span class="tile-value">${this.data.value}</span>
        ${this.data.unit?s`<span class="tile-unit">${this.data.unit}</span>`:null}
        ${t?s`
          <span class="state-dot ${this.data.isActive?"on":"off"}"></span>
        `:null}
      </div>

      ${this.editMode?s`
        <div class="edit-actions">
          <button class="edit-btn" @click=${this.onEdit}>⚙</button>
          <button class="delete-btn" @click=${this.onDelete}>✕</button>
        </div>
      `:null}
    `}};dr.styles=z`
    /* ===== BASE ===== */
    :host {
      display: flex;
      flex-direction: column;
      padding: 7px 9px;
      background: ${Ae(d.cardBg)};
      border-radius: 10px;
      box-shadow: ${Ae(d.cardShadow)};
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
      color: ${Ae(d.textSecondary)};
      opacity: 0.45;
      font-style: normal;
    }

    /* ===== BUTTON TILE ===== */
    :host([tiletype="button"]) {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--tile-color, ${Ae(d.accent)}) 10%, ${Ae(d.cardBg)}),
        ${Ae(d.cardBg)}
      );
      border: 1px solid color-mix(in srgb, var(--tile-color, ${Ae(d.accent)}) 38%, transparent);
    }

    :host([tiletype="button"]:not([editmode]):hover) {
      transform: translateY(-2px);
      cursor: pointer;
      box-shadow:
        0 4px 14px color-mix(in srgb, var(--tile-color, ${Ae(d.accent)}) 28%, transparent),
        ${Ae(d.cardShadow)};
    }

    :host([tiletype="button"]:not([editmode]):active) {
      transform: translateY(0) scale(0.98);
      opacity: 0.85;
    }

    :host([tiletype="button"]) .tile-icon {
      background: color-mix(in srgb, var(--tile-color, ${Ae(d.accent)}) 18%, transparent);
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
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
      gap: 5px;
      min-width: 0;
      margin-bottom: 2px;
    }

    .tile-icon {
      font-size: 15px;
      line-height: 1;
      flex-shrink: 0;
      width: 18px;
      text-align: center;
    }
    .oig-mdi { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; display: inline-block; }

    .tile-label {
      flex: 1;
      font-size: 10px;
      font-weight: 500;
      color: ${Ae(d.textSecondary)};
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
      font-size: 9px;
      font-weight: 500;
      color: ${Ae(d.textSecondary)};
      white-space: nowrap;
      line-height: 1.2;
    }

    .support-value.clickable {
      cursor: pointer;
    }

    .support-value.clickable:hover {
      text-decoration: underline;
      color: ${Ae(d.textPrimary)};
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
      font-size: 15px;
      font-weight: 700;
      color: ${Ae(d.textPrimary)};
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .tile-unit {
      font-size: 10px;
      font-weight: 400;
      color: ${Ae(d.textSecondary)};
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
      background: ${Ae(d.success)};
      box-shadow: 0 0 4px ${Ae(d.success)};
    }

    .state-dot.off {
      background: ${Ae(d.textSecondary)};
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
      background: ${Ae(d.bgSecondary)};
      border-radius: 50%;
      font-size: 9px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .delete-btn:hover {
      background: ${Ae(d.error)};
      color: #fff;
    }
  `;Xt([m({type:Object})],dr.prototype,"data",2);Xt([m({type:Boolean})],dr.prototype,"editMode",2);Xt([m({type:String,reflect:!0})],dr.prototype,"tileType",2);dr=Xt([E("oig-tile")],dr);let cr=class extends O{constructor(){super(...arguments),this.tiles=[],this.editMode=!1,this.position="left"}render(){return this.tiles.length===0?s`<div class="empty-state">Žádné dlaždice</div>`:s`
      ${this.tiles.map(e=>s`
        <oig-tile
          .data=${e}
          .editMode=${this.editMode}
          .tileType=${e.config.type??"entity"}
          class="${e.isZero?"inactive":""}"
        ></oig-tile>
      `)}
    `}};cr.styles=z`
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
      gap: 6px;
      min-width: 0;
    }

    .empty-state {
      grid-column: 1 / -1;
      font-size: 12px;
      color: ${Ae(d.textSecondary)};
      padding: 8px;
      text-align: center;
      opacity: 0.6;
    }
  `;Xt([m({type:Array})],cr.prototype,"tiles",2);Xt([m({type:Boolean})],cr.prototype,"editMode",2);Xt([m({type:String,reflect:!0})],cr.prototype,"position",2);cr=Xt([E("oig-tiles-container")],cr);var Uy=Object.defineProperty,Yy=Object.getOwnPropertyDescriptor,rs=(e,t,i,r)=>{for(var a=r>1?void 0:r?Yy(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&Uy(t,i,a),a};const _e=X,Kl={Spotrebice:["fridge","fridge-outline","dishwasher","washing-machine","tumble-dryer","stove","microwave","coffee-maker","kettle","toaster","blender","food-processor","rice-cooker","slow-cooker","pressure-cooker","air-fryer","oven","range-hood"],Osvetleni:["lightbulb","lightbulb-outline","lamp","ceiling-light","floor-lamp","led-strip","led-strip-variant","wall-sconce","chandelier","desk-lamp","spotlight","light-switch"],"Vytapeni & Chlazeni":["thermometer","thermostat","radiator","radiator-disabled","heat-pump","air-conditioner","fan","hvac","fire","snowflake","fireplace","heating-coil"],"Energie & Baterie":["lightning-bolt","flash","battery","battery-charging","battery-50","battery-10","solar-panel","solar-power","meter-electric","power-plug","power-socket","ev-plug","transmission-tower","current-ac","current-dc"],"Auto & Doprava":["car","car-electric","car-battery","ev-station","ev-plug-type2","garage","garage-open","motorcycle","bicycle","scooter","bus","train","airplane"],Zabezpeceni:["door","door-open","lock","lock-open","shield-home","cctv","camera","motion-sensor","alarm-light","bell","eye","key","fingerprint","shield-check"],"Okna & Stineni":["window-closed","window-open","blinds","blinds-open","curtains","roller-shade","window-shutter","balcony","door-sliding"],"Media & Zabava":["television","speaker","speaker-wireless","music","volume-high","cast","chromecast","radio","headphones","microphone","gamepad","movie","spotify"],"Sit & IT":["router-wireless","wifi","access-point","lan","network","home-assistant","server","nas","cloud","ethernet","bluetooth","cellphone","tablet","laptop"],"Voda & Koupelna":["water","water-percent","water-boiler","water-pump","shower","toilet","faucet","pipe","bathtub","sink","water-heater","pool"],Pocasi:["weather-sunny","weather-cloudy","weather-night","weather-rainy","weather-snowy","weather-windy","weather-fog","weather-lightning","weather-hail","temperature","humidity","barometer"],"Ventilace & Kvalita vzduchu":["fan","air-filter","air-purifier","smoke-detector","co2","wind-turbine"],"Zahrada & Venku":["flower","tree","sprinkler","grass","garden-light","outdoor-lamp","grill","pool","hot-tub","umbrella","thermometer-lines"],Domacnost:["iron","vacuum","broom","mop","washing","basket","hanger","scissors"],"Notifikace & Stav":["information","help-circle","alert-circle","checkbox-marked-circle","check","close","minus","plus","arrow-up","arrow-down","refresh","sync","bell-ring"],Ovladani:["toggle-switch","power","play","pause","stop","skip-next","skip-previous","volume-up","volume-down","brightness-up","brightness-down"],"Cas & Planovani":["clock","timer","alarm","calendar","calendar-clock","schedule","history"],Ostatni:["home","cog","tools","wrench","hammer","chart-line","gauge","dots-vertical","menu","settings","account","logout"]};let sa=class extends O{constructor(){super(...arguments),this.isOpen=!1,this.searchQuery=""}get filteredCategories(){const e=this.searchQuery.trim().toLowerCase();if(!e)return Kl;const t=Object.entries(Kl).map(([i,r])=>{const a=r.filter(n=>n.toLowerCase().includes(e));return[i,a]}).filter(([,i])=>i.length>0);return Object.fromEntries(t)}open(){this.isOpen=!0}close(){this.isOpen=!1,this.searchQuery=""}onOverlayClick(e){e.target===e.currentTarget&&this.close()}onSearchInput(e){const t=e.target;this.searchQuery=(t==null?void 0:t.value)??""}onIconClick(e){this.dispatchEvent(new CustomEvent("icon-selected",{detail:{icon:`mdi:${e}`},bubbles:!0,composed:!0})),this.close()}render(){if(!this.isOpen)return null;const e=this.filteredCategories,t=Object.entries(e);return s`
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
            ${t.length===0?s`
              <div class="empty">Žádné ikony nenalezeny</div>
            `:t.map(([i,r])=>s`
              <div class="category">
                <div class="category-title">${i}</div>
                <div class="icon-grid">
                  ${r.map(a=>s`
                    <button class="icon-item" type="button" @click=${()=>this.onIconClick(a)}>
                      <span class="icon-emoji">${Le(`mdi:${a}`)}</span>
                      <span class="icon-name">${a}</span>
                    </button>
                  `)}
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}};sa.styles=z`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${_e(d.bgPrimary)} 35%, transparent);
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
      background: ${_e(d.cardBg)};
      box-shadow: ${_e(d.cardShadow)};
      border-radius: 14px;
      border: 1px solid ${_e(d.divider)};
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
      border-bottom: 1px solid ${_e(d.divider)};
      gap: 12px;
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${_e(d.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${_e(d.bgSecondary)};
      color: ${_e(d.textPrimary)};
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
      background: ${_e(d.divider)};
      transform: scale(1.05);
    }

    .search {
      padding: 12px 18px;
      border-bottom: 1px solid ${_e(d.divider)};
      background: ${_e(d.bgSecondary)};
    }

    .search input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${_e(d.divider)};
      background: ${_e(d.bgPrimary)};
      color: ${_e(d.textPrimary)};
      font-size: 13px;
      outline: none;
    }

    .search input::placeholder {
      color: ${_e(d.textSecondary)};
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
      color: ${_e(d.textSecondary)};
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
      background: ${_e(d.bgSecondary)};
      cursor: pointer;
      transition: transform 0.15s ease, border 0.2s ease, background 0.2s ease;
      text-align: center;
      font-size: 10px;
      color: ${_e(d.textSecondary)};
    }

    .icon-item:hover {
      background: ${_e(d.bgPrimary)};
      border-color: ${_e(d.accent)};
      transform: translateY(-2px);
      color: ${_e(d.textPrimary)};
    }

    .icon-emoji {
      font-size: 22px;
      line-height: 1;
      color: ${_e(d.textPrimary)};
    }
    .oig-mdi { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; display: inline-block; }

    .icon-name {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      font-size: 12px;
      color: ${_e(d.textSecondary)};
      text-align: center;
      padding: 24px 0 12px;
    }
  `;rs([m({type:Boolean,reflect:!0,attribute:"open"})],sa.prototype,"isOpen",2);rs([S()],sa.prototype,"searchQuery",2);sa=rs([E("oig-icon-picker")],sa);var Qy=Object.defineProperty,Xy=Object.getOwnPropertyDescriptor,De=(e,t,i,r)=>{for(var a=r>1?void 0:r?Xy(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&Qy(t,i,a),a};const Zl=Object.keys(Md),Jy=["#42a5f5","#43a047","#ffa726","#ef5350","#ab47bc","#26c6da","#8d6e63","#ec407a"],j=X;let Ce=class extends O{constructor(){super(...arguments),this.isOpen=!1,this.tileIndex=-1,this.tileSide="left",this.existingConfig=null,this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconSearch=""}loadTileConfig(e){var t,i;this.currentTab=e.type,e.type==="entity"?this.selectedEntityId=e.entity_id:this.selectedButtonEntityId=e.entity_id,this.label=e.label||"",this.icon=e.icon||"",this.color=e.color||"#03A9F4",this.action=e.action||"toggle",this.supportEntity1=((t=e.support_entities)==null?void 0:t.top_right)||"",this.supportEntity2=((i=e.support_entities)==null?void 0:i.bottom_right)||""}resetForm(){this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconSearch=""}handleClose(){this.isOpen=!1,this.resetForm(),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}getEntities(){const e=It();return e?e.getAll():{}}getEntityItems(e,t){const i=t.trim().toLowerCase(),r=this.getEntities();return Object.entries(r).filter(([n])=>e.some(o=>n.startsWith(o))).map(([n,o])=>{const l=this.getAttributeValue(o,"friendly_name")||n,c=this.getAttributeValue(o,"unit_of_measurement"),p=this.getAttributeValue(o,"icon");return{id:n,name:l,value:o.state,unit:c,icon:p,state:o}}).filter(n=>i?n.name.toLowerCase().includes(i)||n.id.toLowerCase().includes(i):!0).sort((n,o)=>n.name.localeCompare(o.name))}getSupportEntities(e){const t=e.trim().toLowerCase();if(!t)return[];const i=this.getEntities();return Object.entries(i).map(([r,a])=>{const n=this.getAttributeValue(a,"friendly_name")||r,o=this.getAttributeValue(a,"unit_of_measurement"),l=this.getAttributeValue(a,"icon");return{id:r,name:n,value:a.state,unit:o,icon:l,state:a}}).filter(r=>r.name.toLowerCase().includes(t)||r.id.toLowerCase().includes(t)).sort((r,a)=>r.name.localeCompare(a.name)).slice(0,20)}getDisplayIcon(e){return Le(e||"mdi:gauge")}getColorForEntity(e){switch(e.split(".")[0]){case"sensor":return"#03A9F4";case"binary_sensor":return"#4CAF50";case"switch":return"#FFC107";case"light":return"#FF9800";case"fan":return"#00BCD4";case"input_boolean":return"#9C27B0";default:return"#03A9F4"}}applyEntityDefaults(e){if(!e)return;const i=this.getEntities()[e];if(!i)return;this.label||(this.label=this.getAttributeValue(i,"friendly_name"));const r=this.getAttributeValue(i,"icon");!this.icon&&r&&(this.icon=r),this.color=this.getColorForEntity(e)}handleEntitySelect(e){this.selectedEntityId=e,this.applyEntityDefaults(e)}handleButtonEntitySelect(e){this.selectedButtonEntityId=e,this.applyEntityDefaults(e)}handleSupportInput(e,t){const i=t.trim();e===1?(this.supportSearch1=t,this.showSupportList1=!!i,i||(this.supportEntity1="")):(this.supportSearch2=t,this.showSupportList2=!!i,i||(this.supportEntity2=""))}handleSupportSelect(e,t){const i=t.name||t.id;e===1?(this.supportEntity1=t.id,this.supportSearch1=i,this.showSupportList1=!1):(this.supportEntity2=t.id,this.supportSearch2=i,this.showSupportList2=!1)}getSupportInputValue(e,t){if(e)return e;if(!t)return"";const i=this.getEntities()[t];return i&&this.getAttributeValue(i,"friendly_name")||t}getAttributeValue(e,t){var r;const i=(r=e.attributes)==null?void 0:r[t];return i==null?"":String(i)}handleSave(){const e=this.currentTab==="entity"?this.selectedEntityId:this.selectedButtonEntityId;if(!e){window.alert("Vyberte entitu");return}const t={top_right:this.supportEntity1||void 0,bottom_right:this.supportEntity2||void 0},i={type:this.currentTab,entity_id:e,label:this.label||void 0,icon:this.icon||void 0,color:this.color||void 0,action:this.currentTab==="button"?this.action:void 0,support_entities:t};this.dispatchEvent(new CustomEvent("tile-saved",{detail:{index:this.tileIndex,side:this.tileSide,config:i},bubbles:!0,composed:!0})),this.handleClose()}renderEntityList(e,t,i,r){const a=this.getEntityItems(e,t);return a.length===0?s`<div class="support-empty">Žádné entity nenalezeny</div>`:s`
      ${a.map(n=>s`
        <div
          class="entity-item ${i===n.id?"selected":""}"
          @click=${()=>r(n.id)}
        >
          <div class="entity-icon">${this.getDisplayIcon(n.icon)}</div>
          <div class="entity-meta">
            <div class="entity-name">${n.name}</div>
            <div class="entity-sub">
              <span>${n.id}</span>
              <span>${n.value} ${n.unit}</span>
            </div>
          </div>
        </div>
      `)}
    `}renderSupportList(e,t){const i=this.getSupportEntities(e);return i.length===0?s`<div class="support-empty">Žádné entity nenalezeny</div>`:s`
      ${i.map(r=>s`
        <div
          class="support-item"
          @mousedown=${()=>this.handleSupportSelect(t,r)}
        >
          <div class="support-name">${r.name}</div>
          <div class="support-value">${r.value} ${r.unit}</div>
        </div>
      `)}
    `}get isButtonType(){return this.currentTab==="button"}get selectedId(){return this.isButtonType?this.selectedButtonEntityId:this.selectedEntityId}get entityDomains(){return this.isButtonType?["switch.","light.","fan.","input_boolean."]:["sensor.","binary_sensor."]}get entitySearch(){return this.isButtonType?this.buttonSearchText:this.entitySearchText}setEntitySearch(e){this.isButtonType?this.buttonSearchText=e:this.entitySearchText=e}selectEntity(e){this.isButtonType?this.handleButtonEntitySelect(e):this.handleEntitySelect(e)}renderPreview(){const e=this.selectedId,t=e?this.getEntities()[e]:null,i=this.label||(t?this.getAttributeValue(t,"friendly_name"):"")||e||"Nová dlaždice",r=t?String(t.state):"—",a=t?this.getAttributeValue(t,"unit_of_measurement"):"",n=this.icon||(this.isButtonType?"⚡":"📊");return s`
      <div class="pvwrap">
        <span class="pvlbl">náhled</span>
        <div class="ptile" style="--pc:${this.color}">
          <div class="pi">${Le(n)}</div>
          <div class="pm">
            <div class="pn">${i}</div>
            <div class="pv">${r}${a?s` <small>${a}</small>`:""}</div>
          </div>
        </div>
      </div>
    `}renderIconGrid(){const e=this.iconSearch.trim().toLowerCase(),t=e?Zl.filter(i=>i.includes(e)):Zl;return s`
      <input
        class="input"
        type="text"
        placeholder="🔍 Hledat ikonu..."
        .value=${this.iconSearch}
        @input=${i=>{this.iconSearch=i.target.value}}
      />
      <div class="igrid">
        ${t.length===0?s`<div class="igrid-empty">Nic nenalezeno</div>`:t.map(i=>s`
            <button
              class="ig ${this.icon===`mdi:${i}`?"sel":""}"
              type="button"
              title=${i}
              @click=${()=>{this.icon=`mdi:${i}`}}
            >${Le(`mdi:${i}`)}</button>
          `)}
      </div>
    `}renderColorSwatches(){return s`
      <div class="sw">
        ${Jy.map(e=>s`
          <button
            class="sc ${this.color.toLowerCase()===e?"sel":""}"
            type="button"
            style="background:${e}"
            title=${e}
            @click=${()=>{this.color=e}}
          ></button>
        `)}
        <input
          type="color"
          .value=${this.color}
          @input=${e=>{this.color=e.target.value}}
        />
      </div>
    `}render(){if(!this.isOpen)return null;const e=this.tileIndex>=0||!!this.existingConfig;return s`
      <div class="overlay" @click=${t=>{t.target===t.currentTarget&&this.handleClose()}}>
        <div class="dialog" @click=${t=>t.stopPropagation()}>
          <div class="header">
            <div class="title">${e?"Upravit dlaždici":"Nová dlaždice"}</div>
            <button class="close-btn" type="button" @click=${this.handleClose} aria-label="Zavřít">×</button>
          </div>

          <div class="content">
            <div class="seg">
              <button class="${this.isButtonType?"":"on"}" type="button"
                @click=${()=>{this.currentTab="entity"}}>
                ${Le("mdi:chart-box")} Senzor
              </button>
              <button class="${this.isButtonType?"on":""}" type="button"
                @click=${()=>{this.currentTab="button",this.color==="#03A9F4"&&(this.color="#FFC107")}}>
                ${Le("mdi:flash")} Tlačítko
              </button>
            </div>

            ${this.renderPreview()}

            <div class="sec">
              <div class="sect"><span class="n">1</span> Entita</div>
              ${this.isButtonType?s`
                <select
                  .value=${this.action}
                  @change=${t=>{this.action=t.target.value}}
                >
                  <option value="toggle">Akce: Přepnout (Toggle)</option>
                  <option value="turn_on">Akce: Zapnout</option>
                  <option value="turn_off">Akce: Vypnout</option>
                </select>
              `:null}
              <input
                class="input"
                type="text"
                placeholder="🔍 Hledat entitu..."
                .value=${this.entitySearch}
                @input=${t=>{this.setEntitySearch(t.target.value)}}
              />
              <div class="entity-list">
                ${this.renderEntityList(this.entityDomains,this.entitySearch,this.selectedId,t=>this.selectEntity(t))}
              </div>
            </div>

            <div class="sec">
              <div class="sect"><span class="n">2</span> Vzhled</div>
              <div class="form-group">
                <label>Popisek (volitelné)</label>
                <input
                  class="input"
                  type="text"
                  placeholder="Např. Lednice v garáži"
                  .value=${this.label}
                  @input=${t=>{this.label=t.target.value}}
                />
              </div>
              <div class="form-group">
                <label>Ikona</label>
                ${this.renderIconGrid()}
              </div>
              <div class="form-group">
                <label>Barva</label>
                ${this.renderColorSwatches()}
              </div>
            </div>

            <div class="sec">
              <div class="sect"><span class="n">3</span> Doplňky <span class="opt">(2 hodnoty v rozích, volitelné)</span></div>
              <div class="row">
                <div class="form-group support-field">
                  <label>↗ Pravý horní</label>
                  <input
                    class="input"
                    type="text"
                    placeholder="🔍 entita..."
                    .value=${this.getSupportInputValue(this.supportSearch1,this.supportEntity1)}
                    @input=${t=>{this.handleSupportInput(1,t.target.value)}}
                    @focus=${()=>{this.supportSearch1.trim()&&(this.showSupportList1=!0)}}
                    @blur=${()=>{this.showSupportList1=!1}}
                  />
                  ${this.showSupportList1?s`<div class="support-list">${this.renderSupportList(this.supportSearch1,1)}</div>`:null}
                </div>
                <div class="form-group support-field">
                  <label>↘ Pravý dolní</label>
                  <input
                    class="input"
                    type="text"
                    placeholder="🔍 entita..."
                    .value=${this.getSupportInputValue(this.supportSearch2,this.supportEntity2)}
                    @input=${t=>{this.handleSupportInput(2,t.target.value)}}
                    @focus=${()=>{this.supportSearch2.trim()&&(this.showSupportList2=!0)}}
                    @blur=${()=>{this.showSupportList2=!1}}
                  />
                  ${this.showSupportList2?s`<div class="support-list">${this.renderSupportList(this.supportSearch2,2)}</div>`:null}
                </div>
              </div>
            </div>
          </div>

          <div class="footer">
            <button class="btn btn-secondary" type="button" @click=${this.handleClose}>Zrušit</button>
            <button class="btn btn-primary" type="button" @click=${this.handleSave}>${e?"Uložit změny":"Uložit dlaždici"}</button>
          </div>
        </div>
      </div>
    `}};Ce.styles=z`
    :host {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      font-family: ${j(d.fontFamily)};
    }

    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${j(d.bgPrimary)} 35%, transparent);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .dialog {
      width: min(460px, 100%);
      max-height: 88vh;
      background: ${j(d.cardBgSolid)};
      border: 1px solid ${j(d.divider)};
      border-radius: 16px;
      box-shadow: ${j(d.cardShadow)};
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
      border-bottom: 1px solid ${j(d.divider)};
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${j(d.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${j(d.bgSecondary)};
      color: ${j(d.textPrimary)};
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
      background: ${j(d.divider)};
      transform: scale(1.05);
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 18px;
      background: ${j(d.bgSecondary)};
      border-bottom: 1px solid ${j(d.divider)};
    }

    .tab-btn {
      border: 1px solid transparent;
      background: ${j(d.cardBg)};
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: ${j(d.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: border 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }

    .tab-btn.active {
      border-color: ${j(d.accent)};
      color: ${j(d.textPrimary)};
      transform: translateY(-1px);
    }

    .content {
      padding: 16px 18px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* ── type segment ── */
    .seg { display: flex; gap: 8px; }
    .seg button {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 9px; border-radius: 10px; border: 1px solid ${j(d.divider)};
      background: rgba(0,0,0,.18); color: ${j(d.textSecondary)};
      font-weight: 700; font-size: 13px; cursor: pointer; font-family: inherit;
    }
    .seg button.on { border-color: ${j(d.accent)}; background: color-mix(in srgb, ${j(d.accent)} 16%, transparent); color: ${j(d.textPrimary)}; }
    .seg .oig-mdi { width: 16px; height: 16px; }

    /* ── live preview ── */
    .pvwrap { display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,.22); border: 1px dashed ${j(d.divider)}; border-radius: 12px; padding: 12px; }
    .pvlbl { font-size: 8px; font-weight: 800; opacity: .45; text-transform: uppercase; letter-spacing: .5px; writing-mode: vertical-rl; transform: rotate(180deg); }
    .ptile { flex: 1; background: linear-gradient(160deg, #222a40, #1a2034); border-left: 3px solid var(--pc, ${j(d.accent)}); border-radius: 10px; padding: 9px 11px; display: flex; align-items: center; gap: 9px; }
    .ptile .pi { width: 30px; height: 30px; border-radius: 8px; background: color-mix(in srgb, var(--pc, ${j(d.accent)}) 22%, transparent); display: grid; place-items: center; color: var(--pc, ${j(d.accent)}); font-size: 18px; }
    .ptile .pi .oig-mdi { width: 18px; height: 18px; }
    .ptile .pm { flex: 1; min-width: 0; }
    .ptile .pn { font-size: 12px; font-weight: 700; opacity: .8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ptile .pv { font-size: 17px; font-weight: 800; }
    .ptile .pv small { font-size: 11px; opacity: .6; }

    /* ── section ── */
    .sec { display: flex; flex-direction: column; gap: 8px; }
    .sect { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; opacity: .6; text-transform: uppercase; letter-spacing: .4px; }
    .sect .n { width: 17px; height: 17px; border-radius: 50%; background: ${j(d.accent)}; color: #06121f; display: grid; place-items: center; font-size: 10px; }
    .sect .opt { opacity: .7; font-weight: 600; text-transform: none; letter-spacing: 0; }

    /* ── inline icon grid ── */
    .igrid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; max-height: 132px; overflow: auto; background: rgba(0,0,0,.18); border: 1px solid ${j(d.divider)}; border-radius: 9px; padding: 7px; }
    .ig { aspect-ratio: 1; display: grid; place-items: center; border-radius: 7px; cursor: pointer; border: 1px solid transparent; background: none; color: ${j(d.textPrimary)}; }
    .ig:hover { background: rgba(255,255,255,.06); }
    .ig.sel { border-color: ${j(d.accent)}; background: color-mix(in srgb, ${j(d.accent)} 16%, transparent); }
    .ig .oig-mdi { width: 18px; height: 18px; }
    .igrid-empty { grid-column: 1 / -1; text-align: center; font-size: 11px; opacity: .5; padding: 10px; }

    /* ── color swatches ── */
    .sw { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; }
    .sc { width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; padding: 0; }
    .sc.sel { border-color: #fff; }
    .sw input[type="color"] { width: 28px; height: 28px; border: none; background: none; cursor: pointer; padding: 0; }

    .oig-mdi { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; display: inline-block; }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    label {
      font-size: 12px;
      color: ${j(d.textSecondary)};
      font-weight: 600;
    }

    .input,
    select,
    .color-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${j(d.divider)};
      background: ${j(d.bgPrimary)};
      color: ${j(d.textPrimary)};
      font-size: 12px;
      outline: none;
      transition: border 0.2s ease, box-shadow 0.2s ease;
    }

    .input::placeholder {
      color: ${j(d.textSecondary)};
    }

    .input:focus,
    select:focus,
    .color-input:focus {
      border-color: ${j(d.accent)};
      box-shadow: 0 0 0 2px color-mix(in srgb, ${j(d.accent)} 20%, transparent);
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

    .oig-mdi { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; display: inline-block; }
    .icon-preview {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      border: 1px dashed ${j(d.divider)};
      display: grid;
      place-items: center;
      font-size: 22px;
      cursor: pointer;
      background: ${j(d.bgSecondary)};
      transition: border 0.2s ease, transform 0.2s ease;
    }

    .icon-preview:hover {
      border-color: ${j(d.accent)};
      transform: translateY(-1px);
    }

    .icon-field {
      font-size: 11px;
    }

    .icon-btn {
      border: none;
      background: ${j(d.bgSecondary)};
      color: ${j(d.textPrimary)};
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .divider {
      height: 1px;
      background: ${j(d.divider)};
      margin: 6px 0;
      opacity: 0.8;
    }

    .entity-list {
      border: 1px solid ${j(d.divider)};
      border-radius: 12px;
      overflow: hidden;
      max-height: 200px;
      overflow-y: auto;
      background: ${j(d.bgPrimary)};
    }

    .entity-item {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid ${j(d.divider)};
      cursor: pointer;
      align-items: center;
      transition: background 0.2s ease;
    }

    .entity-item:last-child {
      border-bottom: none;
    }

    .entity-item:hover {
      background: ${j(d.bgSecondary)};
    }

    .entity-item.selected {
      background: color-mix(in srgb, ${j(d.accent)} 16%, transparent);
      border-left: 3px solid ${j(d.accent)};
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
      color: ${j(d.textPrimary)};
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-sub {
      font-size: 10px;
      color: ${j(d.textSecondary)};
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
      background: ${j(d.cardBg)};
      border: 1px solid ${j(d.divider)};
      border-radius: 12px;
      z-index: 10;
      max-height: 180px;
      overflow-y: auto;
      box-shadow: ${j(d.cardShadow)};
    }

    .support-item {
      padding: 10px 12px;
      border-bottom: 1px solid ${j(d.divider)};
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
      background: ${j(d.bgSecondary)};
    }

    .support-name {
      font-size: 12px;
      color: ${j(d.textPrimary)};
      font-weight: 600;
    }

    .support-value {
      font-size: 10px;
      color: ${j(d.textSecondary)};
    }

    .support-empty {
      padding: 12px;
      font-size: 11px;
      color: ${j(d.textSecondary)};
      text-align: center;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px 18px;
      border-top: 1px solid ${j(d.divider)};
      background: ${j(d.bgSecondary)};
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
      background: ${j(d.bgPrimary)};
      color: ${j(d.textPrimary)};
      border: 1px solid ${j(d.divider)};
    }

    .btn-primary {
      background: ${j(d.accent)};
      color: #fff;
      box-shadow: 0 6px 14px color-mix(in srgb, ${j(d.accent)} 40%, transparent);
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
  `;De([m({type:Boolean,reflect:!0,attribute:"open"})],Ce.prototype,"isOpen",2);De([m({type:Number})],Ce.prototype,"tileIndex",2);De([m({attribute:!1})],Ce.prototype,"tileSide",2);De([m({attribute:!1})],Ce.prototype,"existingConfig",2);De([S()],Ce.prototype,"currentTab",2);De([S()],Ce.prototype,"entitySearchText",2);De([S()],Ce.prototype,"buttonSearchText",2);De([S()],Ce.prototype,"selectedEntityId",2);De([S()],Ce.prototype,"selectedButtonEntityId",2);De([S()],Ce.prototype,"label",2);De([S()],Ce.prototype,"icon",2);De([S()],Ce.prototype,"color",2);De([S()],Ce.prototype,"action",2);De([S()],Ce.prototype,"supportEntity1",2);De([S()],Ce.prototype,"supportEntity2",2);De([S()],Ce.prototype,"supportSearch1",2);De([S()],Ce.prototype,"supportSearch2",2);De([S()],Ce.prototype,"showSupportList1",2);De([S()],Ce.prototype,"showSupportList2",2);De([S()],Ce.prototype,"iconSearch",2);Ce=De([E("oig-tile-dialog")],Ce);var ex=Object.defineProperty,tx=Object.getOwnPropertyDescriptor,Fn=(e,t,i,r)=>{for(var a=r>1?void 0:r?tx(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&ex(t,i,a),a};let pr=class extends O{constructor(){super(...arguments),this.grandfathered=!1,this.lang="cs",this.dismissed=!1}connectedCallback(){super.connectedCallback(),this.setAttribute("role","status")}launch(){this.dispatchEvent(new CustomEvent("launch-onboarding",{bubbles:!0,composed:!0}))}close(){this.dismissed=!0,this.grandfathered&&this.dispatchEvent(new CustomEvent("dismiss-onboarding-banner",{bubbles:!0,composed:!0}))}render(){if(this.dismissed)return x;const e=this.grandfathered?R("onboarding.banner.grandfathered_title",this.lang):R("onboarding.banner.title",this.lang),t=this.grandfathered?R("onboarding.banner.grandfathered_body",this.lang):R("onboarding.banner.body",this.lang),i=this.grandfathered?R("onboarding.banner.grandfathered_close_label",this.lang):R("onboarding.banner.close_label",this.lang);return s`
      <div class="banner">
        <div class="copy">
          <strong>${e}</strong>
          ${t}
        </div>
        <button class="launch" type="button" @click=${this.launch}>${R("onboarding.banner.launch",this.lang)}</button>
        <button
          class="close"
          type="button"
          aria-label=${i}
          title=${i}
          @click=${this.close}
        >×</button>
      </div>
    `}};pr.styles=z`
    :host {
      display: block;
      margin-bottom: 12px;
    }

    .banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid var(--divider-color, rgba(120, 160, 255, 0.3));
      border-radius: 10px;
      background: var(--card-bg, rgba(120, 160, 255, 0.08));
      color: var(--primary-text-color, inherit);
    }

    .copy {
      flex: 1;
      min-width: 0;
      font-size: 13px;
      line-height: 1.4;
    }

    .copy strong {
      display: block;
      margin-bottom: 2px;
    }

    button {
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
    }

    .launch {
      padding: 7px 12px;
      border: none;
      background: var(--primary-color, #4f7cff);
      color: #fff;
      font-weight: 600;
      white-space: nowrap;
    }

    .close {
      padding: 4px 7px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.18));
      background: transparent;
      color: inherit;
      font-size: 16px;
      line-height: 1;
    }

    @media (max-width: 600px) {
      .banner { align-items: flex-start; flex-wrap: wrap; }
      .copy { flex-basis: calc(100% - 42px); }
    }
  `;Fn([m({type:Boolean})],pr.prototype,"grandfathered",2);Fn([m({type:String})],pr.prototype,"lang",2);Fn([S()],pr.prototype,"dismissed",2);pr=Fn([E("oig-onboarding-banner")],pr);const je={bg:"#0a1124",panel:"#101a33",card:"#15213f",line:"#243357",txt:"#eaf0fb",mut:"#8fa1c4",acc:"#5b8cff",batt:"#3ec6dc",boil:"#ff7a59",price:"#3fd18b",ups:"#ffb547",home:"#5b8cff"},ur=680;function ix(e,t,i){return Number.isFinite(e)?Math.max(t,Math.min(i,e)):t}function Sn(e){const t=new Date(e);return Number.isFinite(t.getTime())?t.getUTCHours():0}function Ci(e){return`${e}:00`}function mc(e){const t=ur/24;return`
    <svg viewBox="0 0 ${ur} 16" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      ${e.map(i=>`<text x="${(i*t).toFixed(1)}" y="12" fill="${je.mut}" font-size="9" text-anchor="middle">${i}</text>`).join("")}
    </svg>
  `}function vc(e,t,i=4){const r=t/i,a=e/4;let n="";for(let o=0;o<=i;o+=1){const l=(r*o).toFixed(1);n+=`<line x1="0" y1="${l}" x2="${e}" y2="${l}" stroke="${je.line}" stroke-width="1" opacity=".5" aria-hidden="true" focusable="false"/>`}for(let o=0;o<=4;o+=1){const l=(a*o).toFixed(1);n+=`<line x1="${l}" y1="0" x2="${l}" y2="${t}" stroke="${je.line}" stroke-width="1" opacity=".35" aria-hidden="true" focusable="false"/>`}return n}function yc(e){const t=ur/Math.max(1,e.length);return`
    <svg viewBox="0 0 ${ur} 22" preserveAspectRatio="none" aria-label="band" focusable="false">
      ${e.map((i,r)=>{const a=(r*t).toFixed(1),n=Math.max(1.5,t-2).toFixed(1);return`
            <rect
              x="${a}"
              y="0"
              width="${n}"
              height="20"
              rx="4"
              fill="${i.fill}"
              tabindex="0"
              aria-label="${i.ariaLabel}"
            >
              <title>${i.title}</title>
            </rect>
          `}).join("")}
    </svg>
  `}function xc(e,t){const i=ur,r=110,a=40,n=34,o=14,l=18,c=i-a-n,p=r-o-l,u=Math.max(1,e.length),h=w=>a+(u===1?c/2:w/(u-1)*c),g=w=>{const C=t.max-t.min||1,D=ix(w,t.min,t.max);return o+p-(D-t.min)/C*p},v=g(t.threshold),f=e.map((w,C)=>`${h(C).toFixed(1)},${g(w).toFixed(1)}`).join(" "),b=h(0).toFixed(1),$=h(u-1).toFixed(1),_=`M${b} ${o+p} ${e.map((w,C)=>`L${h(C).toFixed(1)} ${g(w).toFixed(1)}`).join(" ")} L${$} ${o+p} Z`;return`
    <svg viewBox="0 0 ${i} ${r}" preserveAspectRatio="none" aria-label="${t.seriesLabel}" focusable="false">
      ${vc(c,p)}
      <line
        x1="${a}"
        y1="${v.toFixed(1)}"
        x2="${a+c}"
        y2="${v.toFixed(1)}"
        stroke="${t.lineColor}"
        stroke-width="1"
        stroke-dasharray="3 4"
        opacity=".55"
        tabindex="0"
        aria-label="${t.thresholdLabel}"
      >
        <title>${t.thresholdLabel}</title>
      </line>
      <path d="${_}" fill="${t.lineColor}" fill-opacity=".14" aria-hidden="true" focusable="false"></path>
      <polyline
        points="${f}"
        fill="none"
        stroke="${t.lineColor}"
        stroke-width="2.6"
        stroke-linejoin="round"
        aria-label="${t.seriesLabel}"
        tabindex="0"
      >
        <title>${t.seriesLabel}</title>
      </polyline>
      ${e.map((w,C)=>{const D=h(C),T=g(w),I=`${Ci(C)} — ${w.toFixed(1)} ${t.seriesLabel}`;return`
            <circle
              data-sim-point="${C}"
              cx="${D.toFixed(1)}"
              cy="${T.toFixed(1)}"
              r="6"
              fill="transparent"
              stroke="transparent"
              tabindex="0"
              aria-label="${I}"
            >
              <title>${I}</title>
            </circle>
          `}).join("")}
      <text x="${a-4}" y="${o+4}" fill="${je.mut}" font-size="8" text-anchor="end">${t.topLabel}</text>
      <text x="${a-4}" y="${o+p}" fill="${je.mut}" font-size="8" text-anchor="end">${t.bottomLabel}</text>
    </svg>
    ${mc([0,6,12,18,24])}
  `}function wc(e,t){const i=ur,r=62,a=46,n=i/Math.max(1,e.length),o=Math.min(0,...e),c=Math.max(0,...e)-o||1,p=h=>Math.max(t.minHeight??1.5,Math.abs(h)/c*46),u=h=>h>=0?a-p(h):a;return`
    <svg viewBox="0 0 ${i} ${r}" preserveAspectRatio="none" aria-label="${t.seriesLabel}" focusable="false">
      ${vc(i,a,4)}
      ${e.map((h,g)=>{const v=(g*n).toFixed(1),f=Math.max(1.5,n-2).toFixed(1),b=p(h).toFixed(1),$=u(h).toFixed(1),_=t.valueLabel(h,g);return`
            <rect
              x="${v}"
              y="${$}"
              width="${f}"
              height="${b}"
              rx="3"
              fill="${t.colors(h)}"
              tabindex="0"
              aria-label="${_}"
            >
              <title>${_}</title>
            </rect>
          `}).join("")}
      <line x1="0" x2="${i}" y1="${a}" y2="${a}" stroke="${je.line}" aria-hidden="true" focusable="false"/>
    </svg>
    ${mc([0,6,12,18,24])}
  `}function rx(e){return yc(e.map(t=>({t:t.t,fill:t.mode==="ups"?"var(--ups)":"var(--home)",title:`${Ci(Sn(t.t))} — ${t.mode==="ups"?"Home UPS — nabíjení ze sítě":"Home 1"}`,ariaLabel:`${Ci(Sn(t.t))} — ${t.mode==="ups"?"Home UPS — nabíjení ze sítě":"Home 1"}`})))}function ax(e){return yc(e.map(t=>({t:t.t,fill:t.heating?t.source==="solar"?"var(--ups)":"var(--boil)":"#1b264a",title:`${Ci(Sn(t.t))} — ${t.heating?t.source==="solar"?"ohřev ze solárního přebytku":"ohřev z levného okna":"neohřívá"}`,ariaLabel:`${Ci(Sn(t.t))} — ${t.heating?t.source==="solar"?"ohřev ze solárního přebytku":"ohřev z levného okna":"neohřívá"}`})))}function nx(e,t){return xc(e.map(i=>i.soc),{min:0,max:100,lineColor:"var(--batt)",threshold:t,thresholdLabel:`komfortní rezerva ${t} %`,topLabel:"100 %",bottomLabel:"0 %",seriesLabel:"SoC %"})}function ox(e,t){return xc(e.map(i=>i.temp),{min:30,max:75,lineColor:"var(--boil)",threshold:t,thresholdLabel:`minimum ${t} °C`,topLabel:"75 °C",bottomLabel:"30 °C",seriesLabel:"°C"})}function sx(e){return wc(e,{colors:t=>t<0?"var(--price)":"#31406b",seriesLabel:"Kč/kWh",valueLabel:(t,i)=>`${Ci(i)} — ${t.toFixed(2)} Kč/kWh`})}function lx(e){return wc(e,{colors:()=>"#31406b",seriesLabel:"litry",valueLabel:(t,i)=>`${Ci(i)} — odběr ${Math.round(t)} l`})}const ql={zima:{label:"Zima — draho, málo slunce",prices:[4.2,4,3.8,3.7,3.6,3.9,5.2,6.8,7.4,6.9,6.2,5.8,5.4,5.2,5.6,6.1,7.2,8.4,8.9,8.1,6.9,5.8,4.9,4.4],solar:[0,0,0,0,0,0,0,.1,.4,.8,1.1,1.3,1.2,1,.7,.3,.1,0,0,0,0,0,0,0],load:[.6,.5,.5,.5,.6,.9,1.6,1.8,1.4,1.2,1.1,1.3,1.4,1.2,1.1,1.3,1.9,2.6,2.8,2.4,1.9,1.4,.9,.7]},leto:{label:"Léto — přebytky, levno",prices:[1.9,1.7,1.6,1.5,1.5,1.6,2.1,2.4,2.2,1.8,1.2,.7,.4,.3,.5,.9,1.6,2.6,3.1,2.8,2.4,2.2,2.1,2],solar:[0,0,0,0,.1,.5,1.5,2.8,4.1,5.2,5.9,6.2,6.1,5.7,4.9,3.8,2.5,1.2,.4,0,0,0,0,0],load:[.5,.4,.4,.4,.5,.7,1.2,1.4,1.2,1.1,1.2,1.5,1.6,1.4,1.2,1.2,1.5,2,2.2,2,1.6,1.2,.8,.6]},prechod:{label:"Přechodné období",prices:[2.9,2.7,2.6,2.5,2.6,2.9,3.8,4.6,4.4,3.8,3.2,2.9,2.7,2.6,2.9,3.3,4.1,5.2,5.6,5,4.2,3.6,3.2,3],solar:[0,0,0,0,0,.2,.7,1.5,2.4,3.1,3.5,3.7,3.6,3.2,2.6,1.8,1,.4,.1,0,0,0,0,0],load:[.6,.5,.5,.5,.6,.8,1.4,1.6,1.3,1.1,1.1,1.3,1.4,1.2,1.1,1.2,1.7,2.3,2.5,2.2,1.7,1.3,.9,.7]},negativ:{label:"Záporné ceny",prices:[1.2,1,.9,.8,.8,.9,1.3,1.4,.8,.1,-.4,-.9,-1.2,-1.1,-.6,.2,1.1,2.2,2.6,2.3,1.9,1.6,1.4,1.3],solar:[0,0,0,0,.1,.5,1.6,3,4.4,5.5,6.1,6.4,6.3,5.9,5.1,4,2.6,1.3,.4,0,0,0,0,0],load:[.5,.4,.4,.4,.5,.7,1.2,1.4,1.2,1.1,1.2,1.5,1.6,1.4,1.2,1.2,1.5,2,2.2,2,1.6,1.2,.8,.6]}},Gl={vsedni:{label:"Pracovní den",draw:[0,0,0,0,0,0,60,40,5,0,0,5,10,0,0,0,10,20,60,50,15,5,0,0]},vikend:{label:"Víkend",draw:[0,0,0,0,0,0,0,20,50,40,30,20,25,20,15,10,20,30,70,60,30,10,0,0]},dovolena:{label:"Dovolená",draw:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},navsteva:{label:"Návštěva",draw:[0,0,0,0,0,0,70,60,40,10,5,15,25,10,5,10,25,45,90,80,45,20,5,0]},legionella:{label:"Legionella cyklus",draw:[0,0,0,0,0,0,60,40,5,0,0,5,10,0,0,0,10,20,60,50,15,5,0,0],legionella:!0}};function Zr(e,t=2){const i=10**t;return Math.round(e*i)/i}function dx(e){if(typeof e=="number"&&Number.isFinite(e))return e;if(typeof e=="string"&&e.trim()!==""){const t=Number(e);return Number.isFinite(t)?t:null}return null}function cx(e){return ql[e??"zima"]??ql.zima}function px(e){return Gl[e??"vsedni"]??Gl.vsedni}function ux(e,t){const i=e*t,r=Math.floor(i/60)%24,a=i%60;return`2099-06-14T${String(r).padStart(2,"0")}:${String(a).padStart(2,"0")}:00Z`}function hx(e){var a,n,o;const t=e.interval_minutes??15,i=(e.timeline??[]).map(l=>{var c;return{t:ux(l.interval_index,t),mode:(c=l.mode_name)!=null&&c.includes("UPS")?"ups":"home",soc:l.soc_percent,cost:l.cost_czk}}),r=((n=(a=e.summary)==null?void 0:a.mode_distribution)==null?void 0:n["HOME UPS"])??0;return{kind:"battery",intervals:i,summary:{cost:Zr(((o=e.summary)==null?void 0:o.total_cost_czk)??0),ups_hours:Zr(r*t/60,2)}}}function gx(e){return e==="fve"||e==="overflow"?"solar":"grid"}function bx(e){var n,o,l;const t=(e.timeline??[]).map(c=>({t:c.start,heating:c.action==="heat",source:gx(c.source),temp:c.predicted_top_temp_c})),i=((n=e.summary)==null?void 0:n.total_heating_kwh)??0,r=((o=e.summary)==null?void 0:o.pv_kwh)??0,a=i>0?r/i:0;return{kind:"boiler",intervals:t,summary:{kwh:Zr(i,1),cost:Zr(((l=e.summary)==null?void 0:l.cost_czk)??0),solar_share:Zr(a)}}}function fx(e){const t=typeof e.box_id=="string"&&e.box_id||typeof e.boxId=="string"&&e.boxId||typeof e.inverter_sn=="string"&&e.inverter_sn||typeof e.sn=="string"&&e.sn||null;if(t)return t;if(typeof window<"u"){const i=new URLSearchParams(window.location.search);return i.get("sn")||i.get("inverter_sn")||null}return null}async function Ul(e,t){const i=await fetch(e,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});let r=null;try{r=await i.json()}catch{r=null}if(!i.ok){const a=typeof r=="object"&&r!=null&&"error"in r?String(r.error??i.statusText):i.statusText||`HTTP ${i.status}`;throw new Error(a)}return r}async function mx(e){const t=fx(e.draft);if(!t)throw new Error("Unable to resolve simulator box id");if(e.kind==="battery"){const a={preset:e.presetId,config_overrides:e.draft},n=dx(e.draft.soc_start??e.draft.battery_start??e.draft.battery_soc);n!=null&&(a.soc_start=n);const o=await Ul(`/api/oig_cloud/${t}/planner_simulate`,a);return hx(o)}const i=new URLSearchParams(window.location.search).get("entry_id")||"";if(!i)throw new Error("Unable to resolve entry id for boiler simulation");const r=await Ul(`/api/oig_cloud/boiler/${i}/${t}/simulate_water_day`,{preset:e.presetId,override_config:e.draft});return bx(r)}function vx(e){return[...cx(e).prices]}function yx(e){return[...px(e).draw]}var xx=Object.defineProperty,wx=Object.getOwnPropertyDescriptor,Ze=(e,t,i,r)=>{for(var a=r>1?void 0:r?wx(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&xx(t,i,a),a};const rt=X;function yo(e){if(typeof e=="number"&&Number.isFinite(e))return e;if(typeof e=="string"&&e.trim()!==""){const t=Number(e);return Number.isFinite(t)?t:null}return null}function qe(e,t=0){return e.toLocaleString("cs-CZ",{minimumFractionDigits:t,maximumFractionDigits:t})}let Ie=class extends O{constructor(){super(...arguments),this.domain="battery",this.draft={},this.presets=[],this.activePresetId="",this.configOverrides={},this.bootstrapPayload=null,this.debounceMs=250,this.fetcher=mx,this.loading=!0,this.error=null,this.response=null,this.chargeRateKw=2.6,this.reserveSocPercent=50,this.expensivePercentile=70,this.boilerTargetTempC=60,this.boilerMinTempC=45,this.initialized=!1,this.initialPropsSettled=!1,this.pendingTimer=null,this.pendingFetchPromise=null,this.requestSeq=0,this.lastRequest=null,this.warnedBootstrapSignature=""}connectedCallback(){super.connectedCallback(),this.syncThemeToken()}firstUpdated(){this.initialized=!0,this.syncThemeToken(),this.checkBootstrapPayload(),queueMicrotask(()=>{this.initialPropsSettled=!0}),this.scheduleFetch(!0)}updated(e){if(!(!this.initialized||!this.initialPropsSettled)){if(e.has("domain")&&(this.syncThemeToken(),this.checkBootstrapPayload()),e.has("bootstrapPayload")&&this.checkBootstrapPayload(),e.has("activePresetId")||e.has("draft")||e.has("configOverrides")){this.scheduleFetch(!0);return}(e.has("chargeRateKw")||e.has("reserveSocPercent")||e.has("expensivePercentile")||e.has("boilerTargetTempC")||e.has("boilerMinTempC"))&&this.scheduleFetch(!1)}}async getUpdateComplete(){let e=await super.getUpdateComplete();for(;this.pendingFetchPromise;)await this.pendingFetchPromise,e=await super.getUpdateComplete();return e}disconnectedCallback(){super.disconnectedCallback(),this.pendingTimer!==null&&(window.clearTimeout(this.pendingTimer),this.pendingTimer=null)}syncThemeToken(){this.style.setProperty("--tc",this.domain==="boiler"?"var(--boil)":"var(--batt)")}buildControlOverrides(){return this.domain==="battery"?{charge_rate_kw:this.chargeRateKw,battery_comfort_soc_percent:this.reserveSocPercent,expensive_percentile:this.expensivePercentile}:{target_temp_c:this.boilerTargetTempC,min_temp_c:this.boilerMinTempC}}buildRequestDraft(){const e={...this.draft,...this.configOverrides,...this.buildControlOverrides()};if(this.domain==="battery"){const t=yo(e.soc_start??e.battery_start??e.battery_soc);t!=null&&(e.soc_start=t)}return e}buildRequest(){var e;return{kind:this.domain,presetId:this.activePresetId||((e=this.presets[0])==null?void 0:e.id)||void 0,draft:this.buildRequestDraft()}}scheduleFetch(e=!1){const t=this.buildRequest();if(this.lastRequest=t,this.pendingTimer!==null&&(window.clearTimeout(this.pendingTimer),this.pendingTimer=null),e||this.debounceMs<=0){const i=this.performFetch(t);this.pendingFetchPromise=i,i.finally(()=>{this.pendingFetchPromise===i&&(this.pendingFetchPromise=null)});return}this.pendingTimer=window.setTimeout(()=>{this.pendingTimer=null;const i=this.performFetch(t);this.pendingFetchPromise=i,i.finally(()=>{this.pendingFetchPromise===i&&(this.pendingFetchPromise=null)})},this.debounceMs)}async performFetch(e){const t=++this.requestSeq;this.loading=!0,this.error=null;try{const i=await this.fetcher(e);if(t!==this.requestSeq)return;this.response=i,this.loading=!1,this.dispatchEvent(new CustomEvent("simulate-done",{detail:{request:e,response:i},bubbles:!0,composed:!0}))}catch(i){if(t!==this.requestSeq)return;this.response=null,this.loading=!1,this.error=i instanceof Error?i.message:"Simulation failed"}}retry(){const e=this.lastRequest??this.buildRequest(),t=this.performFetch(e);this.pendingFetchPromise=t,t.finally(()=>{this.pendingFetchPromise===t&&(this.pendingFetchPromise=null)})}changePreset(e){this.activePresetId!==e&&(this.loading=!0,this.activePresetId=e,this.dispatchEvent(new CustomEvent("preset-changed",{detail:{presetId:e},bubbles:!0,composed:!0})))}checkBootstrapPayload(){const t=(this.domain==="battery"?["capacity_kwh","hw_min_soc_percent"]:["top_temp_c","bottom_temp_c","cold_inlet_c"]).filter(r=>yo((this.bootstrapPayload??{})[r])==null),i=`${this.domain}:${t.join(",")}`;t.length===0||i===this.warnedBootstrapSignature||(this.warnedBootstrapSignature=i,console.warn("[oig-simulator] missing bootstrap fields",{domain:this.domain,missing:t}))}handleBatteryChargeInput(e){this.chargeRateKw=Number(e.currentTarget.value)}handleBatteryReserveInput(e){this.reserveSocPercent=Number(e.currentTarget.value)}handleBatteryExpensiveInput(e){this.expensivePercentile=Number(e.currentTarget.value)}handleBoilerTargetInput(e){this.boilerTargetTempC=Number(e.currentTarget.value)}handleBoilerMinInput(e){this.boilerMinTempC=Number(e.currentTarget.value)}renderPresetChips(){return s`
      <div class="presets" data-testid="preset-list">
        ${this.presets.map(e=>{var t,i;return s`
            <button
              id=${`preset-${e.id}`}
              data-testid=${`preset-${e.id}`}
              class=${e.id===(this.activePresetId||((t=this.presets[0])==null?void 0:t.id))?"on":""}
              type="button"
              aria-pressed=${e.id===(this.activePresetId||((i=this.presets[0])==null?void 0:i.id))?"true":"false"}
              @click=${()=>this.changePreset(e.id)}
            >
              ${e.label}
            </button>
          `})}
      </div>
    `}renderBatteryControlCard(){return s`
      <section class="card" data-testid="simulator-settings">
        <h3>${ue("settings","simulator.card.settings.label")}</h3>

        <div class="row">
          <div class="l">
            <b>${ue("charge_rate_kw","simulator.battery.charge_rate_kw.label")}</b>
            <span class="val">${qe(this.chargeRateKw,1)} kW</span>
          </div>
          <input
            data-testid="slider-charge-rate"
            type="range"
            min="1"
            max="7"
            step="0.1"
            .value=${String(this.chargeRateKw)}
            @input=${this.handleBatteryChargeInput}
          />
          <div class="exp">${Ri("charge_rate_kw","simulator.battery.charge_rate_kw.hint")??""}</div>
        </div>

        <div class="row">
          <div class="l">
            <b>${ue("battery_comfort_soc_percent","simulator.battery.reserve.label")}</b>
            <span class="val">${qe(this.reserveSocPercent,0)} %</span>
          </div>
          <input
            data-testid="slider-reserve"
            type="range"
            min="0"
            max="80"
            step="5"
            .value=${String(this.reserveSocPercent)}
            @input=${this.handleBatteryReserveInput}
          />
          <div class="exp">${Ri("battery_comfort_soc_percent","simulator.battery.reserve.hint")??""}</div>
        </div>

        <div class="row">
          <div class="l">
            <b>${ue("expensive_percentile","simulator.battery.expensive_percentile.label")}</b>
            <span class="val">${qe(this.expensivePercentile,0)} %</span>
          </div>
          <input
            data-testid="slider-expensive-percentile"
            type="range"
            min="40"
            max="95"
            step="5"
            .value=${String(this.expensivePercentile)}
            @input=${this.handleBatteryExpensiveInput}
          />
          <div class="exp">${Ri("expensive_percentile","simulator.battery.expensive_percentile.hint")??""}</div>
        </div>
      </section>
    `}renderBoilerControlCard(){return s`
      <section class="card" data-testid="simulator-settings">
        <h3>${ue("settings","simulator.card.settings.label")}</h3>

        <div class="row">
          <div class="l">
            <b>${ue("target_temp_c","simulator.boiler.target_temp_c.label")}</b>
            <span class="val">${qe(this.boilerTargetTempC,0)} °C</span>
          </div>
          <input
            data-testid="slider-target-temp"
            type="range"
            min="45"
            max="70"
            step="1"
            .value=${String(this.boilerTargetTempC)}
            @input=${this.handleBoilerTargetInput}
          />
          <div class="exp">${Ri("target_temp_c","simulator.boiler.target_temp_c.hint")??""}</div>
        </div>

        <div class="row">
          <div class="l">
            <b>${ue("min_temp_c","simulator.boiler.min_temp_c.label")}</b>
            <span class="val">${qe(this.boilerMinTempC,0)} °C</span>
          </div>
          <input
            data-testid="slider-min-temp"
            type="range"
            min="35"
            max="55"
            step="1"
            .value=${String(this.boilerMinTempC)}
            @input=${this.handleBoilerMinInput}
          />
          <div class="exp">${Ri("min_temp_c","simulator.boiler.min_temp_c.hint")??""}</div>
        </div>
      </section>
    `}renderBatteryBoxCard(){const e=this.bootstrapPayload??{};return s`
      <section class="card" data-testid="simulator-box">
        <h3>${ue("readonly","simulator.card.readonly.label")}</h3>
        ${this.renderBoxRow("box-capacity","capacity_kwh","simulator.box.capacity_kwh.label","kWh",e.capacity_kwh,1)}
        ${this.renderBoxRow("box-hw-min","hw_min_soc_percent","simulator.box.hw_min_soc_percent.label","%",e.hw_min_soc_percent,0)}
      </section>
    `}renderBoilerBoxCard(){const e=this.bootstrapPayload??{};return s`
      <section class="card" data-testid="simulator-box">
        <h3>${ue("readonly","simulator.card.readonly.label")}</h3>
        ${this.renderBoxRow("box-top-temp","top_temp_c","simulator.box.top_temp_c.label","°C",e.top_temp_c,1)}
        ${this.renderBoxRow("box-bottom-temp","bottom_temp_c","simulator.box.bottom_temp_c.label","°C",e.bottom_temp_c,1)}
        ${this.renderBoxRow("box-cold-inlet","cold_inlet_c","simulator.box.cold_inlet_c.label","°C",e.cold_inlet_c,0)}
      </section>
    `}renderBoxRow(e,t,i,r,a,n=0){const o=yo(a),l=ue("unavailable","simulator.common.unavailable.label");return s`
      <div class="row">
        <div class="l">
          <b>${ue(String(t),i)}</b>
          ${o==null?s`<span class="boxchip missing" data-testid=${e} aria-label=${l}>${l}</span>`:s`<span class="boxchip" data-testid=${e}>${qe(o,n)} ${r}</span>`}
        </div>
      </div>
    `}renderBatteryTiles(e){const t=typeof e.base_cost=="number",i=t?e.base_cost-e.cost:null,r=i!=null&&i>0?"−":"";return s`
      <div class="tiles">
        <div class="tile" data-testid="kpi-day-cost">
          <b>${ue("day_cost","simulator.kpi.day_cost.label")}</b>
          <div class="n">${qe(e.cost,0)} <small>Kč</small></div>
        </div>
        <div class="tile" data-testid="kpi-base-cost">
          <b>${ue("base_cost","simulator.kpi.base_cost.label")}</b>
          <div class="n">
            ${t?s`${qe(e.base_cost,0)} <small>Kč</small>`:s`<small>—</small>`}
          </div>
        </div>
        <div class="tile" data-testid="kpi-savings">
          <b>${ue("savings","simulator.kpi.savings.label")}</b>
          <div class="n price">
            ${i!=null?s`${r}${qe(Math.abs(i),0)} <small>Kč</small>`:s`<small>—</small>`}
          </div>
        </div>
        <div class="tile" data-testid="kpi-ups-hours">
          <b>${ue("ups_hours","simulator.kpi.ups_hours.label")}</b>
          <div class="n">${qe(e.ups_hours,0)} <small>h</small></div>
        </div>
      </div>
    `}renderBoilerTiles(e){return s`
      <div class="tiles">
        <div class="tile" data-testid="kpi-energy-day">
          <b>${ue("energy_today","simulator.kpi.energy_today.label")}</b>
          <div class="n">${qe(e.kwh,1)} <small>kWh</small></div>
        </div>
        <div class="tile" data-testid="kpi-cost">
          <b>${ue("day_cost","simulator.kpi.day_cost.label")}</b>
          <div class="n">${qe(e.cost,0)} <small>Kč</small></div>
        </div>
        <div class="tile" data-testid="kpi-solar-share">
          <b>${ue("solar_share","simulator.kpi.solar_share.label")}</b>
          <div class="n ups">${qe(e.solar_share*100,0)} <small>%</small></div>
        </div>
      </div>
    `}renderBatteryCharts(e){var r;const t=this.activePresetId||((r=this.presets[0])==null?void 0:r.id)||"zima",i=vx(t);return s`
      <div class="chart" data-testid="chart-mode">
        <h4>
          ${ue("mode","simulator.chart.mode.label")}
          <span class="key"><span class="sw" style="background:var(--home)"></span>Home 1</span>
          <span class="key"><span class="sw" style="background:var(--ups)"></span>Home UPS — nabíjení ze sítě</span>
        </h4>
        <div class="chart-body">${mt(rx(e))}</div>
      </div>

      <div class="chart" data-testid="chart-soc">
        <h4>
          ${ue("soc","simulator.chart.soc.label")}
          <span class="key"><span class="sw" style="background:var(--batt)"></span>SoC %</span>
          <span class="key" style="color:var(--mut)">··· komfortní rezerva ${qe(this.reserveSocPercent,0)} %</span>
        </h4>
        <div class="chart-body">${mt(nx(e,this.reserveSocPercent))}</div>
      </div>

      <div class="chart" data-testid="chart-price">
        <h4>
          ${ue("price","simulator.chart.price.label")}
          <span class="key"><span class="sw" style="background:#31406b"></span>Kč/kWh</span>
          <span class="key"><span class="sw" style="background:var(--price)"></span>záporná cena</span>
        </h4>
        <div class="chart-body">${mt(sx(i))}</div>
      </div>
    `}renderBoilerCharts(e){var r;const t=this.activePresetId||((r=this.presets[0])==null?void 0:r.id)||"vsedni",i=yx(t);return s`
      <div class="chart" data-testid="chart-heating">
        <h4>
          ${ue("heating_windows","simulator.chart.heating_windows.label")}
          <span class="key"><span class="sw" style="background:var(--ups)"></span>solární přebytek</span>
          <span class="key"><span class="sw" style="background:var(--boil)"></span>síť (levné okno)</span>
        </h4>
        <div class="chart-body">${mt(ax(e))}</div>
      </div>

      <div class="chart" data-testid="chart-temp">
        <h4>
          ${ue("water_temp","simulator.chart.water_temp.label")}
          <span class="key"><span class="sw" style="background:var(--boil)"></span>°C</span>
          <span class="key" style="color:var(--mut)">··· minimum ${qe(this.boilerMinTempC,0)} °C · cíl ${qe(this.boilerTargetTempC,0)} °C</span>
        </h4>
        <div class="chart-body">${mt(ox(e,this.boilerMinTempC))}</div>
      </div>

      <div class="chart" data-testid="chart-draw">
        <h4>
          ${ue("draw","simulator.chart.draw.label")}
          <span class="key"><span class="sw" style="background:#31406b"></span>litry</span>
        </h4>
        <div class="chart-body">${mt(lx(i))}</div>
      </div>
    `}renderSimulationPanel(){return this.response?this.response.kind==="battery"?s`
        <section class="card sim-card" aria-busy=${this.loading?"true":"false"}>
          <div class="simhead">
            ${this.renderPresetChips()}
          </div>
          ${this.renderBatteryTiles(this.response.summary)}
          ${this.renderBatteryCharts(this.response.intervals)}
        </section>
      `:s`
      <section class="card sim-card" aria-busy=${this.loading?"true":"false"}>
        <div class="simhead">
          ${this.renderPresetChips()}
        </div>
        ${this.renderBoilerTiles(this.response.summary)}
        ${this.renderBoilerCharts(this.response.intervals)}
      </section>
    `:x}renderLoadingPanel(){return s`
      <section class="card sim-card" aria-busy="true">
        <div class="simhead">
          <div class="skeleton skeleton-chip" style="width: 260px;"></div>
        </div>
        <div class="tiles">
          <div class="skeleton skeleton-tile"></div>
          <div class="skeleton skeleton-tile"></div>
          <div class="skeleton skeleton-tile"></div>
          ${this.domain==="battery"?s`<div class="skeleton skeleton-tile"></div>`:x}
        </div>
        <div class="chart">
          <div class="skeleton skeleton-line" style="width: 38%; height: 11px; margin-bottom: 8px;"></div>
          <div class="skeleton skeleton-chart tall"></div>
        </div>
        <div class="chart">
          <div class="skeleton skeleton-line" style="width: 32%; height: 11px; margin-bottom: 8px;"></div>
          <div class="skeleton skeleton-chart"></div>
        </div>
        <div class="chart">
          <div class="skeleton skeleton-line" style="width: 28%; height: 11px; margin-bottom: 8px;"></div>
          <div class="skeleton skeleton-chart"></div>
        </div>
      </section>
    `}renderErrorPanel(){return s`
      <section class="card sim-card error-inline" data-testid="simulator-error">
        <small>${this.error??"Simulation failed"}</small>
        <button class="retry" data-testid="simulator-retry" type="button" @click=${()=>this.retry()}>
          ${ue("retry","simulator.common.retry.label")}
        </button>
      </section>
    `}render(){const e=this.loading&&!this.response&&!this.error,t=this.error?"shell error-shell":"shell";return s`
      <div class=${t}>
        <div class="wrap">
          <div class="col">
            ${this.domain==="battery"?this.renderBatteryControlCard():this.renderBoilerControlCard()}
            ${this.domain==="battery"?this.renderBatteryBoxCard():this.renderBoilerBoxCard()}
          </div>

          <div class="col">
            ${e?this.renderLoadingPanel():this.error?this.renderErrorPanel():this.renderSimulationPanel()}
          </div>
        </div>
      </div>
    `}};Ie.styles=z`
    :host {
      display: block;
      --bg: ${rt(je.bg)};
      --panel: ${rt(je.panel)};
      --card: ${rt(je.card)};
      --line: ${rt(je.line)};
      --txt: ${rt(je.txt)};
      --mut: ${rt(je.mut)};
      --acc: ${rt(je.acc)};
      --batt: ${rt(je.batt)};
      --boil: ${rt(je.boil)};
      --price: ${rt(je.price)};
      --ups: ${rt(je.ups)};
      --home: ${rt(je.home)};
      --tc: var(--batt);
      color: var(--txt);
      font: 14px/1.5 -apple-system, 'Segoe UI', Roboto, sans-serif;
    }

    .shell {
      max-width: 1080px;
      margin: 0 auto;
      padding: 18px;
      background: radial-gradient(1100px 500px at 75% -10%, #16234a, var(--bg) 55%);
      border-radius: 18px;
      box-sizing: border-box;
    }

    .wrap {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 14px;
    }

    @media (max-width: 900px) {
      .wrap {
        grid-template-columns: 1fr;
      }
    }

    .col {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }

    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-left: 3px solid color-mix(in srgb, var(--tc) 55%, transparent);
      border-radius: 14px;
      padding: 14px 16px;
      box-sizing: border-box;
    }

    .card h3 {
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: .8px;
      color: var(--tc);
      margin: 0 0 10px;
      font-weight: 700;
    }

    .simhead {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }

    .presets {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .presets button {
      background: var(--panel);
      border: 1px solid var(--line);
      color: var(--mut);
      border-radius: 99px;
      padding: 6px 13px;
      cursor: pointer;
      font-size: 12.5px;
      transition: background .15s ease, color .15s ease, border-color .15s ease;
    }

    .presets button.on {
      border-color: var(--tc);
      color: var(--txt);
      background: color-mix(in srgb, var(--tc) 14%, transparent);
    }

    .presets button:focus-visible,
    input[type="range"]:focus-visible,
    .retry:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--tc) 72%, white);
      outline-offset: 2px;
    }

    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px;
      margin: 12px 0 4px;
    }

    .tile {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px 13px;
    }

    .tile b {
      display: block;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: var(--mut);
      font-weight: 600;
    }

    .tile .n {
      font-size: 20px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      margin-top: 2px;
    }

    .tile .n small {
      font-size: 11px;
      color: var(--mut);
      font-weight: 400;
    }

    .tile .n.price,
    .tile .n.ups {
      color: var(--price);
    }

    .tile .n.ups {
      color: var(--ups);
    }

    .chart {
      margin-top: 8px;
    }

    .chart h4 {
      font-size: 12px;
      color: var(--mut);
      font-weight: 500;
      margin: 0 0 4px;
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .chart h4 .key {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      white-space: nowrap;
    }

    .chart h4 .sw {
      width: 11px;
      height: 11px;
      border-radius: 3px;
      display: inline-block;
      flex: 0 0 auto;
    }

    .chart-body :global(svg) {
      width: 100%;
      display: block;
    }

    .chart-body svg {
      width: 100%;
      display: block;
    }

    .chart-axis {
      margin-top: -2px;
    }

    .axis-svg {
      display: block;
      width: 100%;
      margin-top: -1px;
    }

    .row {
      padding: 8px 0;
      border-bottom: 1px dashed rgba(36, 51, 87, .7);
    }

    .row:last-child {
      border-bottom: 0;
    }

    .row .l {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 5px;
    }

    .row b {
      font-size: 13.5px;
      font-weight: 600;
    }

    .row .exp {
      color: var(--mut);
      font-size: 12px;
      line-height: 1.45;
      margin-top: 2px;
    }

    input[type="range"] {
      width: 130px;
      accent-color: var(--tc);
    }

    .val {
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      min-width: 66px;
      text-align: right;
    }

    .boxchip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(63, 209, 139, .1);
      border: 1px solid rgba(63, 209, 139, .4);
      color: #9fe8c6;
      border-radius: 99px;
      padding: 1px 9px;
      font-size: 11px;
      white-space: nowrap;
    }

    .boxchip.missing {
      background: rgba(143, 161, 196, .08);
      border-color: rgba(143, 161, 196, .25);
      color: #b6c2d9;
    }

    .empty-state {
      text-align: center;
      padding: 20px 0 10px;
      color: var(--mut);
      font-size: 13px;
    }

    .error-shell .sim-card {
      border-color: var(--boil);
      border-left-color: var(--boil);
    }

    .error-inline {
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: var(--txt);
    }

    .error-inline small {
      color: var(--mut);
      line-height: 1.45;
    }

    .retry {
      align-self: flex-start;
      background: color-mix(in srgb, var(--boil) 18%, transparent);
      color: var(--txt);
      border: 1px solid color-mix(in srgb, var(--boil) 48%, transparent);
      border-radius: 10px;
      padding: 7px 12px;
      cursor: pointer;
      font-size: 12.5px;
    }

    .skeleton {
      position: relative;
      overflow: hidden;
      background: rgba(255, 255, 255, .06);
      border-radius: 8px;
      animation: skeleton 1.4s ease-in-out infinite;
    }

    @keyframes skeleton {
      0% { opacity: .6; }
      50% { opacity: .3; }
      100% { opacity: .6; }
    }

    .skeleton-stack {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-line {
      height: 12px;
      width: 70%;
    }

    .skeleton-slider {
      height: 38px;
      width: 100%;
      border-radius: 12px;
    }

    .skeleton-chip {
      height: 28px;
      width: 96px;
      border-radius: 99px;
    }

    .skeleton-tile {
      height: 72px;
      border-radius: 12px;
    }

    .skeleton-chart {
      height: 130px;
      border-radius: 12px;
    }

    .skeleton-chart.tall {
      height: 170px;
    }
  `;Ze([m({type:String})],Ie.prototype,"domain",2);Ze([m({attribute:!1})],Ie.prototype,"draft",2);Ze([m({attribute:!1})],Ie.prototype,"presets",2);Ze([m({type:String})],Ie.prototype,"activePresetId",2);Ze([m({attribute:!1})],Ie.prototype,"configOverrides",2);Ze([m({attribute:!1})],Ie.prototype,"bootstrapPayload",2);Ze([m({type:Number})],Ie.prototype,"debounceMs",2);Ze([m({attribute:!1})],Ie.prototype,"fetcher",2);Ze([S()],Ie.prototype,"loading",2);Ze([S()],Ie.prototype,"error",2);Ze([S()],Ie.prototype,"response",2);Ze([S()],Ie.prototype,"chargeRateKw",2);Ze([S()],Ie.prototype,"reserveSocPercent",2);Ze([S()],Ie.prototype,"expensivePercentile",2);Ze([S()],Ie.prototype,"boilerTargetTempC",2);Ze([S()],Ie.prototype,"boilerMinTempC",2);Ie=Ze([E("oig-simulator")],Ie);var _x=Object.defineProperty,$x=Object.getOwnPropertyDescriptor,se=(e,t,i,r)=>{for(var a=r>1?void 0:r?$x(t,i):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(a=(r?o(t,i,a):o(a))||a);return r&&a&&_x(t,i,a),a};const we=X,Yl=new URLSearchParams(window.location.search),ft=Yl.get("sn")||Yl.get("inverter_sn")||"",Ql=`sensor.oig_${ft}_`,kx=[{id:"flow",label:"Toky",icon:"mdi:lightning-bolt"},{id:"pricing",label:"Ceny",icon:"mdi:cash"},{id:"boiler",label:"Bojler",icon:"mdi:water-boiler"},{id:"settings",label:"Nastavení",icon:"mdi:cog"}];let ne=class extends O{constructor(){super(...arguments),this.hass=null,this.onboarding=null,this.loading=!0,this.error=null,this.activeTab="flow",this.editMode=!1,this.time="",this.flowData=Eo,this.pricingData=null,this.pricingLoading=!1,this.boilerState=null,this.boilerLoading=!1,this.boilerV2Data=null,this.boilerConfig=null,this.boilerRefreshTimer=null,this.boxHasHome56=!1,this.enablePricing=!0,this.enableBoiler=!0,this.enableStatistics=!0,this.enablePrediction=!0,this.analyticsData=Vs,this.chmuData=an,this.weatherData=nn,this.chmuModalOpen=!1,this.weatherRefreshTimer=null,this.timelineTab="today",this.timelineData=null,this.tilesConfig=null,this.tilesLeft=[],this.tilesRight=[],this.tileDialogOpen=!1,this.editingTileIndex=-1,this.editingTileSide="left",this.editingTileConfig=null,this.onboardingWizardOpen=!1,this.simulatorOpen=!1,this.simulatorDomain="battery",this.simulatorDraft={},this.entityStore=null,this.timeInterval=null,this.stateWatcherUnsub=null,this.tileEntityUnsubs=[],this.pricingDirty=!1,this.timelineDirty=!1,this.analyticsDirty=!1,this.boilerDirty=!1,this.reconnecting=!1,this.throttledUpdateFlow=no(()=>this.updateFlowData(),500),this.throttledUpdateSensors=no(()=>this.updateSensorData(),1e3),this.throttledRefreshDerivedData=no(()=>this.refreshDerivedData(),5e3),this.onPageShow=()=>{this.rebindHassContext()},this.onDocumentVisibilityChange=()=>{document.visibilityState==="visible"&&this.rebindHassContext()},this.onSimulatorKeydown=e=>{e.key==="Escape"&&this.simulatorOpen&&this.onSimulatorClose()}}get boilerLang(){return Ln(this.hass)}get visibleTabs(){return kx.filter(e=>e.id==="pricing"?this.enablePricing:e.id==="boiler"?this.enableBoiler:!0)}get visibleDashboardTiles(){const e={enablePricing:this.enablePricing,enableBoiler:this.enableBoiler,enableStatistics:this.enableStatistics,enablePrediction:this.enablePrediction},t=[...this.tilesLeft??[],...this.tilesRight??[]];return E1(t,e)??[]}_altShort(e){switch(e){case"heat_pump":return"TČ";case"fireplace":return"Krb";case"other":return"Alt";default:return"Plyn"}}connectedCallback(){super.connectedCallback(),window.addEventListener("pageshow",this.onPageShow),document.addEventListener("visibilitychange",this.onDocumentVisibilityChange),window.addEventListener("keydown",this.onSimulatorKeydown),this.initApp(),this.startTimeUpdate()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("pageshow",this.onPageShow),document.removeEventListener("visibilitychange",this.onDocumentVisibilityChange),window.removeEventListener("keydown",this.onSimulatorKeydown),this.cleanup()}updated(e){var t;e.has("hass")&&!e.has("loading")&&this.rebindHassContext(),(e.has("enablePricing")||e.has("enableBoiler"))&&(this.visibleTabs.some(i=>i.id===this.activeTab)||(this.activeTab=((t=this.visibleTabs[0])==null?void 0:t.id)??"flow")),e.has("activeTab")&&(this.activeTab==="pricing"&&(!this.pricingData||this.pricingDirty)&&this.loadPricingData(),this.activeTab==="pricing"&&(this.analyticsData===Vs||this.analyticsDirty)&&this.loadAnalyticsAsync(),this.activeTab==="pricing"&&(!this.timelineData||this.timelineDirty)&&this.loadTimelineTabData(this.timelineTab),this.activeTab==="boiler"&&(!this.boilerState||this.boilerDirty)&&this.loadBoilerDataAsync())}async initApp(){try{const e=await J.getHass();if(!e)throw new Error("Cannot access Home Assistant context");this.hass=e,this.entityStore=dp(e,ft),await gi.start({getHass:()=>J.getHassSync(),prefixes:[Ql]}),this.stateWatcherUnsub=gi.onEntityChange((t,i)=>{this.syncHassState(t,i),this.throttledUpdateFlow(),this.throttledUpdateSensors(),this.throttledRefreshDerivedData()}),ye.start(),this.updateFlowData(),this.updateSensorData(),this.loadPricingData(),this.loadBoilerDataAsync(),this.loadAnalyticsAsync(),this.loadTilesAsync(),this.loadOnboarding(),this.loadBoxHasHome56(),this.loadWeather(),this.weatherRefreshTimer=window.setInterval(()=>{document.visibilityState!=="hidden"&&this.loadWeather()},15*60*1e3),this.boilerRefreshTimer=window.setInterval(()=>{this.activeTab==="boiler"&&document.visibilityState!=="hidden"&&this.loadBoilerDataAsync()},3e4),this.loading=!1,L.info("App initialized",{entities:Object.keys(e.states||{}).length,inverterSn:ft})}catch(e){this.error=e.message,this.loading=!1,L.error("App init failed",e)}}cleanup(){var e,t;(e=this.stateWatcherUnsub)==null||e.call(this),this.stateWatcherUnsub=null,gi.stop(),ye.stop(),this.tileEntityUnsubs.forEach(i=>i()),this.tileEntityUnsubs=[],(t=this.entityStore)==null||t.destroy(),this.entityStore=null,this.timeInterval!==null&&(clearInterval(this.timeInterval),this.timeInterval=null),this.boilerRefreshTimer!==null&&(clearInterval(this.boilerRefreshTimer),this.boilerRefreshTimer=null),this.weatherRefreshTimer!==null&&(clearInterval(this.weatherRefreshTimer),this.weatherRefreshTimer=null)}async rebindHassContext(){var e;if(!this.reconnecting){this.reconnecting=!0;try{const t=await J.refreshHass();if(!t)return;this.hass=t,(e=this.entityStore)==null||e.updateHass(t),await gi.start({getHass:()=>J.getHassSync(),prefixes:[Ql]}),this.updateFlowData(),this.updateSensorData()}catch(t){L.error("Failed to rebind hass context",t)}finally{this.reconnecting=!1}}}updateFlowData(){var e;if(this.hass)try{const t=((e=this.entityStore)==null?void 0:e.getAll())??this.hass;this.flowData=Ap(t,ft)}catch(t){L.error("Failed to extract flow data",t)}}updateSensorData(){if(this.chmuData=$1(ft),this.activeTab==="pricing"&&(this.analyticsData={...this.analyticsData,...y1()}),this.tilesConfig){const e=Tr(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}}updateTilesImmediate(){if(!this.tilesConfig)return;const e=Tr(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}subscribeTileEntities(){if(this.tileEntityUnsubs.forEach(t=>t()),this.tileEntityUnsubs=[],!this.tilesConfig||!this.entityStore)return;const e=new Set;[...this.tilesConfig.tiles_left,...this.tilesConfig.tiles_right].forEach(t=>{var i,r;t&&(e.add(t.entity_id),(i=t.support_entities)!=null&&i.top_right&&e.add(t.support_entities.top_right),(r=t.support_entities)!=null&&r.bottom_right&&e.add(t.support_entities.bottom_right))});for(const t of e){const i=this.entityStore.subscribe(t,()=>{this.updateTilesImmediate()});this.tileEntityUnsubs.push(i)}}async loadPricingData(){if(!(!this.hass||this.pricingLoading)){this.pricingLoading=!0;try{const e=await Pr(()=>Rp(this.hass));this.pricingData=e,this.pricingDirty=!1}catch(e){L.error("Failed to load pricing data",e)}finally{this.pricingLoading=!1}}}async loadBoilerDataAsync(){if(!(!this.hass||this.boilerLoading)){this.boilerLoading=!0;try{const e=await Pr(()=>f1(this.hass));this.boilerState=e.state,this.boilerV2Data=e.v2Data,this.boilerConfig=e.config,this.boilerDirty=!1,this.boilerRefreshTimer||(this.boilerRefreshTimer=window.setInterval(()=>this.loadBoilerDataAsync(),5*60*1e3))}catch(e){L.error("Failed to load boiler data",e)}finally{this.boilerLoading=!1}}}async loadAnalyticsAsync(){try{this.analyticsData=await Pr(()=>v1(ft)),this.analyticsDirty=!1}catch(e){L.error("Failed to load analytics",e)}}async loadOnboarding(){try{this.onboarding=await No(ft)}catch{this.onboarding=null}}async loadBoxHasHome56(){var e;try{const t=await Ao();this.boxHasHome56=((e=t==null?void 0:t.boiler)==null?void 0:e.box_has_home56)===!0,t!=null&&t.modules&&(this.enablePricing=t.modules.enable_pricing!==!1,this.enableBoiler=t.modules.enable_boiler!==!1,this.enableStatistics=t.modules.enable_statistics!==!1,this.enablePrediction=t.modules.enable_battery_prediction!==!1)}catch{}}async loadTilesAsync(){try{this.tilesConfig=await Pr(()=>z1());const e=Tr(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right,this.subscribeTileEntities()}catch(e){L.error("Failed to load tiles config",e)}}async loadTimelineTabData(e){try{this.timelineData=await Pr(()=>H1(ft,e)),this.timelineDirty=!1}catch(t){L.error(`Failed to load timeline tab: ${e}`,t)}}syncHassState(e,t){if(this.hass){if(this.hass.states||(this.hass.states={}),t){this.hass.states[e]=t;return}delete this.hass.states[e]}}refreshDerivedData(){if(this.pricingDirty=!0,this.timelineDirty=!0,this.analyticsDirty=!0,this.boilerDirty=!0,this.activeTab==="pricing"){Hp(),this.loadPricingData(),this.loadTimelineTabData(this.timelineTab),this.loadAnalyticsAsync();return}this.activeTab==="boiler"&&this.loadBoilerDataAsync()}startTimeUpdate(){const e=()=>{this.time=new Date().toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})};e(),this.timeInterval=window.setInterval(e,1e3)}onTabChange(e){this.activeTab=e.detail.tabId}onLaunchOnboarding(e){e.stopPropagation(),this.onboardingWizardOpen=!0}onWizardClose(){this.onboardingWizardOpen=!1,this.loadOnboarding()}onSimulatorOpen(e){e.stopPropagation();const{domain:t,box:i,draft:r}=e.detail??{};this.simulatorDomain=t??"battery",this.simulatorDraft=i?{...r,box_id:i}:{...r},this.simulatorOpen=!0}onSimulatorClose(){this.simulatorOpen=!1}onDismissOnboardingBanner(e){e.stopPropagation(),this.persistBannerDismissal()}async persistBannerDismissal(){try{await W1(ft)}catch{}this.loadOnboarding()}onGridChargingOpen(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-grid-charging-dialog");e==null||e.show()}onEditClick(){this.editMode=!this.editMode}onResetClick(){var i,r;const e=(i=this.shadowRoot)==null?void 0:i.querySelector("oig-flow-canvas");e!=null&&e.resetLayout&&e.resetLayout();const t=(r=this.shadowRoot)==null?void 0:r.querySelector("oig-grid");t&&t.resetLayout()}async loadWeather(){try{this.weatherData=await L1()}catch{}}onChmuBadgeClick(){this.loadWeather(),this.chmuModalOpen=!0}onChmuModalClose(){this.chmuModalOpen=!1}onTimelineTabChange(e){this.timelineTab=e.detail.tab,this.loadTimelineTabData(e.detail.tab)}onTimelineRefresh(){this.loadTimelineTabData(this.timelineTab)}onAddTile(){this.editingTileIndex=-1,this.editingTileSide="left",this.editingTileConfig=null,this.tileDialogOpen=!0}onEditTile(e){const{entityId:t}=e.detail;let i=-1,r="left",a=null;if(this.tilesConfig){const n=this.tilesConfig.tiles_left.findIndex(o=>o&&o.entity_id===t);if(n>=0)i=n,r="left",a=this.tilesConfig.tiles_left[n];else{const o=this.tilesConfig.tiles_right.findIndex(l=>l&&l.entity_id===t);o>=0&&(i=o,r="right",a=this.tilesConfig.tiles_right[o])}}this.editingTileIndex=i,this.editingTileSide=r,this.editingTileConfig=a,this.tileDialogOpen=!0,a&&requestAnimationFrame(()=>{var o;const n=(o=this.shadowRoot)==null?void 0:o.querySelector("oig-tile-dialog");n==null||n.loadTileConfig(a)})}onDeleteTile(e){const{entityId:t}=e.detail;if(!this.tilesConfig||!t)return;const i={...this.tilesConfig};i.tiles_left=i.tiles_left.map(a=>a&&a.entity_id===t?null:a),i.tiles_right=i.tiles_right.map(a=>a&&a.entity_id===t?null:a),this.tilesConfig=i;const r=Tr(i);this.tilesLeft=r.left,this.tilesRight=r.right,Is(i),this.subscribeTileEntities()}onTileSaved(e){const{index:t,side:i,config:r}=e.detail;if(!this.tilesConfig)return;const a=Sd(r),n={...this.tilesConfig},o=i==="left"?[...n.tiles_left]:[...n.tiles_right];if(t>=0&&t<o.length)o[t]=a;else{const c=o.findIndex(p=>p===null);c>=0?o[c]=a:o.push(a)}i==="left"?n.tiles_left=o:n.tiles_right=o,this.tilesConfig=n;const l=Tr(n);this.tilesLeft=l.left,this.tilesRight=l.right,Is(n),this.subscribeTileEntities()}onTileDialogClose(){this.tileDialogOpen=!1,this.editingTileConfig=null,this.editingTileIndex=-1}_renderBoilerTabSafe(){try{return this._buildBoilerTabContent()}catch(e){return L.error("Boiler tab render failed",e),s`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${"render_failed"}></oig-boiler-unavailable-state>`}}_buildBoilerTabContent(){var Se,re,q,de,F,ae,M,H,oe;const e=this.boilerV2Data;if(this.boilerLoading&&!e)return s`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="loading" message=""></oig-boiler-unavailable-state>`;if(e!=null&&e.loadError)return s`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${e.loadError}></oig-boiler-unavailable-state>`;const t=(((Se=e==null?void 0:e.explanation)==null?void 0:Se.degradedReasons)??[]).filter(be=>be!=="config_profile_unavailable");if(e&&e.status===null&&t.length>0)return s`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="degraded" .message=${t.join(", ")}></oig-boiler-unavailable-state>`;if(!e)return s`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="unavailable" message="Data bojleru nejsou k dispozici"></oig-boiler-unavailable-state>`;const i=((re=e.explanation)==null?void 0:re.dataAgeSecs)??null,r=i!==null&&i>600,a=(((q=e.status)==null?void 0:q.degraded)??!1)&&t.length>0,n=r||a?s`<div class="boiler-status-chip-row">
          <span class="boiler-badge boiler-badge--age" data-testid="boiler-stale-chip">
            ${a?"⚠ Plán v degradovaném režimu":`⚠ Data stará ${Math.round((i??0)/60)} min`}
          </span>
        </div>`:x,o=e.activity,l=this.boilerConfig,c=(l==null?void 0:l.volumeL)??200,p=(o==null?void 0:o.fillLevelPct)??null,u=p!=null?p*c:null,h=(o==null?void 0:o.state)??"unknown",g=h==="charging_alt"?"alt":h.startsWith("charging_")?"ele":"idle",v=o==null?void 0:o.source,f=v==="fve"||v==="overflow"?"fve":v==="discharge"?"battery":"grid",b=e.energyToday,$=b?b.fveKwh+b.gridKwh+b.batteryKwh:null,_=b?b.altKwh:null,w=Date.now(),C=e.circulationRuns??[],D=C.length>0,T=C.some(be=>new Date(be.start).getTime()<=w&&w<new Date(be.end).getTime()),I=((de=e.demandMap)==null?void 0:de.drivesPlan)??!0,k=(o==null?void 0:o.temperatureTrendCPerMin)??null,P=this.boilerLang,V=((F=e.status)==null?void 0:F.comfortSatisfied)??null,Y=(((ae=e.planSummary)==null?void 0:ae.deadlineTime)??(l==null?void 0:l.deadlineTime)??"").slice(0,5),U=(M=e.energyToday)==null?void 0:M.costCzk,Z=g==="alt"?`🔥 ${this._altShort(e.altSourceType)}`:g==="ele"?"🔌 ELE":"⏸ —",Q=k!=null&&Math.abs(k)>=.05?k>0?"↑":"↓":"";return s`
      ${n}
      <div class="boiler-model-row">
        <oig-boiler-model
          .topTempC=${((H=e.status)==null?void 0:H.temperatureTop)??null}
          .bottomTempC=${((oe=e.status)==null?void 0:oe.temperatureBottom)??null}
          .readyLiters=${u}
          .readyFraction=${p}
          .volumeL=${c}
          .coldInletTempC=${(l==null?void 0:l.coldInletTempC)??16}
          .heatMode=${g}
          .electricSource=${f}
          .altSourceType=${e.altSourceType??"gas"}
          .elementKwhToday=${$}
          .altKwhToday=${_}
          .circulationEnabled=${D}
          .circulationActive=${T}
          .trendCPerMin=${k}
          .lang=${P}
        ></oig-boiler-model>
        <oig-boiler-draw-map .data=${e.drawMap??null} .lang=${P}></oig-boiler-draw-map>
      </div>

      <div class="boiler-slim">
        <div class="slim-tile"><span class="k">⚡ Režim</span><span class="v"><span class="slim-chip">${Z}</span></span></div>
        <div class="slim-tile"><span class="k">💧 Připraveno</span><span class="v">${u!=null?Math.round(u):"—"} L ${Q}</span></div>
        <div class="slim-tile"><span class="k">💰 Cena dnes</span><span class="v">${U!=null?`${U.toFixed(2)} Kč`:"—"}</span></div>
        <div class="slim-tile"><span class="k">🔁 Cirkulace</span><span class="v"><span class="slim-chip ${T?"on":"off"}">${D?T?"běží":"stojí":"—"}</span></span></div>
        <div class="slim-tile"><span class="k">🎯 Komfort do</span><span class="v">${Y||"—"} ${V===!0?"✓":V===!1?"⚠":""}</span></div>
      </div>

      <oig-boiler-soc-chart
        .planSlots=${e.planSlots}
        .capacityLiters=${c}
        .nowLiters=${u}
        .drivesPlan=${I}
        .lang=${P}
      ></oig-boiler-soc-chart>

      <oig-boiler-plan
        .planSlots=${e.planSlots}
        .planSummary=${e.planSummary??null}
        .legionella=${e.legionella??null}
        .circulationRuns=${C}
        .status=${e.status??null}
        .altSourceType=${e.altSourceType??null}
        .lang=${P}
      ></oig-boiler-plan>

      <details class="boiler-controls-section" data-testid="boiler-controls-section">
        <summary>⚙️ Ovládání a nastavení</summary>
        <div class="boiler-controls-body">
          <oig-boiler-override-panel
            .lang=${this.boilerLang}
            .identity=${e.identity??{entryId:null,boxId:null,available:!1}}
            .currentOverride=${e.manualOverride??null}
          ></oig-boiler-override-panel>
          <div data-testid="boiler-setup-guide" class="boiler-setup-guide">
            <span class="boiler-setup-guide__icon">🧙</span>
            <div class="boiler-setup-guide__text">
              <strong>Průvodce nastavením bojleru</strong>
              <p>Bojler konfigurujte v Nastavení → Zařízení a služby → OIG Cloud → Konfigurovat.</p>
            </div>
          </div>
        </div>
      </details>
    `}render(){var r;if(this.loading)return s`<div class="loading"><div class="spinner"></div><span>Načítání...</span></div>`;if(this.error)return s`
        <div class="error">
          <h2>Chyba připojení</h2>
          <p>${this.error}</p>
          <button @click=${()=>{this.error=null,this.loading=!0,this.initApp()}}>Zkusit znovu</button>
        </div>
      `;const e=this.chmuData.effectiveSeverity>0?this.chmuData.warningsCount:0,t=this.onboarding&&(this.onboarding.grandfathered?!this.onboarding.banner_dismissed:Object.values(this.onboarding.steps).some(a=>a!=="done")),i=this.visibleDashboardTiles;return s`
      <oig-theme-provider @oig-simulator-open=${this.onSimulatorOpen}>
        <oig-header
          title="Energetické Toky"
          .time=${this.time}
          .showStatus=${!0}
          .alertCount=${e}
          .weatherAvailable=${this.weatherData.available}
          .weatherCondition=${this.weatherData.condition}
          .weatherTemp=${this.weatherData.temperature}
          @edit-click=${this.onEditClick}
          @reset-click=${this.onResetClick}
          @status-click=${this.onChmuBadgeClick}
        >
        </oig-header>

        <oig-tabs
          .tabs=${this.visibleTabs}
          .activeTab=${this.activeTab}
          @tab-change=${this.onTabChange}
        ></oig-tabs>

        <main>
          ${t?s`
            <oig-onboarding-banner
              role="status"
              .grandfathered=${!!this.onboarding.grandfathered}
              .lang=${this.boilerLang}
              @launch-onboarding=${this.onLaunchOnboarding}
              @dismiss-onboarding-banner=${this.onDismissOnboardingBanner}
            ></oig-onboarding-banner>
          `:x}
          <oig-grid .editable=${this.editMode}>
            <!-- ===== FLOW TAB ===== -->
            <div class="tab-content ${this.activeTab==="flow"?"active":""}">
              <div class="flow-layout">
                <!-- Dlaždice: levý sloupec (sjednocený styl Ovládání) -->
                <div class="flow-tiles-stack">
                  <div class="control-stack">
                    <div class="control-stack__head">
                      <span>🔌 Moje dlaždice</span>
                      <button class="control-stack__add" type="button"
                        title="Přidat dlaždici" @click=${this.onAddTile}>+</button>
                    </div>
                    <div class="control-stack__block">
                      ${i.length>0?s`
                        <oig-tiles-container
                          .tiles=${i}
                          .editMode=${this.editMode}
                          @edit-tile=${this.onEditTile}
                          @delete-tile=${this.onDeleteTile}
                        ></oig-tiles-container>
                      `:s`
                        <div class="control-stack__tiles-empty">Zatím žádné dlaždice — přidej tlačítkem +</div>
                      `}
                    </div>
                  </div>
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

                <!-- Systém OIG: pravý sloupec (stejný styl) -->
                <div class="flow-control">
                  <div class="control-stack">
                    <div class="control-stack__head">🛡️ Systém OIG</div>
                    <div class="control-stack__block">
                      <oig-control-panel embedded .boxHasHome56=${this.boxHasHome56}></oig-control-panel>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ===== PRICING TAB ===== -->
            <div class="tab-content ${this.activeTab==="pricing"?"active":""}">
              <div class="pricing-layout">
                ${this.pricingLoading?s`
                  <div class="tab-loading-overlay">
                    <div class="spinner spinner--small"></div>
                    <span>Načítání cen...</span>
                  </div>
                `:x}
                <oig-pricing-stats ?topOnly=${!0} .data=${this.pricingData}></oig-pricing-stats>
                <oig-pricing-chart .data=${this.pricingData}></oig-pricing-chart>

                <oig-timeline-tile
                  .data=${this.timelineData}
                  .activeTab=${this.timelineTab}
                  @tab-change=${this.onTimelineTabChange}
                  @refresh=${this.onTimelineRefresh}
                ></oig-timeline-tile>

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
               ${this.boilerLoading&&this.boilerV2Data?s`
                 <div class="tab-loading-overlay">
                   <div class="spinner spinner--small"></div>
                   <span>Načítání bojleru...</span>
                 </div>
               `:x}
               ${this._renderBoilerTabSafe()}
             </div>

             <!-- ===== SETTINGS TAB ===== -->
             <div class="tab-content ${this.activeTab==="settings"?"active":""}">
               ${this.activeTab==="settings"?s`
                 <oig-settings
                   .hassStates=${((r=this.hass)==null?void 0:r.states)??null}
                   @launch-onboarding=${this.onLaunchOnboarding}
                 ></oig-settings>
               `:x}
             </div>
          </oig-grid>
        </main>

        <!-- ===== GLOBAL OVERLAYS ===== -->
        <oig-weather-modal
          ?open=${this.chmuModalOpen}
          .weather=${this.weatherData}
          .chmu=${this.chmuData}
          @close=${this.onChmuModalClose}
        ></oig-weather-modal>

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

        <!-- Plan 3.5 item 4: wizard mounted as a real production consumer of
             the launch-onboarding event. Drawn as an overlay; the dashboard
             stays interactive behind it (#6 — soft guide). -->
        <oig-onboarding-wizard
          ?open=${this.onboardingWizardOpen}
          .inverterSn=${ft}
          .hass=${this.hass}
          @close=${this.onWizardClose}
        ></oig-onboarding-wizard>

        <!-- fe/fix: 'oig-simulator-open' seam — see the simulatorOpen field
             comment for why this lives at the shell instead of inside the
             wizard. oig-simulator has no backdrop/close of its own, so this
             overlay supplies both, same pattern as above. -->
        ${this.simulatorOpen?s`
          <div class="simulator-overlay" data-testid="simulator-overlay" @click=${this.onSimulatorClose}>
            <div class="simulator-modal" @click=${a=>a.stopPropagation()}>
              <button
                class="simulator-modal-close"
                type="button"
                aria-label="Zavřít"
                data-testid="simulator-close"
                @click=${this.onSimulatorClose}
              >×</button>
              <oig-simulator
                .domain=${this.simulatorDomain}
                .draft=${this.simulatorDraft}
              ></oig-simulator>
            </div>
          </div>
        `:x}
      </oig-theme-provider>
    `}};ne.styles=z`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      font-family: ${we(d.fontFamily)};
      color: ${we(d.textPrimary)};
      background: ${we(d.bgPrimary)};
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
      color: ${we(d.textSecondary)};
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid ${we(d.divider)};
      border-top-color: ${we(d.accent)};
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
      color: ${we(d.error)};
      text-align: center;
      animation: fadeIn 0.3s ease;
    }

    .error h2 {
      margin-bottom: 8px;
    }

    .error button {
      margin-top: 12px;
      padding: 8px 16px;
      background: ${we(d.accent)};
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
      background: ${we(d.bgSecondary)};
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

    /* ── Redesigned boiler tab (2026-06): model+map, slim strip, SoC, plan ── */
    .boiler-model-row {
      display: grid;
      /* Model and draw map share the row equally (half and half). */
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
      align-items: start;
    }
    .boiler-model-row > oig-boiler-model,
    .boiler-model-row > oig-boiler-draw-map { min-width: 0; }
    oig-boiler-soc-chart, oig-boiler-plan { display: block; margin-bottom: 14px; }
    .boiler-slim {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 14px;
    }
    .boiler-slim .slim-tile {
      background: ${X(d.cardBg)};
      border-radius: 12px;
      box-shadow: ${X(d.cardShadow)};
      padding: 11px 13px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .boiler-slim .k { font-size: 11px; color: ${X(d.textSecondary)}; }
    .boiler-slim .v { font-size: 16px; font-weight: 650; color: ${X(d.textPrimary)}; }
    .boiler-slim .slim-chip { font-size: 12px; padding: 2px 8px; border-radius: 999px; font-weight: 600; background: rgba(255,179,0,0.16); color: #c98a00; }
    .boiler-slim .slim-chip.on { background: rgba(94,234,212,0.16); color: #2e9c89; }
    .boiler-slim .slim-chip.off { background: rgba(255,255,255,0.07); color: ${X(d.textSecondary)}; }
    @media (max-width: 900px) {
      .boiler-model-row { grid-template-columns: 1fr; }
      .boiler-slim { grid-template-columns: repeat(2, 1fr); }
    }

    .boiler-stage {
      display: grid;
      grid-template-areas: 'source shell comfort';
      grid-template-columns: 1fr 300px 1fr;
      gap: 12px;
      /* mockup: all three cards share the tank card's height */
      align-items: stretch;
    }

    .boiler-stage > oig-boiler-metric-panel,
    .boiler-stage > oig-boiler-v2-shell {
      height: 100%;
    }

    @media (max-width: 1023px) {
      .boiler-stage {
        grid-template-areas:
          'source'
          'shell'
          'comfort';
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 599px) {
      .boiler-stage {
        grid-template-areas:
          'source'
          'shell'
          'comfort';
        grid-template-columns: 1fr;
      }
    }

    .boiler-header {
      margin-bottom: 8px;
    }

    .boiler-header h1 {
      margin: 0 0 6px;
      font-size: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .boiler-badge {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 12px;
      background: rgba(35,43,53,1);
      color: #4ade80;
      font-weight: 500;
    }

    .boiler-badge.degr {
      background: rgba(245,184,0,.15);
      color: #f5b800;
    }

    .boiler-badge.boiler-badge--age {
      background: rgba(255,255,255,.06);
      color: #9aa6b2;
      font-weight: 400;
    }

    .boiler-status-chip-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 6px;
    }

    .boiler-controls-section {
      margin-top: 4px;
    }

    .boiler-controls-section > summary {
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: #9aa6b2;
      padding: 8px 0;
      list-style: none;
      user-select: none;
    }

    .boiler-controls-section > summary::-webkit-details-marker {
      display: none;
    }

    .boiler-controls-section > summary::before {
      content: '▶ ';
      font-size: 9px;
      opacity: 0.6;
    }

    .boiler-controls-section[open] > summary::before {
      content: '▼ ';
    }

    .boiler-controls-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 8px;
    }

    /* ---- Flow tab layout: dlaždice | canvas | systém ---- */
    .flow-layout {
      display: grid;
      grid-template-columns: 212px 1fr 300px;
      grid-template-areas: 'tiles canvas control';
      gap: 12px;
      width: 100%;
      align-items: start;
    }

    .flow-tiles-stack {
      grid-area: tiles;
      min-width: 0;
    }

    .flow-center {
      grid-area: canvas;
      min-width: 0;
    }

    .flow-control {
      grid-area: control;
      min-width: 0;
    }

    /* ---- Unified "Ovládání" card: Systém OIG + Moje dlaždice ---- */
    .control-stack {
      background: ${we(d.cardBg)};
      border-radius: 16px;
      box-shadow: ${we(d.cardShadow)};
      overflow: hidden;
    }

    .control-stack__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 13px 16px 11px;
      border-bottom: 1px solid ${we(d.divider)};
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${we(d.textPrimary)};
    }

    .control-stack__block {
      padding: 12px 14px;
    }

    .control-stack__add {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: 1px solid color-mix(in srgb, ${we(d.accent)} 45%, transparent);
      background: color-mix(in srgb, ${we(d.accent)} 12%, transparent);
      color: ${we(d.accent)};
      border-radius: 8px;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.15s ease;
    }

    .control-stack__add:hover {
      background: color-mix(in srgb, ${we(d.accent)} 22%, transparent);
      transform: translateY(-1px);
    }

    .control-stack__tiles-empty {
      font-size: 12px;
      color: ${we(d.textSecondary)};
      opacity: 0.6;
      text-align: center;
      padding: 6px 0 2px;
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
      background: ${we(d.cardBg)};
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      font-size: 12px;
      color: ${we(d.textSecondary)};
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
      /* Same 4-column track + gap as .analytics-row below, so the tile edges
         line up: planned tile spans 1 column, the mode-plan tile spans 3. */
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      align-items: start;
    }

    .below-chart-pair > :first-child { grid-column: span 1; }
    .below-chart-pair > :last-child { grid-column: span 3; }

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

    .boiler-setup-guide {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      background: ${we(d.cardBg)};
      border: 1px solid ${we(d.divider)};
      border-radius: 8px;
      font-size: 13px;
      color: ${we(d.textSecondary)};
    }

    .boiler-setup-guide__icon {
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
    }

    .boiler-setup-guide__text strong {
      display: block;
      color: ${we(d.textPrimary)};
      margin-bottom: 2px;
    }

    .boiler-setup-guide__text p {
      margin: 0;
    }

    /* ---- Responsive ---- */
    /* Tablet 768–1200: užší dlaždice + systém kolem pentagonu */
    @media (max-width: 1200px) {
      .flow-layout {
        grid-template-columns: 168px 1fr 248px;
        gap: 8px;
      }
    }

    /* Mobile <768: Single column — pentagon, dlaždice (hned vidět), systém */
    @media (max-width: 768px) {
      .flow-layout {
        grid-template-columns: 1fr;
        grid-template-areas:
          'canvas'
          'tiles'
          'control';
        gap: 8px;
      }
      .analytics-row {
        grid-template-columns: 1fr;
      }
      .below-chart-pair {
        grid-template-columns: 1fr;
      }
    }

    /* Landscape kiosk (Google Nest Hub ~768×543): pentagon + Systém OIG vedle
       sebe, dlaždice skryté (sekundární), panel scrolluje uvnitř. */
    @media (orientation: landscape) and (max-height: 600px) {
      main { padding: 6px 10px; }
      .flow-layout {
        grid-template-columns: 1fr 252px;
        grid-template-areas: 'canvas control';
        gap: 8px;
        align-items: start;
      }
      .flow-tiles-stack { display: none; }
      .flow-center { grid-area: canvas; }
      .flow-control {
        grid-area: control;
        max-height: calc(100vh - 78px);
        overflow-y: auto;
      }
    }

    /* ---- Simulator overlay (fe/fix) ----
       z-index above the onboarding overlay (1000): the trigger buttons live
       inside wizard steps, so this must stack on top of it. */
    .simulator-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      animation: fadeIn 0.12s ease-out;
      padding: 16px;
      box-sizing: border-box;
    }

    .simulator-modal {
      position: relative;
      width: min(1120px, 100%);
      max-height: calc(100vh - 32px);
      overflow: auto;
      border-radius: 18px;
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
    }

    .simulator-modal-close {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1;
      background: rgba(15, 20, 34, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #fff;
      border-radius: 8px;
      width: 30px;
      height: 30px;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
    }
  `;se([m({type:Object})],ne.prototype,"hass",2);se([m({attribute:!1})],ne.prototype,"onboarding",2);se([S()],ne.prototype,"loading",2);se([S()],ne.prototype,"error",2);se([S()],ne.prototype,"activeTab",2);se([S()],ne.prototype,"editMode",2);se([S()],ne.prototype,"time",2);se([S()],ne.prototype,"flowData",2);se([S()],ne.prototype,"pricingData",2);se([S()],ne.prototype,"pricingLoading",2);se([S()],ne.prototype,"boilerState",2);se([S()],ne.prototype,"boilerLoading",2);se([S()],ne.prototype,"boilerV2Data",2);se([S()],ne.prototype,"boilerConfig",2);se([S()],ne.prototype,"boxHasHome56",2);se([S()],ne.prototype,"enablePricing",2);se([S()],ne.prototype,"enableBoiler",2);se([S()],ne.prototype,"enableStatistics",2);se([S()],ne.prototype,"enablePrediction",2);se([S()],ne.prototype,"analyticsData",2);se([S()],ne.prototype,"chmuData",2);se([S()],ne.prototype,"weatherData",2);se([S()],ne.prototype,"chmuModalOpen",2);se([S()],ne.prototype,"timelineTab",2);se([S()],ne.prototype,"timelineData",2);se([S()],ne.prototype,"tilesConfig",2);se([S()],ne.prototype,"tilesLeft",2);se([S()],ne.prototype,"tilesRight",2);se([S()],ne.prototype,"tileDialogOpen",2);se([S()],ne.prototype,"editingTileIndex",2);se([S()],ne.prototype,"editingTileSide",2);se([S()],ne.prototype,"editingTileConfig",2);se([S()],ne.prototype,"onboardingWizardOpen",2);se([S()],ne.prototype,"simulatorOpen",2);se([S()],ne.prototype,"simulatorDomain",2);se([S()],ne.prototype,"simulatorDraft",2);ne=se([E("oig-app")],ne);L.info("V2 starting",{version:"2.0.0-beta.1"});rp();async function Cx(){try{const e=await ip(),t=document.getElementById("app");t&&(t.innerHTML="",t.appendChild(e)),L.info("V2 mounted successfully")}catch(e){L.error("V2 bootstrap failed",e);const t=document.getElementById("app");t&&(t.innerHTML=`
        <div style="padding: 20px; font-family: system-ui;">
          <h2>Chyba načítání</h2>
          <p>Nepodařilo se načíst dashboard. Zkuste obnovit stránku.</p>
          <details>
            <summary>Detaily</summary>
            <pre>${e.message}</pre>
          </details>
        </div>`)}}Cx();
//# sourceMappingURL=index.js.map
