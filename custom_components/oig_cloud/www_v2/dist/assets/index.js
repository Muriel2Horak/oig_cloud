var Fo=Object.defineProperty;var Bo=(e,t,i)=>t in e?Fo(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var M=(e,t,i)=>Bo(e,typeof t!="symbol"?t+"":t,i);import{f as No,u as Ro,i as D,a as E,b as c,r as G,w as U,A as P,E as jo}from"./vendor.js";import{C as Hn,a as is,L as ns,P as rs,b as as,i as ss,p as os,c as ls,d as Ho,T as Vo,e as Wo,B as qo,f as Ko,g as Yo,h as Uo,j as Go,k as cs}from"./charts.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function i(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(r){if(r.ep)return;r.ep=!0;const a=i(r);fetch(r.href,a)}})();const yt="[V2]";function Zo(){return new Date().toISOString().substr(11,12)}function un(e,t){const i=Zo(),n=e.toUpperCase().padEnd(5);return`${i} ${n} ${t}`}const _={debug(e,t){typeof window<"u"&&window.OIG_DEBUG&&console.debug(yt,un("debug",e),t??"")},info(e,t){console.info(yt,un("info",e),t??"")},warn(e,t){console.warn(yt,un("warn",e),t??"")},error(e,t,i){const n=t?{error:t.message,stack:t.stack,...i}:i;console.error(yt,un("error",e),n??"")},time(e){console.time(`${yt} ${e}`)},timeEnd(e){console.timeEnd(`${yt} ${e}`)},group(e){console.group(`${yt} ${e}`)},groupEnd(){console.groupEnd()}};function Qo(){window.addEventListener("error",Xo),window.addEventListener("unhandledrejection",Jo),_.debug("Error handling setup complete")}function Xo(e){const t=e.error||new Error(e.message);_.error("Uncaught error",t,{filename:e.filename,lineno:e.lineno,colno:e.colno}),e.preventDefault()}function Jo(e){const t=e.reason instanceof Error?e.reason:new Error(String(e.reason));_.error("Unhandled promise rejection",t),e.preventDefault()}class ds extends Error{constructor(t,i,n=!1,r){super(t),this.code=i,this.recoverable=n,this.cause=r,this.name="AppError"}}class xi extends ds{constructor(t="Authentication failed"){super(t,"AUTH_ERROR",!1),this.name="AuthError"}}class sa extends ds{constructor(t="Network error",i){super(t,"NETWORK_ERROR",!0,i),this.name="NetworkError"}}const el="oig_v2_";function tl(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"";return/Home Assistant|HomeAssistant|HAcompanion/i.test(t)}catch{return!1}}function il(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"",i=/Android|iPhone|iPad|iPod|Mobile/i.test(t),n=globalThis.innerWidth<=768;return i||n}catch{return!1}}const Ee={isHaApp:!1,isMobile:!1,reduceMotion:!1};async function nl(){var i,n;_.info("Bootstrap starting"),Qo(),Ee.isHaApp=tl(),Ee.isMobile=il(),Ee.reduceMotion=Ee.isHaApp||Ee.isMobile||((n=(i=globalThis.matchMedia)==null?void 0:i.call(globalThis,"(prefers-reduced-motion: reduce)"))==null?void 0:n.matches)||!1;const e=document.documentElement;Ee.isHaApp&&e.classList.add("oig-ha-app"),Ee.isMobile&&e.classList.add("oig-mobile"),Ee.reduceMotion&&e.classList.add("oig-reduce-motion");const t={version:"2.0.0-beta.1",storagePrefix:el};return _.info("Bootstrap complete",{...t,isHaApp:Ee.isHaApp,isMobile:Ee.isMobile,reduceMotion:Ee.reduceMotion}),document.createElement("oig-app")}const o={bgPrimary:"var(--primary-background-color, #ffffff)",bgSecondary:"var(--secondary-background-color, #f5f5f5)",textPrimary:"var(--primary-text-color, #212121)",textSecondary:"var(--secondary-text-color, #757575)",accent:"var(--accent-color, #03a9f4)",divider:"var(--divider-color, #e0e0e0)",error:"var(--error-color, #db4437)",success:"var(--success-color, #0f9d58)",warning:"var(--warning-color, #f4b400)",cardBg:"var(--card-background-color, #ffffff)",cardShadow:"var(--shadow-elevation-2dp_-_box-shadow, 0 2px 2px 0 rgba(0,0,0,0.14))",fontFamily:"var(--primary-font-family, system-ui, sans-serif)"},oa={"--primary-background-color":"#111936","--secondary-background-color":"#1a2044","--primary-text-color":"#e1e1e1","--secondary-text-color":"rgba(255,255,255,0.7)","--accent-color":"#03a9f4","--divider-color":"rgba(255,255,255,0.12)","--error-color":"#ef5350","--success-color":"#66bb6a","--warning-color":"#ffa726","--card-background-color":"rgba(255,255,255,0.06)","--shadow-elevation-2dp_-_box-shadow":"0 2px 4px 0 rgba(0,0,0,0.4)"},la={"--primary-background-color":"#ffffff","--secondary-background-color":"#f5f5f5","--primary-text-color":"#212121","--secondary-text-color":"#757575","--accent-color":"#03a9f4","--divider-color":"#e0e0e0","--error-color":"#db4437","--success-color":"#0f9d58","--warning-color":"#f4b400","--card-background-color":"#ffffff","--shadow-elevation-2dp_-_box-shadow":"0 2px 2px 0 rgba(0,0,0,0.14)"};function tr(){var e,t;try{if(window.parent&&window.parent!==window){const i=(t=(e=window.parent.document)==null?void 0:e.querySelector("home-assistant"))==null?void 0:t.hass;if(i!=null&&i.themes){if(typeof i.themes.darkMode=="boolean")return i.themes.darkMode;const n=(i.themes.theme||"").toLowerCase();if(n.includes("dark"))return!0;if(n.includes("light"))return!1}}}catch{}return window.matchMedia("(prefers-color-scheme: dark)").matches}function ir(e){const t=e?oa:la,i=document.documentElement;for(const[n,r]of Object.entries(t))i.style.setProperty(n,r);i.classList.toggle("dark",e),document.body.style.background=e?oa["--secondary-background-color"]:la["--secondary-background-color"]}function rl(){const e=tr();ir(e),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{const i=tr();ir(i)}),setInterval(()=>{const i=tr(),n=document.documentElement.classList.contains("dark");i!==n&&ir(i)},5e3)}const ca={mobile:768,tablet:1024};function Ut(e){return e<ca.mobile?"mobile":e<ca.tablet?"tablet":"desktop"}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const O=e=>(t,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const al={attribute:!0,type:String,converter:Ro,reflect:!1,hasChanged:No},sl=(e=al,t,i)=>{const{kind:n,metadata:r}=i;let a=globalThis.litPropertyMetadata.get(r);if(a===void 0&&globalThis.litPropertyMetadata.set(r,a=new Map),n==="setter"&&((e=Object.create(e)).wrapped=!0),a.set(i.name,e),n==="accessor"){const{name:s}=i;return{set(l){const d=t.get.call(this);t.set.call(this,l),this.requestUpdate(s,d,e,!0,l)},init(l){return l!==void 0&&this.C(s,void 0,e,l),l}}}if(n==="setter"){const{name:s}=i;return function(l){const d=this[s];t.call(this,l),this.requestUpdate(s,d,e,!0,l)}}throw Error("Unsupported decorator location: "+n)};function f(e){return(t,i)=>typeof i=="object"?sl(e,t,i):((n,r,a)=>{const s=r.hasOwnProperty(a);return r.constructor.createProperty(a,n),s?Object.getOwnPropertyDescriptor(r,a):void 0})(e,t,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function T(e){return f({...e,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ol=(e,t,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof t!="object"&&Object.defineProperty(e,t,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Vn(e,t){return(i,n,r)=>{const a=s=>{var l;return((l=s.renderRoot)==null?void 0:l.querySelector(e))??null};return ol(i,n,{get(){return a(this)}})}}class ll{constructor(){this.callbacks=new Set,this.watched=new Set,this.watchedPrefixes=new Set,this.unsub=null,this.running=!1,this.getHass=null,this.activeConnection=null}registerEntities(t){for(const i of t)typeof i=="string"&&i.length>0&&this.watched.add(i)}registerPrefix(t){var n;if(typeof t!="string"||t.length===0)return;this.watchedPrefixes.add(t);const i=(n=this.getHass)==null?void 0:n.call(this);if(i!=null&&i.states){const r=Object.keys(i.states).filter(a=>a.startsWith(t));this.registerEntities(r)}}onEntityChange(t){return this.callbacks.add(t),()=>{this.callbacks.delete(t)}}async start(t){this.getHass=t.getHass;const i=this.getHass();if(!(i!=null&&i.connection)){_.debug("StateWatcher: hass not ready, retrying in 500ms"),setTimeout(()=>this.start(t),500);return}if(this.running&&this.activeConnection===i.connection){const r=t.prefixes??[];for(const a of r)this.registerPrefix(a);return}this.running&&this.stop(),this.running=!0,this.activeConnection=i.connection;const n=t.prefixes??[];for(const r of n)this.registerPrefix(r);try{this.unsub=await i.connection.subscribeEvents(r=>this.handleStateChanged(r),"state_changed"),_.info("StateWatcher started",{prefixes:n,watchedCount:this.watched.size})}catch(r){this.running=!1,this.activeConnection=null,_.error("StateWatcher failed to subscribe",r)}}stop(){if(this.running=!1,this.activeConnection=null,this.unsub)try{this.unsub()}catch{}this.unsub=null,_.info("StateWatcher stopped")}isWatched(t){return this.matchesWatched(t)}destroy(){this.stop(),this.callbacks.clear(),this.watched.clear(),this.watchedPrefixes.clear(),this.getHass=null}matchesWatched(t){if(this.watched.has(t))return!0;for(const i of this.watchedPrefixes)if(t.startsWith(i))return!0;return!1}handleStateChanged(t){var r;const i=(r=t==null?void 0:t.data)==null?void 0:r.entity_id;if(!i||!this.matchesWatched(i))return;const n=t.data.new_state;for(const a of this.callbacks)try{a(i,n)}catch{}}}const Pt=new ll;class cl{constructor(t,i=""){this.subscriptions=new Map,this.cache=new Map,this.stateWatcherUnsub=null,this.hass=t,this.inverterSn=i,this.init()}init(){var t;if((t=this.hass)!=null&&t.states)for(const[i,n]of Object.entries(this.hass.states))this.cache.set(i,n);this.stateWatcherUnsub=Pt.onEntityChange((i,n)=>{n?this.cache.set(i,n):this.cache.delete(i),this.notifySubscribers(i,n)}),_.debug("EntityStore initialized",{entities:this.cache.size,inverterSn:this.inverterSn})}getSensorId(t){return`sensor.oig_${this.inverterSn}_${t}`}findSensorId(t){const i=this.getSensorId(t);for(const n of this.cache.keys()){if(n===i)return n;if(n.startsWith(i+"_")){const r=n.substring(i.length+1);if(/^\d+$/.test(r))return n}}return i}subscribe(t,i){this.subscriptions.has(t)||this.subscriptions.set(t,new Set),this.subscriptions.get(t).add(i),Pt.registerEntities([t]);const n=this.cache.get(t)??null;return i(n),()=>{var r,a;(r=this.subscriptions.get(t))==null||r.delete(i),((a=this.subscriptions.get(t))==null?void 0:a.size)===0&&this.subscriptions.delete(t)}}getNumeric(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"&&parseFloat(i.state)||0,lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:0,lastUpdated:null,attributes:{},exists:!1}}getString(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"?i.state:"",lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:"",lastUpdated:null,attributes:{},exists:!1}}get(t){return this.cache.get(t)??null}getAll(){return Object.fromEntries(this.cache)}batchLoad(t){const i={};for(const n of t)i[n]=this.getNumeric(n);return i}updateHass(t){if(this.hass=t,t!=null&&t.states){const i=new Set(Object.keys(t.states));for(const n of Array.from(this.cache.keys()))i.has(n)||(this.cache.delete(n),this.notifySubscribers(n,null));for(const[n,r]of Object.entries(t.states)){const a=this.cache.get(n),s=r;this.cache.set(n,s),((a==null?void 0:a.state)!==s.state||(a==null?void 0:a.last_updated)!==s.last_updated)&&this.notifySubscribers(n,s)}}}notifySubscribers(t,i){const n=this.subscriptions.get(t);if(n)for(const r of n)try{r(i)}catch(a){_.error("Entity callback error",a,{entityId:t})}}destroy(){var t;(t=this.stateWatcherUnsub)==null||t.call(this),this.subscriptions.clear(),this.cache.clear(),_.debug("EntityStore destroyed")}}let Ei=null;function dl(e,t){return Ei&&Ei.destroy(),Ei=new cl(e,t),Ei}function ot(){return Ei}const ul=3,pl=1e3;class hl{constructor(){this.hass=null,this.initPromise=null}async getHass(){return this.hass?this.hass:this.initPromise?this.initPromise:(this.initPromise=this.initHass(),this.initPromise)}getHassSync(){return this.hass}async refreshHass(){const t=await this.findHass();return t?(this.hass=t,_.info("HASS client refreshed"),t):this.hass}async initHass(){_.debug("Initializing HASS client");const t=await this.findHass();return t?(this.hass=t,_.info("HASS client initialized"),t):(_.warn("HASS not found in parent context"),null)}async findHass(){var t,i;if(typeof window>"u")return null;if(window.hass)return window.hass;if(window.parent&&window.parent!==window)try{const n=(i=(t=window.parent.document)==null?void 0:t.querySelector("home-assistant"))==null?void 0:i.hass;if(n)return n}catch{_.debug("Cannot access parent HASS (cross-origin)")}return window.customPanel?window.customPanel.hass:null}async fetchWithAuth(t,i={}){var s,l;const n=await this.getHass();if(!n)throw new xi("Cannot get HASS context");try{const u=new URL(t,window.location.href).hostname;if(u!=="localhost"&&u!=="127.0.0.1"&&!t.startsWith("/api/"))throw new Error(`fetchWithAuth rejected for non-localhost URL: ${t}`)}catch(d){if(d.message.includes("rejected"))throw d}const r=(l=(s=n.auth)==null?void 0:s.data)==null?void 0:l.access_token;if(!r)throw new xi("No access token available");const a=new Headers(i.headers);return a.set("Authorization",`Bearer ${r}`),a.has("Content-Type")||a.set("Content-Type","application/json"),this.fetchWithRetry(t,{...i,headers:a})}async fetchWithRetry(t,i,n=ul){try{const r=await fetch(t,i);if(!r.ok)throw r.status===401?new xi("Token expired or invalid"):new sa(`HTTP ${r.status}: ${r.statusText}`);return r}catch(r){if(n>0&&r instanceof sa)return _.warn(`Retrying fetch (${n} left)`,{url:t}),await this.delay(pl),this.fetchWithRetry(t,i,n-1);throw r}}async callApi(t,i,n){const r=await this.getHass();if(!r)throw new xi("Cannot get HASS context");return r.callApi(t,i,n)}async callService(t,i,n){const r=await this.getHass();if(!(r!=null&&r.callService))return _.error("Cannot call service — hass not available"),!1;try{return await r.callService(t,i,n),!0}catch(a){return _.error(`Service call failed (${t}.${i})`,a),!1}}async callWS(t){const i=await this.getHass();if(!(i!=null&&i.callWS))throw new xi("Cannot get HASS context for WS call");return i.callWS(t)}async fetchOIGAPI(t,i={}){try{const n=`/api/oig_cloud${t.startsWith("/")?"":"/"}${t}`;return await(await this.fetchWithAuth(n,{...i,headers:{"Content-Type":"application/json",...Object.fromEntries(new Headers(i.headers).entries())}})).json()}catch(n){return _.error(`OIG API fetch error for ${t}`,n),null}}async loadBatteryTimeline(t,i="active"){return this.fetchOIGAPI(`/battery_forecast/${t}/timeline?type=${i}`)}async loadUnifiedCostTile(t){return this.fetchOIGAPI(`/battery_forecast/${t}/unified_cost_tile`)}async loadSpotPrices(t){return this.fetchOIGAPI(`/spot_prices/${t}/intervals`)}async loadAnalytics(t){return this.fetchOIGAPI(`/analytics/${t}`)}async loadPlannerSettings(t){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`)}async savePlannerSettings(t,i){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`,{method:"POST",body:JSON.stringify(i)})}async loadDetailTabs(t,i,n="hybrid"){return this.fetchOIGAPI(`/battery_forecast/${t}/detail_tabs?tab=${i}&plan=${n}`)}async loadModules(t){return this.fetchOIGAPI(`/${t}/modules`)}openEntityDialog(t){var i;try{const n=((i=window.parent.document)==null?void 0:i.querySelector("home-assistant"))??document.querySelector("home-assistant");if(!n)return _.warn("Cannot open entity dialog — home-assistant element not found"),!1;const r=new CustomEvent("hass-more-info",{bubbles:!0,composed:!0,detail:{entityId:t}});return n.dispatchEvent(r),!0}catch(n){return _.error("Cannot open entity dialog",n),!1}}async showNotification(t,i,n="success"){await this.callService("persistent_notification","create",{title:t,message:i,notification_id:`oig_dashboard_${Date.now()}`})||console.log(`[${n.toUpperCase()}] ${t}: ${i}`)}getToken(){var t,i,n;return((n=(i=(t=this.hass)==null?void 0:t.auth)==null?void 0:i.data)==null?void 0:n.access_token)??null}delay(t){return new Promise(i=>setTimeout(i,t))}}const te=new hl,da={solar:"#ffd54f",battery:"#4caf50",inverter:"#9575cd",grid:"#42a5f5",house:"#f06292"},wi={solar:"linear-gradient(135deg, rgba(255,213,79,0.15) 0%, rgba(255,179,0,0.08) 100%)",battery:"linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(56,142,60,0.08) 100%)",grid:"linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(33,150,243,0.08) 100%)",house:"linear-gradient(135deg, rgba(240,98,146,0.15) 0%, rgba(233,30,99,0.08) 100%)",inverter:"linear-gradient(135deg, rgba(149,117,205,0.15) 0%, rgba(126,87,194,0.08) 100%)"},pn={battery:"rgba(76,175,80,0.4)",grid:"rgba(66,165,245,0.4)",house:"rgba(240,98,146,0.4)",inverter:"rgba(149,117,205,0.4)"},Nt={solar:"#ffd54f",battery:"#ff9800",grid_import:"#f44336",grid_export:"#4caf50",house:"#f06292"},hn={solar:5400,battery:7e3,grid:17e3,house:1e4},Fr={solarPower:0,solarP1:0,solarP2:0,solarV1:0,solarV2:0,solarI1:0,solarI2:0,solarPercent:0,solarToday:0,solarForecastToday:0,solarForecastTomorrow:0,solarForecastStale:!1,batterySoC:0,batteryPower:0,batteryVoltage:0,batteryCurrent:0,batteryTemp:0,batteryChargeTotal:0,batteryDischargeTotal:0,batteryChargeSolar:0,batteryChargeGrid:0,isGridCharging:!1,timeToEmpty:"",timeToFull:"",balancingState:"standby",balancingTimeRemaining:"",gridChargingPlan:{hasBlocks:!1,totalEnergyKwh:0,totalCostCzk:0,windowLabel:null,durationMinutes:0,currentBlockLabel:null,nextBlockLabel:null,blocks:[]},gridPower:0,gridVoltage:0,gridFrequency:0,gridImportToday:0,gridExportToday:0,gridL1V:0,gridL2V:0,gridL3V:0,gridL1P:0,gridL2P:0,gridL3P:0,spotPrice:0,exportPrice:0,currentTariff:"",housePower:0,houseTodayWh:0,houseL1:0,houseL2:0,houseL3:0,nonbackupPower:0,nonbackupTodayWh:0,nonbackupL1:0,nonbackupL2:0,nonbackupL3:0,zalohaPlannedRemainingKwh:0,inverterMode:"",inverterGridMode:"unknown",inverterGridLimit:0,inverterTemp:0,bypassStatus:"off",notificationsUnread:0,notificationsError:0,boilerIsUse:!1,boilerPower:0,boilerDayEnergy:0,boilerManualMode:"",boilerInstallPower:3e3,plannerAutoMode:null,lastUpdate:""},us={home_1:"Home 1",home_2:"Home 2",home_3:"Home 3",home_ups:"Home UPS"},ua={"Home 1":"home_1","Home 2":"home_2","Home 3":"home_3","Home UPS":"home_ups","Mode 0":"home_1","Mode 1":"home_2","Mode 2":"home_3","Mode 3":"home_ups","HOME I":"home_1","HOME II":"home_2","HOME III":"home_3","HOME UPS":"home_ups",0:"home_1",1:"home_2",2:"home_3",3:"home_ups"},Oi={off:"Vypnuto",on:"Zapnuto",limited:"S omezením"},nr={Vypnuto:"off",Zapnuto:"on",Omezeno:"limited",omezeno:"limited",vypnuto:"off",zapnuto:"on",Off:"off",On:"on",Limited:"limited",off:"off",on:"on",limited:"limited",0:"off",1:"on",2:"limited"},gl={off:"🚫",on:"💧",limited:"🚰"},ps={cbb:"Inteligentní",manual:"Manuální"},hs={cbb:"🤖",manual:"👤"},pa={CBB:"cbb",Manuální:"manual",Manual:"manual",Inteligentní:"cbb"},fl={set_box_mode:"🏠 Změna režimu boxu",set_grid_delivery:"💧 Změna nastavení přetoků",set_grid_delivery_limit:"🔢 Změna limitu přetoků",set_boiler_mode:"🔥 Změna nastavení bojleru",set_formating_mode:"🔋 Změna nabíjení baterie",set_battery_capacity:"⚡ Změna kapacity baterie"},ml={CBB:"Inteligentní",Manual:"Manuální",Manuální:"Manuální"},gs={0:"Žádný",1:"Home 5",2:"Home 6",3:"Home 5 + Home 6",4:"Flexibilita"},fs={status:"idle",activity:"",queueCount:0,runningRequests:[],queuedRequests:[],allRequests:[],currentBoxMode:"home_1",currentGridDelivery:"off",currentGridLimit:0,currentBoilerMode:"cbb",pendingServices:new Map,changingServices:new Set,gridDeliveryState:{currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},supplementary:{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1}},bl="probíhá změna";function $r(e){return e.trim().toLowerCase().includes(bl)}function Br(e){const t=e.trim();if(t in nr)return nr[t];const i=t.toLowerCase(),n=Object.entries(nr).find(([r])=>r.toLowerCase()===i);return n?n[1]:i.startsWith("omez")||i.includes("limit")?"limited":i.startsWith("zapn")||i==="on"?"on":i.startsWith("vypn")||i==="off"?"off":"unknown"}function vl(e){const t=e.get("grid_mode");if(!t)return null;const i=Br(t);return i==="unknown"?null:i}function yl(e){const t=e.get("grid_limit");if(!t)return null;const i=parseInt(t,10);return Number.isFinite(i)&&i>=0?i:null}function xl(e){return e.changingServices.has("grid_mode")||e.changingServices.has("grid_limit")}function ms(e,t){const{gridModeRaw:i,gridLimit:n}=e,r=i.trim().toLowerCase(),a=r==="unavailable"||r==="unknown"||r==="",s=$r(i),l=xl(t),d=s||l;let u;a||s?u="unknown":u=Br(i);let p=null;!a&&Number.isFinite(n)&&n>=0&&(p=n);const h=vl(t.pendingServices),g=yl(t.pendingServices);return{currentLiveDelivery:u,currentLiveLimit:p,pendingDeliveryTarget:h,pendingLimitTarget:g,isTransitioning:d,isUnavailable:a}}function wl(e){return e.isTransitioning&&e.pendingDeliveryTarget?e.pendingDeliveryTarget:e.currentLiveDelivery}const ha=new URLSearchParams(window.location.search),Nr=ha.get("sn")||ha.get("inverter_sn")||"";function yn(e,t=Nr){return`sensor.oig_${t}_${e}`}function ga(e,t,i=Nr){var a;const n=yn(t,i);return n in e?n:((a=Object.keys(e).filter(s=>s.startsWith(n+"_")).map(s=>({id:s,suffix:parseInt(s.substring(n.length+1),10)})).filter(s=>Number.isFinite(s.suffix)).sort((s,l)=>s.suffix-l.suffix)[0])==null?void 0:a.id)??null}function j(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function qe(e){return!(e!=null&&e.state)||e.state==="unknown"||e.state==="unavailable"?"":e.state}function fa(e,t="on"){if(!(e!=null&&e.state))return!1;const i=e.state.toLowerCase();return i===t||i==="1"||i==="zapnuto"}function $l(e){const t=(e||"").toLowerCase();return t==="charging"?"charging":t==="balancing"||t==="holding"?"holding":t==="completed"?"completed":t==="planned"?"planned":"standby"}function _r(e){return e==="tomorrow"?"zítra":e==="today"?"dnes":""}function ma(e){if(!e)return null;const[t,i]=e.split(":").map(Number);return!Number.isFinite(t)||!Number.isFinite(i)?null:t*60+i}function _l(e){const t=Number(e.grid_import_kwh??e.grid_charge_kwh??0);if(Number.isFinite(t)&&t>0)return t;const i=Number(e.battery_start_kwh??0),n=Number(e.battery_end_kwh??0);return Number.isFinite(i)&&Number.isFinite(n)?Math.max(0,n-i):0}function bs(e=[]){return[...e].sort((t,i)=>{const n=(t.day==="tomorrow"?1:0)-(i.day==="tomorrow"?1:0);return n!==0?n:(t.time_from||"").localeCompare(i.time_from||"")})}function kl(e){if(!Array.isArray(e)||e.length===0)return null;const t=bs(e),i=t[0],n=t.at(-1),r=_r(i==null?void 0:i.day),a=_r(n==null?void 0:n.day);if(r===a){const g=r?`${r} `:"";return!(i!=null&&i.time_from)||!(n!=null&&n.time_to)?g.trim()||null:`${g}${i.time_from} – ${n.time_to}`}const s=r?`${r} `:"",l=a?`${a} `:"",d=(i==null?void 0:i.time_from)||"--",u=(n==null?void 0:n.time_to)||"--",p=i?`${s}${d}`:"--",h=n?`${l}${u}`:"--";return`${p} → ${h}`}function Sl(e){if(!Array.isArray(e)||e.length===0)return 0;let t=0;return e.forEach(i=>{const n=ma(i.time_from),r=ma(i.time_to);if(n===null||r===null)return;const a=r-n;a>0&&(t+=a)}),t}function ba(e){const t=_r(e.day),i=t?`${t} `:"",n=e.time_from||"--",r=e.time_to||"--";return`${i}${n} - ${r}`}function Cl(e){const t=e.find(r=>{const a=(r.status||"").toLowerCase();return a==="running"||a==="active"})||null,i=t?e[e.indexOf(t)+1]||null:e[0]||null;return{runningBlock:t,upcomingBlock:i,shouldShowNext:!!(i&&(!t||i!==t))}}function Pl(e){const t=(e==null?void 0:e.attributes)||{},i=Array.isArray(t.charging_blocks)?t.charging_blocks:[],n=bs(i),r=Number(t.total_energy_kwh)||0,a=r>0?r:n.reduce((m,b)=>m+_l(b),0),s=Number(t.total_cost_czk)||0,l=s>0?s:n.reduce((m,b)=>m+Number(b.total_cost_czk||0),0),d=kl(n),u=Sl(n),{runningBlock:p,upcomingBlock:h,shouldShowNext:g}=Cl(n);return{hasBlocks:n.length>0,totalEnergyKwh:a,totalCostCzk:l,windowLabel:d,durationMinutes:u,currentBlockLabel:p?ba(p):null,nextBlockLabel:g&&h?ba(h):null,blocks:n}}function Tl(e,t=Nr){var ea,ta,ia,na;const i=(e==null?void 0:e.states)||e||{},n=er=>i[yn(er,t)]||null,r=j(n("actual_fv_p1")),a=j(n("actual_fv_p2")),s=j(n("extended_fve_voltage_1")),l=j(n("extended_fve_voltage_2")),d=j(n("extended_fve_current_1")),u=j(n("extended_fve_current_2")),p=n("solar_forecast"),h=er=>{var aa;const dn=(aa=p==null?void 0:p.attributes)==null?void 0:aa[er];if(dn==null||dn==="")return null;const ra=parseFloat(dn);return Number.isFinite(ra)?ra:null},g=h("today_total_kwh")??h("today_total_sum_kw")??j(p),m=h("tomorrow_total_kwh")??h("tomorrow_total_sum_kw")??0,b=((ea=p==null?void 0:p.attributes)==null?void 0:ea.forecast_stale)===!0,v=j(n("batt_bat_c")),w=j(n("batt_batt_comp_p")),x=j(n("extended_battery_voltage")),y=j(n("extended_battery_current")),S=j(n("extended_battery_temperature")),H=j(n("computed_batt_charge_energy_today")),N=j(n("computed_batt_discharge_energy_today")),K=j(n("computed_batt_charge_fve_energy_today")),$=j(n("computed_batt_charge_grid_energy_today")),A=n("grid_charging_planned"),B=fa(A),k=qe(n("time_to_empty")),Z=qe(n("time_to_full")),R=n("battery_balancing"),ne=$l((ta=R==null?void 0:R.attributes)==null?void 0:ta.current_state),Le=qe({state:(ia=R==null?void 0:R.attributes)==null?void 0:ia.time_remaining}),bi=Pl(A),vi=j(n("actual_aci_wtotal")),Pe=j(n("extended_grid_voltage")),F=j(n("ac_in_aci_f")),ae=j(n("ac_in_ac_ad")),be=j(n("ac_in_ac_pd")),yi=j(n("ac_in_aci_vr")),Ne=j(n("ac_in_aci_vs")),We=j(n("ac_in_aci_vt")),to=j(n("actual_aci_wr")),io=j(n("actual_aci_ws")),no=j(n("actual_aci_wt")),ro=j(n("spot_price_current_15min")),ao=j(n("export_price_current_15min")),so=qe(n("current_tariff")),oo=j(n("actual_aco_p")),lo=j(n("ac_out_en_day")),co=j(n("ac_out_aco_pr")),uo=j(n("ac_out_aco_ps")),po=j(n("ac_out_aco_pt")),ho=j(n("actual_acinb_wtotal")),go=j(n("computed_nonbackup_consumption_today")),fo=j(n("actual_acinb_wr")),mo=j(n("actual_acinb_ws")),bo=j(n("actual_acinb_wt")),Zn=n("battery_forecast"),vo=Number((na=Zn==null?void 0:Zn.attributes)==null?void 0:na.planned_consumption_today)||0,yo=qe(n("box_prms_mode")),xo=ga(i,"invertor_prms_to_grid",t)||yn("invertor_prms_to_grid",t),wo=ga(i,"invertor_prm1_p_max_feed_grid",t)||yn("invertor_prm1_p_max_feed_grid",t),Qn=i[xo],Xn=i[wo],$o=(Qn==null?void 0:Qn.state)??"",_o=parseFloat((Xn==null?void 0:Xn.state)??"")||0,Jr=ms({gridModeRaw:$o,gridLimit:_o},{pendingServices:new Map,changingServices:new Set}),ko=Jr.currentLiveDelivery,So=Jr.currentLiveLimit??0,Co=j(n("box_temp")),Po=qe(n("bypass_status"))||"off",To=j(n("notification_count_unread")),Mo=j(n("notification_count_error")),Jn=n("boiler_is_use"),Do=Jn?fa(Jn)||qe(Jn)==="Zapnuto":!1,Eo=j(n("boiler_current_cbb_w")),Oo=j(n("boiler_day_w")),zo=qe(n("boiler_manual_mode")),Ao=j(n("boiler_install_power"))||3e3,Lo=n("real_data_update"),Io=qe(Lo);return{solarPower:r+a,solarP1:r,solarP2:a,solarV1:s,solarV2:l,solarI1:d,solarI2:u,solarPercent:j(n("dc_in_fv_proc")),solarToday:j(n("dc_in_fv_ad")),solarForecastToday:g,solarForecastTomorrow:m,solarForecastStale:b,batterySoC:v,batteryPower:w,batteryVoltage:x,batteryCurrent:y,batteryTemp:S,batteryChargeTotal:H,batteryDischargeTotal:N,batteryChargeSolar:K,batteryChargeGrid:$,isGridCharging:B,timeToEmpty:k,timeToFull:Z,balancingState:ne,balancingTimeRemaining:Le,gridChargingPlan:bi,gridPower:vi,gridVoltage:Pe,gridFrequency:F,gridImportToday:ae,gridExportToday:be,gridL1V:yi,gridL2V:Ne,gridL3V:We,gridL1P:to,gridL2P:io,gridL3P:no,spotPrice:ro,exportPrice:ao,currentTariff:so,housePower:oo,houseTodayWh:lo,houseL1:co,houseL2:uo,houseL3:po,nonbackupPower:ho,nonbackupTodayWh:go,nonbackupL1:fo,nonbackupL2:mo,nonbackupL3:bo,zalohaPlannedRemainingKwh:vo,inverterMode:yo,inverterGridMode:ko,inverterGridLimit:So,inverterTemp:Co,bypassStatus:Po,notificationsUnread:To,notificationsError:Mo,boilerIsUse:Do,boilerPower:Eo,boilerDayEnergy:Oo,boilerManualMode:zo,boilerInstallPower:Ao,plannerAutoMode:null,lastUpdate:Io}}const $i={};function gn(e,t,i){const n=Math.abs(e),r=Math.min(100,n/t*100),a=Math.max(500,Math.round(3500-r*30));let s=a;return i&&$i[i]!==void 0&&(s=Math.round(.3*a+(1-.3)*$i[i]),Math.abs(s-$i[i])<100&&(s=$i[i])),i&&($i[i]=s),{active:n>=50,intensity:r,count:Math.max(1,Math.min(4,Math.ceil(1+r/33))),speed:s,size:Math.round(6+r/10),opacity:Math.min(1,.3+r/150)}}function tt(e){return Math.abs(e)>=1e3?`${(e/1e3).toFixed(1)} kW`:`${Math.round(e)} W`}function it(e){return e>=1e3?`${(e/1e3).toFixed(2)} kWh`:`${Math.round(e)} Wh`}function Ml(e){return e==="VT"||e.includes("vysoký")?"⚡ VT":e==="NT"||e.includes("nízký")?"🌙 NT":e?`⏰ ${e}`:"--"}function Dl(e){return e.includes("Home 1")?{icon:"🏠",text:"Home 1"}:e.includes("Home 2")?{icon:"🔋",text:"Home 2"}:e.includes("Home 3")?{icon:"☀️",text:"Home 3"}:e.includes("UPS")?{icon:"⚡",text:"Home UPS"}:{icon:"⚙️",text:e||"--"}}function El(e){return e==="off"?{display:"Vypnuto",icon:"🚫"}:e==="on"?{display:"Zapnuto",icon:"💧"}:e==="limited"?{display:"Omezeno",icon:"🚰"}:{display:"--",icon:"💧"}}const Ol={"HOME I":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"HOME II":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"HOME III":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"rgba(158, 158, 158, 0.18)",label:"DO NOTHING"},"Mode 0":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"Mode 1":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"Mode 2":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"Mode 3":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"}},va={timeline:[],labels:[],prices:[],exportPrices:[],modeSegments:[],cheapestBuyBlock:null,expensiveBuyBlock:null,bestExportBlock:null,worstExportBlock:null,solar:null,battery:null,initialZoomStart:null,initialZoomEnd:null,currentSpotPrice:0,currentExportPrice:0,plannedConsumption:null,whatIf:null,solarForecastTotal:0,solarForecastTomorrow:0,solarForecastStale:!1},ya=new URLSearchParams(window.location.search),kr=ya.get("sn")||ya.get("inverter_sn")||"";function Qt(e){return`sensor.oig_${kr}_${e}`}function xa(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function Sr(e){const t=e.getFullYear(),i=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0"),r=String(e.getHours()).padStart(2,"0"),a=String(e.getMinutes()).padStart(2,"0"),s=String(e.getSeconds()).padStart(2,"0");return`${t}-${i}-${n}T${r}:${a}:${s}`}const wn={},zl=5*60*1e3;async function Al(e="hybrid"){const t=wn[e];if(t&&Date.now()-t.ts<zl)return _.debug("Timeline cache hit",{plan:e,age:Math.round((Date.now()-t.ts)/1e3)}),t.data;try{const i=await te.getHass();if(!i)return[];let n;i.callApi?n=await i.callApi("GET",`oig_cloud/battery_forecast/${kr}/timeline?type=active`):n=await te.fetchOIGAPI(`battery_forecast/${kr}/timeline?type=active`);const r=(n==null?void 0:n.active)||(n==null?void 0:n.timeline)||[];return wn[e]={data:r,ts:Date.now()},_.info("Timeline fetched",{plan:e,points:r.length}),r}catch(i){return _.error("Failed to fetch timeline",i),[]}}function Ll(e){Object.keys(wn).forEach(t=>delete wn[t])}function Il(e){const t=new Date,i=new Date(t);return i.setMinutes(Math.floor(t.getMinutes()/15)*15,0,0),e.filter(n=>new Date(n.timestamp)>=i)}function Fl(e){return e.map(t=>{if(!t.timestamp)return new Date;try{const[i,n]=t.timestamp.split("T");if(!i||!n)return new Date;const[r,a,s]=i.split("-").map(Number),[l,d,u=0]=n.split(":").map(Number);return new Date(r,a-1,s,l,d,u)}catch{return new Date}})}function Bl(e){const t=e.mode_name||e.mode_planned||e.mode||e.mode_display||null;if(!t||typeof t!="string")return null;const i=t.trim();return i.length?i:null}function Nl(e){return e.startsWith("HOME ")?e.replace("HOME ","").trim():e==="FULL HOME UPS"||e==="HOME UPS"?"UPS":e==="DO NOTHING"?"DN":e.substring(0,3).toUpperCase()}function Rl(e){return Ol[e]||{icon:"❓",color:"rgba(158, 158, 158, 0.15)",label:e}}function jl(e){if(!e.length)return[];const t=[];let i=null;for(const n of e){const r=Bl(n);if(!r){i=null;continue}const a=new Date(n.timestamp),s=new Date(a.getTime()+15*60*1e3);if(i!==null&&i.mode===r)i.end=s;else{const l={mode:r,start:a,end:s};t.push(l),i=l}}return t.map(n=>{const r=Rl(n.mode);return{...n,icon:r.icon,color:r.color,label:r.label,shortLabel:Nl(n.mode)}})}function fn(e,t,i=3){const n=Math.floor(i*60/15);if(e.length<n)return null;let r=null,a=t?1/0:-1/0;for(let s=0;s<=e.length-n;s++){const l=e.slice(s,s+n),d=l.map(p=>p.price),u=d.reduce((p,h)=>p+h,0)/d.length;(t&&u<a||!t&&u>a)&&(a=u,r={start:l[0].timestamp,end:l[l.length-1].timestamp,avg:u,min:Math.min(...d),max:Math.max(...d),values:d,type:"cheapest-buy"})}return r}function Hl(e,t){const n=((e==null?void 0:e.states)||{})[Qt("solar_forecast")];if(!(n!=null&&n.attributes)||!t.length)return null;const r=n.attributes,a=r.today_total_kwh||0,s=r.tomorrow_total_kwh||0,l=r.forecast_stale===!0,d=r.today_hourly_string1_kw||{},u=r.tomorrow_hourly_string1_kw||{},p=r.today_hourly_string2_kw||{},h=r.tomorrow_hourly_string2_kw||{},g={...d,...u},m={...p,...h},b=(x,y,S)=>x==null||y==null?x||y||0:x+(y-x)*S,v=[],w=[];for(const x of t){const y=x.getHours(),S=x.getMinutes(),H=new Date(x);H.setMinutes(0,0,0);const N=Sr(H),K=new Date(H);K.setHours(y+1);const $=Sr(K),A=g[N]||0,B=g[$]||0,k=m[N]||0,Z=m[$]||0,R=S/60;v.push(b(A,B,R)),w.push(b(k,Z,R))}return{string1:v,string2:w,todayTotal:a,tomorrowTotal:s,stale:l,hasString1:v.some(x=>x>0),hasString2:w.some(x=>x>0)}}function Vl(e,t){if(!e.length)return{arrays:{baseline:[],solarCharge:[],gridCharge:[],gridNet:[],consumption:[]},initialZoomStart:null,initialZoomEnd:null};const i=e.map(h=>new Date(h.timestamp)),n=i[0].getTime(),r=i[i.length-1],a=r?r.getTime():n,s=[],l=[],d=[],u=[],p=[];for(const h of t){const g=Sr(h),m=e.find(b=>b.timestamp===g);if(m){const b=(m.battery_capacity_kwh??m.battery_soc??m.battery_start)||0,v=m.solar_charge_kwh||0,w=m.grid_charge_kwh||0,x=typeof m.grid_net=="number"?m.grid_net:(m.grid_import||0)-(m.grid_export||0),y=m.load_kwh??m.consumption_kwh??m.load??0,S=(Number(y)||0)*4;s.push(b-v-w),l.push(v),d.push(w),u.push(x),p.push(S)}else s.push(null),l.push(null),d.push(null),u.push(null),p.push(null)}return{arrays:{baseline:s,solarCharge:l,gridCharge:d,gridNet:u,consumption:p},initialZoomStart:n,initialZoomEnd:a}}function Wl(e){const t=(e==null?void 0:e.states)||{},i=t[Qt("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const n=i.attributes,r=n.planned_consumption_today??null,a=n.planned_consumption_tomorrow??null,s=n.profile_today||"Žádný profil",l=t[Qt("ac_out_en_day")],d=l==null?void 0:l.state,p=(d&&d!=="unavailable"&&parseFloat(d)||0)/1e3,h=p+(r||0),g=(r||0)+(a||0);let m=null;if(h>0&&a!=null){const v=a-h,w=v/h*100;Math.abs(w)<5?m="Zítra podobně":v>0?m=`Zítra více (+${Math.abs(w).toFixed(0)}%)`:m=`Zítra méně (-${Math.abs(w).toFixed(0)}%)`}return{todayConsumedKwh:p,todayPlannedKwh:r,todayTotalKwh:h,tomorrowKwh:a,totalPlannedKwh:g,profile:s!=="Žádný profil"&&s!=="Neznámý profil"?s:"Žádný profil",trendText:m}}function ql(e){const i=((e==null?void 0:e.states)||{})[Qt("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const r=i.attributes.mode_optimization||{},a=r.alternatives||{},s=r.total_cost_czk||0,l=r.total_savings_vs_home_i_czk||0,d=a["DO NOTHING"],u=(d==null?void 0:d.current_mode)||null;return{totalCost:s,totalSavings:l,alternatives:a,activeMode:u}}async function Kl(e,t="hybrid"){const i=performance.now();_.info("[Pricing] loadPricingData START");try{const n=await Al(t),r=Il(n);if(!r.length)return _.warn("[Pricing] No timeline data"),va;const a=r.map(ne=>({timestamp:ne.timestamp,price:ne.spot_price_czk||0})),s=r.map(ne=>({timestamp:ne.timestamp,price:ne.export_price_czk||0}));let l=Fl(a);const d=jl(r),u=fn(a,!0,3);u&&(u.type="cheapest-buy");const p=fn(a,!1,3);p&&(p.type="expensive-buy");const h=fn(s,!1,3);h&&(h.type="best-export");const g=fn(s,!0,3);g&&(g.type="worst-export");const m=r.map(ne=>new Date(ne.timestamp)),b=new Set([...l,...m].map(ne=>ne.getTime()));l=Array.from(b).sort((ne,Le)=>ne-Le).map(ne=>new Date(ne));const{arrays:v,initialZoomStart:w,initialZoomEnd:x}=Vl(r,l),y=Hl(e,l),S=(e==null?void 0:e.states)||{},H=xa(S[Qt("spot_price_current_15min")]),N=xa(S[Qt("export_price_current_15min")]),K=Wl(e),$=ql(e),A=(y==null?void 0:y.todayTotal)||0,B=(y==null?void 0:y.tomorrowTotal)||0,k=(y==null?void 0:y.stale)||!1,Z={timeline:r,labels:l,prices:a,exportPrices:s,modeSegments:d,cheapestBuyBlock:u,expensiveBuyBlock:p,bestExportBlock:h,worstExportBlock:g,solar:y,battery:v,initialZoomStart:w,initialZoomEnd:x,currentSpotPrice:H,currentExportPrice:N,plannedConsumption:K,whatIf:$,solarForecastTotal:A,solarForecastTomorrow:B,solarForecastStale:k},R=(performance.now()-i).toFixed(0);return _.info(`[Pricing] loadPricingData COMPLETE in ${R}ms`,{points:r.length,segments:d.length}),Z}catch(n){return _.error("[Pricing] loadPricingData failed",n),va}}const Yl=120,Cr={workday_spring:"Pracovní den - Jaro",workday_summer:"Pracovní den - Léto",workday_autumn:"Pracovní den - Podzim",workday_winter:"Pracovní den - Zima",weekend_spring:"Víkend - Jaro",weekend_summer:"Víkend - Léto",weekend_autumn:"Víkend - Podzim",weekend_winter:"Víkend - Zima"},Rr={fve:"#4CAF50",overflow:"#8BC34A",grid:"#FF9800",discharge:"#2196F3"},Ul={fve:"FVE",grid:"Síť",alternative:"Alternativa"},Gl={fve:"fve",pv:"fve",overflow:"overflow",grid:"grid",alternative:"grid",alt:"grid",battery:"battery"},Zl={fve:"fve",pv:"fve",overflow:"overflow",grid:"grid",alternative:"grid",alt:"grid",discharge:"discharge",discharging:"discharge"};function rr(e){if(e==null||e==="")return{source:null,sourceInvalid:!1};const t=Gl[e.toLowerCase()];return t!==void 0?{source:t,sourceInvalid:!1}:{source:null,sourceInvalid:!0}}function ar(e){return e==null||e===""?null:Zl[e.toLowerCase()]??null}const Ql=new Set(["temperature_unavailable","temperature_stale","source_stale","activity_stale","source_invalid","power_sign_mismatch_charge","power_sign_mismatch_discharge","runtime_cache_empty"]);function sr(e){return e.filter(t=>Ql.has(t))}const Pr=new URLSearchParams(window.location.search);let Tr=Pr.get("sn")||Pr.get("inverter_sn")||"",or=Pr.get("entry_id")||"";function Xl(e,t,i){return isNaN(e)?t:Math.max(t,Math.min(i,e))}function Jl(e,t,i){if(e==null)return null;const n=t-i;if(n<=0)return null;const r=(e-i)/n*100;return Xl(r,0,100)}function $n(e){if(!e)return"--:--";const t=e instanceof Date?e:new Date(e);return isNaN(t.getTime())?"--:--":t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}function wa(e){if(!e)return"--";const t=new Date(e);return isNaN(t.getTime())?"--":t.toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}function Mr(e,t){return`${$n(e)}–${$n(t)}`}function $a(e){return Ul[e||""]||e||"--"}function vs(e){return e?Object.values(e).reduce((t,i)=>t+(parseFloat(String(i))||0),0):0}function ys(e){return e?Object.entries(e).map(([i,n])=>({hour:parseInt(i,10),value:parseFloat(String(n))||0})).filter(i=>isFinite(i.value)).sort((i,n)=>n.value-i.value).slice(0,3).filter(i=>i.value>0).map(i=>i.hour).sort((i,n)=>i-n):[]}function _i(e){if(!e)return null;const t=e.split(":").map(i=>parseInt(i,10));return t.length<2||!isFinite(t[0])||!isFinite(t[1])?null:t[0]*60+t[1]}function _a(e,t,i){return t===null||i===null?!1:t<=i?e>=t&&e<i:e>=t||e<i}async function ec(){var e,t,i,n,r;try{if(!or||!Tr)return _.warn("[Boiler] No entry_id or inverter_sn — cannot fetch boiler canonical"),{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null};const a=await te.fetchOIGAPI(`/boiler/${or}/${Tr}`);if(!a)return{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null};let s=!1,l=null;try{const u=await te.fetchOIGAPI(`/${or}/boiler_profile`);u!=null&&u.config?l=u.config:s=!0}catch{s=!0}const d={state:{current_temp:((e=a.current_state.temperatures)==null?void 0:e.upper_zone)??((t=a.current_state.temperatures)==null?void 0:t.top),target_temp:void 0,heating:a.current_state.heating,temperatures:a.current_state.temperatures,energy_state:a.current_state.energy_state,recommended_source:a.selected_source||a.current_state.recommended_source||void 0,circulation_recommended:!1},slots:a.plan_slots.map(u=>({start:u.start,end:u.end,consumption_kwh:u.consumption_kwh,avg_consumption_kwh:u.consumption_kwh,recommended_source:u.recommended_source,spot_price:u.spot_price??void 0})),total_consumption_kwh:a.plan_slots.reduce((u,p)=>u+(p.consumption_kwh||0),0),fve_kwh:((i=a.current_state.energy_tracking)==null?void 0:i.fve_kwh)??0,grid_kwh:((n=a.current_state.energy_tracking)==null?void 0:n.grid_kwh)??0,alt_kwh:((r=a.current_state.energy_tracking)==null?void 0:r.alt_kwh)??0,next_slot:a.plan_slots[0]||void 0,profiles:{}};return{profileData:d,planData:d,canonical:a,configProfileUnavailable:s,boilerProfileConfig:l}}catch(a){return _.warn("[Boiler] Failed to fetch canonical",{err:a}),{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null}}}function tc(e,t,i){const n=e||t,r=n==null?void 0:n.state,a=(r==null?void 0:r.temperatures)||{},s=(r==null?void 0:r.energy_state)||{},l=isFinite(a.upper_zone??a.top)?a.upper_zone??a.top??null:null,d=isFinite(a.lower_zone??a.bottom)?a.lower_zone??a.bottom??null:null,u=isFinite(s.avg_temp)?s.avg_temp??null:null,p=isFinite(s.energy_needed_kwh)?s.energy_needed_kwh??null:null,h=i.targetTempC??60,g=i.coldInletTempC??10,m=Jl(u,h,g),b=(e==null?void 0:e.slots)||[],v=(e==null?void 0:e.next_slot)||ic(b);let w="Neplánováno";if(v){const y=$a(v.recommended_source);w=`${Mr(v.start,v.end)} (${y})`}const x=$a((r==null?void 0:r.recommended_source)||(v==null?void 0:v.recommended_source));return{currentTemp:isFinite(r==null?void 0:r.current_temp)?(r==null?void 0:r.current_temp)??null:null,targetTemp:(r==null?void 0:r.target_temp)||h,heating:(r==null?void 0:r.heating)||!1,tempTop:l,tempBottom:d,avgTemp:u,heatingPercent:m,energyNeeded:p,planCost:(e==null?void 0:e.estimated_cost_czk)??null,nextHeating:w,recommendedSource:x,nextProfile:(r==null?void 0:r.next_profile)||"",nextStart:(r==null?void 0:r.next_start)||""}}function ic(e){if(!Array.isArray(e))return null;const t=Date.now();return e.find(i=>{const n=new Date(i.end||i.end_time||"").getTime(),r=i.consumption_kwh??i.avg_consumption_kwh??0;return n>t&&r>0})||null}function nc(e){var g,m,b;if(!((g=e==null?void 0:e.slots)!=null&&g.length))return null;const t=e.slots.map(v=>({start:v.start||"",end:v.end||"",consumptionKwh:v.consumption_kwh??v.avg_consumption_kwh??0,recommendedSource:v.recommended_source||"",spotPrice:isFinite(v.spot_price)?v.spot_price??null:null,tempTop:v.temp_top,soc:v.soc})),i=t.filter(v=>v.consumptionKwh>0),n=parseFloat(String(e.total_consumption_kwh))||0,r=parseFloat(String(e.fve_kwh))||0,a=parseFloat(String(e.grid_kwh))||0,s=parseFloat(String(e.alt_kwh))||0,l=parseFloat(String(e.estimated_cost_czk))||0;let d="Mix: --";if(n>0){const v=Math.round(r/n*100),w=Math.round(a/n*100),x=Math.round(s/n*100);d=`Mix: FVE ${v}% · Síť ${w}% · Alt ${x}%`}const u=t.filter(v=>v.consumptionKwh>0&&v.spotPrice!==null).map(v=>({slot:v,price:v.spotPrice}));let p="--",h="--";if(u.length){const v=u.reduce((x,y)=>y.price<x.price?y:x),w=u.reduce((x,y)=>y.price>x.price?y:x);p=`${Mr(v.slot.start,v.slot.end)} (${v.price.toFixed(2)} Kč/kWh)`,h=`${Mr(w.slot.start,w.slot.end)} (${w.price.toFixed(2)} Kč/kWh)`}return{slots:t,totalConsumptionKwh:n,fveKwh:r,gridKwh:a,altKwh:s,estimatedCostCzk:l,nextSlot:e.next_slot?{start:e.next_slot.start||"",end:e.next_slot.end||"",consumptionKwh:e.next_slot.consumption_kwh||0,recommendedSource:e.next_slot.recommended_source||"",spotPrice:e.next_slot.spot_price??null}:null,planStart:wa((m=e.slots[0])==null?void 0:m.start),planEnd:wa((b=e.slots[e.slots.length-1])==null?void 0:b.end),sourceDigest:d,activeSlotCount:i.length,cheapestSpot:p,mostExpensiveSpot:h}}function rc(e){const t=parseFloat(String(e==null?void 0:e.fve_kwh))||0,i=parseFloat(String(e==null?void 0:e.grid_kwh))||0,n=parseFloat(String(e==null?void 0:e.alt_kwh))||0,r=t+i+n;return{fveKwh:t,gridKwh:i,altKwh:n,fvePercent:r>0?t/r*100:0,gridPercent:r>0?i/r*100:0,altPercent:r>0?n/r*100:0}}function ac(e,t,i){var g;const n=(e==null?void 0:e.summary)||{},r=(g=e==null?void 0:e.profiles)==null?void 0:g[i],a=(r==null?void 0:r.hourly_avg)||{},s=n.predicted_total_kwh??vs(a),l=n.peak_hours??ys(a),d=isFinite(n.water_liters_40c)?n.water_liters_40c??null:null,u=n.circulation_windows||[],p=u.length?u.map(m=>`${m.start}–${m.end}`).join(", "):"--";let h="--";if(u.length){const m=new Date,b=m.getHours()*60+m.getMinutes();if(u.some(w=>{const x=_i(w.start),y=_i(w.end);return _a(b,x,y)})){const w=u.find(x=>{const y=_i(x.start),S=_i(x.end);return _a(b,y,S)});h=w?`ANO (do ${w.end})`:"ANO"}else{const w=t==null?void 0:t.state,x=w==null?void 0:w.circulation_recommended;let y=1/0,S=null;for(const H of u){const N=_i(H.start);if(N===null)continue;let K=N-b;K<0&&(K+=24*60),K<y&&(y=K,S=H)}x&&S?h=`DOPORUČENO (${S.start}–${S.end})`:S?h=`Ne (další ${S.start}–${S.end})`:h="Ne"}}return{predictedTodayKwh:s,peakHours:l,waterLiters40c:d,circulationWindows:p,circulationNow:h}}function sc(e){const t=e??{},i=isFinite(t.volume_l)?t.volume_l??null:null,n=isFinite(t.heater_power_kw)?t.heater_power_kw??null:null,r=n!==null?n*1e3:null;return{volumeL:i,heaterPowerW:r,heaterPowerKw:n,targetTempC:isFinite(t.target_temp_c)?t.target_temp_c??null:null,deadlineTime:t.deadline_time||"--:--",stratificationMode:t.stratification_mode||"--",kCoefficient:i?(i*.001163).toFixed(4):"--",coldInletTempC:isFinite(t.cold_inlet_temp_c)?t.cold_inlet_temp_c??10:10,auraMaxTempC:isFinite(t.aura_max_temp_c)?t.aura_max_temp_c??null:null}}function oc(e){return e!=null&&e.profiles?Object.entries(e.profiles).map(([t,i])=>({id:t,name:i.name||t,targetTemp:i.target_temp||55,startTime:i.start_time||"06:00",endTime:i.end_time||"22:00",days:i.days||[1,1,1,1,1,0,0],enabled:i.enabled!==!1})):[]}function lc(e){var n;const t=[],i=((n=e==null?void 0:e.summary)==null?void 0:n.today_hours)||[];for(let r=0;r<24;r++){const a=i.includes(r);t.push({hour:r,temp:a?55:25,heating:a})}return t}function cc(e,t){var s;const i=(s=e==null?void 0:e.profiles)==null?void 0:s[t],n=["Po","Út","St","Čt","Pá","So","Ne"];if(!i)return n.map(l=>({day:l,hours:Array(24).fill(0)}));const r=i.heatmap||[];let a=[];if(r.length>0)a=r.map(l=>l.map(d=>d&&typeof d=="object"?parseFloat(d.consumption)||0:parseFloat(String(d))||0));else{const l=i.hourly_avg||{};a=Array.from({length:7},()=>Array.from({length:24},(d,u)=>parseFloat(String(l[u]||0))))}return n.map((l,d)=>({day:l,hours:a[d]||Array(24).fill(0)}))}function dc(e,t){var u;const i=(u=e==null?void 0:e.profiles)==null?void 0:u[t],n=(e==null?void 0:e.summary)||{},r=(i==null?void 0:i.hourly_avg)||{},a=Array.from({length:24},(p,h)=>parseFloat(String(r[h]||0))),s=n.predicted_total_kwh??vs(r),l=n.peak_hours??ys(r),d=isFinite(n.avg_confidence)?n.avg_confidence??null:null;return{hourlyAvg:a,peakHours:l,predictedTotalKwh:s,confidence:d,daysTracked:7}}function uc(e,t){var p,h,g;if(!((p=e==null?void 0:e.slots)!=null&&p.length)||!(t!=null&&t.length))return{fve:"--",grid:"--"};const i=(h=e.slots[0])==null?void 0:h.start,n=(g=e.slots[e.slots.length-1])==null?void 0:g.end,r=i?new Date(i).getTime():null,a=n?new Date(n).getTime():null,s=t.filter(m=>{if(!r||!a)return!0;const b=m.timestamp||m.time;if(!b)return!1;const v=new Date(b).getTime();return v>=r&&v<=a}),l=m=>{const b=[];let v=null;for(const w of s){const x=w.timestamp||w.time;if(!x)continue;const y=new Date(x),S=m(w);S&&!v?v={start:y,end:y}:S&&v?v.end=y:!S&&v&&(b.push(v),v=null)}return v&&b.push(v),b.length?b.map(w=>`${$n(w.start)}–${$n(new Date(w.end.getTime()+15*6e4))}`).join(", "):"--"},d=l(m=>(parseFloat(m.solar_kwh??m.solar_charge_kwh??0)||0)>0),u=l(m=>(parseFloat(m.grid_charge_kwh??0)||0)>0);return{fve:d,grid:u}}async function pc(){return _.info("[Boiler] Planning heating..."),await te.callService("oig_cloud","plan_boiler_heating",{})}async function hc(){return _.info("[Boiler] Applying plan..."),await te.callService("oig_cloud","apply_boiler_plan",{})}async function gc(){return _.info("[Boiler] Canceling plan..."),await te.callService("oig_cloud","cancel_boiler_plan",{})}const fc=new Set(["charging_fve","charging_overflow","charging_grid","discharging","standby","unknown"]);function ka(e){return e&&fc.has(e)?e:"unknown"}function mc(e){return e==="on"?"on":e==="off"?"off":"unavailable"}function bc(e,t=!1){var $,A,B;const i={entryId:null,boxId:null,available:!1};if(!e)return{status:null,planSlots:[],explanation:null,manualOverride:null,identity:i,activity:null,sourceSegments:[],timeline:[],sparkline:null,demandMap:null,loading:!1,loadError:"Nepodařilo se načíst data bojleru"};const n=e.current_state,r=n.temperatures??{},a=isFinite(r.top)?r.top??null:isFinite(r.upper_zone)?r.upper_zone??null:null,s=isFinite(r.bottom)?r.bottom??null:isFinite(r.lower_zone)?r.lower_zone??null:null,l={currentState:n.heating?"heating":"idle",comfortSatisfied:e.comfort_status.comfort_satisfied,comfortStatusCode:e.comfort_status.comfort_status_code,selectedSource:rr(e.selected_source).source,actuatedSource:rr(e.actuated_source).source,temperatureTop:a,temperatureBottom:s,energyNeededKwh:isFinite(($=n.energy_state)==null?void 0:$.energy_needed_kwh)?((A=n.energy_state)==null?void 0:A.energy_needed_kwh)??null:null,heating:n.heating,lastUpdate:n.last_update??null,degraded:e.degraded_flags.degraded,degradedFlags:sr(e.degraded_flags.flags??[])},d=(e.plan_slots??[]).map(k=>{const{source:Z,sourceInvalid:R}=rr(k.recommended_source);return{start:k.start,end:k.end,consumptionKwh:k.consumption_kwh,confidence:k.confidence,recommendedSource:Z,sourceInvalid:R||null,spotPrice:isFinite(k.spot_price)?k.spot_price??null:null,altPrice:isFinite(k.alt_price)?k.alt_price??null:null,overflowAvailable:k.overflow_available,heatingKwh:k.heating_kwh??null,pvKwh:k.pv_kwh??null,gridKwh:k.grid_kwh??null,altKwh:k.alt_kwh??null,expectedTempTopC:k.predicted_temperature_c??null,comfortSatisfied:k.comfort_satisfied??null,estimatedCostCzk:k.estimated_cost_czk??null,pvShare:typeof k.pv_share=="number"?k.pv_share:k.consumption_kwh&&k.pv_contribution_kwh!=null?k.pv_contribution_kwh/k.consumption_kwh:null}}),u=sr(e.degraded_flags.flags??[]),p=t?[...u,"config_profile_unavailable"]:u,h=e.freshness??{},g={reasonCodes:e.reason_codes??[],planCreatedAt:h.plan_created_at??null,planValidUntil:h.plan_valid_until??null,dataAgeSecs:isFinite(h.data_age_seconds)?h.data_age_seconds??null:null,degradedReasons:p,unsatisfiedComfortGapC:e.comfort_status.unsatisfied_comfort_gap_c??null,temperatureAtDeadlineC:e.comfort_status.temperature_at_deadline_c??null},m={active:((B=e.manual_override)==null?void 0:B.active)??!1,ttlMinutes:Yl,reason:"",capabilityAvailable:e.manual_override!=null},b={entryId:e.entry_id,boxId:e.box_id,available:!!(e.entry_id&&e.box_id)},v=e.activity??null,w=v!=null?{state:ka(v.state),source:ar(v.source),temperatureTrendCPerMin:isFinite(v.temperature_trend_c_per_min)?v.temperature_trend_c_per_min??null:null,fillLevelPct:isFinite(v.fill_level_pct)?v.fill_level_pct??null:null,auraMaxTempC:isFinite(v.aura_max_temp_c)?v.aura_max_temp_c:0,heaterStates:Object.fromEntries(Object.entries(v.heater_states??{}).map(([k,Z])=>[k,mc(Z)])),staleFlags:sr(Array.isArray(v.stale_flags)?v.stale_flags:[])}:null,x=(e.source_segments??[]).map(k=>({key:ar(k.key),start:k.start,end:k.end,energyKwh:isFinite(k.energy_kwh)?k.energy_kwh:0,fillPct:isFinite(k.fill_pct)?k.fill_pct:0,active:k.active})),y=(e.timeline??[]).map(k=>({timestamp:k.timestamp,topTempC:isFinite(k.top_temp_c)?k.top_temp_c??null:null,bottomTempC:isFinite(k.bottom_temp_c)?k.bottom_temp_c??null:null,powerKw:isFinite(k.power_kw)?k.power_kw??null:null,sourceKey:ar(k.source_key),activityState:ka(k.activity_state)})),S=e.sparkline??null,H=S!=null?{temperature:Array.isArray(S.temperature)?S.temperature:[],power:Array.isArray(S.power)?S.power:[]}:null,N=e.demand_map??null,K=N!=null?{slotDurationMin:N.slot_duration_min,slotsP50:Array.isArray(N.slots_p50)?N.slots_p50:[],slotsP80:Array.isArray(N.slots_p80)?N.slots_p80:[],windows:Array.isArray(N.windows)?N.windows.map(k=>({slotIndex:k.slot_index,startMinute:k.start_minute,p80Kwh:k.p80_kwh,liters:k.liters,label:k.label})):[],profile:{category:N.profile.category,level:N.profile.level,daysUsed:N.profile.days_used,label:N.profile.label,fallbackUsed:N.profile.fallback_used},confidence:N.confidence}:null;return{status:l,planSlots:d,explanation:g,manualOverride:m,identity:b,activity:w,sourceSegments:x,timeline:y,sparkline:H,demandMap:K,loading:!1,loadError:null}}async function vc(e){const{profileData:t,planData:i,canonical:n,configProfileUnavailable:r,boilerProfileConfig:a}=await ec();let s=null;try{const p=await te.loadBatteryTimeline(Tr,"active");s=(p==null?void 0:p.active)||p||null,Array.isArray(s)&&s.length===0&&(s=null)}catch{}const l=(t==null?void 0:t.current_category)||Object.keys((t==null?void 0:t.profiles)||{})[0]||"workday_summer",d=Object.keys((t==null?void 0:t.profiles)||{}),u=sc(a);return{state:tc(i,t,u),plan:nc(i),energyBreakdown:rc(i),predictedUsage:ac(t,i,l),config:u,profiles:oc(t||i),heatmap:lc(i||t),heatmap7x24:cc(t,l),profiling:dc(t,l),currentCategory:l,availableCategories:d,forecastWindows:uc(i,s),v2Data:bc(n,r)}}function yc(e){var i;const t=((i=e==null?void 0:e.locale)==null?void 0:i.language)??(e==null?void 0:e.language)??"cs";return/^en/i.test(t)?"en":"cs"}const Oe={cs:{"boiler.status.heading":"Stav bojleru","boiler.status.heating":"Ohřev","boiler.status.idle":"Nečinný","boiler.status.unknown":"Neznámý","boiler.status.selected_source":"Vybraný zdroj","boiler.status.actuated_source":"Aktivní zdroj","boiler.status.temp_top":"Teplota nahoře","boiler.status.temp_bottom":"Teplota dole","boiler.status.energy_needed":"Zbývající energie","boiler.status.last_update":"Poslední aktualizace","boiler.status.degraded":"Degradováno","boiler.status.comfort_satisfied":"Komfort splněn","boiler.status.comfort_unsatisfied":"Komfort nesplněn","boiler.status.comfort_unknown":"Komfort neznámý","boiler.timeline.heading":"Plán nabíjení (15 min sloty)","boiler.timeline.empty":"Plán bojleru zatím není k dispozici.","boiler.timeline.col_time":"Čas","boiler.timeline.col_source":"Zdroj","boiler.timeline.col_temp":"Teplota","boiler.timeline.col_kwh":"Energie","boiler.timeline.col_cost":"Cena","boiler.timeline.col_pv":"FVE podíl","boiler.timeline.comfort_ok":"Komfort OK","boiler.timeline.comfort_gap":"Komfort nesplněn","boiler.explanation.heading":"Vysvětlení","boiler.explanation.empty":"Žádné vysvětlení od plánovače.","boiler.explanation.plan_created":"Plán vytvořen","boiler.explanation.plan_valid_until":"Plán platí do","boiler.explanation.data_age":"Stáří dat","boiler.explanation.freshness_heading":"Čerstvost vstupů","boiler.explanation.freshness_fresh":"vstupy aktuální","boiler.explanation.degraded_heading":"Degradované stavy","boiler.explanation.unsatisfied_gap":"Komfortní mezera","boiler.explanation.temp_at_deadline":"Předpokládaná teplota na deadline","boiler.override.heading":"Ruční přepis (sekundární)","boiler.override.subtitle":"Automatický plán je primární — přepis použijte jen výjimečně.","boiler.override.ttl_label":"Délka přepisu (minuty)","boiler.override.reason_label":"Důvod přepisu","boiler.override.submit":"Aktivovat přepis","boiler.override.identity_unavailable":"Nedostupné – identita bojleru není rozpoznána.","boiler.override.capability_unavailable":"Aktuátor neumožňuje ruční přepis.","boiler.override.active":"Přepis aktivní","boiler.override.ttl_remaining_min":"Zbývá","boiler.unavailable.loading":"Načítání dat bojleru…","boiler.unavailable.error":"Chyba při načítání bojleru","boiler.unavailable.degraded":"Bojler v degradovaném režimu","boiler.unavailable.unavailable":"Data bojleru nejsou k dispozici","boiler.source.fve":"FVE","boiler.source.grid":"Síť","boiler.source.alternative":"Alternativa","boiler.source.overflow":"Přetoky","boiler.source.discharge":"Vybíjení","boiler.source.none":"—","boiler.reason.comfort_satisfied":"Komfort splněn","boiler.reason.comfort_unsatisfied":"Komfort nelze splnit","boiler.reason.no_feasible_plan":"Žádný proveditelný plán","boiler.reason.bootstrap_profile":"Učící režim profilu (málo dat)","boiler.reason.history_profile_low_confidence":"Profil s nízkou důvěrou","boiler.reason.input_stale_price":"Ceny nejsou aktuální","boiler.reason.input_stale_pv":"FVE predikce není aktuální","boiler.reason.input_missing_recorder":"Chybí historie z recorderu","boiler.reason.input_adapter_error":"Chyba vstupního adapteru","boiler.reason.input_stale_temperature":"Teplota není aktuální","boiler.reason.top_sensor_unavailable":"Horní teploměr není dostupný","boiler.reason.bottom_sensor_unavailable_top_only_degraded":"Dolní teploměr není dostupný (top-only režim)","boiler.reason.primary_actuator_unavailable":"Hlavní topný aktuátor není dostupný","boiler.reason.alternative_actuator_unavailable_benchmark_only":"Alternativní zdroj jen jako benchmark","boiler.reason.circulation_pump_unavailable":"Cirkulační čerpadlo není dostupné","boiler.reason.actuator_rate_limited":"Aktuátor omezen rychlostním limitem","boiler.reason.actuator_serializer_error":"Chyba serializéru aktuátoru","boiler.reason.override_active":"Ruční přepis aktivní","boiler.reason.override_expired":"Ruční přepis vypršel","boiler.reason.planner_timeout":"Plánovač překročil časový limit","boiler.reason.replan_coalesced":"Přeplánování sloučeno","boiler.reason.source_selected_grid":"Vybrán zdroj: síť","boiler.reason.source_selected_pv":"Vybrán zdroj: FVE","boiler.reason.source_selected_alternative":"Vybrán zdroj: alternativa","boiler.reason.source_benchmark_only":"Alternativa pouze jako srovnání","boiler.reason.setup_incomplete":"Konfigurace bojleru není dokončena","boiler.reason.migration_required":"Vyžaduje se migrace bojleru","boiler.reason.api_repair_required":"Vyžaduje se oprava API","boiler.reason.storage_write_failed":"Selhalo uložení stavu bojleru","boiler.activity.state.charging_fve":"Nabíjení z FVE","boiler.activity.state.charging_overflow":"Nabíjení z přetoků","boiler.activity.state.charging_grid":"Nabíjení ze sítě","boiler.activity.state.discharging":"Vybíjení","boiler.activity.state.standby":"Pohotovost","boiler.activity.state.unknown":"Neznámý stav","boiler.activity.fill_level":"Úroveň naplnění","boiler.activity.temp_trend":"Trend teploty","boiler.activity.aura_max_temp":"Max. teplota AURA","boiler.activity.stale_warning":"Zastaralá data","boiler.eta.label":"Odhadovaný čas do cíle","boiler.eta.already_reached":"Cíl dosažen","boiler.eta.unavailable":"Nelze odhadnout","boiler.config.heater_power_kw":"Výkon topení (kW)","boiler.config.deadline":"Deadline","boiler.config.goal_temp":"Cílová teplota","boiler.aria.status_panel":"Panel stavu bojleru","boiler.aria.plan_timeline":"Časová osa plánu bojleru","boiler.aria.source_explanation":"Vysvětlení zdroje","boiler.aria.override_panel":"Panel ručního přepisu","boiler.aria.svg_summary":"Vizualizace bojleru","boiler.aria.stale":"Data mohou být zastaralá","boiler.aria.source_unknown":"Neznámý zdroj","boiler.demand_map.heading":"Mapa odběrů","boiler.demand_map.empty":"Sbírám data o odběrech — mapa se objeví po pár dnech","boiler.demand_map.confidence":"Spolehlivost","boiler.demand_map.fallback_notice":"Přibližný profil (málo dat)","boiler.demand_map.meta":"Profil z historie ({n} dní, {cat})","boiler.demand_map.window.morning":"Ráno","boiler.demand_map.window.afternoon":"Odpoledne","boiler.demand_map.window.evening":"Večer","boiler.demand_map.window.night":"Noc"},en:{"boiler.status.heading":"Boiler status","boiler.status.heating":"Heating","boiler.status.idle":"Idle","boiler.status.unknown":"Unknown","boiler.status.selected_source":"Selected source","boiler.status.actuated_source":"Actuated source","boiler.status.temp_top":"Top temperature","boiler.status.temp_bottom":"Bottom temperature","boiler.status.energy_needed":"Energy needed","boiler.status.last_update":"Last update","boiler.status.degraded":"Degraded","boiler.status.comfort_satisfied":"Comfort satisfied","boiler.status.comfort_unsatisfied":"Comfort not satisfied","boiler.status.comfort_unknown":"Comfort unknown","boiler.timeline.heading":"Heating plan (15 min slots)","boiler.timeline.empty":"No boiler plan available yet.","boiler.timeline.col_time":"Time","boiler.timeline.col_source":"Source","boiler.timeline.col_temp":"Temp","boiler.timeline.col_kwh":"Energy","boiler.timeline.col_cost":"Cost","boiler.timeline.col_pv":"PV share","boiler.timeline.comfort_ok":"Comfort OK","boiler.timeline.comfort_gap":"Comfort gap","boiler.explanation.heading":"Explanation","boiler.explanation.empty":"No planner explanation yet.","boiler.explanation.plan_created":"Plan created","boiler.explanation.plan_valid_until":"Plan valid until","boiler.explanation.data_age":"Data age","boiler.explanation.freshness_heading":"Input freshness","boiler.explanation.freshness_fresh":"inputs fresh","boiler.explanation.degraded_heading":"Degraded state","boiler.explanation.unsatisfied_gap":"Comfort gap","boiler.explanation.temp_at_deadline":"Predicted deadline temperature","boiler.override.heading":"Manual override (secondary)","boiler.override.subtitle":"Automatic plan is primary — use override only when necessary.","boiler.override.ttl_label":"Override duration (minutes)","boiler.override.reason_label":"Override reason","boiler.override.submit":"Activate override","boiler.override.identity_unavailable":"Unavailable – boiler identity is not resolved.","boiler.override.capability_unavailable":"Actuator does not support manual override.","boiler.override.active":"Override active","boiler.override.ttl_remaining_min":"remaining","boiler.unavailable.loading":"Loading boiler data…","boiler.unavailable.error":"Failed to load boiler data","boiler.unavailable.degraded":"Boiler in degraded mode","boiler.unavailable.unavailable":"Boiler data unavailable","boiler.source.fve":"PV","boiler.source.grid":"Grid","boiler.source.alternative":"Alternative","boiler.source.overflow":"Overflow","boiler.source.discharge":"Discharge","boiler.source.none":"—","boiler.reason.comfort_satisfied":"Comfort satisfied","boiler.reason.comfort_unsatisfied":"Comfort cannot be met","boiler.reason.no_feasible_plan":"No feasible plan","boiler.reason.bootstrap_profile":"Bootstrap profile (low data)","boiler.reason.history_profile_low_confidence":"Low-confidence profile","boiler.reason.input_stale_price":"Spot prices are stale","boiler.reason.input_stale_pv":"PV forecast is stale","boiler.reason.input_missing_recorder":"Recorder history missing","boiler.reason.input_adapter_error":"Input adapter error","boiler.reason.input_stale_temperature":"Temperature reading stale","boiler.reason.top_sensor_unavailable":"Top sensor unavailable","boiler.reason.bottom_sensor_unavailable_top_only_degraded":"Bottom sensor unavailable (top-only mode)","boiler.reason.primary_actuator_unavailable":"Primary heating actuator unavailable","boiler.reason.alternative_actuator_unavailable_benchmark_only":"Alternative source benchmark only","boiler.reason.circulation_pump_unavailable":"Circulation pump unavailable","boiler.reason.actuator_rate_limited":"Actuator rate limited","boiler.reason.actuator_serializer_error":"Actuator serializer error","boiler.reason.override_active":"Manual override active","boiler.reason.override_expired":"Manual override expired","boiler.reason.planner_timeout":"Planner timeout","boiler.reason.replan_coalesced":"Replan coalesced","boiler.reason.source_selected_grid":"Source selected: grid","boiler.reason.source_selected_pv":"Source selected: PV","boiler.reason.source_selected_alternative":"Source selected: alternative","boiler.reason.source_benchmark_only":"Alternative is benchmark only","boiler.reason.setup_incomplete":"Boiler setup incomplete","boiler.reason.migration_required":"Boiler migration required","boiler.reason.api_repair_required":"API repair required","boiler.reason.storage_write_failed":"Failed to persist boiler state","boiler.activity.state.charging_fve":"Charging from PV","boiler.activity.state.charging_overflow":"Charging from overflow","boiler.activity.state.charging_grid":"Charging from grid","boiler.activity.state.discharging":"Discharging","boiler.activity.state.standby":"Standby","boiler.activity.state.unknown":"Unknown state","boiler.activity.fill_level":"Fill level","boiler.activity.temp_trend":"Temperature trend","boiler.activity.aura_max_temp":"AURA max temperature","boiler.activity.stale_warning":"Stale data","boiler.eta.label":"Estimated time to target","boiler.eta.already_reached":"Target reached","boiler.eta.unavailable":"Cannot estimate","boiler.config.heater_power_kw":"Heater power (kW)","boiler.config.deadline":"Deadline","boiler.config.goal_temp":"Target temperature","boiler.aria.status_panel":"Boiler status panel","boiler.aria.plan_timeline":"Boiler plan timeline","boiler.aria.source_explanation":"Source explanation","boiler.aria.override_panel":"Manual override panel","boiler.aria.svg_summary":"Boiler visualization","boiler.aria.stale":"Data may be stale","boiler.aria.source_unknown":"Unknown source","boiler.demand_map.heading":"Demand Map","boiler.demand_map.empty":"Collecting usage data — map will appear in a few days","boiler.demand_map.confidence":"Confidence","boiler.demand_map.fallback_notice":"Approximate profile (low data)","boiler.demand_map.meta":"Profile from history ({n} days, {cat})","boiler.demand_map.window.morning":"Morning","boiler.demand_map.window.afternoon":"Afternoon","boiler.demand_map.window.evening":"Evening","boiler.demand_map.window.night":"Night"}};function C(e,t){const i=Oe[t]??Oe.cs;return e in i?i[e]:e in Oe.cs?Oe.cs[e]:e}function xn(e,t){const i=`boiler.reason.${e}`;return Oe[t][i]?Oe[t][i]:Oe.cs[i]?Oe.cs[i]:e}function Ze(e,t){if(!e)return C("boiler.source.none",t);const i=`boiler.source.${e}`;return Oe[t][i]?Oe[t][i]:Oe.cs[i]?Oe.cs[i]:e}const Sa={efficiency:null,health:null,balancing:null,costComparison:null};function xs(e){const t=ot();if(!t)return null;const i=t.findSensorId("battery_efficiency"),n=t.get(i);if(!n)return _.debug("Battery efficiency sensor not found"),null;const r=n.attributes||{},a=r.efficiency_last_month_pct!=null?{efficiency:Number(r.efficiency_last_month_pct??0),charged:Number(r.last_month_charge_kwh??0),discharged:Number(r.last_month_discharge_kwh??0),losses:Number(r.losses_last_month_kwh??0)}:null,s=r.efficiency_current_month_pct!=null?{efficiency:Number(r.efficiency_current_month_pct??0),charged:Number(r.current_month_charge_kwh??0),discharged:Number(r.current_month_discharge_kwh??0),losses:Number(r.losses_current_month_kwh??0)}:null,l=a??s;if(!l)return null;const d=a?"last_month":"current_month",u=a&&s?s.efficiency-a.efficiency:0;return{efficiency:l.efficiency,charged:l.charged,discharged:l.discharged,losses:l.losses,lossesPct:r[d==="last_month"?"losses_last_month_pct":"losses_current_month_pct"]??0,trend:u,period:d,currentMonthDays:r.current_month_days??0,lastMonth:a,currentMonth:s}}function ws(e){const t=ot();if(!t)return null;const i=t.findSensorId("battery_health"),n=t.get(i);if(!n)return _.debug("Battery health sensor not found"),null;const r=parseFloat(n.state)||0,a=n.attributes||{};let s,l;return r>=95?(s="excellent",l="Vynikající"):r>=90?(s="good",l="Dobrý"):r>=80?(s="fair",l="Uspokojivý"):(s="poor",l="Špatný"),{soh:r,capacity:a.capacity_p80_last_20??a.current_capacity_kwh??0,nominalCapacity:a.current_capacity_kwh??0,minCapacity:a.capacity_p20_last_20??0,measurementCount:a.measurement_count??0,lastAnalysis:a.last_analysis??"",qualityScore:a.quality_score??null,sohMethod:a.soh_selection_method??null,sohMethodDescription:a.soh_method_description??null,measurementHistory:Array.isArray(a.measurement_history)?a.measurement_history:[],degradation3m:a.degradation_3_months_percent??null,degradation6m:a.degradation_6_months_percent??null,degradation12m:a.degradation_12_months_percent??null,degradationPerYear:a.degradation_per_year_percent??null,estimatedEolDate:a.estimated_eol_date??null,yearsTo80Pct:a.years_to_80pct??null,trendConfidence:a.trend_confidence??null,status:s,statusLabel:l}}function Ca(e,t,i){if(!e||!t)return{daysRemaining:null,progressPercent:null,intervalDays:i||null};try{const n=new Date(e),r=new Date(t),a=new Date;if(isNaN(n.getTime())||isNaN(r.getTime()))return{daysRemaining:null,progressPercent:null,intervalDays:i||null};const s=r.getTime()-n.getTime(),l=a.getTime()-n.getTime(),d=Math.max(0,Math.round((r.getTime()-a.getTime())/(1e3*60*60*24))),u=s>0?Math.min(100,Math.max(0,Math.round(l/s*100))):null,p=i||Math.round(s/(1e3*60*60*24));return{daysRemaining:d,progressPercent:u,intervalDays:p||null}}catch{return{daysRemaining:null,progressPercent:null,intervalDays:i||null}}}function $s(e){const t=ot();if(!t)return null;const i=t.findSensorId("battery_balancing"),n=t.get(i);if(!n){const d=t.get(t.findSensorId("battery_health")),u=d==null?void 0:d.attributes;if(u!=null&&u.balancing_status){const p=String(u.last_balancing??""),h=u.next_balancing?String(u.next_balancing):null,g=Ca(p,h,Number(u.balancing_interval_days??0));return{status:String(u.balancing_status??"unknown"),lastBalancing:p,cost:Number(u.balancing_cost??0),nextScheduled:h,...g,estimatedNextCost:u.estimated_next_cost!=null?Number(u.estimated_next_cost):null}}return null}const r=n.attributes||{},a=String(r.last_balancing??""),s=r.next_scheduled?String(r.next_scheduled):null,l=Ca(a,s,Number(r.interval_days??0));return{status:n.state||"unknown",lastBalancing:a,cost:Number(r.cost??0),nextScheduled:s,...l,estimatedNextCost:r.estimated_next_cost!=null?Number(r.estimated_next_cost):null}}async function xc(e){var t,i,n;try{const r=await te.loadUnifiedCostTile(e);if(!r)return null;const a=r.hybrid??r,s=a.today??{},l=Math.round((s.actual_cost_so_far??s.actual_total_cost??0)*100)/100,d=s.future_plan_cost??0,u=s.blended_total_cost??l+d,p=((t=a.tomorrow)==null?void 0:t.plan_total_cost)??null,h=!!((i=a.tomorrow)!=null&&i.mode_distribution),g=p===0&&!h?null:p;let m=null,b=null,v=null,w=null;try{const x=await te.loadBatteryTimeline(e,"active"),y=(n=x==null?void 0:x.timeline_extended)==null?void 0:n.yesterday;y!=null&&y.summary&&(m=y.summary.planned_total_cost??null,b=y.summary.actual_total_cost??null,v=y.summary.delta_cost??null,w=y.summary.accuracy_pct??null)}catch{_.debug("Yesterday analysis not available")}return{activePlan:"hybrid",actualSpent:l,planTotalCost:u,futurePlanCost:d,tomorrowCost:g,yesterdayPlannedCost:m,yesterdayActualCost:b,yesterdayDelta:v,yesterdayAccuracy:w}}catch(r){return _.error("Failed to fetch cost comparison",r),null}}async function wc(e){const t=xs(),i=ws(),n=$s(),r=await xc(e);return{efficiency:t,health:i,balancing:n,costComparison:r}}function $c(e){return{efficiency:xs(),health:ws(),balancing:$s()}}const Ii={severity:0,warningsCount:0,eventType:"",description:"",instruction:"",onset:"",expires:"",etaHours:0,allWarnings:[],effectiveSeverity:0},_c={vítr:"💨",déšť:"🌧️",sníh:"❄️",bouřky:"⛈️",mráz:"🥶",vedro:"🥵",mlha:"🌫️",náledí:"🧊",laviny:"🏔️"};function _s(e){const t=e.toLowerCase();for(const[i,n]of Object.entries(_c))if(t.includes(i))return n;return"⚠️"}const ks={0:"Bez výstrahy",1:"Nízká",2:"Zvýšená",3:"Vysoká",4:"Extrémní"},_n={0:"#4CAF50",1:"#8BC34A",2:"#FF9800",3:"#f44336",4:"#9C27B0"};function kc(e){const t=ot();if(!t)return Ii;const i=`sensor.oig_${e}_chmu_warning_level`,n=t.get(i);if(!n)return _.debug("ČHMÚ sensor not found",{entityId:i}),Ii;const r=parseInt(n.state,10)||0,a=n.attributes||{},s=Number(a.warnings_count??0),l=String(a.event_type??""),d=String(a.description??""),u=String(a.instruction??""),p=String(a.onset??""),h=String(a.expires??""),g=Number(a.eta_hours??0),m=a.all_warnings_details??[],b=Array.isArray(m)?m.map(x=>({event_type:x.event_type??x.event??"",severity:x.severity??r,description:x.description??"",instruction:x.instruction??"",onset:x.onset??"",expires:x.expires??"",eta_hours:x.eta_hours??0})):[],v=l.toLowerCase().includes("žádná výstraha");return{severity:r,warningsCount:s,eventType:l,description:d,instruction:u,onset:p,expires:h,etaHours:g,allWarnings:b,effectiveSeverity:s===0||v?0:r}}const Ss={"HOME I":{icon:"🏠",color:"#4CAF50",label:"HOME I"},"HOME II":{icon:"⚡",color:"#2196F3",label:"HOME II"},"HOME III":{icon:"🔋",color:"#9C27B0",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"#FF9800",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"#FF9800",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"#9E9E9E",label:"DO NOTHING"}},Cs={yesterday:"📊 Včera",today:"📆 Dnes",tomorrow:"📅 Zítra",history:"📈 Historie",detail:"💎 Detail"};function Pa(e){return{modeHistorical:e.mode_historical??e.mode??"",modePlanned:e.mode_planned??"",modeMatch:e.mode_match??!1,status:e.status??"planned",startTime:e.start_time??"",endTime:e.end_time??"",durationHours:e.duration_hours??0,costHistorical:e.cost_historical??null,costPlanned:e.cost_planned??null,costDelta:e.cost_delta??null,solarKwh:e.solar_total_kwh??0,consumptionKwh:e.consumption_total_kwh??0,gridImportKwh:e.grid_import_total_kwh??0,gridExportKwh:e.grid_export_total_kwh??0,intervalReasons:Array.isArray(e.interval_reasons)?e.interval_reasons:[]}}function mn(e){return{plan:(e==null?void 0:e.plan)??0,actual:(e==null?void 0:e.actual)??null,hasActual:(e==null?void 0:e.has_actual)??!1,unit:(e==null?void 0:e.unit)??""}}function Sc(e){const t=(e==null?void 0:e.metrics)??{};return{overallAdherence:(e==null?void 0:e.overall_adherence)??0,modeSwitches:(e==null?void 0:e.mode_switches)??0,totalCost:(e==null?void 0:e.total_cost)??0,metrics:{cost:mn(t.cost),solar:mn(t.solar),consumption:mn(t.consumption),grid:mn(t.grid)},completedSummary:e!=null&&e.completed_summary?{count:e.completed_summary.count??0,totalCost:e.completed_summary.total_cost??0,adherencePct:e.completed_summary.adherence_pct??0}:void 0,plannedSummary:e!=null&&e.planned_summary?{count:e.planned_summary.count??0,totalCost:e.planned_summary.total_cost??0}:void 0,progressPct:e==null?void 0:e.progress_pct,actualTotalCost:e==null?void 0:e.actual_total_cost,planTotalCost:e==null?void 0:e.plan_total_cost,vsPlanPct:e==null?void 0:e.vs_plan_pct,backupBaselineCost:e==null?void 0:e.backup_baseline_cost,backupActualCost:e==null?void 0:e.backup_actual_cost,backupSavings:e==null?void 0:e.backup_savings,eodPrediction:e!=null&&e.eod_prediction?{predictedTotal:e.eod_prediction.predicted_total??0,predictedSavings:e.eod_prediction.predicted_savings??0}:void 0}}function Cc(e){return e?{date:e.date??"",modeBlocks:Array.isArray(e.mode_blocks)?e.mode_blocks.map(Pa):[],summary:Sc(e.summary),metadata:e.metadata?{activePlan:e.metadata.active_plan??"hybrid",comparisonPlanAvailable:e.metadata.comparison_plan_available}:void 0,comparison:e.comparison?{plan:e.comparison.plan??"",modeBlocks:Array.isArray(e.comparison.mode_blocks)?e.comparison.mode_blocks.map(Pa):[]}:void 0}:null}async function Pc(e,t,i="hybrid"){try{const n=await te.loadDetailTabs(e,t,i);if(!n)return null;const r=n[t]??n;return Cc(r)}catch(n){return _.error(`Failed to load timeline tab: ${t}`,n),null}}const Dr={tiles_left:[null,null,null,null,null,null],tiles_right:[null,null,null,null,null,null],left_count:4,right_count:4,visible:!0,version:1},Ps="oig_dashboard_tiles";function Tc(e,t){return t==="W"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kW"}:t==="Wh"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kWh"}:t==="W"||t==="Wh"?{value:Math.round(e).toString(),unit:t}:{value:e.toFixed(1),unit:t}}async function Mc(){var e;try{const t=await te.callWS({type:"call_service",domain:"oig_cloud",service:"get_dashboard_tiles",service_data:{},return_response:!0}),i=(e=t==null?void 0:t.response)==null?void 0:e.config;if(i&&typeof i=="object")return _.debug("Loaded tiles config from HA"),Ma(i)}catch(t){_.debug("WS tile config load failed, trying localStorage",{error:t.message})}try{const t=localStorage.getItem(Ps);if(t){const i=JSON.parse(t);return _.debug("Loaded tiles config from localStorage"),Ma(i)}}catch{_.debug("localStorage tile config load failed")}return Dr}async function Ta(e){try{return localStorage.setItem(Ps,JSON.stringify(e)),await te.callService("oig_cloud","save_dashboard_tiles",{config:JSON.stringify(e)}),_.info("Tiles config saved"),!0}catch(t){return _.error("Failed to save tiles config",t),!1}}function Ma(e){return{tiles_left:Array.isArray(e.tiles_left)?e.tiles_left.slice(0,6):Dr.tiles_left,tiles_right:Array.isArray(e.tiles_right)?e.tiles_right.slice(0,6):Dr.tiles_right,left_count:typeof e.left_count=="number"?e.left_count:4,right_count:typeof e.right_count=="number"?e.right_count:4,visible:e.visible!==!1,version:e.version??1}}function lr(e){var l;const t=ot();if(!t)return{value:"--",unit:"",isActive:!1,rawValue:0};const i=t.get(e);if(!i||i.state==="unavailable"||i.state==="unknown")return{value:"--",unit:"",isActive:!1,rawValue:0};const n=i.state,r=String(((l=i.attributes)==null?void 0:l.unit_of_measurement)??""),a=parseFloat(n)||0;if(i.entity_id.startsWith("switch.")||i.entity_id.startsWith("binary_sensor."))return{value:n==="on"?"Zapnuto":"Vypnuto",unit:"",isActive:n==="on",rawValue:n==="on"?1:0};const s=Tc(a,r);return{value:s.value,unit:s.unit,isActive:a!==0,rawValue:a}}function ki(e){const t=(i,n)=>{var a,s;const r=[];for(let l=0;l<n;l++){const d=i[l];if(!d)continue;const u=lr(d.entity_id),p={};if((a=d.support_entities)!=null&&a.top_right){const h=lr(d.support_entities.top_right);p.topRight={value:h.value,unit:h.unit}}if((s=d.support_entities)!=null&&s.bottom_right){const h=lr(d.support_entities.bottom_right);p.bottomRight={value:h.value,unit:h.unit}}r.push({config:d,value:u.value,unit:u.unit,isActive:u.isActive,isZero:u.rawValue===0,formattedValue:u.unit?`${u.value} ${u.unit}`:u.value,supportValues:p})}return r};return{left:t(e.tiles_left,e.left_count),right:t(e.tiles_right,e.right_count)}}async function Dc(e,t="toggle"){const i=e.split(".")[0];return te.callService(i,t,{entity_id:e})}function ee(e,t="CZK"){return e==null||Number.isNaN(e)?`-- ${t}`:`${e.toFixed(2)} ${t}`}function Gt(e,t=0){return e==null||Number.isNaN(e)?"-- %":`${e.toFixed(t)} %`}const Ec={fridge:"❄️","fridge-outline":"❄️",dishwasher:"🍽️","washing-machine":"🧺","tumble-dryer":"🌪️",stove:"🔥",microwave:"📦","coffee-maker":"☕",kettle:"🫖",toaster:"🍞",lightbulb:"💡","lightbulb-outline":"💡",lamp:"🪔","ceiling-light":"💡","floor-lamp":"🪔","led-strip":"✨","led-strip-variant":"✨","wall-sconce":"💡",chandelier:"💡",thermometer:"🌡️",thermostat:"🌡️",radiator:"♨️","radiator-disabled":"❄️","heat-pump":"♨️","air-conditioner":"❄️",fan:"🌀",hvac:"♨️",fire:"🔥",snowflake:"❄️","lightning-bolt":"⚡",flash:"⚡",battery:"🔋","battery-charging":"🔋","battery-50":"🔋","solar-panel":"☀️","solar-power":"☀️","meter-electric":"⚡","power-plug":"🔌","power-socket":"🔌",car:"🚗","car-electric":"🚘","car-battery":"🔋","ev-station":"🔌","ev-plug-type2":"🔌",garage:"🏠","garage-open":"🏠",door:"🚪","door-open":"🚪",lock:"🔒","lock-open":"🔓","shield-home":"🛡️",cctv:"📹",camera:"📹","motion-sensor":"👁️","alarm-light":"🚨",bell:"🔔","window-closed":"🪟","window-open":"🪟",blinds:"🪟","blinds-open":"🪟",curtains:"🪟","roller-shade":"🪟",television:"📺",speaker:"🔊","speaker-wireless":"🔊",music:"🎵","volume-high":"🔊",cast:"📡",chromecast:"📡","router-wireless":"📡",wifi:"📶","access-point":"📡",lan:"🌐",network:"🌐","home-assistant":"🏠",water:"💧","water-percent":"💧","water-boiler":"♨️","water-pump":"💧",shower:"🚿",toilet:"🚽",faucet:"🚰",pipe:"🔧","weather-sunny":"☀️","weather-cloudy":"☁️","weather-night":"🌙","weather-rainy":"🌧️","weather-snowy":"❄️","weather-windy":"💨",information:"ℹ️","help-circle":"❓","alert-circle":"⚠️","checkbox-marked-circle":"✅","toggle-switch":"🔘",power:"⚡",sync:"🔄"};function kn(e){const t=e.replace(/^mdi:/,"");return Ec[t]||"⚙️"}function cr(e,t){let i=!1;return(...n)=>{i||(e(...n),i=!0,setTimeout(()=>i=!1,t))}}async function Si(e,t=3,i=1e3){let n;for(let r=0;r<=t;r++)try{return await e()}catch(a){if(n=a,a instanceof Error&&(a.message.includes("401")||a.message.includes("403")))throw a;if(r<t){const s=Math.min(i*Math.pow(2,r),5e3);await new Promise(l=>setTimeout(l,s))}}throw n}class Oc{constructor(){this.state={...fs,pendingServices:new Map,changingServices:new Set},this.listeners=new Set,this.watcherUnsub=null,this.queueUpdateInterval=null,this.started=!1}start(){this.started||(this.started=!0,this.watcherUnsub=Pt.onEntityChange((t,i)=>{t&&this.shouldRefreshShield(t)&&this.refresh()}),this.refresh(),this.queueUpdateInterval=window.setInterval(()=>{this.state.allRequests.length>0&&this.notify()},1e3),_.debug("ShieldController started"))}stop(){var t;(t=this.watcherUnsub)==null||t.call(this),this.watcherUnsub=null,this.queueUpdateInterval!==null&&(clearInterval(this.queueUpdateInterval),this.queueUpdateInterval=null),this.started=!1,_.debug("ShieldController stopped")}subscribe(t){return this.listeners.add(t),t(this.state),()=>this.listeners.delete(t)}getState(){return this.state}shouldRefreshShield(t){return["service_shield_","box_prms_mode","box_mode_extended","box_prm2_app","boiler_manual_mode","invertor_prms_to_grid","invertor_prm1_p_max_feed_grid"].some(n=>t.includes(n))}readSupplementaryState(t){const i=t.findSensorId("box_mode_extended"),n=t.get(i);if(!n||n.state==="unavailable"||n.state==="unknown"||n.state==="")return{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1};const r=n.attributes??{};return{home_grid_v:r.home_grid_v===!0,home_grid_vi:r.home_grid_vi===!0,flexibilita:r.flexibilita===!0,available:!0}}refresh(){const t=ot();if(t)try{const i=t.findSensorId("service_shield_activity"),n=t.get(i),r=(n==null?void 0:n.attributes)??{},a=r.running_requests??[],s=r.queued_requests??[],l=t.findSensorId("service_shield_status"),d=t.findSensorId("service_shield_queue"),u=t.getString(l).value,p=t.getNumeric(d).value,h=t.getString(t.findSensorId("box_prms_mode")).value,g=t.getString(t.findSensorId("invertor_prms_to_grid")).value,m=t.getNumeric(t.findSensorId("invertor_prm1_p_max_feed_grid")).value,b=t.getString(t.findSensorId("boiler_manual_mode")).value,v=ua[h.trim()]??"home_1",w=pa[b.trim()]??"cbb",x=a.map((Z,R)=>this.parseRequest(Z,R,!0)),y=s.map((Z,R)=>this.parseRequest(Z,R+a.length,!1)),S=[...x,...y],H=new Map,N=new Set;for(const Z of S){const R=this.parseServiceRequest(Z);R&&!H.has(R.type)&&(H.set(R.type,R.targetValue),N.add(R.type))}const K=u==="Running"||u==="running",B=ms({gridModeRaw:g,gridLimit:m},{pendingServices:H,changingServices:N,shieldStatus:K?"running":"idle"}),k=$r(g)||B.currentLiveDelivery==="unknown"?this.state.currentGridDelivery:B.currentLiveDelivery;this.state={status:K?"running":"idle",activity:(n==null?void 0:n.state)??"",queueCount:p,runningRequests:x,queuedRequests:y,allRequests:S,currentBoxMode:v,currentGridDelivery:k,currentGridLimit:B.currentLiveLimit??0,currentBoilerMode:w,pendingServices:H,changingServices:N,gridDeliveryState:B,supplementary:this.readSupplementaryState(t)},this.notify()}catch(i){_.error("ShieldController refresh failed",i)}}parseRequest(t,i,n){const r=t||{},a=r.service??"",l=(Array.isArray(r.changes)?r.changes:[]).map(b=>typeof b=="string"?b:String(b??"")).filter(b=>b.length>0),d=r.started_at??r.queued_at??r.created_at??r.timestamp??r.created??"",u=Array.isArray(r.targets)?r.targets.map(b=>({param:String((b==null?void 0:b.param)??""),value:String((b==null?void 0:b.value)??(b==null?void 0:b.to)??""),entityId:String((b==null?void 0:b.entity_id)??(b==null?void 0:b.entityId)??""),from:String((b==null?void 0:b.from)??""),to:String((b==null?void 0:b.to)??(b==null?void 0:b.value)??""),current:String((b==null?void 0:b.current)??"")})):[],p=this.extractRequestParams(r.params),h=this.extractGridDeliveryStep(r,p),g=this.resolveRequestTargetValue(r,u,p,h);let m="mode_change";if(a.includes("set_box_mode")){const b=this.extractRequestParams(r.params);m=(b==null?void 0:b.home_grid_v)!==void 0||(b==null?void 0:b.home_grid_vi)!==void 0||Array.isArray(r.targets)&&r.targets.some(w=>(w==null?void 0:w.param)==="app")?"supplementary_toggle":"mode_change"}else a.includes("set_grid_delivery")&&!a.includes("limit")?m="grid_delivery":a.includes("grid_delivery_limit")||a.includes("set_grid_delivery")?m="grid_limit":a.includes("set_boiler_mode")?m="boiler_mode":a.includes("set_formating_mode")&&(m="battery_formating");return{id:`${a}_${i}_${d}`,type:m,status:n?"running":"queued",service:a,targetValue:g,changes:l,createdAt:d,position:i+1,description:typeof r.description=="string"?r.description:void 0,params:p,targets:u,traceId:typeof r.trace_id=="string"?r.trace_id:void 0,gridDeliveryStep:h}}parseServiceRequest(t){var u,p;const i=t.service;if(!i)return null;const n=t.changes.length>0?t.changes[0]:"",r=t.params,a=t.gridDeliveryStep,s=this.extractStructuredTarget(t);if(i.includes("set_grid_delivery")&&s)return s;if(i.includes("set_grid_delivery")&&n.includes("p_max_feed_grid")){const h=n.match(/→\s*'?(\d+)'?/),g=h?h[1]:t.targetValue;return g?{type:"grid_limit",targetValue:g}:null}const l=n.match(/→\s*'([^']+)'/),d=l?l[1]:t.targetValue||"";if(i.includes("set_box_mode")){if(((u=t.targets)==null?void 0:u.some(g=>g.param==="app"))||(r==null?void 0:r.home_grid_v)!==void 0||(r==null?void 0:r.home_grid_vi)!==void 0){const g=(p=t.targets)==null?void 0:p.find(v=>v.param==="app"),m=(g==null?void 0:g.to)||t.targetValue;return{type:"supplementary",targetValue:gs[m]??m??""}}return{type:"box_mode",targetValue:d}}if(i.includes("set_boiler_mode"))return{type:"boiler_mode",targetValue:d};if(i.includes("set_grid_delivery")&&n.includes("prms_to_grid"))return{type:"grid_mode",targetValue:d};if(i.includes("set_grid_delivery")){if(a==="limit"){const g=this.normalizeNumericTargetValue((r==null?void 0:r.limit)??t.targetValue);return g?{type:"grid_limit",targetValue:g}:null}if(a==="mode"){const g=this.normalizeModeTargetValue((r==null?void 0:r.mode)??t.targetValue);return g?{type:"grid_mode",targetValue:g}:null}const h=n.match(/→\s*'?(\d+)'?/);return h?{type:"grid_limit",targetValue:h[1]}:t.targetValue&&/^\d+$/.test(t.targetValue.trim())?{type:"grid_limit",targetValue:t.targetValue}:{type:"grid_mode",targetValue:d}}return null}extractRequestParams(t){if(!(!t||typeof t!="object"||Array.isArray(t)))return t}extractGridDeliveryStep(t,i){const n=(t==null?void 0:t.grid_delivery_step)??(i==null?void 0:i._grid_delivery_step);return typeof n=="string"?n:void 0}resolveRequestTargetValue(t,i,n,r){const a=this.extractStructuredTarget({service:(t==null?void 0:t.service)??"",targetValue:"",params:n,targets:i,gridDeliveryStep:r});if(a!=null&&a.targetValue)return a.targetValue;const s=t.target_value??t.target_display;return typeof s=="string"?s:""}extractStructuredTarget(t){if(!t.service.includes("set_grid_delivery"))return null;const i=t.gridDeliveryStep,n=t.params,r=t.targets??[];if(i==="limit"){const l=this.findTargetValue(r,["limit"]),d=this.normalizeNumericTargetValue(l??(n==null?void 0:n.limit)??t.targetValue);return d?{type:"grid_limit",targetValue:d}:null}if(i==="mode"){const l=this.findTargetValue(r,["mode"]),d=this.normalizeModeTargetValue(l??(n==null?void 0:n.mode)??t.targetValue);return d?{type:"grid_mode",targetValue:d}:null}const a=this.findTargetValue(r,["limit"]);if(a){const l=this.normalizeNumericTargetValue(a);if(l)return{type:"grid_limit",targetValue:l}}const s=this.findTargetValue(r,["mode"]);if(s){const l=this.normalizeModeTargetValue(s);if(l)return{type:"grid_mode",targetValue:l}}return null}findTargetValue(t,i){const n=new Set(i),r=t.find(a=>n.has(a.param));return(r==null?void 0:r.to)||(r==null?void 0:r.value)||void 0}normalizeNumericTargetValue(t){if(typeof t=="number"&&Number.isFinite(t))return String(Math.round(t));if(typeof t!="string")return"";const i=t.trim().match(/(\d+)/);return i?i[1]:""}normalizeModeTargetValue(t){if(typeof t!="string")return"";const i=t.trim();switch(i.toLowerCase()){case"off":return"Vypnuto";case"on":return"Zapnuto";case"limited":return"Omezeno";default:return i}}isLimitedGridDeliveryActiveOrPending(){const t=this.state.gridDeliveryState;if(t.pendingDeliveryTarget==="limited"||t.pendingLimitTarget!==null||t.currentLiveDelivery==="limited"||t.currentLiveDelivery==="unknown"&&(wl(t)==="limited"||this.state.currentGridDelivery==="limited"))return!0;const i=ot();if(i){const n=i.getString(i.findSensorId("invertor_prms_to_grid")).value;if(!$r(n)&&Br(n)==="limited")return!0}return!1}needsGridModeChangeForLimitedRequest(){return!this.isLimitedGridDeliveryActiveOrPending()}getBoxModeButtonState(t){const i=this.state.pendingServices.get("box_mode");return i?ua[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoxMode===t?"active":"idle"}getGridDeliveryButtonState(t){return this.getGridDeliveryButtonStateV2(t)}getGridDeliveryButtonStateV2(t){const i=this.state.gridDeliveryState,r=this.state.status==="running"?"processing":"pending",a=i.pendingDeliveryTarget,s=i.pendingLimitTarget,l=i.currentLiveDelivery;return a!==null?a===t?r:t==="limited"&&l==="limited"||t==="limited"&&l==="unknown"&&this.state.currentGridDelivery==="limited"?"active":"disabled-by-service":s!==null?t==="limited"?r:"disabled-by-service":l===t?"active":"idle"}getBoilerModeButtonState(t){const i=this.state.pendingServices.get("boiler_mode");return i?pa[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoilerMode===t?"active":"idle"}isAnyServiceChanging(){return this.state.changingServices.size>0}shouldProceedWithQueue(){return this.state.queueCount<3?!0:window.confirm(`⚠️ VAROVÁNÍ: Fronta již obsahuje ${this.state.queueCount} úkolů!

Každá změna může trvat až 10 minut.
Opravdu chcete přidat další úkol?`)}async setBoxMode(t){if(this.state.currentBoxMode===t&&!this.state.changingServices.has("box_mode"))return!1;const i=await te.callService("oig_cloud","set_box_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async setGridDelivery(t,i){const n={acknowledgement:!0,warning:!0};t==="limited"&&i!=null?(this.needsGridModeChangeForLimitedRequest()&&(n.mode=t),n.limit=i):i!=null?n.limit=i:n.mode=t;const r=await te.callService("oig_cloud","set_grid_delivery",n);return r&&this.refresh(),r}async setBoilerMode(t){if(this.state.currentBoilerMode===t&&!this.state.changingServices.has("boiler_mode"))return!1;const i=await te.callService("oig_cloud","set_boiler_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async removeFromQueue(t){const i=await te.callService("oig_cloud","shield_remove_from_queue",{position:t});return i&&this.refresh(),i}async setSupplementaryToggle(t,i){const n=await te.callService("oig_cloud","set_box_mode",{[t]:i,acknowledgement:!0});return n&&this.refresh(),n}notify(){for(const t of this.listeners)try{t(this.state)}catch(i){_.error("ShieldController listener error",i)}}}const re=new Oc;var zc=Object.defineProperty,Ac=Object.getOwnPropertyDescriptor,At=(e,t,i,n)=>{for(var r=n>1?void 0:n?Ac(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&zc(t,i,r),r};const Te=G;let Qe=class extends E{constructor(){super(...arguments),this.title="Energetické Toky",this.time="",this.showStatus=!1,this.alertCount=0,this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1}onStatusClick(){this.dispatchEvent(new CustomEvent("status-click",{bubbles:!0}))}onEditClick(){this.dispatchEvent(new CustomEvent("edit-click",{bubbles:!0}))}onResetClick(){this.dispatchEvent(new CustomEvent("reset-click",{bubbles:!0}))}onToggleLeftPanel(){this.dispatchEvent(new CustomEvent("toggle-left-panel",{bubbles:!0}))}onToggleRightPanel(){this.dispatchEvent(new CustomEvent("toggle-right-panel",{bubbles:!0}))}render(){const e=this.alertCount>0?"warning":"ok";return c`
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
    `}};Qe.styles=D`
    :host {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: ${Te(o.bgPrimary)};
      border-bottom: 1px solid ${Te(o.divider)};
      gap: 12px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
      color: ${Te(o.textPrimary)};
      margin: 0;
    }

    .title-icon { font-size: 20px; }

    .version {
      font-size: 11px;
      color: ${Te(o.textSecondary)};
      background: ${Te(o.bgSecondary)};
      padding: 2px 6px;
      border-radius: 4px;
    }

    .time {
      font-size: 13px;
      color: ${Te(o.textSecondary)};
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
      background: ${Te(o.warning)};
      color: #fff;
    }

    .status-badge.error {
      background: ${Te(o.error)};
      color: #fff;
    }

    .status-badge.ok {
      background: ${Te(o.success)};
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
      color: ${Te(o.textSecondary)};
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: ${Te(o.bgSecondary)};
      color: ${Te(o.textPrimary)};
    }

    .action-btn.active {
      background: ${Te(o.accent)};
      color: #fff;
    }
  `;At([f({type:String})],Qe.prototype,"title",2);At([f({type:String})],Qe.prototype,"time",2);At([f({type:Boolean})],Qe.prototype,"showStatus",2);At([f({type:Number})],Qe.prototype,"alertCount",2);At([f({type:Boolean})],Qe.prototype,"leftPanelCollapsed",2);At([f({type:Boolean})],Qe.prototype,"rightPanelCollapsed",2);Qe=At([O("oig-header")],Qe);function Ts(e,t){let i=null;return function(...n){i!==null&&clearTimeout(i),i=window.setTimeout(()=>{e.apply(this,n),i=null},t)}}var Lc=Object.defineProperty,Ic=Object.getOwnPropertyDescriptor,tn=(e,t,i,n)=>{for(var r=n>1?void 0:n?Ic(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Lc(t,i,r),r};const Da="oig_v2_theme";let Tt=class extends E{constructor(){super(...arguments),this.mode="auto",this.isDark=!1,this.breakpoint="desktop",this.width=1280,this.mediaQuery=null,this.resizeObserver=null,this.debouncedResize=Ts(this.updateBreakpoint.bind(this),100),this.onMediaChange=e=>{this.mode==="auto"&&(this.isDark=e.matches,this.dispatchEvent(new CustomEvent("theme-changed",{detail:{isDark:this.isDark}})))},this.onThemeChange=()=>{this.detectTheme()}}connectedCallback(){super.connectedCallback(),this.loadTheme(),this.setupMediaQuery(),this.setupResizeObserver(),this.detectTheme(),window.addEventListener("oig-theme-change",this.onThemeChange)}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mediaQuery)==null||e.removeEventListener("change",this.onMediaChange),(t=this.resizeObserver)==null||t.disconnect(),window.removeEventListener("oig-theme-change",this.onThemeChange)}loadTheme(){const e=localStorage.getItem(Da);e&&["light","dark","auto"].includes(e)&&(this.mode=e)}saveTheme(){localStorage.setItem(Da,this.mode)}setupMediaQuery(){this.mediaQuery=window.matchMedia("(prefers-color-scheme: dark)"),this.mediaQuery.addEventListener("change",this.onMediaChange)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(this.debouncedResize),this.resizeObserver.observe(document.documentElement),this.updateBreakpoint()}updateBreakpoint(){this.width=window.innerWidth,this.breakpoint=Ut(this.width)}detectTheme(){this.mode==="auto"?this.isDark=window.matchMedia("(prefers-color-scheme: dark)").matches:this.isDark=this.mode==="dark"}setTheme(e){this.mode=e,this.saveTheme(),this.detectTheme(),this.dispatchEvent(new CustomEvent("theme-changed",{detail:{mode:e,isDark:this.isDark}})),_.info("Theme changed",{mode:e,isDark:this.isDark})}getThemeInfo(){return{mode:this.mode,isDark:this.isDark,breakpoint:this.breakpoint,width:this.width}}render(){return c`
      <slot></slot>
    `}};Tt.styles=D`
    :host {
      display: contents;
    }
  `;tn([f({type:String})],Tt.prototype,"mode",2);tn([T()],Tt.prototype,"isDark",2);tn([T()],Tt.prototype,"breakpoint",2);tn([T()],Tt.prototype,"width",2);Tt=tn([O("oig-theme-provider")],Tt);var Fc=Object.defineProperty,Bc=Object.getOwnPropertyDescriptor,jr=(e,t,i,n)=>{for(var r=n>1?void 0:n?Bc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Fc(t,i,r),r};let Fi=class extends E{constructor(){super(...arguments),this.tabs=[],this.activeTab=""}onTabClick(e){e!==this.activeTab&&(this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tabId:e},bubbles:!0})))}isActive(e){return this.activeTab===e}render(){return c`
      ${this.tabs.map(e=>c`
        <button 
          class="tab ${this.isActive(e.id)?"active":""}"
          @click=${()=>this.onTabClick(e.id)}
        >
          ${e.icon?c`<span class="tab-icon">${e.icon}</span>`:null}
          <span>${e.label}</span>
        </button>
      `)}
    `}};Fi.styles=D`
    :host {
      display: flex;
      gap: 8px;
      padding: 0 16px;
      background: ${G(o.bgPrimary)};
      border-bottom: 1px solid ${G(o.divider)};
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
      color: ${G(o.textSecondary)};
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab:hover {
      color: ${G(o.textPrimary)};
      background: ${G(o.bgSecondary)};
    }

    .tab.active {
      color: ${G(o.accent)};
      border-bottom-color: ${G(o.accent)};
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
  `;jr([f({type:Array})],Fi.prototype,"tabs",2);jr([f({type:String})],Fi.prototype,"activeTab",2);Fi=jr([O("oig-tabs")],Fi);var Nc=Object.defineProperty,Rc=Object.getOwnPropertyDescriptor,Hr=(e,t,i,n)=>{for(var r=n>1?void 0:n?Rc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Nc(t,i,r),r};const jc="oig_v2_layout_",dr=G;let Bi=class extends E{constructor(){super(...arguments),this.editable=!1,this.breakpoint="desktop",this.onResize=Ts(()=>{this.breakpoint=Ut(window.innerWidth)},100)}connectedCallback(){super.connectedCallback(),this.breakpoint=Ut(window.innerWidth),window.addEventListener("resize",this.onResize)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("resize",this.onResize)}updated(e){e.has("breakpoint")&&this.setAttribute("breakpoint",this.breakpoint)}resetLayout(){const e=`${jc}${this.breakpoint}`;localStorage.removeItem(e),this.requestUpdate()}render(){return c`<slot></slot>`}};Bi.styles=D`
    :host {
      display: grid;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      background: ${dr(o.bgSecondary)};
    }

    :host([breakpoint='mobile']) { grid-template-columns: 1fr; }
    :host([breakpoint='tablet']) { grid-template-columns: repeat(2, 1fr); }
    :host([breakpoint='desktop']) { grid-template-columns: repeat(3, 1fr); }

    .grid-item {
      position: relative;
      background: ${dr(o.cardBg)};
      border-radius: 8px;
      box-shadow: ${dr(o.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .grid-item.editable { cursor: move; }
    .grid-item.editable:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .grid-item.dragging { opacity: 0.8; transform: scale(1.02); z-index: 100; }

    @media (max-width: 768px) {
      :host { gap: 12px; padding: 12px; }
    }
  `;Hr([f({type:Boolean})],Bi.prototype,"editable",2);Hr([T()],Bi.prototype,"breakpoint",2);Bi=Hr([O("oig-grid")],Bi);const Hc={off:"Vypnuto",on:"Zapnuto",limited:"Omezeno",unknown:"?"};function Ea(e){return Hc[e]??e}const Ms=e=>{const t=e.trim();return t?t.endsWith("W")?t:`${t}W`:""};function Vc(e){const t=e.isUnavailable;let i;t||e.currentLiveDelivery==="unknown"?i="?":e.currentLiveDelivery==="limited"&&e.currentLiveLimit!==null?i=`Omezeno ${e.currentLiveLimit}W`:i=Ea(e.currentLiveDelivery);const n=!t&&e.currentLiveDelivery==="limited";let r=null,a=null;!t&&e.currentLiveLimit!==null&&(a=`${e.currentLiveLimit}W`,r=n?"Aktivní limit":"Nastavený limit");let s=null,l=null;return e.pendingDeliveryTarget!==null&&(s=`Ve frontě: ${Ea(e.pendingDeliveryTarget)}`),e.pendingLimitTarget!==null&&(l=`Ve frontě: limit ${Ms(String(e.pendingLimitTarget))}`),{currentModeText:i,limitLabel:r,limitValue:a,showLimitAsActive:n,isUnavailable:t,isTransitioning:e.isTransitioning,pendingModeText:s,pendingLimitText:l}}function Wc(e,t){const i=t.has("box_mode"),n=e.get("box_mode"),r=t.has("grid_mode")||t.has("grid_limit"),a=e.get("grid_limit"),s=e.get("grid_mode");let l=null;if(a){const d=Ms(a);l=d?`→ ${d}`:null}else s&&(l=`→ ${s}`);return{inverterModeChanging:i,inverterModeText:n?`→ ${n}`:null,gridExportChanging:r,gridExportText:l}}var qc=Object.defineProperty,Kc=Object.getOwnPropertyDescriptor,Wn=(e,t,i,n)=>{for(var r=n>1?void 0:n?Kc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&qc(t,i,r),r};let Xt=class extends E{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1}get fillHeight(){return Math.max(0,Math.min(100,this.soc))/100*54}get fillY(){return 13+(54-this.fillHeight)}render(){return c`
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
    `}};Xt.styles=D`
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
  `;Wn([f({type:Number})],Xt.prototype,"soc",2);Wn([f({type:Boolean})],Xt.prototype,"charging",2);Wn([f({type:Boolean})],Xt.prototype,"gridCharging",2);Xt=Wn([O("oig-battery-gauge")],Xt);var Yc=Object.defineProperty,Uc=Object.getOwnPropertyDescriptor,qn=(e,t,i,n)=>{for(var r=n>1?void 0:n?Uc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Yc(t,i,r),r};let Jt=class extends E{constructor(){super(...arguments),this.power=0,this.percent=0,this.maxPower=5400}get isNight(){return this.percent<2}get level(){return this.percent<2?"night":this.percent<20?"low":this.percent<65?"mid":"high"}get sunColor(){const e=this.level;return e==="low"?"#b0bec5":e==="mid"?"#ffd54f":"#ffb300"}get rayLen(){const e=this.level;return e==="low"?4:e==="mid"?7:10}get rayOpacity(){const e=this.level;return e==="low"?.5:e==="mid"?.8:1}get coreRadius(){const e=this.level;return e==="low"?7:e==="mid"?9:11}renderMoon(){return U`
      <circle cx="24" cy="24" r="20" fill="#3949ab" opacity="0.28"/>
      <g class="moon-body">
        <path d="M24 6 A18 18 0 1 0 24 42 A13 13 0 1 1 24 6Z" fill="#cfd8dc" opacity="0.95"/>
      </g>
      <circle class="star" cx="7" cy="10" r="1.5" fill="#e8eaf6" style="animation-delay:0s"/>
      <circle class="star" cx="41" cy="7" r="1.8" fill="#e8eaf6" style="animation-delay:0.7s"/>
      <circle class="star" cx="5" cy="30" r="1.2" fill="#c5cae9" style="animation-delay:1.4s"/>
      <circle class="star" cx="6" cy="44" r="1.0" fill="#c5cae9" style="animation-delay:2.1s"/>
      <circle class="star" cx="42" cy="39" r="1.3" fill="#e8eaf6" style="animation-delay:2.8s"/>
    `}renderSun(){const i=this.coreRadius,n=i+3,r=n+this.rayLen,a=this.sunColor,s=this.rayOpacity,d=[0,45,90,135,180,225,270,315].map(p=>{const h=p*Math.PI/180,g=24+Math.cos(h)*n,m=24+Math.sin(h)*n,b=24+Math.cos(h)*r,v=24+Math.sin(h)*r;return U`
        <line class="ray"
          x1="${g}" y1="${m}" x2="${b}" y2="${v}"
          stroke="${a}" stroke-width="2.5" opacity="${s}"
        />
      `}),u=this.level==="low";return U`
      <!-- Paprsky obaleny v <g> pro CSS rotaci -->
      <g class="rays-group">
        ${d}
      </g>
      <circle class="sun-core" cx="${24}" cy="${24}" r="${i}" fill="${a}" />
      ${u?U`
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
    `}};Jt.styles=D`
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
  `;qn([f({type:Number})],Jt.prototype,"power",2);qn([f({type:Number})],Jt.prototype,"percent",2);qn([f({type:Number})],Jt.prototype,"maxPower",2);Jt=qn([O("oig-solar-icon")],Jt);var Gc=Object.defineProperty,Zc=Object.getOwnPropertyDescriptor,nn=(e,t,i,n)=>{for(var r=n>1?void 0:n?Zc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Gc(t,i,r),r};let Mt=class extends E{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1,this.discharging=!1,this._clipId=`batt-clip-${Math.random().toString(36).slice(2)}`}get fillColor(){return this.gridCharging?"#42a5f5":this.soc>50?"#4caf50":this.soc>20?"#ff9800":"#f44336"}get fillHeight(){return Math.max(1,Math.min(100,this.soc)/100*48)}get fillY(){return 14+(48-this.fillHeight)}get stripeColor(){return this.gridCharging?"#90caf9":"#a5d6a7"}render(){const e=this.charging||this.gridCharging,t=this.soc>=25;return c`
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
        ${e?U`
          <rect
            class="charge-stripe active"
            x="4" y="52" width="24" height="8" rx="2"
            fill="${this.stripeColor}"
            clip-path="url(#${this._clipId})"
          />
        `:""}

        <!-- SoC text uvnitř -->
        ${t?U`
          <text class="soc-text" x="16" y="${this.fillY+this.fillHeight/2}">
            ${Math.round(this.soc)}%
          </text>
        `:""}
      </svg>
    `}};Mt.styles=D`
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
  `;nn([f({type:Number})],Mt.prototype,"soc",2);nn([f({type:Boolean})],Mt.prototype,"charging",2);nn([f({type:Boolean})],Mt.prototype,"gridCharging",2);nn([f({type:Boolean})],Mt.prototype,"discharging",2);Mt=nn([O("oig-battery-icon")],Mt);var Qc=Object.defineProperty,Xc=Object.getOwnPropertyDescriptor,Ds=(e,t,i,n)=>{for(var r=n>1?void 0:n?Xc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Qc(t,i,r),r};let Sn=class extends E{constructor(){super(...arguments),this.power=0}get mode(){return this.power>50?"importing":this.power<-50?"exporting":"idle"}render(){const e=this.mode;return c`
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
    `}};Sn.styles=D`
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
  `;Ds([f({type:Number})],Sn.prototype,"power",2);Sn=Ds([O("oig-grid-icon")],Sn);var Jc=Object.defineProperty,ed=Object.getOwnPropertyDescriptor,Kn=(e,t,i,n)=>{for(var r=n>1?void 0:n?ed(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Jc(t,i,r),r};let ei=class extends E{constructor(){super(...arguments),this.power=0,this.maxPower=1e4,this.boilerActive=!1}get percent(){return Math.min(100,this.power/Math.max(1,this.maxPower)*100)}get fillColor(){const e=this.percent;return e<15?"#546e7a":e<40?"#f06292":e<70?"#e91e63":"#c62828"}get level(){const e=this.percent;return e<15?"low":e<60?"mid":"high"}get windowColor(){const e=this.level;return e==="low"?"#37474f":e==="mid"?"#ffd54f":"#ffb300"}render(){const e=this.percent,t=24,i=22,n=Math.max(1,e/100*t),r=i+(t-n),a=this.level;return c`
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
          x="8" y="${r}" width="32" height="${n}"
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
        ${this.boilerActive?U`
          <circle class="boiler-dot" cx="10" cy="43" r="3.5" fill="#ff5722" opacity="0.9"/>
          <text x="10" y="43" text-anchor="middle" dominant-baseline="middle" font-size="5" fill="white">🔥</text>
        `:""}
      </svg>
    `}};ei.styles=D`
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
  `;Kn([f({type:Number})],ei.prototype,"power",2);Kn([f({type:Number})],ei.prototype,"maxPower",2);Kn([f({type:Boolean})],ei.prototype,"boilerActive",2);ei=Kn([O("oig-house-icon")],ei);var td=Object.defineProperty,id=Object.getOwnPropertyDescriptor,rn=(e,t,i,n)=>{for(var r=n>1?void 0:n?id(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&td(t,i,r),r};let Dt=class extends E{constructor(){super(...arguments),this.mode="",this.bypassActive=!1,this.hasAlarm=!1,this.plannerAuto=!1}get modeType(){return this.hasAlarm?"alarm":this.bypassActive?"bypass":this.mode.includes("UPS")?"ups":"normal"}render(){const e=this.modeType;return c`
      <svg viewBox="0 0 48 48">
        <!-- Hlavní box střídače -->
        <rect
          class="box ${e}"
          x="4" y="8" width="40" height="34" rx="5"
        />

        <!-- Sinusoida výstupu -->
        <path class="sine-out ${e}" d="${"M 10,28 C 14,28 14,20 18,22 C 22,24 22,32 26,32 C 30,32 30,20 34,22 C 38,24 38,28 38,28"}"/>

        <!-- UPS blesk -->
        ${e==="ups"?U`
          <path class="ups-bolt active"
            d="M 25,12 L 20,26 L 24,26 L 23,36 L 28,22 L 24,22 Z"
          />
        `:""}

        <!-- Bypass výstraha — trojúhelník nahoře -->
        ${e==="bypass"?U`
          <polygon
            class="warning-triangle active"
            points="24,6 18,16 30,16"
          />
          <text x="24" y="15" text-anchor="middle" dominant-baseline="middle"
            font-size="6" font-weight="bold" fill="#fff">!</text>
        `:""}

        <!-- Alarm kroužek -->
        ${e==="alarm"?U`
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
    `}};Dt.styles=D`
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
  `;rn([f({type:String})],Dt.prototype,"mode",2);rn([f({type:Boolean})],Dt.prototype,"bypassActive",2);rn([f({type:Boolean})],Dt.prototype,"hasAlarm",2);rn([f({type:Boolean})],Dt.prototype,"plannerAuto",2);Dt=rn([O("oig-inverter-icon")],Dt);var nd=Object.defineProperty,rd=Object.getOwnPropertyDescriptor,ze=(e,t,i,n)=>{for(var r=n>1?void 0:n?rd(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&nd(t,i,r),r};const Y=G,Oa=new URLSearchParams(window.location.search),ad=Oa.get("sn")||Oa.get("inverter_sn")||"",sd=e=>`sensor.oig_${ad}_${e}`,ur="oig_v2_flow_layout_",nt=["solar","battery","inverter","grid","house"],od={solar:{top:"0%",left:"0%"},house:{top:"0%",left:"65%"},inverter:{top:"35%",left:"35%"},grid:{top:"70%",left:"0%"},battery:{top:"70%",left:"65%"}};function q(e){return()=>te.openEntityDialog(sd(e))}let ke=class extends E{constructor(){super(...arguments),this.data=Fr,this.editMode=!1,this.pendingServices=new Map,this.changingServices=new Set,this.shieldStatus="idle",this.shieldQueueCount=0,this.gridDeliveryState={currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},this.shieldUnsub=null,this.expandedNodes=new Set,this.gaugeDetailOpen=null,this.customPositions={},this.draggedNodeId=null,this.dragStartX=0,this.dragStartY=0,this.dragStartTop=0,this.dragStartLeft=0,this.onShieldUpdate=e=>{this.pendingServices=e.pendingServices,this.changingServices=e.changingServices,this.shieldStatus=e.status,this.shieldQueueCount=e.queueCount,this.gridDeliveryState=e.gridDeliveryState},this.nodeDims={},this.handleDragStart=e=>{if(!this.editMode)return;e.preventDefault(),e.stopPropagation();const i=e.target.closest(".node");if(!i)return;const n=this.findNodeId(i);if(!n)return;this.draggedNodeId=n,i.classList.add("dragging");const r=i.getBoundingClientRect();this.dragStartX=e.clientX,this.dragStartY=e.clientY,this.dragStartTop=r.top,this.dragStartLeft=r.left},this.handleTouchStart=e=>{if(!this.editMode)return;e.preventDefault();const i=e.target.closest(".node");if(!i)return;const n=this.findNodeId(i);if(!n)return;this.draggedNodeId=n,i.classList.add("dragging");const r=e.touches[0],a=i.getBoundingClientRect();this.dragStartX=r.clientX,this.dragStartY=r.clientY,this.dragStartTop=a.top,this.dragStartLeft=a.left},this.handleDragMove=e=>{!this.draggedNodeId||!this.editMode||(e.preventDefault(),this.updateDragPosition(e.clientX,e.clientY))},this.handleTouchMove=e=>{if(!this.draggedNodeId||!this.editMode)return;e.preventDefault();const t=e.touches[0];this.updateDragPosition(t.clientX,t.clientY)},this.handleDragEnd=e=>{var n;if(!this.draggedNodeId||!this.editMode)return;const t=(n=this.shadowRoot)==null?void 0:n.querySelector(".flow-grid"),i=t==null?void 0:t.querySelector(`.node-${this.draggedNodeId}`);i&&i.classList.remove("dragging"),this.saveLayout(),this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0})),this.draggedNodeId=null},this.handleTouchEnd=e=>{this.handleDragEnd(e)}}connectedCallback(){super.connectedCallback(),this.loadSavedLayout(),this.shieldUnsub=re.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),this.removeDragListeners(),(e=this.shieldUnsub)==null||e.call(this),this.shieldUnsub=null}updated(e){e.has("editMode")&&(this.editMode?(this.setAttribute("editmode",""),this.loadSavedLayout(),this.requestUpdate(),this.updateComplete.then(()=>this.applySavedPositions())):(this.removeAttribute("editmode"),this.removeDragListeners(),this.clearInlinePositions(),this.updateComplete.then(()=>this.applyCustomPositions()))),!this.editMode&&this.hasCustomLayout&&this.updateComplete.then(()=>this.applyCustomPositions()),this.measureNodes()}measureNodes(){var n;const e=(n=this.shadowRoot)==null?void 0:n.querySelector(".flow-grid");if(!e)return;let t=!1;const i={...this.nodeDims};for(const r of nt){const a=e.querySelector(`.node-${r}`);if(!a)continue;const s=Math.round(a.offsetWidth),l=Math.round(a.offsetHeight);if(s<10||l<10)continue;const d=i[r];(!d||Math.abs(d.w-s)>1||Math.abs(d.h-l)>1)&&(i[r]={w:s,h:l},t=!0)}t&&(this.nodeDims=i)}loadSavedLayout(){const e=Ut(window.innerWidth),t=`${ur}${e}`;try{const i=localStorage.getItem(t);i&&(this.customPositions=JSON.parse(i),_.debug("[FlowNode] Loaded layout for "+e))}catch{}}applySavedPositions(){var t;if(!this.editMode)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of nt){const n=this.customPositions[i];if(!n)continue;const r=e.querySelector(`.node-${i}`);r&&(r.style.top=n.top,r.style.left=n.left)}this.initDragListeners()}}clearInlinePositions(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of nt){const n=e.querySelector(`.node-${i}`);n&&(n.style.top="",n.style.left="")}}saveLayout(){const e=Ut(window.innerWidth),t=`${ur}${e}`;try{localStorage.setItem(t,JSON.stringify(this.customPositions)),_.debug("[FlowNode] Saved layout for "+e)}catch{}}toggleExpand(e,t){const i=t.target;if(i.closest(".clickable")||i.closest(".indicator")||i.closest(".forecast-badge")||i.closest(".node-value")||i.closest(".node-subvalue")||i.closest(".gc-plan-btn"))return;const n=new Set(this.expandedNodes);n.has(e)?n.delete(e):n.add(e),this.expandedNodes=n}nodeClass(e,t=""){const i=this.expandedNodes.has(e)?" expanded":"";return`node node-${e}${i}${t?" "+t:""}`}gaugePill(e,t,i,n){const r=this.gaugeDetailOpen===e;return c`
      <button class="ss-pill" style="color:${i};border-color:${i}55"
        @click=${a=>{a.stopPropagation(),this.gaugeDetailOpen=r?null:e}}>${t}</button>
      ${r?c`
        <div class="ss-pop" style="border-color:${i}66"
          @click=${a=>a.stopPropagation()}>${n}</div>`:P}
    `}edgeGauge(e){const t=Math.max(0,Math.min(100,e.pct)),i=Math.max(1.5,Math.min(6,e.width??2.5)),n=e.nodeId?this.nodeDims[e.nodeId]:void 0,r=(n==null?void 0:n.w)??180,a=(n==null?void 0:n.h)??180,s=1.5,l=e.full?0:100-t,d=e.stops.map(([p,h])=>U`<stop offset="${p}" stop-color="${h}"></stop>`),u=e.pulseDur?`--pulse-dur:${e.pulseDur}s`:"";return U`
      <svg class="edge-gauge ${e.pulse?"pulse":""}" viewBox="0 0 ${r} ${a}"
        preserveAspectRatio="none" style=${u}>
        <defs>
          <linearGradient id=${e.id} x1="0" y1="1" x2="0" y2="0">${d}</linearGradient>
        </defs>
        <rect class="edge-track" x=${s} y=${s}
          width=${r-s*2} height=${a-s*2} rx="10.5"></rect>
        <rect class="edge-fill" x=${s} y=${s}
          width=${r-s*2} height=${a-s*2} rx="10.5"
          stroke=${`url(#${e.id})`} stroke-width=${i} pathLength="100"
          stroke-dasharray="100" stroke-dashoffset=${l}></rect>
      </svg>`}get hasCustomLayout(){return nt.some(e=>{const t=this.customPositions[e];return(t==null?void 0:t.top)!=null&&(t==null?void 0:t.left)!=null})}applyCustomPositions(){var t;if(this.editMode||!this.hasCustomLayout)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of nt){const n=e.querySelector(`.node-${i}`);if(!n)continue;const r=this.customPositions[i]??od[i];n.style.top=r.top,n.style.left=r.left}}resetLayout(){const e=Ut(window.innerWidth),t=`${ur}${e}`;localStorage.removeItem(t),this.customPositions={},this.clearInlinePositions(),this.editMode&&this.requestUpdate(),_.debug("[FlowNode] Reset layout for "+e)}initDragListeners(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of nt){const n=e.querySelector(`.node-${i}`);n&&(n.addEventListener("mousedown",this.handleDragStart),n.addEventListener("touchstart",this.handleTouchStart,{passive:!1}))}document.addEventListener("mousemove",this.handleDragMove),document.addEventListener("mouseup",this.handleDragEnd),document.addEventListener("touchmove",this.handleTouchMove,{passive:!1}),document.addEventListener("touchend",this.handleTouchEnd)}}removeDragListeners(){document.removeEventListener("mousemove",this.handleDragMove),document.removeEventListener("mouseup",this.handleDragEnd),document.removeEventListener("touchmove",this.handleTouchMove),document.removeEventListener("touchend",this.handleTouchEnd)}findNodeId(e){for(const i of nt)if(e.classList.contains(`node-${i}`))return i;const t=e.closest('[class*="node-"]');if(!t)return null;for(const i of nt)if(t.classList.contains(`node-${i}`))return i;return null}updateDragPosition(e,t){var y;if(!this.draggedNodeId)return;const i=(y=this.shadowRoot)==null?void 0:y.querySelector(".flow-grid");if(!i)return;const n=i.querySelector(`.node-${this.draggedNodeId}`);if(!n)return;const r=i.getBoundingClientRect(),a=n.getBoundingClientRect(),s=e-this.dragStartX,l=t-this.dragStartY,d=this.dragStartLeft+s,u=this.dragStartTop+l,p=r.left,h=r.right-a.width,g=r.top,m=r.bottom-a.height,b=Math.max(p,Math.min(h,d)),v=Math.max(g,Math.min(m,u)),w=(b-r.left)/r.width*100,x=(v-r.top)/r.height*100;n.style.left=`${w}%`,n.style.top=`${x}%`,this.customPositions[this.draggedNodeId]={top:`${x}%`,left:`${w}%`},this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0}))}renderSolar(){const e=this.data,t=e.solarPercent,i=t<2,n=i?"linear-gradient(135deg, rgba(38,48,82,0.45) 0%, rgba(23,31,58,0.3) 100%)":wi.solar,r="transparent",a=e.solarToday/1e3,s=Math.max(e.solarForecastToday,a),l=Math.max(0,s-a),d=s>0?Math.min(100,a/s*100):0,u=e.solarPower/1e3,p=i?"#5c6bc0":t<20?"#ff7043":t<50?"#ffa726":"#ffd54f";return c`
      <div class="${this.nodeClass("solar",i?"night":"")}" style="--node-gradient: ${n}; --node-border: ${r};"
        @click=${h=>this.toggleExpand("solar",h)}>
        ${this.edgeGauge({id:"gauge-solar",nodeId:"solar",pct:i?0:d,stops:[[0,p],[1,p]],width:2+Math.min(3,u),pulse:!i&&e.solarPower>30,pulseDur:Math.max(.9,2.2-u*.35)})}
        <div class="node-tint" style="background: radial-gradient(120% 70% at 50% 0, ${i?"rgba(57,73,171,0.18)":p+"22"}, transparent 70%)"></div>

        <button class="indicator" style="position:absolute;top:4px;right:6px;font-size:9px;z-index:3" @click=${q("solar_forecast")}
          title=${e.solarForecastStale?"Předpověď zítra (zastaralá)":"Předpověď FVE na zítra"}>
          ${e.solarForecastStale?"⚠":"🌅"} ${e.solarForecastTomorrow.toFixed(1)}
        </button>
        ${this.gaugePill("solar",`${Math.round(d)} %`,i?"#7986cb":p,c`
          <div class="ss-pop-h"><span>Výroba dne</span><b style="color:${i?"#9fa8da":p}">${Math.round(d)} %</b></div>
          <div class="gp-r"><span>Vyrobeno</span><b>${a.toFixed(1)} kWh</b></div>
          <div class="gp-r"><span>Předpověď</span><b>${s.toFixed(1)} kWh</b></div>
          <div class="gp-r"><span>Ještě vyrobí</span><b>~${l.toFixed(1)} kWh</b></div>
          <div class="gp-r"><span>Aktuální výkon</span><b>${tt(e.solarPower)} · ${Math.round(t)} % špičky</b></div>
        `)}

        <div class="node-header node-header--split" style="margin-top:16px">
          <span class="node-label">☀️ Solár</span>
          <span class="node-state" style="color:${i?"#9fa8da":p}">
            ${i?"🌙 Noc":`${Math.round(t)} % špičky`}
          </span>
        </div>
        <div class="node-value" @click=${q("actual_fv_total")}>
          ${tt(e.solarPower)}
        </div>
        <div class="node-subvalue" @click=${q("dc_in_fv_ad")}>
          Dnes ${a.toFixed(1)} <span class="nv-sub">/ ${s.toFixed(1)} kWh</span>
        </div>
        <div class="node-subvalue">
          ${l>.05?c`<span class="solar-rem ${l>1?"rem-on":"rem-off"}">⚡ ještě ~${l.toFixed(1)} kWh</span>`:c`<span class="solar-rem rem-off">✓ hotovo dnes</span>`}
        </div>

        <div class="detail-section">
          <div class="solar-strings">
            <div>
              <div class="detail-header">🏭 String 1</div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${q("extended_fve_voltage_1")}>${Math.round(e.solarV1)}V</button>
              </div>
              <div class="detail-row">
                <span class="icon">〰️</span>
                <button class="clickable" @click=${q("extended_fve_current_1")}>${e.solarI1.toFixed(1)}A</button>
              </div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${q("dc_in_fv_p1")}>${Math.round(e.solarP1)} W</button>
              </div>
            </div>
            <div>
              <div class="detail-header">🏭 String 2</div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${q("extended_fve_voltage_2")}>${Math.round(e.solarV2)}V</button>
              </div>
              <div class="detail-row">
                <span class="icon">〰️</span>
                <button class="clickable" @click=${q("extended_fve_current_2")}>${e.solarI2.toFixed(1)}A</button>
              </div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${q("dc_in_fv_p2")}>${Math.round(e.solarP2)} W</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `}openGridChargingDialog(){this.dispatchEvent(new CustomEvent("oig-grid-charging-open",{bubbles:!0,composed:!0,detail:{data:this.data.gridChargingPlan}}))}getBalancingIndicator(){const e=this.data,t=e.balancingState;return t!=="charging"&&t!=="holding"&&t!=="completed"?{show:!1,text:"",icon:"",cls:""}:t==="charging"?{show:!0,text:`Nabíjení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⚡",cls:"charging"}:t==="holding"?{show:!0,text:`Držení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⏸️",cls:"holding"}:{show:!0,text:"Dokončeno",icon:"✅",cls:"completed"}}renderBattery(){const e=this.data,t=this.getBalancingIndicator(),i=e.batteryTemp>25?"🌡️":e.batteryTemp<15?"🧊":"🌡️",n=e.batteryTemp>25?"temp-hot":e.batteryTemp<15?"temp-cold":"",r=Math.abs(e.batteryPower)/1e3,a=Math.abs(e.batteryPower)>10,s=e.batteryPower>10,l=e.batteryPower<-10,d=s?"Nabíjí":l?"Vybíjí":"Klid",u=s?"st-charge":l?"st-discharge":"st-idle",p=`${s?"+":l?"−":""}${tt(Math.abs(e.batteryPower))}`,h=v=>!!v&&/\d/.test(v),g=s&&h(e.timeToFull)?` · do plna ${e.timeToFull}`:l&&h(e.timeToEmpty)?` · do vybití ${e.timeToEmpty}`:"",m=e.batterySoC>=66?"rgba(67,160,71,0.13)":e.batterySoC>=33?"rgba(253,216,53,0.10)":"rgba(229,57,53,0.12)",b=e.batterySoC>=66?"#43a047":e.batterySoC>=33?"#fdd835":"#e53935";return c`
      <div class="${this.nodeClass("battery")}" style="--node-gradient: ${wi.battery}; --node-border: ${pn.battery};"
        @click=${v=>this.toggleExpand("battery",v)}>
        ${this.edgeGauge({id:"gauge-battery",nodeId:"battery",pct:e.batterySoC,stops:[[0,"#e53935"],[.45,"#fb8c00"],[.7,"#fdd835"],[1,"#43a047"]],width:2+Math.min(3,r),pulse:a,pulseDur:Math.max(.9,2.2-r*.35)})}

        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 100%, ${m}, transparent 72%)"></div>
        ${this.gaugePill("battery",`${Math.round(e.batterySoC)} %`,b,c`
          <div class="ss-pop-h"><span>Nabití baterie</span><b style="color:${b}">${Math.round(e.batterySoC)} %</b></div>
          <div class="gp-r"><span>Stav</span><b>${d} ${p}</b></div>
          ${g?c`<div class="gp-r"><span>Čas</span><b>${g.replace(" · ","")}</b></div>`:P}
          <div class="gp-r"><span>Dnes nabito</span><b>${it(e.batteryChargeTotal)}</b></div>
          <div class="gp-r"><span>Dnes vybito</span><b>${it(e.batteryDischargeTotal)}</b></div>
        `)}

        <div class="node-header node-header--split">
          <span class="node-label">🔋 Baterie</span>
          <span class="node-state ${u}">${d}</span>
        </div>

        <div class="node-value" @click=${q("batt_bat_c")}>
          ${Math.round(e.batterySoC)} %
        </div>
        <div class="node-subvalue" @click=${q("batt_batt_comp_p")}>
          ${p}${g}
        </div>

        ${e.isGridCharging?c`
          <span class="grid-charging-badge">⚡🔌 Síťové nabíjení</span>
        `:P}
        ${t.show?c`
          <span class="balancing-indicator ${t.cls}">
            <span>${t.icon}</span>
            <span>${t.text}</span>
          </span>
        `:P}

        <div class="battery-indicators">
          <button class="indicator" @click=${q("extended_battery_voltage")}>
            ⚡ ${e.batteryVoltage.toFixed(1)} V
          </button>
          <button class="indicator" @click=${q("extended_battery_current")}>
            〰️ ${e.batteryCurrent.toFixed(1)} A
          </button>
          <button class="indicator ${n}" @click=${q("extended_battery_temperature")}>
            ${i} ${e.batteryTemp.toFixed(1)} °C
          </button>
        </div>

        <!-- Energie + gc-plan vždy viditelné (ne v detail-section) -->
        <div class="battery-energy-section">
          <div class="detail-header">⚡ Energie dnes</div>
          <div class="energy-grid">
            <div class="detail-row">
              <span class="icon">⬆️</span>
              <button class="clickable" @click=${q("computed_batt_charge_energy_today")}>
                Nab: ${it(e.batteryChargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">⬇️</span>
              <button class="clickable" @click=${q("computed_batt_discharge_energy_today")}>
                Vyb: ${it(e.batteryDischargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">☀️</span>
              <button class="clickable" @click=${q("computed_batt_charge_fve_energy_today")}>
                FVE: ${it(e.batteryChargeSolar)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">🔌</span>
              <button class="clickable" @click=${q("computed_batt_charge_grid_energy_today")}>
                Síť: ${it(e.batteryChargeGrid)}
              </button>
            </div>
          </div>

          <!-- Grid charging plan — always visible badge -->
          <div class="grid-charging-plan-summary">
            <button class="gc-plan-btn ${e.gridChargingPlan.hasBlocks?"has-plan":""}"
              @click=${v=>{v.stopPropagation(),this.openGridChargingDialog()}}>
              🔌
              ${e.gridChargingPlan.hasBlocks?c`Plán: ${e.gridChargingPlan.totalEnergyKwh.toFixed(1)} kWh`:c`Plán nabíjení`}
              <span class="gc-plan-arrow">›</span>
            </button>
          </div>
        </div>
      </div>
    `}getInverterModeDesc(){const e=this.data.inverterMode;return e.includes("Home 1")?"Max baterie + FVE":e.includes("Home 2")?"Šetří baterii":e.includes("Home 3")?"Priorita nabíjení":e.includes("UPS")?"Vše ze sítě":""}renderInverter(){const e=this.data,t=Dl(e.inverterMode),i=e.bypassStatus.toLowerCase()==="on"||e.bypassStatus==="1",n=e.inverterTemp>35?"🔥":"🌡️",r=El(e.inverterGridMode),a=Wc(this.pendingServices,this.changingServices),s=Vc(this.gridDeliveryState);let l="planner-unknown",d="Plánovač: N/A";e.plannerAutoMode===!0?(l="planner-auto",d="Plánovač: AUTO"):e.plannerAutoMode===!1&&(l="planner-off",d="Plánovač: VYPNUTO");const u=e.inverterMode,p=u.includes("UPS")?"#ff9800":u.includes("Home 2")?"#2196f3":u.includes("Home 3")?"#9c27b0":"#4caf50",h=e.inverterTemp>=45?"#e53935":e.inverterTemp>=35?"#ffa726":"#43a047",g=Math.max(0,Math.min(100,e.inverterTemp/55*100)),m=i?"#e53935":h;return c`
      <div class="${this.nodeClass("inverter",a.inverterModeChanging?"mode-changing":"")}" style="--node-gradient: ${wi.inverter}; --node-border: ${pn.inverter};"
        @click=${b=>this.toggleExpand("inverter",b)}
        title="Teplota ${e.inverterTemp.toFixed(1)} °C · ${i?"Bypass aktivní":"Bypass vyp"}">
        ${this.edgeGauge({id:"gauge-inverter",nodeId:"inverter",pct:i?100:g,stops:[[0,m],[1,m]],width:i?4:2.5,pulse:i,pulseDur:1.1})}
        <div class="node-tint" style="background: radial-gradient(120% 90% at 50% 0, ${p}22, transparent 72%)"></div>

        ${this.gaugePill("inverter",i?"⚠ BYPASS":`${e.inverterTemp.toFixed(0)} °C`,m,c`
          <div class="ss-pop-h"><span>Teplota střídače</span><b style="color:${h}">${e.inverterTemp.toFixed(1)} °C</b></div>
          <div class="gp-r"><span>Bypass</span><b>${i?"🔴 AKTIVNÍ":"Vypnutý"}</b></div>
          <div class="gp-r"><span>Režim</span><b>${t.text}</b></div>
        `)}

        <div class="node-header" style="justify-content:center">
          <span class="node-label">⚙️ Střídač</span>
        </div>
        <div class="node-value" @click=${q("box_prms_mode")} style="color:${p}">
          ${a.inverterModeChanging?c`<span class="spinner spinner--small"></span>`:P}
          ${t.icon} ${t.text}
        </div>
        ${this.getInverterModeDesc()?c`<div class="node-subvalue">${this.getInverterModeDesc()}</div>`:P}
        ${a.inverterModeText?c`<div class="pending-text">${a.inverterModeText}</div>`:P}

        <div class="inv-chip ${l}">🤖 ${d}</div>

        <div class="inv-rows">
          <div class="inv-row">
            <span class="inv-lab">${n} Teplota</span>
            <button class="inv-pill" style="background:${h}26;color:${h}"
              @click=${q("box_temp")}>${e.inverterTemp.toFixed(1)} °C</button>
          </div>
          <div class="inv-row">
            <span class="inv-lab">🔁 Bypass</span>
            <button class="inv-pill ${i?"pill-red":"pill-green"}"
              @click=${q("bypass_status")}>${i?"ZAP":"Vyp"}</button>
          </div>
          <div class="inv-row">
            <span class="inv-lab">${r.icon} Dodávka</span>
            <button class="inv-val ${s.isUnavailable?"current-state-unknown":""}"
              @click=${q("invertor_prms_to_grid")}>${s.currentModeText}</button>
          </div>
          ${s.limitLabel!==null?c`
            <div class="inv-row">
              <span class="inv-lab">🌊 ${s.limitLabel}</span>
              <button class="inv-val ${s.showLimitAsActive?"limit-active":""}"
                @click=${q("invertor_prm1_p_max_feed_grid")}>${s.limitValue}</button>
            </div>
          `:P}
          <div class="inv-row">
            <span class="inv-lab">🛡️ Shield</span>
            <span class="inv-val">${this.shieldStatus==="running"?"Zpracovávám":"Nečinný"}${this.shieldQueueCount>0?` (${this.shieldQueueCount})`:""}</span>
          </div>
        </div>

        <button class="inv-note ${e.notificationsError>0?"warn":""}"
          @click=${q("notification_count_unread")}>
          🔔 ${e.notificationsError>0?`${e.notificationsError} chyb · ${e.notificationsUnread} nepřečtených`:e.notificationsUnread>0?`${e.notificationsUnread} nepřečtených`:"Bez notifikací"}
        </button>

        ${s.pendingModeText?c`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${s.pendingModeText}
          </div>
        `:P}
        ${s.pendingLimitText?c`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${s.pendingLimitText}
          </div>
        `:P}
      </div>
    `}renderGrid(){const e=this.data,t=e.gridPower>10,i=e.gridPower<-10,n=Math.abs(e.gridPower),r=n/1e3,a=t?"↓ Odběr ze sítě":i?"↑ Přetok do sítě":"◉ Žádný tok",s=25*230*3,l=e.inverterGridLimit>0?e.inverterGridLimit:5e3,d=t?n/s*100:i?n/l*100:0,u=t?e.spotPrice<=0?"#43a047":e.spotPrice<3?"#ffa726":"#ef5350":i?e.exportPrice>=3?"#43a047":e.exportPrice>=1.5?"#ffa726":"#ef5350":"rgba(255,255,255,0.35)",p=t?`${e.spotPrice.toFixed(2)} Kč`:i?`+${e.exportPrice.toFixed(2)} Kč`:"",h=(g,m)=>m>10?Math.round(Math.abs(g)/m):0;return c`
      <div class="${this.nodeClass("grid")}" style="--node-gradient: ${wi.grid}; --node-border: ${pn.grid};"
        @click=${g=>this.toggleExpand("grid",g)}>
        ${this.edgeGauge({id:"gauge-grid",nodeId:"grid",pct:d,stops:[[0,u],[1,u]],width:2+Math.min(3,r),pulse:t||i,pulseDur:Math.max(.9,2.2-r*.35)})}
        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 50%, ${u}22, transparent 72%)"></div>

        <button class="indicator" style="position:absolute;top:4px;left:6px;font-size:9px;z-index:3" @click=${q("current_tariff")}>
          ${Ml(e.currentTariff)}
        </button>
        <button class="indicator" style="position:absolute;top:4px;right:6px;font-size:9px;z-index:3" @click=${q("ac_in_aci_f")}>
          ${e.gridFrequency.toFixed(1)} Hz
        </button>

        ${this.gaugePill("grid",t||i?`${Math.round(d)} %`:"0 %",u,c`
          <div class="ss-pop-h"><span>${t?"Vytížení jističe":i?"Vytížení limitu přetoku":"Síť v klidu"}</span><b style="color:${u}">${Math.round(d)} %</b></div>
          <div class="gp-r"><span>Tok</span><b>${a} · ${tt(n)}</b></div>
          <div class="gp-r"><span>Limit</span><b>${t?`${(s/1e3).toFixed(1)} kW (25 A/fáze)`:`${(l/1e3).toFixed(1)} kW přetok`}</b></div>
          <div class="gp-r"><span>Spot / Výkup</span><b>${e.spotPrice.toFixed(2)} / ${e.exportPrice.toFixed(2)} Kč</b></div>
        `)}

        <div class="node-header node-header--split" style="margin-top:16px">
          <span class="node-label">🔌 Síť</span>
          <span class="node-state" style="color:${u}">${p}</span>
        </div>
        <div class="node-value" @click=${q("actual_aci_wtotal")}>${tt(n)}</div>
        <div class="node-subvalue" style="color:${u};font-weight:600">${a}</div>

        <!-- Ceny — vždy viditelné jako rychlý přehled -->
        <div class="prices-row" style="margin-top:4px">
          <div class="price-cell">
            <span class="price-label">⬇ Spot</span>
            <button class="price-val price-spot" @click=${q("spot_price_current_15min")}>
              ${e.spotPrice.toFixed(2)} Kč
            </button>
          </div>
          <div class="energy-divider-v"></div>
          <div class="price-cell">
            <span class="price-label">⬆ Výkup</span>
            <button class="price-val price-export" @click=${q("export_price_current_15min")}>
              ${e.exportPrice.toFixed(2)} Kč
            </button>
          </div>
        </div>

        <!-- 3 fáze — vždy viditelné -->
        <div class="phases-grid" style="margin-top:6px">
          <div class="phase-cell">
            <span class="phase-label">L1</span>
            <button class="phase-val" @click=${q("actual_aci_wr")}>${h(e.gridL1P,e.gridL1V)} A</button>
            <button class="phase-val" style="font-size:10px;color:${Y(o.textSecondary)}" @click=${q("actual_aci_wr")}>${Math.round(e.gridL1P)} W</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L2</span>
            <button class="phase-val" @click=${q("actual_aci_ws")}>${h(e.gridL2P,e.gridL2V)} A</button>
            <button class="phase-val" style="font-size:10px;color:${Y(o.textSecondary)}" @click=${q("actual_aci_ws")}>${Math.round(e.gridL2P)} W</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L3</span>
            <button class="phase-val" @click=${q("actual_aci_wt")}>${h(e.gridL3P,e.gridL3V)} A</button>
            <button class="phase-val" style="font-size:10px;color:${Y(o.textSecondary)}" @click=${q("actual_aci_wt")}>${Math.round(e.gridL3P)} W</button>
          </div>
        </div>

        <div class="detail-section">
          <!-- Energie dnes — odběr vlevo, dodávka vpravo -->
          <div class="energy-symmetric">
            <div class="energy-side">
              <span class="energy-side-label">⬇ Odběr</span>
              <button class="energy-side-val energy-import" @click=${q("ac_in_ac_ad")}>
                ${it(e.gridImportToday)}
              </button>
            </div>
            <div class="energy-divider-v"></div>
            <div class="energy-side">
              <span class="energy-side-label">⬆ Dodávka</span>
              <button class="energy-side-val energy-export" @click=${q("ac_in_ac_pd")}>
                ${it(e.gridExportToday)}
              </button>
            </div>
          </div>

        </div>
      </div>
    `}renderHouse(){const e=this.data,t=e.houseTodayWh/1e3,i=e.nonbackupTodayWh/1e3,n=t+i,r=e.housePower+e.nonbackupPower,a=t+e.zalohaPlannedRemainingKwh,s=Math.max(0,-e.batteryPower),l=Math.min(e.solarPower,r),d=Math.min(s,Math.max(0,r-l)),u=Math.max(0,r-l-d),p=r>5?(l+d)/r*100:e.solarPower>5?100:0,h=p>=66?"#43a047":p>=33?"#fdd835":"#e53935",g=y=>r>0?Math.round(y/r*100):0,m=`Soběstačnost ${Math.round(p)} % · FVE ${g(l)} % · Baterie ${g(d)} % · Síť ${g(u)} %`,b=3300,v=4e3,w=[{l:"L1",w:e.houseL1,e:"ac_out_aco_pr"},{l:"L2",w:e.houseL2,e:"ac_out_aco_ps"},{l:"L3",w:e.houseL3,e:"ac_out_aco_pt"}],x=w.find(y=>y.w>b);return c`
      <div class="${this.nodeClass("house")}" style="--node-gradient: ${wi.house}; --node-border: ${pn.house};"
        @click=${y=>this.toggleExpand("house",y)} title=${m}>
        ${this.edgeGauge({id:"gauge-house",nodeId:"house",pct:p,stops:[[0,"#e53935"],[.5,"#fdd835"],[1,"#43a047"]],width:2+Math.min(3,r/1e3),pulse:r>50,pulseDur:Math.max(.9,2.2-r/1e3*.35)})}
        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 100%, ${h}22, transparent 72%)"></div>

        ${this.gaugePill("house",`🛡 ${Math.round(p)} %`,h,c`
          <div class="ss-pop-h"><span>Soběstačnost</span><b style="color:${h}">${Math.round(p)} %</b></div>
          <div class="ss-bar">
            <i style="width:${g(l)}%;background:#ffca5a"></i>
            <i style="width:${g(d)}%;background:#4caf50"></i>
            <i style="width:${g(u)}%;background:#ef5350"></i>
          </div>
          <div class="ss-leg">
            <span>☀️ FVE ${g(l)}%</span>
            <span>🔋 Bat ${g(d)}%</span>
            <span>🔌 Síť ${g(u)}%</span>
          </div>
        `)}

        <button class="indicator house-corner" style="position:absolute;top:4px;left:6px;z-index:3"
          @click=${q("actual_aco_p")} title="Záloha — výkon · dnes">
          <span class="hc-l">🔌 ${tt(e.housePower)}</span>
          <span class="hc-v">${t.toFixed(1)} kWh</span>
        </button>
        <button class="indicator house-corner" style="position:absolute;top:4px;right:6px;text-align:right;z-index:3"
          @click=${q("actual_acinb_wtotal")} title="Nezáloha — výkon · dnes">
          <span class="hc-l">🚗 ${tt(e.nonbackupPower)}</span>
          <span class="hc-v">${i.toFixed(1)} kWh</span>
        </button>

        <div class="node-header" style="margin-top:18px;justify-content:center">
          <span class="node-label">🏠 Spotřeba</span>
        </div>
        <div class="node-value" @click=${q("actual_aco_p")}>${tt(r)}</div>
        <div class="node-subvalue" @click=${q("ac_out_en_day")}>Dnes celkem: ${n.toFixed(1)} kWh</div>
        ${a>0?c`
          <div class="node-subvalue" @click=${q("battery_forecast")}
            title="Předpověď zálohové spotřeby (skutečné + plán)">
            🔮 Záloha plán: ${a.toFixed(1)} kWh
          </div>`:P}

        <!-- Phase balance (záloha) -->
        <div class="detail-section">
          <div class="phasebal-head">
            <span>⚖️ Vyvážení fází</span>
            ${x?c`<span class="pb-crit">⚠ KRIZOVÝ — ${x.l}</span>`:c`<span class="pb-ok">✓ Vyvážené</span>`}
          </div>
          ${w.map(y=>{const S=y.w>b;return c`
              <div class="pb-row">
                <span class="pb-lab">${y.l}</span>
                <div class="pb-track">
                  <div class="pb-fill ${S?"over":""}" style="width:${Math.min(100,y.w/v*100)}%"></div>
                  <div class="pb-mark" style="left:${b/v*100}%"></div>
                </div>
                <button class="pb-val ${S?"over":""}" @click=${q(y.e)}>${(y.w/1e3).toFixed(1)} kW</button>
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
    `}};ke.styles=D`
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

    /* Solar: produced/forecast headline + remaining chip */
    .nv-sub { font-size: 14px; font-weight: 600; opacity: 0.6; }
    .solar-rem { display: inline-block; font-size: 11px; font-weight: 700; border-radius: 6px; padding: 2px 9px; margin-top: 2px; }
    .solar-rem.rem-on { background: #ffca5a; color: #101a10; }
    .solar-rem.rem-off { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }

    /* Phase balance (záloha) */
    .phasebal-head { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 600; opacity: 0.85; margin-bottom: 7px; }
    .pb-ok { font-size: 9.5px; font-weight: 700; color: #9fe6a8; background: rgba(76,175,80,0.16); border: 1px solid rgba(76,175,80,0.3); padding: 2px 7px; border-radius: 6px; }
    .pb-crit { font-size: 9.5px; font-weight: 700; color: #ff9d93; background: rgba(244,67,54,0.18); border: 1px solid rgba(244,67,54,0.4); padding: 2px 7px; border-radius: 6px; }
    .pb-row { display: flex; align-items: center; gap: 7px; margin-bottom: 6px; }
    .pb-lab { font-size: 10px; width: 16px; opacity: 0.7; }
    .pb-track { position: relative; flex: 1; height: 10px; border-radius: 6px; background: rgba(255,255,255,0.07); overflow: hidden; }
    .pb-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 6px; background: #4caf50; transition: width 0.4s; }
    .pb-fill.over { background: linear-gradient(90deg, #fb8c00, #e53935); }
    .pb-mark { position: absolute; top: -2px; bottom: -2px; width: 2px; background: rgba(255,255,255,0.55); }
    .pb-val { font-size: 10px; min-width: 42px; text-align: right; font-weight: 600; background: none; border: none; color: inherit; cursor: pointer; }
    .pb-val.over { color: #ff9d93; }

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
      color: ${Y(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .node-value {
      font-size: 22px;
      font-weight: 700;
      color: ${Y(o.textPrimary)};
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
      color: ${Y(o.textSecondary)};
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
      color: ${Y(o.textSecondary)};
      margin-top: 4px;
    }

    .pending-overlay {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: ${Y(o.accent)};
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 4px;
      padding: 2px 6px;
      margin-top: 4px;
    }

    .current-state-unknown {
      color: ${Y(o.textSecondary)};
      font-style: italic;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid ${Y(o.divider)};
      border-top-color: ${Y(o.accent)};
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
      border-top: 1px solid ${Y(o.divider)};
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
      border-top: 1px dashed ${Y(o.divider)};
    }

    .detail-header {
      font-size: 10px;
      font-weight: 600;
      color: ${Y(o.textSecondary)};
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: ${Y(o.textSecondary)};
      margin-bottom: 2px;
    }

    .detail-row .icon { width: 14px; text-align: center; flex-shrink: 0; }

    .clickable {
      cursor: pointer;
      color: ${Y(o.textPrimary)};
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
      color: ${Y(o.textSecondary)};
      margin: 4px 0;
      align-items: center;
      justify-content: center;
    }

    .phase-sep { color: ${Y(o.divider)}; }

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

    .house-corner {
      display: flex;
      flex-direction: column;
      gap: 1px;
      font-size: 9px;
      line-height: 1.15;
      background: rgba(0, 0, 0, 0.18);
      padding: 2px 5px;
      border-radius: 5px;
    }
    .house-corner .hc-l { font-weight: 700; }
    .house-corner .hc-v { opacity: 0.7; }

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
      background: ${Y(o.bgSecondary)};
      border: none;
      font-family: inherit;
      color: ${Y(o.textSecondary)};
    }

    .indicator:hover { background: ${Y(o.divider)}; }

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
      border-top: 1px solid ${Y(o.divider)};
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
      border: 1px solid ${Y(o.divider)};
      background: transparent;
      color: ${Y(o.textSecondary)};
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .gc-plan-btn:hover {
      background: rgba(255,255,255,0.06);
      color: ${Y(o.textPrimary)};
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
      border-top: 1px dashed ${Y(o.divider)};
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
      color: ${Y(o.textSecondary)};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .phase-val {
      font-size: 11px;
      font-weight: 600;
      color: ${Y(o.textPrimary)};
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    .phase-val:hover { text-decoration: underline; }
    .phase-divider {
      border: none;
      border-top: 1px solid ${Y(o.divider)};
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
      color: ${Y(o.textSecondary)};
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
      color: ${Y(o.textPrimary)};
    }
    .energy-side-val:hover { text-decoration: underline; }
    .energy-import { color: #ef5350; }
    .energy-export { color: #66bb6a; }
    .energy-divider-v {
      width: 1px;
      height: 28px;
      background: ${Y(o.divider)};
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
      color: ${Y(o.textSecondary)};
      text-transform: uppercase;
    }
    .price-val {
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: ${Y(o.textPrimary)};
    }
    .price-val:hover { text-decoration: underline; }
    .price-spot { color: #ef5350; }
    .price-export { color: #66bb6a; }

    @media (min-width: 1025px) {
      .detail-section {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid ${Y(o.divider)};
      }
      .boiler-section,
      .grid-charging-plan {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed ${Y(o.divider)};
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
      .phases-grid { display: none; }
    }
  `;ze([f({type:Object})],ke.prototype,"data",2);ze([f({type:Boolean})],ke.prototype,"editMode",2);ze([T()],ke.prototype,"pendingServices",2);ze([T()],ke.prototype,"changingServices",2);ze([T()],ke.prototype,"shieldStatus",2);ze([T()],ke.prototype,"shieldQueueCount",2);ze([T()],ke.prototype,"gridDeliveryState",2);ze([T()],ke.prototype,"expandedNodes",2);ze([T()],ke.prototype,"gaugeDetailOpen",2);ze([T()],ke.prototype,"customPositions",2);ze([T()],ke.prototype,"nodeDims",2);ke=ze([O("oig-flow-node")],ke);var ld=Object.defineProperty,cd=Object.getOwnPropertyDescriptor,Lt=(e,t,i,n)=>{for(var r=n>1?void 0:n?cd(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&ld(t,i,r),r};function dd(e,t){return{fromColor:da[e]||"#9e9e9e",toColor:da[t]||"#9e9e9e"}}const ud=G;let Xe=class extends E{constructor(){super(...arguments),this.data=Fr,this.particlesEnabled=!0,this.active=!0,this.editMode=!1,this.lines=[],this.animationId=null,this.lastSpawnTime={},this.particleCount=0,this.MAX_PARTICLES=50,this.onVisibilityChange=()=>{this.updateAnimationState()},this.onLayoutChanged=()=>{this.drawConnectionsDeferred()}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this.onVisibilityChange),this.addEventListener("layout-changed",this.onLayoutChanged)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this.onVisibilityChange),this.removeEventListener("layout-changed",this.onLayoutChanged),this.stopAnimation()}updated(e){e.has("data")&&(this.updateLines(),this.animationId!==null&&this.spawnParticles()),(e.has("active")||e.has("particlesEnabled"))&&this.updateAnimationState(),this.drawConnectionsDeferred()}firstUpdated(){this.updateLines(),this.updateAnimationState(),new ResizeObserver(()=>this.drawConnectionsDeferred()).observe(this)}drawConnectionsDeferred(){requestAnimationFrame(()=>this.drawConnectionsSVG())}getParticlesLayer(){var e;return(e=this.renderRoot)==null?void 0:e.querySelector(".particles-layer")}getGridMetrics(){var a,s;const e=(a=this.renderRoot)==null?void 0:a.querySelector("oig-flow-node");if(!e)return null;const i=(e.renderRoot||e.shadowRoot||e).querySelector(".flow-grid");if(!i)return null;const n=(s=this.renderRoot)==null?void 0:s.querySelector(".canvas-container");if(!n)return null;const r=i.getBoundingClientRect();return r.width===0||r.height===0?null:{grid:i,gridRect:r,canvasRect:n.getBoundingClientRect()}}positionOverlayLayer(e,t,i){const n=t.left-i.left,r=t.top-i.top;e.style.left=`${n}px`,e.style.top=`${r}px`,e.style.width=`${t.width}px`,e.style.height=`${t.height}px`}updateLines(){const e=this.data,t=[],i=e.solarPower>50;t.push({id:"solar-inverter",from:"solar",to:"inverter",color:Nt.solar,power:i?e.solarPower:0,params:i?gn(e.solarPower,hn.solar,"solar"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:i});const n=Math.abs(e.batteryPower)>50,r=e.batteryPower>0;t.push({id:"battery-inverter",from:n&&r?"inverter":"battery",to:n&&r?"battery":"inverter",color:Nt.battery,power:n?Math.abs(e.batteryPower):0,params:n?gn(e.batteryPower,hn.battery,"battery"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:n});const a=Math.abs(e.gridPower)>50,s=e.gridPower>0;t.push({id:"grid-inverter",from:a?s?"grid":"inverter":"grid",to:a?s?"inverter":"grid":"inverter",color:a?s?Nt.grid_import:Nt.grid_export:Nt.grid_import,power:a?Math.abs(e.gridPower):0,params:a?gn(e.gridPower,hn.grid,"grid"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:a});const l=e.housePower>50;t.push({id:"inverter-house",from:"inverter",to:"house",color:Nt.house,power:l?e.housePower:0,params:l?gn(e.housePower,hn.house,"house"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:l}),this.lines=t}calcEdgePoint(e,t,i,n){const r=t.x-e.x,a=t.y-e.y;if(r===0&&a===0)return{...e};const s=Math.abs(r),l=Math.abs(a),d=s*n>l*i?i/s:n/l;return{x:e.x+r*d,y:e.y+a*d}}getNodeInfo(e,t,i){const n=e.querySelector(`.node-${i}`);if(!n)return null;const r=n.getBoundingClientRect();return{x:r.left+r.width/2-t.left,y:r.top+r.height/2-t.top,hw:r.width/2,hh:r.height/2}}drawConnectionsSVG(){const e=this.svgEl;if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:n,canvasRect:r}=t;this.positionOverlayLayer(e,n,r),e.setAttribute("viewBox",`0 0 ${n.width} ${n.height}`);const a=this.getParticlesLayer();a&&this.positionOverlayLayer(a,n,r),e.innerHTML="";const s="http://www.w3.org/2000/svg",l=document.createElementNS(s,"defs"),d=document.createElementNS(s,"filter");d.setAttribute("id","neon-glow"),d.setAttribute("x","-50%"),d.setAttribute("y","-50%"),d.setAttribute("width","200%"),d.setAttribute("height","200%");const u=document.createElementNS(s,"feGaussianBlur");u.setAttribute("in","SourceGraphic"),u.setAttribute("stdDeviation","3"),u.setAttribute("result","blur"),d.appendChild(u);const p=document.createElementNS(s,"feMerge"),h=document.createElementNS(s,"feMergeNode");h.setAttribute("in","blur"),p.appendChild(h);const g=document.createElementNS(s,"feMergeNode");g.setAttribute("in","SourceGraphic"),p.appendChild(g),d.appendChild(p),l.appendChild(d),e.appendChild(l);for(const m of this.lines){const b=this.getNodeInfo(i,n,m.from),v=this.getNodeInfo(i,n,m.to);if(!b||!v)continue;const w={x:b.x,y:b.y},x={x:v.x,y:v.y},y=this.calcEdgePoint(w,x,b.hw,b.hh),S=this.calcEdgePoint(x,w,v.hw,v.hh),H=S.x-y.x,N=S.y-y.y,K=Math.sqrt(H*H+N*N),$=Math.min(K*.2,40),A=-N/K,B=H/K,k=(y.x+S.x)/2,Z=(y.y+S.y)/2,R=k+A*$,ne=Z+B*$,Le=`grad-${m.id}`,{fromColor:bi,toColor:vi}=dd(m.from,m.to),Pe=document.createElementNS(s,"linearGradient");Pe.setAttribute("id",Le),Pe.setAttribute("x1","0%"),Pe.setAttribute("y1","0%"),Pe.setAttribute("x2","100%"),Pe.setAttribute("y2","0%");const F=document.createElementNS(s,"stop");F.setAttribute("offset","0%"),F.setAttribute("stop-color",bi);const ae=document.createElementNS(s,"stop");ae.setAttribute("offset","100%"),ae.setAttribute("stop-color",vi),Pe.appendChild(F),Pe.appendChild(ae),l.appendChild(Pe);const be=document.createElementNS(s,"path");if(be.setAttribute("d",`M ${y.x} ${y.y} Q ${R} ${ne} ${S.x} ${S.y}`),be.setAttribute("stroke",`url(#${Le})`),be.setAttribute("stroke-width","3"),be.setAttribute("stroke-linecap","round"),be.setAttribute("fill","none"),be.setAttribute("opacity",m.active?"0.8":"0.18"),m.active&&be.setAttribute("filter","url(#neon-glow)"),be.classList.add("flow-line"),m.active||be.classList.add("flow-line--inactive"),e.appendChild(be),m.params.active){const Ne=document.createElementNS(s,"polygon");Ne.setAttribute("points",`0,-6 ${6*1.2},0 0,6`),Ne.setAttribute("fill",m.color),Ne.setAttribute("opacity","0.9");const We=document.createElementNS(s,"animateMotion");We.setAttribute("dur",`${Math.max(1,m.params.speed/1e3)}s`),We.setAttribute("repeatCount","indefinite"),We.setAttribute("path",`M ${y.x} ${y.y} Q ${R} ${ne} ${S.x} ${S.y}`),We.setAttribute("rotate","auto"),Ne.appendChild(We),e.appendChild(Ne)}}}updateAnimationState(){this.particlesEnabled&&this.active&&!document.hidden&&!Ee.reduceMotion?(this.spawnParticles(),this.startAnimation()):this.stopAnimation()}startAnimation(){if(this.animationId!==null)return;const e=()=>{this.spawnParticles(),this.animationId=requestAnimationFrame(e)};this.animationId=requestAnimationFrame(e)}stopAnimation(){this.animationId!==null&&(cancelAnimationFrame(this.animationId),this.animationId=null)}spawnParticles(){if(this.particleCount>=this.MAX_PARTICLES)return;const e=this.getParticlesLayer();if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:n,canvasRect:r}=t;this.positionOverlayLayer(e,n,r);const a=performance.now();for(const s of this.lines){if(!s.params.active)continue;const l=s.params.speed,d=this.lastSpawnTime[s.id]||0;if(a-d<l)continue;const u=this.getNodeInfo(i,n,s.from),p=this.getNodeInfo(i,n,s.to);if(!u||!p)continue;const h={x:u.x,y:u.y},g={x:p.x,y:p.y},m=this.calcEdgePoint(h,g,u.hw,u.hh),b=this.calcEdgePoint(g,h,p.hw,p.hh);this.lastSpawnTime[s.id]=a;const v=s.params.count;for(let w=0;w<v&&!(this.particleCount>=this.MAX_PARTICLES);w++)this.createParticle(e,m,b,s.color,s.params,w*(s.params.speed/v/2))}}createParticle(e,t,i,n,r,a){const s=document.createElement("div");s.className="particle";const l=r.size;s.style.width=`${l}px`,s.style.height=`${l}px`,s.style.background=n,s.style.left=`${t.x}px`,s.style.top=`${t.y}px`,s.style.boxShadow=`0 0 ${l}px ${n}`,s.style.opacity="0",e.appendChild(s),this.particleCount++;const d=r.speed;setTimeout(()=>{let u=!1;const p=()=>{u||(u=!0,s.isConnected&&s.remove(),this.particleCount=Math.max(0,this.particleCount-1))};if(typeof s.animate=="function"){const h=s.animate([{left:`${t.x}px`,top:`${t.y}px`,opacity:0,offset:0},{opacity:r.opacity,offset:.1},{opacity:r.opacity,offset:.9},{left:`${i.x}px`,top:`${i.y}px`,opacity:0,offset:1}],{duration:d,easing:"linear"});h.onfinish=p,h.oncancel=p}else s.style.transition=`left ${d}ms linear, top ${d}ms linear, opacity ${d}ms linear`,s.style.opacity=`${r.opacity}`,requestAnimationFrame(()=>{s.style.left=`${i.x}px`,s.style.top=`${i.y}px`,s.style.opacity="0"}),s.addEventListener("transitionend",p,{once:!0}),window.setTimeout(p,d+50)},a)}render(){return c`
      <div class="canvas-container">
        <div class="flow-grid-wrapper">
          <oig-flow-node .data=${this.data} .editMode=${this.editMode}></oig-flow-node>
        </div>

        <svg class="connections-layer"></svg>

        <div class="particles-layer"></div>
      </div>
    `}resetLayout(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-flow-node");e!=null&&e.resetLayout&&e.resetLayout()}};Xe.styles=D`
    :host {
      display: block;
      position: relative;
      width: 100%;
      background: ${ud(o.bgSecondary)};
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
  `;Lt([f({type:Object})],Xe.prototype,"data",2);Lt([f({type:Boolean})],Xe.prototype,"particlesEnabled",2);Lt([f({type:Boolean})],Xe.prototype,"active",2);Lt([f({type:Boolean})],Xe.prototype,"editMode",2);Lt([T()],Xe.prototype,"lines",2);Lt([Vn(".connections-layer")],Xe.prototype,"svgEl",2);Xe=Lt([O("oig-flow-canvas")],Xe);var pd=Object.defineProperty,hd=Object.getOwnPropertyDescriptor,Vr=(e,t,i,n)=>{for(var r=n>1?void 0:n?hd(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&pd(t,i,r),r};const Ie=G;let Ni=class extends E{constructor(){super(...arguments),this.data=null,this.open=!1,this.onKeyDown=e=>{e.key==="Escape"&&this.hide()}}show(){this.open=!0}hide(){this.open=!1}onOverlayClick(e){e.target===e.currentTarget&&this.hide()}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onKeyDown),this.addEventListener("oig-grid-charging-open",()=>this.show())}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onKeyDown)}formatTime(e){const t=e.time_from??"--:--",i=e.time_to??"--:--";return`${t} – ${i}`}isBlockActive(e){if(!e.time_from||!e.time_to)return!1;const t=new Date,i=t.toISOString().slice(0,10);if(e.day==="tomorrow")return!1;const n=`${i}T${e.time_from}`,r=`${i}T${e.time_to}`,a=new Date(n),s=new Date(r);return t>=a&&t<s}renderEmpty(){return c`
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
          `:P}
          ${e.totalCostCzk>0?c`
            <span class="summary-chip cost">💰 ~${e.totalCostCzk.toFixed(0)} Kč</span>
          `:P}
          ${e.windowLabel?c`
            <span class="summary-chip time">🪟 ${e.windowLabel}</span>
          `:P}
          ${e.durationMinutes>0?c`
            <span class="summary-chip time">⏱️ ${Math.round(e.durationMinutes)} min</span>
          `:P}
        </div>

        <!-- Active block banner -->
        ${t?c`
          <div class="active-block-banner">
            <div class="pulse-dot"></div>
            <span>Probíhá: ${this.formatTime(t)}
              ${t.grid_charge_kwh!=null?` · ${t.grid_charge_kwh.toFixed(1)} kWh`:P}
            </span>
          </div>
        `:P}

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
            ${e.blocks.map((i,n)=>{const r=this.isBlockActive(i);return c`
                <tr class="${r?"is-active":!r&&n===0&&!t?"is-next":""}">
                  <td>${this.formatTime(i)}</td>
                  <td>
                    ${i.day?c`
                      <span class="day-badge ${i.day}">${i.day==="today"?"dnes":"zítra"}</span>
                    `:P}
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
              `:P}
            </div>
            <button class="close-btn" @click=${()=>this.hide()} aria-label="Zavřít">✕</button>
          </div>
          <div class="dialog-body">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `:P}};Ni.styles=D`
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
      background: ${Ie(o.cardBg)};
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
      border-bottom: 1px solid ${Ie(o.divider)};
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
      color: ${Ie(o.textPrimary)};
    }

    .dialog-header-subtitle {
      font-size: 11px;
      color: ${Ie(o.textSecondary)};
      margin-top: 2px;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: ${Ie(o.textSecondary)};
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
      color: ${Ie(o.textPrimary)};
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
      color: ${Ie(o.textSecondary)};
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
      color: ${Ie(o.textSecondary)};
      padding: 0 6px 8px;
      border-bottom: 1px solid ${Ie(o.divider)};
    }

    .blocks-table th:last-child,
    .blocks-table td:last-child {
      text-align: right;
    }

    .blocks-table td {
      padding: 8px 6px;
      font-size: 12px;
      color: ${Ie(o.textPrimary)};
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
      color: ${Ie(o.textSecondary)};
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
  `;Vr([f({type:Object})],Ni.prototype,"data",2);Vr([T()],Ni.prototype,"open",2);Ni=Vr([O("oig-grid-charging-dialog")],Ni);var gd=Object.defineProperty,fd=Object.getOwnPropertyDescriptor,fe=(e,t,i,n)=>{for(var r=n>1?void 0:n?fd(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&gd(t,i,r),r};const oe=G;Hn.register(is,ns,rs,as,ss,os,ls);let lt=class extends E{constructor(){super(...arguments),this.values=[],this.color="rgba(76, 175, 80, 1)",this.startTime="",this.endTime="",this.chart=null,this.lastDataKey="",this.initializing=!1}render(){return c`<canvas></canvas>`}firstUpdated(){this.values.length>0&&(this.initializing=!0,requestAnimationFrame(()=>{this.createSparkline(),this.initializing=!1}))}updated(e){this.initializing||(e.has("values")||e.has("color"))&&this.updateOrCreateSparkline()}disconnectedCallback(){super.disconnectedCallback(),this.destroyChart()}updateOrCreateSparkline(){var t,i,n,r;if(!this.canvas||this.values.length===0)return;const e=JSON.stringify({v:this.values,c:this.color});if(!(e===this.lastDataKey&&this.chart)){if(this.lastDataKey=e,(n=(i=(t=this.chart)==null?void 0:t.data)==null?void 0:i.datasets)!=null&&n[0]){const a=this.chart.data.datasets[0];if(!((((r=this.chart.data.labels)==null?void 0:r.length)||0)!==this.values.length)){a.data=this.values,a.borderColor=this.color,a.backgroundColor=this.color.replace("1)","0.2)"),this.chart.update("none");return}}this.destroyChart(),this.createSparkline()}}createSparkline(){if(!this.canvas||this.values.length===0)return;this.destroyChart();const e=this.color,t=this.values,i=new Date(this.startTime),n=t.map((r,a)=>new Date(i.getTime()+a*15*60*1e3).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}));this.chart=new Hn(this.canvas,{type:"line",data:{labels:n,datasets:[{data:t,borderColor:e,backgroundColor:e.replace("1)","0.2)"),borderWidth:2,fill:!0,tension:.3,pointRadius:0,pointHoverRadius:5}]},plugins:[],options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:0},plugins:{legend:{display:!1},tooltip:{enabled:!0,backgroundColor:"rgba(0, 0, 0, 0.8)",titleColor:"#fff",bodyColor:"#fff",padding:8,displayColors:!1,callbacks:{title:r=>{var a;return((a=r[0])==null?void 0:a.label)||""},label:r=>`${r.parsed.y.toFixed(2)} Kč/kWh`}},datalabels:{display:!1},zoom:{pan:{enabled:!0,mode:"x",modifierKey:"shift"},zoom:{wheel:{enabled:!0,speed:.1},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)"},mode:"x"}}},scales:{x:{display:!1},y:{display:!0,position:"right",grace:"10%",ticks:{color:"rgba(255, 255, 255, 0.6)",font:{size:8},callback:r=>Number(r).toFixed(1),maxTicksLimit:3},grid:{display:!1}}},layout:{padding:0},interaction:{mode:"nearest",intersect:!1}}})}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}};lt.styles=D`
    :host {
      display: block;
      width: 100%;
      height: 30px;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `;fe([f({type:Array})],lt.prototype,"values",2);fe([f({type:String})],lt.prototype,"color",2);fe([f({type:String})],lt.prototype,"startTime",2);fe([f({type:String})],lt.prototype,"endTime",2);fe([Vn("canvas")],lt.prototype,"canvas",2);lt=fe([O("oig-mini-sparkline")],lt);let Se=class extends E{constructor(){super(...arguments),this.title="",this.time="",this.valueText="",this.value=0,this.unit="Kč/kWh",this.variant="default",this.clickable=!1,this.startTime="",this.endTime="",this.sparklineValues=[],this.sparklineColor="rgba(76, 175, 80, 1)",this.handleClick=()=>{this.clickable&&this.dispatchEvent(new CustomEvent("card-click",{detail:{startTime:this.startTime,endTime:this.endTime,value:this.value},bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),this.clickable&&this.addEventListener("click",this.handleClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleClick)}render(){const e=this.valueText||`${this.value.toFixed(2)} <span class="stat-unit">${this.unit}</span>`;return c`
      <div class="card-title">${this.title}</div>
      <div class="card-value ${this.variant}" .innerHTML=${e}></div>
      ${this.time?c`<div class="card-time">${this.time}</div>`:P}
      ${this.sparklineValues.length>0?c`
            <div class="sparkline-container">
              <oig-mini-sparkline
                .values=${this.sparklineValues}
                .color=${this.sparklineColor}
                .startTime=${this.startTime}
                .endTime=${this.endTime}
              ></oig-mini-sparkline>
            </div>
          `:P}
    `}};Se.styles=D`
    :host {
      display: block;
      background: ${oe(o.cardBg)};
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: ${oe(o.cardShadow)};
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
      color: ${oe(o.textSecondary)};
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 700;
      color: ${oe(o.textPrimary)};
      line-height: 1.2;
    }

    .card-value .stat-unit {
      font-size: 12px;
      font-weight: 400;
      color: ${oe(o.textSecondary)};
    }

    .card-value.success { color: #4CAF50; }
    .card-value.warning { color: #FFA726; }
    .card-value.danger { color: #F44336; }
    .card-value.info { color: #29B6F6; }

    .card-time {
      font-size: 10px;
      color: ${oe(o.textSecondary)};
      margin-top: 4px;
    }

    .sparkline-container {
      margin-top: 8px;
    }
  `;fe([f({type:String})],Se.prototype,"title",2);fe([f({type:String})],Se.prototype,"time",2);fe([f({type:String})],Se.prototype,"valueText",2);fe([f({type:Number})],Se.prototype,"value",2);fe([f({type:String})],Se.prototype,"unit",2);fe([f({type:String})],Se.prototype,"variant",2);fe([f({type:Boolean})],Se.prototype,"clickable",2);fe([f({type:String})],Se.prototype,"startTime",2);fe([f({type:String})],Se.prototype,"endTime",2);fe([f({type:Array})],Se.prototype,"sparklineValues",2);fe([f({type:String})],Se.prototype,"sparklineColor",2);Se=fe([O("oig-stats-card")],Se);function md(e){const t=new Date(e.start),i=new Date(e.end),n=t.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit"}),r=t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}),a=i.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"});return`${n} ${r} - ${a}`}let Ri=class extends E{constructor(){super(...arguments),this.data=null,this.topOnly=!1}onCardClick(e){this.dispatchEvent(new CustomEvent("zoom-to-block",{detail:e.detail,bubbles:!0,composed:!0}))}renderPriceTiles(){if(!this.data)return P;const e=this.data.solarForecastTotal,t=this.data.solarForecastTomorrow,i=this.data.solarForecastStale,n=e>0||t>0,r=this.data.whatIf,a=(r==null?void 0:r.totalSavings)??null,s=(r==null?void 0:r.totalCost)??null,l=a==null?"":a>=.005?"pos":a<=-.005?"neg":"";return c`
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
          ${s!=null?`Náklady ${s.toFixed(0)} Kč`:P}
        </div>
      </div>

      <div class="price-tile solar">
        <div class="price-tile-label">☀ Solár předpověď</div>
        <div class="price-tile-value">
          ${n?c`${i?"⚠ ":""}${e.toFixed(1)} <span class="price-tile-unit">kWh</span>`:c`-- <span class="price-tile-unit">kWh</span>`}
        </div>
        <div class="price-tile-sub">
          ${n?i?"Zastaralá":`Zítra ${t.toFixed(1)} kWh`:"Nedostupná"}
        </div>
      </div>
    `}renderBlockCard(e,t,i,n){return t?c`
      <oig-stats-card
        title=${e}
        .value=${t.avg}
        unit="Kč/kWh"
        .time=${md(t)}
        variant=${i}
        clickable
        .startTime=${t.start}
        .endTime=${t.end}
        .sparklineValues=${t.values}
        .sparklineColor=${n}
        @card-click=${this.onCardClick}
      ></oig-stats-card>
    `:P}renderExtremeBlocks(){if(!this.data)return P;const{cheapestBuyBlock:e,expensiveBuyBlock:t,bestExportBlock:i,worstExportBlock:n}=this.data;return c`
      ${this.renderBlockCard("Nejlevnější nákup",e,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejdražší nákup",t,"danger","rgba(244, 67, 54, 1)")}
      ${this.renderBlockCard("Nejlepší výkup",i,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejhorší výkup",n,"warning","rgba(255, 167, 38, 1)")}
    `}renderPlannedConsumption(){var s;const e=(s=this.data)==null?void 0:s.plannedConsumption;if(!e)return P;const t=e.todayTotalKwh,i=e.tomorrowKwh,n=t+(i||0),r=n>0?t/n*100:50,a=n>0?(i||0)/n*100:50;return c`
      <div class="planned-section">
        <div class="section-label" style="margin-bottom: 8px;">Plánovaná spotřeba (dnes + zítra)</div>
        <div class="planned-header">
          <div>
            <div class="planned-main-value">
              ${n>0?c`${n.toFixed(1)} <span class="unit">kWh</span>`:"--"}
            </div>
            <div class="planned-profile">${e.profile}</div>
          </div>
          ${e.trendText?c`<div class="planned-trend">${e.trendText}</div>`:P}
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

        ${n>0?c`
              <div class="planned-bars">
                <div class="bar-today" style="width: ${r}%"></div>
                <div class="bar-tomorrow" style="width: ${a}%"></div>
              </div>
              <div class="bar-labels">
                <span>Dnes celkem: ${t.toFixed(1)}</span>
                <span>Zítra: ${i!=null?i.toFixed(1):"--"}</span>
              </div>
            `:P}
      </div>
    `}render(){return!this.data||this.data.timeline.length===0?this.topOnly?P:c`<div style="color: ${o.textSecondary}; padding: 16px;">Načítání cenových dat...</div>`:this.topOnly?c`
        <div class="top-row">
          ${this.renderPriceTiles()}
          ${this.renderExtremeBlocks()}
        </div>
      `:c`${this.renderPlannedConsumption()}`}};Ri.styles=D`
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
      background: ${oe(o.cardBg)};
      border-radius: 10px;
      padding: 10px 12px;
      box-shadow: ${oe(o.cardShadow)};
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 76px;
    }

    .price-tile.spot {
      background: linear-gradient(135deg, ${oe(o.accent)}22 0%, ${oe(o.accent)}11 100%);
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
      color: ${oe(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .price-tile-value {
      font-size: 16px;
      font-weight: 700;
      color: ${oe(o.textPrimary)};
      line-height: 1.2;
    }

    .price-tile-unit {
      font-size: 10px;
      font-weight: 400;
      color: ${oe(o.textSecondary)};
      opacity: 0.7;
    }

    .price-tile-sub {
      font-size: 9px;
      color: ${oe(o.textSecondary)};
      opacity: 0.55;
      margin-top: 3px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: ${oe(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    /* Planned consumption */
    .planned-section {
      background: ${oe(o.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: ${oe(o.cardShadow)};
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
      color: ${oe(o.textPrimary)};
    }

    .planned-main-value .unit {
      font-size: 12px;
      font-weight: 400;
      color: ${oe(o.textSecondary)};
    }

    .planned-trend {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
    }

    .planned-profile {
      font-size: 11px;
      color: ${oe(o.textSecondary)};
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
      color: ${oe(o.textSecondary)};
      text-transform: uppercase;
    }

    .planned-detail-value {
      font-size: 14px;
      font-weight: 600;
      color: ${oe(o.textPrimary)};
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
      color: ${oe(o.textSecondary)};
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
  `;fe([f({type:Object})],Ri.prototype,"data",2);fe([f({type:Boolean})],Ri.prototype,"topOnly",2);Ri=fe([O("oig-pricing-stats")],Ri);const Es=6048e5,bd=864e5,an=6e4,sn=36e5,vd=1e3,za=Symbol.for("constructDateFrom");function ue(e,t){return typeof e=="function"?e(t):e&&typeof e=="object"&&za in e?e[za](t):e instanceof Date?new e.constructor(t):new Date(t)}function W(e,t){return ue(t||e,e)}function Yn(e,t,i){const n=W(e,i==null?void 0:i.in);return isNaN(t)?ue((i==null?void 0:i.in)||e,NaN):(t&&n.setDate(n.getDate()+t),n)}function Wr(e,t,i){const n=W(e,i==null?void 0:i.in);if(isNaN(t))return ue(e,NaN);if(!t)return n;const r=n.getDate(),a=ue(e,n.getTime());a.setMonth(n.getMonth()+t+1,0);const s=a.getDate();return r>=s?a:(n.setFullYear(a.getFullYear(),a.getMonth(),r),n)}function qr(e,t,i){return ue(e,+W(e)+t)}function yd(e,t,i){return qr(e,t*sn)}let xd={};function It(){return xd}function Ve(e,t){var l,d,u,p;const i=It(),n=(t==null?void 0:t.weekStartsOn)??((d=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:d.weekStartsOn)??i.weekStartsOn??((p=(u=i.locale)==null?void 0:u.options)==null?void 0:p.weekStartsOn)??0,r=W(e,t==null?void 0:t.in),a=r.getDay(),s=(a<n?7:0)+a-n;return r.setDate(r.getDate()-s),r.setHours(0,0,0,0),r}function ti(e,t){return Ve(e,{...t,weekStartsOn:1})}function Os(e,t){const i=W(e,t==null?void 0:t.in),n=i.getFullYear(),r=ue(i,0);r.setFullYear(n+1,0,4),r.setHours(0,0,0,0);const a=ti(r),s=ue(i,0);s.setFullYear(n,0,4),s.setHours(0,0,0,0);const l=ti(s);return i.getTime()>=a.getTime()?n+1:i.getTime()>=l.getTime()?n:n-1}function Cn(e){const t=W(e),i=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()));return i.setUTCFullYear(t.getFullYear()),+e-+i}function Ft(e,...t){const i=ue.bind(null,t.find(n=>typeof n=="object"));return t.map(i)}function Er(e,t){const i=W(e,t==null?void 0:t.in);return i.setHours(0,0,0,0),i}function zs(e,t,i){const[n,r]=Ft(i==null?void 0:i.in,e,t),a=Er(n),s=Er(r),l=+a-Cn(a),d=+s-Cn(s);return Math.round((l-d)/bd)}function wd(e,t){const i=Os(e,t),n=ue(e,0);return n.setFullYear(i,0,4),n.setHours(0,0,0,0),ti(n)}function $d(e,t,i){const n=W(e,i==null?void 0:i.in);return n.setTime(n.getTime()+t*an),n}function _d(e,t,i){return Wr(e,t*3,i)}function kd(e,t,i){return qr(e,t*1e3)}function Sd(e,t,i){return Yn(e,t*7,i)}function Cd(e,t,i){return Wr(e,t*12,i)}function Ai(e,t){const i=+W(e)-+W(t);return i<0?-1:i>0?1:i}function Pd(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function As(e){return!(!Pd(e)&&typeof e!="number"||isNaN(+W(e)))}function Td(e,t,i){const[n,r]=Ft(i==null?void 0:i.in,e,t),a=n.getFullYear()-r.getFullYear(),s=n.getMonth()-r.getMonth();return a*12+s}function Md(e,t,i){const[n,r]=Ft(i==null?void 0:i.in,e,t);return n.getFullYear()-r.getFullYear()}function Ls(e,t,i){const[n,r]=Ft(i==null?void 0:i.in,e,t),a=Aa(n,r),s=Math.abs(zs(n,r));n.setDate(n.getDate()-a*s);const l=+(Aa(n,r)===-a),d=a*(s-l);return d===0?0:d}function Aa(e,t){const i=e.getFullYear()-t.getFullYear()||e.getMonth()-t.getMonth()||e.getDate()-t.getDate()||e.getHours()-t.getHours()||e.getMinutes()-t.getMinutes()||e.getSeconds()-t.getSeconds()||e.getMilliseconds()-t.getMilliseconds();return i<0?-1:i>0?1:i}function on(e){return t=>{const n=(e?Math[e]:Math.trunc)(t);return n===0?0:n}}function Dd(e,t,i){const[n,r]=Ft(i==null?void 0:i.in,e,t),a=(+n-+r)/sn;return on(i==null?void 0:i.roundingMethod)(a)}function Kr(e,t){return+W(e)-+W(t)}function Ed(e,t,i){const n=Kr(e,t)/an;return on(i==null?void 0:i.roundingMethod)(n)}function Is(e,t){const i=W(e,t==null?void 0:t.in);return i.setHours(23,59,59,999),i}function Fs(e,t){const i=W(e,t==null?void 0:t.in),n=i.getMonth();return i.setFullYear(i.getFullYear(),n+1,0),i.setHours(23,59,59,999),i}function Od(e,t){const i=W(e,t==null?void 0:t.in);return+Is(i,t)==+Fs(i,t)}function Bs(e,t,i){const[n,r,a]=Ft(i==null?void 0:i.in,e,e,t),s=Ai(r,a),l=Math.abs(Td(r,a));if(l<1)return 0;r.getMonth()===1&&r.getDate()>27&&r.setDate(30),r.setMonth(r.getMonth()-s*l);let d=Ai(r,a)===-s;Od(n)&&l===1&&Ai(n,a)===1&&(d=!1);const u=s*(l-+d);return u===0?0:u}function zd(e,t,i){const n=Bs(e,t,i)/3;return on(i==null?void 0:i.roundingMethod)(n)}function Ad(e,t,i){const n=Kr(e,t)/1e3;return on(i==null?void 0:i.roundingMethod)(n)}function Ld(e,t,i){const n=Ls(e,t,i)/7;return on(i==null?void 0:i.roundingMethod)(n)}function Id(e,t,i){const[n,r]=Ft(i==null?void 0:i.in,e,t),a=Ai(n,r),s=Math.abs(Md(n,r));n.setFullYear(1584),r.setFullYear(1584);const l=Ai(n,r)===-a,d=a*(s-+l);return d===0?0:d}function Fd(e,t){const i=W(e,t==null?void 0:t.in),n=i.getMonth(),r=n-n%3;return i.setMonth(r,1),i.setHours(0,0,0,0),i}function Bd(e,t){const i=W(e,t==null?void 0:t.in);return i.setDate(1),i.setHours(0,0,0,0),i}function Nd(e,t){const i=W(e,t==null?void 0:t.in),n=i.getFullYear();return i.setFullYear(n+1,0,0),i.setHours(23,59,59,999),i}function Ns(e,t){const i=W(e,t==null?void 0:t.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}function Rd(e,t){const i=W(e,t==null?void 0:t.in);return i.setMinutes(59,59,999),i}function jd(e,t){var l,d;const i=It(),n=i.weekStartsOn??((d=(l=i.locale)==null?void 0:l.options)==null?void 0:d.weekStartsOn)??0,r=W(e,t==null?void 0:t.in),a=r.getDay(),s=(a<n?-7:0)+6-(a-n);return r.setDate(r.getDate()+s),r.setHours(23,59,59,999),r}function Hd(e,t){const i=W(e,t==null?void 0:t.in);return i.setSeconds(59,999),i}function Vd(e,t){const i=W(e,t==null?void 0:t.in),n=i.getMonth(),r=n-n%3+3;return i.setMonth(r,0),i.setHours(23,59,59,999),i}function Wd(e,t){const i=W(e,t==null?void 0:t.in);return i.setMilliseconds(999),i}const qd={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},Kd=(e,t,i)=>{let n;const r=qd[e];return typeof r=="string"?n=r:t===1?n=r.one:n=r.other.replace("{{count}}",t.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+n:n+" ago":n};function pr(e){return(t={})=>{const i=t.width?String(t.width):e.defaultWidth;return e.formats[i]||e.formats[e.defaultWidth]}}const Yd={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},Ud={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},Gd={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},Zd={date:pr({formats:Yd,defaultWidth:"full"}),time:pr({formats:Ud,defaultWidth:"full"}),dateTime:pr({formats:Gd,defaultWidth:"full"})},Qd={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},Xd=(e,t,i,n)=>Qd[e];function Ci(e){return(t,i)=>{const n=i!=null&&i.context?String(i.context):"standalone";let r;if(n==="formatting"&&e.formattingValues){const s=e.defaultFormattingWidth||e.defaultWidth,l=i!=null&&i.width?String(i.width):s;r=e.formattingValues[l]||e.formattingValues[s]}else{const s=e.defaultWidth,l=i!=null&&i.width?String(i.width):e.defaultWidth;r=e.values[l]||e.values[s]}const a=e.argumentCallback?e.argumentCallback(t):t;return r[a]}}const Jd={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},eu={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},tu={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},iu={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},nu={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},ru={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},au=(e,t)=>{const i=Number(e),n=i%100;if(n>20||n<10)switch(n%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},su={ordinalNumber:au,era:Ci({values:Jd,defaultWidth:"wide"}),quarter:Ci({values:eu,defaultWidth:"wide",argumentCallback:e=>e-1}),month:Ci({values:tu,defaultWidth:"wide"}),day:Ci({values:iu,defaultWidth:"wide"}),dayPeriod:Ci({values:nu,defaultWidth:"wide",formattingValues:ru,defaultFormattingWidth:"wide"})};function Pi(e){return(t,i={})=>{const n=i.width,r=n&&e.matchPatterns[n]||e.matchPatterns[e.defaultMatchWidth],a=t.match(r);if(!a)return null;const s=a[0],l=n&&e.parsePatterns[n]||e.parsePatterns[e.defaultParseWidth],d=Array.isArray(l)?lu(l,h=>h.test(s)):ou(l,h=>h.test(s));let u;u=e.valueCallback?e.valueCallback(d):d,u=i.valueCallback?i.valueCallback(u):u;const p=t.slice(s.length);return{value:u,rest:p}}}function ou(e,t){for(const i in e)if(Object.prototype.hasOwnProperty.call(e,i)&&t(e[i]))return i}function lu(e,t){for(let i=0;i<e.length;i++)if(t(e[i]))return i}function cu(e){return(t,i={})=>{const n=t.match(e.matchPattern);if(!n)return null;const r=n[0],a=t.match(e.parsePattern);if(!a)return null;let s=e.valueCallback?e.valueCallback(a[0]):a[0];s=i.valueCallback?i.valueCallback(s):s;const l=t.slice(r.length);return{value:s,rest:l}}}const du=/^(\d+)(th|st|nd|rd)?/i,uu=/\d+/i,pu={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},hu={any:[/^b/i,/^(a|c)/i]},gu={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},fu={any:[/1/i,/2/i,/3/i,/4/i]},mu={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},bu={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},vu={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},yu={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},xu={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},wu={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},$u={ordinalNumber:cu({matchPattern:du,parsePattern:uu,valueCallback:e=>parseInt(e,10)}),era:Pi({matchPatterns:pu,defaultMatchWidth:"wide",parsePatterns:hu,defaultParseWidth:"any"}),quarter:Pi({matchPatterns:gu,defaultMatchWidth:"wide",parsePatterns:fu,defaultParseWidth:"any",valueCallback:e=>e+1}),month:Pi({matchPatterns:mu,defaultMatchWidth:"wide",parsePatterns:bu,defaultParseWidth:"any"}),day:Pi({matchPatterns:vu,defaultMatchWidth:"wide",parsePatterns:yu,defaultParseWidth:"any"}),dayPeriod:Pi({matchPatterns:xu,defaultMatchWidth:"any",parsePatterns:wu,defaultParseWidth:"any"})},Rs={code:"en-US",formatDistance:Kd,formatLong:Zd,formatRelative:Xd,localize:su,match:$u,options:{weekStartsOn:0,firstWeekContainsDate:1}};function _u(e,t){const i=W(e,t==null?void 0:t.in);return zs(i,Ns(i))+1}function js(e,t){const i=W(e,t==null?void 0:t.in),n=+ti(i)-+wd(i);return Math.round(n/Es)+1}function Yr(e,t){var p,h,g,m;const i=W(e,t==null?void 0:t.in),n=i.getFullYear(),r=It(),a=(t==null?void 0:t.firstWeekContainsDate)??((h=(p=t==null?void 0:t.locale)==null?void 0:p.options)==null?void 0:h.firstWeekContainsDate)??r.firstWeekContainsDate??((m=(g=r.locale)==null?void 0:g.options)==null?void 0:m.firstWeekContainsDate)??1,s=ue((t==null?void 0:t.in)||e,0);s.setFullYear(n+1,0,a),s.setHours(0,0,0,0);const l=Ve(s,t),d=ue((t==null?void 0:t.in)||e,0);d.setFullYear(n,0,a),d.setHours(0,0,0,0);const u=Ve(d,t);return+i>=+l?n+1:+i>=+u?n:n-1}function ku(e,t){var l,d,u,p;const i=It(),n=(t==null?void 0:t.firstWeekContainsDate)??((d=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:d.firstWeekContainsDate)??i.firstWeekContainsDate??((p=(u=i.locale)==null?void 0:u.options)==null?void 0:p.firstWeekContainsDate)??1,r=Yr(e,t),a=ue((t==null?void 0:t.in)||e,0);return a.setFullYear(r,0,n),a.setHours(0,0,0,0),Ve(a,t)}function Hs(e,t){const i=W(e,t==null?void 0:t.in),n=+Ve(i,t)-+ku(i,t);return Math.round(n/Es)+1}function J(e,t){const i=e<0?"-":"",n=Math.abs(e).toString().padStart(t,"0");return i+n}const rt={y(e,t){const i=e.getFullYear(),n=i>0?i:1-i;return J(t==="yy"?n%100:n,t.length)},M(e,t){const i=e.getMonth();return t==="M"?String(i+1):J(i+1,2)},d(e,t){return J(e.getDate(),t.length)},a(e,t){const i=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(e,t){return J(e.getHours()%12||12,t.length)},H(e,t){return J(e.getHours(),t.length)},m(e,t){return J(e.getMinutes(),t.length)},s(e,t){return J(e.getSeconds(),t.length)},S(e,t){const i=t.length,n=e.getMilliseconds(),r=Math.trunc(n*Math.pow(10,i-3));return J(r,t.length)}},Rt={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},La={G:function(e,t,i){const n=e.getFullYear()>0?1:0;switch(t){case"G":case"GG":case"GGG":return i.era(n,{width:"abbreviated"});case"GGGGG":return i.era(n,{width:"narrow"});case"GGGG":default:return i.era(n,{width:"wide"})}},y:function(e,t,i){if(t==="yo"){const n=e.getFullYear(),r=n>0?n:1-n;return i.ordinalNumber(r,{unit:"year"})}return rt.y(e,t)},Y:function(e,t,i,n){const r=Yr(e,n),a=r>0?r:1-r;if(t==="YY"){const s=a%100;return J(s,2)}return t==="Yo"?i.ordinalNumber(a,{unit:"year"}):J(a,t.length)},R:function(e,t){const i=Os(e);return J(i,t.length)},u:function(e,t){const i=e.getFullYear();return J(i,t.length)},Q:function(e,t,i){const n=Math.ceil((e.getMonth()+1)/3);switch(t){case"Q":return String(n);case"QQ":return J(n,2);case"Qo":return i.ordinalNumber(n,{unit:"quarter"});case"QQQ":return i.quarter(n,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(n,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(n,{width:"wide",context:"formatting"})}},q:function(e,t,i){const n=Math.ceil((e.getMonth()+1)/3);switch(t){case"q":return String(n);case"qq":return J(n,2);case"qo":return i.ordinalNumber(n,{unit:"quarter"});case"qqq":return i.quarter(n,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(n,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(n,{width:"wide",context:"standalone"})}},M:function(e,t,i){const n=e.getMonth();switch(t){case"M":case"MM":return rt.M(e,t);case"Mo":return i.ordinalNumber(n+1,{unit:"month"});case"MMM":return i.month(n,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(n,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(n,{width:"wide",context:"formatting"})}},L:function(e,t,i){const n=e.getMonth();switch(t){case"L":return String(n+1);case"LL":return J(n+1,2);case"Lo":return i.ordinalNumber(n+1,{unit:"month"});case"LLL":return i.month(n,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(n,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(n,{width:"wide",context:"standalone"})}},w:function(e,t,i,n){const r=Hs(e,n);return t==="wo"?i.ordinalNumber(r,{unit:"week"}):J(r,t.length)},I:function(e,t,i){const n=js(e);return t==="Io"?i.ordinalNumber(n,{unit:"week"}):J(n,t.length)},d:function(e,t,i){return t==="do"?i.ordinalNumber(e.getDate(),{unit:"date"}):rt.d(e,t)},D:function(e,t,i){const n=_u(e);return t==="Do"?i.ordinalNumber(n,{unit:"dayOfYear"}):J(n,t.length)},E:function(e,t,i){const n=e.getDay();switch(t){case"E":case"EE":case"EEE":return i.day(n,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(n,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(n,{width:"short",context:"formatting"});case"EEEE":default:return i.day(n,{width:"wide",context:"formatting"})}},e:function(e,t,i,n){const r=e.getDay(),a=(r-n.weekStartsOn+8)%7||7;switch(t){case"e":return String(a);case"ee":return J(a,2);case"eo":return i.ordinalNumber(a,{unit:"day"});case"eee":return i.day(r,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(r,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(r,{width:"short",context:"formatting"});case"eeee":default:return i.day(r,{width:"wide",context:"formatting"})}},c:function(e,t,i,n){const r=e.getDay(),a=(r-n.weekStartsOn+8)%7||7;switch(t){case"c":return String(a);case"cc":return J(a,t.length);case"co":return i.ordinalNumber(a,{unit:"day"});case"ccc":return i.day(r,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(r,{width:"narrow",context:"standalone"});case"cccccc":return i.day(r,{width:"short",context:"standalone"});case"cccc":default:return i.day(r,{width:"wide",context:"standalone"})}},i:function(e,t,i){const n=e.getDay(),r=n===0?7:n;switch(t){case"i":return String(r);case"ii":return J(r,t.length);case"io":return i.ordinalNumber(r,{unit:"day"});case"iii":return i.day(n,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(n,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(n,{width:"short",context:"formatting"});case"iiii":default:return i.day(n,{width:"wide",context:"formatting"})}},a:function(e,t,i){const r=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},b:function(e,t,i){const n=e.getHours();let r;switch(n===12?r=Rt.noon:n===0?r=Rt.midnight:r=n/12>=1?"pm":"am",t){case"b":case"bb":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},B:function(e,t,i){const n=e.getHours();let r;switch(n>=17?r=Rt.evening:n>=12?r=Rt.afternoon:n>=4?r=Rt.morning:r=Rt.night,t){case"B":case"BB":case"BBB":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},h:function(e,t,i){if(t==="ho"){let n=e.getHours()%12;return n===0&&(n=12),i.ordinalNumber(n,{unit:"hour"})}return rt.h(e,t)},H:function(e,t,i){return t==="Ho"?i.ordinalNumber(e.getHours(),{unit:"hour"}):rt.H(e,t)},K:function(e,t,i){const n=e.getHours()%12;return t==="Ko"?i.ordinalNumber(n,{unit:"hour"}):J(n,t.length)},k:function(e,t,i){let n=e.getHours();return n===0&&(n=24),t==="ko"?i.ordinalNumber(n,{unit:"hour"}):J(n,t.length)},m:function(e,t,i){return t==="mo"?i.ordinalNumber(e.getMinutes(),{unit:"minute"}):rt.m(e,t)},s:function(e,t,i){return t==="so"?i.ordinalNumber(e.getSeconds(),{unit:"second"}):rt.s(e,t)},S:function(e,t){return rt.S(e,t)},X:function(e,t,i){const n=e.getTimezoneOffset();if(n===0)return"Z";switch(t){case"X":return Fa(n);case"XXXX":case"XX":return kt(n);case"XXXXX":case"XXX":default:return kt(n,":")}},x:function(e,t,i){const n=e.getTimezoneOffset();switch(t){case"x":return Fa(n);case"xxxx":case"xx":return kt(n);case"xxxxx":case"xxx":default:return kt(n,":")}},O:function(e,t,i){const n=e.getTimezoneOffset();switch(t){case"O":case"OO":case"OOO":return"GMT"+Ia(n,":");case"OOOO":default:return"GMT"+kt(n,":")}},z:function(e,t,i){const n=e.getTimezoneOffset();switch(t){case"z":case"zz":case"zzz":return"GMT"+Ia(n,":");case"zzzz":default:return"GMT"+kt(n,":")}},t:function(e,t,i){const n=Math.trunc(+e/1e3);return J(n,t.length)},T:function(e,t,i){return J(+e,t.length)}};function Ia(e,t=""){const i=e>0?"-":"+",n=Math.abs(e),r=Math.trunc(n/60),a=n%60;return a===0?i+String(r):i+String(r)+t+J(a,2)}function Fa(e,t){return e%60===0?(e>0?"-":"+")+J(Math.abs(e)/60,2):kt(e,t)}function kt(e,t=""){const i=e>0?"-":"+",n=Math.abs(e),r=J(Math.trunc(n/60),2),a=J(n%60,2);return i+r+t+a}const Ba=(e,t)=>{switch(e){case"P":return t.date({width:"short"});case"PP":return t.date({width:"medium"});case"PPP":return t.date({width:"long"});case"PPPP":default:return t.date({width:"full"})}},Vs=(e,t)=>{switch(e){case"p":return t.time({width:"short"});case"pp":return t.time({width:"medium"});case"ppp":return t.time({width:"long"});case"pppp":default:return t.time({width:"full"})}},Su=(e,t)=>{const i=e.match(/(P+)(p+)?/)||[],n=i[1],r=i[2];if(!r)return Ba(e,t);let a;switch(n){case"P":a=t.dateTime({width:"short"});break;case"PP":a=t.dateTime({width:"medium"});break;case"PPP":a=t.dateTime({width:"long"});break;case"PPPP":default:a=t.dateTime({width:"full"});break}return a.replace("{{date}}",Ba(n,t)).replace("{{time}}",Vs(r,t))},Or={p:Vs,P:Su},Cu=/^D+$/,Pu=/^Y+$/,Tu=["D","DD","YY","YYYY"];function Ws(e){return Cu.test(e)}function qs(e){return Pu.test(e)}function zr(e,t,i){const n=Mu(e,t,i);if(console.warn(n),Tu.includes(e))throw new RangeError(n)}function Mu(e,t,i){const n=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${t}\`) for formatting ${n} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const Du=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Eu=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Ou=/^'([^]*?)'?$/,zu=/''/g,Au=/[a-zA-Z]/;function Lu(e,t,i){var p,h,g,m,b,v,w,x;const n=It(),r=(i==null?void 0:i.locale)??n.locale??Rs,a=(i==null?void 0:i.firstWeekContainsDate)??((h=(p=i==null?void 0:i.locale)==null?void 0:p.options)==null?void 0:h.firstWeekContainsDate)??n.firstWeekContainsDate??((m=(g=n.locale)==null?void 0:g.options)==null?void 0:m.firstWeekContainsDate)??1,s=(i==null?void 0:i.weekStartsOn)??((v=(b=i==null?void 0:i.locale)==null?void 0:b.options)==null?void 0:v.weekStartsOn)??n.weekStartsOn??((x=(w=n.locale)==null?void 0:w.options)==null?void 0:x.weekStartsOn)??0,l=W(e,i==null?void 0:i.in);if(!As(l))throw new RangeError("Invalid time value");let d=t.match(Eu).map(y=>{const S=y[0];if(S==="p"||S==="P"){const H=Or[S];return H(y,r.formatLong)}return y}).join("").match(Du).map(y=>{if(y==="''")return{isToken:!1,value:"'"};const S=y[0];if(S==="'")return{isToken:!1,value:Iu(y)};if(La[S])return{isToken:!0,value:y};if(S.match(Au))throw new RangeError("Format string contains an unescaped latin alphabet character `"+S+"`");return{isToken:!1,value:y}});r.localize.preprocessor&&(d=r.localize.preprocessor(l,d));const u={firstWeekContainsDate:a,weekStartsOn:s,locale:r};return d.map(y=>{if(!y.isToken)return y.value;const S=y.value;(!(i!=null&&i.useAdditionalWeekYearTokens)&&qs(S)||!(i!=null&&i.useAdditionalDayOfYearTokens)&&Ws(S))&&zr(S,t,String(e));const H=La[S[0]];return H(l,S,r.localize,u)}).join("")}function Iu(e){const t=e.match(Ou);return t?t[1].replace(zu,"'"):e}function Fu(){return Object.assign({},It())}function Bu(e,t){const i=W(e,t==null?void 0:t.in).getDay();return i===0?7:i}function Nu(e,t){const i=Ru(t)?new t(0):ue(t,0);return i.setFullYear(e.getFullYear(),e.getMonth(),e.getDate()),i.setHours(e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()),i}function Ru(e){var t;return typeof e=="function"&&((t=e.prototype)==null?void 0:t.constructor)===e}const ju=10;class Ks{constructor(){M(this,"subPriority",0)}validate(t,i){return!0}}class Hu extends Ks{constructor(t,i,n,r,a){super(),this.value=t,this.validateValue=i,this.setValue=n,this.priority=r,a&&(this.subPriority=a)}validate(t,i){return this.validateValue(t,this.value,i)}set(t,i,n){return this.setValue(t,i,this.value,n)}}class Vu extends Ks{constructor(i,n){super();M(this,"priority",ju);M(this,"subPriority",-1);this.context=i||(r=>ue(n,r))}set(i,n){return n.timestampIsSet?i:ue(i,Nu(i,this.context))}}class Q{run(t,i,n,r){const a=this.parse(t,i,n,r);return a?{setter:new Hu(a.value,this.validate,this.set,this.priority,this.subPriority),rest:a.rest}:null}validate(t,i,n){return!0}}class Wu extends Q{constructor(){super(...arguments);M(this,"priority",140);M(this,"incompatibleTokens",["R","u","t","T"])}parse(i,n,r){switch(n){case"G":case"GG":case"GGG":return r.era(i,{width:"abbreviated"})||r.era(i,{width:"narrow"});case"GGGGG":return r.era(i,{width:"narrow"});case"GGGG":default:return r.era(i,{width:"wide"})||r.era(i,{width:"abbreviated"})||r.era(i,{width:"narrow"})}}set(i,n,r){return n.era=r,i.setFullYear(r,0,1),i.setHours(0,0,0,0),i}}const he={month:/^(1[0-2]|0?\d)/,date:/^(3[0-1]|[0-2]?\d)/,dayOfYear:/^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,week:/^(5[0-3]|[0-4]?\d)/,hour23h:/^(2[0-3]|[0-1]?\d)/,hour24h:/^(2[0-4]|[0-1]?\d)/,hour11h:/^(1[0-1]|0?\d)/,hour12h:/^(1[0-2]|0?\d)/,minute:/^[0-5]?\d/,second:/^[0-5]?\d/,singleDigit:/^\d/,twoDigits:/^\d{1,2}/,threeDigits:/^\d{1,3}/,fourDigits:/^\d{1,4}/,anyDigitsSigned:/^-?\d+/,singleDigitSigned:/^-?\d/,twoDigitsSigned:/^-?\d{1,2}/,threeDigitsSigned:/^-?\d{1,3}/,fourDigitsSigned:/^-?\d{1,4}/},je={basicOptionalMinutes:/^([+-])(\d{2})(\d{2})?|Z/,basic:/^([+-])(\d{2})(\d{2})|Z/,basicOptionalSeconds:/^([+-])(\d{2})(\d{2})((\d{2}))?|Z/,extended:/^([+-])(\d{2}):(\d{2})|Z/,extendedOptionalSeconds:/^([+-])(\d{2}):(\d{2})(:(\d{2}))?|Z/};function ge(e,t){return e&&{value:t(e.value),rest:e.rest}}function le(e,t){const i=t.match(e);return i?{value:parseInt(i[0],10),rest:t.slice(i[0].length)}:null}function He(e,t){const i=t.match(e);if(!i)return null;if(i[0]==="Z")return{value:0,rest:t.slice(1)};const n=i[1]==="+"?1:-1,r=i[2]?parseInt(i[2],10):0,a=i[3]?parseInt(i[3],10):0,s=i[5]?parseInt(i[5],10):0;return{value:n*(r*sn+a*an+s*vd),rest:t.slice(i[0].length)}}function Ys(e){return le(he.anyDigitsSigned,e)}function pe(e,t){switch(e){case 1:return le(he.singleDigit,t);case 2:return le(he.twoDigits,t);case 3:return le(he.threeDigits,t);case 4:return le(he.fourDigits,t);default:return le(new RegExp("^\\d{1,"+e+"}"),t)}}function Pn(e,t){switch(e){case 1:return le(he.singleDigitSigned,t);case 2:return le(he.twoDigitsSigned,t);case 3:return le(he.threeDigitsSigned,t);case 4:return le(he.fourDigitsSigned,t);default:return le(new RegExp("^-?\\d{1,"+e+"}"),t)}}function Ur(e){switch(e){case"morning":return 4;case"evening":return 17;case"pm":case"noon":case"afternoon":return 12;case"am":case"midnight":case"night":default:return 0}}function Us(e,t){const i=t>0,n=i?t:1-t;let r;if(n<=50)r=e||100;else{const a=n+50,s=Math.trunc(a/100)*100,l=e>=a%100;r=e+s-(l?100:0)}return i?r:1-r}function Gs(e){return e%400===0||e%4===0&&e%100!==0}class qu extends Q{constructor(){super(...arguments);M(this,"priority",130);M(this,"incompatibleTokens",["Y","R","u","w","I","i","e","c","t","T"])}parse(i,n,r){const a=s=>({year:s,isTwoDigitYear:n==="yy"});switch(n){case"y":return ge(pe(4,i),a);case"yo":return ge(r.ordinalNumber(i,{unit:"year"}),a);default:return ge(pe(n.length,i),a)}}validate(i,n){return n.isTwoDigitYear||n.year>0}set(i,n,r){const a=i.getFullYear();if(r.isTwoDigitYear){const l=Us(r.year,a);return i.setFullYear(l,0,1),i.setHours(0,0,0,0),i}const s=!("era"in n)||n.era===1?r.year:1-r.year;return i.setFullYear(s,0,1),i.setHours(0,0,0,0),i}}class Ku extends Q{constructor(){super(...arguments);M(this,"priority",130);M(this,"incompatibleTokens",["y","R","u","Q","q","M","L","I","d","D","i","t","T"])}parse(i,n,r){const a=s=>({year:s,isTwoDigitYear:n==="YY"});switch(n){case"Y":return ge(pe(4,i),a);case"Yo":return ge(r.ordinalNumber(i,{unit:"year"}),a);default:return ge(pe(n.length,i),a)}}validate(i,n){return n.isTwoDigitYear||n.year>0}set(i,n,r,a){const s=Yr(i,a);if(r.isTwoDigitYear){const d=Us(r.year,s);return i.setFullYear(d,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),Ve(i,a)}const l=!("era"in n)||n.era===1?r.year:1-r.year;return i.setFullYear(l,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),Ve(i,a)}}class Yu extends Q{constructor(){super(...arguments);M(this,"priority",130);M(this,"incompatibleTokens",["G","y","Y","u","Q","q","M","L","w","d","D","e","c","t","T"])}parse(i,n){return Pn(n==="R"?4:n.length,i)}set(i,n,r){const a=ue(i,0);return a.setFullYear(r,0,4),a.setHours(0,0,0,0),ti(a)}}class Uu extends Q{constructor(){super(...arguments);M(this,"priority",130);M(this,"incompatibleTokens",["G","y","Y","R","w","I","i","e","c","t","T"])}parse(i,n){return Pn(n==="u"?4:n.length,i)}set(i,n,r){return i.setFullYear(r,0,1),i.setHours(0,0,0,0),i}}class Gu extends Q{constructor(){super(...arguments);M(this,"priority",120);M(this,"incompatibleTokens",["Y","R","q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"Q":case"QQ":return pe(n.length,i);case"Qo":return r.ordinalNumber(i,{unit:"quarter"});case"QQQ":return r.quarter(i,{width:"abbreviated",context:"formatting"})||r.quarter(i,{width:"narrow",context:"formatting"});case"QQQQQ":return r.quarter(i,{width:"narrow",context:"formatting"});case"QQQQ":default:return r.quarter(i,{width:"wide",context:"formatting"})||r.quarter(i,{width:"abbreviated",context:"formatting"})||r.quarter(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=1&&n<=4}set(i,n,r){return i.setMonth((r-1)*3,1),i.setHours(0,0,0,0),i}}class Zu extends Q{constructor(){super(...arguments);M(this,"priority",120);M(this,"incompatibleTokens",["Y","R","Q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"q":case"qq":return pe(n.length,i);case"qo":return r.ordinalNumber(i,{unit:"quarter"});case"qqq":return r.quarter(i,{width:"abbreviated",context:"standalone"})||r.quarter(i,{width:"narrow",context:"standalone"});case"qqqqq":return r.quarter(i,{width:"narrow",context:"standalone"});case"qqqq":default:return r.quarter(i,{width:"wide",context:"standalone"})||r.quarter(i,{width:"abbreviated",context:"standalone"})||r.quarter(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=1&&n<=4}set(i,n,r){return i.setMonth((r-1)*3,1),i.setHours(0,0,0,0),i}}class Qu extends Q{constructor(){super(...arguments);M(this,"incompatibleTokens",["Y","R","q","Q","L","w","I","D","i","e","c","t","T"]);M(this,"priority",110)}parse(i,n,r){const a=s=>s-1;switch(n){case"M":return ge(le(he.month,i),a);case"MM":return ge(pe(2,i),a);case"Mo":return ge(r.ordinalNumber(i,{unit:"month"}),a);case"MMM":return r.month(i,{width:"abbreviated",context:"formatting"})||r.month(i,{width:"narrow",context:"formatting"});case"MMMMM":return r.month(i,{width:"narrow",context:"formatting"});case"MMMM":default:return r.month(i,{width:"wide",context:"formatting"})||r.month(i,{width:"abbreviated",context:"formatting"})||r.month(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.setMonth(r,1),i.setHours(0,0,0,0),i}}class Xu extends Q{constructor(){super(...arguments);M(this,"priority",110);M(this,"incompatibleTokens",["Y","R","q","Q","M","w","I","D","i","e","c","t","T"])}parse(i,n,r){const a=s=>s-1;switch(n){case"L":return ge(le(he.month,i),a);case"LL":return ge(pe(2,i),a);case"Lo":return ge(r.ordinalNumber(i,{unit:"month"}),a);case"LLL":return r.month(i,{width:"abbreviated",context:"standalone"})||r.month(i,{width:"narrow",context:"standalone"});case"LLLLL":return r.month(i,{width:"narrow",context:"standalone"});case"LLLL":default:return r.month(i,{width:"wide",context:"standalone"})||r.month(i,{width:"abbreviated",context:"standalone"})||r.month(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.setMonth(r,1),i.setHours(0,0,0,0),i}}function Ju(e,t,i){const n=W(e,i==null?void 0:i.in),r=Hs(n,i)-t;return n.setDate(n.getDate()-r*7),W(n,i==null?void 0:i.in)}class ep extends Q{constructor(){super(...arguments);M(this,"priority",100);M(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","i","t","T"])}parse(i,n,r){switch(n){case"w":return le(he.week,i);case"wo":return r.ordinalNumber(i,{unit:"week"});default:return pe(n.length,i)}}validate(i,n){return n>=1&&n<=53}set(i,n,r,a){return Ve(Ju(i,r,a),a)}}function tp(e,t,i){const n=W(e,i==null?void 0:i.in),r=js(n,i)-t;return n.setDate(n.getDate()-r*7),n}class ip extends Q{constructor(){super(...arguments);M(this,"priority",100);M(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","e","c","t","T"])}parse(i,n,r){switch(n){case"I":return le(he.week,i);case"Io":return r.ordinalNumber(i,{unit:"week"});default:return pe(n.length,i)}}validate(i,n){return n>=1&&n<=53}set(i,n,r){return ti(tp(i,r))}}const np=[31,28,31,30,31,30,31,31,30,31,30,31],rp=[31,29,31,30,31,30,31,31,30,31,30,31];class ap extends Q{constructor(){super(...arguments);M(this,"priority",90);M(this,"subPriority",1);M(this,"incompatibleTokens",["Y","R","q","Q","w","I","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"d":return le(he.date,i);case"do":return r.ordinalNumber(i,{unit:"date"});default:return pe(n.length,i)}}validate(i,n){const r=i.getFullYear(),a=Gs(r),s=i.getMonth();return a?n>=1&&n<=rp[s]:n>=1&&n<=np[s]}set(i,n,r){return i.setDate(r),i.setHours(0,0,0,0),i}}class sp extends Q{constructor(){super(...arguments);M(this,"priority",90);M(this,"subpriority",1);M(this,"incompatibleTokens",["Y","R","q","Q","M","L","w","I","d","E","i","e","c","t","T"])}parse(i,n,r){switch(n){case"D":case"DD":return le(he.dayOfYear,i);case"Do":return r.ordinalNumber(i,{unit:"date"});default:return pe(n.length,i)}}validate(i,n){const r=i.getFullYear();return Gs(r)?n>=1&&n<=366:n>=1&&n<=365}set(i,n,r){return i.setMonth(0,r),i.setHours(0,0,0,0),i}}function Gr(e,t,i){var h,g,m,b;const n=It(),r=(i==null?void 0:i.weekStartsOn)??((g=(h=i==null?void 0:i.locale)==null?void 0:h.options)==null?void 0:g.weekStartsOn)??n.weekStartsOn??((b=(m=n.locale)==null?void 0:m.options)==null?void 0:b.weekStartsOn)??0,a=W(e,i==null?void 0:i.in),s=a.getDay(),d=(t%7+7)%7,u=7-r,p=t<0||t>6?t-(s+u)%7:(d+u)%7-(s+u)%7;return Yn(a,p,i)}class op extends Q{constructor(){super(...arguments);M(this,"priority",90);M(this,"incompatibleTokens",["D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"E":case"EE":case"EEE":return r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"EEEEE":return r.day(i,{width:"narrow",context:"formatting"});case"EEEEEE":return r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"EEEE":default:return r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=Gr(i,r,a),i.setHours(0,0,0,0),i}}class lp extends Q{constructor(){super(...arguments);M(this,"priority",90);M(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","c","t","T"])}parse(i,n,r,a){const s=l=>{const d=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+d};switch(n){case"e":case"ee":return ge(pe(n.length,i),s);case"eo":return ge(r.ordinalNumber(i,{unit:"day"}),s);case"eee":return r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"eeeee":return r.day(i,{width:"narrow",context:"formatting"});case"eeeeee":return r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"eeee":default:return r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=Gr(i,r,a),i.setHours(0,0,0,0),i}}class cp extends Q{constructor(){super(...arguments);M(this,"priority",90);M(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","e","t","T"])}parse(i,n,r,a){const s=l=>{const d=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+d};switch(n){case"c":case"cc":return ge(pe(n.length,i),s);case"co":return ge(r.ordinalNumber(i,{unit:"day"}),s);case"ccc":return r.day(i,{width:"abbreviated",context:"standalone"})||r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"});case"ccccc":return r.day(i,{width:"narrow",context:"standalone"});case"cccccc":return r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"});case"cccc":default:return r.day(i,{width:"wide",context:"standalone"})||r.day(i,{width:"abbreviated",context:"standalone"})||r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=Gr(i,r,a),i.setHours(0,0,0,0),i}}function dp(e,t,i){const n=W(e,i==null?void 0:i.in),r=Bu(n,i),a=t-r;return Yn(n,a,i)}class up extends Q{constructor(){super(...arguments);M(this,"priority",90);M(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","E","e","c","t","T"])}parse(i,n,r){const a=s=>s===0?7:s;switch(n){case"i":case"ii":return pe(n.length,i);case"io":return r.ordinalNumber(i,{unit:"day"});case"iii":return ge(r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a);case"iiiii":return ge(r.day(i,{width:"narrow",context:"formatting"}),a);case"iiiiii":return ge(r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a);case"iiii":default:return ge(r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a)}}validate(i,n){return n>=1&&n<=7}set(i,n,r){return i=dp(i,r),i.setHours(0,0,0,0),i}}class pp extends Q{constructor(){super(...arguments);M(this,"priority",80);M(this,"incompatibleTokens",["b","B","H","k","t","T"])}parse(i,n,r){switch(n){case"a":case"aa":case"aaa":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaaa":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaa":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(Ur(r),0,0,0),i}}class hp extends Q{constructor(){super(...arguments);M(this,"priority",80);M(this,"incompatibleTokens",["a","B","H","k","t","T"])}parse(i,n,r){switch(n){case"b":case"bb":case"bbb":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbbb":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbb":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(Ur(r),0,0,0),i}}class gp extends Q{constructor(){super(...arguments);M(this,"priority",80);M(this,"incompatibleTokens",["a","b","t","T"])}parse(i,n,r){switch(n){case"B":case"BB":case"BBB":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBBB":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBB":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(Ur(r),0,0,0),i}}class fp extends Q{constructor(){super(...arguments);M(this,"priority",70);M(this,"incompatibleTokens",["H","K","k","t","T"])}parse(i,n,r){switch(n){case"h":return le(he.hour12h,i);case"ho":return r.ordinalNumber(i,{unit:"hour"});default:return pe(n.length,i)}}validate(i,n){return n>=1&&n<=12}set(i,n,r){const a=i.getHours()>=12;return a&&r<12?i.setHours(r+12,0,0,0):!a&&r===12?i.setHours(0,0,0,0):i.setHours(r,0,0,0),i}}class mp extends Q{constructor(){super(...arguments);M(this,"priority",70);M(this,"incompatibleTokens",["a","b","h","K","k","t","T"])}parse(i,n,r){switch(n){case"H":return le(he.hour23h,i);case"Ho":return r.ordinalNumber(i,{unit:"hour"});default:return pe(n.length,i)}}validate(i,n){return n>=0&&n<=23}set(i,n,r){return i.setHours(r,0,0,0),i}}class bp extends Q{constructor(){super(...arguments);M(this,"priority",70);M(this,"incompatibleTokens",["h","H","k","t","T"])}parse(i,n,r){switch(n){case"K":return le(he.hour11h,i);case"Ko":return r.ordinalNumber(i,{unit:"hour"});default:return pe(n.length,i)}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.getHours()>=12&&r<12?i.setHours(r+12,0,0,0):i.setHours(r,0,0,0),i}}class vp extends Q{constructor(){super(...arguments);M(this,"priority",70);M(this,"incompatibleTokens",["a","b","h","H","K","t","T"])}parse(i,n,r){switch(n){case"k":return le(he.hour24h,i);case"ko":return r.ordinalNumber(i,{unit:"hour"});default:return pe(n.length,i)}}validate(i,n){return n>=1&&n<=24}set(i,n,r){const a=r<=24?r%24:r;return i.setHours(a,0,0,0),i}}class yp extends Q{constructor(){super(...arguments);M(this,"priority",60);M(this,"incompatibleTokens",["t","T"])}parse(i,n,r){switch(n){case"m":return le(he.minute,i);case"mo":return r.ordinalNumber(i,{unit:"minute"});default:return pe(n.length,i)}}validate(i,n){return n>=0&&n<=59}set(i,n,r){return i.setMinutes(r,0,0),i}}class xp extends Q{constructor(){super(...arguments);M(this,"priority",50);M(this,"incompatibleTokens",["t","T"])}parse(i,n,r){switch(n){case"s":return le(he.second,i);case"so":return r.ordinalNumber(i,{unit:"second"});default:return pe(n.length,i)}}validate(i,n){return n>=0&&n<=59}set(i,n,r){return i.setSeconds(r,0),i}}class wp extends Q{constructor(){super(...arguments);M(this,"priority",30);M(this,"incompatibleTokens",["t","T"])}parse(i,n){const r=a=>Math.trunc(a*Math.pow(10,-n.length+3));return ge(pe(n.length,i),r)}set(i,n,r){return i.setMilliseconds(r),i}}class $p extends Q{constructor(){super(...arguments);M(this,"priority",10);M(this,"incompatibleTokens",["t","T","x"])}parse(i,n){switch(n){case"X":return He(je.basicOptionalMinutes,i);case"XX":return He(je.basic,i);case"XXXX":return He(je.basicOptionalSeconds,i);case"XXXXX":return He(je.extendedOptionalSeconds,i);case"XXX":default:return He(je.extended,i)}}set(i,n,r){return n.timestampIsSet?i:ue(i,i.getTime()-Cn(i)-r)}}class _p extends Q{constructor(){super(...arguments);M(this,"priority",10);M(this,"incompatibleTokens",["t","T","X"])}parse(i,n){switch(n){case"x":return He(je.basicOptionalMinutes,i);case"xx":return He(je.basic,i);case"xxxx":return He(je.basicOptionalSeconds,i);case"xxxxx":return He(je.extendedOptionalSeconds,i);case"xxx":default:return He(je.extended,i)}}set(i,n,r){return n.timestampIsSet?i:ue(i,i.getTime()-Cn(i)-r)}}class kp extends Q{constructor(){super(...arguments);M(this,"priority",40);M(this,"incompatibleTokens","*")}parse(i){return Ys(i)}set(i,n,r){return[ue(i,r*1e3),{timestampIsSet:!0}]}}class Sp extends Q{constructor(){super(...arguments);M(this,"priority",20);M(this,"incompatibleTokens","*")}parse(i){return Ys(i)}set(i,n,r){return[ue(i,r),{timestampIsSet:!0}]}}const Cp={G:new Wu,y:new qu,Y:new Ku,R:new Yu,u:new Uu,Q:new Gu,q:new Zu,M:new Qu,L:new Xu,w:new ep,I:new ip,d:new ap,D:new sp,E:new op,e:new lp,c:new cp,i:new up,a:new pp,b:new hp,B:new gp,h:new fp,H:new mp,K:new bp,k:new vp,m:new yp,s:new xp,S:new wp,X:new $p,x:new _p,t:new kp,T:new Sp},Pp=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Tp=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Mp=/^'([^]*?)'?$/,Dp=/''/g,Ep=/\S/,Op=/[a-zA-Z]/;function zp(e,t,i,n){var w,x,y,S,H,N,K,$;const r=()=>ue((n==null?void 0:n.in)||i,NaN),a=Fu(),s=(n==null?void 0:n.locale)??a.locale??Rs,l=(n==null?void 0:n.firstWeekContainsDate)??((x=(w=n==null?void 0:n.locale)==null?void 0:w.options)==null?void 0:x.firstWeekContainsDate)??a.firstWeekContainsDate??((S=(y=a.locale)==null?void 0:y.options)==null?void 0:S.firstWeekContainsDate)??1,d=(n==null?void 0:n.weekStartsOn)??((N=(H=n==null?void 0:n.locale)==null?void 0:H.options)==null?void 0:N.weekStartsOn)??a.weekStartsOn??(($=(K=a.locale)==null?void 0:K.options)==null?void 0:$.weekStartsOn)??0;if(!t)return e?r():W(i,n==null?void 0:n.in);const u={firstWeekContainsDate:l,weekStartsOn:d,locale:s},p=[new Vu(n==null?void 0:n.in,i)],h=t.match(Tp).map(A=>{const B=A[0];if(B in Or){const k=Or[B];return k(A,s.formatLong)}return A}).join("").match(Pp),g=[];for(let A of h){!(n!=null&&n.useAdditionalWeekYearTokens)&&qs(A)&&zr(A,t,e),!(n!=null&&n.useAdditionalDayOfYearTokens)&&Ws(A)&&zr(A,t,e);const B=A[0],k=Cp[B];if(k){const{incompatibleTokens:Z}=k;if(Array.isArray(Z)){const ne=g.find(Le=>Z.includes(Le.token)||Le.token===B);if(ne)throw new RangeError(`The format string mustn't contain \`${ne.fullToken}\` and \`${A}\` at the same time`)}else if(k.incompatibleTokens==="*"&&g.length>0)throw new RangeError(`The format string mustn't contain \`${A}\` and any other token at the same time`);g.push({token:B,fullToken:A});const R=k.run(e,A,s.match,u);if(!R)return r();p.push(R.setter),e=R.rest}else{if(B.match(Op))throw new RangeError("Format string contains an unescaped latin alphabet character `"+B+"`");if(A==="''"?A="'":B==="'"&&(A=Ap(A)),e.indexOf(A)===0)e=e.slice(A.length);else return r()}}if(e.length>0&&Ep.test(e))return r();const m=p.map(A=>A.priority).sort((A,B)=>B-A).filter((A,B,k)=>k.indexOf(A)===B).map(A=>p.filter(B=>B.priority===A).sort((B,k)=>k.subPriority-B.subPriority)).map(A=>A[0]);let b=W(i,n==null?void 0:n.in);if(isNaN(+b))return r();const v={};for(const A of m){if(!A.validate(b,u))return r();const B=A.set(b,v,u);Array.isArray(B)?(b=B[0],Object.assign(v,B[1])):b=B}return b}function Ap(e){return e.match(Mp)[1].replace(Dp,"'")}function Lp(e,t){const i=W(e,t==null?void 0:t.in);return i.setMinutes(0,0,0),i}function Ip(e,t){const i=W(e,t==null?void 0:t.in);return i.setSeconds(0,0),i}function Fp(e,t){const i=W(e,t==null?void 0:t.in);return i.setMilliseconds(0),i}function Bp(e,t){const i=()=>ue(t==null?void 0:t.in,NaN),n=(t==null?void 0:t.additionalDigits)??2,r=Hp(e);let a;if(r.date){const u=Vp(r.date,n);a=Wp(u.restDateString,u.year)}if(!a||isNaN(+a))return i();const s=+a;let l=0,d;if(r.time&&(l=qp(r.time),isNaN(l)))return i();if(r.timezone){if(d=Kp(r.timezone),isNaN(d))return i()}else{const u=new Date(s+l),p=W(0,t==null?void 0:t.in);return p.setFullYear(u.getUTCFullYear(),u.getUTCMonth(),u.getUTCDate()),p.setHours(u.getUTCHours(),u.getUTCMinutes(),u.getUTCSeconds(),u.getUTCMilliseconds()),p}return W(s+l+d,t==null?void 0:t.in)}const bn={dateTimeDelimiter:/[T ]/,timeZoneDelimiter:/[Z ]/i,timezone:/([Z+-].*)$/},Np=/^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/,Rp=/^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/,jp=/^([+-])(\d{2})(?::?(\d{2}))?$/;function Hp(e){const t={},i=e.split(bn.dateTimeDelimiter);let n;if(i.length>2)return t;if(/:/.test(i[0])?n=i[0]:(t.date=i[0],n=i[1],bn.timeZoneDelimiter.test(t.date)&&(t.date=e.split(bn.timeZoneDelimiter)[0],n=e.substr(t.date.length,e.length))),n){const r=bn.timezone.exec(n);r?(t.time=n.replace(r[1],""),t.timezone=r[1]):t.time=n}return t}function Vp(e,t){const i=new RegExp("^(?:(\\d{4}|[+-]\\d{"+(4+t)+"})|(\\d{2}|[+-]\\d{"+(2+t)+"})$)"),n=e.match(i);if(!n)return{year:NaN,restDateString:""};const r=n[1]?parseInt(n[1]):null,a=n[2]?parseInt(n[2]):null;return{year:a===null?r:a*100,restDateString:e.slice((n[1]||n[2]).length)}}function Wp(e,t){if(t===null)return new Date(NaN);const i=e.match(Np);if(!i)return new Date(NaN);const n=!!i[4],r=Ti(i[1]),a=Ti(i[2])-1,s=Ti(i[3]),l=Ti(i[4]),d=Ti(i[5])-1;if(n)return Qp(t,l,d)?Yp(t,l,d):new Date(NaN);{const u=new Date(0);return!Gp(t,a,s)||!Zp(t,r)?new Date(NaN):(u.setUTCFullYear(t,a,Math.max(r,s)),u)}}function Ti(e){return e?parseInt(e):1}function qp(e){const t=e.match(Rp);if(!t)return NaN;const i=hr(t[1]),n=hr(t[2]),r=hr(t[3]);return Xp(i,n,r)?i*sn+n*an+r*1e3:NaN}function hr(e){return e&&parseFloat(e.replace(",","."))||0}function Kp(e){if(e==="Z")return 0;const t=e.match(jp);if(!t)return 0;const i=t[1]==="+"?-1:1,n=parseInt(t[2]),r=t[3]&&parseInt(t[3])||0;return Jp(n,r)?i*(n*sn+r*an):NaN}function Yp(e,t,i){const n=new Date(0);n.setUTCFullYear(e,0,4);const r=n.getUTCDay()||7,a=(t-1)*7+i+1-r;return n.setUTCDate(n.getUTCDate()+a),n}const Up=[31,null,31,30,31,30,31,31,30,31,30,31];function Zs(e){return e%400===0||e%4===0&&e%100!==0}function Gp(e,t,i){return t>=0&&t<=11&&i>=1&&i<=(Up[t]||(Zs(e)?29:28))}function Zp(e,t){return t>=1&&t<=(Zs(e)?366:365)}function Qp(e,t,i){return t>=1&&t<=53&&i>=0&&i<=6}function Xp(e,t,i){return e===24?t===0&&i===0:i>=0&&i<60&&t>=0&&t<60&&e>=0&&e<25}function Jp(e,t){return t>=0&&t<=59}/*!
 * chartjs-adapter-date-fns v3.0.0
 * https://www.chartjs.org
 * (c) 2022 chartjs-adapter-date-fns Contributors
 * Released under the MIT license
 */const eh={datetime:"MMM d, yyyy, h:mm:ss aaaa",millisecond:"h:mm:ss.SSS aaaa",second:"h:mm:ss aaaa",minute:"h:mm aaaa",hour:"ha",day:"MMM d",week:"PP",month:"MMM yyyy",quarter:"qqq - yyyy",year:"yyyy"};Ho._date.override({_id:"date-fns",formats:function(){return eh},parse:function(e,t){if(e===null||typeof e>"u")return null;const i=typeof e;return i==="number"||e instanceof Date?e=W(e):i==="string"&&(typeof t=="string"?e=zp(e,t,new Date,this.options):e=Bp(e,this.options)),As(e)?e.getTime():null},format:function(e,t){return Lu(e,t,this.options)},add:function(e,t,i){switch(i){case"millisecond":return qr(e,t);case"second":return kd(e,t);case"minute":return $d(e,t);case"hour":return yd(e,t);case"day":return Yn(e,t);case"week":return Sd(e,t);case"month":return Wr(e,t);case"quarter":return _d(e,t);case"year":return Cd(e,t);default:return e}},diff:function(e,t,i){switch(i){case"millisecond":return Kr(e,t);case"second":return Ad(e,t);case"minute":return Ed(e,t);case"hour":return Dd(e,t);case"day":return Ls(e,t);case"week":return Ld(e,t);case"month":return Bs(e,t);case"quarter":return zd(e,t);case"year":return Id(e,t);default:return 0}},startOf:function(e,t,i){switch(t){case"second":return Fp(e);case"minute":return Ip(e);case"hour":return Lp(e);case"day":return Er(e);case"week":return Ve(e);case"isoWeek":return Ve(e,{weekStartsOn:+i});case"month":return Bd(e);case"quarter":return Fd(e);case"year":return Ns(e);default:return e}},endOf:function(e,t){switch(t){case"second":return Wd(e);case"minute":return Hd(e);case"hour":return Rd(e);case"day":return Is(e);case"week":return jd(e);case"month":return Fs(e);case"quarter":return Vd(e);case"year":return Nd(e);default:return e}}});function Na(e,t){if(!(t!=null&&t.start)||!(t!=null&&t.end))return null;const i=e.getPixelForValue(t.start.getTime()),n=e.getPixelForValue(t.end.getTime());if(!Number.isFinite(i)||!Number.isFinite(n))return null;const r=Math.min(i,n),a=Math.max(Math.abs(n-i),2);return!Number.isFinite(a)||a<=0?null:{left:r,width:a}}const th={id:"pricingModeIcons",beforeDatasetsDraw(e,t,i){var d;const n=i,r=n==null?void 0:n.segments;if(!(r!=null&&r.length))return;const a=e.chartArea,s=(d=e.scales)==null?void 0:d.x;if(!a||!s)return;const l=e.ctx;l.save(),l.globalAlpha=(n==null?void 0:n.backgroundOpacity)??.12;for(const u of r){const p=Na(s,u);p&&(l.fillStyle=u.color||"rgba(255, 255, 255, 0.1)",l.fillRect(p.left,a.top,p.width,a.bottom-a.top))}l.restore()},afterDatasetsDraw(e,t,i){var A;const n=i,r=n==null?void 0:n.segments;if(!(r!=null&&r.length))return;const a=(A=e.scales)==null?void 0:A.x,s=e.chartArea;if(!a||!s)return;const l=(n==null?void 0:n.iconSize)??16,d=(n==null?void 0:n.labelSize)??9,u=`${l}px "Inter", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,p=`${d}px "Inter", sans-serif`,h=(n==null?void 0:n.iconColor)||"rgba(255, 255, 255, 0.95)",g=(n==null?void 0:n.labelColor)||"rgba(255, 255, 255, 0.7)",m=(n==null?void 0:n.axisBandPadding)??10,b=(n==null?void 0:n.axisBandHeight)??l+d+10,v=(n==null?void 0:n.axisBandColor)||"rgba(6, 10, 18, 0.12)",w=(n==null?void 0:n.iconAlignment)||"start",x=(n==null?void 0:n.iconStartOffset)??12,y=(n==null?void 0:n.iconBaselineOffset)??4,S=(a.bottom||s.bottom)+m,H=Math.min(S,e.height-b-2),N=s.right-s.left,K=H+y,$=e.ctx;$.save(),$.globalCompositeOperation="destination-over",$.fillStyle=v,$.fillRect(s.left,H,N,b),$.restore(),$.save(),$.globalCompositeOperation="destination-over",$.textAlign="center",$.textBaseline="top";for(const B of r){const k=Na(a,B);if(!k)continue;let Z;if(w==="start"){Z=k.left+x;const R=k.left+k.width-l/2;Z>R&&(Z=k.left+k.width/2)}else Z=k.left+k.width/2;$.font=u,$.fillStyle=h,$.fillText(B.icon||"❓",Z,K),B.shortLabel&&($.font=p,$.fillStyle=g,$.fillText(B.shortLabel,Z,K+l-2))}$.restore()}};function Ra(e,t){if(!e)return;e.layout||(e.layout={}),e.layout.padding||(e.layout.padding={});const i=e.layout.padding,n=12;i.top=i.top??12,i.bottom=Math.max(i.bottom||0,n)}var ih=Object.defineProperty,nh=Object.getOwnPropertyDescriptor,di=(e,t,i,n)=>{for(var r=n>1?void 0:n?nh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&ih(t,i,r),r};const at=G;Hn.register(is,ns,Vo,Wo,rs,as,qo,ss,Ko,Yo,os,ls,Uo,Go,cs,th);function rh(e){const t=e.timeline.map(i=>i.spot_price_czk??0);return{label:"📊 Spot",data:t,borderColor:"#2196F3",backgroundColor:"rgba(33, 150, 243, 0.15)",borderWidth:3,fill:!1,tension:.4,type:"line",yAxisID:"y-price",pointRadius:t.map(()=>0),pointHoverRadius:7,pointBackgroundColor:t.map(()=>"#42a5f5"),pointBorderColor:t.map(()=>"#42a5f5"),pointBorderWidth:2,order:1,datalabels:{display:!1}}}function ah(e){return{label:"💰 Výkup",data:e.timeline.map(t=>t.export_price_czk??0),borderColor:"#4CAF50",backgroundColor:"rgba(76, 187, 106, 0.15)",borderWidth:2,fill:!1,type:"line",tension:.4,yAxisID:"y-price",pointRadius:0,pointHoverRadius:5,order:1,borderDash:[5,5]}}function sh(e){if(!e.solar)return[];const{string1:t,string2:i,hasString1:n,hasString2:r}=e.solar,a=(n?1:0)+(r?1:0),s={string1:{border:"rgba(255, 193, 7, 0.8)",bg:"rgba(255, 193, 7, 0.2)"},string2:{border:"rgba(255, 152, 0, 0.8)",bg:"rgba(255, 152, 0, 0.2)"}};if(a===1){const l=n?t:i,d=n?s.string1:s.string2;return[{label:"☀️ FVE předpověď",data:l,borderColor:d.border,backgroundColor:d.bg,borderWidth:2,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",pointRadius:0,pointHoverRadius:5,order:2}]}return a===2?[{label:"☀️ String 2",data:i,borderColor:s.string2.border,backgroundColor:s.string2.bg,borderWidth:1.5,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2},{label:"☀️ String 1",data:t,borderColor:s.string1.border,backgroundColor:s.string1.bg,borderWidth:1.5,fill:"-1",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2}]:[]}function oh(e){if(!e.battery)return[];const{baseline:t,solarCharge:i,gridCharge:n,gridNet:r,consumption:a}=e.battery,s=[],l={baseline:{border:"#78909C",bg:"rgba(120, 144, 156, 0.25)"},solar:{border:"transparent",bg:"rgba(255, 167, 38, 0.6)"},grid:{border:"transparent",bg:"rgba(33, 150, 243, 0.6)"}};return a.some(d=>d!=null&&d>0)&&s.push({label:"🏠 Spotřeba",data:a,borderColor:"rgba(255, 112, 67, 0.7)",backgroundColor:"rgba(255, 112, 67, 0.12)",borderWidth:1.5,type:"line",fill:!1,tension:.25,pointRadius:0,pointHoverRadius:5,yAxisID:"y-power",stack:"consumption",borderDash:[6,4],order:2}),n.some(d=>d!=null&&d>0)&&s.push({label:"⚡ Síť → baterie",data:n,backgroundColor:l.grid.bg,borderColor:l.grid.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),i.some(d=>d!=null&&d>0)&&s.push({label:"☀️ FVE → baterie",data:i,backgroundColor:l.solar.bg,borderColor:l.solar.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),s.push({label:"🔋 Kapacita",data:t,backgroundColor:l.baseline.bg,borderColor:l.baseline.border,borderWidth:3,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),r.some(d=>d!==null)&&s.push({label:"📡 Netto síť",data:r,borderColor:"#00BCD4",backgroundColor:"transparent",borderWidth:2,type:"line",fill:!1,tension:.2,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",order:2}),s}function ja(e){const t=[];return e.prices.length>0&&t.push(rh(e)),e.exportPrices.length>0&&t.push(ah(e)),t.push(...sh(e)),t.push(...oh(e)),t}function vn(e,t,i=""){if(e==null)return"";const n=i?` ${i}`:"";return`${e.toFixed(t)}${n}`}function Wt(e){var r;const t=(r=e.scales)==null?void 0:r.x;if(!t)return"overview";const n=(t.max-t.min)/(1e3*60*60);return n<=6?"detail":n<=24?"day":"overview"}function xt(e,t){var h,g,m,b,v,w,x,y,S,H,N;if(!((h=e==null?void 0:e.scales)!=null&&h.x))return;const i=e.scales.x,r=(i.max-i.min)/(1e3*60*60),a=Wt(e),s=(m=(g=e.options.plugins)==null?void 0:g.legend)==null?void 0:m.labels;s&&(s.padding=10,s.font&&(s.font.size=11),a==="detail"&&(s.padding=12,s.font&&(s.font.size=12)));const l=window.innerWidth<520,d=["y-price","y-solar","y-power"];for(const K of d){const $=(b=e.options.scales)==null?void 0:b[K];if($){if(K==="y-solar"&&l){$.display=!1;continue}a==="overview"?($.title&&($.title.display=!1),(v=$.ticks)!=null&&v.font&&($.ticks.font.size=10),K==="y-solar"&&($.display=!1)):a==="detail"?($.title&&($.title.display=!0,$.title.font&&($.title.font.size=12)),(w=$.ticks)!=null&&w.font&&($.ticks.font.size=11),$.display=!0):($.title&&($.title.display=!0,$.title.font&&($.title.font.size=11)),(x=$.ticks)!=null&&x.font&&($.ticks.font.size=10),$.display=!0)}}const u=(y=e.options.scales)==null?void 0:y.x;u&&(a==="overview"?u.ticks&&(u.ticks.maxTicksLimit=12,u.ticks.font&&(u.ticks.font.size=10)):a==="detail"?(u.ticks&&(u.ticks.maxTicksLimit=24,u.ticks.font&&(u.ticks.font.size=11)),u.time&&(u.time.displayFormats.hour="HH:mm")):(u.ticks&&(u.ticks.maxTicksLimit=16,u.ticks.font&&(u.ticks.font.size=10)),u.time&&(u.time.displayFormats.hour=l?"HH:mm":"dd.MM HH:mm")));const p=t==="always"||t==="auto"&&r<=6;for(const K of e.data.datasets){const $=K;if($.datalabels||($.datalabels={}),t==="never"){$.datalabels.display=!1;continue}if(p){let A=1;r>3&&r<=6?A=2:r>6&&(A=4),$.datalabels.display=R=>{const ne=R.dataset.data[R.dataIndex];return ne==null||ne===0?!1:R.dataIndex%A===0};const B=$.yAxisID==="y-price",k=((S=$.label)==null?void 0:S.includes("Solární"))||((H=$.label)==null?void 0:H.includes("String")),Z=(N=$.label)==null?void 0:N.includes("kapacita");$.datalabels.align="top",$.datalabels.offset=6,$.datalabels.color="#fff",$.datalabels.font={size:9,weight:"bold"},B?($.datalabels.formatter=R=>vn(R,2,"Kč"),$.datalabels.backgroundColor=$.borderColor||"rgba(33, 150, 243, 0.8)"):k?($.datalabels.formatter=R=>vn(R,1,"kW"),$.datalabels.backgroundColor=$.borderColor||"rgba(255, 193, 7, 0.8)"):Z?($.datalabels.formatter=R=>vn(R,1,"kWh"),$.datalabels.backgroundColor=$.borderColor||"rgba(120, 144, 156, 0.8)"):($.datalabels.formatter=R=>vn(R,1),$.datalabels.backgroundColor=$.borderColor||"rgba(33, 150, 243, 0.8)"),$.datalabels.borderRadius=4,$.datalabels.padding={top:3,bottom:3,left:5,right:5}}else $.datalabels.display=!1}e.update("none"),_.debug(`[PricingChart] Detail: ${r.toFixed(1)}h, Labels: ${p?"ON":"OFF"}, Mode: ${t}`)}let ct=class extends E{constructor(){super(...arguments),this.data=null,this.datalabelMode="auto",this.zoomState={start:null,end:null},this.currentDetailLevel="overview",this.chart=null,this.resizeObserver=null}firstUpdated(){this.setupResizeObserver(),this.data&&this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())}updated(e){e.has("data")&&this.data&&(this.chart?this.updateChartData():this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())),e.has("datalabelMode")&&this.chart&&xt(this.chart,this.datalabelMode)}disconnectedCallback(){var e;super.disconnectedCallback(),this.destroyChart(),(e=this.resizeObserver)==null||e.disconnect(),this.resizeObserver=null}zoomToTimeRange(e,t){if(!this.chart){_.warn("[PricingChart] Chart not available for zoom");return}const i=new Date(e),n=new Date(t),r=15*60*1e3,a=i.getTime()-r,s=n.getTime()+r;if(this.zoomState.start!==null&&Math.abs(this.zoomState.start-a)<6e4&&this.zoomState.end!==null&&Math.abs(this.zoomState.end-s)<6e4){_.debug("[PricingChart] Already zoomed to same range → reset"),this.resetZoom();return}try{const l=this.chart.options;l.scales.x.min=a,l.scales.x.max=s,this.chart.update("none"),this.zoomState={start:a,end:s},this.currentDetailLevel=Wt(this.chart),xt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-change",{detail:{start:a,end:s,level:this.currentDetailLevel},bubbles:!0,composed:!0})),_.debug("[PricingChart] Zoomed to range",{start:new Date(a).toISOString(),end:new Date(s).toISOString()})}catch(l){_.error("[PricingChart] Zoom error",l)}}resetZoom(){if(!this.chart)return;const e=this.chart.options;delete e.scales.x.min,delete e.scales.x.max,this.chart.update("none"),this.zoomState={start:null,end:null},this.currentDetailLevel=Wt(this.chart),xt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-reset",{bubbles:!0,composed:!0}))}getChart(){return this.chart}createChart(){if(!this.canvas||!this.data||this.data.timeline.length===0)return;this.chart&&this.destroyChart();const e=this.data,t=ja(e),i=window.innerWidth<520,n={responsive:!0,maintainAspectRatio:!1,animation:{duration:0},interaction:{mode:"index",intersect:!1},plugins:{legend:{labels:{color:"#ffffff",font:{size:i?10:11,weight:"500"},padding:i?6:10,usePointStyle:!0,pointStyle:"circle",boxWidth:i?8:12,boxHeight:i?8:12},position:"top"},tooltip:{backgroundColor:"rgba(0,0,0,0.9)",titleColor:"#ffffff",bodyColor:"#ffffff",titleFont:{size:13,weight:"bold"},bodyFont:{size:11},padding:10,cornerRadius:6,displayColors:!0,callbacks:{title:a=>a.length>0?new Date(a[0].parsed.x).toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"",label:a=>{let s=a.dataset.label||"";return s&&(s+=": "),a.parsed.y!==null&&(a.dataset.yAxisID==="y-price"?s+=a.parsed.y.toFixed(2)+" Kč/kWh":a.dataset.yAxisID==="y-solar"?s+=a.parsed.y.toFixed(2)+" kWh":a.dataset.yAxisID==="y-power"?s+=a.parsed.y.toFixed(2)+" kW":s+=a.parsed.y),s}}},datalabels:{display:!1},zoom:{zoom:{wheel:{enabled:!0,modifierKey:null},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)",borderColor:"rgba(33, 150, 243, 0.8)",borderWidth:2},pinch:{enabled:!0},mode:"x",onZoomComplete:({chart:a})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=Wt(a),xt(a,this.datalabelMode)}},pan:{enabled:!0,mode:"x",modifierKey:"shift",onPanComplete:({chart:a})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=Wt(a),xt(a,this.datalabelMode)}},limits:{x:{minRange:36e5}}},pricingModeIcons:null},scales:{x:{type:"timeseries",time:{unit:"hour",displayFormats:{hour:i?"HH:mm":"dd.MM HH:mm"},tooltipFormat:"dd.MM.yyyy HH:mm"},ticks:{color:this.getTextColor(),maxRotation:i?0:45,minRotation:i?0:45,font:{size:i?10:11},maxTicksLimit:i?6:20},grid:{color:this.getGridColor(),lineWidth:1}},"y-price":{type:"linear",position:"left",ticks:{color:"#2196F3",font:{size:11,weight:"500"},callback:a=>a.toFixed(2)+" Kč"},grid:{color:"rgba(33, 150, 243, 0.15)",lineWidth:1},title:{display:!i,text:"💰 Cena (Kč/kWh)",color:"#2196F3",font:{size:13,weight:"bold"}}},"y-solar":{type:"linear",position:"left",stacked:!0,display:!i,ticks:{color:"#78909C",font:{size:11,weight:"500"},callback:a=>a.toFixed(1)+" kWh",display:!0},grid:{display:!0,color:"rgba(120, 144, 156, 0.15)",lineWidth:1,drawOnChartArea:!0},title:{display:!0,text:"🔋 Kapacita baterie (kWh)",color:"#78909C",font:{size:11,weight:"bold"}},beginAtZero:!1},"y-power":{type:"linear",position:"right",stacked:!0,ticks:{color:"#FFA726",font:{size:11,weight:"500"},callback:a=>a.toFixed(2)+" kW"},grid:{display:!1},title:{display:!i,text:"☀️ Výkon (kW)",color:"#FFA726",font:{size:13,weight:"bold"}}}}};Ra(n);const r={type:"bar",data:{labels:e.labels,datasets:t},plugins:[cs],options:n};try{this.chart=new Hn(this.canvas,r),xt(this.chart,this.datalabelMode),e.initialZoomStart&&e.initialZoomEnd&&requestAnimationFrame(()=>{if(!this.chart)return;const a=this.chart.options;a.scales.x.min=e.initialZoomStart,a.scales.x.max=e.initialZoomEnd,this.chart.update("none"),this.currentDetailLevel=Wt(this.chart),xt(this.chart,this.datalabelMode)}),_.info("[PricingChart] Chart created",{datasets:t.length,labels:e.labels.length,segments:e.modeSegments.length})}catch(a){_.error("[PricingChart] Failed to create chart",a)}}updateChartData(){var s;if(!this.chart||!this.data)return;const e=this.data,t=ja(e),i=((s=this.chart.data.labels)==null?void 0:s.length)!==e.labels.length,n=this.chart.data.datasets.length!==t.length;i&&(this.chart.data.labels=e.labels);let r="none";n?(this.chart.data.datasets=t,r=void 0):t.forEach((l,d)=>{const u=this.chart.data.datasets[d];u&&(u.data=l.data,u.label=l.label,u.backgroundColor=l.backgroundColor,u.borderColor=l.borderColor)});const a=this.chart.options;a.plugins||(a.plugins={}),a.plugins.pricingModeIcons=null,Ra(a),this.chart.update(r),_.debug("[PricingChart] Chart updated incrementally")}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(()=>{var e;(e=this.chart)==null||e.resize()}),this.resizeObserver.observe(this)}getTextColor(){try{return getComputedStyle(this).getPropertyValue("--oig-text-primary").trim()||"#e0e0e0"}catch{return"#e0e0e0"}}getGridColor(){try{return getComputedStyle(this).getPropertyValue("--oig-border").trim()||"rgba(255,255,255,0.1)"}catch{return"rgba(255,255,255,0.1)"}}setDatalabelMode(e){this.datalabelMode=e,this.dispatchEvent(new CustomEvent("datalabel-mode-change",{detail:{mode:e},bubbles:!0,composed:!0}))}get isZoomed(){return this.zoomState.start!==null||this.zoomState.end!==null}renderControls(){const e=t=>{const i=this.datalabelMode===t?"active":"";return t==="always"&&this.datalabelMode==="always"?`control-btn mode-always ${i}`:t==="never"&&this.datalabelMode==="never"?`control-btn mode-never ${i}`:`control-btn ${i}`};return c`
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
    `}};ct.styles=D`
    :host {
      display: block;
      background: ${at(o.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${at(o.cardShadow)};
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
      color: ${at(o.textPrimary)};
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
      color: ${at(o.textSecondary)};
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .control-btn:hover {
      background: ${at(o.accent)};
      color: #fff;
    }

    .control-btn.active {
      background: ${at(o.accent)};
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
      color: ${at(o.textSecondary)};
      font-size: 14px;
    }

    .chart-hint {
      font-size: 10px;
      color: ${at(o.textSecondary)};
      opacity: 0.7;
      margin-top: 6px;
      text-align: center;
    }
  `;di([f({type:Object})],ct.prototype,"data",2);di([f({type:String})],ct.prototype,"datalabelMode",2);di([T()],ct.prototype,"zoomState",2);di([T()],ct.prototype,"currentDetailLevel",2);di([Vn("#pricing-canvas")],ct.prototype,"canvas",2);ct=di([O("oig-pricing-chart")],ct);const Bt="—";function Fe(e){return e==null||!Number.isFinite(e)?Bt:`${e.toFixed(1)} °C`}function Yt(e){return e==null||!Number.isFinite(e)?Bt:`${e.toFixed(2)} kWh`}function Ar(e){return e==null||!Number.isFinite(e)?Bt:`${e.toFixed(2)} Kč`}function lh(e){return e==null||!Number.isFinite(e)?Bt:`${Math.round(e*100)} %`}function ch(e,t){const i=n=>{const r=new Date(n);return Number.isNaN(r.getTime())?n:`${String(r.getHours()).padStart(2,"0")}:${String(r.getMinutes()).padStart(2,"0")}`};return`${i(e)} – ${i(t)}`}function dh(e){return e==null||!Number.isFinite(e)?Bt:e<60?`${Math.round(e)} s`:e<3600?`${Math.round(e/60)} min`:`${Math.round(e/3600)} h`}function uh(e){return e==null||!Number.isFinite(e)?Bt:`${e.toFixed(0)} L`}function ph(e){if(e==null||!Number.isFinite(e)||e<0)return Bt;const t=Math.floor(e/60),i=Math.round(e%60);return t===0?`${i} min`:i===0?`${t} h`:`${t} h ${i} min`}function hh(e){const t=e.topTempC;if(t==null||!Number.isFinite(t))return null;if(e.targetTempC<=t)return 0;const i=e.targetTempC-t;return e.temperatureTrendCPerMin!=null&&Number.isFinite(e.temperatureTrendCPerMin)&&e.temperatureTrendCPerMin>0?i/e.temperatureTrendCPerMin:e.heaterPowerKw!==null&&Number.isFinite(e.heaterPowerKw)&&e.volumeL!=null&&Number.isFinite(e.volumeL)?e.heaterPowerKw===0?null:e.volumeL*.001163*i/e.heaterPowerKw*60:null}var gh=Object.defineProperty,fh=Object.getOwnPropertyDescriptor,L=(e,t,i,n)=>{for(var r=n>1?void 0:n?fh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&gh(t,i,r),r};const z=G,bt=D`
  background: ${z(o.cardBg)};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${z(o.cardShadow)};
`,Je=D`
  font-size: 15px;
  font-weight: 600;
  color: ${z(o.textPrimary)};
  margin: 0 0 12px 0;
`;function mh(e){return Math.max(0,Math.min(100,e))}function Ha(e){const n=Math.max(0,Math.min(1,(e-10)/60)),r={r:33,g:150,b:243},a={r:255,g:87,b:34},s=(l,d)=>Math.round(l+(d-l)*n);return`rgb(${s(r.r,a.r)}, ${s(r.g,a.g)}, ${s(r.b,a.b)})`}let ji=class extends E{constructor(){super(...arguments),this.collapsed=!0,this.busy=!1}toggle(){this.collapsed=!this.collapsed}async doAction(e,t){this.busy=!0;try{const i=await e();this.dispatchEvent(new CustomEvent("action-done",{detail:{success:i,label:t},bubbles:!0,composed:!0}))}finally{this.busy=!1}}render(){return c`
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
              @click=${()=>this.doAction(pc,"plan")}>
              Preplanovat (debug)
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(hc,"apply")}>
              Aplikovat rucne
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(gc,"cancel")}>
              Zrusit plan
            </button>
          </div>
        </div>
      </div>
    `}};ji.styles=D`
    :host { display: block; }

    .panel {
      ${bt};
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
      color: ${z(o.textPrimary)};
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
      color: ${z(o.textSecondary)};
    }

    .info-bubble .tooltip {
      display: none;
      position: absolute;
      left: 0;
      top: 24px;
      width: 280px;
      padding: 10px;
      background: ${z(o.cardBg)};
      border: 1px solid ${z(o.divider)};
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      font-size: 11px;
      line-height: 1.5;
      color: ${z(o.textSecondary)};
      z-index: 100;
      white-space: normal;
    }

    .info-bubble:hover .tooltip { display: block; }

    .toggle-icon {
      font-size: 18px;
      font-weight: bold;
      color: ${z(o.textSecondary)};
      transition: transform 0.2s;
    }

    .panel-content {
      display: none;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid ${z(o.divider)};
    }

    .panel-content.open { display: block; }

    .section-label {
      font-size: 12px;
      font-weight: 600;
      color: ${z(o.textSecondary)};
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
      border: 1px solid ${z(o.divider)};
      border-radius: 8px;
      background: ${z(o.bgSecondary)};
      color: ${z(o.textPrimary)};
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      white-space: nowrap;
    }

    .action-btn:hover { background: ${z(o.divider)}; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `;L([T()],ji.prototype,"collapsed",2);L([T()],ji.prototype,"busy",2);ji=L([O("oig-boiler-debug-panel")],ji);let Tn=class extends E{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return c`<div>Nacitani stavu...</div>`;const t=(i,n,r=1)=>i!=null?`${i.toFixed(r)} ${n}`:`-- ${n}`;return c`
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
        `:P}
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
    `}};Tn.styles=D`
    :host { display: block; }

    h3 { ${Je}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .card {
      ${bt};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${z(o.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 18px;
      font-weight: 600;
      color: ${z(o.textPrimary)};
    }

    .card-value.small {
      font-size: 13px;
      font-weight: 500;
    }
  `;L([f({type:Object})],Tn.prototype,"data",2);Tn=L([O("oig-boiler-status-grid")],Tn);let Mn=class extends E{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return P;const t=i=>`${i.toFixed(2)} kWh`;return c`
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
    `}};Mn.styles=D`
    :host { display: block; }

    h3 { ${Je}; }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .card {
      ${bt};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${z(o.textSecondary)};
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
      background: ${z(o.bgSecondary)};
    }

    .ratio-fve { background: #4CAF50; }
    .ratio-grid { background: #FF9800; }
    .ratio-alt { background: #2196F3; }

    .ratio-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 11px;
      color: ${z(o.textSecondary)};
    }
  `;L([f({type:Object})],Mn.prototype,"data",2);Mn=L([O("oig-boiler-energy-breakdown")],Mn);let Dn=class extends E{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return P;const t=e.peakHours.length?e.peakHours.map(r=>`${r}h`).join(", "):"--",i=e.waterLiters40c!==null?`${e.waterLiters40c.toFixed(0)} L`:"-- L",n=e.circulationNow.startsWith("ANO");return c`
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
          <span class="value ${n?"active":"idle"}">${e.circulationNow}</span>
        </div>
      </div>
    `}};Dn.styles=D`
    :host { display: block; }

    h3 { ${Je}; }

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
      border-bottom: 1px solid ${z(o.divider)};
      font-size: 13px;
    }

    .item:last-child { border-bottom: none; }

    .label { color: ${z(o.textSecondary)}; }

    .value {
      font-weight: 600;
      color: ${z(o.textPrimary)};
    }

    .value.active { color: #4CAF50; }
    .value.idle { color: ${z(o.textSecondary)}; }
  `;L([f({type:Object})],Dn.prototype,"data",2);Dn=L([O("oig-boiler-predicted-usage")],Dn);let Hi=class extends E{constructor(){super(...arguments),this.plan=null,this.forecastWindows={fve:"--",grid:"--"}}render(){var n;const e=this.plan,t=this.forecastWindows,i=r=>r??"--";return c`
      <h3>Informace o planu</h3>
      <div class="rows">
        <div class="row">
          <span class="row-label">Mix zdroju:</span>
          <span class="row-value">${i(e==null?void 0:e.sourceDigest)}</span>
        </div>
        <div class="row">
          <span class="row-label">Slotu:</span>
          <span class="row-value">${((n=e==null?void 0:e.slots)==null?void 0:n.length)??"--"}</span>
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
    `}};Hi.styles=D`
    :host { display: block; }

    h3 { ${Je}; }

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
      border-bottom: 1px solid ${z(o.divider)};
      font-size: 13px;
    }

    .row:last-child { border-bottom: none; }

    .row-label { color: ${z(o.textSecondary)}; }
    .row-value {
      font-weight: 500;
      color: ${z(o.textPrimary)};
      text-align: right;
      max-width: 60%;
      word-break: break-word;
    }
  `;L([f({type:Object})],Hi.prototype,"plan",2);L([f({type:Object})],Hi.prototype,"forecastWindows",2);Hi=L([O("oig-boiler-plan-info")],Hi);let Vi=class extends E{constructor(){super(...arguments),this.boilerState=null,this.targetTemp=60}render(){const e=this.boilerState;if(!e)return c`<div>Nacitani...</div>`;const t=10,i=70,n=m=>mh((m-t)/(i-t)*100),r=e.heatingPercent??0,a=e.tempTop!==null?n(e.tempTop):null,s=e.tempBottom!==null?n(e.tempBottom):null,l=n(this.targetTemp),d=Ha(e.tempTop??this.targetTemp),u=Ha(e.tempBottom??10),p=`linear-gradient(180deg, ${d} 0%, ${u} 100%)`,h=e.heatingPercent!==null?`${e.heatingPercent.toFixed(0)}% nahrato`:"-- % nahrato";return c`
      <h3>Vizualizace bojleru</h3>

      <div class="tank-wrapper">
        <div class="temp-scale">
          ${[70,60,50,40,30,20,10].map(m=>c`<span>${m}°C</span>`)}
        </div>

        <div class="tank">
          <div class="water" style="height:${r}%; background:${p}"></div>

          <div class="target-line" style="bottom:${l}%">
            <span class="target-label">Cil</span>
          </div>

          ${a!==null?c`
            <div class="sensor top" style="bottom:${a}%">
              <span class="sensor-label">${e.tempTop.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:P}

          ${s!==null?c`
            <div class="sensor bottom" style="bottom:${s}%">
              <span class="sensor-label">${e.tempBottom.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:P}
        </div>
      </div>

      <div class="grade-label">${h}</div>
    `}};Vi.styles=D`
    :host { display: block; }

    h3 { ${Je}; }

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
      color: ${z(o.textSecondary)};
      text-align: right;
      padding: 2px 0;
    }

    /* Tank body */
    .tank {
      flex: 1;
      position: relative;
      border: 2px solid ${z(o.divider)};
      border-radius: 12px;
      overflow: hidden;
      background: ${z(o.bgSecondary)};
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
      border-top: 2px dashed ${z(o.accent)};
      z-index: 3;
    }

    .target-label {
      position: absolute;
      right: 4px;
      top: -14px;
      font-size: 9px;
      color: ${z(o.accent)};
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
      color: ${z(o.textPrimary)};
    }
  `;L([f({type:Object})],Vi.prototype,"boilerState",2);L([f({type:Number})],Vi.prototype,"targetTemp",2);Vi=L([O("oig-boiler-tank")],Vi);let Wi=class extends E{constructor(){super(...arguments),this.current="",this.available=[]}onChange(e){const t=e.target.value;this.dispatchEvent(new CustomEvent("category-change",{detail:{category:t},bubbles:!0,composed:!0}))}render(){const e=this.available.length?this.available:Object.keys(Cr);return c`
      <div class="row">
        <label>Profil:</label>
        <select @change=${this.onChange}>
          ${e.map(t=>c`
            <option value=${t} ?selected=${t===this.current}>
              ${Cr[t]||t}
            </option>
          `)}
        </select>
      </div>
    `}};Wi.styles=D`
    :host { display: block; margin: 12px 0; }

    .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    label {
      font-size: 13px;
      font-weight: 600;
      color: ${z(o.textPrimary)};
    }

    select {
      padding: 6px 10px;
      font-size: 13px;
      border: 1px solid ${z(o.divider)};
      border-radius: 6px;
      background: ${z(o.cardBg)};
      color: ${z(o.textPrimary)};
      cursor: pointer;
    }
  `;L([f({type:String})],Wi.prototype,"current",2);L([f({type:Array})],Wi.prototype,"available",2);Wi=L([O("oig-boiler-category-select")],Wi);let En=class extends E{constructor(){super(...arguments),this.data=[]}render(){if(!this.data.length)return P;const e=this.data.flatMap(s=>s.hours),t=Math.max(...e,.1),i=t*.3,n=t*.7,r=Array.from({length:24},(s,l)=>l),a=s=>s===0?"none":s<i?"low":s<n?"medium":"high";return c`
      <h3>Mapa spotreby (7 dni)</h3>
      <div class="wrapper">
        <div class="grid">
          <!-- Header row -->
          <div></div>
          ${r.map(s=>c`<div class="hour-header">${s}</div>`)}

          <!-- Day rows -->
          ${this.data.map(s=>c`
            <div class="day-label">${s.day}</div>
            ${s.hours.map((l,d)=>c`
              <div class="cell ${a(l)}"
                   title="${s.day} ${d}h: ${l.toFixed(2)} kWh"></div>
            `)}
          `)}
        </div>

        <div class="legend">
          <span class="legend-item"><span class="legend-dot" style="background:#c8e6c9"></span> Nizka</span>
          <span class="legend-item"><span class="legend-dot" style="background:#ff9800"></span> Stredni</span>
          <span class="legend-item"><span class="legend-dot" style="background:#f44336"></span> Vysoka</span>
        </div>
      </div>
    `}};En.styles=D`
    :host { display: block; }

    h3 { ${Je}; }

    .wrapper {
      ${bt};
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
      color: ${z(o.textSecondary)};
      text-align: center;
      padding: 2px 0;
    }

    .day-label {
      font-size: 10px;
      font-weight: 600;
      color: ${z(o.textSecondary)};
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

    .cell.none   { background: ${z(o.bgSecondary)}; }
    .cell.low    { background: #c8e6c9; }
    .cell.medium { background: #ff9800; }
    .cell.high   { background: #f44336; }

    .legend {
      display: flex;
      gap: 14px;
      margin-top: 10px;
      font-size: 11px;
      color: ${z(o.textSecondary)};
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
  `;L([f({type:Array})],En.prototype,"data",2);En=L([O("oig-boiler-heatmap-grid")],En);let On=class extends E{constructor(){super(...arguments),this.plan=null}render(){const e=this.plan,t=(i,n=2)=>i!=null?i.toFixed(n):"-";return c`
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
    `}};On.styles=D`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .card {
      ${bt};
      padding: 14px;
    }

    .card-title {
      font-size: 12px;
      color: ${z(o.textSecondary)};
      margin-bottom: 6px;
    }

    .card-value {
      font-size: 22px;
      font-weight: 700;
    }

    .total { color: ${z(o.textPrimary)}; }
    .fve { color: #4CAF50; }
    .grid-c { color: #FF9800; }
    .cost { color: #2196F3; }
  `;L([f({type:Object})],On.prototype,"plan",2);On=L([O("oig-boiler-stats-cards")],On);let zn=class extends E{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return P;const t=Math.max(...e.hourlyAvg,.01),i=new Set(e.peakHours),n=e.peakHours.length?e.peakHours.map(a=>`${a}h`).join(", "):"--",r=e.confidence!==null?`${Math.round(e.confidence*100)} %`:"-- %";return c`
      <h3>Profil spotreby (tyden)</h3>
      <div class="wrapper">
        <div class="chart">
          ${e.hourlyAvg.map((a,s)=>{const l=t>0?a/t*100:0,d=i.has(s);return c`
              <div class="bar-col" title="${s}h: ${a.toFixed(3)} kWh">
                <div class="bar ${d?"peak":"normal"}"
                     style="height:${l}%"></div>
                <span class="bar-label">${s}</span>
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
            <span class="stat-value">${n}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Spolehlivost:</span>
            <span class="stat-value">${r}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Sledovano:</span>
            <span class="stat-value">${e.daysTracked} dni</span>
          </div>
        </div>
      </div>
    `}};zn.styles=D`
    :host { display: block; }

    h3 { ${Je}; }

    .wrapper {
      ${bt};
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
      color: ${z(o.textSecondary)};
      margin-top: 3px;
    }

    /* Stats row */
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid ${z(o.divider)};
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .stat-label { color: ${z(o.textSecondary)}; }
    .stat-value { font-weight: 600; color: ${z(o.textPrimary)}; }
  `;L([f({type:Object})],zn.prototype,"data",2);zn=L([O("oig-boiler-profiling")],zn);let An=class extends E{constructor(){super(...arguments),this.config=null}render(){const e=this.config;if(!e)return P;const t=(i,n="")=>i!=null?`${i}${n?" "+n:""}`:`--${n?" "+n:""}`;return c`
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
    `}};An.styles=D`
    :host { display: block; }

    h3 { ${Je}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .card {
      ${bt};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${z(o.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 600;
      color: ${z(o.textPrimary)};
    }
  `;L([f({type:Object})],An.prototype,"config",2);An=L([O("oig-boiler-config-section")],An);function Va(e,t){const i=e*t,n=Math.floor(i/60)%24,r=i%60;return`${String(n).padStart(2,"0")}:${String(r).padStart(2,"0")}`}function bh(e){switch(e){case"morning":return"🌅";case"afternoon":return"☀️";case"evening":return"🌆";case"night":return"🌙";default:return"💧"}}let qi=class extends E{constructor(){super(...arguments),this.data=null,this.lang="cs"}render(){const e=this.lang,t=C("boiler.demand_map.heading",e);if(!this.data)return c`
        <div class="card" data-testid="boiler-demand-map">
          <div class="heading">💧 ${t}</div>
          <div class="empty-state">${C("boiler.demand_map.empty",e)}</div>
        </div>
      `;const i=this.data,n=i.slotDurationMin||15,r=48,a=Math.ceil(i.slotsP80.length/r),s=[];for(let h=0;h<r;h++){let g=0,m=0;for(let b=0;b<a;b++){const v=h*a+b;g+=i.slotsP80[v]??0,m+=i.slotsP50[v]??0}s.push(g)}const l=Math.max(...s,.001),d=60,u={0:"00",12:"06",24:"12",36:"18"},p=h=>{const g=h/l;return g<.15?"rgba(255,255,255,0.06)":g<.4?"rgba(33,150,243,0.25)":g<.7?"rgba(33,150,243,0.55)":"rgba(33,150,243,0.90)"};return c`
      <div class="card" data-testid="boiler-demand-map">
        <div class="heading">💧 ${t}</div>

        <div class="heatmap-wrap">
          <div class="heatmap">
            ${s.map((h,g)=>{const m=Math.max(2,Math.round(h/l*d)),b=Va(g*a,n),v=h.toFixed(2);return c`
                <div class="heatmap-col" title="${b}: ${v} kWh">
                  <div class="heatmap-bar"
                       style="height:${m}px; background:${p(h)};">
                  </div>
                </div>
              `})}
          </div>

          <div class="hour-axis">
            ${Array.from({length:r},(h,g)=>{const m=u[g];return m!==void 0?c`<span class="hour-label">${m}</span>`:c`<span class="hour-label hidden"></span>`})}
          </div>
        </div>

        ${i.windows.length>0?c`
          <div class="chips">
            ${i.windows.slice(0,3).map(h=>{const g=Va(h.slotIndex,n),m=bh(h.label),b=Math.round(h.liters),v=h.p80Kwh.toFixed(1);return c`
                <span class="chip">
                  ${m}
                  <span class="chip-time">${g}</span>
                  &ge; ${b} L (${v} kWh)
                </span>
              `})}
          </div>
        `:P}

        <div class="meta">
          <span>
            ${C("boiler.demand_map.meta",e).replace("{n}",String(i.profile.daysUsed)).replace("{cat}",Cr[i.profile.category]||i.profile.label)}
          </span>
          <span class="confidence-badge ${i.confidence<.5?"low":""}">
            ${C("boiler.demand_map.confidence",e)} ${Math.round(i.confidence*100)}&nbsp;%
          </span>
          ${i.profile.fallbackUsed?c`
            <span class="fallback-notice">${C("boiler.demand_map.fallback_notice",e)}</span>
          `:P}
        </div>
      </div>
    `}};qi.styles=D`
    :host { display: block; }

    .card {
      ${bt};
      padding: 16px;
    }

    .heading {
      ${Je};
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Empty / collecting state */
    .empty-state {
      text-align: center;
      padding: 24px 0;
      color: ${z(o.textSecondary)};
      font-size: 13px;
    }

    /* Heatmap: 48 columns (2 slots aggregated per column) */
    .heatmap-wrap {
      overflow-x: auto;
    }

    .heatmap {
      display: grid;
      grid-template-columns: repeat(48, 1fr);
      gap: 2px;
      min-width: 280px;
      margin-bottom: 6px;
    }

    .heatmap-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
    }

    .heatmap-bar {
      width: 100%;
      min-height: 2px;
      border-radius: 2px 2px 0 0;
      transition: opacity 0.15s;
    }

    .heatmap-bar:hover { opacity: 0.75; }

    /* Hour axis labels: show at 0, 6, 12, 18, 24 (index 0, 6, 12, 18 in 48-col map) */
    .hour-axis {
      display: grid;
      grid-template-columns: repeat(48, 1fr);
      min-width: 280px;
      margin-bottom: 10px;
    }

    .hour-label {
      grid-column: span 1;
      font-size: 9px;
      color: ${z(o.textSecondary)};
      text-align: left;
    }

    .hour-label.hidden { visibility: hidden; }

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
      color: ${z(o.textPrimary)};
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }

    .chip-time {
      font-weight: 700;
      color: ${z(o.accent)};
    }

    /* Meta line */
    .meta {
      font-size: 11px;
      color: ${z(o.textSecondary)};
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
  `;L([f({attribute:!1})],qi.prototype,"data",2);L([f({type:String})],qi.prototype,"lang",2);qi=L([O("oig-boiler-demand-map")],qi);let Ln=class extends E{constructor(){super(...arguments),this.state=null}render(){return this.state?c`
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
    `:c`<div>Nacitani...</div>`}};Ln.styles=D`
    :host {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: ${z(o.cardBg)};
      border-radius: 12px;
      box-shadow: ${z(o.cardShadow)};
    }

    .temp-display { text-align: center; }

    .current-temp {
      font-size: 36px;
      font-weight: 600;
      color: ${z(o.textPrimary)};
    }

    .target-temp {
      font-size: 14px;
      color: ${z(o.textSecondary)};
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
      color: ${z(o.textSecondary)};
    }
  `;L([f({type:Object})],Ln.prototype,"state",2);Ln=L([O("oig-boiler-state")],Ln);let In=class extends E{constructor(){super(...arguments),this.data=[]}render(){return P}};In.styles=D`
    :host { display: block; }
  `;L([f({type:Array})],In.prototype,"data",2);In=L([O("oig-boiler-heatmap")],In);let Ki=class extends E{constructor(){super(...arguments),this.profiles=[],this.editMode=!1}render(){return P}};Ki.styles=D`
    :host { display: block; }
  `;L([f({type:Array})],Ki.prototype,"profiles",2);L([f({type:Boolean})],Ki.prototype,"editMode",2);Ki=L([O("oig-boiler-profiles")],Ki);let Yi=class extends E{constructor(){super(...arguments),this.data=null,this.lang="cs"}render(){const e=this.data,t=this.lang,i=(e==null?void 0:e.currentState)??"unknown",n=C(`boiler.status.${i}`,t),r=(e==null?void 0:e.comfortSatisfied)===!0?C("boiler.status.comfort_satisfied",t):(e==null?void 0:e.comfortSatisfied)===!1?C("boiler.status.comfort_unsatisfied",t):C("boiler.status.comfort_unknown",t),a=(e==null?void 0:e.comfortSatisfied)===!0?"ok":(e==null?void 0:e.comfortSatisfied)===!1?"bad":"unknown",s=(e==null?void 0:e.degradedFlags)??[];return c`
      <div data-testid="boiler-status-panel" class="panel">
        <div class="row">
          <div class="heading">${C("boiler.status.heading",t)}</div>
          <span data-testid="boiler-status-current-state" class="pill ${i}">${n}</span>
        </div>
        <div class="degraded-banner" ?hidden=${!(e!=null&&e.degraded)}>${C("boiler.status.degraded",t)}</div>
        <div class="grid">
          <div class="field"><label>${C("boiler.status.temp_top",t)}</label><span>${Fe((e==null?void 0:e.temperatureTop)??null)}</span></div>
          <div class="field"><label>${C("boiler.status.temp_bottom",t)}</label><span>${Fe((e==null?void 0:e.temperatureBottom)??null)}</span></div>
          <div class="field"><label>${C("boiler.status.selected_source",t)}</label><span data-testid="boiler-status-selected-source">${Ze((e==null?void 0:e.selectedSource)??null,t)}</span></div>
          <div class="field"><label>${C("boiler.status.actuated_source",t)}</label><span data-testid="boiler-status-actuated-source">${Ze((e==null?void 0:e.actuatedSource)??null,t)}</span></div>
          <div class="field"><label>${C("boiler.status.energy_needed",t)}</label><span>${Yt((e==null?void 0:e.energyNeededKwh)??null)}</span></div>
          <div class="field"><label>${C("boiler.status.last_update",t)}</label><span>${(e==null?void 0:e.lastUpdate)??"—"}</span></div>
        </div>
        <div data-testid="boiler-status-comfort" class="comfort ${a}">${r}</div>
        ${s.length?c`<div data-testid="boiler-status-degraded-flags" class="degraded-list">${s.map(l=>c`<span class="degraded-tag">${xn(l,t)}</span>`)}</div>`:""}
      </div>
    `}};Yi.styles=D`
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
  `;L([f({attribute:!1})],Yi.prototype,"data",2);L([f({type:String})],Yi.prototype,"lang",2);Yi=L([O("oig-boiler-status-panel")],Yi);let Ui=class extends E{constructor(){super(...arguments),this.slots=[],this.lang="cs"}srcClass(e){return e&&["fve","grid","alternative","overflow","discharge"].includes(e)?e:"other"}render(){const e=this.lang;return!this.slots||this.slots.length===0?c`<div data-testid="boiler-plan-timeline" class="wrap"><div class="heading">${C("boiler.timeline.heading",e)}</div><div class="empty">${C("boiler.timeline.empty",e)}</div></div>`:c`
      <div data-testid="boiler-plan-timeline" class="wrap">
        <div class="heading">${C("boiler.timeline.heading",e)}</div>
        <table>
          <thead>
            <tr>
              <th>${C("boiler.timeline.col_time",e)}</th>
              <th>${C("boiler.timeline.col_source",e)}</th>
              <th>${C("boiler.timeline.col_temp",e)}</th>
              <th>${C("boiler.timeline.col_kwh",e)}</th>
              <th>${C("boiler.timeline.col_cost",e)}</th>
              <th>${C("boiler.timeline.col_pv",e)}</th>
            </tr>
          </thead>
          <tbody>
            ${this.slots.map(t=>{const i=t.comfortSatisfied===!0?c`<span class="badge ok">${C("boiler.timeline.comfort_ok",e)}</span>`:t.comfortSatisfied===!1?c`<span class="badge bad">${C("boiler.timeline.comfort_gap",e)}</span>`:"";return c`
                <tr>
                  <td>${ch(t.start,t.end)}</td>
                  <td><span class="src ${this.srcClass(t.recommendedSource)}">${Ze(t.recommendedSource,e)}</span></td>
                  <td>${Fe(t.expectedTempTopC??null)} ${i}</td>
                  <td>${Yt(t.consumptionKwh)}</td>
                  <td>${Ar(t.estimatedCostCzk??null)}</td>
                  <td>${lh(t.pvShare??null)}</td>
                </tr>
              `})}
          </tbody>
        </table>
      </div>
    `}};Ui.styles=D`
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
  `;L([f({attribute:!1})],Ui.prototype,"slots",2);L([f({type:String})],Ui.prototype,"lang",2);Ui=L([O("oig-boiler-plan-timeline")],Ui);const Wa=new Set(["input_stale_price","input_stale_pv","input_stale_temperature","input_missing_recorder","input_adapter_error"]);let Gi=class extends E{constructor(){super(...arguments),this.explanation=null,this.lang="cs"}render(){const e=this.explanation,t=this.lang;if(!e)return c`<div data-testid="boiler-source-explanation" class="wrap"><div class="heading">${C("boiler.explanation.heading",t)}</div><div class="empty">${C("boiler.explanation.empty",t)}</div></div>`;const i=e.reasonCodes??[],n=i.filter(s=>Wa.has(s)),r=i.filter(s=>!Wa.has(s)),a=e.degradedReasons??[];return c`
      <div data-testid="boiler-source-explanation" class="wrap">
        <div class="heading">${C("boiler.explanation.heading",t)}</div>

        <div class="section" data-testid="boiler-explanation-freshness">
          <h4>${C("boiler.explanation.freshness_heading",t)}</h4>
          ${n.length===0?c`<div class="chips"><span class="chip fresh">${C("boiler.explanation.freshness_fresh",t)}</span></div>`:c`<div class="chips">${n.map(s=>c`<span class="chip stale">${xn(s,t)}</span>`)}</div>`}
        </div>

        <div class="section" data-testid="boiler-explanation-degraded">
          <h4>${C("boiler.explanation.degraded_heading",t)}</h4>
          ${a.length===0?c`<div class="empty">—</div>`:c`<div class="chips">${a.map(s=>c`<span class="chip degraded">${xn(s,t)}</span>`)}</div>`}
        </div>

        ${r.length?c`<div class="section" data-testid="boiler-explanation-reasons"><h4>Reason codes</h4><div class="chips">${r.map(s=>c`<span class="chip">${xn(s,t)}</span>`)}</div></div>`:""}

        <div class="meta-grid" data-testid="boiler-explanation-meta">
          ${e.planCreatedAt?c`<div class="meta"><label>${C("boiler.explanation.plan_created",t)}</label><span>${e.planCreatedAt}</span></div>`:""}
          ${e.planValidUntil?c`<div class="meta"><label>${C("boiler.explanation.plan_valid_until",t)}</label><span>${e.planValidUntil}</span></div>`:""}
          ${e.dataAgeSecs!=null?c`<div class="meta"><label>${C("boiler.explanation.data_age",t)}</label><span>${dh(e.dataAgeSecs)}</span></div>`:""}
          ${e.unsatisfiedComfortGapC!=null?c`<div class="meta"><label>${C("boiler.explanation.unsatisfied_gap",t)}</label><span>${e.unsatisfiedComfortGapC} °C</span></div>`:""}
          ${e.temperatureAtDeadlineC!=null?c`<div class="meta"><label>${C("boiler.explanation.temp_at_deadline",t)}</label><span>${Fe(e.temperatureAtDeadlineC)}</span></div>`:""}
        </div>
      </div>
    `}};Gi.styles=D`
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
  `;L([f({attribute:!1})],Gi.prototype,"explanation",2);L([f({type:String})],Gi.prototype,"lang",2);Gi=L([O("oig-boiler-source-explanation")],Gi);let ii=class extends E{constructor(){super(...arguments),this.identity={entryId:null,boxId:null,available:!1},this.currentOverride=null,this.lang="cs"}render(){var a,s;const e=this.lang,t=this.identity.available,i=((a=this.currentOverride)==null?void 0:a.capabilityAvailable)??!1,n=t&&i,r=((s=this.currentOverride)==null?void 0:s.active)===!0;return c`
      <div data-testid="boiler-override-panel" class="wrap">
        <div class="heading">${C("boiler.override.heading",e)}</div>
        <div class="subtitle">${C("boiler.override.subtitle",e)}</div>
        ${r?c`<span class="active-badge">${C("boiler.override.active",e)}</span>`:""}
        <div class="notice" ?hidden=${t}>${C("boiler.override.identity_unavailable",e)}</div>
        <div class="notice capability-notice" ?hidden=${!t||i}>${C("boiler.override.capability_unavailable",e)}</div>
        <label>
          ${C("boiler.override.ttl_label",e)}
          <input data-testid="override-ttl-input" type="number" min="15" max="1440" step="15" value="120" ?disabled=${!n} />
        </label>
        <label>
          ${C("boiler.override.reason_label",e)}
          <textarea data-testid="override-reason-input" required ?disabled=${!n}></textarea>
        </label>
        <button data-testid="override-submit-btn" ?disabled=${!n}>${C("boiler.override.submit",e)}</button>
      </div>
    `}};ii.styles=D`
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
  `;L([f({attribute:!1})],ii.prototype,"identity",2);L([f({attribute:!1})],ii.prototype,"currentOverride",2);L([f({type:String})],ii.prototype,"lang",2);ii=L([O("oig-boiler-override-panel")],ii);let ni=class extends E{constructor(){super(...arguments),this.reason="unavailable",this.message="",this.lang="cs"}render(){const e=this.lang,t=this.reason==="loading"?"⏳":this.reason==="error"?"⚠️":this.reason==="degraded"?"🟠":"ℹ️";return c`
      <div data-testid="boiler-unavailable-state" class="wrap">
        <span class="icon">${t}</span>
        <div class="headline loading-notice" ?hidden=${this.reason!=="loading"}>${C("boiler.unavailable.loading",e)}</div>
        <div class="headline error-notice" ?hidden=${this.reason!=="error"}>${C("boiler.unavailable.error",e)}</div>
        <div class="headline degraded-notice" ?hidden=${this.reason!=="degraded"}>${C("boiler.unavailable.degraded",e)}</div>
        <div class="headline unavailable-notice" ?hidden=${this.reason!=="unavailable"}>${C("boiler.unavailable.unavailable",e)}</div>
        ${this.message?c`<div class="message">${this.message}</div>`:""}
      </div>
    `}};ni.styles=D`
    :host { display: block; }
    .wrap { padding: 24px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; }
    .icon { font-size: 1.6rem; }
    .headline { font-size: 1rem; font-weight: 600; }
    .message { color: var(--secondary-text-color, #666); font-size: 0.9rem; }
  `;L([f({type:String})],ni.prototype,"reason",2);L([f({type:String})],ni.prototype,"message",2);L([f({type:String})],ni.prototype,"lang",2);ni=L([O("oig-boiler-unavailable-state")],ni);var vh=Object.defineProperty,yh=Object.getOwnPropertyDescriptor,Ae=(e,t,i,n)=>{for(var r=n>1?void 0:n?yh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&vh(t,i,r),r};const wt=G,qa=320,Ka=440,xh=75,gr=35,wh=170,fr=370,Ya=30,Ue=86,_e=46,st=148,Ge=348,jt=22,Li=_e+Ge,Re=Ue+st/2,Lr="#9E9E9E";function $h(e){return e?Rr[e]??Lr:Lr}function Ua(e){return isFinite(e)?Math.max(0,Math.min(1,e)):0}function _h(e,t){const i=Ua(e??0);if(i<=0)return[];const n=t.filter(s=>s.key!=="discharge"&&s.fillPct>0);if(n.length===0){const s=Math.round(i*Ge),l=Li-s,d=Math.max(_e,l),u=Li-d;return[{key:null,color:Lr,x:Ue,y:d,width:st,height:u,active:!1}]}const r=[];let a=Li;for(const s of n){const l=Math.round(Ua(s.fillPct)*Ge);if(l<=0)continue;const d=a-l,u=Math.max(_e,d),p=a-u;if(p<=0||(r.push({key:s.key,color:$h(s.key),x:Ue,y:u,width:st,height:p,active:s.active}),a=u,a<=_e))break}return r}function kh(e,t,i,n,r){const a=[C("boiler.aria.svg_summary",r)];a.push(`${C("boiler.status.temp_top",r)}: ${Fe(e)}`),a.push(`${C("boiler.status.temp_bottom",r)}: ${Fe(t)}`);const s=i?Ze(i,r):C("boiler.aria.source_unknown",r);return a.push(s),n&&a.push(C("boiler.aria.stale",r)),a.join(". ")}let Ce=class extends E{constructor(){super(...arguments),this.fillLevelPct=null,this.sourceSegments=[],this.topTempC=null,this.bottomTempC=null,this.lowerZoneTempC=null,this.volumeL=null,this.etaText=null,this.sourceKey=null,this.stale=!1,this.chargingLabel=null,this.lang="cs"}render(){try{return this._renderSvg()}catch{return c`<svg viewBox="0 0 ${qa} ${Ka}" role="img" aria-label="${C("boiler.aria.svg_summary",this.lang)}" data-testid="boiler-svg"></svg>`}}_renderSvg(){const e=_h(this.fillLevelPct,this.sourceSegments),t=kh(this.topTempC,this.bottomTempC,this.sourceKey,this.stale,this.lang),i="boiler-tank-clip",n=Fe(this.topTempC),r=this.volumeL!=null?uh(this.volumeL):null,a=this.sourceKey?Ze(this.sourceKey,this.lang):null,s=this.bottomTempC??this.lowerZoneTempC??null,l=s!=null?`${s.toFixed(1)}°`:"—°",d=s!=null&&this.bottomTempC==null?"DOLE (zóna)":"DOLE",u=this.fillLevelPct??null,p=u!=null?Math.round(u*100):null,h=u!=null?Math.max(_e+10,405-370*u):null;return c`
      <svg
        viewBox="0 0 ${qa} ${Ka}"
        role="img"
        aria-label="${t}"
        data-testid="boiler-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="${i}">
            <rect
              x="${Ue}"
              y="${_e}"
              width="${st}"
              height="${Ge}"
              rx="${jt}"
              ry="${jt}"
            />
          </clipPath>
        </defs>

        <rect
          class="boiler-body"
          x="${xh}"
          y="${gr}"
          width="${wh}"
          height="${fr}"
          rx="${Ya}"
          ry="${Ya}"
        />

        <rect
          class="boiler-tank-bg"
          x="${Ue}"
          y="${_e}"
          width="${st}"
          height="${Ge}"
          rx="${jt}"
          ry="${jt}"
        />

        <g clip-path="url(#${i})">
          ${e.map(g=>U`
              <rect
                class="aura-segment${g.active?" aura-segment--active":""}"
                data-testid="boiler-aura-fill"
                data-source-key="${g.key??"unknown"}"
                x="${g.x}"
                y="${g.y}"
                width="${g.width}"
                height="${g.height}"
                fill="${g.color}"
              />
            `)}
        </g>

        <rect
          class="boiler-tank-overlay"
          x="${Ue}"
          y="${_e}"
          width="${st}"
          height="${Ge}"
          rx="${jt}"
          ry="${jt}"
        />

        ${h!=null&&p!=null?U`
          <line x1="${Ue}" y1="${h}" x2="${Ue+st}" y2="${h}"
            stroke="rgba(245,184,0,.6)" stroke-width="1.5" stroke-dasharray="3,3"/>
          <text x="${Ue+st+7}" y="${h+4}"
            font-size="9" fill="#f5b800" font-weight="600">${p}%</text>
        `:""}

        <text
          class="temp-label-top label-shadow"
          data-testid="boiler-temp-top-label"
          x="${Re}"
          y="${_e+44}"
        >${n}</text>

        <text
          class="temp-label-bottom label-shadow"
          data-testid="boiler-temp-bottom-label"
          x="${Re}"
          y="${Li-36}"
          font-size="22"
          font-weight="700"
          fill="#fff"
          text-anchor="middle"
          style="paint-order:stroke;stroke:rgba(0,0,0,.4);stroke-width:2px"
        >${l}</text>
        <text
          x="${Re}"
          y="${Li-20}"
          text-anchor="middle"
          fill="rgba(255,255,255,.85)"
          font-size="10"
          style="paint-order:stroke;stroke:rgba(0,0,0,.3);stroke-width:2px"
        >${d}</text>

        ${r!=null?U`
          <g>
            <rect
              x="${Re-50}"
              y="${_e+Ge/2-18}"
              width="100"
              height="36"
              rx="6"
              fill="rgba(0,0,0,0.45)"
              stroke="rgba(96,165,250,0.5)"
              stroke-width="1"
            />
            <text
              class="volume-badge-text label-shadow"
              data-testid="boiler-volume-badge"
              x="${Re}"
              y="${_e+Ge/2-3}"
            >≈ ${r}</text>
            <text
              class="volume-badge-sub"
              x="${Re}"
              y="${_e+Ge/2+11}"
            >TUV @ 40 °C</text>
          </g>
        `:""}

        ${this.chargingLabel!=null?U`
          <g>
            <rect
              x="${Re-58}"
              y="${_e+126}"
              width="116"
              height="26"
              rx="13"
              fill="rgba(74,222,128,0.95)"
            />
            <text
              class="charging-chip-text"
              x="${Re}"
              y="${_e+143}"
            >${this.chargingLabel}</text>
          </g>
        `:""}

        ${this.etaText!=null?U`
          <g transform="translate(${Re} ${gr+fr+22})" data-testid="boiler-eta-chip">
            <rect x="-90" y="-14" width="180" height="28" rx="8"
              fill="rgba(255,122,69,.12)" stroke="rgba(255,122,69,.4)"/>
            <text x="0" y="-1" text-anchor="middle" fill="#ff7a45" font-size="12" font-weight="700">⏱ ${this.etaText}</text>
          </g>
        `:""}

        ${a!=null?U`
          <text
            class="source-chip-text"
            data-testid="boiler-source-chip"
            x="${Re}"
            y="${gr+fr+40}"
          >${a}</text>
        `:""}

        <line x1="50" y1="85" x2="80" y2="85" stroke="#5a6472" stroke-width="3"/>
        <text x="46" y="81" text-anchor="end" font-size="9" fill="#9aa6b2">⟲ Cirk.</text>
        <line x1="240" y1="85" x2="270" y2="85" stroke="#dd5544" stroke-width="3"/>
        <text x="274" y="81" font-size="9" fill="#9aa6b2">TUV →</text>
        <line x1="50" y1="380" x2="80" y2="380" stroke="#6688a8" stroke-width="3"/>
        <text x="46" y="376" text-anchor="end" font-size="9" fill="#9aa6b2">💧 Vstup</text>
      </svg>
    `}};Ce.styles=D`
    :host {
      display: block;
      width: 100%;
    }

    svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .boiler-body {
      fill: ${wt(o.bgSecondary)};
      stroke: ${wt(o.divider)};
      stroke-width: 2;
    }

    .boiler-tank-bg {
      fill: ${wt(o.bgPrimary)};
      stroke: ${wt(o.divider)};
      stroke-width: 1.5;
    }

    .aura-segment {
      transition: height 0.4s ease, y 0.4s ease;
    }

    .aura-segment--active {
      animation: boilerAuraShimmer 2s linear infinite;
    }

    @keyframes boilerAuraShimmer {
      0%   { opacity: 1; }
      50%  { opacity: 0.7; }
      100% { opacity: 1; }
    }

    .boiler-tank-overlay {
      fill: none;
      stroke: ${wt(o.divider)};
      stroke-width: 1.5;
    }

    .label-shadow {
      paint-order: stroke;
      stroke: rgba(0,0,0,0.55);
      stroke-width: 3;
      stroke-linejoin: round;
    }

    .temp-label-top {
      font-size: 22px;
      font-weight: 700;
      fill: #ffffff;
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .temp-label-bottom {
      font-size: 18px;
      font-weight: 600;
      fill: #ffffff;
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .charging-chip-text {
      font-size: 11px;
      font-weight: 700;
      fill: #0f1419;
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .volume-badge-text {
      font-size: 16px;
      font-weight: 700;
      fill: #ffffff;
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .volume-badge-sub {
      font-size: 9px;
      font-weight: 600;
      fill: #60a5fa;
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .volume-badge {
      font-size: 13px;
      font-weight: 500;
      fill: rgba(255,255,255,0.85);
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .eta-chip {
      font-size: 13px;
      font-weight: 600;
      fill: ${wt(o.textPrimary)};
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .source-chip-text {
      font-size: 12px;
      font-weight: 500;
      fill: ${wt(o.textSecondary)};
      text-anchor: middle;
      dominant-baseline: middle;
    }
  `;Ae([f({type:Number})],Ce.prototype,"fillLevelPct",2);Ae([f({type:Array})],Ce.prototype,"sourceSegments",2);Ae([f({type:Number})],Ce.prototype,"topTempC",2);Ae([f({type:Number})],Ce.prototype,"bottomTempC",2);Ae([f({type:Number})],Ce.prototype,"lowerZoneTempC",2);Ae([f({type:Number})],Ce.prototype,"volumeL",2);Ae([f({type:String})],Ce.prototype,"etaText",2);Ae([f({type:String})],Ce.prototype,"sourceKey",2);Ae([f({type:Boolean})],Ce.prototype,"stale",2);Ae([f({type:String})],Ce.prototype,"chargingLabel",2);Ae([f({type:String})],Ce.prototype,"lang",2);Ce=Ae([O("oig-boiler-v2-svg")],Ce);var Sh=Object.defineProperty,Ch=Object.getOwnPropertyDescriptor,Un=(e,t,i,n)=>{for(var r=n>1?void 0:n?Ch(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Sh(t,i,r),r};const mr=G,br=new Set(["temperature_unavailable","temperature_stale","source_stale","activity_stale","source_invalid","power_sign_mismatch_charge","power_sign_mismatch_discharge","runtime_cache_empty","config_profile_unavailable"]);function Ph(e){var t,i,n,r;if((t=e.status)!=null&&t.degraded)return!0;for(const a of((i=e.status)==null?void 0:i.degradedFlags)??[])if(br.has(a))return!0;for(const a of((n=e.activity)==null?void 0:n.staleFlags)??[])if(br.has(a))return!0;for(const a of((r=e.explanation)==null?void 0:r.degradedReasons)??[])if(br.has(a))return!0;return!1}function Th(e,t,i){var a;const n=e.activity;if(!n)return null;const r=hh({targetTempC:t.targetTempC??0,topTempC:((a=e.status)==null?void 0:a.temperatureTop)??null,temperatureTrendCPerMin:n.temperatureTrendCPerMin,volumeL:t.volumeL,heaterPowerKw:t.heaterPowerKw});return r===null?C("boiler.eta.unavailable",i):r===0?C("boiler.eta.already_reached",i):ph(r)}let ri=class extends E{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs"}_renderAuraLegend(){var h,g;const e=this.data,t=(e==null?void 0:e.sourceSegments)??[],i=(e==null?void 0:e.activity)??null,n=(i==null?void 0:i.fillLevelPct)??null,r=(i==null?void 0:i.auraMaxTempC)??((h=this.config)==null?void 0:h.auraMaxTempC)??null,a=((g=e==null?void 0:e.status)==null?void 0:g.temperatureTop)??null,s={};for(const m of t)m.key&&(s[m.key]=(s[m.key]??0)+(m.energyKwh??0)/1e3);const l=n!=null?`${Math.round(n*100)} %`:null,d=l!=null?c`<div class="aura-percent">Náplň aury: <strong>${l}</strong>${a!=null&&r!=null?` (${Fe(a)} / ${Fe(r)} max)`:""}</div>`:P,p=c`
      <div class="aura-legend">
        ${[{key:"fve",color:"#f5b800"},{key:"overflow",color:"#4ade80"},{key:"grid",color:"#7c8694"}].map(({key:m,color:b})=>{const v=s[m]??0;return c`
            <div class="aura-legend-item">
              <span class="dot" style="background:${b}"></span>
              ${Ze(m,this.lang)} ${v.toFixed(1)}
            </div>
          `})}
      </div>
    `;return c`${d}${p}`}_renderSourceChip(){var l;const e=((l=this.data)==null?void 0:l.activity)??null,t=(e==null?void 0:e.source)??null;if(!t)return P;const i={grid:"SÍŤ",fve:"FVE",overflow:"PŘETOK",discharge:"VÝBOJ"},n={grid:"⚡",fve:"☀️",overflow:"🌊",discharge:"🔋"},r=i[t]??t.toUpperCase(),a=n[t]??"⚡",s=(e==null?void 0:e.powerKw)??null;return c`
      <div class="source-chip">
        <span>${a}</span>${r}<span>→</span>${s!=null?`${s.toFixed(1)} kW`:""}
      </div>
    `}_renderRecommendation(){var p,h,g;const e=this.data,i=((p=((e==null?void 0:e.planSlots)??[])[0])==null?void 0:p.recommendedSource)??null,n=((h=e==null?void 0:e.activity)==null?void 0:h.source)??null,r=((g=e==null?void 0:e.explanation)==null?void 0:g.reasonCodes)??[];if(!i)return P;const s={grid:"⚡ Síť",fve:"☀️ FVE",overflow:"🌊 Přetok",discharge:"🔋 Výboj"}[i]??i,l={no_fve:"FVE žádné",fve_available:"FVE dostupné",cheap_grid:"levná síť",overflow_available:"přetok dostupný"},d=r.length>0?r.map(m=>l[m]??m).join(", "):null,u=i===n;return c`
      <div class="source-secondary">
        Doporučeno: <span style="color:#e6edf3;font-weight:600">${s}${d?` (${d})`:""}</span>
        ${u?c` · stejně jako aktivní`:""}
      </div>
    `}render(){try{return this._renderShell()}catch{return c`
        <div class="shell" data-testid="boiler-v2-shell">
          <div class="stale-warning" data-testid="boiler-stale-warning" role="alert">
            ${C("boiler.aria.stale",this.lang)}
          </div>
        </div>
      `}}_renderShell(){var u,p,h;const e=this.data,t=e?Ph(e):!1,i=(e==null?void 0:e.activity)??null,n=(e==null?void 0:e.status)??null,r=this.config,a=e&&r?Th(e,r,this.lang):null,s=(i==null?void 0:i.source)??null,l=(u=i==null?void 0:i.state)!=null&&u.startsWith("charging_")&&i.temperatureTrendCPerMin!=null?`↑ NABÍJÍ ${i.temperatureTrendCPerMin>=0?"+":""}${i.temperatureTrendCPerMin.toFixed(1)}°C/min`:(p=i==null?void 0:i.state)!=null&&p.startsWith("charging_")?"↑ NABÍJÍ":null,d=((h=e==null?void 0:e.status)==null?void 0:h.lowerZoneTempC)??null;return c`
      <div class="shell" data-testid="boiler-v2-shell">
        ${t?c`
              <div class="stale-warning" data-testid="boiler-stale-warning" role="alert">
                ${C("boiler.aria.stale",this.lang)}
              </div>
            `:P}

        <div class="svg-wrapper">
          <oig-boiler-v2-svg
            .fillLevelPct="${(i==null?void 0:i.fillLevelPct)??null}"
            .sourceSegments="${(e==null?void 0:e.sourceSegments)??[]}"
            .topTempC="${(n==null?void 0:n.temperatureTop)??null}"
            .bottomTempC="${(n==null?void 0:n.temperatureBottom)??null}"
            .lowerZoneTempC="${d}"
            .volumeL="${(r==null?void 0:r.volumeL)??null}"
            .etaText="${a}"
            .sourceKey="${s}"
            .chargingLabel="${l}"
            .stale="${t}"
            .lang="${this.lang}"
          ></oig-boiler-v2-svg>
        </div>
        <span aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">${(n==null?void 0:n.temperatureTop)??""}</span>

        ${this._renderAuraLegend()}
        ${a!=null?c`<div class="eta-row" style="font-size:11px;color:#9aa6b2;text-align:center">${C("boiler.eta.label",this.lang)}: <span aria-live="polite" style="font-weight:600;color:#e6edf3">${a}</span></div>`:""}
        ${this._renderSourceChip()}
        ${this._renderRecommendation()}

        <div class="advanced-slot" data-testid="boiler-advanced-slot">
          <slot name="advanced"></slot>
        </div>
      </div>
    `}};ri.styles=D`
    :host {
      display: block;
      font-family: ${mr(o.fontFamily)};
    }

    .shell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px;
      max-width: 380px;
      margin: 0 auto;
    }

    .stale-warning {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      background: ${mr(o.warning)};
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      width: 100%;
      box-sizing: border-box;
    }

    .svg-wrapper {
      width: 100%;
    }

    .aura-percent {
      font-size: 11px;
      color: #9aa6b2;
      margin-top: 4px;
      font-weight: 500;
      text-align: center;
    }

    .aura-percent strong {
      color: #e6edf3;
      font-weight: 700;
    }

    .aura-legend {
      display: flex;
      gap: 12px;
      margin-top: 8px;
      font-size: 10px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .aura-legend-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #9aa6b2;
    }

    .aura-legend-item .dot {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    .source-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 999px;
      background: rgba(124,134,148,.18);
      border: 1.5px solid rgba(124,134,148,.5);
      color: ${mr(o.textPrimary)};
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 8px;
    }

    .source-secondary {
      font-size: 11px;
      color: #9aa6b2;
      text-align: center;
    }

    .advanced-slot {
      width: 100%;
    }
  `;Un([f({type:Object})],ri.prototype,"data",2);Un([f({type:Object})],ri.prototype,"config",2);Un([f({type:String})],ri.prototype,"lang",2);ri=Un([O("oig-boiler-v2-shell")],ri);var Mh=Object.defineProperty,Dh=Object.getOwnPropertyDescriptor,ui=(e,t,i,n)=>{for(var r=n>1?void 0:n?Dh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Mh(t,i,r),r};let dt=class extends E{constructor(){super(...arguments),this.values=[],this.color="#4CAF50",this.sparkWidth=100,this.sparkHeight=30,this.label=""}render(){try{return this._renderSparkline()}catch{return c`<svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      ></svg>`}}_renderSparkline(){const e=Array.isArray(this.values)?this.values:[],t=e.filter(p=>typeof p=="number"&&isFinite(p));if(t.length<2)return c`<svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        viewBox="0 0 ${this.sparkWidth} ${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      ></svg>`;const i=Math.min(...t),r=Math.max(...t)-i||1,a=2,s=this.sparkHeight-a*2,l=this.sparkWidth,d=e.length,u=e.map((p,h)=>{if(typeof p!="number"||!isFinite(p))return null;const g=d>1?h/(d-1)*l:l/2,m=a+s-(p-i)/r*s;return`${g.toFixed(2)},${m.toFixed(2)}`}).filter(p=>p!==null).join(" ");return c`
      <svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        viewBox="0 0 ${this.sparkWidth} ${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      >
        ${U`<polyline
          points="${u}"
          fill="none"
          stroke="${this.color}"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />`}
      </svg>
    `}};dt.styles=D`
    :host {
      display: inline-block;
    }
    svg {
      display: block;
      overflow: visible;
    }
  `;ui([f({type:Array})],dt.prototype,"values",2);ui([f({type:String})],dt.prototype,"color",2);ui([f({type:Number})],dt.prototype,"sparkWidth",2);ui([f({type:Number})],dt.prototype,"sparkHeight",2);ui([f({type:String})],dt.prototype,"label",2);dt=ui([O("oig-boiler-sparkline")],dt);var Eh=Object.defineProperty,Oh=Object.getOwnPropertyDescriptor,ln=(e,t,i,n)=>{for(var r=n>1?void 0:n?Oh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Eh(t,i,r),r};const De=G;function Mi(e){return e?Rr[e]??"#9E9E9E":"#9E9E9E"}let Et=class extends E{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs",this.panelType="source"}render(){try{return this.panelType==="source"?this._renderSourcePanel():this._renderComfortPanel()}catch{return c`
        <div class="panel">
          <div class="empty-panel">—</div>
        </div>
      `}}_renderSourcePanel(){var x,y,S;const e=this.data,t=(e==null?void 0:e.activity)??null,i=(e==null?void 0:e.status)??null,n=(e==null?void 0:e.planSlots)??[],r=(e==null?void 0:e.sourceSegments)??[],a=((x=e==null?void 0:e.sparkline)==null?void 0:x.power)??[],s=(t==null?void 0:t.source)??(i==null?void 0:i.selectedSource)??null,l=((y=n[0])==null?void 0:y.recommendedSource)??null,d=((S=i==null?void 0:i.energyTracking)==null?void 0:S.totalKwh)??r.reduce((H,N)=>H+(N.energyKwh??0),0)/1e3,u={};for(const H of r)H.key&&(u[H.key]=(u[H.key]??0)+(H.energyKwh??0)/1e3);const p=(e==null?void 0:e.costTodayCzk)??null,h=(e==null?void 0:e.savingsTodayCzk)??null,g=(e==null?void 0:e.pvShare7dPct)??null,m=u.fve??null,b=u.overflow??null,v=u.grid??null,w=a.length>0;return c`
      <div class="panel" data-testid="boiler-source-panel">
        <div class="panel-title">Zdroj &amp; náklady</div>

        <div class="stat-row ${w?"":"no-spark"}">
          <span class="stat-label">Cena dnes</span>
          ${w?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#f5b800" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
          <span class="stat-value">${p!=null?Ar(p):"—"}<span class="stat-unit">Kč</span></span>
        </div>

        <div class="stat-row ${w?"":"no-spark"}">
          <span class="stat-label">Energie dnes</span>
          ${w?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#60a5fa" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
          <span class="stat-value">${d>0?Yt(d):"—"}</span>
        </div>

        ${m!=null?c`
          <div class="stat-row sub no-spark">
            <span class="stat-label">Z FVE</span>
            <span class="stat-value" style="color:${Mi("fve")}">${Yt(m)}</span>
          </div>
        `:P}

        ${b!=null?c`
          <div class="stat-row sub no-spark">
            <span class="stat-label">Z přetoku</span>
            <span class="stat-value" style="color:${Mi("overflow")}">${Yt(b)}</span>
          </div>
        `:P}

        ${v!=null?c`
          <div class="stat-row sub no-spark">
            <span class="stat-label">Ze sítě</span>
            <span class="stat-value" style="color:${Mi("grid")}">${Yt(v)}</span>
          </div>
        `:P}

        <div class="stat-row no-spark">
          <span class="stat-label">Ušetřeno vs. neoptim.</span>
          <span class="stat-value">${h!=null?`~${Ar(h)}`:"—"}<span class="stat-unit">${h!=null?"Kč":""}</span></span>
        </div>

        <div class="stat-row no-spark">
          <span class="stat-label">FVE podíl (7d)</span>
          <span class="stat-value">${g!=null?`${Math.round(g)} %`:"—"}</span>
        </div>

        <div class="stat-row no-spark">
          <span class="stat-label">Aktivní zdroj</span>
          <span class="stat-value source-value">
            ${s?c`<span class="source-dot" style="background:${Mi(s)}"></span>${Ze(s,this.lang)}`:"—"}
          </span>
        </div>

        <div class="stat-row no-spark">
          <span class="stat-label">Doporučený zdroj</span>
          <span class="stat-value source-value">
            ${l?c`<span class="source-dot" style="background:${Mi(l)}"></span>${Ze(l,this.lang)}`:"—"}
          </span>
        </div>
      </div>
    `}_renderComfortPanel(){var y;const e=this.data,t=(e==null?void 0:e.status)??null,i=(e==null?void 0:e.explanation)??null,n=this.config,r=(e==null?void 0:e.activity)??null,a=((y=e==null?void 0:e.sparkline)==null?void 0:y.temperature)??[],s=t==null?void 0:t.comfortSatisfied,l=s===!0?"ok":s===!1?"gap":"unknown",d=s===!0?C("boiler.status.comfort_satisfied",this.lang):s===!1?C("boiler.status.comfort_unsatisfied",this.lang):C("boiler.status.comfort_unknown",this.lang),u=(i==null?void 0:i.unsatisfiedComfortGapC)??null,p=(n==null?void 0:n.targetTempC)??null,h=u!=null&&p!=null?`Mezera do cíle: ${u.toFixed(1)} °C · cíl ${p.toFixed(0)} °C`:p!=null?`Cíl: ${p.toFixed(0)} °C`:"",g=(t==null?void 0:t.temperatureTop)??null,m=(t==null?void 0:t.temperatureBottom)??null,b=g!=null&&m!=null?g-m:null,v=(r==null?void 0:r.temperatureTrendCPerMin)??null,w=v!=null?`${v>=0?"+":""}${v.toFixed(1)} °C/min`:null,x=a.length>0;return c`
      <div class="panel" data-testid="boiler-comfort-panel">
        <div class="panel-title">Komfort</div>

        <div class="komfort-banner ${l}">
          <div class="komfort-circle ${l}">${s===!0?"✓":s===!1?"!":"?"}</div>
          <div>
            <div class="komfort-text-main ${l}">${d}</div>
            ${h?c`<div class="komfort-text-sub">${h}</div>`:P}
          </div>
        </div>

        ${n!=null&&n.deadlineTime&&n.deadlineTime!=="--:--"?c`
            <div class="stat-row no-spark">
              <span class="stat-label">${C("boiler.config.deadline",this.lang)}</span>
              <span class="stat-value">${n.deadlineTime}</span>
            </div>
          `:P}

        <div class="stat-row ${x?"":"no-spark"}">
          <span class="stat-label">${C("boiler.status.temp_top",this.lang)}</span>
          ${x?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#ff7a45" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
          <span class="stat-value">${Fe(g)}</span>
        </div>

        ${m!=null?c`
            <div class="stat-row ${x?"":"no-spark"}">
              <span class="stat-label">${C("boiler.status.temp_bottom",this.lang)}</span>
              ${x?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#6688a8" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
              <span class="stat-value">${Fe(m)}</span>
            </div>
          `:c`
            <div class="stat-row no-spark">
              <span class="stat-label">${C("boiler.status.temp_bottom",this.lang)}</span>
              <span class="stat-value">—</span>
            </div>
          `}

        ${b!=null?c`
            <div class="stat-row ${x?"":"no-spark"}">
              <span class="stat-label">Stratifikace ΔT</span>
              ${x?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#a78bfa" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
              <span class="stat-value">${b.toFixed(1)}<span class="stat-unit">°C</span></span>
            </div>
          `:P}

        ${w!=null?c`
            <div class="stat-row no-spark">
              <span class="stat-label">Trend</span>
              <span class="stat-value">${w}</span>
            </div>
          `:P}
      </div>
    `}};Et.styles=D`
    :host {
      display: block;
      font-family: ${De(o.fontFamily)};
    }

    .panel {
      background: ${De(o.cardBg)};
      border: 1px solid ${De(o.divider)};
      border-radius: 12px;
      padding: 18px;
      box-sizing: border-box;
    }

    .panel-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${De(o.textSecondary)};
      margin: 0 0 14px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${De(o.textSecondary)};
      margin: 18px 0 0;
      padding-bottom: 6px;
    }

    /* stat-row: label | sparkline | value */
    .stat-row {
      display: grid;
      grid-template-columns: 1fr 60px auto;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid ${De(o.divider)};
    }

    .stat-row:last-child {
      border-bottom: none;
    }

    .stat-row.no-spark {
      grid-template-columns: 1fr auto;
    }

    .stat-row.sub {
      padding: 5px 0;
    }

    .stat-row.sub .stat-label,
    .stat-row.sub .stat-value {
      font-size: 11px;
      color: ${De(o.textSecondary)};
    }

    .stat-label {
      color: ${De(o.textSecondary)};
      font-size: 12px;
    }

    .stat-value {
      font-size: 15px;
      font-weight: 600;
      color: ${De(o.textPrimary)};
      text-align: right;
      white-space: nowrap;
    }

    .stat-value.lg {
      font-size: 22px;
    }

    .stat-unit {
      color: ${De(o.textSecondary)};
      font-size: 12px;
      margin-left: 3px;
      font-weight: 400;
    }

    .stat-spark {
      width: 60px;
      height: 18px;
      opacity: 0.85;
    }

    /* Komfort banner */
    .komfort-banner {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px;
      border-radius: 10px;
      margin-bottom: 14px;
    }

    .komfort-banner.ok {
      background: rgba(76, 175, 80, 0.08);
      border: 1px solid rgba(76, 175, 80, 0.25);
    }

    .komfort-banner.gap {
      background: rgba(255, 152, 0, 0.08);
      border: 1px solid rgba(255, 152, 0, 0.25);
    }

    .komfort-banner.unknown {
      background: rgba(158, 158, 158, 0.08);
      border: 1px solid rgba(158, 158, 158, 0.25);
    }

    .komfort-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .komfort-circle.ok {
      background: #4CAF50;
      color: #fff;
    }

    .komfort-circle.gap {
      background: #FF9800;
      color: #fff;
    }

    .komfort-circle.unknown {
      background: #9E9E9E;
      color: #fff;
    }

    .komfort-text-main {
      font-size: 15px;
      font-weight: 700;
    }

    .komfort-text-main.ok { color: #4CAF50; }
    .komfort-text-main.gap { color: #FF9800; }
    .komfort-text-main.unknown { color: #9E9E9E; }

    .komfort-text-sub {
      font-size: 11px;
      color: ${De(o.textSecondary)};
      margin-top: 2px;
    }

    /* Source dot */
    .source-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-right: 4px;
    }

    .source-value {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0;
    }

    .empty-panel {
      color: ${De(o.textSecondary)};
      font-size: 12px;
      font-style: italic;
      padding: 4px 0;
    }
  `;ln([f({type:Object})],Et.prototype,"data",2);ln([f({type:Object})],Et.prototype,"config",2);ln([f({type:String})],Et.prototype,"lang",2);ln([f({type:String})],Et.prototype,"panelType",2);Et=ln([O("oig-boiler-metric-panel")],Et);var zh=Object.defineProperty,Ah=Object.getOwnPropertyDescriptor,pi=(e,t,i,n)=>{for(var r=n>1?void 0:n?Ah(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&zh(t,i,r),r};const vr=G,zi=1e3,qt=200,Ga=20,yr=80,$t=3,Ke=100,St=1440;function Lh(e){return e??Date.now()}function Ih(e,t){var a,s;const i=new Intl.DateTimeFormat("en-US",{timeZone:t,hour:"numeric",minute:"2-digit",hour12:!1}).formatToParts(new Date(e)),n=parseInt(((a=i.find(l=>l.type==="hour"))==null?void 0:a.value)??"0",10)%24,r=parseInt(((s=i.find(l=>l.type==="minute"))==null?void 0:s.value)??"0",10);return n*60+r}function Fh(e,t){const i=new Intl.DateTimeFormat("en-US",{timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}).formatToParts(new Date(e)),n=x=>{var y;return((y=i.find(S=>S.type===x))==null?void 0:y.value)??"00"},r=n("year"),a=n("month"),s=n("day"),l=parseInt(n("hour"),10)%24,d=n("minute"),u=n("second"),p=String(l).padStart(2,"0"),h=Date.UTC(parseInt(r),parseInt(a)-1,parseInt(s),l,parseInt(d),parseInt(u)),g=Math.round((h-e)/6e4),m=g>=0?"+":"-",b=Math.abs(g),v=String(Math.floor(b/60)).padStart(2,"0"),w=String(b%60).padStart(2,"0");return`${r}-${a}-${s}T${p}:${d}:${u}${m}${v}:${w}`}function Ye(e){return e/St*zi}function Ht(e){return String(parseFloat(e.toFixed(3)))}function xr(e){const t=Math.max(Ga,Math.min(yr,e));return(yr-t)/(yr-Ga)*qt}function Bh(e,t){const i=Ih(e,t);return e-i*6e4}function Nh(e){if(e.length<=1)return e;const t=[];let i={...e[0]};for(let n=1;n<e.length;n++){const r=e[n],a=i.recommendedSource===r.recommendedSource,s=(i.heatingKwh!=null?i.heatingKwh>0:!1)==(r.heatingKwh!=null?r.heatingKwh>0:!1),l=i.end===r.start;a&&s&&l?i={...i,end:r.end}:(t.push(i),i={...r})}return t.push(i),t}function Za(e,t,i){let n=null,r=-1/0;for(const a of t){const s=Date.parse(a.start);if(!isFinite(s))continue;const l=a.end!==null?Date.parse(a.end):i;isFinite(l)&&s<=e&&e<=l&&s>r&&(r=s,n=a)}return n}function Qa(e,t){const i=Date.parse(e.start),n=e.end!==null?Date.parse(e.end):t;if(!isFinite(i)||!isFinite(n))return null;const r=(n-i)/36e5;return r<=0||!isFinite(r)||!isFinite(e.energyKwh)||e.energyKwh<0?null:e.energyKwh/r}function Rh(e,t,i,n,r){const a=[C("boiler.aria.plan_timeline",r)];a.push(`NOW: ${e}`),t&&a.push(`${C("boiler.config.deadline",r)}: ${t}`),i!=null&&a.push(`${C("boiler.config.goal_temp",r)}: ${i}°C`);const s=[...new Set(n.filter(Boolean))];return s.length>0&&a.push(s.map(l=>Ze(l,r)).join(", ")),a.join(". ")}let ut=class extends E{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs",this.nowMs=null,this.timeZone=null}render(){try{return this._renderTimeline()}catch{return c`
        <div class="timeline-section">
          <div class="empty-timeline" data-testid="boiler-timeline">${C("boiler.timeline.empty",this.lang)}</div>
        </div>
      `}}_resolveTimeZone(){if(this.timeZone)return this.timeZone;try{return Intl.DateTimeFormat().resolvedOptions().timeZone}catch{return"Europe/Prague"}}_renderTimeline(){var Pe;const e=Lh(this.nowMs??void 0),t=this._resolveTimeZone();let i;try{i=Bh(e,t)}catch{i=e-e%864e5}const n=(e-i)/6e4,r=Ye(n);let a="";try{a=Fh(e,t)}catch{a=new Date(e).toISOString()}const s=this.config,l=s!=null&&s.deadlineTime&&s.deadlineTime!=="--:--"?s.deadlineTime:null;let d=null;if(l)try{const[F,ae]=l.split(":"),be=parseInt(F,10)*60+parseInt(ae,10);d=Ye(be)}catch{d=null}const u=(s==null?void 0:s.targetTempC)!=null&&isFinite(s.targetTempC)?s.targetTempC:60,p=xr(u),h=this.data,g=Array.isArray(h==null?void 0:h.planSlots)?h.planSlots:[],m=Array.isArray(h==null?void 0:h.timeline)?h.timeline:[],b=Array.isArray(h==null?void 0:h.sourceSegments)?h.sourceSegments:[],v=g.length>0&&g.every(F=>(F.heatingKwh??0)===0&&(F.pvKwh??0)===0&&(F.gridKwh??0)===0&&(F.altKwh??0)===0),w=this._buildPlanBands(g,i),x=this._buildTempPointsFromSlots(g,i),y=this._buildTempPointsFromTimeline(m,i),S=x.length>0?x:y,H=this._buildPowerBarsFromSlots(g,i),N=this._buildPowerBars(m,b,i,e),K=w.map(F=>F.source);let $="";try{$=Rh(a,l,u,K,this.lang)}catch{$=C("boiler.aria.plan_timeline",this.lang)}const A=S.length>=2?S.map(F=>`${F.x.toFixed(2)},${F.y.toFixed(2)}`).join(" "):null,B=g.reduce((F,ae)=>F+(ae.gridKwh??0),0),k=g.reduce((F,ae)=>F+(ae.pvKwh??0)+(ae.altKwh??0),0),Z=g.reduce((F,ae)=>F+(ae.estimatedCostCzk??0),0),R=B+k,ne=((Pe=h==null?void 0:h.status)==null?void 0:Pe.degradedFlags)??[],Le=ne.includes("price_degraded"),bi=ne.includes("forecast_degraded"),vi=["00","03","06","09","12","15","18","21","24"];return c`
      <div class="timeline-section">
        <div class="timeline-header">
          <h3>📅 24h plán: teplota, výkon &amp; zdroje</h3>
          ${g.length>0?c`
            <div class="timeline-summary">
              Dnes: <strong>${B.toFixed(1)} kWh</strong> ze sítě
              · <strong style="color:#f5b800">${k.toFixed(1)} kWh</strong> z FVE/přetoku
              ${Z>0?c` · <strong>~${Z.toFixed(2)} Kč</strong>`:""}
              ${R>0?c` · spotřeba <strong>~${R.toFixed(1)} kWh</strong>`:""}
            </div>
          `:""}
        </div>

        ${v?c`
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
              viewBox="0 0 ${zi} ${qt}"
              role="img"
              aria-label="${$}"
              data-testid="boiler-timeline"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              ${U`<rect x="0" y="0" width="${zi}" height="${qt}" fill="transparent" />`}

              ${w.map(F=>{const ae=F.source?Rr[F.source]??"#9E9E9E":"#9E9E9E",be=F.x2-F.x1;return U`<rect
                  class="plan-band"
                  data-source="${F.source??"unknown"}"
                  x="${F.x1.toFixed(2)}"
                  y="0"
                  width="${be.toFixed(2)}"
                  height="${qt}"
                  fill="${ae}"
                />`})}

              ${U`<line x1="0" y1="${Ke}" x2="${zi}" y2="${Ke}" stroke="rgba(255,255,255,.08)" stroke-width="1"/>`}

              ${U`<line
                class="goal-line"
                x1="0" y1="${p.toFixed(2)}"
                x2="${zi}" y2="${p.toFixed(2)}"
              />`}
              ${U`<text x="4" y="${(p-3).toFixed(2)}" font-size="8" fill="#4ade80">CÍL ${u}°C</text>`}

              ${d!=null&&l!=null?U`
                <line class="deadline-marker"
                  data-testid="boiler-deadline-marker"
                  data-deadline-time="${l}"
                  data-deadline-x="${Ht(d)}"
                  x1="${Ht(d)}" y1="0"
                  x2="${Ht(d)}" y2="${qt}"
                />
                <text x="${(d+3).toFixed(2)}" y="12" font-size="8" fill="#E65100">${l}</text>
              `:""}

              ${H.map(F=>{if(F.isCharge){const ae=Ke-F.barH;return U`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    x="${(F.x-2).toFixed(2)}" y="${ae.toFixed(2)}" width="4" height="${F.barH.toFixed(2)}"/>`}else return U`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    x="${(F.x-2).toFixed(2)}" y="${Ke}" width="4" height="${F.barH.toFixed(2)}"/>`})}

              ${N.map(F=>{if(F.isCharge){const ae=Ke-F.barH;return U`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    data-estimated-power="${F.isEstimated?"true":"false"}"
                    x="${(F.x-2).toFixed(2)}" y="${ae.toFixed(2)}" width="4" height="${F.barH.toFixed(2)}"/>`}else return U`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    data-estimated-power="${F.isEstimated?"true":"false"}"
                    x="${(F.x-2).toFixed(2)}" y="${Ke}" width="4" height="${F.barH.toFixed(2)}"/>`})}

              ${m.map(F=>{let ae;try{ae=Date.parse(F.timestamp)}catch{return""}if(!isFinite(ae))return"";const be=(ae-i)/6e4;if(be<0||be>St||F.powerKw!==null)return"";const yi=Za(ae,b,e),Ne=yi?Qa(yi,e):null;if(Ne!==null&&Ne>0)return"";const We=Ye(be);return U`<rect
                  class="placeholder-bar"
                  data-testid="boiler-power-placeholder"
                  data-estimated-power="true"
                  x="${(We-2).toFixed(2)}" y="99" width="4" height="2"
                />`})}

              ${A!=null?U`<polyline class="temp-line" points="${A}" />`:""}

              ${U`<line
                class="now-marker"
                data-testid="boiler-now-marker"
                data-now-time="${a}"
                data-now-x="${Ht(r)}"
                x1="${Ht(r)}" y1="0"
                x2="${Ht(r)}" y2="${qt}"
              />`}
              ${U`<text x="${(r+3).toFixed(2)}" y="12" font-size="8" fill="#60a5fa">TEĎ</text>`}
            </svg>
          </div>

          <div class="timeline-axis">
            ${vi.map(F=>c`<span>${F}</span>`)}
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
            ${Le?c`<span class="degraded-chip">⚠ Ceny: stará data</span>`:""}
            ${bi?c`<span class="degraded-chip">⚠ FVE predikce: stará data</span>`:""}
          </div>
        </div>
      </div>
    `}_buildTempPointsFromTimeline(e,t){const i=[],n=t+St*6e4;for(const r of e)try{if(r.topTempC==null||!isFinite(r.topTempC))continue;const a=Date.parse(r.timestamp);if(!isFinite(a)||a<t||a>n)continue;const s=(a-t)/6e4;i.push({x:Ye(s),y:xr(r.topTempC)})}catch{continue}return i}_buildTempPointsFromSlots(e,t){const i=[],n=t+St*6e4;for(const r of e)try{const a=r.expectedTempTopC;if(a==null||!isFinite(a))continue;const s=Date.parse(r.start);if(!isFinite(s)||s<t||s>n)continue;const l=(s-t)/6e4;i.push({x:Ye(l),y:xr(a)})}catch{continue}return i}_buildPowerBarsFromSlots(e,t){const i=[],n=t+St*6e4;for(let r=0;r<e.length;r++){const a=e[r];try{const s=Date.parse(a.start);if(!isFinite(s)||s<t||s>n)continue;const l=(s-t)/6e4,d=Ye(l),u=(a.pvKwh??0)+(a.gridKwh??0)+(a.altKwh??0);if(u<=0)continue;const p=u*4,g=Math.min(p,$t)/$t*Ke;i.push({x:d,barH:g,isCharge:!0,isEstimated:!1})}catch{continue}}return i}_buildPlanBands(e,t){if(!e.length)return[];const i=[],n=t+St*6e4,r=[];for(const s of e)try{const l=Date.parse(s.start),d=Date.parse(s.end);if(!isFinite(l)||!isFinite(d)||d<=t||l>=n)continue;const u=Math.max(l,t),p=Math.min(d,n);if(p<=u)continue;r.push({...s,start:new Date(u).toISOString(),end:new Date(p).toISOString()})}catch{continue}const a=Nh(r);for(const s of a)try{const l=Date.parse(s.start),d=Date.parse(s.end);if(!isFinite(l)||!isFinite(d))continue;const u=Ye((l-t)/6e4),p=Ye((d-t)/6e4);if(p<=u)continue;i.push({x1:u,x2:p,source:s.recommendedSource,heating:(s.heatingKwh??0)>0})}catch{continue}return i}_buildPowerBars(e,t,i,n){const r=[],a=i+St*6e4;for(const s of e)try{const l=Date.parse(s.timestamp);if(!isFinite(l)||l<i||l>a)continue;const d=(l-i)/6e4,u=Ye(d);if(s.powerKw!==null&&isFinite(s.powerKw)){const p=Math.max(-$t,Math.min($t,s.powerKw));if(Math.abs(p)<.001)continue;const h=Math.abs(p)/$t*Ke;r.push({x:u,barH:h,isCharge:p>0,isEstimated:!1})}else{const p=Za(l,t,n);if(p!==null){const h=Qa(p,n);if(h!==null&&h>0){const g=p.key==="discharge",b=Math.min(h,$t)/$t*Ke;r.push({x:u,barH:b,isCharge:!g,isEstimated:!0})}}}}catch{continue}return r}};ut.styles=D`
    :host {
      display: block;
      font-family: ${vr(o.fontFamily)};
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
      color: ${vr(o.textPrimary)};
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
      color: ${vr(o.textSecondary)};
      font-style: italic;
    }

    @media (max-width: 599px) {
      :host { font-size: 12px; }
    }
  `;pi([f({type:Object})],ut.prototype,"data",2);pi([f({type:Object})],ut.prototype,"config",2);pi([f({type:String})],ut.prototype,"lang",2);pi([f({type:Number})],ut.prototype,"nowMs",2);pi([f({type:String})],ut.prototype,"timeZone",2);ut=pi([O("oig-boiler-timeline-chart")],ut);var jh=Object.defineProperty,Hh=Object.getOwnPropertyDescriptor,ve=(e,t,i,n)=>{for(var r=n>1?void 0:n?Hh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&jh(t,i,r),r};const _t=G,Gn=D`
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
`;let ai=class extends E{constructor(){super(...arguments),this.value="home_1",this.disabled=!1,this.buttonStates={home_1:"idle",home_2:"idle",home_3:"idle",home_ups:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("mode-change",{detail:{mode:e},bubbles:!0}))}render(){return c`
      <div class="selector-label">
        Re\u017Eim st\u0159\u00EDda\u010De
      </div>
      <div class="mode-buttons">
        ${["home_1","home_2","home_3","home_ups"].map(t=>{const i=this.buttonStates[t],n=this.disabled||i==="pending"||i==="processing"||i==="disabled-by-service";return c`
            <button
              class="mode-btn ${i}"
              ?disabled=${n}
              @click=${()=>this.onModeClick(t)}
            >
              ${us[t]}
              ${i==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};ai.styles=[Gn];ve([f({type:String})],ai.prototype,"value",2);ve([f({type:Boolean})],ai.prototype,"disabled",2);ve([f({type:Object})],ai.prototype,"buttonStates",2);ai=ve([O("oig-box-mode-selector")],ai);let pt=class extends E{constructor(){super(...arguments),this.value="off",this.limit=0,this.disabled=!1,this.pendingTarget=null,this.buttonStates={off:"idle",on:"idle",limited:"idle"}}onDeliveryClick(e){const t=this.buttonStates[e];this.disabled||t==="pending"||t==="processing"||t==="disabled-by-service"||t==="active"&&e!=="limited"||this.dispatchEvent(new CustomEvent("delivery-change",{detail:{value:e,limit:e==="limited"?this.limit:null},bubbles:!0}))}render(){const e=[{value:"off",label:Oi.off},{value:"on",label:Oi.on},{value:"limited",label:Oi.limited}],i=this.pendingTarget!==null&&this.pendingTarget!==this.value?c`<span class="status-text transitioning">\u23F3\u00A0${Oi[this.pendingTarget]}</span>`:null;return c`
      <div class="selector-label">
        Dod\u00E1vka do s\u00EDt\u011B ${i}
      </div>
      <div class="mode-buttons">
        ${e.map(n=>{const r=this.buttonStates[n.value],a=n.value===this.value,s=n.value===this.pendingTarget&&!a,l=this.disabled||r==="pending"||r==="processing"||r==="disabled-by-service",d=a&&r==="disabled-by-service"?"active disabled-by-service":s?`${r} pending-target`:r;return c`
            <button
              class="mode-btn ${d}"
              ?disabled=${l}
              @click=${()=>this.onDeliveryClick(n.value)}
            >
              ${n.label}
              ${r==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${r==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};pt.styles=[Gn,D`
      .mode-btn.pending-target {
        border-color: #ffc107;
        color: #ffc107;
        background: rgba(255, 193, 7, 0.08);
      }
    `];ve([f({type:String})],pt.prototype,"value",2);ve([f({type:Number})],pt.prototype,"limit",2);ve([f({type:Boolean})],pt.prototype,"disabled",2);ve([f({type:String})],pt.prototype,"pendingTarget",2);ve([f({type:Object})],pt.prototype,"buttonStates",2);pt=ve([O("oig-grid-delivery-selector")],pt);let si=class extends E{constructor(){super(...arguments),this.value="cbb",this.disabled=!1,this.buttonStates={cbb:"idle",manual:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("boiler-mode-change",{detail:{mode:e},bubbles:!0}))}render(){return c`
      <div class="selector-label">
        Re\u017Eim bojleru
      </div>
      <div class="mode-buttons">
        ${["cbb","manual"].map(t=>{const i=this.buttonStates[t],n=this.disabled||i==="pending"||i==="processing"||i==="disabled-by-service";return c`
            <button
              class="mode-btn ${i}"
              ?disabled=${n}
              @click=${()=>this.onModeClick(t)}
            >
              ${hs[t]} ${ps[t]}
              ${i==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};si.styles=[Gn];ve([f({type:String})],si.prototype,"value",2);ve([f({type:Boolean})],si.prototype,"disabled",2);ve([f({type:Object})],si.prototype,"buttonStates",2);si=ve([O("oig-boiler-mode-selector")],si);let ht=class extends E{constructor(){super(...arguments),this.homeGridV=!1,this.homeGridVi=!1,this.flexibilita=!1,this.available=!1,this.disabled=!1}getButtonClass(e){return e&&this.disabled?"active disabled-by-service":e?"active":this.disabled?"disabled-by-service":"idle"}onToggleClick(e){this.disabled||this.dispatchEvent(new CustomEvent("supplementary-toggle",{detail:{key:e},bubbles:!0}))}render(){const e=this.getButtonClass(this.homeGridV),t=this.getButtonClass(this.homeGridVi),i=this.flexibilita?c`<span class="flexibilita-badge">\u26A1 Flexibilita</span>`:"";return c`
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
    `}};ht.styles=[Gn,D`
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
    `];ve([f({type:Boolean})],ht.prototype,"homeGridV",2);ve([f({type:Boolean})],ht.prototype,"homeGridVi",2);ve([f({type:Boolean})],ht.prototype,"flexibilita",2);ve([f({type:Boolean})],ht.prototype,"available",2);ve([f({type:Boolean})],ht.prototype,"disabled",2);ht=ve([O("oig-supplementary-selector")],ht);function Vh(e){const t=!e.available||e.flexibilita;return e.available?{home_grid_v:e.home_grid_v,home_grid_vi:e.home_grid_vi,flexibilita:e.flexibilita,available:e.available,disabled:t}:{home_grid_v:!1,home_grid_vi:!1,flexibilita:e.flexibilita,available:!1,disabled:!0}}var Wh=Object.defineProperty,qh=Object.getOwnPropertyDescriptor,hi=(e,t,i,n)=>{for(var r=n>1?void 0:n?qh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Wh(t,i,r),r};const Me=G;let gt=class extends E{constructor(){super(...arguments),this.items=[],this.expanded=!1,this.shieldStatus="idle",this.queueCount=0,this._now=Date.now(),this.updateInterval=null}connectedCallback(){super.connectedCallback(),this.updateInterval=window.setInterval(()=>{this._now=Date.now()},1e3)}disconnectedCallback(){super.disconnectedCallback(),this.updateInterval!==null&&clearInterval(this.updateInterval)}toggleExpanded(){this.expanded=!this.expanded}removeItem(e,t){t.stopPropagation(),this.dispatchEvent(new CustomEvent("remove-item",{detail:{position:e},bubbles:!0}))}formatServiceName(e,t){return t==="supplementary_toggle"?"⚙️ Změna doplňkového režimu":fl[e]||e||"N/A"}stripCurrentSuffix(e){const i=e.indexOf("(nyní:");return i===-1?e.trim():e.slice(0,i).trim()}formatChanges(e){return!e||e.length===0?"N/A":e.map(t=>{const i=t.indexOf("→");if(i===-1)return t;const n=t.slice(0,i).trim(),r=t.slice(i+1).trim(),a=n.indexOf(":"),s=a===-1?n:n.slice(a+1),l=n.includes("prm2_app")?gs:ml,d=s.replaceAll("'","").trim(),u=this.stripCurrentSuffix(r).replaceAll("'","").trim(),p=l[d]||d,h=l[u]||u;return`${p} → ${h}`}).join(", ")}formatTimestamp(e){if(!e)return{time:"--",duration:"--"};try{const t=new Date(e);if(isNaN(t.getTime()))return{time:"--",duration:"--"};const i=new Date(this._now),n=Math.floor((i.getTime()-t.getTime())/1e3),r=String(t.getHours()).padStart(2,"0"),a=String(t.getMinutes()).padStart(2,"0");let s=`${r}:${a}`;if(t.toDateString()!==i.toDateString()){const d=t.getDate(),u=t.getMonth()+1;s=`${d}.${u}. ${s}`}let l;if(n<60)l=`${n}s`;else if(n<3600){const d=Math.floor(n/60),u=n%60;l=`${d}m ${u}s`}else{const d=Math.floor(n/3600),u=Math.floor(n%3600/60);l=`${d}h ${u}m`}return{time:s,duration:l}}catch{return{time:"--",duration:"--"}}}get activeCount(){return this.items.length}render(){this._now;const e=this.shieldStatus==="running"?"running":"idle",t=this.shieldStatus==="running"?"🔄 Zpracovává":"✓ Připraveno";return c`
      <div class="queue-header" @click=${this.toggleExpanded}>
        <div class="queue-title-area">
          <span class="queue-title">Shield fronta</span>
          ${this.activeCount>0?c`
            <span class="queue-count">(${this.activeCount} aktivn\u00EDch)</span>
          `:P}
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
                ${this.items.map((i,n)=>this.renderRow(i,n))}
              </tbody>
            </table>
          `}
        </div>
      `:P}
    `}renderRow(e,t){const i=e.status==="running",{time:n,duration:r}=this.formatTimestamp(e.createdAt);return c`
      <tr>
        <td class="${i?"status-running":"status-queued"}">
          ${i?"🔄 Zpracovává se":"⏳ Čeká"}
        </td>
        <td>${this.formatServiceName(e.service,e.type)}</td>
        <td class="hide-mobile" style="font-size: 11px;">${this.formatChanges(e.changes)}</td>
        <td class="queue-time">${n}</td>
        <td class="queue-time duration">${r}</td>
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
    `}};gt.styles=D`
    :host {
      display: block;
      background: ${Me(o.cardBg)};
      border-radius: 12px;
      box-shadow: ${Me(o.cardShadow)};
      overflow: hidden;
    }

    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: ${Me(o.bgSecondary)};
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
      color: ${Me(o.textPrimary)};
    }

    .queue-count {
      font-size: 12px;
      color: ${Me(o.textSecondary)};
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
      color: ${Me(o.accent)};
      transition: transform 0.2s;
    }

    .queue-toggle.expanded {
      transform: rotate(180deg);
    }

    .queue-content {
      padding: 0;
      border-top: 1px solid ${Me(o.divider)};
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
      color: ${Me(o.textSecondary)};
      border-bottom: 1px solid ${Me(o.divider)};
      background: ${Me(o.bgSecondary)};
    }

    .queue-table td {
      padding: 8px 12px;
      color: ${Me(o.textPrimary)};
      border-bottom: 1px solid ${Me(o.divider)};
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
      color: ${Me(o.textSecondary)};
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
  `;hi([f({type:Array})],gt.prototype,"items",2);hi([f({type:Boolean})],gt.prototype,"expanded",2);hi([f({type:String})],gt.prototype,"shieldStatus",2);hi([f({type:Number})],gt.prototype,"queueCount",2);hi([T()],gt.prototype,"_now",2);gt=hi([O("oig-shield-queue")],gt);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Kh={CHILD:2},Yh=e=>(...t)=>({_$litDirective$:e,values:t});class Uh{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,n){this._$Ct=t,this._$AM=i,this._$Ci=n}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Ir extends Uh{constructor(t){if(super(t),this.it=P,t.type!==Kh.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===P||t==null)return this._t=void 0,this.it=t;if(t===jo)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}}Ir.directiveName="unsafeHTML",Ir.resultType=1;const Gh=Yh(Ir);var Zh=Object.defineProperty,Qh=Object.getOwnPropertyDescriptor,cn=(e,t,i,n)=>{for(var r=n>1?void 0:n?Qh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Zh(t,i,r),r};const ye=G;let Ot=class extends E{constructor(){super(...arguments),this.open=!1,this.config={title:"",message:""},this.acknowledged=!1,this.limitValue=5e3,this.resolver=null,this.onOverlayClick=()=>{this.closeDialog({confirmed:!1})},this.onDialogClick=e=>{e.stopPropagation()},this.onKeyDown=e=>{e.key==="Escape"&&this.open&&this.closeDialog({confirmed:!1})},this.onAckChange=e=>{this.acknowledged=e.target.checked},this.onLimitInput=e=>{this.limitValue=parseInt(e.target.value,10)||0},this.onCancel=()=>{this.closeDialog({confirmed:!1})},this.onConfirm=()=>{const e=this.config.showLimitInput||this.config.limitOnly;if(e){const t=this.config.limitMin??1,i=this.config.limitMax??2e4;if(isNaN(this.limitValue)||this.limitValue<t||this.limitValue>i)return}this.closeDialog({confirmed:!0,limit:e?this.limitValue:void 0})}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeyDown)}showDialog(e){return this.config=e,this.acknowledged=!1,this.limitValue=e.limitValue??5e3,this.open=!0,new Promise(t=>{this.resolver=t})}closeDialog(e){var t;this.open=!1,(t=this.resolver)==null||t.call(this,e),this.resolver=null}get canConfirm(){return!(this.config.requireAcknowledgement&&!this.acknowledged)}render(){if(!this.open)return P;const e=this.config;return e.limitOnly?c`
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
          `:P}

          ${e.warning?c`
            <div class="dialog-warning">
              \u26A0\uFE0F ${this.renderHTML(e.warning)}
            </div>
          `:P}

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
          `:P}

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
    `}renderHTML(e){return Gh(e)}};Ot.styles=D`
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
      background: ${ye(o.cardBg)};
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
      color: ${ye(o.textPrimary)};
      border-bottom: 1px solid ${ye(o.divider)};
    }

    .dialog-body {
      padding: 16px 20px;
      font-size: 14px;
      line-height: 1.5;
      color: ${ye(o.textPrimary)};
    }

    .dialog-warning {
      margin: 0 20px 12px;
      padding: 10px 14px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      font-size: 13px;
      color: ${ye(o.textPrimary)};
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
      background: ${ye(o.bgSecondary)};
      border-radius: 8px;
      cursor: pointer;
    }

    .ack-wrapper input[type="checkbox"] {
      margin-top: 2px;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${ye(o.accent)};
    }

    .ack-wrapper label {
      font-size: 13px;
      line-height: 1.4;
      color: ${ye(o.textPrimary)};
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
      color: ${ye(o.textPrimary)};
    }

    .limit-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid ${ye(o.divider)};
      border-radius: 8px;
      font-size: 14px;
      background: ${ye(o.bgPrimary)};
      color: ${ye(o.textPrimary)};
      box-sizing: border-box;
    }

    .limit-hint {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      opacity: 0.7;
      color: ${ye(o.textSecondary)};
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
      background: ${ye(o.bgSecondary)};
      color: ${ye(o.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${ye(o.divider)};
    }

    .btn-confirm {
      background: ${ye(o.accent)};
      color: #fff;
    }

    .btn-confirm:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-confirm:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;cn([f({type:Boolean,reflect:!0})],Ot.prototype,"open",2);cn([f({type:Object})],Ot.prototype,"config",2);cn([T()],Ot.prototype,"acknowledged",2);cn([T()],Ot.prototype,"limitValue",2);Ot=cn([O("oig-confirm-dialog")],Ot);var Xh=Object.defineProperty,Jh=Object.getOwnPropertyDescriptor,Qs=(e,t,i,n)=>{for(var r=n>1?void 0:n?Jh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Xh(t,i,r),r};const Di=G;let Fn=class extends E{constructor(){super(...arguments),this.shieldState=null}render(){if(!this.shieldState)return P;const e=this.determineStatus(this.shieldState),t=e.toLowerCase(),i=this.getStatusIcon(e),n=this.getStatusLabel(e),a=this.shieldState.queueCount>0?"has-items":"";return c`
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
          <span class="shield-status-badge ${t}">${n}</span>
        </div>
      </div>
    `}determineStatus(e){return e.status==="running"?"processing":e.queueCount>0?"pending":"idle"}getStatusIcon(e){switch(e){case"idle":return"✓";case"pending":return"⏳";case"processing":return"🔄";default:return"✓"}}getStatusLabel(e){switch(e){case"idle":return"Připraveno";case"pending":return"Čeká";case"processing":return"Zpracovává";default:return"Neznámý"}}getActivityText(){return this.shieldState?this.shieldState.activity?this.shieldState.activity:this.shieldState.queueCount>0?`${this.shieldState.queueCount} operací ve frontě`:"Systém připraven":"Žádná aktivita"}};Fn.styles=D`
    :host {
      display: block;
      padding: 16px 20px;
      border-top: 1px solid ${Di(o.divider)};
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
      color: ${Di(o.textPrimary)};
    }

    .shield-status-subtitle {
      font-size: 11px;
      color: ${Di(o.textSecondary)};
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
      background: ${Di(o.bgSecondary)};
      color: ${Di(o.textSecondary)};
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
  `;Qs([f({type:Object})],Fn.prototype,"shieldState",2);Fn=Qs([O("oig-shield-status")],Fn);var eg=Object.defineProperty,tg=Object.getOwnPropertyDescriptor,Zr=(e,t,i,n)=>{for(var r=n>1?void 0:n?tg(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&eg(t,i,r),r};const Vt=G;let Zi=class extends E{constructor(){super(...arguments),this.shieldState={...fs,pendingServices:new Map,changingServices:new Set},this._confirmDialogOverride=null,this.unsubscribe=null,this.onShieldUpdate=e=>{this.shieldState=e}}get confirmDialog(){return this._confirmDialogOverride??this._confirmDialogQuery}set confirmDialog(e){this._confirmDialogOverride=e}connectedCallback(){super.connectedCallback(),this.unsubscribe=re.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.unsubscribe)==null||e.call(this),this.unsubscribe=null}get boxModeButtonStates(){return{home_1:re.getBoxModeButtonState("home_1"),home_2:re.getBoxModeButtonState("home_2"),home_3:re.getBoxModeButtonState("home_3"),home_ups:re.getBoxModeButtonState("home_ups")}}get gridDeliveryButtonStates(){return{off:re.getGridDeliveryButtonState("off"),on:re.getGridDeliveryButtonState("on"),limited:re.getGridDeliveryButtonState("limited")}}get boilerModeButtonStates(){return{cbb:re.getBoilerModeButtonState("cbb"),manual:re.getBoilerModeButtonState("manual")}}get supplementaryView(){return Vh(this.shieldState.supplementary)}async onBoxModeChange(e){const{mode:t}=e.detail,i=us[t];if(_.debug("Control panel: box mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu střídače",message:`Chystáte se změnit režim boxu na <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování celého systému a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!re.shouldProceedWithQueue())return;await re.setBoxMode(t)||_.warn("Box mode change failed or already active",{mode:t})}async onGridDeliveryChange(e){const{value:t,limit:i}=e.detail,n=Oi[t],r=gl[t],a=t==="limited",s=this.shieldState.gridDeliveryState.currentLiveLimit??5e3;_.debug("Control panel: grid delivery change requested",{delivery:t,limit:i});const l=this.shieldState.gridDeliveryState.currentLiveDelivery;if(!this.shieldState.gridDeliveryState.isTransitioning&&l==="limited"&&t==="limited"){const m={title:"🚰 Změnit limit přetoků",message:"",limitOnly:!0,showLimitInput:!0,limitValue:s,limitMin:1,limitMax:2e4,limitStep:100,confirmText:"Uložit limit",cancelText:"Zrušit"},b=await this.confirmDialog.showDialog(m);if(!b.confirmed||!re.shouldProceedWithQueue())return;await re.setGridDelivery("limited",b.limit);return}const u={title:`${r} Změna dodávky do sítě`,message:`Chystáte se změnit dodávku do sítě na: <strong>"${n}"</strong>`,warning:a?"Režim a limit budou změněny postupně (serializováno). Každá změna může trvat až 10 minut.":"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,acknowledgementText:"<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost. Aplikace nenese odpovědnost za případné negativní důsledky této změny.",confirmText:"Potvrdit změnu",cancelText:"Zrušit",showLimitInput:a,limitValue:s,limitMin:1,limitMax:2e4,limitStep:100},p=await this.confirmDialog.showDialog(u);if(!p.confirmed||!re.shouldProceedWithQueue())return;const h=this.shieldState.gridDeliveryState.currentLiveDelivery==="limited",g=t==="limited";h&&g&&p.limit!=null?await re.setGridDelivery(t,p.limit):g&&p.limit!=null?await re.setGridDelivery(t,p.limit):await re.setGridDelivery(t)}async onBoilerModeChange(e){const{mode:t}=e.detail,i=ps[t],n=hs[t];if(_.debug("Control panel: boiler mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu bojleru",message:`Chystáte se změnit režim bojleru na <strong>"${n} ${i}"</strong>.<br><br>Tato změna ovlivní chování ohřevu vody a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!re.shouldProceedWithQueue())return;await re.setBoilerMode(t)||_.warn("Boiler mode change failed or already active",{mode:t})}async onSupplementaryToggle(e){const{key:t}=e.detail,i=t==="home_grid_v"?"Home 5":"Home 6",n=!this.shieldState.supplementary[t];if(_.debug("Control panel: supplementary toggle requested",{key:t}),!(await this.confirmDialog.showDialog({title:"Změna doplňkového režimu",message:`Chystáte se přepnout <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování systému a může trvat až 10 minut.`,warning:"Změna může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!re.shouldProceedWithQueue())return;await re.setSupplementaryToggle(t,n)||_.warn("Supplementary toggle failed",{key:t})}async onQueueRemoveItem(e){const{position:t}=e.detail;_.debug("Control panel: queue remove requested",{position:t});const i=this.shieldState.allRequests.find(s=>s.position===t);let n="Operace";if(i&&(i.service.includes("set_box_mode")?n=`Změna režimu na ${i.targetValue||"neznámý"}`:i.service.includes("set_grid_delivery")?n=`Změna dodávky do sítě na ${i.targetValue||"neznámý"}`:i.service.includes("set_boiler_mode")&&(n=`Změna režimu bojleru na ${i.targetValue||"neznámý"}`)),!(await this.confirmDialog.showDialog({title:n,message:"Operace bude odstraněna z fronty bez provedení.",requireAcknowledgement:!1,confirmText:"OK",cancelText:"Zrušit"})).confirmed)return;await re.removeFromQueue(t)||_.warn("Failed to remove from queue",{position:t})}render(){const e=this.shieldState,t=e.status==="running"?"running":"idle",i=e.status==="running"?"Zpracovává":"Připraveno",n=e.allRequests.length>0;return c`
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

          <!-- Supplementary Toggles (Home 5 / Home 6) -->
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
        ${n?c`
          <div class="queue-section">
            <oig-shield-queue
              .items=${e.allRequests}
              .shieldStatus=${e.status}
              .queueCount=${e.queueCount}
              .expanded=${!1}
              @remove-item=${this.onQueueRemoveItem}
            ></oig-shield-queue>
          </div>
        `:P}
      </div>

      <!-- Shared confirm dialog instance -->
      <oig-confirm-dialog></oig-confirm-dialog>
    `}};Zi.styles=D`
    :host {
      display: block;
      margin-top: 16px;
    }

    .control-panel {
      background: ${Vt(o.cardBg)};
      border-radius: 16px;
      box-shadow: ${Vt(o.cardShadow)};
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid ${Vt(o.divider)};
    }

    .panel-title {
      font-size: 15px;
      font-weight: 600;
      color: ${Vt(o.textPrimary)};
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
      background: ${Vt(o.divider)};
      margin: 16px 0;
    }

    .queue-section {
      border-top: 1px solid ${Vt(o.divider)};
    }

    @media (max-width: 480px) {
      .panel-body {
        padding: 12px 14px;
      }
    }
  `;Zr([T()],Zi.prototype,"shieldState",2);Zr([Vn("oig-confirm-dialog")],Zi.prototype,"_confirmDialogQuery",2);Zi=Zr([O("oig-control-panel")],Zi);var ig=Object.defineProperty,ng=Object.getOwnPropertyDescriptor,gi=(e,t,i,n)=>{for(var r=n>1?void 0:n?ng(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&ig(t,i,r),r};const $e=G;let ft=class extends E{constructor(){super(...arguments),this.open=!1,this.currentSoc=0,this.maxSoc=100,this.estimate=null,this.targetSoc=80}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onSliderInput(e){this.targetSoc=parseInt(e.target.value,10),this.dispatchEvent(new CustomEvent("soc-change",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}onConfirm(){this.dispatchEvent(new CustomEvent("confirm",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}render(){return c`
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
    `}};ft.styles=D`
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
      background: ${$e(o.cardBg)};
      border-radius: 16px;
      padding: 24px;
      min-width: 320px;
      max-width: 90vw;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${$e(o.textPrimary)};
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
      color: ${$e(o.textSecondary)};
    }

    .soc-value {
      font-size: 24px;
      font-weight: 600;
      color: ${$e(o.textPrimary)};
    }

    .soc-arrow {
      font-size: 20px;
      color: ${$e(o.textSecondary)};
    }

    .slider-container {
      margin: 16px 0;
    }

    .slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: ${$e(o.bgSecondary)};
      -webkit-appearance: none;
      appearance: none;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${$e(o.accent)};
      cursor: pointer;
    }

    .estimate {
      background: ${$e(o.bgSecondary)};
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
      color: ${$e(o.textSecondary)};
    }

    .estimate-value {
      color: ${$e(o.textPrimary)};
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
      background: ${$e(o.bgSecondary)};
      color: ${$e(o.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${$e(o.divider)};
    }

    .btn-confirm {
      background: ${$e(o.accent)};
      color: #fff;
    }

    .btn-confirm:hover {
      opacity: 0.9;
    }
  `;gi([f({type:Boolean})],ft.prototype,"open",2);gi([f({type:Number})],ft.prototype,"currentSoc",2);gi([f({type:Number})],ft.prototype,"maxSoc",2);gi([f({type:Object})],ft.prototype,"estimate",2);gi([T()],ft.prototype,"targetSoc",2);ft=gi([O("oig-battery-charge-dialog")],ft);var rg=Object.defineProperty,ag=Object.getOwnPropertyDescriptor,Be=(e,t,i,n)=>{for(var r=n>1?void 0:n?ag(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&rg(t,i,r),r};function Zt(e){return e==null||Number.isNaN(e)?"-- kWh":`${e.toFixed(Math.abs(e)>=10?1:2)} kWh`}const wr=G,Qr=D`
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
`;let Qi=class extends E{constructor(){super(...arguments),this.title="",this.icon="📊"}render(){return c`
      <div class="block-header">
        <span class="block-icon">${this.icon}</span>
        <span class="block-title">${this.title}</span>
      </div>
      <slot></slot>
    `}};Qi.styles=D`
    :host {
      display: block;
      background: ${wr(o.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${wr(o.cardShadow)};
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
      color: ${wr(o.textPrimary)};
    }

    ${Qr}
  `;Be([f({type:String})],Qi.prototype,"title",2);Be([f({type:String})],Qi.prototype,"icon",2);Qi=Be([O("oig-analytics-block")],Qi);let Bn=class extends E{constructor(){super(...arguments),this.data=null}render(){if(!this.data)return c`<div>Načítání...</div>`;const e=this.data.trend>=0?"positive":"negative",t=this.data.trend>=0?"+":"",i=this.data.period==="last_month"?"Minulý měsíc":`Aktuální měsíc (${this.data.currentMonthDays} dní)`;return c`
      <div class="efficiency-value">${Gt(this.data.efficiency,1)}</div>
      <div class="period-label"
        title="Coulombická (DC) účinnost článků baterie. Celková AC účinnost vč. střídače, se kterou počítá ekonomika plánovače, je ~84 %.">
        ${i} · DC (články)
      </div>

      ${this.data.trend!==0?c`
        <div class="comparison ${e}">
          ${t}${Gt(this.data.trend)} vs minulý měsíc
        </div>
      `:null}

      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${Zt(this.data.charged)}</div>
          <div class="stat-label">Nabito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${Zt(this.data.discharged)}</div>
          <div class="stat-label">Vybito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${Zt(this.data.losses)}</div>
          <div class="stat-label">Ztráty</div>
          ${this.data.lossesPct?c`
            <div class="losses-pct">${Gt(this.data.lossesPct,1)}</div>
          `:null}
        </div>
      </div>
    `}};Bn.styles=D`
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
  `;Be([f({type:Object})],Bn.prototype,"data",2);Bn=Be([O("oig-battery-efficiency")],Bn);let Nn=class extends E{constructor(){super(...arguments),this.data=null}renderSparkline(){var d;const e=(d=this.data)==null?void 0:d.measurementHistory;if(!e||e.length<2)return null;const t=e.map(u=>u.soh_percent),i=Math.min(...t)-1,r=Math.max(...t)+1-i||1,a=200,s=40,l=t.map((u,p)=>{const h=p/(t.length-1)*a,g=s-(u-i)/r*s;return`${h},${g}`}).join(" ");return c`
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
    `}render(){return this.data?c`
      <oig-analytics-block title="Zdraví baterie" icon="❤️">
        <span class="status-badge ${this.data.status}">${this.data.statusLabel}</span>

        ${this.renderSparkline()}

        <div class="metric">
          <span class="metric-label">State of Health</span>
          <span class="metric-value">${Gt(this.data.soh,1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Kapacita (P80)</span>
          <span class="metric-value">${Zt(this.data.capacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Min. kapacita (P20)</span>
          <span class="metric-value">${Zt(this.data.minCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Nominální kapacita</span>
          <span class="metric-value">${Zt(this.data.nominalCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Počet měření</span>
          <span class="metric-value">${this.data.measurementCount}</span>
        </div>
        ${this.data.qualityScore!=null?c`
          <div class="metric">
            <span class="metric-label">Kvalita dat</span>
            <span class="metric-value">${Gt(this.data.qualityScore,0)}</span>
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
                Spolehlivost: <span class="prediction-value">${Gt(this.data.trendConfidence,0)}</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:c`<div>Načítání...</div>`}};Nn.styles=D`
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

    ${Qr}

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
  `;Be([f({type:Object})],Nn.prototype,"data",2);Nn=Be([O("oig-battery-health")],Nn);let Rn=class extends E{constructor(){super(...arguments),this.data=null}getProgressClass(e){return e==null?"ok":e>=95?"overdue":e>=80?"due-soon":"ok"}statusLabel(e){var i;return{unknown:"Žádné",idle:"Nečinné",charging:"Nabíjení",holding:"Držení 100 %",completed:"Dokončeno"}[(i=e==null?void 0:e.toLowerCase)==null?void 0:i.call(e)]??e}render(){return this.data?!(this.data.lastBalancing&&this.data.lastBalancing!=="—"||this.data.nextScheduled!=null||this.data.progressPercent!=null)&&(this.data.status??"unknown").toLowerCase()==="unknown"?c`
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
            <span class="metric-value">${ee(this.data.cost)}</span>
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
            <span class="metric-value">${ee(this.data.estimatedNextCost)}</span>
          </div>
        `:null}
      </oig-analytics-block>
    `:c`<div>Načítání...</div>`}};Rn.styles=D`
    :host { display: block; }
    ${Qr}

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
  `;Be([f({type:Object})],Rn.prototype,"data",2);Rn=Be([O("oig-battery-balancing")],Rn);let jn=class extends E{constructor(){super(...arguments),this.data=null}render(){return this.data?c`
      <oig-analytics-block title="Porovnání nákladů" icon="💰">
        <div class="cost-row">
          <span class="cost-label">Skutečné náklady</span>
          <span class="cost-value">${ee(this.data.actualSpent)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Odhad dnes celkem</span>
          <span class="cost-value">${ee(this.data.planTotalCost)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Zbývající plán</span>
          <span class="cost-value">${ee(this.data.futurePlanCost)}</span>
        </div>
        ${this.data.tomorrowCost!=null?c`
          <div class="cost-row">
            <span class="cost-label">Zítra odhad</span>
            <span class="cost-value">${ee(this.data.tomorrowCost)}</span>
          </div>
        `:null}

        ${this.data.yesterdayActualCost!=null?c`
          <div class="yesterday-section">
            <div class="section-label">Včera</div>
            <div class="cost-row">
              <span class="cost-label">Plán</span>
              <span class="cost-value">${this.data.yesterdayPlannedCost!=null?ee(this.data.yesterdayPlannedCost):"—"}</span>
            </div>
            <div class="cost-row">
              <span class="cost-label">Skutečnost</span>
              <span class="cost-value">${ee(this.data.yesterdayActualCost)}</span>
            </div>
            ${this.data.yesterdayDelta!=null?c`
              <div class="cost-row">
                <span class="cost-label">Rozdíl</span>
                <span class="cost-value ${this.data.yesterdayDelta<=0?"delta-positive":"delta-negative"}">
                  ${this.data.yesterdayDelta>=0?"+":""}${ee(this.data.yesterdayDelta)}
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
    `:c`<div>Načítání...</div>`}};jn.styles=D`
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
  `;Be([f({type:Object})],jn.prototype,"data",2);jn=Be([O("oig-cost-comparison")],jn);var sg=Object.defineProperty,og=Object.getOwnPropertyDescriptor,fi=(e,t,i,n)=>{for(var r=n>1?void 0:n?og(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&sg(t,i,r),r};const Kt=G;let Xi=class extends E{constructor(){super(...arguments),this.data=Ii,this.compact=!1,this.onClick=()=>{this.dispatchEvent(new CustomEvent("badge-click",{bubbles:!0}))}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.onClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.onClick)}render(){const e=this.data.effectiveSeverity,t=_n[e]??_n[0],i=this.data.warningsCount>0&&e>0,n=i?_s(this.data.eventType):"✓";return c`
      <style>
        :host { background: ${Kt(t)}; }
      </style>
      <span class="badge-icon">${n}</span>
      ${i?c`
        <span class="badge-count">${this.data.warningsCount}</span>
      `:null}
      <span class="badge-label">${i?ks[e]??"Výstraha":"OK"}</span>
    `}};Xi.styles=D`
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
  `;fi([f({type:Object})],Xi.prototype,"data",2);fi([f({type:Boolean})],Xi.prototype,"compact",2);Xi=fi([O("oig-chmu-badge")],Xi);let Ji=class extends E{constructor(){super(...arguments),this.open=!1,this.data=Ii}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}formatTime(e){return e?new Date(e).toLocaleString("cs-CZ"):"—"}renderWarning(e){const t=_n[e.severity]??_n[2],i=_s(e.event_type),n=ks[e.severity]??"Neznámá";return c`
      <div class="warning-item" style="background: ${t}">
        <div class="warning-header">
          <span class="warning-icon">${i}</span>
          <span class="warning-type">${e.event_type}</span>
          <span class="warning-level">${n}</span>
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
    `}};Ji.styles=D`
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
      background: ${Kt(o.cardBg)};
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
      color: ${Kt(o.textPrimary)};
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      font-size: 20px;
      cursor: pointer;
      color: ${Kt(o.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${Kt(o.bgSecondary)};
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
      color: ${Kt(o.textSecondary)};
    }

    .eta-badge {
      display: inline-block;
      font-size: 10px;
      padding: 1px 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      margin-left: 6px;
    }
  `;fi([f({type:Boolean,reflect:!0})],Ji.prototype,"open",2);fi([f({type:Object})],Ji.prototype,"data",2);Ji=fi([O("oig-chmu-modal")],Ji);const Xa=new URLSearchParams(window.location.search),Xs=Xa.get("sn")||Xa.get("inverter_sn")||"";async function lg(){const e=await te.fetchOIGAPI(`/${Xs}/module_config`);return!e||e.error?(_.warn("[Settings] module_config load failed",e),null):e}async function cg(e,t){const i=await te.fetchOIGAPI(`/${Xs}/module_config`,{method:"POST",body:JSON.stringify({section:e,values:t})});return i&&(i.updated===!0||i.updated===!1)?{ok:!0}:{ok:!1,fields:i==null?void 0:i.fields}}var dg=Object.defineProperty,ug=Object.getOwnPropertyDescriptor,mi=(e,t,i,n)=>{for(var r=n>1?void 0:n?ug(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&dg(t,i,r),r};const xe=G,pg=[{key:"enable_battery_prediction",label:"Predikce baterie a plánovač",type:"bool",hint:"Ekonomické plánování nabíjení, timeline, úspory"},{key:"enable_solar_forecast",label:"Solární předpověď",type:"bool",hint:"Předpověď výroby FVE (forecast.solar / Solcast)"},{key:"enable_pricing",label:"Ceny energie",type:"bool",hint:"Spotové ceny OTE, výkup, distribuce"},{key:"enable_boiler",label:"Bojler",type:"bool",hint:"Inteligentní ohřev vody"},{key:"enable_statistics",label:"Statistiky",type:"bool"},{key:"enable_extended_sensors",label:"Rozšířené senzory",type:"bool"},{key:"enable_chmu_warnings",label:"Výstrahy ČHMÚ",type:"bool"}],hg=[{key:"auto_mode_switch_enabled",label:"Automatické přepínání režimů",type:"bool",hint:"Plánovač sám přepíná Home 1 / Home UPS podle plánu"},{key:"charge_rate_kw",label:"Nabíjecí výkon ze sítě (kW)",type:"number",min:.5,max:10,step:.1,hint:"Kolik kW box bere při nabíjení ze sítě (UPS)"},{key:"expensive_percentile",label:"Práh drahých hodin (%)",type:"number",min:50,max:95,step:5,scale:100,hint:"Importy nad tímto denním percentilem cen se plánovač snaží pokrýt levným přednabitím. Výchozí 70 %."},{key:"balancing_enabled",label:"Balancování článků",type:"bool",hint:"Pravidelné nabití na 100 % kvůli vyrovnání článků"},{key:"balancing_interval_days",label:"Interval balancování (dny)",type:"number",min:3,max:30,step:1},{key:"balancing_hold_hours",label:"Držení 100 % (hodiny)",type:"number",min:1,max:12,step:1},{key:"cheap_window_percentile",label:"Levné okno pro balancování (%)",type:"number",min:5,max:80,step:5,hint:"Balancování se plánuje do hodin pod tímto cenovým percentilem"}],gg=[{key:"solar_forecast_provider",label:"Poskytovatel",type:"select",options:[["forecast_solar","forecast.solar"],["solcast","Solcast"]]},{key:"solcast_site_id",label:"Solcast site ID",type:"text",hint:"Jen pro Solcast (z rooftop site URL)"},{key:"solcast_api_key",label:"Solcast API klíč",type:"text",hint:"Nech prázdné = beze změny"},{key:"solar_forecast_latitude",label:"Zeměpisná šířka",type:"number",min:-90,max:90,step:1e-4},{key:"solar_forecast_longitude",label:"Zeměpisná délka",type:"number",min:-180,max:180,step:1e-4},{key:"solar_forecast_string1_enabled",label:"String 1 aktivní",type:"bool"},{key:"solar_forecast_string1_kwp",label:"String 1 výkon (kWp)",type:"number",min:.1,max:50,step:.1},{key:"solar_forecast_string1_declination",label:"String 1 sklon (°)",type:"number",min:0,max:90,step:1},{key:"solar_forecast_string1_azimuth",label:"String 1 azimut (°)",type:"number",min:-180,max:180,step:1,hint:"0 = jih, −90 = východ, 90 = západ"},{key:"solar_forecast_string2_enabled",label:"String 2 aktivní",type:"bool"},{key:"solar_forecast_string2_kwp",label:"String 2 výkon (kWp)",type:"number",min:.1,max:50,step:.1},{key:"solar_forecast_string2_declination",label:"String 2 sklon (°)",type:"number",min:0,max:90,step:1},{key:"solar_forecast_string2_azimuth",label:"String 2 azimut (°)",type:"number",min:-180,max:180,step:1}];let mt=class extends E{constructor(){super(...arguments),this.config=null,this.loading=!0,this.pending={},this.saving=null,this.toast=null}connectedCallback(){super.connectedCallback(),this.refresh()}async refresh(){this.loading=!0,this.config=await lg(),this.pending={},this.loading=!1}current(e,t){var r;const i=this.pending[e];if(i&&t in i)return i[t];const n=(r=this.config)==null?void 0:r[e];return n?n[t]:void 0}setPending(e,t,i){this.pending={...this.pending,[e]:{...this.pending[e]??{},[t]:i}}}isDirty(e){return Object.keys(this.pending[e]??{}).length>0}async save(e){const t=this.pending[e];if(!t||this.saving)return;this.saving=e,this.toast=null;const i=await cg(e,t);if(this.saving=null,i.ok)this.toast={section:e,ok:!0,text:"✓ Uloženo — integrace se aplikuje během chvilky"},await this.refresh();else{const n=i.fields?Object.entries(i.fields).map(([r,a])=>`${r}: ${a}`).join(", "):"uložení selhalo";this.toast={section:e,ok:!1,text:`✗ ${n}`}}}renderField(e,t){const i=this.current(e,t.key),n=!!(this.pending[e]&&t.key in this.pending[e]);if(t.type==="bool"){const l=!!i;return c`
        <div class="row">
          <span class="lab">${t.label}${t.hint?c`<span class="hint">${t.hint}</span>`:P}</span>
          <label class="switch">
            <input type="checkbox" .checked=${l}
              @change=${d=>this.setPending(e,t.key,d.target.checked)} />
            <span class="slider"></span>
          </label>
        </div>`}if(t.type==="select"){const l=String(i??"");return c`
        <div class="row">
          <span class="lab">${t.label}${t.hint?c`<span class="hint">${t.hint}</span>`:P}</span>
          <select class=${n?"dirty":""}
            @change=${d=>this.setPending(e,t.key,d.target.value)}>
            ${(t.options??[]).map(([d,u])=>c`<option value=${d} ?selected=${d===l}>${u}</option>`)}
          </select>
        </div>`}if(t.type==="number"){const l=t.scale??1,d=i==null||i===""?"":String(Math.round((Number(i)*l+Number.EPSILON)*1e4)/1e4);return c`
        <div class="row">
          <span class="lab">${t.label}${t.hint?c`<span class="hint">${t.hint}</span>`:P}</span>
          <input type="number" class=${n?"dirty":""} .value=${d}
            min=${t.min??P} max=${t.max??P} step=${t.step??P}
            @change=${u=>{const p=u.target.value;p!==""&&this.setPending(e,t.key,Number(p)/l)}} />
        </div>`}const r=t.key.endsWith("api_key"),a=r&&!!this.current(e,`${t.key}_set`),s=r?"":String(i??"");return c`
      <div class="row">
        <span class="lab">${t.label}${t.hint?c`<span class="hint">${t.hint}</span>`:P}</span>
        <input type="text" class=${n?"dirty":""} .value=${s}
          placeholder=${r?a?"••••• (nastaveno)":"nenastaveno":""}
          @change=${l=>this.setPending(e,t.key,l.target.value)} />
      </div>`}renderCard(e,t,i,n){var a;const r=((a=this.toast)==null?void 0:a.section)===e?this.toast:null;return c`
      <div class="card">
        <h2>${t}</h2>
        <div class="sub">${i}</div>
        ${n.map(s=>this.renderField(e,s))}
        <div class="actions">
          <button class="save" ?disabled=${!this.isDirty(e)||this.saving===e}
            @click=${()=>this.save(e)}>
            ${this.saving===e?"Ukládám…":"Uložit"}
          </button>
          ${r?c`<span class="toast ${r.ok?"ok":"err"}">${r.text}</span>`:P}
        </div>
      </div>`}render(){return this.loading?c`<div class="loading">Načítání nastavení…</div>`:this.config?c`
      <div class="grid">
        ${this.renderCard("modules","🧩 Moduly","Zapnutí modulu přidá senzory a záložky; konfigurace níže.",pg)}
        ${this.renderCard("battery","🔋 Baterie a plánovač","Parametry ekonomického plánovače a balancování.",hg)}
        ${this.renderCard("solar","☀️ Solární předpověď","Poskytovatel a geometrie stringů.",gg)}
      </div>
      <div class="note">
        💰 Ceny energie a 🔥 Bojler mají vícekrokové průvodce — najdeš je v
        <b>HA → Nastavení → Zařízení a služby → OIG Cloud → Konfigurovat</b>
        (menu skočí rovnou na sekci).
      </div>
    `:c`<div class="loading">Nastavení se nepodařilo načíst (vyžaduje administrátorský účet).</div>`}};mt.styles=D`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 14px;
      align-items: start;
    }

    .card {
      background: ${xe(o.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${xe(o.cardShadow)};
    }

    .card h2 {
      margin: 0 0 4px;
      font-size: 15px;
      color: ${xe(o.textPrimary)};
    }

    .card .sub {
      font-size: 11px;
      color: ${xe(o.textSecondary)};
      margin-bottom: 12px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 7px 0;
      border-bottom: 1px dashed ${xe(o.divider)};
    }
    .row:last-of-type { border-bottom: none; }

    .lab { font-size: 12.5px; color: ${xe(o.textPrimary)}; }
    .hint { display: block; font-size: 10.5px; color: ${xe(o.textSecondary)}; margin-top: 1px; max-width: 270px; }

    input[type='number'], input[type='text'], select {
      background: ${xe(o.bgSecondary)};
      color: ${xe(o.textPrimary)};
      border: 1px solid ${xe(o.divider)};
      border-radius: 7px;
      padding: 5px 8px;
      font-size: 12.5px;
      width: 130px;
    }
    input[type='text'] { width: 170px; }
    input.dirty, select.dirty { border-color: ${xe(o.accent)}; }

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
    .switch input:checked + .slider { background: ${xe(o.accent)}; }
    .switch input:checked + .slider:before { transform: translateX(18px); }

    .actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
    button.save {
      background: ${xe(o.accent)};
      color: #fff; border: none; border-radius: 8px;
      padding: 7px 16px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    button.save:disabled { opacity: 0.45; cursor: default; }
    .toast { font-size: 12px; }
    .toast.ok { color: #9fe6a8; }
    .toast.err { color: #ff9d93; }

    .note {
      font-size: 11.5px;
      color: ${xe(o.textSecondary)};
      background: rgba(120,160,255,0.08);
      border: 1px solid rgba(120,160,255,0.2);
      border-radius: 8px;
      padding: 8px 10px;
      margin-top: 12px;
      line-height: 1.45;
    }

    .loading { padding: 30px; text-align: center; color: ${xe(o.textSecondary)}; }
  `;mi([T()],mt.prototype,"config",2);mi([T()],mt.prototype,"loading",2);mi([T()],mt.prototype,"pending",2);mi([T()],mt.prototype,"saving",2);mi([T()],mt.prototype,"toast",2);mt=mi([O("oig-settings")],mt);var fg=Object.defineProperty,mg=Object.getOwnPropertyDescriptor,et=(e,t,i,n)=>{for(var r=n>1?void 0:n?mg(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&fg(t,i,r),r};const V=G;function bg(e,t,i,n){const r=Math.abs(e);return r===1?t:r>=2&&r<=4?i:n}function Js(e){return`${e} ${bg(e,"blok","bloky","bloků")}`}function eo(e){return`${e} přepnutí`}let zt=class extends E{constructor(){super(...arguments),this.open=!1,this.activeTab="today",this.data=null,this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.open&&this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return Ss[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return c`
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
          <span class="mode-cost">${ee(e.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(e,t){const i=t.unit==="Kč"?ee(t.plan):`${t.plan.toFixed(1)} ${t.unit}`;let n="",r="";return t.hasActual&&t.actual!=null&&(r=t.unit==="Kč"?ee(t.actual):`${t.actual.toFixed(1)} ${t.unit}`,t.unit==="Kč"?n=t.actual<=t.plan?"better":"worse":n=t.actual>=t.plan?"better":"worse"),c`
      <div class="metric-tile">
        <div class="metric-label">${e}</div>
        <div class="metric-values">
          <span class="metric-plan">${i}</span>
          ${t.hasActual?c`
            <span class="metric-actual ${n}">(${r})</span>
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
              ${Cs[t]}
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
                ${t.backupSavings>=0?"+":""}${ee(t.backupSavings)}
              </span>
              <span class="bs-detail">
                záloha ${ee(t.backupActualCost??0)} vs. nedělat nic
                ${ee(t.backupBaselineCost??0)}
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
              Skutečné: <span class="progress-value">${ee(t.actualTotalCost)}</span>
            </div>
          `:null}
          ${t.planTotalCost!=null?c`
            <div class="progress-item">
              Plán: <span class="progress-value">${ee(t.planTotalCost)}</span>
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
          Predikce konce dne: <span class="eod-value">${ee(t.eodPrediction.predictedTotal)}</span>
          ${t.eodPrediction.predictedSavings>0?c`
            <span class="eod-savings"> (úspora ${ee(t.eodPrediction.predictedSavings)})</span>
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
          <div class="section-title">Režimy (${Js(e.modeBlocks.length)}, ${eo(t.modeSwitches)})</div>
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
    `}};zt.styles=D`
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
      background: ${V(o.cardBg)};
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
      border-bottom: 1px solid ${V(o.divider)};
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${V(o.textPrimary)};
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
      color: ${V(o.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${V(o.bgSecondary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${V(o.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${V(o.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 12px 16px;
      border: none;
      background: transparent;
      font-size: 13px;
      color: ${V(o.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${V(o.textPrimary)};
    }

    .tab.active {
      color: ${V(o.accent)};
      border-bottom-color: ${V(o.accent)};
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
      color: ${V(o.textSecondary)};
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
      background: ${V(o.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
    }

    .metric-label {
      font-size: 11px;
      color: ${V(o.textSecondary)};
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
      color: ${V(o.textPrimary)};
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
      color: ${V(o.textPrimary)};
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
      color: ${V(o.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${V(o.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${V(o.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 12px;
      color: ${V(o.textSecondary)};
    }

    .eod-value {
      font-size: 16px;
      font-weight: 600;
      color: ${V(o.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: ${V(o.textSecondary)};
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
  `;et([f({type:Boolean,reflect:!0})],zt.prototype,"open",2);et([f({type:String})],zt.prototype,"activeTab",2);et([f({type:Object})],zt.prototype,"data",2);et([T()],zt.prototype,"autoRefresh",2);zt=et([O("oig-timeline-dialog")],zt);let oi=class extends E{constructor(){super(...arguments),this.data=null,this.activeTab="today",this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return Ss[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return c`
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
          <span class="mode-cost">${ee(e.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(e,t){const i=t.unit==="Kč"?ee(t.plan):`${t.plan.toFixed(1)} ${t.unit}`;let n="",r="";return t.hasActual&&t.actual!=null&&(r=t.unit==="Kč"?ee(t.actual):`${t.actual.toFixed(1)} ${t.unit}`,t.unit==="Kč"?n=t.actual<=t.plan?"better":"worse":n=t.actual>=t.plan?"better":"worse"),c`
      <div class="metric-tile">
        <div class="metric-label">${e}</div>
        <div class="metric-values">
          <span class="metric-plan">${i}</span>
          ${t.hasActual?c`
            <span class="metric-actual ${n}">(${r})</span>
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
              ${Cs[t]}
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
                ${t.backupSavings>=0?"+":""}${ee(t.backupSavings)}
              </span>
              <span class="bs-detail">
                záloha ${ee(t.backupActualCost??0)} vs. nedělat nic
                ${ee(t.backupBaselineCost??0)}
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
              Skutečné: <span class="progress-value">${ee(t.actualTotalCost)}</span>
            </div>
          `:null}
          ${t.planTotalCost!=null?c`
            <div class="progress-item">
              Plán: <span class="progress-value">${ee(t.planTotalCost)}</span>
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
          Predikce konce dne: <span class="eod-value">${ee(t.eodPrediction.predictedTotal)}</span>
          ${t.eodPrediction.predictedSavings>0?c`
            <span class="eod-savings"> (úspora ${ee(t.eodPrediction.predictedSavings)})</span>
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
          <div class="section-title">Režimy (${Js(e.modeBlocks.length)}, ${eo(t.modeSwitches)})</div>
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
    `}};oi.styles=D`
    :host {
      display: block;
    }

    .tile {
      background: ${V(o.cardBg)};
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
      border-bottom: 1px solid ${V(o.divider)};
    }

    .tile-title {
      font-size: 13px;
      font-weight: 600;
      color: ${V(o.textPrimary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${V(o.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${V(o.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 6px 10px;
      border: none;
      background: transparent;
      font-size: 11px;
      color: ${V(o.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${V(o.textPrimary)};
    }

    .tab.active {
      color: ${V(o.accent)};
      border-bottom-color: ${V(o.accent)};
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
      color: ${V(o.textSecondary)};
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
      background: ${V(o.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
    }

    .metric-label {
      font-size: 10px;
      color: ${V(o.textSecondary)};
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
      color: ${V(o.textPrimary)};
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
      color: ${V(o.textPrimary)};
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
      color: ${V(o.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${V(o.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${V(o.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${V(o.textSecondary)};
    }

    .eod-value {
      font-size: 14px;
      font-weight: 600;
      color: ${V(o.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 24px 16px;
      color: ${V(o.textSecondary)};
      font-size: 12px;
    }

    /* ---- Battery savings (záloha-only, fair) ---- */
    .backup-savings {
      background: ${V(o.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${V(o.textSecondary)};
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
  `;et([f({type:Object})],oi.prototype,"data",2);et([f({type:String})],oi.prototype,"activeTab",2);et([T()],oi.prototype,"autoRefresh",2);oi=et([O("oig-timeline-tile")],oi);var vg=Object.defineProperty,yg=Object.getOwnPropertyDescriptor,vt=(e,t,i,n)=>{for(var r=n>1?void 0:n?yg(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&vg(t,i,r),r};const de=G;let li=class extends E{constructor(){super(...arguments),this.data=null,this.editMode=!1,this.tileType="entity"}onTileClick(){var t;if(this.editMode)return;const e=(t=this.data)==null?void 0:t.config;e&&(e.type==="button"&&e.action?Dc(e.entity_id,e.action):te.openEntityDialog(e.entity_id))}onSupportClick(e,t){e.stopPropagation(),!this.editMode&&te.openEntityDialog(t)}onEdit(){var e;this.dispatchEvent(new CustomEvent("edit-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}onDelete(){var e;this.dispatchEvent(new CustomEvent("delete-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}render(){var d,u;if(!this.data)return null;const e=this.data.config,t=e.type==="button";this.tileType!==e.type&&(this.tileType=e.type??"entity");const i=e.color||"",n=e.icon||(t?"⚡":"📊"),r=n.startsWith("mdi:")?kn(n):n,a=(d=e.support_entities)==null?void 0:d.top_right,s=(u=e.support_entities)==null?void 0:u.bottom_right,l=this.data.supportValues.topRight||this.data.supportValues.bottomRight;return c`
      ${i?c`<style>:host { --tile-color: ${de(i)}; }</style>`:null}

      <div class="tile-top" @click=${this.onTileClick} title=${this.editMode?"":e.entity_id}>
        <span class="tile-icon">${r}</span>
        <span class="tile-label">${e.label||""}</span>
        ${l?c`
          <div class="support-values">
            ${this.data.supportValues.topRight?c`
              <span
                class="support-value ${a&&!this.editMode?"clickable":""}"
                @click=${a&&!this.editMode?p=>this.onSupportClick(p,a):null}
              >${this.data.supportValues.topRight.value} ${this.data.supportValues.topRight.unit}</span>
            `:null}
            ${this.data.supportValues.bottomRight?c`
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
    `}};li.styles=D`
    /* ===== BASE ===== */
    :host {
      display: flex;
      flex-direction: column;
      padding: 10px 12px;
      background: ${de(o.cardBg)};
      border-radius: 10px;
      box-shadow: ${de(o.cardShadow)};
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
      color: ${de(o.textSecondary)};
      opacity: 0.45;
      font-style: normal;
    }

    /* ===== BUTTON TILE ===== */
    :host([tiletype="button"]) {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--tile-color, ${de(o.accent)}) 10%, ${de(o.cardBg)}),
        ${de(o.cardBg)}
      );
      border: 1px solid color-mix(in srgb, var(--tile-color, ${de(o.accent)}) 38%, transparent);
    }

    :host([tiletype="button"]:not([editmode]):hover) {
      transform: translateY(-2px);
      cursor: pointer;
      box-shadow:
        0 4px 14px color-mix(in srgb, var(--tile-color, ${de(o.accent)}) 28%, transparent),
        ${de(o.cardShadow)};
    }

    :host([tiletype="button"]:not([editmode]):active) {
      transform: translateY(0) scale(0.98);
      opacity: 0.85;
    }

    :host([tiletype="button"]) .tile-icon {
      background: color-mix(in srgb, var(--tile-color, ${de(o.accent)}) 18%, transparent);
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
      color: ${de(o.textSecondary)};
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
      color: ${de(o.textSecondary)};
      white-space: nowrap;
      line-height: 1.2;
    }

    .support-value.clickable {
      cursor: pointer;
    }

    .support-value.clickable:hover {
      text-decoration: underline;
      color: ${de(o.textPrimary)};
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
      color: ${de(o.textPrimary)};
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .tile-unit {
      font-size: 11px;
      font-weight: 400;
      color: ${de(o.textSecondary)};
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
      background: ${de(o.success)};
      box-shadow: 0 0 4px ${de(o.success)};
    }

    .state-dot.off {
      background: ${de(o.textSecondary)};
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
      background: ${de(o.bgSecondary)};
      border-radius: 50%;
      font-size: 9px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .delete-btn:hover {
      background: ${de(o.error)};
      color: #fff;
    }
  `;vt([f({type:Object})],li.prototype,"data",2);vt([f({type:Boolean})],li.prototype,"editMode",2);vt([f({type:String,reflect:!0})],li.prototype,"tileType",2);li=vt([O("oig-tile")],li);let ci=class extends E{constructor(){super(...arguments),this.tiles=[],this.editMode=!1,this.position="left"}render(){return this.tiles.length===0?c`<div class="empty-state">Žádné dlaždice</div>`:c`
      ${this.tiles.map(e=>c`
        <oig-tile
          .data=${e}
          .editMode=${this.editMode}
          .tileType=${e.config.type??"entity"}
          class="${e.isZero?"inactive":""}"
        ></oig-tile>
      `)}
    `}};ci.styles=D`
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }

    .empty-state {
      font-size: 12px;
      color: ${de(o.textSecondary)};
      padding: 8px;
      text-align: center;
      opacity: 0.6;
    }
  `;vt([f({type:Array})],ci.prototype,"tiles",2);vt([f({type:Boolean})],ci.prototype,"editMode",2);vt([f({type:String,reflect:!0})],ci.prototype,"position",2);ci=vt([O("oig-tiles-container")],ci);var xg=Object.defineProperty,wg=Object.getOwnPropertyDescriptor,Xr=(e,t,i,n)=>{for(var r=n>1?void 0:n?wg(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&xg(t,i,r),r};const se=G,Ja={Spotrebice:["fridge","fridge-outline","dishwasher","washing-machine","tumble-dryer","stove","microwave","coffee-maker","kettle","toaster","blender","food-processor","rice-cooker","slow-cooker","pressure-cooker","air-fryer","oven","range-hood"],Osvetleni:["lightbulb","lightbulb-outline","lamp","ceiling-light","floor-lamp","led-strip","led-strip-variant","wall-sconce","chandelier","desk-lamp","spotlight","light-switch"],"Vytapeni & Chlazeni":["thermometer","thermostat","radiator","radiator-disabled","heat-pump","air-conditioner","fan","hvac","fire","snowflake","fireplace","heating-coil"],"Energie & Baterie":["lightning-bolt","flash","battery","battery-charging","battery-50","battery-10","solar-panel","solar-power","meter-electric","power-plug","power-socket","ev-plug","transmission-tower","current-ac","current-dc"],"Auto & Doprava":["car","car-electric","car-battery","ev-station","ev-plug-type2","garage","garage-open","motorcycle","bicycle","scooter","bus","train","airplane"],Zabezpeceni:["door","door-open","lock","lock-open","shield-home","cctv","camera","motion-sensor","alarm-light","bell","eye","key","fingerprint","shield-check"],"Okna & Stineni":["window-closed","window-open","blinds","blinds-open","curtains","roller-shade","window-shutter","balcony","door-sliding"],"Media & Zabava":["television","speaker","speaker-wireless","music","volume-high","cast","chromecast","radio","headphones","microphone","gamepad","movie","spotify"],"Sit & IT":["router-wireless","wifi","access-point","lan","network","home-assistant","server","nas","cloud","ethernet","bluetooth","cellphone","tablet","laptop"],"Voda & Koupelna":["water","water-percent","water-boiler","water-pump","shower","toilet","faucet","pipe","bathtub","sink","water-heater","pool"],Pocasi:["weather-sunny","weather-cloudy","weather-night","weather-rainy","weather-snowy","weather-windy","weather-fog","weather-lightning","weather-hail","temperature","humidity","barometer"],"Ventilace & Kvalita vzduchu":["fan","air-filter","air-purifier","smoke-detector","co2","wind-turbine"],"Zahrada & Venku":["flower","tree","sprinkler","grass","garden-light","outdoor-lamp","grill","pool","hot-tub","umbrella","thermometer-lines"],Domacnost:["iron","vacuum","broom","mop","washing","basket","hanger","scissors"],"Notifikace & Stav":["information","help-circle","alert-circle","checkbox-marked-circle","check","close","minus","plus","arrow-up","arrow-down","refresh","sync","bell-ring"],Ovladani:["toggle-switch","power","play","pause","stop","skip-next","skip-previous","volume-up","volume-down","brightness-up","brightness-down"],"Cas & Planovani":["clock","timer","alarm","calendar","calendar-clock","schedule","history"],Ostatni:["home","cog","tools","wrench","hammer","chart-line","gauge","dots-vertical","menu","settings","account","logout"]};let en=class extends E{constructor(){super(...arguments),this.isOpen=!1,this.searchQuery=""}get filteredCategories(){const e=this.searchQuery.trim().toLowerCase();if(!e)return Ja;const t=Object.entries(Ja).map(([i,n])=>{const r=n.filter(a=>a.toLowerCase().includes(e));return[i,r]}).filter(([,i])=>i.length>0);return Object.fromEntries(t)}open(){this.isOpen=!0}close(){this.isOpen=!1,this.searchQuery=""}onOverlayClick(e){e.target===e.currentTarget&&this.close()}onSearchInput(e){const t=e.target;this.searchQuery=(t==null?void 0:t.value)??""}onIconClick(e){this.dispatchEvent(new CustomEvent("icon-selected",{detail:{icon:`mdi:${e}`},bubbles:!0,composed:!0})),this.close()}render(){if(!this.isOpen)return null;const e=this.filteredCategories,t=Object.entries(e);return c`
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
            `:t.map(([i,n])=>c`
              <div class="category">
                <div class="category-title">${i}</div>
                <div class="icon-grid">
                  ${n.map(r=>c`
                    <button class="icon-item" type="button" @click=${()=>this.onIconClick(r)}>
                      <span class="icon-emoji">${kn(r)}</span>
                      <span class="icon-name">${r}</span>
                    </button>
                  `)}
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}};en.styles=D`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${se(o.bgPrimary)} 35%, transparent);
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
      background: ${se(o.cardBg)};
      box-shadow: ${se(o.cardShadow)};
      border-radius: 14px;
      border: 1px solid ${se(o.divider)};
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
      border-bottom: 1px solid ${se(o.divider)};
      gap: 12px;
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${se(o.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${se(o.bgSecondary)};
      color: ${se(o.textPrimary)};
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
      background: ${se(o.divider)};
      transform: scale(1.05);
    }

    .search {
      padding: 12px 18px;
      border-bottom: 1px solid ${se(o.divider)};
      background: ${se(o.bgSecondary)};
    }

    .search input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${se(o.divider)};
      background: ${se(o.bgPrimary)};
      color: ${se(o.textPrimary)};
      font-size: 13px;
      outline: none;
    }

    .search input::placeholder {
      color: ${se(o.textSecondary)};
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
      color: ${se(o.textSecondary)};
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
      background: ${se(o.bgSecondary)};
      cursor: pointer;
      transition: transform 0.15s ease, border 0.2s ease, background 0.2s ease;
      text-align: center;
      font-size: 10px;
      color: ${se(o.textSecondary)};
    }

    .icon-item:hover {
      background: ${se(o.bgPrimary)};
      border-color: ${se(o.accent)};
      transform: translateY(-2px);
      color: ${se(o.textPrimary)};
    }

    .icon-emoji {
      font-size: 22px;
      line-height: 1;
      color: ${se(o.textPrimary)};
    }

    .icon-name {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      font-size: 12px;
      color: ${se(o.textSecondary)};
      text-align: center;
      padding: 24px 0 12px;
    }
  `;Xr([f({type:Boolean,reflect:!0,attribute:"open"})],en.prototype,"isOpen",2);Xr([T()],en.prototype,"searchQuery",2);en=Xr([O("oig-icon-picker")],en);var $g=Object.defineProperty,_g=Object.getOwnPropertyDescriptor,me=(e,t,i,n)=>{for(var r=n>1?void 0:n?_g(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&$g(t,i,r),r};const I=G;let ce=class extends E{constructor(){super(...arguments),this.isOpen=!1,this.tileIndex=-1,this.tileSide="left",this.existingConfig=null,this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}loadTileConfig(e){var t,i;this.currentTab=e.type,e.type==="entity"?this.selectedEntityId=e.entity_id:this.selectedButtonEntityId=e.entity_id,this.label=e.label||"",this.icon=e.icon||"",this.color=e.color||"#03A9F4",this.action=e.action||"toggle",this.supportEntity1=((t=e.support_entities)==null?void 0:t.top_right)||"",this.supportEntity2=((i=e.support_entities)==null?void 0:i.bottom_right)||""}resetForm(){this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}handleClose(){this.isOpen=!1,this.resetForm(),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}getEntities(){const e=ot();return e?e.getAll():{}}getEntityItems(e,t){const i=t.trim().toLowerCase(),n=this.getEntities();return Object.entries(n).filter(([a])=>e.some(s=>a.startsWith(s))).map(([a,s])=>{const l=this.getAttributeValue(s,"friendly_name")||a,d=this.getAttributeValue(s,"unit_of_measurement"),u=this.getAttributeValue(s,"icon");return{id:a,name:l,value:s.state,unit:d,icon:u,state:s}}).filter(a=>i?a.name.toLowerCase().includes(i)||a.id.toLowerCase().includes(i):!0).sort((a,s)=>a.name.localeCompare(s.name))}getSupportEntities(e){const t=e.trim().toLowerCase();if(!t)return[];const i=this.getEntities();return Object.entries(i).map(([n,r])=>{const a=this.getAttributeValue(r,"friendly_name")||n,s=this.getAttributeValue(r,"unit_of_measurement"),l=this.getAttributeValue(r,"icon");return{id:n,name:a,value:r.state,unit:s,icon:l,state:r}}).filter(n=>n.name.toLowerCase().includes(t)||n.id.toLowerCase().includes(t)).sort((n,r)=>n.name.localeCompare(r.name)).slice(0,20)}getDisplayIcon(e){return e?e.startsWith("mdi:")?kn(e):e:kn("")}getColorForEntity(e){switch(e.split(".")[0]){case"sensor":return"#03A9F4";case"binary_sensor":return"#4CAF50";case"switch":return"#FFC107";case"light":return"#FF9800";case"fan":return"#00BCD4";case"input_boolean":return"#9C27B0";default:return"#03A9F4"}}applyEntityDefaults(e){if(!e)return;const i=this.getEntities()[e];if(!i)return;this.label||(this.label=this.getAttributeValue(i,"friendly_name"));const n=this.getAttributeValue(i,"icon");!this.icon&&n&&(this.icon=n),this.color=this.getColorForEntity(e)}handleEntitySelect(e){this.selectedEntityId=e,this.applyEntityDefaults(e)}handleButtonEntitySelect(e){this.selectedButtonEntityId=e,this.applyEntityDefaults(e)}handleSupportInput(e,t){const i=t.trim();e===1?(this.supportSearch1=t,this.showSupportList1=!!i,i||(this.supportEntity1="")):(this.supportSearch2=t,this.showSupportList2=!!i,i||(this.supportEntity2=""))}handleSupportSelect(e,t){const i=t.name||t.id;e===1?(this.supportEntity1=t.id,this.supportSearch1=i,this.showSupportList1=!1):(this.supportEntity2=t.id,this.supportSearch2=i,this.showSupportList2=!1)}getSupportInputValue(e,t){if(e)return e;if(!t)return"";const i=this.getEntities()[t];return i&&this.getAttributeValue(i,"friendly_name")||t}getAttributeValue(e,t){var n;const i=(n=e.attributes)==null?void 0:n[t];return i==null?"":String(i)}handleSave(){const e=this.currentTab==="entity"?this.selectedEntityId:this.selectedButtonEntityId;if(!e){window.alert("Vyberte entitu");return}const t={top_right:this.supportEntity1||void 0,bottom_right:this.supportEntity2||void 0},i={type:this.currentTab,entity_id:e,label:this.label||void 0,icon:this.icon||void 0,color:this.color||void 0,action:this.currentTab==="button"?this.action:void 0,support_entities:t};this.dispatchEvent(new CustomEvent("tile-saved",{detail:{index:this.tileIndex,side:this.tileSide,config:i},bubbles:!0,composed:!0})),this.handleClose()}onIconSelected(e){var t;this.icon=((t=e.detail)==null?void 0:t.icon)||"",this.iconPickerOpen=!1}renderEntityList(e,t,i,n){const r=this.getEntityItems(e,t);return r.length===0?c`<div class="support-empty">Žádné entity nenalezeny</div>`:c`
      ${r.map(a=>c`
        <div
          class="entity-item ${i===a.id?"selected":""}"
          @click=${()=>n(a.id)}
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
      ${i.map(n=>c`
        <div
          class="support-item"
          @mousedown=${()=>this.handleSupportSelect(t,n)}
        >
          <div class="support-name">${n.name}</div>
          <div class="support-value">${n.value} ${n.unit}</div>
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
    `:null}};ce.styles=D`
    :host {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      font-family: ${I(o.fontFamily)};
    }

    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${I(o.bgPrimary)} 35%, transparent);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .dialog {
      width: min(520px, 100%);
      max-height: 85vh;
      background: ${I(o.cardBg)};
      border: 1px solid ${I(o.divider)};
      border-radius: 16px;
      box-shadow: ${I(o.cardShadow)};
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
      border-bottom: 1px solid ${I(o.divider)};
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${I(o.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${I(o.bgSecondary)};
      color: ${I(o.textPrimary)};
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
      background: ${I(o.divider)};
      transform: scale(1.05);
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 18px;
      background: ${I(o.bgSecondary)};
      border-bottom: 1px solid ${I(o.divider)};
    }

    .tab-btn {
      border: 1px solid transparent;
      background: ${I(o.cardBg)};
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: ${I(o.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: border 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }

    .tab-btn.active {
      border-color: ${I(o.accent)};
      color: ${I(o.textPrimary)};
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
      color: ${I(o.textSecondary)};
      font-weight: 600;
    }

    .input,
    select,
    .color-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${I(o.divider)};
      background: ${I(o.bgPrimary)};
      color: ${I(o.textPrimary)};
      font-size: 12px;
      outline: none;
      transition: border 0.2s ease, box-shadow 0.2s ease;
    }

    .input::placeholder {
      color: ${I(o.textSecondary)};
    }

    .input:focus,
    select:focus,
    .color-input:focus {
      border-color: ${I(o.accent)};
      box-shadow: 0 0 0 2px color-mix(in srgb, ${I(o.accent)} 20%, transparent);
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
      border: 1px dashed ${I(o.divider)};
      display: grid;
      place-items: center;
      font-size: 22px;
      cursor: pointer;
      background: ${I(o.bgSecondary)};
      transition: border 0.2s ease, transform 0.2s ease;
    }

    .icon-preview:hover {
      border-color: ${I(o.accent)};
      transform: translateY(-1px);
    }

    .icon-field {
      font-size: 11px;
    }

    .icon-btn {
      border: none;
      background: ${I(o.bgSecondary)};
      color: ${I(o.textPrimary)};
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .divider {
      height: 1px;
      background: ${I(o.divider)};
      margin: 6px 0;
      opacity: 0.8;
    }

    .entity-list {
      border: 1px solid ${I(o.divider)};
      border-radius: 12px;
      overflow: hidden;
      max-height: 200px;
      overflow-y: auto;
      background: ${I(o.bgPrimary)};
    }

    .entity-item {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid ${I(o.divider)};
      cursor: pointer;
      align-items: center;
      transition: background 0.2s ease;
    }

    .entity-item:last-child {
      border-bottom: none;
    }

    .entity-item:hover {
      background: ${I(o.bgSecondary)};
    }

    .entity-item.selected {
      background: color-mix(in srgb, ${I(o.accent)} 16%, transparent);
      border-left: 3px solid ${I(o.accent)};
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
      color: ${I(o.textPrimary)};
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-sub {
      font-size: 10px;
      color: ${I(o.textSecondary)};
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
      background: ${I(o.cardBg)};
      border: 1px solid ${I(o.divider)};
      border-radius: 12px;
      z-index: 10;
      max-height: 180px;
      overflow-y: auto;
      box-shadow: ${I(o.cardShadow)};
    }

    .support-item {
      padding: 10px 12px;
      border-bottom: 1px solid ${I(o.divider)};
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
      background: ${I(o.bgSecondary)};
    }

    .support-name {
      font-size: 12px;
      color: ${I(o.textPrimary)};
      font-weight: 600;
    }

    .support-value {
      font-size: 10px;
      color: ${I(o.textSecondary)};
    }

    .support-empty {
      padding: 12px;
      font-size: 11px;
      color: ${I(o.textSecondary)};
      text-align: center;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px 18px;
      border-top: 1px solid ${I(o.divider)};
      background: ${I(o.bgSecondary)};
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
      background: ${I(o.bgPrimary)};
      color: ${I(o.textPrimary)};
      border: 1px solid ${I(o.divider)};
    }

    .btn-primary {
      background: ${I(o.accent)};
      color: #fff;
      box-shadow: 0 6px 14px color-mix(in srgb, ${I(o.accent)} 40%, transparent);
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
  `;me([f({type:Boolean,reflect:!0,attribute:"open"})],ce.prototype,"isOpen",2);me([f({type:Number})],ce.prototype,"tileIndex",2);me([f({attribute:!1})],ce.prototype,"tileSide",2);me([f({attribute:!1})],ce.prototype,"existingConfig",2);me([T()],ce.prototype,"currentTab",2);me([T()],ce.prototype,"entitySearchText",2);me([T()],ce.prototype,"buttonSearchText",2);me([T()],ce.prototype,"selectedEntityId",2);me([T()],ce.prototype,"selectedButtonEntityId",2);me([T()],ce.prototype,"label",2);me([T()],ce.prototype,"icon",2);me([T()],ce.prototype,"color",2);me([T()],ce.prototype,"action",2);me([T()],ce.prototype,"supportEntity1",2);me([T()],ce.prototype,"supportEntity2",2);me([T()],ce.prototype,"supportSearch1",2);me([T()],ce.prototype,"supportSearch2",2);me([T()],ce.prototype,"showSupportList1",2);me([T()],ce.prototype,"showSupportList2",2);me([T()],ce.prototype,"iconPickerOpen",2);ce=me([O("oig-tile-dialog")],ce);var kg=Object.defineProperty,Sg=Object.getOwnPropertyDescriptor,ie=(e,t,i,n)=>{for(var r=n>1?void 0:n?Sg(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&kg(t,i,r),r};const we=G,es=new URLSearchParams(window.location.search),Ct=es.get("sn")||es.get("inverter_sn")||"",ts=`sensor.oig_${Ct}_`,Cg=[{id:"flow",label:"Toky",icon:"⚡"},{id:"pricing",label:"Ceny",icon:"💰"},{id:"boiler",label:"Bojler",icon:"🔥"},{id:"settings",label:"Nastavení",icon:"⚙️"}];let X=class extends E{constructor(){super(...arguments),this.hass=null,this.loading=!0,this.error=null,this.activeTab="flow",this.editMode=!1,this.time="",this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1,this.flowData=Fr,this.pricingData=null,this.pricingLoading=!1,this.boilerState=null,this.boilerLoading=!1,this.boilerV2Data=null,this.boilerConfig=null,this.boilerRefreshTimer=null,this.analyticsData=Sa,this.chmuData=Ii,this.chmuModalOpen=!1,this.timelineTab="today",this.timelineData=null,this.tilesConfig=null,this.tilesLeft=[],this.tilesRight=[],this.tileDialogOpen=!1,this.editingTileIndex=-1,this.editingTileSide="left",this.editingTileConfig=null,this.entityStore=null,this.timeInterval=null,this.stateWatcherUnsub=null,this.tileEntityUnsubs=[],this.pricingDirty=!1,this.timelineDirty=!1,this.analyticsDirty=!1,this.boilerDirty=!1,this.reconnecting=!1,this.throttledUpdateFlow=cr(()=>this.updateFlowData(),500),this.throttledUpdateSensors=cr(()=>this.updateSensorData(),1e3),this.throttledRefreshDerivedData=cr(()=>this.refreshDerivedData(),5e3),this.onPageShow=()=>{this.rebindHassContext()},this.onDocumentVisibilityChange=()=>{document.visibilityState==="visible"&&this.rebindHassContext()}}get boilerLang(){return yc(this.hass)}connectedCallback(){super.connectedCallback(),window.addEventListener("pageshow",this.onPageShow),document.addEventListener("visibilitychange",this.onDocumentVisibilityChange),this.initApp(),this.startTimeUpdate()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("pageshow",this.onPageShow),document.removeEventListener("visibilitychange",this.onDocumentVisibilityChange),this.cleanup()}updated(e){e.has("hass")&&!e.has("loading")&&this.rebindHassContext(),e.has("activeTab")&&(this.activeTab==="pricing"&&(!this.pricingData||this.pricingDirty)&&this.loadPricingData(),this.activeTab==="pricing"&&(this.analyticsData===Sa||this.analyticsDirty)&&this.loadAnalyticsAsync(),this.activeTab==="pricing"&&(!this.timelineData||this.timelineDirty)&&this.loadTimelineTabData(this.timelineTab),this.activeTab==="boiler"&&(!this.boilerState||this.boilerDirty)&&this.loadBoilerDataAsync())}async initApp(){try{const e=await te.getHass();if(!e)throw new Error("Cannot access Home Assistant context");this.hass=e,this.entityStore=dl(e,Ct),await Pt.start({getHass:()=>te.getHassSync(),prefixes:[ts]}),this.stateWatcherUnsub=Pt.onEntityChange((t,i)=>{this.syncHassState(t,i),this.throttledUpdateFlow(),this.throttledUpdateSensors(),this.throttledRefreshDerivedData()}),re.start(),this.updateFlowData(),this.updateSensorData(),this.loadPricingData(),this.loadBoilerDataAsync(),this.loadAnalyticsAsync(),this.loadTilesAsync(),this.loading=!1,_.info("App initialized",{entities:Object.keys(e.states||{}).length,inverterSn:Ct})}catch(e){this.error=e.message,this.loading=!1,_.error("App init failed",e)}}cleanup(){var e,t;(e=this.stateWatcherUnsub)==null||e.call(this),this.stateWatcherUnsub=null,Pt.stop(),re.stop(),this.tileEntityUnsubs.forEach(i=>i()),this.tileEntityUnsubs=[],(t=this.entityStore)==null||t.destroy(),this.entityStore=null,this.timeInterval!==null&&(clearInterval(this.timeInterval),this.timeInterval=null),this.boilerRefreshTimer!==null&&(clearInterval(this.boilerRefreshTimer),this.boilerRefreshTimer=null)}async rebindHassContext(){var e;if(!this.reconnecting){this.reconnecting=!0;try{const t=await te.refreshHass();if(!t)return;this.hass=t,(e=this.entityStore)==null||e.updateHass(t),await Pt.start({getHass:()=>te.getHassSync(),prefixes:[ts]}),this.updateFlowData(),this.updateSensorData()}catch(t){_.error("Failed to rebind hass context",t)}finally{this.reconnecting=!1}}}updateFlowData(){var e;if(this.hass)try{const t=((e=this.entityStore)==null?void 0:e.getAll())??this.hass;this.flowData=Tl(t,Ct)}catch(t){_.error("Failed to extract flow data",t)}}updateSensorData(){if(this.chmuData=kc(Ct),this.activeTab==="pricing"&&(this.analyticsData={...this.analyticsData,...$c()}),this.tilesConfig){const e=ki(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}}updateTilesImmediate(){if(!this.tilesConfig)return;const e=ki(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}subscribeTileEntities(){if(this.tileEntityUnsubs.forEach(t=>t()),this.tileEntityUnsubs=[],!this.tilesConfig||!this.entityStore)return;const e=new Set;[...this.tilesConfig.tiles_left,...this.tilesConfig.tiles_right].forEach(t=>{var i,n;t&&(e.add(t.entity_id),(i=t.support_entities)!=null&&i.top_right&&e.add(t.support_entities.top_right),(n=t.support_entities)!=null&&n.bottom_right&&e.add(t.support_entities.bottom_right))});for(const t of e){const i=this.entityStore.subscribe(t,()=>{this.updateTilesImmediate()});this.tileEntityUnsubs.push(i)}}async loadPricingData(){if(!(!this.hass||this.pricingLoading)){this.pricingLoading=!0;try{const e=await Si(()=>Kl(this.hass));this.pricingData=e,this.pricingDirty=!1}catch(e){_.error("Failed to load pricing data",e)}finally{this.pricingLoading=!1}}}async loadBoilerDataAsync(){if(!(!this.hass||this.boilerLoading)){this.boilerLoading=!0;try{const e=await Si(()=>vc(this.hass));this.boilerState=e.state,this.boilerV2Data=e.v2Data,this.boilerConfig=e.config,this.boilerDirty=!1,this.boilerRefreshTimer||(this.boilerRefreshTimer=window.setInterval(()=>this.loadBoilerDataAsync(),5*60*1e3))}catch(e){_.error("Failed to load boiler data",e)}finally{this.boilerLoading=!1}}}async loadAnalyticsAsync(){try{this.analyticsData=await Si(()=>wc(Ct)),this.analyticsDirty=!1}catch(e){_.error("Failed to load analytics",e)}}async loadTilesAsync(){try{this.tilesConfig=await Si(()=>Mc());const e=ki(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right,this.subscribeTileEntities()}catch(e){_.error("Failed to load tiles config",e)}}async loadTimelineTabData(e){try{this.timelineData=await Si(()=>Pc(Ct,e)),this.timelineDirty=!1}catch(t){_.error(`Failed to load timeline tab: ${e}`,t)}}syncHassState(e,t){if(this.hass){if(this.hass.states||(this.hass.states={}),t){this.hass.states[e]=t;return}delete this.hass.states[e]}}refreshDerivedData(){if(this.pricingDirty=!0,this.timelineDirty=!0,this.analyticsDirty=!0,this.boilerDirty=!0,this.activeTab==="pricing"){Ll(),this.loadPricingData(),this.loadTimelineTabData(this.timelineTab),this.loadAnalyticsAsync();return}this.activeTab==="boiler"&&this.loadBoilerDataAsync()}startTimeUpdate(){const e=()=>{this.time=new Date().toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})};e(),this.timeInterval=window.setInterval(e,1e3)}onTabChange(e){this.activeTab=e.detail.tabId}onGridChargingOpen(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-grid-charging-dialog");e==null||e.show()}onEditClick(){this.editMode=!this.editMode}onResetClick(){var i,n;const e=(i=this.shadowRoot)==null?void 0:i.querySelector("oig-flow-canvas");e!=null&&e.resetLayout&&e.resetLayout();const t=(n=this.shadowRoot)==null?void 0:n.querySelector("oig-grid");t&&t.resetLayout()}onToggleLeftPanel(){this.leftPanelCollapsed=!this.leftPanelCollapsed}onToggleRightPanel(){this.rightPanelCollapsed=!this.rightPanelCollapsed}onChmuBadgeClick(){this.chmuModalOpen=!0}onChmuModalClose(){this.chmuModalOpen=!1}onTimelineTabChange(e){this.timelineTab=e.detail.tab,this.loadTimelineTabData(e.detail.tab)}onTimelineRefresh(){this.loadTimelineTabData(this.timelineTab)}onEditTile(e){const{entityId:t}=e.detail;let i=-1,n="left",r=null;if(this.tilesConfig){const a=this.tilesConfig.tiles_left.findIndex(s=>s&&s.entity_id===t);if(a>=0)i=a,n="left",r=this.tilesConfig.tiles_left[a];else{const s=this.tilesConfig.tiles_right.findIndex(l=>l&&l.entity_id===t);s>=0&&(i=s,n="right",r=this.tilesConfig.tiles_right[s])}}this.editingTileIndex=i,this.editingTileSide=n,this.editingTileConfig=r,this.tileDialogOpen=!0,r&&requestAnimationFrame(()=>{var s;const a=(s=this.shadowRoot)==null?void 0:s.querySelector("oig-tile-dialog");a==null||a.loadTileConfig(r)})}onDeleteTile(e){const{entityId:t}=e.detail;if(!this.tilesConfig||!t)return;const i={...this.tilesConfig};i.tiles_left=i.tiles_left.map(r=>r&&r.entity_id===t?null:r),i.tiles_right=i.tiles_right.map(r=>r&&r.entity_id===t?null:r),this.tilesConfig=i;const n=ki(i);this.tilesLeft=n.left,this.tilesRight=n.right,Ta(i),this.subscribeTileEntities()}onTileSaved(e){const{index:t,side:i,config:n}=e.detail;if(!this.tilesConfig)return;const r={...this.tilesConfig},a=i==="left"?[...r.tiles_left]:[...r.tiles_right];if(t>=0&&t<a.length)a[t]=n;else{const l=a.findIndex(d=>d===null);l>=0?a[l]=n:a.push(n)}i==="left"?r.tiles_left=a:r.tiles_right=a,this.tilesConfig=r;const s=ki(r);this.tilesLeft=s.left,this.tilesRight=s.right,Ta(r),this.subscribeTileEntities()}onTileDialogClose(){this.tileDialogOpen=!1,this.editingTileConfig=null,this.editingTileIndex=-1}_renderBoilerTabSafe(){try{return this._buildBoilerTabContent()}catch(e){return _.error("Boiler tab render failed",e),c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${"render_failed"}></oig-boiler-unavailable-state>`}}_buildBoilerTabContent(){var m,b,v,w,x,y,S,H,N;const e=this.boilerV2Data;if(this.boilerLoading&&!e)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="loading" message=""></oig-boiler-unavailable-state>`;if(e!=null&&e.loadError)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${e.loadError}></oig-boiler-unavailable-state>`;const t=(((m=e==null?void 0:e.explanation)==null?void 0:m.degradedReasons)??[]).filter(K=>K!=="config_profile_unavailable");if(e&&e.status===null&&t.length>0)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="degraded" .message=${t.join(", ")}></oig-boiler-unavailable-state>`;if(!e)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="unavailable" message="Data bojleru nejsou k dispozici"></oig-boiler-unavailable-state>`;const i=((v=(b=this.hass)==null?void 0:b.config)==null?void 0:v.time_zone)??Intl.DateTimeFormat().resolvedOptions().timeZone??"Europe/Prague",n=((w=e.status)==null?void 0:w.heating)??!1,r=(x=e.status)==null?void 0:x.comfortSatisfied,a=n?"Nabíjí":r===!0?"Připraveno":r===!1?"Nedostatek":"Připraveno",s=((y=e.status)==null?void 0:y.degradedFlags)??[],l=s.includes("plan_degraded")?"⚠ Plán s omezenými daty":s.includes("price_degraded")?"⚠ Ceny: stará data":s.includes("forecast_degraded")?"⚠ FVE predikce: stará data":null,d=(((S=e.status)==null?void 0:S.degraded)??!1)&&l!==null,u=((H=e.explanation)==null?void 0:H.dataAgeSecs)??null,p=((N=e.status)==null?void 0:N.lastUpdate)??null,h=u===null?null:u<60?`${Math.round(u)} sekundami`:u<3600?`${Math.round(u/60)} minutami`:`${Math.round(u/3600)} hodinami`,g=p?(()=>{try{const K=new Date(p);return`${String(K.getHours()).padStart(2,"0")}:${String(K.getMinutes()).padStart(2,"0")}:${String(K.getSeconds()).padStart(2,"0")}`}catch{return null}})():null;return c`
      <div class="boiler-header">
        <h1>🔥 Bojler
          <span class="boiler-badge">${a}</span>
          ${d?c`<span class="boiler-badge degr">${l}</span>`:""}
        </h1>
        ${h||g?c`
          <div class="boiler-header-meta">
            ${h?`Aktualizováno před ${h}`:""}
            ${h&&g?" · ":""}
            ${g?`Data k ${g}`:""}
          </div>
        `:""}
      </div>
      <div class="boiler-stage">
        <oig-boiler-metric-panel panelType="source" .data=${e} .config=${this.boilerConfig} .lang=${this.boilerLang}></oig-boiler-metric-panel>
        <oig-boiler-v2-shell .data=${e} .config=${this.boilerConfig} .lang=${this.boilerLang}></oig-boiler-v2-shell>
        <oig-boiler-metric-panel panelType="comfort" .data=${e} .config=${this.boilerConfig} .lang=${this.boilerLang}></oig-boiler-metric-panel>
      </div>
      <oig-boiler-demand-map
        .data=${e.demandMap??null}
        .lang=${this.boilerLang}
      ></oig-boiler-demand-map>
      <oig-boiler-timeline-chart
        .data=${e}
        .config=${this.boilerConfig}
        .lang=${this.boilerLang}
        .timeZone=${i}
      ></oig-boiler-timeline-chart>
      <details data-testid="boiler-advanced-row">
        <summary>Ruční přepis zdroje</summary>
        <oig-boiler-override-panel
          .lang=${this.boilerLang}
          .identity=${e.identity??{entryId:null,boxId:null,available:!1}}
          .currentOverride=${e.manualOverride??null}
        ></oig-boiler-override-panel>
      </details>
    `}render(){if(this.loading)return c`<div class="loading"><div class="spinner"></div><span>Načítání...</span></div>`;if(this.error)return c`
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
          .tabs=${Cg}
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
                ${this.pricingLoading?c`
                  <div class="tab-loading-overlay">
                    <div class="spinner spinner--small"></div>
                    <span>Načítání cen...</span>
                  </div>
                `:P}
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
               `:P}
               ${this._renderBoilerTabSafe()}
               <div data-testid="boiler-setup-guide" class="boiler-setup-guide">
                 <span class="boiler-setup-guide__icon">🧙</span>
                 <div class="boiler-setup-guide__text">
                   <strong>Průvodce nastavením bojleru</strong>
                   <p>Bojler konfigurujte v Nastavení → Zařízení a služby → OIG Cloud → Konfigurovat.</p>
                 </div>
               </div>
             </div>

             <!-- ===== SETTINGS TAB ===== -->
             <div class="tab-content ${this.activeTab==="settings"?"active":""}">
               ${this.activeTab==="settings"?c`<oig-settings></oig-settings>`:P}
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
    `}};X.styles=D`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      font-family: ${we(o.fontFamily)};
      color: ${we(o.textPrimary)};
      background: ${we(o.bgPrimary)};
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
      color: ${we(o.textSecondary)};
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid ${we(o.divider)};
      border-top-color: ${we(o.accent)};
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
      color: ${we(o.error)};
      text-align: center;
      animation: fadeIn 0.3s ease;
    }

    .error h2 {
      margin-bottom: 8px;
    }

    .error button {
      margin-top: 12px;
      padding: 8px 16px;
      background: ${we(o.accent)};
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
      background: ${we(o.bgSecondary)};
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
      grid-template-columns: 1fr 380px 1fr;
      gap: 24px;
      align-items: start;
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

    .boiler-header-meta {
      color: #9aa6b2;
      font-size: 12px;
      margin-bottom: 16px;
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
      background: ${we(o.cardBg)};
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      font-size: 12px;
      color: ${we(o.textSecondary)};
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
      background: ${we(o.cardBg)};
      border: 1px solid ${we(o.divider)};
      border-radius: 8px;
      font-size: 13px;
      color: ${we(o.textSecondary)};
    }

    .boiler-setup-guide__icon {
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
    }

    .boiler-setup-guide__text strong {
      display: block;
      color: ${we(o.textPrimary)};
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
  `;ie([f({type:Object})],X.prototype,"hass",2);ie([T()],X.prototype,"loading",2);ie([T()],X.prototype,"error",2);ie([T()],X.prototype,"activeTab",2);ie([T()],X.prototype,"editMode",2);ie([T()],X.prototype,"time",2);ie([T()],X.prototype,"leftPanelCollapsed",2);ie([T()],X.prototype,"rightPanelCollapsed",2);ie([T()],X.prototype,"flowData",2);ie([T()],X.prototype,"pricingData",2);ie([T()],X.prototype,"pricingLoading",2);ie([T()],X.prototype,"boilerState",2);ie([T()],X.prototype,"boilerLoading",2);ie([T()],X.prototype,"boilerV2Data",2);ie([T()],X.prototype,"boilerConfig",2);ie([T()],X.prototype,"analyticsData",2);ie([T()],X.prototype,"chmuData",2);ie([T()],X.prototype,"chmuModalOpen",2);ie([T()],X.prototype,"timelineTab",2);ie([T()],X.prototype,"timelineData",2);ie([T()],X.prototype,"tilesConfig",2);ie([T()],X.prototype,"tilesLeft",2);ie([T()],X.prototype,"tilesRight",2);ie([T()],X.prototype,"tileDialogOpen",2);ie([T()],X.prototype,"editingTileIndex",2);ie([T()],X.prototype,"editingTileSide",2);ie([T()],X.prototype,"editingTileConfig",2);X=ie([O("oig-app")],X);_.info("V2 starting",{version:"2.0.0-beta.1"});rl();async function Pg(){try{const e=await nl(),t=document.getElementById("app");t&&(t.innerHTML="",t.appendChild(e)),_.info("V2 mounted successfully")}catch(e){_.error("V2 bootstrap failed",e);const t=document.getElementById("app");t&&(t.innerHTML=`
        <div style="padding: 20px; font-family: system-ui;">
          <h2>Chyba načítání</h2>
          <p>Nepodařilo se načíst dashboard. Zkuste obnovit stránku.</p>
          <details>
            <summary>Detaily</summary>
            <pre>${e.message}</pre>
          </details>
        </div>`)}}Pg();
//# sourceMappingURL=index.js.map
