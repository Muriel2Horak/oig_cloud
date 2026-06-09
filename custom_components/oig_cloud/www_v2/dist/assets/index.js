var $o=Object.defineProperty;var _o=(e,t,i)=>t in e?$o(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var T=(e,t,i)=>_o(e,typeof t!="symbol"?t+"":t,i);import{f as ko,u as So,i as M,a as D,b as c,r as G,w as Z,A as O,E as Co}from"./vendor.js";import{C as Fr,a as Ua,L as Ga,P as Za,b as Qa,i as Xa,p as Ja,c as es,d as To,T as Po,e as Mo,B as Do,f as Eo,g as Oo,h as zo,j as Ao,k as ts}from"./charts.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&r(s)}).observe(document,{childList:!0,subtree:!0});function i(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(n){if(n.ep)return;n.ep=!0;const a=i(n);fetch(n.href,a)}})();const ht="[V2]";function Lo(){return new Date().toISOString().substr(11,12)}function or(e,t){const i=Lo(),r=e.toUpperCase().padEnd(5);return`${i} ${r} ${t}`}const _={debug(e,t){typeof window<"u"&&window.OIG_DEBUG&&console.debug(ht,or("debug",e),t??"")},info(e,t){console.info(ht,or("info",e),t??"")},warn(e,t){console.warn(ht,or("warn",e),t??"")},error(e,t,i){const r=t?{error:t.message,stack:t.stack,...i}:i;console.error(ht,or("error",e),r??"")},time(e){console.time(`${ht} ${e}`)},timeEnd(e){console.timeEnd(`${ht} ${e}`)},group(e){console.group(`${ht} ${e}`)},groupEnd(){console.groupEnd()}};function Io(){window.addEventListener("error",Fo),window.addEventListener("unhandledrejection",Bo),_.debug("Error handling setup complete")}function Fo(e){const t=e.error||new Error(e.message);_.error("Uncaught error",t,{filename:e.filename,lineno:e.lineno,colno:e.colno}),e.preventDefault()}function Bo(e){const t=e.reason instanceof Error?e.reason:new Error(String(e.reason));_.error("Unhandled promise rejection",t),e.preventDefault()}class is extends Error{constructor(t,i,r=!1,n){super(t),this.code=i,this.recoverable=r,this.cause=n,this.name="AppError"}}class mi extends is{constructor(t="Authentication failed"){super(t,"AUTH_ERROR",!1),this.name="AuthError"}}class Jn extends is{constructor(t="Network error",i){super(t,"NETWORK_ERROR",!0,i),this.name="NetworkError"}}const No="oig_v2_";function Ro(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"";return/Home Assistant|HomeAssistant|HAcompanion/i.test(t)}catch{return!1}}function jo(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"",i=/Android|iPhone|iPad|iPod|Mobile/i.test(t),r=globalThis.innerWidth<=768;return i||r}catch{return!1}}const Me={isHaApp:!1,isMobile:!1,reduceMotion:!1};async function Ho(){var i,r;_.info("Bootstrap starting"),Io(),Me.isHaApp=Ro(),Me.isMobile=jo(),Me.reduceMotion=Me.isHaApp||Me.isMobile||((r=(i=globalThis.matchMedia)==null?void 0:i.call(globalThis,"(prefers-reduced-motion: reduce)"))==null?void 0:r.matches)||!1;const e=document.documentElement;Me.isHaApp&&e.classList.add("oig-ha-app"),Me.isMobile&&e.classList.add("oig-mobile"),Me.reduceMotion&&e.classList.add("oig-reduce-motion");const t={version:"2.0.0-beta.1",storagePrefix:No};return _.info("Bootstrap complete",{...t,isHaApp:Me.isHaApp,isMobile:Me.isMobile,reduceMotion:Me.reduceMotion}),document.createElement("oig-app")}const o={bgPrimary:"var(--primary-background-color, #ffffff)",bgSecondary:"var(--secondary-background-color, #f5f5f5)",textPrimary:"var(--primary-text-color, #212121)",textSecondary:"var(--secondary-text-color, #757575)",accent:"var(--accent-color, #03a9f4)",divider:"var(--divider-color, #e0e0e0)",error:"var(--error-color, #db4437)",success:"var(--success-color, #0f9d58)",warning:"var(--warning-color, #f4b400)",cardBg:"var(--card-background-color, #ffffff)",cardShadow:"var(--shadow-elevation-2dp_-_box-shadow, 0 2px 2px 0 rgba(0,0,0,0.14))",fontFamily:"var(--primary-font-family, system-ui, sans-serif)"},ea={"--primary-background-color":"#111936","--secondary-background-color":"#1a2044","--primary-text-color":"#e1e1e1","--secondary-text-color":"rgba(255,255,255,0.7)","--accent-color":"#03a9f4","--divider-color":"rgba(255,255,255,0.12)","--error-color":"#ef5350","--success-color":"#66bb6a","--warning-color":"#ffa726","--card-background-color":"rgba(255,255,255,0.06)","--shadow-elevation-2dp_-_box-shadow":"0 2px 4px 0 rgba(0,0,0,0.4)"},ta={"--primary-background-color":"#ffffff","--secondary-background-color":"#f5f5f5","--primary-text-color":"#212121","--secondary-text-color":"#757575","--accent-color":"#03a9f4","--divider-color":"#e0e0e0","--error-color":"#db4437","--success-color":"#0f9d58","--warning-color":"#f4b400","--card-background-color":"#ffffff","--shadow-elevation-2dp_-_box-shadow":"0 2px 2px 0 rgba(0,0,0,0.14)"};function Gr(){var e,t;try{if(window.parent&&window.parent!==window){const i=(t=(e=window.parent.document)==null?void 0:e.querySelector("home-assistant"))==null?void 0:t.hass;if(i!=null&&i.themes){if(typeof i.themes.darkMode=="boolean")return i.themes.darkMode;const r=(i.themes.theme||"").toLowerCase();if(r.includes("dark"))return!0;if(r.includes("light"))return!1}}}catch{}return window.matchMedia("(prefers-color-scheme: dark)").matches}function Zr(e){const t=e?ea:ta,i=document.documentElement;for(const[r,n]of Object.entries(t))i.style.setProperty(r,n);i.classList.toggle("dark",e),document.body.style.background=e?ea["--secondary-background-color"]:ta["--secondary-background-color"]}function Vo(){const e=Gr();Zr(e),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{const i=Gr();Zr(i)}),setInterval(()=>{const i=Gr(),r=document.documentElement.classList.contains("dark");i!==r&&Zr(i)},5e3)}const ia={mobile:768,tablet:1024};function qt(e){return e<ia.mobile?"mobile":e<ia.tablet?"tablet":"desktop"}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const E=e=>(t,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Wo={attribute:!0,type:String,converter:So,reflect:!1,hasChanged:ko},qo=(e=Wo,t,i)=>{const{kind:r,metadata:n}=i;let a=globalThis.litPropertyMetadata.get(n);if(a===void 0&&globalThis.litPropertyMetadata.set(n,a=new Map),r==="setter"&&((e=Object.create(e)).wrapped=!0),a.set(i.name,e),r==="accessor"){const{name:s}=i;return{set(l){const d=t.get.call(this);t.set.call(this,l),this.requestUpdate(s,d,e,!0,l)},init(l){return l!==void 0&&this.C(s,void 0,e,l),l}}}if(r==="setter"){const{name:s}=i;return function(l){const d=this[s];t.call(this,l),this.requestUpdate(s,d,e,!0,l)}}throw Error("Unsupported decorator location: "+r)};function g(e){return(t,i)=>typeof i=="object"?qo(e,t,i):((r,n,a)=>{const s=n.hasOwnProperty(a);return n.constructor.createProperty(a,r),s?Object.getOwnPropertyDescriptor(n,a):void 0})(e,t,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function P(e){return g({...e,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Yo=(e,t,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof t!="object"&&Object.defineProperty(e,t,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Br(e,t){return(i,r,n)=>{const a=s=>{var l;return((l=s.renderRoot)==null?void 0:l.querySelector(e))??null};return Yo(i,r,{get(){return a(this)}})}}class Ko{constructor(){this.callbacks=new Set,this.watched=new Set,this.watchedPrefixes=new Set,this.unsub=null,this.running=!1,this.getHass=null,this.activeConnection=null}registerEntities(t){for(const i of t)typeof i=="string"&&i.length>0&&this.watched.add(i)}registerPrefix(t){var r;if(typeof t!="string"||t.length===0)return;this.watchedPrefixes.add(t);const i=(r=this.getHass)==null?void 0:r.call(this);if(i!=null&&i.states){const n=Object.keys(i.states).filter(a=>a.startsWith(t));this.registerEntities(n)}}onEntityChange(t){return this.callbacks.add(t),()=>{this.callbacks.delete(t)}}async start(t){this.getHass=t.getHass;const i=this.getHass();if(!(i!=null&&i.connection)){_.debug("StateWatcher: hass not ready, retrying in 500ms"),setTimeout(()=>this.start(t),500);return}if(this.running&&this.activeConnection===i.connection){const n=t.prefixes??[];for(const a of n)this.registerPrefix(a);return}this.running&&this.stop(),this.running=!0,this.activeConnection=i.connection;const r=t.prefixes??[];for(const n of r)this.registerPrefix(n);try{this.unsub=await i.connection.subscribeEvents(n=>this.handleStateChanged(n),"state_changed"),_.info("StateWatcher started",{prefixes:r,watchedCount:this.watched.size})}catch(n){this.running=!1,this.activeConnection=null,_.error("StateWatcher failed to subscribe",n)}}stop(){if(this.running=!1,this.activeConnection=null,this.unsub)try{this.unsub()}catch{}this.unsub=null,_.info("StateWatcher stopped")}isWatched(t){return this.matchesWatched(t)}destroy(){this.stop(),this.callbacks.clear(),this.watched.clear(),this.watchedPrefixes.clear(),this.getHass=null}matchesWatched(t){if(this.watched.has(t))return!0;for(const i of this.watchedPrefixes)if(t.startsWith(i))return!0;return!1}handleStateChanged(t){var n;const i=(n=t==null?void 0:t.data)==null?void 0:n.entity_id;if(!i||!this.matchesWatched(i))return;const r=t.data.new_state;for(const a of this.callbacks)try{a(i,r)}catch{}}}const _t=new Ko;class Uo{constructor(t,i=""){this.subscriptions=new Map,this.cache=new Map,this.stateWatcherUnsub=null,this.hass=t,this.inverterSn=i,this.init()}init(){var t;if((t=this.hass)!=null&&t.states)for(const[i,r]of Object.entries(this.hass.states))this.cache.set(i,r);this.stateWatcherUnsub=_t.onEntityChange((i,r)=>{r?this.cache.set(i,r):this.cache.delete(i),this.notifySubscribers(i,r)}),_.debug("EntityStore initialized",{entities:this.cache.size,inverterSn:this.inverterSn})}getSensorId(t){return`sensor.oig_${this.inverterSn}_${t}`}findSensorId(t){const i=this.getSensorId(t);for(const r of this.cache.keys()){if(r===i)return r;if(r.startsWith(i+"_")){const n=r.substring(i.length+1);if(/^\d+$/.test(n))return r}}return i}subscribe(t,i){this.subscriptions.has(t)||this.subscriptions.set(t,new Set),this.subscriptions.get(t).add(i),_t.registerEntities([t]);const r=this.cache.get(t)??null;return i(r),()=>{var n,a;(n=this.subscriptions.get(t))==null||n.delete(i),((a=this.subscriptions.get(t))==null?void 0:a.size)===0&&this.subscriptions.delete(t)}}getNumeric(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"&&parseFloat(i.state)||0,lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:0,lastUpdated:null,attributes:{},exists:!1}}getString(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"?i.state:"",lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:"",lastUpdated:null,attributes:{},exists:!1}}get(t){return this.cache.get(t)??null}getAll(){return Object.fromEntries(this.cache)}batchLoad(t){const i={};for(const r of t)i[r]=this.getNumeric(r);return i}updateHass(t){if(this.hass=t,t!=null&&t.states){const i=new Set(Object.keys(t.states));for(const r of Array.from(this.cache.keys()))i.has(r)||(this.cache.delete(r),this.notifySubscribers(r,null));for(const[r,n]of Object.entries(t.states)){const a=this.cache.get(r),s=n;this.cache.set(r,s),((a==null?void 0:a.state)!==s.state||(a==null?void 0:a.last_updated)!==s.last_updated)&&this.notifySubscribers(r,s)}}}notifySubscribers(t,i){const r=this.subscriptions.get(t);if(r)for(const n of r)try{n(i)}catch(a){_.error("Entity callback error",a,{entityId:t})}}destroy(){var t;(t=this.stateWatcherUnsub)==null||t.call(this),this.subscriptions.clear(),this.cache.clear(),_.debug("EntityStore destroyed")}}let Mi=null;function Go(e,t){return Mi&&Mi.destroy(),Mi=new Uo(e,t),Mi}function it(){return Mi}const Zo=3,Qo=1e3;class Xo{constructor(){this.hass=null,this.initPromise=null}async getHass(){return this.hass?this.hass:this.initPromise?this.initPromise:(this.initPromise=this.initHass(),this.initPromise)}getHassSync(){return this.hass}async refreshHass(){const t=await this.findHass();return t?(this.hass=t,_.info("HASS client refreshed"),t):this.hass}async initHass(){_.debug("Initializing HASS client");const t=await this.findHass();return t?(this.hass=t,_.info("HASS client initialized"),t):(_.warn("HASS not found in parent context"),null)}async findHass(){var t,i;if(typeof window>"u")return null;if(window.hass)return window.hass;if(window.parent&&window.parent!==window)try{const r=(i=(t=window.parent.document)==null?void 0:t.querySelector("home-assistant"))==null?void 0:i.hass;if(r)return r}catch{_.debug("Cannot access parent HASS (cross-origin)")}return window.customPanel?window.customPanel.hass:null}async fetchWithAuth(t,i={}){var s,l;const r=await this.getHass();if(!r)throw new mi("Cannot get HASS context");try{const u=new URL(t,window.location.href).hostname;if(u!=="localhost"&&u!=="127.0.0.1"&&!t.startsWith("/api/"))throw new Error(`fetchWithAuth rejected for non-localhost URL: ${t}`)}catch(d){if(d.message.includes("rejected"))throw d}const n=(l=(s=r.auth)==null?void 0:s.data)==null?void 0:l.access_token;if(!n)throw new mi("No access token available");const a=new Headers(i.headers);return a.set("Authorization",`Bearer ${n}`),a.has("Content-Type")||a.set("Content-Type","application/json"),this.fetchWithRetry(t,{...i,headers:a})}async fetchWithRetry(t,i,r=Zo){try{const n=await fetch(t,i);if(!n.ok)throw n.status===401?new mi("Token expired or invalid"):new Jn(`HTTP ${n.status}: ${n.statusText}`);return n}catch(n){if(r>0&&n instanceof Jn)return _.warn(`Retrying fetch (${r} left)`,{url:t}),await this.delay(Qo),this.fetchWithRetry(t,i,r-1);throw n}}async callApi(t,i,r){const n=await this.getHass();if(!n)throw new mi("Cannot get HASS context");return n.callApi(t,i,r)}async callService(t,i,r){const n=await this.getHass();if(!(n!=null&&n.callService))return _.error("Cannot call service — hass not available"),!1;try{return await n.callService(t,i,r),!0}catch(a){return _.error(`Service call failed (${t}.${i})`,a),!1}}async callWS(t){const i=await this.getHass();if(!(i!=null&&i.callWS))throw new mi("Cannot get HASS context for WS call");return i.callWS(t)}async fetchOIGAPI(t,i={}){try{const r=`/api/oig_cloud${t.startsWith("/")?"":"/"}${t}`;return await(await this.fetchWithAuth(r,{...i,headers:{"Content-Type":"application/json",...Object.fromEntries(new Headers(i.headers).entries())}})).json()}catch(r){return _.error(`OIG API fetch error for ${t}`,r),null}}async loadBatteryTimeline(t,i="active"){return this.fetchOIGAPI(`/battery_forecast/${t}/timeline?type=${i}`)}async loadUnifiedCostTile(t){return this.fetchOIGAPI(`/battery_forecast/${t}/unified_cost_tile`)}async loadSpotPrices(t){return this.fetchOIGAPI(`/spot_prices/${t}/intervals`)}async loadAnalytics(t){return this.fetchOIGAPI(`/analytics/${t}`)}async loadPlannerSettings(t){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`)}async savePlannerSettings(t,i){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`,{method:"POST",body:JSON.stringify(i)})}async loadDetailTabs(t,i,r="hybrid"){return this.fetchOIGAPI(`/battery_forecast/${t}/detail_tabs?tab=${i}&plan=${r}`)}async loadModules(t){return this.fetchOIGAPI(`/${t}/modules`)}openEntityDialog(t){var i;try{const r=((i=window.parent.document)==null?void 0:i.querySelector("home-assistant"))??document.querySelector("home-assistant");if(!r)return _.warn("Cannot open entity dialog — home-assistant element not found"),!1;const n=new CustomEvent("hass-more-info",{bubbles:!0,composed:!0,detail:{entityId:t}});return r.dispatchEvent(n),!0}catch(r){return _.error("Cannot open entity dialog",r),!1}}async showNotification(t,i,r="success"){await this.callService("persistent_notification","create",{title:t,message:i,notification_id:`oig_dashboard_${Date.now()}`})||console.log(`[${r.toUpperCase()}] ${t}: ${i}`)}getToken(){var t,i,r;return((r=(i=(t=this.hass)==null?void 0:t.auth)==null?void 0:i.data)==null?void 0:r.access_token)??null}delay(t){return new Promise(i=>setTimeout(i,t))}}const ie=new Xo,ra={solar:"#ffd54f",battery:"#4caf50",inverter:"#9575cd",grid:"#42a5f5",house:"#f06292"},bi={solar:"linear-gradient(135deg, rgba(255,213,79,0.15) 0%, rgba(255,179,0,0.08) 100%)",battery:"linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(56,142,60,0.08) 100%)",grid:"linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(33,150,243,0.08) 100%)",house:"linear-gradient(135deg, rgba(240,98,146,0.15) 0%, rgba(233,30,99,0.08) 100%)",inverter:"linear-gradient(135deg, rgba(149,117,205,0.15) 0%, rgba(126,87,194,0.08) 100%)"},vi={solar:"rgba(255,213,79,0.4)",battery:"rgba(76,175,80,0.4)",grid:"rgba(66,165,245,0.4)",house:"rgba(240,98,146,0.4)",inverter:"rgba(149,117,205,0.4)"},It={solar:"#ffd54f",battery:"#ff9800",grid_import:"#f44336",grid_export:"#4caf50",house:"#f06292"},lr={solar:5400,battery:7e3,grid:17e3,house:1e4},En={solarPower:0,solarP1:0,solarP2:0,solarV1:0,solarV2:0,solarI1:0,solarI2:0,solarPercent:0,solarToday:0,solarForecastToday:0,solarForecastTomorrow:0,solarForecastStale:!1,batterySoC:0,batteryPower:0,batteryVoltage:0,batteryCurrent:0,batteryTemp:0,batteryChargeTotal:0,batteryDischargeTotal:0,batteryChargeSolar:0,batteryChargeGrid:0,isGridCharging:!1,timeToEmpty:"",timeToFull:"",balancingState:"standby",balancingTimeRemaining:"",gridChargingPlan:{hasBlocks:!1,totalEnergyKwh:0,totalCostCzk:0,windowLabel:null,durationMinutes:0,currentBlockLabel:null,nextBlockLabel:null,blocks:[]},gridPower:0,gridVoltage:0,gridFrequency:0,gridImportToday:0,gridExportToday:0,gridL1V:0,gridL2V:0,gridL3V:0,gridL1P:0,gridL2P:0,gridL3P:0,spotPrice:0,exportPrice:0,currentTariff:"",housePower:0,houseTodayWh:0,houseL1:0,houseL2:0,houseL3:0,inverterMode:"",inverterGridMode:"unknown",inverterGridLimit:0,inverterTemp:0,bypassStatus:"off",notificationsUnread:0,notificationsError:0,boilerIsUse:!1,boilerPower:0,boilerDayEnergy:0,boilerManualMode:"",boilerInstallPower:3e3,plannerAutoMode:null,lastUpdate:""},rs={home_1:"Home 1",home_2:"Home 2",home_3:"Home 3",home_ups:"Home UPS"},na={"Home 1":"home_1","Home 2":"home_2","Home 3":"home_3","Home UPS":"home_ups","Mode 0":"home_1","Mode 1":"home_2","Mode 2":"home_3","Mode 3":"home_ups","HOME I":"home_1","HOME II":"home_2","HOME III":"home_3","HOME UPS":"home_ups",0:"home_1",1:"home_2",2:"home_3",3:"home_ups"},Di={off:"Vypnuto",on:"Zapnuto",limited:"S omezením"},Qr={Vypnuto:"off",Zapnuto:"on",Omezeno:"limited",omezeno:"limited",vypnuto:"off",zapnuto:"on",Off:"off",On:"on",Limited:"limited",off:"off",on:"on",limited:"limited",0:"off",1:"on",2:"limited"},Jo={off:"🚫",on:"💧",limited:"🚰"},ns={cbb:"Inteligentní",manual:"Manuální"},as={cbb:"🤖",manual:"👤"},aa={CBB:"cbb",Manuální:"manual",Manual:"manual",Inteligentní:"cbb"},el={set_box_mode:"🏠 Změna režimu boxu",set_grid_delivery:"💧 Změna nastavení přetoků",set_grid_delivery_limit:"🔢 Změna limitu přetoků",set_boiler_mode:"🔥 Změna nastavení bojleru",set_formating_mode:"🔋 Změna nabíjení baterie",set_battery_capacity:"⚡ Změna kapacity baterie"},tl={CBB:"Inteligentní",Manual:"Manuální",Manuální:"Manuální"},ss={0:"Žádný",1:"Home 5",2:"Home 6",3:"Home 5 + Home 6",4:"Flexibilita"},os={status:"idle",activity:"",queueCount:0,runningRequests:[],queuedRequests:[],allRequests:[],currentBoxMode:"home_1",currentGridDelivery:"off",currentGridLimit:0,currentBoilerMode:"cbb",pendingServices:new Map,changingServices:new Set,gridDeliveryState:{currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},supplementary:{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1}},il="probíhá změna";function bn(e){return e.trim().toLowerCase().includes(il)}function On(e){const t=e.trim();if(t in Qr)return Qr[t];const i=t.toLowerCase(),r=Object.entries(Qr).find(([n])=>n.toLowerCase()===i);return r?r[1]:i.startsWith("omez")||i.includes("limit")?"limited":i.startsWith("zapn")||i==="on"?"on":i.startsWith("vypn")||i==="off"?"off":"unknown"}function rl(e){const t=e.get("grid_mode");if(!t)return null;const i=On(t);return i==="unknown"?null:i}function nl(e){const t=e.get("grid_limit");if(!t)return null;const i=parseInt(t,10);return Number.isFinite(i)&&i>=0?i:null}function al(e){return e.changingServices.has("grid_mode")||e.changingServices.has("grid_limit")}function ls(e,t){const{gridModeRaw:i,gridLimit:r}=e,n=i.trim().toLowerCase(),a=n==="unavailable"||n==="unknown"||n==="",s=bn(i),l=al(t),d=s||l;let u;a||s?u="unknown":u=On(i);let p=null;!a&&Number.isFinite(r)&&r>=0&&(p=r);const h=rl(t.pendingServices),b=nl(t.pendingServices);return{currentLiveDelivery:u,currentLiveLimit:p,pendingDeliveryTarget:h,pendingLimitTarget:b,isTransitioning:d,isUnavailable:a}}function sl(e){return e.isTransitioning&&e.pendingDeliveryTarget?e.pendingDeliveryTarget:e.currentLiveDelivery}const sa=new URLSearchParams(window.location.search),zn=sa.get("sn")||sa.get("inverter_sn")||"";function gr(e,t=zn){return`sensor.oig_${t}_${e}`}function oa(e,t,i=zn){var a;const r=gr(t,i);return r in e?r:((a=Object.keys(e).filter(s=>s.startsWith(r+"_")).map(s=>({id:s,suffix:parseInt(s.substring(r.length+1),10)})).filter(s=>Number.isFinite(s.suffix)).sort((s,l)=>s.suffix-l.suffix)[0])==null?void 0:a.id)??null}function j(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function We(e){return!(e!=null&&e.state)||e.state==="unknown"||e.state==="unavailable"?"":e.state}function la(e,t="on"){if(!(e!=null&&e.state))return!1;const i=e.state.toLowerCase();return i===t||i==="1"||i==="zapnuto"}function ol(e){const t=(e||"").toLowerCase();return t==="charging"?"charging":t==="balancing"||t==="holding"?"holding":t==="completed"?"completed":t==="planned"?"planned":"standby"}function vn(e){return e==="tomorrow"?"zítra":e==="today"?"dnes":""}function ca(e){if(!e)return null;const[t,i]=e.split(":").map(Number);return!Number.isFinite(t)||!Number.isFinite(i)?null:t*60+i}function ll(e){const t=Number(e.grid_import_kwh??e.grid_charge_kwh??0);if(Number.isFinite(t)&&t>0)return t;const i=Number(e.battery_start_kwh??0),r=Number(e.battery_end_kwh??0);return Number.isFinite(i)&&Number.isFinite(r)?Math.max(0,r-i):0}function cs(e=[]){return[...e].sort((t,i)=>{const r=(t.day==="tomorrow"?1:0)-(i.day==="tomorrow"?1:0);return r!==0?r:(t.time_from||"").localeCompare(i.time_from||"")})}function cl(e){if(!Array.isArray(e)||e.length===0)return null;const t=cs(e),i=t[0],r=t.at(-1),n=vn(i==null?void 0:i.day),a=vn(r==null?void 0:r.day);if(n===a){const b=n?`${n} `:"";return!(i!=null&&i.time_from)||!(r!=null&&r.time_to)?b.trim()||null:`${b}${i.time_from} – ${r.time_to}`}const s=n?`${n} `:"",l=a?`${a} `:"",d=(i==null?void 0:i.time_from)||"--",u=(r==null?void 0:r.time_to)||"--",p=i?`${s}${d}`:"--",h=r?`${l}${u}`:"--";return`${p} → ${h}`}function dl(e){if(!Array.isArray(e)||e.length===0)return 0;let t=0;return e.forEach(i=>{const r=ca(i.time_from),n=ca(i.time_to);if(r===null||n===null)return;const a=n-r;a>0&&(t+=a)}),t}function da(e){const t=vn(e.day),i=t?`${t} `:"",r=e.time_from||"--",n=e.time_to||"--";return`${i}${r} - ${n}`}function ul(e){const t=e.find(n=>{const a=(n.status||"").toLowerCase();return a==="running"||a==="active"})||null,i=t?e[e.indexOf(t)+1]||null:e[0]||null;return{runningBlock:t,upcomingBlock:i,shouldShowNext:!!(i&&(!t||i!==t))}}function pl(e){const t=(e==null?void 0:e.attributes)||{},i=Array.isArray(t.charging_blocks)?t.charging_blocks:[],r=cs(i),n=Number(t.total_energy_kwh)||0,a=n>0?n:r.reduce((f,m)=>f+ll(m),0),s=Number(t.total_cost_czk)||0,l=s>0?s:r.reduce((f,m)=>f+Number(m.total_cost_czk||0),0),d=cl(r),u=dl(r),{runningBlock:p,upcomingBlock:h,shouldShowNext:b}=ul(r);return{hasBlocks:r.length>0,totalEnergyKwh:a,totalCostCzk:l,windowLabel:d,durationMinutes:u,currentBlockLabel:p?da(p):null,nextBlockLabel:b&&h?da(h):null,blocks:r}}function hl(e,t=zn){var Un,Gn,Zn;const i=(e==null?void 0:e.states)||e||{},r=Ur=>i[gr(Ur,t)]||null,n=j(r("actual_fv_p1")),a=j(r("actual_fv_p2")),s=j(r("extended_fve_voltage_1")),l=j(r("extended_fve_voltage_2")),d=j(r("extended_fve_current_1")),u=j(r("extended_fve_current_2")),p=r("solar_forecast"),h=Ur=>{var Xn;const sr=(Xn=p==null?void 0:p.attributes)==null?void 0:Xn[Ur];if(sr==null||sr==="")return null;const Qn=parseFloat(sr);return Number.isFinite(Qn)?Qn:null},b=h("today_total_kwh")??h("today_total_sum_kw")??j(p),f=h("tomorrow_total_kwh")??h("tomorrow_total_sum_kw")??0,m=((Un=p==null?void 0:p.attributes)==null?void 0:Un.forecast_stale)===!0,v=j(r("batt_bat_c")),$=j(r("batt_batt_comp_p")),w=j(r("extended_battery_voltage")),x=j(r("extended_battery_current")),S=j(r("extended_battery_temperature")),B=j(r("computed_batt_charge_energy_today")),q=j(r("computed_batt_discharge_energy_today")),k=j(r("computed_batt_charge_fve_energy_today")),V=j(r("computed_batt_charge_grid_energy_today")),y=r("grid_charging_planned"),F=la(y),Y=We(r("time_to_empty")),W=We(r("time_to_full")),K=r("battery_balancing"),ne=ol((Gn=K==null?void 0:K.attributes)==null?void 0:Gn.current_state),ze=We({state:(Zn=K==null?void 0:K.attributes)==null?void 0:Zn.time_remaining}),hi=pl(y),gi=j(r("actual_aci_wtotal")),Se=j(r("extended_grid_voltage")),L=j(r("ac_in_aci_f")),re=j(r("ac_in_ac_ad")),be=j(r("ac_in_ac_pd")),fi=j(r("ac_in_aci_vr")),Fe=j(r("ac_in_aci_vs")),Ve=j(r("ac_in_aci_vt")),Ys=j(r("actual_aci_wr")),Ks=j(r("actual_aci_ws")),Us=j(r("actual_aci_wt")),Gs=j(r("spot_price_current_15min")),Zs=j(r("export_price_current_15min")),Qs=We(r("current_tariff")),Xs=j(r("actual_aco_p")),Js=j(r("ac_out_en_day")),eo=j(r("ac_out_aco_pr")),to=j(r("ac_out_aco_ps")),io=j(r("ac_out_aco_pt")),ro=We(r("box_prms_mode")),no=oa(i,"invertor_prms_to_grid",t)||gr("invertor_prms_to_grid",t),ao=oa(i,"invertor_prm1_p_max_feed_grid",t)||gr("invertor_prm1_p_max_feed_grid",t),qr=i[no],Yr=i[ao],so=(qr==null?void 0:qr.state)??"",oo=parseFloat((Yr==null?void 0:Yr.state)??"")||0,Kn=ls({gridModeRaw:so,gridLimit:oo},{pendingServices:new Map,changingServices:new Set}),lo=Kn.currentLiveDelivery,co=Kn.currentLiveLimit??0,uo=j(r("box_temp")),po=We(r("bypass_status"))||"off",ho=j(r("notification_count_unread")),go=j(r("notification_count_error")),Kr=r("boiler_is_use"),fo=Kr?la(Kr)||We(Kr)==="Zapnuto":!1,mo=j(r("boiler_current_cbb_w")),bo=j(r("boiler_day_w")),vo=We(r("boiler_manual_mode")),yo=j(r("boiler_install_power"))||3e3,xo=r("real_data_update"),wo=We(xo);return{solarPower:n+a,solarP1:n,solarP2:a,solarV1:s,solarV2:l,solarI1:d,solarI2:u,solarPercent:j(r("dc_in_fv_proc")),solarToday:j(r("dc_in_fv_ad")),solarForecastToday:b,solarForecastTomorrow:f,solarForecastStale:m,batterySoC:v,batteryPower:$,batteryVoltage:w,batteryCurrent:x,batteryTemp:S,batteryChargeTotal:B,batteryDischargeTotal:q,batteryChargeSolar:k,batteryChargeGrid:V,isGridCharging:F,timeToEmpty:Y,timeToFull:W,balancingState:ne,balancingTimeRemaining:ze,gridChargingPlan:hi,gridPower:gi,gridVoltage:Se,gridFrequency:L,gridImportToday:re,gridExportToday:be,gridL1V:fi,gridL2V:Fe,gridL3V:Ve,gridL1P:Ys,gridL2P:Ks,gridL3P:Us,spotPrice:Gs,exportPrice:Zs,currentTariff:Qs,housePower:Xs,houseTodayWh:Js,houseL1:eo,houseL2:to,houseL3:io,inverterMode:ro,inverterGridMode:lo,inverterGridLimit:co,inverterTemp:uo,bypassStatus:po,notificationsUnread:ho,notificationsError:go,boilerIsUse:fo,boilerPower:mo,boilerDayEnergy:bo,boilerManualMode:vo,boilerInstallPower:yo,plannerAutoMode:null,lastUpdate:wo}}const yi={};function cr(e,t,i){const r=Math.abs(e),n=Math.min(100,r/t*100),a=Math.max(500,Math.round(3500-n*30));let s=a;return i&&yi[i]!==void 0&&(s=Math.round(.3*a+(1-.3)*yi[i]),Math.abs(s-yi[i])<100&&(s=yi[i])),i&&(yi[i]=s),{active:r>=50,intensity:n,count:Math.max(1,Math.min(4,Math.ceil(1+n/33))),speed:s,size:Math.round(6+n/10),opacity:Math.min(1,.3+n/150)}}function xi(e){return Math.abs(e)>=1e3?`${(e/1e3).toFixed(1)} kW`:`${Math.round(e)} W`}function gt(e){return e>=1e3?`${(e/1e3).toFixed(2)} kWh`:`${Math.round(e)} Wh`}function gl(e){return e==="VT"||e.includes("vysoký")?"⚡ VT":e==="NT"||e.includes("nízký")?"🌙 NT":e?`⏰ ${e}`:"--"}function fl(e){return e.includes("Home 1")?{icon:"🏠",text:"Home 1"}:e.includes("Home 2")?{icon:"🔋",text:"Home 2"}:e.includes("Home 3")?{icon:"☀️",text:"Home 3"}:e.includes("UPS")?{icon:"⚡",text:"Home UPS"}:{icon:"⚙️",text:e||"--"}}function ml(e){return e==="off"?{display:"Vypnuto",icon:"🚫"}:e==="on"?{display:"Zapnuto",icon:"💧"}:e==="limited"?{display:"Omezeno",icon:"🚰"}:{display:"--",icon:"💧"}}const bl={"HOME I":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"HOME II":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"HOME III":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"rgba(158, 158, 158, 0.18)",label:"DO NOTHING"},"Mode 0":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"Mode 1":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"Mode 2":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"Mode 3":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"}},ua={timeline:[],labels:[],prices:[],exportPrices:[],modeSegments:[],cheapestBuyBlock:null,expensiveBuyBlock:null,bestExportBlock:null,worstExportBlock:null,solar:null,battery:null,initialZoomStart:null,initialZoomEnd:null,currentSpotPrice:0,currentExportPrice:0,plannedConsumption:null,whatIf:null,solarForecastTotal:0,solarForecastTomorrow:0,solarForecastStale:!1},pa=new URLSearchParams(window.location.search),yn=pa.get("sn")||pa.get("inverter_sn")||"";function Ut(e){return`sensor.oig_${yn}_${e}`}function ha(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function xn(e){const t=e.getFullYear(),i=String(e.getMonth()+1).padStart(2,"0"),r=String(e.getDate()).padStart(2,"0"),n=String(e.getHours()).padStart(2,"0"),a=String(e.getMinutes()).padStart(2,"0"),s=String(e.getSeconds()).padStart(2,"0");return`${t}-${i}-${r}T${n}:${a}:${s}`}const mr={},vl=5*60*1e3;async function yl(e="hybrid"){const t=mr[e];if(t&&Date.now()-t.ts<vl)return _.debug("Timeline cache hit",{plan:e,age:Math.round((Date.now()-t.ts)/1e3)}),t.data;try{const i=await ie.getHass();if(!i)return[];let r;i.callApi?r=await i.callApi("GET",`oig_cloud/battery_forecast/${yn}/timeline?type=active`):r=await ie.fetchOIGAPI(`battery_forecast/${yn}/timeline?type=active`);const n=(r==null?void 0:r.active)||(r==null?void 0:r.timeline)||[];return mr[e]={data:n,ts:Date.now()},_.info("Timeline fetched",{plan:e,points:n.length}),n}catch(i){return _.error("Failed to fetch timeline",i),[]}}function xl(e){Object.keys(mr).forEach(t=>delete mr[t])}function wl(e){const t=new Date,i=new Date(t);return i.setMinutes(Math.floor(t.getMinutes()/15)*15,0,0),e.filter(r=>new Date(r.timestamp)>=i)}function $l(e){return e.map(t=>{if(!t.timestamp)return new Date;try{const[i,r]=t.timestamp.split("T");if(!i||!r)return new Date;const[n,a,s]=i.split("-").map(Number),[l,d,u=0]=r.split(":").map(Number);return new Date(n,a-1,s,l,d,u)}catch{return new Date}})}function _l(e){const t=e.mode_name||e.mode_planned||e.mode||e.mode_display||null;if(!t||typeof t!="string")return null;const i=t.trim();return i.length?i:null}function kl(e){return e.startsWith("HOME ")?e.replace("HOME ","").trim():e==="FULL HOME UPS"||e==="HOME UPS"?"UPS":e==="DO NOTHING"?"DN":e.substring(0,3).toUpperCase()}function Sl(e){return bl[e]||{icon:"❓",color:"rgba(158, 158, 158, 0.15)",label:e}}function Cl(e){if(!e.length)return[];const t=[];let i=null;for(const r of e){const n=_l(r);if(!n){i=null;continue}const a=new Date(r.timestamp),s=new Date(a.getTime()+15*60*1e3);if(i!==null&&i.mode===n)i.end=s;else{const l={mode:n,start:a,end:s};t.push(l),i=l}}return t.map(r=>{const n=Sl(r.mode);return{...r,icon:n.icon,color:n.color,label:n.label,shortLabel:kl(r.mode)}})}function dr(e,t,i=3){const r=Math.floor(i*60/15);if(e.length<r)return null;let n=null,a=t?1/0:-1/0;for(let s=0;s<=e.length-r;s++){const l=e.slice(s,s+r),d=l.map(p=>p.price),u=d.reduce((p,h)=>p+h,0)/d.length;(t&&u<a||!t&&u>a)&&(a=u,n={start:l[0].timestamp,end:l[l.length-1].timestamp,avg:u,min:Math.min(...d),max:Math.max(...d),values:d,type:"cheapest-buy"})}return n}function Tl(e,t){const r=((e==null?void 0:e.states)||{})[Ut("solar_forecast")];if(!(r!=null&&r.attributes)||!t.length)return null;const n=r.attributes,a=n.today_total_kwh||0,s=n.tomorrow_total_kwh||0,l=n.forecast_stale===!0,d=n.today_hourly_string1_kw||{},u=n.tomorrow_hourly_string1_kw||{},p=n.today_hourly_string2_kw||{},h=n.tomorrow_hourly_string2_kw||{},b={...d,...u},f={...p,...h},m=(w,x,S)=>w==null||x==null?w||x||0:w+(x-w)*S,v=[],$=[];for(const w of t){const x=w.getHours(),S=w.getMinutes(),B=new Date(w);B.setMinutes(0,0,0);const q=xn(B),k=new Date(B);k.setHours(x+1);const V=xn(k),y=b[q]||0,F=b[V]||0,Y=f[q]||0,W=f[V]||0,K=S/60;v.push(m(y,F,K)),$.push(m(Y,W,K))}return{string1:v,string2:$,todayTotal:a,tomorrowTotal:s,stale:l,hasString1:v.some(w=>w>0),hasString2:$.some(w=>w>0)}}function Pl(e,t){if(!e.length)return{arrays:{baseline:[],solarCharge:[],gridCharge:[],gridNet:[],consumption:[]},initialZoomStart:null,initialZoomEnd:null};const i=e.map(h=>new Date(h.timestamp)),r=i[0].getTime(),n=i[i.length-1],a=n?n.getTime():r,s=[],l=[],d=[],u=[],p=[];for(const h of t){const b=xn(h),f=e.find(m=>m.timestamp===b);if(f){const m=(f.battery_capacity_kwh??f.battery_soc??f.battery_start)||0,v=f.solar_charge_kwh||0,$=f.grid_charge_kwh||0,w=typeof f.grid_net=="number"?f.grid_net:(f.grid_import||0)-(f.grid_export||0),x=f.load_kwh??f.consumption_kwh??f.load??0,S=(Number(x)||0)*4;s.push(m-v-$),l.push(v),d.push($),u.push(w),p.push(S)}else s.push(null),l.push(null),d.push(null),u.push(null),p.push(null)}return{arrays:{baseline:s,solarCharge:l,gridCharge:d,gridNet:u,consumption:p},initialZoomStart:r,initialZoomEnd:a}}function Ml(e){const t=(e==null?void 0:e.states)||{},i=t[Ut("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const r=i.attributes,n=r.planned_consumption_today??null,a=r.planned_consumption_tomorrow??null,s=r.profile_today||"Žádný profil",l=t[Ut("ac_out_en_day")],d=l==null?void 0:l.state,p=(d&&d!=="unavailable"&&parseFloat(d)||0)/1e3,h=p+(n||0),b=(n||0)+(a||0);let f=null;if(h>0&&a!=null){const v=a-h,$=v/h*100;Math.abs($)<5?f="Zítra podobně":v>0?f=`Zítra více (+${Math.abs($).toFixed(0)}%)`:f=`Zítra méně (-${Math.abs($).toFixed(0)}%)`}return{todayConsumedKwh:p,todayPlannedKwh:n,todayTotalKwh:h,tomorrowKwh:a,totalPlannedKwh:b,profile:s!=="Žádný profil"&&s!=="Neznámý profil"?s:"Žádný profil",trendText:f}}function Dl(e){const i=((e==null?void 0:e.states)||{})[Ut("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const n=i.attributes.mode_optimization||{},a=n.alternatives||{},s=n.total_cost_czk||0,l=n.total_savings_vs_home_i_czk||0,d=a["DO NOTHING"],u=(d==null?void 0:d.current_mode)||null;return{totalCost:s,totalSavings:l,alternatives:a,activeMode:u}}async function El(e,t="hybrid"){const i=performance.now();_.info("[Pricing] loadPricingData START");try{const r=await yl(t),n=wl(r);if(!n.length)return _.warn("[Pricing] No timeline data"),ua;const a=n.map(ne=>({timestamp:ne.timestamp,price:ne.spot_price_czk||0})),s=n.map(ne=>({timestamp:ne.timestamp,price:ne.export_price_czk||0}));let l=$l(a);const d=Cl(n),u=dr(a,!0,3);u&&(u.type="cheapest-buy");const p=dr(a,!1,3);p&&(p.type="expensive-buy");const h=dr(s,!1,3);h&&(h.type="best-export");const b=dr(s,!0,3);b&&(b.type="worst-export");const f=n.map(ne=>new Date(ne.timestamp)),m=new Set([...l,...f].map(ne=>ne.getTime()));l=Array.from(m).sort((ne,ze)=>ne-ze).map(ne=>new Date(ne));const{arrays:v,initialZoomStart:$,initialZoomEnd:w}=Pl(n,l),x=Tl(e,l),S=(e==null?void 0:e.states)||{},B=ha(S[Ut("spot_price_current_15min")]),q=ha(S[Ut("export_price_current_15min")]),k=Ml(e),V=Dl(e),y=(x==null?void 0:x.todayTotal)||0,F=(x==null?void 0:x.tomorrowTotal)||0,Y=(x==null?void 0:x.stale)||!1,W={timeline:n,labels:l,prices:a,exportPrices:s,modeSegments:d,cheapestBuyBlock:u,expensiveBuyBlock:p,bestExportBlock:h,worstExportBlock:b,solar:x,battery:v,initialZoomStart:$,initialZoomEnd:w,currentSpotPrice:B,currentExportPrice:q,plannedConsumption:k,whatIf:V,solarForecastTotal:y,solarForecastTomorrow:F,solarForecastStale:Y},K=(performance.now()-i).toFixed(0);return _.info(`[Pricing] loadPricingData COMPLETE in ${K}ms`,{points:n.length,segments:d.length}),W}catch(r){return _.error("[Pricing] loadPricingData failed",r),ua}}const Ol=120,ga={workday_spring:"Pracovní den - Jaro",workday_summer:"Pracovní den - Léto",workday_autumn:"Pracovní den - Podzim",workday_winter:"Pracovní den - Zima",weekend_spring:"Víkend - Jaro",weekend_summer:"Víkend - Léto",weekend_autumn:"Víkend - Podzim",weekend_winter:"Víkend - Zima"},An={fve:"#4CAF50",overflow:"#8BC34A",grid:"#FF9800",discharge:"#2196F3"},zl={fve:"FVE",grid:"Síť",alternative:"Alternativa"},Al={fve:"fve",pv:"fve",overflow:"overflow",grid:"grid",alternative:"grid",alt:"grid"},Ll={fve:"fve",pv:"fve",overflow:"overflow",grid:"grid",alternative:"grid",alt:"grid",discharge:"discharge",discharging:"discharge"};function Xr(e){if(e==null||e==="")return{source:null,sourceInvalid:!1};const t=Al[e.toLowerCase()];return t!==void 0?{source:t,sourceInvalid:!1}:{source:null,sourceInvalid:!0}}function Jr(e){return e==null||e===""?null:Ll[e.toLowerCase()]??null}const Il=new Set(["temperature_unavailable","temperature_stale","source_stale","activity_stale","source_invalid","power_sign_mismatch_charge","power_sign_mismatch_discharge","runtime_cache_empty"]);function en(e){return e.filter(t=>Il.has(t))}const wn=new URLSearchParams(window.location.search);let $n=wn.get("sn")||wn.get("inverter_sn")||"",tn=wn.get("entry_id")||"";function Fl(e,t,i){return isNaN(e)?t:Math.max(t,Math.min(i,e))}function Bl(e,t,i){if(e==null)return null;const r=t-i;if(r<=0)return null;const n=(e-i)/r*100;return Fl(n,0,100)}function br(e){if(!e)return"--:--";const t=e instanceof Date?e:new Date(e);return isNaN(t.getTime())?"--:--":t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}function fa(e){if(!e)return"--";const t=new Date(e);return isNaN(t.getTime())?"--":t.toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}function _n(e,t){return`${br(e)}–${br(t)}`}function ma(e){return zl[e||""]||e||"--"}function ds(e){return e?Object.values(e).reduce((t,i)=>t+(parseFloat(String(i))||0),0):0}function us(e){return e?Object.entries(e).map(([i,r])=>({hour:parseInt(i,10),value:parseFloat(String(r))||0})).filter(i=>isFinite(i.value)).sort((i,r)=>r.value-i.value).slice(0,3).filter(i=>i.value>0).map(i=>i.hour).sort((i,r)=>i-r):[]}function wi(e){if(!e)return null;const t=e.split(":").map(i=>parseInt(i,10));return t.length<2||!isFinite(t[0])||!isFinite(t[1])?null:t[0]*60+t[1]}function ba(e,t,i){return t===null||i===null?!1:t<=i?e>=t&&e<i:e>=t||e<i}async function Nl(){var e,t,i,r,n;try{if(!tn||!$n)return _.warn("[Boiler] No entry_id or inverter_sn — cannot fetch boiler canonical"),{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null};const a=await ie.fetchOIGAPI(`/boiler/${tn}/${$n}`);if(!a)return{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null};let s=!1,l=null;try{const u=await ie.fetchOIGAPI(`/${tn}/boiler_profile`);u!=null&&u.config?l=u.config:s=!0}catch{s=!0}const d={state:{current_temp:((e=a.current_state.temperatures)==null?void 0:e.upper_zone)??((t=a.current_state.temperatures)==null?void 0:t.top),target_temp:void 0,heating:a.current_state.heating,temperatures:a.current_state.temperatures,energy_state:a.current_state.energy_state,recommended_source:a.selected_source||a.current_state.recommended_source||void 0,circulation_recommended:!1},slots:a.plan_slots.map(u=>({start:u.start,end:u.end,consumption_kwh:u.consumption_kwh,avg_consumption_kwh:u.consumption_kwh,recommended_source:u.recommended_source,spot_price:u.spot_price??void 0})),total_consumption_kwh:a.plan_slots.reduce((u,p)=>u+(p.consumption_kwh||0),0),fve_kwh:((i=a.current_state.energy_tracking)==null?void 0:i.fve_kwh)??0,grid_kwh:((r=a.current_state.energy_tracking)==null?void 0:r.grid_kwh)??0,alt_kwh:((n=a.current_state.energy_tracking)==null?void 0:n.alt_kwh)??0,next_slot:a.plan_slots[0]||void 0,profiles:{}};return{profileData:d,planData:d,canonical:a,configProfileUnavailable:s,boilerProfileConfig:l}}catch(a){return _.warn("[Boiler] Failed to fetch canonical",{err:a}),{profileData:null,planData:null,canonical:null,configProfileUnavailable:!1,boilerProfileConfig:null}}}function Rl(e,t,i){const r=e||t,n=r==null?void 0:r.state,a=(n==null?void 0:n.temperatures)||{},s=(n==null?void 0:n.energy_state)||{},l=isFinite(a.upper_zone??a.top)?a.upper_zone??a.top??null:null,d=isFinite(a.lower_zone??a.bottom)?a.lower_zone??a.bottom??null:null,u=isFinite(s.avg_temp)?s.avg_temp??null:null,p=isFinite(s.energy_needed_kwh)?s.energy_needed_kwh??null:null,h=i.targetTempC??60,b=i.coldInletTempC??10,f=Bl(u,h,b),m=(e==null?void 0:e.slots)||[],v=(e==null?void 0:e.next_slot)||jl(m);let $="Neplánováno";if(v){const x=ma(v.recommended_source);$=`${_n(v.start,v.end)} (${x})`}const w=ma((n==null?void 0:n.recommended_source)||(v==null?void 0:v.recommended_source));return{currentTemp:isFinite(n==null?void 0:n.current_temp)?(n==null?void 0:n.current_temp)??null:null,targetTemp:(n==null?void 0:n.target_temp)||h,heating:(n==null?void 0:n.heating)||!1,tempTop:l,tempBottom:d,avgTemp:u,heatingPercent:f,energyNeeded:p,planCost:(e==null?void 0:e.estimated_cost_czk)??null,nextHeating:$,recommendedSource:w,nextProfile:(n==null?void 0:n.next_profile)||"",nextStart:(n==null?void 0:n.next_start)||""}}function jl(e){if(!Array.isArray(e))return null;const t=Date.now();return e.find(i=>{const r=new Date(i.end||i.end_time||"").getTime(),n=i.consumption_kwh??i.avg_consumption_kwh??0;return r>t&&n>0})||null}function Hl(e){var b,f,m;if(!((b=e==null?void 0:e.slots)!=null&&b.length))return null;const t=e.slots.map(v=>({start:v.start||"",end:v.end||"",consumptionKwh:v.consumption_kwh??v.avg_consumption_kwh??0,recommendedSource:v.recommended_source||"",spotPrice:isFinite(v.spot_price)?v.spot_price??null:null,tempTop:v.temp_top,soc:v.soc})),i=t.filter(v=>v.consumptionKwh>0),r=parseFloat(String(e.total_consumption_kwh))||0,n=parseFloat(String(e.fve_kwh))||0,a=parseFloat(String(e.grid_kwh))||0,s=parseFloat(String(e.alt_kwh))||0,l=parseFloat(String(e.estimated_cost_czk))||0;let d="Mix: --";if(r>0){const v=Math.round(n/r*100),$=Math.round(a/r*100),w=Math.round(s/r*100);d=`Mix: FVE ${v}% · Síť ${$}% · Alt ${w}%`}const u=t.filter(v=>v.consumptionKwh>0&&v.spotPrice!==null).map(v=>({slot:v,price:v.spotPrice}));let p="--",h="--";if(u.length){const v=u.reduce((w,x)=>x.price<w.price?x:w),$=u.reduce((w,x)=>x.price>w.price?x:w);p=`${_n(v.slot.start,v.slot.end)} (${v.price.toFixed(2)} Kč/kWh)`,h=`${_n($.slot.start,$.slot.end)} (${$.price.toFixed(2)} Kč/kWh)`}return{slots:t,totalConsumptionKwh:r,fveKwh:n,gridKwh:a,altKwh:s,estimatedCostCzk:l,nextSlot:e.next_slot?{start:e.next_slot.start||"",end:e.next_slot.end||"",consumptionKwh:e.next_slot.consumption_kwh||0,recommendedSource:e.next_slot.recommended_source||"",spotPrice:e.next_slot.spot_price??null}:null,planStart:fa((f=e.slots[0])==null?void 0:f.start),planEnd:fa((m=e.slots[e.slots.length-1])==null?void 0:m.end),sourceDigest:d,activeSlotCount:i.length,cheapestSpot:p,mostExpensiveSpot:h}}function Vl(e){const t=parseFloat(String(e==null?void 0:e.fve_kwh))||0,i=parseFloat(String(e==null?void 0:e.grid_kwh))||0,r=parseFloat(String(e==null?void 0:e.alt_kwh))||0,n=t+i+r;return{fveKwh:t,gridKwh:i,altKwh:r,fvePercent:n>0?t/n*100:0,gridPercent:n>0?i/n*100:0,altPercent:n>0?r/n*100:0}}function Wl(e,t,i){var b;const r=(e==null?void 0:e.summary)||{},n=(b=e==null?void 0:e.profiles)==null?void 0:b[i],a=(n==null?void 0:n.hourly_avg)||{},s=r.predicted_total_kwh??ds(a),l=r.peak_hours??us(a),d=isFinite(r.water_liters_40c)?r.water_liters_40c??null:null,u=r.circulation_windows||[],p=u.length?u.map(f=>`${f.start}–${f.end}`).join(", "):"--";let h="--";if(u.length){const f=new Date,m=f.getHours()*60+f.getMinutes();if(u.some($=>{const w=wi($.start),x=wi($.end);return ba(m,w,x)})){const $=u.find(w=>{const x=wi(w.start),S=wi(w.end);return ba(m,x,S)});h=$?`ANO (do ${$.end})`:"ANO"}else{const $=t==null?void 0:t.state,w=$==null?void 0:$.circulation_recommended;let x=1/0,S=null;for(const B of u){const q=wi(B.start);if(q===null)continue;let k=q-m;k<0&&(k+=24*60),k<x&&(x=k,S=B)}w&&S?h=`DOPORUČENO (${S.start}–${S.end})`:S?h=`Ne (další ${S.start}–${S.end})`:h="Ne"}}return{predictedTodayKwh:s,peakHours:l,waterLiters40c:d,circulationWindows:p,circulationNow:h}}function ql(e){const t=e??{},i=isFinite(t.volume_l)?t.volume_l??null:null,r=isFinite(t.heater_power_kw)?t.heater_power_kw??null:null,n=r!==null?r*1e3:null;return{volumeL:i,heaterPowerW:n,heaterPowerKw:r,targetTempC:isFinite(t.target_temp_c)?t.target_temp_c??null:null,deadlineTime:t.deadline_time||"--:--",stratificationMode:t.stratification_mode||"--",kCoefficient:i?(i*.001163).toFixed(4):"--",coldInletTempC:isFinite(t.cold_inlet_temp_c)?t.cold_inlet_temp_c??10:10,auraMaxTempC:isFinite(t.aura_max_temp_c)?t.aura_max_temp_c??null:null}}function Yl(e){return e!=null&&e.profiles?Object.entries(e.profiles).map(([t,i])=>({id:t,name:i.name||t,targetTemp:i.target_temp||55,startTime:i.start_time||"06:00",endTime:i.end_time||"22:00",days:i.days||[1,1,1,1,1,0,0],enabled:i.enabled!==!1})):[]}function Kl(e){var r;const t=[],i=((r=e==null?void 0:e.summary)==null?void 0:r.today_hours)||[];for(let n=0;n<24;n++){const a=i.includes(n);t.push({hour:n,temp:a?55:25,heating:a})}return t}function Ul(e,t){var s;const i=(s=e==null?void 0:e.profiles)==null?void 0:s[t],r=["Po","Út","St","Čt","Pá","So","Ne"];if(!i)return r.map(l=>({day:l,hours:Array(24).fill(0)}));const n=i.heatmap||[];let a=[];if(n.length>0)a=n.map(l=>l.map(d=>d&&typeof d=="object"?parseFloat(d.consumption)||0:parseFloat(String(d))||0));else{const l=i.hourly_avg||{};a=Array.from({length:7},()=>Array.from({length:24},(d,u)=>parseFloat(String(l[u]||0))))}return r.map((l,d)=>({day:l,hours:a[d]||Array(24).fill(0)}))}function Gl(e,t){var u;const i=(u=e==null?void 0:e.profiles)==null?void 0:u[t],r=(e==null?void 0:e.summary)||{},n=(i==null?void 0:i.hourly_avg)||{},a=Array.from({length:24},(p,h)=>parseFloat(String(n[h]||0))),s=r.predicted_total_kwh??ds(n),l=r.peak_hours??us(n),d=isFinite(r.avg_confidence)?r.avg_confidence??null:null;return{hourlyAvg:a,peakHours:l,predictedTotalKwh:s,confidence:d,daysTracked:7}}function Zl(e,t){var p,h,b;if(!((p=e==null?void 0:e.slots)!=null&&p.length)||!(t!=null&&t.length))return{fve:"--",grid:"--"};const i=(h=e.slots[0])==null?void 0:h.start,r=(b=e.slots[e.slots.length-1])==null?void 0:b.end,n=i?new Date(i).getTime():null,a=r?new Date(r).getTime():null,s=t.filter(f=>{if(!n||!a)return!0;const m=f.timestamp||f.time;if(!m)return!1;const v=new Date(m).getTime();return v>=n&&v<=a}),l=f=>{const m=[];let v=null;for(const $ of s){const w=$.timestamp||$.time;if(!w)continue;const x=new Date(w),S=f($);S&&!v?v={start:x,end:x}:S&&v?v.end=x:!S&&v&&(m.push(v),v=null)}return v&&m.push(v),m.length?m.map($=>`${br($.start)}–${br(new Date($.end.getTime()+15*6e4))}`).join(", "):"--"},d=l(f=>(parseFloat(f.solar_kwh??f.solar_charge_kwh??0)||0)>0),u=l(f=>(parseFloat(f.grid_charge_kwh??0)||0)>0);return{fve:d,grid:u}}async function Ql(){return _.info("[Boiler] Planning heating..."),await ie.callService("oig_cloud","plan_boiler_heating",{})}async function Xl(){return _.info("[Boiler] Applying plan..."),await ie.callService("oig_cloud","apply_boiler_plan",{})}async function Jl(){return _.info("[Boiler] Canceling plan..."),await ie.callService("oig_cloud","cancel_boiler_plan",{})}const ec=new Set(["charging_fve","charging_overflow","charging_grid","discharging","standby","unknown"]);function va(e){return e&&ec.has(e)?e:"unknown"}function tc(e){return e==="on"?"on":e==="off"?"off":"unavailable"}function ic(e,t=!1){var q,k,V;const i={entryId:null,boxId:null,available:!1};if(!e)return{status:null,planSlots:[],explanation:null,manualOverride:null,identity:i,activity:null,sourceSegments:[],timeline:[],sparkline:null,loading:!1,loadError:"Nepodařilo se načíst data bojleru"};const r=e.current_state,n=r.temperatures??{},a=isFinite(n.top)?n.top??null:isFinite(n.upper_zone)?n.upper_zone??null:null,s=isFinite(n.bottom)?n.bottom??null:isFinite(n.lower_zone)?n.lower_zone??null:null,l={currentState:r.heating?"heating":"idle",comfortSatisfied:e.comfort_status.comfort_satisfied,comfortStatusCode:e.comfort_status.comfort_status_code,selectedSource:Xr(e.selected_source).source,actuatedSource:Xr(e.actuated_source).source,temperatureTop:a,temperatureBottom:s,energyNeededKwh:isFinite((q=r.energy_state)==null?void 0:q.energy_needed_kwh)?((k=r.energy_state)==null?void 0:k.energy_needed_kwh)??null:null,heating:r.heating,lastUpdate:r.last_update??null,degraded:e.degraded_flags.degraded,degradedFlags:en(e.degraded_flags.flags??[])},d=(e.plan_slots??[]).map(y=>{const{source:F,sourceInvalid:Y}=Xr(y.recommended_source);return{start:y.start,end:y.end,consumptionKwh:y.consumption_kwh,confidence:y.confidence,recommendedSource:F,sourceInvalid:Y||null,spotPrice:isFinite(y.spot_price)?y.spot_price??null:null,altPrice:isFinite(y.alt_price)?y.alt_price??null:null,overflowAvailable:y.overflow_available,heatingKwh:y.heating_kwh??null,pvKwh:y.pv_kwh??null,gridKwh:y.grid_kwh??null,altKwh:y.alt_kwh??null,expectedTempTopC:y.predicted_temperature_c??null,comfortSatisfied:y.comfort_satisfied??null,estimatedCostCzk:y.estimated_cost_czk??null,pvShare:typeof y.pv_share=="number"?y.pv_share:y.consumption_kwh&&y.pv_contribution_kwh!=null?y.pv_contribution_kwh/y.consumption_kwh:null}}),u=en(e.degraded_flags.flags??[]),p=t?[...u,"config_profile_unavailable"]:u,h=e.freshness??{},b={reasonCodes:e.reason_codes??[],planCreatedAt:h.plan_created_at??null,planValidUntil:h.plan_valid_until??null,dataAgeSecs:isFinite(h.data_age_seconds)?h.data_age_seconds??null:null,degradedReasons:p,unsatisfiedComfortGapC:e.comfort_status.unsatisfied_comfort_gap_c??null,temperatureAtDeadlineC:e.comfort_status.temperature_at_deadline_c??null},f={active:((V=e.manual_override)==null?void 0:V.active)??!1,ttlMinutes:Ol,reason:"",capabilityAvailable:e.manual_override!=null},m={entryId:e.entry_id,boxId:e.box_id,available:!!(e.entry_id&&e.box_id)},v=e.activity??null,$=v!=null?{state:va(v.state),source:Jr(v.source),temperatureTrendCPerMin:isFinite(v.temperature_trend_c_per_min)?v.temperature_trend_c_per_min??null:null,fillLevelPct:isFinite(v.fill_level_pct)?v.fill_level_pct??null:null,auraMaxTempC:isFinite(v.aura_max_temp_c)?v.aura_max_temp_c:0,heaterStates:Object.fromEntries(Object.entries(v.heater_states??{}).map(([y,F])=>[y,tc(F)])),staleFlags:en(Array.isArray(v.stale_flags)?v.stale_flags:[])}:null,w=(e.source_segments??[]).map(y=>({key:Jr(y.key),start:y.start,end:y.end,energyKwh:isFinite(y.energy_kwh)?y.energy_kwh:0,fillPct:isFinite(y.fill_pct)?y.fill_pct:0,active:y.active})),x=(e.timeline??[]).map(y=>({timestamp:y.timestamp,topTempC:isFinite(y.top_temp_c)?y.top_temp_c??null:null,bottomTempC:isFinite(y.bottom_temp_c)?y.bottom_temp_c??null:null,powerKw:isFinite(y.power_kw)?y.power_kw??null:null,sourceKey:Jr(y.source_key),activityState:va(y.activity_state)})),S=e.sparkline??null,B=S!=null?{temperature:Array.isArray(S.temperature)?S.temperature:[],power:Array.isArray(S.power)?S.power:[]}:null;return{status:l,planSlots:d,explanation:b,manualOverride:f,identity:m,activity:$,sourceSegments:w,timeline:x,sparkline:B,loading:!1,loadError:null}}async function rc(e){const{profileData:t,planData:i,canonical:r,configProfileUnavailable:n,boilerProfileConfig:a}=await Nl();let s=null;try{const p=await ie.loadBatteryTimeline($n,"active");s=(p==null?void 0:p.active)||p||null,Array.isArray(s)&&s.length===0&&(s=null)}catch{}const l=(t==null?void 0:t.current_category)||Object.keys((t==null?void 0:t.profiles)||{})[0]||"workday_summer",d=Object.keys((t==null?void 0:t.profiles)||{}),u=ql(a);return{state:Rl(i,t,u),plan:Hl(i),energyBreakdown:Vl(i),predictedUsage:Wl(t,i,l),config:u,profiles:Yl(t||i),heatmap:Kl(i||t),heatmap7x24:Ul(t,l),profiling:Gl(t,l),currentCategory:l,availableCategories:d,forecastWindows:Zl(i,s),v2Data:ic(r,n)}}function nc(e){var i;const t=((i=e==null?void 0:e.locale)==null?void 0:i.language)??(e==null?void 0:e.language)??"cs";return/^en/i.test(t)?"en":"cs"}const De={cs:{"boiler.status.heading":"Stav bojleru","boiler.status.heating":"Ohřev","boiler.status.idle":"Nečinný","boiler.status.unknown":"Neznámý","boiler.status.selected_source":"Vybraný zdroj","boiler.status.actuated_source":"Aktivní zdroj","boiler.status.temp_top":"Teplota nahoře","boiler.status.temp_bottom":"Teplota dole","boiler.status.energy_needed":"Zbývající energie","boiler.status.last_update":"Poslední aktualizace","boiler.status.degraded":"Degradováno","boiler.status.comfort_satisfied":"Komfort splněn","boiler.status.comfort_unsatisfied":"Komfort nesplněn","boiler.status.comfort_unknown":"Komfort neznámý","boiler.timeline.heading":"Plán nabíjení (15 min sloty)","boiler.timeline.empty":"Plán bojleru zatím není k dispozici.","boiler.timeline.col_time":"Čas","boiler.timeline.col_source":"Zdroj","boiler.timeline.col_temp":"Teplota","boiler.timeline.col_kwh":"Energie","boiler.timeline.col_cost":"Cena","boiler.timeline.col_pv":"FVE podíl","boiler.timeline.comfort_ok":"Komfort OK","boiler.timeline.comfort_gap":"Komfort nesplněn","boiler.explanation.heading":"Vysvětlení","boiler.explanation.empty":"Žádné vysvětlení od plánovače.","boiler.explanation.plan_created":"Plán vytvořen","boiler.explanation.plan_valid_until":"Plán platí do","boiler.explanation.data_age":"Stáří dat","boiler.explanation.freshness_heading":"Čerstvost vstupů","boiler.explanation.freshness_fresh":"vstupy aktuální","boiler.explanation.degraded_heading":"Degradované stavy","boiler.explanation.unsatisfied_gap":"Komfortní mezera","boiler.explanation.temp_at_deadline":"Předpokládaná teplota na deadline","boiler.override.heading":"Ruční přepis (sekundární)","boiler.override.subtitle":"Automatický plán je primární — přepis použijte jen výjimečně.","boiler.override.ttl_label":"Délka přepisu (minuty)","boiler.override.reason_label":"Důvod přepisu","boiler.override.submit":"Aktivovat přepis","boiler.override.identity_unavailable":"Nedostupné – identita bojleru není rozpoznána.","boiler.override.capability_unavailable":"Aktuátor neumožňuje ruční přepis.","boiler.override.active":"Přepis aktivní","boiler.override.ttl_remaining_min":"Zbývá","boiler.unavailable.loading":"Načítání dat bojleru…","boiler.unavailable.error":"Chyba při načítání bojleru","boiler.unavailable.degraded":"Bojler v degradovaném režimu","boiler.unavailable.unavailable":"Data bojleru nejsou k dispozici","boiler.source.fve":"FVE","boiler.source.grid":"Síť","boiler.source.alternative":"Alternativa","boiler.source.overflow":"Přetoky","boiler.source.discharge":"Vybíjení","boiler.source.none":"—","boiler.reason.comfort_satisfied":"Komfort splněn","boiler.reason.comfort_unsatisfied":"Komfort nelze splnit","boiler.reason.no_feasible_plan":"Žádný proveditelný plán","boiler.reason.bootstrap_profile":"Učící režim profilu (málo dat)","boiler.reason.history_profile_low_confidence":"Profil s nízkou důvěrou","boiler.reason.input_stale_price":"Ceny nejsou aktuální","boiler.reason.input_stale_pv":"FVE predikce není aktuální","boiler.reason.input_missing_recorder":"Chybí historie z recorderu","boiler.reason.input_adapter_error":"Chyba vstupního adapteru","boiler.reason.input_stale_temperature":"Teplota není aktuální","boiler.reason.top_sensor_unavailable":"Horní teploměr není dostupný","boiler.reason.bottom_sensor_unavailable_top_only_degraded":"Dolní teploměr není dostupný (top-only režim)","boiler.reason.primary_actuator_unavailable":"Hlavní topný aktuátor není dostupný","boiler.reason.alternative_actuator_unavailable_benchmark_only":"Alternativní zdroj jen jako benchmark","boiler.reason.circulation_pump_unavailable":"Cirkulační čerpadlo není dostupné","boiler.reason.actuator_rate_limited":"Aktuátor omezen rychlostním limitem","boiler.reason.actuator_serializer_error":"Chyba serializéru aktuátoru","boiler.reason.override_active":"Ruční přepis aktivní","boiler.reason.override_expired":"Ruční přepis vypršel","boiler.reason.planner_timeout":"Plánovač překročil časový limit","boiler.reason.replan_coalesced":"Přeplánování sloučeno","boiler.reason.source_selected_grid":"Vybrán zdroj: síť","boiler.reason.source_selected_pv":"Vybrán zdroj: FVE","boiler.reason.source_selected_alternative":"Vybrán zdroj: alternativa","boiler.reason.source_benchmark_only":"Alternativa pouze jako srovnání","boiler.reason.setup_incomplete":"Konfigurace bojleru není dokončena","boiler.reason.migration_required":"Vyžaduje se migrace bojleru","boiler.reason.api_repair_required":"Vyžaduje se oprava API","boiler.reason.storage_write_failed":"Selhalo uložení stavu bojleru","boiler.activity.state.charging_fve":"Nabíjení z FVE","boiler.activity.state.charging_overflow":"Nabíjení z přetoků","boiler.activity.state.charging_grid":"Nabíjení ze sítě","boiler.activity.state.discharging":"Vybíjení","boiler.activity.state.standby":"Pohotovost","boiler.activity.state.unknown":"Neznámý stav","boiler.activity.fill_level":"Úroveň naplnění","boiler.activity.temp_trend":"Trend teploty","boiler.activity.aura_max_temp":"Max. teplota AURA","boiler.activity.stale_warning":"Zastaralá data","boiler.eta.label":"Odhadovaný čas do cíle","boiler.eta.already_reached":"Cíl dosažen","boiler.eta.unavailable":"Nelze odhadnout","boiler.config.heater_power_kw":"Výkon topení (kW)","boiler.config.deadline":"Deadline","boiler.config.goal_temp":"Cílová teplota","boiler.aria.status_panel":"Panel stavu bojleru","boiler.aria.plan_timeline":"Časová osa plánu bojleru","boiler.aria.source_explanation":"Vysvětlení zdroje","boiler.aria.override_panel":"Panel ručního přepisu","boiler.aria.svg_summary":"Vizualizace bojleru","boiler.aria.stale":"Data mohou být zastaralá","boiler.aria.source_unknown":"Neznámý zdroj"},en:{"boiler.status.heading":"Boiler status","boiler.status.heating":"Heating","boiler.status.idle":"Idle","boiler.status.unknown":"Unknown","boiler.status.selected_source":"Selected source","boiler.status.actuated_source":"Actuated source","boiler.status.temp_top":"Top temperature","boiler.status.temp_bottom":"Bottom temperature","boiler.status.energy_needed":"Energy needed","boiler.status.last_update":"Last update","boiler.status.degraded":"Degraded","boiler.status.comfort_satisfied":"Comfort satisfied","boiler.status.comfort_unsatisfied":"Comfort not satisfied","boiler.status.comfort_unknown":"Comfort unknown","boiler.timeline.heading":"Heating plan (15 min slots)","boiler.timeline.empty":"No boiler plan available yet.","boiler.timeline.col_time":"Time","boiler.timeline.col_source":"Source","boiler.timeline.col_temp":"Temp","boiler.timeline.col_kwh":"Energy","boiler.timeline.col_cost":"Cost","boiler.timeline.col_pv":"PV share","boiler.timeline.comfort_ok":"Comfort OK","boiler.timeline.comfort_gap":"Comfort gap","boiler.explanation.heading":"Explanation","boiler.explanation.empty":"No planner explanation yet.","boiler.explanation.plan_created":"Plan created","boiler.explanation.plan_valid_until":"Plan valid until","boiler.explanation.data_age":"Data age","boiler.explanation.freshness_heading":"Input freshness","boiler.explanation.freshness_fresh":"inputs fresh","boiler.explanation.degraded_heading":"Degraded state","boiler.explanation.unsatisfied_gap":"Comfort gap","boiler.explanation.temp_at_deadline":"Predicted deadline temperature","boiler.override.heading":"Manual override (secondary)","boiler.override.subtitle":"Automatic plan is primary — use override only when necessary.","boiler.override.ttl_label":"Override duration (minutes)","boiler.override.reason_label":"Override reason","boiler.override.submit":"Activate override","boiler.override.identity_unavailable":"Unavailable – boiler identity is not resolved.","boiler.override.capability_unavailable":"Actuator does not support manual override.","boiler.override.active":"Override active","boiler.override.ttl_remaining_min":"remaining","boiler.unavailable.loading":"Loading boiler data…","boiler.unavailable.error":"Failed to load boiler data","boiler.unavailable.degraded":"Boiler in degraded mode","boiler.unavailable.unavailable":"Boiler data unavailable","boiler.source.fve":"PV","boiler.source.grid":"Grid","boiler.source.alternative":"Alternative","boiler.source.overflow":"Overflow","boiler.source.discharge":"Discharge","boiler.source.none":"—","boiler.reason.comfort_satisfied":"Comfort satisfied","boiler.reason.comfort_unsatisfied":"Comfort cannot be met","boiler.reason.no_feasible_plan":"No feasible plan","boiler.reason.bootstrap_profile":"Bootstrap profile (low data)","boiler.reason.history_profile_low_confidence":"Low-confidence profile","boiler.reason.input_stale_price":"Spot prices are stale","boiler.reason.input_stale_pv":"PV forecast is stale","boiler.reason.input_missing_recorder":"Recorder history missing","boiler.reason.input_adapter_error":"Input adapter error","boiler.reason.input_stale_temperature":"Temperature reading stale","boiler.reason.top_sensor_unavailable":"Top sensor unavailable","boiler.reason.bottom_sensor_unavailable_top_only_degraded":"Bottom sensor unavailable (top-only mode)","boiler.reason.primary_actuator_unavailable":"Primary heating actuator unavailable","boiler.reason.alternative_actuator_unavailable_benchmark_only":"Alternative source benchmark only","boiler.reason.circulation_pump_unavailable":"Circulation pump unavailable","boiler.reason.actuator_rate_limited":"Actuator rate limited","boiler.reason.actuator_serializer_error":"Actuator serializer error","boiler.reason.override_active":"Manual override active","boiler.reason.override_expired":"Manual override expired","boiler.reason.planner_timeout":"Planner timeout","boiler.reason.replan_coalesced":"Replan coalesced","boiler.reason.source_selected_grid":"Source selected: grid","boiler.reason.source_selected_pv":"Source selected: PV","boiler.reason.source_selected_alternative":"Source selected: alternative","boiler.reason.source_benchmark_only":"Alternative is benchmark only","boiler.reason.setup_incomplete":"Boiler setup incomplete","boiler.reason.migration_required":"Boiler migration required","boiler.reason.api_repair_required":"API repair required","boiler.reason.storage_write_failed":"Failed to persist boiler state","boiler.activity.state.charging_fve":"Charging from PV","boiler.activity.state.charging_overflow":"Charging from overflow","boiler.activity.state.charging_grid":"Charging from grid","boiler.activity.state.discharging":"Discharging","boiler.activity.state.standby":"Standby","boiler.activity.state.unknown":"Unknown state","boiler.activity.fill_level":"Fill level","boiler.activity.temp_trend":"Temperature trend","boiler.activity.aura_max_temp":"AURA max temperature","boiler.activity.stale_warning":"Stale data","boiler.eta.label":"Estimated time to target","boiler.eta.already_reached":"Target reached","boiler.eta.unavailable":"Cannot estimate","boiler.config.heater_power_kw":"Heater power (kW)","boiler.config.deadline":"Deadline","boiler.config.goal_temp":"Target temperature","boiler.aria.status_panel":"Boiler status panel","boiler.aria.plan_timeline":"Boiler plan timeline","boiler.aria.source_explanation":"Source explanation","boiler.aria.override_panel":"Manual override panel","boiler.aria.svg_summary":"Boiler visualization","boiler.aria.stale":"Data may be stale","boiler.aria.source_unknown":"Unknown source"}};function C(e,t){const i=De[t]??De.cs;return e in i?i[e]:e in De.cs?De.cs[e]:e}function fr(e,t){const i=`boiler.reason.${e}`;return De[t][i]?De[t][i]:De.cs[i]?De.cs[i]:e}function Ge(e,t){if(!e)return C("boiler.source.none",t);const i=`boiler.source.${e}`;return De[t][i]?De[t][i]:De.cs[i]?De.cs[i]:e}const ya={efficiency:null,health:null,balancing:null,costComparison:null};function ps(e){const t=it();if(!t)return null;const i=t.findSensorId("battery_efficiency"),r=t.get(i);if(!r)return _.debug("Battery efficiency sensor not found"),null;const n=r.attributes||{},a=n.efficiency_last_month_pct!=null?{efficiency:Number(n.efficiency_last_month_pct??0),charged:Number(n.last_month_charge_kwh??0),discharged:Number(n.last_month_discharge_kwh??0),losses:Number(n.losses_last_month_kwh??0)}:null,s=n.efficiency_current_month_pct!=null?{efficiency:Number(n.efficiency_current_month_pct??0),charged:Number(n.current_month_charge_kwh??0),discharged:Number(n.current_month_discharge_kwh??0),losses:Number(n.losses_current_month_kwh??0)}:null,l=a??s;if(!l)return null;const d=a?"last_month":"current_month",u=a&&s?s.efficiency-a.efficiency:0;return{efficiency:l.efficiency,charged:l.charged,discharged:l.discharged,losses:l.losses,lossesPct:n[d==="last_month"?"losses_last_month_pct":"losses_current_month_pct"]??0,trend:u,period:d,currentMonthDays:n.current_month_days??0,lastMonth:a,currentMonth:s}}function hs(e){const t=it();if(!t)return null;const i=t.findSensorId("battery_health"),r=t.get(i);if(!r)return _.debug("Battery health sensor not found"),null;const n=parseFloat(r.state)||0,a=r.attributes||{};let s,l;return n>=95?(s="excellent",l="Vynikající"):n>=90?(s="good",l="Dobrý"):n>=80?(s="fair",l="Uspokojivý"):(s="poor",l="Špatný"),{soh:n,capacity:a.capacity_p80_last_20??a.current_capacity_kwh??0,nominalCapacity:a.current_capacity_kwh??0,minCapacity:a.capacity_p20_last_20??0,measurementCount:a.measurement_count??0,lastAnalysis:a.last_analysis??"",qualityScore:a.quality_score??null,sohMethod:a.soh_selection_method??null,sohMethodDescription:a.soh_method_description??null,measurementHistory:Array.isArray(a.measurement_history)?a.measurement_history:[],degradation3m:a.degradation_3_months_percent??null,degradation6m:a.degradation_6_months_percent??null,degradation12m:a.degradation_12_months_percent??null,degradationPerYear:a.degradation_per_year_percent??null,estimatedEolDate:a.estimated_eol_date??null,yearsTo80Pct:a.years_to_80pct??null,trendConfidence:a.trend_confidence??null,status:s,statusLabel:l}}function xa(e,t,i){if(!e||!t)return{daysRemaining:null,progressPercent:null,intervalDays:i||null};try{const r=new Date(e),n=new Date(t),a=new Date;if(isNaN(r.getTime())||isNaN(n.getTime()))return{daysRemaining:null,progressPercent:null,intervalDays:i||null};const s=n.getTime()-r.getTime(),l=a.getTime()-r.getTime(),d=Math.max(0,Math.round((n.getTime()-a.getTime())/(1e3*60*60*24))),u=s>0?Math.min(100,Math.max(0,Math.round(l/s*100))):null,p=i||Math.round(s/(1e3*60*60*24));return{daysRemaining:d,progressPercent:u,intervalDays:p||null}}catch{return{daysRemaining:null,progressPercent:null,intervalDays:i||null}}}function gs(e){const t=it();if(!t)return null;const i=t.findSensorId("battery_balancing"),r=t.get(i);if(!r){const d=t.get(t.findSensorId("battery_health")),u=d==null?void 0:d.attributes;if(u!=null&&u.balancing_status){const p=String(u.last_balancing??""),h=u.next_balancing?String(u.next_balancing):null,b=xa(p,h,Number(u.balancing_interval_days??0));return{status:String(u.balancing_status??"unknown"),lastBalancing:p,cost:Number(u.balancing_cost??0),nextScheduled:h,...b,estimatedNextCost:u.estimated_next_cost!=null?Number(u.estimated_next_cost):null}}return null}const n=r.attributes||{},a=String(n.last_balancing??""),s=n.next_scheduled?String(n.next_scheduled):null,l=xa(a,s,Number(n.interval_days??0));return{status:r.state||"unknown",lastBalancing:a,cost:Number(n.cost??0),nextScheduled:s,...l,estimatedNextCost:n.estimated_next_cost!=null?Number(n.estimated_next_cost):null}}async function ac(e){var t,i;try{const r=await ie.loadUnifiedCostTile(e);if(!r)return null;const n=r.hybrid??r,a=n.today??{},s=Math.round((a.actual_cost_so_far??a.actual_total_cost??0)*100)/100,l=a.future_plan_cost??0,d=a.plan_total_cost??s+l,u=((t=n.tomorrow)==null?void 0:t.plan_total_cost)??null;let p=null,h=null,b=null,f=null;try{const m=await ie.loadBatteryTimeline(e,"active"),v=(i=m==null?void 0:m.timeline_extended)==null?void 0:i.yesterday;v!=null&&v.summary&&(p=v.summary.planned_total_cost??null,h=v.summary.actual_total_cost??null,b=v.summary.delta_cost??null,f=v.summary.accuracy_pct??null)}catch{_.debug("Yesterday analysis not available")}return{activePlan:"hybrid",actualSpent:s,planTotalCost:d,futurePlanCost:l,tomorrowCost:u,yesterdayPlannedCost:p,yesterdayActualCost:h,yesterdayDelta:b,yesterdayAccuracy:f}}catch(r){return _.error("Failed to fetch cost comparison",r),null}}async function sc(e){const t=ps(),i=hs(),r=gs(),n=await ac(e);return{efficiency:t,health:i,balancing:r,costComparison:n}}function oc(e){return{efficiency:ps(),health:hs(),balancing:gs()}}const Ai={severity:0,warningsCount:0,eventType:"",description:"",instruction:"",onset:"",expires:"",etaHours:0,allWarnings:[],effectiveSeverity:0},lc={vítr:"💨",déšť:"🌧️",sníh:"❄️",bouřky:"⛈️",mráz:"🥶",vedro:"🥵",mlha:"🌫️",náledí:"🧊",laviny:"🏔️"};function fs(e){const t=e.toLowerCase();for(const[i,r]of Object.entries(lc))if(t.includes(i))return r;return"⚠️"}const ms={0:"Bez výstrahy",1:"Nízká",2:"Zvýšená",3:"Vysoká",4:"Extrémní"},vr={0:"#4CAF50",1:"#8BC34A",2:"#FF9800",3:"#f44336",4:"#9C27B0"};function cc(e){const t=it();if(!t)return Ai;const i=`sensor.oig_${e}_chmu_warning_level`,r=t.get(i);if(!r)return _.debug("ČHMÚ sensor not found",{entityId:i}),Ai;const n=parseInt(r.state,10)||0,a=r.attributes||{},s=Number(a.warnings_count??0),l=String(a.event_type??""),d=String(a.description??""),u=String(a.instruction??""),p=String(a.onset??""),h=String(a.expires??""),b=Number(a.eta_hours??0),f=a.all_warnings_details??[],m=Array.isArray(f)?f.map(w=>({event_type:w.event_type??w.event??"",severity:w.severity??n,description:w.description??"",instruction:w.instruction??"",onset:w.onset??"",expires:w.expires??"",eta_hours:w.eta_hours??0})):[],v=l.toLowerCase().includes("žádná výstraha");return{severity:n,warningsCount:s,eventType:l,description:d,instruction:u,onset:p,expires:h,etaHours:b,allWarnings:m,effectiveSeverity:s===0||v?0:n}}const bs={"HOME I":{icon:"🏠",color:"#4CAF50",label:"HOME I"},"HOME II":{icon:"⚡",color:"#2196F3",label:"HOME II"},"HOME III":{icon:"🔋",color:"#9C27B0",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"#FF9800",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"#FF9800",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"#9E9E9E",label:"DO NOTHING"}},vs={yesterday:"📊 Včera",today:"📆 Dnes",tomorrow:"📅 Zítra",history:"📈 Historie",detail:"💎 Detail"};function wa(e){return{modeHistorical:e.mode_historical??e.mode??"",modePlanned:e.mode_planned??"",modeMatch:e.mode_match??!1,status:e.status??"planned",startTime:e.start_time??"",endTime:e.end_time??"",durationHours:e.duration_hours??0,costHistorical:e.cost_historical??null,costPlanned:e.cost_planned??null,costDelta:e.cost_delta??null,solarKwh:e.solar_total_kwh??0,consumptionKwh:e.consumption_total_kwh??0,gridImportKwh:e.grid_import_total_kwh??0,gridExportKwh:e.grid_export_total_kwh??0,intervalReasons:Array.isArray(e.interval_reasons)?e.interval_reasons:[]}}function ur(e){return{plan:(e==null?void 0:e.plan)??0,actual:(e==null?void 0:e.actual)??null,hasActual:(e==null?void 0:e.has_actual)??!1,unit:(e==null?void 0:e.unit)??""}}function dc(e){const t=(e==null?void 0:e.metrics)??{};return{overallAdherence:(e==null?void 0:e.overall_adherence)??0,modeSwitches:(e==null?void 0:e.mode_switches)??0,totalCost:(e==null?void 0:e.total_cost)??0,metrics:{cost:ur(t.cost),solar:ur(t.solar),consumption:ur(t.consumption),grid:ur(t.grid)},completedSummary:e!=null&&e.completed_summary?{count:e.completed_summary.count??0,totalCost:e.completed_summary.total_cost??0,adherencePct:e.completed_summary.adherence_pct??0}:void 0,plannedSummary:e!=null&&e.planned_summary?{count:e.planned_summary.count??0,totalCost:e.planned_summary.total_cost??0}:void 0,progressPct:e==null?void 0:e.progress_pct,actualTotalCost:e==null?void 0:e.actual_total_cost,planTotalCost:e==null?void 0:e.plan_total_cost,vsPlanPct:e==null?void 0:e.vs_plan_pct,eodPrediction:e!=null&&e.eod_prediction?{predictedTotal:e.eod_prediction.predicted_total??0,predictedSavings:e.eod_prediction.predicted_savings??0}:void 0}}function uc(e){return e?{date:e.date??"",modeBlocks:Array.isArray(e.mode_blocks)?e.mode_blocks.map(wa):[],summary:dc(e.summary),metadata:e.metadata?{activePlan:e.metadata.active_plan??"hybrid",comparisonPlanAvailable:e.metadata.comparison_plan_available}:void 0,comparison:e.comparison?{plan:e.comparison.plan??"",modeBlocks:Array.isArray(e.comparison.mode_blocks)?e.comparison.mode_blocks.map(wa):[]}:void 0}:null}async function pc(e,t,i="hybrid"){try{const r=await ie.loadDetailTabs(e,t,i);if(!r)return null;const n=r[t]??r;return uc(n)}catch(r){return _.error(`Failed to load timeline tab: ${t}`,r),null}}const kn={tiles_left:[null,null,null,null,null,null],tiles_right:[null,null,null,null,null,null],left_count:4,right_count:4,visible:!0,version:1},ys="oig_dashboard_tiles";function hc(e,t){return t==="W"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kW"}:t==="Wh"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kWh"}:t==="W"||t==="Wh"?{value:Math.round(e).toString(),unit:t}:{value:e.toFixed(1),unit:t}}async function gc(){var e;try{const t=await ie.callWS({type:"call_service",domain:"oig_cloud",service:"get_dashboard_tiles",service_data:{},return_response:!0}),i=(e=t==null?void 0:t.response)==null?void 0:e.config;if(i&&typeof i=="object")return _.debug("Loaded tiles config from HA"),_a(i)}catch(t){_.debug("WS tile config load failed, trying localStorage",{error:t.message})}try{const t=localStorage.getItem(ys);if(t){const i=JSON.parse(t);return _.debug("Loaded tiles config from localStorage"),_a(i)}}catch{_.debug("localStorage tile config load failed")}return kn}async function $a(e){try{return localStorage.setItem(ys,JSON.stringify(e)),await ie.callService("oig_cloud","save_dashboard_tiles",{config:JSON.stringify(e)}),_.info("Tiles config saved"),!0}catch(t){return _.error("Failed to save tiles config",t),!1}}function _a(e){return{tiles_left:Array.isArray(e.tiles_left)?e.tiles_left.slice(0,6):kn.tiles_left,tiles_right:Array.isArray(e.tiles_right)?e.tiles_right.slice(0,6):kn.tiles_right,left_count:typeof e.left_count=="number"?e.left_count:4,right_count:typeof e.right_count=="number"?e.right_count:4,visible:e.visible!==!1,version:e.version??1}}function rn(e){var l;const t=it();if(!t)return{value:"--",unit:"",isActive:!1,rawValue:0};const i=t.get(e);if(!i||i.state==="unavailable"||i.state==="unknown")return{value:"--",unit:"",isActive:!1,rawValue:0};const r=i.state,n=String(((l=i.attributes)==null?void 0:l.unit_of_measurement)??""),a=parseFloat(r)||0;if(i.entity_id.startsWith("switch.")||i.entity_id.startsWith("binary_sensor."))return{value:r==="on"?"Zapnuto":"Vypnuto",unit:"",isActive:r==="on",rawValue:r==="on"?1:0};const s=hc(a,n);return{value:s.value,unit:s.unit,isActive:a!==0,rawValue:a}}function $i(e){const t=(i,r)=>{var a,s;const n=[];for(let l=0;l<r;l++){const d=i[l];if(!d)continue;const u=rn(d.entity_id),p={};if((a=d.support_entities)!=null&&a.top_right){const h=rn(d.support_entities.top_right);p.topRight={value:h.value,unit:h.unit}}if((s=d.support_entities)!=null&&s.bottom_right){const h=rn(d.support_entities.bottom_right);p.bottomRight={value:h.value,unit:h.unit}}n.push({config:d,value:u.value,unit:u.unit,isActive:u.isActive,isZero:u.rawValue===0,formattedValue:u.unit?`${u.value} ${u.unit}`:u.value,supportValues:p})}return n};return{left:t(e.tiles_left,e.left_count),right:t(e.tiles_right,e.right_count)}}async function fc(e,t="toggle"){const i=e.split(".")[0];return ie.callService(i,t,{entity_id:e})}function Yt(e){return e==null||Number.isNaN(e)?"-- Wh":Math.abs(e)>=1e3?`${(e/1e3).toFixed(2)} kWh`:`${Math.round(e)} Wh`}function oe(e,t="CZK"){return e==null||Number.isNaN(e)?`-- ${t}`:`${e.toFixed(2)} ${t}`}function Kt(e,t=0){return e==null||Number.isNaN(e)?"-- %":`${e.toFixed(t)} %`}const mc={fridge:"❄️","fridge-outline":"❄️",dishwasher:"🍽️","washing-machine":"🧺","tumble-dryer":"🌪️",stove:"🔥",microwave:"📦","coffee-maker":"☕",kettle:"🫖",toaster:"🍞",lightbulb:"💡","lightbulb-outline":"💡",lamp:"🪔","ceiling-light":"💡","floor-lamp":"🪔","led-strip":"✨","led-strip-variant":"✨","wall-sconce":"💡",chandelier:"💡",thermometer:"🌡️",thermostat:"🌡️",radiator:"♨️","radiator-disabled":"❄️","heat-pump":"♨️","air-conditioner":"❄️",fan:"🌀",hvac:"♨️",fire:"🔥",snowflake:"❄️","lightning-bolt":"⚡",flash:"⚡",battery:"🔋","battery-charging":"🔋","battery-50":"🔋","solar-panel":"☀️","solar-power":"☀️","meter-electric":"⚡","power-plug":"🔌","power-socket":"🔌",car:"🚗","car-electric":"🚘","car-battery":"🔋","ev-station":"🔌","ev-plug-type2":"🔌",garage:"🏠","garage-open":"🏠",door:"🚪","door-open":"🚪",lock:"🔒","lock-open":"🔓","shield-home":"🛡️",cctv:"📹",camera:"📹","motion-sensor":"👁️","alarm-light":"🚨",bell:"🔔","window-closed":"🪟","window-open":"🪟",blinds:"🪟","blinds-open":"🪟",curtains:"🪟","roller-shade":"🪟",television:"📺",speaker:"🔊","speaker-wireless":"🔊",music:"🎵","volume-high":"🔊",cast:"📡",chromecast:"📡","router-wireless":"📡",wifi:"📶","access-point":"📡",lan:"🌐",network:"🌐","home-assistant":"🏠",water:"💧","water-percent":"💧","water-boiler":"♨️","water-pump":"💧",shower:"🚿",toilet:"🚽",faucet:"🚰",pipe:"🔧","weather-sunny":"☀️","weather-cloudy":"☁️","weather-night":"🌙","weather-rainy":"🌧️","weather-snowy":"❄️","weather-windy":"💨",information:"ℹ️","help-circle":"❓","alert-circle":"⚠️","checkbox-marked-circle":"✅","toggle-switch":"🔘",power:"⚡",sync:"🔄"};function yr(e){const t=e.replace(/^mdi:/,"");return mc[t]||"⚙️"}function nn(e,t){let i=!1;return(...r)=>{i||(e(...r),i=!0,setTimeout(()=>i=!1,t))}}async function _i(e,t=3,i=1e3){let r;for(let n=0;n<=t;n++)try{return await e()}catch(a){if(r=a,a instanceof Error&&(a.message.includes("401")||a.message.includes("403")))throw a;if(n<t){const s=Math.min(i*Math.pow(2,n),5e3);await new Promise(l=>setTimeout(l,s))}}throw r}class bc{constructor(){this.state={...os,pendingServices:new Map,changingServices:new Set},this.listeners=new Set,this.watcherUnsub=null,this.queueUpdateInterval=null,this.started=!1}start(){this.started||(this.started=!0,this.watcherUnsub=_t.onEntityChange((t,i)=>{t&&this.shouldRefreshShield(t)&&this.refresh()}),this.refresh(),this.queueUpdateInterval=window.setInterval(()=>{this.state.allRequests.length>0&&this.notify()},1e3),_.debug("ShieldController started"))}stop(){var t;(t=this.watcherUnsub)==null||t.call(this),this.watcherUnsub=null,this.queueUpdateInterval!==null&&(clearInterval(this.queueUpdateInterval),this.queueUpdateInterval=null),this.started=!1,_.debug("ShieldController stopped")}subscribe(t){return this.listeners.add(t),t(this.state),()=>this.listeners.delete(t)}getState(){return this.state}shouldRefreshShield(t){return["service_shield_","box_prms_mode","box_mode_extended","box_prm2_app","boiler_manual_mode","invertor_prms_to_grid","invertor_prm1_p_max_feed_grid"].some(r=>t.includes(r))}readSupplementaryState(t){const i=t.findSensorId("box_mode_extended"),r=t.get(i);if(!r||r.state==="unavailable"||r.state==="unknown"||r.state==="")return{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1};const n=r.attributes??{};return{home_grid_v:n.home_grid_v===!0,home_grid_vi:n.home_grid_vi===!0,flexibilita:n.flexibilita===!0,available:!0}}refresh(){const t=it();if(t)try{const i=t.findSensorId("service_shield_activity"),r=t.get(i),n=(r==null?void 0:r.attributes)??{},a=n.running_requests??[],s=n.queued_requests??[],l=t.findSensorId("service_shield_status"),d=t.findSensorId("service_shield_queue"),u=t.getString(l).value,p=t.getNumeric(d).value,h=t.getString(t.findSensorId("box_prms_mode")).value,b=t.getString(t.findSensorId("invertor_prms_to_grid")).value,f=t.getNumeric(t.findSensorId("invertor_prm1_p_max_feed_grid")).value,m=t.getString(t.findSensorId("boiler_manual_mode")).value,v=na[h.trim()]??"home_1",$=aa[m.trim()]??"cbb",w=a.map((W,K)=>this.parseRequest(W,K,!0)),x=s.map((W,K)=>this.parseRequest(W,K+a.length,!1)),S=[...w,...x],B=new Map,q=new Set;for(const W of S){const K=this.parseServiceRequest(W);K&&!B.has(K.type)&&(B.set(K.type,K.targetValue),q.add(K.type))}const k=u==="Running"||u==="running",F=ls({gridModeRaw:b,gridLimit:f},{pendingServices:B,changingServices:q,shieldStatus:k?"running":"idle"}),Y=bn(b)||F.currentLiveDelivery==="unknown"?this.state.currentGridDelivery:F.currentLiveDelivery;this.state={status:k?"running":"idle",activity:(r==null?void 0:r.state)??"",queueCount:p,runningRequests:w,queuedRequests:x,allRequests:S,currentBoxMode:v,currentGridDelivery:Y,currentGridLimit:F.currentLiveLimit??0,currentBoilerMode:$,pendingServices:B,changingServices:q,gridDeliveryState:F,supplementary:this.readSupplementaryState(t)},this.notify()}catch(i){_.error("ShieldController refresh failed",i)}}parseRequest(t,i,r){const n=t||{},a=n.service??"",l=(Array.isArray(n.changes)?n.changes:[]).map(m=>typeof m=="string"?m:String(m??"")).filter(m=>m.length>0),d=n.started_at??n.queued_at??n.created_at??n.timestamp??n.created??"",u=Array.isArray(n.targets)?n.targets.map(m=>({param:String((m==null?void 0:m.param)??""),value:String((m==null?void 0:m.value)??(m==null?void 0:m.to)??""),entityId:String((m==null?void 0:m.entity_id)??(m==null?void 0:m.entityId)??""),from:String((m==null?void 0:m.from)??""),to:String((m==null?void 0:m.to)??(m==null?void 0:m.value)??""),current:String((m==null?void 0:m.current)??"")})):[],p=this.extractRequestParams(n.params),h=this.extractGridDeliveryStep(n,p),b=this.resolveRequestTargetValue(n,u,p,h);let f="mode_change";if(a.includes("set_box_mode")){const m=this.extractRequestParams(n.params);f=(m==null?void 0:m.home_grid_v)!==void 0||(m==null?void 0:m.home_grid_vi)!==void 0||Array.isArray(n.targets)&&n.targets.some($=>($==null?void 0:$.param)==="app")?"supplementary_toggle":"mode_change"}else a.includes("set_grid_delivery")&&!a.includes("limit")?f="grid_delivery":a.includes("grid_delivery_limit")||a.includes("set_grid_delivery")?f="grid_limit":a.includes("set_boiler_mode")?f="boiler_mode":a.includes("set_formating_mode")&&(f="battery_formating");return{id:`${a}_${i}_${d}`,type:f,status:r?"running":"queued",service:a,targetValue:b,changes:l,createdAt:d,position:i+1,description:typeof n.description=="string"?n.description:void 0,params:p,targets:u,traceId:typeof n.trace_id=="string"?n.trace_id:void 0,gridDeliveryStep:h}}parseServiceRequest(t){var u,p;const i=t.service;if(!i)return null;const r=t.changes.length>0?t.changes[0]:"",n=t.params,a=t.gridDeliveryStep,s=this.extractStructuredTarget(t);if(i.includes("set_grid_delivery")&&s)return s;if(i.includes("set_grid_delivery")&&r.includes("p_max_feed_grid")){const h=r.match(/→\s*'?(\d+)'?/),b=h?h[1]:t.targetValue;return b?{type:"grid_limit",targetValue:b}:null}const l=r.match(/→\s*'([^']+)'/),d=l?l[1]:t.targetValue||"";if(i.includes("set_box_mode")){if(((u=t.targets)==null?void 0:u.some(b=>b.param==="app"))||(n==null?void 0:n.home_grid_v)!==void 0||(n==null?void 0:n.home_grid_vi)!==void 0){const b=(p=t.targets)==null?void 0:p.find(v=>v.param==="app"),f=(b==null?void 0:b.to)||t.targetValue;return{type:"supplementary",targetValue:ss[f]??f??""}}return{type:"box_mode",targetValue:d}}if(i.includes("set_boiler_mode"))return{type:"boiler_mode",targetValue:d};if(i.includes("set_grid_delivery")&&r.includes("prms_to_grid"))return{type:"grid_mode",targetValue:d};if(i.includes("set_grid_delivery")){if(a==="limit"){const b=this.normalizeNumericTargetValue((n==null?void 0:n.limit)??t.targetValue);return b?{type:"grid_limit",targetValue:b}:null}if(a==="mode"){const b=this.normalizeModeTargetValue((n==null?void 0:n.mode)??t.targetValue);return b?{type:"grid_mode",targetValue:b}:null}const h=r.match(/→\s*'?(\d+)'?/);return h?{type:"grid_limit",targetValue:h[1]}:t.targetValue&&/^\d+$/.test(t.targetValue.trim())?{type:"grid_limit",targetValue:t.targetValue}:{type:"grid_mode",targetValue:d}}return null}extractRequestParams(t){if(!(!t||typeof t!="object"||Array.isArray(t)))return t}extractGridDeliveryStep(t,i){const r=(t==null?void 0:t.grid_delivery_step)??(i==null?void 0:i._grid_delivery_step);return typeof r=="string"?r:void 0}resolveRequestTargetValue(t,i,r,n){const a=this.extractStructuredTarget({service:(t==null?void 0:t.service)??"",targetValue:"",params:r,targets:i,gridDeliveryStep:n});if(a!=null&&a.targetValue)return a.targetValue;const s=t.target_value??t.target_display;return typeof s=="string"?s:""}extractStructuredTarget(t){if(!t.service.includes("set_grid_delivery"))return null;const i=t.gridDeliveryStep,r=t.params,n=t.targets??[];if(i==="limit"){const l=this.findTargetValue(n,["limit"]),d=this.normalizeNumericTargetValue(l??(r==null?void 0:r.limit)??t.targetValue);return d?{type:"grid_limit",targetValue:d}:null}if(i==="mode"){const l=this.findTargetValue(n,["mode"]),d=this.normalizeModeTargetValue(l??(r==null?void 0:r.mode)??t.targetValue);return d?{type:"grid_mode",targetValue:d}:null}const a=this.findTargetValue(n,["limit"]);if(a){const l=this.normalizeNumericTargetValue(a);if(l)return{type:"grid_limit",targetValue:l}}const s=this.findTargetValue(n,["mode"]);if(s){const l=this.normalizeModeTargetValue(s);if(l)return{type:"grid_mode",targetValue:l}}return null}findTargetValue(t,i){const r=new Set(i),n=t.find(a=>r.has(a.param));return(n==null?void 0:n.to)||(n==null?void 0:n.value)||void 0}normalizeNumericTargetValue(t){if(typeof t=="number"&&Number.isFinite(t))return String(Math.round(t));if(typeof t!="string")return"";const i=t.trim().match(/(\d+)/);return i?i[1]:""}normalizeModeTargetValue(t){if(typeof t!="string")return"";const i=t.trim();switch(i.toLowerCase()){case"off":return"Vypnuto";case"on":return"Zapnuto";case"limited":return"Omezeno";default:return i}}isLimitedGridDeliveryActiveOrPending(){const t=this.state.gridDeliveryState;if(t.pendingDeliveryTarget==="limited"||t.pendingLimitTarget!==null||t.currentLiveDelivery==="limited"||t.currentLiveDelivery==="unknown"&&(sl(t)==="limited"||this.state.currentGridDelivery==="limited"))return!0;const i=it();if(i){const r=i.getString(i.findSensorId("invertor_prms_to_grid")).value;if(!bn(r)&&On(r)==="limited")return!0}return!1}needsGridModeChangeForLimitedRequest(){return!this.isLimitedGridDeliveryActiveOrPending()}getBoxModeButtonState(t){const i=this.state.pendingServices.get("box_mode");return i?na[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoxMode===t?"active":"idle"}getGridDeliveryButtonState(t){return this.getGridDeliveryButtonStateV2(t)}getGridDeliveryButtonStateV2(t){const i=this.state.gridDeliveryState,n=this.state.status==="running"?"processing":"pending",a=i.pendingDeliveryTarget,s=i.pendingLimitTarget,l=i.currentLiveDelivery;return a!==null?a===t?n:t==="limited"&&l==="limited"||t==="limited"&&l==="unknown"&&this.state.currentGridDelivery==="limited"?"active":"disabled-by-service":s!==null?t==="limited"?n:"disabled-by-service":l===t?"active":"idle"}getBoilerModeButtonState(t){const i=this.state.pendingServices.get("boiler_mode");return i?aa[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoilerMode===t?"active":"idle"}isAnyServiceChanging(){return this.state.changingServices.size>0}shouldProceedWithQueue(){return this.state.queueCount<3?!0:window.confirm(`⚠️ VAROVÁNÍ: Fronta již obsahuje ${this.state.queueCount} úkolů!

Každá změna může trvat až 10 minut.
Opravdu chcete přidat další úkol?`)}async setBoxMode(t){if(this.state.currentBoxMode===t&&!this.state.changingServices.has("box_mode"))return!1;const i=await ie.callService("oig_cloud","set_box_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async setGridDelivery(t,i){const r={acknowledgement:!0,warning:!0};t==="limited"&&i!=null?(this.needsGridModeChangeForLimitedRequest()&&(r.mode=t),r.limit=i):i!=null?r.limit=i:r.mode=t;const n=await ie.callService("oig_cloud","set_grid_delivery",r);return n&&this.refresh(),n}async setBoilerMode(t){if(this.state.currentBoilerMode===t&&!this.state.changingServices.has("boiler_mode"))return!1;const i=await ie.callService("oig_cloud","set_boiler_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async removeFromQueue(t){const i=await ie.callService("oig_cloud","shield_remove_from_queue",{position:t});return i&&this.refresh(),i}async setSupplementaryToggle(t,i){const r=await ie.callService("oig_cloud","set_box_mode",{[t]:i,acknowledgement:!0});return r&&this.refresh(),r}notify(){for(const t of this.listeners)try{t(this.state)}catch(i){_.error("ShieldController listener error",i)}}}const te=new bc;var vc=Object.defineProperty,yc=Object.getOwnPropertyDescriptor,Dt=(e,t,i,r)=>{for(var n=r>1?void 0:r?yc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&vc(t,i,n),n};const Ce=G;let Ze=class extends D{constructor(){super(...arguments),this.title="Energetické Toky",this.time="",this.showStatus=!1,this.alertCount=0,this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1}onStatusClick(){this.dispatchEvent(new CustomEvent("status-click",{bubbles:!0}))}onEditClick(){this.dispatchEvent(new CustomEvent("edit-click",{bubbles:!0}))}onResetClick(){this.dispatchEvent(new CustomEvent("reset-click",{bubbles:!0}))}onToggleLeftPanel(){this.dispatchEvent(new CustomEvent("toggle-left-panel",{bubbles:!0}))}onToggleRightPanel(){this.dispatchEvent(new CustomEvent("toggle-right-panel",{bubbles:!0}))}render(){const e=this.alertCount>0?"warning":"ok";return c`
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
    `}};Ze.styles=M`
    :host {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: ${Ce(o.bgPrimary)};
      border-bottom: 1px solid ${Ce(o.divider)};
      gap: 12px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
      color: ${Ce(o.textPrimary)};
      margin: 0;
    }

    .title-icon { font-size: 20px; }

    .version {
      font-size: 11px;
      color: ${Ce(o.textSecondary)};
      background: ${Ce(o.bgSecondary)};
      padding: 2px 6px;
      border-radius: 4px;
    }

    .time {
      font-size: 13px;
      color: ${Ce(o.textSecondary)};
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
      background: ${Ce(o.warning)};
      color: #fff;
    }

    .status-badge.error {
      background: ${Ce(o.error)};
      color: #fff;
    }

    .status-badge.ok {
      background: ${Ce(o.success)};
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
      color: ${Ce(o.textSecondary)};
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: ${Ce(o.bgSecondary)};
      color: ${Ce(o.textPrimary)};
    }

    .action-btn.active {
      background: ${Ce(o.accent)};
      color: #fff;
    }
  `;Dt([g({type:String})],Ze.prototype,"title",2);Dt([g({type:String})],Ze.prototype,"time",2);Dt([g({type:Boolean})],Ze.prototype,"showStatus",2);Dt([g({type:Number})],Ze.prototype,"alertCount",2);Dt([g({type:Boolean})],Ze.prototype,"leftPanelCollapsed",2);Dt([g({type:Boolean})],Ze.prototype,"rightPanelCollapsed",2);Ze=Dt([E("oig-header")],Ze);function xs(e,t){let i=null;return function(...r){i!==null&&clearTimeout(i),i=window.setTimeout(()=>{e.apply(this,r),i=null},t)}}var xc=Object.defineProperty,wc=Object.getOwnPropertyDescriptor,Xi=(e,t,i,r)=>{for(var n=r>1?void 0:r?wc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&xc(t,i,n),n};const ka="oig_v2_theme";let kt=class extends D{constructor(){super(...arguments),this.mode="auto",this.isDark=!1,this.breakpoint="desktop",this.width=1280,this.mediaQuery=null,this.resizeObserver=null,this.debouncedResize=xs(this.updateBreakpoint.bind(this),100),this.onMediaChange=e=>{this.mode==="auto"&&(this.isDark=e.matches,this.dispatchEvent(new CustomEvent("theme-changed",{detail:{isDark:this.isDark}})))},this.onThemeChange=()=>{this.detectTheme()}}connectedCallback(){super.connectedCallback(),this.loadTheme(),this.setupMediaQuery(),this.setupResizeObserver(),this.detectTheme(),window.addEventListener("oig-theme-change",this.onThemeChange)}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mediaQuery)==null||e.removeEventListener("change",this.onMediaChange),(t=this.resizeObserver)==null||t.disconnect(),window.removeEventListener("oig-theme-change",this.onThemeChange)}loadTheme(){const e=localStorage.getItem(ka);e&&["light","dark","auto"].includes(e)&&(this.mode=e)}saveTheme(){localStorage.setItem(ka,this.mode)}setupMediaQuery(){this.mediaQuery=window.matchMedia("(prefers-color-scheme: dark)"),this.mediaQuery.addEventListener("change",this.onMediaChange)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(this.debouncedResize),this.resizeObserver.observe(document.documentElement),this.updateBreakpoint()}updateBreakpoint(){this.width=window.innerWidth,this.breakpoint=qt(this.width)}detectTheme(){this.mode==="auto"?this.isDark=window.matchMedia("(prefers-color-scheme: dark)").matches:this.isDark=this.mode==="dark"}setTheme(e){this.mode=e,this.saveTheme(),this.detectTheme(),this.dispatchEvent(new CustomEvent("theme-changed",{detail:{mode:e,isDark:this.isDark}})),_.info("Theme changed",{mode:e,isDark:this.isDark})}getThemeInfo(){return{mode:this.mode,isDark:this.isDark,breakpoint:this.breakpoint,width:this.width}}render(){return c`
      <slot></slot>
    `}};kt.styles=M`
    :host {
      display: contents;
    }
  `;Xi([g({type:String})],kt.prototype,"mode",2);Xi([P()],kt.prototype,"isDark",2);Xi([P()],kt.prototype,"breakpoint",2);Xi([P()],kt.prototype,"width",2);kt=Xi([E("oig-theme-provider")],kt);var $c=Object.defineProperty,_c=Object.getOwnPropertyDescriptor,Ln=(e,t,i,r)=>{for(var n=r>1?void 0:r?_c(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&$c(t,i,n),n};let Li=class extends D{constructor(){super(...arguments),this.tabs=[],this.activeTab=""}onTabClick(e){e!==this.activeTab&&(this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tabId:e},bubbles:!0})))}isActive(e){return this.activeTab===e}render(){return c`
      ${this.tabs.map(e=>c`
        <button 
          class="tab ${this.isActive(e.id)?"active":""}"
          @click=${()=>this.onTabClick(e.id)}
        >
          ${e.icon?c`<span class="tab-icon">${e.icon}</span>`:null}
          <span>${e.label}</span>
        </button>
      `)}
    `}};Li.styles=M`
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
  `;Ln([g({type:Array})],Li.prototype,"tabs",2);Ln([g({type:String})],Li.prototype,"activeTab",2);Li=Ln([E("oig-tabs")],Li);var kc=Object.defineProperty,Sc=Object.getOwnPropertyDescriptor,In=(e,t,i,r)=>{for(var n=r>1?void 0:r?Sc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&kc(t,i,n),n};const Cc="oig_v2_layout_",an=G;let Ii=class extends D{constructor(){super(...arguments),this.editable=!1,this.breakpoint="desktop",this.onResize=xs(()=>{this.breakpoint=qt(window.innerWidth)},100)}connectedCallback(){super.connectedCallback(),this.breakpoint=qt(window.innerWidth),window.addEventListener("resize",this.onResize)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("resize",this.onResize)}updated(e){e.has("breakpoint")&&this.setAttribute("breakpoint",this.breakpoint)}resetLayout(){const e=`${Cc}${this.breakpoint}`;localStorage.removeItem(e),this.requestUpdate()}render(){return c`<slot></slot>`}};Ii.styles=M`
    :host {
      display: grid;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      background: ${an(o.bgSecondary)};
    }

    :host([breakpoint='mobile']) { grid-template-columns: 1fr; }
    :host([breakpoint='tablet']) { grid-template-columns: repeat(2, 1fr); }
    :host([breakpoint='desktop']) { grid-template-columns: repeat(3, 1fr); }

    .grid-item {
      position: relative;
      background: ${an(o.cardBg)};
      border-radius: 8px;
      box-shadow: ${an(o.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .grid-item.editable { cursor: move; }
    .grid-item.editable:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .grid-item.dragging { opacity: 0.8; transform: scale(1.02); z-index: 100; }

    @media (max-width: 768px) {
      :host { gap: 12px; padding: 12px; }
    }
  `;In([g({type:Boolean})],Ii.prototype,"editable",2);In([P()],Ii.prototype,"breakpoint",2);Ii=In([E("oig-grid")],Ii);const Tc={off:"Vypnuto",on:"Zapnuto",limited:"Omezeno",unknown:"?"};function Sa(e){return Tc[e]??e}const ws=e=>{const t=e.trim();return t?t.endsWith("W")?t:`${t}W`:""};function Pc(e){const t=e.isUnavailable;let i;t||e.currentLiveDelivery==="unknown"?i="?":e.currentLiveDelivery==="limited"&&e.currentLiveLimit!==null?i=`Omezeno ${e.currentLiveLimit}W`:i=Sa(e.currentLiveDelivery);const r=!t&&e.currentLiveDelivery==="limited";let n=null,a=null;!t&&e.currentLiveLimit!==null&&(a=`${e.currentLiveLimit}W`,n=r?"Aktivní limit":"Nastavený limit");let s=null,l=null;return e.pendingDeliveryTarget!==null&&(s=`Ve frontě: ${Sa(e.pendingDeliveryTarget)}`),e.pendingLimitTarget!==null&&(l=`Ve frontě: limit ${ws(String(e.pendingLimitTarget))}`),{currentModeText:i,limitLabel:n,limitValue:a,showLimitAsActive:r,isUnavailable:t,isTransitioning:e.isTransitioning,pendingModeText:s,pendingLimitText:l}}function Mc(e,t){const i=t.has("box_mode"),r=e.get("box_mode"),n=t.has("grid_mode")||t.has("grid_limit"),a=e.get("grid_limit"),s=e.get("grid_mode");let l=null;if(a){const d=ws(a);l=d?`→ ${d}`:null}else s&&(l=`→ ${s}`);return{inverterModeChanging:i,inverterModeText:r?`→ ${r}`:null,gridExportChanging:n,gridExportText:l}}var Dc=Object.defineProperty,Ec=Object.getOwnPropertyDescriptor,Nr=(e,t,i,r)=>{for(var n=r>1?void 0:r?Ec(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Dc(t,i,n),n};let Gt=class extends D{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1}get fillHeight(){return Math.max(0,Math.min(100,this.soc))/100*54}get fillY(){return 13+(54-this.fillHeight)}render(){return c`
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
    `}};Gt.styles=M`
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
  `;Nr([g({type:Number})],Gt.prototype,"soc",2);Nr([g({type:Boolean})],Gt.prototype,"charging",2);Nr([g({type:Boolean})],Gt.prototype,"gridCharging",2);Gt=Nr([E("oig-battery-gauge")],Gt);var Oc=Object.defineProperty,zc=Object.getOwnPropertyDescriptor,Rr=(e,t,i,r)=>{for(var n=r>1?void 0:r?zc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Oc(t,i,n),n};let Zt=class extends D{constructor(){super(...arguments),this.power=0,this.percent=0,this.maxPower=5400}get isNight(){return this.percent<2}get level(){return this.percent<2?"night":this.percent<20?"low":this.percent<65?"mid":"high"}get sunColor(){const e=this.level;return e==="low"?"#b0bec5":e==="mid"?"#ffd54f":"#ffb300"}get rayLen(){const e=this.level;return e==="low"?4:e==="mid"?7:10}get rayOpacity(){const e=this.level;return e==="low"?.5:e==="mid"?.8:1}get coreRadius(){const e=this.level;return e==="low"?7:e==="mid"?9:11}renderMoon(){return Z`
      <circle cx="24" cy="24" r="20" fill="#3949ab" opacity="0.28"/>
      <g class="moon-body">
        <path d="M24 6 A18 18 0 1 0 24 42 A13 13 0 1 1 24 6Z" fill="#cfd8dc" opacity="0.95"/>
      </g>
      <circle class="star" cx="7" cy="10" r="1.5" fill="#e8eaf6" style="animation-delay:0s"/>
      <circle class="star" cx="41" cy="7" r="1.8" fill="#e8eaf6" style="animation-delay:0.7s"/>
      <circle class="star" cx="5" cy="30" r="1.2" fill="#c5cae9" style="animation-delay:1.4s"/>
      <circle class="star" cx="6" cy="44" r="1.0" fill="#c5cae9" style="animation-delay:2.1s"/>
      <circle class="star" cx="42" cy="39" r="1.3" fill="#e8eaf6" style="animation-delay:2.8s"/>
    `}renderSun(){const i=this.coreRadius,r=i+3,n=r+this.rayLen,a=this.sunColor,s=this.rayOpacity,d=[0,45,90,135,180,225,270,315].map(p=>{const h=p*Math.PI/180,b=24+Math.cos(h)*r,f=24+Math.sin(h)*r,m=24+Math.cos(h)*n,v=24+Math.sin(h)*n;return Z`
        <line class="ray"
          x1="${b}" y1="${f}" x2="${m}" y2="${v}"
          stroke="${a}" stroke-width="2.5" opacity="${s}"
        />
      `}),u=this.level==="low";return Z`
      <!-- Paprsky obaleny v <g> pro CSS rotaci -->
      <g class="rays-group">
        ${d}
      </g>
      <circle class="sun-core" cx="${24}" cy="${24}" r="${i}" fill="${a}" />
      ${u?Z`
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
    `}};Zt.styles=M`
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
  `;Rr([g({type:Number})],Zt.prototype,"power",2);Rr([g({type:Number})],Zt.prototype,"percent",2);Rr([g({type:Number})],Zt.prototype,"maxPower",2);Zt=Rr([E("oig-solar-icon")],Zt);var Ac=Object.defineProperty,Lc=Object.getOwnPropertyDescriptor,Ji=(e,t,i,r)=>{for(var n=r>1?void 0:r?Lc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Ac(t,i,n),n};let St=class extends D{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1,this.discharging=!1,this._clipId=`batt-clip-${Math.random().toString(36).slice(2)}`}get fillColor(){return this.gridCharging?"#42a5f5":this.soc>50?"#4caf50":this.soc>20?"#ff9800":"#f44336"}get fillHeight(){return Math.max(1,Math.min(100,this.soc)/100*48)}get fillY(){return 14+(48-this.fillHeight)}get stripeColor(){return this.gridCharging?"#90caf9":"#a5d6a7"}render(){const e=this.charging||this.gridCharging,t=this.soc>=25;return c`
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
        ${e?Z`
          <rect
            class="charge-stripe active"
            x="4" y="52" width="24" height="8" rx="2"
            fill="${this.stripeColor}"
            clip-path="url(#${this._clipId})"
          />
        `:""}

        <!-- SoC text uvnitř -->
        ${t?Z`
          <text class="soc-text" x="16" y="${this.fillY+this.fillHeight/2}">
            ${Math.round(this.soc)}%
          </text>
        `:""}
      </svg>
    `}};St.styles=M`
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
  `;Ji([g({type:Number})],St.prototype,"soc",2);Ji([g({type:Boolean})],St.prototype,"charging",2);Ji([g({type:Boolean})],St.prototype,"gridCharging",2);Ji([g({type:Boolean})],St.prototype,"discharging",2);St=Ji([E("oig-battery-icon")],St);var Ic=Object.defineProperty,Fc=Object.getOwnPropertyDescriptor,$s=(e,t,i,r)=>{for(var n=r>1?void 0:r?Fc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Ic(t,i,n),n};let xr=class extends D{constructor(){super(...arguments),this.power=0}get mode(){return this.power>50?"importing":this.power<-50?"exporting":"idle"}render(){const e=this.mode;return c`
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
    `}};xr.styles=M`
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
  `;$s([g({type:Number})],xr.prototype,"power",2);xr=$s([E("oig-grid-icon")],xr);var Bc=Object.defineProperty,Nc=Object.getOwnPropertyDescriptor,jr=(e,t,i,r)=>{for(var n=r>1?void 0:r?Nc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Bc(t,i,n),n};let Qt=class extends D{constructor(){super(...arguments),this.power=0,this.maxPower=1e4,this.boilerActive=!1}get percent(){return Math.min(100,this.power/Math.max(1,this.maxPower)*100)}get fillColor(){const e=this.percent;return e<15?"#546e7a":e<40?"#f06292":e<70?"#e91e63":"#c62828"}get level(){const e=this.percent;return e<15?"low":e<60?"mid":"high"}get windowColor(){const e=this.level;return e==="low"?"#37474f":e==="mid"?"#ffd54f":"#ffb300"}render(){const e=this.percent,t=24,i=22,r=Math.max(1,e/100*t),n=i+(t-r),a=this.level;return c`
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
        ${this.boilerActive?Z`
          <circle class="boiler-dot" cx="10" cy="43" r="3.5" fill="#ff5722" opacity="0.9"/>
          <text x="10" y="43" text-anchor="middle" dominant-baseline="middle" font-size="5" fill="white">🔥</text>
        `:""}
      </svg>
    `}};Qt.styles=M`
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
  `;jr([g({type:Number})],Qt.prototype,"power",2);jr([g({type:Number})],Qt.prototype,"maxPower",2);jr([g({type:Boolean})],Qt.prototype,"boilerActive",2);Qt=jr([E("oig-house-icon")],Qt);var Rc=Object.defineProperty,jc=Object.getOwnPropertyDescriptor,er=(e,t,i,r)=>{for(var n=r>1?void 0:r?jc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Rc(t,i,n),n};let Ct=class extends D{constructor(){super(...arguments),this.mode="",this.bypassActive=!1,this.hasAlarm=!1,this.plannerAuto=!1}get modeType(){return this.hasAlarm?"alarm":this.bypassActive?"bypass":this.mode.includes("UPS")?"ups":"normal"}render(){const e=this.modeType;return c`
      <svg viewBox="0 0 48 48">
        <!-- Hlavní box střídače -->
        <rect
          class="box ${e}"
          x="4" y="8" width="40" height="34" rx="5"
        />

        <!-- Sinusoida výstupu -->
        <path class="sine-out ${e}" d="${"M 10,28 C 14,28 14,20 18,22 C 22,24 22,32 26,32 C 30,32 30,20 34,22 C 38,24 38,28 38,28"}"/>

        <!-- UPS blesk -->
        ${e==="ups"?Z`
          <path class="ups-bolt active"
            d="M 25,12 L 20,26 L 24,26 L 23,36 L 28,22 L 24,22 Z"
          />
        `:""}

        <!-- Bypass výstraha — trojúhelník nahoře -->
        ${e==="bypass"?Z`
          <polygon
            class="warning-triangle active"
            points="24,6 18,16 30,16"
          />
          <text x="24" y="15" text-anchor="middle" dominant-baseline="middle"
            font-size="6" font-weight="bold" fill="#fff">!</text>
        `:""}

        <!-- Alarm kroužek -->
        ${e==="alarm"?Z`
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
    `}};Ct.styles=M`
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
  `;er([g({type:String})],Ct.prototype,"mode",2);er([g({type:Boolean})],Ct.prototype,"bypassActive",2);er([g({type:Boolean})],Ct.prototype,"hasAlarm",2);er([g({type:Boolean})],Ct.prototype,"plannerAuto",2);Ct=er([E("oig-inverter-icon")],Ct);var Hc=Object.defineProperty,Vc=Object.getOwnPropertyDescriptor,He=(e,t,i,r)=>{for(var n=r>1?void 0:r?Vc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Hc(t,i,n),n};const U=G,Ca=new URLSearchParams(window.location.search),Wc=Ca.get("sn")||Ca.get("inverter_sn")||"",qc=e=>`sensor.oig_${Wc}_${e}`,sn="oig_v2_flow_layout_",ft=["solar","battery","inverter","grid","house"],Yc={solar:{top:"0%",left:"0%"},house:{top:"0%",left:"65%"},inverter:{top:"35%",left:"35%"},grid:{top:"70%",left:"0%"},battery:{top:"70%",left:"65%"}};function N(e){return()=>ie.openEntityDialog(qc(e))}let Ee=class extends D{constructor(){super(...arguments),this.data=En,this.editMode=!1,this.pendingServices=new Map,this.changingServices=new Set,this.shieldStatus="idle",this.shieldQueueCount=0,this.gridDeliveryState={currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},this.shieldUnsub=null,this.expandedNodes=new Set,this.customPositions={},this.draggedNodeId=null,this.dragStartX=0,this.dragStartY=0,this.dragStartTop=0,this.dragStartLeft=0,this.onShieldUpdate=e=>{this.pendingServices=e.pendingServices,this.changingServices=e.changingServices,this.shieldStatus=e.status,this.shieldQueueCount=e.queueCount,this.gridDeliveryState=e.gridDeliveryState},this.handleDragStart=e=>{if(!this.editMode)return;e.preventDefault(),e.stopPropagation();const i=e.target.closest(".node");if(!i)return;const r=this.findNodeId(i);if(!r)return;this.draggedNodeId=r,i.classList.add("dragging");const n=i.getBoundingClientRect();this.dragStartX=e.clientX,this.dragStartY=e.clientY,this.dragStartTop=n.top,this.dragStartLeft=n.left},this.handleTouchStart=e=>{if(!this.editMode)return;e.preventDefault();const i=e.target.closest(".node");if(!i)return;const r=this.findNodeId(i);if(!r)return;this.draggedNodeId=r,i.classList.add("dragging");const n=e.touches[0],a=i.getBoundingClientRect();this.dragStartX=n.clientX,this.dragStartY=n.clientY,this.dragStartTop=a.top,this.dragStartLeft=a.left},this.handleDragMove=e=>{!this.draggedNodeId||!this.editMode||(e.preventDefault(),this.updateDragPosition(e.clientX,e.clientY))},this.handleTouchMove=e=>{if(!this.draggedNodeId||!this.editMode)return;e.preventDefault();const t=e.touches[0];this.updateDragPosition(t.clientX,t.clientY)},this.handleDragEnd=e=>{var r;if(!this.draggedNodeId||!this.editMode)return;const t=(r=this.shadowRoot)==null?void 0:r.querySelector(".flow-grid"),i=t==null?void 0:t.querySelector(`.node-${this.draggedNodeId}`);i&&i.classList.remove("dragging"),this.saveLayout(),this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0})),this.draggedNodeId=null},this.handleTouchEnd=e=>{this.handleDragEnd(e)}}connectedCallback(){super.connectedCallback(),this.loadSavedLayout(),this.shieldUnsub=te.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),this.removeDragListeners(),(e=this.shieldUnsub)==null||e.call(this),this.shieldUnsub=null}updated(e){e.has("editMode")&&(this.editMode?(this.setAttribute("editmode",""),this.loadSavedLayout(),this.requestUpdate(),this.updateComplete.then(()=>this.applySavedPositions())):(this.removeAttribute("editmode"),this.removeDragListeners(),this.clearInlinePositions(),this.updateComplete.then(()=>this.applyCustomPositions()))),!this.editMode&&this.hasCustomLayout&&this.updateComplete.then(()=>this.applyCustomPositions())}loadSavedLayout(){const e=qt(window.innerWidth),t=`${sn}${e}`;try{const i=localStorage.getItem(t);i&&(this.customPositions=JSON.parse(i),_.debug("[FlowNode] Loaded layout for "+e))}catch{}}applySavedPositions(){var t;if(!this.editMode)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of ft){const r=this.customPositions[i];if(!r)continue;const n=e.querySelector(`.node-${i}`);n&&(n.style.top=r.top,n.style.left=r.left)}this.initDragListeners()}}clearInlinePositions(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of ft){const r=e.querySelector(`.node-${i}`);r&&(r.style.top="",r.style.left="")}}saveLayout(){const e=qt(window.innerWidth),t=`${sn}${e}`;try{localStorage.setItem(t,JSON.stringify(this.customPositions)),_.debug("[FlowNode] Saved layout for "+e)}catch{}}toggleExpand(e,t){const i=t.target;if(i.closest(".clickable")||i.closest(".indicator")||i.closest(".forecast-badge")||i.closest(".node-value")||i.closest(".node-subvalue")||i.closest(".gc-plan-btn"))return;const r=new Set(this.expandedNodes);r.has(e)?r.delete(e):r.add(e),this.expandedNodes=r}nodeClass(e,t=""){const i=this.expandedNodes.has(e)?" expanded":"";return`node node-${e}${i}${t?" "+t:""}`}get hasCustomLayout(){return ft.some(e=>{const t=this.customPositions[e];return(t==null?void 0:t.top)!=null&&(t==null?void 0:t.left)!=null})}applyCustomPositions(){var t;if(this.editMode||!this.hasCustomLayout)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of ft){const r=e.querySelector(`.node-${i}`);if(!r)continue;const n=this.customPositions[i]??Yc[i];r.style.top=n.top,r.style.left=n.left}}resetLayout(){const e=qt(window.innerWidth),t=`${sn}${e}`;localStorage.removeItem(t),this.customPositions={},this.clearInlinePositions(),this.editMode&&this.requestUpdate(),_.debug("[FlowNode] Reset layout for "+e)}initDragListeners(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of ft){const r=e.querySelector(`.node-${i}`);r&&(r.addEventListener("mousedown",this.handleDragStart),r.addEventListener("touchstart",this.handleTouchStart,{passive:!1}))}document.addEventListener("mousemove",this.handleDragMove),document.addEventListener("mouseup",this.handleDragEnd),document.addEventListener("touchmove",this.handleTouchMove,{passive:!1}),document.addEventListener("touchend",this.handleTouchEnd)}}removeDragListeners(){document.removeEventListener("mousemove",this.handleDragMove),document.removeEventListener("mouseup",this.handleDragEnd),document.removeEventListener("touchmove",this.handleTouchMove),document.removeEventListener("touchend",this.handleTouchEnd)}findNodeId(e){for(const i of ft)if(e.classList.contains(`node-${i}`))return i;const t=e.closest('[class*="node-"]');if(!t)return null;for(const i of ft)if(t.classList.contains(`node-${i}`))return i;return null}updateDragPosition(e,t){var x;if(!this.draggedNodeId)return;const i=(x=this.shadowRoot)==null?void 0:x.querySelector(".flow-grid");if(!i)return;const r=i.querySelector(`.node-${this.draggedNodeId}`);if(!r)return;const n=i.getBoundingClientRect(),a=r.getBoundingClientRect(),s=e-this.dragStartX,l=t-this.dragStartY,d=this.dragStartLeft+s,u=this.dragStartTop+l,p=n.left,h=n.right-a.width,b=n.top,f=n.bottom-a.height,m=Math.max(p,Math.min(h,d)),v=Math.max(b,Math.min(f,u)),$=(m-n.left)/n.width*100,w=(v-n.top)/n.height*100;r.style.left=`${$}%`,r.style.top=`${w}%`,this.customPositions[this.draggedNodeId]={top:`${w}%`,left:`${$}%`},this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0}))}renderSolar(){const e=this.data,t=e.solarPercent,i=t<2,r=i?"linear-gradient(135deg, rgba(57,73,171,0.25) 0%, rgba(26,35,126,0.18) 100%)":bi.solar,n=i?"rgba(121,134,203,0.5)":vi.solar,a=i?"position:absolute;top:4px;left:6px;font-size:11px;background:rgba(57,73,171,0.35);color:#9fa8da;padding:3px 8px;border-radius:4px;border:1px solid rgba(121,134,203,0.4)":"position:absolute;top:4px;left:6px;font-size:9px",s=i?"position:absolute;top:4px;right:6px;font-size:11px;background:rgba(57,73,171,0.35);color:#9fa8da;padding:3px 8px;border-radius:4px;border:1px solid rgba(121,134,203,0.4)":"position:absolute;top:4px;right:6px;font-size:9px";return c`
      <div class="${this.nodeClass("solar",i?"night":"")}" style="--node-gradient: ${r}; --node-border: ${n};"
        @click=${l=>this.toggleExpand("solar",l)}>
        <div class="node-header" style="margin-top:16px">
          <oig-solar-icon .power=${e.solarPower} .percent=${t} .maxPower=${5400}></oig-solar-icon>
          <span class="node-label">Solár</span>
        </div>
        <div class="node-value" @click=${N("actual_fv_total")}>
          ${xi(e.solarPower)}
        </div>
        <div class="node-subvalue" @click=${N("dc_in_fv_ad")}>
          Dnes: ${(e.solarToday/1e3).toFixed(2)} kWh
        </div>

        <button class="indicator" style="${a}" @click=${N("solar_forecast")}
          title=${e.solarForecastStale?"Předpověď je zastaralá":"Předpověď FVE na dnes"}>
          ${e.solarForecastStale?"⚠":"🔮"} ${e.solarForecastToday.toFixed(1)} kWh
        </button>
        <button class="indicator" style="${s}" @click=${N("solar_forecast")}
          title=${e.solarForecastStale?"Předpověď je zastaralá":"Předpověď FVE na zítra"}>
          ${e.solarForecastStale?"⚠":"🌅"} ${e.solarForecastTomorrow.toFixed(1)} kWh
        </button>

        <div class="detail-section">
          <div class="solar-strings">
            <div>
              <div class="detail-header">🏭 String 1</div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${N("extended_fve_voltage_1")}>${Math.round(e.solarV1)}V</button>
              </div>
              <div class="detail-row">
                <span class="icon">〰️</span>
                <button class="clickable" @click=${N("extended_fve_current_1")}>${e.solarI1.toFixed(1)}A</button>
              </div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${N("dc_in_fv_p1")}>${Math.round(e.solarP1)} W</button>
              </div>
            </div>
            <div>
              <div class="detail-header">🏭 String 2</div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${N("extended_fve_voltage_2")}>${Math.round(e.solarV2)}V</button>
              </div>
              <div class="detail-row">
                <span class="icon">〰️</span>
                <button class="clickable" @click=${N("extended_fve_current_2")}>${e.solarI2.toFixed(1)}A</button>
              </div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${N("dc_in_fv_p2")}>${Math.round(e.solarP2)} W</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `}openGridChargingDialog(){this.dispatchEvent(new CustomEvent("oig-grid-charging-open",{bubbles:!0,composed:!0,detail:{data:this.data.gridChargingPlan}}))}getBatteryStatus(){const e=this.data;return e.batteryPower>10?{text:`⚡ Nabíjení${e.timeToFull?` (${e.timeToFull})`:""}`,cls:"status-charging pulse"}:e.batteryPower<-10?{text:`⚡ Vybíjení${e.timeToEmpty?` (${e.timeToEmpty})`:""}`,cls:"status-discharging pulse"}:{text:"◉ Klid",cls:"status-idle"}}getBalancingIndicator(){const e=this.data,t=e.balancingState;return t!=="charging"&&t!=="holding"&&t!=="completed"?{show:!1,text:"",icon:"",cls:""}:t==="charging"?{show:!0,text:`Nabíjení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⚡",cls:"charging"}:t==="holding"?{show:!0,text:`Držení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⏸️",cls:"holding"}:{show:!0,text:"Dokončeno",icon:"✅",cls:"completed"}}renderBattery(){const e=this.data,t=this.getBatteryStatus(),i=this.getBalancingIndicator(),r=e.batteryPower>10,n=e.batteryTemp>25?"🌡️":e.batteryTemp<15?"🧊":"🌡️",a=e.batteryTemp>25?"temp-hot":e.batteryTemp<15?"temp-cold":"";return c`
      <div class="${this.nodeClass("battery")}" style="--node-gradient: ${bi.battery}; --node-border: ${vi.battery};"
        @click=${s=>this.toggleExpand("battery",s)}>

        <div class="node-header">
          <!-- Jediná ikona: SVG baterie nahrazuje gauge + emoji -->
          <oig-battery-icon
            .soc=${e.batterySoC}
            ?charging=${r&&!e.isGridCharging}
            ?gridCharging=${e.isGridCharging&&r}
            ?discharging=${e.batteryPower<-10}
          ></oig-battery-icon>
          <span class="node-label">Baterie</span>
        </div>

        <div class="node-value" @click=${N("batt_bat_c")}>
          ${Math.round(e.batterySoC)} %
        </div>
        <div class="node-subvalue" @click=${N("batt_batt_comp_p")}>
          ${xi(e.batteryPower)}
        </div>

        <div class="node-status ${t.cls}">${t.text}</div>

        ${e.isGridCharging?c`
          <span class="grid-charging-badge">⚡🔌 Síťové nabíjení</span>
        `:O}
        ${i.show?c`
          <span class="balancing-indicator ${i.cls}">
            <span>${i.icon}</span>
            <span>${i.text}</span>
          </span>
        `:O}

        <div class="battery-indicators">
          <button class="indicator" @click=${N("extended_battery_voltage")}>
            ⚡ ${e.batteryVoltage.toFixed(1)} V
          </button>
          <button class="indicator" @click=${N("extended_battery_current")}>
            〰️ ${e.batteryCurrent.toFixed(1)} A
          </button>
          <button class="indicator ${a}" @click=${N("extended_battery_temperature")}>
            ${n} ${e.batteryTemp.toFixed(1)} °C
          </button>
        </div>

        <!-- Energie + gc-plan vždy viditelné (ne v detail-section) -->
        <div class="battery-energy-section">
          <div class="detail-header">⚡ Energie dnes</div>
          <div class="energy-grid">
            <div class="detail-row">
              <span class="icon">⬆️</span>
              <button class="clickable" @click=${N("computed_batt_charge_energy_today")}>
                Nab: ${gt(e.batteryChargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">⬇️</span>
              <button class="clickable" @click=${N("computed_batt_discharge_energy_today")}>
                Vyb: ${gt(e.batteryDischargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">☀️</span>
              <button class="clickable" @click=${N("computed_batt_charge_fve_energy_today")}>
                FVE: ${gt(e.batteryChargeSolar)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">🔌</span>
              <button class="clickable" @click=${N("computed_batt_charge_grid_energy_today")}>
                Síť: ${gt(e.batteryChargeGrid)}
              </button>
            </div>
          </div>

          <!-- Grid charging plan — always visible badge -->
          <div class="grid-charging-plan-summary">
            <button class="gc-plan-btn ${e.gridChargingPlan.hasBlocks?"has-plan":""}"
              @click=${s=>{s.stopPropagation(),this.openGridChargingDialog()}}>
              🔌
              ${e.gridChargingPlan.hasBlocks?c`Plán: ${e.gridChargingPlan.totalEnergyKwh.toFixed(1)} kWh`:c`Plán nabíjení`}
              <span class="gc-plan-arrow">›</span>
            </button>
          </div>
        </div>
      </div>
    `}getInverterModeDesc(){const e=this.data.inverterMode;return e.includes("Home 1")?"Max baterie + FVE":e.includes("Home 2")?"Šetří baterii":e.includes("Home 3")?"Priorita nabíjení":e.includes("UPS")?"Vše ze sítě":""}renderInverter(){const e=this.data,t=fl(e.inverterMode),i=e.bypassStatus.toLowerCase()==="on"||e.bypassStatus==="1",r=e.inverterTemp>35?"🔥":"🌡️",n=ml(e.inverterGridMode),a=Mc(this.pendingServices,this.changingServices),s=Pc(this.gridDeliveryState);let l="planner-unknown",d="Plánovač: N/A";return e.plannerAutoMode===!0?(l="planner-auto",d="Plánovač: AUTO"):e.plannerAutoMode===!1&&(l="planner-off",d="Plánovač: VYPNUTO"),c`
      <div class="${this.nodeClass("inverter",a.inverterModeChanging?"mode-changing":"")}" style="--node-gradient: ${bi.inverter}; --node-border: ${vi.inverter};"
        @click=${u=>this.toggleExpand("inverter",u)}>
        <div class="node-header">
          <oig-inverter-icon
            .mode=${e.inverterMode}
            ?bypassActive=${i}
            ?hasAlarm=${e.notificationsError>0}
            ?plannerAuto=${e.plannerAutoMode===!0}
          ></oig-inverter-icon>
          <span class="node-label">Střídač</span>
        </div>
        <div class="node-value" @click=${N("box_prms_mode")}>
          ${a.inverterModeChanging?c`<span class="spinner spinner--small"></span>`:O}
          ${t.icon} ${t.text}
        </div>
        ${this.getInverterModeDesc()?c`<div class="node-subvalue">${this.getInverterModeDesc()}</div>`:O}
        ${a.inverterModeText?c`<div class="pending-text">${a.inverterModeText}</div>`:O}

        <div class="planner-badge ${l}">${d}</div>
        <div class="shield-badge ${this.shieldStatus==="running"?"shield-running":"shield-idle"}">
          🛡️ ${this.shieldStatus==="running"?"Zpracovávám":"Nečinný"}${this.shieldQueueCount>0?c` <span class="shield-queue">(${this.shieldQueueCount})</span>`:O}
        </div>

        <div class="battery-indicators" style="margin-top:6px">
          <button class="indicator" @click=${N("box_temp")}>
            ${r} ${e.inverterTemp.toFixed(1)} °C
          </button>
          <button class="indicator ${i?"bypass-warning":""}" @click=${N("bypass_status")}>
            <span id="inverter-bypass-icon">${i?"🔴":"🟢"}</span> Bypass: ${i?"ON":"OFF"}
          </button>
        </div>

        <!-- Přetoky + notifikace — vždy viditelné -->
        <div class="battery-indicators" style="margin-top:4px">
          <button class="indicator ${s.isUnavailable?"current-state-unknown":""}" @click=${N("invertor_prms_to_grid")}>
            ${n.icon} ${s.currentModeText}
          </button>
          <button class="clickable notif-badge ${e.notificationsError>0?"has-error":e.notificationsUnread>0?"has-unread":"indicator"}"
            @click=${N("notification_count_unread")}>
            🔔 ${e.notificationsUnread}/${e.notificationsError}
          </button>
        </div>
        ${s.pendingModeText?c`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${s.pendingModeText}
          </div>
        `:O}

        <div class="detail-section">
          <div class="detail-header">🌊 Přetoky — limit</div>
          ${s.limitLabel!==null?c`
            <div class="detail-row">
              <span class="detail-label">${s.limitLabel}</span>
              <button class="clickable ${s.showLimitAsActive?"limit-active":""}" @click=${N("invertor_prm1_p_max_feed_grid")}>
                ${s.limitValue}
              </button>
            </div>
          `:O}
          ${s.pendingLimitText?c`
            <div class="pending-overlay">
              <span class="spinner spinner--small"></span>
              ${s.pendingLimitText}
            </div>
          `:O}
        </div>
      </div>
    `}getGridStatus(){const e=this.data.gridPower;return e>10?{text:"⬇ Import",cls:"status-importing pulse"}:e<-10?{text:"⬆ Export",cls:"status-exporting pulse"}:{text:"◉ Žádný tok",cls:"status-idle"}}renderGrid(){const e=this.data,t=this.getGridStatus();return c`
      <div class="${this.nodeClass("grid")}" style="--node-gradient: ${bi.grid}; --node-border: ${vi.grid};"
        @click=${i=>this.toggleExpand("grid",i)}>

        <!-- Tarif badge vlevo nahoře -->
        <button class="indicator" style="position:absolute;top:4px;left:6px;font-size:9px" @click=${N("current_tariff")}>
          ${gl(e.currentTariff)}
        </button>
        <!-- Frekvence vpravo nahoře -->
        <button class="indicator" style="position:absolute;top:4px;right:6px;font-size:9px" @click=${N("ac_in_aci_f")}>
          ${e.gridFrequency.toFixed(1)} Hz
        </button>

        <!-- SVG ikona -->
        <div class="node-svg-icon" style="margin-top:14px">
          <oig-grid-icon .power=${e.gridPower} style="width:44px;height:44px"></oig-grid-icon>
        </div>
        <div class="node-label" style="margin-bottom:2px">Síť</div>

        <!-- Hlavní hodnota -->
        <div class="node-value" @click=${N("actual_aci_wtotal")}>
          ${xi(e.gridPower)}
        </div>
        <div class="node-status ${t.cls}">${t.text}</div>

        <!-- Ceny — vždy viditelné jako rychlý přehled -->
        <div class="prices-row" style="margin-top:4px">
          <div class="price-cell">
            <span class="price-label">⬇ Spot</span>
            <button class="price-val price-spot" @click=${N("spot_price_current_15min")}>
              ${e.spotPrice.toFixed(2)} Kč
            </button>
          </div>
          <div class="energy-divider-v"></div>
          <div class="price-cell">
            <span class="price-label">⬆ Výkup</span>
            <button class="price-val price-export" @click=${N("export_price_current_15min")}>
              ${e.exportPrice.toFixed(2)} Kč
            </button>
          </div>
        </div>

        <!-- 3 fáze — vždy viditelné -->
        <div class="phases-grid" style="margin-top:6px">
          <div class="phase-cell">
            <span class="phase-label">L1</span>
            <button class="phase-val" @click=${N("actual_aci_wr")}>${Math.round(e.gridL1P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${U(o.textSecondary)}" @click=${N("ac_in_aci_vr")}>${Math.round(e.gridL1V)}V</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L2</span>
            <button class="phase-val" @click=${N("actual_aci_ws")}>${Math.round(e.gridL2P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${U(o.textSecondary)}" @click=${N("ac_in_aci_vs")}>${Math.round(e.gridL2V)}V</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L3</span>
            <button class="phase-val" @click=${N("actual_aci_wt")}>${Math.round(e.gridL3P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${U(o.textSecondary)}" @click=${N("ac_in_aci_vt")}>${Math.round(e.gridL3V)}V</button>
          </div>
        </div>

        <div class="detail-section">
          <!-- Energie dnes — odběr vlevo, dodávka vpravo -->
          <div class="energy-symmetric">
            <div class="energy-side">
              <span class="energy-side-label">⬇ Odběr</span>
              <button class="energy-side-val energy-import" @click=${N("ac_in_ac_ad")}>
                ${gt(e.gridImportToday)}
              </button>
            </div>
            <div class="energy-divider-v"></div>
            <div class="energy-side">
              <span class="energy-side-label">⬆ Dodávka</span>
              <button class="energy-side-val energy-export" @click=${N("ac_in_ac_pd")}>
                ${gt(e.gridExportToday)}
              </button>
            </div>
          </div>

        </div>
      </div>
    `}renderHouse(){const e=this.data;return c`
      <div class="${this.nodeClass("house")}" style="--node-gradient: ${bi.house}; --node-border: ${vi.house};"
        @click=${t=>this.toggleExpand("house",t)}>
        <div class="node-header">
          <oig-house-icon
            .power=${e.housePower}
            .maxPower=${e.boilerInstallPower>0?1e4:8e3}
            ?boilerActive=${e.boilerIsUse}
          ></oig-house-icon>
          <span class="node-label">Spotřeba</span>
        </div>

        <div class="node-value" @click=${N("actual_aco_p")}>
          ${xi(e.housePower)}
        </div>
        <div class="node-subvalue" @click=${N("ac_out_en_day")}>
          Dnes: ${(e.houseTodayWh/1e3).toFixed(1)} kWh
        </div>

        <!-- Per-phase consumption — clickable na entity (konzistentní se Sítí) -->
        <div class="phases">
          <button class="phase-val" @click=${N("ac_out_aco_pr")}>${Math.round(e.houseL1)}W</button>
          <span class="phase-sep">|</span>
          <button class="phase-val" @click=${N("ac_out_aco_ps")}>${Math.round(e.houseL2)}W</button>
          <span class="phase-sep">|</span>
          <button class="phase-val" @click=${N("ac_out_aco_pt")}>${Math.round(e.houseL3)}W</button>
        </div>

        ${e.boilerIsUse?c`
          <div class="boiler-section">
            <div class="detail-header">🔥 Bojler</div>
            <div class="detail-row">
              <span class="icon">⚡</span>
              <span>Výkon:</span>
              <button class="clickable" @click=${N("boiler_current_cbb_w")}>
                ${xi(e.boilerPower)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">📊</span>
              <span>Nabito:</span>
              <button class="clickable" @click=${N("boiler_day_w")}>
                ${gt(e.boilerDayEnergy)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">${e.boilerManualMode==="CBB"?"🤖":e.boilerManualMode==="Manual"?"👤":"⚙️"}</span>
              <span>Režim:</span>
              <button class="clickable" @click=${N("boiler_manual_mode")}>
                ${e.boilerManualMode==="CBB"?"🤖 Inteligentní":e.boilerManualMode==="Manual"?"👤 Manuální":e.boilerManualMode||"--"}
              </button>
            </div>
          </div>
        `:O}
      </div>
    `}render(){return c`
      <div class="flow-grid ${this.hasCustomLayout&&!this.editMode?"custom-layout":""}">
        ${this.renderSolar()}
        ${this.renderBattery()}
        ${this.renderInverter()}
        ${this.renderGrid()}
        ${this.renderHouse()}
      </div>
    `}};Ee.styles=M`
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
      color: ${U(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .node-value {
      font-size: 22px;
      font-weight: 700;
      color: ${U(o.textPrimary)};
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
      color: ${U(o.textSecondary)};
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
      color: ${U(o.textSecondary)};
      margin-top: 4px;
    }

    .pending-overlay {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: ${U(o.accent)};
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 4px;
      padding: 2px 6px;
      margin-top: 4px;
    }

    .current-state-unknown {
      color: ${U(o.textSecondary)};
      font-style: italic;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid ${U(o.divider)};
      border-top-color: ${U(o.accent)};
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
      border-top: 1px solid ${U(o.divider)};
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
      border-top: 1px dashed ${U(o.divider)};
    }

    .detail-header {
      font-size: 10px;
      font-weight: 600;
      color: ${U(o.textSecondary)};
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: ${U(o.textSecondary)};
      margin-bottom: 2px;
    }

    .detail-row .icon { width: 14px; text-align: center; flex-shrink: 0; }

    .clickable {
      cursor: pointer;
      color: ${U(o.textPrimary)};
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
      color: ${U(o.textSecondary)};
      margin: 4px 0;
      align-items: center;
    }

    .phase-sep { color: ${U(o.divider)}; }

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
      background: ${U(o.bgSecondary)};
      border: none;
      font-family: inherit;
      color: ${U(o.textSecondary)};
    }

    .indicator:hover { background: ${U(o.divider)}; }

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
      border-top: 1px solid ${U(o.divider)};
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
      border: 1px solid ${U(o.divider)};
      background: transparent;
      color: ${U(o.textSecondary)};
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .gc-plan-btn:hover {
      background: rgba(255,255,255,0.06);
      color: ${U(o.textPrimary)};
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
      border-top: 1px dashed ${U(o.divider)};
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
      color: ${U(o.textSecondary)};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .phase-val {
      font-size: 11px;
      font-weight: 600;
      color: ${U(o.textPrimary)};
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    .phase-val:hover { text-decoration: underline; }
    .phase-divider {
      border: none;
      border-top: 1px solid ${U(o.divider)};
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
      color: ${U(o.textSecondary)};
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
      color: ${U(o.textPrimary)};
    }
    .energy-side-val:hover { text-decoration: underline; }
    .energy-import { color: #ef5350; }
    .energy-export { color: #66bb6a; }
    .energy-divider-v {
      width: 1px;
      height: 28px;
      background: ${U(o.divider)};
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
      color: ${U(o.textSecondary)};
      text-transform: uppercase;
    }
    .price-val {
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: ${U(o.textPrimary)};
    }
    .price-val:hover { text-decoration: underline; }
    .price-spot { color: #ef5350; }
    .price-export { color: #66bb6a; }

    @media (min-width: 1025px) {
      .detail-section {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid ${U(o.divider)};
      }
      .boiler-section,
      .grid-charging-plan {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed ${U(o.divider)};
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
  `;He([g({type:Object})],Ee.prototype,"data",2);He([g({type:Boolean})],Ee.prototype,"editMode",2);He([P()],Ee.prototype,"pendingServices",2);He([P()],Ee.prototype,"changingServices",2);He([P()],Ee.prototype,"shieldStatus",2);He([P()],Ee.prototype,"shieldQueueCount",2);He([P()],Ee.prototype,"gridDeliveryState",2);He([P()],Ee.prototype,"expandedNodes",2);He([P()],Ee.prototype,"customPositions",2);Ee=He([E("oig-flow-node")],Ee);var Kc=Object.defineProperty,Uc=Object.getOwnPropertyDescriptor,Et=(e,t,i,r)=>{for(var n=r>1?void 0:r?Uc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Kc(t,i,n),n};function Gc(e,t){return{fromColor:ra[e]||"#9e9e9e",toColor:ra[t]||"#9e9e9e"}}const Zc=G;let Qe=class extends D{constructor(){super(...arguments),this.data=En,this.particlesEnabled=!0,this.active=!0,this.editMode=!1,this.lines=[],this.animationId=null,this.lastSpawnTime={},this.particleCount=0,this.MAX_PARTICLES=50,this.onVisibilityChange=()=>{this.updateAnimationState()},this.onLayoutChanged=()=>{this.drawConnectionsDeferred()}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this.onVisibilityChange),this.addEventListener("layout-changed",this.onLayoutChanged)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this.onVisibilityChange),this.removeEventListener("layout-changed",this.onLayoutChanged),this.stopAnimation()}updated(e){e.has("data")&&(this.updateLines(),this.animationId!==null&&this.spawnParticles()),(e.has("active")||e.has("particlesEnabled"))&&this.updateAnimationState(),this.drawConnectionsDeferred()}firstUpdated(){this.updateLines(),this.updateAnimationState(),new ResizeObserver(()=>this.drawConnectionsDeferred()).observe(this)}drawConnectionsDeferred(){requestAnimationFrame(()=>this.drawConnectionsSVG())}getParticlesLayer(){var e;return(e=this.renderRoot)==null?void 0:e.querySelector(".particles-layer")}getGridMetrics(){var a,s;const e=(a=this.renderRoot)==null?void 0:a.querySelector("oig-flow-node");if(!e)return null;const i=(e.renderRoot||e.shadowRoot||e).querySelector(".flow-grid");if(!i)return null;const r=(s=this.renderRoot)==null?void 0:s.querySelector(".canvas-container");if(!r)return null;const n=i.getBoundingClientRect();return n.width===0||n.height===0?null:{grid:i,gridRect:n,canvasRect:r.getBoundingClientRect()}}positionOverlayLayer(e,t,i){const r=t.left-i.left,n=t.top-i.top;e.style.left=`${r}px`,e.style.top=`${n}px`,e.style.width=`${t.width}px`,e.style.height=`${t.height}px`}updateLines(){const e=this.data,t=[],i=e.solarPower>50;t.push({id:"solar-inverter",from:"solar",to:"inverter",color:It.solar,power:i?e.solarPower:0,params:i?cr(e.solarPower,lr.solar,"solar"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:i});const r=Math.abs(e.batteryPower)>50,n=e.batteryPower>0;t.push({id:"battery-inverter",from:r&&n?"inverter":"battery",to:r&&n?"battery":"inverter",color:It.battery,power:r?Math.abs(e.batteryPower):0,params:r?cr(e.batteryPower,lr.battery,"battery"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:r});const a=Math.abs(e.gridPower)>50,s=e.gridPower>0;t.push({id:"grid-inverter",from:a?s?"grid":"inverter":"grid",to:a?s?"inverter":"grid":"inverter",color:a?s?It.grid_import:It.grid_export:It.grid_import,power:a?Math.abs(e.gridPower):0,params:a?cr(e.gridPower,lr.grid,"grid"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:a});const l=e.housePower>50;t.push({id:"inverter-house",from:"inverter",to:"house",color:It.house,power:l?e.housePower:0,params:l?cr(e.housePower,lr.house,"house"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:l}),this.lines=t}calcEdgePoint(e,t,i,r){const n=t.x-e.x,a=t.y-e.y;if(n===0&&a===0)return{...e};const s=Math.abs(n),l=Math.abs(a),d=s*r>l*i?i/s:r/l;return{x:e.x+n*d,y:e.y+a*d}}getNodeInfo(e,t,i){const r=e.querySelector(`.node-${i}`);if(!r)return null;const n=r.getBoundingClientRect();return{x:n.left+n.width/2-t.left,y:n.top+n.height/2-t.top,hw:n.width/2,hh:n.height/2}}drawConnectionsSVG(){const e=this.svgEl;if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:r,canvasRect:n}=t;this.positionOverlayLayer(e,r,n),e.setAttribute("viewBox",`0 0 ${r.width} ${r.height}`);const a=this.getParticlesLayer();a&&this.positionOverlayLayer(a,r,n),e.innerHTML="";const s="http://www.w3.org/2000/svg",l=document.createElementNS(s,"defs"),d=document.createElementNS(s,"filter");d.setAttribute("id","neon-glow"),d.setAttribute("x","-50%"),d.setAttribute("y","-50%"),d.setAttribute("width","200%"),d.setAttribute("height","200%");const u=document.createElementNS(s,"feGaussianBlur");u.setAttribute("in","SourceGraphic"),u.setAttribute("stdDeviation","3"),u.setAttribute("result","blur"),d.appendChild(u);const p=document.createElementNS(s,"feMerge"),h=document.createElementNS(s,"feMergeNode");h.setAttribute("in","blur"),p.appendChild(h);const b=document.createElementNS(s,"feMergeNode");b.setAttribute("in","SourceGraphic"),p.appendChild(b),d.appendChild(p),l.appendChild(d),e.appendChild(l);for(const f of this.lines){const m=this.getNodeInfo(i,r,f.from),v=this.getNodeInfo(i,r,f.to);if(!m||!v)continue;const $={x:m.x,y:m.y},w={x:v.x,y:v.y},x=this.calcEdgePoint($,w,m.hw,m.hh),S=this.calcEdgePoint(w,$,v.hw,v.hh),B=S.x-x.x,q=S.y-x.y,k=Math.sqrt(B*B+q*q),V=Math.min(k*.2,40),y=-q/k,F=B/k,Y=(x.x+S.x)/2,W=(x.y+S.y)/2,K=Y+y*V,ne=W+F*V,ze=`grad-${f.id}`,{fromColor:hi,toColor:gi}=Gc(f.from,f.to),Se=document.createElementNS(s,"linearGradient");Se.setAttribute("id",ze),Se.setAttribute("x1","0%"),Se.setAttribute("y1","0%"),Se.setAttribute("x2","100%"),Se.setAttribute("y2","0%");const L=document.createElementNS(s,"stop");L.setAttribute("offset","0%"),L.setAttribute("stop-color",hi);const re=document.createElementNS(s,"stop");re.setAttribute("offset","100%"),re.setAttribute("stop-color",gi),Se.appendChild(L),Se.appendChild(re),l.appendChild(Se);const be=document.createElementNS(s,"path");if(be.setAttribute("d",`M ${x.x} ${x.y} Q ${K} ${ne} ${S.x} ${S.y}`),be.setAttribute("stroke",`url(#${ze})`),be.setAttribute("stroke-width","3"),be.setAttribute("stroke-linecap","round"),be.setAttribute("fill","none"),be.setAttribute("opacity",f.active?"0.8":"0.18"),f.active&&be.setAttribute("filter","url(#neon-glow)"),be.classList.add("flow-line"),f.active||be.classList.add("flow-line--inactive"),e.appendChild(be),f.params.active){const Fe=document.createElementNS(s,"polygon");Fe.setAttribute("points",`0,-6 ${6*1.2},0 0,6`),Fe.setAttribute("fill",f.color),Fe.setAttribute("opacity","0.9");const Ve=document.createElementNS(s,"animateMotion");Ve.setAttribute("dur",`${Math.max(1,f.params.speed/1e3)}s`),Ve.setAttribute("repeatCount","indefinite"),Ve.setAttribute("path",`M ${x.x} ${x.y} Q ${K} ${ne} ${S.x} ${S.y}`),Ve.setAttribute("rotate","auto"),Fe.appendChild(Ve),e.appendChild(Fe)}}}updateAnimationState(){this.particlesEnabled&&this.active&&!document.hidden&&!Me.reduceMotion?(this.spawnParticles(),this.startAnimation()):this.stopAnimation()}startAnimation(){if(this.animationId!==null)return;const e=()=>{this.spawnParticles(),this.animationId=requestAnimationFrame(e)};this.animationId=requestAnimationFrame(e)}stopAnimation(){this.animationId!==null&&(cancelAnimationFrame(this.animationId),this.animationId=null)}spawnParticles(){if(this.particleCount>=this.MAX_PARTICLES)return;const e=this.getParticlesLayer();if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:r,canvasRect:n}=t;this.positionOverlayLayer(e,r,n);const a=performance.now();for(const s of this.lines){if(!s.params.active)continue;const l=s.params.speed,d=this.lastSpawnTime[s.id]||0;if(a-d<l)continue;const u=this.getNodeInfo(i,r,s.from),p=this.getNodeInfo(i,r,s.to);if(!u||!p)continue;const h={x:u.x,y:u.y},b={x:p.x,y:p.y},f=this.calcEdgePoint(h,b,u.hw,u.hh),m=this.calcEdgePoint(b,h,p.hw,p.hh);this.lastSpawnTime[s.id]=a;const v=s.params.count;for(let $=0;$<v&&!(this.particleCount>=this.MAX_PARTICLES);$++)this.createParticle(e,f,m,s.color,s.params,$*(s.params.speed/v/2))}}createParticle(e,t,i,r,n,a){const s=document.createElement("div");s.className="particle";const l=n.size;s.style.width=`${l}px`,s.style.height=`${l}px`,s.style.background=r,s.style.left=`${t.x}px`,s.style.top=`${t.y}px`,s.style.boxShadow=`0 0 ${l}px ${r}`,s.style.opacity="0",e.appendChild(s),this.particleCount++;const d=n.speed;setTimeout(()=>{let u=!1;const p=()=>{u||(u=!0,s.isConnected&&s.remove(),this.particleCount=Math.max(0,this.particleCount-1))};if(typeof s.animate=="function"){const h=s.animate([{left:`${t.x}px`,top:`${t.y}px`,opacity:0,offset:0},{opacity:n.opacity,offset:.1},{opacity:n.opacity,offset:.9},{left:`${i.x}px`,top:`${i.y}px`,opacity:0,offset:1}],{duration:d,easing:"linear"});h.onfinish=p,h.oncancel=p}else s.style.transition=`left ${d}ms linear, top ${d}ms linear, opacity ${d}ms linear`,s.style.opacity=`${n.opacity}`,requestAnimationFrame(()=>{s.style.left=`${i.x}px`,s.style.top=`${i.y}px`,s.style.opacity="0"}),s.addEventListener("transitionend",p,{once:!0}),window.setTimeout(p,d+50)},a)}render(){return c`
      <div class="canvas-container">
        <div class="flow-grid-wrapper">
          <oig-flow-node .data=${this.data} .editMode=${this.editMode}></oig-flow-node>
        </div>

        <svg class="connections-layer"></svg>

        <div class="particles-layer"></div>
      </div>
    `}resetLayout(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-flow-node");e!=null&&e.resetLayout&&e.resetLayout()}};Qe.styles=M`
    :host {
      display: block;
      position: relative;
      width: 100%;
      background: ${Zc(o.bgSecondary)};
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
  `;Et([g({type:Object})],Qe.prototype,"data",2);Et([g({type:Boolean})],Qe.prototype,"particlesEnabled",2);Et([g({type:Boolean})],Qe.prototype,"active",2);Et([g({type:Boolean})],Qe.prototype,"editMode",2);Et([P()],Qe.prototype,"lines",2);Et([Br(".connections-layer")],Qe.prototype,"svgEl",2);Qe=Et([E("oig-flow-canvas")],Qe);var Qc=Object.defineProperty,Xc=Object.getOwnPropertyDescriptor,Fn=(e,t,i,r)=>{for(var n=r>1?void 0:r?Xc(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Qc(t,i,n),n};const Ae=G;let Fi=class extends D{constructor(){super(...arguments),this.data=null,this.open=!1,this.onKeyDown=e=>{e.key==="Escape"&&this.hide()}}show(){this.open=!0}hide(){this.open=!1}onOverlayClick(e){e.target===e.currentTarget&&this.hide()}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onKeyDown),this.addEventListener("oig-grid-charging-open",()=>this.show())}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onKeyDown)}formatTime(e){const t=e.time_from??"--:--",i=e.time_to??"--:--";return`${t} – ${i}`}isBlockActive(e){if(!e.time_from||!e.time_to)return!1;const t=new Date,i=t.toISOString().slice(0,10);if(e.day==="tomorrow")return!1;const r=`${i}T${e.time_from}`,n=`${i}T${e.time_to}`,a=new Date(r),s=new Date(n);return t>=a&&t<s}renderEmpty(){return c`
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
          `:O}
          ${e.totalCostCzk>0?c`
            <span class="summary-chip cost">💰 ~${e.totalCostCzk.toFixed(0)} Kč</span>
          `:O}
          ${e.windowLabel?c`
            <span class="summary-chip time">🪟 ${e.windowLabel}</span>
          `:O}
          ${e.durationMinutes>0?c`
            <span class="summary-chip time">⏱️ ${Math.round(e.durationMinutes)} min</span>
          `:O}
        </div>

        <!-- Active block banner -->
        ${t?c`
          <div class="active-block-banner">
            <div class="pulse-dot"></div>
            <span>Probíhá: ${this.formatTime(t)}
              ${t.grid_charge_kwh!=null?` · ${t.grid_charge_kwh.toFixed(1)} kWh`:O}
            </span>
          </div>
        `:O}

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
                    `:O}
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
              `:O}
            </div>
            <button class="close-btn" @click=${()=>this.hide()} aria-label="Zavřít">✕</button>
          </div>
          <div class="dialog-body">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `:O}};Fi.styles=M`
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
      background: ${Ae(o.cardBg)};
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
      border-bottom: 1px solid ${Ae(o.divider)};
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
      color: ${Ae(o.textPrimary)};
    }

    .dialog-header-subtitle {
      font-size: 11px;
      color: ${Ae(o.textSecondary)};
      margin-top: 2px;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: ${Ae(o.textSecondary)};
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
      color: ${Ae(o.textPrimary)};
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
      color: ${Ae(o.textSecondary)};
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
      color: ${Ae(o.textSecondary)};
      padding: 0 6px 8px;
      border-bottom: 1px solid ${Ae(o.divider)};
    }

    .blocks-table th:last-child,
    .blocks-table td:last-child {
      text-align: right;
    }

    .blocks-table td {
      padding: 8px 6px;
      font-size: 12px;
      color: ${Ae(o.textPrimary)};
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
      color: ${Ae(o.textSecondary)};
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
  `;Fn([g({type:Object})],Fi.prototype,"data",2);Fn([P()],Fi.prototype,"open",2);Fi=Fn([E("oig-grid-charging-dialog")],Fi);var Jc=Object.defineProperty,ed=Object.getOwnPropertyDescriptor,fe=(e,t,i,r)=>{for(var n=r>1?void 0:r?ed(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Jc(t,i,n),n};const se=G;Fr.register(Ua,Ga,Za,Qa,Xa,Ja,es);let rt=class extends D{constructor(){super(...arguments),this.values=[],this.color="rgba(76, 175, 80, 1)",this.startTime="",this.endTime="",this.chart=null,this.lastDataKey="",this.initializing=!1}render(){return c`<canvas></canvas>`}firstUpdated(){this.values.length>0&&(this.initializing=!0,requestAnimationFrame(()=>{this.createSparkline(),this.initializing=!1}))}updated(e){this.initializing||(e.has("values")||e.has("color"))&&this.updateOrCreateSparkline()}disconnectedCallback(){super.disconnectedCallback(),this.destroyChart()}updateOrCreateSparkline(){var t,i,r,n;if(!this.canvas||this.values.length===0)return;const e=JSON.stringify({v:this.values,c:this.color});if(!(e===this.lastDataKey&&this.chart)){if(this.lastDataKey=e,(r=(i=(t=this.chart)==null?void 0:t.data)==null?void 0:i.datasets)!=null&&r[0]){const a=this.chart.data.datasets[0];if(!((((n=this.chart.data.labels)==null?void 0:n.length)||0)!==this.values.length)){a.data=this.values,a.borderColor=this.color,a.backgroundColor=this.color.replace("1)","0.2)"),this.chart.update("none");return}}this.destroyChart(),this.createSparkline()}}createSparkline(){if(!this.canvas||this.values.length===0)return;this.destroyChart();const e=this.color,t=this.values,i=new Date(this.startTime),r=t.map((n,a)=>new Date(i.getTime()+a*15*60*1e3).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}));this.chart=new Fr(this.canvas,{type:"line",data:{labels:r,datasets:[{data:t,borderColor:e,backgroundColor:e.replace("1)","0.2)"),borderWidth:2,fill:!0,tension:.3,pointRadius:0,pointHoverRadius:5}]},plugins:[],options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:0},plugins:{legend:{display:!1},tooltip:{enabled:!0,backgroundColor:"rgba(0, 0, 0, 0.8)",titleColor:"#fff",bodyColor:"#fff",padding:8,displayColors:!1,callbacks:{title:n=>{var a;return((a=n[0])==null?void 0:a.label)||""},label:n=>`${n.parsed.y.toFixed(2)} Kč/kWh`}},datalabels:{display:!1},zoom:{pan:{enabled:!0,mode:"x",modifierKey:"shift"},zoom:{wheel:{enabled:!0,speed:.1},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)"},mode:"x"}}},scales:{x:{display:!1},y:{display:!0,position:"right",grace:"10%",ticks:{color:"rgba(255, 255, 255, 0.6)",font:{size:8},callback:n=>Number(n).toFixed(1),maxTicksLimit:3},grid:{display:!1}}},layout:{padding:0},interaction:{mode:"nearest",intersect:!1}}})}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}};rt.styles=M`
    :host {
      display: block;
      width: 100%;
      height: 30px;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `;fe([g({type:Array})],rt.prototype,"values",2);fe([g({type:String})],rt.prototype,"color",2);fe([g({type:String})],rt.prototype,"startTime",2);fe([g({type:String})],rt.prototype,"endTime",2);fe([Br("canvas")],rt.prototype,"canvas",2);rt=fe([E("oig-mini-sparkline")],rt);let _e=class extends D{constructor(){super(...arguments),this.title="",this.time="",this.valueText="",this.value=0,this.unit="Kč/kWh",this.variant="default",this.clickable=!1,this.startTime="",this.endTime="",this.sparklineValues=[],this.sparklineColor="rgba(76, 175, 80, 1)",this.handleClick=()=>{this.clickable&&this.dispatchEvent(new CustomEvent("card-click",{detail:{startTime:this.startTime,endTime:this.endTime,value:this.value},bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),this.clickable&&this.addEventListener("click",this.handleClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleClick)}render(){const e=this.valueText||`${this.value.toFixed(2)} <span class="stat-unit">${this.unit}</span>`;return c`
      <div class="card-title">${this.title}</div>
      <div class="card-value ${this.variant}" .innerHTML=${e}></div>
      ${this.time?c`<div class="card-time">${this.time}</div>`:O}
      ${this.sparklineValues.length>0?c`
            <div class="sparkline-container">
              <oig-mini-sparkline
                .values=${this.sparklineValues}
                .color=${this.sparklineColor}
                .startTime=${this.startTime}
                .endTime=${this.endTime}
              ></oig-mini-sparkline>
            </div>
          `:O}
    `}};_e.styles=M`
    :host {
      display: block;
      background: ${se(o.cardBg)};
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: ${se(o.cardShadow)};
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
      color: ${se(o.textSecondary)};
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 700;
      color: ${se(o.textPrimary)};
      line-height: 1.2;
    }

    .card-value .stat-unit {
      font-size: 12px;
      font-weight: 400;
      color: ${se(o.textSecondary)};
    }

    .card-value.success { color: #4CAF50; }
    .card-value.warning { color: #FFA726; }
    .card-value.danger { color: #F44336; }
    .card-value.info { color: #29B6F6; }

    .card-time {
      font-size: 10px;
      color: ${se(o.textSecondary)};
      margin-top: 4px;
    }

    .sparkline-container {
      margin-top: 8px;
    }
  `;fe([g({type:String})],_e.prototype,"title",2);fe([g({type:String})],_e.prototype,"time",2);fe([g({type:String})],_e.prototype,"valueText",2);fe([g({type:Number})],_e.prototype,"value",2);fe([g({type:String})],_e.prototype,"unit",2);fe([g({type:String})],_e.prototype,"variant",2);fe([g({type:Boolean})],_e.prototype,"clickable",2);fe([g({type:String})],_e.prototype,"startTime",2);fe([g({type:String})],_e.prototype,"endTime",2);fe([g({type:Array})],_e.prototype,"sparklineValues",2);fe([g({type:String})],_e.prototype,"sparklineColor",2);_e=fe([E("oig-stats-card")],_e);function td(e){const t=new Date(e.start),i=new Date(e.end),r=t.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit"}),n=t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}),a=i.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"});return`${r} ${n} - ${a}`}let Bi=class extends D{constructor(){super(...arguments),this.data=null,this.topOnly=!1}onCardClick(e){this.dispatchEvent(new CustomEvent("zoom-to-block",{detail:e.detail,bubbles:!0,composed:!0}))}renderPriceTiles(){if(!this.data)return O;const e=this.data.solarForecastTotal,t=this.data.solarForecastTomorrow,i=this.data.solarForecastStale,r=e>0||t>0,n=this.data.whatIf,a=(n==null?void 0:n.totalSavings)??null,s=(n==null?void 0:n.totalCost)??null,l=a==null?"":a>=.005?"pos":a<=-.005?"neg":"";return c`
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
          ${s!=null?`Náklady ${s.toFixed(0)} Kč`:O}
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
        .time=${td(t)}
        variant=${i}
        clickable
        .startTime=${t.start}
        .endTime=${t.end}
        .sparklineValues=${t.values}
        .sparklineColor=${r}
        @card-click=${this.onCardClick}
      ></oig-stats-card>
    `:O}renderExtremeBlocks(){if(!this.data)return O;const{cheapestBuyBlock:e,expensiveBuyBlock:t,bestExportBlock:i,worstExportBlock:r}=this.data;return c`
      ${this.renderBlockCard("Nejlevnější nákup",e,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejdražší nákup",t,"danger","rgba(244, 67, 54, 1)")}
      ${this.renderBlockCard("Nejlepší výkup",i,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejhorší výkup",r,"warning","rgba(255, 167, 38, 1)")}
    `}renderPlannedConsumption(){var s;const e=(s=this.data)==null?void 0:s.plannedConsumption;if(!e)return O;const t=e.todayTotalKwh,i=e.tomorrowKwh,r=t+(i||0),n=r>0?t/r*100:50,a=r>0?(i||0)/r*100:50;return c`
      <div class="planned-section">
        <div class="section-label" style="margin-bottom: 8px;">Plánovaná spotřeba (dnes + zítra)</div>
        <div class="planned-header">
          <div>
            <div class="planned-main-value">
              ${r>0?c`${r.toFixed(1)} <span class="unit">kWh</span>`:"--"}
            </div>
            <div class="planned-profile">${e.profile}</div>
          </div>
          ${e.trendText?c`<div class="planned-trend">${e.trendText}</div>`:O}
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
            `:O}
      </div>
    `}render(){return!this.data||this.data.timeline.length===0?this.topOnly?O:c`<div style="color: ${o.textSecondary}; padding: 16px;">Načítání cenových dat...</div>`:this.topOnly?c`
        <div class="top-row">
          ${this.renderPriceTiles()}
          ${this.renderExtremeBlocks()}
        </div>
      `:c`${this.renderPlannedConsumption()}`}};Bi.styles=M`
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
      background: ${se(o.cardBg)};
      border-radius: 10px;
      padding: 10px 12px;
      box-shadow: ${se(o.cardShadow)};
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 76px;
    }

    .price-tile.spot {
      background: linear-gradient(135deg, ${se(o.accent)}22 0%, ${se(o.accent)}11 100%);
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
      color: ${se(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .price-tile-value {
      font-size: 16px;
      font-weight: 700;
      color: ${se(o.textPrimary)};
      line-height: 1.2;
    }

    .price-tile-unit {
      font-size: 10px;
      font-weight: 400;
      color: ${se(o.textSecondary)};
      opacity: 0.7;
    }

    .price-tile-sub {
      font-size: 9px;
      color: ${se(o.textSecondary)};
      opacity: 0.55;
      margin-top: 3px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: ${se(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    /* Planned consumption */
    .planned-section {
      background: ${se(o.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: ${se(o.cardShadow)};
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
      color: ${se(o.textPrimary)};
    }

    .planned-main-value .unit {
      font-size: 12px;
      font-weight: 400;
      color: ${se(o.textSecondary)};
    }

    .planned-trend {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
    }

    .planned-profile {
      font-size: 11px;
      color: ${se(o.textSecondary)};
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
      color: ${se(o.textSecondary)};
      text-transform: uppercase;
    }

    .planned-detail-value {
      font-size: 14px;
      font-weight: 600;
      color: ${se(o.textPrimary)};
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
      color: ${se(o.textSecondary)};
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
  `;fe([g({type:Object})],Bi.prototype,"data",2);fe([g({type:Boolean})],Bi.prototype,"topOnly",2);Bi=fe([E("oig-pricing-stats")],Bi);const _s=6048e5,id=864e5,tr=6e4,ir=36e5,rd=1e3,Ta=Symbol.for("constructDateFrom");function ue(e,t){return typeof e=="function"?e(t):e&&typeof e=="object"&&Ta in e?e[Ta](t):e instanceof Date?new e.constructor(t):new Date(t)}function R(e,t){return ue(t||e,e)}function Hr(e,t,i){const r=R(e,i==null?void 0:i.in);return isNaN(t)?ue((i==null?void 0:i.in)||e,NaN):(t&&r.setDate(r.getDate()+t),r)}function Bn(e,t,i){const r=R(e,i==null?void 0:i.in);if(isNaN(t))return ue(e,NaN);if(!t)return r;const n=r.getDate(),a=ue(e,r.getTime());a.setMonth(r.getMonth()+t+1,0);const s=a.getDate();return n>=s?a:(r.setFullYear(a.getFullYear(),a.getMonth(),n),r)}function Nn(e,t,i){return ue(e,+R(e)+t)}function nd(e,t,i){return Nn(e,t*ir)}let ad={};function Ot(){return ad}function je(e,t){var l,d,u,p;const i=Ot(),r=(t==null?void 0:t.weekStartsOn)??((d=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:d.weekStartsOn)??i.weekStartsOn??((p=(u=i.locale)==null?void 0:u.options)==null?void 0:p.weekStartsOn)??0,n=R(e,t==null?void 0:t.in),a=n.getDay(),s=(a<r?7:0)+a-r;return n.setDate(n.getDate()-s),n.setHours(0,0,0,0),n}function Xt(e,t){return je(e,{...t,weekStartsOn:1})}function ks(e,t){const i=R(e,t==null?void 0:t.in),r=i.getFullYear(),n=ue(i,0);n.setFullYear(r+1,0,4),n.setHours(0,0,0,0);const a=Xt(n),s=ue(i,0);s.setFullYear(r,0,4),s.setHours(0,0,0,0);const l=Xt(s);return i.getTime()>=a.getTime()?r+1:i.getTime()>=l.getTime()?r:r-1}function wr(e){const t=R(e),i=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()));return i.setUTCFullYear(t.getFullYear()),+e-+i}function zt(e,...t){const i=ue.bind(null,t.find(r=>typeof r=="object"));return t.map(i)}function Sn(e,t){const i=R(e,t==null?void 0:t.in);return i.setHours(0,0,0,0),i}function Ss(e,t,i){const[r,n]=zt(i==null?void 0:i.in,e,t),a=Sn(r),s=Sn(n),l=+a-wr(a),d=+s-wr(s);return Math.round((l-d)/id)}function sd(e,t){const i=ks(e,t),r=ue(e,0);return r.setFullYear(i,0,4),r.setHours(0,0,0,0),Xt(r)}function od(e,t,i){const r=R(e,i==null?void 0:i.in);return r.setTime(r.getTime()+t*tr),r}function ld(e,t,i){return Bn(e,t*3,i)}function cd(e,t,i){return Nn(e,t*1e3)}function dd(e,t,i){return Hr(e,t*7,i)}function ud(e,t,i){return Bn(e,t*12,i)}function Oi(e,t){const i=+R(e)-+R(t);return i<0?-1:i>0?1:i}function pd(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function Cs(e){return!(!pd(e)&&typeof e!="number"||isNaN(+R(e)))}function hd(e,t,i){const[r,n]=zt(i==null?void 0:i.in,e,t),a=r.getFullYear()-n.getFullYear(),s=r.getMonth()-n.getMonth();return a*12+s}function gd(e,t,i){const[r,n]=zt(i==null?void 0:i.in,e,t);return r.getFullYear()-n.getFullYear()}function Ts(e,t,i){const[r,n]=zt(i==null?void 0:i.in,e,t),a=Pa(r,n),s=Math.abs(Ss(r,n));r.setDate(r.getDate()-a*s);const l=+(Pa(r,n)===-a),d=a*(s-l);return d===0?0:d}function Pa(e,t){const i=e.getFullYear()-t.getFullYear()||e.getMonth()-t.getMonth()||e.getDate()-t.getDate()||e.getHours()-t.getHours()||e.getMinutes()-t.getMinutes()||e.getSeconds()-t.getSeconds()||e.getMilliseconds()-t.getMilliseconds();return i<0?-1:i>0?1:i}function rr(e){return t=>{const r=(e?Math[e]:Math.trunc)(t);return r===0?0:r}}function fd(e,t,i){const[r,n]=zt(i==null?void 0:i.in,e,t),a=(+r-+n)/ir;return rr(i==null?void 0:i.roundingMethod)(a)}function Rn(e,t){return+R(e)-+R(t)}function md(e,t,i){const r=Rn(e,t)/tr;return rr(i==null?void 0:i.roundingMethod)(r)}function Ps(e,t){const i=R(e,t==null?void 0:t.in);return i.setHours(23,59,59,999),i}function Ms(e,t){const i=R(e,t==null?void 0:t.in),r=i.getMonth();return i.setFullYear(i.getFullYear(),r+1,0),i.setHours(23,59,59,999),i}function bd(e,t){const i=R(e,t==null?void 0:t.in);return+Ps(i,t)==+Ms(i,t)}function Ds(e,t,i){const[r,n,a]=zt(i==null?void 0:i.in,e,e,t),s=Oi(n,a),l=Math.abs(hd(n,a));if(l<1)return 0;n.getMonth()===1&&n.getDate()>27&&n.setDate(30),n.setMonth(n.getMonth()-s*l);let d=Oi(n,a)===-s;bd(r)&&l===1&&Oi(r,a)===1&&(d=!1);const u=s*(l-+d);return u===0?0:u}function vd(e,t,i){const r=Ds(e,t,i)/3;return rr(i==null?void 0:i.roundingMethod)(r)}function yd(e,t,i){const r=Rn(e,t)/1e3;return rr(i==null?void 0:i.roundingMethod)(r)}function xd(e,t,i){const r=Ts(e,t,i)/7;return rr(i==null?void 0:i.roundingMethod)(r)}function wd(e,t,i){const[r,n]=zt(i==null?void 0:i.in,e,t),a=Oi(r,n),s=Math.abs(gd(r,n));r.setFullYear(1584),n.setFullYear(1584);const l=Oi(r,n)===-a,d=a*(s-+l);return d===0?0:d}function $d(e,t){const i=R(e,t==null?void 0:t.in),r=i.getMonth(),n=r-r%3;return i.setMonth(n,1),i.setHours(0,0,0,0),i}function _d(e,t){const i=R(e,t==null?void 0:t.in);return i.setDate(1),i.setHours(0,0,0,0),i}function kd(e,t){const i=R(e,t==null?void 0:t.in),r=i.getFullYear();return i.setFullYear(r+1,0,0),i.setHours(23,59,59,999),i}function Es(e,t){const i=R(e,t==null?void 0:t.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}function Sd(e,t){const i=R(e,t==null?void 0:t.in);return i.setMinutes(59,59,999),i}function Cd(e,t){var l,d;const i=Ot(),r=i.weekStartsOn??((d=(l=i.locale)==null?void 0:l.options)==null?void 0:d.weekStartsOn)??0,n=R(e,t==null?void 0:t.in),a=n.getDay(),s=(a<r?-7:0)+6-(a-r);return n.setDate(n.getDate()+s),n.setHours(23,59,59,999),n}function Td(e,t){const i=R(e,t==null?void 0:t.in);return i.setSeconds(59,999),i}function Pd(e,t){const i=R(e,t==null?void 0:t.in),r=i.getMonth(),n=r-r%3+3;return i.setMonth(n,0),i.setHours(23,59,59,999),i}function Md(e,t){const i=R(e,t==null?void 0:t.in);return i.setMilliseconds(999),i}const Dd={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},Ed=(e,t,i)=>{let r;const n=Dd[e];return typeof n=="string"?r=n:t===1?r=n.one:r=n.other.replace("{{count}}",t.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+r:r+" ago":r};function on(e){return(t={})=>{const i=t.width?String(t.width):e.defaultWidth;return e.formats[i]||e.formats[e.defaultWidth]}}const Od={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},zd={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},Ad={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},Ld={date:on({formats:Od,defaultWidth:"full"}),time:on({formats:zd,defaultWidth:"full"}),dateTime:on({formats:Ad,defaultWidth:"full"})},Id={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},Fd=(e,t,i,r)=>Id[e];function ki(e){return(t,i)=>{const r=i!=null&&i.context?String(i.context):"standalone";let n;if(r==="formatting"&&e.formattingValues){const s=e.defaultFormattingWidth||e.defaultWidth,l=i!=null&&i.width?String(i.width):s;n=e.formattingValues[l]||e.formattingValues[s]}else{const s=e.defaultWidth,l=i!=null&&i.width?String(i.width):e.defaultWidth;n=e.values[l]||e.values[s]}const a=e.argumentCallback?e.argumentCallback(t):t;return n[a]}}const Bd={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},Nd={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},Rd={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},jd={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},Hd={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},Vd={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},Wd=(e,t)=>{const i=Number(e),r=i%100;if(r>20||r<10)switch(r%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},qd={ordinalNumber:Wd,era:ki({values:Bd,defaultWidth:"wide"}),quarter:ki({values:Nd,defaultWidth:"wide",argumentCallback:e=>e-1}),month:ki({values:Rd,defaultWidth:"wide"}),day:ki({values:jd,defaultWidth:"wide"}),dayPeriod:ki({values:Hd,defaultWidth:"wide",formattingValues:Vd,defaultFormattingWidth:"wide"})};function Si(e){return(t,i={})=>{const r=i.width,n=r&&e.matchPatterns[r]||e.matchPatterns[e.defaultMatchWidth],a=t.match(n);if(!a)return null;const s=a[0],l=r&&e.parsePatterns[r]||e.parsePatterns[e.defaultParseWidth],d=Array.isArray(l)?Kd(l,h=>h.test(s)):Yd(l,h=>h.test(s));let u;u=e.valueCallback?e.valueCallback(d):d,u=i.valueCallback?i.valueCallback(u):u;const p=t.slice(s.length);return{value:u,rest:p}}}function Yd(e,t){for(const i in e)if(Object.prototype.hasOwnProperty.call(e,i)&&t(e[i]))return i}function Kd(e,t){for(let i=0;i<e.length;i++)if(t(e[i]))return i}function Ud(e){return(t,i={})=>{const r=t.match(e.matchPattern);if(!r)return null;const n=r[0],a=t.match(e.parsePattern);if(!a)return null;let s=e.valueCallback?e.valueCallback(a[0]):a[0];s=i.valueCallback?i.valueCallback(s):s;const l=t.slice(n.length);return{value:s,rest:l}}}const Gd=/^(\d+)(th|st|nd|rd)?/i,Zd=/\d+/i,Qd={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},Xd={any:[/^b/i,/^(a|c)/i]},Jd={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},eu={any:[/1/i,/2/i,/3/i,/4/i]},tu={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},iu={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},ru={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},nu={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},au={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},su={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},ou={ordinalNumber:Ud({matchPattern:Gd,parsePattern:Zd,valueCallback:e=>parseInt(e,10)}),era:Si({matchPatterns:Qd,defaultMatchWidth:"wide",parsePatterns:Xd,defaultParseWidth:"any"}),quarter:Si({matchPatterns:Jd,defaultMatchWidth:"wide",parsePatterns:eu,defaultParseWidth:"any",valueCallback:e=>e+1}),month:Si({matchPatterns:tu,defaultMatchWidth:"wide",parsePatterns:iu,defaultParseWidth:"any"}),day:Si({matchPatterns:ru,defaultMatchWidth:"wide",parsePatterns:nu,defaultParseWidth:"any"}),dayPeriod:Si({matchPatterns:au,defaultMatchWidth:"any",parsePatterns:su,defaultParseWidth:"any"})},Os={code:"en-US",formatDistance:Ed,formatLong:Ld,formatRelative:Fd,localize:qd,match:ou,options:{weekStartsOn:0,firstWeekContainsDate:1}};function lu(e,t){const i=R(e,t==null?void 0:t.in);return Ss(i,Es(i))+1}function zs(e,t){const i=R(e,t==null?void 0:t.in),r=+Xt(i)-+sd(i);return Math.round(r/_s)+1}function jn(e,t){var p,h,b,f;const i=R(e,t==null?void 0:t.in),r=i.getFullYear(),n=Ot(),a=(t==null?void 0:t.firstWeekContainsDate)??((h=(p=t==null?void 0:t.locale)==null?void 0:p.options)==null?void 0:h.firstWeekContainsDate)??n.firstWeekContainsDate??((f=(b=n.locale)==null?void 0:b.options)==null?void 0:f.firstWeekContainsDate)??1,s=ue((t==null?void 0:t.in)||e,0);s.setFullYear(r+1,0,a),s.setHours(0,0,0,0);const l=je(s,t),d=ue((t==null?void 0:t.in)||e,0);d.setFullYear(r,0,a),d.setHours(0,0,0,0);const u=je(d,t);return+i>=+l?r+1:+i>=+u?r:r-1}function cu(e,t){var l,d,u,p;const i=Ot(),r=(t==null?void 0:t.firstWeekContainsDate)??((d=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:d.firstWeekContainsDate)??i.firstWeekContainsDate??((p=(u=i.locale)==null?void 0:u.options)==null?void 0:p.firstWeekContainsDate)??1,n=jn(e,t),a=ue((t==null?void 0:t.in)||e,0);return a.setFullYear(n,0,r),a.setHours(0,0,0,0),je(a,t)}function As(e,t){const i=R(e,t==null?void 0:t.in),r=+je(i,t)-+cu(i,t);return Math.round(r/_s)+1}function J(e,t){const i=e<0?"-":"",r=Math.abs(e).toString().padStart(t,"0");return i+r}const Je={y(e,t){const i=e.getFullYear(),r=i>0?i:1-i;return J(t==="yy"?r%100:r,t.length)},M(e,t){const i=e.getMonth();return t==="M"?String(i+1):J(i+1,2)},d(e,t){return J(e.getDate(),t.length)},a(e,t){const i=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(e,t){return J(e.getHours()%12||12,t.length)},H(e,t){return J(e.getHours(),t.length)},m(e,t){return J(e.getMinutes(),t.length)},s(e,t){return J(e.getSeconds(),t.length)},S(e,t){const i=t.length,r=e.getMilliseconds(),n=Math.trunc(r*Math.pow(10,i-3));return J(n,t.length)}},Ft={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},Ma={G:function(e,t,i){const r=e.getFullYear()>0?1:0;switch(t){case"G":case"GG":case"GGG":return i.era(r,{width:"abbreviated"});case"GGGGG":return i.era(r,{width:"narrow"});case"GGGG":default:return i.era(r,{width:"wide"})}},y:function(e,t,i){if(t==="yo"){const r=e.getFullYear(),n=r>0?r:1-r;return i.ordinalNumber(n,{unit:"year"})}return Je.y(e,t)},Y:function(e,t,i,r){const n=jn(e,r),a=n>0?n:1-n;if(t==="YY"){const s=a%100;return J(s,2)}return t==="Yo"?i.ordinalNumber(a,{unit:"year"}):J(a,t.length)},R:function(e,t){const i=ks(e);return J(i,t.length)},u:function(e,t){const i=e.getFullYear();return J(i,t.length)},Q:function(e,t,i){const r=Math.ceil((e.getMonth()+1)/3);switch(t){case"Q":return String(r);case"QQ":return J(r,2);case"Qo":return i.ordinalNumber(r,{unit:"quarter"});case"QQQ":return i.quarter(r,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(r,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(r,{width:"wide",context:"formatting"})}},q:function(e,t,i){const r=Math.ceil((e.getMonth()+1)/3);switch(t){case"q":return String(r);case"qq":return J(r,2);case"qo":return i.ordinalNumber(r,{unit:"quarter"});case"qqq":return i.quarter(r,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(r,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(r,{width:"wide",context:"standalone"})}},M:function(e,t,i){const r=e.getMonth();switch(t){case"M":case"MM":return Je.M(e,t);case"Mo":return i.ordinalNumber(r+1,{unit:"month"});case"MMM":return i.month(r,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(r,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(r,{width:"wide",context:"formatting"})}},L:function(e,t,i){const r=e.getMonth();switch(t){case"L":return String(r+1);case"LL":return J(r+1,2);case"Lo":return i.ordinalNumber(r+1,{unit:"month"});case"LLL":return i.month(r,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(r,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(r,{width:"wide",context:"standalone"})}},w:function(e,t,i,r){const n=As(e,r);return t==="wo"?i.ordinalNumber(n,{unit:"week"}):J(n,t.length)},I:function(e,t,i){const r=zs(e);return t==="Io"?i.ordinalNumber(r,{unit:"week"}):J(r,t.length)},d:function(e,t,i){return t==="do"?i.ordinalNumber(e.getDate(),{unit:"date"}):Je.d(e,t)},D:function(e,t,i){const r=lu(e);return t==="Do"?i.ordinalNumber(r,{unit:"dayOfYear"}):J(r,t.length)},E:function(e,t,i){const r=e.getDay();switch(t){case"E":case"EE":case"EEE":return i.day(r,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(r,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(r,{width:"short",context:"formatting"});case"EEEE":default:return i.day(r,{width:"wide",context:"formatting"})}},e:function(e,t,i,r){const n=e.getDay(),a=(n-r.weekStartsOn+8)%7||7;switch(t){case"e":return String(a);case"ee":return J(a,2);case"eo":return i.ordinalNumber(a,{unit:"day"});case"eee":return i.day(n,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(n,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(n,{width:"short",context:"formatting"});case"eeee":default:return i.day(n,{width:"wide",context:"formatting"})}},c:function(e,t,i,r){const n=e.getDay(),a=(n-r.weekStartsOn+8)%7||7;switch(t){case"c":return String(a);case"cc":return J(a,t.length);case"co":return i.ordinalNumber(a,{unit:"day"});case"ccc":return i.day(n,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(n,{width:"narrow",context:"standalone"});case"cccccc":return i.day(n,{width:"short",context:"standalone"});case"cccc":default:return i.day(n,{width:"wide",context:"standalone"})}},i:function(e,t,i){const r=e.getDay(),n=r===0?7:r;switch(t){case"i":return String(n);case"ii":return J(n,t.length);case"io":return i.ordinalNumber(n,{unit:"day"});case"iii":return i.day(r,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(r,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(r,{width:"short",context:"formatting"});case"iiii":default:return i.day(r,{width:"wide",context:"formatting"})}},a:function(e,t,i){const n=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(n,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(n,{width:"wide",context:"formatting"})}},b:function(e,t,i){const r=e.getHours();let n;switch(r===12?n=Ft.noon:r===0?n=Ft.midnight:n=r/12>=1?"pm":"am",t){case"b":case"bb":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(n,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(n,{width:"wide",context:"formatting"})}},B:function(e,t,i){const r=e.getHours();let n;switch(r>=17?n=Ft.evening:r>=12?n=Ft.afternoon:r>=4?n=Ft.morning:n=Ft.night,t){case"B":case"BB":case"BBB":return i.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(n,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(n,{width:"wide",context:"formatting"})}},h:function(e,t,i){if(t==="ho"){let r=e.getHours()%12;return r===0&&(r=12),i.ordinalNumber(r,{unit:"hour"})}return Je.h(e,t)},H:function(e,t,i){return t==="Ho"?i.ordinalNumber(e.getHours(),{unit:"hour"}):Je.H(e,t)},K:function(e,t,i){const r=e.getHours()%12;return t==="Ko"?i.ordinalNumber(r,{unit:"hour"}):J(r,t.length)},k:function(e,t,i){let r=e.getHours();return r===0&&(r=24),t==="ko"?i.ordinalNumber(r,{unit:"hour"}):J(r,t.length)},m:function(e,t,i){return t==="mo"?i.ordinalNumber(e.getMinutes(),{unit:"minute"}):Je.m(e,t)},s:function(e,t,i){return t==="so"?i.ordinalNumber(e.getSeconds(),{unit:"second"}):Je.s(e,t)},S:function(e,t){return Je.S(e,t)},X:function(e,t,i){const r=e.getTimezoneOffset();if(r===0)return"Z";switch(t){case"X":return Ea(r);case"XXXX":case"XX":return xt(r);case"XXXXX":case"XXX":default:return xt(r,":")}},x:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"x":return Ea(r);case"xxxx":case"xx":return xt(r);case"xxxxx":case"xxx":default:return xt(r,":")}},O:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"O":case"OO":case"OOO":return"GMT"+Da(r,":");case"OOOO":default:return"GMT"+xt(r,":")}},z:function(e,t,i){const r=e.getTimezoneOffset();switch(t){case"z":case"zz":case"zzz":return"GMT"+Da(r,":");case"zzzz":default:return"GMT"+xt(r,":")}},t:function(e,t,i){const r=Math.trunc(+e/1e3);return J(r,t.length)},T:function(e,t,i){return J(+e,t.length)}};function Da(e,t=""){const i=e>0?"-":"+",r=Math.abs(e),n=Math.trunc(r/60),a=r%60;return a===0?i+String(n):i+String(n)+t+J(a,2)}function Ea(e,t){return e%60===0?(e>0?"-":"+")+J(Math.abs(e)/60,2):xt(e,t)}function xt(e,t=""){const i=e>0?"-":"+",r=Math.abs(e),n=J(Math.trunc(r/60),2),a=J(r%60,2);return i+n+t+a}const Oa=(e,t)=>{switch(e){case"P":return t.date({width:"short"});case"PP":return t.date({width:"medium"});case"PPP":return t.date({width:"long"});case"PPPP":default:return t.date({width:"full"})}},Ls=(e,t)=>{switch(e){case"p":return t.time({width:"short"});case"pp":return t.time({width:"medium"});case"ppp":return t.time({width:"long"});case"pppp":default:return t.time({width:"full"})}},du=(e,t)=>{const i=e.match(/(P+)(p+)?/)||[],r=i[1],n=i[2];if(!n)return Oa(e,t);let a;switch(r){case"P":a=t.dateTime({width:"short"});break;case"PP":a=t.dateTime({width:"medium"});break;case"PPP":a=t.dateTime({width:"long"});break;case"PPPP":default:a=t.dateTime({width:"full"});break}return a.replace("{{date}}",Oa(r,t)).replace("{{time}}",Ls(n,t))},Cn={p:Ls,P:du},uu=/^D+$/,pu=/^Y+$/,hu=["D","DD","YY","YYYY"];function Is(e){return uu.test(e)}function Fs(e){return pu.test(e)}function Tn(e,t,i){const r=gu(e,t,i);if(console.warn(r),hu.includes(e))throw new RangeError(r)}function gu(e,t,i){const r=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${t}\`) for formatting ${r} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const fu=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,mu=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,bu=/^'([^]*?)'?$/,vu=/''/g,yu=/[a-zA-Z]/;function xu(e,t,i){var p,h,b,f,m,v,$,w;const r=Ot(),n=(i==null?void 0:i.locale)??r.locale??Os,a=(i==null?void 0:i.firstWeekContainsDate)??((h=(p=i==null?void 0:i.locale)==null?void 0:p.options)==null?void 0:h.firstWeekContainsDate)??r.firstWeekContainsDate??((f=(b=r.locale)==null?void 0:b.options)==null?void 0:f.firstWeekContainsDate)??1,s=(i==null?void 0:i.weekStartsOn)??((v=(m=i==null?void 0:i.locale)==null?void 0:m.options)==null?void 0:v.weekStartsOn)??r.weekStartsOn??((w=($=r.locale)==null?void 0:$.options)==null?void 0:w.weekStartsOn)??0,l=R(e,i==null?void 0:i.in);if(!Cs(l))throw new RangeError("Invalid time value");let d=t.match(mu).map(x=>{const S=x[0];if(S==="p"||S==="P"){const B=Cn[S];return B(x,n.formatLong)}return x}).join("").match(fu).map(x=>{if(x==="''")return{isToken:!1,value:"'"};const S=x[0];if(S==="'")return{isToken:!1,value:wu(x)};if(Ma[S])return{isToken:!0,value:x};if(S.match(yu))throw new RangeError("Format string contains an unescaped latin alphabet character `"+S+"`");return{isToken:!1,value:x}});n.localize.preprocessor&&(d=n.localize.preprocessor(l,d));const u={firstWeekContainsDate:a,weekStartsOn:s,locale:n};return d.map(x=>{if(!x.isToken)return x.value;const S=x.value;(!(i!=null&&i.useAdditionalWeekYearTokens)&&Fs(S)||!(i!=null&&i.useAdditionalDayOfYearTokens)&&Is(S))&&Tn(S,t,String(e));const B=Ma[S[0]];return B(l,S,n.localize,u)}).join("")}function wu(e){const t=e.match(bu);return t?t[1].replace(vu,"'"):e}function $u(){return Object.assign({},Ot())}function _u(e,t){const i=R(e,t==null?void 0:t.in).getDay();return i===0?7:i}function ku(e,t){const i=Su(t)?new t(0):ue(t,0);return i.setFullYear(e.getFullYear(),e.getMonth(),e.getDate()),i.setHours(e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()),i}function Su(e){var t;return typeof e=="function"&&((t=e.prototype)==null?void 0:t.constructor)===e}const Cu=10;class Bs{constructor(){T(this,"subPriority",0)}validate(t,i){return!0}}class Tu extends Bs{constructor(t,i,r,n,a){super(),this.value=t,this.validateValue=i,this.setValue=r,this.priority=n,a&&(this.subPriority=a)}validate(t,i){return this.validateValue(t,this.value,i)}set(t,i,r){return this.setValue(t,i,this.value,r)}}class Pu extends Bs{constructor(i,r){super();T(this,"priority",Cu);T(this,"subPriority",-1);this.context=i||(n=>ue(r,n))}set(i,r){return r.timestampIsSet?i:ue(i,ku(i,this.context))}}class Q{run(t,i,r,n){const a=this.parse(t,i,r,n);return a?{setter:new Tu(a.value,this.validate,this.set,this.priority,this.subPriority),rest:a.rest}:null}validate(t,i,r){return!0}}class Mu extends Q{constructor(){super(...arguments);T(this,"priority",140);T(this,"incompatibleTokens",["R","u","t","T"])}parse(i,r,n){switch(r){case"G":case"GG":case"GGG":return n.era(i,{width:"abbreviated"})||n.era(i,{width:"narrow"});case"GGGGG":return n.era(i,{width:"narrow"});case"GGGG":default:return n.era(i,{width:"wide"})||n.era(i,{width:"abbreviated"})||n.era(i,{width:"narrow"})}}set(i,r,n){return r.era=n,i.setFullYear(n,0,1),i.setHours(0,0,0,0),i}}const he={month:/^(1[0-2]|0?\d)/,date:/^(3[0-1]|[0-2]?\d)/,dayOfYear:/^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,week:/^(5[0-3]|[0-4]?\d)/,hour23h:/^(2[0-3]|[0-1]?\d)/,hour24h:/^(2[0-4]|[0-1]?\d)/,hour11h:/^(1[0-1]|0?\d)/,hour12h:/^(1[0-2]|0?\d)/,minute:/^[0-5]?\d/,second:/^[0-5]?\d/,singleDigit:/^\d/,twoDigits:/^\d{1,2}/,threeDigits:/^\d{1,3}/,fourDigits:/^\d{1,4}/,anyDigitsSigned:/^-?\d+/,singleDigitSigned:/^-?\d/,twoDigitsSigned:/^-?\d{1,2}/,threeDigitsSigned:/^-?\d{1,3}/,fourDigitsSigned:/^-?\d{1,4}/},Ne={basicOptionalMinutes:/^([+-])(\d{2})(\d{2})?|Z/,basic:/^([+-])(\d{2})(\d{2})|Z/,basicOptionalSeconds:/^([+-])(\d{2})(\d{2})((\d{2}))?|Z/,extended:/^([+-])(\d{2}):(\d{2})|Z/,extendedOptionalSeconds:/^([+-])(\d{2}):(\d{2})(:(\d{2}))?|Z/};function ge(e,t){return e&&{value:t(e.value),rest:e.rest}}function le(e,t){const i=t.match(e);return i?{value:parseInt(i[0],10),rest:t.slice(i[0].length)}:null}function Re(e,t){const i=t.match(e);if(!i)return null;if(i[0]==="Z")return{value:0,rest:t.slice(1)};const r=i[1]==="+"?1:-1,n=i[2]?parseInt(i[2],10):0,a=i[3]?parseInt(i[3],10):0,s=i[5]?parseInt(i[5],10):0;return{value:r*(n*ir+a*tr+s*rd),rest:t.slice(i[0].length)}}function Ns(e){return le(he.anyDigitsSigned,e)}function pe(e,t){switch(e){case 1:return le(he.singleDigit,t);case 2:return le(he.twoDigits,t);case 3:return le(he.threeDigits,t);case 4:return le(he.fourDigits,t);default:return le(new RegExp("^\\d{1,"+e+"}"),t)}}function $r(e,t){switch(e){case 1:return le(he.singleDigitSigned,t);case 2:return le(he.twoDigitsSigned,t);case 3:return le(he.threeDigitsSigned,t);case 4:return le(he.fourDigitsSigned,t);default:return le(new RegExp("^-?\\d{1,"+e+"}"),t)}}function Hn(e){switch(e){case"morning":return 4;case"evening":return 17;case"pm":case"noon":case"afternoon":return 12;case"am":case"midnight":case"night":default:return 0}}function Rs(e,t){const i=t>0,r=i?t:1-t;let n;if(r<=50)n=e||100;else{const a=r+50,s=Math.trunc(a/100)*100,l=e>=a%100;n=e+s-(l?100:0)}return i?n:1-n}function js(e){return e%400===0||e%4===0&&e%100!==0}class Du extends Q{constructor(){super(...arguments);T(this,"priority",130);T(this,"incompatibleTokens",["Y","R","u","w","I","i","e","c","t","T"])}parse(i,r,n){const a=s=>({year:s,isTwoDigitYear:r==="yy"});switch(r){case"y":return ge(pe(4,i),a);case"yo":return ge(n.ordinalNumber(i,{unit:"year"}),a);default:return ge(pe(r.length,i),a)}}validate(i,r){return r.isTwoDigitYear||r.year>0}set(i,r,n){const a=i.getFullYear();if(n.isTwoDigitYear){const l=Rs(n.year,a);return i.setFullYear(l,0,1),i.setHours(0,0,0,0),i}const s=!("era"in r)||r.era===1?n.year:1-n.year;return i.setFullYear(s,0,1),i.setHours(0,0,0,0),i}}class Eu extends Q{constructor(){super(...arguments);T(this,"priority",130);T(this,"incompatibleTokens",["y","R","u","Q","q","M","L","I","d","D","i","t","T"])}parse(i,r,n){const a=s=>({year:s,isTwoDigitYear:r==="YY"});switch(r){case"Y":return ge(pe(4,i),a);case"Yo":return ge(n.ordinalNumber(i,{unit:"year"}),a);default:return ge(pe(r.length,i),a)}}validate(i,r){return r.isTwoDigitYear||r.year>0}set(i,r,n,a){const s=jn(i,a);if(n.isTwoDigitYear){const d=Rs(n.year,s);return i.setFullYear(d,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),je(i,a)}const l=!("era"in r)||r.era===1?n.year:1-n.year;return i.setFullYear(l,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),je(i,a)}}class Ou extends Q{constructor(){super(...arguments);T(this,"priority",130);T(this,"incompatibleTokens",["G","y","Y","u","Q","q","M","L","w","d","D","e","c","t","T"])}parse(i,r){return $r(r==="R"?4:r.length,i)}set(i,r,n){const a=ue(i,0);return a.setFullYear(n,0,4),a.setHours(0,0,0,0),Xt(a)}}class zu extends Q{constructor(){super(...arguments);T(this,"priority",130);T(this,"incompatibleTokens",["G","y","Y","R","w","I","i","e","c","t","T"])}parse(i,r){return $r(r==="u"?4:r.length,i)}set(i,r,n){return i.setFullYear(n,0,1),i.setHours(0,0,0,0),i}}class Au extends Q{constructor(){super(...arguments);T(this,"priority",120);T(this,"incompatibleTokens",["Y","R","q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"Q":case"QQ":return pe(r.length,i);case"Qo":return n.ordinalNumber(i,{unit:"quarter"});case"QQQ":return n.quarter(i,{width:"abbreviated",context:"formatting"})||n.quarter(i,{width:"narrow",context:"formatting"});case"QQQQQ":return n.quarter(i,{width:"narrow",context:"formatting"});case"QQQQ":default:return n.quarter(i,{width:"wide",context:"formatting"})||n.quarter(i,{width:"abbreviated",context:"formatting"})||n.quarter(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=1&&r<=4}set(i,r,n){return i.setMonth((n-1)*3,1),i.setHours(0,0,0,0),i}}class Lu extends Q{constructor(){super(...arguments);T(this,"priority",120);T(this,"incompatibleTokens",["Y","R","Q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"q":case"qq":return pe(r.length,i);case"qo":return n.ordinalNumber(i,{unit:"quarter"});case"qqq":return n.quarter(i,{width:"abbreviated",context:"standalone"})||n.quarter(i,{width:"narrow",context:"standalone"});case"qqqqq":return n.quarter(i,{width:"narrow",context:"standalone"});case"qqqq":default:return n.quarter(i,{width:"wide",context:"standalone"})||n.quarter(i,{width:"abbreviated",context:"standalone"})||n.quarter(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=1&&r<=4}set(i,r,n){return i.setMonth((n-1)*3,1),i.setHours(0,0,0,0),i}}class Iu extends Q{constructor(){super(...arguments);T(this,"incompatibleTokens",["Y","R","q","Q","L","w","I","D","i","e","c","t","T"]);T(this,"priority",110)}parse(i,r,n){const a=s=>s-1;switch(r){case"M":return ge(le(he.month,i),a);case"MM":return ge(pe(2,i),a);case"Mo":return ge(n.ordinalNumber(i,{unit:"month"}),a);case"MMM":return n.month(i,{width:"abbreviated",context:"formatting"})||n.month(i,{width:"narrow",context:"formatting"});case"MMMMM":return n.month(i,{width:"narrow",context:"formatting"});case"MMMM":default:return n.month(i,{width:"wide",context:"formatting"})||n.month(i,{width:"abbreviated",context:"formatting"})||n.month(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=11}set(i,r,n){return i.setMonth(n,1),i.setHours(0,0,0,0),i}}class Fu extends Q{constructor(){super(...arguments);T(this,"priority",110);T(this,"incompatibleTokens",["Y","R","q","Q","M","w","I","D","i","e","c","t","T"])}parse(i,r,n){const a=s=>s-1;switch(r){case"L":return ge(le(he.month,i),a);case"LL":return ge(pe(2,i),a);case"Lo":return ge(n.ordinalNumber(i,{unit:"month"}),a);case"LLL":return n.month(i,{width:"abbreviated",context:"standalone"})||n.month(i,{width:"narrow",context:"standalone"});case"LLLLL":return n.month(i,{width:"narrow",context:"standalone"});case"LLLL":default:return n.month(i,{width:"wide",context:"standalone"})||n.month(i,{width:"abbreviated",context:"standalone"})||n.month(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=0&&r<=11}set(i,r,n){return i.setMonth(n,1),i.setHours(0,0,0,0),i}}function Bu(e,t,i){const r=R(e,i==null?void 0:i.in),n=As(r,i)-t;return r.setDate(r.getDate()-n*7),R(r,i==null?void 0:i.in)}class Nu extends Q{constructor(){super(...arguments);T(this,"priority",100);T(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","i","t","T"])}parse(i,r,n){switch(r){case"w":return le(he.week,i);case"wo":return n.ordinalNumber(i,{unit:"week"});default:return pe(r.length,i)}}validate(i,r){return r>=1&&r<=53}set(i,r,n,a){return je(Bu(i,n,a),a)}}function Ru(e,t,i){const r=R(e,i==null?void 0:i.in),n=zs(r,i)-t;return r.setDate(r.getDate()-n*7),r}class ju extends Q{constructor(){super(...arguments);T(this,"priority",100);T(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","e","c","t","T"])}parse(i,r,n){switch(r){case"I":return le(he.week,i);case"Io":return n.ordinalNumber(i,{unit:"week"});default:return pe(r.length,i)}}validate(i,r){return r>=1&&r<=53}set(i,r,n){return Xt(Ru(i,n))}}const Hu=[31,28,31,30,31,30,31,31,30,31,30,31],Vu=[31,29,31,30,31,30,31,31,30,31,30,31];class Wu extends Q{constructor(){super(...arguments);T(this,"priority",90);T(this,"subPriority",1);T(this,"incompatibleTokens",["Y","R","q","Q","w","I","D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"d":return le(he.date,i);case"do":return n.ordinalNumber(i,{unit:"date"});default:return pe(r.length,i)}}validate(i,r){const n=i.getFullYear(),a=js(n),s=i.getMonth();return a?r>=1&&r<=Vu[s]:r>=1&&r<=Hu[s]}set(i,r,n){return i.setDate(n),i.setHours(0,0,0,0),i}}class qu extends Q{constructor(){super(...arguments);T(this,"priority",90);T(this,"subpriority",1);T(this,"incompatibleTokens",["Y","R","q","Q","M","L","w","I","d","E","i","e","c","t","T"])}parse(i,r,n){switch(r){case"D":case"DD":return le(he.dayOfYear,i);case"Do":return n.ordinalNumber(i,{unit:"date"});default:return pe(r.length,i)}}validate(i,r){const n=i.getFullYear();return js(n)?r>=1&&r<=366:r>=1&&r<=365}set(i,r,n){return i.setMonth(0,n),i.setHours(0,0,0,0),i}}function Vn(e,t,i){var h,b,f,m;const r=Ot(),n=(i==null?void 0:i.weekStartsOn)??((b=(h=i==null?void 0:i.locale)==null?void 0:h.options)==null?void 0:b.weekStartsOn)??r.weekStartsOn??((m=(f=r.locale)==null?void 0:f.options)==null?void 0:m.weekStartsOn)??0,a=R(e,i==null?void 0:i.in),s=a.getDay(),d=(t%7+7)%7,u=7-n,p=t<0||t>6?t-(s+u)%7:(d+u)%7-(s+u)%7;return Hr(a,p,i)}class Yu extends Q{constructor(){super(...arguments);T(this,"priority",90);T(this,"incompatibleTokens",["D","i","e","c","t","T"])}parse(i,r,n){switch(r){case"E":case"EE":case"EEE":return n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"EEEEE":return n.day(i,{width:"narrow",context:"formatting"});case"EEEEEE":return n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"EEEE":default:return n.day(i,{width:"wide",context:"formatting"})||n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=6}set(i,r,n,a){return i=Vn(i,n,a),i.setHours(0,0,0,0),i}}class Ku extends Q{constructor(){super(...arguments);T(this,"priority",90);T(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","c","t","T"])}parse(i,r,n,a){const s=l=>{const d=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+d};switch(r){case"e":case"ee":return ge(pe(r.length,i),s);case"eo":return ge(n.ordinalNumber(i,{unit:"day"}),s);case"eee":return n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"eeeee":return n.day(i,{width:"narrow",context:"formatting"});case"eeeeee":return n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"});case"eeee":default:return n.day(i,{width:"wide",context:"formatting"})||n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"})}}validate(i,r){return r>=0&&r<=6}set(i,r,n,a){return i=Vn(i,n,a),i.setHours(0,0,0,0),i}}class Uu extends Q{constructor(){super(...arguments);T(this,"priority",90);T(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","e","t","T"])}parse(i,r,n,a){const s=l=>{const d=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+d};switch(r){case"c":case"cc":return ge(pe(r.length,i),s);case"co":return ge(n.ordinalNumber(i,{unit:"day"}),s);case"ccc":return n.day(i,{width:"abbreviated",context:"standalone"})||n.day(i,{width:"short",context:"standalone"})||n.day(i,{width:"narrow",context:"standalone"});case"ccccc":return n.day(i,{width:"narrow",context:"standalone"});case"cccccc":return n.day(i,{width:"short",context:"standalone"})||n.day(i,{width:"narrow",context:"standalone"});case"cccc":default:return n.day(i,{width:"wide",context:"standalone"})||n.day(i,{width:"abbreviated",context:"standalone"})||n.day(i,{width:"short",context:"standalone"})||n.day(i,{width:"narrow",context:"standalone"})}}validate(i,r){return r>=0&&r<=6}set(i,r,n,a){return i=Vn(i,n,a),i.setHours(0,0,0,0),i}}function Gu(e,t,i){const r=R(e,i==null?void 0:i.in),n=_u(r,i),a=t-n;return Hr(r,a,i)}class Zu extends Q{constructor(){super(...arguments);T(this,"priority",90);T(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","E","e","c","t","T"])}parse(i,r,n){const a=s=>s===0?7:s;switch(r){case"i":case"ii":return pe(r.length,i);case"io":return n.ordinalNumber(i,{unit:"day"});case"iii":return ge(n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"}),a);case"iiiii":return ge(n.day(i,{width:"narrow",context:"formatting"}),a);case"iiiiii":return ge(n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"}),a);case"iiii":default:return ge(n.day(i,{width:"wide",context:"formatting"})||n.day(i,{width:"abbreviated",context:"formatting"})||n.day(i,{width:"short",context:"formatting"})||n.day(i,{width:"narrow",context:"formatting"}),a)}}validate(i,r){return r>=1&&r<=7}set(i,r,n){return i=Gu(i,n),i.setHours(0,0,0,0),i}}class Qu extends Q{constructor(){super(...arguments);T(this,"priority",80);T(this,"incompatibleTokens",["b","B","H","k","t","T"])}parse(i,r,n){switch(r){case"a":case"aa":case"aaa":return n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaaa":return n.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaa":default:return n.dayPeriod(i,{width:"wide",context:"formatting"})||n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,n){return i.setHours(Hn(n),0,0,0),i}}class Xu extends Q{constructor(){super(...arguments);T(this,"priority",80);T(this,"incompatibleTokens",["a","B","H","k","t","T"])}parse(i,r,n){switch(r){case"b":case"bb":case"bbb":return n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbbb":return n.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbb":default:return n.dayPeriod(i,{width:"wide",context:"formatting"})||n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,n){return i.setHours(Hn(n),0,0,0),i}}class Ju extends Q{constructor(){super(...arguments);T(this,"priority",80);T(this,"incompatibleTokens",["a","b","t","T"])}parse(i,r,n){switch(r){case"B":case"BB":case"BBB":return n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBBB":return n.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBB":default:return n.dayPeriod(i,{width:"wide",context:"formatting"})||n.dayPeriod(i,{width:"abbreviated",context:"formatting"})||n.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,r,n){return i.setHours(Hn(n),0,0,0),i}}class ep extends Q{constructor(){super(...arguments);T(this,"priority",70);T(this,"incompatibleTokens",["H","K","k","t","T"])}parse(i,r,n){switch(r){case"h":return le(he.hour12h,i);case"ho":return n.ordinalNumber(i,{unit:"hour"});default:return pe(r.length,i)}}validate(i,r){return r>=1&&r<=12}set(i,r,n){const a=i.getHours()>=12;return a&&n<12?i.setHours(n+12,0,0,0):!a&&n===12?i.setHours(0,0,0,0):i.setHours(n,0,0,0),i}}class tp extends Q{constructor(){super(...arguments);T(this,"priority",70);T(this,"incompatibleTokens",["a","b","h","K","k","t","T"])}parse(i,r,n){switch(r){case"H":return le(he.hour23h,i);case"Ho":return n.ordinalNumber(i,{unit:"hour"});default:return pe(r.length,i)}}validate(i,r){return r>=0&&r<=23}set(i,r,n){return i.setHours(n,0,0,0),i}}class ip extends Q{constructor(){super(...arguments);T(this,"priority",70);T(this,"incompatibleTokens",["h","H","k","t","T"])}parse(i,r,n){switch(r){case"K":return le(he.hour11h,i);case"Ko":return n.ordinalNumber(i,{unit:"hour"});default:return pe(r.length,i)}}validate(i,r){return r>=0&&r<=11}set(i,r,n){return i.getHours()>=12&&n<12?i.setHours(n+12,0,0,0):i.setHours(n,0,0,0),i}}class rp extends Q{constructor(){super(...arguments);T(this,"priority",70);T(this,"incompatibleTokens",["a","b","h","H","K","t","T"])}parse(i,r,n){switch(r){case"k":return le(he.hour24h,i);case"ko":return n.ordinalNumber(i,{unit:"hour"});default:return pe(r.length,i)}}validate(i,r){return r>=1&&r<=24}set(i,r,n){const a=n<=24?n%24:n;return i.setHours(a,0,0,0),i}}class np extends Q{constructor(){super(...arguments);T(this,"priority",60);T(this,"incompatibleTokens",["t","T"])}parse(i,r,n){switch(r){case"m":return le(he.minute,i);case"mo":return n.ordinalNumber(i,{unit:"minute"});default:return pe(r.length,i)}}validate(i,r){return r>=0&&r<=59}set(i,r,n){return i.setMinutes(n,0,0),i}}class ap extends Q{constructor(){super(...arguments);T(this,"priority",50);T(this,"incompatibleTokens",["t","T"])}parse(i,r,n){switch(r){case"s":return le(he.second,i);case"so":return n.ordinalNumber(i,{unit:"second"});default:return pe(r.length,i)}}validate(i,r){return r>=0&&r<=59}set(i,r,n){return i.setSeconds(n,0),i}}class sp extends Q{constructor(){super(...arguments);T(this,"priority",30);T(this,"incompatibleTokens",["t","T"])}parse(i,r){const n=a=>Math.trunc(a*Math.pow(10,-r.length+3));return ge(pe(r.length,i),n)}set(i,r,n){return i.setMilliseconds(n),i}}class op extends Q{constructor(){super(...arguments);T(this,"priority",10);T(this,"incompatibleTokens",["t","T","x"])}parse(i,r){switch(r){case"X":return Re(Ne.basicOptionalMinutes,i);case"XX":return Re(Ne.basic,i);case"XXXX":return Re(Ne.basicOptionalSeconds,i);case"XXXXX":return Re(Ne.extendedOptionalSeconds,i);case"XXX":default:return Re(Ne.extended,i)}}set(i,r,n){return r.timestampIsSet?i:ue(i,i.getTime()-wr(i)-n)}}class lp extends Q{constructor(){super(...arguments);T(this,"priority",10);T(this,"incompatibleTokens",["t","T","X"])}parse(i,r){switch(r){case"x":return Re(Ne.basicOptionalMinutes,i);case"xx":return Re(Ne.basic,i);case"xxxx":return Re(Ne.basicOptionalSeconds,i);case"xxxxx":return Re(Ne.extendedOptionalSeconds,i);case"xxx":default:return Re(Ne.extended,i)}}set(i,r,n){return r.timestampIsSet?i:ue(i,i.getTime()-wr(i)-n)}}class cp extends Q{constructor(){super(...arguments);T(this,"priority",40);T(this,"incompatibleTokens","*")}parse(i){return Ns(i)}set(i,r,n){return[ue(i,n*1e3),{timestampIsSet:!0}]}}class dp extends Q{constructor(){super(...arguments);T(this,"priority",20);T(this,"incompatibleTokens","*")}parse(i){return Ns(i)}set(i,r,n){return[ue(i,n),{timestampIsSet:!0}]}}const up={G:new Mu,y:new Du,Y:new Eu,R:new Ou,u:new zu,Q:new Au,q:new Lu,M:new Iu,L:new Fu,w:new Nu,I:new ju,d:new Wu,D:new qu,E:new Yu,e:new Ku,c:new Uu,i:new Zu,a:new Qu,b:new Xu,B:new Ju,h:new ep,H:new tp,K:new ip,k:new rp,m:new np,s:new ap,S:new sp,X:new op,x:new lp,t:new cp,T:new dp},pp=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,hp=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,gp=/^'([^]*?)'?$/,fp=/''/g,mp=/\S/,bp=/[a-zA-Z]/;function vp(e,t,i,r){var $,w,x,S,B,q,k,V;const n=()=>ue((r==null?void 0:r.in)||i,NaN),a=$u(),s=(r==null?void 0:r.locale)??a.locale??Os,l=(r==null?void 0:r.firstWeekContainsDate)??((w=($=r==null?void 0:r.locale)==null?void 0:$.options)==null?void 0:w.firstWeekContainsDate)??a.firstWeekContainsDate??((S=(x=a.locale)==null?void 0:x.options)==null?void 0:S.firstWeekContainsDate)??1,d=(r==null?void 0:r.weekStartsOn)??((q=(B=r==null?void 0:r.locale)==null?void 0:B.options)==null?void 0:q.weekStartsOn)??a.weekStartsOn??((V=(k=a.locale)==null?void 0:k.options)==null?void 0:V.weekStartsOn)??0;if(!t)return e?n():R(i,r==null?void 0:r.in);const u={firstWeekContainsDate:l,weekStartsOn:d,locale:s},p=[new Pu(r==null?void 0:r.in,i)],h=t.match(hp).map(y=>{const F=y[0];if(F in Cn){const Y=Cn[F];return Y(y,s.formatLong)}return y}).join("").match(pp),b=[];for(let y of h){!(r!=null&&r.useAdditionalWeekYearTokens)&&Fs(y)&&Tn(y,t,e),!(r!=null&&r.useAdditionalDayOfYearTokens)&&Is(y)&&Tn(y,t,e);const F=y[0],Y=up[F];if(Y){const{incompatibleTokens:W}=Y;if(Array.isArray(W)){const ne=b.find(ze=>W.includes(ze.token)||ze.token===F);if(ne)throw new RangeError(`The format string mustn't contain \`${ne.fullToken}\` and \`${y}\` at the same time`)}else if(Y.incompatibleTokens==="*"&&b.length>0)throw new RangeError(`The format string mustn't contain \`${y}\` and any other token at the same time`);b.push({token:F,fullToken:y});const K=Y.run(e,y,s.match,u);if(!K)return n();p.push(K.setter),e=K.rest}else{if(F.match(bp))throw new RangeError("Format string contains an unescaped latin alphabet character `"+F+"`");if(y==="''"?y="'":F==="'"&&(y=yp(y)),e.indexOf(y)===0)e=e.slice(y.length);else return n()}}if(e.length>0&&mp.test(e))return n();const f=p.map(y=>y.priority).sort((y,F)=>F-y).filter((y,F,Y)=>Y.indexOf(y)===F).map(y=>p.filter(F=>F.priority===y).sort((F,Y)=>Y.subPriority-F.subPriority)).map(y=>y[0]);let m=R(i,r==null?void 0:r.in);if(isNaN(+m))return n();const v={};for(const y of f){if(!y.validate(m,u))return n();const F=y.set(m,v,u);Array.isArray(F)?(m=F[0],Object.assign(v,F[1])):m=F}return m}function yp(e){return e.match(gp)[1].replace(fp,"'")}function xp(e,t){const i=R(e,t==null?void 0:t.in);return i.setMinutes(0,0,0),i}function wp(e,t){const i=R(e,t==null?void 0:t.in);return i.setSeconds(0,0),i}function $p(e,t){const i=R(e,t==null?void 0:t.in);return i.setMilliseconds(0),i}function _p(e,t){const i=()=>ue(t==null?void 0:t.in,NaN),r=(t==null?void 0:t.additionalDigits)??2,n=Tp(e);let a;if(n.date){const u=Pp(n.date,r);a=Mp(u.restDateString,u.year)}if(!a||isNaN(+a))return i();const s=+a;let l=0,d;if(n.time&&(l=Dp(n.time),isNaN(l)))return i();if(n.timezone){if(d=Ep(n.timezone),isNaN(d))return i()}else{const u=new Date(s+l),p=R(0,t==null?void 0:t.in);return p.setFullYear(u.getUTCFullYear(),u.getUTCMonth(),u.getUTCDate()),p.setHours(u.getUTCHours(),u.getUTCMinutes(),u.getUTCSeconds(),u.getUTCMilliseconds()),p}return R(s+l+d,t==null?void 0:t.in)}const pr={dateTimeDelimiter:/[T ]/,timeZoneDelimiter:/[Z ]/i,timezone:/([Z+-].*)$/},kp=/^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/,Sp=/^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/,Cp=/^([+-])(\d{2})(?::?(\d{2}))?$/;function Tp(e){const t={},i=e.split(pr.dateTimeDelimiter);let r;if(i.length>2)return t;if(/:/.test(i[0])?r=i[0]:(t.date=i[0],r=i[1],pr.timeZoneDelimiter.test(t.date)&&(t.date=e.split(pr.timeZoneDelimiter)[0],r=e.substr(t.date.length,e.length))),r){const n=pr.timezone.exec(r);n?(t.time=r.replace(n[1],""),t.timezone=n[1]):t.time=r}return t}function Pp(e,t){const i=new RegExp("^(?:(\\d{4}|[+-]\\d{"+(4+t)+"})|(\\d{2}|[+-]\\d{"+(2+t)+"})$)"),r=e.match(i);if(!r)return{year:NaN,restDateString:""};const n=r[1]?parseInt(r[1]):null,a=r[2]?parseInt(r[2]):null;return{year:a===null?n:a*100,restDateString:e.slice((r[1]||r[2]).length)}}function Mp(e,t){if(t===null)return new Date(NaN);const i=e.match(kp);if(!i)return new Date(NaN);const r=!!i[4],n=Ci(i[1]),a=Ci(i[2])-1,s=Ci(i[3]),l=Ci(i[4]),d=Ci(i[5])-1;if(r)return Ip(t,l,d)?Op(t,l,d):new Date(NaN);{const u=new Date(0);return!Ap(t,a,s)||!Lp(t,n)?new Date(NaN):(u.setUTCFullYear(t,a,Math.max(n,s)),u)}}function Ci(e){return e?parseInt(e):1}function Dp(e){const t=e.match(Sp);if(!t)return NaN;const i=ln(t[1]),r=ln(t[2]),n=ln(t[3]);return Fp(i,r,n)?i*ir+r*tr+n*1e3:NaN}function ln(e){return e&&parseFloat(e.replace(",","."))||0}function Ep(e){if(e==="Z")return 0;const t=e.match(Cp);if(!t)return 0;const i=t[1]==="+"?-1:1,r=parseInt(t[2]),n=t[3]&&parseInt(t[3])||0;return Bp(r,n)?i*(r*ir+n*tr):NaN}function Op(e,t,i){const r=new Date(0);r.setUTCFullYear(e,0,4);const n=r.getUTCDay()||7,a=(t-1)*7+i+1-n;return r.setUTCDate(r.getUTCDate()+a),r}const zp=[31,null,31,30,31,30,31,31,30,31,30,31];function Hs(e){return e%400===0||e%4===0&&e%100!==0}function Ap(e,t,i){return t>=0&&t<=11&&i>=1&&i<=(zp[t]||(Hs(e)?29:28))}function Lp(e,t){return t>=1&&t<=(Hs(e)?366:365)}function Ip(e,t,i){return t>=1&&t<=53&&i>=0&&i<=6}function Fp(e,t,i){return e===24?t===0&&i===0:i>=0&&i<60&&t>=0&&t<60&&e>=0&&e<25}function Bp(e,t){return t>=0&&t<=59}/*!
 * chartjs-adapter-date-fns v3.0.0
 * https://www.chartjs.org
 * (c) 2022 chartjs-adapter-date-fns Contributors
 * Released under the MIT license
 */const Np={datetime:"MMM d, yyyy, h:mm:ss aaaa",millisecond:"h:mm:ss.SSS aaaa",second:"h:mm:ss aaaa",minute:"h:mm aaaa",hour:"ha",day:"MMM d",week:"PP",month:"MMM yyyy",quarter:"qqq - yyyy",year:"yyyy"};To._date.override({_id:"date-fns",formats:function(){return Np},parse:function(e,t){if(e===null||typeof e>"u")return null;const i=typeof e;return i==="number"||e instanceof Date?e=R(e):i==="string"&&(typeof t=="string"?e=vp(e,t,new Date,this.options):e=_p(e,this.options)),Cs(e)?e.getTime():null},format:function(e,t){return xu(e,t,this.options)},add:function(e,t,i){switch(i){case"millisecond":return Nn(e,t);case"second":return cd(e,t);case"minute":return od(e,t);case"hour":return nd(e,t);case"day":return Hr(e,t);case"week":return dd(e,t);case"month":return Bn(e,t);case"quarter":return ld(e,t);case"year":return ud(e,t);default:return e}},diff:function(e,t,i){switch(i){case"millisecond":return Rn(e,t);case"second":return yd(e,t);case"minute":return md(e,t);case"hour":return fd(e,t);case"day":return Ts(e,t);case"week":return xd(e,t);case"month":return Ds(e,t);case"quarter":return vd(e,t);case"year":return wd(e,t);default:return 0}},startOf:function(e,t,i){switch(t){case"second":return $p(e);case"minute":return wp(e);case"hour":return xp(e);case"day":return Sn(e);case"week":return je(e);case"isoWeek":return je(e,{weekStartsOn:+i});case"month":return _d(e);case"quarter":return $d(e);case"year":return Es(e);default:return e}},endOf:function(e,t){switch(t){case"second":return Md(e);case"minute":return Td(e);case"hour":return Sd(e);case"day":return Ps(e);case"week":return Cd(e);case"month":return Ms(e);case"quarter":return Pd(e);case"year":return kd(e);default:return e}}});function za(e,t){if(!(t!=null&&t.start)||!(t!=null&&t.end))return null;const i=e.getPixelForValue(t.start.getTime()),r=e.getPixelForValue(t.end.getTime());if(!Number.isFinite(i)||!Number.isFinite(r))return null;const n=Math.min(i,r),a=Math.max(Math.abs(r-i),2);return!Number.isFinite(a)||a<=0?null:{left:n,width:a}}const Rp={id:"pricingModeIcons",beforeDatasetsDraw(e,t,i){var d;const r=i,n=r==null?void 0:r.segments;if(!(n!=null&&n.length))return;const a=e.chartArea,s=(d=e.scales)==null?void 0:d.x;if(!a||!s)return;const l=e.ctx;l.save(),l.globalAlpha=(r==null?void 0:r.backgroundOpacity)??.12;for(const u of n){const p=za(s,u);p&&(l.fillStyle=u.color||"rgba(255, 255, 255, 0.1)",l.fillRect(p.left,a.top,p.width,a.bottom-a.top))}l.restore()},afterDatasetsDraw(e,t,i){var y;const r=i,n=r==null?void 0:r.segments;if(!(n!=null&&n.length))return;const a=(y=e.scales)==null?void 0:y.x,s=e.chartArea;if(!a||!s)return;const l=(r==null?void 0:r.iconSize)??16,d=(r==null?void 0:r.labelSize)??9,u=`${l}px "Inter", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,p=`${d}px "Inter", sans-serif`,h=(r==null?void 0:r.iconColor)||"rgba(255, 255, 255, 0.95)",b=(r==null?void 0:r.labelColor)||"rgba(255, 255, 255, 0.7)",f=(r==null?void 0:r.axisBandPadding)??10,m=(r==null?void 0:r.axisBandHeight)??l+d+10,v=(r==null?void 0:r.axisBandColor)||"rgba(6, 10, 18, 0.12)",$=(r==null?void 0:r.iconAlignment)||"start",w=(r==null?void 0:r.iconStartOffset)??12,x=(r==null?void 0:r.iconBaselineOffset)??4,S=(a.bottom||s.bottom)+f,B=Math.min(S,e.height-m-2),q=s.right-s.left,k=B+x,V=e.ctx;V.save(),V.globalCompositeOperation="destination-over",V.fillStyle=v,V.fillRect(s.left,B,q,m),V.restore(),V.save(),V.globalCompositeOperation="destination-over",V.textAlign="center",V.textBaseline="top";for(const F of n){const Y=za(a,F);if(!Y)continue;let W;if($==="start"){W=Y.left+w;const K=Y.left+Y.width-l/2;W>K&&(W=Y.left+Y.width/2)}else W=Y.left+Y.width/2;V.font=u,V.fillStyle=h,V.fillText(F.icon||"❓",W,k),F.shortLabel&&(V.font=p,V.fillStyle=b,V.fillText(F.shortLabel,W,k+l-2))}V.restore()}};function Aa(e,t){if(!e)return;e.layout||(e.layout={}),e.layout.padding||(e.layout.padding={});const i=e.layout.padding,r=12;i.top=i.top??12,i.bottom=Math.max(i.bottom||0,r)}var jp=Object.defineProperty,Hp=Object.getOwnPropertyDescriptor,oi=(e,t,i,r)=>{for(var n=r>1?void 0:r?Hp(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&jp(t,i,n),n};const et=G;Fr.register(Ua,Ga,Po,Mo,Za,Qa,Do,Xa,Eo,Oo,Ja,es,zo,Ao,ts,Rp);function Vp(e){const t=e.timeline.map(i=>i.spot_price_czk??0);return{label:"📊 Spotová cena nákupu",data:t,borderColor:"#2196F3",backgroundColor:"rgba(33, 150, 243, 0.15)",borderWidth:3,fill:!1,tension:.4,type:"line",yAxisID:"y-price",pointRadius:t.map(()=>0),pointHoverRadius:7,pointBackgroundColor:t.map(()=>"#42a5f5"),pointBorderColor:t.map(()=>"#42a5f5"),pointBorderWidth:2,order:1,datalabels:{display:!1}}}function Wp(e){return{label:"💰 Výkupní cena",data:e.timeline.map(t=>t.export_price_czk??0),borderColor:"#4CAF50",backgroundColor:"rgba(76, 187, 106, 0.15)",borderWidth:2,fill:!1,type:"line",tension:.4,yAxisID:"y-price",pointRadius:0,pointHoverRadius:5,order:1,borderDash:[5,5]}}function qp(e){if(!e.solar)return[];const{string1:t,string2:i,hasString1:r,hasString2:n}=e.solar,a=(r?1:0)+(n?1:0),s={string1:{border:"rgba(255, 193, 7, 0.8)",bg:"rgba(255, 193, 7, 0.2)"},string2:{border:"rgba(255, 152, 0, 0.8)",bg:"rgba(255, 152, 0, 0.2)"}};if(a===1){const l=r?t:i,d=r?s.string1:s.string2;return[{label:"☀️ Solární předpověď",data:l,borderColor:d.border,backgroundColor:d.bg,borderWidth:2,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",pointRadius:0,pointHoverRadius:5,order:2}]}return a===2?[{label:"☀️ String 2",data:i,borderColor:s.string2.border,backgroundColor:s.string2.bg,borderWidth:1.5,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2},{label:"☀️ String 1",data:t,borderColor:s.string1.border,backgroundColor:s.string1.bg,borderWidth:1.5,fill:"-1",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2}]:[]}function Yp(e){if(!e.battery)return[];const{baseline:t,solarCharge:i,gridCharge:r,gridNet:n,consumption:a}=e.battery,s=[],l={baseline:{border:"#78909C",bg:"rgba(120, 144, 156, 0.25)"},solar:{border:"transparent",bg:"rgba(255, 167, 38, 0.6)"},grid:{border:"transparent",bg:"rgba(33, 150, 243, 0.6)"}};return a.some(d=>d!=null&&d>0)&&s.push({label:"🏠 Spotřeba (plán)",data:a,borderColor:"rgba(255, 112, 67, 0.7)",backgroundColor:"rgba(255, 112, 67, 0.12)",borderWidth:1.5,type:"line",fill:!1,tension:.25,pointRadius:0,pointHoverRadius:5,yAxisID:"y-power",stack:"consumption",borderDash:[6,4],order:2}),r.some(d=>d!=null&&d>0)&&s.push({label:"⚡ Do baterie ze sítě",data:r,backgroundColor:l.grid.bg,borderColor:l.grid.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),i.some(d=>d!=null&&d>0)&&s.push({label:"☀️ Do baterie ze soláru",data:i,backgroundColor:l.solar.bg,borderColor:l.solar.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),s.push({label:"🔋 Zbývající kapacita",data:t,backgroundColor:l.baseline.bg,borderColor:l.baseline.border,borderWidth:3,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),n.some(d=>d!==null)&&s.push({label:"📡 Netto odběr ze sítě",data:n,borderColor:"#00BCD4",backgroundColor:"transparent",borderWidth:2,type:"line",fill:!1,tension:.2,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",order:2}),s}function La(e){const t=[];return e.prices.length>0&&t.push(Vp(e)),e.exportPrices.length>0&&t.push(Wp(e)),t.push(...qp(e)),t.push(...Yp(e)),t}function hr(e,t,i=""){if(e==null)return"";const r=i?` ${i}`:"";return`${e.toFixed(t)}${r}`}function jt(e){var n;const t=(n=e.scales)==null?void 0:n.x;if(!t)return"overview";const r=(t.max-t.min)/(1e3*60*60);return r<=6?"detail":r<=24?"day":"overview"}function mt(e,t){var p,h,b,f,m,v,$,w,x,S,B;if(!((p=e==null?void 0:e.scales)!=null&&p.x))return;const i=e.scales.x,n=(i.max-i.min)/(1e3*60*60),a=jt(e),s=(b=(h=e.options.plugins)==null?void 0:h.legend)==null?void 0:b.labels;s&&(s.padding=10,s.font&&(s.font.size=11),a==="detail"&&(s.padding=12,s.font&&(s.font.size=12)));const l=["y-price","y-solar","y-power"];for(const q of l){const k=(f=e.options.scales)==null?void 0:f[q];k&&(a==="overview"?(k.title&&(k.title.display=!1),(m=k.ticks)!=null&&m.font&&(k.ticks.font.size=10),q==="y-solar"&&(k.display=!1)):a==="detail"?(k.title&&(k.title.display=!0,k.title.font&&(k.title.font.size=12)),(v=k.ticks)!=null&&v.font&&(k.ticks.font.size=11),k.display=!0):(k.title&&(k.title.display=!0,k.title.font&&(k.title.font.size=11)),($=k.ticks)!=null&&$.font&&(k.ticks.font.size=10),k.display=!0))}const d=(w=e.options.scales)==null?void 0:w.x;d&&(a==="overview"?d.ticks&&(d.ticks.maxTicksLimit=12,d.ticks.font&&(d.ticks.font.size=10)):a==="detail"?(d.ticks&&(d.ticks.maxTicksLimit=24,d.ticks.font&&(d.ticks.font.size=11)),d.time&&(d.time.displayFormats.hour="HH:mm")):(d.ticks&&(d.ticks.maxTicksLimit=16,d.ticks.font&&(d.ticks.font.size=10)),d.time&&(d.time.displayFormats.hour="dd.MM HH:mm")));const u=t==="always"||t==="auto"&&n<=6;for(const q of e.data.datasets){const k=q;if(k.datalabels||(k.datalabels={}),t==="never"){k.datalabels.display=!1;continue}if(u){let V=1;n>3&&n<=6?V=2:n>6&&(V=4),k.datalabels.display=W=>{const K=W.dataset.data[W.dataIndex];return K==null||K===0?!1:W.dataIndex%V===0};const y=k.yAxisID==="y-price",F=((x=k.label)==null?void 0:x.includes("Solární"))||((S=k.label)==null?void 0:S.includes("String")),Y=(B=k.label)==null?void 0:B.includes("kapacita");k.datalabels.align="top",k.datalabels.offset=6,k.datalabels.color="#fff",k.datalabels.font={size:9,weight:"bold"},y?(k.datalabels.formatter=W=>hr(W,2,"Kč"),k.datalabels.backgroundColor=k.borderColor||"rgba(33, 150, 243, 0.8)"):F?(k.datalabels.formatter=W=>hr(W,1,"kW"),k.datalabels.backgroundColor=k.borderColor||"rgba(255, 193, 7, 0.8)"):Y?(k.datalabels.formatter=W=>hr(W,1,"kWh"),k.datalabels.backgroundColor=k.borderColor||"rgba(120, 144, 156, 0.8)"):(k.datalabels.formatter=W=>hr(W,1),k.datalabels.backgroundColor=k.borderColor||"rgba(33, 150, 243, 0.8)"),k.datalabels.borderRadius=4,k.datalabels.padding={top:3,bottom:3,left:5,right:5}}else k.datalabels.display=!1}e.update("none"),_.debug(`[PricingChart] Detail: ${n.toFixed(1)}h, Labels: ${u?"ON":"OFF"}, Mode: ${t}`)}let nt=class extends D{constructor(){super(...arguments),this.data=null,this.datalabelMode="auto",this.zoomState={start:null,end:null},this.currentDetailLevel="overview",this.chart=null,this.resizeObserver=null}firstUpdated(){this.setupResizeObserver(),this.data&&this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())}updated(e){e.has("data")&&this.data&&(this.chart?this.updateChartData():this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())),e.has("datalabelMode")&&this.chart&&mt(this.chart,this.datalabelMode)}disconnectedCallback(){var e;super.disconnectedCallback(),this.destroyChart(),(e=this.resizeObserver)==null||e.disconnect(),this.resizeObserver=null}zoomToTimeRange(e,t){if(!this.chart){_.warn("[PricingChart] Chart not available for zoom");return}const i=new Date(e),r=new Date(t),n=15*60*1e3,a=i.getTime()-n,s=r.getTime()+n;if(this.zoomState.start!==null&&Math.abs(this.zoomState.start-a)<6e4&&this.zoomState.end!==null&&Math.abs(this.zoomState.end-s)<6e4){_.debug("[PricingChart] Already zoomed to same range → reset"),this.resetZoom();return}try{const l=this.chart.options;l.scales.x.min=a,l.scales.x.max=s,this.chart.update("none"),this.zoomState={start:a,end:s},this.currentDetailLevel=jt(this.chart),mt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-change",{detail:{start:a,end:s,level:this.currentDetailLevel},bubbles:!0,composed:!0})),_.debug("[PricingChart] Zoomed to range",{start:new Date(a).toISOString(),end:new Date(s).toISOString()})}catch(l){_.error("[PricingChart] Zoom error",l)}}resetZoom(){if(!this.chart)return;const e=this.chart.options;delete e.scales.x.min,delete e.scales.x.max,this.chart.update("none"),this.zoomState={start:null,end:null},this.currentDetailLevel=jt(this.chart),mt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-reset",{bubbles:!0,composed:!0}))}getChart(){return this.chart}createChart(){if(!this.canvas||!this.data||this.data.timeline.length===0)return;this.chart&&this.destroyChart();const e=this.data,t=La(e),i={responsive:!0,maintainAspectRatio:!1,animation:{duration:0},interaction:{mode:"index",intersect:!1},plugins:{legend:{labels:{color:"#ffffff",font:{size:11,weight:"500"},padding:10,usePointStyle:!0,pointStyle:"circle",boxWidth:12,boxHeight:12},position:"top"},tooltip:{backgroundColor:"rgba(0,0,0,0.9)",titleColor:"#ffffff",bodyColor:"#ffffff",titleFont:{size:13,weight:"bold"},bodyFont:{size:11},padding:10,cornerRadius:6,displayColors:!0,callbacks:{title:n=>n.length>0?new Date(n[0].parsed.x).toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"",label:n=>{let a=n.dataset.label||"";return a&&(a+=": "),n.parsed.y!==null&&(n.dataset.yAxisID==="y-price"?a+=n.parsed.y.toFixed(2)+" Kč/kWh":n.dataset.yAxisID==="y-solar"?a+=n.parsed.y.toFixed(2)+" kWh":n.dataset.yAxisID==="y-power"?a+=n.parsed.y.toFixed(2)+" kW":a+=n.parsed.y),a}}},datalabels:{display:!1},zoom:{zoom:{wheel:{enabled:!0,modifierKey:null},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)",borderColor:"rgba(33, 150, 243, 0.8)",borderWidth:2},pinch:{enabled:!0},mode:"x",onZoomComplete:({chart:n})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=jt(n),mt(n,this.datalabelMode)}},pan:{enabled:!0,mode:"x",modifierKey:"shift",onPanComplete:({chart:n})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=jt(n),mt(n,this.datalabelMode)}},limits:{x:{minRange:36e5}}},pricingModeIcons:null},scales:{x:{type:"timeseries",time:{unit:"hour",displayFormats:{hour:"dd.MM HH:mm"},tooltipFormat:"dd.MM.yyyy HH:mm"},ticks:{color:this.getTextColor(),maxRotation:45,minRotation:45,font:{size:11},maxTicksLimit:20},grid:{color:this.getGridColor(),lineWidth:1}},"y-price":{type:"linear",position:"left",ticks:{color:"#2196F3",font:{size:11,weight:"500"},callback:n=>n.toFixed(2)+" Kč"},grid:{color:"rgba(33, 150, 243, 0.15)",lineWidth:1},title:{display:!0,text:"💰 Cena (Kč/kWh)",color:"#2196F3",font:{size:13,weight:"bold"}}},"y-solar":{type:"linear",position:"left",stacked:!0,ticks:{color:"#78909C",font:{size:11,weight:"500"},callback:n=>n.toFixed(1)+" kWh",display:!0},grid:{display:!0,color:"rgba(120, 144, 156, 0.15)",lineWidth:1,drawOnChartArea:!0},title:{display:!0,text:"🔋 Kapacita baterie (kWh)",color:"#78909C",font:{size:11,weight:"bold"}},beginAtZero:!1},"y-power":{type:"linear",position:"right",stacked:!0,ticks:{color:"#FFA726",font:{size:11,weight:"500"},callback:n=>n.toFixed(2)+" kW"},grid:{display:!1},title:{display:!0,text:"☀️ Výkon (kW)",color:"#FFA726",font:{size:13,weight:"bold"}}}}};Aa(i);const r={type:"bar",data:{labels:e.labels,datasets:t},plugins:[ts],options:i};try{this.chart=new Fr(this.canvas,r),mt(this.chart,this.datalabelMode),e.initialZoomStart&&e.initialZoomEnd&&requestAnimationFrame(()=>{if(!this.chart)return;const n=this.chart.options;n.scales.x.min=e.initialZoomStart,n.scales.x.max=e.initialZoomEnd,this.chart.update("none"),this.currentDetailLevel=jt(this.chart),mt(this.chart,this.datalabelMode)}),_.info("[PricingChart] Chart created",{datasets:t.length,labels:e.labels.length,segments:e.modeSegments.length})}catch(n){_.error("[PricingChart] Failed to create chart",n)}}updateChartData(){var s;if(!this.chart||!this.data)return;const e=this.data,t=La(e),i=((s=this.chart.data.labels)==null?void 0:s.length)!==e.labels.length,r=this.chart.data.datasets.length!==t.length;i&&(this.chart.data.labels=e.labels);let n="none";r?(this.chart.data.datasets=t,n=void 0):t.forEach((l,d)=>{const u=this.chart.data.datasets[d];u&&(u.data=l.data,u.label=l.label,u.backgroundColor=l.backgroundColor,u.borderColor=l.borderColor)});const a=this.chart.options;a.plugins||(a.plugins={}),a.plugins.pricingModeIcons=null,Aa(a),this.chart.update(n),_.debug("[PricingChart] Chart updated incrementally")}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(()=>{var e;(e=this.chart)==null||e.resize()}),this.resizeObserver.observe(this)}getTextColor(){try{return getComputedStyle(this).getPropertyValue("--oig-text-primary").trim()||"#e0e0e0"}catch{return"#e0e0e0"}}getGridColor(){try{return getComputedStyle(this).getPropertyValue("--oig-border").trim()||"rgba(255,255,255,0.1)"}catch{return"rgba(255,255,255,0.1)"}}setDatalabelMode(e){this.datalabelMode=e,this.dispatchEvent(new CustomEvent("datalabel-mode-change",{detail:{mode:e},bubbles:!0,composed:!0}))}get isZoomed(){return this.zoomState.start!==null||this.zoomState.end!==null}renderControls(){const e=t=>{const i=this.datalabelMode===t?"active":"";return t==="always"&&this.datalabelMode==="always"?`control-btn mode-always ${i}`:t==="never"&&this.datalabelMode==="never"?`control-btn mode-never ${i}`:`control-btn ${i}`};return c`
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
    `}};nt.styles=M`
    :host {
      display: block;
      background: ${et(o.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${et(o.cardShadow)};
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
      color: ${et(o.textPrimary)};
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
      color: ${et(o.textSecondary)};
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .control-btn:hover {
      background: ${et(o.accent)};
      color: #fff;
    }

    .control-btn.active {
      background: ${et(o.accent)};
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
      color: ${et(o.textSecondary)};
      font-size: 14px;
    }

    .chart-hint {
      font-size: 10px;
      color: ${et(o.textSecondary)};
      opacity: 0.7;
      margin-top: 6px;
      text-align: center;
    }
  `;oi([g({type:Object})],nt.prototype,"data",2);oi([g({type:String})],nt.prototype,"datalabelMode",2);oi([P()],nt.prototype,"zoomState",2);oi([P()],nt.prototype,"currentDetailLevel",2);oi([Br("#pricing-canvas")],nt.prototype,"canvas",2);nt=oi([E("oig-pricing-chart")],nt);const At="—";function Le(e){return e==null||!Number.isFinite(e)?At:`${e.toFixed(1)} °C`}function Wt(e){return e==null||!Number.isFinite(e)?At:`${e.toFixed(2)} kWh`}function Pn(e){return e==null||!Number.isFinite(e)?At:`${e.toFixed(2)} Kč`}function Kp(e){return e==null||!Number.isFinite(e)?At:`${Math.round(e*100)} %`}function Up(e,t){const i=r=>{const n=new Date(r);return Number.isNaN(n.getTime())?r:`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`};return`${i(e)} – ${i(t)}`}function Gp(e){return e==null||!Number.isFinite(e)?At:e<60?`${Math.round(e)} s`:e<3600?`${Math.round(e/60)} min`:`${Math.round(e/3600)} h`}function Zp(e){return e==null||!Number.isFinite(e)?At:`${e.toFixed(0)} L`}function Qp(e){if(e==null||!Number.isFinite(e)||e<0)return At;const t=Math.floor(e/60),i=Math.round(e%60);return t===0?`${i} min`:i===0?`${t} h`:`${t} h ${i} min`}function Xp(e){const t=e.topTempC;if(t==null||!Number.isFinite(t))return null;if(e.targetTempC<=t)return 0;const i=e.targetTempC-t;return e.temperatureTrendCPerMin!=null&&Number.isFinite(e.temperatureTrendCPerMin)&&e.temperatureTrendCPerMin>0?i/e.temperatureTrendCPerMin:e.heaterPowerKw!==null&&Number.isFinite(e.heaterPowerKw)&&e.volumeL!=null&&Number.isFinite(e.volumeL)?e.heaterPowerKw===0?null:e.volumeL*.001163*i/e.heaterPowerKw*60:null}var Jp=Object.defineProperty,eh=Object.getOwnPropertyDescriptor,I=(e,t,i,r)=>{for(var n=r>1?void 0:r?eh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Jp(t,i,n),n};const z=G,Lt=M`
  background: ${z(o.cardBg)};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${z(o.cardShadow)};
`,ut=M`
  font-size: 15px;
  font-weight: 600;
  color: ${z(o.textPrimary)};
  margin: 0 0 12px 0;
`;function th(e){return Math.max(0,Math.min(100,e))}function Ia(e){const r=Math.max(0,Math.min(1,(e-10)/60)),n={r:33,g:150,b:243},a={r:255,g:87,b:34},s=(l,d)=>Math.round(l+(d-l)*r);return`rgb(${s(n.r,a.r)}, ${s(n.g,a.g)}, ${s(n.b,a.b)})`}let Ni=class extends D{constructor(){super(...arguments),this.collapsed=!0,this.busy=!1}toggle(){this.collapsed=!this.collapsed}async doAction(e,t){this.busy=!0;try{const i=await e();this.dispatchEvent(new CustomEvent("action-done",{detail:{success:i,label:t},bubbles:!0,composed:!0}))}finally{this.busy=!1}}render(){return c`
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
              @click=${()=>this.doAction(Ql,"plan")}>
              Preplanovat (debug)
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(Xl,"apply")}>
              Aplikovat rucne
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(Jl,"cancel")}>
              Zrusit plan
            </button>
          </div>
        </div>
      </div>
    `}};Ni.styles=M`
    :host { display: block; }

    .panel {
      ${Lt};
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
  `;I([P()],Ni.prototype,"collapsed",2);I([P()],Ni.prototype,"busy",2);Ni=I([E("oig-boiler-debug-panel")],Ni);let _r=class extends D{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return c`<div>Nacitani stavu...</div>`;const t=(i,r,n=1)=>i!=null?`${i.toFixed(n)} ${r}`:`-- ${r}`;return c`
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
        `:O}
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
    `}};_r.styles=M`
    :host { display: block; }

    h3 { ${ut}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .card {
      ${Lt};
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
  `;I([g({type:Object})],_r.prototype,"data",2);_r=I([E("oig-boiler-status-grid")],_r);let kr=class extends D{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return O;const t=i=>`${i.toFixed(2)} kWh`;return c`
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
    `}};kr.styles=M`
    :host { display: block; }

    h3 { ${ut}; }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .card {
      ${Lt};
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
  `;I([g({type:Object})],kr.prototype,"data",2);kr=I([E("oig-boiler-energy-breakdown")],kr);let Sr=class extends D{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return O;const t=e.peakHours.length?e.peakHours.map(n=>`${n}h`).join(", "):"--",i=e.waterLiters40c!==null?`${e.waterLiters40c.toFixed(0)} L`:"-- L",r=e.circulationNow.startsWith("ANO");return c`
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
    `}};Sr.styles=M`
    :host { display: block; }

    h3 { ${ut}; }

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
  `;I([g({type:Object})],Sr.prototype,"data",2);Sr=I([E("oig-boiler-predicted-usage")],Sr);let Ri=class extends D{constructor(){super(...arguments),this.plan=null,this.forecastWindows={fve:"--",grid:"--"}}render(){var r;const e=this.plan,t=this.forecastWindows,i=n=>n??"--";return c`
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
    `}};Ri.styles=M`
    :host { display: block; }

    h3 { ${ut}; }

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
  `;I([g({type:Object})],Ri.prototype,"plan",2);I([g({type:Object})],Ri.prototype,"forecastWindows",2);Ri=I([E("oig-boiler-plan-info")],Ri);let ji=class extends D{constructor(){super(...arguments),this.boilerState=null,this.targetTemp=60}render(){const e=this.boilerState;if(!e)return c`<div>Nacitani...</div>`;const t=10,i=70,r=f=>th((f-t)/(i-t)*100),n=e.heatingPercent??0,a=e.tempTop!==null?r(e.tempTop):null,s=e.tempBottom!==null?r(e.tempBottom):null,l=r(this.targetTemp),d=Ia(e.tempTop??this.targetTemp),u=Ia(e.tempBottom??10),p=`linear-gradient(180deg, ${d} 0%, ${u} 100%)`,h=e.heatingPercent!==null?`${e.heatingPercent.toFixed(0)}% nahrato`:"-- % nahrato";return c`
      <h3>Vizualizace bojleru</h3>

      <div class="tank-wrapper">
        <div class="temp-scale">
          ${[70,60,50,40,30,20,10].map(f=>c`<span>${f}°C</span>`)}
        </div>

        <div class="tank">
          <div class="water" style="height:${n}%; background:${p}"></div>

          <div class="target-line" style="bottom:${l}%">
            <span class="target-label">Cil</span>
          </div>

          ${a!==null?c`
            <div class="sensor top" style="bottom:${a}%">
              <span class="sensor-label">${e.tempTop.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:O}

          ${s!==null?c`
            <div class="sensor bottom" style="bottom:${s}%">
              <span class="sensor-label">${e.tempBottom.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:O}
        </div>
      </div>

      <div class="grade-label">${h}</div>
    `}};ji.styles=M`
    :host { display: block; }

    h3 { ${ut}; }

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
  `;I([g({type:Object})],ji.prototype,"boilerState",2);I([g({type:Number})],ji.prototype,"targetTemp",2);ji=I([E("oig-boiler-tank")],ji);let Hi=class extends D{constructor(){super(...arguments),this.current="",this.available=[]}onChange(e){const t=e.target.value;this.dispatchEvent(new CustomEvent("category-change",{detail:{category:t},bubbles:!0,composed:!0}))}render(){const e=this.available.length?this.available:Object.keys(ga);return c`
      <div class="row">
        <label>Profil:</label>
        <select @change=${this.onChange}>
          ${e.map(t=>c`
            <option value=${t} ?selected=${t===this.current}>
              ${ga[t]||t}
            </option>
          `)}
        </select>
      </div>
    `}};Hi.styles=M`
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
  `;I([g({type:String})],Hi.prototype,"current",2);I([g({type:Array})],Hi.prototype,"available",2);Hi=I([E("oig-boiler-category-select")],Hi);let Cr=class extends D{constructor(){super(...arguments),this.data=[]}render(){if(!this.data.length)return O;const e=this.data.flatMap(s=>s.hours),t=Math.max(...e,.1),i=t*.3,r=t*.7,n=Array.from({length:24},(s,l)=>l),a=s=>s===0?"none":s<i?"low":s<r?"medium":"high";return c`
      <h3>Mapa spotreby (7 dni)</h3>
      <div class="wrapper">
        <div class="grid">
          <!-- Header row -->
          <div></div>
          ${n.map(s=>c`<div class="hour-header">${s}</div>`)}

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
    `}};Cr.styles=M`
    :host { display: block; }

    h3 { ${ut}; }

    .wrapper {
      ${Lt};
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
  `;I([g({type:Array})],Cr.prototype,"data",2);Cr=I([E("oig-boiler-heatmap-grid")],Cr);let Tr=class extends D{constructor(){super(...arguments),this.plan=null}render(){const e=this.plan,t=(i,r=2)=>i!=null?i.toFixed(r):"-";return c`
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
    `}};Tr.styles=M`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .card {
      ${Lt};
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
  `;I([g({type:Object})],Tr.prototype,"plan",2);Tr=I([E("oig-boiler-stats-cards")],Tr);let Pr=class extends D{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return O;const t=Math.max(...e.hourlyAvg,.01),i=new Set(e.peakHours),r=e.peakHours.length?e.peakHours.map(a=>`${a}h`).join(", "):"--",n=e.confidence!==null?`${Math.round(e.confidence*100)} %`:"-- %";return c`
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
    `}};Pr.styles=M`
    :host { display: block; }

    h3 { ${ut}; }

    .wrapper {
      ${Lt};
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
  `;I([g({type:Object})],Pr.prototype,"data",2);Pr=I([E("oig-boiler-profiling")],Pr);let Mr=class extends D{constructor(){super(...arguments),this.config=null}render(){const e=this.config;if(!e)return O;const t=(i,r="")=>i!=null?`${i}${r?" "+r:""}`:`--${r?" "+r:""}`;return c`
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
    `}};Mr.styles=M`
    :host { display: block; }

    h3 { ${ut}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .card {
      ${Lt};
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
  `;I([g({type:Object})],Mr.prototype,"config",2);Mr=I([E("oig-boiler-config-section")],Mr);let Dr=class extends D{constructor(){super(...arguments),this.state=null}render(){return this.state?c`
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
    `:c`<div>Nacitani...</div>`}};Dr.styles=M`
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
  `;I([g({type:Object})],Dr.prototype,"state",2);Dr=I([E("oig-boiler-state")],Dr);let Er=class extends D{constructor(){super(...arguments),this.data=[]}render(){return O}};Er.styles=M`
    :host { display: block; }
  `;I([g({type:Array})],Er.prototype,"data",2);Er=I([E("oig-boiler-heatmap")],Er);let Vi=class extends D{constructor(){super(...arguments),this.profiles=[],this.editMode=!1}render(){return O}};Vi.styles=M`
    :host { display: block; }
  `;I([g({type:Array})],Vi.prototype,"profiles",2);I([g({type:Boolean})],Vi.prototype,"editMode",2);Vi=I([E("oig-boiler-profiles")],Vi);let Wi=class extends D{constructor(){super(...arguments),this.data=null,this.lang="cs"}render(){const e=this.data,t=this.lang,i=(e==null?void 0:e.currentState)??"unknown",r=C(`boiler.status.${i}`,t),n=(e==null?void 0:e.comfortSatisfied)===!0?C("boiler.status.comfort_satisfied",t):(e==null?void 0:e.comfortSatisfied)===!1?C("boiler.status.comfort_unsatisfied",t):C("boiler.status.comfort_unknown",t),a=(e==null?void 0:e.comfortSatisfied)===!0?"ok":(e==null?void 0:e.comfortSatisfied)===!1?"bad":"unknown",s=(e==null?void 0:e.degradedFlags)??[];return c`
      <div data-testid="boiler-status-panel" class="panel">
        <div class="row">
          <div class="heading">${C("boiler.status.heading",t)}</div>
          <span data-testid="boiler-status-current-state" class="pill ${i}">${r}</span>
        </div>
        <div class="degraded-banner" ?hidden=${!(e!=null&&e.degraded)}>${C("boiler.status.degraded",t)}</div>
        <div class="grid">
          <div class="field"><label>${C("boiler.status.temp_top",t)}</label><span>${Le((e==null?void 0:e.temperatureTop)??null)}</span></div>
          <div class="field"><label>${C("boiler.status.temp_bottom",t)}</label><span>${Le((e==null?void 0:e.temperatureBottom)??null)}</span></div>
          <div class="field"><label>${C("boiler.status.selected_source",t)}</label><span data-testid="boiler-status-selected-source">${Ge((e==null?void 0:e.selectedSource)??null,t)}</span></div>
          <div class="field"><label>${C("boiler.status.actuated_source",t)}</label><span data-testid="boiler-status-actuated-source">${Ge((e==null?void 0:e.actuatedSource)??null,t)}</span></div>
          <div class="field"><label>${C("boiler.status.energy_needed",t)}</label><span>${Wt((e==null?void 0:e.energyNeededKwh)??null)}</span></div>
          <div class="field"><label>${C("boiler.status.last_update",t)}</label><span>${(e==null?void 0:e.lastUpdate)??"—"}</span></div>
        </div>
        <div data-testid="boiler-status-comfort" class="comfort ${a}">${n}</div>
        ${s.length?c`<div data-testid="boiler-status-degraded-flags" class="degraded-list">${s.map(l=>c`<span class="degraded-tag">${fr(l,t)}</span>`)}</div>`:""}
      </div>
    `}};Wi.styles=M`
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
  `;I([g({attribute:!1})],Wi.prototype,"data",2);I([g({type:String})],Wi.prototype,"lang",2);Wi=I([E("oig-boiler-status-panel")],Wi);let qi=class extends D{constructor(){super(...arguments),this.slots=[],this.lang="cs"}srcClass(e){return e&&["fve","grid","alternative","overflow","discharge"].includes(e)?e:"other"}render(){const e=this.lang;return!this.slots||this.slots.length===0?c`<div data-testid="boiler-plan-timeline" class="wrap"><div class="heading">${C("boiler.timeline.heading",e)}</div><div class="empty">${C("boiler.timeline.empty",e)}</div></div>`:c`
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
                  <td>${Up(t.start,t.end)}</td>
                  <td><span class="src ${this.srcClass(t.recommendedSource)}">${Ge(t.recommendedSource,e)}</span></td>
                  <td>${Le(t.expectedTempTopC??null)} ${i}</td>
                  <td>${Wt(t.consumptionKwh)}</td>
                  <td>${Pn(t.estimatedCostCzk??null)}</td>
                  <td>${Kp(t.pvShare??null)}</td>
                </tr>
              `})}
          </tbody>
        </table>
      </div>
    `}};qi.styles=M`
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
  `;I([g({attribute:!1})],qi.prototype,"slots",2);I([g({type:String})],qi.prototype,"lang",2);qi=I([E("oig-boiler-plan-timeline")],qi);const Fa=new Set(["input_stale_price","input_stale_pv","input_stale_temperature","input_missing_recorder","input_adapter_error"]);let Yi=class extends D{constructor(){super(...arguments),this.explanation=null,this.lang="cs"}render(){const e=this.explanation,t=this.lang;if(!e)return c`<div data-testid="boiler-source-explanation" class="wrap"><div class="heading">${C("boiler.explanation.heading",t)}</div><div class="empty">${C("boiler.explanation.empty",t)}</div></div>`;const i=e.reasonCodes??[],r=i.filter(s=>Fa.has(s)),n=i.filter(s=>!Fa.has(s)),a=e.degradedReasons??[];return c`
      <div data-testid="boiler-source-explanation" class="wrap">
        <div class="heading">${C("boiler.explanation.heading",t)}</div>

        <div class="section" data-testid="boiler-explanation-freshness">
          <h4>${C("boiler.explanation.freshness_heading",t)}</h4>
          ${r.length===0?c`<div class="chips"><span class="chip fresh">${C("boiler.explanation.freshness_fresh",t)}</span></div>`:c`<div class="chips">${r.map(s=>c`<span class="chip stale">${fr(s,t)}</span>`)}</div>`}
        </div>

        <div class="section" data-testid="boiler-explanation-degraded">
          <h4>${C("boiler.explanation.degraded_heading",t)}</h4>
          ${a.length===0?c`<div class="empty">—</div>`:c`<div class="chips">${a.map(s=>c`<span class="chip degraded">${fr(s,t)}</span>`)}</div>`}
        </div>

        ${n.length?c`<div class="section" data-testid="boiler-explanation-reasons"><h4>Reason codes</h4><div class="chips">${n.map(s=>c`<span class="chip">${fr(s,t)}</span>`)}</div></div>`:""}

        <div class="meta-grid" data-testid="boiler-explanation-meta">
          ${e.planCreatedAt?c`<div class="meta"><label>${C("boiler.explanation.plan_created",t)}</label><span>${e.planCreatedAt}</span></div>`:""}
          ${e.planValidUntil?c`<div class="meta"><label>${C("boiler.explanation.plan_valid_until",t)}</label><span>${e.planValidUntil}</span></div>`:""}
          ${e.dataAgeSecs!=null?c`<div class="meta"><label>${C("boiler.explanation.data_age",t)}</label><span>${Gp(e.dataAgeSecs)}</span></div>`:""}
          ${e.unsatisfiedComfortGapC!=null?c`<div class="meta"><label>${C("boiler.explanation.unsatisfied_gap",t)}</label><span>${e.unsatisfiedComfortGapC} °C</span></div>`:""}
          ${e.temperatureAtDeadlineC!=null?c`<div class="meta"><label>${C("boiler.explanation.temp_at_deadline",t)}</label><span>${Le(e.temperatureAtDeadlineC)}</span></div>`:""}
        </div>
      </div>
    `}};Yi.styles=M`
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
  `;I([g({attribute:!1})],Yi.prototype,"explanation",2);I([g({type:String})],Yi.prototype,"lang",2);Yi=I([E("oig-boiler-source-explanation")],Yi);let Jt=class extends D{constructor(){super(...arguments),this.identity={entryId:null,boxId:null,available:!1},this.currentOverride=null,this.lang="cs"}render(){var a,s;const e=this.lang,t=this.identity.available,i=((a=this.currentOverride)==null?void 0:a.capabilityAvailable)??!1,r=t&&i,n=((s=this.currentOverride)==null?void 0:s.active)===!0;return c`
      <div data-testid="boiler-override-panel" class="wrap">
        <div class="heading">${C("boiler.override.heading",e)}</div>
        <div class="subtitle">${C("boiler.override.subtitle",e)}</div>
        ${n?c`<span class="active-badge">${C("boiler.override.active",e)}</span>`:""}
        <div class="notice" ?hidden=${t}>${C("boiler.override.identity_unavailable",e)}</div>
        <div class="notice capability-notice" ?hidden=${!t||i}>${C("boiler.override.capability_unavailable",e)}</div>
        <label>
          ${C("boiler.override.ttl_label",e)}
          <input data-testid="override-ttl-input" type="number" min="15" max="1440" step="15" value="120" ?disabled=${!r} />
        </label>
        <label>
          ${C("boiler.override.reason_label",e)}
          <textarea data-testid="override-reason-input" required ?disabled=${!r}></textarea>
        </label>
        <button data-testid="override-submit-btn" ?disabled=${!r}>${C("boiler.override.submit",e)}</button>
      </div>
    `}};Jt.styles=M`
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
  `;I([g({attribute:!1})],Jt.prototype,"identity",2);I([g({attribute:!1})],Jt.prototype,"currentOverride",2);I([g({type:String})],Jt.prototype,"lang",2);Jt=I([E("oig-boiler-override-panel")],Jt);let ei=class extends D{constructor(){super(...arguments),this.reason="unavailable",this.message="",this.lang="cs"}render(){const e=this.lang,t=this.reason==="loading"?"⏳":this.reason==="error"?"⚠️":this.reason==="degraded"?"🟠":"ℹ️";return c`
      <div data-testid="boiler-unavailable-state" class="wrap">
        <span class="icon">${t}</span>
        <div class="headline loading-notice" ?hidden=${this.reason!=="loading"}>${C("boiler.unavailable.loading",e)}</div>
        <div class="headline error-notice" ?hidden=${this.reason!=="error"}>${C("boiler.unavailable.error",e)}</div>
        <div class="headline degraded-notice" ?hidden=${this.reason!=="degraded"}>${C("boiler.unavailable.degraded",e)}</div>
        <div class="headline unavailable-notice" ?hidden=${this.reason!=="unavailable"}>${C("boiler.unavailable.unavailable",e)}</div>
        ${this.message?c`<div class="message">${this.message}</div>`:""}
      </div>
    `}};ei.styles=M`
    :host { display: block; }
    .wrap { padding: 24px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; }
    .icon { font-size: 1.6rem; }
    .headline { font-size: 1rem; font-weight: 600; }
    .message { color: var(--secondary-text-color, #666); font-size: 0.9rem; }
  `;I([g({type:String})],ei.prototype,"reason",2);I([g({type:String})],ei.prototype,"message",2);I([g({type:String})],ei.prototype,"lang",2);ei=I([E("oig-boiler-unavailable-state")],ei);var ih=Object.defineProperty,rh=Object.getOwnPropertyDescriptor,Oe=(e,t,i,r)=>{for(var n=r>1?void 0:r?rh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&ih(t,i,n),n};const bt=G,Ba=320,Na=440,nh=75,cn=35,ah=170,dn=370,Ra=30,Ke=86,$e=46,tt=148,Ue=348,Bt=22,zi=$e+Ue,Be=Ke+tt/2,Mn="#9E9E9E";function sh(e){return e?An[e]??Mn:Mn}function ja(e){return isFinite(e)?Math.max(0,Math.min(1,e)):0}function oh(e,t){const i=ja(e??0);if(i<=0)return[];const r=t.filter(s=>s.key!=="discharge"&&s.fillPct>0);if(r.length===0){const s=Math.round(i*Ue),l=zi-s,d=Math.max($e,l),u=zi-d;return[{key:null,color:Mn,x:Ke,y:d,width:tt,height:u,active:!1}]}const n=[];let a=zi;for(const s of r){const l=Math.round(ja(s.fillPct)*Ue);if(l<=0)continue;const d=a-l,u=Math.max($e,d),p=a-u;if(p<=0||(n.push({key:s.key,color:sh(s.key),x:Ke,y:u,width:tt,height:p,active:s.active}),a=u,a<=$e))break}return n}function lh(e,t,i,r,n){const a=[C("boiler.aria.svg_summary",n)];a.push(`${C("boiler.status.temp_top",n)}: ${Le(e)}`),a.push(`${C("boiler.status.temp_bottom",n)}: ${Le(t)}`);const s=i?Ge(i,n):C("boiler.aria.source_unknown",n);return a.push(s),r&&a.push(C("boiler.aria.stale",n)),a.join(". ")}let ke=class extends D{constructor(){super(...arguments),this.fillLevelPct=null,this.sourceSegments=[],this.topTempC=null,this.bottomTempC=null,this.lowerZoneTempC=null,this.volumeL=null,this.etaText=null,this.sourceKey=null,this.stale=!1,this.chargingLabel=null,this.lang="cs"}render(){try{return this._renderSvg()}catch{return c`<svg viewBox="0 0 ${Ba} ${Na}" role="img" aria-label="${C("boiler.aria.svg_summary",this.lang)}" data-testid="boiler-svg"></svg>`}}_renderSvg(){const e=oh(this.fillLevelPct,this.sourceSegments),t=lh(this.topTempC,this.bottomTempC,this.sourceKey,this.stale,this.lang),i="boiler-tank-clip",r=Le(this.topTempC),n=this.volumeL!=null?Zp(this.volumeL):null,a=this.sourceKey?Ge(this.sourceKey,this.lang):null,s=this.bottomTempC??this.lowerZoneTempC??null,l=s!=null?`${s.toFixed(1)}°`:"—°",d=s!=null&&this.bottomTempC==null?"DOLE (zóna)":"DOLE",u=this.fillLevelPct??null,p=u!=null?Math.round(u*100):null,h=u!=null?Math.max($e+10,405-370*u):null;return c`
      <svg
        viewBox="0 0 ${Ba} ${Na}"
        role="img"
        aria-label="${t}"
        data-testid="boiler-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="${i}">
            <rect
              x="${Ke}"
              y="${$e}"
              width="${tt}"
              height="${Ue}"
              rx="${Bt}"
              ry="${Bt}"
            />
          </clipPath>
        </defs>

        <rect
          class="boiler-body"
          x="${nh}"
          y="${cn}"
          width="${ah}"
          height="${dn}"
          rx="${Ra}"
          ry="${Ra}"
        />

        <rect
          class="boiler-tank-bg"
          x="${Ke}"
          y="${$e}"
          width="${tt}"
          height="${Ue}"
          rx="${Bt}"
          ry="${Bt}"
        />

        <g clip-path="url(#${i})">
          ${e.map(b=>Z`
              <rect
                class="aura-segment${b.active?" aura-segment--active":""}"
                data-testid="boiler-aura-fill"
                data-source-key="${b.key??"unknown"}"
                x="${b.x}"
                y="${b.y}"
                width="${b.width}"
                height="${b.height}"
                fill="${b.color}"
              />
            `)}
        </g>

        <rect
          class="boiler-tank-overlay"
          x="${Ke}"
          y="${$e}"
          width="${tt}"
          height="${Ue}"
          rx="${Bt}"
          ry="${Bt}"
        />

        ${h!=null&&p!=null?Z`
          <line x1="${Ke}" y1="${h}" x2="${Ke+tt}" y2="${h}"
            stroke="rgba(245,184,0,.6)" stroke-width="1.5" stroke-dasharray="3,3"/>
          <text x="${Ke+tt+7}" y="${h+4}"
            font-size="9" fill="#f5b800" font-weight="600">${p}%</text>
        `:""}

        <text
          class="temp-label-top label-shadow"
          data-testid="boiler-temp-top-label"
          x="${Be}"
          y="${$e+44}"
        >${r}</text>

        <text
          class="temp-label-bottom label-shadow"
          data-testid="boiler-temp-bottom-label"
          x="${Be}"
          y="${zi-36}"
          font-size="22"
          font-weight="700"
          fill="#fff"
          text-anchor="middle"
          style="paint-order:stroke;stroke:rgba(0,0,0,.4);stroke-width:2px"
        >${l}</text>
        <text
          x="${Be}"
          y="${zi-20}"
          text-anchor="middle"
          fill="rgba(255,255,255,.85)"
          font-size="10"
          style="paint-order:stroke;stroke:rgba(0,0,0,.3);stroke-width:2px"
        >${d}</text>

        ${n!=null?Z`
          <g>
            <rect
              x="${Be-50}"
              y="${$e+Ue/2-18}"
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
              x="${Be}"
              y="${$e+Ue/2-3}"
            >≈ ${n}</text>
            <text
              class="volume-badge-sub"
              x="${Be}"
              y="${$e+Ue/2+11}"
            >TUV @ 40 °C</text>
          </g>
        `:""}

        ${this.chargingLabel!=null?Z`
          <g>
            <rect
              x="${Be-58}"
              y="${$e+126}"
              width="116"
              height="26"
              rx="13"
              fill="rgba(74,222,128,0.95)"
            />
            <text
              class="charging-chip-text"
              x="${Be}"
              y="${$e+143}"
            >${this.chargingLabel}</text>
          </g>
        `:""}

        ${this.etaText!=null?Z`
          <g transform="translate(${Be} ${cn+dn+22})" data-testid="boiler-eta-chip">
            <rect x="-90" y="-14" width="180" height="28" rx="8"
              fill="rgba(255,122,69,.12)" stroke="rgba(255,122,69,.4)"/>
            <text x="0" y="-1" text-anchor="middle" fill="#ff7a45" font-size="12" font-weight="700">⏱ ${this.etaText}</text>
          </g>
        `:""}

        ${a!=null?Z`
          <text
            class="source-chip-text"
            data-testid="boiler-source-chip"
            x="${Be}"
            y="${cn+dn+40}"
          >${a}</text>
        `:""}

        <line x1="50" y1="85" x2="80" y2="85" stroke="#5a6472" stroke-width="3"/>
        <text x="46" y="81" text-anchor="end" font-size="9" fill="#9aa6b2">⟲ Cirk.</text>
        <line x1="240" y1="85" x2="270" y2="85" stroke="#dd5544" stroke-width="3"/>
        <text x="274" y="81" font-size="9" fill="#9aa6b2">TUV →</text>
        <line x1="50" y1="380" x2="80" y2="380" stroke="#6688a8" stroke-width="3"/>
        <text x="46" y="376" text-anchor="end" font-size="9" fill="#9aa6b2">💧 Vstup</text>
      </svg>
    `}};ke.styles=M`
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
      fill: ${bt(o.bgSecondary)};
      stroke: ${bt(o.divider)};
      stroke-width: 2;
    }

    .boiler-tank-bg {
      fill: ${bt(o.bgPrimary)};
      stroke: ${bt(o.divider)};
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
      stroke: ${bt(o.divider)};
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
      fill: ${bt(o.textPrimary)};
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .source-chip-text {
      font-size: 12px;
      font-weight: 500;
      fill: ${bt(o.textSecondary)};
      text-anchor: middle;
      dominant-baseline: middle;
    }
  `;Oe([g({type:Number})],ke.prototype,"fillLevelPct",2);Oe([g({type:Array})],ke.prototype,"sourceSegments",2);Oe([g({type:Number})],ke.prototype,"topTempC",2);Oe([g({type:Number})],ke.prototype,"bottomTempC",2);Oe([g({type:Number})],ke.prototype,"lowerZoneTempC",2);Oe([g({type:Number})],ke.prototype,"volumeL",2);Oe([g({type:String})],ke.prototype,"etaText",2);Oe([g({type:String})],ke.prototype,"sourceKey",2);Oe([g({type:Boolean})],ke.prototype,"stale",2);Oe([g({type:String})],ke.prototype,"chargingLabel",2);Oe([g({type:String})],ke.prototype,"lang",2);ke=Oe([E("oig-boiler-v2-svg")],ke);var ch=Object.defineProperty,dh=Object.getOwnPropertyDescriptor,Vr=(e,t,i,r)=>{for(var n=r>1?void 0:r?dh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&ch(t,i,n),n};const un=G,pn=new Set(["temperature_unavailable","temperature_stale","source_stale","activity_stale","source_invalid","power_sign_mismatch_charge","power_sign_mismatch_discharge","runtime_cache_empty","config_profile_unavailable"]);function uh(e){var t,i,r,n;if((t=e.status)!=null&&t.degraded)return!0;for(const a of((i=e.status)==null?void 0:i.degradedFlags)??[])if(pn.has(a))return!0;for(const a of((r=e.activity)==null?void 0:r.staleFlags)??[])if(pn.has(a))return!0;for(const a of((n=e.explanation)==null?void 0:n.degradedReasons)??[])if(pn.has(a))return!0;return!1}function ph(e,t,i){var a;const r=e.activity;if(!r)return null;const n=Xp({targetTempC:t.targetTempC??0,topTempC:((a=e.status)==null?void 0:a.temperatureTop)??null,temperatureTrendCPerMin:r.temperatureTrendCPerMin,volumeL:t.volumeL,heaterPowerKw:t.heaterPowerKw});return n===null?C("boiler.eta.unavailable",i):n===0?C("boiler.eta.already_reached",i):Qp(n)}let ti=class extends D{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs"}_renderAuraLegend(){var h,b;const e=this.data,t=(e==null?void 0:e.sourceSegments)??[],i=(e==null?void 0:e.activity)??null,r=(i==null?void 0:i.fillLevelPct)??null,n=(i==null?void 0:i.auraMaxTempC)??((h=this.config)==null?void 0:h.auraMaxTempC)??null,a=((b=e==null?void 0:e.status)==null?void 0:b.temperatureTop)??null,s={};for(const f of t)f.key&&(s[f.key]=(s[f.key]??0)+(f.energyKwh??0)/1e3);const l=r!=null?`${Math.round(r*100)} %`:null,d=l!=null?c`<div class="aura-percent">Náplň aury: <strong>${l}</strong>${a!=null&&n!=null?` (${Le(a)} / ${Le(n)} max)`:""}</div>`:O,p=c`
      <div class="aura-legend">
        ${[{key:"fve",color:"#f5b800"},{key:"overflow",color:"#4ade80"},{key:"grid",color:"#7c8694"}].map(({key:f,color:m})=>{const v=s[f]??0;return c`
            <div class="aura-legend-item">
              <span class="dot" style="background:${m}"></span>
              ${Ge(f,this.lang)} ${v.toFixed(1)}
            </div>
          `})}
      </div>
    `;return c`${d}${p}`}_renderSourceChip(){var l;const e=((l=this.data)==null?void 0:l.activity)??null,t=(e==null?void 0:e.source)??null;if(!t)return O;const i={grid:"SÍŤ",fve:"FVE",overflow:"PŘETOK",discharge:"VÝBOJ"},r={grid:"⚡",fve:"☀️",overflow:"🌊",discharge:"🔋"},n=i[t]??t.toUpperCase(),a=r[t]??"⚡",s=(e==null?void 0:e.powerKw)??null;return c`
      <div class="source-chip">
        <span>${a}</span>${n}<span>→</span>${s!=null?`${s.toFixed(1)} kW`:""}
      </div>
    `}_renderRecommendation(){var p,h,b;const e=this.data,i=((p=((e==null?void 0:e.planSlots)??[])[0])==null?void 0:p.recommendedSource)??null,r=((h=e==null?void 0:e.activity)==null?void 0:h.source)??null,n=((b=e==null?void 0:e.explanation)==null?void 0:b.reasonCodes)??[];if(!i)return O;const s={grid:"⚡ Síť",fve:"☀️ FVE",overflow:"🌊 Přetok",discharge:"🔋 Výboj"}[i]??i,l={no_fve:"FVE žádné",fve_available:"FVE dostupné",cheap_grid:"levná síť",overflow_available:"přetok dostupný"},d=n.length>0?n.map(f=>l[f]??f).join(", "):null,u=i===r;return c`
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
      `}}_renderShell(){var u,p,h;const e=this.data,t=e?uh(e):!1,i=(e==null?void 0:e.activity)??null,r=(e==null?void 0:e.status)??null,n=this.config,a=e&&n?ph(e,n,this.lang):null,s=(i==null?void 0:i.source)??null,l=(u=i==null?void 0:i.state)!=null&&u.startsWith("charging_")&&i.temperatureTrendCPerMin!=null?`↑ NABÍJÍ ${i.temperatureTrendCPerMin>=0?"+":""}${i.temperatureTrendCPerMin.toFixed(1)}°C/min`:(p=i==null?void 0:i.state)!=null&&p.startsWith("charging_")?"↑ NABÍJÍ":null,d=((h=e==null?void 0:e.status)==null?void 0:h.lowerZoneTempC)??null;return c`
      <div class="shell" data-testid="boiler-v2-shell">
        ${t?c`
              <div class="stale-warning" data-testid="boiler-stale-warning" role="alert">
                ${C("boiler.aria.stale",this.lang)}
              </div>
            `:O}

        <div class="svg-wrapper">
          <oig-boiler-v2-svg
            .fillLevelPct="${(i==null?void 0:i.fillLevelPct)??null}"
            .sourceSegments="${(e==null?void 0:e.sourceSegments)??[]}"
            .topTempC="${(r==null?void 0:r.temperatureTop)??null}"
            .bottomTempC="${(r==null?void 0:r.temperatureBottom)??null}"
            .lowerZoneTempC="${d}"
            .volumeL="${(n==null?void 0:n.volumeL)??null}"
            .etaText="${a}"
            .sourceKey="${s}"
            .chargingLabel="${l}"
            .stale="${t}"
            .lang="${this.lang}"
          ></oig-boiler-v2-svg>
        </div>
        <span aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">${(r==null?void 0:r.temperatureTop)??""}</span>

        ${this._renderAuraLegend()}
        ${a!=null?c`<div class="eta-row" style="font-size:11px;color:#9aa6b2;text-align:center">${C("boiler.eta.label",this.lang)}: <span aria-live="polite" style="font-weight:600;color:#e6edf3">${a}</span></div>`:""}
        ${this._renderSourceChip()}
        ${this._renderRecommendation()}

        <div class="advanced-slot" data-testid="boiler-advanced-slot">
          <slot name="advanced"></slot>
        </div>
      </div>
    `}};ti.styles=M`
    :host {
      display: block;
      font-family: ${un(o.fontFamily)};
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
      background: ${un(o.warning)};
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
      color: ${un(o.textPrimary)};
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
  `;Vr([g({type:Object})],ti.prototype,"data",2);Vr([g({type:Object})],ti.prototype,"config",2);Vr([g({type:String})],ti.prototype,"lang",2);ti=Vr([E("oig-boiler-v2-shell")],ti);var hh=Object.defineProperty,gh=Object.getOwnPropertyDescriptor,li=(e,t,i,r)=>{for(var n=r>1?void 0:r?gh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&hh(t,i,n),n};let at=class extends D{constructor(){super(...arguments),this.values=[],this.color="#4CAF50",this.sparkWidth=100,this.sparkHeight=30,this.label=""}render(){try{return this._renderSparkline()}catch{return c`<svg
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
      ></svg>`;const i=Math.min(...t),n=Math.max(...t)-i||1,a=2,s=this.sparkHeight-a*2,l=this.sparkWidth,d=e.length,u=e.map((p,h)=>{if(typeof p!="number"||!isFinite(p))return null;const b=d>1?h/(d-1)*l:l/2,f=a+s-(p-i)/n*s;return`${b.toFixed(2)},${f.toFixed(2)}`}).filter(p=>p!==null).join(" ");return c`
      <svg
        width="${this.sparkWidth}"
        height="${this.sparkHeight}"
        viewBox="0 0 ${this.sparkWidth} ${this.sparkHeight}"
        data-testid="boiler-sparkline"
        role="img"
        aria-label="${this.label}"
      >
        ${Z`<polyline
          points="${u}"
          fill="none"
          stroke="${this.color}"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />`}
      </svg>
    `}};at.styles=M`
    :host {
      display: inline-block;
    }
    svg {
      display: block;
      overflow: visible;
    }
  `;li([g({type:Array})],at.prototype,"values",2);li([g({type:String})],at.prototype,"color",2);li([g({type:Number})],at.prototype,"sparkWidth",2);li([g({type:Number})],at.prototype,"sparkHeight",2);li([g({type:String})],at.prototype,"label",2);at=li([E("oig-boiler-sparkline")],at);var fh=Object.defineProperty,mh=Object.getOwnPropertyDescriptor,nr=(e,t,i,r)=>{for(var n=r>1?void 0:r?mh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&fh(t,i,n),n};const Pe=G;function Ti(e){return e?An[e]??"#9E9E9E":"#9E9E9E"}let Tt=class extends D{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs",this.panelType="source"}render(){try{return this.panelType==="source"?this._renderSourcePanel():this._renderComfortPanel()}catch{return c`
        <div class="panel">
          <div class="empty-panel">—</div>
        </div>
      `}}_renderSourcePanel(){var w,x,S;const e=this.data,t=(e==null?void 0:e.activity)??null,i=(e==null?void 0:e.status)??null,r=(e==null?void 0:e.planSlots)??[],n=(e==null?void 0:e.sourceSegments)??[],a=((w=e==null?void 0:e.sparkline)==null?void 0:w.power)??[],s=(t==null?void 0:t.source)??(i==null?void 0:i.selectedSource)??null,l=((x=r[0])==null?void 0:x.recommendedSource)??null,d=((S=i==null?void 0:i.energyTracking)==null?void 0:S.totalKwh)??n.reduce((B,q)=>B+(q.energyKwh??0),0)/1e3,u={};for(const B of n)B.key&&(u[B.key]=(u[B.key]??0)+(B.energyKwh??0)/1e3);const p=(e==null?void 0:e.costTodayCzk)??null,h=(e==null?void 0:e.savingsTodayCzk)??null,b=(e==null?void 0:e.pvShare7dPct)??null,f=u.fve??null,m=u.overflow??null,v=u.grid??null,$=a.length>0;return c`
      <div class="panel" data-testid="boiler-source-panel">
        <div class="panel-title">Zdroj &amp; náklady</div>

        <div class="stat-row ${$?"":"no-spark"}">
          <span class="stat-label">Cena dnes</span>
          ${$?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#f5b800" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
          <span class="stat-value">${p!=null?Pn(p):"—"}<span class="stat-unit">Kč</span></span>
        </div>

        <div class="stat-row ${$?"":"no-spark"}">
          <span class="stat-label">Energie dnes</span>
          ${$?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#60a5fa" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
          <span class="stat-value">${d>0?Wt(d):"—"}</span>
        </div>

        ${f!=null?c`
          <div class="stat-row sub no-spark">
            <span class="stat-label">Z FVE</span>
            <span class="stat-value" style="color:${Ti("fve")}">${Wt(f)}</span>
          </div>
        `:O}

        ${m!=null?c`
          <div class="stat-row sub no-spark">
            <span class="stat-label">Z přetoku</span>
            <span class="stat-value" style="color:${Ti("overflow")}">${Wt(m)}</span>
          </div>
        `:O}

        ${v!=null?c`
          <div class="stat-row sub no-spark">
            <span class="stat-label">Ze sítě</span>
            <span class="stat-value" style="color:${Ti("grid")}">${Wt(v)}</span>
          </div>
        `:O}

        <div class="stat-row no-spark">
          <span class="stat-label">Ušetřeno vs. neoptim.</span>
          <span class="stat-value">${h!=null?`~${Pn(h)}`:"—"}<span class="stat-unit">${h!=null?"Kč":""}</span></span>
        </div>

        <div class="stat-row no-spark">
          <span class="stat-label">FVE podíl (7d)</span>
          <span class="stat-value">${b!=null?`${Math.round(b)} %`:"—"}</span>
        </div>

        <div class="stat-row no-spark">
          <span class="stat-label">Aktivní zdroj</span>
          <span class="stat-value source-value">
            ${s?c`<span class="source-dot" style="background:${Ti(s)}"></span>${Ge(s,this.lang)}`:"—"}
          </span>
        </div>

        <div class="stat-row no-spark">
          <span class="stat-label">Doporučený zdroj</span>
          <span class="stat-value source-value">
            ${l?c`<span class="source-dot" style="background:${Ti(l)}"></span>${Ge(l,this.lang)}`:"—"}
          </span>
        </div>
      </div>
    `}_renderComfortPanel(){var x;const e=this.data,t=(e==null?void 0:e.status)??null,i=(e==null?void 0:e.explanation)??null,r=this.config,n=(e==null?void 0:e.activity)??null,a=((x=e==null?void 0:e.sparkline)==null?void 0:x.temperature)??[],s=t==null?void 0:t.comfortSatisfied,l=s===!0?"ok":s===!1?"gap":"unknown",d=s===!0?C("boiler.status.comfort_satisfied",this.lang):s===!1?C("boiler.status.comfort_unsatisfied",this.lang):C("boiler.status.comfort_unknown",this.lang),u=(i==null?void 0:i.unsatisfiedComfortGapC)??null,p=(r==null?void 0:r.targetTempC)??null,h=u!=null&&p!=null?`Mezera do cíle: ${u.toFixed(1)} °C · cíl ${p.toFixed(0)} °C`:p!=null?`Cíl: ${p.toFixed(0)} °C`:"",b=(t==null?void 0:t.temperatureTop)??null,f=(t==null?void 0:t.temperatureBottom)??null,m=b!=null&&f!=null?b-f:null,v=(n==null?void 0:n.temperatureTrendCPerMin)??null,$=v!=null?`${v>=0?"+":""}${v.toFixed(1)} °C/min`:null,w=a.length>0;return c`
      <div class="panel" data-testid="boiler-comfort-panel">
        <div class="panel-title">Komfort</div>

        <div class="komfort-banner ${l}">
          <div class="komfort-circle ${l}">${s===!0?"✓":s===!1?"!":"?"}</div>
          <div>
            <div class="komfort-text-main ${l}">${d}</div>
            ${h?c`<div class="komfort-text-sub">${h}</div>`:O}
          </div>
        </div>

        ${r!=null&&r.deadlineTime&&r.deadlineTime!=="--:--"?c`
            <div class="stat-row no-spark">
              <span class="stat-label">${C("boiler.config.deadline",this.lang)}</span>
              <span class="stat-value">${r.deadlineTime}</span>
            </div>
          `:O}

        <div class="stat-row ${w?"":"no-spark"}">
          <span class="stat-label">${C("boiler.status.temp_top",this.lang)}</span>
          ${w?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#ff7a45" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
          <span class="stat-value">${Le(b)}</span>
        </div>

        ${f!=null?c`
            <div class="stat-row ${w?"":"no-spark"}">
              <span class="stat-label">${C("boiler.status.temp_bottom",this.lang)}</span>
              ${w?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#6688a8" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
              <span class="stat-value">${Le(f)}</span>
            </div>
          `:c`
            <div class="stat-row no-spark">
              <span class="stat-label">${C("boiler.status.temp_bottom",this.lang)}</span>
              <span class="stat-value">—</span>
            </div>
          `}

        ${m!=null?c`
            <div class="stat-row ${w?"":"no-spark"}">
              <span class="stat-label">Stratifikace ΔT</span>
              ${w?c`<oig-boiler-sparkline class="stat-spark" .values=${a} color="#a78bfa" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>`:""}
              <span class="stat-value">${m.toFixed(1)}<span class="stat-unit">°C</span></span>
            </div>
          `:O}

        ${$!=null?c`
            <div class="stat-row no-spark">
              <span class="stat-label">Trend</span>
              <span class="stat-value">${$}</span>
            </div>
          `:O}
      </div>
    `}};Tt.styles=M`
    :host {
      display: block;
      font-family: ${Pe(o.fontFamily)};
    }

    .panel {
      background: ${Pe(o.cardBg)};
      border: 1px solid ${Pe(o.divider)};
      border-radius: 12px;
      padding: 18px;
      box-sizing: border-box;
    }

    .panel-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${Pe(o.textSecondary)};
      margin: 0 0 14px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${Pe(o.textSecondary)};
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
      border-bottom: 1px solid ${Pe(o.divider)};
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
      color: ${Pe(o.textSecondary)};
    }

    .stat-label {
      color: ${Pe(o.textSecondary)};
      font-size: 12px;
    }

    .stat-value {
      font-size: 15px;
      font-weight: 600;
      color: ${Pe(o.textPrimary)};
      text-align: right;
      white-space: nowrap;
    }

    .stat-value.lg {
      font-size: 22px;
    }

    .stat-unit {
      color: ${Pe(o.textSecondary)};
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
      color: ${Pe(o.textSecondary)};
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
      color: ${Pe(o.textSecondary)};
      font-size: 12px;
      font-style: italic;
      padding: 4px 0;
    }
  `;nr([g({type:Object})],Tt.prototype,"data",2);nr([g({type:Object})],Tt.prototype,"config",2);nr([g({type:String})],Tt.prototype,"lang",2);nr([g({type:String})],Tt.prototype,"panelType",2);Tt=nr([E("oig-boiler-metric-panel")],Tt);var bh=Object.defineProperty,vh=Object.getOwnPropertyDescriptor,ci=(e,t,i,r)=>{for(var n=r>1?void 0:r?vh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&bh(t,i,n),n};const hn=G,Ei=1e3,Ht=200,Ha=20,gn=80,vt=3,qe=100,wt=1440;function yh(e){return e??Date.now()}function xh(e,t){var a,s;const i=new Intl.DateTimeFormat("en-US",{timeZone:t,hour:"numeric",minute:"2-digit",hour12:!1}).formatToParts(new Date(e)),r=parseInt(((a=i.find(l=>l.type==="hour"))==null?void 0:a.value)??"0",10)%24,n=parseInt(((s=i.find(l=>l.type==="minute"))==null?void 0:s.value)??"0",10);return r*60+n}function wh(e,t){const i=new Intl.DateTimeFormat("en-US",{timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}).formatToParts(new Date(e)),r=w=>{var x;return((x=i.find(S=>S.type===w))==null?void 0:x.value)??"00"},n=r("year"),a=r("month"),s=r("day"),l=parseInt(r("hour"),10)%24,d=r("minute"),u=r("second"),p=String(l).padStart(2,"0"),h=Date.UTC(parseInt(n),parseInt(a)-1,parseInt(s),l,parseInt(d),parseInt(u)),b=Math.round((h-e)/6e4),f=b>=0?"+":"-",m=Math.abs(b),v=String(Math.floor(m/60)).padStart(2,"0"),$=String(m%60).padStart(2,"0");return`${n}-${a}-${s}T${p}:${d}:${u}${f}${v}:${$}`}function Ye(e){return e/wt*Ei}function Nt(e){return String(parseFloat(e.toFixed(3)))}function fn(e){const t=Math.max(Ha,Math.min(gn,e));return(gn-t)/(gn-Ha)*Ht}function $h(e,t){const i=xh(e,t);return e-i*6e4}function _h(e){if(e.length<=1)return e;const t=[];let i={...e[0]};for(let r=1;r<e.length;r++){const n=e[r],a=i.recommendedSource===n.recommendedSource,s=(i.heatingKwh!=null?i.heatingKwh>0:!1)==(n.heatingKwh!=null?n.heatingKwh>0:!1),l=i.end===n.start;a&&s&&l?i={...i,end:n.end}:(t.push(i),i={...n})}return t.push(i),t}function Va(e,t,i){let r=null,n=-1/0;for(const a of t){const s=Date.parse(a.start);if(!isFinite(s))continue;const l=a.end!==null?Date.parse(a.end):i;isFinite(l)&&s<=e&&e<=l&&s>n&&(n=s,r=a)}return r}function Wa(e,t){const i=Date.parse(e.start),r=e.end!==null?Date.parse(e.end):t;if(!isFinite(i)||!isFinite(r))return null;const n=(r-i)/36e5;return n<=0||!isFinite(n)||!isFinite(e.energyKwh)||e.energyKwh<0?null:e.energyKwh/n}function kh(e,t,i,r,n){const a=[C("boiler.aria.plan_timeline",n)];a.push(`NOW: ${e}`),t&&a.push(`${C("boiler.config.deadline",n)}: ${t}`),i!=null&&a.push(`${C("boiler.config.goal_temp",n)}: ${i}°C`);const s=[...new Set(r.filter(Boolean))];return s.length>0&&a.push(s.map(l=>Ge(l,n)).join(", ")),a.join(". ")}let st=class extends D{constructor(){super(...arguments),this.data=null,this.config=null,this.lang="cs",this.nowMs=null,this.timeZone=null}render(){try{return this._renderTimeline()}catch{return c`
        <div class="timeline-section">
          <div class="empty-timeline" data-testid="boiler-timeline">${C("boiler.timeline.empty",this.lang)}</div>
        </div>
      `}}_resolveTimeZone(){if(this.timeZone)return this.timeZone;try{return Intl.DateTimeFormat().resolvedOptions().timeZone}catch{return"Europe/Prague"}}_renderTimeline(){var Se;const e=yh(this.nowMs??void 0),t=this._resolveTimeZone();let i;try{i=$h(e,t)}catch{i=e-e%864e5}const r=(e-i)/6e4,n=Ye(r);let a="";try{a=wh(e,t)}catch{a=new Date(e).toISOString()}const s=this.config,l=s!=null&&s.deadlineTime&&s.deadlineTime!=="--:--"?s.deadlineTime:null;let d=null;if(l)try{const[L,re]=l.split(":"),be=parseInt(L,10)*60+parseInt(re,10);d=Ye(be)}catch{d=null}const u=(s==null?void 0:s.targetTempC)!=null&&isFinite(s.targetTempC)?s.targetTempC:60,p=fn(u),h=this.data,b=Array.isArray(h==null?void 0:h.planSlots)?h.planSlots:[],f=Array.isArray(h==null?void 0:h.timeline)?h.timeline:[],m=Array.isArray(h==null?void 0:h.sourceSegments)?h.sourceSegments:[],v=b.length>0&&b.every(L=>(L.heatingKwh??0)===0&&(L.pvKwh??0)===0&&(L.gridKwh??0)===0&&(L.altKwh??0)===0),$=this._buildPlanBands(b,i),w=this._buildTempPointsFromSlots(b,i),x=this._buildTempPointsFromTimeline(f,i),S=w.length>0?w:x,B=this._buildPowerBarsFromSlots(b,i),q=this._buildPowerBars(f,m,i,e),k=$.map(L=>L.source);let V="";try{V=kh(a,l,u,k,this.lang)}catch{V=C("boiler.aria.plan_timeline",this.lang)}const y=S.length>=2?S.map(L=>`${L.x.toFixed(2)},${L.y.toFixed(2)}`).join(" "):null,F=b.reduce((L,re)=>L+(re.gridKwh??0),0),Y=b.reduce((L,re)=>L+(re.pvKwh??0)+(re.altKwh??0),0),W=b.reduce((L,re)=>L+(re.estimatedCostCzk??0),0),K=F+Y,ne=((Se=h==null?void 0:h.status)==null?void 0:Se.degradedFlags)??[],ze=ne.includes("price_degraded"),hi=ne.includes("forecast_degraded"),gi=["00","03","06","09","12","15","18","21","24"];return c`
      <div class="timeline-section">
        <div class="timeline-header">
          <h3>📅 24h plán: teplota, výkon &amp; zdroje</h3>
          ${b.length>0?c`
            <div class="timeline-summary">
              Dnes: <strong>${F.toFixed(1)} kWh</strong> ze sítě
              · <strong style="color:#f5b800">${Y.toFixed(1)} kWh</strong> z FVE/přetoku
              ${W>0?c` · <strong>~${W.toFixed(2)} Kč</strong>`:""}
              ${K>0?c` · spotřeba <strong>~${K.toFixed(1)} kWh</strong>`:""}
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
              viewBox="0 0 ${Ei} ${Ht}"
              role="img"
              aria-label="${V}"
              data-testid="boiler-timeline"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              ${Z`<rect x="0" y="0" width="${Ei}" height="${Ht}" fill="transparent" />`}

              ${$.map(L=>{const re=L.source?An[L.source]??"#9E9E9E":"#9E9E9E",be=L.x2-L.x1;return Z`<rect
                  class="plan-band"
                  data-source="${L.source??"unknown"}"
                  x="${L.x1.toFixed(2)}"
                  y="0"
                  width="${be.toFixed(2)}"
                  height="${Ht}"
                  fill="${re}"
                />`})}

              ${Z`<line x1="0" y1="${qe}" x2="${Ei}" y2="${qe}" stroke="rgba(255,255,255,.08)" stroke-width="1"/>`}

              ${Z`<line
                class="goal-line"
                x1="0" y1="${p.toFixed(2)}"
                x2="${Ei}" y2="${p.toFixed(2)}"
              />`}
              ${Z`<text x="4" y="${(p-3).toFixed(2)}" font-size="8" fill="#4ade80">CÍL ${u}°C</text>`}

              ${d!=null&&l!=null?Z`
                <line class="deadline-marker"
                  data-testid="boiler-deadline-marker"
                  data-deadline-time="${l}"
                  data-deadline-x="${Nt(d)}"
                  x1="${Nt(d)}" y1="0"
                  x2="${Nt(d)}" y2="${Ht}"
                />
                <text x="${(d+3).toFixed(2)}" y="12" font-size="8" fill="#E65100">${l}</text>
              `:""}

              ${B.map(L=>{if(L.isCharge){const re=qe-L.barH;return Z`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    x="${(L.x-2).toFixed(2)}" y="${re.toFixed(2)}" width="4" height="${L.barH.toFixed(2)}"/>`}else return Z`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    x="${(L.x-2).toFixed(2)}" y="${qe}" width="4" height="${L.barH.toFixed(2)}"/>`})}

              ${q.map(L=>{if(L.isCharge){const re=qe-L.barH;return Z`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    data-estimated-power="${L.isEstimated?"true":"false"}"
                    x="${(L.x-2).toFixed(2)}" y="${re.toFixed(2)}" width="4" height="${L.barH.toFixed(2)}"/>`}else return Z`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    data-estimated-power="${L.isEstimated?"true":"false"}"
                    x="${(L.x-2).toFixed(2)}" y="${qe}" width="4" height="${L.barH.toFixed(2)}"/>`})}

              ${f.map(L=>{let re;try{re=Date.parse(L.timestamp)}catch{return""}if(!isFinite(re))return"";const be=(re-i)/6e4;if(be<0||be>wt||L.powerKw!==null)return"";const fi=Va(re,m,e),Fe=fi?Wa(fi,e):null;if(Fe!==null&&Fe>0)return"";const Ve=Ye(be);return Z`<rect
                  class="placeholder-bar"
                  data-testid="boiler-power-placeholder"
                  data-estimated-power="true"
                  x="${(Ve-2).toFixed(2)}" y="99" width="4" height="2"
                />`})}

              ${y!=null?Z`<polyline class="temp-line" points="${y}" />`:""}

              ${Z`<line
                class="now-marker"
                data-testid="boiler-now-marker"
                data-now-time="${a}"
                data-now-x="${Nt(n)}"
                x1="${Nt(n)}" y1="0"
                x2="${Nt(n)}" y2="${Ht}"
              />`}
              ${Z`<text x="${(n+3).toFixed(2)}" y="12" font-size="8" fill="#60a5fa">TEĎ</text>`}
            </svg>
          </div>

          <div class="timeline-axis">
            ${gi.map(L=>c`<span>${L}</span>`)}
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
            ${ze?c`<span class="degraded-chip">⚠ Ceny: stará data</span>`:""}
            ${hi?c`<span class="degraded-chip">⚠ FVE predikce: stará data</span>`:""}
          </div>
        </div>
      </div>
    `}_buildTempPointsFromTimeline(e,t){const i=[],r=t+wt*6e4;for(const n of e)try{if(n.topTempC==null||!isFinite(n.topTempC))continue;const a=Date.parse(n.timestamp);if(!isFinite(a)||a<t||a>r)continue;const s=(a-t)/6e4;i.push({x:Ye(s),y:fn(n.topTempC)})}catch{continue}return i}_buildTempPointsFromSlots(e,t){const i=[],r=t+wt*6e4;for(const n of e)try{const a=n.expectedTempTopC;if(a==null||!isFinite(a))continue;const s=Date.parse(n.start);if(!isFinite(s)||s<t||s>r)continue;const l=(s-t)/6e4;i.push({x:Ye(l),y:fn(a)})}catch{continue}return i}_buildPowerBarsFromSlots(e,t){const i=[],r=t+wt*6e4;for(let n=0;n<e.length;n++){const a=e[n];try{const s=Date.parse(a.start);if(!isFinite(s)||s<t||s>r)continue;const l=(s-t)/6e4,d=Ye(l),u=(a.pvKwh??0)+(a.gridKwh??0)+(a.altKwh??0);if(u<=0)continue;const p=u*4,b=Math.min(p,vt)/vt*qe;i.push({x:d,barH:b,isCharge:!0,isEstimated:!1})}catch{continue}}return i}_buildPlanBands(e,t){if(!e.length)return[];const i=[],r=t+wt*6e4,n=[];for(const s of e)try{const l=Date.parse(s.start),d=Date.parse(s.end);if(!isFinite(l)||!isFinite(d)||d<=t||l>=r)continue;const u=Math.max(l,t),p=Math.min(d,r);if(p<=u)continue;n.push({...s,start:new Date(u).toISOString(),end:new Date(p).toISOString()})}catch{continue}const a=_h(n);for(const s of a)try{const l=Date.parse(s.start),d=Date.parse(s.end);if(!isFinite(l)||!isFinite(d))continue;const u=Ye((l-t)/6e4),p=Ye((d-t)/6e4);if(p<=u)continue;i.push({x1:u,x2:p,source:s.recommendedSource,heating:(s.heatingKwh??0)>0})}catch{continue}return i}_buildPowerBars(e,t,i,r){const n=[],a=i+wt*6e4;for(const s of e)try{const l=Date.parse(s.timestamp);if(!isFinite(l)||l<i||l>a)continue;const d=(l-i)/6e4,u=Ye(d);if(s.powerKw!==null&&isFinite(s.powerKw)){const p=Math.max(-vt,Math.min(vt,s.powerKw));if(Math.abs(p)<.001)continue;const h=Math.abs(p)/vt*qe;n.push({x:u,barH:h,isCharge:p>0,isEstimated:!1})}else{const p=Va(l,t,r);if(p!==null){const h=Wa(p,r);if(h!==null&&h>0){const b=p.key==="discharge",m=Math.min(h,vt)/vt*qe;n.push({x:u,barH:m,isCharge:!b,isEstimated:!0})}}}}catch{continue}return n}};st.styles=M`
    :host {
      display: block;
      font-family: ${hn(o.fontFamily)};
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
      color: ${hn(o.textPrimary)};
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
      color: ${hn(o.textSecondary)};
      font-style: italic;
    }

    @media (max-width: 599px) {
      :host { font-size: 12px; }
    }
  `;ci([g({type:Object})],st.prototype,"data",2);ci([g({type:Object})],st.prototype,"config",2);ci([g({type:String})],st.prototype,"lang",2);ci([g({type:Number})],st.prototype,"nowMs",2);ci([g({type:String})],st.prototype,"timeZone",2);st=ci([E("oig-boiler-timeline-chart")],st);var Sh=Object.defineProperty,Ch=Object.getOwnPropertyDescriptor,ve=(e,t,i,r)=>{for(var n=r>1?void 0:r?Ch(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Sh(t,i,n),n};const yt=G,Wr=M`
  .selector-label {
    font-size: 12px;
    color: ${yt(o.textSecondary)};
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
    border: 2px solid ${yt(o.divider)};
    background: ${yt(o.bgSecondary)};
    color: ${yt(o.textPrimary)};
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .mode-btn:hover:not(:disabled):not(.active) {
    border-color: ${yt(o.accent)};
  }

  .mode-btn.active {
    background: ${yt(o.accent)};
    border-color: ${yt(o.accent)};
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
`;let ii=class extends D{constructor(){super(...arguments),this.value="home_1",this.disabled=!1,this.buttonStates={home_1:"idle",home_2:"idle",home_3:"idle",home_ups:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("mode-change",{detail:{mode:e},bubbles:!0}))}render(){return c`
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
              ${rs[t]}
              ${i==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};ii.styles=[Wr];ve([g({type:String})],ii.prototype,"value",2);ve([g({type:Boolean})],ii.prototype,"disabled",2);ve([g({type:Object})],ii.prototype,"buttonStates",2);ii=ve([E("oig-box-mode-selector")],ii);let ot=class extends D{constructor(){super(...arguments),this.value="off",this.limit=0,this.disabled=!1,this.pendingTarget=null,this.buttonStates={off:"idle",on:"idle",limited:"idle"}}onDeliveryClick(e){const t=this.buttonStates[e];this.disabled||t==="pending"||t==="processing"||t==="disabled-by-service"||t==="active"&&e!=="limited"||this.dispatchEvent(new CustomEvent("delivery-change",{detail:{value:e,limit:e==="limited"?this.limit:null},bubbles:!0}))}render(){const e=[{value:"off",label:Di.off},{value:"on",label:Di.on},{value:"limited",label:Di.limited}],i=this.pendingTarget!==null&&this.pendingTarget!==this.value?c`<span class="status-text transitioning">\u23F3\u00A0${Di[this.pendingTarget]}</span>`:null;return c`
      <div class="selector-label">
        Dod\u00E1vka do s\u00EDt\u011B ${i}
      </div>
      <div class="mode-buttons">
        ${e.map(r=>{const n=this.buttonStates[r.value],a=r.value===this.value,s=r.value===this.pendingTarget&&!a,l=this.disabled||n==="pending"||n==="processing"||n==="disabled-by-service",d=a&&n==="disabled-by-service"?"active disabled-by-service":s?`${n} pending-target`:n;return c`
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
    `}};ot.styles=[Wr,M`
      .mode-btn.pending-target {
        border-color: #ffc107;
        color: #ffc107;
        background: rgba(255, 193, 7, 0.08);
      }
    `];ve([g({type:String})],ot.prototype,"value",2);ve([g({type:Number})],ot.prototype,"limit",2);ve([g({type:Boolean})],ot.prototype,"disabled",2);ve([g({type:String})],ot.prototype,"pendingTarget",2);ve([g({type:Object})],ot.prototype,"buttonStates",2);ot=ve([E("oig-grid-delivery-selector")],ot);let ri=class extends D{constructor(){super(...arguments),this.value="cbb",this.disabled=!1,this.buttonStates={cbb:"idle",manual:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("boiler-mode-change",{detail:{mode:e},bubbles:!0}))}render(){return c`
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
              ${as[t]} ${ns[t]}
              ${i==="pending"?c`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?c`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};ri.styles=[Wr];ve([g({type:String})],ri.prototype,"value",2);ve([g({type:Boolean})],ri.prototype,"disabled",2);ve([g({type:Object})],ri.prototype,"buttonStates",2);ri=ve([E("oig-boiler-mode-selector")],ri);let lt=class extends D{constructor(){super(...arguments),this.homeGridV=!1,this.homeGridVi=!1,this.flexibilita=!1,this.available=!1,this.disabled=!1}getButtonClass(e){return e&&this.disabled?"active disabled-by-service":e?"active":this.disabled?"disabled-by-service":"idle"}onToggleClick(e){this.disabled||this.dispatchEvent(new CustomEvent("supplementary-toggle",{detail:{key:e},bubbles:!0}))}render(){const e=this.getButtonClass(this.homeGridV),t=this.getButtonClass(this.homeGridVi),i=this.flexibilita?c`<span class="flexibilita-badge">\u26A1 Flexibilita</span>`:"";return c`
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
    `}};lt.styles=[Wr,M`
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
    `];ve([g({type:Boolean})],lt.prototype,"homeGridV",2);ve([g({type:Boolean})],lt.prototype,"homeGridVi",2);ve([g({type:Boolean})],lt.prototype,"flexibilita",2);ve([g({type:Boolean})],lt.prototype,"available",2);ve([g({type:Boolean})],lt.prototype,"disabled",2);lt=ve([E("oig-supplementary-selector")],lt);function Th(e){const t=!e.available||e.flexibilita;return e.available?{home_grid_v:e.home_grid_v,home_grid_vi:e.home_grid_vi,flexibilita:e.flexibilita,available:e.available,disabled:t}:{home_grid_v:!1,home_grid_vi:!1,flexibilita:e.flexibilita,available:!1,disabled:!0}}var Ph=Object.defineProperty,Mh=Object.getOwnPropertyDescriptor,di=(e,t,i,r)=>{for(var n=r>1?void 0:r?Mh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Ph(t,i,n),n};const Te=G;let ct=class extends D{constructor(){super(...arguments),this.items=[],this.expanded=!1,this.shieldStatus="idle",this.queueCount=0,this._now=Date.now(),this.updateInterval=null}connectedCallback(){super.connectedCallback(),this.updateInterval=window.setInterval(()=>{this._now=Date.now()},1e3)}disconnectedCallback(){super.disconnectedCallback(),this.updateInterval!==null&&clearInterval(this.updateInterval)}toggleExpanded(){this.expanded=!this.expanded}removeItem(e,t){t.stopPropagation(),this.dispatchEvent(new CustomEvent("remove-item",{detail:{position:e},bubbles:!0}))}formatServiceName(e,t){return t==="supplementary_toggle"?"⚙️ Změna doplňkového režimu":el[e]||e||"N/A"}stripCurrentSuffix(e){const i=e.indexOf("(nyní:");return i===-1?e.trim():e.slice(0,i).trim()}formatChanges(e){return!e||e.length===0?"N/A":e.map(t=>{const i=t.indexOf("→");if(i===-1)return t;const r=t.slice(0,i).trim(),n=t.slice(i+1).trim(),a=r.indexOf(":"),s=a===-1?r:r.slice(a+1),l=r.includes("prm2_app")?ss:tl,d=s.replaceAll("'","").trim(),u=this.stripCurrentSuffix(n).replaceAll("'","").trim(),p=l[d]||d,h=l[u]||u;return`${p} → ${h}`}).join(", ")}formatTimestamp(e){if(!e)return{time:"--",duration:"--"};try{const t=new Date(e);if(isNaN(t.getTime()))return{time:"--",duration:"--"};const i=new Date(this._now),r=Math.floor((i.getTime()-t.getTime())/1e3),n=String(t.getHours()).padStart(2,"0"),a=String(t.getMinutes()).padStart(2,"0");let s=`${n}:${a}`;if(t.toDateString()!==i.toDateString()){const d=t.getDate(),u=t.getMonth()+1;s=`${d}.${u}. ${s}`}let l;if(r<60)l=`${r}s`;else if(r<3600){const d=Math.floor(r/60),u=r%60;l=`${d}m ${u}s`}else{const d=Math.floor(r/3600),u=Math.floor(r%3600/60);l=`${d}h ${u}m`}return{time:s,duration:l}}catch{return{time:"--",duration:"--"}}}get activeCount(){return this.items.length}render(){this._now;const e=this.shieldStatus==="running"?"running":"idle",t=this.shieldStatus==="running"?"🔄 Zpracovává":"✓ Připraveno";return c`
      <div class="queue-header" @click=${this.toggleExpanded}>
        <div class="queue-title-area">
          <span class="queue-title">Shield fronta</span>
          ${this.activeCount>0?c`
            <span class="queue-count">(${this.activeCount} aktivn\u00EDch)</span>
          `:O}
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
      `:O}
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
    `}};ct.styles=M`
    :host {
      display: block;
      background: ${Te(o.cardBg)};
      border-radius: 12px;
      box-shadow: ${Te(o.cardShadow)};
      overflow: hidden;
    }

    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: ${Te(o.bgSecondary)};
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
      color: ${Te(o.textPrimary)};
    }

    .queue-count {
      font-size: 12px;
      color: ${Te(o.textSecondary)};
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
      color: ${Te(o.accent)};
      transition: transform 0.2s;
    }

    .queue-toggle.expanded {
      transform: rotate(180deg);
    }

    .queue-content {
      padding: 0;
      border-top: 1px solid ${Te(o.divider)};
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
      color: ${Te(o.textSecondary)};
      border-bottom: 1px solid ${Te(o.divider)};
      background: ${Te(o.bgSecondary)};
    }

    .queue-table td {
      padding: 8px 12px;
      color: ${Te(o.textPrimary)};
      border-bottom: 1px solid ${Te(o.divider)};
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
      color: ${Te(o.textSecondary)};
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
  `;di([g({type:Array})],ct.prototype,"items",2);di([g({type:Boolean})],ct.prototype,"expanded",2);di([g({type:String})],ct.prototype,"shieldStatus",2);di([g({type:Number})],ct.prototype,"queueCount",2);di([P()],ct.prototype,"_now",2);ct=di([E("oig-shield-queue")],ct);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Dh={CHILD:2},Eh=e=>(...t)=>({_$litDirective$:e,values:t});class Oh{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,r){this._$Ct=t,this._$AM=i,this._$Ci=r}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Dn extends Oh{constructor(t){if(super(t),this.it=O,t.type!==Dh.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===O||t==null)return this._t=void 0,this.it=t;if(t===Co)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}}Dn.directiveName="unsafeHTML",Dn.resultType=1;const zh=Eh(Dn);var Ah=Object.defineProperty,Lh=Object.getOwnPropertyDescriptor,ar=(e,t,i,r)=>{for(var n=r>1?void 0:r?Lh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Ah(t,i,n),n};const ye=G;let Pt=class extends D{constructor(){super(...arguments),this.open=!1,this.config={title:"",message:""},this.acknowledged=!1,this.limitValue=5e3,this.resolver=null,this.onOverlayClick=()=>{this.closeDialog({confirmed:!1})},this.onDialogClick=e=>{e.stopPropagation()},this.onKeyDown=e=>{e.key==="Escape"&&this.open&&this.closeDialog({confirmed:!1})},this.onAckChange=e=>{this.acknowledged=e.target.checked},this.onLimitInput=e=>{this.limitValue=parseInt(e.target.value,10)||0},this.onCancel=()=>{this.closeDialog({confirmed:!1})},this.onConfirm=()=>{const e=this.config.showLimitInput||this.config.limitOnly;if(e){const t=this.config.limitMin??1,i=this.config.limitMax??2e4;if(isNaN(this.limitValue)||this.limitValue<t||this.limitValue>i)return}this.closeDialog({confirmed:!0,limit:e?this.limitValue:void 0})}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeyDown)}showDialog(e){return this.config=e,this.acknowledged=!1,this.limitValue=e.limitValue??5e3,this.open=!0,new Promise(t=>{this.resolver=t})}closeDialog(e){var t;this.open=!1,(t=this.resolver)==null||t.call(this,e),this.resolver=null}get canConfirm(){return!(this.config.requireAcknowledgement&&!this.acknowledged)}render(){if(!this.open)return O;const e=this.config;return e.limitOnly?c`
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
          `:O}

          ${e.warning?c`
            <div class="dialog-warning">
              \u26A0\uFE0F ${this.renderHTML(e.warning)}
            </div>
          `:O}

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
          `:O}

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
    `}renderHTML(e){return zh(e)}};Pt.styles=M`
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
  `;ar([g({type:Boolean,reflect:!0})],Pt.prototype,"open",2);ar([g({type:Object})],Pt.prototype,"config",2);ar([P()],Pt.prototype,"acknowledged",2);ar([P()],Pt.prototype,"limitValue",2);Pt=ar([E("oig-confirm-dialog")],Pt);var Ih=Object.defineProperty,Fh=Object.getOwnPropertyDescriptor,Vs=(e,t,i,r)=>{for(var n=r>1?void 0:r?Fh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Ih(t,i,n),n};const Pi=G;let Or=class extends D{constructor(){super(...arguments),this.shieldState=null}render(){if(!this.shieldState)return O;const e=this.determineStatus(this.shieldState),t=e.toLowerCase(),i=this.getStatusIcon(e),r=this.getStatusLabel(e),a=this.shieldState.queueCount>0?"has-items":"";return c`
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
    `}determineStatus(e){return e.status==="running"?"processing":e.queueCount>0?"pending":"idle"}getStatusIcon(e){switch(e){case"idle":return"✓";case"pending":return"⏳";case"processing":return"🔄";default:return"✓"}}getStatusLabel(e){switch(e){case"idle":return"Připraveno";case"pending":return"Čeká";case"processing":return"Zpracovává";default:return"Neznámý"}}getActivityText(){return this.shieldState?this.shieldState.activity?this.shieldState.activity:this.shieldState.queueCount>0?`${this.shieldState.queueCount} operací ve frontě`:"Systém připraven":"Žádná aktivita"}};Or.styles=M`
    :host {
      display: block;
      padding: 16px 20px;
      border-top: 1px solid ${Pi(o.divider)};
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
      color: ${Pi(o.textPrimary)};
    }

    .shield-status-subtitle {
      font-size: 11px;
      color: ${Pi(o.textSecondary)};
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
      background: ${Pi(o.bgSecondary)};
      color: ${Pi(o.textSecondary)};
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
  `;Vs([g({type:Object})],Or.prototype,"shieldState",2);Or=Vs([E("oig-shield-status")],Or);var Bh=Object.defineProperty,Nh=Object.getOwnPropertyDescriptor,Wn=(e,t,i,r)=>{for(var n=r>1?void 0:r?Nh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Bh(t,i,n),n};const Rt=G;let Ki=class extends D{constructor(){super(...arguments),this.shieldState={...os,pendingServices:new Map,changingServices:new Set},this._confirmDialogOverride=null,this.unsubscribe=null,this.onShieldUpdate=e=>{this.shieldState=e}}get confirmDialog(){return this._confirmDialogOverride??this._confirmDialogQuery}set confirmDialog(e){this._confirmDialogOverride=e}connectedCallback(){super.connectedCallback(),this.unsubscribe=te.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.unsubscribe)==null||e.call(this),this.unsubscribe=null}get boxModeButtonStates(){return{home_1:te.getBoxModeButtonState("home_1"),home_2:te.getBoxModeButtonState("home_2"),home_3:te.getBoxModeButtonState("home_3"),home_ups:te.getBoxModeButtonState("home_ups")}}get gridDeliveryButtonStates(){return{off:te.getGridDeliveryButtonState("off"),on:te.getGridDeliveryButtonState("on"),limited:te.getGridDeliveryButtonState("limited")}}get boilerModeButtonStates(){return{cbb:te.getBoilerModeButtonState("cbb"),manual:te.getBoilerModeButtonState("manual")}}get supplementaryView(){return Th(this.shieldState.supplementary)}async onBoxModeChange(e){const{mode:t}=e.detail,i=rs[t];if(_.debug("Control panel: box mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu střídače",message:`Chystáte se změnit režim boxu na <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování celého systému a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!te.shouldProceedWithQueue())return;await te.setBoxMode(t)||_.warn("Box mode change failed or already active",{mode:t})}async onGridDeliveryChange(e){const{value:t,limit:i}=e.detail,r=Di[t],n=Jo[t],a=t==="limited",s=this.shieldState.gridDeliveryState.currentLiveLimit??5e3;_.debug("Control panel: grid delivery change requested",{delivery:t,limit:i});const l=this.shieldState.gridDeliveryState.currentLiveDelivery;if(!this.shieldState.gridDeliveryState.isTransitioning&&l==="limited"&&t==="limited"){const f={title:"🚰 Změnit limit přetoků",message:"",limitOnly:!0,showLimitInput:!0,limitValue:s,limitMin:1,limitMax:2e4,limitStep:100,confirmText:"Uložit limit",cancelText:"Zrušit"},m=await this.confirmDialog.showDialog(f);if(!m.confirmed||!te.shouldProceedWithQueue())return;await te.setGridDelivery("limited",m.limit);return}const u={title:`${n} Změna dodávky do sítě`,message:`Chystáte se změnit dodávku do sítě na: <strong>"${r}"</strong>`,warning:a?"Režim a limit budou změněny postupně (serializováno). Každá změna může trvat až 10 minut.":"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,acknowledgementText:"<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost. Aplikace nenese odpovědnost za případné negativní důsledky této změny.",confirmText:"Potvrdit změnu",cancelText:"Zrušit",showLimitInput:a,limitValue:s,limitMin:1,limitMax:2e4,limitStep:100},p=await this.confirmDialog.showDialog(u);if(!p.confirmed||!te.shouldProceedWithQueue())return;const h=this.shieldState.gridDeliveryState.currentLiveDelivery==="limited",b=t==="limited";h&&b&&p.limit!=null?await te.setGridDelivery(t,p.limit):b&&p.limit!=null?await te.setGridDelivery(t,p.limit):await te.setGridDelivery(t)}async onBoilerModeChange(e){const{mode:t}=e.detail,i=ns[t],r=as[t];if(_.debug("Control panel: boiler mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu bojleru",message:`Chystáte se změnit režim bojleru na <strong>"${r} ${i}"</strong>.<br><br>Tato změna ovlivní chování ohřevu vody a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!te.shouldProceedWithQueue())return;await te.setBoilerMode(t)||_.warn("Boiler mode change failed or already active",{mode:t})}async onSupplementaryToggle(e){const{key:t}=e.detail,i=t==="home_grid_v"?"Home 5":"Home 6",r=!this.shieldState.supplementary[t];if(_.debug("Control panel: supplementary toggle requested",{key:t}),!(await this.confirmDialog.showDialog({title:"Změna doplňkového režimu",message:`Chystáte se přepnout <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování systému a může trvat až 10 minut.`,warning:"Změna může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!te.shouldProceedWithQueue())return;await te.setSupplementaryToggle(t,r)||_.warn("Supplementary toggle failed",{key:t})}async onQueueRemoveItem(e){const{position:t}=e.detail;_.debug("Control panel: queue remove requested",{position:t});const i=this.shieldState.allRequests.find(s=>s.position===t);let r="Operace";if(i&&(i.service.includes("set_box_mode")?r=`Změna režimu na ${i.targetValue||"neznámý"}`:i.service.includes("set_grid_delivery")?r=`Změna dodávky do sítě na ${i.targetValue||"neznámý"}`:i.service.includes("set_boiler_mode")&&(r=`Změna režimu bojleru na ${i.targetValue||"neznámý"}`)),!(await this.confirmDialog.showDialog({title:r,message:"Operace bude odstraněna z fronty bez provedení.",requireAcknowledgement:!1,confirmText:"OK",cancelText:"Zrušit"})).confirmed)return;await te.removeFromQueue(t)||_.warn("Failed to remove from queue",{position:t})}render(){const e=this.shieldState,t=e.status==="running"?"running":"idle",i=e.status==="running"?"Zpracovává":"Připraveno",r=e.allRequests.length>0;return c`
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
        `:O}
      </div>

      <!-- Shared confirm dialog instance -->
      <oig-confirm-dialog></oig-confirm-dialog>
    `}};Ki.styles=M`
    :host {
      display: block;
      margin-top: 16px;
    }

    .control-panel {
      background: ${Rt(o.cardBg)};
      border-radius: 16px;
      box-shadow: ${Rt(o.cardShadow)};
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid ${Rt(o.divider)};
    }

    .panel-title {
      font-size: 15px;
      font-weight: 600;
      color: ${Rt(o.textPrimary)};
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
      background: ${Rt(o.divider)};
      margin: 16px 0;
    }

    .queue-section {
      border-top: 1px solid ${Rt(o.divider)};
    }

    @media (max-width: 480px) {
      .panel-body {
        padding: 12px 14px;
      }
    }
  `;Wn([P()],Ki.prototype,"shieldState",2);Wn([Br("oig-confirm-dialog")],Ki.prototype,"_confirmDialogQuery",2);Ki=Wn([E("oig-control-panel")],Ki);var Rh=Object.defineProperty,jh=Object.getOwnPropertyDescriptor,ui=(e,t,i,r)=>{for(var n=r>1?void 0:r?jh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Rh(t,i,n),n};const we=G;let dt=class extends D{constructor(){super(...arguments),this.open=!1,this.currentSoc=0,this.maxSoc=100,this.estimate=null,this.targetSoc=80}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onSliderInput(e){this.targetSoc=parseInt(e.target.value,10),this.dispatchEvent(new CustomEvent("soc-change",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}onConfirm(){this.dispatchEvent(new CustomEvent("confirm",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}render(){return c`
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
    `}};dt.styles=M`
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
      background: ${we(o.cardBg)};
      border-radius: 16px;
      padding: 24px;
      min-width: 320px;
      max-width: 90vw;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${we(o.textPrimary)};
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
      color: ${we(o.textSecondary)};
    }

    .soc-value {
      font-size: 24px;
      font-weight: 600;
      color: ${we(o.textPrimary)};
    }

    .soc-arrow {
      font-size: 20px;
      color: ${we(o.textSecondary)};
    }

    .slider-container {
      margin: 16px 0;
    }

    .slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: ${we(o.bgSecondary)};
      -webkit-appearance: none;
      appearance: none;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${we(o.accent)};
      cursor: pointer;
    }

    .estimate {
      background: ${we(o.bgSecondary)};
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
      color: ${we(o.textSecondary)};
    }

    .estimate-value {
      color: ${we(o.textPrimary)};
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
      background: ${we(o.bgSecondary)};
      color: ${we(o.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${we(o.divider)};
    }

    .btn-confirm {
      background: ${we(o.accent)};
      color: #fff;
    }

    .btn-confirm:hover {
      opacity: 0.9;
    }
  `;ui([g({type:Boolean})],dt.prototype,"open",2);ui([g({type:Number})],dt.prototype,"currentSoc",2);ui([g({type:Number})],dt.prototype,"maxSoc",2);ui([g({type:Object})],dt.prototype,"estimate",2);ui([P()],dt.prototype,"targetSoc",2);dt=ui([E("oig-battery-charge-dialog")],dt);var Hh=Object.defineProperty,Vh=Object.getOwnPropertyDescriptor,Ie=(e,t,i,r)=>{for(var n=r>1?void 0:r?Vh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Hh(t,i,n),n};const mn=G,qn=M`
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
`;let Ui=class extends D{constructor(){super(...arguments),this.title="",this.icon="📊"}render(){return c`
      <div class="block-header">
        <span class="block-icon">${this.icon}</span>
        <span class="block-title">${this.title}</span>
      </div>
      <slot></slot>
    `}};Ui.styles=M`
    :host {
      display: block;
      background: ${mn(o.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${mn(o.cardShadow)};
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
      color: ${mn(o.textPrimary)};
    }

    ${qn}
  `;Ie([g({type:String})],Ui.prototype,"title",2);Ie([g({type:String})],Ui.prototype,"icon",2);Ui=Ie([E("oig-analytics-block")],Ui);let zr=class extends D{constructor(){super(...arguments),this.data=null}render(){if(!this.data)return c`<div>Načítání...</div>`;const e=this.data.trend>=0?"positive":"negative",t=this.data.trend>=0?"+":"",i=this.data.period==="last_month"?"Minulý měsíc":`Aktuální měsíc (${this.data.currentMonthDays} dní)`;return c`
      <div class="efficiency-value">${Kt(this.data.efficiency,1)}</div>
      <div class="period-label">${i}</div>

      ${this.data.trend!==0?c`
        <div class="comparison ${e}">
          ${t}${Kt(this.data.trend)} vs minulý měsíc
        </div>
      `:null}

      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${Yt(this.data.charged)}</div>
          <div class="stat-label">Nabito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${Yt(this.data.discharged)}</div>
          <div class="stat-label">Vybito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${Yt(this.data.losses)}</div>
          <div class="stat-label">Ztráty</div>
          ${this.data.lossesPct?c`
            <div class="losses-pct">${Kt(this.data.lossesPct,1)}</div>
          `:null}
        </div>
      </div>
    `}};zr.styles=M`
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
  `;Ie([g({type:Object})],zr.prototype,"data",2);zr=Ie([E("oig-battery-efficiency")],zr);let Ar=class extends D{constructor(){super(...arguments),this.data=null}renderSparkline(){var d;const e=(d=this.data)==null?void 0:d.measurementHistory;if(!e||e.length<2)return null;const t=e.map(u=>u.soh_percent),i=Math.min(...t)-1,n=Math.max(...t)+1-i||1,a=200,s=40,l=t.map((u,p)=>{const h=p/(t.length-1)*a,b=s-(u-i)/n*s;return`${h},${b}`}).join(" ");return c`
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
          <span class="metric-value">${Kt(this.data.soh,1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Kapacita (P80)</span>
          <span class="metric-value">${Yt(this.data.capacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Min. kapacita (P20)</span>
          <span class="metric-value">${Yt(this.data.minCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Nominální kapacita</span>
          <span class="metric-value">${Yt(this.data.nominalCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Počet měření</span>
          <span class="metric-value">${this.data.measurementCount}</span>
        </div>
        ${this.data.qualityScore!=null?c`
          <div class="metric">
            <span class="metric-label">Kvalita dat</span>
            <span class="metric-value">${Kt(this.data.qualityScore,0)}</span>
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
                Spolehlivost: <span class="prediction-value">${Kt(this.data.trendConfidence,0)}</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:c`<div>Načítání...</div>`}};Ar.styles=M`
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

    ${qn}

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
  `;Ie([g({type:Object})],Ar.prototype,"data",2);Ar=Ie([E("oig-battery-health")],Ar);let Lr=class extends D{constructor(){super(...arguments),this.data=null}getProgressClass(e){return e==null?"ok":e>=95?"overdue":e>=80?"due-soon":"ok"}render(){return this.data?c`
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
          <span class="metric-value">${oe(this.data.cost)}</span>
        </div>
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
    `:c`<div>Načítání...</div>`}};Lr.styles=M`
    :host { display: block; }
    ${qn}

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
  `;Ie([g({type:Object})],Lr.prototype,"data",2);Lr=Ie([E("oig-battery-balancing")],Lr);let Ir=class extends D{constructor(){super(...arguments),this.data=null}render(){return this.data?c`
      <oig-analytics-block title="Porovnání nákladů" icon="💰">
        <div class="cost-row">
          <span class="cost-label">Skutečné náklady</span>
          <span class="cost-value">${oe(this.data.actualSpent)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Plán celkem</span>
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
    `:c`<div>Načítání...</div>`}};Ir.styles=M`
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
  `;Ie([g({type:Object})],Ir.prototype,"data",2);Ir=Ie([E("oig-cost-comparison")],Ir);var Wh=Object.defineProperty,qh=Object.getOwnPropertyDescriptor,pi=(e,t,i,r)=>{for(var n=r>1?void 0:r?qh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Wh(t,i,n),n};const Vt=G;let Gi=class extends D{constructor(){super(...arguments),this.data=Ai,this.compact=!1,this.onClick=()=>{this.dispatchEvent(new CustomEvent("badge-click",{bubbles:!0}))}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.onClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.onClick)}render(){const e=this.data.effectiveSeverity,t=vr[e]??vr[0],i=this.data.warningsCount>0&&e>0,r=i?fs(this.data.eventType):"✓";return c`
      <style>
        :host { background: ${Vt(t)}; }
      </style>
      <span class="badge-icon">${r}</span>
      ${i?c`
        <span class="badge-count">${this.data.warningsCount}</span>
      `:null}
      <span class="badge-label">${i?ms[e]??"Výstraha":"OK"}</span>
    `}};Gi.styles=M`
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
  `;pi([g({type:Object})],Gi.prototype,"data",2);pi([g({type:Boolean})],Gi.prototype,"compact",2);Gi=pi([E("oig-chmu-badge")],Gi);let Zi=class extends D{constructor(){super(...arguments),this.open=!1,this.data=Ai}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}formatTime(e){return e?new Date(e).toLocaleString("cs-CZ"):"—"}renderWarning(e){const t=vr[e.severity]??vr[2],i=fs(e.event_type),r=ms[e.severity]??"Neznámá";return c`
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
    `}};Zi.styles=M`
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
      background: ${Vt(o.cardBg)};
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
      color: ${Vt(o.textPrimary)};
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      font-size: 20px;
      cursor: pointer;
      color: ${Vt(o.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${Vt(o.bgSecondary)};
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
      color: ${Vt(o.textSecondary)};
    }

    .eta-badge {
      display: inline-block;
      font-size: 10px;
      padding: 1px 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      margin-left: 6px;
    }
  `;pi([g({type:Boolean,reflect:!0})],Zi.prototype,"open",2);pi([g({type:Object})],Zi.prototype,"data",2);Zi=pi([E("oig-chmu-modal")],Zi);var Yh=Object.defineProperty,Kh=Object.getOwnPropertyDescriptor,Xe=(e,t,i,r)=>{for(var n=r>1?void 0:r?Kh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Yh(t,i,n),n};const H=G;function Uh(e,t,i,r){const n=Math.abs(e);return n===1?t:n>=2&&n<=4?i:r}function Ws(e){return`${e} ${Uh(e,"blok","bloky","bloků")}`}function qs(e){return`${e} přepnutí`}let Mt=class extends D{constructor(){super(...arguments),this.open=!1,this.activeTab="today",this.data=null,this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.open&&this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return bs[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return c`
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
    `}render(){const e=["yesterday","today","tomorrow","history","detail"];return c`
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
              ${vs[t]}
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
      <!-- Adherence bar -->
      ${t.overallAdherence>0?c`
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
        ${this.renderMetricTile("Náklady",t.metrics.cost)}
        ${this.renderMetricTile("Solár",t.metrics.solar)}
        ${this.renderMetricTile("Spotřeba",t.metrics.consumption)}
        ${this.renderMetricTile("Síť",t.metrics.grid)}
      </div>

      <!-- Mode blocks timeline -->
      ${e.modeBlocks.length>0?c`
        <div class="modes-section">
          <div class="section-title">Režimy (${Ws(e.modeBlocks.length)}, ${qs(t.modeSwitches)})</div>
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
    `}};Mt.styles=M`
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
      background: ${H(o.cardBg)};
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
      border-bottom: 1px solid ${H(o.divider)};
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${H(o.textPrimary)};
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
      color: ${H(o.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${H(o.bgSecondary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${H(o.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${H(o.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 12px 16px;
      border: none;
      background: transparent;
      font-size: 13px;
      color: ${H(o.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${H(o.textPrimary)};
    }

    .tab.active {
      color: ${H(o.accent)};
      border-bottom-color: ${H(o.accent)};
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
      color: ${H(o.textSecondary)};
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
      background: ${H(o.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
    }

    .metric-label {
      font-size: 11px;
      color: ${H(o.textSecondary)};
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
      color: ${H(o.textPrimary)};
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
      color: ${H(o.textPrimary)};
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
      color: ${H(o.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${H(o.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${H(o.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 12px;
      color: ${H(o.textSecondary)};
    }

    .eod-value {
      font-size: 16px;
      font-weight: 600;
      color: ${H(o.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: ${H(o.textSecondary)};
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
  `;Xe([g({type:Boolean,reflect:!0})],Mt.prototype,"open",2);Xe([g({type:String})],Mt.prototype,"activeTab",2);Xe([g({type:Object})],Mt.prototype,"data",2);Xe([P()],Mt.prototype,"autoRefresh",2);Mt=Xe([E("oig-timeline-dialog")],Mt);let ni=class extends D{constructor(){super(...arguments),this.data=null,this.activeTab="today",this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return bs[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return c`
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
    `}render(){const e=["yesterday","today","tomorrow","history","detail"];return c`
      <div class="tile">
        <div class="tile-header">
          <span class="tile-title">📅 Plán režimů</span>
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
              ${vs[t]}
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
      <!-- Adherence bar -->
      ${t.overallAdherence>0?c`
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
        ${this.renderMetricTile("Náklady",t.metrics.cost)}
        ${this.renderMetricTile("Solár",t.metrics.solar)}
        ${this.renderMetricTile("Spotřeba",t.metrics.consumption)}
        ${this.renderMetricTile("Síť",t.metrics.grid)}
      </div>

      <!-- Mode blocks timeline -->
      ${e.modeBlocks.length>0?c`
        <div class="modes-section">
          <div class="section-title">Režimy (${Ws(e.modeBlocks.length)}, ${qs(t.modeSwitches)})</div>
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
    `}};ni.styles=M`
    :host {
      display: block;
    }

    .tile {
      background: ${H(o.cardBg)};
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
      border-bottom: 1px solid ${H(o.divider)};
    }

    .tile-title {
      font-size: 13px;
      font-weight: 600;
      color: ${H(o.textPrimary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${H(o.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${H(o.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 6px 10px;
      border: none;
      background: transparent;
      font-size: 11px;
      color: ${H(o.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${H(o.textPrimary)};
    }

    .tab.active {
      color: ${H(o.accent)};
      border-bottom-color: ${H(o.accent)};
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
      color: ${H(o.textSecondary)};
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
      background: ${H(o.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
    }

    .metric-label {
      font-size: 10px;
      color: ${H(o.textSecondary)};
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
      color: ${H(o.textPrimary)};
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
      color: ${H(o.textPrimary)};
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
      padding: 8px 8px;
      border-radius: 8px;
      font-size: 10px;
      color: #fff;
      min-width: 56px;
      min-height: 54px;
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
      color: ${H(o.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${H(o.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${H(o.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${H(o.textSecondary)};
    }

    .eod-value {
      font-size: 14px;
      font-weight: 600;
      color: ${H(o.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 24px 16px;
      color: ${H(o.textSecondary)};
      font-size: 12px;
    }
  `;Xe([g({type:Object})],ni.prototype,"data",2);Xe([g({type:String})],ni.prototype,"activeTab",2);Xe([P()],ni.prototype,"autoRefresh",2);ni=Xe([E("oig-timeline-tile")],ni);var Gh=Object.defineProperty,Zh=Object.getOwnPropertyDescriptor,pt=(e,t,i,r)=>{for(var n=r>1?void 0:r?Zh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Gh(t,i,n),n};const de=G;let ai=class extends D{constructor(){super(...arguments),this.data=null,this.editMode=!1,this.tileType="entity"}onTileClick(){var t;if(this.editMode)return;const e=(t=this.data)==null?void 0:t.config;e&&(e.type==="button"&&e.action?fc(e.entity_id,e.action):ie.openEntityDialog(e.entity_id))}onSupportClick(e,t){e.stopPropagation(),!this.editMode&&ie.openEntityDialog(t)}onEdit(){var e;this.dispatchEvent(new CustomEvent("edit-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}onDelete(){var e;this.dispatchEvent(new CustomEvent("delete-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}render(){var d,u;if(!this.data)return null;const e=this.data.config,t=e.type==="button";this.tileType!==e.type&&(this.tileType=e.type??"entity");const i=e.color||"",r=e.icon||(t?"⚡":"📊"),n=r.startsWith("mdi:")?yr(r):r,a=(d=e.support_entities)==null?void 0:d.top_right,s=(u=e.support_entities)==null?void 0:u.bottom_right,l=this.data.supportValues.topRight||this.data.supportValues.bottomRight;return c`
      ${i?c`<style>:host { --tile-color: ${de(i)}; }</style>`:null}

      <div class="tile-top" @click=${this.onTileClick} title=${this.editMode?"":e.entity_id}>
        <span class="tile-icon">${n}</span>
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
    `}};ai.styles=M`
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
  `;pt([g({type:Object})],ai.prototype,"data",2);pt([g({type:Boolean})],ai.prototype,"editMode",2);pt([g({type:String,reflect:!0})],ai.prototype,"tileType",2);ai=pt([E("oig-tile")],ai);let si=class extends D{constructor(){super(...arguments),this.tiles=[],this.editMode=!1,this.position="left"}render(){return this.tiles.length===0?c`<div class="empty-state">Žádné dlaždice</div>`:c`
      ${this.tiles.map(e=>c`
        <oig-tile
          .data=${e}
          .editMode=${this.editMode}
          .tileType=${e.config.type??"entity"}
          class="${e.isZero?"inactive":""}"
        ></oig-tile>
      `)}
    `}};si.styles=M`
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
  `;pt([g({type:Array})],si.prototype,"tiles",2);pt([g({type:Boolean})],si.prototype,"editMode",2);pt([g({type:String,reflect:!0})],si.prototype,"position",2);si=pt([E("oig-tiles-container")],si);var Qh=Object.defineProperty,Xh=Object.getOwnPropertyDescriptor,Yn=(e,t,i,r)=>{for(var n=r>1?void 0:r?Xh(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Qh(t,i,n),n};const ae=G,qa={Spotrebice:["fridge","fridge-outline","dishwasher","washing-machine","tumble-dryer","stove","microwave","coffee-maker","kettle","toaster","blender","food-processor","rice-cooker","slow-cooker","pressure-cooker","air-fryer","oven","range-hood"],Osvetleni:["lightbulb","lightbulb-outline","lamp","ceiling-light","floor-lamp","led-strip","led-strip-variant","wall-sconce","chandelier","desk-lamp","spotlight","light-switch"],"Vytapeni & Chlazeni":["thermometer","thermostat","radiator","radiator-disabled","heat-pump","air-conditioner","fan","hvac","fire","snowflake","fireplace","heating-coil"],"Energie & Baterie":["lightning-bolt","flash","battery","battery-charging","battery-50","battery-10","solar-panel","solar-power","meter-electric","power-plug","power-socket","ev-plug","transmission-tower","current-ac","current-dc"],"Auto & Doprava":["car","car-electric","car-battery","ev-station","ev-plug-type2","garage","garage-open","motorcycle","bicycle","scooter","bus","train","airplane"],Zabezpeceni:["door","door-open","lock","lock-open","shield-home","cctv","camera","motion-sensor","alarm-light","bell","eye","key","fingerprint","shield-check"],"Okna & Stineni":["window-closed","window-open","blinds","blinds-open","curtains","roller-shade","window-shutter","balcony","door-sliding"],"Media & Zabava":["television","speaker","speaker-wireless","music","volume-high","cast","chromecast","radio","headphones","microphone","gamepad","movie","spotify"],"Sit & IT":["router-wireless","wifi","access-point","lan","network","home-assistant","server","nas","cloud","ethernet","bluetooth","cellphone","tablet","laptop"],"Voda & Koupelna":["water","water-percent","water-boiler","water-pump","shower","toilet","faucet","pipe","bathtub","sink","water-heater","pool"],Pocasi:["weather-sunny","weather-cloudy","weather-night","weather-rainy","weather-snowy","weather-windy","weather-fog","weather-lightning","weather-hail","temperature","humidity","barometer"],"Ventilace & Kvalita vzduchu":["fan","air-filter","air-purifier","smoke-detector","co2","wind-turbine"],"Zahrada & Venku":["flower","tree","sprinkler","grass","garden-light","outdoor-lamp","grill","pool","hot-tub","umbrella","thermometer-lines"],Domacnost:["iron","vacuum","broom","mop","washing","basket","hanger","scissors"],"Notifikace & Stav":["information","help-circle","alert-circle","checkbox-marked-circle","check","close","minus","plus","arrow-up","arrow-down","refresh","sync","bell-ring"],Ovladani:["toggle-switch","power","play","pause","stop","skip-next","skip-previous","volume-up","volume-down","brightness-up","brightness-down"],"Cas & Planovani":["clock","timer","alarm","calendar","calendar-clock","schedule","history"],Ostatni:["home","cog","tools","wrench","hammer","chart-line","gauge","dots-vertical","menu","settings","account","logout"]};let Qi=class extends D{constructor(){super(...arguments),this.isOpen=!1,this.searchQuery=""}get filteredCategories(){const e=this.searchQuery.trim().toLowerCase();if(!e)return qa;const t=Object.entries(qa).map(([i,r])=>{const n=r.filter(a=>a.toLowerCase().includes(e));return[i,n]}).filter(([,i])=>i.length>0);return Object.fromEntries(t)}open(){this.isOpen=!0}close(){this.isOpen=!1,this.searchQuery=""}onOverlayClick(e){e.target===e.currentTarget&&this.close()}onSearchInput(e){const t=e.target;this.searchQuery=(t==null?void 0:t.value)??""}onIconClick(e){this.dispatchEvent(new CustomEvent("icon-selected",{detail:{icon:`mdi:${e}`},bubbles:!0,composed:!0})),this.close()}render(){if(!this.isOpen)return null;const e=this.filteredCategories,t=Object.entries(e);return c`
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
                      <span class="icon-emoji">${yr(n)}</span>
                      <span class="icon-name">${n}</span>
                    </button>
                  `)}
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}};Qi.styles=M`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${ae(o.bgPrimary)} 35%, transparent);
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
      background: ${ae(o.cardBg)};
      box-shadow: ${ae(o.cardShadow)};
      border-radius: 14px;
      border: 1px solid ${ae(o.divider)};
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
      border-bottom: 1px solid ${ae(o.divider)};
      gap: 12px;
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${ae(o.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${ae(o.bgSecondary)};
      color: ${ae(o.textPrimary)};
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
      background: ${ae(o.divider)};
      transform: scale(1.05);
    }

    .search {
      padding: 12px 18px;
      border-bottom: 1px solid ${ae(o.divider)};
      background: ${ae(o.bgSecondary)};
    }

    .search input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${ae(o.divider)};
      background: ${ae(o.bgPrimary)};
      color: ${ae(o.textPrimary)};
      font-size: 13px;
      outline: none;
    }

    .search input::placeholder {
      color: ${ae(o.textSecondary)};
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
      color: ${ae(o.textSecondary)};
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
      background: ${ae(o.bgSecondary)};
      cursor: pointer;
      transition: transform 0.15s ease, border 0.2s ease, background 0.2s ease;
      text-align: center;
      font-size: 10px;
      color: ${ae(o.textSecondary)};
    }

    .icon-item:hover {
      background: ${ae(o.bgPrimary)};
      border-color: ${ae(o.accent)};
      transform: translateY(-2px);
      color: ${ae(o.textPrimary)};
    }

    .icon-emoji {
      font-size: 22px;
      line-height: 1;
      color: ${ae(o.textPrimary)};
    }

    .icon-name {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      font-size: 12px;
      color: ${ae(o.textSecondary)};
      text-align: center;
      padding: 24px 0 12px;
    }
  `;Yn([g({type:Boolean,reflect:!0,attribute:"open"})],Qi.prototype,"isOpen",2);Yn([P()],Qi.prototype,"searchQuery",2);Qi=Yn([E("oig-icon-picker")],Qi);var Jh=Object.defineProperty,eg=Object.getOwnPropertyDescriptor,me=(e,t,i,r)=>{for(var n=r>1?void 0:r?eg(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&Jh(t,i,n),n};const A=G;let ce=class extends D{constructor(){super(...arguments),this.isOpen=!1,this.tileIndex=-1,this.tileSide="left",this.existingConfig=null,this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}loadTileConfig(e){var t,i;this.currentTab=e.type,e.type==="entity"?this.selectedEntityId=e.entity_id:this.selectedButtonEntityId=e.entity_id,this.label=e.label||"",this.icon=e.icon||"",this.color=e.color||"#03A9F4",this.action=e.action||"toggle",this.supportEntity1=((t=e.support_entities)==null?void 0:t.top_right)||"",this.supportEntity2=((i=e.support_entities)==null?void 0:i.bottom_right)||""}resetForm(){this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}handleClose(){this.isOpen=!1,this.resetForm(),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}getEntities(){const e=it();return e?e.getAll():{}}getEntityItems(e,t){const i=t.trim().toLowerCase(),r=this.getEntities();return Object.entries(r).filter(([a])=>e.some(s=>a.startsWith(s))).map(([a,s])=>{const l=this.getAttributeValue(s,"friendly_name")||a,d=this.getAttributeValue(s,"unit_of_measurement"),u=this.getAttributeValue(s,"icon");return{id:a,name:l,value:s.state,unit:d,icon:u,state:s}}).filter(a=>i?a.name.toLowerCase().includes(i)||a.id.toLowerCase().includes(i):!0).sort((a,s)=>a.name.localeCompare(s.name))}getSupportEntities(e){const t=e.trim().toLowerCase();if(!t)return[];const i=this.getEntities();return Object.entries(i).map(([r,n])=>{const a=this.getAttributeValue(n,"friendly_name")||r,s=this.getAttributeValue(n,"unit_of_measurement"),l=this.getAttributeValue(n,"icon");return{id:r,name:a,value:n.state,unit:s,icon:l,state:n}}).filter(r=>r.name.toLowerCase().includes(t)||r.id.toLowerCase().includes(t)).sort((r,n)=>r.name.localeCompare(n.name)).slice(0,20)}getDisplayIcon(e){return e?e.startsWith("mdi:")?yr(e):e:yr("")}getColorForEntity(e){switch(e.split(".")[0]){case"sensor":return"#03A9F4";case"binary_sensor":return"#4CAF50";case"switch":return"#FFC107";case"light":return"#FF9800";case"fan":return"#00BCD4";case"input_boolean":return"#9C27B0";default:return"#03A9F4"}}applyEntityDefaults(e){if(!e)return;const i=this.getEntities()[e];if(!i)return;this.label||(this.label=this.getAttributeValue(i,"friendly_name"));const r=this.getAttributeValue(i,"icon");!this.icon&&r&&(this.icon=r),this.color=this.getColorForEntity(e)}handleEntitySelect(e){this.selectedEntityId=e,this.applyEntityDefaults(e)}handleButtonEntitySelect(e){this.selectedButtonEntityId=e,this.applyEntityDefaults(e)}handleSupportInput(e,t){const i=t.trim();e===1?(this.supportSearch1=t,this.showSupportList1=!!i,i||(this.supportEntity1="")):(this.supportSearch2=t,this.showSupportList2=!!i,i||(this.supportEntity2=""))}handleSupportSelect(e,t){const i=t.name||t.id;e===1?(this.supportEntity1=t.id,this.supportSearch1=i,this.showSupportList1=!1):(this.supportEntity2=t.id,this.supportSearch2=i,this.showSupportList2=!1)}getSupportInputValue(e,t){if(e)return e;if(!t)return"";const i=this.getEntities()[t];return i&&this.getAttributeValue(i,"friendly_name")||t}getAttributeValue(e,t){var r;const i=(r=e.attributes)==null?void 0:r[t];return i==null?"":String(i)}handleSave(){const e=this.currentTab==="entity"?this.selectedEntityId:this.selectedButtonEntityId;if(!e){window.alert("Vyberte entitu");return}const t={top_right:this.supportEntity1||void 0,bottom_right:this.supportEntity2||void 0},i={type:this.currentTab,entity_id:e,label:this.label||void 0,icon:this.icon||void 0,color:this.color||void 0,action:this.currentTab==="button"?this.action:void 0,support_entities:t};this.dispatchEvent(new CustomEvent("tile-saved",{detail:{index:this.tileIndex,side:this.tileSide,config:i},bubbles:!0,composed:!0})),this.handleClose()}onIconSelected(e){var t;this.icon=((t=e.detail)==null?void 0:t.icon)||"",this.iconPickerOpen=!1}renderEntityList(e,t,i,r){const n=this.getEntityItems(e,t);return n.length===0?c`<div class="support-empty">Žádné entity nenalezeny</div>`:c`
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
    `:null}};ce.styles=M`
    :host {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      font-family: ${A(o.fontFamily)};
    }

    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${A(o.bgPrimary)} 35%, transparent);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .dialog {
      width: min(520px, 100%);
      max-height: 85vh;
      background: ${A(o.cardBg)};
      border: 1px solid ${A(o.divider)};
      border-radius: 16px;
      box-shadow: ${A(o.cardShadow)};
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
      border-bottom: 1px solid ${A(o.divider)};
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${A(o.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${A(o.bgSecondary)};
      color: ${A(o.textPrimary)};
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
      background: ${A(o.divider)};
      transform: scale(1.05);
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 18px;
      background: ${A(o.bgSecondary)};
      border-bottom: 1px solid ${A(o.divider)};
    }

    .tab-btn {
      border: 1px solid transparent;
      background: ${A(o.cardBg)};
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: ${A(o.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: border 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }

    .tab-btn.active {
      border-color: ${A(o.accent)};
      color: ${A(o.textPrimary)};
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
      color: ${A(o.textSecondary)};
      font-weight: 600;
    }

    .input,
    select,
    .color-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${A(o.divider)};
      background: ${A(o.bgPrimary)};
      color: ${A(o.textPrimary)};
      font-size: 12px;
      outline: none;
      transition: border 0.2s ease, box-shadow 0.2s ease;
    }

    .input::placeholder {
      color: ${A(o.textSecondary)};
    }

    .input:focus,
    select:focus,
    .color-input:focus {
      border-color: ${A(o.accent)};
      box-shadow: 0 0 0 2px color-mix(in srgb, ${A(o.accent)} 20%, transparent);
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
      border: 1px dashed ${A(o.divider)};
      display: grid;
      place-items: center;
      font-size: 22px;
      cursor: pointer;
      background: ${A(o.bgSecondary)};
      transition: border 0.2s ease, transform 0.2s ease;
    }

    .icon-preview:hover {
      border-color: ${A(o.accent)};
      transform: translateY(-1px);
    }

    .icon-field {
      font-size: 11px;
    }

    .icon-btn {
      border: none;
      background: ${A(o.bgSecondary)};
      color: ${A(o.textPrimary)};
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .divider {
      height: 1px;
      background: ${A(o.divider)};
      margin: 6px 0;
      opacity: 0.8;
    }

    .entity-list {
      border: 1px solid ${A(o.divider)};
      border-radius: 12px;
      overflow: hidden;
      max-height: 200px;
      overflow-y: auto;
      background: ${A(o.bgPrimary)};
    }

    .entity-item {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid ${A(o.divider)};
      cursor: pointer;
      align-items: center;
      transition: background 0.2s ease;
    }

    .entity-item:last-child {
      border-bottom: none;
    }

    .entity-item:hover {
      background: ${A(o.bgSecondary)};
    }

    .entity-item.selected {
      background: color-mix(in srgb, ${A(o.accent)} 16%, transparent);
      border-left: 3px solid ${A(o.accent)};
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
      color: ${A(o.textPrimary)};
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-sub {
      font-size: 10px;
      color: ${A(o.textSecondary)};
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
      background: ${A(o.cardBg)};
      border: 1px solid ${A(o.divider)};
      border-radius: 12px;
      z-index: 10;
      max-height: 180px;
      overflow-y: auto;
      box-shadow: ${A(o.cardShadow)};
    }

    .support-item {
      padding: 10px 12px;
      border-bottom: 1px solid ${A(o.divider)};
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
      background: ${A(o.bgSecondary)};
    }

    .support-name {
      font-size: 12px;
      color: ${A(o.textPrimary)};
      font-weight: 600;
    }

    .support-value {
      font-size: 10px;
      color: ${A(o.textSecondary)};
    }

    .support-empty {
      padding: 12px;
      font-size: 11px;
      color: ${A(o.textSecondary)};
      text-align: center;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px 18px;
      border-top: 1px solid ${A(o.divider)};
      background: ${A(o.bgSecondary)};
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
      background: ${A(o.bgPrimary)};
      color: ${A(o.textPrimary)};
      border: 1px solid ${A(o.divider)};
    }

    .btn-primary {
      background: ${A(o.accent)};
      color: #fff;
      box-shadow: 0 6px 14px color-mix(in srgb, ${A(o.accent)} 40%, transparent);
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
  `;me([g({type:Boolean,reflect:!0,attribute:"open"})],ce.prototype,"isOpen",2);me([g({type:Number})],ce.prototype,"tileIndex",2);me([g({attribute:!1})],ce.prototype,"tileSide",2);me([g({attribute:!1})],ce.prototype,"existingConfig",2);me([P()],ce.prototype,"currentTab",2);me([P()],ce.prototype,"entitySearchText",2);me([P()],ce.prototype,"buttonSearchText",2);me([P()],ce.prototype,"selectedEntityId",2);me([P()],ce.prototype,"selectedButtonEntityId",2);me([P()],ce.prototype,"label",2);me([P()],ce.prototype,"icon",2);me([P()],ce.prototype,"color",2);me([P()],ce.prototype,"action",2);me([P()],ce.prototype,"supportEntity1",2);me([P()],ce.prototype,"supportEntity2",2);me([P()],ce.prototype,"supportSearch1",2);me([P()],ce.prototype,"supportSearch2",2);me([P()],ce.prototype,"showSupportList1",2);me([P()],ce.prototype,"showSupportList2",2);me([P()],ce.prototype,"iconPickerOpen",2);ce=me([E("oig-tile-dialog")],ce);var tg=Object.defineProperty,ig=Object.getOwnPropertyDescriptor,ee=(e,t,i,r)=>{for(var n=r>1?void 0:r?ig(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(n=(r?s(t,i,n):s(n))||n);return r&&n&&tg(t,i,n),n};const xe=G,Ya=new URLSearchParams(window.location.search),$t=Ya.get("sn")||Ya.get("inverter_sn")||"",Ka=`sensor.oig_${$t}_`,rg=[{id:"flow",label:"Toky",icon:"⚡"},{id:"pricing",label:"Ceny",icon:"💰"},{id:"boiler",label:"Bojler",icon:"🔥"}];let X=class extends D{constructor(){super(...arguments),this.hass=null,this.loading=!0,this.error=null,this.activeTab="flow",this.editMode=!1,this.time="",this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1,this.flowData=En,this.pricingData=null,this.pricingLoading=!1,this.boilerState=null,this.boilerLoading=!1,this.boilerV2Data=null,this.boilerConfig=null,this.boilerRefreshTimer=null,this.analyticsData=ya,this.chmuData=Ai,this.chmuModalOpen=!1,this.timelineTab="today",this.timelineData=null,this.tilesConfig=null,this.tilesLeft=[],this.tilesRight=[],this.tileDialogOpen=!1,this.editingTileIndex=-1,this.editingTileSide="left",this.editingTileConfig=null,this.entityStore=null,this.timeInterval=null,this.stateWatcherUnsub=null,this.tileEntityUnsubs=[],this.pricingDirty=!1,this.timelineDirty=!1,this.analyticsDirty=!1,this.boilerDirty=!1,this.reconnecting=!1,this.throttledUpdateFlow=nn(()=>this.updateFlowData(),500),this.throttledUpdateSensors=nn(()=>this.updateSensorData(),1e3),this.throttledRefreshDerivedData=nn(()=>this.refreshDerivedData(),5e3),this.onPageShow=()=>{this.rebindHassContext()},this.onDocumentVisibilityChange=()=>{document.visibilityState==="visible"&&this.rebindHassContext()}}get boilerLang(){return nc(this.hass)}connectedCallback(){super.connectedCallback(),window.addEventListener("pageshow",this.onPageShow),document.addEventListener("visibilitychange",this.onDocumentVisibilityChange),this.initApp(),this.startTimeUpdate()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("pageshow",this.onPageShow),document.removeEventListener("visibilitychange",this.onDocumentVisibilityChange),this.cleanup()}updated(e){e.has("hass")&&!e.has("loading")&&this.rebindHassContext(),e.has("activeTab")&&(this.activeTab==="pricing"&&(!this.pricingData||this.pricingDirty)&&this.loadPricingData(),this.activeTab==="pricing"&&(this.analyticsData===ya||this.analyticsDirty)&&this.loadAnalyticsAsync(),this.activeTab==="pricing"&&(!this.timelineData||this.timelineDirty)&&this.loadTimelineTabData(this.timelineTab),this.activeTab==="boiler"&&(!this.boilerState||this.boilerDirty)&&this.loadBoilerDataAsync())}async initApp(){try{const e=await ie.getHass();if(!e)throw new Error("Cannot access Home Assistant context");this.hass=e,this.entityStore=Go(e,$t),await _t.start({getHass:()=>ie.getHassSync(),prefixes:[Ka]}),this.stateWatcherUnsub=_t.onEntityChange((t,i)=>{this.syncHassState(t,i),this.throttledUpdateFlow(),this.throttledUpdateSensors(),this.throttledRefreshDerivedData()}),te.start(),this.updateFlowData(),this.updateSensorData(),this.loadPricingData(),this.loadBoilerDataAsync(),this.loadAnalyticsAsync(),this.loadTilesAsync(),this.loading=!1,_.info("App initialized",{entities:Object.keys(e.states||{}).length,inverterSn:$t})}catch(e){this.error=e.message,this.loading=!1,_.error("App init failed",e)}}cleanup(){var e,t;(e=this.stateWatcherUnsub)==null||e.call(this),this.stateWatcherUnsub=null,_t.stop(),te.stop(),this.tileEntityUnsubs.forEach(i=>i()),this.tileEntityUnsubs=[],(t=this.entityStore)==null||t.destroy(),this.entityStore=null,this.timeInterval!==null&&(clearInterval(this.timeInterval),this.timeInterval=null),this.boilerRefreshTimer!==null&&(clearInterval(this.boilerRefreshTimer),this.boilerRefreshTimer=null)}async rebindHassContext(){var e;if(!this.reconnecting){this.reconnecting=!0;try{const t=await ie.refreshHass();if(!t)return;this.hass=t,(e=this.entityStore)==null||e.updateHass(t),await _t.start({getHass:()=>ie.getHassSync(),prefixes:[Ka]}),this.updateFlowData(),this.updateSensorData()}catch(t){_.error("Failed to rebind hass context",t)}finally{this.reconnecting=!1}}}updateFlowData(){var e;if(this.hass)try{const t=((e=this.entityStore)==null?void 0:e.getAll())??this.hass;this.flowData=hl(t,$t)}catch(t){_.error("Failed to extract flow data",t)}}updateSensorData(){if(this.chmuData=cc($t),this.activeTab==="pricing"&&(this.analyticsData={...this.analyticsData,...oc()}),this.tilesConfig){const e=$i(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}}updateTilesImmediate(){if(!this.tilesConfig)return;const e=$i(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}subscribeTileEntities(){if(this.tileEntityUnsubs.forEach(t=>t()),this.tileEntityUnsubs=[],!this.tilesConfig||!this.entityStore)return;const e=new Set;[...this.tilesConfig.tiles_left,...this.tilesConfig.tiles_right].forEach(t=>{var i,r;t&&(e.add(t.entity_id),(i=t.support_entities)!=null&&i.top_right&&e.add(t.support_entities.top_right),(r=t.support_entities)!=null&&r.bottom_right&&e.add(t.support_entities.bottom_right))});for(const t of e){const i=this.entityStore.subscribe(t,()=>{this.updateTilesImmediate()});this.tileEntityUnsubs.push(i)}}async loadPricingData(){if(!(!this.hass||this.pricingLoading)){this.pricingLoading=!0;try{const e=await _i(()=>El(this.hass));this.pricingData=e,this.pricingDirty=!1}catch(e){_.error("Failed to load pricing data",e)}finally{this.pricingLoading=!1}}}async loadBoilerDataAsync(){if(!(!this.hass||this.boilerLoading)){this.boilerLoading=!0;try{const e=await _i(()=>rc(this.hass));this.boilerState=e.state,this.boilerV2Data=e.v2Data,this.boilerConfig=e.config,this.boilerDirty=!1,this.boilerRefreshTimer||(this.boilerRefreshTimer=window.setInterval(()=>this.loadBoilerDataAsync(),5*60*1e3))}catch(e){_.error("Failed to load boiler data",e)}finally{this.boilerLoading=!1}}}async loadAnalyticsAsync(){try{this.analyticsData=await _i(()=>sc($t)),this.analyticsDirty=!1}catch(e){_.error("Failed to load analytics",e)}}async loadTilesAsync(){try{this.tilesConfig=await _i(()=>gc());const e=$i(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right,this.subscribeTileEntities()}catch(e){_.error("Failed to load tiles config",e)}}async loadTimelineTabData(e){try{this.timelineData=await _i(()=>pc($t,e)),this.timelineDirty=!1}catch(t){_.error(`Failed to load timeline tab: ${e}`,t)}}syncHassState(e,t){if(this.hass){if(this.hass.states||(this.hass.states={}),t){this.hass.states[e]=t;return}delete this.hass.states[e]}}refreshDerivedData(){if(this.pricingDirty=!0,this.timelineDirty=!0,this.analyticsDirty=!0,this.boilerDirty=!0,this.activeTab==="pricing"){xl(),this.loadPricingData(),this.loadTimelineTabData(this.timelineTab),this.loadAnalyticsAsync();return}this.activeTab==="boiler"&&this.loadBoilerDataAsync()}startTimeUpdate(){const e=()=>{this.time=new Date().toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})};e(),this.timeInterval=window.setInterval(e,1e3)}onTabChange(e){this.activeTab=e.detail.tabId}onGridChargingOpen(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-grid-charging-dialog");e==null||e.show()}onEditClick(){this.editMode=!this.editMode}onResetClick(){var i,r;const e=(i=this.shadowRoot)==null?void 0:i.querySelector("oig-flow-canvas");e!=null&&e.resetLayout&&e.resetLayout();const t=(r=this.shadowRoot)==null?void 0:r.querySelector("oig-grid");t&&t.resetLayout()}onToggleLeftPanel(){this.leftPanelCollapsed=!this.leftPanelCollapsed}onToggleRightPanel(){this.rightPanelCollapsed=!this.rightPanelCollapsed}onChmuBadgeClick(){this.chmuModalOpen=!0}onChmuModalClose(){this.chmuModalOpen=!1}onTimelineTabChange(e){this.timelineTab=e.detail.tab,this.loadTimelineTabData(e.detail.tab)}onTimelineRefresh(){this.loadTimelineTabData(this.timelineTab)}onEditTile(e){const{entityId:t}=e.detail;let i=-1,r="left",n=null;if(this.tilesConfig){const a=this.tilesConfig.tiles_left.findIndex(s=>s&&s.entity_id===t);if(a>=0)i=a,r="left",n=this.tilesConfig.tiles_left[a];else{const s=this.tilesConfig.tiles_right.findIndex(l=>l&&l.entity_id===t);s>=0&&(i=s,r="right",n=this.tilesConfig.tiles_right[s])}}this.editingTileIndex=i,this.editingTileSide=r,this.editingTileConfig=n,this.tileDialogOpen=!0,n&&requestAnimationFrame(()=>{var s;const a=(s=this.shadowRoot)==null?void 0:s.querySelector("oig-tile-dialog");a==null||a.loadTileConfig(n)})}onDeleteTile(e){const{entityId:t}=e.detail;if(!this.tilesConfig||!t)return;const i={...this.tilesConfig};i.tiles_left=i.tiles_left.map(n=>n&&n.entity_id===t?null:n),i.tiles_right=i.tiles_right.map(n=>n&&n.entity_id===t?null:n),this.tilesConfig=i;const r=$i(i);this.tilesLeft=r.left,this.tilesRight=r.right,$a(i),this.subscribeTileEntities()}onTileSaved(e){const{index:t,side:i,config:r}=e.detail;if(!this.tilesConfig)return;const n={...this.tilesConfig},a=i==="left"?[...n.tiles_left]:[...n.tiles_right];if(t>=0&&t<a.length)a[t]=r;else{const l=a.findIndex(d=>d===null);l>=0?a[l]=r:a.push(r)}i==="left"?n.tiles_left=a:n.tiles_right=a,this.tilesConfig=n;const s=$i(n);this.tilesLeft=s.left,this.tilesRight=s.right,$a(n),this.subscribeTileEntities()}onTileDialogClose(){this.tileDialogOpen=!1,this.editingTileConfig=null,this.editingTileIndex=-1}_renderBoilerTabSafe(){try{return this._buildBoilerTabContent()}catch(e){return _.error("Boiler tab render failed",e),c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${"render_failed"}></oig-boiler-unavailable-state>`}}_buildBoilerTabContent(){var f,m,v,$,w,x,S,B,q;const e=this.boilerV2Data;if(this.boilerLoading&&!e)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="loading" message=""></oig-boiler-unavailable-state>`;if(e!=null&&e.loadError)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${e.loadError}></oig-boiler-unavailable-state>`;const t=(((f=e==null?void 0:e.explanation)==null?void 0:f.degradedReasons)??[]).filter(k=>k!=="config_profile_unavailable");if(e&&e.status===null&&t.length>0)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="degraded" .message=${t.join(", ")}></oig-boiler-unavailable-state>`;if(!e)return c`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="unavailable" message="Data bojleru nejsou k dispozici"></oig-boiler-unavailable-state>`;const i=((v=(m=this.hass)==null?void 0:m.config)==null?void 0:v.time_zone)??Intl.DateTimeFormat().resolvedOptions().timeZone??"Europe/Prague",r=(($=e.status)==null?void 0:$.heating)??!1,n=(w=e.status)==null?void 0:w.comfortSatisfied,a=r?"Nabíjí":n===!0?"Připraveno":n===!1?"Nedostatek":"Připraveno",s=((x=e.status)==null?void 0:x.degradedFlags)??[],l=s.includes("plan_degraded")?"⚠ Plán s omezenými daty":s.includes("price_degraded")?"⚠ Ceny: stará data":s.includes("forecast_degraded")?"⚠ FVE predikce: stará data":null,d=(((S=e.status)==null?void 0:S.degraded)??!1)&&l!==null,u=((B=e.explanation)==null?void 0:B.dataAgeSecs)??null,p=((q=e.status)==null?void 0:q.lastUpdate)??null,h=u===null?null:u<60?`${Math.round(u)} sekundami`:u<3600?`${Math.round(u/60)} minutami`:`${Math.round(u/3600)} hodinami`,b=p?(()=>{try{const k=new Date(p);return`${String(k.getHours()).padStart(2,"0")}:${String(k.getMinutes()).padStart(2,"0")}:${String(k.getSeconds()).padStart(2,"0")}`}catch{return null}})():null;return c`
      <div class="boiler-header">
        <h1>🔥 Bojler
          <span class="boiler-badge">${a}</span>
          ${d?c`<span class="boiler-badge degr">${l}</span>`:""}
        </h1>
        ${h||b?c`
          <div class="boiler-header-meta">
            ${h?`Aktualizováno před ${h}`:""}
            ${h&&b?" · ":""}
            ${b?`Data k ${b}`:""}
          </div>
        `:""}
      </div>
      <div class="boiler-stage">
        <oig-boiler-metric-panel panelType="source" .data=${e} .config=${this.boilerConfig} .lang=${this.boilerLang}></oig-boiler-metric-panel>
        <oig-boiler-v2-shell .data=${e} .config=${this.boilerConfig} .lang=${this.boilerLang}></oig-boiler-v2-shell>
        <oig-boiler-metric-panel panelType="comfort" .data=${e} .config=${this.boilerConfig} .lang=${this.boilerLang}></oig-boiler-metric-panel>
      </div>
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
          .tabs=${rg}
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
                `:O}
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
               ${this.boilerLoading&&this.boilerV2Data?c`
                 <div class="tab-loading-overlay">
                   <div class="spinner spinner--small"></div>
                   <span>Načítání bojleru...</span>
                 </div>
               `:O}
               ${this._renderBoilerTabSafe()}
               <div data-testid="boiler-setup-guide" class="boiler-setup-guide">
                 <span class="boiler-setup-guide__icon">🧙</span>
                 <div class="boiler-setup-guide__text">
                   <strong>Průvodce nastavením bojleru</strong>
                   <p>Bojler konfigurujte v Nastavení → Zařízení a služby → OIG Cloud → Konfigurovat.</p>
                 </div>
               </div>
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
    `}};X.styles=M`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      font-family: ${xe(o.fontFamily)};
      color: ${xe(o.textPrimary)};
      background: ${xe(o.bgPrimary)};
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
      color: ${xe(o.textSecondary)};
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid ${xe(o.divider)};
      border-top-color: ${xe(o.accent)};
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
      color: ${xe(o.error)};
      text-align: center;
      animation: fadeIn 0.3s ease;
    }

    .error h2 {
      margin-bottom: 8px;
    }

    .error button {
      margin-top: 12px;
      padding: 8px 16px;
      background: ${xe(o.accent)};
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
      background: ${xe(o.bgSecondary)};
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
      background: ${xe(o.cardBg)};
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      font-size: 12px;
      color: ${xe(o.textSecondary)};
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

    .boiler-setup-guide {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      background: ${xe(o.cardBg)};
      border: 1px solid ${xe(o.divider)};
      border-radius: 8px;
      font-size: 13px;
      color: ${xe(o.textSecondary)};
    }

    .boiler-setup-guide__icon {
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
    }

    .boiler-setup-guide__text strong {
      display: block;
      color: ${xe(o.textPrimary)};
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
  `;ee([g({type:Object})],X.prototype,"hass",2);ee([P()],X.prototype,"loading",2);ee([P()],X.prototype,"error",2);ee([P()],X.prototype,"activeTab",2);ee([P()],X.prototype,"editMode",2);ee([P()],X.prototype,"time",2);ee([P()],X.prototype,"leftPanelCollapsed",2);ee([P()],X.prototype,"rightPanelCollapsed",2);ee([P()],X.prototype,"flowData",2);ee([P()],X.prototype,"pricingData",2);ee([P()],X.prototype,"pricingLoading",2);ee([P()],X.prototype,"boilerState",2);ee([P()],X.prototype,"boilerLoading",2);ee([P()],X.prototype,"boilerV2Data",2);ee([P()],X.prototype,"boilerConfig",2);ee([P()],X.prototype,"analyticsData",2);ee([P()],X.prototype,"chmuData",2);ee([P()],X.prototype,"chmuModalOpen",2);ee([P()],X.prototype,"timelineTab",2);ee([P()],X.prototype,"timelineData",2);ee([P()],X.prototype,"tilesConfig",2);ee([P()],X.prototype,"tilesLeft",2);ee([P()],X.prototype,"tilesRight",2);ee([P()],X.prototype,"tileDialogOpen",2);ee([P()],X.prototype,"editingTileIndex",2);ee([P()],X.prototype,"editingTileSide",2);ee([P()],X.prototype,"editingTileConfig",2);X=ee([E("oig-app")],X);_.info("V2 starting",{version:"2.0.0-beta.1"});Vo();async function ng(){try{const e=await Ho(),t=document.getElementById("app");t&&(t.innerHTML="",t.appendChild(e)),_.info("V2 mounted successfully")}catch(e){_.error("V2 bootstrap failed",e);const t=document.getElementById("app");t&&(t.innerHTML=`
        <div style="padding: 20px; font-family: system-ui;">
          <h2>Chyba načítání</h2>
          <p>Nepodařilo se načíst dashboard. Zkuste obnovit stránku.</p>
          <details>
            <summary>Detaily</summary>
            <pre>${e.message}</pre>
          </details>
        </div>`)}}ng();
//# sourceMappingURL=index.js.map
