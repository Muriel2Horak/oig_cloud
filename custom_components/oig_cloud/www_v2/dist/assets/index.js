var qs=Object.defineProperty;var Ys=(e,t,i)=>t in e?qs(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var D=(e,t,i)=>Ys(e,typeof t!="symbol"?t+"":t,i);import{f as Us,u as Gs,i as M,a as z,b as c,r as Z,w as Q,A as k,E as Zs}from"./vendor.js";import{C as Un,a as uo,L as ho,P as go,b as fo,i as mo,p as bo,c as yo,d as Qs,T as Xs,e as Js,B as el,f as tl,g as il,h as nl,j as rl,k as vo}from"./charts.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function i(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(r){if(r.ep)return;r.ep=!0;const a=i(r);fetch(r.href,a)}})();const $t="[V2]";function al(){return new Date().toISOString().substr(11,12)}function bn(e,t){const i=al(),n=e.toUpperCase().padEnd(5);return`${i} ${n} ${t}`}const C={debug(e,t){typeof window<"u"&&window.OIG_DEBUG&&console.debug($t,bn("debug",e),t??"")},info(e,t){console.info($t,bn("info",e),t??"")},warn(e,t){console.warn($t,bn("warn",e),t??"")},error(e,t,i){const n=t?{error:t.message,stack:t.stack,...i}:i;console.error($t,bn("error",e),n??"")},time(e){console.time(`${$t} ${e}`)},timeEnd(e){console.timeEnd(`${$t} ${e}`)},group(e){console.group(`${$t} ${e}`)},groupEnd(){console.groupEnd()}};function ol(){window.addEventListener("error",sl),window.addEventListener("unhandledrejection",ll),C.debug("Error handling setup complete")}function sl(e){const t=e.error||new Error(e.message);C.error("Uncaught error",t,{filename:e.filename,lineno:e.lineno,colno:e.colno}),e.preventDefault()}function ll(e){const t=e.reason instanceof Error?e.reason:new Error(String(e.reason));C.error("Unhandled promise rejection",t),e.preventDefault()}class xo extends Error{constructor(t,i,n=!1,r){super(t),this.code=i,this.recoverable=n,this.cause=r,this.name="AppError"}}class Si extends xo{constructor(t="Authentication failed"){super(t,"AUTH_ERROR",!1),this.name="AuthError"}}class ga extends xo{constructor(t="Network error",i){super(t,"NETWORK_ERROR",!0,i),this.name="NetworkError"}}const cl="oig_v2_";function dl(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"";return/Home Assistant|HomeAssistant|HAcompanion/i.test(t)}catch{return!1}}function pl(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"",i=/Android|iPhone|iPad|iPod|Mobile/i.test(t),n=globalThis.innerWidth<=768;return i||n}catch{return!1}}const Ee={isHaApp:!1,isMobile:!1,reduceMotion:!1};async function ul(){var i,n;C.info("Bootstrap starting"),ol(),Ee.isHaApp=dl(),Ee.isMobile=pl(),Ee.reduceMotion=Ee.isHaApp||Ee.isMobile||((n=(i=globalThis.matchMedia)==null?void 0:i.call(globalThis,"(prefers-reduced-motion: reduce)"))==null?void 0:n.matches)||!1;const e=document.documentElement;Ee.isHaApp&&e.classList.add("oig-ha-app"),Ee.isMobile&&e.classList.add("oig-mobile"),Ee.reduceMotion&&e.classList.add("oig-reduce-motion");const t={version:"2.0.0-beta.1",storagePrefix:cl};return C.info("Bootstrap complete",{...t,isHaApp:Ee.isHaApp,isMobile:Ee.isMobile,reduceMotion:Ee.reduceMotion}),document.createElement("oig-app")}const s={bgPrimary:"var(--primary-background-color, #ffffff)",bgSecondary:"var(--secondary-background-color, #f5f5f5)",textPrimary:"var(--primary-text-color, #212121)",textSecondary:"var(--secondary-text-color, #757575)",accent:"var(--accent-color, #03a9f4)",divider:"var(--divider-color, #e0e0e0)",error:"var(--error-color, #db4437)",success:"var(--success-color, #0f9d58)",warning:"var(--warning-color, #f4b400)",cardBg:"var(--card-background-color, #ffffff)",cardShadow:"var(--shadow-elevation-2dp_-_box-shadow, 0 2px 2px 0 rgba(0,0,0,0.14))",fontFamily:"var(--primary-font-family, system-ui, sans-serif)"},fa={"--primary-background-color":"#111936","--secondary-background-color":"#1a2044","--primary-text-color":"#e1e1e1","--secondary-text-color":"rgba(255,255,255,0.7)","--accent-color":"#03a9f4","--divider-color":"rgba(255,255,255,0.12)","--error-color":"#ef5350","--success-color":"#66bb6a","--warning-color":"#ffa726","--card-background-color":"rgba(255,255,255,0.06)","--shadow-elevation-2dp_-_box-shadow":"0 2px 4px 0 rgba(0,0,0,0.4)"},ma={"--primary-background-color":"#ffffff","--secondary-background-color":"#f5f5f5","--primary-text-color":"#212121","--secondary-text-color":"#757575","--accent-color":"#03a9f4","--divider-color":"#e0e0e0","--error-color":"#db4437","--success-color":"#0f9d58","--warning-color":"#f4b400","--card-background-color":"#ffffff","--shadow-elevation-2dp_-_box-shadow":"0 2px 2px 0 rgba(0,0,0,0.14)"};function lr(){var e,t;try{if(window.parent&&window.parent!==window){const i=(t=(e=window.parent.document)==null?void 0:e.querySelector("home-assistant"))==null?void 0:t.hass;if(i!=null&&i.themes){if(typeof i.themes.darkMode=="boolean")return i.themes.darkMode;const n=(i.themes.theme||"").toLowerCase();if(n.includes("dark"))return!0;if(n.includes("light"))return!1}}}catch{}return window.matchMedia("(prefers-color-scheme: dark)").matches}function cr(e){const t=e?fa:ma,i=document.documentElement;for(const[n,r]of Object.entries(t))i.style.setProperty(n,r);i.classList.toggle("dark",e),document.body.style.background=e?fa["--secondary-background-color"]:ma["--secondary-background-color"]}function hl(){const e=lr();cr(e),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{const i=lr();cr(i)}),setInterval(()=>{const i=lr(),n=document.documentElement.classList.contains("dark");i!==n&&cr(i)},5e3)}const ba={mobile:768,tablet:1024};function ti(e){return e<ba.mobile?"mobile":e<ba.tablet?"tablet":"desktop"}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const E=e=>(t,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const gl={attribute:!0,type:String,converter:Gs,reflect:!1,hasChanged:Us},fl=(e=gl,t,i)=>{const{kind:n,metadata:r}=i;let a=globalThis.litPropertyMetadata.get(r);if(a===void 0&&globalThis.litPropertyMetadata.set(r,a=new Map),n==="setter"&&((e=Object.create(e)).wrapped=!0),a.set(i.name,e),n==="accessor"){const{name:o}=i;return{set(l){const d=t.get.call(this);t.set.call(this,l),this.requestUpdate(o,d,e,!0,l)},init(l){return l!==void 0&&this.C(o,void 0,e,l),l}}}if(n==="setter"){const{name:o}=i;return function(l){const d=this[o];t.call(this,l),this.requestUpdate(o,d,e,!0,l)}}throw Error("Unsupported decorator location: "+n)};function f(e){return(t,i)=>typeof i=="object"?fl(e,t,i):((n,r,a)=>{const o=r.hasOwnProperty(a);return r.constructor.createProperty(a,n),o?Object.getOwnPropertyDescriptor(r,a):void 0})(e,t,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function T(e){return f({...e,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ml=(e,t,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof t!="object"&&Object.defineProperty(e,t,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Gn(e,t){return(i,n,r)=>{const a=o=>{var l;return((l=o.renderRoot)==null?void 0:l.querySelector(e))??null};return ml(i,n,{get(){return a(this)}})}}class bl{constructor(){this.callbacks=new Set,this.watched=new Set,this.watchedPrefixes=new Set,this.unsub=null,this.running=!1,this.getHass=null,this.activeConnection=null}registerEntities(t){for(const i of t)typeof i=="string"&&i.length>0&&this.watched.add(i)}registerPrefix(t){var n;if(typeof t!="string"||t.length===0)return;this.watchedPrefixes.add(t);const i=(n=this.getHass)==null?void 0:n.call(this);if(i!=null&&i.states){const r=Object.keys(i.states).filter(a=>a.startsWith(t));this.registerEntities(r)}}onEntityChange(t){return this.callbacks.add(t),()=>{this.callbacks.delete(t)}}async start(t){this.getHass=t.getHass;const i=this.getHass();if(!(i!=null&&i.connection)){C.debug("StateWatcher: hass not ready, retrying in 500ms"),setTimeout(()=>this.start(t),500);return}if(this.running&&this.activeConnection===i.connection){const r=t.prefixes??[];for(const a of r)this.registerPrefix(a);return}this.running&&this.stop(),this.running=!0,this.activeConnection=i.connection;const n=t.prefixes??[];for(const r of n)this.registerPrefix(r);try{this.unsub=await i.connection.subscribeEvents(r=>this.handleStateChanged(r),"state_changed"),C.info("StateWatcher started",{prefixes:n,watchedCount:this.watched.size})}catch(r){this.running=!1,this.activeConnection=null,C.error("StateWatcher failed to subscribe",r)}}stop(){if(this.running=!1,this.activeConnection=null,this.unsub)try{this.unsub()}catch{}this.unsub=null,C.info("StateWatcher stopped")}isWatched(t){return this.matchesWatched(t)}destroy(){this.stop(),this.callbacks.clear(),this.watched.clear(),this.watchedPrefixes.clear(),this.getHass=null}matchesWatched(t){if(this.watched.has(t))return!0;for(const i of this.watchedPrefixes)if(t.startsWith(i))return!0;return!1}handleStateChanged(t){var r;const i=(r=t==null?void 0:t.data)==null?void 0:r.entity_id;if(!i||!this.matchesWatched(i))return;const n=t.data.new_state;for(const a of this.callbacks)try{a(i,n)}catch{}}}const Dt=new bl;class yl{constructor(t,i=""){this.subscriptions=new Map,this.cache=new Map,this.stateWatcherUnsub=null,this.hass=t,this.inverterSn=i,this.init()}init(){var t;if((t=this.hass)!=null&&t.states)for(const[i,n]of Object.entries(this.hass.states))this.cache.set(i,n);this.stateWatcherUnsub=Dt.onEntityChange((i,n)=>{n?this.cache.set(i,n):this.cache.delete(i),this.notifySubscribers(i,n)}),C.debug("EntityStore initialized",{entities:this.cache.size,inverterSn:this.inverterSn})}getSensorId(t){return`sensor.oig_${this.inverterSn}_${t}`}findSensorId(t){const i=this.getSensorId(t);for(const n of this.cache.keys()){if(n===i)return n;if(n.startsWith(i+"_")){const r=n.substring(i.length+1);if(/^\d+$/.test(r))return n}}return i}subscribe(t,i){this.subscriptions.has(t)||this.subscriptions.set(t,new Set),this.subscriptions.get(t).add(i),Dt.registerEntities([t]);const n=this.cache.get(t)??null;return i(n),()=>{var r,a;(r=this.subscriptions.get(t))==null||r.delete(i),((a=this.subscriptions.get(t))==null?void 0:a.size)===0&&this.subscriptions.delete(t)}}getNumeric(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"&&parseFloat(i.state)||0,lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:0,lastUpdated:null,attributes:{},exists:!1}}getString(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"?i.state:"",lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:"",lastUpdated:null,attributes:{},exists:!1}}get(t){return this.cache.get(t)??null}getAll(){return Object.fromEntries(this.cache)}batchLoad(t){const i={};for(const n of t)i[n]=this.getNumeric(n);return i}updateHass(t){if(this.hass=t,t!=null&&t.states){const i=new Set(Object.keys(t.states));for(const n of Array.from(this.cache.keys()))i.has(n)||(this.cache.delete(n),this.notifySubscribers(n,null));for(const[n,r]of Object.entries(t.states)){const a=this.cache.get(n),o=r;this.cache.set(n,o),((a==null?void 0:a.state)!==o.state||(a==null?void 0:a.last_updated)!==o.last_updated)&&this.notifySubscribers(n,o)}}}notifySubscribers(t,i){const n=this.subscriptions.get(t);if(n)for(const r of n)try{r(i)}catch(a){C.error("Entity callback error",a,{entityId:t})}}destroy(){var t;(t=this.stateWatcherUnsub)==null||t.call(this),this.subscriptions.clear(),this.cache.clear(),C.debug("EntityStore destroyed")}}let Fi=null;function vl(e,t){return Fi&&Fi.destroy(),Fi=new yl(e,t),Fi}function dt(){return Fi}const xl=3,wl=1e3;class $l{constructor(){this.hass=null,this.initPromise=null}async getHass(){return this.hass?this.hass:this.initPromise?this.initPromise:(this.initPromise=this.initHass(),this.initPromise)}getHassSync(){return this.hass}async refreshHass(){const t=await this.findHass();return t?(this.hass=t,C.info("HASS client refreshed"),t):this.hass}async initHass(){C.debug("Initializing HASS client");const t=await this.findHass();return t?(this.hass=t,C.info("HASS client initialized"),t):(C.warn("HASS not found in parent context"),null)}async findHass(){var t,i;if(typeof window>"u")return null;if(window.hass)return window.hass;if(window.parent&&window.parent!==window)try{const n=(i=(t=window.parent.document)==null?void 0:t.querySelector("home-assistant"))==null?void 0:i.hass;if(n)return n}catch{C.debug("Cannot access parent HASS (cross-origin)")}return window.customPanel?window.customPanel.hass:null}async fetchWithAuth(t,i={}){var o,l;const n=await this.getHass();if(!n)throw new Si("Cannot get HASS context");try{const p=new URL(t,window.location.href).hostname;if(p!=="localhost"&&p!=="127.0.0.1"&&!t.startsWith("/api/"))throw new Error(`fetchWithAuth rejected for non-localhost URL: ${t}`)}catch(d){if(d.message.includes("rejected"))throw d}const r=(l=(o=n.auth)==null?void 0:o.data)==null?void 0:l.access_token;if(!r)throw new Si("No access token available");const a=new Headers(i.headers);return a.set("Authorization",`Bearer ${r}`),a.has("Content-Type")||a.set("Content-Type","application/json"),this.fetchWithRetry(t,{...i,headers:a})}async fetchWithRetry(t,i,n=xl){try{const r=await fetch(t,i);if(!r.ok)throw r.status===401?new Si("Token expired or invalid"):new ga(`HTTP ${r.status}: ${r.statusText}`);return r}catch(r){if(n>0&&r instanceof ga)return C.warn(`Retrying fetch (${n} left)`,{url:t}),await this.delay(wl),this.fetchWithRetry(t,i,n-1);throw r}}async callApi(t,i,n){const r=await this.getHass();if(!r)throw new Si("Cannot get HASS context");return r.callApi(t,i,n)}async callService(t,i,n){const r=await this.getHass();if(!(r!=null&&r.callService))return C.error("Cannot call service — hass not available"),!1;try{return await r.callService(t,i,n),!0}catch(a){return C.error(`Service call failed (${t}.${i})`,a),!1}}async callWS(t){const i=await this.getHass();if(!(i!=null&&i.callWS))throw new Si("Cannot get HASS context for WS call");return i.callWS(t)}async fetchOIGAPI(t,i={}){try{const n=`/api/oig_cloud${t.startsWith("/")?"":"/"}${t}`;return await(await this.fetchWithAuth(n,{...i,headers:{"Content-Type":"application/json",...Object.fromEntries(new Headers(i.headers).entries())}})).json()}catch(n){return C.error(`OIG API fetch error for ${t}`,n),null}}async loadBatteryTimeline(t,i="active"){return this.fetchOIGAPI(`/battery_forecast/${t}/timeline?type=${i}`)}async loadUnifiedCostTile(t){return this.fetchOIGAPI(`/battery_forecast/${t}/unified_cost_tile`)}async loadSpotPrices(t){return this.fetchOIGAPI(`/spot_prices/${t}/intervals`)}async loadAnalytics(t){return this.fetchOIGAPI(`/analytics/${t}`)}async loadPlannerSettings(t){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`)}async savePlannerSettings(t,i){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`,{method:"POST",body:JSON.stringify(i)})}async loadDetailTabs(t,i,n="hybrid"){return this.fetchOIGAPI(`/battery_forecast/${t}/detail_tabs?tab=${i}&plan=${n}`)}async loadModules(t){return this.fetchOIGAPI(`/${t}/modules`)}openEntityDialog(t){var i;try{const n=((i=window.parent.document)==null?void 0:i.querySelector("home-assistant"))??document.querySelector("home-assistant");if(!n)return C.warn("Cannot open entity dialog — home-assistant element not found"),!1;const r=new CustomEvent("hass-more-info",{bubbles:!0,composed:!0,detail:{entityId:t}});return n.dispatchEvent(r),!0}catch(n){return C.error("Cannot open entity dialog",n),!1}}async showNotification(t,i,n="success"){await this.callService("persistent_notification","create",{title:t,message:i,notification_id:`oig_dashboard_${Date.now()}`})||console.log(`[${n.toUpperCase()}] ${t}: ${i}`)}getToken(){var t,i,n;return((n=(i=(t=this.hass)==null?void 0:t.auth)==null?void 0:i.data)==null?void 0:n.access_token)??null}delay(t){return new Promise(i=>setTimeout(i,t))}}const ne=new $l,ya={solar:"#ffd54f",battery:"#4caf50",inverter:"#9575cd",grid:"#42a5f5",house:"#f06292"},Ci={solar:"linear-gradient(135deg, rgba(255,213,79,0.15) 0%, rgba(255,179,0,0.08) 100%)",battery:"linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(56,142,60,0.08) 100%)",grid:"linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(33,150,243,0.08) 100%)",house:"linear-gradient(135deg, rgba(240,98,146,0.15) 0%, rgba(233,30,99,0.08) 100%)",inverter:"linear-gradient(135deg, rgba(149,117,205,0.15) 0%, rgba(126,87,194,0.08) 100%)"},yn={battery:"rgba(76,175,80,0.4)",grid:"rgba(66,165,245,0.4)",house:"rgba(240,98,146,0.4)",inverter:"rgba(149,117,205,0.4)"},Kt={solar:"#ffd54f",battery:"#ff9800",grid_import:"#f44336",grid_export:"#4caf50",house:"#f06292"},vn={solar:5400,battery:7e3,grid:17e3,house:1e4},Kr={solarPower:0,solarP1:0,solarP2:0,solarV1:0,solarV2:0,solarI1:0,solarI2:0,solarPercent:0,solarToday:0,solarForecastToday:0,solarForecastTomorrow:0,solarForecastStale:!1,batterySoC:0,batteryPower:0,batteryVoltage:0,batteryCurrent:0,batteryTemp:0,batteryChargeTotal:0,batteryDischargeTotal:0,batteryChargeSolar:0,batteryChargeGrid:0,isGridCharging:!1,timeToEmpty:"",timeToFull:"",balancingState:"standby",balancingTimeRemaining:"",gridChargingPlan:{hasBlocks:!1,totalEnergyKwh:0,totalCostCzk:0,windowLabel:null,durationMinutes:0,currentBlockLabel:null,nextBlockLabel:null,blocks:[]},gridPower:0,gridVoltage:0,gridFrequency:0,gridImportToday:0,gridExportToday:0,gridL1V:0,gridL2V:0,gridL3V:0,gridL1P:0,gridL2P:0,gridL3P:0,spotPrice:0,exportPrice:0,currentTariff:"",housePower:0,houseTodayWh:0,houseL1:0,houseL2:0,houseL3:0,nonbackupPower:0,nonbackupTodayWh:0,nonbackupL1:0,nonbackupL2:0,nonbackupL3:0,zalohaPlannedRemainingKwh:0,inverterMode:"",inverterGridMode:"unknown",inverterGridLimit:0,inverterTemp:0,bypassStatus:"off",notificationsUnread:0,notificationsError:0,boilerIsUse:!1,boilerPower:0,boilerDayEnergy:0,boilerManualMode:"",boilerInstallPower:3e3,plannerAutoMode:null,lastUpdate:""},wo={home_1:"Home 1",home_2:"Home 2",home_3:"Home 3",home_ups:"Home UPS"},va={"Home 1":"home_1","Home 2":"home_2","Home 3":"home_3","Home UPS":"home_ups","Mode 0":"home_1","Mode 1":"home_2","Mode 2":"home_3","Mode 3":"home_ups","HOME I":"home_1","HOME II":"home_2","HOME III":"home_3","HOME UPS":"home_ups",0:"home_1",1:"home_2",2:"home_3",3:"home_ups"},Ii={off:"Vypnuto",on:"Zapnuto",limited:"S omezením"},dr={Vypnuto:"off",Zapnuto:"on",Omezeno:"limited",omezeno:"limited",vypnuto:"off",zapnuto:"on",Off:"off",On:"on",Limited:"limited",off:"off",on:"on",limited:"limited",0:"off",1:"on",2:"limited"},_l={off:"🚫",on:"💧",limited:"🚰"},$o={cbb:"Inteligentní",manual:"Manuální"},_o={cbb:"🤖",manual:"👤"},xa={CBB:"cbb",Manuální:"manual",Manual:"manual",Inteligentní:"cbb"},kl={set_box_mode:"🏠 Změna režimu boxu",set_grid_delivery:"💧 Změna nastavení přetoků",set_grid_delivery_limit:"🔢 Změna limitu přetoků",set_boiler_mode:"🔥 Změna nastavení bojleru",set_formating_mode:"🔋 Změna nabíjení baterie",set_battery_capacity:"⚡ Změna kapacity baterie"},Sl={CBB:"Inteligentní",Manual:"Manuální",Manuální:"Manuální"},ko={0:"Žádný",1:"Home 5",2:"Home 6",3:"Home 5 + Home 6",4:"Flexibilita"},So={status:"idle",activity:"",queueCount:0,runningRequests:[],queuedRequests:[],allRequests:[],currentBoxMode:"home_1",currentGridDelivery:"off",currentGridLimit:0,currentBoilerMode:"cbb",pendingServices:new Map,changingServices:new Set,gridDeliveryState:{currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},supplementary:{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1}},Cl="probíhá změna";function Dr(e){return e.trim().toLowerCase().includes(Cl)}function qr(e){const t=e.trim();if(t in dr)return dr[t];const i=t.toLowerCase(),n=Object.entries(dr).find(([r])=>r.toLowerCase()===i);return n?n[1]:i.startsWith("omez")||i.includes("limit")?"limited":i.startsWith("zapn")||i==="on"?"on":i.startsWith("vypn")||i==="off"?"off":"unknown"}function Pl(e){const t=e.get("grid_mode");if(!t)return null;const i=qr(t);return i==="unknown"?null:i}function Tl(e){const t=e.get("grid_limit");if(!t)return null;const i=parseInt(t,10);return Number.isFinite(i)&&i>=0?i:null}function Ml(e){return e.changingServices.has("grid_mode")||e.changingServices.has("grid_limit")}function Co(e,t){const{gridModeRaw:i,gridLimit:n}=e,r=i.trim().toLowerCase(),a=r==="unavailable"||r==="unknown"||r==="",o=Dr(i),l=Ml(t),d=o||l;let p;a||o?p="unknown":p=qr(i);let u=null;!a&&Number.isFinite(n)&&n>=0&&(u=n);const h=Pl(t.pendingServices),g=Tl(t.pendingServices);return{currentLiveDelivery:p,currentLiveLimit:u,pendingDeliveryTarget:h,pendingLimitTarget:g,isTransitioning:d,isUnavailable:a}}function Dl(e){return e.isTransitioning&&e.pendingDeliveryTarget?e.pendingDeliveryTarget:e.currentLiveDelivery}const wa=new URLSearchParams(window.location.search),Yr=wa.get("sn")||wa.get("inverter_sn")||"";function Sn(e,t=Yr){return`sensor.oig_${t}_${e}`}function $a(e,t,i=Yr){var a;const n=Sn(t,i);return n in e?n:((a=Object.keys(e).filter(o=>o.startsWith(n+"_")).map(o=>({id:o,suffix:parseInt(o.substring(n.length+1),10)})).filter(o=>Number.isFinite(o.suffix)).sort((o,l)=>o.suffix-l.suffix)[0])==null?void 0:a.id)??null}function R(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function Ke(e){return!(e!=null&&e.state)||e.state==="unknown"||e.state==="unavailable"?"":e.state}function _a(e,t="on"){if(!(e!=null&&e.state))return!1;const i=e.state.toLowerCase();return i===t||i==="1"||i==="zapnuto"}function zl(e){const t=(e||"").toLowerCase();return t==="charging"?"charging":t==="balancing"||t==="holding"?"holding":t==="completed"?"completed":t==="planned"?"planned":"standby"}function zr(e){return e==="tomorrow"?"zítra":e==="today"?"dnes":""}function ka(e){if(!e)return null;const[t,i]=e.split(":").map(Number);return!Number.isFinite(t)||!Number.isFinite(i)?null:t*60+i}function El(e){const t=Number(e.grid_import_kwh??e.grid_charge_kwh??0);if(Number.isFinite(t)&&t>0)return t;const i=Number(e.battery_start_kwh??0),n=Number(e.battery_end_kwh??0);return Number.isFinite(i)&&Number.isFinite(n)?Math.max(0,n-i):0}function Po(e=[]){return[...e].sort((t,i)=>{const n=(t.day==="tomorrow"?1:0)-(i.day==="tomorrow"?1:0);return n!==0?n:(t.time_from||"").localeCompare(i.time_from||"")})}function Ol(e){if(!Array.isArray(e)||e.length===0)return null;const t=Po(e),i=t[0],n=t.at(-1),r=zr(i==null?void 0:i.day),a=zr(n==null?void 0:n.day);if(r===a){const g=r?`${r} `:"";return!(i!=null&&i.time_from)||!(n!=null&&n.time_to)?g.trim()||null:`${g}${i.time_from} – ${n.time_to}`}const o=r?`${r} `:"",l=a?`${a} `:"",d=(i==null?void 0:i.time_from)||"--",p=(n==null?void 0:n.time_to)||"--",u=i?`${o}${d}`:"--",h=n?`${l}${p}`:"--";return`${u} → ${h}`}function Ll(e){if(!Array.isArray(e)||e.length===0)return 0;let t=0;return e.forEach(i=>{const n=ka(i.time_from),r=ka(i.time_to);if(n===null||r===null)return;const a=r-n;a>0&&(t+=a)}),t}function Sa(e){const t=zr(e.day),i=t?`${t} `:"",n=e.time_from||"--",r=e.time_to||"--";return`${i}${n} - ${r}`}function Al(e){const t=e.find(r=>{const a=(r.status||"").toLowerCase();return a==="running"||a==="active"})||null,i=t?e[e.indexOf(t)+1]||null:e[0]||null;return{runningBlock:t,upcomingBlock:i,shouldShowNext:!!(i&&(!t||i!==t))}}function Fl(e){const t=(e==null?void 0:e.attributes)||{},i=Array.isArray(t.charging_blocks)?t.charging_blocks:[],n=Po(i),r=Number(t.total_energy_kwh)||0,a=r>0?r:n.reduce((m,b)=>m+El(b),0),o=Number(t.total_cost_czk)||0,l=o>0?o:n.reduce((m,b)=>m+Number(b.total_cost_czk||0),0),d=Ol(n),p=Ll(n),{runningBlock:u,upcomingBlock:h,shouldShowNext:g}=Al(n);return{hasBlocks:n.length>0,totalEnergyKwh:a,totalCostCzk:l,windowLabel:d,durationMinutes:p,currentBlockLabel:u?Sa(u):null,nextBlockLabel:g&&h?Sa(h):null,blocks:n}}function Il(e,t=Yr){var la,ca,da,pa;const i=(e==null?void 0:e.states)||e||{},n=sr=>i[Sn(sr,t)]||null,r=R(n("actual_fv_p1")),a=R(n("actual_fv_p2")),o=R(n("extended_fve_voltage_1")),l=R(n("extended_fve_voltage_2")),d=R(n("extended_fve_current_1")),p=R(n("extended_fve_current_2")),u=n("solar_forecast"),h=sr=>{var ha;const mn=(ha=u==null?void 0:u.attributes)==null?void 0:ha[sr];if(mn==null||mn==="")return null;const ua=parseFloat(mn);return Number.isFinite(ua)?ua:null},g=h("today_total_kwh")??h("today_total_sum_kw")??R(u),m=h("tomorrow_total_kwh")??h("tomorrow_total_sum_kw")??0,b=((la=u==null?void 0:u.attributes)==null?void 0:la.forecast_stale)===!0,y=R(n("batt_bat_c")),_=R(n("batt_batt_comp_p")),$=R(n("extended_battery_voltage")),v=R(n("extended_battery_current")),P=R(n("extended_battery_temperature")),j=R(n("computed_batt_charge_energy_today")),B=R(n("computed_batt_discharge_energy_today")),K=R(n("computed_batt_charge_fve_energy_today")),S=R(n("computed_batt_charge_grid_energy_today")),L=n("grid_charging_planned"),A=_a(L),U=Ke(n("time_to_empty")),Y=Ke(n("time_to_full")),N=n("battery_balancing"),q=zl((ca=N==null?void 0:N.attributes)==null?void 0:ca.current_state),Te=Ke({state:(da=N==null?void 0:N.attributes)==null?void 0:da.time_remaining}),it=Fl(L),nt=R(n("actual_aci_wtotal")),xe=R(n("extended_grid_voltage")),x=R(n("ac_in_aci_f")),ee=R(n("ac_in_ac_ad")),de=R(n("ac_in_ac_pd")),ki=R(n("ac_in_aci_vr")),Ne=R(n("ac_in_aci_vs")),We=R(n("ac_in_aci_vt")),ps=R(n("actual_aci_wr")),us=R(n("actual_aci_ws")),hs=R(n("actual_aci_wt")),gs=R(n("spot_price_current_15min")),fs=R(n("export_price_current_15min")),ms=Ke(n("current_tariff")),bs=R(n("actual_aco_p")),ys=R(n("ac_out_en_day")),vs=R(n("ac_out_aco_pr")),xs=R(n("ac_out_aco_ps")),ws=R(n("ac_out_aco_pt")),$s=R(n("actual_acinb_wtotal")),_s=R(n("computed_nonbackup_consumption_today")),ks=R(n("actual_acinb_wr")),Ss=R(n("actual_acinb_ws")),Cs=R(n("actual_acinb_wt")),nr=n("battery_forecast"),Ps=Number((pa=nr==null?void 0:nr.attributes)==null?void 0:pa.planned_consumption_today)||0,Ts=Ke(n("box_prms_mode")),Ms=$a(i,"invertor_prms_to_grid",t)||Sn("invertor_prms_to_grid",t),Ds=$a(i,"invertor_prm1_p_max_feed_grid",t)||Sn("invertor_prm1_p_max_feed_grid",t),rr=i[Ms],ar=i[Ds],zs=(rr==null?void 0:rr.state)??"",Es=parseFloat((ar==null?void 0:ar.state)??"")||0,sa=Co({gridModeRaw:zs,gridLimit:Es},{pendingServices:new Map,changingServices:new Set}),Os=sa.currentLiveDelivery,Ls=sa.currentLiveLimit??0,As=R(n("box_temp")),Fs=Ke(n("bypass_status"))||"off",Is=R(n("notification_count_unread")),Bs=R(n("notification_count_error")),or=n("boiler_is_use"),Ns=or?_a(or)||Ke(or)==="Zapnuto":!1,Rs=R(n("boiler_current_cbb_w")),js=R(n("boiler_day_w")),Hs=Ke(n("boiler_manual_mode")),Vs=R(n("boiler_install_power"))||3e3,Ws=n("real_data_update"),Ks=Ke(Ws);return{solarPower:r+a,solarP1:r,solarP2:a,solarV1:o,solarV2:l,solarI1:d,solarI2:p,solarPercent:R(n("dc_in_fv_proc")),solarToday:R(n("dc_in_fv_ad")),solarForecastToday:g,solarForecastTomorrow:m,solarForecastStale:b,batterySoC:y,batteryPower:_,batteryVoltage:$,batteryCurrent:v,batteryTemp:P,batteryChargeTotal:j,batteryDischargeTotal:B,batteryChargeSolar:K,batteryChargeGrid:S,isGridCharging:A,timeToEmpty:U,timeToFull:Y,balancingState:q,balancingTimeRemaining:Te,gridChargingPlan:it,gridPower:nt,gridVoltage:xe,gridFrequency:x,gridImportToday:ee,gridExportToday:de,gridL1V:ki,gridL2V:Ne,gridL3V:We,gridL1P:ps,gridL2P:us,gridL3P:hs,spotPrice:gs,exportPrice:fs,currentTariff:ms,housePower:bs,houseTodayWh:ys,houseL1:vs,houseL2:xs,houseL3:ws,nonbackupPower:$s,nonbackupTodayWh:_s,nonbackupL1:ks,nonbackupL2:Ss,nonbackupL3:Cs,zalohaPlannedRemainingKwh:Ps,inverterMode:Ts,inverterGridMode:Os,inverterGridLimit:Ls,inverterTemp:As,bypassStatus:Fs,notificationsUnread:Is,notificationsError:Bs,boilerIsUse:Ns,boilerPower:Rs,boilerDayEnergy:js,boilerManualMode:Hs,boilerInstallPower:Vs,plannerAutoMode:null,lastUpdate:Ks}}const Pi={};function xn(e,t,i){const n=Math.abs(e),r=Math.min(100,n/t*100),a=Math.max(500,Math.round(3500-r*30));let o=a;return i&&Pi[i]!==void 0&&(o=Math.round(.3*a+(1-.3)*Pi[i]),Math.abs(o-Pi[i])<100&&(o=Pi[i])),i&&(Pi[i]=o),{active:n>=50,intensity:r,count:Math.max(1,Math.min(4,Math.ceil(1+r/33))),speed:o,size:Math.round(6+r/10),opacity:Math.min(1,.3+r/150)}}function rt(e){return Math.abs(e)>=1e3?`${(e/1e3).toFixed(1)} kW`:`${Math.round(e)} W`}function at(e){return e>=1e3?`${(e/1e3).toFixed(2)} kWh`:`${Math.round(e)} Wh`}function Bl(e){return e==="VT"||e.includes("vysoký")?"⚡ VT":e==="NT"||e.includes("nízký")?"🌙 NT":e?`⏰ ${e}`:"--"}function Nl(e){return e.includes("Home 1")?{icon:"🏠",text:"Home 1"}:e.includes("Home 2")?{icon:"🔋",text:"Home 2"}:e.includes("Home 3")?{icon:"☀️",text:"Home 3"}:e.includes("UPS")?{icon:"⚡",text:"Home UPS"}:{icon:"⚙️",text:e||"--"}}function Rl(e){return e==="off"?{display:"Vypnuto",icon:"🚫"}:e==="on"?{display:"Zapnuto",icon:"💧"}:e==="limited"?{display:"Omezeno",icon:"🚰"}:{display:"--",icon:"💧"}}const jl={"HOME I":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"HOME II":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"HOME III":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"rgba(158, 158, 158, 0.18)",label:"DO NOTHING"},"Mode 0":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"Mode 1":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"Mode 2":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"Mode 3":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"}},Ca={timeline:[],labels:[],prices:[],exportPrices:[],modeSegments:[],cheapestBuyBlock:null,expensiveBuyBlock:null,bestExportBlock:null,worstExportBlock:null,solar:null,battery:null,initialZoomStart:null,initialZoomEnd:null,currentSpotPrice:0,currentExportPrice:0,plannedConsumption:null,whatIf:null,solarForecastTotal:0,solarForecastTomorrow:0,solarForecastStale:!1},Pa=new URLSearchParams(window.location.search),Er=Pa.get("sn")||Pa.get("inverter_sn")||"";function ri(e){return`sensor.oig_${Er}_${e}`}function Ta(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function Or(e){const t=e.getFullYear(),i=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0"),r=String(e.getHours()).padStart(2,"0"),a=String(e.getMinutes()).padStart(2,"0"),o=String(e.getSeconds()).padStart(2,"0");return`${t}-${i}-${n}T${r}:${a}:${o}`}const Pn={},Hl=5*60*1e3;async function Vl(e="hybrid"){const t=Pn[e];if(t&&Date.now()-t.ts<Hl)return C.debug("Timeline cache hit",{plan:e,age:Math.round((Date.now()-t.ts)/1e3)}),t.data;try{const i=await ne.getHass();if(!i)return[];let n;i.callApi?n=await i.callApi("GET",`oig_cloud/battery_forecast/${Er}/timeline?type=active`):n=await ne.fetchOIGAPI(`battery_forecast/${Er}/timeline?type=active`);const r=(n==null?void 0:n.active)||(n==null?void 0:n.timeline)||[];return Pn[e]={data:r,ts:Date.now()},C.info("Timeline fetched",{plan:e,points:r.length}),r}catch(i){return C.error("Failed to fetch timeline",i),[]}}function Wl(e){Object.keys(Pn).forEach(t=>delete Pn[t])}function Kl(e){const t=new Date,i=new Date(t);return i.setMinutes(Math.floor(t.getMinutes()/15)*15,0,0),e.filter(n=>new Date(n.timestamp)>=i)}function ql(e){return e.map(t=>{if(!t.timestamp)return new Date;try{const[i,n]=t.timestamp.split("T");if(!i||!n)return new Date;const[r,a,o]=i.split("-").map(Number),[l,d,p=0]=n.split(":").map(Number);return new Date(r,a-1,o,l,d,p)}catch{return new Date}})}function Yl(e){const t=e.mode_name||e.mode_planned||e.mode||e.mode_display||null;if(!t||typeof t!="string")return null;const i=t.trim();return i.length?i:null}function Ul(e){return e.startsWith("HOME ")?e.replace("HOME ","").trim():e==="FULL HOME UPS"||e==="HOME UPS"?"UPS":e==="DO NOTHING"?"DN":e.substring(0,3).toUpperCase()}function Gl(e){return jl[e]||{icon:"❓",color:"rgba(158, 158, 158, 0.15)",label:e}}function Zl(e){if(!e.length)return[];const t=[];let i=null;for(const n of e){const r=Yl(n);if(!r){i=null;continue}const a=new Date(n.timestamp),o=new Date(a.getTime()+15*60*1e3);if(i!==null&&i.mode===r)i.end=o;else{const l={mode:r,start:a,end:o};t.push(l),i=l}}return t.map(n=>{const r=Gl(n.mode);return{...n,icon:r.icon,color:r.color,label:r.label,shortLabel:Ul(n.mode)}})}function wn(e,t,i=3){const n=Math.floor(i*60/15);if(e.length<n)return null;let r=null,a=t?1/0:-1/0;for(let o=0;o<=e.length-n;o++){const l=e.slice(o,o+n),d=l.map(u=>u.price),p=d.reduce((u,h)=>u+h,0)/d.length;(t&&p<a||!t&&p>a)&&(a=p,r={start:l[0].timestamp,end:l[l.length-1].timestamp,avg:p,min:Math.min(...d),max:Math.max(...d),values:d,type:"cheapest-buy"})}return r}function Ql(e,t){const n=((e==null?void 0:e.states)||{})[ri("solar_forecast")];if(!(n!=null&&n.attributes)||!t.length)return null;const r=n.attributes,a=r.today_total_kwh||0,o=r.tomorrow_total_kwh||0,l=r.forecast_stale===!0,d=r.today_hourly_string1_kw||{},p=r.tomorrow_hourly_string1_kw||{},u=r.today_hourly_string2_kw||{},h=r.tomorrow_hourly_string2_kw||{},g={...d,...p},m={...u,...h},b=($,v,P)=>$==null||v==null?$||v||0:$+(v-$)*P,y=[],_=[];for(const $ of t){const v=$.getHours(),P=$.getMinutes(),j=new Date($);j.setMinutes(0,0,0);const B=Or(j),K=new Date(j);K.setHours(v+1);const S=Or(K),L=g[B]||0,A=g[S]||0,U=m[B]||0,Y=m[S]||0,N=P/60;y.push(b(L,A,N)),_.push(b(U,Y,N))}return{string1:y,string2:_,todayTotal:a,tomorrowTotal:o,stale:l,hasString1:y.some($=>$>0),hasString2:_.some($=>$>0)}}function Xl(e,t){if(!e.length)return{arrays:{baseline:[],solarCharge:[],gridCharge:[],gridNet:[],consumption:[]},initialZoomStart:null,initialZoomEnd:null};const i=e.map(h=>new Date(h.timestamp)),n=i[0].getTime(),r=i[i.length-1],a=r?r.getTime():n,o=[],l=[],d=[],p=[],u=[];for(const h of t){const g=Or(h),m=e.find(b=>b.timestamp===g);if(m){const b=(m.battery_capacity_kwh??m.battery_soc??m.battery_start)||0,y=m.solar_charge_kwh||0,_=m.grid_charge_kwh||0,$=typeof m.grid_net=="number"?m.grid_net:(m.grid_import||0)-(m.grid_export||0),v=m.load_kwh??m.consumption_kwh??m.load??0,P=(Number(v)||0)*4;o.push(b-y-_),l.push(y),d.push(_),p.push($),u.push(P)}else o.push(null),l.push(null),d.push(null),p.push(null),u.push(null)}return{arrays:{baseline:o,solarCharge:l,gridCharge:d,gridNet:p,consumption:u},initialZoomStart:n,initialZoomEnd:a}}function Jl(e){const t=(e==null?void 0:e.states)||{},i=t[ri("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const n=i.attributes,r=n.planned_consumption_today??null,a=n.planned_consumption_tomorrow??null,o=n.profile_today||"Žádný profil",l=t[ri("ac_out_en_day")],d=l==null?void 0:l.state,u=(d&&d!=="unavailable"&&parseFloat(d)||0)/1e3,h=u+(r||0),g=(r||0)+(a||0);let m=null;if(h>0&&a!=null){const y=a-h,_=y/h*100;Math.abs(_)<5?m="Zítra podobně":y>0?m=`Zítra více (+${Math.abs(_).toFixed(0)}%)`:m=`Zítra méně (-${Math.abs(_).toFixed(0)}%)`}return{todayConsumedKwh:u,todayPlannedKwh:r,todayTotalKwh:h,tomorrowKwh:a,totalPlannedKwh:g,profile:o!=="Žádný profil"&&o!=="Neznámý profil"?o:"Žádný profil",trendText:m}}function ec(e){const i=((e==null?void 0:e.states)||{})[ri("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const r=i.attributes.mode_optimization||{},a=r.alternatives||{},o=r.total_cost_czk||0,l=r.total_savings_vs_home_i_czk||0,d=a["DO NOTHING"],p=(d==null?void 0:d.current_mode)||null;return{totalCost:o,totalSavings:l,alternatives:a,activeMode:p}}async function tc(e,t="hybrid"){const i=performance.now();C.info("[Pricing] loadPricingData START");try{const n=await Vl(t),r=Kl(n);if(!r.length)return C.warn("[Pricing] No timeline data"),Ca;const a=r.map(q=>({timestamp:q.timestamp,price:q.spot_price_czk||0})),o=r.map(q=>({timestamp:q.timestamp,price:q.export_price_czk||0}));let l=ql(a);const d=Zl(r),p=wn(a,!0,3);p&&(p.type="cheapest-buy");const u=wn(a,!1,3);u&&(u.type="expensive-buy");const h=wn(o,!1,3);h&&(h.type="best-export");const g=wn(o,!0,3);g&&(g.type="worst-export");const m=r.map(q=>new Date(q.timestamp)),b=new Set([...l,...m].map(q=>q.getTime()));l=Array.from(b).sort((q,Te)=>q-Te).map(q=>new Date(q));const{arrays:y,initialZoomStart:_,initialZoomEnd:$}=Xl(r,l),v=Ql(e,l),P=(e==null?void 0:e.states)||{},j=Ta(P[ri("spot_price_current_15min")]),B=Ta(P[ri("export_price_current_15min")]),K=Jl(e),S=ec(e),L=(v==null?void 0:v.todayTotal)||0,A=(v==null?void 0:v.tomorrowTotal)||0,U=(v==null?void 0:v.stale)||!1,Y={timeline:r,labels:l,prices:a,exportPrices:o,modeSegments:d,cheapestBuyBlock:p,expensiveBuyBlock:u,bestExportBlock:h,worstExportBlock:g,solar:v,battery:y,initialZoomStart:_,initialZoomEnd:$,currentSpotPrice:j,currentExportPrice:B,plannedConsumption:K,whatIf:S,solarForecastTotal:L,solarForecastTomorrow:A,solarForecastStale:U},N=(performance.now()-i).toFixed(0);return C.info(`[Pricing] loadPricingData COMPLETE in ${N}ms`,{points:r.length,segments:d.length}),Y}catch(n){return C.error("[Pricing] loadPricingData failed",n),Ca}}const ic=120,Lr={workday_spring:"Pracovní den - Jaro",workday_summer:"Pracovní den - Léto",workday_autumn:"Pracovní den - Podzim",workday_winter:"Pracovní den - Zima",weekend_spring:"Víkend - Jaro",weekend_summer:"Víkend - Léto",weekend_autumn:"Víkend - Podzim",weekend_winter:"Víkend - Zima"},Ur={fve:"#4CAF50",overflow:"#8BC34A",grid:"#FF9800",discharge:"#2196F3"},nc={fve:"FVE",grid:"Síť",alternative:"Alternativa"},rc={fve:"fve",pv:"fve",overflow:"overflow",grid:"grid",alternative:"alternative",alt:"alternative",battery:"battery"},ac={fve:"fve",pv:"fve",overflow:"overflow",grid:"grid",alternative:"grid",alt:"grid",discharge:"discharge",discharging:"discharge"};function pr(e){if(e==null||e==="")return{source:null,sourceInvalid:!1};const t=rc[e.toLowerCase()];return t!==void 0?{source:t,sourceInvalid:!1}:{source:null,sourceInvalid:!0}}function ur(e){return e==null||e===""?null:ac[e.toLowerCase()]??null}const oc=new Set(["temperature_unavailable","temperature_stale","source_stale","activity_stale","source_invalid","power_sign_mismatch_charge","power_sign_mismatch_discharge","runtime_cache_empty"]);function hr(e){return e.filter(t=>oc.has(t))}const Ar=new URLSearchParams(window.location.search);let Fr=Ar.get("sn")||Ar.get("inverter_sn")||"",gr=Ar.get("entry_id")||"";function sc(e,t,i){return isNaN(e)?t:Math.max(t,Math.min(i,e))}function lc(e,t,i){if(e==null)return null;const n=t-i;if(n<=0)return null;const r=(e-i)/n*100;return sc(r,0,100)}function Tn(e){if(!e)return"--:--";const t=e instanceof Date?e:new Date(e);return isNaN(t.getTime())?"--:--":t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}function Ma(e){if(!e)return"--";const t=new Date(e);return isNaN(t.getTime())?"--":t.toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}function Ir(e,t){return`${Tn(e)}–${Tn(t)}`}function Da(e){return nc[e||""]||e||"--"}function To(e){return e?Object.values(e).reduce((t,i)=>t+(parseFloat(String(i))||0),0):0}function Mo(e){return e?Object.entries(e).map(([i,n])=>({hour:parseInt(i,10),value:parseFloat(String(n))||0})).filter(i=>isFinite(i.value)).sort((i,n)=>n.value-i.value).slice(0,3).filter(i=>i.value>0).map(i=>i.hour).sort((i,n)=>i-n):[]}function Ti(e){if(!e)return null;const t=e.split(":").map(i=>parseInt(i,10));return t.length<2||!isFinite(t[0])||!isFinite(t[1])?null:t[0]*60+t[1]}function za(e,t,i){return t===null||i===null?!1:t<=i?e>=t&&e<i:e>=t||e<i}async function cc(){var e,t,i,n,r;try{if(!gr||!Fr)return C.warn("[Boiler] No entry_id or inverter_sn — cannot fetch boiler canonical"),{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null};const a=await ne.fetchOIGAPI(`/boiler/${gr}/${Fr}`);if(!a)return{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null};let o=!1,l=null;try{const p=await ne.fetchOIGAPI(`/${gr}/boiler_profile`);p!=null&&p.config?l=p.config:o=!0}catch{o=!0}const d={state:{current_temp:((e=a.current_state.temperatures)==null?void 0:e.upper_zone)??((t=a.current_state.temperatures)==null?void 0:t.top),target_temp:void 0,heating:a.current_state.heating,temperatures:a.current_state.temperatures,energy_state:a.current_state.energy_state,recommended_source:a.selected_source||a.current_state.recommended_source||void 0,circulation_recommended:!1},slots:a.plan_slots.map(p=>({start:p.start,end:p.end,consumption_kwh:p.consumption_kwh,avg_consumption_kwh:p.consumption_kwh,recommended_source:p.recommended_source,spot_price:p.spot_price??void 0})),total_consumption_kwh:a.plan_slots.reduce((p,u)=>p+(u.consumption_kwh||0),0),fve_kwh:((i=a.current_state.energy_tracking)==null?void 0:i.fve_kwh)??0,grid_kwh:((n=a.current_state.energy_tracking)==null?void 0:n.grid_kwh)??0,alt_kwh:((r=a.current_state.energy_tracking)==null?void 0:r.alt_kwh)??0,next_slot:a.plan_slots[0]||void 0,profiles:{}};return{profileData:d,planData:d,canonical:a,configProfileUnavailable:o,boilerProfileConfig:l}}catch(a){return C.warn("[Boiler] Failed to fetch canonical",{err:a}),{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null}}}function dc(e,t,i){const n=e||t,r=n==null?void 0:n.state,a=(r==null?void 0:r.temperatures)||{},o=(r==null?void 0:r.energy_state)||{},l=isFinite(a.upper_zone??a.top)?a.upper_zone??a.top??null:null,d=isFinite(a.lower_zone??a.bottom)?a.lower_zone??a.bottom??null:null,p=isFinite(o.avg_temp)?o.avg_temp??null:null,u=isFinite(o.energy_needed_kwh)?o.energy_needed_kwh??null:null,h=i.targetTempC??60,g=i.coldInletTempC??10,m=lc(p,h,g),b=(e==null?void 0:e.slots)||[],y=(e==null?void 0:e.next_slot)||pc(b);let _="Neplánováno";if(y){const v=Da(y.recommended_source);_=`${Ir(y.start,y.end)} (${v})`}const $=Da((r==null?void 0:r.recommended_source)||(y==null?void 0:y.recommended_source));return{currentTemp:isFinite(r==null?void 0:r.current_temp)?(r==null?void 0:r.current_temp)??null:null,targetTemp:(r==null?void 0:r.target_temp)||h,heating:(r==null?void 0:r.heating)||!1,tempTop:l,tempBottom:d,avgTemp:p,heatingPercent:m,energyNeeded:u,planCost:(e==null?void 0:e.estimated_cost_czk)??null,nextHeating:_,recommendedSource:$,nextProfile:(r==null?void 0:r.next_profile)||"",nextStart:(r==null?void 0:r.next_start)||""}}function pc(e){if(!Array.isArray(e))return null;const t=Date.now();return e.find(i=>{const n=new Date(i.end||i.end_time||"").getTime(),r=i.consumption_kwh??i.avg_consumption_kwh??0;return n>t&&r>0})||null}function uc(e){var g,m,b;if(!((g=e==null?void 0:e.slots)!=null&&g.length))return null;const t=e.slots.map(y=>({start:y.start||"",end:y.end||"",consumptionKwh:y.consumption_kwh??y.avg_consumption_kwh??0,recommendedSource:y.recommended_source||"",spotPrice:isFinite(y.spot_price)?y.spot_price??null:null,tempTop:y.temp_top,soc:y.soc})),i=t.filter(y=>y.consumptionKwh>0),n=parseFloat(String(e.total_consumption_kwh))||0,r=parseFloat(String(e.fve_kwh))||0,a=parseFloat(String(e.grid_kwh))||0,o=parseFloat(String(e.alt_kwh))||0,l=parseFloat(String(e.estimated_cost_czk))||0;let d="Mix: --";if(n>0){const y=Math.round(r/n*100),_=Math.round(a/n*100),$=Math.round(o/n*100);d=`Mix: FVE ${y}% · Síť ${_}% · Alt ${$}%`}const p=t.filter(y=>y.consumptionKwh>0&&y.spotPrice!==null).map(y=>({slot:y,price:y.spotPrice}));let u="--",h="--";if(p.length){const y=p.reduce(($,v)=>v.price<$.price?v:$),_=p.reduce(($,v)=>v.price>$.price?v:$);u=`${Ir(y.slot.start,y.slot.end)} (${y.price.toFixed(2)} Kč/kWh)`,h=`${Ir(_.slot.start,_.slot.end)} (${_.price.toFixed(2)} Kč/kWh)`}return{slots:t,totalConsumptionKwh:n,fveKwh:r,gridKwh:a,altKwh:o,estimatedCostCzk:l,nextSlot:e.next_slot?{start:e.next_slot.start||"",end:e.next_slot.end||"",consumptionKwh:e.next_slot.consumption_kwh||0,recommendedSource:e.next_slot.recommended_source||"",spotPrice:e.next_slot.spot_price??null}:null,planStart:Ma((m=e.slots[0])==null?void 0:m.start),planEnd:Ma((b=e.slots[e.slots.length-1])==null?void 0:b.end),sourceDigest:d,activeSlotCount:i.length,cheapestSpot:u,mostExpensiveSpot:h}}function hc(e){const t=parseFloat(String(e==null?void 0:e.fve_kwh))||0,i=parseFloat(String(e==null?void 0:e.grid_kwh))||0,n=parseFloat(String(e==null?void 0:e.alt_kwh))||0,r=t+i+n;return{fveKwh:t,gridKwh:i,altKwh:n,fvePercent:r>0?t/r*100:0,gridPercent:r>0?i/r*100:0,altPercent:r>0?n/r*100:0}}function gc(e,t,i){var g;const n=(e==null?void 0:e.summary)||{},r=(g=e==null?void 0:e.profiles)==null?void 0:g[i],a=(r==null?void 0:r.hourly_avg)||{},o=n.predicted_total_kwh??To(a),l=n.peak_hours??Mo(a),d=isFinite(n.water_liters_40c)?n.water_liters_40c??null:null,p=n.circulation_windows||[],u=p.length?p.map(m=>`${m.start}–${m.end}`).join(", "):"--";let h="--";if(p.length){const m=new Date,b=m.getHours()*60+m.getMinutes();if(p.some(_=>{const $=Ti(_.start),v=Ti(_.end);return za(b,$,v)})){const _=p.find($=>{const v=Ti($.start),P=Ti($.end);return za(b,v,P)});h=_?`ANO (do ${_.end})`:"ANO"}else{const _=t==null?void 0:t.state,$=_==null?void 0:_.circulation_recommended;let v=1/0,P=null;for(const j of p){const B=Ti(j.start);if(B===null)continue;let K=B-b;K<0&&(K+=24*60),K<v&&(v=K,P=j)}$&&P?h=`DOPORUČENO (${P.start}–${P.end})`:P?h=`Ne (další ${P.start}–${P.end})`:h="Ne"}}return{predictedTodayKwh:o,peakHours:l,waterLiters40c:d,circulationWindows:u,circulationNow:h}}function fc(e){const t=e??{},i=isFinite(t.volume_l)?t.volume_l??null:null,n=isFinite(t.heater_power_kw)?t.heater_power_kw??null:null,r=n!==null?n*1e3:null;return{volumeL:i,heaterPowerW:r,heaterPowerKw:n,targetTempC:isFinite(t.target_temp_c)?t.target_temp_c??null:null,deadlineTime:t.deadline_time||"--:--",stratificationMode:t.stratification_mode||"--",kCoefficient:i?(i*.001163).toFixed(4):"--",coldInletTempC:isFinite(t.cold_inlet_temp_c)?t.cold_inlet_temp_c??10:10,auraMaxTempC:isFinite(t.aura_max_temp_c)?t.aura_max_temp_c??null:null}}function mc(e){return e!=null&&e.profiles?Object.entries(e.profiles).map(([t,i])=>({id:t,name:i.name||t,targetTemp:i.target_temp||55,startTime:i.start_time||"06:00",endTime:i.end_time||"22:00",days:i.days||[1,1,1,1,1,0,0],enabled:i.enabled!==!1})):[]}function bc(e){var n;const t=[],i=((n=e==null?void 0:e.summary)==null?void 0:n.today_hours)||[];for(let r=0;r<24;r++){const a=i.includes(r);t.push({hour:r,temp:a?55:25,heating:a})}return t}function yc(e,t){var o;const i=(o=e==null?void 0:e.profiles)==null?void 0:o[t],n=["Po","Út","St","Čt","Pá","So","Ne"];if(!i)return n.map(l=>({day:l,hours:Array(24).fill(0)}));const r=i.heatmap||[];let a=[];if(r.length>0)a=r.map(l=>l.map(d=>d&&typeof d=="object"?parseFloat(d.consumption)||0:parseFloat(String(d))||0));else{const l=i.hourly_avg||{};a=Array.from({length:7},()=>Array.from({length:24},(d,p)=>parseFloat(String(l[p]||0))))}return n.map((l,d)=>({day:l,hours:a[d]||Array(24).fill(0)}))}function vc(e,t){var p;const i=(p=e==null?void 0:e.profiles)==null?void 0:p[t],n=(e==null?void 0:e.summary)||{},r=(i==null?void 0:i.hourly_avg)||{},a=Array.from({length:24},(u,h)=>parseFloat(String(r[h]||0))),o=n.predicted_total_kwh??To(r),l=n.peak_hours??Mo(r),d=isFinite(n.avg_confidence)?n.avg_confidence??null:null;return{hourlyAvg:a,peakHours:l,predictedTotalKwh:o,confidence:d,daysTracked:7}}function xc(e,t){var u,h,g;if(!((u=e==null?void 0:e.slots)!=null&&u.length)||!(t!=null&&t.length))return{fve:"--",grid:"--"};const i=(h=e.slots[0])==null?void 0:h.start,n=(g=e.slots[e.slots.length-1])==null?void 0:g.end,r=i?new Date(i).getTime():null,a=n?new Date(n).getTime():null,o=t.filter(m=>{if(!r||!a)return!0;const b=m.timestamp||m.time;if(!b)return!1;const y=new Date(b).getTime();return y>=r&&y<=a}),l=m=>{const b=[];let y=null;for(const _ of o){const $=_.timestamp||_.time;if(!$)continue;const v=new Date($),P=m(_);P&&!y?y={start:v,end:v}:P&&y?y.end=v:!P&&y&&(b.push(y),y=null)}return y&&b.push(y),b.length?b.map(_=>`${Tn(_.start)}–${Tn(new Date(_.end.getTime()+15*6e4))}`).join(", "):"--"},d=l(m=>(parseFloat(m.solar_kwh??m.solar_charge_kwh??0)||0)>0),p=l(m=>(parseFloat(m.grid_charge_kwh??0)||0)>0);return{fve:d,grid:p}}async function wc(){return C.info("[Boiler] Planning heating..."),await ne.callService("oig_cloud","plan_boiler_heating",{})}async function $c(){return C.info("[Boiler] Applying plan..."),await ne.callService("oig_cloud","apply_boiler_plan",{})}async function _c(){return C.info("[Boiler] Canceling plan..."),await ne.callService("oig_cloud","cancel_boiler_plan",{})}const kc=new Set(["charging_fve","charging_overflow","charging_grid","discharging","standby","unknown"]);function Ea(e){return e&&kc.has(e)?e:"unknown"}function Sc(e){return e==="on"?"on":e==="off"?"off":"unavailable"}function Cc(e,t=!1){var it,nt,xe;const i={entryId:null,boxId:null,available:!1};if(!e)return{status:null,planSlots:[],explanation:null,manualOverride:null,identity:i,activity:null,sourceSegments:[],timeline:[],sparkline:null,demandMap:null,circulationRuns:[],legionella:null,planSummary:null,energyToday:null,loading:!1,loadError:"Nepodařilo se načíst data bojleru"};const n=e.current_state,r=n.temperatures??{},a=isFinite(r.top)?r.top??null:isFinite(r.upper_zone)?r.upper_zone??null:null,o=isFinite(r.bottom)?r.bottom??null:isFinite(r.lower_zone)?r.lower_zone??null:null,l={currentState:n.heating?"heating":"idle",comfortSatisfied:e.comfort_status.comfort_satisfied,comfortStatusCode:e.comfort_status.comfort_status_code,selectedSource:pr(e.selected_source).source,actuatedSource:pr(e.actuated_source).source,temperatureTop:a,temperatureBottom:o,energyNeededKwh:isFinite((it=n.energy_state)==null?void 0:it.energy_needed_kwh)?((nt=n.energy_state)==null?void 0:nt.energy_needed_kwh)??null:null,heating:n.heating,lastUpdate:n.last_update??null,degraded:e.degraded_flags.degraded,degradedFlags:hr(e.degraded_flags.flags??[])},d=(e.plan_slots??[]).map(x=>{const{source:ee,sourceInvalid:de}=pr(x.recommended_source);return{start:x.start,end:x.end,consumptionKwh:x.consumption_kwh,confidence:x.confidence,recommendedSource:ee,sourceInvalid:de||null,spotPrice:isFinite(x.spot_price)?x.spot_price??null:null,altPrice:isFinite(x.alt_price)?x.alt_price??null:null,overflowAvailable:x.overflow_available,heatingKwh:x.heating_kwh??null,pvKwh:x.pv_kwh??null,gridKwh:x.grid_kwh??null,altKwh:x.alt_kwh??null,expectedTempTopC:x.predicted_top_temp_c??x.predicted_temperature_c??null,comfortSatisfied:x.comfort_satisfied??null,estimatedCostCzk:x.estimated_cost_czk??null,pvShare:typeof x.pv_share=="number"?x.pv_share:x.consumption_kwh&&x.pv_contribution_kwh!=null?x.pv_contribution_kwh/x.consumption_kwh:null,purpose:x.purpose??null}}),p=hr(e.degraded_flags.flags??[]),u=t?[...p,"config_profile_unavailable"]:p,h=e.freshness??{},g={reasonCodes:e.reason_codes??[],planCreatedAt:h.plan_created_at??null,planValidUntil:h.plan_valid_until??null,dataAgeSecs:isFinite(h.data_age_seconds)?h.data_age_seconds??null:null,degradedReasons:u,unsatisfiedComfortGapC:e.comfort_status.unsatisfied_comfort_gap_c??null,temperatureAtDeadlineC:e.comfort_status.temperature_at_deadline_c??null},m={active:((xe=e.manual_override)==null?void 0:xe.active)??!1,ttlMinutes:ic,reason:"",capabilityAvailable:e.manual_override!=null},b={entryId:e.entry_id,boxId:e.box_id,available:!!(e.entry_id&&e.box_id)},y=e.activity??null,_=y!=null?{state:Ea(y.state),source:ur(y.source),temperatureTrendCPerMin:isFinite(y.temperature_trend_c_per_min)?y.temperature_trend_c_per_min??null:null,fillLevelPct:isFinite(y.fill_level_pct)?y.fill_level_pct??null:null,auraMaxTempC:isFinite(y.aura_max_temp_c)?y.aura_max_temp_c:0,heaterStates:Object.fromEntries(Object.entries(y.heater_states??{}).map(([x,ee])=>[x,Sc(ee)])),staleFlags:hr(Array.isArray(y.stale_flags)?y.stale_flags:[])}:null,$=(e.source_segments??[]).map(x=>({key:ur(x.key),start:x.start,end:x.end,energyKwh:isFinite(x.energy_kwh)?x.energy_kwh:0,fillPct:isFinite(x.fill_pct)?x.fill_pct:0,active:x.active})),v=(e.timeline??[]).map(x=>({timestamp:x.timestamp,topTempC:isFinite(x.top_temp_c)?x.top_temp_c??null:null,bottomTempC:isFinite(x.bottom_temp_c)?x.bottom_temp_c??null:null,powerKw:isFinite(x.power_kw)?x.power_kw??null:null,sourceKey:ur(x.source_key),activityState:Ea(x.activity_state)})),P=e.sparkline??null,j=P!=null?{temperature:Array.isArray(P.temperature)?P.temperature:[],power:Array.isArray(P.power)?P.power:[]}:null,B=e.demand_map??null,K=B!=null?{slotDurationMin:B.slot_duration_min,slotsP50:Array.isArray(B.slots_p50)?B.slots_p50:[],slotsP80:Array.isArray(B.slots_p80)?B.slots_p80:[],windows:Array.isArray(B.windows)?B.windows.map(x=>({slotIndex:x.slot_index,startMinute:x.start_minute,p80Kwh:x.p80_kwh,liters:x.liters,label:x.label})):[],profile:{category:B.profile.category,level:B.profile.level,daysUsed:B.profile.days_used,label:B.profile.label,fallbackUsed:B.profile.fallback_used},confidence:B.confidence}:null,S=e.circulation_runs??[],L=Array.isArray(S)?S.map(x=>({start:x.start,end:x.end,label:x.label||""})):[],A=e.legionella??null,U=A!=null?{enabled:A.enabled===!0,daysSinceLast:typeof A.days_since_last=="number"?A.days_since_last:null,intervalDays:typeof A.interval_days=="number"?A.interval_days:null,scheduledStart:A.scheduled_start??null}:null,Y=e.plan_summary??null,N=Y!=null?{estimatedCostCzk:typeof Y.estimated_cost_czk=="number"?Y.estimated_cost_czk:null,costIfAllGrid:typeof Y.cost_if_all_grid=="number"?Y.cost_if_all_grid:null,costIfAllAlt:typeof Y.cost_if_all_alt=="number"?Y.cost_if_all_alt:null,deadlineTime:Y.deadline_time||"18:00"}:null,q=e.energy_today??null,Te=q!=null?{totalKwh:typeof q.total_kwh=="number"?q.total_kwh:0,fveKwh:typeof q.fve_kwh=="number"?q.fve_kwh:0,gridKwh:typeof q.grid_kwh=="number"?q.grid_kwh:0,altKwh:typeof q.alt_kwh=="number"?q.alt_kwh:0,batteryKwh:typeof q.battery_kwh=="number"?q.battery_kwh:0,sourceInvalid:q.source_invalid===!0}:null;return{status:l,planSlots:d,explanation:g,manualOverride:m,identity:b,activity:_,sourceSegments:$,timeline:v,sparkline:j,demandMap:K,circulationRuns:L,legionella:U,planSummary:N,energyToday:Te,loading:!1,loadError:null}}async function Pc(e){const{profileData:t,planData:i,canonical:n,configProfileUnavailable:r,boilerProfileConfig:a}=await cc();let o=null;try{const u=await ne.loadBatteryTimeline(Fr,"active");o=(u==null?void 0:u.active)||u||null,Array.isArray(o)&&o.length===0&&(o=null)}catch{}const l=(t==null?void 0:t.current_category)||Object.keys((t==null?void 0:t.profiles)||{})[0]||"workday_summer",d=Object.keys((t==null?void 0:t.profiles)||{}),p=fc(a);return{state:dc(i,t,p),plan:uc(i),energyBreakdown:hc(i),predictedUsage:gc(t,i,l),config:p,profiles:mc(t||i),heatmap:bc(i||t),heatmap7x24:yc(t,l),profiling:vc(t,l),currentCategory:l,availableCategories:d,forecastWindows:xc(i,o),v2Data:Cc(n,r)}}function Tc(e){var i;const t=((i=e==null?void 0:e.locale)==null?void 0:i.language)??(e==null?void 0:e.language)??"cs";return/^en/i.test(t)?"en":"cs"}const Oe={cs:{"boiler.status.heading":"Stav bojleru","boiler.status.heating":"Ohřev","boiler.status.idle":"Nečinný","boiler.status.unknown":"Neznámý","boiler.status.selected_source":"Vybraný zdroj","boiler.status.actuated_source":"Aktivní zdroj","boiler.status.temp_top":"Teplota nahoře","boiler.status.temp_bottom":"Teplota dole","boiler.status.energy_needed":"Zbývající energie","boiler.status.last_update":"Poslední aktualizace","boiler.status.degraded":"Degradováno","boiler.status.comfort_satisfied":"Komfort splněn","boiler.status.comfort_unsatisfied":"Komfort nesplněn","boiler.status.comfort_unknown":"Komfort neznámý","boiler.timeline.heading":"Plán nabíjení (15 min sloty)","boiler.timeline.empty":"Plán bojleru zatím není k dispozici.","boiler.timeline.col_time":"Čas","boiler.timeline.col_source":"Zdroj","boiler.timeline.col_temp":"Teplota","boiler.timeline.col_kwh":"Energie","boiler.timeline.col_cost":"Cena","boiler.timeline.col_pv":"FVE podíl","boiler.timeline.comfort_ok":"Komfort OK","boiler.timeline.comfort_gap":"Komfort nesplněn","boiler.explanation.heading":"Vysvětlení","boiler.explanation.empty":"Žádné vysvětlení od plánovače.","boiler.explanation.plan_created":"Plán vytvořen","boiler.explanation.plan_valid_until":"Plán platí do","boiler.explanation.data_age":"Stáří dat","boiler.explanation.freshness_heading":"Čerstvost vstupů","boiler.explanation.freshness_fresh":"vstupy aktuální","boiler.explanation.degraded_heading":"Degradované stavy","boiler.explanation.unsatisfied_gap":"Komfortní mezera","boiler.explanation.temp_at_deadline":"Předpokládaná teplota na deadline","boiler.override.heading":"Ruční přepis (sekundární)","boiler.override.subtitle":"Automatický plán je primární — přepis použijte jen výjimečně.","boiler.override.ttl_label":"Délka přepisu (minuty)","boiler.override.reason_label":"Důvod přepisu","boiler.override.submit":"Aktivovat přepis","boiler.override.identity_unavailable":"Nedostupné – identita bojleru není rozpoznána.","boiler.override.capability_unavailable":"Aktuátor neumožňuje ruční přepis.","boiler.override.active":"Přepis aktivní","boiler.override.ttl_remaining_min":"Zbývá","boiler.unavailable.loading":"Načítání dat bojleru…","boiler.unavailable.error":"Chyba při načítání bojleru","boiler.unavailable.degraded":"Bojler v degradovaném režimu","boiler.unavailable.unavailable":"Data bojleru nejsou k dispozici","boiler.source.fve":"FVE","boiler.source.grid":"Síť","boiler.source.alternative":"Alternativa","boiler.source.overflow":"Přetoky","boiler.source.discharge":"Vybíjení","boiler.source.none":"—","boiler.reason.comfort_satisfied":"Komfort splněn","boiler.reason.comfort_unsatisfied":"Komfort nelze splnit","boiler.reason.no_feasible_plan":"Žádný proveditelný plán","boiler.reason.bootstrap_profile":"Učící režim profilu (málo dat)","boiler.reason.history_profile_low_confidence":"Profil s nízkou důvěrou","boiler.reason.input_stale_price":"Ceny nejsou aktuální","boiler.reason.input_stale_pv":"FVE predikce není aktuální","boiler.reason.input_missing_recorder":"Chybí historie z recorderu","boiler.reason.input_adapter_error":"Chyba vstupního adapteru","boiler.reason.input_stale_temperature":"Teplota není aktuální","boiler.reason.top_sensor_unavailable":"Horní teploměr není dostupný","boiler.reason.bottom_sensor_unavailable_top_only_degraded":"Dolní teploměr není dostupný (top-only režim)","boiler.reason.primary_actuator_unavailable":"Hlavní topný aktuátor není dostupný","boiler.reason.alternative_actuator_unavailable_benchmark_only":"Alternativní zdroj jen jako benchmark","boiler.reason.circulation_pump_unavailable":"Cirkulační čerpadlo není dostupné","boiler.reason.actuator_rate_limited":"Aktuátor omezen rychlostním limitem","boiler.reason.actuator_serializer_error":"Chyba serializéru aktuátoru","boiler.reason.override_active":"Ruční přepis aktivní","boiler.reason.override_expired":"Ruční přepis vypršel","boiler.reason.planner_timeout":"Plánovač překročil časový limit","boiler.reason.replan_coalesced":"Přeplánování sloučeno","boiler.reason.source_selected_grid":"Vybrán zdroj: síť","boiler.reason.source_selected_pv":"Vybrán zdroj: FVE","boiler.reason.source_selected_alternative":"Vybrán zdroj: alternativa","boiler.reason.source_benchmark_only":"Alternativa pouze jako srovnání","boiler.reason.setup_incomplete":"Konfigurace bojleru není dokončena","boiler.reason.migration_required":"Vyžaduje se migrace bojleru","boiler.reason.api_repair_required":"Vyžaduje se oprava API","boiler.reason.storage_write_failed":"Selhalo uložení stavu bojleru","boiler.activity.state.charging_fve":"Nabíjení z FVE","boiler.activity.state.charging_overflow":"Nabíjení z přetoků","boiler.activity.state.charging_grid":"Nabíjení ze sítě","boiler.activity.state.discharging":"Vybíjení","boiler.activity.state.standby":"Pohotovost","boiler.activity.state.unknown":"Neznámý stav","boiler.activity.fill_level":"Úroveň naplnění","boiler.activity.temp_trend":"Trend teploty","boiler.activity.aura_max_temp":"Max. teplota AURA","boiler.activity.stale_warning":"Zastaralá data","boiler.eta.label":"Odhadovaný čas do cíle","boiler.eta.already_reached":"Cíl dosažen","boiler.eta.unavailable":"Nelze odhadnout","boiler.config.heater_power_kw":"Výkon topení (kW)","boiler.config.deadline":"Deadline","boiler.config.goal_temp":"Cílová teplota","boiler.aria.status_panel":"Panel stavu bojleru","boiler.aria.plan_timeline":"Časová osa plánu bojleru","boiler.aria.source_explanation":"Vysvětlení zdroje","boiler.aria.override_panel":"Panel ručního přepisu","boiler.aria.svg_summary":"Vizualizace bojleru","boiler.aria.stale":"Data mohou být zastaralá","boiler.aria.source_unknown":"Neznámý zdroj","boiler.demand_map.heading":"Mapa odběrů","boiler.demand_map.empty":"Sbírám data o odběrech — mapa se objeví po pár dnech","boiler.demand_map.confidence":"Spolehlivost","boiler.demand_map.fallback_notice":"Přibližný profil (málo dat)","boiler.demand_map.meta":"Profil z historie ({n} dní, {cat})","boiler.demand_map.window.morning":"Ráno","boiler.demand_map.window.afternoon":"Odpoledne","boiler.demand_map.window.evening":"Večer","boiler.demand_map.window.night":"Noc","boiler.plan_strip.heading":"Plán ohřevu 24 h","boiler.plan_strip.meta":"zdroje + odběry + teplota + cirkulace","boiler.plan_strip.empty":"Plán ohřevu zatím není k dispozici.","boiler.plan_strip.now_label":"TEĎ","boiler.plan_strip.deadline_label":"pojistka","boiler.plan_strip.temp_zone_label":"°C horní zóna","boiler.plan_strip.legend_overflow":"☀️ Přetoky FVE","boiler.plan_strip.legend_grid":"🔌 Levné okno (síť)","boiler.plan_strip.legend_battery":"🔋→🔥 Ohřev z baterie","boiler.plan_strip.legend_alt":"🔥 Alternativní zdroj","boiler.plan_strip.legend_demands":"odběry (dolů)","boiler.plan_strip.legend_circ":"💧 cirkulace","boiler.plan_strip.source_overflow":"☀️ Přetoky FVE","boiler.plan_strip.source_grid":"🔌 Levné okno","boiler.plan_strip.source_battery":"🔋→🔥 Ohřev z baterie","boiler.plan_strip.source_alt":"🔥 Alternativní zdroj","boiler.plan_strip.source_legionella_prefix":"🦠","boiler.plan_strip.source_legionella":"🦠 Ochrana proti legionelle","boiler.plan_strip.circ_tooltip":"cirkulace","boiler.energy_today.heading":"⚡ Z čeho se bojler nabil — dnes","boiler.energy_today.meta":"skutečné zdroje k dnešnímu datu","boiler.energy_today.empty":"Dnes zatím žádný ohřev","boiler.energy_today.source_fve":"☀️ FVE přetoky","boiler.energy_today.source_grid":"🔌 Síť","boiler.energy_today.source_alt":"🔥 Alternativní zdroj","boiler.energy_today.source_battery":"🔋→🔥 Baterie","boiler.energy_today.benchmark_prefix":"Kdyby vše ze sítě ≈","boiler.energy_today.benchmark_savings":"→ plán šetří"},en:{"boiler.status.heading":"Boiler status","boiler.status.heating":"Heating","boiler.status.idle":"Idle","boiler.status.unknown":"Unknown","boiler.status.selected_source":"Selected source","boiler.status.actuated_source":"Actuated source","boiler.status.temp_top":"Top temperature","boiler.status.temp_bottom":"Bottom temperature","boiler.status.energy_needed":"Energy needed","boiler.status.last_update":"Last update","boiler.status.degraded":"Degraded","boiler.status.comfort_satisfied":"Comfort satisfied","boiler.status.comfort_unsatisfied":"Comfort not satisfied","boiler.status.comfort_unknown":"Comfort unknown","boiler.timeline.heading":"Heating plan (15 min slots)","boiler.timeline.empty":"No boiler plan available yet.","boiler.timeline.col_time":"Time","boiler.timeline.col_source":"Source","boiler.timeline.col_temp":"Temp","boiler.timeline.col_kwh":"Energy","boiler.timeline.col_cost":"Cost","boiler.timeline.col_pv":"PV share","boiler.timeline.comfort_ok":"Comfort OK","boiler.timeline.comfort_gap":"Comfort gap","boiler.explanation.heading":"Explanation","boiler.explanation.empty":"No planner explanation yet.","boiler.explanation.plan_created":"Plan created","boiler.explanation.plan_valid_until":"Plan valid until","boiler.explanation.data_age":"Data age","boiler.explanation.freshness_heading":"Input freshness","boiler.explanation.freshness_fresh":"inputs fresh","boiler.explanation.degraded_heading":"Degraded state","boiler.explanation.unsatisfied_gap":"Comfort gap","boiler.explanation.temp_at_deadline":"Predicted deadline temperature","boiler.override.heading":"Manual override (secondary)","boiler.override.subtitle":"Automatic plan is primary — use override only when necessary.","boiler.override.ttl_label":"Override duration (minutes)","boiler.override.reason_label":"Override reason","boiler.override.submit":"Activate override","boiler.override.identity_unavailable":"Unavailable – boiler identity is not resolved.","boiler.override.capability_unavailable":"Actuator does not support manual override.","boiler.override.active":"Override active","boiler.override.ttl_remaining_min":"remaining","boiler.unavailable.loading":"Loading boiler data…","boiler.unavailable.error":"Failed to load boiler data","boiler.unavailable.degraded":"Boiler in degraded mode","boiler.unavailable.unavailable":"Boiler data unavailable","boiler.source.fve":"PV","boiler.source.grid":"Grid","boiler.source.alternative":"Alternative","boiler.source.overflow":"Overflow","boiler.source.discharge":"Discharge","boiler.source.none":"—","boiler.reason.comfort_satisfied":"Comfort satisfied","boiler.reason.comfort_unsatisfied":"Comfort cannot be met","boiler.reason.no_feasible_plan":"No feasible plan","boiler.reason.bootstrap_profile":"Bootstrap profile (low data)","boiler.reason.history_profile_low_confidence":"Low-confidence profile","boiler.reason.input_stale_price":"Spot prices are stale","boiler.reason.input_stale_pv":"PV forecast is stale","boiler.reason.input_missing_recorder":"Recorder history missing","boiler.reason.input_adapter_error":"Input adapter error","boiler.reason.input_stale_temperature":"Temperature reading stale","boiler.reason.top_sensor_unavailable":"Top sensor unavailable","boiler.reason.bottom_sensor_unavailable_top_only_degraded":"Bottom sensor unavailable (top-only mode)","boiler.reason.primary_actuator_unavailable":"Primary heating actuator unavailable","boiler.reason.alternative_actuator_unavailable_benchmark_only":"Alternative source benchmark only","boiler.reason.circulation_pump_unavailable":"Circulation pump unavailable","boiler.reason.actuator_rate_limited":"Actuator rate limited","boiler.reason.actuator_serializer_error":"Actuator serializer error","boiler.reason.override_active":"Manual override active","boiler.reason.override_expired":"Manual override expired","boiler.reason.planner_timeout":"Planner timeout","boiler.reason.replan_coalesced":"Replan coalesced","boiler.reason.source_selected_grid":"Source selected: grid","boiler.reason.source_selected_pv":"Source selected: PV","boiler.reason.source_selected_alternative":"Source selected: alternative","boiler.reason.source_benchmark_only":"Alternative is benchmark only","boiler.reason.setup_incomplete":"Boiler setup incomplete","boiler.reason.migration_required":"Boiler migration required","boiler.reason.api_repair_required":"API repair required","boiler.reason.storage_write_failed":"Failed to persist boiler state","boiler.activity.state.charging_fve":"Charging from PV","boiler.activity.state.charging_overflow":"Charging from overflow","boiler.activity.state.charging_grid":"Charging from grid","boiler.activity.state.discharging":"Discharging","boiler.activity.state.standby":"Standby","boiler.activity.state.unknown":"Unknown state","boiler.activity.fill_level":"Fill level","boiler.activity.temp_trend":"Temperature trend","boiler.activity.aura_max_temp":"AURA max temperature","boiler.activity.stale_warning":"Stale data","boiler.eta.label":"Estimated time to target","boiler.eta.already_reached":"Target reached","boiler.eta.unavailable":"Cannot estimate","boiler.config.heater_power_kw":"Heater power (kW)","boiler.config.deadline":"Deadline","boiler.config.goal_temp":"Target temperature","boiler.aria.status_panel":"Boiler status panel","boiler.aria.plan_timeline":"Boiler plan timeline","boiler.aria.source_explanation":"Source explanation","boiler.aria.override_panel":"Manual override panel","boiler.aria.svg_summary":"Boiler visualization","boiler.aria.stale":"Data may be stale","boiler.aria.source_unknown":"Unknown source","boiler.demand_map.heading":"Demand Map","boiler.demand_map.empty":"Collecting usage data — map will appear in a few days","boiler.demand_map.confidence":"Confidence","boiler.demand_map.fallback_notice":"Approximate profile (low data)","boiler.demand_map.meta":"Profile from history ({n} days, {cat})","boiler.demand_map.window.morning":"Morning","boiler.demand_map.window.afternoon":"Afternoon","boiler.demand_map.window.evening":"Evening","boiler.demand_map.window.night":"Night","boiler.plan_strip.heading":"Heating plan 24 h","boiler.plan_strip.meta":"sources + demands + temperature + circulation","boiler.plan_strip.empty":"Heating plan not available yet.","boiler.plan_strip.now_label":"NOW","boiler.plan_strip.deadline_label":"deadline","boiler.plan_strip.temp_zone_label":"°C top zone","boiler.plan_strip.legend_overflow":"☀️ PV overflow","boiler.plan_strip.legend_grid":"🔌 Cheap window (grid)","boiler.plan_strip.legend_battery":"🔋→🔥 Battery heating","boiler.plan_strip.legend_alt":"🔥 Alternative source","boiler.plan_strip.legend_demands":"demands (down)","boiler.plan_strip.legend_circ":"💧 circulation","boiler.plan_strip.source_overflow":"☀️ PV overflow","boiler.plan_strip.source_grid":"🔌 Cheap window","boiler.plan_strip.source_battery":"🔋→🔥 Battery heating","boiler.plan_strip.source_alt":"🔥 Alternative source","boiler.plan_strip.source_legionella_prefix":"🦠","boiler.plan_strip.source_legionella":"🦠 Legionella protection","boiler.plan_strip.circ_tooltip":"circulation","boiler.energy_today.heading":"⚡ What powered the boiler today","boiler.energy_today.meta":"actual sources to date","boiler.energy_today.empty":"No heating today yet","boiler.energy_today.source_fve":"☀️ PV overflow","boiler.energy_today.source_grid":"🔌 Grid","boiler.energy_today.source_alt":"🔥 Alternative source","boiler.energy_today.source_battery":"🔋→🔥 Battery","boiler.energy_today.benchmark_prefix":"If all from grid ≈","boiler.energy_today.benchmark_savings":"→ plan saves"}};function w(e,t){const i=Oe[t]??Oe.cs;return e in i?i[e]:e in Oe.cs?Oe.cs[e]:e}function Cn(e,t){const i=`boiler.reason.${e}`;return Oe[t][i]?Oe[t][i]:Oe.cs[i]?Oe.cs[i]:e}function Ze(e,t){if(!e)return w("boiler.source.none",t);const i=`boiler.source.${e}`;return Oe[t][i]?Oe[t][i]:Oe.cs[i]?Oe.cs[i]:e}const Oa={efficiency:null,health:null,balancing:null,costComparison:null};function Do(e){const t=dt();if(!t)return null;const i=t.findSensorId("battery_efficiency"),n=t.get(i);if(!n)return C.debug("Battery efficiency sensor not found"),null;const r=n.attributes||{},a=r.efficiency_last_month_pct!=null?{efficiency:Number(r.efficiency_last_month_pct??0),charged:Number(r.last_month_charge_kwh??0),discharged:Number(r.last_month_discharge_kwh??0),losses:Number(r.losses_last_month_kwh??0)}:null,o=r.efficiency_current_month_pct!=null?{efficiency:Number(r.efficiency_current_month_pct??0),charged:Number(r.current_month_charge_kwh??0),discharged:Number(r.current_month_discharge_kwh??0),losses:Number(r.losses_current_month_kwh??0)}:null,l=a??o;if(!l)return null;const d=a?"last_month":"current_month",p=a&&o?o.efficiency-a.efficiency:0;return{efficiency:l.efficiency,charged:l.charged,discharged:l.discharged,losses:l.losses,lossesPct:r[d==="last_month"?"losses_last_month_pct":"losses_current_month_pct"]??0,trend:p,period:d,currentMonthDays:r.current_month_days??0,lastMonth:a,currentMonth:o}}function zo(e){const t=dt();if(!t)return null;const i=t.findSensorId("battery_health"),n=t.get(i);if(!n)return C.debug("Battery health sensor not found"),null;const r=parseFloat(n.state)||0,a=n.attributes||{};let o,l;return r>=95?(o="excellent",l="Vynikající"):r>=90?(o="good",l="Dobrý"):r>=80?(o="fair",l="Uspokojivý"):(o="poor",l="Špatný"),{soh:r,capacity:a.capacity_p80_last_20??a.current_capacity_kwh??0,nominalCapacity:a.current_capacity_kwh??0,minCapacity:a.capacity_p20_last_20??0,measurementCount:a.measurement_count??0,lastAnalysis:a.last_analysis??"",qualityScore:a.quality_score??null,sohMethod:a.soh_selection_method??null,sohMethodDescription:a.soh_method_description??null,measurementHistory:Array.isArray(a.measurement_history)?a.measurement_history:[],degradation3m:a.degradation_3_months_percent??null,degradation6m:a.degradation_6_months_percent??null,degradation12m:a.degradation_12_months_percent??null,degradationPerYear:a.degradation_per_year_percent??null,estimatedEolDate:a.estimated_eol_date??null,yearsTo80Pct:a.years_to_80pct??null,trendConfidence:a.trend_confidence??null,status:o,statusLabel:l}}function La(e,t,i){if(!e||!t)return{daysRemaining:null,progressPercent:null,intervalDays:i||null};try{const n=new Date(e),r=new Date(t),a=new Date;if(isNaN(n.getTime())||isNaN(r.getTime()))return{daysRemaining:null,progressPercent:null,intervalDays:i||null};const o=r.getTime()-n.getTime(),l=a.getTime()-n.getTime(),d=Math.max(0,Math.round((r.getTime()-a.getTime())/(1e3*60*60*24))),p=o>0?Math.min(100,Math.max(0,Math.round(l/o*100))):null,u=i||Math.round(o/(1e3*60*60*24));return{daysRemaining:d,progressPercent:p,intervalDays:u||null}}catch{return{daysRemaining:null,progressPercent:null,intervalDays:i||null}}}function Eo(e){const t=dt();if(!t)return null;const i=t.findSensorId("battery_balancing"),n=t.get(i);if(!n){const d=t.get(t.findSensorId("battery_health")),p=d==null?void 0:d.attributes;if(p!=null&&p.balancing_status){const u=String(p.last_balancing??""),h=p.next_balancing?String(p.next_balancing):null,g=La(u,h,Number(p.balancing_interval_days??0));return{status:String(p.balancing_status??"unknown"),lastBalancing:u,cost:Number(p.balancing_cost??0),nextScheduled:h,...g,estimatedNextCost:p.estimated_next_cost!=null?Number(p.estimated_next_cost):null}}return null}const r=n.attributes||{},a=String(r.last_balancing??""),o=r.next_scheduled?String(r.next_scheduled):null,l=La(a,o,Number(r.interval_days??0));return{status:n.state||"unknown",lastBalancing:a,cost:Number(r.cost??0),nextScheduled:o,...l,estimatedNextCost:r.estimated_next_cost!=null?Number(r.estimated_next_cost):null}}async function Mc(e){var t,i,n;try{const r=await ne.loadUnifiedCostTile(e);if(!r)return null;const a=r.hybrid??r,o=a.today??{},l=Math.round((o.actual_cost_so_far??o.actual_total_cost??0)*100)/100,d=o.future_plan_cost??0,p=o.blended_total_cost??l+d,u=((t=a.tomorrow)==null?void 0:t.plan_total_cost)??null,h=!!((i=a.tomorrow)!=null&&i.mode_distribution),g=u===0&&!h?null:u;let m=null,b=null,y=null,_=null;try{const $=await ne.loadBatteryTimeline(e,"active"),v=(n=$==null?void 0:$.timeline_extended)==null?void 0:n.yesterday;v!=null&&v.summary&&(m=v.summary.planned_total_cost??null,b=v.summary.actual_total_cost??null,y=v.summary.delta_cost??null,_=v.summary.accuracy_pct??null)}catch{C.debug("Yesterday analysis not available")}return{activePlan:"hybrid",actualSpent:l,planTotalCost:p,futurePlanCost:d,tomorrowCost:g,yesterdayPlannedCost:m,yesterdayActualCost:b,yesterdayDelta:y,yesterdayAccuracy:_}}catch(r){return C.error("Failed to fetch cost comparison",r),null}}async function Dc(e){const t=Do(),i=zo(),n=Eo(),r=await Mc(e);return{efficiency:t,health:i,balancing:n,costComparison:r}}function zc(e){return{efficiency:Do(),health:zo(),balancing:Eo()}}const ji={severity:0,warningsCount:0,eventType:"",description:"",instruction:"",onset:"",expires:"",etaHours:0,allWarnings:[],effectiveSeverity:0},Ec={vítr:"💨",déšť:"🌧️",sníh:"❄️",bouřky:"⛈️",mráz:"🥶",vedro:"🥵",mlha:"🌫️",náledí:"🧊",laviny:"🏔️"};function Oo(e){const t=e.toLowerCase();for(const[i,n]of Object.entries(Ec))if(t.includes(i))return n;return"⚠️"}const Lo={0:"Bez výstrahy",1:"Nízká",2:"Zvýšená",3:"Vysoká",4:"Extrémní"},Mn={0:"#4CAF50",1:"#8BC34A",2:"#FF9800",3:"#f44336",4:"#9C27B0"};function Oc(e){const t=dt();if(!t)return ji;const i=`sensor.oig_${e}_chmu_warning_level`,n=t.get(i);if(!n)return C.debug("ČHMÚ sensor not found",{entityId:i}),ji;const r=parseInt(n.state,10)||0,a=n.attributes||{},o=Number(a.warnings_count??0),l=String(a.event_type??""),d=String(a.description??""),p=String(a.instruction??""),u=String(a.onset??""),h=String(a.expires??""),g=Number(a.eta_hours??0),m=a.all_warnings_details??[],b=Array.isArray(m)?m.map($=>({event_type:$.event_type??$.event??"",severity:$.severity??r,description:$.description??"",instruction:$.instruction??"",onset:$.onset??"",expires:$.expires??"",eta_hours:$.eta_hours??0})):[],y=l.toLowerCase().includes("žádná výstraha");return{severity:r,warningsCount:o,eventType:l,description:d,instruction:p,onset:u,expires:h,etaHours:g,allWarnings:b,effectiveSeverity:o===0||y?0:r}}const Ao={"HOME I":{icon:"🏠",color:"#4CAF50",label:"HOME I"},"HOME II":{icon:"⚡",color:"#2196F3",label:"HOME II"},"HOME III":{icon:"🔋",color:"#9C27B0",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"#FF9800",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"#FF9800",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"#9E9E9E",label:"DO NOTHING"}},Fo={yesterday:"📊 Včera",today:"📆 Dnes",tomorrow:"📅 Zítra",history:"📈 Historie",detail:"💎 Detail"};function Aa(e){return{modeHistorical:e.mode_historical??e.mode??"",modePlanned:e.mode_planned??"",modeMatch:e.mode_match??!1,status:e.status??"planned",startTime:e.start_time??"",endTime:e.end_time??"",durationHours:e.duration_hours??0,costHistorical:e.cost_historical??null,costPlanned:e.cost_planned??null,costDelta:e.cost_delta??null,solarKwh:e.solar_total_kwh??0,consumptionKwh:e.consumption_total_kwh??0,gridImportKwh:e.grid_import_total_kwh??0,gridExportKwh:e.grid_export_total_kwh??0,intervalReasons:Array.isArray(e.interval_reasons)?e.interval_reasons:[]}}function $n(e){return{plan:(e==null?void 0:e.plan)??0,actual:(e==null?void 0:e.actual)??null,hasActual:(e==null?void 0:e.has_actual)??!1,unit:(e==null?void 0:e.unit)??""}}function Lc(e){const t=(e==null?void 0:e.metrics)??{};return{overallAdherence:(e==null?void 0:e.overall_adherence)??0,modeSwitches:(e==null?void 0:e.mode_switches)??0,totalCost:(e==null?void 0:e.total_cost)??0,metrics:{cost:$n(t.cost),solar:$n(t.solar),consumption:$n(t.consumption),grid:$n(t.grid)},completedSummary:e!=null&&e.completed_summary?{count:e.completed_summary.count??0,totalCost:e.completed_summary.total_cost??0,adherencePct:e.completed_summary.adherence_pct??0}:void 0,plannedSummary:e!=null&&e.planned_summary?{count:e.planned_summary.count??0,totalCost:e.planned_summary.total_cost??0}:void 0,progressPct:e==null?void 0:e.progress_pct,actualTotalCost:e==null?void 0:e.actual_total_cost,planTotalCost:e==null?void 0:e.plan_total_cost,vsPlanPct:e==null?void 0:e.vs_plan_pct,backupBaselineCost:e==null?void 0:e.backup_baseline_cost,backupActualCost:e==null?void 0:e.backup_actual_cost,backupSavings:e==null?void 0:e.backup_savings,eodPrediction:e!=null&&e.eod_prediction?{predictedTotal:e.eod_prediction.predicted_total??0,predictedSavings:e.eod_prediction.predicted_savings??0}:void 0}}function Ac(e){return e?{date:e.date??"",modeBlocks:Array.isArray(e.mode_blocks)?e.mode_blocks.map(Aa):[],summary:Lc(e.summary),metadata:e.metadata?{activePlan:e.metadata.active_plan??"hybrid",comparisonPlanAvailable:e.metadata.comparison_plan_available}:void 0,comparison:e.comparison?{plan:e.comparison.plan??"",modeBlocks:Array.isArray(e.comparison.mode_blocks)?e.comparison.mode_blocks.map(Aa):[]}:void 0}:null}async function Fc(e,t,i="hybrid"){try{const n=await ne.loadDetailTabs(e,t,i);if(!n)return null;const r=n[t]??n;return Ac(r)}catch(n){return C.error(`Failed to load timeline tab: ${t}`,n),null}}const Br={tiles_left:[null,null,null,null,null,null],tiles_right:[null,null,null,null,null,null],left_count:4,right_count:4,visible:!0,version:1},Io="oig_dashboard_tiles";function Ic(e,t){return t==="W"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kW"}:t==="Wh"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kWh"}:t==="W"||t==="Wh"?{value:Math.round(e).toString(),unit:t}:{value:e.toFixed(1),unit:t}}async function Bc(){var e;try{const t=await ne.callWS({type:"call_service",domain:"oig_cloud",service:"get_dashboard_tiles",service_data:{},return_response:!0}),i=(e=t==null?void 0:t.response)==null?void 0:e.config;if(i&&typeof i=="object")return C.debug("Loaded tiles config from HA"),Ia(i)}catch(t){C.debug("WS tile config load failed, trying localStorage",{error:t.message})}try{const t=localStorage.getItem(Io);if(t){const i=JSON.parse(t);return C.debug("Loaded tiles config from localStorage"),Ia(i)}}catch{C.debug("localStorage tile config load failed")}return Br}async function Fa(e){try{return localStorage.setItem(Io,JSON.stringify(e)),await ne.callService("oig_cloud","save_dashboard_tiles",{config:JSON.stringify(e)}),C.info("Tiles config saved"),!0}catch(t){return C.error("Failed to save tiles config",t),!1}}function Ia(e){return{tiles_left:Array.isArray(e.tiles_left)?e.tiles_left.slice(0,6):Br.tiles_left,tiles_right:Array.isArray(e.tiles_right)?e.tiles_right.slice(0,6):Br.tiles_right,left_count:typeof e.left_count=="number"?e.left_count:4,right_count:typeof e.right_count=="number"?e.right_count:4,visible:e.visible!==!1,version:e.version??1}}function fr(e){var l;const t=dt();if(!t)return{value:"--",unit:"",isActive:!1,rawValue:0};const i=t.get(e);if(!i||i.state==="unavailable"||i.state==="unknown")return{value:"--",unit:"",isActive:!1,rawValue:0};const n=i.state,r=String(((l=i.attributes)==null?void 0:l.unit_of_measurement)??""),a=parseFloat(n)||0;if(i.entity_id.startsWith("switch.")||i.entity_id.startsWith("binary_sensor."))return{value:n==="on"?"Zapnuto":"Vypnuto",unit:"",isActive:n==="on",rawValue:n==="on"?1:0};const o=Ic(a,r);return{value:o.value,unit:o.unit,isActive:a!==0,rawValue:a}}function Mi(e){const t=(i,n)=>{var a,o;const r=[];for(let l=0;l<n;l++){const d=i[l];if(!d)continue;const p=fr(d.entity_id),u={};if((a=d.support_entities)!=null&&a.top_right){const h=fr(d.support_entities.top_right);u.topRight={value:h.value,unit:h.unit}}if((o=d.support_entities)!=null&&o.bottom_right){const h=fr(d.support_entities.bottom_right);u.bottomRight={value:h.value,unit:h.unit}}r.push({config:d,value:p.value,unit:p.unit,isActive:p.isActive,isZero:p.rawValue===0,formattedValue:p.unit?`${p.value} ${p.unit}`:p.value,supportValues:u})}return r};return{left:t(e.tiles_left,e.left_count),right:t(e.tiles_right,e.right_count)}}async function Nc(e,t="toggle"){const i=e.split(".")[0];return ne.callService(i,t,{entity_id:e})}function ie(e,t="CZK"){return e==null||Number.isNaN(e)?`-- ${t}`:`${e.toFixed(2)} ${t}`}function ii(e,t=0){return e==null||Number.isNaN(e)?"-- %":`${e.toFixed(t)} %`}const Rc={fridge:"❄️","fridge-outline":"❄️",dishwasher:"🍽️","washing-machine":"🧺","tumble-dryer":"🌪️",stove:"🔥",microwave:"📦","coffee-maker":"☕",kettle:"🫖",toaster:"🍞",lightbulb:"💡","lightbulb-outline":"💡",lamp:"🪔","ceiling-light":"💡","floor-lamp":"🪔","led-strip":"✨","led-strip-variant":"✨","wall-sconce":"💡",chandelier:"💡",thermometer:"🌡️",thermostat:"🌡️",radiator:"♨️","radiator-disabled":"❄️","heat-pump":"♨️","air-conditioner":"❄️",fan:"🌀",hvac:"♨️",fire:"🔥",snowflake:"❄️","lightning-bolt":"⚡",flash:"⚡",battery:"🔋","battery-charging":"🔋","battery-50":"🔋","solar-panel":"☀️","solar-power":"☀️","meter-electric":"⚡","power-plug":"🔌","power-socket":"🔌",car:"🚗","car-electric":"🚘","car-battery":"🔋","ev-station":"🔌","ev-plug-type2":"🔌",garage:"🏠","garage-open":"🏠",door:"🚪","door-open":"🚪",lock:"🔒","lock-open":"🔓","shield-home":"🛡️",cctv:"📹",camera:"📹","motion-sensor":"👁️","alarm-light":"🚨",bell:"🔔","window-closed":"🪟","window-open":"🪟",blinds:"🪟","blinds-open":"🪟",curtains:"🪟","roller-shade":"🪟",television:"📺",speaker:"🔊","speaker-wireless":"🔊",music:"🎵","volume-high":"🔊",cast:"📡",chromecast:"📡","router-wireless":"📡",wifi:"📶","access-point":"📡",lan:"🌐",network:"🌐","home-assistant":"🏠",water:"💧","water-percent":"💧","water-boiler":"♨️","water-pump":"💧",shower:"🚿",toilet:"🚽",faucet:"🚰",pipe:"🔧","weather-sunny":"☀️","weather-cloudy":"☁️","weather-night":"🌙","weather-rainy":"🌧️","weather-snowy":"❄️","weather-windy":"💨",information:"ℹ️","help-circle":"❓","alert-circle":"⚠️","checkbox-marked-circle":"✅","toggle-switch":"🔘",power:"⚡",sync:"🔄"};function Dn(e){const t=e.replace(/^mdi:/,"");return Rc[t]||"⚙️"}function mr(e,t){let i=!1;return(...n)=>{i||(e(...n),i=!0,setTimeout(()=>i=!1,t))}}async function Di(e,t=3,i=1e3){let n;for(let r=0;r<=t;r++)try{return await e()}catch(a){if(n=a,a instanceof Error&&(a.message.includes("401")||a.message.includes("403")))throw a;if(r<t){const o=Math.min(i*Math.pow(2,r),5e3);await new Promise(l=>setTimeout(l,o))}}throw n}class jc{constructor(){this.state={...So,pendingServices:new Map,changingServices:new Set},this.listeners=new Set,this.watcherUnsub=null,this.queueUpdateInterval=null,this.started=!1}start(){this.started||(this.started=!0,this.watcherUnsub=Dt.onEntityChange((t,i)=>{t&&this.shouldRefreshShield(t)&&this.refresh()}),this.refresh(),this.queueUpdateInterval=window.setInterval(()=>{this.state.allRequests.length>0&&this.notify()},1e3),C.debug("ShieldController started"))}stop(){var t;(t=this.watcherUnsub)==null||t.call(this),this.watcherUnsub=null,this.queueUpdateInterval!==null&&(clearInterval(this.queueUpdateInterval),this.queueUpdateInterval=null),this.started=!1,C.debug("ShieldController stopped")}subscribe(t){return this.listeners.add(t),t(this.state),()=>this.listeners.delete(t)}getState(){return this.state}shouldRefreshShield(t){return["service_shield_","box_prms_mode","box_mode_extended","box_prm2_app","boiler_manual_mode","invertor_prms_to_grid","invertor_prm1_p_max_feed_grid"].some(n=>t.includes(n))}readSupplementaryState(t){const i=t.findSensorId("box_mode_extended"),n=t.get(i);if(!n||n.state==="unavailable"||n.state==="unknown"||n.state==="")return{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1};const r=n.attributes??{};return{home_grid_v:r.home_grid_v===!0,home_grid_vi:r.home_grid_vi===!0,flexibilita:r.flexibilita===!0,available:!0}}refresh(){const t=dt();if(t)try{const i=t.findSensorId("service_shield_activity"),n=t.get(i),r=(n==null?void 0:n.attributes)??{},a=r.running_requests??[],o=r.queued_requests??[],l=t.findSensorId("service_shield_status"),d=t.findSensorId("service_shield_queue"),p=t.getString(l).value,u=t.getNumeric(d).value,h=t.getString(t.findSensorId("box_prms_mode")).value,g=t.getString(t.findSensorId("invertor_prms_to_grid")).value,m=t.getNumeric(t.findSensorId("invertor_prm1_p_max_feed_grid")).value,b=t.getString(t.findSensorId("boiler_manual_mode")).value,y=va[h.trim()]??"home_1",_=xa[b.trim()]??"cbb",$=a.map((Y,N)=>this.parseRequest(Y,N,!0)),v=o.map((Y,N)=>this.parseRequest(Y,N+a.length,!1)),P=[...$,...v],j=new Map,B=new Set;for(const Y of P){const N=this.parseServiceRequest(Y);N&&!j.has(N.type)&&(j.set(N.type,N.targetValue),B.add(N.type))}const K=p==="Running"||p==="running",A=Co({gridModeRaw:g,gridLimit:m},{pendingServices:j,changingServices:B,shieldStatus:K?"running":"idle"}),U=Dr(g)||A.currentLiveDelivery==="unknown"?this.state.currentGridDelivery:A.currentLiveDelivery;this.state={status:K?"running":"idle",activity:(n==null?void 0:n.state)??"",queueCount:u,runningRequests:$,queuedRequests:v,allRequests:P,currentBoxMode:y,currentGridDelivery:U,currentGridLimit:A.currentLiveLimit??0,currentBoilerMode:_,pendingServices:j,changingServices:B,gridDeliveryState:A,supplementary:this.readSupplementaryState(t)},this.notify()}catch(i){C.error("ShieldController refresh failed",i)}}parseRequest(t,i,n){const r=t||{},a=r.service??"",l=(Array.isArray(r.changes)?r.changes:[]).map(b=>typeof b=="string"?b:String(b??"")).filter(b=>b.length>0),d=r.started_at??r.queued_at??r.created_at??r.timestamp??r.created??"",p=Array.isArray(r.targets)?r.targets.map(b=>({param:String((b==null?void 0:b.param)??""),value:String((b==null?void 0:b.value)??(b==null?void 0:b.to)??""),entityId:String((b==null?void 0:b.entity_id)??(b==null?void 0:b.entityId)??""),from:String((b==null?void 0:b.from)??""),to:String((b==null?void 0:b.to)??(b==null?void 0:b.value)??""),current:String((b==null?void 0:b.current)??"")})):[],u=this.extractRequestParams(r.params),h=this.extractGridDeliveryStep(r,u),g=this.resolveRequestTargetValue(r,p,u,h);let m="mode_change";if(a.includes("set_box_mode")){const b=this.extractRequestParams(r.params);m=(b==null?void 0:b.home_grid_v)!==void 0||(b==null?void 0:b.home_grid_vi)!==void 0||Array.isArray(r.targets)&&r.targets.some(_=>(_==null?void 0:_.param)==="app")?"supplementary_toggle":"mode_change"}else a.includes("set_grid_delivery")&&!a.includes("limit")?m="grid_delivery":a.includes("grid_delivery_limit")||a.includes("set_grid_delivery")?m="grid_limit":a.includes("set_boiler_mode")?m="boiler_mode":a.includes("set_formating_mode")&&(m="battery_formating");return{id:`${a}_${i}_${d}`,type:m,status:n?"running":"queued",service:a,targetValue:g,changes:l,createdAt:d,position:i+1,description:typeof r.description=="string"?r.description:void 0,params:u,targets:p,traceId:typeof r.trace_id=="string"?r.trace_id:void 0,gridDeliveryStep:h}}parseServiceRequest(t){var p,u;const i=t.service;if(!i)return null;const n=t.changes.length>0?t.changes[0]:"",r=t.params,a=t.gridDeliveryStep,o=this.extractStructuredTarget(t);if(i.includes("set_grid_delivery")&&o)return o;if(i.includes("set_grid_delivery")&&n.includes("p_max_feed_grid")){const h=n.match(/→\s*'?(\d+)'?/),g=h?h[1]:t.targetValue;return g?{type:"grid_limit",targetValue:g}:null}const l=n.match(/→\s*'([^']+)'/),d=l?l[1]:t.targetValue||"";if(i.includes("set_box_mode")){if(((p=t.targets)==null?void 0:p.some(g=>g.param==="app"))||(r==null?void 0:r.home_grid_v)!==void 0||(r==null?void 0:r.home_grid_vi)!==void 0){const g=(u=t.targets)==null?void 0:u.find(y=>y.param==="app"),m=(g==null?void 0:g.to)||t.targetValue;return{type:"supplementary",targetValue:ko[m]??m??""}}return{type:"box_mode",targetValue:d}}if(i.includes("set_boiler_mode"))return{type:"boiler_mode",targetValue:d};if(i.includes("set_grid_delivery")&&n.includes("prms_to_grid"))return{type:"grid_mode",targetValue:d};if(i.includes("set_grid_delivery")){if(a==="limit"){const g=this.normalizeNumericTargetValue((r==null?void 0:r.limit)??t.targetValue);return g?{type:"grid_limit",targetValue:g}:null}if(a==="mode"){const g=this.normalizeModeTargetValue((r==null?void 0:r.mode)??t.targetValue);return g?{type:"grid_mode",targetValue:g}:null}const h=n.match(/→\s*'?(\d+)'?/);return h?{type:"grid_limit",targetValue:h[1]}:t.targetValue&&/^\d+$/.test(t.targetValue.trim())?{type:"grid_limit",targetValue:t.targetValue}:{type:"grid_mode",targetValue:d}}return null}extractRequestParams(t){if(!(!t||typeof t!="object"||Array.isArray(t)))return t}extractGridDeliveryStep(t,i){const n=(t==null?void 0:t.grid_delivery_step)??(i==null?void 0:i._grid_delivery_step);return typeof n=="string"?n:void 0}resolveRequestTargetValue(t,i,n,r){const a=this.extractStructuredTarget({service:(t==null?void 0:t.service)??"",targetValue:"",params:n,targets:i,gridDeliveryStep:r});if(a!=null&&a.targetValue)return a.targetValue;const o=t.target_value??t.target_display;return typeof o=="string"?o:""}extractStructuredTarget(t){if(!t.service.includes("set_grid_delivery"))return null;const i=t.gridDeliveryStep,n=t.params,r=t.targets??[];if(i==="limit"){const l=this.findTargetValue(r,["limit"]),d=this.normalizeNumericTargetValue(l??(n==null?void 0:n.limit)??t.targetValue);return d?{type:"grid_limit",targetValue:d}:null}if(i==="mode"){const l=this.findTargetValue(r,["mode"]),d=this.normalizeModeTargetValue(l??(n==null?void 0:n.mode)??t.targetValue);return d?{type:"grid_mode",targetValue:d}:null}const a=this.findTargetValue(r,["limit"]);if(a){const l=this.normalizeNumericTargetValue(a);if(l)return{type:"grid_limit",targetValue:l}}const o=this.findTargetValue(r,["mode"]);if(o){const l=this.normalizeModeTargetValue(o);if(l)return{type:"grid_mode",targetValue:l}}return null}findTargetValue(t,i){const n=new Set(i),r=t.find(a=>n.has(a.param));return(r==null?void 0:r.to)||(r==null?void 0:r.value)||void 0}normalizeNumericTargetValue(t){if(typeof t=="number"&&Number.isFinite(t))return String(Math.round(t));if(typeof t!="string")return"";const i=t.trim().match(/(\d+)/);return i?i[1]:""}normalizeModeTargetValue(t){if(typeof t!="string")return"";const i=t.trim();switch(i.toLowerCase()){case"off":return"Vypnuto";case"on":return"Zapnuto";case"limited":return"Omezeno";default:return i}}isLimitedGridDeliveryActiveOrPending(){const t=this.state.gridDeliveryState;if(t.pendingDeliveryTarget==="limited"||t.pendingLimitTarget!==null||t.currentLiveDelivery==="limited"||t.currentLiveDelivery==="unknown"&&(Dl(t)==="limited"||this.state.currentGridDelivery==="limited"))return!0;const i=dt();if(i){const n=i.getString(i.findSensorId("invertor_prms_to_grid")).value;if(!Dr(n)&&qr(n)==="limited")return!0}return!1}needsGridModeChangeForLimitedRequest(){return!this.isLimitedGridDeliveryActiveOrPending()}getBoxModeButtonState(t){const i=this.state.pendingServices.get("box_mode");return i?va[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoxMode===t?"active":"idle"}getGridDeliveryButtonState(t){return this.getGridDeliveryButtonStateV2(t)}getGridDeliveryButtonStateV2(t){const i=this.state.gridDeliveryState,r=this.state.status==="running"?"processing":"pending",a=i.pendingDeliveryTarget,o=i.pendingLimitTarget,l=i.currentLiveDelivery;return a!==null?a===t?r:t==="limited"&&l==="limited"||t==="limited"&&l==="unknown"&&this.state.currentGridDelivery==="limited"?"active":"disabled-by-service":o!==null?t==="limited"?r:"disabled-by-service":l===t?"active":"idle"}getBoilerModeButtonState(t){const i=this.state.pendingServices.get("boiler_mode");return i?xa[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoilerMode===t?"active":"idle"}isAnyServiceChanging(){return this.state.changingServices.size>0}shouldProceedWithQueue(){return this.state.queueCount<3?!0:window.confirm(`⚠️ VAROVÁNÍ: Fronta již obsahuje ${this.state.queueCount} úkolů!

Každá změna může trvat až 10 minut.
Opravdu chcete přidat další úkol?`)}async setBoxMode(t){if(this.state.currentBoxMode===t&&!this.state.changingServices.has("box_mode"))return!1;const i=await ne.callService("oig_cloud","set_box_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async setGridDelivery(t,i){const n={acknowledgement:!0,warning:!0};t==="limited"&&i!=null?(this.needsGridModeChangeForLimitedRequest()&&(n.mode=t),n.limit=i):i!=null?n.limit=i:n.mode=t;const r=await ne.callService("oig_cloud","set_grid_delivery",n);return r&&this.refresh(),r}async setBoilerMode(t){if(this.state.currentBoilerMode===t&&!this.state.changingServices.has("boiler_mode"))return!1;const i=await ne.callService("oig_cloud","set_boiler_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async removeFromQueue(t){const i=await ne.callService("oig_cloud","shield_remove_from_queue",{position:t});return i&&this.refresh(),i}async setSupplementaryToggle(t,i){const n=await ne.callService("oig_cloud","set_box_mode",{[t]:i,acknowledgement:!0});return n&&this.refresh(),n}notify(){for(const t of this.listeners)try{t(this.state)}catch(i){C.error("ShieldController listener error",i)}}}const ae=new jc;var Hc=Object.defineProperty,Vc=Object.getOwnPropertyDescriptor,Nt=(e,t,i,n)=>{for(var r=n>1?void 0:n?Vc(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Hc(t,i,r),r};const Me=Z;let Qe=class extends z{constructor(){super(...arguments),this.title="Energetické Toky",this.time="",this.showStatus=!1,this.alertCount=0,this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1}onStatusClick(){this.dispatchEvent(new CustomEvent("status-click",{bubbles:!0}))}onEditClick(){this.dispatchEvent(new CustomEvent("edit-click",{bubbles:!0}))}onResetClick(){this.dispatchEvent(new CustomEvent("reset-click",{bubbles:!0}))}onToggleLeftPanel(){this.dispatchEvent(new CustomEvent("toggle-left-panel",{bubbles:!0}))}onToggleRightPanel(){this.dispatchEvent(new CustomEvent("toggle-right-panel",{bubbles:!0}))}render(){const e=this.alertCount>0?"warning":"ok";return c`
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
    `}};Qe.styles=M`
    :host {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: ${Me(s.bgPrimary)};
      border-bottom: 1px solid ${Me(s.divider)};
      gap: 12px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
      color: ${Me(s.textPrimary)};
      margin: 0;
    }

    .title-icon { font-size: 20px; }

    .version {
      font-size: 11px;
      color: ${Me(s.textSecondary)};
      background: ${Me(s.bgSecondary)};
      padding: 2px 6px;
      border-radius: 4px;
    }

    .time {
      font-size: 13px;
      color: ${Me(s.textSecondary)};
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
      background: ${Me(s.warning)};
      color: #fff;
    }

    .status-badge.error {
      background: ${Me(s.error)};
      color: #fff;
    }

    .status-badge.ok {
      background: ${Me(s.success)};
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
      color: ${Me(s.textSecondary)};
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: ${Me(s.bgSecondary)};
      color: ${Me(s.textPrimary)};
    }

    .action-btn.active {
      background: ${Me(s.accent)};
      color: #fff;
    }
  `;Nt([f({type:String})],Qe.prototype,"title",2);Nt([f({type:String})],Qe.prototype,"time",2);Nt([f({type:Boolean})],Qe.prototype,"showStatus",2);Nt([f({type:Number})],Qe.prototype,"alertCount",2);Nt([f({type:Boolean})],Qe.prototype,"leftPanelCollapsed",2);Nt([f({type:Boolean})],Qe.prototype,"rightPanelCollapsed",2);Qe=Nt([E("oig-header")],Qe);function Bo(e,t){let i=null;return function(...n){i!==null&&clearTimeout(i),i=window.setTimeout(()=>{e.apply(this,n),i=null},t)}}var Wc=Object.defineProperty,Kc=Object.getOwnPropertyDescriptor,sn=(e,t,i,n)=>{for(var r=n>1?void 0:n?Kc(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Wc(t,i,r),r};const Ba="oig_v2_theme";let Et=class extends z{constructor(){super(...arguments),this.mode="auto",this.isDark=!1,this.breakpoint="desktop",this.width=1280,this.mediaQuery=null,this.resizeObserver=null,this.debouncedResize=Bo(this.updateBreakpoint.bind(this),100),this.onMediaChange=e=>{this.mode==="auto"&&(this.isDark=e.matches,this.dispatchEvent(new CustomEvent("theme-changed",{detail:{isDark:this.isDark}})))},this.onThemeChange=()=>{this.detectTheme()}}connectedCallback(){super.connectedCallback(),this.loadTheme(),this.setupMediaQuery(),this.setupResizeObserver(),this.detectTheme(),window.addEventListener("oig-theme-change",this.onThemeChange)}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mediaQuery)==null||e.removeEventListener("change",this.onMediaChange),(t=this.resizeObserver)==null||t.disconnect(),window.removeEventListener("oig-theme-change",this.onThemeChange)}loadTheme(){const e=localStorage.getItem(Ba);e&&["light","dark","auto"].includes(e)&&(this.mode=e)}saveTheme(){localStorage.setItem(Ba,this.mode)}setupMediaQuery(){this.mediaQuery=window.matchMedia("(prefers-color-scheme: dark)"),this.mediaQuery.addEventListener("change",this.onMediaChange)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(this.debouncedResize),this.resizeObserver.observe(document.documentElement),this.updateBreakpoint()}updateBreakpoint(){this.width=window.innerWidth,this.breakpoint=ti(this.width)}detectTheme(){this.mode==="auto"?this.isDark=window.matchMedia("(prefers-color-scheme: dark)").matches:this.isDark=this.mode==="dark"}setTheme(e){this.mode=e,this.saveTheme(),this.detectTheme(),this.dispatchEvent(new CustomEvent("theme-changed",{detail:{mode:e,isDark:this.isDark}})),C.info("Theme changed",{mode:e,isDark:this.isDark})}getThemeInfo(){return{mode:this.mode,isDark:this.isDark,breakpoint:this.breakpoint,width:this.width}}render(){return c`
      <slot></slot>
    `}};Et.styles=M`
    :host {
      display: contents;
    }
  `;sn([f({type:String})],Et.prototype,"mode",2);sn([T()],Et.prototype,"isDark",2);sn([T()],Et.prototype,"breakpoint",2);sn([T()],Et.prototype,"width",2);Et=sn([E("oig-theme-provider")],Et);var qc=Object.defineProperty,Yc=Object.getOwnPropertyDescriptor,Gr=(e,t,i,n)=>{for(var r=n>1?void 0:n?Yc(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&qc(t,i,r),r};let Hi=class extends z{constructor(){super(...arguments),this.tabs=[],this.activeTab=""}onTabClick(e){e!==this.activeTab&&(this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tabId:e},bubbles:!0})))}isActive(e){return this.activeTab===e}render(){return c`
      ${this.tabs.map(e=>c`
        <button 
          class="tab ${this.isActive(e.id)?"active":""}"
          @click=${()=>this.onTabClick(e.id)}
        >
          ${e.icon?c`<span class="tab-icon">${e.icon}</span>`:null}
          <span>${e.label}</span>
        </button>
      `)}
    `}};Hi.styles=M`
    :host {
      display: flex;
      gap: 8px;
      padding: 0 16px;
      background: ${Z(s.bgPrimary)};
      border-bottom: 1px solid ${Z(s.divider)};
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
      color: ${Z(s.textSecondary)};
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab:hover {
      color: ${Z(s.textPrimary)};
      background: ${Z(s.bgSecondary)};
    }

    .tab.active {
      color: ${Z(s.accent)};
      border-bottom-color: ${Z(s.accent)};
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
  `;Gr([f({type:Array})],Hi.prototype,"tabs",2);Gr([f({type:String})],Hi.prototype,"activeTab",2);Hi=Gr([E("oig-tabs")],Hi);var Uc=Object.defineProperty,Gc=Object.getOwnPropertyDescriptor,Zr=(e,t,i,n)=>{for(var r=n>1?void 0:n?Gc(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Uc(t,i,r),r};const Zc="oig_v2_layout_",br=Z;let Vi=class extends z{constructor(){super(...arguments),this.editable=!1,this.breakpoint="desktop",this.onResize=Bo(()=>{this.breakpoint=ti(window.innerWidth)},100)}connectedCallback(){super.connectedCallback(),this.breakpoint=ti(window.innerWidth),window.addEventListener("resize",this.onResize)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("resize",this.onResize)}updated(e){e.has("breakpoint")&&this.setAttribute("breakpoint",this.breakpoint)}resetLayout(){const e=`${Zc}${this.breakpoint}`;localStorage.removeItem(e),this.requestUpdate()}render(){return c`<slot></slot>`}};Vi.styles=M`
    :host {
      display: grid;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      background: ${br(s.bgSecondary)};
    }

    :host([breakpoint='mobile']) { grid-template-columns: 1fr; }
    :host([breakpoint='tablet']) { grid-template-columns: repeat(2, 1fr); }
    :host([breakpoint='desktop']) { grid-template-columns: repeat(3, 1fr); }

    .grid-item {
      position: relative;
      background: ${br(s.cardBg)};
      border-radius: 8px;
      box-shadow: ${br(s.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .grid-item.editable { cursor: move; }
    .grid-item.editable:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .grid-item.dragging { opacity: 0.8; transform: scale(1.02); z-index: 100; }

    @media (max-width: 768px) {
      :host { gap: 12px; padding: 12px; }
    }
  `;Zr([f({type:Boolean})],Vi.prototype,"editable",2);Zr([T()],Vi.prototype,"breakpoint",2);Vi=Zr([E("oig-grid")],Vi);const Qc={off:"Vypnuto",on:"Zapnuto",limited:"Omezeno",unknown:"?"};function Na(e){return Qc[e]??e}const No=e=>{const t=e.trim();return t?t.endsWith("W")?t:`${t}W`:""};function Xc(e){const t=e.isUnavailable;let i;t||e.currentLiveDelivery==="unknown"?i="?":e.currentLiveDelivery==="limited"&&e.currentLiveLimit!==null?i=`Omezeno ${e.currentLiveLimit}W`:i=Na(e.currentLiveDelivery);const n=!t&&e.currentLiveDelivery==="limited";let r=null,a=null;!t&&e.currentLiveLimit!==null&&(a=`${e.currentLiveLimit}W`,r=n?"Aktivní limit":"Nastavený limit");let o=null,l=null;return e.pendingDeliveryTarget!==null&&(o=`Ve frontě: ${Na(e.pendingDeliveryTarget)}`),e.pendingLimitTarget!==null&&(l=`Ve frontě: limit ${No(String(e.pendingLimitTarget))}`),{currentModeText:i,limitLabel:r,limitValue:a,showLimitAsActive:n,isUnavailable:t,isTransitioning:e.isTransitioning,pendingModeText:o,pendingLimitText:l}}function Jc(e,t){const i=t.has("box_mode"),n=e.get("box_mode"),r=t.has("grid_mode")||t.has("grid_limit"),a=e.get("grid_limit"),o=e.get("grid_mode");let l=null;if(a){const d=No(a);l=d?`→ ${d}`:null}else o&&(l=`→ ${o}`);return{inverterModeChanging:i,inverterModeText:n?`→ ${n}`:null,gridExportChanging:r,gridExportText:l}}var ed=Object.defineProperty,td=Object.getOwnPropertyDescriptor,Zn=(e,t,i,n)=>{for(var r=n>1?void 0:n?td(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&ed(t,i,r),r};let ai=class extends z{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1}get fillHeight(){return Math.max(0,Math.min(100,this.soc))/100*54}get fillY(){return 13+(54-this.fillHeight)}render(){return c`
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
    `}};ai.styles=M`
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
  `;Zn([f({type:Number})],ai.prototype,"soc",2);Zn([f({type:Boolean})],ai.prototype,"charging",2);Zn([f({type:Boolean})],ai.prototype,"gridCharging",2);ai=Zn([E("oig-battery-gauge")],ai);var id=Object.defineProperty,nd=Object.getOwnPropertyDescriptor,Qn=(e,t,i,n)=>{for(var r=n>1?void 0:n?nd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&id(t,i,r),r};let oi=class extends z{constructor(){super(...arguments),this.power=0,this.percent=0,this.maxPower=5400}get isNight(){return this.percent<2}get level(){return this.percent<2?"night":this.percent<20?"low":this.percent<65?"mid":"high"}get sunColor(){const e=this.level;return e==="low"?"#b0bec5":e==="mid"?"#ffd54f":"#ffb300"}get rayLen(){const e=this.level;return e==="low"?4:e==="mid"?7:10}get rayOpacity(){const e=this.level;return e==="low"?.5:e==="mid"?.8:1}get coreRadius(){const e=this.level;return e==="low"?7:e==="mid"?9:11}renderMoon(){return Q`
      <circle cx="24" cy="24" r="20" fill="#3949ab" opacity="0.28"/>
      <g class="moon-body">
        <path d="M24 6 A18 18 0 1 0 24 42 A13 13 0 1 1 24 6Z" fill="#cfd8dc" opacity="0.95"/>
      </g>
      <circle class="star" cx="7" cy="10" r="1.5" fill="#e8eaf6" style="animation-delay:0s"/>
      <circle class="star" cx="41" cy="7" r="1.8" fill="#e8eaf6" style="animation-delay:0.7s"/>
      <circle class="star" cx="5" cy="30" r="1.2" fill="#c5cae9" style="animation-delay:1.4s"/>
      <circle class="star" cx="6" cy="44" r="1.0" fill="#c5cae9" style="animation-delay:2.1s"/>
      <circle class="star" cx="42" cy="39" r="1.3" fill="#e8eaf6" style="animation-delay:2.8s"/>
    `}renderSun(){const i=this.coreRadius,n=i+3,r=n+this.rayLen,a=this.sunColor,o=this.rayOpacity,d=[0,45,90,135,180,225,270,315].map(u=>{const h=u*Math.PI/180,g=24+Math.cos(h)*n,m=24+Math.sin(h)*n,b=24+Math.cos(h)*r,y=24+Math.sin(h)*r;return Q`
        <line class="ray"
          x1="${g}" y1="${m}" x2="${b}" y2="${y}"
          stroke="${a}" stroke-width="2.5" opacity="${o}"
        />
      `}),p=this.level==="low";return Q`
      <!-- Paprsky obaleny v <g> pro CSS rotaci -->
      <g class="rays-group">
        ${d}
      </g>
      <circle class="sun-core" cx="${24}" cy="${24}" r="${i}" fill="${a}" />
      ${p?Q`
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
    `}};oi.styles=M`
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
  `;Qn([f({type:Number})],oi.prototype,"power",2);Qn([f({type:Number})],oi.prototype,"percent",2);Qn([f({type:Number})],oi.prototype,"maxPower",2);oi=Qn([E("oig-solar-icon")],oi);var rd=Object.defineProperty,ad=Object.getOwnPropertyDescriptor,ln=(e,t,i,n)=>{for(var r=n>1?void 0:n?ad(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&rd(t,i,r),r};let Ot=class extends z{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1,this.discharging=!1,this._clipId=`batt-clip-${Math.random().toString(36).slice(2)}`}get fillColor(){return this.gridCharging?"#42a5f5":this.soc>50?"#4caf50":this.soc>20?"#ff9800":"#f44336"}get fillHeight(){return Math.max(1,Math.min(100,this.soc)/100*48)}get fillY(){return 14+(48-this.fillHeight)}get stripeColor(){return this.gridCharging?"#90caf9":"#a5d6a7"}render(){const e=this.charging||this.gridCharging,t=this.soc>=25;return c`
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
        ${e?Q`
          <rect
            class="charge-stripe active"
            x="4" y="52" width="24" height="8" rx="2"
            fill="${this.stripeColor}"
            clip-path="url(#${this._clipId})"
          />
        `:""}

        <!-- SoC text uvnitř -->
        ${t?Q`
          <text class="soc-text" x="16" y="${this.fillY+this.fillHeight/2}">
            ${Math.round(this.soc)}%
          </text>
        `:""}
      </svg>
    `}};Ot.styles=M`
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
  `;ln([f({type:Number})],Ot.prototype,"soc",2);ln([f({type:Boolean})],Ot.prototype,"charging",2);ln([f({type:Boolean})],Ot.prototype,"gridCharging",2);ln([f({type:Boolean})],Ot.prototype,"discharging",2);Ot=ln([E("oig-battery-icon")],Ot);var od=Object.defineProperty,sd=Object.getOwnPropertyDescriptor,Ro=(e,t,i,n)=>{for(var r=n>1?void 0:n?sd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&od(t,i,r),r};let zn=class extends z{constructor(){super(...arguments),this.power=0}get mode(){return this.power>50?"importing":this.power<-50?"exporting":"idle"}render(){const e=this.mode;return c`
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
    `}};zn.styles=M`
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
  `;Ro([f({type:Number})],zn.prototype,"power",2);zn=Ro([E("oig-grid-icon")],zn);var ld=Object.defineProperty,cd=Object.getOwnPropertyDescriptor,Xn=(e,t,i,n)=>{for(var r=n>1?void 0:n?cd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&ld(t,i,r),r};let si=class extends z{constructor(){super(...arguments),this.power=0,this.maxPower=1e4,this.boilerActive=!1}get percent(){return Math.min(100,this.power/Math.max(1,this.maxPower)*100)}get fillColor(){const e=this.percent;return e<15?"#546e7a":e<40?"#f06292":e<70?"#e91e63":"#c62828"}get level(){const e=this.percent;return e<15?"low":e<60?"mid":"high"}get windowColor(){const e=this.level;return e==="low"?"#37474f":e==="mid"?"#ffd54f":"#ffb300"}render(){const e=this.percent,t=24,i=22,n=Math.max(1,e/100*t),r=i+(t-n),a=this.level;return c`
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
        ${this.boilerActive?Q`
          <circle class="boiler-dot" cx="10" cy="43" r="3.5" fill="#ff5722" opacity="0.9"/>
          <text x="10" y="43" text-anchor="middle" dominant-baseline="middle" font-size="5" fill="white">🔥</text>
        `:""}
      </svg>
    `}};si.styles=M`
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
  `;Xn([f({type:Number})],si.prototype,"power",2);Xn([f({type:Number})],si.prototype,"maxPower",2);Xn([f({type:Boolean})],si.prototype,"boilerActive",2);si=Xn([E("oig-house-icon")],si);var dd=Object.defineProperty,pd=Object.getOwnPropertyDescriptor,cn=(e,t,i,n)=>{for(var r=n>1?void 0:n?pd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&dd(t,i,r),r};let Lt=class extends z{constructor(){super(...arguments),this.mode="",this.bypassActive=!1,this.hasAlarm=!1,this.plannerAuto=!1}get modeType(){return this.hasAlarm?"alarm":this.bypassActive?"bypass":this.mode.includes("UPS")?"ups":"normal"}render(){const e=this.modeType;return c`
      <svg viewBox="0 0 48 48">
        <!-- Hlavní box střídače -->
        <rect
          class="box ${e}"
          x="4" y="8" width="40" height="34" rx="5"
        />

        <!-- Sinusoida výstupu -->
        <path class="sine-out ${e}" d="${"M 10,28 C 14,28 14,20 18,22 C 22,24 22,32 26,32 C 30,32 30,20 34,22 C 38,24 38,28 38,28"}"/>

        <!-- UPS blesk -->
        ${e==="ups"?Q`
          <path class="ups-bolt active"
            d="M 25,12 L 20,26 L 24,26 L 23,36 L 28,22 L 24,22 Z"
          />
        `:""}

        <!-- Bypass výstraha — trojúhelník nahoře -->
        ${e==="bypass"?Q`
          <polygon
            class="warning-triangle active"
            points="24,6 18,16 30,16"
          />
          <text x="24" y="15" text-anchor="middle" dominant-baseline="middle"
            font-size="6" font-weight="bold" fill="#fff">!</text>
        `:""}

        <!-- Alarm kroužek -->
        ${e==="alarm"?Q`
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
    `}};Lt.styles=M`
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
  `;cn([f({type:String})],Lt.prototype,"mode",2);cn([f({type:Boolean})],Lt.prototype,"bypassActive",2);cn([f({type:Boolean})],Lt.prototype,"hasAlarm",2);cn([f({type:Boolean})],Lt.prototype,"plannerAuto",2);Lt=cn([E("oig-inverter-icon")],Lt);var ud=Object.defineProperty,hd=Object.getOwnPropertyDescriptor,Le=(e,t,i,n)=>{for(var r=n>1?void 0:n?hd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&ud(t,i,r),r};const G=Z,Ra=new URLSearchParams(window.location.search),gd=Ra.get("sn")||Ra.get("inverter_sn")||"",fd=e=>`sensor.oig_${gd}_${e}`,yr="oig_v2_flow_layout_",ot=["solar","battery","inverter","grid","house"],md={solar:{top:"0%",left:"0%"},house:{top:"0%",left:"65%"},inverter:{top:"35%",left:"35%"},grid:{top:"70%",left:"0%"},battery:{top:"70%",left:"65%"}};function W(e){return()=>ne.openEntityDialog(fd(e))}let Se=class extends z{constructor(){super(...arguments),this.data=Kr,this.editMode=!1,this.pendingServices=new Map,this.changingServices=new Set,this.shieldStatus="idle",this.shieldQueueCount=0,this.gridDeliveryState={currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},this.shieldUnsub=null,this.expandedNodes=new Set,this.gaugeDetailOpen=null,this.customPositions={},this.draggedNodeId=null,this.dragStartX=0,this.dragStartY=0,this.dragStartTop=0,this.dragStartLeft=0,this.onShieldUpdate=e=>{this.pendingServices=e.pendingServices,this.changingServices=e.changingServices,this.shieldStatus=e.status,this.shieldQueueCount=e.queueCount,this.gridDeliveryState=e.gridDeliveryState},this.nodeDims={},this.handleDragStart=e=>{if(!this.editMode)return;e.preventDefault(),e.stopPropagation();const i=e.target.closest(".node");if(!i)return;const n=this.findNodeId(i);if(!n)return;this.draggedNodeId=n,i.classList.add("dragging");const r=i.getBoundingClientRect();this.dragStartX=e.clientX,this.dragStartY=e.clientY,this.dragStartTop=r.top,this.dragStartLeft=r.left},this.handleTouchStart=e=>{if(!this.editMode)return;e.preventDefault();const i=e.target.closest(".node");if(!i)return;const n=this.findNodeId(i);if(!n)return;this.draggedNodeId=n,i.classList.add("dragging");const r=e.touches[0],a=i.getBoundingClientRect();this.dragStartX=r.clientX,this.dragStartY=r.clientY,this.dragStartTop=a.top,this.dragStartLeft=a.left},this.handleDragMove=e=>{!this.draggedNodeId||!this.editMode||(e.preventDefault(),this.updateDragPosition(e.clientX,e.clientY))},this.handleTouchMove=e=>{if(!this.draggedNodeId||!this.editMode)return;e.preventDefault();const t=e.touches[0];this.updateDragPosition(t.clientX,t.clientY)},this.handleDragEnd=e=>{var n;if(!this.draggedNodeId||!this.editMode)return;const t=(n=this.shadowRoot)==null?void 0:n.querySelector(".flow-grid"),i=t==null?void 0:t.querySelector(`.node-${this.draggedNodeId}`);i&&i.classList.remove("dragging"),this.saveLayout(),this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0})),this.draggedNodeId=null},this.handleTouchEnd=e=>{this.handleDragEnd(e)}}connectedCallback(){super.connectedCallback(),this.loadSavedLayout(),this.shieldUnsub=ae.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),this.removeDragListeners(),(e=this.shieldUnsub)==null||e.call(this),this.shieldUnsub=null}updated(e){e.has("editMode")&&(this.editMode?(this.setAttribute("editmode",""),this.loadSavedLayout(),this.requestUpdate(),this.updateComplete.then(()=>this.applySavedPositions())):(this.removeAttribute("editmode"),this.removeDragListeners(),this.clearInlinePositions(),this.updateComplete.then(()=>this.applyCustomPositions()))),!this.editMode&&this.hasCustomLayout&&this.updateComplete.then(()=>this.applyCustomPositions()),this.measureNodes()}measureNodes(){var n;const e=(n=this.shadowRoot)==null?void 0:n.querySelector(".flow-grid");if(!e)return;let t=!1;const i={...this.nodeDims};for(const r of ot){const a=e.querySelector(`.node-${r}`);if(!a)continue;const o=Math.round(a.offsetWidth),l=Math.round(a.offsetHeight);if(o<10||l<10)continue;const d=i[r];(!d||Math.abs(d.w-o)>1||Math.abs(d.h-l)>1)&&(i[r]={w:o,h:l},t=!0)}t&&(this.nodeDims=i)}loadSavedLayout(){const e=ti(window.innerWidth),t=`${yr}${e}`;try{const i=localStorage.getItem(t);i&&(this.customPositions=JSON.parse(i),C.debug("[FlowNode] Loaded layout for "+e))}catch{}}applySavedPositions(){var t;if(!this.editMode)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of ot){const n=this.customPositions[i];if(!n)continue;const r=e.querySelector(`.node-${i}`);r&&(r.style.top=n.top,r.style.left=n.left)}this.initDragListeners()}}clearInlinePositions(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of ot){const n=e.querySelector(`.node-${i}`);n&&(n.style.top="",n.style.left="")}}saveLayout(){const e=ti(window.innerWidth),t=`${yr}${e}`;try{localStorage.setItem(t,JSON.stringify(this.customPositions)),C.debug("[FlowNode] Saved layout for "+e)}catch{}}toggleExpand(e,t){const i=t.target;if(i.closest(".clickable")||i.closest(".indicator")||i.closest(".forecast-badge")||i.closest(".node-value")||i.closest(".node-subvalue")||i.closest(".gc-plan-btn"))return;const n=new Set(this.expandedNodes);n.has(e)?n.delete(e):n.add(e),this.expandedNodes=n}nodeClass(e,t=""){const i=this.expandedNodes.has(e)?" expanded":"";return`node node-${e}${i}${t?" "+t:""}`}gaugePill(e,t,i,n){const r=this.gaugeDetailOpen===e;return c`
      <button class="ss-pill" style="color:${i};border-color:${i}55"
        @click=${a=>{a.stopPropagation(),this.gaugeDetailOpen=r?null:e}}>${t}</button>
      ${r?c`
        <div class="ss-pop" style="border-color:${i}66"
          @click=${a=>a.stopPropagation()}>${n}</div>`:k}
    `}edgeGauge(e){const t=Math.max(0,Math.min(100,e.pct)),i=Math.max(1.5,Math.min(6,e.width??2.5)),n=e.nodeId?this.nodeDims[e.nodeId]:void 0,r=(n==null?void 0:n.w)??180,a=(n==null?void 0:n.h)??180,o=1.5,l=e.full?0:100-t,d=e.stops.map(([u,h])=>Q`<stop offset="${u}" stop-color="${h}"></stop>`),p=e.pulseDur?`--pulse-dur:${e.pulseDur}s`:"";return Q`
      <svg class="edge-gauge ${e.pulse?"pulse":""}" viewBox="0 0 ${r} ${a}"
        preserveAspectRatio="none" style=${p}>
        <defs>
          <linearGradient id=${e.id} x1="0" y1="1" x2="0" y2="0">${d}</linearGradient>
        </defs>
        <rect class="edge-track" x=${o} y=${o}
          width=${r-o*2} height=${a-o*2} rx="10.5"></rect>
        <rect class="edge-fill" x=${o} y=${o}
          width=${r-o*2} height=${a-o*2} rx="10.5"
          stroke=${`url(#${e.id})`} stroke-width=${i} pathLength="100"
          stroke-dasharray="100" stroke-dashoffset=${l}></rect>
      </svg>`}get hasCustomLayout(){return ot.some(e=>{const t=this.customPositions[e];return(t==null?void 0:t.top)!=null&&(t==null?void 0:t.left)!=null})}applyCustomPositions(){var t;if(this.editMode||!this.hasCustomLayout)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of ot){const n=e.querySelector(`.node-${i}`);if(!n)continue;const r=this.customPositions[i]??md[i];n.style.top=r.top,n.style.left=r.left}}resetLayout(){const e=ti(window.innerWidth),t=`${yr}${e}`;localStorage.removeItem(t),this.customPositions={},this.clearInlinePositions(),this.editMode&&this.requestUpdate(),C.debug("[FlowNode] Reset layout for "+e)}initDragListeners(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of ot){const n=e.querySelector(`.node-${i}`);n&&(n.addEventListener("mousedown",this.handleDragStart),n.addEventListener("touchstart",this.handleTouchStart,{passive:!1}))}document.addEventListener("mousemove",this.handleDragMove),document.addEventListener("mouseup",this.handleDragEnd),document.addEventListener("touchmove",this.handleTouchMove,{passive:!1}),document.addEventListener("touchend",this.handleTouchEnd)}}removeDragListeners(){document.removeEventListener("mousemove",this.handleDragMove),document.removeEventListener("mouseup",this.handleDragEnd),document.removeEventListener("touchmove",this.handleTouchMove),document.removeEventListener("touchend",this.handleTouchEnd)}findNodeId(e){for(const i of ot)if(e.classList.contains(`node-${i}`))return i;const t=e.closest('[class*="node-"]');if(!t)return null;for(const i of ot)if(t.classList.contains(`node-${i}`))return i;return null}updateDragPosition(e,t){var v;if(!this.draggedNodeId)return;const i=(v=this.shadowRoot)==null?void 0:v.querySelector(".flow-grid");if(!i)return;const n=i.querySelector(`.node-${this.draggedNodeId}`);if(!n)return;const r=i.getBoundingClientRect(),a=n.getBoundingClientRect(),o=e-this.dragStartX,l=t-this.dragStartY,d=this.dragStartLeft+o,p=this.dragStartTop+l,u=r.left,h=r.right-a.width,g=r.top,m=r.bottom-a.height,b=Math.max(u,Math.min(h,d)),y=Math.max(g,Math.min(m,p)),_=(b-r.left)/r.width*100,$=(y-r.top)/r.height*100;n.style.left=`${_}%`,n.style.top=`${$}%`,this.customPositions[this.draggedNodeId]={top:`${$}%`,left:`${_}%`},this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0}))}renderSolar(){const e=this.data,t=e.solarPercent,i=t<2,n=i?"linear-gradient(135deg, rgba(38,48,82,0.45) 0%, rgba(23,31,58,0.3) 100%)":Ci.solar,r="transparent",a=e.solarToday/1e3,o=Math.max(e.solarForecastToday,a),l=Math.max(0,o-a),d=o>0?Math.min(100,a/o*100):0,p=e.solarPower/1e3,u=i?"#5c6bc0":t<20?"#ff7043":t<50?"#ffa726":"#ffd54f";return c`
      <div class="${this.nodeClass("solar",i?"night":"")}" style="--node-gradient: ${n}; --node-border: ${r};"
        @click=${h=>this.toggleExpand("solar",h)}>
        ${this.edgeGauge({id:"gauge-solar",nodeId:"solar",pct:i?0:d,stops:[[0,u],[1,u]],width:2+Math.min(3,p),pulse:!i&&e.solarPower>30,pulseDur:Math.max(.9,2.2-p*.35)})}
        <div class="node-tint" style="background: radial-gradient(120% 70% at 50% 0, ${i?"rgba(57,73,171,0.18)":u+"22"}, transparent 70%)"></div>

        <button class="indicator" style="position:absolute;top:4px;right:6px;font-size:9px;z-index:3" @click=${W("solar_forecast")}
          title=${e.solarForecastStale?"Předpověď zítra (zastaralá)":"Předpověď FVE na zítra"}>
          ${e.solarForecastStale?"⚠":"🌅"} ${e.solarForecastTomorrow.toFixed(1)}
        </button>
        ${this.gaugePill("solar",`${Math.round(d)} %`,i?"#7986cb":u,c`
          <div class="ss-pop-h"><span>Výroba dne</span><b style="color:${i?"#9fa8da":u}">${Math.round(d)} %</b></div>
          <div class="gp-r"><span>Vyrobeno</span><b>${a.toFixed(1)} kWh</b></div>
          <div class="gp-r"><span>Předpověď</span><b>${o.toFixed(1)} kWh</b></div>
          <div class="gp-r"><span>Ještě vyrobí</span><b>~${l.toFixed(1)} kWh</b></div>
          <div class="gp-r"><span>Aktuální výkon</span><b>${rt(e.solarPower)} · ${Math.round(t)} % špičky</b></div>
        `)}

        <div class="node-header node-header--split" style="margin-top:16px">
          <span class="node-label">☀️ Solár</span>
          <span class="node-state" style="color:${i?"#9fa8da":u}">
            ${i?"🌙 Noc":`${Math.round(t)} % špičky`}
          </span>
        </div>
        <div class="node-value" @click=${W("actual_fv_total")}>
          ${rt(e.solarPower)}
        </div>
        <div class="node-subvalue" @click=${W("dc_in_fv_ad")}>
          Dnes ${a.toFixed(1)} <span class="nv-sub">/ ${o.toFixed(1)} kWh</span>
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
                <button class="clickable" @click=${W("extended_fve_voltage_1")}>${Math.round(e.solarV1)}V</button>
              </div>
              <div class="detail-row">
                <span class="icon">〰️</span>
                <button class="clickable" @click=${W("extended_fve_current_1")}>${e.solarI1.toFixed(1)}A</button>
              </div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${W("dc_in_fv_p1")}>${Math.round(e.solarP1)} W</button>
              </div>
            </div>
            <div>
              <div class="detail-header">🏭 String 2</div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${W("extended_fve_voltage_2")}>${Math.round(e.solarV2)}V</button>
              </div>
              <div class="detail-row">
                <span class="icon">〰️</span>
                <button class="clickable" @click=${W("extended_fve_current_2")}>${e.solarI2.toFixed(1)}A</button>
              </div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${W("dc_in_fv_p2")}>${Math.round(e.solarP2)} W</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `}openGridChargingDialog(){this.dispatchEvent(new CustomEvent("oig-grid-charging-open",{bubbles:!0,composed:!0,detail:{data:this.data.gridChargingPlan}}))}getBalancingIndicator(){const e=this.data,t=e.balancingState;return t!=="charging"&&t!=="holding"&&t!=="completed"?{show:!1,text:"",icon:"",cls:""}:t==="charging"?{show:!0,text:`Nabíjení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⚡",cls:"charging"}:t==="holding"?{show:!0,text:`Držení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⏸️",cls:"holding"}:{show:!0,text:"Dokončeno",icon:"✅",cls:"completed"}}renderBattery(){const e=this.data,t=this.getBalancingIndicator(),i=e.batteryTemp>25?"🌡️":e.batteryTemp<15?"🧊":"🌡️",n=e.batteryTemp>25?"temp-hot":e.batteryTemp<15?"temp-cold":"",r=Math.abs(e.batteryPower)/1e3,a=Math.abs(e.batteryPower)>10,o=e.batteryPower>10,l=e.batteryPower<-10,d=o?"Nabíjí":l?"Vybíjí":"Klid",p=o?"st-charge":l?"st-discharge":"st-idle",u=`${o?"+":l?"−":""}${rt(Math.abs(e.batteryPower))}`,h=y=>!!y&&/\d/.test(y),g=o&&h(e.timeToFull)?` · do plna ${e.timeToFull}`:l&&h(e.timeToEmpty)?` · do vybití ${e.timeToEmpty}`:"",m=e.batterySoC>=66?"rgba(67,160,71,0.13)":e.batterySoC>=33?"rgba(253,216,53,0.10)":"rgba(229,57,53,0.12)",b=e.batterySoC>=66?"#43a047":e.batterySoC>=33?"#fdd835":"#e53935";return c`
      <div class="${this.nodeClass("battery")}" style="--node-gradient: ${Ci.battery}; --node-border: ${yn.battery};"
        @click=${y=>this.toggleExpand("battery",y)}>
        ${this.edgeGauge({id:"gauge-battery",nodeId:"battery",pct:e.batterySoC,stops:[[0,"#e53935"],[.45,"#fb8c00"],[.7,"#fdd835"],[1,"#43a047"]],width:2+Math.min(3,r),pulse:a,pulseDur:Math.max(.9,2.2-r*.35)})}

        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 100%, ${m}, transparent 72%)"></div>
        ${this.gaugePill("battery",`${Math.round(e.batterySoC)} %`,b,c`
          <div class="ss-pop-h"><span>Nabití baterie</span><b style="color:${b}">${Math.round(e.batterySoC)} %</b></div>
          <div class="gp-r"><span>Stav</span><b>${d} ${u}</b></div>
          ${g?c`<div class="gp-r"><span>Čas</span><b>${g.replace(" · ","")}</b></div>`:k}
          <div class="gp-r"><span>Dnes nabito</span><b>${at(e.batteryChargeTotal)}</b></div>
          <div class="gp-r"><span>Dnes vybito</span><b>${at(e.batteryDischargeTotal)}</b></div>
        `)}

        <div class="node-header node-header--split">
          <span class="node-label">🔋 Baterie</span>
          <span class="node-state ${p}">${d}</span>
        </div>

        <div class="node-value" @click=${W("batt_bat_c")}>
          ${Math.round(e.batterySoC)} %
        </div>
        <div class="node-subvalue" @click=${W("batt_batt_comp_p")}>
          ${u}${g}
        </div>

        ${e.isGridCharging?c`
          <span class="grid-charging-badge">⚡🔌 Síťové nabíjení</span>
        `:k}
        ${t.show?c`
          <span class="balancing-indicator ${t.cls}">
            <span>${t.icon}</span>
            <span>${t.text}</span>
          </span>
        `:k}

        <div class="battery-indicators">
          <button class="indicator" @click=${W("extended_battery_voltage")}>
            ⚡ ${e.batteryVoltage.toFixed(1)} V
          </button>
          <button class="indicator" @click=${W("extended_battery_current")}>
            〰️ ${e.batteryCurrent.toFixed(1)} A
          </button>
          <button class="indicator ${n}" @click=${W("extended_battery_temperature")}>
            ${i} ${e.batteryTemp.toFixed(1)} °C
          </button>
        </div>

        <!-- Energie + gc-plan vždy viditelné (ne v detail-section) -->
        <div class="battery-energy-section">
          <div class="detail-header">⚡ Energie dnes</div>
          <div class="energy-grid">
            <div class="detail-row">
              <span class="icon">⬆️</span>
              <button class="clickable" @click=${W("computed_batt_charge_energy_today")}>
                Nab: ${at(e.batteryChargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">⬇️</span>
              <button class="clickable" @click=${W("computed_batt_discharge_energy_today")}>
                Vyb: ${at(e.batteryDischargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">☀️</span>
              <button class="clickable" @click=${W("computed_batt_charge_fve_energy_today")}>
                FVE: ${at(e.batteryChargeSolar)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">🔌</span>
              <button class="clickable" @click=${W("computed_batt_charge_grid_energy_today")}>
                Síť: ${at(e.batteryChargeGrid)}
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
    `}getInverterModeDesc(){const e=this.data.inverterMode;return e.includes("Home 1")?"Max baterie + FVE":e.includes("Home 2")?"Šetří baterii":e.includes("Home 3")?"Priorita nabíjení":e.includes("UPS")?"Vše ze sítě":""}renderInverter(){const e=this.data,t=Nl(e.inverterMode),i=e.bypassStatus.toLowerCase()==="on"||e.bypassStatus==="1",n=e.inverterTemp>35?"🔥":"🌡️",r=Rl(e.inverterGridMode),a=Jc(this.pendingServices,this.changingServices),o=Xc(this.gridDeliveryState);let l="planner-unknown",d="Plánovač: N/A";e.plannerAutoMode===!0?(l="planner-auto",d="Plánovač: AUTO"):e.plannerAutoMode===!1&&(l="planner-off",d="Plánovač: VYPNUTO");const p=e.inverterMode,u=p.includes("UPS")?"#ff9800":p.includes("Home 2")?"#2196f3":p.includes("Home 3")?"#9c27b0":"#4caf50",h=e.inverterTemp>=45?"#e53935":e.inverterTemp>=35?"#ffa726":"#43a047",g=Math.max(0,Math.min(100,e.inverterTemp/55*100)),m=i?"#e53935":h;return c`
      <div class="${this.nodeClass("inverter",a.inverterModeChanging?"mode-changing":"")}" style="--node-gradient: ${Ci.inverter}; --node-border: ${yn.inverter};"
        @click=${b=>this.toggleExpand("inverter",b)}
        title="Teplota ${e.inverterTemp.toFixed(1)} °C · ${i?"Bypass aktivní":"Bypass vyp"}">
        ${this.edgeGauge({id:"gauge-inverter",nodeId:"inverter",pct:i?100:g,stops:[[0,m],[1,m]],width:i?4:2.5,pulse:i,pulseDur:1.1})}
        <div class="node-tint" style="background: radial-gradient(120% 90% at 50% 0, ${u}22, transparent 72%)"></div>

        ${this.gaugePill("inverter",i?"⚠ BYPASS":`${e.inverterTemp.toFixed(0)} °C`,m,c`
          <div class="ss-pop-h"><span>Teplota střídače</span><b style="color:${h}">${e.inverterTemp.toFixed(1)} °C</b></div>
          <div class="gp-r"><span>Bypass</span><b>${i?"🔴 AKTIVNÍ":"Vypnutý"}</b></div>
          <div class="gp-r"><span>Režim</span><b>${t.text}</b></div>
        `)}

        <div class="node-header" style="justify-content:center">
          <span class="node-label">⚙️ Střídač</span>
        </div>
        <div class="node-value" @click=${W("box_prms_mode")} style="color:${u}">
          ${a.inverterModeChanging?c`<span class="spinner spinner--small"></span>`:k}
          ${t.icon} ${t.text}
        </div>
        ${this.getInverterModeDesc()?c`<div class="node-subvalue">${this.getInverterModeDesc()}</div>`:k}
        ${a.inverterModeText?c`<div class="pending-text">${a.inverterModeText}</div>`:k}

        <div class="inv-chip ${l}">🤖 ${d}</div>

        <div class="inv-rows">
          <div class="inv-row">
            <span class="inv-lab">${n} Teplota</span>
            <button class="inv-pill" style="background:${h}26;color:${h}"
              @click=${W("box_temp")}>${e.inverterTemp.toFixed(1)} °C</button>
          </div>
          <div class="inv-row">
            <span class="inv-lab">🔁 Bypass</span>
            <button class="inv-pill ${i?"pill-red":"pill-green"}"
              @click=${W("bypass_status")}>${i?"ZAP":"Vyp"}</button>
          </div>
          <div class="inv-row">
            <span class="inv-lab">${r.icon} Dodávka</span>
            <button class="inv-val ${o.isUnavailable?"current-state-unknown":""}"
              @click=${W("invertor_prms_to_grid")}>${o.currentModeText}</button>
          </div>
          ${o.limitLabel!==null?c`
            <div class="inv-row">
              <span class="inv-lab">🌊 ${o.limitLabel}</span>
              <button class="inv-val ${o.showLimitAsActive?"limit-active":""}"
                @click=${W("invertor_prm1_p_max_feed_grid")}>${o.limitValue}</button>
            </div>
          `:k}
          <div class="inv-row">
            <span class="inv-lab">🛡️ Shield</span>
            <span class="inv-val">${this.shieldStatus==="running"?"Zpracovávám":"Nečinný"}${this.shieldQueueCount>0?` (${this.shieldQueueCount})`:""}</span>
          </div>
        </div>

        <button class="inv-note ${e.notificationsError>0?"warn":""}"
          @click=${W("notification_count_unread")}>
          🔔 ${e.notificationsError>0?`${e.notificationsError} chyb · ${e.notificationsUnread} nepřečtených`:e.notificationsUnread>0?`${e.notificationsUnread} nepřečtených`:"Bez notifikací"}
        </button>

        ${o.pendingModeText?c`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${o.pendingModeText}
          </div>
        `:k}
        ${o.pendingLimitText?c`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${o.pendingLimitText}
          </div>
        `:k}
      </div>
    `}renderGrid(){const e=this.data,t=e.gridPower>10,i=e.gridPower<-10,n=Math.abs(e.gridPower),r=n/1e3,a=t?"↓ Odběr ze sítě":i?"↑ Přetok do sítě":"◉ Žádný tok",o=25*230*3,l=e.inverterGridLimit>0?e.inverterGridLimit:5e3,d=t?n/o*100:i?n/l*100:0,p=t?e.spotPrice<=0?"#43a047":e.spotPrice<3?"#ffa726":"#ef5350":i?e.exportPrice>=3?"#43a047":e.exportPrice>=1.5?"#ffa726":"#ef5350":"rgba(255,255,255,0.35)",u=t?`${e.spotPrice.toFixed(2)} Kč`:i?`+${e.exportPrice.toFixed(2)} Kč`:"",h=(g,m)=>m>10?Math.round(Math.abs(g)/m):0;return c`
      <div class="${this.nodeClass("grid")}" style="--node-gradient: ${Ci.grid}; --node-border: ${yn.grid};"
        @click=${g=>this.toggleExpand("grid",g)}>
        ${this.edgeGauge({id:"gauge-grid",nodeId:"grid",pct:d,stops:[[0,p],[1,p]],width:2+Math.min(3,r),pulse:t||i,pulseDur:Math.max(.9,2.2-r*.35)})}
        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 50%, ${p}22, transparent 72%)"></div>

        <button class="indicator" style="position:absolute;top:4px;left:6px;font-size:9px;z-index:3" @click=${W("current_tariff")}>
          ${Bl(e.currentTariff)}
        </button>
        <button class="indicator" style="position:absolute;top:4px;right:6px;font-size:9px;z-index:3" @click=${W("ac_in_aci_f")}>
          ${e.gridFrequency.toFixed(1)} Hz
        </button>

        ${this.gaugePill("grid",t||i?`${Math.round(d)} %`:"0 %",p,c`
          <div class="ss-pop-h"><span>${t?"Vytížení jističe":i?"Vytížení limitu přetoku":"Síť v klidu"}</span><b style="color:${p}">${Math.round(d)} %</b></div>
          <div class="gp-r"><span>Tok</span><b>${a} · ${rt(n)}</b></div>
          <div class="gp-r"><span>Limit</span><b>${t?`${(o/1e3).toFixed(1)} kW (25 A/fáze)`:`${(l/1e3).toFixed(1)} kW přetok`}</b></div>
          <div class="gp-r"><span>Spot / Výkup</span><b>${e.spotPrice.toFixed(2)} / ${e.exportPrice.toFixed(2)} Kč</b></div>
        `)}

        <div class="node-header node-header--split" style="margin-top:16px">
          <span class="node-label">🔌 Síť</span>
          <span class="node-state" style="color:${p}">${u}</span>
        </div>
        <div class="node-value" @click=${W("actual_aci_wtotal")}>${rt(n)}</div>
        <div class="node-subvalue" style="color:${p};font-weight:600">${a}</div>

        <!-- Ceny — vždy viditelné jako rychlý přehled -->
        <div class="prices-row" style="margin-top:4px">
          <div class="price-cell">
            <span class="price-label">⬇ Spot</span>
            <button class="price-val price-spot" @click=${W("spot_price_current_15min")}>
              ${e.spotPrice.toFixed(2)} Kč
            </button>
          </div>
          <div class="energy-divider-v"></div>
          <div class="price-cell">
            <span class="price-label">⬆ Výkup</span>
            <button class="price-val price-export" @click=${W("export_price_current_15min")}>
              ${e.exportPrice.toFixed(2)} Kč
            </button>
          </div>
        </div>

        <!-- 3 fáze — vždy viditelné -->
        <div class="phases-grid" style="margin-top:6px">
          <div class="phase-cell">
            <span class="phase-label">L1</span>
            <button class="phase-val" @click=${W("actual_aci_wr")}>${h(e.gridL1P,e.gridL1V)} A</button>
            <button class="phase-val" style="font-size:10px;color:${G(s.textSecondary)}" @click=${W("actual_aci_wr")}>${Math.round(e.gridL1P)} W</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L2</span>
            <button class="phase-val" @click=${W("actual_aci_ws")}>${h(e.gridL2P,e.gridL2V)} A</button>
            <button class="phase-val" style="font-size:10px;color:${G(s.textSecondary)}" @click=${W("actual_aci_ws")}>${Math.round(e.gridL2P)} W</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L3</span>
            <button class="phase-val" @click=${W("actual_aci_wt")}>${h(e.gridL3P,e.gridL3V)} A</button>
            <button class="phase-val" style="font-size:10px;color:${G(s.textSecondary)}" @click=${W("actual_aci_wt")}>${Math.round(e.gridL3P)} W</button>
          </div>
        </div>

        <div class="detail-section">
          <!-- Energie dnes — odběr vlevo, dodávka vpravo -->
          <div class="energy-symmetric">
            <div class="energy-side">
              <span class="energy-side-label">⬇ Odběr</span>
              <button class="energy-side-val energy-import" @click=${W("ac_in_ac_ad")}>
                ${at(e.gridImportToday)}
              </button>
            </div>
            <div class="energy-divider-v"></div>
            <div class="energy-side">
              <span class="energy-side-label">⬆ Dodávka</span>
              <button class="energy-side-val energy-export" @click=${W("ac_in_ac_pd")}>
                ${at(e.gridExportToday)}
              </button>
            </div>
          </div>

        </div>
      </div>
    `}renderHouse(){const e=this.data,t=e.houseTodayWh/1e3,i=e.nonbackupTodayWh/1e3,n=t+i,r=e.housePower+e.nonbackupPower,a=t+e.zalohaPlannedRemainingKwh,o=Math.max(0,-e.batteryPower),l=Math.min(e.solarPower,r),d=Math.min(o,Math.max(0,r-l)),p=Math.max(0,r-l-d),u=r>5?(l+d)/r*100:e.solarPower>5?100:0,h=u>=66?"#43a047":u>=33?"#fdd835":"#e53935",g=v=>r>0?Math.round(v/r*100):0,m=`Soběstačnost ${Math.round(u)} % · FVE ${g(l)} % · Baterie ${g(d)} % · Síť ${g(p)} %`,b=3300,y=4e3,_=[{l:"L1",w:e.houseL1,e:"ac_out_aco_pr"},{l:"L2",w:e.houseL2,e:"ac_out_aco_ps"},{l:"L3",w:e.houseL3,e:"ac_out_aco_pt"}],$=_.find(v=>v.w>b);return c`
      <div class="${this.nodeClass("house")}" style="--node-gradient: ${Ci.house}; --node-border: ${yn.house};"
        @click=${v=>this.toggleExpand("house",v)} title=${m}>
        ${this.edgeGauge({id:"gauge-house",nodeId:"house",pct:u,stops:[[0,"#e53935"],[.5,"#fdd835"],[1,"#43a047"]],width:2+Math.min(3,r/1e3),pulse:r>50,pulseDur:Math.max(.9,2.2-r/1e3*.35)})}
        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 100%, ${h}22, transparent 72%)"></div>

        ${this.gaugePill("house",`🛡 ${Math.round(u)} %`,h,c`
          <div class="ss-pop-h"><span>Soběstačnost</span><b style="color:${h}">${Math.round(u)} %</b></div>
          <div class="ss-bar">
            <i style="width:${g(l)}%;background:#ffca5a"></i>
            <i style="width:${g(d)}%;background:#4caf50"></i>
            <i style="width:${g(p)}%;background:#ef5350"></i>
          </div>
          <div class="ss-leg">
            <span>☀️ FVE ${g(l)}%</span>
            <span>🔋 Bat ${g(d)}%</span>
            <span>🔌 Síť ${g(p)}%</span>
          </div>
        `)}

        <button class="indicator house-corner" style="position:absolute;top:4px;left:6px;z-index:3"
          @click=${W("actual_aco_p")} title="Záloha — výkon · dnes">
          <span class="hc-l">🔌 ${rt(e.housePower)}</span>
          <span class="hc-v">${t.toFixed(1)} kWh</span>
        </button>
        <button class="indicator house-corner" style="position:absolute;top:4px;right:6px;text-align:right;z-index:3"
          @click=${W("actual_acinb_wtotal")} title="Nezáloha — výkon · dnes">
          <span class="hc-l">🚗 ${rt(e.nonbackupPower)}</span>
          <span class="hc-v">${i.toFixed(1)} kWh</span>
        </button>

        <div class="node-header" style="margin-top:18px;justify-content:center">
          <span class="node-label">🏠 Spotřeba</span>
        </div>
        <div class="node-value" @click=${W("actual_aco_p")}>${rt(r)}</div>
        <div class="node-subvalue" @click=${W("ac_out_en_day")}>Dnes celkem: ${n.toFixed(1)} kWh</div>
        ${a>0?c`
          <div class="node-subvalue" @click=${W("battery_forecast")}
            title="Předpověď zálohové spotřeby (skutečné + plán)">
            🔮 Záloha plán: ${a.toFixed(1)} kWh
          </div>`:k}

        <!-- Phase balance (záloha) -->
        <div class="detail-section">
          <div class="phasebal-head">
            <span>⚖️ Vyvážení fází</span>
            ${$?c`<span class="pb-crit">⚠ KRIZOVÝ — ${$.l}</span>`:c`<span class="pb-ok">✓ Vyvážené</span>`}
          </div>
          ${_.map(v=>{const P=v.w>b;return c`
              <div class="pb-row">
                <span class="pb-lab">${v.l}</span>
                <div class="pb-track">
                  <div class="pb-fill ${P?"over":""}" style="width:${Math.min(100,v.w/y*100)}%"></div>
                  <div class="pb-mark" style="left:${b/y*100}%"></div>
                </div>
                <button class="pb-val ${P?"over":""}" @click=${W(v.e)}>${(v.w/1e3).toFixed(1)} kW</button>
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
    `}};Se.styles=M`
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
      color: ${G(s.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .node-value {
      font-size: 22px;
      font-weight: 700;
      color: ${G(s.textPrimary)};
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
      color: ${G(s.textSecondary)};
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
      color: ${G(s.textSecondary)};
      margin-top: 4px;
    }

    .pending-overlay {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: ${G(s.accent)};
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 4px;
      padding: 2px 6px;
      margin-top: 4px;
    }

    .current-state-unknown {
      color: ${G(s.textSecondary)};
      font-style: italic;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid ${G(s.divider)};
      border-top-color: ${G(s.accent)};
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
      border-top: 1px solid ${G(s.divider)};
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
      border-top: 1px dashed ${G(s.divider)};
    }

    .detail-header {
      font-size: 10px;
      font-weight: 600;
      color: ${G(s.textSecondary)};
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: ${G(s.textSecondary)};
      margin-bottom: 2px;
    }

    .detail-row .icon { width: 14px; text-align: center; flex-shrink: 0; }

    .clickable {
      cursor: pointer;
      color: ${G(s.textPrimary)};
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
      color: ${G(s.textSecondary)};
      margin: 4px 0;
      align-items: center;
      justify-content: center;
    }

    .phase-sep { color: ${G(s.divider)}; }

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
      background: ${G(s.bgSecondary)};
      border: none;
      font-family: inherit;
      color: ${G(s.textSecondary)};
    }

    .indicator:hover { background: ${G(s.divider)}; }

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
      border-top: 1px solid ${G(s.divider)};
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
      border: 1px solid ${G(s.divider)};
      background: transparent;
      color: ${G(s.textSecondary)};
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .gc-plan-btn:hover {
      background: rgba(255,255,255,0.06);
      color: ${G(s.textPrimary)};
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
      border-top: 1px dashed ${G(s.divider)};
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
      color: ${G(s.textSecondary)};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .phase-val {
      font-size: 11px;
      font-weight: 600;
      color: ${G(s.textPrimary)};
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    .phase-val:hover { text-decoration: underline; }
    .phase-divider {
      border: none;
      border-top: 1px solid ${G(s.divider)};
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
      color: ${G(s.textSecondary)};
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
      color: ${G(s.textPrimary)};
    }
    .energy-side-val:hover { text-decoration: underline; }
    .energy-import { color: #ef5350; }
    .energy-export { color: #66bb6a; }
    .energy-divider-v {
      width: 1px;
      height: 28px;
      background: ${G(s.divider)};
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
      color: ${G(s.textSecondary)};
      text-transform: uppercase;
    }
    .price-val {
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: ${G(s.textPrimary)};
    }
    .price-val:hover { text-decoration: underline; }
    .price-spot { color: #ef5350; }
    .price-export { color: #66bb6a; }

    @media (min-width: 1025px) {
      .detail-section {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid ${G(s.divider)};
      }
      .boiler-section,
      .grid-charging-plan {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed ${G(s.divider)};
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
  `;Le([f({type:Object})],Se.prototype,"data",2);Le([f({type:Boolean})],Se.prototype,"editMode",2);Le([T()],Se.prototype,"pendingServices",2);Le([T()],Se.prototype,"changingServices",2);Le([T()],Se.prototype,"shieldStatus",2);Le([T()],Se.prototype,"shieldQueueCount",2);Le([T()],Se.prototype,"gridDeliveryState",2);Le([T()],Se.prototype,"expandedNodes",2);Le([T()],Se.prototype,"gaugeDetailOpen",2);Le([T()],Se.prototype,"customPositions",2);Le([T()],Se.prototype,"nodeDims",2);Se=Le([E("oig-flow-node")],Se);var bd=Object.defineProperty,yd=Object.getOwnPropertyDescriptor,Rt=(e,t,i,n)=>{for(var r=n>1?void 0:n?yd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&bd(t,i,r),r};function vd(e,t){return{fromColor:ya[e]||"#9e9e9e",toColor:ya[t]||"#9e9e9e"}}const xd=Z;let Xe=class extends z{constructor(){super(...arguments),this.data=Kr,this.particlesEnabled=!0,this.active=!0,this.editMode=!1,this.lines=[],this.animationId=null,this.lastSpawnTime={},this.particleCount=0,this.MAX_PARTICLES=50,this.onVisibilityChange=()=>{this.updateAnimationState()},this.onLayoutChanged=()=>{this.drawConnectionsDeferred()}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this.onVisibilityChange),this.addEventListener("layout-changed",this.onLayoutChanged)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this.onVisibilityChange),this.removeEventListener("layout-changed",this.onLayoutChanged),this.stopAnimation()}updated(e){e.has("data")&&(this.updateLines(),this.animationId!==null&&this.spawnParticles()),(e.has("active")||e.has("particlesEnabled"))&&this.updateAnimationState(),this.drawConnectionsDeferred()}firstUpdated(){this.updateLines(),this.updateAnimationState(),new ResizeObserver(()=>this.drawConnectionsDeferred()).observe(this)}drawConnectionsDeferred(){requestAnimationFrame(()=>this.drawConnectionsSVG())}getParticlesLayer(){var e;return(e=this.renderRoot)==null?void 0:e.querySelector(".particles-layer")}getGridMetrics(){var a,o;const e=(a=this.renderRoot)==null?void 0:a.querySelector("oig-flow-node");if(!e)return null;const i=(e.renderRoot||e.shadowRoot||e).querySelector(".flow-grid");if(!i)return null;const n=(o=this.renderRoot)==null?void 0:o.querySelector(".canvas-container");if(!n)return null;const r=i.getBoundingClientRect();return r.width===0||r.height===0?null:{grid:i,gridRect:r,canvasRect:n.getBoundingClientRect()}}positionOverlayLayer(e,t,i){const n=t.left-i.left,r=t.top-i.top;e.style.left=`${n}px`,e.style.top=`${r}px`,e.style.width=`${t.width}px`,e.style.height=`${t.height}px`}updateLines(){const e=this.data,t=[],i=e.solarPower>50;t.push({id:"solar-inverter",from:"solar",to:"inverter",color:Kt.solar,power:i?e.solarPower:0,params:i?xn(e.solarPower,vn.solar,"solar"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:i});const n=Math.abs(e.batteryPower)>50,r=e.batteryPower>0;t.push({id:"battery-inverter",from:n&&r?"inverter":"battery",to:n&&r?"battery":"inverter",color:Kt.battery,power:n?Math.abs(e.batteryPower):0,params:n?xn(e.batteryPower,vn.battery,"battery"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:n});const a=Math.abs(e.gridPower)>50,o=e.gridPower>0;t.push({id:"grid-inverter",from:a?o?"grid":"inverter":"grid",to:a?o?"inverter":"grid":"inverter",color:a?o?Kt.grid_import:Kt.grid_export:Kt.grid_import,power:a?Math.abs(e.gridPower):0,params:a?xn(e.gridPower,vn.grid,"grid"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:a});const l=e.housePower>50;t.push({id:"inverter-house",from:"inverter",to:"house",color:Kt.house,power:l?e.housePower:0,params:l?xn(e.housePower,vn.house,"house"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:l}),this.lines=t}calcEdgePoint(e,t,i,n){const r=t.x-e.x,a=t.y-e.y;if(r===0&&a===0)return{...e};const o=Math.abs(r),l=Math.abs(a),d=o*n>l*i?i/o:n/l;return{x:e.x+r*d,y:e.y+a*d}}getNodeInfo(e,t,i){const n=e.querySelector(`.node-${i}`);if(!n)return null;const r=n.getBoundingClientRect();return{x:r.left+r.width/2-t.left,y:r.top+r.height/2-t.top,hw:r.width/2,hh:r.height/2}}drawConnectionsSVG(){const e=this.svgEl;if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:n,canvasRect:r}=t;this.positionOverlayLayer(e,n,r),e.setAttribute("viewBox",`0 0 ${n.width} ${n.height}`);const a=this.getParticlesLayer();a&&this.positionOverlayLayer(a,n,r),e.innerHTML="";const o="http://www.w3.org/2000/svg",l=document.createElementNS(o,"defs"),d=document.createElementNS(o,"filter");d.setAttribute("id","neon-glow"),d.setAttribute("x","-50%"),d.setAttribute("y","-50%"),d.setAttribute("width","200%"),d.setAttribute("height","200%");const p=document.createElementNS(o,"feGaussianBlur");p.setAttribute("in","SourceGraphic"),p.setAttribute("stdDeviation","3"),p.setAttribute("result","blur"),d.appendChild(p);const u=document.createElementNS(o,"feMerge"),h=document.createElementNS(o,"feMergeNode");h.setAttribute("in","blur"),u.appendChild(h);const g=document.createElementNS(o,"feMergeNode");g.setAttribute("in","SourceGraphic"),u.appendChild(g),d.appendChild(u),l.appendChild(d),e.appendChild(l);for(const m of this.lines){const b=this.getNodeInfo(i,n,m.from),y=this.getNodeInfo(i,n,m.to);if(!b||!y)continue;const _={x:b.x,y:b.y},$={x:y.x,y:y.y},v=this.calcEdgePoint(_,$,b.hw,b.hh),P=this.calcEdgePoint($,_,y.hw,y.hh),j=P.x-v.x,B=P.y-v.y,K=Math.sqrt(j*j+B*B),S=Math.min(K*.2,40),L=-B/K,A=j/K,U=(v.x+P.x)/2,Y=(v.y+P.y)/2,N=U+L*S,q=Y+A*S,Te=`grad-${m.id}`,{fromColor:it,toColor:nt}=vd(m.from,m.to),xe=document.createElementNS(o,"linearGradient");xe.setAttribute("id",Te),xe.setAttribute("x1","0%"),xe.setAttribute("y1","0%"),xe.setAttribute("x2","100%"),xe.setAttribute("y2","0%");const x=document.createElementNS(o,"stop");x.setAttribute("offset","0%"),x.setAttribute("stop-color",it);const ee=document.createElementNS(o,"stop");ee.setAttribute("offset","100%"),ee.setAttribute("stop-color",nt),xe.appendChild(x),xe.appendChild(ee),l.appendChild(xe);const de=document.createElementNS(o,"path");if(de.setAttribute("d",`M ${v.x} ${v.y} Q ${N} ${q} ${P.x} ${P.y}`),de.setAttribute("stroke",`url(#${Te})`),de.setAttribute("stroke-width","3"),de.setAttribute("stroke-linecap","round"),de.setAttribute("fill","none"),de.setAttribute("opacity",m.active?"0.8":"0.18"),m.active&&de.setAttribute("filter","url(#neon-glow)"),de.classList.add("flow-line"),m.active||de.classList.add("flow-line--inactive"),e.appendChild(de),m.params.active){const Ne=document.createElementNS(o,"polygon");Ne.setAttribute("points",`0,-6 ${6*1.2},0 0,6`),Ne.setAttribute("fill",m.color),Ne.setAttribute("opacity","0.9");const We=document.createElementNS(o,"animateMotion");We.setAttribute("dur",`${Math.max(1,m.params.speed/1e3)}s`),We.setAttribute("repeatCount","indefinite"),We.setAttribute("path",`M ${v.x} ${v.y} Q ${N} ${q} ${P.x} ${P.y}`),We.setAttribute("rotate","auto"),Ne.appendChild(We),e.appendChild(Ne)}}}updateAnimationState(){this.particlesEnabled&&this.active&&!document.hidden&&!Ee.reduceMotion?(this.spawnParticles(),this.startAnimation()):this.stopAnimation()}startAnimation(){if(this.animationId!==null)return;const e=()=>{this.spawnParticles(),this.animationId=requestAnimationFrame(e)};this.animationId=requestAnimationFrame(e)}stopAnimation(){this.animationId!==null&&(cancelAnimationFrame(this.animationId),this.animationId=null)}spawnParticles(){if(this.particleCount>=this.MAX_PARTICLES)return;const e=this.getParticlesLayer();if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:n,canvasRect:r}=t;this.positionOverlayLayer(e,n,r);const a=performance.now();for(const o of this.lines){if(!o.params.active)continue;const l=o.params.speed,d=this.lastSpawnTime[o.id]||0;if(a-d<l)continue;const p=this.getNodeInfo(i,n,o.from),u=this.getNodeInfo(i,n,o.to);if(!p||!u)continue;const h={x:p.x,y:p.y},g={x:u.x,y:u.y},m=this.calcEdgePoint(h,g,p.hw,p.hh),b=this.calcEdgePoint(g,h,u.hw,u.hh);this.lastSpawnTime[o.id]=a;const y=o.params.count;for(let _=0;_<y&&!(this.particleCount>=this.MAX_PARTICLES);_++)this.createParticle(e,m,b,o.color,o.params,_*(o.params.speed/y/2))}}createParticle(e,t,i,n,r,a){const o=document.createElement("div");o.className="particle";const l=r.size;o.style.width=`${l}px`,o.style.height=`${l}px`,o.style.background=n,o.style.left=`${t.x}px`,o.style.top=`${t.y}px`,o.style.boxShadow=`0 0 ${l}px ${n}`,o.style.opacity="0",e.appendChild(o),this.particleCount++;const d=r.speed;setTimeout(()=>{let p=!1;const u=()=>{p||(p=!0,o.isConnected&&o.remove(),this.particleCount=Math.max(0,this.particleCount-1))};if(typeof o.animate=="function"){const h=o.animate([{left:`${t.x}px`,top:`${t.y}px`,opacity:0,offset:0},{opacity:r.opacity,offset:.1},{opacity:r.opacity,offset:.9},{left:`${i.x}px`,top:`${i.y}px`,opacity:0,offset:1}],{duration:d,easing:"linear"});h.onfinish=u,h.oncancel=u}else o.style.transition=`left ${d}ms linear, top ${d}ms linear, opacity ${d}ms linear`,o.style.opacity=`${r.opacity}`,requestAnimationFrame(()=>{o.style.left=`${i.x}px`,o.style.top=`${i.y}px`,o.style.opacity="0"}),o.addEventListener("transitionend",u,{once:!0}),window.setTimeout(u,d+50)},a)}render(){return c`
      <div class="canvas-container">
        <div class="flow-grid-wrapper">
          <oig-flow-node .data=${this.data} .editMode=${this.editMode}></oig-flow-node>
        </div>

        <svg class="connections-layer"></svg>

        <div class="particles-layer"></div>
      </div>
    `}resetLayout(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-flow-node");e!=null&&e.resetLayout&&e.resetLayout()}};Xe.styles=M`
    :host {
      display: block;
      position: relative;
      width: 100%;
      background: ${xd(s.bgSecondary)};
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
  `;Rt([f({type:Object})],Xe.prototype,"data",2);Rt([f({type:Boolean})],Xe.prototype,"particlesEnabled",2);Rt([f({type:Boolean})],Xe.prototype,"active",2);Rt([f({type:Boolean})],Xe.prototype,"editMode",2);Rt([T()],Xe.prototype,"lines",2);Rt([Gn(".connections-layer")],Xe.prototype,"svgEl",2);Xe=Rt([E("oig-flow-canvas")],Xe);var wd=Object.defineProperty,$d=Object.getOwnPropertyDescriptor,Qr=(e,t,i,n)=>{for(var r=n>1?void 0:n?$d(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&wd(t,i,r),r};const Fe=Z;let Wi=class extends z{constructor(){super(...arguments),this.data=null,this.open=!1,this.onKeyDown=e=>{e.key==="Escape"&&this.hide()}}show(){this.open=!0}hide(){this.open=!1}onOverlayClick(e){e.target===e.currentTarget&&this.hide()}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onKeyDown),this.addEventListener("oig-grid-charging-open",()=>this.show())}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onKeyDown)}formatTime(e){const t=e.time_from??"--:--",i=e.time_to??"--:--";return`${t} – ${i}`}isBlockActive(e){if(!e.time_from||!e.time_to)return!1;const t=new Date,i=t.toISOString().slice(0,10);if(e.day==="tomorrow")return!1;const n=`${i}T${e.time_from}`,r=`${i}T${e.time_to}`,a=new Date(n),o=new Date(r);return t>=a&&t<o}renderEmpty(){return c`
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
          `:k}
          ${e.totalCostCzk>0?c`
            <span class="summary-chip cost">💰 ~${e.totalCostCzk.toFixed(0)} Kč</span>
          `:k}
          ${e.windowLabel?c`
            <span class="summary-chip time">🪟 ${e.windowLabel}</span>
          `:k}
          ${e.durationMinutes>0?c`
            <span class="summary-chip time">⏱️ ${Math.round(e.durationMinutes)} min</span>
          `:k}
        </div>

        <!-- Active block banner -->
        ${t?c`
          <div class="active-block-banner">
            <div class="pulse-dot"></div>
            <span>Probíhá: ${this.formatTime(t)}
              ${t.grid_charge_kwh!=null?` · ${t.grid_charge_kwh.toFixed(1)} kWh`:k}
            </span>
          </div>
        `:k}

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
                    `:k}
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
              `:k}
            </div>
            <button class="close-btn" @click=${()=>this.hide()} aria-label="Zavřít">✕</button>
          </div>
          <div class="dialog-body">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `:k}};Wi.styles=M`
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
      background: ${Fe(s.cardBg)};
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
      border-bottom: 1px solid ${Fe(s.divider)};
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
      color: ${Fe(s.textPrimary)};
    }

    .dialog-header-subtitle {
      font-size: 11px;
      color: ${Fe(s.textSecondary)};
      margin-top: 2px;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: ${Fe(s.textSecondary)};
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
      color: ${Fe(s.textPrimary)};
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
      color: ${Fe(s.textSecondary)};
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
      color: ${Fe(s.textSecondary)};
      padding: 0 6px 8px;
      border-bottom: 1px solid ${Fe(s.divider)};
    }

    .blocks-table th:last-child,
    .blocks-table td:last-child {
      text-align: right;
    }

    .blocks-table td {
      padding: 8px 6px;
      font-size: 12px;
      color: ${Fe(s.textPrimary)};
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
      color: ${Fe(s.textSecondary)};
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
  `;Qr([f({type:Object})],Wi.prototype,"data",2);Qr([T()],Wi.prototype,"open",2);Wi=Qr([E("oig-grid-charging-dialog")],Wi);var _d=Object.defineProperty,kd=Object.getOwnPropertyDescriptor,me=(e,t,i,n)=>{for(var r=n>1?void 0:n?kd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&_d(t,i,r),r};const se=Z;Un.register(uo,ho,go,fo,mo,bo,yo);let pt=class extends z{constructor(){super(...arguments),this.values=[],this.color="rgba(76, 175, 80, 1)",this.startTime="",this.endTime="",this.chart=null,this.lastDataKey="",this.initializing=!1}render(){return c`<canvas></canvas>`}firstUpdated(){this.values.length>0&&(this.initializing=!0,requestAnimationFrame(()=>{this.createSparkline(),this.initializing=!1}))}updated(e){this.initializing||(e.has("values")||e.has("color"))&&this.updateOrCreateSparkline()}disconnectedCallback(){super.disconnectedCallback(),this.destroyChart()}updateOrCreateSparkline(){var t,i,n,r;if(!this.canvas||this.values.length===0)return;const e=JSON.stringify({v:this.values,c:this.color});if(!(e===this.lastDataKey&&this.chart)){if(this.lastDataKey=e,(n=(i=(t=this.chart)==null?void 0:t.data)==null?void 0:i.datasets)!=null&&n[0]){const a=this.chart.data.datasets[0];if(!((((r=this.chart.data.labels)==null?void 0:r.length)||0)!==this.values.length)){a.data=this.values,a.borderColor=this.color,a.backgroundColor=this.color.replace("1)","0.2)"),this.chart.update("none");return}}this.destroyChart(),this.createSparkline()}}createSparkline(){if(!this.canvas||this.values.length===0)return;this.destroyChart();const e=this.color,t=this.values,i=new Date(this.startTime),n=t.map((r,a)=>new Date(i.getTime()+a*15*60*1e3).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}));this.chart=new Un(this.canvas,{type:"line",data:{labels:n,datasets:[{data:t,borderColor:e,backgroundColor:e.replace("1)","0.2)"),borderWidth:2,fill:!0,tension:.3,pointRadius:0,pointHoverRadius:5}]},plugins:[],options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:0},plugins:{legend:{display:!1},tooltip:{enabled:!0,backgroundColor:"rgba(0, 0, 0, 0.8)",titleColor:"#fff",bodyColor:"#fff",padding:8,displayColors:!1,callbacks:{title:r=>{var a;return((a=r[0])==null?void 0:a.label)||""},label:r=>`${r.parsed.y.toFixed(2)} Kč/kWh`}},datalabels:{display:!1},zoom:{pan:{enabled:!0,mode:"x",modifierKey:"shift"},zoom:{wheel:{enabled:!0,speed:.1},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)"},mode:"x"}}},scales:{x:{display:!1},y:{display:!0,position:"right",grace:"10%",ticks:{color:"rgba(255, 255, 255, 0.6)",font:{size:8},callback:r=>Number(r).toFixed(1),maxTicksLimit:3},grid:{display:!1}}},layout:{padding:0},interaction:{mode:"nearest",intersect:!1}}})}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}};pt.styles=M`
    :host {
      display: block;
      width: 100%;
      height: 30px;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `;me([f({type:Array})],pt.prototype,"values",2);me([f({type:String})],pt.prototype,"color",2);me([f({type:String})],pt.prototype,"startTime",2);me([f({type:String})],pt.prototype,"endTime",2);me([Gn("canvas")],pt.prototype,"canvas",2);pt=me([E("oig-mini-sparkline")],pt);let Ce=class extends z{constructor(){super(...arguments),this.title="",this.time="",this.valueText="",this.value=0,this.unit="Kč/kWh",this.variant="default",this.clickable=!1,this.startTime="",this.endTime="",this.sparklineValues=[],this.sparklineColor="rgba(76, 175, 80, 1)",this.handleClick=()=>{this.clickable&&this.dispatchEvent(new CustomEvent("card-click",{detail:{startTime:this.startTime,endTime:this.endTime,value:this.value},bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),this.clickable&&this.addEventListener("click",this.handleClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleClick)}render(){const e=this.valueText||`${this.value.toFixed(2)} <span class="stat-unit">${this.unit}</span>`;return c`
      <div class="card-title">${this.title}</div>
      <div class="card-value ${this.variant}" .innerHTML=${e}></div>
      ${this.time?c`<div class="card-time">${this.time}</div>`:k}
      ${this.sparklineValues.length>0?c`
            <div class="sparkline-container">
              <oig-mini-sparkline
                .values=${this.sparklineValues}
                .color=${this.sparklineColor}
                .startTime=${this.startTime}
                .endTime=${this.endTime}
              ></oig-mini-sparkline>
            </div>
          `:k}
    `}};Ce.styles=M`
    :host {
      display: block;
      background: ${se(s.cardBg)};
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: ${se(s.cardShadow)};
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
      color: ${se(s.textSecondary)};
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 700;
      color: ${se(s.textPrimary)};
      line-height: 1.2;
    }

    .card-value .stat-unit {
      font-size: 12px;
      font-weight: 400;
      color: ${se(s.textSecondary)};
    }

    .card-value.success { color: #4CAF50; }
    .card-value.warning { color: #FFA726; }
    .card-value.danger { color: #F44336; }
    .card-value.info { color: #29B6F6; }

    .card-time {
      font-size: 10px;
      color: ${se(s.textSecondary)};
      margin-top: 4px;
    }

    .sparkline-container {
      margin-top: 8px;
    }
  `;me([f({type:String})],Ce.prototype,"title",2);me([f({type:String})],Ce.prototype,"time",2);me([f({type:String})],Ce.prototype,"valueText",2);me([f({type:Number})],Ce.prototype,"value",2);me([f({type:String})],Ce.prototype,"unit",2);me([f({type:String})],Ce.prototype,"variant",2);me([f({type:Boolean})],Ce.prototype,"clickable",2);me([f({type:String})],Ce.prototype,"startTime",2);me([f({type:String})],Ce.prototype,"endTime",2);me([f({type:Array})],Ce.prototype,"sparklineValues",2);me([f({type:String})],Ce.prototype,"sparklineColor",2);Ce=me([E("oig-stats-card")],Ce);function Sd(e){const t=new Date(e.start),i=new Date(e.end),n=t.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit"}),r=t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}),a=i.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"});return`${n} ${r} - ${a}`}let Ki=class extends z{constructor(){super(...arguments),this.data=null,this.topOnly=!1}onCardClick(e){this.dispatchEvent(new CustomEvent("zoom-to-block",{detail:e.detail,bubbles:!0,composed:!0}))}renderPriceTiles(){if(!this.data)return k;const e=this.data.solarForecastTotal,t=this.data.solarForecastTomorrow,i=this.data.solarForecastStale,n=e>0||t>0,r=this.data.whatIf,a=(r==null?void 0:r.totalSavings)??null,o=(r==null?void 0:r.totalCost)??null,l=a==null?"":a>=.005?"pos":a<=-.005?"neg":"";return c`
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
          ${o!=null?`Náklady ${o.toFixed(0)} Kč`:k}
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
        .time=${Sd(t)}
        variant=${i}
        clickable
        .startTime=${t.start}
        .endTime=${t.end}
        .sparklineValues=${t.values}
        .sparklineColor=${n}
        @card-click=${this.onCardClick}
      ></oig-stats-card>
    `:k}renderExtremeBlocks(){if(!this.data)return k;const{cheapestBuyBlock:e,expensiveBuyBlock:t,bestExportBlock:i,worstExportBlock:n}=this.data;return c`
      ${this.renderBlockCard("Nejlevnější nákup",e,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejdražší nákup",t,"danger","rgba(244, 67, 54, 1)")}
      ${this.renderBlockCard("Nejlepší výkup",i,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejhorší výkup",n,"warning","rgba(255, 167, 38, 1)")}
    `}renderPlannedConsumption(){var o;const e=(o=this.data)==null?void 0:o.plannedConsumption;if(!e)return k;const t=e.todayTotalKwh,i=e.tomorrowKwh,n=t+(i||0),r=n>0?t/n*100:50,a=n>0?(i||0)/n*100:50;return c`
      <div class="planned-section">
        <div class="section-label" style="margin-bottom: 8px;">Plánovaná spotřeba (dnes + zítra)</div>
        <div class="planned-header">
          <div>
            <div class="planned-main-value">
              ${n>0?c`${n.toFixed(1)} <span class="unit">kWh</span>`:"--"}
            </div>
            <div class="planned-profile">${e.profile}</div>
          </div>
          ${e.trendText?c`<div class="planned-trend">${e.trendText}</div>`:k}
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
            `:k}
      </div>
    `}render(){return!this.data||this.data.timeline.length===0?this.topOnly?k:c`<div style="color: ${s.textSecondary}; padding: 16px;">Načítání cenových dat...</div>`:this.topOnly?c`
        <div class="top-row">
          ${this.renderPriceTiles()}
          ${this.renderExtremeBlocks()}
        </div>
      `:c`${this.renderPlannedConsumption()}`}};Ki.styles=M`
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
      background: ${se(s.cardBg)};
      border-radius: 10px;
      padding: 10px 12px;
      box-shadow: ${se(s.cardShadow)};
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 76px;
    }

    .price-tile.spot {
      background: linear-gradient(135deg, ${se(s.accent)}22 0%, ${se(s.accent)}11 100%);
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
      color: ${se(s.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .price-tile-value {
      font-size: 16px;
      font-weight: 700;
      color: ${se(s.textPrimary)};
      line-height: 1.2;
    }

    .price-tile-unit {
      font-size: 10px;
      font-weight: 400;
      color: ${se(s.textSecondary)};
      opacity: 0.7;
    }

    .price-tile-sub {
      font-size: 9px;
      color: ${se(s.textSecondary)};
      opacity: 0.55;
      margin-top: 3px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: ${se(s.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    /* Planned consumption */
    .planned-section {
      background: ${se(s.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: ${se(s.cardShadow)};
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
      color: ${se(s.textPrimary)};
    }

    .planned-main-value .unit {
      font-size: 12px;
      font-weight: 400;
      color: ${se(s.textSecondary)};
    }

    .planned-trend {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
    }

    .planned-profile {
      font-size: 11px;
      color: ${se(s.textSecondary)};
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
      color: ${se(s.textSecondary)};
      text-transform: uppercase;
    }

    .planned-detail-value {
      font-size: 14px;
      font-weight: 600;
      color: ${se(s.textPrimary)};
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
      color: ${se(s.textSecondary)};
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
  `;me([f({type:Object})],Ki.prototype,"data",2);me([f({type:Boolean})],Ki.prototype,"topOnly",2);Ki=me([E("oig-pricing-stats")],Ki);const jo=6048e5,Cd=864e5,dn=6e4,pn=36e5,Pd=1e3,ja=Symbol.for("constructDateFrom");function ue(e,t){return typeof e=="function"?e(t):e&&typeof e=="object"&&ja in e?e[ja](t):e instanceof Date?new e.constructor(t):new Date(t)}function V(e,t){return ue(t||e,e)}function Jn(e,t,i){const n=V(e,i==null?void 0:i.in);return isNaN(t)?ue((i==null?void 0:i.in)||e,NaN):(t&&n.setDate(n.getDate()+t),n)}function Xr(e,t,i){const n=V(e,i==null?void 0:i.in);if(isNaN(t))return ue(e,NaN);if(!t)return n;const r=n.getDate(),a=ue(e,n.getTime());a.setMonth(n.getMonth()+t+1,0);const o=a.getDate();return r>=o?a:(n.setFullYear(a.getFullYear(),a.getMonth(),r),n)}function Jr(e,t,i){return ue(e,+V(e)+t)}function Td(e,t,i){return Jr(e,t*pn)}let Md={};function jt(){return Md}function Ve(e,t){var l,d,p,u;const i=jt(),n=(t==null?void 0:t.weekStartsOn)??((d=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:d.weekStartsOn)??i.weekStartsOn??((u=(p=i.locale)==null?void 0:p.options)==null?void 0:u.weekStartsOn)??0,r=V(e,t==null?void 0:t.in),a=r.getDay(),o=(a<n?7:0)+a-n;return r.setDate(r.getDate()-o),r.setHours(0,0,0,0),r}function li(e,t){return Ve(e,{...t,weekStartsOn:1})}function Ho(e,t){const i=V(e,t==null?void 0:t.in),n=i.getFullYear(),r=ue(i,0);r.setFullYear(n+1,0,4),r.setHours(0,0,0,0);const a=li(r),o=ue(i,0);o.setFullYear(n,0,4),o.setHours(0,0,0,0);const l=li(o);return i.getTime()>=a.getTime()?n+1:i.getTime()>=l.getTime()?n:n-1}function En(e){const t=V(e),i=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()));return i.setUTCFullYear(t.getFullYear()),+e-+i}function Ht(e,...t){const i=ue.bind(null,t.find(n=>typeof n=="object"));return t.map(i)}function Nr(e,t){const i=V(e,t==null?void 0:t.in);return i.setHours(0,0,0,0),i}function Vo(e,t,i){const[n,r]=Ht(i==null?void 0:i.in,e,t),a=Nr(n),o=Nr(r),l=+a-En(a),d=+o-En(o);return Math.round((l-d)/Cd)}function Dd(e,t){const i=Ho(e,t),n=ue(e,0);return n.setFullYear(i,0,4),n.setHours(0,0,0,0),li(n)}function zd(e,t,i){const n=V(e,i==null?void 0:i.in);return n.setTime(n.getTime()+t*dn),n}function Ed(e,t,i){return Xr(e,t*3,i)}function Od(e,t,i){return Jr(e,t*1e3)}function Ld(e,t,i){return Jn(e,t*7,i)}function Ad(e,t,i){return Xr(e,t*12,i)}function Ni(e,t){const i=+V(e)-+V(t);return i<0?-1:i>0?1:i}function Fd(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function Wo(e){return!(!Fd(e)&&typeof e!="number"||isNaN(+V(e)))}function Id(e,t,i){const[n,r]=Ht(i==null?void 0:i.in,e,t),a=n.getFullYear()-r.getFullYear(),o=n.getMonth()-r.getMonth();return a*12+o}function Bd(e,t,i){const[n,r]=Ht(i==null?void 0:i.in,e,t);return n.getFullYear()-r.getFullYear()}function Ko(e,t,i){const[n,r]=Ht(i==null?void 0:i.in,e,t),a=Ha(n,r),o=Math.abs(Vo(n,r));n.setDate(n.getDate()-a*o);const l=+(Ha(n,r)===-a),d=a*(o-l);return d===0?0:d}function Ha(e,t){const i=e.getFullYear()-t.getFullYear()||e.getMonth()-t.getMonth()||e.getDate()-t.getDate()||e.getHours()-t.getHours()||e.getMinutes()-t.getMinutes()||e.getSeconds()-t.getSeconds()||e.getMilliseconds()-t.getMilliseconds();return i<0?-1:i>0?1:i}function un(e){return t=>{const n=(e?Math[e]:Math.trunc)(t);return n===0?0:n}}function Nd(e,t,i){const[n,r]=Ht(i==null?void 0:i.in,e,t),a=(+n-+r)/pn;return un(i==null?void 0:i.roundingMethod)(a)}function ea(e,t){return+V(e)-+V(t)}function Rd(e,t,i){const n=ea(e,t)/dn;return un(i==null?void 0:i.roundingMethod)(n)}function qo(e,t){const i=V(e,t==null?void 0:t.in);return i.setHours(23,59,59,999),i}function Yo(e,t){const i=V(e,t==null?void 0:t.in),n=i.getMonth();return i.setFullYear(i.getFullYear(),n+1,0),i.setHours(23,59,59,999),i}function jd(e,t){const i=V(e,t==null?void 0:t.in);return+qo(i,t)==+Yo(i,t)}function Uo(e,t,i){const[n,r,a]=Ht(i==null?void 0:i.in,e,e,t),o=Ni(r,a),l=Math.abs(Id(r,a));if(l<1)return 0;r.getMonth()===1&&r.getDate()>27&&r.setDate(30),r.setMonth(r.getMonth()-o*l);let d=Ni(r,a)===-o;jd(n)&&l===1&&Ni(n,a)===1&&(d=!1);const p=o*(l-+d);return p===0?0:p}function Hd(e,t,i){const n=Uo(e,t,i)/3;return un(i==null?void 0:i.roundingMethod)(n)}function Vd(e,t,i){const n=ea(e,t)/1e3;return un(i==null?void 0:i.roundingMethod)(n)}function Wd(e,t,i){const n=Ko(e,t,i)/7;return un(i==null?void 0:i.roundingMethod)(n)}function Kd(e,t,i){const[n,r]=Ht(i==null?void 0:i.in,e,t),a=Ni(n,r),o=Math.abs(Bd(n,r));n.setFullYear(1584),r.setFullYear(1584);const l=Ni(n,r)===-a,d=a*(o-+l);return d===0?0:d}function qd(e,t){const i=V(e,t==null?void 0:t.in),n=i.getMonth(),r=n-n%3;return i.setMonth(r,1),i.setHours(0,0,0,0),i}function Yd(e,t){const i=V(e,t==null?void 0:t.in);return i.setDate(1),i.setHours(0,0,0,0),i}function Ud(e,t){const i=V(e,t==null?void 0:t.in),n=i.getFullYear();return i.setFullYear(n+1,0,0),i.setHours(23,59,59,999),i}function Go(e,t){const i=V(e,t==null?void 0:t.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}function Gd(e,t){const i=V(e,t==null?void 0:t.in);return i.setMinutes(59,59,999),i}function Zd(e,t){var l,d;const i=jt(),n=i.weekStartsOn??((d=(l=i.locale)==null?void 0:l.options)==null?void 0:d.weekStartsOn)??0,r=V(e,t==null?void 0:t.in),a=r.getDay(),o=(a<n?-7:0)+6-(a-n);return r.setDate(r.getDate()+o),r.setHours(23,59,59,999),r}function Qd(e,t){const i=V(e,t==null?void 0:t.in);return i.setSeconds(59,999),i}function Xd(e,t){const i=V(e,t==null?void 0:t.in),n=i.getMonth(),r=n-n%3+3;return i.setMonth(r,0),i.setHours(23,59,59,999),i}function Jd(e,t){const i=V(e,t==null?void 0:t.in);return i.setMilliseconds(999),i}const ep={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},tp=(e,t,i)=>{let n;const r=ep[e];return typeof r=="string"?n=r:t===1?n=r.one:n=r.other.replace("{{count}}",t.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+n:n+" ago":n};function vr(e){return(t={})=>{const i=t.width?String(t.width):e.defaultWidth;return e.formats[i]||e.formats[e.defaultWidth]}}const ip={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},np={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},rp={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},ap={date:vr({formats:ip,defaultWidth:"full"}),time:vr({formats:np,defaultWidth:"full"}),dateTime:vr({formats:rp,defaultWidth:"full"})},op={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},sp=(e,t,i,n)=>op[e];function zi(e){return(t,i)=>{const n=i!=null&&i.context?String(i.context):"standalone";let r;if(n==="formatting"&&e.formattingValues){const o=e.defaultFormattingWidth||e.defaultWidth,l=i!=null&&i.width?String(i.width):o;r=e.formattingValues[l]||e.formattingValues[o]}else{const o=e.defaultWidth,l=i!=null&&i.width?String(i.width):e.defaultWidth;r=e.values[l]||e.values[o]}const a=e.argumentCallback?e.argumentCallback(t):t;return r[a]}}const lp={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},cp={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},dp={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},pp={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},up={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},hp={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},gp=(e,t)=>{const i=Number(e),n=i%100;if(n>20||n<10)switch(n%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},fp={ordinalNumber:gp,era:zi({values:lp,defaultWidth:"wide"}),quarter:zi({values:cp,defaultWidth:"wide",argumentCallback:e=>e-1}),month:zi({values:dp,defaultWidth:"wide"}),day:zi({values:pp,defaultWidth:"wide"}),dayPeriod:zi({values:up,defaultWidth:"wide",formattingValues:hp,defaultFormattingWidth:"wide"})};function Ei(e){return(t,i={})=>{const n=i.width,r=n&&e.matchPatterns[n]||e.matchPatterns[e.defaultMatchWidth],a=t.match(r);if(!a)return null;const o=a[0],l=n&&e.parsePatterns[n]||e.parsePatterns[e.defaultParseWidth],d=Array.isArray(l)?bp(l,h=>h.test(o)):mp(l,h=>h.test(o));let p;p=e.valueCallback?e.valueCallback(d):d,p=i.valueCallback?i.valueCallback(p):p;const u=t.slice(o.length);return{value:p,rest:u}}}function mp(e,t){for(const i in e)if(Object.prototype.hasOwnProperty.call(e,i)&&t(e[i]))return i}function bp(e,t){for(let i=0;i<e.length;i++)if(t(e[i]))return i}function yp(e){return(t,i={})=>{const n=t.match(e.matchPattern);if(!n)return null;const r=n[0],a=t.match(e.parsePattern);if(!a)return null;let o=e.valueCallback?e.valueCallback(a[0]):a[0];o=i.valueCallback?i.valueCallback(o):o;const l=t.slice(r.length);return{value:o,rest:l}}}const vp=/^(\d+)(th|st|nd|rd)?/i,xp=/\d+/i,wp={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},$p={any:[/^b/i,/^(a|c)/i]},_p={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},kp={any:[/1/i,/2/i,/3/i,/4/i]},Sp={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},Cp={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},Pp={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},Tp={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},Mp={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},Dp={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},zp={ordinalNumber:yp({matchPattern:vp,parsePattern:xp,valueCallback:e=>parseInt(e,10)}),era:Ei({matchPatterns:wp,defaultMatchWidth:"wide",parsePatterns:$p,defaultParseWidth:"any"}),quarter:Ei({matchPatterns:_p,defaultMatchWidth:"wide",parsePatterns:kp,defaultParseWidth:"any",valueCallback:e=>e+1}),month:Ei({matchPatterns:Sp,defaultMatchWidth:"wide",parsePatterns:Cp,defaultParseWidth:"any"}),day:Ei({matchPatterns:Pp,defaultMatchWidth:"wide",parsePatterns:Tp,defaultParseWidth:"any"}),dayPeriod:Ei({matchPatterns:Mp,defaultMatchWidth:"any",parsePatterns:Dp,defaultParseWidth:"any"})},Zo={code:"en-US",formatDistance:tp,formatLong:ap,formatRelative:sp,localize:fp,match:zp,options:{weekStartsOn:0,firstWeekContainsDate:1}};function Ep(e,t){const i=V(e,t==null?void 0:t.in);return Vo(i,Go(i))+1}function Qo(e,t){const i=V(e,t==null?void 0:t.in),n=+li(i)-+Dd(i);return Math.round(n/jo)+1}function ta(e,t){var u,h,g,m;const i=V(e,t==null?void 0:t.in),n=i.getFullYear(),r=jt(),a=(t==null?void 0:t.firstWeekContainsDate)??((h=(u=t==null?void 0:t.locale)==null?void 0:u.options)==null?void 0:h.firstWeekContainsDate)??r.firstWeekContainsDate??((m=(g=r.locale)==null?void 0:g.options)==null?void 0:m.firstWeekContainsDate)??1,o=ue((t==null?void 0:t.in)||e,0);o.setFullYear(n+1,0,a),o.setHours(0,0,0,0);const l=Ve(o,t),d=ue((t==null?void 0:t.in)||e,0);d.setFullYear(n,0,a),d.setHours(0,0,0,0);const p=Ve(d,t);return+i>=+l?n+1:+i>=+p?n:n-1}function Op(e,t){var l,d,p,u;const i=jt(),n=(t==null?void 0:t.firstWeekContainsDate)??((d=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:d.firstWeekContainsDate)??i.firstWeekContainsDate??((u=(p=i.locale)==null?void 0:p.options)==null?void 0:u.firstWeekContainsDate)??1,r=ta(e,t),a=ue((t==null?void 0:t.in)||e,0);return a.setFullYear(r,0,n),a.setHours(0,0,0,0),Ve(a,t)}function Xo(e,t){const i=V(e,t==null?void 0:t.in),n=+Ve(i,t)-+Op(i,t);return Math.round(n/jo)+1}function te(e,t){const i=e<0?"-":"",n=Math.abs(e).toString().padStart(t,"0");return i+n}const st={y(e,t){const i=e.getFullYear(),n=i>0?i:1-i;return te(t==="yy"?n%100:n,t.length)},M(e,t){const i=e.getMonth();return t==="M"?String(i+1):te(i+1,2)},d(e,t){return te(e.getDate(),t.length)},a(e,t){const i=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(e,t){return te(e.getHours()%12||12,t.length)},H(e,t){return te(e.getHours(),t.length)},m(e,t){return te(e.getMinutes(),t.length)},s(e,t){return te(e.getSeconds(),t.length)},S(e,t){const i=t.length,n=e.getMilliseconds(),r=Math.trunc(n*Math.pow(10,i-3));return te(r,t.length)}},qt={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},Va={G:function(e,t,i){const n=e.getFullYear()>0?1:0;switch(t){case"G":case"GG":case"GGG":return i.era(n,{width:"abbreviated"});case"GGGGG":return i.era(n,{width:"narrow"});case"GGGG":default:return i.era(n,{width:"wide"})}},y:function(e,t,i){if(t==="yo"){const n=e.getFullYear(),r=n>0?n:1-n;return i.ordinalNumber(r,{unit:"year"})}return st.y(e,t)},Y:function(e,t,i,n){const r=ta(e,n),a=r>0?r:1-r;if(t==="YY"){const o=a%100;return te(o,2)}return t==="Yo"?i.ordinalNumber(a,{unit:"year"}):te(a,t.length)},R:function(e,t){const i=Ho(e);return te(i,t.length)},u:function(e,t){const i=e.getFullYear();return te(i,t.length)},Q:function(e,t,i){const n=Math.ceil((e.getMonth()+1)/3);switch(t){case"Q":return String(n);case"QQ":return te(n,2);case"Qo":return i.ordinalNumber(n,{unit:"quarter"});case"QQQ":return i.quarter(n,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(n,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(n,{width:"wide",context:"formatting"})}},q:function(e,t,i){const n=Math.ceil((e.getMonth()+1)/3);switch(t){case"q":return String(n);case"qq":return te(n,2);case"qo":return i.ordinalNumber(n,{unit:"quarter"});case"qqq":return i.quarter(n,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(n,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(n,{width:"wide",context:"standalone"})}},M:function(e,t,i){const n=e.getMonth();switch(t){case"M":case"MM":return st.M(e,t);case"Mo":return i.ordinalNumber(n+1,{unit:"month"});case"MMM":return i.month(n,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(n,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(n,{width:"wide",context:"formatting"})}},L:function(e,t,i){const n=e.getMonth();switch(t){case"L":return String(n+1);case"LL":return te(n+1,2);case"Lo":return i.ordinalNumber(n+1,{unit:"month"});case"LLL":return i.month(n,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(n,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(n,{width:"wide",context:"standalone"})}},w:function(e,t,i,n){const r=Xo(e,n);return t==="wo"?i.ordinalNumber(r,{unit:"week"}):te(r,t.length)},I:function(e,t,i){const n=Qo(e);return t==="Io"?i.ordinalNumber(n,{unit:"week"}):te(n,t.length)},d:function(e,t,i){return t==="do"?i.ordinalNumber(e.getDate(),{unit:"date"}):st.d(e,t)},D:function(e,t,i){const n=Ep(e);return t==="Do"?i.ordinalNumber(n,{unit:"dayOfYear"}):te(n,t.length)},E:function(e,t,i){const n=e.getDay();switch(t){case"E":case"EE":case"EEE":return i.day(n,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(n,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(n,{width:"short",context:"formatting"});case"EEEE":default:return i.day(n,{width:"wide",context:"formatting"})}},e:function(e,t,i,n){const r=e.getDay(),a=(r-n.weekStartsOn+8)%7||7;switch(t){case"e":return String(a);case"ee":return te(a,2);case"eo":return i.ordinalNumber(a,{unit:"day"});case"eee":return i.day(r,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(r,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(r,{width:"short",context:"formatting"});case"eeee":default:return i.day(r,{width:"wide",context:"formatting"})}},c:function(e,t,i,n){const r=e.getDay(),a=(r-n.weekStartsOn+8)%7||7;switch(t){case"c":return String(a);case"cc":return te(a,t.length);case"co":return i.ordinalNumber(a,{unit:"day"});case"ccc":return i.day(r,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(r,{width:"narrow",context:"standalone"});case"cccccc":return i.day(r,{width:"short",context:"standalone"});case"cccc":default:return i.day(r,{width:"wide",context:"standalone"})}},i:function(e,t,i){const n=e.getDay(),r=n===0?7:n;switch(t){case"i":return String(r);case"ii":return te(r,t.length);case"io":return i.ordinalNumber(r,{unit:"day"});case"iii":return i.day(n,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(n,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(n,{width:"short",context:"formatting"});case"iiii":default:return i.day(n,{width:"wide",context:"formatting"})}},a:function(e,t,i){const r=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},b:function(e,t,i){const n=e.getHours();let r;switch(n===12?r=qt.noon:n===0?r=qt.midnight:r=n/12>=1?"pm":"am",t){case"b":case"bb":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},B:function(e,t,i){const n=e.getHours();let r;switch(n>=17?r=qt.evening:n>=12?r=qt.afternoon:n>=4?r=qt.morning:r=qt.night,t){case"B":case"BB":case"BBB":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},h:function(e,t,i){if(t==="ho"){let n=e.getHours()%12;return n===0&&(n=12),i.ordinalNumber(n,{unit:"hour"})}return st.h(e,t)},H:function(e,t,i){return t==="Ho"?i.ordinalNumber(e.getHours(),{unit:"hour"}):st.H(e,t)},K:function(e,t,i){const n=e.getHours()%12;return t==="Ko"?i.ordinalNumber(n,{unit:"hour"}):te(n,t.length)},k:function(e,t,i){let n=e.getHours();return n===0&&(n=24),t==="ko"?i.ordinalNumber(n,{unit:"hour"}):te(n,t.length)},m:function(e,t,i){return t==="mo"?i.ordinalNumber(e.getMinutes(),{unit:"minute"}):st.m(e,t)},s:function(e,t,i){return t==="so"?i.ordinalNumber(e.getSeconds(),{unit:"second"}):st.s(e,t)},S:function(e,t){return st.S(e,t)},X:function(e,t,i){const n=e.getTimezoneOffset();if(n===0)return"Z";switch(t){case"X":return Ka(n);case"XXXX":case"XX":return Pt(n);case"XXXXX":case"XXX":default:return Pt(n,":")}},x:function(e,t,i){const n=e.getTimezoneOffset();switch(t){case"x":return Ka(n);case"xxxx":case"xx":return Pt(n);case"xxxxx":case"xxx":default:return Pt(n,":")}},O:function(e,t,i){const n=e.getTimezoneOffset();switch(t){case"O":case"OO":case"OOO":return"GMT"+Wa(n,":");case"OOOO":default:return"GMT"+Pt(n,":")}},z:function(e,t,i){const n=e.getTimezoneOffset();switch(t){case"z":case"zz":case"zzz":return"GMT"+Wa(n,":");case"zzzz":default:return"GMT"+Pt(n,":")}},t:function(e,t,i){const n=Math.trunc(+e/1e3);return te(n,t.length)},T:function(e,t,i){return te(+e,t.length)}};function Wa(e,t=""){const i=e>0?"-":"+",n=Math.abs(e),r=Math.trunc(n/60),a=n%60;return a===0?i+String(r):i+String(r)+t+te(a,2)}function Ka(e,t){return e%60===0?(e>0?"-":"+")+te(Math.abs(e)/60,2):Pt(e,t)}function Pt(e,t=""){const i=e>0?"-":"+",n=Math.abs(e),r=te(Math.trunc(n/60),2),a=te(n%60,2);return i+r+t+a}const qa=(e,t)=>{switch(e){case"P":return t.date({width:"short"});case"PP":return t.date({width:"medium"});case"PPP":return t.date({width:"long"});case"PPPP":default:return t.date({width:"full"})}},Jo=(e,t)=>{switch(e){case"p":return t.time({width:"short"});case"pp":return t.time({width:"medium"});case"ppp":return t.time({width:"long"});case"pppp":default:return t.time({width:"full"})}},Lp=(e,t)=>{const i=e.match(/(P+)(p+)?/)||[],n=i[1],r=i[2];if(!r)return qa(e,t);let a;switch(n){case"P":a=t.dateTime({width:"short"});break;case"PP":a=t.dateTime({width:"medium"});break;case"PPP":a=t.dateTime({width:"long"});break;case"PPPP":default:a=t.dateTime({width:"full"});break}return a.replace("{{date}}",qa(n,t)).replace("{{time}}",Jo(r,t))},Rr={p:Jo,P:Lp},Ap=/^D+$/,Fp=/^Y+$/,Ip=["D","DD","YY","YYYY"];function es(e){return Ap.test(e)}function ts(e){return Fp.test(e)}function jr(e,t,i){const n=Bp(e,t,i);if(console.warn(n),Ip.includes(e))throw new RangeError(n)}function Bp(e,t,i){const n=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${t}\`) for formatting ${n} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const Np=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Rp=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,jp=/^'([^]*?)'?$/,Hp=/''/g,Vp=/[a-zA-Z]/;function Wp(e,t,i){var u,h,g,m,b,y,_,$;const n=jt(),r=(i==null?void 0:i.locale)??n.locale??Zo,a=(i==null?void 0:i.firstWeekContainsDate)??((h=(u=i==null?void 0:i.locale)==null?void 0:u.options)==null?void 0:h.firstWeekContainsDate)??n.firstWeekContainsDate??((m=(g=n.locale)==null?void 0:g.options)==null?void 0:m.firstWeekContainsDate)??1,o=(i==null?void 0:i.weekStartsOn)??((y=(b=i==null?void 0:i.locale)==null?void 0:b.options)==null?void 0:y.weekStartsOn)??n.weekStartsOn??(($=(_=n.locale)==null?void 0:_.options)==null?void 0:$.weekStartsOn)??0,l=V(e,i==null?void 0:i.in);if(!Wo(l))throw new RangeError("Invalid time value");let d=t.match(Rp).map(v=>{const P=v[0];if(P==="p"||P==="P"){const j=Rr[P];return j(v,r.formatLong)}return v}).join("").match(Np).map(v=>{if(v==="''")return{isToken:!1,value:"'"};const P=v[0];if(P==="'")return{isToken:!1,value:Kp(v)};if(Va[P])return{isToken:!0,value:v};if(P.match(Vp))throw new RangeError("Format string contains an unescaped latin alphabet character `"+P+"`");return{isToken:!1,value:v}});r.localize.preprocessor&&(d=r.localize.preprocessor(l,d));const p={firstWeekContainsDate:a,weekStartsOn:o,locale:r};return d.map(v=>{if(!v.isToken)return v.value;const P=v.value;(!(i!=null&&i.useAdditionalWeekYearTokens)&&ts(P)||!(i!=null&&i.useAdditionalDayOfYearTokens)&&es(P))&&jr(P,t,String(e));const j=Va[P[0]];return j(l,P,r.localize,p)}).join("")}function Kp(e){const t=e.match(jp);return t?t[1].replace(Hp,"'"):e}function qp(){return Object.assign({},jt())}function Yp(e,t){const i=V(e,t==null?void 0:t.in).getDay();return i===0?7:i}function Up(e,t){const i=Gp(t)?new t(0):ue(t,0);return i.setFullYear(e.getFullYear(),e.getMonth(),e.getDate()),i.setHours(e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()),i}function Gp(e){var t;return typeof e=="function"&&((t=e.prototype)==null?void 0:t.constructor)===e}const Zp=10;class is{constructor(){D(this,"subPriority",0)}validate(t,i){return!0}}class Qp extends is{constructor(t,i,n,r,a){super(),this.value=t,this.validateValue=i,this.setValue=n,this.priority=r,a&&(this.subPriority=a)}validate(t,i){return this.validateValue(t,this.value,i)}set(t,i,n){return this.setValue(t,i,this.value,n)}}class Xp extends is{constructor(i,n){super();D(this,"priority",Zp);D(this,"subPriority",-1);this.context=i||(r=>ue(n,r))}set(i,n){return n.timestampIsSet?i:ue(i,Up(i,this.context))}}class X{run(t,i,n,r){const a=this.parse(t,i,n,r);return a?{setter:new Qp(a.value,this.validate,this.set,this.priority,this.subPriority),rest:a.rest}:null}validate(t,i,n){return!0}}class Jp extends X{constructor(){super(...arguments);D(this,"priority",140);D(this,"incompatibleTokens",["R","u","t","T"])}parse(i,n,r){switch(n){case"G":case"GG":case"GGG":return r.era(i,{width:"abbreviated"})||r.era(i,{width:"narrow"});case"GGGGG":return r.era(i,{width:"narrow"});case"GGGG":default:return r.era(i,{width:"wide"})||r.era(i,{width:"abbreviated"})||r.era(i,{width:"narrow"})}}set(i,n,r){return n.era=r,i.setFullYear(r,0,1),i.setHours(0,0,0,0),i}}const ge={month:/^(1[0-2]|0?\d)/,date:/^(3[0-1]|[0-2]?\d)/,dayOfYear:/^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,week:/^(5[0-3]|[0-4]?\d)/,hour23h:/^(2[0-3]|[0-1]?\d)/,hour24h:/^(2[0-4]|[0-1]?\d)/,hour11h:/^(1[0-1]|0?\d)/,hour12h:/^(1[0-2]|0?\d)/,minute:/^[0-5]?\d/,second:/^[0-5]?\d/,singleDigit:/^\d/,twoDigits:/^\d{1,2}/,threeDigits:/^\d{1,3}/,fourDigits:/^\d{1,4}/,anyDigitsSigned:/^-?\d+/,singleDigitSigned:/^-?\d/,twoDigitsSigned:/^-?\d{1,2}/,threeDigitsSigned:/^-?\d{1,3}/,fourDigitsSigned:/^-?\d{1,4}/},je={basicOptionalMinutes:/^([+-])(\d{2})(\d{2})?|Z/,basic:/^([+-])(\d{2})(\d{2})|Z/,basicOptionalSeconds:/^([+-])(\d{2})(\d{2})((\d{2}))?|Z/,extended:/^([+-])(\d{2}):(\d{2})|Z/,extendedOptionalSeconds:/^([+-])(\d{2}):(\d{2})(:(\d{2}))?|Z/};function fe(e,t){return e&&{value:t(e.value),rest:e.rest}}function le(e,t){const i=t.match(e);return i?{value:parseInt(i[0],10),rest:t.slice(i[0].length)}:null}function He(e,t){const i=t.match(e);if(!i)return null;if(i[0]==="Z")return{value:0,rest:t.slice(1)};const n=i[1]==="+"?1:-1,r=i[2]?parseInt(i[2],10):0,a=i[3]?parseInt(i[3],10):0,o=i[5]?parseInt(i[5],10):0;return{value:n*(r*pn+a*dn+o*Pd),rest:t.slice(i[0].length)}}function ns(e){return le(ge.anyDigitsSigned,e)}function he(e,t){switch(e){case 1:return le(ge.singleDigit,t);case 2:return le(ge.twoDigits,t);case 3:return le(ge.threeDigits,t);case 4:return le(ge.fourDigits,t);default:return le(new RegExp("^\\d{1,"+e+"}"),t)}}function On(e,t){switch(e){case 1:return le(ge.singleDigitSigned,t);case 2:return le(ge.twoDigitsSigned,t);case 3:return le(ge.threeDigitsSigned,t);case 4:return le(ge.fourDigitsSigned,t);default:return le(new RegExp("^-?\\d{1,"+e+"}"),t)}}function ia(e){switch(e){case"morning":return 4;case"evening":return 17;case"pm":case"noon":case"afternoon":return 12;case"am":case"midnight":case"night":default:return 0}}function rs(e,t){const i=t>0,n=i?t:1-t;let r;if(n<=50)r=e||100;else{const a=n+50,o=Math.trunc(a/100)*100,l=e>=a%100;r=e+o-(l?100:0)}return i?r:1-r}function as(e){return e%400===0||e%4===0&&e%100!==0}class eu extends X{constructor(){super(...arguments);D(this,"priority",130);D(this,"incompatibleTokens",["Y","R","u","w","I","i","e","c","t","T"])}parse(i,n,r){const a=o=>({year:o,isTwoDigitYear:n==="yy"});switch(n){case"y":return fe(he(4,i),a);case"yo":return fe(r.ordinalNumber(i,{unit:"year"}),a);default:return fe(he(n.length,i),a)}}validate(i,n){return n.isTwoDigitYear||n.year>0}set(i,n,r){const a=i.getFullYear();if(r.isTwoDigitYear){const l=rs(r.year,a);return i.setFullYear(l,0,1),i.setHours(0,0,0,0),i}const o=!("era"in n)||n.era===1?r.year:1-r.year;return i.setFullYear(o,0,1),i.setHours(0,0,0,0),i}}class tu extends X{constructor(){super(...arguments);D(this,"priority",130);D(this,"incompatibleTokens",["y","R","u","Q","q","M","L","I","d","D","i","t","T"])}parse(i,n,r){const a=o=>({year:o,isTwoDigitYear:n==="YY"});switch(n){case"Y":return fe(he(4,i),a);case"Yo":return fe(r.ordinalNumber(i,{unit:"year"}),a);default:return fe(he(n.length,i),a)}}validate(i,n){return n.isTwoDigitYear||n.year>0}set(i,n,r,a){const o=ta(i,a);if(r.isTwoDigitYear){const d=rs(r.year,o);return i.setFullYear(d,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),Ve(i,a)}const l=!("era"in n)||n.era===1?r.year:1-r.year;return i.setFullYear(l,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),Ve(i,a)}}class iu extends X{constructor(){super(...arguments);D(this,"priority",130);D(this,"incompatibleTokens",["G","y","Y","u","Q","q","M","L","w","d","D","e","c","t","T"])}parse(i,n){return On(n==="R"?4:n.length,i)}set(i,n,r){const a=ue(i,0);return a.setFullYear(r,0,4),a.setHours(0,0,0,0),li(a)}}class nu extends X{constructor(){super(...arguments);D(this,"priority",130);D(this,"incompatibleTokens",["G","y","Y","R","w","I","i","e","c","t","T"])}parse(i,n){return On(n==="u"?4:n.length,i)}set(i,n,r){return i.setFullYear(r,0,1),i.setHours(0,0,0,0),i}}class ru extends X{constructor(){super(...arguments);D(this,"priority",120);D(this,"incompatibleTokens",["Y","R","q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"Q":case"QQ":return he(n.length,i);case"Qo":return r.ordinalNumber(i,{unit:"quarter"});case"QQQ":return r.quarter(i,{width:"abbreviated",context:"formatting"})||r.quarter(i,{width:"narrow",context:"formatting"});case"QQQQQ":return r.quarter(i,{width:"narrow",context:"formatting"});case"QQQQ":default:return r.quarter(i,{width:"wide",context:"formatting"})||r.quarter(i,{width:"abbreviated",context:"formatting"})||r.quarter(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=1&&n<=4}set(i,n,r){return i.setMonth((r-1)*3,1),i.setHours(0,0,0,0),i}}class au extends X{constructor(){super(...arguments);D(this,"priority",120);D(this,"incompatibleTokens",["Y","R","Q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"q":case"qq":return he(n.length,i);case"qo":return r.ordinalNumber(i,{unit:"quarter"});case"qqq":return r.quarter(i,{width:"abbreviated",context:"standalone"})||r.quarter(i,{width:"narrow",context:"standalone"});case"qqqqq":return r.quarter(i,{width:"narrow",context:"standalone"});case"qqqq":default:return r.quarter(i,{width:"wide",context:"standalone"})||r.quarter(i,{width:"abbreviated",context:"standalone"})||r.quarter(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=1&&n<=4}set(i,n,r){return i.setMonth((r-1)*3,1),i.setHours(0,0,0,0),i}}class ou extends X{constructor(){super(...arguments);D(this,"incompatibleTokens",["Y","R","q","Q","L","w","I","D","i","e","c","t","T"]);D(this,"priority",110)}parse(i,n,r){const a=o=>o-1;switch(n){case"M":return fe(le(ge.month,i),a);case"MM":return fe(he(2,i),a);case"Mo":return fe(r.ordinalNumber(i,{unit:"month"}),a);case"MMM":return r.month(i,{width:"abbreviated",context:"formatting"})||r.month(i,{width:"narrow",context:"formatting"});case"MMMMM":return r.month(i,{width:"narrow",context:"formatting"});case"MMMM":default:return r.month(i,{width:"wide",context:"formatting"})||r.month(i,{width:"abbreviated",context:"formatting"})||r.month(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.setMonth(r,1),i.setHours(0,0,0,0),i}}class su extends X{constructor(){super(...arguments);D(this,"priority",110);D(this,"incompatibleTokens",["Y","R","q","Q","M","w","I","D","i","e","c","t","T"])}parse(i,n,r){const a=o=>o-1;switch(n){case"L":return fe(le(ge.month,i),a);case"LL":return fe(he(2,i),a);case"Lo":return fe(r.ordinalNumber(i,{unit:"month"}),a);case"LLL":return r.month(i,{width:"abbreviated",context:"standalone"})||r.month(i,{width:"narrow",context:"standalone"});case"LLLLL":return r.month(i,{width:"narrow",context:"standalone"});case"LLLL":default:return r.month(i,{width:"wide",context:"standalone"})||r.month(i,{width:"abbreviated",context:"standalone"})||r.month(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.setMonth(r,1),i.setHours(0,0,0,0),i}}function lu(e,t,i){const n=V(e,i==null?void 0:i.in),r=Xo(n,i)-t;return n.setDate(n.getDate()-r*7),V(n,i==null?void 0:i.in)}class cu extends X{constructor(){super(...arguments);D(this,"priority",100);D(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","i","t","T"])}parse(i,n,r){switch(n){case"w":return le(ge.week,i);case"wo":return r.ordinalNumber(i,{unit:"week"});default:return he(n.length,i)}}validate(i,n){return n>=1&&n<=53}set(i,n,r,a){return Ve(lu(i,r,a),a)}}function du(e,t,i){const n=V(e,i==null?void 0:i.in),r=Qo(n,i)-t;return n.setDate(n.getDate()-r*7),n}class pu extends X{constructor(){super(...arguments);D(this,"priority",100);D(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","e","c","t","T"])}parse(i,n,r){switch(n){case"I":return le(ge.week,i);case"Io":return r.ordinalNumber(i,{unit:"week"});default:return he(n.length,i)}}validate(i,n){return n>=1&&n<=53}set(i,n,r){return li(du(i,r))}}const uu=[31,28,31,30,31,30,31,31,30,31,30,31],hu=[31,29,31,30,31,30,31,31,30,31,30,31];class gu extends X{constructor(){super(...arguments);D(this,"priority",90);D(this,"subPriority",1);D(this,"incompatibleTokens",["Y","R","q","Q","w","I","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"d":return le(ge.date,i);case"do":return r.ordinalNumber(i,{unit:"date"});default:return he(n.length,i)}}validate(i,n){const r=i.getFullYear(),a=as(r),o=i.getMonth();return a?n>=1&&n<=hu[o]:n>=1&&n<=uu[o]}set(i,n,r){return i.setDate(r),i.setHours(0,0,0,0),i}}class fu extends X{constructor(){super(...arguments);D(this,"priority",90);D(this,"subpriority",1);D(this,"incompatibleTokens",["Y","R","q","Q","M","L","w","I","d","E","i","e","c","t","T"])}parse(i,n,r){switch(n){case"D":case"DD":return le(ge.dayOfYear,i);case"Do":return r.ordinalNumber(i,{unit:"date"});default:return he(n.length,i)}}validate(i,n){const r=i.getFullYear();return as(r)?n>=1&&n<=366:n>=1&&n<=365}set(i,n,r){return i.setMonth(0,r),i.setHours(0,0,0,0),i}}function na(e,t,i){var h,g,m,b;const n=jt(),r=(i==null?void 0:i.weekStartsOn)??((g=(h=i==null?void 0:i.locale)==null?void 0:h.options)==null?void 0:g.weekStartsOn)??n.weekStartsOn??((b=(m=n.locale)==null?void 0:m.options)==null?void 0:b.weekStartsOn)??0,a=V(e,i==null?void 0:i.in),o=a.getDay(),d=(t%7+7)%7,p=7-r,u=t<0||t>6?t-(o+p)%7:(d+p)%7-(o+p)%7;return Jn(a,u,i)}class mu extends X{constructor(){super(...arguments);D(this,"priority",90);D(this,"incompatibleTokens",["D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"E":case"EE":case"EEE":return r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"EEEEE":return r.day(i,{width:"narrow",context:"formatting"});case"EEEEEE":return r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"EEEE":default:return r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=na(i,r,a),i.setHours(0,0,0,0),i}}class bu extends X{constructor(){super(...arguments);D(this,"priority",90);D(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","c","t","T"])}parse(i,n,r,a){const o=l=>{const d=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+d};switch(n){case"e":case"ee":return fe(he(n.length,i),o);case"eo":return fe(r.ordinalNumber(i,{unit:"day"}),o);case"eee":return r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"eeeee":return r.day(i,{width:"narrow",context:"formatting"});case"eeeeee":return r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"eeee":default:return r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=na(i,r,a),i.setHours(0,0,0,0),i}}class yu extends X{constructor(){super(...arguments);D(this,"priority",90);D(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","e","t","T"])}parse(i,n,r,a){const o=l=>{const d=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+d};switch(n){case"c":case"cc":return fe(he(n.length,i),o);case"co":return fe(r.ordinalNumber(i,{unit:"day"}),o);case"ccc":return r.day(i,{width:"abbreviated",context:"standalone"})||r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"});case"ccccc":return r.day(i,{width:"narrow",context:"standalone"});case"cccccc":return r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"});case"cccc":default:return r.day(i,{width:"wide",context:"standalone"})||r.day(i,{width:"abbreviated",context:"standalone"})||r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=na(i,r,a),i.setHours(0,0,0,0),i}}function vu(e,t,i){const n=V(e,i==null?void 0:i.in),r=Yp(n,i),a=t-r;return Jn(n,a,i)}class xu extends X{constructor(){super(...arguments);D(this,"priority",90);D(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","E","e","c","t","T"])}parse(i,n,r){const a=o=>o===0?7:o;switch(n){case"i":case"ii":return he(n.length,i);case"io":return r.ordinalNumber(i,{unit:"day"});case"iii":return fe(r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a);case"iiiii":return fe(r.day(i,{width:"narrow",context:"formatting"}),a);case"iiiiii":return fe(r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a);case"iiii":default:return fe(r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a)}}validate(i,n){return n>=1&&n<=7}set(i,n,r){return i=vu(i,r),i.setHours(0,0,0,0),i}}class wu extends X{constructor(){super(...arguments);D(this,"priority",80);D(this,"incompatibleTokens",["b","B","H","k","t","T"])}parse(i,n,r){switch(n){case"a":case"aa":case"aaa":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaaa":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaa":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(ia(r),0,0,0),i}}class $u extends X{constructor(){super(...arguments);D(this,"priority",80);D(this,"incompatibleTokens",["a","B","H","k","t","T"])}parse(i,n,r){switch(n){case"b":case"bb":case"bbb":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbbb":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbb":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(ia(r),0,0,0),i}}class _u extends X{constructor(){super(...arguments);D(this,"priority",80);D(this,"incompatibleTokens",["a","b","t","T"])}parse(i,n,r){switch(n){case"B":case"BB":case"BBB":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBBB":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBB":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(ia(r),0,0,0),i}}class ku extends X{constructor(){super(...arguments);D(this,"priority",70);D(this,"incompatibleTokens",["H","K","k","t","T"])}parse(i,n,r){switch(n){case"h":return le(ge.hour12h,i);case"ho":return r.ordinalNumber(i,{unit:"hour"});default:return he(n.length,i)}}validate(i,n){return n>=1&&n<=12}set(i,n,r){const a=i.getHours()>=12;return a&&r<12?i.setHours(r+12,0,0,0):!a&&r===12?i.setHours(0,0,0,0):i.setHours(r,0,0,0),i}}class Su extends X{constructor(){super(...arguments);D(this,"priority",70);D(this,"incompatibleTokens",["a","b","h","K","k","t","T"])}parse(i,n,r){switch(n){case"H":return le(ge.hour23h,i);case"Ho":return r.ordinalNumber(i,{unit:"hour"});default:return he(n.length,i)}}validate(i,n){return n>=0&&n<=23}set(i,n,r){return i.setHours(r,0,0,0),i}}class Cu extends X{constructor(){super(...arguments);D(this,"priority",70);D(this,"incompatibleTokens",["h","H","k","t","T"])}parse(i,n,r){switch(n){case"K":return le(ge.hour11h,i);case"Ko":return r.ordinalNumber(i,{unit:"hour"});default:return he(n.length,i)}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.getHours()>=12&&r<12?i.setHours(r+12,0,0,0):i.setHours(r,0,0,0),i}}class Pu extends X{constructor(){super(...arguments);D(this,"priority",70);D(this,"incompatibleTokens",["a","b","h","H","K","t","T"])}parse(i,n,r){switch(n){case"k":return le(ge.hour24h,i);case"ko":return r.ordinalNumber(i,{unit:"hour"});default:return he(n.length,i)}}validate(i,n){return n>=1&&n<=24}set(i,n,r){const a=r<=24?r%24:r;return i.setHours(a,0,0,0),i}}class Tu extends X{constructor(){super(...arguments);D(this,"priority",60);D(this,"incompatibleTokens",["t","T"])}parse(i,n,r){switch(n){case"m":return le(ge.minute,i);case"mo":return r.ordinalNumber(i,{unit:"minute"});default:return he(n.length,i)}}validate(i,n){return n>=0&&n<=59}set(i,n,r){return i.setMinutes(r,0,0),i}}class Mu extends X{constructor(){super(...arguments);D(this,"priority",50);D(this,"incompatibleTokens",["t","T"])}parse(i,n,r){switch(n){case"s":return le(ge.second,i);case"so":return r.ordinalNumber(i,{unit:"second"});default:return he(n.length,i)}}validate(i,n){return n>=0&&n<=59}set(i,n,r){return i.setSeconds(r,0),i}}class Du extends X{constructor(){super(...arguments);D(this,"priority",30);D(this,"incompatibleTokens",["t","T"])}parse(i,n){const r=a=>Math.trunc(a*Math.pow(10,-n.length+3));return fe(he(n.length,i),r)}set(i,n,r){return i.setMilliseconds(r),i}}class zu extends X{constructor(){super(...arguments);D(this,"priority",10);D(this,"incompatibleTokens",["t","T","x"])}parse(i,n){switch(n){case"X":return He(je.basicOptionalMinutes,i);case"XX":return He(je.basic,i);case"XXXX":return He(je.basicOptionalSeconds,i);case"XXXXX":return He(je.extendedOptionalSeconds,i);case"XXX":default:return He(je.extended,i)}}set(i,n,r){return n.timestampIsSet?i:ue(i,i.getTime()-En(i)-r)}}class Eu extends X{constructor(){super(...arguments);D(this,"priority",10);D(this,"incompatibleTokens",["t","T","X"])}parse(i,n){switch(n){case"x":return He(je.basicOptionalMinutes,i);case"xx":return He(je.basic,i);case"xxxx":return He(je.basicOptionalSeconds,i);case"xxxxx":return He(je.extendedOptionalSeconds,i);case"xxx":default:return He(je.extended,i)}}set(i,n,r){return n.timestampIsSet?i:ue(i,i.getTime()-En(i)-r)}}class Ou extends X{constructor(){super(...arguments);D(this,"priority",40);D(this,"incompatibleTokens","*")}parse(i){return ns(i)}set(i,n,r){return[ue(i,r*1e3),{timestampIsSet:!0}]}}class Lu extends X{constructor(){super(...arguments);D(this,"priority",20);D(this,"incompatibleTokens","*")}parse(i){return ns(i)}set(i,n,r){return[ue(i,r),{timestampIsSet:!0}]}}const Au={G:new Jp,y:new eu,Y:new tu,R:new iu,u:new nu,Q:new ru,q:new au,M:new ou,L:new su,w:new cu,I:new pu,d:new gu,D:new fu,E:new mu,e:new bu,c:new yu,i:new xu,a:new wu,b:new $u,B:new _u,h:new ku,H:new Su,K:new Cu,k:new Pu,m:new Tu,s:new Mu,S:new Du,X:new zu,x:new Eu,t:new Ou,T:new Lu},Fu=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Iu=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Bu=/^'([^]*?)'?$/,Nu=/''/g,Ru=/\S/,ju=/[a-zA-Z]/;function Hu(e,t,i,n){var _,$,v,P,j,B,K,S;const r=()=>ue((n==null?void 0:n.in)||i,NaN),a=qp(),o=(n==null?void 0:n.locale)??a.locale??Zo,l=(n==null?void 0:n.firstWeekContainsDate)??(($=(_=n==null?void 0:n.locale)==null?void 0:_.options)==null?void 0:$.firstWeekContainsDate)??a.firstWeekContainsDate??((P=(v=a.locale)==null?void 0:v.options)==null?void 0:P.firstWeekContainsDate)??1,d=(n==null?void 0:n.weekStartsOn)??((B=(j=n==null?void 0:n.locale)==null?void 0:j.options)==null?void 0:B.weekStartsOn)??a.weekStartsOn??((S=(K=a.locale)==null?void 0:K.options)==null?void 0:S.weekStartsOn)??0;if(!t)return e?r():V(i,n==null?void 0:n.in);const p={firstWeekContainsDate:l,weekStartsOn:d,locale:o},u=[new Xp(n==null?void 0:n.in,i)],h=t.match(Iu).map(L=>{const A=L[0];if(A in Rr){const U=Rr[A];return U(L,o.formatLong)}return L}).join("").match(Fu),g=[];for(let L of h){!(n!=null&&n.useAdditionalWeekYearTokens)&&ts(L)&&jr(L,t,e),!(n!=null&&n.useAdditionalDayOfYearTokens)&&es(L)&&jr(L,t,e);const A=L[0],U=Au[A];if(U){const{incompatibleTokens:Y}=U;if(Array.isArray(Y)){const q=g.find(Te=>Y.includes(Te.token)||Te.token===A);if(q)throw new RangeError(`The format string mustn't contain \`${q.fullToken}\` and \`${L}\` at the same time`)}else if(U.incompatibleTokens==="*"&&g.length>0)throw new RangeError(`The format string mustn't contain \`${L}\` and any other token at the same time`);g.push({token:A,fullToken:L});const N=U.run(e,L,o.match,p);if(!N)return r();u.push(N.setter),e=N.rest}else{if(A.match(ju))throw new RangeError("Format string contains an unescaped latin alphabet character `"+A+"`");if(L==="''"?L="'":A==="'"&&(L=Vu(L)),e.indexOf(L)===0)e=e.slice(L.length);else return r()}}if(e.length>0&&Ru.test(e))return r();const m=u.map(L=>L.priority).sort((L,A)=>A-L).filter((L,A,U)=>U.indexOf(L)===A).map(L=>u.filter(A=>A.priority===L).sort((A,U)=>U.subPriority-A.subPriority)).map(L=>L[0]);let b=V(i,n==null?void 0:n.in);if(isNaN(+b))return r();const y={};for(const L of m){if(!L.validate(b,p))return r();const A=L.set(b,y,p);Array.isArray(A)?(b=A[0],Object.assign(y,A[1])):b=A}return b}function Vu(e){return e.match(Bu)[1].replace(Nu,"'")}function Wu(e,t){const i=V(e,t==null?void 0:t.in);return i.setMinutes(0,0,0),i}function Ku(e,t){const i=V(e,t==null?void 0:t.in);return i.setSeconds(0,0),i}function qu(e,t){const i=V(e,t==null?void 0:t.in);return i.setMilliseconds(0),i}function Yu(e,t){const i=()=>ue(t==null?void 0:t.in,NaN),n=(t==null?void 0:t.additionalDigits)??2,r=Qu(e);let a;if(r.date){const p=Xu(r.date,n);a=Ju(p.restDateString,p.year)}if(!a||isNaN(+a))return i();const o=+a;let l=0,d;if(r.time&&(l=eh(r.time),isNaN(l)))return i();if(r.timezone){if(d=th(r.timezone),isNaN(d))return i()}else{const p=new Date(o+l),u=V(0,t==null?void 0:t.in);return u.setFullYear(p.getUTCFullYear(),p.getUTCMonth(),p.getUTCDate()),u.setHours(p.getUTCHours(),p.getUTCMinutes(),p.getUTCSeconds(),p.getUTCMilliseconds()),u}return V(o+l+d,t==null?void 0:t.in)}const _n={dateTimeDelimiter:/[T ]/,timeZoneDelimiter:/[Z ]/i,timezone:/([Z+-].*)$/},Uu=/^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/,Gu=/^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/,Zu=/^([+-])(\d{2})(?::?(\d{2}))?$/;function Qu(e){const t={},i=e.split(_n.dateTimeDelimiter);let n;if(i.length>2)return t;if(/:/.test(i[0])?n=i[0]:(t.date=i[0],n=i[1],_n.timeZoneDelimiter.test(t.date)&&(t.date=e.split(_n.timeZoneDelimiter)[0],n=e.substr(t.date.length,e.length))),n){const r=_n.timezone.exec(n);r?(t.time=n.replace(r[1],""),t.timezone=r[1]):t.time=n}return t}function Xu(e,t){const i=new RegExp("^(?:(\\d{4}|[+-]\\d{"+(4+t)+"})|(\\d{2}|[+-]\\d{"+(2+t)+"})$)"),n=e.match(i);if(!n)return{year:NaN,restDateString:""};const r=n[1]?parseInt(n[1]):null,a=n[2]?parseInt(n[2]):null;return{year:a===null?r:a*100,restDateString:e.slice((n[1]||n[2]).length)}}function Ju(e,t){if(t===null)return new Date(NaN);const i=e.match(Uu);if(!i)return new Date(NaN);const n=!!i[4],r=Oi(i[1]),a=Oi(i[2])-1,o=Oi(i[3]),l=Oi(i[4]),d=Oi(i[5])-1;if(n)return oh(t,l,d)?ih(t,l,d):new Date(NaN);{const p=new Date(0);return!rh(t,a,o)||!ah(t,r)?new Date(NaN):(p.setUTCFullYear(t,a,Math.max(r,o)),p)}}function Oi(e){return e?parseInt(e):1}function eh(e){const t=e.match(Gu);if(!t)return NaN;const i=xr(t[1]),n=xr(t[2]),r=xr(t[3]);return sh(i,n,r)?i*pn+n*dn+r*1e3:NaN}function xr(e){return e&&parseFloat(e.replace(",","."))||0}function th(e){if(e==="Z")return 0;const t=e.match(Zu);if(!t)return 0;const i=t[1]==="+"?-1:1,n=parseInt(t[2]),r=t[3]&&parseInt(t[3])||0;return lh(n,r)?i*(n*pn+r*dn):NaN}function ih(e,t,i){const n=new Date(0);n.setUTCFullYear(e,0,4);const r=n.getUTCDay()||7,a=(t-1)*7+i+1-r;return n.setUTCDate(n.getUTCDate()+a),n}const nh=[31,null,31,30,31,30,31,31,30,31,30,31];function os(e){return e%400===0||e%4===0&&e%100!==0}function rh(e,t,i){return t>=0&&t<=11&&i>=1&&i<=(nh[t]||(os(e)?29:28))}function ah(e,t){return t>=1&&t<=(os(e)?366:365)}function oh(e,t,i){return t>=1&&t<=53&&i>=0&&i<=6}function sh(e,t,i){return e===24?t===0&&i===0:i>=0&&i<60&&t>=0&&t<60&&e>=0&&e<25}function lh(e,t){return t>=0&&t<=59}/*!
 * chartjs-adapter-date-fns v3.0.0
 * https://www.chartjs.org
 * (c) 2022 chartjs-adapter-date-fns Contributors
 * Released under the MIT license
 */const ch={datetime:"MMM d, yyyy, h:mm:ss aaaa",millisecond:"h:mm:ss.SSS aaaa",second:"h:mm:ss aaaa",minute:"h:mm aaaa",hour:"ha",day:"MMM d",week:"PP",month:"MMM yyyy",quarter:"qqq - yyyy",year:"yyyy"};Qs._date.override({_id:"date-fns",formats:function(){return ch},parse:function(e,t){if(e===null||typeof e>"u")return null;const i=typeof e;return i==="number"||e instanceof Date?e=V(e):i==="string"&&(typeof t=="string"?e=Hu(e,t,new Date,this.options):e=Yu(e,this.options)),Wo(e)?e.getTime():null},format:function(e,t){return Wp(e,t,this.options)},add:function(e,t,i){switch(i){case"millisecond":return Jr(e,t);case"second":return Od(e,t);case"minute":return zd(e,t);case"hour":return Td(e,t);case"day":return Jn(e,t);case"week":return Ld(e,t);case"month":return Xr(e,t);case"quarter":return Ed(e,t);case"year":return Ad(e,t);default:return e}},diff:function(e,t,i){switch(i){case"millisecond":return ea(e,t);case"second":return Vd(e,t);case"minute":return Rd(e,t);case"hour":return Nd(e,t);case"day":return Ko(e,t);case"week":return Wd(e,t);case"month":return Uo(e,t);case"quarter":return Hd(e,t);case"year":return Kd(e,t);default:return 0}},startOf:function(e,t,i){switch(t){case"second":return qu(e);case"minute":return Ku(e);case"hour":return Wu(e);case"day":return Nr(e);case"week":return Ve(e);case"isoWeek":return Ve(e,{weekStartsOn:+i});case"month":return Yd(e);case"quarter":return qd(e);case"year":return Go(e);default:return e}},endOf:function(e,t){switch(t){case"second":return Jd(e);case"minute":return Qd(e);case"hour":return Gd(e);case"day":return qo(e);case"week":return Zd(e);case"month":return Yo(e);case"quarter":return Xd(e);case"year":return Ud(e);default:return e}}});function Ya(e,t){if(!(t!=null&&t.start)||!(t!=null&&t.end))return null;const i=e.getPixelForValue(t.start.getTime()),n=e.getPixelForValue(t.end.getTime());if(!Number.isFinite(i)||!Number.isFinite(n))return null;const r=Math.min(i,n),a=Math.max(Math.abs(n-i),2);return!Number.isFinite(a)||a<=0?null:{left:r,width:a}}const dh={id:"pricingModeIcons",beforeDatasetsDraw(e,t,i){var d;const n=i,r=n==null?void 0:n.segments;if(!(r!=null&&r.length))return;const a=e.chartArea,o=(d=e.scales)==null?void 0:d.x;if(!a||!o)return;const l=e.ctx;l.save(),l.globalAlpha=(n==null?void 0:n.backgroundOpacity)??.12;for(const p of r){const u=Ya(o,p);u&&(l.fillStyle=p.color||"rgba(255, 255, 255, 0.1)",l.fillRect(u.left,a.top,u.width,a.bottom-a.top))}l.restore()},afterDatasetsDraw(e,t,i){var L;const n=i,r=n==null?void 0:n.segments;if(!(r!=null&&r.length))return;const a=(L=e.scales)==null?void 0:L.x,o=e.chartArea;if(!a||!o)return;const l=(n==null?void 0:n.iconSize)??16,d=(n==null?void 0:n.labelSize)??9,p=`${l}px "Inter", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,u=`${d}px "Inter", sans-serif`,h=(n==null?void 0:n.iconColor)||"rgba(255, 255, 255, 0.95)",g=(n==null?void 0:n.labelColor)||"rgba(255, 255, 255, 0.7)",m=(n==null?void 0:n.axisBandPadding)??10,b=(n==null?void 0:n.axisBandHeight)??l+d+10,y=(n==null?void 0:n.axisBandColor)||"rgba(6, 10, 18, 0.12)",_=(n==null?void 0:n.iconAlignment)||"start",$=(n==null?void 0:n.iconStartOffset)??12,v=(n==null?void 0:n.iconBaselineOffset)??4,P=(a.bottom||o.bottom)+m,j=Math.min(P,e.height-b-2),B=o.right-o.left,K=j+v,S=e.ctx;S.save(),S.globalCompositeOperation="destination-over",S.fillStyle=y,S.fillRect(o.left,j,B,b),S.restore(),S.save(),S.globalCompositeOperation="destination-over",S.textAlign="center",S.textBaseline="top";for(const A of r){const U=Ya(a,A);if(!U)continue;let Y;if(_==="start"){Y=U.left+$;const N=U.left+U.width-l/2;Y>N&&(Y=U.left+U.width/2)}else Y=U.left+U.width/2;S.font=p,S.fillStyle=h,S.fillText(A.icon||"❓",Y,K),A.shortLabel&&(S.font=u,S.fillStyle=g,S.fillText(A.shortLabel,Y,K+l-2))}S.restore()}};function Ua(e,t){if(!e)return;e.layout||(e.layout={}),e.layout.padding||(e.layout.padding={});const i=e.layout.padding,n=12;i.top=i.top??12,i.bottom=Math.max(i.bottom||0,n)}var ph=Object.defineProperty,uh=Object.getOwnPropertyDescriptor,bi=(e,t,i,n)=>{for(var r=n>1?void 0:n?uh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&ph(t,i,r),r};const lt=Z;Un.register(uo,ho,Xs,Js,go,fo,el,mo,tl,il,bo,yo,nl,rl,vo,dh);function hh(e){const t=e.timeline.map(i=>i.spot_price_czk??0);return{label:"📊 Spot",data:t,borderColor:"#2196F3",backgroundColor:"rgba(33, 150, 243, 0.15)",borderWidth:3,fill:!1,tension:.4,type:"line",yAxisID:"y-price",pointRadius:t.map(()=>0),pointHoverRadius:7,pointBackgroundColor:t.map(()=>"#42a5f5"),pointBorderColor:t.map(()=>"#42a5f5"),pointBorderWidth:2,order:1,datalabels:{display:!1}}}function gh(e){return{label:"💰 Výkup",data:e.timeline.map(t=>t.export_price_czk??0),borderColor:"#4CAF50",backgroundColor:"rgba(76, 187, 106, 0.15)",borderWidth:2,fill:!1,type:"line",tension:.4,yAxisID:"y-price",pointRadius:0,pointHoverRadius:5,order:1,borderDash:[5,5]}}function fh(e){if(!e.solar)return[];const{string1:t,string2:i,hasString1:n,hasString2:r}=e.solar,a=(n?1:0)+(r?1:0),o={string1:{border:"rgba(255, 193, 7, 0.8)",bg:"rgba(255, 193, 7, 0.2)"},string2:{border:"rgba(255, 152, 0, 0.8)",bg:"rgba(255, 152, 0, 0.2)"}};if(a===1){const l=n?t:i,d=n?o.string1:o.string2;return[{label:"☀️ FVE předpověď",data:l,borderColor:d.border,backgroundColor:d.bg,borderWidth:2,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",pointRadius:0,pointHoverRadius:5,order:2}]}return a===2?[{label:"☀️ String 2",data:i,borderColor:o.string2.border,backgroundColor:o.string2.bg,borderWidth:1.5,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2},{label:"☀️ String 1",data:t,borderColor:o.string1.border,backgroundColor:o.string1.bg,borderWidth:1.5,fill:"-1",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2}]:[]}function mh(e){if(!e.battery)return[];const{baseline:t,solarCharge:i,gridCharge:n,gridNet:r,consumption:a}=e.battery,o=[],l={baseline:{border:"#78909C",bg:"rgba(120, 144, 156, 0.25)"},solar:{border:"transparent",bg:"rgba(255, 167, 38, 0.6)"},grid:{border:"transparent",bg:"rgba(33, 150, 243, 0.6)"}};return a.some(d=>d!=null&&d>0)&&o.push({label:"🏠 Spotřeba",data:a,borderColor:"rgba(255, 112, 67, 0.7)",backgroundColor:"rgba(255, 112, 67, 0.12)",borderWidth:1.5,type:"line",fill:!1,tension:.25,pointRadius:0,pointHoverRadius:5,yAxisID:"y-power",stack:"consumption",borderDash:[6,4],order:2}),n.some(d=>d!=null&&d>0)&&o.push({label:"⚡ Síť → baterie",data:n,backgroundColor:l.grid.bg,borderColor:l.grid.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),i.some(d=>d!=null&&d>0)&&o.push({label:"☀️ FVE → baterie",data:i,backgroundColor:l.solar.bg,borderColor:l.solar.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),o.push({label:"🔋 Kapacita",data:t,backgroundColor:l.baseline.bg,borderColor:l.baseline.border,borderWidth:3,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),r.some(d=>d!==null)&&o.push({label:"📡 Netto síť",data:r,borderColor:"#00BCD4",backgroundColor:"transparent",borderWidth:2,type:"line",fill:!1,tension:.2,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",order:2}),o}function Ga(e){const t=[];return e.prices.length>0&&t.push(hh(e)),e.exportPrices.length>0&&t.push(gh(e)),t.push(...fh(e)),t.push(...mh(e)),t}function kn(e,t,i=""){if(e==null)return"";const n=i?` ${i}`:"";return`${e.toFixed(t)}${n}`}function Qt(e){var r;const t=(r=e.scales)==null?void 0:r.x;if(!t)return"overview";const n=(t.max-t.min)/(1e3*60*60);return n<=6?"detail":n<=24?"day":"overview"}function _t(e,t){var h,g,m,b,y,_,$,v,P,j,B;if(!((h=e==null?void 0:e.scales)!=null&&h.x))return;const i=e.scales.x,r=(i.max-i.min)/(1e3*60*60),a=Qt(e),o=(m=(g=e.options.plugins)==null?void 0:g.legend)==null?void 0:m.labels;o&&(o.padding=10,o.font&&(o.font.size=11),a==="detail"&&(o.padding=12,o.font&&(o.font.size=12)));const l=window.innerWidth<520,d=["y-price","y-solar","y-power"];for(const K of d){const S=(b=e.options.scales)==null?void 0:b[K];if(S){if(K==="y-solar"&&l){S.display=!1;continue}a==="overview"?(S.title&&(S.title.display=!1),(y=S.ticks)!=null&&y.font&&(S.ticks.font.size=10),K==="y-solar"&&(S.display=!1)):a==="detail"?(S.title&&(S.title.display=!0,S.title.font&&(S.title.font.size=12)),(_=S.ticks)!=null&&_.font&&(S.ticks.font.size=11),S.display=!0):(S.title&&(S.title.display=!0,S.title.font&&(S.title.font.size=11)),($=S.ticks)!=null&&$.font&&(S.ticks.font.size=10),S.display=!0)}}const p=(v=e.options.scales)==null?void 0:v.x;p&&(a==="overview"?p.ticks&&(p.ticks.maxTicksLimit=12,p.ticks.font&&(p.ticks.font.size=10)):a==="detail"?(p.ticks&&(p.ticks.maxTicksLimit=24,p.ticks.font&&(p.ticks.font.size=11)),p.time&&(p.time.displayFormats.hour="HH:mm")):(p.ticks&&(p.ticks.maxTicksLimit=16,p.ticks.font&&(p.ticks.font.size=10)),p.time&&(p.time.displayFormats.hour=l?"HH:mm":"dd.MM HH:mm")));const u=t==="always"||t==="auto"&&r<=6;for(const K of e.data.datasets){const S=K;if(S.datalabels||(S.datalabels={}),t==="never"){S.datalabels.display=!1;continue}if(u){let L=1;r>3&&r<=6?L=2:r>6&&(L=4),S.datalabels.display=N=>{const q=N.dataset.data[N.dataIndex];return q==null||q===0?!1:N.dataIndex%L===0};const A=S.yAxisID==="y-price",U=((P=S.label)==null?void 0:P.includes("Solární"))||((j=S.label)==null?void 0:j.includes("String")),Y=(B=S.label)==null?void 0:B.includes("kapacita");S.datalabels.align="top",S.datalabels.offset=6,S.datalabels.color="#fff",S.datalabels.font={size:9,weight:"bold"},A?(S.datalabels.formatter=N=>kn(N,2,"Kč"),S.datalabels.backgroundColor=S.borderColor||"rgba(33, 150, 243, 0.8)"):U?(S.datalabels.formatter=N=>kn(N,1,"kW"),S.datalabels.backgroundColor=S.borderColor||"rgba(255, 193, 7, 0.8)"):Y?(S.datalabels.formatter=N=>kn(N,1,"kWh"),S.datalabels.backgroundColor=S.borderColor||"rgba(120, 144, 156, 0.8)"):(S.datalabels.formatter=N=>kn(N,1),S.datalabels.backgroundColor=S.borderColor||"rgba(33, 150, 243, 0.8)"),S.datalabels.borderRadius=4,S.datalabels.padding={top:3,bottom:3,left:5,right:5}}else S.datalabels.display=!1}e.update("none"),C.debug(`[PricingChart] Detail: ${r.toFixed(1)}h, Labels: ${u?"ON":"OFF"}, Mode: ${t}`)}let ut=class extends z{constructor(){super(...arguments),this.data=null,this.datalabelMode="auto",this.zoomState={start:null,end:null},this.currentDetailLevel="overview",this.chart=null,this.resizeObserver=null}firstUpdated(){this.setupResizeObserver(),this.data&&this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())}updated(e){e.has("data")&&this.data&&(this.chart?this.updateChartData():this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())),e.has("datalabelMode")&&this.chart&&_t(this.chart,this.datalabelMode)}disconnectedCallback(){var e;super.disconnectedCallback(),this.destroyChart(),(e=this.resizeObserver)==null||e.disconnect(),this.resizeObserver=null}zoomToTimeRange(e,t){if(!this.chart){C.warn("[PricingChart] Chart not available for zoom");return}const i=new Date(e),n=new Date(t),r=15*60*1e3,a=i.getTime()-r,o=n.getTime()+r;if(this.zoomState.start!==null&&Math.abs(this.zoomState.start-a)<6e4&&this.zoomState.end!==null&&Math.abs(this.zoomState.end-o)<6e4){C.debug("[PricingChart] Already zoomed to same range → reset"),this.resetZoom();return}try{const l=this.chart.options;l.scales.x.min=a,l.scales.x.max=o,this.chart.update("none"),this.zoomState={start:a,end:o},this.currentDetailLevel=Qt(this.chart),_t(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-change",{detail:{start:a,end:o,level:this.currentDetailLevel},bubbles:!0,composed:!0})),C.debug("[PricingChart] Zoomed to range",{start:new Date(a).toISOString(),end:new Date(o).toISOString()})}catch(l){C.error("[PricingChart] Zoom error",l)}}resetZoom(){if(!this.chart)return;const e=this.chart.options;delete e.scales.x.min,delete e.scales.x.max,this.chart.update("none"),this.zoomState={start:null,end:null},this.currentDetailLevel=Qt(this.chart),_t(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-reset",{bubbles:!0,composed:!0}))}getChart(){return this.chart}createChart(){if(!this.canvas||!this.data||this.data.timeline.length===0)return;this.chart&&this.destroyChart();const e=this.data,t=Ga(e),i=window.innerWidth<520,n={responsive:!0,maintainAspectRatio:!1,animation:{duration:0},interaction:{mode:"index",intersect:!1},plugins:{legend:{labels:{color:"#ffffff",font:{size:i?10:11,weight:"500"},padding:i?6:10,usePointStyle:!0,pointStyle:"circle",boxWidth:i?8:12,boxHeight:i?8:12},position:"top"},tooltip:{backgroundColor:"rgba(0,0,0,0.9)",titleColor:"#ffffff",bodyColor:"#ffffff",titleFont:{size:13,weight:"bold"},bodyFont:{size:11},padding:10,cornerRadius:6,displayColors:!0,callbacks:{title:a=>a.length>0?new Date(a[0].parsed.x).toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"",label:a=>{let o=a.dataset.label||"";return o&&(o+=": "),a.parsed.y!==null&&(a.dataset.yAxisID==="y-price"?o+=a.parsed.y.toFixed(2)+" Kč/kWh":a.dataset.yAxisID==="y-solar"?o+=a.parsed.y.toFixed(2)+" kWh":a.dataset.yAxisID==="y-power"?o+=a.parsed.y.toFixed(2)+" kW":o+=a.parsed.y),o}}},datalabels:{display:!1},zoom:{zoom:{wheel:{enabled:!0,modifierKey:null},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)",borderColor:"rgba(33, 150, 243, 0.8)",borderWidth:2},pinch:{enabled:!0},mode:"x",onZoomComplete:({chart:a})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=Qt(a),_t(a,this.datalabelMode)}},pan:{enabled:!0,mode:"x",modifierKey:"shift",onPanComplete:({chart:a})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=Qt(a),_t(a,this.datalabelMode)}},limits:{x:{minRange:36e5}}},pricingModeIcons:null},scales:{x:{type:"timeseries",time:{unit:"hour",displayFormats:{hour:i?"HH:mm":"dd.MM HH:mm"},tooltipFormat:"dd.MM.yyyy HH:mm"},ticks:{color:this.getTextColor(),maxRotation:i?0:45,minRotation:i?0:45,font:{size:i?10:11},maxTicksLimit:i?6:20},grid:{color:this.getGridColor(),lineWidth:1}},"y-price":{type:"linear",position:"left",ticks:{color:"#2196F3",font:{size:11,weight:"500"},callback:a=>a.toFixed(2)+" Kč"},grid:{color:"rgba(33, 150, 243, 0.15)",lineWidth:1},title:{display:!i,text:"💰 Cena (Kč/kWh)",color:"#2196F3",font:{size:13,weight:"bold"}}},"y-solar":{type:"linear",position:"left",stacked:!0,display:!i,ticks:{color:"#78909C",font:{size:11,weight:"500"},callback:a=>a.toFixed(1)+" kWh",display:!0},grid:{display:!0,color:"rgba(120, 144, 156, 0.15)",lineWidth:1,drawOnChartArea:!0},title:{display:!0,text:"🔋 Kapacita baterie (kWh)",color:"#78909C",font:{size:11,weight:"bold"}},beginAtZero:!1},"y-power":{type:"linear",position:"right",stacked:!0,ticks:{color:"#FFA726",font:{size:11,weight:"500"},callback:a=>a.toFixed(2)+" kW"},grid:{display:!1},title:{display:!i,text:"☀️ Výkon (kW)",color:"#FFA726",font:{size:13,weight:"bold"}}}}};Ua(n);const r={type:"bar",data:{labels:e.labels,datasets:t},plugins:[vo],options:n};try{this.chart=new Un(this.canvas,r),_t(this.chart,this.datalabelMode),e.initialZoomStart&&e.initialZoomEnd&&requestAnimationFrame(()=>{if(!this.chart)return;const a=this.chart.options;a.scales.x.min=e.initialZoomStart,a.scales.x.max=e.initialZoomEnd,this.chart.update("none"),this.currentDetailLevel=Qt(this.chart),_t(this.chart,this.datalabelMode)}),C.info("[PricingChart] Chart created",{datasets:t.length,labels:e.labels.length,segments:e.modeSegments.length})}catch(a){C.error("[PricingChart] Failed to create chart",a)}}updateChartData(){var o;if(!this.chart||!this.data)return;const e=this.data,t=Ga(e),i=((o=this.chart.data.labels)==null?void 0:o.length)!==e.labels.length,n=this.chart.data.datasets.length!==t.length;i&&(this.chart.data.labels=e.labels);let r="none";n?(this.chart.data.datasets=t,r=void 0):t.forEach((l,d)=>{const p=this.chart.data.datasets[d];p&&(p.data=l.data,p.label=l.label,p.backgroundColor=l.backgroundColor,p.borderColor=l.borderColor)});const a=this.chart.options;a.plugins||(a.plugins={}),a.plugins.pricingModeIcons=null,Ua(a),this.chart.update(r),C.debug("[PricingChart] Chart updated incrementally")}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(()=>{var e;(e=this.chart)==null||e.resize()}),this.resizeObserver.observe(this)}getTextColor(){try{return getComputedStyle(this).getPropertyValue("--oig-text-primary").trim()||"#e0e0e0"}catch{return"#e0e0e0"}}getGridColor(){try{return getComputedStyle(this).getPropertyValue("--oig-border").trim()||"rgba(255,255,255,0.1)"}catch{return"rgba(255,255,255,0.1)"}}setDatalabelMode(e){this.datalabelMode=e,this.dispatchEvent(new CustomEvent("datalabel-mode-change",{detail:{mode:e},bubbles:!0,composed:!0}))}get isZoomed(){return this.zoomState.start!==null||this.zoomState.end!==null}renderControls(){const e=t=>{const i=this.datalabelMode===t?"active":"";return t==="always"&&this.datalabelMode==="always"?`control-btn mode-always ${i}`:t==="never"&&this.datalabelMode==="never"?`control-btn mode-never ${i}`:`control-btn ${i}`};return c`
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
    `}};ut.styles=M`
    :host {
      display: block;
      background: ${lt(s.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${lt(s.cardShadow)};
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
      color: ${lt(s.textPrimary)};
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
      color: ${lt(s.textSecondary)};
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .control-btn:hover {
      background: ${lt(s.accent)};
      color: #fff;
    }

    .control-btn.active {
      background: ${lt(s.accent)};
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
      color: ${lt(s.textSecondary)};
      font-size: 14px;
    }

    .chart-hint {
      font-size: 10px;
      color: ${lt(s.textSecondary)};
      opacity: 0.7;
      margin-top: 6px;
      text-align: center;
    }
  `;bi([f({type:Object})],ut.prototype,"data",2);bi([f({type:String})],ut.prototype,"datalabelMode",2);bi([T()],ut.prototype,"zoomState",2);bi([T()],ut.prototype,"currentDetailLevel",2);bi([Gn("#pricing-canvas")],ut.prototype,"canvas",2);ut=bi([E("oig-pricing-chart")],ut);const Vt="—";function Ie(e){return e==null||!Number.isFinite(e)?Vt:`${e.toFixed(1)} °C`}function ei(e){return e==null||!Number.isFinite(e)?Vt:`${e.toFixed(2)} kWh`}function Hr(e){return e==null||!Number.isFinite(e)?Vt:`${e.toFixed(2)} Kč`}function bh(e){return e==null||!Number.isFinite(e)?Vt:`${Math.round(e*100)} %`}function yh(e,t){const i=n=>{const r=new Date(n);return Number.isNaN(r.getTime())?n:`${String(r.getHours()).padStart(2,"0")}:${String(r.getMinutes()).padStart(2,"0")}`};return`${i(e)} – ${i(t)}`}function vh(e){return e==null||!Number.isFinite(e)?Vt:e<60?`${Math.round(e)} s`:e<3600?`${Math.round(e/60)} min`:`${Math.round(e/3600)} h`}function xh(e){return e==null||!Number.isFinite(e)?Vt:`${e.toFixed(0)} L`}function wh(e){if(e==null||!Number.isFinite(e)||e<0)return Vt;const t=Math.floor(e/60),i=Math.round(e%60);return t===0?`${i} min`:i===0?`${t} h`:`${t} h ${i} min`}function $h(e){const t=e.topTempC;if(t==null||!Number.isFinite(t))return null;if(e.targetTempC<=t)return 0;const i=e.targetTempC-t;return e.temperatureTrendCPerMin!=null&&Number.isFinite(e.temperatureTrendCPerMin)&&e.temperatureTrendCPerMin>0?i/e.temperatureTrendCPerMin:e.heaterPowerKw!==null&&Number.isFinite(e.heaterPowerKw)&&e.volumeL!=null&&Number.isFinite(e.volumeL)?e.heaterPowerKw===0?null:e.volumeL*.001163*i/e.heaterPowerKw*60:null}var _h=Object.defineProperty,kh=Object.getOwnPropertyDescriptor,F=(e,t,i,n)=>{for(var r=n>1?void 0:n?kh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&_h(t,i,r),r};const O=Z,xt=M`
  background: ${O(s.cardBg)};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${O(s.cardShadow)};
`,et=M`
  font-size: 15px;
  font-weight: 600;
  color: ${O(s.textPrimary)};
  margin: 0 0 12px 0;
`;function Sh(e){return Math.max(0,Math.min(100,e))}function Za(e){const n=Math.max(0,Math.min(1,(e-10)/60)),r={r:33,g:150,b:243},a={r:255,g:87,b:34},o=(l,d)=>Math.round(l+(d-l)*n);return`rgb(${o(r.r,a.r)}, ${o(r.g,a.g)}, ${o(r.b,a.b)})`}let qi=class extends z{constructor(){super(...arguments),this.collapsed=!0,this.busy=!1}toggle(){this.collapsed=!this.collapsed}async doAction(e,t){this.busy=!0;try{const i=await e();this.dispatchEvent(new CustomEvent("action-done",{detail:{success:i,label:t},bubbles:!0,composed:!0}))}finally{this.busy=!1}}render(){return c`
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
              @click=${()=>this.doAction(wc,"plan")}>
              Preplanovat (debug)
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction($c,"apply")}>
              Aplikovat rucne
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(_c,"cancel")}>
              Zrusit plan
            </button>
          </div>
        </div>
      </div>
    `}};qi.styles=M`
    :host { display: block; }

    .panel {
      ${xt};
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
      color: ${O(s.textPrimary)};
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
      color: ${O(s.textSecondary)};
    }

    .info-bubble .tooltip {
      display: none;
      position: absolute;
      left: 0;
      top: 24px;
      width: 280px;
      padding: 10px;
      background: ${O(s.cardBg)};
      border: 1px solid ${O(s.divider)};
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      font-size: 11px;
      line-height: 1.5;
      color: ${O(s.textSecondary)};
      z-index: 100;
      white-space: normal;
    }

    .info-bubble:hover .tooltip { display: block; }

    .toggle-icon {
      font-size: 18px;
      font-weight: bold;
      color: ${O(s.textSecondary)};
      transition: transform 0.2s;
    }

    .panel-content {
      display: none;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid ${O(s.divider)};
    }

    .panel-content.open { display: block; }

    .section-label {
      font-size: 12px;
      font-weight: 600;
      color: ${O(s.textSecondary)};
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
      border: 1px solid ${O(s.divider)};
      border-radius: 8px;
      background: ${O(s.bgSecondary)};
      color: ${O(s.textPrimary)};
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      white-space: nowrap;
    }

    .action-btn:hover { background: ${O(s.divider)}; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `;F([T()],qi.prototype,"collapsed",2);F([T()],qi.prototype,"busy",2);qi=F([E("oig-boiler-debug-panel")],qi);let Ln=class extends z{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return c`<div>Nacitani stavu...</div>`;const t=(i,n,r=1)=>i!=null?`${i.toFixed(r)} ${n}`:`-- ${n}`;return c`
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
        `:k}
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
    `}};Ln.styles=M`
    :host { display: block; }

    h3 { ${et}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .card {
      ${xt};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${O(s.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 18px;
      font-weight: 600;
      color: ${O(s.textPrimary)};
    }

    .card-value.small {
      font-size: 13px;
      font-weight: 500;
    }
  `;F([f({type:Object})],Ln.prototype,"data",2);Ln=F([E("oig-boiler-status-grid")],Ln);let An=class extends z{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return k;const t=i=>`${i.toFixed(2)} kWh`;return c`
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
    `}};An.styles=M`
    :host { display: block; }

    h3 { ${et}; }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .card {
      ${xt};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${O(s.textSecondary)};
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
      background: ${O(s.bgSecondary)};
    }

    .ratio-fve { background: #4CAF50; }
    .ratio-grid { background: #FF9800; }
    .ratio-alt { background: #2196F3; }

    .ratio-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 11px;
      color: ${O(s.textSecondary)};
    }
  `;F([f({type:Object})],An.prototype,"data",2);An=F([E("oig-boiler-energy-breakdown")],An);let Fn=class extends z{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return k;const t=e.peakHours.length?e.peakHours.map(r=>`${r}h`).join(", "):"--",i=e.waterLiters40c!==null?`${e.waterLiters40c.toFixed(0)} L`:"-- L",n=e.circulationNow.startsWith("ANO");return c`
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
    `}};Fn.styles=M`
    :host { display: block; }

    h3 { ${et}; }

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
      border-bottom: 1px solid ${O(s.divider)};
      font-size: 13px;
    }

    .item:last-child { border-bottom: none; }

    .label { color: ${O(s.textSecondary)}; }

    .value {
      font-weight: 600;
      color: ${O(s.textPrimary)};
    }

    .value.active { color: #4CAF50; }
    .value.idle { color: ${O(s.textSecondary)}; }
  `;F([f({type:Object})],Fn.prototype,"data",2);Fn=F([E("oig-boiler-predicted-usage")],Fn);let Yi=class extends z{constructor(){super(...arguments),this.plan=null,this.forecastWindows={fve:"--",grid:"--"}}render(){var n;const e=this.plan,t=this.forecastWindows,i=r=>r??"--";return c`
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
    `}};Yi.styles=M`
    :host { display: block; }

    h3 { ${et}; }

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
      border-bottom: 1px solid ${O(s.divider)};
      font-size: 13px;
    }

    .row:last-child { border-bottom: none; }

    .row-label { color: ${O(s.textSecondary)}; }
    .row-value {
      font-weight: 500;
      color: ${O(s.textPrimary)};
      text-align: right;
      max-width: 60%;
      word-break: break-word;
    }
  `;F([f({type:Object})],Yi.prototype,"plan",2);F([f({type:Object})],Yi.prototype,"forecastWindows",2);Yi=F([E("oig-boiler-plan-info")],Yi);let Ui=class extends z{constructor(){super(...arguments),this.boilerState=null,this.targetTemp=60}render(){const e=this.boilerState;if(!e)return c`<div>Nacitani...</div>`;const t=10,i=70,n=m=>Sh((m-t)/(i-t)*100),r=e.heatingPercent??0,a=e.tempTop!==null?n(e.tempTop):null,o=e.tempBottom!==null?n(e.tempBottom):null,l=n(this.targetTemp),d=Za(e.tempTop??this.targetTemp),p=Za(e.tempBottom??10),u=`linear-gradient(180deg, ${d} 0%, ${p} 100%)`,h=e.heatingPercent!==null?`${e.heatingPercent.toFixed(0)}% nahrato`:"-- % nahrato";return c`
      <h3>Vizualizace bojleru</h3>

      <div class="tank-wrapper">
        <div class="temp-scale">
          ${[70,60,50,40,30,20,10].map(m=>c`<span>${m}°C</span>`)}
        </div>

        <div class="tank">
          <div class="water" style="height:${r}%; background:${u}"></div>

          <div class="target-line" style="bottom:${l}%">
            <span class="target-label">Cil</span>
          </div>

          ${a!==null?c`
            <div class="sensor top" style="bottom:${a}%">
              <span class="sensor-label">${e.tempTop.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:k}

          ${o!==null?c`
            <div class="sensor bottom" style="bottom:${o}%">
              <span class="sensor-label">${e.tempBottom.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:k}
        </div>
      </div>

      <div class="grade-label">${h}</div>
    `}};Ui.styles=M`
    :host { display: block; }

    h3 { ${et}; }

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
      color: ${O(s.textSecondary)};
      text-align: right;
      padding: 2px 0;
    }

    /* Tank body */
    .tank {
      flex: 1;
      position: relative;
      border: 2px solid ${O(s.divider)};
      border-radius: 12px;
      overflow: hidden;
      background: ${O(s.bgSecondary)};
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
      border-top: 2px dashed ${O(s.accent)};
      z-index: 3;
    }

    .target-label {
      position: absolute;
      right: 4px;
      top: -14px;
      font-size: 9px;
      color: ${O(s.accent)};
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
      color: ${O(s.textPrimary)};
    }
  `;F([f({type:Object})],Ui.prototype,"boilerState",2);F([f({type:Number})],Ui.prototype,"targetTemp",2);Ui=F([E("oig-boiler-tank")],Ui);let Gi=class extends z{constructor(){super(...arguments),this.current="",this.available=[]}onChange(e){const t=e.target.value;this.dispatchEvent(new CustomEvent("category-change",{detail:{category:t},bubbles:!0,composed:!0}))}render(){const e=this.available.length?this.available:Object.keys(Lr);return c`
      <div class="row">
        <label>Profil:</label>
        <select @change=${this.onChange}>
          ${e.map(t=>c`
            <option value=${t} ?selected=${t===this.current}>
              ${Lr[t]||t}
            </option>
          `)}
        </select>
      </div>
    `}};Gi.styles=M`
    :host { display: block; margin: 12px 0; }

    .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    label {
      font-size: 13px;
      font-weight: 600;
      color: ${O(s.textPrimary)};
    }

    select {
      padding: 6px 10px;
      font-size: 13px;
      border: 1px solid ${O(s.divider)};
      border-radius: 6px;
      background: ${O(s.cardBg)};
      color: ${O(s.textPrimary)};
      cursor: pointer;
    }
  `;F([f({type:String})],Gi.prototype,"current",2);F([f({type:Array})],Gi.prototype,"available",2);Gi=F([E("oig-boiler-category-select")],Gi);let In=class extends z{constructor(){super(...arguments),this.data=[]}render(){if(!this.data.length)return k;const e=this.data.flatMap(o=>o.hours),t=Math.max(...e,.1),i=t*.3,n=t*.7,r=Array.from({length:24},(o,l)=>l),a=o=>o===0?"none":o<i?"low":o<n?"medium":"high";return c`
      <h3>Mapa spotreby (7 dni)</h3>
      <div class="wrapper">
        <div class="grid">
          <!-- Header row -->
          <div></div>
          ${r.map(o=>c`<div class="hour-header">${o}</div>`)}

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
    `}};In.styles=M`
    :host { display: block; }

    h3 { ${et}; }

    .wrapper {
      ${xt};
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
      color: ${O(s.textSecondary)};
      text-align: center;
      padding: 2px 0;
    }

    .day-label {
      font-size: 10px;
      font-weight: 600;
      color: ${O(s.textSecondary)};
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

    .cell.none   { background: ${O(s.bgSecondary)}; }
    .cell.low    { background: #c8e6c9; }
    .cell.medium { background: #ff9800; }
    .cell.high   { background: #f44336; }

    .legend {
      display: flex;
      gap: 14px;
      margin-top: 10px;
      font-size: 11px;
      color: ${O(s.textSecondary)};
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
  `;F([f({type:Array})],In.prototype,"data",2);In=F([E("oig-boiler-heatmap-grid")],In);let Bn=class extends z{constructor(){super(...arguments),this.plan=null}render(){const e=this.plan,t=(i,n=2)=>i!=null?i.toFixed(n):"-";return c`
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
    `}};Bn.styles=M`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .card {
      ${xt};
      padding: 14px;
    }

    .card-title {
      font-size: 12px;
      color: ${O(s.textSecondary)};
      margin-bottom: 6px;
    }

    .card-value {
      font-size: 22px;
      font-weight: 700;
    }

    .total { color: ${O(s.textPrimary)}; }
    .fve { color: #4CAF50; }
    .grid-c { color: #FF9800; }
    .cost { color: #2196F3; }
  `;F([f({type:Object})],Bn.prototype,"plan",2);Bn=F([E("oig-boiler-stats-cards")],Bn);let Nn=class extends z{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return k;const t=Math.max(...e.hourlyAvg,.01),i=new Set(e.peakHours),n=e.peakHours.length?e.peakHours.map(a=>`${a}h`).join(", "):"--",r=e.confidence!==null?`${Math.round(e.confidence*100)} %`:"-- %";return c`
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
    `}};Nn.styles=M`
    :host { display: block; }

    h3 { ${et}; }

    .wrapper {
      ${xt};
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
      color: ${O(s.textSecondary)};
      margin-top: 3px;
    }

    /* Stats row */
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid ${O(s.divider)};
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .stat-label { color: ${O(s.textSecondary)}; }
    .stat-value { font-weight: 600; color: ${O(s.textPrimary)}; }
  `;F([f({type:Object})],Nn.prototype,"data",2);Nn=F([E("oig-boiler-profiling")],Nn);let Rn=class extends z{constructor(){super(...arguments),this.config=null}render(){const e=this.config;if(!e)return k;const t=(i,n="")=>i!=null?`${i}${n?" "+n:""}`:`--${n?" "+n:""}`;return c`
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
    `}};Rn.styles=M`
    :host { display: block; }

    h3 { ${et}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .card {
      ${xt};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${O(s.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 600;
      color: ${O(s.textPrimary)};
    }
  `;F([f({type:Object})],Rn.prototype,"config",2);Rn=F([E("oig-boiler-config-section")],Rn);function Qa(e,t){const i=e*t,n=Math.floor(i/60)%24,r=i%60;return`${String(n).padStart(2,"0")}:${String(r).padStart(2,"0")}`}function Ch(e){switch(e){case"morning":return"🌅";case"afternoon":return"☀️";case"evening":return"🌆";case"night":return"🌙";default:return"💧"}}let Zi=class extends z{constructor(){super(...arguments),this.data=null,this.lang="cs"}render(){const e=this.lang,t=w("boiler.demand_map.heading",e);if(!this.data)return c`
        <div class="card" data-testid="boiler-demand-map">
          <div class="heading">💧 ${t}</div>
          <div class="empty-state">${w("boiler.demand_map.empty",e)}</div>
        </div>
      `;const i=this.data,n=i.slotDurationMin||15,r=48,a=Math.ceil(i.slotsP80.length/r),o=[];for(let h=0;h<r;h++){let g=0,m=0;for(let b=0;b<a;b++){const y=h*a+b;g+=i.slotsP80[y]??0,m+=i.slotsP50[y]??0}o.push(g)}const l=Math.max(...o,.001),d=60,p={0:"00",12:"06",24:"12",36:"18"},u=h=>{const g=h/l;return g<.15?"rgba(255,255,255,0.06)":g<.4?"rgba(33,150,243,0.25)":g<.7?"rgba(33,150,243,0.55)":"rgba(33,150,243,0.90)"};return c`
      <div class="card" data-testid="boiler-demand-map">
        <div class="heading">💧 ${t}</div>

        <div class="heatmap-wrap">
          <div class="heatmap">
            ${o.map((h,g)=>{const m=Math.max(2,Math.round(h/l*d)),b=Qa(g*a,n),y=h.toFixed(2);return c`
                <div class="heatmap-col" title="${b}: ${y} kWh">
                  <div class="heatmap-bar"
                       style="height:${m}px; background:${u(h)};">
                  </div>
                </div>
              `})}
          </div>

          <div class="hour-axis">
            ${Array.from({length:r},(h,g)=>{const m=p[g];return m!==void 0?c`<span class="hour-label">${m}</span>`:c`<span class="hour-label hidden"></span>`})}
          </div>
        </div>

        ${i.windows.length>0?c`
          <div class="chips">
            ${i.windows.slice(0,3).map(h=>{const g=Qa(h.slotIndex,n),m=Ch(h.label),b=Math.round(h.liters),y=h.p80Kwh.toFixed(1);return c`
                <span class="chip">
                  ${m}
                  <span class="chip-time">${g}</span>
                  &ge; ${b} L (${y} kWh)
                </span>
              `})}
          </div>
        `:k}

        <div class="meta">
          <span>
            ${w("boiler.demand_map.meta",e).replace("{n}",String(i.profile.daysUsed)).replace("{cat}",Lr[i.profile.category]||i.profile.label)}
          </span>
          <span class="confidence-badge ${i.confidence<.5?"low":""}">
            ${w("boiler.demand_map.confidence",e)} ${Math.round(i.confidence*100)}&nbsp;%
          </span>
          ${i.profile.fallbackUsed?c`
            <span class="fallback-notice">${w("boiler.demand_map.fallback_notice",e)}</span>
          `:k}
        </div>
      </div>
    `}};Zi.styles=M`
    :host { display: block; }

    .card {
      ${xt};
      padding: 16px;
    }

    .heading {
      ${et};
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Empty / collecting state */
    .empty-state {
      text-align: center;
      padding: 24px 0;
      color: ${O(s.textSecondary)};
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
      color: ${O(s.textSecondary)};
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
      color: ${O(s.textPrimary)};
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }

    .chip-time {
      font-weight: 700;
      color: ${O(s.accent)};
    }

    /* Meta line */
    .meta {
      font-size: 11px;
      color: ${O(s.textSecondary)};
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
  `;F([f({attribute:!1})],Zi.prototype,"data",2);F([f({type:String})],Zi.prototype,"lang",2);Zi=F([E("oig-boiler-demand-map")],Zi);let jn=class extends z{constructor(){super(...arguments),this.state=null}render(){return this.state?c`
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
    `:c`<div>Nacitani...</div>`}};jn.styles=M`
    :host {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: ${O(s.cardBg)};
      border-radius: 12px;
      box-shadow: ${O(s.cardShadow)};
    }

    .temp-display { text-align: center; }

    .current-temp {
      font-size: 36px;
      font-weight: 600;
      color: ${O(s.textPrimary)};
    }

    .target-temp {
      font-size: 14px;
      color: ${O(s.textSecondary)};
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
      color: ${O(s.textSecondary)};
    }
  `;F([f({type:Object})],jn.prototype,"state",2);jn=F([E("oig-boiler-state")],jn);let Hn=class extends z{constructor(){super(...arguments),this.data=[]}render(){return k}};Hn.styles=M`
    :host { display: block; }
  `;F([f({type:Array})],Hn.prototype,"data",2);Hn=F([E("oig-boiler-heatmap")],Hn);let Qi=class extends z{constructor(){super(...arguments),this.profiles=[],this.editMode=!1}render(){return k}};Qi.styles=M`
    :host { display: block; }
  `;F([f({type:Array})],Qi.prototype,"profiles",2);F([f({type:Boolean})],Qi.prototype,"editMode",2);Qi=F([E("oig-boiler-profiles")],Qi);let Xi=class extends z{constructor(){super(...arguments),this.data=null,this.lang="cs"}render(){const e=this.data,t=this.lang,i=(e==null?void 0:e.currentState)??"unknown",n=w(`boiler.status.${i}`,t),r=(e==null?void 0:e.comfortSatisfied)===!0?w("boiler.status.comfort_satisfied",t):(e==null?void 0:e.comfortSatisfied)===!1?w("boiler.status.comfort_unsatisfied",t):w("boiler.status.comfort_unknown",t),a=(e==null?void 0:e.comfortSatisfied)===!0?"ok":(e==null?void 0:e.comfortSatisfied)===!1?"bad":"unknown",o=(e==null?void 0:e.degradedFlags)??[];return c`
      <div data-testid="boiler-status-panel" class="panel">
        <div class="row">
          <div class="heading">${w("boiler.status.heading",t)}</div>
          <span data-testid="boiler-status-current-state" class="pill ${i}">${n}</span>
        </div>
        <div class="degraded-banner" ?hidden=${!(e!=null&&e.degraded)}>${w("boiler.status.degraded",t)}</div>
        <div class="grid">
          <div class="field"><label>${w("boiler.status.temp_top",t)}</label><span>${Ie((e==null?void 0:e.temperatureTop)??null)}</span></div>
          <div class="field"><label>${w("boiler.status.temp_bottom",t)}</label><span>${Ie((e==null?void 0:e.temperatureBottom)??null)}</span></div>
          <div class="field"><label>${w("boiler.status.selected_source",t)}</label><span data-testid="boiler-status-selected-source">${Ze((e==null?void 0:e.selectedSource)??null,t)}</span></div>
          <div class="field"><label>${w("boiler.status.actuated_source",t)}</label><span data-testid="boiler-status-actuated-source">${Ze((e==null?void 0:e.actuatedSource)??null,t)}</span></div>
          <div class="field"><label>${w("boiler.status.energy_needed",t)}</label><span>${ei((e==null?void 0:e.energyNeededKwh)??null)}</span></div>
          <div class="field"><label>${w("boiler.status.last_update",t)}</label><span>${(e==null?void 0:e.lastUpdate)??"—"}</span></div>
        </div>
        <div data-testid="boiler-status-comfort" class="comfort ${a}">${r}</div>
        ${o.length?c`<div data-testid="boiler-status-degraded-flags" class="degraded-list">${o.map(l=>c`<span class="degraded-tag">${Cn(l,t)}</span>`)}</div>`:""}
      </div>
    `}};Xi.styles=M`
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
  `;F([f({attribute:!1})],Xi.prototype,"data",2);F([f({type:String})],Xi.prototype,"lang",2);Xi=F([E("oig-boiler-status-panel")],Xi);let Ji=class extends z{constructor(){super(...arguments),this.slots=[],this.lang="cs"}srcClass(e){return e&&["fve","grid","alternative","overflow","discharge"].includes(e)?e:"other"}render(){const e=this.lang;return!this.slots||this.slots.length===0?c`<div data-testid="boiler-plan-timeline" class="wrap"><div class="heading">${w("boiler.timeline.heading",e)}</div><div class="empty">${w("boiler.timeline.empty",e)}</div></div>`:c`
      <div data-testid="boiler-plan-timeline" class="wrap">
        <div class="heading">${w("boiler.timeline.heading",e)}</div>
        <table>
          <thead>
            <tr>
              <th>${w("boiler.timeline.col_time",e)}</th>
              <th>${w("boiler.timeline.col_source",e)}</th>
              <th>${w("boiler.timeline.col_temp",e)}</th>
              <th>${w("boiler.timeline.col_kwh",e)}</th>
              <th>${w("boiler.timeline.col_cost",e)}</th>
              <th>${w("boiler.timeline.col_pv",e)}</th>
            </tr>
          </thead>
          <tbody>
            ${this.slots.map(t=>{const i=t.comfortSatisfied===!0?c`<span class="badge ok">${w("boiler.timeline.comfort_ok",e)}</span>`:t.comfortSatisfied===!1?c`<span class="badge bad">${w("boiler.timeline.comfort_gap",e)}</span>`:"";return c`
                <tr>
                  <td>${yh(t.start,t.end)}</td>
                  <td><span class="src ${this.srcClass(t.recommendedSource)}">${Ze(t.recommendedSource,e)}</span></td>
                  <td>${Ie(t.expectedTempTopC??null)} ${i}</td>
                  <td>${ei(t.consumptionKwh)}</td>
                  <td>${Hr(t.estimatedCostCzk??null)}</td>
                  <td>${bh(t.pvShare??null)}</td>
                </tr>
              `})}
          </tbody>
        </table>
      </div>
    `}};Ji.styles=M`
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
  `;F([f({attribute:!1})],Ji.prototype,"slots",2);F([f({type:String})],Ji.prototype,"lang",2);Ji=F([E("oig-boiler-plan-timeline")],Ji);const Xa=new Set(["input_stale_price","input_stale_pv","input_stale_temperature","input_missing_recorder","input_adapter_error"]);let en=class extends z{constructor(){super(...arguments),this.explanation=null,this.lang="cs"}render(){const e=this.explanation,t=this.lang;if(!e)return c`<div data-testid="boiler-source-explanation" class="wrap"><div class="heading">${w("boiler.explanation.heading",t)}</div><div class="empty">${w("boiler.explanation.empty",t)}</div></div>`;const i=e.reasonCodes??[],n=i.filter(o=>Xa.has(o)),r=i.filter(o=>!Xa.has(o)),a=e.degradedReasons??[];return c`
      <div data-testid="boiler-source-explanation" class="wrap">
        <div class="heading">${w("boiler.explanation.heading",t)}</div>

        <div class="section" data-testid="boiler-explanation-freshness">
          <h4>${w("boiler.explanation.freshness_heading",t)}</h4>
          ${n.length===0?c`<div class="chips"><span class="chip fresh">${w("boiler.explanation.freshness_fresh",t)}</span></div>`:c`<div class="chips">${n.map(o=>c`<span class="chip stale">${Cn(o,t)}</span>`)}</div>`}
        </div>

        <div class="section" data-testid="boiler-explanation-degraded">
          <h4>${w("boiler.explanation.degraded_heading",t)}</h4>
          ${a.length===0?c`<div class="empty">—</div>`:c`<div class="chips">${a.map(o=>c`<span class="chip degraded">${Cn(o,t)}</span>`)}</div>`}
        </div>

        ${r.length?c`<div class="section" data-testid="boiler-explanation-reasons"><h4>Reason codes</h4><div class="chips">${r.map(o=>c`<span class="chip">${Cn(o,t)}</span>`)}</div></div>`:""}

        <div class="meta-grid" data-testid="boiler-explanation-meta">
          ${e.planCreatedAt?c`<div class="meta"><label>${w("boiler.explanation.plan_created",t)}</label><span>${e.planCreatedAt}</span></div>`:""}
          ${e.planValidUntil?c`<div class="meta"><label>${w("boiler.explanation.plan_valid_until",t)}</label><span>${e.planValidUntil}</span></div>`:""}
          ${e.dataAgeSecs!=null?c`<div class="meta"><label>${w("boiler.explanation.data_age",t)}</label><span>${vh(e.dataAgeSecs)}</span></div>`:""}
          ${e.unsatisfiedComfortGapC!=null?c`<div class="meta"><label>${w("boiler.explanation.unsatisfied_gap",t)}</label><span>${e.unsatisfiedComfortGapC} °C</span></div>`:""}
          ${e.temperatureAtDeadlineC!=null?c`<div class="meta"><label>${w("boiler.explanation.temp_at_deadline",t)}</label><span>${Ie(e.temperatureAtDeadlineC)}</span></div>`:""}
        </div>
      </div>
    `}};en.styles=M`
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
  `;F([f({attribute:!1})],en.prototype,"explanation",2);F([f({type:String})],en.prototype,"lang",2);en=F([E("oig-boiler-source-explanation")],en);let ci=class extends z{constructor(){super(...arguments),this.identity={entryId:null,boxId:null,available:!1},this.currentOverride=null,this.lang="cs"}render(){var a,o;const e=this.lang,t=this.identity.available,i=((a=this.currentOverride)==null?void 0:a.capabilityAvailable)??!1,n=t&&i,r=((o=this.currentOverride)==null?void 0:o.active)===!0;return c`
      <div data-testid="boiler-override-panel" class="wrap">
        <div class="heading">${w("boiler.override.heading",e)}</div>
        <div class="subtitle">${w("boiler.override.subtitle",e)}</div>
        ${r?c`<span class="active-badge">${w("boiler.override.active",e)}</span>`:""}
        <div class="notice" ?hidden=${t}>${w("boiler.override.identity_unavailable",e)}</div>
        <div class="notice capability-notice" ?hidden=${!t||i}>${w("boiler.override.capability_unavailable",e)}</div>
        <label>
          ${w("boiler.override.ttl_label",e)}
          <input data-testid="override-ttl-input" type="number" min="15" max="1440" step="15" value="120" ?disabled=${!n} />
        </label>
        <label>
          ${w("boiler.override.reason_label",e)}
          <textarea data-testid="override-reason-input" required ?disabled=${!n}></textarea>
        </label>
        <button data-testid="override-submit-btn" ?disabled=${!n}>${w("boiler.override.submit",e)}</button>
      </div>
    `}};ci.styles=M`
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
  `;F([f({attribute:!1})],ci.prototype,"identity",2);F([f({attribute:!1})],ci.prototype,"currentOverride",2);F([f({type:String})],ci.prototype,"lang",2);ci=F([E("oig-boiler-override-panel")],ci);let di=class extends z{constructor(){super(...arguments),this.reason="unavailable",this.message="",this.lang="cs"}render(){const e=this.lang,t=this.reason==="loading"?"⏳":this.reason==="error"?"⚠️":this.reason==="degraded"?"🟠":"ℹ️";return c`
      <div data-testid="boiler-unavailable-state" class="wrap">
        <span class="icon">${t}</span>
        <div class="headline loading-notice" ?hidden=${this.reason!=="loading"}>${w("boiler.unavailable.loading",e)}</div>
        <div class="headline error-notice" ?hidden=${this.reason!=="error"}>${w("boiler.unavailable.error",e)}</div>
        <div class="headline degraded-notice" ?hidden=${this.reason!=="degraded"}>${w("boiler.unavailable.degraded",e)}</div>
        <div class="headline unavailable-notice" ?hidden=${this.reason!=="unavailable"}>${w("boiler.unavailable.unavailable",e)}</div>
        ${this.message?c`<div class="message">${this.message}</div>`:""}
      </div>
    `}};di.styles=M`
    :host { display: block; }
    .wrap { padding: 24px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; }
    .icon { font-size: 1.6rem; }
    .headline { font-size: 1rem; font-weight: 600; }
    .message { color: var(--secondary-text-color, #666); font-size: 0.9rem; }
  `;F([f({type:String})],di.prototype,"reason",2);F([f({type:String})],di.prototype,"message",2);F([f({type:String})],di.prototype,"lang",2);di=F([E("oig-boiler-unavailable-state")],di);var Ph=Object.defineProperty,Th=Object.getOwnPropertyDescriptor,Wt=(e,t,i,n)=>{for(var r=n>1?void 0:n?Th(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Ph(t,i,r),r};const Yt=Z,Mh=new Set(["fve","grid","battery","alternative"]);function Dh(e){if(!e)return null;const t=e.toLowerCase();return t==="fve"||t==="overflow"||t==="pv"?"fve":t==="grid"?"grid":t==="battery"||t==="discharge"?"battery":t==="alternative"||t==="alt"?"alternative":null}function er(e){const t=new Date(e);return new Date(t.getFullYear(),t.getMonth(),t.getDate(),0,0,0,0).getTime()}function zt(e,t){const i=er(t),n=new Date(e).getTime(),r=24*3600*1e3;return Math.max(0,Math.min(1,(n-i)/r))}function zh(e,t){const i=[];let n=null;for(const r of e){const a=r.heatingKwh??0;if(a<=0){n&&(i.push(n),n=null);continue}const o=Dh(r.recommendedSource);if(!o||!Mh.has(o)){n&&(i.push(n),n=null);continue}const l=r.purpose==="legionella";n&&n.source===o?(n.xEnd=zt(r.end,t),n.endIso=r.end,n.heatingKwh+=a,l&&(n.hasLegionella=!0)):(n&&i.push(n),n={xStart:zt(r.start,t),xEnd:zt(r.end,t),source:o,hasLegionella:l,heatingKwh:a,startIso:r.start,endIso:r.end})}return n&&i.push(n),i}function Eh(e,t){const i=Date.now(),n=er(e),r=24*3600*1e3,a=(i-n)/r;return a<0||a>1?null:a}function Oh(e,t){if(!t||!t.includes(":"))return null;const[i,n]=t.split(":").map(Number);if(!Number.isFinite(i)||!Number.isFinite(n))return null;const r=er(e),a=new Date(r);a.setHours(i,n,0,0);let o=a.getTime();const l=24*3600*1e3,d=(o-r)/l;return d<0||d>1.0001?null:Math.min(1,d)}const wr={fve:{gradStart:"#ffd54f",gradEnd:"#ffa726",legendColor:"#ffa726",textColor:"#101a10"},grid:{gradStart:"#4fc3f7",gradEnd:"#2196f3",legendColor:"#2196f3",textColor:"#062033"},battery:{gradStart:"#b39ddb",gradEnd:"#7e57c2",legendColor:"#7e57c2",textColor:"#1c1430"},alternative:{gradStart:"#ff8a65",gradEnd:"#e64a19",legendColor:"#e64a19",textColor:"#2b0d05"}};let Je=class extends z{constructor(){super(...arguments),this.slots=[],this.demandMap=null,this.circulationRuns=[],this.legionella=null,this.planSummary=null,this.lang="cs"}render(){var b;const e=this.lang;if(!this.slots||this.slots.length===0)return c`
        <div class="card" data-testid="boiler-plan-strip">
          <div class="heading">
            🗓️ ${w("boiler.plan_strip.heading",e)}
            <span class="meta">${w("boiler.plan_strip.meta",e)}</span>
          </div>
          <div class="empty">${w("boiler.plan_strip.empty",e)}</div>
        </div>
      `;const t=this.slots[0].start,i=zh(this.slots,t),n=this._buildDrawItems(t),r=this._buildTempCurve(t),a=Eh(t),o=((b=this.planSummary)==null?void 0:b.deadlineTime)??null,l=o?o.slice(0,5):null,d=l?Oh(t,o):null,p=this._legionellaStandaloneMarker(t,i),u=new Set(i.map(y=>y.source)),h=n.length>0,g=this.circulationRuns.length>0,m=r.length>1;return c`
      <div class="card" data-testid="boiler-plan-strip">
        <div class="heading">
          🗓️ ${w("boiler.plan_strip.heading",e)}
          <span class="meta">${w("boiler.plan_strip.meta",e)}</span>
        </div>

        <div class="tl" data-testid="plan-strip-tl">
          <!-- Temperature SVG curve -->
          ${m?this._renderTempSvg(r,e):k}

          <!-- Axis line -->
          <div class="axis"></div>

          <!-- Source bands -->
          ${i.map(y=>this._renderBand(y,e))}

          <!-- Demand draws (below axis) -->
          ${n.map(y=>this._renderDraw(y))}

          <!-- Circulation ticks -->
          ${this.circulationRuns.map(y=>this._renderCircTick(y,t,e))}

          <!-- Legionella standalone marker -->
          ${p!==null?c`
            <div class="leg-marker" style="left:${(p*100).toFixed(2)}%" title="🦠 Legionella">🦠</div>
          `:k}

          <!-- NOW line -->
          ${a!==null?c`
            <div class="nowl"
              style="left:${(a*100).toFixed(2)}%"
              data-label="${w("boiler.plan_strip.now_label",e)}"
              data-testid="plan-strip-now-line">
            </div>
          `:k}

          <!-- Deadline line -->
          ${d!==null?c`
            <div class="dline"
              style="left:${(d*100).toFixed(2)}%"
              data-label="${w("boiler.plan_strip.deadline_label",e)} ${l}"
              data-testid="plan-strip-deadline-line">
            </div>
          `:k}
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
              <i class="dot" style="background:${wr[y].legendColor}"></i>
              ${this._sourceLegendLabel(y,e)}
            </span>
          `)}
          ${h?c`
            <span>
              <i class="dot" style="background:#e53935"></i>
              ${w("boiler.plan_strip.legend_demands",e)}
            </span>
          `:k}
          ${g?c`
            <span>${w("boiler.plan_strip.legend_circ",e)}</span>
          `:k}
        </div>
      </div>
    `}_renderBand(e,t){const i=wr[e.source]??wr.fve,n=(e.xStart*100).toFixed(2),r=((e.xEnd-e.xStart)*100).toFixed(2),o=(e.xEnd-e.xStart)*100>=6,l=e.hasLegionella?w("boiler.plan_strip.source_legionella",t):this._sourceBandLabel(e.source,t),d=`${l} · ${e.heatingKwh.toFixed(2)} kWh`,p=`plan-band-${e.source}${e.hasLegionella?"-legionella":""}`;return c`
      <div class="band ${e.hasLegionella?"legionella-border":""}"
        style="left:${n}%;width:${r}%;background:linear-gradient(180deg,${i.gradStart},${i.gradEnd});color:${i.textColor}"
        title="${d}"
        data-source="${e.source}"
        data-legionella="${e.hasLegionella}"
        data-testid="${p}">
        ${o?l:k}
      </div>
    `}_renderDraw(e){const t=(e.frac*100).toFixed(2),n=Math.max(2,Math.round(e.heightPct*29));return c`
      <div class="draw"
        style="left:${t}%;width:${.9}%;height:${n}px"
        title="${e.kwh.toFixed(2)} kWh">
      </div>
    `}_renderCircTick(e,t,i){const n=zt(e.start,t);if(n<0||n>1)return k;const r=(n*100).toFixed(2),o=(zt(e.end,t)*100).toFixed(2),l=`${w("boiler.plan_strip.circ_tooltip",i)} ${Ja(e.start)}–${Ja(e.end)}`;return c`
      <div class="circ"
        style="left:${r}%"
        title="${l}"
        data-testid="plan-strip-circ"
        data-end-frac="${o}">
        💧
      </div>
    `}_renderTempSvg(e,t){if(e.length<2)return k;const i=960,n=84,r=Math.min(...e.map(u=>u.temp)),o=Math.max(...e.map(u=>u.temp))-r||1,l=u=>u*i,d=u=>n-(u-r)/o*(n-16)-8,p=e.map((u,h)=>`${h===0?"M":"L"}${l(u.frac).toFixed(1)},${d(u.temp).toFixed(1)}`).join(" ");return c`
      <svg class="temp-svg" viewBox="0 0 ${i} ${n}" preserveAspectRatio="none"
        data-testid="plan-strip-temp-svg"
        aria-hidden="true">
        <path d="${p}" fill="none" stroke="#ffca5a" stroke-width="2.5" opacity="0.9"/>
        <text x="6" y="12" fill="#ffca5a" font-size="10" font-family="system-ui,sans-serif">
          ${w("boiler.plan_strip.temp_zone_label",t)}
        </text>
      </svg>
    `}_buildDrawItems(e){const t=this.demandMap;if(!t)return[];const i=t.slotsP80;if(!i||i.length===0)return[];const n=Math.max(...i,.001),r=t.slotDurationMin||15,a=er(e);return i.map((o,l)=>{if(o<.05)return null;const p=(a+l*r*60*1e3-a)/(24*3600*1e3);return p<0||p>=1?null:{frac:p,heightPct:o/n,kwh:o}}).filter(o=>o!==null)}_buildTempCurve(e){const t=[];for(const i of this.slots){const n=i.expectedTempTopC??null;if(n==null||!Number.isFinite(n))continue;const r=zt(i.start,e);t.push({frac:r,temp:n})}return t}_legionellaStandaloneMarker(e,t){const i=this.legionella;if(!(i!=null&&i.scheduledStart))return null;const n=zt(i.scheduledStart,e);return n<0||n>1||t.some(a=>a.hasLegionella&&n>=a.xStart&&n<=a.xEnd)?null:n}_sourceBandLabel(e,t){switch(e){case"fve":return w("boiler.plan_strip.source_overflow",t);case"grid":return w("boiler.plan_strip.source_grid",t);case"battery":return w("boiler.plan_strip.source_battery",t);case"alternative":return w("boiler.plan_strip.source_alt",t);default:return e}}_sourceLegendLabel(e,t){switch(e){case"fve":return w("boiler.plan_strip.legend_overflow",t);case"grid":return w("boiler.plan_strip.legend_grid",t);case"battery":return w("boiler.plan_strip.legend_battery",t);case"alternative":return w("boiler.plan_strip.legend_alt",t);default:return e}}};Je.styles=M`
    :host { display: block; }

    .card {
      background: ${Yt(s.cardBg)};
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: ${Yt(s.cardShadow)};
    }

    .heading {
      font-size: 13px;
      font-weight: 600;
      color: ${Yt(s.textPrimary)};
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
      color: ${Yt(s.textSecondary)};
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
      color: ${Yt(s.textPrimary)};
    }

    /* Legend row */
    .leg {
      display: flex;
      gap: 12px;
      font-size: 10px;
      opacity: 0.85;
      margin-top: 8px;
      flex-wrap: wrap;
      color: ${Yt(s.textPrimary)};
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
  `;Wt([f({attribute:!1})],Je.prototype,"slots",2);Wt([f({attribute:!1})],Je.prototype,"demandMap",2);Wt([f({attribute:!1})],Je.prototype,"circulationRuns",2);Wt([f({attribute:!1})],Je.prototype,"legionella",2);Wt([f({attribute:!1})],Je.prototype,"planSummary",2);Wt([f({type:String})],Je.prototype,"lang",2);Je=Wt([E("oig-boiler-plan-strip")],Je);function Ja(e){const t=new Date(e);return isNaN(t.getTime())?e:`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`}var Lh=Object.defineProperty,Ah=Object.getOwnPropertyDescriptor,hn=(e,t,i,n)=>{for(var r=n>1?void 0:n?Ah(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Lh(t,i,r),r};const Fh=Z;function Ih(e,t){const i={gas:{cs:"🔥 Plynový kotel",en:"🔥 Gas boiler"},heat_pump:{cs:"🔥 Tepelné čerpadlo",en:"🔥 Heat pump"},electric:{cs:"🔥 Přímotop",en:"🔥 Electric heater"}};return e&&i[e]?i[e][t]:t==="en"?"🔥 Alternative source":"🔥 Alternativní zdroj"}function Bh(e,t,i){const n=[];return n.push({key:"fve",label:w("boiler.energy_today.source_fve",t),kwh:e.fveKwh,color:"#ffa726",costLabel:e.fveKwh>0?"≈ 0 Kč":null}),n.push({key:"grid",label:w("boiler.energy_today.source_grid",t),kwh:e.gridKwh,color:"#2196f3",costLabel:null}),e.batteryKwh>.05&&n.push({key:"battery",label:w("boiler.energy_today.source_battery",t),kwh:e.batteryKwh,color:"#7e57c2",costLabel:null}),e.altKwh>0&&n.push({key:"alt",label:Ih(i,t),kwh:e.altKwh,color:"#e64a19",costLabel:null}),n}function Nh(e,t){if(!e)return null;const{estimatedCostCzk:i,costIfAllGrid:n}=e;if(i==null||n==null||n<=0)return null;const r=n-i;return r<0?null:`${w("boiler.energy_today.benchmark_savings",t)} ${r.toFixed(1)} Kč`}function Rh(e){return`${e.toFixed(1).replace(".",",")} kWh`}let At=class extends z{constructor(){super(...arguments),this.energy=null,this.planSummary=null,this.lang="cs",this.altType=null}render(){const e=this.lang,t=w("boiler.energy_today.heading",e),i=w("boiler.energy_today.meta",e),n=this.energy,r=this.planSummary,a=n?Bh(n,e,this.altType):[],o=(n==null?void 0:n.totalKwh)??0,l=o<.1,d=l?[]:a.filter(g=>g.kwh>0).map(g=>({pct:g.kwh/o*100,color:g.color,key:g.key})),p=(r==null?void 0:r.costIfAllGrid)??null,u=p!=null&&p>0?p:null,h=Nh(r,e);return c`
      <div class="card">
        <h2 class="card-header">
          ${t}
          <span class="card-header-meta">${i}</span>
        </h2>

        ${l?c`
          <div class="empty">${w("boiler.energy_today.empty",e)}</div>
        `:c`
          <div class="tiles" data-testid="energy-tiles">
            ${a.map(g=>c`
              <div class="tile" data-source="${g.key}" data-testid="energy-tile-${g.key}">
                <span class="tile-label">${g.label}</span>
                <b class="tile-kwh">${Rh(g.kwh)}</b>
                ${g.costLabel?c`<span class="tile-czk" style="color:#9fe6a8">${g.costLabel}</span>`:k}
              </div>
            `)}
          </div>
        `}

        ${d.length>0?c`
          <div class="prop-bar" data-testid="prop-bar">
            ${d.map(g=>c`
              <span
                style="width:${g.pct.toFixed(1)}%;background:${g.color}"
                data-source="${g.key}"
              ></span>
            `)}
          </div>
        `:k}

        ${u!=null||h?c`
          <div class="benchmark" data-testid="benchmark">
            ${u!=null?c`
              <span class="benchmark-text">
                ${w("boiler.energy_today.benchmark_prefix",e)} ${u.toFixed(1)} Kč
                ${h?c`<strong> ${h}</strong>`:k}
              </span>
            `:k}
          </div>
        `:k}
      </div>
    `}};At.styles=M`
    :host {
      display: block;
    }

    .card {
      background: ${Fh(s.cardBg)};
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
  `;hn([f({type:Object})],At.prototype,"energy",2);hn([f({type:Object})],At.prototype,"planSummary",2);hn([f({type:String})],At.prototype,"lang",2);hn([f({type:String})],At.prototype,"altType",2);At=hn([E("oig-boiler-energy-today")],At);var jh=Object.defineProperty,Hh=Object.getOwnPropertyDescriptor,Ae=(e,t,i,n)=>{for(var r=n>1?void 0:n?Hh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&jh(t,i,r),r};const kt=Z,eo=320,to=440,Vh=75,$r=35,Wh=170,_r=370,io=30,Ue=86,ke=46,ct=148,Ge=348,Ut=22,Ri=ke+Ge,Re=Ue+ct/2,Vr="#9E9E9E";function Kh(e){return e?Ur[e]??Vr:Vr}function no(e){return isFinite(e)?Math.max(0,Math.min(1,e)):0}function qh(e,t){const i=no(e??0);if(i<=0)return[];const n=t.filter(o=>o.key!=="discharge"&&o.fillPct>0);if(n.length===0){const o=Math.round(i*Ge),l=Ri-o,d=Math.max(ke,l),p=Ri-d;return[{key:null,color:Vr,x:Ue,y:d,width:ct,height:p,active:!1}]}const r=[];let a=Ri;for(const o of n){const l=Math.round(no(o.fillPct)*Ge);if(l<=0)continue;const d=a-l,p=Math.max(ke,d),u=a-p;if(u<=0||(r.push({key:o.key,color:Kh(o.key),x:Ue,y:p,width:ct,height:u,active:o.active}),a=p,a<=ke))break}return r}function Yh(e,t,i,n,r){const a=[w("boiler.aria.svg_summary",r)];a.push(`${w("boiler.status.temp_top",r)}: ${Ie(e)}`),a.push(`${w("boiler.status.temp_bottom",r)}: ${Ie(t)}`);const o=i?Ze(i,r):w("boiler.aria.source_unknown",r);return a.push(o),n&&a.push(w("boiler.aria.stale",r)),a.join(". ")}let Pe=class extends z{constructor(){super(...arguments),this.fillLevelPct=null,this.sourceSegments=[],this.topTempC=null,this.bottomTempC=null,this.lowerZoneTempC=null,this.volumeL=null,this.etaText=null,this.sourceKey=null,this.stale=!1,this.chargingLabel=null,this.lang="cs"}render(){try{return this._renderSvg()}catch{return c`<svg viewBox="0 0 ${eo} ${to}" role="img" aria-label="${w("boiler.aria.svg_summary",this.lang)}" data-testid="boiler-svg"></svg>`}}_renderSvg(){const e=qh(this.fillLevelPct,this.sourceSegments),t=Yh(this.topTempC,this.bottomTempC,this.sourceKey,this.stale,this.lang),i="boiler-tank-clip",n=Ie(this.topTempC),r=this.volumeL!=null?xh(this.volumeL):null,a=this.sourceKey?Ze(this.sourceKey,this.lang):null,o=this.bottomTempC??this.lowerZoneTempC??null,l=o!=null?`${o.toFixed(1)}°`:"—°",d=o!=null&&this.bottomTempC==null?"DOLE (zóna)":"DOLE",p=this.fillLevelPct??null,u=p!=null?Math.round(p*100):null,h=p!=null?Math.max(ke+10,405-370*p):null;return c`
      <svg
        viewBox="0 0 ${eo} ${to}"
        role="img"
        aria-label="${t}"
        data-testid="boiler-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="${i}">
            <rect
              x="${Ue}"
              y="${ke}"
              width="${ct}"
              height="${Ge}"
              rx="${Ut}"
              ry="${Ut}"
            />
          </clipPath>
        </defs>

        <rect
          class="boiler-body"
          x="${Vh}"
          y="${$r}"
          width="${Wh}"
          height="${_r}"
          rx="${io}"
          ry="${io}"
        />

        <rect
          class="boiler-tank-bg"
          x="${Ue}"
          y="${ke}"
          width="${ct}"
          height="${Ge}"
          rx="${Ut}"
          ry="${Ut}"
        />

        <g clip-path="url(#${i})">
          ${e.map(g=>Q`
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
          y="${ke}"
          width="${ct}"
          height="${Ge}"
          rx="${Ut}"
          ry="${Ut}"
        />

        ${h!=null&&u!=null?Q`
          <line x1="${Ue}" y1="${h}" x2="${Ue+ct}" y2="${h}"
            stroke="rgba(245,184,0,.6)" stroke-width="1.5" stroke-dasharray="3,3"/>
          <text x="${Ue+ct+7}" y="${h+4}"
            font-size="9" fill="#f5b800" font-weight="600">${u}%</text>
        `:""}

        <text
          class="temp-label-top label-shadow"
          data-testid="boiler-temp-top-label"
          x="${Re}"
          y="${ke+44}"
        >${n}</text>

        <text
          class="temp-label-bottom label-shadow"
          data-testid="boiler-temp-bottom-label"
          x="${Re}"
          y="${Ri-36}"
          font-size="22"
          font-weight="700"
          fill="#fff"
          text-anchor="middle"
          style="paint-order:stroke;stroke:rgba(0,0,0,.4);stroke-width:2px"
        >${l}</text>
        <text
          x="${Re}"
          y="${Ri-20}"
          text-anchor="middle"
          fill="rgba(255,255,255,.85)"
          font-size="10"
          style="paint-order:stroke;stroke:rgba(0,0,0,.3);stroke-width:2px"
        >${d}</text>

        ${r!=null?Q`
          <g>
            <rect
              x="${Re-50}"
              y="${ke+Ge/2-18}"
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
              y="${ke+Ge/2-3}"
            >≈ ${r}</text>
            <text
              class="volume-badge-sub"
              x="${Re}"
              y="${ke+Ge/2+11}"
            >TUV @ 40 °C</text>
          </g>
        `:""}

        ${this.chargingLabel!=null?Q`
          <g>
            <rect
              x="${Re-58}"
              y="${ke+126}"
              width="116"
              height="26"
              rx="13"
              fill="rgba(74,222,128,0.95)"
            />
            <text
              class="charging-chip-text"
              x="${Re}"
              y="${ke+143}"
            >${this.chargingLabel}</text>
          </g>
        `:""}

        ${this.etaText!=null?Q`
          <g transform="translate(${Re} ${$r+_r+22})" data-testid="boiler-eta-chip">
            <rect x="-90" y="-14" width="180" height="28" rx="8"
              fill="rgba(255,122,69,.12)" stroke="rgba(255,122,69,.4)"/>
            <text x="0" y="-1" text-anchor="middle" fill="#ff7a45" font-size="12" font-weight="700">⏱ ${this.etaText}</text>
          </g>
        `:""}

        ${a!=null?Q`
          <text
            class="source-chip-text"
            data-testid="boiler-source-chip"
            x="${Re}"
            y="${$r+_r+40}"
          >${a}</text>
        `:""}

        <line x1="50" y1="85" x2="80" y2="85" stroke="#5a6472" stroke-width="3"/>
        <text x="46" y="81" text-anchor="end" font-size="9" fill="#9aa6b2">⟲ Cirk.</text>
        <line x1="240" y1="85" x2="270" y2="85" stroke="#dd5544" stroke-width="3"/>
        <text x="274" y="81" font-size="9" fill="#9aa6b2">TUV →</text>
        <line x1="50" y1="380" x2="80" y2="380" stroke="#6688a8" stroke-width="3"/>
        <text x="46" y="376" text-anchor="end" font-size="9" fill="#9aa6b2">💧 Vstup</text>
      </svg>
    `}};Pe.styles=M`
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
      fill: ${kt(s.bgSecondary)};
      stroke: ${kt(s.divider)};
      stroke-width: 2;
    }

    .boiler-tank-bg {
      fill: ${kt(s.bgPrimary)};
      stroke: ${kt(s.divider)};
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
      stroke: ${kt(s.divider)};
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
      fill: ${kt(s.textPrimary)};
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .source-chip-text {
      font-size: 12px;
      font-weight: 500;
      fill: ${kt(s.textSecondary)};
      text-anchor: middle;
      dominant-baseline: middle;
    }
  `;Ae([f({type:Number})],Pe.prototype,"fillLevelPct",2);Ae([f({type:Array})],Pe.prototype,"sourceSegments",2);Ae([f({type:Number})],Pe.prototype,"topTempC",2);Ae([f({type:Number})],Pe.prototype,"bottomTempC",2);Ae([f({type:Number})],Pe.prototype,"lowerZoneTempC",2);Ae([f({type:Number})],Pe.prototype,"volumeL",2);Ae([f({type:String})],Pe.prototype,"etaText",2);Ae([f({type:String})],Pe.prototype,"sourceKey",2);Ae([f({type:Boolean})],Pe.prototype,"stale",2);Ae([f({type:String})],Pe.prototype,"chargingLabel",2);Ae([f({type:String})],Pe.prototype,"lang",2);Pe=Ae([E("oig-boiler-v2-svg")],Pe);var Uh=Object.defineProperty,Gh=Object.getOwnPropertyDescriptor,tr=(e,t,i,n)=>{for(var r=n>1?void 0:n?Gh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Uh(t,i,r),r};const kr=Z,Sr=new Set(["temperature_unavailable","temperature_stale","source_stale","activity_stale","source_invalid","power_sign_mismatch_charge","power_sign_mismatch_discharge","runtime_cache_empty","config_profile_unavailable"]);function Zh(e){var t,i,n,r;if((t=e.status)!=null&&t.degraded)return!0;for(const a of((i=e.status)==null?void 0:i.degradedFlags)??[])if(Sr.has(a))return!0;for(const a of((n=e.activity)==null?void 0:n.staleFlags)??[])if(Sr.has(a))return!0;for(const a of((r=e.explanation)==null?void 0:r.degradedReasons)??[])if(Sr.has(a))return!0;return!1}function Qh(e,t,i){var a;const n=e.activity;if(!n)return null;const r=$h({targetTempC:t.targetTempC??0,topTempC:((a=e.status)==null?void 0:a.temperatureTop)??null,temperatureTrendCPerMin:n.temperatureTrendCPerMin,volumeL:t.volumeL,heaterPowerKw:t.heaterPowerKw});return r===null?w("boiler.eta.unavailable",i):r===0?w("boiler.eta.already_reached",i):wh(r)}let pi=class extends z{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs"}_renderAuraLegend(){var h,g;const e=this.data,t=(e==null?void 0:e.sourceSegments)??[],i=(e==null?void 0:e.activity)??null,n=(i==null?void 0:i.fillLevelPct)??null,r=(i==null?void 0:i.auraMaxTempC)??((h=this.config)==null?void 0:h.auraMaxTempC)??null,a=((g=e==null?void 0:e.status)==null?void 0:g.temperatureTop)??null,o={};for(const m of t)m.key&&(o[m.key]=(o[m.key]??0)+(m.energyKwh??0)/1e3);const l=n!=null?`${Math.round(n*100)} %`:null,d=l!=null?c`<div class="aura-percent">Náplň aury: <strong>${l}</strong>${a!=null&&r!=null?` (${Ie(a)} / ${Ie(r)} max)`:""}</div>`:k,u=c`
      <div class="aura-legend">
        ${[{key:"fve",color:"#f5b800"},{key:"overflow",color:"#4ade80"},{key:"grid",color:"#7c8694"}].map(({key:m,color:b})=>{const y=o[m]??0;return c`
            <div class="aura-legend-item">
              <span class="dot" style="background:${b}"></span>
              ${Ze(m,this.lang)} ${y.toFixed(1)}
            </div>
          `})}
      </div>
    `;return c`${d}${u}`}_renderSourceChip(){var l;const e=((l=this.data)==null?void 0:l.activity)??null,t=(e==null?void 0:e.source)??null;if(!t)return k;const i={grid:"SÍŤ",fve:"FVE",overflow:"PŘETOK",discharge:"VÝBOJ"},n={grid:"⚡",fve:"☀️",overflow:"🌊",discharge:"🔋"},r=i[t]??t.toUpperCase(),a=n[t]??"⚡",o=(e==null?void 0:e.powerKw)??null;return c`
      <div class="source-chip">
        <span>${a}</span>${r}<span>→</span>${o!=null?`${o.toFixed(1)} kW`:""}
      </div>
    `}_renderRecommendation(){var u,h,g;const e=this.data,i=((u=((e==null?void 0:e.planSlots)??[])[0])==null?void 0:u.recommendedSource)??null,n=((h=e==null?void 0:e.activity)==null?void 0:h.source)??null,r=((g=e==null?void 0:e.explanation)==null?void 0:g.reasonCodes)??[];if(!i)return k;const o={grid:"⚡ Síť",fve:"☀️ FVE",overflow:"🌊 Přetok",discharge:"🔋 Výboj"}[i]??i,l={no_fve:"FVE žádné",fve_available:"FVE dostupné",cheap_grid:"levná síť",overflow_available:"přetok dostupný"},d=r.length>0?r.map(m=>l[m]??m).join(", "):null,p=i===n;return c`
      <div class="source-secondary">
        Doporučeno: <span style="color:#e6edf3;font-weight:600">${o}${d?` (${d})`:""}</span>
        ${p?c` · stejně jako aktivní`:""}
      </div>
    `}render(){try{return this._renderShell()}catch{return c`
        <div class="shell" data-testid="boiler-v2-shell">
          <div class="stale-warning" data-testid="boiler-stale-warning" role="alert">
            ${w("boiler.aria.stale",this.lang)}
          </div>
        </div>
      `}}_renderShell(){var p,u,h;const e=this.data,t=e?Zh(e):!1,i=(e==null?void 0:e.activity)??null,n=(e==null?void 0:e.status)??null,r=this.config,a=e&&r?Qh(e,r,this.lang):null,o=(i==null?void 0:i.source)??null,l=(p=i==null?void 0:i.state)!=null&&p.startsWith("charging_")&&i.temperatureTrendCPerMin!=null?`↑ NABÍJÍ ${i.temperatureTrendCPerMin>=0?"+":""}${i.temperatureTrendCPerMin.toFixed(1)}°C/min`:(u=i==null?void 0:i.state)!=null&&u.startsWith("charging_")?"↑ NABÍJÍ":null,d=((h=e==null?void 0:e.status)==null?void 0:h.lowerZoneTempC)??null;return c`
      <div class="shell" data-testid="boiler-v2-shell">
        ${t?c`
              <div class="stale-warning" data-testid="boiler-stale-warning" role="alert">
                ${w("boiler.aria.stale",this.lang)}
              </div>
            `:k}

        <div class="svg-wrapper">
          <oig-boiler-v2-svg
            .fillLevelPct="${(i==null?void 0:i.fillLevelPct)??null}"
            .sourceSegments="${(e==null?void 0:e.sourceSegments)??[]}"
            .topTempC="${(n==null?void 0:n.temperatureTop)??null}"
            .bottomTempC="${(n==null?void 0:n.temperatureBottom)??null}"
            .lowerZoneTempC="${d}"
            .volumeL="${(r==null?void 0:r.volumeL)??null}"
            .etaText="${a}"
            .sourceKey="${o}"
            .chargingLabel="${l}"
            .stale="${t}"
            .lang="${this.lang}"
          ></oig-boiler-v2-svg>
        </div>
        <span aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">${(n==null?void 0:n.temperatureTop)??""}</span>

        ${this._renderAuraLegend()}
        ${a!=null?c`<div class="eta-row" style="font-size:11px;color:#9aa6b2;text-align:center">${w("boiler.eta.label",this.lang)}: <span aria-live="polite" style="font-weight:600;color:#e6edf3">${a}</span></div>`:""}
        ${this._renderSourceChip()}
        ${this._renderRecommendation()}

        <div class="advanced-slot" data-testid="boiler-advanced-slot">
          <slot name="advanced"></slot>
        </div>
      </div>
    `}};pi.styles=M`
    :host {
      display: block;
      font-family: ${kr(s.fontFamily)};
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
      background: ${kr(s.warning)};
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
      color: ${kr(s.textPrimary)};
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
  `;tr([f({type:Object})],pi.prototype,"data",2);tr([f({type:Object})],pi.prototype,"config",2);tr([f({type:String})],pi.prototype,"lang",2);pi=tr([E("oig-boiler-v2-shell")],pi);var Xh=Object.defineProperty,Jh=Object.getOwnPropertyDescriptor,yi=(e,t,i,n)=>{for(var r=n>1?void 0:n?Jh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Xh(t,i,r),r};let ht=class extends z{constructor(){super(...arguments),this.values=[],this.color="#4CAF50",this.sparkWidth=100,this.sparkHeight=30,this.label=""}render(){try{return this._renderSparkline()}catch{return c`<svg
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
      ></svg>`;const i=Math.min(...t),r=Math.max(...t)-i||1,a=2,o=this.sparkHeight-a*2,l=this.sparkWidth,d=e.length,p=e.map((u,h)=>{if(typeof u!="number"||!isFinite(u))return null;const g=d>1?h/(d-1)*l:l/2,m=a+o-(u-i)/r*o;return`${g.toFixed(2)},${m.toFixed(2)}`}).filter(u=>u!==null).join(" ");return c`
      <svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        viewBox="0 0 ${this.sparkWidth} ${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      >
        ${Q`<polyline
          points="${p}"
          fill="none"
          stroke="${this.color}"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />`}
      </svg>
    `}};ht.styles=M`
    :host {
      display: inline-block;
    }
    svg {
      display: block;
      overflow: visible;
    }
  `;yi([f({type:Array})],ht.prototype,"values",2);yi([f({type:String})],ht.prototype,"color",2);yi([f({type:Number})],ht.prototype,"sparkWidth",2);yi([f({type:Number})],ht.prototype,"sparkHeight",2);yi([f({type:String})],ht.prototype,"label",2);ht=yi([E("oig-boiler-sparkline")],ht);var eg=Object.defineProperty,tg=Object.getOwnPropertyDescriptor,gn=(e,t,i,n)=>{for(var r=n>1?void 0:n?tg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&eg(t,i,r),r};const ze=Z;function Li(e){return e?Ur[e]??"#9E9E9E":"#9E9E9E"}let Ft=class extends z{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs",this.panelType="source"}render(){try{return this.panelType==="source"?this._renderSourcePanel():this._renderComfortPanel()}catch{return c`
        <div class="panel">
          <div class="empty-panel">—</div>
        </div>
      `}}_renderSourcePanel(){var $,v,P;const e=this.data,t=(e==null?void 0:e.activity)??null,i=(e==null?void 0:e.status)??null,n=(e==null?void 0:e.planSlots)??[],r=(e==null?void 0:e.sourceSegments)??[],a=(($=e==null?void 0:e.sparkline)==null?void 0:$.power)??[],o=(t==null?void 0:t.source)??(i==null?void 0:i.selectedSource)??null,l=((v=n[0])==null?void 0:v.recommendedSource)??null,d=((P=i==null?void 0:i.energyTracking)==null?void 0:P.totalKwh)??r.reduce((j,B)=>j+(B.energyKwh??0),0)/1e3,p={};for(const j of r)j.key&&(p[j.key]=(p[j.key]??0)+(j.energyKwh??0)/1e3);const u=(e==null?void 0:e.costTodayCzk)??null,h=(e==null?void 0:e.savingsTodayCzk)??null,g=(e==null?void 0:e.pvShare7dPct)??null,m=p.fve??null,b=p.overflow??null,y=p.grid??null,_=a.length>0;return c`
      <div class="panel" data-testid="boiler-source-panel">
        <div class="panel-title">Zdroj &amp; náklady</div>

        <div class="stat-row ${_?"":"no-spark"}">
          <span class="stat-label">Cena dnes</span>
          ${_?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#f5b800" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
          <span class="stat-value">${u!=null?Hr(u):"—"}<span class="stat-unit">Kč</span></span>
        </div>

        <div class="stat-row ${_?"":"no-spark"}">
          <span class="stat-label">Energie dnes</span>
          ${_?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#60a5fa" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
          <span class="stat-value">${d>0?ei(d):"—"}</span>
        </div>

        ${m!=null?c`
          <div class="stat-row sub no-spark">
            <span class="stat-label">Z FVE</span>
            <span class="stat-value" style="color:${Li("fve")}">${ei(m)}</span>
          </div>
        `:k}

        ${b!=null?c`
          <div class="stat-row sub no-spark">
            <span class="stat-label">Z přetoku</span>
            <span class="stat-value" style="color:${Li("overflow")}">${ei(b)}</span>
          </div>
        `:k}

        ${y!=null?c`
          <div class="stat-row sub no-spark">
            <span class="stat-label">Ze sítě</span>
            <span class="stat-value" style="color:${Li("grid")}">${ei(y)}</span>
          </div>
        `:k}

        <div class="stat-row no-spark">
          <span class="stat-label">Ušetřeno vs. neoptim.</span>
          <span class="stat-value">${h!=null?`~${Hr(h)}`:"—"}<span class="stat-unit">${h!=null?"Kč":""}</span></span>
        </div>

        <div class="stat-row no-spark">
          <span class="stat-label">FVE podíl (7d)</span>
          <span class="stat-value">${g!=null?`${Math.round(g)} %`:"—"}</span>
        </div>

        <div class="stat-row no-spark">
          <span class="stat-label">Aktivní zdroj</span>
          <span class="stat-value source-value">
            ${o?c`<span class="source-dot" style="background:${Li(o)}"></span>${Ze(o,this.lang)}`:"—"}
          </span>
        </div>

        <div class="stat-row no-spark">
          <span class="stat-label">Doporučený zdroj</span>
          <span class="stat-value source-value">
            ${l?c`<span class="source-dot" style="background:${Li(l)}"></span>${Ze(l,this.lang)}`:"—"}
          </span>
        </div>
      </div>
    `}_renderComfortPanel(){var v;const e=this.data,t=(e==null?void 0:e.status)??null,i=(e==null?void 0:e.explanation)??null,n=this.config,r=(e==null?void 0:e.activity)??null,a=((v=e==null?void 0:e.sparkline)==null?void 0:v.temperature)??[],o=t==null?void 0:t.comfortSatisfied,l=o===!0?"ok":o===!1?"gap":"unknown",d=o===!0?w("boiler.status.comfort_satisfied",this.lang):o===!1?w("boiler.status.comfort_unsatisfied",this.lang):w("boiler.status.comfort_unknown",this.lang),p=(i==null?void 0:i.unsatisfiedComfortGapC)??null,u=(n==null?void 0:n.targetTempC)??null,h=p!=null&&u!=null?`Mezera do cíle: ${p.toFixed(1)} °C · cíl ${u.toFixed(0)} °C`:u!=null?`Cíl: ${u.toFixed(0)} °C`:"",g=(t==null?void 0:t.temperatureTop)??null,m=(t==null?void 0:t.temperatureBottom)??null,b=g!=null&&m!=null?g-m:null,y=(r==null?void 0:r.temperatureTrendCPerMin)??null,_=y!=null?`${y>=0?"+":""}${y.toFixed(1)} °C/min`:null,$=a.length>0;return c`
      <div class="panel" data-testid="boiler-comfort-panel">
        <div class="panel-title">Komfort</div>

        <div class="komfort-banner ${l}">
          <div class="komfort-circle ${l}">${o===!0?"✓":o===!1?"!":"?"}</div>
          <div>
            <div class="komfort-text-main ${l}">${d}</div>
            ${h?c`<div class="komfort-text-sub">${h}</div>`:k}
          </div>
        </div>

        ${n!=null&&n.deadlineTime&&n.deadlineTime!=="--:--"?c`
            <div class="stat-row no-spark">
              <span class="stat-label">${w("boiler.config.deadline",this.lang)}</span>
              <span class="stat-value">${n.deadlineTime}</span>
            </div>
          `:k}

        <div class="stat-row ${$?"":"no-spark"}">
          <span class="stat-label">${w("boiler.status.temp_top",this.lang)}</span>
          ${$?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#ff7a45" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
          <span class="stat-value">${Ie(g)}</span>
        </div>

        ${m!=null?c`
            <div class="stat-row ${$?"":"no-spark"}">
              <span class="stat-label">${w("boiler.status.temp_bottom",this.lang)}</span>
              ${$?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#6688a8" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
              <span class="stat-value">${Ie(m)}</span>
            </div>
          `:c`
            <div class="stat-row no-spark">
              <span class="stat-label">${w("boiler.status.temp_bottom",this.lang)}</span>
              <span class="stat-value">—</span>
            </div>
          `}

        ${b!=null?c`
            <div class="stat-row ${$?"":"no-spark"}">
              <span class="stat-label">Stratifikace ΔT</span>
              ${$?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#a78bfa" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
              <span class="stat-value">${b.toFixed(1)}<span class="stat-unit">°C</span></span>
            </div>
          `:k}

        ${_!=null?c`
            <div class="stat-row no-spark">
              <span class="stat-label">Trend</span>
              <span class="stat-value">${_}</span>
            </div>
          `:k}
      </div>
    `}};Ft.styles=M`
    :host {
      display: block;
      font-family: ${ze(s.fontFamily)};
    }

    .panel {
      background: ${ze(s.cardBg)};
      border: 1px solid ${ze(s.divider)};
      border-radius: 12px;
      padding: 18px;
      box-sizing: border-box;
    }

    .panel-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${ze(s.textSecondary)};
      margin: 0 0 14px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${ze(s.textSecondary)};
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
      border-bottom: 1px solid ${ze(s.divider)};
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
      color: ${ze(s.textSecondary)};
    }

    .stat-label {
      color: ${ze(s.textSecondary)};
      font-size: 12px;
    }

    .stat-value {
      font-size: 15px;
      font-weight: 600;
      color: ${ze(s.textPrimary)};
      text-align: right;
      white-space: nowrap;
    }

    .stat-value.lg {
      font-size: 22px;
    }

    .stat-unit {
      color: ${ze(s.textSecondary)};
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
      color: ${ze(s.textSecondary)};
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
      color: ${ze(s.textSecondary)};
      font-size: 12px;
      font-style: italic;
      padding: 4px 0;
    }
  `;gn([f({type:Object})],Ft.prototype,"data",2);gn([f({type:Object})],Ft.prototype,"config",2);gn([f({type:String})],Ft.prototype,"lang",2);gn([f({type:String})],Ft.prototype,"panelType",2);Ft=gn([E("oig-boiler-metric-panel")],Ft);var ig=Object.defineProperty,ng=Object.getOwnPropertyDescriptor,vi=(e,t,i,n)=>{for(var r=n>1?void 0:n?ng(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&ig(t,i,r),r};const Cr=Z,Bi=1e3,Xt=200,ro=20,Pr=80,St=3,qe=100,Tt=1440;function rg(e){return e??Date.now()}function ag(e,t){var a,o;const i=new Intl.DateTimeFormat("en-US",{timeZone:t,hour:"numeric",minute:"2-digit",hour12:!1}).formatToParts(new Date(e)),n=parseInt(((a=i.find(l=>l.type==="hour"))==null?void 0:a.value)??"0",10)%24,r=parseInt(((o=i.find(l=>l.type==="minute"))==null?void 0:o.value)??"0",10);return n*60+r}function og(e,t){const i=new Intl.DateTimeFormat("en-US",{timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}).formatToParts(new Date(e)),n=$=>{var v;return((v=i.find(P=>P.type===$))==null?void 0:v.value)??"00"},r=n("year"),a=n("month"),o=n("day"),l=parseInt(n("hour"),10)%24,d=n("minute"),p=n("second"),u=String(l).padStart(2,"0"),h=Date.UTC(parseInt(r),parseInt(a)-1,parseInt(o),l,parseInt(d),parseInt(p)),g=Math.round((h-e)/6e4),m=g>=0?"+":"-",b=Math.abs(g),y=String(Math.floor(b/60)).padStart(2,"0"),_=String(b%60).padStart(2,"0");return`${r}-${a}-${o}T${u}:${d}:${p}${m}${y}:${_}`}function Ye(e){return e/Tt*Bi}function Gt(e){return String(parseFloat(e.toFixed(3)))}function Tr(e){const t=Math.max(ro,Math.min(Pr,e));return(Pr-t)/(Pr-ro)*Xt}function sg(e,t){const i=ag(e,t);return e-i*6e4}function lg(e){if(e.length<=1)return e;const t=[];let i={...e[0]};for(let n=1;n<e.length;n++){const r=e[n],a=i.recommendedSource===r.recommendedSource,o=(i.heatingKwh!=null?i.heatingKwh>0:!1)==(r.heatingKwh!=null?r.heatingKwh>0:!1),l=i.end===r.start;a&&o&&l?i={...i,end:r.end}:(t.push(i),i={...r})}return t.push(i),t}function ao(e,t,i){let n=null,r=-1/0;for(const a of t){const o=Date.parse(a.start);if(!isFinite(o))continue;const l=a.end!==null?Date.parse(a.end):i;isFinite(l)&&o<=e&&e<=l&&o>r&&(r=o,n=a)}return n}function oo(e,t){const i=Date.parse(e.start),n=e.end!==null?Date.parse(e.end):t;if(!isFinite(i)||!isFinite(n))return null;const r=(n-i)/36e5;return r<=0||!isFinite(r)||!isFinite(e.energyKwh)||e.energyKwh<0?null:e.energyKwh/r}function cg(e,t,i,n,r){const a=[w("boiler.aria.plan_timeline",r)];a.push(`NOW: ${e}`),t&&a.push(`${w("boiler.config.deadline",r)}: ${t}`),i!=null&&a.push(`${w("boiler.config.goal_temp",r)}: ${i}°C`);const o=[...new Set(n.filter(Boolean))];return o.length>0&&a.push(o.map(l=>Ze(l,r)).join(", ")),a.join(". ")}let gt=class extends z{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs",this.nowMs=null,this.timeZone=null}render(){try{return this._renderTimeline()}catch{return c`
        <div class="timeline-section">
          <div class="empty-timeline" data-testid="boiler-timeline">${w("boiler.timeline.empty",this.lang)}</div>
        </div>
      `}}_resolveTimeZone(){if(this.timeZone)return this.timeZone;try{return Intl.DateTimeFormat().resolvedOptions().timeZone}catch{return"Europe/Prague"}}_renderTimeline(){var xe;const e=rg(this.nowMs??void 0),t=this._resolveTimeZone();let i;try{i=sg(e,t)}catch{i=e-e%864e5}const n=(e-i)/6e4,r=Ye(n);let a="";try{a=og(e,t)}catch{a=new Date(e).toISOString()}const o=this.config,l=o!=null&&o.deadlineTime&&o.deadlineTime!=="--:--"?o.deadlineTime:null;let d=null;if(l)try{const[x,ee]=l.split(":"),de=parseInt(x,10)*60+parseInt(ee,10);d=Ye(de)}catch{d=null}const p=(o==null?void 0:o.targetTempC)!=null&&isFinite(o.targetTempC)?o.targetTempC:60,u=Tr(p),h=this.data,g=Array.isArray(h==null?void 0:h.planSlots)?h.planSlots:[],m=Array.isArray(h==null?void 0:h.timeline)?h.timeline:[],b=Array.isArray(h==null?void 0:h.sourceSegments)?h.sourceSegments:[],y=g.length>0&&g.every(x=>(x.heatingKwh??0)===0&&(x.pvKwh??0)===0&&(x.gridKwh??0)===0&&(x.altKwh??0)===0),_=this._buildPlanBands(g,i),$=this._buildTempPointsFromSlots(g,i),v=this._buildTempPointsFromTimeline(m,i),P=$.length>0?$:v,j=this._buildPowerBarsFromSlots(g,i),B=this._buildPowerBars(m,b,i,e),K=_.map(x=>x.source);let S="";try{S=cg(a,l,p,K,this.lang)}catch{S=w("boiler.aria.plan_timeline",this.lang)}const L=P.length>=2?P.map(x=>`${x.x.toFixed(2)},${x.y.toFixed(2)}`).join(" "):null,A=g.reduce((x,ee)=>x+(ee.gridKwh??0),0),U=g.reduce((x,ee)=>x+(ee.pvKwh??0)+(ee.altKwh??0),0),Y=g.reduce((x,ee)=>x+(ee.estimatedCostCzk??0),0),N=A+U,q=((xe=h==null?void 0:h.status)==null?void 0:xe.degradedFlags)??[],Te=q.includes("price_degraded"),it=q.includes("forecast_degraded"),nt=["00","03","06","09","12","15","18","21","24"];return c`
      <div class="timeline-section">
        <div class="timeline-header">
          <h3>📅 24h plán: teplota, výkon &amp; zdroje</h3>
          ${g.length>0?c`
            <div class="timeline-summary">
              Dnes: <strong>${A.toFixed(1)} kWh</strong> ze sítě
              · <strong style="color:#f5b800">${U.toFixed(1)} kWh</strong> z FVE/přetoku
              ${Y>0?c` · <strong>~${Y.toFixed(2)} Kč</strong>`:""}
              ${N>0?c` · spotřeba <strong>~${N.toFixed(1)} kWh</strong>`:""}
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
              viewBox="0 0 ${Bi} ${Xt}"
              role="img"
              aria-label="${S}"
              data-testid="boiler-timeline"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              ${Q`<rect x="0" y="0" width="${Bi}" height="${Xt}" fill="transparent" />`}

              ${_.map(x=>{const ee=x.source?Ur[x.source]??"#9E9E9E":"#9E9E9E",de=x.x2-x.x1;return Q`<rect
                  class="plan-band"
                  data-source="${x.source??"unknown"}"
                  x="${x.x1.toFixed(2)}"
                  y="0"
                  width="${de.toFixed(2)}"
                  height="${Xt}"
                  fill="${ee}"
                />`})}

              ${Q`<line x1="0" y1="${qe}" x2="${Bi}" y2="${qe}" stroke="rgba(255,255,255,.08)" stroke-width="1"/>`}

              ${Q`<line
                class="goal-line"
                x1="0" y1="${u.toFixed(2)}"
                x2="${Bi}" y2="${u.toFixed(2)}"
              />`}
              ${Q`<text x="4" y="${(u-3).toFixed(2)}" font-size="8" fill="#4ade80">CÍL ${p}°C</text>`}

              ${d!=null&&l!=null?Q`
                <line class="deadline-marker"
                  data-testid="boiler-deadline-marker"
                  data-deadline-time="${l}"
                  data-deadline-x="${Gt(d)}"
                  x1="${Gt(d)}" y1="0"
                  x2="${Gt(d)}" y2="${Xt}"
                />
                <text x="${(d+3).toFixed(2)}" y="12" font-size="8" fill="#E65100">${l}</text>
              `:""}

              ${j.map(x=>{if(x.isCharge){const ee=qe-x.barH;return Q`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    x="${(x.x-2).toFixed(2)}" y="${ee.toFixed(2)}" width="4" height="${x.barH.toFixed(2)}"/>`}else return Q`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    x="${(x.x-2).toFixed(2)}" y="${qe}" width="4" height="${x.barH.toFixed(2)}"/>`})}

              ${B.map(x=>{if(x.isCharge){const ee=qe-x.barH;return Q`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    data-estimated-power="${x.isEstimated?"true":"false"}"
                    x="${(x.x-2).toFixed(2)}" y="${ee.toFixed(2)}" width="4" height="${x.barH.toFixed(2)}"/>`}else return Q`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    data-estimated-power="${x.isEstimated?"true":"false"}"
                    x="${(x.x-2).toFixed(2)}" y="${qe}" width="4" height="${x.barH.toFixed(2)}"/>`})}

              ${m.map(x=>{let ee;try{ee=Date.parse(x.timestamp)}catch{return""}if(!isFinite(ee))return"";const de=(ee-i)/6e4;if(de<0||de>Tt||x.powerKw!==null)return"";const ki=ao(ee,b,e),Ne=ki?oo(ki,e):null;if(Ne!==null&&Ne>0)return"";const We=Ye(de);return Q`<rect
                  class="placeholder-bar"
                  data-testid="boiler-power-placeholder"
                  data-estimated-power="true"
                  x="${(We-2).toFixed(2)}" y="99" width="4" height="2"
                />`})}

              ${L!=null?Q`<polyline class="temp-line" points="${L}" />`:""}

              ${Q`<line
                class="now-marker"
                data-testid="boiler-now-marker"
                data-now-time="${a}"
                data-now-x="${Gt(r)}"
                x1="${Gt(r)}" y1="0"
                x2="${Gt(r)}" y2="${Xt}"
              />`}
              ${Q`<text x="${(r+3).toFixed(2)}" y="12" font-size="8" fill="#60a5fa">TEĎ</text>`}
            </svg>
          </div>

          <div class="timeline-axis">
            ${nt.map(x=>c`<span>${x}</span>`)}
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
            ${Te?c`<span class="degraded-chip">⚠ Ceny: stará data</span>`:""}
            ${it?c`<span class="degraded-chip">⚠ FVE predikce: stará data</span>`:""}
          </div>
        </div>
      </div>
    `}_buildTempPointsFromTimeline(e,t){const i=[],n=t+Tt*6e4;for(const r of e)try{if(r.topTempC==null||!isFinite(r.topTempC))continue;const a=Date.parse(r.timestamp);if(!isFinite(a)||a<t||a>n)continue;const o=(a-t)/6e4;i.push({x:Ye(o),y:Tr(r.topTempC)})}catch{continue}return i}_buildTempPointsFromSlots(e,t){const i=[],n=t+Tt*6e4;for(const r of e)try{const a=r.expectedTempTopC;if(a==null||!isFinite(a))continue;const o=Date.parse(r.start);if(!isFinite(o)||o<t||o>n)continue;const l=(o-t)/6e4;i.push({x:Ye(l),y:Tr(a)})}catch{continue}return i}_buildPowerBarsFromSlots(e,t){const i=[],n=t+Tt*6e4;for(let r=0;r<e.length;r++){const a=e[r];try{const o=Date.parse(a.start);if(!isFinite(o)||o<t||o>n)continue;const l=(o-t)/6e4,d=Ye(l),p=(a.pvKwh??0)+(a.gridKwh??0)+(a.altKwh??0);if(p<=0)continue;const u=p*4,g=Math.min(u,St)/St*qe;i.push({x:d,barH:g,isCharge:!0,isEstimated:!1})}catch{continue}}return i}_buildPlanBands(e,t){if(!e.length)return[];const i=[],n=t+Tt*6e4,r=[];for(const o of e)try{const l=Date.parse(o.start),d=Date.parse(o.end);if(!isFinite(l)||!isFinite(d)||d<=t||l>=n)continue;const p=Math.max(l,t),u=Math.min(d,n);if(u<=p)continue;r.push({...o,start:new Date(p).toISOString(),end:new Date(u).toISOString()})}catch{continue}const a=lg(r);for(const o of a)try{const l=Date.parse(o.start),d=Date.parse(o.end);if(!isFinite(l)||!isFinite(d))continue;const p=Ye((l-t)/6e4),u=Ye((d-t)/6e4);if(u<=p)continue;i.push({x1:p,x2:u,source:o.recommendedSource,heating:(o.heatingKwh??0)>0})}catch{continue}return i}_buildPowerBars(e,t,i,n){const r=[],a=i+Tt*6e4;for(const o of e)try{const l=Date.parse(o.timestamp);if(!isFinite(l)||l<i||l>a)continue;const d=(l-i)/6e4,p=Ye(d);if(o.powerKw!==null&&isFinite(o.powerKw)){const u=Math.max(-St,Math.min(St,o.powerKw));if(Math.abs(u)<.001)continue;const h=Math.abs(u)/St*qe;r.push({x:p,barH:h,isCharge:u>0,isEstimated:!1})}else{const u=ao(l,t,n);if(u!==null){const h=oo(u,n);if(h!==null&&h>0){const g=u.key==="discharge",b=Math.min(h,St)/St*qe;r.push({x:p,barH:b,isCharge:!g,isEstimated:!0})}}}}catch{continue}return r}};gt.styles=M`
    :host {
      display: block;
      font-family: ${Cr(s.fontFamily)};
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
      color: ${Cr(s.textPrimary)};
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
      color: ${Cr(s.textSecondary)};
      font-style: italic;
    }

    @media (max-width: 599px) {
      :host { font-size: 12px; }
    }
  `;vi([f({type:Object})],gt.prototype,"data",2);vi([f({type:Object})],gt.prototype,"config",2);vi([f({type:String})],gt.prototype,"lang",2);vi([f({type:Number})],gt.prototype,"nowMs",2);vi([f({type:String})],gt.prototype,"timeZone",2);gt=vi([E("oig-boiler-timeline-chart")],gt);var dg=Object.defineProperty,pg=Object.getOwnPropertyDescriptor,ye=(e,t,i,n)=>{for(var r=n>1?void 0:n?pg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&dg(t,i,r),r};const Ct=Z,ir=M`
  .selector-label {
    font-size: 12px;
    color: ${Ct(s.textSecondary)};
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
    border: 2px solid ${Ct(s.divider)};
    background: ${Ct(s.bgSecondary)};
    color: ${Ct(s.textPrimary)};
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .mode-btn:hover:not(:disabled):not(.active) {
    border-color: ${Ct(s.accent)};
  }

  .mode-btn.active {
    background: ${Ct(s.accent)};
    border-color: ${Ct(s.accent)};
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
`;let ui=class extends z{constructor(){super(...arguments),this.value="home_1",this.disabled=!1,this.buttonStates={home_1:"idle",home_2:"idle",home_3:"idle",home_ups:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("mode-change",{detail:{mode:e},bubbles:!0}))}render(){return c`
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
              ${wo[t]}
              ${i==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};ui.styles=[ir];ye([f({type:String})],ui.prototype,"value",2);ye([f({type:Boolean})],ui.prototype,"disabled",2);ye([f({type:Object})],ui.prototype,"buttonStates",2);ui=ye([E("oig-box-mode-selector")],ui);let ft=class extends z{constructor(){super(...arguments),this.value="off",this.limit=0,this.disabled=!1,this.pendingTarget=null,this.buttonStates={off:"idle",on:"idle",limited:"idle"}}onDeliveryClick(e){const t=this.buttonStates[e];this.disabled||t==="pending"||t==="processing"||t==="disabled-by-service"||t==="active"&&e!=="limited"||this.dispatchEvent(new CustomEvent("delivery-change",{detail:{value:e,limit:e==="limited"?this.limit:null},bubbles:!0}))}render(){const e=[{value:"off",label:Ii.off},{value:"on",label:Ii.on},{value:"limited",label:Ii.limited}],i=this.pendingTarget!==null&&this.pendingTarget!==this.value?c`<span class="status-text transitioning">\u23F3\u00A0${Ii[this.pendingTarget]}</span>`:null;return c`
      <div class="selector-label">
        Dod\u00E1vka do s\u00EDt\u011B ${i}
      </div>
      <div class="mode-buttons">
        ${e.map(n=>{const r=this.buttonStates[n.value],a=n.value===this.value,o=n.value===this.pendingTarget&&!a,l=this.disabled||r==="pending"||r==="processing"||r==="disabled-by-service",d=a&&r==="disabled-by-service"?"active disabled-by-service":o?`${r} pending-target`:r;return c`
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
    `}};ft.styles=[ir,M`
      .mode-btn.pending-target {
        border-color: #ffc107;
        color: #ffc107;
        background: rgba(255, 193, 7, 0.08);
      }
    `];ye([f({type:String})],ft.prototype,"value",2);ye([f({type:Number})],ft.prototype,"limit",2);ye([f({type:Boolean})],ft.prototype,"disabled",2);ye([f({type:String})],ft.prototype,"pendingTarget",2);ye([f({type:Object})],ft.prototype,"buttonStates",2);ft=ye([E("oig-grid-delivery-selector")],ft);let hi=class extends z{constructor(){super(...arguments),this.value="cbb",this.disabled=!1,this.buttonStates={cbb:"idle",manual:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("boiler-mode-change",{detail:{mode:e},bubbles:!0}))}render(){return c`
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
              ${_o[t]} ${$o[t]}
              ${i==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};hi.styles=[ir];ye([f({type:String})],hi.prototype,"value",2);ye([f({type:Boolean})],hi.prototype,"disabled",2);ye([f({type:Object})],hi.prototype,"buttonStates",2);hi=ye([E("oig-boiler-mode-selector")],hi);let mt=class extends z{constructor(){super(...arguments),this.homeGridV=!1,this.homeGridVi=!1,this.flexibilita=!1,this.available=!1,this.disabled=!1}getButtonClass(e){return e&&this.disabled?"active disabled-by-service":e?"active":this.disabled?"disabled-by-service":"idle"}onToggleClick(e){this.disabled||this.dispatchEvent(new CustomEvent("supplementary-toggle",{detail:{key:e},bubbles:!0}))}render(){const e=this.getButtonClass(this.homeGridV),t=this.getButtonClass(this.homeGridVi),i=this.flexibilita?c`<span class="flexibilita-badge">\u26A1 Flexibilita</span>`:"";return c`
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
    `}};mt.styles=[ir,M`
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
    `];ye([f({type:Boolean})],mt.prototype,"homeGridV",2);ye([f({type:Boolean})],mt.prototype,"homeGridVi",2);ye([f({type:Boolean})],mt.prototype,"flexibilita",2);ye([f({type:Boolean})],mt.prototype,"available",2);ye([f({type:Boolean})],mt.prototype,"disabled",2);mt=ye([E("oig-supplementary-selector")],mt);function ug(e){const t=!e.available||e.flexibilita;return e.available?{home_grid_v:e.home_grid_v,home_grid_vi:e.home_grid_vi,flexibilita:e.flexibilita,available:e.available,disabled:t}:{home_grid_v:!1,home_grid_vi:!1,flexibilita:e.flexibilita,available:!1,disabled:!0}}var hg=Object.defineProperty,gg=Object.getOwnPropertyDescriptor,xi=(e,t,i,n)=>{for(var r=n>1?void 0:n?gg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&hg(t,i,r),r};const De=Z;let bt=class extends z{constructor(){super(...arguments),this.items=[],this.expanded=!1,this.shieldStatus="idle",this.queueCount=0,this._now=Date.now(),this.updateInterval=null}connectedCallback(){super.connectedCallback(),this.updateInterval=window.setInterval(()=>{this._now=Date.now()},1e3)}disconnectedCallback(){super.disconnectedCallback(),this.updateInterval!==null&&clearInterval(this.updateInterval)}toggleExpanded(){this.expanded=!this.expanded}removeItem(e,t){t.stopPropagation(),this.dispatchEvent(new CustomEvent("remove-item",{detail:{position:e},bubbles:!0}))}formatServiceName(e,t){return t==="supplementary_toggle"?"⚙️ Změna doplňkového režimu":kl[e]||e||"N/A"}stripCurrentSuffix(e){const i=e.indexOf("(nyní:");return i===-1?e.trim():e.slice(0,i).trim()}formatChanges(e){return!e||e.length===0?"N/A":e.map(t=>{const i=t.indexOf("→");if(i===-1)return t;const n=t.slice(0,i).trim(),r=t.slice(i+1).trim(),a=n.indexOf(":"),o=a===-1?n:n.slice(a+1),l=n.includes("prm2_app")?ko:Sl,d=o.replaceAll("'","").trim(),p=this.stripCurrentSuffix(r).replaceAll("'","").trim(),u=l[d]||d,h=l[p]||p;return`${u} → ${h}`}).join(", ")}formatTimestamp(e){if(!e)return{time:"--",duration:"--"};try{const t=new Date(e);if(isNaN(t.getTime()))return{time:"--",duration:"--"};const i=new Date(this._now),n=Math.floor((i.getTime()-t.getTime())/1e3),r=String(t.getHours()).padStart(2,"0"),a=String(t.getMinutes()).padStart(2,"0");let o=`${r}:${a}`;if(t.toDateString()!==i.toDateString()){const d=t.getDate(),p=t.getMonth()+1;o=`${d}.${p}. ${o}`}let l;if(n<60)l=`${n}s`;else if(n<3600){const d=Math.floor(n/60),p=n%60;l=`${d}m ${p}s`}else{const d=Math.floor(n/3600),p=Math.floor(n%3600/60);l=`${d}h ${p}m`}return{time:o,duration:l}}catch{return{time:"--",duration:"--"}}}get activeCount(){return this.items.length}render(){this._now;const e=this.shieldStatus==="running"?"running":"idle",t=this.shieldStatus==="running"?"🔄 Zpracovává":"✓ Připraveno";return c`
      <div class="queue-header" @click=${this.toggleExpanded}>
        <div class="queue-title-area">
          <span class="queue-title">Shield fronta</span>
          ${this.activeCount>0?c`
            <span class="queue-count">(${this.activeCount} aktivn\u00EDch)</span>
          `:k}
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
      `:k}
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
    `}};bt.styles=M`
    :host {
      display: block;
      background: ${De(s.cardBg)};
      border-radius: 12px;
      box-shadow: ${De(s.cardShadow)};
      overflow: hidden;
    }

    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: ${De(s.bgSecondary)};
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
      color: ${De(s.textPrimary)};
    }

    .queue-count {
      font-size: 12px;
      color: ${De(s.textSecondary)};
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
      color: ${De(s.accent)};
      transition: transform 0.2s;
    }

    .queue-toggle.expanded {
      transform: rotate(180deg);
    }

    .queue-content {
      padding: 0;
      border-top: 1px solid ${De(s.divider)};
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
      color: ${De(s.textSecondary)};
      border-bottom: 1px solid ${De(s.divider)};
      background: ${De(s.bgSecondary)};
    }

    .queue-table td {
      padding: 8px 12px;
      color: ${De(s.textPrimary)};
      border-bottom: 1px solid ${De(s.divider)};
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
      color: ${De(s.textSecondary)};
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
  `;xi([f({type:Array})],bt.prototype,"items",2);xi([f({type:Boolean})],bt.prototype,"expanded",2);xi([f({type:String})],bt.prototype,"shieldStatus",2);xi([f({type:Number})],bt.prototype,"queueCount",2);xi([T()],bt.prototype,"_now",2);bt=xi([E("oig-shield-queue")],bt);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const fg={CHILD:2},mg=e=>(...t)=>({_$litDirective$:e,values:t});class bg{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,n){this._$Ct=t,this._$AM=i,this._$Ci=n}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Wr extends bg{constructor(t){if(super(t),this.it=k,t.type!==fg.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===k||t==null)return this._t=void 0,this.it=t;if(t===Zs)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}}Wr.directiveName="unsafeHTML",Wr.resultType=1;const yg=mg(Wr);var vg=Object.defineProperty,xg=Object.getOwnPropertyDescriptor,fn=(e,t,i,n)=>{for(var r=n>1?void 0:n?xg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&vg(t,i,r),r};const ve=Z;let It=class extends z{constructor(){super(...arguments),this.open=!1,this.config={title:"",message:""},this.acknowledged=!1,this.limitValue=5e3,this.resolver=null,this.onOverlayClick=()=>{this.closeDialog({confirmed:!1})},this.onDialogClick=e=>{e.stopPropagation()},this.onKeyDown=e=>{e.key==="Escape"&&this.open&&this.closeDialog({confirmed:!1})},this.onAckChange=e=>{this.acknowledged=e.target.checked},this.onLimitInput=e=>{this.limitValue=parseInt(e.target.value,10)||0},this.onCancel=()=>{this.closeDialog({confirmed:!1})},this.onConfirm=()=>{const e=this.config.showLimitInput||this.config.limitOnly;if(e){const t=this.config.limitMin??1,i=this.config.limitMax??2e4;if(isNaN(this.limitValue)||this.limitValue<t||this.limitValue>i)return}this.closeDialog({confirmed:!0,limit:e?this.limitValue:void 0})}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeyDown)}showDialog(e){return this.config=e,this.acknowledged=!1,this.limitValue=e.limitValue??5e3,this.open=!0,new Promise(t=>{this.resolver=t})}closeDialog(e){var t;this.open=!1,(t=this.resolver)==null||t.call(this,e),this.resolver=null}get canConfirm(){return!(this.config.requireAcknowledgement&&!this.acknowledged)}render(){if(!this.open)return k;const e=this.config;return e.limitOnly?c`
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
          `:k}

          ${e.warning?c`
            <div class="dialog-warning">
              \u26A0\uFE0F ${this.renderHTML(e.warning)}
            </div>
          `:k}

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
          `:k}

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
    `}renderHTML(e){return yg(e)}};It.styles=M`
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
      background: ${ve(s.cardBg)};
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
      color: ${ve(s.textPrimary)};
      border-bottom: 1px solid ${ve(s.divider)};
    }

    .dialog-body {
      padding: 16px 20px;
      font-size: 14px;
      line-height: 1.5;
      color: ${ve(s.textPrimary)};
    }

    .dialog-warning {
      margin: 0 20px 12px;
      padding: 10px 14px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      font-size: 13px;
      color: ${ve(s.textPrimary)};
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
      background: ${ve(s.bgSecondary)};
      border-radius: 8px;
      cursor: pointer;
    }

    .ack-wrapper input[type="checkbox"] {
      margin-top: 2px;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${ve(s.accent)};
    }

    .ack-wrapper label {
      font-size: 13px;
      line-height: 1.4;
      color: ${ve(s.textPrimary)};
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
      color: ${ve(s.textPrimary)};
    }

    .limit-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid ${ve(s.divider)};
      border-radius: 8px;
      font-size: 14px;
      background: ${ve(s.bgPrimary)};
      color: ${ve(s.textPrimary)};
      box-sizing: border-box;
    }

    .limit-hint {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      opacity: 0.7;
      color: ${ve(s.textSecondary)};
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
      background: ${ve(s.bgSecondary)};
      color: ${ve(s.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${ve(s.divider)};
    }

    .btn-confirm {
      background: ${ve(s.accent)};
      color: #fff;
    }

    .btn-confirm:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-confirm:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;fn([f({type:Boolean,reflect:!0})],It.prototype,"open",2);fn([f({type:Object})],It.prototype,"config",2);fn([T()],It.prototype,"acknowledged",2);fn([T()],It.prototype,"limitValue",2);It=fn([E("oig-confirm-dialog")],It);var wg=Object.defineProperty,$g=Object.getOwnPropertyDescriptor,ss=(e,t,i,n)=>{for(var r=n>1?void 0:n?$g(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&wg(t,i,r),r};const Ai=Z;let Vn=class extends z{constructor(){super(...arguments),this.shieldState=null}render(){if(!this.shieldState)return k;const e=this.determineStatus(this.shieldState),t=e.toLowerCase(),i=this.getStatusIcon(e),n=this.getStatusLabel(e),a=this.shieldState.queueCount>0?"has-items":"";return c`
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
    `}determineStatus(e){return e.status==="running"?"processing":e.queueCount>0?"pending":"idle"}getStatusIcon(e){switch(e){case"idle":return"✓";case"pending":return"⏳";case"processing":return"🔄";default:return"✓"}}getStatusLabel(e){switch(e){case"idle":return"Připraveno";case"pending":return"Čeká";case"processing":return"Zpracovává";default:return"Neznámý"}}getActivityText(){return this.shieldState?this.shieldState.activity?this.shieldState.activity:this.shieldState.queueCount>0?`${this.shieldState.queueCount} operací ve frontě`:"Systém připraven":"Žádná aktivita"}};Vn.styles=M`
    :host {
      display: block;
      padding: 16px 20px;
      border-top: 1px solid ${Ai(s.divider)};
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
      color: ${Ai(s.textPrimary)};
    }

    .shield-status-subtitle {
      font-size: 11px;
      color: ${Ai(s.textSecondary)};
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
      background: ${Ai(s.bgSecondary)};
      color: ${Ai(s.textSecondary)};
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
  `;ss([f({type:Object})],Vn.prototype,"shieldState",2);Vn=ss([E("oig-shield-status")],Vn);var _g=Object.defineProperty,kg=Object.getOwnPropertyDescriptor,ra=(e,t,i,n)=>{for(var r=n>1?void 0:n?kg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&_g(t,i,r),r};const Zt=Z;let tn=class extends z{constructor(){super(...arguments),this.shieldState={...So,pendingServices:new Map,changingServices:new Set},this._confirmDialogOverride=null,this.unsubscribe=null,this.onShieldUpdate=e=>{this.shieldState=e}}get confirmDialog(){return this._confirmDialogOverride??this._confirmDialogQuery}set confirmDialog(e){this._confirmDialogOverride=e}connectedCallback(){super.connectedCallback(),this.unsubscribe=ae.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.unsubscribe)==null||e.call(this),this.unsubscribe=null}get boxModeButtonStates(){return{home_1:ae.getBoxModeButtonState("home_1"),home_2:ae.getBoxModeButtonState("home_2"),home_3:ae.getBoxModeButtonState("home_3"),home_ups:ae.getBoxModeButtonState("home_ups")}}get gridDeliveryButtonStates(){return{off:ae.getGridDeliveryButtonState("off"),on:ae.getGridDeliveryButtonState("on"),limited:ae.getGridDeliveryButtonState("limited")}}get boilerModeButtonStates(){return{cbb:ae.getBoilerModeButtonState("cbb"),manual:ae.getBoilerModeButtonState("manual")}}get supplementaryView(){return ug(this.shieldState.supplementary)}async onBoxModeChange(e){const{mode:t}=e.detail,i=wo[t];if(C.debug("Control panel: box mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu střídače",message:`Chystáte se změnit režim boxu na <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování celého systému a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!ae.shouldProceedWithQueue())return;await ae.setBoxMode(t)||C.warn("Box mode change failed or already active",{mode:t})}async onGridDeliveryChange(e){const{value:t,limit:i}=e.detail,n=Ii[t],r=_l[t],a=t==="limited",o=this.shieldState.gridDeliveryState.currentLiveLimit??5e3;C.debug("Control panel: grid delivery change requested",{delivery:t,limit:i});const l=this.shieldState.gridDeliveryState.currentLiveDelivery;if(!this.shieldState.gridDeliveryState.isTransitioning&&l==="limited"&&t==="limited"){const m={title:"🚰 Změnit limit přetoků",message:"",limitOnly:!0,showLimitInput:!0,limitValue:o,limitMin:1,limitMax:2e4,limitStep:100,confirmText:"Uložit limit",cancelText:"Zrušit"},b=await this.confirmDialog.showDialog(m);if(!b.confirmed||!ae.shouldProceedWithQueue())return;await ae.setGridDelivery("limited",b.limit);return}const p={title:`${r} Změna dodávky do sítě`,message:`Chystáte se změnit dodávku do sítě na: <strong>"${n}"</strong>`,warning:a?"Režim a limit budou změněny postupně (serializováno). Každá změna může trvat až 10 minut.":"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,acknowledgementText:"<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost. Aplikace nenese odpovědnost za případné negativní důsledky této změny.",confirmText:"Potvrdit změnu",cancelText:"Zrušit",showLimitInput:a,limitValue:o,limitMin:1,limitMax:2e4,limitStep:100},u=await this.confirmDialog.showDialog(p);if(!u.confirmed||!ae.shouldProceedWithQueue())return;const h=this.shieldState.gridDeliveryState.currentLiveDelivery==="limited",g=t==="limited";h&&g&&u.limit!=null?await ae.setGridDelivery(t,u.limit):g&&u.limit!=null?await ae.setGridDelivery(t,u.limit):await ae.setGridDelivery(t)}async onBoilerModeChange(e){const{mode:t}=e.detail,i=$o[t],n=_o[t];if(C.debug("Control panel: boiler mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu bojleru",message:`Chystáte se změnit režim bojleru na <strong>"${n} ${i}"</strong>.<br><br>Tato změna ovlivní chování ohřevu vody a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!ae.shouldProceedWithQueue())return;await ae.setBoilerMode(t)||C.warn("Boiler mode change failed or already active",{mode:t})}async onSupplementaryToggle(e){const{key:t}=e.detail,i=t==="home_grid_v"?"Home 5":"Home 6",n=!this.shieldState.supplementary[t];if(C.debug("Control panel: supplementary toggle requested",{key:t}),!(await this.confirmDialog.showDialog({title:"Změna doplňkového režimu",message:`Chystáte se přepnout <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování systému a může trvat až 10 minut.`,warning:"Změna může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!ae.shouldProceedWithQueue())return;await ae.setSupplementaryToggle(t,n)||C.warn("Supplementary toggle failed",{key:t})}async onQueueRemoveItem(e){const{position:t}=e.detail;C.debug("Control panel: queue remove requested",{position:t});const i=this.shieldState.allRequests.find(o=>o.position===t);let n="Operace";if(i&&(i.service.includes("set_box_mode")?n=`Změna režimu na ${i.targetValue||"neznámý"}`:i.service.includes("set_grid_delivery")?n=`Změna dodávky do sítě na ${i.targetValue||"neznámý"}`:i.service.includes("set_boiler_mode")&&(n=`Změna režimu bojleru na ${i.targetValue||"neznámý"}`)),!(await this.confirmDialog.showDialog({title:n,message:"Operace bude odstraněna z fronty bez provedení.",requireAcknowledgement:!1,confirmText:"OK",cancelText:"Zrušit"})).confirmed)return;await ae.removeFromQueue(t)||C.warn("Failed to remove from queue",{position:t})}render(){const e=this.shieldState,t=e.status==="running"?"running":"idle",i=e.status==="running"?"Zpracovává":"Připraveno",n=e.allRequests.length>0;return c`
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
        `:k}
      </div>

      <!-- Shared confirm dialog instance -->
      <oig-confirm-dialog></oig-confirm-dialog>
    `}};tn.styles=M`
    :host {
      display: block;
      margin-top: 16px;
    }

    .control-panel {
      background: ${Zt(s.cardBg)};
      border-radius: 16px;
      box-shadow: ${Zt(s.cardShadow)};
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid ${Zt(s.divider)};
    }

    .panel-title {
      font-size: 15px;
      font-weight: 600;
      color: ${Zt(s.textPrimary)};
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
      background: ${Zt(s.divider)};
      margin: 16px 0;
    }

    .queue-section {
      border-top: 1px solid ${Zt(s.divider)};
    }

    @media (max-width: 480px) {
      .panel-body {
        padding: 12px 14px;
      }
    }
  `;ra([T()],tn.prototype,"shieldState",2);ra([Gn("oig-confirm-dialog")],tn.prototype,"_confirmDialogQuery",2);tn=ra([E("oig-control-panel")],tn);var Sg=Object.defineProperty,Cg=Object.getOwnPropertyDescriptor,wi=(e,t,i,n)=>{for(var r=n>1?void 0:n?Cg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Sg(t,i,r),r};const _e=Z;let yt=class extends z{constructor(){super(...arguments),this.open=!1,this.currentSoc=0,this.maxSoc=100,this.estimate=null,this.targetSoc=80}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onSliderInput(e){this.targetSoc=parseInt(e.target.value,10),this.dispatchEvent(new CustomEvent("soc-change",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}onConfirm(){this.dispatchEvent(new CustomEvent("confirm",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}render(){return c`
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
    `}};yt.styles=M`
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
      background: ${_e(s.cardBg)};
      border-radius: 16px;
      padding: 24px;
      min-width: 320px;
      max-width: 90vw;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${_e(s.textPrimary)};
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
      color: ${_e(s.textSecondary)};
    }

    .soc-value {
      font-size: 24px;
      font-weight: 600;
      color: ${_e(s.textPrimary)};
    }

    .soc-arrow {
      font-size: 20px;
      color: ${_e(s.textSecondary)};
    }

    .slider-container {
      margin: 16px 0;
    }

    .slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: ${_e(s.bgSecondary)};
      -webkit-appearance: none;
      appearance: none;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${_e(s.accent)};
      cursor: pointer;
    }

    .estimate {
      background: ${_e(s.bgSecondary)};
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
      color: ${_e(s.textSecondary)};
    }

    .estimate-value {
      color: ${_e(s.textPrimary)};
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
      background: ${_e(s.bgSecondary)};
      color: ${_e(s.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${_e(s.divider)};
    }

    .btn-confirm {
      background: ${_e(s.accent)};
      color: #fff;
    }

    .btn-confirm:hover {
      opacity: 0.9;
    }
  `;wi([f({type:Boolean})],yt.prototype,"open",2);wi([f({type:Number})],yt.prototype,"currentSoc",2);wi([f({type:Number})],yt.prototype,"maxSoc",2);wi([f({type:Object})],yt.prototype,"estimate",2);wi([T()],yt.prototype,"targetSoc",2);yt=wi([E("oig-battery-charge-dialog")],yt);var Pg=Object.defineProperty,Tg=Object.getOwnPropertyDescriptor,Be=(e,t,i,n)=>{for(var r=n>1?void 0:n?Tg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Pg(t,i,r),r};function ni(e){return e==null||Number.isNaN(e)?"-- kWh":`${e.toFixed(Math.abs(e)>=10?1:2)} kWh`}const Mr=Z,aa=M`
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
`;let nn=class extends z{constructor(){super(...arguments),this.title="",this.icon="📊"}render(){return c`
      <div class="block-header">
        <span class="block-icon">${this.icon}</span>
        <span class="block-title">${this.title}</span>
      </div>
      <slot></slot>
    `}};nn.styles=M`
    :host {
      display: block;
      background: ${Mr(s.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${Mr(s.cardShadow)};
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
      color: ${Mr(s.textPrimary)};
    }

    ${aa}
  `;Be([f({type:String})],nn.prototype,"title",2);Be([f({type:String})],nn.prototype,"icon",2);nn=Be([E("oig-analytics-block")],nn);let Wn=class extends z{constructor(){super(...arguments),this.data=null}render(){if(!this.data)return c`<div>Načítání...</div>`;const e=this.data.trend>=0?"positive":"negative",t=this.data.trend>=0?"+":"",i=this.data.period==="last_month"?"Minulý měsíc":`Aktuální měsíc (${this.data.currentMonthDays} dní)`;return c`
      <div class="efficiency-value">${ii(this.data.efficiency,1)}</div>
      <div class="period-label"
        title="Coulombická (DC) účinnost článků baterie. Celková AC účinnost vč. střídače, se kterou počítá ekonomika plánovače, je ~84 %.">
        ${i} · DC (články)
      </div>

      ${this.data.trend!==0?c`
        <div class="comparison ${e}">
          ${t}${ii(this.data.trend)} vs minulý měsíc
        </div>
      `:null}

      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${ni(this.data.charged)}</div>
          <div class="stat-label">Nabito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${ni(this.data.discharged)}</div>
          <div class="stat-label">Vybito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${ni(this.data.losses)}</div>
          <div class="stat-label">Ztráty</div>
          ${this.data.lossesPct?c`
            <div class="losses-pct">${ii(this.data.lossesPct,1)}</div>
          `:null}
        </div>
      </div>
    `}};Wn.styles=M`
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
  `;Be([f({type:Object})],Wn.prototype,"data",2);Wn=Be([E("oig-battery-efficiency")],Wn);let Kn=class extends z{constructor(){super(...arguments),this.data=null}renderSparkline(){var d;const e=(d=this.data)==null?void 0:d.measurementHistory;if(!e||e.length<2)return null;const t=e.map(p=>p.soh_percent),i=Math.min(...t)-1,r=Math.max(...t)+1-i||1,a=200,o=40,l=t.map((p,u)=>{const h=u/(t.length-1)*a,g=o-(p-i)/r*o;return`${h},${g}`}).join(" ");return c`
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
          <span class="metric-value">${ii(this.data.soh,1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Kapacita (P80)</span>
          <span class="metric-value">${ni(this.data.capacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Min. kapacita (P20)</span>
          <span class="metric-value">${ni(this.data.minCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Nominální kapacita</span>
          <span class="metric-value">${ni(this.data.nominalCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Počet měření</span>
          <span class="metric-value">${this.data.measurementCount}</span>
        </div>
        ${this.data.qualityScore!=null?c`
          <div class="metric">
            <span class="metric-label">Kvalita dat</span>
            <span class="metric-value">${ii(this.data.qualityScore,0)}</span>
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
                Spolehlivost: <span class="prediction-value">${ii(this.data.trendConfidence,0)}</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:c`<div>Načítání...</div>`}};Kn.styles=M`
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

    ${aa}

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
  `;Be([f({type:Object})],Kn.prototype,"data",2);Kn=Be([E("oig-battery-health")],Kn);let qn=class extends z{constructor(){super(...arguments),this.data=null}getProgressClass(e){return e==null?"ok":e>=95?"overdue":e>=80?"due-soon":"ok"}statusLabel(e){var i;return{unknown:"Žádné",idle:"Nečinné",charging:"Nabíjení",holding:"Držení 100 %",completed:"Dokončeno"}[(i=e==null?void 0:e.toLowerCase)==null?void 0:i.call(e)]??e}render(){return this.data?!(this.data.lastBalancing&&this.data.lastBalancing!=="—"||this.data.nextScheduled!=null||this.data.progressPercent!=null)&&(this.data.status??"unknown").toLowerCase()==="unknown"?c`
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
            <span class="metric-value">${ie(this.data.cost)}</span>
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
            <span class="metric-value">${ie(this.data.estimatedNextCost)}</span>
          </div>
        `:null}
      </oig-analytics-block>
    `:c`<div>Načítání...</div>`}};qn.styles=M`
    :host { display: block; }
    ${aa}

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
  `;Be([f({type:Object})],qn.prototype,"data",2);qn=Be([E("oig-battery-balancing")],qn);let Yn=class extends z{constructor(){super(...arguments),this.data=null}render(){return this.data?c`
      <oig-analytics-block title="Porovnání nákladů" icon="💰">
        <div class="cost-row">
          <span class="cost-label">Skutečné náklady</span>
          <span class="cost-value">${ie(this.data.actualSpent)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Odhad dnes celkem</span>
          <span class="cost-value">${ie(this.data.planTotalCost)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Zbývající plán</span>
          <span class="cost-value">${ie(this.data.futurePlanCost)}</span>
        </div>
        ${this.data.tomorrowCost!=null?c`
          <div class="cost-row">
            <span class="cost-label">Zítra odhad</span>
            <span class="cost-value">${ie(this.data.tomorrowCost)}</span>
          </div>
        `:null}

        ${this.data.yesterdayActualCost!=null?c`
          <div class="yesterday-section">
            <div class="section-label">Včera</div>
            <div class="cost-row">
              <span class="cost-label">Plán</span>
              <span class="cost-value">${this.data.yesterdayPlannedCost!=null?ie(this.data.yesterdayPlannedCost):"—"}</span>
            </div>
            <div class="cost-row">
              <span class="cost-label">Skutečnost</span>
              <span class="cost-value">${ie(this.data.yesterdayActualCost)}</span>
            </div>
            ${this.data.yesterdayDelta!=null?c`
              <div class="cost-row">
                <span class="cost-label">Rozdíl</span>
                <span class="cost-value ${this.data.yesterdayDelta<=0?"delta-positive":"delta-negative"}">
                  ${this.data.yesterdayDelta>=0?"+":""}${ie(this.data.yesterdayDelta)}
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
    `:c`<div>Načítání...</div>`}};Yn.styles=M`
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
  `;Be([f({type:Object})],Yn.prototype,"data",2);Yn=Be([E("oig-cost-comparison")],Yn);var Mg=Object.defineProperty,Dg=Object.getOwnPropertyDescriptor,$i=(e,t,i,n)=>{for(var r=n>1?void 0:n?Dg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Mg(t,i,r),r};const Jt=Z;let rn=class extends z{constructor(){super(...arguments),this.data=ji,this.compact=!1,this.onClick=()=>{this.dispatchEvent(new CustomEvent("badge-click",{bubbles:!0}))}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.onClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.onClick)}render(){const e=this.data.effectiveSeverity,t=Mn[e]??Mn[0],i=this.data.warningsCount>0&&e>0,n=i?Oo(this.data.eventType):"✓";return c`
      <style>
        :host { background: ${Jt(t)}; }
      </style>
      <span class="badge-icon">${n}</span>
      ${i?c`
        <span class="badge-count">${this.data.warningsCount}</span>
      `:null}
      <span class="badge-label">${i?Lo[e]??"Výstraha":"OK"}</span>
    `}};rn.styles=M`
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
  `;$i([f({type:Object})],rn.prototype,"data",2);$i([f({type:Boolean})],rn.prototype,"compact",2);rn=$i([E("oig-chmu-badge")],rn);let an=class extends z{constructor(){super(...arguments),this.open=!1,this.data=ji}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}formatTime(e){return e?new Date(e).toLocaleString("cs-CZ"):"—"}renderWarning(e){const t=Mn[e.severity]??Mn[2],i=Oo(e.event_type),n=Lo[e.severity]??"Neznámá";return c`
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
    `}};an.styles=M`
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
      background: ${Jt(s.cardBg)};
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
      color: ${Jt(s.textPrimary)};
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      font-size: 20px;
      cursor: pointer;
      color: ${Jt(s.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${Jt(s.bgSecondary)};
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
      color: ${Jt(s.textSecondary)};
    }

    .eta-badge {
      display: inline-block;
      font-size: 10px;
      padding: 1px 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      margin-left: 6px;
    }
  `;$i([f({type:Boolean,reflect:!0})],an.prototype,"open",2);$i([f({type:Object})],an.prototype,"data",2);an=$i([E("oig-chmu-modal")],an);const so=new URLSearchParams(window.location.search),ls=so.get("sn")||so.get("inverter_sn")||"";async function zg(){const e=await ne.fetchOIGAPI(`/${ls}/module_config`);return!e||e.error?(C.warn("[Settings] module_config load failed",e),null):e}async function Eg(e,t){const i=await ne.fetchOIGAPI(`/${ls}/module_config`,{method:"POST",body:JSON.stringify({section:e,values:t})});return i&&(i.updated===!0||i.updated===!1)?{ok:!0}:{ok:!1,fields:i==null?void 0:i.fields}}var Og=Object.defineProperty,Lg=Object.getOwnPropertyDescriptor,_i=(e,t,i,n)=>{for(var r=n>1?void 0:n?Lg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Og(t,i,r),r};const we=Z,Ag=[{key:"enable_battery_prediction",label:"Predikce baterie a plánovač",type:"bool",hint:"Ekonomické plánování nabíjení, timeline, úspory"},{key:"enable_solar_forecast",label:"Solární předpověď",type:"bool",hint:"Předpověď výroby FVE (forecast.solar / Solcast)"},{key:"enable_pricing",label:"Ceny energie",type:"bool",hint:"Spotové ceny OTE, výkup, distribuce"},{key:"enable_boiler",label:"Bojler",type:"bool",hint:"Inteligentní ohřev vody"},{key:"enable_statistics",label:"Statistiky",type:"bool"},{key:"enable_extended_sensors",label:"Rozšířené senzory",type:"bool"},{key:"enable_chmu_warnings",label:"Výstrahy ČHMÚ",type:"bool"}],Fg=[{key:"auto_mode_switch_enabled",label:"Automatické přepínání režimů",type:"bool",hint:"Plánovač sám přepíná Home 1 / Home UPS podle plánu"},{key:"charge_rate_kw",label:"Nabíjecí výkon ze sítě (kW)",type:"number",min:.5,max:10,step:.1,hint:"Kolik kW box bere při nabíjení ze sítě (UPS)"},{key:"expensive_percentile",label:"Práh drahých hodin (%)",type:"number",min:50,max:95,step:5,scale:100,hint:"Importy nad tímto denním percentilem cen se plánovač snaží pokrýt levným přednabitím. Výchozí 70 %."},{key:"balancing_enabled",label:"Balancování článků",type:"bool",hint:"Pravidelné nabití na 100 % kvůli vyrovnání článků"},{key:"balancing_interval_days",label:"Interval balancování (dny)",type:"number",min:3,max:30,step:1},{key:"balancing_hold_hours",label:"Držení 100 % (hodiny)",type:"number",min:1,max:12,step:1},{key:"cheap_window_percentile",label:"Levné okno pro balancování (%)",type:"number",min:5,max:80,step:5,hint:"Balancování se plánuje do hodin pod tímto cenovým percentilem"}],Ig=[{key:"solar_forecast_provider",label:"Poskytovatel",type:"select",options:[["forecast_solar","forecast.solar"],["solcast","Solcast"]]},{key:"solcast_site_id",label:"Solcast site ID",type:"text",hint:"Jen pro Solcast (z rooftop site URL)"},{key:"solcast_api_key",label:"Solcast API klíč",type:"text",hint:"Nech prázdné = beze změny"},{key:"solar_forecast_latitude",label:"Zeměpisná šířka",type:"number",min:-90,max:90,step:1e-4},{key:"solar_forecast_longitude",label:"Zeměpisná délka",type:"number",min:-180,max:180,step:1e-4},{key:"solar_forecast_string1_enabled",label:"String 1 aktivní",type:"bool"},{key:"solar_forecast_string1_kwp",label:"String 1 výkon (kWp)",type:"number",min:.1,max:50,step:.1},{key:"solar_forecast_string1_declination",label:"String 1 sklon (°)",type:"number",min:0,max:90,step:1},{key:"solar_forecast_string1_azimuth",label:"String 1 azimut (°)",type:"number",min:-180,max:180,step:1,hint:"0 = jih, −90 = východ, 90 = západ"},{key:"solar_forecast_string2_enabled",label:"String 2 aktivní",type:"bool"},{key:"solar_forecast_string2_kwp",label:"String 2 výkon (kWp)",type:"number",min:.1,max:50,step:.1},{key:"solar_forecast_string2_declination",label:"String 2 sklon (°)",type:"number",min:0,max:90,step:1},{key:"solar_forecast_string2_azimuth",label:"String 2 azimut (°)",type:"number",min:-180,max:180,step:1}];let vt=class extends z{constructor(){super(...arguments),this.config=null,this.loading=!0,this.pending={},this.saving=null,this.toast=null}connectedCallback(){super.connectedCallback(),this.refresh()}async refresh(){this.loading=!0,this.config=await zg(),this.pending={},this.loading=!1}current(e,t){var r;const i=this.pending[e];if(i&&t in i)return i[t];const n=(r=this.config)==null?void 0:r[e];return n?n[t]:void 0}setPending(e,t,i){this.pending={...this.pending,[e]:{...this.pending[e]??{},[t]:i}}}isDirty(e){return Object.keys(this.pending[e]??{}).length>0}async save(e){const t=this.pending[e];if(!t||this.saving)return;this.saving=e,this.toast=null;const i=await Eg(e,t);if(this.saving=null,i.ok)this.toast={section:e,ok:!0,text:"✓ Uloženo — integrace se aplikuje během chvilky"},await this.refresh();else{const n=i.fields?Object.entries(i.fields).map(([r,a])=>`${r}: ${a}`).join(", "):"uložení selhalo";this.toast={section:e,ok:!1,text:`✗ ${n}`}}}renderField(e,t){const i=this.current(e,t.key),n=!!(this.pending[e]&&t.key in this.pending[e]);if(t.type==="bool"){const l=!!i;return c`
        <div class="row">
          <span class="lab">${t.label}${t.hint?c`<span class="hint">${t.hint}</span>`:k}</span>
          <label class="switch">
            <input type="checkbox" .checked=${l}
              @change=${d=>this.setPending(e,t.key,d.target.checked)} />
            <span class="slider"></span>
          </label>
        </div>`}if(t.type==="select"){const l=String(i??"");return c`
        <div class="row">
          <span class="lab">${t.label}${t.hint?c`<span class="hint">${t.hint}</span>`:k}</span>
          <select class=${n?"dirty":""}
            @change=${d=>this.setPending(e,t.key,d.target.value)}>
            ${(t.options??[]).map(([d,p])=>c`<option value=${d} ?selected=${d===l}>${p}</option>`)}
          </select>
        </div>`}if(t.type==="number"){const l=t.scale??1,d=i==null||i===""?"":String(Math.round((Number(i)*l+Number.EPSILON)*1e4)/1e4);return c`
        <div class="row">
          <span class="lab">${t.label}${t.hint?c`<span class="hint">${t.hint}</span>`:k}</span>
          <input type="number" class=${n?"dirty":""} .value=${d}
            min=${t.min??k} max=${t.max??k} step=${t.step??k}
            @change=${p=>{const u=p.target.value;u!==""&&this.setPending(e,t.key,Number(u)/l)}} />
        </div>`}const r=t.key.endsWith("api_key"),a=r&&!!this.current(e,`${t.key}_set`),o=r?"":String(i??"");return c`
      <div class="row">
        <span class="lab">${t.label}${t.hint?c`<span class="hint">${t.hint}</span>`:k}</span>
        <input type="text" class=${n?"dirty":""} .value=${o}
          placeholder=${r?a?"••••• (nastaveno)":"nenastaveno":""}
          @change=${l=>this.setPending(e,t.key,l.target.value)} />
      </div>`}renderCard(e,t,i,n){var a;const r=((a=this.toast)==null?void 0:a.section)===e?this.toast:null;return c`
      <div class="card">
        <h2>${t}</h2>
        <div class="sub">${i}</div>
        ${n.map(o=>this.renderField(e,o))}
        <div class="actions">
          <button class="save" ?disabled=${!this.isDirty(e)||this.saving===e}
            @click=${()=>this.save(e)}>
            ${this.saving===e?"Ukládám…":"Uložit"}
          </button>
          ${r?c`<span class="toast ${r.ok?"ok":"err"}">${r.text}</span>`:k}
        </div>
      </div>`}render(){return this.loading?c`<div class="loading">Načítání nastavení…</div>`:this.config?c`
      <div class="grid">
        ${this.renderCard("modules","🧩 Moduly","Zapnutí modulu přidá senzory a záložky; konfigurace níže.",Ag)}
        ${this.renderCard("battery","🔋 Baterie a plánovač","Parametry ekonomického plánovače a balancování.",Fg)}
        ${this.renderCard("solar","☀️ Solární předpověď","Poskytovatel a geometrie stringů.",Ig)}
      </div>
      <div class="note">
        💰 Ceny energie a 🔥 Bojler mají vícekrokové průvodce — najdeš je v
        <b>HA → Nastavení → Zařízení a služby → OIG Cloud → Konfigurovat</b>
        (menu skočí rovnou na sekci).
      </div>
    `:c`<div class="loading">Nastavení se nepodařilo načíst (vyžaduje administrátorský účet).</div>`}};vt.styles=M`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 14px;
      align-items: start;
    }

    .card {
      background: ${we(s.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${we(s.cardShadow)};
    }

    .card h2 {
      margin: 0 0 4px;
      font-size: 15px;
      color: ${we(s.textPrimary)};
    }

    .card .sub {
      font-size: 11px;
      color: ${we(s.textSecondary)};
      margin-bottom: 12px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 7px 0;
      border-bottom: 1px dashed ${we(s.divider)};
    }
    .row:last-of-type { border-bottom: none; }

    .lab { font-size: 12.5px; color: ${we(s.textPrimary)}; }
    .hint { display: block; font-size: 10.5px; color: ${we(s.textSecondary)}; margin-top: 1px; max-width: 270px; }

    input[type='number'], input[type='text'], select {
      background: ${we(s.bgSecondary)};
      color: ${we(s.textPrimary)};
      border: 1px solid ${we(s.divider)};
      border-radius: 7px;
      padding: 5px 8px;
      font-size: 12.5px;
      width: 130px;
    }
    input[type='text'] { width: 170px; }
    input.dirty, select.dirty { border-color: ${we(s.accent)}; }

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
    .switch input:checked + .slider { background: ${we(s.accent)}; }
    .switch input:checked + .slider:before { transform: translateX(18px); }

    .actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
    button.save {
      background: ${we(s.accent)};
      color: #fff; border: none; border-radius: 8px;
      padding: 7px 16px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    button.save:disabled { opacity: 0.45; cursor: default; }
    .toast { font-size: 12px; }
    .toast.ok { color: #9fe6a8; }
    .toast.err { color: #ff9d93; }

    .note {
      font-size: 11.5px;
      color: ${we(s.textSecondary)};
      background: rgba(120,160,255,0.08);
      border: 1px solid rgba(120,160,255,0.2);
      border-radius: 8px;
      padding: 8px 10px;
      margin-top: 12px;
      line-height: 1.45;
    }

    .loading { padding: 30px; text-align: center; color: ${we(s.textSecondary)}; }
  `;_i([T()],vt.prototype,"config",2);_i([T()],vt.prototype,"loading",2);_i([T()],vt.prototype,"pending",2);_i([T()],vt.prototype,"saving",2);_i([T()],vt.prototype,"toast",2);vt=_i([E("oig-settings")],vt);var Bg=Object.defineProperty,Ng=Object.getOwnPropertyDescriptor,tt=(e,t,i,n)=>{for(var r=n>1?void 0:n?Ng(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Bg(t,i,r),r};const H=Z;function Rg(e,t,i,n){const r=Math.abs(e);return r===1?t:r>=2&&r<=4?i:n}function cs(e){return`${e} ${Rg(e,"blok","bloky","bloků")}`}function ds(e){return`${e} přepnutí`}let Bt=class extends z{constructor(){super(...arguments),this.open=!1,this.activeTab="today",this.data=null,this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.open&&this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return Ao[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return c`
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
          <span class="mode-cost">${ie(e.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(e,t){const i=t.unit==="Kč"?ie(t.plan):`${t.plan.toFixed(1)} ${t.unit}`;let n="",r="";return t.hasActual&&t.actual!=null&&(r=t.unit==="Kč"?ie(t.actual):`${t.actual.toFixed(1)} ${t.unit}`,t.unit==="Kč"?n=t.actual<=t.plan?"better":"worse":n=t.actual>=t.plan?"better":"worse"),c`
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
              ${Fo[t]}
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
                ${t.backupSavings>=0?"+":""}${ie(t.backupSavings)}
              </span>
              <span class="bs-detail">
                záloha ${ie(t.backupActualCost??0)} vs. nedělat nic
                ${ie(t.backupBaselineCost??0)}
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
              Skutečné: <span class="progress-value">${ie(t.actualTotalCost)}</span>
            </div>
          `:null}
          ${t.planTotalCost!=null?c`
            <div class="progress-item">
              Plán: <span class="progress-value">${ie(t.planTotalCost)}</span>
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
          Predikce konce dne: <span class="eod-value">${ie(t.eodPrediction.predictedTotal)}</span>
          ${t.eodPrediction.predictedSavings>0?c`
            <span class="eod-savings"> (úspora ${ie(t.eodPrediction.predictedSavings)})</span>
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
          <div class="section-title">Režimy (${cs(e.modeBlocks.length)}, ${ds(t.modeSwitches)})</div>
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
    `}};Bt.styles=M`
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
      background: ${H(s.cardBg)};
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
      border-bottom: 1px solid ${H(s.divider)};
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${H(s.textPrimary)};
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
      color: ${H(s.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${H(s.bgSecondary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${H(s.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${H(s.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 12px 16px;
      border: none;
      background: transparent;
      font-size: 13px;
      color: ${H(s.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${H(s.textPrimary)};
    }

    .tab.active {
      color: ${H(s.accent)};
      border-bottom-color: ${H(s.accent)};
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
      color: ${H(s.textSecondary)};
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
      background: ${H(s.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
    }

    .metric-label {
      font-size: 11px;
      color: ${H(s.textSecondary)};
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
      color: ${H(s.textPrimary)};
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
      color: ${H(s.textPrimary)};
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
      color: ${H(s.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${H(s.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${H(s.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 12px;
      color: ${H(s.textSecondary)};
    }

    .eod-value {
      font-size: 16px;
      font-weight: 600;
      color: ${H(s.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: ${H(s.textSecondary)};
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
  `;tt([f({type:Boolean,reflect:!0})],Bt.prototype,"open",2);tt([f({type:String})],Bt.prototype,"activeTab",2);tt([f({type:Object})],Bt.prototype,"data",2);tt([T()],Bt.prototype,"autoRefresh",2);Bt=tt([E("oig-timeline-dialog")],Bt);let gi=class extends z{constructor(){super(...arguments),this.data=null,this.activeTab="today",this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return Ao[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return c`
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
          <span class="mode-cost">${ie(e.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(e,t){const i=t.unit==="Kč"?ie(t.plan):`${t.plan.toFixed(1)} ${t.unit}`;let n="",r="";return t.hasActual&&t.actual!=null&&(r=t.unit==="Kč"?ie(t.actual):`${t.actual.toFixed(1)} ${t.unit}`,t.unit==="Kč"?n=t.actual<=t.plan?"better":"worse":n=t.actual>=t.plan?"better":"worse"),c`
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
              ${Fo[t]}
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
                ${t.backupSavings>=0?"+":""}${ie(t.backupSavings)}
              </span>
              <span class="bs-detail">
                záloha ${ie(t.backupActualCost??0)} vs. nedělat nic
                ${ie(t.backupBaselineCost??0)}
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
              Skutečné: <span class="progress-value">${ie(t.actualTotalCost)}</span>
            </div>
          `:null}
          ${t.planTotalCost!=null?c`
            <div class="progress-item">
              Plán: <span class="progress-value">${ie(t.planTotalCost)}</span>
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
          Predikce konce dne: <span class="eod-value">${ie(t.eodPrediction.predictedTotal)}</span>
          ${t.eodPrediction.predictedSavings>0?c`
            <span class="eod-savings"> (úspora ${ie(t.eodPrediction.predictedSavings)})</span>
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
          <div class="section-title">Režimy (${cs(e.modeBlocks.length)}, ${ds(t.modeSwitches)})</div>
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
    `}};gi.styles=M`
    :host {
      display: block;
    }

    .tile {
      background: ${H(s.cardBg)};
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
      border-bottom: 1px solid ${H(s.divider)};
    }

    .tile-title {
      font-size: 13px;
      font-weight: 600;
      color: ${H(s.textPrimary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${H(s.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${H(s.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 6px 10px;
      border: none;
      background: transparent;
      font-size: 11px;
      color: ${H(s.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${H(s.textPrimary)};
    }

    .tab.active {
      color: ${H(s.accent)};
      border-bottom-color: ${H(s.accent)};
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
      color: ${H(s.textSecondary)};
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
      background: ${H(s.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
    }

    .metric-label {
      font-size: 10px;
      color: ${H(s.textSecondary)};
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
      color: ${H(s.textPrimary)};
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
      color: ${H(s.textPrimary)};
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
      color: ${H(s.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${H(s.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${H(s.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${H(s.textSecondary)};
    }

    .eod-value {
      font-size: 14px;
      font-weight: 600;
      color: ${H(s.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 24px 16px;
      color: ${H(s.textSecondary)};
      font-size: 12px;
    }

    /* ---- Battery savings (záloha-only, fair) ---- */
    .backup-savings {
      background: ${H(s.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${H(s.textSecondary)};
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
  `;tt([f({type:Object})],gi.prototype,"data",2);tt([f({type:String})],gi.prototype,"activeTab",2);tt([T()],gi.prototype,"autoRefresh",2);gi=tt([E("oig-timeline-tile")],gi);var jg=Object.defineProperty,Hg=Object.getOwnPropertyDescriptor,wt=(e,t,i,n)=>{for(var r=n>1?void 0:n?Hg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&jg(t,i,r),r};const pe=Z;let fi=class extends z{constructor(){super(...arguments),this.data=null,this.editMode=!1,this.tileType="entity"}onTileClick(){var t;if(this.editMode)return;const e=(t=this.data)==null?void 0:t.config;e&&(e.type==="button"&&e.action?Nc(e.entity_id,e.action):ne.openEntityDialog(e.entity_id))}onSupportClick(e,t){e.stopPropagation(),!this.editMode&&ne.openEntityDialog(t)}onEdit(){var e;this.dispatchEvent(new CustomEvent("edit-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}onDelete(){var e;this.dispatchEvent(new CustomEvent("delete-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}render(){var d,p;if(!this.data)return null;const e=this.data.config,t=e.type==="button";this.tileType!==e.type&&(this.tileType=e.type??"entity");const i=e.color||"",n=e.icon||(t?"⚡":"📊"),r=n.startsWith("mdi:")?Dn(n):n,a=(d=e.support_entities)==null?void 0:d.top_right,o=(p=e.support_entities)==null?void 0:p.bottom_right,l=this.data.supportValues.topRight||this.data.supportValues.bottomRight;return c`
      ${i?c`<style>:host { --tile-color: ${pe(i)}; }</style>`:null}

      <div class="tile-top" @click=${this.onTileClick} title=${this.editMode?"":e.entity_id}>
        <span class="tile-icon">${r}</span>
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
    `}};fi.styles=M`
    /* ===== BASE ===== */
    :host {
      display: flex;
      flex-direction: column;
      padding: 10px 12px;
      background: ${pe(s.cardBg)};
      border-radius: 10px;
      box-shadow: ${pe(s.cardShadow)};
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
      color: ${pe(s.textSecondary)};
      opacity: 0.45;
      font-style: normal;
    }

    /* ===== BUTTON TILE ===== */
    :host([tiletype="button"]) {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--tile-color, ${pe(s.accent)}) 10%, ${pe(s.cardBg)}),
        ${pe(s.cardBg)}
      );
      border: 1px solid color-mix(in srgb, var(--tile-color, ${pe(s.accent)}) 38%, transparent);
    }

    :host([tiletype="button"]:not([editmode]):hover) {
      transform: translateY(-2px);
      cursor: pointer;
      box-shadow:
        0 4px 14px color-mix(in srgb, var(--tile-color, ${pe(s.accent)}) 28%, transparent),
        ${pe(s.cardShadow)};
    }

    :host([tiletype="button"]:not([editmode]):active) {
      transform: translateY(0) scale(0.98);
      opacity: 0.85;
    }

    :host([tiletype="button"]) .tile-icon {
      background: color-mix(in srgb, var(--tile-color, ${pe(s.accent)}) 18%, transparent);
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
      color: ${pe(s.textSecondary)};
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
      color: ${pe(s.textSecondary)};
      white-space: nowrap;
      line-height: 1.2;
    }

    .support-value.clickable {
      cursor: pointer;
    }

    .support-value.clickable:hover {
      text-decoration: underline;
      color: ${pe(s.textPrimary)};
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
      color: ${pe(s.textPrimary)};
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .tile-unit {
      font-size: 11px;
      font-weight: 400;
      color: ${pe(s.textSecondary)};
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
      background: ${pe(s.success)};
      box-shadow: 0 0 4px ${pe(s.success)};
    }

    .state-dot.off {
      background: ${pe(s.textSecondary)};
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
      background: ${pe(s.bgSecondary)};
      border-radius: 50%;
      font-size: 9px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .delete-btn:hover {
      background: ${pe(s.error)};
      color: #fff;
    }
  `;wt([f({type:Object})],fi.prototype,"data",2);wt([f({type:Boolean})],fi.prototype,"editMode",2);wt([f({type:String,reflect:!0})],fi.prototype,"tileType",2);fi=wt([E("oig-tile")],fi);let mi=class extends z{constructor(){super(...arguments),this.tiles=[],this.editMode=!1,this.position="left"}render(){return this.tiles.length===0?c`<div class="empty-state">Žádné dlaždice</div>`:c`
      ${this.tiles.map(e=>c`
        <oig-tile
          .data=${e}
          .editMode=${this.editMode}
          .tileType=${e.config.type??"entity"}
          class="${e.isZero?"inactive":""}"
        ></oig-tile>
      `)}
    `}};mi.styles=M`
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }

    .empty-state {
      font-size: 12px;
      color: ${pe(s.textSecondary)};
      padding: 8px;
      text-align: center;
      opacity: 0.6;
    }
  `;wt([f({type:Array})],mi.prototype,"tiles",2);wt([f({type:Boolean})],mi.prototype,"editMode",2);wt([f({type:String,reflect:!0})],mi.prototype,"position",2);mi=wt([E("oig-tiles-container")],mi);var Vg=Object.defineProperty,Wg=Object.getOwnPropertyDescriptor,oa=(e,t,i,n)=>{for(var r=n>1?void 0:n?Wg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Vg(t,i,r),r};const oe=Z,lo={Spotrebice:["fridge","fridge-outline","dishwasher","washing-machine","tumble-dryer","stove","microwave","coffee-maker","kettle","toaster","blender","food-processor","rice-cooker","slow-cooker","pressure-cooker","air-fryer","oven","range-hood"],Osvetleni:["lightbulb","lightbulb-outline","lamp","ceiling-light","floor-lamp","led-strip","led-strip-variant","wall-sconce","chandelier","desk-lamp","spotlight","light-switch"],"Vytapeni & Chlazeni":["thermometer","thermostat","radiator","radiator-disabled","heat-pump","air-conditioner","fan","hvac","fire","snowflake","fireplace","heating-coil"],"Energie & Baterie":["lightning-bolt","flash","battery","battery-charging","battery-50","battery-10","solar-panel","solar-power","meter-electric","power-plug","power-socket","ev-plug","transmission-tower","current-ac","current-dc"],"Auto & Doprava":["car","car-electric","car-battery","ev-station","ev-plug-type2","garage","garage-open","motorcycle","bicycle","scooter","bus","train","airplane"],Zabezpeceni:["door","door-open","lock","lock-open","shield-home","cctv","camera","motion-sensor","alarm-light","bell","eye","key","fingerprint","shield-check"],"Okna & Stineni":["window-closed","window-open","blinds","blinds-open","curtains","roller-shade","window-shutter","balcony","door-sliding"],"Media & Zabava":["television","speaker","speaker-wireless","music","volume-high","cast","chromecast","radio","headphones","microphone","gamepad","movie","spotify"],"Sit & IT":["router-wireless","wifi","access-point","lan","network","home-assistant","server","nas","cloud","ethernet","bluetooth","cellphone","tablet","laptop"],"Voda & Koupelna":["water","water-percent","water-boiler","water-pump","shower","toilet","faucet","pipe","bathtub","sink","water-heater","pool"],Pocasi:["weather-sunny","weather-cloudy","weather-night","weather-rainy","weather-snowy","weather-windy","weather-fog","weather-lightning","weather-hail","temperature","humidity","barometer"],"Ventilace & Kvalita vzduchu":["fan","air-filter","air-purifier","smoke-detector","co2","wind-turbine"],"Zahrada & Venku":["flower","tree","sprinkler","grass","garden-light","outdoor-lamp","grill","pool","hot-tub","umbrella","thermometer-lines"],Domacnost:["iron","vacuum","broom","mop","washing","basket","hanger","scissors"],"Notifikace & Stav":["information","help-circle","alert-circle","checkbox-marked-circle","check","close","minus","plus","arrow-up","arrow-down","refresh","sync","bell-ring"],Ovladani:["toggle-switch","power","play","pause","stop","skip-next","skip-previous","volume-up","volume-down","brightness-up","brightness-down"],"Cas & Planovani":["clock","timer","alarm","calendar","calendar-clock","schedule","history"],Ostatni:["home","cog","tools","wrench","hammer","chart-line","gauge","dots-vertical","menu","settings","account","logout"]};let on=class extends z{constructor(){super(...arguments),this.isOpen=!1,this.searchQuery=""}get filteredCategories(){const e=this.searchQuery.trim().toLowerCase();if(!e)return lo;const t=Object.entries(lo).map(([i,n])=>{const r=n.filter(a=>a.toLowerCase().includes(e));return[i,r]}).filter(([,i])=>i.length>0);return Object.fromEntries(t)}open(){this.isOpen=!0}close(){this.isOpen=!1,this.searchQuery=""}onOverlayClick(e){e.target===e.currentTarget&&this.close()}onSearchInput(e){const t=e.target;this.searchQuery=(t==null?void 0:t.value)??""}onIconClick(e){this.dispatchEvent(new CustomEvent("icon-selected",{detail:{icon:`mdi:${e}`},bubbles:!0,composed:!0})),this.close()}render(){if(!this.isOpen)return null;const e=this.filteredCategories,t=Object.entries(e);return c`
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
                      <span class="icon-emoji">${Dn(r)}</span>
                      <span class="icon-name">${r}</span>
                    </button>
                  `)}
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}};on.styles=M`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${oe(s.bgPrimary)} 35%, transparent);
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
      background: ${oe(s.cardBg)};
      box-shadow: ${oe(s.cardShadow)};
      border-radius: 14px;
      border: 1px solid ${oe(s.divider)};
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
      border-bottom: 1px solid ${oe(s.divider)};
      gap: 12px;
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${oe(s.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${oe(s.bgSecondary)};
      color: ${oe(s.textPrimary)};
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
      background: ${oe(s.divider)};
      transform: scale(1.05);
    }

    .search {
      padding: 12px 18px;
      border-bottom: 1px solid ${oe(s.divider)};
      background: ${oe(s.bgSecondary)};
    }

    .search input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${oe(s.divider)};
      background: ${oe(s.bgPrimary)};
      color: ${oe(s.textPrimary)};
      font-size: 13px;
      outline: none;
    }

    .search input::placeholder {
      color: ${oe(s.textSecondary)};
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
      color: ${oe(s.textSecondary)};
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
      background: ${oe(s.bgSecondary)};
      cursor: pointer;
      transition: transform 0.15s ease, border 0.2s ease, background 0.2s ease;
      text-align: center;
      font-size: 10px;
      color: ${oe(s.textSecondary)};
    }

    .icon-item:hover {
      background: ${oe(s.bgPrimary)};
      border-color: ${oe(s.accent)};
      transform: translateY(-2px);
      color: ${oe(s.textPrimary)};
    }

    .icon-emoji {
      font-size: 22px;
      line-height: 1;
      color: ${oe(s.textPrimary)};
    }

    .icon-name {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      font-size: 12px;
      color: ${oe(s.textSecondary)};
      text-align: center;
      padding: 24px 0 12px;
    }
  `;oa([f({type:Boolean,reflect:!0,attribute:"open"})],on.prototype,"isOpen",2);oa([T()],on.prototype,"searchQuery",2);on=oa([E("oig-icon-picker")],on);var Kg=Object.defineProperty,qg=Object.getOwnPropertyDescriptor,be=(e,t,i,n)=>{for(var r=n>1?void 0:n?qg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Kg(t,i,r),r};const I=Z;let ce=class extends z{constructor(){super(...arguments),this.isOpen=!1,this.tileIndex=-1,this.tileSide="left",this.existingConfig=null,this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}loadTileConfig(e){var t,i;this.currentTab=e.type,e.type==="entity"?this.selectedEntityId=e.entity_id:this.selectedButtonEntityId=e.entity_id,this.label=e.label||"",this.icon=e.icon||"",this.color=e.color||"#03A9F4",this.action=e.action||"toggle",this.supportEntity1=((t=e.support_entities)==null?void 0:t.top_right)||"",this.supportEntity2=((i=e.support_entities)==null?void 0:i.bottom_right)||""}resetForm(){this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}handleClose(){this.isOpen=!1,this.resetForm(),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}getEntities(){const e=dt();return e?e.getAll():{}}getEntityItems(e,t){const i=t.trim().toLowerCase(),n=this.getEntities();return Object.entries(n).filter(([a])=>e.some(o=>a.startsWith(o))).map(([a,o])=>{const l=this.getAttributeValue(o,"friendly_name")||a,d=this.getAttributeValue(o,"unit_of_measurement"),p=this.getAttributeValue(o,"icon");return{id:a,name:l,value:o.state,unit:d,icon:p,state:o}}).filter(a=>i?a.name.toLowerCase().includes(i)||a.id.toLowerCase().includes(i):!0).sort((a,o)=>a.name.localeCompare(o.name))}getSupportEntities(e){const t=e.trim().toLowerCase();if(!t)return[];const i=this.getEntities();return Object.entries(i).map(([n,r])=>{const a=this.getAttributeValue(r,"friendly_name")||n,o=this.getAttributeValue(r,"unit_of_measurement"),l=this.getAttributeValue(r,"icon");return{id:n,name:a,value:r.state,unit:o,icon:l,state:r}}).filter(n=>n.name.toLowerCase().includes(t)||n.id.toLowerCase().includes(t)).sort((n,r)=>n.name.localeCompare(r.name)).slice(0,20)}getDisplayIcon(e){return e?e.startsWith("mdi:")?Dn(e):e:Dn("")}getColorForEntity(e){switch(e.split(".")[0]){case"sensor":return"#03A9F4";case"binary_sensor":return"#4CAF50";case"switch":return"#FFC107";case"light":return"#FF9800";case"fan":return"#00BCD4";case"input_boolean":return"#9C27B0";default:return"#03A9F4"}}applyEntityDefaults(e){if(!e)return;const i=this.getEntities()[e];if(!i)return;this.label||(this.label=this.getAttributeValue(i,"friendly_name"));const n=this.getAttributeValue(i,"icon");!this.icon&&n&&(this.icon=n),this.color=this.getColorForEntity(e)}handleEntitySelect(e){this.selectedEntityId=e,this.applyEntityDefaults(e)}handleButtonEntitySelect(e){this.selectedButtonEntityId=e,this.applyEntityDefaults(e)}handleSupportInput(e,t){const i=t.trim();e===1?(this.supportSearch1=t,this.showSupportList1=!!i,i||(this.supportEntity1="")):(this.supportSearch2=t,this.showSupportList2=!!i,i||(this.supportEntity2=""))}handleSupportSelect(e,t){const i=t.name||t.id;e===1?(this.supportEntity1=t.id,this.supportSearch1=i,this.showSupportList1=!1):(this.supportEntity2=t.id,this.supportSearch2=i,this.showSupportList2=!1)}getSupportInputValue(e,t){if(e)return e;if(!t)return"";const i=this.getEntities()[t];return i&&this.getAttributeValue(i,"friendly_name")||t}getAttributeValue(e,t){var n;const i=(n=e.attributes)==null?void 0:n[t];return i==null?"":String(i)}handleSave(){const e=this.currentTab==="entity"?this.selectedEntityId:this.selectedButtonEntityId;if(!e){window.alert("Vyberte entitu");return}const t={top_right:this.supportEntity1||void 0,bottom_right:this.supportEntity2||void 0},i={type:this.currentTab,entity_id:e,label:this.label||void 0,icon:this.icon||void 0,color:this.color||void 0,action:this.currentTab==="button"?this.action:void 0,support_entities:t};this.dispatchEvent(new CustomEvent("tile-saved",{detail:{index:this.tileIndex,side:this.tileSide,config:i},bubbles:!0,composed:!0})),this.handleClose()}onIconSelected(e){var t;this.icon=((t=e.detail)==null?void 0:t.icon)||"",this.iconPickerOpen=!1}renderEntityList(e,t,i,n){const r=this.getEntityItems(e,t);return r.length===0?c`<div class="support-empty">Žádné entity nenalezeny</div>`:c`
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
    `:null}};ce.styles=M`
    :host {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      font-family: ${I(s.fontFamily)};
    }

    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${I(s.bgPrimary)} 35%, transparent);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .dialog {
      width: min(520px, 100%);
      max-height: 85vh;
      background: ${I(s.cardBg)};
      border: 1px solid ${I(s.divider)};
      border-radius: 16px;
      box-shadow: ${I(s.cardShadow)};
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
      border-bottom: 1px solid ${I(s.divider)};
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${I(s.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${I(s.bgSecondary)};
      color: ${I(s.textPrimary)};
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
      background: ${I(s.divider)};
      transform: scale(1.05);
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 18px;
      background: ${I(s.bgSecondary)};
      border-bottom: 1px solid ${I(s.divider)};
    }

    .tab-btn {
      border: 1px solid transparent;
      background: ${I(s.cardBg)};
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: ${I(s.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: border 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }

    .tab-btn.active {
      border-color: ${I(s.accent)};
      color: ${I(s.textPrimary)};
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
      color: ${I(s.textSecondary)};
      font-weight: 600;
    }

    .input,
    select,
    .color-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${I(s.divider)};
      background: ${I(s.bgPrimary)};
      color: ${I(s.textPrimary)};
      font-size: 12px;
      outline: none;
      transition: border 0.2s ease, box-shadow 0.2s ease;
    }

    .input::placeholder {
      color: ${I(s.textSecondary)};
    }

    .input:focus,
    select:focus,
    .color-input:focus {
      border-color: ${I(s.accent)};
      box-shadow: 0 0 0 2px color-mix(in srgb, ${I(s.accent)} 20%, transparent);
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
      border: 1px dashed ${I(s.divider)};
      display: grid;
      place-items: center;
      font-size: 22px;
      cursor: pointer;
      background: ${I(s.bgSecondary)};
      transition: border 0.2s ease, transform 0.2s ease;
    }

    .icon-preview:hover {
      border-color: ${I(s.accent)};
      transform: translateY(-1px);
    }

    .icon-field {
      font-size: 11px;
    }

    .icon-btn {
      border: none;
      background: ${I(s.bgSecondary)};
      color: ${I(s.textPrimary)};
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .divider {
      height: 1px;
      background: ${I(s.divider)};
      margin: 6px 0;
      opacity: 0.8;
    }

    .entity-list {
      border: 1px solid ${I(s.divider)};
      border-radius: 12px;
      overflow: hidden;
      max-height: 200px;
      overflow-y: auto;
      background: ${I(s.bgPrimary)};
    }

    .entity-item {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid ${I(s.divider)};
      cursor: pointer;
      align-items: center;
      transition: background 0.2s ease;
    }

    .entity-item:last-child {
      border-bottom: none;
    }

    .entity-item:hover {
      background: ${I(s.bgSecondary)};
    }

    .entity-item.selected {
      background: color-mix(in srgb, ${I(s.accent)} 16%, transparent);
      border-left: 3px solid ${I(s.accent)};
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
      color: ${I(s.textPrimary)};
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-sub {
      font-size: 10px;
      color: ${I(s.textSecondary)};
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
      background: ${I(s.cardBg)};
      border: 1px solid ${I(s.divider)};
      border-radius: 12px;
      z-index: 10;
      max-height: 180px;
      overflow-y: auto;
      box-shadow: ${I(s.cardShadow)};
    }

    .support-item {
      padding: 10px 12px;
      border-bottom: 1px solid ${I(s.divider)};
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
      background: ${I(s.bgSecondary)};
    }

    .support-name {
      font-size: 12px;
      color: ${I(s.textPrimary)};
      font-weight: 600;
    }

    .support-value {
      font-size: 10px;
      color: ${I(s.textSecondary)};
    }

    .support-empty {
      padding: 12px;
      font-size: 11px;
      color: ${I(s.textSecondary)};
      text-align: center;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px 18px;
      border-top: 1px solid ${I(s.divider)};
      background: ${I(s.bgSecondary)};
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
      background: ${I(s.bgPrimary)};
      color: ${I(s.textPrimary)};
      border: 1px solid ${I(s.divider)};
    }

    .btn-primary {
      background: ${I(s.accent)};
      color: #fff;
      box-shadow: 0 6px 14px color-mix(in srgb, ${I(s.accent)} 40%, transparent);
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
  `;be([f({type:Boolean,reflect:!0,attribute:"open"})],ce.prototype,"isOpen",2);be([f({type:Number})],ce.prototype,"tileIndex",2);be([f({attribute:!1})],ce.prototype,"tileSide",2);be([f({attribute:!1})],ce.prototype,"existingConfig",2);be([T()],ce.prototype,"currentTab",2);be([T()],ce.prototype,"entitySearchText",2);be([T()],ce.prototype,"buttonSearchText",2);be([T()],ce.prototype,"selectedEntityId",2);be([T()],ce.prototype,"selectedButtonEntityId",2);be([T()],ce.prototype,"label",2);be([T()],ce.prototype,"icon",2);be([T()],ce.prototype,"color",2);be([T()],ce.prototype,"action",2);be([T()],ce.prototype,"supportEntity1",2);be([T()],ce.prototype,"supportEntity2",2);be([T()],ce.prototype,"supportSearch1",2);be([T()],ce.prototype,"supportSearch2",2);be([T()],ce.prototype,"showSupportList1",2);be([T()],ce.prototype,"showSupportList2",2);be([T()],ce.prototype,"iconPickerOpen",2);ce=be([E("oig-tile-dialog")],ce);var Yg=Object.defineProperty,Ug=Object.getOwnPropertyDescriptor,re=(e,t,i,n)=>{for(var r=n>1?void 0:n?Ug(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Yg(t,i,r),r};const $e=Z,co=new URLSearchParams(window.location.search),Mt=co.get("sn")||co.get("inverter_sn")||"",po=`sensor.oig_${Mt}_`,Gg=[{id:"flow",label:"Toky",icon:"⚡"},{id:"pricing",label:"Ceny",icon:"💰"},{id:"boiler",label:"Bojler",icon:"🔥"},{id:"settings",label:"Nastavení",icon:"⚙️"}];let J=class extends z{constructor(){super(...arguments),this.hass=null,this.loading=!0,this.error=null,this.activeTab="flow",this.editMode=!1,this.time="",this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1,this.flowData=Kr,this.pricingData=null,this.pricingLoading=!1,this.boilerState=null,this.boilerLoading=!1,this.boilerV2Data=null,this.boilerConfig=null,this.boilerRefreshTimer=null,this.analyticsData=Oa,this.chmuData=ji,this.chmuModalOpen=!1,this.timelineTab="today",this.timelineData=null,this.tilesConfig=null,this.tilesLeft=[],this.tilesRight=[],this.tileDialogOpen=!1,this.editingTileIndex=-1,this.editingTileSide="left",this.editingTileConfig=null,this.entityStore=null,this.timeInterval=null,this.stateWatcherUnsub=null,this.tileEntityUnsubs=[],this.pricingDirty=!1,this.timelineDirty=!1,this.analyticsDirty=!1,this.boilerDirty=!1,this.reconnecting=!1,this.throttledUpdateFlow=mr(()=>this.updateFlowData(),500),this.throttledUpdateSensors=mr(()=>this.updateSensorData(),1e3),this.throttledRefreshDerivedData=mr(()=>this.refreshDerivedData(),5e3),this.onPageShow=()=>{this.rebindHassContext()},this.onDocumentVisibilityChange=()=>{document.visibilityState==="visible"&&this.rebindHassContext()}}get boilerLang(){return Tc(this.hass)}connectedCallback(){super.connectedCallback(),window.addEventListener("pageshow",this.onPageShow),document.addEventListener("visibilitychange",this.onDocumentVisibilityChange),this.initApp(),this.startTimeUpdate()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("pageshow",this.onPageShow),document.removeEventListener("visibilitychange",this.onDocumentVisibilityChange),this.cleanup()}updated(e){e.has("hass")&&!e.has("loading")&&this.rebindHassContext(),e.has("activeTab")&&(this.activeTab==="pricing"&&(!this.pricingData||this.pricingDirty)&&this.loadPricingData(),this.activeTab==="pricing"&&(this.analyticsData===Oa||this.analyticsDirty)&&this.loadAnalyticsAsync(),this.activeTab==="pricing"&&(!this.timelineData||this.timelineDirty)&&this.loadTimelineTabData(this.timelineTab),this.activeTab==="boiler"&&(!this.boilerState||this.boilerDirty)&&this.loadBoilerDataAsync())}async initApp(){try{const e=await ne.getHass();if(!e)throw new Error("Cannot access Home Assistant context");this.hass=e,this.entityStore=vl(e,Mt),await Dt.start({getHass:()=>ne.getHassSync(),prefixes:[po]}),this.stateWatcherUnsub=Dt.onEntityChange((t,i)=>{this.syncHassState(t,i),this.throttledUpdateFlow(),this.throttledUpdateSensors(),this.throttledRefreshDerivedData()}),ae.start(),this.updateFlowData(),this.updateSensorData(),this.loadPricingData(),this.loadBoilerDataAsync(),this.loadAnalyticsAsync(),this.loadTilesAsync(),this.loading=!1,C.info("App initialized",{entities:Object.keys(e.states||{}).length,inverterSn:Mt})}catch(e){this.error=e.message,this.loading=!1,C.error("App init failed",e)}}cleanup(){var e,t;(e=this.stateWatcherUnsub)==null||e.call(this),this.stateWatcherUnsub=null,Dt.stop(),ae.stop(),this.tileEntityUnsubs.forEach(i=>i()),this.tileEntityUnsubs=[],(t=this.entityStore)==null||t.destroy(),this.entityStore=null,this.timeInterval!==null&&(clearInterval(this.timeInterval),this.timeInterval=null),this.boilerRefreshTimer!==null&&(clearInterval(this.boilerRefreshTimer),this.boilerRefreshTimer=null)}async rebindHassContext(){var e;if(!this.reconnecting){this.reconnecting=!0;try{const t=await ne.refreshHass();if(!t)return;this.hass=t,(e=this.entityStore)==null||e.updateHass(t),await Dt.start({getHass:()=>ne.getHassSync(),prefixes:[po]}),this.updateFlowData(),this.updateSensorData()}catch(t){C.error("Failed to rebind hass context",t)}finally{this.reconnecting=!1}}}updateFlowData(){var e;if(this.hass)try{const t=((e=this.entityStore)==null?void 0:e.getAll())??this.hass;this.flowData=Il(t,Mt)}catch(t){C.error("Failed to extract flow data",t)}}updateSensorData(){if(this.chmuData=Oc(Mt),this.activeTab==="pricing"&&(this.analyticsData={...this.analyticsData,...zc()}),this.tilesConfig){const e=Mi(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}}updateTilesImmediate(){if(!this.tilesConfig)return;const e=Mi(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}subscribeTileEntities(){if(this.tileEntityUnsubs.forEach(t=>t()),this.tileEntityUnsubs=[],!this.tilesConfig||!this.entityStore)return;const e=new Set;[...this.tilesConfig.tiles_left,...this.tilesConfig.tiles_right].forEach(t=>{var i,n;t&&(e.add(t.entity_id),(i=t.support_entities)!=null&&i.top_right&&e.add(t.support_entities.top_right),(n=t.support_entities)!=null&&n.bottom_right&&e.add(t.support_entities.bottom_right))});for(const t of e){const i=this.entityStore.subscribe(t,()=>{this.updateTilesImmediate()});this.tileEntityUnsubs.push(i)}}async loadPricingData(){if(!(!this.hass||this.pricingLoading)){this.pricingLoading=!0;try{const e=await Di(()=>tc(this.hass));this.pricingData=e,this.pricingDirty=!1}catch(e){C.error("Failed to load pricing data",e)}finally{this.pricingLoading=!1}}}async loadBoilerDataAsync(){if(!(!this.hass||this.boilerLoading)){this.boilerLoading=!0;try{const e=await Di(()=>Pc(this.hass));this.boilerState=e.state,this.boilerV2Data=e.v2Data,this.boilerConfig=e.config,this.boilerDirty=!1,this.boilerRefreshTimer||(this.boilerRefreshTimer=window.setInterval(()=>this.loadBoilerDataAsync(),5*60*1e3))}catch(e){C.error("Failed to load boiler data",e)}finally{this.boilerLoading=!1}}}async loadAnalyticsAsync(){try{this.analyticsData=await Di(()=>Dc(Mt)),this.analyticsDirty=!1}catch(e){C.error("Failed to load analytics",e)}}async loadTilesAsync(){try{this.tilesConfig=await Di(()=>Bc());const e=Mi(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right,this.subscribeTileEntities()}catch(e){C.error("Failed to load tiles config",e)}}async loadTimelineTabData(e){try{this.timelineData=await Di(()=>Fc(Mt,e)),this.timelineDirty=!1}catch(t){C.error(`Failed to load timeline tab: ${e}`,t)}}syncHassState(e,t){if(this.hass){if(this.hass.states||(this.hass.states={}),t){this.hass.states[e]=t;return}delete this.hass.states[e]}}refreshDerivedData(){if(this.pricingDirty=!0,this.timelineDirty=!0,this.analyticsDirty=!0,this.boilerDirty=!0,this.activeTab==="pricing"){Wl(),this.loadPricingData(),this.loadTimelineTabData(this.timelineTab),this.loadAnalyticsAsync();return}this.activeTab==="boiler"&&this.loadBoilerDataAsync()}startTimeUpdate(){const e=()=>{this.time=new Date().toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})};e(),this.timeInterval=window.setInterval(e,1e3)}onTabChange(e){this.activeTab=e.detail.tabId}onGridChargingOpen(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-grid-charging-dialog");e==null||e.show()}onEditClick(){this.editMode=!this.editMode}onResetClick(){var i,n;const e=(i=this.shadowRoot)==null?void 0:i.querySelector("oig-flow-canvas");e!=null&&e.resetLayout&&e.resetLayout();const t=(n=this.shadowRoot)==null?void 0:n.querySelector("oig-grid");t&&t.resetLayout()}onToggleLeftPanel(){this.leftPanelCollapsed=!this.leftPanelCollapsed}onToggleRightPanel(){this.rightPanelCollapsed=!this.rightPanelCollapsed}onChmuBadgeClick(){this.chmuModalOpen=!0}onChmuModalClose(){this.chmuModalOpen=!1}onTimelineTabChange(e){this.timelineTab=e.detail.tab,this.loadTimelineTabData(e.detail.tab)}onTimelineRefresh(){this.loadTimelineTabData(this.timelineTab)}onEditTile(e){const{entityId:t}=e.detail;let i=-1,n="left",r=null;if(this.tilesConfig){const a=this.tilesConfig.tiles_left.findIndex(o=>o&&o.entity_id===t);if(a>=0)i=a,n="left",r=this.tilesConfig.tiles_left[a];else{const o=this.tilesConfig.tiles_right.findIndex(l=>l&&l.entity_id===t);o>=0&&(i=o,n="right",r=this.tilesConfig.tiles_right[o])}}this.editingTileIndex=i,this.editingTileSide=n,this.editingTileConfig=r,this.tileDialogOpen=!0,r&&requestAnimationFrame(()=>{var o;const a=(o=this.shadowRoot)==null?void 0:o.querySelector("oig-tile-dialog");a==null||a.loadTileConfig(r)})}onDeleteTile(e){const{entityId:t}=e.detail;if(!this.tilesConfig||!t)return;const i={...this.tilesConfig};i.tiles_left=i.tiles_left.map(r=>r&&r.entity_id===t?null:r),i.tiles_right=i.tiles_right.map(r=>r&&r.entity_id===t?null:r),this.tilesConfig=i;const n=Mi(i);this.tilesLeft=n.left,this.tilesRight=n.right,Fa(i),this.subscribeTileEntities()}onTileSaved(e){const{index:t,side:i,config:n}=e.detail;if(!this.tilesConfig)return;const r={...this.tilesConfig},a=i==="left"?[...r.tiles_left]:[...r.tiles_right];if(t>=0&&t<a.length)a[t]=n;else{const l=a.findIndex(d=>d===null);l>=0?a[l]=n:a.push(n)}i==="left"?r.tiles_left=a:r.tiles_right=a,this.tilesConfig=r;const o=Mi(r);this.tilesLeft=o.left,this.tilesRight=o.right,Fa(r),this.subscribeTileEntities()}onTileDialogClose(){this.tileDialogOpen=!1,this.editingTileConfig=null,this.editingTileIndex=-1}_renderBoilerTabSafe(){try{return this._buildBoilerTabContent()}catch(e){return C.error("Boiler tab render failed",e),c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${"render_failed"}></oig-boiler-unavailable-state>`}}_buildBoilerTabContent(){var m,b,y,_,$,v,P,j,B;const e=this.boilerV2Data;if(this.boilerLoading&&!e)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="loading" message=""></oig-boiler-unavailable-state>`;if(e!=null&&e.loadError)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${e.loadError}></oig-boiler-unavailable-state>`;const t=(((m=e==null?void 0:e.explanation)==null?void 0:m.degradedReasons)??[]).filter(K=>K!=="config_profile_unavailable");if(e&&e.status===null&&t.length>0)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="degraded" .message=${t.join(", ")}></oig-boiler-unavailable-state>`;if(!e)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="unavailable" message="Data bojleru nejsou k dispozici"></oig-boiler-unavailable-state>`;const i=((y=(b=this.hass)==null?void 0:b.config)==null?void 0:y.time_zone)??Intl.DateTimeFormat().resolvedOptions().timeZone??"Europe/Prague",n=((_=e.status)==null?void 0:_.heating)??!1,r=($=e.status)==null?void 0:$.comfortSatisfied,a=n?"Nabíjí":r===!0?"Připraveno":r===!1?"Nedostatek":"Připraveno",o=((v=e.status)==null?void 0:v.degradedFlags)??[],l=o.includes("plan_degraded")?"⚠ Plán s omezenými daty":o.includes("price_degraded")?"⚠ Ceny: stará data":o.includes("forecast_degraded")?"⚠ FVE predikce: stará data":null,d=(((P=e.status)==null?void 0:P.degraded)??!1)&&l!==null,p=((j=e.explanation)==null?void 0:j.dataAgeSecs)??null,u=((B=e.status)==null?void 0:B.lastUpdate)??null,h=p===null?null:p<60?`${Math.round(p)} sekundami`:p<3600?`${Math.round(p/60)} minutami`:`${Math.round(p/3600)} hodinami`,g=u?(()=>{try{const K=new Date(u);return`${String(K.getHours()).padStart(2,"0")}:${String(K.getMinutes()).padStart(2,"0")}:${String(K.getSeconds()).padStart(2,"0")}`}catch{return null}})():null;return c`
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
      <oig-boiler-plan-strip
        .slots=${e.planSlots}
        .demandMap=${e.demandMap??null}
        .circulationRuns=${e.circulationRuns}
        .legionella=${e.legionella??null}
        .planSummary=${e.planSummary??null}
        .lang=${this.boilerLang}
      ></oig-boiler-plan-strip>
      <oig-boiler-energy-today
        .energy=${e.energyToday??null}
        .planSummary=${e.planSummary??null}
        .lang=${this.boilerLang}
      ></oig-boiler-energy-today>
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
          .tabs=${Gg}
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
                `:k}
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
               `:k}
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
               ${this.activeTab==="settings"?c`<oig-settings></oig-settings>`:k}
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
    `}};J.styles=M`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      font-family: ${$e(s.fontFamily)};
      color: ${$e(s.textPrimary)};
      background: ${$e(s.bgPrimary)};
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
      color: ${$e(s.textSecondary)};
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid ${$e(s.divider)};
      border-top-color: ${$e(s.accent)};
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
      color: ${$e(s.error)};
      text-align: center;
      animation: fadeIn 0.3s ease;
    }

    .error h2 {
      margin-bottom: 8px;
    }

    .error button {
      margin-top: 12px;
      padding: 8px 16px;
      background: ${$e(s.accent)};
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
      background: ${$e(s.bgSecondary)};
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
      background: ${$e(s.cardBg)};
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      font-size: 12px;
      color: ${$e(s.textSecondary)};
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
      background: ${$e(s.cardBg)};
      border: 1px solid ${$e(s.divider)};
      border-radius: 8px;
      font-size: 13px;
      color: ${$e(s.textSecondary)};
    }

    .boiler-setup-guide__icon {
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
    }

    .boiler-setup-guide__text strong {
      display: block;
      color: ${$e(s.textPrimary)};
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
  `;re([f({type:Object})],J.prototype,"hass",2);re([T()],J.prototype,"loading",2);re([T()],J.prototype,"error",2);re([T()],J.prototype,"activeTab",2);re([T()],J.prototype,"editMode",2);re([T()],J.prototype,"time",2);re([T()],J.prototype,"leftPanelCollapsed",2);re([T()],J.prototype,"rightPanelCollapsed",2);re([T()],J.prototype,"flowData",2);re([T()],J.prototype,"pricingData",2);re([T()],J.prototype,"pricingLoading",2);re([T()],J.prototype,"boilerState",2);re([T()],J.prototype,"boilerLoading",2);re([T()],J.prototype,"boilerV2Data",2);re([T()],J.prototype,"boilerConfig",2);re([T()],J.prototype,"analyticsData",2);re([T()],J.prototype,"chmuData",2);re([T()],J.prototype,"chmuModalOpen",2);re([T()],J.prototype,"timelineTab",2);re([T()],J.prototype,"timelineData",2);re([T()],J.prototype,"tilesConfig",2);re([T()],J.prototype,"tilesLeft",2);re([T()],J.prototype,"tilesRight",2);re([T()],J.prototype,"tileDialogOpen",2);re([T()],J.prototype,"editingTileIndex",2);re([T()],J.prototype,"editingTileSide",2);re([T()],J.prototype,"editingTileConfig",2);J=re([E("oig-app")],J);C.info("V2 starting",{version:"2.0.0-beta.1"});hl();async function Zg(){try{const e=await ul(),t=document.getElementById("app");t&&(t.innerHTML="",t.appendChild(e)),C.info("V2 mounted successfully")}catch(e){C.error("V2 bootstrap failed",e);const t=document.getElementById("app");t&&(t.innerHTML=`
        <div style="padding: 20px; font-family: system-ui;">
          <h2>Chyba načítání</h2>
          <p>Nepodařilo se načíst dashboard. Zkuste obnovit stránku.</p>
          <details>
            <summary>Detaily</summary>
            <pre>${e.message}</pre>
          </details>
        </div>`)}}Zg();
//# sourceMappingURL=index.js.map
