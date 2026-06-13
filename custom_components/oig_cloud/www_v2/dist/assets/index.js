var Ws=Object.defineProperty;var Vs=(e,t,i)=>t in e?Ws(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var O=(e,t,i)=>Vs(e,typeof t!="symbol"?t+"":t,i);import{f as Ks,u as qs,i as D,a as z,b as c,r as Z,w as Q,A as _,E as Gs}from"./vendor.js";import{C as Gn,a as lo,L as co,P as po,b as uo,i as ho,p as go,c as bo,d as Us,T as Ys,e as Zs,B as Qs,f as Xs,g as Js,h as el,j as tl,k as fo}from"./charts.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function i(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(r){if(r.ep)return;r.ep=!0;const a=i(r);fetch(r.href,a)}})();const xt="[V2]";function il(){return new Date().toISOString().substr(11,12)}function un(e,t){const i=il(),n=e.toUpperCase().padEnd(5);return`${i} ${n} ${t}`}const C={debug(e,t){typeof window<"u"&&window.OIG_DEBUG&&console.debug(xt,un("debug",e),t??"")},info(e,t){console.info(xt,un("info",e),t??"")},warn(e,t){console.warn(xt,un("warn",e),t??"")},error(e,t,i){const n=t?{error:t.message,stack:t.stack,...i}:i;console.error(xt,un("error",e),n??"")},time(e){console.time(`${xt} ${e}`)},timeEnd(e){console.timeEnd(`${xt} ${e}`)},group(e){console.group(`${xt} ${e}`)},groupEnd(){console.groupEnd()}};function nl(){window.addEventListener("error",rl),window.addEventListener("unhandledrejection",al),C.debug("Error handling setup complete")}function rl(e){const t=e.error||new Error(e.message);C.error("Uncaught error",t,{filename:e.filename,lineno:e.lineno,colno:e.colno}),e.preventDefault()}function al(e){const t=e.reason instanceof Error?e.reason:new Error(String(e.reason));C.error("Unhandled promise rejection",t),e.preventDefault()}class mo extends Error{constructor(t,i,n=!1,r){super(t),this.code=i,this.recoverable=n,this.cause=r,this.name="AppError"}}class wi extends mo{constructor(t="Authentication failed"){super(t,"AUTH_ERROR",!1),this.name="AuthError"}}class ua extends mo{constructor(t="Network error",i){super(t,"NETWORK_ERROR",!0,i),this.name="NetworkError"}}const ol="oig_v2_";function sl(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"";return/Home Assistant|HomeAssistant|HAcompanion/i.test(t)}catch{return!1}}function ll(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"",i=/Android|iPhone|iPad|iPod|Mobile/i.test(t),n=globalThis.innerWidth<=768;return i||n}catch{return!1}}const Ae={isHaApp:!1,isMobile:!1,reduceMotion:!1};async function cl(){var i,n;C.info("Bootstrap starting"),nl(),Ae.isHaApp=sl(),Ae.isMobile=ll(),Ae.reduceMotion=Ae.isHaApp||Ae.isMobile||((n=(i=globalThis.matchMedia)==null?void 0:i.call(globalThis,"(prefers-reduced-motion: reduce)"))==null?void 0:n.matches)||!1;const e=document.documentElement;Ae.isHaApp&&e.classList.add("oig-ha-app"),Ae.isMobile&&e.classList.add("oig-mobile"),Ae.reduceMotion&&e.classList.add("oig-reduce-motion");const t={version:"2.0.0-beta.1",storagePrefix:ol};return C.info("Bootstrap complete",{...t,isHaApp:Ae.isHaApp,isMobile:Ae.isMobile,reduceMotion:Ae.reduceMotion}),document.createElement("oig-app")}const l={bgPrimary:"var(--primary-background-color, #ffffff)",bgSecondary:"var(--secondary-background-color, #f5f5f5)",textPrimary:"var(--primary-text-color, #212121)",textSecondary:"var(--secondary-text-color, #757575)",accent:"var(--accent-color, #03a9f4)",divider:"var(--divider-color, #e0e0e0)",error:"var(--error-color, #db4437)",success:"var(--success-color, #0f9d58)",warning:"var(--warning-color, #f4b400)",cardBg:"var(--card-background-color, #ffffff)",cardShadow:"var(--shadow-elevation-2dp_-_box-shadow, 0 2px 2px 0 rgba(0,0,0,0.14))",fontFamily:"var(--primary-font-family, system-ui, sans-serif)"},ha={"--primary-background-color":"#111936","--secondary-background-color":"#1a2044","--primary-text-color":"#e1e1e1","--secondary-text-color":"rgba(255,255,255,0.7)","--accent-color":"#03a9f4","--divider-color":"rgba(255,255,255,0.12)","--error-color":"#ef5350","--success-color":"#66bb6a","--warning-color":"#ffa726","--card-background-color":"rgba(255,255,255,0.06)","--shadow-elevation-2dp_-_box-shadow":"0 2px 4px 0 rgba(0,0,0,0.4)"},ga={"--primary-background-color":"#ffffff","--secondary-background-color":"#f5f5f5","--primary-text-color":"#212121","--secondary-text-color":"#757575","--accent-color":"#03a9f4","--divider-color":"#e0e0e0","--error-color":"#db4437","--success-color":"#0f9d58","--warning-color":"#f4b400","--card-background-color":"#ffffff","--shadow-elevation-2dp_-_box-shadow":"0 2px 2px 0 rgba(0,0,0,0.14)"};function lr(){var e,t;try{if(window.parent&&window.parent!==window){const i=(t=(e=window.parent.document)==null?void 0:e.querySelector("home-assistant"))==null?void 0:t.hass;if(i!=null&&i.themes){if(typeof i.themes.darkMode=="boolean")return i.themes.darkMode;const n=(i.themes.theme||"").toLowerCase();if(n.includes("dark"))return!0;if(n.includes("light"))return!1}}}catch{}return window.matchMedia("(prefers-color-scheme: dark)").matches}function cr(e){const t=e?ha:ga,i=document.documentElement;for(const[n,r]of Object.entries(t))i.style.setProperty(n,r);i.classList.toggle("dark",e),document.body.style.background=e?ha["--secondary-background-color"]:ga["--secondary-background-color"]}function dl(){const e=lr();cr(e),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{const i=lr();cr(i)}),setInterval(()=>{const i=lr(),n=document.documentElement.classList.contains("dark");i!==n&&cr(i)},5e3)}const ba={mobile:768,tablet:1024};function Yt(e){return e<ba.mobile?"mobile":e<ba.tablet?"tablet":"desktop"}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const E=e=>(t,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const pl={attribute:!0,type:String,converter:qs,reflect:!1,hasChanged:Ks},ul=(e=pl,t,i)=>{const{kind:n,metadata:r}=i;let a=globalThis.litPropertyMetadata.get(r);if(a===void 0&&globalThis.litPropertyMetadata.set(r,a=new Map),n==="setter"&&((e=Object.create(e)).wrapped=!0),a.set(i.name,e),n==="accessor"){const{name:o}=i;return{set(s){const d=t.get.call(this);t.set.call(this,s),this.requestUpdate(o,d,e,!0,s)},init(s){return s!==void 0&&this.C(o,void 0,e,s),s}}}if(n==="setter"){const{name:o}=i;return function(s){const d=this[o];t.call(this,s),this.requestUpdate(o,d,e,!0,s)}}throw Error("Unsupported decorator location: "+n)};function g(e){return(t,i)=>typeof i=="object"?ul(e,t,i):((n,r,a)=>{const o=r.hasOwnProperty(a);return r.constructor.createProperty(a,n),o?Object.getOwnPropertyDescriptor(r,a):void 0})(e,t,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function T(e){return g({...e,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const hl=(e,t,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof t!="object"&&Object.defineProperty(e,t,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Un(e,t){return(i,n,r)=>{const a=o=>{var s;return((s=o.renderRoot)==null?void 0:s.querySelector(e))??null};return hl(i,n,{get(){return a(this)}})}}class gl{constructor(){this.callbacks=new Set,this.watched=new Set,this.watchedPrefixes=new Set,this.unsub=null,this.running=!1,this.getHass=null,this.activeConnection=null}registerEntities(t){for(const i of t)typeof i=="string"&&i.length>0&&this.watched.add(i)}registerPrefix(t){var n;if(typeof t!="string"||t.length===0)return;this.watchedPrefixes.add(t);const i=(n=this.getHass)==null?void 0:n.call(this);if(i!=null&&i.states){const r=Object.keys(i.states).filter(a=>a.startsWith(t));this.registerEntities(r)}}onEntityChange(t){return this.callbacks.add(t),()=>{this.callbacks.delete(t)}}async start(t){this.getHass=t.getHass;const i=this.getHass();if(!(i!=null&&i.connection)){C.debug("StateWatcher: hass not ready, retrying in 500ms"),setTimeout(()=>this.start(t),500);return}if(this.running&&this.activeConnection===i.connection){const r=t.prefixes??[];for(const a of r)this.registerPrefix(a);return}this.running&&this.stop(),this.running=!0,this.activeConnection=i.connection;const n=t.prefixes??[];for(const r of n)this.registerPrefix(r);try{this.unsub=await i.connection.subscribeEvents(r=>this.handleStateChanged(r),"state_changed"),C.info("StateWatcher started",{prefixes:n,watchedCount:this.watched.size})}catch(r){this.running=!1,this.activeConnection=null,C.error("StateWatcher failed to subscribe",r)}}stop(){if(this.running=!1,this.activeConnection=null,this.unsub)try{this.unsub()}catch{}this.unsub=null,C.info("StateWatcher stopped")}isWatched(t){return this.matchesWatched(t)}destroy(){this.stop(),this.callbacks.clear(),this.watched.clear(),this.watchedPrefixes.clear(),this.getHass=null}matchesWatched(t){if(this.watched.has(t))return!0;for(const i of this.watchedPrefixes)if(t.startsWith(i))return!0;return!1}handleStateChanged(t){var r;const i=(r=t==null?void 0:t.data)==null?void 0:r.entity_id;if(!i||!this.matchesWatched(i))return;const n=t.data.new_state;for(const a of this.callbacks)try{a(i,n)}catch{}}}const Pt=new gl;class bl{constructor(t,i=""){this.subscriptions=new Map,this.cache=new Map,this.stateWatcherUnsub=null,this.hass=t,this.inverterSn=i,this.init()}init(){var t;if((t=this.hass)!=null&&t.states)for(const[i,n]of Object.entries(this.hass.states))this.cache.set(i,n);this.stateWatcherUnsub=Pt.onEntityChange((i,n)=>{n?this.cache.set(i,n):this.cache.delete(i),this.notifySubscribers(i,n)}),C.debug("EntityStore initialized",{entities:this.cache.size,inverterSn:this.inverterSn})}getSensorId(t){return`sensor.oig_${this.inverterSn}_${t}`}findSensorId(t){const i=this.getSensorId(t);for(const n of this.cache.keys()){if(n===i)return n;if(n.startsWith(i+"_")){const r=n.substring(i.length+1);if(/^\d+$/.test(r))return n}}return i}subscribe(t,i){this.subscriptions.has(t)||this.subscriptions.set(t,new Set),this.subscriptions.get(t).add(i),Pt.registerEntities([t]);const n=this.cache.get(t)??null;return i(n),()=>{var r,a;(r=this.subscriptions.get(t))==null||r.delete(i),((a=this.subscriptions.get(t))==null?void 0:a.size)===0&&this.subscriptions.delete(t)}}getNumeric(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"&&parseFloat(i.state)||0,lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:0,lastUpdated:null,attributes:{},exists:!1}}getString(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"?i.state:"",lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:"",lastUpdated:null,attributes:{},exists:!1}}get(t){return this.cache.get(t)??null}getAll(){return Object.fromEntries(this.cache)}batchLoad(t){const i={};for(const n of t)i[n]=this.getNumeric(n);return i}updateHass(t){if(this.hass=t,t!=null&&t.states){const i=new Set(Object.keys(t.states));for(const n of Array.from(this.cache.keys()))i.has(n)||(this.cache.delete(n),this.notifySubscribers(n,null));for(const[n,r]of Object.entries(t.states)){const a=this.cache.get(n),o=r;this.cache.set(n,o),((a==null?void 0:a.state)!==o.state||(a==null?void 0:a.last_updated)!==o.last_updated)&&this.notifySubscribers(n,o)}}}notifySubscribers(t,i){const n=this.subscriptions.get(t);if(n)for(const r of n)try{r(i)}catch(a){C.error("Entity callback error",a,{entityId:t})}}destroy(){var t;(t=this.stateWatcherUnsub)==null||t.call(this),this.subscriptions.clear(),this.cache.clear(),C.debug("EntityStore destroyed")}}let Ei=null;function fl(e,t){return Ei&&Ei.destroy(),Ei=new bl(e,t),Ei}function st(){return Ei}const ml=3,yl=1e3;class vl{constructor(){this.hass=null,this.initPromise=null}async getHass(){return this.hass?this.hass:this.initPromise?this.initPromise:(this.initPromise=this.initHass(),this.initPromise)}getHassSync(){return this.hass}async refreshHass(){const t=await this.findHass();return t?(this.hass=t,C.info("HASS client refreshed"),t):this.hass}async initHass(){C.debug("Initializing HASS client");const t=await this.findHass();return t?(this.hass=t,C.info("HASS client initialized"),t):(C.warn("HASS not found in parent context"),null)}async findHass(){var t,i;if(typeof window>"u")return null;if(window.hass)return window.hass;if(window.parent&&window.parent!==window)try{const n=(i=(t=window.parent.document)==null?void 0:t.querySelector("home-assistant"))==null?void 0:i.hass;if(n)return n}catch{C.debug("Cannot access parent HASS (cross-origin)")}return window.customPanel?window.customPanel.hass:null}async fetchWithAuth(t,i={}){var o,s;const n=await this.getHass();if(!n)throw new wi("Cannot get HASS context");try{const p=new URL(t,window.location.href).hostname;if(p!=="localhost"&&p!=="127.0.0.1"&&!t.startsWith("/api/"))throw new Error(`fetchWithAuth rejected for non-localhost URL: ${t}`)}catch(d){if(d.message.includes("rejected"))throw d}const r=(s=(o=n.auth)==null?void 0:o.data)==null?void 0:s.access_token;if(!r)throw new wi("No access token available");const a=new Headers(i.headers);return a.set("Authorization",`Bearer ${r}`),a.has("Content-Type")||a.set("Content-Type","application/json"),this.fetchWithRetry(t,{...i,headers:a})}async fetchWithRetry(t,i,n=ml){try{const r=await fetch(t,i);if(!r.ok)throw r.status===401?new wi("Token expired or invalid"):new ua(`HTTP ${r.status}: ${r.statusText}`);return r}catch(r){if(n>0&&r instanceof ua)return C.warn(`Retrying fetch (${n} left)`,{url:t}),await this.delay(yl),this.fetchWithRetry(t,i,n-1);throw r}}async callApi(t,i,n){const r=await this.getHass();if(!r)throw new wi("Cannot get HASS context");return r.callApi(t,i,n)}async callService(t,i,n){const r=await this.getHass();if(!(r!=null&&r.callService))return C.error("Cannot call service — hass not available"),!1;try{return await r.callService(t,i,n),!0}catch(a){return C.error(`Service call failed (${t}.${i})`,a),!1}}async callWS(t){const i=await this.getHass();if(!(i!=null&&i.callWS))throw new wi("Cannot get HASS context for WS call");return i.callWS(t)}async fetchOIGAPI(t,i={}){try{const n=`/api/oig_cloud${t.startsWith("/")?"":"/"}${t}`;return await(await this.fetchWithAuth(n,{...i,headers:{"Content-Type":"application/json",...Object.fromEntries(new Headers(i.headers).entries())}})).json()}catch(n){return C.error(`OIG API fetch error for ${t}`,n),null}}async loadBatteryTimeline(t,i="active"){return this.fetchOIGAPI(`/battery_forecast/${t}/timeline?type=${i}`)}async loadUnifiedCostTile(t){return this.fetchOIGAPI(`/battery_forecast/${t}/unified_cost_tile`)}async loadSpotPrices(t){return this.fetchOIGAPI(`/spot_prices/${t}/intervals`)}async loadAnalytics(t){return this.fetchOIGAPI(`/analytics/${t}`)}async loadPlannerSettings(t){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`)}async savePlannerSettings(t,i){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`,{method:"POST",body:JSON.stringify(i)})}async loadDetailTabs(t,i,n="hybrid"){return this.fetchOIGAPI(`/battery_forecast/${t}/detail_tabs?tab=${i}&plan=${n}`)}async loadModules(t){return this.fetchOIGAPI(`/${t}/modules`)}openEntityDialog(t){var i;try{const n=((i=window.parent.document)==null?void 0:i.querySelector("home-assistant"))??document.querySelector("home-assistant");if(!n)return C.warn("Cannot open entity dialog — home-assistant element not found"),!1;const r=new CustomEvent("hass-more-info",{bubbles:!0,composed:!0,detail:{entityId:t}});return n.dispatchEvent(r),!0}catch(n){return C.error("Cannot open entity dialog",n),!1}}async showNotification(t,i,n="success"){await this.callService("persistent_notification","create",{title:t,message:i,notification_id:`oig_dashboard_${Date.now()}`})||console.log(`[${n.toUpperCase()}] ${t}: ${i}`)}getToken(){var t,i,n;return((n=(i=(t=this.hass)==null?void 0:t.auth)==null?void 0:i.data)==null?void 0:n.access_token)??null}delay(t){return new Promise(i=>setTimeout(i,t))}}const re=new vl,fa={solar:"#ffd54f",battery:"#4caf50",inverter:"#9575cd",grid:"#42a5f5",house:"#f06292"},_i={solar:"linear-gradient(135deg, rgba(255,213,79,0.15) 0%, rgba(255,179,0,0.08) 100%)",battery:"linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(56,142,60,0.08) 100%)",grid:"linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(33,150,243,0.08) 100%)",house:"linear-gradient(135deg, rgba(240,98,146,0.15) 0%, rgba(233,30,99,0.08) 100%)",inverter:"linear-gradient(135deg, rgba(149,117,205,0.15) 0%, rgba(126,87,194,0.08) 100%)"},hn={battery:"rgba(76,175,80,0.4)",grid:"rgba(66,165,245,0.4)",house:"rgba(240,98,146,0.4)",inverter:"rgba(149,117,205,0.4)"},Rt={solar:"#ffd54f",battery:"#ff9800",grid_import:"#f44336",grid_export:"#4caf50",house:"#f06292"},gn={solar:5400,battery:7e3,grid:17e3,house:1e4},Rr={solarPower:0,solarP1:0,solarP2:0,solarV1:0,solarV2:0,solarI1:0,solarI2:0,solarPercent:0,solarToday:0,solarForecastToday:0,solarForecastTomorrow:0,solarForecastStale:!1,batterySoC:0,batteryPower:0,batteryVoltage:0,batteryCurrent:0,batteryTemp:0,batteryChargeTotal:0,batteryDischargeTotal:0,batteryChargeSolar:0,batteryChargeGrid:0,isGridCharging:!1,timeToEmpty:"",timeToFull:"",balancingState:"standby",balancingTimeRemaining:"",gridChargingPlan:{hasBlocks:!1,totalEnergyKwh:0,totalCostCzk:0,windowLabel:null,durationMinutes:0,currentBlockLabel:null,nextBlockLabel:null,blocks:[]},gridPower:0,gridVoltage:0,gridFrequency:0,gridImportToday:0,gridExportToday:0,gridL1V:0,gridL2V:0,gridL3V:0,gridL1P:0,gridL2P:0,gridL3P:0,spotPrice:0,exportPrice:0,currentTariff:"",housePower:0,houseTodayWh:0,houseL1:0,houseL2:0,houseL3:0,nonbackupPower:0,nonbackupTodayWh:0,nonbackupL1:0,nonbackupL2:0,nonbackupL3:0,zalohaPlannedRemainingKwh:0,selfSufficiencyTodayPct:0,srcFveTodayKwh:0,srcBatteryTodayKwh:0,srcGridTodayKwh:0,inverterMode:"",inverterGridMode:"unknown",inverterGridLimit:0,inverterTemp:0,bypassStatus:"off",notificationsUnread:0,notificationsError:0,boilerIsUse:!1,boilerPower:0,boilerDayEnergy:0,boilerManualMode:"",boilerInstallPower:3e3,plannerAutoMode:null,lastUpdate:""},yo={home_1:"Home 1",home_2:"Home 2",home_3:"Home 3",home_ups:"Home UPS"},ma={"Home 1":"home_1","Home 2":"home_2","Home 3":"home_3","Home UPS":"home_ups","Mode 0":"home_1","Mode 1":"home_2","Mode 2":"home_3","Mode 3":"home_ups","HOME I":"home_1","HOME II":"home_2","HOME III":"home_3","HOME UPS":"home_ups",0:"home_1",1:"home_2",2:"home_3",3:"home_ups"},Oi={off:"Vypnuto",on:"Zapnuto",limited:"S omezením"},dr={Vypnuto:"off",Zapnuto:"on",Omezeno:"limited",omezeno:"limited",vypnuto:"off",zapnuto:"on",Off:"off",On:"on",Limited:"limited",off:"off",on:"on",limited:"limited",0:"off",1:"on",2:"limited"},xl={off:"🚫",on:"💧",limited:"🚰"},vo={cbb:"Inteligentní",manual:"Manuální"},xo={cbb:"🤖",manual:"👤"},ya={CBB:"cbb",Manuální:"manual",Manual:"manual",Inteligentní:"cbb"},wl={set_box_mode:"🏠 Změna režimu boxu",set_grid_delivery:"💧 Změna nastavení přetoků",set_grid_delivery_limit:"🔢 Změna limitu přetoků",set_boiler_mode:"🔥 Změna nastavení bojleru",set_formating_mode:"🔋 Změna nabíjení baterie",set_battery_capacity:"⚡ Změna kapacity baterie"},_l={CBB:"Inteligentní",Manual:"Manuální",Manuální:"Manuální"},wo={0:"Žádný",1:"Home 5",2:"Home 6",3:"Home 5 + Home 6",4:"Flexibilita"},_o={status:"idle",activity:"",queueCount:0,runningRequests:[],queuedRequests:[],allRequests:[],currentBoxMode:"home_1",currentGridDelivery:"off",currentGridLimit:0,currentBoilerMode:"cbb",pendingServices:new Map,changingServices:new Set,gridDeliveryState:{currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},supplementary:{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1}},$l="probíhá změna";function Pr(e){return e.trim().toLowerCase().includes($l)}function Hr(e){const t=e.trim();if(t in dr)return dr[t];const i=t.toLowerCase(),n=Object.entries(dr).find(([r])=>r.toLowerCase()===i);return n?n[1]:i.startsWith("omez")||i.includes("limit")?"limited":i.startsWith("zapn")||i==="on"?"on":i.startsWith("vypn")||i==="off"?"off":"unknown"}function kl(e){const t=e.get("grid_mode");if(!t)return null;const i=Hr(t);return i==="unknown"?null:i}function Sl(e){const t=e.get("grid_limit");if(!t)return null;const i=parseInt(t,10);return Number.isFinite(i)&&i>=0?i:null}function Cl(e){return e.changingServices.has("grid_mode")||e.changingServices.has("grid_limit")}function $o(e,t){const{gridModeRaw:i,gridLimit:n}=e,r=i.trim().toLowerCase(),a=r==="unavailable"||r==="unknown"||r==="",o=Pr(i),s=Cl(t),d=o||s;let p;a||o?p="unknown":p=Hr(i);let u=null;!a&&Number.isFinite(n)&&n>=0&&(u=n);const h=kl(t.pendingServices),b=Sl(t.pendingServices);return{currentLiveDelivery:p,currentLiveLimit:u,pendingDeliveryTarget:h,pendingLimitTarget:b,isTransitioning:d,isUnavailable:a}}function Pl(e){return e.isTransitioning&&e.pendingDeliveryTarget?e.pendingDeliveryTarget:e.currentLiveDelivery}const va=new URLSearchParams(window.location.search),Wr=va.get("sn")||va.get("inverter_sn")||"";function _n(e,t=Wr){return`sensor.oig_${t}_${e}`}function xa(e,t,i=Wr){var a;const n=_n(t,i);return n in e?n:((a=Object.keys(e).filter(o=>o.startsWith(n+"_")).map(o=>({id:o,suffix:parseInt(o.substring(n.length+1),10)})).filter(o=>Number.isFinite(o.suffix)).sort((o,s)=>o.suffix-s.suffix)[0])==null?void 0:a.id)??null}function R(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function Ue(e){return!(e!=null&&e.state)||e.state==="unknown"||e.state==="unavailable"?"":e.state}function wa(e,t="on"){if(!(e!=null&&e.state))return!1;const i=e.state.toLowerCase();return i===t||i==="1"||i==="zapnuto"}function Tl(e){const t=(e||"").toLowerCase();return t==="charging"?"charging":t==="balancing"||t==="holding"?"holding":t==="completed"?"completed":t==="planned"?"planned":"standby"}function Tr(e){return e==="tomorrow"?"zítra":e==="today"?"dnes":""}function _a(e){if(!e)return null;const[t,i]=e.split(":").map(Number);return!Number.isFinite(t)||!Number.isFinite(i)?null:t*60+i}function Ml(e){const t=Number(e.grid_import_kwh??e.grid_charge_kwh??0);if(Number.isFinite(t)&&t>0)return t;const i=Number(e.battery_start_kwh??0),n=Number(e.battery_end_kwh??0);return Number.isFinite(i)&&Number.isFinite(n)?Math.max(0,n-i):0}function ko(e=[]){return[...e].sort((t,i)=>{const n=(t.day==="tomorrow"?1:0)-(i.day==="tomorrow"?1:0);return n!==0?n:(t.time_from||"").localeCompare(i.time_from||"")})}function Dl(e){if(!Array.isArray(e)||e.length===0)return null;const t=ko(e),i=t[0],n=t.at(-1),r=Tr(i==null?void 0:i.day),a=Tr(n==null?void 0:n.day);if(r===a){const b=r?`${r} `:"";return!(i!=null&&i.time_from)||!(n!=null&&n.time_to)?b.trim()||null:`${b}${i.time_from} – ${n.time_to}`}const o=r?`${r} `:"",s=a?`${a} `:"",d=(i==null?void 0:i.time_from)||"--",p=(n==null?void 0:n.time_to)||"--",u=i?`${o}${d}`:"--",h=n?`${s}${p}`:"--";return`${u} → ${h}`}function zl(e){if(!Array.isArray(e)||e.length===0)return 0;let t=0;return e.forEach(i=>{const n=_a(i.time_from),r=_a(i.time_to);if(n===null||r===null)return;const a=r-n;a>0&&(t+=a)}),t}function $a(e){const t=Tr(e.day),i=t?`${t} `:"",n=e.time_from||"--",r=e.time_to||"--";return`${i}${n} - ${r}`}function El(e){const t=e.find(r=>{const a=(r.status||"").toLowerCase();return a==="running"||a==="active"})||null,i=t?e[e.indexOf(t)+1]||null:e[0]||null;return{runningBlock:t,upcomingBlock:i,shouldShowNext:!!(i&&(!t||i!==t))}}function Ol(e){const t=(e==null?void 0:e.attributes)||{},i=Array.isArray(t.charging_blocks)?t.charging_blocks:[],n=ko(i),r=Number(t.total_energy_kwh)||0,a=r>0?r:n.reduce((f,m)=>f+Ml(m),0),o=Number(t.total_cost_czk)||0,s=o>0?o:n.reduce((f,m)=>f+Number(m.total_cost_czk||0),0),d=Dl(n),p=zl(n),{runningBlock:u,upcomingBlock:h,shouldShowNext:b}=El(n);return{hasBlocks:n.length>0,totalEnergyKwh:a,totalCostCzk:s,windowLabel:d,durationMinutes:p,currentBlockLabel:u?$a(u):null,nextBlockLabel:b&&h?$a(h):null,blocks:n}}function Ll(e){const t=y=>Number.isFinite(y)&&y>=0?y:0,i=t(e.fveTodayWh),n=t(e.battDischargeTodayWh),r=t(e.battChargeFveTodayWh),a=t(e.gridExportTodayWh),o=t(e.zalohaConsumptionWh),s=t(e.nezalohaConsumptionWh),d=o+s;if(d<=0)return{pct:0,fveKwh:0,batteryKwh:0,gridKwh:0,arcFve:0,arcBattery:0,arcGrid:0};const p=Math.min(n,d),u=Math.max(0,i-r-a),h=Math.min(u,Math.max(0,d-p)),b=Math.max(0,d-h-p),f=(h+p)/d*100,m=y=>y/1e3;return{pct:Math.min(100,Math.max(0,f)),fveKwh:m(h),batteryKwh:m(p),gridKwh:m(b),arcFve:h/d,arcBattery:p/d,arcGrid:b/d}}function Al(e,t=Wr){var oa,sa,la,ca;const i=(e==null?void 0:e.states)||e||{},n=sr=>i[_n(sr,t)]||null,r=R(n("actual_fv_p1")),a=R(n("actual_fv_p2")),o=R(n("extended_fve_voltage_1")),s=R(n("extended_fve_voltage_2")),d=R(n("extended_fve_current_1")),p=R(n("extended_fve_current_2")),u=n("solar_forecast"),h=sr=>{var pa;const pn=(pa=u==null?void 0:u.attributes)==null?void 0:pa[sr];if(pn==null||pn==="")return null;const da=parseFloat(pn);return Number.isFinite(da)?da:null},b=h("today_total_kwh")??h("today_total_sum_kw")??R(u),f=h("tomorrow_total_kwh")??h("tomorrow_total_sum_kw")??0,m=((oa=u==null?void 0:u.attributes)==null?void 0:oa.forecast_stale)===!0,y=R(n("batt_bat_c")),S=R(n("batt_batt_comp_p")),x=R(n("extended_battery_voltage")),$=R(n("extended_battery_current")),P=R(n("extended_battery_temperature")),H=R(n("computed_batt_charge_energy_today")),A=R(n("computed_batt_discharge_energy_today")),j=R(n("computed_batt_charge_fve_energy_today")),k=R(n("computed_batt_charge_grid_energy_today")),L=n("grid_charging_planned"),M=wa(L),q=Ue(n("time_to_empty")),G=Ue(n("time_to_full")),N=n("battery_balancing"),W=Tl((sa=N==null?void 0:N.attributes)==null?void 0:sa.current_state),Pe=Ue({state:(la=N==null?void 0:N.attributes)==null?void 0:la.time_remaining}),Re=Ol(L),te=R(n("actual_aci_wtotal")),_e=R(n("extended_grid_voltage")),w=R(n("ac_in_aci_f")),X=R(n("ac_in_ac_ad")),se=R(n("ac_in_ac_pd")),vt=R(n("ac_in_aci_vr")),Le=R(n("ac_in_aci_vs")),Ge=R(n("ac_in_aci_vt")),ds=R(n("actual_aci_wr")),ps=R(n("actual_aci_ws")),us=R(n("actual_aci_wt")),hs=R(n("spot_price_current_15min")),gs=R(n("export_price_current_15min")),bs=Ue(n("current_tariff")),fs=R(n("actual_aco_p")),ia=R(n("ac_out_en_day")),ms=R(n("ac_out_aco_pr")),ys=R(n("ac_out_aco_ps")),vs=R(n("ac_out_aco_pt")),xs=R(n("actual_acinb_wtotal")),na=R(n("computed_nonbackup_consumption_today")),ws=R(n("actual_acinb_wr")),_s=R(n("actual_acinb_ws")),$s=R(n("actual_acinb_wt")),nr=n("battery_forecast"),ks=Number((ca=nr==null?void 0:nr.attributes)==null?void 0:ca.planned_consumption_today)||0,Ss=Ue(n("box_prms_mode")),Cs=xa(i,"invertor_prms_to_grid",t)||_n("invertor_prms_to_grid",t),Ps=xa(i,"invertor_prm1_p_max_feed_grid",t)||_n("invertor_prm1_p_max_feed_grid",t),rr=i[Cs],ar=i[Ps],Ts=(rr==null?void 0:rr.state)??"",Ms=parseFloat((ar==null?void 0:ar.state)??"")||0,ra=$o({gridModeRaw:Ts,gridLimit:Ms},{pendingServices:new Map,changingServices:new Set}),Ds=ra.currentLiveDelivery,zs=ra.currentLiveLimit??0,Es=R(n("box_temp")),Os=Ue(n("bypass_status"))||"off",Ls=R(n("notification_count_unread")),As=R(n("notification_count_error")),or=n("boiler_is_use"),Fs=or?wa(or)||Ue(or)==="Zapnuto":!1,Is=R(n("boiler_current_cbb_w")),Bs=R(n("boiler_day_w")),Ns=Ue(n("boiler_manual_mode")),js=R(n("boiler_install_power"))||3e3,Rs=n("real_data_update"),Hs=Ue(Rs),aa=R(n("dc_in_fv_ad")),dn=Ll({fveTodayWh:aa,battDischargeTodayWh:A,battChargeFveTodayWh:j,zalohaConsumptionWh:ia,nezalohaConsumptionWh:na,gridExportTodayWh:se});return{solarPower:r+a,solarP1:r,solarP2:a,solarV1:o,solarV2:s,solarI1:d,solarI2:p,solarPercent:R(n("dc_in_fv_proc")),solarToday:aa,solarForecastToday:b,solarForecastTomorrow:f,solarForecastStale:m,batterySoC:y,batteryPower:S,batteryVoltage:x,batteryCurrent:$,batteryTemp:P,batteryChargeTotal:H,batteryDischargeTotal:A,batteryChargeSolar:j,batteryChargeGrid:k,isGridCharging:M,timeToEmpty:q,timeToFull:G,balancingState:W,balancingTimeRemaining:Pe,gridChargingPlan:Re,gridPower:te,gridVoltage:_e,gridFrequency:w,gridImportToday:X,gridExportToday:se,gridL1V:vt,gridL2V:Le,gridL3V:Ge,gridL1P:ds,gridL2P:ps,gridL3P:us,spotPrice:hs,exportPrice:gs,currentTariff:bs,housePower:fs,houseTodayWh:ia,houseL1:ms,houseL2:ys,houseL3:vs,nonbackupPower:xs,nonbackupTodayWh:na,nonbackupL1:ws,nonbackupL2:_s,nonbackupL3:$s,zalohaPlannedRemainingKwh:ks,selfSufficiencyTodayPct:dn.pct,srcFveTodayKwh:dn.fveKwh,srcBatteryTodayKwh:dn.batteryKwh,srcGridTodayKwh:dn.gridKwh,inverterMode:Ss,inverterGridMode:Ds,inverterGridLimit:zs,inverterTemp:Es,bypassStatus:Os,notificationsUnread:Ls,notificationsError:As,boilerIsUse:Fs,boilerPower:Is,boilerDayEnergy:Bs,boilerManualMode:Ns,boilerInstallPower:js,plannerAutoMode:null,lastUpdate:Hs}}const $i={};function bn(e,t,i){const n=Math.abs(e),r=Math.min(100,n/t*100),a=Math.max(500,Math.round(3500-r*30));let o=a;return i&&$i[i]!==void 0&&(o=Math.round(.3*a+(1-.3)*$i[i]),Math.abs(o-$i[i])<100&&(o=$i[i])),i&&($i[i]=o),{active:n>=50,intensity:r,count:Math.max(1,Math.min(4,Math.ceil(1+r/33))),speed:o,size:Math.round(6+r/10),opacity:Math.min(1,.3+r/150)}}function Ye(e){return Math.abs(e)>=1e3?`${(e/1e3).toFixed(1)} kW`:`${Math.round(e)} W`}function nt(e){return e>=1e3?`${(e/1e3).toFixed(2)} kWh`:`${Math.round(e)} Wh`}function Fl(e){return e==="VT"||e.includes("vysoký")?"⚡ VT":e==="NT"||e.includes("nízký")?"🌙 NT":e?`⏰ ${e}`:"--"}function Il(e){return e.includes("Home 1")?{icon:"🏠",text:"Home 1"}:e.includes("Home 2")?{icon:"🔋",text:"Home 2"}:e.includes("Home 3")?{icon:"☀️",text:"Home 3"}:e.includes("UPS")?{icon:"⚡",text:"Home UPS"}:{icon:"⚙️",text:e||"--"}}function Bl(e){return e==="off"?{display:"Vypnuto",icon:"🚫"}:e==="on"?{display:"Zapnuto",icon:"💧"}:e==="limited"?{display:"Omezeno",icon:"🚰"}:{display:"--",icon:"💧"}}const Nl={"HOME I":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"HOME II":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"HOME III":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"rgba(158, 158, 158, 0.18)",label:"DO NOTHING"},"Mode 0":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"Mode 1":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"Mode 2":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"Mode 3":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"}},ka={timeline:[],labels:[],prices:[],exportPrices:[],modeSegments:[],cheapestBuyBlock:null,expensiveBuyBlock:null,bestExportBlock:null,worstExportBlock:null,solar:null,battery:null,initialZoomStart:null,initialZoomEnd:null,currentSpotPrice:0,currentExportPrice:0,plannedConsumption:null,whatIf:null,solarForecastTotal:0,solarForecastTomorrow:0,solarForecastStale:!1},Sa=new URLSearchParams(window.location.search),Mr=Sa.get("sn")||Sa.get("inverter_sn")||"";function Xt(e){return`sensor.oig_${Mr}_${e}`}function Ca(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function Dr(e){const t=e.getFullYear(),i=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0"),r=String(e.getHours()).padStart(2,"0"),a=String(e.getMinutes()).padStart(2,"0"),o=String(e.getSeconds()).padStart(2,"0");return`${t}-${i}-${n}T${r}:${a}:${o}`}const kn={},jl=5*60*1e3;async function Rl(e="hybrid"){const t=kn[e];if(t&&Date.now()-t.ts<jl)return C.debug("Timeline cache hit",{plan:e,age:Math.round((Date.now()-t.ts)/1e3)}),t.data;try{const i=await re.getHass();if(!i)return[];let n;i.callApi?n=await i.callApi("GET",`oig_cloud/battery_forecast/${Mr}/timeline?type=active`):n=await re.fetchOIGAPI(`battery_forecast/${Mr}/timeline?type=active`);const r=(n==null?void 0:n.active)||(n==null?void 0:n.timeline)||[];return kn[e]={data:r,ts:Date.now()},C.info("Timeline fetched",{plan:e,points:r.length}),r}catch(i){return C.error("Failed to fetch timeline",i),[]}}function Hl(e){Object.keys(kn).forEach(t=>delete kn[t])}function Wl(e){const t=new Date,i=new Date(t);return i.setMinutes(Math.floor(t.getMinutes()/15)*15,0,0),e.filter(n=>new Date(n.timestamp)>=i)}function Vl(e){return e.map(t=>{if(!t.timestamp)return new Date;try{const[i,n]=t.timestamp.split("T");if(!i||!n)return new Date;const[r,a,o]=i.split("-").map(Number),[s,d,p=0]=n.split(":").map(Number);return new Date(r,a-1,o,s,d,p)}catch{return new Date}})}function Kl(e){const t=e.mode_name||e.mode_planned||e.mode||e.mode_display||null;if(!t||typeof t!="string")return null;const i=t.trim();return i.length?i:null}function ql(e){return e.startsWith("HOME ")?e.replace("HOME ","").trim():e==="FULL HOME UPS"||e==="HOME UPS"?"UPS":e==="DO NOTHING"?"DN":e.substring(0,3).toUpperCase()}function Gl(e){return Nl[e]||{icon:"❓",color:"rgba(158, 158, 158, 0.15)",label:e}}function Ul(e){if(!e.length)return[];const t=[];let i=null;for(const n of e){const r=Kl(n);if(!r){i=null;continue}const a=new Date(n.timestamp),o=new Date(a.getTime()+15*60*1e3);if(i!==null&&i.mode===r)i.end=o;else{const s={mode:r,start:a,end:o};t.push(s),i=s}}return t.map(n=>{const r=Gl(n.mode);return{...n,icon:r.icon,color:r.color,label:r.label,shortLabel:ql(n.mode)}})}function fn(e,t,i=3){const n=Math.floor(i*60/15);if(e.length<n)return null;let r=null,a=t?1/0:-1/0;for(let o=0;o<=e.length-n;o++){const s=e.slice(o,o+n),d=s.map(u=>u.price),p=d.reduce((u,h)=>u+h,0)/d.length;(t&&p<a||!t&&p>a)&&(a=p,r={start:s[0].timestamp,end:s[s.length-1].timestamp,avg:p,min:Math.min(...d),max:Math.max(...d),values:d,type:"cheapest-buy"})}return r}function Yl(e,t){const n=((e==null?void 0:e.states)||{})[Xt("solar_forecast")];if(!(n!=null&&n.attributes)||!t.length)return null;const r=n.attributes,a=r.today_total_kwh||0,o=r.tomorrow_total_kwh||0,s=r.forecast_stale===!0,d=r.today_hourly_string1_kw||{},p=r.tomorrow_hourly_string1_kw||{},u=r.today_hourly_string2_kw||{},h=r.tomorrow_hourly_string2_kw||{},b={...d,...p},f={...u,...h},m=(x,$,P)=>x==null||$==null?x||$||0:x+($-x)*P,y=[],S=[];for(const x of t){const $=x.getHours(),P=x.getMinutes(),H=new Date(x);H.setMinutes(0,0,0);const A=Dr(H),j=new Date(H);j.setHours($+1);const k=Dr(j),L=b[A]||0,M=b[k]||0,q=f[A]||0,G=f[k]||0,N=P/60;y.push(m(L,M,N)),S.push(m(q,G,N))}return{string1:y,string2:S,todayTotal:a,tomorrowTotal:o,stale:s,hasString1:y.some(x=>x>0),hasString2:S.some(x=>x>0)}}function Zl(e,t){if(!e.length)return{arrays:{baseline:[],solarCharge:[],gridCharge:[],gridNet:[],consumption:[]},initialZoomStart:null,initialZoomEnd:null};const i=e.map(h=>new Date(h.timestamp)),n=i[0].getTime(),r=i[i.length-1],a=r?r.getTime():n,o=[],s=[],d=[],p=[],u=[];for(const h of t){const b=Dr(h),f=e.find(m=>m.timestamp===b);if(f){const m=(f.battery_capacity_kwh??f.battery_soc??f.battery_start)||0,y=f.solar_charge_kwh||0,S=f.grid_charge_kwh||0,x=typeof f.grid_net=="number"?f.grid_net:(f.grid_import||0)-(f.grid_export||0),$=f.load_kwh??f.consumption_kwh??f.load??0,P=(Number($)||0)*4;o.push(m-y-S),s.push(y),d.push(S),p.push(x),u.push(P)}else o.push(null),s.push(null),d.push(null),p.push(null),u.push(null)}return{arrays:{baseline:o,solarCharge:s,gridCharge:d,gridNet:p,consumption:u},initialZoomStart:n,initialZoomEnd:a}}function Ql(e){const t=(e==null?void 0:e.states)||{},i=t[Xt("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const n=i.attributes,r=n.planned_consumption_today??null,a=n.planned_consumption_tomorrow??null,o=n.profile_today||"Žádný profil",s=t[Xt("ac_out_en_day")],d=s==null?void 0:s.state,u=(d&&d!=="unavailable"&&parseFloat(d)||0)/1e3,h=u+(r||0),b=(r||0)+(a||0);let f=null;if(h>0&&a!=null){const y=a-h,S=y/h*100;Math.abs(S)<5?f="Zítra podobně":y>0?f=`Zítra více (+${Math.abs(S).toFixed(0)}%)`:f=`Zítra méně (-${Math.abs(S).toFixed(0)}%)`}return{todayConsumedKwh:u,todayPlannedKwh:r,todayTotalKwh:h,tomorrowKwh:a,totalPlannedKwh:b,profile:o!=="Žádný profil"&&o!=="Neznámý profil"?o:"Žádný profil",trendText:f}}function Xl(e){const i=((e==null?void 0:e.states)||{})[Xt("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const r=i.attributes.mode_optimization||{},a=r.alternatives||{},o=r.total_cost_czk||0,s=r.total_savings_vs_home_i_czk||0,d=a["DO NOTHING"],p=(d==null?void 0:d.current_mode)||null;return{totalCost:o,totalSavings:s,alternatives:a,activeMode:p}}async function Jl(e,t="hybrid"){const i=performance.now();C.info("[Pricing] loadPricingData START");try{const n=await Rl(t),r=Wl(n);if(!r.length)return C.warn("[Pricing] No timeline data"),ka;const a=r.map(W=>({timestamp:W.timestamp,price:W.spot_price_czk||0})),o=r.map(W=>({timestamp:W.timestamp,price:W.export_price_czk||0}));let s=Vl(a);const d=Ul(r),p=fn(a,!0,3);p&&(p.type="cheapest-buy");const u=fn(a,!1,3);u&&(u.type="expensive-buy");const h=fn(o,!1,3);h&&(h.type="best-export");const b=fn(o,!0,3);b&&(b.type="worst-export");const f=r.map(W=>new Date(W.timestamp)),m=new Set([...s,...f].map(W=>W.getTime()));s=Array.from(m).sort((W,Pe)=>W-Pe).map(W=>new Date(W));const{arrays:y,initialZoomStart:S,initialZoomEnd:x}=Zl(r,s),$=Yl(e,s),P=(e==null?void 0:e.states)||{},H=Ca(P[Xt("spot_price_current_15min")]),A=Ca(P[Xt("export_price_current_15min")]),j=Ql(e),k=Xl(e),L=($==null?void 0:$.todayTotal)||0,M=($==null?void 0:$.tomorrowTotal)||0,q=($==null?void 0:$.stale)||!1,G={timeline:r,labels:s,prices:a,exportPrices:o,modeSegments:d,cheapestBuyBlock:p,expensiveBuyBlock:u,bestExportBlock:h,worstExportBlock:b,solar:$,battery:y,initialZoomStart:S,initialZoomEnd:x,currentSpotPrice:H,currentExportPrice:A,plannedConsumption:j,whatIf:k,solarForecastTotal:L,solarForecastTomorrow:M,solarForecastStale:q},N=(performance.now()-i).toFixed(0);return C.info(`[Pricing] loadPricingData COMPLETE in ${N}ms`,{points:r.length,segments:d.length}),G}catch(n){return C.error("[Pricing] loadPricingData failed",n),ka}}const ec=120,zr={workday_spring:"Pracovní den - Jaro",workday_summer:"Pracovní den - Léto",workday_autumn:"Pracovní den - Podzim",workday_winter:"Pracovní den - Zima",weekend_spring:"Víkend - Jaro",weekend_summer:"Víkend - Léto",weekend_autumn:"Víkend - Podzim",weekend_winter:"Víkend - Zima"},tc={fve:"#4CAF50",overflow:"#8BC34A",grid:"#FF9800",discharge:"#2196F3"},ic={fve:"FVE",grid:"Síť",alternative:"Alternativa"},nc={fve:"fve",pv:"fve",overflow:"overflow",grid:"grid",alternative:"alternative",alt:"alternative",battery:"battery"},rc={fve:"fve",pv:"fve",overflow:"overflow",grid:"grid",alternative:"alternative",alt:"alternative",discharge:"discharge",discharging:"discharge"};function pr(e){if(e==null||e==="")return{source:null,sourceInvalid:!1};const t=nc[e.toLowerCase()];return t!==void 0?{source:t,sourceInvalid:!1}:{source:null,sourceInvalid:!0}}function ur(e){return e==null||e===""?null:rc[e.toLowerCase()]??null}const ac=new Set(["temperature_unavailable","temperature_stale","source_stale","activity_stale","source_invalid","power_sign_mismatch_charge","power_sign_mismatch_discharge","runtime_cache_empty"]);function hr(e){return e.filter(t=>ac.has(t))}const Er=new URLSearchParams(window.location.search);let Or=Er.get("sn")||Er.get("inverter_sn")||"",gr=Er.get("entry_id")||"";function oc(e,t,i){return isNaN(e)?t:Math.max(t,Math.min(i,e))}function sc(e,t,i){if(e==null)return null;const n=t-i;if(n<=0)return null;const r=(e-i)/n*100;return oc(r,0,100)}function Sn(e){if(!e)return"--:--";const t=e instanceof Date?e:new Date(e);return isNaN(t.getTime())?"--:--":t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}function Pa(e){if(!e)return"--";const t=new Date(e);return isNaN(t.getTime())?"--":t.toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}function Lr(e,t){return`${Sn(e)}–${Sn(t)}`}function Ta(e){return ic[e||""]||e||"--"}function So(e){return e?Object.values(e).reduce((t,i)=>t+(parseFloat(String(i))||0),0):0}function Co(e){return e?Object.entries(e).map(([i,n])=>({hour:parseInt(i,10),value:parseFloat(String(n))||0})).filter(i=>isFinite(i.value)).sort((i,n)=>n.value-i.value).slice(0,3).filter(i=>i.value>0).map(i=>i.hour).sort((i,n)=>i-n):[]}function ki(e){if(!e)return null;const t=e.split(":").map(i=>parseInt(i,10));return t.length<2||!isFinite(t[0])||!isFinite(t[1])?null:t[0]*60+t[1]}function Ma(e,t,i){return t===null||i===null?!1:t<=i?e>=t&&e<i:e>=t||e<i}async function lc(){var e,t,i,n,r;try{if(!gr||!Or)return C.warn("[Boiler] No entry_id or inverter_sn — cannot fetch boiler canonical"),{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null};const a=await re.fetchOIGAPI(`/boiler/${gr}/${Or}`);if(!a)return{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null};let o=!1,s=null;try{const p=await re.fetchOIGAPI(`/${gr}/boiler_profile`);p!=null&&p.config?s=p.config:o=!0}catch{o=!0}const d={state:{current_temp:((e=a.current_state.temperatures)==null?void 0:e.upper_zone)??((t=a.current_state.temperatures)==null?void 0:t.top),target_temp:void 0,heating:a.current_state.heating,temperatures:a.current_state.temperatures,energy_state:a.current_state.energy_state,recommended_source:a.selected_source||a.current_state.recommended_source||void 0,circulation_recommended:!1},slots:a.plan_slots.map(p=>({start:p.start,end:p.end,consumption_kwh:p.consumption_kwh,avg_consumption_kwh:p.consumption_kwh,recommended_source:p.recommended_source,spot_price:p.spot_price??void 0})),total_consumption_kwh:a.plan_slots.reduce((p,u)=>p+(u.consumption_kwh||0),0),fve_kwh:((i=a.current_state.energy_tracking)==null?void 0:i.fve_kwh)??0,grid_kwh:((n=a.current_state.energy_tracking)==null?void 0:n.grid_kwh)??0,alt_kwh:((r=a.current_state.energy_tracking)==null?void 0:r.alt_kwh)??0,next_slot:a.plan_slots[0]||void 0,profiles:{}};return{profileData:d,planData:d,canonical:a,configProfileUnavailable:o,boilerProfileConfig:s}}catch(a){return C.warn("[Boiler] Failed to fetch canonical",{err:a}),{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null}}}function cc(e,t,i){const n=e||t,r=n==null?void 0:n.state,a=(r==null?void 0:r.temperatures)||{},o=(r==null?void 0:r.energy_state)||{},s=isFinite(a.upper_zone??a.top)?a.upper_zone??a.top??null:null,d=isFinite(a.lower_zone??a.bottom)?a.lower_zone??a.bottom??null:null,p=isFinite(o.avg_temp)?o.avg_temp??null:null,u=isFinite(o.energy_needed_kwh)?o.energy_needed_kwh??null:null,h=i.targetTempC??60,b=i.coldInletTempC??10,f=sc(p,h,b),m=(e==null?void 0:e.slots)||[],y=(e==null?void 0:e.next_slot)||dc(m);let S="Neplánováno";if(y){const $=Ta(y.recommended_source);S=`${Lr(y.start,y.end)} (${$})`}const x=Ta((r==null?void 0:r.recommended_source)||(y==null?void 0:y.recommended_source));return{currentTemp:isFinite(r==null?void 0:r.current_temp)?(r==null?void 0:r.current_temp)??null:null,targetTemp:(r==null?void 0:r.target_temp)||h,heating:(r==null?void 0:r.heating)||!1,tempTop:s,tempBottom:d,avgTemp:p,heatingPercent:f,energyNeeded:u,planCost:(e==null?void 0:e.estimated_cost_czk)??null,nextHeating:S,recommendedSource:x,nextProfile:(r==null?void 0:r.next_profile)||"",nextStart:(r==null?void 0:r.next_start)||""}}function dc(e){if(!Array.isArray(e))return null;const t=Date.now();return e.find(i=>{const n=new Date(i.end||i.end_time||"").getTime(),r=i.consumption_kwh??i.avg_consumption_kwh??0;return n>t&&r>0})||null}function pc(e){var b,f,m;if(!((b=e==null?void 0:e.slots)!=null&&b.length))return null;const t=e.slots.map(y=>({start:y.start||"",end:y.end||"",consumptionKwh:y.consumption_kwh??y.avg_consumption_kwh??0,recommendedSource:y.recommended_source||"",spotPrice:isFinite(y.spot_price)?y.spot_price??null:null,tempTop:y.temp_top,soc:y.soc})),i=t.filter(y=>y.consumptionKwh>0),n=parseFloat(String(e.total_consumption_kwh))||0,r=parseFloat(String(e.fve_kwh))||0,a=parseFloat(String(e.grid_kwh))||0,o=parseFloat(String(e.alt_kwh))||0,s=parseFloat(String(e.estimated_cost_czk))||0;let d="Mix: --";if(n>0){const y=Math.round(r/n*100),S=Math.round(a/n*100),x=Math.round(o/n*100);d=`Mix: FVE ${y}% · Síť ${S}% · Alt ${x}%`}const p=t.filter(y=>y.consumptionKwh>0&&y.spotPrice!==null).map(y=>({slot:y,price:y.spotPrice}));let u="--",h="--";if(p.length){const y=p.reduce((x,$)=>$.price<x.price?$:x),S=p.reduce((x,$)=>$.price>x.price?$:x);u=`${Lr(y.slot.start,y.slot.end)} (${y.price.toFixed(2)} Kč/kWh)`,h=`${Lr(S.slot.start,S.slot.end)} (${S.price.toFixed(2)} Kč/kWh)`}return{slots:t,totalConsumptionKwh:n,fveKwh:r,gridKwh:a,altKwh:o,estimatedCostCzk:s,nextSlot:e.next_slot?{start:e.next_slot.start||"",end:e.next_slot.end||"",consumptionKwh:e.next_slot.consumption_kwh||0,recommendedSource:e.next_slot.recommended_source||"",spotPrice:e.next_slot.spot_price??null}:null,planStart:Pa((f=e.slots[0])==null?void 0:f.start),planEnd:Pa((m=e.slots[e.slots.length-1])==null?void 0:m.end),sourceDigest:d,activeSlotCount:i.length,cheapestSpot:u,mostExpensiveSpot:h}}function uc(e){const t=parseFloat(String(e==null?void 0:e.fve_kwh))||0,i=parseFloat(String(e==null?void 0:e.grid_kwh))||0,n=parseFloat(String(e==null?void 0:e.alt_kwh))||0,r=t+i+n;return{fveKwh:t,gridKwh:i,altKwh:n,fvePercent:r>0?t/r*100:0,gridPercent:r>0?i/r*100:0,altPercent:r>0?n/r*100:0}}function hc(e,t,i){var b;const n=(e==null?void 0:e.summary)||{},r=(b=e==null?void 0:e.profiles)==null?void 0:b[i],a=(r==null?void 0:r.hourly_avg)||{},o=n.predicted_total_kwh??So(a),s=n.peak_hours??Co(a),d=isFinite(n.water_liters_40c)?n.water_liters_40c??null:null,p=n.circulation_windows||[],u=p.length?p.map(f=>`${f.start}–${f.end}`).join(", "):"--";let h="--";if(p.length){const f=new Date,m=f.getHours()*60+f.getMinutes();if(p.some(S=>{const x=ki(S.start),$=ki(S.end);return Ma(m,x,$)})){const S=p.find(x=>{const $=ki(x.start),P=ki(x.end);return Ma(m,$,P)});h=S?`ANO (do ${S.end})`:"ANO"}else{const S=t==null?void 0:t.state,x=S==null?void 0:S.circulation_recommended;let $=1/0,P=null;for(const H of p){const A=ki(H.start);if(A===null)continue;let j=A-m;j<0&&(j+=24*60),j<$&&($=j,P=H)}x&&P?h=`DOPORUČENO (${P.start}–${P.end})`:P?h=`Ne (další ${P.start}–${P.end})`:h="Ne"}}return{predictedTodayKwh:o,peakHours:s,waterLiters40c:d,circulationWindows:u,circulationNow:h}}function gc(e){const t=e??{},i=isFinite(t.volume_l)?t.volume_l??null:null,n=isFinite(t.heater_power_kw)?t.heater_power_kw??null:null,r=n!==null?n*1e3:null;return{volumeL:i,heaterPowerW:r,heaterPowerKw:n,targetTempC:isFinite(t.target_temp_c)?t.target_temp_c??null:null,deadlineTime:t.deadline_time||"--:--",stratificationMode:t.stratification_mode||"--",kCoefficient:i?(i*.001163).toFixed(4):"--",coldInletTempC:isFinite(t.cold_inlet_temp_c)?t.cold_inlet_temp_c??10:10,auraMaxTempC:isFinite(t.aura_max_temp_c)?t.aura_max_temp_c??null:null}}function bc(e){return e!=null&&e.profiles?Object.entries(e.profiles).map(([t,i])=>({id:t,name:i.name||t,targetTemp:i.target_temp||55,startTime:i.start_time||"06:00",endTime:i.end_time||"22:00",days:i.days||[1,1,1,1,1,0,0],enabled:i.enabled!==!1})):[]}function fc(e){var n;const t=[],i=((n=e==null?void 0:e.summary)==null?void 0:n.today_hours)||[];for(let r=0;r<24;r++){const a=i.includes(r);t.push({hour:r,temp:a?55:25,heating:a})}return t}function mc(e,t){var o;const i=(o=e==null?void 0:e.profiles)==null?void 0:o[t],n=["Po","Út","St","Čt","Pá","So","Ne"];if(!i)return n.map(s=>({day:s,hours:Array(24).fill(0)}));const r=i.heatmap||[];let a=[];if(r.length>0)a=r.map(s=>s.map(d=>d&&typeof d=="object"?parseFloat(d.consumption)||0:parseFloat(String(d))||0));else{const s=i.hourly_avg||{};a=Array.from({length:7},()=>Array.from({length:24},(d,p)=>parseFloat(String(s[p]||0))))}return n.map((s,d)=>({day:s,hours:a[d]||Array(24).fill(0)}))}function yc(e,t){var p;const i=(p=e==null?void 0:e.profiles)==null?void 0:p[t],n=(e==null?void 0:e.summary)||{},r=(i==null?void 0:i.hourly_avg)||{},a=Array.from({length:24},(u,h)=>parseFloat(String(r[h]||0))),o=n.predicted_total_kwh??So(r),s=n.peak_hours??Co(r),d=isFinite(n.avg_confidence)?n.avg_confidence??null:null;return{hourlyAvg:a,peakHours:s,predictedTotalKwh:o,confidence:d,daysTracked:7}}function vc(e,t){var u,h,b;if(!((u=e==null?void 0:e.slots)!=null&&u.length)||!(t!=null&&t.length))return{fve:"--",grid:"--"};const i=(h=e.slots[0])==null?void 0:h.start,n=(b=e.slots[e.slots.length-1])==null?void 0:b.end,r=i?new Date(i).getTime():null,a=n?new Date(n).getTime():null,o=t.filter(f=>{if(!r||!a)return!0;const m=f.timestamp||f.time;if(!m)return!1;const y=new Date(m).getTime();return y>=r&&y<=a}),s=f=>{const m=[];let y=null;for(const S of o){const x=S.timestamp||S.time;if(!x)continue;const $=new Date(x),P=f(S);P&&!y?y={start:$,end:$}:P&&y?y.end=$:!P&&y&&(m.push(y),y=null)}return y&&m.push(y),m.length?m.map(S=>`${Sn(S.start)}–${Sn(new Date(S.end.getTime()+15*6e4))}`).join(", "):"--"},d=s(f=>(parseFloat(f.solar_kwh??f.solar_charge_kwh??0)||0)>0),p=s(f=>(parseFloat(f.grid_charge_kwh??0)||0)>0);return{fve:d,grid:p}}async function xc(){return C.info("[Boiler] Planning heating..."),await re.callService("oig_cloud","plan_boiler_heating",{})}async function wc(){return C.info("[Boiler] Applying plan..."),await re.callService("oig_cloud","apply_boiler_plan",{})}async function _c(){return C.info("[Boiler] Canceling plan..."),await re.callService("oig_cloud","cancel_boiler_plan",{})}const $c=new Set(["charging_fve","charging_overflow","charging_grid","charging_alt","discharging","standby","unknown"]);function Da(e){return e&&$c.has(e)?e:"unknown"}function kc(e){return e==="on"?"on":e==="off"?"off":"unavailable"}function Sc(e,t=!1){var Re,te,_e;const i={entryId:null,boxId:null,available:!1};if(!e)return{status:null,planSlots:[],explanation:null,manualOverride:null,identity:i,activity:null,sourceSegments:[],timeline:[],sparkline:null,demandMap:null,circulationRuns:[],legionella:null,planSummary:null,energyToday:null,loading:!1,loadError:"Nepodařilo se načíst data bojleru",altSourceType:null};const n=e.current_state,r=n.temperatures??{},a=isFinite(r.top)?r.top??null:isFinite(r.upper_zone)?r.upper_zone??null:null,o=isFinite(r.bottom)?r.bottom??null:isFinite(r.lower_zone)?r.lower_zone??null:null,s={currentState:n.heating?"heating":"idle",comfortSatisfied:e.comfort_status.comfort_satisfied,comfortStatusCode:e.comfort_status.comfort_status_code,selectedSource:pr(e.selected_source).source,actuatedSource:pr(e.actuated_source).source,temperatureTop:a,temperatureBottom:o,energyNeededKwh:isFinite((Re=n.energy_state)==null?void 0:Re.energy_needed_kwh)?((te=n.energy_state)==null?void 0:te.energy_needed_kwh)??null:null,heating:n.heating,lastUpdate:n.last_update??null,degraded:e.degraded_flags.degraded,degradedFlags:hr(e.degraded_flags.flags??[])},d=(e.plan_slots??[]).map(w=>{const{source:X,sourceInvalid:se}=pr(w.recommended_source);return{start:w.start,end:w.end,consumptionKwh:w.consumption_kwh,confidence:w.confidence,recommendedSource:X,sourceInvalid:se||null,spotPrice:isFinite(w.spot_price)?w.spot_price??null:null,altPrice:isFinite(w.alt_price)?w.alt_price??null:null,overflowAvailable:w.overflow_available,heatingKwh:w.heating_kwh??null,pvKwh:w.pv_kwh??null,gridKwh:w.grid_kwh??null,altKwh:w.alt_kwh??null,expectedTempTopC:w.predicted_top_temp_c??w.predicted_temperature_c??null,comfortSatisfied:w.comfort_satisfied??null,estimatedCostCzk:w.estimated_cost_czk??null,pvShare:typeof w.pv_share=="number"?w.pv_share:w.consumption_kwh&&w.pv_contribution_kwh!=null?w.pv_contribution_kwh/w.consumption_kwh:null,purpose:w.purpose??null}}),p=hr(e.degraded_flags.flags??[]),u=t?[...p,"config_profile_unavailable"]:p,h=e.freshness??{},b={reasonCodes:e.reason_codes??[],planCreatedAt:h.plan_created_at??null,planValidUntil:h.plan_valid_until??null,dataAgeSecs:isFinite(h.data_age_seconds)?h.data_age_seconds??null:null,degradedReasons:u,unsatisfiedComfortGapC:e.comfort_status.unsatisfied_comfort_gap_c??null,temperatureAtDeadlineC:e.comfort_status.temperature_at_deadline_c??null},f={active:((_e=e.manual_override)==null?void 0:_e.active)??!1,ttlMinutes:ec,reason:"",capabilityAvailable:e.manual_override!=null},m={entryId:e.entry_id,boxId:e.box_id,available:!!(e.entry_id&&e.box_id)},y=e.activity??null,S=y!=null?{state:Da(y.state),source:ur(y.source),temperatureTrendCPerMin:isFinite(y.temperature_trend_c_per_min)?y.temperature_trend_c_per_min??null:null,fillLevelPct:isFinite(y.fill_level_pct)?y.fill_level_pct??null:null,auraMaxTempC:isFinite(y.aura_max_temp_c)?y.aura_max_temp_c:0,heaterStates:Object.fromEntries(Object.entries(y.heater_states??{}).map(([w,X])=>[w,kc(X)])),staleFlags:hr(Array.isArray(y.stale_flags)?y.stale_flags:[]),sourceEstimated:y.source_estimated===!0}:null,x=(e.source_segments??[]).map(w=>({key:ur(w.key),start:w.start,end:w.end,energyKwh:isFinite(w.energy_kwh)?w.energy_kwh:0,fillPct:isFinite(w.fill_pct)?w.fill_pct:0,active:w.active})),$=(e.timeline??[]).map(w=>({timestamp:w.timestamp,topTempC:isFinite(w.top_temp_c)?w.top_temp_c??null:null,bottomTempC:isFinite(w.bottom_temp_c)?w.bottom_temp_c??null:null,powerKw:isFinite(w.power_kw)?w.power_kw??null:null,sourceKey:ur(w.source_key),activityState:Da(w.activity_state)})),P=e.sparkline??null,H=P!=null?{temperature:Array.isArray(P.temperature)?P.temperature:[],power:Array.isArray(P.power)?P.power:[]}:null,A=e.demand_map??null,j=A!=null?{slotDurationMin:A.slot_duration_min,slotsP50:Array.isArray(A.slots_p50)?A.slots_p50:[],slotsP80:Array.isArray(A.slots_p80)?A.slots_p80:[],windows:Array.isArray(A.windows)?A.windows.map(w=>({slotIndex:w.slot_index,startMinute:w.start_minute,p80Kwh:w.p80_kwh,liters:w.liters,label:w.label})):[],profile:{category:A.profile.category,level:A.profile.level,daysUsed:A.profile.days_used,label:A.profile.label,fallbackUsed:A.profile.fallback_used},confidence:A.confidence}:null,k=e.circulation_runs??[],L=Array.isArray(k)?k.map(w=>({start:w.start,end:w.end,label:w.label||""})):[],M=e.legionella??null,q=M!=null?{enabled:M.enabled===!0,daysSinceLast:typeof M.days_since_last=="number"?M.days_since_last:null,intervalDays:typeof M.interval_days=="number"?M.interval_days:null,scheduledStart:M.scheduled_start??null}:null,G=e.plan_summary??null,N=G!=null?{estimatedCostCzk:typeof G.estimated_cost_czk=="number"?G.estimated_cost_czk:null,costIfAllGrid:typeof G.cost_if_all_grid=="number"?G.cost_if_all_grid:null,costIfAllAlt:typeof G.cost_if_all_alt=="number"?G.cost_if_all_alt:null,deadlineTime:G.deadline_time||"18:00"}:null,W=e.energy_today??null,Pe=W!=null?{totalKwh:typeof W.total_kwh=="number"?W.total_kwh:0,fveKwh:typeof W.fve_kwh=="number"?W.fve_kwh:0,gridKwh:typeof W.grid_kwh=="number"?W.grid_kwh:0,altKwh:typeof W.alt_kwh=="number"?W.alt_kwh:0,batteryKwh:typeof W.battery_kwh=="number"?W.battery_kwh:0,unattributedKwh:typeof W.unattributed_kwh=="number"?W.unattributed_kwh:0,sourceInvalid:W.source_invalid===!0}:null;return{status:s,planSlots:d,explanation:b,manualOverride:f,identity:m,activity:S,sourceSegments:x,timeline:$,sparkline:H,demandMap:j,circulationRuns:L,legionella:q,planSummary:N,energyToday:Pe,loading:!1,loadError:null,altSourceType:typeof e.alt_source_type=="string"?e.alt_source_type:null}}async function Cc(e){const{profileData:t,planData:i,canonical:n,configProfileUnavailable:r,boilerProfileConfig:a}=await lc();let o=null;try{const u=await re.loadBatteryTimeline(Or,"active");o=(u==null?void 0:u.active)||u||null,Array.isArray(o)&&o.length===0&&(o=null)}catch{}const s=(t==null?void 0:t.current_category)||Object.keys((t==null?void 0:t.profiles)||{})[0]||"workday_summer",d=Object.keys((t==null?void 0:t.profiles)||{}),p=gc(a);return{state:cc(i,t,p),plan:pc(i),energyBreakdown:uc(i),predictedUsage:hc(t,i,s),config:p,profiles:bc(t||i),heatmap:fc(i||t),heatmap7x24:mc(t,s),profiling:yc(t,s),currentCategory:s,availableCategories:d,forecastWindows:vc(i,o),v2Data:Sc(n,r)}}function Pc(e){var i;const t=((i=e==null?void 0:e.locale)==null?void 0:i.language)??(e==null?void 0:e.language)??"cs";return/^en/i.test(t)?"en":"cs"}const Fe={cs:{"boiler.status.heading":"Stav bojleru","boiler.status.heating":"Ohřev","boiler.status.idle":"Nečinný","boiler.status.unknown":"Neznámý","boiler.status.selected_source":"Vybraný zdroj","boiler.status.actuated_source":"Aktivní zdroj","boiler.status.temp_top":"Teplota nahoře","boiler.status.temp_bottom":"Teplota dole","boiler.status.energy_needed":"Zbývající energie","boiler.status.last_update":"Poslední aktualizace","boiler.status.degraded":"Degradováno","boiler.status.comfort_satisfied":"Komfort splněn","boiler.status.comfort_unsatisfied":"Komfort nesplněn","boiler.status.comfort_unknown":"Komfort neznámý","boiler.timeline.heading":"Plán nabíjení (15 min sloty)","boiler.timeline.empty":"Plán bojleru zatím není k dispozici.","boiler.timeline.col_time":"Čas","boiler.timeline.col_source":"Zdroj","boiler.timeline.col_temp":"Teplota","boiler.timeline.col_kwh":"Energie","boiler.timeline.col_cost":"Cena","boiler.timeline.col_pv":"FVE podíl","boiler.timeline.comfort_ok":"Komfort OK","boiler.timeline.comfort_gap":"Komfort nesplněn","boiler.explanation.heading":"Vysvětlení","boiler.explanation.empty":"Žádné vysvětlení od plánovače.","boiler.explanation.plan_created":"Plán vytvořen","boiler.explanation.plan_valid_until":"Plán platí do","boiler.explanation.data_age":"Stáří dat","boiler.explanation.freshness_heading":"Čerstvost vstupů","boiler.explanation.freshness_fresh":"vstupy aktuální","boiler.explanation.degraded_heading":"Degradované stavy","boiler.explanation.unsatisfied_gap":"Komfortní mezera","boiler.explanation.temp_at_deadline":"Předpokládaná teplota na deadline","boiler.override.heading":"Ruční přepis (sekundární)","boiler.override.subtitle":"Automatický plán je primární — přepis použijte jen výjimečně.","boiler.override.ttl_label":"Délka přepisu (minuty)","boiler.override.reason_label":"Důvod přepisu","boiler.override.submit":"Aktivovat přepis","boiler.override.identity_unavailable":"Nedostupné – identita bojleru není rozpoznána.","boiler.override.capability_unavailable":"Aktuátor neumožňuje ruční přepis.","boiler.override.active":"Přepis aktivní","boiler.override.ttl_remaining_min":"Zbývá","boiler.unavailable.loading":"Načítání dat bojleru…","boiler.unavailable.error":"Chyba při načítání bojleru","boiler.unavailable.degraded":"Bojler v degradovaném režimu","boiler.unavailable.unavailable":"Data bojleru nejsou k dispozici","boiler.source.fve":"FVE","boiler.source.grid":"Síť","boiler.source.alternative":"Alternativa","boiler.source.overflow":"Přetoky","boiler.source.discharge":"Vybíjení","boiler.source.none":"—","boiler.reason.comfort_satisfied":"Komfort splněn","boiler.reason.comfort_unsatisfied":"Komfort nelze splnit","boiler.reason.no_feasible_plan":"Žádný proveditelný plán","boiler.reason.bootstrap_profile":"Učící režim profilu (málo dat)","boiler.reason.history_profile_low_confidence":"Profil s nízkou důvěrou","boiler.reason.input_stale_price":"Ceny nejsou aktuální","boiler.reason.input_stale_pv":"FVE predikce není aktuální","boiler.reason.input_missing_recorder":"Chybí historie z recorderu","boiler.reason.input_adapter_error":"Chyba vstupního adapteru","boiler.reason.input_stale_temperature":"Teplota není aktuální","boiler.reason.top_sensor_unavailable":"Horní teploměr není dostupný","boiler.reason.bottom_sensor_unavailable_top_only_degraded":"Dolní teploměr není dostupný (top-only režim)","boiler.reason.primary_actuator_unavailable":"Hlavní topný aktuátor není dostupný","boiler.reason.alternative_actuator_unavailable_benchmark_only":"Alternativní zdroj jen jako benchmark","boiler.reason.circulation_pump_unavailable":"Cirkulační čerpadlo není dostupné","boiler.reason.actuator_rate_limited":"Aktuátor omezen rychlostním limitem","boiler.reason.actuator_serializer_error":"Chyba serializéru aktuátoru","boiler.reason.override_active":"Ruční přepis aktivní","boiler.reason.override_expired":"Ruční přepis vypršel","boiler.reason.planner_timeout":"Plánovač překročil časový limit","boiler.reason.replan_coalesced":"Přeplánování sloučeno","boiler.reason.source_selected_grid":"Vybrán zdroj: síť","boiler.reason.source_selected_pv":"Vybrán zdroj: FVE","boiler.reason.source_selected_alternative":"Vybrán zdroj: alternativa","boiler.reason.source_benchmark_only":"Alternativa pouze jako srovnání","boiler.reason.setup_incomplete":"Konfigurace bojleru není dokončena","boiler.reason.migration_required":"Vyžaduje se migrace bojleru","boiler.reason.api_repair_required":"Vyžaduje se oprava API","boiler.reason.storage_write_failed":"Selhalo uložení stavu bojleru","boiler.activity.state.charging_fve":"Nabíjení z FVE","boiler.activity.state.charging_overflow":"Nabíjení z přetoků","boiler.activity.state.charging_grid":"Nabíjení ze sítě","boiler.activity.state.charging_alt":"🔥 Ohřev plynem","boiler.activity.state.discharging":"Vybíjení","boiler.activity.state.standby":"Pohotovost","boiler.activity.state.unknown":"Neznámý stav","boiler.activity.fill_level":"Úroveň naplnění","boiler.activity.temp_trend":"Trend teploty","boiler.activity.aura_max_temp":"Max. teplota AURA","boiler.activity.stale_warning":"Zastaralá data","boiler.eta.label":"Odhadovaný čas do cíle","boiler.eta.already_reached":"Cíl dosažen","boiler.eta.unavailable":"Nelze odhadnout","boiler.config.heater_power_kw":"Výkon topení (kW)","boiler.config.deadline":"Deadline","boiler.config.goal_temp":"Cílová teplota","boiler.aria.status_panel":"Panel stavu bojleru","boiler.aria.plan_timeline":"Časová osa plánu bojleru","boiler.aria.source_explanation":"Vysvětlení zdroje","boiler.aria.override_panel":"Panel ručního přepisu","boiler.aria.svg_summary":"Vizualizace bojleru","boiler.aria.stale":"Data mohou být zastaralá","boiler.aria.source_unknown":"Neznámý zdroj","boiler.demand_map.heading":"Mapa odběrů","boiler.demand_map.empty":"Sbírám data o odběrech — mapa se objeví po pár dnech","boiler.demand_map.confidence":"Spolehlivost","boiler.demand_map.fallback_notice":"Přibližný profil (málo dat)","boiler.demand_map.meta":"Profil z historie ({n} dní, {cat})","boiler.demand_map.window.morning":"Ráno","boiler.demand_map.window.afternoon":"Odpoledne","boiler.demand_map.window.evening":"Večer","boiler.demand_map.window.night":"Noc","boiler.plan_strip.heading":"Plán ohřevu 24 h","boiler.plan_strip.meta":"zdroje + odběry + teplota + cirkulace","boiler.plan_strip.empty":"Plán ohřevu zatím není k dispozici.","boiler.plan_strip.now_label":"TEĎ","boiler.plan_strip.deadline_label":"pojistka","boiler.plan_strip.temp_zone_label":"°C horní zóna","boiler.plan_strip.legend_overflow":"☀️ Přetoky FVE","boiler.plan_strip.legend_grid":"🔌 Levné okno (síť)","boiler.plan_strip.legend_battery":"🔋→🔥 Ohřev z baterie","boiler.plan_strip.legend_alt":"🔥 Alternativní zdroj","boiler.plan_strip.legend_demands":"odběry (dolů)","boiler.plan_strip.legend_circ":"💧 cirkulace","boiler.plan_strip.source_overflow":"☀️ Přetoky FVE","boiler.plan_strip.source_grid":"🔌 Levné okno","boiler.plan_strip.source_battery":"🔋→🔥 Ohřev z baterie","boiler.plan_strip.source_alt":"🔥 Alternativní zdroj","boiler.plan_strip.source_legionella_prefix":"🦠","boiler.plan_strip.source_legionella":"🦠 Ochrana proti legionelle","boiler.plan_strip.circ_tooltip":"cirkulace","boiler.tank.ready_caption":"≥ 40 °C připraveno","boiler.tank.source_fve":"☀️ Nabíjí z přetoků FVE","boiler.tank.source_grid":"🔌 Nabíjí ze sítě","boiler.tank.source_battery":"🔋→🔥 Ohřev z baterie","boiler.tank.source_alt":"🔥 Ohřev plynem","boiler.tank.source_idle":"Neohřívá","boiler.tank.source_estimated_suffix":"(odhad)","boiler.energy_today.heading":"⚡ Z čeho se bojler nabil — dnes","boiler.energy_today.meta":"skutečné zdroje k dnešnímu datu","boiler.energy_today.empty":"Dnes zatím žádný ohřev","boiler.energy_today.source_fve":"☀️ FVE přetoky","boiler.energy_today.source_grid":"🔌 Síť","boiler.energy_today.source_alt":"🔥 Alternativní zdroj","boiler.energy_today.source_battery":"🔋→🔥 Baterie","boiler.energy_today.benchmark_prefix":"Kdyby vše ze sítě ≈","boiler.energy_today.benchmark_savings":"→ plán šetří","boiler.panel.source_title":"Zdroj & náklady","boiler.panel.comfort_title":"Komfort","boiler.panel.cost_today":"Cena dnes","boiler.panel.energy_today":"Energie dnes","boiler.panel.fve_label":"☀️ z FVE","boiler.panel.grid_label":"🔌 ze sítě","boiler.panel.unattributed_label":"⚡ el. (nerozlišený zdroj)","boiler.panel.alt_label":"🔥 z plynu","boiler.panel.battery_label":"🔋→🔥 z baterie","boiler.panel.savings_label":"Ušetřeno vs. plyn","boiler.panel.current_source":"Aktuální zdroj","boiler.panel.next_action":"Další akce","boiler.panel.tomorrow":"zítra","boiler.panel.source_overflow":"☀️ přetoky","boiler.panel.source_grid":"🔌 levné okno","boiler.panel.source_grid_short":"🔌 síť","boiler.panel.source_battery":"🔋→🔥 Ohřev z baterie","boiler.panel.source_battery_short":"🔋→🔥","boiler.panel.source_alt":"🔥 plyn","boiler.panel.deadline_label":"Pojistka (deadline)","boiler.panel.legionella_label":"Anti-legionella","boiler.panel.legionella_off":"vypnuto","boiler.panel.legionella_plan":"plán","boiler.panel.legionella_in":"za","boiler.panel.legionella_days":"dní","boiler.panel.legionella_overdue":"přesčas","boiler.panel.legionella_scheduled":"naplánováno","boiler.panel.trend_label":"Trend","boiler.panel.circ_label":"Cirkulace","boiler.panel.circ_before_peak":"před špičkou","boiler.panel.circ_off":"vypnuta"},en:{"boiler.status.heading":"Boiler status","boiler.status.heating":"Heating","boiler.status.idle":"Idle","boiler.status.unknown":"Unknown","boiler.status.selected_source":"Selected source","boiler.status.actuated_source":"Actuated source","boiler.status.temp_top":"Top temperature","boiler.status.temp_bottom":"Bottom temperature","boiler.status.energy_needed":"Energy needed","boiler.status.last_update":"Last update","boiler.status.degraded":"Degraded","boiler.status.comfort_satisfied":"Comfort satisfied","boiler.status.comfort_unsatisfied":"Comfort not satisfied","boiler.status.comfort_unknown":"Comfort unknown","boiler.timeline.heading":"Heating plan (15 min slots)","boiler.timeline.empty":"No boiler plan available yet.","boiler.timeline.col_time":"Time","boiler.timeline.col_source":"Source","boiler.timeline.col_temp":"Temp","boiler.timeline.col_kwh":"Energy","boiler.timeline.col_cost":"Cost","boiler.timeline.col_pv":"PV share","boiler.timeline.comfort_ok":"Comfort OK","boiler.timeline.comfort_gap":"Comfort gap","boiler.explanation.heading":"Explanation","boiler.explanation.empty":"No planner explanation yet.","boiler.explanation.plan_created":"Plan created","boiler.explanation.plan_valid_until":"Plan valid until","boiler.explanation.data_age":"Data age","boiler.explanation.freshness_heading":"Input freshness","boiler.explanation.freshness_fresh":"inputs fresh","boiler.explanation.degraded_heading":"Degraded state","boiler.explanation.unsatisfied_gap":"Comfort gap","boiler.explanation.temp_at_deadline":"Predicted deadline temperature","boiler.override.heading":"Manual override (secondary)","boiler.override.subtitle":"Automatic plan is primary — use override only when necessary.","boiler.override.ttl_label":"Override duration (minutes)","boiler.override.reason_label":"Override reason","boiler.override.submit":"Activate override","boiler.override.identity_unavailable":"Unavailable – boiler identity is not resolved.","boiler.override.capability_unavailable":"Actuator does not support manual override.","boiler.override.active":"Override active","boiler.override.ttl_remaining_min":"remaining","boiler.unavailable.loading":"Loading boiler data…","boiler.unavailable.error":"Failed to load boiler data","boiler.unavailable.degraded":"Boiler in degraded mode","boiler.unavailable.unavailable":"Boiler data unavailable","boiler.source.fve":"PV","boiler.source.grid":"Grid","boiler.source.alternative":"Alternative","boiler.source.overflow":"Overflow","boiler.source.discharge":"Discharge","boiler.source.none":"—","boiler.reason.comfort_satisfied":"Comfort satisfied","boiler.reason.comfort_unsatisfied":"Comfort cannot be met","boiler.reason.no_feasible_plan":"No feasible plan","boiler.reason.bootstrap_profile":"Bootstrap profile (low data)","boiler.reason.history_profile_low_confidence":"Low-confidence profile","boiler.reason.input_stale_price":"Spot prices are stale","boiler.reason.input_stale_pv":"PV forecast is stale","boiler.reason.input_missing_recorder":"Recorder history missing","boiler.reason.input_adapter_error":"Input adapter error","boiler.reason.input_stale_temperature":"Temperature reading stale","boiler.reason.top_sensor_unavailable":"Top sensor unavailable","boiler.reason.bottom_sensor_unavailable_top_only_degraded":"Bottom sensor unavailable (top-only mode)","boiler.reason.primary_actuator_unavailable":"Primary heating actuator unavailable","boiler.reason.alternative_actuator_unavailable_benchmark_only":"Alternative source benchmark only","boiler.reason.circulation_pump_unavailable":"Circulation pump unavailable","boiler.reason.actuator_rate_limited":"Actuator rate limited","boiler.reason.actuator_serializer_error":"Actuator serializer error","boiler.reason.override_active":"Manual override active","boiler.reason.override_expired":"Manual override expired","boiler.reason.planner_timeout":"Planner timeout","boiler.reason.replan_coalesced":"Replan coalesced","boiler.reason.source_selected_grid":"Source selected: grid","boiler.reason.source_selected_pv":"Source selected: PV","boiler.reason.source_selected_alternative":"Source selected: alternative","boiler.reason.source_benchmark_only":"Alternative is benchmark only","boiler.reason.setup_incomplete":"Boiler setup incomplete","boiler.reason.migration_required":"Boiler migration required","boiler.reason.api_repair_required":"API repair required","boiler.reason.storage_write_failed":"Failed to persist boiler state","boiler.activity.state.charging_fve":"Charging from PV","boiler.activity.state.charging_overflow":"Charging from overflow","boiler.activity.state.charging_grid":"Charging from grid","boiler.activity.state.charging_alt":"🔥 Gas heating","boiler.activity.state.discharging":"Discharging","boiler.activity.state.standby":"Standby","boiler.activity.state.unknown":"Unknown state","boiler.activity.fill_level":"Fill level","boiler.activity.temp_trend":"Temperature trend","boiler.activity.aura_max_temp":"AURA max temperature","boiler.activity.stale_warning":"Stale data","boiler.eta.label":"Estimated time to target","boiler.eta.already_reached":"Target reached","boiler.eta.unavailable":"Cannot estimate","boiler.config.heater_power_kw":"Heater power (kW)","boiler.config.deadline":"Deadline","boiler.config.goal_temp":"Target temperature","boiler.aria.status_panel":"Boiler status panel","boiler.aria.plan_timeline":"Boiler plan timeline","boiler.aria.source_explanation":"Source explanation","boiler.aria.override_panel":"Manual override panel","boiler.aria.svg_summary":"Boiler visualization","boiler.aria.stale":"Data may be stale","boiler.aria.source_unknown":"Unknown source","boiler.demand_map.heading":"Demand Map","boiler.demand_map.empty":"Collecting usage data — map will appear in a few days","boiler.demand_map.confidence":"Confidence","boiler.demand_map.fallback_notice":"Approximate profile (low data)","boiler.demand_map.meta":"Profile from history ({n} days, {cat})","boiler.demand_map.window.morning":"Morning","boiler.demand_map.window.afternoon":"Afternoon","boiler.demand_map.window.evening":"Evening","boiler.demand_map.window.night":"Night","boiler.plan_strip.heading":"Heating plan 24 h","boiler.plan_strip.meta":"sources + demands + temperature + circulation","boiler.plan_strip.empty":"Heating plan not available yet.","boiler.plan_strip.now_label":"NOW","boiler.plan_strip.deadline_label":"deadline","boiler.plan_strip.temp_zone_label":"°C top zone","boiler.plan_strip.legend_overflow":"☀️ PV overflow","boiler.plan_strip.legend_grid":"🔌 Cheap window (grid)","boiler.plan_strip.legend_battery":"🔋→🔥 Battery heating","boiler.plan_strip.legend_alt":"🔥 Alternative source","boiler.plan_strip.legend_demands":"demands (down)","boiler.plan_strip.legend_circ":"💧 circulation","boiler.plan_strip.source_overflow":"☀️ PV overflow","boiler.plan_strip.source_grid":"🔌 Cheap window","boiler.plan_strip.source_battery":"🔋→🔥 Battery heating","boiler.plan_strip.source_alt":"🔥 Alternative source","boiler.plan_strip.source_legionella_prefix":"🦠","boiler.plan_strip.source_legionella":"🦠 Legionella protection","boiler.plan_strip.circ_tooltip":"circulation","boiler.tank.ready_caption":"≥ 40 °C ready","boiler.tank.source_fve":"☀️ Charging from PV overflow","boiler.tank.source_grid":"🔌 Charging from grid","boiler.tank.source_battery":"🔋→🔥 Battery heating","boiler.tank.source_alt":"🔥 Gas heating","boiler.tank.source_idle":"Not heating","boiler.tank.source_estimated_suffix":"(estimated)","boiler.energy_today.heading":"⚡ What powered the boiler today","boiler.energy_today.meta":"actual sources to date","boiler.energy_today.empty":"No heating today yet","boiler.energy_today.source_fve":"☀️ PV overflow","boiler.energy_today.source_grid":"🔌 Grid","boiler.energy_today.source_alt":"🔥 Alternative source","boiler.energy_today.source_battery":"🔋→🔥 Battery","boiler.energy_today.benchmark_prefix":"If all from grid ≈","boiler.energy_today.benchmark_savings":"→ plan saves","boiler.panel.source_title":"Source & costs","boiler.panel.comfort_title":"Comfort","boiler.panel.cost_today":"Cost today","boiler.panel.energy_today":"Energy today","boiler.panel.fve_label":"☀️ from PV","boiler.panel.grid_label":"🔌 from grid","boiler.panel.unattributed_label":"⚡ electric (unattributed)","boiler.panel.alt_label":"🔥 from gas","boiler.panel.battery_label":"🔋→🔥 from battery","boiler.panel.savings_label":"Saved vs. gas","boiler.panel.current_source":"Current source","boiler.panel.next_action":"Next action","boiler.panel.tomorrow":"tomorrow","boiler.panel.source_overflow":"☀️ overflow","boiler.panel.source_grid":"🔌 cheap window","boiler.panel.source_grid_short":"🔌 grid","boiler.panel.source_battery":"🔋→🔥 Battery heat","boiler.panel.source_battery_short":"🔋→🔥","boiler.panel.source_alt":"🔥 gas","boiler.panel.deadline_label":"Deadline (guard)","boiler.panel.legionella_label":"Anti-legionella","boiler.panel.legionella_off":"disabled","boiler.panel.legionella_plan":"scheduled","boiler.panel.legionella_in":"in","boiler.panel.legionella_days":"days","boiler.panel.legionella_overdue":"overdue","boiler.panel.legionella_scheduled":"scheduled","boiler.panel.trend_label":"Trend","boiler.panel.circ_label":"Circulation","boiler.panel.circ_before_peak":"before peak","boiler.panel.circ_off":"off"}};function v(e,t){const i=Fe[t]??Fe.cs;return e in i?i[e]:e in Fe.cs?Fe.cs[e]:e}function $n(e,t){const i=`boiler.reason.${e}`;return Fe[t][i]?Fe[t][i]:Fe.cs[i]?Fe.cs[i]:e}function Jt(e,t){if(!e)return v("boiler.source.none",t);const i=`boiler.source.${e}`;return Fe[t][i]?Fe[t][i]:Fe.cs[i]?Fe.cs[i]:e}const za=new URLSearchParams(window.location.search),Vr=za.get("sn")||za.get("inverter_sn")||"";async function Ar(){const e=await re.fetchOIGAPI(`/${Vr}/module_config`);return!e||e.error?(C.warn("[Settings] module_config load failed",e),null):e}async function Tc(e,t,i=[2e3,4e3,8e3,15e3,3e4]){for(const n of i){await new Promise(a=>setTimeout(a,n));const r=await re.fetchOIGAPI(`/${Vr}/module_config`);if(r&&!r.error){e(r);return}}t()}async function Mc(e,t){const i=await re.fetchOIGAPI(`/${Vr}/module_config`,{method:"POST",body:JSON.stringify({section:e,values:t})});return i&&(i.updated===!0||i.updated===!1)?{ok:!0}:{ok:!1,fields:i==null?void 0:i.fields}}const Ea={efficiency:null,health:null,balancing:null,costComparison:null};function Po(e){const t=st();if(!t)return null;const i=t.findSensorId("battery_efficiency"),n=t.get(i);if(!n)return C.debug("Battery efficiency sensor not found"),null;const r=n.attributes||{},a=r.efficiency_last_month_pct!=null?{efficiency:Number(r.efficiency_last_month_pct??0),charged:Number(r.last_month_charge_kwh??0),discharged:Number(r.last_month_discharge_kwh??0),losses:Number(r.losses_last_month_kwh??0)}:null,o=r.efficiency_current_month_pct!=null?{efficiency:Number(r.efficiency_current_month_pct??0),charged:Number(r.current_month_charge_kwh??0),discharged:Number(r.current_month_discharge_kwh??0),losses:Number(r.losses_current_month_kwh??0)}:null,s=a??o;if(!s)return null;const d=a?"last_month":"current_month",p=a&&o?o.efficiency-a.efficiency:0;return{efficiency:s.efficiency,charged:s.charged,discharged:s.discharged,losses:s.losses,lossesPct:r[d==="last_month"?"losses_last_month_pct":"losses_current_month_pct"]??0,trend:p,period:d,currentMonthDays:r.current_month_days??0,lastMonth:a,currentMonth:o}}function To(e){const t=st();if(!t)return null;const i=t.findSensorId("battery_health"),n=t.get(i);if(!n)return C.debug("Battery health sensor not found"),null;const r=parseFloat(n.state)||0,a=n.attributes||{};let o,s;return r>=95?(o="excellent",s="Vynikající"):r>=90?(o="good",s="Dobrý"):r>=80?(o="fair",s="Uspokojivý"):(o="poor",s="Špatný"),{soh:r,capacity:a.capacity_p80_last_20??a.current_capacity_kwh??0,nominalCapacity:a.current_capacity_kwh??0,minCapacity:a.capacity_p20_last_20??0,measurementCount:a.measurement_count??0,lastAnalysis:a.last_analysis??"",qualityScore:a.quality_score??null,sohMethod:a.soh_selection_method??null,sohMethodDescription:a.soh_method_description??null,measurementHistory:Array.isArray(a.measurement_history)?a.measurement_history:[],degradation3m:a.degradation_3_months_percent??null,degradation6m:a.degradation_6_months_percent??null,degradation12m:a.degradation_12_months_percent??null,degradationPerYear:a.degradation_per_year_percent??null,estimatedEolDate:a.estimated_eol_date??null,yearsTo80Pct:a.years_to_80pct??null,trendConfidence:a.trend_confidence??null,status:o,statusLabel:s}}function Oa(e,t,i){if(!e||!t)return{daysRemaining:null,progressPercent:null,intervalDays:i||null};try{const n=new Date(e),r=new Date(t),a=new Date;if(isNaN(n.getTime())||isNaN(r.getTime()))return{daysRemaining:null,progressPercent:null,intervalDays:i||null};const o=r.getTime()-n.getTime(),s=a.getTime()-n.getTime(),d=Math.max(0,Math.round((r.getTime()-a.getTime())/(1e3*60*60*24))),p=o>0?Math.min(100,Math.max(0,Math.round(s/o*100))):null,u=i||Math.round(o/(1e3*60*60*24));return{daysRemaining:d,progressPercent:p,intervalDays:u||null}}catch{return{daysRemaining:null,progressPercent:null,intervalDays:i||null}}}function Mo(e){const t=st();if(!t)return null;const i=t.findSensorId("battery_balancing"),n=t.get(i);if(!n){const d=t.get(t.findSensorId("battery_health")),p=d==null?void 0:d.attributes;if(p!=null&&p.balancing_status){const u=String(p.last_balancing??""),h=p.next_balancing?String(p.next_balancing):null,b=Oa(u,h,Number(p.balancing_interval_days??0));return{status:String(p.balancing_status??"unknown"),lastBalancing:u,cost:Number(p.balancing_cost??0),nextScheduled:h,...b,estimatedNextCost:p.estimated_next_cost!=null?Number(p.estimated_next_cost):null}}return null}const r=n.attributes||{},a=String(r.last_balancing??""),o=r.next_scheduled?String(r.next_scheduled):null,s=Oa(a,o,Number(r.interval_days??0));return{status:n.state||"unknown",lastBalancing:a,cost:Number(r.cost??0),nextScheduled:o,...s,estimatedNextCost:r.estimated_next_cost!=null?Number(r.estimated_next_cost):null}}async function Dc(e){var t,i,n;try{const r=await re.loadUnifiedCostTile(e);if(!r)return null;const a=r.hybrid??r,o=a.today??{},s=Math.round((o.actual_cost_so_far??o.actual_total_cost??0)*100)/100,d=o.future_plan_cost??0,p=o.blended_total_cost??s+d,u=((t=a.tomorrow)==null?void 0:t.plan_total_cost)??null,h=!!((i=a.tomorrow)!=null&&i.mode_distribution),b=u===0&&!h?null:u;let f=null,m=null,y=null,S=null;try{const x=await re.loadBatteryTimeline(e,"active"),$=(n=x==null?void 0:x.timeline_extended)==null?void 0:n.yesterday;$!=null&&$.summary&&(f=$.summary.planned_total_cost??null,m=$.summary.actual_total_cost??null,y=$.summary.delta_cost??null,S=$.summary.accuracy_pct??null)}catch{C.debug("Yesterday analysis not available")}return{activePlan:"hybrid",actualSpent:s,planTotalCost:p,futurePlanCost:d,tomorrowCost:b,yesterdayPlannedCost:f,yesterdayActualCost:m,yesterdayDelta:y,yesterdayAccuracy:S}}catch(r){return C.error("Failed to fetch cost comparison",r),null}}async function zc(e){const t=Po(),i=To(),n=Mo(),r=await Dc(e);return{efficiency:t,health:i,balancing:n,costComparison:r}}function Ec(e){return{efficiency:Po(),health:To(),balancing:Mo()}}const Fi={severity:0,warningsCount:0,eventType:"",description:"",instruction:"",onset:"",expires:"",etaHours:0,allWarnings:[],effectiveSeverity:0},Oc={vítr:"💨",déšť:"🌧️",sníh:"❄️",bouřky:"⛈️",mráz:"🥶",vedro:"🥵",mlha:"🌫️",náledí:"🧊",laviny:"🏔️"};function Do(e){const t=e.toLowerCase();for(const[i,n]of Object.entries(Oc))if(t.includes(i))return n;return"⚠️"}const zo={0:"Bez výstrahy",1:"Nízká",2:"Zvýšená",3:"Vysoká",4:"Extrémní"},Cn={0:"#4CAF50",1:"#8BC34A",2:"#FF9800",3:"#f44336",4:"#9C27B0"};function Lc(e){const t=st();if(!t)return Fi;const i=`sensor.oig_${e}_chmu_warning_level`,n=t.get(i);if(!n)return C.debug("ČHMÚ sensor not found",{entityId:i}),Fi;const r=parseInt(n.state,10)||0,a=n.attributes||{},o=Number(a.warnings_count??0),s=String(a.event_type??""),d=String(a.description??""),p=String(a.instruction??""),u=String(a.onset??""),h=String(a.expires??""),b=Number(a.eta_hours??0),f=a.all_warnings_details??[],m=Array.isArray(f)?f.map(x=>({event_type:x.event_type??x.event??"",severity:x.severity??r,description:x.description??"",instruction:x.instruction??"",onset:x.onset??"",expires:x.expires??"",eta_hours:x.eta_hours??0})):[],y=s.toLowerCase().includes("žádná výstraha");return{severity:r,warningsCount:o,eventType:s,description:d,instruction:p,onset:u,expires:h,etaHours:b,allWarnings:m,effectiveSeverity:o===0||y?0:r}}const Eo={"HOME I":{icon:"🏠",color:"#4CAF50",label:"HOME I"},"HOME II":{icon:"⚡",color:"#2196F3",label:"HOME II"},"HOME III":{icon:"🔋",color:"#9C27B0",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"#FF9800",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"#FF9800",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"#9E9E9E",label:"DO NOTHING"}},Oo={yesterday:"📊 Včera",today:"📆 Dnes",tomorrow:"📅 Zítra",history:"📈 Historie",detail:"💎 Detail"};function La(e){return{modeHistorical:e.mode_historical??e.mode??"",modePlanned:e.mode_planned??"",modeMatch:e.mode_match??!1,status:e.status??"planned",startTime:e.start_time??"",endTime:e.end_time??"",durationHours:e.duration_hours??0,costHistorical:e.cost_historical??null,costPlanned:e.cost_planned??null,costDelta:e.cost_delta??null,solarKwh:e.solar_total_kwh??0,consumptionKwh:e.consumption_total_kwh??0,gridImportKwh:e.grid_import_total_kwh??0,gridExportKwh:e.grid_export_total_kwh??0,intervalReasons:Array.isArray(e.interval_reasons)?e.interval_reasons:[]}}function mn(e){return{plan:(e==null?void 0:e.plan)??0,actual:(e==null?void 0:e.actual)??null,hasActual:(e==null?void 0:e.has_actual)??!1,unit:(e==null?void 0:e.unit)??""}}function Ac(e){const t=(e==null?void 0:e.metrics)??{};return{overallAdherence:(e==null?void 0:e.overall_adherence)??0,modeSwitches:(e==null?void 0:e.mode_switches)??0,totalCost:(e==null?void 0:e.total_cost)??0,metrics:{cost:mn(t.cost),solar:mn(t.solar),consumption:mn(t.consumption),grid:mn(t.grid)},completedSummary:e!=null&&e.completed_summary?{count:e.completed_summary.count??0,totalCost:e.completed_summary.total_cost??0,adherencePct:e.completed_summary.adherence_pct??0}:void 0,plannedSummary:e!=null&&e.planned_summary?{count:e.planned_summary.count??0,totalCost:e.planned_summary.total_cost??0}:void 0,progressPct:e==null?void 0:e.progress_pct,actualTotalCost:e==null?void 0:e.actual_total_cost,planTotalCost:e==null?void 0:e.plan_total_cost,vsPlanPct:e==null?void 0:e.vs_plan_pct,backupBaselineCost:e==null?void 0:e.backup_baseline_cost,backupActualCost:e==null?void 0:e.backup_actual_cost,backupSavings:e==null?void 0:e.backup_savings,eodPrediction:e!=null&&e.eod_prediction?{predictedTotal:e.eod_prediction.predicted_total??0,predictedSavings:e.eod_prediction.predicted_savings??0}:void 0}}function Fc(e){return e?{date:e.date??"",modeBlocks:Array.isArray(e.mode_blocks)?e.mode_blocks.map(La):[],summary:Ac(e.summary),metadata:e.metadata?{activePlan:e.metadata.active_plan??"hybrid",comparisonPlanAvailable:e.metadata.comparison_plan_available}:void 0,comparison:e.comparison?{plan:e.comparison.plan??"",modeBlocks:Array.isArray(e.comparison.mode_blocks)?e.comparison.mode_blocks.map(La):[]}:void 0}:null}async function Ic(e,t,i="hybrid"){try{const n=await re.loadDetailTabs(e,t,i);if(!n)return null;const r=n[t]??n;return Fc(r)}catch(n){return C.error(`Failed to load timeline tab: ${t}`,n),null}}const Fr={tiles_left:[null,null,null,null,null,null],tiles_right:[null,null,null,null,null,null],left_count:4,right_count:4,visible:!0,version:1},Lo="oig_dashboard_tiles";function Bc(e,t){return t==="W"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kW"}:t==="Wh"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kWh"}:t==="W"||t==="Wh"?{value:Math.round(e).toString(),unit:t}:{value:e.toFixed(1),unit:t}}async function Nc(){var e;try{const t=await re.callWS({type:"call_service",domain:"oig_cloud",service:"get_dashboard_tiles",service_data:{},return_response:!0}),i=(e=t==null?void 0:t.response)==null?void 0:e.config;if(i&&typeof i=="object")return C.debug("Loaded tiles config from HA"),Fa(i)}catch(t){C.debug("WS tile config load failed, trying localStorage",{error:t.message})}try{const t=localStorage.getItem(Lo);if(t){const i=JSON.parse(t);return C.debug("Loaded tiles config from localStorage"),Fa(i)}}catch{C.debug("localStorage tile config load failed")}return Fr}async function Aa(e){try{return localStorage.setItem(Lo,JSON.stringify(e)),await re.callService("oig_cloud","save_dashboard_tiles",{config:JSON.stringify(e)}),C.info("Tiles config saved"),!0}catch(t){return C.error("Failed to save tiles config",t),!1}}function Fa(e){return{tiles_left:Array.isArray(e.tiles_left)?e.tiles_left.slice(0,6):Fr.tiles_left,tiles_right:Array.isArray(e.tiles_right)?e.tiles_right.slice(0,6):Fr.tiles_right,left_count:typeof e.left_count=="number"?e.left_count:4,right_count:typeof e.right_count=="number"?e.right_count:4,visible:e.visible!==!1,version:e.version??1}}function br(e){var s;const t=st();if(!t)return{value:"--",unit:"",isActive:!1,rawValue:0};const i=t.get(e);if(!i||i.state==="unavailable"||i.state==="unknown")return{value:"--",unit:"",isActive:!1,rawValue:0};const n=i.state,r=String(((s=i.attributes)==null?void 0:s.unit_of_measurement)??""),a=parseFloat(n)||0;if(i.entity_id.startsWith("switch.")||i.entity_id.startsWith("binary_sensor."))return{value:n==="on"?"Zapnuto":"Vypnuto",unit:"",isActive:n==="on",rawValue:n==="on"?1:0};const o=Bc(a,r);return{value:o.value,unit:o.unit,isActive:a!==0,rawValue:a}}function Si(e){const t=(i,n)=>{var a,o;const r=[];for(let s=0;s<n;s++){const d=i[s];if(!d)continue;const p=br(d.entity_id),u={};if((a=d.support_entities)!=null&&a.top_right){const h=br(d.support_entities.top_right);u.topRight={value:h.value,unit:h.unit}}if((o=d.support_entities)!=null&&o.bottom_right){const h=br(d.support_entities.bottom_right);u.bottomRight={value:h.value,unit:h.unit}}r.push({config:d,value:p.value,unit:p.unit,isActive:p.isActive,isZero:p.rawValue===0,formattedValue:p.unit?`${p.value} ${p.unit}`:p.value,supportValues:u})}return r};return{left:t(e.tiles_left,e.left_count),right:t(e.tiles_right,e.right_count)}}async function jc(e,t="toggle"){const i=e.split(".")[0];return re.callService(i,t,{entity_id:e})}function ne(e,t="CZK"){return e==null||Number.isNaN(e)?`-- ${t}`:`${e.toFixed(2)} ${t}`}function Zt(e,t=0){return e==null||Number.isNaN(e)?"-- %":`${e.toFixed(t)} %`}const Rc={fridge:"❄️","fridge-outline":"❄️",dishwasher:"🍽️","washing-machine":"🧺","tumble-dryer":"🌪️",stove:"🔥",microwave:"📦","coffee-maker":"☕",kettle:"🫖",toaster:"🍞",lightbulb:"💡","lightbulb-outline":"💡",lamp:"🪔","ceiling-light":"💡","floor-lamp":"🪔","led-strip":"✨","led-strip-variant":"✨","wall-sconce":"💡",chandelier:"💡",thermometer:"🌡️",thermostat:"🌡️",radiator:"♨️","radiator-disabled":"❄️","heat-pump":"♨️","air-conditioner":"❄️",fan:"🌀",hvac:"♨️",fire:"🔥",snowflake:"❄️","lightning-bolt":"⚡",flash:"⚡",battery:"🔋","battery-charging":"🔋","battery-50":"🔋","solar-panel":"☀️","solar-power":"☀️","meter-electric":"⚡","power-plug":"🔌","power-socket":"🔌",car:"🚗","car-electric":"🚘","car-battery":"🔋","ev-station":"🔌","ev-plug-type2":"🔌",garage:"🏠","garage-open":"🏠",door:"🚪","door-open":"🚪",lock:"🔒","lock-open":"🔓","shield-home":"🛡️",cctv:"📹",camera:"📹","motion-sensor":"👁️","alarm-light":"🚨",bell:"🔔","window-closed":"🪟","window-open":"🪟",blinds:"🪟","blinds-open":"🪟",curtains:"🪟","roller-shade":"🪟",television:"📺",speaker:"🔊","speaker-wireless":"🔊",music:"🎵","volume-high":"🔊",cast:"📡",chromecast:"📡","router-wireless":"📡",wifi:"📶","access-point":"📡",lan:"🌐",network:"🌐","home-assistant":"🏠",water:"💧","water-percent":"💧","water-boiler":"♨️","water-pump":"💧",shower:"🚿",toilet:"🚽",faucet:"🚰",pipe:"🔧","weather-sunny":"☀️","weather-cloudy":"☁️","weather-night":"🌙","weather-rainy":"🌧️","weather-snowy":"❄️","weather-windy":"💨",information:"ℹ️","help-circle":"❓","alert-circle":"⚠️","checkbox-marked-circle":"✅","toggle-switch":"🔘",power:"⚡",sync:"🔄"};function Pn(e){const t=e.replace(/^mdi:/,"");return Rc[t]||"⚙️"}function fr(e,t){let i=!1;return(...n)=>{i||(e(...n),i=!0,setTimeout(()=>i=!1,t))}}async function Ci(e,t=3,i=1e3){let n;for(let r=0;r<=t;r++)try{return await e()}catch(a){if(n=a,a instanceof Error&&(a.message.includes("401")||a.message.includes("403")))throw a;if(r<t){const o=Math.min(i*Math.pow(2,r),5e3);await new Promise(s=>setTimeout(s,o))}}throw n}class Hc{constructor(){this.state={..._o,pendingServices:new Map,changingServices:new Set},this.listeners=new Set,this.watcherUnsub=null,this.queueUpdateInterval=null,this.started=!1}start(){this.started||(this.started=!0,this.watcherUnsub=Pt.onEntityChange((t,i)=>{t&&this.shouldRefreshShield(t)&&this.refresh()}),this.refresh(),this.queueUpdateInterval=window.setInterval(()=>{this.state.allRequests.length>0&&this.notify()},1e3),C.debug("ShieldController started"))}stop(){var t;(t=this.watcherUnsub)==null||t.call(this),this.watcherUnsub=null,this.queueUpdateInterval!==null&&(clearInterval(this.queueUpdateInterval),this.queueUpdateInterval=null),this.started=!1,C.debug("ShieldController stopped")}subscribe(t){return this.listeners.add(t),t(this.state),()=>this.listeners.delete(t)}getState(){return this.state}shouldRefreshShield(t){return["service_shield_","box_prms_mode","box_mode_extended","box_prm2_app","boiler_manual_mode","invertor_prms_to_grid","invertor_prm1_p_max_feed_grid"].some(n=>t.includes(n))}readSupplementaryState(t){const i=t.findSensorId("box_mode_extended"),n=t.get(i);if(!n||n.state==="unavailable"||n.state==="unknown"||n.state==="")return{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1};const r=n.attributes??{};return{home_grid_v:r.home_grid_v===!0,home_grid_vi:r.home_grid_vi===!0,flexibilita:r.flexibilita===!0,available:!0}}refresh(){const t=st();if(t)try{const i=t.findSensorId("service_shield_activity"),n=t.get(i),r=(n==null?void 0:n.attributes)??{},a=r.running_requests??[],o=r.queued_requests??[],s=t.findSensorId("service_shield_status"),d=t.findSensorId("service_shield_queue"),p=t.getString(s).value,u=t.getNumeric(d).value,h=t.getString(t.findSensorId("box_prms_mode")).value,b=t.getString(t.findSensorId("invertor_prms_to_grid")).value,f=t.getNumeric(t.findSensorId("invertor_prm1_p_max_feed_grid")).value,m=t.getString(t.findSensorId("boiler_manual_mode")).value,y=ma[h.trim()]??"home_1",S=ya[m.trim()]??"cbb",x=a.map((G,N)=>this.parseRequest(G,N,!0)),$=o.map((G,N)=>this.parseRequest(G,N+a.length,!1)),P=[...x,...$],H=new Map,A=new Set;for(const G of P){const N=this.parseServiceRequest(G);N&&!H.has(N.type)&&(H.set(N.type,N.targetValue),A.add(N.type))}const j=p==="Running"||p==="running",M=$o({gridModeRaw:b,gridLimit:f},{pendingServices:H,changingServices:A,shieldStatus:j?"running":"idle"}),q=Pr(b)||M.currentLiveDelivery==="unknown"?this.state.currentGridDelivery:M.currentLiveDelivery;this.state={status:j?"running":"idle",activity:(n==null?void 0:n.state)??"",queueCount:u,runningRequests:x,queuedRequests:$,allRequests:P,currentBoxMode:y,currentGridDelivery:q,currentGridLimit:M.currentLiveLimit??0,currentBoilerMode:S,pendingServices:H,changingServices:A,gridDeliveryState:M,supplementary:this.readSupplementaryState(t)},this.notify()}catch(i){C.error("ShieldController refresh failed",i)}}parseRequest(t,i,n){const r=t||{},a=r.service??"",s=(Array.isArray(r.changes)?r.changes:[]).map(m=>typeof m=="string"?m:String(m??"")).filter(m=>m.length>0),d=r.started_at??r.queued_at??r.created_at??r.timestamp??r.created??"",p=Array.isArray(r.targets)?r.targets.map(m=>({param:String((m==null?void 0:m.param)??""),value:String((m==null?void 0:m.value)??(m==null?void 0:m.to)??""),entityId:String((m==null?void 0:m.entity_id)??(m==null?void 0:m.entityId)??""),from:String((m==null?void 0:m.from)??""),to:String((m==null?void 0:m.to)??(m==null?void 0:m.value)??""),current:String((m==null?void 0:m.current)??"")})):[],u=this.extractRequestParams(r.params),h=this.extractGridDeliveryStep(r,u),b=this.resolveRequestTargetValue(r,p,u,h);let f="mode_change";if(a.includes("set_box_mode")){const m=this.extractRequestParams(r.params);f=(m==null?void 0:m.home_grid_v)!==void 0||(m==null?void 0:m.home_grid_vi)!==void 0||Array.isArray(r.targets)&&r.targets.some(S=>(S==null?void 0:S.param)==="app")?"supplementary_toggle":"mode_change"}else a.includes("set_grid_delivery")&&!a.includes("limit")?f="grid_delivery":a.includes("grid_delivery_limit")||a.includes("set_grid_delivery")?f="grid_limit":a.includes("set_boiler_mode")?f="boiler_mode":a.includes("set_formating_mode")&&(f="battery_formating");return{id:`${a}_${i}_${d}`,type:f,status:n?"running":"queued",service:a,targetValue:b,changes:s,createdAt:d,position:i+1,description:typeof r.description=="string"?r.description:void 0,params:u,targets:p,traceId:typeof r.trace_id=="string"?r.trace_id:void 0,gridDeliveryStep:h}}parseServiceRequest(t){var p,u;const i=t.service;if(!i)return null;const n=t.changes.length>0?t.changes[0]:"",r=t.params,a=t.gridDeliveryStep,o=this.extractStructuredTarget(t);if(i.includes("set_grid_delivery")&&o)return o;if(i.includes("set_grid_delivery")&&n.includes("p_max_feed_grid")){const h=n.match(/→\s*'?(\d+)'?/),b=h?h[1]:t.targetValue;return b?{type:"grid_limit",targetValue:b}:null}const s=n.match(/→\s*'([^']+)'/),d=s?s[1]:t.targetValue||"";if(i.includes("set_box_mode")){if(((p=t.targets)==null?void 0:p.some(b=>b.param==="app"))||(r==null?void 0:r.home_grid_v)!==void 0||(r==null?void 0:r.home_grid_vi)!==void 0){const b=(u=t.targets)==null?void 0:u.find(y=>y.param==="app"),f=(b==null?void 0:b.to)||t.targetValue;return{type:"supplementary",targetValue:wo[f]??f??""}}return{type:"box_mode",targetValue:d}}if(i.includes("set_boiler_mode"))return{type:"boiler_mode",targetValue:d};if(i.includes("set_grid_delivery")&&n.includes("prms_to_grid"))return{type:"grid_mode",targetValue:d};if(i.includes("set_grid_delivery")){if(a==="limit"){const b=this.normalizeNumericTargetValue((r==null?void 0:r.limit)??t.targetValue);return b?{type:"grid_limit",targetValue:b}:null}if(a==="mode"){const b=this.normalizeModeTargetValue((r==null?void 0:r.mode)??t.targetValue);return b?{type:"grid_mode",targetValue:b}:null}const h=n.match(/→\s*'?(\d+)'?/);return h?{type:"grid_limit",targetValue:h[1]}:t.targetValue&&/^\d+$/.test(t.targetValue.trim())?{type:"grid_limit",targetValue:t.targetValue}:{type:"grid_mode",targetValue:d}}return null}extractRequestParams(t){if(!(!t||typeof t!="object"||Array.isArray(t)))return t}extractGridDeliveryStep(t,i){const n=(t==null?void 0:t.grid_delivery_step)??(i==null?void 0:i._grid_delivery_step);return typeof n=="string"?n:void 0}resolveRequestTargetValue(t,i,n,r){const a=this.extractStructuredTarget({service:(t==null?void 0:t.service)??"",targetValue:"",params:n,targets:i,gridDeliveryStep:r});if(a!=null&&a.targetValue)return a.targetValue;const o=t.target_value??t.target_display;return typeof o=="string"?o:""}extractStructuredTarget(t){if(!t.service.includes("set_grid_delivery"))return null;const i=t.gridDeliveryStep,n=t.params,r=t.targets??[];if(i==="limit"){const s=this.findTargetValue(r,["limit"]),d=this.normalizeNumericTargetValue(s??(n==null?void 0:n.limit)??t.targetValue);return d?{type:"grid_limit",targetValue:d}:null}if(i==="mode"){const s=this.findTargetValue(r,["mode"]),d=this.normalizeModeTargetValue(s??(n==null?void 0:n.mode)??t.targetValue);return d?{type:"grid_mode",targetValue:d}:null}const a=this.findTargetValue(r,["limit"]);if(a){const s=this.normalizeNumericTargetValue(a);if(s)return{type:"grid_limit",targetValue:s}}const o=this.findTargetValue(r,["mode"]);if(o){const s=this.normalizeModeTargetValue(o);if(s)return{type:"grid_mode",targetValue:s}}return null}findTargetValue(t,i){const n=new Set(i),r=t.find(a=>n.has(a.param));return(r==null?void 0:r.to)||(r==null?void 0:r.value)||void 0}normalizeNumericTargetValue(t){if(typeof t=="number"&&Number.isFinite(t))return String(Math.round(t));if(typeof t!="string")return"";const i=t.trim().match(/(\d+)/);return i?i[1]:""}normalizeModeTargetValue(t){if(typeof t!="string")return"";const i=t.trim();switch(i.toLowerCase()){case"off":return"Vypnuto";case"on":return"Zapnuto";case"limited":return"Omezeno";default:return i}}isLimitedGridDeliveryActiveOrPending(){const t=this.state.gridDeliveryState;if(t.pendingDeliveryTarget==="limited"||t.pendingLimitTarget!==null||t.currentLiveDelivery==="limited"||t.currentLiveDelivery==="unknown"&&(Pl(t)==="limited"||this.state.currentGridDelivery==="limited"))return!0;const i=st();if(i){const n=i.getString(i.findSensorId("invertor_prms_to_grid")).value;if(!Pr(n)&&Hr(n)==="limited")return!0}return!1}needsGridModeChangeForLimitedRequest(){return!this.isLimitedGridDeliveryActiveOrPending()}getBoxModeButtonState(t){const i=this.state.pendingServices.get("box_mode");return i?ma[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoxMode===t?"active":"idle"}getGridDeliveryButtonState(t){return this.getGridDeliveryButtonStateV2(t)}getGridDeliveryButtonStateV2(t){const i=this.state.gridDeliveryState,r=this.state.status==="running"?"processing":"pending",a=i.pendingDeliveryTarget,o=i.pendingLimitTarget,s=i.currentLiveDelivery;return a!==null?a===t?r:t==="limited"&&s==="limited"||t==="limited"&&s==="unknown"&&this.state.currentGridDelivery==="limited"?"active":"disabled-by-service":o!==null?t==="limited"?r:"disabled-by-service":s===t?"active":"idle"}getBoilerModeButtonState(t){const i=this.state.pendingServices.get("boiler_mode");return i?ya[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoilerMode===t?"active":"idle"}isAnyServiceChanging(){return this.state.changingServices.size>0}shouldProceedWithQueue(){return this.state.queueCount<3?!0:window.confirm(`⚠️ VAROVÁNÍ: Fronta již obsahuje ${this.state.queueCount} úkolů!

Každá změna může trvat až 10 minut.
Opravdu chcete přidat další úkol?`)}async setBoxMode(t){if(this.state.currentBoxMode===t&&!this.state.changingServices.has("box_mode"))return!1;const i=await re.callService("oig_cloud","set_box_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async setGridDelivery(t,i){const n={acknowledgement:!0,warning:!0};t==="limited"&&i!=null?(this.needsGridModeChangeForLimitedRequest()&&(n.mode=t),n.limit=i):i!=null?n.limit=i:n.mode=t;const r=await re.callService("oig_cloud","set_grid_delivery",n);return r&&this.refresh(),r}async setBoilerMode(t){if(this.state.currentBoilerMode===t&&!this.state.changingServices.has("boiler_mode"))return!1;const i=await re.callService("oig_cloud","set_boiler_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async removeFromQueue(t){const i=await re.callService("oig_cloud","shield_remove_from_queue",{position:t});return i&&this.refresh(),i}async setSupplementaryToggle(t,i){const n=await re.callService("oig_cloud","set_box_mode",{[t]:i,acknowledgement:!0});return n&&this.refresh(),n}notify(){for(const t of this.listeners)try{t(this.state)}catch(i){C.error("ShieldController listener error",i)}}}const le=new Hc;var Wc=Object.defineProperty,Vc=Object.getOwnPropertyDescriptor,Ft=(e,t,i,n)=>{for(var r=n>1?void 0:n?Vc(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Wc(t,i,r),r};const Ee=Z;let Xe=class extends z{constructor(){super(...arguments),this.title="Energetické Toky",this.time="",this.showStatus=!1,this.alertCount=0,this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1}onStatusClick(){this.dispatchEvent(new CustomEvent("status-click",{bubbles:!0}))}onEditClick(){this.dispatchEvent(new CustomEvent("edit-click",{bubbles:!0}))}onResetClick(){this.dispatchEvent(new CustomEvent("reset-click",{bubbles:!0}))}onToggleLeftPanel(){this.dispatchEvent(new CustomEvent("toggle-left-panel",{bubbles:!0}))}onToggleRightPanel(){this.dispatchEvent(new CustomEvent("toggle-right-panel",{bubbles:!0}))}render(){const e=this.alertCount>0?"warning":"ok";return c`
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
    `}};Xe.styles=D`
    :host {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: ${Ee(l.bgPrimary)};
      border-bottom: 1px solid ${Ee(l.divider)};
      gap: 12px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
      color: ${Ee(l.textPrimary)};
      margin: 0;
    }

    .title-icon { font-size: 20px; }

    .version {
      font-size: 11px;
      color: ${Ee(l.textSecondary)};
      background: ${Ee(l.bgSecondary)};
      padding: 2px 6px;
      border-radius: 4px;
    }

    .time {
      font-size: 13px;
      color: ${Ee(l.textSecondary)};
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
      background: ${Ee(l.warning)};
      color: #fff;
    }

    .status-badge.error {
      background: ${Ee(l.error)};
      color: #fff;
    }

    .status-badge.ok {
      background: ${Ee(l.success)};
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
      color: ${Ee(l.textSecondary)};
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: ${Ee(l.bgSecondary)};
      color: ${Ee(l.textPrimary)};
    }

    .action-btn.active {
      background: ${Ee(l.accent)};
      color: #fff;
    }
  `;Ft([g({type:String})],Xe.prototype,"title",2);Ft([g({type:String})],Xe.prototype,"time",2);Ft([g({type:Boolean})],Xe.prototype,"showStatus",2);Ft([g({type:Number})],Xe.prototype,"alertCount",2);Ft([g({type:Boolean})],Xe.prototype,"leftPanelCollapsed",2);Ft([g({type:Boolean})],Xe.prototype,"rightPanelCollapsed",2);Xe=Ft([E("oig-header")],Xe);function Ao(e,t){let i=null;return function(...n){i!==null&&clearTimeout(i),i=window.setTimeout(()=>{e.apply(this,n),i=null},t)}}var Kc=Object.defineProperty,qc=Object.getOwnPropertyDescriptor,en=(e,t,i,n)=>{for(var r=n>1?void 0:n?qc(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Kc(t,i,r),r};const Ia="oig_v2_theme";let Mt=class extends z{constructor(){super(...arguments),this.mode="auto",this.isDark=!1,this.breakpoint="desktop",this.width=1280,this.mediaQuery=null,this.resizeObserver=null,this.debouncedResize=Ao(this.updateBreakpoint.bind(this),100),this.onMediaChange=e=>{this.mode==="auto"&&(this.isDark=e.matches,this.dispatchEvent(new CustomEvent("theme-changed",{detail:{isDark:this.isDark}})))},this.onThemeChange=()=>{this.detectTheme()}}connectedCallback(){super.connectedCallback(),this.loadTheme(),this.setupMediaQuery(),this.setupResizeObserver(),this.detectTheme(),window.addEventListener("oig-theme-change",this.onThemeChange)}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mediaQuery)==null||e.removeEventListener("change",this.onMediaChange),(t=this.resizeObserver)==null||t.disconnect(),window.removeEventListener("oig-theme-change",this.onThemeChange)}loadTheme(){const e=localStorage.getItem(Ia);e&&["light","dark","auto"].includes(e)&&(this.mode=e)}saveTheme(){localStorage.setItem(Ia,this.mode)}setupMediaQuery(){this.mediaQuery=window.matchMedia("(prefers-color-scheme: dark)"),this.mediaQuery.addEventListener("change",this.onMediaChange)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(this.debouncedResize),this.resizeObserver.observe(document.documentElement),this.updateBreakpoint()}updateBreakpoint(){this.width=window.innerWidth,this.breakpoint=Yt(this.width)}detectTheme(){this.mode==="auto"?this.isDark=window.matchMedia("(prefers-color-scheme: dark)").matches:this.isDark=this.mode==="dark"}setTheme(e){this.mode=e,this.saveTheme(),this.detectTheme(),this.dispatchEvent(new CustomEvent("theme-changed",{detail:{mode:e,isDark:this.isDark}})),C.info("Theme changed",{mode:e,isDark:this.isDark})}getThemeInfo(){return{mode:this.mode,isDark:this.isDark,breakpoint:this.breakpoint,width:this.width}}render(){return c`
      <slot></slot>
    `}};Mt.styles=D`
    :host {
      display: contents;
    }
  `;en([g({type:String})],Mt.prototype,"mode",2);en([T()],Mt.prototype,"isDark",2);en([T()],Mt.prototype,"breakpoint",2);en([T()],Mt.prototype,"width",2);Mt=en([E("oig-theme-provider")],Mt);var Gc=Object.defineProperty,Uc=Object.getOwnPropertyDescriptor,Kr=(e,t,i,n)=>{for(var r=n>1?void 0:n?Uc(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Gc(t,i,r),r};let Ii=class extends z{constructor(){super(...arguments),this.tabs=[],this.activeTab=""}onTabClick(e){e!==this.activeTab&&(this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tabId:e},bubbles:!0})))}isActive(e){return this.activeTab===e}render(){return c`
      ${this.tabs.map(e=>c`
        <button 
          class="tab ${this.isActive(e.id)?"active":""}"
          @click=${()=>this.onTabClick(e.id)}
        >
          ${e.icon?c`<span class="tab-icon">${e.icon}</span>`:null}
          <span>${e.label}</span>
        </button>
      `)}
    `}};Ii.styles=D`
    :host {
      display: flex;
      gap: 8px;
      padding: 0 16px;
      background: ${Z(l.bgPrimary)};
      border-bottom: 1px solid ${Z(l.divider)};
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
      color: ${Z(l.textSecondary)};
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab:hover {
      color: ${Z(l.textPrimary)};
      background: ${Z(l.bgSecondary)};
    }

    .tab.active {
      color: ${Z(l.accent)};
      border-bottom-color: ${Z(l.accent)};
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
  `;Kr([g({type:Array})],Ii.prototype,"tabs",2);Kr([g({type:String})],Ii.prototype,"activeTab",2);Ii=Kr([E("oig-tabs")],Ii);var Yc=Object.defineProperty,Zc=Object.getOwnPropertyDescriptor,qr=(e,t,i,n)=>{for(var r=n>1?void 0:n?Zc(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Yc(t,i,r),r};const Qc="oig_v2_layout_",mr=Z;let Bi=class extends z{constructor(){super(...arguments),this.editable=!1,this.breakpoint="desktop",this.onResize=Ao(()=>{this.breakpoint=Yt(window.innerWidth)},100)}connectedCallback(){super.connectedCallback(),this.breakpoint=Yt(window.innerWidth),window.addEventListener("resize",this.onResize)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("resize",this.onResize)}updated(e){e.has("breakpoint")&&this.setAttribute("breakpoint",this.breakpoint)}resetLayout(){const e=`${Qc}${this.breakpoint}`;localStorage.removeItem(e),this.requestUpdate()}render(){return c`<slot></slot>`}};Bi.styles=D`
    :host {
      display: grid;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      background: ${mr(l.bgSecondary)};
    }

    :host([breakpoint='mobile']) { grid-template-columns: 1fr; }
    :host([breakpoint='tablet']) { grid-template-columns: repeat(2, 1fr); }
    :host([breakpoint='desktop']) { grid-template-columns: repeat(3, 1fr); }

    .grid-item {
      position: relative;
      background: ${mr(l.cardBg)};
      border-radius: 8px;
      box-shadow: ${mr(l.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .grid-item.editable { cursor: move; }
    .grid-item.editable:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .grid-item.dragging { opacity: 0.8; transform: scale(1.02); z-index: 100; }

    @media (max-width: 768px) {
      :host { gap: 12px; padding: 12px; }
    }
  `;qr([g({type:Boolean})],Bi.prototype,"editable",2);qr([T()],Bi.prototype,"breakpoint",2);Bi=qr([E("oig-grid")],Bi);const Xc={off:"Vypnuto",on:"Zapnuto",limited:"Omezeno",unknown:"?"};function Ba(e){return Xc[e]??e}const Fo=e=>{const t=e.trim();return t?t.endsWith("W")?t:`${t}W`:""};function Jc(e){const t=e.isUnavailable;let i;t||e.currentLiveDelivery==="unknown"?i="?":e.currentLiveDelivery==="limited"&&e.currentLiveLimit!==null?i=`Omezeno ${e.currentLiveLimit}W`:i=Ba(e.currentLiveDelivery);const n=!t&&e.currentLiveDelivery==="limited";let r=null,a=null;!t&&e.currentLiveLimit!==null&&(a=`${e.currentLiveLimit}W`,r=n?"Aktivní limit":"Nastavený limit");let o=null,s=null;return e.pendingDeliveryTarget!==null&&(o=`Ve frontě: ${Ba(e.pendingDeliveryTarget)}`),e.pendingLimitTarget!==null&&(s=`Ve frontě: limit ${Fo(String(e.pendingLimitTarget))}`),{currentModeText:i,limitLabel:r,limitValue:a,showLimitAsActive:n,isUnavailable:t,isTransitioning:e.isTransitioning,pendingModeText:o,pendingLimitText:s}}function ed(e,t){const i=t.has("box_mode"),n=e.get("box_mode"),r=t.has("grid_mode")||t.has("grid_limit"),a=e.get("grid_limit"),o=e.get("grid_mode");let s=null;if(a){const d=Fo(a);s=d?`→ ${d}`:null}else o&&(s=`→ ${o}`);return{inverterModeChanging:i,inverterModeText:n?`→ ${n}`:null,gridExportChanging:r,gridExportText:s}}var td=Object.defineProperty,id=Object.getOwnPropertyDescriptor,Yn=(e,t,i,n)=>{for(var r=n>1?void 0:n?id(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&td(t,i,r),r};let ei=class extends z{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1}get fillHeight(){return Math.max(0,Math.min(100,this.soc))/100*54}get fillY(){return 13+(54-this.fillHeight)}render(){return c`
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
    `}};ei.styles=D`
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
  `;Yn([g({type:Number})],ei.prototype,"soc",2);Yn([g({type:Boolean})],ei.prototype,"charging",2);Yn([g({type:Boolean})],ei.prototype,"gridCharging",2);ei=Yn([E("oig-battery-gauge")],ei);var nd=Object.defineProperty,rd=Object.getOwnPropertyDescriptor,Zn=(e,t,i,n)=>{for(var r=n>1?void 0:n?rd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&nd(t,i,r),r};let ti=class extends z{constructor(){super(...arguments),this.power=0,this.percent=0,this.maxPower=5400}get isNight(){return this.percent<2}get level(){return this.percent<2?"night":this.percent<20?"low":this.percent<65?"mid":"high"}get sunColor(){const e=this.level;return e==="low"?"#b0bec5":e==="mid"?"#ffd54f":"#ffb300"}get rayLen(){const e=this.level;return e==="low"?4:e==="mid"?7:10}get rayOpacity(){const e=this.level;return e==="low"?.5:e==="mid"?.8:1}get coreRadius(){const e=this.level;return e==="low"?7:e==="mid"?9:11}renderMoon(){return Q`
      <circle cx="24" cy="24" r="20" fill="#3949ab" opacity="0.28"/>
      <g class="moon-body">
        <path d="M24 6 A18 18 0 1 0 24 42 A13 13 0 1 1 24 6Z" fill="#cfd8dc" opacity="0.95"/>
      </g>
      <circle class="star" cx="7" cy="10" r="1.5" fill="#e8eaf6" style="animation-delay:0s"/>
      <circle class="star" cx="41" cy="7" r="1.8" fill="#e8eaf6" style="animation-delay:0.7s"/>
      <circle class="star" cx="5" cy="30" r="1.2" fill="#c5cae9" style="animation-delay:1.4s"/>
      <circle class="star" cx="6" cy="44" r="1.0" fill="#c5cae9" style="animation-delay:2.1s"/>
      <circle class="star" cx="42" cy="39" r="1.3" fill="#e8eaf6" style="animation-delay:2.8s"/>
    `}renderSun(){const i=this.coreRadius,n=i+3,r=n+this.rayLen,a=this.sunColor,o=this.rayOpacity,d=[0,45,90,135,180,225,270,315].map(u=>{const h=u*Math.PI/180,b=24+Math.cos(h)*n,f=24+Math.sin(h)*n,m=24+Math.cos(h)*r,y=24+Math.sin(h)*r;return Q`
        <line class="ray"
          x1="${b}" y1="${f}" x2="${m}" y2="${y}"
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
    `}};ti.styles=D`
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
  `;Zn([g({type:Number})],ti.prototype,"power",2);Zn([g({type:Number})],ti.prototype,"percent",2);Zn([g({type:Number})],ti.prototype,"maxPower",2);ti=Zn([E("oig-solar-icon")],ti);var ad=Object.defineProperty,od=Object.getOwnPropertyDescriptor,tn=(e,t,i,n)=>{for(var r=n>1?void 0:n?od(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&ad(t,i,r),r};let Dt=class extends z{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1,this.discharging=!1,this._clipId=`batt-clip-${Math.random().toString(36).slice(2)}`}get fillColor(){return this.gridCharging?"#42a5f5":this.soc>50?"#4caf50":this.soc>20?"#ff9800":"#f44336"}get fillHeight(){return Math.max(1,Math.min(100,this.soc)/100*48)}get fillY(){return 14+(48-this.fillHeight)}get stripeColor(){return this.gridCharging?"#90caf9":"#a5d6a7"}render(){const e=this.charging||this.gridCharging,t=this.soc>=25;return c`
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
    `}};Dt.styles=D`
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
  `;tn([g({type:Number})],Dt.prototype,"soc",2);tn([g({type:Boolean})],Dt.prototype,"charging",2);tn([g({type:Boolean})],Dt.prototype,"gridCharging",2);tn([g({type:Boolean})],Dt.prototype,"discharging",2);Dt=tn([E("oig-battery-icon")],Dt);var sd=Object.defineProperty,ld=Object.getOwnPropertyDescriptor,Io=(e,t,i,n)=>{for(var r=n>1?void 0:n?ld(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&sd(t,i,r),r};let Tn=class extends z{constructor(){super(...arguments),this.power=0}get mode(){return this.power>50?"importing":this.power<-50?"exporting":"idle"}render(){const e=this.mode;return c`
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
    `}};Tn.styles=D`
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
  `;Io([g({type:Number})],Tn.prototype,"power",2);Tn=Io([E("oig-grid-icon")],Tn);var cd=Object.defineProperty,dd=Object.getOwnPropertyDescriptor,Qn=(e,t,i,n)=>{for(var r=n>1?void 0:n?dd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&cd(t,i,r),r};let ii=class extends z{constructor(){super(...arguments),this.power=0,this.maxPower=1e4,this.boilerActive=!1}get percent(){return Math.min(100,this.power/Math.max(1,this.maxPower)*100)}get fillColor(){const e=this.percent;return e<15?"#546e7a":e<40?"#f06292":e<70?"#e91e63":"#c62828"}get level(){const e=this.percent;return e<15?"low":e<60?"mid":"high"}get windowColor(){const e=this.level;return e==="low"?"#37474f":e==="mid"?"#ffd54f":"#ffb300"}render(){const e=this.percent,t=24,i=22,n=Math.max(1,e/100*t),r=i+(t-n),a=this.level;return c`
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
    `}};ii.styles=D`
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
  `;Qn([g({type:Number})],ii.prototype,"power",2);Qn([g({type:Number})],ii.prototype,"maxPower",2);Qn([g({type:Boolean})],ii.prototype,"boilerActive",2);ii=Qn([E("oig-house-icon")],ii);var pd=Object.defineProperty,ud=Object.getOwnPropertyDescriptor,nn=(e,t,i,n)=>{for(var r=n>1?void 0:n?ud(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&pd(t,i,r),r};let zt=class extends z{constructor(){super(...arguments),this.mode="",this.bypassActive=!1,this.hasAlarm=!1,this.plannerAuto=!1}get modeType(){return this.hasAlarm?"alarm":this.bypassActive?"bypass":this.mode.includes("UPS")?"ups":"normal"}render(){const e=this.modeType;return c`
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
    `}};zt.styles=D`
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
  `;nn([g({type:String})],zt.prototype,"mode",2);nn([g({type:Boolean})],zt.prototype,"bypassActive",2);nn([g({type:Boolean})],zt.prototype,"hasAlarm",2);nn([g({type:Boolean})],zt.prototype,"plannerAuto",2);zt=nn([E("oig-inverter-icon")],zt);var hd=Object.defineProperty,gd=Object.getOwnPropertyDescriptor,Be=(e,t,i,n)=>{for(var r=n>1?void 0:n?gd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&hd(t,i,r),r};const U=Z,Na=new URLSearchParams(window.location.search),bd=Na.get("sn")||Na.get("inverter_sn")||"",fd=e=>`sensor.oig_${bd}_${e}`,yr="oig_v2_flow_layout_",rt=["solar","battery","inverter","grid","house"],md={solar:{top:"0%",left:"0%"},house:{top:"0%",left:"65%"},inverter:{top:"35%",left:"35%"},grid:{top:"70%",left:"0%"},battery:{top:"70%",left:"65%"}},Bo="oig_v2_flow_expanded_nodes";function yd(){try{const e=localStorage.getItem(Bo);if(e)return new Set(JSON.parse(e))}catch{}return new Set(["solar","house"])}function vd(e){try{localStorage.setItem(Bo,JSON.stringify([...e]))}catch{}}function Y(e){return()=>re.openEntityDialog(fd(e))}const xd=1e3,Mn=3300,No=300;function wd(e){const[t,i,n]=e.map(f=>Math.max(0,isFinite(f)?f:0)),r=t+i+n,a=Math.max(t,i,n)-Math.min(t,i,n),o=r<No,s=a<=xd,p=Math.max(t,i,n)/Mn*100,u=["L1","L2","L3"],h=[t,i,n].findIndex(f=>f>=Mn),b=h>=0?u[h]:null;return{spreadW:a,balanced:s,calm:o,worstPct:p,overloadPhase:b}}function _d(e,t){if(t<No)return{leftPct:0,widthPct:0};const i=Math.min(...e),n=Math.max(...e);return{leftPct:i,widthPct:n-i}}let De=class extends z{constructor(){super(...arguments),this.data=Rr,this.editMode=!1,this.pendingServices=new Map,this.changingServices=new Set,this.shieldStatus="idle",this.shieldQueueCount=0,this.gridDeliveryState={currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},this.shieldUnsub=null,this.expandedNodes=yd(),this.gaugeDetailOpen=null,this.customPositions={},this.draggedNodeId=null,this.dragStartX=0,this.dragStartY=0,this.dragStartTop=0,this.dragStartLeft=0,this.onShieldUpdate=e=>{this.pendingServices=e.pendingServices,this.changingServices=e.changingServices,this.shieldStatus=e.status,this.shieldQueueCount=e.queueCount,this.gridDeliveryState=e.gridDeliveryState},this.nodeDims={},this.handleDragStart=e=>{if(!this.editMode)return;e.preventDefault(),e.stopPropagation();const i=e.target.closest(".node");if(!i)return;const n=this.findNodeId(i);if(!n)return;this.draggedNodeId=n,i.classList.add("dragging");const r=i.getBoundingClientRect();this.dragStartX=e.clientX,this.dragStartY=e.clientY,this.dragStartTop=r.top,this.dragStartLeft=r.left},this.handleTouchStart=e=>{if(!this.editMode)return;e.preventDefault();const i=e.target.closest(".node");if(!i)return;const n=this.findNodeId(i);if(!n)return;this.draggedNodeId=n,i.classList.add("dragging");const r=e.touches[0],a=i.getBoundingClientRect();this.dragStartX=r.clientX,this.dragStartY=r.clientY,this.dragStartTop=a.top,this.dragStartLeft=a.left},this.handleDragMove=e=>{!this.draggedNodeId||!this.editMode||(e.preventDefault(),this.updateDragPosition(e.clientX,e.clientY))},this.handleTouchMove=e=>{if(!this.draggedNodeId||!this.editMode)return;e.preventDefault();const t=e.touches[0];this.updateDragPosition(t.clientX,t.clientY)},this.handleDragEnd=e=>{var n;if(!this.draggedNodeId||!this.editMode)return;const t=(n=this.shadowRoot)==null?void 0:n.querySelector(".flow-grid"),i=t==null?void 0:t.querySelector(`.node-${this.draggedNodeId}`);i&&i.classList.remove("dragging"),this.saveLayout(),this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0})),this.draggedNodeId=null},this.handleTouchEnd=e=>{this.handleDragEnd(e)}}connectedCallback(){super.connectedCallback(),this.loadSavedLayout(),this.shieldUnsub=le.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),this.removeDragListeners(),(e=this.shieldUnsub)==null||e.call(this),this.shieldUnsub=null}updated(e){e.has("editMode")&&(this.editMode?(this.setAttribute("editmode",""),this.loadSavedLayout(),this.requestUpdate(),this.updateComplete.then(()=>this.applySavedPositions())):(this.removeAttribute("editmode"),this.removeDragListeners(),this.clearInlinePositions(),this.updateComplete.then(()=>this.applyCustomPositions()))),!this.editMode&&this.hasCustomLayout&&this.updateComplete.then(()=>this.applyCustomPositions()),this.measureNodes()}measureNodes(){var n;const e=(n=this.shadowRoot)==null?void 0:n.querySelector(".flow-grid");if(!e)return;let t=!1;const i={...this.nodeDims};for(const r of rt){const a=e.querySelector(`.node-${r}`);if(!a)continue;const o=Math.round(a.offsetWidth),s=Math.round(a.offsetHeight);if(o<10||s<10)continue;const d=i[r];(!d||Math.abs(d.w-o)>1||Math.abs(d.h-s)>1)&&(i[r]={w:o,h:s},t=!0)}t&&(this.nodeDims=i)}loadSavedLayout(){const e=Yt(window.innerWidth),t=`${yr}${e}`;try{const i=localStorage.getItem(t);i&&(this.customPositions=JSON.parse(i),C.debug("[FlowNode] Loaded layout for "+e))}catch{}}applySavedPositions(){var t;if(!this.editMode)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of rt){const n=this.customPositions[i];if(!n)continue;const r=e.querySelector(`.node-${i}`);r&&(r.style.top=n.top,r.style.left=n.left)}this.initDragListeners()}}clearInlinePositions(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of rt){const n=e.querySelector(`.node-${i}`);n&&(n.style.top="",n.style.left="")}}saveLayout(){const e=Yt(window.innerWidth),t=`${yr}${e}`;try{localStorage.setItem(t,JSON.stringify(this.customPositions)),C.debug("[FlowNode] Saved layout for "+e)}catch{}}toggleExpand(e,t){const i=t.target;if(i.closest(".clickable")||i.closest(".indicator")||i.closest(".node-value")||i.closest(".node-subvalue")||i.closest(".gc-plan-btn"))return;const n=new Set(this.expandedNodes);n.has(e)?n.delete(e):n.add(e),this.expandedNodes=n,vd(n)}nodeClass(e,t=""){const i=this.expandedNodes.has(e)?" expanded":"";return`node node-${e}${i}${t?" "+t:""}`}gaugePill(e,t,i,n){const r=this.gaugeDetailOpen===e;return c`
      <button class="ss-pill" style="color:${i};border-color:${i}55"
        @click=${a=>{a.stopPropagation(),this.gaugeDetailOpen=r?null:e}}>${t}</button>
      ${r?c`
        <div class="ss-pop" style="border-color:${i}66"
          @click=${a=>a.stopPropagation()}>${n}</div>`:_}
    `}edgeGauge(e){const t=Math.max(0,Math.min(100,e.pct)),i=Math.max(1.5,Math.min(6,e.width??2.5)),n=e.nodeId?this.nodeDims[e.nodeId]:void 0,r=(n==null?void 0:n.w)??180,a=(n==null?void 0:n.h)??180,o=1.5,s=e.full?0:100-t,d=e.stops.map(([u,h])=>Q`<stop offset="${u}" stop-color="${h}"></stop>`),p=e.pulseDur?`--pulse-dur:${e.pulseDur}s`:"";return Q`
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
          stroke-dasharray="100" stroke-dashoffset=${s}></rect>
      </svg>`}edgeGaugeSegments(e){const t=Math.max(1.5,Math.min(6,e.width??3.5)),i=this.nodeDims[e.nodeId],n=(i==null?void 0:i.w)??180,r=(i==null?void 0:i.h)??180,a=1.5,o=10.5,s=e.segments.filter(u=>u.frac>.001);let d=0;const p=s.map(u=>{const h=-d;return d+=u.frac,Q`<rect x=${a} y=${a}
        width=${n-a*2} height=${r-a*2} rx=${o}
        fill="none" stroke=${u.color} stroke-width=${t}
        pathLength="100"
        stroke-dasharray="${u.frac} 100"
        stroke-dashoffset="${h}"></rect>`});return Q`
      <svg class="edge-gauge" viewBox="0 0 ${n} ${r}" preserveAspectRatio="none">
        <rect class="edge-track" x=${a} y=${a}
          width=${n-a*2} height=${r-a*2} rx=${o}></rect>
        ${p}
      </svg>`}get hasCustomLayout(){return rt.some(e=>{const t=this.customPositions[e];return(t==null?void 0:t.top)!=null&&(t==null?void 0:t.left)!=null})}applyCustomPositions(){var t;if(this.editMode||!this.hasCustomLayout)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of rt){const n=e.querySelector(`.node-${i}`);if(!n)continue;const r=this.customPositions[i]??md[i];n.style.top=r.top,n.style.left=r.left}}resetLayout(){const e=Yt(window.innerWidth),t=`${yr}${e}`;localStorage.removeItem(t),this.customPositions={},this.clearInlinePositions(),this.editMode&&this.requestUpdate(),C.debug("[FlowNode] Reset layout for "+e)}initDragListeners(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of rt){const n=e.querySelector(`.node-${i}`);n&&(n.addEventListener("mousedown",this.handleDragStart),n.addEventListener("touchstart",this.handleTouchStart,{passive:!1}))}document.addEventListener("mousemove",this.handleDragMove),document.addEventListener("mouseup",this.handleDragEnd),document.addEventListener("touchmove",this.handleTouchMove,{passive:!1}),document.addEventListener("touchend",this.handleTouchEnd)}}removeDragListeners(){document.removeEventListener("mousemove",this.handleDragMove),document.removeEventListener("mouseup",this.handleDragEnd),document.removeEventListener("touchmove",this.handleTouchMove),document.removeEventListener("touchend",this.handleTouchEnd)}findNodeId(e){for(const i of rt)if(e.classList.contains(`node-${i}`))return i;const t=e.closest('[class*="node-"]');if(!t)return null;for(const i of rt)if(t.classList.contains(`node-${i}`))return i;return null}updateDragPosition(e,t){var $;if(!this.draggedNodeId)return;const i=($=this.shadowRoot)==null?void 0:$.querySelector(".flow-grid");if(!i)return;const n=i.querySelector(`.node-${this.draggedNodeId}`);if(!n)return;const r=i.getBoundingClientRect(),a=n.getBoundingClientRect(),o=e-this.dragStartX,s=t-this.dragStartY,d=this.dragStartLeft+o,p=this.dragStartTop+s,u=r.left,h=r.right-a.width,b=r.top,f=r.bottom-a.height,m=Math.max(u,Math.min(h,d)),y=Math.max(b,Math.min(f,p)),S=(m-r.left)/r.width*100,x=(y-r.top)/r.height*100;n.style.left=`${S}%`,n.style.top=`${x}%`,this.customPositions[this.draggedNodeId]={top:`${x}%`,left:`${S}%`},this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0}))}renderSolar(){const e=this.data,t=M=>M>=1e3?`${(M/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(M)} W`,i=e.solarPercent,n=i<2,r=n?"linear-gradient(160deg,#1a1f30,#161a28)":_i.solar,a="transparent",o=e.solarToday/1e3,s=e.solarForecastToday>.1?e.solarForecastToday:o,d=Math.max(0,s-o),p=Math.max(0,o-s),u=p>.05,h=s>0?Math.round(o/s*100):100,b=Math.max(s,o,.1),f=Math.min(100,o/b*100),m=s/b*100,y=e.solarPower/1e3,S=n?"#5c6bc0":i<20?"#ff7043":i<50?"#ffa726":"#ffd54f",x=n?0:i,$=n?"#5a6480":S,P=n?"#9fa8da":S,H=n?"🌙 Noc":`${Math.round(i)} %`,A=u?"linear-gradient(90deg,#ffd54f,#66bb6a)":n?"linear-gradient(90deg,#6b7390,#8a93b5)":"linear-gradient(90deg,#ffd54f,#ffa726)",j=e.solarP1>0||e.solarV1>0,k=e.solarP2>0||e.solarV2>0,L=n?c`0 <small>W</small>`:(()=>{const M=e.solarPower;return M>=1e3?c`${(M/1e3).toFixed(1).replace(".",",")} <small>kW</small>`:c`${Math.round(M)} <small>W</small>`})();return c`
      <div class="${this.nodeClass("solar",n?"sol-night":"")}"
        style="--node-gradient: ${r}; --node-border: ${a};">

        ${this.edgeGauge({id:"gauge-solar",nodeId:"solar",pct:x,stops:[[0,$],[1,$]],width:n?2:2+Math.min(3,y),pulse:!n&&e.solarPower>30,pulseDur:Math.max(.9,2.2-y*.35),full:n})}

        <div class="node-tint" style="background: radial-gradient(120% 70% at 50% 0, ${n?"rgba(57,73,171,0.18)":S+"22"}, transparent 70%)"></div>

        <!-- GAUGE PILL: peak % špičky or 🌙 Noc -->
        ${this.gaugePill("solar",H,P,c`
          <div class="ss-pop-h"><span>Solární výkon</span><b style="color:${P}">${n?"🌙 Noc":`${Math.round(i)} % špičky`}</b></div>
          <div class="gp-r"><span>Aktuální výkon</span><b>${n?"0 W":`${Ye(e.solarPower)} · ${Math.round(i)} % špičky`}</b></div>
          <div class="gp-r"><span>Vyrobeno</span><b>${o.toFixed(1).replace(".",",")} kWh</b></div>
          <div class="gp-r"><span>Předpověď</span><b>${s.toFixed(1).replace(".",",")} kWh</b></div>
          <div class="gp-r"><span>${u?"Nad plánem":"Ještě vyrobí"}</span><b>${u?`+${p.toFixed(1).replace(".",",")} kWh`:n?"den skončil":d<.05?"splněno":`~${d.toFixed(1).replace(".",",")} kWh`}</b></div>
          <div class="gp-r"><span>Zítra</span><b>${e.solarForecastTomorrow.toFixed(1).replace(".",",")} kWh${e.solarForecastStale?" ⚠":""}</b></div>
        `)}

        <!-- HEADER: animated sun SVG by day / moon SVG at night -->
        <div class="sol-head">
          ${n?Q`<svg class="sol-ico" viewBox="0 0 24 24" fill="none" stroke="#9fa8da" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 14.5A8 8 0 1 1 9.5 4 6.2 6.2 0 0 0 20 14.5z" fill="#2a3050"/>
              </svg>`:Q`<svg class="sol-ico" viewBox="0 0 24 24" fill="none" stroke="${S}" stroke-width="2" stroke-linecap="round">
                <g class="sol-rays"><path d="M12 1.5v2.5M12 20v2.5M1.5 12h2.5M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8"/></g>
                <circle class="sol-core" cx="12" cy="12" r="4.2" fill="${S}" stroke="none"/>
              </svg>`}
          <span class="sol-cap">SOLÁR</span>
        </div>

        <!-- BIG CURRENT POWER -->
        <div class="sol-power" @click=${Y("actual_fv_total")}>
          ${L}
        </div>

        <!-- TINY SUBLINE: dnes X z Y kWh -->
        <div class="sol-sub" @click=${Y("dc_in_fv_ad")}>
          dnes ${o.toFixed(1).replace(".",",")} z ${s.toFixed(1).replace(".",",")} kWh
        </div>

        <!-- PRODUCTION BAR: fill = vyrobeno, target tick = plán, přerůstá nad plán -->
        <div class="sol-pbar">
          <div class="sol-pbar-fill" style="width:${f.toFixed(1)}%;background:${A}">
            ${f>=30?`${o.toFixed(1).replace(".",",")} kWh`:""}
          </div>
          ${u?c`<div class="sol-pbar-tick" style="left:${m.toFixed(1)}%" title="Plán ${s.toFixed(1).replace(".",",")} kWh"></div>`:_}
        </div>
        <div class="sol-pbar-lbl">
          <span>vyrobeno ${h} %</span>
          <span>${u?c`<span class="sol-over">+${p.toFixed(1).replace(".",",")} kWh</span>`:n?"den skončil":d<.05?"splněno":`ještě ~${d.toFixed(1).replace(".",",")} kWh`}</span>
        </div>

        <!-- COMPACT STRINGS (always visible, 2-col) -->
        <div class="sol-str">
          <div class="sol-sc ${j?"":"sol-off"}">
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
        <div class="sol-tmr" @click=${Y("solar_forecast")}>
          ${Q`<svg class="sol-tmr-ico" viewBox="0 0 24 24" fill="none" stroke="#ffd479" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18h18"></path><path d="M7 18a5 5 0 0 1 10 0"></path><path d="M12 5v2M5.6 8.6l1.4 1.4M18.4 8.6l-1.4 1.4M2.5 13h2M19.5 13h2"></path></svg>`}
          Zítra <b>${e.solarForecastTomorrow.toFixed(1).replace(".",",")} kWh</b>
          ${e.solarForecastStale?c`<span title="Předpověď zastaralá">⚠</span>`:_}
        </div>
      </div>
    `}openGridChargingDialog(){this.dispatchEvent(new CustomEvent("oig-grid-charging-open",{bubbles:!0,composed:!0,detail:{data:this.data.gridChargingPlan}}))}getBalancingIndicator(){const e=this.data,t=e.balancingState;return t!=="charging"&&t!=="holding"&&t!=="completed"?{show:!1,text:"",icon:"",cls:""}:t==="charging"?{show:!0,text:`Nabíjení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⚡",cls:"charging"}:t==="holding"?{show:!0,text:`Držení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⏸️",cls:"holding"}:{show:!0,text:"Dokončeno",icon:"✅",cls:"completed"}}renderBattery(){const e=this.data,t=this.getBalancingIndicator(),i=e.batteryTemp>25?"🌡️":e.batteryTemp<15?"🧊":"🌡️",n=e.batteryTemp>25?"temp-hot":e.batteryTemp<15?"temp-cold":"",r=Math.abs(e.batteryPower)/1e3,a=Math.abs(e.batteryPower)>10,o=e.batteryPower>10,s=e.batteryPower<-10,d=o?"Nabíjí":s?"Vybíjí":"Klid",p=o?"st-charge":s?"st-discharge":"st-idle",u=`${o?"+":s?"−":""}${Ye(Math.abs(e.batteryPower))}`,h=y=>!!y&&/\d/.test(y),b=o&&h(e.timeToFull)?` · do plna ${e.timeToFull}`:s&&h(e.timeToEmpty)?` · do vybití ${e.timeToEmpty}`:"",f=e.batterySoC>=66?"rgba(67,160,71,0.13)":e.batterySoC>=33?"rgba(253,216,53,0.10)":"rgba(229,57,53,0.12)",m=e.batterySoC>=66?"#43a047":e.batterySoC>=33?"#fdd835":"#e53935";return c`
      <div class="${this.nodeClass("battery")}" style="--node-gradient: ${_i.battery}; --node-border: ${hn.battery};"
        @click=${y=>this.toggleExpand("battery",y)}>
        ${this.edgeGauge({id:"gauge-battery",nodeId:"battery",pct:e.batterySoC,stops:[[0,"#e53935"],[.45,"#fb8c00"],[.7,"#fdd835"],[1,"#43a047"]],width:2+Math.min(3,r),pulse:a,pulseDur:Math.max(.9,2.2-r*.35)})}

        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 100%, ${f}, transparent 72%)"></div>
        ${this.gaugePill("battery",`${Math.round(e.batterySoC)} %`,m,c`
          <div class="ss-pop-h"><span>Nabití baterie</span><b style="color:${m}">${Math.round(e.batterySoC)} %</b></div>
          <div class="gp-r"><span>Stav</span><b>${d} ${u}</b></div>
          ${b?c`<div class="gp-r"><span>Čas</span><b>${b.replace(" · ","")}</b></div>`:_}
          <div class="gp-r"><span>Dnes nabito</span><b>${nt(e.batteryChargeTotal)}</b></div>
          <div class="gp-r"><span>Dnes vybito</span><b>${nt(e.batteryDischargeTotal)}</b></div>
        `)}

        <div class="node-header node-header--split">
          <span class="node-label">🔋 Baterie</span>
          <span class="node-state ${p}">${d}</span>
        </div>

        <div class="node-value" @click=${Y("batt_bat_c")}>
          ${Math.round(e.batterySoC)} %
        </div>
        <div class="node-subvalue" @click=${Y("batt_batt_comp_p")}>
          ${u}${b}
        </div>

        ${e.isGridCharging?c`
          <span class="grid-charging-badge">⚡🔌 Síťové nabíjení</span>
        `:_}
        ${t.show?c`
          <span class="balancing-indicator ${t.cls}">
            <span>${t.icon}</span>
            <span>${t.text}</span>
          </span>
        `:_}

        <div class="battery-indicators">
          <button class="indicator" @click=${Y("extended_battery_voltage")}>
            ⚡ ${e.batteryVoltage.toFixed(1)} V
          </button>
          <button class="indicator" @click=${Y("extended_battery_current")}>
            〰️ ${e.batteryCurrent.toFixed(1)} A
          </button>
          <button class="indicator ${n}" @click=${Y("extended_battery_temperature")}>
            ${i} ${e.batteryTemp.toFixed(1)} °C
          </button>
        </div>

        <!-- Energie + gc-plan vždy viditelné (ne v detail-section) -->
        <div class="battery-energy-section">
          <div class="detail-header">⚡ Energie dnes</div>
          <div class="energy-grid">
            <div class="detail-row">
              <span class="icon">⬆️</span>
              <button class="clickable" @click=${Y("computed_batt_charge_energy_today")}>
                Nab: ${nt(e.batteryChargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">⬇️</span>
              <button class="clickable" @click=${Y("computed_batt_discharge_energy_today")}>
                Vyb: ${nt(e.batteryDischargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">☀️</span>
              <button class="clickable" @click=${Y("computed_batt_charge_fve_energy_today")}>
                FVE: ${nt(e.batteryChargeSolar)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">🔌</span>
              <button class="clickable" @click=${Y("computed_batt_charge_grid_energy_today")}>
                Síť: ${nt(e.batteryChargeGrid)}
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
    `}getInverterModeDesc(){const e=this.data.inverterMode;return e.includes("Home 1")?"Max baterie + FVE":e.includes("Home 2")?"Šetří baterii":e.includes("Home 3")?"Priorita nabíjení":e.includes("UPS")?"Vše ze sítě":""}renderInverter(){const e=this.data,t=Il(e.inverterMode),i=e.bypassStatus.toLowerCase()==="on"||e.bypassStatus==="1",n=e.inverterTemp>35?"🔥":"🌡️",r=Bl(e.inverterGridMode),a=ed(this.pendingServices,this.changingServices),o=Jc(this.gridDeliveryState);let s="planner-unknown",d="Plánovač: N/A";e.plannerAutoMode===!0?(s="planner-auto",d="Plánovač: AUTO"):e.plannerAutoMode===!1&&(s="planner-off",d="Plánovač: VYPNUTO");const p=e.inverterMode,u=p.includes("UPS")?"#ff9800":p.includes("Home 2")?"#2196f3":p.includes("Home 3")?"#9c27b0":"#4caf50",h=e.inverterTemp>=45?"#e53935":e.inverterTemp>=35?"#ffa726":"#43a047",b=Math.max(0,Math.min(100,e.inverterTemp/55*100)),f=i?"#e53935":h;return c`
      <div class="${this.nodeClass("inverter",a.inverterModeChanging?"mode-changing":"")}" style="--node-gradient: ${_i.inverter}; --node-border: ${hn.inverter};"
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
        <div class="node-value" @click=${Y("box_prms_mode")} style="color:${u}">
          ${a.inverterModeChanging?c`<span class="spinner spinner--small"></span>`:_}
          ${t.icon} ${t.text}
        </div>
        ${this.getInverterModeDesc()?c`<div class="node-subvalue">${this.getInverterModeDesc()}</div>`:_}
        ${a.inverterModeText?c`<div class="pending-text">${a.inverterModeText}</div>`:_}

        <div class="inv-chip ${s}">🤖 ${d}</div>

        <div class="inv-rows">
          <div class="inv-row">
            <span class="inv-lab">${n} Teplota</span>
            <button class="inv-pill" style="background:${h}26;color:${h}"
              @click=${Y("box_temp")}>${e.inverterTemp.toFixed(1)} °C</button>
          </div>
          <div class="inv-row">
            <span class="inv-lab">🔁 Bypass</span>
            <button class="inv-pill ${i?"pill-red":"pill-green"}"
              @click=${Y("bypass_status")}>${i?"ZAP":"Vyp"}</button>
          </div>
          <div class="inv-row">
            <span class="inv-lab">${r.icon} Dodávka</span>
            <button class="inv-val ${o.isUnavailable?"current-state-unknown":""}"
              @click=${Y("invertor_prms_to_grid")}>${o.currentModeText}</button>
          </div>
          ${o.limitLabel!==null?c`
            <div class="inv-row">
              <span class="inv-lab">🌊 ${o.limitLabel}</span>
              <button class="inv-val ${o.showLimitAsActive?"limit-active":""}"
                @click=${Y("invertor_prm1_p_max_feed_grid")}>${o.limitValue}</button>
            </div>
          `:_}
          <div class="inv-row">
            <span class="inv-lab">🛡️ Shield</span>
            <span class="inv-val">${this.shieldStatus==="running"?"Zpracovávám":"Nečinný"}${this.shieldQueueCount>0?` (${this.shieldQueueCount})`:""}</span>
          </div>
        </div>

        <button class="inv-note ${e.notificationsError>0?"warn":""}"
          @click=${Y("notification_count_unread")}>
          🔔 ${e.notificationsError>0?`${e.notificationsError} chyb · ${e.notificationsUnread} nepřečtených`:e.notificationsUnread>0?`${e.notificationsUnread} nepřečtených`:"Bez notifikací"}
        </button>

        ${o.pendingModeText?c`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${o.pendingModeText}
          </div>
        `:_}
        ${o.pendingLimitText?c`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${o.pendingLimitText}
          </div>
        `:_}
      </div>
    `}renderGrid(){const e=this.data,t=e.gridPower>10,i=e.gridPower<-10,n=Math.abs(e.gridPower),r=n/1e3,a=t?"↓ Odběr ze sítě":i?"↑ Přetok do sítě":"◉ Žádný tok",o=25*230*3,s=e.inverterGridLimit>0?e.inverterGridLimit:5e3,d=t?n/o*100:i?n/s*100:0,p=t?e.spotPrice<=0?"#43a047":e.spotPrice<3?"#ffa726":"#ef5350":i?e.exportPrice>=3?"#43a047":e.exportPrice>=1.5?"#ffa726":"#ef5350":"rgba(255,255,255,0.35)",u=t?`${e.spotPrice.toFixed(2)} Kč`:i?`+${e.exportPrice.toFixed(2)} Kč`:"",h=(b,f)=>f>10?Math.round(Math.abs(b)/f):0;return c`
      <div class="${this.nodeClass("grid")}" style="--node-gradient: ${_i.grid}; --node-border: ${hn.grid};"
        @click=${b=>this.toggleExpand("grid",b)}>
        ${this.edgeGauge({id:"gauge-grid",nodeId:"grid",pct:d,stops:[[0,p],[1,p]],width:2+Math.min(3,r),pulse:t||i,pulseDur:Math.max(.9,2.2-r*.35)})}
        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 50%, ${p}22, transparent 72%)"></div>

        <button class="indicator" style="position:absolute;top:4px;left:6px;font-size:9px;z-index:3" @click=${Y("current_tariff")}>
          ${Fl(e.currentTariff)}
        </button>
        <button class="indicator" style="position:absolute;top:4px;right:6px;font-size:9px;z-index:3" @click=${Y("ac_in_aci_f")}>
          ${e.gridFrequency.toFixed(1)} Hz
        </button>

        ${this.gaugePill("grid",t||i?`${Math.round(d)} %`:"0 %",p,c`
          <div class="ss-pop-h"><span>${t?"Vytížení jističe":i?"Vytížení limitu přetoku":"Síť v klidu"}</span><b style="color:${p}">${Math.round(d)} %</b></div>
          <div class="gp-r"><span>Tok</span><b>${a} · ${Ye(n)}</b></div>
          <div class="gp-r"><span>Limit</span><b>${t?`${(o/1e3).toFixed(1)} kW (25 A/fáze)`:`${(s/1e3).toFixed(1)} kW přetok`}</b></div>
          <div class="gp-r"><span>Spot / Výkup</span><b>${e.spotPrice.toFixed(2)} / ${e.exportPrice.toFixed(2)} Kč</b></div>
        `)}

        <div class="node-header node-header--split" style="margin-top:16px">
          <span class="node-label">🔌 Síť</span>
          <span class="node-state" style="color:${p}">${u}</span>
        </div>
        <div class="node-value" @click=${Y("actual_aci_wtotal")}>${Ye(n)}</div>
        <div class="node-subvalue" style="color:${p};font-weight:600">${a}</div>

        <!-- Ceny — vždy viditelné jako rychlý přehled -->
        <div class="prices-row" style="margin-top:4px">
          <div class="price-cell">
            <span class="price-label">⬇ Spot</span>
            <button class="price-val price-spot" @click=${Y("spot_price_current_15min")}>
              ${e.spotPrice.toFixed(2)} Kč
            </button>
          </div>
          <div class="energy-divider-v"></div>
          <div class="price-cell">
            <span class="price-label">⬆ Výkup</span>
            <button class="price-val price-export" @click=${Y("export_price_current_15min")}>
              ${e.exportPrice.toFixed(2)} Kč
            </button>
          </div>
        </div>

        <!-- 3 fáze — vždy viditelné -->
        <div class="phases-grid" style="margin-top:6px">
          <div class="phase-cell">
            <span class="phase-label">L1</span>
            <button class="phase-val" @click=${Y("actual_aci_wr")}>${h(e.gridL1P,e.gridL1V)} A</button>
            <button class="phase-val" style="font-size:10px;color:${U(l.textSecondary)}" @click=${Y("actual_aci_wr")}>${Math.round(e.gridL1P)} W</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L2</span>
            <button class="phase-val" @click=${Y("actual_aci_ws")}>${h(e.gridL2P,e.gridL2V)} A</button>
            <button class="phase-val" style="font-size:10px;color:${U(l.textSecondary)}" @click=${Y("actual_aci_ws")}>${Math.round(e.gridL2P)} W</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L3</span>
            <button class="phase-val" @click=${Y("actual_aci_wt")}>${h(e.gridL3P,e.gridL3V)} A</button>
            <button class="phase-val" style="font-size:10px;color:${U(l.textSecondary)}" @click=${Y("actual_aci_wt")}>${Math.round(e.gridL3P)} W</button>
          </div>
        </div>

        <div class="detail-section">
          <!-- Energie dnes — odběr vlevo, dodávka vpravo -->
          <div class="energy-symmetric">
            <div class="energy-side">
              <span class="energy-side-label">⬇ Odběr</span>
              <button class="energy-side-val energy-import" @click=${Y("ac_in_ac_ad")}>
                ${nt(e.gridImportToday)}
              </button>
            </div>
            <div class="energy-divider-v"></div>
            <div class="energy-side">
              <span class="energy-side-label">⬆ Dodávka</span>
              <button class="energy-side-val energy-export" @click=${Y("ac_in_ac_pd")}>
                ${nt(e.gridExportToday)}
              </button>
            </div>
          </div>

        </div>
      </div>
    `}renderHouse(){const e=this.data,t=e.houseTodayWh/1e3,i=e.nonbackupTodayWh/1e3,n=t+i,r=e.housePower+e.nonbackupPower,a=t+e.zalohaPlannedRemainingKwh,o=e.selfSufficiencyTodayPct,s=e.houseTodayWh+e.nonbackupTodayWh,d=s>0?e.srcBatteryTodayKwh*1e3/s*100:0,p=s>0?e.srcFveTodayKwh*1e3/s*100:0,u=s>0?e.srcGridTodayKwh*1e3/s*100:0,h=o>=66?"#43a047":o>=33?"#fdd835":"#e53935",b=`hsl(${Math.round(Math.max(0,Math.min(120,o*1.2)))}, 72%, 46%)`,f=n>0,m=f?n:1,y=f?Math.round(e.srcFveTodayKwh/m*100):0,S=f?Math.round(e.srcBatteryTodayKwh/m*100):0,x=f?Math.max(0,100-y-S):0,$=`Denní soběstačnost ${Math.round(o)} % · FVE ${y} % · Baterie ${S} % · Síť ${x} %`,P=wd([e.houseL1,e.houseL2,e.houseL3]),H=[{z:e.houseL1,n:e.nonbackupL1,ze:"ac_out_aco_pr"},{z:e.houseL2,n:e.nonbackupL2,ze:"ac_out_aco_ps"},{z:e.houseL3,n:e.nonbackupL3,ze:"ac_out_aco_pt"}],A=Math.max(300,...H.map(te=>te.z+te.n)),j=Mn/A*100,k=j<=100,L=P.spreadW>=1e3?`${(P.spreadW/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(P.spreadW)} W`,M=H.map(te=>Math.max(0,te.z)/A*100),q=e.houseL1+e.houseL2+e.houseL3,G=_d(M,q),N=te=>te>=1e3?`${(te/1e3).toFixed(1).replace(".",",")} kW`:`${Math.round(te)} W`,W=26,Pe=`Záloha ${Ye(e.housePower)} · dnes ${t.toFixed(1)} kWh${e.zalohaPlannedRemainingKwh>0?` · plán ${a.toFixed(1)} kWh`:""}`,Re=`Nezáloha ${Ye(e.nonbackupPower)} · dnes ${i.toFixed(1)} kWh`;return c`
      <div class="${this.nodeClass("house")}" style="--node-gradient: ${_i.house}; --node-border: ${hn.house};"
        @click=${te=>this.toggleExpand("house",te)} title=${$}>

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
              <i style="width:${x}%;background:#e53935"></i>
            </div>
            <div class="gp-r"><span>☀️ FVE</span><b>${e.srcFveTodayKwh.toFixed(1)} kWh · ${y} %</b></div>
            <div class="gp-r"><span>🔋 Baterie</span><b>${e.srcBatteryTodayKwh.toFixed(1)} kWh · ${S} %</b></div>
            <div class="gp-r"><span>🔌 Síť</span><b>${e.srcGridTodayKwh.toFixed(1)} kWh · ${x} %</b></div>
            <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px">
              <span>Celkem dnes</span><b>${n.toFixed(1)} kWh</b>
            </div>
          `:c`<div class="gp-r" style="opacity:.6"><span>Žádná spotřeba dnes zatím</span></div>`}
        `)}

        <!-- COMPACT HEADER: SVG house icon · big kW · tiny kWh -->
        <div class="house-head">
          ${Q`<svg class="house-ico" viewBox="0 0 24 24" fill="none" stroke="#cfe0ff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 11l9-7 9 7"></path><path d="M5 10v10h14V10"></path></svg>`}
          <span class="house-cap">SPOTŘEBA</span>
        </div>
        <div class="node-value" @click=${Y("actual_aco_p")}>${Ye(r)}</div>
        <div class="node-subvalue" @click=${Y("ac_out_en_day")}>${n.toFixed(1).replace(".",",")} kWh</div>

        <!-- COMPACT SPLIT ROW: colored dot + value, tooltip carries detail -->
        <div class="csplit">
          <button class="cs" @click=${Y("actual_aco_p")} title=${Pe}>
            <span class="cs-top"><span class="d" style="background:#43a047"></span>${Ye(e.housePower)}</span>
            <span class="cs-day">${t.toFixed(1).replace(".",",")} kWh</span>
          </button>
          <button class="cs" @click=${Y("actual_acinb_wtotal")} title=${Re}>
            <span class="cs-top"><span class="d" style="background:#fb8c00"></span>${Ye(e.nonbackupPower)}</span>
            <span class="cs-day">${i.toFixed(1).replace(".",",")} kWh</span>
          </button>
        </div>

        <!-- PHASE GRAPH (phasegraph2 design) -->
        <div class="pg">
          <!-- Spread band = imbalance "thermometer" (no text); red shimmer when unbalanced -->
          ${G.widthPct>0?c`
            <div class="pg-spread ${P.balanced?"balanced":"unbal"}"
              title=${P.balanced?"Fáze vyvážené":`Fáze nevyvážené — rozdíl ${L}`}
              style="left:calc(10px + ${G.leftPct.toFixed(2)}% * (100% - 75px) / 100);width:calc(${G.widthPct.toFixed(2)}% * (100% - 75px) / 100)"></div>`:_}
          <!-- Phase rows: NO L1/L2/L3 labels per spec -->
          ${H.map(te=>{const _e=te.z>=Mn,w=te.z+te.n,X=Math.max(0,te.z)/A*100,se=Math.max(0,te.n)/A*100,vt=X>=W&&te.z>100,Le=se>=W&&te.n>100;return c`
              <div class="pg-row">
                <div class="pg-track">
                  <div class="pg-z ${_e?"crit":""}" style="width:${X.toFixed(1)}%">
                    ${vt?N(te.z):_}
                  </div>
                  ${te.n>0?c`
                    <div class="pg-div"></div>
                    <div class="pg-n" style="width:${se.toFixed(1)}%">
                      ${Le?N(te.n):_}
                    </div>`:_}
                  ${k?c`<div class="pg-lim" style="left:${j.toFixed(1)}%"></div>`:_}
                </div>
                <span class="pg-tot">${N(w)}</span>
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
    `}};De.styles=D`
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
      color: ${U(l.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .node-value {
      font-size: 22px;
      font-weight: 700;
      color: ${U(l.textPrimary)};
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
      color: ${U(l.textSecondary)};
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
      color: ${U(l.textSecondary)};
      margin-top: 4px;
    }

    .pending-overlay {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: ${U(l.accent)};
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 4px;
      padding: 2px 6px;
      margin-top: 4px;
    }

    .current-state-unknown {
      color: ${U(l.textSecondary)};
      font-style: italic;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid ${U(l.divider)};
      border-top-color: ${U(l.accent)};
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
      border-top: 1px solid ${U(l.divider)};
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
      border-top: 1px dashed ${U(l.divider)};
    }

    .detail-header {
      font-size: 10px;
      font-weight: 600;
      color: ${U(l.textSecondary)};
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: ${U(l.textSecondary)};
      margin-bottom: 2px;
    }

    .detail-row .icon { width: 14px; text-align: center; flex-shrink: 0; }

    .clickable {
      cursor: pointer;
      color: ${U(l.textPrimary)};
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
      color: ${U(l.textSecondary)};
      margin: 4px 0;
      align-items: center;
      justify-content: center;
    }

    .phase-sep { color: ${U(l.divider)}; }

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
    .pg-z {
      height: 100%;
      background: #43a047;
      display: flex;
      align-items: center;
      padding-left: 4px;
      font-size: 8.5px;
      font-weight: 800;
      color: #06270c;
      white-space: nowrap;
      overflow: hidden;
      border-radius: 4px 0 0 4px;
    }
    .pg-z.crit { background: #e53935; color: #fff; }
    .pg-div { width: 1.5px; background: #0d1526; height: 100%; flex-shrink: 0; }
    .pg-n {
      height: 100%;
      background: #fb8c00;
      display: flex;
      align-items: center;
      padding-left: 4px;
      font-size: 8.5px;
      font-weight: 800;
      color: #2b1500;
      white-space: nowrap;
      overflow: hidden;
      border-radius: 0 4px 4px 0;
    }
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
      background: ${U(l.bgSecondary)};
      border: none;
      font-family: inherit;
      color: ${U(l.textSecondary)};
    }

    .indicator:hover { background: ${U(l.divider)}; }

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
      border-top: 1px solid ${U(l.divider)};
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
      border: 1px solid ${U(l.divider)};
      background: transparent;
      color: ${U(l.textSecondary)};
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .gc-plan-btn:hover {
      background: rgba(255,255,255,0.06);
      color: ${U(l.textPrimary)};
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
      border-top: 1px dashed ${U(l.divider)};
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
      color: ${U(l.textSecondary)};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .phase-val {
      font-size: 11px;
      font-weight: 600;
      color: ${U(l.textPrimary)};
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    .phase-val:hover { text-decoration: underline; }
    .phase-divider {
      border: none;
      border-top: 1px solid ${U(l.divider)};
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
      color: ${U(l.textSecondary)};
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
      color: ${U(l.textPrimary)};
    }
    .energy-side-val:hover { text-decoration: underline; }
    .energy-import { color: #ef5350; }
    .energy-export { color: #66bb6a; }
    .energy-divider-v {
      width: 1px;
      height: 28px;
      background: ${U(l.divider)};
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
      color: ${U(l.textSecondary)};
      text-transform: uppercase;
    }
    .price-val {
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: ${U(l.textPrimary)};
    }
    .price-val:hover { text-decoration: underline; }
    .price-spot { color: #ef5350; }
    .price-export { color: #66bb6a; }

    @media (min-width: 1025px) {
      .detail-section {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid ${U(l.divider)};
      }
      .boiler-section,
      .grid-charging-plan {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed ${U(l.divider)};
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
    }
  `;Be([g({type:Object})],De.prototype,"data",2);Be([g({type:Boolean})],De.prototype,"editMode",2);Be([T()],De.prototype,"pendingServices",2);Be([T()],De.prototype,"changingServices",2);Be([T()],De.prototype,"shieldStatus",2);Be([T()],De.prototype,"shieldQueueCount",2);Be([T()],De.prototype,"gridDeliveryState",2);Be([T()],De.prototype,"expandedNodes",2);Be([T()],De.prototype,"gaugeDetailOpen",2);Be([T()],De.prototype,"customPositions",2);Be([T()],De.prototype,"nodeDims",2);De=Be([E("oig-flow-node")],De);var $d=Object.defineProperty,kd=Object.getOwnPropertyDescriptor,It=(e,t,i,n)=>{for(var r=n>1?void 0:n?kd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&$d(t,i,r),r};function Sd(e,t){return{fromColor:fa[e]||"#9e9e9e",toColor:fa[t]||"#9e9e9e"}}const Cd=Z;let Je=class extends z{constructor(){super(...arguments),this.data=Rr,this.particlesEnabled=!0,this.active=!0,this.editMode=!1,this.lines=[],this.animationId=null,this.lastSpawnTime={},this.particleCount=0,this.MAX_PARTICLES=50,this.onVisibilityChange=()=>{this.updateAnimationState()},this.onLayoutChanged=()=>{this.drawConnectionsDeferred()}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this.onVisibilityChange),this.addEventListener("layout-changed",this.onLayoutChanged)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this.onVisibilityChange),this.removeEventListener("layout-changed",this.onLayoutChanged),this.stopAnimation()}updated(e){e.has("data")&&(this.updateLines(),this.animationId!==null&&this.spawnParticles()),(e.has("active")||e.has("particlesEnabled"))&&this.updateAnimationState(),this.drawConnectionsDeferred()}firstUpdated(){this.updateLines(),this.updateAnimationState(),new ResizeObserver(()=>this.drawConnectionsDeferred()).observe(this)}drawConnectionsDeferred(){requestAnimationFrame(()=>this.drawConnectionsSVG())}getParticlesLayer(){var e;return(e=this.renderRoot)==null?void 0:e.querySelector(".particles-layer")}getGridMetrics(){var a,o;const e=(a=this.renderRoot)==null?void 0:a.querySelector("oig-flow-node");if(!e)return null;const i=(e.renderRoot||e.shadowRoot||e).querySelector(".flow-grid");if(!i)return null;const n=(o=this.renderRoot)==null?void 0:o.querySelector(".canvas-container");if(!n)return null;const r=i.getBoundingClientRect();return r.width===0||r.height===0?null:{grid:i,gridRect:r,canvasRect:n.getBoundingClientRect()}}positionOverlayLayer(e,t,i){const n=t.left-i.left,r=t.top-i.top;e.style.left=`${n}px`,e.style.top=`${r}px`,e.style.width=`${t.width}px`,e.style.height=`${t.height}px`}updateLines(){const e=this.data,t=[],i=e.solarPower>50;t.push({id:"solar-inverter",from:"solar",to:"inverter",color:Rt.solar,power:i?e.solarPower:0,params:i?bn(e.solarPower,gn.solar,"solar"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:i});const n=Math.abs(e.batteryPower)>50,r=e.batteryPower>0;t.push({id:"battery-inverter",from:n&&r?"inverter":"battery",to:n&&r?"battery":"inverter",color:Rt.battery,power:n?Math.abs(e.batteryPower):0,params:n?bn(e.batteryPower,gn.battery,"battery"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:n});const a=Math.abs(e.gridPower)>50,o=e.gridPower>0;t.push({id:"grid-inverter",from:a?o?"grid":"inverter":"grid",to:a?o?"inverter":"grid":"inverter",color:a?o?Rt.grid_import:Rt.grid_export:Rt.grid_import,power:a?Math.abs(e.gridPower):0,params:a?bn(e.gridPower,gn.grid,"grid"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:a});const s=e.housePower>50;t.push({id:"inverter-house",from:"inverter",to:"house",color:Rt.house,power:s?e.housePower:0,params:s?bn(e.housePower,gn.house,"house"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:s}),this.lines=t}calcEdgePoint(e,t,i,n){const r=t.x-e.x,a=t.y-e.y;if(r===0&&a===0)return{...e};const o=Math.abs(r),s=Math.abs(a),d=o*n>s*i?i/o:n/s;return{x:e.x+r*d,y:e.y+a*d}}getNodeInfo(e,t,i){const n=e.querySelector(`.node-${i}`);if(!n)return null;const r=n.getBoundingClientRect();return{x:r.left+r.width/2-t.left,y:r.top+r.height/2-t.top,hw:r.width/2,hh:r.height/2}}drawConnectionsSVG(){const e=this.svgEl;if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:n,canvasRect:r}=t;this.positionOverlayLayer(e,n,r),e.setAttribute("viewBox",`0 0 ${n.width} ${n.height}`);const a=this.getParticlesLayer();a&&this.positionOverlayLayer(a,n,r),e.innerHTML="";const o="http://www.w3.org/2000/svg",s=document.createElementNS(o,"defs"),d=document.createElementNS(o,"filter");d.setAttribute("id","neon-glow"),d.setAttribute("x","-50%"),d.setAttribute("y","-50%"),d.setAttribute("width","200%"),d.setAttribute("height","200%");const p=document.createElementNS(o,"feGaussianBlur");p.setAttribute("in","SourceGraphic"),p.setAttribute("stdDeviation","3"),p.setAttribute("result","blur"),d.appendChild(p);const u=document.createElementNS(o,"feMerge"),h=document.createElementNS(o,"feMergeNode");h.setAttribute("in","blur"),u.appendChild(h);const b=document.createElementNS(o,"feMergeNode");b.setAttribute("in","SourceGraphic"),u.appendChild(b),d.appendChild(u),s.appendChild(d),e.appendChild(s);for(const f of this.lines){const m=this.getNodeInfo(i,n,f.from),y=this.getNodeInfo(i,n,f.to);if(!m||!y)continue;const S={x:m.x,y:m.y},x={x:y.x,y:y.y},$=this.calcEdgePoint(S,x,m.hw,m.hh),P=this.calcEdgePoint(x,S,y.hw,y.hh),H=P.x-$.x,A=P.y-$.y,j=Math.sqrt(H*H+A*A),k=Math.min(j*.2,40),L=-A/j,M=H/j,q=($.x+P.x)/2,G=($.y+P.y)/2,N=q+L*k,W=G+M*k,Pe=`grad-${f.id}`,{fromColor:Re,toColor:te}=Sd(f.from,f.to),_e=document.createElementNS(o,"linearGradient");_e.setAttribute("id",Pe),_e.setAttribute("x1","0%"),_e.setAttribute("y1","0%"),_e.setAttribute("x2","100%"),_e.setAttribute("y2","0%");const w=document.createElementNS(o,"stop");w.setAttribute("offset","0%"),w.setAttribute("stop-color",Re);const X=document.createElementNS(o,"stop");X.setAttribute("offset","100%"),X.setAttribute("stop-color",te),_e.appendChild(w),_e.appendChild(X),s.appendChild(_e);const se=document.createElementNS(o,"path");if(se.setAttribute("d",`M ${$.x} ${$.y} Q ${N} ${W} ${P.x} ${P.y}`),se.setAttribute("stroke",`url(#${Pe})`),se.setAttribute("stroke-width","3"),se.setAttribute("stroke-linecap","round"),se.setAttribute("fill","none"),se.setAttribute("opacity",f.active?"0.8":"0.18"),f.active&&se.setAttribute("filter","url(#neon-glow)"),se.classList.add("flow-line"),f.active||se.classList.add("flow-line--inactive"),e.appendChild(se),f.params.active){const Le=document.createElementNS(o,"polygon");Le.setAttribute("points",`0,-6 ${6*1.2},0 0,6`),Le.setAttribute("fill",f.color),Le.setAttribute("opacity","0.9");const Ge=document.createElementNS(o,"animateMotion");Ge.setAttribute("dur",`${Math.max(1,f.params.speed/1e3)}s`),Ge.setAttribute("repeatCount","indefinite"),Ge.setAttribute("path",`M ${$.x} ${$.y} Q ${N} ${W} ${P.x} ${P.y}`),Ge.setAttribute("rotate","auto"),Le.appendChild(Ge),e.appendChild(Le)}}}updateAnimationState(){this.particlesEnabled&&this.active&&!document.hidden&&!Ae.reduceMotion?(this.spawnParticles(),this.startAnimation()):this.stopAnimation()}startAnimation(){if(this.animationId!==null)return;const e=()=>{this.spawnParticles(),this.animationId=requestAnimationFrame(e)};this.animationId=requestAnimationFrame(e)}stopAnimation(){this.animationId!==null&&(cancelAnimationFrame(this.animationId),this.animationId=null)}spawnParticles(){if(this.particleCount>=this.MAX_PARTICLES)return;const e=this.getParticlesLayer();if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:n,canvasRect:r}=t;this.positionOverlayLayer(e,n,r);const a=performance.now();for(const o of this.lines){if(!o.params.active)continue;const s=o.params.speed,d=this.lastSpawnTime[o.id]||0;if(a-d<s)continue;const p=this.getNodeInfo(i,n,o.from),u=this.getNodeInfo(i,n,o.to);if(!p||!u)continue;const h={x:p.x,y:p.y},b={x:u.x,y:u.y},f=this.calcEdgePoint(h,b,p.hw,p.hh),m=this.calcEdgePoint(b,h,u.hw,u.hh);this.lastSpawnTime[o.id]=a;const y=o.params.count;for(let S=0;S<y&&!(this.particleCount>=this.MAX_PARTICLES);S++)this.createParticle(e,f,m,o.color,o.params,S*(o.params.speed/y/2))}}createParticle(e,t,i,n,r,a){const o=document.createElement("div");o.className="particle";const s=r.size;o.style.width=`${s}px`,o.style.height=`${s}px`,o.style.background=n,o.style.left=`${t.x}px`,o.style.top=`${t.y}px`,o.style.boxShadow=`0 0 ${s}px ${n}`,o.style.opacity="0",e.appendChild(o),this.particleCount++;const d=r.speed;setTimeout(()=>{let p=!1;const u=()=>{p||(p=!0,o.isConnected&&o.remove(),this.particleCount=Math.max(0,this.particleCount-1))};if(typeof o.animate=="function"){const h=o.animate([{left:`${t.x}px`,top:`${t.y}px`,opacity:0,offset:0},{opacity:r.opacity,offset:.1},{opacity:r.opacity,offset:.9},{left:`${i.x}px`,top:`${i.y}px`,opacity:0,offset:1}],{duration:d,easing:"linear"});h.onfinish=u,h.oncancel=u}else o.style.transition=`left ${d}ms linear, top ${d}ms linear, opacity ${d}ms linear`,o.style.opacity=`${r.opacity}`,requestAnimationFrame(()=>{o.style.left=`${i.x}px`,o.style.top=`${i.y}px`,o.style.opacity="0"}),o.addEventListener("transitionend",u,{once:!0}),window.setTimeout(u,d+50)},a)}render(){return c`
      <div class="canvas-container">
        <div class="flow-grid-wrapper">
          <oig-flow-node .data=${this.data} .editMode=${this.editMode}></oig-flow-node>
        </div>

        <svg class="connections-layer"></svg>

        <div class="particles-layer"></div>
      </div>
    `}resetLayout(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-flow-node");e!=null&&e.resetLayout&&e.resetLayout()}};Je.styles=D`
    :host {
      display: block;
      position: relative;
      width: 100%;
      background: ${Cd(l.bgSecondary)};
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
  `;It([g({type:Object})],Je.prototype,"data",2);It([g({type:Boolean})],Je.prototype,"particlesEnabled",2);It([g({type:Boolean})],Je.prototype,"active",2);It([g({type:Boolean})],Je.prototype,"editMode",2);It([T()],Je.prototype,"lines",2);It([Un(".connections-layer")],Je.prototype,"svgEl",2);Je=It([E("oig-flow-canvas")],Je);var Pd=Object.defineProperty,Td=Object.getOwnPropertyDescriptor,Gr=(e,t,i,n)=>{for(var r=n>1?void 0:n?Td(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Pd(t,i,r),r};const Ne=Z;let Ni=class extends z{constructor(){super(...arguments),this.data=null,this.open=!1,this.onKeyDown=e=>{e.key==="Escape"&&this.hide()}}show(){this.open=!0}hide(){this.open=!1}onOverlayClick(e){e.target===e.currentTarget&&this.hide()}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onKeyDown),this.addEventListener("oig-grid-charging-open",()=>this.show())}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onKeyDown)}formatTime(e){const t=e.time_from??"--:--",i=e.time_to??"--:--";return`${t} – ${i}`}isBlockActive(e){if(!e.time_from||!e.time_to)return!1;const t=new Date,i=t.toISOString().slice(0,10);if(e.day==="tomorrow")return!1;const n=`${i}T${e.time_from}`,r=`${i}T${e.time_to}`,a=new Date(n),o=new Date(r);return t>=a&&t<o}renderEmpty(){return c`
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
          `:_}
          ${e.totalCostCzk>0?c`
            <span class="summary-chip cost">💰 ~${e.totalCostCzk.toFixed(0)} Kč</span>
          `:_}
          ${e.windowLabel?c`
            <span class="summary-chip time">🪟 ${e.windowLabel}</span>
          `:_}
          ${e.durationMinutes>0?c`
            <span class="summary-chip time">⏱️ ${Math.round(e.durationMinutes)} min</span>
          `:_}
        </div>

        <!-- Active block banner -->
        ${t?c`
          <div class="active-block-banner">
            <div class="pulse-dot"></div>
            <span>Probíhá: ${this.formatTime(t)}
              ${t.grid_charge_kwh!=null?` · ${t.grid_charge_kwh.toFixed(1)} kWh`:_}
            </span>
          </div>
        `:_}

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
                    `:_}
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
              `:_}
            </div>
            <button class="close-btn" @click=${()=>this.hide()} aria-label="Zavřít">✕</button>
          </div>
          <div class="dialog-body">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `:_}};Ni.styles=D`
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
      background: ${Ne(l.cardBg)};
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
      border-bottom: 1px solid ${Ne(l.divider)};
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
      color: ${Ne(l.textPrimary)};
    }

    .dialog-header-subtitle {
      font-size: 11px;
      color: ${Ne(l.textSecondary)};
      margin-top: 2px;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: ${Ne(l.textSecondary)};
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
      color: ${Ne(l.textPrimary)};
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
      color: ${Ne(l.textSecondary)};
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
      color: ${Ne(l.textSecondary)};
      padding: 0 6px 8px;
      border-bottom: 1px solid ${Ne(l.divider)};
    }

    .blocks-table th:last-child,
    .blocks-table td:last-child {
      text-align: right;
    }

    .blocks-table td {
      padding: 8px 6px;
      font-size: 12px;
      color: ${Ne(l.textPrimary)};
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
      color: ${Ne(l.textSecondary)};
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
  `;Gr([g({type:Object})],Ni.prototype,"data",2);Gr([T()],Ni.prototype,"open",2);Ni=Gr([E("oig-grid-charging-dialog")],Ni);var Md=Object.defineProperty,Dd=Object.getOwnPropertyDescriptor,ye=(e,t,i,n)=>{for(var r=n>1?void 0:n?Dd(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Md(t,i,r),r};const de=Z;Gn.register(lo,co,po,uo,ho,go,bo);let lt=class extends z{constructor(){super(...arguments),this.values=[],this.color="rgba(76, 175, 80, 1)",this.startTime="",this.endTime="",this.chart=null,this.lastDataKey="",this.initializing=!1}render(){return c`<canvas></canvas>`}firstUpdated(){this.values.length>0&&(this.initializing=!0,requestAnimationFrame(()=>{this.createSparkline(),this.initializing=!1}))}updated(e){this.initializing||(e.has("values")||e.has("color"))&&this.updateOrCreateSparkline()}disconnectedCallback(){super.disconnectedCallback(),this.destroyChart()}updateOrCreateSparkline(){var t,i,n,r;if(!this.canvas||this.values.length===0)return;const e=JSON.stringify({v:this.values,c:this.color});if(!(e===this.lastDataKey&&this.chart)){if(this.lastDataKey=e,(n=(i=(t=this.chart)==null?void 0:t.data)==null?void 0:i.datasets)!=null&&n[0]){const a=this.chart.data.datasets[0];if(!((((r=this.chart.data.labels)==null?void 0:r.length)||0)!==this.values.length)){a.data=this.values,a.borderColor=this.color,a.backgroundColor=this.color.replace("1)","0.2)"),this.chart.update("none");return}}this.destroyChart(),this.createSparkline()}}createSparkline(){if(!this.canvas||this.values.length===0)return;this.destroyChart();const e=this.color,t=this.values,i=new Date(this.startTime),n=t.map((r,a)=>new Date(i.getTime()+a*15*60*1e3).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}));this.chart=new Gn(this.canvas,{type:"line",data:{labels:n,datasets:[{data:t,borderColor:e,backgroundColor:e.replace("1)","0.2)"),borderWidth:2,fill:!0,tension:.3,pointRadius:0,pointHoverRadius:5}]},plugins:[],options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:0},plugins:{legend:{display:!1},tooltip:{enabled:!0,backgroundColor:"rgba(0, 0, 0, 0.8)",titleColor:"#fff",bodyColor:"#fff",padding:8,displayColors:!1,callbacks:{title:r=>{var a;return((a=r[0])==null?void 0:a.label)||""},label:r=>`${r.parsed.y.toFixed(2)} Kč/kWh`}},datalabels:{display:!1},zoom:{pan:{enabled:!0,mode:"x",modifierKey:"shift"},zoom:{wheel:{enabled:!0,speed:.1},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)"},mode:"x"}}},scales:{x:{display:!1},y:{display:!0,position:"right",grace:"10%",ticks:{color:"rgba(255, 255, 255, 0.6)",font:{size:8},callback:r=>Number(r).toFixed(1),maxTicksLimit:3},grid:{display:!1}}},layout:{padding:0},interaction:{mode:"nearest",intersect:!1}}})}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}};lt.styles=D`
    :host {
      display: block;
      width: 100%;
      height: 30px;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `;ye([g({type:Array})],lt.prototype,"values",2);ye([g({type:String})],lt.prototype,"color",2);ye([g({type:String})],lt.prototype,"startTime",2);ye([g({type:String})],lt.prototype,"endTime",2);ye([Un("canvas")],lt.prototype,"canvas",2);lt=ye([E("oig-mini-sparkline")],lt);let ze=class extends z{constructor(){super(...arguments),this.title="",this.time="",this.valueText="",this.value=0,this.unit="Kč/kWh",this.variant="default",this.clickable=!1,this.startTime="",this.endTime="",this.sparklineValues=[],this.sparklineColor="rgba(76, 175, 80, 1)",this.handleClick=()=>{this.clickable&&this.dispatchEvent(new CustomEvent("card-click",{detail:{startTime:this.startTime,endTime:this.endTime,value:this.value},bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),this.clickable&&this.addEventListener("click",this.handleClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleClick)}render(){const e=this.valueText||`${this.value.toFixed(2)} <span class="stat-unit">${this.unit}</span>`;return c`
      <div class="card-title">${this.title}</div>
      <div class="card-value ${this.variant}" .innerHTML=${e}></div>
      ${this.time?c`<div class="card-time">${this.time}</div>`:_}
      ${this.sparklineValues.length>0?c`
            <div class="sparkline-container">
              <oig-mini-sparkline
                .values=${this.sparklineValues}
                .color=${this.sparklineColor}
                .startTime=${this.startTime}
                .endTime=${this.endTime}
              ></oig-mini-sparkline>
            </div>
          `:_}
    `}};ze.styles=D`
    :host {
      display: block;
      background: ${de(l.cardBg)};
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: ${de(l.cardShadow)};
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
      color: ${de(l.textSecondary)};
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 700;
      color: ${de(l.textPrimary)};
      line-height: 1.2;
    }

    .card-value .stat-unit {
      font-size: 12px;
      font-weight: 400;
      color: ${de(l.textSecondary)};
    }

    .card-value.success { color: #4CAF50; }
    .card-value.warning { color: #FFA726; }
    .card-value.danger { color: #F44336; }
    .card-value.info { color: #29B6F6; }

    .card-time {
      font-size: 10px;
      color: ${de(l.textSecondary)};
      margin-top: 4px;
    }

    .sparkline-container {
      margin-top: 8px;
    }
  `;ye([g({type:String})],ze.prototype,"title",2);ye([g({type:String})],ze.prototype,"time",2);ye([g({type:String})],ze.prototype,"valueText",2);ye([g({type:Number})],ze.prototype,"value",2);ye([g({type:String})],ze.prototype,"unit",2);ye([g({type:String})],ze.prototype,"variant",2);ye([g({type:Boolean})],ze.prototype,"clickable",2);ye([g({type:String})],ze.prototype,"startTime",2);ye([g({type:String})],ze.prototype,"endTime",2);ye([g({type:Array})],ze.prototype,"sparklineValues",2);ye([g({type:String})],ze.prototype,"sparklineColor",2);ze=ye([E("oig-stats-card")],ze);function zd(e){const t=new Date(e.start),i=new Date(e.end),n=t.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit"}),r=t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}),a=i.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"});return`${n} ${r} - ${a}`}let ji=class extends z{constructor(){super(...arguments),this.data=null,this.topOnly=!1}onCardClick(e){this.dispatchEvent(new CustomEvent("zoom-to-block",{detail:e.detail,bubbles:!0,composed:!0}))}renderPriceTiles(){if(!this.data)return _;const e=this.data.solarForecastTotal,t=this.data.solarForecastTomorrow,i=this.data.solarForecastStale,n=e>0||t>0,r=this.data.whatIf,a=(r==null?void 0:r.totalSavings)??null,o=(r==null?void 0:r.totalCost)??null,s=a==null?"":a>=.005?"pos":a<=-.005?"neg":"";return c`
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
          ${o!=null?`Náklady ${o.toFixed(0)} Kč`:_}
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
        .time=${zd(t)}
        variant=${i}
        clickable
        .startTime=${t.start}
        .endTime=${t.end}
        .sparklineValues=${t.values}
        .sparklineColor=${n}
        @card-click=${this.onCardClick}
      ></oig-stats-card>
    `:_}renderExtremeBlocks(){if(!this.data)return _;const{cheapestBuyBlock:e,expensiveBuyBlock:t,bestExportBlock:i,worstExportBlock:n}=this.data;return c`
      ${this.renderBlockCard("Nejlevnější nákup",e,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejdražší nákup",t,"danger","rgba(244, 67, 54, 1)")}
      ${this.renderBlockCard("Nejlepší výkup",i,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejhorší výkup",n,"warning","rgba(255, 167, 38, 1)")}
    `}renderPlannedConsumption(){var o;const e=(o=this.data)==null?void 0:o.plannedConsumption;if(!e)return _;const t=e.todayTotalKwh,i=e.tomorrowKwh,n=t+(i||0),r=n>0?t/n*100:50,a=n>0?(i||0)/n*100:50;return c`
      <div class="planned-section">
        <div class="section-label" style="margin-bottom: 8px;">Plánovaná spotřeba (dnes + zítra)</div>
        <div class="planned-header">
          <div>
            <div class="planned-main-value">
              ${n>0?c`${n.toFixed(1)} <span class="unit">kWh</span>`:"--"}
            </div>
            <div class="planned-profile">${e.profile}</div>
          </div>
          ${e.trendText?c`<div class="planned-trend">${e.trendText}</div>`:_}
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
            `:_}
      </div>
    `}render(){return!this.data||this.data.timeline.length===0?this.topOnly?_:c`<div style="color: ${l.textSecondary}; padding: 16px;">Načítání cenových dat...</div>`:this.topOnly?c`
        <div class="top-row">
          ${this.renderPriceTiles()}
          ${this.renderExtremeBlocks()}
        </div>
      `:c`${this.renderPlannedConsumption()}`}};ji.styles=D`
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
      background: ${de(l.cardBg)};
      border-radius: 10px;
      padding: 10px 12px;
      box-shadow: ${de(l.cardShadow)};
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 76px;
    }

    .price-tile.spot {
      background: linear-gradient(135deg, ${de(l.accent)}22 0%, ${de(l.accent)}11 100%);
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
      color: ${de(l.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .price-tile-value {
      font-size: 16px;
      font-weight: 700;
      color: ${de(l.textPrimary)};
      line-height: 1.2;
    }

    .price-tile-unit {
      font-size: 10px;
      font-weight: 400;
      color: ${de(l.textSecondary)};
      opacity: 0.7;
    }

    .price-tile-sub {
      font-size: 9px;
      color: ${de(l.textSecondary)};
      opacity: 0.55;
      margin-top: 3px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: ${de(l.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    /* Planned consumption */
    .planned-section {
      background: ${de(l.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: ${de(l.cardShadow)};
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
      color: ${de(l.textPrimary)};
    }

    .planned-main-value .unit {
      font-size: 12px;
      font-weight: 400;
      color: ${de(l.textSecondary)};
    }

    .planned-trend {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
    }

    .planned-profile {
      font-size: 11px;
      color: ${de(l.textSecondary)};
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
      color: ${de(l.textSecondary)};
      text-transform: uppercase;
    }

    .planned-detail-value {
      font-size: 14px;
      font-weight: 600;
      color: ${de(l.textPrimary)};
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
      color: ${de(l.textSecondary)};
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
  `;ye([g({type:Object})],ji.prototype,"data",2);ye([g({type:Boolean})],ji.prototype,"topOnly",2);ji=ye([E("oig-pricing-stats")],ji);const jo=6048e5,Ed=864e5,rn=6e4,an=36e5,Od=1e3,ja=Symbol.for("constructDateFrom");function ge(e,t){return typeof e=="function"?e(t):e&&typeof e=="object"&&ja in e?e[ja](t):e instanceof Date?new e.constructor(t):new Date(t)}function K(e,t){return ge(t||e,e)}function Xn(e,t,i){const n=K(e,i==null?void 0:i.in);return isNaN(t)?ge((i==null?void 0:i.in)||e,NaN):(t&&n.setDate(n.getDate()+t),n)}function Ur(e,t,i){const n=K(e,i==null?void 0:i.in);if(isNaN(t))return ge(e,NaN);if(!t)return n;const r=n.getDate(),a=ge(e,n.getTime());a.setMonth(n.getMonth()+t+1,0);const o=a.getDate();return r>=o?a:(n.setFullYear(a.getFullYear(),a.getMonth(),r),n)}function Yr(e,t,i){return ge(e,+K(e)+t)}function Ld(e,t,i){return Yr(e,t*an)}let Ad={};function Bt(){return Ad}function Ve(e,t){var s,d,p,u;const i=Bt(),n=(t==null?void 0:t.weekStartsOn)??((d=(s=t==null?void 0:t.locale)==null?void 0:s.options)==null?void 0:d.weekStartsOn)??i.weekStartsOn??((u=(p=i.locale)==null?void 0:p.options)==null?void 0:u.weekStartsOn)??0,r=K(e,t==null?void 0:t.in),a=r.getDay(),o=(a<n?7:0)+a-n;return r.setDate(r.getDate()-o),r.setHours(0,0,0,0),r}function ni(e,t){return Ve(e,{...t,weekStartsOn:1})}function Ro(e,t){const i=K(e,t==null?void 0:t.in),n=i.getFullYear(),r=ge(i,0);r.setFullYear(n+1,0,4),r.setHours(0,0,0,0);const a=ni(r),o=ge(i,0);o.setFullYear(n,0,4),o.setHours(0,0,0,0);const s=ni(o);return i.getTime()>=a.getTime()?n+1:i.getTime()>=s.getTime()?n:n-1}function Dn(e){const t=K(e),i=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()));return i.setUTCFullYear(t.getFullYear()),+e-+i}function Nt(e,...t){const i=ge.bind(null,t.find(n=>typeof n=="object"));return t.map(i)}function Ir(e,t){const i=K(e,t==null?void 0:t.in);return i.setHours(0,0,0,0),i}function Ho(e,t,i){const[n,r]=Nt(i==null?void 0:i.in,e,t),a=Ir(n),o=Ir(r),s=+a-Dn(a),d=+o-Dn(o);return Math.round((s-d)/Ed)}function Fd(e,t){const i=Ro(e,t),n=ge(e,0);return n.setFullYear(i,0,4),n.setHours(0,0,0,0),ni(n)}function Id(e,t,i){const n=K(e,i==null?void 0:i.in);return n.setTime(n.getTime()+t*rn),n}function Bd(e,t,i){return Ur(e,t*3,i)}function Nd(e,t,i){return Yr(e,t*1e3)}function jd(e,t,i){return Xn(e,t*7,i)}function Rd(e,t,i){return Ur(e,t*12,i)}function Ai(e,t){const i=+K(e)-+K(t);return i<0?-1:i>0?1:i}function Hd(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function Wo(e){return!(!Hd(e)&&typeof e!="number"||isNaN(+K(e)))}function Wd(e,t,i){const[n,r]=Nt(i==null?void 0:i.in,e,t),a=n.getFullYear()-r.getFullYear(),o=n.getMonth()-r.getMonth();return a*12+o}function Vd(e,t,i){const[n,r]=Nt(i==null?void 0:i.in,e,t);return n.getFullYear()-r.getFullYear()}function Vo(e,t,i){const[n,r]=Nt(i==null?void 0:i.in,e,t),a=Ra(n,r),o=Math.abs(Ho(n,r));n.setDate(n.getDate()-a*o);const s=+(Ra(n,r)===-a),d=a*(o-s);return d===0?0:d}function Ra(e,t){const i=e.getFullYear()-t.getFullYear()||e.getMonth()-t.getMonth()||e.getDate()-t.getDate()||e.getHours()-t.getHours()||e.getMinutes()-t.getMinutes()||e.getSeconds()-t.getSeconds()||e.getMilliseconds()-t.getMilliseconds();return i<0?-1:i>0?1:i}function on(e){return t=>{const n=(e?Math[e]:Math.trunc)(t);return n===0?0:n}}function Kd(e,t,i){const[n,r]=Nt(i==null?void 0:i.in,e,t),a=(+n-+r)/an;return on(i==null?void 0:i.roundingMethod)(a)}function Zr(e,t){return+K(e)-+K(t)}function qd(e,t,i){const n=Zr(e,t)/rn;return on(i==null?void 0:i.roundingMethod)(n)}function Ko(e,t){const i=K(e,t==null?void 0:t.in);return i.setHours(23,59,59,999),i}function qo(e,t){const i=K(e,t==null?void 0:t.in),n=i.getMonth();return i.setFullYear(i.getFullYear(),n+1,0),i.setHours(23,59,59,999),i}function Gd(e,t){const i=K(e,t==null?void 0:t.in);return+Ko(i,t)==+qo(i,t)}function Go(e,t,i){const[n,r,a]=Nt(i==null?void 0:i.in,e,e,t),o=Ai(r,a),s=Math.abs(Wd(r,a));if(s<1)return 0;r.getMonth()===1&&r.getDate()>27&&r.setDate(30),r.setMonth(r.getMonth()-o*s);let d=Ai(r,a)===-o;Gd(n)&&s===1&&Ai(n,a)===1&&(d=!1);const p=o*(s-+d);return p===0?0:p}function Ud(e,t,i){const n=Go(e,t,i)/3;return on(i==null?void 0:i.roundingMethod)(n)}function Yd(e,t,i){const n=Zr(e,t)/1e3;return on(i==null?void 0:i.roundingMethod)(n)}function Zd(e,t,i){const n=Vo(e,t,i)/7;return on(i==null?void 0:i.roundingMethod)(n)}function Qd(e,t,i){const[n,r]=Nt(i==null?void 0:i.in,e,t),a=Ai(n,r),o=Math.abs(Vd(n,r));n.setFullYear(1584),r.setFullYear(1584);const s=Ai(n,r)===-a,d=a*(o-+s);return d===0?0:d}function Xd(e,t){const i=K(e,t==null?void 0:t.in),n=i.getMonth(),r=n-n%3;return i.setMonth(r,1),i.setHours(0,0,0,0),i}function Jd(e,t){const i=K(e,t==null?void 0:t.in);return i.setDate(1),i.setHours(0,0,0,0),i}function ep(e,t){const i=K(e,t==null?void 0:t.in),n=i.getFullYear();return i.setFullYear(n+1,0,0),i.setHours(23,59,59,999),i}function Uo(e,t){const i=K(e,t==null?void 0:t.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}function tp(e,t){const i=K(e,t==null?void 0:t.in);return i.setMinutes(59,59,999),i}function ip(e,t){var s,d;const i=Bt(),n=i.weekStartsOn??((d=(s=i.locale)==null?void 0:s.options)==null?void 0:d.weekStartsOn)??0,r=K(e,t==null?void 0:t.in),a=r.getDay(),o=(a<n?-7:0)+6-(a-n);return r.setDate(r.getDate()+o),r.setHours(23,59,59,999),r}function np(e,t){const i=K(e,t==null?void 0:t.in);return i.setSeconds(59,999),i}function rp(e,t){const i=K(e,t==null?void 0:t.in),n=i.getMonth(),r=n-n%3+3;return i.setMonth(r,0),i.setHours(23,59,59,999),i}function ap(e,t){const i=K(e,t==null?void 0:t.in);return i.setMilliseconds(999),i}const op={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},sp=(e,t,i)=>{let n;const r=op[e];return typeof r=="string"?n=r:t===1?n=r.one:n=r.other.replace("{{count}}",t.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+n:n+" ago":n};function vr(e){return(t={})=>{const i=t.width?String(t.width):e.defaultWidth;return e.formats[i]||e.formats[e.defaultWidth]}}const lp={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},cp={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},dp={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},pp={date:vr({formats:lp,defaultWidth:"full"}),time:vr({formats:cp,defaultWidth:"full"}),dateTime:vr({formats:dp,defaultWidth:"full"})},up={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},hp=(e,t,i,n)=>up[e];function Pi(e){return(t,i)=>{const n=i!=null&&i.context?String(i.context):"standalone";let r;if(n==="formatting"&&e.formattingValues){const o=e.defaultFormattingWidth||e.defaultWidth,s=i!=null&&i.width?String(i.width):o;r=e.formattingValues[s]||e.formattingValues[o]}else{const o=e.defaultWidth,s=i!=null&&i.width?String(i.width):e.defaultWidth;r=e.values[s]||e.values[o]}const a=e.argumentCallback?e.argumentCallback(t):t;return r[a]}}const gp={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},bp={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},fp={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},mp={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},yp={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},vp={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},xp=(e,t)=>{const i=Number(e),n=i%100;if(n>20||n<10)switch(n%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},wp={ordinalNumber:xp,era:Pi({values:gp,defaultWidth:"wide"}),quarter:Pi({values:bp,defaultWidth:"wide",argumentCallback:e=>e-1}),month:Pi({values:fp,defaultWidth:"wide"}),day:Pi({values:mp,defaultWidth:"wide"}),dayPeriod:Pi({values:yp,defaultWidth:"wide",formattingValues:vp,defaultFormattingWidth:"wide"})};function Ti(e){return(t,i={})=>{const n=i.width,r=n&&e.matchPatterns[n]||e.matchPatterns[e.defaultMatchWidth],a=t.match(r);if(!a)return null;const o=a[0],s=n&&e.parsePatterns[n]||e.parsePatterns[e.defaultParseWidth],d=Array.isArray(s)?$p(s,h=>h.test(o)):_p(s,h=>h.test(o));let p;p=e.valueCallback?e.valueCallback(d):d,p=i.valueCallback?i.valueCallback(p):p;const u=t.slice(o.length);return{value:p,rest:u}}}function _p(e,t){for(const i in e)if(Object.prototype.hasOwnProperty.call(e,i)&&t(e[i]))return i}function $p(e,t){for(let i=0;i<e.length;i++)if(t(e[i]))return i}function kp(e){return(t,i={})=>{const n=t.match(e.matchPattern);if(!n)return null;const r=n[0],a=t.match(e.parsePattern);if(!a)return null;let o=e.valueCallback?e.valueCallback(a[0]):a[0];o=i.valueCallback?i.valueCallback(o):o;const s=t.slice(r.length);return{value:o,rest:s}}}const Sp=/^(\d+)(th|st|nd|rd)?/i,Cp=/\d+/i,Pp={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},Tp={any:[/^b/i,/^(a|c)/i]},Mp={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},Dp={any:[/1/i,/2/i,/3/i,/4/i]},zp={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},Ep={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},Op={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},Lp={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},Ap={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},Fp={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},Ip={ordinalNumber:kp({matchPattern:Sp,parsePattern:Cp,valueCallback:e=>parseInt(e,10)}),era:Ti({matchPatterns:Pp,defaultMatchWidth:"wide",parsePatterns:Tp,defaultParseWidth:"any"}),quarter:Ti({matchPatterns:Mp,defaultMatchWidth:"wide",parsePatterns:Dp,defaultParseWidth:"any",valueCallback:e=>e+1}),month:Ti({matchPatterns:zp,defaultMatchWidth:"wide",parsePatterns:Ep,defaultParseWidth:"any"}),day:Ti({matchPatterns:Op,defaultMatchWidth:"wide",parsePatterns:Lp,defaultParseWidth:"any"}),dayPeriod:Ti({matchPatterns:Ap,defaultMatchWidth:"any",parsePatterns:Fp,defaultParseWidth:"any"})},Yo={code:"en-US",formatDistance:sp,formatLong:pp,formatRelative:hp,localize:wp,match:Ip,options:{weekStartsOn:0,firstWeekContainsDate:1}};function Bp(e,t){const i=K(e,t==null?void 0:t.in);return Ho(i,Uo(i))+1}function Zo(e,t){const i=K(e,t==null?void 0:t.in),n=+ni(i)-+Fd(i);return Math.round(n/jo)+1}function Qr(e,t){var u,h,b,f;const i=K(e,t==null?void 0:t.in),n=i.getFullYear(),r=Bt(),a=(t==null?void 0:t.firstWeekContainsDate)??((h=(u=t==null?void 0:t.locale)==null?void 0:u.options)==null?void 0:h.firstWeekContainsDate)??r.firstWeekContainsDate??((f=(b=r.locale)==null?void 0:b.options)==null?void 0:f.firstWeekContainsDate)??1,o=ge((t==null?void 0:t.in)||e,0);o.setFullYear(n+1,0,a),o.setHours(0,0,0,0);const s=Ve(o,t),d=ge((t==null?void 0:t.in)||e,0);d.setFullYear(n,0,a),d.setHours(0,0,0,0);const p=Ve(d,t);return+i>=+s?n+1:+i>=+p?n:n-1}function Np(e,t){var s,d,p,u;const i=Bt(),n=(t==null?void 0:t.firstWeekContainsDate)??((d=(s=t==null?void 0:t.locale)==null?void 0:s.options)==null?void 0:d.firstWeekContainsDate)??i.firstWeekContainsDate??((u=(p=i.locale)==null?void 0:p.options)==null?void 0:u.firstWeekContainsDate)??1,r=Qr(e,t),a=ge((t==null?void 0:t.in)||e,0);return a.setFullYear(r,0,n),a.setHours(0,0,0,0),Ve(a,t)}function Qo(e,t){const i=K(e,t==null?void 0:t.in),n=+Ve(i,t)-+Np(i,t);return Math.round(n/jo)+1}function ie(e,t){const i=e<0?"-":"",n=Math.abs(e).toString().padStart(t,"0");return i+n}const at={y(e,t){const i=e.getFullYear(),n=i>0?i:1-i;return ie(t==="yy"?n%100:n,t.length)},M(e,t){const i=e.getMonth();return t==="M"?String(i+1):ie(i+1,2)},d(e,t){return ie(e.getDate(),t.length)},a(e,t){const i=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(e,t){return ie(e.getHours()%12||12,t.length)},H(e,t){return ie(e.getHours(),t.length)},m(e,t){return ie(e.getMinutes(),t.length)},s(e,t){return ie(e.getSeconds(),t.length)},S(e,t){const i=t.length,n=e.getMilliseconds(),r=Math.trunc(n*Math.pow(10,i-3));return ie(r,t.length)}},Ht={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},Ha={G:function(e,t,i){const n=e.getFullYear()>0?1:0;switch(t){case"G":case"GG":case"GGG":return i.era(n,{width:"abbreviated"});case"GGGGG":return i.era(n,{width:"narrow"});case"GGGG":default:return i.era(n,{width:"wide"})}},y:function(e,t,i){if(t==="yo"){const n=e.getFullYear(),r=n>0?n:1-n;return i.ordinalNumber(r,{unit:"year"})}return at.y(e,t)},Y:function(e,t,i,n){const r=Qr(e,n),a=r>0?r:1-r;if(t==="YY"){const o=a%100;return ie(o,2)}return t==="Yo"?i.ordinalNumber(a,{unit:"year"}):ie(a,t.length)},R:function(e,t){const i=Ro(e);return ie(i,t.length)},u:function(e,t){const i=e.getFullYear();return ie(i,t.length)},Q:function(e,t,i){const n=Math.ceil((e.getMonth()+1)/3);switch(t){case"Q":return String(n);case"QQ":return ie(n,2);case"Qo":return i.ordinalNumber(n,{unit:"quarter"});case"QQQ":return i.quarter(n,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(n,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(n,{width:"wide",context:"formatting"})}},q:function(e,t,i){const n=Math.ceil((e.getMonth()+1)/3);switch(t){case"q":return String(n);case"qq":return ie(n,2);case"qo":return i.ordinalNumber(n,{unit:"quarter"});case"qqq":return i.quarter(n,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(n,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(n,{width:"wide",context:"standalone"})}},M:function(e,t,i){const n=e.getMonth();switch(t){case"M":case"MM":return at.M(e,t);case"Mo":return i.ordinalNumber(n+1,{unit:"month"});case"MMM":return i.month(n,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(n,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(n,{width:"wide",context:"formatting"})}},L:function(e,t,i){const n=e.getMonth();switch(t){case"L":return String(n+1);case"LL":return ie(n+1,2);case"Lo":return i.ordinalNumber(n+1,{unit:"month"});case"LLL":return i.month(n,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(n,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(n,{width:"wide",context:"standalone"})}},w:function(e,t,i,n){const r=Qo(e,n);return t==="wo"?i.ordinalNumber(r,{unit:"week"}):ie(r,t.length)},I:function(e,t,i){const n=Zo(e);return t==="Io"?i.ordinalNumber(n,{unit:"week"}):ie(n,t.length)},d:function(e,t,i){return t==="do"?i.ordinalNumber(e.getDate(),{unit:"date"}):at.d(e,t)},D:function(e,t,i){const n=Bp(e);return t==="Do"?i.ordinalNumber(n,{unit:"dayOfYear"}):ie(n,t.length)},E:function(e,t,i){const n=e.getDay();switch(t){case"E":case"EE":case"EEE":return i.day(n,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(n,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(n,{width:"short",context:"formatting"});case"EEEE":default:return i.day(n,{width:"wide",context:"formatting"})}},e:function(e,t,i,n){const r=e.getDay(),a=(r-n.weekStartsOn+8)%7||7;switch(t){case"e":return String(a);case"ee":return ie(a,2);case"eo":return i.ordinalNumber(a,{unit:"day"});case"eee":return i.day(r,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(r,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(r,{width:"short",context:"formatting"});case"eeee":default:return i.day(r,{width:"wide",context:"formatting"})}},c:function(e,t,i,n){const r=e.getDay(),a=(r-n.weekStartsOn+8)%7||7;switch(t){case"c":return String(a);case"cc":return ie(a,t.length);case"co":return i.ordinalNumber(a,{unit:"day"});case"ccc":return i.day(r,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(r,{width:"narrow",context:"standalone"});case"cccccc":return i.day(r,{width:"short",context:"standalone"});case"cccc":default:return i.day(r,{width:"wide",context:"standalone"})}},i:function(e,t,i){const n=e.getDay(),r=n===0?7:n;switch(t){case"i":return String(r);case"ii":return ie(r,t.length);case"io":return i.ordinalNumber(r,{unit:"day"});case"iii":return i.day(n,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(n,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(n,{width:"short",context:"formatting"});case"iiii":default:return i.day(n,{width:"wide",context:"formatting"})}},a:function(e,t,i){const r=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},b:function(e,t,i){const n=e.getHours();let r;switch(n===12?r=Ht.noon:n===0?r=Ht.midnight:r=n/12>=1?"pm":"am",t){case"b":case"bb":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},B:function(e,t,i){const n=e.getHours();let r;switch(n>=17?r=Ht.evening:n>=12?r=Ht.afternoon:n>=4?r=Ht.morning:r=Ht.night,t){case"B":case"BB":case"BBB":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},h:function(e,t,i){if(t==="ho"){let n=e.getHours()%12;return n===0&&(n=12),i.ordinalNumber(n,{unit:"hour"})}return at.h(e,t)},H:function(e,t,i){return t==="Ho"?i.ordinalNumber(e.getHours(),{unit:"hour"}):at.H(e,t)},K:function(e,t,i){const n=e.getHours()%12;return t==="Ko"?i.ordinalNumber(n,{unit:"hour"}):ie(n,t.length)},k:function(e,t,i){let n=e.getHours();return n===0&&(n=24),t==="ko"?i.ordinalNumber(n,{unit:"hour"}):ie(n,t.length)},m:function(e,t,i){return t==="mo"?i.ordinalNumber(e.getMinutes(),{unit:"minute"}):at.m(e,t)},s:function(e,t,i){return t==="so"?i.ordinalNumber(e.getSeconds(),{unit:"second"}):at.s(e,t)},S:function(e,t){return at.S(e,t)},X:function(e,t,i){const n=e.getTimezoneOffset();if(n===0)return"Z";switch(t){case"X":return Va(n);case"XXXX":case"XX":return kt(n);case"XXXXX":case"XXX":default:return kt(n,":")}},x:function(e,t,i){const n=e.getTimezoneOffset();switch(t){case"x":return Va(n);case"xxxx":case"xx":return kt(n);case"xxxxx":case"xxx":default:return kt(n,":")}},O:function(e,t,i){const n=e.getTimezoneOffset();switch(t){case"O":case"OO":case"OOO":return"GMT"+Wa(n,":");case"OOOO":default:return"GMT"+kt(n,":")}},z:function(e,t,i){const n=e.getTimezoneOffset();switch(t){case"z":case"zz":case"zzz":return"GMT"+Wa(n,":");case"zzzz":default:return"GMT"+kt(n,":")}},t:function(e,t,i){const n=Math.trunc(+e/1e3);return ie(n,t.length)},T:function(e,t,i){return ie(+e,t.length)}};function Wa(e,t=""){const i=e>0?"-":"+",n=Math.abs(e),r=Math.trunc(n/60),a=n%60;return a===0?i+String(r):i+String(r)+t+ie(a,2)}function Va(e,t){return e%60===0?(e>0?"-":"+")+ie(Math.abs(e)/60,2):kt(e,t)}function kt(e,t=""){const i=e>0?"-":"+",n=Math.abs(e),r=ie(Math.trunc(n/60),2),a=ie(n%60,2);return i+r+t+a}const Ka=(e,t)=>{switch(e){case"P":return t.date({width:"short"});case"PP":return t.date({width:"medium"});case"PPP":return t.date({width:"long"});case"PPPP":default:return t.date({width:"full"})}},Xo=(e,t)=>{switch(e){case"p":return t.time({width:"short"});case"pp":return t.time({width:"medium"});case"ppp":return t.time({width:"long"});case"pppp":default:return t.time({width:"full"})}},jp=(e,t)=>{const i=e.match(/(P+)(p+)?/)||[],n=i[1],r=i[2];if(!r)return Ka(e,t);let a;switch(n){case"P":a=t.dateTime({width:"short"});break;case"PP":a=t.dateTime({width:"medium"});break;case"PPP":a=t.dateTime({width:"long"});break;case"PPPP":default:a=t.dateTime({width:"full"});break}return a.replace("{{date}}",Ka(n,t)).replace("{{time}}",Xo(r,t))},Br={p:Xo,P:jp},Rp=/^D+$/,Hp=/^Y+$/,Wp=["D","DD","YY","YYYY"];function Jo(e){return Rp.test(e)}function es(e){return Hp.test(e)}function Nr(e,t,i){const n=Vp(e,t,i);if(console.warn(n),Wp.includes(e))throw new RangeError(n)}function Vp(e,t,i){const n=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${t}\`) for formatting ${n} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const Kp=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,qp=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Gp=/^'([^]*?)'?$/,Up=/''/g,Yp=/[a-zA-Z]/;function Zp(e,t,i){var u,h,b,f,m,y,S,x;const n=Bt(),r=(i==null?void 0:i.locale)??n.locale??Yo,a=(i==null?void 0:i.firstWeekContainsDate)??((h=(u=i==null?void 0:i.locale)==null?void 0:u.options)==null?void 0:h.firstWeekContainsDate)??n.firstWeekContainsDate??((f=(b=n.locale)==null?void 0:b.options)==null?void 0:f.firstWeekContainsDate)??1,o=(i==null?void 0:i.weekStartsOn)??((y=(m=i==null?void 0:i.locale)==null?void 0:m.options)==null?void 0:y.weekStartsOn)??n.weekStartsOn??((x=(S=n.locale)==null?void 0:S.options)==null?void 0:x.weekStartsOn)??0,s=K(e,i==null?void 0:i.in);if(!Wo(s))throw new RangeError("Invalid time value");let d=t.match(qp).map($=>{const P=$[0];if(P==="p"||P==="P"){const H=Br[P];return H($,r.formatLong)}return $}).join("").match(Kp).map($=>{if($==="''")return{isToken:!1,value:"'"};const P=$[0];if(P==="'")return{isToken:!1,value:Qp($)};if(Ha[P])return{isToken:!0,value:$};if(P.match(Yp))throw new RangeError("Format string contains an unescaped latin alphabet character `"+P+"`");return{isToken:!1,value:$}});r.localize.preprocessor&&(d=r.localize.preprocessor(s,d));const p={firstWeekContainsDate:a,weekStartsOn:o,locale:r};return d.map($=>{if(!$.isToken)return $.value;const P=$.value;(!(i!=null&&i.useAdditionalWeekYearTokens)&&es(P)||!(i!=null&&i.useAdditionalDayOfYearTokens)&&Jo(P))&&Nr(P,t,String(e));const H=Ha[P[0]];return H(s,P,r.localize,p)}).join("")}function Qp(e){const t=e.match(Gp);return t?t[1].replace(Up,"'"):e}function Xp(){return Object.assign({},Bt())}function Jp(e,t){const i=K(e,t==null?void 0:t.in).getDay();return i===0?7:i}function eu(e,t){const i=tu(t)?new t(0):ge(t,0);return i.setFullYear(e.getFullYear(),e.getMonth(),e.getDate()),i.setHours(e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()),i}function tu(e){var t;return typeof e=="function"&&((t=e.prototype)==null?void 0:t.constructor)===e}const iu=10;class ts{constructor(){O(this,"subPriority",0)}validate(t,i){return!0}}class nu extends ts{constructor(t,i,n,r,a){super(),this.value=t,this.validateValue=i,this.setValue=n,this.priority=r,a&&(this.subPriority=a)}validate(t,i){return this.validateValue(t,this.value,i)}set(t,i,n){return this.setValue(t,i,this.value,n)}}class ru extends ts{constructor(i,n){super();O(this,"priority",iu);O(this,"subPriority",-1);this.context=i||(r=>ge(n,r))}set(i,n){return n.timestampIsSet?i:ge(i,eu(i,this.context))}}class ee{run(t,i,n,r){const a=this.parse(t,i,n,r);return a?{setter:new nu(a.value,this.validate,this.set,this.priority,this.subPriority),rest:a.rest}:null}validate(t,i,n){return!0}}class au extends ee{constructor(){super(...arguments);O(this,"priority",140);O(this,"incompatibleTokens",["R","u","t","T"])}parse(i,n,r){switch(n){case"G":case"GG":case"GGG":return r.era(i,{width:"abbreviated"})||r.era(i,{width:"narrow"});case"GGGGG":return r.era(i,{width:"narrow"});case"GGGG":default:return r.era(i,{width:"wide"})||r.era(i,{width:"abbreviated"})||r.era(i,{width:"narrow"})}}set(i,n,r){return n.era=r,i.setFullYear(r,0,1),i.setHours(0,0,0,0),i}}const fe={month:/^(1[0-2]|0?\d)/,date:/^(3[0-1]|[0-2]?\d)/,dayOfYear:/^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,week:/^(5[0-3]|[0-4]?\d)/,hour23h:/^(2[0-3]|[0-1]?\d)/,hour24h:/^(2[0-4]|[0-1]?\d)/,hour11h:/^(1[0-1]|0?\d)/,hour12h:/^(1[0-2]|0?\d)/,minute:/^[0-5]?\d/,second:/^[0-5]?\d/,singleDigit:/^\d/,twoDigits:/^\d{1,2}/,threeDigits:/^\d{1,3}/,fourDigits:/^\d{1,4}/,anyDigitsSigned:/^-?\d+/,singleDigitSigned:/^-?\d/,twoDigitsSigned:/^-?\d{1,2}/,threeDigitsSigned:/^-?\d{1,3}/,fourDigitsSigned:/^-?\d{1,4}/},He={basicOptionalMinutes:/^([+-])(\d{2})(\d{2})?|Z/,basic:/^([+-])(\d{2})(\d{2})|Z/,basicOptionalSeconds:/^([+-])(\d{2})(\d{2})((\d{2}))?|Z/,extended:/^([+-])(\d{2}):(\d{2})|Z/,extendedOptionalSeconds:/^([+-])(\d{2}):(\d{2})(:(\d{2}))?|Z/};function me(e,t){return e&&{value:t(e.value),rest:e.rest}}function pe(e,t){const i=t.match(e);return i?{value:parseInt(i[0],10),rest:t.slice(i[0].length)}:null}function We(e,t){const i=t.match(e);if(!i)return null;if(i[0]==="Z")return{value:0,rest:t.slice(1)};const n=i[1]==="+"?1:-1,r=i[2]?parseInt(i[2],10):0,a=i[3]?parseInt(i[3],10):0,o=i[5]?parseInt(i[5],10):0;return{value:n*(r*an+a*rn+o*Od),rest:t.slice(i[0].length)}}function is(e){return pe(fe.anyDigitsSigned,e)}function be(e,t){switch(e){case 1:return pe(fe.singleDigit,t);case 2:return pe(fe.twoDigits,t);case 3:return pe(fe.threeDigits,t);case 4:return pe(fe.fourDigits,t);default:return pe(new RegExp("^\\d{1,"+e+"}"),t)}}function zn(e,t){switch(e){case 1:return pe(fe.singleDigitSigned,t);case 2:return pe(fe.twoDigitsSigned,t);case 3:return pe(fe.threeDigitsSigned,t);case 4:return pe(fe.fourDigitsSigned,t);default:return pe(new RegExp("^-?\\d{1,"+e+"}"),t)}}function Xr(e){switch(e){case"morning":return 4;case"evening":return 17;case"pm":case"noon":case"afternoon":return 12;case"am":case"midnight":case"night":default:return 0}}function ns(e,t){const i=t>0,n=i?t:1-t;let r;if(n<=50)r=e||100;else{const a=n+50,o=Math.trunc(a/100)*100,s=e>=a%100;r=e+o-(s?100:0)}return i?r:1-r}function rs(e){return e%400===0||e%4===0&&e%100!==0}class ou extends ee{constructor(){super(...arguments);O(this,"priority",130);O(this,"incompatibleTokens",["Y","R","u","w","I","i","e","c","t","T"])}parse(i,n,r){const a=o=>({year:o,isTwoDigitYear:n==="yy"});switch(n){case"y":return me(be(4,i),a);case"yo":return me(r.ordinalNumber(i,{unit:"year"}),a);default:return me(be(n.length,i),a)}}validate(i,n){return n.isTwoDigitYear||n.year>0}set(i,n,r){const a=i.getFullYear();if(r.isTwoDigitYear){const s=ns(r.year,a);return i.setFullYear(s,0,1),i.setHours(0,0,0,0),i}const o=!("era"in n)||n.era===1?r.year:1-r.year;return i.setFullYear(o,0,1),i.setHours(0,0,0,0),i}}class su extends ee{constructor(){super(...arguments);O(this,"priority",130);O(this,"incompatibleTokens",["y","R","u","Q","q","M","L","I","d","D","i","t","T"])}parse(i,n,r){const a=o=>({year:o,isTwoDigitYear:n==="YY"});switch(n){case"Y":return me(be(4,i),a);case"Yo":return me(r.ordinalNumber(i,{unit:"year"}),a);default:return me(be(n.length,i),a)}}validate(i,n){return n.isTwoDigitYear||n.year>0}set(i,n,r,a){const o=Qr(i,a);if(r.isTwoDigitYear){const d=ns(r.year,o);return i.setFullYear(d,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),Ve(i,a)}const s=!("era"in n)||n.era===1?r.year:1-r.year;return i.setFullYear(s,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),Ve(i,a)}}class lu extends ee{constructor(){super(...arguments);O(this,"priority",130);O(this,"incompatibleTokens",["G","y","Y","u","Q","q","M","L","w","d","D","e","c","t","T"])}parse(i,n){return zn(n==="R"?4:n.length,i)}set(i,n,r){const a=ge(i,0);return a.setFullYear(r,0,4),a.setHours(0,0,0,0),ni(a)}}class cu extends ee{constructor(){super(...arguments);O(this,"priority",130);O(this,"incompatibleTokens",["G","y","Y","R","w","I","i","e","c","t","T"])}parse(i,n){return zn(n==="u"?4:n.length,i)}set(i,n,r){return i.setFullYear(r,0,1),i.setHours(0,0,0,0),i}}class du extends ee{constructor(){super(...arguments);O(this,"priority",120);O(this,"incompatibleTokens",["Y","R","q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"Q":case"QQ":return be(n.length,i);case"Qo":return r.ordinalNumber(i,{unit:"quarter"});case"QQQ":return r.quarter(i,{width:"abbreviated",context:"formatting"})||r.quarter(i,{width:"narrow",context:"formatting"});case"QQQQQ":return r.quarter(i,{width:"narrow",context:"formatting"});case"QQQQ":default:return r.quarter(i,{width:"wide",context:"formatting"})||r.quarter(i,{width:"abbreviated",context:"formatting"})||r.quarter(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=1&&n<=4}set(i,n,r){return i.setMonth((r-1)*3,1),i.setHours(0,0,0,0),i}}class pu extends ee{constructor(){super(...arguments);O(this,"priority",120);O(this,"incompatibleTokens",["Y","R","Q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"q":case"qq":return be(n.length,i);case"qo":return r.ordinalNumber(i,{unit:"quarter"});case"qqq":return r.quarter(i,{width:"abbreviated",context:"standalone"})||r.quarter(i,{width:"narrow",context:"standalone"});case"qqqqq":return r.quarter(i,{width:"narrow",context:"standalone"});case"qqqq":default:return r.quarter(i,{width:"wide",context:"standalone"})||r.quarter(i,{width:"abbreviated",context:"standalone"})||r.quarter(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=1&&n<=4}set(i,n,r){return i.setMonth((r-1)*3,1),i.setHours(0,0,0,0),i}}class uu extends ee{constructor(){super(...arguments);O(this,"incompatibleTokens",["Y","R","q","Q","L","w","I","D","i","e","c","t","T"]);O(this,"priority",110)}parse(i,n,r){const a=o=>o-1;switch(n){case"M":return me(pe(fe.month,i),a);case"MM":return me(be(2,i),a);case"Mo":return me(r.ordinalNumber(i,{unit:"month"}),a);case"MMM":return r.month(i,{width:"abbreviated",context:"formatting"})||r.month(i,{width:"narrow",context:"formatting"});case"MMMMM":return r.month(i,{width:"narrow",context:"formatting"});case"MMMM":default:return r.month(i,{width:"wide",context:"formatting"})||r.month(i,{width:"abbreviated",context:"formatting"})||r.month(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.setMonth(r,1),i.setHours(0,0,0,0),i}}class hu extends ee{constructor(){super(...arguments);O(this,"priority",110);O(this,"incompatibleTokens",["Y","R","q","Q","M","w","I","D","i","e","c","t","T"])}parse(i,n,r){const a=o=>o-1;switch(n){case"L":return me(pe(fe.month,i),a);case"LL":return me(be(2,i),a);case"Lo":return me(r.ordinalNumber(i,{unit:"month"}),a);case"LLL":return r.month(i,{width:"abbreviated",context:"standalone"})||r.month(i,{width:"narrow",context:"standalone"});case"LLLLL":return r.month(i,{width:"narrow",context:"standalone"});case"LLLL":default:return r.month(i,{width:"wide",context:"standalone"})||r.month(i,{width:"abbreviated",context:"standalone"})||r.month(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.setMonth(r,1),i.setHours(0,0,0,0),i}}function gu(e,t,i){const n=K(e,i==null?void 0:i.in),r=Qo(n,i)-t;return n.setDate(n.getDate()-r*7),K(n,i==null?void 0:i.in)}class bu extends ee{constructor(){super(...arguments);O(this,"priority",100);O(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","i","t","T"])}parse(i,n,r){switch(n){case"w":return pe(fe.week,i);case"wo":return r.ordinalNumber(i,{unit:"week"});default:return be(n.length,i)}}validate(i,n){return n>=1&&n<=53}set(i,n,r,a){return Ve(gu(i,r,a),a)}}function fu(e,t,i){const n=K(e,i==null?void 0:i.in),r=Zo(n,i)-t;return n.setDate(n.getDate()-r*7),n}class mu extends ee{constructor(){super(...arguments);O(this,"priority",100);O(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","e","c","t","T"])}parse(i,n,r){switch(n){case"I":return pe(fe.week,i);case"Io":return r.ordinalNumber(i,{unit:"week"});default:return be(n.length,i)}}validate(i,n){return n>=1&&n<=53}set(i,n,r){return ni(fu(i,r))}}const yu=[31,28,31,30,31,30,31,31,30,31,30,31],vu=[31,29,31,30,31,30,31,31,30,31,30,31];class xu extends ee{constructor(){super(...arguments);O(this,"priority",90);O(this,"subPriority",1);O(this,"incompatibleTokens",["Y","R","q","Q","w","I","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"d":return pe(fe.date,i);case"do":return r.ordinalNumber(i,{unit:"date"});default:return be(n.length,i)}}validate(i,n){const r=i.getFullYear(),a=rs(r),o=i.getMonth();return a?n>=1&&n<=vu[o]:n>=1&&n<=yu[o]}set(i,n,r){return i.setDate(r),i.setHours(0,0,0,0),i}}class wu extends ee{constructor(){super(...arguments);O(this,"priority",90);O(this,"subpriority",1);O(this,"incompatibleTokens",["Y","R","q","Q","M","L","w","I","d","E","i","e","c","t","T"])}parse(i,n,r){switch(n){case"D":case"DD":return pe(fe.dayOfYear,i);case"Do":return r.ordinalNumber(i,{unit:"date"});default:return be(n.length,i)}}validate(i,n){const r=i.getFullYear();return rs(r)?n>=1&&n<=366:n>=1&&n<=365}set(i,n,r){return i.setMonth(0,r),i.setHours(0,0,0,0),i}}function Jr(e,t,i){var h,b,f,m;const n=Bt(),r=(i==null?void 0:i.weekStartsOn)??((b=(h=i==null?void 0:i.locale)==null?void 0:h.options)==null?void 0:b.weekStartsOn)??n.weekStartsOn??((m=(f=n.locale)==null?void 0:f.options)==null?void 0:m.weekStartsOn)??0,a=K(e,i==null?void 0:i.in),o=a.getDay(),d=(t%7+7)%7,p=7-r,u=t<0||t>6?t-(o+p)%7:(d+p)%7-(o+p)%7;return Xn(a,u,i)}class _u extends ee{constructor(){super(...arguments);O(this,"priority",90);O(this,"incompatibleTokens",["D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"E":case"EE":case"EEE":return r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"EEEEE":return r.day(i,{width:"narrow",context:"formatting"});case"EEEEEE":return r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"EEEE":default:return r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=Jr(i,r,a),i.setHours(0,0,0,0),i}}class $u extends ee{constructor(){super(...arguments);O(this,"priority",90);O(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","c","t","T"])}parse(i,n,r,a){const o=s=>{const d=Math.floor((s-1)/7)*7;return(s+a.weekStartsOn+6)%7+d};switch(n){case"e":case"ee":return me(be(n.length,i),o);case"eo":return me(r.ordinalNumber(i,{unit:"day"}),o);case"eee":return r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"eeeee":return r.day(i,{width:"narrow",context:"formatting"});case"eeeeee":return r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"eeee":default:return r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=Jr(i,r,a),i.setHours(0,0,0,0),i}}class ku extends ee{constructor(){super(...arguments);O(this,"priority",90);O(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","e","t","T"])}parse(i,n,r,a){const o=s=>{const d=Math.floor((s-1)/7)*7;return(s+a.weekStartsOn+6)%7+d};switch(n){case"c":case"cc":return me(be(n.length,i),o);case"co":return me(r.ordinalNumber(i,{unit:"day"}),o);case"ccc":return r.day(i,{width:"abbreviated",context:"standalone"})||r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"});case"ccccc":return r.day(i,{width:"narrow",context:"standalone"});case"cccccc":return r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"});case"cccc":default:return r.day(i,{width:"wide",context:"standalone"})||r.day(i,{width:"abbreviated",context:"standalone"})||r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=Jr(i,r,a),i.setHours(0,0,0,0),i}}function Su(e,t,i){const n=K(e,i==null?void 0:i.in),r=Jp(n,i),a=t-r;return Xn(n,a,i)}class Cu extends ee{constructor(){super(...arguments);O(this,"priority",90);O(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","E","e","c","t","T"])}parse(i,n,r){const a=o=>o===0?7:o;switch(n){case"i":case"ii":return be(n.length,i);case"io":return r.ordinalNumber(i,{unit:"day"});case"iii":return me(r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a);case"iiiii":return me(r.day(i,{width:"narrow",context:"formatting"}),a);case"iiiiii":return me(r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a);case"iiii":default:return me(r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a)}}validate(i,n){return n>=1&&n<=7}set(i,n,r){return i=Su(i,r),i.setHours(0,0,0,0),i}}class Pu extends ee{constructor(){super(...arguments);O(this,"priority",80);O(this,"incompatibleTokens",["b","B","H","k","t","T"])}parse(i,n,r){switch(n){case"a":case"aa":case"aaa":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaaa":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaa":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(Xr(r),0,0,0),i}}class Tu extends ee{constructor(){super(...arguments);O(this,"priority",80);O(this,"incompatibleTokens",["a","B","H","k","t","T"])}parse(i,n,r){switch(n){case"b":case"bb":case"bbb":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbbb":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbb":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(Xr(r),0,0,0),i}}class Mu extends ee{constructor(){super(...arguments);O(this,"priority",80);O(this,"incompatibleTokens",["a","b","t","T"])}parse(i,n,r){switch(n){case"B":case"BB":case"BBB":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBBB":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBB":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(Xr(r),0,0,0),i}}class Du extends ee{constructor(){super(...arguments);O(this,"priority",70);O(this,"incompatibleTokens",["H","K","k","t","T"])}parse(i,n,r){switch(n){case"h":return pe(fe.hour12h,i);case"ho":return r.ordinalNumber(i,{unit:"hour"});default:return be(n.length,i)}}validate(i,n){return n>=1&&n<=12}set(i,n,r){const a=i.getHours()>=12;return a&&r<12?i.setHours(r+12,0,0,0):!a&&r===12?i.setHours(0,0,0,0):i.setHours(r,0,0,0),i}}class zu extends ee{constructor(){super(...arguments);O(this,"priority",70);O(this,"incompatibleTokens",["a","b","h","K","k","t","T"])}parse(i,n,r){switch(n){case"H":return pe(fe.hour23h,i);case"Ho":return r.ordinalNumber(i,{unit:"hour"});default:return be(n.length,i)}}validate(i,n){return n>=0&&n<=23}set(i,n,r){return i.setHours(r,0,0,0),i}}class Eu extends ee{constructor(){super(...arguments);O(this,"priority",70);O(this,"incompatibleTokens",["h","H","k","t","T"])}parse(i,n,r){switch(n){case"K":return pe(fe.hour11h,i);case"Ko":return r.ordinalNumber(i,{unit:"hour"});default:return be(n.length,i)}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.getHours()>=12&&r<12?i.setHours(r+12,0,0,0):i.setHours(r,0,0,0),i}}class Ou extends ee{constructor(){super(...arguments);O(this,"priority",70);O(this,"incompatibleTokens",["a","b","h","H","K","t","T"])}parse(i,n,r){switch(n){case"k":return pe(fe.hour24h,i);case"ko":return r.ordinalNumber(i,{unit:"hour"});default:return be(n.length,i)}}validate(i,n){return n>=1&&n<=24}set(i,n,r){const a=r<=24?r%24:r;return i.setHours(a,0,0,0),i}}class Lu extends ee{constructor(){super(...arguments);O(this,"priority",60);O(this,"incompatibleTokens",["t","T"])}parse(i,n,r){switch(n){case"m":return pe(fe.minute,i);case"mo":return r.ordinalNumber(i,{unit:"minute"});default:return be(n.length,i)}}validate(i,n){return n>=0&&n<=59}set(i,n,r){return i.setMinutes(r,0,0),i}}class Au extends ee{constructor(){super(...arguments);O(this,"priority",50);O(this,"incompatibleTokens",["t","T"])}parse(i,n,r){switch(n){case"s":return pe(fe.second,i);case"so":return r.ordinalNumber(i,{unit:"second"});default:return be(n.length,i)}}validate(i,n){return n>=0&&n<=59}set(i,n,r){return i.setSeconds(r,0),i}}class Fu extends ee{constructor(){super(...arguments);O(this,"priority",30);O(this,"incompatibleTokens",["t","T"])}parse(i,n){const r=a=>Math.trunc(a*Math.pow(10,-n.length+3));return me(be(n.length,i),r)}set(i,n,r){return i.setMilliseconds(r),i}}class Iu extends ee{constructor(){super(...arguments);O(this,"priority",10);O(this,"incompatibleTokens",["t","T","x"])}parse(i,n){switch(n){case"X":return We(He.basicOptionalMinutes,i);case"XX":return We(He.basic,i);case"XXXX":return We(He.basicOptionalSeconds,i);case"XXXXX":return We(He.extendedOptionalSeconds,i);case"XXX":default:return We(He.extended,i)}}set(i,n,r){return n.timestampIsSet?i:ge(i,i.getTime()-Dn(i)-r)}}class Bu extends ee{constructor(){super(...arguments);O(this,"priority",10);O(this,"incompatibleTokens",["t","T","X"])}parse(i,n){switch(n){case"x":return We(He.basicOptionalMinutes,i);case"xx":return We(He.basic,i);case"xxxx":return We(He.basicOptionalSeconds,i);case"xxxxx":return We(He.extendedOptionalSeconds,i);case"xxx":default:return We(He.extended,i)}}set(i,n,r){return n.timestampIsSet?i:ge(i,i.getTime()-Dn(i)-r)}}class Nu extends ee{constructor(){super(...arguments);O(this,"priority",40);O(this,"incompatibleTokens","*")}parse(i){return is(i)}set(i,n,r){return[ge(i,r*1e3),{timestampIsSet:!0}]}}class ju extends ee{constructor(){super(...arguments);O(this,"priority",20);O(this,"incompatibleTokens","*")}parse(i){return is(i)}set(i,n,r){return[ge(i,r),{timestampIsSet:!0}]}}const Ru={G:new au,y:new ou,Y:new su,R:new lu,u:new cu,Q:new du,q:new pu,M:new uu,L:new hu,w:new bu,I:new mu,d:new xu,D:new wu,E:new _u,e:new $u,c:new ku,i:new Cu,a:new Pu,b:new Tu,B:new Mu,h:new Du,H:new zu,K:new Eu,k:new Ou,m:new Lu,s:new Au,S:new Fu,X:new Iu,x:new Bu,t:new Nu,T:new ju},Hu=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Wu=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Vu=/^'([^]*?)'?$/,Ku=/''/g,qu=/\S/,Gu=/[a-zA-Z]/;function Uu(e,t,i,n){var S,x,$,P,H,A,j,k;const r=()=>ge((n==null?void 0:n.in)||i,NaN),a=Xp(),o=(n==null?void 0:n.locale)??a.locale??Yo,s=(n==null?void 0:n.firstWeekContainsDate)??((x=(S=n==null?void 0:n.locale)==null?void 0:S.options)==null?void 0:x.firstWeekContainsDate)??a.firstWeekContainsDate??((P=($=a.locale)==null?void 0:$.options)==null?void 0:P.firstWeekContainsDate)??1,d=(n==null?void 0:n.weekStartsOn)??((A=(H=n==null?void 0:n.locale)==null?void 0:H.options)==null?void 0:A.weekStartsOn)??a.weekStartsOn??((k=(j=a.locale)==null?void 0:j.options)==null?void 0:k.weekStartsOn)??0;if(!t)return e?r():K(i,n==null?void 0:n.in);const p={firstWeekContainsDate:s,weekStartsOn:d,locale:o},u=[new ru(n==null?void 0:n.in,i)],h=t.match(Wu).map(L=>{const M=L[0];if(M in Br){const q=Br[M];return q(L,o.formatLong)}return L}).join("").match(Hu),b=[];for(let L of h){!(n!=null&&n.useAdditionalWeekYearTokens)&&es(L)&&Nr(L,t,e),!(n!=null&&n.useAdditionalDayOfYearTokens)&&Jo(L)&&Nr(L,t,e);const M=L[0],q=Ru[M];if(q){const{incompatibleTokens:G}=q;if(Array.isArray(G)){const W=b.find(Pe=>G.includes(Pe.token)||Pe.token===M);if(W)throw new RangeError(`The format string mustn't contain \`${W.fullToken}\` and \`${L}\` at the same time`)}else if(q.incompatibleTokens==="*"&&b.length>0)throw new RangeError(`The format string mustn't contain \`${L}\` and any other token at the same time`);b.push({token:M,fullToken:L});const N=q.run(e,L,o.match,p);if(!N)return r();u.push(N.setter),e=N.rest}else{if(M.match(Gu))throw new RangeError("Format string contains an unescaped latin alphabet character `"+M+"`");if(L==="''"?L="'":M==="'"&&(L=Yu(L)),e.indexOf(L)===0)e=e.slice(L.length);else return r()}}if(e.length>0&&qu.test(e))return r();const f=u.map(L=>L.priority).sort((L,M)=>M-L).filter((L,M,q)=>q.indexOf(L)===M).map(L=>u.filter(M=>M.priority===L).sort((M,q)=>q.subPriority-M.subPriority)).map(L=>L[0]);let m=K(i,n==null?void 0:n.in);if(isNaN(+m))return r();const y={};for(const L of f){if(!L.validate(m,p))return r();const M=L.set(m,y,p);Array.isArray(M)?(m=M[0],Object.assign(y,M[1])):m=M}return m}function Yu(e){return e.match(Vu)[1].replace(Ku,"'")}function Zu(e,t){const i=K(e,t==null?void 0:t.in);return i.setMinutes(0,0,0),i}function Qu(e,t){const i=K(e,t==null?void 0:t.in);return i.setSeconds(0,0),i}function Xu(e,t){const i=K(e,t==null?void 0:t.in);return i.setMilliseconds(0),i}function Ju(e,t){const i=()=>ge(t==null?void 0:t.in,NaN),n=(t==null?void 0:t.additionalDigits)??2,r=nh(e);let a;if(r.date){const p=rh(r.date,n);a=ah(p.restDateString,p.year)}if(!a||isNaN(+a))return i();const o=+a;let s=0,d;if(r.time&&(s=oh(r.time),isNaN(s)))return i();if(r.timezone){if(d=sh(r.timezone),isNaN(d))return i()}else{const p=new Date(o+s),u=K(0,t==null?void 0:t.in);return u.setFullYear(p.getUTCFullYear(),p.getUTCMonth(),p.getUTCDate()),u.setHours(p.getUTCHours(),p.getUTCMinutes(),p.getUTCSeconds(),p.getUTCMilliseconds()),u}return K(o+s+d,t==null?void 0:t.in)}const yn={dateTimeDelimiter:/[T ]/,timeZoneDelimiter:/[Z ]/i,timezone:/([Z+-].*)$/},eh=/^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/,th=/^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/,ih=/^([+-])(\d{2})(?::?(\d{2}))?$/;function nh(e){const t={},i=e.split(yn.dateTimeDelimiter);let n;if(i.length>2)return t;if(/:/.test(i[0])?n=i[0]:(t.date=i[0],n=i[1],yn.timeZoneDelimiter.test(t.date)&&(t.date=e.split(yn.timeZoneDelimiter)[0],n=e.substr(t.date.length,e.length))),n){const r=yn.timezone.exec(n);r?(t.time=n.replace(r[1],""),t.timezone=r[1]):t.time=n}return t}function rh(e,t){const i=new RegExp("^(?:(\\d{4}|[+-]\\d{"+(4+t)+"})|(\\d{2}|[+-]\\d{"+(2+t)+"})$)"),n=e.match(i);if(!n)return{year:NaN,restDateString:""};const r=n[1]?parseInt(n[1]):null,a=n[2]?parseInt(n[2]):null;return{year:a===null?r:a*100,restDateString:e.slice((n[1]||n[2]).length)}}function ah(e,t){if(t===null)return new Date(NaN);const i=e.match(eh);if(!i)return new Date(NaN);const n=!!i[4],r=Mi(i[1]),a=Mi(i[2])-1,o=Mi(i[3]),s=Mi(i[4]),d=Mi(i[5])-1;if(n)return uh(t,s,d)?lh(t,s,d):new Date(NaN);{const p=new Date(0);return!dh(t,a,o)||!ph(t,r)?new Date(NaN):(p.setUTCFullYear(t,a,Math.max(r,o)),p)}}function Mi(e){return e?parseInt(e):1}function oh(e){const t=e.match(th);if(!t)return NaN;const i=xr(t[1]),n=xr(t[2]),r=xr(t[3]);return hh(i,n,r)?i*an+n*rn+r*1e3:NaN}function xr(e){return e&&parseFloat(e.replace(",","."))||0}function sh(e){if(e==="Z")return 0;const t=e.match(ih);if(!t)return 0;const i=t[1]==="+"?-1:1,n=parseInt(t[2]),r=t[3]&&parseInt(t[3])||0;return gh(n,r)?i*(n*an+r*rn):NaN}function lh(e,t,i){const n=new Date(0);n.setUTCFullYear(e,0,4);const r=n.getUTCDay()||7,a=(t-1)*7+i+1-r;return n.setUTCDate(n.getUTCDate()+a),n}const ch=[31,null,31,30,31,30,31,31,30,31,30,31];function as(e){return e%400===0||e%4===0&&e%100!==0}function dh(e,t,i){return t>=0&&t<=11&&i>=1&&i<=(ch[t]||(as(e)?29:28))}function ph(e,t){return t>=1&&t<=(as(e)?366:365)}function uh(e,t,i){return t>=1&&t<=53&&i>=0&&i<=6}function hh(e,t,i){return e===24?t===0&&i===0:i>=0&&i<60&&t>=0&&t<60&&e>=0&&e<25}function gh(e,t){return t>=0&&t<=59}/*!
 * chartjs-adapter-date-fns v3.0.0
 * https://www.chartjs.org
 * (c) 2022 chartjs-adapter-date-fns Contributors
 * Released under the MIT license
 */const bh={datetime:"MMM d, yyyy, h:mm:ss aaaa",millisecond:"h:mm:ss.SSS aaaa",second:"h:mm:ss aaaa",minute:"h:mm aaaa",hour:"ha",day:"MMM d",week:"PP",month:"MMM yyyy",quarter:"qqq - yyyy",year:"yyyy"};Us._date.override({_id:"date-fns",formats:function(){return bh},parse:function(e,t){if(e===null||typeof e>"u")return null;const i=typeof e;return i==="number"||e instanceof Date?e=K(e):i==="string"&&(typeof t=="string"?e=Uu(e,t,new Date,this.options):e=Ju(e,this.options)),Wo(e)?e.getTime():null},format:function(e,t){return Zp(e,t,this.options)},add:function(e,t,i){switch(i){case"millisecond":return Yr(e,t);case"second":return Nd(e,t);case"minute":return Id(e,t);case"hour":return Ld(e,t);case"day":return Xn(e,t);case"week":return jd(e,t);case"month":return Ur(e,t);case"quarter":return Bd(e,t);case"year":return Rd(e,t);default:return e}},diff:function(e,t,i){switch(i){case"millisecond":return Zr(e,t);case"second":return Yd(e,t);case"minute":return qd(e,t);case"hour":return Kd(e,t);case"day":return Vo(e,t);case"week":return Zd(e,t);case"month":return Go(e,t);case"quarter":return Ud(e,t);case"year":return Qd(e,t);default:return 0}},startOf:function(e,t,i){switch(t){case"second":return Xu(e);case"minute":return Qu(e);case"hour":return Zu(e);case"day":return Ir(e);case"week":return Ve(e);case"isoWeek":return Ve(e,{weekStartsOn:+i});case"month":return Jd(e);case"quarter":return Xd(e);case"year":return Uo(e);default:return e}},endOf:function(e,t){switch(t){case"second":return ap(e);case"minute":return np(e);case"hour":return tp(e);case"day":return Ko(e);case"week":return ip(e);case"month":return qo(e);case"quarter":return rp(e);case"year":return ep(e);default:return e}}});function qa(e,t){if(!(t!=null&&t.start)||!(t!=null&&t.end))return null;const i=e.getPixelForValue(t.start.getTime()),n=e.getPixelForValue(t.end.getTime());if(!Number.isFinite(i)||!Number.isFinite(n))return null;const r=Math.min(i,n),a=Math.max(Math.abs(n-i),2);return!Number.isFinite(a)||a<=0?null:{left:r,width:a}}const fh={id:"pricingModeIcons",beforeDatasetsDraw(e,t,i){var d;const n=i,r=n==null?void 0:n.segments;if(!(r!=null&&r.length))return;const a=e.chartArea,o=(d=e.scales)==null?void 0:d.x;if(!a||!o)return;const s=e.ctx;s.save(),s.globalAlpha=(n==null?void 0:n.backgroundOpacity)??.12;for(const p of r){const u=qa(o,p);u&&(s.fillStyle=p.color||"rgba(255, 255, 255, 0.1)",s.fillRect(u.left,a.top,u.width,a.bottom-a.top))}s.restore()},afterDatasetsDraw(e,t,i){var L;const n=i,r=n==null?void 0:n.segments;if(!(r!=null&&r.length))return;const a=(L=e.scales)==null?void 0:L.x,o=e.chartArea;if(!a||!o)return;const s=(n==null?void 0:n.iconSize)??16,d=(n==null?void 0:n.labelSize)??9,p=`${s}px "Inter", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,u=`${d}px "Inter", sans-serif`,h=(n==null?void 0:n.iconColor)||"rgba(255, 255, 255, 0.95)",b=(n==null?void 0:n.labelColor)||"rgba(255, 255, 255, 0.7)",f=(n==null?void 0:n.axisBandPadding)??10,m=(n==null?void 0:n.axisBandHeight)??s+d+10,y=(n==null?void 0:n.axisBandColor)||"rgba(6, 10, 18, 0.12)",S=(n==null?void 0:n.iconAlignment)||"start",x=(n==null?void 0:n.iconStartOffset)??12,$=(n==null?void 0:n.iconBaselineOffset)??4,P=(a.bottom||o.bottom)+f,H=Math.min(P,e.height-m-2),A=o.right-o.left,j=H+$,k=e.ctx;k.save(),k.globalCompositeOperation="destination-over",k.fillStyle=y,k.fillRect(o.left,H,A,m),k.restore(),k.save(),k.globalCompositeOperation="destination-over",k.textAlign="center",k.textBaseline="top";for(const M of r){const q=qa(a,M);if(!q)continue;let G;if(S==="start"){G=q.left+x;const N=q.left+q.width-s/2;G>N&&(G=q.left+q.width/2)}else G=q.left+q.width/2;k.font=p,k.fillStyle=h,k.fillText(M.icon||"❓",G,j),M.shortLabel&&(k.font=u,k.fillStyle=b,k.fillText(M.shortLabel,G,j+s-2))}k.restore()}};function Ga(e,t){if(!e)return;e.layout||(e.layout={}),e.layout.padding||(e.layout.padding={});const i=e.layout.padding,n=12;i.top=i.top??12,i.bottom=Math.max(i.bottom||0,n)}var mh=Object.defineProperty,yh=Object.getOwnPropertyDescriptor,gi=(e,t,i,n)=>{for(var r=n>1?void 0:n?yh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&mh(t,i,r),r};const ot=Z;Gn.register(lo,co,Ys,Zs,po,uo,Qs,ho,Xs,Js,go,bo,el,tl,fo,fh);function vh(e){const t=e.timeline.map(i=>i.spot_price_czk??0);return{label:"📊 Spot",data:t,borderColor:"#2196F3",backgroundColor:"rgba(33, 150, 243, 0.15)",borderWidth:3,fill:!1,tension:.4,type:"line",yAxisID:"y-price",pointRadius:t.map(()=>0),pointHoverRadius:7,pointBackgroundColor:t.map(()=>"#42a5f5"),pointBorderColor:t.map(()=>"#42a5f5"),pointBorderWidth:2,order:1,datalabels:{display:!1}}}function xh(e){return{label:"💰 Výkup",data:e.timeline.map(t=>t.export_price_czk??0),borderColor:"#4CAF50",backgroundColor:"rgba(76, 187, 106, 0.15)",borderWidth:2,fill:!1,type:"line",tension:.4,yAxisID:"y-price",pointRadius:0,pointHoverRadius:5,order:1,borderDash:[5,5]}}function wh(e){if(!e.solar)return[];const{string1:t,string2:i,hasString1:n,hasString2:r}=e.solar,a=(n?1:0)+(r?1:0),o={string1:{border:"rgba(255, 193, 7, 0.8)",bg:"rgba(255, 193, 7, 0.2)"},string2:{border:"rgba(255, 152, 0, 0.8)",bg:"rgba(255, 152, 0, 0.2)"}};if(a===1){const s=n?t:i,d=n?o.string1:o.string2;return[{label:"☀️ FVE předpověď",data:s,borderColor:d.border,backgroundColor:d.bg,borderWidth:2,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",pointRadius:0,pointHoverRadius:5,order:2}]}return a===2?[{label:"☀️ String 2",data:i,borderColor:o.string2.border,backgroundColor:o.string2.bg,borderWidth:1.5,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2},{label:"☀️ String 1",data:t,borderColor:o.string1.border,backgroundColor:o.string1.bg,borderWidth:1.5,fill:"-1",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2}]:[]}function _h(e){if(!e.battery)return[];const{baseline:t,solarCharge:i,gridCharge:n,gridNet:r,consumption:a}=e.battery,o=[],s={baseline:{border:"#78909C",bg:"rgba(120, 144, 156, 0.25)"},solar:{border:"transparent",bg:"rgba(255, 167, 38, 0.6)"},grid:{border:"transparent",bg:"rgba(33, 150, 243, 0.6)"}};return a.some(d=>d!=null&&d>0)&&o.push({label:"🏠 Spotřeba",data:a,borderColor:"rgba(255, 112, 67, 0.7)",backgroundColor:"rgba(255, 112, 67, 0.12)",borderWidth:1.5,type:"line",fill:!1,tension:.25,pointRadius:0,pointHoverRadius:5,yAxisID:"y-power",stack:"consumption",borderDash:[6,4],order:2}),n.some(d=>d!=null&&d>0)&&o.push({label:"⚡ Síť → baterie",data:n,backgroundColor:s.grid.bg,borderColor:s.grid.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),i.some(d=>d!=null&&d>0)&&o.push({label:"☀️ FVE → baterie",data:i,backgroundColor:s.solar.bg,borderColor:s.solar.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),o.push({label:"🔋 Kapacita",data:t,backgroundColor:s.baseline.bg,borderColor:s.baseline.border,borderWidth:3,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),r.some(d=>d!==null)&&o.push({label:"📡 Netto síť",data:r,borderColor:"#00BCD4",backgroundColor:"transparent",borderWidth:2,type:"line",fill:!1,tension:.2,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",order:2}),o}function Ua(e){const t=[];return e.prices.length>0&&t.push(vh(e)),e.exportPrices.length>0&&t.push(xh(e)),t.push(...wh(e)),t.push(..._h(e)),t}function vn(e,t,i=""){if(e==null)return"";const n=i?` ${i}`:"";return`${e.toFixed(t)}${n}`}function qt(e){var r;const t=(r=e.scales)==null?void 0:r.x;if(!t)return"overview";const n=(t.max-t.min)/(1e3*60*60);return n<=6?"detail":n<=24?"day":"overview"}function wt(e,t){var h,b,f,m,y,S,x,$,P,H,A;if(!((h=e==null?void 0:e.scales)!=null&&h.x))return;const i=e.scales.x,r=(i.max-i.min)/(1e3*60*60),a=qt(e),o=(f=(b=e.options.plugins)==null?void 0:b.legend)==null?void 0:f.labels;o&&(o.padding=10,o.font&&(o.font.size=11),a==="detail"&&(o.padding=12,o.font&&(o.font.size=12)));const s=window.innerWidth<520,d=["y-price","y-solar","y-power"];for(const j of d){const k=(m=e.options.scales)==null?void 0:m[j];if(k){if(j==="y-solar"&&s){k.display=!1;continue}a==="overview"?(k.title&&(k.title.display=!1),(y=k.ticks)!=null&&y.font&&(k.ticks.font.size=10),j==="y-solar"&&(k.display=!1)):a==="detail"?(k.title&&(k.title.display=!0,k.title.font&&(k.title.font.size=12)),(S=k.ticks)!=null&&S.font&&(k.ticks.font.size=11),k.display=!0):(k.title&&(k.title.display=!0,k.title.font&&(k.title.font.size=11)),(x=k.ticks)!=null&&x.font&&(k.ticks.font.size=10),k.display=!0)}}const p=($=e.options.scales)==null?void 0:$.x;p&&(a==="overview"?p.ticks&&(p.ticks.maxTicksLimit=12,p.ticks.font&&(p.ticks.font.size=10)):a==="detail"?(p.ticks&&(p.ticks.maxTicksLimit=24,p.ticks.font&&(p.ticks.font.size=11)),p.time&&(p.time.displayFormats.hour="HH:mm")):(p.ticks&&(p.ticks.maxTicksLimit=16,p.ticks.font&&(p.ticks.font.size=10)),p.time&&(p.time.displayFormats.hour=s?"HH:mm":"dd.MM HH:mm")));const u=t==="always"||t==="auto"&&r<=6;for(const j of e.data.datasets){const k=j;if(k.datalabels||(k.datalabels={}),t==="never"){k.datalabels.display=!1;continue}if(u){let L=1;r>3&&r<=6?L=2:r>6&&(L=4),k.datalabels.display=N=>{const W=N.dataset.data[N.dataIndex];return W==null||W===0?!1:N.dataIndex%L===0};const M=k.yAxisID==="y-price",q=((P=k.label)==null?void 0:P.includes("Solární"))||((H=k.label)==null?void 0:H.includes("String")),G=(A=k.label)==null?void 0:A.includes("kapacita");k.datalabels.align="top",k.datalabels.offset=6,k.datalabels.color="#fff",k.datalabels.font={size:9,weight:"bold"},M?(k.datalabels.formatter=N=>vn(N,2,"Kč"),k.datalabels.backgroundColor=k.borderColor||"rgba(33, 150, 243, 0.8)"):q?(k.datalabels.formatter=N=>vn(N,1,"kW"),k.datalabels.backgroundColor=k.borderColor||"rgba(255, 193, 7, 0.8)"):G?(k.datalabels.formatter=N=>vn(N,1,"kWh"),k.datalabels.backgroundColor=k.borderColor||"rgba(120, 144, 156, 0.8)"):(k.datalabels.formatter=N=>vn(N,1),k.datalabels.backgroundColor=k.borderColor||"rgba(33, 150, 243, 0.8)"),k.datalabels.borderRadius=4,k.datalabels.padding={top:3,bottom:3,left:5,right:5}}else k.datalabels.display=!1}e.update("none"),C.debug(`[PricingChart] Detail: ${r.toFixed(1)}h, Labels: ${u?"ON":"OFF"}, Mode: ${t}`)}let ct=class extends z{constructor(){super(...arguments),this.data=null,this.datalabelMode="auto",this.zoomState={start:null,end:null},this.currentDetailLevel="overview",this.chart=null,this.resizeObserver=null}firstUpdated(){this.setupResizeObserver(),this.data&&this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())}updated(e){e.has("data")&&this.data&&(this.chart?this.updateChartData():this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())),e.has("datalabelMode")&&this.chart&&wt(this.chart,this.datalabelMode)}disconnectedCallback(){var e;super.disconnectedCallback(),this.destroyChart(),(e=this.resizeObserver)==null||e.disconnect(),this.resizeObserver=null}zoomToTimeRange(e,t){if(!this.chart){C.warn("[PricingChart] Chart not available for zoom");return}const i=new Date(e),n=new Date(t),r=15*60*1e3,a=i.getTime()-r,o=n.getTime()+r;if(this.zoomState.start!==null&&Math.abs(this.zoomState.start-a)<6e4&&this.zoomState.end!==null&&Math.abs(this.zoomState.end-o)<6e4){C.debug("[PricingChart] Already zoomed to same range → reset"),this.resetZoom();return}try{const s=this.chart.options;s.scales.x.min=a,s.scales.x.max=o,this.chart.update("none"),this.zoomState={start:a,end:o},this.currentDetailLevel=qt(this.chart),wt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-change",{detail:{start:a,end:o,level:this.currentDetailLevel},bubbles:!0,composed:!0})),C.debug("[PricingChart] Zoomed to range",{start:new Date(a).toISOString(),end:new Date(o).toISOString()})}catch(s){C.error("[PricingChart] Zoom error",s)}}resetZoom(){if(!this.chart)return;const e=this.chart.options;delete e.scales.x.min,delete e.scales.x.max,this.chart.update("none"),this.zoomState={start:null,end:null},this.currentDetailLevel=qt(this.chart),wt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-reset",{bubbles:!0,composed:!0}))}getChart(){return this.chart}createChart(){if(!this.canvas||!this.data||this.data.timeline.length===0)return;this.chart&&this.destroyChart();const e=this.data,t=Ua(e),i=window.innerWidth<520,n={responsive:!0,maintainAspectRatio:!1,animation:{duration:0},interaction:{mode:"index",intersect:!1},plugins:{legend:{labels:{color:"#ffffff",font:{size:i?10:11,weight:"500"},padding:i?6:10,usePointStyle:!0,pointStyle:"circle",boxWidth:i?8:12,boxHeight:i?8:12},position:"top"},tooltip:{backgroundColor:"rgba(0,0,0,0.9)",titleColor:"#ffffff",bodyColor:"#ffffff",titleFont:{size:13,weight:"bold"},bodyFont:{size:11},padding:10,cornerRadius:6,displayColors:!0,callbacks:{title:a=>a.length>0?new Date(a[0].parsed.x).toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"",label:a=>{let o=a.dataset.label||"";return o&&(o+=": "),a.parsed.y!==null&&(a.dataset.yAxisID==="y-price"?o+=a.parsed.y.toFixed(2)+" Kč/kWh":a.dataset.yAxisID==="y-solar"?o+=a.parsed.y.toFixed(2)+" kWh":a.dataset.yAxisID==="y-power"?o+=a.parsed.y.toFixed(2)+" kW":o+=a.parsed.y),o}}},datalabels:{display:!1},zoom:{zoom:{wheel:{enabled:!0,modifierKey:null},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)",borderColor:"rgba(33, 150, 243, 0.8)",borderWidth:2},pinch:{enabled:!0},mode:"x",onZoomComplete:({chart:a})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=qt(a),wt(a,this.datalabelMode)}},pan:{enabled:!0,mode:"x",modifierKey:"shift",onPanComplete:({chart:a})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=qt(a),wt(a,this.datalabelMode)}},limits:{x:{minRange:36e5}}},pricingModeIcons:null},scales:{x:{type:"timeseries",time:{unit:"hour",displayFormats:{hour:i?"HH:mm":"dd.MM HH:mm"},tooltipFormat:"dd.MM.yyyy HH:mm"},ticks:{color:this.getTextColor(),maxRotation:i?0:45,minRotation:i?0:45,font:{size:i?10:11},maxTicksLimit:i?6:20},grid:{color:this.getGridColor(),lineWidth:1}},"y-price":{type:"linear",position:"left",ticks:{color:"#2196F3",font:{size:11,weight:"500"},callback:a=>a.toFixed(2)+" Kč"},grid:{color:"rgba(33, 150, 243, 0.15)",lineWidth:1},title:{display:!i,text:"💰 Cena (Kč/kWh)",color:"#2196F3",font:{size:13,weight:"bold"}}},"y-solar":{type:"linear",position:"left",stacked:!0,display:!i,ticks:{color:"#78909C",font:{size:11,weight:"500"},callback:a=>a.toFixed(1)+" kWh",display:!0},grid:{display:!0,color:"rgba(120, 144, 156, 0.15)",lineWidth:1,drawOnChartArea:!0},title:{display:!0,text:"🔋 Kapacita baterie (kWh)",color:"#78909C",font:{size:11,weight:"bold"}},beginAtZero:!1},"y-power":{type:"linear",position:"right",stacked:!0,ticks:{color:"#FFA726",font:{size:11,weight:"500"},callback:a=>a.toFixed(2)+" kW"},grid:{display:!1},title:{display:!i,text:"☀️ Výkon (kW)",color:"#FFA726",font:{size:13,weight:"bold"}}}}};Ga(n);const r={type:"bar",data:{labels:e.labels,datasets:t},plugins:[fo],options:n};try{this.chart=new Gn(this.canvas,r),wt(this.chart,this.datalabelMode),e.initialZoomStart&&e.initialZoomEnd&&requestAnimationFrame(()=>{if(!this.chart)return;const a=this.chart.options;a.scales.x.min=e.initialZoomStart,a.scales.x.max=e.initialZoomEnd,this.chart.update("none"),this.currentDetailLevel=qt(this.chart),wt(this.chart,this.datalabelMode)}),C.info("[PricingChart] Chart created",{datasets:t.length,labels:e.labels.length,segments:e.modeSegments.length})}catch(a){C.error("[PricingChart] Failed to create chart",a)}}updateChartData(){var o;if(!this.chart||!this.data)return;const e=this.data,t=Ua(e),i=((o=this.chart.data.labels)==null?void 0:o.length)!==e.labels.length,n=this.chart.data.datasets.length!==t.length;i&&(this.chart.data.labels=e.labels);let r="none";n?(this.chart.data.datasets=t,r=void 0):t.forEach((s,d)=>{const p=this.chart.data.datasets[d];p&&(p.data=s.data,p.label=s.label,p.backgroundColor=s.backgroundColor,p.borderColor=s.borderColor)});const a=this.chart.options;a.plugins||(a.plugins={}),a.plugins.pricingModeIcons=null,Ga(a),this.chart.update(r),C.debug("[PricingChart] Chart updated incrementally")}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(()=>{var e;(e=this.chart)==null||e.resize()}),this.resizeObserver.observe(this)}getTextColor(){try{return getComputedStyle(this).getPropertyValue("--oig-text-primary").trim()||"#e0e0e0"}catch{return"#e0e0e0"}}getGridColor(){try{return getComputedStyle(this).getPropertyValue("--oig-border").trim()||"rgba(255,255,255,0.1)"}catch{return"rgba(255,255,255,0.1)"}}setDatalabelMode(e){this.datalabelMode=e,this.dispatchEvent(new CustomEvent("datalabel-mode-change",{detail:{mode:e},bubbles:!0,composed:!0}))}get isZoomed(){return this.zoomState.start!==null||this.zoomState.end!==null}renderControls(){const e=t=>{const i=this.datalabelMode===t?"active":"";return t==="always"&&this.datalabelMode==="always"?`control-btn mode-always ${i}`:t==="never"&&this.datalabelMode==="never"?`control-btn mode-never ${i}`:`control-btn ${i}`};return c`
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
      background: ${ot(l.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${ot(l.cardShadow)};
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
      color: ${ot(l.textPrimary)};
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
      color: ${ot(l.textSecondary)};
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .control-btn:hover {
      background: ${ot(l.accent)};
      color: #fff;
    }

    .control-btn.active {
      background: ${ot(l.accent)};
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
      color: ${ot(l.textSecondary)};
      font-size: 14px;
    }

    .chart-hint {
      font-size: 10px;
      color: ${ot(l.textSecondary)};
      opacity: 0.7;
      margin-top: 6px;
      text-align: center;
    }
  `;gi([g({type:Object})],ct.prototype,"data",2);gi([g({type:String})],ct.prototype,"datalabelMode",2);gi([T()],ct.prototype,"zoomState",2);gi([T()],ct.prototype,"currentDetailLevel",2);gi([Un("#pricing-canvas")],ct.prototype,"canvas",2);ct=gi([E("oig-pricing-chart")],ct);const bi="—";function ri(e){return e==null||!Number.isFinite(e)?bi:`${e.toFixed(1)} °C`}function os(e){return e==null||!Number.isFinite(e)?bi:`${e.toFixed(2)} kWh`}function $h(e){return e==null||!Number.isFinite(e)?bi:`${e.toFixed(2)} Kč`}function kh(e){return e==null||!Number.isFinite(e)?bi:`${Math.round(e*100)} %`}function Sh(e,t){const i=n=>{const r=new Date(n);return Number.isNaN(r.getTime())?n:`${String(r.getHours()).padStart(2,"0")}:${String(r.getMinutes()).padStart(2,"0")}`};return`${i(e)} – ${i(t)}`}function Ch(e){return e==null||!Number.isFinite(e)?bi:e<60?`${Math.round(e)} s`:e<3600?`${Math.round(e/60)} min`:`${Math.round(e/3600)} h`}function Ph(e){if(e==null||!Number.isFinite(e)||e<0)return bi;const t=Math.floor(e/60),i=Math.round(e%60);return t===0?`${i} min`:i===0?`${t} h`:`${t} h ${i} min`}function Th(e){const t=e.topTempC;if(t==null||!Number.isFinite(t))return null;if(e.targetTempC<=t)return 0;const i=e.targetTempC-t;return e.temperatureTrendCPerMin!=null&&Number.isFinite(e.temperatureTrendCPerMin)&&e.temperatureTrendCPerMin>0?i/e.temperatureTrendCPerMin:e.heaterPowerKw!==null&&Number.isFinite(e.heaterPowerKw)&&e.volumeL!=null&&Number.isFinite(e.volumeL)?e.heaterPowerKw===0?null:e.volumeL*.001163*i/e.heaterPowerKw*60:null}var Mh=Object.defineProperty,Dh=Object.getOwnPropertyDescriptor,I=(e,t,i,n)=>{for(var r=n>1?void 0:n?Dh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Mh(t,i,r),r};const F=Z,ft=D`
  background: ${F(l.cardBg)};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${F(l.cardShadow)};
`,tt=D`
  font-size: 15px;
  font-weight: 600;
  color: ${F(l.textPrimary)};
  margin: 0 0 12px 0;
`;function zh(e){return Math.max(0,Math.min(100,e))}function Ya(e){const n=Math.max(0,Math.min(1,(e-10)/60)),r={r:33,g:150,b:243},a={r:255,g:87,b:34},o=(s,d)=>Math.round(s+(d-s)*n);return`rgb(${o(r.r,a.r)}, ${o(r.g,a.g)}, ${o(r.b,a.b)})`}let Ri=class extends z{constructor(){super(...arguments),this.collapsed=!0,this.busy=!1}toggle(){this.collapsed=!this.collapsed}async doAction(e,t){this.busy=!0;try{const i=await e();this.dispatchEvent(new CustomEvent("action-done",{detail:{success:i,label:t},bubbles:!0,composed:!0}))}finally{this.busy=!1}}render(){return c`
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
              @click=${()=>this.doAction(xc,"plan")}>
              Preplanovat (debug)
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(wc,"apply")}>
              Aplikovat rucne
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(_c,"cancel")}>
              Zrusit plan
            </button>
          </div>
        </div>
      </div>
    `}};Ri.styles=D`
    :host { display: block; }

    .panel {
      ${ft};
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
      color: ${F(l.textPrimary)};
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
      color: ${F(l.textSecondary)};
    }

    .info-bubble .tooltip {
      display: none;
      position: absolute;
      left: 0;
      top: 24px;
      width: 280px;
      padding: 10px;
      background: ${F(l.cardBg)};
      border: 1px solid ${F(l.divider)};
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      font-size: 11px;
      line-height: 1.5;
      color: ${F(l.textSecondary)};
      z-index: 100;
      white-space: normal;
    }

    .info-bubble:hover .tooltip { display: block; }

    .toggle-icon {
      font-size: 18px;
      font-weight: bold;
      color: ${F(l.textSecondary)};
      transition: transform 0.2s;
    }

    .panel-content {
      display: none;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid ${F(l.divider)};
    }

    .panel-content.open { display: block; }

    .section-label {
      font-size: 12px;
      font-weight: 600;
      color: ${F(l.textSecondary)};
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
      border: 1px solid ${F(l.divider)};
      border-radius: 8px;
      background: ${F(l.bgSecondary)};
      color: ${F(l.textPrimary)};
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      white-space: nowrap;
    }

    .action-btn:hover { background: ${F(l.divider)}; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `;I([T()],Ri.prototype,"collapsed",2);I([T()],Ri.prototype,"busy",2);Ri=I([E("oig-boiler-debug-panel")],Ri);let En=class extends z{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return c`<div>Nacitani stavu...</div>`;const t=(i,n,r=1)=>i!=null?`${i.toFixed(r)} ${n}`:`-- ${n}`;return c`
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
        `:_}
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
    `}};En.styles=D`
    :host { display: block; }

    h3 { ${tt}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .card {
      ${ft};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${F(l.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 18px;
      font-weight: 600;
      color: ${F(l.textPrimary)};
    }

    .card-value.small {
      font-size: 13px;
      font-weight: 500;
    }
  `;I([g({type:Object})],En.prototype,"data",2);En=I([E("oig-boiler-status-grid")],En);let On=class extends z{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return _;const t=i=>`${i.toFixed(2)} kWh`;return c`
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
    `}};On.styles=D`
    :host { display: block; }

    h3 { ${tt}; }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .card {
      ${ft};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${F(l.textSecondary)};
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
      background: ${F(l.bgSecondary)};
    }

    .ratio-fve { background: #4CAF50; }
    .ratio-grid { background: #FF9800; }
    .ratio-alt { background: #2196F3; }

    .ratio-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 11px;
      color: ${F(l.textSecondary)};
    }
  `;I([g({type:Object})],On.prototype,"data",2);On=I([E("oig-boiler-energy-breakdown")],On);let Ln=class extends z{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return _;const t=e.peakHours.length?e.peakHours.map(r=>`${r}h`).join(", "):"--",i=e.waterLiters40c!==null?`${e.waterLiters40c.toFixed(0)} L`:"-- L",n=e.circulationNow.startsWith("ANO");return c`
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
    `}};Ln.styles=D`
    :host { display: block; }

    h3 { ${tt}; }

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
      border-bottom: 1px solid ${F(l.divider)};
      font-size: 13px;
    }

    .item:last-child { border-bottom: none; }

    .label { color: ${F(l.textSecondary)}; }

    .value {
      font-weight: 600;
      color: ${F(l.textPrimary)};
    }

    .value.active { color: #4CAF50; }
    .value.idle { color: ${F(l.textSecondary)}; }
  `;I([g({type:Object})],Ln.prototype,"data",2);Ln=I([E("oig-boiler-predicted-usage")],Ln);let Hi=class extends z{constructor(){super(...arguments),this.plan=null,this.forecastWindows={fve:"--",grid:"--"}}render(){var n;const e=this.plan,t=this.forecastWindows,i=r=>r??"--";return c`
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

    h3 { ${tt}; }

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
      border-bottom: 1px solid ${F(l.divider)};
      font-size: 13px;
    }

    .row:last-child { border-bottom: none; }

    .row-label { color: ${F(l.textSecondary)}; }
    .row-value {
      font-weight: 500;
      color: ${F(l.textPrimary)};
      text-align: right;
      max-width: 60%;
      word-break: break-word;
    }
  `;I([g({type:Object})],Hi.prototype,"plan",2);I([g({type:Object})],Hi.prototype,"forecastWindows",2);Hi=I([E("oig-boiler-plan-info")],Hi);let Wi=class extends z{constructor(){super(...arguments),this.boilerState=null,this.targetTemp=60}render(){const e=this.boilerState;if(!e)return c`<div>Nacitani...</div>`;const t=10,i=70,n=f=>zh((f-t)/(i-t)*100),r=e.heatingPercent??0,a=e.tempTop!==null?n(e.tempTop):null,o=e.tempBottom!==null?n(e.tempBottom):null,s=n(this.targetTemp),d=Ya(e.tempTop??this.targetTemp),p=Ya(e.tempBottom??10),u=`linear-gradient(180deg, ${d} 0%, ${p} 100%)`,h=e.heatingPercent!==null?`${e.heatingPercent.toFixed(0)}% nahrato`:"-- % nahrato";return c`
      <h3>Vizualizace bojleru</h3>

      <div class="tank-wrapper">
        <div class="temp-scale">
          ${[70,60,50,40,30,20,10].map(f=>c`<span>${f}°C</span>`)}
        </div>

        <div class="tank">
          <div class="water" style="height:${r}%; background:${u}"></div>

          <div class="target-line" style="bottom:${s}%">
            <span class="target-label">Cil</span>
          </div>

          ${a!==null?c`
            <div class="sensor top" style="bottom:${a}%">
              <span class="sensor-label">${e.tempTop.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:_}

          ${o!==null?c`
            <div class="sensor bottom" style="bottom:${o}%">
              <span class="sensor-label">${e.tempBottom.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:_}
        </div>
      </div>

      <div class="grade-label">${h}</div>
    `}};Wi.styles=D`
    :host { display: block; }

    h3 { ${tt}; }

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
      color: ${F(l.textSecondary)};
      text-align: right;
      padding: 2px 0;
    }

    /* Tank body */
    .tank {
      flex: 1;
      position: relative;
      border: 2px solid ${F(l.divider)};
      border-radius: 12px;
      overflow: hidden;
      background: ${F(l.bgSecondary)};
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
      border-top: 2px dashed ${F(l.accent)};
      z-index: 3;
    }

    .target-label {
      position: absolute;
      right: 4px;
      top: -14px;
      font-size: 9px;
      color: ${F(l.accent)};
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
      color: ${F(l.textPrimary)};
    }
  `;I([g({type:Object})],Wi.prototype,"boilerState",2);I([g({type:Number})],Wi.prototype,"targetTemp",2);Wi=I([E("oig-boiler-tank")],Wi);let Vi=class extends z{constructor(){super(...arguments),this.current="",this.available=[]}onChange(e){const t=e.target.value;this.dispatchEvent(new CustomEvent("category-change",{detail:{category:t},bubbles:!0,composed:!0}))}render(){const e=this.available.length?this.available:Object.keys(zr);return c`
      <div class="row">
        <label>Profil:</label>
        <select @change=${this.onChange}>
          ${e.map(t=>c`
            <option value=${t} ?selected=${t===this.current}>
              ${zr[t]||t}
            </option>
          `)}
        </select>
      </div>
    `}};Vi.styles=D`
    :host { display: block; margin: 12px 0; }

    .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    label {
      font-size: 13px;
      font-weight: 600;
      color: ${F(l.textPrimary)};
    }

    select {
      padding: 6px 10px;
      font-size: 13px;
      border: 1px solid ${F(l.divider)};
      border-radius: 6px;
      background: ${F(l.cardBg)};
      color: ${F(l.textPrimary)};
      cursor: pointer;
    }
  `;I([g({type:String})],Vi.prototype,"current",2);I([g({type:Array})],Vi.prototype,"available",2);Vi=I([E("oig-boiler-category-select")],Vi);let An=class extends z{constructor(){super(...arguments),this.data=[]}render(){if(!this.data.length)return _;const e=this.data.flatMap(o=>o.hours),t=Math.max(...e,.1),i=t*.3,n=t*.7,r=Array.from({length:24},(o,s)=>s),a=o=>o===0?"none":o<i?"low":o<n?"medium":"high";return c`
      <h3>Mapa spotreby (7 dni)</h3>
      <div class="wrapper">
        <div class="grid">
          <!-- Header row -->
          <div></div>
          ${r.map(o=>c`<div class="hour-header">${o}</div>`)}

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
    `}};An.styles=D`
    :host { display: block; }

    h3 { ${tt}; }

    .wrapper {
      ${ft};
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
      color: ${F(l.textSecondary)};
      text-align: center;
      padding: 2px 0;
    }

    .day-label {
      font-size: 10px;
      font-weight: 600;
      color: ${F(l.textSecondary)};
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

    .cell.none   { background: ${F(l.bgSecondary)}; }
    .cell.low    { background: #c8e6c9; }
    .cell.medium { background: #ff9800; }
    .cell.high   { background: #f44336; }

    .legend {
      display: flex;
      gap: 14px;
      margin-top: 10px;
      font-size: 11px;
      color: ${F(l.textSecondary)};
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
  `;I([g({type:Array})],An.prototype,"data",2);An=I([E("oig-boiler-heatmap-grid")],An);let Fn=class extends z{constructor(){super(...arguments),this.plan=null}render(){const e=this.plan,t=(i,n=2)=>i!=null?i.toFixed(n):"-";return c`
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
    `}};Fn.styles=D`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .card {
      ${ft};
      padding: 14px;
    }

    .card-title {
      font-size: 12px;
      color: ${F(l.textSecondary)};
      margin-bottom: 6px;
    }

    .card-value {
      font-size: 22px;
      font-weight: 700;
    }

    .total { color: ${F(l.textPrimary)}; }
    .fve { color: #4CAF50; }
    .grid-c { color: #FF9800; }
    .cost { color: #2196F3; }
  `;I([g({type:Object})],Fn.prototype,"plan",2);Fn=I([E("oig-boiler-stats-cards")],Fn);let In=class extends z{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return _;const t=Math.max(...e.hourlyAvg,.01),i=new Set(e.peakHours),n=e.peakHours.length?e.peakHours.map(a=>`${a}h`).join(", "):"--",r=e.confidence!==null?`${Math.round(e.confidence*100)} %`:"-- %";return c`
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
    `}};In.styles=D`
    :host { display: block; }

    h3 { ${tt}; }

    .wrapper {
      ${ft};
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
      color: ${F(l.textSecondary)};
      margin-top: 3px;
    }

    /* Stats row */
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid ${F(l.divider)};
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .stat-label { color: ${F(l.textSecondary)}; }
    .stat-value { font-weight: 600; color: ${F(l.textPrimary)}; }
  `;I([g({type:Object})],In.prototype,"data",2);In=I([E("oig-boiler-profiling")],In);let Bn=class extends z{constructor(){super(...arguments),this.config=null}render(){const e=this.config;if(!e)return _;const t=(i,n="")=>i!=null?`${i}${n?" "+n:""}`:`--${n?" "+n:""}`;return c`
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
    `}};Bn.styles=D`
    :host { display: block; }

    h3 { ${tt}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .card {
      ${ft};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${F(l.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 600;
      color: ${F(l.textPrimary)};
    }
  `;I([g({type:Object})],Bn.prototype,"config",2);Bn=I([E("oig-boiler-config-section")],Bn);function Za(e,t){const i=e*t,n=Math.floor(i/60)%24,r=i%60;return`${String(n).padStart(2,"0")}:${String(r).padStart(2,"0")}`}function Eh(e){switch(e){case"morning":return"🌅";case"afternoon":return"☀️";case"evening":return"🌆";case"night":return"🌙";default:return"💧"}}let Ki=class extends z{constructor(){super(...arguments),this.data=null,this.lang="cs"}render(){const e=this.lang,t=v("boiler.demand_map.heading",e);if(!this.data)return c`
        <div class="card" data-testid="boiler-demand-map">
          <div class="heading">💧 ${t}</div>
          <div class="empty-state">${v("boiler.demand_map.empty",e)}</div>
        </div>
      `;const i=this.data,n=i.slotDurationMin||15,r=48,a=Math.ceil(i.slotsP80.length/r),o=[];for(let h=0;h<r;h++){let b=0,f=0;for(let m=0;m<a;m++){const y=h*a+m;b+=i.slotsP80[y]??0,f+=i.slotsP50[y]??0}o.push(b)}const s=Math.max(...o,.001),d=h=>{const b=Math.min(1,h/s);if(b<.08)return"rgba(255,255,255,.05)";const f=Math.round(120+135*b),m=Math.round(60+50*(1-b));return`rgba(${f}, ${m}, 60, ${(.12+.85*b).toFixed(2)})`},p=v("boiler.demand_map.meta",e).replace("{n}",String(i.profile.daysUsed)).replace("{cat}",zr[i.profile.category]||i.profile.label),u=`${v("boiler.demand_map.confidence",e)} ${Math.round(i.confidence*100)} %`;return c`
      <div class="card" data-testid="boiler-demand-map">
        <div class="heading">
          💧 ${t}
          <span class="meta-inline">${p} · ${u}${i.profile.fallbackUsed?c` · <span class="fallback-notice">${v("boiler.demand_map.fallback_notice",e)}</span>`:_}</span>
        </div>

        <div class="heatmap-wrap">
          <div class="heatmap">
            ${o.map((h,b)=>{const f=Za(b*a,n),m=h.toFixed(2);return c`
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
            ${i.windows.slice(0,3).map(h=>{const b=Za(h.slotIndex,n),f=Eh(h.label),m=Math.round(h.liters),y=h.p80Kwh.toFixed(1);return c`
                <span class="chip">
                  ${f}
                  <span class="chip-time">${b}</span>
                  &ge; <b>${m} L</b> (${y} kWh)
                </span>
              `})}
          </div>
        `:_}
      </div>
    `}};Ki.styles=D`
    :host { display: block; }

    .card {
      ${ft};
      padding: 16px;
    }

    .heading {
      ${tt};
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Empty / collecting state */
    .empty-state {
      text-align: center;
      padding: 24px 0;
      color: ${F(l.textSecondary)};
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
      color: ${F(l.textSecondary)};
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
      color: ${F(l.textPrimary)};
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }

    .chip-time {
      font-weight: 700;
      color: ${F(l.accent)};
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
      color: ${F(l.textSecondary)};
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
  `;I([g({attribute:!1})],Ki.prototype,"data",2);I([g({type:String})],Ki.prototype,"lang",2);Ki=I([E("oig-boiler-demand-map")],Ki);let Nn=class extends z{constructor(){super(...arguments),this.state=null}render(){return this.state?c`
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
    `:c`<div>Nacitani...</div>`}};Nn.styles=D`
    :host {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: ${F(l.cardBg)};
      border-radius: 12px;
      box-shadow: ${F(l.cardShadow)};
    }

    .temp-display { text-align: center; }

    .current-temp {
      font-size: 36px;
      font-weight: 600;
      color: ${F(l.textPrimary)};
    }

    .target-temp {
      font-size: 14px;
      color: ${F(l.textSecondary)};
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
      color: ${F(l.textSecondary)};
    }
  `;I([g({type:Object})],Nn.prototype,"state",2);Nn=I([E("oig-boiler-state")],Nn);let jn=class extends z{constructor(){super(...arguments),this.data=[]}render(){return _}};jn.styles=D`
    :host { display: block; }
  `;I([g({type:Array})],jn.prototype,"data",2);jn=I([E("oig-boiler-heatmap")],jn);let qi=class extends z{constructor(){super(...arguments),this.profiles=[],this.editMode=!1}render(){return _}};qi.styles=D`
    :host { display: block; }
  `;I([g({type:Array})],qi.prototype,"profiles",2);I([g({type:Boolean})],qi.prototype,"editMode",2);qi=I([E("oig-boiler-profiles")],qi);let Gi=class extends z{constructor(){super(...arguments),this.data=null,this.lang="cs"}render(){const e=this.data,t=this.lang,i=(e==null?void 0:e.currentState)??"unknown",n=v(`boiler.status.${i}`,t),r=(e==null?void 0:e.comfortSatisfied)===!0?v("boiler.status.comfort_satisfied",t):(e==null?void 0:e.comfortSatisfied)===!1?v("boiler.status.comfort_unsatisfied",t):v("boiler.status.comfort_unknown",t),a=(e==null?void 0:e.comfortSatisfied)===!0?"ok":(e==null?void 0:e.comfortSatisfied)===!1?"bad":"unknown",o=(e==null?void 0:e.degradedFlags)??[];return c`
      <div data-testid="boiler-status-panel" class="panel">
        <div class="row">
          <div class="heading">${v("boiler.status.heading",t)}</div>
          <span data-testid="boiler-status-current-state" class="pill ${i}">${n}</span>
        </div>
        <div class="degraded-banner" ?hidden=${!(e!=null&&e.degraded)}>${v("boiler.status.degraded",t)}</div>
        <div class="grid">
          <div class="field"><label>${v("boiler.status.temp_top",t)}</label><span>${ri((e==null?void 0:e.temperatureTop)??null)}</span></div>
          <div class="field"><label>${v("boiler.status.temp_bottom",t)}</label><span>${ri((e==null?void 0:e.temperatureBottom)??null)}</span></div>
          <div class="field"><label>${v("boiler.status.selected_source",t)}</label><span data-testid="boiler-status-selected-source">${Jt((e==null?void 0:e.selectedSource)??null,t)}</span></div>
          <div class="field"><label>${v("boiler.status.actuated_source",t)}</label><span data-testid="boiler-status-actuated-source">${Jt((e==null?void 0:e.actuatedSource)??null,t)}</span></div>
          <div class="field"><label>${v("boiler.status.energy_needed",t)}</label><span>${os((e==null?void 0:e.energyNeededKwh)??null)}</span></div>
          <div class="field"><label>${v("boiler.status.last_update",t)}</label><span>${(e==null?void 0:e.lastUpdate)??"—"}</span></div>
        </div>
        <div data-testid="boiler-status-comfort" class="comfort ${a}">${r}</div>
        ${o.length?c`<div data-testid="boiler-status-degraded-flags" class="degraded-list">${o.map(s=>c`<span class="degraded-tag">${$n(s,t)}</span>`)}</div>`:""}
      </div>
    `}};Gi.styles=D`
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
  `;I([g({attribute:!1})],Gi.prototype,"data",2);I([g({type:String})],Gi.prototype,"lang",2);Gi=I([E("oig-boiler-status-panel")],Gi);let Ui=class extends z{constructor(){super(...arguments),this.slots=[],this.lang="cs"}srcClass(e){return e&&["fve","grid","alternative","overflow","discharge"].includes(e)?e:"other"}render(){const e=this.lang;return!this.slots||this.slots.length===0?c`<div data-testid="boiler-plan-timeline" class="wrap"><div class="heading">${v("boiler.timeline.heading",e)}</div><div class="empty">${v("boiler.timeline.empty",e)}</div></div>`:c`
      <div data-testid="boiler-plan-timeline" class="wrap">
        <div class="heading">${v("boiler.timeline.heading",e)}</div>
        <table>
          <thead>
            <tr>
              <th>${v("boiler.timeline.col_time",e)}</th>
              <th>${v("boiler.timeline.col_source",e)}</th>
              <th>${v("boiler.timeline.col_temp",e)}</th>
              <th>${v("boiler.timeline.col_kwh",e)}</th>
              <th>${v("boiler.timeline.col_cost",e)}</th>
              <th>${v("boiler.timeline.col_pv",e)}</th>
            </tr>
          </thead>
          <tbody>
            ${this.slots.map(t=>{const i=t.comfortSatisfied===!0?c`<span class="badge ok">${v("boiler.timeline.comfort_ok",e)}</span>`:t.comfortSatisfied===!1?c`<span class="badge bad">${v("boiler.timeline.comfort_gap",e)}</span>`:"";return c`
                <tr>
                  <td>${Sh(t.start,t.end)}</td>
                  <td><span class="src ${this.srcClass(t.recommendedSource)}">${Jt(t.recommendedSource,e)}</span></td>
                  <td>${ri(t.expectedTempTopC??null)} ${i}</td>
                  <td>${os(t.consumptionKwh)}</td>
                  <td>${$h(t.estimatedCostCzk??null)}</td>
                  <td>${kh(t.pvShare??null)}</td>
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
  `;I([g({attribute:!1})],Ui.prototype,"slots",2);I([g({type:String})],Ui.prototype,"lang",2);Ui=I([E("oig-boiler-plan-timeline")],Ui);const Qa=new Set(["input_stale_price","input_stale_pv","input_stale_temperature","input_missing_recorder","input_adapter_error"]);let Yi=class extends z{constructor(){super(...arguments),this.explanation=null,this.lang="cs"}render(){const e=this.explanation,t=this.lang;if(!e)return c`<div data-testid="boiler-source-explanation" class="wrap"><div class="heading">${v("boiler.explanation.heading",t)}</div><div class="empty">${v("boiler.explanation.empty",t)}</div></div>`;const i=e.reasonCodes??[],n=i.filter(o=>Qa.has(o)),r=i.filter(o=>!Qa.has(o)),a=e.degradedReasons??[];return c`
      <div data-testid="boiler-source-explanation" class="wrap">
        <div class="heading">${v("boiler.explanation.heading",t)}</div>

        <div class="section" data-testid="boiler-explanation-freshness">
          <h4>${v("boiler.explanation.freshness_heading",t)}</h4>
          ${n.length===0?c`<div class="chips"><span class="chip fresh">${v("boiler.explanation.freshness_fresh",t)}</span></div>`:c`<div class="chips">${n.map(o=>c`<span class="chip stale">${$n(o,t)}</span>`)}</div>`}
        </div>

        <div class="section" data-testid="boiler-explanation-degraded">
          <h4>${v("boiler.explanation.degraded_heading",t)}</h4>
          ${a.length===0?c`<div class="empty">—</div>`:c`<div class="chips">${a.map(o=>c`<span class="chip degraded">${$n(o,t)}</span>`)}</div>`}
        </div>

        ${r.length?c`<div class="section" data-testid="boiler-explanation-reasons"><h4>Reason codes</h4><div class="chips">${r.map(o=>c`<span class="chip">${$n(o,t)}</span>`)}</div></div>`:""}

        <div class="meta-grid" data-testid="boiler-explanation-meta">
          ${e.planCreatedAt?c`<div class="meta"><label>${v("boiler.explanation.plan_created",t)}</label><span>${e.planCreatedAt}</span></div>`:""}
          ${e.planValidUntil?c`<div class="meta"><label>${v("boiler.explanation.plan_valid_until",t)}</label><span>${e.planValidUntil}</span></div>`:""}
          ${e.dataAgeSecs!=null?c`<div class="meta"><label>${v("boiler.explanation.data_age",t)}</label><span>${Ch(e.dataAgeSecs)}</span></div>`:""}
          ${e.unsatisfiedComfortGapC!=null?c`<div class="meta"><label>${v("boiler.explanation.unsatisfied_gap",t)}</label><span>${e.unsatisfiedComfortGapC} °C</span></div>`:""}
          ${e.temperatureAtDeadlineC!=null?c`<div class="meta"><label>${v("boiler.explanation.temp_at_deadline",t)}</label><span>${ri(e.temperatureAtDeadlineC)}</span></div>`:""}
        </div>
      </div>
    `}};Yi.styles=D`
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
  `;I([g({attribute:!1})],Yi.prototype,"explanation",2);I([g({type:String})],Yi.prototype,"lang",2);Yi=I([E("oig-boiler-source-explanation")],Yi);let ai=class extends z{constructor(){super(...arguments),this.identity={entryId:null,boxId:null,available:!1},this.currentOverride=null,this.lang="cs"}render(){var a,o;const e=this.lang,t=this.identity.available,i=((a=this.currentOverride)==null?void 0:a.capabilityAvailable)??!1,n=t&&i,r=((o=this.currentOverride)==null?void 0:o.active)===!0;return c`
      <div data-testid="boiler-override-panel" class="wrap">
        <div class="heading">${v("boiler.override.heading",e)}</div>
        <div class="subtitle">${v("boiler.override.subtitle",e)}</div>
        ${r?c`<span class="active-badge">${v("boiler.override.active",e)}</span>`:""}
        <div class="notice" ?hidden=${t}>${v("boiler.override.identity_unavailable",e)}</div>
        <div class="notice capability-notice" ?hidden=${!t||i}>${v("boiler.override.capability_unavailable",e)}</div>
        <label>
          ${v("boiler.override.ttl_label",e)}
          <input data-testid="override-ttl-input" type="number" min="15" max="1440" step="15" value="120" ?disabled=${!n} />
        </label>
        <label>
          ${v("boiler.override.reason_label",e)}
          <textarea data-testid="override-reason-input" required ?disabled=${!n}></textarea>
        </label>
        <button data-testid="override-submit-btn" ?disabled=${!n}>${v("boiler.override.submit",e)}</button>
      </div>
    `}};ai.styles=D`
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
  `;I([g({attribute:!1})],ai.prototype,"identity",2);I([g({attribute:!1})],ai.prototype,"currentOverride",2);I([g({type:String})],ai.prototype,"lang",2);ai=I([E("oig-boiler-override-panel")],ai);let oi=class extends z{constructor(){super(...arguments),this.reason="unavailable",this.message="",this.lang="cs"}render(){const e=this.lang,t=this.reason==="loading"?"⏳":this.reason==="error"?"⚠️":this.reason==="degraded"?"🟠":"ℹ️";return c`
      <div data-testid="boiler-unavailable-state" class="wrap">
        <span class="icon">${t}</span>
        <div class="headline loading-notice" ?hidden=${this.reason!=="loading"}>${v("boiler.unavailable.loading",e)}</div>
        <div class="headline error-notice" ?hidden=${this.reason!=="error"}>${v("boiler.unavailable.error",e)}</div>
        <div class="headline degraded-notice" ?hidden=${this.reason!=="degraded"}>${v("boiler.unavailable.degraded",e)}</div>
        <div class="headline unavailable-notice" ?hidden=${this.reason!=="unavailable"}>${v("boiler.unavailable.unavailable",e)}</div>
        ${this.message?c`<div class="message">${this.message}</div>`:""}
      </div>
    `}};oi.styles=D`
    :host { display: block; }
    .wrap { padding: 24px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; }
    .icon { font-size: 1.6rem; }
    .headline { font-size: 1rem; font-weight: 600; }
    .message { color: var(--secondary-text-color, #666); font-size: 0.9rem; }
  `;I([g({type:String})],oi.prototype,"reason",2);I([g({type:String})],oi.prototype,"message",2);I([g({type:String})],oi.prototype,"lang",2);oi=I([E("oig-boiler-unavailable-state")],oi);var Oh=Object.defineProperty,Lh=Object.getOwnPropertyDescriptor,sn=(e,t,i,n)=>{for(var r=n>1?void 0:n?Lh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Oh(t,i,r),r};const Ah=Z;function Rn(e,t){const i={gas:{cs:"🔥 Plyn",en:"🔥 Gas"},heat_pump:{cs:"🔥 Tepelné čerpadlo",en:"🔥 Heat pump"},fireplace:{cs:"🔥 Krb",en:"🔥 Fireplace"},other:{cs:"🔥 Alternativní zdroj",en:"🔥 Alternative source"}};return e&&i[e]?i[e][t]:t==="en"?"🔥 Alternative source":"🔥 Alternativní zdroj"}function Fh(e,t,i){const n=[];return n.push({key:"fve",label:v("boiler.energy_today.source_fve",t),kwh:e.fveKwh,color:"#ffa726",costLabel:e.fveKwh>0?"≈ 0 Kč":null}),n.push({key:"grid",label:v("boiler.energy_today.source_grid",t),kwh:e.gridKwh,color:"#2196f3",costLabel:null}),e.batteryKwh>.05&&n.push({key:"battery",label:v("boiler.energy_today.source_battery",t),kwh:e.batteryKwh,color:"#7e57c2",costLabel:null}),e.altKwh>0&&n.push({key:"alt",label:Rn(i,t),kwh:e.altKwh,color:"#e64a19",costLabel:null}),n}function Ih(e,t){if(!e)return null;const{estimatedCostCzk:i,costIfAllGrid:n}=e;if(i==null||n==null||n<=0)return null;const r=n-i;return r<0?null:`${v("boiler.energy_today.benchmark_savings",t)} ${r.toFixed(1)} Kč`}function Bh(e){return`${e.toFixed(1).replace(".",",")} kWh`}let Et=class extends z{constructor(){super(...arguments),this.energy=null,this.planSummary=null,this.lang="cs",this.altType=null}render(){const e=this.lang,t=v("boiler.energy_today.heading",e),i=v("boiler.energy_today.meta",e),n=this.energy,r=this.planSummary,a=n?Fh(n,e,this.altType):[],o=(n==null?void 0:n.totalKwh)??0,s=o<.1,d=s?[]:a.filter(b=>b.kwh>0).map(b=>({pct:b.kwh/o*100,color:b.color,key:b.key})),p=(r==null?void 0:r.costIfAllGrid)??null,u=p!=null&&p>0?p:null,h=Ih(r,e);return c`
      <div class="card">
        <h2 class="card-header">
          ${t}
          <span class="card-header-meta">${i}</span>
        </h2>

        ${s?c`
          <div class="empty">${v("boiler.energy_today.empty",e)}</div>
        `:c`
          <div class="tiles" data-testid="energy-tiles">
            ${a.map(b=>c`
              <div class="tile" data-source="${b.key}" data-testid="energy-tile-${b.key}">
                <span class="tile-label">${b.label}</span>
                <b class="tile-kwh">${Bh(b.kwh)}</b>
                ${b.costLabel?c`<span class="tile-czk" style="color:#9fe6a8">${b.costLabel}</span>`:_}
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
        `:_}

        ${u!=null||h?c`
          <div class="benchmark" data-testid="benchmark">
            ${u!=null?c`
              <span class="benchmark-text">
                ${v("boiler.energy_today.benchmark_prefix",e)} ${u.toFixed(1)} Kč
                ${h?c`<strong> ${h}</strong>`:_}
              </span>
            `:_}
          </div>
        `:_}
      </div>
    `}};Et.styles=D`
    :host {
      display: block;
    }

    .card {
      background: ${Ah(l.cardBg)};
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
  `;sn([g({type:Object})],Et.prototype,"energy",2);sn([g({type:Object})],Et.prototype,"planSummary",2);sn([g({type:String})],Et.prototype,"lang",2);sn([g({type:String})],Et.prototype,"altType",2);Et=sn([E("oig-boiler-energy-today")],Et);var Nh=Object.defineProperty,jh=Object.getOwnPropertyDescriptor,mt=(e,t,i,n)=>{for(var r=n>1?void 0:n?jh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Nh(t,i,r),r};const Wt=Z,Rh=new Set(["fve","grid","battery","alternative"]);function Hh(e){if(!e)return null;const t=e.toLowerCase();return t==="fve"||t==="overflow"||t==="pv"?"fve":t==="grid"?"grid":t==="battery"||t==="discharge"?"battery":t==="alternative"||t==="alt"?"alternative":null}function Jn(e){const t=new Date(e);return new Date(t.getFullYear(),t.getMonth(),t.getDate(),0,0,0,0).getTime()}function Tt(e,t){const i=Jn(t),n=new Date(e).getTime(),r=24*3600*1e3;return Math.max(0,Math.min(1,(n-i)/r))}function Wh(e,t){const i=[];let n=null;for(const r of e){const a=r.heatingKwh??0;if(a<=0){n&&(i.push(n),n=null);continue}const o=Hh(r.recommendedSource);if(!o||!Rh.has(o)){n&&(i.push(n),n=null);continue}const s=r.purpose==="legionella";n&&n.source===o?(n.xEnd=Tt(r.end,t),n.endIso=r.end,n.heatingKwh+=a,s&&(n.hasLegionella=!0)):(n&&i.push(n),n={xStart:Tt(r.start,t),xEnd:Tt(r.end,t),source:o,hasLegionella:s,heatingKwh:a,startIso:r.start,endIso:r.end})}return n&&i.push(n),i}function Vh(e,t){const i=Date.now(),n=Jn(e),r=24*3600*1e3,a=(i-n)/r;return a<0||a>1?null:a}function Kh(e,t){if(!t||!t.includes(":"))return null;const[i,n]=t.split(":").map(Number);if(!Number.isFinite(i)||!Number.isFinite(n))return null;const r=Jn(e),a=new Date(r);a.setHours(i,n,0,0);let o=a.getTime();const s=24*3600*1e3,d=(o-r)/s;return d<0||d>1.0001?null:Math.min(1,d)}const wr={fve:{gradStart:"#ffd54f",gradEnd:"#ffa726",legendColor:"#ffa726",textColor:"#101a10"},grid:{gradStart:"#4fc3f7",gradEnd:"#2196f3",legendColor:"#2196f3",textColor:"#062033"},battery:{gradStart:"#b39ddb",gradEnd:"#7e57c2",legendColor:"#7e57c2",textColor:"#1c1430"},alternative:{gradStart:"#ff8a65",gradEnd:"#e64a19",legendColor:"#e64a19",textColor:"#2b0d05"}};let Ke=class extends z{constructor(){super(...arguments),this.slots=[],this.demandMap=null,this.circulationRuns=[],this.legionella=null,this.planSummary=null,this.lang="cs",this.altSourceType=null}render(){var m;const e=this.lang;if(!this.slots||this.slots.length===0)return c`
        <div class="card" data-testid="boiler-plan-strip">
          <div class="heading">
            🗓️ ${v("boiler.plan_strip.heading",e)}
            <span class="meta">${v("boiler.plan_strip.meta",e)}</span>
          </div>
          <div class="empty">${v("boiler.plan_strip.empty",e)}</div>
        </div>
      `;const t=this.slots[0].start,i=Wh(this.slots,t),n=this._buildDrawItems(t),r=this._buildTempCurve(t),a=Vh(t),o=((m=this.planSummary)==null?void 0:m.deadlineTime)??null,s=o?o.slice(0,5):null,d=s?Kh(t,o):null,p=this._legionellaStandaloneMarker(t,i),u=new Set(i.map(y=>y.source)),h=n.length>0,b=this.circulationRuns.length>0,f=r.length>1;return c`
      <div class="card" data-testid="boiler-plan-strip">
        <div class="heading">
          🗓️ ${v("boiler.plan_strip.heading",e)}
          <span class="meta">${v("boiler.plan_strip.meta",e)}</span>
        </div>

        <div class="tl" data-testid="plan-strip-tl">
          <!-- Temperature SVG curve -->
          ${f?this._renderTempSvg(r,e):_}

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
          `:_}

          <!-- NOW line -->
          ${a!==null?c`
            <div class="nowl"
              style="left:${(a*100).toFixed(2)}%"
              data-label="${v("boiler.plan_strip.now_label",e)}"
              data-testid="plan-strip-now-line">
            </div>
          `:_}

          <!-- Deadline line -->
          ${d!==null?c`
            <div class="dline"
              style="left:${(d*100).toFixed(2)}%"
              data-label="${v("boiler.plan_strip.deadline_label",e)} ${s}"
              data-testid="plan-strip-deadline-line">
            </div>
          `:_}
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
              ${v("boiler.plan_strip.legend_demands",e)}
            </span>
          `:_}
          ${b?c`
            <span>${v("boiler.plan_strip.legend_circ",e)}</span>
          `:_}
        </div>
      </div>
    `}_renderBand(e,t){const i=wr[e.source]??wr.fve,n=(e.xStart*100).toFixed(2),r=((e.xEnd-e.xStart)*100).toFixed(2),o=(e.xEnd-e.xStart)*100>=6,s=e.hasLegionella?v("boiler.plan_strip.source_legionella",t):this._sourceBandLabel(e.source,t),d=`${s} · ${e.heatingKwh.toFixed(2)} kWh`,p=`plan-band-${e.source}${e.hasLegionella?"-legionella":""}`;return c`
      <div class="band ${e.hasLegionella?"legionella-border":""}"
        style="left:${n}%;width:${r}%;background:linear-gradient(180deg,${i.gradStart},${i.gradEnd});color:${i.textColor}"
        title="${d}"
        data-source="${e.source}"
        data-legionella="${e.hasLegionella}"
        data-testid="${p}">
        ${o?s:_}
      </div>
    `}_renderDraw(e){const t=(e.frac*100).toFixed(2),n=Math.max(2,Math.round(e.heightPct*29));return c`
      <div class="draw"
        style="left:${t}%;width:${.9}%;height:${n}px"
        title="${e.kwh.toFixed(2)} kWh">
      </div>
    `}_renderCircTick(e,t,i){const n=Tt(e.start,t);if(n<0||n>1)return _;const r=(n*100).toFixed(2),o=(Tt(e.end,t)*100).toFixed(2),s=`${v("boiler.plan_strip.circ_tooltip",i)} ${Xa(e.start)}–${Xa(e.end)}`;return c`
      <div class="circ"
        style="left:${r}%"
        title="${s}"
        data-testid="plan-strip-circ"
        data-end-frac="${o}">
        💧
      </div>
    `}_renderTempSvg(e,t){if(e.length<2)return _;const i=960,n=84,r=Math.min(...e.map(u=>u.temp)),o=Math.max(...e.map(u=>u.temp))-r||1,s=u=>u*i,d=u=>n-(u-r)/o*(n-16)-8,p=e.map((u,h)=>`${h===0?"M":"L"}${s(u.frac).toFixed(1)},${d(u.temp).toFixed(1)}`).join(" ");return c`
      <svg class="temp-svg" viewBox="0 0 ${i} ${n}" preserveAspectRatio="none"
        data-testid="plan-strip-temp-svg"
        aria-hidden="true">
        <path d="${p}" fill="none" stroke="#ffca5a" stroke-width="2.5" opacity="0.9"/>
        <text x="6" y="12" fill="#ffca5a" font-size="10" font-family="system-ui,sans-serif">
          ${v("boiler.plan_strip.temp_zone_label",t)}
        </text>
      </svg>
    `}_buildDrawItems(e){const t=this.demandMap;if(!t)return[];const i=t.slotsP80;if(!i||i.length===0)return[];const n=Math.max(...i,.001),r=t.slotDurationMin||15,a=Jn(e);return i.map((o,s)=>{if(o<.05)return null;const p=(a+s*r*60*1e3-a)/(24*3600*1e3);return p<0||p>=1?null:{frac:p,heightPct:o/n,kwh:o}}).filter(o=>o!==null)}_buildTempCurve(e){const t=[];for(const i of this.slots){const n=i.expectedTempTopC??null;if(n==null||!Number.isFinite(n))continue;const r=Tt(i.start,e);t.push({frac:r,temp:n})}return t}_legionellaStandaloneMarker(e,t){const i=this.legionella;if(!(i!=null&&i.scheduledStart))return null;const n=Tt(i.scheduledStart,e);return n<0||n>1||t.some(a=>a.hasLegionella&&n>=a.xStart&&n<=a.xEnd)?null:n}_sourceBandLabel(e,t){switch(e){case"fve":return v("boiler.plan_strip.source_overflow",t);case"grid":return v("boiler.plan_strip.source_grid",t);case"battery":return v("boiler.plan_strip.source_battery",t);case"alternative":return Rn(this.altSourceType,t);default:return e}}_sourceLegendLabel(e,t){switch(e){case"fve":return v("boiler.plan_strip.legend_overflow",t);case"grid":return v("boiler.plan_strip.legend_grid",t);case"battery":return v("boiler.plan_strip.legend_battery",t);case"alternative":return Rn(this.altSourceType,t);default:return e}}};Ke.styles=D`
    :host { display: block; }

    .card {
      background: ${Wt(l.cardBg)};
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: ${Wt(l.cardShadow)};
    }

    .heading {
      font-size: 13px;
      font-weight: 600;
      color: ${Wt(l.textPrimary)};
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
      color: ${Wt(l.textSecondary)};
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
      color: ${Wt(l.textPrimary)};
    }

    /* Legend row */
    .leg {
      display: flex;
      gap: 12px;
      font-size: 10px;
      opacity: 0.85;
      margin-top: 8px;
      flex-wrap: wrap;
      color: ${Wt(l.textPrimary)};
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
  `;mt([g({attribute:!1})],Ke.prototype,"slots",2);mt([g({attribute:!1})],Ke.prototype,"demandMap",2);mt([g({attribute:!1})],Ke.prototype,"circulationRuns",2);mt([g({attribute:!1})],Ke.prototype,"legionella",2);mt([g({attribute:!1})],Ke.prototype,"planSummary",2);mt([g({type:String})],Ke.prototype,"lang",2);mt([g({type:String})],Ke.prototype,"altSourceType",2);Ke=mt([E("oig-boiler-plan-strip")],Ke);function Xa(e){const t=new Date(e);return isNaN(t.getTime())?e:`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`}var qh=Object.defineProperty,Gh=Object.getOwnPropertyDescriptor,Ce=(e,t,i,n)=>{for(var r=n>1?void 0:n?Gh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&qh(t,i,r),r};function Ja(e){if(e==null||!isFinite(e))return"#37474f";const t=[[10,[21,101,192]],[25,[38,198,218]],[40,[255,183,77]],[55,[255,112,67]],[70,[230,74,25]]];if(e<=t[0][0])return xn(t[0][1]);if(e>=t[t.length-1][0])return xn(t[t.length-1][1]);for(let i=1;i<t.length;i++)if(e<=t[i][0]){const[n,r]=t[i-1],[a,o]=t[i],s=(e-n)/(a-n);return xn([Math.round(r[0]+(o[0]-r[0])*s),Math.round(r[1]+(o[1]-r[1])*s),Math.round(r[2]+(o[2]-r[2])*s)])}return xn(t[t.length-1][1])}function xn(e){return`rgb(${e[0]},${e[1]},${e[2]})`}function Uh(e){return e==null||!isFinite(e)||e<=.005||e>=.995?null:(1-e)*100}function Yh(e,t,i,n,r){const a=[v("boiler.aria.svg_summary",r)];a.push(`${v("boiler.status.temp_top",r)}: ${ri(e)}`),a.push(`${v("boiler.status.temp_bottom",r)}: ${ri(t)}`);const o=i?Jt(i,r):v("boiler.aria.source_unknown",r);return a.push(o),n&&a.push(v("boiler.aria.stale",r)),a.join(". ")}let ke=class extends z{constructor(){super(...arguments),this.fillLevelPct=null,this.sourceSegments=[],this.energyMix=null,this.topTempC=null,this.bottomTempC=null,this.lowerZoneTempC=null,this.volumeL=null,this.readyLiters=null,this.etaText=null,this.sourceKey=null,this.stale=!1,this.chargingLabel=null,this.altCharging=!1,this.sourceEstimated=!1,this.lang="cs"}render(){try{return this._renderTank()}catch{return c`
        <div class="bwrap" data-testid="boiler-svg" role="img"
             aria-label="${v("boiler.aria.svg_summary",this.lang)}">
        </div>
      `}}_renderTank(){const e=Yh(this.topTempC,this.bottomTempC,this.sourceKey,this.stale,this.lang),t=this.fillLevelPct??null,i=this.topTempC!=null?`${this.topTempC.toFixed(1)} °C`:"— °C",n=this.bottomTempC??this.lowerZoneTempC??null,r=n!=null?`dole ${n.toFixed(1)} °C`:null,a=this.readyLiters??(t!=null&&this.volumeL!=null?Math.round(t*this.volumeL):null),o=a??null,s=this._renderTrendChip(),d=this.chargingLabel!=null,p=Ja(this.topTempC),u=Ja(n??this.topTempC),h=`linear-gradient(180deg, ${p} 0%, ${u} 100%)`,b=Uh(t),f=this._renderSourceChipBelow();return c`
      <div class="bwrap" data-testid="boiler-svg" role="img" aria-label="${e}">
        <div class="tank">
          <div class="shell">
            <div
              class="thermal"
              data-testid="boiler-thermal-fill"
              style="background:${h};"
            >
              ${d?c`<div class="surf surf--charging"></div>`:_}
              ${b!=null?c`
                <div
                  class="ready-line"
                  data-testid="boiler-ready-line"
                  style="top:${b.toFixed(1)}%;"
                ></div>
              `:_}
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
              <s class="vol-caption">${v("boiler.tank.ready_caption",this.lang)}</s>
            </div>
          `:_}

          ${n!=null?c`
            <div class="tbot" data-testid="boiler-temp-bottom-label">${r}</div>
          `:_}
        </div>

        ${f}

        ${this.etaText!=null?c`
          <div class="eta" data-testid="boiler-eta-chip">${this.etaText}</div>
        `:_}
      </div>
    `}_renderTrendChip(){const e=this.chargingLabel;if(e!=null){const t=this.altCharging?"trend trend--alt":"trend";return c`
        <div class="${t}" data-testid="boiler-trend-chip">${e}</div>
      `}return _}_renderSourceChipBelow(){const e=this.sourceKey;if(e==null)return c`
        <div class="srcchip srcchip--idle" data-testid="boiler-source-chip">
          ${v("boiler.tank.source_idle",this.lang)}
        </div>
      `;const t={fve:v("boiler.tank.source_fve",this.lang),overflow:v("boiler.tank.source_fve",this.lang),grid:v("boiler.tank.source_grid",this.lang),battery:v("boiler.tank.source_battery",this.lang),discharge:v("boiler.tank.source_battery",this.lang),alternative:v("boiler.tank.source_alt",this.lang)},i={fve:"srcchip",overflow:"srcchip",grid:"srcchip srcchip--grid",battery:"srcchip srcchip--battery",discharge:"srcchip srcchip--battery",alternative:"srcchip srcchip--alt"},n=t[e]??Jt(e,this.lang),r=i[e]??"srcchip",a=this.sourceEstimated?c` <small data-testid="boiler-source-estimated">${v("boiler.tank.source_estimated_suffix",this.lang)}</small>`:_;return c`
      <div class="${r}" data-testid="boiler-source-chip">${n}${a}</div>
    `}};ke.styles=D`
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
  `;Ce([g({type:Number})],ke.prototype,"fillLevelPct",2);Ce([g({type:Array})],ke.prototype,"sourceSegments",2);Ce([g({type:Object})],ke.prototype,"energyMix",2);Ce([g({type:Number})],ke.prototype,"topTempC",2);Ce([g({type:Number})],ke.prototype,"bottomTempC",2);Ce([g({type:Number})],ke.prototype,"lowerZoneTempC",2);Ce([g({type:Number})],ke.prototype,"volumeL",2);Ce([g({type:Number})],ke.prototype,"readyLiters",2);Ce([g({type:String})],ke.prototype,"etaText",2);Ce([g({type:String})],ke.prototype,"sourceKey",2);Ce([g({type:Boolean})],ke.prototype,"stale",2);Ce([g({type:String})],ke.prototype,"chargingLabel",2);Ce([g({type:Boolean})],ke.prototype,"altCharging",2);Ce([g({type:Boolean})],ke.prototype,"sourceEstimated",2);Ce([g({type:String})],ke.prototype,"lang",2);ke=Ce([E("oig-boiler-v2-svg")],ke);var Zh=Object.defineProperty,Qh=Object.getOwnPropertyDescriptor,er=(e,t,i,n)=>{for(var r=n>1?void 0:n?Qh(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Zh(t,i,r),r};const eo=Z,_r=new Set(["temperature_unavailable","temperature_stale","activity_stale","source_invalid","runtime_cache_empty","config_profile_unavailable"]);function Xh(e){var t,i,n,r;if((t=e.status)!=null&&t.degraded)return!0;for(const a of((i=e.status)==null?void 0:i.degradedFlags)??[])if(_r.has(a))return!0;for(const a of((n=e.activity)==null?void 0:n.staleFlags)??[])if(_r.has(a))return!0;for(const a of((r=e.explanation)==null?void 0:r.degradedReasons)??[])if(_r.has(a))return!0;return!1}function Jh(e,t,i){var p,u,h;const n=e.activity;if(!n)return null;const r=t.targetTempC??0,a=Th({targetTempC:r,topTempC:((p=e.status)==null?void 0:p.temperatureTop)??null,temperatureTrendCPerMin:n.temperatureTrendCPerMin,volumeL:t.volumeL,heaterPowerKw:t.heaterPowerKw});if(a===null)return v("boiler.eta.unavailable",i);if(a===0)return v("boiler.eta.already_reached",i);const o=`na ${r.toFixed(0)} °C za ~${Ph(a)}`,s=((u=e.planSummary)==null?void 0:u.deadlineTime)??t.deadlineTime,d=((h=e.status)==null?void 0:h.comfortSatisfied)??null;if(s&&s!=="--:--"){const b=s.substring(0,5);return`${o} · ${i==="cs"?"komfort":"comfort"} ${b}${d===!0?" ✓":""}`}return o}let si=class extends z{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs"}render(){try{return this._renderShell()}catch{return c`
        <div class="shell" data-testid="boiler-v2-shell">
          <div class="stale-warning" data-testid="boiler-stale-warning" role="alert">
            ${v("boiler.aria.stale",this.lang)}
          </div>
        </div>
      `}}_renderShell(){var f,m;const e=this.data,t=e?Xh(e):!1,i=(e==null?void 0:e.activity)??null,n=(e==null?void 0:e.status)??null,r=this.config,a=e&&r?Jh(e,r,this.lang):null,s=((f=i==null?void 0:i.state)==null?void 0:f.startsWith("charging_"))??!1?(i==null?void 0:i.source)??null:null,d=(i==null?void 0:i.state)==="charging_alt",p=(()=>{var S;if(!((S=i==null?void 0:i.state)!=null&&S.startsWith("charging_")))return null;const y=d?"🔥 OHŘÍVÁ":"⚡ NABÍJÍ";if(i.temperatureTrendCPerMin!=null){const x=i.temperatureTrendCPerMin>=0?"+":"",$=i.temperatureTrendCPerMin.toLocaleString("cs-CZ",{minimumFractionDigits:1,maximumFractionDigits:1});return`${y} ${x}${$} °C/min`}return y})(),u=((m=e==null?void 0:e.status)==null?void 0:m.lowerZoneTempC)??null,h=(i==null?void 0:i.fillLevelPct)??null,b=h!=null&&(r==null?void 0:r.volumeL)!=null?Math.round(h*r.volumeL):null;return c`
      <div class="shell" data-testid="boiler-v2-shell">
        ${t?c`
              <div class="stale-warning" data-testid="boiler-stale-warning" role="alert">
                ${v("boiler.aria.stale",this.lang)}
              </div>
            `:_}

        <div class="svg-wrapper">
          <oig-boiler-v2-svg
            .fillLevelPct="${h}"
            .sourceSegments="${(e==null?void 0:e.sourceSegments)??[]}"
            .energyMix="${e!=null&&e.energyToday?{fve:e.energyToday.fveKwh,grid:e.energyToday.gridKwh,battery:e.energyToday.batteryKwh,alt:e.energyToday.altKwh,unattributed:e.energyToday.unattributedKwh}:null}"
            .topTempC="${(n==null?void 0:n.temperatureTop)??null}"
            .bottomTempC="${(n==null?void 0:n.temperatureBottom)??null}"
            .lowerZoneTempC="${u}"
            .volumeL="${(r==null?void 0:r.volumeL)??null}"
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
        <span aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">${(n==null?void 0:n.temperatureTop)??""}</span>

        <div class="advanced-slot" data-testid="boiler-advanced-slot">
          <slot name="advanced"></slot>
        </div>
      </div>
    `}};si.styles=D`
    :host {
      display: block;
      font-family: ${eo(l.fontFamily)};
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
      background: ${eo(l.cardBg)};
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
  `;er([g({type:Object})],si.prototype,"data",2);er([g({type:Object})],si.prototype,"config",2);er([g({type:String})],si.prototype,"lang",2);si=er([E("oig-boiler-v2-shell")],si);var eg=Object.defineProperty,tg=Object.getOwnPropertyDescriptor,fi=(e,t,i,n)=>{for(var r=n>1?void 0:n?tg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&eg(t,i,r),r};let dt=class extends z{constructor(){super(...arguments),this.values=[],this.color="#4CAF50",this.sparkWidth=100,this.sparkHeight=30,this.label=""}render(){try{return this._renderSparkline()}catch{return c`<svg
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
      ></svg>`;const i=Math.min(...t),r=Math.max(...t)-i||1,a=2,o=this.sparkHeight-a*2,s=this.sparkWidth,d=e.length,p=e.map((u,h)=>{if(typeof u!="number"||!isFinite(u))return null;const b=d>1?h/(d-1)*s:s/2,f=a+o-(u-i)/r*o;return`${b.toFixed(2)},${f.toFixed(2)}`}).filter(u=>u!==null).join(" ");return c`
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
    `}};dt.styles=D`
    :host {
      display: inline-block;
    }
    svg {
      display: block;
      overflow: visible;
    }
  `;fi([g({type:Array})],dt.prototype,"values",2);fi([g({type:String})],dt.prototype,"color",2);fi([g({type:Number})],dt.prototype,"sparkWidth",2);fi([g({type:Number})],dt.prototype,"sparkHeight",2);fi([g({type:String})],dt.prototype,"label",2);dt=fi([E("oig-boiler-sparkline")],dt);var ig=Object.defineProperty,ng=Object.getOwnPropertyDescriptor,ln=(e,t,i,n)=>{for(var r=n>1?void 0:n?ng(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&ig(t,i,r),r};const wn=Z;function rg(e,t){switch(e){case"fve":case"overflow":return v("boiler.panel.source_overflow",t);case"grid":return v("boiler.panel.source_grid",t);case"battery":return v("boiler.panel.source_battery_short",t);case"alternative":return v("boiler.panel.source_alt",t);default:return e??"—"}}function ag(e){switch(e){case"morning":return"🌅";case"afternoon":return"☀️";case"evening":return"🌆";case"night":return"🌙";default:return"💧"}}function og(e,t){const i=`boiler.demand_map.window.${e}`,n=v(i,t);return n!==i?n.toLowerCase():e}function sg(e){const t=e*15,i=Math.floor(t/60)%24,n=t%60;return`${String(i).padStart(2,"0")}:${String(n).padStart(2,"0")}`}function to(e){const t=new Date(e);return Number.isNaN(t.getTime())?"??:??":`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`}function lg(e,t){const i=Date.now();for(const n of e){const r=new Date(n.start).getTime();if(!Number.isFinite(r)||r<i-6e4)continue;const a=n.heatingKwh??null;if(a!==null&&a<=0)continue;const o=n.recommendedSource;if(!o)continue;const s=new Date(r),d=new Date,p=s.getDate()!==d.getDate()||s.getMonth()!==d.getMonth()||s.getFullYear()!==d.getFullYear(),u=rg(o,t),h=`${String(s.getHours()).padStart(2,"0")}:${String(s.getMinutes()).padStart(2,"0")}`;return{label:u,timeStr:h,isTomorrow:p}}return null}let Ot=class extends z{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs",this.panelType="source"}render(){try{return this.panelType==="source"?this._renderSourcePanel():this._renderComfortPanel()}catch{return c`
        <div class="panel">
          <div class="empty-panel">—</div>
        </div>
      `}}_renderSourcePanel(){var q;const e=this.data,t=this.lang,i=(e==null?void 0:e.energyToday)??null,n=(e==null?void 0:e.planSummary)??null,r=(e==null?void 0:e.activity)??null,a=(e==null?void 0:e.planSlots)??[],o=(n==null?void 0:n.estimatedCostCzk)??null,s=(i==null?void 0:i.totalKwh)??null,d=(i==null?void 0:i.fveKwh)??null,p=(i==null?void 0:i.gridKwh)??null,u=(i==null?void 0:i.altKwh)??null,h=u!=null&&u>0,b=(i==null?void 0:i.unattributedKwh)??null,f=b!=null&&b>.05,m=Rn(e==null?void 0:e.altSourceType,t),y=(i==null?void 0:i.batteryKwh)??null,S=y!=null&&y>0,x=(n==null?void 0:n.costIfAllAlt)??null,$=x!=null&&x>0&&o!=null?x-o:null,P=$!=null&&$>=0?`${$.toFixed(1).replace(".",",")} Kč`:null,A=((q=r==null?void 0:r.state)==null?void 0:q.startsWith("charging_"))??!1?(r==null?void 0:r.source)??null:null,j=(r==null?void 0:r.sourceEstimated)===!0,k=(()=>{switch(A){case"fve":case"overflow":return v("boiler.panel.source_overflow",t);case"grid":return v("boiler.panel.source_grid_short",t);case"discharge":return v("boiler.panel.source_battery_short",t);case"alternative":return v("boiler.panel.source_alt",t);default:return"—"}})(),L=j&&A!=null?`${k} (${v("boiler.tank.source_estimated_suffix",t)})`:k,M=lg(a,t);return c`
      <div class="panel" data-testid="boiler-source-panel">
        <h3 class="panel-title">${v("boiler.panel.source_title",t)}</h3>

        <div class="kv">
          <span>${v("boiler.panel.cost_today",t)}</span>
          <b>${o!=null?`${o.toFixed(1).replace(".",",")} Kč`:"—"}</b>
        </div>

        <div class="kv">
          <span>${v("boiler.panel.energy_today",t)}</span>
          <b>${s!=null?`${s.toFixed(1).replace(".",",")} kWh`:"—"}</b>
        </div>

        <div class="kv">
          <span>${v("boiler.panel.fve_label",t)}</span>
          <b style="color:#ffd479">${d!=null?`${d.toFixed(1).replace(".",",")} kWh`:"—"}</b>
        </div>

        <div class="kv">
          <span>${v("boiler.panel.grid_label",t)}</span>
          <b style="color:#81d4fa">${p!=null?`${p.toFixed(1).replace(".",",")} kWh`:"—"}</b>
        </div>

        ${f?c`
          <div class="kv">
            <span>${v("boiler.panel.unattributed_label",t)}</span>
            <b style="color:#9aa6b2">${b.toFixed(1).replace(".",",")} kWh</b>
          </div>
        `:_}

        ${h||u!=null?c`
          <div class="kv">
            <span>${m}</span>
            <b style="color:#ffab91">${u!=null?`${u.toFixed(1).replace(".",",")} kWh`:"—"}</b>
          </div>
        `:_}

        ${S?c`
          <div class="kv">
            <span>${v("boiler.panel.battery_label",t)}</span>
            <b style="color:#ce93d8">${y.toFixed(1).replace(".",",")} kWh</b>
          </div>
        `:_}

        <div class="kv">
          <span>${v("boiler.panel.savings_label",t)}</span>
          <b style="color:#9fe6a8">${P??"—"}</b>
        </div>

        <div class="kv" data-testid="boiler-current-source-row">
          <span>${v("boiler.panel.current_source",t)}</span>
          <b>${L}</b>
        </div>

        <div class="kv" data-testid="boiler-next-action">
          <span>${v("boiler.panel.next_action",t)}</span>
          <b>${M!=null?M.isTomorrow?c`${M.label} ${v("boiler.panel.tomorrow",t)} ${M.timeStr}`:c`${M.label} ${M.timeStr}`:"—"}</b>
        </div>
      </div>
    `}_renderComfortPanel(){var S,x,$,P,H;const e=this.data,t=this.lang,n=((S=e==null?void 0:e.status)==null?void 0:S.comfortSatisfied)??null,r=(e==null?void 0:e.demandMap)??null,a=((x=r==null?void 0:r.windows)==null?void 0:x.slice(0,3))??[],o=(e==null?void 0:e.planSummary)??null,s=(o==null?void 0:o.deadlineTime)??((($=this.config)==null?void 0:$.deadlineTime)!=="--:--"?(P=this.config)==null?void 0:P.deadlineTime:null)??null,d=((H=this.config)==null?void 0:H.targetTempC)??null,p=(e==null?void 0:e.legionella)??null,u=(()=>{if(!p)return null;if(!p.enabled)return v("boiler.panel.legionella_off",t);if(p.scheduledStart){const k=p.scheduledStart,L=k.includes("T")?to(k):k.substring(0,5);return`${v("boiler.panel.legionella_plan",t)} ${L}`}const A=p.daysSinceLast??null,j=p.intervalDays??null;if(A!==null&&j!==null){const k=j-A;return k<=0?v("boiler.panel.legionella_overdue",t):`${v("boiler.panel.legionella_in",t)} ${k} ${v("boiler.panel.legionella_days",t)}`}return v("boiler.panel.legionella_scheduled",t)})(),h=(e==null?void 0:e.activity)??null,b=(h==null?void 0:h.temperatureTrendCPerMin)??null,f=b!=null?`${b>=0?"+":""}${b.toFixed(1).replace(".",",")} °C/min`:null,m=(e==null?void 0:e.circulationRuns)??[],y=(()=>{if(!m.length)return null;const A=m[0];return`💧 ${to(A.start)} (${v("boiler.panel.circ_before_peak",t)})`})();return c`
      <div class="panel" data-testid="boiler-comfort-panel">
        <h3 class="panel-title">${v("boiler.panel.comfort_title",t)}</h3>

        ${n===!0?c`<span class="okchip" data-testid="boiler-comfort-chip">✓ ${v("boiler.status.comfort_satisfied",t)}</span>`:n===!1?c`<span class="gapcip" data-testid="boiler-comfort-chip">⚠ ${v("boiler.status.comfort_unsatisfied",t)}</span>`:_}

        ${a.map(A=>{const j=ag(A.label),k=og(A.label,t),L=sg(A.slotIndex),M=Math.round(A.liters);return c`
            <div class="kv" data-testid="boiler-demand-window">
              <span>${j} ${k} ${L}</span>
              <b>≥${M} L</b>
            </div>
          `})}

        ${s&&s!=="--:--"?c`
          <div class="kv" data-testid="boiler-deadline-row">
            <span>${v("boiler.panel.deadline_label",t)}</span>
            <b>${s.substring(0,5)}${d!=null?c` · ${d.toFixed(0)} °C`:_}</b>
          </div>
        `:_}

        ${u!=null?c`
          <div class="kv" data-testid="boiler-legionella-row">
            <span>${v("boiler.panel.legionella_label",t)}</span>
            <b>${u}</b>
          </div>
        `:_}

        ${f!=null?c`
          <div class="kv" data-testid="boiler-trend-row">
            <span>${v("boiler.panel.trend_label",t)}</span>
            <b>${f}</b>
          </div>
        `:_}

        ${y!=null?c`
          <div class="kv" data-testid="boiler-circ-row">
            <span>${v("boiler.panel.circ_label",t)}</span>
            <b>${y}</b>
          </div>
        `:c`
          <div class="kv" data-testid="boiler-circ-row">
            <span>${v("boiler.panel.circ_label",t)}</span>
            <b style="opacity:0.5">${v("boiler.panel.circ_off",t)}</b>
          </div>
        `}
      </div>
    `}};Ot.styles=D`
    :host {
      display: block;
      font-family: ${wn(l.fontFamily)};
    }

    /* ── Side panel wrapper ── */
    :host { height: 100%; }

    .panel {
      background: ${wn(l.cardBg)};
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
      color: ${wn(l.textPrimary)};
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
      color: ${wn(l.textSecondary)};
      font-size: 12px;
      font-style: italic;
      padding: 4px 0;
    }
  `;ln([g({type:Object})],Ot.prototype,"data",2);ln([g({type:Object})],Ot.prototype,"config",2);ln([g({type:String})],Ot.prototype,"lang",2);ln([g({type:String})],Ot.prototype,"panelType",2);Ot=ln([E("oig-boiler-metric-panel")],Ot);var cg=Object.defineProperty,dg=Object.getOwnPropertyDescriptor,mi=(e,t,i,n)=>{for(var r=n>1?void 0:n?dg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&cg(t,i,r),r};const $r=Z,Li=1e3,Gt=200,io=20,kr=80,_t=3,Ze=100,St=1440;function pg(e){return e??Date.now()}function ug(e,t){var a,o;const i=new Intl.DateTimeFormat("en-US",{timeZone:t,hour:"numeric",minute:"2-digit",hour12:!1}).formatToParts(new Date(e)),n=parseInt(((a=i.find(s=>s.type==="hour"))==null?void 0:a.value)??"0",10)%24,r=parseInt(((o=i.find(s=>s.type==="minute"))==null?void 0:o.value)??"0",10);return n*60+r}function hg(e,t){const i=new Intl.DateTimeFormat("en-US",{timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}).formatToParts(new Date(e)),n=x=>{var $;return(($=i.find(P=>P.type===x))==null?void 0:$.value)??"00"},r=n("year"),a=n("month"),o=n("day"),s=parseInt(n("hour"),10)%24,d=n("minute"),p=n("second"),u=String(s).padStart(2,"0"),h=Date.UTC(parseInt(r),parseInt(a)-1,parseInt(o),s,parseInt(d),parseInt(p)),b=Math.round((h-e)/6e4),f=b>=0?"+":"-",m=Math.abs(b),y=String(Math.floor(m/60)).padStart(2,"0"),S=String(m%60).padStart(2,"0");return`${r}-${a}-${o}T${u}:${d}:${p}${f}${y}:${S}`}function Qe(e){return e/St*Li}function Vt(e){return String(parseFloat(e.toFixed(3)))}function Sr(e){const t=Math.max(io,Math.min(kr,e));return(kr-t)/(kr-io)*Gt}function gg(e,t){const i=ug(e,t);return e-i*6e4}function bg(e){if(e.length<=1)return e;const t=[];let i={...e[0]};for(let n=1;n<e.length;n++){const r=e[n],a=i.recommendedSource===r.recommendedSource,o=(i.heatingKwh!=null?i.heatingKwh>0:!1)==(r.heatingKwh!=null?r.heatingKwh>0:!1),s=i.end===r.start;a&&o&&s?i={...i,end:r.end}:(t.push(i),i={...r})}return t.push(i),t}function no(e,t,i){let n=null,r=-1/0;for(const a of t){const o=Date.parse(a.start);if(!isFinite(o))continue;const s=a.end!==null?Date.parse(a.end):i;isFinite(s)&&o<=e&&e<=s&&o>r&&(r=o,n=a)}return n}function ro(e,t){const i=Date.parse(e.start),n=e.end!==null?Date.parse(e.end):t;if(!isFinite(i)||!isFinite(n))return null;const r=(n-i)/36e5;return r<=0||!isFinite(r)||!isFinite(e.energyKwh)||e.energyKwh<0?null:e.energyKwh/r}function fg(e,t,i,n,r){const a=[v("boiler.aria.plan_timeline",r)];a.push(`NOW: ${e}`),t&&a.push(`${v("boiler.config.deadline",r)}: ${t}`),i!=null&&a.push(`${v("boiler.config.goal_temp",r)}: ${i}°C`);const o=[...new Set(n.filter(Boolean))];return o.length>0&&a.push(o.map(s=>Jt(s,r)).join(", ")),a.join(". ")}let pt=class extends z{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs",this.nowMs=null,this.timeZone=null}render(){try{return this._renderTimeline()}catch{return c`
        <div class="timeline-section">
          <div class="empty-timeline" data-testid="boiler-timeline">${v("boiler.timeline.empty",this.lang)}</div>
        </div>
      `}}_resolveTimeZone(){if(this.timeZone)return this.timeZone;try{return Intl.DateTimeFormat().resolvedOptions().timeZone}catch{return"Europe/Prague"}}_renderTimeline(){var _e;const e=pg(this.nowMs??void 0),t=this._resolveTimeZone();let i;try{i=gg(e,t)}catch{i=e-e%864e5}const n=(e-i)/6e4,r=Qe(n);let a="";try{a=hg(e,t)}catch{a=new Date(e).toISOString()}const o=this.config,s=o!=null&&o.deadlineTime&&o.deadlineTime!=="--:--"?o.deadlineTime:null;let d=null;if(s)try{const[w,X]=s.split(":"),se=parseInt(w,10)*60+parseInt(X,10);d=Qe(se)}catch{d=null}const p=(o==null?void 0:o.targetTempC)!=null&&isFinite(o.targetTempC)?o.targetTempC:60,u=Sr(p),h=this.data,b=Array.isArray(h==null?void 0:h.planSlots)?h.planSlots:[],f=Array.isArray(h==null?void 0:h.timeline)?h.timeline:[],m=Array.isArray(h==null?void 0:h.sourceSegments)?h.sourceSegments:[],y=b.length>0&&b.every(w=>(w.heatingKwh??0)===0&&(w.pvKwh??0)===0&&(w.gridKwh??0)===0&&(w.altKwh??0)===0),S=this._buildPlanBands(b,i),x=this._buildTempPointsFromSlots(b,i),$=this._buildTempPointsFromTimeline(f,i),P=x.length>0?x:$,H=this._buildPowerBarsFromSlots(b,i),A=this._buildPowerBars(f,m,i,e),j=S.map(w=>w.source);let k="";try{k=fg(a,s,p,j,this.lang)}catch{k=v("boiler.aria.plan_timeline",this.lang)}const L=P.length>=2?P.map(w=>`${w.x.toFixed(2)},${w.y.toFixed(2)}`).join(" "):null,M=b.reduce((w,X)=>w+(X.gridKwh??0),0),q=b.reduce((w,X)=>w+(X.pvKwh??0)+(X.altKwh??0),0),G=b.reduce((w,X)=>w+(X.estimatedCostCzk??0),0),N=M+q,W=((_e=h==null?void 0:h.status)==null?void 0:_e.degradedFlags)??[],Pe=W.includes("price_degraded"),Re=W.includes("forecast_degraded"),te=["00","03","06","09","12","15","18","21","24"];return c`
      <div class="timeline-section">
        <div class="timeline-header">
          <h3>📅 24h plán: teplota, výkon &amp; zdroje</h3>
          ${b.length>0?c`
            <div class="timeline-summary">
              Dnes: <strong>${M.toFixed(1)} kWh</strong> ze sítě
              · <strong style="color:#f5b800">${q.toFixed(1)} kWh</strong> z FVE/přetoku
              ${G>0?c` · <strong>~${G.toFixed(2)} Kč</strong>`:""}
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
              viewBox="0 0 ${Li} ${Gt}"
              role="img"
              aria-label="${k}"
              data-testid="boiler-timeline"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              ${Q`<rect x="0" y="0" width="${Li}" height="${Gt}" fill="transparent" />`}

              ${S.map(w=>{const X=w.source?tc[w.source]??"#9E9E9E":"#9E9E9E",se=w.x2-w.x1;return Q`<rect
                  class="plan-band"
                  data-source="${w.source??"unknown"}"
                  x="${w.x1.toFixed(2)}"
                  y="0"
                  width="${se.toFixed(2)}"
                  height="${Gt}"
                  fill="${X}"
                />`})}

              ${Q`<line x1="0" y1="${Ze}" x2="${Li}" y2="${Ze}" stroke="rgba(255,255,255,.08)" stroke-width="1"/>`}

              ${Q`<line
                class="goal-line"
                x1="0" y1="${u.toFixed(2)}"
                x2="${Li}" y2="${u.toFixed(2)}"
              />`}
              ${Q`<text x="4" y="${(u-3).toFixed(2)}" font-size="8" fill="#4ade80">CÍL ${p}°C</text>`}

              ${d!=null&&s!=null?Q`
                <line class="deadline-marker"
                  data-testid="boiler-deadline-marker"
                  data-deadline-time="${s}"
                  data-deadline-x="${Vt(d)}"
                  x1="${Vt(d)}" y1="0"
                  x2="${Vt(d)}" y2="${Gt}"
                />
                <text x="${(d+3).toFixed(2)}" y="12" font-size="8" fill="#E65100">${s}</text>
              `:""}

              ${H.map(w=>{if(w.isCharge){const X=Ze-w.barH;return Q`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    x="${(w.x-2).toFixed(2)}" y="${X.toFixed(2)}" width="4" height="${w.barH.toFixed(2)}"/>`}else return Q`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    x="${(w.x-2).toFixed(2)}" y="${Ze}" width="4" height="${w.barH.toFixed(2)}"/>`})}

              ${A.map(w=>{if(w.isCharge){const X=Ze-w.barH;return Q`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    data-estimated-power="${w.isEstimated?"true":"false"}"
                    x="${(w.x-2).toFixed(2)}" y="${X.toFixed(2)}" width="4" height="${w.barH.toFixed(2)}"/>`}else return Q`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    data-estimated-power="${w.isEstimated?"true":"false"}"
                    x="${(w.x-2).toFixed(2)}" y="${Ze}" width="4" height="${w.barH.toFixed(2)}"/>`})}

              ${f.map(w=>{let X;try{X=Date.parse(w.timestamp)}catch{return""}if(!isFinite(X))return"";const se=(X-i)/6e4;if(se<0||se>St||w.powerKw!==null)return"";const vt=no(X,m,e),Le=vt?ro(vt,e):null;if(Le!==null&&Le>0)return"";const Ge=Qe(se);return Q`<rect
                  class="placeholder-bar"
                  data-testid="boiler-power-placeholder"
                  data-estimated-power="true"
                  x="${(Ge-2).toFixed(2)}" y="99" width="4" height="2"
                />`})}

              ${L!=null?Q`<polyline class="temp-line" points="${L}" />`:""}

              ${Q`<line
                class="now-marker"
                data-testid="boiler-now-marker"
                data-now-time="${a}"
                data-now-x="${Vt(r)}"
                x1="${Vt(r)}" y1="0"
                x2="${Vt(r)}" y2="${Gt}"
              />`}
              ${Q`<text x="${(r+3).toFixed(2)}" y="12" font-size="8" fill="#60a5fa">TEĎ</text>`}
            </svg>
          </div>

          <div class="timeline-axis">
            ${te.map(w=>c`<span>${w}</span>`)}
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
            ${Re?c`<span class="degraded-chip">⚠ FVE predikce: stará data</span>`:""}
          </div>
        </div>
      </div>
    `}_buildTempPointsFromTimeline(e,t){const i=[],n=t+St*6e4;for(const r of e)try{if(r.topTempC==null||!isFinite(r.topTempC))continue;const a=Date.parse(r.timestamp);if(!isFinite(a)||a<t||a>n)continue;const o=(a-t)/6e4;i.push({x:Qe(o),y:Sr(r.topTempC)})}catch{continue}return i}_buildTempPointsFromSlots(e,t){const i=[],n=t+St*6e4;for(const r of e)try{const a=r.expectedTempTopC;if(a==null||!isFinite(a))continue;const o=Date.parse(r.start);if(!isFinite(o)||o<t||o>n)continue;const s=(o-t)/6e4;i.push({x:Qe(s),y:Sr(a)})}catch{continue}return i}_buildPowerBarsFromSlots(e,t){const i=[],n=t+St*6e4;for(let r=0;r<e.length;r++){const a=e[r];try{const o=Date.parse(a.start);if(!isFinite(o)||o<t||o>n)continue;const s=(o-t)/6e4,d=Qe(s),p=(a.pvKwh??0)+(a.gridKwh??0)+(a.altKwh??0);if(p<=0)continue;const u=p*4,b=Math.min(u,_t)/_t*Ze;i.push({x:d,barH:b,isCharge:!0,isEstimated:!1})}catch{continue}}return i}_buildPlanBands(e,t){if(!e.length)return[];const i=[],n=t+St*6e4,r=[];for(const o of e)try{const s=Date.parse(o.start),d=Date.parse(o.end);if(!isFinite(s)||!isFinite(d)||d<=t||s>=n)continue;const p=Math.max(s,t),u=Math.min(d,n);if(u<=p)continue;r.push({...o,start:new Date(p).toISOString(),end:new Date(u).toISOString()})}catch{continue}const a=bg(r);for(const o of a)try{const s=Date.parse(o.start),d=Date.parse(o.end);if(!isFinite(s)||!isFinite(d))continue;const p=Qe((s-t)/6e4),u=Qe((d-t)/6e4);if(u<=p)continue;i.push({x1:p,x2:u,source:o.recommendedSource,heating:(o.heatingKwh??0)>0})}catch{continue}return i}_buildPowerBars(e,t,i,n){const r=[],a=i+St*6e4;for(const o of e)try{const s=Date.parse(o.timestamp);if(!isFinite(s)||s<i||s>a)continue;const d=(s-i)/6e4,p=Qe(d);if(o.powerKw!==null&&isFinite(o.powerKw)){const u=Math.max(-_t,Math.min(_t,o.powerKw));if(Math.abs(u)<.001)continue;const h=Math.abs(u)/_t*Ze;r.push({x:p,barH:h,isCharge:u>0,isEstimated:!1})}else{const u=no(s,t,n);if(u!==null){const h=ro(u,n);if(h!==null&&h>0){const b=u.key==="discharge",m=Math.min(h,_t)/_t*Ze;r.push({x:p,barH:m,isCharge:!b,isEstimated:!0})}}}}catch{continue}return r}};pt.styles=D`
    :host {
      display: block;
      font-family: ${$r(l.fontFamily)};
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
      color: ${$r(l.textPrimary)};
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
      color: ${$r(l.textSecondary)};
      font-style: italic;
    }

    @media (max-width: 599px) {
      :host { font-size: 12px; }
    }
  `;mi([g({type:Object})],pt.prototype,"data",2);mi([g({type:Object})],pt.prototype,"config",2);mi([g({type:String})],pt.prototype,"lang",2);mi([g({type:Number})],pt.prototype,"nowMs",2);mi([g({type:String})],pt.prototype,"timeZone",2);pt=mi([E("oig-boiler-timeline-chart")],pt);var mg=Object.defineProperty,yg=Object.getOwnPropertyDescriptor,we=(e,t,i,n)=>{for(var r=n>1?void 0:n?yg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&mg(t,i,r),r};const $t=Z,tr=D`
  .selector-label {
    font-size: 12px;
    color: ${$t(l.textSecondary)};
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
    border: 2px solid ${$t(l.divider)};
    background: ${$t(l.bgSecondary)};
    color: ${$t(l.textPrimary)};
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .mode-btn:hover:not(:disabled):not(.active) {
    border-color: ${$t(l.accent)};
  }

  .mode-btn.active {
    background: ${$t(l.accent)};
    border-color: ${$t(l.accent)};
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
`;let li=class extends z{constructor(){super(...arguments),this.value="home_1",this.disabled=!1,this.buttonStates={home_1:"idle",home_2:"idle",home_3:"idle",home_ups:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("mode-change",{detail:{mode:e},bubbles:!0}))}render(){return c`
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
              ${yo[t]}
              ${i==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};li.styles=[tr];we([g({type:String})],li.prototype,"value",2);we([g({type:Boolean})],li.prototype,"disabled",2);we([g({type:Object})],li.prototype,"buttonStates",2);li=we([E("oig-box-mode-selector")],li);let ut=class extends z{constructor(){super(...arguments),this.value="off",this.limit=0,this.disabled=!1,this.pendingTarget=null,this.buttonStates={off:"idle",on:"idle",limited:"idle"}}onDeliveryClick(e){const t=this.buttonStates[e];this.disabled||t==="pending"||t==="processing"||t==="disabled-by-service"||t==="active"&&e!=="limited"||this.dispatchEvent(new CustomEvent("delivery-change",{detail:{value:e,limit:e==="limited"?this.limit:null},bubbles:!0}))}render(){const e=[{value:"off",label:Oi.off},{value:"on",label:Oi.on},{value:"limited",label:Oi.limited}],i=this.pendingTarget!==null&&this.pendingTarget!==this.value?c`<span class="status-text transitioning">\u23F3\u00A0${Oi[this.pendingTarget]}</span>`:null;return c`
      <div class="selector-label">
        Dod\u00E1vka do s\u00EDt\u011B ${i}
      </div>
      <div class="mode-buttons">
        ${e.map(n=>{const r=this.buttonStates[n.value],a=n.value===this.value,o=n.value===this.pendingTarget&&!a,s=this.disabled||r==="pending"||r==="processing"||r==="disabled-by-service",d=a&&r==="disabled-by-service"?"active disabled-by-service":o?`${r} pending-target`:r;return c`
            <button
              class="mode-btn ${d}"
              ?disabled=${s}
              @click=${()=>this.onDeliveryClick(n.value)}
            >
              ${n.label}
              ${r==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${r==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};ut.styles=[tr,D`
      .mode-btn.pending-target {
        border-color: #ffc107;
        color: #ffc107;
        background: rgba(255, 193, 7, 0.08);
      }
    `];we([g({type:String})],ut.prototype,"value",2);we([g({type:Number})],ut.prototype,"limit",2);we([g({type:Boolean})],ut.prototype,"disabled",2);we([g({type:String})],ut.prototype,"pendingTarget",2);we([g({type:Object})],ut.prototype,"buttonStates",2);ut=we([E("oig-grid-delivery-selector")],ut);let ci=class extends z{constructor(){super(...arguments),this.value="cbb",this.disabled=!1,this.buttonStates={cbb:"idle",manual:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("boiler-mode-change",{detail:{mode:e},bubbles:!0}))}render(){return c`
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
              ${xo[t]} ${vo[t]}
              ${i==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};ci.styles=[tr];we([g({type:String})],ci.prototype,"value",2);we([g({type:Boolean})],ci.prototype,"disabled",2);we([g({type:Object})],ci.prototype,"buttonStates",2);ci=we([E("oig-boiler-mode-selector")],ci);let ht=class extends z{constructor(){super(...arguments),this.homeGridV=!1,this.homeGridVi=!1,this.flexibilita=!1,this.available=!1,this.disabled=!1}getButtonClass(e){return e&&this.disabled?"active disabled-by-service":e?"active":this.disabled?"disabled-by-service":"idle"}onToggleClick(e){this.disabled||this.dispatchEvent(new CustomEvent("supplementary-toggle",{detail:{key:e},bubbles:!0}))}render(){const e=this.getButtonClass(this.homeGridV),t=this.getButtonClass(this.homeGridVi),i=this.flexibilita?c`<span class="flexibilita-badge">\u26A1 Flexibilita</span>`:"";return c`
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
    `}};ht.styles=[tr,D`
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
    `];we([g({type:Boolean})],ht.prototype,"homeGridV",2);we([g({type:Boolean})],ht.prototype,"homeGridVi",2);we([g({type:Boolean})],ht.prototype,"flexibilita",2);we([g({type:Boolean})],ht.prototype,"available",2);we([g({type:Boolean})],ht.prototype,"disabled",2);ht=we([E("oig-supplementary-selector")],ht);function vg(e){const t=!e.available||e.flexibilita;return e.available?{home_grid_v:e.home_grid_v,home_grid_vi:e.home_grid_vi,flexibilita:e.flexibilita,available:e.available,disabled:t}:{home_grid_v:!1,home_grid_vi:!1,flexibilita:e.flexibilita,available:!1,disabled:!0}}var xg=Object.defineProperty,wg=Object.getOwnPropertyDescriptor,yi=(e,t,i,n)=>{for(var r=n>1?void 0:n?wg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&xg(t,i,r),r};const Oe=Z;let gt=class extends z{constructor(){super(...arguments),this.items=[],this.expanded=!1,this.shieldStatus="idle",this.queueCount=0,this._now=Date.now(),this.updateInterval=null}connectedCallback(){super.connectedCallback(),this.updateInterval=window.setInterval(()=>{this._now=Date.now()},1e3)}disconnectedCallback(){super.disconnectedCallback(),this.updateInterval!==null&&clearInterval(this.updateInterval)}toggleExpanded(){this.expanded=!this.expanded}removeItem(e,t){t.stopPropagation(),this.dispatchEvent(new CustomEvent("remove-item",{detail:{position:e},bubbles:!0}))}formatServiceName(e,t){return t==="supplementary_toggle"?"⚙️ Změna doplňkového režimu":wl[e]||e||"N/A"}stripCurrentSuffix(e){const i=e.indexOf("(nyní:");return i===-1?e.trim():e.slice(0,i).trim()}formatChanges(e){return!e||e.length===0?"N/A":e.map(t=>{const i=t.indexOf("→");if(i===-1)return t;const n=t.slice(0,i).trim(),r=t.slice(i+1).trim(),a=n.indexOf(":"),o=a===-1?n:n.slice(a+1),s=n.includes("prm2_app")?wo:_l,d=o.replaceAll("'","").trim(),p=this.stripCurrentSuffix(r).replaceAll("'","").trim(),u=s[d]||d,h=s[p]||p;return`${u} → ${h}`}).join(", ")}formatTimestamp(e){if(!e)return{time:"--",duration:"--"};try{const t=new Date(e);if(isNaN(t.getTime()))return{time:"--",duration:"--"};const i=new Date(this._now),n=Math.floor((i.getTime()-t.getTime())/1e3),r=String(t.getHours()).padStart(2,"0"),a=String(t.getMinutes()).padStart(2,"0");let o=`${r}:${a}`;if(t.toDateString()!==i.toDateString()){const d=t.getDate(),p=t.getMonth()+1;o=`${d}.${p}. ${o}`}let s;if(n<60)s=`${n}s`;else if(n<3600){const d=Math.floor(n/60),p=n%60;s=`${d}m ${p}s`}else{const d=Math.floor(n/3600),p=Math.floor(n%3600/60);s=`${d}h ${p}m`}return{time:o,duration:s}}catch{return{time:"--",duration:"--"}}}get activeCount(){return this.items.length}render(){this._now;const e=this.shieldStatus==="running"?"running":"idle",t=this.shieldStatus==="running"?"🔄 Zpracovává":"✓ Připraveno";return c`
      <div class="queue-header" @click=${this.toggleExpanded}>
        <div class="queue-title-area">
          <span class="queue-title">Shield fronta</span>
          ${this.activeCount>0?c`
            <span class="queue-count">(${this.activeCount} aktivn\u00EDch)</span>
          `:_}
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
      `:_}
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
      background: ${Oe(l.cardBg)};
      border-radius: 12px;
      box-shadow: ${Oe(l.cardShadow)};
      overflow: hidden;
    }

    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: ${Oe(l.bgSecondary)};
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
      color: ${Oe(l.textPrimary)};
    }

    .queue-count {
      font-size: 12px;
      color: ${Oe(l.textSecondary)};
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
      color: ${Oe(l.accent)};
      transition: transform 0.2s;
    }

    .queue-toggle.expanded {
      transform: rotate(180deg);
    }

    .queue-content {
      padding: 0;
      border-top: 1px solid ${Oe(l.divider)};
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
      color: ${Oe(l.textSecondary)};
      border-bottom: 1px solid ${Oe(l.divider)};
      background: ${Oe(l.bgSecondary)};
    }

    .queue-table td {
      padding: 8px 12px;
      color: ${Oe(l.textPrimary)};
      border-bottom: 1px solid ${Oe(l.divider)};
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
      color: ${Oe(l.textSecondary)};
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
  `;yi([g({type:Array})],gt.prototype,"items",2);yi([g({type:Boolean})],gt.prototype,"expanded",2);yi([g({type:String})],gt.prototype,"shieldStatus",2);yi([g({type:Number})],gt.prototype,"queueCount",2);yi([T()],gt.prototype,"_now",2);gt=yi([E("oig-shield-queue")],gt);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const _g={CHILD:2},$g=e=>(...t)=>({_$litDirective$:e,values:t});class kg{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,n){this._$Ct=t,this._$AM=i,this._$Ci=n}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class jr extends kg{constructor(t){if(super(t),this.it=_,t.type!==_g.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===_||t==null)return this._t=void 0,this.it=t;if(t===Gs)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}}jr.directiveName="unsafeHTML",jr.resultType=1;const Sg=$g(jr);var Cg=Object.defineProperty,Pg=Object.getOwnPropertyDescriptor,cn=(e,t,i,n)=>{for(var r=n>1?void 0:n?Pg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Cg(t,i,r),r};const Se=Z;let Lt=class extends z{constructor(){super(...arguments),this.open=!1,this.config={title:"",message:""},this.acknowledged=!1,this.limitValue=5e3,this.resolver=null,this.onOverlayClick=()=>{this.closeDialog({confirmed:!1})},this.onDialogClick=e=>{e.stopPropagation()},this.onKeyDown=e=>{e.key==="Escape"&&this.open&&this.closeDialog({confirmed:!1})},this.onAckChange=e=>{this.acknowledged=e.target.checked},this.onLimitInput=e=>{this.limitValue=parseInt(e.target.value,10)||0},this.onCancel=()=>{this.closeDialog({confirmed:!1})},this.onConfirm=()=>{const e=this.config.showLimitInput||this.config.limitOnly;if(e){const t=this.config.limitMin??1,i=this.config.limitMax??2e4;if(isNaN(this.limitValue)||this.limitValue<t||this.limitValue>i)return}this.closeDialog({confirmed:!0,limit:e?this.limitValue:void 0})}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeyDown)}showDialog(e){return this.config=e,this.acknowledged=!1,this.limitValue=e.limitValue??5e3,this.open=!0,new Promise(t=>{this.resolver=t})}closeDialog(e){var t;this.open=!1,(t=this.resolver)==null||t.call(this,e),this.resolver=null}get canConfirm(){return!(this.config.requireAcknowledgement&&!this.acknowledged)}render(){if(!this.open)return _;const e=this.config;return e.limitOnly?c`
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
          `:_}

          ${e.warning?c`
            <div class="dialog-warning">
              \u26A0\uFE0F ${this.renderHTML(e.warning)}
            </div>
          `:_}

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
          `:_}

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
    `}renderHTML(e){return Sg(e)}};Lt.styles=D`
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
      background: ${Se(l.cardBg)};
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
      color: ${Se(l.textPrimary)};
      border-bottom: 1px solid ${Se(l.divider)};
    }

    .dialog-body {
      padding: 16px 20px;
      font-size: 14px;
      line-height: 1.5;
      color: ${Se(l.textPrimary)};
    }

    .dialog-warning {
      margin: 0 20px 12px;
      padding: 10px 14px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      font-size: 13px;
      color: ${Se(l.textPrimary)};
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
      background: ${Se(l.bgSecondary)};
      border-radius: 8px;
      cursor: pointer;
    }

    .ack-wrapper input[type="checkbox"] {
      margin-top: 2px;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${Se(l.accent)};
    }

    .ack-wrapper label {
      font-size: 13px;
      line-height: 1.4;
      color: ${Se(l.textPrimary)};
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
      color: ${Se(l.textPrimary)};
    }

    .limit-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid ${Se(l.divider)};
      border-radius: 8px;
      font-size: 14px;
      background: ${Se(l.bgPrimary)};
      color: ${Se(l.textPrimary)};
      box-sizing: border-box;
    }

    .limit-hint {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      opacity: 0.7;
      color: ${Se(l.textSecondary)};
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
      background: ${Se(l.bgSecondary)};
      color: ${Se(l.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${Se(l.divider)};
    }

    .btn-confirm {
      background: ${Se(l.accent)};
      color: #fff;
    }

    .btn-confirm:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-confirm:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;cn([g({type:Boolean,reflect:!0})],Lt.prototype,"open",2);cn([g({type:Object})],Lt.prototype,"config",2);cn([T()],Lt.prototype,"acknowledged",2);cn([T()],Lt.prototype,"limitValue",2);Lt=cn([E("oig-confirm-dialog")],Lt);var Tg=Object.defineProperty,Mg=Object.getOwnPropertyDescriptor,ss=(e,t,i,n)=>{for(var r=n>1?void 0:n?Mg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Tg(t,i,r),r};const Di=Z;let Hn=class extends z{constructor(){super(...arguments),this.shieldState=null}render(){if(!this.shieldState)return _;const e=this.determineStatus(this.shieldState),t=e.toLowerCase(),i=this.getStatusIcon(e),n=this.getStatusLabel(e),a=this.shieldState.queueCount>0?"has-items":"";return c`
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
    `}determineStatus(e){return e.status==="running"?"processing":e.queueCount>0?"pending":"idle"}getStatusIcon(e){switch(e){case"idle":return"✓";case"pending":return"⏳";case"processing":return"🔄";default:return"✓"}}getStatusLabel(e){switch(e){case"idle":return"Připraveno";case"pending":return"Čeká";case"processing":return"Zpracovává";default:return"Neznámý"}}getActivityText(){return this.shieldState?this.shieldState.activity?this.shieldState.activity:this.shieldState.queueCount>0?`${this.shieldState.queueCount} operací ve frontě`:"Systém připraven":"Žádná aktivita"}};Hn.styles=D`
    :host {
      display: block;
      padding: 16px 20px;
      border-top: 1px solid ${Di(l.divider)};
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
      color: ${Di(l.textPrimary)};
    }

    .shield-status-subtitle {
      font-size: 11px;
      color: ${Di(l.textSecondary)};
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
      background: ${Di(l.bgSecondary)};
      color: ${Di(l.textSecondary)};
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
  `;ss([g({type:Object})],Hn.prototype,"shieldState",2);Hn=ss([E("oig-shield-status")],Hn);var Dg=Object.defineProperty,zg=Object.getOwnPropertyDescriptor,ir=(e,t,i,n)=>{for(var r=n>1?void 0:n?zg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Dg(t,i,r),r};const Kt=Z;let di=class extends z{constructor(){super(...arguments),this.boxHasHome56=!1,this.shieldState={..._o,pendingServices:new Map,changingServices:new Set},this._confirmDialogOverride=null,this.unsubscribe=null,this.onShieldUpdate=e=>{this.shieldState=e}}get confirmDialog(){return this._confirmDialogOverride??this._confirmDialogQuery}set confirmDialog(e){this._confirmDialogOverride=e}connectedCallback(){super.connectedCallback(),this.unsubscribe=le.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.unsubscribe)==null||e.call(this),this.unsubscribe=null}get boxModeButtonStates(){return{home_1:le.getBoxModeButtonState("home_1"),home_2:le.getBoxModeButtonState("home_2"),home_3:le.getBoxModeButtonState("home_3"),home_ups:le.getBoxModeButtonState("home_ups")}}get gridDeliveryButtonStates(){return{off:le.getGridDeliveryButtonState("off"),on:le.getGridDeliveryButtonState("on"),limited:le.getGridDeliveryButtonState("limited")}}get boilerModeButtonStates(){return{cbb:le.getBoilerModeButtonState("cbb"),manual:le.getBoilerModeButtonState("manual")}}get supplementaryView(){return vg(this.shieldState.supplementary)}async onBoxModeChange(e){const{mode:t}=e.detail,i=yo[t];if(C.debug("Control panel: box mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu střídače",message:`Chystáte se změnit režim boxu na <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování celého systému a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!le.shouldProceedWithQueue())return;await le.setBoxMode(t)||C.warn("Box mode change failed or already active",{mode:t})}async onGridDeliveryChange(e){const{value:t,limit:i}=e.detail,n=Oi[t],r=xl[t],a=t==="limited",o=this.shieldState.gridDeliveryState.currentLiveLimit??5e3;C.debug("Control panel: grid delivery change requested",{delivery:t,limit:i});const s=this.shieldState.gridDeliveryState.currentLiveDelivery;if(!this.shieldState.gridDeliveryState.isTransitioning&&s==="limited"&&t==="limited"){const f={title:"🚰 Změnit limit přetoků",message:"",limitOnly:!0,showLimitInput:!0,limitValue:o,limitMin:1,limitMax:2e4,limitStep:100,confirmText:"Uložit limit",cancelText:"Zrušit"},m=await this.confirmDialog.showDialog(f);if(!m.confirmed||!le.shouldProceedWithQueue())return;await le.setGridDelivery("limited",m.limit);return}const p={title:`${r} Změna dodávky do sítě`,message:`Chystáte se změnit dodávku do sítě na: <strong>"${n}"</strong>`,warning:a?"Režim a limit budou změněny postupně (serializováno). Každá změna může trvat až 10 minut.":"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,acknowledgementText:"<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost. Aplikace nenese odpovědnost za případné negativní důsledky této změny.",confirmText:"Potvrdit změnu",cancelText:"Zrušit",showLimitInput:a,limitValue:o,limitMin:1,limitMax:2e4,limitStep:100},u=await this.confirmDialog.showDialog(p);if(!u.confirmed||!le.shouldProceedWithQueue())return;const h=this.shieldState.gridDeliveryState.currentLiveDelivery==="limited",b=t==="limited";h&&b&&u.limit!=null?await le.setGridDelivery(t,u.limit):b&&u.limit!=null?await le.setGridDelivery(t,u.limit):await le.setGridDelivery(t)}async onBoilerModeChange(e){const{mode:t}=e.detail,i=vo[t],n=xo[t];if(C.debug("Control panel: boiler mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu bojleru",message:`Chystáte se změnit režim bojleru na <strong>"${n} ${i}"</strong>.<br><br>Tato změna ovlivní chování ohřevu vody a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!le.shouldProceedWithQueue())return;await le.setBoilerMode(t)||C.warn("Boiler mode change failed or already active",{mode:t})}async onSupplementaryToggle(e){const{key:t}=e.detail,i=t==="home_grid_v"?"Home 5":"Home 6",n=!this.shieldState.supplementary[t];if(C.debug("Control panel: supplementary toggle requested",{key:t}),!(await this.confirmDialog.showDialog({title:"Změna doplňkového režimu",message:`Chystáte se přepnout <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování systému a může trvat až 10 minut.`,warning:"Změna může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!le.shouldProceedWithQueue())return;await le.setSupplementaryToggle(t,n)||C.warn("Supplementary toggle failed",{key:t})}async onQueueRemoveItem(e){const{position:t}=e.detail;C.debug("Control panel: queue remove requested",{position:t});const i=this.shieldState.allRequests.find(o=>o.position===t);let n="Operace";if(i&&(i.service.includes("set_box_mode")?n=`Změna režimu na ${i.targetValue||"neznámý"}`:i.service.includes("set_grid_delivery")?n=`Změna dodávky do sítě na ${i.targetValue||"neznámý"}`:i.service.includes("set_boiler_mode")&&(n=`Změna režimu bojleru na ${i.targetValue||"neznámý"}`)),!(await this.confirmDialog.showDialog({title:n,message:"Operace bude odstraněna z fronty bez provedení.",requireAcknowledgement:!1,confirmText:"OK",cancelText:"Zrušit"})).confirmed)return;await le.removeFromQueue(t)||C.warn("Failed to remove from queue",{position:t})}render(){const e=this.shieldState,t=e.status==="running"?"running":"idle",i=e.status==="running"?"Zpracovává":"Připraveno",n=e.allRequests.length>0;return c`
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
          `:_}

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
        `:_}
      </div>

      <!-- Shared confirm dialog instance -->
      <oig-confirm-dialog></oig-confirm-dialog>
    `}};di.styles=D`
    :host {
      display: block;
      margin-top: 16px;
    }

    .control-panel {
      background: ${Kt(l.cardBg)};
      border-radius: 16px;
      box-shadow: ${Kt(l.cardShadow)};
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid ${Kt(l.divider)};
    }

    .panel-title {
      font-size: 15px;
      font-weight: 600;
      color: ${Kt(l.textPrimary)};
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
      background: ${Kt(l.divider)};
      margin: 16px 0;
    }

    .queue-section {
      border-top: 1px solid ${Kt(l.divider)};
    }

    @media (max-width: 480px) {
      .panel-body {
        padding: 12px 14px;
      }
    }
  `;ir([g({type:Boolean})],di.prototype,"boxHasHome56",2);ir([T()],di.prototype,"shieldState",2);ir([Un("oig-confirm-dialog")],di.prototype,"_confirmDialogQuery",2);di=ir([E("oig-control-panel")],di);var Eg=Object.defineProperty,Og=Object.getOwnPropertyDescriptor,vi=(e,t,i,n)=>{for(var r=n>1?void 0:n?Og(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Eg(t,i,r),r};const Me=Z;let bt=class extends z{constructor(){super(...arguments),this.open=!1,this.currentSoc=0,this.maxSoc=100,this.estimate=null,this.targetSoc=80}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onSliderInput(e){this.targetSoc=parseInt(e.target.value,10),this.dispatchEvent(new CustomEvent("soc-change",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}onConfirm(){this.dispatchEvent(new CustomEvent("confirm",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}render(){return c`
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
    `}};bt.styles=D`
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
      background: ${Me(l.cardBg)};
      border-radius: 16px;
      padding: 24px;
      min-width: 320px;
      max-width: 90vw;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${Me(l.textPrimary)};
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
      color: ${Me(l.textSecondary)};
    }

    .soc-value {
      font-size: 24px;
      font-weight: 600;
      color: ${Me(l.textPrimary)};
    }

    .soc-arrow {
      font-size: 20px;
      color: ${Me(l.textSecondary)};
    }

    .slider-container {
      margin: 16px 0;
    }

    .slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: ${Me(l.bgSecondary)};
      -webkit-appearance: none;
      appearance: none;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${Me(l.accent)};
      cursor: pointer;
    }

    .estimate {
      background: ${Me(l.bgSecondary)};
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
      color: ${Me(l.textSecondary)};
    }

    .estimate-value {
      color: ${Me(l.textPrimary)};
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

    .btn-confirm:hover {
      opacity: 0.9;
    }
  `;vi([g({type:Boolean})],bt.prototype,"open",2);vi([g({type:Number})],bt.prototype,"currentSoc",2);vi([g({type:Number})],bt.prototype,"maxSoc",2);vi([g({type:Object})],bt.prototype,"estimate",2);vi([T()],bt.prototype,"targetSoc",2);bt=vi([E("oig-battery-charge-dialog")],bt);var Lg=Object.defineProperty,Ag=Object.getOwnPropertyDescriptor,je=(e,t,i,n)=>{for(var r=n>1?void 0:n?Ag(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Lg(t,i,r),r};function Qt(e){return e==null||Number.isNaN(e)?"-- kWh":`${e.toFixed(Math.abs(e)>=10?1:2)} kWh`}const Cr=Z,ea=D`
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
`;let Zi=class extends z{constructor(){super(...arguments),this.title="",this.icon="📊"}render(){return c`
      <div class="block-header">
        <span class="block-icon">${this.icon}</span>
        <span class="block-title">${this.title}</span>
      </div>
      <slot></slot>
    `}};Zi.styles=D`
    :host {
      display: block;
      background: ${Cr(l.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${Cr(l.cardShadow)};
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
      color: ${Cr(l.textPrimary)};
    }

    ${ea}
  `;je([g({type:String})],Zi.prototype,"title",2);je([g({type:String})],Zi.prototype,"icon",2);Zi=je([E("oig-analytics-block")],Zi);let Wn=class extends z{constructor(){super(...arguments),this.data=null}render(){if(!this.data)return c`<div>Načítání...</div>`;const e=this.data.trend>=0?"positive":"negative",t=this.data.trend>=0?"+":"",i=this.data.period==="last_month"?"Minulý měsíc":`Aktuální měsíc (${this.data.currentMonthDays} dní)`;return c`
      <div class="efficiency-value">${Zt(this.data.efficiency,1)}</div>
      <div class="period-label"
        title="Coulombická (DC) účinnost článků baterie. Celková AC účinnost vč. střídače, se kterou počítá ekonomika plánovače, je ~84 %.">
        ${i} · DC (články)
      </div>

      ${this.data.trend!==0?c`
        <div class="comparison ${e}">
          ${t}${Zt(this.data.trend)} vs minulý měsíc
        </div>
      `:null}

      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${Qt(this.data.charged)}</div>
          <div class="stat-label">Nabito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${Qt(this.data.discharged)}</div>
          <div class="stat-label">Vybito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${Qt(this.data.losses)}</div>
          <div class="stat-label">Ztráty</div>
          ${this.data.lossesPct?c`
            <div class="losses-pct">${Zt(this.data.lossesPct,1)}</div>
          `:null}
        </div>
      </div>
    `}};Wn.styles=D`
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
  `;je([g({type:Object})],Wn.prototype,"data",2);Wn=je([E("oig-battery-efficiency")],Wn);let Vn=class extends z{constructor(){super(...arguments),this.data=null}renderSparkline(){var d;const e=(d=this.data)==null?void 0:d.measurementHistory;if(!e||e.length<2)return null;const t=e.map(p=>p.soh_percent),i=Math.min(...t)-1,r=Math.max(...t)+1-i||1,a=200,o=40,s=t.map((p,u)=>{const h=u/(t.length-1)*a,b=o-(p-i)/r*o;return`${h},${b}`}).join(" ");return c`
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
          <span class="metric-value">${Zt(this.data.soh,1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Kapacita (P80)</span>
          <span class="metric-value">${Qt(this.data.capacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Min. kapacita (P20)</span>
          <span class="metric-value">${Qt(this.data.minCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Nominální kapacita</span>
          <span class="metric-value">${Qt(this.data.nominalCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Počet měření</span>
          <span class="metric-value">${this.data.measurementCount}</span>
        </div>
        ${this.data.qualityScore!=null?c`
          <div class="metric">
            <span class="metric-label">Kvalita dat</span>
            <span class="metric-value">${Zt(this.data.qualityScore,0)}</span>
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
                Spolehlivost: <span class="prediction-value">${Zt(this.data.trendConfidence,0)}</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:c`<div>Načítání...</div>`}};Vn.styles=D`
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

    ${ea}

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
  `;je([g({type:Object})],Vn.prototype,"data",2);Vn=je([E("oig-battery-health")],Vn);let Kn=class extends z{constructor(){super(...arguments),this.data=null}getProgressClass(e){return e==null?"ok":e>=95?"overdue":e>=80?"due-soon":"ok"}statusLabel(e){var i;return{unknown:"Žádné",idle:"Nečinné",charging:"Nabíjení",holding:"Držení 100 %",completed:"Dokončeno"}[(i=e==null?void 0:e.toLowerCase)==null?void 0:i.call(e)]??e}render(){return this.data?!(this.data.lastBalancing&&this.data.lastBalancing!=="—"||this.data.nextScheduled!=null||this.data.progressPercent!=null)&&(this.data.status??"unknown").toLowerCase()==="unknown"?c`
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
            <span class="metric-value">${ne(this.data.cost)}</span>
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
            <span class="metric-value">${ne(this.data.estimatedNextCost)}</span>
          </div>
        `:null}
      </oig-analytics-block>
    `:c`<div>Načítání...</div>`}};Kn.styles=D`
    :host { display: block; }
    ${ea}

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
  `;je([g({type:Object})],Kn.prototype,"data",2);Kn=je([E("oig-battery-balancing")],Kn);let qn=class extends z{constructor(){super(...arguments),this.data=null}render(){return this.data?c`
      <oig-analytics-block title="Porovnání nákladů" icon="💰">
        <div class="cost-row">
          <span class="cost-label">Skutečné náklady</span>
          <span class="cost-value">${ne(this.data.actualSpent)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Odhad dnes celkem</span>
          <span class="cost-value">${ne(this.data.planTotalCost)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Zbývající plán</span>
          <span class="cost-value">${ne(this.data.futurePlanCost)}</span>
        </div>
        ${this.data.tomorrowCost!=null?c`
          <div class="cost-row">
            <span class="cost-label">Zítra odhad</span>
            <span class="cost-value">${ne(this.data.tomorrowCost)}</span>
          </div>
        `:null}

        ${this.data.yesterdayActualCost!=null?c`
          <div class="yesterday-section">
            <div class="section-label">Včera</div>
            <div class="cost-row">
              <span class="cost-label">Plán</span>
              <span class="cost-value">${this.data.yesterdayPlannedCost!=null?ne(this.data.yesterdayPlannedCost):"—"}</span>
            </div>
            <div class="cost-row">
              <span class="cost-label">Skutečnost</span>
              <span class="cost-value">${ne(this.data.yesterdayActualCost)}</span>
            </div>
            ${this.data.yesterdayDelta!=null?c`
              <div class="cost-row">
                <span class="cost-label">Rozdíl</span>
                <span class="cost-value ${this.data.yesterdayDelta<=0?"delta-positive":"delta-negative"}">
                  ${this.data.yesterdayDelta>=0?"+":""}${ne(this.data.yesterdayDelta)}
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
    `:c`<div>Načítání...</div>`}};qn.styles=D`
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
  `;je([g({type:Object})],qn.prototype,"data",2);qn=je([E("oig-cost-comparison")],qn);var Fg=Object.defineProperty,Ig=Object.getOwnPropertyDescriptor,xi=(e,t,i,n)=>{for(var r=n>1?void 0:n?Ig(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Fg(t,i,r),r};const Ut=Z;let Qi=class extends z{constructor(){super(...arguments),this.data=Fi,this.compact=!1,this.onClick=()=>{this.dispatchEvent(new CustomEvent("badge-click",{bubbles:!0}))}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.onClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.onClick)}render(){const e=this.data.effectiveSeverity,t=Cn[e]??Cn[0],i=this.data.warningsCount>0&&e>0,n=i?Do(this.data.eventType):"✓";return c`
      <style>
        :host { background: ${Ut(t)}; }
      </style>
      <span class="badge-icon">${n}</span>
      ${i?c`
        <span class="badge-count">${this.data.warningsCount}</span>
      `:null}
      <span class="badge-label">${i?zo[e]??"Výstraha":"OK"}</span>
    `}};Qi.styles=D`
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
  `;xi([g({type:Object})],Qi.prototype,"data",2);xi([g({type:Boolean})],Qi.prototype,"compact",2);Qi=xi([E("oig-chmu-badge")],Qi);let Xi=class extends z{constructor(){super(...arguments),this.open=!1,this.data=Fi}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}formatTime(e){return e?new Date(e).toLocaleString("cs-CZ"):"—"}renderWarning(e){const t=Cn[e.severity]??Cn[2],i=Do(e.event_type),n=zo[e.severity]??"Neznámá";return c`
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
    `}};Xi.styles=D`
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
      background: ${Ut(l.cardBg)};
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
      color: ${Ut(l.textPrimary)};
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      font-size: 20px;
      cursor: pointer;
      color: ${Ut(l.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${Ut(l.bgSecondary)};
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
      color: ${Ut(l.textSecondary)};
    }

    .eta-badge {
      display: inline-block;
      font-size: 10px;
      padding: 1px 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      margin-left: 6px;
    }
  `;xi([g({type:Boolean,reflect:!0})],Xi.prototype,"open",2);xi([g({type:Object})],Xi.prototype,"data",2);Xi=xi([E("oig-chmu-modal")],Xi);var Bg=Object.defineProperty,Ng=Object.getOwnPropertyDescriptor,qe=(e,t,i,n)=>{for(var r=n>1?void 0:n?Ng(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Bg(t,i,r),r};const $e=Z;function zi(e){return e.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")}function jg(e,t,i,n=50){const r=zi(i.trim()),a=t?`${t}.`:"",o=e.filter(u=>a&&!u.entity_id.startsWith(a)?!1:r?zi(u.entity_id).includes(r)||zi(u.friendly_name).includes(r):!0);if(!r)return o.slice(0,n);const s=[],d=[],p=[];for(const u of o){const h=zi(u.entity_id),b=zi(u.friendly_name);h.startsWith(r)||h.includes(`.${r}`)?s.push(u):b.startsWith(r)?d.push(u):p.push(u)}return[...s,...d,...p].slice(0,n)}function Rg(e,t){if(!e)return"";const i=t.find(n=>n.entity_id===e);return i!=null&&i.friendly_name&&i.friendly_name!==e?i.friendly_name:e}function Hg(e){return Object.entries(e??{}).map(([t,i])=>{var n;return{entity_id:t,friendly_name:((n=i==null?void 0:i.attributes)==null?void 0:n.friendly_name)??t}})}let Ie=class extends z{constructor(){super(...arguments),this.value="",this.domain="",this.optional=!1,this.entities=[],this.dirty=!1,this.placeholder="nevyplněno",this.open=!1,this.query="",this.highlightIndex=-1}get results(){return jg(this.entities,this.domain,this.query)}get displayValue(){return this.value?Rg(this.value,this.entities):""}openDropdown(){this.open=!0,this.query="",this.highlightIndex=-1,requestAnimationFrame(()=>{var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".search-box input");e==null||e.focus()})}closeDropdown(){this.open=!1,this.query="",this.highlightIndex=-1}selectEntity(e){this.closeDropdown(),e!==this.value&&(this.value=e,this.dispatchEvent(new CustomEvent("entity-change",{detail:{value:e},bubbles:!0,composed:!0})))}clearValue(e){e.stopPropagation(),this.selectEntity("")}onInputClick(){this.open?this.closeDropdown():this.openDropdown()}onSearchInput(e){this.query=e.target.value,this.highlightIndex=-1}onSearchKeydown(e){const t=this.results;if(e.key==="Escape"){this.closeDropdown();return}if(e.key==="ArrowDown"){e.preventDefault(),this.highlightIndex=Math.min(this.highlightIndex+1,t.length-1),this.scrollHighlightedIntoView();return}if(e.key==="ArrowUp"){e.preventDefault(),this.highlightIndex=Math.max(this.highlightIndex-1,-1),this.scrollHighlightedIntoView();return}if(e.key==="Enter"){e.preventDefault(),this.highlightIndex>=0&&this.highlightIndex<t.length&&this.selectEntity(t[this.highlightIndex].entity_id);return}}scrollHighlightedIntoView(){requestAnimationFrame(()=>{var i;const e=(i=this.shadowRoot)==null?void 0:i.querySelector(".option-list"),t=e==null?void 0:e.querySelector(".option.hl");t==null||t.scrollIntoView({block:"nearest"})})}render(){const e=this.displayValue,t=this.open?this.results:[];return c`
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
        ${this.optional&&this.value?c`<button class="clear-btn" title="Vymazat" @click=${this.clearValue} tabindex="-1">×</button>`:_}
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
              `:_}
              ${t.length===0&&this.query?c`<div class="empty-msg">Žádné entity nenalezeny</div>`:t.map((i,n)=>c`
                  <div
                    class="option ${n===this.highlightIndex?"hl":""}"
                    role="option"
                    @click=${()=>this.selectEntity(i.entity_id)}
                    @mouseenter=${()=>{this.highlightIndex=n}}
                  >
                    <span class="opt-name">${i.friendly_name!==i.entity_id?i.friendly_name:i.entity_id}</span>
                    ${i.friendly_name!==i.entity_id?c`<span class="opt-id">${i.entity_id}</span>`:_}
                  </div>
                `)}
            </div>
          </div>
        `:_}
      </div>
    `}};Ie.styles=D`
    :host { display: block; position: relative; }

    .picker-wrap {
      position: relative;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .picker-input {
      background: ${$e(l.bgSecondary)};
      color: ${$e(l.textPrimary)};
      border: 1px solid ${$e(l.divider)};
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
      border-color: ${$e(l.accent)};
    }

    .picker-input.open {
      border-color: ${$e(l.accent)};
      border-radius: 7px 7px 0 0;
    }

    .clear-btn {
      border: none;
      background: transparent;
      color: ${$e(l.textSecondary)};
      cursor: pointer;
      font-size: 15px;
      padding: 0 2px;
      line-height: 1;
      flex-shrink: 0;
    }

    .clear-btn:hover { color: ${$e(l.textPrimary)}; }

    .dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      width: 300px;
      max-height: 280px;
      overflow-y: auto;
      background: ${$e(l.cardBg)};
      border: 1px solid ${$e(l.accent)};
      border-radius: 0 0 8px 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      z-index: 999;
      display: flex;
      flex-direction: column;
    }

    .search-box {
      padding: 6px 8px;
      border-bottom: 1px solid ${$e(l.divider)};
      background: ${$e(l.bgSecondary)};
      flex-shrink: 0;
    }

    .search-box input {
      width: 100%;
      background: ${$e(l.bgSecondary)};
      color: ${$e(l.textPrimary)};
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
      border-bottom: 1px solid ${$e(l.divider)};
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
      color: ${$e(l.textPrimary)};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .opt-id {
      font-size: 10.5px;
      color: ${$e(l.textSecondary)};
      font-family: monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .opt-none {
      padding: 6px 10px;
      font-size: 12px;
      color: ${$e(l.textSecondary)};
      font-style: italic;
    }

    .empty-msg {
      padding: 10px;
      font-size: 12px;
      color: ${$e(l.textSecondary)};
      text-align: center;
    }
  `;qe([g({type:String})],Ie.prototype,"value",2);qe([g({type:String})],Ie.prototype,"domain",2);qe([g({type:Boolean})],Ie.prototype,"optional",2);qe([g({attribute:!1})],Ie.prototype,"entities",2);qe([g({type:Boolean})],Ie.prototype,"dirty",2);qe([g({type:String})],Ie.prototype,"placeholder",2);qe([T()],Ie.prototype,"open",2);qe([T()],Ie.prototype,"query",2);qe([T()],Ie.prototype,"highlightIndex",2);Ie=qe([E("oig-entity-picker")],Ie);var Wg=Object.defineProperty,Vg=Object.getOwnPropertyDescriptor,jt=(e,t,i,n)=>{for(var r=n>1?void 0:n?Vg(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&Wg(t,i,r),r};const oe=Z,Kg=new Set(["boiler"]),qg=[{key:"enable_battery_prediction",label:"Predikce baterie a plánovač",type:"bool",hint:"Ekonomické plánování nabíjení, timeline, úspory"},{key:"enable_solar_forecast",label:"Solární předpověď",type:"bool",hint:"Předpověď výroby FVE (forecast.solar / Solcast)"},{key:"enable_pricing",label:"Ceny energie",type:"bool",hint:"Spotové ceny OTE, výkup, distribuce"},{key:"enable_boiler",label:"Bojler",type:"bool",hint:"Inteligentní ohřev vody"},{key:"enable_statistics",label:"Statistiky",type:"bool"},{key:"enable_extended_sensors",label:"Rozšířené senzory",type:"bool"},{key:"enable_chmu_warnings",label:"Výstrahy ČHMÚ",type:"bool"}],Gg=[{key:"auto_mode_switch_enabled",label:"Automatické přepínání režimů",type:"bool",hint:"Plánovač sám přepíná Home 1 / Home UPS podle plánu"},{key:"charge_rate_kw",label:"Nabíjecí výkon ze sítě (kW)",type:"number",min:.5,max:10,step:.1,hint:"Kolik kW box bere při nabíjení ze sítě (UPS)"},{key:"expensive_percentile",label:"Práh drahých hodin (%)",type:"number",min:50,max:95,step:5,scale:100,hint:"Importy nad tímto denním percentilem cen se plánovač snaží pokrýt levným přednabitím. Výchozí 70 %."},{key:"balancing_enabled",label:"Balancování článků",type:"bool",hint:"Pravidelné nabití na 100 % kvůli vyrovnání článků"},{key:"balancing_interval_days",label:"Interval balancování (dny)",type:"number",min:3,max:30,step:1},{key:"balancing_hold_hours",label:"Držení 100 % (hodiny)",type:"number",min:1,max:12,step:1},{key:"cheap_window_percentile",label:"Levné okno pro balancování (%)",type:"number",min:5,max:80,step:5,hint:"Balancování se plánuje do hodin pod tímto cenovým percentilem"}],Ug=[{key:"solar_forecast_provider",label:"Poskytovatel",type:"select",options:[["forecast_solar","forecast.solar"],["solcast","Solcast"]]},{key:"solcast_site_id",label:"Solcast site ID",type:"text",hint:"Jen pro Solcast (z rooftop site URL)"},{key:"solcast_api_key",label:"Solcast API klíč",type:"text",hint:"Nech prázdné = beze změny"},{key:"solar_forecast_latitude",label:"Zeměpisná šířka",type:"number",min:-90,max:90,step:1e-4},{key:"solar_forecast_longitude",label:"Zeměpisná délka",type:"number",min:-180,max:180,step:1e-4},{key:"solar_forecast_string1_enabled",label:"String 1 aktivní",type:"bool"},{key:"solar_forecast_string1_kwp",label:"String 1 výkon (kWp)",type:"number",min:.1,max:50,step:.1},{key:"solar_forecast_string1_declination",label:"String 1 sklon (°)",type:"number",min:0,max:90,step:1},{key:"solar_forecast_string1_azimuth",label:"String 1 azimut (°)",type:"number",min:-180,max:180,step:1,hint:"0 = jih, −90 = východ, 90 = západ"},{key:"solar_forecast_string2_enabled",label:"String 2 aktivní",type:"bool"},{key:"solar_forecast_string2_kwp",label:"String 2 výkon (kWp)",type:"number",min:.1,max:50,step:.1},{key:"solar_forecast_string2_declination",label:"String 2 sklon (°)",type:"number",min:0,max:90,step:1},{key:"solar_forecast_string2_azimuth",label:"String 2 azimut (°)",type:"number",min:-180,max:180,step:1}];function Yg(e){return e==="gas"?"Plyn — cena tepla včetně účinnosti kotle (např. 1,5 Kč/kWh)":e==="heat_pump"?"Tepelné čerpadlo — cena ≈ cena elektřiny / COP":e==="fireplace"?"Krb — orientační cena tepla z dřeva/pelet":"Zadej orientační cenu tepla v Kč/kWh"}const xe=[{key:"boiler_volume_l",label:"Objem nádrže (l)",type:"number",min:30,max:1e3,step:1,hint:"Jmenovitý objem zásobníku v litrech"},{key:"boiler_temp_sensor_top",label:"Čidlo teploty — vrchní",type:"text",hint:"ID entity senzoru teploty (např. sensor.bojler_top)",entity:{domain:"sensor"}},{key:"boiler_temp_sensor_bottom",label:"Čidlo teploty — spodní",type:"text",hint:"Jen pokud máš druhý teploměr (ID entity senzoru)",optional:!0,entity:{domain:"sensor"}},{key:"boiler_enable_second_thermometer",label:"Druhý teploměr aktivní",type:"bool",hint:"Zapni, pokud máš spodní čidlo teploty"},{key:"boiler_current_power_entity",label:"Senzor příkonu bojleru",type:"text",hint:"ID entity senzoru výkonu (W); upřesňuje plánovač",optional:!0,entity:{domain:"sensor"}},{key:"boiler_target_temp_c",label:"Cílová teplota (°C)",type:"number",min:40,max:85,step:1,hint:"Požadovaná teplota vody před deadline"},{key:"boiler_deadline_time",label:"Deadline (HH:MM)",type:"text",hint:"Čas, do kdy musí být voda nahřátá (formát HH:MM, např. 07:00)"},{key:"boiler_has_alternative_heating",label:"Alternativní zdroj tepla",type:"bool",hint:"Bojler má jiný zdroj ohřevu (plyn, TČ, krb…)"},{key:"boiler_alt_source_type",label:"Typ alternativního zdroje",type:"select",options:[["gas","Plyn"],["heat_pump","Tepelné čerpadlo"],["fireplace","Krb"],["other","Jiný"]]},{key:"boiler_alt_cost_kwh",label:"Cena tepla (Kč/kWh)",type:"number",min:0,max:20,step:.1,hint:"Cena tepla z alternativního zdroje v Kč/kWh"},{key:"boiler_alt_energy_sensor",label:"Senzor energie alt. zdroje",type:"text",hint:"ID entity senzoru energie (kWh)",optional:!0,entity:{domain:"sensor"}},{key:"boiler_alt_energy_daily",label:"Denní přírůstek energie",type:"bool",hint:"Zapni, pokud senzor měří denní (ne celkový) přírůstek"},{key:"box_has_home56",label:"Box má Home 5/6",type:"bool",hint:"Aktivuje Home 5/6 (OIG CBB) — umožňuje 🔋→🔥 ohřev z baterie"},{key:"boiler_home5_maneuver_enabled",label:"🔋→🔥 Ohřev z baterie",type:"bool",hint:"Plánovač může použít baterii k ohřevu (vyžaduje Home 5/6)"},{key:"boiler_battery_cycle_cost_czk_kwh",label:"Cena cyklu baterie (Kč/kWh)",type:"number",min:0,max:5,step:.05,hint:"Degradace baterie za kWh; plánovač porovná s cenou sítě"},{key:"boiler_circulation_enabled",label:"Cirkulace teplé vody",type:"bool",hint:"Zapnutí cirkulačního čerpadla TUV"},{key:"boiler_circulation_lead_minutes",label:"Předstih cirkulace (min)",type:"number",min:0,max:120,step:5,hint:"Jak dlouho před odběrem pustit čerpadlo"},{key:"boiler_circulation_run_minutes",label:"Délka běhu cirkulace (min)",type:"number",min:1,max:60,step:1},{key:"boiler_circulation_max_runs_per_day",label:"Max. počet běhů/den",type:"number",min:1,max:20,step:1},{key:"boiler_circulation_min_gap_minutes",label:"Min. pauza mezi běhy (min)",type:"number",min:10,max:480,step:10},{key:"boiler_legionella_interval_days",label:"Interval ochrany (dny)",type:"number",min:0,max:30,step:1,hint:"0 = vypnuto; doporučeno 7–14 dní"},{key:"boiler_legionella_target_temp_c",label:"Teplota dezinfekce (°C)",type:"number",min:60,max:75,step:1,hint:"Min. 60 °C pro spolehlivé usmrcení legionelly"}];function Zg(e){return e==="gas"?"plyn":e==="heat_pump"?"TČ":e==="fireplace"?"krb":e||"jiný"}function Qg(e,t,i,n,r){const a=[];if(e){const o=Zg(t),s=i!=null?` · ${Number(i).toFixed(1).replace(".",",")} Kč/kWh`:"";a.push(`${o}${s}`)}return n&&r&&a.push("🔋→🔥"),a.length===0?n?"Home 5/6":"pouze elektřina":a.join(" · ")}function Xg(e){return e?"zapnuto":"vypnuto"}function Jg(e){return e<=0?"vypnuto":`1×/${e} dní`}let et=class extends z{constructor(){super(...arguments),this.hassStates=null,this.config=null,this.loading=!0,this.pending={},this.saving=null,this.toast=null,this._entityCatalog=[],this._lastHassStates=null}connectedCallback(){super.connectedCallback(),this.refresh()}get entityCatalog(){return this.hassStates!==this._lastHassStates&&(this._lastHassStates=this.hassStates,this._entityCatalog=this.hassStates?Hg(this.hassStates):[]),this._entityCatalog}async refresh(){this.loading=!0,this.config=await Ar(),this.pending={},this.loading=!1}current(e,t){var r;const i=this.pending[e];if(i&&t in i)return i[t];const n=(r=this.config)==null?void 0:r[e];return n?n[t]:void 0}setPending(e,t,i){this.pending={...this.pending,[e]:{...this.pending[e]??{},[t]:i}}}isDirty(e){return Object.keys(this.pending[e]??{}).length>0}discardPending(e){this.pending={...this.pending,[e]:{}},this.toast=null}async save(e){const t=this.pending[e];if(!t||this.saving)return;this.saving=e,this.toast=null;const i=await Mc(e,t);if(this.saving=null,!i.ok){const n=i.fields?Object.entries(i.fields).map(([r,a])=>`${r}: ${a}`).join(", "):"uložení selhalo";this.toast={section:e,ok:!1,text:`✗ ${n}`};return}if(this.config&&(this.config={...this.config,[e]:{...this.config[e],...t}}),this.pending={...this.pending,[e]:{}},Kg.has(e))this.toast={section:e,ok:!0,text:"✓ Uloženo — integrace se restartuje…"},Tc(n=>{this.config=n,this.toast={section:e,ok:!0,text:"✓ Aplikováno"}},()=>{this.toast={section:e,ok:!0,text:"Integrace se restartuje déle než obvykle — obnov stránku"}});else{this.toast={section:e,ok:!0,text:"✓ Uloženo"},this.loading=!0;const n=await Ar();n&&(this.config=n),this.loading=!1}}renderLabel(e){return c`
      <span class="lab">
        ${e.label}${e.optional?c`<span class="optional-badge"> (volitelné)</span>`:_}
        ${e.hint?c`<span class="hint">${e.hint}</span>`:_}
      </span>`}renderField(e,t){const i=this.current(e,t.key),n=!!(this.pending[e]&&t.key in this.pending[e]);if(t.type==="bool"){const s=!!i;return c`
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
            <select class=${n?"dirty":""}
              @change=${d=>this.setPending(e,t.key,d.target.value)}>
              ${(t.options??[]).map(([d,p])=>c`<option value=${d} ?selected=${d===s}>${p}</option>`)}
            </select>
          </div>
        </div>`}if(t.type==="number"){const s=t.scale??1,d=i==null||i===""?"":String(Math.round((Number(i)*s+Number.EPSILON)*1e4)/1e4);return c`
        <div class="row">
          ${this.renderLabel(t)}
          <div class="row-control">
            <input type="number" class=${n?"dirty":""} .value=${d}
              min=${t.min??_} max=${t.max??_} step=${t.step??_}
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
              .dirty=${n}
              .entities=${this.entityCatalog}
              @entity-change=${d=>this.setPending(e,t.key,d.detail.value)}
            ></oig-entity-picker>
          </div>
        </div>`}const r=t.key.endsWith("api_key"),a=r&&!!this.current(e,`${t.key}_set`),o=r?"":String(i??"");return c`
      <div class="row">
        ${this.renderLabel(t)}
        <div class="row-control">
          <input type="text" class=${n?"dirty":""} .value=${o}
            placeholder=${r?a?"••••• (nastaveno)":"nenastaveno":t.optional?"nevyplněno":""}
            @change=${s=>this.setPending(e,t.key,s.target.value)} />
        </div>
      </div>`}renderCard(e,t,i,n){var o;const r=((o=this.toast)==null?void 0:o.section)===e?this.toast:null,a=this.isDirty(e);return c`
      <div class="card">
        <h2>${t}</h2>
        <div class="sub">${i}</div>
        ${n.map(s=>this.renderField(e,s))}
        <div class="actions">
          <button class="save" ?disabled=${!a||this.saving===e}
            @click=${()=>this.save(e)}>
            ${this.saving===e?"Ukládám…":"Uložit"}
          </button>
          ${r?c`<span class="toast ${r.ok?"ok":"err"}">${r.text}</span>`:_}
        </div>
      </div>`}renderFieldDisableable(e,t,i){if(t.type!=="bool")return this.renderField(e,t);const n=this.current(e,t.key),r=!i&&!!n;return c`
      <div class="row" style=${i?"opacity:0.45;pointer-events:none":""}>
        ${this.renderLabel(t)}
        <div class="row-control">
          <label class="switch">
            <input type="checkbox" .checked=${r} ?disabled=${i}
              @change=${a=>this.setPending(e,t.key,a.target.checked)} />
            <span class="slider"></span>
          </label>
        </div>
      </div>`}renderBoilerCard(){var S;const e="boiler",t=((S=this.toast)==null?void 0:S.section)===e?this.toast:null,i=!!this.current(e,"boiler_has_alternative_heating"),n=String(this.current(e,"boiler_alt_source_type")??"gas"),r=this.current(e,"boiler_alt_cost_kwh"),a=!!this.current(e,"box_has_home56"),o=!!this.current(e,"boiler_home5_maneuver_enabled"),s=!!this.current(e,"boiler_circulation_enabled"),d=Number(this.current(e,"boiler_legionella_interval_days")??0),p=!!this.current(e,"boiler_enable_second_thermometer"),u=this.isDirty(e),h={key:"boiler_alt_cost_kwh",label:"Cena tepla (Kč/kWh)",type:"number",min:0,max:20,step:.1,hint:Yg(n)},b={key:"boiler_home5_maneuver_enabled",label:"🔋→🔥 Ohřev z baterie",type:"bool",hint:a?"Plánovač použije baterii (Home 5) k ohřevu, pokud je levnější než síť":'Vyžaduje aktivaci „Box má Home 5/6" výše'},f=Qg(i,n,r,a,o),m=Xg(s),y=Jg(d);return c`
      <div class="card">
        <h2>🔥 Bojler</h2>
        <div class="sub">Parametry inteligentního ohřevu vody — mirroruje průvodce v HA.</div>

        <!-- ══ Nádrž a čidla — OPEN by default ══ -->
        <details class="bsec" open>
          <summary>Nádrž a čidla</summary>
          <div class="bsec-body">
            ${this.renderField(e,xe.find(x=>x.key==="boiler_volume_l"))}
            ${this.renderField(e,xe.find(x=>x.key==="boiler_temp_sensor_top"))}
            ${this.renderField(e,xe.find(x=>x.key==="boiler_enable_second_thermometer"))}
            ${p?this.renderField(e,xe.find(x=>x.key==="boiler_temp_sensor_bottom")):_}
            ${this.renderField(e,xe.find(x=>x.key==="boiler_current_power_entity"))}
            ${this.renderField(e,xe.find(x=>x.key==="boiler_target_temp_c"))}
            ${this.renderField(e,xe.find(x=>x.key==="boiler_deadline_time"))}
          </div>
        </details>

        <!-- ══ Zdroje tepla — collapsed ══ -->
        <details class="bsec">
          <summary>
            Zdroje tepla
            <span class="bsec-badge" data-testid="badge-sources">${f}</span>
          </summary>
          <div class="bsec-body">
            ${this.renderField(e,xe.find(x=>x.key==="boiler_has_alternative_heating"))}
            ${i?c`
              ${this.renderField(e,{...xe.find(x=>x.key==="boiler_alt_source_type"),hint:void 0})}
              ${this.renderField(e,h)}
              ${this.renderField(e,xe.find(x=>x.key==="boiler_alt_energy_sensor"))}
              ${this.renderField(e,xe.find(x=>x.key==="boiler_alt_energy_daily"))}
            `:_}
            ${this.renderField(e,xe.find(x=>x.key==="box_has_home56"))}
            <div class="note" style="margin-top:6px;margin-bottom:2px">
              Po změně „Box má Home 5/6" a uložení nastavení je nutné obnovit stránku (F5), aby se ovládací panel správně aktualizoval.
            </div>
            ${this.renderFieldDisableable(e,b,!a)}
            ${a?this.renderField(e,xe.find(x=>x.key==="boiler_battery_cycle_cost_czk_kwh")):_}
          </div>
        </details>

        <!-- ══ Cirkulace teplé vody — collapsed ══ -->
        <details class="bsec">
          <summary>
            Cirkulace teplé vody
            <span class="bsec-badge" data-testid="badge-circulation">${m}</span>
          </summary>
          <div class="bsec-body">
            ${this.renderField(e,xe.find(x=>x.key==="boiler_circulation_enabled"))}
            ${s?c`
              ${this.renderField(e,xe.find(x=>x.key==="boiler_circulation_lead_minutes"))}
              ${this.renderField(e,xe.find(x=>x.key==="boiler_circulation_run_minutes"))}
              ${this.renderField(e,xe.find(x=>x.key==="boiler_circulation_max_runs_per_day"))}
              ${this.renderField(e,xe.find(x=>x.key==="boiler_circulation_min_gap_minutes"))}
            `:_}
          </div>
        </details>

        <!-- ══ Ochrana proti legionelle — collapsed ══ -->
        <details class="bsec">
          <summary>
            Ochrana proti legionelle
            <span class="bsec-badge" data-testid="badge-legionella">${y}</span>
          </summary>
          <div class="bsec-body">
            ${this.renderField(e,xe.find(x=>x.key==="boiler_legionella_interval_days"))}
            ${d>0?this.renderField(e,xe.find(x=>x.key==="boiler_legionella_target_temp_c")):_}
          </div>
        </details>

        <!-- ══ Dirty bar / Actions ══ -->
        ${u?c`
          <div class="dirty-bar" data-testid="boiler-dirty-bar">
            <span class="dirty-bar-label">Neuložené změny</span>
            ${t?c`<span class="toast ${t.ok?"ok":"err"}">${t.text}</span>`:_}
            <button class="discard" @click=${()=>this.discardPending(e)}>Zahodit</button>
            <button class="save" ?disabled=${this.saving===e}
              @click=${()=>this.save(e)}>
              ${this.saving===e?"Ukládám…":"Uložit"}
            </button>
          </div>
        `:c`
          <div class="actions">
            <button class="save" disabled>Uložit</button>
            ${t?c`<span class="toast ${t.ok?"ok":"err"}">${t.text}</span>`:_}
          </div>
        `}
      </div>`}render(){return this.loading?c`<div class="loading">Načítání nastavení…</div>`:this.config?c`
      <div class="grid">
        ${this.renderCard("modules","🧩 Moduly","Zapnutí modulu přidá senzory a záložky; konfigurace níže.",qg)}
        ${this.renderCard("battery","🔋 Baterie a plánovač","Parametry ekonomického plánovače a balancování.",Gg)}
        ${this.renderCard("solar","☀️ Solární předpověď","Poskytovatel a geometrie stringů.",Ug)}
        ${this.renderBoilerCard()}
      </div>
    `:c`<div class="loading">Nastavení se nepodařilo načíst (vyžaduje administrátorský účet).</div>`}};et.styles=D`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 14px;
      align-items: start;
    }

    .card {
      background: ${oe(l.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${oe(l.cardShadow)};
      position: relative;
    }

    .card h2 {
      margin: 0 0 4px;
      font-size: 15px;
      color: ${oe(l.textPrimary)};
    }

    .card .sub {
      font-size: 11px;
      color: ${oe(l.textSecondary)};
      margin-bottom: 12px;
    }

    /* ---- Rows ---- */
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px dashed ${oe(l.divider)};
    }
    .row:last-of-type { border-bottom: none; }

    .lab {
      font-size: 12.5px;
      color: ${oe(l.textPrimary)};
      flex: 1;
      min-width: 0;
    }

    .hint {
      display: block;
      font-size: 10.5px;
      color: ${oe(l.textSecondary)};
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
      background: ${oe(l.bgSecondary)};
      color: ${oe(l.textPrimary)};
      border: 1px solid ${oe(l.divider)};
      border-radius: 7px;
      padding: 5px 8px;
      font-size: 12.5px;
      max-width: 120px;
    }
    input[type='text'] { max-width: 170px; }
    input.dirty, select.dirty { border-color: ${oe(l.accent)}; }

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
    .switch input:checked + .slider { background: ${oe(l.accent)}; }
    .switch input:checked + .slider:before { transform: translateX(18px); }

    /* ---- Actions ---- */
    .actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
    button.save {
      background: ${oe(l.accent)};
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
      color: ${oe(l.textSecondary)};
      background: rgba(120,160,255,0.08);
      border: 1px solid rgba(120,160,255,0.2);
      border-radius: 8px;
      padding: 8px 10px;
      margin-top: 12px;
      line-height: 1.45;
    }

    .loading { padding: 30px; text-align: center; color: ${oe(l.textSecondary)}; }

    /* ---- Group label (non-boiler cards) ---- */
    .group-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${oe(l.textSecondary)};
      margin: 12px 0 4px;
      padding-top: 6px;
      border-top: 1px solid ${oe(l.divider)};
    }
    .group-label:first-of-type { border-top: none; margin-top: 0; }

    /* ---- Optional badge ---- */
    .optional-badge {
      font-size: 10px;
      color: ${oe(l.textSecondary)};
      font-style: italic;
      margin-left: 2px;
    }

    /* ---- Collapsible boiler sub-sections ---- */
    .bsec {
      border-top: 1px solid ${oe(l.divider)};
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
      color: ${oe(l.textSecondary)};
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
      color: ${oe(l.textSecondary)};
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
      background: ${oe(l.cardBg)};
      border-top: 1px solid ${oe(l.accent)};
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
      color: ${oe(l.textSecondary)};
      flex: 1;
    }

    button.discard {
      background: transparent;
      border: 1px solid ${oe(l.divider)};
      color: ${oe(l.textSecondary)};
      border-radius: 7px;
      padding: 5px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    button.discard:hover { border-color: ${oe(l.textSecondary)}; }
  `;jt([g({attribute:!1})],et.prototype,"hassStates",2);jt([T()],et.prototype,"config",2);jt([T()],et.prototype,"loading",2);jt([T()],et.prototype,"pending",2);jt([T()],et.prototype,"saving",2);jt([T()],et.prototype,"toast",2);et=jt([E("oig-settings")],et);var eb=Object.defineProperty,tb=Object.getOwnPropertyDescriptor,it=(e,t,i,n)=>{for(var r=n>1?void 0:n?tb(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&eb(t,i,r),r};const V=Z;function ib(e,t,i,n){const r=Math.abs(e);return r===1?t:r>=2&&r<=4?i:n}function ls(e){return`${e} ${ib(e,"blok","bloky","bloků")}`}function cs(e){return`${e} přepnutí`}let At=class extends z{constructor(){super(...arguments),this.open=!1,this.activeTab="today",this.data=null,this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.open&&this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return Eo[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return c`
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
          <span class="mode-cost">${ne(e.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(e,t){const i=t.unit==="Kč"?ne(t.plan):`${t.plan.toFixed(1)} ${t.unit}`;let n="",r="";return t.hasActual&&t.actual!=null&&(r=t.unit==="Kč"?ne(t.actual):`${t.actual.toFixed(1)} ${t.unit}`,t.unit==="Kč"?n=t.actual<=t.plan?"better":"worse":n=t.actual>=t.plan?"better":"worse"),c`
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
              ${Oo[t]}
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
                ${t.backupSavings>=0?"+":""}${ne(t.backupSavings)}
              </span>
              <span class="bs-detail">
                záloha ${ne(t.backupActualCost??0)} vs. nedělat nic
                ${ne(t.backupBaselineCost??0)}
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
              Skutečné: <span class="progress-value">${ne(t.actualTotalCost)}</span>
            </div>
          `:null}
          ${t.planTotalCost!=null?c`
            <div class="progress-item">
              Plán: <span class="progress-value">${ne(t.planTotalCost)}</span>
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
          Predikce konce dne: <span class="eod-value">${ne(t.eodPrediction.predictedTotal)}</span>
          ${t.eodPrediction.predictedSavings>0?c`
            <span class="eod-savings"> (úspora ${ne(t.eodPrediction.predictedSavings)})</span>
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
          <div class="section-title">Režimy (${ls(e.modeBlocks.length)}, ${cs(t.modeSwitches)})</div>
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
    `}};At.styles=D`
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
      background: ${V(l.cardBg)};
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
      border-bottom: 1px solid ${V(l.divider)};
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${V(l.textPrimary)};
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
      color: ${V(l.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${V(l.bgSecondary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${V(l.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${V(l.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 12px 16px;
      border: none;
      background: transparent;
      font-size: 13px;
      color: ${V(l.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${V(l.textPrimary)};
    }

    .tab.active {
      color: ${V(l.accent)};
      border-bottom-color: ${V(l.accent)};
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
      color: ${V(l.textSecondary)};
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
      background: ${V(l.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
    }

    .metric-label {
      font-size: 11px;
      color: ${V(l.textSecondary)};
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
      color: ${V(l.textPrimary)};
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
      color: ${V(l.textPrimary)};
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
      color: ${V(l.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${V(l.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${V(l.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 12px;
      color: ${V(l.textSecondary)};
    }

    .eod-value {
      font-size: 16px;
      font-weight: 600;
      color: ${V(l.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: ${V(l.textSecondary)};
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
  `;it([g({type:Boolean,reflect:!0})],At.prototype,"open",2);it([g({type:String})],At.prototype,"activeTab",2);it([g({type:Object})],At.prototype,"data",2);it([T()],At.prototype,"autoRefresh",2);At=it([E("oig-timeline-dialog")],At);let pi=class extends z{constructor(){super(...arguments),this.data=null,this.activeTab="today",this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return Eo[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return c`
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
          <span class="mode-cost">${ne(e.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(e,t){const i=t.unit==="Kč"?ne(t.plan):`${t.plan.toFixed(1)} ${t.unit}`;let n="",r="";return t.hasActual&&t.actual!=null&&(r=t.unit==="Kč"?ne(t.actual):`${t.actual.toFixed(1)} ${t.unit}`,t.unit==="Kč"?n=t.actual<=t.plan?"better":"worse":n=t.actual>=t.plan?"better":"worse"),c`
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
              ${Oo[t]}
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
                ${t.backupSavings>=0?"+":""}${ne(t.backupSavings)}
              </span>
              <span class="bs-detail">
                záloha ${ne(t.backupActualCost??0)} vs. nedělat nic
                ${ne(t.backupBaselineCost??0)}
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
              Skutečné: <span class="progress-value">${ne(t.actualTotalCost)}</span>
            </div>
          `:null}
          ${t.planTotalCost!=null?c`
            <div class="progress-item">
              Plán: <span class="progress-value">${ne(t.planTotalCost)}</span>
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
          Predikce konce dne: <span class="eod-value">${ne(t.eodPrediction.predictedTotal)}</span>
          ${t.eodPrediction.predictedSavings>0?c`
            <span class="eod-savings"> (úspora ${ne(t.eodPrediction.predictedSavings)})</span>
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
          <div class="section-title">Režimy (${ls(e.modeBlocks.length)}, ${cs(t.modeSwitches)})</div>
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
    `}};pi.styles=D`
    :host {
      display: block;
    }

    .tile {
      background: ${V(l.cardBg)};
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
      border-bottom: 1px solid ${V(l.divider)};
    }

    .tile-title {
      font-size: 13px;
      font-weight: 600;
      color: ${V(l.textPrimary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${V(l.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${V(l.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 6px 10px;
      border: none;
      background: transparent;
      font-size: 11px;
      color: ${V(l.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${V(l.textPrimary)};
    }

    .tab.active {
      color: ${V(l.accent)};
      border-bottom-color: ${V(l.accent)};
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
      color: ${V(l.textSecondary)};
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
      background: ${V(l.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
    }

    .metric-label {
      font-size: 10px;
      color: ${V(l.textSecondary)};
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
      color: ${V(l.textPrimary)};
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
      color: ${V(l.textPrimary)};
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
      color: ${V(l.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${V(l.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${V(l.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${V(l.textSecondary)};
    }

    .eod-value {
      font-size: 14px;
      font-weight: 600;
      color: ${V(l.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 24px 16px;
      color: ${V(l.textSecondary)};
      font-size: 12px;
    }

    /* ---- Battery savings (záloha-only, fair) ---- */
    .backup-savings {
      background: ${V(l.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${V(l.textSecondary)};
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
  `;it([g({type:Object})],pi.prototype,"data",2);it([g({type:String})],pi.prototype,"activeTab",2);it([T()],pi.prototype,"autoRefresh",2);pi=it([E("oig-timeline-tile")],pi);var nb=Object.defineProperty,rb=Object.getOwnPropertyDescriptor,yt=(e,t,i,n)=>{for(var r=n>1?void 0:n?rb(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&nb(t,i,r),r};const he=Z;let ui=class extends z{constructor(){super(...arguments),this.data=null,this.editMode=!1,this.tileType="entity"}onTileClick(){var t;if(this.editMode)return;const e=(t=this.data)==null?void 0:t.config;e&&(e.type==="button"&&e.action?jc(e.entity_id,e.action):re.openEntityDialog(e.entity_id))}onSupportClick(e,t){e.stopPropagation(),!this.editMode&&re.openEntityDialog(t)}onEdit(){var e;this.dispatchEvent(new CustomEvent("edit-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}onDelete(){var e;this.dispatchEvent(new CustomEvent("delete-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}render(){var d,p;if(!this.data)return null;const e=this.data.config,t=e.type==="button";this.tileType!==e.type&&(this.tileType=e.type??"entity");const i=e.color||"",n=e.icon||(t?"⚡":"📊"),r=n.startsWith("mdi:")?Pn(n):n,a=(d=e.support_entities)==null?void 0:d.top_right,o=(p=e.support_entities)==null?void 0:p.bottom_right,s=this.data.supportValues.topRight||this.data.supportValues.bottomRight;return c`
      ${i?c`<style>:host { --tile-color: ${he(i)}; }</style>`:null}

      <div class="tile-top" @click=${this.onTileClick} title=${this.editMode?"":e.entity_id}>
        <span class="tile-icon">${r}</span>
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
    `}};ui.styles=D`
    /* ===== BASE ===== */
    :host {
      display: flex;
      flex-direction: column;
      padding: 10px 12px;
      background: ${he(l.cardBg)};
      border-radius: 10px;
      box-shadow: ${he(l.cardShadow)};
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
      color: ${he(l.textSecondary)};
      opacity: 0.45;
      font-style: normal;
    }

    /* ===== BUTTON TILE ===== */
    :host([tiletype="button"]) {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--tile-color, ${he(l.accent)}) 10%, ${he(l.cardBg)}),
        ${he(l.cardBg)}
      );
      border: 1px solid color-mix(in srgb, var(--tile-color, ${he(l.accent)}) 38%, transparent);
    }

    :host([tiletype="button"]:not([editmode]):hover) {
      transform: translateY(-2px);
      cursor: pointer;
      box-shadow:
        0 4px 14px color-mix(in srgb, var(--tile-color, ${he(l.accent)}) 28%, transparent),
        ${he(l.cardShadow)};
    }

    :host([tiletype="button"]:not([editmode]):active) {
      transform: translateY(0) scale(0.98);
      opacity: 0.85;
    }

    :host([tiletype="button"]) .tile-icon {
      background: color-mix(in srgb, var(--tile-color, ${he(l.accent)}) 18%, transparent);
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
      color: ${he(l.textSecondary)};
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
      color: ${he(l.textSecondary)};
      white-space: nowrap;
      line-height: 1.2;
    }

    .support-value.clickable {
      cursor: pointer;
    }

    .support-value.clickable:hover {
      text-decoration: underline;
      color: ${he(l.textPrimary)};
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
      color: ${he(l.textPrimary)};
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .tile-unit {
      font-size: 11px;
      font-weight: 400;
      color: ${he(l.textSecondary)};
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
      background: ${he(l.success)};
      box-shadow: 0 0 4px ${he(l.success)};
    }

    .state-dot.off {
      background: ${he(l.textSecondary)};
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
      background: ${he(l.bgSecondary)};
      border-radius: 50%;
      font-size: 9px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .delete-btn:hover {
      background: ${he(l.error)};
      color: #fff;
    }
  `;yt([g({type:Object})],ui.prototype,"data",2);yt([g({type:Boolean})],ui.prototype,"editMode",2);yt([g({type:String,reflect:!0})],ui.prototype,"tileType",2);ui=yt([E("oig-tile")],ui);let hi=class extends z{constructor(){super(...arguments),this.tiles=[],this.editMode=!1,this.position="left"}render(){return this.tiles.length===0?c`<div class="empty-state">Žádné dlaždice</div>`:c`
      ${this.tiles.map(e=>c`
        <oig-tile
          .data=${e}
          .editMode=${this.editMode}
          .tileType=${e.config.type??"entity"}
          class="${e.isZero?"inactive":""}"
        ></oig-tile>
      `)}
    `}};hi.styles=D`
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }

    .empty-state {
      font-size: 12px;
      color: ${he(l.textSecondary)};
      padding: 8px;
      text-align: center;
      opacity: 0.6;
    }
  `;yt([g({type:Array})],hi.prototype,"tiles",2);yt([g({type:Boolean})],hi.prototype,"editMode",2);yt([g({type:String,reflect:!0})],hi.prototype,"position",2);hi=yt([E("oig-tiles-container")],hi);var ab=Object.defineProperty,ob=Object.getOwnPropertyDescriptor,ta=(e,t,i,n)=>{for(var r=n>1?void 0:n?ob(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&ab(t,i,r),r};const ce=Z,ao={Spotrebice:["fridge","fridge-outline","dishwasher","washing-machine","tumble-dryer","stove","microwave","coffee-maker","kettle","toaster","blender","food-processor","rice-cooker","slow-cooker","pressure-cooker","air-fryer","oven","range-hood"],Osvetleni:["lightbulb","lightbulb-outline","lamp","ceiling-light","floor-lamp","led-strip","led-strip-variant","wall-sconce","chandelier","desk-lamp","spotlight","light-switch"],"Vytapeni & Chlazeni":["thermometer","thermostat","radiator","radiator-disabled","heat-pump","air-conditioner","fan","hvac","fire","snowflake","fireplace","heating-coil"],"Energie & Baterie":["lightning-bolt","flash","battery","battery-charging","battery-50","battery-10","solar-panel","solar-power","meter-electric","power-plug","power-socket","ev-plug","transmission-tower","current-ac","current-dc"],"Auto & Doprava":["car","car-electric","car-battery","ev-station","ev-plug-type2","garage","garage-open","motorcycle","bicycle","scooter","bus","train","airplane"],Zabezpeceni:["door","door-open","lock","lock-open","shield-home","cctv","camera","motion-sensor","alarm-light","bell","eye","key","fingerprint","shield-check"],"Okna & Stineni":["window-closed","window-open","blinds","blinds-open","curtains","roller-shade","window-shutter","balcony","door-sliding"],"Media & Zabava":["television","speaker","speaker-wireless","music","volume-high","cast","chromecast","radio","headphones","microphone","gamepad","movie","spotify"],"Sit & IT":["router-wireless","wifi","access-point","lan","network","home-assistant","server","nas","cloud","ethernet","bluetooth","cellphone","tablet","laptop"],"Voda & Koupelna":["water","water-percent","water-boiler","water-pump","shower","toilet","faucet","pipe","bathtub","sink","water-heater","pool"],Pocasi:["weather-sunny","weather-cloudy","weather-night","weather-rainy","weather-snowy","weather-windy","weather-fog","weather-lightning","weather-hail","temperature","humidity","barometer"],"Ventilace & Kvalita vzduchu":["fan","air-filter","air-purifier","smoke-detector","co2","wind-turbine"],"Zahrada & Venku":["flower","tree","sprinkler","grass","garden-light","outdoor-lamp","grill","pool","hot-tub","umbrella","thermometer-lines"],Domacnost:["iron","vacuum","broom","mop","washing","basket","hanger","scissors"],"Notifikace & Stav":["information","help-circle","alert-circle","checkbox-marked-circle","check","close","minus","plus","arrow-up","arrow-down","refresh","sync","bell-ring"],Ovladani:["toggle-switch","power","play","pause","stop","skip-next","skip-previous","volume-up","volume-down","brightness-up","brightness-down"],"Cas & Planovani":["clock","timer","alarm","calendar","calendar-clock","schedule","history"],Ostatni:["home","cog","tools","wrench","hammer","chart-line","gauge","dots-vertical","menu","settings","account","logout"]};let Ji=class extends z{constructor(){super(...arguments),this.isOpen=!1,this.searchQuery=""}get filteredCategories(){const e=this.searchQuery.trim().toLowerCase();if(!e)return ao;const t=Object.entries(ao).map(([i,n])=>{const r=n.filter(a=>a.toLowerCase().includes(e));return[i,r]}).filter(([,i])=>i.length>0);return Object.fromEntries(t)}open(){this.isOpen=!0}close(){this.isOpen=!1,this.searchQuery=""}onOverlayClick(e){e.target===e.currentTarget&&this.close()}onSearchInput(e){const t=e.target;this.searchQuery=(t==null?void 0:t.value)??""}onIconClick(e){this.dispatchEvent(new CustomEvent("icon-selected",{detail:{icon:`mdi:${e}`},bubbles:!0,composed:!0})),this.close()}render(){if(!this.isOpen)return null;const e=this.filteredCategories,t=Object.entries(e);return c`
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
                      <span class="icon-emoji">${Pn(r)}</span>
                      <span class="icon-name">${r}</span>
                    </button>
                  `)}
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}};Ji.styles=D`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${ce(l.bgPrimary)} 35%, transparent);
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
      background: ${ce(l.cardBg)};
      box-shadow: ${ce(l.cardShadow)};
      border-radius: 14px;
      border: 1px solid ${ce(l.divider)};
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
      border-bottom: 1px solid ${ce(l.divider)};
      gap: 12px;
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${ce(l.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${ce(l.bgSecondary)};
      color: ${ce(l.textPrimary)};
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
      background: ${ce(l.divider)};
      transform: scale(1.05);
    }

    .search {
      padding: 12px 18px;
      border-bottom: 1px solid ${ce(l.divider)};
      background: ${ce(l.bgSecondary)};
    }

    .search input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${ce(l.divider)};
      background: ${ce(l.bgPrimary)};
      color: ${ce(l.textPrimary)};
      font-size: 13px;
      outline: none;
    }

    .search input::placeholder {
      color: ${ce(l.textSecondary)};
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
      color: ${ce(l.textSecondary)};
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
      background: ${ce(l.bgSecondary)};
      cursor: pointer;
      transition: transform 0.15s ease, border 0.2s ease, background 0.2s ease;
      text-align: center;
      font-size: 10px;
      color: ${ce(l.textSecondary)};
    }

    .icon-item:hover {
      background: ${ce(l.bgPrimary)};
      border-color: ${ce(l.accent)};
      transform: translateY(-2px);
      color: ${ce(l.textPrimary)};
    }

    .icon-emoji {
      font-size: 22px;
      line-height: 1;
      color: ${ce(l.textPrimary)};
    }

    .icon-name {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      font-size: 12px;
      color: ${ce(l.textSecondary)};
      text-align: center;
      padding: 24px 0 12px;
    }
  `;ta([g({type:Boolean,reflect:!0,attribute:"open"})],Ji.prototype,"isOpen",2);ta([T()],Ji.prototype,"searchQuery",2);Ji=ta([E("oig-icon-picker")],Ji);var sb=Object.defineProperty,lb=Object.getOwnPropertyDescriptor,ve=(e,t,i,n)=>{for(var r=n>1?void 0:n?lb(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&sb(t,i,r),r};const B=Z;let ue=class extends z{constructor(){super(...arguments),this.isOpen=!1,this.tileIndex=-1,this.tileSide="left",this.existingConfig=null,this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}loadTileConfig(e){var t,i;this.currentTab=e.type,e.type==="entity"?this.selectedEntityId=e.entity_id:this.selectedButtonEntityId=e.entity_id,this.label=e.label||"",this.icon=e.icon||"",this.color=e.color||"#03A9F4",this.action=e.action||"toggle",this.supportEntity1=((t=e.support_entities)==null?void 0:t.top_right)||"",this.supportEntity2=((i=e.support_entities)==null?void 0:i.bottom_right)||""}resetForm(){this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}handleClose(){this.isOpen=!1,this.resetForm(),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}getEntities(){const e=st();return e?e.getAll():{}}getEntityItems(e,t){const i=t.trim().toLowerCase(),n=this.getEntities();return Object.entries(n).filter(([a])=>e.some(o=>a.startsWith(o))).map(([a,o])=>{const s=this.getAttributeValue(o,"friendly_name")||a,d=this.getAttributeValue(o,"unit_of_measurement"),p=this.getAttributeValue(o,"icon");return{id:a,name:s,value:o.state,unit:d,icon:p,state:o}}).filter(a=>i?a.name.toLowerCase().includes(i)||a.id.toLowerCase().includes(i):!0).sort((a,o)=>a.name.localeCompare(o.name))}getSupportEntities(e){const t=e.trim().toLowerCase();if(!t)return[];const i=this.getEntities();return Object.entries(i).map(([n,r])=>{const a=this.getAttributeValue(r,"friendly_name")||n,o=this.getAttributeValue(r,"unit_of_measurement"),s=this.getAttributeValue(r,"icon");return{id:n,name:a,value:r.state,unit:o,icon:s,state:r}}).filter(n=>n.name.toLowerCase().includes(t)||n.id.toLowerCase().includes(t)).sort((n,r)=>n.name.localeCompare(r.name)).slice(0,20)}getDisplayIcon(e){return e?e.startsWith("mdi:")?Pn(e):e:Pn("")}getColorForEntity(e){switch(e.split(".")[0]){case"sensor":return"#03A9F4";case"binary_sensor":return"#4CAF50";case"switch":return"#FFC107";case"light":return"#FF9800";case"fan":return"#00BCD4";case"input_boolean":return"#9C27B0";default:return"#03A9F4"}}applyEntityDefaults(e){if(!e)return;const i=this.getEntities()[e];if(!i)return;this.label||(this.label=this.getAttributeValue(i,"friendly_name"));const n=this.getAttributeValue(i,"icon");!this.icon&&n&&(this.icon=n),this.color=this.getColorForEntity(e)}handleEntitySelect(e){this.selectedEntityId=e,this.applyEntityDefaults(e)}handleButtonEntitySelect(e){this.selectedButtonEntityId=e,this.applyEntityDefaults(e)}handleSupportInput(e,t){const i=t.trim();e===1?(this.supportSearch1=t,this.showSupportList1=!!i,i||(this.supportEntity1="")):(this.supportSearch2=t,this.showSupportList2=!!i,i||(this.supportEntity2=""))}handleSupportSelect(e,t){const i=t.name||t.id;e===1?(this.supportEntity1=t.id,this.supportSearch1=i,this.showSupportList1=!1):(this.supportEntity2=t.id,this.supportSearch2=i,this.showSupportList2=!1)}getSupportInputValue(e,t){if(e)return e;if(!t)return"";const i=this.getEntities()[t];return i&&this.getAttributeValue(i,"friendly_name")||t}getAttributeValue(e,t){var n;const i=(n=e.attributes)==null?void 0:n[t];return i==null?"":String(i)}handleSave(){const e=this.currentTab==="entity"?this.selectedEntityId:this.selectedButtonEntityId;if(!e){window.alert("Vyberte entitu");return}const t={top_right:this.supportEntity1||void 0,bottom_right:this.supportEntity2||void 0},i={type:this.currentTab,entity_id:e,label:this.label||void 0,icon:this.icon||void 0,color:this.color||void 0,action:this.currentTab==="button"?this.action:void 0,support_entities:t};this.dispatchEvent(new CustomEvent("tile-saved",{detail:{index:this.tileIndex,side:this.tileSide,config:i},bubbles:!0,composed:!0})),this.handleClose()}onIconSelected(e){var t;this.icon=((t=e.detail)==null?void 0:t.icon)||"",this.iconPickerOpen=!1}renderEntityList(e,t,i,n){const r=this.getEntityItems(e,t);return r.length===0?c`<div class="support-empty">Žádné entity nenalezeny</div>`:c`
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
    `:null}};ue.styles=D`
    :host {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      font-family: ${B(l.fontFamily)};
    }

    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${B(l.bgPrimary)} 35%, transparent);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .dialog {
      width: min(520px, 100%);
      max-height: 85vh;
      background: ${B(l.cardBg)};
      border: 1px solid ${B(l.divider)};
      border-radius: 16px;
      box-shadow: ${B(l.cardShadow)};
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
      border-bottom: 1px solid ${B(l.divider)};
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${B(l.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${B(l.bgSecondary)};
      color: ${B(l.textPrimary)};
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
      background: ${B(l.divider)};
      transform: scale(1.05);
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 18px;
      background: ${B(l.bgSecondary)};
      border-bottom: 1px solid ${B(l.divider)};
    }

    .tab-btn {
      border: 1px solid transparent;
      background: ${B(l.cardBg)};
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: ${B(l.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: border 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }

    .tab-btn.active {
      border-color: ${B(l.accent)};
      color: ${B(l.textPrimary)};
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
      color: ${B(l.textSecondary)};
      font-weight: 600;
    }

    .input,
    select,
    .color-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${B(l.divider)};
      background: ${B(l.bgPrimary)};
      color: ${B(l.textPrimary)};
      font-size: 12px;
      outline: none;
      transition: border 0.2s ease, box-shadow 0.2s ease;
    }

    .input::placeholder {
      color: ${B(l.textSecondary)};
    }

    .input:focus,
    select:focus,
    .color-input:focus {
      border-color: ${B(l.accent)};
      box-shadow: 0 0 0 2px color-mix(in srgb, ${B(l.accent)} 20%, transparent);
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
      border: 1px dashed ${B(l.divider)};
      display: grid;
      place-items: center;
      font-size: 22px;
      cursor: pointer;
      background: ${B(l.bgSecondary)};
      transition: border 0.2s ease, transform 0.2s ease;
    }

    .icon-preview:hover {
      border-color: ${B(l.accent)};
      transform: translateY(-1px);
    }

    .icon-field {
      font-size: 11px;
    }

    .icon-btn {
      border: none;
      background: ${B(l.bgSecondary)};
      color: ${B(l.textPrimary)};
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .divider {
      height: 1px;
      background: ${B(l.divider)};
      margin: 6px 0;
      opacity: 0.8;
    }

    .entity-list {
      border: 1px solid ${B(l.divider)};
      border-radius: 12px;
      overflow: hidden;
      max-height: 200px;
      overflow-y: auto;
      background: ${B(l.bgPrimary)};
    }

    .entity-item {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid ${B(l.divider)};
      cursor: pointer;
      align-items: center;
      transition: background 0.2s ease;
    }

    .entity-item:last-child {
      border-bottom: none;
    }

    .entity-item:hover {
      background: ${B(l.bgSecondary)};
    }

    .entity-item.selected {
      background: color-mix(in srgb, ${B(l.accent)} 16%, transparent);
      border-left: 3px solid ${B(l.accent)};
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
      color: ${B(l.textPrimary)};
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-sub {
      font-size: 10px;
      color: ${B(l.textSecondary)};
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
      background: ${B(l.cardBg)};
      border: 1px solid ${B(l.divider)};
      border-radius: 12px;
      z-index: 10;
      max-height: 180px;
      overflow-y: auto;
      box-shadow: ${B(l.cardShadow)};
    }

    .support-item {
      padding: 10px 12px;
      border-bottom: 1px solid ${B(l.divider)};
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
      background: ${B(l.bgSecondary)};
    }

    .support-name {
      font-size: 12px;
      color: ${B(l.textPrimary)};
      font-weight: 600;
    }

    .support-value {
      font-size: 10px;
      color: ${B(l.textSecondary)};
    }

    .support-empty {
      padding: 12px;
      font-size: 11px;
      color: ${B(l.textSecondary)};
      text-align: center;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px 18px;
      border-top: 1px solid ${B(l.divider)};
      background: ${B(l.bgSecondary)};
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
      background: ${B(l.bgPrimary)};
      color: ${B(l.textPrimary)};
      border: 1px solid ${B(l.divider)};
    }

    .btn-primary {
      background: ${B(l.accent)};
      color: #fff;
      box-shadow: 0 6px 14px color-mix(in srgb, ${B(l.accent)} 40%, transparent);
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
  `;ve([g({type:Boolean,reflect:!0,attribute:"open"})],ue.prototype,"isOpen",2);ve([g({type:Number})],ue.prototype,"tileIndex",2);ve([g({attribute:!1})],ue.prototype,"tileSide",2);ve([g({attribute:!1})],ue.prototype,"existingConfig",2);ve([T()],ue.prototype,"currentTab",2);ve([T()],ue.prototype,"entitySearchText",2);ve([T()],ue.prototype,"buttonSearchText",2);ve([T()],ue.prototype,"selectedEntityId",2);ve([T()],ue.prototype,"selectedButtonEntityId",2);ve([T()],ue.prototype,"label",2);ve([T()],ue.prototype,"icon",2);ve([T()],ue.prototype,"color",2);ve([T()],ue.prototype,"action",2);ve([T()],ue.prototype,"supportEntity1",2);ve([T()],ue.prototype,"supportEntity2",2);ve([T()],ue.prototype,"supportSearch1",2);ve([T()],ue.prototype,"supportSearch2",2);ve([T()],ue.prototype,"showSupportList1",2);ve([T()],ue.prototype,"showSupportList2",2);ve([T()],ue.prototype,"iconPickerOpen",2);ue=ve([E("oig-tile-dialog")],ue);var cb=Object.defineProperty,db=Object.getOwnPropertyDescriptor,ae=(e,t,i,n)=>{for(var r=n>1?void 0:n?db(t,i):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(r=(n?o(t,i,r):o(r))||r);return n&&r&&cb(t,i,r),r};const Te=Z,oo=new URLSearchParams(window.location.search),Ct=oo.get("sn")||oo.get("inverter_sn")||"",so=`sensor.oig_${Ct}_`,pb=[{id:"flow",label:"Toky",icon:"⚡"},{id:"pricing",label:"Ceny",icon:"💰"},{id:"boiler",label:"Bojler",icon:"🔥"},{id:"settings",label:"Nastavení",icon:"⚙️"}];let J=class extends z{constructor(){super(...arguments),this.hass=null,this.loading=!0,this.error=null,this.activeTab="flow",this.editMode=!1,this.time="",this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1,this.flowData=Rr,this.pricingData=null,this.pricingLoading=!1,this.boilerState=null,this.boilerLoading=!1,this.boilerV2Data=null,this.boilerConfig=null,this.boilerRefreshTimer=null,this.boxHasHome56=!1,this.analyticsData=Ea,this.chmuData=Fi,this.chmuModalOpen=!1,this.timelineTab="today",this.timelineData=null,this.tilesConfig=null,this.tilesLeft=[],this.tilesRight=[],this.tileDialogOpen=!1,this.editingTileIndex=-1,this.editingTileSide="left",this.editingTileConfig=null,this.entityStore=null,this.timeInterval=null,this.stateWatcherUnsub=null,this.tileEntityUnsubs=[],this.pricingDirty=!1,this.timelineDirty=!1,this.analyticsDirty=!1,this.boilerDirty=!1,this.reconnecting=!1,this.throttledUpdateFlow=fr(()=>this.updateFlowData(),500),this.throttledUpdateSensors=fr(()=>this.updateSensorData(),1e3),this.throttledRefreshDerivedData=fr(()=>this.refreshDerivedData(),5e3),this.onPageShow=()=>{this.rebindHassContext()},this.onDocumentVisibilityChange=()=>{document.visibilityState==="visible"&&this.rebindHassContext()}}get boilerLang(){return Pc(this.hass)}connectedCallback(){super.connectedCallback(),window.addEventListener("pageshow",this.onPageShow),document.addEventListener("visibilitychange",this.onDocumentVisibilityChange),this.initApp(),this.startTimeUpdate()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("pageshow",this.onPageShow),document.removeEventListener("visibilitychange",this.onDocumentVisibilityChange),this.cleanup()}updated(e){e.has("hass")&&!e.has("loading")&&this.rebindHassContext(),e.has("activeTab")&&(this.activeTab==="pricing"&&(!this.pricingData||this.pricingDirty)&&this.loadPricingData(),this.activeTab==="pricing"&&(this.analyticsData===Ea||this.analyticsDirty)&&this.loadAnalyticsAsync(),this.activeTab==="pricing"&&(!this.timelineData||this.timelineDirty)&&this.loadTimelineTabData(this.timelineTab),this.activeTab==="boiler"&&(!this.boilerState||this.boilerDirty)&&this.loadBoilerDataAsync())}async initApp(){try{const e=await re.getHass();if(!e)throw new Error("Cannot access Home Assistant context");this.hass=e,this.entityStore=fl(e,Ct),await Pt.start({getHass:()=>re.getHassSync(),prefixes:[so]}),this.stateWatcherUnsub=Pt.onEntityChange((t,i)=>{this.syncHassState(t,i),this.throttledUpdateFlow(),this.throttledUpdateSensors(),this.throttledRefreshDerivedData()}),le.start(),this.updateFlowData(),this.updateSensorData(),this.loadPricingData(),this.loadBoilerDataAsync(),this.loadAnalyticsAsync(),this.loadTilesAsync(),this.loadBoxHasHome56(),this.boilerRefreshTimer=window.setInterval(()=>{this.activeTab==="boiler"&&document.visibilityState!=="hidden"&&this.loadBoilerDataAsync()},3e4),this.loading=!1,C.info("App initialized",{entities:Object.keys(e.states||{}).length,inverterSn:Ct})}catch(e){this.error=e.message,this.loading=!1,C.error("App init failed",e)}}cleanup(){var e,t;(e=this.stateWatcherUnsub)==null||e.call(this),this.stateWatcherUnsub=null,Pt.stop(),le.stop(),this.tileEntityUnsubs.forEach(i=>i()),this.tileEntityUnsubs=[],(t=this.entityStore)==null||t.destroy(),this.entityStore=null,this.timeInterval!==null&&(clearInterval(this.timeInterval),this.timeInterval=null),this.boilerRefreshTimer!==null&&(clearInterval(this.boilerRefreshTimer),this.boilerRefreshTimer=null)}async rebindHassContext(){var e;if(!this.reconnecting){this.reconnecting=!0;try{const t=await re.refreshHass();if(!t)return;this.hass=t,(e=this.entityStore)==null||e.updateHass(t),await Pt.start({getHass:()=>re.getHassSync(),prefixes:[so]}),this.updateFlowData(),this.updateSensorData()}catch(t){C.error("Failed to rebind hass context",t)}finally{this.reconnecting=!1}}}updateFlowData(){var e;if(this.hass)try{const t=((e=this.entityStore)==null?void 0:e.getAll())??this.hass;this.flowData=Al(t,Ct)}catch(t){C.error("Failed to extract flow data",t)}}updateSensorData(){if(this.chmuData=Lc(Ct),this.activeTab==="pricing"&&(this.analyticsData={...this.analyticsData,...Ec()}),this.tilesConfig){const e=Si(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}}updateTilesImmediate(){if(!this.tilesConfig)return;const e=Si(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}subscribeTileEntities(){if(this.tileEntityUnsubs.forEach(t=>t()),this.tileEntityUnsubs=[],!this.tilesConfig||!this.entityStore)return;const e=new Set;[...this.tilesConfig.tiles_left,...this.tilesConfig.tiles_right].forEach(t=>{var i,n;t&&(e.add(t.entity_id),(i=t.support_entities)!=null&&i.top_right&&e.add(t.support_entities.top_right),(n=t.support_entities)!=null&&n.bottom_right&&e.add(t.support_entities.bottom_right))});for(const t of e){const i=this.entityStore.subscribe(t,()=>{this.updateTilesImmediate()});this.tileEntityUnsubs.push(i)}}async loadPricingData(){if(!(!this.hass||this.pricingLoading)){this.pricingLoading=!0;try{const e=await Ci(()=>Jl(this.hass));this.pricingData=e,this.pricingDirty=!1}catch(e){C.error("Failed to load pricing data",e)}finally{this.pricingLoading=!1}}}async loadBoilerDataAsync(){if(!(!this.hass||this.boilerLoading)){this.boilerLoading=!0;try{const e=await Ci(()=>Cc(this.hass));this.boilerState=e.state,this.boilerV2Data=e.v2Data,this.boilerConfig=e.config,this.boilerDirty=!1,this.boilerRefreshTimer||(this.boilerRefreshTimer=window.setInterval(()=>this.loadBoilerDataAsync(),5*60*1e3))}catch(e){C.error("Failed to load boiler data",e)}finally{this.boilerLoading=!1}}}async loadAnalyticsAsync(){try{this.analyticsData=await Ci(()=>zc(Ct)),this.analyticsDirty=!1}catch(e){C.error("Failed to load analytics",e)}}async loadBoxHasHome56(){var e;try{const t=await Ar();this.boxHasHome56=((e=t==null?void 0:t.boiler)==null?void 0:e.box_has_home56)===!0}catch{}}async loadTilesAsync(){try{this.tilesConfig=await Ci(()=>Nc());const e=Si(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right,this.subscribeTileEntities()}catch(e){C.error("Failed to load tiles config",e)}}async loadTimelineTabData(e){try{this.timelineData=await Ci(()=>Ic(Ct,e)),this.timelineDirty=!1}catch(t){C.error(`Failed to load timeline tab: ${e}`,t)}}syncHassState(e,t){if(this.hass){if(this.hass.states||(this.hass.states={}),t){this.hass.states[e]=t;return}delete this.hass.states[e]}}refreshDerivedData(){if(this.pricingDirty=!0,this.timelineDirty=!0,this.analyticsDirty=!0,this.boilerDirty=!0,this.activeTab==="pricing"){Hl(),this.loadPricingData(),this.loadTimelineTabData(this.timelineTab),this.loadAnalyticsAsync();return}this.activeTab==="boiler"&&this.loadBoilerDataAsync()}startTimeUpdate(){const e=()=>{this.time=new Date().toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})};e(),this.timeInterval=window.setInterval(e,1e3)}onTabChange(e){this.activeTab=e.detail.tabId}onGridChargingOpen(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-grid-charging-dialog");e==null||e.show()}onEditClick(){this.editMode=!this.editMode}onResetClick(){var i,n;const e=(i=this.shadowRoot)==null?void 0:i.querySelector("oig-flow-canvas");e!=null&&e.resetLayout&&e.resetLayout();const t=(n=this.shadowRoot)==null?void 0:n.querySelector("oig-grid");t&&t.resetLayout()}onToggleLeftPanel(){this.leftPanelCollapsed=!this.leftPanelCollapsed}onToggleRightPanel(){this.rightPanelCollapsed=!this.rightPanelCollapsed}onChmuBadgeClick(){this.chmuModalOpen=!0}onChmuModalClose(){this.chmuModalOpen=!1}onTimelineTabChange(e){this.timelineTab=e.detail.tab,this.loadTimelineTabData(e.detail.tab)}onTimelineRefresh(){this.loadTimelineTabData(this.timelineTab)}onEditTile(e){const{entityId:t}=e.detail;let i=-1,n="left",r=null;if(this.tilesConfig){const a=this.tilesConfig.tiles_left.findIndex(o=>o&&o.entity_id===t);if(a>=0)i=a,n="left",r=this.tilesConfig.tiles_left[a];else{const o=this.tilesConfig.tiles_right.findIndex(s=>s&&s.entity_id===t);o>=0&&(i=o,n="right",r=this.tilesConfig.tiles_right[o])}}this.editingTileIndex=i,this.editingTileSide=n,this.editingTileConfig=r,this.tileDialogOpen=!0,r&&requestAnimationFrame(()=>{var o;const a=(o=this.shadowRoot)==null?void 0:o.querySelector("oig-tile-dialog");a==null||a.loadTileConfig(r)})}onDeleteTile(e){const{entityId:t}=e.detail;if(!this.tilesConfig||!t)return;const i={...this.tilesConfig};i.tiles_left=i.tiles_left.map(r=>r&&r.entity_id===t?null:r),i.tiles_right=i.tiles_right.map(r=>r&&r.entity_id===t?null:r),this.tilesConfig=i;const n=Si(i);this.tilesLeft=n.left,this.tilesRight=n.right,Aa(i),this.subscribeTileEntities()}onTileSaved(e){const{index:t,side:i,config:n}=e.detail;if(!this.tilesConfig)return;const r={...this.tilesConfig},a=i==="left"?[...r.tiles_left]:[...r.tiles_right];if(t>=0&&t<a.length)a[t]=n;else{const s=a.findIndex(d=>d===null);s>=0?a[s]=n:a.push(n)}i==="left"?r.tiles_left=a:r.tiles_right=a,this.tilesConfig=r;const o=Si(r);this.tilesLeft=o.left,this.tilesRight=o.right,Aa(r),this.subscribeTileEntities()}onTileDialogClose(){this.tileDialogOpen=!1,this.editingTileConfig=null,this.editingTileIndex=-1}_renderBoilerTabSafe(){try{return this._buildBoilerTabContent()}catch(e){return C.error("Boiler tab render failed",e),c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${"render_failed"}></oig-boiler-unavailable-state>`}}_buildBoilerTabContent(){var o,s,d;const e=this.boilerV2Data;if(this.boilerLoading&&!e)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="loading" message=""></oig-boiler-unavailable-state>`;if(e!=null&&e.loadError)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${e.loadError}></oig-boiler-unavailable-state>`;const t=(((o=e==null?void 0:e.explanation)==null?void 0:o.degradedReasons)??[]).filter(p=>p!=="config_profile_unavailable");if(e&&e.status===null&&t.length>0)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="degraded" .message=${t.join(", ")}></oig-boiler-unavailable-state>`;if(!e)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="unavailable" message="Data bojleru nejsou k dispozici"></oig-boiler-unavailable-state>`;const i=((s=e.explanation)==null?void 0:s.dataAgeSecs)??null,n=i!==null&&i>600,r=(((d=e.status)==null?void 0:d.degraded)??!1)&&t.length>0,a=n||r?c`<div class="boiler-status-chip-row">
          <span class="boiler-badge boiler-badge--age" data-testid="boiler-stale-chip">
            ${r?"⚠ Plán v degradovaném režimu":`⚠ Data stará ${Math.round((i??0)/60)} min`}
          </span>
        </div>`:_;return c`
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
          .tabs=${pb}
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
                `:_}
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
               `:_}
               ${this._renderBoilerTabSafe()}
             </div>

             <!-- ===== SETTINGS TAB ===== -->
             <div class="tab-content ${this.activeTab==="settings"?"active":""}">
               ${this.activeTab==="settings"?c`<oig-settings .hassStates=${((t=this.hass)==null?void 0:t.states)??null}></oig-settings>`:_}
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
    `}};J.styles=D`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      font-family: ${Te(l.fontFamily)};
      color: ${Te(l.textPrimary)};
      background: ${Te(l.bgPrimary)};
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
      color: ${Te(l.textSecondary)};
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid ${Te(l.divider)};
      border-top-color: ${Te(l.accent)};
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
      color: ${Te(l.error)};
      text-align: center;
      animation: fadeIn 0.3s ease;
    }

    .error h2 {
      margin-bottom: 8px;
    }

    .error button {
      margin-top: 12px;
      padding: 8px 16px;
      background: ${Te(l.accent)};
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
      background: ${Te(l.bgSecondary)};
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
      background: ${Te(l.cardBg)};
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      font-size: 12px;
      color: ${Te(l.textSecondary)};
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
      background: ${Te(l.cardBg)};
      border: 1px solid ${Te(l.divider)};
      border-radius: 8px;
      font-size: 13px;
      color: ${Te(l.textSecondary)};
    }

    .boiler-setup-guide__icon {
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
    }

    .boiler-setup-guide__text strong {
      display: block;
      color: ${Te(l.textPrimary)};
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
  `;ae([g({type:Object})],J.prototype,"hass",2);ae([T()],J.prototype,"loading",2);ae([T()],J.prototype,"error",2);ae([T()],J.prototype,"activeTab",2);ae([T()],J.prototype,"editMode",2);ae([T()],J.prototype,"time",2);ae([T()],J.prototype,"leftPanelCollapsed",2);ae([T()],J.prototype,"rightPanelCollapsed",2);ae([T()],J.prototype,"flowData",2);ae([T()],J.prototype,"pricingData",2);ae([T()],J.prototype,"pricingLoading",2);ae([T()],J.prototype,"boilerState",2);ae([T()],J.prototype,"boilerLoading",2);ae([T()],J.prototype,"boilerV2Data",2);ae([T()],J.prototype,"boilerConfig",2);ae([T()],J.prototype,"boxHasHome56",2);ae([T()],J.prototype,"analyticsData",2);ae([T()],J.prototype,"chmuData",2);ae([T()],J.prototype,"chmuModalOpen",2);ae([T()],J.prototype,"timelineTab",2);ae([T()],J.prototype,"timelineData",2);ae([T()],J.prototype,"tilesConfig",2);ae([T()],J.prototype,"tilesLeft",2);ae([T()],J.prototype,"tilesRight",2);ae([T()],J.prototype,"tileDialogOpen",2);ae([T()],J.prototype,"editingTileIndex",2);ae([T()],J.prototype,"editingTileSide",2);ae([T()],J.prototype,"editingTileConfig",2);J=ae([E("oig-app")],J);C.info("V2 starting",{version:"2.0.0-beta.1"});dl();async function ub(){try{const e=await cl(),t=document.getElementById("app");t&&(t.innerHTML="",t.appendChild(e)),C.info("V2 mounted successfully")}catch(e){C.error("V2 bootstrap failed",e);const t=document.getElementById("app");t&&(t.innerHTML=`
        <div style="padding: 20px; font-family: system-ui;">
          <h2>Chyba načítání</h2>
          <p>Nepodařilo se načíst dashboard. Zkuste obnovit stránku.</p>
          <details>
            <summary>Detaily</summary>
            <pre>${e.message}</pre>
          </details>
        </div>`)}}ub();
//# sourceMappingURL=index.js.map
