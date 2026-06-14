var $l=Object.defineProperty;var kl=(e,t,i)=>t in e?$l(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var z=(e,t,i)=>kl(e,typeof t!="symbol"?t+"":t,i);import{f as Cl,u as Ml,b as c,i as T,a as D,r as Q,w as F,A as w,E as Sl}from"./vendor.js";import{C as _n,a as ls,L as cs,P as ds,b as ps,i as us,p as hs,c as gs,d as Al,T as Ll,e as Hl,B as Vl,f as Tl,g as Pl,h as zl,j as Dl,k as ms}from"./charts.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&r(o)}).observe(document,{childList:!0,subtree:!0});function i(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(n){if(n.ep)return;n.ep=!0;const a=i(n);fetch(n.href,a)}})();const Ht="[V2]";function El(){return new Date().toISOString().substr(11,12)}function Ir(e,t){const i=El(),r=e.toUpperCase().padEnd(5);return`${i} ${r} ${t}`}const L={debug(e,t){typeof window<"u"&&window.OIG_DEBUG&&console.debug(Ht,Ir("debug",e),t??"")},info(e,t){console.info(Ht,Ir("info",e),t??"")},warn(e,t){console.warn(Ht,Ir("warn",e),t??"")},error(e,t,i){const r=t?{error:t.message,stack:t.stack,...i}:i;console.error(Ht,Ir("error",e),r??"")},time(e){console.time(`${Ht} ${e}`)},timeEnd(e){console.timeEnd(`${Ht} ${e}`)},group(e){console.group(`${Ht} ${e}`)},groupEnd(){console.groupEnd()}};function Ol(){window.addEventListener("error",Fl),window.addEventListener("unhandledrejection",Il),L.debug("Error handling setup complete")}function Fl(e){const t=e.error||new Error(e.message);L.error("Uncaught error",t,{filename:e.filename,lineno:e.lineno,colno:e.colno}),e.preventDefault()}function Il(e){const t=e.reason instanceof Error?e.reason:new Error(String(e.reason));L.error("Unhandled promise rejection",t),e.preventDefault()}class bs extends Error{constructor(t,i,r=!1,n){super(t),this.code=i,this.recoverable=r,this.cause=n,this.name="AppError"}}class Ii extends bs{constructor(t="Authentication failed"){super(t,"AUTH_ERROR",!1),this.name="AuthError"}}class Za extends bs{constructor(t="Network error",i){super(t,"NETWORK_ERROR",!0,i),this.name="NetworkError"}}const Bl="oig_v2_";function Nl(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"";return/Home Assistant|HomeAssistant|HAcompanion/i.test(t)}catch{return!1}}function jl(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"",i=/Android|iPhone|iPad|iPod|Mobile/i.test(t),r=globalThis.innerWidth<=768;return i||r}catch{return!1}}const je={isHaApp:!1,isMobile:!1,reduceMotion:!1};async function Rl(){var i,r;L.info("Bootstrap starting"),Ol(),je.isHaApp=Nl(),je.isMobile=jl(),je.reduceMotion=je.isHaApp||je.isMobile||((r=(i=globalThis.matchMedia)==null?void 0:i.call(globalThis,"(prefers-reduced-motion: reduce)"))==null?void 0:r.matches)||!1;const e=document.documentElement;je.isHaApp&&e.classList.add("oig-ha-app"),je.isMobile&&e.classList.add("oig-mobile"),je.reduceMotion&&e.classList.add("oig-reduce-motion");const t={version:"2.0.0-beta.1",storagePrefix:Bl};return L.info("Bootstrap complete",{...t,isHaApp:je.isHaApp,isMobile:je.isMobile,reduceMotion:je.reduceMotion}),document.createElement("oig-app")}const s={bgPrimary:"var(--primary-background-color, #ffffff)",bgSecondary:"var(--secondary-background-color, #f5f5f5)",textPrimary:"var(--primary-text-color, #212121)",textSecondary:"var(--secondary-text-color, #757575)",accent:"var(--accent-color, #03a9f4)",divider:"var(--divider-color, #e0e0e0)",error:"var(--error-color, #db4437)",success:"var(--success-color, #0f9d58)",warning:"var(--warning-color, #f4b400)",cardBg:"var(--card-background-color, #ffffff)",cardBgSolid:"var(--oig-surface, #ffffff)",cardShadow:"var(--shadow-elevation-2dp_-_box-shadow, 0 2px 2px 0 rgba(0,0,0,0.14))",fontFamily:"var(--primary-font-family, system-ui, sans-serif)"},Ka={"--primary-background-color":"#111936","--secondary-background-color":"#1a2044","--primary-text-color":"#e1e1e1","--secondary-text-color":"rgba(255,255,255,0.7)","--accent-color":"#03a9f4","--divider-color":"rgba(255,255,255,0.12)","--error-color":"#ef5350","--success-color":"#66bb6a","--warning-color":"#ffa726","--card-background-color":"rgba(255,255,255,0.06)","--oig-surface":"#1b2440","--shadow-elevation-2dp_-_box-shadow":"0 2px 4px 0 rgba(0,0,0,0.4)"},qa={"--primary-background-color":"#ffffff","--secondary-background-color":"#f5f5f5","--primary-text-color":"#212121","--secondary-text-color":"#757575","--accent-color":"#03a9f4","--divider-color":"#e0e0e0","--error-color":"#db4437","--success-color":"#0f9d58","--warning-color":"#f4b400","--card-background-color":"#ffffff","--oig-surface":"#ffffff","--shadow-elevation-2dp_-_box-shadow":"0 2px 2px 0 rgba(0,0,0,0.14)"};function Rn(){var e,t;try{if(window.parent&&window.parent!==window){const i=(t=(e=window.parent.document)==null?void 0:e.querySelector("home-assistant"))==null?void 0:t.hass;if(i!=null&&i.themes){if(typeof i.themes.darkMode=="boolean")return i.themes.darkMode;const r=(i.themes.theme||"").toLowerCase();if(r.includes("dark"))return!0;if(r.includes("light"))return!1}}}catch{}return window.matchMedia("(prefers-color-scheme: dark)").matches}function Wn(e){const t=e?Ka:qa,i=document.documentElement;for(const[r,n]of Object.entries(t))i.style.setProperty(r,n);i.classList.toggle("dark",e),document.body.style.background=e?Ka["--secondary-background-color"]:qa["--secondary-background-color"]}function Wl(){const e=Rn();Wn(e),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{const i=Rn();Wn(i)}),setInterval(()=>{const i=Rn(),r=document.documentElement.classList.contains("dark");i!==r&&Wn(i)},5e3)}const Ga={mobile:768,tablet:1024};function ci(e){return e<Ga.mobile?"mobile":e<Ga.tablet?"tablet":"desktop"}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const E=e=>(t,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Zl={attribute:!0,type:String,converter:Ml,reflect:!1,hasChanged:Cl},Kl=(e=Zl,t,i)=>{const{kind:r,metadata:n}=i;let a=globalThis.litPropertyMetadata.get(n);if(a===void 0&&globalThis.litPropertyMetadata.set(n,a=new Map),r==="setter"&&((e=Object.create(e)).wrapped=!0),a.set(i.name,e),r==="accessor"){const{name:o}=i;return{set(l){const d=t.get.call(this);t.set.call(this,l),this.requestUpdate(o,d,e,!0,l)},init(l){return l!==void 0&&this.C(o,void 0,e,l),l}}}if(r==="setter"){const{name:o}=i;return function(l){const d=this[o];t.call(this,l),this.requestUpdate(o,d,e,!0,l)}}throw Error("Unsupported decorator location: "+r)};function g(e){return(t,i)=>typeof i=="object"?Kl(e,t,i):((r,n,a)=>{const o=n.hasOwnProperty(a);return n.constructor.createProperty(a,r),o?Object.getOwnPropertyDescriptor(n,a):void 0})(e,t,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function H(e){return g({...e,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ql=(e,t,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof t!="object"&&Object.defineProperty(e,t,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function $n(e,t){return(i,r,n)=>{const a=o=>{var l;return((l=o.renderRoot)==null?void 0:l.querySelector(e))??null};return ql(i,r,{get(){return a(this)}})}}class Gl{constructor(){this.callbacks=new Set,this.watched=new Set,this.watchedPrefixes=new Set,this.unsub=null,this.running=!1,this.getHass=null,this.activeConnection=null}registerEntities(t){for(const i of t)typeof i=="string"&&i.length>0&&this.watched.add(i)}registerPrefix(t){var r;if(typeof t!="string"||t.length===0)return;this.watchedPrefixes.add(t);const i=(r=this.getHass)==null?void 0:r.call(this);if(i!=null&&i.states){const n=Object.keys(i.states).filter(a=>a.startsWith(t));this.registerEntities(n)}}onEntityChange(t){return this.callbacks.add(t),()=>{this.callbacks.delete(t)}}async start(t){this.getHass=t.getHass;const i=this.getHass();if(!(i!=null&&i.connection)){L.debug("StateWatcher: hass not ready, retrying in 500ms"),setTimeout(()=>this.start(t),500);return}if(this.running&&this.activeConnection===i.connection){const n=t.prefixes??[];for(const a of n)this.registerPrefix(a);return}this.running&&this.stop(),this.running=!0,this.activeConnection=i.connection;const r=t.prefixes??[];for(const n of r)this.registerPrefix(n);try{this.unsub=await i.connection.subscribeEvents(n=>this.handleStateChanged(n),"state_changed"),L.info("StateWatcher started",{prefixes:r,watchedCount:this.watched.size})}catch(n){this.running=!1,this.activeConnection=null,L.error("StateWatcher failed to subscribe",n)}}stop(){if(this.running=!1,this.activeConnection=null,this.unsub)try{this.unsub()}catch{}this.unsub=null,L.info("StateWatcher stopped")}isWatched(t){return this.matchesWatched(t)}destroy(){this.stop(),this.callbacks.clear(),this.watched.clear(),this.watchedPrefixes.clear(),this.getHass=null}matchesWatched(t){if(this.watched.has(t))return!0;for(const i of this.watchedPrefixes)if(t.startsWith(i))return!0;return!1}handleStateChanged(t){var n;const i=(n=t==null?void 0:t.data)==null?void 0:n.entity_id;if(!i||!this.matchesWatched(i))return;const r=t.data.new_state;for(const a of this.callbacks)try{a(i,r)}catch{}}}const Ft=new Gl;class Ul{constructor(t,i=""){this.subscriptions=new Map,this.cache=new Map,this.stateWatcherUnsub=null,this.hass=t,this.inverterSn=i,this.init()}init(){var t;if((t=this.hass)!=null&&t.states)for(const[i,r]of Object.entries(this.hass.states))this.cache.set(i,r);this.stateWatcherUnsub=Ft.onEntityChange((i,r)=>{r?this.cache.set(i,r):this.cache.delete(i),this.notifySubscribers(i,r)}),L.debug("EntityStore initialized",{entities:this.cache.size,inverterSn:this.inverterSn})}getSensorId(t){return`sensor.oig_${this.inverterSn}_${t}`}findSensorId(t){const i=this.getSensorId(t);for(const r of this.cache.keys()){if(r===i)return r;if(r.startsWith(i+"_")){const n=r.substring(i.length+1);if(/^\d+$/.test(n))return r}}return i}subscribe(t,i){this.subscriptions.has(t)||this.subscriptions.set(t,new Set),this.subscriptions.get(t).add(i),Ft.registerEntities([t]);const r=this.cache.get(t)??null;return i(r),()=>{var n,a;(n=this.subscriptions.get(t))==null||n.delete(i),((a=this.subscriptions.get(t))==null?void 0:a.size)===0&&this.subscriptions.delete(t)}}getNumeric(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"&&parseFloat(i.state)||0,lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:0,lastUpdated:null,attributes:{},exists:!1}}getString(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"?i.state:"",lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:"",lastUpdated:null,attributes:{},exists:!1}}get(t){return this.cache.get(t)??null}getAll(){return Object.fromEntries(this.cache)}batchLoad(t){const i={};for(const r of t)i[r]=this.getNumeric(r);return i}updateHass(t){if(this.hass=t,t!=null&&t.states){const i=new Set(Object.keys(t.states));for(const r of Array.from(this.cache.keys()))i.has(r)||(this.cache.delete(r),this.notifySubscribers(r,null));for(const[r,n]of Object.entries(t.states)){const a=this.cache.get(r),o=n;this.cache.set(r,o),((a==null?void 0:a.state)!==o.state||(a==null?void 0:a.last_updated)!==o.last_updated)&&this.notifySubscribers(r,o)}}}notifySubscribers(t,i){const r=this.subscriptions.get(t);if(r)for(const n of r)try{n(i)}catch(a){L.error("Entity callback error",a,{entityId:t})}}destroy(){var t;(t=this.stateWatcherUnsub)==null||t.call(this),this.subscriptions.clear(),this.cache.clear(),L.debug("EntityStore destroyed")}}let Yi=null;function Yl(e,t){return Yi&&Yi.destroy(),Yi=new Ul(e,t),Yi}function ut(){return Yi}const Ql=3,Xl=1e3;class Jl{constructor(){this.hass=null,this.initPromise=null}async getHass(){return this.hass?this.hass:this.initPromise?this.initPromise:(this.initPromise=this.initHass(),this.initPromise)}getHassSync(){return this.hass}async refreshHass(){const t=await this.findHass();return t?(this.hass=t,L.info("HASS client refreshed"),t):this.hass}async initHass(){L.debug("Initializing HASS client");const t=await this.findHass();return t?(this.hass=t,L.info("HASS client initialized"),t):(L.warn("HASS not found in parent context"),null)}async findHass(){var t,i;if(typeof window>"u")return null;if(window.hass)return window.hass;if(window.parent&&window.parent!==window)try{const r=(i=(t=window.parent.document)==null?void 0:t.querySelector("home-assistant"))==null?void 0:i.hass;if(r)return r}catch{L.debug("Cannot access parent HASS (cross-origin)")}return window.customPanel?window.customPanel.hass:null}async fetchWithAuth(t,i={}){var o,l;const r=await this.getHass();if(!r)throw new Ii("Cannot get HASS context");try{const p=new URL(t,window.location.href).hostname;if(p!=="localhost"&&p!=="127.0.0.1"&&!t.startsWith("/api/"))throw new Error(`fetchWithAuth rejected for non-localhost URL: ${t}`)}catch(d){if(d.message.includes("rejected"))throw d}const n=(l=(o=r.auth)==null?void 0:o.data)==null?void 0:l.access_token;if(!n)throw new Ii("No access token available");const a=new Headers(i.headers);return a.set("Authorization",`Bearer ${n}`),a.has("Content-Type")||a.set("Content-Type","application/json"),this.fetchWithRetry(t,{...i,headers:a})}async fetchWithRetry(t,i,r=Ql){try{const n=await fetch(t,i);if(!n.ok)throw n.status===401?new Ii("Token expired or invalid"):new Za(`HTTP ${n.status}: ${n.statusText}`);return n}catch(n){if(r>0&&n instanceof Za)return L.warn(`Retrying fetch (${r} left)`,{url:t}),await this.delay(Xl),this.fetchWithRetry(t,i,r-1);throw n}}async callApi(t,i,r){const n=await this.getHass();if(!n)throw new Ii("Cannot get HASS context");return n.callApi(t,i,r)}async callService(t,i,r){const n=await this.getHass();if(!(n!=null&&n.callService))return L.error("Cannot call service — hass not available"),!1;try{return await n.callService(t,i,r),!0}catch(a){return L.error(`Service call failed (${t}.${i})`,a),!1}}async callWS(t){const i=await this.getHass();if(!(i!=null&&i.callWS))throw new Ii("Cannot get HASS context for WS call");return i.callWS(t)}async fetchOIGAPI(t,i={}){try{const r=`/api/oig_cloud${t.startsWith("/")?"":"/"}${t}`;return await(await this.fetchWithAuth(r,{...i,headers:{"Content-Type":"application/json",...Object.fromEntries(new Headers(i.headers).entries())}})).json()}catch(r){return L.error(`OIG API fetch error for ${t}`,r),null}}async loadBatteryTimeline(t,i="active"){return this.fetchOIGAPI(`/battery_forecast/${t}/timeline?type=${i}`)}async loadUnifiedCostTile(t){return this.fetchOIGAPI(`/battery_forecast/${t}/unified_cost_tile`)}async loadSpotPrices(t){return this.fetchOIGAPI(`/spot_prices/${t}/intervals`)}async loadAnalytics(t){return this.fetchOIGAPI(`/analytics/${t}`)}async loadPlannerSettings(t){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`)}async savePlannerSettings(t,i){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`,{method:"POST",body:JSON.stringify(i)})}async loadDetailTabs(t,i,r="hybrid"){return this.fetchOIGAPI(`/battery_forecast/${t}/detail_tabs?tab=${i}&plan=${r}`)}async loadModules(t){return this.fetchOIGAPI(`/${t}/modules`)}openEntityDialog(t){var i;try{const r=((i=window.parent.document)==null?void 0:i.querySelector("home-assistant"))??document.querySelector("home-assistant");if(!r)return L.warn("Cannot open entity dialog — home-assistant element not found"),!1;const n=new CustomEvent("hass-more-info",{bubbles:!0,composed:!0,detail:{entityId:t}});return r.dispatchEvent(n),!0}catch(r){return L.error("Cannot open entity dialog",r),!1}}async showNotification(t,i,r="success"){await this.callService("persistent_notification","create",{title:t,message:i,notification_id:`oig_dashboard_${Date.now()}`})||console.log(`[${r.toUpperCase()}] ${t}: ${i}`)}getToken(){var t,i,r;return((r=(i=(t=this.hass)==null?void 0:t.auth)==null?void 0:i.data)==null?void 0:r.access_token)??null}delay(t){return new Promise(i=>setTimeout(i,t))}}const ee=new Jl,Ua={solar:"#ffd54f",battery:"#4caf50",inverter:"#9575cd",grid:"#42a5f5",house:"#f06292"},Bi={solar:"linear-gradient(135deg, rgba(255,213,79,0.15) 0%, rgba(255,179,0,0.08) 100%)",battery:"linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(56,142,60,0.08) 100%)",grid:"linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(33,150,243,0.08) 100%)",house:"linear-gradient(135deg, rgba(240,98,146,0.15) 0%, rgba(233,30,99,0.08) 100%)",inverter:"linear-gradient(135deg, rgba(149,117,205,0.15) 0%, rgba(126,87,194,0.08) 100%)"},Br={battery:"rgba(76,175,80,0.4)",grid:"rgba(66,165,245,0.4)",house:"rgba(240,98,146,0.4)",inverter:"rgba(149,117,205,0.4)"},ti={solar:"#ffd54f",battery:"#ff9800",grid_import:"#f44336",grid_export:"#4caf50",house:"#f06292"},Nr={solar:5400,battery:7e3,grid:17e3,house:1e4},_a={solarPower:0,solarP1:0,solarP2:0,solarV1:0,solarV2:0,solarI1:0,solarI2:0,solarPercent:0,solarToday:0,solarForecastToday:0,solarForecastTomorrow:0,solarForecastStale:!1,batterySoC:0,batteryPower:0,batteryVoltage:0,batteryCurrent:0,batteryTemp:0,batteryChargeTotal:0,batteryDischargeTotal:0,batteryChargeSolar:0,batteryChargeGrid:0,batteryChargeMonth:0,batteryDischargeMonth:0,batteryFloorPct:0,batteryUsableKwh:0,batteryInstalledKwh:0,batteryMissingKwh:0,batterySoH:0,batteryEfficiency:0,batteryForecastKwh:0,isGridCharging:!1,timeToEmpty:"",timeToFull:"",balancingState:"standby",balancingTimeRemaining:"",gridChargingPlan:{hasBlocks:!1,totalEnergyKwh:0,totalCostCzk:0,windowLabel:null,durationMinutes:0,currentBlockLabel:null,nextBlockLabel:null,blocks:[]},gridPower:0,gridVoltage:0,gridFrequency:0,gridImportToday:0,gridExportToday:0,gridL1V:0,gridL2V:0,gridL3V:0,gridL1P:0,gridL2P:0,gridL3P:0,spotPrice:0,exportPrice:0,currentTariff:"",gridImportCostToday:null,gridImportCostMonth:null,gridExportEarningsToday:null,gridExportEarningsMonth:null,housePower:0,houseTodayWh:0,houseL1:0,houseL2:0,houseL3:0,nonbackupPower:0,nonbackupTodayWh:0,nonbackupL1:0,nonbackupL2:0,nonbackupL3:0,zalohaPlannedRemainingKwh:0,selfSufficiencyTodayPct:0,srcFveTodayKwh:0,srcBatteryTodayKwh:0,srcGridTodayKwh:0,inverterMode:"",inverterGridMode:"unknown",inverterGridLimit:0,inverterTemp:0,bypassStatus:"off",notificationsUnread:0,notificationsError:0,boilerIsUse:!1,boilerPower:0,boilerDayEnergy:0,boilerManualMode:"",boilerInstallPower:3e3,plannerAutoMode:null,plannerRecommendedMode:"",lastUpdate:""},fs={home_1:"Home 1",home_2:"Home 2",home_3:"Home 3",home_ups:"Home UPS"},Ya={"Home 1":"home_1","Home 2":"home_2","Home 3":"home_3","Home UPS":"home_ups","Mode 0":"home_1","Mode 1":"home_2","Mode 2":"home_3","Mode 3":"home_ups","HOME I":"home_1","HOME II":"home_2","HOME III":"home_3","HOME UPS":"home_ups",0:"home_1",1:"home_2",2:"home_3",3:"home_ups"},Qi={off:"Vypnuto",on:"Zapnuto",limited:"S omezením"},Zn={Vypnuto:"off",Zapnuto:"on",Omezeno:"limited",omezeno:"limited",vypnuto:"off",zapnuto:"on",Off:"off",On:"on",Limited:"limited",off:"off",on:"on",limited:"limited",0:"off",1:"on",2:"limited"},ec={off:"🚫",on:"💧",limited:"🚰"},vs={cbb:"Inteligentní",manual:"Manuální"},ys={cbb:"🤖",manual:"👤"},Qa={CBB:"cbb",Manuální:"manual",Manual:"manual",Inteligentní:"cbb"},tc={set_box_mode:"🏠 Změna režimu boxu",set_grid_delivery:"💧 Změna nastavení přetoků",set_grid_delivery_limit:"🔢 Změna limitu přetoků",set_boiler_mode:"🔥 Změna nastavení bojleru",set_formating_mode:"🔋 Změna nabíjení baterie",set_battery_capacity:"⚡ Změna kapacity baterie"},ic={CBB:"Inteligentní",Manual:"Manuální",Manuální:"Manuální"},xs={0:"Žádný",1:"Home 5",2:"Home 6",3:"Home 5 + Home 6",4:"Flexibilita"},ws={status:"idle",activity:"",queueCount:0,runningRequests:[],queuedRequests:[],allRequests:[],currentBoxMode:"home_1",currentGridDelivery:"off",currentGridLimit:0,currentBoilerMode:"cbb",pendingServices:new Map,changingServices:new Set,gridDeliveryState:{currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},supplementary:{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1}},rc="probíhá změna";function la(e){return e.trim().toLowerCase().includes(rc)}function $a(e){const t=e.trim();if(t in Zn)return Zn[t];const i=t.toLowerCase(),r=Object.entries(Zn).find(([n])=>n.toLowerCase()===i);return r?r[1]:i.startsWith("omez")||i.includes("limit")?"limited":i.startsWith("zapn")||i==="on"?"on":i.startsWith("vypn")||i==="off"?"off":"unknown"}function nc(e){const t=e.get("grid_mode");if(!t)return null;const i=$a(t);return i==="unknown"?null:i}function ac(e){const t=e.get("grid_limit");if(!t)return null;const i=parseInt(t,10);return Number.isFinite(i)&&i>=0?i:null}function oc(e){return e.changingServices.has("grid_mode")||e.changingServices.has("grid_limit")}function _s(e,t){const{gridModeRaw:i,gridLimit:r}=e,n=i.trim().toLowerCase(),a=n==="unavailable"||n==="unknown"||n==="",o=la(i),l=oc(t),d=o||l;let p;a||o?p="unknown":p=$a(i);let u=null;!a&&Number.isFinite(r)&&r>=0&&(u=r);const h=nc(t.pendingServices),m=ac(t.pendingServices);return{currentLiveDelivery:p,currentLiveLimit:u,pendingDeliveryTarget:h,pendingLimitTarget:m,isTransitioning:d,isUnavailable:a}}function sc(e){return e.isTransitioning&&e.pendingDeliveryTarget?e.pendingDeliveryTarget:e.currentLiveDelivery}const Xa=new URLSearchParams(window.location.search),ka=Xa.get("sn")||Xa.get("inverter_sn")||"";function Ur(e,t=ka){return`sensor.oig_${t}_${e}`}function Ja(e,t,i=ka){var a;const r=Ur(t,i);return r in e?r:((a=Object.keys(e).filter(o=>o.startsWith(r+"_")).map(o=>({id:o,suffix:parseInt(o.substring(r.length+1),10)})).filter(o=>Number.isFinite(o.suffix)).sort((o,l)=>o.suffix-l.suffix)[0])==null?void 0:a.id)??null}function R(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function Ge(e){return!(e!=null&&e.state)||e.state==="unknown"||e.state==="unavailable"?"":e.state}function eo(e,t="on"){if(!(e!=null&&e.state))return!1;const i=e.state.toLowerCase();return i===t||i==="1"||i==="zapnuto"}function lc(e){const t=(e||"").toLowerCase();return t==="charging"?"charging":t==="balancing"||t==="holding"?"holding":t==="completed"?"completed":t==="planned"?"planned":"standby"}function ca(e){return e==="tomorrow"?"zítra":e==="today"?"dnes":""}function to(e){if(!e)return null;const[t,i]=e.split(":").map(Number);return!Number.isFinite(t)||!Number.isFinite(i)?null:t*60+i}function cc(e){const t=Number(e.grid_import_kwh??e.grid_charge_kwh??0);if(Number.isFinite(t)&&t>0)return t;const i=Number(e.battery_start_kwh??0),r=Number(e.battery_end_kwh??0);return Number.isFinite(i)&&Number.isFinite(r)?Math.max(0,r-i):0}function $s(e=[]){return[...e].sort((t,i)=>{const r=(t.day==="tomorrow"?1:0)-(i.day==="tomorrow"?1:0);return r!==0?r:(t.time_from||"").localeCompare(i.time_from||"")})}function dc(e){if(!Array.isArray(e)||e.length===0)return null;const t=$s(e),i=t[0],r=t.at(-1),n=ca(i==null?void 0:i.day),a=ca(r==null?void 0:r.day);if(n===a){const m=n?`${n} `:"";return!(i!=null&&i.time_from)||!(r!=null&&r.time_to)?m.trim()||null:`${m}${i.time_from} – ${r.time_to}`}const o=n?`${n} `:"",l=a?`${a} `:"",d=(i==null?void 0:i.time_from)||"--",p=(r==null?void 0:r.time_to)||"--",u=i?`${o}${d}`:"--",h=r?`${l}${p}`:"--";return`${u} → ${h}`}function pc(e){if(!Array.isArray(e)||e.length===0)return 0;let t=0;return e.forEach(i=>{const r=to(i.time_from),n=to(i.time_to);if(r===null||n===null)return;const a=n-r;a>0&&(t+=a)}),t}function io(e){const t=ca(e.day),i=t?`${t} `:"",r=e.time_from||"--",n=e.time_to||"--";return`${i}${r} - ${n}`}function uc(e){const t=e.find(n=>{const a=(n.status||"").toLowerCase();return a==="running"||a==="active"})||null,i=t?e[e.indexOf(t)+1]||null:e[0]||null;return{runningBlock:t,upcomingBlock:i,shouldShowNext:!!(i&&(!t||i!==t))}}function hc(e){const t=(e==null?void 0:e.attributes)||{},i=Array.isArray(t.charging_blocks)?t.charging_blocks:[],r=$s(i),n=Number(t.total_energy_kwh)||0,a=n>0?n:r.reduce((v,f)=>v+cc(f),0),o=Number(t.total_cost_czk)||0,l=o>0?o:r.reduce((v,f)=>v+Number(f.total_cost_czk||0),0),d=dc(r),p=pc(r),{runningBlock:u,upcomingBlock:h,shouldShowNext:m}=uc(r);return{hasBlocks:r.length>0,totalEnergyKwh:a,totalCostCzk:l,windowLabel:d,durationMinutes:p,currentBlockLabel:u?io(u):null,nextBlockLabel:m&&h?io(h):null,blocks:r}}function gc(e){const t=b=>Number.isFinite(b)&&b>=0?b:0,i=t(e.fveTodayWh),r=t(e.battDischargeTodayWh),n=t(e.battChargeFveTodayWh),a=t(e.gridExportTodayWh),o=t(e.zalohaConsumptionWh),l=t(e.nezalohaConsumptionWh),d=o+l;if(d<=0)return{pct:0,fveKwh:0,batteryKwh:0,gridKwh:0,arcFve:0,arcBattery:0,arcGrid:0};const p=Math.min(r,d),u=Math.max(0,i-n-a),h=Math.min(u,Math.max(0,d-p)),m=Math.max(0,d-h-p),v=(h+p)/d*100,f=b=>b/1e3;return{pct:Math.min(100,Math.max(0,v)),fveKwh:f(h),batteryKwh:f(p),gridKwh:f(m),arcFve:h/d,arcBattery:p/d,arcGrid:m/d}}function mc(e,t=ka){var Ia,Ba,Na,ja;const i=(e==null?void 0:e.states)||e||{},r=tt=>i[Ur(tt,t)]||null,n=R(r("actual_fv_p1")),a=R(r("actual_fv_p2")),o=R(r("extended_fve_voltage_1")),l=R(r("extended_fve_voltage_2")),d=R(r("extended_fve_current_1")),p=R(r("extended_fve_current_2")),u=r("solar_forecast"),h=tt=>{var Wa;const Lt=(Wa=u==null?void 0:u.attributes)==null?void 0:Wa[tt];if(Lt==null||Lt==="")return null;const Ra=parseFloat(Lt);return Number.isFinite(Ra)?Ra:null},m=h("today_total_kwh")??h("today_total_sum_kw")??R(u),v=h("tomorrow_total_kwh")??h("tomorrow_total_sum_kw")??0,f=((Ia=u==null?void 0:u.attributes)==null?void 0:Ia.forecast_stale)===!0,b=R(r("batt_bat_c")),$=R(r("batt_batt_comp_p")),y=R(r("extended_battery_voltage")),_=R(r("extended_battery_current")),S=R(r("extended_battery_temperature")),B=R(r("computed_batt_charge_energy_today")),P=R(r("computed_batt_discharge_energy_today")),N=R(r("computed_batt_charge_fve_energy_today")),k=R(r("computed_batt_charge_grid_energy_today")),A=R(r("computed_batt_charge_energy_month")),V=R(r("computed_batt_discharge_energy_month")),q=R(r("batt_bat_min")),K=R(r("usable_battery_capacity")),Z=R(r("installed_battery_capacity_kwh"))/1e3,j=R(r("missing_battery_kwh")),Pe=R(r("battery_health")),Ne=R(r("battery_efficiency")),X=R(r("battery_forecast")),he=r("grid_charging_planned"),C=eo(he),Y=Ge(r("time_to_empty")),re=Ge(r("time_to_full")),Ae=r("battery_balancing"),Le=lc((Ba=Ae==null?void 0:Ae.attributes)==null?void 0:Ba.current_state),Ee=Ge({state:(Na=Ae==null?void 0:Ae.attributes)==null?void 0:Na.time_remaining}),Tn=hc(he),Pn=R(r("actual_aci_wtotal")),Cr=R(r("extended_grid_voltage")),Ct=R(r("ac_in_aci_f")),Xt=R(r("ac_in_ac_ad")),Mr=R(r("ac_in_ac_pd")),zn=R(r("ac_in_aci_vr")),Sr=R(r("ac_in_aci_vs")),Mt=R(r("ac_in_aci_vt")),Ar=R(r("actual_aci_wr")),Lr=R(r("actual_aci_ws")),Jt=R(r("actual_aci_wt")),Dn=R(r("spot_price_current_15min")),zi=R(r("export_price_current_15min")),En=Ge(r("current_tariff")),St=tt=>{if(!tt||!tt.state||tt.state==="unknown"||tt.state==="unavailable")return null;const Lt=parseFloat(tt.state);return isNaN(Lt)?null:Lt},On=St(r("computed_grid_import_cost_today")),Hr=St(r("computed_grid_import_cost_month")),Fn=St(r("computed_grid_export_earnings_today")),Vr=St(r("computed_grid_export_earnings_month")),Tr=R(r("actual_aco_p")),Pr=R(r("ac_out_en_day")),In=R(r("ac_out_aco_pr")),Bn=R(r("ac_out_aco_ps")),zr=R(r("ac_out_aco_pt")),Dr=R(r("actual_acinb_wtotal")),ei=R(r("computed_nonbackup_consumption_today")),Nn=R(r("actual_acinb_wr")),Er=R(r("actual_acinb_ws")),Or=R(r("actual_acinb_wt")),M=r("battery_forecast"),oe=Number((ja=M==null?void 0:M.attributes)==null?void 0:ja.planned_consumption_today)||0,Di=Ge(r("box_prms_mode")),Ei=Ja(i,"invertor_prms_to_grid",t)||Ur("invertor_prms_to_grid",t),At=Ja(i,"invertor_prm1_p_max_feed_grid",t)||Ur("invertor_prm1_p_max_feed_grid",t),Oi=i[Ei],Fi=i[At],ll=(Oi==null?void 0:Oi.state)??"",cl=parseFloat((Fi==null?void 0:Fi.state)??"")||0,Oa=_s({gridModeRaw:ll,gridLimit:cl},{pendingServices:new Map,changingServices:new Set}),dl=Oa.currentLiveDelivery,pl=Oa.currentLiveLimit??0,ul=R(r("box_temp")),hl=Ge(r("bypass_status"))||"off",gl=R(r("notification_count_unread")),ml=R(r("notification_count_error")),jn=r("boiler_is_use"),bl=jn?eo(jn)||Ge(jn)==="Zapnuto":!1,fl=R(r("boiler_current_cbb_w")),vl=R(r("boiler_day_w")),yl=Ge(r("boiler_manual_mode")),xl=R(r("boiler_install_power"))||3e3,wl=r("real_data_update"),_l=Ge(wl),Fa=R(r("dc_in_fv_ad")),Fr=gc({fveTodayWh:Fa,battDischargeTodayWh:P,battChargeFveTodayWh:N,zalohaConsumptionWh:Pr,nezalohaConsumptionWh:ei,gridExportTodayWh:Mr});return{solarPower:n+a,solarP1:n,solarP2:a,solarV1:o,solarV2:l,solarI1:d,solarI2:p,solarPercent:R(r("dc_in_fv_proc")),solarToday:Fa,solarForecastToday:m,solarForecastTomorrow:v,solarForecastStale:f,batterySoC:b,batteryPower:$,batteryVoltage:y,batteryCurrent:_,batteryTemp:S,batteryChargeTotal:B,batteryDischargeTotal:P,batteryChargeSolar:N,batteryChargeGrid:k,batteryChargeMonth:A,batteryDischargeMonth:V,batteryFloorPct:q,batteryUsableKwh:K,batteryInstalledKwh:Z,batteryMissingKwh:j,batterySoH:Pe,batteryEfficiency:Ne,batteryForecastKwh:X,isGridCharging:C,timeToEmpty:Y,timeToFull:re,balancingState:Le,balancingTimeRemaining:Ee,gridChargingPlan:Tn,gridPower:Pn,gridVoltage:Cr,gridFrequency:Ct,gridImportToday:Xt,gridExportToday:Mr,gridL1V:zn,gridL2V:Sr,gridL3V:Mt,gridL1P:Ar,gridL2P:Lr,gridL3P:Jt,spotPrice:Dn,exportPrice:zi,currentTariff:En,gridImportCostToday:On,gridImportCostMonth:Hr,gridExportEarningsToday:Fn,gridExportEarningsMonth:Vr,housePower:Tr,houseTodayWh:Pr,houseL1:In,houseL2:Bn,houseL3:zr,nonbackupPower:Dr,nonbackupTodayWh:ei,nonbackupL1:Nn,nonbackupL2:Er,nonbackupL3:Or,zalohaPlannedRemainingKwh:oe,selfSufficiencyTodayPct:Fr.pct,srcFveTodayKwh:Fr.fveKwh,srcBatteryTodayKwh:Fr.batteryKwh,srcGridTodayKwh:Fr.gridKwh,inverterMode:Di,inverterGridMode:dl,inverterGridLimit:pl,inverterTemp:ul,bypassStatus:hl,notificationsUnread:gl,notificationsError:ml,boilerIsUse:bl,boilerPower:fl,boilerDayEnergy:vl,boilerManualMode:yl,boilerInstallPower:xl,plannerAutoMode:null,plannerRecommendedMode:Ge(r("planner_recommended_mode")),lastUpdate:_l}}const Ni={};function jr(e,t,i){const r=Math.abs(e),n=Math.min(100,r/t*100),a=Math.max(500,Math.round(3500-n*30));let o=a;return i&&Ni[i]!==void 0&&(o=Math.round(.3*a+(1-.3)*Ni[i]),Math.abs(o-Ni[i])<100&&(o=Ni[i])),i&&(Ni[i]=o),{active:r>=50,intensity:n,count:Math.max(1,Math.min(4,Math.ceil(1+n/33))),speed:o,size:Math.round(6+n/10),opacity:Math.min(1,.3+n/150)}}function Vt(e){return Math.abs(e)>=1e3?`${(e/1e3).toFixed(1)} kW`:`${Math.round(e)} W`}function ii(e){return e>=1e3?`${(e/1e3).toFixed(2)} kWh`:`${Math.round(e)} Wh`}function ro(e){return e.includes("Home 1")?{icon:"🏠",text:"Home 1"}:e.includes("Home 2")?{icon:"🔋",text:"Home 2"}:e.includes("Home 3")?{icon:"☀️",text:"Home 3"}:e.includes("UPS")?{icon:"⚡",text:"Home UPS"}:{icon:"⚙️",text:e||"--"}}const bc={"HOME I":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"HOME II":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"HOME III":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"rgba(158, 158, 158, 0.18)",label:"DO NOTHING"},"Mode 0":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"Mode 1":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"Mode 2":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"Mode 3":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"}},no={timeline:[],labels:[],prices:[],exportPrices:[],modeSegments:[],cheapestBuyBlock:null,expensiveBuyBlock:null,bestExportBlock:null,worstExportBlock:null,solar:null,battery:null,initialZoomStart:null,initialZoomEnd:null,currentSpotPrice:0,currentExportPrice:0,plannedConsumption:null,whatIf:null,solarForecastTotal:0,solarForecastTomorrow:0,solarForecastStale:!1},ao=new URLSearchParams(window.location.search),da=ao.get("sn")||ao.get("inverter_sn")||"";function ui(e){return`sensor.oig_${da}_${e}`}function oo(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function pa(e){const t=e.getFullYear(),i=String(e.getMonth()+1).padStart(2,"0"),r=String(e.getDate()).padStart(2,"0"),n=String(e.getHours()).padStart(2,"0"),a=String(e.getMinutes()).padStart(2,"0"),o=String(e.getSeconds()).padStart(2,"0");return`${t}-${i}-${r}T${n}:${a}:${o}`}const Xr={},fc=5*60*1e3;async function vc(e="hybrid"){const t=Xr[e];if(t&&Date.now()-t.ts<fc)return L.debug("Timeline cache hit",{plan:e,age:Math.round((Date.now()-t.ts)/1e3)}),t.data;try{const i=await ee.getHass();if(!i)return[];let r;i.callApi?r=await i.callApi("GET",`oig_cloud/battery_forecast/${da}/timeline?type=active`):r=await ee.fetchOIGAPI(`battery_forecast/${da}/timeline?type=active`);const n=(r==null?void 0:r.active)||(r==null?void 0:r.timeline)||[];return Xr[e]={data:n,ts:Date.now()},L.info("Timeline fetched",{plan:e,points:n.length}),n}catch(i){return L.error("Failed to fetch timeline",i),[]}}function yc(e){Object.keys(Xr).forEach(t=>delete Xr[t])}function xc(e){const t=new Date,i=new Date(t);return i.setMinutes(Math.floor(t.getMinutes()/15)*15,0,0),e.filter(r=>new Date(r.timestamp)>=i)}function wc(e){return e.map(t=>{if(!t.timestamp)return new Date;try{const[i,r]=t.timestamp.split("T");if(!i||!r)return new Date;const[n,a,o]=i.split("-").map(Number),[l,d,p=0]=r.split(":").map(Number);return new Date(n,a-1,o,l,d,p)}catch{return new Date}})}function _c(e){const t=e.mode_name||e.mode_planned||e.mode||e.mode_display||null;if(!t||typeof t!="string")return null;const i=t.trim();return i.length?i:null}function $c(e){return e.startsWith("HOME ")?e.replace("HOME ","").trim():e==="FULL HOME UPS"||e==="HOME UPS"?"UPS":e==="DO NOTHING"?"DN":e.substring(0,3).toUpperCase()}function kc(e){return bc[e]||{icon:"❓",color:"rgba(158, 158, 158, 0.15)",label:e}}function Cc(e){if(!e.length)return[];const t=[];let i=null;for(const r of e){const n=_c(r);if(!n){i=null;continue}const a=new Date(r.timestamp),o=new Date(a.getTime()+15*60*1e3);if(i!==null&&i.mode===n)i.end=o;else{const l={mode:n,start:a,end:o};t.push(l),i=l}}return t.map(r=>{const n=kc(r.mode);return{...r,icon:n.icon,color:n.color,label:n.label,shortLabel:$c(r.mode)}})}function Rr(e,t,i=3){const r=Math.floor(i*60/15);if(e.length<r)return null;let n=null,a=t?1/0:-1/0;for(let o=0;o<=e.length-r;o++){const l=e.slice(o,o+r),d=l.map(u=>u.price),p=d.reduce((u,h)=>u+h,0)/d.length;(t&&p<a||!t&&p>a)&&(a=p,n={start:l[0].timestamp,end:l[l.length-1].timestamp,avg:p,min:Math.min(...d),max:Math.max(...d),values:d,type:"cheapest-buy"})}return n}function Mc(e,t){const r=((e==null?void 0:e.states)||{})[ui("solar_forecast")];if(!(r!=null&&r.attributes)||!t.length)return null;const n=r.attributes,a=n.today_total_kwh||0,o=n.tomorrow_total_kwh||0,l=n.forecast_stale===!0,d=n.today_hourly_string1_kw||{},p=n.tomorrow_hourly_string1_kw||{},u=n.today_hourly_string2_kw||{},h=n.tomorrow_hourly_string2_kw||{},m={...d,...p},v={...u,...h},f=(y,_,S)=>y==null||_==null?y||_||0:y+(_-y)*S,b=[],$=[];for(const y of t){const _=y.getHours(),S=y.getMinutes(),B=new Date(y);B.setMinutes(0,0,0);const P=pa(B),N=new Date(B);N.setHours(_+1);const k=pa(N),A=m[P]||0,V=m[k]||0,q=v[P]||0,K=v[k]||0,Z=S/60;b.push(f(A,V,Z)),$.push(f(q,K,Z))}return{string1:b,string2:$,todayTotal:a,tomorrowTotal:o,stale:l,hasString1:b.some(y=>y>0),hasString2:$.some(y=>y>0)}}function Sc(e,t){if(!e.length)return{arrays:{baseline:[],solarCharge:[],gridCharge:[],gridNet:[],consumption:[]},initialZoomStart:null,initialZoomEnd:null};const i=e.map(h=>new Date(h.timestamp)),r=i[0].getTime(),n=i[i.length-1],a=n?n.getTime():r,o=[],l=[],d=[],p=[],u=[];for(const h of t){const m=pa(h),v=e.find(f=>f.timestamp===m);if(v){const f=(v.battery_capacity_kwh??v.battery_soc??v.battery_start)||0,b=v.solar_charge_kwh||0,$=v.grid_charge_kwh||0,y=typeof v.grid_net=="number"?v.grid_net:(v.grid_import||0)-(v.grid_export||0),_=v.load_kwh??v.consumption_kwh??v.load??0,S=(Number(_)||0)*4;o.push(f-b-$),l.push(b),d.push($),p.push(y),u.push(S)}else o.push(null),l.push(null),d.push(null),p.push(null),u.push(null)}return{arrays:{baseline:o,solarCharge:l,gridCharge:d,gridNet:p,consumption:u},initialZoomStart:r,initialZoomEnd:a}}function Ac(e){const t=(e==null?void 0:e.states)||{},i=t[ui("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const r=i.attributes,n=r.planned_consumption_today??null,a=r.planned_consumption_tomorrow??null,o=r.profile_today||"Žádný profil",l=t[ui("ac_out_en_day")],d=l==null?void 0:l.state,u=(d&&d!=="unavailable"&&parseFloat(d)||0)/1e3,h=u+(n||0),m=(n||0)+(a||0);let v=null;if(h>0&&a!=null){const b=a-h,$=b/h*100;Math.abs($)<5?v="Zítra podobně":b>0?v=`Zítra více (+${Math.abs($).toFixed(0)}%)`:v=`Zítra méně (-${Math.abs($).toFixed(0)}%)`}return{todayConsumedKwh:u,todayPlannedKwh:n,todayTotalKwh:h,tomorrowKwh:a,totalPlannedKwh:m,profile:o!=="Žádný profil"&&o!=="Neznámý profil"?o:"Žádný profil",trendText:v}}function Lc(e){const i=((e==null?void 0:e.states)||{})[ui("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const n=i.attributes.mode_optimization||{},a=n.alternatives||{},o=n.total_cost_czk||0,l=n.total_savings_vs_home_i_czk||0,d=a["DO NOTHING"],p=(d==null?void 0:d.current_mode)||null;return{totalCost:o,totalSavings:l,alternatives:a,activeMode:p}}async function Hc(e,t="hybrid"){const i=performance.now();L.info("[Pricing] loadPricingData START");try{const r=await vc(t),n=xc(r);if(!n.length)return L.warn("[Pricing] No timeline data"),no;const a=n.map(j=>({timestamp:j.timestamp,price:j.spot_price_czk||0})),o=n.map(j=>({timestamp:j.timestamp,price:j.export_price_czk||0}));let l=wc(a);const d=Cc(n),p=Rr(a,!0,3);p&&(p.type="cheapest-buy");const u=Rr(a,!1,3);u&&(u.type="expensive-buy");const h=Rr(o,!1,3);h&&(h.type="best-export");const m=Rr(o,!0,3);m&&(m.type="worst-export");const v=n.map(j=>new Date(j.timestamp)),f=new Set([...l,...v].map(j=>j.getTime()));l=Array.from(f).sort((j,Pe)=>j-Pe).map(j=>new Date(j));const{arrays:b,initialZoomStart:$,initialZoomEnd:y}=Sc(n,l),_=Mc(e,l),S=(e==null?void 0:e.states)||{},B=oo(S[ui("spot_price_current_15min")]),P=oo(S[ui("export_price_current_15min")]),N=Ac(e),k=Lc(e),A=(_==null?void 0:_.todayTotal)||0,V=(_==null?void 0:_.tomorrowTotal)||0,q=(_==null?void 0:_.stale)||!1,K={timeline:n,labels:l,prices:a,exportPrices:o,modeSegments:d,cheapestBuyBlock:p,expensiveBuyBlock:u,bestExportBlock:h,worstExportBlock:m,solar:_,battery:b,initialZoomStart:$,initialZoomEnd:y,currentSpotPrice:B,currentExportPrice:P,plannedConsumption:N,whatIf:k,solarForecastTotal:A,solarForecastTomorrow:V,solarForecastStale:q},Z=(performance.now()-i).toFixed(0);return L.info(`[Pricing] loadPricingData COMPLETE in ${Z}ms`,{points:n.length,segments:d.length}),K}catch(r){return L.error("[Pricing] loadPricingData failed",r),no}}const Vc=120,ua={workday_spring:"Pracovní den - Jaro",workday_summer:"Pracovní den - Léto",workday_autumn:"Pracovní den - Podzim",workday_winter:"Pracovní den - Zima",weekend_spring:"Víkend - Jaro",weekend_summer:"Víkend - Léto",weekend_autumn:"Víkend - Podzim",weekend_winter:"Víkend - Zima"},Tc={fve:"#4CAF50",overflow:"#8BC34A",grid:"#FF9800",discharge:"#2196F3"},Pc={fve:"FVE",grid:"Síť",alternative:"Alternativa"},zc={fve:"fve",pv:"fve",overflow:"overflow",grid:"grid",alternative:"alternative",alt:"alternative",battery:"battery"},Dc={fve:"fve",pv:"fve",overflow:"overflow",grid:"grid",alternative:"alternative",alt:"alternative",discharge:"discharge",discharging:"discharge"};function Kn(e){if(e==null||e==="")return{source:null,sourceInvalid:!1};const t=zc[e.toLowerCase()];return t!==void 0?{source:t,sourceInvalid:!1}:{source:null,sourceInvalid:!0}}function qn(e){return e==null||e===""?null:Dc[e.toLowerCase()]??null}const Ec=new Set(["temperature_unavailable","temperature_stale","source_stale","activity_stale","source_invalid","power_sign_mismatch_charge","power_sign_mismatch_discharge","runtime_cache_empty"]);function Gn(e){return e.filter(t=>Ec.has(t))}const ha=new URLSearchParams(window.location.search);let ga=ha.get("sn")||ha.get("inverter_sn")||"",Un=ha.get("entry_id")||"";function Oc(e,t,i){return isNaN(e)?t:Math.max(t,Math.min(i,e))}function Fc(e,t,i){if(e==null)return null;const r=t-i;if(r<=0)return null;const n=(e-i)/r*100;return Oc(n,0,100)}function Jr(e){if(!e)return"--:--";const t=e instanceof Date?e:new Date(e);return isNaN(t.getTime())?"--:--":t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}function so(e){if(!e)return"--";const t=new Date(e);return isNaN(t.getTime())?"--":t.toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}function ma(e,t){return`${Jr(e)}–${Jr(t)}`}function lo(e){return Pc[e||""]||e||"--"}function ks(e){return e?Object.values(e).reduce((t,i)=>t+(parseFloat(String(i))||0),0):0}function Cs(e){return e?Object.entries(e).map(([i,r])=>({hour:parseInt(i,10),value:parseFloat(String(r))||0})).filter(i=>isFinite(i.value)).sort((i,r)=>r.value-i.value).slice(0,3).filter(i=>i.value>0).map(i=>i.hour).sort((i,r)=>i-r):[]}function ji(e){if(!e)return null;const t=e.split(":").map(i=>parseInt(i,10));return t.length<2||!isFinite(t[0])||!isFinite(t[1])?null:t[0]*60+t[1]}function co(e,t,i){return t===null||i===null?!1:t<=i?e>=t&&e<i:e>=t||e<i}async function Ic(){var e,t,i,r,n;try{if(!Un||!ga)return L.warn("[Boiler] No entry_id or inverter_sn — cannot fetch boiler canonical"),{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null};const a=await ee.fetchOIGAPI(`/boiler/${Un}/${ga}`);if(!a)return{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null};let o=!1,l=null;try{const p=await ee.fetchOIGAPI(`/${Un}/boiler_profile`);p!=null&&p.config?l=p.config:o=!0}catch{o=!0}const d={state:{current_temp:((e=a.current_state.temperatures)==null?void 0:e.upper_zone)??((t=a.current_state.temperatures)==null?void 0:t.top),target_temp:void 0,heating:a.current_state.heating,temperatures:a.current_state.temperatures,energy_state:a.current_state.energy_state,recommended_source:a.selected_source||a.current_state.recommended_source||void 0,circulation_recommended:!1},slots:a.plan_slots.map(p=>({start:p.start,end:p.end,consumption_kwh:p.consumption_kwh,avg_consumption_kwh:p.consumption_kwh,recommended_source:p.recommended_source,spot_price:p.spot_price??void 0})),total_consumption_kwh:a.plan_slots.reduce((p,u)=>p+(u.consumption_kwh||0),0),fve_kwh:((i=a.current_state.energy_tracking)==null?void 0:i.fve_kwh)??0,grid_kwh:((r=a.current_state.energy_tracking)==null?void 0:r.grid_kwh)??0,alt_kwh:((n=a.current_state.energy_tracking)==null?void 0:n.alt_kwh)??0,next_slot:a.plan_slots[0]||void 0,profiles:{}};return{profileData:d,planData:d,canonical:a,configProfileUnavailable:o,boilerProfileConfig:l}}catch(a){return L.warn("[Boiler] Failed to fetch canonical",{err:a}),{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null}}}function Bc(e,t,i){const r=e||t,n=r==null?void 0:r.state,a=(n==null?void 0:n.temperatures)||{},o=(n==null?void 0:n.energy_state)||{},l=isFinite(a.upper_zone??a.top)?a.upper_zone??a.top??null:null,d=isFinite(a.lower_zone??a.bottom)?a.lower_zone??a.bottom??null:null,p=isFinite(o.avg_temp)?o.avg_temp??null:null,u=isFinite(o.energy_needed_kwh)?o.energy_needed_kwh??null:null,h=i.targetTempC??60,m=i.coldInletTempC??10,v=Fc(p,h,m),f=(e==null?void 0:e.slots)||[],b=(e==null?void 0:e.next_slot)||Nc(f);let $="Neplánováno";if(b){const _=lo(b.recommended_source);$=`${ma(b.start,b.end)} (${_})`}const y=lo((n==null?void 0:n.recommended_source)||(b==null?void 0:b.recommended_source));return{currentTemp:isFinite(n==null?void 0:n.current_temp)?(n==null?void 0:n.current_temp)??null:null,targetTemp:(n==null?void 0:n.target_temp)||h,heating:(n==null?void 0:n.heating)||!1,tempTop:l,tempBottom:d,avgTemp:p,heatingPercent:v,energyNeeded:u,planCost:(e==null?void 0:e.estimated_cost_czk)??null,nextHeating:$,recommendedSource:y,nextProfile:(n==null?void 0:n.next_profile)||"",nextStart:(n==null?void 0:n.next_start)||""}}function Nc(e){if(!Array.isArray(e))return null;const t=Date.now();return e.find(i=>{const r=new Date(i.end||i.end_time||"").getTime(),n=i.consumption_kwh??i.avg_consumption_kwh??0;return r>t&&n>0})||null}function jc(e){var m,v,f;if(!((m=e==null?void 0:e.slots)!=null&&m.length))return null;const t=e.slots.map(b=>({start:b.start||"",end:b.end||"",consumptionKwh:b.consumption_kwh??b.avg_consumption_kwh??0,recommendedSource:b.recommended_source||"",spotPrice:isFinite(b.spot_price)?b.spot_price??null:null,tempTop:b.temp_top,soc:b.soc})),i=t.filter(b=>b.consumptionKwh>0),r=parseFloat(String(e.total_consumption_kwh))||0,n=parseFloat(String(e.fve_kwh))||0,a=parseFloat(String(e.grid_kwh))||0,o=parseFloat(String(e.alt_kwh))||0,l=parseFloat(String(e.estimated_cost_czk))||0;let d="Mix: --";if(r>0){const b=Math.round(n/r*100),$=Math.round(a/r*100),y=Math.round(o/r*100);d=`Mix: FVE ${b}% · Síť ${$}% · Alt ${y}%`}const p=t.filter(b=>b.consumptionKwh>0&&b.spotPrice!==null).map(b=>({slot:b,price:b.spotPrice}));let u="--",h="--";if(p.length){const b=p.reduce((y,_)=>_.price<y.price?_:y),$=p.reduce((y,_)=>_.price>y.price?_:y);u=`${ma(b.slot.start,b.slot.end)} (${b.price.toFixed(2)} Kč/kWh)`,h=`${ma($.slot.start,$.slot.end)} (${$.price.toFixed(2)} Kč/kWh)`}return{slots:t,totalConsumptionKwh:r,fveKwh:n,gridKwh:a,altKwh:o,estimatedCostCzk:l,nextSlot:e.next_slot?{start:e.next_slot.start||"",end:e.next_slot.end||"",consumptionKwh:e.next_slot.consumption_kwh||0,recommendedSource:e.next_slot.recommended_source||"",spotPrice:e.next_slot.spot_price??null}:null,planStart:so((v=e.slots[0])==null?void 0:v.start),planEnd:so((f=e.slots[e.slots.length-1])==null?void 0:f.end),sourceDigest:d,activeSlotCount:i.length,cheapestSpot:u,mostExpensiveSpot:h}}function Rc(e){const t=parseFloat(String(e==null?void 0:e.fve_kwh))||0,i=parseFloat(String(e==null?void 0:e.grid_kwh))||0,r=parseFloat(String(e==null?void 0:e.alt_kwh))||0,n=t+i+r;return{fveKwh:t,gridKwh:i,altKwh:r,fvePercent:n>0?t/n*100:0,gridPercent:n>0?i/n*100:0,altPercent:n>0?r/n*100:0}}function Wc(e,t,i){var m;const r=(e==null?void 0:e.summary)||{},n=(m=e==null?void 0:e.profiles)==null?void 0:m[i],a=(n==null?void 0:n.hourly_avg)||{},o=r.predicted_total_kwh??ks(a),l=r.peak_hours??Cs(a),d=isFinite(r.water_liters_40c)?r.water_liters_40c??null:null,p=r.circulation_windows||[],u=p.length?p.map(v=>`${v.start}–${v.end}`).join(", "):"--";let h="--";if(p.length){const v=new Date,f=v.getHours()*60+v.getMinutes();if(p.some($=>{const y=ji($.start),_=ji($.end);return co(f,y,_)})){const $=p.find(y=>{const _=ji(y.start),S=ji(y.end);return co(f,_,S)});h=$?`ANO (do ${$.end})`:"ANO"}else{const $=t==null?void 0:t.state,y=$==null?void 0:$.circulation_recommended;let _=1/0,S=null;for(const B of p){const P=ji(B.start);if(P===null)continue;let N=P-f;N<0&&(N+=24*60),N<_&&(_=N,S=B)}y&&S?h=`DOPORUČENO (${S.start}–${S.end})`:S?h=`Ne (další ${S.start}–${S.end})`:h="Ne"}}return{predictedTodayKwh:o,peakHours:l,waterLiters40c:d,circulationWindows:u,circulationNow:h}}function Zc(e){const t=e??{},i=isFinite(t.volume_l)?t.volume_l??null:null,r=isFinite(t.heater_power_kw)?t.heater_power_kw??null:null,n=r!==null?r*1e3:null;return{volumeL:i,heaterPowerW:n,heaterPowerKw:r,targetTempC:isFinite(t.target_temp_c)?t.target_temp_c??null:null,deadlineTime:t.deadline_time||"--:--",stratificationMode:t.stratification_mode||"--",kCoefficient:i?(i*.001163).toFixed(4):"--",coldInletTempC:isFinite(t.cold_inlet_temp_c)?t.cold_inlet_temp_c??10:10,auraMaxTempC:isFinite(t.aura_max_temp_c)?t.aura_max_temp_c??null:null}}function Kc(e){return e!=null&&e.profiles?Object.entries(e.profiles).map(([t,i])=>({id:t,name:i.name||t,targetTemp:i.target_temp||55,startTime:i.start_time||"06:00",endTime:i.end_time||"22:00",days:i.days||[1,1,1,1,1,0,0],enabled:i.enabled!==!1})):[]}function qc(e){var r;const t=[],i=((r=e==null?void 0:e.summary)==null?void 0:r.today_hours)||[];for(let n=0;n<24;n++){const a=i.includes(n);t.push({hour:n,temp:a?55:25,heating:a})}return t}function Gc(e,t){var o;const i=(o=e==null?void 0:e.profiles)==null?void 0:o[t],r=["Po","Út","St","Čt","Pá","So","Ne"];if(!i)return r.map(l=>({day:l,hours:Array(24).fill(0)}));const n=i.heatmap||[];let a=[];if(n.length>0)a=n.map(l=>l.map(d=>d&&typeof d=="object"?parseFloat(d.consumption)||0:parseFloat(String(d))||0));else{const l=i.hourly_avg||{};a=Array.from({length:7},()=>Array.from({length:24},(d,p)=>parseFloat(String(l[p]||0))))}return r.map((l,d)=>({day:l,hours:a[d]||Array(24).fill(0)}))}function Uc(e,t){var p;const i=(p=e==null?void 0:e.profiles)==null?void 0:p[t],r=(e==null?void 0:e.summary)||{},n=(i==null?void 0:i.hourly_avg)||{},a=Array.from({length:24},(u,h)=>parseFloat(String(n[h]||0))),o=r.predicted_total_kwh??ks(n),l=r.peak_hours??Cs(n),d=isFinite(r.avg_confidence)?r.avg_confidence??null:null;return{hourlyAvg:a,peakHours:l,predictedTotalKwh:o,confidence:d,daysTracked:7}}function Yc(e,t){var u,h,m;if(!((u=e==null?void 0:e.slots)!=null&&u.length)||!(t!=null&&t.length))return{fve:"--",grid:"--"};const i=(h=e.slots[0])==null?void 0:h.start,r=(m=e.slots[e.slots.length-1])==null?void 0:m.end,n=i?new Date(i).getTime():null,a=r?new Date(r).getTime():null,o=t.filter(v=>{if(!n||!a)return!0;const f=v.timestamp||v.time;if(!f)return!1;const b=new Date(f).getTime();return b>=n&&b<=a}),l=v=>{const f=[];let b=null;for(const $ of o){const y=$.timestamp||$.time;if(!y)continue;const _=new Date(y),S=v($);S&&!b?b={start:_,end:_}:S&&b?b.end=_:!S&&b&&(f.push(b),b=null)}return b&&f.push(b),f.length?f.map($=>`${Jr($.start)}–${Jr(new Date($.end.getTime()+15*6e4))}`).join(", "):"--"},d=l(v=>(parseFloat(v.solar_kwh??v.solar_charge_kwh??0)||0)>0),p=l(v=>(parseFloat(v.grid_charge_kwh??0)||0)>0);return{fve:d,grid:p}}async function Qc(){return L.info("[Boiler] Planning heating..."),await ee.callService("oig_cloud","plan_boiler_heating",{})}async function Xc(){return L.info("[Boiler] Applying plan..."),await ee.callService("oig_cloud","apply_boiler_plan",{})}async function Jc(){return L.info("[Boiler] Canceling plan..."),await ee.callService("oig_cloud","cancel_boiler_plan",{})}const ed=new Set(["charging_fve","charging_overflow","charging_grid","charging_alt","discharging","standby","unknown"]);function po(e){return e&&ed.has(e)?e:"unknown"}function td(e){return e==="on"?"on":e==="off"?"off":"unavailable"}function id(e,t=!1){var Ne,X,he;const i={entryId:null,boxId:null,available:!1};if(!e)return{status:null,planSlots:[],explanation:null,manualOverride:null,identity:i,activity:null,sourceSegments:[],timeline:[],sparkline:null,demandMap:null,circulationRuns:[],legionella:null,planSummary:null,energyToday:null,loading:!1,loadError:"Nepodařilo se načíst data bojleru",altSourceType:null};const r=e.current_state,n=r.temperatures??{},a=isFinite(n.top)?n.top??null:isFinite(n.upper_zone)?n.upper_zone??null:null,o=isFinite(n.bottom)?n.bottom??null:isFinite(n.lower_zone)?n.lower_zone??null:null,l={currentState:r.heating?"heating":"idle",comfortSatisfied:e.comfort_status.comfort_satisfied,comfortStatusCode:e.comfort_status.comfort_status_code,selectedSource:Kn(e.selected_source).source,actuatedSource:Kn(e.actuated_source).source,temperatureTop:a,temperatureBottom:o,energyNeededKwh:isFinite((Ne=r.energy_state)==null?void 0:Ne.energy_needed_kwh)?((X=r.energy_state)==null?void 0:X.energy_needed_kwh)??null:null,heating:r.heating,lastUpdate:r.last_update??null,degraded:e.degraded_flags.degraded,degradedFlags:Gn(e.degraded_flags.flags??[])},d=(e.plan_slots??[]).map(C=>{const{source:Y,sourceInvalid:re}=Kn(C.recommended_source);return{start:C.start,end:C.end,consumptionKwh:C.consumption_kwh,confidence:C.confidence,recommendedSource:Y,sourceInvalid:re||null,spotPrice:isFinite(C.spot_price)?C.spot_price??null:null,altPrice:isFinite(C.alt_price)?C.alt_price??null:null,overflowAvailable:C.overflow_available,heatingKwh:C.heating_kwh??null,pvKwh:C.pv_kwh??null,gridKwh:C.grid_kwh??null,altKwh:C.alt_kwh??null,expectedTempTopC:C.predicted_top_temp_c??C.predicted_temperature_c??null,comfortSatisfied:C.comfort_satisfied??null,estimatedCostCzk:C.estimated_cost_czk??null,pvShare:typeof C.pv_share=="number"?C.pv_share:C.consumption_kwh&&C.pv_contribution_kwh!=null?C.pv_contribution_kwh/C.consumption_kwh:null,purpose:C.purpose??null}}),p=Gn(e.degraded_flags.flags??[]),u=t?[...p,"config_profile_unavailable"]:p,h=e.freshness??{},m={reasonCodes:e.reason_codes??[],planCreatedAt:h.plan_created_at??null,planValidUntil:h.plan_valid_until??null,dataAgeSecs:isFinite(h.data_age_seconds)?h.data_age_seconds??null:null,degradedReasons:u,unsatisfiedComfortGapC:e.comfort_status.unsatisfied_comfort_gap_c??null,temperatureAtDeadlineC:e.comfort_status.temperature_at_deadline_c??null},v={active:((he=e.manual_override)==null?void 0:he.active)??!1,ttlMinutes:Vc,reason:"",capabilityAvailable:e.manual_override!=null},f={entryId:e.entry_id,boxId:e.box_id,available:!!(e.entry_id&&e.box_id)},b=e.activity??null,$=b!=null?{state:po(b.state),source:qn(b.source),temperatureTrendCPerMin:isFinite(b.temperature_trend_c_per_min)?b.temperature_trend_c_per_min??null:null,fillLevelPct:isFinite(b.fill_level_pct)?b.fill_level_pct??null:null,auraMaxTempC:isFinite(b.aura_max_temp_c)?b.aura_max_temp_c:0,heaterStates:Object.fromEntries(Object.entries(b.heater_states??{}).map(([C,Y])=>[C,td(Y)])),staleFlags:Gn(Array.isArray(b.stale_flags)?b.stale_flags:[]),sourceEstimated:b.source_estimated===!0}:null,y=(e.source_segments??[]).map(C=>({key:qn(C.key),start:C.start,end:C.end,energyKwh:isFinite(C.energy_kwh)?C.energy_kwh:0,fillPct:isFinite(C.fill_pct)?C.fill_pct:0,active:C.active})),_=(e.timeline??[]).map(C=>({timestamp:C.timestamp,topTempC:isFinite(C.top_temp_c)?C.top_temp_c??null:null,bottomTempC:isFinite(C.bottom_temp_c)?C.bottom_temp_c??null:null,powerKw:isFinite(C.power_kw)?C.power_kw??null:null,sourceKey:qn(C.source_key),activityState:po(C.activity_state)})),S=e.sparkline??null,B=S!=null?{temperature:Array.isArray(S.temperature)?S.temperature:[],power:Array.isArray(S.power)?S.power:[]}:null,P=e.demand_map??null,N=P!=null?{slotDurationMin:P.slot_duration_min,slotsP50:Array.isArray(P.slots_p50)?P.slots_p50:[],slotsP80:Array.isArray(P.slots_p80)?P.slots_p80:[],windows:Array.isArray(P.windows)?P.windows.map(C=>({slotIndex:C.slot_index,startMinute:C.start_minute,p80Kwh:C.p80_kwh,liters:C.liters,label:C.label})):[],profile:{category:P.profile.category,level:P.profile.level,daysUsed:P.profile.days_used,label:P.profile.label,fallbackUsed:P.profile.fallback_used},confidence:P.confidence}:null,k=e.circulation_runs??[],A=Array.isArray(k)?k.map(C=>({start:C.start,end:C.end,label:C.label||""})):[],V=e.legionella??null,q=V!=null?{enabled:V.enabled===!0,daysSinceLast:typeof V.days_since_last=="number"?V.days_since_last:null,intervalDays:typeof V.interval_days=="number"?V.interval_days:null,scheduledStart:V.scheduled_start??null}:null,K=e.plan_summary??null,Z=K!=null?{estimatedCostCzk:typeof K.estimated_cost_czk=="number"?K.estimated_cost_czk:null,costIfAllGrid:typeof K.cost_if_all_grid=="number"?K.cost_if_all_grid:null,costIfAllAlt:typeof K.cost_if_all_alt=="number"?K.cost_if_all_alt:null,deadlineTime:K.deadline_time||"18:00"}:null,j=e.energy_today??null,Pe=j!=null?{totalKwh:typeof j.total_kwh=="number"?j.total_kwh:0,fveKwh:typeof j.fve_kwh=="number"?j.fve_kwh:0,gridKwh:typeof j.grid_kwh=="number"?j.grid_kwh:0,altKwh:typeof j.alt_kwh=="number"?j.alt_kwh:0,batteryKwh:typeof j.battery_kwh=="number"?j.battery_kwh:0,unattributedKwh:typeof j.unattributed_kwh=="number"?j.unattributed_kwh:0,sourceInvalid:j.source_invalid===!0,costCzk:typeof j.cost_czk=="number"?j.cost_czk:null,gridCostCzk:typeof j.grid_cost_czk=="number"?j.grid_cost_czk:null,altCostCzk:typeof j.alt_cost_czk=="number"?j.alt_cost_czk:null,savingsVsAltCzk:typeof j.savings_vs_alt_czk=="number"?j.savings_vs_alt_czk:null}:null;return{status:l,planSlots:d,explanation:m,manualOverride:v,identity:f,activity:$,sourceSegments:y,timeline:_,sparkline:B,demandMap:N,circulationRuns:A,legionella:q,planSummary:Z,energyToday:Pe,loading:!1,loadError:null,altSourceType:typeof e.alt_source_type=="string"?e.alt_source_type:null}}async function rd(e){const{profileData:t,planData:i,canonical:r,configProfileUnavailable:n,boilerProfileConfig:a}=await Ic();let o=null;try{const u=await ee.loadBatteryTimeline(ga,"active");o=(u==null?void 0:u.active)||u||null,Array.isArray(o)&&o.length===0&&(o=null)}catch{}const l=(t==null?void 0:t.current_category)||Object.keys((t==null?void 0:t.profiles)||{})[0]||"workday_summer",d=Object.keys((t==null?void 0:t.profiles)||{}),p=Zc(a);return{state:Bc(i,t,p),plan:jc(i),energyBreakdown:Rc(i),predictedUsage:Wc(t,i,l),config:p,profiles:Kc(t||i),heatmap:qc(i||t),heatmap7x24:Gc(t,l),profiling:Uc(t,l),currentCategory:l,availableCategories:d,forecastWindows:Yc(i,o),v2Data:id(r,n)}}function nd(e){var i;const t=((i=e==null?void 0:e.locale)==null?void 0:i.language)??(e==null?void 0:e.language)??"cs";return/^en/i.test(t)?"en":"cs"}const Re={cs:{"boiler.status.heading":"Stav bojleru","boiler.status.heating":"Ohřev","boiler.status.idle":"Nečinný","boiler.status.unknown":"Neznámý","boiler.status.selected_source":"Vybraný zdroj","boiler.status.actuated_source":"Aktivní zdroj","boiler.status.temp_top":"Teplota nahoře","boiler.status.temp_bottom":"Teplota dole","boiler.status.energy_needed":"Zbývající energie","boiler.status.last_update":"Poslední aktualizace","boiler.status.degraded":"Degradováno","boiler.status.comfort_satisfied":"Komfort splněn","boiler.status.comfort_unsatisfied":"Komfort nesplněn","boiler.status.comfort_unknown":"Komfort neznámý","boiler.timeline.heading":"Plán nabíjení (15 min sloty)","boiler.timeline.empty":"Plán bojleru zatím není k dispozici.","boiler.timeline.col_time":"Čas","boiler.timeline.col_source":"Zdroj","boiler.timeline.col_temp":"Teplota","boiler.timeline.col_kwh":"Energie","boiler.timeline.col_cost":"Cena","boiler.timeline.col_pv":"FVE podíl","boiler.timeline.comfort_ok":"Komfort OK","boiler.timeline.comfort_gap":"Komfort nesplněn","boiler.explanation.heading":"Vysvětlení","boiler.explanation.empty":"Žádné vysvětlení od plánovače.","boiler.explanation.plan_created":"Plán vytvořen","boiler.explanation.plan_valid_until":"Plán platí do","boiler.explanation.data_age":"Stáří dat","boiler.explanation.freshness_heading":"Čerstvost vstupů","boiler.explanation.freshness_fresh":"vstupy aktuální","boiler.explanation.degraded_heading":"Degradované stavy","boiler.explanation.unsatisfied_gap":"Komfortní mezera","boiler.explanation.temp_at_deadline":"Předpokládaná teplota na deadline","boiler.override.heading":"Ruční přepis (sekundární)","boiler.override.subtitle":"Automatický plán je primární — přepis použijte jen výjimečně.","boiler.override.ttl_label":"Délka přepisu (minuty)","boiler.override.reason_label":"Důvod přepisu","boiler.override.submit":"Aktivovat přepis","boiler.override.identity_unavailable":"Nedostupné – identita bojleru není rozpoznána.","boiler.override.capability_unavailable":"Aktuátor neumožňuje ruční přepis.","boiler.override.active":"Přepis aktivní","boiler.override.ttl_remaining_min":"Zbývá","boiler.unavailable.loading":"Načítání dat bojleru…","boiler.unavailable.error":"Chyba při načítání bojleru","boiler.unavailable.degraded":"Bojler v degradovaném režimu","boiler.unavailable.unavailable":"Data bojleru nejsou k dispozici","boiler.source.fve":"FVE","boiler.source.grid":"Síť","boiler.source.alternative":"Alternativa","boiler.source.overflow":"Přetoky","boiler.source.discharge":"Vybíjení","boiler.source.none":"—","boiler.reason.comfort_satisfied":"Komfort splněn","boiler.reason.comfort_unsatisfied":"Komfort nelze splnit","boiler.reason.no_feasible_plan":"Žádný proveditelný plán","boiler.reason.bootstrap_profile":"Učící režim profilu (málo dat)","boiler.reason.history_profile_low_confidence":"Profil s nízkou důvěrou","boiler.reason.input_stale_price":"Ceny nejsou aktuální","boiler.reason.input_stale_pv":"FVE predikce není aktuální","boiler.reason.input_missing_recorder":"Chybí historie z recorderu","boiler.reason.input_adapter_error":"Chyba vstupního adapteru","boiler.reason.input_stale_temperature":"Teplota není aktuální","boiler.reason.top_sensor_unavailable":"Horní teploměr není dostupný","boiler.reason.bottom_sensor_unavailable_top_only_degraded":"Dolní teploměr není dostupný (top-only režim)","boiler.reason.primary_actuator_unavailable":"Hlavní topný aktuátor není dostupný","boiler.reason.alternative_actuator_unavailable_benchmark_only":"Alternativní zdroj jen jako benchmark","boiler.reason.circulation_pump_unavailable":"Cirkulační čerpadlo není dostupné","boiler.reason.actuator_rate_limited":"Aktuátor omezen rychlostním limitem","boiler.reason.actuator_serializer_error":"Chyba serializéru aktuátoru","boiler.reason.override_active":"Ruční přepis aktivní","boiler.reason.override_expired":"Ruční přepis vypršel","boiler.reason.planner_timeout":"Plánovač překročil časový limit","boiler.reason.replan_coalesced":"Přeplánování sloučeno","boiler.reason.source_selected_grid":"Vybrán zdroj: síť","boiler.reason.source_selected_pv":"Vybrán zdroj: FVE","boiler.reason.source_selected_alternative":"Vybrán zdroj: alternativa","boiler.reason.source_benchmark_only":"Alternativa pouze jako srovnání","boiler.reason.setup_incomplete":"Konfigurace bojleru není dokončena","boiler.reason.migration_required":"Vyžaduje se migrace bojleru","boiler.reason.api_repair_required":"Vyžaduje se oprava API","boiler.reason.storage_write_failed":"Selhalo uložení stavu bojleru","boiler.activity.state.charging_fve":"Nabíjení z FVE","boiler.activity.state.charging_overflow":"Nabíjení z přetoků","boiler.activity.state.charging_grid":"Nabíjení ze sítě","boiler.activity.state.charging_alt":"🔥 Ohřev plynem","boiler.activity.state.discharging":"Vybíjení","boiler.activity.state.standby":"Pohotovost","boiler.activity.state.unknown":"Neznámý stav","boiler.activity.fill_level":"Úroveň naplnění","boiler.activity.temp_trend":"Trend teploty","boiler.activity.aura_max_temp":"Max. teplota AURA","boiler.activity.stale_warning":"Zastaralá data","boiler.eta.label":"Odhadovaný čas do cíle","boiler.eta.already_reached":"Cíl dosažen","boiler.eta.unavailable":"Nelze odhadnout","boiler.config.heater_power_kw":"Výkon topení (kW)","boiler.config.deadline":"Deadline","boiler.config.goal_temp":"Cílová teplota","boiler.aria.status_panel":"Panel stavu bojleru","boiler.aria.plan_timeline":"Časová osa plánu bojleru","boiler.aria.source_explanation":"Vysvětlení zdroje","boiler.aria.override_panel":"Panel ručního přepisu","boiler.aria.svg_summary":"Vizualizace bojleru","boiler.aria.stale":"Data mohou být zastaralá","boiler.aria.source_unknown":"Neznámý zdroj","boiler.demand_map.heading":"Mapa odběrů","boiler.demand_map.empty":"Sbírám data o odběrech — mapa se objeví po pár dnech","boiler.demand_map.confidence":"Spolehlivost","boiler.demand_map.fallback_notice":"Přibližný profil (málo dat)","boiler.demand_map.meta":"Profil z historie ({n} dní, {cat})","boiler.demand_map.window.morning":"Ráno","boiler.demand_map.window.afternoon":"Odpoledne","boiler.demand_map.window.evening":"Večer","boiler.demand_map.window.night":"Noc","boiler.plan_strip.heading":"Plán ohřevu 24 h","boiler.plan_strip.meta":"zdroje + odběry + teplota + cirkulace","boiler.plan_strip.empty":"Plán ohřevu zatím není k dispozici.","boiler.plan_strip.now_label":"TEĎ","boiler.plan_strip.deadline_label":"pojistka","boiler.plan_strip.temp_zone_label":"°C horní zóna","boiler.plan_strip.legend_overflow":"☀️ Přetoky FVE","boiler.plan_strip.legend_grid":"🔌 Levné okno (síť)","boiler.plan_strip.legend_battery":"🔋→🔥 Ohřev z baterie","boiler.plan_strip.legend_alt":"🔥 Alternativní zdroj","boiler.plan_strip.legend_demands":"odběry (dolů)","boiler.plan_strip.legend_circ":"💧 cirkulace","boiler.plan_strip.source_overflow":"☀️ Přetoky FVE","boiler.plan_strip.source_grid":"🔌 Levné okno","boiler.plan_strip.source_battery":"🔋→🔥 Ohřev z baterie","boiler.plan_strip.source_alt":"🔥 Alternativní zdroj","boiler.plan_strip.source_legionella_prefix":"🦠","boiler.plan_strip.source_legionella":"🦠 Ochrana proti legionelle","boiler.plan_strip.circ_tooltip":"cirkulace","boiler.tank.ready_caption":"≥ 40 °C připraveno","boiler.tank.source_fve":"☀️ Nabíjí z přetoků FVE","boiler.tank.source_grid":"🔌 Nabíjí ze sítě","boiler.tank.source_battery":"🔋→🔥 Ohřev z baterie","boiler.tank.source_alt":"🔥 Ohřev plynem","boiler.tank.source_idle":"Neohřívá","boiler.tank.source_estimated_suffix":"(odhad)","boiler.energy_today.heading":"⚡ Z čeho se bojler nabil — dnes","boiler.energy_today.meta":"skutečné zdroje k dnešnímu datu","boiler.energy_today.empty":"Dnes zatím žádný ohřev","boiler.energy_today.source_fve":"☀️ FVE přetoky","boiler.energy_today.source_grid":"🔌 Síť","boiler.energy_today.source_alt":"🔥 Alternativní zdroj","boiler.energy_today.source_battery":"🔋→🔥 Baterie","boiler.energy_today.benchmark_prefix":"Kdyby vše ze sítě ≈","boiler.energy_today.benchmark_savings":"→ plán šetří","boiler.panel.source_title":"Zdroj & náklady","boiler.panel.comfort_title":"Komfort","boiler.panel.cost_today":"Cena dnes","boiler.panel.energy_today":"Energie dnes","boiler.panel.fve_label":"☀️ z FVE","boiler.panel.grid_label":"🔌 ze sítě","boiler.panel.unattributed_label":"⚡ el. (nerozlišený zdroj)","boiler.panel.alt_label":"🔥 z plynu","boiler.panel.battery_label":"🔋→🔥 z baterie","boiler.panel.savings_label":"Ušetřeno vs. plyn","boiler.panel.current_source":"Aktuální zdroj","boiler.panel.next_action":"Další akce","boiler.panel.tomorrow":"zítra","boiler.panel.source_overflow":"☀️ přetoky","boiler.panel.source_grid":"🔌 levné okno","boiler.panel.source_grid_short":"🔌 síť","boiler.panel.source_battery":"🔋→🔥 Ohřev z baterie","boiler.panel.source_battery_short":"🔋→🔥","boiler.panel.source_alt":"🔥 plyn","boiler.panel.deadline_label":"Pojistka (deadline)","boiler.panel.legionella_label":"Anti-legionella","boiler.panel.legionella_off":"vypnuto","boiler.panel.legionella_plan":"plán","boiler.panel.legionella_in":"za","boiler.panel.legionella_days":"dní","boiler.panel.legionella_overdue":"přesčas","boiler.panel.legionella_scheduled":"naplánováno","boiler.panel.trend_label":"Trend","boiler.panel.circ_label":"Cirkulace","boiler.panel.circ_before_peak":"před špičkou","boiler.panel.circ_off":"vypnuta"},en:{"boiler.status.heading":"Boiler status","boiler.status.heating":"Heating","boiler.status.idle":"Idle","boiler.status.unknown":"Unknown","boiler.status.selected_source":"Selected source","boiler.status.actuated_source":"Actuated source","boiler.status.temp_top":"Top temperature","boiler.status.temp_bottom":"Bottom temperature","boiler.status.energy_needed":"Energy needed","boiler.status.last_update":"Last update","boiler.status.degraded":"Degraded","boiler.status.comfort_satisfied":"Comfort satisfied","boiler.status.comfort_unsatisfied":"Comfort not satisfied","boiler.status.comfort_unknown":"Comfort unknown","boiler.timeline.heading":"Heating plan (15 min slots)","boiler.timeline.empty":"No boiler plan available yet.","boiler.timeline.col_time":"Time","boiler.timeline.col_source":"Source","boiler.timeline.col_temp":"Temp","boiler.timeline.col_kwh":"Energy","boiler.timeline.col_cost":"Cost","boiler.timeline.col_pv":"PV share","boiler.timeline.comfort_ok":"Comfort OK","boiler.timeline.comfort_gap":"Comfort gap","boiler.explanation.heading":"Explanation","boiler.explanation.empty":"No planner explanation yet.","boiler.explanation.plan_created":"Plan created","boiler.explanation.plan_valid_until":"Plan valid until","boiler.explanation.data_age":"Data age","boiler.explanation.freshness_heading":"Input freshness","boiler.explanation.freshness_fresh":"inputs fresh","boiler.explanation.degraded_heading":"Degraded state","boiler.explanation.unsatisfied_gap":"Comfort gap","boiler.explanation.temp_at_deadline":"Predicted deadline temperature","boiler.override.heading":"Manual override (secondary)","boiler.override.subtitle":"Automatic plan is primary — use override only when necessary.","boiler.override.ttl_label":"Override duration (minutes)","boiler.override.reason_label":"Override reason","boiler.override.submit":"Activate override","boiler.override.identity_unavailable":"Unavailable – boiler identity is not resolved.","boiler.override.capability_unavailable":"Actuator does not support manual override.","boiler.override.active":"Override active","boiler.override.ttl_remaining_min":"remaining","boiler.unavailable.loading":"Loading boiler data…","boiler.unavailable.error":"Failed to load boiler data","boiler.unavailable.degraded":"Boiler in degraded mode","boiler.unavailable.unavailable":"Boiler data unavailable","boiler.source.fve":"PV","boiler.source.grid":"Grid","boiler.source.alternative":"Alternative","boiler.source.overflow":"Overflow","boiler.source.discharge":"Discharge","boiler.source.none":"—","boiler.reason.comfort_satisfied":"Comfort satisfied","boiler.reason.comfort_unsatisfied":"Comfort cannot be met","boiler.reason.no_feasible_plan":"No feasible plan","boiler.reason.bootstrap_profile":"Bootstrap profile (low data)","boiler.reason.history_profile_low_confidence":"Low-confidence profile","boiler.reason.input_stale_price":"Spot prices are stale","boiler.reason.input_stale_pv":"PV forecast is stale","boiler.reason.input_missing_recorder":"Recorder history missing","boiler.reason.input_adapter_error":"Input adapter error","boiler.reason.input_stale_temperature":"Temperature reading stale","boiler.reason.top_sensor_unavailable":"Top sensor unavailable","boiler.reason.bottom_sensor_unavailable_top_only_degraded":"Bottom sensor unavailable (top-only mode)","boiler.reason.primary_actuator_unavailable":"Primary heating actuator unavailable","boiler.reason.alternative_actuator_unavailable_benchmark_only":"Alternative source benchmark only","boiler.reason.circulation_pump_unavailable":"Circulation pump unavailable","boiler.reason.actuator_rate_limited":"Actuator rate limited","boiler.reason.actuator_serializer_error":"Actuator serializer error","boiler.reason.override_active":"Manual override active","boiler.reason.override_expired":"Manual override expired","boiler.reason.planner_timeout":"Planner timeout","boiler.reason.replan_coalesced":"Replan coalesced","boiler.reason.source_selected_grid":"Source selected: grid","boiler.reason.source_selected_pv":"Source selected: PV","boiler.reason.source_selected_alternative":"Source selected: alternative","boiler.reason.source_benchmark_only":"Alternative is benchmark only","boiler.reason.setup_incomplete":"Boiler setup incomplete","boiler.reason.migration_required":"Boiler migration required","boiler.reason.api_repair_required":"API repair required","boiler.reason.storage_write_failed":"Failed to persist boiler state","boiler.activity.state.charging_fve":"Charging from PV","boiler.activity.state.charging_overflow":"Charging from overflow","boiler.activity.state.charging_grid":"Charging from grid","boiler.activity.state.charging_alt":"🔥 Gas heating","boiler.activity.state.discharging":"Discharging","boiler.activity.state.standby":"Standby","boiler.activity.state.unknown":"Unknown state","boiler.activity.fill_level":"Fill level","boiler.activity.temp_trend":"Temperature trend","boiler.activity.aura_max_temp":"AURA max temperature","boiler.activity.stale_warning":"Stale data","boiler.eta.label":"Estimated time to target","boiler.eta.already_reached":"Target reached","boiler.eta.unavailable":"Cannot estimate","boiler.config.heater_power_kw":"Heater power (kW)","boiler.config.deadline":"Deadline","boiler.config.goal_temp":"Target temperature","boiler.aria.status_panel":"Boiler status panel","boiler.aria.plan_timeline":"Boiler plan timeline","boiler.aria.source_explanation":"Source explanation","boiler.aria.override_panel":"Manual override panel","boiler.aria.svg_summary":"Boiler visualization","boiler.aria.stale":"Data may be stale","boiler.aria.source_unknown":"Unknown source","boiler.demand_map.heading":"Demand Map","boiler.demand_map.empty":"Collecting usage data — map will appear in a few days","boiler.demand_map.confidence":"Confidence","boiler.demand_map.fallback_notice":"Approximate profile (low data)","boiler.demand_map.meta":"Profile from history ({n} days, {cat})","boiler.demand_map.window.morning":"Morning","boiler.demand_map.window.afternoon":"Afternoon","boiler.demand_map.window.evening":"Evening","boiler.demand_map.window.night":"Night","boiler.plan_strip.heading":"Heating plan 24 h","boiler.plan_strip.meta":"sources + demands + temperature + circulation","boiler.plan_strip.empty":"Heating plan not available yet.","boiler.plan_strip.now_label":"NOW","boiler.plan_strip.deadline_label":"deadline","boiler.plan_strip.temp_zone_label":"°C top zone","boiler.plan_strip.legend_overflow":"☀️ PV overflow","boiler.plan_strip.legend_grid":"🔌 Cheap window (grid)","boiler.plan_strip.legend_battery":"🔋→🔥 Battery heating","boiler.plan_strip.legend_alt":"🔥 Alternative source","boiler.plan_strip.legend_demands":"demands (down)","boiler.plan_strip.legend_circ":"💧 circulation","boiler.plan_strip.source_overflow":"☀️ PV overflow","boiler.plan_strip.source_grid":"🔌 Cheap window","boiler.plan_strip.source_battery":"🔋→🔥 Battery heating","boiler.plan_strip.source_alt":"🔥 Alternative source","boiler.plan_strip.source_legionella_prefix":"🦠","boiler.plan_strip.source_legionella":"🦠 Legionella protection","boiler.plan_strip.circ_tooltip":"circulation","boiler.tank.ready_caption":"≥ 40 °C ready","boiler.tank.source_fve":"☀️ Charging from PV overflow","boiler.tank.source_grid":"🔌 Charging from grid","boiler.tank.source_battery":"🔋→🔥 Battery heating","boiler.tank.source_alt":"🔥 Gas heating","boiler.tank.source_idle":"Not heating","boiler.tank.source_estimated_suffix":"(estimated)","boiler.energy_today.heading":"⚡ What powered the boiler today","boiler.energy_today.meta":"actual sources to date","boiler.energy_today.empty":"No heating today yet","boiler.energy_today.source_fve":"☀️ PV overflow","boiler.energy_today.source_grid":"🔌 Grid","boiler.energy_today.source_alt":"🔥 Alternative source","boiler.energy_today.source_battery":"🔋→🔥 Battery","boiler.energy_today.benchmark_prefix":"If all from grid ≈","boiler.energy_today.benchmark_savings":"→ plan saves","boiler.panel.source_title":"Source & costs","boiler.panel.comfort_title":"Comfort","boiler.panel.cost_today":"Cost today","boiler.panel.energy_today":"Energy today","boiler.panel.fve_label":"☀️ from PV","boiler.panel.grid_label":"🔌 from grid","boiler.panel.unattributed_label":"⚡ electric (unattributed)","boiler.panel.alt_label":"🔥 from gas","boiler.panel.battery_label":"🔋→🔥 from battery","boiler.panel.savings_label":"Saved vs. gas","boiler.panel.current_source":"Current source","boiler.panel.next_action":"Next action","boiler.panel.tomorrow":"tomorrow","boiler.panel.source_overflow":"☀️ overflow","boiler.panel.source_grid":"🔌 cheap window","boiler.panel.source_grid_short":"🔌 grid","boiler.panel.source_battery":"🔋→🔥 Battery heat","boiler.panel.source_battery_short":"🔋→🔥","boiler.panel.source_alt":"🔥 gas","boiler.panel.deadline_label":"Deadline (guard)","boiler.panel.legionella_label":"Anti-legionella","boiler.panel.legionella_off":"disabled","boiler.panel.legionella_plan":"scheduled","boiler.panel.legionella_in":"in","boiler.panel.legionella_days":"days","boiler.panel.legionella_overdue":"overdue","boiler.panel.legionella_scheduled":"scheduled","boiler.panel.trend_label":"Trend","boiler.panel.circ_label":"Circulation","boiler.panel.circ_before_peak":"before peak","boiler.panel.circ_off":"off"}};function x(e,t){const i=Re[t]??Re.cs;return e in i?i[e]:e in Re.cs?Re.cs[e]:e}function Yr(e,t){const i=`boiler.reason.${e}`;return Re[t][i]?Re[t][i]:Re.cs[i]?Re.cs[i]:e}function hi(e,t){if(!e)return x("boiler.source.none",t);const i=`boiler.source.${e}`;return Re[t][i]?Re[t][i]:Re.cs[i]?Re.cs[i]:e}const uo=new URLSearchParams(window.location.search),Ca=uo.get("sn")||uo.get("inverter_sn")||"";async function ba(){const e=await ee.fetchOIGAPI(`/${Ca}/module_config`);return!e||e.error?(L.warn("[Settings] module_config load failed",e),null):e}async function ad(e,t,i=[2e3,4e3,8e3,15e3,3e4]){for(const r of i){await new Promise(a=>setTimeout(a,r));const n=await ee.fetchOIGAPI(`/${Ca}/module_config`);if(n&&!n.error){e(n);return}}t()}async function od(e,t){const i=await ee.fetchOIGAPI(`/${Ca}/module_config`,{method:"POST",body:JSON.stringify({section:e,values:t})});return i&&(i.updated===!0||i.updated===!1)?{ok:!0}:{ok:!1,fields:i==null?void 0:i.fields}}const ho={efficiency:null,health:null,balancing:null,costComparison:null};function Ms(e){const t=ut();if(!t)return null;const i=t.findSensorId("battery_efficiency"),r=t.get(i);if(!r)return L.debug("Battery efficiency sensor not found"),null;const n=r.attributes||{},a=n.efficiency_last_month_pct!=null?{efficiency:Number(n.efficiency_last_month_pct??0),charged:Number(n.last_month_charge_kwh??0),discharged:Number(n.last_month_discharge_kwh??0),losses:Number(n.losses_last_month_kwh??0)}:null,o=n.efficiency_current_month_pct!=null?{efficiency:Number(n.efficiency_current_month_pct??0),charged:Number(n.current_month_charge_kwh??0),discharged:Number(n.current_month_discharge_kwh??0),losses:Number(n.losses_current_month_kwh??0)}:null,l=a??o;if(!l)return null;const d=a?"last_month":"current_month",p=a&&o?o.efficiency-a.efficiency:0;return{efficiency:l.efficiency,charged:l.charged,discharged:l.discharged,losses:l.losses,lossesPct:n[d==="last_month"?"losses_last_month_pct":"losses_current_month_pct"]??0,trend:p,period:d,currentMonthDays:n.current_month_days??0,lastMonth:a,currentMonth:o}}function Ss(e){const t=ut();if(!t)return null;const i=t.findSensorId("battery_health"),r=t.get(i);if(!r)return L.debug("Battery health sensor not found"),null;const n=parseFloat(r.state)||0,a=r.attributes||{};let o,l;return n>=95?(o="excellent",l="Vynikající"):n>=90?(o="good",l="Dobrý"):n>=80?(o="fair",l="Uspokojivý"):(o="poor",l="Špatný"),{soh:n,capacity:a.capacity_p80_last_20??a.current_capacity_kwh??0,nominalCapacity:a.current_capacity_kwh??0,minCapacity:a.capacity_p20_last_20??0,measurementCount:a.measurement_count??0,lastAnalysis:a.last_analysis??"",qualityScore:a.quality_score??null,sohMethod:a.soh_selection_method??null,sohMethodDescription:a.soh_method_description??null,measurementHistory:Array.isArray(a.measurement_history)?a.measurement_history:[],degradation3m:a.degradation_3_months_percent??null,degradation6m:a.degradation_6_months_percent??null,degradation12m:a.degradation_12_months_percent??null,degradationPerYear:a.degradation_per_year_percent??null,estimatedEolDate:a.estimated_eol_date??null,yearsTo80Pct:a.years_to_80pct??null,trendConfidence:a.trend_confidence??null,status:o,statusLabel:l}}function go(e,t,i){if(!e||!t)return{daysRemaining:null,progressPercent:null,intervalDays:i||null};try{const r=new Date(e),n=new Date(t),a=new Date;if(isNaN(r.getTime())||isNaN(n.getTime()))return{daysRemaining:null,progressPercent:null,intervalDays:i||null};const o=n.getTime()-r.getTime(),l=a.getTime()-r.getTime(),d=Math.max(0,Math.round((n.getTime()-a.getTime())/(1e3*60*60*24))),p=o>0?Math.min(100,Math.max(0,Math.round(l/o*100))):null,u=i||Math.round(o/(1e3*60*60*24));return{daysRemaining:d,progressPercent:p,intervalDays:u||null}}catch{return{daysRemaining:null,progressPercent:null,intervalDays:i||null}}}function As(e){const t=ut();if(!t)return null;const i=t.findSensorId("battery_balancing"),r=t.get(i);if(!r){const d=t.get(t.findSensorId("battery_health")),p=d==null?void 0:d.attributes;if(p!=null&&p.balancing_status){const u=String(p.last_balancing??""),h=p.next_balancing?String(p.next_balancing):null,m=go(u,h,Number(p.balancing_interval_days??0));return{status:String(p.balancing_status??"unknown"),lastBalancing:u,cost:Number(p.balancing_cost??0),nextScheduled:h,...m,estimatedNextCost:p.estimated_next_cost!=null?Number(p.estimated_next_cost):null}}return null}const n=r.attributes||{},a=String(n.last_balancing??""),o=n.next_scheduled?String(n.next_scheduled):null,l=go(a,o,Number(n.interval_days??0));return{status:r.state||"unknown",lastBalancing:a,cost:Number(n.cost??0),nextScheduled:o,...l,estimatedNextCost:n.estimated_next_cost!=null?Number(n.estimated_next_cost):null}}async function sd(e){var t,i,r;try{const n=await ee.loadUnifiedCostTile(e);if(!n)return null;const a=n.hybrid??n,o=a.today??{},l=Math.round((o.actual_cost_so_far??o.actual_total_cost??0)*100)/100,d=o.future_plan_cost??0,p=o.blended_total_cost??l+d,u=((t=a.tomorrow)==null?void 0:t.plan_total_cost)??null,h=!!((i=a.tomorrow)!=null&&i.mode_distribution),m=u===0&&!h?null:u;let v=null,f=null,b=null,$=null;try{const y=await ee.loadBatteryTimeline(e,"active"),_=(r=y==null?void 0:y.timeline_extended)==null?void 0:r.yesterday;_!=null&&_.summary&&(v=_.summary.planned_total_cost??null,f=_.summary.actual_total_cost??null,b=_.summary.delta_cost??null,$=_.summary.accuracy_pct??null)}catch{L.debug("Yesterday analysis not available")}return{activePlan:"hybrid",actualSpent:l,planTotalCost:p,futurePlanCost:d,tomorrowCost:m,yesterdayPlannedCost:v,yesterdayActualCost:f,yesterdayDelta:b,yesterdayAccuracy:$}}catch(n){return L.error("Failed to fetch cost comparison",n),null}}async function ld(e){const t=Ms(),i=Ss(),r=As(),n=await sd(e);return{efficiency:t,health:i,balancing:r,costComparison:n}}function cd(e){return{efficiency:Ms(),health:Ss(),balancing:As()}}const en={severity:0,warningsCount:0,eventType:"",description:"",instruction:"",onset:"",expires:"",etaHours:0,allWarnings:[],effectiveSeverity:0},dd={vítr:"mdi:weather-windy",déšť:"mdi:weather-pouring",sníh:"mdi:weather-snowy",bouřky:"mdi:weather-lightning",mráz:"mdi:snowflake",vedro:"mdi:weather-sunny",mlha:"mdi:weather-fog",náledí:"mdi:snowflake",laviny:"mdi:alert-circle"};function pd(e){const t=e.toLowerCase();for(const[i,r]of Object.entries(dd))if(t.includes(i))return r;return"mdi:alert-circle"}const ud={0:"Bez výstrahy",1:"Nízká",2:"Zvýšená",3:"Vysoká",4:"Extrémní"},mo={0:"#4CAF50",1:"#8BC34A",2:"#FF9800",3:"#f44336",4:"#9C27B0"};function hd(e){const t=ut();if(!t)return en;const i=`sensor.oig_${e}_chmu_warning_level`,r=t.get(i);if(!r)return L.debug("ČHMÚ sensor not found",{entityId:i}),en;const n=parseInt(r.state,10)||0,a=r.attributes||{},o=Number(a.warnings_count??0),l=String(a.event_type??""),d=String(a.description??""),p=String(a.instruction??""),u=String(a.onset??""),h=String(a.expires??""),m=Number(a.eta_hours??0),v=a.all_warnings_details??[],f=Array.isArray(v)?v.map(y=>({event_type:y.event_type??y.event??"",severity:y.severity??n,description:y.description??"",instruction:y.instruction??"",onset:y.onset??"",expires:y.expires??"",eta_hours:y.eta_hours??0})):[],b=l.toLowerCase().includes("žádná výstraha");return{severity:n,warningsCount:o,eventType:l,description:d,instruction:p,onset:u,expires:h,etaHours:m,allWarnings:f,effectiveSeverity:o===0||b?0:n}}const tn={available:!1,entityId:null,condition:"",temperature:null,apparentTemperature:null,humidity:null,windSpeed:null,tempUnit:"°C",windUnit:"km/h",hourly:[],daily:[]},gd={"clear-night":"mdi:weather-night",cloudy:"mdi:weather-cloudy",fog:"mdi:weather-fog",hail:"mdi:weather-hail",lightning:"mdi:weather-lightning","lightning-rainy":"mdi:weather-lightning-rainy",partlycloudy:"mdi:weather-partly-cloudy",pouring:"mdi:weather-pouring",rainy:"mdi:weather-rainy",snowy:"mdi:weather-snowy","snowy-rainy":"mdi:weather-snowy-rainy",sunny:"mdi:weather-sunny",windy:"mdi:weather-windy","windy-variant":"mdi:weather-windy-variant",exceptional:"mdi:weather-cloudy"},md={"clear-night":"Jasná noc",cloudy:"Zataženo",fog:"Mlha",hail:"Krupobití",lightning:"Bouřky","lightning-rainy":"Bouřky s deštěm",partlycloudy:"Polojasno",pouring:"Vydatný déšť",rainy:"Déšť",snowy:"Sněžení","snowy-rainy":"Déšť se sněhem",sunny:"Slunečno",windy:"Větrno","windy-variant":"Větrno",exceptional:"Výjimečné počasí"};function Qr(e){return gd[e]??"mdi:weather-cloudy"}function bd(e){return md[e]??(e||"Počasí")}function fd(){var r;const e=((r=ee.getHassSync())==null?void 0:r.states)??{},t=Object.keys(e).filter(n=>n.startsWith("weather."));return t.find(n=>{var o;const a=(o=e[n])==null?void 0:o.state;return a&&a!=="unavailable"&&a!=="unknown"})??t[0]??null}function nt(e){const t=typeof e=="number"?e:parseFloat(String(e));return Number.isFinite(t)?t:null}function vd(e){return{datetime:String(e.datetime??""),condition:String(e.condition??""),temperature:nt(e.temperature),templow:nt(e.templow),precipitation:nt(e.precipitation),precipitationProbability:nt(e.precipitation_probability),windSpeed:nt(e.wind_speed)}}async function bo(e,t){var i,r;try{const n=await ee.callWS({type:"call_service",domain:"weather",service:"get_forecasts",service_data:{type:t},target:{entity_id:e},return_response:!0});return(((r=(i=n==null?void 0:n.response)==null?void 0:i[e])==null?void 0:r.forecast)??[]).map(vd)}catch(n){return L.debug(`weather.get_forecasts(${t}) failed`,{entityId:e,err:String(n)}),[]}}async function yd(){var a,o;const e=fd();if(!e)return tn;const t=(o=(a=ee.getHassSync())==null?void 0:a.states)==null?void 0:o[e];if(!t)return{...tn,entityId:e};const i=t.attributes??{},[r,n]=await Promise.all([bo(e,"hourly"),bo(e,"daily")]);return{available:!0,entityId:e,condition:t.state||"",temperature:nt(i.temperature),apparentTemperature:nt(i.apparent_temperature),humidity:nt(i.humidity),windSpeed:nt(i.wind_speed),tempUnit:String(i.temperature_unit??"°C"),windUnit:String(i.wind_speed_unit??"km/h"),hourly:r,daily:n}}const Ls={"HOME I":{icon:"🏠",color:"#4CAF50",label:"HOME I"},"HOME II":{icon:"⚡",color:"#2196F3",label:"HOME II"},"HOME III":{icon:"🔋",color:"#9C27B0",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"#FF9800",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"#FF9800",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"#9E9E9E",label:"DO NOTHING"}},Hs={yesterday:"📊 Včera",today:"📆 Dnes",tomorrow:"📅 Zítra",history:"📈 Historie",detail:"💎 Detail"};function fo(e){return{modeHistorical:e.mode_historical??e.mode??"",modePlanned:e.mode_planned??"",modeMatch:e.mode_match??!1,status:e.status??"planned",startTime:e.start_time??"",endTime:e.end_time??"",durationHours:e.duration_hours??0,costHistorical:e.cost_historical??null,costPlanned:e.cost_planned??null,costDelta:e.cost_delta??null,solarKwh:e.solar_total_kwh??0,consumptionKwh:e.consumption_total_kwh??0,gridImportKwh:e.grid_import_total_kwh??0,gridExportKwh:e.grid_export_total_kwh??0,intervalReasons:Array.isArray(e.interval_reasons)?e.interval_reasons:[]}}function Wr(e){return{plan:(e==null?void 0:e.plan)??0,actual:(e==null?void 0:e.actual)??null,hasActual:(e==null?void 0:e.has_actual)??!1,unit:(e==null?void 0:e.unit)??""}}function xd(e){const t=(e==null?void 0:e.metrics)??{};return{overallAdherence:(e==null?void 0:e.overall_adherence)??0,modeSwitches:(e==null?void 0:e.mode_switches)??0,totalCost:(e==null?void 0:e.total_cost)??0,metrics:{cost:Wr(t.cost),solar:Wr(t.solar),consumption:Wr(t.consumption),grid:Wr(t.grid)},completedSummary:e!=null&&e.completed_summary?{count:e.completed_summary.count??0,totalCost:e.completed_summary.total_cost??0,adherencePct:e.completed_summary.adherence_pct??0}:void 0,plannedSummary:e!=null&&e.planned_summary?{count:e.planned_summary.count??0,totalCost:e.planned_summary.total_cost??0}:void 0,progressPct:e==null?void 0:e.progress_pct,actualTotalCost:e==null?void 0:e.actual_total_cost,planTotalCost:e==null?void 0:e.plan_total_cost,vsPlanPct:e==null?void 0:e.vs_plan_pct,backupBaselineCost:e==null?void 0:e.backup_baseline_cost,backupActualCost:e==null?void 0:e.backup_actual_cost,backupSavings:e==null?void 0:e.backup_savings,eodPrediction:e!=null&&e.eod_prediction?{predictedTotal:e.eod_prediction.predicted_total??0,predictedSavings:e.eod_prediction.predicted_savings??0}:void 0}}function wd(e){return e?{date:e.date??"",modeBlocks:Array.isArray(e.mode_blocks)?e.mode_blocks.map(fo):[],summary:xd(e.summary),metadata:e.metadata?{activePlan:e.metadata.active_plan??"hybrid",comparisonPlanAvailable:e.metadata.comparison_plan_available}:void 0,comparison:e.comparison?{plan:e.comparison.plan??"",modeBlocks:Array.isArray(e.comparison.mode_blocks)?e.comparison.mode_blocks.map(fo):[]}:void 0}:null}async function _d(e,t,i="hybrid"){try{const r=await ee.loadDetailTabs(e,t,i);if(!r)return null;const n=r[t]??r;return wd(n)}catch(r){return L.error(`Failed to load timeline tab: ${t}`,r),null}}const fa={tiles_left:[null,null,null,null,null,null],tiles_right:[null,null,null,null,null,null],left_count:4,right_count:4,visible:!0,version:1},Vs="oig_dashboard_tiles";function $d(e,t){return t==="W"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kW"}:t==="Wh"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kWh"}:t==="W"||t==="Wh"?{value:Math.round(e).toString(),unit:t}:{value:e.toFixed(1),unit:t}}async function kd(){var e;try{const t=await ee.callWS({type:"call_service",domain:"oig_cloud",service:"get_dashboard_tiles",service_data:{},return_response:!0}),i=(e=t==null?void 0:t.response)==null?void 0:e.config;if(i&&typeof i=="object")return L.debug("Loaded tiles config from HA"),yo(i)}catch(t){L.debug("WS tile config load failed, trying localStorage",{error:t.message})}try{const t=localStorage.getItem(Vs);if(t){const i=JSON.parse(t);return L.debug("Loaded tiles config from localStorage"),yo(i)}}catch{L.debug("localStorage tile config load failed")}return fa}async function vo(e){try{return localStorage.setItem(Vs,JSON.stringify(e)),await ee.callService("oig_cloud","save_dashboard_tiles",{config:JSON.stringify(e)}),L.info("Tiles config saved"),!0}catch(t){return L.error("Failed to save tiles config",t),!1}}function yo(e){return{tiles_left:Array.isArray(e.tiles_left)?e.tiles_left.slice(0,6):fa.tiles_left,tiles_right:Array.isArray(e.tiles_right)?e.tiles_right.slice(0,6):fa.tiles_right,left_count:typeof e.left_count=="number"?e.left_count:4,right_count:typeof e.right_count=="number"?e.right_count:4,visible:e.visible!==!1,version:e.version??1}}function Yn(e){var l;const t=ut();if(!t)return{value:"--",unit:"",isActive:!1,rawValue:0};const i=t.get(e);if(!i||i.state==="unavailable"||i.state==="unknown")return{value:"--",unit:"",isActive:!1,rawValue:0};const r=i.state,n=String(((l=i.attributes)==null?void 0:l.unit_of_measurement)??""),a=parseFloat(r)||0;if(i.entity_id.startsWith("switch.")||i.entity_id.startsWith("binary_sensor."))return{value:r==="on"?"Zapnuto":"Vypnuto",unit:"",isActive:r==="on",rawValue:r==="on"?1:0};const o=$d(a,n);return{value:o.value,unit:o.unit,isActive:a!==0,rawValue:a}}function Ri(e){const t=(i,r)=>{var a,o;const n=[];for(let l=0;l<r;l++){const d=i[l];if(!d)continue;const p=Yn(d.entity_id),u={};if((a=d.support_entities)!=null&&a.top_right){const h=Yn(d.support_entities.top_right);u.topRight={value:h.value,unit:h.unit}}if((o=d.support_entities)!=null&&o.bottom_right){const h=Yn(d.support_entities.bottom_right);u.bottomRight={value:h.value,unit:h.unit}}n.push({config:d,value:p.value,unit:p.unit,isActive:p.isActive,isZero:p.rawValue===0,formattedValue:p.unit?`${p.value} ${p.unit}`:p.value,supportValues:u})}return n};return{left:t(e.tiles_left,e.left_count),right:t(e.tiles_right,e.right_count)}}async function Cd(e,t="toggle"){const i=e.split(".")[0];return ee.callService(i,t,{entity_id:e})}function ae(e,t="CZK"){return e==null||Number.isNaN(e)?`-- ${t}`:`${e.toFixed(2)} ${t}`}function di(e,t=0){return e==null||Number.isNaN(e)?"-- %":`${e.toFixed(t)} %`}const Md={fridge:"❄️","fridge-outline":"❄️",dishwasher:"🍽️","washing-machine":"🧺","tumble-dryer":"🌪️",stove:"🔥",microwave:"📦","coffee-maker":"☕",kettle:"🫖",toaster:"🍞",lightbulb:"💡","lightbulb-outline":"💡",lamp:"🪔","ceiling-light":"💡","floor-lamp":"🪔","led-strip":"✨","led-strip-variant":"✨","wall-sconce":"💡",chandelier:"💡",thermometer:"🌡️",thermostat:"🌡️",radiator:"♨️","radiator-disabled":"❄️","heat-pump":"♨️","air-conditioner":"❄️",fan:"🌀",hvac:"♨️",fire:"🔥",snowflake:"❄️","lightning-bolt":"⚡",flash:"⚡",battery:"🔋","battery-charging":"🔋","battery-50":"🔋","solar-panel":"☀️","solar-power":"☀️","meter-electric":"⚡","power-plug":"🔌","power-socket":"🔌",car:"🚗","car-electric":"🚘","car-battery":"🔋","ev-station":"🔌","ev-plug-type2":"🔌",garage:"🏠","garage-open":"🏠",door:"🚪","door-open":"🚪",lock:"🔒","lock-open":"🔓","shield-home":"🛡️",cctv:"📹",camera:"📹","motion-sensor":"👁️","alarm-light":"🚨",bell:"🔔","window-closed":"🪟","window-open":"🪟",blinds:"🪟","blinds-open":"🪟",curtains:"🪟","roller-shade":"🪟",television:"📺",speaker:"🔊","speaker-wireless":"🔊",music:"🎵","volume-high":"🔊",cast:"📡",chromecast:"📡","router-wireless":"📡",wifi:"📶","access-point":"📡",lan:"🌐",network:"🌐","home-assistant":"🏠",water:"💧","water-percent":"💧","water-boiler":"♨️","water-pump":"💧",shower:"🚿",toilet:"🚽",faucet:"🚰",pipe:"🔧","weather-sunny":"☀️","weather-cloudy":"☁️","weather-night":"🌙","weather-rainy":"🌧️","weather-snowy":"❄️","weather-windy":"💨",information:"ℹ️","help-circle":"❓","alert-circle":"⚠️","checkbox-marked-circle":"✅","toggle-switch":"🔘",power:"⚡",sync:"🔄"};function Sd(e){const t=e.replace(/^mdi:/,"");return Md[t]||"⚙️"}function Qn(e,t){let i=!1;return(...r)=>{i||(e(...r),i=!0,setTimeout(()=>i=!1,t))}}async function Wi(e,t=3,i=1e3){let r;for(let n=0;n<=t;n++)try{return await e()}catch(a){if(r=a,a instanceof Error&&(a.message.includes("401")||a.message.includes("403")))throw a;if(n<t){const o=Math.min(i*Math.pow(2,n),5e3);await new Promise(l=>setTimeout(l,o))}}throw r}class Ad{constructor(){this.state={...ws,pendingServices:new Map,changingServices:new Set},this.listeners=new Set,this.watcherUnsub=null,this.queueUpdateInterval=null,this.started=!1}start(){this.started||(this.started=!0,this.watcherUnsub=Ft.onEntityChange((t,i)=>{t&&this.shouldRefreshShield(t)&&this.refresh()}),this.refresh(),this.queueUpdateInterval=window.setInterval(()=>{this.state.allRequests.length>0&&this.notify()},1e3),L.debug("ShieldController started"))}stop(){var t;(t=this.watcherUnsub)==null||t.call(this),this.watcherUnsub=null,this.queueUpdateInterval!==null&&(clearInterval(this.queueUpdateInterval),this.queueUpdateInterval=null),this.started=!1,L.debug("ShieldController stopped")}subscribe(t){return this.listeners.add(t),t(this.state),()=>this.listeners.delete(t)}getState(){return this.state}shouldRefreshShield(t){return["service_shield_","box_prms_mode","box_mode_extended","box_prm2_app","boiler_manual_mode","invertor_prms_to_grid","invertor_prm1_p_max_feed_grid"].some(r=>t.includes(r))}readSupplementaryState(t){const i=t.findSensorId("box_mode_extended"),r=t.get(i);if(!r||r.state==="unavailable"||r.state==="unknown"||r.state==="")return{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1};const n=r.attributes??{};return{home_grid_v:n.home_grid_v===!0,home_grid_vi:n.home_grid_vi===!0,flexibilita:n.flexibilita===!0,available:!0}}refresh(){const t=ut();if(t)try{const i=t.findSensorId("service_shield_activity"),r=t.get(i),n=(r==null?void 0:r.attributes)??{},a=n.running_requests??[],o=n.queued_requests??[],l=t.findSensorId("service_shield_status"),d=t.findSensorId("service_shield_queue"),p=t.getString(l).value,u=t.getNumeric(d).value,h=t.getString(t.findSensorId("box_prms_mode")).value,m=t.getString(t.findSensorId("invertor_prms_to_grid")).value,v=t.getNumeric(t.findSensorId("invertor_prm1_p_max_feed_grid")).value,f=t.getString(t.findSensorId("boiler_manual_mode")).value,b=Ya[h.trim()]??"home_1",$=Qa[f.trim()]??"cbb",y=a.map((K,Z)=>this.parseRequest(K,Z,!0)),_=o.map((K,Z)=>this.parseRequest(K,Z+a.length,!1)),S=[...y,..._],B=new Map,P=new Set;for(const K of S){const Z=this.parseServiceRequest(K);Z&&!B.has(Z.type)&&(B.set(Z.type,Z.targetValue),P.add(Z.type))}const N=p==="Running"||p==="running",V=_s({gridModeRaw:m,gridLimit:v},{pendingServices:B,changingServices:P,shieldStatus:N?"running":"idle"}),q=la(m)||V.currentLiveDelivery==="unknown"?this.state.currentGridDelivery:V.currentLiveDelivery;this.state={status:N?"running":"idle",activity:(r==null?void 0:r.state)??"",queueCount:u,runningRequests:y,queuedRequests:_,allRequests:S,currentBoxMode:b,currentGridDelivery:q,currentGridLimit:V.currentLiveLimit??0,currentBoilerMode:$,pendingServices:B,changingServices:P,gridDeliveryState:V,supplementary:this.readSupplementaryState(t)},this.notify()}catch(i){L.error("ShieldController refresh failed",i)}}parseRequest(t,i,r){const n=t||{},a=n.service??"",l=(Array.isArray(n.changes)?n.changes:[]).map(f=>typeof f=="string"?f:String(f??"")).filter(f=>f.length>0),d=n.started_at??n.queued_at??n.created_at??n.timestamp??n.created??"",p=Array.isArray(n.targets)?n.targets.map(f=>({param:String((f==null?void 0:f.param)??""),value:String((f==null?void 0:f.value)??(f==null?void 0:f.to)??""),entityId:String((f==null?void 0:f.entity_id)??(f==null?void 0:f.entityId)??""),from:String((f==null?void 0:f.from)??""),to:String((f==null?void 0:f.to)??(f==null?void 0:f.value)??""),current:String((f==null?void 0:f.current)??"")})):[],u=this.extractRequestParams(n.params),h=this.extractGridDeliveryStep(n,u),m=this.resolveRequestTargetValue(n,p,u,h);let v="mode_change";if(a.includes("set_box_mode")){const f=this.extractRequestParams(n.params);v=(f==null?void 0:f.home_grid_v)!==void 0||(f==null?void 0:f.home_grid_vi)!==void 0||Array.isArray(n.targets)&&n.targets.some($=>($==null?void 0:$.param)==="app")?"supplementary_toggle":"mode_change"}else a.includes("set_grid_delivery")&&!a.includes("limit")?v="grid_delivery":a.includes("grid_delivery_limit")||a.includes("set_grid_delivery")?v="grid_limit":a.includes("set_boiler_mode")?v="boiler_mode":a.includes("set_formating_mode")&&(v="battery_formating");return{id:`${a}_${i}_${d}`,type:v,status:r?"running":"queued",service:a,targetValue:m,changes:l,createdAt:d,position:i+1,description:typeof n.description=="string"?n.description:void 0,params:u,targets:p,traceId:typeof n.trace_id=="string"?n.trace_id:void 0,gridDeliveryStep:h}}parseServiceRequest(t){var p,u;const i=t.service;if(!i)return null;const r=t.changes.length>0?t.changes[0]:"",n=t.params,a=t.gridDeliveryStep,o=this.extractStructuredTarget(t);if(i.includes("set_grid_delivery")&&o)return o;if(i.includes("set_grid_delivery")&&r.includes("p_max_feed_grid")){const h=r.match(/→\s*'?(\d+)'?/),m=h?h[1]:t.targetValue;return m?{type:"grid_limit",targetValue:m}:null}const l=r.match(/→\s*'([^']+)'/),d=l?l[1]:t.targetValue||"";if(i.includes("set_box_mode")){if(((p=t.targets)==null?void 0:p.some(m=>m.param==="app"))||(n==null?void 0:n.home_grid_v)!==void 0||(n==null?void 0:n.home_grid_vi)!==void 0){const m=(u=t.targets)==null?void 0:u.find(b=>b.param==="app"),v=(m==null?void 0:m.to)||t.targetValue;return{type:"supplementary",targetValue:xs[v]??v??""}}return{type:"box_mode",targetValue:d}}if(i.includes("set_boiler_mode"))return{type:"boiler_mode",targetValue:d};if(i.includes("set_grid_delivery")&&r.includes("prms_to_grid"))return{type:"grid_mode",targetValue:d};if(i.includes("set_grid_delivery")){if(a==="limit"){const m=this.normalizeNumericTargetValue((n==null?void 0:n.limit)??t.targetValue);return m?{type:"grid_limit",targetValue:m}:null}if(a==="mode"){const m=this.normalizeModeTargetValue((n==null?void 0:n.mode)??t.targetValue);return m?{type:"grid_mode",targetValue:m}:null}const h=r.match(/→\s*'?(\d+)'?/);return h?{type:"grid_limit",targetValue:h[1]}:t.targetValue&&/^\d+$/.test(t.targetValue.trim())?{type:"grid_limit",targetValue:t.targetValue}:{type:"grid_mode",targetValue:d}}return null}extractRequestParams(t){if(!(!t||typeof t!="object"||Array.isArray(t)))return t}extractGridDeliveryStep(t,i){const r=(t==null?void 0:t.grid_delivery_step)??(i==null?void 0:i._grid_delivery_step);return typeof r=="string"?r:void 0}resolveRequestTargetValue(t,i,r,n){const a=this.extractStructuredTarget({service:(t==null?void 0:t.service)??"",targetValue:"",params:r,targets:i,gridDeliveryStep:n});if(a!=null&&a.targetValue)return a.targetValue;const o=t.target_value??t.target_display;return typeof o=="string"?o:""}extractStructuredTarget(t){if(!t.service.includes("set_grid_delivery"))return null;const i=t.gridDeliveryStep,r=t.params,n=t.targets??[];if(i==="limit"){const l=this.findTargetValue(n,["limit"]),d=this.normalizeNumericTargetValue(l??(r==null?void 0:r.limit)??t.targetValue);return d?{type:"grid_limit",targetValue:d}:null}if(i==="mode"){const l=this.findTargetValue(n,["mode"]),d=this.normalizeModeTargetValue(l??(r==null?void 0:r.mode)??t.targetValue);return d?{type:"grid_mode",targetValue:d}:null}const a=this.findTargetValue(n,["limit"]);if(a){const l=this.normalizeNumericTargetValue(a);if(l)return{type:"grid_limit",targetValue:l}}const o=this.findTargetValue(n,["mode"]);if(o){const l=this.normalizeModeTargetValue(o);if(l)return{type:"grid_mode",targetValue:l}}return null}findTargetValue(t,i){const r=new Set(i),n=t.find(a=>r.has(a.param));return(n==null?void 0:n.to)||(n==null?void 0:n.value)||void 0}normalizeNumericTargetValue(t){if(typeof t=="number"&&Number.isFinite(t))return String(Math.round(t));if(typeof t!="string")return"";const i=t.trim().match(/(\d+)/);return i?i[1]:""}normalizeModeTargetValue(t){if(typeof t!="string")return"";const i=t.trim();switch(i.toLowerCase()){case"off":return"Vypnuto";case"on":return"Zapnuto";case"limited":return"Omezeno";default:return i}}isLimitedGridDeliveryActiveOrPending(){const t=this.state.gridDeliveryState;if(t.pendingDeliveryTarget==="limited"||t.pendingLimitTarget!==null||t.currentLiveDelivery==="limited"||t.currentLiveDelivery==="unknown"&&(sc(t)==="limited"||this.state.currentGridDelivery==="limited"))return!0;const i=ut();if(i){const r=i.getString(i.findSensorId("invertor_prms_to_grid")).value;if(!la(r)&&$a(r)==="limited")return!0}return!1}needsGridModeChangeForLimitedRequest(){return!this.isLimitedGridDeliveryActiveOrPending()}getBoxModeButtonState(t){const i=this.state.pendingServices.get("box_mode");return i?Ya[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoxMode===t?"active":"idle"}getGridDeliveryButtonState(t){return this.getGridDeliveryButtonStateV2(t)}getGridDeliveryButtonStateV2(t){const i=this.state.gridDeliveryState,n=this.state.status==="running"?"processing":"pending",a=i.pendingDeliveryTarget,o=i.pendingLimitTarget,l=i.currentLiveDelivery;return a!==null?a===t?n:t==="limited"&&l==="limited"||t==="limited"&&l==="unknown"&&this.state.currentGridDelivery==="limited"?"active":"disabled-by-service":o!==null?t==="limited"?n:"disabled-by-service":l===t?"active":"idle"}getBoilerModeButtonState(t){const i=this.state.pendingServices.get("boiler_mode");return i?Qa[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoilerMode===t?"active":"idle"}isAnyServiceChanging(){return this.state.changingServices.size>0}shouldProceedWithQueue(){return this.state.queueCount<3?!0:window.confirm(`⚠️ VAROVÁNÍ: Fronta již obsahuje ${this.state.queueCount} úkolů!

Každá změna může trvat až 10 minut.
Opravdu chcete přidat další úkol?`)}async setBoxMode(t){if(this.state.currentBoxMode===t&&!this.state.changingServices.has("box_mode"))return!1;const i=await ee.callService("oig_cloud","set_box_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async setGridDelivery(t,i){const r={acknowledgement:!0,warning:!0};t==="limited"&&i!=null?(this.needsGridModeChangeForLimitedRequest()&&(r.mode=t),r.limit=i):i!=null?r.limit=i:r.mode=t;const n=await ee.callService("oig_cloud","set_grid_delivery",r);return n&&this.refresh(),n}async setBoilerMode(t){if(this.state.currentBoilerMode===t&&!this.state.changingServices.has("boiler_mode"))return!1;const i=await ee.callService("oig_cloud","set_boiler_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async removeFromQueue(t){const i=await ee.callService("oig_cloud","shield_remove_from_queue",{position:t});return i&&this.refresh(),i}async setSupplementaryToggle(t,i){const r=await ee.callService("oig_cloud","set_box_mode",{[t]:i,acknowledgement:!0});return r&&this.refresh(),r}notify(){for(const t of this.listeners)try{t(this.state)}catch(i){L.error("ShieldController listener error",i)}}}const de=new Ad;var Ld="M4.93,4.93C3.12,6.74 2,9.24 2,12C2,14.76 3.12,17.26 4.93,19.07L6.34,17.66C4.89,16.22 4,14.22 4,12C4,9.79 4.89,7.78 6.34,6.34L4.93,4.93M19.07,4.93L17.66,6.34C19.11,7.78 20,9.79 20,12C20,14.22 19.11,16.22 17.66,17.66L19.07,19.07C20.88,17.26 22,14.76 22,12C22,9.24 20.88,6.74 19.07,4.93M7.76,7.76C6.67,8.85 6,10.35 6,12C6,13.65 6.67,15.15 7.76,16.24L9.17,14.83C8.45,14.11 8,13.11 8,12C8,10.89 8.45,9.89 9.17,9.17L7.76,7.76M16.24,7.76L14.83,9.17C15.55,9.89 16,10.89 16,12C16,13.11 15.55,14.11 14.83,14.83L16.24,16.24C17.33,15.15 18,13.65 18,12C18,10.35 17.33,8.85 16.24,7.76M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10Z",Hd="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z",Vd="M6.59,0.66C8.93,-1.15 11.47,1.06 12.04,4.5C12.47,4.5 12.89,4.62 13.27,4.84C13.79,4.24 14.25,3.42 14.07,2.5C13.65,0.35 16.06,-1.39 18.35,1.58C20.16,3.92 17.95,6.46 14.5,7.03C14.5,7.46 14.39,7.89 14.16,8.27C14.76,8.78 15.58,9.24 16.5,9.06C18.63,8.64 20.38,11.04 17.41,13.34C15.07,15.15 12.53,12.94 11.96,9.5C11.53,9.5 11.11,9.37 10.74,9.15C10.22,9.75 9.75,10.58 9.93,11.5C10.35,13.64 7.94,15.39 5.65,12.42C3.83,10.07 6.05,7.53 9.5,6.97C9.5,6.54 9.63,6.12 9.85,5.74C9.25,5.23 8.43,4.76 7.5,4.94C5.37,5.36 3.62,2.96 6.59,0.66M5,16H7A2,2 0 0,1 9,18V24H7V22H5V24H3V18A2,2 0 0,1 5,16M5,18V20H7V18H5M12.93,16H15L12.07,24H10L12.93,16M18,16H21V18H18V22H21V24H18A2,2 0 0,1 16,22V18A2,2 0 0,1 18,16Z",xo="M19,18.31V20A2,2 0 0,1 17,22H7A2,2 0 0,1 5,20V16.3C4.54,16.12 3.95,16 3,16A1,1 0 0,1 2,15A1,1 0 0,1 3,14C3.82,14 4.47,14.08 5,14.21V12.3C4.54,12.12 3.95,12 3,12A1,1 0 0,1 2,11A1,1 0 0,1 3,10C3.82,10 4.47,10.08 5,10.21V8.3C4.54,8.12 3.95,8 3,8A1,1 0 0,1 2,7A1,1 0 0,1 3,6C3.82,6 4.47,6.08 5,6.21V4A2,2 0 0,1 7,2H17A2,2 0 0,1 19,4V6.16C20.78,6.47 21.54,7.13 21.71,7.29C22.1,7.68 22.1,8.32 21.71,8.71C21.32,9.1 20.8,9.09 20.29,8.71V8.71C20.29,8.71 19.25,8 17,8C15.74,8 14.91,8.41 13.95,8.9C12.91,9.41 11.74,10 10,10C9.64,10 9.31,10 9,9.96V7.95C9.3,8 9.63,8 10,8C11.26,8 12.09,7.59 13.05,7.11C14.09,6.59 15.27,6 17,6V4H7V20H17V18C18.5,18 18.97,18.29 19,18.31M17,10C15.27,10 14.09,10.59 13.05,11.11C12.09,11.59 11.26,12 10,12C9.63,12 9.3,12 9,11.95V13.96C9.31,14 9.64,14 10,14C11.74,14 12.91,13.41 13.95,12.9C14.91,12.42 15.74,12 17,12C19.25,12 20.29,12.71 20.29,12.71V12.71C20.8,13.1 21.32,13.1 21.71,12.71C22.1,12.32 22.1,11.69 21.71,11.29C21.5,11.08 20.25,10 17,10M17,14C15.27,14 14.09,14.59 13.05,15.11C12.09,15.59 11.26,16 10,16C9.63,16 9.3,16 9,15.95V17.96C9.31,18 9.64,18 10,18C11.74,18 12.91,17.41 13.95,16.9C14.91,16.42 15.74,16 17,16C19.25,16 20.29,16.71 20.29,16.71V16.71C20.8,17.1 21.32,17.1 21.71,16.71C22.1,16.32 22.1,15.69 21.71,15.29C21.5,15.08 20.25,14 17,14Z",Td="M11,9A4,4 0 0,1 15,13A4,4 0 0,1 11,17A4,4 0 0,1 7,13A4,4 0 0,1 11,9M11,11A2,2 0 0,0 9,13A2,2 0 0,0 11,15A2,2 0 0,0 13,13A2,2 0 0,0 11,11M7,4H14A4,4 0 0,1 18,8V9H16V8A2,2 0 0,0 14,6H7A2,2 0 0,0 5,8V20H16V18H18V22H3V8A4,4 0 0,1 7,4M16,11C18.5,11 18.5,9 21,9V11C18.5,11 18.5,13 16,13V11M16,15C18.5,15 18.5,13 21,13V15C18.5,15 18.5,17 16,17V15Z",Pd="M20.56 3.91C21.15 4.5 21.15 5.45 20.56 6.03L16.67 9.92L18.79 19.11L17.38 20.53L13.5 13.1L9.6 17L9.96 19.47L8.89 20.53L7.13 17.35L3.94 15.58L5 14.5L7.5 14.87L11.37 11L3.94 7.09L5.36 5.68L14.55 7.8L18.44 3.91C19 3.33 20 3.33 20.56 3.91Z",zd="M12,20A7,7 0 0,1 5,13A7,7 0 0,1 12,6A7,7 0 0,1 19,13A7,7 0 0,1 12,20M12,4A9,9 0 0,0 3,13A9,9 0 0,0 12,22A9,9 0 0,0 21,13A9,9 0 0,0 12,4M12.5,8H11V14L15.75,16.85L16.5,15.62L12.5,13.25V8M7.88,3.39L6.6,1.86L2,5.71L3.29,7.24L7.88,3.39M22,5.72L17.4,1.86L16.11,3.39L20.71,7.25L22,5.72Z",Dd="M6,6.9L3.87,4.78L5.28,3.37L7.4,5.5L6,6.9M13,1V4H11V1H13M20.13,4.78L18,6.9L16.6,5.5L18.72,3.37L20.13,4.78M4.5,10.5V12.5H1.5V10.5H4.5M19.5,10.5H22.5V12.5H19.5V10.5M6,20H18A2,2 0 0,1 20,22H4A2,2 0 0,1 6,20M12,5A6,6 0 0,1 18,11V19H6V11A6,6 0 0,1 12,5Z",Ed="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",Od="M11,4H13V16L18.5,10.5L19.92,11.92L12,19.84L4.08,11.92L5.5,10.5L11,16V4Z",Fd="M13,20H11V8L5.5,13.5L4.08,12.08L12,4.16L19.92,12.08L18.5,13.5L13,8V20Z",Id="M10 10V12H8V10H10M16 12V10H14V12H16M21 14V22H3V14H4V10C4 5.58 7.58 2 12 2S20 5.58 20 10V14H21M7 16H5V20H7V16M11 16H9V20H11V16M11 4.08C8.16 4.56 6 7.03 6 10V14H11V4.08M13 14H18V10C18 7.03 15.84 4.56 13 4.08V14M15 16H13V20H15V16M19 16H17V20H19V16Z",Bd="M5.5,21C4.72,21 4.04,20.55 3.71,19.9V19.9L1.1,10.44L1,10A1,1 0 0,1 2,9H6.58L11.18,2.43C11.36,2.17 11.66,2 12,2C12.34,2 12.65,2.17 12.83,2.44L17.42,9H22A1,1 0 0,1 23,10L22.96,10.29L20.29,19.9C19.96,20.55 19.28,21 18.5,21H5.5M12,4.74L9,9H15L12,4.74M12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13Z",Nd="M7 5C8.11 5 9 5.9 9 7S8.11 9 7 9 5 8.11 5 7 5.9 5 7 5M20 13V4.83C20 3.27 18.73 2 17.17 2C16.42 2 15.7 2.3 15.17 2.83L13.92 4.08C13.76 4.03 13.59 4 13.41 4C13 4 12.64 4.12 12.33 4.32L15.09 7.08C15.29 6.77 15.41 6.4 15.41 6C15.41 5.82 15.38 5.66 15.34 5.5L16.59 4.24C16.74 4.09 16.95 4 17.17 4C17.63 4 18 4.37 18 4.83V13H11.15C10.85 12.79 10.58 12.55 10.33 12.28L8.93 10.73C8.74 10.5 8.5 10.35 8.24 10.23C7.93 10.08 7.59 10 7.24 10C6 10 5 11 5 12.25V13H2V19C2 20.1 2.9 21 4 21C4 21.55 4.45 22 5 22H19C19.55 22 20 21.55 20 21C21.1 21 22 20.1 22 19V13H20Z",jd="M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",Rd="M16,18H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",Wd="M16,13H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",Zd="M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.66C6,21.4 6.6,22 7.33,22H16.66C17.4,22 18,21.4 18,20.67V5.33C18,4.6 17.4,4 16.67,4M11,20V14.5H9L13,7V12.5H15",Kd="M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21",qd="M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21M19.75,3.19L18.33,4.61C20.04,6.3 21,8.6 21,11H23C23,8.07 21.84,5.25 19.75,3.19M1,11H3C3,8.6 3.96,6.3 5.67,4.61L4.25,3.19C2.16,5.25 1,8.07 1,11Z",Gd="M19 10C18.44 10 17.91 10.11 17.41 10.28L14.46 4.5H11V6H13.54L14.42 7.72L12 13.13L10.23 8.95C10.5 8.85 10.74 8.58 10.74 8.25C10.74 7.84 10.41 7.5 10 7.5H8C7.58 7.5 7.24 7.84 7.24 8.25S7.58 9 8 9H8.61L10.86 14.25H9.92C9.56 11.85 7.5 10 5 10C2.24 10 0 12.24 0 15S2.24 20 5 20C7.5 20 9.56 18.15 9.92 15.75H12.5L15.29 9.43L16.08 10.96C14.82 11.87 14 13.34 14 15C14 17.76 16.24 20 19 20S24 17.76 24 15 21.76 10 19 10M5 18.5C3.07 18.5 1.5 16.93 1.5 15S3.07 11.5 5 11.5C6.67 11.5 8.07 12.68 8.41 14.25H4V15.75H8.41C8.07 17.32 6.67 18.5 5 18.5M19 18.5C17.07 18.5 15.5 16.93 15.5 15C15.5 13.92 16 12.97 16.77 12.33L18.57 15.85L19.89 15.13L18.1 11.63C18.39 11.56 18.69 11.5 19 11.5C20.93 11.5 22.5 13.07 22.5 15S20.93 18.5 19 18.5Z",wo="M16.13 15.13L18 3H14V2H10V3H5C3.9 3 3 3.9 3 5V9C3 10.1 3.9 11 5 11H7.23L7.87 15.13C6.74 16.05 6 17.43 6 19V20C6 21.1 6.9 22 8 22H16C17.1 22 18 21.1 18 20V19C18 17.43 17.26 16.05 16.13 15.13M5 9V5H6.31L6.93 9H5M12 19C11.45 19 11 18.55 11 18S11.45 17 12 17 13 17.45 13 18 12.55 19 12 19M14.29 14H9.72L8.33 5H15.67L14.29 14Z",Ud="M3,2H21A1,1 0 0,1 22,3V5A1,1 0 0,1 21,6H20V13A1,1 0 0,1 19,14H13V16.17C14.17,16.58 15,17.69 15,19A3,3 0 0,1 12,22A3,3 0 0,1 9,19C9,17.69 9.83,16.58 11,16.17V14H5A1,1 0 0,1 4,13V6H3A1,1 0 0,1 2,5V3A1,1 0 0,1 3,2M12,18A1,1 0 0,0 11,19A1,1 0 0,0 12,20A1,1 0 0,0 13,19A1,1 0 0,0 12,18Z",Yd="M3 2H21C21.55 2 22 2.45 22 3V5C22 5.55 21.55 6 21 6H20V7C20 7.55 19.55 8 19 8H13V10.17C14.17 10.58 15 11.7 15 13C15 14.66 13.66 16 12 16C10.34 16 9 14.66 9 13C9 11.69 9.84 10.58 11 10.17V8H5C4.45 8 4 7.55 4 7V6H3C2.45 6 2 5.55 2 5V3C2 2.45 2.45 2 3 2M12 12C11.45 12 11 12.45 11 13C11 13.55 11.45 14 12 14C12.55 14 13 13.55 13 13C13 12.45 12.55 12 12 12Z",Qd="M14.88,16.29L13,18.17V14.41M13,5.83L14.88,7.71L13,9.58M17.71,7.71L12,2H11V9.58L6.41,5L5,6.41L10.59,12L5,17.58L6.41,19L11,14.41V22H12L17.71,16.29L13.41,12L17.71,7.71Z",Xd="M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,15.31L23.31,12L20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31Z",Jd="M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z",_o="M19.36,2.72L20.78,4.14L15.06,9.85C16.13,11.39 16.28,13.24 15.38,14.44L9.06,8.12C10.26,7.22 12.11,7.37 13.65,8.44L19.36,2.72M5.93,17.57C3.92,15.56 2.69,13.16 2.35,10.92L7.23,8.83L14.67,16.27L12.58,21.15C10.34,20.81 7.94,19.58 5.93,17.57Z",e1="M18,11H6V6H18M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M4,16C4,16.88 4.39,17.67 5,18.22V20A1,1 0 0,0 6,21H7A1,1 0 0,0 8,20V19H16V20A1,1 0 0,0 17,21H18A1,1 0 0,0 19,20V18.22C19.61,17.67 20,16.88 20,16V6C20,2.5 16.42,2 12,2C7.58,2 4,2.5 4,6V16Z",t1="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z",$o="M15,13H16.5V15.82L18.94,17.23L18.19,18.53L15,16.69V13M19,8H5V19H9.67C9.24,18.09 9,17.07 9,16A7,7 0 0,1 16,9C17.07,9 18.09,9.24 19,9.67V8M5,21C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H6V1H8V3H16V1H18V3H19A2,2 0 0,1 21,5V11.1C22.24,12.36 23,14.09 23,16A7,7 0 0,1 16,23C14.09,23 12.36,22.24 11.1,21H5M16,11.15A4.85,4.85 0 0,0 11.15,16C11.15,18.68 13.32,20.85 16,20.85A4.85,4.85 0 0,0 20.85,16C20.85,13.32 18.68,11.15 16,11.15Z",i1="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z",r1="M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z",n1="M4,3V6H1V20H23V6H20V3H14V6H10V3H4M3,8H21V18H3V8M15,10V12H13V14H15V16H17V14H19V12H17V10H15M5,12V14H11V12H5Z",a1="M18.92 2C18.72 1.42 18.16 1 17.5 1H6.5C5.84 1 5.29 1.42 5.08 2L3 8V16C3 16.55 3.45 17 4 17H5C5.55 17 6 16.55 6 16V15H18V16C18 16.55 18.45 17 19 17H20C20.55 17 21 16.55 21 16V8L18.92 2M6.5 12C5.67 12 5 11.33 5 10.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12M17.5 12C16.67 12 16 11.33 16 10.5S16.67 9 17.5 9 19 9.67 19 10.5 18.33 12 17.5 12M5 7L6.5 2.5H17.5L19 7H5M7 20H11V18L17 21H13V23L7 20Z",o1="M3,6H21V18H3V6M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M7,8A2,2 0 0,1 5,10V14A2,2 0 0,1 7,16H17A2,2 0 0,1 19,14V10A2,2 0 0,1 17,8H7Z",ko="M1,10V12A9,9 0 0,1 10,21H12C12,14.92 7.07,10 1,10M1,14V16A5,5 0 0,1 6,21H8A7,7 0 0,0 1,14M1,18V21H4A3,3 0 0,0 1,18M21,3H3C1.89,3 1,3.89 1,5V8H3V5H21V19H14V21H21A2,2 0 0,0 23,19V5C23,3.89 22.1,3 21,3Z",s1="M6.03 12.03L8.03 15.5L5.5 18.68L2 12.62L6.03 12.03M17 18V15.29C17.88 14.9 18.5 14.03 18.5 13C18.5 12.43 18.3 11.9 17.97 11.5L19.94 10.35C20.95 9.76 21.3 8.47 20.71 7.46L19.33 5.06C18.74 4.05 17.45 3.7 16.44 4.28L8.31 9C7.36 9.53 7.03 10.75 7.58 11.71L9.08 14.31C9.63 15.26 10.86 15.59 11.81 15.04L13.69 13.96C13.94 14.55 14.41 15.03 15 15.29V18C15 19.1 15.9 20 17 20H22V18H17Z",l1="M8,9H11V4H13V9H16L20,17H4L8,9M14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18H14Z",c1="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z",d1="M15 13.1C15 14.76 13.66 16.1 12 16.1S9 14.76 9 13.1 10.34 10.1 12 10.1 15 11.44 15 13.1M9 2V3C9 4.11 9.9 5 11 5V9.1C11.32 9.04 11.66 9 12 9S12.68 9.04 13 9.1V5C14.11 5 15 4.11 15 3V2H9M4 11.1C2.34 11.1 1 12.44 1 14.1S2.34 17.1 4 17.1 7 15.76 7 14.1 5.66 11.1 4 11.1M20 11.1C18.34 11.1 17 12.44 17 14.1S18.34 17.1 20 17.1 23 15.76 23 14.1 21.66 11.1 20 11.1M20 18.1C19.32 18.1 18.67 17.96 18.08 17.71C17.6 17.95 17.07 18.1 16.5 18.1C15.39 18.1 14.41 17.57 13.77 16.77C13.22 17 12.63 17.1 12 17.1S10.78 17 10.23 16.77C9.59 17.57 8.61 18.1 7.5 18.1C6.93 18.1 6.4 17.95 5.92 17.71C5.33 17.96 4.68 18.1 4 18.1C3.73 18.1 3.46 18.06 3.2 18C4.21 19.29 5.76 20.1 7.5 20.1C8.83 20.1 10.05 19.63 11 18.84V21.1C11 21.65 11.45 22.1 12 22.1C12.55 22.1 13 21.65 13 21.1V18.84C13.95 19.63 15.17 20.1 16.5 20.1C18.24 20.1 19.79 19.29 20.8 18C20.54 18.06 20.27 18.1 20 18.1Z",p1="M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z",u1="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",h1="M10,17L5,12L6.41,10.58L10,14.17L17.59,6.58L19,8M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",g1="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z",m1="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",b1="M6.5 20Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20Z",f1="M18 6V4H20V2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H20V20H15.97C17.2 19.09 18 17.64 18 16V11H8V16C8 17.64 8.81 19.09 10.03 20H6V4H8V6C8 6.55 8.45 7 9 7H17C17.55 7 18 6.55 18 6M13 8C13.55 8 14 8.45 14 9S13.55 10 13 10 12 9.55 12 9 12.45 8 13 8Z",Co="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z",v1="M19,3L13,9L15,11L22,4V3M12,12.5A0.5,0.5 0 0,1 11.5,12A0.5,0.5 0 0,1 12,11.5A0.5,0.5 0 0,1 12.5,12A0.5,0.5 0 0,1 12,12.5M6,20A2,2 0 0,1 4,18C4,16.89 4.9,16 6,16A2,2 0 0,1 8,18C8,19.11 7.1,20 6,20M6,8A2,2 0 0,1 4,6C4,4.89 4.9,4 6,4A2,2 0 0,1 8,6C8,7.11 7.1,8 6,8M9.64,7.64C9.87,7.14 10,6.59 10,6A4,4 0 0,0 6,2A4,4 0 0,0 2,6A4,4 0 0,0 6,10C6.59,10 7.14,9.87 7.64,9.64L10,12L7.64,14.36C7.14,14.13 6.59,14 6,14A4,4 0 0,0 2,18A4,4 0 0,0 6,22A4,4 0 0,0 10,18C10,17.41 9.87,16.86 9.64,16.36L12,14L19,21H22V20L9.64,7.64Z",y1="M12.43 11C12.28 10.84 10 7 7 7S2.32 10.18 2 11V13H11.57C11.72 13.16 14 17 17 17S21.68 13.82 22 13V11H12.43M7 9C8.17 9 9.18 9.85 10 11H4.31C4.78 10.17 5.54 9 7 9M17 15C15.83 15 14.82 14.15 14 13H19.69C19.22 13.83 18.46 15 17 15Z",x1="M2,9V11H22V9H2M2,13V15H7V13H2M9,13V15H15V13H9M17,13V15H22V13H17Z",w1="M23 3H1V1H23V3M2 22H6C6 19 4 17 4 17C10 13 11 4 11 4H2V22M22 4H13C13 4 14 13 20 17C20 17 18 19 18 22H22V4Z",_1="M10.85,2L9.18,4.5L10.32,5.25L7.14,10C7.1,10 7.05,10 7,10A2,2 0 0,0 5,12C5,12.94 5.66,13.75 6.58,13.95L10.62,20H7V22H17V20H13L8.53,13.28C8.83,12.92 9,12.47 9,12C9,11.7 8.93,11.4 8.8,11.13L12,6.37C11.78,8.05 12.75,9.89 14.45,11L18.89,4.37C17.2,3.24 15.12,3.04 13.65,3.87L10.85,2M18.33,7L16.67,9.5C17.35,9.95 18.29,9.77 18.75,9.08C19.21,8.39 19,7.46 18.33,7Z",$1="M18,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V4A2,2 0 0,0 18,2M10,4A1,1 0 0,1 11,5A1,1 0 0,1 10,6A1,1 0 0,1 9,5A1,1 0 0,1 10,4M7,4A1,1 0 0,1 8,5A1,1 0 0,1 7,6A1,1 0 0,1 6,5A1,1 0 0,1 7,4M18,20H6V8H18V20M14.67,15.33C14.69,16.03 14.41,16.71 13.91,17.21C12.86,18.26 11.15,18.27 10.09,17.21C9.59,16.71 9.31,16.03 9.33,15.33C9.4,14.62 9.63,13.94 10,13.33C10.37,12.5 10.81,11.73 11.33,11L12,10C13.79,12.59 14.67,14.36 14.67,15.33",k1="M8,3C6.89,3 6,3.89 6,5V21H18V5C18,3.89 17.11,3 16,3H8M8,5H16V19H8V5M13,11V13H15V11H13Z",C1="M12,3C10.89,3 10,3.89 10,5H3V19H2V21H22V19H21V5C21,3.89 20.11,3 19,3H12M12,5H19V19H12V5M5,11H7V13H5V11Z",M1="M10 13H8V11H10V13M16 11H14V13H16V11M21 19V21H3V19H4V5C4 3.9 4.9 3 6 3H18C19.1 3 20 3.9 20 5V19H21M11 5H6V19H11V5M18 5H13V19H18V5Z",S1="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z",A1="M7,15H9V18H11V15H13V18H15V15H17V18H19V9H15V6H9V9H5V18H7V15M4.38,3H19.63C20.94,3 22,4.06 22,5.38V19.63A2.37,2.37 0 0,1 19.63,22H4.38C3.06,22 2,20.94 2,19.63V5.38C2,4.06 3.06,3 4.38,3Z",L1="M17.3 5C19 6.5 20 8.6 20 11C20 15.4 16.4 19 12 19S4 15.4 4 11C4 8.6 5.1 6.5 6.7 5H17.3M18 3H6L5.4 3.5C3.2 5.4 2 8.1 2 11C2 16.5 6.5 21 12 21S22 16.5 22 11C22 8.1 20.8 5.4 18.6 3.5L18 3M13 7.5C13 8.3 13.7 9 14.5 9S16 8.3 16 7.5 15.3 6 14.5 6 13 6.7 13 7.5M8 7.5C8 8.3 8.7 9 9.5 9S11 8.3 11 7.5 10.3 6 9.5 6 8 6.7 8 7.5M7 13C8.1 13 9 12.1 9 11C9 9.9 8.1 9 7 9S5 9.9 5 11C5 12.1 5.9 13 7 13M11.5 15C11.5 13.9 10.6 13 9.5 13S7.5 13.9 7.5 15C7.5 16.1 8.4 17 9.5 17S11.5 16.1 11.5 15M12 13C13.1 13 14 12.1 14 11C14 9.9 13.1 9 12 9S10 9.9 10 11C10 12.1 10.9 13 12 13M16.5 15C16.5 13.9 15.6 13 14.5 13S12.5 13.9 12.5 15C12.5 16.1 13.4 17 14.5 17S16.5 16.1 16.5 15M19 11C19 9.9 18.1 9 17 9S15 9.9 15 11C15 12.1 15.9 13 17 13S19 12.1 19 11",Mo="M19.77,7.23L19.78,7.22L16.06,3.5L15,4.56L17.11,6.67C16.17,7.03 15.5,7.93 15.5,9A2.5,2.5 0 0,0 18,11.5C18.36,11.5 18.69,11.42 19,11.29V18.5A1,1 0 0,1 18,19.5A1,1 0 0,1 17,18.5V14A2,2 0 0,0 15,12H14V5A2,2 0 0,0 12,3H6A2,2 0 0,0 4,5V21H14V13.5H15.5V18.5A2.5,2.5 0 0,0 18,21A2.5,2.5 0 0,0 20.5,18.5V9C20.5,8.31 20.22,7.68 19.77,7.23M18,10A1,1 0 0,1 17,9A1,1 0 0,1 18,8A1,1 0 0,1 19,9A1,1 0 0,1 18,10M8,18V13.5H6L10,6V11H12L8,18Z",H1="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z",V1="M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z",So="M19 14V16H16V14.28L19 14M19 13C19 11.9 18 11 16.8 11H10V10H5V21H10V13.91L19 13M5 9H10V7L15.36 5.21C15.74 5.09 16 4.73 16 4.33C16 3.68 15.36 3.23 14.75 3.45L5 7V9Z",T1="M17.81,4.47C17.73,4.47 17.65,4.45 17.58,4.41C15.66,3.42 14,3 12,3C10.03,3 8.15,3.47 6.44,4.41C6.2,4.54 5.9,4.45 5.76,4.21C5.63,3.97 5.72,3.66 5.96,3.53C7.82,2.5 9.86,2 12,2C14.14,2 16,2.47 18.04,3.5C18.29,3.65 18.38,3.95 18.25,4.19C18.16,4.37 18,4.47 17.81,4.47M3.5,9.72C3.4,9.72 3.3,9.69 3.21,9.63C3,9.47 2.93,9.16 3.09,8.93C4.08,7.53 5.34,6.43 6.84,5.66C10,4.04 14,4.03 17.15,5.65C18.65,6.42 19.91,7.5 20.9,8.9C21.06,9.12 21,9.44 20.78,9.6C20.55,9.76 20.24,9.71 20.08,9.5C19.18,8.22 18.04,7.23 16.69,6.54C13.82,5.07 10.15,5.07 7.29,6.55C5.93,7.25 4.79,8.25 3.89,9.5C3.81,9.65 3.66,9.72 3.5,9.72M9.75,21.79C9.62,21.79 9.5,21.74 9.4,21.64C8.53,20.77 8.06,20.21 7.39,19C6.7,17.77 6.34,16.27 6.34,14.66C6.34,11.69 8.88,9.27 12,9.27C15.12,9.27 17.66,11.69 17.66,14.66A0.5,0.5 0 0,1 17.16,15.16A0.5,0.5 0 0,1 16.66,14.66C16.66,12.24 14.57,10.27 12,10.27C9.43,10.27 7.34,12.24 7.34,14.66C7.34,16.1 7.66,17.43 8.27,18.5C8.91,19.66 9.35,20.15 10.12,20.93C10.31,21.13 10.31,21.44 10.12,21.64C10,21.74 9.88,21.79 9.75,21.79M16.92,19.94C15.73,19.94 14.68,19.64 13.82,19.05C12.33,18.04 11.44,16.4 11.44,14.66A0.5,0.5 0 0,1 11.94,14.16A0.5,0.5 0 0,1 12.44,14.66C12.44,16.07 13.16,17.4 14.38,18.22C15.09,18.7 15.92,18.93 16.92,18.93C17.16,18.93 17.56,18.9 17.96,18.83C18.23,18.78 18.5,18.96 18.54,19.24C18.59,19.5 18.41,19.77 18.13,19.82C17.56,19.93 17.06,19.94 16.92,19.94M14.91,22C14.87,22 14.82,22 14.78,22C13.19,21.54 12.15,20.95 11.06,19.88C9.66,18.5 8.89,16.64 8.89,14.66C8.89,13.04 10.27,11.72 11.97,11.72C13.67,11.72 15.05,13.04 15.05,14.66C15.05,15.73 16,16.6 17.13,16.6C18.28,16.6 19.21,15.73 19.21,14.66C19.21,10.89 15.96,7.83 11.96,7.83C9.12,7.83 6.5,9.41 5.35,11.86C4.96,12.67 4.76,13.62 4.76,14.66C4.76,15.44 4.83,16.67 5.43,18.27C5.53,18.53 5.4,18.82 5.14,18.91C4.88,19 4.59,18.87 4.5,18.62C4,17.31 3.77,16 3.77,14.66C3.77,13.46 4,12.37 4.45,11.42C5.78,8.63 8.73,6.82 11.96,6.82C16.5,6.82 20.21,10.33 20.21,14.65C20.21,16.27 18.83,17.59 17.13,17.59C15.43,17.59 14.05,16.27 14.05,14.65C14.05,13.58 13.12,12.71 11.97,12.71C10.82,12.71 9.89,13.58 9.89,14.65C9.89,16.36 10.55,17.96 11.76,19.16C12.71,20.1 13.62,20.62 15.03,21C15.3,21.08 15.45,21.36 15.38,21.62C15.33,21.85 15.12,22 14.91,22Z",P1="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5 14.47C5.06 14.97 5.12 15.47 5.29 15.97C5.43 16.57 5.7 17.17 6 17.7C7.08 19.43 8.95 20.67 10.96 20.92C13.1 21.19 15.39 20.8 17.03 19.32C18.86 17.66 19.5 15 18.56 12.72L18.43 12.46C18.22 12 17.66 11.2 17.66 11.2M14.5 17.5C14.22 17.74 13.76 18 13.4 18.1C12.28 18.5 11.16 17.94 10.5 17.28C11.69 17 12.4 16.12 12.61 15.23C12.78 14.43 12.46 13.77 12.33 13C12.21 12.26 12.23 11.63 12.5 10.94C12.69 11.32 12.89 11.7 13.13 12C13.9 13 15.11 13.44 15.37 14.8C15.41 14.94 15.43 15.08 15.43 15.23C15.46 16.05 15.1 16.95 14.5 17.5H14.5Z",z1="M22,22H2V20H22V22M22,6H2V3H22V6M20,7V19H17V11C17,11 14.5,10 12,10C9.5,10 7,11 7,11V19H4V7H20M14.5,14.67H14.47L14.81,15.22L14.87,15.34C15.29,16.35 15,17.5 14.21,18.24C13.5,18.9 12.5,19.07 11.58,18.95C10.71,18.84 9.9,18.29 9.45,17.53C9.3,17.3 9.19,17.03 9.13,16.77L9,16.11C8.96,15.15 9.34,14.14 10.06,13.54C9.73,14.26 9.81,15.16 10.3,15.79L10.36,15.87C10.44,15.94 10.55,15.97 10.64,15.92C10.73,15.89 10.8,15.8 10.8,15.7L10.76,15.56C10.23,14.17 10.68,12.55 11.79,11.63C12.1,11.38 12.5,11.15 12.87,11.05C12.46,11.87 12.61,12.93 13.25,13.57L14.14,14.3L14.5,14.67M13.11,17.44V17.44C13.37,17.2 13.53,16.8 13.5,16.44V16.25C13.38,15.65 12.85,15.46 12.5,15L12.26,14.55C12.13,14.85 12.12,15.13 12.17,15.46C12.23,15.8 12.37,16.09 12.29,16.44C12.2,16.83 11.9,17.22 11.37,17.35C11.67,17.64 12.15,17.87 12.64,17.71L13.11,17.44Z",D1="M7,2V13H10V22L17,10H13L17,2H7Z",E1="M15,2L17,9H7L9,2M11,10H13V20H16V22H8V20H11V10Z",O1="M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",F1="M7,2H17A2,2 0 0,1 19,4V9H5V4A2,2 0 0,1 7,2M19,19A2,2 0 0,1 17,21V22H15V21H9V22H7V21A2,2 0 0,1 5,19V10H19V19M8,5V7H10V5H8M8,12V15H10V12H8Z",I1="M9,21V22H7V21A2,2 0 0,1 5,19V4A2,2 0 0,1 7,2H17A2,2 0 0,1 19,4V19A2,2 0 0,1 17,21V22H15V21H9M7,4V9H17V4H7M7,19H17V11H7V19M8,12H10V15H8V12M8,6H10V8H8V6Z",B1="M16.5,9L13.5,12L16.5,15H22V9M9,16.5V22H15V16.5L12,13.5M7.5,9H2V15H7.5L10.5,12M15,7.5V2H9V7.5L12,10.5L15,7.5Z",N1="M19,20H17V11H7V20H5V9L12,5L19,9V20M8,12H16V14H8V12M8,15H16V17H8V15M16,18V20H8V18H16Z",j1="M19,20H17V11H7V20H5V9L12,5L19,9V20M8,12H16V14H8V12Z",Ao="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12C20,14.4 19,16.5 17.3,18C15.9,16.7 14,16 12,16C10,16 8.2,16.7 6.7,18C5,16.5 4,14.4 4,12A8,8 0 0,1 12,4M14,5.89C13.62,5.9 13.26,6.15 13.1,6.54L11.81,9.77L11.71,10C11,10.13 10.41,10.6 10.14,11.26C9.73,12.29 10.23,13.45 11.26,13.86C12.29,14.27 13.45,13.77 13.86,12.74C14.12,12.08 14,11.32 13.57,10.76L13.67,10.5L14.96,7.29L14.97,7.26C15.17,6.75 14.92,6.17 14.41,5.96C14.28,5.91 14.15,5.89 14,5.89M10,6A1,1 0 0,0 9,7A1,1 0 0,0 10,8A1,1 0 0,0 11,7A1,1 0 0,0 10,6M7,9A1,1 0 0,0 6,10A1,1 0 0,0 7,11A1,1 0 0,0 8,10A1,1 0 0,0 7,9M17,9A1,1 0 0,0 16,10A1,1 0 0,0 17,11A1,1 0 0,0 18,10A1,1 0 0,0 17,9Z",R1="M12 20H2V18H7.75C7 15.19 4.81 13 2 12.26C2.64 12.1 3.31 12 4 12C8.42 12 12 15.58 12 20M22 12.26C21.36 12.1 20.69 12 20 12C17.07 12 14.5 13.58 13.12 15.93C13.41 16.59 13.65 17.28 13.79 18C13.92 18.65 14 19.32 14 20H22V18H16.24C17 15.19 19.19 13 22 12.26M15.64 11C16.42 8.93 17.87 7.18 19.73 6C15.44 6.16 12 9.67 12 14V14C12.95 12.75 14.2 11.72 15.64 11M11.42 8.85C10.58 6.66 8.88 4.89 6.7 4C8.14 5.86 9 8.18 9 10.71C9 10.92 8.97 11.12 8.96 11.32C9.39 11.56 9.79 11.84 10.18 12.14C10.39 10.96 10.83 9.85 11.42 8.85Z",W1="M8.06,2C7.88,3.17 8.17,4.16 8.95,4.97C9.45,5.47 9.61,6.14 9.42,7H10.41C10.53,6.45 10.55,6 10.45,5.55C10.36,5.13 10.05,4.63 9.5,4.03C9.05,3.47 8.89,2.8 9.05,2H8.06M10.55,2C10.36,3.17 10.66,4.16 11.44,4.97C11.94,5.47 12.09,6.14 11.91,7H12.89C13,6.45 13.03,6 12.94,5.55C12.84,5.13 12.53,4.63 12,4.03C11.53,3.47 11.38,2.8 11.53,2H10.55M13.08,2C12.89,3.17 13.19,4.16 13.97,4.97C14.47,5.47 14.61,6.14 14.39,7H15.42C15.55,6.45 15.56,6 15.47,5.55C15.38,5.13 15.06,4.63 14.53,4.03C14.06,3.47 13.91,2.8 14.06,2H13.08M5,8C5,9.42 5.39,10.7 6.14,11.84C6.87,12.96 7.91,13.85 9.14,14.39L5.16,20.44C5.06,20.56 5,20.75 5,21C5,21.41 5.16,21.69 5.44,21.84C5.56,21.94 5.75,22 6,22C6.41,22 6.69,21.84 6.84,21.56L7.83,19.97H14.2C14.41,20.55 14.79,21.05 15.28,21.42C15.78,21.8 16.36,22 17,22C17.83,22 18.53,21.69 19.13,21.09C19.72,20.5 20,19.8 20,19C20,18.17 19.72,17.47 19.13,16.88C18.53,16.28 17.83,16 17,16C16.36,16 15.78,16.17 15.28,16.55C14.78,16.92 14.42,17.41 14.2,18H9.14L11.11,14.95C11.27,15 11.56,15 12,15C12.44,15 12.73,15 12.89,14.95L13.88,16.5C14.29,15.96 14.84,15.54 15.47,15.28L14.91,14.39C16.03,13.89 17,13 17.79,11.77C18.59,10.5 19,9.27 19,8H5M17,18C17.3,18 17.53,18.09 17.72,18.28C17.91,18.47 18,18.72 18,19C18,19.27 17.91,19.5 17.72,19.71C17.54,19.91 17.28,20 17,20C16.74,20 16.5,19.91 16.29,19.71C16.09,19.5 16,19.26 16,19C16,18.7 16.09,18.47 16.29,18.28C16.5,18.09 16.73,18 17,18Z",Z1="M2 19.63L13.43 8.2L12.72 7.5L14.14 6.07L12 3.89C13.2 2.7 15.09 2.7 16.27 3.89L19.87 7.5L18.45 8.91H21.29L22 9.62L18.45 13.21L17.74 12.5V9.62L16.27 11.04L15.56 10.33L4.13 21.76L2 19.63Z",K1="M12 4A3.5 3.5 0 0 0 8.5 7.5H10.5A1.5 1.5 0 0 1 12 6A1.5 1.5 0 0 1 13.5 7.5A1.5 1.5 0 0 1 12 9C11.45 9 11 9.45 11 10V11.75L2.4 18.2A1 1 0 0 0 3 20H21A1 1 0 0 0 21.6 18.2L13 11.75V10.85A3.5 3.5 0 0 0 15.5 7.5A3.5 3.5 0 0 0 12 4M12 13.5L18 18H6Z",q1="M12,1C7,1 3,5 3,10V17A3,3 0 0,0 6,20H9V12H5V10A7,7 0 0,1 12,3A7,7 0 0,1 19,10V12H15V20H18A3,3 0 0,0 21,17V10C21,5 16.97,1 12,1Z",G1="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M12.75 7.08C13.57 7.2 14.32 7.5 14.95 8L12.75 10.19V7.08M11.25 7.08V10.19L9.05 8C9.68 7.5 10.43 7.2 11.25 7.08M8 9.05L10.19 11.25H7.08C7.2 10.43 7.5 9.68 8 9.05M7.08 12.75H10.19L8 14.95C7.5 14.32 7.2 13.57 7.08 12.75M11.25 16.92C10.43 16.8 9.68 16.5 9.05 16L11.25 13.81V16.92M12 13C11.45 13 11 12.55 11 12S11.45 11 12 11 13 11.45 13 12 12.55 13 12 13M12.75 16.92V13.81L14.95 16C14.32 16.5 13.57 16.8 12.75 16.92M16 14.95L13.81 12.75H16.92C16.8 13.57 16.5 14.32 16 14.95M13.81 11.25L16 9.05C16.5 9.69 16.8 10.44 16.92 11.25H13.81Z",U1="M19 17C20.21 17 22 16.2 22 14S20.21 11 19 11H17V9H19C21.2 9 22 7.21 22 6C22 3.8 20.21 3 19 3H17V2H16V3H8V2H7V3H2V5H7V7H5C3.79 7 2 7.8 2 10S3.79 13 5 13H7V15H5C3.79 15 2 15.8 2 18S3.79 21 5 21H7V22H8V21H16V22H17V21H22V19H17V17H19M19 13C19.45 13 20 13.19 20 14S19.45 15 19 15H17V13H19M16 11H8V9H16V11M19 5C19.45 5 20 5.2 20 6C20 6.45 19.81 7 19 7H17V5H19M8 5H16V7H8V5M5 11C4.55 11 4 10.81 4 10S4.55 9 5 9H7V11H5M8 13H16V15H8V13M5 19C4.55 19 4 18.81 4 18S4.55 17 5 17H7V19H5M16 19H8V17H16V19Z",Y1="M15.07,11.25L14.17,12.17C13.45,12.89 13,13.5 13,15H11V14.5C11,13.39 11.45,12.39 12.17,11.67L13.41,10.41C13.78,10.05 14,9.55 14,9C14,7.89 13.1,7 12,7A2,2 0 0,0 10,9H8A4,4 0 0,1 12,5A4,4 0 0,1 16,9C16,9.88 15.64,10.67 15.07,11.25M13,19H11V17H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z",Q1="M13.5,8H12V13L16.28,15.54L17,14.33L13.5,12.25V8M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3",X1="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z",J1="M21.8,13H20V21H13V17.67L15.79,14.88L16.5,15C17.66,15 18.6,14.06 18.6,12.9C18.6,11.74 17.66,10.8 16.5,10.8A2.1,2.1 0 0,0 14.4,12.9L14.5,13.61L13,15.13V9.65C13.66,9.29 14.1,8.6 14.1,7.8A2.1,2.1 0 0,0 12,5.7A2.1,2.1 0 0,0 9.9,7.8C9.9,8.6 10.34,9.29 11,9.65V15.13L9.5,13.61L9.6,12.9A2.1,2.1 0 0,0 7.5,10.8A2.1,2.1 0 0,0 5.4,12.9A2.1,2.1 0 0,0 7.5,15L8.21,14.88L11,17.67V21H4V13H2.25C1.83,13 1.42,13 1.42,12.79C1.43,12.57 1.85,12.15 2.28,11.72L11,3C11.33,2.67 11.67,2.33 12,2.33C12.33,2.33 12.67,2.67 13,3L17,7V6H19V9L21.78,11.78C22.18,12.18 22.59,12.59 22.6,12.8C22.6,13 22.2,13 21.8,13M7.5,12A0.9,0.9 0 0,1 8.4,12.9A0.9,0.9 0 0,1 7.5,13.8A0.9,0.9 0 0,1 6.6,12.9A0.9,0.9 0 0,1 7.5,12M16.5,12C17,12 17.4,12.4 17.4,12.9C17.4,13.4 17,13.8 16.5,13.8A0.9,0.9 0 0,1 15.6,12.9A0.9,0.9 0 0,1 16.5,12M12,6.9C12.5,6.9 12.9,7.3 12.9,7.8C12.9,8.3 12.5,8.7 12,8.7C11.5,8.7 11.1,8.3 11.1,7.8C11.1,7.3 11.5,6.9 12,6.9Z",ep="M7,4A2,2 0 0,1 9,6A2,2 0 0,1 7,8A2,2 0 0,1 5,6A2,2 0 0,1 7,4M11.15,12H22V20A2,2 0 0,1 20,22H4A2,2 0 0,1 2,20V12H5V11.25C5,10 6,9 7.25,9H7.28C7.62,9 7.95,9.09 8.24,9.23C8.5,9.35 8.74,9.5 8.93,9.73L10.33,11.28C10.56,11.54 10.84,11.78 11.15,12M7,20V14H5V20H7M11,20V14H9V20H11M15,20V14H13V20H15M19,20V14H17V20H19M18.65,5.86C19.68,6.86 20.16,8.21 19.95,9.57L19.89,10H18L18.09,9.41C18.24,8.62 18,7.83 17.42,7.21L17.35,7.15C16.32,6.14 15.85,4.79 16.05,3.43L16.11,3H18L17.91,3.59C17.76,4.38 18,5.17 18.58,5.79L18.65,5.86M14.65,5.86C15.68,6.86 16.16,8.21 15.95,9.57L15.89,10H14L14.09,9.41C14.24,8.62 14,7.83 13.42,7.21L13.35,7.15C12.32,6.14 11.85,4.79 12.05,3.43L12.11,3H14L13.91,3.59C13.76,4.38 14,5.17 14.58,5.79L14.65,5.86Z",tp="M8.58 14C8.3 13.55 8.11 13.03 8.06 12.5H15.94C15.89 13.03 15.7 13.55 15.47 14H8.58M12 16C10.97 16 10.08 15.61 9.38 15H14.63C13.92 15.61 13.03 16 12 16M12 8C13.03 8 13.92 8.39 14.63 9H9.38C10.08 8.39 10.97 8 12 8M8.58 10H15.42C15.7 10.45 15.89 10.97 15.94 11.5H8.06C8.11 10.97 8.3 10.45 8.58 10M3 3V21H21V3H3M12 18C8.67 18 6 15.33 6 12S8.67 6 12 6 18 8.67 18 12 15.33 18 12 18Z",ip="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",rp="M21 6C19.34 6 18 7.34 18 9V13C18 13.55 17.55 14 17 14V10C17 8.34 15.66 7 14 7H10C8.34 7 7 8.34 7 10H9C9 9.45 9.45 9 10 9H14C14.55 9 15 9.45 15 10V11H6C3.79 11 2 12.79 2 15V18H17V16C18.66 16 20 14.66 20 13V9C20 8.45 20.45 8 21 8H22V6H21Z",np="M12.5,3C7.81,3 4,5.69 4,9V9C4,10.19 4.5,11.34 5.44,12.33C4.53,13.5 4,14.96 4,16.5C4,17.64 4,18.83 4,20C4,21.11 4.89,22 6,22H19C20.11,22 21,21.11 21,20C21,18.85 21,17.61 21,16.5C21,15.28 20.66,14.07 20,13L22,11L19,8L16.9,10.1C15.58,9.38 14.05,9 12.5,9C10.65,9 8.95,9.53 7.55,10.41C7.19,9.97 7,9.5 7,9C7,7.21 9.46,5.75 12.5,5.75V5.75C13.93,5.75 15.3,6.08 16.33,6.67L18.35,4.65C16.77,3.59 14.68,3 12.5,3M12.5,11C12.84,11 13.17,11.04 13.5,11.09C10.39,11.57 8,14.25 8,17.5V20H6V17.5A6.5,6.5 0 0,1 12.5,11Z",ap="M7 14C5.9 14 5 13.1 5 12S5.9 10 7 10 9 10.9 9 12 8.1 14 7 14M12.6 10C11.8 7.7 9.6 6 7 6C3.7 6 1 8.7 1 12S3.7 18 7 18C9.6 18 11.8 16.3 12.6 14H16V18H20V14H23V10H12.6Z",op="M8,2H16L20,14H4L8,2M11,15H13V20H18V22H6V20H11V15Z",sp="M10,2C8.89,2 8,2.89 8,4V7C8,8.11 8.89,9 10,9H11V11H2V13H6V15H5C3.89,15 3,15.89 3,17V20C3,21.11 3.89,22 5,22H9C10.11,22 11,21.11 11,20V17C11,15.89 10.11,15 9,15H8V13H16V15H15C13.89,15 13,15.89 13,17V20C13,21.11 13.89,22 15,22H19C20.11,22 21,21.11 21,20V17C21,15.89 20.11,15 19,15H18V13H22V11H13V9H14C15.11,9 16,8.11 16,7V4C16,2.89 15.11,2 14,2H10M10,4H14V7H10V4M5,17H9V20H5V17M15,17H19V20H15V17Z",lp="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z",cp="M2.81,8.46L14.83,20.5L15.54,19.78L16.95,21.19L18.36,19.78L16.95,18.36L18.36,16.95L19.78,18.36L21.19,16.95L19.78,15.54L20.5,14.83L8.46,2.81L2.81,8.46M5.64,8.46L8.46,5.64L17.66,14.83L14.83,17.66L5.64,8.46M7.05,8.46L8.46,9.88L9.88,8.46L8.46,7.05L7.05,8.46M9.17,10.59L10.59,12L12,10.59L10.59,9.17L9.17,10.59M11.29,12.71L12.71,14.12L14.12,12.71L12.71,11.29L11.29,12.71M13.41,14.83L14.83,16.24L16.24,14.83L14.83,13.41L13.41,14.83Z",dp="M2.95 3L2 6.91L19.34 11.25L20.29 7.34L2.95 3M6.09 6.89L4.16 6.41L4.64 4.46L6.57 4.94L6.09 6.89M9.94 7.86L8 7.38L8.5 5.42L10.42 5.91L9.94 7.86M13.8 8.82L11.87 8.34L12.35 6.39L14.27 6.87L13.8 8.82M17.65 9.79L15.72 9.31L16.2 7.35L18.13 7.84L17.65 9.79M4.66 12.75L3.71 16.66L21.05 21L22 17.1L4.66 12.75M7.8 16.65L5.88 16.16L6.35 14.21L8.28 14.69L7.8 16.65M11.65 17.61L9.73 17.13L10.2 15.18L12.13 15.66L11.65 17.61M15.5 18.58L13.58 18.09L14.06 16.14L16 16.62L15.5 18.58M19.36 19.54L17.43 19.06L17.91 17.11L19.84 17.59L19.36 19.54M6.25 12.11L11 10.2L17.75 11.89L13 13.8L6.25 12.11Z",pp="M8 6V18H16V6H8M14 10H10V8H14V10M19.4 1.6C19 1.2 18.5 1 18 1H6C5.5 1 5 1.2 4.6 1.6C4.2 2 4 2.5 4 3V21C4 21.5 4.2 22 4.6 22.4C5 22.8 5.5 23 6 23H18C18.5 23 19 22.8 19.4 22.4C19.8 22 20 21.5 20 21V3C20 2.5 19.8 2 19.4 1.6M18 21H6V3H18V21Z",up="M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z",hp="M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2M9,21V20H15V21A1,1 0 0,1 14,22H10A1,1 0 0,1 9,21M12,4A5,5 0 0,0 7,9C7,11.05 8.23,12.81 10,13.58V16H14V13.58C15.77,12.81 17,11.05 17,9A5,5 0 0,0 12,4Z",gp="M11 15H6L13 1V9H18L11 23V15Z",mp="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z",bp="M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17Z",fp="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.58L17 17L22 12M4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z",vp="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",yp="M12 2C7.04 2 3 6.04 3 11C3 14.91 5.5 18.24 9 19.47V22H11V19.94C11.33 20 11.66 20 12 20S12.67 20 13 19.94V22H15V19.47C18.5 18.23 21 14.9 21 11C21 6.04 16.96 2 12 2M14.25 14L11.25 17L9.75 15.5L11 14.25L9.75 13L12.75 10L14.25 11.5L13 12.75L14.25 14M16 9H8V7H16V9Z",xp="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z",wp="M4,5A2,2 0 0,0 2,7V17A2,2 0 0,0 4,19H20A2,2 0 0,0 22,17V7A2,2 0 0,0 20,5H4M4,7H16V17H4V7M19,7A1,1 0 0,1 20,8A1,1 0 0,1 19,9A1,1 0 0,1 18,8A1,1 0 0,1 19,7M13,9V15H15V9H13M19,11A1,1 0 0,1 20,12A1,1 0 0,1 19,13A1,1 0 0,1 18,12A1,1 0 0,1 19,11Z",_p="M19,13H5V11H19V13Z",$p="M5,7A2,2 0 0,0 3,9V15A2,2 0 0,0 5,17H8V15H5V9H8V7H5M11,7A2,2 0 0,0 9,9V15A2,2 0 0,0 11,17H13A2,2 0 0,0 15,15V9A2,2 0 0,0 13,7H11M11,9H13V15H11V9M16,10.5V12H19V13.5H17.5A1.5,1.5 0 0,0 16,15V18H20.5V16.5H17.5V15H19A1.5,1.5 0 0,0 20.5,13.5V12A1.5,1.5 0 0,0 19,10.5H16Z",kp="M10,0.2C9,0.2 8.2,1 8.2,2C8.2,3 9,3.8 10,3.8C11,3.8 11.8,3 11.8,2C11.8,1 11,0.2 10,0.2M15.67,1A7.33,7.33 0 0,0 23,8.33V7A6,6 0 0,1 17,1H15.67M18.33,1C18.33,3.58 20.42,5.67 23,5.67V4.33C21.16,4.33 19.67,2.84 19.67,1H18.33M21,1A2,2 0 0,0 23,3V1H21M7.92,4.03C7.75,4.03 7.58,4.06 7.42,4.11L2,5.8V11H3.8V7.33L5.91,6.67L2,22H3.8L6.67,13.89L9,17V22H10.8V15.59L8.31,11.05L9.04,8.18L10.12,10H15V8.2H11.38L9.38,4.87C9.08,4.37 8.54,4.03 7.92,4.03Z",Cp="M17.42,10L13.41,6H9V8H12.59L14.59,10H6.5C4,10 2,12 2,14.5C2,17 4,19 6.5,19C8.72,19 10.56,17.38 10.92,15.27L13.04,14C13,14.17 13,14.33 13,14.5C13,17 15,19 17.5,19C20,19 22,17 22,14.5C22,12 20,10 17.5,10M8.84,15.26C8.5,16.27 7.58,17 6.47,17C5.09,17 3.97,15.88 3.97,14.5C3.97,13.12 5.09,12 6.47,12C7.59,12 8.5,12.74 8.84,13.75H6V15.25L8.84,15.26M17.47,17C16.09,17 14.97,15.88 14.97,14.5C14.97,13.12 16.09,12 17.47,12A2.5,2.5 0 0,1 19.97,14.5A2.5,2.5 0 0,1 17.47,17Z",Mp="M18,4L20,8H17L15,4H13L15,8H12L10,4H8L10,8H7L5,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V4H18Z",Sp="M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z",Ap="M4,5C2.89,5 2,5.89 2,7V17C2,18.11 2.89,19 4,19H20C21.11,19 22,18.11 22,17V7C22,5.89 21.11,5 20,5H4M4.5,7A1,1 0 0,1 5.5,8A1,1 0 0,1 4.5,9A1,1 0 0,1 3.5,8A1,1 0 0,1 4.5,7M7,7H20V17H7V7M8,8V16H11V8H8M12,8V16H15V8H12M16,8V16H19V8H16M9,9H10V10H9V9M13,9H14V10H13V9M17,9H18V10H17V9Z",Lp="M17,3A2,2 0 0,1 19,5V15A2,2 0 0,1 17,17H13V19H14A1,1 0 0,1 15,20H22V22H15A1,1 0 0,1 14,23H10A1,1 0 0,1 9,22H2V20H9A1,1 0 0,1 10,19H11V17H7C5.89,17 5,16.1 5,15V5A2,2 0 0,1 7,3H17Z",Lo="M15 22H13C11.9 22 11 21.1 11 20V15H17V20C17 21.1 16.1 22 15 22M7 14H21L15 9.71V6C15 4.39 13.94 2 11 2S7 4.39 7 6C7 6.45 6.81 7 6 7H5V3H3V12H5V9H6C8.2 9 9 7.21 9 6C9 5.67 9.1 4 11 4C12.83 4 13 5.54 13 6V9.71L7 14Z",Hp="M14,19H18V5H14M6,19H10V5H6V19Z",Vp="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z",Tp="M22,14H20V16H14V13H16V11H14V6A2,2 0 0,0 12,4H4V2H2V10H4V8H10V11H8V13H10V18A2,2 0 0,0 12,20H20V22H22",Pp="M8,5.14V19.14L19,12.14L8,5.14Z",zp="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",Dp="M2,15C3.67,14.25 5.33,13.5 7,13.17V5A3,3 0 0,1 10,2C11.31,2 12.42,2.83 12.83,4H10A1,1 0 0,0 9,5V6H14V5A3,3 0 0,1 17,2C18.31,2 19.42,2.83 19.83,4H17A1,1 0 0,0 16,5V14.94C18,14.62 20,13 22,13V15C19.78,15 17.56,17 15.33,17C13.11,17 10.89,15 8.67,15C6.44,15 4.22,16 2,17V15M14,8H9V10H14V8M14,12H9V13C10.67,13.16 12.33,14.31 14,14.79V12M2,19C4.22,18 6.44,17 8.67,17C10.89,17 13.11,19 15.33,19C17.56,19 19.78,17 22,17V19C19.78,19 17.56,21 15.33,21C13.11,21 10.89,19 8.67,19C6.44,19 4.22,20 2,21V19Z",Ep="M19 19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V12H3V10H21V12H19V19Z",Op="M19 19C19 20.11 18.11 21 17 21H7C5.9 21 5 20.11 5 19V12H3V10H21V12H19M8 1.5C6.15 1.5 4.65 3 4.65 4.85C4.65 6.7 6.15 8.2 8 8.2H9.53C9.92 8.2 10.29 8.3 10.61 8.5H12.63C12.05 7.45 10.86 6.75 9.53 6.75H8C7 6.75 6.15 5.77 6.15 4.75C6.15 3.73 7 3 8 3M12.85 2C12.85 3 12 3.85 11 3.85V5.35C12.92 5.35 14.5 6.7 14.89 8.5H16.42C16.12 6.67 14.96 5.15 13.35 4.38C13.97 3.77 14.35 2.93 14.35 2Z",Fp="M8 1.5C6.15 1.5 4.65 3 4.65 4.85C4.65 6.7 6.15 8.2 8 8.2H9.53C9.92 8.2 10.29 8.3 10.61 8.5H12.63C12.05 7.45 10.86 6.75 9.53 6.75H8C7 6.75 6.15 5.77 6.15 4.75C6.15 3.73 7 3 8 3V1.5M12.85 2C12.85 3 12 3.85 11 3.85V5.35C12.92 5.35 14.5 6.7 14.89 8.5H16.42C16.12 6.67 14.96 5.15 13.35 4.38C13.97 3.77 14.35 2.93 14.35 2H12.85M3 10V12H5V19C5 20.11 5.9 21 7 21H17C18.11 21 19 20.11 19 19V12H21V10H3M7 12H17V19H7V12Z",Ip="M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13",Bp="M16,7V3H14V7H10V3H8V7H8C7,7 6,8 6,9V14.5L9.5,18V21H14.5V18L18,14.5V9C18,8 17,7 16,7Z",Np="M15,15H17V11H15M7,15H9V11H7M11,13H13V9H11M8.83,7H15.2L19,10.8V17H5V10.8M8,5L3,10V19H21V10L16,5H8Z",jp="M7.95,3L6.53,5.19L7.95,7.4H7.94L5.95,10.5L4.22,9.6L5.64,7.39L4.22,5.19L6.22,2.09L7.95,3M13.95,2.89L12.53,5.1L13.95,7.3L13.94,7.31L11.95,10.4L10.22,9.5L11.64,7.3L10.22,5.1L12.22,2L13.95,2.89M20,2.89L18.56,5.1L20,7.3V7.31L18,10.4L16.25,9.5L17.67,7.3L16.25,5.1L18.25,2L20,2.89M2,22V14A2,2 0 0,1 4,12H20A2,2 0 0,1 22,14V22H20V20H4V22H2M6,14A1,1 0 0,0 5,15V17A1,1 0 0,0 6,18A1,1 0 0,0 7,17V15A1,1 0 0,0 6,14M10,14A1,1 0 0,0 9,15V17A1,1 0 0,0 10,18A1,1 0 0,0 11,17V15A1,1 0 0,0 10,14M14,14A1,1 0 0,0 13,15V17A1,1 0 0,0 14,18A1,1 0 0,0 15,17V15A1,1 0 0,0 14,14M18,14A1,1 0 0,0 17,15V17A1,1 0 0,0 18,18A1,1 0 0,0 19,17V15A1,1 0 0,0 18,14Z",Rp="M20,12H4A2,2 0 0,0 2,14V22H4V20H20V22H22V14A2,2 0 0,0 20,12M7,17A1,1 0 0,1 6,18A1,1 0 0,1 5,17V15A1,1 0 0,1 6,14A1,1 0 0,1 7,15V17M11,17A1,1 0 0,1 10,18A1,1 0 0,1 9,17V15A1,1 0 0,1 10,14A1,1 0 0,1 11,15V17M15,17A1,1 0 0,1 14,18A1,1 0 0,1 13,17V15A1,1 0 0,1 14,14A1,1 0 0,1 15,15V17M19,17A1,1 0 0,1 18,18A1,1 0 0,1 17,17V15A1,1 0 0,1 18,14A1,1 0 0,1 19,15V17Z",Wp="M20,6A2,2 0 0,1 22,8V20A2,2 0 0,1 20,22H4A2,2 0 0,1 2,20V8C2,7.15 2.53,6.42 3.28,6.13L15.71,1L16.47,2.83L8.83,6H20M20,8H4V12H16V10H18V12H20V8M7,14A3,3 0 0,0 4,17A3,3 0 0,0 7,20A3,3 0 0,0 10,17A3,3 0 0,0 7,14Z",Zp="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z",Kp="M20 19V3H4V19H2V21H22V19H20M6 19V13H11V14.8C10.6 15.1 10.2 15.6 10.2 16.2C10.2 17.2 11 18 12 18S13.8 17.2 13.8 16.2C13.8 15.6 13.5 15.1 13 14.8V13H18V19H6Z",qp="M20.2,5.9L21,5.1C19.6,3.7 17.8,3 16,3C14.2,3 12.4,3.7 11,5.1L11.8,5.9C13,4.8 14.5,4.2 16,4.2C17.5,4.2 19,4.8 20.2,5.9M19.3,6.7C18.4,5.8 17.2,5.3 16,5.3C14.8,5.3 13.6,5.8 12.7,6.7L13.5,7.5C14.2,6.8 15.1,6.5 16,6.5C16.9,6.5 17.8,6.8 18.5,7.5L19.3,6.7M19,13H17V9H15V13H5A2,2 0 0,0 3,15V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V15A2,2 0 0,0 19,13M8,18H6V16H8V18M11.5,18H9.5V16H11.5V18M15,18H13V16H15V18Z",Gp="M7.82 19H15V18C15 15.79 16.79 14 19 14H19.74L17.84 5.56C17.63 4.65 16.82 4 15.89 4H12V6H15.89L17.29 12.25H17.28C15.12 12.9 13.47 14.73 13.09 17H7.82C7.34 15.66 5.96 14.76 4.4 15.06C3.22 15.29 2.27 16.26 2.05 17.44C1.7 19.34 3.16 21 5 21C6.3 21 7.4 20.16 7.82 19M5 19C4.45 19 4 18.55 4 18S4.45 17 5 17 6 17.45 6 18 5.55 19 5 19M19 15C17.34 15 16 16.34 16 18S17.34 21 19 21 22 19.66 22 18 20.66 15 19 15M19 19C18.45 19 18 18.55 18 18S18.45 17 19 17 20 17.45 20 18 19.55 19 19 19Z",Up="M4,1H20A1,1 0 0,1 21,2V6A1,1 0 0,1 20,7H4A1,1 0 0,1 3,6V2A1,1 0 0,1 4,1M4,9H20A1,1 0 0,1 21,10V14A1,1 0 0,1 20,15H4A1,1 0 0,1 3,14V10A1,1 0 0,1 4,9M4,17H20A1,1 0 0,1 21,18V22A1,1 0 0,1 20,23H4A1,1 0 0,1 3,22V18A1,1 0 0,1 4,17M9,5H10V3H9V5M9,13H10V11H9V13M9,21H10V19H9V21M5,3V5H7V3H5M5,11V13H7V11H5M5,19V21H7V19H5Z",Yp="M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z",Qp="M11,13H13V16H16V11H18L12,6L6,11H8V16H11V13M12,1L21,5V11C21,16.55 17.16,21.74 12,23C6.84,21.74 3,16.55 3,11V5L12,1Z",Xp="M21,14V15C21,16.91 19.93,18.57 18.35,19.41L19,22H17L16.5,20C16.33,20 16.17,20 16,20H8C7.83,20 7.67,20 7.5,20L7,22H5L5.65,19.41C4.07,18.57 3,16.91 3,15V14H2V12H20V5A1,1 0 0,0 19,4C18.5,4 18.12,4.34 18,4.79C18.63,5.33 19,6.13 19,7H13A3,3 0 0,1 16,4C16.06,4 16.11,4 16.17,4C16.58,2.84 17.69,2 19,2A3,3 0 0,1 22,5V14H21V14M19,14H5V15A3,3 0 0,0 8,18H16A3,3 0 0,0 19,15V14Z",Jp="M16,18H18V6H16M6,18L14.5,12L6,6V18Z",eu="M6,18V6H8V18H6M9.5,12L18,6V18L9.5,12Z",tu="M12,18A6,6 0 0,0 18,12C18,8.68 15.31,6 12,6C8.68,6 6,8.68 6,12A6,6 0 0,0 12,18M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H19M8,12A4,4 0 0,1 12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12Z",iu="M20.79,13.95L18.46,14.57L16.46,13.44V10.56L18.46,9.43L20.79,10.05L21.31,8.12L19.54,7.65L20,5.88L18.07,5.36L17.45,7.69L15.45,8.82L13,7.38V5.12L14.71,3.41L13.29,2L12,3.29L10.71,2L9.29,3.41L11,5.12V7.38L8.5,8.82L6.5,7.69L5.92,5.36L4,5.88L4.47,7.65L2.7,8.12L3.22,10.05L5.55,9.43L7.55,10.56V13.45L5.55,14.58L3.22,13.96L2.7,15.89L4.47,16.36L4,18.12L5.93,18.64L6.55,16.31L8.55,15.18L11,16.62V18.88L9.29,20.59L10.71,22L12,20.71L13.29,22L14.7,20.59L13,18.88V16.62L15.5,15.17L17.5,16.3L18.12,18.63L20,18.12L19.53,16.35L21.3,15.88L20.79,13.95M9.5,10.56L12,9.11L14.5,10.56V13.44L12,14.89L9.5,13.44V10.56Z",ru="M4,2H20A2,2 0 0,1 22,4V14A2,2 0 0,1 20,16H15V20H18V22H13V16H11V22H6V20H9V16H4A2,2 0 0,1 2,14V4A2,2 0 0,1 4,2M4,4V8H11V4H4M4,14H11V10H4V14M20,14V10H13V14H20M20,4H13V8H20V4Z",nu="M11.45,2V5.55L15,3.77L11.45,2M10.45,8L8,10.46L11.75,11.71L10.45,8M2,11.45L3.77,15L5.55,11.45H2M10,2H2V10C2.57,10.17 3.17,10.25 3.77,10.25C7.35,10.26 10.26,7.35 10.27,3.75C10.26,3.16 10.17,2.57 10,2M17,22V16H14L19,7V13H22L17,22Z",au="M12,12A3,3 0 0,0 9,15A3,3 0 0,0 12,18A3,3 0 0,0 15,15A3,3 0 0,0 12,12M12,20A5,5 0 0,1 7,15A5,5 0 0,1 12,10A5,5 0 0,1 17,15A5,5 0 0,1 12,20M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8C10.89,8 10,7.1 10,6C10,4.89 10.89,4 12,4M17,2H7C5.89,2 5,2.89 5,4V20A2,2 0 0,0 7,22H17A2,2 0 0,0 19,20V4C19,2.89 18.1,2 17,2Z",ou="M20.07,19.07L18.66,17.66C20.11,16.22 21,14.21 21,12C21,9.78 20.11,7.78 18.66,6.34L20.07,4.93C21.88,6.74 23,9.24 23,12C23,14.76 21.88,17.26 20.07,19.07M17.24,16.24L15.83,14.83C16.55,14.11 17,13.11 17,12C17,10.89 16.55,9.89 15.83,9.17L17.24,7.76C18.33,8.85 19,10.35 19,12C19,13.65 18.33,15.15 17.24,16.24M4,3H12A2,2 0 0,1 14,5V19A2,2 0 0,1 12,21H4A2,2 0 0,1 2,19V5A2,2 0 0,1 4,3M8,5A2,2 0 0,0 6,7A2,2 0 0,0 8,9A2,2 0 0,0 10,7A2,2 0 0,0 8,5M8,11A4,4 0 0,0 4,15A4,4 0 0,0 8,19A4,4 0 0,0 12,15A4,4 0 0,0 8,11M8,13A2,2 0 0,1 10,15A2,2 0 0,1 8,17A2,2 0 0,1 6,15A2,2 0 0,1 8,13Z",su="M17.9,10.9C14.7,9 9.35,8.8 6.3,9.75C5.8,9.9 5.3,9.6 5.15,9.15C5,8.65 5.3,8.15 5.75,8C9.3,6.95 15.15,7.15 18.85,9.35C19.3,9.6 19.45,10.2 19.2,10.65C18.95,11 18.35,11.15 17.9,10.9M17.8,13.7C17.55,14.05 17.1,14.2 16.75,13.95C14.05,12.3 9.95,11.8 6.8,12.8C6.4,12.9 5.95,12.7 5.85,12.3C5.75,11.9 5.95,11.45 6.35,11.35C10,10.25 14.5,10.8 17.6,12.7C17.9,12.85 18.05,13.35 17.8,13.7M16.6,16.45C16.4,16.75 16.05,16.85 15.75,16.65C13.4,15.2 10.45,14.9 6.95,15.7C6.6,15.8 6.3,15.55 6.2,15.25C6.1,14.9 6.35,14.6 6.65,14.5C10.45,13.65 13.75,14 16.35,15.6C16.7,15.75 16.75,16.15 16.6,16.45M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",lu="M2,6L7.09,8.55C6.4,9.5 6,10.71 6,12C6,13.29 6.4,14.5 7.09,15.45L2,18V6M6,3H18L15.45,7.09C14.5,6.4 13.29,6 12,6C10.71,6 9.5,6.4 8.55,7.09L6,3M22,6V18L16.91,15.45C17.6,14.5 18,13.29 18,12C18,10.71 17.6,9.5 16.91,8.55L22,6M18,21H6L8.55,16.91C9.5,17.6 10.71,18 12,18C13.29,18 14.5,17.6 15.45,16.91L18,21M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10Z",cu="M11 7H13V9H11V7M5 22H9V10H5V22M14 11H16V9H14V11M17 10H19V8H17V10M17 5V7H19V5H17M14 8H16V6H14V8M17 13H19V11H17V13M5 7H5.33L6 9H8L8.67 7H9V6H5V7Z",du="M18,18H6V6H18V18Z",pu="M6,14H8L11,17H9L6,14M4,4H5V3A1,1 0 0,1 6,2H10A1,1 0 0,1 11,3V4H13V3A1,1 0 0,1 14,2H18A1,1 0 0,1 19,3V4H20A2,2 0 0,1 22,6V19A2,2 0 0,1 20,21V22H17V21H7V22H4V21A2,2 0 0,1 2,19V6A2,2 0 0,1 4,4M18,7A1,1 0 0,1 19,8A1,1 0 0,1 18,9A1,1 0 0,1 17,8A1,1 0 0,1 18,7M14,7A1,1 0 0,1 15,8A1,1 0 0,1 14,9A1,1 0 0,1 13,8A1,1 0 0,1 14,7M20,6H4V10H20V6M4,19H20V12H4V19M6,7A1,1 0 0,1 7,8A1,1 0 0,1 6,9A1,1 0 0,1 5,8A1,1 0 0,1 6,7M13,14H15L18,17H16L13,14Z",uu="M12,18A6,6 0 0,1 6,12C6,11 6.25,10.03 6.7,9.2L5.24,7.74C4.46,8.97 4,10.43 4,12A8,8 0 0,0 12,20V23L16,19L12,15M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12C18,13 17.75,13.97 17.3,14.8L18.76,16.26C19.54,15.03 20,13.57 20,12A8,8 0 0,0 12,4Z",hu="M19,18H5V6H19M21,4H3C1.89,4 1,4.89 1,6V18A2,2 0 0,0 3,20H21A2,2 0 0,0 23,18V6C23,4.89 22.1,4 21,4Z",gu="M21,17H3V5H21M21,3H3A2,2 0 0,0 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,0 23,17V5A2,2 0 0,0 21,3Z",Ho="M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z",mu="M17 3H21V5H17V3M17 7H21V9H17V7M17 11H21V13H17.75L17 12.1V11M21 15V17H19C19 16.31 18.9 15.63 18.71 15H21M7 3V5H3V3H7M7 7V9H3V7H7M7 11V12.1L6.25 13H3V11H7M3 15H5.29C5.1 15.63 5 16.31 5 17H3V15M15 13V5C15 3.34 13.66 2 12 2S9 3.34 9 5V13C6.79 14.66 6.34 17.79 8 20S12.79 22.66 15 21 17.66 16.21 16 14C15.72 13.62 15.38 13.28 15 13M12 4C12.55 4 13 4.45 13 5V8H11V5C11 4.45 11.45 4 12 4Z",bu="M16.95,16.95L14.83,14.83C15.55,14.1 16,13.1 16,12C16,11.26 15.79,10.57 15.43,10L17.6,7.81C18.5,9 19,10.43 19,12C19,13.93 18.22,15.68 16.95,16.95M12,5C13.57,5 15,5.5 16.19,6.4L14,8.56C13.43,8.21 12.74,8 12,8A4,4 0 0,0 8,12C8,13.1 8.45,14.1 9.17,14.83L7.05,16.95C5.78,15.68 5,13.93 5,12A7,7 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z",fu="M19.03 7.39L20.45 5.97C20 5.46 19.55 5 19.04 4.56L17.62 6C16.07 4.74 14.12 4 12 4C7.03 4 3 8.03 3 13S7.03 22 12 22C17 22 21 17.97 21 13C21 10.88 20.26 8.93 19.03 7.39M13 14H11V7H13V14M15 1H9V3H15V1Z",vu="M21 11A2 2 0 0 0 19 9H5A2 2 0 0 0 3 11H2V13H3V20H21V13H22V11M17 15A2 2 0 1 1 19 13A2 2 0 0 1 17 15M18 8H6C6.33 5.75 8.88 4 12 4S17.63 5.75 18 8Z",Vo="M4,5A2,2 0 0,0 2,7V17A2,2 0 0,0 4,19H20A2,2 0 0,0 22,17V7A2,2 0 0,0 20,5H4M4,7H16V17H4V7M19,7A1,1 0 0,1 20,8A1,1 0 0,1 19,9A1,1 0 0,1 18,8A1,1 0 0,1 19,7M6,9V11H14V9H6M19,11A1,1 0 0,1 20,12A1,1 0 0,1 19,13A1,1 0 0,1 18,12A1,1 0 0,1 19,11Z",yu="M17,7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7M17,15A3,3 0 0,1 14,12A3,3 0 0,1 17,9A3,3 0 0,1 20,12A3,3 0 0,1 17,15Z",xu="M9,22H17V19.5C19.41,17.87 21,15.12 21,12V4A2,2 0 0,0 19,2H15C13.89,2 13,2.9 13,4V12H3C3,15.09 5,18 9,19.5V22M5.29,14H18.71C18.14,15.91 16.77,17.5 15,18.33V20H11V18.33C9,18 5.86,15.91 5.29,14M15,4H19V12H15V4M16,5V8H18V5H16Z",wu="M21.71 20.29L20.29 21.71A1 1 0 0 1 18.88 21.71L7 9.85A3.81 3.81 0 0 1 6 10A4 4 0 0 1 2.22 4.7L4.76 7.24L5.29 6.71L6.71 5.29L7.24 4.76L4.7 2.22A4 4 0 0 1 10 6A3.81 3.81 0 0 1 9.85 7L21.71 18.88A1 1 0 0 1 21.71 20.29M2.29 18.88A1 1 0 0 0 2.29 20.29L3.71 21.71A1 1 0 0 0 5.12 21.71L10.59 16.25L7.76 13.42M20 2L16 4V6L13.83 8.17L15.83 10.17L18 8H20L22 4Z",_u="M12,2C8,2 4,2.5 4,6V15.5A3.5,3.5 0 0,0 7.5,19L6,20.5V21H8.23L10.23,19H14L16,21H18V20.5L16.5,19A3.5,3.5 0 0,0 20,15.5V6C20,2.5 16.42,2 12,2M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M11,10H6V6H11V10M13,10V6H18V10H13M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17Z",$u="M8.28,5.45L6.5,4.55L7.76,2H16.23L17.5,4.55L15.72,5.44L15,4H9L8.28,5.45M18.62,8H14.09L13.3,5H10.7L9.91,8H5.38L4.1,10.55L5.89,11.44L6.62,10H17.38L18.1,11.45L19.89,10.56L18.62,8M17.77,22H15.7L15.46,21.1L12,15.9L8.53,21.1L8.3,22H6.23L9.12,11H11.19L10.83,12.35L12,14.1L13.16,12.35L12.81,11H14.88L17.77,22M11.4,15L10.5,13.65L9.32,18.13L11.4,15M14.68,18.12L13.5,13.64L12.6,15L14.68,18.12Z",ku="M11,21V16.74C10.53,16.91 10.03,17 9.5,17C7,17 5,15 5,12.5C5,11.23 5.5,10.09 6.36,9.27C6.13,8.73 6,8.13 6,7.5C6,5 8,3 10.5,3C12.06,3 13.44,3.8 14.25,5C14.33,5 14.41,5 14.5,5A5.5,5.5 0 0,1 20,10.5A5.5,5.5 0 0,1 14.5,16C14,16 13.5,15.93 13,15.79V21H11Z",Cu="M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M7,4A1,1 0 0,0 6,5A1,1 0 0,0 7,6A1,1 0 0,0 8,5A1,1 0 0,0 7,4M10,4A1,1 0 0,0 9,5A1,1 0 0,0 10,6A1,1 0 0,0 11,5A1,1 0 0,0 10,4M12,8A6,6 0 0,0 6,14A6,6 0 0,0 12,20A6,6 0 0,0 18,14A6,6 0 0,0 12,8M8.11,10.5H10C9.76,11.88 10,12.67 10.58,13.29C11.68,14.36 12.16,15.71 11.89,17.5H10C10.24,16.12 10,15.33 9.42,14.71C8.32,13.64 7.85,12.29 8.11,10.5M12.11,10.5H14C13.76,11.88 14,12.67 14.58,13.29C15.68,14.36 16.16,15.71 15.89,17.5H14C14.24,16.12 14,15.33 13.42,14.71C12.32,13.64 11.85,12.29 12.11,10.5Z",Mu="M12,2A9,9 0 0,1 21,11H13V19A3,3 0 0,1 10,22A3,3 0 0,1 7,19V18H9V19A1,1 0 0,0 10,20A1,1 0 0,0 11,19V11H3A9,9 0 0,1 12,2Z",Su="M23 20V22H16L16 20H18.46L12 4.61C11.81 4.14 11.5 3.76 11.06 3.46S10.14 3 9.61 3C8.9 3 8.28 3.27 7.76 3.79S7 4.92 7 5.64L7 9H8C10.21 9 12 10.79 12 13V22H8C8.61 21.16 9 20.13 9 19C9 16.24 6.76 14 4 14C3.29 14 2.61 14.15 2 14.42V9H5V5.64C5 4.8 5.23 4 5.63 3.32C6.04 2.62 6.59 2.06 7.3 1.63C8 1.21 8.77 1 9.61 1C10.55 1 11.4 1.26 12.16 1.77S13.5 2.97 13.87 3.81L20.66 20H23M7 19C7 20.66 5.66 22 4 22S1 20.66 1 19 2.34 16 4 16 7 17.34 7 19M5 19C5 18.45 4.55 18 4 18S3 18.45 3 19 3.45 20 4 20 5 19.55 5 19Z",To="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z",Au="M7,9V15H11L16,20V4L11,9H7Z",Lu="M11,4L7,13H19L15,4H11M4,14V22H6V19H14V14H12V17H6V14H4Z",Po="M14.83,11.17C16.39,12.73 16.39,15.27 14.83,16.83C13.27,18.39 10.73,18.39 9.17,16.83L14.83,11.17M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M7,4A1,1 0 0,0 6,5A1,1 0 0,0 7,6A1,1 0 0,0 8,5A1,1 0 0,0 7,4M10,4A1,1 0 0,0 9,5A1,1 0 0,0 10,6A1,1 0 0,0 11,5A1,1 0 0,0 10,4M12,8A6,6 0 0,0 6,14A6,6 0 0,0 12,20A6,6 0 0,0 18,14A6,6 0 0,0 12,8Z",Hu="M12,20A6,6 0 0,1 6,14C6,10 12,3.25 12,3.25C12,3.25 18,10 18,14A6,6 0 0,1 12,20Z",zo="M8 2C6.89 2 6 2.89 6 4V16C6 17.11 6.89 18 8 18H9V20H6V22H9C10.11 22 11 21.11 11 20V18H13V20C13 21.11 13.89 22 15 22H18V20H15V18H16C17.11 18 18 17.11 18 16V4C18 2.89 17.11 2 16 2H8M12 4.97A2 2 0 0 1 14 6.97A2 2 0 0 1 12 8.97A2 2 0 0 1 10 6.97A2 2 0 0 1 12 4.97M10 14.5H14V16H10V14.5Z",Do="M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25,1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25,14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13,15.75A1.25,1.25 0 0,1 14.25,14.5Z",Vu="M19,14.5C19,14.5 21,16.67 21,18A2,2 0 0,1 19,20A2,2 0 0,1 17,18C17,16.67 19,14.5 19,14.5M5,18V9A2,2 0 0,1 3,7A2,2 0 0,1 5,5V4A2,2 0 0,1 7,2H9A2,2 0 0,1 11,4V5H19A2,2 0 0,1 21,7V9L21,11A1,1 0 0,1 22,12A1,1 0 0,1 21,13H17A1,1 0 0,1 16,12A1,1 0 0,1 17,11V9H11V18H12A2,2 0 0,1 14,20V22H2V20A2,2 0 0,1 4,18H5Z",Tu="M6,19A5,5 0 0,1 1,14A5,5 0 0,1 6,9C7,6.65 9.3,5 12,5C15.43,5 18.24,7.66 18.5,11.03L19,11A4,4 0 0,1 23,15A4,4 0 0,1 19,19H6M19,13H17V12A5,5 0 0,0 12,7C9.5,7 7.45,8.82 7.06,11.19C6.73,11.07 6.37,11 6,11A3,3 0 0,0 3,14A3,3 0 0,0 6,17H19A2,2 0 0,0 21,15A2,2 0 0,0 19,13Z",Pu="M3,15H13A1,1 0 0,1 14,16A1,1 0 0,1 13,17H3A1,1 0 0,1 2,16A1,1 0 0,1 3,15M16,15H21A1,1 0 0,1 22,16A1,1 0 0,1 21,17H16A1,1 0 0,1 15,16A1,1 0 0,1 16,15M1,12A5,5 0 0,1 6,7C7,4.65 9.3,3 12,3C15.43,3 18.24,5.66 18.5,9.03L19,9C21.19,9 22.97,10.76 23,13H21A2,2 0 0,0 19,11H17V10A5,5 0 0,0 12,5C9.5,5 7.45,6.82 7.06,9.19C6.73,9.07 6.37,9 6,9A3,3 0 0,0 3,12C3,12.35 3.06,12.69 3.17,13H1.1L1,12M3,19H5A1,1 0 0,1 6,20A1,1 0 0,1 5,21H3A1,1 0 0,1 2,20A1,1 0 0,1 3,19M8,19H21A1,1 0 0,1 22,20A1,1 0 0,1 21,21H8A1,1 0 0,1 7,20A1,1 0 0,1 8,19Z",zu="M6,14A1,1 0 0,1 7,15A1,1 0 0,1 6,16A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H18A1,1 0 0,1 17,15A1,1 0 0,1 18,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14M10,18A2,2 0 0,1 12,20A2,2 0 0,1 10,22A2,2 0 0,1 8,20A2,2 0 0,1 10,18M14.5,16A1.5,1.5 0 0,1 16,17.5A1.5,1.5 0 0,1 14.5,19A1.5,1.5 0 0,1 13,17.5A1.5,1.5 0 0,1 14.5,16M10.5,12A1.5,1.5 0 0,1 12,13.5A1.5,1.5 0 0,1 10.5,15A1.5,1.5 0 0,1 9,13.5A1.5,1.5 0 0,1 10.5,12Z",Du="M6,16A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H18A1,1 0 0,1 17,15A1,1 0 0,1 18,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14H7A1,1 0 0,1 8,15A1,1 0 0,1 7,16H6M12,11H15L13,15H15L11.25,22L12,17H9.5L12,11Z",Eu="M4.5,13.59C5,13.87 5.14,14.5 4.87,14.96C4.59,15.44 4,15.6 3.5,15.33V15.33C2,14.47 1,12.85 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16A1,1 0 0,1 18,15A1,1 0 0,1 19,14A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11C3,12.11 3.6,13.08 4.5,13.6V13.59M9.5,11H12.5L10.5,15H12.5L8.75,22L9.5,17H7L9.5,11M17.5,18.67C17.5,19.96 16.5,21 15.25,21C14,21 13,19.96 13,18.67C13,17.12 15.25,14.5 15.25,14.5C15.25,14.5 17.5,17.12 17.5,18.67Z",Ou="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z",Fu="M12.74,5.47C15.1,6.5 16.35,9.03 15.92,11.46C17.19,12.56 18,14.19 18,16V16.17C18.31,16.06 18.65,16 19,16A3,3 0 0,1 22,19A3,3 0 0,1 19,22H6A4,4 0 0,1 2,18A4,4 0 0,1 6,14H6.27C5,12.45 4.6,10.24 5.5,8.26C6.72,5.5 9.97,4.24 12.74,5.47M11.93,7.3C10.16,6.5 8.09,7.31 7.31,9.07C6.85,10.09 6.93,11.22 7.41,12.13C8.5,10.83 10.16,10 12,10C12.7,10 13.38,10.12 14,10.34C13.94,9.06 13.18,7.86 11.93,7.3M13.55,3.64C13,3.4 12.45,3.23 11.88,3.12L14.37,1.82L15.27,4.71C14.76,4.29 14.19,3.93 13.55,3.64M6.09,4.44C5.6,4.79 5.17,5.19 4.8,5.63L4.91,2.82L7.87,3.5C7.25,3.71 6.65,4.03 6.09,4.44M18,9.71C17.91,9.12 17.78,8.55 17.59,8L19.97,9.5L17.92,11.73C18.03,11.08 18.05,10.4 18,9.71M3.04,11.3C3.11,11.9 3.24,12.47 3.43,13L1.06,11.5L3.1,9.28C3,9.93 2.97,10.61 3.04,11.3M19,18H16V16A4,4 0 0,0 12,12A4,4 0 0,0 8,16H6A2,2 0 0,0 4,18A2,2 0 0,0 6,20H19A1,1 0 0,0 20,19A1,1 0 0,0 19,18Z",Iu="M12.75,4.47C15.1,5.5 16.35,8.03 15.92,10.46C17.19,11.56 18,13.19 18,15V15.17C18.31,15.06 18.65,15 19,15A3,3 0 0,1 22,18A3,3 0 0,1 19,21H17C17,21 16,21 16,20C16,19 17,19 17,19H19A1,1 0 0,0 20,18A1,1 0 0,0 19,17H16V15A4,4 0 0,0 12,11A4,4 0 0,0 8,15H6A2,2 0 0,0 4,17A2,2 0 0,0 6,19H7C7,19 8,19 8,20C8,21 7,21 7,21H6A4,4 0 0,1 2,17A4,4 0 0,1 6,13H6.27C5,11.45 4.6,9.24 5.5,7.25C6.72,4.5 9.97,3.24 12.75,4.47M11.93,6.3C10.16,5.5 8.09,6.31 7.31,8.07C6.85,9.09 6.93,10.22 7.41,11.13C8.5,9.83 10.16,9 12,9C12.7,9 13.38,9.12 14,9.34C13.94,8.06 13.18,6.86 11.93,6.3M13.55,2.63C13,2.4 12.45,2.23 11.88,2.12L14.37,0.82L15.27,3.71C14.76,3.29 14.19,2.93 13.55,2.63M6.09,3.44C5.6,3.79 5.17,4.19 4.8,4.63L4.91,1.82L7.87,2.5C7.25,2.71 6.65,3.03 6.09,3.44M18,8.71C17.91,8.12 17.78,7.55 17.59,7L19.97,8.5L17.92,10.73C18.03,10.08 18.05,9.4 18,8.71M3.04,10.3C3.11,10.9 3.25,11.47 3.43,12L1.06,10.5L3.1,8.28C3,8.93 2.97,9.61 3.04,10.3M12,18.91C12.59,19.82 13,20.63 13,21A1,1 0 0,1 12,22A1,1 0 0,1 11,21C11,20.63 11.41,19.82 12,18.91M12,15.62C12,15.62 9,19 9,21A3,3 0 0,0 12,24A3,3 0 0,0 15,21C15,19 12,15.62 12,15.62Z",Bu="M9,12C9.53,12.14 9.85,12.69 9.71,13.22L8.41,18.05C8.27,18.59 7.72,18.9 7.19,18.76C6.65,18.62 6.34,18.07 6.5,17.54L7.78,12.71C7.92,12.17 8.47,11.86 9,12M13,12C13.53,12.14 13.85,12.69 13.71,13.22L11.64,20.95C11.5,21.5 10.95,21.8 10.41,21.66C9.88,21.5 9.56,20.97 9.7,20.43L11.78,12.71C11.92,12.17 12.47,11.86 13,12M17,12C17.53,12.14 17.85,12.69 17.71,13.22L16.41,18.05C16.27,18.59 15.72,18.9 15.19,18.76C14.65,18.62 14.34,18.07 14.5,17.54L15.78,12.71C15.92,12.17 16.47,11.86 17,12M17,10V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11C3,12.11 3.6,13.08 4.5,13.6V13.59C5,13.87 5.14,14.5 4.87,14.96C4.59,15.43 4,15.6 3.5,15.32V15.33C2,14.47 1,12.85 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12C23,13.5 22.2,14.77 21,15.46V15.46C20.5,15.73 19.91,15.57 19.63,15.09C19.36,14.61 19.5,14 20,13.72V13.73C20.6,13.39 21,12.74 21,12A2,2 0 0,0 19,10H17Z",Nu="M6,14.03A1,1 0 0,1 7,15.03C7,15.58 6.55,16.03 6,16.03C3.24,16.03 1,13.79 1,11.03C1,8.27 3.24,6.03 6,6.03C7,3.68 9.3,2.03 12,2.03C15.43,2.03 18.24,4.69 18.5,8.06L19,8.03A4,4 0 0,1 23,12.03C23,14.23 21.21,16.03 19,16.03H18C17.45,16.03 17,15.58 17,15.03C17,14.47 17.45,14.03 18,14.03H19A2,2 0 0,0 21,12.03A2,2 0 0,0 19,10.03H17V9.03C17,6.27 14.76,4.03 12,4.03C9.5,4.03 7.45,5.84 7.06,8.21C6.73,8.09 6.37,8.03 6,8.03A3,3 0 0,0 3,11.03A3,3 0 0,0 6,14.03M12,14.15C12.18,14.39 12.37,14.66 12.56,14.94C13,15.56 14,17.03 14,18C14,19.11 13.1,20 12,20A2,2 0 0,1 10,18C10,17.03 11,15.56 11.44,14.94C11.63,14.66 11.82,14.4 12,14.15M12,11.03L11.5,11.59C11.5,11.59 10.65,12.55 9.79,13.81C8.93,15.06 8,16.56 8,18A4,4 0 0,0 12,22A4,4 0 0,0 16,18C16,16.56 15.07,15.06 14.21,13.81C13.35,12.55 12.5,11.59 12.5,11.59",ju="M6,14A1,1 0 0,1 7,15A1,1 0 0,1 6,16A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H18A1,1 0 0,1 17,15A1,1 0 0,1 18,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14M7.88,18.07L10.07,17.5L8.46,15.88C8.07,15.5 8.07,14.86 8.46,14.46C8.85,14.07 9.5,14.07 9.88,14.46L11.5,16.07L12.07,13.88C12.21,13.34 12.76,13.03 13.29,13.17C13.83,13.31 14.14,13.86 14,14.4L13.41,16.59L15.6,16C16.14,15.86 16.69,16.17 16.83,16.71C16.97,17.24 16.66,17.79 16.12,17.93L13.93,18.5L15.54,20.12C15.93,20.5 15.93,21.15 15.54,21.54C15.15,21.93 14.5,21.93 14.12,21.54L12.5,19.93L11.93,22.12C11.79,22.66 11.24,22.97 10.71,22.83C10.17,22.69 9.86,22.14 10,21.6L10.59,19.41L8.4,20C7.86,20.14 7.31,19.83 7.17,19.29C7.03,18.76 7.34,18.21 7.88,18.07Z",Ru="M18.5,18.67C18.5,19.96 17.5,21 16.25,21C15,21 14,19.96 14,18.67C14,17.12 16.25,14.5 16.25,14.5C16.25,14.5 18.5,17.12 18.5,18.67M4,17.36C3.86,16.82 4.18,16.25 4.73,16.11L7,15.5L5.33,13.86C4.93,13.46 4.93,12.81 5.33,12.4C5.73,12 6.4,12 6.79,12.4L8.45,14.05L9.04,11.8C9.18,11.24 9.75,10.92 10.29,11.07C10.85,11.21 11.17,11.78 11,12.33L10.42,14.58L12.67,14C13.22,13.83 13.79,14.15 13.93,14.71C14.08,15.25 13.76,15.82 13.2,15.96L10.95,16.55L12.6,18.21C13,18.6 13,19.27 12.6,19.67C12.2,20.07 11.54,20.07 11.15,19.67L9.5,18L8.89,20.27C8.75,20.83 8.18,21.14 7.64,21C7.08,20.86 6.77,20.29 6.91,19.74L7.5,17.5L5.26,18.09C4.71,18.23 4.14,17.92 4,17.36M1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16A1,1 0 0,1 18,15A1,1 0 0,1 19,14A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11C3,11.85 3.35,12.61 3.91,13.16C4.27,13.55 4.26,14.16 3.88,14.54C3.5,14.93 2.85,14.93 2.47,14.54C1.56,13.63 1,12.38 1,11Z",Wu="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z",Zu="M4,10A1,1 0 0,1 3,9A1,1 0 0,1 4,8H12A2,2 0 0,0 14,6A2,2 0 0,0 12,4C11.45,4 10.95,4.22 10.59,4.59C10.2,5 9.56,5 9.17,4.59C8.78,4.2 8.78,3.56 9.17,3.17C9.9,2.45 10.9,2 12,2A4,4 0 0,1 16,6A4,4 0 0,1 12,10H4M19,12A1,1 0 0,0 20,11A1,1 0 0,0 19,10C18.72,10 18.47,10.11 18.29,10.29C17.9,10.68 17.27,10.68 16.88,10.29C16.5,9.9 16.5,9.27 16.88,8.88C17.42,8.34 18.17,8 19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14H5A1,1 0 0,1 4,13A1,1 0 0,1 5,12H19M18,18H4A1,1 0 0,1 3,17A1,1 0 0,1 4,16H18A3,3 0 0,1 21,19A3,3 0 0,1 18,22C17.17,22 16.42,21.66 15.88,21.12C15.5,20.73 15.5,20.1 15.88,19.71C16.27,19.32 16.9,19.32 17.29,19.71C17.47,19.89 17.72,20 18,20A1,1 0 0,0 19,19A1,1 0 0,0 18,18Z",Ku="M6,6L6.69,6.06C7.32,3.72 9.46,2 12,2A5.5,5.5 0 0,1 17.5,7.5L17.42,8.45C17.88,8.16 18.42,8 19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14H6A4,4 0 0,1 2,10A4,4 0 0,1 6,6M6,8A2,2 0 0,0 4,10A2,2 0 0,0 6,12H19A1,1 0 0,0 20,11A1,1 0 0,0 19,10H15.5V7.5A3.5,3.5 0 0,0 12,4A3.5,3.5 0 0,0 8.5,7.5V8H6M18,18H4A1,1 0 0,1 3,17A1,1 0 0,1 4,16H18A3,3 0 0,1 21,19A3,3 0 0,1 18,22C17.17,22 16.42,21.66 15.88,21.12C15.5,20.73 15.5,20.1 15.88,19.71C16.27,19.32 16.9,19.32 17.29,19.71C17.47,19.89 17.72,20 18,20A1,1 0 0,0 19,19A1,1 0 0,0 18,18Z",qu="M12,21L15.6,16.2C14.6,15.45 13.35,15 12,15C10.65,15 9.4,15.45 8.4,16.2L12,21M12,3C7.95,3 4.21,4.34 1.2,6.6L3,9C5.5,7.12 8.62,6 12,6C15.38,6 18.5,7.12 21,9L22.8,6.6C19.79,4.34 16.05,3 12,3M12,9C9.3,9 6.81,9.89 4.8,11.4L6.6,13.8C8.1,12.67 9.97,12 12,12C14.03,12 15.9,12.67 17.4,13.8L19.2,11.4C17.19,9.89 14.7,9 12,9Z",Gu="M13.33,11.67L16.21,14.58C17.62,13.16 16.21,11.75 16.21,11.75L14.72,10.24C14.9,9.86 15,9.44 15,9C15,7.95 14.46,7.03 13.64,6.5L15,2.11C13.09,1.53 12.5,3.44 12.5,3.44L11.69,6.03C10.46,6.16 9.46,7 9.13,8.18L4.67,9.63C5.31,11.53 7.2,10.9 7.2,10.9L9.27,10.23C9.61,10.97 10.23,11.54 11,11.82V19C11,19 9,19 9,21C9,21.5 9,21.81 9,22H15V21C15,21 15,19 13,19V11.82C13.12,11.78 13.23,11.72 13.33,11.67M10.5,9A1.5,1.5 0 0,1 12,7.5A1.5,1.5 0 0,1 13.5,9A1.5,1.5 0 0,1 12,10.5A1.5,1.5 0 0,1 10.5,9Z",Uu="M6,11H10V9H14V11H18V4H6V11M18,13H6V20H18V13M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2Z",Yu="M6,8H10V6H14V8H18V4H6V8M18,10H6V15H18V10M6,20H18V17H6V20M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2Z",Qu="M3 4H21V8H19V20H17V8H7V20H5V8H3V4M8 9H16V11H8V9M8 12H16V14H8V12M8 15H16V17H8V15M8 18H16V20H8V18Z",Xu="M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.6,4.7C0.4,7.1 0.9,10.1 2.9,12.1C4.8,14 7.5,14.5 9.8,13.6L18.9,22.7C19.3,23.1 19.9,23.1 20.3,22.7L22.6,20.4C23.1,20 23.1,19.3 22.7,19Z";const Ts={fridge:F1,"fridge-outline":I1,dishwasher:$1,"washing-machine":Po,"tumble-dryer":Cu,stove:pu,microwave:wp,"coffee-maker":f1,kettle:np,toaster:vu,blender:wo,"food-processor":wo,"rice-cooker":Op,"slow-cooker":Fp,"pressure-cooker":Ep,"air-fryer":Vo,oven:Vo,"range-hood":xo,lightbulb:up,"lightbulb-outline":hp,lamp:op,"ceiling-light":l1,"floor-lamp":E1,"led-strip":cp,"led-strip-variant":dp,"wall-sconce":Lu,chandelier:d1,"desk-lamp":_1,spotlight:lu,"light-switch":pp,thermometer:Ho,thermostat:bu,radiator:jp,"radiator-disabled":Rp,"heat-pump":G1,"air-conditioner":Vd,fan:V1,hvac:tp,fire:P1,snowflake:iu,fireplace:z1,"heating-coil":U1,"lightning-bolt":gp,flash:D1,pencil:Vp,battery:jd,"battery-charging":Zd,"battery-50":Wd,"battery-10":Rd,"solar-panel":ru,"solar-power":nu,"meter-electric":yp,"power-plug":Bp,"power-socket":Np,"ev-plug":Mo,"transmission-tower":$u,"current-ac":y1,"current-dc":x1,car:r1,"car-electric":a1,"car-battery":n1,"ev-station":Mo,"ev-plug-type2":L1,garage:N1,"garage-open":j1,motorcycle:Cp,bicycle:Gd,scooter:Gp,bus:e1,train:_u,airplane:Pd,door:k1,"door-open":C1,lock:mp,"lock-open":bp,"shield-home":Qp,cctv:s1,camera:i1,"motion-sensor":kp,"alarm-light":Dd,bell:Kd,eye:H1,key:ap,fingerprint:T1,"shield-check":Yp,"window-closed":Uu,"window-open":Yu,blinds:Ud,"blinds-open":Yd,curtains:w1,"roller-shade":Kp,"window-shutter":Qu,balcony:Id,"door-sliding":M1,television:gu,speaker:au,"speaker-wireless":ou,music:Sp,"volume-high":To,cast:ko,chromecast:ko,radio:Wp,headphones:q1,microphone:xp,gamepad:B1,movie:Mp,spotify:su,"router-wireless":qp,wifi:qu,"access-point":Ld,lan:sp,network:Lp,"home-assistant":J1,server:Up,nas:Ap,cloud:b1,ethernet:A1,bluetooth:Qd,cellphone:c1,tablet:hu,laptop:lp,water:Hu,"water-percent":Do,"water-boiler":zo,"water-pump":Vu,shower:Xp,toilet:xu,faucet:So,pipe:Tp,bathtub:Nd,sink:So,"water-heater":zo,pool:Dp,"weather-sunny":Wu,"weather-cloudy":Tu,"weather-night":Ou,"weather-rainy":Nu,"weather-snowy":ju,"weather-windy":Zu,"weather-fog":Pu,"weather-lightning":Du,"weather-lightning-rainy":Eu,"weather-hail":zu,"weather-partly-cloudy":Fu,"weather-partly-rainy":Iu,"weather-pouring":Bu,"weather-snowy-rainy":Ru,"weather-windy-variant":Ku,temperature:Ho,humidity:Do,barometer:Ao,"air-filter":xo,"air-purifier":Td,"smoke-detector":tu,co2:$p,"wind-turbine":Gu,flower:O1,tree:ku,sprinkler:cu,grass:R1,"garden-light":Lo,"outdoor-lamp":Lo,grill:W1,"hot-tub":ep,umbrella:Mu,"thermometer-lines":mu,iron:rp,vacuum:Su,broom:_o,mop:_o,washing:Po,basket:Bd,hanger:K1,scissors:v1,information:ip,"help-circle":Y1,"alert-circle":Ed,"checkbox-marked-circle":h1,check:u1,close:m1,minus:_p,plus:zp,"arrow-up":Fd,"arrow-down":Od,refresh:Zp,sync:uu,"bell-ring":qd,"toggle-switch":yu,power:Ip,play:Pp,pause:Hp,stop:du,"skip-next":Jp,"skip-previous":eu,"volume-up":To,"volume-down":Au,"brightness-up":Jd,"brightness-down":Xd,clock:g1,timer:fu,alarm:zd,calendar:t1,"calendar-clock":$o,schedule:$o,history:Q1,home:X1,cog:Co,tools:wu,wrench:Xu,hammer:Z1,"chart-line":p1,cash:o1,gauge:Ao,"dots-vertical":S1,menu:vp,settings:Co,account:Hd,logout:fp};function Ju(e){return e&&Ts[e.replace(/^mdi:/,"")]||""}function ye(e){if(!e)return"";if(e.startsWith("mdi:")){const t=Ju(e);return t?c`<svg class="oig-mdi" viewBox="0 0 24 24" aria-hidden="true"><path d=${t}></path></svg>`:Sd(e)}return e}var eh=Object.defineProperty,th=Object.getOwnPropertyDescriptor,wt=(e,t,i,r)=>{for(var n=r>1?void 0:r?th(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&eh(t,i,n),n};const He=Q;let Qe=class extends D{constructor(){super(...arguments),this.title="Energetické Toky",this.time="",this.showStatus=!1,this.alertCount=0,this.weatherAvailable=!1,this.weatherCondition="",this.weatherTemp=null}onStatusClick(){this.dispatchEvent(new CustomEvent("status-click",{bubbles:!0}))}onEditClick(){this.dispatchEvent(new CustomEvent("edit-click",{bubbles:!0}))}onResetClick(){this.dispatchEvent(new CustomEvent("reset-click",{bubbles:!0}))}render(){const e=this.alertCount>0?"warning":"ok";return c`
      <h1 class="title">
        <span class="title-icon">${ye("mdi:lightning-bolt")}</span>
        ${this.title}
        ${this.time?c`<span class="time">${this.time}</span>`:null}
      </h1>

      <div class="spacer"></div>

      ${this.showStatus?this.weatherAvailable?c`
          <button class="weather-badge ${this.alertCount>0?"has-warn":""}"
            @click=${this.onStatusClick} title="Počasí a výstrahy">
            <span class="wb-icon">${ye(Qr(this.weatherCondition))}</span>
            <span class="wb-temp">${this.weatherTemp!=null?`${Math.round(this.weatherTemp)} °C`:"—"}</span>
            ${this.alertCount>0?c`
              <span class="wb-warn">${ye("mdi:alert-circle")} ${this.alertCount}</span>
            `:null}
          </button>
        `:c`
          <div class="status-badge ${e}" @click=${this.onStatusClick}>
            ${this.alertCount>0?c`<span class="status-count">${this.alertCount}</span>`:null}
            <span>${this.alertCount>0?"Výstrahy":"OK"}</span>
          </div>
        `:null}

       <div class="actions">
         <button class="action-btn" @click=${this.onEditClick} title="Upravit rozložení dlaždic">
           ${ye("mdi:pencil")}
         </button>
         <button class="action-btn" @click=${this.onResetClick} title="Obnovit rozložení">
           ${ye("mdi:refresh")}
         </button>
       </div>
    `}};Qe.styles=T`
    :host {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: ${He(s.bgPrimary)};
      border-bottom: 1px solid ${He(s.divider)};
      gap: 12px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
      color: ${He(s.textPrimary)};
      margin: 0;
    }

    .title-icon { font-size: 20px; color: ${He(s.accent)}; display: inline-flex; }
    .oig-mdi { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; display: inline-block; }

    .time {
      font-size: 13px;
      color: ${He(s.textSecondary)};
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
      border: 1px solid ${He(s.divider)};
      background: ${He(s.bgSecondary)};
      color: ${He(s.textPrimary)};
      transition: background 0.2s, border-color 0.2s;
    }
    .weather-badge:hover { background: ${He(s.divider)}; }
    .weather-badge.has-warn { border-color: ${He(s.warning)}; }

    .wb-icon { font-size: 18px; display: inline-flex; color: ${He(s.accent)}; }
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
      background: ${He(s.warning)};
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
    .status-badge.warning { background: ${He(s.warning)}; }
    .status-badge.ok { background: ${He(s.success)}; }
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
      color: ${He(s.textSecondary)};
      transition: all 0.2s;
      font-size: 18px;
    }

    .action-btn:hover {
      background: ${He(s.bgSecondary)};
      color: ${He(s.textPrimary)};
    }

    .action-btn.active {
      background: ${He(s.accent)};
      color: #fff;
    }
  `;wt([g({type:String})],Qe.prototype,"title",2);wt([g({type:String})],Qe.prototype,"time",2);wt([g({type:Boolean})],Qe.prototype,"showStatus",2);wt([g({type:Number})],Qe.prototype,"alertCount",2);wt([g({type:Boolean})],Qe.prototype,"weatherAvailable",2);wt([g({type:String})],Qe.prototype,"weatherCondition",2);wt([g({type:Number})],Qe.prototype,"weatherTemp",2);Qe=wt([E("oig-header")],Qe);function Ps(e,t){let i=null;return function(...r){i!==null&&clearTimeout(i),i=window.setTimeout(()=>{e.apply(this,r),i=null},t)}}var ih=Object.defineProperty,rh=Object.getOwnPropertyDescriptor,mr=(e,t,i,r)=>{for(var n=r>1?void 0:r?rh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&ih(t,i,n),n};const Eo="oig_v2_theme";let Bt=class extends D{constructor(){super(...arguments),this.mode="auto",this.isDark=!1,this.breakpoint="desktop",this.width=1280,this.mediaQuery=null,this.resizeObserver=null,this.debouncedResize=Ps(this.updateBreakpoint.bind(this),100),this.onMediaChange=e=>{this.mode==="auto"&&(this.isDark=e.matches,this.dispatchEvent(new CustomEvent("theme-changed",{detail:{isDark:this.isDark}})))},this.onThemeChange=()=>{this.detectTheme()}}connectedCallback(){super.connectedCallback(),this.loadTheme(),this.setupMediaQuery(),this.setupResizeObserver(),this.detectTheme(),window.addEventListener("oig-theme-change",this.onThemeChange)}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mediaQuery)==null||e.removeEventListener("change",this.onMediaChange),(t=this.resizeObserver)==null||t.disconnect(),window.removeEventListener("oig-theme-change",this.onThemeChange)}loadTheme(){const e=localStorage.getItem(Eo);e&&["light","dark","auto"].includes(e)&&(this.mode=e)}saveTheme(){localStorage.setItem(Eo,this.mode)}setupMediaQuery(){this.mediaQuery=window.matchMedia("(prefers-color-scheme: dark)"),this.mediaQuery.addEventListener("change",this.onMediaChange)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(this.debouncedResize),this.resizeObserver.observe(document.documentElement),this.updateBreakpoint()}updateBreakpoint(){this.width=window.innerWidth,this.breakpoint=ci(this.width)}detectTheme(){this.mode==="auto"?this.isDark=window.matchMedia("(prefers-color-scheme: dark)").matches:this.isDark=this.mode==="dark"}setTheme(e){this.mode=e,this.saveTheme(),this.detectTheme(),this.dispatchEvent(new CustomEvent("theme-changed",{detail:{mode:e,isDark:this.isDark}})),L.info("Theme changed",{mode:e,isDark:this.isDark})}getThemeInfo(){return{mode:this.mode,isDark:this.isDark,breakpoint:this.breakpoint,width:this.width}}render(){return c`
      <slot></slot>
    `}};Bt.styles=T`
    :host {
      display: contents;
    }
  `;mr([g({type:String})],Bt.prototype,"mode",2);mr([H()],Bt.prototype,"isDark",2);mr([H()],Bt.prototype,"breakpoint",2);mr([H()],Bt.prototype,"width",2);Bt=mr([E("oig-theme-provider")],Bt);var nh=Object.defineProperty,ah=Object.getOwnPropertyDescriptor,Ma=(e,t,i,r)=>{for(var n=r>1?void 0:r?ah(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&nh(t,i,n),n};let er=class extends D{constructor(){super(...arguments),this.tabs=[],this.activeTab=""}onTabClick(e){e!==this.activeTab&&(this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tabId:e},bubbles:!0})))}isActive(e){return this.activeTab===e}render(){return c`
      ${this.tabs.map(e=>c`
        <button 
          class="tab ${this.isActive(e.id)?"active":""}"
          @click=${()=>this.onTabClick(e.id)}
        >
          ${e.icon?c`<span class="tab-icon">${ye(e.icon)}</span>`:null}
          <span>${e.label}</span>
        </button>
      `)}
    `}};er.styles=T`
    :host {
      display: flex;
      gap: 8px;
      padding: 0 16px;
      background: ${Q(s.bgPrimary)};
      border-bottom: 1px solid ${Q(s.divider)};
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
      color: ${Q(s.textSecondary)};
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab:hover {
      color: ${Q(s.textPrimary)};
      background: ${Q(s.bgSecondary)};
    }

    .tab.active {
      color: ${Q(s.accent)};
      border-bottom-color: ${Q(s.accent)};
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
  `;Ma([g({type:Array})],er.prototype,"tabs",2);Ma([g({type:String})],er.prototype,"activeTab",2);er=Ma([E("oig-tabs")],er);var oh=Object.defineProperty,sh=Object.getOwnPropertyDescriptor,Sa=(e,t,i,r)=>{for(var n=r>1?void 0:r?sh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&oh(t,i,n),n};const lh="oig_v2_layout_",Xn=Q;let tr=class extends D{constructor(){super(...arguments),this.editable=!1,this.breakpoint="desktop",this.onResize=Ps(()=>{this.breakpoint=ci(window.innerWidth)},100)}connectedCallback(){super.connectedCallback(),this.breakpoint=ci(window.innerWidth),window.addEventListener("resize",this.onResize)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("resize",this.onResize)}updated(e){e.has("breakpoint")&&this.setAttribute("breakpoint",this.breakpoint)}resetLayout(){const e=`${lh}${this.breakpoint}`;localStorage.removeItem(e),this.requestUpdate()}render(){return c`<slot></slot>`}};tr.styles=T`
    :host {
      display: grid;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      background: ${Xn(s.bgSecondary)};
    }

    :host([breakpoint='mobile']) { grid-template-columns: 1fr; }
    :host([breakpoint='tablet']) { grid-template-columns: repeat(2, 1fr); }
    :host([breakpoint='desktop']) { grid-template-columns: repeat(3, 1fr); }

    .grid-item {
      position: relative;
      background: ${Xn(s.cardBg)};
      border-radius: 8px;
      box-shadow: ${Xn(s.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .grid-item.editable { cursor: move; }
    .grid-item.editable:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .grid-item.dragging { opacity: 0.8; transform: scale(1.02); z-index: 100; }

    @media (max-width: 768px) {
      :host { gap: 12px; padding: 12px; }
    }
  `;Sa([g({type:Boolean})],tr.prototype,"editable",2);Sa([H()],tr.prototype,"breakpoint",2);tr=Sa([E("oig-grid")],tr);const ch={off:"Vypnuto",on:"Zapnuto",limited:"Omezeno",unknown:"?"};function Oo(e){return ch[e]??e}const zs=e=>{const t=e.trim();return t?t.endsWith("W")?t:`${t}W`:""};function dh(e){const t=e.isUnavailable;let i;t||e.currentLiveDelivery==="unknown"?i="?":e.currentLiveDelivery==="limited"&&e.currentLiveLimit!==null?i=`Omezeno ${e.currentLiveLimit}W`:i=Oo(e.currentLiveDelivery);const r=!t&&e.currentLiveDelivery==="limited";let n=null,a=null;!t&&e.currentLiveLimit!==null&&(a=`${e.currentLiveLimit}W`,n=r?"Aktivní limit":"Nastavený limit");let o=null,l=null;return e.pendingDeliveryTarget!==null&&(o=`Ve frontě: ${Oo(e.pendingDeliveryTarget)}`),e.pendingLimitTarget!==null&&(l=`Ve frontě: limit ${zs(String(e.pendingLimitTarget))}`),{currentModeText:i,limitLabel:n,limitValue:a,showLimitAsActive:r,isUnavailable:t,isTransitioning:e.isTransitioning,pendingModeText:o,pendingLimitText:l}}function ph(e,t){const i=t.has("box_mode"),r=e.get("box_mode"),n=t.has("grid_mode")||t.has("grid_limit"),a=e.get("grid_limit"),o=e.get("grid_mode");let l=null;if(a){const d=zs(a);l=d?`→ ${d}`:null}else o&&(l=`→ ${o}`);return{inverterModeChanging:i,inverterModeText:r?`→ ${r}`:null,gridExportChanging:n,gridExportText:l}}var uh=Object.defineProperty,hh=Object.getOwnPropertyDescriptor,kn=(e,t,i,r)=>{for(var n=r>1?void 0:r?hh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&uh(t,i,n),n};let gi=class extends D{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1}get fillHeight(){return Math.max(0,Math.min(100,this.soc))/100*54}get fillY(){return 13+(54-this.fillHeight)}render(){return c`
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
    `}};gi.styles=T`
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
  `;kn([g({type:Number})],gi.prototype,"soc",2);kn([g({type:Boolean})],gi.prototype,"charging",2);kn([g({type:Boolean})],gi.prototype,"gridCharging",2);gi=kn([E("oig-battery-gauge")],gi);var gh=Object.defineProperty,mh=Object.getOwnPropertyDescriptor,Cn=(e,t,i,r)=>{for(var n=r>1?void 0:r?mh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&gh(t,i,n),n};let mi=class extends D{constructor(){super(...arguments),this.power=0,this.percent=0,this.maxPower=5400}get isNight(){return this.percent<2}get level(){return this.percent<2?"night":this.percent<20?"low":this.percent<65?"mid":"high"}get sunColor(){const e=this.level;return e==="low"?"#b0bec5":e==="mid"?"#ffd54f":"#ffb300"}get rayLen(){const e=this.level;return e==="low"?4:e==="mid"?7:10}get rayOpacity(){const e=this.level;return e==="low"?.5:e==="mid"?.8:1}get coreRadius(){const e=this.level;return e==="low"?7:e==="mid"?9:11}renderMoon(){return F`
      <circle cx="24" cy="24" r="20" fill="#3949ab" opacity="0.28"/>
      <g class="moon-body">
        <path d="M24 6 A18 18 0 1 0 24 42 A13 13 0 1 1 24 6Z" fill="#cfd8dc" opacity="0.95"/>
      </g>
      <circle class="star" cx="7" cy="10" r="1.5" fill="#e8eaf6" style="animation-delay:0s"/>
      <circle class="star" cx="41" cy="7" r="1.8" fill="#e8eaf6" style="animation-delay:0.7s"/>
      <circle class="star" cx="5" cy="30" r="1.2" fill="#c5cae9" style="animation-delay:1.4s"/>
      <circle class="star" cx="6" cy="44" r="1.0" fill="#c5cae9" style="animation-delay:2.1s"/>
      <circle class="star" cx="42" cy="39" r="1.3" fill="#e8eaf6" style="animation-delay:2.8s"/>
    `}renderSun(){const i=this.coreRadius,r=i+3,n=r+this.rayLen,a=this.sunColor,o=this.rayOpacity,d=[0,45,90,135,180,225,270,315].map(u=>{const h=u*Math.PI/180,m=24+Math.cos(h)*r,v=24+Math.sin(h)*r,f=24+Math.cos(h)*n,b=24+Math.sin(h)*n;return F`
        <line class="ray"
          x1="${m}" y1="${v}" x2="${f}" y2="${b}"
          stroke="${a}" stroke-width="2.5" opacity="${o}"
        />
      `}),p=this.level==="low";return F`
      <!-- Paprsky obaleny v <g> pro CSS rotaci -->
      <g class="rays-group">
        ${d}
      </g>
      <circle class="sun-core" cx="${24}" cy="${24}" r="${i}" fill="${a}" />
      ${p?F`
        <!-- Jednoduchý obláček -->
        <g class="cloud" opacity="0.85">
          <ellipse cx="30" cy="30" rx="9" ry="6" fill="#90a4ae"/>
          <ellipse cx="24" cy="32" rx="7" ry="5" fill="#90a4ae"/>
          <ellipse cx="36" cy="32" rx="6" ry="4.5" fill="#90a4ae"/>
        </g>
      `:""}
    `}render(){return this.percent>=20?this.classList.add("solar-active"):this.classList.remove("solar-active"),c`
      <svg viewBox="0 0 48 48">
        ${this.isNight?this.renderMoon():this.renderSun()}
      </svg>
    `}};mi.styles=T`
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
  `;Cn([g({type:Number})],mi.prototype,"power",2);Cn([g({type:Number})],mi.prototype,"percent",2);Cn([g({type:Number})],mi.prototype,"maxPower",2);mi=Cn([E("oig-solar-icon")],mi);var bh=Object.defineProperty,fh=Object.getOwnPropertyDescriptor,br=(e,t,i,r)=>{for(var n=r>1?void 0:r?fh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&bh(t,i,n),n};let Nt=class extends D{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1,this.discharging=!1,this._clipId=`batt-clip-${Math.random().toString(36).slice(2)}`}get fillColor(){return this.gridCharging?"#42a5f5":this.soc>50?"#4caf50":this.soc>20?"#ff9800":"#f44336"}get fillHeight(){return Math.max(1,Math.min(100,this.soc)/100*48)}get fillY(){return 14+(48-this.fillHeight)}get stripeColor(){return this.gridCharging?"#90caf9":"#a5d6a7"}render(){const e=this.charging||this.gridCharging,t=this.soc>=25;return c`
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
        ${e?F`
          <rect
            class="charge-stripe active"
            x="4" y="52" width="24" height="8" rx="2"
            fill="${this.stripeColor}"
            clip-path="url(#${this._clipId})"
          />
        `:""}

        <!-- SoC text uvnitř -->
        ${t?F`
          <text class="soc-text" x="16" y="${this.fillY+this.fillHeight/2}">
            ${Math.round(this.soc)}%
          </text>
        `:""}
      </svg>
    `}};Nt.styles=T`
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
  `;br([g({type:Number})],Nt.prototype,"soc",2);br([g({type:Boolean})],Nt.prototype,"charging",2);br([g({type:Boolean})],Nt.prototype,"gridCharging",2);br([g({type:Boolean})],Nt.prototype,"discharging",2);Nt=br([E("oig-battery-icon")],Nt);var vh=Object.defineProperty,yh=Object.getOwnPropertyDescriptor,Ds=(e,t,i,r)=>{for(var n=r>1?void 0:r?yh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&vh(t,i,n),n};let rn=class extends D{constructor(){super(...arguments),this.power=0}get mode(){return this.power>50?"importing":this.power<-50?"exporting":"idle"}render(){const e=this.mode;return c`
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
        ${e!=="idle"?c`
          <path
            class="arrow ${e==="importing"?"import":"export"}"
            d="${e==="importing"?"M 24,10 L 24,4 M 24,4 L 20,8 M 24,4 L 28,8":"M 24,4 L 24,10 M 24,10 L 20,6 M 24,10 L 28,6"}"
          />
        `:""}
      </svg>
    `}};rn.styles=T`
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
  `;Ds([g({type:Number})],rn.prototype,"power",2);rn=Ds([E("oig-grid-icon")],rn);var xh=Object.defineProperty,wh=Object.getOwnPropertyDescriptor,Mn=(e,t,i,r)=>{for(var n=r>1?void 0:r?wh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&xh(t,i,n),n};let bi=class extends D{constructor(){super(...arguments),this.power=0,this.maxPower=1e4,this.boilerActive=!1}get percent(){return Math.min(100,this.power/Math.max(1,this.maxPower)*100)}get fillColor(){const e=this.percent;return e<15?"#546e7a":e<40?"#f06292":e<70?"#e91e63":"#c62828"}get level(){const e=this.percent;return e<15?"low":e<60?"mid":"high"}get windowColor(){const e=this.level;return e==="low"?"#37474f":e==="mid"?"#ffd54f":"#ffb300"}render(){const e=this.percent,t=24,i=22,r=Math.max(1,e/100*t),n=i+(t-r),a=this.level;return c`
      <svg viewBox="0 0 48 48">
        <defs>
          <clipPath id="house-clip">
            <rect x="8" y="${i}" width="32" height="${t}" rx="1"/>
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
          x="8" y="${i}" width="32" height="${t}" rx="1"
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
        ${this.boilerActive?F`
          <circle class="boiler-dot" cx="10" cy="43" r="3.5" fill="#ff5722" opacity="0.9"/>
          <text x="10" y="43" text-anchor="middle" dominant-baseline="middle" font-size="5" fill="white">🔥</text>
        `:""}
      </svg>
    `}};bi.styles=T`
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
  `;Mn([g({type:Number})],bi.prototype,"power",2);Mn([g({type:Number})],bi.prototype,"maxPower",2);Mn([g({type:Boolean})],bi.prototype,"boilerActive",2);bi=Mn([E("oig-house-icon")],bi);var _h=Object.defineProperty,$h=Object.getOwnPropertyDescriptor,fr=(e,t,i,r)=>{for(var n=r>1?void 0:r?$h(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&_h(t,i,n),n};let jt=class extends D{constructor(){super(...arguments),this.mode="",this.bypassActive=!1,this.hasAlarm=!1,this.plannerAuto=!1}get modeType(){return this.hasAlarm?"alarm":this.bypassActive?"bypass":this.mode.includes("UPS")?"ups":"normal"}render(){const e=this.modeType;return c`
      <svg viewBox="0 0 48 48">
        <!-- Hlavní box střídače -->
        <rect
          class="box ${e}"
          x="4" y="8" width="40" height="34" rx="5"
        />

        <!-- Sinusoida výstupu -->
        <path class="sine-out ${e}" d="${"M 10,28 C 14,28 14,20 18,22 C 22,24 22,32 26,32 C 30,32 30,20 34,22 C 38,24 38,28 38,28"}"/>

        <!-- UPS blesk -->
        ${e==="ups"?F`
          <path class="ups-bolt active"
            d="M 25,12 L 20,26 L 24,26 L 23,36 L 28,22 L 24,22 Z"
          />
        `:""}

        <!-- Bypass výstraha — trojúhelník nahoře -->
        ${e==="bypass"?F`
          <polygon
            class="warning-triangle active"
            points="24,6 18,16 30,16"
          />
          <text x="24" y="15" text-anchor="middle" dominant-baseline="middle"
            font-size="6" font-weight="bold" fill="#fff">!</text>
        `:""}

        <!-- Alarm kroužek -->
        ${e==="alarm"?F`
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
    `}};jt.styles=T`
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
  `;fr([g({type:String})],jt.prototype,"mode",2);fr([g({type:Boolean})],jt.prototype,"bypassActive",2);fr([g({type:Boolean})],jt.prototype,"hasAlarm",2);fr([g({type:Boolean})],jt.prototype,"plannerAuto",2);jt=fr([E("oig-inverter-icon")],jt);var kh=Object.defineProperty,Ch=Object.getOwnPropertyDescriptor,Ze=(e,t,i,r)=>{for(var n=r>1?void 0:r?Ch(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&kh(t,i,n),n};const J=Q,Fo=new URLSearchParams(window.location.search),Mh=Fo.get("sn")||Fo.get("inverter_sn")||"",Sh=e=>`sensor.oig_${Mh}_${e}`,Jn="oig_v2_flow_layout_",ct=["solar","battery","inverter","grid","house"],Ah={solar:{top:"0%",left:"0%"},house:{top:"0%",left:"65%"},inverter:{top:"35%",left:"35%"},grid:{top:"70%",left:"0%"},battery:{top:"70%",left:"65%"}},Es="oig_v2_flow_expanded_nodes";function Lh(){try{const e=localStorage.getItem(Es);if(e)return new Set(JSON.parse(e))}catch{}return new Set(["solar","house"])}function Hh(e){try{localStorage.setItem(Es,JSON.stringify([...e]))}catch{}}function se(e){return()=>ee.openEntityDialog(Sh(e))}const Vh=1e3,nn=3300,Os=300;function Th(e){const[t,i,r]=e.map(v=>Math.max(0,isFinite(v)?v:0)),n=t+i+r,a=Math.max(t,i,r)-Math.min(t,i,r),o=n<Os,l=a<=Vh,p=Math.max(t,i,r)/nn*100,u=["L1","L2","L3"],h=[t,i,r].findIndex(v=>v>=nn),m=h>=0?u[h]:null;return{spreadW:a,balanced:l,calm:o,worstPct:p,overloadPhase:m}}function Ph(e,t){if(t<Os)return{leftPct:0,widthPct:0};const i=Math.min(...e),r=Math.max(...e);return{leftPct:i,widthPct:r-i}}let Fe=class extends D{constructor(){super(...arguments),this.data=_a,this.editMode=!1,this.pendingServices=new Map,this.changingServices=new Set,this.shieldStatus="idle",this.shieldQueueCount=0,this.gridDeliveryState={currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},this.shieldUnsub=null,this.expandedNodes=Lh(),this.gaugeDetailOpen=null,this.customPositions={},this.draggedNodeId=null,this.dragStartX=0,this.dragStartY=0,this.dragStartTop=0,this.dragStartLeft=0,this.onShieldUpdate=e=>{this.pendingServices=e.pendingServices,this.changingServices=e.changingServices,this.shieldStatus=e.status,this.shieldQueueCount=e.queueCount,this.gridDeliveryState=e.gridDeliveryState},this.nodeDims={},this.handleDragStart=e=>{if(!this.editMode)return;e.preventDefault(),e.stopPropagation();const i=e.target.closest(".node");if(!i)return;const r=this.findNodeId(i);if(!r)return;this.draggedNodeId=r,i.classList.add("dragging");const n=i.getBoundingClientRect();this.dragStartX=e.clientX,this.dragStartY=e.clientY,this.dragStartTop=n.top,this.dragStartLeft=n.left},this.handleTouchStart=e=>{if(!this.editMode)return;e.preventDefault();const i=e.target.closest(".node");if(!i)return;const r=this.findNodeId(i);if(!r)return;this.draggedNodeId=r,i.classList.add("dragging");const n=e.touches[0],a=i.getBoundingClientRect();this.dragStartX=n.clientX,this.dragStartY=n.clientY,this.dragStartTop=a.top,this.dragStartLeft=a.left},this.handleDragMove=e=>{!this.draggedNodeId||!this.editMode||(e.preventDefault(),this.updateDragPosition(e.clientX,e.clientY))},this.handleTouchMove=e=>{if(!this.draggedNodeId||!this.editMode)return;e.preventDefault();const t=e.touches[0];this.updateDragPosition(t.clientX,t.clientY)},this.handleDragEnd=e=>{var r;if(!this.draggedNodeId||!this.editMode)return;const t=(r=this.shadowRoot)==null?void 0:r.querySelector(".flow-grid"),i=t==null?void 0:t.querySelector(`.node-${this.draggedNodeId}`);i&&i.classList.remove("dragging"),this.saveLayout(),this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0})),this.draggedNodeId=null},this.handleTouchEnd=e=>{this.handleDragEnd(e)}}connectedCallback(){super.connectedCallback(),this.loadSavedLayout(),this.shieldUnsub=de.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),this.removeDragListeners(),(e=this.shieldUnsub)==null||e.call(this),this.shieldUnsub=null}updated(e){e.has("editMode")&&(this.editMode?(this.setAttribute("editmode",""),this.loadSavedLayout(),this.requestUpdate(),this.updateComplete.then(()=>this.applySavedPositions())):(this.removeAttribute("editmode"),this.removeDragListeners(),this.clearInlinePositions(),this.updateComplete.then(()=>this.applyCustomPositions()))),!this.editMode&&this.hasCustomLayout&&this.updateComplete.then(()=>this.applyCustomPositions()),this.measureNodes()}measureNodes(){var r;const e=(r=this.shadowRoot)==null?void 0:r.querySelector(".flow-grid");if(!e)return;let t=!1;const i={...this.nodeDims};for(const n of ct){const a=e.querySelector(`.node-${n}`);if(!a)continue;const o=Math.round(a.offsetWidth),l=Math.round(a.offsetHeight);if(o<10||l<10)continue;const d=i[n];(!d||Math.abs(d.w-o)>1||Math.abs(d.h-l)>1)&&(i[n]={w:o,h:l},t=!0)}t&&(this.nodeDims=i)}loadSavedLayout(){const e=ci(window.innerWidth),t=`${Jn}${e}`;try{const i=localStorage.getItem(t);i&&(this.customPositions=JSON.parse(i),L.debug("[FlowNode] Loaded layout for "+e))}catch{}}applySavedPositions(){var t;if(!this.editMode)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of ct){const r=this.customPositions[i];if(!r)continue;const n=e.querySelector(`.node-${i}`);n&&(n.style.top=r.top,n.style.left=r.left)}this.initDragListeners()}}clearInlinePositions(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of ct){const r=e.querySelector(`.node-${i}`);r&&(r.style.top="",r.style.left="")}}saveLayout(){const e=ci(window.innerWidth),t=`${Jn}${e}`;try{localStorage.setItem(t,JSON.stringify(this.customPositions)),L.debug("[FlowNode] Saved layout for "+e)}catch{}}toggleExpand(e,t){const i=t.target;if(i.closest(".clickable")||i.closest(".indicator")||i.closest(".node-value")||i.closest(".node-subvalue")||i.closest(".gc-plan-btn"))return;const r=new Set(this.expandedNodes);r.has(e)?r.delete(e):r.add(e),this.expandedNodes=r,Hh(r)}nodeClass(e,t=""){const i=this.expandedNodes.has(e)?" expanded":"";return`node node-${e}${i}${t?" "+t:""}`}gaugePill(e,t,i,r){const n=this.gaugeDetailOpen===e;return c`
      <button class="ss-pill" style="color:${i};border-color:${i}55"
        @click=${a=>{a.stopPropagation(),this.gaugeDetailOpen=n?null:e}}>${t}</button>
      ${n?c`
        <div class="ss-pop" style="border-color:${i}66"
          @click=${a=>a.stopPropagation()}>${r}</div>`:w}
    `}edgeGauge(e){const t=Math.max(0,Math.min(100,e.pct)),i=Math.max(1.5,Math.min(6,e.width??2.5)),r=e.nodeId?this.nodeDims[e.nodeId]:void 0,n=(r==null?void 0:r.w)??180,a=(r==null?void 0:r.h)??180,o=1.5,l=e.full?0:100-t,d=e.stops.map(([u,h])=>F`<stop offset="${u}" stop-color="${h}"></stop>`),p=e.pulseDur?`--pulse-dur:${e.pulseDur}s`:"";return F`
      <svg class="edge-gauge ${e.pulse?"pulse":""}" viewBox="0 0 ${n} ${a}"
        preserveAspectRatio="none" style=${p}>
        <defs>
          <linearGradient id=${e.id} x1="0" y1="1" x2="0" y2="0">${d}</linearGradient>
        </defs>
        <rect class="edge-track" x=${o} y=${o}
          width=${n-o*2} height=${a-o*2} rx="10.5"></rect>
        <rect class="edge-fill" x=${o} y=${o}
          width=${n-o*2} height=${a-o*2} rx="10.5"
          stroke=${`url(#${e.id})`} stroke-width=${i} pathLength="100"
          stroke-dasharray="100" stroke-dashoffset=${l}></rect>
      </svg>`}edgeGaugeSegments(e){const t=Math.max(1.5,Math.min(6,e.width??3.5)),i=this.nodeDims[e.nodeId],r=(i==null?void 0:i.w)??180,n=(i==null?void 0:i.h)??180,a=1.5,o=10.5,l=e.segments.filter(u=>u.frac>.001);let d=0;const p=l.map(u=>{const h=-d;return d+=u.frac,F`<rect x=${a} y=${a}
        width=${r-a*2} height=${n-a*2} rx=${o}
        fill="none" stroke=${u.color} stroke-width=${t}
        pathLength="100"
        stroke-dasharray="${u.frac} 100"
        stroke-dashoffset="${h}"></rect>`});return F`
      <svg class="edge-gauge" viewBox="0 0 ${r} ${n}" preserveAspectRatio="none">
        <rect class="edge-track" x=${a} y=${a}
          width=${r-a*2} height=${n-a*2} rx=${o}></rect>
        ${p}
      </svg>`}get hasCustomLayout(){return ct.some(e=>{const t=this.customPositions[e];return(t==null?void 0:t.top)!=null&&(t==null?void 0:t.left)!=null})}applyCustomPositions(){var t;if(this.editMode||!this.hasCustomLayout)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of ct){const r=e.querySelector(`.node-${i}`);if(!r)continue;const n=this.customPositions[i]??Ah[i];r.style.top=n.top,r.style.left=n.left}}resetLayout(){const e=ci(window.innerWidth),t=`${Jn}${e}`;localStorage.removeItem(t),this.customPositions={},this.clearInlinePositions(),this.editMode&&this.requestUpdate(),L.debug("[FlowNode] Reset layout for "+e)}initDragListeners(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of ct){const r=e.querySelector(`.node-${i}`);r&&(r.addEventListener("mousedown",this.handleDragStart),r.addEventListener("touchstart",this.handleTouchStart,{passive:!1}))}document.addEventListener("mousemove",this.handleDragMove),document.addEventListener("mouseup",this.handleDragEnd),document.addEventListener("touchmove",this.handleTouchMove,{passive:!1}),document.addEventListener("touchend",this.handleTouchEnd)}}removeDragListeners(){document.removeEventListener("mousemove",this.handleDragMove),document.removeEventListener("mouseup",this.handleDragEnd),document.removeEventListener("touchmove",this.handleTouchMove),document.removeEventListener("touchend",this.handleTouchEnd)}findNodeId(e){for(const i of ct)if(e.classList.contains(`node-${i}`))return i;const t=e.closest('[class*="node-"]');if(!t)return null;for(const i of ct)if(t.classList.contains(`node-${i}`))return i;return null}updateDragPosition(e,t){var _;if(!this.draggedNodeId)return;const i=(_=this.shadowRoot)==null?void 0:_.querySelector(".flow-grid");if(!i)return;const r=i.querySelector(`.node-${this.draggedNodeId}`);if(!r)return;const n=i.getBoundingClientRect(),a=r.getBoundingClientRect(),o=e-this.dragStartX,l=t-this.dragStartY,d=this.dragStartLeft+o,p=this.dragStartTop+l,u=n.left,h=n.right-a.width,m=n.top,v=n.bottom-a.height,f=Math.max(u,Math.min(h,d)),b=Math.max(m,Math.min(v,p)),$=(f-n.left)/n.width*100,y=(b-n.top)/n.height*100;r.style.left=`${$}%`,r.style.top=`${y}%`,this.customPositions[this.draggedNodeId]={top:`${y}%`,left:`${$}%`},this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0}))}renderSolar(){const e=this.data,t=V=>V>=1e3?`${(V/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(V)} W`,i=e.solarPercent,r=e.solarPower<5,n=r?"linear-gradient(160deg,#1a1f30,#161a28)":Bi.solar,a="transparent",o=e.solarToday/1e3,l=e.solarForecastToday>.1?e.solarForecastToday:o,d=Math.max(0,l-o),p=Math.max(0,o-l),u=p>.05,h=l>0?Math.round(o/l*100):100,m=Math.max(l,o,.1),v=Math.min(100,o/m*100),f=l/m*100,b=e.solarPower/1e3,$=r?"#5c6bc0":i<20?"#ff7043":i<50?"#ffa726":"#ffd54f",y=r?0:i,_=r?"#5a6480":$,S=r?"#9fa8da":$,B=r?"🌙 Noc":`${Math.round(i)} %`,P=u?"linear-gradient(90deg,#ffd54f,#66bb6a)":r?"linear-gradient(90deg,#6b7390,#8a93b5)":"linear-gradient(90deg,#ffd54f,#ffa726)",N=e.solarP1>0||e.solarV1>0,k=e.solarP2>0||e.solarV2>0,A=r?c`0 <small>W</small>`:(()=>{const V=e.solarPower;return V>=1e3?c`${(V/1e3).toFixed(1).replace(".",",")} <small>kW</small>`:c`${Math.round(V)} <small>W</small>`})();return c`
      <div class="${this.nodeClass("solar",r?"sol-night":"")}"
        style="--node-gradient: ${n}; --node-border: ${a};">

        ${this.edgeGauge({id:"gauge-solar",nodeId:"solar",pct:y,stops:[[0,_],[1,_]],width:r?2:2+Math.min(3,b),pulse:!r&&e.solarPower>30,pulseDur:Math.max(.9,2.2-b*.35),full:r})}

        <div class="node-tint" style="background: radial-gradient(120% 70% at 50% 0, ${r?"rgba(57,73,171,0.18)":$+"22"}, transparent 70%)"></div>

        <!-- GAUGE PILL: peak % špičky or 🌙 Noc -->
        ${this.gaugePill("solar",B,S,c`
          <div class="ss-pop-h"><span>Solární výkon</span><b style="color:${S}">${r?"🌙 Noc":`${Math.round(i)} % špičky`}</b></div>
          <div class="gp-r"><span>Aktuální výkon</span><b>${r?"0 W":`${Vt(e.solarPower)} · ${Math.round(i)} % špičky`}</b></div>
          <div class="gp-r"><span>Vyrobeno</span><b>${o.toFixed(1).replace(".",",")} kWh</b></div>
          <div class="gp-r"><span>Předpověď</span><b>${l.toFixed(1).replace(".",",")} kWh</b></div>
          <div class="gp-r"><span>${u?"Nad plánem":"Ještě vyrobí"}</span><b>${u?`+${p.toFixed(1).replace(".",",")} kWh`:r?"den skončil":d<.05?"splněno":`~${d.toFixed(1).replace(".",",")} kWh`}</b></div>
          <div class="gp-r"><span>Zítra</span><b>${e.solarForecastTomorrow.toFixed(1).replace(".",",")} kWh${e.solarForecastStale?" ⚠":""}</b></div>
        `)}

        <!-- HEADER: animated sun SVG by day / moon SVG at night -->
        <div class="sol-head">
          ${r?F`<svg class="sol-ico" viewBox="0 0 24 24" fill="none" stroke="#9fa8da" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 14.5A8 8 0 1 1 9.5 4 6.2 6.2 0 0 0 20 14.5z" fill="#2a3050"/>
              </svg>`:F`<svg class="sol-ico" viewBox="0 0 24 24" fill="none" stroke="${$}" stroke-width="2" stroke-linecap="round">
                <g class="sol-rays"><path d="M12 1.5v2.5M12 20v2.5M1.5 12h2.5M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8"/></g>
                <circle class="sol-core" cx="12" cy="12" r="4.2" fill="${$}" stroke="none"/>
              </svg>`}
          <span class="sol-cap">SOLÁR</span>
        </div>

        <!-- BIG CURRENT POWER -->
        <div class="sol-power" @click=${se("actual_fv_total")}>
          ${A}
        </div>

        <!-- TINY SUBLINE: dnes X z Y kWh -->
        <div class="sol-sub" @click=${se("dc_in_fv_ad")}>
          dnes ${o.toFixed(1).replace(".",",")} z ${l.toFixed(1).replace(".",",")} kWh
        </div>

        <!-- PRODUCTION BAR: fill = vyrobeno, target tick = plán, přerůstá nad plán -->
        <div class="sol-pbar">
          <div class="sol-pbar-fill" style="width:${v.toFixed(1)}%;background:${P}">
            ${v>=30?`${o.toFixed(1).replace(".",",")} kWh`:""}
          </div>
          ${u?c`<div class="sol-pbar-tick" style="left:${f.toFixed(1)}%" title="Plán ${l.toFixed(1).replace(".",",")} kWh"></div>`:w}
        </div>
        <div class="sol-pbar-lbl">
          <span>vyrobeno ${h} %</span>
          <span>${u?c`<span class="sol-over">+${p.toFixed(1).replace(".",",")} kWh</span>`:r?"den skončil":d<.05?"splněno":`ještě ~${d.toFixed(1).replace(".",",")} kWh`}</span>
        </div>

        <!-- COMPACT STRINGS (always visible, 2-col) -->
        <div class="sol-str">
          <div class="sol-sc ${N?"":"sol-off"}">
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
        <div class="sol-tmr" @click=${se("solar_forecast")}>
          ${F`<svg class="sol-tmr-ico" viewBox="0 0 24 24" fill="none" stroke="#ffd479" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18h18"></path><path d="M7 18a5 5 0 0 1 10 0"></path><path d="M12 5v2M5.6 8.6l1.4 1.4M18.4 8.6l-1.4 1.4M2.5 13h2M19.5 13h2"></path></svg>`}
          Zítra <b>${e.solarForecastTomorrow.toFixed(1).replace(".",",")} kWh</b>
          ${e.solarForecastStale?c`<span title="Předpověď zastaralá">⚠</span>`:w}
        </div>
      </div>
    `}getBalancingIndicator(){const e=this.data,t=e.balancingState;return t!=="charging"&&t!=="holding"&&t!=="completed"?{show:!1,text:"",icon:"",cls:""}:t==="charging"?{show:!0,text:`Nabíjení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⚡",cls:"charging"}:t==="holding"?{show:!0,text:`Držení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⏸️",cls:"holding"}:{show:!0,text:"Dokončeno",icon:"✅",cls:"completed"}}batteryIconDefs(){return F`
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
      </defs></svg>`}renderBattery(){const e=this.data,t=this.getBalancingIndicator(),i=e.batteryTemp>35?"bt-hot":e.batteryTemp<10?"bt-cold":"",r=Math.abs(e.batteryPower)/1e3,n=Math.abs(e.batteryPower)>10,a=e.batteryPower>10,o=e.batteryPower<-10,l=a?"Nabíjí":o?"Vybíjí":"Klid",d=a?"bt-chg":o?"bt-dis":"",p=A=>!!A&&/\d/.test(A),h=(a&&p(e.timeToFull)?e.timeToFull:o&&p(e.timeToEmpty)?e.timeToEmpty:"").replace(/\s*hodin[aquy]*/gi," h").replace(/\s*minut[ay]*/gi," min").replace(/\s+/g," ").trim(),m=Math.round(e.batterySoC),v=m>=66?"rgba(67,160,71,0.13)":m>=33?"rgba(253,216,53,0.10)":"rgba(229,57,53,0.12)",f=m>=66?"#43a047":m>=33?"#fdd835":"#e53935",b=Math.round(e.batteryFloorPct),$=A=>A.toFixed(1).replace(".",","),y=Math.max(0,(e.batterySoC-e.batteryFloorPct)/100)*e.batteryInstalledKwh,_=Math.max(0,(e.housePower-e.solarPower)/1e3);let S;if(y<=.05)S="0 h";else if(_<=.05)S="∞";else{const A=y/_;if(A>=24)S="> 24 h";else if(A>=10)S=`${Math.round(A)} h`;else if(A>=1){const V=Math.floor(A);S=`${V} h ${Math.round((A-V)*60)} min`}else S=`${Math.max(1,Math.round(A*60))} min`}const B=e.batteryChargeSolar+e.batteryChargeGrid,P=B>0?e.batteryChargeSolar/B*100:0,N=100-P,k=e.batterySoH>=90?"#9fe6a8":e.batterySoH>=75?"#ffcc80":"#ff8a80";return c`
      <div class="${this.nodeClass("battery")}" style="--node-gradient: ${Bi.battery}; --node-border: ${Br.battery};"
        @click=${A=>this.toggleExpand("battery",A)}>

        ${this.batteryIconDefs()}

        ${this.edgeGauge({id:"gauge-battery",nodeId:"battery",pct:e.batterySoC,stops:[[0,"#e53935"],[.45,"#fb8c00"],[.7,"#fdd835"],[1,"#43a047"]],width:2+Math.min(3,r),pulse:n,pulseDur:Math.max(.9,2.2-r*.35)})}

        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 100%, ${v}, transparent 72%)"></div>

        ${this.gaugePill("battery",`${m} %`,f,c`
          <div class="ss-pop-h"><span>Nabití baterie</span><b style="color:${f}">${m} % · ${$(e.batteryUsableKwh)} kWh</b></div>
          <div class="gp-r"><span>Stav</span><b>${l}${n?` ${Vt(Math.abs(e.batteryPower))}`:""}</b></div>
          ${h?c`<div class="gp-r"><span>${a?"Do plna":"Do vybití"}</span><b>${h}</b></div>`:w}
          <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px"><span>Kapacita</span><b>${$(e.batteryUsableKwh)} / ${$(e.batteryInstalledKwh)} kWh</b></div>
          <div class="gp-r"><span>Do plna chybí</span><b>${$(e.batteryMissingKwh)} kWh</b></div>
          <div class="gp-r"><span>Podlaha</span><b>${b} %</b></div>
          <div class="gp-r"><span>Zdraví (SoH)</span><b style="color:${k}">${Math.round(e.batterySoH)} %</b></div>
          <div class="gp-r"><span>Účinnost</span><b>${e.batteryEfficiency.toFixed(1).replace(".",",")} %</b></div>
          <div class="gp-r"><span>Predikce kapacity</span><b>${$(e.batteryForecastKwh)} kWh</b></div>
          <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px"><span>Nabito dnes / měsíc</span><b>${ii(e.batteryChargeTotal)} / ${ii(e.batteryChargeMonth)}</b></div>
          <div class="gp-r"><span>Vybito dnes / měsíc</span><b>${ii(e.batteryDischargeTotal)} / ${ii(e.batteryDischargeMonth)}</b></div>
          ${t.show?c`<div class="gp-r"><span>Vyrovnávání</span><b>${t.icon} ${t.text}</b></div>`:w}
        `)}

        <!-- HEADER: battery · BATERIE · SoH badge -->
        <div class="bt-head">
          ${F`<svg class="bt-head-ico" viewBox="0 0 24 24" fill="none" stroke="#cfe0ff" stroke-width="2" stroke-linejoin="round">
            <rect x="4" y="7" width="15" height="10" rx="2"/><path d="M21 10v4"/>
            <rect x="6" y="9.5" width="${Math.max(1,m/100*11).toFixed(1)}" height="5" rx="1" fill="${f}" stroke="none"/>
          </svg>`}
          <span class="bt-cap">BATERIE</span>
          <button class="bt-soh" style="color:${k};border-color:${k}66;background:${k}1f"
            @click=${se("battery_health")} title="Zdraví baterie (SoH)">
            ${F`<svg viewBox="0 0 24 24"><use href="#bt-heart"/></svg>`} ${Math.round(e.batterySoH)} %
          </button>
        </div>

        <!-- HERO: power + direction -->
        <div class="bt-pure">
          <button class="bt-pn" @click=${se("batt_batt_comp_p")}>${this.fmtKwGrid(Math.abs(e.batteryPower))}</button>
          <div class="bt-pd ${d}">
            ${a?c`${F`<svg class="bt-ic" viewBox="0 0 24 24"><use href="#bt-up"/></svg>`} Nabíjí`:o?c`${F`<svg class="bt-ic" viewBox="0 0 24 24"><use href="#bt-dn"/></svg>`} Vybíjí`:"◉ Klid"}
          </div>
        </div>

        <!-- SoC: backup autonomy (hero) + usable kWh above floor + bar -->
        <div class="bt-soc">
          <div class="bt-soctop">
            <div class="bt-aut" title="Kdyby teď vypadla síť: použitelné kWh nad podlahou / (zálohová spotřeba − FVE)">
              ${F`<svg class="bt-aut-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><use href="#bt-clock"/></svg>`}
              <div><div class="bt-aut-lbl">vydrží</div><div class="bt-aut-v ${y<=.05?"bt-dis":""}">${S}</div></div>
            </div>
            <button class="bt-use" @click=${se("usable_battery_capacity")}>
              <span class="bt-use-lbl">využitelných</span>
              <span class="bt-use-v">${$(y)} <small>kWh</small></span>
            </button>
          </div>
          <div class="bt-socbar">
            ${b>0?c`<div class="bt-socres" style="width:${b}%"></div>`:w}
            <div class="bt-socfill" style="width:${m}%;background:${f}"></div>
            ${b>0?c`<div class="bt-socfloor" style="left:${b}%" title="Podlaha ${b} %">
              ${F`<svg viewBox="0 0 24 24"><use href="#bt-floor"/></svg>`}</div>`:w}
          </div>
          <div class="bt-socsc"><span>0 %</span>${b>0?c`<span class="bt-fl">podlaha ${b} %</span>`:w}<span>100 %</span></div>
        </div>

        <!-- TODAY: charge (FVE/grid split) · discharge -->
        <div class="bt-today">
          <button class="bt-tc" @click=${se("computed_batt_charge_energy_today")}>
            <div class="bt-tch bt-chg">${F`<svg class="bt-ic" viewBox="0 0 24 24"><use href="#bt-up"/></svg>`} ${$(e.batteryChargeTotal/1e3)} <small>kWh</small></div>
            ${B>0?c`
              <div class="bt-split"><div class="bt-sp-fve" style="width:${P.toFixed(0)}%"></div><div class="bt-sp-grid" style="width:${N.toFixed(0)}%"></div></div>
              <div class="bt-splitleg">
                <span style="color:#ffd54f">${F`<svg viewBox="0 0 24 24"><use href="#bt-sun"/></svg>`} ${$(e.batteryChargeSolar/1e3)}</span>
                <span style="color:#fb8c00">${F`<svg viewBox="0 0 24 24"><use href="#bt-plug"/></svg>`} ${$(e.batteryChargeGrid/1e3)}</span>
              </div>`:w}
          </button>
          <button class="bt-tc" @click=${se("computed_batt_discharge_energy_today")}>
            <div class="bt-tch bt-dis">${F`<svg class="bt-ic" viewBox="0 0 24 24"><use href="#bt-dn"/></svg>`} ${$(e.batteryDischargeTotal/1e3)} <small>kWh</small></div>
            <div class="bt-tc-mid">${F`<svg viewBox="0 0 24 24"><use href="#bt-home"/></svg>`}</div>
          </button>
        </div>

        <!-- METRICS: voltage · current · temperature -->
        <div class="bt-met">
          <button @click=${se("extended_battery_voltage")}>${F`<svg viewBox="0 0 24 24"><use href="#bt-bolt"/></svg>`} ${e.batteryVoltage.toFixed(1).replace(".",",")} V</button>
          <button @click=${se("extended_battery_current")}>${F`<svg viewBox="0 0 24 24"><use href="#bt-amp"/></svg>`} ${Math.abs(e.batteryCurrent).toFixed(1).replace(".",",")} A</button>
          <button class="${i}" @click=${se("extended_battery_temperature")}>${F`<svg viewBox="0 0 24 24"><use href="#bt-temp"/></svg>`} ${e.batteryTemp.toFixed(1).replace(".",",")} °C</button>
        </div>
      </div>
    `}getInverterModeDesc(){const e=this.data.inverterMode;return e.includes("Home 1")?"Max baterie + FVE":e.includes("Home 2")?"Šetří baterii":e.includes("Home 3")?"Priorita nabíjení":e.includes("UPS")?"Vše ze sítě":""}inverterIconDefs(){return F`
      <svg width="0" height="0" style="position:absolute;pointer-events:none"><defs>
        <g id="iv-cog"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM3 12h2M19 12h2M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g>
        <g id="iv-bolt"><path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor"/></g>
        <g id="iv-swap"><path d="M7 7h11l-3-3M17 17H6l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g id="iv-exp"><path d="M4 20h16M12 16V6M8 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g id="iv-bot"><rect x="4" y="8" width="16" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4v4M8.5 13h.01M15.5 13h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></g>
        <g id="iv-bell"><path d="M6 9a6 6 0 0 1 12 0c0 7 2 8 2 8H4s2-1 2-8M10 21a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g id="iv-warn"><path d="M12 3l9 16H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v4M12 17h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></g>
      </defs></svg>`}renderInverter(){const e=this.data,t=ro(e.inverterMode),i=e.bypassStatus.toLowerCase()==="on"||e.bypassStatus==="1",r=ph(this.pendingServices,this.changingServices),n=dh(this.gridDeliveryState),a=e.inverterMode,o=a.includes("UPS")?"#ffa726":a.includes("Home 2")?"#42a5f5":a.includes("Home 3")?"#ba68c8":"#5cc46a",l=e.inverterTemp>=45?"#e53935":e.inverterTemp>=35?"#ffa726":"#43a047",d=Math.max(0,Math.min(100,e.inverterTemp/55*100)),p=i?"#e53935":l,u=e.plannerAutoMode,h=u===!0?"řídí · AUTO":u===!1?"VYPNUTO":"N/A",m=u===!0?"iv-plan-auto":"iv-plan-off",v=e.plannerRecommendedMode?ro(e.plannerRecommendedMode):null,f=!!v&&!!v.text&&v.text!==t.text,b=e.inverterGridMode,$=b==="limited"?this.fmtKwGrid(e.inverterGridLimit):b==="on"?"Zap":b==="off"?"Vyp":"—",y=b==="on"?"iv-ok":b==="limited"?"iv-warn":"iv-off",_=this.getInverterModeDesc(),S=this.shieldStatus==="running"?`Zpracovávám${this.shieldQueueCount>0?` (${this.shieldQueueCount})`:""}`:"Nečinný",B=(k,A,V,q)=>k===1?A:k>=2&&k<=4?V:q,P=B(e.notificationsError,"chyba","chyby","chyb"),N=B(e.notificationsUnread,"nepřečtená","nepřečtené","nepřečtených");return c`
      <div class="${this.nodeClass("inverter",r.inverterModeChanging?"mode-changing":"")}" style="--node-gradient: ${Bi.inverter}; --node-border: ${Br.inverter};"
        @click=${k=>this.toggleExpand("inverter",k)}>

        ${this.inverterIconDefs()}

        ${this.edgeGauge({id:"gauge-inverter",nodeId:"inverter",pct:i?100:d,stops:[[0,p],[1,p]],width:i?4:2.5,pulse:i,pulseDur:1.1})}
        <div class="node-tint" style="background: radial-gradient(120% 90% at 50% 0, ${o}22, transparent 72%)"></div>

        ${this.gaugePill("inverter",i?"⚠ BYPASS":`${e.inverterTemp.toFixed(0)} °C`,p,c`
          <div class="ss-pop-h"><span>Střídač</span><b style="color:${o}">${t.text}</b></div>
          <div class="gp-r"><span>Teplota</span><b style="color:${l}">${e.inverterTemp.toFixed(1)} °C</b></div>
          <div class="gp-r"><span>Bypass</span><b style="color:${i?"#ff8a80":"inherit"}">${i?"AKTIVNÍ":"Vypnutý"}</b></div>
          ${_?c`<div class="gp-r"><span>Režim</span><b>${_}</b></div>`:w}
          <div class="gp-r"><span>Dodávka</span><b>${n.currentModeText}${b==="limited"?` · ${this.fmtKwGrid(e.inverterGridLimit)}`:""}</b></div>
          <div class="gp-r"><span>Plánovač</span><b>${h}${f?` · doporučuje ${v.text}`:""}</b></div>
          <div class="gp-r"><span>Shield</span><b>${S}</b></div>
        `)}

        <!-- HEADER: ⚙️ STŘÍDAČ · bypass badge (when active) -->
        <div class="iv-head">
          ${F`<svg class="iv-head-ico" viewBox="0 0 24 24" fill="none" stroke="#cfe0ff" stroke-width="2"><use href="#iv-cog"/></svg>`}
          <span class="iv-cap">STŘÍDAČ</span>
          ${i?c`<span class="iv-bpbadge">${F`<svg viewBox="0 0 24 24"><use href="#iv-warn"/></svg>`} BYPASS</span>`:w}
        </div>

        <!-- HERO: working mode + description -->
        <div class="iv-mode">
          <button class="iv-mn" style="color:${o}" @click=${se("box_prms_mode")}>
            ${r.inverterModeChanging?c`<span class="spinner spinner--small"></span>`:F`<svg class="iv-ic" viewBox="0 0 24 24"><use href="#iv-bolt"/></svg>`}
            ${t.text}
          </button>
          ${_?c`<div class="iv-md">${_}</div>`:w}
          ${r.inverterModeText?c`<div class="pending-text">${r.inverterModeText}</div>`:w}
        </div>

        <!-- PLANNER chip -->
        <div class="iv-plan ${m}">
          ${F`<svg viewBox="0 0 24 24"><use href="#iv-bot"/></svg>`} Plánovač ${h}${f?c`<span class="iv-rec"> · doporučuje ${v.text}</span>`:w}
        </div>

        <!-- STATUS strip: Bypass · Dodávka -->
        <div class="iv-strip">
          <button class="iv-sp" @click=${se("bypass_status")}>
            <div class="iv-spl">${F`<svg viewBox="0 0 24 24"><use href="#iv-swap"/></svg>`} Bypass</div>
            <div class="iv-spv ${i?"iv-bad":"iv-ok"}">${i?"ZAP":"Vyp"}</div>
          </button>
          <button class="iv-sp" @click=${se(b==="limited"?"invertor_prm1_p_max_feed_grid":"invertor_prms_to_grid")}>
            <div class="iv-spl">${F`<svg viewBox="0 0 24 24"><use href="#iv-exp"/></svg>`} Dodávka</div>
            <div class="iv-spv ${y}">${$}</div>
          </button>
        </div>

        <!-- NOTIFICATIONS -->
        <button class="iv-notif ${e.notificationsError>0?"warn":""}" @click=${se("notification_count_unread")}>
          ${e.notificationsError>0?c`${F`<svg viewBox="0 0 24 24"><use href="#iv-warn"/></svg>`} ${e.notificationsError} ${P} · ${e.notificationsUnread} ${N}`:e.notificationsUnread>0?c`${F`<svg viewBox="0 0 24 24"><use href="#iv-bell"/></svg>`} ${e.notificationsUnread} ${N}`:c`${F`<svg viewBox="0 0 24 24"><use href="#iv-bell"/></svg>`} Bez notifikací`}
        </button>

        ${n.pendingModeText?c`
          <div class="pending-overlay"><span class="spinner spinner--small"></span>${n.pendingModeText}</div>
        `:w}
        ${n.pendingLimitText?c`
          <div class="pending-overlay"><span class="spinner spinner--small"></span>${n.pendingLimitText}</div>
        `:w}
      </div>
    `}gridIconDefs(){return F`
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
      </svg>`}iImp(){return F`<svg class="gd-ic" viewBox="0 0 24 24"><use href="#gi-imp"/></svg>`}iExp(){return F`<svg class="gd-ic" viewBox="0 0 24 24"><use href="#gi-exp"/></svg>`}fmtKwGrid(e){const t=Math.abs(e);return t>=1e3?`${(t/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(t)} W`}renderGrid(){var Er,Or;const e=this.data,t=[e.gridL1P,e.gridL2P,e.gridL3P],i=t.some(M=>M>10),r=t.some(M=>M<-10),n=i&&r,a=i&&!r,o=r&&!i,l=t.reduce((M,oe)=>M+oe,0),d=Math.abs(l),p=t.filter(M=>M>0).reduce((M,oe)=>M+oe,0),u=t.filter(M=>M<0).reduce((M,oe)=>M+Math.abs(oe),0),h=d/1e3,m=e.gridImportCostToday!==null||e.gridExportEarningsToday!==null,v=e.gridImportCostToday??0,f=e.gridExportEarningsToday??0,b=f-v,$=(e.gridExportEarningsMonth??0)-(e.gridImportCostMonth??0),y=b>=0?"#9fe6a8":"#ff8a80",_=M=>M.toFixed(2).replace(".",","),S=M=>(M>=0?"+":"−")+_(Math.abs(M)),B=25*230*3,P=e.inverterGridLimit>0?e.inverterGridLimit:5e3,N=o?d/P*100:d/B*100,k=M=>M>=1e3?`${(M/1e3).toFixed(1).replace(".",",")}k`:M>=10?`${Math.round(M)}`:M.toFixed(1).replace(".",","),A=M=>{const oe=M<0;return{txt:(oe?"−":"")+k(Math.abs(M)),cls:oe?"gd-col-imp":"gd-col-exp",earn:!oe}},V=M=>{const oe=M<0;return{txt:(oe?"+":"")+k(Math.abs(M)),cls:oe?"gd-col-exp":"gd-col-imp",earn:oe}},q=A(f),K=A(e.gridExportEarningsMonth??0),Z=V(v),j=V(e.gridImportCostMonth??0),Pe=e.spotPrice<=2?"gd-col-exp":e.spotPrice<=4?"gd-col-warn":"gd-col-imp",Ne=e.exportPrice>=2?"gd-col-exp":e.exportPrice>=.5?"gd-col-warn":"gd-col-imp",X=207,he=253,C=212,Y=248,re=[{v:e.gridL1V,label:"L1",entity:"ac_in_aci_vr"},{v:e.gridL2V,label:"L2",entity:"ac_in_aci_vs"},{v:e.gridL3V,label:"L3",entity:"ac_in_aci_vt"}],Ae=re.filter(M=>M.v>0),Le=Ae.length>0,Ee=Le?Ae.reduce((M,oe)=>M+oe.v,0)/Ae.length:230,Tn=Le?Math.min(...Ae.map(M=>M.v)):230,Pn=Le?Math.max(...Ae.map(M=>M.v)):230,Cr=Math.max((Pn-Tn)/2+1.5,2.5),Ct=Ee-Cr,Xt=Ee+Cr,Mr=Xt-Ct,zn=M=>M<X||M>he?"crit":M<C||M>Y?"warn":"ok",Sr=M=>Math.max(0,Math.min(100,(M-Ct)/Mr*100));let Mt=re.map((M,oe)=>({...M,sev:M.v>0?zn(M.v):"na",pct:M.v>0?Sr(M.v):50,lcls:`l${oe+1}`,below:!1}));const Ar=Mt.filter(M=>M.v>0).slice().sort((M,oe)=>M.pct-oe.pct),Lr=Ar.length===3?Ar[1].pct:null;Mt=Mt.map(M=>({...M,below:M.v>0&&Lr!==null&&M.pct===Lr}));const Jt=M=>M<X||M>he?"rgba(229,57,53,.6)":M<C||M>Y?"rgba(255,167,38,.55)":"rgba(76,175,80,.4)",Dn=[X,C,Y,he].filter(M=>M>Ct&&M<Xt),zi=[`${Jt(Ct+.001)} 0%`];for(const M of Dn){const oe=Sr(M).toFixed(1);zi.push(`${Jt(M-.001)} ${oe}%`,`${Jt(M+.001)} ${oe}%`)}zi.push(`${Jt(Xt-.001)} 100%`);const En=`linear-gradient(90deg, ${zi.join(", ")})`,St=e.gridFrequency>0?Math.abs(e.gridFrequency-50):0,On=e.gridFrequency>0&&St>.5,Hr=e.gridFrequency>0&&St>.2,Fn=On?"gd-hz crit":Hr?"gd-hz warn":"gd-hz",Vr=e.currentTariff==="VT"||((Er=e.currentTariff)==null?void 0:Er.includes("vysoký")),Tr=e.currentTariff==="NT"||((Or=e.currentTariff)==null?void 0:Or.includes("nízký")),Pr=Vr?"gd-tar vt":Tr?"gd-tar nt":"gd-tar",In=Vr?"VT":Tr?"NT":e.currentTariff||"--",Bn=Math.max(0,...t.filter(M=>M>0)),zr=Math.max(0,...t.filter(M=>M<0).map(Math.abs)),Dr=Math.max(50,Bn+zr),ei=zr/Dr*100,Nn=c`
      <div class="ss-pop-h"><span>Bilance dnes</span>
        <b style="color:${y}">${S(b)} Kč</b></div>
      <div class="gp-r"><span>Výdělek z dodávky</span><b class="gd-col-exp">${_(f)} Kč</b></div>
      <div class="gp-r"><span>Náklad za odběr</span><b class="gd-col-imp">${_(v)} Kč</b></div>
      ${e.gridImportCostMonth!==null||e.gridExportEarningsMonth!==null?c`
        <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px">
          <span>Bilance měsíc</span><b style="color:${$>=0?"#9fe6a8":"#ff8a80"}">${S($)} Kč</b></div>
      `:w}
      <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px">
        <span>Odběr dnes</span><b class="gd-col-imp">${ii(e.gridImportToday)}</b></div>
      <div class="gp-r"><span>Dodávka dnes</span><b class="gd-col-exp">${ii(e.gridExportToday)}</b></div>
      ${Le?c`<div class="gp-r"><span>Napětí fází</span><b>${re.map(M=>M.v>0?M.v.toFixed(0):"–").join(" · ")} V</b></div>`:w}
      <div class="gp-r"><span>Frekvence</span><b>${e.gridFrequency>0?e.gridFrequency.toFixed(2):"–"} Hz</b></div>
    `;return c`
      <div class="${this.nodeClass("grid")}" style="--node-gradient: ${Bi.grid}; --node-border: ${Br.grid};"
        @click=${M=>this.toggleExpand("grid",M)}>

        ${this.gridIconDefs()}

        ${this.edgeGauge({id:"gauge-grid",nodeId:"grid",pct:m?100:N,stops:[[0,y],[1,y]],width:m?3:2+Math.min(3,h),pulse:i||r,pulseDur:Math.max(.9,2.2-h*.35)})}

        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 50%, ${y}22, transparent 72%)"></div>

        ${this.gaugePill("grid",m?`${S(b)} Kč`:`${Math.round(N)} %`,y,Nn)}

        <!-- ── HEADER: frequency (left) · SÍŤ · tariff (right) ── -->
        <div class="gd-head" style="margin-top:16px">
          ${e.gridFrequency>0?c`
            <button class="${Fn}" @click=${se("ac_in_aci_f")}>
              ${Hr?"⚠":"⚡"} ${e.gridFrequency.toFixed(2)} Hz
            </button>`:w}
          ${F`<svg class="gd-head-ico" viewBox="0 0 24 24" fill="none" stroke="#cfe0ff" stroke-width="2" stroke-linejoin="round">
            <path d="M12 2v20M5 6l7-4 7 4M5 6v5l7 4 7-4V6M5 16l7 4 7-4"/>
          </svg>`}
          <span class="gd-cap">SÍŤ</span>
          <button class="${Pr}" @click=${se("current_tariff")}>
            ${F`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/></svg>`}
            ${In}
          </button>
        </div>

        <!-- ── POWER / DIRECTION (3 states) ── -->
        ${n?c`
          <div class="gd-combo">
            <div class="gd-cside gd-col-exp">
              ${this.iExp()} ${this.fmtKwGrid(u)}
            </div>
            <button class="gd-cbal ${l>=0?"gd-col-imp":"gd-col-exp"}" @click=${se("actual_aci_wtotal")}>
              ${l>=0?this.iImp():this.iExp()}
              ${this.fmtKwGrid(d)}
            </button>
            <div class="gd-cside gd-col-imp">
              ${this.iImp()} ${this.fmtKwGrid(p)}
            </div>
          </div>
        `:c`
          <div class="gd-pure">
            <button class="gd-pn" @click=${se("actual_aci_wtotal")}>
              ${this.fmtKwGrid(d)}
            </button>
            <div class="gd-pd ${a?"gd-col-imp":o?"gd-col-exp":""}">
              ${a?c`${this.iImp()} Odběr ze sítě`:o?c`${this.iExp()} Dodávka do sítě`:"◉ Žádný tok"}
            </div>
          </div>
        `}

        <!-- ── MONEY COLUMNS: dodávka (prodej) left · odběr (nákup) right ──
             rate = hero · accumulated dnes (left) · měsíc (right, muted),
             units kept, no text labels (what-is-what is on hover). -->
        ${m?c`
          <div class="gd-cols">
            <div class="gd-col">
              <div class="gd-crate ${Ne}">${this.iExp()} ${_(e.exportPrice)} <small>Kč/kWh</small></div>
              <button class="gd-cmoney" @click=${se("computed_grid_export_earnings_today")}
                title="dodávka — dnes ${q.txt} Kč · tento měsíc ${K.txt} Kč">
                <span class="gd-md ${q.cls}">${q.txt}<small> Kč</small></span>
                <span class="gd-mm ${K.cls}">${K.txt}<small> Kč</small></span>
              </button>
            </div>
            <div class="gd-col">
              <div class="gd-crate ${Pe}">${this.iImp()} ${_(e.spotPrice)} <small>Kč/kWh</small></div>
              <button class="gd-cmoney" @click=${se("computed_grid_import_cost_today")}
                title="odběr — dnes ${Z.txt} Kč · tento měsíc ${j.txt} Kč">
                <span class="gd-md ${Z.cls}">${Z.txt}<small> Kč</small></span>
                <span class="gd-mm ${j.cls}">${j.txt}<small> Kč</small></span>
              </button>
            </div>
          </div>
        `:c`
          <div class="gd-price">
            <button class="gd-chip ${e.exportPrice>=0?"good":"bad"}" @click=${se("export_price_current_15min")}>
              ${this.iExp()} ${_(e.exportPrice)} <small>Kč</small>
            </button>
            <button class="gd-chip ${e.spotPrice<=3?"good":e.spotPrice>5?"bad":"neutral"}" @click=${se("spot_price_current_15min")}>
              ${this.iImp()} ${_(e.spotPrice)} <small>Kč</small>
            </button>
          </div>
        `}

        <!-- ── PHASE BARS: bidirectional, dynamic zero ── -->
        <div class="gd-ph">
          ${["L1","L2","L3"].map((M,oe)=>{const Di=t[oe],Ei=Math.abs(Di),At=Math.min(100,Ei/Dr*100),Oi=Di>10,Fi=Di<-10;return c`
              <div class="gd-phr">
                <div class="gd-ptr">
                  <div class="gd-zero" style="left:${ei.toFixed(1)}%"></div>
                  ${Fi?c`
                    <div class="gd-seg l${oe+1}" style="left:${(ei-At).toFixed(1)}%;width:${At.toFixed(1)}%">
                      ${At>=22?c`${this.fmtKwGrid(Ei)}`:w}
                    </div>`:w}
                  ${Oi?c`
                    <div class="gd-seg l${oe+1}" style="left:${ei.toFixed(1)}%;width:${At.toFixed(1)}%">
                      ${At>=22?c`${this.fmtKwGrid(Ei)}`:w}
                    </div>`:w}
                </div>
              </div>`})}
        </div>

        <!-- ── VOLTAGE: dynamic-zoom axis · phase-coloured ticks · value on axis
             (outer above, middle below); window bounds sit on the below line at
             the edges so a near-edge value never collides with them. ── -->
        ${Le?c`
          <div class="gd-volt">
            <div class="gd-vband" style="background:${En}">
              ${Mt.filter(M=>M.v>0).map(M=>c`
                <div class="gd-vtick ${M.lcls}" style="left:${M.pct.toFixed(1)}%"></div>`)}
              ${Mt.filter(M=>M.v>0).map(M=>c`
                <button class="gd-vlab ${M.below?"below":"above"} ${M.sev==="ok"?M.lcls:""}"
                  style="left:${M.pct.toFixed(1)}%;${M.sev==="crit"?"color:#ff8a80":M.sev==="warn"?"color:#ffcc80":""}"
                  @click=${se(M.entity)}>${M.v.toFixed(0)}<small> V</small></button>`)}
              <span class="gd-vbound lo">${Ct.toFixed(0)} V</span>
              <span class="gd-vbound hi">${Xt.toFixed(0)} V</span>
            </div>
          </div>
        `:w}

      </div>
    `}renderHouse(){const e=this.data,t=e.houseTodayWh/1e3,i=e.nonbackupTodayWh/1e3,r=t+i,n=e.housePower+e.nonbackupPower,a=t+e.zalohaPlannedRemainingKwh,o=e.selfSufficiencyTodayPct,l=e.houseTodayWh+e.nonbackupTodayWh,d=l>0?e.srcBatteryTodayKwh*1e3/l*100:0,p=l>0?e.srcFveTodayKwh*1e3/l*100:0,u=l>0?e.srcGridTodayKwh*1e3/l*100:0,h=o>=66?"#43a047":o>=33?"#fdd835":"#e53935",m=`hsl(${Math.round(Math.max(0,Math.min(120,o*1.2)))}, 72%, 46%)`,v=r>0,f=v?r:1,b=v?Math.round(e.srcFveTodayKwh/f*100):0,$=v?Math.round(e.srcBatteryTodayKwh/f*100):0,y=v?Math.max(0,100-b-$):0,_=`Denní soběstačnost ${Math.round(o)} % · FVE ${b} % · Baterie ${$} % · Síť ${y} %`,S=Th([e.houseL1,e.houseL2,e.houseL3]),B=[{z:e.houseL1,n:e.nonbackupL1,ze:"ac_out_aco_pr"},{z:e.houseL2,n:e.nonbackupL2,ze:"ac_out_aco_ps"},{z:e.houseL3,n:e.nonbackupL3,ze:"ac_out_aco_pt"}],P=Math.max(300,...B.map(X=>X.z+X.n)),N=nn/P*100,k=N<=100,A=S.spreadW>=1e3?`${(S.spreadW/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(S.spreadW)} W`,V=B.map(X=>Math.max(0,X.z)/P*100),q=e.houseL1+e.houseL2+e.houseL3,K=Ph(V,q),Z=X=>X>=1e3?`${(X/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(X)} W`,j=26,Pe=`Záloha ${Vt(e.housePower)} · dnes ${t.toFixed(1)} kWh${e.zalohaPlannedRemainingKwh>0?` · plán ${a.toFixed(1)} kWh`:""}`,Ne=`Nezáloha ${Vt(e.nonbackupPower)} · dnes ${i.toFixed(1)} kWh`;return c`
      <div class="${this.nodeClass("house")}" style="--node-gradient: ${Bi.house}; --node-border: ${Br.house};"
        @click=${X=>this.toggleExpand("house",X)} title=${_}>

        <!-- MULTI-SEGMENT AURA: battery (green) → FVE (yellow) → grid (red) — UNCHANGED -->
        ${this.edgeGaugeSegments({nodeId:"house",segments:[{frac:d,color:"#43a047"},{frac:p,color:"#ffca28"},{frac:u,color:"#e53935"}],width:3.5})}
        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 100%, ${h}22, transparent 72%)"></div>

        <!-- GAUGE PILL: daily self-sufficiency with kWh popover — UNCHANGED -->
        ${this.gaugePill("house",`${Math.round(o)} %`,m,c`
          <div class="ss-pop-h"><span>Denní soběstačnost</span><b style="color:${m}">${Math.round(o)} %</b></div>
          ${v?c`
            <div class="ss-bar">
              <i style="width:${$}%;background:#43a047"></i>
              <i style="width:${b}%;background:#ffca28"></i>
              <i style="width:${y}%;background:#e53935"></i>
            </div>
            <div class="gp-r"><span>☀️ FVE</span><b>${e.srcFveTodayKwh.toFixed(1)} kWh · ${b} %</b></div>
            <div class="gp-r"><span>🔋 Baterie</span><b>${e.srcBatteryTodayKwh.toFixed(1)} kWh · ${$} %</b></div>
            <div class="gp-r"><span>🔌 Síť</span><b>${e.srcGridTodayKwh.toFixed(1)} kWh · ${y} %</b></div>
            <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px">
              <span>Celkem dnes</span><b>${r.toFixed(1)} kWh</b>
            </div>
          `:c`<div class="gp-r" style="opacity:.6"><span>Žádná spotřeba dnes zatím</span></div>`}
        `)}

        <!-- COMPACT HEADER: SVG house icon · big kW · tiny kWh -->
        <div class="house-head">
          ${F`<svg class="house-ico" viewBox="0 0 24 24" fill="none" stroke="#cfe0ff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 11l9-7 9 7"></path><path d="M5 10v10h14V10"></path></svg>`}
          <span class="house-cap">SPOTŘEBA</span>
        </div>
        <div class="node-value" @click=${se("actual_aco_p")}>${Vt(n)}</div>
        <div class="node-subvalue" @click=${se("ac_out_en_day")}>${r.toFixed(1).replace(".",",")} kWh</div>

        <!-- COMPACT SPLIT ROW: colored dot + value, tooltip carries detail -->
        <div class="csplit">
          <button class="cs" @click=${se("actual_aco_p")} title=${Pe}>
            <span class="cs-top"><span class="d" style="background:#43a047"></span>${Vt(e.housePower)}</span>
            <span class="cs-day">${t.toFixed(1).replace(".",",")} kWh</span>
          </button>
          <button class="cs" @click=${se("actual_acinb_wtotal")} title=${Ne}>
            <span class="cs-top"><span class="d" style="background:#fb8c00"></span>${Vt(e.nonbackupPower)}</span>
            <span class="cs-day">${i.toFixed(1).replace(".",",")} kWh</span>
          </button>
        </div>

        <!-- PHASE GRAPH (phasegraph2 design) -->
        <div class="pg">
          <!-- Spread band = imbalance "thermometer" (no text); red shimmer when unbalanced -->
          ${K.widthPct>0?c`
            <div class="pg-spread ${S.balanced?"balanced":"unbal"}"
              title=${S.balanced?"Fáze vyvážené":`Fáze nevyvážené — rozdíl ${A}`}
              style="left:calc(10px + ${K.leftPct.toFixed(2)}% * (100% - 75px) / 100);width:calc(${K.widthPct.toFixed(2)}% * (100% - 75px) / 100)"></div>`:w}
          <!-- Phase rows: whole bar in the ČSN phase colour (záloha solid,
               nezáloha faded); no L1/L2/L3 text — colour identifies the phase. -->
          ${B.map((X,he)=>{const C=X.z>=nn,Y=X.z+X.n,re=Math.max(0,X.z)/P*100,Ae=Math.max(0,X.n)/P*100,Le=re>=j&&X.z>100,Ee=Ae>=j&&X.n>100;return c`
              <div class="pg-row l${he+1}">
                <div class="pg-track">
                  <div class="pg-z ${C?"crit":""}" style="width:${re.toFixed(1)}%">
                    ${Le?Z(X.z):w}
                  </div>
                  ${X.n>0?c`
                    <div class="pg-div"></div>
                    <div class="pg-n" style="width:${Ae.toFixed(1)}%">
                      ${Ee?Z(X.n):w}
                    </div>`:w}
                  ${k?c`<div class="pg-lim" style="left:${N.toFixed(1)}%"></div>`:w}
                </div>
                <span class="pg-tot">${Z(Y)}</span>
              </div>`})}
        </div>

      </div>
    `}render(){return c`
      <div class="flow-grid ${this.hasCustomLayout&&!this.editMode?"custom-layout":""}">
        ${this.renderSolar()}
        ${this.renderBattery()}
        ${this.renderInverter()}
        ${this.renderGrid()}
        ${this.renderHouse()}
      </div>
    `}};Fe.styles=T`
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
      color: ${J(s.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .node-value {
      font-size: 22px;
      font-weight: 700;
      color: ${J(s.textPrimary)};
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
      color: ${J(s.textSecondary)};
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
      color: ${J(s.textSecondary)};
      margin-top: 4px;
    }

    .pending-overlay {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: ${J(s.accent)};
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 4px;
      padding: 2px 6px;
      margin-top: 4px;
    }

    .current-state-unknown {
      color: ${J(s.textSecondary)};
      font-style: italic;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid ${J(s.divider)};
      border-top-color: ${J(s.accent)};
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
      border-top: 1px solid ${J(s.divider)};
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
      border-top: 1px dashed ${J(s.divider)};
    }

    .detail-header {
      font-size: 10px;
      font-weight: 600;
      color: ${J(s.textSecondary)};
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: ${J(s.textSecondary)};
      margin-bottom: 2px;
    }

    .detail-row .icon { width: 14px; text-align: center; flex-shrink: 0; }

    .clickable {
      cursor: pointer;
      color: ${J(s.textPrimary)};
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
      color: ${J(s.textSecondary)};
      margin: 4px 0;
      align-items: center;
      justify-content: center;
    }

    .phase-sep { color: ${J(s.divider)}; }

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
      color: ${J(s.textPrimary)};
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
      background: ${J(s.bgSecondary)};
      border: none;
      font-family: inherit;
      color: ${J(s.textSecondary)};
    }

    .indicator:hover { background: ${J(s.divider)}; }

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
      border-top: 1px solid ${J(s.divider)};
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
      border: 1px solid ${J(s.divider)};
      background: transparent;
      color: ${J(s.textSecondary)};
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .gc-plan-btn:hover {
      background: rgba(255,255,255,0.06);
      color: ${J(s.textPrimary)};
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
      border-top: 1px dashed ${J(s.divider)};
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
      color: ${J(s.textSecondary)};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .phase-val {
      font-size: 11px;
      font-weight: 600;
      color: ${J(s.textPrimary)};
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    .phase-val:hover { text-decoration: underline; }
    .phase-divider {
      border: none;
      border-top: 1px solid ${J(s.divider)};
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
      color: ${J(s.textSecondary)};
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
      color: ${J(s.textPrimary)};
    }
    .energy-side-val:hover { text-decoration: underline; }
    .energy-import { color: #ef5350; }
    .energy-export { color: #66bb6a; }
    .energy-divider-v {
      width: 1px;
      height: 28px;
      background: ${J(s.divider)};
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
      color: ${J(s.textSecondary)};
      text-transform: uppercase;
    }
    .price-val {
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: ${J(s.textPrimary)};
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
        border-top: 1px solid ${J(s.divider)};
      }
      .boiler-section,
      .grid-charging-plan {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed ${J(s.divider)};
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
  `;Ze([g({type:Object})],Fe.prototype,"data",2);Ze([g({type:Boolean})],Fe.prototype,"editMode",2);Ze([H()],Fe.prototype,"pendingServices",2);Ze([H()],Fe.prototype,"changingServices",2);Ze([H()],Fe.prototype,"shieldStatus",2);Ze([H()],Fe.prototype,"shieldQueueCount",2);Ze([H()],Fe.prototype,"gridDeliveryState",2);Ze([H()],Fe.prototype,"expandedNodes",2);Ze([H()],Fe.prototype,"gaugeDetailOpen",2);Ze([H()],Fe.prototype,"customPositions",2);Ze([H()],Fe.prototype,"nodeDims",2);Fe=Ze([E("oig-flow-node")],Fe);var zh=Object.defineProperty,Dh=Object.getOwnPropertyDescriptor,Gt=(e,t,i,r)=>{for(var n=r>1?void 0:r?Dh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&zh(t,i,n),n};function Eh(e,t){return{fromColor:Ua[e]||"#9e9e9e",toColor:Ua[t]||"#9e9e9e"}}const Oh=Q;let at=class extends D{constructor(){super(...arguments),this.data=_a,this.particlesEnabled=!0,this.active=!0,this.editMode=!1,this.lines=[],this.animationId=null,this.lastSpawnTime={},this.particleCount=0,this.MAX_PARTICLES=50,this.onVisibilityChange=()=>{this.updateAnimationState()},this.onLayoutChanged=()=>{this.drawConnectionsDeferred()}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this.onVisibilityChange),this.addEventListener("layout-changed",this.onLayoutChanged)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this.onVisibilityChange),this.removeEventListener("layout-changed",this.onLayoutChanged),this.stopAnimation()}updated(e){e.has("data")&&(this.updateLines(),this.animationId!==null&&this.spawnParticles()),(e.has("active")||e.has("particlesEnabled"))&&this.updateAnimationState(),this.drawConnectionsDeferred()}firstUpdated(){this.updateLines(),this.updateAnimationState(),new ResizeObserver(()=>this.drawConnectionsDeferred()).observe(this)}drawConnectionsDeferred(){requestAnimationFrame(()=>this.drawConnectionsSVG())}getParticlesLayer(){var e;return(e=this.renderRoot)==null?void 0:e.querySelector(".particles-layer")}getGridMetrics(){var a,o;const e=(a=this.renderRoot)==null?void 0:a.querySelector("oig-flow-node");if(!e)return null;const i=(e.renderRoot||e.shadowRoot||e).querySelector(".flow-grid");if(!i)return null;const r=(o=this.renderRoot)==null?void 0:o.querySelector(".canvas-container");if(!r)return null;const n=i.getBoundingClientRect();return n.width===0||n.height===0?null:{grid:i,gridRect:n,canvasRect:r.getBoundingClientRect()}}positionOverlayLayer(e,t,i){const r=t.left-i.left,n=t.top-i.top;e.style.left=`${r}px`,e.style.top=`${n}px`,e.style.width=`${t.width}px`,e.style.height=`${t.height}px`}updateLines(){const e=this.data,t=[],i=e.solarPower>50;t.push({id:"solar-inverter",from:"solar",to:"inverter",color:ti.solar,power:i?e.solarPower:0,params:i?jr(e.solarPower,Nr.solar,"solar"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:i});const r=Math.abs(e.batteryPower)>50,n=e.batteryPower>0;t.push({id:"battery-inverter",from:r&&n?"inverter":"battery",to:r&&n?"battery":"inverter",color:ti.battery,power:r?Math.abs(e.batteryPower):0,params:r?jr(e.batteryPower,Nr.battery,"battery"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:r});const a=Math.abs(e.gridPower)>50,o=e.gridPower>0;t.push({id:"grid-inverter",from:a?o?"grid":"inverter":"grid",to:a?o?"inverter":"grid":"inverter",color:a?o?ti.grid_import:ti.grid_export:ti.grid_import,power:a?Math.abs(e.gridPower):0,params:a?jr(e.gridPower,Nr.grid,"grid"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:a});const l=e.housePower>50;t.push({id:"inverter-house",from:"inverter",to:"house",color:ti.house,power:l?e.housePower:0,params:l?jr(e.housePower,Nr.house,"house"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:l}),this.lines=t}calcEdgePoint(e,t,i,r){const n=t.x-e.x,a=t.y-e.y;if(n===0&&a===0)return{...e};const o=Math.abs(n),l=Math.abs(a),d=o*r>l*i?i/o:r/l;return{x:e.x+n*d,y:e.y+a*d}}getNodeInfo(e,t,i){const r=e.querySelector(`.node-${i}`);if(!r)return null;const n=r.getBoundingClientRect();return{x:n.left+n.width/2-t.left,y:n.top+n.height/2-t.top,hw:n.width/2,hh:n.height/2}}drawConnectionsSVG(){const e=this.svgEl;if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:r,canvasRect:n}=t;this.positionOverlayLayer(e,r,n),e.setAttribute("viewBox",`0 0 ${r.width} ${r.height}`);const a=this.getParticlesLayer();a&&this.positionOverlayLayer(a,r,n),e.innerHTML="";const o="http://www.w3.org/2000/svg",l=document.createElementNS(o,"defs"),d=document.createElementNS(o,"filter");d.setAttribute("id","neon-glow"),d.setAttribute("x","-50%"),d.setAttribute("y","-50%"),d.setAttribute("width","200%"),d.setAttribute("height","200%");const p=document.createElementNS(o,"feGaussianBlur");p.setAttribute("in","SourceGraphic"),p.setAttribute("stdDeviation","3"),p.setAttribute("result","blur"),d.appendChild(p);const u=document.createElementNS(o,"feMerge"),h=document.createElementNS(o,"feMergeNode");h.setAttribute("in","blur"),u.appendChild(h);const m=document.createElementNS(o,"feMergeNode");m.setAttribute("in","SourceGraphic"),u.appendChild(m),d.appendChild(u),l.appendChild(d),e.appendChild(l);for(const v of this.lines){const f=this.getNodeInfo(i,r,v.from),b=this.getNodeInfo(i,r,v.to);if(!f||!b)continue;const $={x:f.x,y:f.y},y={x:b.x,y:b.y},_=this.calcEdgePoint($,y,f.hw,f.hh),S=this.calcEdgePoint(y,$,b.hw,b.hh),B=S.x-_.x,P=S.y-_.y,N=Math.sqrt(B*B+P*P),k=Math.min(N*.2,40),A=-P/N,V=B/N,q=(_.x+S.x)/2,K=(_.y+S.y)/2,Z=q+A*k,j=K+V*k,Pe=`grad-${v.id}`,{fromColor:Ne,toColor:X}=Eh(v.from,v.to),he=document.createElementNS(o,"linearGradient");he.setAttribute("id",Pe),he.setAttribute("x1","0%"),he.setAttribute("y1","0%"),he.setAttribute("x2","100%"),he.setAttribute("y2","0%");const C=document.createElementNS(o,"stop");C.setAttribute("offset","0%"),C.setAttribute("stop-color",Ne);const Y=document.createElementNS(o,"stop");Y.setAttribute("offset","100%"),Y.setAttribute("stop-color",X),he.appendChild(C),he.appendChild(Y),l.appendChild(he);const re=document.createElementNS(o,"path");if(re.setAttribute("d",`M ${_.x} ${_.y} Q ${Z} ${j} ${S.x} ${S.y}`),re.setAttribute("stroke",`url(#${Pe})`),re.setAttribute("stroke-width","3"),re.setAttribute("stroke-linecap","round"),re.setAttribute("fill","none"),re.setAttribute("opacity",v.active?"0.8":"0.18"),v.active&&re.setAttribute("filter","url(#neon-glow)"),re.classList.add("flow-line"),v.active||re.classList.add("flow-line--inactive"),e.appendChild(re),v.params.active){const Le=document.createElementNS(o,"polygon");Le.setAttribute("points",`0,-6 ${6*1.2},0 0,6`),Le.setAttribute("fill",v.color),Le.setAttribute("opacity","0.9");const Ee=document.createElementNS(o,"animateMotion");Ee.setAttribute("dur",`${Math.max(1,v.params.speed/1e3)}s`),Ee.setAttribute("repeatCount","indefinite"),Ee.setAttribute("path",`M ${_.x} ${_.y} Q ${Z} ${j} ${S.x} ${S.y}`),Ee.setAttribute("rotate","auto"),Le.appendChild(Ee),e.appendChild(Le)}}}updateAnimationState(){this.particlesEnabled&&this.active&&!document.hidden&&!je.reduceMotion?(this.spawnParticles(),this.startAnimation()):this.stopAnimation()}startAnimation(){if(this.animationId!==null)return;const e=()=>{this.spawnParticles(),this.animationId=requestAnimationFrame(e)};this.animationId=requestAnimationFrame(e)}stopAnimation(){this.animationId!==null&&(cancelAnimationFrame(this.animationId),this.animationId=null)}spawnParticles(){if(this.particleCount>=this.MAX_PARTICLES)return;const e=this.getParticlesLayer();if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:r,canvasRect:n}=t;this.positionOverlayLayer(e,r,n);const a=performance.now();for(const o of this.lines){if(!o.params.active)continue;const l=o.params.speed,d=this.lastSpawnTime[o.id]||0;if(a-d<l)continue;const p=this.getNodeInfo(i,r,o.from),u=this.getNodeInfo(i,r,o.to);if(!p||!u)continue;const h={x:p.x,y:p.y},m={x:u.x,y:u.y},v=this.calcEdgePoint(h,m,p.hw,p.hh),f=this.calcEdgePoint(m,h,u.hw,u.hh);this.lastSpawnTime[o.id]=a;const b=o.params.count;for(let $=0;$<b&&!(this.particleCount>=this.MAX_PARTICLES);$++)this.createParticle(e,v,f,o.color,o.params,$*(o.params.speed/b/2))}}createParticle(e,t,i,r,n,a){const o=document.createElement("div");o.className="particle";const l=n.size;o.style.width=`${l}px`,o.style.height=`${l}px`,o.style.background=r,o.style.left=`${t.x}px`,o.style.top=`${t.y}px`,o.style.boxShadow=`0 0 ${l}px ${r}`,o.style.opacity="0",e.appendChild(o),this.particleCount++;const d=n.speed;setTimeout(()=>{let p=!1;const u=()=>{p||(p=!0,o.isConnected&&o.remove(),this.particleCount=Math.max(0,this.particleCount-1))};if(typeof o.animate=="function"){const h=o.animate([{left:`${t.x}px`,top:`${t.y}px`,opacity:0,offset:0},{opacity:n.opacity,offset:.1},{opacity:n.opacity,offset:.9},{left:`${i.x}px`,top:`${i.y}px`,opacity:0,offset:1}],{duration:d,easing:"linear"});h.onfinish=u,h.oncancel=u}else o.style.transition=`left ${d}ms linear, top ${d}ms linear, opacity ${d}ms linear`,o.style.opacity=`${n.opacity}`,requestAnimationFrame(()=>{o.style.left=`${i.x}px`,o.style.top=`${i.y}px`,o.style.opacity="0"}),o.addEventListener("transitionend",u,{once:!0}),window.setTimeout(u,d+50)},a)}render(){return c`
      <div class="canvas-container">
        <div class="flow-grid-wrapper">
          <oig-flow-node .data=${this.data} .editMode=${this.editMode}></oig-flow-node>
        </div>

        <svg class="connections-layer"></svg>

        <div class="particles-layer"></div>
      </div>
    `}resetLayout(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-flow-node");e!=null&&e.resetLayout&&e.resetLayout()}};at.styles=T`
    :host {
      display: block;
      position: relative;
      width: 100%;
      background: ${Oh(s.bgSecondary)};
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
  `;Gt([g({type:Object})],at.prototype,"data",2);Gt([g({type:Boolean})],at.prototype,"particlesEnabled",2);Gt([g({type:Boolean})],at.prototype,"active",2);Gt([g({type:Boolean})],at.prototype,"editMode",2);Gt([H()],at.prototype,"lines",2);Gt([$n(".connections-layer")],at.prototype,"svgEl",2);at=Gt([E("oig-flow-canvas")],at);var Fh=Object.defineProperty,Ih=Object.getOwnPropertyDescriptor,Aa=(e,t,i,r)=>{for(var n=r>1?void 0:r?Ih(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Fh(t,i,n),n};const Ke=Q;let ir=class extends D{constructor(){super(...arguments),this.data=null,this.open=!1,this.onKeyDown=e=>{e.key==="Escape"&&this.hide()}}show(){this.open=!0}hide(){this.open=!1}onOverlayClick(e){e.target===e.currentTarget&&this.hide()}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onKeyDown),this.addEventListener("oig-grid-charging-open",()=>this.show())}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onKeyDown)}formatTime(e){const t=e.time_from??"--:--",i=e.time_to??"--:--";return`${t} – ${i}`}isBlockActive(e){if(!e.time_from||!e.time_to)return!1;const t=new Date,i=t.toISOString().slice(0,10);if(e.day==="tomorrow")return!1;const r=`${i}T${e.time_from}`,n=`${i}T${e.time_to}`,a=new Date(r),o=new Date(n);return t>=a&&t<o}renderEmpty(){return c`
      <div class="empty-state">
        <div class="empty-icon">🔌</div>
        <div class="empty-text">Žádné plánované nabíjení</div>
        <div class="empty-sub">Plán nabíjení ze sítě není aktivní.</div>
      </div>
    `}renderContent(){const e=this.data;if(!e)return this.renderEmpty();const t=e.blocks.find(i=>this.isBlockActive(i));return c`
      ${e.hasBlocks?c`
        <!-- Summary chips -->
        <div class="summary-row">
          ${e.totalEnergyKwh>0?c`
            <span class="summary-chip energy">⚡ ${e.totalEnergyKwh.toFixed(1)} kWh</span>
          `:w}
          ${e.totalCostCzk>0?c`
            <span class="summary-chip cost">💰 ~${e.totalCostCzk.toFixed(0)} Kč</span>
          `:w}
          ${e.windowLabel?c`
            <span class="summary-chip time">🪟 ${e.windowLabel}</span>
          `:w}
          ${e.durationMinutes>0?c`
            <span class="summary-chip time">⏱️ ${Math.round(e.durationMinutes)} min</span>
          `:w}
        </div>

        <!-- Active block banner -->
        ${t?c`
          <div class="active-block-banner">
            <div class="pulse-dot"></div>
            <span>Probíhá: ${this.formatTime(t)}
              ${t.grid_charge_kwh!=null?` · ${t.grid_charge_kwh.toFixed(1)} kWh`:w}
            </span>
          </div>
        `:w}

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
            ${e.blocks.map((i,r)=>{const n=this.isBlockActive(i);return c`
                <tr class="${n?"is-active":!n&&r===0&&!t?"is-next":""}">
                  <td>${this.formatTime(i)}</td>
                  <td>
                    ${i.day?c`
                      <span class="day-badge ${i.day}">${i.day==="today"?"dnes":"zítra"}</span>
                    `:w}
                  </td>
                  <td>${i.grid_charge_kwh!=null?i.grid_charge_kwh.toFixed(1):"--"}</td>
                  <td>${i.total_cost_czk!=null?`${i.total_cost_czk.toFixed(0)} Kč`:"--"}</td>
                </tr>
              `})}
          </tbody>
        </table>
      `:this.renderEmpty()}
    `}render(){var e;return this.open?c`
      <div class="overlay" @click=${this.onOverlayClick}>
        <div class="dialog" role="dialog" aria-modal="true" aria-label="Plánované síťové nabíjení">
          <div class="dialog-header">
            <span class="dialog-header-icon">🔌</span>
            <div>
              <div class="dialog-header-title">Plánované síťové nabíjení</div>
              ${(e=this.data)!=null&&e.hasBlocks?c`
                <div class="dialog-header-subtitle">
                  ${this.data.blocks.length} blok${this.data.blocks.length>1?"ů":""}
                </div>
              `:w}
            </div>
            <button class="close-btn" @click=${()=>this.hide()} aria-label="Zavřít">✕</button>
          </div>
          <div class="dialog-body">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `:w}};ir.styles=T`
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
      background: ${Ke(s.cardBg)};
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
      border-bottom: 1px solid ${Ke(s.divider)};
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
      color: ${Ke(s.textPrimary)};
    }

    .dialog-header-subtitle {
      font-size: 11px;
      color: ${Ke(s.textSecondary)};
      margin-top: 2px;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: ${Ke(s.textSecondary)};
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
      color: ${Ke(s.textPrimary)};
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
      color: ${Ke(s.textSecondary)};
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
      color: ${Ke(s.textSecondary)};
      padding: 0 6px 8px;
      border-bottom: 1px solid ${Ke(s.divider)};
    }

    .blocks-table th:last-child,
    .blocks-table td:last-child {
      text-align: right;
    }

    .blocks-table td {
      padding: 8px 6px;
      font-size: 12px;
      color: ${Ke(s.textPrimary)};
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
      color: ${Ke(s.textSecondary)};
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
  `;Aa([g({type:Object})],ir.prototype,"data",2);Aa([H()],ir.prototype,"open",2);ir=Aa([E("oig-grid-charging-dialog")],ir);var Bh=Object.defineProperty,Nh=Object.getOwnPropertyDescriptor,ke=(e,t,i,r)=>{for(var n=r>1?void 0:r?Nh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Bh(t,i,n),n};const me=Q;_n.register(ls,cs,ds,ps,us,hs,gs);let ht=class extends D{constructor(){super(...arguments),this.values=[],this.color="rgba(76, 175, 80, 1)",this.startTime="",this.endTime="",this.chart=null,this.lastDataKey="",this.initializing=!1}render(){return c`<canvas></canvas>`}firstUpdated(){this.values.length>0&&(this.initializing=!0,requestAnimationFrame(()=>{this.createSparkline(),this.initializing=!1}))}updated(e){this.initializing||(e.has("values")||e.has("color"))&&this.updateOrCreateSparkline()}disconnectedCallback(){super.disconnectedCallback(),this.destroyChart()}updateOrCreateSparkline(){var t,i,r,n;if(!this.canvas||this.values.length===0)return;const e=JSON.stringify({v:this.values,c:this.color});if(!(e===this.lastDataKey&&this.chart)){if(this.lastDataKey=e,(r=(i=(t=this.chart)==null?void 0:t.data)==null?void 0:i.datasets)!=null&&r[0]){const a=this.chart.data.datasets[0];if(!((((n=this.chart.data.labels)==null?void 0:n.length)||0)!==this.values.length)){a.data=this.values,a.borderColor=this.color,a.backgroundColor=this.color.replace("1)","0.2)"),this.chart.update("none");return}}this.destroyChart(),this.createSparkline()}}createSparkline(){if(!this.canvas||this.values.length===0)return;this.destroyChart();const e=this.color,t=this.values,i=new Date(this.startTime),r=t.map((n,a)=>new Date(i.getTime()+a*15*60*1e3).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}));this.chart=new _n(this.canvas,{type:"line",data:{labels:r,datasets:[{data:t,borderColor:e,backgroundColor:e.replace("1)","0.2)"),borderWidth:2,fill:!0,tension:.3,pointRadius:0,pointHoverRadius:5}]},plugins:[],options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:0},plugins:{legend:{display:!1},tooltip:{enabled:!0,backgroundColor:"rgba(0, 0, 0, 0.8)",titleColor:"#fff",bodyColor:"#fff",padding:8,displayColors:!1,callbacks:{title:n=>{var a;return((a=n[0])==null?void 0:a.label)||""},label:n=>`${n.parsed.y.toFixed(2)} Kč/kWh`}},datalabels:{display:!1},zoom:{pan:{enabled:!0,mode:"x",modifierKey:"shift"},zoom:{wheel:{enabled:!0,speed:.1},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)"},mode:"x"}}},scales:{x:{display:!1},y:{display:!0,position:"right",grace:"10%",ticks:{color:"rgba(255, 255, 255, 0.6)",font:{size:8},callback:n=>Number(n).toFixed(1),maxTicksLimit:3},grid:{display:!1}}},layout:{padding:0},interaction:{mode:"nearest",intersect:!1}}})}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}};ht.styles=T`
    :host {
      display: block;
      width: 100%;
      height: 30px;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `;ke([g({type:Array})],ht.prototype,"values",2);ke([g({type:String})],ht.prototype,"color",2);ke([g({type:String})],ht.prototype,"startTime",2);ke([g({type:String})],ht.prototype,"endTime",2);ke([$n("canvas")],ht.prototype,"canvas",2);ht=ke([E("oig-mini-sparkline")],ht);let Ie=class extends D{constructor(){super(...arguments),this.title="",this.time="",this.valueText="",this.value=0,this.unit="Kč/kWh",this.variant="default",this.clickable=!1,this.startTime="",this.endTime="",this.sparklineValues=[],this.sparklineColor="rgba(76, 175, 80, 1)",this.handleClick=()=>{this.clickable&&this.dispatchEvent(new CustomEvent("card-click",{detail:{startTime:this.startTime,endTime:this.endTime,value:this.value},bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),this.clickable&&this.addEventListener("click",this.handleClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleClick)}render(){const e=this.valueText||`${this.value.toFixed(2)} <span class="stat-unit">${this.unit}</span>`;return c`
      <div class="card-title">${this.title}</div>
      <div class="card-value ${this.variant}" .innerHTML=${e}></div>
      ${this.time?c`<div class="card-time">${this.time}</div>`:w}
      ${this.sparklineValues.length>0?c`
            <div class="sparkline-container">
              <oig-mini-sparkline
                .values=${this.sparklineValues}
                .color=${this.sparklineColor}
                .startTime=${this.startTime}
                .endTime=${this.endTime}
              ></oig-mini-sparkline>
            </div>
          `:w}
    `}};Ie.styles=T`
    :host {
      display: block;
      background: ${me(s.cardBg)};
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: ${me(s.cardShadow)};
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
      color: ${me(s.textSecondary)};
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 700;
      color: ${me(s.textPrimary)};
      line-height: 1.2;
    }

    .card-value .stat-unit {
      font-size: 12px;
      font-weight: 400;
      color: ${me(s.textSecondary)};
    }

    .card-value.success { color: #4CAF50; }
    .card-value.warning { color: #FFA726; }
    .card-value.danger { color: #F44336; }
    .card-value.info { color: #29B6F6; }

    .card-time {
      font-size: 10px;
      color: ${me(s.textSecondary)};
      margin-top: 4px;
    }

    .sparkline-container {
      margin-top: 8px;
    }
  `;ke([g({type:String})],Ie.prototype,"title",2);ke([g({type:String})],Ie.prototype,"time",2);ke([g({type:String})],Ie.prototype,"valueText",2);ke([g({type:Number})],Ie.prototype,"value",2);ke([g({type:String})],Ie.prototype,"unit",2);ke([g({type:String})],Ie.prototype,"variant",2);ke([g({type:Boolean})],Ie.prototype,"clickable",2);ke([g({type:String})],Ie.prototype,"startTime",2);ke([g({type:String})],Ie.prototype,"endTime",2);ke([g({type:Array})],Ie.prototype,"sparklineValues",2);ke([g({type:String})],Ie.prototype,"sparklineColor",2);Ie=ke([E("oig-stats-card")],Ie);function jh(e){const t=new Date(e.start),i=new Date(e.end),r=t.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit"}),n=t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}),a=i.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"});return`${r} ${n} - ${a}`}let rr=class extends D{constructor(){super(...arguments),this.data=null,this.topOnly=!1}onCardClick(e){this.dispatchEvent(new CustomEvent("zoom-to-block",{detail:e.detail,bubbles:!0,composed:!0}))}renderPriceTiles(){if(!this.data)return w;const e=this.data.solarForecastTotal,t=this.data.solarForecastTomorrow,i=this.data.solarForecastStale,r=e>0||t>0,n=this.data.whatIf,a=(n==null?void 0:n.totalSavings)??null,o=(n==null?void 0:n.totalCost)??null,l=a==null?"":a>=.005?"pos":a<=-.005?"neg":"";return c`
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
          ${a!=null?c`${a>=0?"+":""}${a.toFixed(0)} <span class="price-tile-unit">Kč</span>`:c`-- <span class="price-tile-unit">Kč</span>`}
        </div>
        <div class="price-tile-sub">
          ${o!=null?`Náklady ${o.toFixed(0)} Kč`:w}
        </div>
      </div>

      <div class="price-tile solar">
        <div class="price-tile-label">☀ Solár předpověď</div>
        <div class="price-tile-value">
          ${r?c`${i?"⚠ ":""}${e.toFixed(1)} <span class="price-tile-unit">kWh</span>`:c`-- <span class="price-tile-unit">kWh</span>`}
        </div>
        <div class="price-tile-sub">
          ${r?i?"Zastaralá":`Zítra ${t.toFixed(1)} kWh`:"Nedostupná"}
        </div>
      </div>
    `}renderBlockCard(e,t,i,r){return t?c`
      <oig-stats-card
        title=${e}
        .value=${t.avg}
        unit="Kč/kWh"
        .time=${jh(t)}
        variant=${i}
        clickable
        .startTime=${t.start}
        .endTime=${t.end}
        .sparklineValues=${t.values}
        .sparklineColor=${r}
        @card-click=${this.onCardClick}
      ></oig-stats-card>
    `:w}renderExtremeBlocks(){if(!this.data)return w;const{cheapestBuyBlock:e,expensiveBuyBlock:t,bestExportBlock:i,worstExportBlock:r}=this.data;return c`
      ${this.renderBlockCard("Nejlevnější nákup",e,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejdražší nákup",t,"danger","rgba(244, 67, 54, 1)")}
      ${this.renderBlockCard("Nejlepší výkup",i,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejhorší výkup",r,"warning","rgba(255, 167, 38, 1)")}
    `}renderPlannedConsumption(){var o;const e=(o=this.data)==null?void 0:o.plannedConsumption;if(!e)return w;const t=e.todayTotalKwh,i=e.tomorrowKwh,r=t+(i||0),n=r>0?t/r*100:50,a=r>0?(i||0)/r*100:50;return c`
      <div class="planned-section">
        <div class="section-label" style="margin-bottom: 8px;">Plánovaná spotřeba (dnes + zítra)</div>
        <div class="planned-header">
          <div>
            <div class="planned-main-value">
              ${r>0?c`${r.toFixed(1)} <span class="unit">kWh</span>`:"--"}
            </div>
            <div class="planned-profile">${e.profile}</div>
          </div>
          ${e.trendText?c`<div class="planned-trend">${e.trendText}</div>`:w}
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

        ${r>0?c`
              <div class="planned-bars">
                <div class="bar-today" style="width: ${n}%"></div>
                <div class="bar-tomorrow" style="width: ${a}%"></div>
              </div>
              <div class="bar-labels">
                <span>Dnes celkem: ${t.toFixed(1)}</span>
                <span>Zítra: ${i!=null?i.toFixed(1):"--"}</span>
              </div>
            `:w}
      </div>
    `}render(){return!this.data||this.data.timeline.length===0?this.topOnly?w:c`<div style="color: ${s.textSecondary}; padding: 16px;">Načítání cenových dat...</div>`:this.topOnly?c`
        <div class="top-row">
          ${this.renderPriceTiles()}
          ${this.renderExtremeBlocks()}
        </div>
      `:c`${this.renderPlannedConsumption()}`}};rr.styles=T`
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
      background: ${me(s.cardBg)};
      border-radius: 10px;
      padding: 10px 12px;
      box-shadow: ${me(s.cardShadow)};
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 76px;
    }

    .price-tile.spot {
      background: linear-gradient(135deg, ${me(s.accent)}22 0%, ${me(s.accent)}11 100%);
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
      color: ${me(s.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .price-tile-value {
      font-size: 16px;
      font-weight: 700;
      color: ${me(s.textPrimary)};
      line-height: 1.2;
    }

    .price-tile-unit {
      font-size: 10px;
      font-weight: 400;
      color: ${me(s.textSecondary)};
      opacity: 0.7;
    }

    .price-tile-sub {
      font-size: 9px;
      color: ${me(s.textSecondary)};
      opacity: 0.55;
      margin-top: 3px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: ${me(s.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    /* Planned consumption */
    .planned-section {
      background: ${me(s.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: ${me(s.cardShadow)};
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
      color: ${me(s.textPrimary)};
    }

    .planned-main-value .unit {
      font-size: 12px;
      font-weight: 400;
      color: ${me(s.textSecondary)};
    }

    .planned-trend {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
    }

    .planned-profile {
      font-size: 11px;
      color: ${me(s.textSecondary)};
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
      color: ${me(s.textSecondary)};
      text-transform: uppercase;
    }

    .planned-detail-value {
      font-size: 14px;
      font-weight: 600;
      color: ${me(s.textPrimary)};
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
      color: ${me(s.textSecondary)};
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
  `;ke([g({type:Object})],rr.prototype,"data",2);ke([g({type:Boolean})],rr.prototype,"topOnly",2);rr=ke([E("oig-pricing-stats")],rr);const Fs=6048e5,Rh=864e5,vr=6e4,yr=36e5,Wh=1e3,Io=Symbol.for("constructDateFrom");function xe(e,t){return typeof e=="function"?e(t):e&&typeof e=="object"&&Io in e?e[Io](t):e instanceof Date?new e.constructor(t):new Date(t)}function U(e,t){return xe(t||e,e)}function Sn(e,t,i){const r=U(e,i==null?void 0:i.in);return isNaN(t)?xe((i==null?void 0:i.in)||e,NaN):(t&&r.setDate(r.getDate()+t),r)}function La(e,t,i){const r=U(e,i==null?void 0:i.in);if(isNaN(t))return xe(e,NaN);if(!t)return r;const n=r.getDate(),a=xe(e,r.getTime());a.setMonth(r.getMonth()+t+1,0);const o=a.getDate();return n>=o?a:(r.setFullYear(a.getFullYear(),a.getMonth(),n),r)}function Ha(e,t,i){return xe(e,+U(e)+t)}function Zh(e,t,i){return Ha(e,t*yr)}let Kh={};function Ut(){return Kh}function Xe(e,t){var l,d,p,u;const i=Ut(),r=(t==null?void 0:t.weekStartsOn)??((d=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:d.weekStartsOn)??i.weekStartsOn??((u=(p=i.locale)==null?void 0:p.options)==null?void 0:u.weekStartsOn)??0,n=U(e,t==null?void 0:t.in),a=n.getDay(),o=(a<r?7:0)+a-r;return n.setDate(n.getDate()-o),n.setHours(0,0,0,0),n}function fi(e,t){return Xe(e,{...t,weekStartsOn:1})}function Is(e,t){const i=U(e,t==null?void 0:t.in),r=i.getFullYear(),n=xe(i,0);n.setFullYear(r+1,0,4),n.setHours(0,0,0,0);const a=fi(n),o=xe(i,0);o.setFullYear(r,0,4),o.setHours(0,0,0,0);const l=fi(o);return i.getTime()>=a.getTime()?r+1:i.getTime()>=l.getTime()?r:r-1}function an(e){const t=U(e),i=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()));return i.setUTCFullYear(t.getFullYear()),+e-+i}function Yt(e,...t){const i=xe.bind(null,t.find(r=>typeof r=="object"));return t.map(i)}function va(e,t){const i=U(e,t==null?void 0:t.in);return i.setHours(0,0,0,0),i}function Bs(e,t,i){const[r,n]=Yt(i==null?void 0:i.in,e,t),a=va(r),o=va(n),l=+a-an(a),d=+o-an(o);return Math.round((l-d)/Rh)}function qh(e,t){const i=Is(e,t),r=xe(e,0);return r.setFullYear(i,0,4),r.setHours(0,0,0,0),fi(r)}function Gh(e,t,i){const r=U(e,i==null?void 0:i.in);return r.setTime(r.getTime()+t*vr),r}function Uh(e,t,i){return La(e,t*3,i)}function Yh(e,t,i){return Ha(e,t*1e3)}function Qh(e,t,i){return Sn(e,t*7,i)}function Xh(e,t,i){return La(e,t*12,i)}function Ji(e,t){const i=+U(e)-+U(t);return i<0?-1:i>0?1:i}function Jh(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function Ns(e){return!(!Jh(e)&&typeof e!="number"||isNaN(+U(e)))}function e0(e,t,i){const[r,n]=Yt(i==null?void 0:i.in,e,t),a=r.getFullYear()-n.getFullYear(),o=r.getMonth()-n.getMonth();return a*12+o}function t0(e,t,i){const[r,n]=Yt(i==null?void 0:i.in,e,t);return r.getFullYear()-n.getFullYear()}function js(e,t,i){const[r,n]=Yt(i==null?void 0:i.in,e,t),a=Bo(r,n),o=Math.abs(Bs(r,n));r.setDate(r.getDate()-a*o);const l=+(Bo(r,n)===-a),d=a*(o-l);return d===0?0:d}function Bo(e,t){const i=e.getFullYear()-t.getFullYear()||e.getMonth()-t.getMonth()||e.getDate()-t.getDate()||e.getHours()-t.getHours()||e.getMinutes()-t.getMinutes()||e.getSeconds()-t.getSeconds()||e.getMilliseconds()-t.getMilliseconds();return i<0?-1:i>0?1:i}function xr(e){return t=>{const r=(e?Math[e]:Math.trunc)(t);return r===0?0:r}}function i0(e,t,i){const[r,n]=Yt(i==null?void 0:i.in,e,t),a=(+r-+n)/yr;return xr(i==null?void 0:i.roundingMethod)(a)}function Va(e,t){return+U(e)-+U(t)}function r0(e,t,i){const r=Va(e,t)/vr;return xr(i==null?void 0:i.roundingMethod)(r)}function Rs(e,t){const i=U(e,t==null?void 0:t.in);return i.setHours(23,59,59,999),i}function Ws(e,t){const i=U(e,t==null?void 0:t.in),r=i.getMonth();return i.setFullYear(i.getFullYear(),r+1,0),i.setHours(23,59,59,999),i}function n0(e,t){const i=U(e,t==null?void 0:t.in);return+Rs(i,t)==+Ws(i,t)}function Zs(e,t,i){const[r,n,a]=Yt(i==null?void 0:i.in,e,e,t),o=Ji(n,a),l=Math.abs(e0(n,a));if(l<1)return 0;n.getMonth()===1&&n.getDate()>27&&n.setDate(30),n.setMonth(n.getMonth()-o*l);let d=Ji(n,a)===-o;n0(r)&&l===1&&Ji(r,a)===1&&(d=!1);const p=o*(l-+d);return p===0?0:p}function a0(e,t,i){const r=Zs(e,t,i)/3;return xr(i==null?void 0:i.roundingMethod)(r)}function o0(e,t,i){const r=Va(e,t)/1e3;return xr(i==null?void 0:i.roundingMethod)(r)}function s0(e,t,i){const r=js(e,t,i)/7;return xr(i==null?void 0:i.roundingMethod)(r)}function l0(e,t,i){const[r,n]=Yt(i==null?void 0:i.in,e,t),a=Ji(r,n),o=Math.abs(t0(r,n));r.setFullYear(1584),n.setFullYear(1584);const l=Ji(r,n)===-a,d=a*(o-+l);return d===0?0:d}function c0(e,t){const i=U(e,t==null?void 0:t.in),r=i.getMonth(),n=r-r%3;return i.setMonth(n,1),i.setHours(0,0,0,0),i}function d0(e,t){const i=U(e,t==null?void 0:t.in);return i.setDate(1),i.setHours(0,0,0,0),i}function p0(e,t){const i=U(e,t==null?void 0:t.in),r=i.getFullYear();return i.setFullYear(r+1,0,0),i.setHours(23,59,59,999),i}function Ks(e,t){const i=U(e,t==null?void 0:t.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}function u0(e,t){const i=U(e,t==null?void 0:t.in);return i.setMinutes(59,59,999),i}function h0(e,t){var l,d;const i=Ut(),r=i.weekStartsOn??((d=(l=i.locale)==null?void 0:l.options)==null?void 0:d.weekStartsOn)??0,n=U(e,t==null?void 0:t.in),a=n.getDay(),o=(a<r?-7:0)+6-(a-r);return n.setDate(n.getDate()+o),n.setHours(23,59,59,999),n}function g0(e,t){const i=U(e,t==null?void 0:t.in);return i.setSeconds(59,999),i}function m0(e,t){const i=U(e,t==null?void 0:t.in),r=i.getMonth(),n=r-r%3+3;return i.setMonth(n,0),i.setHours(23,59,59,999),i}function b0(e,t){const i=U(e,t==null?void 0:t.in);return i.setMilliseconds(999),i}const f0={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},v0=(e,t,i)=>{let r;const n=f0[e];return typeof n=="string"?r=n:t===1?r=n.one:r=n.other.replace("{{count}}",t.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+r:r+" ago":r};function ea(e){return(t={})=>{const i=t.width?String(t.width):e.defaultWidth;return e.formats[i]||e.formats[e.defaultWidth]}}const y0={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},x0={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},w0={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},_0={date:ea({formats:y0,defaultWidth:"full"}),time:ea({formats:x0,defaultWidth:"full"}),dateTime:ea({formats:w0,defaultWidth:"full"})},$0={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},k0=(e,t,i,r)=>$0[e];function Zi(e){return(t,i)=>{const r=i!=null&&i.context?String(i.context):"standalone";let n;if(r==="formatting"&&e.formattingValues){const o=e.defaultFormattingWidth||e.defaultWidth,l=i!=null&&i.width?String(i.width):o;n=e.formattingValues[l]||e.formattingValues[o]}else{const o=e.defaultWidth,l=i!=null&&i.width?String(i.width):e.defaultWidth;n=e.values[l]||e.values[o]}const a=e.argumentCallback?e.argumentCallback(t):t;return n[a]}}const C0={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},M0={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},S0={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},A0={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},L0={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},H0={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},V0=(e,t)=>{const i=Number(e),r=i%100;if(r>20||r<10)switch(r%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},T0={ordinalNumber:V0,era:Zi({values:C0,defaultWidth:"wide"}),quarter:Zi({values:M0,defaultWidth:"wide",argumentCallback:e=>e-1}),month:Zi({values:S0,defaultWidth:"wide"}),day:Zi({values:A0,defaultWidth:"wide"}),dayPeriod:Zi({values:L0,defaultWidth:"wide",formattingValues:H0,defaultFormattingWidth:"wide"})};function Ki(e){return(t,i={})=>{const r=i.width,n=r&&e.matchPatterns[r]||e.matchPatterns[e.defaultMatchWidth],a=t.match(n);if(!a)return null;const o=a[0],l=r&&e.parsePatterns[r]||e.parsePatterns[e.defaultParseWidth],d=Array.isArray(l)?z0(l,h=>h.test(o)):P0(l,h=>h.test(o));let p;p=e.valueCallback?e.valueCallback(d):d,p=i.valueCallback?i.valueCallback(p):p;const u=t.slice(o.length);return{value:p,rest:u}}}function P0(e,t){for(const i in e)if(Object.prototype.hasOwnProperty.call(e,i)&&t(e[i]))return i}function z0(e,t){for(let i=0;i<e.length;i++)if(t(e[i]))return i}function D0(e){return(t,i={})=>{const r=t.match(e.matchPattern);if(!r)return null;const n=r[0],a=t.match(e.parsePattern);if(!a)return null;let o=e.valueCallback?e.valueCallback(a[0]):a[0];o=i.valueCallback?i.valueCallback(o):o;const l=t.slice(n.length);return{value:o,rest:l}}}const E0=/^(\d+)(th|st|nd|rd)?/i,O0=/\d+/i,F0={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},I0={any:[/^b/i,/^(a|c)/i]},B0={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},N0={any:[/1/i,/2/i,/3/i,/4/i]},j0={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},R0={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},W0={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},Z0={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},K0={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},q0={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},G0={ordinalNumber:D0({matchPattern:E0,parsePattern:O0,valueCallback:e=>parseInt(e,10)}),era:Ki({matchPatterns:F0,defaultMatchWidth:"wide",parsePatterns:I0,defaultParseWidth:"any"}),quarter:Ki({matchPatterns:B0,defaultMatchWidth:"wide",parsePatterns:N0,defaultParseWidth:"any",valueCallback:e=>e+1}),month:Ki({matchPatterns:j0,defaultMatchWidth:"wide",parsePatterns:R0,defaultParseWidth:"any"}),day:Ki({matchPatterns:W0,defaultMatchWidth:"wide",parsePatterns:Z0,defaultParseWidth:"any"}),dayPeriod:Ki({matchPatterns:K0,defaultMatchWidth:"any",parsePatterns:q0,defaultParseWidth:"any"})},qs={code:"en-US",formatDistance:v0,formatLong:_0,formatRelative:k0,localize:T0,match:G0,options:{weekStartsOn:0,firstWeekContainsDate:1}};function U0(e,t){const i=U(e,t==null?void 0:t.in);return Bs(i,Ks(i))+1}function Gs(e,t){const i=U(e,t==null?void 0:t.in),r=+fi(i)-+qh(i);return Math.round(r/Fs)+1}function Ta(e,t){var u,h,m,v;const i=U(e,t==null?void 0:t.in),r=i.getFullYear(),n=Ut(),a=(t==null?void 0:t.firstWeekContainsDate)??((h=(u=t==null?void 0:t.locale)==null?void 0:u.options)==null?void 0:h.firstWeekContainsDate)??n.firstWeekContainsDate??((v=(m=n.locale)==null?void 0:m.options)==null?void 0:v.firstWeekContainsDate)??1,o=xe((t==null?void 0:t.in)||e,0);o.setFullYear(r+1,0,a),o.setHours(0,0,0,0);const l=Xe(o,t),d=xe((t==null?void 0:t.in)||e,0);d.setFullYear(r,0,a),d.setHours(0,0,0,0);const p=Xe(d,t);return+i>=+l?r+1:+i>=+p?r:r-1}function Y0(e,t){var l,d,p,u;const i=Ut(),r=(t==null?void 0:t.firstWeekContainsDate)??((d=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:d.firstWeekContainsDate)??i.firstWeekContainsDate??((u=(p=i.locale)==null?void 0:p.options)==null?void 0:u.firstWeekContainsDate)??1,n=Ta(e,t),a=xe((t==null?void 0:t.in)||e,0);return a.setFullYear(n,0,r),a.setHours(0,0,0,0),Xe(a,t)}function Us(e,t){const i=U(e,t==null?void 0:t.in),r=+Xe(i,t)-+Y0(i,t);return Math.round(r/Fs)+1}function ne(e,t){const i=e<0?"-":"",r=Math.abs(e).toString().padStart(t,"0");return i+r}const dt={y(e,t){const i=e.getFullYear(),r=i>0?i:1-i;return ne(t==="yy"?r%100:r,t.length)},M(e,t){const i=e.getMonth();return t==="M"?String(i+1):ne(i+1,2)},d(e,t){return ne(e.getDate(),t.length)},a(e,t){const i=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(e,t){return ne(e.getHours()%12||12,t.length)},H(e,t){return ne(e.getHours(),t.length)},m(e,t){return ne(e.getMinutes(),t.length)},s(e,t){return ne(e.getSeconds(),t.length)},S(e,t){const i=t.length,r=e.getMilliseconds(),n=Math.trunc(r*Math.pow(10,i-3));return ne(n,t.length)}},ri={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},No={G:function(e,t,i){const r=e.getFullYear()>0?1:0;switch(t){case"G":case"GG":case"GGG":return i.era(r,{width:"abbreviated"});case"GGGGG":return i.era(r,{width:"narrow"});case"GGGG":default:return i.era(r,{width:"wide"})}},y:function(e,t,i){if(t==="yo"){const r=e.getFullYear(),n=r>0?r:1-r;return i.ordinalNumber(n,{unit:"year"})}return dt.y(e,t)},Y:function(e,t,i,r){const n=Ta(e,r),a=n>0?n:1-n;if(t==="YY"){const o=a%100;return ne(o,2)}return t==="Yo"?i.ordinalNumber(a,{unit:"year"}):ne(a,t.length)},R:function(e,t){const i=Is(e);return ne(i,t.length)},u:function(e,t){const i=e.getFullYear();return ne(i,t.length)},Q:function(e,t,i){const r=Math.ceil((e.getMonth()+1)/3);switch(t){case"Q":return String(r);case"QQ":return ne(r,2);case"Qo":return i.ordinalNumber(r,{unit:"quarter"});case"QQQ":return i.quarter(r,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(r,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(r,{width:"wide",context:"formatting"})}},q:function(e,t,i){const r=Math.ceil((e.getMonth()+1)/3);switch(t){case"q":return String(r);case"qq":return ne(r,2);case"qo":return i.ordinalNumber(r,{unit:"quarter"});case"qqq":return i.quarter(r,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(r,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(r,{width:"wide",context:"standalone"})}},M:function(e,t,i){const r=e.getMonth();switch(t){case"M":case"MM":return dt.M(e,t);case"Mo":return i.ordinalNumber(r+1,{unit:"month"});case"MMM":return i.month(r,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(r,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(r,{width:"wide",context:"formatting"})}},L:function(e,t,i){const r=e.getMonth();switch(t){case"L":return String(r+1);case"LL":return ne(r+1,2);case"Lo":return i.ordinalNumber(r+1,{unit:"month"});case"LLL":return i.month(r,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(r,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(r,{width:"wide",context:"standalone"})}},w:function(e,t,i,r){const n=Us(e,r);return t==="wo"?i.ordinalNumber(n,{unit:"week"}):ne(n,t.length)},I:function(e,t,i){const r=Gs(e);return t==="Io"?i.ordinalNumber(r,{unit:"week"}):ne(r,t.length)},d:function(e,t,i){return t==="do"?i.ordinalNumber(e.getDate(),{unit:"date"}):dt.d(e,t)},D:function(e,t,i){const r=U0(e);return t==="Do"?i.ordinalNumber(r,{unit:"dayOfYear"}):ne(r,t.length)},E:function(e,t,i){const r=e.getDay();switch(t){case"E":case"EE":case"EEE":return i.day(r,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(r,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(r,{width:"short",context:"formatting"});case"EEEE":default:return i.day(r,{width:"wide",context:"formatting"})}},e:function(e,t,i,r){const n=e.getDay(),a=(n-r.weekStartsOn+8)%7||7;switch(t){case"e":return String(a);case"ee":return ne(a,2);case"eo":return i.ordinalNumber(a,{unit:"day"});case"eee":return i.day(n,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(n,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(n,{width:"short",context:"formatting"});case"eeee":default:return i.day(n,{width:"wide",context:"formatting"})}},c:function(e,t,i,r){const n=e.getDay(),a=(n-r.weekStartsOn+8)%7||7;switch(t){case"c":return String(a);case"cc":return ne(a,t.length);case"co":return i.ordinalNumber(a,{unit:"day"});case"ccc":return i.day(n,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(n,{width:"narrow",context:"standalone"});case"cccccc":return i.day(n,{width:"short",context:"standalone"});case"cccc":default:return i.day(n,{width:"wide",context:"standalone"})}},i:function(e,t,i){const r=e.getDay(),n=r===0?7:r;switch(t){case"i":return String(n);case"ii":return ne(n,t.length);case"io":return i.ordinalNumber(n,{unit:"day"});case"iii":return i.day(r,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(r,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(r,{width:"short",context:"formatting"});case"iiii":default:return i.day(r,{width:"wide",context:"formatting"})}},a:function(e,t,i){const n=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(n,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(n,{width:"wide",context:"formatting"})}},b:function(e,t,i){const r=e.getHours();let n;switch(r===12?n=ri.noon:r===0?n=ri.midnight:n=r/12>=1?"pm":"am",t){case"b":case"bb":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(n,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(n,{width:"wide",context:"formatting"})}},B:function(e,t,i){const r=e.getHours();let n;switch(r>=17?n=ri.evening:r>=12?n=ri.afternoon:r>=4?n=ri.morning:n=ri.night,t){case"B":case"BB":case"BBB":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(n,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(n,{width:"wide",context:"formatting"})}},h:function(e,t,i){if(t==="ho"){let r=e.getHours()%12;return r===0&&(r=12),i.ordinalNumber(r,{unit:"hour"})}return dt.h(e,t)},H:function(e,t,i){return t==="Ho"?i.ordinalNumber(e.getHours(),{unit:"hour"}):dt.H(e,t)},K:function(e,t,i){const r=e.getHours()%12;return t==="Ko"?i.ordinalNumber(r,{unit:"hour"}):ne(r,t.length)},k:function(e,t,i){let r=e.getHours();return r===0&&(r=24),t==="ko"?i.ordinalNumber(r,{unit:"hour"}):ne(r,t.length)},m:function(e,t,i){return t==="mo"?i.ordinalNumber(e.getMinutes(),{unit:"minute"}):dt.m(e,t)},s:function(e,t,i){return t==="so"?i.ordinalNumber(e.getSeconds(),{unit:"second"}):dt.s(e,t)},S:function(e,t){return dt.S(e,t)},X:function(e,t,i){const r=e.getTimezoneOffset();if(r===0)return"Z";switch(t){case"X":return Ro(r);case"XXXX":case"XX":return Dt(r);case"XXXXX":case"XXX":default:return Dt(r,":")}},x:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"x":return Ro(r);case"xxxx":case"xx":return Dt(r);case"xxxxx":case"xxx":default:return Dt(r,":")}},O:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"O":case"OO":case"OOO":return"GMT"+jo(r,":");case"OOOO":default:return"GMT"+Dt(r,":")}},z:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"z":case"zz":case"zzz":return"GMT"+jo(r,":");case"zzzz":default:return"GMT"+Dt(r,":")}},t:function(e,t,i){const r=Math.trunc(+e/1e3);return ne(r,t.length)},T:function(e,t,i){return ne(+e,t.length)}};function jo(e,t=""){const i=e>0?"-":"+",r=Math.abs(e),n=Math.trunc(r/60),a=r%60;return a===0?i+String(n):i+String(n)+t+ne(a,2)}function Ro(e,t){return e%60===0?(e>0?"-":"+")+ne(Math.abs(e)/60,2):Dt(e,t)}function Dt(e,t=""){const i=e>0?"-":"+",r=Math.abs(e),n=ne(Math.trunc(r/60),2),a=ne(r%60,2);return i+n+t+a}const Wo=(e,t)=>{switch(e){case"P":return t.date({width:"short"});case"PP":return t.date({width:"medium"});case"PPP":return t.date({width:"long"});case"PPPP":default:return t.date({width:"full"})}},Ys=(e,t)=>{switch(e){case"p":return t.time({width:"short"});case"pp":return t.time({width:"medium"});case"ppp":return t.time({width:"long"});case"pppp":default:return t.time({width:"full"})}},Q0=(e,t)=>{const i=e.match(/(P+)(p+)?/)||[],r=i[1],n=i[2];if(!n)return Wo(e,t);let a;switch(r){case"P":a=t.dateTime({width:"short"});break;case"PP":a=t.dateTime({width:"medium"});break;case"PPP":a=t.dateTime({width:"long"});break;case"PPPP":default:a=t.dateTime({width:"full"});break}return a.replace("{{date}}",Wo(r,t)).replace("{{time}}",Ys(n,t))},ya={p:Ys,P:Q0},X0=/^D+$/,J0=/^Y+$/,eg=["D","DD","YY","YYYY"];function Qs(e){return X0.test(e)}function Xs(e){return J0.test(e)}function xa(e,t,i){const r=tg(e,t,i);if(console.warn(r),eg.includes(e))throw new RangeError(r)}function tg(e,t,i){const r=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${t}\`) for formatting ${r} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const ig=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,rg=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,ng=/^'([^]*?)'?$/,ag=/''/g,og=/[a-zA-Z]/;function sg(e,t,i){var u,h,m,v,f,b,$,y;const r=Ut(),n=(i==null?void 0:i.locale)??r.locale??qs,a=(i==null?void 0:i.firstWeekContainsDate)??((h=(u=i==null?void 0:i.locale)==null?void 0:u.options)==null?void 0:h.firstWeekContainsDate)??r.firstWeekContainsDate??((v=(m=r.locale)==null?void 0:m.options)==null?void 0:v.firstWeekContainsDate)??1,o=(i==null?void 0:i.weekStartsOn)??((b=(f=i==null?void 0:i.locale)==null?void 0:f.options)==null?void 0:b.weekStartsOn)??r.weekStartsOn??((y=($=r.locale)==null?void 0:$.options)==null?void 0:y.weekStartsOn)??0,l=U(e,i==null?void 0:i.in);if(!Ns(l))throw new RangeError("Invalid time value");let d=t.match(rg).map(_=>{const S=_[0];if(S==="p"||S==="P"){const B=ya[S];return B(_,n.formatLong)}return _}).join("").match(ig).map(_=>{if(_==="''")return{isToken:!1,value:"'"};const S=_[0];if(S==="'")return{isToken:!1,value:lg(_)};if(No[S])return{isToken:!0,value:_};if(S.match(og))throw new RangeError("Format string contains an unescaped latin alphabet character `"+S+"`");return{isToken:!1,value:_}});n.localize.preprocessor&&(d=n.localize.preprocessor(l,d));const p={firstWeekContainsDate:a,weekStartsOn:o,locale:n};return d.map(_=>{if(!_.isToken)return _.value;const S=_.value;(!(i!=null&&i.useAdditionalWeekYearTokens)&&Xs(S)||!(i!=null&&i.useAdditionalDayOfYearTokens)&&Qs(S))&&xa(S,t,String(e));const B=No[S[0]];return B(l,S,n.localize,p)}).join("")}function lg(e){const t=e.match(ng);return t?t[1].replace(ag,"'"):e}function cg(){return Object.assign({},Ut())}function dg(e,t){const i=U(e,t==null?void 0:t.in).getDay();return i===0?7:i}function pg(e,t){const i=ug(t)?new t(0):xe(t,0);return i.setFullYear(e.getFullYear(),e.getMonth(),e.getDate()),i.setHours(e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()),i}function ug(e){var t;return typeof e=="function"&&((t=e.prototype)==null?void 0:t.constructor)===e}const hg=10;class Js{constructor(){z(this,"subPriority",0)}validate(t,i){return!0}}class gg extends Js{constructor(t,i,r,n,a){super(),this.value=t,this.validateValue=i,this.setValue=r,this.priority=n,a&&(this.subPriority=a)}validate(t,i){return this.validateValue(t,this.value,i)}set(t,i,r){return this.setValue(t,i,this.value,r)}}class mg extends Js{constructor(i,r){super();z(this,"priority",hg);z(this,"subPriority",-1);this.context=i||(n=>xe(r,n))}set(i,r){return r.timestampIsSet?i:xe(i,pg(i,this.context))}}class te{run(t,i,r,n){const a=this.parse(t,i,r,n);return a?{setter:new gg(a.value,this.validate,this.set,this.priority,this.subPriority),rest:a.rest}:null}validate(t,i,r){return!0}}class bg extends te{constructor(){super(...arguments);z(this,"priority",140);z(this,"incompatibleTokens",["R","u","t","T"])}parse(i,r,n){switch(r){case"G":case"GG":case"GGG":return n.era(i,{width:"abbreviated"})||n.era(i,{width:"narrow"});case"GGGGG":return n.era(i,{width:"narrow"});case"GGGG":default:return n.era(i,{width:"wide"})||n.era(i,{width:"abbreviated"})||n.era(i,{width:"narrow"})}}set(i,r,n){return r.era=n,i.setFullYear(n,0,1),i.setHours(0,0,0,0),i}}const _e={month:/^(1[0-2]|0?\d)/,date:/^(3[0-1]|[0-2]?\d)/,dayOfYear:/^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,week:/^(5[0-3]|[0-4]?\d)/,hour23h:/^(2[0-3]|[0-1]?\d)/,hour24h:/^(2[0-4]|[0-1]?\d)/,hour11h:/^(1[0-1]|0?\d)/,hour12h:/^(1[0-2]|0?\d)/,minute:/^[0-5]?\d/,second:/^[0-5]?\d/,singleDigit:/^\d/,twoDigits:/^\d{1,2}/,threeDigits:/^\d{1,3}/,fourDigits:/^\d{1,4}/,anyDigitsSigned:/^-?\d+/,singleDigitSigned:/^-?\d/,twoDigitsSigned:/^-?\d{1,2}/,threeDigitsSigned:/^-?\d{1,3}/,fourDigitsSigned:/^-?\d{1,4}/},Ue={basicOptionalMinutes:/^([+-])(\d{2})(\d{2})?|Z/,basic:/^([+-])(\d{2})(\d{2})|Z/,basicOptionalSeconds:/^([+-])(\d{2})(\d{2})((\d{2}))?|Z/,extended:/^([+-])(\d{2}):(\d{2})|Z/,extendedOptionalSeconds:/^([+-])(\d{2}):(\d{2})(:(\d{2}))?|Z/};function $e(e,t){return e&&{value:t(e.value),rest:e.rest}}function be(e,t){const i=t.match(e);return i?{value:parseInt(i[0],10),rest:t.slice(i[0].length)}:null}function Ye(e,t){const i=t.match(e);if(!i)return null;if(i[0]==="Z")return{value:0,rest:t.slice(1)};const r=i[1]==="+"?1:-1,n=i[2]?parseInt(i[2],10):0,a=i[3]?parseInt(i[3],10):0,o=i[5]?parseInt(i[5],10):0;return{value:r*(n*yr+a*vr+o*Wh),rest:t.slice(i[0].length)}}function el(e){return be(_e.anyDigitsSigned,e)}function we(e,t){switch(e){case 1:return be(_e.singleDigit,t);case 2:return be(_e.twoDigits,t);case 3:return be(_e.threeDigits,t);case 4:return be(_e.fourDigits,t);default:return be(new RegExp("^\\d{1,"+e+"}"),t)}}function on(e,t){switch(e){case 1:return be(_e.singleDigitSigned,t);case 2:return be(_e.twoDigitsSigned,t);case 3:return be(_e.threeDigitsSigned,t);case 4:return be(_e.fourDigitsSigned,t);default:return be(new RegExp("^-?\\d{1,"+e+"}"),t)}}function Pa(e){switch(e){case"morning":return 4;case"evening":return 17;case"pm":case"noon":case"afternoon":return 12;case"am":case"midnight":case"night":default:return 0}}function tl(e,t){const i=t>0,r=i?t:1-t;let n;if(r<=50)n=e||100;else{const a=r+50,o=Math.trunc(a/100)*100,l=e>=a%100;n=e+o-(l?100:0)}return i?n:1-n}function il(e){return e%400===0||e%4===0&&e%100!==0}class fg extends te{constructor(){super(...arguments);z(this,"priority",130);z(this,"incompatibleTokens",["Y","R","u","w","I","i","e","c","t","T"])}parse(i,r,n){const a=o=>({year:o,isTwoDigitYear:r==="yy"});switch(r){case"y":return $e(we(4,i),a);case"yo":return $e(n.ordinalNumber(i,{unit:"year"}),a);default:return $e(we(r.length,i),a)}}validate(i,r){return r.isTwoDigitYear||r.year>0}set(i,r,n){const a=i.getFullYear();if(n.isTwoDigitYear){const l=tl(n.year,a);return i.setFullYear(l,0,1),i.setHours(0,0,0,0),i}const o=!("era"in r)||r.era===1?n.year:1-n.year;return i.setFullYear(o,0,1),i.setHours(0,0,0,0),i}}class vg extends te{constructor(){super(...arguments);z(this,"priority",130);z(this,"incompatibleTokens",["y","R","u","Q","q","M","L","I","d","D","i","t","T"])}parse(i,r,n){const a=o=>({year:o,isTwoDigitYear:r==="YY"});switch(r){case"Y":return $e(we(4,i),a);case"Yo":return $e(n.ordinalNumber(i,{unit:"year"}),a);default:return $e(we(r.length,i),a)}}validate(i,r){return r.isTwoDigitYear||r.year>0}set(i,r,n,a){const o=Ta(i,a);if(n.isTwoDigitYear){const d=tl(n.year,o);return i.setFullYear(d,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),Xe(i,a)}const l=!("era"in r)||r.era===1?n.year:1-n.year;return i.setFullYear(l,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),Xe(i,a)}}class yg extends te{constructor(){super(...arguments);z(this,"priority",130);z(this,"incompatibleTokens",["G","y","Y","u","Q","q","M","L","w","d","D","e","c","t","T"])}parse(i,r){return on(r==="R"?4:r.length,i)}set(i,r,n){const a=xe(i,0);return a.setFullYear(n,0,4),a.setHours(0,0,0,0),fi(a)}}class xg extends te{constructor(){super(...arguments);z(this,"priority",130);z(this,"incompatibleTokens",["G","y","Y","R","w","I","i","e","c","t","T"])}parse(i,r){return on(r==="u"?4:r.length,i)}set(i,r,n){return i.setFullYear(n,0,1),i.setHours(0,0,0,0),i}}class wg extends te{constructor(){super(...arguments);z(this,"priority",120);z(this,"incompatibleTokens",["Y","R","q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"Q":case"QQ":return we(r.length,i);case"Qo":return n.ordinalNumber(i,{unit:"quarter"});case"QQQ":return n.quarter(i,{width:"abbreviated",context:"formatting"})||n.quarter(i,{width:"narrow",context:"formatting"});case"QQQQQ":return n.quarter(i,{width:"narrow",context:"formatting"});case"QQQQ":default:return n.quarter(i,{width:"wide",context:"formatting"})||n.quarter(i,{width:"abbreviated",context:"formatting"})||n.quarter(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=1&&r<=4}set(i,r,n){return i.setMonth((n-1)*3,1),i.setHours(0,0,0,0),i}}class _g extends te{constructor(){super(...arguments);z(this,"priority",120);z(this,"incompatibleTokens",["Y","R","Q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"q":case"qq":return we(r.length,i);case"qo":return n.ordinalNumber(i,{unit:"quarter"});case"qqq":return n.quarter(i,{width:"abbreviated",context:"standalone"})||n.quarter(i,{width:"narrow",context:"standalone"});case"qqqqq":return n.quarter(i,{width:"narrow",context:"standalone"});case"qqqq":default:return n.quarter(i,{width:"wide",context:"standalone"})||n.quarter(i,{width:"abbreviated",context:"standalone"})||n.quarter(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=1&&r<=4}set(i,r,n){return i.setMonth((n-1)*3,1),i.setHours(0,0,0,0),i}}class $g extends te{constructor(){super(...arguments);z(this,"incompatibleTokens",["Y","R","q","Q","L","w","I","D","i","e","c","t","T"]);z(this,"priority",110)}parse(i,r,n){const a=o=>o-1;switch(r){case"M":return $e(be(_e.month,i),a);case"MM":return $e(we(2,i),a);case"Mo":return $e(n.ordinalNumber(i,{unit:"month"}),a);case"MMM":return n.month(i,{width:"abbreviated",context:"formatting"})||n.month(i,{width:"narrow",context:"formatting"});case"MMMMM":return n.month(i,{width:"narrow",context:"formatting"});case"MMMM":default:return n.month(i,{width:"wide",context:"formatting"})||n.month(i,{width:"abbreviated",context:"formatting"})||n.month(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=11}set(i,r,n){return i.setMonth(n,1),i.setHours(0,0,0,0),i}}class kg extends te{constructor(){super(...arguments);z(this,"priority",110);z(this,"incompatibleTokens",["Y","R","q","Q","M","w","I","D","i","e","c","t","T"])}parse(i,r,n){const a=o=>o-1;switch(r){case"L":return $e(be(_e.month,i),a);case"LL":return $e(we(2,i),a);case"Lo":return $e(n.ordinalNumber(i,{unit:"month"}),a);case"LLL":return n.month(i,{width:"abbreviated",context:"standalone"})||n.month(i,{width:"narrow",context:"standalone"});case"LLLLL":return n.month(i,{width:"narrow",context:"standalone"});case"LLLL":default:return n.month(i,{width:"wide",context:"standalone"})||n.month(i,{width:"abbreviated",context:"standalone"})||n.month(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=0&&r<=11}set(i,r,n){return i.setMonth(n,1),i.setHours(0,0,0,0),i}}function Cg(e,t,i){const r=U(e,i==null?void 0:i.in),n=Us(r,i)-t;return r.setDate(r.getDate()-n*7),U(r,i==null?void 0:i.in)}class Mg extends te{constructor(){super(...arguments);z(this,"priority",100);z(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","i","t","T"])}parse(i,r,n){switch(r){case"w":return be(_e.week,i);case"wo":return n.ordinalNumber(i,{unit:"week"});default:return we(r.length,i)}}validate(i,r){return r>=1&&r<=53}set(i,r,n,a){return Xe(Cg(i,n,a),a)}}function Sg(e,t,i){const r=U(e,i==null?void 0:i.in),n=Gs(r,i)-t;return r.setDate(r.getDate()-n*7),r}class Ag extends te{constructor(){super(...arguments);z(this,"priority",100);z(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","e","c","t","T"])}parse(i,r,n){switch(r){case"I":return be(_e.week,i);case"Io":return n.ordinalNumber(i,{unit:"week"});default:return we(r.length,i)}}validate(i,r){return r>=1&&r<=53}set(i,r,n){return fi(Sg(i,n))}}const Lg=[31,28,31,30,31,30,31,31,30,31,30,31],Hg=[31,29,31,30,31,30,31,31,30,31,30,31];class Vg extends te{constructor(){super(...arguments);z(this,"priority",90);z(this,"subPriority",1);z(this,"incompatibleTokens",["Y","R","q","Q","w","I","D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"d":return be(_e.date,i);case"do":return n.ordinalNumber(i,{unit:"date"});default:return we(r.length,i)}}validate(i,r){const n=i.getFullYear(),a=il(n),o=i.getMonth();return a?r>=1&&r<=Hg[o]:r>=1&&r<=Lg[o]}set(i,r,n){return i.setDate(n),i.setHours(0,0,0,0),i}}class Tg extends te{constructor(){super(...arguments);z(this,"priority",90);z(this,"subpriority",1);z(this,"incompatibleTokens",["Y","R","q","Q","M","L","w","I","d","E","i","e","c","t","T"])}parse(i,r,n){switch(r){case"D":case"DD":return be(_e.dayOfYear,i);case"Do":return n.ordinalNumber(i,{unit:"date"});default:return we(r.length,i)}}validate(i,r){const n=i.getFullYear();return il(n)?r>=1&&r<=366:r>=1&&r<=365}set(i,r,n){return i.setMonth(0,n),i.setHours(0,0,0,0),i}}function za(e,t,i){var h,m,v,f;const r=Ut(),n=(i==null?void 0:i.weekStartsOn)??((m=(h=i==null?void 0:i.locale)==null?void 0:h.options)==null?void 0:m.weekStartsOn)??r.weekStartsOn??((f=(v=r.locale)==null?void 0:v.options)==null?void 0:f.weekStartsOn)??0,a=U(e,i==null?void 0:i.in),o=a.getDay(),d=(t%7+7)%7,p=7-n,u=t<0||t>6?t-(o+p)%7:(d+p)%7-(o+p)%7;return Sn(a,u,i)}class Pg extends te{constructor(){super(...arguments);z(this,"priority",90);z(this,"incompatibleTokens",["D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"E":case"EE":case"EEE":return n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"EEEEE":return n.day(i,{width:"narrow",context:"formatting"});case"EEEEEE":return n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"EEEE":default:return n.day(i,{width:"wide",context:"formatting"})||n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=6}set(i,r,n,a){return i=za(i,n,a),i.setHours(0,0,0,0),i}}class zg extends te{constructor(){super(...arguments);z(this,"priority",90);z(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","c","t","T"])}parse(i,r,n,a){const o=l=>{const d=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+d};switch(r){case"e":case"ee":return $e(we(r.length,i),o);case"eo":return $e(n.ordinalNumber(i,{unit:"day"}),o);case"eee":return n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"eeeee":return n.day(i,{width:"narrow",context:"formatting"});case"eeeeee":return n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"eeee":default:return n.day(i,{width:"wide",context:"formatting"})||n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=6}set(i,r,n,a){return i=za(i,n,a),i.setHours(0,0,0,0),i}}class Dg extends te{constructor(){super(...arguments);z(this,"priority",90);z(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","e","t","T"])}parse(i,r,n,a){const o=l=>{const d=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+d};switch(r){case"c":case"cc":return $e(we(r.length,i),o);case"co":return $e(n.ordinalNumber(i,{unit:"day"}),o);case"ccc":return n.day(i,{width:"abbreviated",context:"standalone"})||n.day(i,{width:"short",context:"standalone"})||n.day(i,{width:"narrow",context:"standalone"});case"ccccc":return n.day(i,{width:"narrow",context:"standalone"});case"cccccc":return n.day(i,{width:"short",context:"standalone"})||n.day(i,{width:"narrow",context:"standalone"});case"cccc":default:return n.day(i,{width:"wide",context:"standalone"})||n.day(i,{width:"abbreviated",context:"standalone"})||n.day(i,{width:"short",context:"standalone"})||n.day(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=0&&r<=6}set(i,r,n,a){return i=za(i,n,a),i.setHours(0,0,0,0),i}}function Eg(e,t,i){const r=U(e,i==null?void 0:i.in),n=dg(r,i),a=t-n;return Sn(r,a,i)}class Og extends te{constructor(){super(...arguments);z(this,"priority",90);z(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","E","e","c","t","T"])}parse(i,r,n){const a=o=>o===0?7:o;switch(r){case"i":case"ii":return we(r.length,i);case"io":return n.ordinalNumber(i,{unit:"day"});case"iii":return $e(n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"}),a);case"iiiii":return $e(n.day(i,{width:"narrow",context:"formatting"}),a);case"iiiiii":return $e(n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"}),a);case"iiii":default:return $e(n.day(i,{width:"wide",context:"formatting"})||n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"}),a)}}validate(i,r){return r>=1&&r<=7}set(i,r,n){return i=Eg(i,n),i.setHours(0,0,0,0),i}}class Fg extends te{constructor(){super(...arguments);z(this,"priority",80);z(this,"incompatibleTokens",["b","B","H","k","t","T"])}parse(i,r,n){switch(r){case"a":case"aa":case"aaa":return n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaaa":return n.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaa":default:return n.dayPeriod(i,{width:"wide",context:"formatting"})||n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,n){return i.setHours(Pa(n),0,0,0),i}}class Ig extends te{constructor(){super(...arguments);z(this,"priority",80);z(this,"incompatibleTokens",["a","B","H","k","t","T"])}parse(i,r,n){switch(r){case"b":case"bb":case"bbb":return n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbbb":return n.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbb":default:return n.dayPeriod(i,{width:"wide",context:"formatting"})||n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,n){return i.setHours(Pa(n),0,0,0),i}}class Bg extends te{constructor(){super(...arguments);z(this,"priority",80);z(this,"incompatibleTokens",["a","b","t","T"])}parse(i,r,n){switch(r){case"B":case"BB":case"BBB":return n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBBB":return n.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBB":default:return n.dayPeriod(i,{width:"wide",context:"formatting"})||n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,n){return i.setHours(Pa(n),0,0,0),i}}class Ng extends te{constructor(){super(...arguments);z(this,"priority",70);z(this,"incompatibleTokens",["H","K","k","t","T"])}parse(i,r,n){switch(r){case"h":return be(_e.hour12h,i);case"ho":return n.ordinalNumber(i,{unit:"hour"});default:return we(r.length,i)}}validate(i,r){return r>=1&&r<=12}set(i,r,n){const a=i.getHours()>=12;return a&&n<12?i.setHours(n+12,0,0,0):!a&&n===12?i.setHours(0,0,0,0):i.setHours(n,0,0,0),i}}class jg extends te{constructor(){super(...arguments);z(this,"priority",70);z(this,"incompatibleTokens",["a","b","h","K","k","t","T"])}parse(i,r,n){switch(r){case"H":return be(_e.hour23h,i);case"Ho":return n.ordinalNumber(i,{unit:"hour"});default:return we(r.length,i)}}validate(i,r){return r>=0&&r<=23}set(i,r,n){return i.setHours(n,0,0,0),i}}class Rg extends te{constructor(){super(...arguments);z(this,"priority",70);z(this,"incompatibleTokens",["h","H","k","t","T"])}parse(i,r,n){switch(r){case"K":return be(_e.hour11h,i);case"Ko":return n.ordinalNumber(i,{unit:"hour"});default:return we(r.length,i)}}validate(i,r){return r>=0&&r<=11}set(i,r,n){return i.getHours()>=12&&n<12?i.setHours(n+12,0,0,0):i.setHours(n,0,0,0),i}}class Wg extends te{constructor(){super(...arguments);z(this,"priority",70);z(this,"incompatibleTokens",["a","b","h","H","K","t","T"])}parse(i,r,n){switch(r){case"k":return be(_e.hour24h,i);case"ko":return n.ordinalNumber(i,{unit:"hour"});default:return we(r.length,i)}}validate(i,r){return r>=1&&r<=24}set(i,r,n){const a=n<=24?n%24:n;return i.setHours(a,0,0,0),i}}class Zg extends te{constructor(){super(...arguments);z(this,"priority",60);z(this,"incompatibleTokens",["t","T"])}parse(i,r,n){switch(r){case"m":return be(_e.minute,i);case"mo":return n.ordinalNumber(i,{unit:"minute"});default:return we(r.length,i)}}validate(i,r){return r>=0&&r<=59}set(i,r,n){return i.setMinutes(n,0,0),i}}class Kg extends te{constructor(){super(...arguments);z(this,"priority",50);z(this,"incompatibleTokens",["t","T"])}parse(i,r,n){switch(r){case"s":return be(_e.second,i);case"so":return n.ordinalNumber(i,{unit:"second"});default:return we(r.length,i)}}validate(i,r){return r>=0&&r<=59}set(i,r,n){return i.setSeconds(n,0),i}}class qg extends te{constructor(){super(...arguments);z(this,"priority",30);z(this,"incompatibleTokens",["t","T"])}parse(i,r){const n=a=>Math.trunc(a*Math.pow(10,-r.length+3));return $e(we(r.length,i),n)}set(i,r,n){return i.setMilliseconds(n),i}}class Gg extends te{constructor(){super(...arguments);z(this,"priority",10);z(this,"incompatibleTokens",["t","T","x"])}parse(i,r){switch(r){case"X":return Ye(Ue.basicOptionalMinutes,i);case"XX":return Ye(Ue.basic,i);case"XXXX":return Ye(Ue.basicOptionalSeconds,i);case"XXXXX":return Ye(Ue.extendedOptionalSeconds,i);case"XXX":default:return Ye(Ue.extended,i)}}set(i,r,n){return r.timestampIsSet?i:xe(i,i.getTime()-an(i)-n)}}class Ug extends te{constructor(){super(...arguments);z(this,"priority",10);z(this,"incompatibleTokens",["t","T","X"])}parse(i,r){switch(r){case"x":return Ye(Ue.basicOptionalMinutes,i);case"xx":return Ye(Ue.basic,i);case"xxxx":return Ye(Ue.basicOptionalSeconds,i);case"xxxxx":return Ye(Ue.extendedOptionalSeconds,i);case"xxx":default:return Ye(Ue.extended,i)}}set(i,r,n){return r.timestampIsSet?i:xe(i,i.getTime()-an(i)-n)}}class Yg extends te{constructor(){super(...arguments);z(this,"priority",40);z(this,"incompatibleTokens","*")}parse(i){return el(i)}set(i,r,n){return[xe(i,n*1e3),{timestampIsSet:!0}]}}class Qg extends te{constructor(){super(...arguments);z(this,"priority",20);z(this,"incompatibleTokens","*")}parse(i){return el(i)}set(i,r,n){return[xe(i,n),{timestampIsSet:!0}]}}const Xg={G:new bg,y:new fg,Y:new vg,R:new yg,u:new xg,Q:new wg,q:new _g,M:new $g,L:new kg,w:new Mg,I:new Ag,d:new Vg,D:new Tg,E:new Pg,e:new zg,c:new Dg,i:new Og,a:new Fg,b:new Ig,B:new Bg,h:new Ng,H:new jg,K:new Rg,k:new Wg,m:new Zg,s:new Kg,S:new qg,X:new Gg,x:new Ug,t:new Yg,T:new Qg},Jg=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,em=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,tm=/^'([^]*?)'?$/,im=/''/g,rm=/\S/,nm=/[a-zA-Z]/;function am(e,t,i,r){var $,y,_,S,B,P,N,k;const n=()=>xe((r==null?void 0:r.in)||i,NaN),a=cg(),o=(r==null?void 0:r.locale)??a.locale??qs,l=(r==null?void 0:r.firstWeekContainsDate)??((y=($=r==null?void 0:r.locale)==null?void 0:$.options)==null?void 0:y.firstWeekContainsDate)??a.firstWeekContainsDate??((S=(_=a.locale)==null?void 0:_.options)==null?void 0:S.firstWeekContainsDate)??1,d=(r==null?void 0:r.weekStartsOn)??((P=(B=r==null?void 0:r.locale)==null?void 0:B.options)==null?void 0:P.weekStartsOn)??a.weekStartsOn??((k=(N=a.locale)==null?void 0:N.options)==null?void 0:k.weekStartsOn)??0;if(!t)return e?n():U(i,r==null?void 0:r.in);const p={firstWeekContainsDate:l,weekStartsOn:d,locale:o},u=[new mg(r==null?void 0:r.in,i)],h=t.match(em).map(A=>{const V=A[0];if(V in ya){const q=ya[V];return q(A,o.formatLong)}return A}).join("").match(Jg),m=[];for(let A of h){!(r!=null&&r.useAdditionalWeekYearTokens)&&Xs(A)&&xa(A,t,e),!(r!=null&&r.useAdditionalDayOfYearTokens)&&Qs(A)&&xa(A,t,e);const V=A[0],q=Xg[V];if(q){const{incompatibleTokens:K}=q;if(Array.isArray(K)){const j=m.find(Pe=>K.includes(Pe.token)||Pe.token===V);if(j)throw new RangeError(`The format string mustn't contain \`${j.fullToken}\` and \`${A}\` at the same time`)}else if(q.incompatibleTokens==="*"&&m.length>0)throw new RangeError(`The format string mustn't contain \`${A}\` and any other token at the same time`);m.push({token:V,fullToken:A});const Z=q.run(e,A,o.match,p);if(!Z)return n();u.push(Z.setter),e=Z.rest}else{if(V.match(nm))throw new RangeError("Format string contains an unescaped latin alphabet character `"+V+"`");if(A==="''"?A="'":V==="'"&&(A=om(A)),e.indexOf(A)===0)e=e.slice(A.length);else return n()}}if(e.length>0&&rm.test(e))return n();const v=u.map(A=>A.priority).sort((A,V)=>V-A).filter((A,V,q)=>q.indexOf(A)===V).map(A=>u.filter(V=>V.priority===A).sort((V,q)=>q.subPriority-V.subPriority)).map(A=>A[0]);let f=U(i,r==null?void 0:r.in);if(isNaN(+f))return n();const b={};for(const A of v){if(!A.validate(f,p))return n();const V=A.set(f,b,p);Array.isArray(V)?(f=V[0],Object.assign(b,V[1])):f=V}return f}function om(e){return e.match(tm)[1].replace(im,"'")}function sm(e,t){const i=U(e,t==null?void 0:t.in);return i.setMinutes(0,0,0),i}function lm(e,t){const i=U(e,t==null?void 0:t.in);return i.setSeconds(0,0),i}function cm(e,t){const i=U(e,t==null?void 0:t.in);return i.setMilliseconds(0),i}function dm(e,t){const i=()=>xe(t==null?void 0:t.in,NaN),r=(t==null?void 0:t.additionalDigits)??2,n=gm(e);let a;if(n.date){const p=mm(n.date,r);a=bm(p.restDateString,p.year)}if(!a||isNaN(+a))return i();const o=+a;let l=0,d;if(n.time&&(l=fm(n.time),isNaN(l)))return i();if(n.timezone){if(d=vm(n.timezone),isNaN(d))return i()}else{const p=new Date(o+l),u=U(0,t==null?void 0:t.in);return u.setFullYear(p.getUTCFullYear(),p.getUTCMonth(),p.getUTCDate()),u.setHours(p.getUTCHours(),p.getUTCMinutes(),p.getUTCSeconds(),p.getUTCMilliseconds()),u}return U(o+l+d,t==null?void 0:t.in)}const Zr={dateTimeDelimiter:/[T ]/,timeZoneDelimiter:/[Z ]/i,timezone:/([Z+-].*)$/},pm=/^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/,um=/^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/,hm=/^([+-])(\d{2})(?::?(\d{2}))?$/;function gm(e){const t={},i=e.split(Zr.dateTimeDelimiter);let r;if(i.length>2)return t;if(/:/.test(i[0])?r=i[0]:(t.date=i[0],r=i[1],Zr.timeZoneDelimiter.test(t.date)&&(t.date=e.split(Zr.timeZoneDelimiter)[0],r=e.substr(t.date.length,e.length))),r){const n=Zr.timezone.exec(r);n?(t.time=r.replace(n[1],""),t.timezone=n[1]):t.time=r}return t}function mm(e,t){const i=new RegExp("^(?:(\\d{4}|[+-]\\d{"+(4+t)+"})|(\\d{2}|[+-]\\d{"+(2+t)+"})$)"),r=e.match(i);if(!r)return{year:NaN,restDateString:""};const n=r[1]?parseInt(r[1]):null,a=r[2]?parseInt(r[2]):null;return{year:a===null?n:a*100,restDateString:e.slice((r[1]||r[2]).length)}}function bm(e,t){if(t===null)return new Date(NaN);const i=e.match(pm);if(!i)return new Date(NaN);const r=!!i[4],n=qi(i[1]),a=qi(i[2])-1,o=qi(i[3]),l=qi(i[4]),d=qi(i[5])-1;if(r)return $m(t,l,d)?ym(t,l,d):new Date(NaN);{const p=new Date(0);return!wm(t,a,o)||!_m(t,n)?new Date(NaN):(p.setUTCFullYear(t,a,Math.max(n,o)),p)}}function qi(e){return e?parseInt(e):1}function fm(e){const t=e.match(um);if(!t)return NaN;const i=ta(t[1]),r=ta(t[2]),n=ta(t[3]);return km(i,r,n)?i*yr+r*vr+n*1e3:NaN}function ta(e){return e&&parseFloat(e.replace(",","."))||0}function vm(e){if(e==="Z")return 0;const t=e.match(hm);if(!t)return 0;const i=t[1]==="+"?-1:1,r=parseInt(t[2]),n=t[3]&&parseInt(t[3])||0;return Cm(r,n)?i*(r*yr+n*vr):NaN}function ym(e,t,i){const r=new Date(0);r.setUTCFullYear(e,0,4);const n=r.getUTCDay()||7,a=(t-1)*7+i+1-n;return r.setUTCDate(r.getUTCDate()+a),r}const xm=[31,null,31,30,31,30,31,31,30,31,30,31];function rl(e){return e%400===0||e%4===0&&e%100!==0}function wm(e,t,i){return t>=0&&t<=11&&i>=1&&i<=(xm[t]||(rl(e)?29:28))}function _m(e,t){return t>=1&&t<=(rl(e)?366:365)}function $m(e,t,i){return t>=1&&t<=53&&i>=0&&i<=6}function km(e,t,i){return e===24?t===0&&i===0:i>=0&&i<60&&t>=0&&t<60&&e>=0&&e<25}function Cm(e,t){return t>=0&&t<=59}/*!
 * chartjs-adapter-date-fns v3.0.0
 * https://www.chartjs.org
 * (c) 2022 chartjs-adapter-date-fns Contributors
 * Released under the MIT license
 */const Mm={datetime:"MMM d, yyyy, h:mm:ss aaaa",millisecond:"h:mm:ss.SSS aaaa",second:"h:mm:ss aaaa",minute:"h:mm aaaa",hour:"ha",day:"MMM d",week:"PP",month:"MMM yyyy",quarter:"qqq - yyyy",year:"yyyy"};Al._date.override({_id:"date-fns",formats:function(){return Mm},parse:function(e,t){if(e===null||typeof e>"u")return null;const i=typeof e;return i==="number"||e instanceof Date?e=U(e):i==="string"&&(typeof t=="string"?e=am(e,t,new Date,this.options):e=dm(e,this.options)),Ns(e)?e.getTime():null},format:function(e,t){return sg(e,t,this.options)},add:function(e,t,i){switch(i){case"millisecond":return Ha(e,t);case"second":return Yh(e,t);case"minute":return Gh(e,t);case"hour":return Zh(e,t);case"day":return Sn(e,t);case"week":return Qh(e,t);case"month":return La(e,t);case"quarter":return Uh(e,t);case"year":return Xh(e,t);default:return e}},diff:function(e,t,i){switch(i){case"millisecond":return Va(e,t);case"second":return o0(e,t);case"minute":return r0(e,t);case"hour":return i0(e,t);case"day":return js(e,t);case"week":return s0(e,t);case"month":return Zs(e,t);case"quarter":return a0(e,t);case"year":return l0(e,t);default:return 0}},startOf:function(e,t,i){switch(t){case"second":return cm(e);case"minute":return lm(e);case"hour":return sm(e);case"day":return va(e);case"week":return Xe(e);case"isoWeek":return Xe(e,{weekStartsOn:+i});case"month":return d0(e);case"quarter":return c0(e);case"year":return Ks(e);default:return e}},endOf:function(e,t){switch(t){case"second":return b0(e);case"minute":return g0(e);case"hour":return u0(e);case"day":return Rs(e);case"week":return h0(e);case"month":return Ws(e);case"quarter":return m0(e);case"year":return p0(e);default:return e}}});function Zo(e,t){if(!(t!=null&&t.start)||!(t!=null&&t.end))return null;const i=e.getPixelForValue(t.start.getTime()),r=e.getPixelForValue(t.end.getTime());if(!Number.isFinite(i)||!Number.isFinite(r))return null;const n=Math.min(i,r),a=Math.max(Math.abs(r-i),2);return!Number.isFinite(a)||a<=0?null:{left:n,width:a}}const Sm={id:"pricingModeIcons",beforeDatasetsDraw(e,t,i){var d;const r=i,n=r==null?void 0:r.segments;if(!(n!=null&&n.length))return;const a=e.chartArea,o=(d=e.scales)==null?void 0:d.x;if(!a||!o)return;const l=e.ctx;l.save(),l.globalAlpha=(r==null?void 0:r.backgroundOpacity)??.12;for(const p of n){const u=Zo(o,p);u&&(l.fillStyle=p.color||"rgba(255, 255, 255, 0.1)",l.fillRect(u.left,a.top,u.width,a.bottom-a.top))}l.restore()},afterDatasetsDraw(e,t,i){var A;const r=i,n=r==null?void 0:r.segments;if(!(n!=null&&n.length))return;const a=(A=e.scales)==null?void 0:A.x,o=e.chartArea;if(!a||!o)return;const l=(r==null?void 0:r.iconSize)??16,d=(r==null?void 0:r.labelSize)??9,p=`${l}px "Inter", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,u=`${d}px "Inter", sans-serif`,h=(r==null?void 0:r.iconColor)||"rgba(255, 255, 255, 0.95)",m=(r==null?void 0:r.labelColor)||"rgba(255, 255, 255, 0.7)",v=(r==null?void 0:r.axisBandPadding)??10,f=(r==null?void 0:r.axisBandHeight)??l+d+10,b=(r==null?void 0:r.axisBandColor)||"rgba(6, 10, 18, 0.12)",$=(r==null?void 0:r.iconAlignment)||"start",y=(r==null?void 0:r.iconStartOffset)??12,_=(r==null?void 0:r.iconBaselineOffset)??4,S=(a.bottom||o.bottom)+v,B=Math.min(S,e.height-f-2),P=o.right-o.left,N=B+_,k=e.ctx;k.save(),k.globalCompositeOperation="destination-over",k.fillStyle=b,k.fillRect(o.left,B,P,f),k.restore(),k.save(),k.globalCompositeOperation="destination-over",k.textAlign="center",k.textBaseline="top";for(const V of n){const q=Zo(a,V);if(!q)continue;let K;if($==="start"){K=q.left+y;const Z=q.left+q.width-l/2;K>Z&&(K=q.left+q.width/2)}else K=q.left+q.width/2;k.font=p,k.fillStyle=h,k.fillText(V.icon||"❓",K,N),V.shortLabel&&(k.font=u,k.fillStyle=m,k.fillText(V.shortLabel,K,N+l-2))}k.restore()}};function Ko(e,t){if(!e)return;e.layout||(e.layout={}),e.layout.padding||(e.layout.padding={});const i=e.layout.padding,r=12;i.top=i.top??12,i.bottom=Math.max(i.bottom||0,r)}var Am=Object.defineProperty,Lm=Object.getOwnPropertyDescriptor,Ai=(e,t,i,r)=>{for(var n=r>1?void 0:r?Lm(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Am(t,i,n),n};const pt=Q;_n.register(ls,cs,Ll,Hl,ds,ps,Vl,us,Tl,Pl,hs,gs,zl,Dl,ms,Sm);function Hm(e){const t=e.timeline.map(i=>i.spot_price_czk??0);return{label:"📊 Spot",data:t,borderColor:"#2196F3",backgroundColor:"rgba(33, 150, 243, 0.15)",borderWidth:3,fill:!1,tension:.4,type:"line",yAxisID:"y-price",pointRadius:t.map(()=>0),pointHoverRadius:7,pointBackgroundColor:t.map(()=>"#42a5f5"),pointBorderColor:t.map(()=>"#42a5f5"),pointBorderWidth:2,order:1,datalabels:{display:!1}}}function Vm(e){return{label:"💰 Výkup",data:e.timeline.map(t=>t.export_price_czk??0),borderColor:"#4CAF50",backgroundColor:"rgba(76, 187, 106, 0.15)",borderWidth:2,fill:!1,type:"line",tension:.4,yAxisID:"y-price",pointRadius:0,pointHoverRadius:5,order:1,borderDash:[5,5]}}function Tm(e){if(!e.solar)return[];const{string1:t,string2:i,hasString1:r,hasString2:n}=e.solar,a=(r?1:0)+(n?1:0),o={string1:{border:"rgba(255, 193, 7, 0.8)",bg:"rgba(255, 193, 7, 0.2)"},string2:{border:"rgba(255, 152, 0, 0.8)",bg:"rgba(255, 152, 0, 0.2)"}};if(a===1){const l=r?t:i,d=r?o.string1:o.string2;return[{label:"☀️ FVE předpověď",data:l,borderColor:d.border,backgroundColor:d.bg,borderWidth:2,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",pointRadius:0,pointHoverRadius:5,order:2}]}return a===2?[{label:"☀️ String 2",data:i,borderColor:o.string2.border,backgroundColor:o.string2.bg,borderWidth:1.5,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2},{label:"☀️ String 1",data:t,borderColor:o.string1.border,backgroundColor:o.string1.bg,borderWidth:1.5,fill:"-1",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2}]:[]}function Pm(e){if(!e.battery)return[];const{baseline:t,solarCharge:i,gridCharge:r,gridNet:n,consumption:a}=e.battery,o=[],l={baseline:{border:"#78909C",bg:"rgba(120, 144, 156, 0.25)"},solar:{border:"transparent",bg:"rgba(255, 167, 38, 0.6)"},grid:{border:"transparent",bg:"rgba(33, 150, 243, 0.6)"}};return a.some(d=>d!=null&&d>0)&&o.push({label:"🏠 Spotřeba",data:a,borderColor:"rgba(255, 112, 67, 0.7)",backgroundColor:"rgba(255, 112, 67, 0.12)",borderWidth:1.5,type:"line",fill:!1,tension:.25,pointRadius:0,pointHoverRadius:5,yAxisID:"y-power",stack:"consumption",borderDash:[6,4],order:2}),r.some(d=>d!=null&&d>0)&&o.push({label:"⚡ Síť → baterie",data:r,backgroundColor:l.grid.bg,borderColor:l.grid.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),i.some(d=>d!=null&&d>0)&&o.push({label:"☀️ FVE → baterie",data:i,backgroundColor:l.solar.bg,borderColor:l.solar.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),o.push({label:"🔋 Kapacita",data:t,backgroundColor:l.baseline.bg,borderColor:l.baseline.border,borderWidth:3,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),n.some(d=>d!==null)&&o.push({label:"📡 Netto síť",data:n,borderColor:"#00BCD4",backgroundColor:"transparent",borderWidth:2,type:"line",fill:!1,tension:.2,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",order:2}),o}function qo(e){const t=[];return e.prices.length>0&&t.push(Hm(e)),e.exportPrices.length>0&&t.push(Vm(e)),t.push(...Tm(e)),t.push(...Pm(e)),t}function Kr(e,t,i=""){if(e==null)return"";const r=i?` ${i}`:"";return`${e.toFixed(t)}${r}`}function si(e){var n;const t=(n=e.scales)==null?void 0:n.x;if(!t)return"overview";const r=(t.max-t.min)/(1e3*60*60);return r<=6?"detail":r<=24?"day":"overview"}function Tt(e,t){var h,m,v,f,b,$,y,_,S,B,P;if(!((h=e==null?void 0:e.scales)!=null&&h.x))return;const i=e.scales.x,n=(i.max-i.min)/(1e3*60*60),a=si(e),o=(v=(m=e.options.plugins)==null?void 0:m.legend)==null?void 0:v.labels;o&&(o.padding=10,o.font&&(o.font.size=11),a==="detail"&&(o.padding=12,o.font&&(o.font.size=12)));const l=window.innerWidth<520,d=["y-price","y-solar","y-power"];for(const N of d){const k=(f=e.options.scales)==null?void 0:f[N];if(k){if(N==="y-solar"&&l){k.display=!1;continue}a==="overview"?(k.title&&(k.title.display=!1),(b=k.ticks)!=null&&b.font&&(k.ticks.font.size=10),N==="y-solar"&&(k.display=!1)):a==="detail"?(k.title&&(k.title.display=!0,k.title.font&&(k.title.font.size=12)),($=k.ticks)!=null&&$.font&&(k.ticks.font.size=11),k.display=!0):(k.title&&(k.title.display=!0,k.title.font&&(k.title.font.size=11)),(y=k.ticks)!=null&&y.font&&(k.ticks.font.size=10),k.display=!0)}}const p=(_=e.options.scales)==null?void 0:_.x;p&&(a==="overview"?p.ticks&&(p.ticks.maxTicksLimit=12,p.ticks.font&&(p.ticks.font.size=10)):a==="detail"?(p.ticks&&(p.ticks.maxTicksLimit=24,p.ticks.font&&(p.ticks.font.size=11)),p.time&&(p.time.displayFormats.hour="HH:mm")):(p.ticks&&(p.ticks.maxTicksLimit=16,p.ticks.font&&(p.ticks.font.size=10)),p.time&&(p.time.displayFormats.hour=l?"HH:mm":"dd.MM HH:mm")));const u=t==="always"||t==="auto"&&n<=6;for(const N of e.data.datasets){const k=N;if(k.datalabels||(k.datalabels={}),t==="never"){k.datalabels.display=!1;continue}if(u){let A=1;n>3&&n<=6?A=2:n>6&&(A=4),k.datalabels.display=Z=>{const j=Z.dataset.data[Z.dataIndex];return j==null||j===0?!1:Z.dataIndex%A===0};const V=k.yAxisID==="y-price",q=((S=k.label)==null?void 0:S.includes("Solární"))||((B=k.label)==null?void 0:B.includes("String")),K=(P=k.label)==null?void 0:P.includes("kapacita");k.datalabels.align="top",k.datalabels.offset=6,k.datalabels.color="#fff",k.datalabels.font={size:9,weight:"bold"},V?(k.datalabels.formatter=Z=>Kr(Z,2,"Kč"),k.datalabels.backgroundColor=k.borderColor||"rgba(33, 150, 243, 0.8)"):q?(k.datalabels.formatter=Z=>Kr(Z,1,"kW"),k.datalabels.backgroundColor=k.borderColor||"rgba(255, 193, 7, 0.8)"):K?(k.datalabels.formatter=Z=>Kr(Z,1,"kWh"),k.datalabels.backgroundColor=k.borderColor||"rgba(120, 144, 156, 0.8)"):(k.datalabels.formatter=Z=>Kr(Z,1),k.datalabels.backgroundColor=k.borderColor||"rgba(33, 150, 243, 0.8)"),k.datalabels.borderRadius=4,k.datalabels.padding={top:3,bottom:3,left:5,right:5}}else k.datalabels.display=!1}e.update("none"),L.debug(`[PricingChart] Detail: ${n.toFixed(1)}h, Labels: ${u?"ON":"OFF"}, Mode: ${t}`)}let gt=class extends D{constructor(){super(...arguments),this.data=null,this.datalabelMode="auto",this.zoomState={start:null,end:null},this.currentDetailLevel="overview",this.chart=null,this.resizeObserver=null}firstUpdated(){this.setupResizeObserver(),this.data&&this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())}updated(e){e.has("data")&&this.data&&(this.chart?this.updateChartData():this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())),e.has("datalabelMode")&&this.chart&&Tt(this.chart,this.datalabelMode)}disconnectedCallback(){var e;super.disconnectedCallback(),this.destroyChart(),(e=this.resizeObserver)==null||e.disconnect(),this.resizeObserver=null}zoomToTimeRange(e,t){if(!this.chart){L.warn("[PricingChart] Chart not available for zoom");return}const i=new Date(e),r=new Date(t),n=15*60*1e3,a=i.getTime()-n,o=r.getTime()+n;if(this.zoomState.start!==null&&Math.abs(this.zoomState.start-a)<6e4&&this.zoomState.end!==null&&Math.abs(this.zoomState.end-o)<6e4){L.debug("[PricingChart] Already zoomed to same range → reset"),this.resetZoom();return}try{const l=this.chart.options;l.scales.x.min=a,l.scales.x.max=o,this.chart.update("none"),this.zoomState={start:a,end:o},this.currentDetailLevel=si(this.chart),Tt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-change",{detail:{start:a,end:o,level:this.currentDetailLevel},bubbles:!0,composed:!0})),L.debug("[PricingChart] Zoomed to range",{start:new Date(a).toISOString(),end:new Date(o).toISOString()})}catch(l){L.error("[PricingChart] Zoom error",l)}}resetZoom(){if(!this.chart)return;const e=this.chart.options;delete e.scales.x.min,delete e.scales.x.max,this.chart.update("none"),this.zoomState={start:null,end:null},this.currentDetailLevel=si(this.chart),Tt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-reset",{bubbles:!0,composed:!0}))}getChart(){return this.chart}createChart(){if(!this.canvas||!this.data||this.data.timeline.length===0)return;this.chart&&this.destroyChart();const e=this.data,t=qo(e),i=window.innerWidth<520,r={responsive:!0,maintainAspectRatio:!1,animation:{duration:0},interaction:{mode:"index",intersect:!1},plugins:{legend:{labels:{color:"#ffffff",font:{size:i?10:11,weight:"500"},padding:i?6:10,usePointStyle:!0,pointStyle:"circle",boxWidth:i?8:12,boxHeight:i?8:12},position:"top"},tooltip:{backgroundColor:"rgba(0,0,0,0.9)",titleColor:"#ffffff",bodyColor:"#ffffff",titleFont:{size:13,weight:"bold"},bodyFont:{size:11},padding:10,cornerRadius:6,displayColors:!0,callbacks:{title:a=>a.length>0?new Date(a[0].parsed.x).toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"",label:a=>{let o=a.dataset.label||"";return o&&(o+=": "),a.parsed.y!==null&&(a.dataset.yAxisID==="y-price"?o+=a.parsed.y.toFixed(2)+" Kč/kWh":a.dataset.yAxisID==="y-solar"?o+=a.parsed.y.toFixed(2)+" kWh":a.dataset.yAxisID==="y-power"?o+=a.parsed.y.toFixed(2)+" kW":o+=a.parsed.y),o}}},datalabels:{display:!1},zoom:{zoom:{wheel:{enabled:!0,modifierKey:null},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)",borderColor:"rgba(33, 150, 243, 0.8)",borderWidth:2},pinch:{enabled:!0},mode:"x",onZoomComplete:({chart:a})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=si(a),Tt(a,this.datalabelMode)}},pan:{enabled:!0,mode:"x",modifierKey:"shift",onPanComplete:({chart:a})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=si(a),Tt(a,this.datalabelMode)}},limits:{x:{minRange:36e5}}},pricingModeIcons:null},scales:{x:{type:"timeseries",time:{unit:"hour",displayFormats:{hour:i?"HH:mm":"dd.MM HH:mm"},tooltipFormat:"dd.MM.yyyy HH:mm"},ticks:{color:this.getTextColor(),maxRotation:i?0:45,minRotation:i?0:45,font:{size:i?10:11},maxTicksLimit:i?6:20},grid:{color:this.getGridColor(),lineWidth:1}},"y-price":{type:"linear",position:"left",ticks:{color:"#2196F3",font:{size:11,weight:"500"},callback:a=>a.toFixed(2)+" Kč"},grid:{color:"rgba(33, 150, 243, 0.15)",lineWidth:1},title:{display:!i,text:"💰 Cena (Kč/kWh)",color:"#2196F3",font:{size:13,weight:"bold"}}},"y-solar":{type:"linear",position:"left",stacked:!0,display:!i,ticks:{color:"#78909C",font:{size:11,weight:"500"},callback:a=>a.toFixed(1)+" kWh",display:!0},grid:{display:!0,color:"rgba(120, 144, 156, 0.15)",lineWidth:1,drawOnChartArea:!0},title:{display:!0,text:"🔋 Kapacita baterie (kWh)",color:"#78909C",font:{size:11,weight:"bold"}},beginAtZero:!1},"y-power":{type:"linear",position:"right",stacked:!0,ticks:{color:"#FFA726",font:{size:11,weight:"500"},callback:a=>a.toFixed(2)+" kW"},grid:{display:!1},title:{display:!i,text:"☀️ Výkon (kW)",color:"#FFA726",font:{size:13,weight:"bold"}}}}};Ko(r);const n={type:"bar",data:{labels:e.labels,datasets:t},plugins:[ms],options:r};try{this.chart=new _n(this.canvas,n),Tt(this.chart,this.datalabelMode),e.initialZoomStart&&e.initialZoomEnd&&requestAnimationFrame(()=>{if(!this.chart)return;const a=this.chart.options;a.scales.x.min=e.initialZoomStart,a.scales.x.max=e.initialZoomEnd,this.chart.update("none"),this.currentDetailLevel=si(this.chart),Tt(this.chart,this.datalabelMode)}),L.info("[PricingChart] Chart created",{datasets:t.length,labels:e.labels.length,segments:e.modeSegments.length})}catch(a){L.error("[PricingChart] Failed to create chart",a)}}updateChartData(){var o;if(!this.chart||!this.data)return;const e=this.data,t=qo(e),i=((o=this.chart.data.labels)==null?void 0:o.length)!==e.labels.length,r=this.chart.data.datasets.length!==t.length;i&&(this.chart.data.labels=e.labels);let n="none";r?(this.chart.data.datasets=t,n=void 0):t.forEach((l,d)=>{const p=this.chart.data.datasets[d];p&&(p.data=l.data,p.label=l.label,p.backgroundColor=l.backgroundColor,p.borderColor=l.borderColor)});const a=this.chart.options;a.plugins||(a.plugins={}),a.plugins.pricingModeIcons=null,Ko(a),this.chart.update(n),L.debug("[PricingChart] Chart updated incrementally")}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(()=>{var e;(e=this.chart)==null||e.resize()}),this.resizeObserver.observe(this)}getTextColor(){try{return getComputedStyle(this).getPropertyValue("--oig-text-primary").trim()||"#e0e0e0"}catch{return"#e0e0e0"}}getGridColor(){try{return getComputedStyle(this).getPropertyValue("--oig-border").trim()||"rgba(255,255,255,0.1)"}catch{return"rgba(255,255,255,0.1)"}}setDatalabelMode(e){this.datalabelMode=e,this.dispatchEvent(new CustomEvent("datalabel-mode-change",{detail:{mode:e},bubbles:!0,composed:!0}))}get isZoomed(){return this.zoomState.start!==null||this.zoomState.end!==null}renderControls(){const e=t=>{const i=this.datalabelMode===t?"active":"";return t==="always"&&this.datalabelMode==="always"?`control-btn mode-always ${i}`:t==="never"&&this.datalabelMode==="never"?`control-btn mode-never ${i}`:`control-btn ${i}`};return c`
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
        ${this.isZoomed?c`<button class="control-btn reset-btn" @click=${()=>this.resetZoom()}>
              Reset zoom
            </button>`:null}
      </div>
    `}render(){const e=this.data&&this.data.timeline.length>0;return c`
      <div class="chart-header">
        <span class="chart-title">Ceny elektřiny & předpověď</span>
        ${this.renderControls()}
      </div>

      <div class="chart-container">
        ${e?c`<canvas id="pricing-canvas"></canvas>`:c`<div class="no-data">Žádná data o cenách</div>`}
      </div>

      ${e?c`<div class="chart-hint">
            Kolečko myši = zoom | Shift + tah = posun | Tah = výběr oblasti
          </div>`:null}
    `}};gt.styles=T`
    :host {
      display: block;
      background: ${pt(s.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${pt(s.cardShadow)};
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
      color: ${pt(s.textPrimary)};
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
      color: ${pt(s.textSecondary)};
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .control-btn:hover {
      background: ${pt(s.accent)};
      color: #fff;
    }

    .control-btn.active {
      background: ${pt(s.accent)};
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
      color: ${pt(s.textSecondary)};
      font-size: 14px;
    }

    .chart-hint {
      font-size: 10px;
      color: ${pt(s.textSecondary)};
      opacity: 0.7;
      margin-top: 6px;
      text-align: center;
    }
  `;Ai([g({type:Object})],gt.prototype,"data",2);Ai([g({type:String})],gt.prototype,"datalabelMode",2);Ai([H()],gt.prototype,"zoomState",2);Ai([H()],gt.prototype,"currentDetailLevel",2);Ai([$n("#pricing-canvas")],gt.prototype,"canvas",2);gt=Ai([E("oig-pricing-chart")],gt);const Li="—";function vi(e){return e==null||!Number.isFinite(e)?Li:`${e.toFixed(1)} °C`}function nl(e){return e==null||!Number.isFinite(e)?Li:`${e.toFixed(2)} kWh`}function zm(e){return e==null||!Number.isFinite(e)?Li:`${e.toFixed(2)} Kč`}function Dm(e){return e==null||!Number.isFinite(e)?Li:`${Math.round(e*100)} %`}function Em(e,t){const i=r=>{const n=new Date(r);return Number.isNaN(n.getTime())?r:`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`};return`${i(e)} – ${i(t)}`}function Om(e){return e==null||!Number.isFinite(e)?Li:e<60?`${Math.round(e)} s`:e<3600?`${Math.round(e/60)} min`:`${Math.round(e/3600)} h`}function Fm(e){if(e==null||!Number.isFinite(e)||e<0)return Li;const t=Math.floor(e/60),i=Math.round(e%60);return t===0?`${i} min`:i===0?`${t} h`:`${t} h ${i} min`}function Im(e){const t=e.topTempC;if(t==null||!Number.isFinite(t))return null;if(e.targetTempC<=t)return 0;const i=e.targetTempC-t;return e.temperatureTrendCPerMin!=null&&Number.isFinite(e.temperatureTrendCPerMin)&&e.temperatureTrendCPerMin>0?i/e.temperatureTrendCPerMin:e.heaterPowerKw!==null&&Number.isFinite(e.heaterPowerKw)&&e.volumeL!=null&&Number.isFinite(e.volumeL)?e.heaterPowerKw===0?null:e.volumeL*.001163*i/e.heaterPowerKw*60:null}var Bm=Object.defineProperty,Nm=Object.getOwnPropertyDescriptor,W=(e,t,i,r)=>{for(var n=r>1?void 0:r?Nm(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Bm(t,i,n),n};const I=Q,_t=T`
  background: ${I(s.cardBg)};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${I(s.cardShadow)};
`,st=T`
  font-size: 15px;
  font-weight: 600;
  color: ${I(s.textPrimary)};
  margin: 0 0 12px 0;
`;function jm(e){return Math.max(0,Math.min(100,e))}function Go(e){const r=Math.max(0,Math.min(1,(e-10)/60)),n={r:33,g:150,b:243},a={r:255,g:87,b:34},o=(l,d)=>Math.round(l+(d-l)*r);return`rgb(${o(n.r,a.r)}, ${o(n.g,a.g)}, ${o(n.b,a.b)})`}let nr=class extends D{constructor(){super(...arguments),this.collapsed=!0,this.busy=!1}toggle(){this.collapsed=!this.collapsed}async doAction(e,t){this.busy=!0;try{const i=await e();this.dispatchEvent(new CustomEvent("action-done",{detail:{success:i,label:t},bubbles:!0,composed:!0}))}finally{this.busy=!1}}render(){return c`
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
              @click=${()=>this.doAction(Qc,"plan")}>
              Preplanovat (debug)
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(Xc,"apply")}>
              Aplikovat rucne
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(Jc,"cancel")}>
              Zrusit plan
            </button>
          </div>
        </div>
      </div>
    `}};nr.styles=T`
    :host { display: block; }

    .panel {
      ${_t};
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
      color: ${I(s.textPrimary)};
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
      color: ${I(s.textSecondary)};
    }

    .info-bubble .tooltip {
      display: none;
      position: absolute;
      left: 0;
      top: 24px;
      width: 280px;
      padding: 10px;
      background: ${I(s.cardBg)};
      border: 1px solid ${I(s.divider)};
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      font-size: 11px;
      line-height: 1.5;
      color: ${I(s.textSecondary)};
      z-index: 100;
      white-space: normal;
    }

    .info-bubble:hover .tooltip { display: block; }

    .toggle-icon {
      font-size: 18px;
      font-weight: bold;
      color: ${I(s.textSecondary)};
      transition: transform 0.2s;
    }

    .panel-content {
      display: none;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid ${I(s.divider)};
    }

    .panel-content.open { display: block; }

    .section-label {
      font-size: 12px;
      font-weight: 600;
      color: ${I(s.textSecondary)};
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
      border: 1px solid ${I(s.divider)};
      border-radius: 8px;
      background: ${I(s.bgSecondary)};
      color: ${I(s.textPrimary)};
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      white-space: nowrap;
    }

    .action-btn:hover { background: ${I(s.divider)}; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `;W([H()],nr.prototype,"collapsed",2);W([H()],nr.prototype,"busy",2);nr=W([E("oig-boiler-debug-panel")],nr);let sn=class extends D{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return c`<div>Nacitani stavu...</div>`;const t=(i,r,n=1)=>i!=null?`${i.toFixed(n)} ${r}`:`-- ${r}`;return c`
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
        ${e.tempBottom!==null?c`
          <div class="card">
            <div class="card-label">Teplota spodni</div>
            <div class="card-value">${t(e.tempBottom,"°C")}</div>
          </div>
        `:w}
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
    `}};sn.styles=T`
    :host { display: block; }

    h3 { ${st}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .card {
      ${_t};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${I(s.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 18px;
      font-weight: 600;
      color: ${I(s.textPrimary)};
    }

    .card-value.small {
      font-size: 13px;
      font-weight: 500;
    }
  `;W([g({type:Object})],sn.prototype,"data",2);sn=W([E("oig-boiler-status-grid")],sn);let ln=class extends D{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return w;const t=i=>`${i.toFixed(2)} kWh`;return c`
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
    `}};ln.styles=T`
    :host { display: block; }

    h3 { ${st}; }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .card {
      ${_t};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${I(s.textSecondary)};
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
      background: ${I(s.bgSecondary)};
    }

    .ratio-fve { background: #4CAF50; }
    .ratio-grid { background: #FF9800; }
    .ratio-alt { background: #2196F3; }

    .ratio-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 11px;
      color: ${I(s.textSecondary)};
    }
  `;W([g({type:Object})],ln.prototype,"data",2);ln=W([E("oig-boiler-energy-breakdown")],ln);let cn=class extends D{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return w;const t=e.peakHours.length?e.peakHours.map(n=>`${n}h`).join(", "):"--",i=e.waterLiters40c!==null?`${e.waterLiters40c.toFixed(0)} L`:"-- L",r=e.circulationNow.startsWith("ANO");return c`
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
    `}};cn.styles=T`
    :host { display: block; }

    h3 { ${st}; }

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
      border-bottom: 1px solid ${I(s.divider)};
      font-size: 13px;
    }

    .item:last-child { border-bottom: none; }

    .label { color: ${I(s.textSecondary)}; }

    .value {
      font-weight: 600;
      color: ${I(s.textPrimary)};
    }

    .value.active { color: #4CAF50; }
    .value.idle { color: ${I(s.textSecondary)}; }
  `;W([g({type:Object})],cn.prototype,"data",2);cn=W([E("oig-boiler-predicted-usage")],cn);let ar=class extends D{constructor(){super(...arguments),this.plan=null,this.forecastWindows={fve:"--",grid:"--"}}render(){var r;const e=this.plan,t=this.forecastWindows,i=n=>n??"--";return c`
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
    `}};ar.styles=T`
    :host { display: block; }

    h3 { ${st}; }

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
      border-bottom: 1px solid ${I(s.divider)};
      font-size: 13px;
    }

    .row:last-child { border-bottom: none; }

    .row-label { color: ${I(s.textSecondary)}; }
    .row-value {
      font-weight: 500;
      color: ${I(s.textPrimary)};
      text-align: right;
      max-width: 60%;
      word-break: break-word;
    }
  `;W([g({type:Object})],ar.prototype,"plan",2);W([g({type:Object})],ar.prototype,"forecastWindows",2);ar=W([E("oig-boiler-plan-info")],ar);let or=class extends D{constructor(){super(...arguments),this.boilerState=null,this.targetTemp=60}render(){const e=this.boilerState;if(!e)return c`<div>Nacitani...</div>`;const t=10,i=70,r=v=>jm((v-t)/(i-t)*100),n=e.heatingPercent??0,a=e.tempTop!==null?r(e.tempTop):null,o=e.tempBottom!==null?r(e.tempBottom):null,l=r(this.targetTemp),d=Go(e.tempTop??this.targetTemp),p=Go(e.tempBottom??10),u=`linear-gradient(180deg, ${d} 0%, ${p} 100%)`,h=e.heatingPercent!==null?`${e.heatingPercent.toFixed(0)}% nahrato`:"-- % nahrato";return c`
      <h3>Vizualizace bojleru</h3>

      <div class="tank-wrapper">
        <div class="temp-scale">
          ${[70,60,50,40,30,20,10].map(v=>c`<span>${v}°C</span>`)}
        </div>

        <div class="tank">
          <div class="water" style="height:${n}%; background:${u}"></div>

          <div class="target-line" style="bottom:${l}%">
            <span class="target-label">Cil</span>
          </div>

          ${a!==null?c`
            <div class="sensor top" style="bottom:${a}%">
              <span class="sensor-label">${e.tempTop.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:w}

          ${o!==null?c`
            <div class="sensor bottom" style="bottom:${o}%">
              <span class="sensor-label">${e.tempBottom.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:w}
        </div>
      </div>

      <div class="grade-label">${h}</div>
    `}};or.styles=T`
    :host { display: block; }

    h3 { ${st}; }

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
      color: ${I(s.textSecondary)};
      text-align: right;
      padding: 2px 0;
    }

    /* Tank body */
    .tank {
      flex: 1;
      position: relative;
      border: 2px solid ${I(s.divider)};
      border-radius: 12px;
      overflow: hidden;
      background: ${I(s.bgSecondary)};
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
      border-top: 2px dashed ${I(s.accent)};
      z-index: 3;
    }

    .target-label {
      position: absolute;
      right: 4px;
      top: -14px;
      font-size: 9px;
      color: ${I(s.accent)};
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
      color: ${I(s.textPrimary)};
    }
  `;W([g({type:Object})],or.prototype,"boilerState",2);W([g({type:Number})],or.prototype,"targetTemp",2);or=W([E("oig-boiler-tank")],or);let sr=class extends D{constructor(){super(...arguments),this.current="",this.available=[]}onChange(e){const t=e.target.value;this.dispatchEvent(new CustomEvent("category-change",{detail:{category:t},bubbles:!0,composed:!0}))}render(){const e=this.available.length?this.available:Object.keys(ua);return c`
      <div class="row">
        <label>Profil:</label>
        <select @change=${this.onChange}>
          ${e.map(t=>c`
            <option value=${t} ?selected=${t===this.current}>
              ${ua[t]||t}
            </option>
          `)}
        </select>
      </div>
    `}};sr.styles=T`
    :host { display: block; margin: 12px 0; }

    .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    label {
      font-size: 13px;
      font-weight: 600;
      color: ${I(s.textPrimary)};
    }

    select {
      padding: 6px 10px;
      font-size: 13px;
      border: 1px solid ${I(s.divider)};
      border-radius: 6px;
      background: ${I(s.cardBg)};
      color: ${I(s.textPrimary)};
      cursor: pointer;
    }
  `;W([g({type:String})],sr.prototype,"current",2);W([g({type:Array})],sr.prototype,"available",2);sr=W([E("oig-boiler-category-select")],sr);let dn=class extends D{constructor(){super(...arguments),this.data=[]}render(){if(!this.data.length)return w;const e=this.data.flatMap(o=>o.hours),t=Math.max(...e,.1),i=t*.3,r=t*.7,n=Array.from({length:24},(o,l)=>l),a=o=>o===0?"none":o<i?"low":o<r?"medium":"high";return c`
      <h3>Mapa spotreby (7 dni)</h3>
      <div class="wrapper">
        <div class="grid">
          <!-- Header row -->
          <div></div>
          ${n.map(o=>c`<div class="hour-header">${o}</div>`)}

          <!-- Day rows -->
          ${this.data.map(o=>c`
            <div class="day-label">${o.day}</div>
            ${o.hours.map((l,d)=>c`
              <div class="cell ${a(l)}"
                   title="${o.day} ${d}h: ${l.toFixed(2)} kWh"></div>
            `)}
          `)}
        </div>

        <div class="legend">
          <span class="legend-item"><span class="legend-dot" style="background:#c8e6c9"></span> Nizka</span>
          <span class="legend-item"><span class="legend-dot" style="background:#ff9800"></span> Stredni</span>
          <span class="legend-item"><span class="legend-dot" style="background:#f44336"></span> Vysoka</span>
        </div>
      </div>
    `}};dn.styles=T`
    :host { display: block; }

    h3 { ${st}; }

    .wrapper {
      ${_t};
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
      color: ${I(s.textSecondary)};
      text-align: center;
      padding: 2px 0;
    }

    .day-label {
      font-size: 10px;
      font-weight: 600;
      color: ${I(s.textSecondary)};
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

    .cell.none   { background: ${I(s.bgSecondary)}; }
    .cell.low    { background: #c8e6c9; }
    .cell.medium { background: #ff9800; }
    .cell.high   { background: #f44336; }

    .legend {
      display: flex;
      gap: 14px;
      margin-top: 10px;
      font-size: 11px;
      color: ${I(s.textSecondary)};
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
  `;W([g({type:Array})],dn.prototype,"data",2);dn=W([E("oig-boiler-heatmap-grid")],dn);let pn=class extends D{constructor(){super(...arguments),this.plan=null}render(){const e=this.plan,t=(i,r=2)=>i!=null?i.toFixed(r):"-";return c`
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
    `}};pn.styles=T`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .card {
      ${_t};
      padding: 14px;
    }

    .card-title {
      font-size: 12px;
      color: ${I(s.textSecondary)};
      margin-bottom: 6px;
    }

    .card-value {
      font-size: 22px;
      font-weight: 700;
    }

    .total { color: ${I(s.textPrimary)}; }
    .fve { color: #4CAF50; }
    .grid-c { color: #FF9800; }
    .cost { color: #2196F3; }
  `;W([g({type:Object})],pn.prototype,"plan",2);pn=W([E("oig-boiler-stats-cards")],pn);let un=class extends D{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return w;const t=Math.max(...e.hourlyAvg,.01),i=new Set(e.peakHours),r=e.peakHours.length?e.peakHours.map(a=>`${a}h`).join(", "):"--",n=e.confidence!==null?`${Math.round(e.confidence*100)} %`:"-- %";return c`
      <h3>Profil spotreby (tyden)</h3>
      <div class="wrapper">
        <div class="chart">
          ${e.hourlyAvg.map((a,o)=>{const l=t>0?a/t*100:0,d=i.has(o);return c`
              <div class="bar-col" title="${o}h: ${a.toFixed(3)} kWh">
                <div class="bar ${d?"peak":"normal"}"
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
            <span class="stat-value">${n}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Sledovano:</span>
            <span class="stat-value">${e.daysTracked} dni</span>
          </div>
        </div>
      </div>
    `}};un.styles=T`
    :host { display: block; }

    h3 { ${st}; }

    .wrapper {
      ${_t};
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
      color: ${I(s.textSecondary)};
      margin-top: 3px;
    }

    /* Stats row */
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid ${I(s.divider)};
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .stat-label { color: ${I(s.textSecondary)}; }
    .stat-value { font-weight: 600; color: ${I(s.textPrimary)}; }
  `;W([g({type:Object})],un.prototype,"data",2);un=W([E("oig-boiler-profiling")],un);let hn=class extends D{constructor(){super(...arguments),this.config=null}render(){const e=this.config;if(!e)return w;const t=(i,r="")=>i!=null?`${i}${r?" "+r:""}`:`--${r?" "+r:""}`;return c`
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
    `}};hn.styles=T`
    :host { display: block; }

    h3 { ${st}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .card {
      ${_t};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${I(s.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 600;
      color: ${I(s.textPrimary)};
    }
  `;W([g({type:Object})],hn.prototype,"config",2);hn=W([E("oig-boiler-config-section")],hn);function Uo(e,t){const i=e*t,r=Math.floor(i/60)%24,n=i%60;return`${String(r).padStart(2,"0")}:${String(n).padStart(2,"0")}`}function Rm(e){switch(e){case"morning":return"🌅";case"afternoon":return"☀️";case"evening":return"🌆";case"night":return"🌙";default:return"💧"}}let lr=class extends D{constructor(){super(...arguments),this.data=null,this.lang="cs"}render(){const e=this.lang,t=x("boiler.demand_map.heading",e);if(!this.data)return c`
        <div class="card" data-testid="boiler-demand-map">
          <div class="heading">💧 ${t}</div>
          <div class="empty-state">${x("boiler.demand_map.empty",e)}</div>
        </div>
      `;const i=this.data,r=i.slotDurationMin||15,n=48,a=Math.ceil(i.slotsP80.length/n),o=[];for(let h=0;h<n;h++){let m=0,v=0;for(let f=0;f<a;f++){const b=h*a+f;m+=i.slotsP80[b]??0,v+=i.slotsP50[b]??0}o.push(m)}const l=Math.max(...o,.001),d=h=>{const m=Math.min(1,h/l);if(m<.08)return"rgba(255,255,255,.05)";const v=Math.round(120+135*m),f=Math.round(60+50*(1-m));return`rgba(${v}, ${f}, 60, ${(.12+.85*m).toFixed(2)})`},p=x("boiler.demand_map.meta",e).replace("{n}",String(i.profile.daysUsed)).replace("{cat}",ua[i.profile.category]||i.profile.label),u=`${x("boiler.demand_map.confidence",e)} ${Math.round(i.confidence*100)} %`;return c`
      <div class="card" data-testid="boiler-demand-map">
        <div class="heading">
          💧 ${t}
          <span class="meta-inline">${p} · ${u}${i.profile.fallbackUsed?c` · <span class="fallback-notice">${x("boiler.demand_map.fallback_notice",e)}</span>`:w}</span>
        </div>

        <div class="heatmap-wrap">
          <div class="heatmap">
            ${o.map((h,m)=>{const v=Uo(m*a,r),f=h.toFixed(2);return c`
                <div class="heatmap-col" title="${v}: ${f} kWh">
                  <div class="heatmap-bar" style="background:${d(h)};"></div>
                </div>
              `})}
          </div>

          <div class="hour-axis">
            ${["00:00","06:00","12:00","18:00","24:00"].map(h=>c`<span class="hour-label">${h}</span>`)}
          </div>
        </div>

        ${i.windows.length>0?c`
          <div class="chips">
            ${i.windows.slice(0,3).map(h=>{const m=Uo(h.slotIndex,r),v=Rm(h.label),f=Math.round(h.liters),b=h.p80Kwh.toFixed(1);return c`
                <span class="chip">
                  ${v}
                  <span class="chip-time">${m}</span>
                  &ge; <b>${f} L</b> (${b} kWh)
                </span>
              `})}
          </div>
        `:w}
      </div>
    `}};lr.styles=T`
    :host { display: block; }

    .card {
      ${_t};
      padding: 16px;
    }

    .heading {
      ${st};
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Empty / collecting state */
    .empty-state {
      text-align: center;
      padding: 24px 0;
      color: ${I(s.textSecondary)};
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
      color: ${I(s.textSecondary)};
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
      color: ${I(s.textPrimary)};
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }

    .chip-time {
      font-weight: 700;
      color: ${I(s.accent)};
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
      color: ${I(s.textSecondary)};
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

    .fallback-notice {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 6px;
      font-size: 10px;
      background: rgba(255,152,0,0.12);
      color: #b75d00;
    }
  `;W([g({attribute:!1})],lr.prototype,"data",2);W([g({type:String})],lr.prototype,"lang",2);lr=W([E("oig-boiler-demand-map")],lr);let gn=class extends D{constructor(){super(...arguments),this.state=null}render(){return this.state?c`
      <div class="temp-display">
        <div class="current-temp">${this.state.currentTemp!=null?`${this.state.currentTemp}°C`:"--"}</div>
        <div class="target-temp">Cil: ${this.state.targetTemp}°C</div>
      </div>

      <div class="status-indicator">
        <div class="status-dot ${this.state.heating?"heating":"idle"}"></div>
        <span>${this.state.heating?"Topi":"Necinny"}</span>
      </div>

      ${this.state.nextProfile?c`
        <div class="next-info">
          <div>Dalsi: ${this.state.nextProfile}</div>
          <div>${this.state.nextStart}</div>
        </div>
      `:null}
    `:c`<div>Nacitani...</div>`}};gn.styles=T`
    :host {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: ${I(s.cardBg)};
      border-radius: 12px;
      box-shadow: ${I(s.cardShadow)};
    }

    .temp-display { text-align: center; }

    .current-temp {
      font-size: 36px;
      font-weight: 600;
      color: ${I(s.textPrimary)};
    }

    .target-temp {
      font-size: 14px;
      color: ${I(s.textSecondary)};
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
      color: ${I(s.textSecondary)};
    }
  `;W([g({type:Object})],gn.prototype,"state",2);gn=W([E("oig-boiler-state")],gn);let mn=class extends D{constructor(){super(...arguments),this.data=[]}render(){return w}};mn.styles=T`
    :host { display: block; }
  `;W([g({type:Array})],mn.prototype,"data",2);mn=W([E("oig-boiler-heatmap")],mn);let cr=class extends D{constructor(){super(...arguments),this.profiles=[],this.editMode=!1}render(){return w}};cr.styles=T`
    :host { display: block; }
  `;W([g({type:Array})],cr.prototype,"profiles",2);W([g({type:Boolean})],cr.prototype,"editMode",2);cr=W([E("oig-boiler-profiles")],cr);let dr=class extends D{constructor(){super(...arguments),this.data=null,this.lang="cs"}render(){const e=this.data,t=this.lang,i=(e==null?void 0:e.currentState)??"unknown",r=x(`boiler.status.${i}`,t),n=(e==null?void 0:e.comfortSatisfied)===!0?x("boiler.status.comfort_satisfied",t):(e==null?void 0:e.comfortSatisfied)===!1?x("boiler.status.comfort_unsatisfied",t):x("boiler.status.comfort_unknown",t),a=(e==null?void 0:e.comfortSatisfied)===!0?"ok":(e==null?void 0:e.comfortSatisfied)===!1?"bad":"unknown",o=(e==null?void 0:e.degradedFlags)??[];return c`
      <div data-testid="boiler-status-panel" class="panel">
        <div class="row">
          <div class="heading">${x("boiler.status.heading",t)}</div>
          <span data-testid="boiler-status-current-state" class="pill ${i}">${r}</span>
        </div>
        <div class="degraded-banner" ?hidden=${!(e!=null&&e.degraded)}>${x("boiler.status.degraded",t)}</div>
        <div class="grid">
          <div class="field"><label>${x("boiler.status.temp_top",t)}</label><span>${vi((e==null?void 0:e.temperatureTop)??null)}</span></div>
          <div class="field"><label>${x("boiler.status.temp_bottom",t)}</label><span>${vi((e==null?void 0:e.temperatureBottom)??null)}</span></div>
          <div class="field"><label>${x("boiler.status.selected_source",t)}</label><span data-testid="boiler-status-selected-source">${hi((e==null?void 0:e.selectedSource)??null,t)}</span></div>
          <div class="field"><label>${x("boiler.status.actuated_source",t)}</label><span data-testid="boiler-status-actuated-source">${hi((e==null?void 0:e.actuatedSource)??null,t)}</span></div>
          <div class="field"><label>${x("boiler.status.energy_needed",t)}</label><span>${nl((e==null?void 0:e.energyNeededKwh)??null)}</span></div>
          <div class="field"><label>${x("boiler.status.last_update",t)}</label><span>${(e==null?void 0:e.lastUpdate)??"—"}</span></div>
        </div>
        <div data-testid="boiler-status-comfort" class="comfort ${a}">${n}</div>
        ${o.length?c`<div data-testid="boiler-status-degraded-flags" class="degraded-list">${o.map(l=>c`<span class="degraded-tag">${Yr(l,t)}</span>`)}</div>`:""}
      </div>
    `}};dr.styles=T`
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
  `;W([g({attribute:!1})],dr.prototype,"data",2);W([g({type:String})],dr.prototype,"lang",2);dr=W([E("oig-boiler-status-panel")],dr);let pr=class extends D{constructor(){super(...arguments),this.slots=[],this.lang="cs"}srcClass(e){return e&&["fve","grid","alternative","overflow","discharge"].includes(e)?e:"other"}render(){const e=this.lang;return!this.slots||this.slots.length===0?c`<div data-testid="boiler-plan-timeline" class="wrap"><div class="heading">${x("boiler.timeline.heading",e)}</div><div class="empty">${x("boiler.timeline.empty",e)}</div></div>`:c`
      <div data-testid="boiler-plan-timeline" class="wrap">
        <div class="heading">${x("boiler.timeline.heading",e)}</div>
        <table>
          <thead>
            <tr>
              <th>${x("boiler.timeline.col_time",e)}</th>
              <th>${x("boiler.timeline.col_source",e)}</th>
              <th>${x("boiler.timeline.col_temp",e)}</th>
              <th>${x("boiler.timeline.col_kwh",e)}</th>
              <th>${x("boiler.timeline.col_cost",e)}</th>
              <th>${x("boiler.timeline.col_pv",e)}</th>
            </tr>
          </thead>
          <tbody>
            ${this.slots.map(t=>{const i=t.comfortSatisfied===!0?c`<span class="badge ok">${x("boiler.timeline.comfort_ok",e)}</span>`:t.comfortSatisfied===!1?c`<span class="badge bad">${x("boiler.timeline.comfort_gap",e)}</span>`:"";return c`
                <tr>
                  <td>${Em(t.start,t.end)}</td>
                  <td><span class="src ${this.srcClass(t.recommendedSource)}">${hi(t.recommendedSource,e)}</span></td>
                  <td>${vi(t.expectedTempTopC??null)} ${i}</td>
                  <td>${nl(t.consumptionKwh)}</td>
                  <td>${zm(t.estimatedCostCzk??null)}</td>
                  <td>${Dm(t.pvShare??null)}</td>
                </tr>
              `})}
          </tbody>
        </table>
      </div>
    `}};pr.styles=T`
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
  `;W([g({attribute:!1})],pr.prototype,"slots",2);W([g({type:String})],pr.prototype,"lang",2);pr=W([E("oig-boiler-plan-timeline")],pr);const Yo=new Set(["input_stale_price","input_stale_pv","input_stale_temperature","input_missing_recorder","input_adapter_error"]);let ur=class extends D{constructor(){super(...arguments),this.explanation=null,this.lang="cs"}render(){const e=this.explanation,t=this.lang;if(!e)return c`<div data-testid="boiler-source-explanation" class="wrap"><div class="heading">${x("boiler.explanation.heading",t)}</div><div class="empty">${x("boiler.explanation.empty",t)}</div></div>`;const i=e.reasonCodes??[],r=i.filter(o=>Yo.has(o)),n=i.filter(o=>!Yo.has(o)),a=e.degradedReasons??[];return c`
      <div data-testid="boiler-source-explanation" class="wrap">
        <div class="heading">${x("boiler.explanation.heading",t)}</div>

        <div class="section" data-testid="boiler-explanation-freshness">
          <h4>${x("boiler.explanation.freshness_heading",t)}</h4>
          ${r.length===0?c`<div class="chips"><span class="chip fresh">${x("boiler.explanation.freshness_fresh",t)}</span></div>`:c`<div class="chips">${r.map(o=>c`<span class="chip stale">${Yr(o,t)}</span>`)}</div>`}
        </div>

        <div class="section" data-testid="boiler-explanation-degraded">
          <h4>${x("boiler.explanation.degraded_heading",t)}</h4>
          ${a.length===0?c`<div class="empty">—</div>`:c`<div class="chips">${a.map(o=>c`<span class="chip degraded">${Yr(o,t)}</span>`)}</div>`}
        </div>

        ${n.length?c`<div class="section" data-testid="boiler-explanation-reasons"><h4>Reason codes</h4><div class="chips">${n.map(o=>c`<span class="chip">${Yr(o,t)}</span>`)}</div></div>`:""}

        <div class="meta-grid" data-testid="boiler-explanation-meta">
          ${e.planCreatedAt?c`<div class="meta"><label>${x("boiler.explanation.plan_created",t)}</label><span>${e.planCreatedAt}</span></div>`:""}
          ${e.planValidUntil?c`<div class="meta"><label>${x("boiler.explanation.plan_valid_until",t)}</label><span>${e.planValidUntil}</span></div>`:""}
          ${e.dataAgeSecs!=null?c`<div class="meta"><label>${x("boiler.explanation.data_age",t)}</label><span>${Om(e.dataAgeSecs)}</span></div>`:""}
          ${e.unsatisfiedComfortGapC!=null?c`<div class="meta"><label>${x("boiler.explanation.unsatisfied_gap",t)}</label><span>${e.unsatisfiedComfortGapC} °C</span></div>`:""}
          ${e.temperatureAtDeadlineC!=null?c`<div class="meta"><label>${x("boiler.explanation.temp_at_deadline",t)}</label><span>${vi(e.temperatureAtDeadlineC)}</span></div>`:""}
        </div>
      </div>
    `}};ur.styles=T`
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
  `;W([g({attribute:!1})],ur.prototype,"explanation",2);W([g({type:String})],ur.prototype,"lang",2);ur=W([E("oig-boiler-source-explanation")],ur);let yi=class extends D{constructor(){super(...arguments),this.identity={entryId:null,boxId:null,available:!1},this.currentOverride=null,this.lang="cs"}render(){var a,o;const e=this.lang,t=this.identity.available,i=((a=this.currentOverride)==null?void 0:a.capabilityAvailable)??!1,r=t&&i,n=((o=this.currentOverride)==null?void 0:o.active)===!0;return c`
      <div data-testid="boiler-override-panel" class="wrap">
        <div class="heading">${x("boiler.override.heading",e)}</div>
        <div class="subtitle">${x("boiler.override.subtitle",e)}</div>
        ${n?c`<span class="active-badge">${x("boiler.override.active",e)}</span>`:""}
        <div class="notice" ?hidden=${t}>${x("boiler.override.identity_unavailable",e)}</div>
        <div class="notice capability-notice" ?hidden=${!t||i}>${x("boiler.override.capability_unavailable",e)}</div>
        <label>
          ${x("boiler.override.ttl_label",e)}
          <input data-testid="override-ttl-input" type="number" min="15" max="1440" step="15" value="120" ?disabled=${!r} />
        </label>
        <label>
          ${x("boiler.override.reason_label",e)}
          <textarea data-testid="override-reason-input" required ?disabled=${!r}></textarea>
        </label>
        <button data-testid="override-submit-btn" ?disabled=${!r}>${x("boiler.override.submit",e)}</button>
      </div>
    `}};yi.styles=T`
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
  `;W([g({attribute:!1})],yi.prototype,"identity",2);W([g({attribute:!1})],yi.prototype,"currentOverride",2);W([g({type:String})],yi.prototype,"lang",2);yi=W([E("oig-boiler-override-panel")],yi);let xi=class extends D{constructor(){super(...arguments),this.reason="unavailable",this.message="",this.lang="cs"}render(){const e=this.lang,t=this.reason==="loading"?"⏳":this.reason==="error"?"⚠️":this.reason==="degraded"?"🟠":"ℹ️";return c`
      <div data-testid="boiler-unavailable-state" class="wrap">
        <span class="icon">${t}</span>
        <div class="headline loading-notice" ?hidden=${this.reason!=="loading"}>${x("boiler.unavailable.loading",e)}</div>
        <div class="headline error-notice" ?hidden=${this.reason!=="error"}>${x("boiler.unavailable.error",e)}</div>
        <div class="headline degraded-notice" ?hidden=${this.reason!=="degraded"}>${x("boiler.unavailable.degraded",e)}</div>
        <div class="headline unavailable-notice" ?hidden=${this.reason!=="unavailable"}>${x("boiler.unavailable.unavailable",e)}</div>
        ${this.message?c`<div class="message">${this.message}</div>`:""}
      </div>
    `}};xi.styles=T`
    :host { display: block; }
    .wrap { padding: 24px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; }
    .icon { font-size: 1.6rem; }
    .headline { font-size: 1rem; font-weight: 600; }
    .message { color: var(--secondary-text-color, #666); font-size: 0.9rem; }
  `;W([g({type:String})],xi.prototype,"reason",2);W([g({type:String})],xi.prototype,"message",2);W([g({type:String})],xi.prototype,"lang",2);xi=W([E("oig-boiler-unavailable-state")],xi);var Wm=Object.defineProperty,Zm=Object.getOwnPropertyDescriptor,wr=(e,t,i,r)=>{for(var n=r>1?void 0:r?Zm(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Wm(t,i,n),n};const Km=Q;function bn(e,t){const i={gas:{cs:"🔥 Plyn",en:"🔥 Gas"},heat_pump:{cs:"🔥 Tepelné čerpadlo",en:"🔥 Heat pump"},fireplace:{cs:"🔥 Krb",en:"🔥 Fireplace"},other:{cs:"🔥 Alternativní zdroj",en:"🔥 Alternative source"}};return e&&i[e]?i[e][t]:t==="en"?"🔥 Alternative source":"🔥 Alternativní zdroj"}function qm(e,t,i){const r=[];return r.push({key:"fve",label:x("boiler.energy_today.source_fve",t),kwh:e.fveKwh,color:"#ffa726",costLabel:e.fveKwh>0?"≈ 0 Kč":null}),r.push({key:"grid",label:x("boiler.energy_today.source_grid",t),kwh:e.gridKwh,color:"#2196f3",costLabel:null}),e.batteryKwh>.05&&r.push({key:"battery",label:x("boiler.energy_today.source_battery",t),kwh:e.batteryKwh,color:"#7e57c2",costLabel:null}),e.altKwh>0&&r.push({key:"alt",label:bn(i,t),kwh:e.altKwh,color:"#e64a19",costLabel:null}),r}function Gm(e,t){if(!e)return null;const{estimatedCostCzk:i,costIfAllGrid:r}=e;if(i==null||r==null||r<=0)return null;const n=r-i;return n<0?null:`${x("boiler.energy_today.benchmark_savings",t)} ${n.toFixed(1)} Kč`}function Um(e){return`${e.toFixed(1).replace(".",",")} kWh`}let Rt=class extends D{constructor(){super(...arguments),this.energy=null,this.planSummary=null,this.lang="cs",this.altType=null}render(){const e=this.lang,t=x("boiler.energy_today.heading",e),i=x("boiler.energy_today.meta",e),r=this.energy,n=this.planSummary,a=r?qm(r,e,this.altType):[],o=(r==null?void 0:r.totalKwh)??0,l=o<.1,d=l?[]:a.filter(m=>m.kwh>0).map(m=>({pct:m.kwh/o*100,color:m.color,key:m.key})),p=(n==null?void 0:n.costIfAllGrid)??null,u=p!=null&&p>0?p:null,h=Gm(n,e);return c`
      <div class="card">
        <h2 class="card-header">
          ${t}
          <span class="card-header-meta">${i}</span>
        </h2>

        ${l?c`
          <div class="empty">${x("boiler.energy_today.empty",e)}</div>
        `:c`
          <div class="tiles" data-testid="energy-tiles">
            ${a.map(m=>c`
              <div class="tile" data-source="${m.key}" data-testid="energy-tile-${m.key}">
                <span class="tile-label">${m.label}</span>
                <b class="tile-kwh">${Um(m.kwh)}</b>
                ${m.costLabel?c`<span class="tile-czk" style="color:#9fe6a8">${m.costLabel}</span>`:w}
              </div>
            `)}
          </div>
        `}

        ${d.length>0?c`
          <div class="prop-bar" data-testid="prop-bar">
            ${d.map(m=>c`
              <span
                style="width:${m.pct.toFixed(1)}%;background:${m.color}"
                data-source="${m.key}"
              ></span>
            `)}
          </div>
        `:w}

        ${u!=null||h?c`
          <div class="benchmark" data-testid="benchmark">
            ${u!=null?c`
              <span class="benchmark-text">
                ${x("boiler.energy_today.benchmark_prefix",e)} ${u.toFixed(1)} Kč
                ${h?c`<strong> ${h}</strong>`:w}
              </span>
            `:w}
          </div>
        `:w}
      </div>
    `}};Rt.styles=T`
    :host {
      display: block;
    }

    .card {
      background: ${Km(s.cardBg)};
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
  `;wr([g({type:Object})],Rt.prototype,"energy",2);wr([g({type:Object})],Rt.prototype,"planSummary",2);wr([g({type:String})],Rt.prototype,"lang",2);wr([g({type:String})],Rt.prototype,"altType",2);Rt=wr([E("oig-boiler-energy-today")],Rt);var Ym=Object.defineProperty,Qm=Object.getOwnPropertyDescriptor,$t=(e,t,i,r)=>{for(var n=r>1?void 0:r?Qm(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Ym(t,i,n),n};const ni=Q,Xm=new Set(["fve","grid","battery","alternative"]);function Jm(e){if(!e)return null;const t=e.toLowerCase();return t==="fve"||t==="overflow"||t==="pv"?"fve":t==="grid"?"grid":t==="battery"||t==="discharge"?"battery":t==="alternative"||t==="alt"?"alternative":null}function An(e){const t=new Date(e);return new Date(t.getFullYear(),t.getMonth(),t.getDate(),0,0,0,0).getTime()}function It(e,t){const i=An(t),r=new Date(e).getTime(),n=24*3600*1e3;return Math.max(0,Math.min(1,(r-i)/n))}function e2(e,t){const i=[];let r=null;for(const n of e){const a=n.heatingKwh??0;if(a<=0){r&&(i.push(r),r=null);continue}const o=Jm(n.recommendedSource);if(!o||!Xm.has(o)){r&&(i.push(r),r=null);continue}const l=n.purpose==="legionella";r&&r.source===o?(r.xEnd=It(n.end,t),r.endIso=n.end,r.heatingKwh+=a,l&&(r.hasLegionella=!0)):(r&&i.push(r),r={xStart:It(n.start,t),xEnd:It(n.end,t),source:o,hasLegionella:l,heatingKwh:a,startIso:n.start,endIso:n.end})}return r&&i.push(r),i}function t2(e,t){const i=Date.now(),r=An(e),n=24*3600*1e3,a=(i-r)/n;return a<0||a>1?null:a}function i2(e,t){if(!t||!t.includes(":"))return null;const[i,r]=t.split(":").map(Number);if(!Number.isFinite(i)||!Number.isFinite(r))return null;const n=An(e),a=new Date(n);a.setHours(i,r,0,0);let o=a.getTime();const l=24*3600*1e3,d=(o-n)/l;return d<0||d>1.0001?null:Math.min(1,d)}const ia={fve:{gradStart:"#ffd54f",gradEnd:"#ffa726",legendColor:"#ffa726",textColor:"#101a10"},grid:{gradStart:"#4fc3f7",gradEnd:"#2196f3",legendColor:"#2196f3",textColor:"#062033"},battery:{gradStart:"#b39ddb",gradEnd:"#7e57c2",legendColor:"#7e57c2",textColor:"#1c1430"},alternative:{gradStart:"#ff8a65",gradEnd:"#e64a19",legendColor:"#e64a19",textColor:"#2b0d05"}};let Je=class extends D{constructor(){super(...arguments),this.slots=[],this.demandMap=null,this.circulationRuns=[],this.legionella=null,this.planSummary=null,this.lang="cs",this.altSourceType=null}render(){var f;const e=this.lang;if(!this.slots||this.slots.length===0)return c`
        <div class="card" data-testid="boiler-plan-strip">
          <div class="heading">
            🗓️ ${x("boiler.plan_strip.heading",e)}
            <span class="meta">${x("boiler.plan_strip.meta",e)}</span>
          </div>
          <div class="empty">${x("boiler.plan_strip.empty",e)}</div>
        </div>
      `;const t=this.slots[0].start,i=e2(this.slots,t),r=this._buildDrawItems(t),n=this._buildTempCurve(t),a=t2(t),o=((f=this.planSummary)==null?void 0:f.deadlineTime)??null,l=o?o.slice(0,5):null,d=l?i2(t,o):null,p=this._legionellaStandaloneMarker(t,i),u=new Set(i.map(b=>b.source)),h=r.length>0,m=this.circulationRuns.length>0,v=n.length>1;return c`
      <div class="card" data-testid="boiler-plan-strip">
        <div class="heading">
          🗓️ ${x("boiler.plan_strip.heading",e)}
          <span class="meta">${x("boiler.plan_strip.meta",e)}</span>
        </div>

        <div class="tl" data-testid="plan-strip-tl">
          <!-- Temperature SVG curve -->
          ${v?this._renderTempSvg(n,e):w}

          <!-- Axis line -->
          <div class="axis"></div>

          <!-- Source bands -->
          ${i.map(b=>this._renderBand(b,e))}

          <!-- Demand draws (below axis) -->
          ${r.map(b=>this._renderDraw(b))}

          <!-- Circulation ticks -->
          ${this.circulationRuns.map(b=>this._renderCircTick(b,t,e))}

          <!-- Legionella standalone marker -->
          ${p!==null?c`
            <div class="leg-marker" style="left:${(p*100).toFixed(2)}%" title="🦠 Legionella">🦠</div>
          `:w}

          <!-- NOW line -->
          ${a!==null?c`
            <div class="nowl"
              style="left:${(a*100).toFixed(2)}%"
              data-label="${x("boiler.plan_strip.now_label",e)}"
              data-testid="plan-strip-now-line">
            </div>
          `:w}

          <!-- Deadline line -->
          ${d!==null?c`
            <div class="dline"
              style="left:${(d*100).toFixed(2)}%"
              data-label="${x("boiler.plan_strip.deadline_label",e)} ${l}"
              data-testid="plan-strip-deadline-line">
            </div>
          `:w}
        </div>

        <!-- Time axis -->
        <div class="tlx" data-testid="plan-strip-time-axis">
          <span>00</span><span>03</span><span>06</span><span>09</span>
          <span>12</span><span>15</span><span>18</span><span>21</span>
          <span>24</span>
        </div>

        <!-- Legend -->
        <div class="leg" data-testid="plan-strip-legend">
          ${["fve","grid","battery","alternative"].filter(b=>u.has(b)).map(b=>c`
            <span>
              <i class="dot" style="background:${ia[b].legendColor}"></i>
              ${this._sourceLegendLabel(b,e)}
            </span>
          `)}
          ${h?c`
            <span>
              <i class="dot" style="background:#e53935"></i>
              ${x("boiler.plan_strip.legend_demands",e)}
            </span>
          `:w}
          ${m?c`
            <span>${x("boiler.plan_strip.legend_circ",e)}</span>
          `:w}
        </div>
      </div>
    `}_renderBand(e,t){const i=ia[e.source]??ia.fve,r=(e.xStart*100).toFixed(2),n=((e.xEnd-e.xStart)*100).toFixed(2),o=(e.xEnd-e.xStart)*100>=6,l=e.hasLegionella?x("boiler.plan_strip.source_legionella",t):this._sourceBandLabel(e.source,t),d=`${l} · ${e.heatingKwh.toFixed(2)} kWh`,p=`plan-band-${e.source}${e.hasLegionella?"-legionella":""}`;return c`
      <div class="band ${e.hasLegionella?"legionella-border":""}"
        style="left:${r}%;width:${n}%;background:linear-gradient(180deg,${i.gradStart},${i.gradEnd});color:${i.textColor}"
        title="${d}"
        data-source="${e.source}"
        data-legionella="${e.hasLegionella}"
        data-testid="${p}">
        ${o?l:w}
      </div>
    `}_renderDraw(e){const t=(e.frac*100).toFixed(2),r=Math.max(2,Math.round(e.heightPct*29));return c`
      <div class="draw"
        style="left:${t}%;width:${.9}%;height:${r}px"
        title="${e.kwh.toFixed(2)} kWh">
      </div>
    `}_renderCircTick(e,t,i){const r=It(e.start,t);if(r<0||r>1)return w;const n=(r*100).toFixed(2),o=(It(e.end,t)*100).toFixed(2),l=`${x("boiler.plan_strip.circ_tooltip",i)} ${Qo(e.start)}–${Qo(e.end)}`;return c`
      <div class="circ"
        style="left:${n}%"
        title="${l}"
        data-testid="plan-strip-circ"
        data-end-frac="${o}">
        💧
      </div>
    `}_renderTempSvg(e,t){if(e.length<2)return w;const i=960,r=84,n=Math.min(...e.map(u=>u.temp)),o=Math.max(...e.map(u=>u.temp))-n||1,l=u=>u*i,d=u=>r-(u-n)/o*(r-16)-8,p=e.map((u,h)=>`${h===0?"M":"L"}${l(u.frac).toFixed(1)},${d(u.temp).toFixed(1)}`).join(" ");return c`
      <svg class="temp-svg" viewBox="0 0 ${i} ${r}" preserveAspectRatio="none"
        data-testid="plan-strip-temp-svg"
        aria-hidden="true">
        <path d="${p}" fill="none" stroke="#ffca5a" stroke-width="2.5" opacity="0.9"/>
        <text x="6" y="12" fill="#ffca5a" font-size="10" font-family="system-ui,sans-serif">
          ${x("boiler.plan_strip.temp_zone_label",t)}
        </text>
      </svg>
    `}_buildDrawItems(e){const t=this.demandMap;if(!t)return[];const i=t.slotsP80;if(!i||i.length===0)return[];const r=Math.max(...i,.001),n=t.slotDurationMin||15,a=An(e);return i.map((o,l)=>{if(o<.05)return null;const p=(a+l*n*60*1e3-a)/(24*3600*1e3);return p<0||p>=1?null:{frac:p,heightPct:o/r,kwh:o}}).filter(o=>o!==null)}_buildTempCurve(e){const t=[];for(const i of this.slots){const r=i.expectedTempTopC??null;if(r==null||!Number.isFinite(r))continue;const n=It(i.start,e);t.push({frac:n,temp:r})}return t}_legionellaStandaloneMarker(e,t){const i=this.legionella;if(!(i!=null&&i.scheduledStart))return null;const r=It(i.scheduledStart,e);return r<0||r>1||t.some(a=>a.hasLegionella&&r>=a.xStart&&r<=a.xEnd)?null:r}_sourceBandLabel(e,t){switch(e){case"fve":return x("boiler.plan_strip.source_overflow",t);case"grid":return x("boiler.plan_strip.source_grid",t);case"battery":return x("boiler.plan_strip.source_battery",t);case"alternative":return bn(this.altSourceType,t);default:return e}}_sourceLegendLabel(e,t){switch(e){case"fve":return x("boiler.plan_strip.legend_overflow",t);case"grid":return x("boiler.plan_strip.legend_grid",t);case"battery":return x("boiler.plan_strip.legend_battery",t);case"alternative":return bn(this.altSourceType,t);default:return e}}};Je.styles=T`
    :host { display: block; }

    .card {
      background: ${ni(s.cardBg)};
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: ${ni(s.cardShadow)};
    }

    .heading {
      font-size: 13px;
      font-weight: 600;
      color: ${ni(s.textPrimary)};
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
      color: ${ni(s.textSecondary)};
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
      color: ${ni(s.textPrimary)};
    }

    /* Legend row */
    .leg {
      display: flex;
      gap: 12px;
      font-size: 10px;
      opacity: 0.85;
      margin-top: 8px;
      flex-wrap: wrap;
      color: ${ni(s.textPrimary)};
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
  `;$t([g({attribute:!1})],Je.prototype,"slots",2);$t([g({attribute:!1})],Je.prototype,"demandMap",2);$t([g({attribute:!1})],Je.prototype,"circulationRuns",2);$t([g({attribute:!1})],Je.prototype,"legionella",2);$t([g({attribute:!1})],Je.prototype,"planSummary",2);$t([g({type:String})],Je.prototype,"lang",2);$t([g({type:String})],Je.prototype,"altSourceType",2);Je=$t([E("oig-boiler-plan-strip")],Je);function Qo(e){const t=new Date(e);return isNaN(t.getTime())?e:`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`}var r2=Object.defineProperty,n2=Object.getOwnPropertyDescriptor,De=(e,t,i,r)=>{for(var n=r>1?void 0:r?n2(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&r2(t,i,n),n};function Xo(e){if(e==null||!isFinite(e))return"#37474f";const t=[[10,[21,101,192]],[25,[38,198,218]],[40,[255,183,77]],[55,[255,112,67]],[70,[230,74,25]]];if(e<=t[0][0])return qr(t[0][1]);if(e>=t[t.length-1][0])return qr(t[t.length-1][1]);for(let i=1;i<t.length;i++)if(e<=t[i][0]){const[r,n]=t[i-1],[a,o]=t[i],l=(e-r)/(a-r);return qr([Math.round(n[0]+(o[0]-n[0])*l),Math.round(n[1]+(o[1]-n[1])*l),Math.round(n[2]+(o[2]-n[2])*l)])}return qr(t[t.length-1][1])}function qr(e){return`rgb(${e[0]},${e[1]},${e[2]})`}function a2(e){return e==null||!isFinite(e)||e<=.005||e>=.995?null:(1-e)*100}function o2(e,t,i,r,n){const a=[x("boiler.aria.svg_summary",n)];a.push(`${x("boiler.status.temp_top",n)}: ${vi(e)}`),a.push(`${x("boiler.status.temp_bottom",n)}: ${vi(t)}`);const o=i?hi(i,n):x("boiler.aria.source_unknown",n);return a.push(o),r&&a.push(x("boiler.aria.stale",n)),a.join(". ")}let Te=class extends D{constructor(){super(...arguments),this.fillLevelPct=null,this.sourceSegments=[],this.energyMix=null,this.topTempC=null,this.bottomTempC=null,this.lowerZoneTempC=null,this.volumeL=null,this.readyLiters=null,this.etaText=null,this.sourceKey=null,this.stale=!1,this.chargingLabel=null,this.altCharging=!1,this.sourceEstimated=!1,this.lang="cs"}render(){try{return this._renderTank()}catch{return c`
        <div class="bwrap" data-testid="boiler-svg" role="img"
             aria-label="${x("boiler.aria.svg_summary",this.lang)}">
        </div>
      `}}_renderTank(){const e=o2(this.topTempC,this.bottomTempC,this.sourceKey,this.stale,this.lang),t=this.fillLevelPct??null,i=this.topTempC!=null?`${this.topTempC.toFixed(1)} °C`:"— °C",r=this.bottomTempC??this.lowerZoneTempC??null,n=r!=null?`dole ${r.toFixed(1)} °C`:null,a=this.readyLiters??(t!=null&&this.volumeL!=null?Math.round(t*this.volumeL):null),o=a??null,l=this._renderTrendChip(),d=this.chargingLabel!=null,p=Xo(this.topTempC),u=Xo(r??this.topTempC),h=`linear-gradient(180deg, ${p} 0%, ${u} 100%)`,m=a2(t),v=this._renderSourceChipBelow();return c`
      <div class="bwrap" data-testid="boiler-svg" role="img" aria-label="${e}">
        <div class="tank">
          <div class="shell">
            <div
              class="thermal"
              data-testid="boiler-thermal-fill"
              style="background:${h};"
            >
              ${d?c`<div class="surf surf--charging"></div>`:w}
              ${m!=null?c`
                <div
                  class="ready-line"
                  data-testid="boiler-ready-line"
                  style="top:${m.toFixed(1)}%;"
                ></div>
              `:w}
            </div>
          </div>

          ${l}

          <div
            class="ttop"
            data-testid="boiler-temp-top-label"
          >${i}</div>

          ${o!=null?c`
            <div class="vol" data-testid="boiler-volume-badge">
              ${o} L
              <s class="vol-caption">${x("boiler.tank.ready_caption",this.lang)}</s>
            </div>
          `:w}

          ${r!=null?c`
            <div class="tbot" data-testid="boiler-temp-bottom-label">${n}</div>
          `:w}
        </div>

        ${v}

        ${this.etaText!=null?c`
          <div class="eta" data-testid="boiler-eta-chip">${this.etaText}</div>
        `:w}
      </div>
    `}_renderTrendChip(){const e=this.chargingLabel;if(e!=null){const t=this.altCharging?"trend trend--alt":"trend";return c`
        <div class="${t}" data-testid="boiler-trend-chip">${e}</div>
      `}return w}_renderSourceChipBelow(){const e=this.sourceKey;if(e==null)return c`
        <div class="srcchip srcchip--idle" data-testid="boiler-source-chip">
          ${x("boiler.tank.source_idle",this.lang)}
        </div>
      `;const t={fve:x("boiler.tank.source_fve",this.lang),overflow:x("boiler.tank.source_fve",this.lang),grid:x("boiler.tank.source_grid",this.lang),battery:x("boiler.tank.source_battery",this.lang),discharge:x("boiler.tank.source_battery",this.lang),alternative:x("boiler.tank.source_alt",this.lang)},i={fve:"srcchip",overflow:"srcchip",grid:"srcchip srcchip--grid",battery:"srcchip srcchip--battery",discharge:"srcchip srcchip--battery",alternative:"srcchip srcchip--alt"},r=t[e]??hi(e,this.lang),n=i[e]??"srcchip",a=this.sourceEstimated?c` <small data-testid="boiler-source-estimated">${x("boiler.tank.source_estimated_suffix",this.lang)}</small>`:w;return c`
      <div class="${n}" data-testid="boiler-source-chip">${r}${a}</div>
    `}};Te.styles=T`
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
  `;De([g({type:Number})],Te.prototype,"fillLevelPct",2);De([g({type:Array})],Te.prototype,"sourceSegments",2);De([g({type:Object})],Te.prototype,"energyMix",2);De([g({type:Number})],Te.prototype,"topTempC",2);De([g({type:Number})],Te.prototype,"bottomTempC",2);De([g({type:Number})],Te.prototype,"lowerZoneTempC",2);De([g({type:Number})],Te.prototype,"volumeL",2);De([g({type:Number})],Te.prototype,"readyLiters",2);De([g({type:String})],Te.prototype,"etaText",2);De([g({type:String})],Te.prototype,"sourceKey",2);De([g({type:Boolean})],Te.prototype,"stale",2);De([g({type:String})],Te.prototype,"chargingLabel",2);De([g({type:Boolean})],Te.prototype,"altCharging",2);De([g({type:Boolean})],Te.prototype,"sourceEstimated",2);De([g({type:String})],Te.prototype,"lang",2);Te=De([E("oig-boiler-v2-svg")],Te);var s2=Object.defineProperty,l2=Object.getOwnPropertyDescriptor,Ln=(e,t,i,r)=>{for(var n=r>1?void 0:r?l2(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&s2(t,i,n),n};const Jo=Q,ra=new Set(["temperature_unavailable","temperature_stale","activity_stale","source_invalid","runtime_cache_empty","config_profile_unavailable"]);function c2(e){var t,i,r,n;if((t=e.status)!=null&&t.degraded)return!0;for(const a of((i=e.status)==null?void 0:i.degradedFlags)??[])if(ra.has(a))return!0;for(const a of((r=e.activity)==null?void 0:r.staleFlags)??[])if(ra.has(a))return!0;for(const a of((n=e.explanation)==null?void 0:n.degradedReasons)??[])if(ra.has(a))return!0;return!1}function d2(e,t,i){var p,u,h;const r=e.activity;if(!r)return null;const n=t.targetTempC??0,a=Im({targetTempC:n,topTempC:((p=e.status)==null?void 0:p.temperatureTop)??null,temperatureTrendCPerMin:r.temperatureTrendCPerMin,volumeL:t.volumeL,heaterPowerKw:t.heaterPowerKw});if(a===null)return x("boiler.eta.unavailable",i);if(a===0)return x("boiler.eta.already_reached",i);const o=`na ${n.toFixed(0)} °C za ~${Fm(a)}`,l=((u=e.planSummary)==null?void 0:u.deadlineTime)??t.deadlineTime,d=((h=e.status)==null?void 0:h.comfortSatisfied)??null;if(l&&l!=="--:--"){const m=l.substring(0,5);return`${o} · ${i==="cs"?"komfort":"comfort"} ${m}${d===!0?" ✓":""}`}return o}let wi=class extends D{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs"}render(){try{return this._renderShell()}catch{return c`
        <div class="shell" data-testid="boiler-v2-shell">
          <div class="stale-warning" data-testid="boiler-stale-warning" role="alert">
            ${x("boiler.aria.stale",this.lang)}
          </div>
        </div>
      `}}_renderShell(){var v,f;const e=this.data,t=e?c2(e):!1,i=(e==null?void 0:e.activity)??null,r=(e==null?void 0:e.status)??null,n=this.config,a=e&&n?d2(e,n,this.lang):null,l=((v=i==null?void 0:i.state)==null?void 0:v.startsWith("charging_"))??!1?(i==null?void 0:i.source)??null:null,d=(i==null?void 0:i.state)==="charging_alt",p=(()=>{var $;if(!(($=i==null?void 0:i.state)!=null&&$.startsWith("charging_")))return null;const b=d?"🔥 OHŘÍVÁ":"⚡ NABÍJÍ";if(i.temperatureTrendCPerMin!=null){const y=i.temperatureTrendCPerMin>=0?"+":"",_=i.temperatureTrendCPerMin.toLocaleString("cs-CZ",{minimumFractionDigits:1,maximumFractionDigits:1});return`${b} ${y}${_} °C/min`}return b})(),u=((f=e==null?void 0:e.status)==null?void 0:f.lowerZoneTempC)??null,h=(i==null?void 0:i.fillLevelPct)??null,m=h!=null&&(n==null?void 0:n.volumeL)!=null?Math.round(h*n.volumeL):null;return c`
      <div class="shell" data-testid="boiler-v2-shell">
        ${t?c`
              <div class="stale-warning" data-testid="boiler-stale-warning" role="alert">
                ${x("boiler.aria.stale",this.lang)}
              </div>
            `:w}

        <div class="svg-wrapper">
          <oig-boiler-v2-svg
            .fillLevelPct="${h}"
            .sourceSegments="${(e==null?void 0:e.sourceSegments)??[]}"
            .energyMix="${e!=null&&e.energyToday?{fve:e.energyToday.fveKwh,grid:e.energyToday.gridKwh,battery:e.energyToday.batteryKwh,alt:e.energyToday.altKwh,unattributed:e.energyToday.unattributedKwh}:null}"
            .topTempC="${(r==null?void 0:r.temperatureTop)??null}"
            .bottomTempC="${(r==null?void 0:r.temperatureBottom)??null}"
            .lowerZoneTempC="${u}"
            .volumeL="${(n==null?void 0:n.volumeL)??null}"
            .readyLiters="${m}"
            .etaText="${a}"
            .sourceKey="${l}"
            .chargingLabel="${p}"
            .altCharging="${d}"
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
    `}};wi.styles=T`
    :host {
      display: block;
      font-family: ${Jo(s.fontFamily)};
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
      background: ${Jo(s.cardBg)};
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
  `;Ln([g({type:Object})],wi.prototype,"data",2);Ln([g({type:Object})],wi.prototype,"config",2);Ln([g({type:String})],wi.prototype,"lang",2);wi=Ln([E("oig-boiler-v2-shell")],wi);var p2=Object.defineProperty,u2=Object.getOwnPropertyDescriptor,Hi=(e,t,i,r)=>{for(var n=r>1?void 0:r?u2(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&p2(t,i,n),n};let mt=class extends D{constructor(){super(...arguments),this.values=[],this.color="#4CAF50",this.sparkWidth=100,this.sparkHeight=30,this.label=""}render(){try{return this._renderSparkline()}catch{return c`<svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      ></svg>`}}_renderSparkline(){const e=Array.isArray(this.values)?this.values:[],t=e.filter(u=>typeof u=="number"&&isFinite(u));if(t.length<2)return c`<svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        viewBox="0 0 ${this.sparkWidth} ${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      ></svg>`;const i=Math.min(...t),n=Math.max(...t)-i||1,a=2,o=this.sparkHeight-a*2,l=this.sparkWidth,d=e.length,p=e.map((u,h)=>{if(typeof u!="number"||!isFinite(u))return null;const m=d>1?h/(d-1)*l:l/2,v=a+o-(u-i)/n*o;return`${m.toFixed(2)},${v.toFixed(2)}`}).filter(u=>u!==null).join(" ");return c`
      <svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        viewBox="0 0 ${this.sparkWidth} ${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      >
        ${F`<polyline
          points="${p}"
          fill="none"
          stroke="${this.color}"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />`}
      </svg>
    `}};mt.styles=T`
    :host {
      display: inline-block;
    }
    svg {
      display: block;
      overflow: visible;
    }
  `;Hi([g({type:Array})],mt.prototype,"values",2);Hi([g({type:String})],mt.prototype,"color",2);Hi([g({type:Number})],mt.prototype,"sparkWidth",2);Hi([g({type:Number})],mt.prototype,"sparkHeight",2);Hi([g({type:String})],mt.prototype,"label",2);mt=Hi([E("oig-boiler-sparkline")],mt);var h2=Object.defineProperty,g2=Object.getOwnPropertyDescriptor,_r=(e,t,i,r)=>{for(var n=r>1?void 0:r?g2(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&h2(t,i,n),n};const Gr=Q;function m2(e,t){switch(e){case"fve":case"overflow":return x("boiler.panel.source_overflow",t);case"grid":return x("boiler.panel.source_grid",t);case"battery":return x("boiler.panel.source_battery_short",t);case"alternative":return x("boiler.panel.source_alt",t);default:return e??"—"}}function b2(e){switch(e){case"morning":return"🌅";case"afternoon":return"☀️";case"evening":return"🌆";case"night":return"🌙";default:return"💧"}}function f2(e,t){const i=`boiler.demand_map.window.${e}`,r=x(i,t);return r!==i?r.toLowerCase():e}function v2(e){const t=e*15,i=Math.floor(t/60)%24,r=t%60;return`${String(i).padStart(2,"0")}:${String(r).padStart(2,"0")}`}function es(e){const t=new Date(e);return Number.isNaN(t.getTime())?"??:??":`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`}function y2(e,t){const i=Date.now();for(const r of e){const n=new Date(r.start).getTime();if(!Number.isFinite(n)||n<i-6e4)continue;const a=r.heatingKwh??null;if(a!==null&&a<=0)continue;const o=r.recommendedSource;if(!o)continue;const l=new Date(n),d=new Date,p=l.getDate()!==d.getDate()||l.getMonth()!==d.getMonth()||l.getFullYear()!==d.getFullYear(),u=m2(o,t),h=`${String(l.getHours()).padStart(2,"0")}:${String(l.getMinutes()).padStart(2,"0")}`;return{label:u,timeStr:h,isTomorrow:p}}return null}let Wt=class extends D{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs",this.panelType="source"}render(){try{return this.panelType==="source"?this._renderSourcePanel():this._renderComfortPanel()}catch{return c`
        <div class="panel">
          <div class="empty-panel">—</div>
        </div>
      `}}_renderSourcePanel(){var V;const e=this.data,t=this.lang,i=(e==null?void 0:e.energyToday)??null,r=(e==null?void 0:e.planSummary)??null,n=(e==null?void 0:e.activity)??null,a=(e==null?void 0:e.planSlots)??[],o=(i==null?void 0:i.costCzk)??(r==null?void 0:r.estimatedCostCzk)??null,l=(i==null?void 0:i.totalKwh)??null,d=(i==null?void 0:i.fveKwh)??null,p=(i==null?void 0:i.gridKwh)??null,u=(i==null?void 0:i.altKwh)??null,h=u!=null&&u>0,m=(i==null?void 0:i.unattributedKwh)??null,v=m!=null&&m>.05,f=bn(e==null?void 0:e.altSourceType,t),b=(i==null?void 0:i.batteryKwh)??null,$=b!=null&&b>0,y=(i==null?void 0:i.savingsVsAltCzk)??null,_=y!=null&&y>=0?`${y.toFixed(1).replace(".",",")} Kč`:null,B=((V=n==null?void 0:n.state)==null?void 0:V.startsWith("charging_"))??!1?(n==null?void 0:n.source)??null:null,P=(n==null?void 0:n.sourceEstimated)===!0,N=(()=>{switch(B){case"fve":case"overflow":return x("boiler.panel.source_overflow",t);case"grid":return x("boiler.panel.source_grid_short",t);case"discharge":return x("boiler.panel.source_battery_short",t);case"alternative":return x("boiler.panel.source_alt",t);default:return"—"}})(),k=P&&B!=null?`${N} (${x("boiler.tank.source_estimated_suffix",t)})`:N,A=y2(a,t);return c`
      <div class="panel" data-testid="boiler-source-panel">
        <h3 class="panel-title">${x("boiler.panel.source_title",t)}</h3>

        <div class="kv">
          <span>${x("boiler.panel.cost_today",t)}</span>
          <b>${o!=null?`${o.toFixed(1).replace(".",",")} Kč`:"—"}</b>
        </div>

        <div class="kv">
          <span>${x("boiler.panel.energy_today",t)}</span>
          <b>${l!=null?`${l.toFixed(1).replace(".",",")} kWh`:"—"}</b>
        </div>

        <div class="kv">
          <span>${x("boiler.panel.fve_label",t)}</span>
          <b style="color:#ffd479">${d!=null?`${d.toFixed(1).replace(".",",")} kWh`:"—"}</b>
        </div>

        <div class="kv">
          <span>${x("boiler.panel.grid_label",t)}</span>
          <b style="color:#81d4fa">${p!=null?`${p.toFixed(1).replace(".",",")} kWh`:"—"}</b>
        </div>

        ${v?c`
          <div class="kv">
            <span>${x("boiler.panel.unattributed_label",t)}</span>
            <b style="color:#9aa6b2">${m.toFixed(1).replace(".",",")} kWh</b>
          </div>
        `:w}

        ${h||u!=null?c`
          <div class="kv">
            <span>${f}</span>
            <b style="color:#ffab91">${u!=null?`${u.toFixed(1).replace(".",",")} kWh`:"—"}</b>
          </div>
        `:w}

        ${$?c`
          <div class="kv">
            <span>${x("boiler.panel.battery_label",t)}</span>
            <b style="color:#ce93d8">${b.toFixed(1).replace(".",",")} kWh</b>
          </div>
        `:w}

        <div class="kv">
          <span>${x("boiler.panel.savings_label",t)}</span>
          <b style="color:#9fe6a8">${_??"—"}</b>
        </div>

        <div class="kv" data-testid="boiler-current-source-row">
          <span>${x("boiler.panel.current_source",t)}</span>
          <b>${k}</b>
        </div>

        <div class="kv" data-testid="boiler-next-action">
          <span>${x("boiler.panel.next_action",t)}</span>
          <b>${A!=null?A.isTomorrow?c`${A.label} ${x("boiler.panel.tomorrow",t)} ${A.timeStr}`:c`${A.label} ${A.timeStr}`:"—"}</b>
        </div>
      </div>
    `}_renderComfortPanel(){var $,y,_,S,B;const e=this.data,t=this.lang,r=(($=e==null?void 0:e.status)==null?void 0:$.comfortSatisfied)??null,n=(e==null?void 0:e.demandMap)??null,a=((y=n==null?void 0:n.windows)==null?void 0:y.slice(0,3))??[],o=(e==null?void 0:e.planSummary)??null,l=(o==null?void 0:o.deadlineTime)??(((_=this.config)==null?void 0:_.deadlineTime)!=="--:--"?(S=this.config)==null?void 0:S.deadlineTime:null)??null,d=((B=this.config)==null?void 0:B.targetTempC)??null,p=(e==null?void 0:e.legionella)??null,u=(()=>{if(!p)return null;if(!p.enabled)return x("boiler.panel.legionella_off",t);if(p.scheduledStart){const k=p.scheduledStart,A=k.includes("T")?es(k):k.substring(0,5);return`${x("boiler.panel.legionella_plan",t)} ${A}`}const P=p.daysSinceLast??null,N=p.intervalDays??null;if(P!==null&&N!==null){const k=N-P;return k<=0?x("boiler.panel.legionella_overdue",t):`${x("boiler.panel.legionella_in",t)} ${k} ${x("boiler.panel.legionella_days",t)}`}return x("boiler.panel.legionella_scheduled",t)})(),h=(e==null?void 0:e.activity)??null,m=(h==null?void 0:h.temperatureTrendCPerMin)??null,v=m!=null?`${m>=0?"+":""}${m.toFixed(1).replace(".",",")} °C/min`:null,f=(e==null?void 0:e.circulationRuns)??[],b=(()=>{if(!f.length)return null;const P=f[0];return`💧 ${es(P.start)} (${x("boiler.panel.circ_before_peak",t)})`})();return c`
      <div class="panel" data-testid="boiler-comfort-panel">
        <h3 class="panel-title">${x("boiler.panel.comfort_title",t)}</h3>

        ${r===!0?c`<span class="okchip" data-testid="boiler-comfort-chip">✓ ${x("boiler.status.comfort_satisfied",t)}</span>`:r===!1?c`<span class="gapcip" data-testid="boiler-comfort-chip">⚠ ${x("boiler.status.comfort_unsatisfied",t)}</span>`:w}

        ${a.map(P=>{const N=b2(P.label),k=f2(P.label,t),A=v2(P.slotIndex),V=Math.round(P.liters);return c`
            <div class="kv" data-testid="boiler-demand-window">
              <span>${N} ${k} ${A}</span>
              <b>≥${V} L</b>
            </div>
          `})}

        ${l&&l!=="--:--"?c`
          <div class="kv" data-testid="boiler-deadline-row">
            <span>${x("boiler.panel.deadline_label",t)}</span>
            <b>${l.substring(0,5)}${d!=null?c` · ${d.toFixed(0)} °C`:w}</b>
          </div>
        `:w}

        ${u!=null?c`
          <div class="kv" data-testid="boiler-legionella-row">
            <span>${x("boiler.panel.legionella_label",t)}</span>
            <b>${u}</b>
          </div>
        `:w}

        ${v!=null?c`
          <div class="kv" data-testid="boiler-trend-row">
            <span>${x("boiler.panel.trend_label",t)}</span>
            <b>${v}</b>
          </div>
        `:w}

        ${b!=null?c`
          <div class="kv" data-testid="boiler-circ-row">
            <span>${x("boiler.panel.circ_label",t)}</span>
            <b>${b}</b>
          </div>
        `:c`
          <div class="kv" data-testid="boiler-circ-row">
            <span>${x("boiler.panel.circ_label",t)}</span>
            <b style="opacity:0.5">${x("boiler.panel.circ_off",t)}</b>
          </div>
        `}
      </div>
    `}};Wt.styles=T`
    :host {
      display: block;
      font-family: ${Gr(s.fontFamily)};
    }

    /* ── Side panel wrapper ── */
    :host { height: 100%; }

    .panel {
      background: ${Gr(s.cardBg)};
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
      color: ${Gr(s.textPrimary)};
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
      color: ${Gr(s.textSecondary)};
      font-size: 12px;
      font-style: italic;
      padding: 4px 0;
    }
  `;_r([g({type:Object})],Wt.prototype,"data",2);_r([g({type:Object})],Wt.prototype,"config",2);_r([g({type:String})],Wt.prototype,"lang",2);_r([g({type:String})],Wt.prototype,"panelType",2);Wt=_r([E("oig-boiler-metric-panel")],Wt);var x2=Object.defineProperty,w2=Object.getOwnPropertyDescriptor,Vi=(e,t,i,r)=>{for(var n=r>1?void 0:r?w2(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&x2(t,i,n),n};const na=Q,Xi=1e3,li=200,ts=20,aa=80,Pt=3,it=100,Et=1440;function _2(e){return e??Date.now()}function $2(e,t){var a,o;const i=new Intl.DateTimeFormat("en-US",{timeZone:t,hour:"numeric",minute:"2-digit",hour12:!1}).formatToParts(new Date(e)),r=parseInt(((a=i.find(l=>l.type==="hour"))==null?void 0:a.value)??"0",10)%24,n=parseInt(((o=i.find(l=>l.type==="minute"))==null?void 0:o.value)??"0",10);return r*60+n}function k2(e,t){const i=new Intl.DateTimeFormat("en-US",{timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}).formatToParts(new Date(e)),r=y=>{var _;return((_=i.find(S=>S.type===y))==null?void 0:_.value)??"00"},n=r("year"),a=r("month"),o=r("day"),l=parseInt(r("hour"),10)%24,d=r("minute"),p=r("second"),u=String(l).padStart(2,"0"),h=Date.UTC(parseInt(n),parseInt(a)-1,parseInt(o),l,parseInt(d),parseInt(p)),m=Math.round((h-e)/6e4),v=m>=0?"+":"-",f=Math.abs(m),b=String(Math.floor(f/60)).padStart(2,"0"),$=String(f%60).padStart(2,"0");return`${n}-${a}-${o}T${u}:${d}:${p}${v}${b}:${$}`}function rt(e){return e/Et*Xi}function ai(e){return String(parseFloat(e.toFixed(3)))}function oa(e){const t=Math.max(ts,Math.min(aa,e));return(aa-t)/(aa-ts)*li}function C2(e,t){const i=$2(e,t);return e-i*6e4}function M2(e){if(e.length<=1)return e;const t=[];let i={...e[0]};for(let r=1;r<e.length;r++){const n=e[r],a=i.recommendedSource===n.recommendedSource,o=(i.heatingKwh!=null?i.heatingKwh>0:!1)==(n.heatingKwh!=null?n.heatingKwh>0:!1),l=i.end===n.start;a&&o&&l?i={...i,end:n.end}:(t.push(i),i={...n})}return t.push(i),t}function is(e,t,i){let r=null,n=-1/0;for(const a of t){const o=Date.parse(a.start);if(!isFinite(o))continue;const l=a.end!==null?Date.parse(a.end):i;isFinite(l)&&o<=e&&e<=l&&o>n&&(n=o,r=a)}return r}function rs(e,t){const i=Date.parse(e.start),r=e.end!==null?Date.parse(e.end):t;if(!isFinite(i)||!isFinite(r))return null;const n=(r-i)/36e5;return n<=0||!isFinite(n)||!isFinite(e.energyKwh)||e.energyKwh<0?null:e.energyKwh/n}function S2(e,t,i,r,n){const a=[x("boiler.aria.plan_timeline",n)];a.push(`NOW: ${e}`),t&&a.push(`${x("boiler.config.deadline",n)}: ${t}`),i!=null&&a.push(`${x("boiler.config.goal_temp",n)}: ${i}°C`);const o=[...new Set(r.filter(Boolean))];return o.length>0&&a.push(o.map(l=>hi(l,n)).join(", ")),a.join(". ")}let bt=class extends D{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs",this.nowMs=null,this.timeZone=null}render(){try{return this._renderTimeline()}catch{return c`
        <div class="timeline-section">
          <div class="empty-timeline" data-testid="boiler-timeline">${x("boiler.timeline.empty",this.lang)}</div>
        </div>
      `}}_resolveTimeZone(){if(this.timeZone)return this.timeZone;try{return Intl.DateTimeFormat().resolvedOptions().timeZone}catch{return"Europe/Prague"}}_renderTimeline(){var he;const e=_2(this.nowMs??void 0),t=this._resolveTimeZone();let i;try{i=C2(e,t)}catch{i=e-e%864e5}const r=(e-i)/6e4,n=rt(r);let a="";try{a=k2(e,t)}catch{a=new Date(e).toISOString()}const o=this.config,l=o!=null&&o.deadlineTime&&o.deadlineTime!=="--:--"?o.deadlineTime:null;let d=null;if(l)try{const[C,Y]=l.split(":"),re=parseInt(C,10)*60+parseInt(Y,10);d=rt(re)}catch{d=null}const p=(o==null?void 0:o.targetTempC)!=null&&isFinite(o.targetTempC)?o.targetTempC:60,u=oa(p),h=this.data,m=Array.isArray(h==null?void 0:h.planSlots)?h.planSlots:[],v=Array.isArray(h==null?void 0:h.timeline)?h.timeline:[],f=Array.isArray(h==null?void 0:h.sourceSegments)?h.sourceSegments:[],b=m.length>0&&m.every(C=>(C.heatingKwh??0)===0&&(C.pvKwh??0)===0&&(C.gridKwh??0)===0&&(C.altKwh??0)===0),$=this._buildPlanBands(m,i),y=this._buildTempPointsFromSlots(m,i),_=this._buildTempPointsFromTimeline(v,i),S=y.length>0?y:_,B=this._buildPowerBarsFromSlots(m,i),P=this._buildPowerBars(v,f,i,e),N=$.map(C=>C.source);let k="";try{k=S2(a,l,p,N,this.lang)}catch{k=x("boiler.aria.plan_timeline",this.lang)}const A=S.length>=2?S.map(C=>`${C.x.toFixed(2)},${C.y.toFixed(2)}`).join(" "):null,V=m.reduce((C,Y)=>C+(Y.gridKwh??0),0),q=m.reduce((C,Y)=>C+(Y.pvKwh??0)+(Y.altKwh??0),0),K=m.reduce((C,Y)=>C+(Y.estimatedCostCzk??0),0),Z=V+q,j=((he=h==null?void 0:h.status)==null?void 0:he.degradedFlags)??[],Pe=j.includes("price_degraded"),Ne=j.includes("forecast_degraded"),X=["00","03","06","09","12","15","18","21","24"];return c`
      <div class="timeline-section">
        <div class="timeline-header">
          <h3>📅 24h plán: teplota, výkon &amp; zdroje</h3>
          ${m.length>0?c`
            <div class="timeline-summary">
              Dnes: <strong>${V.toFixed(1)} kWh</strong> ze sítě
              · <strong style="color:#f5b800">${q.toFixed(1)} kWh</strong> z FVE/přetoku
              ${K>0?c` · <strong>~${K.toFixed(2)} Kč</strong>`:""}
              ${Z>0?c` · spotřeba <strong>~${Z.toFixed(1)} kWh</strong>`:""}
            </div>
          `:""}
        </div>

        ${b?c`
          <div class="empty-timeline" data-testid="boiler-timeline">Plán nedostupný (degraded)</div>
        `:c`
          <div class="chart-wrap">
            <div class="y-axis-label left">
              <span>80°</span><span>60°</span><span>40°</span><span>20°</span>
            </div>
            <div class="y-axis-label right">
              <span>3kW</span><span>1.5kW</span><span>0</span>
            </div>
            <svg
              class="chart-svg"
              viewBox="0 0 ${Xi} ${li}"
              role="img"
              aria-label="${k}"
              data-testid="boiler-timeline"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              ${F`<rect x="0" y="0" width="${Xi}" height="${li}" fill="transparent" />`}

              ${$.map(C=>{const Y=C.source?Tc[C.source]??"#9E9E9E":"#9E9E9E",re=C.x2-C.x1;return F`<rect
                  class="plan-band"
                  data-source="${C.source??"unknown"}"
                  x="${C.x1.toFixed(2)}"
                  y="0"
                  width="${re.toFixed(2)}"
                  height="${li}"
                  fill="${Y}"
                />`})}

              ${F`<line x1="0" y1="${it}" x2="${Xi}" y2="${it}" stroke="rgba(255,255,255,.08)" stroke-width="1"/>`}

              ${F`<line
                class="goal-line"
                x1="0" y1="${u.toFixed(2)}"
                x2="${Xi}" y2="${u.toFixed(2)}"
              />`}
              ${F`<text x="4" y="${(u-3).toFixed(2)}" font-size="8" fill="#4ade80">CÍL ${p}°C</text>`}

              ${d!=null&&l!=null?F`
                <line class="deadline-marker"
                  data-testid="boiler-deadline-marker"
                  data-deadline-time="${l}"
                  data-deadline-x="${ai(d)}"
                  x1="${ai(d)}" y1="0"
                  x2="${ai(d)}" y2="${li}"
                />
                <text x="${(d+3).toFixed(2)}" y="12" font-size="8" fill="#E65100">${l}</text>
              `:""}

              ${B.map(C=>{if(C.isCharge){const Y=it-C.barH;return F`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    x="${(C.x-2).toFixed(2)}" y="${Y.toFixed(2)}" width="4" height="${C.barH.toFixed(2)}"/>`}else return F`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    x="${(C.x-2).toFixed(2)}" y="${it}" width="4" height="${C.barH.toFixed(2)}"/>`})}

              ${P.map(C=>{if(C.isCharge){const Y=it-C.barH;return F`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    data-estimated-power="${C.isEstimated?"true":"false"}"
                    x="${(C.x-2).toFixed(2)}" y="${Y.toFixed(2)}" width="4" height="${C.barH.toFixed(2)}"/>`}else return F`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    data-estimated-power="${C.isEstimated?"true":"false"}"
                    x="${(C.x-2).toFixed(2)}" y="${it}" width="4" height="${C.barH.toFixed(2)}"/>`})}

              ${v.map(C=>{let Y;try{Y=Date.parse(C.timestamp)}catch{return""}if(!isFinite(Y))return"";const re=(Y-i)/6e4;if(re<0||re>Et||C.powerKw!==null)return"";const Ae=is(Y,f,e),Le=Ae?rs(Ae,e):null;if(Le!==null&&Le>0)return"";const Ee=rt(re);return F`<rect
                  class="placeholder-bar"
                  data-testid="boiler-power-placeholder"
                  data-estimated-power="true"
                  x="${(Ee-2).toFixed(2)}" y="99" width="4" height="2"
                />`})}

              ${A!=null?F`<polyline class="temp-line" points="${A}" />`:""}

              ${F`<line
                class="now-marker"
                data-testid="boiler-now-marker"
                data-now-time="${a}"
                data-now-x="${ai(n)}"
                x1="${ai(n)}" y1="0"
                x2="${ai(n)}" y2="${li}"
              />`}
              ${F`<text x="${(n+3).toFixed(2)}" y="12" font-size="8" fill="#60a5fa">TEĎ</text>`}
            </svg>
          </div>

          <div class="timeline-axis">
            ${X.map(C=>c`<span>${C}</span>`)}
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
            ${Pe?c`<span class="degraded-chip">⚠ Ceny: stará data</span>`:""}
            ${Ne?c`<span class="degraded-chip">⚠ FVE predikce: stará data</span>`:""}
          </div>
        </div>
      </div>
    `}_buildTempPointsFromTimeline(e,t){const i=[],r=t+Et*6e4;for(const n of e)try{if(n.topTempC==null||!isFinite(n.topTempC))continue;const a=Date.parse(n.timestamp);if(!isFinite(a)||a<t||a>r)continue;const o=(a-t)/6e4;i.push({x:rt(o),y:oa(n.topTempC)})}catch{continue}return i}_buildTempPointsFromSlots(e,t){const i=[],r=t+Et*6e4;for(const n of e)try{const a=n.expectedTempTopC;if(a==null||!isFinite(a))continue;const o=Date.parse(n.start);if(!isFinite(o)||o<t||o>r)continue;const l=(o-t)/6e4;i.push({x:rt(l),y:oa(a)})}catch{continue}return i}_buildPowerBarsFromSlots(e,t){const i=[],r=t+Et*6e4;for(let n=0;n<e.length;n++){const a=e[n];try{const o=Date.parse(a.start);if(!isFinite(o)||o<t||o>r)continue;const l=(o-t)/6e4,d=rt(l),p=(a.pvKwh??0)+(a.gridKwh??0)+(a.altKwh??0);if(p<=0)continue;const u=p*4,m=Math.min(u,Pt)/Pt*it;i.push({x:d,barH:m,isCharge:!0,isEstimated:!1})}catch{continue}}return i}_buildPlanBands(e,t){if(!e.length)return[];const i=[],r=t+Et*6e4,n=[];for(const o of e)try{const l=Date.parse(o.start),d=Date.parse(o.end);if(!isFinite(l)||!isFinite(d)||d<=t||l>=r)continue;const p=Math.max(l,t),u=Math.min(d,r);if(u<=p)continue;n.push({...o,start:new Date(p).toISOString(),end:new Date(u).toISOString()})}catch{continue}const a=M2(n);for(const o of a)try{const l=Date.parse(o.start),d=Date.parse(o.end);if(!isFinite(l)||!isFinite(d))continue;const p=rt((l-t)/6e4),u=rt((d-t)/6e4);if(u<=p)continue;i.push({x1:p,x2:u,source:o.recommendedSource,heating:(o.heatingKwh??0)>0})}catch{continue}return i}_buildPowerBars(e,t,i,r){const n=[],a=i+Et*6e4;for(const o of e)try{const l=Date.parse(o.timestamp);if(!isFinite(l)||l<i||l>a)continue;const d=(l-i)/6e4,p=rt(d);if(o.powerKw!==null&&isFinite(o.powerKw)){const u=Math.max(-Pt,Math.min(Pt,o.powerKw));if(Math.abs(u)<.001)continue;const h=Math.abs(u)/Pt*it;n.push({x:p,barH:h,isCharge:u>0,isEstimated:!1})}else{const u=is(l,t,r);if(u!==null){const h=rs(u,r);if(h!==null&&h>0){const m=u.key==="discharge",f=Math.min(h,Pt)/Pt*it;n.push({x:p,barH:f,isCharge:!m,isEstimated:!0})}}}}catch{continue}return n}};bt.styles=T`
    :host {
      display: block;
      font-family: ${na(s.fontFamily)};
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
      color: ${na(s.textPrimary)};
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
      color: ${na(s.textSecondary)};
      font-style: italic;
    }

    @media (max-width: 599px) {
      :host { font-size: 12px; }
    }
  `;Vi([g({type:Object})],bt.prototype,"data",2);Vi([g({type:Object})],bt.prototype,"config",2);Vi([g({type:String})],bt.prototype,"lang",2);Vi([g({type:Number})],bt.prototype,"nowMs",2);Vi([g({type:String})],bt.prototype,"timeZone",2);bt=Vi([E("oig-boiler-timeline-chart")],bt);var A2=Object.defineProperty,L2=Object.getOwnPropertyDescriptor,Se=(e,t,i,r)=>{for(var n=r>1?void 0:r?L2(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&A2(t,i,n),n};const zt=Q,Hn=T`
  .selector-label {
    font-size: 12px;
    color: ${zt(s.textSecondary)};
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
    border: 2px solid ${zt(s.divider)};
    background: ${zt(s.bgSecondary)};
    color: ${zt(s.textPrimary)};
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .mode-btn:hover:not(:disabled):not(.active) {
    border-color: ${zt(s.accent)};
  }

  .mode-btn.active {
    background: ${zt(s.accent)};
    border-color: ${zt(s.accent)};
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
`;let _i=class extends D{constructor(){super(...arguments),this.value="home_1",this.disabled=!1,this.buttonStates={home_1:"idle",home_2:"idle",home_3:"idle",home_ups:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("mode-change",{detail:{mode:e},bubbles:!0}))}render(){return c`
      <div class="selector-label">
        Re\u017Eim st\u0159\u00EDda\u010De
      </div>
      <div class="mode-buttons">
        ${["home_1","home_2","home_3","home_ups"].map(t=>{const i=this.buttonStates[t],r=this.disabled||i==="pending"||i==="processing"||i==="disabled-by-service";return c`
            <button
              class="mode-btn ${i}"
              ?disabled=${r}
              @click=${()=>this.onModeClick(t)}
            >
              ${fs[t]}
              ${i==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};_i.styles=[Hn];Se([g({type:String})],_i.prototype,"value",2);Se([g({type:Boolean})],_i.prototype,"disabled",2);Se([g({type:Object})],_i.prototype,"buttonStates",2);_i=Se([E("oig-box-mode-selector")],_i);let ft=class extends D{constructor(){super(...arguments),this.value="off",this.limit=0,this.disabled=!1,this.pendingTarget=null,this.buttonStates={off:"idle",on:"idle",limited:"idle"}}onDeliveryClick(e){const t=this.buttonStates[e];this.disabled||t==="pending"||t==="processing"||t==="disabled-by-service"||t==="active"&&e!=="limited"||this.dispatchEvent(new CustomEvent("delivery-change",{detail:{value:e,limit:e==="limited"?this.limit:null},bubbles:!0}))}render(){const e=[{value:"off",label:Qi.off},{value:"on",label:Qi.on},{value:"limited",label:Qi.limited}],i=this.pendingTarget!==null&&this.pendingTarget!==this.value?c`<span class="status-text transitioning">\u23F3\u00A0${Qi[this.pendingTarget]}</span>`:null;return c`
      <div class="selector-label">
        Dod\u00E1vka do s\u00EDt\u011B ${i}
      </div>
      <div class="mode-buttons">
        ${e.map(r=>{const n=this.buttonStates[r.value],a=r.value===this.value,o=r.value===this.pendingTarget&&!a,l=this.disabled||n==="pending"||n==="processing"||n==="disabled-by-service",d=a&&n==="disabled-by-service"?"active disabled-by-service":o?`${n} pending-target`:n;return c`
            <button
              class="mode-btn ${d}"
              ?disabled=${l}
              @click=${()=>this.onDeliveryClick(r.value)}
            >
              ${r.label}
              ${n==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${n==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};ft.styles=[Hn,T`
      .mode-btn.pending-target {
        border-color: #ffc107;
        color: #ffc107;
        background: rgba(255, 193, 7, 0.08);
      }
    `];Se([g({type:String})],ft.prototype,"value",2);Se([g({type:Number})],ft.prototype,"limit",2);Se([g({type:Boolean})],ft.prototype,"disabled",2);Se([g({type:String})],ft.prototype,"pendingTarget",2);Se([g({type:Object})],ft.prototype,"buttonStates",2);ft=Se([E("oig-grid-delivery-selector")],ft);let $i=class extends D{constructor(){super(...arguments),this.value="cbb",this.disabled=!1,this.buttonStates={cbb:"idle",manual:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("boiler-mode-change",{detail:{mode:e},bubbles:!0}))}render(){return c`
      <div class="selector-label">
        Re\u017Eim bojleru
      </div>
      <div class="mode-buttons">
        ${["cbb","manual"].map(t=>{const i=this.buttonStates[t],r=this.disabled||i==="pending"||i==="processing"||i==="disabled-by-service";return c`
            <button
              class="mode-btn ${i}"
              ?disabled=${r}
              @click=${()=>this.onModeClick(t)}
            >
              ${ys[t]} ${vs[t]}
              ${i==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};$i.styles=[Hn];Se([g({type:String})],$i.prototype,"value",2);Se([g({type:Boolean})],$i.prototype,"disabled",2);Se([g({type:Object})],$i.prototype,"buttonStates",2);$i=Se([E("oig-boiler-mode-selector")],$i);let vt=class extends D{constructor(){super(...arguments),this.homeGridV=!1,this.homeGridVi=!1,this.flexibilita=!1,this.available=!1,this.disabled=!1}getButtonClass(e){return e&&this.disabled?"active disabled-by-service":e?"active":this.disabled?"disabled-by-service":"idle"}onToggleClick(e){this.disabled||this.dispatchEvent(new CustomEvent("supplementary-toggle",{detail:{key:e},bubbles:!0}))}render(){const e=this.getButtonClass(this.homeGridV),t=this.getButtonClass(this.homeGridVi),i=this.flexibilita?c`<span class="flexibilita-badge">\u26A1 Flexibilita</span>`:"";return c`
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
          ${this.homeGridV&&!this.disabled?c`<span style="font-size:10px"> \u2713</span>`:""}
        </button>
        <button
          class="mode-btn ${t}"
          ?disabled=${this.disabled}
          @click=${()=>this.onToggleClick("home_grid_vi")}
        >
          Home 6
          ${this.homeGridVi&&!this.disabled?c`<span style="font-size:10px"> \u2713</span>`:""}
        </button>
      </div>
    `}};vt.styles=[Hn,T`
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
    `];Se([g({type:Boolean})],vt.prototype,"homeGridV",2);Se([g({type:Boolean})],vt.prototype,"homeGridVi",2);Se([g({type:Boolean})],vt.prototype,"flexibilita",2);Se([g({type:Boolean})],vt.prototype,"available",2);Se([g({type:Boolean})],vt.prototype,"disabled",2);vt=Se([E("oig-supplementary-selector")],vt);function H2(e){const t=!e.available||e.flexibilita;return e.available?{home_grid_v:e.home_grid_v,home_grid_vi:e.home_grid_vi,flexibilita:e.flexibilita,available:e.available,disabled:t}:{home_grid_v:!1,home_grid_vi:!1,flexibilita:e.flexibilita,available:!1,disabled:!0}}var V2=Object.defineProperty,T2=Object.getOwnPropertyDescriptor,Ti=(e,t,i,r)=>{for(var n=r>1?void 0:r?T2(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&V2(t,i,n),n};const Be=Q;let yt=class extends D{constructor(){super(...arguments),this.items=[],this.expanded=!1,this.shieldStatus="idle",this.queueCount=0,this._now=Date.now(),this.updateInterval=null}connectedCallback(){super.connectedCallback(),this.updateInterval=window.setInterval(()=>{this._now=Date.now()},1e3)}disconnectedCallback(){super.disconnectedCallback(),this.updateInterval!==null&&clearInterval(this.updateInterval)}toggleExpanded(){this.expanded=!this.expanded}removeItem(e,t){t.stopPropagation(),this.dispatchEvent(new CustomEvent("remove-item",{detail:{position:e},bubbles:!0}))}formatServiceName(e,t){return t==="supplementary_toggle"?"⚙️ Změna doplňkového režimu":tc[e]||e||"N/A"}stripCurrentSuffix(e){const i=e.indexOf("(nyní:");return i===-1?e.trim():e.slice(0,i).trim()}formatChanges(e){return!e||e.length===0?"N/A":e.map(t=>{const i=t.indexOf("→");if(i===-1)return t;const r=t.slice(0,i).trim(),n=t.slice(i+1).trim(),a=r.indexOf(":"),o=a===-1?r:r.slice(a+1),l=r.includes("prm2_app")?xs:ic,d=o.replaceAll("'","").trim(),p=this.stripCurrentSuffix(n).replaceAll("'","").trim(),u=l[d]||d,h=l[p]||p;return`${u} → ${h}`}).join(", ")}formatTimestamp(e){if(!e)return{time:"--",duration:"--"};try{const t=new Date(e);if(isNaN(t.getTime()))return{time:"--",duration:"--"};const i=new Date(this._now),r=Math.floor((i.getTime()-t.getTime())/1e3),n=String(t.getHours()).padStart(2,"0"),a=String(t.getMinutes()).padStart(2,"0");let o=`${n}:${a}`;if(t.toDateString()!==i.toDateString()){const d=t.getDate(),p=t.getMonth()+1;o=`${d}.${p}. ${o}`}let l;if(r<60)l=`${r}s`;else if(r<3600){const d=Math.floor(r/60),p=r%60;l=`${d}m ${p}s`}else{const d=Math.floor(r/3600),p=Math.floor(r%3600/60);l=`${d}h ${p}m`}return{time:o,duration:l}}catch{return{time:"--",duration:"--"}}}get activeCount(){return this.items.length}render(){this._now;const e=this.shieldStatus==="running"?"running":"idle",t=this.shieldStatus==="running"?"🔄 Zpracovává":"✓ Připraveno";return c`
      <div class="queue-header" @click=${this.toggleExpanded}>
        <div class="queue-title-area">
          <span class="queue-title">Shield fronta</span>
          ${this.activeCount>0?c`
            <span class="queue-count">(${this.activeCount} aktivn\u00EDch)</span>
          `:w}
          <span class="shield-status ${e}">${t}</span>
        </div>
        <span class="queue-toggle ${this.expanded?"expanded":""}">\u25BC</span>
      </div>

      ${this.expanded?c`
        <div class="queue-content">
          ${this.items.length===0?c`
            <div class="empty-state">\u2705 Fronta je pr\u00E1zdn\u00E1</div>
          `:c`
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
      `:w}
    `}renderRow(e,t){const i=e.status==="running",{time:r,duration:n}=this.formatTimestamp(e.createdAt);return c`
      <tr>
        <td class="${i?"status-running":"status-queued"}">
          ${i?"🔄 Zpracovává se":"⏳ Čeká"}
        </td>
        <td>${this.formatServiceName(e.service,e.type)}</td>
        <td class="hide-mobile" style="font-size: 11px;">${this.formatChanges(e.changes)}</td>
        <td class="queue-time">${r}</td>
        <td class="queue-time duration">${n}</td>
        <td style="text-align: center;">
          ${i?c`<span style="opacity: 0.4;">\u2014</span>`:c`
            <button
              class="remove-btn"
              title="Odstranit z fronty"
              @click=${a=>this.removeItem(e.position,a)}
            >\uD83D\uDDD1\uFE0F</button>
          `}
        </td>
      </tr>
    `}};yt.styles=T`
    :host {
      display: block;
      background: ${Be(s.cardBg)};
      border-radius: 12px;
      box-shadow: ${Be(s.cardShadow)};
      overflow: hidden;
    }

    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: ${Be(s.bgSecondary)};
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
      color: ${Be(s.textPrimary)};
    }

    .queue-count {
      font-size: 12px;
      color: ${Be(s.textSecondary)};
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
      color: ${Be(s.accent)};
      transition: transform 0.2s;
    }

    .queue-toggle.expanded {
      transform: rotate(180deg);
    }

    .queue-content {
      padding: 0;
      border-top: 1px solid ${Be(s.divider)};
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
      color: ${Be(s.textSecondary)};
      border-bottom: 1px solid ${Be(s.divider)};
      background: ${Be(s.bgSecondary)};
    }

    .queue-table td {
      padding: 8px 12px;
      color: ${Be(s.textPrimary)};
      border-bottom: 1px solid ${Be(s.divider)};
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
      color: ${Be(s.textSecondary)};
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
  `;Ti([g({type:Array})],yt.prototype,"items",2);Ti([g({type:Boolean})],yt.prototype,"expanded",2);Ti([g({type:String})],yt.prototype,"shieldStatus",2);Ti([g({type:Number})],yt.prototype,"queueCount",2);Ti([H()],yt.prototype,"_now",2);yt=Ti([E("oig-shield-queue")],yt);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const P2={CHILD:2},z2=e=>(...t)=>({_$litDirective$:e,values:t});class D2{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,r){this._$Ct=t,this._$AM=i,this._$Ci=r}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class wa extends D2{constructor(t){if(super(t),this.it=w,t.type!==P2.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===w||t==null)return this._t=void 0,this.it=t;if(t===Sl)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}}wa.directiveName="unsafeHTML",wa.resultType=1;const E2=z2(wa);var O2=Object.defineProperty,F2=Object.getOwnPropertyDescriptor,$r=(e,t,i,r)=>{for(var n=r>1?void 0:r?F2(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&O2(t,i,n),n};const ze=Q;let Zt=class extends D{constructor(){super(...arguments),this.open=!1,this.config={title:"",message:""},this.acknowledged=!1,this.limitValue=5e3,this.resolver=null,this.onOverlayClick=()=>{this.closeDialog({confirmed:!1})},this.onDialogClick=e=>{e.stopPropagation()},this.onKeyDown=e=>{e.key==="Escape"&&this.open&&this.closeDialog({confirmed:!1})},this.onAckChange=e=>{this.acknowledged=e.target.checked},this.onLimitInput=e=>{this.limitValue=parseInt(e.target.value,10)||0},this.onCancel=()=>{this.closeDialog({confirmed:!1})},this.onConfirm=()=>{const e=this.config.showLimitInput||this.config.limitOnly;if(e){const t=this.config.limitMin??1,i=this.config.limitMax??2e4;if(isNaN(this.limitValue)||this.limitValue<t||this.limitValue>i)return}this.closeDialog({confirmed:!0,limit:e?this.limitValue:void 0})}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeyDown)}showDialog(e){return this.config=e,this.acknowledged=!1,this.limitValue=e.limitValue??5e3,this.open=!0,new Promise(t=>{this.resolver=t})}closeDialog(e){var t;this.open=!1,(t=this.resolver)==null||t.call(this,e),this.resolver=null}get canConfirm(){return!(this.config.requireAcknowledgement&&!this.acknowledged)}render(){if(!this.open)return w;const e=this.config;return e.limitOnly?c`
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
      `:c`
      <div @click=${this.onOverlayClick}>
        <div class="dialog" @click=${this.onDialogClick}>
          <div class="dialog-header">
            ${e.title}
          </div>

          <div class="dialog-body">
            ${this.renderHTML(e.message)}
          </div>

          ${e.showLimitInput?c`
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
          `:w}

          ${e.warning?c`
            <div class="dialog-warning">
              \u26A0\uFE0F ${this.renderHTML(e.warning)}
            </div>
          `:w}

          ${e.requireAcknowledgement?c`
            <div class="ack-wrapper" @click=${()=>{this.acknowledged=!this.acknowledged}}>
              <input
                type="checkbox"
                .checked=${this.acknowledged}
                @change=${this.onAckChange}
                @click=${t=>t.stopPropagation()}
              />
              <label>
                ${e.acknowledgementText?this.renderHTML(e.acknowledgementText):c`
                  <strong>Souhlas\u00EDm</strong> s t\u00EDm, \u017Ee m\u011Bn\u00EDm nastaven\u00ED na vlastn\u00ED odpov\u011Bdnost.
                  Aplikace nenese odpov\u011Bdnost za p\u0159\u00EDpadn\u00E9 negativn\u00ED d\u016Fsledky t\u00E9to zm\u011Bny.
                `}
              </label>
            </div>
          `:w}

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
    `}renderHTML(e){return E2(e)}};Zt.styles=T`
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
      background: ${ze(s.cardBgSolid)};
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
      color: ${ze(s.textPrimary)};
      border-bottom: 1px solid ${ze(s.divider)};
    }

    .dialog-body {
      padding: 16px 20px;
      font-size: 14px;
      line-height: 1.5;
      color: ${ze(s.textPrimary)};
    }

    .dialog-warning {
      margin: 0 20px 12px;
      padding: 10px 14px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      font-size: 13px;
      color: ${ze(s.textPrimary)};
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
      background: ${ze(s.bgSecondary)};
      border-radius: 8px;
      cursor: pointer;
    }

    .ack-wrapper input[type="checkbox"] {
      margin-top: 2px;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${ze(s.accent)};
    }

    .ack-wrapper label {
      font-size: 13px;
      line-height: 1.4;
      color: ${ze(s.textPrimary)};
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
      color: ${ze(s.textPrimary)};
    }

    .limit-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid ${ze(s.divider)};
      border-radius: 8px;
      font-size: 14px;
      background: ${ze(s.bgPrimary)};
      color: ${ze(s.textPrimary)};
      box-sizing: border-box;
    }

    .limit-hint {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      opacity: 0.7;
      color: ${ze(s.textSecondary)};
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
      background: ${ze(s.bgSecondary)};
      color: ${ze(s.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${ze(s.divider)};
    }

    .btn-confirm {
      background: ${ze(s.accent)};
      color: #fff;
    }

    .btn-confirm:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-confirm:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;$r([g({type:Boolean,reflect:!0})],Zt.prototype,"open",2);$r([g({type:Object})],Zt.prototype,"config",2);$r([H()],Zt.prototype,"acknowledged",2);$r([H()],Zt.prototype,"limitValue",2);Zt=$r([E("oig-confirm-dialog")],Zt);var I2=Object.defineProperty,B2=Object.getOwnPropertyDescriptor,al=(e,t,i,r)=>{for(var n=r>1?void 0:r?B2(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&I2(t,i,n),n};const Gi=Q;let fn=class extends D{constructor(){super(...arguments),this.shieldState=null}render(){if(!this.shieldState)return w;const e=this.determineStatus(this.shieldState),t=e.toLowerCase(),i=this.getStatusIcon(e),r=this.getStatusLabel(e),a=this.shieldState.queueCount>0?"has-items":"";return c`
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
          <span class="shield-status-badge ${t}">${r}</span>
        </div>
      </div>
    `}determineStatus(e){return e.status==="running"?"processing":e.queueCount>0?"pending":"idle"}getStatusIcon(e){switch(e){case"idle":return"✓";case"pending":return"⏳";case"processing":return"🔄";default:return"✓"}}getStatusLabel(e){switch(e){case"idle":return"Připraveno";case"pending":return"Čeká";case"processing":return"Zpracovává";default:return"Neznámý"}}getActivityText(){return this.shieldState?this.shieldState.activity?this.shieldState.activity:this.shieldState.queueCount>0?`${this.shieldState.queueCount} operací ve frontě`:"Systém připraven":"Žádná aktivita"}};fn.styles=T`
    :host {
      display: block;
      padding: 16px 20px;
      border-top: 1px solid ${Gi(s.divider)};
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
      color: ${Gi(s.textPrimary)};
    }

    .shield-status-subtitle {
      font-size: 11px;
      color: ${Gi(s.textSecondary)};
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
      background: ${Gi(s.bgSecondary)};
      color: ${Gi(s.textSecondary)};
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
  `;al([g({type:Object})],fn.prototype,"shieldState",2);fn=al([E("oig-shield-status")],fn);var N2=Object.defineProperty,j2=Object.getOwnPropertyDescriptor,kr=(e,t,i,r)=>{for(var n=r>1?void 0:r?j2(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&N2(t,i,n),n};const oi=Q;let Kt=class extends D{constructor(){super(...arguments),this.boxHasHome56=!1,this.embedded=!1,this.shieldState={...ws,pendingServices:new Map,changingServices:new Set},this._confirmDialogOverride=null,this.unsubscribe=null,this.onShieldUpdate=e=>{this.shieldState=e}}get confirmDialog(){return this._confirmDialogOverride??this._confirmDialogQuery}set confirmDialog(e){this._confirmDialogOverride=e}connectedCallback(){super.connectedCallback(),this.unsubscribe=de.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.unsubscribe)==null||e.call(this),this.unsubscribe=null}get boxModeButtonStates(){return{home_1:de.getBoxModeButtonState("home_1"),home_2:de.getBoxModeButtonState("home_2"),home_3:de.getBoxModeButtonState("home_3"),home_ups:de.getBoxModeButtonState("home_ups")}}get gridDeliveryButtonStates(){return{off:de.getGridDeliveryButtonState("off"),on:de.getGridDeliveryButtonState("on"),limited:de.getGridDeliveryButtonState("limited")}}get boilerModeButtonStates(){return{cbb:de.getBoilerModeButtonState("cbb"),manual:de.getBoilerModeButtonState("manual")}}get supplementaryView(){return H2(this.shieldState.supplementary)}async onBoxModeChange(e){const{mode:t}=e.detail,i=fs[t];if(L.debug("Control panel: box mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu střídače",message:`Chystáte se změnit režim boxu na <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování celého systému a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!de.shouldProceedWithQueue())return;await de.setBoxMode(t)||L.warn("Box mode change failed or already active",{mode:t})}async onGridDeliveryChange(e){const{value:t,limit:i}=e.detail,r=Qi[t],n=ec[t],a=t==="limited",o=this.shieldState.gridDeliveryState.currentLiveLimit??5e3;L.debug("Control panel: grid delivery change requested",{delivery:t,limit:i});const l=this.shieldState.gridDeliveryState.currentLiveDelivery;if(!this.shieldState.gridDeliveryState.isTransitioning&&l==="limited"&&t==="limited"){const v={title:"🚰 Změnit limit přetoků",message:"",limitOnly:!0,showLimitInput:!0,limitValue:o,limitMin:1,limitMax:2e4,limitStep:100,confirmText:"Uložit limit",cancelText:"Zrušit"},f=await this.confirmDialog.showDialog(v);if(!f.confirmed||!de.shouldProceedWithQueue())return;await de.setGridDelivery("limited",f.limit);return}const p={title:`${n} Změna dodávky do sítě`,message:`Chystáte se změnit dodávku do sítě na: <strong>"${r}"</strong>`,warning:a?"Režim a limit budou změněny postupně (serializováno). Každá změna může trvat až 10 minut.":"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,acknowledgementText:"<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost. Aplikace nenese odpovědnost za případné negativní důsledky této změny.",confirmText:"Potvrdit změnu",cancelText:"Zrušit",showLimitInput:a,limitValue:o,limitMin:1,limitMax:2e4,limitStep:100},u=await this.confirmDialog.showDialog(p);if(!u.confirmed||!de.shouldProceedWithQueue())return;const h=this.shieldState.gridDeliveryState.currentLiveDelivery==="limited",m=t==="limited";h&&m&&u.limit!=null?await de.setGridDelivery(t,u.limit):m&&u.limit!=null?await de.setGridDelivery(t,u.limit):await de.setGridDelivery(t)}async onBoilerModeChange(e){const{mode:t}=e.detail,i=vs[t],r=ys[t];if(L.debug("Control panel: boiler mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu bojleru",message:`Chystáte se změnit režim bojleru na <strong>"${r} ${i}"</strong>.<br><br>Tato změna ovlivní chování ohřevu vody a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!de.shouldProceedWithQueue())return;await de.setBoilerMode(t)||L.warn("Boiler mode change failed or already active",{mode:t})}async onSupplementaryToggle(e){const{key:t}=e.detail,i=t==="home_grid_v"?"Home 5":"Home 6",r=!this.shieldState.supplementary[t];if(L.debug("Control panel: supplementary toggle requested",{key:t}),!(await this.confirmDialog.showDialog({title:"Změna doplňkového režimu",message:`Chystáte se přepnout <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování systému a může trvat až 10 minut.`,warning:"Změna může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!de.shouldProceedWithQueue())return;await de.setSupplementaryToggle(t,r)||L.warn("Supplementary toggle failed",{key:t})}async onQueueRemoveItem(e){const{position:t}=e.detail;L.debug("Control panel: queue remove requested",{position:t});const i=this.shieldState.allRequests.find(o=>o.position===t);let r="Operace";if(i&&(i.service.includes("set_box_mode")?r=`Změna režimu na ${i.targetValue||"neznámý"}`:i.service.includes("set_grid_delivery")?r=`Změna dodávky do sítě na ${i.targetValue||"neznámý"}`:i.service.includes("set_boiler_mode")&&(r=`Změna režimu bojleru na ${i.targetValue||"neznámý"}`)),!(await this.confirmDialog.showDialog({title:r,message:"Operace bude odstraněna z fronty bez provedení.",requireAcknowledgement:!1,confirmText:"OK",cancelText:"Zrušit"})).confirmed)return;await de.removeFromQueue(t)||L.warn("Failed to remove from queue",{position:t})}render(){const e=this.shieldState,t=e.status==="running"?"running":"idle",i=e.status==="running"?"Zpracovává":"Připraveno",r=e.allRequests.length>0;return c`
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
          ${this.boxHasHome56?c`
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
          `:w}

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
        ${r?c`
          <div class="queue-section">
            <oig-shield-queue
              .items=${e.allRequests}
              .shieldStatus=${e.status}
              .queueCount=${e.queueCount}
              .expanded=${!1}
              @remove-item=${this.onQueueRemoveItem}
            ></oig-shield-queue>
          </div>
        `:w}
      </div>

      <!-- Shared confirm dialog instance -->
      <oig-confirm-dialog></oig-confirm-dialog>
    `}};Kt.styles=T`
    :host {
      display: block;
      margin-top: 16px;
    }

    .control-panel {
      background: ${oi(s.cardBg)};
      border-radius: 16px;
      box-shadow: ${oi(s.cardShadow)};
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
      border-bottom: 1px solid ${oi(s.divider)};
    }

    .panel-title {
      font-size: 15px;
      font-weight: 600;
      color: ${oi(s.textPrimary)};
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
      background: ${oi(s.divider)};
      margin: 16px 0;
    }

    .queue-section {
      border-top: 1px solid ${oi(s.divider)};
    }

    @media (max-width: 480px) {
      .panel-body {
        padding: 12px 14px;
      }
    }
  `;kr([g({type:Boolean})],Kt.prototype,"boxHasHome56",2);kr([g({type:Boolean,reflect:!0})],Kt.prototype,"embedded",2);kr([H()],Kt.prototype,"shieldState",2);kr([$n("oig-confirm-dialog")],Kt.prototype,"_confirmDialogQuery",2);Kt=kr([E("oig-control-panel")],Kt);var R2=Object.defineProperty,W2=Object.getOwnPropertyDescriptor,Pi=(e,t,i,r)=>{for(var n=r>1?void 0:r?W2(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&R2(t,i,n),n};const Oe=Q;let xt=class extends D{constructor(){super(...arguments),this.open=!1,this.currentSoc=0,this.maxSoc=100,this.estimate=null,this.targetSoc=80}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onSliderInput(e){this.targetSoc=parseInt(e.target.value,10),this.dispatchEvent(new CustomEvent("soc-change",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}onConfirm(){this.dispatchEvent(new CustomEvent("confirm",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}render(){return c`
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
          
          ${this.estimate?c`
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
    `}};xt.styles=T`
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
      background: ${Oe(s.cardBgSolid)};
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
      color: ${Oe(s.textPrimary)};
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
      color: ${Oe(s.textSecondary)};
    }

    .soc-value {
      font-size: 24px;
      font-weight: 600;
      color: ${Oe(s.textPrimary)};
    }

    .soc-arrow {
      font-size: 20px;
      color: ${Oe(s.textSecondary)};
    }

    .slider-container {
      margin: 16px 0;
    }

    .slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: ${Oe(s.bgSecondary)};
      -webkit-appearance: none;
      appearance: none;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${Oe(s.accent)};
      cursor: pointer;
    }

    .estimate {
      background: ${Oe(s.bgSecondary)};
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
      color: ${Oe(s.textSecondary)};
    }

    .estimate-value {
      color: ${Oe(s.textPrimary)};
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
      background: ${Oe(s.bgSecondary)};
      color: ${Oe(s.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${Oe(s.divider)};
    }

    .btn-confirm {
      background: ${Oe(s.accent)};
      color: #fff;
    }

    .btn-confirm:hover {
      opacity: 0.9;
    }
  `;Pi([g({type:Boolean})],xt.prototype,"open",2);Pi([g({type:Number})],xt.prototype,"currentSoc",2);Pi([g({type:Number})],xt.prototype,"maxSoc",2);Pi([g({type:Object})],xt.prototype,"estimate",2);Pi([H()],xt.prototype,"targetSoc",2);xt=Pi([E("oig-battery-charge-dialog")],xt);var Z2=Object.defineProperty,K2=Object.getOwnPropertyDescriptor,qe=(e,t,i,r)=>{for(var n=r>1?void 0:r?K2(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Z2(t,i,n),n};function pi(e){return e==null||Number.isNaN(e)?"-- kWh":`${e.toFixed(Math.abs(e)>=10?1:2)} kWh`}const sa=Q,Da=T`
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
`;let hr=class extends D{constructor(){super(...arguments),this.title="",this.icon="📊"}render(){return c`
      <div class="block-header">
        <span class="block-icon">${this.icon}</span>
        <span class="block-title">${this.title}</span>
      </div>
      <slot></slot>
    `}};hr.styles=T`
    :host {
      display: block;
      background: ${sa(s.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${sa(s.cardShadow)};
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
      color: ${sa(s.textPrimary)};
    }

    ${Da}
  `;qe([g({type:String})],hr.prototype,"title",2);qe([g({type:String})],hr.prototype,"icon",2);hr=qe([E("oig-analytics-block")],hr);let vn=class extends D{constructor(){super(...arguments),this.data=null}render(){if(!this.data)return c`<div>Načítání...</div>`;const e=this.data.trend>=0?"positive":"negative",t=this.data.trend>=0?"+":"",i=this.data.period==="last_month"?"Minulý měsíc":`Aktuální měsíc (${this.data.currentMonthDays} dní)`;return c`
      <div class="efficiency-value">${di(this.data.efficiency,1)}</div>
      <div class="period-label"
        title="Coulombická (DC) účinnost článků baterie. Celková AC účinnost vč. střídače, se kterou počítá ekonomika plánovače, je ~84 %.">
        ${i} · DC (články)
      </div>

      ${this.data.trend!==0?c`
        <div class="comparison ${e}">
          ${t}${di(this.data.trend)} vs minulý měsíc
        </div>
      `:null}

      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${pi(this.data.charged)}</div>
          <div class="stat-label">Nabito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${pi(this.data.discharged)}</div>
          <div class="stat-label">Vybito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${pi(this.data.losses)}</div>
          <div class="stat-label">Ztráty</div>
          ${this.data.lossesPct?c`
            <div class="losses-pct">${di(this.data.lossesPct,1)}</div>
          `:null}
        </div>
      </div>
    `}};vn.styles=T`
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
  `;qe([g({type:Object})],vn.prototype,"data",2);vn=qe([E("oig-battery-efficiency")],vn);let yn=class extends D{constructor(){super(...arguments),this.data=null}renderSparkline(){var d;const e=(d=this.data)==null?void 0:d.measurementHistory;if(!e||e.length<2)return null;const t=e.map(p=>p.soh_percent),i=Math.min(...t)-1,n=Math.max(...t)+1-i||1,a=200,o=40,l=t.map((p,u)=>{const h=u/(t.length-1)*a,m=o-(p-i)/n*o;return`${h},${m}`}).join(" ");return c`
      <div class="sparkline-container">
        <svg viewBox="0 0 ${a} ${o}" preserveAspectRatio="none">
          <polyline
            points="${l}"
            fill="none"
            stroke="#4caf50"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
    `}render(){return this.data?c`
      <oig-analytics-block title="Zdraví baterie" icon="❤️">
        <span class="status-badge ${this.data.status}">${this.data.statusLabel}</span>

        ${this.renderSparkline()}

        <div class="metric">
          <span class="metric-label">State of Health</span>
          <span class="metric-value">${di(this.data.soh,1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Kapacita (P80)</span>
          <span class="metric-value">${pi(this.data.capacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Min. kapacita (P20)</span>
          <span class="metric-value">${pi(this.data.minCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Nominální kapacita</span>
          <span class="metric-value">${pi(this.data.nominalCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Počet měření</span>
          <span class="metric-value">${this.data.measurementCount}</span>
        </div>
        ${this.data.qualityScore!=null?c`
          <div class="metric">
            <span class="metric-label">Kvalita dat</span>
            <span class="metric-value">${di(this.data.qualityScore,0)}</span>
          </div>
        `:null}

        ${this.data.degradation3m!=null||this.data.degradation6m!=null||this.data.degradation12m!=null?c`
          <div class="degradation-section">
            <div class="section-label">Degradace</div>
            ${this.data.degradation3m!=null?c`
              <div class="metric">
                <span class="metric-label">3 měsíce</span>
                <span class="metric-value ${this.data.degradation3m>0?"negative":""}">${this.data.degradation3m.toFixed(2)} %</span>
              </div>
            `:null}
            ${this.data.degradation6m!=null?c`
              <div class="metric">
                <span class="metric-label">6 měsíců</span>
                <span class="metric-value ${this.data.degradation6m>0?"negative":""}">${this.data.degradation6m.toFixed(2)} %</span>
              </div>
            `:null}
            ${this.data.degradation12m!=null?c`
              <div class="metric">
                <span class="metric-label">12 měsíců</span>
                <span class="metric-value ${this.data.degradation12m>0?"negative":""}">${this.data.degradation12m.toFixed(2)} %</span>
              </div>
            `:null}
          </div>
        `:null}

        ${this.data.degradationPerYear!=null||this.data.estimatedEolDate!=null?c`
          <div class="degradation-section">
            <div class="section-label">Predikce</div>
            ${this.data.degradationPerYear!=null?c`
              <div class="prediction">
                Degradace: <span class="prediction-value">${this.data.degradationPerYear.toFixed(2)} %/rok</span>
              </div>
            `:null}
            ${this.data.yearsTo80Pct!=null?c`
              <div class="prediction">
                80% SoH za: <span class="prediction-value">${this.data.yearsTo80Pct.toFixed(1)} let</span>
              </div>
            `:null}
            ${this.data.estimatedEolDate?c`
              <div class="prediction">
                Odhad EOL: <span class="prediction-value">${this.data.estimatedEolDate}</span>
              </div>
            `:null}
            ${this.data.trendConfidence!=null?c`
              <div class="prediction">
                Spolehlivost: <span class="prediction-value">${di(this.data.trendConfidence,0)}</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:c`<div>Načítání...</div>`}};yn.styles=T`
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

    ${Da}

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
  `;qe([g({type:Object})],yn.prototype,"data",2);yn=qe([E("oig-battery-health")],yn);let xn=class extends D{constructor(){super(...arguments),this.data=null}getProgressClass(e){return e==null?"ok":e>=95?"overdue":e>=80?"due-soon":"ok"}statusLabel(e){var i;return{unknown:"Žádné",idle:"Nečinné",charging:"Nabíjení",holding:"Držení 100 %",completed:"Dokončeno"}[(i=e==null?void 0:e.toLowerCase)==null?void 0:i.call(e)]??e}render(){return this.data?!(this.data.lastBalancing&&this.data.lastBalancing!=="—"||this.data.nextScheduled!=null||this.data.progressPercent!=null)&&(this.data.status??"unknown").toLowerCase()==="unknown"?c`
        <oig-analytics-block title="Balancování" icon="⚖️">
          <div class="metric">
            <span class="metric-label">Stav</span>
            <span class="metric-value">Žádné balancování zaznamenáno</span>
          </div>
        </oig-analytics-block>
      `:c`
      <oig-analytics-block title="Balancování" icon="⚖️">
        <div class="metric">
          <span class="metric-label">Stav</span>
          <span class="metric-value">${this.statusLabel(this.data.status)}</span>
        </div>
        ${this.data.lastBalancing&&this.data.lastBalancing!=="—"?c`
          <div class="metric">
            <span class="metric-label">Poslední</span>
            <span class="metric-value">${this.data.lastBalancing}</span>
          </div>
        `:null}
        ${this.data.cost>0?c`
          <div class="metric">
            <span class="metric-label">Náklady</span>
            <span class="metric-value">${ae(this.data.cost)}</span>
          </div>
        `:null}
        ${this.data.nextScheduled?c`
          <div class="metric">
            <span class="metric-label">Plánováno</span>
            <span class="metric-value">${this.data.nextScheduled}</span>
          </div>
        `:null}

        ${this.data.progressPercent!=null?c`
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

        ${this.data.intervalDays!=null?c`
          <div class="metric">
            <span class="metric-label">Interval</span>
            <span class="metric-value">${this.data.intervalDays} dní</span>
          </div>
        `:null}
        ${this.data.estimatedNextCost!=null?c`
          <div class="metric">
            <span class="metric-label">Odhad dalších nákladů</span>
            <span class="metric-value">${ae(this.data.estimatedNextCost)}</span>
          </div>
        `:null}
      </oig-analytics-block>
    `:c`<div>Načítání...</div>`}};xn.styles=T`
    :host { display: block; }
    ${Da}

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
  `;qe([g({type:Object})],xn.prototype,"data",2);xn=qe([E("oig-battery-balancing")],xn);let wn=class extends D{constructor(){super(...arguments),this.data=null}render(){return this.data?c`
      <oig-analytics-block title="Porovnání nákladů" icon="💰">
        <div class="cost-row">
          <span class="cost-label">Skutečné náklady</span>
          <span class="cost-value">${ae(this.data.actualSpent)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Odhad dnes celkem</span>
          <span class="cost-value">${ae(this.data.planTotalCost)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Zbývající plán</span>
          <span class="cost-value">${ae(this.data.futurePlanCost)}</span>
        </div>
        ${this.data.tomorrowCost!=null?c`
          <div class="cost-row">
            <span class="cost-label">Zítra odhad</span>
            <span class="cost-value">${ae(this.data.tomorrowCost)}</span>
          </div>
        `:null}

        ${this.data.yesterdayActualCost!=null?c`
          <div class="yesterday-section">
            <div class="section-label">Včera</div>
            <div class="cost-row">
              <span class="cost-label">Plán</span>
              <span class="cost-value">${this.data.yesterdayPlannedCost!=null?ae(this.data.yesterdayPlannedCost):"—"}</span>
            </div>
            <div class="cost-row">
              <span class="cost-label">Skutečnost</span>
              <span class="cost-value">${ae(this.data.yesterdayActualCost)}</span>
            </div>
            ${this.data.yesterdayDelta!=null?c`
              <div class="cost-row">
                <span class="cost-label">Rozdíl</span>
                <span class="cost-value ${this.data.yesterdayDelta<=0?"delta-positive":"delta-negative"}">
                  ${this.data.yesterdayDelta>=0?"+":""}${ae(this.data.yesterdayDelta)}
                </span>
              </div>
            `:null}
            ${this.data.yesterdayAccuracy!=null?c`
              <div class="cost-row">
                <span class="cost-label">Přesnost</span>
                <span class="cost-value">${this.data.yesterdayAccuracy.toFixed(0)}%</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:c`<div>Načítání...</div>`}};wn.styles=T`
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
  `;qe([g({type:Object})],wn.prototype,"data",2);wn=qe([E("oig-cost-comparison")],wn);var q2=Object.defineProperty,G2=Object.getOwnPropertyDescriptor,Vn=(e,t,i,r)=>{for(var n=r>1?void 0:r?G2(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&q2(t,i,n),n};const pe=Q;let ki=class extends D{constructor(){super(...arguments),this.open=!1,this.weather=tn,this.chmu=en}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}hhmm(e){return e?new Date(e).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}):"—"}dayName(e){return e?new Date(e).toLocaleDateString("cs-CZ",{weekday:"short"}).replace(".",""):"—"}fmtTemp(e){return e!=null?`${Math.round(e)}°`:"—"}fmtDateTime(e){return e?new Date(e).toLocaleString("cs-CZ"):"—"}renderHour(e){const t=e.precipitationProbability;return c`
      <div class="h-cell">
        <span class="h-time">${this.hhmm(e.datetime)}</span>
        <span class="h-icon">${ye(Qr(e.condition))}</span>
        <span class="h-temp">${this.fmtTemp(e.temperature)}</span>
        <span class="h-pop">${t!=null&&t>0?c`💧${Math.round(t)}%`:w}</span>
      </div>
    `}renderDay(e){const t=e.precipitationProbability;return c`
      <div class="d-row">
        <span class="d-day">${this.dayName(e.datetime)}</span>
        <span class="d-icon">${ye(Qr(e.condition))}</span>
        <span class="d-pop">${t!=null&&t>0?c`💧 ${Math.round(t)} %`:w}</span>
        <span class="d-temps"><span class="d-hi">${this.fmtTemp(e.temperature)}</span><span class="d-lo">${this.fmtTemp(e.templow)}</span></span>
      </div>
    `}renderWarning(e){const t=mo[e.severity]??mo[2],i=ud[e.severity]??"Neznámá";return c`
      <div class="warning-item" style="background: ${t}">
        <div class="warning-header">
          <span class="warning-icon">${ye(pd(e.event_type))}</span>
          <span class="warning-type">${e.event_type}</span>
          <span class="warning-level">${i}</span>
          ${e.eta_hours>0?c`<span class="eta-badge">za ${e.eta_hours.toFixed(0)} h</span>`:w}
        </div>
        ${e.description?c`<div class="warning-description">${e.description}</div>`:w}
        ${e.instruction?c`<div class="warning-instruction">${e.instruction}</div>`:w}
        <div class="warning-time">${this.fmtDateTime(e.onset)} — ${this.fmtDateTime(e.expires)}</div>
      </div>
    `}render(){const e=this.weather,t=this.chmu.allWarnings??[],i=t.length>0&&this.chmu.effectiveSeverity>0,r=e.hourly.slice(0,12),n=e.daily.slice(0,6);return c`
      <div class="modal" @click=${a=>a.stopPropagation()}>
        <div class="modal-header">
          <span class="modal-title">
            ${ye("mdi:weather-partly-cloudy")} Počasí a výstrahy
          </span>
          <button class="close-btn" @click=${this.onClose} aria-label="Zavřít">✕</button>
        </div>

        ${e.available?c`
          <div class="now">
            <span class="now-icon">${ye(Qr(e.condition))}</span>
            <div class="now-main">
              <span class="now-temp">${e.temperature!=null?`${Math.round(e.temperature)} ${e.tempUnit}`:"—"}</span>
              <span class="now-label">${bd(e.condition)}</span>
            </div>
            <div class="now-meta">
              ${e.apparentTemperature!=null?c`<span>${ye("mdi:thermometer")} pocitově ${Math.round(e.apparentTemperature)}°</span>`:w}
              ${e.humidity!=null?c`<span>${ye("mdi:water-percent")} ${Math.round(e.humidity)} %</span>`:w}
              ${e.windSpeed!=null?c`<span>${ye("mdi:weather-windy")} ${Math.round(e.windSpeed)} ${e.windUnit}</span>`:w}
            </div>
          </div>

          ${r.length?c`
            <div class="section">
              <div class="section-title">Po hodinách</div>
              <div class="hourly">${r.map(a=>this.renderHour(a))}</div>
            </div>
          `:w}

          ${n.length?c`
            <div class="section">
              <div class="section-title">Další dny</div>
              <div class="daily">${n.map(a=>this.renderDay(a))}</div>
            </div>
          `:w}
        `:c`
          <div class="empty-state">Není nakonfigurována žádná weather entita v Home Assistantu.</div>
        `}

        <div class="section">
          <div class="section-title">ČHMÚ výstrahy</div>
          ${i?t.map(a=>this.renderWarning(a)):c`<div class="no-warn">${ye("mdi:checkbox-marked-circle")} Žádné aktivní výstrahy</div>`}
        </div>
      </div>
    `}};ki.styles=T`
    :host { display: none; }
    :host([open]) {
      display: flex;
      position: fixed; inset: 0;
      background: rgba(0, 0, 0, 0.5);
      align-items: center; justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: ${pe(s.cardBgSolid)};
      border: 1px solid ${pe(s.divider)};
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
      font-size: 17px; font-weight: 700; color: ${pe(s.textPrimary)};
    }
    .modal-title .oig-mdi { color: ${pe(s.accent)}; }
    .close-btn {
      width: 32px; height: 32px; border: none; background: transparent;
      font-size: 18px; cursor: pointer; color: ${pe(s.textSecondary)};
      border-radius: 50%;
    }
    .close-btn:hover { background: ${pe(s.bgSecondary)}; }

    .oig-mdi { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; display: inline-block; }

    /* ── Current conditions ── */
    .now {
      display: flex; align-items: center; gap: 14px;
      padding: 12px 14px; border-radius: 12px;
      background: ${pe(s.bgSecondary)};
      margin-bottom: 16px;
    }
    .now-icon { font-size: 46px; color: ${pe(s.accent)}; display: inline-flex; line-height: 1; }
    .now-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .now-temp { font-size: 30px; font-weight: 800; line-height: 1; color: ${pe(s.textPrimary)}; font-variant-numeric: tabular-nums; }
    .now-label { font-size: 13px; color: ${pe(s.textSecondary)}; }
    .now-meta { margin-left: auto; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: ${pe(s.textSecondary)}; text-align: right; }
    .now-meta span { display: inline-flex; align-items: center; gap: 5px; justify-content: flex-end; }

    /* ── Section ── */
    .section-title {
      font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      color: ${pe(s.textSecondary)}; margin: 0 0 8px;
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
      background: ${pe(s.bgSecondary)};
    }
    .h-time { font-size: 11px; color: ${pe(s.textSecondary)}; font-variant-numeric: tabular-nums; }
    .h-icon { font-size: 20px; color: ${pe(s.accent)}; display: inline-flex; }
    .h-temp { font-size: 13px; font-weight: 700; color: ${pe(s.textPrimary)}; font-variant-numeric: tabular-nums; }
    .h-pop { font-size: 10px; color: #4aa3ff; display: inline-flex; align-items: center; gap: 1px; min-height: 13px; }

    /* ── Daily rows ── */
    .daily { display: flex; flex-direction: column; gap: 2px; }
    .d-row {
      display: grid; grid-template-columns: 42px 24px 1fr auto; align-items: center; gap: 10px;
      padding: 7px 6px; border-radius: 8px;
    }
    .d-row:nth-child(odd) { background: ${pe(s.bgSecondary)}; }
    .d-day { font-size: 13px; font-weight: 600; color: ${pe(s.textPrimary)}; text-transform: capitalize; }
    .d-icon { font-size: 18px; color: ${pe(s.accent)}; display: inline-flex; }
    .d-pop { font-size: 11px; color: #4aa3ff; display: inline-flex; align-items: center; gap: 2px; }
    .d-temps { font-size: 13px; font-variant-numeric: tabular-nums; }
    .d-hi { font-weight: 700; color: ${pe(s.textPrimary)}; }
    .d-lo { color: ${pe(s.textSecondary)}; margin-left: 6px; }

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

    .no-warn { font-size: 12px; color: ${pe(s.textSecondary)}; display: inline-flex; align-items: center; gap: 6px; }
    .no-warn .oig-mdi { color: ${pe(s.success)}; }
    .empty-state { text-align: center; padding: 18px; color: ${pe(s.textSecondary)}; font-size: 13px; }
  `;Vn([g({type:Boolean,reflect:!0})],ki.prototype,"open",2);Vn([g({type:Object})],ki.prototype,"weather",2);Vn([g({type:Object})],ki.prototype,"chmu",2);ki=Vn([E("oig-weather-modal")],ki);var U2=Object.defineProperty,Y2=Object.getOwnPropertyDescriptor,et=(e,t,i,r)=>{for(var n=r>1?void 0:r?Y2(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&U2(t,i,n),n};const Ve=Q;function Ui(e){return e.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")}function Q2(e,t,i,r=50){const n=Ui(i.trim()),a=t?`${t}.`:"",o=e.filter(u=>a&&!u.entity_id.startsWith(a)?!1:n?Ui(u.entity_id).includes(n)||Ui(u.friendly_name).includes(n):!0);if(!n)return o.slice(0,r);const l=[],d=[],p=[];for(const u of o){const h=Ui(u.entity_id),m=Ui(u.friendly_name);h.startsWith(n)||h.includes(`.${n}`)?l.push(u):m.startsWith(n)?d.push(u):p.push(u)}return[...l,...d,...p].slice(0,r)}function X2(e,t){if(!e)return"";const i=t.find(r=>r.entity_id===e);return i!=null&&i.friendly_name&&i.friendly_name!==e?i.friendly_name:e}function J2(e){return Object.entries(e??{}).map(([t,i])=>{var r;return{entity_id:t,friendly_name:((r=i==null?void 0:i.attributes)==null?void 0:r.friendly_name)??t}})}let We=class extends D{constructor(){super(...arguments),this.value="",this.domain="",this.optional=!1,this.entities=[],this.dirty=!1,this.placeholder="nevyplněno",this.open=!1,this.query="",this.highlightIndex=-1}get results(){return Q2(this.entities,this.domain,this.query)}get displayValue(){return this.value?X2(this.value,this.entities):""}openDropdown(){this.open=!0,this.query="",this.highlightIndex=-1,requestAnimationFrame(()=>{var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".search-box input");e==null||e.focus()})}closeDropdown(){this.open=!1,this.query="",this.highlightIndex=-1}selectEntity(e){this.closeDropdown(),e!==this.value&&(this.value=e,this.dispatchEvent(new CustomEvent("entity-change",{detail:{value:e},bubbles:!0,composed:!0})))}clearValue(e){e.stopPropagation(),this.selectEntity("")}onInputClick(){this.open?this.closeDropdown():this.openDropdown()}onSearchInput(e){this.query=e.target.value,this.highlightIndex=-1}onSearchKeydown(e){const t=this.results;if(e.key==="Escape"){this.closeDropdown();return}if(e.key==="ArrowDown"){e.preventDefault(),this.highlightIndex=Math.min(this.highlightIndex+1,t.length-1),this.scrollHighlightedIntoView();return}if(e.key==="ArrowUp"){e.preventDefault(),this.highlightIndex=Math.max(this.highlightIndex-1,-1),this.scrollHighlightedIntoView();return}if(e.key==="Enter"){e.preventDefault(),this.highlightIndex>=0&&this.highlightIndex<t.length&&this.selectEntity(t[this.highlightIndex].entity_id);return}}scrollHighlightedIntoView(){requestAnimationFrame(()=>{var i;const e=(i=this.shadowRoot)==null?void 0:i.querySelector(".option-list"),t=e==null?void 0:e.querySelector(".option.hl");t==null||t.scrollIntoView({block:"nearest"})})}render(){const e=this.displayValue,t=this.open?this.results:[];return c`
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
          ${e||c`<span style="color:${s.textSecondary};opacity:0.6">${this.optional?this.placeholder:"— vyberte —"}</span>`}
        </div>
        ${this.optional&&this.value?c`<button class="clear-btn" title="Vymazat" @click=${this.clearValue} tabindex="-1">×</button>`:w}
        ${this.open?c`
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
              ${this.optional?c`
                <div class="option opt-none" @click=${()=>this.selectEntity("")}>— žádné —</div>
              `:w}
              ${t.length===0&&this.query?c`<div class="empty-msg">Žádné entity nenalezeny</div>`:t.map((i,r)=>c`
                  <div
                    class="option ${r===this.highlightIndex?"hl":""}"
                    role="option"
                    @click=${()=>this.selectEntity(i.entity_id)}
                    @mouseenter=${()=>{this.highlightIndex=r}}
                  >
                    <span class="opt-name">${i.friendly_name!==i.entity_id?i.friendly_name:i.entity_id}</span>
                    ${i.friendly_name!==i.entity_id?c`<span class="opt-id">${i.entity_id}</span>`:w}
                  </div>
                `)}
            </div>
          </div>
        `:w}
      </div>
    `}};We.styles=T`
    :host { display: block; position: relative; }

    .picker-wrap {
      position: relative;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .picker-input {
      background: ${Ve(s.bgSecondary)};
      color: ${Ve(s.textPrimary)};
      border: 1px solid ${Ve(s.divider)};
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
      border-color: ${Ve(s.accent)};
    }

    .picker-input.open {
      border-color: ${Ve(s.accent)};
      border-radius: 7px 7px 0 0;
    }

    .clear-btn {
      border: none;
      background: transparent;
      color: ${Ve(s.textSecondary)};
      cursor: pointer;
      font-size: 15px;
      padding: 0 2px;
      line-height: 1;
      flex-shrink: 0;
    }

    .clear-btn:hover { color: ${Ve(s.textPrimary)}; }

    .dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      width: 300px;
      max-height: 280px;
      overflow-y: auto;
      background: ${Ve(s.cardBg)};
      border: 1px solid ${Ve(s.accent)};
      border-radius: 0 0 8px 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      z-index: 999;
      display: flex;
      flex-direction: column;
    }

    .search-box {
      padding: 6px 8px;
      border-bottom: 1px solid ${Ve(s.divider)};
      background: ${Ve(s.bgSecondary)};
      flex-shrink: 0;
    }

    .search-box input {
      width: 100%;
      background: ${Ve(s.bgSecondary)};
      color: ${Ve(s.textPrimary)};
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
      border-bottom: 1px solid ${Ve(s.divider)};
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
      color: ${Ve(s.textPrimary)};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .opt-id {
      font-size: 10.5px;
      color: ${Ve(s.textSecondary)};
      font-family: monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .opt-none {
      padding: 6px 10px;
      font-size: 12px;
      color: ${Ve(s.textSecondary)};
      font-style: italic;
    }

    .empty-msg {
      padding: 10px;
      font-size: 12px;
      color: ${Ve(s.textSecondary)};
      text-align: center;
    }
  `;et([g({type:String})],We.prototype,"value",2);et([g({type:String})],We.prototype,"domain",2);et([g({type:Boolean})],We.prototype,"optional",2);et([g({attribute:!1})],We.prototype,"entities",2);et([g({type:Boolean})],We.prototype,"dirty",2);et([g({type:String})],We.prototype,"placeholder",2);et([H()],We.prototype,"open",2);et([H()],We.prototype,"query",2);et([H()],We.prototype,"highlightIndex",2);We=et([E("oig-entity-picker")],We);var eb=Object.defineProperty,tb=Object.getOwnPropertyDescriptor,Qt=(e,t,i,r)=>{for(var n=r>1?void 0:r?tb(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&eb(t,i,n),n};const ce=Q,ib=new Set(["boiler"]),rb=[{key:"enable_battery_prediction",label:"Predikce baterie a plánovač",type:"bool",hint:"Ekonomické plánování nabíjení, timeline, úspory"},{key:"enable_solar_forecast",label:"Solární předpověď",type:"bool",hint:"Předpověď výroby FVE (forecast.solar / Solcast)"},{key:"enable_pricing",label:"Ceny energie",type:"bool",hint:"Spotové ceny OTE, výkup, distribuce"},{key:"enable_boiler",label:"Bojler",type:"bool",hint:"Inteligentní ohřev vody"},{key:"enable_statistics",label:"Statistiky",type:"bool"},{key:"enable_extended_sensors",label:"Rozšířené senzory",type:"bool"},{key:"enable_chmu_warnings",label:"Výstrahy ČHMÚ",type:"bool"}],nb=[{key:"auto_mode_switch_enabled",label:"Automatické přepínání režimů",type:"bool",hint:"Plánovač sám přepíná Home 1 / Home UPS podle plánu"},{key:"charge_rate_kw",label:"Nabíjecí výkon ze sítě (kW)",type:"number",min:.5,max:10,step:.1,hint:"Kolik kW box bere při nabíjení ze sítě (UPS)"},{key:"expensive_percentile",label:"Práh drahých hodin (%)",type:"number",min:50,max:95,step:5,scale:100,hint:"Importy nad tímto denním percentilem cen se plánovač snaží pokrýt levným přednabitím. Výchozí 70 %."},{key:"balancing_enabled",label:"Balancování článků",type:"bool",hint:"Pravidelné nabití na 100 % kvůli vyrovnání článků"},{key:"balancing_interval_days",label:"Interval balancování (dny)",type:"number",min:3,max:30,step:1},{key:"balancing_hold_hours",label:"Držení 100 % (hodiny)",type:"number",min:1,max:12,step:1},{key:"cheap_window_percentile",label:"Levné okno pro balancování (%)",type:"number",min:5,max:80,step:5,hint:"Balancování se plánuje do hodin pod tímto cenovým percentilem"}],ab=[{key:"solar_forecast_provider",label:"Poskytovatel",type:"select",options:[["forecast_solar","forecast.solar"],["solcast","Solcast"]]},{key:"solcast_site_id",label:"Solcast site ID",type:"text",hint:"Jen pro Solcast (z rooftop site URL)"},{key:"solcast_api_key",label:"Solcast API klíč",type:"text",hint:"Nech prázdné = beze změny"},{key:"solar_forecast_latitude",label:"Zeměpisná šířka",type:"number",min:-90,max:90,step:1e-4},{key:"solar_forecast_longitude",label:"Zeměpisná délka",type:"number",min:-180,max:180,step:1e-4},{key:"solar_forecast_string1_enabled",label:"String 1 aktivní",type:"bool"},{key:"solar_forecast_string1_kwp",label:"String 1 výkon (kWp)",type:"number",min:.1,max:50,step:.1},{key:"solar_forecast_string1_declination",label:"String 1 sklon (°)",type:"number",min:0,max:90,step:1},{key:"solar_forecast_string1_azimuth",label:"String 1 azimut (°)",type:"number",min:-180,max:180,step:1,hint:"0 = jih, −90 = východ, 90 = západ"},{key:"solar_forecast_string2_enabled",label:"String 2 aktivní",type:"bool"},{key:"solar_forecast_string2_kwp",label:"String 2 výkon (kWp)",type:"number",min:.1,max:50,step:.1},{key:"solar_forecast_string2_declination",label:"String 2 sklon (°)",type:"number",min:0,max:90,step:1},{key:"solar_forecast_string2_azimuth",label:"String 2 azimut (°)",type:"number",min:-180,max:180,step:1}];function ob(e){return e==="gas"?"Plyn — cena tepla včetně účinnosti kotle (např. 1,5 Kč/kWh)":e==="heat_pump"?"Tepelné čerpadlo — cena ≈ cena elektřiny / COP":e==="fireplace"?"Krb — orientační cena tepla z dřeva/pelet":"Zadej orientační cenu tepla v Kč/kWh"}const Me=[{key:"boiler_volume_l",label:"Objem nádrže (l)",type:"number",min:30,max:1e3,step:1,hint:"Jmenovitý objem zásobníku v litrech"},{key:"boiler_temp_sensor_top",label:"Čidlo teploty — vrchní",type:"text",hint:"ID entity senzoru teploty (např. sensor.bojler_top)",entity:{domain:"sensor"}},{key:"boiler_temp_sensor_bottom",label:"Čidlo teploty — spodní",type:"text",hint:"Jen pokud máš druhý teploměr (ID entity senzoru)",optional:!0,entity:{domain:"sensor"}},{key:"boiler_enable_second_thermometer",label:"Druhý teploměr aktivní",type:"bool",hint:"Zapni, pokud máš spodní čidlo teploty"},{key:"boiler_current_power_entity",label:"Senzor příkonu bojleru",type:"text",hint:"ID entity senzoru výkonu (W); upřesňuje plánovač",optional:!0,entity:{domain:"sensor"}},{key:"boiler_target_temp_c",label:"Cílová teplota (°C)",type:"number",min:40,max:85,step:1,hint:"Požadovaná teplota vody před deadline"},{key:"boiler_deadline_time",label:"Deadline (HH:MM)",type:"text",hint:"Čas, do kdy musí být voda nahřátá (formát HH:MM, např. 07:00)"},{key:"boiler_has_alternative_heating",label:"Alternativní zdroj tepla",type:"bool",hint:"Bojler má jiný zdroj ohřevu (plyn, TČ, krb…)"},{key:"boiler_alt_source_type",label:"Typ alternativního zdroje",type:"select",options:[["gas","Plyn"],["heat_pump","Tepelné čerpadlo"],["fireplace","Krb"],["other","Jiný"]]},{key:"boiler_alt_cost_kwh",label:"Cena tepla (Kč/kWh)",type:"number",min:0,max:20,step:.1,hint:"Cena tepla z alternativního zdroje v Kč/kWh"},{key:"boiler_alt_energy_sensor",label:"Senzor energie alt. zdroje",type:"text",hint:"ID entity senzoru energie (kWh)",optional:!0,entity:{domain:"sensor"}},{key:"boiler_alt_energy_daily",label:"Denní přírůstek energie",type:"bool",hint:"Zapni, pokud senzor měří denní (ne celkový) přírůstek"},{key:"box_has_home56",label:"Box má Home 5/6",type:"bool",hint:"Aktivuje Home 5/6 (OIG CBB) — umožňuje 🔋→🔥 ohřev z baterie"},{key:"boiler_home5_maneuver_enabled",label:"🔋→🔥 Ohřev z baterie",type:"bool",hint:"Plánovač může použít baterii k ohřevu (vyžaduje Home 5/6)"},{key:"boiler_battery_cycle_cost_czk_kwh",label:"Cena cyklu baterie (Kč/kWh)",type:"number",min:0,max:5,step:.05,hint:"Degradace baterie za kWh; plánovač porovná s cenou sítě"},{key:"boiler_circulation_enabled",label:"Cirkulace teplé vody",type:"bool",hint:"Zapnutí cirkulačního čerpadla TUV"},{key:"boiler_circulation_lead_minutes",label:"Předstih cirkulace (min)",type:"number",min:0,max:120,step:5,hint:"Jak dlouho před odběrem pustit čerpadlo"},{key:"boiler_circulation_run_minutes",label:"Délka běhu cirkulace (min)",type:"number",min:1,max:60,step:1},{key:"boiler_circulation_max_runs_per_day",label:"Max. počet běhů/den",type:"number",min:1,max:20,step:1},{key:"boiler_circulation_min_gap_minutes",label:"Min. pauza mezi běhy (min)",type:"number",min:10,max:480,step:10},{key:"boiler_legionella_interval_days",label:"Interval ochrany (dny)",type:"number",min:0,max:30,step:1,hint:"0 = vypnuto; doporučeno 7–14 dní"},{key:"boiler_legionella_target_temp_c",label:"Teplota dezinfekce (°C)",type:"number",min:60,max:75,step:1,hint:"Min. 60 °C pro spolehlivé usmrcení legionelly"}];function sb(e){return e==="gas"?"plyn":e==="heat_pump"?"TČ":e==="fireplace"?"krb":e||"jiný"}function lb(e,t,i,r,n){const a=[];if(e){const o=sb(t),l=i!=null?` · ${Number(i).toFixed(1).replace(".",",")} Kč/kWh`:"";a.push(`${o}${l}`)}return r&&n&&a.push("🔋→🔥"),a.length===0?r?"Home 5/6":"pouze elektřina":a.join(" · ")}function cb(e){return e?"zapnuto":"vypnuto"}function db(e){return e<=0?"vypnuto":`1×/${e} dní`}let ot=class extends D{constructor(){super(...arguments),this.hassStates=null,this.config=null,this.loading=!0,this.pending={},this.saving=null,this.toast=null,this._entityCatalog=[],this._lastHassStates=null}connectedCallback(){super.connectedCallback(),this.refresh()}get entityCatalog(){return this.hassStates!==this._lastHassStates&&(this._lastHassStates=this.hassStates,this._entityCatalog=this.hassStates?J2(this.hassStates):[]),this._entityCatalog}async refresh(){this.loading=!0,this.config=await ba(),this.pending={},this.loading=!1}current(e,t){var n;const i=this.pending[e];if(i&&t in i)return i[t];const r=(n=this.config)==null?void 0:n[e];return r?r[t]:void 0}setPending(e,t,i){this.pending={...this.pending,[e]:{...this.pending[e]??{},[t]:i}}}isDirty(e){return Object.keys(this.pending[e]??{}).length>0}discardPending(e){this.pending={...this.pending,[e]:{}},this.toast=null}async save(e){const t=this.pending[e];if(!t||this.saving)return;this.saving=e,this.toast=null;const i=await od(e,t);if(this.saving=null,!i.ok){const r=i.fields?Object.entries(i.fields).map(([n,a])=>`${n}: ${a}`).join(", "):"uložení selhalo";this.toast={section:e,ok:!1,text:`✗ ${r}`};return}if(this.config&&(this.config={...this.config,[e]:{...this.config[e],...t}}),this.pending={...this.pending,[e]:{}},ib.has(e))this.toast={section:e,ok:!0,text:"✓ Uloženo — integrace se restartuje…"},ad(r=>{this.config=r,this.toast={section:e,ok:!0,text:"✓ Aplikováno"}},()=>{this.toast={section:e,ok:!0,text:"Integrace se restartuje déle než obvykle — obnov stránku"}});else{this.toast={section:e,ok:!0,text:"✓ Uloženo"},this.loading=!0;const r=await ba();r&&(this.config=r),this.loading=!1}}renderLabel(e){return c`
      <span class="lab">
        ${e.label}${e.optional?c`<span class="optional-badge"> (volitelné)</span>`:w}
        ${e.hint?c`<span class="hint">${e.hint}</span>`:w}
      </span>`}renderField(e,t){const i=this.current(e,t.key),r=!!(this.pending[e]&&t.key in this.pending[e]);if(t.type==="bool"){const l=!!i;return c`
        <div class="row">
          ${this.renderLabel(t)}
          <div class="row-control">
            <label class="switch">
              <input type="checkbox" .checked=${l}
                @change=${d=>this.setPending(e,t.key,d.target.checked)} />
              <span class="slider"></span>
            </label>
          </div>
        </div>`}if(t.type==="select"){const l=String(i??"");return c`
        <div class="row">
          ${this.renderLabel(t)}
          <div class="row-control">
            <select class=${r?"dirty":""}
              @change=${d=>this.setPending(e,t.key,d.target.value)}>
              ${(t.options??[]).map(([d,p])=>c`<option value=${d} ?selected=${d===l}>${p}</option>`)}
            </select>
          </div>
        </div>`}if(t.type==="number"){const l=t.scale??1,d=i==null||i===""?"":String(Math.round((Number(i)*l+Number.EPSILON)*1e4)/1e4);return c`
        <div class="row">
          ${this.renderLabel(t)}
          <div class="row-control">
            <input type="number" class=${r?"dirty":""} .value=${d}
              min=${t.min??w} max=${t.max??w} step=${t.step??w}
              @change=${p=>{const u=p.target.value;u!==""&&this.setPending(e,t.key,Number(u)/l)}} />
          </div>
        </div>`}if(t.entity){const l=String(i??"");return c`
        <div class="row">
          ${this.renderLabel(t)}
          <div class="row-control">
            <oig-entity-picker
              .value=${l}
              .domain=${t.entity.domain}
              .optional=${!!t.optional}
              .dirty=${r}
              .entities=${this.entityCatalog}
              @entity-change=${d=>this.setPending(e,t.key,d.detail.value)}
            ></oig-entity-picker>
          </div>
        </div>`}const n=t.key.endsWith("api_key"),a=n&&!!this.current(e,`${t.key}_set`),o=n?"":String(i??"");return c`
      <div class="row">
        ${this.renderLabel(t)}
        <div class="row-control">
          <input type="text" class=${r?"dirty":""} .value=${o}
            placeholder=${n?a?"••••• (nastaveno)":"nenastaveno":t.optional?"nevyplněno":""}
            @change=${l=>this.setPending(e,t.key,l.target.value)} />
        </div>
      </div>`}renderCard(e,t,i,r){var o;const n=((o=this.toast)==null?void 0:o.section)===e?this.toast:null,a=this.isDirty(e);return c`
      <div class="card">
        <h2>${t}</h2>
        <div class="sub">${i}</div>
        ${r.map(l=>this.renderField(e,l))}
        <div class="actions">
          <button class="save" ?disabled=${!a||this.saving===e}
            @click=${()=>this.save(e)}>
            ${this.saving===e?"Ukládám…":"Uložit"}
          </button>
          ${n?c`<span class="toast ${n.ok?"ok":"err"}">${n.text}</span>`:w}
        </div>
      </div>`}renderFieldDisableable(e,t,i){if(t.type!=="bool")return this.renderField(e,t);const r=this.current(e,t.key),n=!i&&!!r;return c`
      <div class="row" style=${i?"opacity:0.45;pointer-events:none":""}>
        ${this.renderLabel(t)}
        <div class="row-control">
          <label class="switch">
            <input type="checkbox" .checked=${n} ?disabled=${i}
              @change=${a=>this.setPending(e,t.key,a.target.checked)} />
            <span class="slider"></span>
          </label>
        </div>
      </div>`}renderBoilerCard(){var $;const e="boiler",t=(($=this.toast)==null?void 0:$.section)===e?this.toast:null,i=!!this.current(e,"boiler_has_alternative_heating"),r=String(this.current(e,"boiler_alt_source_type")??"gas"),n=this.current(e,"boiler_alt_cost_kwh"),a=!!this.current(e,"box_has_home56"),o=!!this.current(e,"boiler_home5_maneuver_enabled"),l=!!this.current(e,"boiler_circulation_enabled"),d=Number(this.current(e,"boiler_legionella_interval_days")??0),p=!!this.current(e,"boiler_enable_second_thermometer"),u=this.isDirty(e),h={key:"boiler_alt_cost_kwh",label:"Cena tepla (Kč/kWh)",type:"number",min:0,max:20,step:.1,hint:ob(r)},m={key:"boiler_home5_maneuver_enabled",label:"🔋→🔥 Ohřev z baterie",type:"bool",hint:a?"Plánovač použije baterii (Home 5) k ohřevu, pokud je levnější než síť":'Vyžaduje aktivaci „Box má Home 5/6" výše'},v=lb(i,r,n,a,o),f=cb(l),b=db(d);return c`
      <div class="card">
        <h2>🔥 Bojler</h2>
        <div class="sub">Parametry inteligentního ohřevu vody — mirroruje průvodce v HA.</div>

        <!-- ══ Nádrž a čidla — OPEN by default ══ -->
        <details class="bsec" open>
          <summary>Nádrž a čidla</summary>
          <div class="bsec-body">
            ${this.renderField(e,Me.find(y=>y.key==="boiler_volume_l"))}
            ${this.renderField(e,Me.find(y=>y.key==="boiler_temp_sensor_top"))}
            ${this.renderField(e,Me.find(y=>y.key==="boiler_enable_second_thermometer"))}
            ${p?this.renderField(e,Me.find(y=>y.key==="boiler_temp_sensor_bottom")):w}
            ${this.renderField(e,Me.find(y=>y.key==="boiler_current_power_entity"))}
            ${this.renderField(e,Me.find(y=>y.key==="boiler_target_temp_c"))}
            ${this.renderField(e,Me.find(y=>y.key==="boiler_deadline_time"))}
          </div>
        </details>

        <!-- ══ Zdroje tepla — collapsed ══ -->
        <details class="bsec">
          <summary>
            Zdroje tepla
            <span class="bsec-badge" data-testid="badge-sources">${v}</span>
          </summary>
          <div class="bsec-body">
            ${this.renderField(e,Me.find(y=>y.key==="boiler_has_alternative_heating"))}
            ${i?c`
              ${this.renderField(e,{...Me.find(y=>y.key==="boiler_alt_source_type"),hint:void 0})}
              ${this.renderField(e,h)}
              ${this.renderField(e,Me.find(y=>y.key==="boiler_alt_energy_sensor"))}
              ${this.renderField(e,Me.find(y=>y.key==="boiler_alt_energy_daily"))}
            `:w}
            ${this.renderField(e,Me.find(y=>y.key==="box_has_home56"))}
            <div class="note" style="margin-top:6px;margin-bottom:2px">
              Po změně „Box má Home 5/6" a uložení nastavení je nutné obnovit stránku (F5), aby se ovládací panel správně aktualizoval.
            </div>
            ${this.renderFieldDisableable(e,m,!a)}
            ${a?this.renderField(e,Me.find(y=>y.key==="boiler_battery_cycle_cost_czk_kwh")):w}
          </div>
        </details>

        <!-- ══ Cirkulace teplé vody — collapsed ══ -->
        <details class="bsec">
          <summary>
            Cirkulace teplé vody
            <span class="bsec-badge" data-testid="badge-circulation">${f}</span>
          </summary>
          <div class="bsec-body">
            ${this.renderField(e,Me.find(y=>y.key==="boiler_circulation_enabled"))}
            ${l?c`
              ${this.renderField(e,Me.find(y=>y.key==="boiler_circulation_lead_minutes"))}
              ${this.renderField(e,Me.find(y=>y.key==="boiler_circulation_run_minutes"))}
              ${this.renderField(e,Me.find(y=>y.key==="boiler_circulation_max_runs_per_day"))}
              ${this.renderField(e,Me.find(y=>y.key==="boiler_circulation_min_gap_minutes"))}
            `:w}
          </div>
        </details>

        <!-- ══ Ochrana proti legionelle — collapsed ══ -->
        <details class="bsec">
          <summary>
            Ochrana proti legionelle
            <span class="bsec-badge" data-testid="badge-legionella">${b}</span>
          </summary>
          <div class="bsec-body">
            ${this.renderField(e,Me.find(y=>y.key==="boiler_legionella_interval_days"))}
            ${d>0?this.renderField(e,Me.find(y=>y.key==="boiler_legionella_target_temp_c")):w}
          </div>
        </details>

        <!-- ══ Dirty bar / Actions ══ -->
        ${u?c`
          <div class="dirty-bar" data-testid="boiler-dirty-bar">
            <span class="dirty-bar-label">Neuložené změny</span>
            ${t?c`<span class="toast ${t.ok?"ok":"err"}">${t.text}</span>`:w}
            <button class="discard" @click=${()=>this.discardPending(e)}>Zahodit</button>
            <button class="save" ?disabled=${this.saving===e}
              @click=${()=>this.save(e)}>
              ${this.saving===e?"Ukládám…":"Uložit"}
            </button>
          </div>
        `:c`
          <div class="actions">
            <button class="save" disabled>Uložit</button>
            ${t?c`<span class="toast ${t.ok?"ok":"err"}">${t.text}</span>`:w}
          </div>
        `}
      </div>`}render(){return this.loading?c`<div class="loading">Načítání nastavení…</div>`:this.config?c`
      <div class="grid">
        ${this.renderCard("modules","🧩 Moduly","Zapnutí modulu přidá senzory a záložky; konfigurace níže.",rb)}
        ${this.renderCard("battery","🔋 Baterie a plánovač","Parametry ekonomického plánovače a balancování.",nb)}
        ${this.renderCard("solar","☀️ Solární předpověď","Poskytovatel a geometrie stringů.",ab)}
        ${this.renderBoilerCard()}
      </div>
    `:c`<div class="loading">Nastavení se nepodařilo načíst (vyžaduje administrátorský účet).</div>`}};ot.styles=T`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 14px;
      align-items: start;
    }

    .card {
      background: ${ce(s.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${ce(s.cardShadow)};
      position: relative;
    }

    .card h2 {
      margin: 0 0 4px;
      font-size: 15px;
      color: ${ce(s.textPrimary)};
    }

    .card .sub {
      font-size: 11px;
      color: ${ce(s.textSecondary)};
      margin-bottom: 12px;
    }

    /* ---- Rows ---- */
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px dashed ${ce(s.divider)};
    }
    .row:last-of-type { border-bottom: none; }

    .lab {
      font-size: 12.5px;
      color: ${ce(s.textPrimary)};
      flex: 1;
      min-width: 0;
    }

    .hint {
      display: block;
      font-size: 10.5px;
      color: ${ce(s.textSecondary)};
      margin-top: 3px;
      line-height: 1.4;
    }

    .row-control {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    input[type='number'], input[type='text'], select {
      background: ${ce(s.bgSecondary)};
      color: ${ce(s.textPrimary)};
      border: 1px solid ${ce(s.divider)};
      border-radius: 7px;
      padding: 5px 8px;
      font-size: 12.5px;
      max-width: 120px;
    }
    input[type='text'] { max-width: 170px; }
    input.dirty, select.dirty { border-color: ${ce(s.accent)}; }

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
    .switch input:checked + .slider { background: ${ce(s.accent)}; }
    .switch input:checked + .slider:before { transform: translateX(18px); }

    /* ---- Actions ---- */
    .actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
    button.save {
      background: ${ce(s.accent)};
      color: #fff; border: none; border-radius: 8px;
      padding: 7px 16px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    button.save:disabled { opacity: 0.45; cursor: default; }
    .toast { font-size: 12px; }
    .toast.ok { color: #9fe6a8; }
    .toast.err { color: #ff9d93; }

    /* ---- Note box ---- */
    .note {
      font-size: 11.5px;
      color: ${ce(s.textSecondary)};
      background: rgba(120,160,255,0.08);
      border: 1px solid rgba(120,160,255,0.2);
      border-radius: 8px;
      padding: 8px 10px;
      margin-top: 12px;
      line-height: 1.45;
    }

    .loading { padding: 30px; text-align: center; color: ${ce(s.textSecondary)}; }

    /* ---- Group label (non-boiler cards) ---- */
    .group-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${ce(s.textSecondary)};
      margin: 12px 0 4px;
      padding-top: 6px;
      border-top: 1px solid ${ce(s.divider)};
    }
    .group-label:first-of-type { border-top: none; margin-top: 0; }

    /* ---- Optional badge ---- */
    .optional-badge {
      font-size: 10px;
      color: ${ce(s.textSecondary)};
      font-style: italic;
      margin-left: 2px;
    }

    /* ---- Collapsible boiler sub-sections ---- */
    .bsec {
      border-top: 1px solid ${ce(s.divider)};
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
      color: ${ce(s.textSecondary)};
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
      color: ${ce(s.textSecondary)};
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
      background: ${ce(s.cardBg)};
      border-top: 1px solid ${ce(s.accent)};
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
      color: ${ce(s.textSecondary)};
      flex: 1;
    }

    button.discard {
      background: transparent;
      border: 1px solid ${ce(s.divider)};
      color: ${ce(s.textSecondary)};
      border-radius: 7px;
      padding: 5px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    button.discard:hover { border-color: ${ce(s.textSecondary)}; }
  `;Qt([g({attribute:!1})],ot.prototype,"hassStates",2);Qt([H()],ot.prototype,"config",2);Qt([H()],ot.prototype,"loading",2);Qt([H()],ot.prototype,"pending",2);Qt([H()],ot.prototype,"saving",2);Qt([H()],ot.prototype,"toast",2);ot=Qt([E("oig-settings")],ot);var pb=Object.defineProperty,ub=Object.getOwnPropertyDescriptor,lt=(e,t,i,r)=>{for(var n=r>1?void 0:r?ub(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&pb(t,i,n),n};const G=Q;function hb(e,t,i,r){const n=Math.abs(e);return n===1?t:n>=2&&n<=4?i:r}function ol(e){return`${e} ${hb(e,"blok","bloky","bloků")}`}function sl(e){return`${e} přepnutí`}let qt=class extends D{constructor(){super(...arguments),this.open=!1,this.activeTab="today",this.data=null,this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.open&&this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return Ls[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return c`
      <div
        class="mode-block ${i?"current":""}"
        style="background: ${t.color}; flex: ${Math.max(e.durationHours,.5)}"
        title="${e.startTime}–${e.endTime} | ${t.label}"
      >
        ${e.modeMatch?null:c`<span class="mode-mismatch">!</span>`}
        <span class="mode-icon">${t.icon}</span>
        <span class="mode-name">${t.label}</span>
        <span class="mode-time">${e.startTime}–${e.endTime}</span>
        ${e.costPlanned!=null?c`
          <span class="mode-cost">${ae(e.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(e,t){const i=t.unit==="Kč"?ae(t.plan):`${t.plan.toFixed(1)} ${t.unit}`;let r="",n="";return t.hasActual&&t.actual!=null&&(n=t.unit==="Kč"?ae(t.actual):`${t.actual.toFixed(1)} ${t.unit}`,t.unit==="Kč"?r=t.actual<=t.plan?"better":"worse":r=t.actual>=t.plan?"better":"worse"),c`
      <div class="metric-tile">
        <div class="metric-label">${e}</div>
        <div class="metric-values">
          <span class="metric-plan">${i}</span>
          ${t.hasActual?c`
            <span class="metric-actual ${r}">(${n})</span>
          `:null}
        </div>
      </div>
    `}render(){const e=["yesterday","today","tomorrow"];return c`
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
          ${e.map(t=>c`
            <button
              class="tab ${this.activeTab===t?"active":""}"
              @click=${()=>this.onTabClick(t)}
            >
              ${Hs[t]}
            </button>
          `)}
        </div>

        <div class="dialog-content">
          ${this.data?this.renderDayContent():c`
            <div class="empty-state">Načítání dat...</div>
          `}
        </div>
      </div>
    `}renderDayContent(){const e=this.data,t=e.summary;return c`
      <!-- Battery savings on the backed-up load only (excludes car + balancing) -->
      ${t.backupSavings!=null?c`
            <div class="backup-savings" title="Jen zálohová spotřeba — bez auta a nabíjení baterie ze sítě">
              <span>Úspora baterie:</span>
              <span class="bs-value ${t.backupSavings>=0?"pos":"neg"}">
                ${t.backupSavings>=0?"+":""}${ae(t.backupSavings)}
              </span>
              <span class="bs-detail">
                záloha ${ae(t.backupActualCost??0)} vs. nedělat nic
                ${ae(t.backupBaselineCost??0)}
              </span>
            </div>
          `:null}

      <!-- Adherence bar -->
      ${e.modeBlocks.length>1&&t.overallAdherence>0?c`
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
      ${t.progressPct!=null?c`
        <div class="progress-section">
          <div class="progress-item">
            Průběh: <span class="progress-value">${this.fmtPct(t.progressPct)}</span>
          </div>
          ${t.actualTotalCost!=null?c`
            <div class="progress-item">
              Skutečné: <span class="progress-value">${ae(t.actualTotalCost)}</span>
            </div>
          `:null}
          ${t.planTotalCost!=null?c`
            <div class="progress-item">
              Plán: <span class="progress-value">${ae(t.planTotalCost)}</span>
            </div>
          `:null}
          ${t.vsPlanPct!=null?c`
            <div class="progress-item">
              vs plán: <span class="progress-value" style="color: ${t.vsPlanPct<=100?"#4caf50":"#f44336"}">${this.fmtPct(t.vsPlanPct)}</span>
            </div>
          `:null}
        </div>
      `:null}

      <!-- EOD prediction -->
      ${t.eodPrediction?c`
        <div class="eod-prediction">
          Predikce konce dne: <span class="eod-value">${ae(t.eodPrediction.predictedTotal)}</span>
          ${t.eodPrediction.predictedSavings>0?c`
            <span class="eod-savings"> (úspora ${ae(t.eodPrediction.predictedSavings)})</span>
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
      ${e.modeBlocks.length>0?c`
        <div class="modes-section">
          <div class="section-title">Režimy (${ol(e.modeBlocks.length)}, ${sl(t.modeSwitches)})</div>
          <div class="mode-blocks-timeline">
            ${e.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}

      <!-- Comparison plan (if available) -->
      ${e.comparison?c`
        <div class="modes-section">
          <div class="section-title">Srovnání: ${e.comparison.plan}</div>
          <div class="mode-blocks-timeline">
            ${e.comparison.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}
    `}};qt.styles=T`
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
      background: ${G(s.cardBg)};
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
      border-bottom: 1px solid ${G(s.divider)};
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${G(s.textPrimary)};
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
      color: ${G(s.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${G(s.bgSecondary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${G(s.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${G(s.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 12px 16px;
      border: none;
      background: transparent;
      font-size: 13px;
      color: ${G(s.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${G(s.textPrimary)};
    }

    .tab.active {
      color: ${G(s.accent)};
      border-bottom-color: ${G(s.accent)};
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
      color: ${G(s.textSecondary)};
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
      background: ${G(s.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
    }

    .metric-label {
      font-size: 11px;
      color: ${G(s.textSecondary)};
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
      color: ${G(s.textPrimary)};
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
      color: ${G(s.textPrimary)};
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
      color: ${G(s.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${G(s.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${G(s.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 12px;
      color: ${G(s.textSecondary)};
    }

    .eod-value {
      font-size: 16px;
      font-weight: 600;
      color: ${G(s.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: ${G(s.textSecondary)};
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
  `;lt([g({type:Boolean,reflect:!0})],qt.prototype,"open",2);lt([g({type:String})],qt.prototype,"activeTab",2);lt([g({type:Object})],qt.prototype,"data",2);lt([H()],qt.prototype,"autoRefresh",2);qt=lt([E("oig-timeline-dialog")],qt);let Ci=class extends D{constructor(){super(...arguments),this.data=null,this.activeTab="today",this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return Ls[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return c`
      <div
        class="mode-block ${i?"current":""}"
        style="background: ${t.color}; flex: ${Math.max(e.durationHours,.5)}"
        title="${e.startTime}–${e.endTime} | ${t.label}"
      >
        ${e.modeMatch?null:c`<span class="mode-mismatch">!</span>`}
        <span class="mode-icon">${t.icon}</span>
        <span class="mode-name">${t.label}</span>
        <span class="mode-time">${e.startTime}–${e.endTime}</span>
        ${e.costPlanned!=null?c`
          <span class="mode-cost">${ae(e.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(e,t){const i=t.unit==="Kč"?ae(t.plan):`${t.plan.toFixed(1)} ${t.unit}`;let r="",n="";return t.hasActual&&t.actual!=null&&(n=t.unit==="Kč"?ae(t.actual):`${t.actual.toFixed(1)} ${t.unit}`,t.unit==="Kč"?r=t.actual<=t.plan?"better":"worse":r=t.actual>=t.plan?"better":"worse"),c`
      <div class="metric-tile">
        <div class="metric-label">${e}</div>
        <div class="metric-values">
          <span class="metric-plan">${i}</span>
          ${t.hasActual?c`
            <span class="metric-actual ${r}">(${n})</span>
          `:null}
        </div>
      </div>
    `}render(){const e=["yesterday","today","tomorrow"];return c`
      <div class="tile">
        <div class="tile-header">
          <span class="tile-title">📊 Plán &amp; realita</span>
          <label class="auto-refresh">
            <input type="checkbox" .checked=${this.autoRefresh} @change=${this.toggleAutoRefresh} />
            Auto
          </label>
        </div>

        <div class="tabs">
          ${e.map(t=>c`
            <button
              class="tab ${this.activeTab===t?"active":""}"
              @click=${()=>this.onTabClick(t)}
            >
              ${Hs[t]}
            </button>
          `)}
        </div>

        <div class="tile-content">
          ${this.data?this.renderDayContent():c`
            <div class="empty-state">Načítání dat...</div>
          `}
        </div>
      </div>
    `}renderDayContent(){const e=this.data,t=e.summary;return c`
      <!-- Battery savings on the backed-up load only (excludes car + balancing) -->
      ${t.backupSavings!=null?c`
            <div class="backup-savings" title="Jen zálohová spotřeba — bez auta a nabíjení baterie ze sítě">
              <span>Úspora baterie:</span>
              <span class="bs-value ${t.backupSavings>=0?"pos":"neg"}">
                ${t.backupSavings>=0?"+":""}${ae(t.backupSavings)}
              </span>
              <span class="bs-detail">
                záloha ${ae(t.backupActualCost??0)} vs. nedělat nic
                ${ae(t.backupBaselineCost??0)}
              </span>
            </div>
          `:null}

      <!-- Adherence bar -->
      ${e.modeBlocks.length>1&&t.overallAdherence>0?c`
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
      ${t.progressPct!=null?c`
        <div class="progress-section">
          <div class="progress-item">
            Průběh: <span class="progress-value">${this.fmtPct(t.progressPct)}</span>
          </div>
          ${t.actualTotalCost!=null?c`
            <div class="progress-item">
              Skutečné: <span class="progress-value">${ae(t.actualTotalCost)}</span>
            </div>
          `:null}
          ${t.planTotalCost!=null?c`
            <div class="progress-item">
              Plán: <span class="progress-value">${ae(t.planTotalCost)}</span>
            </div>
          `:null}
          ${t.vsPlanPct!=null?c`
            <div class="progress-item">
              vs plán: <span class="progress-value" style="color: ${t.vsPlanPct<=100?"#4caf50":"#f44336"}">${this.fmtPct(t.vsPlanPct)}</span>
            </div>
          `:null}
        </div>
      `:null}

      <!-- EOD prediction -->
      ${t.eodPrediction?c`
        <div class="eod-prediction">
          Predikce konce dne: <span class="eod-value">${ae(t.eodPrediction.predictedTotal)}</span>
          ${t.eodPrediction.predictedSavings>0?c`
            <span class="eod-savings"> (úspora ${ae(t.eodPrediction.predictedSavings)})</span>
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
      ${e.modeBlocks.length>0?c`
        <div class="modes-section">
          <div class="section-title">Režimy (${ol(e.modeBlocks.length)}, ${sl(t.modeSwitches)})</div>
          <div class="mode-blocks-timeline">
            ${e.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}

      <!-- Comparison plan (if available) -->
      ${e.comparison?c`
        <div class="modes-section">
          <div class="section-title">Srovnání: ${e.comparison.plan}</div>
          <div class="mode-blocks-timeline">
            ${e.comparison.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}
    `}};Ci.styles=T`
    :host {
      display: block;
    }

    .tile {
      background: ${G(s.cardBg)};
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
      border-bottom: 1px solid ${G(s.divider)};
    }

    .tile-title {
      font-size: 13px;
      font-weight: 600;
      color: ${G(s.textPrimary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${G(s.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${G(s.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 6px 10px;
      border: none;
      background: transparent;
      font-size: 11px;
      color: ${G(s.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${G(s.textPrimary)};
    }

    .tab.active {
      color: ${G(s.accent)};
      border-bottom-color: ${G(s.accent)};
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
      color: ${G(s.textSecondary)};
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
      background: ${G(s.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
    }

    .metric-label {
      font-size: 10px;
      color: ${G(s.textSecondary)};
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
      color: ${G(s.textPrimary)};
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
      color: ${G(s.textPrimary)};
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
      color: ${G(s.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${G(s.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${G(s.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${G(s.textSecondary)};
    }

    .eod-value {
      font-size: 14px;
      font-weight: 600;
      color: ${G(s.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 24px 16px;
      color: ${G(s.textSecondary)};
      font-size: 12px;
    }

    /* ---- Battery savings (záloha-only, fair) ---- */
    .backup-savings {
      background: ${G(s.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${G(s.textSecondary)};
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
  `;lt([g({type:Object})],Ci.prototype,"data",2);lt([g({type:String})],Ci.prototype,"activeTab",2);lt([H()],Ci.prototype,"autoRefresh",2);Ci=lt([E("oig-timeline-tile")],Ci);var gb=Object.defineProperty,mb=Object.getOwnPropertyDescriptor,kt=(e,t,i,r)=>{for(var n=r>1?void 0:r?mb(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&gb(t,i,n),n};const ve=Q;let Mi=class extends D{constructor(){super(...arguments),this.data=null,this.editMode=!1,this.tileType="entity"}onTileClick(){var t;if(this.editMode)return;const e=(t=this.data)==null?void 0:t.config;e&&(e.type==="button"&&e.action?Cd(e.entity_id,e.action):ee.openEntityDialog(e.entity_id))}onSupportClick(e,t){e.stopPropagation(),!this.editMode&&ee.openEntityDialog(t)}onEdit(){var e;this.dispatchEvent(new CustomEvent("edit-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}onDelete(){var e;this.dispatchEvent(new CustomEvent("delete-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}render(){var d,p;if(!this.data)return null;const e=this.data.config,t=e.type==="button";this.tileType!==e.type&&(this.tileType=e.type??"entity");const i=e.color||"",r=e.icon||(t?"⚡":"📊"),n=ye(r),a=(d=e.support_entities)==null?void 0:d.top_right,o=(p=e.support_entities)==null?void 0:p.bottom_right,l=this.data.supportValues.topRight||this.data.supportValues.bottomRight;return c`
      ${i?c`<style>:host { --tile-color: ${ve(i)}; }</style>`:null}

      <div class="tile-top" @click=${this.onTileClick} title=${this.editMode?"":e.entity_id}>
        <span class="tile-icon">${n}</span>
        <span class="tile-label">${e.label||""}</span>
        ${l?c`
          <div class="support-values">
            ${this.data.supportValues.topRight?c`
              <span
                class="support-value ${a&&!this.editMode?"clickable":""}"
                @click=${a&&!this.editMode?u=>this.onSupportClick(u,a):null}
              >${this.data.supportValues.topRight.value} ${this.data.supportValues.topRight.unit}</span>
            `:null}
            ${this.data.supportValues.bottomRight?c`
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
        ${this.data.unit?c`<span class="tile-unit">${this.data.unit}</span>`:null}
        ${t?c`
          <span class="state-dot ${this.data.isActive?"on":"off"}"></span>
        `:null}
      </div>

      ${this.editMode?c`
        <div class="edit-actions">
          <button class="edit-btn" @click=${this.onEdit}>⚙</button>
          <button class="delete-btn" @click=${this.onDelete}>✕</button>
        </div>
      `:null}
    `}};Mi.styles=T`
    /* ===== BASE ===== */
    :host {
      display: flex;
      flex-direction: column;
      padding: 7px 9px;
      background: ${ve(s.cardBg)};
      border-radius: 10px;
      box-shadow: ${ve(s.cardShadow)};
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
      color: ${ve(s.textSecondary)};
      opacity: 0.45;
      font-style: normal;
    }

    /* ===== BUTTON TILE ===== */
    :host([tiletype="button"]) {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--tile-color, ${ve(s.accent)}) 10%, ${ve(s.cardBg)}),
        ${ve(s.cardBg)}
      );
      border: 1px solid color-mix(in srgb, var(--tile-color, ${ve(s.accent)}) 38%, transparent);
    }

    :host([tiletype="button"]:not([editmode]):hover) {
      transform: translateY(-2px);
      cursor: pointer;
      box-shadow:
        0 4px 14px color-mix(in srgb, var(--tile-color, ${ve(s.accent)}) 28%, transparent),
        ${ve(s.cardShadow)};
    }

    :host([tiletype="button"]:not([editmode]):active) {
      transform: translateY(0) scale(0.98);
      opacity: 0.85;
    }

    :host([tiletype="button"]) .tile-icon {
      background: color-mix(in srgb, var(--tile-color, ${ve(s.accent)}) 18%, transparent);
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
      color: ${ve(s.textSecondary)};
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
      color: ${ve(s.textSecondary)};
      white-space: nowrap;
      line-height: 1.2;
    }

    .support-value.clickable {
      cursor: pointer;
    }

    .support-value.clickable:hover {
      text-decoration: underline;
      color: ${ve(s.textPrimary)};
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
      color: ${ve(s.textPrimary)};
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .tile-unit {
      font-size: 10px;
      font-weight: 400;
      color: ${ve(s.textSecondary)};
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
      background: ${ve(s.success)};
      box-shadow: 0 0 4px ${ve(s.success)};
    }

    .state-dot.off {
      background: ${ve(s.textSecondary)};
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
      background: ${ve(s.bgSecondary)};
      border-radius: 50%;
      font-size: 9px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .delete-btn:hover {
      background: ${ve(s.error)};
      color: #fff;
    }
  `;kt([g({type:Object})],Mi.prototype,"data",2);kt([g({type:Boolean})],Mi.prototype,"editMode",2);kt([g({type:String,reflect:!0})],Mi.prototype,"tileType",2);Mi=kt([E("oig-tile")],Mi);let Si=class extends D{constructor(){super(...arguments),this.tiles=[],this.editMode=!1,this.position="left"}render(){return this.tiles.length===0?c`<div class="empty-state">Žádné dlaždice</div>`:c`
      ${this.tiles.map(e=>c`
        <oig-tile
          .data=${e}
          .editMode=${this.editMode}
          .tileType=${e.config.type??"entity"}
          class="${e.isZero?"inactive":""}"
        ></oig-tile>
      `)}
    `}};Si.styles=T`
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
      gap: 6px;
      min-width: 0;
    }

    .empty-state {
      grid-column: 1 / -1;
      font-size: 12px;
      color: ${ve(s.textSecondary)};
      padding: 8px;
      text-align: center;
      opacity: 0.6;
    }
  `;kt([g({type:Array})],Si.prototype,"tiles",2);kt([g({type:Boolean})],Si.prototype,"editMode",2);kt([g({type:String,reflect:!0})],Si.prototype,"position",2);Si=kt([E("oig-tiles-container")],Si);var bb=Object.defineProperty,fb=Object.getOwnPropertyDescriptor,Ea=(e,t,i,r)=>{for(var n=r>1?void 0:r?fb(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&bb(t,i,n),n};const ge=Q,ns={Spotrebice:["fridge","fridge-outline","dishwasher","washing-machine","tumble-dryer","stove","microwave","coffee-maker","kettle","toaster","blender","food-processor","rice-cooker","slow-cooker","pressure-cooker","air-fryer","oven","range-hood"],Osvetleni:["lightbulb","lightbulb-outline","lamp","ceiling-light","floor-lamp","led-strip","led-strip-variant","wall-sconce","chandelier","desk-lamp","spotlight","light-switch"],"Vytapeni & Chlazeni":["thermometer","thermostat","radiator","radiator-disabled","heat-pump","air-conditioner","fan","hvac","fire","snowflake","fireplace","heating-coil"],"Energie & Baterie":["lightning-bolt","flash","battery","battery-charging","battery-50","battery-10","solar-panel","solar-power","meter-electric","power-plug","power-socket","ev-plug","transmission-tower","current-ac","current-dc"],"Auto & Doprava":["car","car-electric","car-battery","ev-station","ev-plug-type2","garage","garage-open","motorcycle","bicycle","scooter","bus","train","airplane"],Zabezpeceni:["door","door-open","lock","lock-open","shield-home","cctv","camera","motion-sensor","alarm-light","bell","eye","key","fingerprint","shield-check"],"Okna & Stineni":["window-closed","window-open","blinds","blinds-open","curtains","roller-shade","window-shutter","balcony","door-sliding"],"Media & Zabava":["television","speaker","speaker-wireless","music","volume-high","cast","chromecast","radio","headphones","microphone","gamepad","movie","spotify"],"Sit & IT":["router-wireless","wifi","access-point","lan","network","home-assistant","server","nas","cloud","ethernet","bluetooth","cellphone","tablet","laptop"],"Voda & Koupelna":["water","water-percent","water-boiler","water-pump","shower","toilet","faucet","pipe","bathtub","sink","water-heater","pool"],Pocasi:["weather-sunny","weather-cloudy","weather-night","weather-rainy","weather-snowy","weather-windy","weather-fog","weather-lightning","weather-hail","temperature","humidity","barometer"],"Ventilace & Kvalita vzduchu":["fan","air-filter","air-purifier","smoke-detector","co2","wind-turbine"],"Zahrada & Venku":["flower","tree","sprinkler","grass","garden-light","outdoor-lamp","grill","pool","hot-tub","umbrella","thermometer-lines"],Domacnost:["iron","vacuum","broom","mop","washing","basket","hanger","scissors"],"Notifikace & Stav":["information","help-circle","alert-circle","checkbox-marked-circle","check","close","minus","plus","arrow-up","arrow-down","refresh","sync","bell-ring"],Ovladani:["toggle-switch","power","play","pause","stop","skip-next","skip-previous","volume-up","volume-down","brightness-up","brightness-down"],"Cas & Planovani":["clock","timer","alarm","calendar","calendar-clock","schedule","history"],Ostatni:["home","cog","tools","wrench","hammer","chart-line","gauge","dots-vertical","menu","settings","account","logout"]};let gr=class extends D{constructor(){super(...arguments),this.isOpen=!1,this.searchQuery=""}get filteredCategories(){const e=this.searchQuery.trim().toLowerCase();if(!e)return ns;const t=Object.entries(ns).map(([i,r])=>{const n=r.filter(a=>a.toLowerCase().includes(e));return[i,n]}).filter(([,i])=>i.length>0);return Object.fromEntries(t)}open(){this.isOpen=!0}close(){this.isOpen=!1,this.searchQuery=""}onOverlayClick(e){e.target===e.currentTarget&&this.close()}onSearchInput(e){const t=e.target;this.searchQuery=(t==null?void 0:t.value)??""}onIconClick(e){this.dispatchEvent(new CustomEvent("icon-selected",{detail:{icon:`mdi:${e}`},bubbles:!0,composed:!0})),this.close()}render(){if(!this.isOpen)return null;const e=this.filteredCategories,t=Object.entries(e);return c`
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
            ${t.length===0?c`
              <div class="empty">Žádné ikony nenalezeny</div>
            `:t.map(([i,r])=>c`
              <div class="category">
                <div class="category-title">${i}</div>
                <div class="icon-grid">
                  ${r.map(n=>c`
                    <button class="icon-item" type="button" @click=${()=>this.onIconClick(n)}>
                      <span class="icon-emoji">${ye(`mdi:${n}`)}</span>
                      <span class="icon-name">${n}</span>
                    </button>
                  `)}
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}};gr.styles=T`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${ge(s.bgPrimary)} 35%, transparent);
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
      background: ${ge(s.cardBg)};
      box-shadow: ${ge(s.cardShadow)};
      border-radius: 14px;
      border: 1px solid ${ge(s.divider)};
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
      border-bottom: 1px solid ${ge(s.divider)};
      gap: 12px;
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${ge(s.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${ge(s.bgSecondary)};
      color: ${ge(s.textPrimary)};
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
      background: ${ge(s.divider)};
      transform: scale(1.05);
    }

    .search {
      padding: 12px 18px;
      border-bottom: 1px solid ${ge(s.divider)};
      background: ${ge(s.bgSecondary)};
    }

    .search input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${ge(s.divider)};
      background: ${ge(s.bgPrimary)};
      color: ${ge(s.textPrimary)};
      font-size: 13px;
      outline: none;
    }

    .search input::placeholder {
      color: ${ge(s.textSecondary)};
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
      color: ${ge(s.textSecondary)};
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
      background: ${ge(s.bgSecondary)};
      cursor: pointer;
      transition: transform 0.15s ease, border 0.2s ease, background 0.2s ease;
      text-align: center;
      font-size: 10px;
      color: ${ge(s.textSecondary)};
    }

    .icon-item:hover {
      background: ${ge(s.bgPrimary)};
      border-color: ${ge(s.accent)};
      transform: translateY(-2px);
      color: ${ge(s.textPrimary)};
    }

    .icon-emoji {
      font-size: 22px;
      line-height: 1;
      color: ${ge(s.textPrimary)};
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
      color: ${ge(s.textSecondary)};
      text-align: center;
      padding: 24px 0 12px;
    }
  `;Ea([g({type:Boolean,reflect:!0,attribute:"open"})],gr.prototype,"isOpen",2);Ea([H()],gr.prototype,"searchQuery",2);gr=Ea([E("oig-icon-picker")],gr);var vb=Object.defineProperty,yb=Object.getOwnPropertyDescriptor,Ce=(e,t,i,r)=>{for(var n=r>1?void 0:r?yb(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&vb(t,i,n),n};const as=Object.keys(Ts),xb=["#42a5f5","#43a047","#ffa726","#ef5350","#ab47bc","#26c6da","#8d6e63","#ec407a"],O=Q;let fe=class extends D{constructor(){super(...arguments),this.isOpen=!1,this.tileIndex=-1,this.tileSide="left",this.existingConfig=null,this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconSearch=""}loadTileConfig(e){var t,i;this.currentTab=e.type,e.type==="entity"?this.selectedEntityId=e.entity_id:this.selectedButtonEntityId=e.entity_id,this.label=e.label||"",this.icon=e.icon||"",this.color=e.color||"#03A9F4",this.action=e.action||"toggle",this.supportEntity1=((t=e.support_entities)==null?void 0:t.top_right)||"",this.supportEntity2=((i=e.support_entities)==null?void 0:i.bottom_right)||""}resetForm(){this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconSearch=""}handleClose(){this.isOpen=!1,this.resetForm(),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}getEntities(){const e=ut();return e?e.getAll():{}}getEntityItems(e,t){const i=t.trim().toLowerCase(),r=this.getEntities();return Object.entries(r).filter(([a])=>e.some(o=>a.startsWith(o))).map(([a,o])=>{const l=this.getAttributeValue(o,"friendly_name")||a,d=this.getAttributeValue(o,"unit_of_measurement"),p=this.getAttributeValue(o,"icon");return{id:a,name:l,value:o.state,unit:d,icon:p,state:o}}).filter(a=>i?a.name.toLowerCase().includes(i)||a.id.toLowerCase().includes(i):!0).sort((a,o)=>a.name.localeCompare(o.name))}getSupportEntities(e){const t=e.trim().toLowerCase();if(!t)return[];const i=this.getEntities();return Object.entries(i).map(([r,n])=>{const a=this.getAttributeValue(n,"friendly_name")||r,o=this.getAttributeValue(n,"unit_of_measurement"),l=this.getAttributeValue(n,"icon");return{id:r,name:a,value:n.state,unit:o,icon:l,state:n}}).filter(r=>r.name.toLowerCase().includes(t)||r.id.toLowerCase().includes(t)).sort((r,n)=>r.name.localeCompare(n.name)).slice(0,20)}getDisplayIcon(e){return ye(e||"mdi:gauge")}getColorForEntity(e){switch(e.split(".")[0]){case"sensor":return"#03A9F4";case"binary_sensor":return"#4CAF50";case"switch":return"#FFC107";case"light":return"#FF9800";case"fan":return"#00BCD4";case"input_boolean":return"#9C27B0";default:return"#03A9F4"}}applyEntityDefaults(e){if(!e)return;const i=this.getEntities()[e];if(!i)return;this.label||(this.label=this.getAttributeValue(i,"friendly_name"));const r=this.getAttributeValue(i,"icon");!this.icon&&r&&(this.icon=r),this.color=this.getColorForEntity(e)}handleEntitySelect(e){this.selectedEntityId=e,this.applyEntityDefaults(e)}handleButtonEntitySelect(e){this.selectedButtonEntityId=e,this.applyEntityDefaults(e)}handleSupportInput(e,t){const i=t.trim();e===1?(this.supportSearch1=t,this.showSupportList1=!!i,i||(this.supportEntity1="")):(this.supportSearch2=t,this.showSupportList2=!!i,i||(this.supportEntity2=""))}handleSupportSelect(e,t){const i=t.name||t.id;e===1?(this.supportEntity1=t.id,this.supportSearch1=i,this.showSupportList1=!1):(this.supportEntity2=t.id,this.supportSearch2=i,this.showSupportList2=!1)}getSupportInputValue(e,t){if(e)return e;if(!t)return"";const i=this.getEntities()[t];return i&&this.getAttributeValue(i,"friendly_name")||t}getAttributeValue(e,t){var r;const i=(r=e.attributes)==null?void 0:r[t];return i==null?"":String(i)}handleSave(){const e=this.currentTab==="entity"?this.selectedEntityId:this.selectedButtonEntityId;if(!e){window.alert("Vyberte entitu");return}const t={top_right:this.supportEntity1||void 0,bottom_right:this.supportEntity2||void 0},i={type:this.currentTab,entity_id:e,label:this.label||void 0,icon:this.icon||void 0,color:this.color||void 0,action:this.currentTab==="button"?this.action:void 0,support_entities:t};this.dispatchEvent(new CustomEvent("tile-saved",{detail:{index:this.tileIndex,side:this.tileSide,config:i},bubbles:!0,composed:!0})),this.handleClose()}renderEntityList(e,t,i,r){const n=this.getEntityItems(e,t);return n.length===0?c`<div class="support-empty">Žádné entity nenalezeny</div>`:c`
      ${n.map(a=>c`
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
    `}renderSupportList(e,t){const i=this.getSupportEntities(e);return i.length===0?c`<div class="support-empty">Žádné entity nenalezeny</div>`:c`
      ${i.map(r=>c`
        <div
          class="support-item"
          @mousedown=${()=>this.handleSupportSelect(t,r)}
        >
          <div class="support-name">${r.name}</div>
          <div class="support-value">${r.value} ${r.unit}</div>
        </div>
      `)}
    `}get isButtonType(){return this.currentTab==="button"}get selectedId(){return this.isButtonType?this.selectedButtonEntityId:this.selectedEntityId}get entityDomains(){return this.isButtonType?["switch.","light.","fan.","input_boolean."]:["sensor.","binary_sensor."]}get entitySearch(){return this.isButtonType?this.buttonSearchText:this.entitySearchText}setEntitySearch(e){this.isButtonType?this.buttonSearchText=e:this.entitySearchText=e}selectEntity(e){this.isButtonType?this.handleButtonEntitySelect(e):this.handleEntitySelect(e)}renderPreview(){const e=this.selectedId,t=e?this.getEntities()[e]:null,i=this.label||(t?this.getAttributeValue(t,"friendly_name"):"")||e||"Nová dlaždice",r=t?String(t.state):"—",n=t?this.getAttributeValue(t,"unit_of_measurement"):"",a=this.icon||(this.isButtonType?"⚡":"📊");return c`
      <div class="pvwrap">
        <span class="pvlbl">náhled</span>
        <div class="ptile" style="--pc:${this.color}">
          <div class="pi">${ye(a)}</div>
          <div class="pm">
            <div class="pn">${i}</div>
            <div class="pv">${r}${n?c` <small>${n}</small>`:""}</div>
          </div>
        </div>
      </div>
    `}renderIconGrid(){const e=this.iconSearch.trim().toLowerCase(),t=e?as.filter(i=>i.includes(e)):as;return c`
      <input
        class="input"
        type="text"
        placeholder="🔍 Hledat ikonu..."
        .value=${this.iconSearch}
        @input=${i=>{this.iconSearch=i.target.value}}
      />
      <div class="igrid">
        ${t.length===0?c`<div class="igrid-empty">Nic nenalezeno</div>`:t.map(i=>c`
            <button
              class="ig ${this.icon===`mdi:${i}`?"sel":""}"
              type="button"
              title=${i}
              @click=${()=>{this.icon=`mdi:${i}`}}
            >${ye(`mdi:${i}`)}</button>
          `)}
      </div>
    `}renderColorSwatches(){return c`
      <div class="sw">
        ${xb.map(e=>c`
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
    `}render(){if(!this.isOpen)return null;const e=this.tileIndex>=0||!!this.existingConfig;return c`
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
                ${ye("mdi:chart-box")} Senzor
              </button>
              <button class="${this.isButtonType?"on":""}" type="button"
                @click=${()=>{this.currentTab="button",this.color==="#03A9F4"&&(this.color="#FFC107")}}>
                ${ye("mdi:flash")} Tlačítko
              </button>
            </div>

            ${this.renderPreview()}

            <div class="sec">
              <div class="sect"><span class="n">1</span> Entita</div>
              ${this.isButtonType?c`
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
                  ${this.showSupportList1?c`<div class="support-list">${this.renderSupportList(this.supportSearch1,1)}</div>`:null}
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
                  ${this.showSupportList2?c`<div class="support-list">${this.renderSupportList(this.supportSearch2,2)}</div>`:null}
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
    `}};fe.styles=T`
    :host {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      font-family: ${O(s.fontFamily)};
    }

    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${O(s.bgPrimary)} 35%, transparent);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .dialog {
      width: min(460px, 100%);
      max-height: 88vh;
      background: ${O(s.cardBgSolid)};
      border: 1px solid ${O(s.divider)};
      border-radius: 16px;
      box-shadow: ${O(s.cardShadow)};
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
      border-bottom: 1px solid ${O(s.divider)};
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${O(s.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${O(s.bgSecondary)};
      color: ${O(s.textPrimary)};
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
      background: ${O(s.divider)};
      transform: scale(1.05);
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 18px;
      background: ${O(s.bgSecondary)};
      border-bottom: 1px solid ${O(s.divider)};
    }

    .tab-btn {
      border: 1px solid transparent;
      background: ${O(s.cardBg)};
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: ${O(s.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: border 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }

    .tab-btn.active {
      border-color: ${O(s.accent)};
      color: ${O(s.textPrimary)};
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
      padding: 9px; border-radius: 10px; border: 1px solid ${O(s.divider)};
      background: rgba(0,0,0,.18); color: ${O(s.textSecondary)};
      font-weight: 700; font-size: 13px; cursor: pointer; font-family: inherit;
    }
    .seg button.on { border-color: ${O(s.accent)}; background: color-mix(in srgb, ${O(s.accent)} 16%, transparent); color: ${O(s.textPrimary)}; }
    .seg .oig-mdi { width: 16px; height: 16px; }

    /* ── live preview ── */
    .pvwrap { display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,.22); border: 1px dashed ${O(s.divider)}; border-radius: 12px; padding: 12px; }
    .pvlbl { font-size: 8px; font-weight: 800; opacity: .45; text-transform: uppercase; letter-spacing: .5px; writing-mode: vertical-rl; transform: rotate(180deg); }
    .ptile { flex: 1; background: linear-gradient(160deg, #222a40, #1a2034); border-left: 3px solid var(--pc, ${O(s.accent)}); border-radius: 10px; padding: 9px 11px; display: flex; align-items: center; gap: 9px; }
    .ptile .pi { width: 30px; height: 30px; border-radius: 8px; background: color-mix(in srgb, var(--pc, ${O(s.accent)}) 22%, transparent); display: grid; place-items: center; color: var(--pc, ${O(s.accent)}); font-size: 18px; }
    .ptile .pi .oig-mdi { width: 18px; height: 18px; }
    .ptile .pm { flex: 1; min-width: 0; }
    .ptile .pn { font-size: 12px; font-weight: 700; opacity: .8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ptile .pv { font-size: 17px; font-weight: 800; }
    .ptile .pv small { font-size: 11px; opacity: .6; }

    /* ── section ── */
    .sec { display: flex; flex-direction: column; gap: 8px; }
    .sect { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; opacity: .6; text-transform: uppercase; letter-spacing: .4px; }
    .sect .n { width: 17px; height: 17px; border-radius: 50%; background: ${O(s.accent)}; color: #06121f; display: grid; place-items: center; font-size: 10px; }
    .sect .opt { opacity: .7; font-weight: 600; text-transform: none; letter-spacing: 0; }

    /* ── inline icon grid ── */
    .igrid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; max-height: 132px; overflow: auto; background: rgba(0,0,0,.18); border: 1px solid ${O(s.divider)}; border-radius: 9px; padding: 7px; }
    .ig { aspect-ratio: 1; display: grid; place-items: center; border-radius: 7px; cursor: pointer; border: 1px solid transparent; background: none; color: ${O(s.textPrimary)}; }
    .ig:hover { background: rgba(255,255,255,.06); }
    .ig.sel { border-color: ${O(s.accent)}; background: color-mix(in srgb, ${O(s.accent)} 16%, transparent); }
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
      color: ${O(s.textSecondary)};
      font-weight: 600;
    }

    .input,
    select,
    .color-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${O(s.divider)};
      background: ${O(s.bgPrimary)};
      color: ${O(s.textPrimary)};
      font-size: 12px;
      outline: none;
      transition: border 0.2s ease, box-shadow 0.2s ease;
    }

    .input::placeholder {
      color: ${O(s.textSecondary)};
    }

    .input:focus,
    select:focus,
    .color-input:focus {
      border-color: ${O(s.accent)};
      box-shadow: 0 0 0 2px color-mix(in srgb, ${O(s.accent)} 20%, transparent);
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
      border: 1px dashed ${O(s.divider)};
      display: grid;
      place-items: center;
      font-size: 22px;
      cursor: pointer;
      background: ${O(s.bgSecondary)};
      transition: border 0.2s ease, transform 0.2s ease;
    }

    .icon-preview:hover {
      border-color: ${O(s.accent)};
      transform: translateY(-1px);
    }

    .icon-field {
      font-size: 11px;
    }

    .icon-btn {
      border: none;
      background: ${O(s.bgSecondary)};
      color: ${O(s.textPrimary)};
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .divider {
      height: 1px;
      background: ${O(s.divider)};
      margin: 6px 0;
      opacity: 0.8;
    }

    .entity-list {
      border: 1px solid ${O(s.divider)};
      border-radius: 12px;
      overflow: hidden;
      max-height: 200px;
      overflow-y: auto;
      background: ${O(s.bgPrimary)};
    }

    .entity-item {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid ${O(s.divider)};
      cursor: pointer;
      align-items: center;
      transition: background 0.2s ease;
    }

    .entity-item:last-child {
      border-bottom: none;
    }

    .entity-item:hover {
      background: ${O(s.bgSecondary)};
    }

    .entity-item.selected {
      background: color-mix(in srgb, ${O(s.accent)} 16%, transparent);
      border-left: 3px solid ${O(s.accent)};
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
      color: ${O(s.textPrimary)};
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-sub {
      font-size: 10px;
      color: ${O(s.textSecondary)};
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
      background: ${O(s.cardBg)};
      border: 1px solid ${O(s.divider)};
      border-radius: 12px;
      z-index: 10;
      max-height: 180px;
      overflow-y: auto;
      box-shadow: ${O(s.cardShadow)};
    }

    .support-item {
      padding: 10px 12px;
      border-bottom: 1px solid ${O(s.divider)};
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
      background: ${O(s.bgSecondary)};
    }

    .support-name {
      font-size: 12px;
      color: ${O(s.textPrimary)};
      font-weight: 600;
    }

    .support-value {
      font-size: 10px;
      color: ${O(s.textSecondary)};
    }

    .support-empty {
      padding: 12px;
      font-size: 11px;
      color: ${O(s.textSecondary)};
      text-align: center;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px 18px;
      border-top: 1px solid ${O(s.divider)};
      background: ${O(s.bgSecondary)};
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
      background: ${O(s.bgPrimary)};
      color: ${O(s.textPrimary)};
      border: 1px solid ${O(s.divider)};
    }

    .btn-primary {
      background: ${O(s.accent)};
      color: #fff;
      box-shadow: 0 6px 14px color-mix(in srgb, ${O(s.accent)} 40%, transparent);
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
  `;Ce([g({type:Boolean,reflect:!0,attribute:"open"})],fe.prototype,"isOpen",2);Ce([g({type:Number})],fe.prototype,"tileIndex",2);Ce([g({attribute:!1})],fe.prototype,"tileSide",2);Ce([g({attribute:!1})],fe.prototype,"existingConfig",2);Ce([H()],fe.prototype,"currentTab",2);Ce([H()],fe.prototype,"entitySearchText",2);Ce([H()],fe.prototype,"buttonSearchText",2);Ce([H()],fe.prototype,"selectedEntityId",2);Ce([H()],fe.prototype,"selectedButtonEntityId",2);Ce([H()],fe.prototype,"label",2);Ce([H()],fe.prototype,"icon",2);Ce([H()],fe.prototype,"color",2);Ce([H()],fe.prototype,"action",2);Ce([H()],fe.prototype,"supportEntity1",2);Ce([H()],fe.prototype,"supportEntity2",2);Ce([H()],fe.prototype,"supportSearch1",2);Ce([H()],fe.prototype,"supportSearch2",2);Ce([H()],fe.prototype,"showSupportList1",2);Ce([H()],fe.prototype,"showSupportList2",2);Ce([H()],fe.prototype,"iconSearch",2);fe=Ce([E("oig-tile-dialog")],fe);var wb=Object.defineProperty,_b=Object.getOwnPropertyDescriptor,le=(e,t,i,r)=>{for(var n=r>1?void 0:r?_b(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&wb(t,i,n),n};const ue=Q,os=new URLSearchParams(window.location.search),Ot=os.get("sn")||os.get("inverter_sn")||"",ss=`sensor.oig_${Ot}_`,$b=[{id:"flow",label:"Toky",icon:"mdi:lightning-bolt"},{id:"pricing",label:"Ceny",icon:"mdi:cash"},{id:"boiler",label:"Bojler",icon:"mdi:water-boiler"},{id:"settings",label:"Nastavení",icon:"mdi:cog"}];let ie=class extends D{constructor(){super(...arguments),this.hass=null,this.loading=!0,this.error=null,this.activeTab="flow",this.editMode=!1,this.time="",this.flowData=_a,this.pricingData=null,this.pricingLoading=!1,this.boilerState=null,this.boilerLoading=!1,this.boilerV2Data=null,this.boilerConfig=null,this.boilerRefreshTimer=null,this.boxHasHome56=!1,this.analyticsData=ho,this.chmuData=en,this.weatherData=tn,this.chmuModalOpen=!1,this.weatherRefreshTimer=null,this.timelineTab="today",this.timelineData=null,this.tilesConfig=null,this.tilesLeft=[],this.tilesRight=[],this.tileDialogOpen=!1,this.editingTileIndex=-1,this.editingTileSide="left",this.editingTileConfig=null,this.entityStore=null,this.timeInterval=null,this.stateWatcherUnsub=null,this.tileEntityUnsubs=[],this.pricingDirty=!1,this.timelineDirty=!1,this.analyticsDirty=!1,this.boilerDirty=!1,this.reconnecting=!1,this.throttledUpdateFlow=Qn(()=>this.updateFlowData(),500),this.throttledUpdateSensors=Qn(()=>this.updateSensorData(),1e3),this.throttledRefreshDerivedData=Qn(()=>this.refreshDerivedData(),5e3),this.onPageShow=()=>{this.rebindHassContext()},this.onDocumentVisibilityChange=()=>{document.visibilityState==="visible"&&this.rebindHassContext()}}get boilerLang(){return nd(this.hass)}connectedCallback(){super.connectedCallback(),window.addEventListener("pageshow",this.onPageShow),document.addEventListener("visibilitychange",this.onDocumentVisibilityChange),this.initApp(),this.startTimeUpdate()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("pageshow",this.onPageShow),document.removeEventListener("visibilitychange",this.onDocumentVisibilityChange),this.cleanup()}updated(e){e.has("hass")&&!e.has("loading")&&this.rebindHassContext(),e.has("activeTab")&&(this.activeTab==="pricing"&&(!this.pricingData||this.pricingDirty)&&this.loadPricingData(),this.activeTab==="pricing"&&(this.analyticsData===ho||this.analyticsDirty)&&this.loadAnalyticsAsync(),this.activeTab==="pricing"&&(!this.timelineData||this.timelineDirty)&&this.loadTimelineTabData(this.timelineTab),this.activeTab==="boiler"&&(!this.boilerState||this.boilerDirty)&&this.loadBoilerDataAsync())}async initApp(){try{const e=await ee.getHass();if(!e)throw new Error("Cannot access Home Assistant context");this.hass=e,this.entityStore=Yl(e,Ot),await Ft.start({getHass:()=>ee.getHassSync(),prefixes:[ss]}),this.stateWatcherUnsub=Ft.onEntityChange((t,i)=>{this.syncHassState(t,i),this.throttledUpdateFlow(),this.throttledUpdateSensors(),this.throttledRefreshDerivedData()}),de.start(),this.updateFlowData(),this.updateSensorData(),this.loadPricingData(),this.loadBoilerDataAsync(),this.loadAnalyticsAsync(),this.loadTilesAsync(),this.loadBoxHasHome56(),this.loadWeather(),this.weatherRefreshTimer=window.setInterval(()=>{document.visibilityState!=="hidden"&&this.loadWeather()},15*60*1e3),this.boilerRefreshTimer=window.setInterval(()=>{this.activeTab==="boiler"&&document.visibilityState!=="hidden"&&this.loadBoilerDataAsync()},3e4),this.loading=!1,L.info("App initialized",{entities:Object.keys(e.states||{}).length,inverterSn:Ot})}catch(e){this.error=e.message,this.loading=!1,L.error("App init failed",e)}}cleanup(){var e,t;(e=this.stateWatcherUnsub)==null||e.call(this),this.stateWatcherUnsub=null,Ft.stop(),de.stop(),this.tileEntityUnsubs.forEach(i=>i()),this.tileEntityUnsubs=[],(t=this.entityStore)==null||t.destroy(),this.entityStore=null,this.timeInterval!==null&&(clearInterval(this.timeInterval),this.timeInterval=null),this.boilerRefreshTimer!==null&&(clearInterval(this.boilerRefreshTimer),this.boilerRefreshTimer=null),this.weatherRefreshTimer!==null&&(clearInterval(this.weatherRefreshTimer),this.weatherRefreshTimer=null)}async rebindHassContext(){var e;if(!this.reconnecting){this.reconnecting=!0;try{const t=await ee.refreshHass();if(!t)return;this.hass=t,(e=this.entityStore)==null||e.updateHass(t),await Ft.start({getHass:()=>ee.getHassSync(),prefixes:[ss]}),this.updateFlowData(),this.updateSensorData()}catch(t){L.error("Failed to rebind hass context",t)}finally{this.reconnecting=!1}}}updateFlowData(){var e;if(this.hass)try{const t=((e=this.entityStore)==null?void 0:e.getAll())??this.hass;this.flowData=mc(t,Ot)}catch(t){L.error("Failed to extract flow data",t)}}updateSensorData(){if(this.chmuData=hd(Ot),this.activeTab==="pricing"&&(this.analyticsData={...this.analyticsData,...cd()}),this.tilesConfig){const e=Ri(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}}updateTilesImmediate(){if(!this.tilesConfig)return;const e=Ri(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}subscribeTileEntities(){if(this.tileEntityUnsubs.forEach(t=>t()),this.tileEntityUnsubs=[],!this.tilesConfig||!this.entityStore)return;const e=new Set;[...this.tilesConfig.tiles_left,...this.tilesConfig.tiles_right].forEach(t=>{var i,r;t&&(e.add(t.entity_id),(i=t.support_entities)!=null&&i.top_right&&e.add(t.support_entities.top_right),(r=t.support_entities)!=null&&r.bottom_right&&e.add(t.support_entities.bottom_right))});for(const t of e){const i=this.entityStore.subscribe(t,()=>{this.updateTilesImmediate()});this.tileEntityUnsubs.push(i)}}async loadPricingData(){if(!(!this.hass||this.pricingLoading)){this.pricingLoading=!0;try{const e=await Wi(()=>Hc(this.hass));this.pricingData=e,this.pricingDirty=!1}catch(e){L.error("Failed to load pricing data",e)}finally{this.pricingLoading=!1}}}async loadBoilerDataAsync(){if(!(!this.hass||this.boilerLoading)){this.boilerLoading=!0;try{const e=await Wi(()=>rd(this.hass));this.boilerState=e.state,this.boilerV2Data=e.v2Data,this.boilerConfig=e.config,this.boilerDirty=!1,this.boilerRefreshTimer||(this.boilerRefreshTimer=window.setInterval(()=>this.loadBoilerDataAsync(),5*60*1e3))}catch(e){L.error("Failed to load boiler data",e)}finally{this.boilerLoading=!1}}}async loadAnalyticsAsync(){try{this.analyticsData=await Wi(()=>ld(Ot)),this.analyticsDirty=!1}catch(e){L.error("Failed to load analytics",e)}}async loadBoxHasHome56(){var e;try{const t=await ba();this.boxHasHome56=((e=t==null?void 0:t.boiler)==null?void 0:e.box_has_home56)===!0}catch{}}async loadTilesAsync(){try{this.tilesConfig=await Wi(()=>kd());const e=Ri(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right,this.subscribeTileEntities()}catch(e){L.error("Failed to load tiles config",e)}}async loadTimelineTabData(e){try{this.timelineData=await Wi(()=>_d(Ot,e)),this.timelineDirty=!1}catch(t){L.error(`Failed to load timeline tab: ${e}`,t)}}syncHassState(e,t){if(this.hass){if(this.hass.states||(this.hass.states={}),t){this.hass.states[e]=t;return}delete this.hass.states[e]}}refreshDerivedData(){if(this.pricingDirty=!0,this.timelineDirty=!0,this.analyticsDirty=!0,this.boilerDirty=!0,this.activeTab==="pricing"){yc(),this.loadPricingData(),this.loadTimelineTabData(this.timelineTab),this.loadAnalyticsAsync();return}this.activeTab==="boiler"&&this.loadBoilerDataAsync()}startTimeUpdate(){const e=()=>{this.time=new Date().toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})};e(),this.timeInterval=window.setInterval(e,1e3)}onTabChange(e){this.activeTab=e.detail.tabId}onGridChargingOpen(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-grid-charging-dialog");e==null||e.show()}onEditClick(){this.editMode=!this.editMode}onResetClick(){var i,r;const e=(i=this.shadowRoot)==null?void 0:i.querySelector("oig-flow-canvas");e!=null&&e.resetLayout&&e.resetLayout();const t=(r=this.shadowRoot)==null?void 0:r.querySelector("oig-grid");t&&t.resetLayout()}async loadWeather(){try{this.weatherData=await yd()}catch{}}onChmuBadgeClick(){this.loadWeather(),this.chmuModalOpen=!0}onChmuModalClose(){this.chmuModalOpen=!1}onTimelineTabChange(e){this.timelineTab=e.detail.tab,this.loadTimelineTabData(e.detail.tab)}onTimelineRefresh(){this.loadTimelineTabData(this.timelineTab)}onAddTile(){this.editingTileIndex=-1,this.editingTileSide="left",this.editingTileConfig=null,this.tileDialogOpen=!0}onEditTile(e){const{entityId:t}=e.detail;let i=-1,r="left",n=null;if(this.tilesConfig){const a=this.tilesConfig.tiles_left.findIndex(o=>o&&o.entity_id===t);if(a>=0)i=a,r="left",n=this.tilesConfig.tiles_left[a];else{const o=this.tilesConfig.tiles_right.findIndex(l=>l&&l.entity_id===t);o>=0&&(i=o,r="right",n=this.tilesConfig.tiles_right[o])}}this.editingTileIndex=i,this.editingTileSide=r,this.editingTileConfig=n,this.tileDialogOpen=!0,n&&requestAnimationFrame(()=>{var o;const a=(o=this.shadowRoot)==null?void 0:o.querySelector("oig-tile-dialog");a==null||a.loadTileConfig(n)})}onDeleteTile(e){const{entityId:t}=e.detail;if(!this.tilesConfig||!t)return;const i={...this.tilesConfig};i.tiles_left=i.tiles_left.map(n=>n&&n.entity_id===t?null:n),i.tiles_right=i.tiles_right.map(n=>n&&n.entity_id===t?null:n),this.tilesConfig=i;const r=Ri(i);this.tilesLeft=r.left,this.tilesRight=r.right,vo(i),this.subscribeTileEntities()}onTileSaved(e){const{index:t,side:i,config:r}=e.detail;if(!this.tilesConfig)return;const n={...this.tilesConfig},a=i==="left"?[...n.tiles_left]:[...n.tiles_right];if(t>=0&&t<a.length)a[t]=r;else{const l=a.findIndex(d=>d===null);l>=0?a[l]=r:a.push(r)}i==="left"?n.tiles_left=a:n.tiles_right=a,this.tilesConfig=n;const o=Ri(n);this.tilesLeft=o.left,this.tilesRight=o.right,vo(n),this.subscribeTileEntities()}onTileDialogClose(){this.tileDialogOpen=!1,this.editingTileConfig=null,this.editingTileIndex=-1}_renderBoilerTabSafe(){try{return this._buildBoilerTabContent()}catch(e){return L.error("Boiler tab render failed",e),c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${"render_failed"}></oig-boiler-unavailable-state>`}}_buildBoilerTabContent(){var o,l,d;const e=this.boilerV2Data;if(this.boilerLoading&&!e)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="loading" message=""></oig-boiler-unavailable-state>`;if(e!=null&&e.loadError)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${e.loadError}></oig-boiler-unavailable-state>`;const t=(((o=e==null?void 0:e.explanation)==null?void 0:o.degradedReasons)??[]).filter(p=>p!=="config_profile_unavailable");if(e&&e.status===null&&t.length>0)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="degraded" .message=${t.join(", ")}></oig-boiler-unavailable-state>`;if(!e)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="unavailable" message="Data bojleru nejsou k dispozici"></oig-boiler-unavailable-state>`;const i=((l=e.explanation)==null?void 0:l.dataAgeSecs)??null,r=i!==null&&i>600,n=(((d=e.status)==null?void 0:d.degraded)??!1)&&t.length>0,a=r||n?c`<div class="boiler-status-chip-row">
          <span class="boiler-badge boiler-badge--age" data-testid="boiler-stale-chip">
            ${n?"⚠ Plán v degradovaném režimu":`⚠ Data stará ${Math.round((i??0)/60)} min`}
          </span>
        </div>`:w;return c`
      ${a}
      <div class="boiler-stage">
        <oig-boiler-metric-panel panelType="source" .data=${e} .config=${this.boilerConfig} .lang=${this.boilerLang}></oig-boiler-metric-panel>
        <oig-boiler-v2-shell .data=${e} .config=${this.boilerConfig} .lang=${this.boilerLang}></oig-boiler-v2-shell>
        <oig-boiler-metric-panel panelType="comfort" .data=${e} .config=${this.boilerConfig} .lang=${this.boilerLang}></oig-boiler-metric-panel>
      </div>
      <oig-boiler-demand-map
        .data=${e.demandMap??null}
        .lang=${this.boilerLang}
      ></oig-boiler-demand-map>
      <oig-boiler-plan-strip
        .slots=${e.planSlots}
        .demandMap=${e.demandMap??null}
        .circulationRuns=${e.circulationRuns}
        .legionella=${e.legionella??null}
        .planSummary=${e.planSummary??null}
        .lang=${this.boilerLang}
        .altSourceType=${e.altSourceType??null}
      ></oig-boiler-plan-strip>
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
    `}render(){var t;if(this.loading)return c`<div class="loading"><div class="spinner"></div><span>Načítání...</span></div>`;if(this.error)return c`
        <div class="error">
          <h2>Chyba připojení</h2>
          <p>${this.error}</p>
          <button @click=${()=>{this.error=null,this.loading=!0,this.initApp()}}>Zkusit znovu</button>
        </div>
      `;const e=this.chmuData.effectiveSeverity>0?this.chmuData.warningsCount:0;return c`
      <oig-theme-provider>
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
          .tabs=${$b}
          .activeTab=${this.activeTab}
          @tab-change=${this.onTabChange}
        ></oig-tabs>

        <main>
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
                      ${this.tilesLeft.length+this.tilesRight.length>0?c`
                        <oig-tiles-container
                          .tiles=${[...this.tilesLeft,...this.tilesRight]}
                          .editMode=${this.editMode}
                          @edit-tile=${this.onEditTile}
                          @delete-tile=${this.onDeleteTile}
                        ></oig-tiles-container>
                      `:c`
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
                ${this.pricingLoading?c`
                  <div class="tab-loading-overlay">
                    <div class="spinner spinner--small"></div>
                    <span>Načítání cen...</span>
                  </div>
                `:w}
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
               ${this.boilerLoading&&this.boilerV2Data?c`
                 <div class="tab-loading-overlay">
                   <div class="spinner spinner--small"></div>
                   <span>Načítání bojleru...</span>
                 </div>
               `:w}
               ${this._renderBoilerTabSafe()}
             </div>

             <!-- ===== SETTINGS TAB ===== -->
             <div class="tab-content ${this.activeTab==="settings"?"active":""}">
               ${this.activeTab==="settings"?c`<oig-settings .hassStates=${((t=this.hass)==null?void 0:t.states)??null}></oig-settings>`:w}
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
      </oig-theme-provider>
    `}};ie.styles=T`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      font-family: ${ue(s.fontFamily)};
      color: ${ue(s.textPrimary)};
      background: ${ue(s.bgPrimary)};
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
      color: ${ue(s.textSecondary)};
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid ${ue(s.divider)};
      border-top-color: ${ue(s.accent)};
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
      color: ${ue(s.error)};
      text-align: center;
      animation: fadeIn 0.3s ease;
    }

    .error h2 {
      margin-bottom: 8px;
    }

    .error button {
      margin-top: 12px;
      padding: 8px 16px;
      background: ${ue(s.accent)};
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
      background: ${ue(s.bgSecondary)};
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
      background: ${ue(s.cardBg)};
      border-radius: 16px;
      box-shadow: ${ue(s.cardShadow)};
      overflow: hidden;
    }

    .control-stack__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 13px 16px 11px;
      border-bottom: 1px solid ${ue(s.divider)};
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${ue(s.textPrimary)};
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
      border: 1px solid color-mix(in srgb, ${ue(s.accent)} 45%, transparent);
      background: color-mix(in srgb, ${ue(s.accent)} 12%, transparent);
      color: ${ue(s.accent)};
      border-radius: 8px;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.15s ease;
    }

    .control-stack__add:hover {
      background: color-mix(in srgb, ${ue(s.accent)} 22%, transparent);
      transform: translateY(-1px);
    }

    .control-stack__tiles-empty {
      font-size: 12px;
      color: ${ue(s.textSecondary)};
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
      background: ${ue(s.cardBg)};
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      font-size: 12px;
      color: ${ue(s.textSecondary)};
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
      background: ${ue(s.cardBg)};
      border: 1px solid ${ue(s.divider)};
      border-radius: 8px;
      font-size: 13px;
      color: ${ue(s.textSecondary)};
    }

    .boiler-setup-guide__icon {
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
    }

    .boiler-setup-guide__text strong {
      display: block;
      color: ${ue(s.textPrimary)};
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
  `;le([g({type:Object})],ie.prototype,"hass",2);le([H()],ie.prototype,"loading",2);le([H()],ie.prototype,"error",2);le([H()],ie.prototype,"activeTab",2);le([H()],ie.prototype,"editMode",2);le([H()],ie.prototype,"time",2);le([H()],ie.prototype,"flowData",2);le([H()],ie.prototype,"pricingData",2);le([H()],ie.prototype,"pricingLoading",2);le([H()],ie.prototype,"boilerState",2);le([H()],ie.prototype,"boilerLoading",2);le([H()],ie.prototype,"boilerV2Data",2);le([H()],ie.prototype,"boilerConfig",2);le([H()],ie.prototype,"boxHasHome56",2);le([H()],ie.prototype,"analyticsData",2);le([H()],ie.prototype,"chmuData",2);le([H()],ie.prototype,"weatherData",2);le([H()],ie.prototype,"chmuModalOpen",2);le([H()],ie.prototype,"timelineTab",2);le([H()],ie.prototype,"timelineData",2);le([H()],ie.prototype,"tilesConfig",2);le([H()],ie.prototype,"tilesLeft",2);le([H()],ie.prototype,"tilesRight",2);le([H()],ie.prototype,"tileDialogOpen",2);le([H()],ie.prototype,"editingTileIndex",2);le([H()],ie.prototype,"editingTileSide",2);le([H()],ie.prototype,"editingTileConfig",2);ie=le([E("oig-app")],ie);L.info("V2 starting",{version:"2.0.0-beta.1"});Wl();async function kb(){try{const e=await Rl(),t=document.getElementById("app");t&&(t.innerHTML="",t.appendChild(e)),L.info("V2 mounted successfully")}catch(e){L.error("V2 bootstrap failed",e);const t=document.getElementById("app");t&&(t.innerHTML=`
        <div style="padding: 20px; font-family: system-ui;">
          <h2>Chyba načítání</h2>
          <p>Nepodařilo se načíst dashboard. Zkuste obnovit stránku.</p>
          <details>
            <summary>Detaily</summary>
            <pre>${e.message}</pre>
          </details>
        </div>`)}}kb();
//# sourceMappingURL=index.js.map
