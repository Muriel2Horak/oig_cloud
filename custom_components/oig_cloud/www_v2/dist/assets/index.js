var Ys=Object.defineProperty;var Zs=(e,t,i)=>t in e?Ys(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var L=(e,t,i)=>Zs(e,typeof t!="symbol"?t+"":t,i);import{f as Qs,u as Xs,i as z,a as E,b as c,r as Q,w as Y,A as w,E as Js}from"./vendor.js";import{C as wn,a as jo,L as Ro,P as Ho,b as Wo,i as Vo,p as Ko,c as qo,d as el,T as tl,e as il,B as rl,f as nl,g as al,h as ol,j as sl,k as Go}from"./charts.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&r(o)}).observe(document,{childList:!0,subtree:!0});function i(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(n){if(n.ep)return;n.ep=!0;const a=i(n);fetch(n.href,a)}})();const Tt="[V2]";function ll(){return new Date().toISOString().substr(11,12)}function Nr(e,t){const i=ll(),r=e.toUpperCase().padEnd(5);return`${i} ${r} ${t}`}const P={debug(e,t){typeof window<"u"&&window.OIG_DEBUG&&console.debug(Tt,Nr("debug",e),t??"")},info(e,t){console.info(Tt,Nr("info",e),t??"")},warn(e,t){console.warn(Tt,Nr("warn",e),t??"")},error(e,t,i){const r=t?{error:t.message,stack:t.stack,...i}:i;console.error(Tt,Nr("error",e),r??"")},time(e){console.time(`${Tt} ${e}`)},timeEnd(e){console.timeEnd(`${Tt} ${e}`)},group(e){console.group(`${Tt} ${e}`)},groupEnd(){console.groupEnd()}};function cl(){window.addEventListener("error",dl),window.addEventListener("unhandledrejection",pl),P.debug("Error handling setup complete")}function dl(e){const t=e.error||new Error(e.message);P.error("Uncaught error",t,{filename:e.filename,lineno:e.lineno,colno:e.colno}),e.preventDefault()}function pl(e){const t=e.reason instanceof Error?e.reason:new Error(String(e.reason));P.error("Unhandled promise rejection",t),e.preventDefault()}class Uo extends Error{constructor(t,i,r=!1,n){super(t),this.code=i,this.recoverable=r,this.cause=n,this.name="AppError"}}class Bi extends Uo{constructor(t="Authentication failed"){super(t,"AUTH_ERROR",!1),this.name="AuthError"}}class Wa extends Uo{constructor(t="Network error",i){super(t,"NETWORK_ERROR",!0,i),this.name="NetworkError"}}const ul="oig_v2_";function hl(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"";return/Home Assistant|HomeAssistant|HAcompanion/i.test(t)}catch{return!1}}function gl(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"",i=/Android|iPhone|iPad|iPod|Mobile/i.test(t),r=globalThis.innerWidth<=768;return i||r}catch{return!1}}const je={isHaApp:!1,isMobile:!1,reduceMotion:!1};async function bl(){var i,r;P.info("Bootstrap starting"),cl(),je.isHaApp=hl(),je.isMobile=gl(),je.reduceMotion=je.isHaApp||je.isMobile||((r=(i=globalThis.matchMedia)==null?void 0:i.call(globalThis,"(prefers-reduced-motion: reduce)"))==null?void 0:r.matches)||!1;const e=document.documentElement;je.isHaApp&&e.classList.add("oig-ha-app"),je.isMobile&&e.classList.add("oig-mobile"),je.reduceMotion&&e.classList.add("oig-reduce-motion");const t={version:"2.0.0-beta.1",storagePrefix:ul};return P.info("Bootstrap complete",{...t,isHaApp:je.isHaApp,isMobile:je.isMobile,reduceMotion:je.reduceMotion}),document.createElement("oig-app")}const l={bgPrimary:"var(--primary-background-color, #ffffff)",bgSecondary:"var(--secondary-background-color, #f5f5f5)",textPrimary:"var(--primary-text-color, #212121)",textSecondary:"var(--secondary-text-color, #757575)",accent:"var(--accent-color, #03a9f4)",divider:"var(--divider-color, #e0e0e0)",error:"var(--error-color, #db4437)",success:"var(--success-color, #0f9d58)",warning:"var(--warning-color, #f4b400)",cardBg:"var(--card-background-color, #ffffff)",cardShadow:"var(--shadow-elevation-2dp_-_box-shadow, 0 2px 2px 0 rgba(0,0,0,0.14))",fontFamily:"var(--primary-font-family, system-ui, sans-serif)"},Va={"--primary-background-color":"#111936","--secondary-background-color":"#1a2044","--primary-text-color":"#e1e1e1","--secondary-text-color":"rgba(255,255,255,0.7)","--accent-color":"#03a9f4","--divider-color":"rgba(255,255,255,0.12)","--error-color":"#ef5350","--success-color":"#66bb6a","--warning-color":"#ffa726","--card-background-color":"rgba(255,255,255,0.06)","--shadow-elevation-2dp_-_box-shadow":"0 2px 4px 0 rgba(0,0,0,0.4)"},Ka={"--primary-background-color":"#ffffff","--secondary-background-color":"#f5f5f5","--primary-text-color":"#212121","--secondary-text-color":"#757575","--accent-color":"#03a9f4","--divider-color":"#e0e0e0","--error-color":"#db4437","--success-color":"#0f9d58","--warning-color":"#f4b400","--card-background-color":"#ffffff","--shadow-elevation-2dp_-_box-shadow":"0 2px 2px 0 rgba(0,0,0,0.14)"};function Hn(){var e,t;try{if(window.parent&&window.parent!==window){const i=(t=(e=window.parent.document)==null?void 0:e.querySelector("home-assistant"))==null?void 0:t.hass;if(i!=null&&i.themes){if(typeof i.themes.darkMode=="boolean")return i.themes.darkMode;const r=(i.themes.theme||"").toLowerCase();if(r.includes("dark"))return!0;if(r.includes("light"))return!1}}}catch{}return window.matchMedia("(prefers-color-scheme: dark)").matches}function Wn(e){const t=e?Va:Ka,i=document.documentElement;for(const[r,n]of Object.entries(t))i.style.setProperty(r,n);i.classList.toggle("dark",e),document.body.style.background=e?Va["--secondary-background-color"]:Ka["--secondary-background-color"]}function fl(){const e=Hn();Wn(e),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{const i=Hn();Wn(i)}),setInterval(()=>{const i=Hn(),r=document.documentElement.classList.contains("dark");i!==r&&Wn(i)},5e3)}const qa={mobile:768,tablet:1024};function oi(e){return e<qa.mobile?"mobile":e<qa.tablet?"tablet":"desktop"}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const O=e=>(t,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ml={attribute:!0,type:String,converter:Xs,reflect:!1,hasChanged:Qs},yl=(e=ml,t,i)=>{const{kind:r,metadata:n}=i;let a=globalThis.litPropertyMetadata.get(n);if(a===void 0&&globalThis.litPropertyMetadata.set(n,a=new Map),r==="setter"&&((e=Object.create(e)).wrapped=!0),a.set(i.name,e),r==="accessor"){const{name:o}=i;return{set(s){const d=t.get.call(this);t.set.call(this,s),this.requestUpdate(o,d,e,!0,s)},init(s){return s!==void 0&&this.C(o,void 0,e,s),s}}}if(r==="setter"){const{name:o}=i;return function(s){const d=this[o];t.call(this,s),this.requestUpdate(o,d,e,!0,s)}}throw Error("Unsupported decorator location: "+r)};function g(e){return(t,i)=>typeof i=="object"?yl(e,t,i):((r,n,a)=>{const o=n.hasOwnProperty(a);return n.constructor.createProperty(a,r),o?Object.getOwnPropertyDescriptor(n,a):void 0})(e,t,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function M(e){return g({...e,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const vl=(e,t,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof t!="object"&&Object.defineProperty(e,t,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function _n(e,t){return(i,r,n)=>{const a=o=>{var s;return((s=o.renderRoot)==null?void 0:s.querySelector(e))??null};return vl(i,r,{get(){return a(this)}})}}class xl{constructor(){this.callbacks=new Set,this.watched=new Set,this.watchedPrefixes=new Set,this.unsub=null,this.running=!1,this.getHass=null,this.activeConnection=null}registerEntities(t){for(const i of t)typeof i=="string"&&i.length>0&&this.watched.add(i)}registerPrefix(t){var r;if(typeof t!="string"||t.length===0)return;this.watchedPrefixes.add(t);const i=(r=this.getHass)==null?void 0:r.call(this);if(i!=null&&i.states){const n=Object.keys(i.states).filter(a=>a.startsWith(t));this.registerEntities(n)}}onEntityChange(t){return this.callbacks.add(t),()=>{this.callbacks.delete(t)}}async start(t){this.getHass=t.getHass;const i=this.getHass();if(!(i!=null&&i.connection)){P.debug("StateWatcher: hass not ready, retrying in 500ms"),setTimeout(()=>this.start(t),500);return}if(this.running&&this.activeConnection===i.connection){const n=t.prefixes??[];for(const a of n)this.registerPrefix(a);return}this.running&&this.stop(),this.running=!0,this.activeConnection=i.connection;const r=t.prefixes??[];for(const n of r)this.registerPrefix(n);try{this.unsub=await i.connection.subscribeEvents(n=>this.handleStateChanged(n),"state_changed"),P.info("StateWatcher started",{prefixes:r,watchedCount:this.watched.size})}catch(n){this.running=!1,this.activeConnection=null,P.error("StateWatcher failed to subscribe",n)}}stop(){if(this.running=!1,this.activeConnection=null,this.unsub)try{this.unsub()}catch{}this.unsub=null,P.info("StateWatcher stopped")}isWatched(t){return this.matchesWatched(t)}destroy(){this.stop(),this.callbacks.clear(),this.watched.clear(),this.watchedPrefixes.clear(),this.getHass=null}matchesWatched(t){if(this.watched.has(t))return!0;for(const i of this.watchedPrefixes)if(t.startsWith(i))return!0;return!1}handleStateChanged(t){var n;const i=(n=t==null?void 0:t.data)==null?void 0:n.entity_id;if(!i||!this.matchesWatched(i))return;const r=t.data.new_state;for(const a of this.callbacks)try{a(i,r)}catch{}}}const At=new xl;class wl{constructor(t,i=""){this.subscriptions=new Map,this.cache=new Map,this.stateWatcherUnsub=null,this.hass=t,this.inverterSn=i,this.init()}init(){var t;if((t=this.hass)!=null&&t.states)for(const[i,r]of Object.entries(this.hass.states))this.cache.set(i,r);this.stateWatcherUnsub=At.onEntityChange((i,r)=>{r?this.cache.set(i,r):this.cache.delete(i),this.notifySubscribers(i,r)}),P.debug("EntityStore initialized",{entities:this.cache.size,inverterSn:this.inverterSn})}getSensorId(t){return`sensor.oig_${this.inverterSn}_${t}`}findSensorId(t){const i=this.getSensorId(t);for(const r of this.cache.keys()){if(r===i)return r;if(r.startsWith(i+"_")){const n=r.substring(i.length+1);if(/^\d+$/.test(n))return r}}return i}subscribe(t,i){this.subscriptions.has(t)||this.subscriptions.set(t,new Set),this.subscriptions.get(t).add(i),At.registerEntities([t]);const r=this.cache.get(t)??null;return i(r),()=>{var n,a;(n=this.subscriptions.get(t))==null||n.delete(i),((a=this.subscriptions.get(t))==null?void 0:a.size)===0&&this.subscriptions.delete(t)}}getNumeric(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"&&parseFloat(i.state)||0,lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:0,lastUpdated:null,attributes:{},exists:!1}}getString(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"?i.state:"",lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:"",lastUpdated:null,attributes:{},exists:!1}}get(t){return this.cache.get(t)??null}getAll(){return Object.fromEntries(this.cache)}batchLoad(t){const i={};for(const r of t)i[r]=this.getNumeric(r);return i}updateHass(t){if(this.hass=t,t!=null&&t.states){const i=new Set(Object.keys(t.states));for(const r of Array.from(this.cache.keys()))i.has(r)||(this.cache.delete(r),this.notifySubscribers(r,null));for(const[r,n]of Object.entries(t.states)){const a=this.cache.get(r),o=n;this.cache.set(r,o),((a==null?void 0:a.state)!==o.state||(a==null?void 0:a.last_updated)!==o.last_updated)&&this.notifySubscribers(r,o)}}}notifySubscribers(t,i){const r=this.subscriptions.get(t);if(r)for(const n of r)try{n(i)}catch(a){P.error("Entity callback error",a,{entityId:t})}}destroy(){var t;(t=this.stateWatcherUnsub)==null||t.call(this),this.subscriptions.clear(),this.cache.clear(),P.debug("EntityStore destroyed")}}let Yi=null;function _l(e,t){return Yi&&Yi.destroy(),Yi=new wl(e,t),Yi}function dt(){return Yi}const $l=3,kl=1e3;class Sl{constructor(){this.hass=null,this.initPromise=null}async getHass(){return this.hass?this.hass:this.initPromise?this.initPromise:(this.initPromise=this.initHass(),this.initPromise)}getHassSync(){return this.hass}async refreshHass(){const t=await this.findHass();return t?(this.hass=t,P.info("HASS client refreshed"),t):this.hass}async initHass(){P.debug("Initializing HASS client");const t=await this.findHass();return t?(this.hass=t,P.info("HASS client initialized"),t):(P.warn("HASS not found in parent context"),null)}async findHass(){var t,i;if(typeof window>"u")return null;if(window.hass)return window.hass;if(window.parent&&window.parent!==window)try{const r=(i=(t=window.parent.document)==null?void 0:t.querySelector("home-assistant"))==null?void 0:i.hass;if(r)return r}catch{P.debug("Cannot access parent HASS (cross-origin)")}return window.customPanel?window.customPanel.hass:null}async fetchWithAuth(t,i={}){var o,s;const r=await this.getHass();if(!r)throw new Bi("Cannot get HASS context");try{const p=new URL(t,window.location.href).hostname;if(p!=="localhost"&&p!=="127.0.0.1"&&!t.startsWith("/api/"))throw new Error(`fetchWithAuth rejected for non-localhost URL: ${t}`)}catch(d){if(d.message.includes("rejected"))throw d}const n=(s=(o=r.auth)==null?void 0:o.data)==null?void 0:s.access_token;if(!n)throw new Bi("No access token available");const a=new Headers(i.headers);return a.set("Authorization",`Bearer ${n}`),a.has("Content-Type")||a.set("Content-Type","application/json"),this.fetchWithRetry(t,{...i,headers:a})}async fetchWithRetry(t,i,r=$l){try{const n=await fetch(t,i);if(!n.ok)throw n.status===401?new Bi("Token expired or invalid"):new Wa(`HTTP ${n.status}: ${n.statusText}`);return n}catch(n){if(r>0&&n instanceof Wa)return P.warn(`Retrying fetch (${r} left)`,{url:t}),await this.delay(kl),this.fetchWithRetry(t,i,r-1);throw n}}async callApi(t,i,r){const n=await this.getHass();if(!n)throw new Bi("Cannot get HASS context");return n.callApi(t,i,r)}async callService(t,i,r){const n=await this.getHass();if(!(n!=null&&n.callService))return P.error("Cannot call service — hass not available"),!1;try{return await n.callService(t,i,r),!0}catch(a){return P.error(`Service call failed (${t}.${i})`,a),!1}}async callWS(t){const i=await this.getHass();if(!(i!=null&&i.callWS))throw new Bi("Cannot get HASS context for WS call");return i.callWS(t)}async fetchOIGAPI(t,i={}){try{const r=`/api/oig_cloud${t.startsWith("/")?"":"/"}${t}`;return await(await this.fetchWithAuth(r,{...i,headers:{"Content-Type":"application/json",...Object.fromEntries(new Headers(i.headers).entries())}})).json()}catch(r){return P.error(`OIG API fetch error for ${t}`,r),null}}async loadBatteryTimeline(t,i="active"){return this.fetchOIGAPI(`/battery_forecast/${t}/timeline?type=${i}`)}async loadUnifiedCostTile(t){return this.fetchOIGAPI(`/battery_forecast/${t}/unified_cost_tile`)}async loadSpotPrices(t){return this.fetchOIGAPI(`/spot_prices/${t}/intervals`)}async loadAnalytics(t){return this.fetchOIGAPI(`/analytics/${t}`)}async loadPlannerSettings(t){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`)}async savePlannerSettings(t,i){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`,{method:"POST",body:JSON.stringify(i)})}async loadDetailTabs(t,i,r="hybrid"){return this.fetchOIGAPI(`/battery_forecast/${t}/detail_tabs?tab=${i}&plan=${r}`)}async loadModules(t){return this.fetchOIGAPI(`/${t}/modules`)}openEntityDialog(t){var i;try{const r=((i=window.parent.document)==null?void 0:i.querySelector("home-assistant"))??document.querySelector("home-assistant");if(!r)return P.warn("Cannot open entity dialog — home-assistant element not found"),!1;const n=new CustomEvent("hass-more-info",{bubbles:!0,composed:!0,detail:{entityId:t}});return r.dispatchEvent(n),!0}catch(r){return P.error("Cannot open entity dialog",r),!1}}async showNotification(t,i,r="success"){await this.callService("persistent_notification","create",{title:t,message:i,notification_id:`oig_dashboard_${Date.now()}`})||console.log(`[${r.toUpperCase()}] ${t}: ${i}`)}getToken(){var t,i,r;return((r=(i=(t=this.hass)==null?void 0:t.auth)==null?void 0:i.data)==null?void 0:r.access_token)??null}delay(t){return new Promise(i=>setTimeout(i,t))}}const se=new Sl,Ga={solar:"#ffd54f",battery:"#4caf50",inverter:"#9575cd",grid:"#42a5f5",house:"#f06292"},Ni={solar:"linear-gradient(135deg, rgba(255,213,79,0.15) 0%, rgba(255,179,0,0.08) 100%)",battery:"linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(56,142,60,0.08) 100%)",grid:"linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(33,150,243,0.08) 100%)",house:"linear-gradient(135deg, rgba(240,98,146,0.15) 0%, rgba(233,30,99,0.08) 100%)",inverter:"linear-gradient(135deg, rgba(149,117,205,0.15) 0%, rgba(126,87,194,0.08) 100%)"},jr={battery:"rgba(76,175,80,0.4)",grid:"rgba(66,165,245,0.4)",house:"rgba(240,98,146,0.4)",inverter:"rgba(149,117,205,0.4)"},Xt={solar:"#ffd54f",battery:"#ff9800",grid_import:"#f44336",grid_export:"#4caf50",house:"#f06292"},Rr={solar:5400,battery:7e3,grid:17e3,house:1e4},wa={solarPower:0,solarP1:0,solarP2:0,solarV1:0,solarV2:0,solarI1:0,solarI2:0,solarPercent:0,solarToday:0,solarForecastToday:0,solarForecastTomorrow:0,solarForecastStale:!1,batterySoC:0,batteryPower:0,batteryVoltage:0,batteryCurrent:0,batteryTemp:0,batteryChargeTotal:0,batteryDischargeTotal:0,batteryChargeSolar:0,batteryChargeGrid:0,isGridCharging:!1,timeToEmpty:"",timeToFull:"",balancingState:"standby",balancingTimeRemaining:"",gridChargingPlan:{hasBlocks:!1,totalEnergyKwh:0,totalCostCzk:0,windowLabel:null,durationMinutes:0,currentBlockLabel:null,nextBlockLabel:null,blocks:[]},gridPower:0,gridVoltage:0,gridFrequency:0,gridImportToday:0,gridExportToday:0,gridL1V:0,gridL2V:0,gridL3V:0,gridL1P:0,gridL2P:0,gridL3P:0,spotPrice:0,exportPrice:0,currentTariff:"",gridImportCostToday:null,gridImportCostMonth:null,gridExportEarningsToday:null,gridExportEarningsMonth:null,housePower:0,houseTodayWh:0,houseL1:0,houseL2:0,houseL3:0,nonbackupPower:0,nonbackupTodayWh:0,nonbackupL1:0,nonbackupL2:0,nonbackupL3:0,zalohaPlannedRemainingKwh:0,selfSufficiencyTodayPct:0,srcFveTodayKwh:0,srcBatteryTodayKwh:0,srcGridTodayKwh:0,inverterMode:"",inverterGridMode:"unknown",inverterGridLimit:0,inverterTemp:0,bypassStatus:"off",notificationsUnread:0,notificationsError:0,boilerIsUse:!1,boilerPower:0,boilerDayEnergy:0,boilerManualMode:"",boilerInstallPower:3e3,plannerAutoMode:null,lastUpdate:""},Yo={home_1:"Home 1",home_2:"Home 2",home_3:"Home 3",home_ups:"Home UPS"},Ua={"Home 1":"home_1","Home 2":"home_2","Home 3":"home_3","Home UPS":"home_ups","Mode 0":"home_1","Mode 1":"home_2","Mode 2":"home_3","Mode 3":"home_ups","HOME I":"home_1","HOME II":"home_2","HOME III":"home_3","HOME UPS":"home_ups",0:"home_1",1:"home_2",2:"home_3",3:"home_ups"},Zi={off:"Vypnuto",on:"Zapnuto",limited:"S omezením"},Vn={Vypnuto:"off",Zapnuto:"on",Omezeno:"limited",omezeno:"limited",vypnuto:"off",zapnuto:"on",Off:"off",On:"on",Limited:"limited",off:"off",on:"on",limited:"limited",0:"off",1:"on",2:"limited"},Cl={off:"🚫",on:"💧",limited:"🚰"},Zo={cbb:"Inteligentní",manual:"Manuální"},Qo={cbb:"🤖",manual:"👤"},Ya={CBB:"cbb",Manuální:"manual",Manual:"manual",Inteligentní:"cbb"},Tl={set_box_mode:"🏠 Změna režimu boxu",set_grid_delivery:"💧 Změna nastavení přetoků",set_grid_delivery_limit:"🔢 Změna limitu přetoků",set_boiler_mode:"🔥 Změna nastavení bojleru",set_formating_mode:"🔋 Změna nabíjení baterie",set_battery_capacity:"⚡ Změna kapacity baterie"},Pl={CBB:"Inteligentní",Manual:"Manuální",Manuální:"Manuální"},Xo={0:"Žádný",1:"Home 5",2:"Home 6",3:"Home 5 + Home 6",4:"Flexibilita"},Jo={status:"idle",activity:"",queueCount:0,runningRequests:[],queuedRequests:[],allRequests:[],currentBoxMode:"home_1",currentGridDelivery:"off",currentGridLimit:0,currentBoilerMode:"cbb",pendingServices:new Map,changingServices:new Set,gridDeliveryState:{currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},supplementary:{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1}},Ml="probíhá změna";function sa(e){return e.trim().toLowerCase().includes(Ml)}function _a(e){const t=e.trim();if(t in Vn)return Vn[t];const i=t.toLowerCase(),r=Object.entries(Vn).find(([n])=>n.toLowerCase()===i);return r?r[1]:i.startsWith("omez")||i.includes("limit")?"limited":i.startsWith("zapn")||i==="on"?"on":i.startsWith("vypn")||i==="off"?"off":"unknown"}function Dl(e){const t=e.get("grid_mode");if(!t)return null;const i=_a(t);return i==="unknown"?null:i}function zl(e){const t=e.get("grid_limit");if(!t)return null;const i=parseInt(t,10);return Number.isFinite(i)&&i>=0?i:null}function El(e){return e.changingServices.has("grid_mode")||e.changingServices.has("grid_limit")}function es(e,t){const{gridModeRaw:i,gridLimit:r}=e,n=i.trim().toLowerCase(),a=n==="unavailable"||n==="unknown"||n==="",o=sa(i),s=El(t),d=o||s;let p;a||o?p="unknown":p=_a(i);let u=null;!a&&Number.isFinite(r)&&r>=0&&(u=r);const h=Dl(t.pendingServices),b=zl(t.pendingServices);return{currentLiveDelivery:p,currentLiveLimit:u,pendingDeliveryTarget:h,pendingLimitTarget:b,isTransitioning:d,isUnavailable:a}}function Ol(e){return e.isTransitioning&&e.pendingDeliveryTarget?e.pendingDeliveryTarget:e.currentLiveDelivery}const Za=new URLSearchParams(window.location.search),$a=Za.get("sn")||Za.get("inverter_sn")||"";function Yr(e,t=$a){return`sensor.oig_${t}_${e}`}function Qa(e,t,i=$a){var a;const r=Yr(t,i);return r in e?r:((a=Object.keys(e).filter(o=>o.startsWith(r+"_")).map(o=>({id:o,suffix:parseInt(o.substring(r.length+1),10)})).filter(o=>Number.isFinite(o.suffix)).sort((o,s)=>o.suffix-s.suffix)[0])==null?void 0:a.id)??null}function V(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function Xe(e){return!(e!=null&&e.state)||e.state==="unknown"||e.state==="unavailable"?"":e.state}function Xa(e,t="on"){if(!(e!=null&&e.state))return!1;const i=e.state.toLowerCase();return i===t||i==="1"||i==="zapnuto"}function Ll(e){const t=(e||"").toLowerCase();return t==="charging"?"charging":t==="balancing"||t==="holding"?"holding":t==="completed"?"completed":t==="planned"?"planned":"standby"}function la(e){return e==="tomorrow"?"zítra":e==="today"?"dnes":""}function Ja(e){if(!e)return null;const[t,i]=e.split(":").map(Number);return!Number.isFinite(t)||!Number.isFinite(i)?null:t*60+i}function Al(e){const t=Number(e.grid_import_kwh??e.grid_charge_kwh??0);if(Number.isFinite(t)&&t>0)return t;const i=Number(e.battery_start_kwh??0),r=Number(e.battery_end_kwh??0);return Number.isFinite(i)&&Number.isFinite(r)?Math.max(0,r-i):0}function ts(e=[]){return[...e].sort((t,i)=>{const r=(t.day==="tomorrow"?1:0)-(i.day==="tomorrow"?1:0);return r!==0?r:(t.time_from||"").localeCompare(i.time_from||"")})}function Fl(e){if(!Array.isArray(e)||e.length===0)return null;const t=ts(e),i=t[0],r=t.at(-1),n=la(i==null?void 0:i.day),a=la(r==null?void 0:r.day);if(n===a){const b=n?`${n} `:"";return!(i!=null&&i.time_from)||!(r!=null&&r.time_to)?b.trim()||null:`${b}${i.time_from} – ${r.time_to}`}const o=n?`${n} `:"",s=a?`${a} `:"",d=(i==null?void 0:i.time_from)||"--",p=(r==null?void 0:r.time_to)||"--",u=i?`${o}${d}`:"--",h=r?`${s}${p}`:"--";return`${u} → ${h}`}function Il(e){if(!Array.isArray(e)||e.length===0)return 0;let t=0;return e.forEach(i=>{const r=Ja(i.time_from),n=Ja(i.time_to);if(r===null||n===null)return;const a=n-r;a>0&&(t+=a)}),t}function eo(e){const t=la(e.day),i=t?`${t} `:"",r=e.time_from||"--",n=e.time_to||"--";return`${i}${r} - ${n}`}function Bl(e){const t=e.find(n=>{const a=(n.status||"").toLowerCase();return a==="running"||a==="active"})||null,i=t?e[e.indexOf(t)+1]||null:e[0]||null;return{runningBlock:t,upcomingBlock:i,shouldShowNext:!!(i&&(!t||i!==t))}}function Nl(e){const t=(e==null?void 0:e.attributes)||{},i=Array.isArray(t.charging_blocks)?t.charging_blocks:[],r=ts(i),n=Number(t.total_energy_kwh)||0,a=n>0?n:r.reduce((f,m)=>f+Al(m),0),o=Number(t.total_cost_czk)||0,s=o>0?o:r.reduce((f,m)=>f+Number(m.total_cost_czk||0),0),d=Fl(r),p=Il(r),{runningBlock:u,upcomingBlock:h,shouldShowNext:b}=Bl(r);return{hasBlocks:r.length>0,totalEnergyKwh:a,totalCostCzk:s,windowLabel:d,durationMinutes:p,currentBlockLabel:u?eo(u):null,nextBlockLabel:b&&h?eo(h):null,blocks:r}}function jl(e){const t=y=>Number.isFinite(y)&&y>=0?y:0,i=t(e.fveTodayWh),r=t(e.battDischargeTodayWh),n=t(e.battChargeFveTodayWh),a=t(e.gridExportTodayWh),o=t(e.zalohaConsumptionWh),s=t(e.nezalohaConsumptionWh),d=o+s;if(d<=0)return{pct:0,fveKwh:0,batteryKwh:0,gridKwh:0,arcFve:0,arcBattery:0,arcGrid:0};const p=Math.min(r,d),u=Math.max(0,i-n-a),h=Math.min(u,Math.max(0,d-p)),b=Math.max(0,d-h-p),f=(h+p)/d*100,m=y=>y/1e3;return{pct:Math.min(100,Math.max(0,f)),fveKwh:m(h),batteryKwh:m(p),gridKwh:m(b),arcFve:h/d,arcBattery:p/d,arcGrid:b/d}}function Rl(e,t=$a){var Ia,Ba,Na,ja;const i=(e==null?void 0:e.states)||e||{},r=Qe=>i[Yr(Qe,t)]||null,n=V(r("actual_fv_p1")),a=V(r("actual_fv_p2")),o=V(r("extended_fve_voltage_1")),s=V(r("extended_fve_voltage_2")),d=V(r("extended_fve_current_1")),p=V(r("extended_fve_current_2")),u=r("solar_forecast"),h=Qe=>{var Ha;const Ct=(Ha=u==null?void 0:u.attributes)==null?void 0:Ha[Qe];if(Ct==null||Ct==="")return null;const Ra=parseFloat(Ct);return Number.isFinite(Ra)?Ra:null},b=h("today_total_kwh")??h("today_total_sum_kw")??V(u),f=h("tomorrow_total_kwh")??h("tomorrow_total_sum_kw")??0,m=((Ia=u==null?void 0:u.attributes)==null?void 0:Ia.forecast_stale)===!0,y=V(r("batt_bat_c")),S=V(r("batt_batt_comp_p")),v=V(r("extended_battery_voltage")),$=V(r("extended_battery_current")),T=V(r("extended_battery_temperature")),W=V(r("computed_batt_charge_energy_today")),F=V(r("computed_batt_discharge_energy_today")),R=V(r("computed_batt_charge_fve_energy_today")),k=V(r("computed_batt_charge_grid_energy_today")),A=r("grid_charging_planned"),D=Xa(A),K=Xe(r("time_to_empty")),q=Xe(r("time_to_full")),B=r("battery_balancing"),H=Ll((Ba=B==null?void 0:B.attributes)==null?void 0:Ba.current_state),Pe=Xe({state:(Na=B==null?void 0:B.attributes)==null?void 0:Na.time_remaining}),Ne=Nl(A),X=V(r("actual_aci_wtotal")),be=V(r("extended_grid_voltage")),_=V(r("ac_in_aci_f")),Z=V(r("ac_in_ac_ad")),re=V(r("ac_in_ac_pd")),Ee=V(r("ac_in_aci_vr")),Se=V(r("ac_in_aci_vs")),Oe=V(r("ac_in_aci_vt")),zn=V(r("actual_aci_wr")),En=V(r("actual_aci_ws")),Cr=V(r("actual_aci_wt")),_t=V(r("spot_price_current_15min")),Yt=V(r("export_price_current_15min")),On=Xe(r("current_tariff")),Zt=Qe=>{if(!Qe||!Qe.state||Qe.state==="unknown"||Qe.state==="unavailable")return null;const Ct=parseFloat(Qe.state);return isNaN(Ct)?null:Ct},Tr=Zt(r("computed_grid_import_cost_today")),$t=Zt(r("computed_grid_import_cost_month")),Pr=Zt(r("computed_grid_export_earnings_today")),Mr=Zt(r("computed_grid_export_earnings_month")),Qt=V(r("actual_aco_p")),Dr=V(r("ac_out_en_day")),Ei=V(r("ac_out_aco_pr")),Ln=V(r("ac_out_aco_ps")),zr=V(r("ac_out_aco_pt")),An=V(r("actual_acinb_wtotal")),Oi=V(r("computed_nonbackup_consumption_today")),Fn=V(r("actual_acinb_wr")),Er=V(r("actual_acinb_ws")),Or=V(r("actual_acinb_wt")),Li=r("battery_forecast"),In=Number((ja=Li==null?void 0:Li.attributes)==null?void 0:ja.planned_consumption_today)||0,Bn=Xe(r("box_prms_mode")),Lr=Qa(i,"invertor_prms_to_grid",t)||Yr("invertor_prms_to_grid",t),Ar=Qa(i,"invertor_prm1_p_max_feed_grid",t)||Yr("invertor_prm1_p_max_feed_grid",t),kt=i[Lr],Ai=i[Ar],Fr=(kt==null?void 0:kt.state)??"",Ir=parseFloat((Ai==null?void 0:Ai.state)??"")||0,ne=es({gridModeRaw:Fr,gridLimit:Ir},{pendingServices:new Map,changingServices:new Set}),Fi=ne.currentLiveDelivery,Ii=ne.currentLiveLimit??0,St=V(r("box_temp")),Nn=Xe(r("bypass_status"))||"off",jn=V(r("notification_count_unread")),Rs=V(r("notification_count_error")),Rn=r("boiler_is_use"),Hs=Rn?Xa(Rn)||Xe(Rn)==="Zapnuto":!1,Ws=V(r("boiler_current_cbb_w")),Vs=V(r("boiler_day_w")),Ks=Xe(r("boiler_manual_mode")),qs=V(r("boiler_install_power"))||3e3,Gs=r("real_data_update"),Us=Xe(Gs),Fa=V(r("dc_in_fv_ad")),Br=jl({fveTodayWh:Fa,battDischargeTodayWh:F,battChargeFveTodayWh:R,zalohaConsumptionWh:Dr,nezalohaConsumptionWh:Oi,gridExportTodayWh:re});return{solarPower:n+a,solarP1:n,solarP2:a,solarV1:o,solarV2:s,solarI1:d,solarI2:p,solarPercent:V(r("dc_in_fv_proc")),solarToday:Fa,solarForecastToday:b,solarForecastTomorrow:f,solarForecastStale:m,batterySoC:y,batteryPower:S,batteryVoltage:v,batteryCurrent:$,batteryTemp:T,batteryChargeTotal:W,batteryDischargeTotal:F,batteryChargeSolar:R,batteryChargeGrid:k,isGridCharging:D,timeToEmpty:K,timeToFull:q,balancingState:H,balancingTimeRemaining:Pe,gridChargingPlan:Ne,gridPower:X,gridVoltage:be,gridFrequency:_,gridImportToday:Z,gridExportToday:re,gridL1V:Ee,gridL2V:Se,gridL3V:Oe,gridL1P:zn,gridL2P:En,gridL3P:Cr,spotPrice:_t,exportPrice:Yt,currentTariff:On,gridImportCostToday:Tr,gridImportCostMonth:$t,gridExportEarningsToday:Pr,gridExportEarningsMonth:Mr,housePower:Qt,houseTodayWh:Dr,houseL1:Ei,houseL2:Ln,houseL3:zr,nonbackupPower:An,nonbackupTodayWh:Oi,nonbackupL1:Fn,nonbackupL2:Er,nonbackupL3:Or,zalohaPlannedRemainingKwh:In,selfSufficiencyTodayPct:Br.pct,srcFveTodayKwh:Br.fveKwh,srcBatteryTodayKwh:Br.batteryKwh,srcGridTodayKwh:Br.gridKwh,inverterMode:Bn,inverterGridMode:Fi,inverterGridLimit:Ii,inverterTemp:St,bypassStatus:Nn,notificationsUnread:jn,notificationsError:Rs,boilerIsUse:Hs,boilerPower:Ws,boilerDayEnergy:Vs,boilerManualMode:Ks,boilerInstallPower:qs,plannerAutoMode:null,lastUpdate:Us}}const ji={};function Hr(e,t,i){const r=Math.abs(e),n=Math.min(100,r/t*100),a=Math.max(500,Math.round(3500-n*30));let o=a;return i&&ji[i]!==void 0&&(o=Math.round(.3*a+(1-.3)*ji[i]),Math.abs(o-ji[i])<100&&(o=ji[i])),i&&(ji[i]=o),{active:r>=50,intensity:n,count:Math.max(1,Math.min(4,Math.ceil(1+n/33))),speed:o,size:Math.round(6+n/10),opacity:Math.min(1,.3+n/150)}}function Pt(e){return Math.abs(e)>=1e3?`${(e/1e3).toFixed(1)} kW`:`${Math.round(e)} W`}function ot(e){return e>=1e3?`${(e/1e3).toFixed(2)} kWh`:`${Math.round(e)} Wh`}function Hl(e){return e.includes("Home 1")?{icon:"🏠",text:"Home 1"}:e.includes("Home 2")?{icon:"🔋",text:"Home 2"}:e.includes("Home 3")?{icon:"☀️",text:"Home 3"}:e.includes("UPS")?{icon:"⚡",text:"Home UPS"}:{icon:"⚙️",text:e||"--"}}function Wl(e){return e==="off"?{display:"Vypnuto",icon:"🚫"}:e==="on"?{display:"Zapnuto",icon:"💧"}:e==="limited"?{display:"Omezeno",icon:"🚰"}:{display:"--",icon:"💧"}}const Vl={"HOME I":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"HOME II":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"HOME III":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"rgba(158, 158, 158, 0.18)",label:"DO NOTHING"},"Mode 0":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"Mode 1":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"Mode 2":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"Mode 3":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"}},to={timeline:[],labels:[],prices:[],exportPrices:[],modeSegments:[],cheapestBuyBlock:null,expensiveBuyBlock:null,bestExportBlock:null,worstExportBlock:null,solar:null,battery:null,initialZoomStart:null,initialZoomEnd:null,currentSpotPrice:0,currentExportPrice:0,plannedConsumption:null,whatIf:null,solarForecastTotal:0,solarForecastTomorrow:0,solarForecastStale:!1},io=new URLSearchParams(window.location.search),ca=io.get("sn")||io.get("inverter_sn")||"";function ci(e){return`sensor.oig_${ca}_${e}`}function ro(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function da(e){const t=e.getFullYear(),i=String(e.getMonth()+1).padStart(2,"0"),r=String(e.getDate()).padStart(2,"0"),n=String(e.getHours()).padStart(2,"0"),a=String(e.getMinutes()).padStart(2,"0"),o=String(e.getSeconds()).padStart(2,"0");return`${t}-${i}-${r}T${n}:${a}:${o}`}const Qr={},Kl=5*60*1e3;async function ql(e="hybrid"){const t=Qr[e];if(t&&Date.now()-t.ts<Kl)return P.debug("Timeline cache hit",{plan:e,age:Math.round((Date.now()-t.ts)/1e3)}),t.data;try{const i=await se.getHass();if(!i)return[];let r;i.callApi?r=await i.callApi("GET",`oig_cloud/battery_forecast/${ca}/timeline?type=active`):r=await se.fetchOIGAPI(`battery_forecast/${ca}/timeline?type=active`);const n=(r==null?void 0:r.active)||(r==null?void 0:r.timeline)||[];return Qr[e]={data:n,ts:Date.now()},P.info("Timeline fetched",{plan:e,points:n.length}),n}catch(i){return P.error("Failed to fetch timeline",i),[]}}function Gl(e){Object.keys(Qr).forEach(t=>delete Qr[t])}function Ul(e){const t=new Date,i=new Date(t);return i.setMinutes(Math.floor(t.getMinutes()/15)*15,0,0),e.filter(r=>new Date(r.timestamp)>=i)}function Yl(e){return e.map(t=>{if(!t.timestamp)return new Date;try{const[i,r]=t.timestamp.split("T");if(!i||!r)return new Date;const[n,a,o]=i.split("-").map(Number),[s,d,p=0]=r.split(":").map(Number);return new Date(n,a-1,o,s,d,p)}catch{return new Date}})}function Zl(e){const t=e.mode_name||e.mode_planned||e.mode||e.mode_display||null;if(!t||typeof t!="string")return null;const i=t.trim();return i.length?i:null}function Ql(e){return e.startsWith("HOME ")?e.replace("HOME ","").trim():e==="FULL HOME UPS"||e==="HOME UPS"?"UPS":e==="DO NOTHING"?"DN":e.substring(0,3).toUpperCase()}function Xl(e){return Vl[e]||{icon:"❓",color:"rgba(158, 158, 158, 0.15)",label:e}}function Jl(e){if(!e.length)return[];const t=[];let i=null;for(const r of e){const n=Zl(r);if(!n){i=null;continue}const a=new Date(r.timestamp),o=new Date(a.getTime()+15*60*1e3);if(i!==null&&i.mode===n)i.end=o;else{const s={mode:n,start:a,end:o};t.push(s),i=s}}return t.map(r=>{const n=Xl(r.mode);return{...r,icon:n.icon,color:n.color,label:n.label,shortLabel:Ql(r.mode)}})}function Wr(e,t,i=3){const r=Math.floor(i*60/15);if(e.length<r)return null;let n=null,a=t?1/0:-1/0;for(let o=0;o<=e.length-r;o++){const s=e.slice(o,o+r),d=s.map(u=>u.price),p=d.reduce((u,h)=>u+h,0)/d.length;(t&&p<a||!t&&p>a)&&(a=p,n={start:s[0].timestamp,end:s[s.length-1].timestamp,avg:p,min:Math.min(...d),max:Math.max(...d),values:d,type:"cheapest-buy"})}return n}function ec(e,t){const r=((e==null?void 0:e.states)||{})[ci("solar_forecast")];if(!(r!=null&&r.attributes)||!t.length)return null;const n=r.attributes,a=n.today_total_kwh||0,o=n.tomorrow_total_kwh||0,s=n.forecast_stale===!0,d=n.today_hourly_string1_kw||{},p=n.tomorrow_hourly_string1_kw||{},u=n.today_hourly_string2_kw||{},h=n.tomorrow_hourly_string2_kw||{},b={...d,...p},f={...u,...h},m=(v,$,T)=>v==null||$==null?v||$||0:v+($-v)*T,y=[],S=[];for(const v of t){const $=v.getHours(),T=v.getMinutes(),W=new Date(v);W.setMinutes(0,0,0);const F=da(W),R=new Date(W);R.setHours($+1);const k=da(R),A=b[F]||0,D=b[k]||0,K=f[F]||0,q=f[k]||0,B=T/60;y.push(m(A,D,B)),S.push(m(K,q,B))}return{string1:y,string2:S,todayTotal:a,tomorrowTotal:o,stale:s,hasString1:y.some(v=>v>0),hasString2:S.some(v=>v>0)}}function tc(e,t){if(!e.length)return{arrays:{baseline:[],solarCharge:[],gridCharge:[],gridNet:[],consumption:[]},initialZoomStart:null,initialZoomEnd:null};const i=e.map(h=>new Date(h.timestamp)),r=i[0].getTime(),n=i[i.length-1],a=n?n.getTime():r,o=[],s=[],d=[],p=[],u=[];for(const h of t){const b=da(h),f=e.find(m=>m.timestamp===b);if(f){const m=(f.battery_capacity_kwh??f.battery_soc??f.battery_start)||0,y=f.solar_charge_kwh||0,S=f.grid_charge_kwh||0,v=typeof f.grid_net=="number"?f.grid_net:(f.grid_import||0)-(f.grid_export||0),$=f.load_kwh??f.consumption_kwh??f.load??0,T=(Number($)||0)*4;o.push(m-y-S),s.push(y),d.push(S),p.push(v),u.push(T)}else o.push(null),s.push(null),d.push(null),p.push(null),u.push(null)}return{arrays:{baseline:o,solarCharge:s,gridCharge:d,gridNet:p,consumption:u},initialZoomStart:r,initialZoomEnd:a}}function ic(e){const t=(e==null?void 0:e.states)||{},i=t[ci("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const r=i.attributes,n=r.planned_consumption_today??null,a=r.planned_consumption_tomorrow??null,o=r.profile_today||"Žádný profil",s=t[ci("ac_out_en_day")],d=s==null?void 0:s.state,u=(d&&d!=="unavailable"&&parseFloat(d)||0)/1e3,h=u+(n||0),b=(n||0)+(a||0);let f=null;if(h>0&&a!=null){const y=a-h,S=y/h*100;Math.abs(S)<5?f="Zítra podobně":y>0?f=`Zítra více (+${Math.abs(S).toFixed(0)}%)`:f=`Zítra méně (-${Math.abs(S).toFixed(0)}%)`}return{todayConsumedKwh:u,todayPlannedKwh:n,todayTotalKwh:h,tomorrowKwh:a,totalPlannedKwh:b,profile:o!=="Žádný profil"&&o!=="Neznámý profil"?o:"Žádný profil",trendText:f}}function rc(e){const i=((e==null?void 0:e.states)||{})[ci("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const n=i.attributes.mode_optimization||{},a=n.alternatives||{},o=n.total_cost_czk||0,s=n.total_savings_vs_home_i_czk||0,d=a["DO NOTHING"],p=(d==null?void 0:d.current_mode)||null;return{totalCost:o,totalSavings:s,alternatives:a,activeMode:p}}async function nc(e,t="hybrid"){const i=performance.now();P.info("[Pricing] loadPricingData START");try{const r=await ql(t),n=Ul(r);if(!n.length)return P.warn("[Pricing] No timeline data"),to;const a=n.map(H=>({timestamp:H.timestamp,price:H.spot_price_czk||0})),o=n.map(H=>({timestamp:H.timestamp,price:H.export_price_czk||0}));let s=Yl(a);const d=Jl(n),p=Wr(a,!0,3);p&&(p.type="cheapest-buy");const u=Wr(a,!1,3);u&&(u.type="expensive-buy");const h=Wr(o,!1,3);h&&(h.type="best-export");const b=Wr(o,!0,3);b&&(b.type="worst-export");const f=n.map(H=>new Date(H.timestamp)),m=new Set([...s,...f].map(H=>H.getTime()));s=Array.from(m).sort((H,Pe)=>H-Pe).map(H=>new Date(H));const{arrays:y,initialZoomStart:S,initialZoomEnd:v}=tc(n,s),$=ec(e,s),T=(e==null?void 0:e.states)||{},W=ro(T[ci("spot_price_current_15min")]),F=ro(T[ci("export_price_current_15min")]),R=ic(e),k=rc(e),A=($==null?void 0:$.todayTotal)||0,D=($==null?void 0:$.tomorrowTotal)||0,K=($==null?void 0:$.stale)||!1,q={timeline:n,labels:s,prices:a,exportPrices:o,modeSegments:d,cheapestBuyBlock:p,expensiveBuyBlock:u,bestExportBlock:h,worstExportBlock:b,solar:$,battery:y,initialZoomStart:S,initialZoomEnd:v,currentSpotPrice:W,currentExportPrice:F,plannedConsumption:R,whatIf:k,solarForecastTotal:A,solarForecastTomorrow:D,solarForecastStale:K},B=(performance.now()-i).toFixed(0);return P.info(`[Pricing] loadPricingData COMPLETE in ${B}ms`,{points:n.length,segments:d.length}),q}catch(r){return P.error("[Pricing] loadPricingData failed",r),to}}const ac=120,pa={workday_spring:"Pracovní den - Jaro",workday_summer:"Pracovní den - Léto",workday_autumn:"Pracovní den - Podzim",workday_winter:"Pracovní den - Zima",weekend_spring:"Víkend - Jaro",weekend_summer:"Víkend - Léto",weekend_autumn:"Víkend - Podzim",weekend_winter:"Víkend - Zima"},oc={fve:"#4CAF50",overflow:"#8BC34A",grid:"#FF9800",discharge:"#2196F3"},sc={fve:"FVE",grid:"Síť",alternative:"Alternativa"},lc={fve:"fve",pv:"fve",overflow:"overflow",grid:"grid",alternative:"alternative",alt:"alternative",battery:"battery"},cc={fve:"fve",pv:"fve",overflow:"overflow",grid:"grid",alternative:"alternative",alt:"alternative",discharge:"discharge",discharging:"discharge"};function Kn(e){if(e==null||e==="")return{source:null,sourceInvalid:!1};const t=lc[e.toLowerCase()];return t!==void 0?{source:t,sourceInvalid:!1}:{source:null,sourceInvalid:!0}}function qn(e){return e==null||e===""?null:cc[e.toLowerCase()]??null}const dc=new Set(["temperature_unavailable","temperature_stale","source_stale","activity_stale","source_invalid","power_sign_mismatch_charge","power_sign_mismatch_discharge","runtime_cache_empty"]);function Gn(e){return e.filter(t=>dc.has(t))}const ua=new URLSearchParams(window.location.search);let ha=ua.get("sn")||ua.get("inverter_sn")||"",Un=ua.get("entry_id")||"";function pc(e,t,i){return isNaN(e)?t:Math.max(t,Math.min(i,e))}function uc(e,t,i){if(e==null)return null;const r=t-i;if(r<=0)return null;const n=(e-i)/r*100;return pc(n,0,100)}function Xr(e){if(!e)return"--:--";const t=e instanceof Date?e:new Date(e);return isNaN(t.getTime())?"--:--":t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}function no(e){if(!e)return"--";const t=new Date(e);return isNaN(t.getTime())?"--":t.toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}function ga(e,t){return`${Xr(e)}–${Xr(t)}`}function ao(e){return sc[e||""]||e||"--"}function is(e){return e?Object.values(e).reduce((t,i)=>t+(parseFloat(String(i))||0),0):0}function rs(e){return e?Object.entries(e).map(([i,r])=>({hour:parseInt(i,10),value:parseFloat(String(r))||0})).filter(i=>isFinite(i.value)).sort((i,r)=>r.value-i.value).slice(0,3).filter(i=>i.value>0).map(i=>i.hour).sort((i,r)=>i-r):[]}function Ri(e){if(!e)return null;const t=e.split(":").map(i=>parseInt(i,10));return t.length<2||!isFinite(t[0])||!isFinite(t[1])?null:t[0]*60+t[1]}function oo(e,t,i){return t===null||i===null?!1:t<=i?e>=t&&e<i:e>=t||e<i}async function hc(){var e,t,i,r,n;try{if(!Un||!ha)return P.warn("[Boiler] No entry_id or inverter_sn — cannot fetch boiler canonical"),{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null};const a=await se.fetchOIGAPI(`/boiler/${Un}/${ha}`);if(!a)return{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null};let o=!1,s=null;try{const p=await se.fetchOIGAPI(`/${Un}/boiler_profile`);p!=null&&p.config?s=p.config:o=!0}catch{o=!0}const d={state:{current_temp:((e=a.current_state.temperatures)==null?void 0:e.upper_zone)??((t=a.current_state.temperatures)==null?void 0:t.top),target_temp:void 0,heating:a.current_state.heating,temperatures:a.current_state.temperatures,energy_state:a.current_state.energy_state,recommended_source:a.selected_source||a.current_state.recommended_source||void 0,circulation_recommended:!1},slots:a.plan_slots.map(p=>({start:p.start,end:p.end,consumption_kwh:p.consumption_kwh,avg_consumption_kwh:p.consumption_kwh,recommended_source:p.recommended_source,spot_price:p.spot_price??void 0})),total_consumption_kwh:a.plan_slots.reduce((p,u)=>p+(u.consumption_kwh||0),0),fve_kwh:((i=a.current_state.energy_tracking)==null?void 0:i.fve_kwh)??0,grid_kwh:((r=a.current_state.energy_tracking)==null?void 0:r.grid_kwh)??0,alt_kwh:((n=a.current_state.energy_tracking)==null?void 0:n.alt_kwh)??0,next_slot:a.plan_slots[0]||void 0,profiles:{}};return{profileData:d,planData:d,canonical:a,configProfileUnavailable:o,boilerProfileConfig:s}}catch(a){return P.warn("[Boiler] Failed to fetch canonical",{err:a}),{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null}}}function gc(e,t,i){const r=e||t,n=r==null?void 0:r.state,a=(n==null?void 0:n.temperatures)||{},o=(n==null?void 0:n.energy_state)||{},s=isFinite(a.upper_zone??a.top)?a.upper_zone??a.top??null:null,d=isFinite(a.lower_zone??a.bottom)?a.lower_zone??a.bottom??null:null,p=isFinite(o.avg_temp)?o.avg_temp??null:null,u=isFinite(o.energy_needed_kwh)?o.energy_needed_kwh??null:null,h=i.targetTempC??60,b=i.coldInletTempC??10,f=uc(p,h,b),m=(e==null?void 0:e.slots)||[],y=(e==null?void 0:e.next_slot)||bc(m);let S="Neplánováno";if(y){const $=ao(y.recommended_source);S=`${ga(y.start,y.end)} (${$})`}const v=ao((n==null?void 0:n.recommended_source)||(y==null?void 0:y.recommended_source));return{currentTemp:isFinite(n==null?void 0:n.current_temp)?(n==null?void 0:n.current_temp)??null:null,targetTemp:(n==null?void 0:n.target_temp)||h,heating:(n==null?void 0:n.heating)||!1,tempTop:s,tempBottom:d,avgTemp:p,heatingPercent:f,energyNeeded:u,planCost:(e==null?void 0:e.estimated_cost_czk)??null,nextHeating:S,recommendedSource:v,nextProfile:(n==null?void 0:n.next_profile)||"",nextStart:(n==null?void 0:n.next_start)||""}}function bc(e){if(!Array.isArray(e))return null;const t=Date.now();return e.find(i=>{const r=new Date(i.end||i.end_time||"").getTime(),n=i.consumption_kwh??i.avg_consumption_kwh??0;return r>t&&n>0})||null}function fc(e){var b,f,m;if(!((b=e==null?void 0:e.slots)!=null&&b.length))return null;const t=e.slots.map(y=>({start:y.start||"",end:y.end||"",consumptionKwh:y.consumption_kwh??y.avg_consumption_kwh??0,recommendedSource:y.recommended_source||"",spotPrice:isFinite(y.spot_price)?y.spot_price??null:null,tempTop:y.temp_top,soc:y.soc})),i=t.filter(y=>y.consumptionKwh>0),r=parseFloat(String(e.total_consumption_kwh))||0,n=parseFloat(String(e.fve_kwh))||0,a=parseFloat(String(e.grid_kwh))||0,o=parseFloat(String(e.alt_kwh))||0,s=parseFloat(String(e.estimated_cost_czk))||0;let d="Mix: --";if(r>0){const y=Math.round(n/r*100),S=Math.round(a/r*100),v=Math.round(o/r*100);d=`Mix: FVE ${y}% · Síť ${S}% · Alt ${v}%`}const p=t.filter(y=>y.consumptionKwh>0&&y.spotPrice!==null).map(y=>({slot:y,price:y.spotPrice}));let u="--",h="--";if(p.length){const y=p.reduce((v,$)=>$.price<v.price?$:v),S=p.reduce((v,$)=>$.price>v.price?$:v);u=`${ga(y.slot.start,y.slot.end)} (${y.price.toFixed(2)} Kč/kWh)`,h=`${ga(S.slot.start,S.slot.end)} (${S.price.toFixed(2)} Kč/kWh)`}return{slots:t,totalConsumptionKwh:r,fveKwh:n,gridKwh:a,altKwh:o,estimatedCostCzk:s,nextSlot:e.next_slot?{start:e.next_slot.start||"",end:e.next_slot.end||"",consumptionKwh:e.next_slot.consumption_kwh||0,recommendedSource:e.next_slot.recommended_source||"",spotPrice:e.next_slot.spot_price??null}:null,planStart:no((f=e.slots[0])==null?void 0:f.start),planEnd:no((m=e.slots[e.slots.length-1])==null?void 0:m.end),sourceDigest:d,activeSlotCount:i.length,cheapestSpot:u,mostExpensiveSpot:h}}function mc(e){const t=parseFloat(String(e==null?void 0:e.fve_kwh))||0,i=parseFloat(String(e==null?void 0:e.grid_kwh))||0,r=parseFloat(String(e==null?void 0:e.alt_kwh))||0,n=t+i+r;return{fveKwh:t,gridKwh:i,altKwh:r,fvePercent:n>0?t/n*100:0,gridPercent:n>0?i/n*100:0,altPercent:n>0?r/n*100:0}}function yc(e,t,i){var b;const r=(e==null?void 0:e.summary)||{},n=(b=e==null?void 0:e.profiles)==null?void 0:b[i],a=(n==null?void 0:n.hourly_avg)||{},o=r.predicted_total_kwh??is(a),s=r.peak_hours??rs(a),d=isFinite(r.water_liters_40c)?r.water_liters_40c??null:null,p=r.circulation_windows||[],u=p.length?p.map(f=>`${f.start}–${f.end}`).join(", "):"--";let h="--";if(p.length){const f=new Date,m=f.getHours()*60+f.getMinutes();if(p.some(S=>{const v=Ri(S.start),$=Ri(S.end);return oo(m,v,$)})){const S=p.find(v=>{const $=Ri(v.start),T=Ri(v.end);return oo(m,$,T)});h=S?`ANO (do ${S.end})`:"ANO"}else{const S=t==null?void 0:t.state,v=S==null?void 0:S.circulation_recommended;let $=1/0,T=null;for(const W of p){const F=Ri(W.start);if(F===null)continue;let R=F-m;R<0&&(R+=24*60),R<$&&($=R,T=W)}v&&T?h=`DOPORUČENO (${T.start}–${T.end})`:T?h=`Ne (další ${T.start}–${T.end})`:h="Ne"}}return{predictedTodayKwh:o,peakHours:s,waterLiters40c:d,circulationWindows:u,circulationNow:h}}function vc(e){const t=e??{},i=isFinite(t.volume_l)?t.volume_l??null:null,r=isFinite(t.heater_power_kw)?t.heater_power_kw??null:null,n=r!==null?r*1e3:null;return{volumeL:i,heaterPowerW:n,heaterPowerKw:r,targetTempC:isFinite(t.target_temp_c)?t.target_temp_c??null:null,deadlineTime:t.deadline_time||"--:--",stratificationMode:t.stratification_mode||"--",kCoefficient:i?(i*.001163).toFixed(4):"--",coldInletTempC:isFinite(t.cold_inlet_temp_c)?t.cold_inlet_temp_c??10:10,auraMaxTempC:isFinite(t.aura_max_temp_c)?t.aura_max_temp_c??null:null}}function xc(e){return e!=null&&e.profiles?Object.entries(e.profiles).map(([t,i])=>({id:t,name:i.name||t,targetTemp:i.target_temp||55,startTime:i.start_time||"06:00",endTime:i.end_time||"22:00",days:i.days||[1,1,1,1,1,0,0],enabled:i.enabled!==!1})):[]}function wc(e){var r;const t=[],i=((r=e==null?void 0:e.summary)==null?void 0:r.today_hours)||[];for(let n=0;n<24;n++){const a=i.includes(n);t.push({hour:n,temp:a?55:25,heating:a})}return t}function _c(e,t){var o;const i=(o=e==null?void 0:e.profiles)==null?void 0:o[t],r=["Po","Út","St","Čt","Pá","So","Ne"];if(!i)return r.map(s=>({day:s,hours:Array(24).fill(0)}));const n=i.heatmap||[];let a=[];if(n.length>0)a=n.map(s=>s.map(d=>d&&typeof d=="object"?parseFloat(d.consumption)||0:parseFloat(String(d))||0));else{const s=i.hourly_avg||{};a=Array.from({length:7},()=>Array.from({length:24},(d,p)=>parseFloat(String(s[p]||0))))}return r.map((s,d)=>({day:s,hours:a[d]||Array(24).fill(0)}))}function $c(e,t){var p;const i=(p=e==null?void 0:e.profiles)==null?void 0:p[t],r=(e==null?void 0:e.summary)||{},n=(i==null?void 0:i.hourly_avg)||{},a=Array.from({length:24},(u,h)=>parseFloat(String(n[h]||0))),o=r.predicted_total_kwh??is(n),s=r.peak_hours??rs(n),d=isFinite(r.avg_confidence)?r.avg_confidence??null:null;return{hourlyAvg:a,peakHours:s,predictedTotalKwh:o,confidence:d,daysTracked:7}}function kc(e,t){var u,h,b;if(!((u=e==null?void 0:e.slots)!=null&&u.length)||!(t!=null&&t.length))return{fve:"--",grid:"--"};const i=(h=e.slots[0])==null?void 0:h.start,r=(b=e.slots[e.slots.length-1])==null?void 0:b.end,n=i?new Date(i).getTime():null,a=r?new Date(r).getTime():null,o=t.filter(f=>{if(!n||!a)return!0;const m=f.timestamp||f.time;if(!m)return!1;const y=new Date(m).getTime();return y>=n&&y<=a}),s=f=>{const m=[];let y=null;for(const S of o){const v=S.timestamp||S.time;if(!v)continue;const $=new Date(v),T=f(S);T&&!y?y={start:$,end:$}:T&&y?y.end=$:!T&&y&&(m.push(y),y=null)}return y&&m.push(y),m.length?m.map(S=>`${Xr(S.start)}–${Xr(new Date(S.end.getTime()+15*6e4))}`).join(", "):"--"},d=s(f=>(parseFloat(f.solar_kwh??f.solar_charge_kwh??0)||0)>0),p=s(f=>(parseFloat(f.grid_charge_kwh??0)||0)>0);return{fve:d,grid:p}}async function Sc(){return P.info("[Boiler] Planning heating..."),await se.callService("oig_cloud","plan_boiler_heating",{})}async function Cc(){return P.info("[Boiler] Applying plan..."),await se.callService("oig_cloud","apply_boiler_plan",{})}async function Tc(){return P.info("[Boiler] Canceling plan..."),await se.callService("oig_cloud","cancel_boiler_plan",{})}const Pc=new Set(["charging_fve","charging_overflow","charging_grid","charging_alt","discharging","standby","unknown"]);function so(e){return e&&Pc.has(e)?e:"unknown"}function Mc(e){return e==="on"?"on":e==="off"?"off":"unavailable"}function Dc(e,t=!1){var Ne,X,be;const i={entryId:null,boxId:null,available:!1};if(!e)return{status:null,planSlots:[],explanation:null,manualOverride:null,identity:i,activity:null,sourceSegments:[],timeline:[],sparkline:null,demandMap:null,circulationRuns:[],legionella:null,planSummary:null,energyToday:null,loading:!1,loadError:"Nepodařilo se načíst data bojleru",altSourceType:null};const r=e.current_state,n=r.temperatures??{},a=isFinite(n.top)?n.top??null:isFinite(n.upper_zone)?n.upper_zone??null:null,o=isFinite(n.bottom)?n.bottom??null:isFinite(n.lower_zone)?n.lower_zone??null:null,s={currentState:r.heating?"heating":"idle",comfortSatisfied:e.comfort_status.comfort_satisfied,comfortStatusCode:e.comfort_status.comfort_status_code,selectedSource:Kn(e.selected_source).source,actuatedSource:Kn(e.actuated_source).source,temperatureTop:a,temperatureBottom:o,energyNeededKwh:isFinite((Ne=r.energy_state)==null?void 0:Ne.energy_needed_kwh)?((X=r.energy_state)==null?void 0:X.energy_needed_kwh)??null:null,heating:r.heating,lastUpdate:r.last_update??null,degraded:e.degraded_flags.degraded,degradedFlags:Gn(e.degraded_flags.flags??[])},d=(e.plan_slots??[]).map(_=>{const{source:Z,sourceInvalid:re}=Kn(_.recommended_source);return{start:_.start,end:_.end,consumptionKwh:_.consumption_kwh,confidence:_.confidence,recommendedSource:Z,sourceInvalid:re||null,spotPrice:isFinite(_.spot_price)?_.spot_price??null:null,altPrice:isFinite(_.alt_price)?_.alt_price??null:null,overflowAvailable:_.overflow_available,heatingKwh:_.heating_kwh??null,pvKwh:_.pv_kwh??null,gridKwh:_.grid_kwh??null,altKwh:_.alt_kwh??null,expectedTempTopC:_.predicted_top_temp_c??_.predicted_temperature_c??null,comfortSatisfied:_.comfort_satisfied??null,estimatedCostCzk:_.estimated_cost_czk??null,pvShare:typeof _.pv_share=="number"?_.pv_share:_.consumption_kwh&&_.pv_contribution_kwh!=null?_.pv_contribution_kwh/_.consumption_kwh:null,purpose:_.purpose??null}}),p=Gn(e.degraded_flags.flags??[]),u=t?[...p,"config_profile_unavailable"]:p,h=e.freshness??{},b={reasonCodes:e.reason_codes??[],planCreatedAt:h.plan_created_at??null,planValidUntil:h.plan_valid_until??null,dataAgeSecs:isFinite(h.data_age_seconds)?h.data_age_seconds??null:null,degradedReasons:u,unsatisfiedComfortGapC:e.comfort_status.unsatisfied_comfort_gap_c??null,temperatureAtDeadlineC:e.comfort_status.temperature_at_deadline_c??null},f={active:((be=e.manual_override)==null?void 0:be.active)??!1,ttlMinutes:ac,reason:"",capabilityAvailable:e.manual_override!=null},m={entryId:e.entry_id,boxId:e.box_id,available:!!(e.entry_id&&e.box_id)},y=e.activity??null,S=y!=null?{state:so(y.state),source:qn(y.source),temperatureTrendCPerMin:isFinite(y.temperature_trend_c_per_min)?y.temperature_trend_c_per_min??null:null,fillLevelPct:isFinite(y.fill_level_pct)?y.fill_level_pct??null:null,auraMaxTempC:isFinite(y.aura_max_temp_c)?y.aura_max_temp_c:0,heaterStates:Object.fromEntries(Object.entries(y.heater_states??{}).map(([_,Z])=>[_,Mc(Z)])),staleFlags:Gn(Array.isArray(y.stale_flags)?y.stale_flags:[]),sourceEstimated:y.source_estimated===!0}:null,v=(e.source_segments??[]).map(_=>({key:qn(_.key),start:_.start,end:_.end,energyKwh:isFinite(_.energy_kwh)?_.energy_kwh:0,fillPct:isFinite(_.fill_pct)?_.fill_pct:0,active:_.active})),$=(e.timeline??[]).map(_=>({timestamp:_.timestamp,topTempC:isFinite(_.top_temp_c)?_.top_temp_c??null:null,bottomTempC:isFinite(_.bottom_temp_c)?_.bottom_temp_c??null:null,powerKw:isFinite(_.power_kw)?_.power_kw??null:null,sourceKey:qn(_.source_key),activityState:so(_.activity_state)})),T=e.sparkline??null,W=T!=null?{temperature:Array.isArray(T.temperature)?T.temperature:[],power:Array.isArray(T.power)?T.power:[]}:null,F=e.demand_map??null,R=F!=null?{slotDurationMin:F.slot_duration_min,slotsP50:Array.isArray(F.slots_p50)?F.slots_p50:[],slotsP80:Array.isArray(F.slots_p80)?F.slots_p80:[],windows:Array.isArray(F.windows)?F.windows.map(_=>({slotIndex:_.slot_index,startMinute:_.start_minute,p80Kwh:_.p80_kwh,liters:_.liters,label:_.label})):[],profile:{category:F.profile.category,level:F.profile.level,daysUsed:F.profile.days_used,label:F.profile.label,fallbackUsed:F.profile.fallback_used},confidence:F.confidence}:null,k=e.circulation_runs??[],A=Array.isArray(k)?k.map(_=>({start:_.start,end:_.end,label:_.label||""})):[],D=e.legionella??null,K=D!=null?{enabled:D.enabled===!0,daysSinceLast:typeof D.days_since_last=="number"?D.days_since_last:null,intervalDays:typeof D.interval_days=="number"?D.interval_days:null,scheduledStart:D.scheduled_start??null}:null,q=e.plan_summary??null,B=q!=null?{estimatedCostCzk:typeof q.estimated_cost_czk=="number"?q.estimated_cost_czk:null,costIfAllGrid:typeof q.cost_if_all_grid=="number"?q.cost_if_all_grid:null,costIfAllAlt:typeof q.cost_if_all_alt=="number"?q.cost_if_all_alt:null,deadlineTime:q.deadline_time||"18:00"}:null,H=e.energy_today??null,Pe=H!=null?{totalKwh:typeof H.total_kwh=="number"?H.total_kwh:0,fveKwh:typeof H.fve_kwh=="number"?H.fve_kwh:0,gridKwh:typeof H.grid_kwh=="number"?H.grid_kwh:0,altKwh:typeof H.alt_kwh=="number"?H.alt_kwh:0,batteryKwh:typeof H.battery_kwh=="number"?H.battery_kwh:0,unattributedKwh:typeof H.unattributed_kwh=="number"?H.unattributed_kwh:0,sourceInvalid:H.source_invalid===!0}:null;return{status:s,planSlots:d,explanation:b,manualOverride:f,identity:m,activity:S,sourceSegments:v,timeline:$,sparkline:W,demandMap:R,circulationRuns:A,legionella:K,planSummary:B,energyToday:Pe,loading:!1,loadError:null,altSourceType:typeof e.alt_source_type=="string"?e.alt_source_type:null}}async function zc(e){const{profileData:t,planData:i,canonical:r,configProfileUnavailable:n,boilerProfileConfig:a}=await hc();let o=null;try{const u=await se.loadBatteryTimeline(ha,"active");o=(u==null?void 0:u.active)||u||null,Array.isArray(o)&&o.length===0&&(o=null)}catch{}const s=(t==null?void 0:t.current_category)||Object.keys((t==null?void 0:t.profiles)||{})[0]||"workday_summer",d=Object.keys((t==null?void 0:t.profiles)||{}),p=vc(a);return{state:gc(i,t,p),plan:fc(i),energyBreakdown:mc(i),predictedUsage:yc(t,i,s),config:p,profiles:xc(t||i),heatmap:wc(i||t),heatmap7x24:_c(t,s),profiling:$c(t,s),currentCategory:s,availableCategories:d,forecastWindows:kc(i,o),v2Data:Dc(r,n)}}function Ec(e){var i;const t=((i=e==null?void 0:e.locale)==null?void 0:i.language)??(e==null?void 0:e.language)??"cs";return/^en/i.test(t)?"en":"cs"}const Re={cs:{"boiler.status.heading":"Stav bojleru","boiler.status.heating":"Ohřev","boiler.status.idle":"Nečinný","boiler.status.unknown":"Neznámý","boiler.status.selected_source":"Vybraný zdroj","boiler.status.actuated_source":"Aktivní zdroj","boiler.status.temp_top":"Teplota nahoře","boiler.status.temp_bottom":"Teplota dole","boiler.status.energy_needed":"Zbývající energie","boiler.status.last_update":"Poslední aktualizace","boiler.status.degraded":"Degradováno","boiler.status.comfort_satisfied":"Komfort splněn","boiler.status.comfort_unsatisfied":"Komfort nesplněn","boiler.status.comfort_unknown":"Komfort neznámý","boiler.timeline.heading":"Plán nabíjení (15 min sloty)","boiler.timeline.empty":"Plán bojleru zatím není k dispozici.","boiler.timeline.col_time":"Čas","boiler.timeline.col_source":"Zdroj","boiler.timeline.col_temp":"Teplota","boiler.timeline.col_kwh":"Energie","boiler.timeline.col_cost":"Cena","boiler.timeline.col_pv":"FVE podíl","boiler.timeline.comfort_ok":"Komfort OK","boiler.timeline.comfort_gap":"Komfort nesplněn","boiler.explanation.heading":"Vysvětlení","boiler.explanation.empty":"Žádné vysvětlení od plánovače.","boiler.explanation.plan_created":"Plán vytvořen","boiler.explanation.plan_valid_until":"Plán platí do","boiler.explanation.data_age":"Stáří dat","boiler.explanation.freshness_heading":"Čerstvost vstupů","boiler.explanation.freshness_fresh":"vstupy aktuální","boiler.explanation.degraded_heading":"Degradované stavy","boiler.explanation.unsatisfied_gap":"Komfortní mezera","boiler.explanation.temp_at_deadline":"Předpokládaná teplota na deadline","boiler.override.heading":"Ruční přepis (sekundární)","boiler.override.subtitle":"Automatický plán je primární — přepis použijte jen výjimečně.","boiler.override.ttl_label":"Délka přepisu (minuty)","boiler.override.reason_label":"Důvod přepisu","boiler.override.submit":"Aktivovat přepis","boiler.override.identity_unavailable":"Nedostupné – identita bojleru není rozpoznána.","boiler.override.capability_unavailable":"Aktuátor neumožňuje ruční přepis.","boiler.override.active":"Přepis aktivní","boiler.override.ttl_remaining_min":"Zbývá","boiler.unavailable.loading":"Načítání dat bojleru…","boiler.unavailable.error":"Chyba při načítání bojleru","boiler.unavailable.degraded":"Bojler v degradovaném režimu","boiler.unavailable.unavailable":"Data bojleru nejsou k dispozici","boiler.source.fve":"FVE","boiler.source.grid":"Síť","boiler.source.alternative":"Alternativa","boiler.source.overflow":"Přetoky","boiler.source.discharge":"Vybíjení","boiler.source.none":"—","boiler.reason.comfort_satisfied":"Komfort splněn","boiler.reason.comfort_unsatisfied":"Komfort nelze splnit","boiler.reason.no_feasible_plan":"Žádný proveditelný plán","boiler.reason.bootstrap_profile":"Učící režim profilu (málo dat)","boiler.reason.history_profile_low_confidence":"Profil s nízkou důvěrou","boiler.reason.input_stale_price":"Ceny nejsou aktuální","boiler.reason.input_stale_pv":"FVE predikce není aktuální","boiler.reason.input_missing_recorder":"Chybí historie z recorderu","boiler.reason.input_adapter_error":"Chyba vstupního adapteru","boiler.reason.input_stale_temperature":"Teplota není aktuální","boiler.reason.top_sensor_unavailable":"Horní teploměr není dostupný","boiler.reason.bottom_sensor_unavailable_top_only_degraded":"Dolní teploměr není dostupný (top-only režim)","boiler.reason.primary_actuator_unavailable":"Hlavní topný aktuátor není dostupný","boiler.reason.alternative_actuator_unavailable_benchmark_only":"Alternativní zdroj jen jako benchmark","boiler.reason.circulation_pump_unavailable":"Cirkulační čerpadlo není dostupné","boiler.reason.actuator_rate_limited":"Aktuátor omezen rychlostním limitem","boiler.reason.actuator_serializer_error":"Chyba serializéru aktuátoru","boiler.reason.override_active":"Ruční přepis aktivní","boiler.reason.override_expired":"Ruční přepis vypršel","boiler.reason.planner_timeout":"Plánovač překročil časový limit","boiler.reason.replan_coalesced":"Přeplánování sloučeno","boiler.reason.source_selected_grid":"Vybrán zdroj: síť","boiler.reason.source_selected_pv":"Vybrán zdroj: FVE","boiler.reason.source_selected_alternative":"Vybrán zdroj: alternativa","boiler.reason.source_benchmark_only":"Alternativa pouze jako srovnání","boiler.reason.setup_incomplete":"Konfigurace bojleru není dokončena","boiler.reason.migration_required":"Vyžaduje se migrace bojleru","boiler.reason.api_repair_required":"Vyžaduje se oprava API","boiler.reason.storage_write_failed":"Selhalo uložení stavu bojleru","boiler.activity.state.charging_fve":"Nabíjení z FVE","boiler.activity.state.charging_overflow":"Nabíjení z přetoků","boiler.activity.state.charging_grid":"Nabíjení ze sítě","boiler.activity.state.charging_alt":"🔥 Ohřev plynem","boiler.activity.state.discharging":"Vybíjení","boiler.activity.state.standby":"Pohotovost","boiler.activity.state.unknown":"Neznámý stav","boiler.activity.fill_level":"Úroveň naplnění","boiler.activity.temp_trend":"Trend teploty","boiler.activity.aura_max_temp":"Max. teplota AURA","boiler.activity.stale_warning":"Zastaralá data","boiler.eta.label":"Odhadovaný čas do cíle","boiler.eta.already_reached":"Cíl dosažen","boiler.eta.unavailable":"Nelze odhadnout","boiler.config.heater_power_kw":"Výkon topení (kW)","boiler.config.deadline":"Deadline","boiler.config.goal_temp":"Cílová teplota","boiler.aria.status_panel":"Panel stavu bojleru","boiler.aria.plan_timeline":"Časová osa plánu bojleru","boiler.aria.source_explanation":"Vysvětlení zdroje","boiler.aria.override_panel":"Panel ručního přepisu","boiler.aria.svg_summary":"Vizualizace bojleru","boiler.aria.stale":"Data mohou být zastaralá","boiler.aria.source_unknown":"Neznámý zdroj","boiler.demand_map.heading":"Mapa odběrů","boiler.demand_map.empty":"Sbírám data o odběrech — mapa se objeví po pár dnech","boiler.demand_map.confidence":"Spolehlivost","boiler.demand_map.fallback_notice":"Přibližný profil (málo dat)","boiler.demand_map.meta":"Profil z historie ({n} dní, {cat})","boiler.demand_map.window.morning":"Ráno","boiler.demand_map.window.afternoon":"Odpoledne","boiler.demand_map.window.evening":"Večer","boiler.demand_map.window.night":"Noc","boiler.plan_strip.heading":"Plán ohřevu 24 h","boiler.plan_strip.meta":"zdroje + odběry + teplota + cirkulace","boiler.plan_strip.empty":"Plán ohřevu zatím není k dispozici.","boiler.plan_strip.now_label":"TEĎ","boiler.plan_strip.deadline_label":"pojistka","boiler.plan_strip.temp_zone_label":"°C horní zóna","boiler.plan_strip.legend_overflow":"☀️ Přetoky FVE","boiler.plan_strip.legend_grid":"🔌 Levné okno (síť)","boiler.plan_strip.legend_battery":"🔋→🔥 Ohřev z baterie","boiler.plan_strip.legend_alt":"🔥 Alternativní zdroj","boiler.plan_strip.legend_demands":"odběry (dolů)","boiler.plan_strip.legend_circ":"💧 cirkulace","boiler.plan_strip.source_overflow":"☀️ Přetoky FVE","boiler.plan_strip.source_grid":"🔌 Levné okno","boiler.plan_strip.source_battery":"🔋→🔥 Ohřev z baterie","boiler.plan_strip.source_alt":"🔥 Alternativní zdroj","boiler.plan_strip.source_legionella_prefix":"🦠","boiler.plan_strip.source_legionella":"🦠 Ochrana proti legionelle","boiler.plan_strip.circ_tooltip":"cirkulace","boiler.tank.ready_caption":"≥ 40 °C připraveno","boiler.tank.source_fve":"☀️ Nabíjí z přetoků FVE","boiler.tank.source_grid":"🔌 Nabíjí ze sítě","boiler.tank.source_battery":"🔋→🔥 Ohřev z baterie","boiler.tank.source_alt":"🔥 Ohřev plynem","boiler.tank.source_idle":"Neohřívá","boiler.tank.source_estimated_suffix":"(odhad)","boiler.energy_today.heading":"⚡ Z čeho se bojler nabil — dnes","boiler.energy_today.meta":"skutečné zdroje k dnešnímu datu","boiler.energy_today.empty":"Dnes zatím žádný ohřev","boiler.energy_today.source_fve":"☀️ FVE přetoky","boiler.energy_today.source_grid":"🔌 Síť","boiler.energy_today.source_alt":"🔥 Alternativní zdroj","boiler.energy_today.source_battery":"🔋→🔥 Baterie","boiler.energy_today.benchmark_prefix":"Kdyby vše ze sítě ≈","boiler.energy_today.benchmark_savings":"→ plán šetří","boiler.panel.source_title":"Zdroj & náklady","boiler.panel.comfort_title":"Komfort","boiler.panel.cost_today":"Cena dnes","boiler.panel.energy_today":"Energie dnes","boiler.panel.fve_label":"☀️ z FVE","boiler.panel.grid_label":"🔌 ze sítě","boiler.panel.unattributed_label":"⚡ el. (nerozlišený zdroj)","boiler.panel.alt_label":"🔥 z plynu","boiler.panel.battery_label":"🔋→🔥 z baterie","boiler.panel.savings_label":"Ušetřeno vs. plyn","boiler.panel.current_source":"Aktuální zdroj","boiler.panel.next_action":"Další akce","boiler.panel.tomorrow":"zítra","boiler.panel.source_overflow":"☀️ přetoky","boiler.panel.source_grid":"🔌 levné okno","boiler.panel.source_grid_short":"🔌 síť","boiler.panel.source_battery":"🔋→🔥 Ohřev z baterie","boiler.panel.source_battery_short":"🔋→🔥","boiler.panel.source_alt":"🔥 plyn","boiler.panel.deadline_label":"Pojistka (deadline)","boiler.panel.legionella_label":"Anti-legionella","boiler.panel.legionella_off":"vypnuto","boiler.panel.legionella_plan":"plán","boiler.panel.legionella_in":"za","boiler.panel.legionella_days":"dní","boiler.panel.legionella_overdue":"přesčas","boiler.panel.legionella_scheduled":"naplánováno","boiler.panel.trend_label":"Trend","boiler.panel.circ_label":"Cirkulace","boiler.panel.circ_before_peak":"před špičkou","boiler.panel.circ_off":"vypnuta"},en:{"boiler.status.heading":"Boiler status","boiler.status.heating":"Heating","boiler.status.idle":"Idle","boiler.status.unknown":"Unknown","boiler.status.selected_source":"Selected source","boiler.status.actuated_source":"Actuated source","boiler.status.temp_top":"Top temperature","boiler.status.temp_bottom":"Bottom temperature","boiler.status.energy_needed":"Energy needed","boiler.status.last_update":"Last update","boiler.status.degraded":"Degraded","boiler.status.comfort_satisfied":"Comfort satisfied","boiler.status.comfort_unsatisfied":"Comfort not satisfied","boiler.status.comfort_unknown":"Comfort unknown","boiler.timeline.heading":"Heating plan (15 min slots)","boiler.timeline.empty":"No boiler plan available yet.","boiler.timeline.col_time":"Time","boiler.timeline.col_source":"Source","boiler.timeline.col_temp":"Temp","boiler.timeline.col_kwh":"Energy","boiler.timeline.col_cost":"Cost","boiler.timeline.col_pv":"PV share","boiler.timeline.comfort_ok":"Comfort OK","boiler.timeline.comfort_gap":"Comfort gap","boiler.explanation.heading":"Explanation","boiler.explanation.empty":"No planner explanation yet.","boiler.explanation.plan_created":"Plan created","boiler.explanation.plan_valid_until":"Plan valid until","boiler.explanation.data_age":"Data age","boiler.explanation.freshness_heading":"Input freshness","boiler.explanation.freshness_fresh":"inputs fresh","boiler.explanation.degraded_heading":"Degraded state","boiler.explanation.unsatisfied_gap":"Comfort gap","boiler.explanation.temp_at_deadline":"Predicted deadline temperature","boiler.override.heading":"Manual override (secondary)","boiler.override.subtitle":"Automatic plan is primary — use override only when necessary.","boiler.override.ttl_label":"Override duration (minutes)","boiler.override.reason_label":"Override reason","boiler.override.submit":"Activate override","boiler.override.identity_unavailable":"Unavailable – boiler identity is not resolved.","boiler.override.capability_unavailable":"Actuator does not support manual override.","boiler.override.active":"Override active","boiler.override.ttl_remaining_min":"remaining","boiler.unavailable.loading":"Loading boiler data…","boiler.unavailable.error":"Failed to load boiler data","boiler.unavailable.degraded":"Boiler in degraded mode","boiler.unavailable.unavailable":"Boiler data unavailable","boiler.source.fve":"PV","boiler.source.grid":"Grid","boiler.source.alternative":"Alternative","boiler.source.overflow":"Overflow","boiler.source.discharge":"Discharge","boiler.source.none":"—","boiler.reason.comfort_satisfied":"Comfort satisfied","boiler.reason.comfort_unsatisfied":"Comfort cannot be met","boiler.reason.no_feasible_plan":"No feasible plan","boiler.reason.bootstrap_profile":"Bootstrap profile (low data)","boiler.reason.history_profile_low_confidence":"Low-confidence profile","boiler.reason.input_stale_price":"Spot prices are stale","boiler.reason.input_stale_pv":"PV forecast is stale","boiler.reason.input_missing_recorder":"Recorder history missing","boiler.reason.input_adapter_error":"Input adapter error","boiler.reason.input_stale_temperature":"Temperature reading stale","boiler.reason.top_sensor_unavailable":"Top sensor unavailable","boiler.reason.bottom_sensor_unavailable_top_only_degraded":"Bottom sensor unavailable (top-only mode)","boiler.reason.primary_actuator_unavailable":"Primary heating actuator unavailable","boiler.reason.alternative_actuator_unavailable_benchmark_only":"Alternative source benchmark only","boiler.reason.circulation_pump_unavailable":"Circulation pump unavailable","boiler.reason.actuator_rate_limited":"Actuator rate limited","boiler.reason.actuator_serializer_error":"Actuator serializer error","boiler.reason.override_active":"Manual override active","boiler.reason.override_expired":"Manual override expired","boiler.reason.planner_timeout":"Planner timeout","boiler.reason.replan_coalesced":"Replan coalesced","boiler.reason.source_selected_grid":"Source selected: grid","boiler.reason.source_selected_pv":"Source selected: PV","boiler.reason.source_selected_alternative":"Source selected: alternative","boiler.reason.source_benchmark_only":"Alternative is benchmark only","boiler.reason.setup_incomplete":"Boiler setup incomplete","boiler.reason.migration_required":"Boiler migration required","boiler.reason.api_repair_required":"API repair required","boiler.reason.storage_write_failed":"Failed to persist boiler state","boiler.activity.state.charging_fve":"Charging from PV","boiler.activity.state.charging_overflow":"Charging from overflow","boiler.activity.state.charging_grid":"Charging from grid","boiler.activity.state.charging_alt":"🔥 Gas heating","boiler.activity.state.discharging":"Discharging","boiler.activity.state.standby":"Standby","boiler.activity.state.unknown":"Unknown state","boiler.activity.fill_level":"Fill level","boiler.activity.temp_trend":"Temperature trend","boiler.activity.aura_max_temp":"AURA max temperature","boiler.activity.stale_warning":"Stale data","boiler.eta.label":"Estimated time to target","boiler.eta.already_reached":"Target reached","boiler.eta.unavailable":"Cannot estimate","boiler.config.heater_power_kw":"Heater power (kW)","boiler.config.deadline":"Deadline","boiler.config.goal_temp":"Target temperature","boiler.aria.status_panel":"Boiler status panel","boiler.aria.plan_timeline":"Boiler plan timeline","boiler.aria.source_explanation":"Source explanation","boiler.aria.override_panel":"Manual override panel","boiler.aria.svg_summary":"Boiler visualization","boiler.aria.stale":"Data may be stale","boiler.aria.source_unknown":"Unknown source","boiler.demand_map.heading":"Demand Map","boiler.demand_map.empty":"Collecting usage data — map will appear in a few days","boiler.demand_map.confidence":"Confidence","boiler.demand_map.fallback_notice":"Approximate profile (low data)","boiler.demand_map.meta":"Profile from history ({n} days, {cat})","boiler.demand_map.window.morning":"Morning","boiler.demand_map.window.afternoon":"Afternoon","boiler.demand_map.window.evening":"Evening","boiler.demand_map.window.night":"Night","boiler.plan_strip.heading":"Heating plan 24 h","boiler.plan_strip.meta":"sources + demands + temperature + circulation","boiler.plan_strip.empty":"Heating plan not available yet.","boiler.plan_strip.now_label":"NOW","boiler.plan_strip.deadline_label":"deadline","boiler.plan_strip.temp_zone_label":"°C top zone","boiler.plan_strip.legend_overflow":"☀️ PV overflow","boiler.plan_strip.legend_grid":"🔌 Cheap window (grid)","boiler.plan_strip.legend_battery":"🔋→🔥 Battery heating","boiler.plan_strip.legend_alt":"🔥 Alternative source","boiler.plan_strip.legend_demands":"demands (down)","boiler.plan_strip.legend_circ":"💧 circulation","boiler.plan_strip.source_overflow":"☀️ PV overflow","boiler.plan_strip.source_grid":"🔌 Cheap window","boiler.plan_strip.source_battery":"🔋→🔥 Battery heating","boiler.plan_strip.source_alt":"🔥 Alternative source","boiler.plan_strip.source_legionella_prefix":"🦠","boiler.plan_strip.source_legionella":"🦠 Legionella protection","boiler.plan_strip.circ_tooltip":"circulation","boiler.tank.ready_caption":"≥ 40 °C ready","boiler.tank.source_fve":"☀️ Charging from PV overflow","boiler.tank.source_grid":"🔌 Charging from grid","boiler.tank.source_battery":"🔋→🔥 Battery heating","boiler.tank.source_alt":"🔥 Gas heating","boiler.tank.source_idle":"Not heating","boiler.tank.source_estimated_suffix":"(estimated)","boiler.energy_today.heading":"⚡ What powered the boiler today","boiler.energy_today.meta":"actual sources to date","boiler.energy_today.empty":"No heating today yet","boiler.energy_today.source_fve":"☀️ PV overflow","boiler.energy_today.source_grid":"🔌 Grid","boiler.energy_today.source_alt":"🔥 Alternative source","boiler.energy_today.source_battery":"🔋→🔥 Battery","boiler.energy_today.benchmark_prefix":"If all from grid ≈","boiler.energy_today.benchmark_savings":"→ plan saves","boiler.panel.source_title":"Source & costs","boiler.panel.comfort_title":"Comfort","boiler.panel.cost_today":"Cost today","boiler.panel.energy_today":"Energy today","boiler.panel.fve_label":"☀️ from PV","boiler.panel.grid_label":"🔌 from grid","boiler.panel.unattributed_label":"⚡ electric (unattributed)","boiler.panel.alt_label":"🔥 from gas","boiler.panel.battery_label":"🔋→🔥 from battery","boiler.panel.savings_label":"Saved vs. gas","boiler.panel.current_source":"Current source","boiler.panel.next_action":"Next action","boiler.panel.tomorrow":"tomorrow","boiler.panel.source_overflow":"☀️ overflow","boiler.panel.source_grid":"🔌 cheap window","boiler.panel.source_grid_short":"🔌 grid","boiler.panel.source_battery":"🔋→🔥 Battery heat","boiler.panel.source_battery_short":"🔋→🔥","boiler.panel.source_alt":"🔥 gas","boiler.panel.deadline_label":"Deadline (guard)","boiler.panel.legionella_label":"Anti-legionella","boiler.panel.legionella_off":"disabled","boiler.panel.legionella_plan":"scheduled","boiler.panel.legionella_in":"in","boiler.panel.legionella_days":"days","boiler.panel.legionella_overdue":"overdue","boiler.panel.legionella_scheduled":"scheduled","boiler.panel.trend_label":"Trend","boiler.panel.circ_label":"Circulation","boiler.panel.circ_before_peak":"before peak","boiler.panel.circ_off":"off"}};function x(e,t){const i=Re[t]??Re.cs;return e in i?i[e]:e in Re.cs?Re.cs[e]:e}function Zr(e,t){const i=`boiler.reason.${e}`;return Re[t][i]?Re[t][i]:Re.cs[i]?Re.cs[i]:e}function di(e,t){if(!e)return x("boiler.source.none",t);const i=`boiler.source.${e}`;return Re[t][i]?Re[t][i]:Re.cs[i]?Re.cs[i]:e}const lo=new URLSearchParams(window.location.search),ka=lo.get("sn")||lo.get("inverter_sn")||"";async function ba(){const e=await se.fetchOIGAPI(`/${ka}/module_config`);return!e||e.error?(P.warn("[Settings] module_config load failed",e),null):e}async function Oc(e,t,i=[2e3,4e3,8e3,15e3,3e4]){for(const r of i){await new Promise(a=>setTimeout(a,r));const n=await se.fetchOIGAPI(`/${ka}/module_config`);if(n&&!n.error){e(n);return}}t()}async function Lc(e,t){const i=await se.fetchOIGAPI(`/${ka}/module_config`,{method:"POST",body:JSON.stringify({section:e,values:t})});return i&&(i.updated===!0||i.updated===!1)?{ok:!0}:{ok:!1,fields:i==null?void 0:i.fields}}const co={efficiency:null,health:null,balancing:null,costComparison:null};function ns(e){const t=dt();if(!t)return null;const i=t.findSensorId("battery_efficiency"),r=t.get(i);if(!r)return P.debug("Battery efficiency sensor not found"),null;const n=r.attributes||{},a=n.efficiency_last_month_pct!=null?{efficiency:Number(n.efficiency_last_month_pct??0),charged:Number(n.last_month_charge_kwh??0),discharged:Number(n.last_month_discharge_kwh??0),losses:Number(n.losses_last_month_kwh??0)}:null,o=n.efficiency_current_month_pct!=null?{efficiency:Number(n.efficiency_current_month_pct??0),charged:Number(n.current_month_charge_kwh??0),discharged:Number(n.current_month_discharge_kwh??0),losses:Number(n.losses_current_month_kwh??0)}:null,s=a??o;if(!s)return null;const d=a?"last_month":"current_month",p=a&&o?o.efficiency-a.efficiency:0;return{efficiency:s.efficiency,charged:s.charged,discharged:s.discharged,losses:s.losses,lossesPct:n[d==="last_month"?"losses_last_month_pct":"losses_current_month_pct"]??0,trend:p,period:d,currentMonthDays:n.current_month_days??0,lastMonth:a,currentMonth:o}}function as(e){const t=dt();if(!t)return null;const i=t.findSensorId("battery_health"),r=t.get(i);if(!r)return P.debug("Battery health sensor not found"),null;const n=parseFloat(r.state)||0,a=r.attributes||{};let o,s;return n>=95?(o="excellent",s="Vynikající"):n>=90?(o="good",s="Dobrý"):n>=80?(o="fair",s="Uspokojivý"):(o="poor",s="Špatný"),{soh:n,capacity:a.capacity_p80_last_20??a.current_capacity_kwh??0,nominalCapacity:a.current_capacity_kwh??0,minCapacity:a.capacity_p20_last_20??0,measurementCount:a.measurement_count??0,lastAnalysis:a.last_analysis??"",qualityScore:a.quality_score??null,sohMethod:a.soh_selection_method??null,sohMethodDescription:a.soh_method_description??null,measurementHistory:Array.isArray(a.measurement_history)?a.measurement_history:[],degradation3m:a.degradation_3_months_percent??null,degradation6m:a.degradation_6_months_percent??null,degradation12m:a.degradation_12_months_percent??null,degradationPerYear:a.degradation_per_year_percent??null,estimatedEolDate:a.estimated_eol_date??null,yearsTo80Pct:a.years_to_80pct??null,trendConfidence:a.trend_confidence??null,status:o,statusLabel:s}}function po(e,t,i){if(!e||!t)return{daysRemaining:null,progressPercent:null,intervalDays:i||null};try{const r=new Date(e),n=new Date(t),a=new Date;if(isNaN(r.getTime())||isNaN(n.getTime()))return{daysRemaining:null,progressPercent:null,intervalDays:i||null};const o=n.getTime()-r.getTime(),s=a.getTime()-r.getTime(),d=Math.max(0,Math.round((n.getTime()-a.getTime())/(1e3*60*60*24))),p=o>0?Math.min(100,Math.max(0,Math.round(s/o*100))):null,u=i||Math.round(o/(1e3*60*60*24));return{daysRemaining:d,progressPercent:p,intervalDays:u||null}}catch{return{daysRemaining:null,progressPercent:null,intervalDays:i||null}}}function os(e){const t=dt();if(!t)return null;const i=t.findSensorId("battery_balancing"),r=t.get(i);if(!r){const d=t.get(t.findSensorId("battery_health")),p=d==null?void 0:d.attributes;if(p!=null&&p.balancing_status){const u=String(p.last_balancing??""),h=p.next_balancing?String(p.next_balancing):null,b=po(u,h,Number(p.balancing_interval_days??0));return{status:String(p.balancing_status??"unknown"),lastBalancing:u,cost:Number(p.balancing_cost??0),nextScheduled:h,...b,estimatedNextCost:p.estimated_next_cost!=null?Number(p.estimated_next_cost):null}}return null}const n=r.attributes||{},a=String(n.last_balancing??""),o=n.next_scheduled?String(n.next_scheduled):null,s=po(a,o,Number(n.interval_days??0));return{status:r.state||"unknown",lastBalancing:a,cost:Number(n.cost??0),nextScheduled:o,...s,estimatedNextCost:n.estimated_next_cost!=null?Number(n.estimated_next_cost):null}}async function Ac(e){var t,i,r;try{const n=await se.loadUnifiedCostTile(e);if(!n)return null;const a=n.hybrid??n,o=a.today??{},s=Math.round((o.actual_cost_so_far??o.actual_total_cost??0)*100)/100,d=o.future_plan_cost??0,p=o.blended_total_cost??s+d,u=((t=a.tomorrow)==null?void 0:t.plan_total_cost)??null,h=!!((i=a.tomorrow)!=null&&i.mode_distribution),b=u===0&&!h?null:u;let f=null,m=null,y=null,S=null;try{const v=await se.loadBatteryTimeline(e,"active"),$=(r=v==null?void 0:v.timeline_extended)==null?void 0:r.yesterday;$!=null&&$.summary&&(f=$.summary.planned_total_cost??null,m=$.summary.actual_total_cost??null,y=$.summary.delta_cost??null,S=$.summary.accuracy_pct??null)}catch{P.debug("Yesterday analysis not available")}return{activePlan:"hybrid",actualSpent:s,planTotalCost:p,futurePlanCost:d,tomorrowCost:b,yesterdayPlannedCost:f,yesterdayActualCost:m,yesterdayDelta:y,yesterdayAccuracy:S}}catch(n){return P.error("Failed to fetch cost comparison",n),null}}async function Fc(e){const t=ns(),i=as(),r=os(),n=await Ac(e);return{efficiency:t,health:i,balancing:r,costComparison:n}}function Ic(e){return{efficiency:ns(),health:as(),balancing:os()}}const Ji={severity:0,warningsCount:0,eventType:"",description:"",instruction:"",onset:"",expires:"",etaHours:0,allWarnings:[],effectiveSeverity:0},Bc={vítr:"💨",déšť:"🌧️",sníh:"❄️",bouřky:"⛈️",mráz:"🥶",vedro:"🥵",mlha:"🌫️",náledí:"🧊",laviny:"🏔️"};function ss(e){const t=e.toLowerCase();for(const[i,r]of Object.entries(Bc))if(t.includes(i))return r;return"⚠️"}const ls={0:"Bez výstrahy",1:"Nízká",2:"Zvýšená",3:"Vysoká",4:"Extrémní"},Jr={0:"#4CAF50",1:"#8BC34A",2:"#FF9800",3:"#f44336",4:"#9C27B0"};function Nc(e){const t=dt();if(!t)return Ji;const i=`sensor.oig_${e}_chmu_warning_level`,r=t.get(i);if(!r)return P.debug("ČHMÚ sensor not found",{entityId:i}),Ji;const n=parseInt(r.state,10)||0,a=r.attributes||{},o=Number(a.warnings_count??0),s=String(a.event_type??""),d=String(a.description??""),p=String(a.instruction??""),u=String(a.onset??""),h=String(a.expires??""),b=Number(a.eta_hours??0),f=a.all_warnings_details??[],m=Array.isArray(f)?f.map(v=>({event_type:v.event_type??v.event??"",severity:v.severity??n,description:v.description??"",instruction:v.instruction??"",onset:v.onset??"",expires:v.expires??"",eta_hours:v.eta_hours??0})):[],y=s.toLowerCase().includes("žádná výstraha");return{severity:n,warningsCount:o,eventType:s,description:d,instruction:p,onset:u,expires:h,etaHours:b,allWarnings:m,effectiveSeverity:o===0||y?0:n}}const cs={"HOME I":{icon:"🏠",color:"#4CAF50",label:"HOME I"},"HOME II":{icon:"⚡",color:"#2196F3",label:"HOME II"},"HOME III":{icon:"🔋",color:"#9C27B0",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"#FF9800",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"#FF9800",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"#9E9E9E",label:"DO NOTHING"}},ds={yesterday:"📊 Včera",today:"📆 Dnes",tomorrow:"📅 Zítra",history:"📈 Historie",detail:"💎 Detail"};function uo(e){return{modeHistorical:e.mode_historical??e.mode??"",modePlanned:e.mode_planned??"",modeMatch:e.mode_match??!1,status:e.status??"planned",startTime:e.start_time??"",endTime:e.end_time??"",durationHours:e.duration_hours??0,costHistorical:e.cost_historical??null,costPlanned:e.cost_planned??null,costDelta:e.cost_delta??null,solarKwh:e.solar_total_kwh??0,consumptionKwh:e.consumption_total_kwh??0,gridImportKwh:e.grid_import_total_kwh??0,gridExportKwh:e.grid_export_total_kwh??0,intervalReasons:Array.isArray(e.interval_reasons)?e.interval_reasons:[]}}function Vr(e){return{plan:(e==null?void 0:e.plan)??0,actual:(e==null?void 0:e.actual)??null,hasActual:(e==null?void 0:e.has_actual)??!1,unit:(e==null?void 0:e.unit)??""}}function jc(e){const t=(e==null?void 0:e.metrics)??{};return{overallAdherence:(e==null?void 0:e.overall_adherence)??0,modeSwitches:(e==null?void 0:e.mode_switches)??0,totalCost:(e==null?void 0:e.total_cost)??0,metrics:{cost:Vr(t.cost),solar:Vr(t.solar),consumption:Vr(t.consumption),grid:Vr(t.grid)},completedSummary:e!=null&&e.completed_summary?{count:e.completed_summary.count??0,totalCost:e.completed_summary.total_cost??0,adherencePct:e.completed_summary.adherence_pct??0}:void 0,plannedSummary:e!=null&&e.planned_summary?{count:e.planned_summary.count??0,totalCost:e.planned_summary.total_cost??0}:void 0,progressPct:e==null?void 0:e.progress_pct,actualTotalCost:e==null?void 0:e.actual_total_cost,planTotalCost:e==null?void 0:e.plan_total_cost,vsPlanPct:e==null?void 0:e.vs_plan_pct,backupBaselineCost:e==null?void 0:e.backup_baseline_cost,backupActualCost:e==null?void 0:e.backup_actual_cost,backupSavings:e==null?void 0:e.backup_savings,eodPrediction:e!=null&&e.eod_prediction?{predictedTotal:e.eod_prediction.predicted_total??0,predictedSavings:e.eod_prediction.predicted_savings??0}:void 0}}function Rc(e){return e?{date:e.date??"",modeBlocks:Array.isArray(e.mode_blocks)?e.mode_blocks.map(uo):[],summary:jc(e.summary),metadata:e.metadata?{activePlan:e.metadata.active_plan??"hybrid",comparisonPlanAvailable:e.metadata.comparison_plan_available}:void 0,comparison:e.comparison?{plan:e.comparison.plan??"",modeBlocks:Array.isArray(e.comparison.mode_blocks)?e.comparison.mode_blocks.map(uo):[]}:void 0}:null}async function Hc(e,t,i="hybrid"){try{const r=await se.loadDetailTabs(e,t,i);if(!r)return null;const n=r[t]??r;return Rc(n)}catch(r){return P.error(`Failed to load timeline tab: ${t}`,r),null}}const fa={tiles_left:[null,null,null,null,null,null],tiles_right:[null,null,null,null,null,null],left_count:4,right_count:4,visible:!0,version:1},ps="oig_dashboard_tiles";function Wc(e,t){return t==="W"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kW"}:t==="Wh"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kWh"}:t==="W"||t==="Wh"?{value:Math.round(e).toString(),unit:t}:{value:e.toFixed(1),unit:t}}async function Vc(){var e;try{const t=await se.callWS({type:"call_service",domain:"oig_cloud",service:"get_dashboard_tiles",service_data:{},return_response:!0}),i=(e=t==null?void 0:t.response)==null?void 0:e.config;if(i&&typeof i=="object")return P.debug("Loaded tiles config from HA"),go(i)}catch(t){P.debug("WS tile config load failed, trying localStorage",{error:t.message})}try{const t=localStorage.getItem(ps);if(t){const i=JSON.parse(t);return P.debug("Loaded tiles config from localStorage"),go(i)}}catch{P.debug("localStorage tile config load failed")}return fa}async function ho(e){try{return localStorage.setItem(ps,JSON.stringify(e)),await se.callService("oig_cloud","save_dashboard_tiles",{config:JSON.stringify(e)}),P.info("Tiles config saved"),!0}catch(t){return P.error("Failed to save tiles config",t),!1}}function go(e){return{tiles_left:Array.isArray(e.tiles_left)?e.tiles_left.slice(0,6):fa.tiles_left,tiles_right:Array.isArray(e.tiles_right)?e.tiles_right.slice(0,6):fa.tiles_right,left_count:typeof e.left_count=="number"?e.left_count:4,right_count:typeof e.right_count=="number"?e.right_count:4,visible:e.visible!==!1,version:e.version??1}}function Yn(e){var s;const t=dt();if(!t)return{value:"--",unit:"",isActive:!1,rawValue:0};const i=t.get(e);if(!i||i.state==="unavailable"||i.state==="unknown")return{value:"--",unit:"",isActive:!1,rawValue:0};const r=i.state,n=String(((s=i.attributes)==null?void 0:s.unit_of_measurement)??""),a=parseFloat(r)||0;if(i.entity_id.startsWith("switch.")||i.entity_id.startsWith("binary_sensor."))return{value:r==="on"?"Zapnuto":"Vypnuto",unit:"",isActive:r==="on",rawValue:r==="on"?1:0};const o=Wc(a,n);return{value:o.value,unit:o.unit,isActive:a!==0,rawValue:a}}function Hi(e){const t=(i,r)=>{var a,o;const n=[];for(let s=0;s<r;s++){const d=i[s];if(!d)continue;const p=Yn(d.entity_id),u={};if((a=d.support_entities)!=null&&a.top_right){const h=Yn(d.support_entities.top_right);u.topRight={value:h.value,unit:h.unit}}if((o=d.support_entities)!=null&&o.bottom_right){const h=Yn(d.support_entities.bottom_right);u.bottomRight={value:h.value,unit:h.unit}}n.push({config:d,value:p.value,unit:p.unit,isActive:p.isActive,isZero:p.rawValue===0,formattedValue:p.unit?`${p.value} ${p.unit}`:p.value,supportValues:u})}return n};return{left:t(e.tiles_left,e.left_count),right:t(e.tiles_right,e.right_count)}}async function Kc(e,t="toggle"){const i=e.split(".")[0];return se.callService(i,t,{entity_id:e})}function oe(e,t="CZK"){return e==null||Number.isNaN(e)?`-- ${t}`:`${e.toFixed(2)} ${t}`}function si(e,t=0){return e==null||Number.isNaN(e)?"-- %":`${e.toFixed(t)} %`}const qc={fridge:"❄️","fridge-outline":"❄️",dishwasher:"🍽️","washing-machine":"🧺","tumble-dryer":"🌪️",stove:"🔥",microwave:"📦","coffee-maker":"☕",kettle:"🫖",toaster:"🍞",lightbulb:"💡","lightbulb-outline":"💡",lamp:"🪔","ceiling-light":"💡","floor-lamp":"🪔","led-strip":"✨","led-strip-variant":"✨","wall-sconce":"💡",chandelier:"💡",thermometer:"🌡️",thermostat:"🌡️",radiator:"♨️","radiator-disabled":"❄️","heat-pump":"♨️","air-conditioner":"❄️",fan:"🌀",hvac:"♨️",fire:"🔥",snowflake:"❄️","lightning-bolt":"⚡",flash:"⚡",battery:"🔋","battery-charging":"🔋","battery-50":"🔋","solar-panel":"☀️","solar-power":"☀️","meter-electric":"⚡","power-plug":"🔌","power-socket":"🔌",car:"🚗","car-electric":"🚘","car-battery":"🔋","ev-station":"🔌","ev-plug-type2":"🔌",garage:"🏠","garage-open":"🏠",door:"🚪","door-open":"🚪",lock:"🔒","lock-open":"🔓","shield-home":"🛡️",cctv:"📹",camera:"📹","motion-sensor":"👁️","alarm-light":"🚨",bell:"🔔","window-closed":"🪟","window-open":"🪟",blinds:"🪟","blinds-open":"🪟",curtains:"🪟","roller-shade":"🪟",television:"📺",speaker:"🔊","speaker-wireless":"🔊",music:"🎵","volume-high":"🔊",cast:"📡",chromecast:"📡","router-wireless":"📡",wifi:"📶","access-point":"📡",lan:"🌐",network:"🌐","home-assistant":"🏠",water:"💧","water-percent":"💧","water-boiler":"♨️","water-pump":"💧",shower:"🚿",toilet:"🚽",faucet:"🚰",pipe:"🔧","weather-sunny":"☀️","weather-cloudy":"☁️","weather-night":"🌙","weather-rainy":"🌧️","weather-snowy":"❄️","weather-windy":"💨",information:"ℹ️","help-circle":"❓","alert-circle":"⚠️","checkbox-marked-circle":"✅","toggle-switch":"🔘",power:"⚡",sync:"🔄"};function en(e){const t=e.replace(/^mdi:/,"");return qc[t]||"⚙️"}function Zn(e,t){let i=!1;return(...r)=>{i||(e(...r),i=!0,setTimeout(()=>i=!1,t))}}async function Wi(e,t=3,i=1e3){let r;for(let n=0;n<=t;n++)try{return await e()}catch(a){if(r=a,a instanceof Error&&(a.message.includes("401")||a.message.includes("403")))throw a;if(n<t){const o=Math.min(i*Math.pow(2,n),5e3);await new Promise(s=>setTimeout(s,o))}}throw r}class Gc{constructor(){this.state={...Jo,pendingServices:new Map,changingServices:new Set},this.listeners=new Set,this.watcherUnsub=null,this.queueUpdateInterval=null,this.started=!1}start(){this.started||(this.started=!0,this.watcherUnsub=At.onEntityChange((t,i)=>{t&&this.shouldRefreshShield(t)&&this.refresh()}),this.refresh(),this.queueUpdateInterval=window.setInterval(()=>{this.state.allRequests.length>0&&this.notify()},1e3),P.debug("ShieldController started"))}stop(){var t;(t=this.watcherUnsub)==null||t.call(this),this.watcherUnsub=null,this.queueUpdateInterval!==null&&(clearInterval(this.queueUpdateInterval),this.queueUpdateInterval=null),this.started=!1,P.debug("ShieldController stopped")}subscribe(t){return this.listeners.add(t),t(this.state),()=>this.listeners.delete(t)}getState(){return this.state}shouldRefreshShield(t){return["service_shield_","box_prms_mode","box_mode_extended","box_prm2_app","boiler_manual_mode","invertor_prms_to_grid","invertor_prm1_p_max_feed_grid"].some(r=>t.includes(r))}readSupplementaryState(t){const i=t.findSensorId("box_mode_extended"),r=t.get(i);if(!r||r.state==="unavailable"||r.state==="unknown"||r.state==="")return{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1};const n=r.attributes??{};return{home_grid_v:n.home_grid_v===!0,home_grid_vi:n.home_grid_vi===!0,flexibilita:n.flexibilita===!0,available:!0}}refresh(){const t=dt();if(t)try{const i=t.findSensorId("service_shield_activity"),r=t.get(i),n=(r==null?void 0:r.attributes)??{},a=n.running_requests??[],o=n.queued_requests??[],s=t.findSensorId("service_shield_status"),d=t.findSensorId("service_shield_queue"),p=t.getString(s).value,u=t.getNumeric(d).value,h=t.getString(t.findSensorId("box_prms_mode")).value,b=t.getString(t.findSensorId("invertor_prms_to_grid")).value,f=t.getNumeric(t.findSensorId("invertor_prm1_p_max_feed_grid")).value,m=t.getString(t.findSensorId("boiler_manual_mode")).value,y=Ua[h.trim()]??"home_1",S=Ya[m.trim()]??"cbb",v=a.map((q,B)=>this.parseRequest(q,B,!0)),$=o.map((q,B)=>this.parseRequest(q,B+a.length,!1)),T=[...v,...$],W=new Map,F=new Set;for(const q of T){const B=this.parseServiceRequest(q);B&&!W.has(B.type)&&(W.set(B.type,B.targetValue),F.add(B.type))}const R=p==="Running"||p==="running",D=es({gridModeRaw:b,gridLimit:f},{pendingServices:W,changingServices:F,shieldStatus:R?"running":"idle"}),K=sa(b)||D.currentLiveDelivery==="unknown"?this.state.currentGridDelivery:D.currentLiveDelivery;this.state={status:R?"running":"idle",activity:(r==null?void 0:r.state)??"",queueCount:u,runningRequests:v,queuedRequests:$,allRequests:T,currentBoxMode:y,currentGridDelivery:K,currentGridLimit:D.currentLiveLimit??0,currentBoilerMode:S,pendingServices:W,changingServices:F,gridDeliveryState:D,supplementary:this.readSupplementaryState(t)},this.notify()}catch(i){P.error("ShieldController refresh failed",i)}}parseRequest(t,i,r){const n=t||{},a=n.service??"",s=(Array.isArray(n.changes)?n.changes:[]).map(m=>typeof m=="string"?m:String(m??"")).filter(m=>m.length>0),d=n.started_at??n.queued_at??n.created_at??n.timestamp??n.created??"",p=Array.isArray(n.targets)?n.targets.map(m=>({param:String((m==null?void 0:m.param)??""),value:String((m==null?void 0:m.value)??(m==null?void 0:m.to)??""),entityId:String((m==null?void 0:m.entity_id)??(m==null?void 0:m.entityId)??""),from:String((m==null?void 0:m.from)??""),to:String((m==null?void 0:m.to)??(m==null?void 0:m.value)??""),current:String((m==null?void 0:m.current)??"")})):[],u=this.extractRequestParams(n.params),h=this.extractGridDeliveryStep(n,u),b=this.resolveRequestTargetValue(n,p,u,h);let f="mode_change";if(a.includes("set_box_mode")){const m=this.extractRequestParams(n.params);f=(m==null?void 0:m.home_grid_v)!==void 0||(m==null?void 0:m.home_grid_vi)!==void 0||Array.isArray(n.targets)&&n.targets.some(S=>(S==null?void 0:S.param)==="app")?"supplementary_toggle":"mode_change"}else a.includes("set_grid_delivery")&&!a.includes("limit")?f="grid_delivery":a.includes("grid_delivery_limit")||a.includes("set_grid_delivery")?f="grid_limit":a.includes("set_boiler_mode")?f="boiler_mode":a.includes("set_formating_mode")&&(f="battery_formating");return{id:`${a}_${i}_${d}`,type:f,status:r?"running":"queued",service:a,targetValue:b,changes:s,createdAt:d,position:i+1,description:typeof n.description=="string"?n.description:void 0,params:u,targets:p,traceId:typeof n.trace_id=="string"?n.trace_id:void 0,gridDeliveryStep:h}}parseServiceRequest(t){var p,u;const i=t.service;if(!i)return null;const r=t.changes.length>0?t.changes[0]:"",n=t.params,a=t.gridDeliveryStep,o=this.extractStructuredTarget(t);if(i.includes("set_grid_delivery")&&o)return o;if(i.includes("set_grid_delivery")&&r.includes("p_max_feed_grid")){const h=r.match(/→\s*'?(\d+)'?/),b=h?h[1]:t.targetValue;return b?{type:"grid_limit",targetValue:b}:null}const s=r.match(/→\s*'([^']+)'/),d=s?s[1]:t.targetValue||"";if(i.includes("set_box_mode")){if(((p=t.targets)==null?void 0:p.some(b=>b.param==="app"))||(n==null?void 0:n.home_grid_v)!==void 0||(n==null?void 0:n.home_grid_vi)!==void 0){const b=(u=t.targets)==null?void 0:u.find(y=>y.param==="app"),f=(b==null?void 0:b.to)||t.targetValue;return{type:"supplementary",targetValue:Xo[f]??f??""}}return{type:"box_mode",targetValue:d}}if(i.includes("set_boiler_mode"))return{type:"boiler_mode",targetValue:d};if(i.includes("set_grid_delivery")&&r.includes("prms_to_grid"))return{type:"grid_mode",targetValue:d};if(i.includes("set_grid_delivery")){if(a==="limit"){const b=this.normalizeNumericTargetValue((n==null?void 0:n.limit)??t.targetValue);return b?{type:"grid_limit",targetValue:b}:null}if(a==="mode"){const b=this.normalizeModeTargetValue((n==null?void 0:n.mode)??t.targetValue);return b?{type:"grid_mode",targetValue:b}:null}const h=r.match(/→\s*'?(\d+)'?/);return h?{type:"grid_limit",targetValue:h[1]}:t.targetValue&&/^\d+$/.test(t.targetValue.trim())?{type:"grid_limit",targetValue:t.targetValue}:{type:"grid_mode",targetValue:d}}return null}extractRequestParams(t){if(!(!t||typeof t!="object"||Array.isArray(t)))return t}extractGridDeliveryStep(t,i){const r=(t==null?void 0:t.grid_delivery_step)??(i==null?void 0:i._grid_delivery_step);return typeof r=="string"?r:void 0}resolveRequestTargetValue(t,i,r,n){const a=this.extractStructuredTarget({service:(t==null?void 0:t.service)??"",targetValue:"",params:r,targets:i,gridDeliveryStep:n});if(a!=null&&a.targetValue)return a.targetValue;const o=t.target_value??t.target_display;return typeof o=="string"?o:""}extractStructuredTarget(t){if(!t.service.includes("set_grid_delivery"))return null;const i=t.gridDeliveryStep,r=t.params,n=t.targets??[];if(i==="limit"){const s=this.findTargetValue(n,["limit"]),d=this.normalizeNumericTargetValue(s??(r==null?void 0:r.limit)??t.targetValue);return d?{type:"grid_limit",targetValue:d}:null}if(i==="mode"){const s=this.findTargetValue(n,["mode"]),d=this.normalizeModeTargetValue(s??(r==null?void 0:r.mode)??t.targetValue);return d?{type:"grid_mode",targetValue:d}:null}const a=this.findTargetValue(n,["limit"]);if(a){const s=this.normalizeNumericTargetValue(a);if(s)return{type:"grid_limit",targetValue:s}}const o=this.findTargetValue(n,["mode"]);if(o){const s=this.normalizeModeTargetValue(o);if(s)return{type:"grid_mode",targetValue:s}}return null}findTargetValue(t,i){const r=new Set(i),n=t.find(a=>r.has(a.param));return(n==null?void 0:n.to)||(n==null?void 0:n.value)||void 0}normalizeNumericTargetValue(t){if(typeof t=="number"&&Number.isFinite(t))return String(Math.round(t));if(typeof t!="string")return"";const i=t.trim().match(/(\d+)/);return i?i[1]:""}normalizeModeTargetValue(t){if(typeof t!="string")return"";const i=t.trim();switch(i.toLowerCase()){case"off":return"Vypnuto";case"on":return"Zapnuto";case"limited":return"Omezeno";default:return i}}isLimitedGridDeliveryActiveOrPending(){const t=this.state.gridDeliveryState;if(t.pendingDeliveryTarget==="limited"||t.pendingLimitTarget!==null||t.currentLiveDelivery==="limited"||t.currentLiveDelivery==="unknown"&&(Ol(t)==="limited"||this.state.currentGridDelivery==="limited"))return!0;const i=dt();if(i){const r=i.getString(i.findSensorId("invertor_prms_to_grid")).value;if(!sa(r)&&_a(r)==="limited")return!0}return!1}needsGridModeChangeForLimitedRequest(){return!this.isLimitedGridDeliveryActiveOrPending()}getBoxModeButtonState(t){const i=this.state.pendingServices.get("box_mode");return i?Ua[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoxMode===t?"active":"idle"}getGridDeliveryButtonState(t){return this.getGridDeliveryButtonStateV2(t)}getGridDeliveryButtonStateV2(t){const i=this.state.gridDeliveryState,n=this.state.status==="running"?"processing":"pending",a=i.pendingDeliveryTarget,o=i.pendingLimitTarget,s=i.currentLiveDelivery;return a!==null?a===t?n:t==="limited"&&s==="limited"||t==="limited"&&s==="unknown"&&this.state.currentGridDelivery==="limited"?"active":"disabled-by-service":o!==null?t==="limited"?n:"disabled-by-service":s===t?"active":"idle"}getBoilerModeButtonState(t){const i=this.state.pendingServices.get("boiler_mode");return i?Ya[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoilerMode===t?"active":"idle"}isAnyServiceChanging(){return this.state.changingServices.size>0}shouldProceedWithQueue(){return this.state.queueCount<3?!0:window.confirm(`⚠️ VAROVÁNÍ: Fronta již obsahuje ${this.state.queueCount} úkolů!

Každá změna může trvat až 10 minut.
Opravdu chcete přidat další úkol?`)}async setBoxMode(t){if(this.state.currentBoxMode===t&&!this.state.changingServices.has("box_mode"))return!1;const i=await se.callService("oig_cloud","set_box_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async setGridDelivery(t,i){const r={acknowledgement:!0,warning:!0};t==="limited"&&i!=null?(this.needsGridModeChangeForLimitedRequest()&&(r.mode=t),r.limit=i):i!=null?r.limit=i:r.mode=t;const n=await se.callService("oig_cloud","set_grid_delivery",r);return n&&this.refresh(),n}async setBoilerMode(t){if(this.state.currentBoilerMode===t&&!this.state.changingServices.has("boiler_mode"))return!1;const i=await se.callService("oig_cloud","set_boiler_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async removeFromQueue(t){const i=await se.callService("oig_cloud","shield_remove_from_queue",{position:t});return i&&this.refresh(),i}async setSupplementaryToggle(t,i){const r=await se.callService("oig_cloud","set_box_mode",{[t]:i,acknowledgement:!0});return r&&this.refresh(),r}notify(){for(const t of this.listeners)try{t(this.state)}catch(i){P.error("ShieldController listener error",i)}}}const de=new Gc;var Uc=Object.defineProperty,Yc=Object.getOwnPropertyDescriptor,Vt=(e,t,i,r)=>{for(var n=r>1?void 0:r?Yc(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Uc(t,i,n),n};const Ie=Q;let tt=class extends E{constructor(){super(...arguments),this.title="Energetické Toky",this.time="",this.showStatus=!1,this.alertCount=0,this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1}onStatusClick(){this.dispatchEvent(new CustomEvent("status-click",{bubbles:!0}))}onEditClick(){this.dispatchEvent(new CustomEvent("edit-click",{bubbles:!0}))}onResetClick(){this.dispatchEvent(new CustomEvent("reset-click",{bubbles:!0}))}onToggleLeftPanel(){this.dispatchEvent(new CustomEvent("toggle-left-panel",{bubbles:!0}))}onToggleRightPanel(){this.dispatchEvent(new CustomEvent("toggle-right-panel",{bubbles:!0}))}render(){const e=this.alertCount>0?"warning":"ok";return c`
      <h1 class="title">
        <span class="title-icon">⚡</span>
        ${this.title}
        <span class="version">V2</span>
        ${this.time?c`<span class="time">${this.time}</span>`:null}
      </h1>
      
      <div class="spacer"></div>
      
      ${this.showStatus?c`
        <div class="status-badge ${e}" @click=${this.onStatusClick}>
          ${this.alertCount>0?c`
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
    `}};tt.styles=z`
    :host {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: ${Ie(l.bgPrimary)};
      border-bottom: 1px solid ${Ie(l.divider)};
      gap: 12px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
      color: ${Ie(l.textPrimary)};
      margin: 0;
    }

    .title-icon { font-size: 20px; }

    .version {
      font-size: 11px;
      color: ${Ie(l.textSecondary)};
      background: ${Ie(l.bgSecondary)};
      padding: 2px 6px;
      border-radius: 4px;
    }

    .time {
      font-size: 13px;
      color: ${Ie(l.textSecondary)};
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
      background: ${Ie(l.warning)};
      color: #fff;
    }

    .status-badge.error {
      background: ${Ie(l.error)};
      color: #fff;
    }

    .status-badge.ok {
      background: ${Ie(l.success)};
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
      color: ${Ie(l.textSecondary)};
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: ${Ie(l.bgSecondary)};
      color: ${Ie(l.textPrimary)};
    }

    .action-btn.active {
      background: ${Ie(l.accent)};
      color: #fff;
    }
  `;Vt([g({type:String})],tt.prototype,"title",2);Vt([g({type:String})],tt.prototype,"time",2);Vt([g({type:Boolean})],tt.prototype,"showStatus",2);Vt([g({type:Number})],tt.prototype,"alertCount",2);Vt([g({type:Boolean})],tt.prototype,"leftPanelCollapsed",2);Vt([g({type:Boolean})],tt.prototype,"rightPanelCollapsed",2);tt=Vt([O("oig-header")],tt);function us(e,t){let i=null;return function(...r){i!==null&&clearTimeout(i),i=window.setTimeout(()=>{e.apply(this,r),i=null},t)}}var Zc=Object.defineProperty,Qc=Object.getOwnPropertyDescriptor,mr=(e,t,i,r)=>{for(var n=r>1?void 0:r?Qc(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Zc(t,i,n),n};const bo="oig_v2_theme";let It=class extends E{constructor(){super(...arguments),this.mode="auto",this.isDark=!1,this.breakpoint="desktop",this.width=1280,this.mediaQuery=null,this.resizeObserver=null,this.debouncedResize=us(this.updateBreakpoint.bind(this),100),this.onMediaChange=e=>{this.mode==="auto"&&(this.isDark=e.matches,this.dispatchEvent(new CustomEvent("theme-changed",{detail:{isDark:this.isDark}})))},this.onThemeChange=()=>{this.detectTheme()}}connectedCallback(){super.connectedCallback(),this.loadTheme(),this.setupMediaQuery(),this.setupResizeObserver(),this.detectTheme(),window.addEventListener("oig-theme-change",this.onThemeChange)}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mediaQuery)==null||e.removeEventListener("change",this.onMediaChange),(t=this.resizeObserver)==null||t.disconnect(),window.removeEventListener("oig-theme-change",this.onThemeChange)}loadTheme(){const e=localStorage.getItem(bo);e&&["light","dark","auto"].includes(e)&&(this.mode=e)}saveTheme(){localStorage.setItem(bo,this.mode)}setupMediaQuery(){this.mediaQuery=window.matchMedia("(prefers-color-scheme: dark)"),this.mediaQuery.addEventListener("change",this.onMediaChange)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(this.debouncedResize),this.resizeObserver.observe(document.documentElement),this.updateBreakpoint()}updateBreakpoint(){this.width=window.innerWidth,this.breakpoint=oi(this.width)}detectTheme(){this.mode==="auto"?this.isDark=window.matchMedia("(prefers-color-scheme: dark)").matches:this.isDark=this.mode==="dark"}setTheme(e){this.mode=e,this.saveTheme(),this.detectTheme(),this.dispatchEvent(new CustomEvent("theme-changed",{detail:{mode:e,isDark:this.isDark}})),P.info("Theme changed",{mode:e,isDark:this.isDark})}getThemeInfo(){return{mode:this.mode,isDark:this.isDark,breakpoint:this.breakpoint,width:this.width}}render(){return c`
      <slot></slot>
    `}};It.styles=z`
    :host {
      display: contents;
    }
  `;mr([g({type:String})],It.prototype,"mode",2);mr([M()],It.prototype,"isDark",2);mr([M()],It.prototype,"breakpoint",2);mr([M()],It.prototype,"width",2);It=mr([O("oig-theme-provider")],It);var Xc=Object.defineProperty,Jc=Object.getOwnPropertyDescriptor,Sa=(e,t,i,r)=>{for(var n=r>1?void 0:r?Jc(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Xc(t,i,n),n};let er=class extends E{constructor(){super(...arguments),this.tabs=[],this.activeTab=""}onTabClick(e){e!==this.activeTab&&(this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tabId:e},bubbles:!0})))}isActive(e){return this.activeTab===e}render(){return c`
      ${this.tabs.map(e=>c`
        <button 
          class="tab ${this.isActive(e.id)?"active":""}"
          @click=${()=>this.onTabClick(e.id)}
        >
          ${e.icon?c`<span class="tab-icon">${e.icon}</span>`:null}
          <span>${e.label}</span>
        </button>
      `)}
    `}};er.styles=z`
    :host {
      display: flex;
      gap: 8px;
      padding: 0 16px;
      background: ${Q(l.bgPrimary)};
      border-bottom: 1px solid ${Q(l.divider)};
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
      color: ${Q(l.textSecondary)};
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab:hover {
      color: ${Q(l.textPrimary)};
      background: ${Q(l.bgSecondary)};
    }

    .tab.active {
      color: ${Q(l.accent)};
      border-bottom-color: ${Q(l.accent)};
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

    /* Landscape kiosk (Google Nest Hub): nižší lišta tabů */
    @media (orientation: landscape) and (max-height: 600px) {
      .tab { padding: 5px 14px; font-size: 13px; }
    }
  `;Sa([g({type:Array})],er.prototype,"tabs",2);Sa([g({type:String})],er.prototype,"activeTab",2);er=Sa([O("oig-tabs")],er);var ed=Object.defineProperty,td=Object.getOwnPropertyDescriptor,Ca=(e,t,i,r)=>{for(var n=r>1?void 0:r?td(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&ed(t,i,n),n};const id="oig_v2_layout_",Qn=Q;let tr=class extends E{constructor(){super(...arguments),this.editable=!1,this.breakpoint="desktop",this.onResize=us(()=>{this.breakpoint=oi(window.innerWidth)},100)}connectedCallback(){super.connectedCallback(),this.breakpoint=oi(window.innerWidth),window.addEventListener("resize",this.onResize)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("resize",this.onResize)}updated(e){e.has("breakpoint")&&this.setAttribute("breakpoint",this.breakpoint)}resetLayout(){const e=`${id}${this.breakpoint}`;localStorage.removeItem(e),this.requestUpdate()}render(){return c`<slot></slot>`}};tr.styles=z`
    :host {
      display: grid;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      background: ${Qn(l.bgSecondary)};
    }

    :host([breakpoint='mobile']) { grid-template-columns: 1fr; }
    :host([breakpoint='tablet']) { grid-template-columns: repeat(2, 1fr); }
    :host([breakpoint='desktop']) { grid-template-columns: repeat(3, 1fr); }

    .grid-item {
      position: relative;
      background: ${Qn(l.cardBg)};
      border-radius: 8px;
      box-shadow: ${Qn(l.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .grid-item.editable { cursor: move; }
    .grid-item.editable:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .grid-item.dragging { opacity: 0.8; transform: scale(1.02); z-index: 100; }

    @media (max-width: 768px) {
      :host { gap: 12px; padding: 12px; }
    }
  `;Ca([g({type:Boolean})],tr.prototype,"editable",2);Ca([M()],tr.prototype,"breakpoint",2);tr=Ca([O("oig-grid")],tr);const rd={off:"Vypnuto",on:"Zapnuto",limited:"Omezeno",unknown:"?"};function fo(e){return rd[e]??e}const hs=e=>{const t=e.trim();return t?t.endsWith("W")?t:`${t}W`:""};function nd(e){const t=e.isUnavailable;let i;t||e.currentLiveDelivery==="unknown"?i="?":e.currentLiveDelivery==="limited"&&e.currentLiveLimit!==null?i=`Omezeno ${e.currentLiveLimit}W`:i=fo(e.currentLiveDelivery);const r=!t&&e.currentLiveDelivery==="limited";let n=null,a=null;!t&&e.currentLiveLimit!==null&&(a=`${e.currentLiveLimit}W`,n=r?"Aktivní limit":"Nastavený limit");let o=null,s=null;return e.pendingDeliveryTarget!==null&&(o=`Ve frontě: ${fo(e.pendingDeliveryTarget)}`),e.pendingLimitTarget!==null&&(s=`Ve frontě: limit ${hs(String(e.pendingLimitTarget))}`),{currentModeText:i,limitLabel:n,limitValue:a,showLimitAsActive:r,isUnavailable:t,isTransitioning:e.isTransitioning,pendingModeText:o,pendingLimitText:s}}function ad(e,t){const i=t.has("box_mode"),r=e.get("box_mode"),n=t.has("grid_mode")||t.has("grid_limit"),a=e.get("grid_limit"),o=e.get("grid_mode");let s=null;if(a){const d=hs(a);s=d?`→ ${d}`:null}else o&&(s=`→ ${o}`);return{inverterModeChanging:i,inverterModeText:r?`→ ${r}`:null,gridExportChanging:n,gridExportText:s}}var od=Object.defineProperty,sd=Object.getOwnPropertyDescriptor,$n=(e,t,i,r)=>{for(var n=r>1?void 0:r?sd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&od(t,i,n),n};let pi=class extends E{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1}get fillHeight(){return Math.max(0,Math.min(100,this.soc))/100*54}get fillY(){return 13+(54-this.fillHeight)}render(){return c`
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
    `}};pi.styles=z`
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
  `;$n([g({type:Number})],pi.prototype,"soc",2);$n([g({type:Boolean})],pi.prototype,"charging",2);$n([g({type:Boolean})],pi.prototype,"gridCharging",2);pi=$n([O("oig-battery-gauge")],pi);var ld=Object.defineProperty,cd=Object.getOwnPropertyDescriptor,kn=(e,t,i,r)=>{for(var n=r>1?void 0:r?cd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&ld(t,i,n),n};let ui=class extends E{constructor(){super(...arguments),this.power=0,this.percent=0,this.maxPower=5400}get isNight(){return this.percent<2}get level(){return this.percent<2?"night":this.percent<20?"low":this.percent<65?"mid":"high"}get sunColor(){const e=this.level;return e==="low"?"#b0bec5":e==="mid"?"#ffd54f":"#ffb300"}get rayLen(){const e=this.level;return e==="low"?4:e==="mid"?7:10}get rayOpacity(){const e=this.level;return e==="low"?.5:e==="mid"?.8:1}get coreRadius(){const e=this.level;return e==="low"?7:e==="mid"?9:11}renderMoon(){return Y`
      <circle cx="24" cy="24" r="20" fill="#3949ab" opacity="0.28"/>
      <g class="moon-body">
        <path d="M24 6 A18 18 0 1 0 24 42 A13 13 0 1 1 24 6Z" fill="#cfd8dc" opacity="0.95"/>
      </g>
      <circle class="star" cx="7" cy="10" r="1.5" fill="#e8eaf6" style="animation-delay:0s"/>
      <circle class="star" cx="41" cy="7" r="1.8" fill="#e8eaf6" style="animation-delay:0.7s"/>
      <circle class="star" cx="5" cy="30" r="1.2" fill="#c5cae9" style="animation-delay:1.4s"/>
      <circle class="star" cx="6" cy="44" r="1.0" fill="#c5cae9" style="animation-delay:2.1s"/>
      <circle class="star" cx="42" cy="39" r="1.3" fill="#e8eaf6" style="animation-delay:2.8s"/>
    `}renderSun(){const i=this.coreRadius,r=i+3,n=r+this.rayLen,a=this.sunColor,o=this.rayOpacity,d=[0,45,90,135,180,225,270,315].map(u=>{const h=u*Math.PI/180,b=24+Math.cos(h)*r,f=24+Math.sin(h)*r,m=24+Math.cos(h)*n,y=24+Math.sin(h)*n;return Y`
        <line class="ray"
          x1="${b}" y1="${f}" x2="${m}" y2="${y}"
          stroke="${a}" stroke-width="2.5" opacity="${o}"
        />
      `}),p=this.level==="low";return Y`
      <!-- Paprsky obaleny v <g> pro CSS rotaci -->
      <g class="rays-group">
        ${d}
      </g>
      <circle class="sun-core" cx="${24}" cy="${24}" r="${i}" fill="${a}" />
      ${p?Y`
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
    `}};ui.styles=z`
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
  `;kn([g({type:Number})],ui.prototype,"power",2);kn([g({type:Number})],ui.prototype,"percent",2);kn([g({type:Number})],ui.prototype,"maxPower",2);ui=kn([O("oig-solar-icon")],ui);var dd=Object.defineProperty,pd=Object.getOwnPropertyDescriptor,yr=(e,t,i,r)=>{for(var n=r>1?void 0:r?pd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&dd(t,i,n),n};let Bt=class extends E{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1,this.discharging=!1,this._clipId=`batt-clip-${Math.random().toString(36).slice(2)}`}get fillColor(){return this.gridCharging?"#42a5f5":this.soc>50?"#4caf50":this.soc>20?"#ff9800":"#f44336"}get fillHeight(){return Math.max(1,Math.min(100,this.soc)/100*48)}get fillY(){return 14+(48-this.fillHeight)}get stripeColor(){return this.gridCharging?"#90caf9":"#a5d6a7"}render(){const e=this.charging||this.gridCharging,t=this.soc>=25;return c`
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
        ${e?Y`
          <rect
            class="charge-stripe active"
            x="4" y="52" width="24" height="8" rx="2"
            fill="${this.stripeColor}"
            clip-path="url(#${this._clipId})"
          />
        `:""}

        <!-- SoC text uvnitř -->
        ${t?Y`
          <text class="soc-text" x="16" y="${this.fillY+this.fillHeight/2}">
            ${Math.round(this.soc)}%
          </text>
        `:""}
      </svg>
    `}};Bt.styles=z`
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
  `;yr([g({type:Number})],Bt.prototype,"soc",2);yr([g({type:Boolean})],Bt.prototype,"charging",2);yr([g({type:Boolean})],Bt.prototype,"gridCharging",2);yr([g({type:Boolean})],Bt.prototype,"discharging",2);Bt=yr([O("oig-battery-icon")],Bt);var ud=Object.defineProperty,hd=Object.getOwnPropertyDescriptor,gs=(e,t,i,r)=>{for(var n=r>1?void 0:r?hd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&ud(t,i,n),n};let tn=class extends E{constructor(){super(...arguments),this.power=0}get mode(){return this.power>50?"importing":this.power<-50?"exporting":"idle"}render(){const e=this.mode;return c`
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
    `}};tn.styles=z`
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
  `;gs([g({type:Number})],tn.prototype,"power",2);tn=gs([O("oig-grid-icon")],tn);var gd=Object.defineProperty,bd=Object.getOwnPropertyDescriptor,Sn=(e,t,i,r)=>{for(var n=r>1?void 0:r?bd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&gd(t,i,n),n};let hi=class extends E{constructor(){super(...arguments),this.power=0,this.maxPower=1e4,this.boilerActive=!1}get percent(){return Math.min(100,this.power/Math.max(1,this.maxPower)*100)}get fillColor(){const e=this.percent;return e<15?"#546e7a":e<40?"#f06292":e<70?"#e91e63":"#c62828"}get level(){const e=this.percent;return e<15?"low":e<60?"mid":"high"}get windowColor(){const e=this.level;return e==="low"?"#37474f":e==="mid"?"#ffd54f":"#ffb300"}render(){const e=this.percent,t=24,i=22,r=Math.max(1,e/100*t),n=i+(t-r),a=this.level;return c`
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
        ${this.boilerActive?Y`
          <circle class="boiler-dot" cx="10" cy="43" r="3.5" fill="#ff5722" opacity="0.9"/>
          <text x="10" y="43" text-anchor="middle" dominant-baseline="middle" font-size="5" fill="white">🔥</text>
        `:""}
      </svg>
    `}};hi.styles=z`
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
  `;Sn([g({type:Number})],hi.prototype,"power",2);Sn([g({type:Number})],hi.prototype,"maxPower",2);Sn([g({type:Boolean})],hi.prototype,"boilerActive",2);hi=Sn([O("oig-house-icon")],hi);var fd=Object.defineProperty,md=Object.getOwnPropertyDescriptor,vr=(e,t,i,r)=>{for(var n=r>1?void 0:r?md(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&fd(t,i,n),n};let Nt=class extends E{constructor(){super(...arguments),this.mode="",this.bypassActive=!1,this.hasAlarm=!1,this.plannerAuto=!1}get modeType(){return this.hasAlarm?"alarm":this.bypassActive?"bypass":this.mode.includes("UPS")?"ups":"normal"}render(){const e=this.modeType;return c`
      <svg viewBox="0 0 48 48">
        <!-- Hlavní box střídače -->
        <rect
          class="box ${e}"
          x="4" y="8" width="40" height="34" rx="5"
        />

        <!-- Sinusoida výstupu -->
        <path class="sine-out ${e}" d="${"M 10,28 C 14,28 14,20 18,22 C 22,24 22,32 26,32 C 30,32 30,20 34,22 C 38,24 38,28 38,28"}"/>

        <!-- UPS blesk -->
        ${e==="ups"?Y`
          <path class="ups-bolt active"
            d="M 25,12 L 20,26 L 24,26 L 23,36 L 28,22 L 24,22 Z"
          />
        `:""}

        <!-- Bypass výstraha — trojúhelník nahoře -->
        ${e==="bypass"?Y`
          <polygon
            class="warning-triangle active"
            points="24,6 18,16 30,16"
          />
          <text x="24" y="15" text-anchor="middle" dominant-baseline="middle"
            font-size="6" font-weight="bold" fill="#fff">!</text>
        `:""}

        <!-- Alarm kroužek -->
        ${e==="alarm"?Y`
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
    `}};Nt.styles=z`
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
  `;vr([g({type:String})],Nt.prototype,"mode",2);vr([g({type:Boolean})],Nt.prototype,"bypassActive",2);vr([g({type:Boolean})],Nt.prototype,"hasAlarm",2);vr([g({type:Boolean})],Nt.prototype,"plannerAuto",2);Nt=vr([O("oig-inverter-icon")],Nt);var yd=Object.defineProperty,vd=Object.getOwnPropertyDescriptor,We=(e,t,i,r)=>{for(var n=r>1?void 0:r?vd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&yd(t,i,n),n};const J=Q,mo=new URLSearchParams(window.location.search),xd=mo.get("sn")||mo.get("inverter_sn")||"",wd=e=>`sensor.oig_${xd}_${e}`,Xn="oig_v2_flow_layout_",st=["solar","battery","inverter","grid","house"],_d={solar:{top:"0%",left:"0%"},house:{top:"0%",left:"65%"},inverter:{top:"35%",left:"35%"},grid:{top:"70%",left:"0%"},battery:{top:"70%",left:"65%"}},bs="oig_v2_flow_expanded_nodes";function $d(){try{const e=localStorage.getItem(bs);if(e)return new Set(JSON.parse(e))}catch{}return new Set(["solar","house"])}function kd(e){try{localStorage.setItem(bs,JSON.stringify([...e]))}catch{}}function ee(e){return()=>se.openEntityDialog(wd(e))}const Sd=1e3,rn=3300,fs=300;function Cd(e){const[t,i,r]=e.map(f=>Math.max(0,isFinite(f)?f:0)),n=t+i+r,a=Math.max(t,i,r)-Math.min(t,i,r),o=n<fs,s=a<=Sd,p=Math.max(t,i,r)/rn*100,u=["L1","L2","L3"],h=[t,i,r].findIndex(f=>f>=rn),b=h>=0?u[h]:null;return{spreadW:a,balanced:s,calm:o,worstPct:p,overloadPhase:b}}function Td(e,t){if(t<fs)return{leftPct:0,widthPct:0};const i=Math.min(...e),r=Math.max(...e);return{leftPct:i,widthPct:r-i}}let Ae=class extends E{constructor(){super(...arguments),this.data=wa,this.editMode=!1,this.pendingServices=new Map,this.changingServices=new Set,this.shieldStatus="idle",this.shieldQueueCount=0,this.gridDeliveryState={currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},this.shieldUnsub=null,this.expandedNodes=$d(),this.gaugeDetailOpen=null,this.customPositions={},this.draggedNodeId=null,this.dragStartX=0,this.dragStartY=0,this.dragStartTop=0,this.dragStartLeft=0,this.onShieldUpdate=e=>{this.pendingServices=e.pendingServices,this.changingServices=e.changingServices,this.shieldStatus=e.status,this.shieldQueueCount=e.queueCount,this.gridDeliveryState=e.gridDeliveryState},this.nodeDims={},this.handleDragStart=e=>{if(!this.editMode)return;e.preventDefault(),e.stopPropagation();const i=e.target.closest(".node");if(!i)return;const r=this.findNodeId(i);if(!r)return;this.draggedNodeId=r,i.classList.add("dragging");const n=i.getBoundingClientRect();this.dragStartX=e.clientX,this.dragStartY=e.clientY,this.dragStartTop=n.top,this.dragStartLeft=n.left},this.handleTouchStart=e=>{if(!this.editMode)return;e.preventDefault();const i=e.target.closest(".node");if(!i)return;const r=this.findNodeId(i);if(!r)return;this.draggedNodeId=r,i.classList.add("dragging");const n=e.touches[0],a=i.getBoundingClientRect();this.dragStartX=n.clientX,this.dragStartY=n.clientY,this.dragStartTop=a.top,this.dragStartLeft=a.left},this.handleDragMove=e=>{!this.draggedNodeId||!this.editMode||(e.preventDefault(),this.updateDragPosition(e.clientX,e.clientY))},this.handleTouchMove=e=>{if(!this.draggedNodeId||!this.editMode)return;e.preventDefault();const t=e.touches[0];this.updateDragPosition(t.clientX,t.clientY)},this.handleDragEnd=e=>{var r;if(!this.draggedNodeId||!this.editMode)return;const t=(r=this.shadowRoot)==null?void 0:r.querySelector(".flow-grid"),i=t==null?void 0:t.querySelector(`.node-${this.draggedNodeId}`);i&&i.classList.remove("dragging"),this.saveLayout(),this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0})),this.draggedNodeId=null},this.handleTouchEnd=e=>{this.handleDragEnd(e)}}connectedCallback(){super.connectedCallback(),this.loadSavedLayout(),this.shieldUnsub=de.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),this.removeDragListeners(),(e=this.shieldUnsub)==null||e.call(this),this.shieldUnsub=null}updated(e){e.has("editMode")&&(this.editMode?(this.setAttribute("editmode",""),this.loadSavedLayout(),this.requestUpdate(),this.updateComplete.then(()=>this.applySavedPositions())):(this.removeAttribute("editmode"),this.removeDragListeners(),this.clearInlinePositions(),this.updateComplete.then(()=>this.applyCustomPositions()))),!this.editMode&&this.hasCustomLayout&&this.updateComplete.then(()=>this.applyCustomPositions()),this.measureNodes()}measureNodes(){var r;const e=(r=this.shadowRoot)==null?void 0:r.querySelector(".flow-grid");if(!e)return;let t=!1;const i={...this.nodeDims};for(const n of st){const a=e.querySelector(`.node-${n}`);if(!a)continue;const o=Math.round(a.offsetWidth),s=Math.round(a.offsetHeight);if(o<10||s<10)continue;const d=i[n];(!d||Math.abs(d.w-o)>1||Math.abs(d.h-s)>1)&&(i[n]={w:o,h:s},t=!0)}t&&(this.nodeDims=i)}loadSavedLayout(){const e=oi(window.innerWidth),t=`${Xn}${e}`;try{const i=localStorage.getItem(t);i&&(this.customPositions=JSON.parse(i),P.debug("[FlowNode] Loaded layout for "+e))}catch{}}applySavedPositions(){var t;if(!this.editMode)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of st){const r=this.customPositions[i];if(!r)continue;const n=e.querySelector(`.node-${i}`);n&&(n.style.top=r.top,n.style.left=r.left)}this.initDragListeners()}}clearInlinePositions(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of st){const r=e.querySelector(`.node-${i}`);r&&(r.style.top="",r.style.left="")}}saveLayout(){const e=oi(window.innerWidth),t=`${Xn}${e}`;try{localStorage.setItem(t,JSON.stringify(this.customPositions)),P.debug("[FlowNode] Saved layout for "+e)}catch{}}toggleExpand(e,t){const i=t.target;if(i.closest(".clickable")||i.closest(".indicator")||i.closest(".node-value")||i.closest(".node-subvalue")||i.closest(".gc-plan-btn"))return;const r=new Set(this.expandedNodes);r.has(e)?r.delete(e):r.add(e),this.expandedNodes=r,kd(r)}nodeClass(e,t=""){const i=this.expandedNodes.has(e)?" expanded":"";return`node node-${e}${i}${t?" "+t:""}`}gaugePill(e,t,i,r){const n=this.gaugeDetailOpen===e;return c`
      <button class="ss-pill" style="color:${i};border-color:${i}55"
        @click=${a=>{a.stopPropagation(),this.gaugeDetailOpen=n?null:e}}>${t}</button>
      ${n?c`
        <div class="ss-pop" style="border-color:${i}66"
          @click=${a=>a.stopPropagation()}>${r}</div>`:w}
    `}edgeGauge(e){const t=Math.max(0,Math.min(100,e.pct)),i=Math.max(1.5,Math.min(6,e.width??2.5)),r=e.nodeId?this.nodeDims[e.nodeId]:void 0,n=(r==null?void 0:r.w)??180,a=(r==null?void 0:r.h)??180,o=1.5,s=e.full?0:100-t,d=e.stops.map(([u,h])=>Y`<stop offset="${u}" stop-color="${h}"></stop>`),p=e.pulseDur?`--pulse-dur:${e.pulseDur}s`:"";return Y`
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
          stroke-dasharray="100" stroke-dashoffset=${s}></rect>
      </svg>`}edgeGaugeSegments(e){const t=Math.max(1.5,Math.min(6,e.width??3.5)),i=this.nodeDims[e.nodeId],r=(i==null?void 0:i.w)??180,n=(i==null?void 0:i.h)??180,a=1.5,o=10.5,s=e.segments.filter(u=>u.frac>.001);let d=0;const p=s.map(u=>{const h=-d;return d+=u.frac,Y`<rect x=${a} y=${a}
        width=${r-a*2} height=${n-a*2} rx=${o}
        fill="none" stroke=${u.color} stroke-width=${t}
        pathLength="100"
        stroke-dasharray="${u.frac} 100"
        stroke-dashoffset="${h}"></rect>`});return Y`
      <svg class="edge-gauge" viewBox="0 0 ${r} ${n}" preserveAspectRatio="none">
        <rect class="edge-track" x=${a} y=${a}
          width=${r-a*2} height=${n-a*2} rx=${o}></rect>
        ${p}
      </svg>`}get hasCustomLayout(){return st.some(e=>{const t=this.customPositions[e];return(t==null?void 0:t.top)!=null&&(t==null?void 0:t.left)!=null})}applyCustomPositions(){var t;if(this.editMode||!this.hasCustomLayout)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of st){const r=e.querySelector(`.node-${i}`);if(!r)continue;const n=this.customPositions[i]??_d[i];r.style.top=n.top,r.style.left=n.left}}resetLayout(){const e=oi(window.innerWidth),t=`${Xn}${e}`;localStorage.removeItem(t),this.customPositions={},this.clearInlinePositions(),this.editMode&&this.requestUpdate(),P.debug("[FlowNode] Reset layout for "+e)}initDragListeners(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of st){const r=e.querySelector(`.node-${i}`);r&&(r.addEventListener("mousedown",this.handleDragStart),r.addEventListener("touchstart",this.handleTouchStart,{passive:!1}))}document.addEventListener("mousemove",this.handleDragMove),document.addEventListener("mouseup",this.handleDragEnd),document.addEventListener("touchmove",this.handleTouchMove,{passive:!1}),document.addEventListener("touchend",this.handleTouchEnd)}}removeDragListeners(){document.removeEventListener("mousemove",this.handleDragMove),document.removeEventListener("mouseup",this.handleDragEnd),document.removeEventListener("touchmove",this.handleTouchMove),document.removeEventListener("touchend",this.handleTouchEnd)}findNodeId(e){for(const i of st)if(e.classList.contains(`node-${i}`))return i;const t=e.closest('[class*="node-"]');if(!t)return null;for(const i of st)if(t.classList.contains(`node-${i}`))return i;return null}updateDragPosition(e,t){var $;if(!this.draggedNodeId)return;const i=($=this.shadowRoot)==null?void 0:$.querySelector(".flow-grid");if(!i)return;const r=i.querySelector(`.node-${this.draggedNodeId}`);if(!r)return;const n=i.getBoundingClientRect(),a=r.getBoundingClientRect(),o=e-this.dragStartX,s=t-this.dragStartY,d=this.dragStartLeft+o,p=this.dragStartTop+s,u=n.left,h=n.right-a.width,b=n.top,f=n.bottom-a.height,m=Math.max(u,Math.min(h,d)),y=Math.max(b,Math.min(f,p)),S=(m-n.left)/n.width*100,v=(y-n.top)/n.height*100;r.style.left=`${S}%`,r.style.top=`${v}%`,this.customPositions[this.draggedNodeId]={top:`${v}%`,left:`${S}%`},this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0}))}renderSolar(){const e=this.data,t=D=>D>=1e3?`${(D/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(D)} W`,i=e.solarPercent,r=e.solarPower<5,n=r?"linear-gradient(160deg,#1a1f30,#161a28)":Ni.solar,a="transparent",o=e.solarToday/1e3,s=e.solarForecastToday>.1?e.solarForecastToday:o,d=Math.max(0,s-o),p=Math.max(0,o-s),u=p>.05,h=s>0?Math.round(o/s*100):100,b=Math.max(s,o,.1),f=Math.min(100,o/b*100),m=s/b*100,y=e.solarPower/1e3,S=r?"#5c6bc0":i<20?"#ff7043":i<50?"#ffa726":"#ffd54f",v=r?0:i,$=r?"#5a6480":S,T=r?"#9fa8da":S,W=r?"🌙 Noc":`${Math.round(i)} %`,F=u?"linear-gradient(90deg,#ffd54f,#66bb6a)":r?"linear-gradient(90deg,#6b7390,#8a93b5)":"linear-gradient(90deg,#ffd54f,#ffa726)",R=e.solarP1>0||e.solarV1>0,k=e.solarP2>0||e.solarV2>0,A=r?c`0 <small>W</small>`:(()=>{const D=e.solarPower;return D>=1e3?c`${(D/1e3).toFixed(1).replace(".",",")} <small>kW</small>`:c`${Math.round(D)} <small>W</small>`})();return c`
      <div class="${this.nodeClass("solar",r?"sol-night":"")}"
        style="--node-gradient: ${n}; --node-border: ${a};">

        ${this.edgeGauge({id:"gauge-solar",nodeId:"solar",pct:v,stops:[[0,$],[1,$]],width:r?2:2+Math.min(3,y),pulse:!r&&e.solarPower>30,pulseDur:Math.max(.9,2.2-y*.35),full:r})}

        <div class="node-tint" style="background: radial-gradient(120% 70% at 50% 0, ${r?"rgba(57,73,171,0.18)":S+"22"}, transparent 70%)"></div>

        <!-- GAUGE PILL: peak % špičky or 🌙 Noc -->
        ${this.gaugePill("solar",W,T,c`
          <div class="ss-pop-h"><span>Solární výkon</span><b style="color:${T}">${r?"🌙 Noc":`${Math.round(i)} % špičky`}</b></div>
          <div class="gp-r"><span>Aktuální výkon</span><b>${r?"0 W":`${Pt(e.solarPower)} · ${Math.round(i)} % špičky`}</b></div>
          <div class="gp-r"><span>Vyrobeno</span><b>${o.toFixed(1).replace(".",",")} kWh</b></div>
          <div class="gp-r"><span>Předpověď</span><b>${s.toFixed(1).replace(".",",")} kWh</b></div>
          <div class="gp-r"><span>${u?"Nad plánem":"Ještě vyrobí"}</span><b>${u?`+${p.toFixed(1).replace(".",",")} kWh`:r?"den skončil":d<.05?"splněno":`~${d.toFixed(1).replace(".",",")} kWh`}</b></div>
          <div class="gp-r"><span>Zítra</span><b>${e.solarForecastTomorrow.toFixed(1).replace(".",",")} kWh${e.solarForecastStale?" ⚠":""}</b></div>
        `)}

        <!-- HEADER: animated sun SVG by day / moon SVG at night -->
        <div class="sol-head">
          ${r?Y`<svg class="sol-ico" viewBox="0 0 24 24" fill="none" stroke="#9fa8da" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 14.5A8 8 0 1 1 9.5 4 6.2 6.2 0 0 0 20 14.5z" fill="#2a3050"/>
              </svg>`:Y`<svg class="sol-ico" viewBox="0 0 24 24" fill="none" stroke="${S}" stroke-width="2" stroke-linecap="round">
                <g class="sol-rays"><path d="M12 1.5v2.5M12 20v2.5M1.5 12h2.5M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8"/></g>
                <circle class="sol-core" cx="12" cy="12" r="4.2" fill="${S}" stroke="none"/>
              </svg>`}
          <span class="sol-cap">SOLÁR</span>
        </div>

        <!-- BIG CURRENT POWER -->
        <div class="sol-power" @click=${ee("actual_fv_total")}>
          ${A}
        </div>

        <!-- TINY SUBLINE: dnes X z Y kWh -->
        <div class="sol-sub" @click=${ee("dc_in_fv_ad")}>
          dnes ${o.toFixed(1).replace(".",",")} z ${s.toFixed(1).replace(".",",")} kWh
        </div>

        <!-- PRODUCTION BAR: fill = vyrobeno, target tick = plán, přerůstá nad plán -->
        <div class="sol-pbar">
          <div class="sol-pbar-fill" style="width:${f.toFixed(1)}%;background:${F}">
            ${f>=30?`${o.toFixed(1).replace(".",",")} kWh`:""}
          </div>
          ${u?c`<div class="sol-pbar-tick" style="left:${m.toFixed(1)}%" title="Plán ${s.toFixed(1).replace(".",",")} kWh"></div>`:w}
        </div>
        <div class="sol-pbar-lbl">
          <span>vyrobeno ${h} %</span>
          <span>${u?c`<span class="sol-over">+${p.toFixed(1).replace(".",",")} kWh</span>`:r?"den skončil":d<.05?"splněno":`ještě ~${d.toFixed(1).replace(".",",")} kWh`}</span>
        </div>

        <!-- COMPACT STRINGS (always visible, 2-col) -->
        <div class="sol-str">
          <div class="sol-sc ${R?"":"sol-off"}">
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
        <div class="sol-tmr" @click=${ee("solar_forecast")}>
          ${Y`<svg class="sol-tmr-ico" viewBox="0 0 24 24" fill="none" stroke="#ffd479" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18h18"></path><path d="M7 18a5 5 0 0 1 10 0"></path><path d="M12 5v2M5.6 8.6l1.4 1.4M18.4 8.6l-1.4 1.4M2.5 13h2M19.5 13h2"></path></svg>`}
          Zítra <b>${e.solarForecastTomorrow.toFixed(1).replace(".",",")} kWh</b>
          ${e.solarForecastStale?c`<span title="Předpověď zastaralá">⚠</span>`:w}
        </div>
      </div>
    `}openGridChargingDialog(){this.dispatchEvent(new CustomEvent("oig-grid-charging-open",{bubbles:!0,composed:!0,detail:{data:this.data.gridChargingPlan}}))}getBalancingIndicator(){const e=this.data,t=e.balancingState;return t!=="charging"&&t!=="holding"&&t!=="completed"?{show:!1,text:"",icon:"",cls:""}:t==="charging"?{show:!0,text:`Nabíjení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⚡",cls:"charging"}:t==="holding"?{show:!0,text:`Držení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⏸️",cls:"holding"}:{show:!0,text:"Dokončeno",icon:"✅",cls:"completed"}}renderBattery(){const e=this.data,t=this.getBalancingIndicator(),i=e.batteryTemp>25?"🌡️":e.batteryTemp<15?"🧊":"🌡️",r=e.batteryTemp>25?"temp-hot":e.batteryTemp<15?"temp-cold":"",n=Math.abs(e.batteryPower)/1e3,a=Math.abs(e.batteryPower)>10,o=e.batteryPower>10,s=e.batteryPower<-10,d=o?"Nabíjí":s?"Vybíjí":"Klid",p=o?"st-charge":s?"st-discharge":"st-idle",u=`${o?"+":s?"−":""}${Pt(Math.abs(e.batteryPower))}`,h=y=>!!y&&/\d/.test(y),b=o&&h(e.timeToFull)?` · do plna ${e.timeToFull}`:s&&h(e.timeToEmpty)?` · do vybití ${e.timeToEmpty}`:"",f=e.batterySoC>=66?"rgba(67,160,71,0.13)":e.batterySoC>=33?"rgba(253,216,53,0.10)":"rgba(229,57,53,0.12)",m=e.batterySoC>=66?"#43a047":e.batterySoC>=33?"#fdd835":"#e53935";return c`
      <div class="${this.nodeClass("battery")}" style="--node-gradient: ${Ni.battery}; --node-border: ${jr.battery};"
        @click=${y=>this.toggleExpand("battery",y)}>
        ${this.edgeGauge({id:"gauge-battery",nodeId:"battery",pct:e.batterySoC,stops:[[0,"#e53935"],[.45,"#fb8c00"],[.7,"#fdd835"],[1,"#43a047"]],width:2+Math.min(3,n),pulse:a,pulseDur:Math.max(.9,2.2-n*.35)})}

        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 100%, ${f}, transparent 72%)"></div>
        ${this.gaugePill("battery",`${Math.round(e.batterySoC)} %`,m,c`
          <div class="ss-pop-h"><span>Nabití baterie</span><b style="color:${m}">${Math.round(e.batterySoC)} %</b></div>
          <div class="gp-r"><span>Stav</span><b>${d} ${u}</b></div>
          ${b?c`<div class="gp-r"><span>Čas</span><b>${b.replace(" · ","")}</b></div>`:w}
          <div class="gp-r"><span>Dnes nabito</span><b>${ot(e.batteryChargeTotal)}</b></div>
          <div class="gp-r"><span>Dnes vybito</span><b>${ot(e.batteryDischargeTotal)}</b></div>
        `)}

        <div class="node-header node-header--split">
          <span class="node-label">🔋 Baterie</span>
          <span class="node-state ${p}">${d}</span>
        </div>

        <div class="node-value" @click=${ee("batt_bat_c")}>
          ${Math.round(e.batterySoC)} %
        </div>
        <div class="node-subvalue" @click=${ee("batt_batt_comp_p")}>
          ${u}${b}
        </div>

        ${e.isGridCharging?c`
          <span class="grid-charging-badge">⚡🔌 Síťové nabíjení</span>
        `:w}
        ${t.show?c`
          <span class="balancing-indicator ${t.cls}">
            <span>${t.icon}</span>
            <span>${t.text}</span>
          </span>
        `:w}

        <div class="battery-indicators">
          <button class="indicator" @click=${ee("extended_battery_voltage")}>
            ⚡ ${e.batteryVoltage.toFixed(1)} V
          </button>
          <button class="indicator" @click=${ee("extended_battery_current")}>
            〰️ ${e.batteryCurrent.toFixed(1)} A
          </button>
          <button class="indicator ${r}" @click=${ee("extended_battery_temperature")}>
            ${i} ${e.batteryTemp.toFixed(1)} °C
          </button>
        </div>

        <!-- Energie + gc-plan vždy viditelné (ne v detail-section) -->
        <div class="battery-energy-section">
          <div class="detail-header">⚡ Energie dnes</div>
          <div class="energy-grid">
            <div class="detail-row">
              <span class="icon">⬆️</span>
              <button class="clickable" @click=${ee("computed_batt_charge_energy_today")}>
                Nab: ${ot(e.batteryChargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">⬇️</span>
              <button class="clickable" @click=${ee("computed_batt_discharge_energy_today")}>
                Vyb: ${ot(e.batteryDischargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">☀️</span>
              <button class="clickable" @click=${ee("computed_batt_charge_fve_energy_today")}>
                FVE: ${ot(e.batteryChargeSolar)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">🔌</span>
              <button class="clickable" @click=${ee("computed_batt_charge_grid_energy_today")}>
                Síť: ${ot(e.batteryChargeGrid)}
              </button>
            </div>
          </div>

          <!-- Grid charging plan — always visible badge -->
          <div class="grid-charging-plan-summary">
            <button class="gc-plan-btn ${e.gridChargingPlan.hasBlocks?"has-plan":""}"
              @click=${y=>{y.stopPropagation(),this.openGridChargingDialog()}}>
              🔌
              ${e.gridChargingPlan.hasBlocks?c`Plán: ${e.gridChargingPlan.totalEnergyKwh.toFixed(1)} kWh`:c`Plán nabíjení`}
              <span class="gc-plan-arrow">›</span>
            </button>
          </div>
        </div>
      </div>
    `}getInverterModeDesc(){const e=this.data.inverterMode;return e.includes("Home 1")?"Max baterie + FVE":e.includes("Home 2")?"Šetří baterii":e.includes("Home 3")?"Priorita nabíjení":e.includes("UPS")?"Vše ze sítě":""}renderInverter(){const e=this.data,t=Hl(e.inverterMode),i=e.bypassStatus.toLowerCase()==="on"||e.bypassStatus==="1",r=e.inverterTemp>35?"🔥":"🌡️",n=Wl(e.inverterGridMode),a=ad(this.pendingServices,this.changingServices),o=nd(this.gridDeliveryState);let s="planner-unknown",d="Plánovač: N/A";e.plannerAutoMode===!0?(s="planner-auto",d="Plánovač: AUTO"):e.plannerAutoMode===!1&&(s="planner-off",d="Plánovač: VYPNUTO");const p=e.inverterMode,u=p.includes("UPS")?"#ff9800":p.includes("Home 2")?"#2196f3":p.includes("Home 3")?"#9c27b0":"#4caf50",h=e.inverterTemp>=45?"#e53935":e.inverterTemp>=35?"#ffa726":"#43a047",b=Math.max(0,Math.min(100,e.inverterTemp/55*100)),f=i?"#e53935":h;return c`
      <div class="${this.nodeClass("inverter",a.inverterModeChanging?"mode-changing":"")}" style="--node-gradient: ${Ni.inverter}; --node-border: ${jr.inverter};"
        @click=${m=>this.toggleExpand("inverter",m)}
        title="Teplota ${e.inverterTemp.toFixed(1)} °C · ${i?"Bypass aktivní":"Bypass vyp"}">
        ${this.edgeGauge({id:"gauge-inverter",nodeId:"inverter",pct:i?100:b,stops:[[0,f],[1,f]],width:i?4:2.5,pulse:i,pulseDur:1.1})}
        <div class="node-tint" style="background: radial-gradient(120% 90% at 50% 0, ${u}22, transparent 72%)"></div>

        ${this.gaugePill("inverter",i?"⚠ BYPASS":`${e.inverterTemp.toFixed(0)} °C`,f,c`
          <div class="ss-pop-h"><span>Teplota střídače</span><b style="color:${h}">${e.inverterTemp.toFixed(1)} °C</b></div>
          <div class="gp-r"><span>Bypass</span><b>${i?"🔴 AKTIVNÍ":"Vypnutý"}</b></div>
          <div class="gp-r"><span>Režim</span><b>${t.text}</b></div>
        `)}

        <div class="node-header" style="justify-content:center">
          <span class="node-label">⚙️ Střídač</span>
        </div>
        <div class="node-value" @click=${ee("box_prms_mode")} style="color:${u}">
          ${a.inverterModeChanging?c`<span class="spinner spinner--small"></span>`:w}
          ${t.icon} ${t.text}
        </div>
        ${this.getInverterModeDesc()?c`<div class="node-subvalue">${this.getInverterModeDesc()}</div>`:w}
        ${a.inverterModeText?c`<div class="pending-text">${a.inverterModeText}</div>`:w}

        <div class="inv-chip ${s}">🤖 ${d}</div>

        <div class="inv-rows">
          <div class="inv-row">
            <span class="inv-lab">${r} Teplota</span>
            <button class="inv-pill" style="background:${h}26;color:${h}"
              @click=${ee("box_temp")}>${e.inverterTemp.toFixed(1)} °C</button>
          </div>
          <div class="inv-row">
            <span class="inv-lab">🔁 Bypass</span>
            <button class="inv-pill ${i?"pill-red":"pill-green"}"
              @click=${ee("bypass_status")}>${i?"ZAP":"Vyp"}</button>
          </div>
          <div class="inv-row">
            <span class="inv-lab">${n.icon} Dodávka</span>
            <button class="inv-val ${o.isUnavailable?"current-state-unknown":""}"
              @click=${ee("invertor_prms_to_grid")}>${o.currentModeText}</button>
          </div>
          ${o.limitLabel!==null?c`
            <div class="inv-row">
              <span class="inv-lab">🌊 ${o.limitLabel}</span>
              <button class="inv-val ${o.showLimitAsActive?"limit-active":""}"
                @click=${ee("invertor_prm1_p_max_feed_grid")}>${o.limitValue}</button>
            </div>
          `:w}
          <div class="inv-row">
            <span class="inv-lab">🛡️ Shield</span>
            <span class="inv-val">${this.shieldStatus==="running"?"Zpracovávám":"Nečinný"}${this.shieldQueueCount>0?` (${this.shieldQueueCount})`:""}</span>
          </div>
        </div>

        <button class="inv-note ${e.notificationsError>0?"warn":""}"
          @click=${ee("notification_count_unread")}>
          🔔 ${e.notificationsError>0?`${e.notificationsError} chyb · ${e.notificationsUnread} nepřečtených`:e.notificationsUnread>0?`${e.notificationsUnread} nepřečtených`:"Bez notifikací"}
        </button>

        ${o.pendingModeText?c`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${o.pendingModeText}
          </div>
        `:w}
        ${o.pendingLimitText?c`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${o.pendingLimitText}
          </div>
        `:w}
      </div>
    `}gridIconDefs(){return Y`
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
      </svg>`}iImp(){return Y`<svg class="gd-ic" viewBox="0 0 24 24"><use href="#gi-imp"/></svg>`}iExp(){return Y`<svg class="gd-ic" viewBox="0 0 24 24"><use href="#gi-exp"/></svg>`}fmtKwGrid(e){const t=Math.abs(e);return t>=1e3?`${(t/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(t)} W`}renderGrid(){var Fr,Ir;const e=this.data,t=[e.gridL1P,e.gridL2P,e.gridL3P],i=t.some(C=>C>10),r=t.some(C=>C<-10),n=i&&r,a=i&&!r,o=r&&!i,s=t.reduce((C,ne)=>C+ne,0),d=Math.abs(s),p=t.filter(C=>C>0).reduce((C,ne)=>C+ne,0),u=t.filter(C=>C<0).reduce((C,ne)=>C+Math.abs(ne),0),h=d/1e3,b=e.gridImportCostToday!==null||e.gridExportEarningsToday!==null,f=e.gridImportCostToday??0,m=e.gridExportEarningsToday??0,y=m-f,S=(e.gridExportEarningsMonth??0)-(e.gridImportCostMonth??0),v=y>=0?"#9fe6a8":"#ff8a80",$=C=>C.toFixed(2).replace(".",","),T=C=>(C>=0?"+":"−")+$(Math.abs(C)),W=25*230*3,F=e.inverterGridLimit>0?e.inverterGridLimit:5e3,R=o?d/F*100:d/W*100,k=C=>C>=1e3?`${(C/1e3).toFixed(1).replace(".",",")}k`:C>=10?`${Math.round(C)}`:C.toFixed(1).replace(".",","),A=C=>{const ne=C<0;return{txt:(ne?"−":"")+k(Math.abs(C)),cls:ne?"gd-col-imp":"gd-col-exp",earn:!ne}},D=C=>{const ne=C<0;return{txt:(ne?"+":"")+k(Math.abs(C)),cls:ne?"gd-col-exp":"gd-col-imp",earn:ne}},K=A(m),q=A(e.gridExportEarningsMonth??0),B=D(f),H=D(e.gridImportCostMonth??0),Pe=e.exportPrice>=0?"gd-col-exp":"gd-col-imp",Ne=e.spotPrice<=0?"gd-col-exp":"gd-col-imp",X=207,be=253,_=212,Z=248,re=[{v:e.gridL1V,label:"L1",entity:"ac_in_aci_vr"},{v:e.gridL2V,label:"L2",entity:"ac_in_aci_vs"},{v:e.gridL3V,label:"L3",entity:"ac_in_aci_vt"}],Ee=re.filter(C=>C.v>0),Se=Ee.length>0,Oe=Se?Ee.reduce((C,ne)=>C+ne.v,0)/Ee.length:230,zn=Se?Math.min(...Ee.map(C=>C.v)):230,En=Se?Math.max(...Ee.map(C=>C.v)):230,Cr=Math.max((En-zn)/2+1.5,2.5),_t=Oe-Cr,Yt=Oe+Cr,On=Yt-_t,Zt=C=>C<X||C>be?"crit":C<_||C>Z?"warn":"ok",Tr=C=>Math.max(0,Math.min(100,(C-_t)/On*100));let $t=re.map((C,ne)=>({...C,sev:C.v>0?Zt(C.v):"na",pct:C.v>0?Tr(C.v):50,lcls:`l${ne+1}`,below:!1}));const Pr=$t.filter(C=>C.v>0).slice().sort((C,ne)=>C.pct-ne.pct),Mr=Pr.length===3?Pr[1].pct:null;$t=$t.map(C=>({...C,below:C.v>0&&Mr!==null&&C.pct===Mr}));const Qt=C=>C<X||C>be?"rgba(229,57,53,.6)":C<_||C>Z?"rgba(255,167,38,.55)":"rgba(76,175,80,.4)",Dr=[X,_,Z,be].filter(C=>C>_t&&C<Yt),Ei=[`${Qt(_t+.001)} 0%`];for(const C of Dr){const ne=Tr(C).toFixed(1);Ei.push(`${Qt(C-.001)} ${ne}%`,`${Qt(C+.001)} ${ne}%`)}Ei.push(`${Qt(Yt-.001)} 100%`);const Ln=`linear-gradient(90deg, ${Ei.join(", ")})`,zr=e.gridFrequency>0?Math.abs(e.gridFrequency-50):0,An=e.gridFrequency>0&&zr>.5,Oi=e.gridFrequency>0&&zr>.2,Fn=An?"gd-hz crit":Oi?"gd-hz warn":"gd-hz",Er=e.currentTariff==="VT"||((Fr=e.currentTariff)==null?void 0:Fr.includes("vysoký")),Or=e.currentTariff==="NT"||((Ir=e.currentTariff)==null?void 0:Ir.includes("nízký")),Li=Er?"gd-tar vt":Or?"gd-tar nt":"gd-tar",In=Er?"VT":Or?"NT":e.currentTariff||"--",Bn=Math.max(0,...t.filter(C=>C>0)),Lr=Math.max(0,...t.filter(C=>C<0).map(Math.abs)),Ar=Math.max(50,Bn+Lr),kt=Lr/Ar*100,Ai=c`
      <div class="ss-pop-h"><span>Bilance dnes</span>
        <b style="color:${v}">${T(y)} Kč</b></div>
      <div class="gp-r"><span>Výdělek z dodávky</span><b class="gd-col-exp">${$(m)} Kč</b></div>
      <div class="gp-r"><span>Náklad za odběr</span><b class="gd-col-imp">${$(f)} Kč</b></div>
      ${e.gridImportCostMonth!==null||e.gridExportEarningsMonth!==null?c`
        <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px">
          <span>Bilance měsíc</span><b style="color:${S>=0?"#9fe6a8":"#ff8a80"}">${T(S)} Kč</b></div>
      `:w}
      <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px">
        <span>Odběr dnes</span><b class="gd-col-imp">${ot(e.gridImportToday)}</b></div>
      <div class="gp-r"><span>Dodávka dnes</span><b class="gd-col-exp">${ot(e.gridExportToday)}</b></div>
      ${Se?c`<div class="gp-r"><span>Napětí fází</span><b>${re.map(C=>C.v>0?C.v.toFixed(0):"–").join(" · ")} V</b></div>`:w}
      <div class="gp-r"><span>Frekvence</span><b>${e.gridFrequency>0?e.gridFrequency.toFixed(2):"–"} Hz</b></div>
    `;return c`
      <div class="${this.nodeClass("grid")}" style="--node-gradient: ${Ni.grid}; --node-border: ${jr.grid};"
        @click=${C=>this.toggleExpand("grid",C)}>

        ${this.gridIconDefs()}

        ${this.edgeGauge({id:"gauge-grid",nodeId:"grid",pct:b?100:R,stops:[[0,v],[1,v]],width:b?3:2+Math.min(3,h),pulse:i||r,pulseDur:Math.max(.9,2.2-h*.35)})}

        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 50%, ${v}22, transparent 72%)"></div>

        ${this.gaugePill("grid",b?`${T(y)} Kč`:`${Math.round(R)} %`,v,Ai)}

        <!-- ── HEADER: frequency (left) · SÍŤ · tariff (right) ── -->
        <div class="gd-head" style="margin-top:16px">
          ${e.gridFrequency>0?c`
            <button class="${Fn}" @click=${ee("ac_in_aci_f")}>
              ${Oi?"⚠":"⚡"} ${e.gridFrequency.toFixed(2)} Hz
            </button>`:w}
          ${Y`<svg class="gd-head-ico" viewBox="0 0 24 24" fill="none" stroke="#cfe0ff" stroke-width="2" stroke-linejoin="round">
            <path d="M12 2v20M5 6l7-4 7 4M5 6v5l7 4 7-4V6M5 16l7 4 7-4"/>
          </svg>`}
          <span class="gd-cap">SÍŤ</span>
          <button class="${Li}" @click=${ee("current_tariff")}>
            ${Y`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/></svg>`}
            ${In}
          </button>
        </div>

        <!-- ── POWER / DIRECTION (3 states) ── -->
        ${n?c`
          <div class="gd-combo">
            <div class="gd-cside gd-col-exp">
              ${this.iExp()} ${this.fmtKwGrid(u)}
            </div>
            <button class="gd-cbal ${s>=0?"gd-col-imp":"gd-col-exp"}" @click=${ee("actual_aci_wtotal")}>
              ${s>=0?this.iImp():this.iExp()}
              ${this.fmtKwGrid(d)}
            </button>
            <div class="gd-cside gd-col-imp">
              ${this.iImp()} ${this.fmtKwGrid(p)}
            </div>
          </div>
          <div class="gd-combolbl">⇅ Kombinace · bilance uprostřed</div>
        `:c`
          <div class="gd-pure">
            <button class="gd-pn" @click=${ee("actual_aci_wtotal")}>
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
        ${b?c`
          <div class="gd-cols">
            <div class="gd-col">
              <div class="gd-crate ${Pe}">${this.iExp()} ${$(e.exportPrice)} <small>Kč/kWh</small></div>
              <button class="gd-cmoney" @click=${ee("computed_grid_export_earnings_today")}
                title="dodávka — dnes ${K.txt} Kč · tento měsíc ${q.txt} Kč">
                <span class="gd-md ${K.cls}">${K.txt}<small> Kč</small></span>
                <span class="gd-mm ${q.cls}">${q.txt}<small> Kč</small></span>
              </button>
            </div>
            <div class="gd-col">
              <div class="gd-crate ${Ne}">${this.iImp()} ${$(e.spotPrice)} <small>Kč/kWh</small></div>
              <button class="gd-cmoney" @click=${ee("computed_grid_import_cost_today")}
                title="odběr — dnes ${B.txt} Kč · tento měsíc ${H.txt} Kč">
                <span class="gd-md ${B.cls}">${B.txt}<small> Kč</small></span>
                <span class="gd-mm ${H.cls}">${H.txt}<small> Kč</small></span>
              </button>
            </div>
          </div>
        `:c`
          <div class="gd-price">
            <button class="gd-chip ${e.exportPrice>=0?"good":"bad"}" @click=${ee("export_price_current_15min")}>
              ${this.iExp()} ${$(e.exportPrice)} <small>Kč</small>
            </button>
            <button class="gd-chip ${e.spotPrice<=3?"good":e.spotPrice>5?"bad":"neutral"}" @click=${ee("spot_price_current_15min")}>
              ${this.iImp()} ${$(e.spotPrice)} <small>Kč</small>
            </button>
          </div>
        `}

        <!-- ── PHASE BARS: bidirectional, dynamic zero ── -->
        <div class="gd-ph">
          ${["L1","L2","L3"].map((C,ne)=>{const Fi=t[ne],Ii=Math.abs(Fi),St=Math.min(100,Ii/Ar*100),Nn=Fi>10,jn=Fi<-10;return c`
              <div class="gd-phr">
                <div class="gd-ptr">
                  <div class="gd-zero" style="left:${kt.toFixed(1)}%"></div>
                  ${jn?c`
                    <div class="gd-seg l${ne+1}" style="left:${(kt-St).toFixed(1)}%;width:${St.toFixed(1)}%">
                      ${St>=22?c`${this.fmtKwGrid(Ii)}`:w}
                    </div>`:w}
                  ${Nn?c`
                    <div class="gd-seg l${ne+1}" style="left:${kt.toFixed(1)}%;width:${St.toFixed(1)}%">
                      ${St>=22?c`${this.fmtKwGrid(Ii)}`:w}
                    </div>`:w}
                </div>
              </div>`})}
        </div>

        <!-- ── VOLTAGE: dynamic-zoom axis · phase-coloured ticks · value on axis
             (outer above, middle below); window bounds sit on the below line at
             the edges so a near-edge value never collides with them. ── -->
        ${Se?c`
          <div class="gd-volt">
            <div class="gd-vband" style="background:${Ln}">
              ${$t.filter(C=>C.v>0).map(C=>c`
                <div class="gd-vtick ${C.lcls}" style="left:${C.pct.toFixed(1)}%"></div>`)}
              ${$t.filter(C=>C.v>0).map(C=>c`
                <button class="gd-vlab ${C.below?"below":"above"} ${C.sev==="ok"?C.lcls:""}"
                  style="left:${C.pct.toFixed(1)}%;${C.sev==="crit"?"color:#ff8a80":C.sev==="warn"?"color:#ffcc80":""}"
                  @click=${ee(C.entity)}>${C.v.toFixed(0)}<small> V</small></button>`)}
              <span class="gd-vbound lo">${_t.toFixed(0)} V</span>
              <span class="gd-vbound hi">${Yt.toFixed(0)} V</span>
            </div>
          </div>
        `:w}

      </div>
    `}renderHouse(){const e=this.data,t=e.houseTodayWh/1e3,i=e.nonbackupTodayWh/1e3,r=t+i,n=e.housePower+e.nonbackupPower,a=t+e.zalohaPlannedRemainingKwh,o=e.selfSufficiencyTodayPct,s=e.houseTodayWh+e.nonbackupTodayWh,d=s>0?e.srcBatteryTodayKwh*1e3/s*100:0,p=s>0?e.srcFveTodayKwh*1e3/s*100:0,u=s>0?e.srcGridTodayKwh*1e3/s*100:0,h=o>=66?"#43a047":o>=33?"#fdd835":"#e53935",b=`hsl(${Math.round(Math.max(0,Math.min(120,o*1.2)))}, 72%, 46%)`,f=r>0,m=f?r:1,y=f?Math.round(e.srcFveTodayKwh/m*100):0,S=f?Math.round(e.srcBatteryTodayKwh/m*100):0,v=f?Math.max(0,100-y-S):0,$=`Denní soběstačnost ${Math.round(o)} % · FVE ${y} % · Baterie ${S} % · Síť ${v} %`,T=Cd([e.houseL1,e.houseL2,e.houseL3]),W=[{z:e.houseL1,n:e.nonbackupL1,ze:"ac_out_aco_pr"},{z:e.houseL2,n:e.nonbackupL2,ze:"ac_out_aco_ps"},{z:e.houseL3,n:e.nonbackupL3,ze:"ac_out_aco_pt"}],F=Math.max(300,...W.map(X=>X.z+X.n)),R=rn/F*100,k=R<=100,A=T.spreadW>=1e3?`${(T.spreadW/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(T.spreadW)} W`,D=W.map(X=>Math.max(0,X.z)/F*100),K=e.houseL1+e.houseL2+e.houseL3,q=Td(D,K),B=X=>X>=1e3?`${(X/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(X)} W`,H=26,Pe=`Záloha ${Pt(e.housePower)} · dnes ${t.toFixed(1)} kWh${e.zalohaPlannedRemainingKwh>0?` · plán ${a.toFixed(1)} kWh`:""}`,Ne=`Nezáloha ${Pt(e.nonbackupPower)} · dnes ${i.toFixed(1)} kWh`;return c`
      <div class="${this.nodeClass("house")}" style="--node-gradient: ${Ni.house}; --node-border: ${jr.house};"
        @click=${X=>this.toggleExpand("house",X)} title=${$}>

        <!-- MULTI-SEGMENT AURA: battery (green) → FVE (yellow) → grid (red) — UNCHANGED -->
        ${this.edgeGaugeSegments({nodeId:"house",segments:[{frac:d,color:"#43a047"},{frac:p,color:"#ffca28"},{frac:u,color:"#e53935"}],width:3.5})}
        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 100%, ${h}22, transparent 72%)"></div>

        <!-- GAUGE PILL: daily self-sufficiency with kWh popover — UNCHANGED -->
        ${this.gaugePill("house",`${Math.round(o)} %`,b,c`
          <div class="ss-pop-h"><span>Denní soběstačnost</span><b style="color:${b}">${Math.round(o)} %</b></div>
          ${f?c`
            <div class="ss-bar">
              <i style="width:${S}%;background:#43a047"></i>
              <i style="width:${y}%;background:#ffca28"></i>
              <i style="width:${v}%;background:#e53935"></i>
            </div>
            <div class="gp-r"><span>☀️ FVE</span><b>${e.srcFveTodayKwh.toFixed(1)} kWh · ${y} %</b></div>
            <div class="gp-r"><span>🔋 Baterie</span><b>${e.srcBatteryTodayKwh.toFixed(1)} kWh · ${S} %</b></div>
            <div class="gp-r"><span>🔌 Síť</span><b>${e.srcGridTodayKwh.toFixed(1)} kWh · ${v} %</b></div>
            <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px">
              <span>Celkem dnes</span><b>${r.toFixed(1)} kWh</b>
            </div>
          `:c`<div class="gp-r" style="opacity:.6"><span>Žádná spotřeba dnes zatím</span></div>`}
        `)}

        <!-- COMPACT HEADER: SVG house icon · big kW · tiny kWh -->
        <div class="house-head">
          ${Y`<svg class="house-ico" viewBox="0 0 24 24" fill="none" stroke="#cfe0ff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 11l9-7 9 7"></path><path d="M5 10v10h14V10"></path></svg>`}
          <span class="house-cap">SPOTŘEBA</span>
        </div>
        <div class="node-value" @click=${ee("actual_aco_p")}>${Pt(n)}</div>
        <div class="node-subvalue" @click=${ee("ac_out_en_day")}>${r.toFixed(1).replace(".",",")} kWh</div>

        <!-- COMPACT SPLIT ROW: colored dot + value, tooltip carries detail -->
        <div class="csplit">
          <button class="cs" @click=${ee("actual_aco_p")} title=${Pe}>
            <span class="cs-top"><span class="d" style="background:#43a047"></span>${Pt(e.housePower)}</span>
            <span class="cs-day">${t.toFixed(1).replace(".",",")} kWh</span>
          </button>
          <button class="cs" @click=${ee("actual_acinb_wtotal")} title=${Ne}>
            <span class="cs-top"><span class="d" style="background:#fb8c00"></span>${Pt(e.nonbackupPower)}</span>
            <span class="cs-day">${i.toFixed(1).replace(".",",")} kWh</span>
          </button>
        </div>

        <!-- PHASE GRAPH (phasegraph2 design) -->
        <div class="pg">
          <!-- Spread band = imbalance "thermometer" (no text); red shimmer when unbalanced -->
          ${q.widthPct>0?c`
            <div class="pg-spread ${T.balanced?"balanced":"unbal"}"
              title=${T.balanced?"Fáze vyvážené":`Fáze nevyvážené — rozdíl ${A}`}
              style="left:calc(10px + ${q.leftPct.toFixed(2)}% * (100% - 75px) / 100);width:calc(${q.widthPct.toFixed(2)}% * (100% - 75px) / 100)"></div>`:w}
          <!-- Phase rows: whole bar in the ČSN phase colour (záloha solid,
               nezáloha faded); no L1/L2/L3 text — colour identifies the phase. -->
          ${W.map((X,be)=>{const _=X.z>=rn,Z=X.z+X.n,re=Math.max(0,X.z)/F*100,Ee=Math.max(0,X.n)/F*100,Se=re>=H&&X.z>100,Oe=Ee>=H&&X.n>100;return c`
              <div class="pg-row l${be+1}">
                <div class="pg-track">
                  <div class="pg-z ${_?"crit":""}" style="width:${re.toFixed(1)}%">
                    ${Se?B(X.z):w}
                  </div>
                  ${X.n>0?c`
                    <div class="pg-div"></div>
                    <div class="pg-n" style="width:${Ee.toFixed(1)}%">
                      ${Oe?B(X.n):w}
                    </div>`:w}
                  ${k?c`<div class="pg-lim" style="left:${R.toFixed(1)}%"></div>`:w}
                </div>
                <span class="pg-tot">${B(Z)}</span>
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
    `}};Ae.styles=z`
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
      padding: 10px 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: visible;
      width: fit-content;
      min-width: 170px;
      max-width: 230px;
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
      bottom: -9px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 4;
      font-size: 10px;
      font-weight: 800;
      background: #131f33;
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 9px;
      padding: 2px 9px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    }
    /* House tile: pill sits at the TOP (center-top, approved design) */
    .node-house .ss-pill {
      bottom: auto;
      top: -13px;
      font-size: 14px;
      padding: 3px 13px;
      border-radius: 11px;
    }
    /* House popover drops DOWN from the top pill */
    .node-house .ss-pop { bottom: auto; top: 16px; }
    /* Solar tile: pill sits at the TOP (variant B approved design) */
    .node-solar .ss-pill {
      bottom: auto;
      top: -13px;
      font-size: 14px;
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
      color: ${J(l.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .node-value {
      font-size: 22px;
      font-weight: 700;
      color: ${J(l.textPrimary)};
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
      color: ${J(l.textSecondary)};
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
      color: ${J(l.textSecondary)};
      margin-top: 4px;
    }

    .pending-overlay {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: ${J(l.accent)};
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 4px;
      padding: 2px 6px;
      margin-top: 4px;
    }

    .current-state-unknown {
      color: ${J(l.textSecondary)};
      font-style: italic;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid ${J(l.divider)};
      border-top-color: ${J(l.accent)};
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
      border-top: 1px solid ${J(l.divider)};
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
      border-top: 1px dashed ${J(l.divider)};
    }

    .detail-header {
      font-size: 10px;
      font-weight: 600;
      color: ${J(l.textSecondary)};
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: ${J(l.textSecondary)};
      margin-bottom: 2px;
    }

    .detail-row .icon { width: 14px; text-align: center; flex-shrink: 0; }

    .clickable {
      cursor: pointer;
      color: ${J(l.textPrimary)};
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
      color: ${J(l.textSecondary)};
      margin: 4px 0;
      align-items: center;
      justify-content: center;
    }

    .phase-sep { color: ${J(l.divider)}; }

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
      color: ${J(l.textPrimary)};
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
      background: ${J(l.bgSecondary)};
      border: none;
      font-family: inherit;
      color: ${J(l.textSecondary)};
    }

    .indicator:hover { background: ${J(l.divider)}; }

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
      border-top: 1px solid ${J(l.divider)};
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
      border: 1px solid ${J(l.divider)};
      background: transparent;
      color: ${J(l.textSecondary)};
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .gc-plan-btn:hover {
      background: rgba(255,255,255,0.06);
      color: ${J(l.textPrimary)};
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
      border-top: 1px dashed ${J(l.divider)};
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
      color: ${J(l.textSecondary)};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .phase-val {
      font-size: 11px;
      font-weight: 600;
      color: ${J(l.textPrimary)};
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    .phase-val:hover { text-decoration: underline; }
    .phase-divider {
      border: none;
      border-top: 1px solid ${J(l.divider)};
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
      color: ${J(l.textSecondary)};
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
      color: ${J(l.textPrimary)};
    }
    .energy-side-val:hover { text-decoration: underline; }
    .energy-import { color: #ef5350; }
    .energy-export { color: #66bb6a; }
    .energy-divider-v {
      width: 1px;
      height: 28px;
      background: ${J(l.divider)};
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
      color: ${J(l.textSecondary)};
      text-transform: uppercase;
    }
    .price-val {
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: ${J(l.textPrimary)};
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
      font-size: 13px; font-weight: 800; line-height: 1;
    }
    .gd-cbal {
      font-size: 22px; font-weight: 800; line-height: 1;
      display: flex; align-items: center; gap: 4px;
      background: none; border: none; cursor: pointer; padding: 0; color: inherit;
    }
    .gd-cbal:hover { text-decoration: underline; }
    .gd-combolbl {
      text-align: center; font-size: 10px; font-weight: 800; opacity: .7; margin-top: 3px;
    }

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

    @media (min-width: 1025px) {
      .detail-section {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid ${J(l.divider)};
      }
      .boiler-section,
      .grid-charging-plan {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed ${J(l.divider)};
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
      .node { min-width: 96px; max-width: 140px; padding: 3px 6px; }
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
      /* Grid tile kiosk: hide heavy sections */
      .gd-ph, .gd-volt, .gd-costrow { display: none; }
    }
  `;We([g({type:Object})],Ae.prototype,"data",2);We([g({type:Boolean})],Ae.prototype,"editMode",2);We([M()],Ae.prototype,"pendingServices",2);We([M()],Ae.prototype,"changingServices",2);We([M()],Ae.prototype,"shieldStatus",2);We([M()],Ae.prototype,"shieldQueueCount",2);We([M()],Ae.prototype,"gridDeliveryState",2);We([M()],Ae.prototype,"expandedNodes",2);We([M()],Ae.prototype,"gaugeDetailOpen",2);We([M()],Ae.prototype,"customPositions",2);We([M()],Ae.prototype,"nodeDims",2);Ae=We([O("oig-flow-node")],Ae);var Pd=Object.defineProperty,Md=Object.getOwnPropertyDescriptor,Kt=(e,t,i,r)=>{for(var n=r>1?void 0:r?Md(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Pd(t,i,n),n};function Dd(e,t){return{fromColor:Ga[e]||"#9e9e9e",toColor:Ga[t]||"#9e9e9e"}}const zd=Q;let it=class extends E{constructor(){super(...arguments),this.data=wa,this.particlesEnabled=!0,this.active=!0,this.editMode=!1,this.lines=[],this.animationId=null,this.lastSpawnTime={},this.particleCount=0,this.MAX_PARTICLES=50,this.onVisibilityChange=()=>{this.updateAnimationState()},this.onLayoutChanged=()=>{this.drawConnectionsDeferred()}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this.onVisibilityChange),this.addEventListener("layout-changed",this.onLayoutChanged)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this.onVisibilityChange),this.removeEventListener("layout-changed",this.onLayoutChanged),this.stopAnimation()}updated(e){e.has("data")&&(this.updateLines(),this.animationId!==null&&this.spawnParticles()),(e.has("active")||e.has("particlesEnabled"))&&this.updateAnimationState(),this.drawConnectionsDeferred()}firstUpdated(){this.updateLines(),this.updateAnimationState(),new ResizeObserver(()=>this.drawConnectionsDeferred()).observe(this)}drawConnectionsDeferred(){requestAnimationFrame(()=>this.drawConnectionsSVG())}getParticlesLayer(){var e;return(e=this.renderRoot)==null?void 0:e.querySelector(".particles-layer")}getGridMetrics(){var a,o;const e=(a=this.renderRoot)==null?void 0:a.querySelector("oig-flow-node");if(!e)return null;const i=(e.renderRoot||e.shadowRoot||e).querySelector(".flow-grid");if(!i)return null;const r=(o=this.renderRoot)==null?void 0:o.querySelector(".canvas-container");if(!r)return null;const n=i.getBoundingClientRect();return n.width===0||n.height===0?null:{grid:i,gridRect:n,canvasRect:r.getBoundingClientRect()}}positionOverlayLayer(e,t,i){const r=t.left-i.left,n=t.top-i.top;e.style.left=`${r}px`,e.style.top=`${n}px`,e.style.width=`${t.width}px`,e.style.height=`${t.height}px`}updateLines(){const e=this.data,t=[],i=e.solarPower>50;t.push({id:"solar-inverter",from:"solar",to:"inverter",color:Xt.solar,power:i?e.solarPower:0,params:i?Hr(e.solarPower,Rr.solar,"solar"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:i});const r=Math.abs(e.batteryPower)>50,n=e.batteryPower>0;t.push({id:"battery-inverter",from:r&&n?"inverter":"battery",to:r&&n?"battery":"inverter",color:Xt.battery,power:r?Math.abs(e.batteryPower):0,params:r?Hr(e.batteryPower,Rr.battery,"battery"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:r});const a=Math.abs(e.gridPower)>50,o=e.gridPower>0;t.push({id:"grid-inverter",from:a?o?"grid":"inverter":"grid",to:a?o?"inverter":"grid":"inverter",color:a?o?Xt.grid_import:Xt.grid_export:Xt.grid_import,power:a?Math.abs(e.gridPower):0,params:a?Hr(e.gridPower,Rr.grid,"grid"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:a});const s=e.housePower>50;t.push({id:"inverter-house",from:"inverter",to:"house",color:Xt.house,power:s?e.housePower:0,params:s?Hr(e.housePower,Rr.house,"house"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:s}),this.lines=t}calcEdgePoint(e,t,i,r){const n=t.x-e.x,a=t.y-e.y;if(n===0&&a===0)return{...e};const o=Math.abs(n),s=Math.abs(a),d=o*r>s*i?i/o:r/s;return{x:e.x+n*d,y:e.y+a*d}}getNodeInfo(e,t,i){const r=e.querySelector(`.node-${i}`);if(!r)return null;const n=r.getBoundingClientRect();return{x:n.left+n.width/2-t.left,y:n.top+n.height/2-t.top,hw:n.width/2,hh:n.height/2}}drawConnectionsSVG(){const e=this.svgEl;if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:r,canvasRect:n}=t;this.positionOverlayLayer(e,r,n),e.setAttribute("viewBox",`0 0 ${r.width} ${r.height}`);const a=this.getParticlesLayer();a&&this.positionOverlayLayer(a,r,n),e.innerHTML="";const o="http://www.w3.org/2000/svg",s=document.createElementNS(o,"defs"),d=document.createElementNS(o,"filter");d.setAttribute("id","neon-glow"),d.setAttribute("x","-50%"),d.setAttribute("y","-50%"),d.setAttribute("width","200%"),d.setAttribute("height","200%");const p=document.createElementNS(o,"feGaussianBlur");p.setAttribute("in","SourceGraphic"),p.setAttribute("stdDeviation","3"),p.setAttribute("result","blur"),d.appendChild(p);const u=document.createElementNS(o,"feMerge"),h=document.createElementNS(o,"feMergeNode");h.setAttribute("in","blur"),u.appendChild(h);const b=document.createElementNS(o,"feMergeNode");b.setAttribute("in","SourceGraphic"),u.appendChild(b),d.appendChild(u),s.appendChild(d),e.appendChild(s);for(const f of this.lines){const m=this.getNodeInfo(i,r,f.from),y=this.getNodeInfo(i,r,f.to);if(!m||!y)continue;const S={x:m.x,y:m.y},v={x:y.x,y:y.y},$=this.calcEdgePoint(S,v,m.hw,m.hh),T=this.calcEdgePoint(v,S,y.hw,y.hh),W=T.x-$.x,F=T.y-$.y,R=Math.sqrt(W*W+F*F),k=Math.min(R*.2,40),A=-F/R,D=W/R,K=($.x+T.x)/2,q=($.y+T.y)/2,B=K+A*k,H=q+D*k,Pe=`grad-${f.id}`,{fromColor:Ne,toColor:X}=Dd(f.from,f.to),be=document.createElementNS(o,"linearGradient");be.setAttribute("id",Pe),be.setAttribute("x1","0%"),be.setAttribute("y1","0%"),be.setAttribute("x2","100%"),be.setAttribute("y2","0%");const _=document.createElementNS(o,"stop");_.setAttribute("offset","0%"),_.setAttribute("stop-color",Ne);const Z=document.createElementNS(o,"stop");Z.setAttribute("offset","100%"),Z.setAttribute("stop-color",X),be.appendChild(_),be.appendChild(Z),s.appendChild(be);const re=document.createElementNS(o,"path");if(re.setAttribute("d",`M ${$.x} ${$.y} Q ${B} ${H} ${T.x} ${T.y}`),re.setAttribute("stroke",`url(#${Pe})`),re.setAttribute("stroke-width","3"),re.setAttribute("stroke-linecap","round"),re.setAttribute("fill","none"),re.setAttribute("opacity",f.active?"0.8":"0.18"),f.active&&re.setAttribute("filter","url(#neon-glow)"),re.classList.add("flow-line"),f.active||re.classList.add("flow-line--inactive"),e.appendChild(re),f.params.active){const Se=document.createElementNS(o,"polygon");Se.setAttribute("points",`0,-6 ${6*1.2},0 0,6`),Se.setAttribute("fill",f.color),Se.setAttribute("opacity","0.9");const Oe=document.createElementNS(o,"animateMotion");Oe.setAttribute("dur",`${Math.max(1,f.params.speed/1e3)}s`),Oe.setAttribute("repeatCount","indefinite"),Oe.setAttribute("path",`M ${$.x} ${$.y} Q ${B} ${H} ${T.x} ${T.y}`),Oe.setAttribute("rotate","auto"),Se.appendChild(Oe),e.appendChild(Se)}}}updateAnimationState(){this.particlesEnabled&&this.active&&!document.hidden&&!je.reduceMotion?(this.spawnParticles(),this.startAnimation()):this.stopAnimation()}startAnimation(){if(this.animationId!==null)return;const e=()=>{this.spawnParticles(),this.animationId=requestAnimationFrame(e)};this.animationId=requestAnimationFrame(e)}stopAnimation(){this.animationId!==null&&(cancelAnimationFrame(this.animationId),this.animationId=null)}spawnParticles(){if(this.particleCount>=this.MAX_PARTICLES)return;const e=this.getParticlesLayer();if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:r,canvasRect:n}=t;this.positionOverlayLayer(e,r,n);const a=performance.now();for(const o of this.lines){if(!o.params.active)continue;const s=o.params.speed,d=this.lastSpawnTime[o.id]||0;if(a-d<s)continue;const p=this.getNodeInfo(i,r,o.from),u=this.getNodeInfo(i,r,o.to);if(!p||!u)continue;const h={x:p.x,y:p.y},b={x:u.x,y:u.y},f=this.calcEdgePoint(h,b,p.hw,p.hh),m=this.calcEdgePoint(b,h,u.hw,u.hh);this.lastSpawnTime[o.id]=a;const y=o.params.count;for(let S=0;S<y&&!(this.particleCount>=this.MAX_PARTICLES);S++)this.createParticle(e,f,m,o.color,o.params,S*(o.params.speed/y/2))}}createParticle(e,t,i,r,n,a){const o=document.createElement("div");o.className="particle";const s=n.size;o.style.width=`${s}px`,o.style.height=`${s}px`,o.style.background=r,o.style.left=`${t.x}px`,o.style.top=`${t.y}px`,o.style.boxShadow=`0 0 ${s}px ${r}`,o.style.opacity="0",e.appendChild(o),this.particleCount++;const d=n.speed;setTimeout(()=>{let p=!1;const u=()=>{p||(p=!0,o.isConnected&&o.remove(),this.particleCount=Math.max(0,this.particleCount-1))};if(typeof o.animate=="function"){const h=o.animate([{left:`${t.x}px`,top:`${t.y}px`,opacity:0,offset:0},{opacity:n.opacity,offset:.1},{opacity:n.opacity,offset:.9},{left:`${i.x}px`,top:`${i.y}px`,opacity:0,offset:1}],{duration:d,easing:"linear"});h.onfinish=u,h.oncancel=u}else o.style.transition=`left ${d}ms linear, top ${d}ms linear, opacity ${d}ms linear`,o.style.opacity=`${n.opacity}`,requestAnimationFrame(()=>{o.style.left=`${i.x}px`,o.style.top=`${i.y}px`,o.style.opacity="0"}),o.addEventListener("transitionend",u,{once:!0}),window.setTimeout(u,d+50)},a)}render(){return c`
      <div class="canvas-container">
        <div class="flow-grid-wrapper">
          <oig-flow-node .data=${this.data} .editMode=${this.editMode}></oig-flow-node>
        </div>

        <svg class="connections-layer"></svg>

        <div class="particles-layer"></div>
      </div>
    `}resetLayout(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-flow-node");e!=null&&e.resetLayout&&e.resetLayout()}};it.styles=z`
    :host {
      display: block;
      position: relative;
      width: 100%;
      background: ${zd(l.bgSecondary)};
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
  `;Kt([g({type:Object})],it.prototype,"data",2);Kt([g({type:Boolean})],it.prototype,"particlesEnabled",2);Kt([g({type:Boolean})],it.prototype,"active",2);Kt([g({type:Boolean})],it.prototype,"editMode",2);Kt([M()],it.prototype,"lines",2);Kt([_n(".connections-layer")],it.prototype,"svgEl",2);it=Kt([O("oig-flow-canvas")],it);var Ed=Object.defineProperty,Od=Object.getOwnPropertyDescriptor,Ta=(e,t,i,r)=>{for(var n=r>1?void 0:r?Od(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Ed(t,i,n),n};const Ve=Q;let ir=class extends E{constructor(){super(...arguments),this.data=null,this.open=!1,this.onKeyDown=e=>{e.key==="Escape"&&this.hide()}}show(){this.open=!0}hide(){this.open=!1}onOverlayClick(e){e.target===e.currentTarget&&this.hide()}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onKeyDown),this.addEventListener("oig-grid-charging-open",()=>this.show())}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onKeyDown)}formatTime(e){const t=e.time_from??"--:--",i=e.time_to??"--:--";return`${t} – ${i}`}isBlockActive(e){if(!e.time_from||!e.time_to)return!1;const t=new Date,i=t.toISOString().slice(0,10);if(e.day==="tomorrow")return!1;const r=`${i}T${e.time_from}`,n=`${i}T${e.time_to}`,a=new Date(r),o=new Date(n);return t>=a&&t<o}renderEmpty(){return c`
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
    `:w}};ir.styles=z`
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
      background: ${Ve(l.cardBg)};
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
      border-bottom: 1px solid ${Ve(l.divider)};
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
      color: ${Ve(l.textPrimary)};
    }

    .dialog-header-subtitle {
      font-size: 11px;
      color: ${Ve(l.textSecondary)};
      margin-top: 2px;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: ${Ve(l.textSecondary)};
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
      color: ${Ve(l.textPrimary)};
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
      color: ${Ve(l.textSecondary)};
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
      color: ${Ve(l.textSecondary)};
      padding: 0 6px 8px;
      border-bottom: 1px solid ${Ve(l.divider)};
    }

    .blocks-table th:last-child,
    .blocks-table td:last-child {
      text-align: right;
    }

    .blocks-table td {
      padding: 8px 6px;
      font-size: 12px;
      color: ${Ve(l.textPrimary)};
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
      color: ${Ve(l.textSecondary)};
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
  `;Ta([g({type:Object})],ir.prototype,"data",2);Ta([M()],ir.prototype,"open",2);ir=Ta([O("oig-grid-charging-dialog")],ir);var Ld=Object.defineProperty,Ad=Object.getOwnPropertyDescriptor,we=(e,t,i,r)=>{for(var n=r>1?void 0:r?Ad(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Ld(t,i,n),n};const ue=Q;wn.register(jo,Ro,Ho,Wo,Vo,Ko,qo);let pt=class extends E{constructor(){super(...arguments),this.values=[],this.color="rgba(76, 175, 80, 1)",this.startTime="",this.endTime="",this.chart=null,this.lastDataKey="",this.initializing=!1}render(){return c`<canvas></canvas>`}firstUpdated(){this.values.length>0&&(this.initializing=!0,requestAnimationFrame(()=>{this.createSparkline(),this.initializing=!1}))}updated(e){this.initializing||(e.has("values")||e.has("color"))&&this.updateOrCreateSparkline()}disconnectedCallback(){super.disconnectedCallback(),this.destroyChart()}updateOrCreateSparkline(){var t,i,r,n;if(!this.canvas||this.values.length===0)return;const e=JSON.stringify({v:this.values,c:this.color});if(!(e===this.lastDataKey&&this.chart)){if(this.lastDataKey=e,(r=(i=(t=this.chart)==null?void 0:t.data)==null?void 0:i.datasets)!=null&&r[0]){const a=this.chart.data.datasets[0];if(!((((n=this.chart.data.labels)==null?void 0:n.length)||0)!==this.values.length)){a.data=this.values,a.borderColor=this.color,a.backgroundColor=this.color.replace("1)","0.2)"),this.chart.update("none");return}}this.destroyChart(),this.createSparkline()}}createSparkline(){if(!this.canvas||this.values.length===0)return;this.destroyChart();const e=this.color,t=this.values,i=new Date(this.startTime),r=t.map((n,a)=>new Date(i.getTime()+a*15*60*1e3).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}));this.chart=new wn(this.canvas,{type:"line",data:{labels:r,datasets:[{data:t,borderColor:e,backgroundColor:e.replace("1)","0.2)"),borderWidth:2,fill:!0,tension:.3,pointRadius:0,pointHoverRadius:5}]},plugins:[],options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:0},plugins:{legend:{display:!1},tooltip:{enabled:!0,backgroundColor:"rgba(0, 0, 0, 0.8)",titleColor:"#fff",bodyColor:"#fff",padding:8,displayColors:!1,callbacks:{title:n=>{var a;return((a=n[0])==null?void 0:a.label)||""},label:n=>`${n.parsed.y.toFixed(2)} Kč/kWh`}},datalabels:{display:!1},zoom:{pan:{enabled:!0,mode:"x",modifierKey:"shift"},zoom:{wheel:{enabled:!0,speed:.1},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)"},mode:"x"}}},scales:{x:{display:!1},y:{display:!0,position:"right",grace:"10%",ticks:{color:"rgba(255, 255, 255, 0.6)",font:{size:8},callback:n=>Number(n).toFixed(1),maxTicksLimit:3},grid:{display:!1}}},layout:{padding:0},interaction:{mode:"nearest",intersect:!1}}})}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}};pt.styles=z`
    :host {
      display: block;
      width: 100%;
      height: 30px;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `;we([g({type:Array})],pt.prototype,"values",2);we([g({type:String})],pt.prototype,"color",2);we([g({type:String})],pt.prototype,"startTime",2);we([g({type:String})],pt.prototype,"endTime",2);we([_n("canvas")],pt.prototype,"canvas",2);pt=we([O("oig-mini-sparkline")],pt);let Fe=class extends E{constructor(){super(...arguments),this.title="",this.time="",this.valueText="",this.value=0,this.unit="Kč/kWh",this.variant="default",this.clickable=!1,this.startTime="",this.endTime="",this.sparklineValues=[],this.sparklineColor="rgba(76, 175, 80, 1)",this.handleClick=()=>{this.clickable&&this.dispatchEvent(new CustomEvent("card-click",{detail:{startTime:this.startTime,endTime:this.endTime,value:this.value},bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),this.clickable&&this.addEventListener("click",this.handleClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleClick)}render(){const e=this.valueText||`${this.value.toFixed(2)} <span class="stat-unit">${this.unit}</span>`;return c`
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
    `}};Fe.styles=z`
    :host {
      display: block;
      background: ${ue(l.cardBg)};
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: ${ue(l.cardShadow)};
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
      color: ${ue(l.textSecondary)};
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 700;
      color: ${ue(l.textPrimary)};
      line-height: 1.2;
    }

    .card-value .stat-unit {
      font-size: 12px;
      font-weight: 400;
      color: ${ue(l.textSecondary)};
    }

    .card-value.success { color: #4CAF50; }
    .card-value.warning { color: #FFA726; }
    .card-value.danger { color: #F44336; }
    .card-value.info { color: #29B6F6; }

    .card-time {
      font-size: 10px;
      color: ${ue(l.textSecondary)};
      margin-top: 4px;
    }

    .sparkline-container {
      margin-top: 8px;
    }
  `;we([g({type:String})],Fe.prototype,"title",2);we([g({type:String})],Fe.prototype,"time",2);we([g({type:String})],Fe.prototype,"valueText",2);we([g({type:Number})],Fe.prototype,"value",2);we([g({type:String})],Fe.prototype,"unit",2);we([g({type:String})],Fe.prototype,"variant",2);we([g({type:Boolean})],Fe.prototype,"clickable",2);we([g({type:String})],Fe.prototype,"startTime",2);we([g({type:String})],Fe.prototype,"endTime",2);we([g({type:Array})],Fe.prototype,"sparklineValues",2);we([g({type:String})],Fe.prototype,"sparklineColor",2);Fe=we([O("oig-stats-card")],Fe);function Fd(e){const t=new Date(e.start),i=new Date(e.end),r=t.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit"}),n=t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}),a=i.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"});return`${r} ${n} - ${a}`}let rr=class extends E{constructor(){super(...arguments),this.data=null,this.topOnly=!1}onCardClick(e){this.dispatchEvent(new CustomEvent("zoom-to-block",{detail:e.detail,bubbles:!0,composed:!0}))}renderPriceTiles(){if(!this.data)return w;const e=this.data.solarForecastTotal,t=this.data.solarForecastTomorrow,i=this.data.solarForecastStale,r=e>0||t>0,n=this.data.whatIf,a=(n==null?void 0:n.totalSavings)??null,o=(n==null?void 0:n.totalCost)??null,s=a==null?"":a>=.005?"pos":a<=-.005?"neg":"";return c`
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
        <div class="price-tile-value ${s}">
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
        .time=${Fd(t)}
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
    `}render(){return!this.data||this.data.timeline.length===0?this.topOnly?w:c`<div style="color: ${l.textSecondary}; padding: 16px;">Načítání cenových dat...</div>`:this.topOnly?c`
        <div class="top-row">
          ${this.renderPriceTiles()}
          ${this.renderExtremeBlocks()}
        </div>
      `:c`${this.renderPlannedConsumption()}`}};rr.styles=z`
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
      background: ${ue(l.cardBg)};
      border-radius: 10px;
      padding: 10px 12px;
      box-shadow: ${ue(l.cardShadow)};
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 76px;
    }

    .price-tile.spot {
      background: linear-gradient(135deg, ${ue(l.accent)}22 0%, ${ue(l.accent)}11 100%);
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
      color: ${ue(l.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .price-tile-value {
      font-size: 16px;
      font-weight: 700;
      color: ${ue(l.textPrimary)};
      line-height: 1.2;
    }

    .price-tile-unit {
      font-size: 10px;
      font-weight: 400;
      color: ${ue(l.textSecondary)};
      opacity: 0.7;
    }

    .price-tile-sub {
      font-size: 9px;
      color: ${ue(l.textSecondary)};
      opacity: 0.55;
      margin-top: 3px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: ${ue(l.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    /* Planned consumption */
    .planned-section {
      background: ${ue(l.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: ${ue(l.cardShadow)};
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
      color: ${ue(l.textPrimary)};
    }

    .planned-main-value .unit {
      font-size: 12px;
      font-weight: 400;
      color: ${ue(l.textSecondary)};
    }

    .planned-trend {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
    }

    .planned-profile {
      font-size: 11px;
      color: ${ue(l.textSecondary)};
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
      color: ${ue(l.textSecondary)};
      text-transform: uppercase;
    }

    .planned-detail-value {
      font-size: 14px;
      font-weight: 600;
      color: ${ue(l.textPrimary)};
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
      color: ${ue(l.textSecondary)};
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
  `;we([g({type:Object})],rr.prototype,"data",2);we([g({type:Boolean})],rr.prototype,"topOnly",2);rr=we([O("oig-pricing-stats")],rr);const ms=6048e5,Id=864e5,xr=6e4,wr=36e5,Bd=1e3,yo=Symbol.for("constructDateFrom");function me(e,t){return typeof e=="function"?e(t):e&&typeof e=="object"&&yo in e?e[yo](t):e instanceof Date?new e.constructor(t):new Date(t)}function U(e,t){return me(t||e,e)}function Cn(e,t,i){const r=U(e,i==null?void 0:i.in);return isNaN(t)?me((i==null?void 0:i.in)||e,NaN):(t&&r.setDate(r.getDate()+t),r)}function Pa(e,t,i){const r=U(e,i==null?void 0:i.in);if(isNaN(t))return me(e,NaN);if(!t)return r;const n=r.getDate(),a=me(e,r.getTime());a.setMonth(r.getMonth()+t+1,0);const o=a.getDate();return n>=o?a:(r.setFullYear(a.getFullYear(),a.getMonth(),n),r)}function Ma(e,t,i){return me(e,+U(e)+t)}function Nd(e,t,i){return Ma(e,t*wr)}let jd={};function qt(){return jd}function Ue(e,t){var s,d,p,u;const i=qt(),r=(t==null?void 0:t.weekStartsOn)??((d=(s=t==null?void 0:t.locale)==null?void 0:s.options)==null?void 0:d.weekStartsOn)??i.weekStartsOn??((u=(p=i.locale)==null?void 0:p.options)==null?void 0:u.weekStartsOn)??0,n=U(e,t==null?void 0:t.in),a=n.getDay(),o=(a<r?7:0)+a-r;return n.setDate(n.getDate()-o),n.setHours(0,0,0,0),n}function gi(e,t){return Ue(e,{...t,weekStartsOn:1})}function ys(e,t){const i=U(e,t==null?void 0:t.in),r=i.getFullYear(),n=me(i,0);n.setFullYear(r+1,0,4),n.setHours(0,0,0,0);const a=gi(n),o=me(i,0);o.setFullYear(r,0,4),o.setHours(0,0,0,0);const s=gi(o);return i.getTime()>=a.getTime()?r+1:i.getTime()>=s.getTime()?r:r-1}function nn(e){const t=U(e),i=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()));return i.setUTCFullYear(t.getFullYear()),+e-+i}function Gt(e,...t){const i=me.bind(null,t.find(r=>typeof r=="object"));return t.map(i)}function ma(e,t){const i=U(e,t==null?void 0:t.in);return i.setHours(0,0,0,0),i}function vs(e,t,i){const[r,n]=Gt(i==null?void 0:i.in,e,t),a=ma(r),o=ma(n),s=+a-nn(a),d=+o-nn(o);return Math.round((s-d)/Id)}function Rd(e,t){const i=ys(e,t),r=me(e,0);return r.setFullYear(i,0,4),r.setHours(0,0,0,0),gi(r)}function Hd(e,t,i){const r=U(e,i==null?void 0:i.in);return r.setTime(r.getTime()+t*xr),r}function Wd(e,t,i){return Pa(e,t*3,i)}function Vd(e,t,i){return Ma(e,t*1e3)}function Kd(e,t,i){return Cn(e,t*7,i)}function qd(e,t,i){return Pa(e,t*12,i)}function Xi(e,t){const i=+U(e)-+U(t);return i<0?-1:i>0?1:i}function Gd(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function xs(e){return!(!Gd(e)&&typeof e!="number"||isNaN(+U(e)))}function Ud(e,t,i){const[r,n]=Gt(i==null?void 0:i.in,e,t),a=r.getFullYear()-n.getFullYear(),o=r.getMonth()-n.getMonth();return a*12+o}function Yd(e,t,i){const[r,n]=Gt(i==null?void 0:i.in,e,t);return r.getFullYear()-n.getFullYear()}function ws(e,t,i){const[r,n]=Gt(i==null?void 0:i.in,e,t),a=vo(r,n),o=Math.abs(vs(r,n));r.setDate(r.getDate()-a*o);const s=+(vo(r,n)===-a),d=a*(o-s);return d===0?0:d}function vo(e,t){const i=e.getFullYear()-t.getFullYear()||e.getMonth()-t.getMonth()||e.getDate()-t.getDate()||e.getHours()-t.getHours()||e.getMinutes()-t.getMinutes()||e.getSeconds()-t.getSeconds()||e.getMilliseconds()-t.getMilliseconds();return i<0?-1:i>0?1:i}function _r(e){return t=>{const r=(e?Math[e]:Math.trunc)(t);return r===0?0:r}}function Zd(e,t,i){const[r,n]=Gt(i==null?void 0:i.in,e,t),a=(+r-+n)/wr;return _r(i==null?void 0:i.roundingMethod)(a)}function Da(e,t){return+U(e)-+U(t)}function Qd(e,t,i){const r=Da(e,t)/xr;return _r(i==null?void 0:i.roundingMethod)(r)}function _s(e,t){const i=U(e,t==null?void 0:t.in);return i.setHours(23,59,59,999),i}function $s(e,t){const i=U(e,t==null?void 0:t.in),r=i.getMonth();return i.setFullYear(i.getFullYear(),r+1,0),i.setHours(23,59,59,999),i}function Xd(e,t){const i=U(e,t==null?void 0:t.in);return+_s(i,t)==+$s(i,t)}function ks(e,t,i){const[r,n,a]=Gt(i==null?void 0:i.in,e,e,t),o=Xi(n,a),s=Math.abs(Ud(n,a));if(s<1)return 0;n.getMonth()===1&&n.getDate()>27&&n.setDate(30),n.setMonth(n.getMonth()-o*s);let d=Xi(n,a)===-o;Xd(r)&&s===1&&Xi(r,a)===1&&(d=!1);const p=o*(s-+d);return p===0?0:p}function Jd(e,t,i){const r=ks(e,t,i)/3;return _r(i==null?void 0:i.roundingMethod)(r)}function ep(e,t,i){const r=Da(e,t)/1e3;return _r(i==null?void 0:i.roundingMethod)(r)}function tp(e,t,i){const r=ws(e,t,i)/7;return _r(i==null?void 0:i.roundingMethod)(r)}function ip(e,t,i){const[r,n]=Gt(i==null?void 0:i.in,e,t),a=Xi(r,n),o=Math.abs(Yd(r,n));r.setFullYear(1584),n.setFullYear(1584);const s=Xi(r,n)===-a,d=a*(o-+s);return d===0?0:d}function rp(e,t){const i=U(e,t==null?void 0:t.in),r=i.getMonth(),n=r-r%3;return i.setMonth(n,1),i.setHours(0,0,0,0),i}function np(e,t){const i=U(e,t==null?void 0:t.in);return i.setDate(1),i.setHours(0,0,0,0),i}function ap(e,t){const i=U(e,t==null?void 0:t.in),r=i.getFullYear();return i.setFullYear(r+1,0,0),i.setHours(23,59,59,999),i}function Ss(e,t){const i=U(e,t==null?void 0:t.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}function op(e,t){const i=U(e,t==null?void 0:t.in);return i.setMinutes(59,59,999),i}function sp(e,t){var s,d;const i=qt(),r=i.weekStartsOn??((d=(s=i.locale)==null?void 0:s.options)==null?void 0:d.weekStartsOn)??0,n=U(e,t==null?void 0:t.in),a=n.getDay(),o=(a<r?-7:0)+6-(a-r);return n.setDate(n.getDate()+o),n.setHours(23,59,59,999),n}function lp(e,t){const i=U(e,t==null?void 0:t.in);return i.setSeconds(59,999),i}function cp(e,t){const i=U(e,t==null?void 0:t.in),r=i.getMonth(),n=r-r%3+3;return i.setMonth(n,0),i.setHours(23,59,59,999),i}function dp(e,t){const i=U(e,t==null?void 0:t.in);return i.setMilliseconds(999),i}const pp={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},up=(e,t,i)=>{let r;const n=pp[e];return typeof n=="string"?r=n:t===1?r=n.one:r=n.other.replace("{{count}}",t.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+r:r+" ago":r};function Jn(e){return(t={})=>{const i=t.width?String(t.width):e.defaultWidth;return e.formats[i]||e.formats[e.defaultWidth]}}const hp={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},gp={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},bp={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},fp={date:Jn({formats:hp,defaultWidth:"full"}),time:Jn({formats:gp,defaultWidth:"full"}),dateTime:Jn({formats:bp,defaultWidth:"full"})},mp={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},yp=(e,t,i,r)=>mp[e];function Vi(e){return(t,i)=>{const r=i!=null&&i.context?String(i.context):"standalone";let n;if(r==="formatting"&&e.formattingValues){const o=e.defaultFormattingWidth||e.defaultWidth,s=i!=null&&i.width?String(i.width):o;n=e.formattingValues[s]||e.formattingValues[o]}else{const o=e.defaultWidth,s=i!=null&&i.width?String(i.width):e.defaultWidth;n=e.values[s]||e.values[o]}const a=e.argumentCallback?e.argumentCallback(t):t;return n[a]}}const vp={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},xp={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},wp={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},_p={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},$p={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},kp={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},Sp=(e,t)=>{const i=Number(e),r=i%100;if(r>20||r<10)switch(r%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},Cp={ordinalNumber:Sp,era:Vi({values:vp,defaultWidth:"wide"}),quarter:Vi({values:xp,defaultWidth:"wide",argumentCallback:e=>e-1}),month:Vi({values:wp,defaultWidth:"wide"}),day:Vi({values:_p,defaultWidth:"wide"}),dayPeriod:Vi({values:$p,defaultWidth:"wide",formattingValues:kp,defaultFormattingWidth:"wide"})};function Ki(e){return(t,i={})=>{const r=i.width,n=r&&e.matchPatterns[r]||e.matchPatterns[e.defaultMatchWidth],a=t.match(n);if(!a)return null;const o=a[0],s=r&&e.parsePatterns[r]||e.parsePatterns[e.defaultParseWidth],d=Array.isArray(s)?Pp(s,h=>h.test(o)):Tp(s,h=>h.test(o));let p;p=e.valueCallback?e.valueCallback(d):d,p=i.valueCallback?i.valueCallback(p):p;const u=t.slice(o.length);return{value:p,rest:u}}}function Tp(e,t){for(const i in e)if(Object.prototype.hasOwnProperty.call(e,i)&&t(e[i]))return i}function Pp(e,t){for(let i=0;i<e.length;i++)if(t(e[i]))return i}function Mp(e){return(t,i={})=>{const r=t.match(e.matchPattern);if(!r)return null;const n=r[0],a=t.match(e.parsePattern);if(!a)return null;let o=e.valueCallback?e.valueCallback(a[0]):a[0];o=i.valueCallback?i.valueCallback(o):o;const s=t.slice(n.length);return{value:o,rest:s}}}const Dp=/^(\d+)(th|st|nd|rd)?/i,zp=/\d+/i,Ep={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},Op={any:[/^b/i,/^(a|c)/i]},Lp={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},Ap={any:[/1/i,/2/i,/3/i,/4/i]},Fp={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},Ip={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},Bp={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},Np={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},jp={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},Rp={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},Hp={ordinalNumber:Mp({matchPattern:Dp,parsePattern:zp,valueCallback:e=>parseInt(e,10)}),era:Ki({matchPatterns:Ep,defaultMatchWidth:"wide",parsePatterns:Op,defaultParseWidth:"any"}),quarter:Ki({matchPatterns:Lp,defaultMatchWidth:"wide",parsePatterns:Ap,defaultParseWidth:"any",valueCallback:e=>e+1}),month:Ki({matchPatterns:Fp,defaultMatchWidth:"wide",parsePatterns:Ip,defaultParseWidth:"any"}),day:Ki({matchPatterns:Bp,defaultMatchWidth:"wide",parsePatterns:Np,defaultParseWidth:"any"}),dayPeriod:Ki({matchPatterns:jp,defaultMatchWidth:"any",parsePatterns:Rp,defaultParseWidth:"any"})},Cs={code:"en-US",formatDistance:up,formatLong:fp,formatRelative:yp,localize:Cp,match:Hp,options:{weekStartsOn:0,firstWeekContainsDate:1}};function Wp(e,t){const i=U(e,t==null?void 0:t.in);return vs(i,Ss(i))+1}function Ts(e,t){const i=U(e,t==null?void 0:t.in),r=+gi(i)-+Rd(i);return Math.round(r/ms)+1}function za(e,t){var u,h,b,f;const i=U(e,t==null?void 0:t.in),r=i.getFullYear(),n=qt(),a=(t==null?void 0:t.firstWeekContainsDate)??((h=(u=t==null?void 0:t.locale)==null?void 0:u.options)==null?void 0:h.firstWeekContainsDate)??n.firstWeekContainsDate??((f=(b=n.locale)==null?void 0:b.options)==null?void 0:f.firstWeekContainsDate)??1,o=me((t==null?void 0:t.in)||e,0);o.setFullYear(r+1,0,a),o.setHours(0,0,0,0);const s=Ue(o,t),d=me((t==null?void 0:t.in)||e,0);d.setFullYear(r,0,a),d.setHours(0,0,0,0);const p=Ue(d,t);return+i>=+s?r+1:+i>=+p?r:r-1}function Vp(e,t){var s,d,p,u;const i=qt(),r=(t==null?void 0:t.firstWeekContainsDate)??((d=(s=t==null?void 0:t.locale)==null?void 0:s.options)==null?void 0:d.firstWeekContainsDate)??i.firstWeekContainsDate??((u=(p=i.locale)==null?void 0:p.options)==null?void 0:u.firstWeekContainsDate)??1,n=za(e,t),a=me((t==null?void 0:t.in)||e,0);return a.setFullYear(n,0,r),a.setHours(0,0,0,0),Ue(a,t)}function Ps(e,t){const i=U(e,t==null?void 0:t.in),r=+Ue(i,t)-+Vp(i,t);return Math.round(r/ms)+1}function ae(e,t){const i=e<0?"-":"",r=Math.abs(e).toString().padStart(t,"0");return i+r}const lt={y(e,t){const i=e.getFullYear(),r=i>0?i:1-i;return ae(t==="yy"?r%100:r,t.length)},M(e,t){const i=e.getMonth();return t==="M"?String(i+1):ae(i+1,2)},d(e,t){return ae(e.getDate(),t.length)},a(e,t){const i=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(e,t){return ae(e.getHours()%12||12,t.length)},H(e,t){return ae(e.getHours(),t.length)},m(e,t){return ae(e.getMinutes(),t.length)},s(e,t){return ae(e.getSeconds(),t.length)},S(e,t){const i=t.length,r=e.getMilliseconds(),n=Math.trunc(r*Math.pow(10,i-3));return ae(n,t.length)}},Jt={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},xo={G:function(e,t,i){const r=e.getFullYear()>0?1:0;switch(t){case"G":case"GG":case"GGG":return i.era(r,{width:"abbreviated"});case"GGGGG":return i.era(r,{width:"narrow"});case"GGGG":default:return i.era(r,{width:"wide"})}},y:function(e,t,i){if(t==="yo"){const r=e.getFullYear(),n=r>0?r:1-r;return i.ordinalNumber(n,{unit:"year"})}return lt.y(e,t)},Y:function(e,t,i,r){const n=za(e,r),a=n>0?n:1-n;if(t==="YY"){const o=a%100;return ae(o,2)}return t==="Yo"?i.ordinalNumber(a,{unit:"year"}):ae(a,t.length)},R:function(e,t){const i=ys(e);return ae(i,t.length)},u:function(e,t){const i=e.getFullYear();return ae(i,t.length)},Q:function(e,t,i){const r=Math.ceil((e.getMonth()+1)/3);switch(t){case"Q":return String(r);case"QQ":return ae(r,2);case"Qo":return i.ordinalNumber(r,{unit:"quarter"});case"QQQ":return i.quarter(r,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(r,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(r,{width:"wide",context:"formatting"})}},q:function(e,t,i){const r=Math.ceil((e.getMonth()+1)/3);switch(t){case"q":return String(r);case"qq":return ae(r,2);case"qo":return i.ordinalNumber(r,{unit:"quarter"});case"qqq":return i.quarter(r,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(r,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(r,{width:"wide",context:"standalone"})}},M:function(e,t,i){const r=e.getMonth();switch(t){case"M":case"MM":return lt.M(e,t);case"Mo":return i.ordinalNumber(r+1,{unit:"month"});case"MMM":return i.month(r,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(r,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(r,{width:"wide",context:"formatting"})}},L:function(e,t,i){const r=e.getMonth();switch(t){case"L":return String(r+1);case"LL":return ae(r+1,2);case"Lo":return i.ordinalNumber(r+1,{unit:"month"});case"LLL":return i.month(r,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(r,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(r,{width:"wide",context:"standalone"})}},w:function(e,t,i,r){const n=Ps(e,r);return t==="wo"?i.ordinalNumber(n,{unit:"week"}):ae(n,t.length)},I:function(e,t,i){const r=Ts(e);return t==="Io"?i.ordinalNumber(r,{unit:"week"}):ae(r,t.length)},d:function(e,t,i){return t==="do"?i.ordinalNumber(e.getDate(),{unit:"date"}):lt.d(e,t)},D:function(e,t,i){const r=Wp(e);return t==="Do"?i.ordinalNumber(r,{unit:"dayOfYear"}):ae(r,t.length)},E:function(e,t,i){const r=e.getDay();switch(t){case"E":case"EE":case"EEE":return i.day(r,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(r,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(r,{width:"short",context:"formatting"});case"EEEE":default:return i.day(r,{width:"wide",context:"formatting"})}},e:function(e,t,i,r){const n=e.getDay(),a=(n-r.weekStartsOn+8)%7||7;switch(t){case"e":return String(a);case"ee":return ae(a,2);case"eo":return i.ordinalNumber(a,{unit:"day"});case"eee":return i.day(n,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(n,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(n,{width:"short",context:"formatting"});case"eeee":default:return i.day(n,{width:"wide",context:"formatting"})}},c:function(e,t,i,r){const n=e.getDay(),a=(n-r.weekStartsOn+8)%7||7;switch(t){case"c":return String(a);case"cc":return ae(a,t.length);case"co":return i.ordinalNumber(a,{unit:"day"});case"ccc":return i.day(n,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(n,{width:"narrow",context:"standalone"});case"cccccc":return i.day(n,{width:"short",context:"standalone"});case"cccc":default:return i.day(n,{width:"wide",context:"standalone"})}},i:function(e,t,i){const r=e.getDay(),n=r===0?7:r;switch(t){case"i":return String(n);case"ii":return ae(n,t.length);case"io":return i.ordinalNumber(n,{unit:"day"});case"iii":return i.day(r,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(r,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(r,{width:"short",context:"formatting"});case"iiii":default:return i.day(r,{width:"wide",context:"formatting"})}},a:function(e,t,i){const n=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(n,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(n,{width:"wide",context:"formatting"})}},b:function(e,t,i){const r=e.getHours();let n;switch(r===12?n=Jt.noon:r===0?n=Jt.midnight:n=r/12>=1?"pm":"am",t){case"b":case"bb":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(n,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(n,{width:"wide",context:"formatting"})}},B:function(e,t,i){const r=e.getHours();let n;switch(r>=17?n=Jt.evening:r>=12?n=Jt.afternoon:r>=4?n=Jt.morning:n=Jt.night,t){case"B":case"BB":case"BBB":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(n,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(n,{width:"wide",context:"formatting"})}},h:function(e,t,i){if(t==="ho"){let r=e.getHours()%12;return r===0&&(r=12),i.ordinalNumber(r,{unit:"hour"})}return lt.h(e,t)},H:function(e,t,i){return t==="Ho"?i.ordinalNumber(e.getHours(),{unit:"hour"}):lt.H(e,t)},K:function(e,t,i){const r=e.getHours()%12;return t==="Ko"?i.ordinalNumber(r,{unit:"hour"}):ae(r,t.length)},k:function(e,t,i){let r=e.getHours();return r===0&&(r=24),t==="ko"?i.ordinalNumber(r,{unit:"hour"}):ae(r,t.length)},m:function(e,t,i){return t==="mo"?i.ordinalNumber(e.getMinutes(),{unit:"minute"}):lt.m(e,t)},s:function(e,t,i){return t==="so"?i.ordinalNumber(e.getSeconds(),{unit:"second"}):lt.s(e,t)},S:function(e,t){return lt.S(e,t)},X:function(e,t,i){const r=e.getTimezoneOffset();if(r===0)return"Z";switch(t){case"X":return _o(r);case"XXXX":case"XX":return Et(r);case"XXXXX":case"XXX":default:return Et(r,":")}},x:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"x":return _o(r);case"xxxx":case"xx":return Et(r);case"xxxxx":case"xxx":default:return Et(r,":")}},O:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"O":case"OO":case"OOO":return"GMT"+wo(r,":");case"OOOO":default:return"GMT"+Et(r,":")}},z:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"z":case"zz":case"zzz":return"GMT"+wo(r,":");case"zzzz":default:return"GMT"+Et(r,":")}},t:function(e,t,i){const r=Math.trunc(+e/1e3);return ae(r,t.length)},T:function(e,t,i){return ae(+e,t.length)}};function wo(e,t=""){const i=e>0?"-":"+",r=Math.abs(e),n=Math.trunc(r/60),a=r%60;return a===0?i+String(n):i+String(n)+t+ae(a,2)}function _o(e,t){return e%60===0?(e>0?"-":"+")+ae(Math.abs(e)/60,2):Et(e,t)}function Et(e,t=""){const i=e>0?"-":"+",r=Math.abs(e),n=ae(Math.trunc(r/60),2),a=ae(r%60,2);return i+n+t+a}const $o=(e,t)=>{switch(e){case"P":return t.date({width:"short"});case"PP":return t.date({width:"medium"});case"PPP":return t.date({width:"long"});case"PPPP":default:return t.date({width:"full"})}},Ms=(e,t)=>{switch(e){case"p":return t.time({width:"short"});case"pp":return t.time({width:"medium"});case"ppp":return t.time({width:"long"});case"pppp":default:return t.time({width:"full"})}},Kp=(e,t)=>{const i=e.match(/(P+)(p+)?/)||[],r=i[1],n=i[2];if(!n)return $o(e,t);let a;switch(r){case"P":a=t.dateTime({width:"short"});break;case"PP":a=t.dateTime({width:"medium"});break;case"PPP":a=t.dateTime({width:"long"});break;case"PPPP":default:a=t.dateTime({width:"full"});break}return a.replace("{{date}}",$o(r,t)).replace("{{time}}",Ms(n,t))},ya={p:Ms,P:Kp},qp=/^D+$/,Gp=/^Y+$/,Up=["D","DD","YY","YYYY"];function Ds(e){return qp.test(e)}function zs(e){return Gp.test(e)}function va(e,t,i){const r=Yp(e,t,i);if(console.warn(r),Up.includes(e))throw new RangeError(r)}function Yp(e,t,i){const r=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${t}\`) for formatting ${r} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const Zp=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Qp=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Xp=/^'([^]*?)'?$/,Jp=/''/g,eu=/[a-zA-Z]/;function tu(e,t,i){var u,h,b,f,m,y,S,v;const r=qt(),n=(i==null?void 0:i.locale)??r.locale??Cs,a=(i==null?void 0:i.firstWeekContainsDate)??((h=(u=i==null?void 0:i.locale)==null?void 0:u.options)==null?void 0:h.firstWeekContainsDate)??r.firstWeekContainsDate??((f=(b=r.locale)==null?void 0:b.options)==null?void 0:f.firstWeekContainsDate)??1,o=(i==null?void 0:i.weekStartsOn)??((y=(m=i==null?void 0:i.locale)==null?void 0:m.options)==null?void 0:y.weekStartsOn)??r.weekStartsOn??((v=(S=r.locale)==null?void 0:S.options)==null?void 0:v.weekStartsOn)??0,s=U(e,i==null?void 0:i.in);if(!xs(s))throw new RangeError("Invalid time value");let d=t.match(Qp).map($=>{const T=$[0];if(T==="p"||T==="P"){const W=ya[T];return W($,n.formatLong)}return $}).join("").match(Zp).map($=>{if($==="''")return{isToken:!1,value:"'"};const T=$[0];if(T==="'")return{isToken:!1,value:iu($)};if(xo[T])return{isToken:!0,value:$};if(T.match(eu))throw new RangeError("Format string contains an unescaped latin alphabet character `"+T+"`");return{isToken:!1,value:$}});n.localize.preprocessor&&(d=n.localize.preprocessor(s,d));const p={firstWeekContainsDate:a,weekStartsOn:o,locale:n};return d.map($=>{if(!$.isToken)return $.value;const T=$.value;(!(i!=null&&i.useAdditionalWeekYearTokens)&&zs(T)||!(i!=null&&i.useAdditionalDayOfYearTokens)&&Ds(T))&&va(T,t,String(e));const W=xo[T[0]];return W(s,T,n.localize,p)}).join("")}function iu(e){const t=e.match(Xp);return t?t[1].replace(Jp,"'"):e}function ru(){return Object.assign({},qt())}function nu(e,t){const i=U(e,t==null?void 0:t.in).getDay();return i===0?7:i}function au(e,t){const i=ou(t)?new t(0):me(t,0);return i.setFullYear(e.getFullYear(),e.getMonth(),e.getDate()),i.setHours(e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()),i}function ou(e){var t;return typeof e=="function"&&((t=e.prototype)==null?void 0:t.constructor)===e}const su=10;class Es{constructor(){L(this,"subPriority",0)}validate(t,i){return!0}}class lu extends Es{constructor(t,i,r,n,a){super(),this.value=t,this.validateValue=i,this.setValue=r,this.priority=n,a&&(this.subPriority=a)}validate(t,i){return this.validateValue(t,this.value,i)}set(t,i,r){return this.setValue(t,i,this.value,r)}}class cu extends Es{constructor(i,r){super();L(this,"priority",su);L(this,"subPriority",-1);this.context=i||(n=>me(r,n))}set(i,r){return r.timestampIsSet?i:me(i,au(i,this.context))}}class ie{run(t,i,r,n){const a=this.parse(t,i,r,n);return a?{setter:new lu(a.value,this.validate,this.set,this.priority,this.subPriority),rest:a.rest}:null}validate(t,i,r){return!0}}class du extends ie{constructor(){super(...arguments);L(this,"priority",140);L(this,"incompatibleTokens",["R","u","t","T"])}parse(i,r,n){switch(r){case"G":case"GG":case"GGG":return n.era(i,{width:"abbreviated"})||n.era(i,{width:"narrow"});case"GGGGG":return n.era(i,{width:"narrow"});case"GGGG":default:return n.era(i,{width:"wide"})||n.era(i,{width:"abbreviated"})||n.era(i,{width:"narrow"})}}set(i,r,n){return r.era=n,i.setFullYear(n,0,1),i.setHours(0,0,0,0),i}}const ve={month:/^(1[0-2]|0?\d)/,date:/^(3[0-1]|[0-2]?\d)/,dayOfYear:/^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,week:/^(5[0-3]|[0-4]?\d)/,hour23h:/^(2[0-3]|[0-1]?\d)/,hour24h:/^(2[0-4]|[0-1]?\d)/,hour11h:/^(1[0-1]|0?\d)/,hour12h:/^(1[0-2]|0?\d)/,minute:/^[0-5]?\d/,second:/^[0-5]?\d/,singleDigit:/^\d/,twoDigits:/^\d{1,2}/,threeDigits:/^\d{1,3}/,fourDigits:/^\d{1,4}/,anyDigitsSigned:/^-?\d+/,singleDigitSigned:/^-?\d/,twoDigitsSigned:/^-?\d{1,2}/,threeDigitsSigned:/^-?\d{1,3}/,fourDigitsSigned:/^-?\d{1,4}/},qe={basicOptionalMinutes:/^([+-])(\d{2})(\d{2})?|Z/,basic:/^([+-])(\d{2})(\d{2})|Z/,basicOptionalSeconds:/^([+-])(\d{2})(\d{2})((\d{2}))?|Z/,extended:/^([+-])(\d{2}):(\d{2})|Z/,extendedOptionalSeconds:/^([+-])(\d{2}):(\d{2})(:(\d{2}))?|Z/};function xe(e,t){return e&&{value:t(e.value),rest:e.rest}}function he(e,t){const i=t.match(e);return i?{value:parseInt(i[0],10),rest:t.slice(i[0].length)}:null}function Ge(e,t){const i=t.match(e);if(!i)return null;if(i[0]==="Z")return{value:0,rest:t.slice(1)};const r=i[1]==="+"?1:-1,n=i[2]?parseInt(i[2],10):0,a=i[3]?parseInt(i[3],10):0,o=i[5]?parseInt(i[5],10):0;return{value:r*(n*wr+a*xr+o*Bd),rest:t.slice(i[0].length)}}function Os(e){return he(ve.anyDigitsSigned,e)}function ye(e,t){switch(e){case 1:return he(ve.singleDigit,t);case 2:return he(ve.twoDigits,t);case 3:return he(ve.threeDigits,t);case 4:return he(ve.fourDigits,t);default:return he(new RegExp("^\\d{1,"+e+"}"),t)}}function an(e,t){switch(e){case 1:return he(ve.singleDigitSigned,t);case 2:return he(ve.twoDigitsSigned,t);case 3:return he(ve.threeDigitsSigned,t);case 4:return he(ve.fourDigitsSigned,t);default:return he(new RegExp("^-?\\d{1,"+e+"}"),t)}}function Ea(e){switch(e){case"morning":return 4;case"evening":return 17;case"pm":case"noon":case"afternoon":return 12;case"am":case"midnight":case"night":default:return 0}}function Ls(e,t){const i=t>0,r=i?t:1-t;let n;if(r<=50)n=e||100;else{const a=r+50,o=Math.trunc(a/100)*100,s=e>=a%100;n=e+o-(s?100:0)}return i?n:1-n}function As(e){return e%400===0||e%4===0&&e%100!==0}class pu extends ie{constructor(){super(...arguments);L(this,"priority",130);L(this,"incompatibleTokens",["Y","R","u","w","I","i","e","c","t","T"])}parse(i,r,n){const a=o=>({year:o,isTwoDigitYear:r==="yy"});switch(r){case"y":return xe(ye(4,i),a);case"yo":return xe(n.ordinalNumber(i,{unit:"year"}),a);default:return xe(ye(r.length,i),a)}}validate(i,r){return r.isTwoDigitYear||r.year>0}set(i,r,n){const a=i.getFullYear();if(n.isTwoDigitYear){const s=Ls(n.year,a);return i.setFullYear(s,0,1),i.setHours(0,0,0,0),i}const o=!("era"in r)||r.era===1?n.year:1-n.year;return i.setFullYear(o,0,1),i.setHours(0,0,0,0),i}}class uu extends ie{constructor(){super(...arguments);L(this,"priority",130);L(this,"incompatibleTokens",["y","R","u","Q","q","M","L","I","d","D","i","t","T"])}parse(i,r,n){const a=o=>({year:o,isTwoDigitYear:r==="YY"});switch(r){case"Y":return xe(ye(4,i),a);case"Yo":return xe(n.ordinalNumber(i,{unit:"year"}),a);default:return xe(ye(r.length,i),a)}}validate(i,r){return r.isTwoDigitYear||r.year>0}set(i,r,n,a){const o=za(i,a);if(n.isTwoDigitYear){const d=Ls(n.year,o);return i.setFullYear(d,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),Ue(i,a)}const s=!("era"in r)||r.era===1?n.year:1-n.year;return i.setFullYear(s,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),Ue(i,a)}}class hu extends ie{constructor(){super(...arguments);L(this,"priority",130);L(this,"incompatibleTokens",["G","y","Y","u","Q","q","M","L","w","d","D","e","c","t","T"])}parse(i,r){return an(r==="R"?4:r.length,i)}set(i,r,n){const a=me(i,0);return a.setFullYear(n,0,4),a.setHours(0,0,0,0),gi(a)}}class gu extends ie{constructor(){super(...arguments);L(this,"priority",130);L(this,"incompatibleTokens",["G","y","Y","R","w","I","i","e","c","t","T"])}parse(i,r){return an(r==="u"?4:r.length,i)}set(i,r,n){return i.setFullYear(n,0,1),i.setHours(0,0,0,0),i}}class bu extends ie{constructor(){super(...arguments);L(this,"priority",120);L(this,"incompatibleTokens",["Y","R","q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"Q":case"QQ":return ye(r.length,i);case"Qo":return n.ordinalNumber(i,{unit:"quarter"});case"QQQ":return n.quarter(i,{width:"abbreviated",context:"formatting"})||n.quarter(i,{width:"narrow",context:"formatting"});case"QQQQQ":return n.quarter(i,{width:"narrow",context:"formatting"});case"QQQQ":default:return n.quarter(i,{width:"wide",context:"formatting"})||n.quarter(i,{width:"abbreviated",context:"formatting"})||n.quarter(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=1&&r<=4}set(i,r,n){return i.setMonth((n-1)*3,1),i.setHours(0,0,0,0),i}}class fu extends ie{constructor(){super(...arguments);L(this,"priority",120);L(this,"incompatibleTokens",["Y","R","Q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"q":case"qq":return ye(r.length,i);case"qo":return n.ordinalNumber(i,{unit:"quarter"});case"qqq":return n.quarter(i,{width:"abbreviated",context:"standalone"})||n.quarter(i,{width:"narrow",context:"standalone"});case"qqqqq":return n.quarter(i,{width:"narrow",context:"standalone"});case"qqqq":default:return n.quarter(i,{width:"wide",context:"standalone"})||n.quarter(i,{width:"abbreviated",context:"standalone"})||n.quarter(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=1&&r<=4}set(i,r,n){return i.setMonth((n-1)*3,1),i.setHours(0,0,0,0),i}}class mu extends ie{constructor(){super(...arguments);L(this,"incompatibleTokens",["Y","R","q","Q","L","w","I","D","i","e","c","t","T"]);L(this,"priority",110)}parse(i,r,n){const a=o=>o-1;switch(r){case"M":return xe(he(ve.month,i),a);case"MM":return xe(ye(2,i),a);case"Mo":return xe(n.ordinalNumber(i,{unit:"month"}),a);case"MMM":return n.month(i,{width:"abbreviated",context:"formatting"})||n.month(i,{width:"narrow",context:"formatting"});case"MMMMM":return n.month(i,{width:"narrow",context:"formatting"});case"MMMM":default:return n.month(i,{width:"wide",context:"formatting"})||n.month(i,{width:"abbreviated",context:"formatting"})||n.month(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=11}set(i,r,n){return i.setMonth(n,1),i.setHours(0,0,0,0),i}}class yu extends ie{constructor(){super(...arguments);L(this,"priority",110);L(this,"incompatibleTokens",["Y","R","q","Q","M","w","I","D","i","e","c","t","T"])}parse(i,r,n){const a=o=>o-1;switch(r){case"L":return xe(he(ve.month,i),a);case"LL":return xe(ye(2,i),a);case"Lo":return xe(n.ordinalNumber(i,{unit:"month"}),a);case"LLL":return n.month(i,{width:"abbreviated",context:"standalone"})||n.month(i,{width:"narrow",context:"standalone"});case"LLLLL":return n.month(i,{width:"narrow",context:"standalone"});case"LLLL":default:return n.month(i,{width:"wide",context:"standalone"})||n.month(i,{width:"abbreviated",context:"standalone"})||n.month(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=0&&r<=11}set(i,r,n){return i.setMonth(n,1),i.setHours(0,0,0,0),i}}function vu(e,t,i){const r=U(e,i==null?void 0:i.in),n=Ps(r,i)-t;return r.setDate(r.getDate()-n*7),U(r,i==null?void 0:i.in)}class xu extends ie{constructor(){super(...arguments);L(this,"priority",100);L(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","i","t","T"])}parse(i,r,n){switch(r){case"w":return he(ve.week,i);case"wo":return n.ordinalNumber(i,{unit:"week"});default:return ye(r.length,i)}}validate(i,r){return r>=1&&r<=53}set(i,r,n,a){return Ue(vu(i,n,a),a)}}function wu(e,t,i){const r=U(e,i==null?void 0:i.in),n=Ts(r,i)-t;return r.setDate(r.getDate()-n*7),r}class _u extends ie{constructor(){super(...arguments);L(this,"priority",100);L(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","e","c","t","T"])}parse(i,r,n){switch(r){case"I":return he(ve.week,i);case"Io":return n.ordinalNumber(i,{unit:"week"});default:return ye(r.length,i)}}validate(i,r){return r>=1&&r<=53}set(i,r,n){return gi(wu(i,n))}}const $u=[31,28,31,30,31,30,31,31,30,31,30,31],ku=[31,29,31,30,31,30,31,31,30,31,30,31];class Su extends ie{constructor(){super(...arguments);L(this,"priority",90);L(this,"subPriority",1);L(this,"incompatibleTokens",["Y","R","q","Q","w","I","D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"d":return he(ve.date,i);case"do":return n.ordinalNumber(i,{unit:"date"});default:return ye(r.length,i)}}validate(i,r){const n=i.getFullYear(),a=As(n),o=i.getMonth();return a?r>=1&&r<=ku[o]:r>=1&&r<=$u[o]}set(i,r,n){return i.setDate(n),i.setHours(0,0,0,0),i}}class Cu extends ie{constructor(){super(...arguments);L(this,"priority",90);L(this,"subpriority",1);L(this,"incompatibleTokens",["Y","R","q","Q","M","L","w","I","d","E","i","e","c","t","T"])}parse(i,r,n){switch(r){case"D":case"DD":return he(ve.dayOfYear,i);case"Do":return n.ordinalNumber(i,{unit:"date"});default:return ye(r.length,i)}}validate(i,r){const n=i.getFullYear();return As(n)?r>=1&&r<=366:r>=1&&r<=365}set(i,r,n){return i.setMonth(0,n),i.setHours(0,0,0,0),i}}function Oa(e,t,i){var h,b,f,m;const r=qt(),n=(i==null?void 0:i.weekStartsOn)??((b=(h=i==null?void 0:i.locale)==null?void 0:h.options)==null?void 0:b.weekStartsOn)??r.weekStartsOn??((m=(f=r.locale)==null?void 0:f.options)==null?void 0:m.weekStartsOn)??0,a=U(e,i==null?void 0:i.in),o=a.getDay(),d=(t%7+7)%7,p=7-n,u=t<0||t>6?t-(o+p)%7:(d+p)%7-(o+p)%7;return Cn(a,u,i)}class Tu extends ie{constructor(){super(...arguments);L(this,"priority",90);L(this,"incompatibleTokens",["D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"E":case"EE":case"EEE":return n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"EEEEE":return n.day(i,{width:"narrow",context:"formatting"});case"EEEEEE":return n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"EEEE":default:return n.day(i,{width:"wide",context:"formatting"})||n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=6}set(i,r,n,a){return i=Oa(i,n,a),i.setHours(0,0,0,0),i}}class Pu extends ie{constructor(){super(...arguments);L(this,"priority",90);L(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","c","t","T"])}parse(i,r,n,a){const o=s=>{const d=Math.floor((s-1)/7)*7;return(s+a.weekStartsOn+6)%7+d};switch(r){case"e":case"ee":return xe(ye(r.length,i),o);case"eo":return xe(n.ordinalNumber(i,{unit:"day"}),o);case"eee":return n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"eeeee":return n.day(i,{width:"narrow",context:"formatting"});case"eeeeee":return n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"eeee":default:return n.day(i,{width:"wide",context:"formatting"})||n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=6}set(i,r,n,a){return i=Oa(i,n,a),i.setHours(0,0,0,0),i}}class Mu extends ie{constructor(){super(...arguments);L(this,"priority",90);L(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","e","t","T"])}parse(i,r,n,a){const o=s=>{const d=Math.floor((s-1)/7)*7;return(s+a.weekStartsOn+6)%7+d};switch(r){case"c":case"cc":return xe(ye(r.length,i),o);case"co":return xe(n.ordinalNumber(i,{unit:"day"}),o);case"ccc":return n.day(i,{width:"abbreviated",context:"standalone"})||n.day(i,{width:"short",context:"standalone"})||n.day(i,{width:"narrow",context:"standalone"});case"ccccc":return n.day(i,{width:"narrow",context:"standalone"});case"cccccc":return n.day(i,{width:"short",context:"standalone"})||n.day(i,{width:"narrow",context:"standalone"});case"cccc":default:return n.day(i,{width:"wide",context:"standalone"})||n.day(i,{width:"abbreviated",context:"standalone"})||n.day(i,{width:"short",context:"standalone"})||n.day(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=0&&r<=6}set(i,r,n,a){return i=Oa(i,n,a),i.setHours(0,0,0,0),i}}function Du(e,t,i){const r=U(e,i==null?void 0:i.in),n=nu(r,i),a=t-n;return Cn(r,a,i)}class zu extends ie{constructor(){super(...arguments);L(this,"priority",90);L(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","E","e","c","t","T"])}parse(i,r,n){const a=o=>o===0?7:o;switch(r){case"i":case"ii":return ye(r.length,i);case"io":return n.ordinalNumber(i,{unit:"day"});case"iii":return xe(n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"}),a);case"iiiii":return xe(n.day(i,{width:"narrow",context:"formatting"}),a);case"iiiiii":return xe(n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"}),a);case"iiii":default:return xe(n.day(i,{width:"wide",context:"formatting"})||n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"}),a)}}validate(i,r){return r>=1&&r<=7}set(i,r,n){return i=Du(i,n),i.setHours(0,0,0,0),i}}class Eu extends ie{constructor(){super(...arguments);L(this,"priority",80);L(this,"incompatibleTokens",["b","B","H","k","t","T"])}parse(i,r,n){switch(r){case"a":case"aa":case"aaa":return n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaaa":return n.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaa":default:return n.dayPeriod(i,{width:"wide",context:"formatting"})||n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,n){return i.setHours(Ea(n),0,0,0),i}}class Ou extends ie{constructor(){super(...arguments);L(this,"priority",80);L(this,"incompatibleTokens",["a","B","H","k","t","T"])}parse(i,r,n){switch(r){case"b":case"bb":case"bbb":return n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbbb":return n.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbb":default:return n.dayPeriod(i,{width:"wide",context:"formatting"})||n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,n){return i.setHours(Ea(n),0,0,0),i}}class Lu extends ie{constructor(){super(...arguments);L(this,"priority",80);L(this,"incompatibleTokens",["a","b","t","T"])}parse(i,r,n){switch(r){case"B":case"BB":case"BBB":return n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBBB":return n.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBB":default:return n.dayPeriod(i,{width:"wide",context:"formatting"})||n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,n){return i.setHours(Ea(n),0,0,0),i}}class Au extends ie{constructor(){super(...arguments);L(this,"priority",70);L(this,"incompatibleTokens",["H","K","k","t","T"])}parse(i,r,n){switch(r){case"h":return he(ve.hour12h,i);case"ho":return n.ordinalNumber(i,{unit:"hour"});default:return ye(r.length,i)}}validate(i,r){return r>=1&&r<=12}set(i,r,n){const a=i.getHours()>=12;return a&&n<12?i.setHours(n+12,0,0,0):!a&&n===12?i.setHours(0,0,0,0):i.setHours(n,0,0,0),i}}class Fu extends ie{constructor(){super(...arguments);L(this,"priority",70);L(this,"incompatibleTokens",["a","b","h","K","k","t","T"])}parse(i,r,n){switch(r){case"H":return he(ve.hour23h,i);case"Ho":return n.ordinalNumber(i,{unit:"hour"});default:return ye(r.length,i)}}validate(i,r){return r>=0&&r<=23}set(i,r,n){return i.setHours(n,0,0,0),i}}class Iu extends ie{constructor(){super(...arguments);L(this,"priority",70);L(this,"incompatibleTokens",["h","H","k","t","T"])}parse(i,r,n){switch(r){case"K":return he(ve.hour11h,i);case"Ko":return n.ordinalNumber(i,{unit:"hour"});default:return ye(r.length,i)}}validate(i,r){return r>=0&&r<=11}set(i,r,n){return i.getHours()>=12&&n<12?i.setHours(n+12,0,0,0):i.setHours(n,0,0,0),i}}class Bu extends ie{constructor(){super(...arguments);L(this,"priority",70);L(this,"incompatibleTokens",["a","b","h","H","K","t","T"])}parse(i,r,n){switch(r){case"k":return he(ve.hour24h,i);case"ko":return n.ordinalNumber(i,{unit:"hour"});default:return ye(r.length,i)}}validate(i,r){return r>=1&&r<=24}set(i,r,n){const a=n<=24?n%24:n;return i.setHours(a,0,0,0),i}}class Nu extends ie{constructor(){super(...arguments);L(this,"priority",60);L(this,"incompatibleTokens",["t","T"])}parse(i,r,n){switch(r){case"m":return he(ve.minute,i);case"mo":return n.ordinalNumber(i,{unit:"minute"});default:return ye(r.length,i)}}validate(i,r){return r>=0&&r<=59}set(i,r,n){return i.setMinutes(n,0,0),i}}class ju extends ie{constructor(){super(...arguments);L(this,"priority",50);L(this,"incompatibleTokens",["t","T"])}parse(i,r,n){switch(r){case"s":return he(ve.second,i);case"so":return n.ordinalNumber(i,{unit:"second"});default:return ye(r.length,i)}}validate(i,r){return r>=0&&r<=59}set(i,r,n){return i.setSeconds(n,0),i}}class Ru extends ie{constructor(){super(...arguments);L(this,"priority",30);L(this,"incompatibleTokens",["t","T"])}parse(i,r){const n=a=>Math.trunc(a*Math.pow(10,-r.length+3));return xe(ye(r.length,i),n)}set(i,r,n){return i.setMilliseconds(n),i}}class Hu extends ie{constructor(){super(...arguments);L(this,"priority",10);L(this,"incompatibleTokens",["t","T","x"])}parse(i,r){switch(r){case"X":return Ge(qe.basicOptionalMinutes,i);case"XX":return Ge(qe.basic,i);case"XXXX":return Ge(qe.basicOptionalSeconds,i);case"XXXXX":return Ge(qe.extendedOptionalSeconds,i);case"XXX":default:return Ge(qe.extended,i)}}set(i,r,n){return r.timestampIsSet?i:me(i,i.getTime()-nn(i)-n)}}class Wu extends ie{constructor(){super(...arguments);L(this,"priority",10);L(this,"incompatibleTokens",["t","T","X"])}parse(i,r){switch(r){case"x":return Ge(qe.basicOptionalMinutes,i);case"xx":return Ge(qe.basic,i);case"xxxx":return Ge(qe.basicOptionalSeconds,i);case"xxxxx":return Ge(qe.extendedOptionalSeconds,i);case"xxx":default:return Ge(qe.extended,i)}}set(i,r,n){return r.timestampIsSet?i:me(i,i.getTime()-nn(i)-n)}}class Vu extends ie{constructor(){super(...arguments);L(this,"priority",40);L(this,"incompatibleTokens","*")}parse(i){return Os(i)}set(i,r,n){return[me(i,n*1e3),{timestampIsSet:!0}]}}class Ku extends ie{constructor(){super(...arguments);L(this,"priority",20);L(this,"incompatibleTokens","*")}parse(i){return Os(i)}set(i,r,n){return[me(i,n),{timestampIsSet:!0}]}}const qu={G:new du,y:new pu,Y:new uu,R:new hu,u:new gu,Q:new bu,q:new fu,M:new mu,L:new yu,w:new xu,I:new _u,d:new Su,D:new Cu,E:new Tu,e:new Pu,c:new Mu,i:new zu,a:new Eu,b:new Ou,B:new Lu,h:new Au,H:new Fu,K:new Iu,k:new Bu,m:new Nu,s:new ju,S:new Ru,X:new Hu,x:new Wu,t:new Vu,T:new Ku},Gu=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Uu=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Yu=/^'([^]*?)'?$/,Zu=/''/g,Qu=/\S/,Xu=/[a-zA-Z]/;function Ju(e,t,i,r){var S,v,$,T,W,F,R,k;const n=()=>me((r==null?void 0:r.in)||i,NaN),a=ru(),o=(r==null?void 0:r.locale)??a.locale??Cs,s=(r==null?void 0:r.firstWeekContainsDate)??((v=(S=r==null?void 0:r.locale)==null?void 0:S.options)==null?void 0:v.firstWeekContainsDate)??a.firstWeekContainsDate??((T=($=a.locale)==null?void 0:$.options)==null?void 0:T.firstWeekContainsDate)??1,d=(r==null?void 0:r.weekStartsOn)??((F=(W=r==null?void 0:r.locale)==null?void 0:W.options)==null?void 0:F.weekStartsOn)??a.weekStartsOn??((k=(R=a.locale)==null?void 0:R.options)==null?void 0:k.weekStartsOn)??0;if(!t)return e?n():U(i,r==null?void 0:r.in);const p={firstWeekContainsDate:s,weekStartsOn:d,locale:o},u=[new cu(r==null?void 0:r.in,i)],h=t.match(Uu).map(A=>{const D=A[0];if(D in ya){const K=ya[D];return K(A,o.formatLong)}return A}).join("").match(Gu),b=[];for(let A of h){!(r!=null&&r.useAdditionalWeekYearTokens)&&zs(A)&&va(A,t,e),!(r!=null&&r.useAdditionalDayOfYearTokens)&&Ds(A)&&va(A,t,e);const D=A[0],K=qu[D];if(K){const{incompatibleTokens:q}=K;if(Array.isArray(q)){const H=b.find(Pe=>q.includes(Pe.token)||Pe.token===D);if(H)throw new RangeError(`The format string mustn't contain \`${H.fullToken}\` and \`${A}\` at the same time`)}else if(K.incompatibleTokens==="*"&&b.length>0)throw new RangeError(`The format string mustn't contain \`${A}\` and any other token at the same time`);b.push({token:D,fullToken:A});const B=K.run(e,A,o.match,p);if(!B)return n();u.push(B.setter),e=B.rest}else{if(D.match(Xu))throw new RangeError("Format string contains an unescaped latin alphabet character `"+D+"`");if(A==="''"?A="'":D==="'"&&(A=eh(A)),e.indexOf(A)===0)e=e.slice(A.length);else return n()}}if(e.length>0&&Qu.test(e))return n();const f=u.map(A=>A.priority).sort((A,D)=>D-A).filter((A,D,K)=>K.indexOf(A)===D).map(A=>u.filter(D=>D.priority===A).sort((D,K)=>K.subPriority-D.subPriority)).map(A=>A[0]);let m=U(i,r==null?void 0:r.in);if(isNaN(+m))return n();const y={};for(const A of f){if(!A.validate(m,p))return n();const D=A.set(m,y,p);Array.isArray(D)?(m=D[0],Object.assign(y,D[1])):m=D}return m}function eh(e){return e.match(Yu)[1].replace(Zu,"'")}function th(e,t){const i=U(e,t==null?void 0:t.in);return i.setMinutes(0,0,0),i}function ih(e,t){const i=U(e,t==null?void 0:t.in);return i.setSeconds(0,0),i}function rh(e,t){const i=U(e,t==null?void 0:t.in);return i.setMilliseconds(0),i}function nh(e,t){const i=()=>me(t==null?void 0:t.in,NaN),r=(t==null?void 0:t.additionalDigits)??2,n=lh(e);let a;if(n.date){const p=ch(n.date,r);a=dh(p.restDateString,p.year)}if(!a||isNaN(+a))return i();const o=+a;let s=0,d;if(n.time&&(s=ph(n.time),isNaN(s)))return i();if(n.timezone){if(d=uh(n.timezone),isNaN(d))return i()}else{const p=new Date(o+s),u=U(0,t==null?void 0:t.in);return u.setFullYear(p.getUTCFullYear(),p.getUTCMonth(),p.getUTCDate()),u.setHours(p.getUTCHours(),p.getUTCMinutes(),p.getUTCSeconds(),p.getUTCMilliseconds()),u}return U(o+s+d,t==null?void 0:t.in)}const Kr={dateTimeDelimiter:/[T ]/,timeZoneDelimiter:/[Z ]/i,timezone:/([Z+-].*)$/},ah=/^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/,oh=/^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/,sh=/^([+-])(\d{2})(?::?(\d{2}))?$/;function lh(e){const t={},i=e.split(Kr.dateTimeDelimiter);let r;if(i.length>2)return t;if(/:/.test(i[0])?r=i[0]:(t.date=i[0],r=i[1],Kr.timeZoneDelimiter.test(t.date)&&(t.date=e.split(Kr.timeZoneDelimiter)[0],r=e.substr(t.date.length,e.length))),r){const n=Kr.timezone.exec(r);n?(t.time=r.replace(n[1],""),t.timezone=n[1]):t.time=r}return t}function ch(e,t){const i=new RegExp("^(?:(\\d{4}|[+-]\\d{"+(4+t)+"})|(\\d{2}|[+-]\\d{"+(2+t)+"})$)"),r=e.match(i);if(!r)return{year:NaN,restDateString:""};const n=r[1]?parseInt(r[1]):null,a=r[2]?parseInt(r[2]):null;return{year:a===null?n:a*100,restDateString:e.slice((r[1]||r[2]).length)}}function dh(e,t){if(t===null)return new Date(NaN);const i=e.match(ah);if(!i)return new Date(NaN);const r=!!i[4],n=qi(i[1]),a=qi(i[2])-1,o=qi(i[3]),s=qi(i[4]),d=qi(i[5])-1;if(r)return mh(t,s,d)?hh(t,s,d):new Date(NaN);{const p=new Date(0);return!bh(t,a,o)||!fh(t,n)?new Date(NaN):(p.setUTCFullYear(t,a,Math.max(n,o)),p)}}function qi(e){return e?parseInt(e):1}function ph(e){const t=e.match(oh);if(!t)return NaN;const i=ea(t[1]),r=ea(t[2]),n=ea(t[3]);return yh(i,r,n)?i*wr+r*xr+n*1e3:NaN}function ea(e){return e&&parseFloat(e.replace(",","."))||0}function uh(e){if(e==="Z")return 0;const t=e.match(sh);if(!t)return 0;const i=t[1]==="+"?-1:1,r=parseInt(t[2]),n=t[3]&&parseInt(t[3])||0;return vh(r,n)?i*(r*wr+n*xr):NaN}function hh(e,t,i){const r=new Date(0);r.setUTCFullYear(e,0,4);const n=r.getUTCDay()||7,a=(t-1)*7+i+1-n;return r.setUTCDate(r.getUTCDate()+a),r}const gh=[31,null,31,30,31,30,31,31,30,31,30,31];function Fs(e){return e%400===0||e%4===0&&e%100!==0}function bh(e,t,i){return t>=0&&t<=11&&i>=1&&i<=(gh[t]||(Fs(e)?29:28))}function fh(e,t){return t>=1&&t<=(Fs(e)?366:365)}function mh(e,t,i){return t>=1&&t<=53&&i>=0&&i<=6}function yh(e,t,i){return e===24?t===0&&i===0:i>=0&&i<60&&t>=0&&t<60&&e>=0&&e<25}function vh(e,t){return t>=0&&t<=59}/*!
 * chartjs-adapter-date-fns v3.0.0
 * https://www.chartjs.org
 * (c) 2022 chartjs-adapter-date-fns Contributors
 * Released under the MIT license
 */const xh={datetime:"MMM d, yyyy, h:mm:ss aaaa",millisecond:"h:mm:ss.SSS aaaa",second:"h:mm:ss aaaa",minute:"h:mm aaaa",hour:"ha",day:"MMM d",week:"PP",month:"MMM yyyy",quarter:"qqq - yyyy",year:"yyyy"};el._date.override({_id:"date-fns",formats:function(){return xh},parse:function(e,t){if(e===null||typeof e>"u")return null;const i=typeof e;return i==="number"||e instanceof Date?e=U(e):i==="string"&&(typeof t=="string"?e=Ju(e,t,new Date,this.options):e=nh(e,this.options)),xs(e)?e.getTime():null},format:function(e,t){return tu(e,t,this.options)},add:function(e,t,i){switch(i){case"millisecond":return Ma(e,t);case"second":return Vd(e,t);case"minute":return Hd(e,t);case"hour":return Nd(e,t);case"day":return Cn(e,t);case"week":return Kd(e,t);case"month":return Pa(e,t);case"quarter":return Wd(e,t);case"year":return qd(e,t);default:return e}},diff:function(e,t,i){switch(i){case"millisecond":return Da(e,t);case"second":return ep(e,t);case"minute":return Qd(e,t);case"hour":return Zd(e,t);case"day":return ws(e,t);case"week":return tp(e,t);case"month":return ks(e,t);case"quarter":return Jd(e,t);case"year":return ip(e,t);default:return 0}},startOf:function(e,t,i){switch(t){case"second":return rh(e);case"minute":return ih(e);case"hour":return th(e);case"day":return ma(e);case"week":return Ue(e);case"isoWeek":return Ue(e,{weekStartsOn:+i});case"month":return np(e);case"quarter":return rp(e);case"year":return Ss(e);default:return e}},endOf:function(e,t){switch(t){case"second":return dp(e);case"minute":return lp(e);case"hour":return op(e);case"day":return _s(e);case"week":return sp(e);case"month":return $s(e);case"quarter":return cp(e);case"year":return ap(e);default:return e}}});function ko(e,t){if(!(t!=null&&t.start)||!(t!=null&&t.end))return null;const i=e.getPixelForValue(t.start.getTime()),r=e.getPixelForValue(t.end.getTime());if(!Number.isFinite(i)||!Number.isFinite(r))return null;const n=Math.min(i,r),a=Math.max(Math.abs(r-i),2);return!Number.isFinite(a)||a<=0?null:{left:n,width:a}}const wh={id:"pricingModeIcons",beforeDatasetsDraw(e,t,i){var d;const r=i,n=r==null?void 0:r.segments;if(!(n!=null&&n.length))return;const a=e.chartArea,o=(d=e.scales)==null?void 0:d.x;if(!a||!o)return;const s=e.ctx;s.save(),s.globalAlpha=(r==null?void 0:r.backgroundOpacity)??.12;for(const p of n){const u=ko(o,p);u&&(s.fillStyle=p.color||"rgba(255, 255, 255, 0.1)",s.fillRect(u.left,a.top,u.width,a.bottom-a.top))}s.restore()},afterDatasetsDraw(e,t,i){var A;const r=i,n=r==null?void 0:r.segments;if(!(n!=null&&n.length))return;const a=(A=e.scales)==null?void 0:A.x,o=e.chartArea;if(!a||!o)return;const s=(r==null?void 0:r.iconSize)??16,d=(r==null?void 0:r.labelSize)??9,p=`${s}px "Inter", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,u=`${d}px "Inter", sans-serif`,h=(r==null?void 0:r.iconColor)||"rgba(255, 255, 255, 0.95)",b=(r==null?void 0:r.labelColor)||"rgba(255, 255, 255, 0.7)",f=(r==null?void 0:r.axisBandPadding)??10,m=(r==null?void 0:r.axisBandHeight)??s+d+10,y=(r==null?void 0:r.axisBandColor)||"rgba(6, 10, 18, 0.12)",S=(r==null?void 0:r.iconAlignment)||"start",v=(r==null?void 0:r.iconStartOffset)??12,$=(r==null?void 0:r.iconBaselineOffset)??4,T=(a.bottom||o.bottom)+f,W=Math.min(T,e.height-m-2),F=o.right-o.left,R=W+$,k=e.ctx;k.save(),k.globalCompositeOperation="destination-over",k.fillStyle=y,k.fillRect(o.left,W,F,m),k.restore(),k.save(),k.globalCompositeOperation="destination-over",k.textAlign="center",k.textBaseline="top";for(const D of n){const K=ko(a,D);if(!K)continue;let q;if(S==="start"){q=K.left+v;const B=K.left+K.width-s/2;q>B&&(q=K.left+K.width/2)}else q=K.left+K.width/2;k.font=p,k.fillStyle=h,k.fillText(D.icon||"❓",q,R),D.shortLabel&&(k.font=u,k.fillStyle=b,k.fillText(D.shortLabel,q,R+s-2))}k.restore()}};function So(e,t){if(!e)return;e.layout||(e.layout={}),e.layout.padding||(e.layout.padding={});const i=e.layout.padding,r=12;i.top=i.top??12,i.bottom=Math.max(i.bottom||0,r)}var _h=Object.defineProperty,$h=Object.getOwnPropertyDescriptor,Si=(e,t,i,r)=>{for(var n=r>1?void 0:r?$h(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&_h(t,i,n),n};const ct=Q;wn.register(jo,Ro,tl,il,Ho,Wo,rl,Vo,nl,al,Ko,qo,ol,sl,Go,wh);function kh(e){const t=e.timeline.map(i=>i.spot_price_czk??0);return{label:"📊 Spot",data:t,borderColor:"#2196F3",backgroundColor:"rgba(33, 150, 243, 0.15)",borderWidth:3,fill:!1,tension:.4,type:"line",yAxisID:"y-price",pointRadius:t.map(()=>0),pointHoverRadius:7,pointBackgroundColor:t.map(()=>"#42a5f5"),pointBorderColor:t.map(()=>"#42a5f5"),pointBorderWidth:2,order:1,datalabels:{display:!1}}}function Sh(e){return{label:"💰 Výkup",data:e.timeline.map(t=>t.export_price_czk??0),borderColor:"#4CAF50",backgroundColor:"rgba(76, 187, 106, 0.15)",borderWidth:2,fill:!1,type:"line",tension:.4,yAxisID:"y-price",pointRadius:0,pointHoverRadius:5,order:1,borderDash:[5,5]}}function Ch(e){if(!e.solar)return[];const{string1:t,string2:i,hasString1:r,hasString2:n}=e.solar,a=(r?1:0)+(n?1:0),o={string1:{border:"rgba(255, 193, 7, 0.8)",bg:"rgba(255, 193, 7, 0.2)"},string2:{border:"rgba(255, 152, 0, 0.8)",bg:"rgba(255, 152, 0, 0.2)"}};if(a===1){const s=r?t:i,d=r?o.string1:o.string2;return[{label:"☀️ FVE předpověď",data:s,borderColor:d.border,backgroundColor:d.bg,borderWidth:2,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",pointRadius:0,pointHoverRadius:5,order:2}]}return a===2?[{label:"☀️ String 2",data:i,borderColor:o.string2.border,backgroundColor:o.string2.bg,borderWidth:1.5,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2},{label:"☀️ String 1",data:t,borderColor:o.string1.border,backgroundColor:o.string1.bg,borderWidth:1.5,fill:"-1",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2}]:[]}function Th(e){if(!e.battery)return[];const{baseline:t,solarCharge:i,gridCharge:r,gridNet:n,consumption:a}=e.battery,o=[],s={baseline:{border:"#78909C",bg:"rgba(120, 144, 156, 0.25)"},solar:{border:"transparent",bg:"rgba(255, 167, 38, 0.6)"},grid:{border:"transparent",bg:"rgba(33, 150, 243, 0.6)"}};return a.some(d=>d!=null&&d>0)&&o.push({label:"🏠 Spotřeba",data:a,borderColor:"rgba(255, 112, 67, 0.7)",backgroundColor:"rgba(255, 112, 67, 0.12)",borderWidth:1.5,type:"line",fill:!1,tension:.25,pointRadius:0,pointHoverRadius:5,yAxisID:"y-power",stack:"consumption",borderDash:[6,4],order:2}),r.some(d=>d!=null&&d>0)&&o.push({label:"⚡ Síť → baterie",data:r,backgroundColor:s.grid.bg,borderColor:s.grid.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),i.some(d=>d!=null&&d>0)&&o.push({label:"☀️ FVE → baterie",data:i,backgroundColor:s.solar.bg,borderColor:s.solar.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),o.push({label:"🔋 Kapacita",data:t,backgroundColor:s.baseline.bg,borderColor:s.baseline.border,borderWidth:3,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),n.some(d=>d!==null)&&o.push({label:"📡 Netto síť",data:n,borderColor:"#00BCD4",backgroundColor:"transparent",borderWidth:2,type:"line",fill:!1,tension:.2,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",order:2}),o}function Co(e){const t=[];return e.prices.length>0&&t.push(kh(e)),e.exportPrices.length>0&&t.push(Sh(e)),t.push(...Ch(e)),t.push(...Th(e)),t}function qr(e,t,i=""){if(e==null)return"";const r=i?` ${i}`:"";return`${e.toFixed(t)}${r}`}function ri(e){var n;const t=(n=e.scales)==null?void 0:n.x;if(!t)return"overview";const r=(t.max-t.min)/(1e3*60*60);return r<=6?"detail":r<=24?"day":"overview"}function Mt(e,t){var h,b,f,m,y,S,v,$,T,W,F;if(!((h=e==null?void 0:e.scales)!=null&&h.x))return;const i=e.scales.x,n=(i.max-i.min)/(1e3*60*60),a=ri(e),o=(f=(b=e.options.plugins)==null?void 0:b.legend)==null?void 0:f.labels;o&&(o.padding=10,o.font&&(o.font.size=11),a==="detail"&&(o.padding=12,o.font&&(o.font.size=12)));const s=window.innerWidth<520,d=["y-price","y-solar","y-power"];for(const R of d){const k=(m=e.options.scales)==null?void 0:m[R];if(k){if(R==="y-solar"&&s){k.display=!1;continue}a==="overview"?(k.title&&(k.title.display=!1),(y=k.ticks)!=null&&y.font&&(k.ticks.font.size=10),R==="y-solar"&&(k.display=!1)):a==="detail"?(k.title&&(k.title.display=!0,k.title.font&&(k.title.font.size=12)),(S=k.ticks)!=null&&S.font&&(k.ticks.font.size=11),k.display=!0):(k.title&&(k.title.display=!0,k.title.font&&(k.title.font.size=11)),(v=k.ticks)!=null&&v.font&&(k.ticks.font.size=10),k.display=!0)}}const p=($=e.options.scales)==null?void 0:$.x;p&&(a==="overview"?p.ticks&&(p.ticks.maxTicksLimit=12,p.ticks.font&&(p.ticks.font.size=10)):a==="detail"?(p.ticks&&(p.ticks.maxTicksLimit=24,p.ticks.font&&(p.ticks.font.size=11)),p.time&&(p.time.displayFormats.hour="HH:mm")):(p.ticks&&(p.ticks.maxTicksLimit=16,p.ticks.font&&(p.ticks.font.size=10)),p.time&&(p.time.displayFormats.hour=s?"HH:mm":"dd.MM HH:mm")));const u=t==="always"||t==="auto"&&n<=6;for(const R of e.data.datasets){const k=R;if(k.datalabels||(k.datalabels={}),t==="never"){k.datalabels.display=!1;continue}if(u){let A=1;n>3&&n<=6?A=2:n>6&&(A=4),k.datalabels.display=B=>{const H=B.dataset.data[B.dataIndex];return H==null||H===0?!1:B.dataIndex%A===0};const D=k.yAxisID==="y-price",K=((T=k.label)==null?void 0:T.includes("Solární"))||((W=k.label)==null?void 0:W.includes("String")),q=(F=k.label)==null?void 0:F.includes("kapacita");k.datalabels.align="top",k.datalabels.offset=6,k.datalabels.color="#fff",k.datalabels.font={size:9,weight:"bold"},D?(k.datalabels.formatter=B=>qr(B,2,"Kč"),k.datalabels.backgroundColor=k.borderColor||"rgba(33, 150, 243, 0.8)"):K?(k.datalabels.formatter=B=>qr(B,1,"kW"),k.datalabels.backgroundColor=k.borderColor||"rgba(255, 193, 7, 0.8)"):q?(k.datalabels.formatter=B=>qr(B,1,"kWh"),k.datalabels.backgroundColor=k.borderColor||"rgba(120, 144, 156, 0.8)"):(k.datalabels.formatter=B=>qr(B,1),k.datalabels.backgroundColor=k.borderColor||"rgba(33, 150, 243, 0.8)"),k.datalabels.borderRadius=4,k.datalabels.padding={top:3,bottom:3,left:5,right:5}}else k.datalabels.display=!1}e.update("none"),P.debug(`[PricingChart] Detail: ${n.toFixed(1)}h, Labels: ${u?"ON":"OFF"}, Mode: ${t}`)}let ut=class extends E{constructor(){super(...arguments),this.data=null,this.datalabelMode="auto",this.zoomState={start:null,end:null},this.currentDetailLevel="overview",this.chart=null,this.resizeObserver=null}firstUpdated(){this.setupResizeObserver(),this.data&&this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())}updated(e){e.has("data")&&this.data&&(this.chart?this.updateChartData():this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())),e.has("datalabelMode")&&this.chart&&Mt(this.chart,this.datalabelMode)}disconnectedCallback(){var e;super.disconnectedCallback(),this.destroyChart(),(e=this.resizeObserver)==null||e.disconnect(),this.resizeObserver=null}zoomToTimeRange(e,t){if(!this.chart){P.warn("[PricingChart] Chart not available for zoom");return}const i=new Date(e),r=new Date(t),n=15*60*1e3,a=i.getTime()-n,o=r.getTime()+n;if(this.zoomState.start!==null&&Math.abs(this.zoomState.start-a)<6e4&&this.zoomState.end!==null&&Math.abs(this.zoomState.end-o)<6e4){P.debug("[PricingChart] Already zoomed to same range → reset"),this.resetZoom();return}try{const s=this.chart.options;s.scales.x.min=a,s.scales.x.max=o,this.chart.update("none"),this.zoomState={start:a,end:o},this.currentDetailLevel=ri(this.chart),Mt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-change",{detail:{start:a,end:o,level:this.currentDetailLevel},bubbles:!0,composed:!0})),P.debug("[PricingChart] Zoomed to range",{start:new Date(a).toISOString(),end:new Date(o).toISOString()})}catch(s){P.error("[PricingChart] Zoom error",s)}}resetZoom(){if(!this.chart)return;const e=this.chart.options;delete e.scales.x.min,delete e.scales.x.max,this.chart.update("none"),this.zoomState={start:null,end:null},this.currentDetailLevel=ri(this.chart),Mt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-reset",{bubbles:!0,composed:!0}))}getChart(){return this.chart}createChart(){if(!this.canvas||!this.data||this.data.timeline.length===0)return;this.chart&&this.destroyChart();const e=this.data,t=Co(e),i=window.innerWidth<520,r={responsive:!0,maintainAspectRatio:!1,animation:{duration:0},interaction:{mode:"index",intersect:!1},plugins:{legend:{labels:{color:"#ffffff",font:{size:i?10:11,weight:"500"},padding:i?6:10,usePointStyle:!0,pointStyle:"circle",boxWidth:i?8:12,boxHeight:i?8:12},position:"top"},tooltip:{backgroundColor:"rgba(0,0,0,0.9)",titleColor:"#ffffff",bodyColor:"#ffffff",titleFont:{size:13,weight:"bold"},bodyFont:{size:11},padding:10,cornerRadius:6,displayColors:!0,callbacks:{title:a=>a.length>0?new Date(a[0].parsed.x).toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"",label:a=>{let o=a.dataset.label||"";return o&&(o+=": "),a.parsed.y!==null&&(a.dataset.yAxisID==="y-price"?o+=a.parsed.y.toFixed(2)+" Kč/kWh":a.dataset.yAxisID==="y-solar"?o+=a.parsed.y.toFixed(2)+" kWh":a.dataset.yAxisID==="y-power"?o+=a.parsed.y.toFixed(2)+" kW":o+=a.parsed.y),o}}},datalabels:{display:!1},zoom:{zoom:{wheel:{enabled:!0,modifierKey:null},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)",borderColor:"rgba(33, 150, 243, 0.8)",borderWidth:2},pinch:{enabled:!0},mode:"x",onZoomComplete:({chart:a})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=ri(a),Mt(a,this.datalabelMode)}},pan:{enabled:!0,mode:"x",modifierKey:"shift",onPanComplete:({chart:a})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=ri(a),Mt(a,this.datalabelMode)}},limits:{x:{minRange:36e5}}},pricingModeIcons:null},scales:{x:{type:"timeseries",time:{unit:"hour",displayFormats:{hour:i?"HH:mm":"dd.MM HH:mm"},tooltipFormat:"dd.MM.yyyy HH:mm"},ticks:{color:this.getTextColor(),maxRotation:i?0:45,minRotation:i?0:45,font:{size:i?10:11},maxTicksLimit:i?6:20},grid:{color:this.getGridColor(),lineWidth:1}},"y-price":{type:"linear",position:"left",ticks:{color:"#2196F3",font:{size:11,weight:"500"},callback:a=>a.toFixed(2)+" Kč"},grid:{color:"rgba(33, 150, 243, 0.15)",lineWidth:1},title:{display:!i,text:"💰 Cena (Kč/kWh)",color:"#2196F3",font:{size:13,weight:"bold"}}},"y-solar":{type:"linear",position:"left",stacked:!0,display:!i,ticks:{color:"#78909C",font:{size:11,weight:"500"},callback:a=>a.toFixed(1)+" kWh",display:!0},grid:{display:!0,color:"rgba(120, 144, 156, 0.15)",lineWidth:1,drawOnChartArea:!0},title:{display:!0,text:"🔋 Kapacita baterie (kWh)",color:"#78909C",font:{size:11,weight:"bold"}},beginAtZero:!1},"y-power":{type:"linear",position:"right",stacked:!0,ticks:{color:"#FFA726",font:{size:11,weight:"500"},callback:a=>a.toFixed(2)+" kW"},grid:{display:!1},title:{display:!i,text:"☀️ Výkon (kW)",color:"#FFA726",font:{size:13,weight:"bold"}}}}};So(r);const n={type:"bar",data:{labels:e.labels,datasets:t},plugins:[Go],options:r};try{this.chart=new wn(this.canvas,n),Mt(this.chart,this.datalabelMode),e.initialZoomStart&&e.initialZoomEnd&&requestAnimationFrame(()=>{if(!this.chart)return;const a=this.chart.options;a.scales.x.min=e.initialZoomStart,a.scales.x.max=e.initialZoomEnd,this.chart.update("none"),this.currentDetailLevel=ri(this.chart),Mt(this.chart,this.datalabelMode)}),P.info("[PricingChart] Chart created",{datasets:t.length,labels:e.labels.length,segments:e.modeSegments.length})}catch(a){P.error("[PricingChart] Failed to create chart",a)}}updateChartData(){var o;if(!this.chart||!this.data)return;const e=this.data,t=Co(e),i=((o=this.chart.data.labels)==null?void 0:o.length)!==e.labels.length,r=this.chart.data.datasets.length!==t.length;i&&(this.chart.data.labels=e.labels);let n="none";r?(this.chart.data.datasets=t,n=void 0):t.forEach((s,d)=>{const p=this.chart.data.datasets[d];p&&(p.data=s.data,p.label=s.label,p.backgroundColor=s.backgroundColor,p.borderColor=s.borderColor)});const a=this.chart.options;a.plugins||(a.plugins={}),a.plugins.pricingModeIcons=null,So(a),this.chart.update(n),P.debug("[PricingChart] Chart updated incrementally")}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(()=>{var e;(e=this.chart)==null||e.resize()}),this.resizeObserver.observe(this)}getTextColor(){try{return getComputedStyle(this).getPropertyValue("--oig-text-primary").trim()||"#e0e0e0"}catch{return"#e0e0e0"}}getGridColor(){try{return getComputedStyle(this).getPropertyValue("--oig-border").trim()||"rgba(255,255,255,0.1)"}catch{return"rgba(255,255,255,0.1)"}}setDatalabelMode(e){this.datalabelMode=e,this.dispatchEvent(new CustomEvent("datalabel-mode-change",{detail:{mode:e},bubbles:!0,composed:!0}))}get isZoomed(){return this.zoomState.start!==null||this.zoomState.end!==null}renderControls(){const e=t=>{const i=this.datalabelMode===t?"active":"";return t==="always"&&this.datalabelMode==="always"?`control-btn mode-always ${i}`:t==="never"&&this.datalabelMode==="never"?`control-btn mode-never ${i}`:`control-btn ${i}`};return c`
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
    `}};ut.styles=z`
    :host {
      display: block;
      background: ${ct(l.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${ct(l.cardShadow)};
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
      color: ${ct(l.textPrimary)};
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
      color: ${ct(l.textSecondary)};
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .control-btn:hover {
      background: ${ct(l.accent)};
      color: #fff;
    }

    .control-btn.active {
      background: ${ct(l.accent)};
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
      color: ${ct(l.textSecondary)};
      font-size: 14px;
    }

    .chart-hint {
      font-size: 10px;
      color: ${ct(l.textSecondary)};
      opacity: 0.7;
      margin-top: 6px;
      text-align: center;
    }
  `;Si([g({type:Object})],ut.prototype,"data",2);Si([g({type:String})],ut.prototype,"datalabelMode",2);Si([M()],ut.prototype,"zoomState",2);Si([M()],ut.prototype,"currentDetailLevel",2);Si([_n("#pricing-canvas")],ut.prototype,"canvas",2);ut=Si([O("oig-pricing-chart")],ut);const Ci="—";function bi(e){return e==null||!Number.isFinite(e)?Ci:`${e.toFixed(1)} °C`}function Is(e){return e==null||!Number.isFinite(e)?Ci:`${e.toFixed(2)} kWh`}function Ph(e){return e==null||!Number.isFinite(e)?Ci:`${e.toFixed(2)} Kč`}function Mh(e){return e==null||!Number.isFinite(e)?Ci:`${Math.round(e*100)} %`}function Dh(e,t){const i=r=>{const n=new Date(r);return Number.isNaN(n.getTime())?r:`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`};return`${i(e)} – ${i(t)}`}function zh(e){return e==null||!Number.isFinite(e)?Ci:e<60?`${Math.round(e)} s`:e<3600?`${Math.round(e/60)} min`:`${Math.round(e/3600)} h`}function Eh(e){if(e==null||!Number.isFinite(e)||e<0)return Ci;const t=Math.floor(e/60),i=Math.round(e%60);return t===0?`${i} min`:i===0?`${t} h`:`${t} h ${i} min`}function Oh(e){const t=e.topTempC;if(t==null||!Number.isFinite(t))return null;if(e.targetTempC<=t)return 0;const i=e.targetTempC-t;return e.temperatureTrendCPerMin!=null&&Number.isFinite(e.temperatureTrendCPerMin)&&e.temperatureTrendCPerMin>0?i/e.temperatureTrendCPerMin:e.heaterPowerKw!==null&&Number.isFinite(e.heaterPowerKw)&&e.volumeL!=null&&Number.isFinite(e.volumeL)?e.heaterPowerKw===0?null:e.volumeL*.001163*i/e.heaterPowerKw*60:null}var Lh=Object.defineProperty,Ah=Object.getOwnPropertyDescriptor,N=(e,t,i,r)=>{for(var n=r>1?void 0:r?Ah(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Lh(t,i,n),n};const I=Q,vt=z`
  background: ${I(l.cardBg)};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${I(l.cardShadow)};
`,nt=z`
  font-size: 15px;
  font-weight: 600;
  color: ${I(l.textPrimary)};
  margin: 0 0 12px 0;
`;function Fh(e){return Math.max(0,Math.min(100,e))}function To(e){const r=Math.max(0,Math.min(1,(e-10)/60)),n={r:33,g:150,b:243},a={r:255,g:87,b:34},o=(s,d)=>Math.round(s+(d-s)*r);return`rgb(${o(n.r,a.r)}, ${o(n.g,a.g)}, ${o(n.b,a.b)})`}let nr=class extends E{constructor(){super(...arguments),this.collapsed=!0,this.busy=!1}toggle(){this.collapsed=!this.collapsed}async doAction(e,t){this.busy=!0;try{const i=await e();this.dispatchEvent(new CustomEvent("action-done",{detail:{success:i,label:t},bubbles:!0,composed:!0}))}finally{this.busy=!1}}render(){return c`
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
              @click=${()=>this.doAction(Sc,"plan")}>
              Preplanovat (debug)
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(Cc,"apply")}>
              Aplikovat rucne
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(Tc,"cancel")}>
              Zrusit plan
            </button>
          </div>
        </div>
      </div>
    `}};nr.styles=z`
    :host { display: block; }

    .panel {
      ${vt};
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
      color: ${I(l.textPrimary)};
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
      color: ${I(l.textSecondary)};
    }

    .info-bubble .tooltip {
      display: none;
      position: absolute;
      left: 0;
      top: 24px;
      width: 280px;
      padding: 10px;
      background: ${I(l.cardBg)};
      border: 1px solid ${I(l.divider)};
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      font-size: 11px;
      line-height: 1.5;
      color: ${I(l.textSecondary)};
      z-index: 100;
      white-space: normal;
    }

    .info-bubble:hover .tooltip { display: block; }

    .toggle-icon {
      font-size: 18px;
      font-weight: bold;
      color: ${I(l.textSecondary)};
      transition: transform 0.2s;
    }

    .panel-content {
      display: none;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid ${I(l.divider)};
    }

    .panel-content.open { display: block; }

    .section-label {
      font-size: 12px;
      font-weight: 600;
      color: ${I(l.textSecondary)};
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
      border: 1px solid ${I(l.divider)};
      border-radius: 8px;
      background: ${I(l.bgSecondary)};
      color: ${I(l.textPrimary)};
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      white-space: nowrap;
    }

    .action-btn:hover { background: ${I(l.divider)}; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `;N([M()],nr.prototype,"collapsed",2);N([M()],nr.prototype,"busy",2);nr=N([O("oig-boiler-debug-panel")],nr);let on=class extends E{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return c`<div>Nacitani stavu...</div>`;const t=(i,r,n=1)=>i!=null?`${i.toFixed(n)} ${r}`:`-- ${r}`;return c`
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
    `}};on.styles=z`
    :host { display: block; }

    h3 { ${nt}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .card {
      ${vt};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${I(l.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 18px;
      font-weight: 600;
      color: ${I(l.textPrimary)};
    }

    .card-value.small {
      font-size: 13px;
      font-weight: 500;
    }
  `;N([g({type:Object})],on.prototype,"data",2);on=N([O("oig-boiler-status-grid")],on);let sn=class extends E{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return w;const t=i=>`${i.toFixed(2)} kWh`;return c`
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
    `}};sn.styles=z`
    :host { display: block; }

    h3 { ${nt}; }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .card {
      ${vt};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${I(l.textSecondary)};
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
      background: ${I(l.bgSecondary)};
    }

    .ratio-fve { background: #4CAF50; }
    .ratio-grid { background: #FF9800; }
    .ratio-alt { background: #2196F3; }

    .ratio-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 11px;
      color: ${I(l.textSecondary)};
    }
  `;N([g({type:Object})],sn.prototype,"data",2);sn=N([O("oig-boiler-energy-breakdown")],sn);let ln=class extends E{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return w;const t=e.peakHours.length?e.peakHours.map(n=>`${n}h`).join(", "):"--",i=e.waterLiters40c!==null?`${e.waterLiters40c.toFixed(0)} L`:"-- L",r=e.circulationNow.startsWith("ANO");return c`
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
    `}};ln.styles=z`
    :host { display: block; }

    h3 { ${nt}; }

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
      border-bottom: 1px solid ${I(l.divider)};
      font-size: 13px;
    }

    .item:last-child { border-bottom: none; }

    .label { color: ${I(l.textSecondary)}; }

    .value {
      font-weight: 600;
      color: ${I(l.textPrimary)};
    }

    .value.active { color: #4CAF50; }
    .value.idle { color: ${I(l.textSecondary)}; }
  `;N([g({type:Object})],ln.prototype,"data",2);ln=N([O("oig-boiler-predicted-usage")],ln);let ar=class extends E{constructor(){super(...arguments),this.plan=null,this.forecastWindows={fve:"--",grid:"--"}}render(){var r;const e=this.plan,t=this.forecastWindows,i=n=>n??"--";return c`
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
    `}};ar.styles=z`
    :host { display: block; }

    h3 { ${nt}; }

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
      border-bottom: 1px solid ${I(l.divider)};
      font-size: 13px;
    }

    .row:last-child { border-bottom: none; }

    .row-label { color: ${I(l.textSecondary)}; }
    .row-value {
      font-weight: 500;
      color: ${I(l.textPrimary)};
      text-align: right;
      max-width: 60%;
      word-break: break-word;
    }
  `;N([g({type:Object})],ar.prototype,"plan",2);N([g({type:Object})],ar.prototype,"forecastWindows",2);ar=N([O("oig-boiler-plan-info")],ar);let or=class extends E{constructor(){super(...arguments),this.boilerState=null,this.targetTemp=60}render(){const e=this.boilerState;if(!e)return c`<div>Nacitani...</div>`;const t=10,i=70,r=f=>Fh((f-t)/(i-t)*100),n=e.heatingPercent??0,a=e.tempTop!==null?r(e.tempTop):null,o=e.tempBottom!==null?r(e.tempBottom):null,s=r(this.targetTemp),d=To(e.tempTop??this.targetTemp),p=To(e.tempBottom??10),u=`linear-gradient(180deg, ${d} 0%, ${p} 100%)`,h=e.heatingPercent!==null?`${e.heatingPercent.toFixed(0)}% nahrato`:"-- % nahrato";return c`
      <h3>Vizualizace bojleru</h3>

      <div class="tank-wrapper">
        <div class="temp-scale">
          ${[70,60,50,40,30,20,10].map(f=>c`<span>${f}°C</span>`)}
        </div>

        <div class="tank">
          <div class="water" style="height:${n}%; background:${u}"></div>

          <div class="target-line" style="bottom:${s}%">
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
    `}};or.styles=z`
    :host { display: block; }

    h3 { ${nt}; }

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
      color: ${I(l.textSecondary)};
      text-align: right;
      padding: 2px 0;
    }

    /* Tank body */
    .tank {
      flex: 1;
      position: relative;
      border: 2px solid ${I(l.divider)};
      border-radius: 12px;
      overflow: hidden;
      background: ${I(l.bgSecondary)};
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
      border-top: 2px dashed ${I(l.accent)};
      z-index: 3;
    }

    .target-label {
      position: absolute;
      right: 4px;
      top: -14px;
      font-size: 9px;
      color: ${I(l.accent)};
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
      color: ${I(l.textPrimary)};
    }
  `;N([g({type:Object})],or.prototype,"boilerState",2);N([g({type:Number})],or.prototype,"targetTemp",2);or=N([O("oig-boiler-tank")],or);let sr=class extends E{constructor(){super(...arguments),this.current="",this.available=[]}onChange(e){const t=e.target.value;this.dispatchEvent(new CustomEvent("category-change",{detail:{category:t},bubbles:!0,composed:!0}))}render(){const e=this.available.length?this.available:Object.keys(pa);return c`
      <div class="row">
        <label>Profil:</label>
        <select @change=${this.onChange}>
          ${e.map(t=>c`
            <option value=${t} ?selected=${t===this.current}>
              ${pa[t]||t}
            </option>
          `)}
        </select>
      </div>
    `}};sr.styles=z`
    :host { display: block; margin: 12px 0; }

    .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    label {
      font-size: 13px;
      font-weight: 600;
      color: ${I(l.textPrimary)};
    }

    select {
      padding: 6px 10px;
      font-size: 13px;
      border: 1px solid ${I(l.divider)};
      border-radius: 6px;
      background: ${I(l.cardBg)};
      color: ${I(l.textPrimary)};
      cursor: pointer;
    }
  `;N([g({type:String})],sr.prototype,"current",2);N([g({type:Array})],sr.prototype,"available",2);sr=N([O("oig-boiler-category-select")],sr);let cn=class extends E{constructor(){super(...arguments),this.data=[]}render(){if(!this.data.length)return w;const e=this.data.flatMap(o=>o.hours),t=Math.max(...e,.1),i=t*.3,r=t*.7,n=Array.from({length:24},(o,s)=>s),a=o=>o===0?"none":o<i?"low":o<r?"medium":"high";return c`
      <h3>Mapa spotreby (7 dni)</h3>
      <div class="wrapper">
        <div class="grid">
          <!-- Header row -->
          <div></div>
          ${n.map(o=>c`<div class="hour-header">${o}</div>`)}

          <!-- Day rows -->
          ${this.data.map(o=>c`
            <div class="day-label">${o.day}</div>
            ${o.hours.map((s,d)=>c`
              <div class="cell ${a(s)}"
                   title="${o.day} ${d}h: ${s.toFixed(2)} kWh"></div>
            `)}
          `)}
        </div>

        <div class="legend">
          <span class="legend-item"><span class="legend-dot" style="background:#c8e6c9"></span> Nizka</span>
          <span class="legend-item"><span class="legend-dot" style="background:#ff9800"></span> Stredni</span>
          <span class="legend-item"><span class="legend-dot" style="background:#f44336"></span> Vysoka</span>
        </div>
      </div>
    `}};cn.styles=z`
    :host { display: block; }

    h3 { ${nt}; }

    .wrapper {
      ${vt};
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
      color: ${I(l.textSecondary)};
      text-align: center;
      padding: 2px 0;
    }

    .day-label {
      font-size: 10px;
      font-weight: 600;
      color: ${I(l.textSecondary)};
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

    .cell.none   { background: ${I(l.bgSecondary)}; }
    .cell.low    { background: #c8e6c9; }
    .cell.medium { background: #ff9800; }
    .cell.high   { background: #f44336; }

    .legend {
      display: flex;
      gap: 14px;
      margin-top: 10px;
      font-size: 11px;
      color: ${I(l.textSecondary)};
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
  `;N([g({type:Array})],cn.prototype,"data",2);cn=N([O("oig-boiler-heatmap-grid")],cn);let dn=class extends E{constructor(){super(...arguments),this.plan=null}render(){const e=this.plan,t=(i,r=2)=>i!=null?i.toFixed(r):"-";return c`
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
    `}};dn.styles=z`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .card {
      ${vt};
      padding: 14px;
    }

    .card-title {
      font-size: 12px;
      color: ${I(l.textSecondary)};
      margin-bottom: 6px;
    }

    .card-value {
      font-size: 22px;
      font-weight: 700;
    }

    .total { color: ${I(l.textPrimary)}; }
    .fve { color: #4CAF50; }
    .grid-c { color: #FF9800; }
    .cost { color: #2196F3; }
  `;N([g({type:Object})],dn.prototype,"plan",2);dn=N([O("oig-boiler-stats-cards")],dn);let pn=class extends E{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return w;const t=Math.max(...e.hourlyAvg,.01),i=new Set(e.peakHours),r=e.peakHours.length?e.peakHours.map(a=>`${a}h`).join(", "):"--",n=e.confidence!==null?`${Math.round(e.confidence*100)} %`:"-- %";return c`
      <h3>Profil spotreby (tyden)</h3>
      <div class="wrapper">
        <div class="chart">
          ${e.hourlyAvg.map((a,o)=>{const s=t>0?a/t*100:0,d=i.has(o);return c`
              <div class="bar-col" title="${o}h: ${a.toFixed(3)} kWh">
                <div class="bar ${d?"peak":"normal"}"
                     style="height:${s}%"></div>
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
    `}};pn.styles=z`
    :host { display: block; }

    h3 { ${nt}; }

    .wrapper {
      ${vt};
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
      color: ${I(l.textSecondary)};
      margin-top: 3px;
    }

    /* Stats row */
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid ${I(l.divider)};
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .stat-label { color: ${I(l.textSecondary)}; }
    .stat-value { font-weight: 600; color: ${I(l.textPrimary)}; }
  `;N([g({type:Object})],pn.prototype,"data",2);pn=N([O("oig-boiler-profiling")],pn);let un=class extends E{constructor(){super(...arguments),this.config=null}render(){const e=this.config;if(!e)return w;const t=(i,r="")=>i!=null?`${i}${r?" "+r:""}`:`--${r?" "+r:""}`;return c`
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
    `}};un.styles=z`
    :host { display: block; }

    h3 { ${nt}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .card {
      ${vt};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${I(l.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 600;
      color: ${I(l.textPrimary)};
    }
  `;N([g({type:Object})],un.prototype,"config",2);un=N([O("oig-boiler-config-section")],un);function Po(e,t){const i=e*t,r=Math.floor(i/60)%24,n=i%60;return`${String(r).padStart(2,"0")}:${String(n).padStart(2,"0")}`}function Ih(e){switch(e){case"morning":return"🌅";case"afternoon":return"☀️";case"evening":return"🌆";case"night":return"🌙";default:return"💧"}}let lr=class extends E{constructor(){super(...arguments),this.data=null,this.lang="cs"}render(){const e=this.lang,t=x("boiler.demand_map.heading",e);if(!this.data)return c`
        <div class="card" data-testid="boiler-demand-map">
          <div class="heading">💧 ${t}</div>
          <div class="empty-state">${x("boiler.demand_map.empty",e)}</div>
        </div>
      `;const i=this.data,r=i.slotDurationMin||15,n=48,a=Math.ceil(i.slotsP80.length/n),o=[];for(let h=0;h<n;h++){let b=0,f=0;for(let m=0;m<a;m++){const y=h*a+m;b+=i.slotsP80[y]??0,f+=i.slotsP50[y]??0}o.push(b)}const s=Math.max(...o,.001),d=h=>{const b=Math.min(1,h/s);if(b<.08)return"rgba(255,255,255,.05)";const f=Math.round(120+135*b),m=Math.round(60+50*(1-b));return`rgba(${f}, ${m}, 60, ${(.12+.85*b).toFixed(2)})`},p=x("boiler.demand_map.meta",e).replace("{n}",String(i.profile.daysUsed)).replace("{cat}",pa[i.profile.category]||i.profile.label),u=`${x("boiler.demand_map.confidence",e)} ${Math.round(i.confidence*100)} %`;return c`
      <div class="card" data-testid="boiler-demand-map">
        <div class="heading">
          💧 ${t}
          <span class="meta-inline">${p} · ${u}${i.profile.fallbackUsed?c` · <span class="fallback-notice">${x("boiler.demand_map.fallback_notice",e)}</span>`:w}</span>
        </div>

        <div class="heatmap-wrap">
          <div class="heatmap">
            ${o.map((h,b)=>{const f=Po(b*a,r),m=h.toFixed(2);return c`
                <div class="heatmap-col" title="${f}: ${m} kWh">
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
            ${i.windows.slice(0,3).map(h=>{const b=Po(h.slotIndex,r),f=Ih(h.label),m=Math.round(h.liters),y=h.p80Kwh.toFixed(1);return c`
                <span class="chip">
                  ${f}
                  <span class="chip-time">${b}</span>
                  &ge; <b>${m} L</b> (${y} kWh)
                </span>
              `})}
          </div>
        `:w}
      </div>
    `}};lr.styles=z`
    :host { display: block; }

    .card {
      ${vt};
      padding: 16px;
    }

    .heading {
      ${nt};
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Empty / collecting state */
    .empty-state {
      text-align: center;
      padding: 24px 0;
      color: ${I(l.textSecondary)};
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
      color: ${I(l.textSecondary)};
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
      color: ${I(l.textPrimary)};
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }

    .chip-time {
      font-weight: 700;
      color: ${I(l.accent)};
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
      color: ${I(l.textSecondary)};
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
  `;N([g({attribute:!1})],lr.prototype,"data",2);N([g({type:String})],lr.prototype,"lang",2);lr=N([O("oig-boiler-demand-map")],lr);let hn=class extends E{constructor(){super(...arguments),this.state=null}render(){return this.state?c`
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
    `:c`<div>Nacitani...</div>`}};hn.styles=z`
    :host {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: ${I(l.cardBg)};
      border-radius: 12px;
      box-shadow: ${I(l.cardShadow)};
    }

    .temp-display { text-align: center; }

    .current-temp {
      font-size: 36px;
      font-weight: 600;
      color: ${I(l.textPrimary)};
    }

    .target-temp {
      font-size: 14px;
      color: ${I(l.textSecondary)};
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
      color: ${I(l.textSecondary)};
    }
  `;N([g({type:Object})],hn.prototype,"state",2);hn=N([O("oig-boiler-state")],hn);let gn=class extends E{constructor(){super(...arguments),this.data=[]}render(){return w}};gn.styles=z`
    :host { display: block; }
  `;N([g({type:Array})],gn.prototype,"data",2);gn=N([O("oig-boiler-heatmap")],gn);let cr=class extends E{constructor(){super(...arguments),this.profiles=[],this.editMode=!1}render(){return w}};cr.styles=z`
    :host { display: block; }
  `;N([g({type:Array})],cr.prototype,"profiles",2);N([g({type:Boolean})],cr.prototype,"editMode",2);cr=N([O("oig-boiler-profiles")],cr);let dr=class extends E{constructor(){super(...arguments),this.data=null,this.lang="cs"}render(){const e=this.data,t=this.lang,i=(e==null?void 0:e.currentState)??"unknown",r=x(`boiler.status.${i}`,t),n=(e==null?void 0:e.comfortSatisfied)===!0?x("boiler.status.comfort_satisfied",t):(e==null?void 0:e.comfortSatisfied)===!1?x("boiler.status.comfort_unsatisfied",t):x("boiler.status.comfort_unknown",t),a=(e==null?void 0:e.comfortSatisfied)===!0?"ok":(e==null?void 0:e.comfortSatisfied)===!1?"bad":"unknown",o=(e==null?void 0:e.degradedFlags)??[];return c`
      <div data-testid="boiler-status-panel" class="panel">
        <div class="row">
          <div class="heading">${x("boiler.status.heading",t)}</div>
          <span data-testid="boiler-status-current-state" class="pill ${i}">${r}</span>
        </div>
        <div class="degraded-banner" ?hidden=${!(e!=null&&e.degraded)}>${x("boiler.status.degraded",t)}</div>
        <div class="grid">
          <div class="field"><label>${x("boiler.status.temp_top",t)}</label><span>${bi((e==null?void 0:e.temperatureTop)??null)}</span></div>
          <div class="field"><label>${x("boiler.status.temp_bottom",t)}</label><span>${bi((e==null?void 0:e.temperatureBottom)??null)}</span></div>
          <div class="field"><label>${x("boiler.status.selected_source",t)}</label><span data-testid="boiler-status-selected-source">${di((e==null?void 0:e.selectedSource)??null,t)}</span></div>
          <div class="field"><label>${x("boiler.status.actuated_source",t)}</label><span data-testid="boiler-status-actuated-source">${di((e==null?void 0:e.actuatedSource)??null,t)}</span></div>
          <div class="field"><label>${x("boiler.status.energy_needed",t)}</label><span>${Is((e==null?void 0:e.energyNeededKwh)??null)}</span></div>
          <div class="field"><label>${x("boiler.status.last_update",t)}</label><span>${(e==null?void 0:e.lastUpdate)??"—"}</span></div>
        </div>
        <div data-testid="boiler-status-comfort" class="comfort ${a}">${n}</div>
        ${o.length?c`<div data-testid="boiler-status-degraded-flags" class="degraded-list">${o.map(s=>c`<span class="degraded-tag">${Zr(s,t)}</span>`)}</div>`:""}
      </div>
    `}};dr.styles=z`
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
  `;N([g({attribute:!1})],dr.prototype,"data",2);N([g({type:String})],dr.prototype,"lang",2);dr=N([O("oig-boiler-status-panel")],dr);let pr=class extends E{constructor(){super(...arguments),this.slots=[],this.lang="cs"}srcClass(e){return e&&["fve","grid","alternative","overflow","discharge"].includes(e)?e:"other"}render(){const e=this.lang;return!this.slots||this.slots.length===0?c`<div data-testid="boiler-plan-timeline" class="wrap"><div class="heading">${x("boiler.timeline.heading",e)}</div><div class="empty">${x("boiler.timeline.empty",e)}</div></div>`:c`
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
                  <td>${Dh(t.start,t.end)}</td>
                  <td><span class="src ${this.srcClass(t.recommendedSource)}">${di(t.recommendedSource,e)}</span></td>
                  <td>${bi(t.expectedTempTopC??null)} ${i}</td>
                  <td>${Is(t.consumptionKwh)}</td>
                  <td>${Ph(t.estimatedCostCzk??null)}</td>
                  <td>${Mh(t.pvShare??null)}</td>
                </tr>
              `})}
          </tbody>
        </table>
      </div>
    `}};pr.styles=z`
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
  `;N([g({attribute:!1})],pr.prototype,"slots",2);N([g({type:String})],pr.prototype,"lang",2);pr=N([O("oig-boiler-plan-timeline")],pr);const Mo=new Set(["input_stale_price","input_stale_pv","input_stale_temperature","input_missing_recorder","input_adapter_error"]);let ur=class extends E{constructor(){super(...arguments),this.explanation=null,this.lang="cs"}render(){const e=this.explanation,t=this.lang;if(!e)return c`<div data-testid="boiler-source-explanation" class="wrap"><div class="heading">${x("boiler.explanation.heading",t)}</div><div class="empty">${x("boiler.explanation.empty",t)}</div></div>`;const i=e.reasonCodes??[],r=i.filter(o=>Mo.has(o)),n=i.filter(o=>!Mo.has(o)),a=e.degradedReasons??[];return c`
      <div data-testid="boiler-source-explanation" class="wrap">
        <div class="heading">${x("boiler.explanation.heading",t)}</div>

        <div class="section" data-testid="boiler-explanation-freshness">
          <h4>${x("boiler.explanation.freshness_heading",t)}</h4>
          ${r.length===0?c`<div class="chips"><span class="chip fresh">${x("boiler.explanation.freshness_fresh",t)}</span></div>`:c`<div class="chips">${r.map(o=>c`<span class="chip stale">${Zr(o,t)}</span>`)}</div>`}
        </div>

        <div class="section" data-testid="boiler-explanation-degraded">
          <h4>${x("boiler.explanation.degraded_heading",t)}</h4>
          ${a.length===0?c`<div class="empty">—</div>`:c`<div class="chips">${a.map(o=>c`<span class="chip degraded">${Zr(o,t)}</span>`)}</div>`}
        </div>

        ${n.length?c`<div class="section" data-testid="boiler-explanation-reasons"><h4>Reason codes</h4><div class="chips">${n.map(o=>c`<span class="chip">${Zr(o,t)}</span>`)}</div></div>`:""}

        <div class="meta-grid" data-testid="boiler-explanation-meta">
          ${e.planCreatedAt?c`<div class="meta"><label>${x("boiler.explanation.plan_created",t)}</label><span>${e.planCreatedAt}</span></div>`:""}
          ${e.planValidUntil?c`<div class="meta"><label>${x("boiler.explanation.plan_valid_until",t)}</label><span>${e.planValidUntil}</span></div>`:""}
          ${e.dataAgeSecs!=null?c`<div class="meta"><label>${x("boiler.explanation.data_age",t)}</label><span>${zh(e.dataAgeSecs)}</span></div>`:""}
          ${e.unsatisfiedComfortGapC!=null?c`<div class="meta"><label>${x("boiler.explanation.unsatisfied_gap",t)}</label><span>${e.unsatisfiedComfortGapC} °C</span></div>`:""}
          ${e.temperatureAtDeadlineC!=null?c`<div class="meta"><label>${x("boiler.explanation.temp_at_deadline",t)}</label><span>${bi(e.temperatureAtDeadlineC)}</span></div>`:""}
        </div>
      </div>
    `}};ur.styles=z`
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
  `;N([g({attribute:!1})],ur.prototype,"explanation",2);N([g({type:String})],ur.prototype,"lang",2);ur=N([O("oig-boiler-source-explanation")],ur);let fi=class extends E{constructor(){super(...arguments),this.identity={entryId:null,boxId:null,available:!1},this.currentOverride=null,this.lang="cs"}render(){var a,o;const e=this.lang,t=this.identity.available,i=((a=this.currentOverride)==null?void 0:a.capabilityAvailable)??!1,r=t&&i,n=((o=this.currentOverride)==null?void 0:o.active)===!0;return c`
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
    `}};fi.styles=z`
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
  `;N([g({attribute:!1})],fi.prototype,"identity",2);N([g({attribute:!1})],fi.prototype,"currentOverride",2);N([g({type:String})],fi.prototype,"lang",2);fi=N([O("oig-boiler-override-panel")],fi);let mi=class extends E{constructor(){super(...arguments),this.reason="unavailable",this.message="",this.lang="cs"}render(){const e=this.lang,t=this.reason==="loading"?"⏳":this.reason==="error"?"⚠️":this.reason==="degraded"?"🟠":"ℹ️";return c`
      <div data-testid="boiler-unavailable-state" class="wrap">
        <span class="icon">${t}</span>
        <div class="headline loading-notice" ?hidden=${this.reason!=="loading"}>${x("boiler.unavailable.loading",e)}</div>
        <div class="headline error-notice" ?hidden=${this.reason!=="error"}>${x("boiler.unavailable.error",e)}</div>
        <div class="headline degraded-notice" ?hidden=${this.reason!=="degraded"}>${x("boiler.unavailable.degraded",e)}</div>
        <div class="headline unavailable-notice" ?hidden=${this.reason!=="unavailable"}>${x("boiler.unavailable.unavailable",e)}</div>
        ${this.message?c`<div class="message">${this.message}</div>`:""}
      </div>
    `}};mi.styles=z`
    :host { display: block; }
    .wrap { padding: 24px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; }
    .icon { font-size: 1.6rem; }
    .headline { font-size: 1rem; font-weight: 600; }
    .message { color: var(--secondary-text-color, #666); font-size: 0.9rem; }
  `;N([g({type:String})],mi.prototype,"reason",2);N([g({type:String})],mi.prototype,"message",2);N([g({type:String})],mi.prototype,"lang",2);mi=N([O("oig-boiler-unavailable-state")],mi);var Bh=Object.defineProperty,Nh=Object.getOwnPropertyDescriptor,$r=(e,t,i,r)=>{for(var n=r>1?void 0:r?Nh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Bh(t,i,n),n};const jh=Q;function bn(e,t){const i={gas:{cs:"🔥 Plyn",en:"🔥 Gas"},heat_pump:{cs:"🔥 Tepelné čerpadlo",en:"🔥 Heat pump"},fireplace:{cs:"🔥 Krb",en:"🔥 Fireplace"},other:{cs:"🔥 Alternativní zdroj",en:"🔥 Alternative source"}};return e&&i[e]?i[e][t]:t==="en"?"🔥 Alternative source":"🔥 Alternativní zdroj"}function Rh(e,t,i){const r=[];return r.push({key:"fve",label:x("boiler.energy_today.source_fve",t),kwh:e.fveKwh,color:"#ffa726",costLabel:e.fveKwh>0?"≈ 0 Kč":null}),r.push({key:"grid",label:x("boiler.energy_today.source_grid",t),kwh:e.gridKwh,color:"#2196f3",costLabel:null}),e.batteryKwh>.05&&r.push({key:"battery",label:x("boiler.energy_today.source_battery",t),kwh:e.batteryKwh,color:"#7e57c2",costLabel:null}),e.altKwh>0&&r.push({key:"alt",label:bn(i,t),kwh:e.altKwh,color:"#e64a19",costLabel:null}),r}function Hh(e,t){if(!e)return null;const{estimatedCostCzk:i,costIfAllGrid:r}=e;if(i==null||r==null||r<=0)return null;const n=r-i;return n<0?null:`${x("boiler.energy_today.benchmark_savings",t)} ${n.toFixed(1)} Kč`}function Wh(e){return`${e.toFixed(1).replace(".",",")} kWh`}let jt=class extends E{constructor(){super(...arguments),this.energy=null,this.planSummary=null,this.lang="cs",this.altType=null}render(){const e=this.lang,t=x("boiler.energy_today.heading",e),i=x("boiler.energy_today.meta",e),r=this.energy,n=this.planSummary,a=r?Rh(r,e,this.altType):[],o=(r==null?void 0:r.totalKwh)??0,s=o<.1,d=s?[]:a.filter(b=>b.kwh>0).map(b=>({pct:b.kwh/o*100,color:b.color,key:b.key})),p=(n==null?void 0:n.costIfAllGrid)??null,u=p!=null&&p>0?p:null,h=Hh(n,e);return c`
      <div class="card">
        <h2 class="card-header">
          ${t}
          <span class="card-header-meta">${i}</span>
        </h2>

        ${s?c`
          <div class="empty">${x("boiler.energy_today.empty",e)}</div>
        `:c`
          <div class="tiles" data-testid="energy-tiles">
            ${a.map(b=>c`
              <div class="tile" data-source="${b.key}" data-testid="energy-tile-${b.key}">
                <span class="tile-label">${b.label}</span>
                <b class="tile-kwh">${Wh(b.kwh)}</b>
                ${b.costLabel?c`<span class="tile-czk" style="color:#9fe6a8">${b.costLabel}</span>`:w}
              </div>
            `)}
          </div>
        `}

        ${d.length>0?c`
          <div class="prop-bar" data-testid="prop-bar">
            ${d.map(b=>c`
              <span
                style="width:${b.pct.toFixed(1)}%;background:${b.color}"
                data-source="${b.key}"
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
    `}};jt.styles=z`
    :host {
      display: block;
    }

    .card {
      background: ${jh(l.cardBg)};
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
  `;$r([g({type:Object})],jt.prototype,"energy",2);$r([g({type:Object})],jt.prototype,"planSummary",2);$r([g({type:String})],jt.prototype,"lang",2);$r([g({type:String})],jt.prototype,"altType",2);jt=$r([O("oig-boiler-energy-today")],jt);var Vh=Object.defineProperty,Kh=Object.getOwnPropertyDescriptor,xt=(e,t,i,r)=>{for(var n=r>1?void 0:r?Kh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Vh(t,i,n),n};const ei=Q,qh=new Set(["fve","grid","battery","alternative"]);function Gh(e){if(!e)return null;const t=e.toLowerCase();return t==="fve"||t==="overflow"||t==="pv"?"fve":t==="grid"?"grid":t==="battery"||t==="discharge"?"battery":t==="alternative"||t==="alt"?"alternative":null}function Tn(e){const t=new Date(e);return new Date(t.getFullYear(),t.getMonth(),t.getDate(),0,0,0,0).getTime()}function Ft(e,t){const i=Tn(t),r=new Date(e).getTime(),n=24*3600*1e3;return Math.max(0,Math.min(1,(r-i)/n))}function Uh(e,t){const i=[];let r=null;for(const n of e){const a=n.heatingKwh??0;if(a<=0){r&&(i.push(r),r=null);continue}const o=Gh(n.recommendedSource);if(!o||!qh.has(o)){r&&(i.push(r),r=null);continue}const s=n.purpose==="legionella";r&&r.source===o?(r.xEnd=Ft(n.end,t),r.endIso=n.end,r.heatingKwh+=a,s&&(r.hasLegionella=!0)):(r&&i.push(r),r={xStart:Ft(n.start,t),xEnd:Ft(n.end,t),source:o,hasLegionella:s,heatingKwh:a,startIso:n.start,endIso:n.end})}return r&&i.push(r),i}function Yh(e,t){const i=Date.now(),r=Tn(e),n=24*3600*1e3,a=(i-r)/n;return a<0||a>1?null:a}function Zh(e,t){if(!t||!t.includes(":"))return null;const[i,r]=t.split(":").map(Number);if(!Number.isFinite(i)||!Number.isFinite(r))return null;const n=Tn(e),a=new Date(n);a.setHours(i,r,0,0);let o=a.getTime();const s=24*3600*1e3,d=(o-n)/s;return d<0||d>1.0001?null:Math.min(1,d)}const ta={fve:{gradStart:"#ffd54f",gradEnd:"#ffa726",legendColor:"#ffa726",textColor:"#101a10"},grid:{gradStart:"#4fc3f7",gradEnd:"#2196f3",legendColor:"#2196f3",textColor:"#062033"},battery:{gradStart:"#b39ddb",gradEnd:"#7e57c2",legendColor:"#7e57c2",textColor:"#1c1430"},alternative:{gradStart:"#ff8a65",gradEnd:"#e64a19",legendColor:"#e64a19",textColor:"#2b0d05"}};let Ye=class extends E{constructor(){super(...arguments),this.slots=[],this.demandMap=null,this.circulationRuns=[],this.legionella=null,this.planSummary=null,this.lang="cs",this.altSourceType=null}render(){var m;const e=this.lang;if(!this.slots||this.slots.length===0)return c`
        <div class="card" data-testid="boiler-plan-strip">
          <div class="heading">
            🗓️ ${x("boiler.plan_strip.heading",e)}
            <span class="meta">${x("boiler.plan_strip.meta",e)}</span>
          </div>
          <div class="empty">${x("boiler.plan_strip.empty",e)}</div>
        </div>
      `;const t=this.slots[0].start,i=Uh(this.slots,t),r=this._buildDrawItems(t),n=this._buildTempCurve(t),a=Yh(t),o=((m=this.planSummary)==null?void 0:m.deadlineTime)??null,s=o?o.slice(0,5):null,d=s?Zh(t,o):null,p=this._legionellaStandaloneMarker(t,i),u=new Set(i.map(y=>y.source)),h=r.length>0,b=this.circulationRuns.length>0,f=n.length>1;return c`
      <div class="card" data-testid="boiler-plan-strip">
        <div class="heading">
          🗓️ ${x("boiler.plan_strip.heading",e)}
          <span class="meta">${x("boiler.plan_strip.meta",e)}</span>
        </div>

        <div class="tl" data-testid="plan-strip-tl">
          <!-- Temperature SVG curve -->
          ${f?this._renderTempSvg(n,e):w}

          <!-- Axis line -->
          <div class="axis"></div>

          <!-- Source bands -->
          ${i.map(y=>this._renderBand(y,e))}

          <!-- Demand draws (below axis) -->
          ${r.map(y=>this._renderDraw(y))}

          <!-- Circulation ticks -->
          ${this.circulationRuns.map(y=>this._renderCircTick(y,t,e))}

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
              data-label="${x("boiler.plan_strip.deadline_label",e)} ${s}"
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
          ${["fve","grid","battery","alternative"].filter(y=>u.has(y)).map(y=>c`
            <span>
              <i class="dot" style="background:${ta[y].legendColor}"></i>
              ${this._sourceLegendLabel(y,e)}
            </span>
          `)}
          ${h?c`
            <span>
              <i class="dot" style="background:#e53935"></i>
              ${x("boiler.plan_strip.legend_demands",e)}
            </span>
          `:w}
          ${b?c`
            <span>${x("boiler.plan_strip.legend_circ",e)}</span>
          `:w}
        </div>
      </div>
    `}_renderBand(e,t){const i=ta[e.source]??ta.fve,r=(e.xStart*100).toFixed(2),n=((e.xEnd-e.xStart)*100).toFixed(2),o=(e.xEnd-e.xStart)*100>=6,s=e.hasLegionella?x("boiler.plan_strip.source_legionella",t):this._sourceBandLabel(e.source,t),d=`${s} · ${e.heatingKwh.toFixed(2)} kWh`,p=`plan-band-${e.source}${e.hasLegionella?"-legionella":""}`;return c`
      <div class="band ${e.hasLegionella?"legionella-border":""}"
        style="left:${r}%;width:${n}%;background:linear-gradient(180deg,${i.gradStart},${i.gradEnd});color:${i.textColor}"
        title="${d}"
        data-source="${e.source}"
        data-legionella="${e.hasLegionella}"
        data-testid="${p}">
        ${o?s:w}
      </div>
    `}_renderDraw(e){const t=(e.frac*100).toFixed(2),r=Math.max(2,Math.round(e.heightPct*29));return c`
      <div class="draw"
        style="left:${t}%;width:${.9}%;height:${r}px"
        title="${e.kwh.toFixed(2)} kWh">
      </div>
    `}_renderCircTick(e,t,i){const r=Ft(e.start,t);if(r<0||r>1)return w;const n=(r*100).toFixed(2),o=(Ft(e.end,t)*100).toFixed(2),s=`${x("boiler.plan_strip.circ_tooltip",i)} ${Do(e.start)}–${Do(e.end)}`;return c`
      <div class="circ"
        style="left:${n}%"
        title="${s}"
        data-testid="plan-strip-circ"
        data-end-frac="${o}">
        💧
      </div>
    `}_renderTempSvg(e,t){if(e.length<2)return w;const i=960,r=84,n=Math.min(...e.map(u=>u.temp)),o=Math.max(...e.map(u=>u.temp))-n||1,s=u=>u*i,d=u=>r-(u-n)/o*(r-16)-8,p=e.map((u,h)=>`${h===0?"M":"L"}${s(u.frac).toFixed(1)},${d(u.temp).toFixed(1)}`).join(" ");return c`
      <svg class="temp-svg" viewBox="0 0 ${i} ${r}" preserveAspectRatio="none"
        data-testid="plan-strip-temp-svg"
        aria-hidden="true">
        <path d="${p}" fill="none" stroke="#ffca5a" stroke-width="2.5" opacity="0.9"/>
        <text x="6" y="12" fill="#ffca5a" font-size="10" font-family="system-ui,sans-serif">
          ${x("boiler.plan_strip.temp_zone_label",t)}
        </text>
      </svg>
    `}_buildDrawItems(e){const t=this.demandMap;if(!t)return[];const i=t.slotsP80;if(!i||i.length===0)return[];const r=Math.max(...i,.001),n=t.slotDurationMin||15,a=Tn(e);return i.map((o,s)=>{if(o<.05)return null;const p=(a+s*n*60*1e3-a)/(24*3600*1e3);return p<0||p>=1?null:{frac:p,heightPct:o/r,kwh:o}}).filter(o=>o!==null)}_buildTempCurve(e){const t=[];for(const i of this.slots){const r=i.expectedTempTopC??null;if(r==null||!Number.isFinite(r))continue;const n=Ft(i.start,e);t.push({frac:n,temp:r})}return t}_legionellaStandaloneMarker(e,t){const i=this.legionella;if(!(i!=null&&i.scheduledStart))return null;const r=Ft(i.scheduledStart,e);return r<0||r>1||t.some(a=>a.hasLegionella&&r>=a.xStart&&r<=a.xEnd)?null:r}_sourceBandLabel(e,t){switch(e){case"fve":return x("boiler.plan_strip.source_overflow",t);case"grid":return x("boiler.plan_strip.source_grid",t);case"battery":return x("boiler.plan_strip.source_battery",t);case"alternative":return bn(this.altSourceType,t);default:return e}}_sourceLegendLabel(e,t){switch(e){case"fve":return x("boiler.plan_strip.legend_overflow",t);case"grid":return x("boiler.plan_strip.legend_grid",t);case"battery":return x("boiler.plan_strip.legend_battery",t);case"alternative":return bn(this.altSourceType,t);default:return e}}};Ye.styles=z`
    :host { display: block; }

    .card {
      background: ${ei(l.cardBg)};
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: ${ei(l.cardShadow)};
    }

    .heading {
      font-size: 13px;
      font-weight: 600;
      color: ${ei(l.textPrimary)};
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
      color: ${ei(l.textSecondary)};
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
      color: ${ei(l.textPrimary)};
    }

    /* Legend row */
    .leg {
      display: flex;
      gap: 12px;
      font-size: 10px;
      opacity: 0.85;
      margin-top: 8px;
      flex-wrap: wrap;
      color: ${ei(l.textPrimary)};
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
  `;xt([g({attribute:!1})],Ye.prototype,"slots",2);xt([g({attribute:!1})],Ye.prototype,"demandMap",2);xt([g({attribute:!1})],Ye.prototype,"circulationRuns",2);xt([g({attribute:!1})],Ye.prototype,"legionella",2);xt([g({attribute:!1})],Ye.prototype,"planSummary",2);xt([g({type:String})],Ye.prototype,"lang",2);xt([g({type:String})],Ye.prototype,"altSourceType",2);Ye=xt([O("oig-boiler-plan-strip")],Ye);function Do(e){const t=new Date(e);return isNaN(t.getTime())?e:`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`}var Qh=Object.defineProperty,Xh=Object.getOwnPropertyDescriptor,De=(e,t,i,r)=>{for(var n=r>1?void 0:r?Xh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Qh(t,i,n),n};function zo(e){if(e==null||!isFinite(e))return"#37474f";const t=[[10,[21,101,192]],[25,[38,198,218]],[40,[255,183,77]],[55,[255,112,67]],[70,[230,74,25]]];if(e<=t[0][0])return Gr(t[0][1]);if(e>=t[t.length-1][0])return Gr(t[t.length-1][1]);for(let i=1;i<t.length;i++)if(e<=t[i][0]){const[r,n]=t[i-1],[a,o]=t[i],s=(e-r)/(a-r);return Gr([Math.round(n[0]+(o[0]-n[0])*s),Math.round(n[1]+(o[1]-n[1])*s),Math.round(n[2]+(o[2]-n[2])*s)])}return Gr(t[t.length-1][1])}function Gr(e){return`rgb(${e[0]},${e[1]},${e[2]})`}function Jh(e){return e==null||!isFinite(e)||e<=.005||e>=.995?null:(1-e)*100}function eg(e,t,i,r,n){const a=[x("boiler.aria.svg_summary",n)];a.push(`${x("boiler.status.temp_top",n)}: ${bi(e)}`),a.push(`${x("boiler.status.temp_bottom",n)}: ${bi(t)}`);const o=i?di(i,n):x("boiler.aria.source_unknown",n);return a.push(o),r&&a.push(x("boiler.aria.stale",n)),a.join(". ")}let Te=class extends E{constructor(){super(...arguments),this.fillLevelPct=null,this.sourceSegments=[],this.energyMix=null,this.topTempC=null,this.bottomTempC=null,this.lowerZoneTempC=null,this.volumeL=null,this.readyLiters=null,this.etaText=null,this.sourceKey=null,this.stale=!1,this.chargingLabel=null,this.altCharging=!1,this.sourceEstimated=!1,this.lang="cs"}render(){try{return this._renderTank()}catch{return c`
        <div class="bwrap" data-testid="boiler-svg" role="img"
             aria-label="${x("boiler.aria.svg_summary",this.lang)}">
        </div>
      `}}_renderTank(){const e=eg(this.topTempC,this.bottomTempC,this.sourceKey,this.stale,this.lang),t=this.fillLevelPct??null,i=this.topTempC!=null?`${this.topTempC.toFixed(1)} °C`:"— °C",r=this.bottomTempC??this.lowerZoneTempC??null,n=r!=null?`dole ${r.toFixed(1)} °C`:null,a=this.readyLiters??(t!=null&&this.volumeL!=null?Math.round(t*this.volumeL):null),o=a??null,s=this._renderTrendChip(),d=this.chargingLabel!=null,p=zo(this.topTempC),u=zo(r??this.topTempC),h=`linear-gradient(180deg, ${p} 0%, ${u} 100%)`,b=Jh(t),f=this._renderSourceChipBelow();return c`
      <div class="bwrap" data-testid="boiler-svg" role="img" aria-label="${e}">
        <div class="tank">
          <div class="shell">
            <div
              class="thermal"
              data-testid="boiler-thermal-fill"
              style="background:${h};"
            >
              ${d?c`<div class="surf surf--charging"></div>`:w}
              ${b!=null?c`
                <div
                  class="ready-line"
                  data-testid="boiler-ready-line"
                  style="top:${b.toFixed(1)}%;"
                ></div>
              `:w}
            </div>
          </div>

          ${s}

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

        ${f}

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
      `;const t={fve:x("boiler.tank.source_fve",this.lang),overflow:x("boiler.tank.source_fve",this.lang),grid:x("boiler.tank.source_grid",this.lang),battery:x("boiler.tank.source_battery",this.lang),discharge:x("boiler.tank.source_battery",this.lang),alternative:x("boiler.tank.source_alt",this.lang)},i={fve:"srcchip",overflow:"srcchip",grid:"srcchip srcchip--grid",battery:"srcchip srcchip--battery",discharge:"srcchip srcchip--battery",alternative:"srcchip srcchip--alt"},r=t[e]??di(e,this.lang),n=i[e]??"srcchip",a=this.sourceEstimated?c` <small data-testid="boiler-source-estimated">${x("boiler.tank.source_estimated_suffix",this.lang)}</small>`:w;return c`
      <div class="${n}" data-testid="boiler-source-chip">${r}${a}</div>
    `}};Te.styles=z`
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
  `;De([g({type:Number})],Te.prototype,"fillLevelPct",2);De([g({type:Array})],Te.prototype,"sourceSegments",2);De([g({type:Object})],Te.prototype,"energyMix",2);De([g({type:Number})],Te.prototype,"topTempC",2);De([g({type:Number})],Te.prototype,"bottomTempC",2);De([g({type:Number})],Te.prototype,"lowerZoneTempC",2);De([g({type:Number})],Te.prototype,"volumeL",2);De([g({type:Number})],Te.prototype,"readyLiters",2);De([g({type:String})],Te.prototype,"etaText",2);De([g({type:String})],Te.prototype,"sourceKey",2);De([g({type:Boolean})],Te.prototype,"stale",2);De([g({type:String})],Te.prototype,"chargingLabel",2);De([g({type:Boolean})],Te.prototype,"altCharging",2);De([g({type:Boolean})],Te.prototype,"sourceEstimated",2);De([g({type:String})],Te.prototype,"lang",2);Te=De([O("oig-boiler-v2-svg")],Te);var tg=Object.defineProperty,ig=Object.getOwnPropertyDescriptor,Pn=(e,t,i,r)=>{for(var n=r>1?void 0:r?ig(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&tg(t,i,n),n};const Eo=Q,ia=new Set(["temperature_unavailable","temperature_stale","activity_stale","source_invalid","runtime_cache_empty","config_profile_unavailable"]);function rg(e){var t,i,r,n;if((t=e.status)!=null&&t.degraded)return!0;for(const a of((i=e.status)==null?void 0:i.degradedFlags)??[])if(ia.has(a))return!0;for(const a of((r=e.activity)==null?void 0:r.staleFlags)??[])if(ia.has(a))return!0;for(const a of((n=e.explanation)==null?void 0:n.degradedReasons)??[])if(ia.has(a))return!0;return!1}function ng(e,t,i){var p,u,h;const r=e.activity;if(!r)return null;const n=t.targetTempC??0,a=Oh({targetTempC:n,topTempC:((p=e.status)==null?void 0:p.temperatureTop)??null,temperatureTrendCPerMin:r.temperatureTrendCPerMin,volumeL:t.volumeL,heaterPowerKw:t.heaterPowerKw});if(a===null)return x("boiler.eta.unavailable",i);if(a===0)return x("boiler.eta.already_reached",i);const o=`na ${n.toFixed(0)} °C za ~${Eh(a)}`,s=((u=e.planSummary)==null?void 0:u.deadlineTime)??t.deadlineTime,d=((h=e.status)==null?void 0:h.comfortSatisfied)??null;if(s&&s!=="--:--"){const b=s.substring(0,5);return`${o} · ${i==="cs"?"komfort":"comfort"} ${b}${d===!0?" ✓":""}`}return o}let yi=class extends E{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs"}render(){try{return this._renderShell()}catch{return c`
        <div class="shell" data-testid="boiler-v2-shell">
          <div class="stale-warning" data-testid="boiler-stale-warning" role="alert">
            ${x("boiler.aria.stale",this.lang)}
          </div>
        </div>
      `}}_renderShell(){var f,m;const e=this.data,t=e?rg(e):!1,i=(e==null?void 0:e.activity)??null,r=(e==null?void 0:e.status)??null,n=this.config,a=e&&n?ng(e,n,this.lang):null,s=((f=i==null?void 0:i.state)==null?void 0:f.startsWith("charging_"))??!1?(i==null?void 0:i.source)??null:null,d=(i==null?void 0:i.state)==="charging_alt",p=(()=>{var S;if(!((S=i==null?void 0:i.state)!=null&&S.startsWith("charging_")))return null;const y=d?"🔥 OHŘÍVÁ":"⚡ NABÍJÍ";if(i.temperatureTrendCPerMin!=null){const v=i.temperatureTrendCPerMin>=0?"+":"",$=i.temperatureTrendCPerMin.toLocaleString("cs-CZ",{minimumFractionDigits:1,maximumFractionDigits:1});return`${y} ${v}${$} °C/min`}return y})(),u=((m=e==null?void 0:e.status)==null?void 0:m.lowerZoneTempC)??null,h=(i==null?void 0:i.fillLevelPct)??null,b=h!=null&&(n==null?void 0:n.volumeL)!=null?Math.round(h*n.volumeL):null;return c`
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
            .readyLiters="${b}"
            .etaText="${a}"
            .sourceKey="${s}"
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
    `}};yi.styles=z`
    :host {
      display: block;
      font-family: ${Eo(l.fontFamily)};
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
      background: ${Eo(l.cardBg)};
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
  `;Pn([g({type:Object})],yi.prototype,"data",2);Pn([g({type:Object})],yi.prototype,"config",2);Pn([g({type:String})],yi.prototype,"lang",2);yi=Pn([O("oig-boiler-v2-shell")],yi);var ag=Object.defineProperty,og=Object.getOwnPropertyDescriptor,Ti=(e,t,i,r)=>{for(var n=r>1?void 0:r?og(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&ag(t,i,n),n};let ht=class extends E{constructor(){super(...arguments),this.values=[],this.color="#4CAF50",this.sparkWidth=100,this.sparkHeight=30,this.label=""}render(){try{return this._renderSparkline()}catch{return c`<svg
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
      ></svg>`;const i=Math.min(...t),n=Math.max(...t)-i||1,a=2,o=this.sparkHeight-a*2,s=this.sparkWidth,d=e.length,p=e.map((u,h)=>{if(typeof u!="number"||!isFinite(u))return null;const b=d>1?h/(d-1)*s:s/2,f=a+o-(u-i)/n*o;return`${b.toFixed(2)},${f.toFixed(2)}`}).filter(u=>u!==null).join(" ");return c`
      <svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        viewBox="0 0 ${this.sparkWidth} ${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      >
        ${Y`<polyline
          points="${p}"
          fill="none"
          stroke="${this.color}"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />`}
      </svg>
    `}};ht.styles=z`
    :host {
      display: inline-block;
    }
    svg {
      display: block;
      overflow: visible;
    }
  `;Ti([g({type:Array})],ht.prototype,"values",2);Ti([g({type:String})],ht.prototype,"color",2);Ti([g({type:Number})],ht.prototype,"sparkWidth",2);Ti([g({type:Number})],ht.prototype,"sparkHeight",2);Ti([g({type:String})],ht.prototype,"label",2);ht=Ti([O("oig-boiler-sparkline")],ht);var sg=Object.defineProperty,lg=Object.getOwnPropertyDescriptor,kr=(e,t,i,r)=>{for(var n=r>1?void 0:r?lg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&sg(t,i,n),n};const Ur=Q;function cg(e,t){switch(e){case"fve":case"overflow":return x("boiler.panel.source_overflow",t);case"grid":return x("boiler.panel.source_grid",t);case"battery":return x("boiler.panel.source_battery_short",t);case"alternative":return x("boiler.panel.source_alt",t);default:return e??"—"}}function dg(e){switch(e){case"morning":return"🌅";case"afternoon":return"☀️";case"evening":return"🌆";case"night":return"🌙";default:return"💧"}}function pg(e,t){const i=`boiler.demand_map.window.${e}`,r=x(i,t);return r!==i?r.toLowerCase():e}function ug(e){const t=e*15,i=Math.floor(t/60)%24,r=t%60;return`${String(i).padStart(2,"0")}:${String(r).padStart(2,"0")}`}function Oo(e){const t=new Date(e);return Number.isNaN(t.getTime())?"??:??":`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`}function hg(e,t){const i=Date.now();for(const r of e){const n=new Date(r.start).getTime();if(!Number.isFinite(n)||n<i-6e4)continue;const a=r.heatingKwh??null;if(a!==null&&a<=0)continue;const o=r.recommendedSource;if(!o)continue;const s=new Date(n),d=new Date,p=s.getDate()!==d.getDate()||s.getMonth()!==d.getMonth()||s.getFullYear()!==d.getFullYear(),u=cg(o,t),h=`${String(s.getHours()).padStart(2,"0")}:${String(s.getMinutes()).padStart(2,"0")}`;return{label:u,timeStr:h,isTomorrow:p}}return null}let Rt=class extends E{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs",this.panelType="source"}render(){try{return this.panelType==="source"?this._renderSourcePanel():this._renderComfortPanel()}catch{return c`
        <div class="panel">
          <div class="empty-panel">—</div>
        </div>
      `}}_renderSourcePanel(){var K;const e=this.data,t=this.lang,i=(e==null?void 0:e.energyToday)??null,r=(e==null?void 0:e.planSummary)??null,n=(e==null?void 0:e.activity)??null,a=(e==null?void 0:e.planSlots)??[],o=(r==null?void 0:r.estimatedCostCzk)??null,s=(i==null?void 0:i.totalKwh)??null,d=(i==null?void 0:i.fveKwh)??null,p=(i==null?void 0:i.gridKwh)??null,u=(i==null?void 0:i.altKwh)??null,h=u!=null&&u>0,b=(i==null?void 0:i.unattributedKwh)??null,f=b!=null&&b>.05,m=bn(e==null?void 0:e.altSourceType,t),y=(i==null?void 0:i.batteryKwh)??null,S=y!=null&&y>0,v=(r==null?void 0:r.costIfAllAlt)??null,$=v!=null&&v>0&&o!=null?v-o:null,T=$!=null&&$>=0?`${$.toFixed(1).replace(".",",")} Kč`:null,F=((K=n==null?void 0:n.state)==null?void 0:K.startsWith("charging_"))??!1?(n==null?void 0:n.source)??null:null,R=(n==null?void 0:n.sourceEstimated)===!0,k=(()=>{switch(F){case"fve":case"overflow":return x("boiler.panel.source_overflow",t);case"grid":return x("boiler.panel.source_grid_short",t);case"discharge":return x("boiler.panel.source_battery_short",t);case"alternative":return x("boiler.panel.source_alt",t);default:return"—"}})(),A=R&&F!=null?`${k} (${x("boiler.tank.source_estimated_suffix",t)})`:k,D=hg(a,t);return c`
      <div class="panel" data-testid="boiler-source-panel">
        <h3 class="panel-title">${x("boiler.panel.source_title",t)}</h3>

        <div class="kv">
          <span>${x("boiler.panel.cost_today",t)}</span>
          <b>${o!=null?`${o.toFixed(1).replace(".",",")} Kč`:"—"}</b>
        </div>

        <div class="kv">
          <span>${x("boiler.panel.energy_today",t)}</span>
          <b>${s!=null?`${s.toFixed(1).replace(".",",")} kWh`:"—"}</b>
        </div>

        <div class="kv">
          <span>${x("boiler.panel.fve_label",t)}</span>
          <b style="color:#ffd479">${d!=null?`${d.toFixed(1).replace(".",",")} kWh`:"—"}</b>
        </div>

        <div class="kv">
          <span>${x("boiler.panel.grid_label",t)}</span>
          <b style="color:#81d4fa">${p!=null?`${p.toFixed(1).replace(".",",")} kWh`:"—"}</b>
        </div>

        ${f?c`
          <div class="kv">
            <span>${x("boiler.panel.unattributed_label",t)}</span>
            <b style="color:#9aa6b2">${b.toFixed(1).replace(".",",")} kWh</b>
          </div>
        `:w}

        ${h||u!=null?c`
          <div class="kv">
            <span>${m}</span>
            <b style="color:#ffab91">${u!=null?`${u.toFixed(1).replace(".",",")} kWh`:"—"}</b>
          </div>
        `:w}

        ${S?c`
          <div class="kv">
            <span>${x("boiler.panel.battery_label",t)}</span>
            <b style="color:#ce93d8">${y.toFixed(1).replace(".",",")} kWh</b>
          </div>
        `:w}

        <div class="kv">
          <span>${x("boiler.panel.savings_label",t)}</span>
          <b style="color:#9fe6a8">${T??"—"}</b>
        </div>

        <div class="kv" data-testid="boiler-current-source-row">
          <span>${x("boiler.panel.current_source",t)}</span>
          <b>${A}</b>
        </div>

        <div class="kv" data-testid="boiler-next-action">
          <span>${x("boiler.panel.next_action",t)}</span>
          <b>${D!=null?D.isTomorrow?c`${D.label} ${x("boiler.panel.tomorrow",t)} ${D.timeStr}`:c`${D.label} ${D.timeStr}`:"—"}</b>
        </div>
      </div>
    `}_renderComfortPanel(){var S,v,$,T,W;const e=this.data,t=this.lang,r=((S=e==null?void 0:e.status)==null?void 0:S.comfortSatisfied)??null,n=(e==null?void 0:e.demandMap)??null,a=((v=n==null?void 0:n.windows)==null?void 0:v.slice(0,3))??[],o=(e==null?void 0:e.planSummary)??null,s=(o==null?void 0:o.deadlineTime)??((($=this.config)==null?void 0:$.deadlineTime)!=="--:--"?(T=this.config)==null?void 0:T.deadlineTime:null)??null,d=((W=this.config)==null?void 0:W.targetTempC)??null,p=(e==null?void 0:e.legionella)??null,u=(()=>{if(!p)return null;if(!p.enabled)return x("boiler.panel.legionella_off",t);if(p.scheduledStart){const k=p.scheduledStart,A=k.includes("T")?Oo(k):k.substring(0,5);return`${x("boiler.panel.legionella_plan",t)} ${A}`}const F=p.daysSinceLast??null,R=p.intervalDays??null;if(F!==null&&R!==null){const k=R-F;return k<=0?x("boiler.panel.legionella_overdue",t):`${x("boiler.panel.legionella_in",t)} ${k} ${x("boiler.panel.legionella_days",t)}`}return x("boiler.panel.legionella_scheduled",t)})(),h=(e==null?void 0:e.activity)??null,b=(h==null?void 0:h.temperatureTrendCPerMin)??null,f=b!=null?`${b>=0?"+":""}${b.toFixed(1).replace(".",",")} °C/min`:null,m=(e==null?void 0:e.circulationRuns)??[],y=(()=>{if(!m.length)return null;const F=m[0];return`💧 ${Oo(F.start)} (${x("boiler.panel.circ_before_peak",t)})`})();return c`
      <div class="panel" data-testid="boiler-comfort-panel">
        <h3 class="panel-title">${x("boiler.panel.comfort_title",t)}</h3>

        ${r===!0?c`<span class="okchip" data-testid="boiler-comfort-chip">✓ ${x("boiler.status.comfort_satisfied",t)}</span>`:r===!1?c`<span class="gapcip" data-testid="boiler-comfort-chip">⚠ ${x("boiler.status.comfort_unsatisfied",t)}</span>`:w}

        ${a.map(F=>{const R=dg(F.label),k=pg(F.label,t),A=ug(F.slotIndex),D=Math.round(F.liters);return c`
            <div class="kv" data-testid="boiler-demand-window">
              <span>${R} ${k} ${A}</span>
              <b>≥${D} L</b>
            </div>
          `})}

        ${s&&s!=="--:--"?c`
          <div class="kv" data-testid="boiler-deadline-row">
            <span>${x("boiler.panel.deadline_label",t)}</span>
            <b>${s.substring(0,5)}${d!=null?c` · ${d.toFixed(0)} °C`:w}</b>
          </div>
        `:w}

        ${u!=null?c`
          <div class="kv" data-testid="boiler-legionella-row">
            <span>${x("boiler.panel.legionella_label",t)}</span>
            <b>${u}</b>
          </div>
        `:w}

        ${f!=null?c`
          <div class="kv" data-testid="boiler-trend-row">
            <span>${x("boiler.panel.trend_label",t)}</span>
            <b>${f}</b>
          </div>
        `:w}

        ${y!=null?c`
          <div class="kv" data-testid="boiler-circ-row">
            <span>${x("boiler.panel.circ_label",t)}</span>
            <b>${y}</b>
          </div>
        `:c`
          <div class="kv" data-testid="boiler-circ-row">
            <span>${x("boiler.panel.circ_label",t)}</span>
            <b style="opacity:0.5">${x("boiler.panel.circ_off",t)}</b>
          </div>
        `}
      </div>
    `}};Rt.styles=z`
    :host {
      display: block;
      font-family: ${Ur(l.fontFamily)};
    }

    /* ── Side panel wrapper ── */
    :host { height: 100%; }

    .panel {
      background: ${Ur(l.cardBg)};
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
      color: ${Ur(l.textPrimary)};
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
      color: ${Ur(l.textSecondary)};
      font-size: 12px;
      font-style: italic;
      padding: 4px 0;
    }
  `;kr([g({type:Object})],Rt.prototype,"data",2);kr([g({type:Object})],Rt.prototype,"config",2);kr([g({type:String})],Rt.prototype,"lang",2);kr([g({type:String})],Rt.prototype,"panelType",2);Rt=kr([O("oig-boiler-metric-panel")],Rt);var gg=Object.defineProperty,bg=Object.getOwnPropertyDescriptor,Pi=(e,t,i,r)=>{for(var n=r>1?void 0:r?bg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&gg(t,i,n),n};const ra=Q,Qi=1e3,ni=200,Lo=20,na=80,Dt=3,Je=100,Ot=1440;function fg(e){return e??Date.now()}function mg(e,t){var a,o;const i=new Intl.DateTimeFormat("en-US",{timeZone:t,hour:"numeric",minute:"2-digit",hour12:!1}).formatToParts(new Date(e)),r=parseInt(((a=i.find(s=>s.type==="hour"))==null?void 0:a.value)??"0",10)%24,n=parseInt(((o=i.find(s=>s.type==="minute"))==null?void 0:o.value)??"0",10);return r*60+n}function yg(e,t){const i=new Intl.DateTimeFormat("en-US",{timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}).formatToParts(new Date(e)),r=v=>{var $;return(($=i.find(T=>T.type===v))==null?void 0:$.value)??"00"},n=r("year"),a=r("month"),o=r("day"),s=parseInt(r("hour"),10)%24,d=r("minute"),p=r("second"),u=String(s).padStart(2,"0"),h=Date.UTC(parseInt(n),parseInt(a)-1,parseInt(o),s,parseInt(d),parseInt(p)),b=Math.round((h-e)/6e4),f=b>=0?"+":"-",m=Math.abs(b),y=String(Math.floor(m/60)).padStart(2,"0"),S=String(m%60).padStart(2,"0");return`${n}-${a}-${o}T${u}:${d}:${p}${f}${y}:${S}`}function et(e){return e/Ot*Qi}function ti(e){return String(parseFloat(e.toFixed(3)))}function aa(e){const t=Math.max(Lo,Math.min(na,e));return(na-t)/(na-Lo)*ni}function vg(e,t){const i=mg(e,t);return e-i*6e4}function xg(e){if(e.length<=1)return e;const t=[];let i={...e[0]};for(let r=1;r<e.length;r++){const n=e[r],a=i.recommendedSource===n.recommendedSource,o=(i.heatingKwh!=null?i.heatingKwh>0:!1)==(n.heatingKwh!=null?n.heatingKwh>0:!1),s=i.end===n.start;a&&o&&s?i={...i,end:n.end}:(t.push(i),i={...n})}return t.push(i),t}function Ao(e,t,i){let r=null,n=-1/0;for(const a of t){const o=Date.parse(a.start);if(!isFinite(o))continue;const s=a.end!==null?Date.parse(a.end):i;isFinite(s)&&o<=e&&e<=s&&o>n&&(n=o,r=a)}return r}function Fo(e,t){const i=Date.parse(e.start),r=e.end!==null?Date.parse(e.end):t;if(!isFinite(i)||!isFinite(r))return null;const n=(r-i)/36e5;return n<=0||!isFinite(n)||!isFinite(e.energyKwh)||e.energyKwh<0?null:e.energyKwh/n}function wg(e,t,i,r,n){const a=[x("boiler.aria.plan_timeline",n)];a.push(`NOW: ${e}`),t&&a.push(`${x("boiler.config.deadline",n)}: ${t}`),i!=null&&a.push(`${x("boiler.config.goal_temp",n)}: ${i}°C`);const o=[...new Set(r.filter(Boolean))];return o.length>0&&a.push(o.map(s=>di(s,n)).join(", ")),a.join(". ")}let gt=class extends E{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs",this.nowMs=null,this.timeZone=null}render(){try{return this._renderTimeline()}catch{return c`
        <div class="timeline-section">
          <div class="empty-timeline" data-testid="boiler-timeline">${x("boiler.timeline.empty",this.lang)}</div>
        </div>
      `}}_resolveTimeZone(){if(this.timeZone)return this.timeZone;try{return Intl.DateTimeFormat().resolvedOptions().timeZone}catch{return"Europe/Prague"}}_renderTimeline(){var be;const e=fg(this.nowMs??void 0),t=this._resolveTimeZone();let i;try{i=vg(e,t)}catch{i=e-e%864e5}const r=(e-i)/6e4,n=et(r);let a="";try{a=yg(e,t)}catch{a=new Date(e).toISOString()}const o=this.config,s=o!=null&&o.deadlineTime&&o.deadlineTime!=="--:--"?o.deadlineTime:null;let d=null;if(s)try{const[_,Z]=s.split(":"),re=parseInt(_,10)*60+parseInt(Z,10);d=et(re)}catch{d=null}const p=(o==null?void 0:o.targetTempC)!=null&&isFinite(o.targetTempC)?o.targetTempC:60,u=aa(p),h=this.data,b=Array.isArray(h==null?void 0:h.planSlots)?h.planSlots:[],f=Array.isArray(h==null?void 0:h.timeline)?h.timeline:[],m=Array.isArray(h==null?void 0:h.sourceSegments)?h.sourceSegments:[],y=b.length>0&&b.every(_=>(_.heatingKwh??0)===0&&(_.pvKwh??0)===0&&(_.gridKwh??0)===0&&(_.altKwh??0)===0),S=this._buildPlanBands(b,i),v=this._buildTempPointsFromSlots(b,i),$=this._buildTempPointsFromTimeline(f,i),T=v.length>0?v:$,W=this._buildPowerBarsFromSlots(b,i),F=this._buildPowerBars(f,m,i,e),R=S.map(_=>_.source);let k="";try{k=wg(a,s,p,R,this.lang)}catch{k=x("boiler.aria.plan_timeline",this.lang)}const A=T.length>=2?T.map(_=>`${_.x.toFixed(2)},${_.y.toFixed(2)}`).join(" "):null,D=b.reduce((_,Z)=>_+(Z.gridKwh??0),0),K=b.reduce((_,Z)=>_+(Z.pvKwh??0)+(Z.altKwh??0),0),q=b.reduce((_,Z)=>_+(Z.estimatedCostCzk??0),0),B=D+K,H=((be=h==null?void 0:h.status)==null?void 0:be.degradedFlags)??[],Pe=H.includes("price_degraded"),Ne=H.includes("forecast_degraded"),X=["00","03","06","09","12","15","18","21","24"];return c`
      <div class="timeline-section">
        <div class="timeline-header">
          <h3>📅 24h plán: teplota, výkon &amp; zdroje</h3>
          ${b.length>0?c`
            <div class="timeline-summary">
              Dnes: <strong>${D.toFixed(1)} kWh</strong> ze sítě
              · <strong style="color:#f5b800">${K.toFixed(1)} kWh</strong> z FVE/přetoku
              ${q>0?c` · <strong>~${q.toFixed(2)} Kč</strong>`:""}
              ${B>0?c` · spotřeba <strong>~${B.toFixed(1)} kWh</strong>`:""}
            </div>
          `:""}
        </div>

        ${y?c`
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
              viewBox="0 0 ${Qi} ${ni}"
              role="img"
              aria-label="${k}"
              data-testid="boiler-timeline"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              ${Y`<rect x="0" y="0" width="${Qi}" height="${ni}" fill="transparent" />`}

              ${S.map(_=>{const Z=_.source?oc[_.source]??"#9E9E9E":"#9E9E9E",re=_.x2-_.x1;return Y`<rect
                  class="plan-band"
                  data-source="${_.source??"unknown"}"
                  x="${_.x1.toFixed(2)}"
                  y="0"
                  width="${re.toFixed(2)}"
                  height="${ni}"
                  fill="${Z}"
                />`})}

              ${Y`<line x1="0" y1="${Je}" x2="${Qi}" y2="${Je}" stroke="rgba(255,255,255,.08)" stroke-width="1"/>`}

              ${Y`<line
                class="goal-line"
                x1="0" y1="${u.toFixed(2)}"
                x2="${Qi}" y2="${u.toFixed(2)}"
              />`}
              ${Y`<text x="4" y="${(u-3).toFixed(2)}" font-size="8" fill="#4ade80">CÍL ${p}°C</text>`}

              ${d!=null&&s!=null?Y`
                <line class="deadline-marker"
                  data-testid="boiler-deadline-marker"
                  data-deadline-time="${s}"
                  data-deadline-x="${ti(d)}"
                  x1="${ti(d)}" y1="0"
                  x2="${ti(d)}" y2="${ni}"
                />
                <text x="${(d+3).toFixed(2)}" y="12" font-size="8" fill="#E65100">${s}</text>
              `:""}

              ${W.map(_=>{if(_.isCharge){const Z=Je-_.barH;return Y`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    x="${(_.x-2).toFixed(2)}" y="${Z.toFixed(2)}" width="4" height="${_.barH.toFixed(2)}"/>`}else return Y`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    x="${(_.x-2).toFixed(2)}" y="${Je}" width="4" height="${_.barH.toFixed(2)}"/>`})}

              ${F.map(_=>{if(_.isCharge){const Z=Je-_.barH;return Y`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    data-estimated-power="${_.isEstimated?"true":"false"}"
                    x="${(_.x-2).toFixed(2)}" y="${Z.toFixed(2)}" width="4" height="${_.barH.toFixed(2)}"/>`}else return Y`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    data-estimated-power="${_.isEstimated?"true":"false"}"
                    x="${(_.x-2).toFixed(2)}" y="${Je}" width="4" height="${_.barH.toFixed(2)}"/>`})}

              ${f.map(_=>{let Z;try{Z=Date.parse(_.timestamp)}catch{return""}if(!isFinite(Z))return"";const re=(Z-i)/6e4;if(re<0||re>Ot||_.powerKw!==null)return"";const Ee=Ao(Z,m,e),Se=Ee?Fo(Ee,e):null;if(Se!==null&&Se>0)return"";const Oe=et(re);return Y`<rect
                  class="placeholder-bar"
                  data-testid="boiler-power-placeholder"
                  data-estimated-power="true"
                  x="${(Oe-2).toFixed(2)}" y="99" width="4" height="2"
                />`})}

              ${A!=null?Y`<polyline class="temp-line" points="${A}" />`:""}

              ${Y`<line
                class="now-marker"
                data-testid="boiler-now-marker"
                data-now-time="${a}"
                data-now-x="${ti(n)}"
                x1="${ti(n)}" y1="0"
                x2="${ti(n)}" y2="${ni}"
              />`}
              ${Y`<text x="${(n+3).toFixed(2)}" y="12" font-size="8" fill="#60a5fa">TEĎ</text>`}
            </svg>
          </div>

          <div class="timeline-axis">
            ${X.map(_=>c`<span>${_}</span>`)}
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
    `}_buildTempPointsFromTimeline(e,t){const i=[],r=t+Ot*6e4;for(const n of e)try{if(n.topTempC==null||!isFinite(n.topTempC))continue;const a=Date.parse(n.timestamp);if(!isFinite(a)||a<t||a>r)continue;const o=(a-t)/6e4;i.push({x:et(o),y:aa(n.topTempC)})}catch{continue}return i}_buildTempPointsFromSlots(e,t){const i=[],r=t+Ot*6e4;for(const n of e)try{const a=n.expectedTempTopC;if(a==null||!isFinite(a))continue;const o=Date.parse(n.start);if(!isFinite(o)||o<t||o>r)continue;const s=(o-t)/6e4;i.push({x:et(s),y:aa(a)})}catch{continue}return i}_buildPowerBarsFromSlots(e,t){const i=[],r=t+Ot*6e4;for(let n=0;n<e.length;n++){const a=e[n];try{const o=Date.parse(a.start);if(!isFinite(o)||o<t||o>r)continue;const s=(o-t)/6e4,d=et(s),p=(a.pvKwh??0)+(a.gridKwh??0)+(a.altKwh??0);if(p<=0)continue;const u=p*4,b=Math.min(u,Dt)/Dt*Je;i.push({x:d,barH:b,isCharge:!0,isEstimated:!1})}catch{continue}}return i}_buildPlanBands(e,t){if(!e.length)return[];const i=[],r=t+Ot*6e4,n=[];for(const o of e)try{const s=Date.parse(o.start),d=Date.parse(o.end);if(!isFinite(s)||!isFinite(d)||d<=t||s>=r)continue;const p=Math.max(s,t),u=Math.min(d,r);if(u<=p)continue;n.push({...o,start:new Date(p).toISOString(),end:new Date(u).toISOString()})}catch{continue}const a=xg(n);for(const o of a)try{const s=Date.parse(o.start),d=Date.parse(o.end);if(!isFinite(s)||!isFinite(d))continue;const p=et((s-t)/6e4),u=et((d-t)/6e4);if(u<=p)continue;i.push({x1:p,x2:u,source:o.recommendedSource,heating:(o.heatingKwh??0)>0})}catch{continue}return i}_buildPowerBars(e,t,i,r){const n=[],a=i+Ot*6e4;for(const o of e)try{const s=Date.parse(o.timestamp);if(!isFinite(s)||s<i||s>a)continue;const d=(s-i)/6e4,p=et(d);if(o.powerKw!==null&&isFinite(o.powerKw)){const u=Math.max(-Dt,Math.min(Dt,o.powerKw));if(Math.abs(u)<.001)continue;const h=Math.abs(u)/Dt*Je;n.push({x:p,barH:h,isCharge:u>0,isEstimated:!1})}else{const u=Ao(s,t,r);if(u!==null){const h=Fo(u,r);if(h!==null&&h>0){const b=u.key==="discharge",m=Math.min(h,Dt)/Dt*Je;n.push({x:p,barH:m,isCharge:!b,isEstimated:!0})}}}}catch{continue}return n}};gt.styles=z`
    :host {
      display: block;
      font-family: ${ra(l.fontFamily)};
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
      color: ${ra(l.textPrimary)};
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
      color: ${ra(l.textSecondary)};
      font-style: italic;
    }

    @media (max-width: 599px) {
      :host { font-size: 12px; }
    }
  `;Pi([g({type:Object})],gt.prototype,"data",2);Pi([g({type:Object})],gt.prototype,"config",2);Pi([g({type:String})],gt.prototype,"lang",2);Pi([g({type:Number})],gt.prototype,"nowMs",2);Pi([g({type:String})],gt.prototype,"timeZone",2);gt=Pi([O("oig-boiler-timeline-chart")],gt);var _g=Object.defineProperty,$g=Object.getOwnPropertyDescriptor,ke=(e,t,i,r)=>{for(var n=r>1?void 0:r?$g(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&_g(t,i,n),n};const zt=Q,Mn=z`
  .selector-label {
    font-size: 12px;
    color: ${zt(l.textSecondary)};
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
    border: 2px solid ${zt(l.divider)};
    background: ${zt(l.bgSecondary)};
    color: ${zt(l.textPrimary)};
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .mode-btn:hover:not(:disabled):not(.active) {
    border-color: ${zt(l.accent)};
  }

  .mode-btn.active {
    background: ${zt(l.accent)};
    border-color: ${zt(l.accent)};
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
`;let vi=class extends E{constructor(){super(...arguments),this.value="home_1",this.disabled=!1,this.buttonStates={home_1:"idle",home_2:"idle",home_3:"idle",home_ups:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("mode-change",{detail:{mode:e},bubbles:!0}))}render(){return c`
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
              ${Yo[t]}
              ${i==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};vi.styles=[Mn];ke([g({type:String})],vi.prototype,"value",2);ke([g({type:Boolean})],vi.prototype,"disabled",2);ke([g({type:Object})],vi.prototype,"buttonStates",2);vi=ke([O("oig-box-mode-selector")],vi);let bt=class extends E{constructor(){super(...arguments),this.value="off",this.limit=0,this.disabled=!1,this.pendingTarget=null,this.buttonStates={off:"idle",on:"idle",limited:"idle"}}onDeliveryClick(e){const t=this.buttonStates[e];this.disabled||t==="pending"||t==="processing"||t==="disabled-by-service"||t==="active"&&e!=="limited"||this.dispatchEvent(new CustomEvent("delivery-change",{detail:{value:e,limit:e==="limited"?this.limit:null},bubbles:!0}))}render(){const e=[{value:"off",label:Zi.off},{value:"on",label:Zi.on},{value:"limited",label:Zi.limited}],i=this.pendingTarget!==null&&this.pendingTarget!==this.value?c`<span class="status-text transitioning">\u23F3\u00A0${Zi[this.pendingTarget]}</span>`:null;return c`
      <div class="selector-label">
        Dod\u00E1vka do s\u00EDt\u011B ${i}
      </div>
      <div class="mode-buttons">
        ${e.map(r=>{const n=this.buttonStates[r.value],a=r.value===this.value,o=r.value===this.pendingTarget&&!a,s=this.disabled||n==="pending"||n==="processing"||n==="disabled-by-service",d=a&&n==="disabled-by-service"?"active disabled-by-service":o?`${n} pending-target`:n;return c`
            <button
              class="mode-btn ${d}"
              ?disabled=${s}
              @click=${()=>this.onDeliveryClick(r.value)}
            >
              ${r.label}
              ${n==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${n==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};bt.styles=[Mn,z`
      .mode-btn.pending-target {
        border-color: #ffc107;
        color: #ffc107;
        background: rgba(255, 193, 7, 0.08);
      }
    `];ke([g({type:String})],bt.prototype,"value",2);ke([g({type:Number})],bt.prototype,"limit",2);ke([g({type:Boolean})],bt.prototype,"disabled",2);ke([g({type:String})],bt.prototype,"pendingTarget",2);ke([g({type:Object})],bt.prototype,"buttonStates",2);bt=ke([O("oig-grid-delivery-selector")],bt);let xi=class extends E{constructor(){super(...arguments),this.value="cbb",this.disabled=!1,this.buttonStates={cbb:"idle",manual:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("boiler-mode-change",{detail:{mode:e},bubbles:!0}))}render(){return c`
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
              ${Qo[t]} ${Zo[t]}
              ${i==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};xi.styles=[Mn];ke([g({type:String})],xi.prototype,"value",2);ke([g({type:Boolean})],xi.prototype,"disabled",2);ke([g({type:Object})],xi.prototype,"buttonStates",2);xi=ke([O("oig-boiler-mode-selector")],xi);let ft=class extends E{constructor(){super(...arguments),this.homeGridV=!1,this.homeGridVi=!1,this.flexibilita=!1,this.available=!1,this.disabled=!1}getButtonClass(e){return e&&this.disabled?"active disabled-by-service":e?"active":this.disabled?"disabled-by-service":"idle"}onToggleClick(e){this.disabled||this.dispatchEvent(new CustomEvent("supplementary-toggle",{detail:{key:e},bubbles:!0}))}render(){const e=this.getButtonClass(this.homeGridV),t=this.getButtonClass(this.homeGridVi),i=this.flexibilita?c`<span class="flexibilita-badge">\u26A1 Flexibilita</span>`:"";return c`
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
    `}};ft.styles=[Mn,z`
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
    `];ke([g({type:Boolean})],ft.prototype,"homeGridV",2);ke([g({type:Boolean})],ft.prototype,"homeGridVi",2);ke([g({type:Boolean})],ft.prototype,"flexibilita",2);ke([g({type:Boolean})],ft.prototype,"available",2);ke([g({type:Boolean})],ft.prototype,"disabled",2);ft=ke([O("oig-supplementary-selector")],ft);function kg(e){const t=!e.available||e.flexibilita;return e.available?{home_grid_v:e.home_grid_v,home_grid_vi:e.home_grid_vi,flexibilita:e.flexibilita,available:e.available,disabled:t}:{home_grid_v:!1,home_grid_vi:!1,flexibilita:e.flexibilita,available:!1,disabled:!0}}var Sg=Object.defineProperty,Cg=Object.getOwnPropertyDescriptor,Mi=(e,t,i,r)=>{for(var n=r>1?void 0:r?Cg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Sg(t,i,n),n};const Be=Q;let mt=class extends E{constructor(){super(...arguments),this.items=[],this.expanded=!1,this.shieldStatus="idle",this.queueCount=0,this._now=Date.now(),this.updateInterval=null}connectedCallback(){super.connectedCallback(),this.updateInterval=window.setInterval(()=>{this._now=Date.now()},1e3)}disconnectedCallback(){super.disconnectedCallback(),this.updateInterval!==null&&clearInterval(this.updateInterval)}toggleExpanded(){this.expanded=!this.expanded}removeItem(e,t){t.stopPropagation(),this.dispatchEvent(new CustomEvent("remove-item",{detail:{position:e},bubbles:!0}))}formatServiceName(e,t){return t==="supplementary_toggle"?"⚙️ Změna doplňkového režimu":Tl[e]||e||"N/A"}stripCurrentSuffix(e){const i=e.indexOf("(nyní:");return i===-1?e.trim():e.slice(0,i).trim()}formatChanges(e){return!e||e.length===0?"N/A":e.map(t=>{const i=t.indexOf("→");if(i===-1)return t;const r=t.slice(0,i).trim(),n=t.slice(i+1).trim(),a=r.indexOf(":"),o=a===-1?r:r.slice(a+1),s=r.includes("prm2_app")?Xo:Pl,d=o.replaceAll("'","").trim(),p=this.stripCurrentSuffix(n).replaceAll("'","").trim(),u=s[d]||d,h=s[p]||p;return`${u} → ${h}`}).join(", ")}formatTimestamp(e){if(!e)return{time:"--",duration:"--"};try{const t=new Date(e);if(isNaN(t.getTime()))return{time:"--",duration:"--"};const i=new Date(this._now),r=Math.floor((i.getTime()-t.getTime())/1e3),n=String(t.getHours()).padStart(2,"0"),a=String(t.getMinutes()).padStart(2,"0");let o=`${n}:${a}`;if(t.toDateString()!==i.toDateString()){const d=t.getDate(),p=t.getMonth()+1;o=`${d}.${p}. ${o}`}let s;if(r<60)s=`${r}s`;else if(r<3600){const d=Math.floor(r/60),p=r%60;s=`${d}m ${p}s`}else{const d=Math.floor(r/3600),p=Math.floor(r%3600/60);s=`${d}h ${p}m`}return{time:o,duration:s}}catch{return{time:"--",duration:"--"}}}get activeCount(){return this.items.length}render(){this._now;const e=this.shieldStatus==="running"?"running":"idle",t=this.shieldStatus==="running"?"🔄 Zpracovává":"✓ Připraveno";return c`
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
    `}};mt.styles=z`
    :host {
      display: block;
      background: ${Be(l.cardBg)};
      border-radius: 12px;
      box-shadow: ${Be(l.cardShadow)};
      overflow: hidden;
    }

    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: ${Be(l.bgSecondary)};
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
      color: ${Be(l.textPrimary)};
    }

    .queue-count {
      font-size: 12px;
      color: ${Be(l.textSecondary)};
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
      color: ${Be(l.accent)};
      transition: transform 0.2s;
    }

    .queue-toggle.expanded {
      transform: rotate(180deg);
    }

    .queue-content {
      padding: 0;
      border-top: 1px solid ${Be(l.divider)};
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
      color: ${Be(l.textSecondary)};
      border-bottom: 1px solid ${Be(l.divider)};
      background: ${Be(l.bgSecondary)};
    }

    .queue-table td {
      padding: 8px 12px;
      color: ${Be(l.textPrimary)};
      border-bottom: 1px solid ${Be(l.divider)};
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
      color: ${Be(l.textSecondary)};
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
  `;Mi([g({type:Array})],mt.prototype,"items",2);Mi([g({type:Boolean})],mt.prototype,"expanded",2);Mi([g({type:String})],mt.prototype,"shieldStatus",2);Mi([g({type:Number})],mt.prototype,"queueCount",2);Mi([M()],mt.prototype,"_now",2);mt=Mi([O("oig-shield-queue")],mt);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Tg={CHILD:2},Pg=e=>(...t)=>({_$litDirective$:e,values:t});class Mg{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,r){this._$Ct=t,this._$AM=i,this._$Ci=r}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class xa extends Mg{constructor(t){if(super(t),this.it=w,t.type!==Tg.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===w||t==null)return this._t=void 0,this.it=t;if(t===Js)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}}xa.directiveName="unsafeHTML",xa.resultType=1;const Dg=Pg(xa);var zg=Object.defineProperty,Eg=Object.getOwnPropertyDescriptor,Sr=(e,t,i,r)=>{for(var n=r>1?void 0:r?Eg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&zg(t,i,n),n};const Me=Q;let Ht=class extends E{constructor(){super(...arguments),this.open=!1,this.config={title:"",message:""},this.acknowledged=!1,this.limitValue=5e3,this.resolver=null,this.onOverlayClick=()=>{this.closeDialog({confirmed:!1})},this.onDialogClick=e=>{e.stopPropagation()},this.onKeyDown=e=>{e.key==="Escape"&&this.open&&this.closeDialog({confirmed:!1})},this.onAckChange=e=>{this.acknowledged=e.target.checked},this.onLimitInput=e=>{this.limitValue=parseInt(e.target.value,10)||0},this.onCancel=()=>{this.closeDialog({confirmed:!1})},this.onConfirm=()=>{const e=this.config.showLimitInput||this.config.limitOnly;if(e){const t=this.config.limitMin??1,i=this.config.limitMax??2e4;if(isNaN(this.limitValue)||this.limitValue<t||this.limitValue>i)return}this.closeDialog({confirmed:!0,limit:e?this.limitValue:void 0})}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeyDown)}showDialog(e){return this.config=e,this.acknowledged=!1,this.limitValue=e.limitValue??5e3,this.open=!0,new Promise(t=>{this.resolver=t})}closeDialog(e){var t;this.open=!1,(t=this.resolver)==null||t.call(this,e),this.resolver=null}get canConfirm(){return!(this.config.requireAcknowledgement&&!this.acknowledged)}render(){if(!this.open)return w;const e=this.config;return e.limitOnly?c`
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
    `}renderHTML(e){return Dg(e)}};Ht.styles=z`
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
      background: ${Me(l.cardBg)};
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
      color: ${Me(l.textPrimary)};
      border-bottom: 1px solid ${Me(l.divider)};
    }

    .dialog-body {
      padding: 16px 20px;
      font-size: 14px;
      line-height: 1.5;
      color: ${Me(l.textPrimary)};
    }

    .dialog-warning {
      margin: 0 20px 12px;
      padding: 10px 14px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      font-size: 13px;
      color: ${Me(l.textPrimary)};
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
      background: ${Me(l.bgSecondary)};
      border-radius: 8px;
      cursor: pointer;
    }

    .ack-wrapper input[type="checkbox"] {
      margin-top: 2px;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${Me(l.accent)};
    }

    .ack-wrapper label {
      font-size: 13px;
      line-height: 1.4;
      color: ${Me(l.textPrimary)};
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
      color: ${Me(l.textPrimary)};
    }

    .limit-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid ${Me(l.divider)};
      border-radius: 8px;
      font-size: 14px;
      background: ${Me(l.bgPrimary)};
      color: ${Me(l.textPrimary)};
      box-sizing: border-box;
    }

    .limit-hint {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      opacity: 0.7;
      color: ${Me(l.textSecondary)};
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
      background: ${Me(l.bgSecondary)};
      color: ${Me(l.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${Me(l.divider)};
    }

    .btn-confirm {
      background: ${Me(l.accent)};
      color: #fff;
    }

    .btn-confirm:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-confirm:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;Sr([g({type:Boolean,reflect:!0})],Ht.prototype,"open",2);Sr([g({type:Object})],Ht.prototype,"config",2);Sr([M()],Ht.prototype,"acknowledged",2);Sr([M()],Ht.prototype,"limitValue",2);Ht=Sr([O("oig-confirm-dialog")],Ht);var Og=Object.defineProperty,Lg=Object.getOwnPropertyDescriptor,Bs=(e,t,i,r)=>{for(var n=r>1?void 0:r?Lg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Og(t,i,n),n};const Gi=Q;let fn=class extends E{constructor(){super(...arguments),this.shieldState=null}render(){if(!this.shieldState)return w;const e=this.determineStatus(this.shieldState),t=e.toLowerCase(),i=this.getStatusIcon(e),r=this.getStatusLabel(e),a=this.shieldState.queueCount>0?"has-items":"";return c`
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
    `}determineStatus(e){return e.status==="running"?"processing":e.queueCount>0?"pending":"idle"}getStatusIcon(e){switch(e){case"idle":return"✓";case"pending":return"⏳";case"processing":return"🔄";default:return"✓"}}getStatusLabel(e){switch(e){case"idle":return"Připraveno";case"pending":return"Čeká";case"processing":return"Zpracovává";default:return"Neznámý"}}getActivityText(){return this.shieldState?this.shieldState.activity?this.shieldState.activity:this.shieldState.queueCount>0?`${this.shieldState.queueCount} operací ve frontě`:"Systém připraven":"Žádná aktivita"}};fn.styles=z`
    :host {
      display: block;
      padding: 16px 20px;
      border-top: 1px solid ${Gi(l.divider)};
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
      color: ${Gi(l.textPrimary)};
    }

    .shield-status-subtitle {
      font-size: 11px;
      color: ${Gi(l.textSecondary)};
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
      background: ${Gi(l.bgSecondary)};
      color: ${Gi(l.textSecondary)};
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
  `;Bs([g({type:Object})],fn.prototype,"shieldState",2);fn=Bs([O("oig-shield-status")],fn);var Ag=Object.defineProperty,Fg=Object.getOwnPropertyDescriptor,Dn=(e,t,i,r)=>{for(var n=r>1?void 0:r?Fg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Ag(t,i,n),n};const ii=Q;let wi=class extends E{constructor(){super(...arguments),this.boxHasHome56=!1,this.shieldState={...Jo,pendingServices:new Map,changingServices:new Set},this._confirmDialogOverride=null,this.unsubscribe=null,this.onShieldUpdate=e=>{this.shieldState=e}}get confirmDialog(){return this._confirmDialogOverride??this._confirmDialogQuery}set confirmDialog(e){this._confirmDialogOverride=e}connectedCallback(){super.connectedCallback(),this.unsubscribe=de.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.unsubscribe)==null||e.call(this),this.unsubscribe=null}get boxModeButtonStates(){return{home_1:de.getBoxModeButtonState("home_1"),home_2:de.getBoxModeButtonState("home_2"),home_3:de.getBoxModeButtonState("home_3"),home_ups:de.getBoxModeButtonState("home_ups")}}get gridDeliveryButtonStates(){return{off:de.getGridDeliveryButtonState("off"),on:de.getGridDeliveryButtonState("on"),limited:de.getGridDeliveryButtonState("limited")}}get boilerModeButtonStates(){return{cbb:de.getBoilerModeButtonState("cbb"),manual:de.getBoilerModeButtonState("manual")}}get supplementaryView(){return kg(this.shieldState.supplementary)}async onBoxModeChange(e){const{mode:t}=e.detail,i=Yo[t];if(P.debug("Control panel: box mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu střídače",message:`Chystáte se změnit režim boxu na <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování celého systému a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!de.shouldProceedWithQueue())return;await de.setBoxMode(t)||P.warn("Box mode change failed or already active",{mode:t})}async onGridDeliveryChange(e){const{value:t,limit:i}=e.detail,r=Zi[t],n=Cl[t],a=t==="limited",o=this.shieldState.gridDeliveryState.currentLiveLimit??5e3;P.debug("Control panel: grid delivery change requested",{delivery:t,limit:i});const s=this.shieldState.gridDeliveryState.currentLiveDelivery;if(!this.shieldState.gridDeliveryState.isTransitioning&&s==="limited"&&t==="limited"){const f={title:"🚰 Změnit limit přetoků",message:"",limitOnly:!0,showLimitInput:!0,limitValue:o,limitMin:1,limitMax:2e4,limitStep:100,confirmText:"Uložit limit",cancelText:"Zrušit"},m=await this.confirmDialog.showDialog(f);if(!m.confirmed||!de.shouldProceedWithQueue())return;await de.setGridDelivery("limited",m.limit);return}const p={title:`${n} Změna dodávky do sítě`,message:`Chystáte se změnit dodávku do sítě na: <strong>"${r}"</strong>`,warning:a?"Režim a limit budou změněny postupně (serializováno). Každá změna může trvat až 10 minut.":"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,acknowledgementText:"<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost. Aplikace nenese odpovědnost za případné negativní důsledky této změny.",confirmText:"Potvrdit změnu",cancelText:"Zrušit",showLimitInput:a,limitValue:o,limitMin:1,limitMax:2e4,limitStep:100},u=await this.confirmDialog.showDialog(p);if(!u.confirmed||!de.shouldProceedWithQueue())return;const h=this.shieldState.gridDeliveryState.currentLiveDelivery==="limited",b=t==="limited";h&&b&&u.limit!=null?await de.setGridDelivery(t,u.limit):b&&u.limit!=null?await de.setGridDelivery(t,u.limit):await de.setGridDelivery(t)}async onBoilerModeChange(e){const{mode:t}=e.detail,i=Zo[t],r=Qo[t];if(P.debug("Control panel: boiler mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu bojleru",message:`Chystáte se změnit režim bojleru na <strong>"${r} ${i}"</strong>.<br><br>Tato změna ovlivní chování ohřevu vody a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!de.shouldProceedWithQueue())return;await de.setBoilerMode(t)||P.warn("Boiler mode change failed or already active",{mode:t})}async onSupplementaryToggle(e){const{key:t}=e.detail,i=t==="home_grid_v"?"Home 5":"Home 6",r=!this.shieldState.supplementary[t];if(P.debug("Control panel: supplementary toggle requested",{key:t}),!(await this.confirmDialog.showDialog({title:"Změna doplňkového režimu",message:`Chystáte se přepnout <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování systému a může trvat až 10 minut.`,warning:"Změna může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!de.shouldProceedWithQueue())return;await de.setSupplementaryToggle(t,r)||P.warn("Supplementary toggle failed",{key:t})}async onQueueRemoveItem(e){const{position:t}=e.detail;P.debug("Control panel: queue remove requested",{position:t});const i=this.shieldState.allRequests.find(o=>o.position===t);let r="Operace";if(i&&(i.service.includes("set_box_mode")?r=`Změna režimu na ${i.targetValue||"neznámý"}`:i.service.includes("set_grid_delivery")?r=`Změna dodávky do sítě na ${i.targetValue||"neznámý"}`:i.service.includes("set_boiler_mode")&&(r=`Změna režimu bojleru na ${i.targetValue||"neznámý"}`)),!(await this.confirmDialog.showDialog({title:r,message:"Operace bude odstraněna z fronty bez provedení.",requireAcknowledgement:!1,confirmText:"OK",cancelText:"Zrušit"})).confirmed)return;await de.removeFromQueue(t)||P.warn("Failed to remove from queue",{position:t})}render(){const e=this.shieldState,t=e.status==="running"?"running":"idle",i=e.status==="running"?"Zpracovává":"Připraveno",r=e.allRequests.length>0;return c`
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
    `}};wi.styles=z`
    :host {
      display: block;
      margin-top: 16px;
    }

    .control-panel {
      background: ${ii(l.cardBg)};
      border-radius: 16px;
      box-shadow: ${ii(l.cardShadow)};
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid ${ii(l.divider)};
    }

    .panel-title {
      font-size: 15px;
      font-weight: 600;
      color: ${ii(l.textPrimary)};
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
      background: ${ii(l.divider)};
      margin: 16px 0;
    }

    .queue-section {
      border-top: 1px solid ${ii(l.divider)};
    }

    @media (max-width: 480px) {
      .panel-body {
        padding: 12px 14px;
      }
    }
  `;Dn([g({type:Boolean})],wi.prototype,"boxHasHome56",2);Dn([M()],wi.prototype,"shieldState",2);Dn([_n("oig-confirm-dialog")],wi.prototype,"_confirmDialogQuery",2);wi=Dn([O("oig-control-panel")],wi);var Ig=Object.defineProperty,Bg=Object.getOwnPropertyDescriptor,Di=(e,t,i,r)=>{for(var n=r>1?void 0:r?Bg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Ig(t,i,n),n};const Le=Q;let yt=class extends E{constructor(){super(...arguments),this.open=!1,this.currentSoc=0,this.maxSoc=100,this.estimate=null,this.targetSoc=80}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onSliderInput(e){this.targetSoc=parseInt(e.target.value,10),this.dispatchEvent(new CustomEvent("soc-change",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}onConfirm(){this.dispatchEvent(new CustomEvent("confirm",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}render(){return c`
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
    `}};yt.styles=z`
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
      background: ${Le(l.cardBg)};
      border-radius: 16px;
      padding: 24px;
      min-width: 320px;
      max-width: 90vw;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${Le(l.textPrimary)};
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
      color: ${Le(l.textSecondary)};
    }

    .soc-value {
      font-size: 24px;
      font-weight: 600;
      color: ${Le(l.textPrimary)};
    }

    .soc-arrow {
      font-size: 20px;
      color: ${Le(l.textSecondary)};
    }

    .slider-container {
      margin: 16px 0;
    }

    .slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: ${Le(l.bgSecondary)};
      -webkit-appearance: none;
      appearance: none;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${Le(l.accent)};
      cursor: pointer;
    }

    .estimate {
      background: ${Le(l.bgSecondary)};
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
      color: ${Le(l.textSecondary)};
    }

    .estimate-value {
      color: ${Le(l.textPrimary)};
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
      background: ${Le(l.bgSecondary)};
      color: ${Le(l.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${Le(l.divider)};
    }

    .btn-confirm {
      background: ${Le(l.accent)};
      color: #fff;
    }

    .btn-confirm:hover {
      opacity: 0.9;
    }
  `;Di([g({type:Boolean})],yt.prototype,"open",2);Di([g({type:Number})],yt.prototype,"currentSoc",2);Di([g({type:Number})],yt.prototype,"maxSoc",2);Di([g({type:Object})],yt.prototype,"estimate",2);Di([M()],yt.prototype,"targetSoc",2);yt=Di([O("oig-battery-charge-dialog")],yt);var Ng=Object.defineProperty,jg=Object.getOwnPropertyDescriptor,Ke=(e,t,i,r)=>{for(var n=r>1?void 0:r?jg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Ng(t,i,n),n};function li(e){return e==null||Number.isNaN(e)?"-- kWh":`${e.toFixed(Math.abs(e)>=10?1:2)} kWh`}const oa=Q,La=z`
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
`;let hr=class extends E{constructor(){super(...arguments),this.title="",this.icon="📊"}render(){return c`
      <div class="block-header">
        <span class="block-icon">${this.icon}</span>
        <span class="block-title">${this.title}</span>
      </div>
      <slot></slot>
    `}};hr.styles=z`
    :host {
      display: block;
      background: ${oa(l.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${oa(l.cardShadow)};
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
      color: ${oa(l.textPrimary)};
    }

    ${La}
  `;Ke([g({type:String})],hr.prototype,"title",2);Ke([g({type:String})],hr.prototype,"icon",2);hr=Ke([O("oig-analytics-block")],hr);let mn=class extends E{constructor(){super(...arguments),this.data=null}render(){if(!this.data)return c`<div>Načítání...</div>`;const e=this.data.trend>=0?"positive":"negative",t=this.data.trend>=0?"+":"",i=this.data.period==="last_month"?"Minulý měsíc":`Aktuální měsíc (${this.data.currentMonthDays} dní)`;return c`
      <div class="efficiency-value">${si(this.data.efficiency,1)}</div>
      <div class="period-label"
        title="Coulombická (DC) účinnost článků baterie. Celková AC účinnost vč. střídače, se kterou počítá ekonomika plánovače, je ~84 %.">
        ${i} · DC (články)
      </div>

      ${this.data.trend!==0?c`
        <div class="comparison ${e}">
          ${t}${si(this.data.trend)} vs minulý měsíc
        </div>
      `:null}

      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${li(this.data.charged)}</div>
          <div class="stat-label">Nabito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${li(this.data.discharged)}</div>
          <div class="stat-label">Vybito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${li(this.data.losses)}</div>
          <div class="stat-label">Ztráty</div>
          ${this.data.lossesPct?c`
            <div class="losses-pct">${si(this.data.lossesPct,1)}</div>
          `:null}
        </div>
      </div>
    `}};mn.styles=z`
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
  `;Ke([g({type:Object})],mn.prototype,"data",2);mn=Ke([O("oig-battery-efficiency")],mn);let yn=class extends E{constructor(){super(...arguments),this.data=null}renderSparkline(){var d;const e=(d=this.data)==null?void 0:d.measurementHistory;if(!e||e.length<2)return null;const t=e.map(p=>p.soh_percent),i=Math.min(...t)-1,n=Math.max(...t)+1-i||1,a=200,o=40,s=t.map((p,u)=>{const h=u/(t.length-1)*a,b=o-(p-i)/n*o;return`${h},${b}`}).join(" ");return c`
      <div class="sparkline-container">
        <svg viewBox="0 0 ${a} ${o}" preserveAspectRatio="none">
          <polyline
            points="${s}"
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
          <span class="metric-value">${si(this.data.soh,1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Kapacita (P80)</span>
          <span class="metric-value">${li(this.data.capacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Min. kapacita (P20)</span>
          <span class="metric-value">${li(this.data.minCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Nominální kapacita</span>
          <span class="metric-value">${li(this.data.nominalCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Počet měření</span>
          <span class="metric-value">${this.data.measurementCount}</span>
        </div>
        ${this.data.qualityScore!=null?c`
          <div class="metric">
            <span class="metric-label">Kvalita dat</span>
            <span class="metric-value">${si(this.data.qualityScore,0)}</span>
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
                Spolehlivost: <span class="prediction-value">${si(this.data.trendConfidence,0)}</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:c`<div>Načítání...</div>`}};yn.styles=z`
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

    ${La}

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
  `;Ke([g({type:Object})],yn.prototype,"data",2);yn=Ke([O("oig-battery-health")],yn);let vn=class extends E{constructor(){super(...arguments),this.data=null}getProgressClass(e){return e==null?"ok":e>=95?"overdue":e>=80?"due-soon":"ok"}statusLabel(e){var i;return{unknown:"Žádné",idle:"Nečinné",charging:"Nabíjení",holding:"Držení 100 %",completed:"Dokončeno"}[(i=e==null?void 0:e.toLowerCase)==null?void 0:i.call(e)]??e}render(){return this.data?!(this.data.lastBalancing&&this.data.lastBalancing!=="—"||this.data.nextScheduled!=null||this.data.progressPercent!=null)&&(this.data.status??"unknown").toLowerCase()==="unknown"?c`
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
            <span class="metric-value">${oe(this.data.cost)}</span>
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
            <span class="metric-value">${oe(this.data.estimatedNextCost)}</span>
          </div>
        `:null}
      </oig-analytics-block>
    `:c`<div>Načítání...</div>`}};vn.styles=z`
    :host { display: block; }
    ${La}

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
  `;Ke([g({type:Object})],vn.prototype,"data",2);vn=Ke([O("oig-battery-balancing")],vn);let xn=class extends E{constructor(){super(...arguments),this.data=null}render(){return this.data?c`
      <oig-analytics-block title="Porovnání nákladů" icon="💰">
        <div class="cost-row">
          <span class="cost-label">Skutečné náklady</span>
          <span class="cost-value">${oe(this.data.actualSpent)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Odhad dnes celkem</span>
          <span class="cost-value">${oe(this.data.planTotalCost)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Zbývající plán</span>
          <span class="cost-value">${oe(this.data.futurePlanCost)}</span>
        </div>
        ${this.data.tomorrowCost!=null?c`
          <div class="cost-row">
            <span class="cost-label">Zítra odhad</span>
            <span class="cost-value">${oe(this.data.tomorrowCost)}</span>
          </div>
        `:null}

        ${this.data.yesterdayActualCost!=null?c`
          <div class="yesterday-section">
            <div class="section-label">Včera</div>
            <div class="cost-row">
              <span class="cost-label">Plán</span>
              <span class="cost-value">${this.data.yesterdayPlannedCost!=null?oe(this.data.yesterdayPlannedCost):"—"}</span>
            </div>
            <div class="cost-row">
              <span class="cost-label">Skutečnost</span>
              <span class="cost-value">${oe(this.data.yesterdayActualCost)}</span>
            </div>
            ${this.data.yesterdayDelta!=null?c`
              <div class="cost-row">
                <span class="cost-label">Rozdíl</span>
                <span class="cost-value ${this.data.yesterdayDelta<=0?"delta-positive":"delta-negative"}">
                  ${this.data.yesterdayDelta>=0?"+":""}${oe(this.data.yesterdayDelta)}
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
    `:c`<div>Načítání...</div>`}};xn.styles=z`
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
  `;Ke([g({type:Object})],xn.prototype,"data",2);xn=Ke([O("oig-cost-comparison")],xn);var Rg=Object.defineProperty,Hg=Object.getOwnPropertyDescriptor,zi=(e,t,i,r)=>{for(var n=r>1?void 0:r?Hg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Rg(t,i,n),n};const ai=Q;let gr=class extends E{constructor(){super(...arguments),this.data=Ji,this.compact=!1,this.onClick=()=>{this.dispatchEvent(new CustomEvent("badge-click",{bubbles:!0}))}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.onClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.onClick)}render(){const e=this.data.effectiveSeverity,t=Jr[e]??Jr[0],i=this.data.warningsCount>0&&e>0,r=i?ss(this.data.eventType):"✓";return c`
      <style>
        :host { background: ${ai(t)}; }
      </style>
      <span class="badge-icon">${r}</span>
      ${i?c`
        <span class="badge-count">${this.data.warningsCount}</span>
      `:null}
      <span class="badge-label">${i?ls[e]??"Výstraha":"OK"}</span>
    `}};gr.styles=z`
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
  `;zi([g({type:Object})],gr.prototype,"data",2);zi([g({type:Boolean})],gr.prototype,"compact",2);gr=zi([O("oig-chmu-badge")],gr);let br=class extends E{constructor(){super(...arguments),this.open=!1,this.data=Ji}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}formatTime(e){return e?new Date(e).toLocaleString("cs-CZ"):"—"}renderWarning(e){const t=Jr[e.severity]??Jr[2],i=ss(e.event_type),r=ls[e.severity]??"Neznámá";return c`
      <div class="warning-item" style="background: ${t}">
        <div class="warning-header">
          <span class="warning-icon">${i}</span>
          <span class="warning-type">${e.event_type}</span>
          <span class="warning-level">${r}</span>
          ${e.eta_hours>0?c`
            <span class="eta-badge">za ${e.eta_hours.toFixed(0)}h</span>
          `:null}
        </div>
        ${e.description?c`
          <div class="warning-description">${e.description}</div>
        `:null}
        ${e.instruction?c`
          <div class="warning-instruction">${e.instruction}</div>
        `:null}
        <div class="warning-time">
          ${this.formatTime(e.onset)} — ${this.formatTime(e.expires)}
        </div>
      </div>
    `}render(){const e=this.data.allWarnings,t=e.length>0&&this.data.effectiveSeverity>0;return c`
      <div class="modal" @click=${i=>i.stopPropagation()}>
        <div class="modal-header">
          <span class="modal-title">⚠️ ČHMÚ výstrahy</span>
          <button class="close-btn" @click=${this.onClose}>✕</button>
        </div>

        ${t?e.map(i=>this.renderWarning(i)):c`
          <div class="empty-state">Žádné aktivní výstrahy</div>
        `}
      </div>
    `}};br.styles=z`
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
      background: ${ai(l.cardBg)};
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
      color: ${ai(l.textPrimary)};
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      font-size: 20px;
      cursor: pointer;
      color: ${ai(l.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${ai(l.bgSecondary)};
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
      color: ${ai(l.textSecondary)};
    }

    .eta-badge {
      display: inline-block;
      font-size: 10px;
      padding: 1px 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      margin-left: 6px;
    }
  `;zi([g({type:Boolean,reflect:!0})],br.prototype,"open",2);zi([g({type:Object})],br.prototype,"data",2);br=zi([O("oig-chmu-modal")],br);var Wg=Object.defineProperty,Vg=Object.getOwnPropertyDescriptor,Ze=(e,t,i,r)=>{for(var n=r>1?void 0:r?Vg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Wg(t,i,n),n};const Ce=Q;function Ui(e){return e.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")}function Kg(e,t,i,r=50){const n=Ui(i.trim()),a=t?`${t}.`:"",o=e.filter(u=>a&&!u.entity_id.startsWith(a)?!1:n?Ui(u.entity_id).includes(n)||Ui(u.friendly_name).includes(n):!0);if(!n)return o.slice(0,r);const s=[],d=[],p=[];for(const u of o){const h=Ui(u.entity_id),b=Ui(u.friendly_name);h.startsWith(n)||h.includes(`.${n}`)?s.push(u):b.startsWith(n)?d.push(u):p.push(u)}return[...s,...d,...p].slice(0,r)}function qg(e,t){if(!e)return"";const i=t.find(r=>r.entity_id===e);return i!=null&&i.friendly_name&&i.friendly_name!==e?i.friendly_name:e}function Gg(e){return Object.entries(e??{}).map(([t,i])=>{var r;return{entity_id:t,friendly_name:((r=i==null?void 0:i.attributes)==null?void 0:r.friendly_name)??t}})}let He=class extends E{constructor(){super(...arguments),this.value="",this.domain="",this.optional=!1,this.entities=[],this.dirty=!1,this.placeholder="nevyplněno",this.open=!1,this.query="",this.highlightIndex=-1}get results(){return Kg(this.entities,this.domain,this.query)}get displayValue(){return this.value?qg(this.value,this.entities):""}openDropdown(){this.open=!0,this.query="",this.highlightIndex=-1,requestAnimationFrame(()=>{var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".search-box input");e==null||e.focus()})}closeDropdown(){this.open=!1,this.query="",this.highlightIndex=-1}selectEntity(e){this.closeDropdown(),e!==this.value&&(this.value=e,this.dispatchEvent(new CustomEvent("entity-change",{detail:{value:e},bubbles:!0,composed:!0})))}clearValue(e){e.stopPropagation(),this.selectEntity("")}onInputClick(){this.open?this.closeDropdown():this.openDropdown()}onSearchInput(e){this.query=e.target.value,this.highlightIndex=-1}onSearchKeydown(e){const t=this.results;if(e.key==="Escape"){this.closeDropdown();return}if(e.key==="ArrowDown"){e.preventDefault(),this.highlightIndex=Math.min(this.highlightIndex+1,t.length-1),this.scrollHighlightedIntoView();return}if(e.key==="ArrowUp"){e.preventDefault(),this.highlightIndex=Math.max(this.highlightIndex-1,-1),this.scrollHighlightedIntoView();return}if(e.key==="Enter"){e.preventDefault(),this.highlightIndex>=0&&this.highlightIndex<t.length&&this.selectEntity(t[this.highlightIndex].entity_id);return}}scrollHighlightedIntoView(){requestAnimationFrame(()=>{var i;const e=(i=this.shadowRoot)==null?void 0:i.querySelector(".option-list"),t=e==null?void 0:e.querySelector(".option.hl");t==null||t.scrollIntoView({block:"nearest"})})}render(){const e=this.displayValue,t=this.open?this.results:[];return c`
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
          ${e||c`<span style="color:${l.textSecondary};opacity:0.6">${this.optional?this.placeholder:"— vyberte —"}</span>`}
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
    `}};He.styles=z`
    :host { display: block; position: relative; }

    .picker-wrap {
      position: relative;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .picker-input {
      background: ${Ce(l.bgSecondary)};
      color: ${Ce(l.textPrimary)};
      border: 1px solid ${Ce(l.divider)};
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
      border-color: ${Ce(l.accent)};
    }

    .picker-input.open {
      border-color: ${Ce(l.accent)};
      border-radius: 7px 7px 0 0;
    }

    .clear-btn {
      border: none;
      background: transparent;
      color: ${Ce(l.textSecondary)};
      cursor: pointer;
      font-size: 15px;
      padding: 0 2px;
      line-height: 1;
      flex-shrink: 0;
    }

    .clear-btn:hover { color: ${Ce(l.textPrimary)}; }

    .dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      width: 300px;
      max-height: 280px;
      overflow-y: auto;
      background: ${Ce(l.cardBg)};
      border: 1px solid ${Ce(l.accent)};
      border-radius: 0 0 8px 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      z-index: 999;
      display: flex;
      flex-direction: column;
    }

    .search-box {
      padding: 6px 8px;
      border-bottom: 1px solid ${Ce(l.divider)};
      background: ${Ce(l.bgSecondary)};
      flex-shrink: 0;
    }

    .search-box input {
      width: 100%;
      background: ${Ce(l.bgSecondary)};
      color: ${Ce(l.textPrimary)};
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
      border-bottom: 1px solid ${Ce(l.divider)};
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
      color: ${Ce(l.textPrimary)};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .opt-id {
      font-size: 10.5px;
      color: ${Ce(l.textSecondary)};
      font-family: monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .opt-none {
      padding: 6px 10px;
      font-size: 12px;
      color: ${Ce(l.textSecondary)};
      font-style: italic;
    }

    .empty-msg {
      padding: 10px;
      font-size: 12px;
      color: ${Ce(l.textSecondary)};
      text-align: center;
    }
  `;Ze([g({type:String})],He.prototype,"value",2);Ze([g({type:String})],He.prototype,"domain",2);Ze([g({type:Boolean})],He.prototype,"optional",2);Ze([g({attribute:!1})],He.prototype,"entities",2);Ze([g({type:Boolean})],He.prototype,"dirty",2);Ze([g({type:String})],He.prototype,"placeholder",2);Ze([M()],He.prototype,"open",2);Ze([M()],He.prototype,"query",2);Ze([M()],He.prototype,"highlightIndex",2);He=Ze([O("oig-entity-picker")],He);var Ug=Object.defineProperty,Yg=Object.getOwnPropertyDescriptor,Ut=(e,t,i,r)=>{for(var n=r>1?void 0:r?Yg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&Ug(t,i,n),n};const ce=Q,Zg=new Set(["boiler"]),Qg=[{key:"enable_battery_prediction",label:"Predikce baterie a plánovač",type:"bool",hint:"Ekonomické plánování nabíjení, timeline, úspory"},{key:"enable_solar_forecast",label:"Solární předpověď",type:"bool",hint:"Předpověď výroby FVE (forecast.solar / Solcast)"},{key:"enable_pricing",label:"Ceny energie",type:"bool",hint:"Spotové ceny OTE, výkup, distribuce"},{key:"enable_boiler",label:"Bojler",type:"bool",hint:"Inteligentní ohřev vody"},{key:"enable_statistics",label:"Statistiky",type:"bool"},{key:"enable_extended_sensors",label:"Rozšířené senzory",type:"bool"},{key:"enable_chmu_warnings",label:"Výstrahy ČHMÚ",type:"bool"}],Xg=[{key:"auto_mode_switch_enabled",label:"Automatické přepínání režimů",type:"bool",hint:"Plánovač sám přepíná Home 1 / Home UPS podle plánu"},{key:"charge_rate_kw",label:"Nabíjecí výkon ze sítě (kW)",type:"number",min:.5,max:10,step:.1,hint:"Kolik kW box bere při nabíjení ze sítě (UPS)"},{key:"expensive_percentile",label:"Práh drahých hodin (%)",type:"number",min:50,max:95,step:5,scale:100,hint:"Importy nad tímto denním percentilem cen se plánovač snaží pokrýt levným přednabitím. Výchozí 70 %."},{key:"balancing_enabled",label:"Balancování článků",type:"bool",hint:"Pravidelné nabití na 100 % kvůli vyrovnání článků"},{key:"balancing_interval_days",label:"Interval balancování (dny)",type:"number",min:3,max:30,step:1},{key:"balancing_hold_hours",label:"Držení 100 % (hodiny)",type:"number",min:1,max:12,step:1},{key:"cheap_window_percentile",label:"Levné okno pro balancování (%)",type:"number",min:5,max:80,step:5,hint:"Balancování se plánuje do hodin pod tímto cenovým percentilem"}],Jg=[{key:"solar_forecast_provider",label:"Poskytovatel",type:"select",options:[["forecast_solar","forecast.solar"],["solcast","Solcast"]]},{key:"solcast_site_id",label:"Solcast site ID",type:"text",hint:"Jen pro Solcast (z rooftop site URL)"},{key:"solcast_api_key",label:"Solcast API klíč",type:"text",hint:"Nech prázdné = beze změny"},{key:"solar_forecast_latitude",label:"Zeměpisná šířka",type:"number",min:-90,max:90,step:1e-4},{key:"solar_forecast_longitude",label:"Zeměpisná délka",type:"number",min:-180,max:180,step:1e-4},{key:"solar_forecast_string1_enabled",label:"String 1 aktivní",type:"bool"},{key:"solar_forecast_string1_kwp",label:"String 1 výkon (kWp)",type:"number",min:.1,max:50,step:.1},{key:"solar_forecast_string1_declination",label:"String 1 sklon (°)",type:"number",min:0,max:90,step:1},{key:"solar_forecast_string1_azimuth",label:"String 1 azimut (°)",type:"number",min:-180,max:180,step:1,hint:"0 = jih, −90 = východ, 90 = západ"},{key:"solar_forecast_string2_enabled",label:"String 2 aktivní",type:"bool"},{key:"solar_forecast_string2_kwp",label:"String 2 výkon (kWp)",type:"number",min:.1,max:50,step:.1},{key:"solar_forecast_string2_declination",label:"String 2 sklon (°)",type:"number",min:0,max:90,step:1},{key:"solar_forecast_string2_azimuth",label:"String 2 azimut (°)",type:"number",min:-180,max:180,step:1}];function eb(e){return e==="gas"?"Plyn — cena tepla včetně účinnosti kotle (např. 1,5 Kč/kWh)":e==="heat_pump"?"Tepelné čerpadlo — cena ≈ cena elektřiny / COP":e==="fireplace"?"Krb — orientační cena tepla z dřeva/pelet":"Zadej orientační cenu tepla v Kč/kWh"}const $e=[{key:"boiler_volume_l",label:"Objem nádrže (l)",type:"number",min:30,max:1e3,step:1,hint:"Jmenovitý objem zásobníku v litrech"},{key:"boiler_temp_sensor_top",label:"Čidlo teploty — vrchní",type:"text",hint:"ID entity senzoru teploty (např. sensor.bojler_top)",entity:{domain:"sensor"}},{key:"boiler_temp_sensor_bottom",label:"Čidlo teploty — spodní",type:"text",hint:"Jen pokud máš druhý teploměr (ID entity senzoru)",optional:!0,entity:{domain:"sensor"}},{key:"boiler_enable_second_thermometer",label:"Druhý teploměr aktivní",type:"bool",hint:"Zapni, pokud máš spodní čidlo teploty"},{key:"boiler_current_power_entity",label:"Senzor příkonu bojleru",type:"text",hint:"ID entity senzoru výkonu (W); upřesňuje plánovač",optional:!0,entity:{domain:"sensor"}},{key:"boiler_target_temp_c",label:"Cílová teplota (°C)",type:"number",min:40,max:85,step:1,hint:"Požadovaná teplota vody před deadline"},{key:"boiler_deadline_time",label:"Deadline (HH:MM)",type:"text",hint:"Čas, do kdy musí být voda nahřátá (formát HH:MM, např. 07:00)"},{key:"boiler_has_alternative_heating",label:"Alternativní zdroj tepla",type:"bool",hint:"Bojler má jiný zdroj ohřevu (plyn, TČ, krb…)"},{key:"boiler_alt_source_type",label:"Typ alternativního zdroje",type:"select",options:[["gas","Plyn"],["heat_pump","Tepelné čerpadlo"],["fireplace","Krb"],["other","Jiný"]]},{key:"boiler_alt_cost_kwh",label:"Cena tepla (Kč/kWh)",type:"number",min:0,max:20,step:.1,hint:"Cena tepla z alternativního zdroje v Kč/kWh"},{key:"boiler_alt_energy_sensor",label:"Senzor energie alt. zdroje",type:"text",hint:"ID entity senzoru energie (kWh)",optional:!0,entity:{domain:"sensor"}},{key:"boiler_alt_energy_daily",label:"Denní přírůstek energie",type:"bool",hint:"Zapni, pokud senzor měří denní (ne celkový) přírůstek"},{key:"box_has_home56",label:"Box má Home 5/6",type:"bool",hint:"Aktivuje Home 5/6 (OIG CBB) — umožňuje 🔋→🔥 ohřev z baterie"},{key:"boiler_home5_maneuver_enabled",label:"🔋→🔥 Ohřev z baterie",type:"bool",hint:"Plánovač může použít baterii k ohřevu (vyžaduje Home 5/6)"},{key:"boiler_battery_cycle_cost_czk_kwh",label:"Cena cyklu baterie (Kč/kWh)",type:"number",min:0,max:5,step:.05,hint:"Degradace baterie za kWh; plánovač porovná s cenou sítě"},{key:"boiler_circulation_enabled",label:"Cirkulace teplé vody",type:"bool",hint:"Zapnutí cirkulačního čerpadla TUV"},{key:"boiler_circulation_lead_minutes",label:"Předstih cirkulace (min)",type:"number",min:0,max:120,step:5,hint:"Jak dlouho před odběrem pustit čerpadlo"},{key:"boiler_circulation_run_minutes",label:"Délka běhu cirkulace (min)",type:"number",min:1,max:60,step:1},{key:"boiler_circulation_max_runs_per_day",label:"Max. počet běhů/den",type:"number",min:1,max:20,step:1},{key:"boiler_circulation_min_gap_minutes",label:"Min. pauza mezi běhy (min)",type:"number",min:10,max:480,step:10},{key:"boiler_legionella_interval_days",label:"Interval ochrany (dny)",type:"number",min:0,max:30,step:1,hint:"0 = vypnuto; doporučeno 7–14 dní"},{key:"boiler_legionella_target_temp_c",label:"Teplota dezinfekce (°C)",type:"number",min:60,max:75,step:1,hint:"Min. 60 °C pro spolehlivé usmrcení legionelly"}];function tb(e){return e==="gas"?"plyn":e==="heat_pump"?"TČ":e==="fireplace"?"krb":e||"jiný"}function ib(e,t,i,r,n){const a=[];if(e){const o=tb(t),s=i!=null?` · ${Number(i).toFixed(1).replace(".",",")} Kč/kWh`:"";a.push(`${o}${s}`)}return r&&n&&a.push("🔋→🔥"),a.length===0?r?"Home 5/6":"pouze elektřina":a.join(" · ")}function rb(e){return e?"zapnuto":"vypnuto"}function nb(e){return e<=0?"vypnuto":`1×/${e} dní`}let rt=class extends E{constructor(){super(...arguments),this.hassStates=null,this.config=null,this.loading=!0,this.pending={},this.saving=null,this.toast=null,this._entityCatalog=[],this._lastHassStates=null}connectedCallback(){super.connectedCallback(),this.refresh()}get entityCatalog(){return this.hassStates!==this._lastHassStates&&(this._lastHassStates=this.hassStates,this._entityCatalog=this.hassStates?Gg(this.hassStates):[]),this._entityCatalog}async refresh(){this.loading=!0,this.config=await ba(),this.pending={},this.loading=!1}current(e,t){var n;const i=this.pending[e];if(i&&t in i)return i[t];const r=(n=this.config)==null?void 0:n[e];return r?r[t]:void 0}setPending(e,t,i){this.pending={...this.pending,[e]:{...this.pending[e]??{},[t]:i}}}isDirty(e){return Object.keys(this.pending[e]??{}).length>0}discardPending(e){this.pending={...this.pending,[e]:{}},this.toast=null}async save(e){const t=this.pending[e];if(!t||this.saving)return;this.saving=e,this.toast=null;const i=await Lc(e,t);if(this.saving=null,!i.ok){const r=i.fields?Object.entries(i.fields).map(([n,a])=>`${n}: ${a}`).join(", "):"uložení selhalo";this.toast={section:e,ok:!1,text:`✗ ${r}`};return}if(this.config&&(this.config={...this.config,[e]:{...this.config[e],...t}}),this.pending={...this.pending,[e]:{}},Zg.has(e))this.toast={section:e,ok:!0,text:"✓ Uloženo — integrace se restartuje…"},Oc(r=>{this.config=r,this.toast={section:e,ok:!0,text:"✓ Aplikováno"}},()=>{this.toast={section:e,ok:!0,text:"Integrace se restartuje déle než obvykle — obnov stránku"}});else{this.toast={section:e,ok:!0,text:"✓ Uloženo"},this.loading=!0;const r=await ba();r&&(this.config=r),this.loading=!1}}renderLabel(e){return c`
      <span class="lab">
        ${e.label}${e.optional?c`<span class="optional-badge"> (volitelné)</span>`:w}
        ${e.hint?c`<span class="hint">${e.hint}</span>`:w}
      </span>`}renderField(e,t){const i=this.current(e,t.key),r=!!(this.pending[e]&&t.key in this.pending[e]);if(t.type==="bool"){const s=!!i;return c`
        <div class="row">
          ${this.renderLabel(t)}
          <div class="row-control">
            <label class="switch">
              <input type="checkbox" .checked=${s}
                @change=${d=>this.setPending(e,t.key,d.target.checked)} />
              <span class="slider"></span>
            </label>
          </div>
        </div>`}if(t.type==="select"){const s=String(i??"");return c`
        <div class="row">
          ${this.renderLabel(t)}
          <div class="row-control">
            <select class=${r?"dirty":""}
              @change=${d=>this.setPending(e,t.key,d.target.value)}>
              ${(t.options??[]).map(([d,p])=>c`<option value=${d} ?selected=${d===s}>${p}</option>`)}
            </select>
          </div>
        </div>`}if(t.type==="number"){const s=t.scale??1,d=i==null||i===""?"":String(Math.round((Number(i)*s+Number.EPSILON)*1e4)/1e4);return c`
        <div class="row">
          ${this.renderLabel(t)}
          <div class="row-control">
            <input type="number" class=${r?"dirty":""} .value=${d}
              min=${t.min??w} max=${t.max??w} step=${t.step??w}
              @change=${p=>{const u=p.target.value;u!==""&&this.setPending(e,t.key,Number(u)/s)}} />
          </div>
        </div>`}if(t.entity){const s=String(i??"");return c`
        <div class="row">
          ${this.renderLabel(t)}
          <div class="row-control">
            <oig-entity-picker
              .value=${s}
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
            @change=${s=>this.setPending(e,t.key,s.target.value)} />
        </div>
      </div>`}renderCard(e,t,i,r){var o;const n=((o=this.toast)==null?void 0:o.section)===e?this.toast:null,a=this.isDirty(e);return c`
      <div class="card">
        <h2>${t}</h2>
        <div class="sub">${i}</div>
        ${r.map(s=>this.renderField(e,s))}
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
      </div>`}renderBoilerCard(){var S;const e="boiler",t=((S=this.toast)==null?void 0:S.section)===e?this.toast:null,i=!!this.current(e,"boiler_has_alternative_heating"),r=String(this.current(e,"boiler_alt_source_type")??"gas"),n=this.current(e,"boiler_alt_cost_kwh"),a=!!this.current(e,"box_has_home56"),o=!!this.current(e,"boiler_home5_maneuver_enabled"),s=!!this.current(e,"boiler_circulation_enabled"),d=Number(this.current(e,"boiler_legionella_interval_days")??0),p=!!this.current(e,"boiler_enable_second_thermometer"),u=this.isDirty(e),h={key:"boiler_alt_cost_kwh",label:"Cena tepla (Kč/kWh)",type:"number",min:0,max:20,step:.1,hint:eb(r)},b={key:"boiler_home5_maneuver_enabled",label:"🔋→🔥 Ohřev z baterie",type:"bool",hint:a?"Plánovač použije baterii (Home 5) k ohřevu, pokud je levnější než síť":'Vyžaduje aktivaci „Box má Home 5/6" výše'},f=ib(i,r,n,a,o),m=rb(s),y=nb(d);return c`
      <div class="card">
        <h2>🔥 Bojler</h2>
        <div class="sub">Parametry inteligentního ohřevu vody — mirroruje průvodce v HA.</div>

        <!-- ══ Nádrž a čidla — OPEN by default ══ -->
        <details class="bsec" open>
          <summary>Nádrž a čidla</summary>
          <div class="bsec-body">
            ${this.renderField(e,$e.find(v=>v.key==="boiler_volume_l"))}
            ${this.renderField(e,$e.find(v=>v.key==="boiler_temp_sensor_top"))}
            ${this.renderField(e,$e.find(v=>v.key==="boiler_enable_second_thermometer"))}
            ${p?this.renderField(e,$e.find(v=>v.key==="boiler_temp_sensor_bottom")):w}
            ${this.renderField(e,$e.find(v=>v.key==="boiler_current_power_entity"))}
            ${this.renderField(e,$e.find(v=>v.key==="boiler_target_temp_c"))}
            ${this.renderField(e,$e.find(v=>v.key==="boiler_deadline_time"))}
          </div>
        </details>

        <!-- ══ Zdroje tepla — collapsed ══ -->
        <details class="bsec">
          <summary>
            Zdroje tepla
            <span class="bsec-badge" data-testid="badge-sources">${f}</span>
          </summary>
          <div class="bsec-body">
            ${this.renderField(e,$e.find(v=>v.key==="boiler_has_alternative_heating"))}
            ${i?c`
              ${this.renderField(e,{...$e.find(v=>v.key==="boiler_alt_source_type"),hint:void 0})}
              ${this.renderField(e,h)}
              ${this.renderField(e,$e.find(v=>v.key==="boiler_alt_energy_sensor"))}
              ${this.renderField(e,$e.find(v=>v.key==="boiler_alt_energy_daily"))}
            `:w}
            ${this.renderField(e,$e.find(v=>v.key==="box_has_home56"))}
            <div class="note" style="margin-top:6px;margin-bottom:2px">
              Po změně „Box má Home 5/6" a uložení nastavení je nutné obnovit stránku (F5), aby se ovládací panel správně aktualizoval.
            </div>
            ${this.renderFieldDisableable(e,b,!a)}
            ${a?this.renderField(e,$e.find(v=>v.key==="boiler_battery_cycle_cost_czk_kwh")):w}
          </div>
        </details>

        <!-- ══ Cirkulace teplé vody — collapsed ══ -->
        <details class="bsec">
          <summary>
            Cirkulace teplé vody
            <span class="bsec-badge" data-testid="badge-circulation">${m}</span>
          </summary>
          <div class="bsec-body">
            ${this.renderField(e,$e.find(v=>v.key==="boiler_circulation_enabled"))}
            ${s?c`
              ${this.renderField(e,$e.find(v=>v.key==="boiler_circulation_lead_minutes"))}
              ${this.renderField(e,$e.find(v=>v.key==="boiler_circulation_run_minutes"))}
              ${this.renderField(e,$e.find(v=>v.key==="boiler_circulation_max_runs_per_day"))}
              ${this.renderField(e,$e.find(v=>v.key==="boiler_circulation_min_gap_minutes"))}
            `:w}
          </div>
        </details>

        <!-- ══ Ochrana proti legionelle — collapsed ══ -->
        <details class="bsec">
          <summary>
            Ochrana proti legionelle
            <span class="bsec-badge" data-testid="badge-legionella">${y}</span>
          </summary>
          <div class="bsec-body">
            ${this.renderField(e,$e.find(v=>v.key==="boiler_legionella_interval_days"))}
            ${d>0?this.renderField(e,$e.find(v=>v.key==="boiler_legionella_target_temp_c")):w}
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
        ${this.renderCard("modules","🧩 Moduly","Zapnutí modulu přidá senzory a záložky; konfigurace níže.",Qg)}
        ${this.renderCard("battery","🔋 Baterie a plánovač","Parametry ekonomického plánovače a balancování.",Xg)}
        ${this.renderCard("solar","☀️ Solární předpověď","Poskytovatel a geometrie stringů.",Jg)}
        ${this.renderBoilerCard()}
      </div>
    `:c`<div class="loading">Nastavení se nepodařilo načíst (vyžaduje administrátorský účet).</div>`}};rt.styles=z`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 14px;
      align-items: start;
    }

    .card {
      background: ${ce(l.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${ce(l.cardShadow)};
      position: relative;
    }

    .card h2 {
      margin: 0 0 4px;
      font-size: 15px;
      color: ${ce(l.textPrimary)};
    }

    .card .sub {
      font-size: 11px;
      color: ${ce(l.textSecondary)};
      margin-bottom: 12px;
    }

    /* ---- Rows ---- */
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px dashed ${ce(l.divider)};
    }
    .row:last-of-type { border-bottom: none; }

    .lab {
      font-size: 12.5px;
      color: ${ce(l.textPrimary)};
      flex: 1;
      min-width: 0;
    }

    .hint {
      display: block;
      font-size: 10.5px;
      color: ${ce(l.textSecondary)};
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
      background: ${ce(l.bgSecondary)};
      color: ${ce(l.textPrimary)};
      border: 1px solid ${ce(l.divider)};
      border-radius: 7px;
      padding: 5px 8px;
      font-size: 12.5px;
      max-width: 120px;
    }
    input[type='text'] { max-width: 170px; }
    input.dirty, select.dirty { border-color: ${ce(l.accent)}; }

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
    .switch input:checked + .slider { background: ${ce(l.accent)}; }
    .switch input:checked + .slider:before { transform: translateX(18px); }

    /* ---- Actions ---- */
    .actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
    button.save {
      background: ${ce(l.accent)};
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
      color: ${ce(l.textSecondary)};
      background: rgba(120,160,255,0.08);
      border: 1px solid rgba(120,160,255,0.2);
      border-radius: 8px;
      padding: 8px 10px;
      margin-top: 12px;
      line-height: 1.45;
    }

    .loading { padding: 30px; text-align: center; color: ${ce(l.textSecondary)}; }

    /* ---- Group label (non-boiler cards) ---- */
    .group-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${ce(l.textSecondary)};
      margin: 12px 0 4px;
      padding-top: 6px;
      border-top: 1px solid ${ce(l.divider)};
    }
    .group-label:first-of-type { border-top: none; margin-top: 0; }

    /* ---- Optional badge ---- */
    .optional-badge {
      font-size: 10px;
      color: ${ce(l.textSecondary)};
      font-style: italic;
      margin-left: 2px;
    }

    /* ---- Collapsible boiler sub-sections ---- */
    .bsec {
      border-top: 1px solid ${ce(l.divider)};
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
      color: ${ce(l.textSecondary)};
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
      color: ${ce(l.textSecondary)};
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
      background: ${ce(l.cardBg)};
      border-top: 1px solid ${ce(l.accent)};
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
      color: ${ce(l.textSecondary)};
      flex: 1;
    }

    button.discard {
      background: transparent;
      border: 1px solid ${ce(l.divider)};
      color: ${ce(l.textSecondary)};
      border-radius: 7px;
      padding: 5px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    button.discard:hover { border-color: ${ce(l.textSecondary)}; }
  `;Ut([g({attribute:!1})],rt.prototype,"hassStates",2);Ut([M()],rt.prototype,"config",2);Ut([M()],rt.prototype,"loading",2);Ut([M()],rt.prototype,"pending",2);Ut([M()],rt.prototype,"saving",2);Ut([M()],rt.prototype,"toast",2);rt=Ut([O("oig-settings")],rt);var ab=Object.defineProperty,ob=Object.getOwnPropertyDescriptor,at=(e,t,i,r)=>{for(var n=r>1?void 0:r?ob(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&ab(t,i,n),n};const G=Q;function sb(e,t,i,r){const n=Math.abs(e);return n===1?t:n>=2&&n<=4?i:r}function Ns(e){return`${e} ${sb(e,"blok","bloky","bloků")}`}function js(e){return`${e} přepnutí`}let Wt=class extends E{constructor(){super(...arguments),this.open=!1,this.activeTab="today",this.data=null,this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.open&&this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return cs[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return c`
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
          <span class="mode-cost">${oe(e.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(e,t){const i=t.unit==="Kč"?oe(t.plan):`${t.plan.toFixed(1)} ${t.unit}`;let r="",n="";return t.hasActual&&t.actual!=null&&(n=t.unit==="Kč"?oe(t.actual):`${t.actual.toFixed(1)} ${t.unit}`,t.unit==="Kč"?r=t.actual<=t.plan?"better":"worse":r=t.actual>=t.plan?"better":"worse"),c`
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
              ${ds[t]}
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
                ${t.backupSavings>=0?"+":""}${oe(t.backupSavings)}
              </span>
              <span class="bs-detail">
                záloha ${oe(t.backupActualCost??0)} vs. nedělat nic
                ${oe(t.backupBaselineCost??0)}
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
              Skutečné: <span class="progress-value">${oe(t.actualTotalCost)}</span>
            </div>
          `:null}
          ${t.planTotalCost!=null?c`
            <div class="progress-item">
              Plán: <span class="progress-value">${oe(t.planTotalCost)}</span>
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
          Predikce konce dne: <span class="eod-value">${oe(t.eodPrediction.predictedTotal)}</span>
          ${t.eodPrediction.predictedSavings>0?c`
            <span class="eod-savings"> (úspora ${oe(t.eodPrediction.predictedSavings)})</span>
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
          <div class="section-title">Režimy (${Ns(e.modeBlocks.length)}, ${js(t.modeSwitches)})</div>
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
    `}};Wt.styles=z`
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
      background: ${G(l.cardBg)};
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
      border-bottom: 1px solid ${G(l.divider)};
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${G(l.textPrimary)};
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
      color: ${G(l.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${G(l.bgSecondary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${G(l.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${G(l.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 12px 16px;
      border: none;
      background: transparent;
      font-size: 13px;
      color: ${G(l.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${G(l.textPrimary)};
    }

    .tab.active {
      color: ${G(l.accent)};
      border-bottom-color: ${G(l.accent)};
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
      color: ${G(l.textSecondary)};
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
      background: ${G(l.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
    }

    .metric-label {
      font-size: 11px;
      color: ${G(l.textSecondary)};
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
      color: ${G(l.textPrimary)};
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
      color: ${G(l.textPrimary)};
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
      color: ${G(l.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${G(l.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${G(l.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 12px;
      color: ${G(l.textSecondary)};
    }

    .eod-value {
      font-size: 16px;
      font-weight: 600;
      color: ${G(l.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: ${G(l.textSecondary)};
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
  `;at([g({type:Boolean,reflect:!0})],Wt.prototype,"open",2);at([g({type:String})],Wt.prototype,"activeTab",2);at([g({type:Object})],Wt.prototype,"data",2);at([M()],Wt.prototype,"autoRefresh",2);Wt=at([O("oig-timeline-dialog")],Wt);let _i=class extends E{constructor(){super(...arguments),this.data=null,this.activeTab="today",this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return cs[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return c`
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
          <span class="mode-cost">${oe(e.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(e,t){const i=t.unit==="Kč"?oe(t.plan):`${t.plan.toFixed(1)} ${t.unit}`;let r="",n="";return t.hasActual&&t.actual!=null&&(n=t.unit==="Kč"?oe(t.actual):`${t.actual.toFixed(1)} ${t.unit}`,t.unit==="Kč"?r=t.actual<=t.plan?"better":"worse":r=t.actual>=t.plan?"better":"worse"),c`
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
              ${ds[t]}
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
                ${t.backupSavings>=0?"+":""}${oe(t.backupSavings)}
              </span>
              <span class="bs-detail">
                záloha ${oe(t.backupActualCost??0)} vs. nedělat nic
                ${oe(t.backupBaselineCost??0)}
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
              Skutečné: <span class="progress-value">${oe(t.actualTotalCost)}</span>
            </div>
          `:null}
          ${t.planTotalCost!=null?c`
            <div class="progress-item">
              Plán: <span class="progress-value">${oe(t.planTotalCost)}</span>
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
          Predikce konce dne: <span class="eod-value">${oe(t.eodPrediction.predictedTotal)}</span>
          ${t.eodPrediction.predictedSavings>0?c`
            <span class="eod-savings"> (úspora ${oe(t.eodPrediction.predictedSavings)})</span>
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
          <div class="section-title">Režimy (${Ns(e.modeBlocks.length)}, ${js(t.modeSwitches)})</div>
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
    `}};_i.styles=z`
    :host {
      display: block;
    }

    .tile {
      background: ${G(l.cardBg)};
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
      border-bottom: 1px solid ${G(l.divider)};
    }

    .tile-title {
      font-size: 13px;
      font-weight: 600;
      color: ${G(l.textPrimary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${G(l.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${G(l.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 6px 10px;
      border: none;
      background: transparent;
      font-size: 11px;
      color: ${G(l.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${G(l.textPrimary)};
    }

    .tab.active {
      color: ${G(l.accent)};
      border-bottom-color: ${G(l.accent)};
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
      color: ${G(l.textSecondary)};
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
      background: ${G(l.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
    }

    .metric-label {
      font-size: 10px;
      color: ${G(l.textSecondary)};
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
      color: ${G(l.textPrimary)};
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
      color: ${G(l.textPrimary)};
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
      color: ${G(l.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${G(l.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${G(l.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${G(l.textSecondary)};
    }

    .eod-value {
      font-size: 14px;
      font-weight: 600;
      color: ${G(l.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 24px 16px;
      color: ${G(l.textSecondary)};
      font-size: 12px;
    }

    /* ---- Battery savings (záloha-only, fair) ---- */
    .backup-savings {
      background: ${G(l.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${G(l.textSecondary)};
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
  `;at([g({type:Object})],_i.prototype,"data",2);at([g({type:String})],_i.prototype,"activeTab",2);at([M()],_i.prototype,"autoRefresh",2);_i=at([O("oig-timeline-tile")],_i);var lb=Object.defineProperty,cb=Object.getOwnPropertyDescriptor,wt=(e,t,i,r)=>{for(var n=r>1?void 0:r?cb(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&lb(t,i,n),n};const fe=Q;let $i=class extends E{constructor(){super(...arguments),this.data=null,this.editMode=!1,this.tileType="entity"}onTileClick(){var t;if(this.editMode)return;const e=(t=this.data)==null?void 0:t.config;e&&(e.type==="button"&&e.action?Kc(e.entity_id,e.action):se.openEntityDialog(e.entity_id))}onSupportClick(e,t){e.stopPropagation(),!this.editMode&&se.openEntityDialog(t)}onEdit(){var e;this.dispatchEvent(new CustomEvent("edit-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}onDelete(){var e;this.dispatchEvent(new CustomEvent("delete-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}render(){var d,p;if(!this.data)return null;const e=this.data.config,t=e.type==="button";this.tileType!==e.type&&(this.tileType=e.type??"entity");const i=e.color||"",r=e.icon||(t?"⚡":"📊"),n=r.startsWith("mdi:")?en(r):r,a=(d=e.support_entities)==null?void 0:d.top_right,o=(p=e.support_entities)==null?void 0:p.bottom_right,s=this.data.supportValues.topRight||this.data.supportValues.bottomRight;return c`
      ${i?c`<style>:host { --tile-color: ${fe(i)}; }</style>`:null}

      <div class="tile-top" @click=${this.onTileClick} title=${this.editMode?"":e.entity_id}>
        <span class="tile-icon">${n}</span>
        <span class="tile-label">${e.label||""}</span>
        ${s?c`
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
    `}};$i.styles=z`
    /* ===== BASE ===== */
    :host {
      display: flex;
      flex-direction: column;
      padding: 10px 12px;
      background: ${fe(l.cardBg)};
      border-radius: 10px;
      box-shadow: ${fe(l.cardShadow)};
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
      color: ${fe(l.textSecondary)};
      opacity: 0.45;
      font-style: normal;
    }

    /* ===== BUTTON TILE ===== */
    :host([tiletype="button"]) {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--tile-color, ${fe(l.accent)}) 10%, ${fe(l.cardBg)}),
        ${fe(l.cardBg)}
      );
      border: 1px solid color-mix(in srgb, var(--tile-color, ${fe(l.accent)}) 38%, transparent);
    }

    :host([tiletype="button"]:not([editmode]):hover) {
      transform: translateY(-2px);
      cursor: pointer;
      box-shadow:
        0 4px 14px color-mix(in srgb, var(--tile-color, ${fe(l.accent)}) 28%, transparent),
        ${fe(l.cardShadow)};
    }

    :host([tiletype="button"]:not([editmode]):active) {
      transform: translateY(0) scale(0.98);
      opacity: 0.85;
    }

    :host([tiletype="button"]) .tile-icon {
      background: color-mix(in srgb, var(--tile-color, ${fe(l.accent)}) 18%, transparent);
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
      color: ${fe(l.textSecondary)};
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
      color: ${fe(l.textSecondary)};
      white-space: nowrap;
      line-height: 1.2;
    }

    .support-value.clickable {
      cursor: pointer;
    }

    .support-value.clickable:hover {
      text-decoration: underline;
      color: ${fe(l.textPrimary)};
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
      color: ${fe(l.textPrimary)};
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .tile-unit {
      font-size: 11px;
      font-weight: 400;
      color: ${fe(l.textSecondary)};
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
      background: ${fe(l.success)};
      box-shadow: 0 0 4px ${fe(l.success)};
    }

    .state-dot.off {
      background: ${fe(l.textSecondary)};
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
      background: ${fe(l.bgSecondary)};
      border-radius: 50%;
      font-size: 9px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .delete-btn:hover {
      background: ${fe(l.error)};
      color: #fff;
    }
  `;wt([g({type:Object})],$i.prototype,"data",2);wt([g({type:Boolean})],$i.prototype,"editMode",2);wt([g({type:String,reflect:!0})],$i.prototype,"tileType",2);$i=wt([O("oig-tile")],$i);let ki=class extends E{constructor(){super(...arguments),this.tiles=[],this.editMode=!1,this.position="left"}render(){return this.tiles.length===0?c`<div class="empty-state">Žádné dlaždice</div>`:c`
      ${this.tiles.map(e=>c`
        <oig-tile
          .data=${e}
          .editMode=${this.editMode}
          .tileType=${e.config.type??"entity"}
          class="${e.isZero?"inactive":""}"
        ></oig-tile>
      `)}
    `}};ki.styles=z`
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }

    .empty-state {
      font-size: 12px;
      color: ${fe(l.textSecondary)};
      padding: 8px;
      text-align: center;
      opacity: 0.6;
    }
  `;wt([g({type:Array})],ki.prototype,"tiles",2);wt([g({type:Boolean})],ki.prototype,"editMode",2);wt([g({type:String,reflect:!0})],ki.prototype,"position",2);ki=wt([O("oig-tiles-container")],ki);var db=Object.defineProperty,pb=Object.getOwnPropertyDescriptor,Aa=(e,t,i,r)=>{for(var n=r>1?void 0:r?pb(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&db(t,i,n),n};const pe=Q,Io={Spotrebice:["fridge","fridge-outline","dishwasher","washing-machine","tumble-dryer","stove","microwave","coffee-maker","kettle","toaster","blender","food-processor","rice-cooker","slow-cooker","pressure-cooker","air-fryer","oven","range-hood"],Osvetleni:["lightbulb","lightbulb-outline","lamp","ceiling-light","floor-lamp","led-strip","led-strip-variant","wall-sconce","chandelier","desk-lamp","spotlight","light-switch"],"Vytapeni & Chlazeni":["thermometer","thermostat","radiator","radiator-disabled","heat-pump","air-conditioner","fan","hvac","fire","snowflake","fireplace","heating-coil"],"Energie & Baterie":["lightning-bolt","flash","battery","battery-charging","battery-50","battery-10","solar-panel","solar-power","meter-electric","power-plug","power-socket","ev-plug","transmission-tower","current-ac","current-dc"],"Auto & Doprava":["car","car-electric","car-battery","ev-station","ev-plug-type2","garage","garage-open","motorcycle","bicycle","scooter","bus","train","airplane"],Zabezpeceni:["door","door-open","lock","lock-open","shield-home","cctv","camera","motion-sensor","alarm-light","bell","eye","key","fingerprint","shield-check"],"Okna & Stineni":["window-closed","window-open","blinds","blinds-open","curtains","roller-shade","window-shutter","balcony","door-sliding"],"Media & Zabava":["television","speaker","speaker-wireless","music","volume-high","cast","chromecast","radio","headphones","microphone","gamepad","movie","spotify"],"Sit & IT":["router-wireless","wifi","access-point","lan","network","home-assistant","server","nas","cloud","ethernet","bluetooth","cellphone","tablet","laptop"],"Voda & Koupelna":["water","water-percent","water-boiler","water-pump","shower","toilet","faucet","pipe","bathtub","sink","water-heater","pool"],Pocasi:["weather-sunny","weather-cloudy","weather-night","weather-rainy","weather-snowy","weather-windy","weather-fog","weather-lightning","weather-hail","temperature","humidity","barometer"],"Ventilace & Kvalita vzduchu":["fan","air-filter","air-purifier","smoke-detector","co2","wind-turbine"],"Zahrada & Venku":["flower","tree","sprinkler","grass","garden-light","outdoor-lamp","grill","pool","hot-tub","umbrella","thermometer-lines"],Domacnost:["iron","vacuum","broom","mop","washing","basket","hanger","scissors"],"Notifikace & Stav":["information","help-circle","alert-circle","checkbox-marked-circle","check","close","minus","plus","arrow-up","arrow-down","refresh","sync","bell-ring"],Ovladani:["toggle-switch","power","play","pause","stop","skip-next","skip-previous","volume-up","volume-down","brightness-up","brightness-down"],"Cas & Planovani":["clock","timer","alarm","calendar","calendar-clock","schedule","history"],Ostatni:["home","cog","tools","wrench","hammer","chart-line","gauge","dots-vertical","menu","settings","account","logout"]};let fr=class extends E{constructor(){super(...arguments),this.isOpen=!1,this.searchQuery=""}get filteredCategories(){const e=this.searchQuery.trim().toLowerCase();if(!e)return Io;const t=Object.entries(Io).map(([i,r])=>{const n=r.filter(a=>a.toLowerCase().includes(e));return[i,n]}).filter(([,i])=>i.length>0);return Object.fromEntries(t)}open(){this.isOpen=!0}close(){this.isOpen=!1,this.searchQuery=""}onOverlayClick(e){e.target===e.currentTarget&&this.close()}onSearchInput(e){const t=e.target;this.searchQuery=(t==null?void 0:t.value)??""}onIconClick(e){this.dispatchEvent(new CustomEvent("icon-selected",{detail:{icon:`mdi:${e}`},bubbles:!0,composed:!0})),this.close()}render(){if(!this.isOpen)return null;const e=this.filteredCategories,t=Object.entries(e);return c`
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
                      <span class="icon-emoji">${en(n)}</span>
                      <span class="icon-name">${n}</span>
                    </button>
                  `)}
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}};fr.styles=z`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${pe(l.bgPrimary)} 35%, transparent);
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
      background: ${pe(l.cardBg)};
      box-shadow: ${pe(l.cardShadow)};
      border-radius: 14px;
      border: 1px solid ${pe(l.divider)};
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
      border-bottom: 1px solid ${pe(l.divider)};
      gap: 12px;
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${pe(l.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${pe(l.bgSecondary)};
      color: ${pe(l.textPrimary)};
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
      background: ${pe(l.divider)};
      transform: scale(1.05);
    }

    .search {
      padding: 12px 18px;
      border-bottom: 1px solid ${pe(l.divider)};
      background: ${pe(l.bgSecondary)};
    }

    .search input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${pe(l.divider)};
      background: ${pe(l.bgPrimary)};
      color: ${pe(l.textPrimary)};
      font-size: 13px;
      outline: none;
    }

    .search input::placeholder {
      color: ${pe(l.textSecondary)};
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
      color: ${pe(l.textSecondary)};
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
      background: ${pe(l.bgSecondary)};
      cursor: pointer;
      transition: transform 0.15s ease, border 0.2s ease, background 0.2s ease;
      text-align: center;
      font-size: 10px;
      color: ${pe(l.textSecondary)};
    }

    .icon-item:hover {
      background: ${pe(l.bgPrimary)};
      border-color: ${pe(l.accent)};
      transform: translateY(-2px);
      color: ${pe(l.textPrimary)};
    }

    .icon-emoji {
      font-size: 22px;
      line-height: 1;
      color: ${pe(l.textPrimary)};
    }

    .icon-name {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      font-size: 12px;
      color: ${pe(l.textSecondary)};
      text-align: center;
      padding: 24px 0 12px;
    }
  `;Aa([g({type:Boolean,reflect:!0,attribute:"open"})],fr.prototype,"isOpen",2);Aa([M()],fr.prototype,"searchQuery",2);fr=Aa([O("oig-icon-picker")],fr);var ub=Object.defineProperty,hb=Object.getOwnPropertyDescriptor,_e=(e,t,i,r)=>{for(var n=r>1?void 0:r?hb(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&ub(t,i,n),n};const j=Q;let ge=class extends E{constructor(){super(...arguments),this.isOpen=!1,this.tileIndex=-1,this.tileSide="left",this.existingConfig=null,this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}loadTileConfig(e){var t,i;this.currentTab=e.type,e.type==="entity"?this.selectedEntityId=e.entity_id:this.selectedButtonEntityId=e.entity_id,this.label=e.label||"",this.icon=e.icon||"",this.color=e.color||"#03A9F4",this.action=e.action||"toggle",this.supportEntity1=((t=e.support_entities)==null?void 0:t.top_right)||"",this.supportEntity2=((i=e.support_entities)==null?void 0:i.bottom_right)||""}resetForm(){this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}handleClose(){this.isOpen=!1,this.resetForm(),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}getEntities(){const e=dt();return e?e.getAll():{}}getEntityItems(e,t){const i=t.trim().toLowerCase(),r=this.getEntities();return Object.entries(r).filter(([a])=>e.some(o=>a.startsWith(o))).map(([a,o])=>{const s=this.getAttributeValue(o,"friendly_name")||a,d=this.getAttributeValue(o,"unit_of_measurement"),p=this.getAttributeValue(o,"icon");return{id:a,name:s,value:o.state,unit:d,icon:p,state:o}}).filter(a=>i?a.name.toLowerCase().includes(i)||a.id.toLowerCase().includes(i):!0).sort((a,o)=>a.name.localeCompare(o.name))}getSupportEntities(e){const t=e.trim().toLowerCase();if(!t)return[];const i=this.getEntities();return Object.entries(i).map(([r,n])=>{const a=this.getAttributeValue(n,"friendly_name")||r,o=this.getAttributeValue(n,"unit_of_measurement"),s=this.getAttributeValue(n,"icon");return{id:r,name:a,value:n.state,unit:o,icon:s,state:n}}).filter(r=>r.name.toLowerCase().includes(t)||r.id.toLowerCase().includes(t)).sort((r,n)=>r.name.localeCompare(n.name)).slice(0,20)}getDisplayIcon(e){return e?e.startsWith("mdi:")?en(e):e:en("")}getColorForEntity(e){switch(e.split(".")[0]){case"sensor":return"#03A9F4";case"binary_sensor":return"#4CAF50";case"switch":return"#FFC107";case"light":return"#FF9800";case"fan":return"#00BCD4";case"input_boolean":return"#9C27B0";default:return"#03A9F4"}}applyEntityDefaults(e){if(!e)return;const i=this.getEntities()[e];if(!i)return;this.label||(this.label=this.getAttributeValue(i,"friendly_name"));const r=this.getAttributeValue(i,"icon");!this.icon&&r&&(this.icon=r),this.color=this.getColorForEntity(e)}handleEntitySelect(e){this.selectedEntityId=e,this.applyEntityDefaults(e)}handleButtonEntitySelect(e){this.selectedButtonEntityId=e,this.applyEntityDefaults(e)}handleSupportInput(e,t){const i=t.trim();e===1?(this.supportSearch1=t,this.showSupportList1=!!i,i||(this.supportEntity1="")):(this.supportSearch2=t,this.showSupportList2=!!i,i||(this.supportEntity2=""))}handleSupportSelect(e,t){const i=t.name||t.id;e===1?(this.supportEntity1=t.id,this.supportSearch1=i,this.showSupportList1=!1):(this.supportEntity2=t.id,this.supportSearch2=i,this.showSupportList2=!1)}getSupportInputValue(e,t){if(e)return e;if(!t)return"";const i=this.getEntities()[t];return i&&this.getAttributeValue(i,"friendly_name")||t}getAttributeValue(e,t){var r;const i=(r=e.attributes)==null?void 0:r[t];return i==null?"":String(i)}handleSave(){const e=this.currentTab==="entity"?this.selectedEntityId:this.selectedButtonEntityId;if(!e){window.alert("Vyberte entitu");return}const t={top_right:this.supportEntity1||void 0,bottom_right:this.supportEntity2||void 0},i={type:this.currentTab,entity_id:e,label:this.label||void 0,icon:this.icon||void 0,color:this.color||void 0,action:this.currentTab==="button"?this.action:void 0,support_entities:t};this.dispatchEvent(new CustomEvent("tile-saved",{detail:{index:this.tileIndex,side:this.tileSide,config:i},bubbles:!0,composed:!0})),this.handleClose()}onIconSelected(e){var t;this.icon=((t=e.detail)==null?void 0:t.icon)||"",this.iconPickerOpen=!1}renderEntityList(e,t,i,r){const n=this.getEntityItems(e,t);return n.length===0?c`<div class="support-empty">Žádné entity nenalezeny</div>`:c`
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
    `}renderEntityTab(){return c`
      <div class="form-group">
        <label>Vyberte hlavní entitu:</label>
        <input
          class="input"
          type="text"
          placeholder="🔍 Hledat entitu..."
          .value=${this.entitySearchText}
          @input=${e=>{this.entitySearchText=e.target.value}}
        />
      </div>

      <div class="entity-list">
        ${this.renderEntityList(["sensor.","binary_sensor."],this.entitySearchText,this.selectedEntityId,e=>this.handleEntitySelect(e))}
      </div>

      <div class="form-group">
        <label>Vlastní popisek (volitelné):</label>
        <input
          class="input"
          type="text"
          placeholder="Např. Lednice v garáži"
          .value=${this.label}
          @input=${e=>{this.label=e.target.value}}
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
            @input=${e=>{this.color=e.target.value}}
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
          @input=${e=>{this.handleSupportInput(1,e.target.value)}}
          @focus=${()=>{this.supportSearch1.trim()&&(this.showSupportList1=!0)}}
          @blur=${()=>{this.showSupportList1=!1}}
        />
        ${this.showSupportList1?c`
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
          @input=${e=>{this.handleSupportInput(2,e.target.value)}}
          @focus=${()=>{this.supportSearch2.trim()&&(this.showSupportList2=!0)}}
          @blur=${()=>{this.showSupportList2=!1}}
        />
        ${this.showSupportList2?c`
          <div class="support-list">
            ${this.renderSupportList(this.supportSearch2,2)}
          </div>
        `:null}
      </div>
    `}renderButtonTab(){return c`
      <div class="form-group">
        <label>Akce:</label>
        <select
          .value=${this.action}
          @change=${e=>{this.action=e.target.value}}
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
          @input=${e=>{this.buttonSearchText=e.target.value}}
        />
      </div>

      <div class="entity-list">
        ${this.renderEntityList(["switch.","light.","fan.","input_boolean."],this.buttonSearchText,this.selectedButtonEntityId,e=>this.handleButtonEntitySelect(e))}
      </div>

      <div class="form-group">
        <label>Popisek:</label>
        <input
          class="input"
          type="text"
          placeholder="Světlo obývák"
          .value=${this.label}
          @input=${e=>{this.label=e.target.value}}
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
            @input=${e=>{this.color=e.target.value}}
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
          @input=${e=>{this.handleSupportInput(1,e.target.value)}}
          @focus=${()=>{this.supportSearch1.trim()&&(this.showSupportList1=!0)}}
          @blur=${()=>{this.showSupportList1=!1}}
        />
        ${this.showSupportList1?c`
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
          @input=${e=>{this.handleSupportInput(2,e.target.value)}}
          @focus=${()=>{this.supportSearch2.trim()&&(this.showSupportList2=!0)}}
          @blur=${()=>{this.showSupportList2=!1}}
        />
        ${this.showSupportList2?c`
          <div class="support-list">
            ${this.renderSupportList(this.supportSearch2,2)}
          </div>
        `:null}
      </div>
    `}render(){return this.isOpen?c`
      <div class="overlay" @click=${e=>{e.target===e.currentTarget&&this.handleClose()}}>
        <div class="dialog" @click=${e=>e.stopPropagation()}>
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
    `:null}};ge.styles=z`
    :host {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      font-family: ${j(l.fontFamily)};
    }

    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${j(l.bgPrimary)} 35%, transparent);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .dialog {
      width: min(520px, 100%);
      max-height: 85vh;
      background: ${j(l.cardBg)};
      border: 1px solid ${j(l.divider)};
      border-radius: 16px;
      box-shadow: ${j(l.cardShadow)};
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
      border-bottom: 1px solid ${j(l.divider)};
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${j(l.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${j(l.bgSecondary)};
      color: ${j(l.textPrimary)};
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
      background: ${j(l.divider)};
      transform: scale(1.05);
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 18px;
      background: ${j(l.bgSecondary)};
      border-bottom: 1px solid ${j(l.divider)};
    }

    .tab-btn {
      border: 1px solid transparent;
      background: ${j(l.cardBg)};
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: ${j(l.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: border 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }

    .tab-btn.active {
      border-color: ${j(l.accent)};
      color: ${j(l.textPrimary)};
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
      color: ${j(l.textSecondary)};
      font-weight: 600;
    }

    .input,
    select,
    .color-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${j(l.divider)};
      background: ${j(l.bgPrimary)};
      color: ${j(l.textPrimary)};
      font-size: 12px;
      outline: none;
      transition: border 0.2s ease, box-shadow 0.2s ease;
    }

    .input::placeholder {
      color: ${j(l.textSecondary)};
    }

    .input:focus,
    select:focus,
    .color-input:focus {
      border-color: ${j(l.accent)};
      box-shadow: 0 0 0 2px color-mix(in srgb, ${j(l.accent)} 20%, transparent);
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
      border: 1px dashed ${j(l.divider)};
      display: grid;
      place-items: center;
      font-size: 22px;
      cursor: pointer;
      background: ${j(l.bgSecondary)};
      transition: border 0.2s ease, transform 0.2s ease;
    }

    .icon-preview:hover {
      border-color: ${j(l.accent)};
      transform: translateY(-1px);
    }

    .icon-field {
      font-size: 11px;
    }

    .icon-btn {
      border: none;
      background: ${j(l.bgSecondary)};
      color: ${j(l.textPrimary)};
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .divider {
      height: 1px;
      background: ${j(l.divider)};
      margin: 6px 0;
      opacity: 0.8;
    }

    .entity-list {
      border: 1px solid ${j(l.divider)};
      border-radius: 12px;
      overflow: hidden;
      max-height: 200px;
      overflow-y: auto;
      background: ${j(l.bgPrimary)};
    }

    .entity-item {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid ${j(l.divider)};
      cursor: pointer;
      align-items: center;
      transition: background 0.2s ease;
    }

    .entity-item:last-child {
      border-bottom: none;
    }

    .entity-item:hover {
      background: ${j(l.bgSecondary)};
    }

    .entity-item.selected {
      background: color-mix(in srgb, ${j(l.accent)} 16%, transparent);
      border-left: 3px solid ${j(l.accent)};
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
      color: ${j(l.textPrimary)};
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-sub {
      font-size: 10px;
      color: ${j(l.textSecondary)};
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
      background: ${j(l.cardBg)};
      border: 1px solid ${j(l.divider)};
      border-radius: 12px;
      z-index: 10;
      max-height: 180px;
      overflow-y: auto;
      box-shadow: ${j(l.cardShadow)};
    }

    .support-item {
      padding: 10px 12px;
      border-bottom: 1px solid ${j(l.divider)};
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
      background: ${j(l.bgSecondary)};
    }

    .support-name {
      font-size: 12px;
      color: ${j(l.textPrimary)};
      font-weight: 600;
    }

    .support-value {
      font-size: 10px;
      color: ${j(l.textSecondary)};
    }

    .support-empty {
      padding: 12px;
      font-size: 11px;
      color: ${j(l.textSecondary)};
      text-align: center;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px 18px;
      border-top: 1px solid ${j(l.divider)};
      background: ${j(l.bgSecondary)};
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
      background: ${j(l.bgPrimary)};
      color: ${j(l.textPrimary)};
      border: 1px solid ${j(l.divider)};
    }

    .btn-primary {
      background: ${j(l.accent)};
      color: #fff;
      box-shadow: 0 6px 14px color-mix(in srgb, ${j(l.accent)} 40%, transparent);
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
  `;_e([g({type:Boolean,reflect:!0,attribute:"open"})],ge.prototype,"isOpen",2);_e([g({type:Number})],ge.prototype,"tileIndex",2);_e([g({attribute:!1})],ge.prototype,"tileSide",2);_e([g({attribute:!1})],ge.prototype,"existingConfig",2);_e([M()],ge.prototype,"currentTab",2);_e([M()],ge.prototype,"entitySearchText",2);_e([M()],ge.prototype,"buttonSearchText",2);_e([M()],ge.prototype,"selectedEntityId",2);_e([M()],ge.prototype,"selectedButtonEntityId",2);_e([M()],ge.prototype,"label",2);_e([M()],ge.prototype,"icon",2);_e([M()],ge.prototype,"color",2);_e([M()],ge.prototype,"action",2);_e([M()],ge.prototype,"supportEntity1",2);_e([M()],ge.prototype,"supportEntity2",2);_e([M()],ge.prototype,"supportSearch1",2);_e([M()],ge.prototype,"supportSearch2",2);_e([M()],ge.prototype,"showSupportList1",2);_e([M()],ge.prototype,"showSupportList2",2);_e([M()],ge.prototype,"iconPickerOpen",2);ge=_e([O("oig-tile-dialog")],ge);var gb=Object.defineProperty,bb=Object.getOwnPropertyDescriptor,le=(e,t,i,r)=>{for(var n=r>1?void 0:r?bb(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(n=(r?o(t,i,n):o(n))||n);return r&&n&&gb(t,i,n),n};const ze=Q,Bo=new URLSearchParams(window.location.search),Lt=Bo.get("sn")||Bo.get("inverter_sn")||"",No=`sensor.oig_${Lt}_`,fb=[{id:"flow",label:"Toky",icon:"⚡"},{id:"pricing",label:"Ceny",icon:"💰"},{id:"boiler",label:"Bojler",icon:"🔥"},{id:"settings",label:"Nastavení",icon:"⚙️"}];let te=class extends E{constructor(){super(...arguments),this.hass=null,this.loading=!0,this.error=null,this.activeTab="flow",this.editMode=!1,this.time="",this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1,this.flowData=wa,this.pricingData=null,this.pricingLoading=!1,this.boilerState=null,this.boilerLoading=!1,this.boilerV2Data=null,this.boilerConfig=null,this.boilerRefreshTimer=null,this.boxHasHome56=!1,this.analyticsData=co,this.chmuData=Ji,this.chmuModalOpen=!1,this.timelineTab="today",this.timelineData=null,this.tilesConfig=null,this.tilesLeft=[],this.tilesRight=[],this.tileDialogOpen=!1,this.editingTileIndex=-1,this.editingTileSide="left",this.editingTileConfig=null,this.entityStore=null,this.timeInterval=null,this.stateWatcherUnsub=null,this.tileEntityUnsubs=[],this.pricingDirty=!1,this.timelineDirty=!1,this.analyticsDirty=!1,this.boilerDirty=!1,this.reconnecting=!1,this.throttledUpdateFlow=Zn(()=>this.updateFlowData(),500),this.throttledUpdateSensors=Zn(()=>this.updateSensorData(),1e3),this.throttledRefreshDerivedData=Zn(()=>this.refreshDerivedData(),5e3),this.onPageShow=()=>{this.rebindHassContext()},this.onDocumentVisibilityChange=()=>{document.visibilityState==="visible"&&this.rebindHassContext()}}get boilerLang(){return Ec(this.hass)}connectedCallback(){super.connectedCallback(),window.addEventListener("pageshow",this.onPageShow),document.addEventListener("visibilitychange",this.onDocumentVisibilityChange),this.initApp(),this.startTimeUpdate()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("pageshow",this.onPageShow),document.removeEventListener("visibilitychange",this.onDocumentVisibilityChange),this.cleanup()}updated(e){e.has("hass")&&!e.has("loading")&&this.rebindHassContext(),e.has("activeTab")&&(this.activeTab==="pricing"&&(!this.pricingData||this.pricingDirty)&&this.loadPricingData(),this.activeTab==="pricing"&&(this.analyticsData===co||this.analyticsDirty)&&this.loadAnalyticsAsync(),this.activeTab==="pricing"&&(!this.timelineData||this.timelineDirty)&&this.loadTimelineTabData(this.timelineTab),this.activeTab==="boiler"&&(!this.boilerState||this.boilerDirty)&&this.loadBoilerDataAsync())}async initApp(){try{const e=await se.getHass();if(!e)throw new Error("Cannot access Home Assistant context");this.hass=e,this.entityStore=_l(e,Lt),await At.start({getHass:()=>se.getHassSync(),prefixes:[No]}),this.stateWatcherUnsub=At.onEntityChange((t,i)=>{this.syncHassState(t,i),this.throttledUpdateFlow(),this.throttledUpdateSensors(),this.throttledRefreshDerivedData()}),de.start(),this.updateFlowData(),this.updateSensorData(),this.loadPricingData(),this.loadBoilerDataAsync(),this.loadAnalyticsAsync(),this.loadTilesAsync(),this.loadBoxHasHome56(),this.boilerRefreshTimer=window.setInterval(()=>{this.activeTab==="boiler"&&document.visibilityState!=="hidden"&&this.loadBoilerDataAsync()},3e4),this.loading=!1,P.info("App initialized",{entities:Object.keys(e.states||{}).length,inverterSn:Lt})}catch(e){this.error=e.message,this.loading=!1,P.error("App init failed",e)}}cleanup(){var e,t;(e=this.stateWatcherUnsub)==null||e.call(this),this.stateWatcherUnsub=null,At.stop(),de.stop(),this.tileEntityUnsubs.forEach(i=>i()),this.tileEntityUnsubs=[],(t=this.entityStore)==null||t.destroy(),this.entityStore=null,this.timeInterval!==null&&(clearInterval(this.timeInterval),this.timeInterval=null),this.boilerRefreshTimer!==null&&(clearInterval(this.boilerRefreshTimer),this.boilerRefreshTimer=null)}async rebindHassContext(){var e;if(!this.reconnecting){this.reconnecting=!0;try{const t=await se.refreshHass();if(!t)return;this.hass=t,(e=this.entityStore)==null||e.updateHass(t),await At.start({getHass:()=>se.getHassSync(),prefixes:[No]}),this.updateFlowData(),this.updateSensorData()}catch(t){P.error("Failed to rebind hass context",t)}finally{this.reconnecting=!1}}}updateFlowData(){var e;if(this.hass)try{const t=((e=this.entityStore)==null?void 0:e.getAll())??this.hass;this.flowData=Rl(t,Lt)}catch(t){P.error("Failed to extract flow data",t)}}updateSensorData(){if(this.chmuData=Nc(Lt),this.activeTab==="pricing"&&(this.analyticsData={...this.analyticsData,...Ic()}),this.tilesConfig){const e=Hi(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}}updateTilesImmediate(){if(!this.tilesConfig)return;const e=Hi(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}subscribeTileEntities(){if(this.tileEntityUnsubs.forEach(t=>t()),this.tileEntityUnsubs=[],!this.tilesConfig||!this.entityStore)return;const e=new Set;[...this.tilesConfig.tiles_left,...this.tilesConfig.tiles_right].forEach(t=>{var i,r;t&&(e.add(t.entity_id),(i=t.support_entities)!=null&&i.top_right&&e.add(t.support_entities.top_right),(r=t.support_entities)!=null&&r.bottom_right&&e.add(t.support_entities.bottom_right))});for(const t of e){const i=this.entityStore.subscribe(t,()=>{this.updateTilesImmediate()});this.tileEntityUnsubs.push(i)}}async loadPricingData(){if(!(!this.hass||this.pricingLoading)){this.pricingLoading=!0;try{const e=await Wi(()=>nc(this.hass));this.pricingData=e,this.pricingDirty=!1}catch(e){P.error("Failed to load pricing data",e)}finally{this.pricingLoading=!1}}}async loadBoilerDataAsync(){if(!(!this.hass||this.boilerLoading)){this.boilerLoading=!0;try{const e=await Wi(()=>zc(this.hass));this.boilerState=e.state,this.boilerV2Data=e.v2Data,this.boilerConfig=e.config,this.boilerDirty=!1,this.boilerRefreshTimer||(this.boilerRefreshTimer=window.setInterval(()=>this.loadBoilerDataAsync(),5*60*1e3))}catch(e){P.error("Failed to load boiler data",e)}finally{this.boilerLoading=!1}}}async loadAnalyticsAsync(){try{this.analyticsData=await Wi(()=>Fc(Lt)),this.analyticsDirty=!1}catch(e){P.error("Failed to load analytics",e)}}async loadBoxHasHome56(){var e;try{const t=await ba();this.boxHasHome56=((e=t==null?void 0:t.boiler)==null?void 0:e.box_has_home56)===!0}catch{}}async loadTilesAsync(){try{this.tilesConfig=await Wi(()=>Vc());const e=Hi(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right,this.subscribeTileEntities()}catch(e){P.error("Failed to load tiles config",e)}}async loadTimelineTabData(e){try{this.timelineData=await Wi(()=>Hc(Lt,e)),this.timelineDirty=!1}catch(t){P.error(`Failed to load timeline tab: ${e}`,t)}}syncHassState(e,t){if(this.hass){if(this.hass.states||(this.hass.states={}),t){this.hass.states[e]=t;return}delete this.hass.states[e]}}refreshDerivedData(){if(this.pricingDirty=!0,this.timelineDirty=!0,this.analyticsDirty=!0,this.boilerDirty=!0,this.activeTab==="pricing"){Gl(),this.loadPricingData(),this.loadTimelineTabData(this.timelineTab),this.loadAnalyticsAsync();return}this.activeTab==="boiler"&&this.loadBoilerDataAsync()}startTimeUpdate(){const e=()=>{this.time=new Date().toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})};e(),this.timeInterval=window.setInterval(e,1e3)}onTabChange(e){this.activeTab=e.detail.tabId}onGridChargingOpen(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-grid-charging-dialog");e==null||e.show()}onEditClick(){this.editMode=!this.editMode}onResetClick(){var i,r;const e=(i=this.shadowRoot)==null?void 0:i.querySelector("oig-flow-canvas");e!=null&&e.resetLayout&&e.resetLayout();const t=(r=this.shadowRoot)==null?void 0:r.querySelector("oig-grid");t&&t.resetLayout()}onToggleLeftPanel(){this.leftPanelCollapsed=!this.leftPanelCollapsed}onToggleRightPanel(){this.rightPanelCollapsed=!this.rightPanelCollapsed}onChmuBadgeClick(){this.chmuModalOpen=!0}onChmuModalClose(){this.chmuModalOpen=!1}onTimelineTabChange(e){this.timelineTab=e.detail.tab,this.loadTimelineTabData(e.detail.tab)}onTimelineRefresh(){this.loadTimelineTabData(this.timelineTab)}onEditTile(e){const{entityId:t}=e.detail;let i=-1,r="left",n=null;if(this.tilesConfig){const a=this.tilesConfig.tiles_left.findIndex(o=>o&&o.entity_id===t);if(a>=0)i=a,r="left",n=this.tilesConfig.tiles_left[a];else{const o=this.tilesConfig.tiles_right.findIndex(s=>s&&s.entity_id===t);o>=0&&(i=o,r="right",n=this.tilesConfig.tiles_right[o])}}this.editingTileIndex=i,this.editingTileSide=r,this.editingTileConfig=n,this.tileDialogOpen=!0,n&&requestAnimationFrame(()=>{var o;const a=(o=this.shadowRoot)==null?void 0:o.querySelector("oig-tile-dialog");a==null||a.loadTileConfig(n)})}onDeleteTile(e){const{entityId:t}=e.detail;if(!this.tilesConfig||!t)return;const i={...this.tilesConfig};i.tiles_left=i.tiles_left.map(n=>n&&n.entity_id===t?null:n),i.tiles_right=i.tiles_right.map(n=>n&&n.entity_id===t?null:n),this.tilesConfig=i;const r=Hi(i);this.tilesLeft=r.left,this.tilesRight=r.right,ho(i),this.subscribeTileEntities()}onTileSaved(e){const{index:t,side:i,config:r}=e.detail;if(!this.tilesConfig)return;const n={...this.tilesConfig},a=i==="left"?[...n.tiles_left]:[...n.tiles_right];if(t>=0&&t<a.length)a[t]=r;else{const s=a.findIndex(d=>d===null);s>=0?a[s]=r:a.push(r)}i==="left"?n.tiles_left=a:n.tiles_right=a,this.tilesConfig=n;const o=Hi(n);this.tilesLeft=o.left,this.tilesRight=o.right,ho(n),this.subscribeTileEntities()}onTileDialogClose(){this.tileDialogOpen=!1,this.editingTileConfig=null,this.editingTileIndex=-1}_renderBoilerTabSafe(){try{return this._buildBoilerTabContent()}catch(e){return P.error("Boiler tab render failed",e),c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${"render_failed"}></oig-boiler-unavailable-state>`}}_buildBoilerTabContent(){var o,s,d;const e=this.boilerV2Data;if(this.boilerLoading&&!e)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="loading" message=""></oig-boiler-unavailable-state>`;if(e!=null&&e.loadError)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${e.loadError}></oig-boiler-unavailable-state>`;const t=(((o=e==null?void 0:e.explanation)==null?void 0:o.degradedReasons)??[]).filter(p=>p!=="config_profile_unavailable");if(e&&e.status===null&&t.length>0)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="degraded" .message=${t.join(", ")}></oig-boiler-unavailable-state>`;if(!e)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="unavailable" message="Data bojleru nejsou k dispozici"></oig-boiler-unavailable-state>`;const i=((s=e.explanation)==null?void 0:s.dataAgeSecs)??null,r=i!==null&&i>600,n=(((d=e.status)==null?void 0:d.degraded)??!1)&&t.length>0,a=r||n?c`<div class="boiler-status-chip-row">
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
          .tabs=${fb}
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
                  <oig-control-panel .boxHasHome56=${this.boxHasHome56}></oig-control-panel>
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
    `}};te.styles=z`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      font-family: ${ze(l.fontFamily)};
      color: ${ze(l.textPrimary)};
      background: ${ze(l.bgPrimary)};
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
      color: ${ze(l.textSecondary)};
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid ${ze(l.divider)};
      border-top-color: ${ze(l.accent)};
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
      color: ${ze(l.error)};
      text-align: center;
      animation: fadeIn 0.3s ease;
    }

    .error h2 {
      margin-bottom: 8px;
    }

    .error button {
      margin-top: 12px;
      padding: 8px 16px;
      background: ${ze(l.accent)};
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
      background: ${ze(l.bgSecondary)};
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
      background: ${ze(l.cardBg)};
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      font-size: 12px;
      color: ${ze(l.textSecondary)};
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
      background: ${ze(l.cardBg)};
      border: 1px solid ${ze(l.divider)};
      border-radius: 8px;
      font-size: 13px;
      color: ${ze(l.textSecondary)};
    }

    .boiler-setup-guide__icon {
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
    }

    .boiler-setup-guide__text strong {
      display: block;
      color: ${ze(l.textPrimary)};
      margin-bottom: 2px;
    }

    .boiler-setup-guide__text p {
      margin: 0;
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
    }

    /* Landscape kiosk (Google Nest Hub ~768×543): toky + ovládací panel vedle sebe,
       dlaždice skryté (sekundární), ovládací panel scrolluje uvnitř. */
    @media (orientation: landscape) and (max-height: 600px) {
      main { padding: 6px 10px; }
      .flow-layout {
        grid-template-columns: 1fr 232px;
        grid-template-areas: 'canvas control';
        gap: 8px;
        align-items: start;
      }
      .flow-tiles-stack { display: none; }
      .flow-center { grid-area: canvas; }
      .flow-control { grid-area: control; max-height: calc(100vh - 78px); overflow-y: auto; }
    }
  `;le([g({type:Object})],te.prototype,"hass",2);le([M()],te.prototype,"loading",2);le([M()],te.prototype,"error",2);le([M()],te.prototype,"activeTab",2);le([M()],te.prototype,"editMode",2);le([M()],te.prototype,"time",2);le([M()],te.prototype,"leftPanelCollapsed",2);le([M()],te.prototype,"rightPanelCollapsed",2);le([M()],te.prototype,"flowData",2);le([M()],te.prototype,"pricingData",2);le([M()],te.prototype,"pricingLoading",2);le([M()],te.prototype,"boilerState",2);le([M()],te.prototype,"boilerLoading",2);le([M()],te.prototype,"boilerV2Data",2);le([M()],te.prototype,"boilerConfig",2);le([M()],te.prototype,"boxHasHome56",2);le([M()],te.prototype,"analyticsData",2);le([M()],te.prototype,"chmuData",2);le([M()],te.prototype,"chmuModalOpen",2);le([M()],te.prototype,"timelineTab",2);le([M()],te.prototype,"timelineData",2);le([M()],te.prototype,"tilesConfig",2);le([M()],te.prototype,"tilesLeft",2);le([M()],te.prototype,"tilesRight",2);le([M()],te.prototype,"tileDialogOpen",2);le([M()],te.prototype,"editingTileIndex",2);le([M()],te.prototype,"editingTileSide",2);le([M()],te.prototype,"editingTileConfig",2);te=le([O("oig-app")],te);P.info("V2 starting",{version:"2.0.0-beta.1"});fl();async function mb(){try{const e=await bl(),t=document.getElementById("app");t&&(t.innerHTML="",t.appendChild(e)),P.info("V2 mounted successfully")}catch(e){P.error("V2 bootstrap failed",e);const t=document.getElementById("app");t&&(t.innerHTML=`
        <div style="padding: 20px; font-family: system-ui;">
          <h2>Chyba načítání</h2>
          <p>Nepodařilo se načíst dashboard. Zkuste obnovit stránku.</p>
          <details>
            <summary>Detaily</summary>
            <pre>${e.message}</pre>
          </details>
        </div>`)}}mb();
//# sourceMappingURL=index.js.map
