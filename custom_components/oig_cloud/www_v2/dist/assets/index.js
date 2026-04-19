var ls=Object.defineProperty;var cs=(t,e,i)=>e in t?ls(t,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[e]=i;var k=(t,e,i)=>cs(t,typeof e!="symbol"?e+"":e,i);import{f as ds,u as us,i as P,a as M,b as d,r as Q,w as Tt,A as O,E as ps}from"./vendor.js";import{C as Qi,a as Rr,L as Hr,P as Wr,b as jr,i as Vr,p as qr,c as Yr,d as hs,T as gs,e as fs,B as ms,f as bs,g as ys,h as vs,j as xs,k as Gr}from"./charts.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function i(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(r){if(r.ep)return;r.ep=!0;const a=i(r);fetch(r.href,a)}})();const Zt="[V2]";function ws(){return new Date().toISOString().substr(11,12)}function wi(t,e){const i=ws(),n=t.toUpperCase().padEnd(5);return`${i} ${n} ${e}`}const v={debug(t,e){typeof window<"u"&&window.OIG_DEBUG&&console.debug(Zt,wi("debug",t),e??"")},info(t,e){console.info(Zt,wi("info",t),e??"")},warn(t,e){console.warn(Zt,wi("warn",t),e??"")},error(t,e,i){const n=e?{error:e.message,stack:e.stack,...i}:i;console.error(Zt,wi("error",t),n??"")},time(t){console.time(`${Zt} ${t}`)},timeEnd(t){console.timeEnd(`${Zt} ${t}`)},group(t){console.group(`${Zt} ${t}`)},groupEnd(){console.groupEnd()}};function $s(){window.addEventListener("error",_s),window.addEventListener("unhandledrejection",ks),v.debug("Error handling setup complete")}function _s(t){const e=t.error||new Error(t.message);v.error("Uncaught error",e,{filename:t.filename,lineno:t.lineno,colno:t.colno}),t.preventDefault()}function ks(t){const e=t.reason instanceof Error?t.reason:new Error(String(t.reason));v.error("Unhandled promise rejection",e),t.preventDefault()}class Ur extends Error{constructor(e,i,n=!1,r){super(e),this.code=i,this.recoverable=n,this.cause=r,this.name="AppError"}}class Be extends Ur{constructor(e="Authentication failed"){super(e,"AUTH_ERROR",!1),this.name="AuthError"}}class tr extends Ur{constructor(e="Network error",i){super(e,"NETWORK_ERROR",!0,i),this.name="NetworkError"}}const Ss="oig_v2_";function Cs(){var t;try{const e=((t=globalThis.navigator)==null?void 0:t.userAgent)||"";return/Home Assistant|HomeAssistant|HAcompanion/i.test(e)}catch{return!1}}function Ps(){var t;try{const e=((t=globalThis.navigator)==null?void 0:t.userAgent)||"",i=/Android|iPhone|iPad|iPod|Mobile/i.test(e),n=globalThis.innerWidth<=768;return i||n}catch{return!1}}const vt={isHaApp:!1,isMobile:!1,reduceMotion:!1};async function Ts(){var i,n;v.info("Bootstrap starting"),$s(),vt.isHaApp=Cs(),vt.isMobile=Ps(),vt.reduceMotion=vt.isHaApp||vt.isMobile||((n=(i=globalThis.matchMedia)==null?void 0:i.call(globalThis,"(prefers-reduced-motion: reduce)"))==null?void 0:n.matches)||!1;const t=document.documentElement;vt.isHaApp&&t.classList.add("oig-ha-app"),vt.isMobile&&t.classList.add("oig-mobile"),vt.reduceMotion&&t.classList.add("oig-reduce-motion");const e={version:"2.0.0-beta.1",storagePrefix:Ss};return v.info("Bootstrap complete",{...e,isHaApp:vt.isHaApp,isMobile:vt.isMobile,reduceMotion:vt.reduceMotion}),document.createElement("oig-app")}const o={bgPrimary:"var(--primary-background-color, #ffffff)",bgSecondary:"var(--secondary-background-color, #f5f5f5)",textPrimary:"var(--primary-text-color, #212121)",textSecondary:"var(--secondary-text-color, #757575)",accent:"var(--accent-color, #03a9f4)",divider:"var(--divider-color, #e0e0e0)",error:"var(--error-color, #db4437)",success:"var(--success-color, #0f9d58)",warning:"var(--warning-color, #f4b400)",cardBg:"var(--card-background-color, #ffffff)",cardShadow:"var(--shadow-elevation-2dp_-_box-shadow, 0 2px 2px 0 rgba(0,0,0,0.14))",fontFamily:"var(--primary-font-family, system-ui, sans-serif)"},er={"--primary-background-color":"#111936","--secondary-background-color":"#1a2044","--primary-text-color":"#e1e1e1","--secondary-text-color":"rgba(255,255,255,0.7)","--accent-color":"#03a9f4","--divider-color":"rgba(255,255,255,0.12)","--error-color":"#ef5350","--success-color":"#66bb6a","--warning-color":"#ffa726","--card-background-color":"rgba(255,255,255,0.06)","--shadow-elevation-2dp_-_box-shadow":"0 2px 4px 0 rgba(0,0,0,0.4)"},ir={"--primary-background-color":"#ffffff","--secondary-background-color":"#f5f5f5","--primary-text-color":"#212121","--secondary-text-color":"#757575","--accent-color":"#03a9f4","--divider-color":"#e0e0e0","--error-color":"#db4437","--success-color":"#0f9d58","--warning-color":"#f4b400","--card-background-color":"#ffffff","--shadow-elevation-2dp_-_box-shadow":"0 2px 2px 0 rgba(0,0,0,0.14)"};function dn(){var t,e;try{if(window.parent&&window.parent!==window){const i=(e=(t=window.parent.document)==null?void 0:t.querySelector("home-assistant"))==null?void 0:e.hass;if(i!=null&&i.themes){if(typeof i.themes.darkMode=="boolean")return i.themes.darkMode;const n=(i.themes.theme||"").toLowerCase();if(n.includes("dark"))return!0;if(n.includes("light"))return!1}}}catch{}return window.matchMedia("(prefers-color-scheme: dark)").matches}function un(t){const e=t?er:ir,i=document.documentElement;for(const[n,r]of Object.entries(e))i.style.setProperty(n,r);i.classList.toggle("dark",t),document.body.style.background=t?er["--secondary-background-color"]:ir["--secondary-background-color"]}function Ms(){const t=dn();un(t),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{const i=dn();un(i)}),setInterval(()=>{const i=dn(),n=document.documentElement.classList.contains("dark");i!==n&&un(i)},5e3)}const nr={mobile:768,tablet:1024};function ye(t){return t<nr.mobile?"mobile":t<nr.tablet?"tablet":"desktop"}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const D=t=>(e,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ds={attribute:!0,type:String,converter:us,reflect:!1,hasChanged:ds},Es=(t=Ds,e,i)=>{const{kind:n,metadata:r}=i;let a=globalThis.litPropertyMetadata.get(r);if(a===void 0&&globalThis.litPropertyMetadata.set(r,a=new Map),n==="setter"&&((t=Object.create(t)).wrapped=!0),a.set(i.name,t),n==="accessor"){const{name:s}=i;return{set(l){const c=e.get.call(this);e.set.call(this,l),this.requestUpdate(s,c,t,!0,l)},init(l){return l!==void 0&&this.C(s,void 0,t,l),l}}}if(n==="setter"){const{name:s}=i;return function(l){const c=this[s];e.call(this,l),this.requestUpdate(s,c,t,!0,l)}}throw Error("Unsupported decorator location: "+n)};function h(t){return(e,i)=>typeof i=="object"?Es(t,e,i):((n,r,a)=>{const s=r.hasOwnProperty(a);return r.constructor.createProperty(a,n),s?Object.getOwnPropertyDescriptor(r,a):void 0})(t,e,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function x(t){return h({...t,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Os=(t,e,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof e!="object"&&Object.defineProperty(t,e,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Xi(t,e){return(i,n,r)=>{const a=s=>{var l;return((l=s.renderRoot)==null?void 0:l.querySelector(t))??null};return Os(i,n,{get(){return a(this)}})}}class zs{constructor(){this.callbacks=new Set,this.watched=new Set,this.watchedPrefixes=new Set,this.unsub=null,this.running=!1,this.getHass=null,this.activeConnection=null}registerEntities(e){for(const i of e)typeof i=="string"&&i.length>0&&this.watched.add(i)}registerPrefix(e){var n;if(typeof e!="string"||e.length===0)return;this.watchedPrefixes.add(e);const i=(n=this.getHass)==null?void 0:n.call(this);if(i!=null&&i.states){const r=Object.keys(i.states).filter(a=>a.startsWith(e));this.registerEntities(r)}}onEntityChange(e){return this.callbacks.add(e),()=>{this.callbacks.delete(e)}}async start(e){this.getHass=e.getHass;const i=this.getHass();if(!(i!=null&&i.connection)){v.debug("StateWatcher: hass not ready, retrying in 500ms"),setTimeout(()=>this.start(e),500);return}if(this.running&&this.activeConnection===i.connection){const r=e.prefixes??[];for(const a of r)this.registerPrefix(a);return}this.running&&this.stop(),this.running=!0,this.activeConnection=i.connection;const n=e.prefixes??[];for(const r of n)this.registerPrefix(r);try{this.unsub=await i.connection.subscribeEvents(r=>this.handleStateChanged(r),"state_changed"),v.info("StateWatcher started",{prefixes:n,watchedCount:this.watched.size})}catch(r){this.running=!1,this.activeConnection=null,v.error("StateWatcher failed to subscribe",r)}}stop(){if(this.running=!1,this.activeConnection=null,this.unsub)try{this.unsub()}catch{}this.unsub=null,v.info("StateWatcher stopped")}isWatched(e){return this.matchesWatched(e)}destroy(){this.stop(),this.callbacks.clear(),this.watched.clear(),this.watchedPrefixes.clear(),this.getHass=null}matchesWatched(e){if(this.watched.has(e))return!0;for(const i of this.watchedPrefixes)if(e.startsWith(i))return!0;return!1}handleStateChanged(e){var r;const i=(r=e==null?void 0:e.data)==null?void 0:r.entity_id;if(!i||!this.matchesWatched(i))return;const n=e.data.new_state;for(const a of this.callbacks)try{a(i,n)}catch{}}}const ee=new zs;class Ls{constructor(e,i="2206237016"){this.subscriptions=new Map,this.cache=new Map,this.stateWatcherUnsub=null,this.hass=e,this.inverterSn=i,this.init()}init(){var e;if((e=this.hass)!=null&&e.states)for(const[i,n]of Object.entries(this.hass.states))this.cache.set(i,n);this.stateWatcherUnsub=ee.onEntityChange((i,n)=>{n?this.cache.set(i,n):this.cache.delete(i),this.notifySubscribers(i,n)}),v.debug("EntityStore initialized",{entities:this.cache.size,inverterSn:this.inverterSn})}getSensorId(e){return`sensor.oig_${this.inverterSn}_${e}`}findSensorId(e){const i=this.getSensorId(e);for(const n of this.cache.keys()){if(n===i)return n;if(n.startsWith(i+"_")){const r=n.substring(i.length+1);if(/^\d+$/.test(r))return n}}return i}subscribe(e,i){this.subscriptions.has(e)||this.subscriptions.set(e,new Set),this.subscriptions.get(e).add(i),ee.registerEntities([e]);const n=this.cache.get(e)??null;return i(n),()=>{var r,a;(r=this.subscriptions.get(e))==null||r.delete(i),((a=this.subscriptions.get(e))==null?void 0:a.size)===0&&this.subscriptions.delete(e)}}getNumeric(e){const i=this.cache.get(e);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"&&parseFloat(i.state)||0,lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:0,lastUpdated:null,attributes:{},exists:!1}}getString(e){const i=this.cache.get(e);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"?i.state:"",lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:"",lastUpdated:null,attributes:{},exists:!1}}get(e){return this.cache.get(e)??null}getAll(){return Object.fromEntries(this.cache)}batchLoad(e){const i={};for(const n of e)i[n]=this.getNumeric(n);return i}updateHass(e){if(this.hass=e,e!=null&&e.states){const i=new Set(Object.keys(e.states));for(const n of Array.from(this.cache.keys()))i.has(n)||(this.cache.delete(n),this.notifySubscribers(n,null));for(const[n,r]of Object.entries(e.states)){const a=this.cache.get(n),s=r;this.cache.set(n,s),((a==null?void 0:a.state)!==s.state||(a==null?void 0:a.last_updated)!==s.last_updated)&&this.notifySubscribers(n,s)}}}notifySubscribers(e,i){const n=this.subscriptions.get(e);if(n)for(const r of n)try{r(i)}catch(a){v.error("Entity callback error",a,{entityId:e})}}destroy(){var e;(e=this.stateWatcherUnsub)==null||e.call(this),this.subscriptions.clear(),this.cache.clear(),v.debug("EntityStore destroyed")}}let Ze=null;function As(t,e){return Ze&&Ze.destroy(),Ze=new Ls(t,e),Ze}function Bt(){return Ze}const Is=3,Bs=1e3;class Fs{constructor(){this.hass=null,this.initPromise=null}async getHass(){return this.hass?this.hass:this.initPromise?this.initPromise:(this.initPromise=this.initHass(),this.initPromise)}getHassSync(){return this.hass}async refreshHass(){const e=await this.findHass();return e?(this.hass=e,v.info("HASS client refreshed"),e):this.hass}async initHass(){v.debug("Initializing HASS client");const e=await this.findHass();return e?(this.hass=e,v.info("HASS client initialized"),e):(v.warn("HASS not found in parent context"),null)}async findHass(){var e,i;if(typeof window>"u")return null;if(window.hass)return window.hass;if(window.parent&&window.parent!==window)try{const n=(i=(e=window.parent.document)==null?void 0:e.querySelector("home-assistant"))==null?void 0:i.hass;if(n)return n}catch{v.debug("Cannot access parent HASS (cross-origin)")}return window.customPanel?window.customPanel.hass:null}async fetchWithAuth(e,i={}){var s,l;const n=await this.getHass();if(!n)throw new Be("Cannot get HASS context");try{const u=new URL(e,window.location.href).hostname;if(u!=="localhost"&&u!=="127.0.0.1"&&!e.startsWith("/api/"))throw new Error(`fetchWithAuth rejected for non-localhost URL: ${e}`)}catch(c){if(c.message.includes("rejected"))throw c}const r=(l=(s=n.auth)==null?void 0:s.data)==null?void 0:l.access_token;if(!r)throw new Be("No access token available");const a=new Headers(i.headers);return a.set("Authorization",`Bearer ${r}`),a.has("Content-Type")||a.set("Content-Type","application/json"),this.fetchWithRetry(e,{...i,headers:a})}async fetchWithRetry(e,i,n=Is){try{const r=await fetch(e,i);if(!r.ok)throw r.status===401?new Be("Token expired or invalid"):new tr(`HTTP ${r.status}: ${r.statusText}`);return r}catch(r){if(n>0&&r instanceof tr)return v.warn(`Retrying fetch (${n} left)`,{url:e}),await this.delay(Bs),this.fetchWithRetry(e,i,n-1);throw r}}async callApi(e,i,n){const r=await this.getHass();if(!r)throw new Be("Cannot get HASS context");return r.callApi(e,i,n)}async callService(e,i,n){const r=await this.getHass();if(!(r!=null&&r.callService))return v.error("Cannot call service — hass not available"),!1;try{return await r.callService(e,i,n),!0}catch(a){return v.error(`Service call failed (${e}.${i})`,a),!1}}async callWS(e){const i=await this.getHass();if(!(i!=null&&i.callWS))throw new Be("Cannot get HASS context for WS call");return i.callWS(e)}async fetchOIGAPI(e,i={}){try{const n=`/api/oig_cloud${e.startsWith("/")?"":"/"}${e}`;return await(await this.fetchWithAuth(n,{...i,headers:{"Content-Type":"application/json",...Object.fromEntries(new Headers(i.headers).entries())}})).json()}catch(n){return v.error(`OIG API fetch error for ${e}`,n),null}}async loadBatteryTimeline(e,i="active"){return this.fetchOIGAPI(`/battery_forecast/${e}/timeline?type=${i}`)}async loadUnifiedCostTile(e){return this.fetchOIGAPI(`/battery_forecast/${e}/unified_cost_tile`)}async loadSpotPrices(e){return this.fetchOIGAPI(`/spot_prices/${e}/intervals`)}async loadAnalytics(e){return this.fetchOIGAPI(`/analytics/${e}`)}async loadPlannerSettings(e){return this.fetchOIGAPI(`/battery_forecast/${e}/planner_settings`)}async savePlannerSettings(e,i){return this.fetchOIGAPI(`/battery_forecast/${e}/planner_settings`,{method:"POST",body:JSON.stringify(i)})}async loadDetailTabs(e,i,n="hybrid"){return this.fetchOIGAPI(`/battery_forecast/${e}/detail_tabs?tab=${i}&plan=${n}`)}async loadModules(e){return this.fetchOIGAPI(`/${e}/modules`)}openEntityDialog(e){var i;try{const n=((i=window.parent.document)==null?void 0:i.querySelector("home-assistant"))??document.querySelector("home-assistant");if(!n)return v.warn("Cannot open entity dialog — home-assistant element not found"),!1;const r=new CustomEvent("hass-more-info",{bubbles:!0,composed:!0,detail:{entityId:e}});return n.dispatchEvent(r),!0}catch(n){return v.error("Cannot open entity dialog",n),!1}}async showNotification(e,i,n="success"){await this.callService("persistent_notification","create",{title:e,message:i,notification_id:`oig_dashboard_${Date.now()}`})||console.log(`[${n.toUpperCase()}] ${e}: ${i}`)}getToken(){var e,i,n;return((n=(i=(e=this.hass)==null?void 0:e.auth)==null?void 0:i.data)==null?void 0:n.access_token)??null}delay(e){return new Promise(i=>setTimeout(i,e))}}const J=new Fs,rr={solar:"#ffd54f",battery:"#4caf50",inverter:"#9575cd",grid:"#42a5f5",house:"#f06292"},Fe={solar:"linear-gradient(135deg, rgba(255,213,79,0.15) 0%, rgba(255,179,0,0.08) 100%)",battery:"linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(56,142,60,0.08) 100%)",grid:"linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(33,150,243,0.08) 100%)",house:"linear-gradient(135deg, rgba(240,98,146,0.15) 0%, rgba(233,30,99,0.08) 100%)",inverter:"linear-gradient(135deg, rgba(149,117,205,0.15) 0%, rgba(126,87,194,0.08) 100%)"},Ne={solar:"rgba(255,213,79,0.4)",battery:"rgba(76,175,80,0.4)",grid:"rgba(66,165,245,0.4)",house:"rgba(240,98,146,0.4)",inverter:"rgba(149,117,205,0.4)"},pe={solar:"#ffd54f",battery:"#ff9800",grid_import:"#f44336",grid_export:"#4caf50",house:"#f06292"},$i={solar:5400,battery:7e3,grid:17e3,house:1e4},En={solarPower:0,solarP1:0,solarP2:0,solarV1:0,solarV2:0,solarI1:0,solarI2:0,solarPercent:0,solarToday:0,solarForecastToday:0,solarForecastTomorrow:0,batterySoC:0,batteryPower:0,batteryVoltage:0,batteryCurrent:0,batteryTemp:0,batteryChargeTotal:0,batteryDischargeTotal:0,batteryChargeSolar:0,batteryChargeGrid:0,isGridCharging:!1,timeToEmpty:"",timeToFull:"",balancingState:"standby",balancingTimeRemaining:"",gridChargingPlan:{hasBlocks:!1,totalEnergyKwh:0,totalCostCzk:0,windowLabel:null,durationMinutes:0,currentBlockLabel:null,nextBlockLabel:null,blocks:[]},gridPower:0,gridVoltage:0,gridFrequency:0,gridImportToday:0,gridExportToday:0,gridL1V:0,gridL2V:0,gridL3V:0,gridL1P:0,gridL2P:0,gridL3P:0,spotPrice:0,exportPrice:0,currentTariff:"",housePower:0,houseTodayWh:0,houseL1:0,houseL2:0,houseL3:0,inverterMode:"",inverterGridMode:"unknown",inverterGridLimit:0,inverterTemp:0,bypassStatus:"off",notificationsUnread:0,notificationsError:0,boilerIsUse:!1,boilerPower:0,boilerDayEnergy:0,boilerManualMode:"",boilerInstallPower:3e3,plannerAutoMode:null,lastUpdate:""},Zr={home_1:"Home 1",home_2:"Home 2",home_3:"Home 3",home_ups:"Home UPS"},ar={"Home 1":"home_1","Home 2":"home_2","Home 3":"home_3","Home UPS":"home_ups","Mode 0":"home_1","Mode 1":"home_2","Mode 2":"home_3","Mode 3":"home_ups","HOME I":"home_1","HOME II":"home_2","HOME III":"home_3","HOME UPS":"home_ups",0:"home_1",1:"home_2",2:"home_3",3:"home_ups"},Ke={off:"Vypnuto",on:"Zapnuto",limited:"S omezením"},pn={Vypnuto:"off",Zapnuto:"on",Omezeno:"limited",omezeno:"limited",vypnuto:"off",zapnuto:"on",Off:"off",On:"on",Limited:"limited",off:"off",on:"on",limited:"limited",0:"off",1:"on",2:"limited"},Ns={off:"🚫",on:"💧",limited:"🚰"},Kr={cbb:"Inteligentní",manual:"Manuální"},Qr={cbb:"🤖",manual:"👤"},sr={CBB:"cbb",Manuální:"manual",Manual:"manual",Inteligentní:"cbb"},Rs={set_box_mode:"🏠 Změna režimu boxu",set_grid_delivery:"💧 Změna nastavení přetoků",set_grid_delivery_limit:"🔢 Změna limitu přetoků",set_boiler_mode:"🔥 Změna nastavení bojleru",set_formating_mode:"🔋 Změna nabíjení baterie",set_battery_capacity:"⚡ Změna kapacity baterie"},Hs={CBB:"Inteligentní",Manual:"Manuální",Manuální:"Manuální"},Xr={0:"Žádný",1:"Home 5",2:"Home 6",3:"Home 5 + Home 6",4:"Flexibilita"},Jr={status:"idle",activity:"",queueCount:0,runningRequests:[],queuedRequests:[],allRequests:[],currentBoxMode:"home_1",currentGridDelivery:"off",currentGridLimit:0,currentBoilerMode:"cbb",pendingServices:new Map,changingServices:new Set,gridDeliveryState:{currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},supplementary:{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1}},Ws="probíhá změna";function xn(t){return t.trim().toLowerCase().includes(Ws)}function On(t){const e=t.trim();if(e in pn)return pn[e];const i=e.toLowerCase(),n=Object.entries(pn).find(([r])=>r.toLowerCase()===i);return n?n[1]:i.startsWith("omez")||i.includes("limit")?"limited":i.startsWith("zapn")||i==="on"?"on":i.startsWith("vypn")||i==="off"?"off":"unknown"}function js(t){const e=t.get("grid_mode");if(!e)return null;const i=On(e);return i==="unknown"?null:i}function Vs(t){const e=t.get("grid_limit");if(!e)return null;const i=parseInt(e,10);return Number.isFinite(i)&&i>=0?i:null}function qs(t){return t.changingServices.has("grid_mode")||t.changingServices.has("grid_limit")}function ta(t,e){const{gridModeRaw:i,gridLimit:n}=t,r=i.trim().toLowerCase(),a=r==="unavailable"||r==="unknown"||r==="",s=xn(i),l=qs(e),c=s||l;let u;a||s?u="unknown":u=On(i);let p=null;!a&&Number.isFinite(n)&&n>=0&&(p=n);const f=js(e.pendingServices),y=Vs(e.pendingServices);return{currentLiveDelivery:u,currentLiveLimit:p,pendingDeliveryTarget:f,pendingLimitTarget:y,isTransitioning:c,isUnavailable:a}}function Ys(t){return t.isTransitioning&&t.pendingDeliveryTarget?t.pendingDeliveryTarget:t.currentLiveDelivery}const or=new URLSearchParams(window.location.search),Gs=or.get("sn")||or.get("inverter_sn")||"2206237016";function Ti(t){return`sensor.oig_${Gs}_${t}`}function lr(t,e){var r;const i=Ti(e);return i in t?i:((r=Object.keys(t).filter(a=>a.startsWith(i+"_")).map(a=>({id:a,suffix:parseInt(a.substring(i.length+1),10)})).filter(a=>Number.isFinite(a.suffix)).sort((a,s)=>a.suffix-s.suffix)[0])==null?void 0:r.id)??null}function B(t){if(!(t!=null&&t.state))return 0;const e=parseFloat(t.state);return isNaN(e)?0:e}function Et(t){return!(t!=null&&t.state)||t.state==="unknown"||t.state==="unavailable"?"":t.state}function cr(t,e="on"){if(!(t!=null&&t.state))return!1;const i=t.state.toLowerCase();return i===e||i==="1"||i==="zapnuto"}function Us(t){const e=(t||"").toLowerCase();return e==="charging"?"charging":e==="balancing"||e==="holding"?"holding":e==="completed"?"completed":e==="planned"?"planned":"standby"}function wn(t){return t==="tomorrow"?"zítra":t==="today"?"dnes":""}function dr(t){if(!t)return null;const[e,i]=t.split(":").map(Number);return!Number.isFinite(e)||!Number.isFinite(i)?null:e*60+i}function Zs(t){const e=Number(t.grid_import_kwh??t.grid_charge_kwh??0);if(Number.isFinite(e)&&e>0)return e;const i=Number(t.battery_start_kwh??0),n=Number(t.battery_end_kwh??0);return Number.isFinite(i)&&Number.isFinite(n)?Math.max(0,n-i):0}function ea(t=[]){return[...t].sort((e,i)=>{const n=(e.day==="tomorrow"?1:0)-(i.day==="tomorrow"?1:0);return n!==0?n:(e.time_from||"").localeCompare(i.time_from||"")})}function Ks(t){if(!Array.isArray(t)||t.length===0)return null;const e=ea(t),i=e[0],n=e.at(-1),r=wn(i==null?void 0:i.day),a=wn(n==null?void 0:n.day);if(r===a){const y=r?`${r} `:"";return!(i!=null&&i.time_from)||!(n!=null&&n.time_to)?y.trim()||null:`${y}${i.time_from} – ${n.time_to}`}const s=r?`${r} `:"",l=a?`${a} `:"",c=(i==null?void 0:i.time_from)||"--",u=(n==null?void 0:n.time_to)||"--",p=i?`${s}${c}`:"--",f=n?`${l}${u}`:"--";return`${p} → ${f}`}function Qs(t){if(!Array.isArray(t)||t.length===0)return 0;let e=0;return t.forEach(i=>{const n=dr(i.time_from),r=dr(i.time_to);if(n===null||r===null)return;const a=r-n;a>0&&(e+=a)}),e}function ur(t){const e=wn(t.day),i=e?`${e} `:"",n=t.time_from||"--",r=t.time_to||"--";return`${i}${n} - ${r}`}function Xs(t){const e=t.find(r=>{const a=(r.status||"").toLowerCase();return a==="running"||a==="active"})||null,i=e?t[t.indexOf(e)+1]||null:t[0]||null;return{runningBlock:e,upcomingBlock:i,shouldShowNext:!!(i&&(!e||i!==e))}}function Js(t){const e=(t==null?void 0:t.attributes)||{},i=Array.isArray(e.charging_blocks)?e.charging_blocks:[],n=ea(i),r=Number(e.total_energy_kwh)||0,a=r>0?r:n.reduce((m,g)=>m+Zs(g),0),s=Number(e.total_cost_czk)||0,l=s>0?s:n.reduce((m,g)=>m+Number(g.total_cost_czk||0),0),c=Ks(n),u=Qs(n),{runningBlock:p,upcomingBlock:f,shouldShowNext:y}=Xs(n);return{hasBlocks:n.length>0,totalEnergyKwh:a,totalCostCzk:l,windowLabel:c,durationMinutes:u,currentBlockLabel:p?ur(p):null,nextBlockLabel:y&&f?ur(f):null,blocks:n}}function to(t){var Un,Zn,Kn,Qn,Xn,Jn;const e=(t==null?void 0:t.states)||t||{},i=os=>e[Ti(os)]||null,n=B(i("actual_fv_p1")),r=B(i("actual_fv_p2")),a=B(i("extended_fve_voltage_1")),s=B(i("extended_fve_voltage_2")),l=B(i("extended_fve_current_1")),c=B(i("extended_fve_current_2")),u=i("solar_forecast"),p=(Un=u==null?void 0:u.attributes)!=null&&Un.today_total_kwh?parseFloat(u.attributes.today_total_kwh)||0:(Zn=u==null?void 0:u.attributes)!=null&&Zn.today_total_sum_kw?parseFloat(u.attributes.today_total_sum_kw)||0:B(u),f=(Kn=u==null?void 0:u.attributes)!=null&&Kn.tomorrow_total_sum_kw?parseFloat(u.attributes.tomorrow_total_sum_kw)||0:(Qn=u==null?void 0:u.attributes)!=null&&Qn.total_tomorrow_kwh&&parseFloat(u.attributes.total_tomorrow_kwh)||0,y=B(i("batt_bat_c")),m=B(i("batt_batt_comp_p")),g=B(i("extended_battery_voltage")),b=B(i("extended_battery_current")),$=B(i("extended_battery_temperature")),S=B(i("computed_batt_charge_energy_today")),_=B(i("computed_batt_discharge_energy_today")),C=B(i("computed_batt_charge_fve_energy_today")),G=B(i("computed_batt_charge_grid_energy_today")),K=i("grid_charging_planned"),w=cr(K),j=Et(i("time_to_empty")),L=Et(i("time_to_full")),z=i("battery_balancing"),Y=Us((Xn=z==null?void 0:z.attributes)==null?void 0:Xn.current_state),V=Et({state:(Jn=z==null?void 0:z.attributes)==null?void 0:Jn.time_remaining}),N=Js(K),wt=B(i("actual_aci_wtotal")),Yt=B(i("extended_grid_voltage")),an=B(i("ac_in_aci_f")),sn=B(i("ac_in_ac_ad")),St=B(i("ac_in_ac_pd")),Ae=B(i("ac_in_aci_vr")),Ie=B(i("ac_in_aci_vs")),yt=B(i("ac_in_aci_vt")),Yn=B(i("actual_aci_wr")),Gt=B(i("actual_aci_ws")),Ut=B(i("actual_aci_wt")),Aa=B(i("spot_price_current_15min")),Ia=B(i("export_price_current_15min")),Ba=Et(i("current_tariff")),Fa=B(i("actual_aco_p")),Na=B(i("ac_out_en_day")),Ra=B(i("ac_out_aco_pr")),Ha=B(i("ac_out_aco_ps")),Wa=B(i("ac_out_aco_pt")),ja=Et(i("box_prms_mode")),Va=lr(e,"invertor_prms_to_grid")||Ti("invertor_prms_to_grid"),qa=lr(e,"invertor_prm1_p_max_feed_grid")||Ti("invertor_prm1_p_max_feed_grid"),on=e[Va],ln=e[qa],Ya=(on==null?void 0:on.state)??"",Ga=parseFloat((ln==null?void 0:ln.state)??"")||0,Gn=ta({gridModeRaw:Ya,gridLimit:Ga},{pendingServices:new Map,changingServices:new Set}),Ua=Gn.currentLiveDelivery,Za=Gn.currentLiveLimit??0,Ka=B(i("box_temp")),Qa=Et(i("bypass_status"))||"off",Xa=B(i("notification_count_unread")),Ja=B(i("notification_count_error")),cn=i("boiler_is_use"),ts=cn?cr(cn)||Et(cn)==="Zapnuto":!1,es=B(i("boiler_current_cbb_w")),is=B(i("boiler_day_w")),ns=Et(i("boiler_manual_mode")),rs=B(i("boiler_install_power"))||3e3,as=i("real_data_update"),ss=Et(as);return{solarPower:n+r,solarP1:n,solarP2:r,solarV1:a,solarV2:s,solarI1:l,solarI2:c,solarPercent:B(i("dc_in_fv_proc")),solarToday:B(i("dc_in_fv_ad")),solarForecastToday:p,solarForecastTomorrow:f,batterySoC:y,batteryPower:m,batteryVoltage:g,batteryCurrent:b,batteryTemp:$,batteryChargeTotal:S,batteryDischargeTotal:_,batteryChargeSolar:C,batteryChargeGrid:G,isGridCharging:w,timeToEmpty:j,timeToFull:L,balancingState:Y,balancingTimeRemaining:V,gridChargingPlan:N,gridPower:wt,gridVoltage:Yt,gridFrequency:an,gridImportToday:sn,gridExportToday:St,gridL1V:Ae,gridL2V:Ie,gridL3V:yt,gridL1P:Yn,gridL2P:Gt,gridL3P:Ut,spotPrice:Aa,exportPrice:Ia,currentTariff:Ba,housePower:Fa,houseTodayWh:Na,houseL1:Ra,houseL2:Ha,houseL3:Wa,inverterMode:ja,inverterGridMode:Ua,inverterGridLimit:Za,inverterTemp:Ka,bypassStatus:Qa,notificationsUnread:Xa,notificationsError:Ja,boilerIsUse:ts,boilerPower:es,boilerDayEnergy:is,boilerManualMode:ns,boilerInstallPower:rs,plannerAutoMode:null,lastUpdate:ss}}const Re={};function _i(t,e,i){const n=Math.abs(t),r=Math.min(100,n/e*100),a=Math.max(500,Math.round(3500-r*30));let s=a;return i&&Re[i]!==void 0&&(s=Math.round(.3*a+(1-.3)*Re[i]),Math.abs(s-Re[i])<100&&(s=Re[i])),i&&(Re[i]=s),{active:n>=50,intensity:r,count:Math.max(1,Math.min(4,Math.ceil(1+r/33))),speed:s,size:Math.round(6+r/10),opacity:Math.min(1,.3+r/150)}}function He(t){return Math.abs(t)>=1e3?`${(t/1e3).toFixed(1)} kW`:`${Math.round(t)} W`}function Kt(t){return t>=1e3?`${(t/1e3).toFixed(2)} kWh`:`${Math.round(t)} Wh`}function eo(t){return t==="VT"||t.includes("vysoký")?"⚡ VT":t==="NT"||t.includes("nízký")?"🌙 NT":t?`⏰ ${t}`:"--"}function io(t){return t.includes("Home 1")?{icon:"🏠",text:"Home 1"}:t.includes("Home 2")?{icon:"🔋",text:"Home 2"}:t.includes("Home 3")?{icon:"☀️",text:"Home 3"}:t.includes("UPS")?{icon:"⚡",text:"Home UPS"}:{icon:"⚙️",text:t||"--"}}function no(t){return t==="off"?{display:"Vypnuto",icon:"🚫"}:t==="on"?{display:"Zapnuto",icon:"💧"}:t==="limited"?{display:"Omezeno",icon:"🚰"}:{display:"--",icon:"💧"}}const ro={"HOME I":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"HOME II":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"HOME III":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"rgba(158, 158, 158, 0.18)",label:"DO NOTHING"},"Mode 0":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"Mode 1":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"Mode 2":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"Mode 3":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"}},pr={timeline:[],labels:[],prices:[],exportPrices:[],modeSegments:[],cheapestBuyBlock:null,expensiveBuyBlock:null,bestExportBlock:null,worstExportBlock:null,solar:null,battery:null,initialZoomStart:null,initialZoomEnd:null,currentSpotPrice:0,currentExportPrice:0,avgSpotPrice:0,plannedConsumption:null,whatIf:null,solarForecastTotal:0},hr=new URLSearchParams(window.location.search),$n=hr.get("sn")||hr.get("inverter_sn")||"2206237016";function we(t){return`sensor.oig_${$n}_${t}`}function gr(t){if(!(t!=null&&t.state))return 0;const e=parseFloat(t.state);return isNaN(e)?0:e}function _n(t){const e=t.getFullYear(),i=String(t.getMonth()+1).padStart(2,"0"),n=String(t.getDate()).padStart(2,"0"),r=String(t.getHours()).padStart(2,"0"),a=String(t.getMinutes()).padStart(2,"0"),s=String(t.getSeconds()).padStart(2,"0");return`${e}-${i}-${n}T${r}:${a}:${s}`}const Mi={},ao=5*60*1e3;async function so(t="hybrid"){const e=Mi[t];if(e&&Date.now()-e.ts<ao)return v.debug("Timeline cache hit",{plan:t,age:Math.round((Date.now()-e.ts)/1e3)}),e.data;try{const i=await J.getHass();if(!i)return[];let n;i.callApi?n=await i.callApi("GET",`oig_cloud/battery_forecast/${$n}/timeline?type=active`):n=await J.fetchOIGAPI(`battery_forecast/${$n}/timeline?type=active`);const r=(n==null?void 0:n.active)||(n==null?void 0:n.timeline)||[];return Mi[t]={data:r,ts:Date.now()},v.info("Timeline fetched",{plan:t,points:r.length}),r}catch(i){return v.error("Failed to fetch timeline",i),[]}}function oo(t){Object.keys(Mi).forEach(e=>delete Mi[e])}function lo(t){const e=new Date,i=new Date(e);return i.setMinutes(Math.floor(e.getMinutes()/15)*15,0,0),t.filter(n=>new Date(n.timestamp)>=i)}function co(t){return t.map(e=>{if(!e.timestamp)return new Date;try{const[i,n]=e.timestamp.split("T");if(!i||!n)return new Date;const[r,a,s]=i.split("-").map(Number),[l,c,u=0]=n.split(":").map(Number);return new Date(r,a-1,s,l,c,u)}catch{return new Date}})}function uo(t){const e=t.mode_name||t.mode_planned||t.mode||t.mode_display||null;if(!e||typeof e!="string")return null;const i=e.trim();return i.length?i:null}function po(t){return t.startsWith("HOME ")?t.replace("HOME ","").trim():t==="FULL HOME UPS"||t==="HOME UPS"?"UPS":t==="DO NOTHING"?"DN":t.substring(0,3).toUpperCase()}function ho(t){return ro[t]||{icon:"❓",color:"rgba(158, 158, 158, 0.15)",label:t}}function go(t){if(!t.length)return[];const e=[];let i=null;for(const n of t){const r=uo(n);if(!r){i=null;continue}const a=new Date(n.timestamp),s=new Date(a.getTime()+15*60*1e3);if(i!==null&&i.mode===r)i.end=s;else{const l={mode:r,start:a,end:s};e.push(l),i=l}}return e.map(n=>{const r=ho(n.mode);return{...n,icon:r.icon,color:r.color,label:r.label,shortLabel:po(n.mode)}})}function ki(t,e,i=3){const n=Math.floor(i*60/15);if(t.length<n)return null;let r=null,a=e?1/0:-1/0;for(let s=0;s<=t.length-n;s++){const l=t.slice(s,s+n),c=l.map(p=>p.price),u=c.reduce((p,f)=>p+f,0)/c.length;(e&&u<a||!e&&u>a)&&(a=u,r={start:l[0].timestamp,end:l[l.length-1].timestamp,avg:u,min:Math.min(...c),max:Math.max(...c),values:c,type:"cheapest-buy"})}return r}function fo(t,e){const n=((t==null?void 0:t.states)||{})[we("solar_forecast")];if(!(n!=null&&n.attributes)||!e.length)return null;const r=n.attributes,a=r.today_total_kwh||0,s=r.today_hourly_string1_kw||{},l=r.tomorrow_hourly_string1_kw||{},c=r.today_hourly_string2_kw||{},u=r.tomorrow_hourly_string2_kw||{},p={...s,...l},f={...c,...u},y=(b,$,S)=>b==null||$==null?b||$||0:b+($-b)*S,m=[],g=[];for(const b of e){const $=b.getHours(),S=b.getMinutes(),_=new Date(b);_.setMinutes(0,0,0);const C=_n(_),G=new Date(_);G.setHours($+1);const K=_n(G),w=p[C]||0,j=p[K]||0,L=f[C]||0,z=f[K]||0,Y=S/60;m.push(y(w,j,Y)),g.push(y(L,z,Y))}return{string1:m,string2:g,todayTotal:a,hasString1:m.some(b=>b>0),hasString2:g.some(b=>b>0)}}function mo(t,e){if(!t.length)return{arrays:{baseline:[],solarCharge:[],gridCharge:[],gridNet:[],consumption:[]},initialZoomStart:null,initialZoomEnd:null};const i=t.map(f=>new Date(f.timestamp)),n=i[0].getTime(),r=i[i.length-1],a=r?r.getTime():n,s=[],l=[],c=[],u=[],p=[];for(const f of e){const y=_n(f),m=t.find(g=>g.timestamp===y);if(m){const g=(m.battery_capacity_kwh??m.battery_soc??m.battery_start)||0,b=m.solar_charge_kwh||0,$=m.grid_charge_kwh||0,S=typeof m.grid_net=="number"?m.grid_net:(m.grid_import||0)-(m.grid_export||0),_=m.load_kwh??m.consumption_kwh??m.load??0,C=(Number(_)||0)*4;s.push(g-b-$),l.push(b),c.push($),u.push(S),p.push(C)}else s.push(null),l.push(null),c.push(null),u.push(null),p.push(null)}return{arrays:{baseline:s,solarCharge:l,gridCharge:c,gridNet:u,consumption:p},initialZoomStart:n,initialZoomEnd:a}}function bo(t){const e=(t==null?void 0:t.states)||{},i=e[we("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const n=i.attributes,r=n.planned_consumption_today??null,a=n.planned_consumption_tomorrow??null,s=n.profile_today||"Žádný profil",l=e[we("ac_out_en_day")],c=l==null?void 0:l.state,p=(c&&c!=="unavailable"&&parseFloat(c)||0)/1e3,f=p+(r||0),y=(r||0)+(a||0);let m=null;if(f>0&&a!=null){const b=a-f,$=b/f*100;Math.abs($)<5?m="Zítra podobně":b>0?m=`Zítra více (+${Math.abs($).toFixed(0)}%)`:m=`Zítra méně (-${Math.abs($).toFixed(0)}%)`}return{todayConsumedKwh:p,todayPlannedKwh:r,todayTotalKwh:f,tomorrowKwh:a,totalPlannedKwh:y,profile:s!=="Žádný profil"&&s!=="Neznámý profil"?s:"Žádný profil",trendText:m}}function yo(t){const i=((t==null?void 0:t.states)||{})[we("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const r=i.attributes.mode_optimization||{},a=r.alternatives||{},s=r.total_cost_czk||0,l=r.total_savings_vs_home_i_czk||0,c=a["DO NOTHING"],u=(c==null?void 0:c.current_mode)||null;return{totalCost:s,totalSavings:l,alternatives:a,activeMode:u}}async function vo(t,e="hybrid"){const i=performance.now();v.info("[Pricing] loadPricingData START");try{const n=await so(e),r=lo(n);if(!r.length)return v.warn("[Pricing] No timeline data"),pr;const a=r.map(N=>({timestamp:N.timestamp,price:N.spot_price_czk||0})),s=r.map(N=>({timestamp:N.timestamp,price:N.export_price_czk||0}));let l=co(a);const c=go(r),u=ki(a,!0,3);u&&(u.type="cheapest-buy");const p=ki(a,!1,3);p&&(p.type="expensive-buy");const f=ki(s,!1,3);f&&(f.type="best-export");const y=ki(s,!0,3);y&&(y.type="worst-export");const m=r.map(N=>new Date(N.timestamp)),g=new Set([...l,...m].map(N=>N.getTime()));l=Array.from(g).sort((N,wt)=>N-wt).map(N=>new Date(N));const{arrays:b,initialZoomStart:$,initialZoomEnd:S}=mo(r,l),_=fo(t,l),C=(t==null?void 0:t.states)||{},G=gr(C[we("spot_price_current_15min")]),K=gr(C[we("export_price_current_15min")]),w=a.length>0?a.reduce((N,wt)=>N+wt.price,0)/a.length:0,j=bo(t),L=yo(t),z=(_==null?void 0:_.todayTotal)||0,Y={timeline:r,labels:l,prices:a,exportPrices:s,modeSegments:c,cheapestBuyBlock:u,expensiveBuyBlock:p,bestExportBlock:f,worstExportBlock:y,solar:_,battery:b,initialZoomStart:$,initialZoomEnd:S,currentSpotPrice:G,currentExportPrice:K,avgSpotPrice:w,plannedConsumption:j,whatIf:L,solarForecastTotal:z},V=(performance.now()-i).toFixed(0);return v.info(`[Pricing] loadPricingData COMPLETE in ${V}ms`,{points:r.length,segments:c.length}),Y}catch(n){return v.error("[Pricing] loadPricingData failed",n),pr}}const fr={workday_spring:"Pracovní den - Jaro",workday_summer:"Pracovní den - Léto",workday_autumn:"Pracovní den - Podzim",workday_winter:"Pracovní den - Zima",weekend_spring:"Víkend - Jaro",weekend_summer:"Víkend - Léto",weekend_autumn:"Víkend - Podzim",weekend_winter:"Víkend - Zima"},xo={fve:"FVE",grid:"Síť",alternative:"Alternativa"},kn=new URLSearchParams(window.location.search),wo=kn.get("sn")||kn.get("inverter_sn")||"2206237016",Di=kn.get("entry_id")||"";function $o(t,e,i){return isNaN(t)?e:Math.max(e,Math.min(i,t))}function _o(t,e,i){if(t==null)return null;const n=e-i;if(n<=0)return null;const r=(t-i)/n*100;return $o(r,0,100)}function Ei(t){if(!t)return"--:--";const e=t instanceof Date?t:new Date(t);return isNaN(e.getTime())?"--:--":e.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}function mr(t){if(!t)return"--";const e=new Date(t);return isNaN(e.getTime())?"--":e.toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}function Sn(t,e){return`${Ei(t)}–${Ei(e)}`}function br(t){return xo[t||""]||t||"--"}function ia(t){return t?Object.values(t).reduce((e,i)=>e+(parseFloat(String(i))||0),0):0}function na(t){return t?Object.entries(t).map(([i,n])=>({hour:parseInt(i,10),value:parseFloat(String(n))||0})).filter(i=>isFinite(i.value)).sort((i,n)=>n.value-i.value).slice(0,3).filter(i=>i.value>0).map(i=>i.hour).sort((i,n)=>i-n):[]}function We(t){if(!t)return null;const e=t.split(":").map(i=>parseInt(i,10));return e.length<2||!isFinite(e[0])||!isFinite(e[1])?null:e[0]*60+e[1]}function yr(t,e,i){return e===null||i===null?!1:e<=i?t>=e&&t<i:t>=e||t<i}async function ko(){try{return Di?await J.fetchOIGAPI(`/${Di}/boiler_profile`):(v.warn("[Boiler] No entry_id — cannot fetch boiler profile"),null)}catch(t){return v.warn("[Boiler] Failed to fetch profile",{err:t}),null}}async function So(){try{return Di?await J.fetchOIGAPI(`/${Di}/boiler_plan`):(v.warn("[Boiler] No entry_id — cannot fetch boiler plan"),null)}catch(t){return v.warn("[Boiler] Failed to fetch plan",{err:t}),null}}function Co(t,e,i){const n=t||e,r=n==null?void 0:n.state,a=(r==null?void 0:r.temperatures)||{},s=(r==null?void 0:r.energy_state)||{},l=isFinite(a.upper_zone??a.top)?a.upper_zone??a.top??null:null,c=isFinite(a.lower_zone??a.bottom)?a.lower_zone??a.bottom??null:null,u=isFinite(s.avg_temp)?s.avg_temp??null:null,p=isFinite(s.energy_needed_kwh)?s.energy_needed_kwh??null:null,f=i.targetTempC??60,y=i.coldInletTempC??10,m=_o(u,f,y),g=(t==null?void 0:t.slots)||[],b=(t==null?void 0:t.next_slot)||Po(g);let $="Neplánováno";if(b){const _=br(b.recommended_source);$=`${Sn(b.start,b.end)} (${_})`}const S=br((r==null?void 0:r.recommended_source)||(b==null?void 0:b.recommended_source));return{currentTemp:(r==null?void 0:r.current_temp)||45,targetTemp:(r==null?void 0:r.target_temp)||f,heating:(r==null?void 0:r.heating)||!1,tempTop:l,tempBottom:c,avgTemp:u,heatingPercent:m,energyNeeded:p,planCost:(t==null?void 0:t.estimated_cost_czk)??null,nextHeating:$,recommendedSource:S,nextProfile:(r==null?void 0:r.next_profile)||"",nextStart:(r==null?void 0:r.next_start)||""}}function Po(t){if(!Array.isArray(t))return null;const e=Date.now();return t.find(i=>{const n=new Date(i.end||i.end_time||"").getTime(),r=i.consumption_kwh??i.avg_consumption_kwh??0;return n>e&&r>0})||null}function To(t){var y,m,g;if(!((y=t==null?void 0:t.slots)!=null&&y.length))return null;const e=t.slots.map(b=>({start:b.start||"",end:b.end||"",consumptionKwh:b.consumption_kwh??b.avg_consumption_kwh??0,recommendedSource:b.recommended_source||"",spotPrice:isFinite(b.spot_price)?b.spot_price??null:null,tempTop:b.temp_top,soc:b.soc})),i=e.filter(b=>b.consumptionKwh>0),n=parseFloat(String(t.total_consumption_kwh))||0,r=parseFloat(String(t.fve_kwh))||0,a=parseFloat(String(t.grid_kwh))||0,s=parseFloat(String(t.alt_kwh))||0,l=parseFloat(String(t.estimated_cost_czk))||0;let c="Mix: --";if(n>0){const b=Math.round(r/n*100),$=Math.round(a/n*100),S=Math.round(s/n*100);c=`Mix: FVE ${b}% · Síť ${$}% · Alt ${S}%`}const u=e.filter(b=>b.consumptionKwh>0&&b.spotPrice!==null).map(b=>({slot:b,price:b.spotPrice}));let p="--",f="--";if(u.length){const b=u.reduce((S,_)=>_.price<S.price?_:S),$=u.reduce((S,_)=>_.price>S.price?_:S);p=`${Sn(b.slot.start,b.slot.end)} (${b.price.toFixed(2)} Kč/kWh)`,f=`${Sn($.slot.start,$.slot.end)} (${$.price.toFixed(2)} Kč/kWh)`}return{slots:e,totalConsumptionKwh:n,fveKwh:r,gridKwh:a,altKwh:s,estimatedCostCzk:l,nextSlot:t.next_slot?{start:t.next_slot.start||"",end:t.next_slot.end||"",consumptionKwh:t.next_slot.consumption_kwh||0,recommendedSource:t.next_slot.recommended_source||"",spotPrice:t.next_slot.spot_price??null}:null,planStart:mr((m=t.slots[0])==null?void 0:m.start),planEnd:mr((g=t.slots[t.slots.length-1])==null?void 0:g.end),sourceDigest:c,activeSlotCount:i.length,cheapestSpot:p,mostExpensiveSpot:f}}function Mo(t){const e=parseFloat(String(t==null?void 0:t.fve_kwh))||0,i=parseFloat(String(t==null?void 0:t.grid_kwh))||0,n=parseFloat(String(t==null?void 0:t.alt_kwh))||0,r=e+i+n;return{fveKwh:e,gridKwh:i,altKwh:n,fvePercent:r>0?e/r*100:0,gridPercent:r>0?i/r*100:0,altPercent:r>0?n/r*100:0}}function Do(t,e,i){var y;const n=(t==null?void 0:t.summary)||{},r=(y=t==null?void 0:t.profiles)==null?void 0:y[i],a=(r==null?void 0:r.hourly_avg)||{},s=n.predicted_total_kwh??ia(a),l=n.peak_hours??na(a),c=isFinite(n.water_liters_40c)?n.water_liters_40c??null:null,u=n.circulation_windows||[],p=u.length?u.map(m=>`${m.start}–${m.end}`).join(", "):"--";let f="--";if(u.length){const m=new Date,g=m.getHours()*60+m.getMinutes();if(u.some($=>{const S=We($.start),_=We($.end);return yr(g,S,_)})){const $=u.find(S=>{const _=We(S.start),C=We(S.end);return yr(g,_,C)});f=$?`ANO (do ${$.end})`:"ANO"}else{const $=e==null?void 0:e.state,S=$==null?void 0:$.circulation_recommended;let _=1/0,C=null;for(const G of u){const K=We(G.start);if(K===null)continue;let w=K-g;w<0&&(w+=24*60),w<_&&(_=w,C=G)}S&&C?f=`DOPORUČENO (${C.start}–${C.end})`:C?f=`Ne (další ${C.start}–${C.end})`:f="Ne"}}return{predictedTodayKwh:s,peakHours:l,waterLiters40c:c,circulationWindows:p,circulationNow:f}}function Eo(t){const e=(t==null?void 0:t.config)||{},i=isFinite(e.volume_l)?e.volume_l??null:null;return{volumeL:i,heaterPowerW:null,targetTempC:isFinite(e.target_temp_c)?e.target_temp_c??null:null,deadlineTime:e.deadline_time||"--:--",stratificationMode:e.stratification_mode||"--",kCoefficient:i?(i*.001163).toFixed(4):"--",coldInletTempC:isFinite(e.cold_inlet_temp_c)?e.cold_inlet_temp_c??10:10}}function Oo(t){return t!=null&&t.profiles?Object.entries(t.profiles).map(([e,i])=>({id:e,name:i.name||e,targetTemp:i.target_temp||55,startTime:i.start_time||"06:00",endTime:i.end_time||"22:00",days:i.days||[1,1,1,1,1,0,0],enabled:i.enabled!==!1})):[]}function zo(t){var n;const e=[],i=((n=t==null?void 0:t.summary)==null?void 0:n.today_hours)||[];for(let r=0;r<24;r++){const a=i.includes(r);e.push({hour:r,temp:a?55:25,heating:a})}return e}function Lo(t,e){var s;const i=(s=t==null?void 0:t.profiles)==null?void 0:s[e],n=["Po","Út","St","Čt","Pá","So","Ne"];if(!i)return n.map(l=>({day:l,hours:Array(24).fill(0)}));const r=i.heatmap||[];let a=[];if(r.length>0)a=r.map(l=>l.map(c=>c&&typeof c=="object"?parseFloat(c.consumption)||0:parseFloat(String(c))||0));else{const l=i.hourly_avg||{};a=Array.from({length:7},()=>Array.from({length:24},(c,u)=>parseFloat(String(l[u]||0))))}return n.map((l,c)=>({day:l,hours:a[c]||Array(24).fill(0)}))}function Ao(t,e){var u;const i=(u=t==null?void 0:t.profiles)==null?void 0:u[e],n=(t==null?void 0:t.summary)||{},r=(i==null?void 0:i.hourly_avg)||{},a=Array.from({length:24},(p,f)=>parseFloat(String(r[f]||0))),s=n.predicted_total_kwh??ia(r),l=n.peak_hours??na(r),c=isFinite(n.avg_confidence)?n.avg_confidence??null:null;return{hourlyAvg:a,peakHours:l,predictedTotalKwh:s,confidence:c,daysTracked:7}}function Io(t,e){var p,f,y;if(!((p=t==null?void 0:t.slots)!=null&&p.length)||!(e!=null&&e.length))return{fve:"--",grid:"--"};const i=(f=t.slots[0])==null?void 0:f.start,n=(y=t.slots[t.slots.length-1])==null?void 0:y.end,r=i?new Date(i).getTime():null,a=n?new Date(n).getTime():null,s=e.filter(m=>{if(!r||!a)return!0;const g=m.timestamp||m.time;if(!g)return!1;const b=new Date(g).getTime();return b>=r&&b<=a}),l=m=>{const g=[];let b=null;for(const $ of s){const S=$.timestamp||$.time;if(!S)continue;const _=new Date(S),C=m($);C&&!b?b={start:_,end:_}:C&&b?b.end=_:!C&&b&&(g.push(b),b=null)}return b&&g.push(b),g.length?g.map($=>`${Ei($.start)}–${Ei(new Date($.end.getTime()+15*6e4))}`).join(", "):"--"},c=l(m=>(parseFloat(m.solar_kwh??m.solar_charge_kwh??0)||0)>0),u=l(m=>(parseFloat(m.grid_charge_kwh??0)||0)>0);return{fve:c,grid:u}}async function Bo(){return v.info("[Boiler] Planning heating..."),await J.callService("oig_cloud","plan_boiler_heating",{})}async function Fo(){return v.info("[Boiler] Applying plan..."),await J.callService("oig_cloud","apply_boiler_plan",{})}async function No(){return v.info("[Boiler] Canceling plan..."),await J.callService("oig_cloud","cancel_boiler_plan",{})}async function Ro(t){const[e,i]=await Promise.all([ko(),So()]);let n=null;try{const l=await J.loadBatteryTimeline(wo,"active");n=(l==null?void 0:l.active)||l||null,Array.isArray(n)&&n.length===0&&(n=null)}catch{}const r=(e==null?void 0:e.current_category)||Object.keys((e==null?void 0:e.profiles)||{})[0]||"workday_summer",a=Object.keys((e==null?void 0:e.profiles)||{}),s=Eo(e);return{state:Co(i,e,s),plan:To(i),energyBreakdown:Mo(i),predictedUsage:Do(e,i,r),config:s,profiles:Oo(e||i),heatmap:zo(i||e),heatmap7x24:Lo(e,r),profiling:Ao(e,r),currentCategory:r,availableCategories:a,forecastWindows:Io(i,n)}}const vr={efficiency:null,health:null,balancing:null,costComparison:null};function ra(t){const e=Bt();if(!e)return null;const i=e.findSensorId("battery_efficiency"),n=e.get(i);if(!n)return v.debug("Battery efficiency sensor not found"),null;const r=n.attributes||{},a=r.efficiency_last_month_pct!=null?{efficiency:Number(r.efficiency_last_month_pct??0),charged:Number(r.last_month_charge_kwh??0),discharged:Number(r.last_month_discharge_kwh??0),losses:Number(r.losses_last_month_kwh??0)}:null,s=r.efficiency_current_month_pct!=null?{efficiency:Number(r.efficiency_current_month_pct??0),charged:Number(r.current_month_charge_kwh??0),discharged:Number(r.current_month_discharge_kwh??0),losses:Number(r.losses_current_month_kwh??0)}:null,l=a??s;if(!l)return null;const c=a?"last_month":"current_month",u=a&&s?s.efficiency-a.efficiency:0;return{efficiency:l.efficiency,charged:l.charged,discharged:l.discharged,losses:l.losses,lossesPct:r[c==="last_month"?"losses_last_month_pct":"losses_current_month_pct"]??0,trend:u,period:c,currentMonthDays:r.current_month_days??0,lastMonth:a,currentMonth:s}}function aa(t){const e=Bt();if(!e)return null;const i=e.findSensorId("battery_health"),n=e.get(i);if(!n)return v.debug("Battery health sensor not found"),null;const r=parseFloat(n.state)||0,a=n.attributes||{};let s,l;return r>=95?(s="excellent",l="Vynikající"):r>=90?(s="good",l="Dobrý"):r>=80?(s="fair",l="Uspokojivý"):(s="poor",l="Špatný"),{soh:r,capacity:a.capacity_p80_last_20??a.current_capacity_kwh??0,nominalCapacity:a.current_capacity_kwh??0,minCapacity:a.capacity_p20_last_20??0,measurementCount:a.measurement_count??0,lastAnalysis:a.last_analysis??"",qualityScore:a.quality_score??null,sohMethod:a.soh_selection_method??null,sohMethodDescription:a.soh_method_description??null,measurementHistory:Array.isArray(a.measurement_history)?a.measurement_history:[],degradation3m:a.degradation_3_months_percent??null,degradation6m:a.degradation_6_months_percent??null,degradation12m:a.degradation_12_months_percent??null,degradationPerYear:a.degradation_per_year_percent??null,estimatedEolDate:a.estimated_eol_date??null,yearsTo80Pct:a.years_to_80pct??null,trendConfidence:a.trend_confidence??null,status:s,statusLabel:l}}function xr(t,e,i){if(!t||!e)return{daysRemaining:null,progressPercent:null,intervalDays:i||null};try{const n=new Date(t),r=new Date(e),a=new Date;if(isNaN(n.getTime())||isNaN(r.getTime()))return{daysRemaining:null,progressPercent:null,intervalDays:i||null};const s=r.getTime()-n.getTime(),l=a.getTime()-n.getTime(),c=Math.max(0,Math.round((r.getTime()-a.getTime())/(1e3*60*60*24))),u=s>0?Math.min(100,Math.max(0,Math.round(l/s*100))):null,p=i||Math.round(s/(1e3*60*60*24));return{daysRemaining:c,progressPercent:u,intervalDays:p||null}}catch{return{daysRemaining:null,progressPercent:null,intervalDays:i||null}}}function sa(t){const e=Bt();if(!e)return null;const i=e.findSensorId("battery_balancing"),n=e.get(i);if(!n){const c=e.get(e.findSensorId("battery_health")),u=c==null?void 0:c.attributes;if(u!=null&&u.balancing_status){const p=String(u.last_balancing??""),f=u.next_balancing?String(u.next_balancing):null,y=xr(p,f,Number(u.balancing_interval_days??0));return{status:String(u.balancing_status??"unknown"),lastBalancing:p,cost:Number(u.balancing_cost??0),nextScheduled:f,...y,estimatedNextCost:u.estimated_next_cost!=null?Number(u.estimated_next_cost):null}}return null}const r=n.attributes||{},a=String(r.last_balancing??""),s=r.next_scheduled?String(r.next_scheduled):null,l=xr(a,s,Number(r.interval_days??0));return{status:n.state||"unknown",lastBalancing:a,cost:Number(r.cost??0),nextScheduled:s,...l,estimatedNextCost:r.estimated_next_cost!=null?Number(r.estimated_next_cost):null}}async function Ho(t){var e,i;try{const n=await J.loadUnifiedCostTile(t);if(!n)return null;const r=n.hybrid??n,a=r.today??{},s=Math.round((a.actual_cost_so_far??a.actual_total_cost??0)*100)/100,l=a.future_plan_cost??0,c=a.plan_total_cost??s+l,u=((e=r.tomorrow)==null?void 0:e.plan_total_cost)??null;let p=null,f=null,y=null,m=null;try{const g=await J.loadBatteryTimeline(t,"active"),b=(i=g==null?void 0:g.timeline_extended)==null?void 0:i.yesterday;b!=null&&b.summary&&(p=b.summary.planned_total_cost??null,f=b.summary.actual_total_cost??null,y=b.summary.delta_cost??null,m=b.summary.accuracy_pct??null)}catch{v.debug("Yesterday analysis not available")}return{activePlan:"hybrid",actualSpent:s,planTotalCost:c,futurePlanCost:l,tomorrowCost:u,yesterdayPlannedCost:p,yesterdayActualCost:f,yesterdayDelta:y,yesterdayAccuracy:m}}catch(n){return v.error("Failed to fetch cost comparison",n),null}}async function Wo(t){const e=ra(),i=aa(),n=sa(),r=await Ho(t);return{efficiency:e,health:i,balancing:n,costComparison:r}}function jo(t){return{efficiency:ra(),health:aa(),balancing:sa()}}const Je={severity:0,warningsCount:0,eventType:"",description:"",instruction:"",onset:"",expires:"",etaHours:0,allWarnings:[],effectiveSeverity:0},Vo={vítr:"💨",déšť:"🌧️",sníh:"❄️",bouřky:"⛈️",mráz:"🥶",vedro:"🥵",mlha:"🌫️",náledí:"🧊",laviny:"🏔️"};function oa(t){const e=t.toLowerCase();for(const[i,n]of Object.entries(Vo))if(e.includes(i))return n;return"⚠️"}const la={0:"Bez výstrahy",1:"Nízká",2:"Zvýšená",3:"Vysoká",4:"Extrémní"},Oi={0:"#4CAF50",1:"#8BC34A",2:"#FF9800",3:"#f44336",4:"#9C27B0"};function qo(t){const e=Bt();if(!e)return Je;const i=`sensor.oig_${t}_chmu_warning_level`,n=e.get(i);if(!n)return v.debug("ČHMÚ sensor not found",{entityId:i}),Je;const r=parseInt(n.state,10)||0,a=n.attributes||{},s=Number(a.warnings_count??0),l=String(a.event_type??""),c=String(a.description??""),u=String(a.instruction??""),p=String(a.onset??""),f=String(a.expires??""),y=Number(a.eta_hours??0),m=a.all_warnings_details??[],g=Array.isArray(m)?m.map(S=>({event_type:S.event_type??S.event??"",severity:S.severity??r,description:S.description??"",instruction:S.instruction??"",onset:S.onset??"",expires:S.expires??"",eta_hours:S.eta_hours??0})):[],b=l.toLowerCase().includes("žádná výstraha");return{severity:r,warningsCount:s,eventType:l,description:c,instruction:u,onset:p,expires:f,etaHours:y,allWarnings:g,effectiveSeverity:s===0||b?0:r}}const ca={"HOME I":{icon:"🏠",color:"#4CAF50",label:"HOME I"},"HOME II":{icon:"⚡",color:"#2196F3",label:"HOME II"},"HOME III":{icon:"🔋",color:"#9C27B0",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"#FF9800",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"#FF9800",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"#9E9E9E",label:"DO NOTHING"}},da={yesterday:"📊 Včera",today:"📆 Dnes",tomorrow:"📅 Zítra",history:"📈 Historie",detail:"💎 Detail"};function wr(t){return{modeHistorical:t.mode_historical??t.mode??"",modePlanned:t.mode_planned??"",modeMatch:t.mode_match??!1,status:t.status??"planned",startTime:t.start_time??"",endTime:t.end_time??"",durationHours:t.duration_hours??0,costHistorical:t.cost_historical??null,costPlanned:t.cost_planned??null,costDelta:t.cost_delta??null,solarKwh:t.solar_total_kwh??0,consumptionKwh:t.consumption_total_kwh??0,gridImportKwh:t.grid_import_total_kwh??0,gridExportKwh:t.grid_export_total_kwh??0,intervalReasons:Array.isArray(t.interval_reasons)?t.interval_reasons:[]}}function Si(t){return{plan:(t==null?void 0:t.plan)??0,actual:(t==null?void 0:t.actual)??null,hasActual:(t==null?void 0:t.has_actual)??!1,unit:(t==null?void 0:t.unit)??""}}function Yo(t){const e=(t==null?void 0:t.metrics)??{};return{overallAdherence:(t==null?void 0:t.overall_adherence)??0,modeSwitches:(t==null?void 0:t.mode_switches)??0,totalCost:(t==null?void 0:t.total_cost)??0,metrics:{cost:Si(e.cost),solar:Si(e.solar),consumption:Si(e.consumption),grid:Si(e.grid)},completedSummary:t!=null&&t.completed_summary?{count:t.completed_summary.count??0,totalCost:t.completed_summary.total_cost??0,adherencePct:t.completed_summary.adherence_pct??0}:void 0,plannedSummary:t!=null&&t.planned_summary?{count:t.planned_summary.count??0,totalCost:t.planned_summary.total_cost??0}:void 0,progressPct:t==null?void 0:t.progress_pct,actualTotalCost:t==null?void 0:t.actual_total_cost,planTotalCost:t==null?void 0:t.plan_total_cost,vsPlanPct:t==null?void 0:t.vs_plan_pct,eodPrediction:t!=null&&t.eod_prediction?{predictedTotal:t.eod_prediction.predicted_total??0,predictedSavings:t.eod_prediction.predicted_savings??0}:void 0}}function Go(t){return t?{date:t.date??"",modeBlocks:Array.isArray(t.mode_blocks)?t.mode_blocks.map(wr):[],summary:Yo(t.summary),metadata:t.metadata?{activePlan:t.metadata.active_plan??"hybrid",comparisonPlanAvailable:t.metadata.comparison_plan_available}:void 0,comparison:t.comparison?{plan:t.comparison.plan??"",modeBlocks:Array.isArray(t.comparison.mode_blocks)?t.comparison.mode_blocks.map(wr):[]}:void 0}:null}async function Uo(t,e,i="hybrid"){try{const n=await J.loadDetailTabs(t,e,i);if(!n)return null;const r=n[e]??n;return Go(r)}catch(n){return v.error(`Failed to load timeline tab: ${e}`,n),null}}const Cn={tiles_left:[null,null,null,null,null,null],tiles_right:[null,null,null,null,null,null],left_count:4,right_count:4,visible:!0,version:1},ua="oig_dashboard_tiles";function Zo(t,e){return e==="W"&&Math.abs(t)>=1e3?{value:(t/1e3).toFixed(2),unit:"kW"}:e==="Wh"&&Math.abs(t)>=1e3?{value:(t/1e3).toFixed(2),unit:"kWh"}:e==="W"||e==="Wh"?{value:Math.round(t).toString(),unit:e}:{value:t.toFixed(1),unit:e}}async function Ko(){var t;try{const e=await J.callWS({type:"call_service",domain:"oig_cloud",service:"get_dashboard_tiles",service_data:{},return_response:!0}),i=(t=e==null?void 0:e.response)==null?void 0:t.config;if(i&&typeof i=="object")return v.debug("Loaded tiles config from HA"),_r(i)}catch(e){v.debug("WS tile config load failed, trying localStorage",{error:e.message})}try{const e=localStorage.getItem(ua);if(e){const i=JSON.parse(e);return v.debug("Loaded tiles config from localStorage"),_r(i)}}catch{v.debug("localStorage tile config load failed")}return Cn}async function $r(t){try{return localStorage.setItem(ua,JSON.stringify(t)),await J.callService("oig_cloud","save_dashboard_tiles",{config:JSON.stringify(t)}),v.info("Tiles config saved"),!0}catch(e){return v.error("Failed to save tiles config",e),!1}}function _r(t){return{tiles_left:Array.isArray(t.tiles_left)?t.tiles_left.slice(0,6):Cn.tiles_left,tiles_right:Array.isArray(t.tiles_right)?t.tiles_right.slice(0,6):Cn.tiles_right,left_count:typeof t.left_count=="number"?t.left_count:4,right_count:typeof t.right_count=="number"?t.right_count:4,visible:t.visible!==!1,version:t.version??1}}function hn(t){var l;const e=Bt();if(!e)return{value:"--",unit:"",isActive:!1,rawValue:0};const i=e.get(t);if(!i||i.state==="unavailable"||i.state==="unknown")return{value:"--",unit:"",isActive:!1,rawValue:0};const n=i.state,r=String(((l=i.attributes)==null?void 0:l.unit_of_measurement)??""),a=parseFloat(n)||0;if(i.entity_id.startsWith("switch.")||i.entity_id.startsWith("binary_sensor."))return{value:n==="on"?"Zapnuto":"Vypnuto",unit:"",isActive:n==="on",rawValue:n==="on"?1:0};const s=Zo(a,r);return{value:s.value,unit:s.unit,isActive:a!==0,rawValue:a}}function je(t){const e=(i,n)=>{var a,s;const r=[];for(let l=0;l<n;l++){const c=i[l];if(!c)continue;const u=hn(c.entity_id),p={};if((a=c.support_entities)!=null&&a.top_right){const f=hn(c.support_entities.top_right);p.topRight={value:f.value,unit:f.unit}}if((s=c.support_entities)!=null&&s.bottom_right){const f=hn(c.support_entities.bottom_right);p.bottomRight={value:f.value,unit:f.unit}}r.push({config:c,value:u.value,unit:u.unit,isActive:u.isActive,isZero:u.rawValue===0,formattedValue:u.unit?`${u.value} ${u.unit}`:u.value,supportValues:p})}return r};return{left:e(t.tiles_left,t.left_count),right:e(t.tiles_right,t.right_count)}}async function Qo(t,e="toggle"){const i=t.split(".")[0];return J.callService(i,e,{entity_id:t})}function ve(t){return t==null||Number.isNaN(t)?"-- Wh":Math.abs(t)>=1e3?`${(t/1e3).toFixed(2)} kWh`:`${Math.round(t)} Wh`}function it(t,e="CZK"){return t==null||Number.isNaN(t)?`-- ${e}`:`${t.toFixed(2)} ${e}`}function xe(t,e=0){return t==null||Number.isNaN(t)?"-- %":`${t.toFixed(e)} %`}const Xo={fridge:"❄️","fridge-outline":"❄️",dishwasher:"🍽️","washing-machine":"🧺","tumble-dryer":"🌪️",stove:"🔥",microwave:"📦","coffee-maker":"☕",kettle:"🫖",toaster:"🍞",lightbulb:"💡","lightbulb-outline":"💡",lamp:"🪔","ceiling-light":"💡","floor-lamp":"🪔","led-strip":"✨","led-strip-variant":"✨","wall-sconce":"💡",chandelier:"💡",thermometer:"🌡️",thermostat:"🌡️",radiator:"♨️","radiator-disabled":"❄️","heat-pump":"♨️","air-conditioner":"❄️",fan:"🌀",hvac:"♨️",fire:"🔥",snowflake:"❄️","lightning-bolt":"⚡",flash:"⚡",battery:"🔋","battery-charging":"🔋","battery-50":"🔋","solar-panel":"☀️","solar-power":"☀️","meter-electric":"⚡","power-plug":"🔌","power-socket":"🔌",car:"🚗","car-electric":"🚘","car-battery":"🔋","ev-station":"🔌","ev-plug-type2":"🔌",garage:"🏠","garage-open":"🏠",door:"🚪","door-open":"🚪",lock:"🔒","lock-open":"🔓","shield-home":"🛡️",cctv:"📹",camera:"📹","motion-sensor":"👁️","alarm-light":"🚨",bell:"🔔","window-closed":"🪟","window-open":"🪟",blinds:"🪟","blinds-open":"🪟",curtains:"🪟","roller-shade":"🪟",television:"📺",speaker:"🔊","speaker-wireless":"🔊",music:"🎵","volume-high":"🔊",cast:"📡",chromecast:"📡","router-wireless":"📡",wifi:"📶","access-point":"📡",lan:"🌐",network:"🌐","home-assistant":"🏠",water:"💧","water-percent":"💧","water-boiler":"♨️","water-pump":"💧",shower:"🚿",toilet:"🚽",faucet:"🚰",pipe:"🔧","weather-sunny":"☀️","weather-cloudy":"☁️","weather-night":"🌙","weather-rainy":"🌧️","weather-snowy":"❄️","weather-windy":"💨",information:"ℹ️","help-circle":"❓","alert-circle":"⚠️","checkbox-marked-circle":"✅","toggle-switch":"🔘",power:"⚡",sync:"🔄"};function zi(t){const e=t.replace(/^mdi:/,"");return Xo[e]||"⚙️"}function gn(t,e){let i=!1;return(...n)=>{i||(t(...n),i=!0,setTimeout(()=>i=!1,e))}}async function Ve(t,e=3,i=1e3){let n;for(let r=0;r<=e;r++)try{return await t()}catch(a){if(n=a,a instanceof Error&&(a.message.includes("401")||a.message.includes("403")))throw a;if(r<e){const s=Math.min(i*Math.pow(2,r),5e3);await new Promise(l=>setTimeout(l,s))}}throw n}class Jo{constructor(){this.state={...Jr,pendingServices:new Map,changingServices:new Set},this.listeners=new Set,this.watcherUnsub=null,this.queueUpdateInterval=null,this.started=!1}start(){this.started||(this.started=!0,this.watcherUnsub=ee.onEntityChange((e,i)=>{e&&this.shouldRefreshShield(e)&&this.refresh()}),this.refresh(),this.queueUpdateInterval=window.setInterval(()=>{this.state.allRequests.length>0&&this.notify()},1e3),v.debug("ShieldController started"))}stop(){var e;(e=this.watcherUnsub)==null||e.call(this),this.watcherUnsub=null,this.queueUpdateInterval!==null&&(clearInterval(this.queueUpdateInterval),this.queueUpdateInterval=null),this.started=!1,v.debug("ShieldController stopped")}subscribe(e){return this.listeners.add(e),e(this.state),()=>this.listeners.delete(e)}getState(){return this.state}shouldRefreshShield(e){return["service_shield_","box_prms_mode","box_mode_extended","box_prm2_app","boiler_manual_mode","invertor_prms_to_grid","invertor_prm1_p_max_feed_grid"].some(n=>e.includes(n))}readSupplementaryState(e){const i=e.findSensorId("box_mode_extended"),n=e.get(i);if(!n||n.state==="unavailable"||n.state==="unknown"||n.state==="")return{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1};const r=n.attributes??{};return{home_grid_v:r.home_grid_v===!0,home_grid_vi:r.home_grid_vi===!0,flexibilita:r.flexibilita===!0,available:!0}}refresh(){const e=Bt();if(e)try{const i=e.findSensorId("service_shield_activity"),n=e.get(i),r=(n==null?void 0:n.attributes)??{},a=r.running_requests??[],s=r.queued_requests??[],l=e.findSensorId("service_shield_status"),c=e.findSensorId("service_shield_queue"),u=e.getString(l).value,p=e.getNumeric(c).value,f=e.getString(e.findSensorId("box_prms_mode")).value,y=e.getString(e.findSensorId("invertor_prms_to_grid")).value,m=e.getNumeric(e.findSensorId("invertor_prm1_p_max_feed_grid")).value,g=e.getString(e.findSensorId("boiler_manual_mode")).value,b=ar[f.trim()]??"home_1",$=sr[g.trim()]??"cbb",S=a.map((V,N)=>this.parseRequest(V,N,!0)),_=s.map((V,N)=>this.parseRequest(V,N+a.length,!1)),C=[...S,..._],G=new Map,K=new Set;for(const V of C){const N=this.parseServiceRequest(V);N&&!G.has(N.type)&&(G.set(N.type,N.targetValue),K.add(N.type))}const w=u==="Running"||u==="running",z=ta({gridModeRaw:y,gridLimit:m},{pendingServices:G,changingServices:K,shieldStatus:w?"running":"idle"}),Y=xn(y)||z.currentLiveDelivery==="unknown"?this.state.currentGridDelivery:z.currentLiveDelivery;this.state={status:w?"running":"idle",activity:(n==null?void 0:n.state)??"",queueCount:p,runningRequests:S,queuedRequests:_,allRequests:C,currentBoxMode:b,currentGridDelivery:Y,currentGridLimit:z.currentLiveLimit??0,currentBoilerMode:$,pendingServices:G,changingServices:K,gridDeliveryState:z,supplementary:this.readSupplementaryState(e)},this.notify()}catch(i){v.error("ShieldController refresh failed",i)}}parseRequest(e,i,n){const r=e||{},a=r.service??"",l=(Array.isArray(r.changes)?r.changes:[]).map(g=>typeof g=="string"?g:String(g??"")).filter(g=>g.length>0),c=r.started_at??r.queued_at??r.created_at??r.timestamp??r.created??"",u=Array.isArray(r.targets)?r.targets.map(g=>({param:String((g==null?void 0:g.param)??""),value:String((g==null?void 0:g.value)??(g==null?void 0:g.to)??""),entityId:String((g==null?void 0:g.entity_id)??(g==null?void 0:g.entityId)??""),from:String((g==null?void 0:g.from)??""),to:String((g==null?void 0:g.to)??(g==null?void 0:g.value)??""),current:String((g==null?void 0:g.current)??"")})):[],p=this.extractRequestParams(r.params),f=this.extractGridDeliveryStep(r,p),y=this.resolveRequestTargetValue(r,u,p,f);let m="mode_change";if(a.includes("set_box_mode")){const g=this.extractRequestParams(r.params);m=(g==null?void 0:g.home_grid_v)!==void 0||(g==null?void 0:g.home_grid_vi)!==void 0||Array.isArray(r.targets)&&r.targets.some($=>($==null?void 0:$.param)==="app")?"supplementary_toggle":"mode_change"}else a.includes("set_grid_delivery")&&!a.includes("limit")?m="grid_delivery":a.includes("grid_delivery_limit")||a.includes("set_grid_delivery")?m="grid_limit":a.includes("set_boiler_mode")?m="boiler_mode":a.includes("set_formating_mode")&&(m="battery_formating");return{id:`${a}_${i}_${c}`,type:m,status:n?"running":"queued",service:a,targetValue:y,changes:l,createdAt:c,position:i+1,description:typeof r.description=="string"?r.description:void 0,params:p,targets:u,traceId:typeof r.trace_id=="string"?r.trace_id:void 0,gridDeliveryStep:f}}parseServiceRequest(e){var u,p;const i=e.service;if(!i)return null;const n=e.changes.length>0?e.changes[0]:"",r=e.params,a=e.gridDeliveryStep,s=this.extractStructuredTarget(e);if(i.includes("set_grid_delivery")&&s)return s;if(i.includes("set_grid_delivery")&&n.includes("p_max_feed_grid")){const f=n.match(/→\s*'?(\d+)'?/),y=f?f[1]:e.targetValue;return y?{type:"grid_limit",targetValue:y}:null}const l=n.match(/→\s*'([^']+)'/),c=l?l[1]:e.targetValue||"";if(i.includes("set_box_mode")){if(((u=e.targets)==null?void 0:u.some(y=>y.param==="app"))||(r==null?void 0:r.home_grid_v)!==void 0||(r==null?void 0:r.home_grid_vi)!==void 0){const y=(p=e.targets)==null?void 0:p.find(b=>b.param==="app"),m=(y==null?void 0:y.to)||e.targetValue;return{type:"supplementary",targetValue:Xr[m]??m??""}}return{type:"box_mode",targetValue:c}}if(i.includes("set_boiler_mode"))return{type:"boiler_mode",targetValue:c};if(i.includes("set_grid_delivery")&&n.includes("prms_to_grid"))return{type:"grid_mode",targetValue:c};if(i.includes("set_grid_delivery")){if(a==="limit"){const y=this.normalizeNumericTargetValue((r==null?void 0:r.limit)??e.targetValue);return y?{type:"grid_limit",targetValue:y}:null}if(a==="mode"){const y=this.normalizeModeTargetValue((r==null?void 0:r.mode)??e.targetValue);return y?{type:"grid_mode",targetValue:y}:null}const f=n.match(/→\s*'?(\d+)'?/);return f?{type:"grid_limit",targetValue:f[1]}:e.targetValue&&/^\d+$/.test(e.targetValue.trim())?{type:"grid_limit",targetValue:e.targetValue}:{type:"grid_mode",targetValue:c}}return null}extractRequestParams(e){if(!(!e||typeof e!="object"||Array.isArray(e)))return e}extractGridDeliveryStep(e,i){const n=(e==null?void 0:e.grid_delivery_step)??(i==null?void 0:i._grid_delivery_step);return typeof n=="string"?n:void 0}resolveRequestTargetValue(e,i,n,r){const a=this.extractStructuredTarget({service:(e==null?void 0:e.service)??"",targetValue:"",params:n,targets:i,gridDeliveryStep:r});if(a!=null&&a.targetValue)return a.targetValue;const s=e.target_value??e.target_display;return typeof s=="string"?s:""}extractStructuredTarget(e){if(!e.service.includes("set_grid_delivery"))return null;const i=e.gridDeliveryStep,n=e.params,r=e.targets??[];if(i==="limit"){const l=this.findTargetValue(r,["limit"]),c=this.normalizeNumericTargetValue(l??(n==null?void 0:n.limit)??e.targetValue);return c?{type:"grid_limit",targetValue:c}:null}if(i==="mode"){const l=this.findTargetValue(r,["mode"]),c=this.normalizeModeTargetValue(l??(n==null?void 0:n.mode)??e.targetValue);return c?{type:"grid_mode",targetValue:c}:null}const a=this.findTargetValue(r,["limit"]);if(a){const l=this.normalizeNumericTargetValue(a);if(l)return{type:"grid_limit",targetValue:l}}const s=this.findTargetValue(r,["mode"]);if(s){const l=this.normalizeModeTargetValue(s);if(l)return{type:"grid_mode",targetValue:l}}return null}findTargetValue(e,i){const n=new Set(i),r=e.find(a=>n.has(a.param));return(r==null?void 0:r.to)||(r==null?void 0:r.value)||void 0}normalizeNumericTargetValue(e){if(typeof e=="number"&&Number.isFinite(e))return String(Math.round(e));if(typeof e!="string")return"";const i=e.trim().match(/(\d+)/);return i?i[1]:""}normalizeModeTargetValue(e){if(typeof e!="string")return"";const i=e.trim();switch(i.toLowerCase()){case"off":return"Vypnuto";case"on":return"Zapnuto";case"limited":return"Omezeno";default:return i}}isLimitedGridDeliveryActiveOrPending(){const e=this.state.gridDeliveryState;if(e.pendingDeliveryTarget==="limited"||e.pendingLimitTarget!==null||e.currentLiveDelivery==="limited"||e.currentLiveDelivery==="unknown"&&(Ys(e)==="limited"||this.state.currentGridDelivery==="limited"))return!0;const i=Bt();if(i){const n=i.getString(i.findSensorId("invertor_prms_to_grid")).value;if(!xn(n)&&On(n)==="limited")return!0}return!1}needsGridModeChangeForLimitedRequest(){return!this.isLimitedGridDeliveryActiveOrPending()}getBoxModeButtonState(e){const i=this.state.pendingServices.get("box_mode");return i?ar[i]===e?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoxMode===e?"active":"idle"}getGridDeliveryButtonState(e){return this.getGridDeliveryButtonStateV2(e)}getGridDeliveryButtonStateV2(e){const i=this.state.gridDeliveryState,r=this.state.status==="running"?"processing":"pending",a=i.pendingDeliveryTarget,s=i.pendingLimitTarget,l=i.currentLiveDelivery;return a!==null?a===e?r:e==="limited"&&l==="limited"||e==="limited"&&l==="unknown"&&this.state.currentGridDelivery==="limited"?"active":"disabled-by-service":s!==null?e==="limited"?r:"disabled-by-service":l===e?"active":"idle"}getBoilerModeButtonState(e){const i=this.state.pendingServices.get("boiler_mode");return i?sr[i]===e?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoilerMode===e?"active":"idle"}isAnyServiceChanging(){return this.state.changingServices.size>0}shouldProceedWithQueue(){return this.state.queueCount<3?!0:window.confirm(`⚠️ VAROVÁNÍ: Fronta již obsahuje ${this.state.queueCount} úkolů!

Každá změna může trvat až 10 minut.
Opravdu chcete přidat další úkol?`)}async setBoxMode(e){if(this.state.currentBoxMode===e&&!this.state.changingServices.has("box_mode"))return!1;const i=await J.callService("oig_cloud","set_box_mode",{mode:e,acknowledgement:!0});return i&&this.refresh(),i}async setGridDelivery(e,i){const n={acknowledgement:!0,warning:!0};e==="limited"&&i!=null?(this.needsGridModeChangeForLimitedRequest()&&(n.mode=e),n.limit=i):i!=null?n.limit=i:n.mode=e;const r=await J.callService("oig_cloud","set_grid_delivery",n);return r&&this.refresh(),r}async setBoilerMode(e){if(this.state.currentBoilerMode===e&&!this.state.changingServices.has("boiler_mode"))return!1;const i=await J.callService("oig_cloud","set_boiler_mode",{mode:e,acknowledgement:!0});return i&&this.refresh(),i}async removeFromQueue(e){const i=await J.callService("oig_cloud","shield_remove_from_queue",{position:e});return i&&this.refresh(),i}async setSupplementaryToggle(e,i){const n=await J.callService("oig_cloud","set_box_mode",{[e]:i,acknowledgement:!0});return n&&this.refresh(),n}notify(){for(const e of this.listeners)try{e(this.state)}catch(i){v.error("ShieldController listener error",i)}}}const X=new Jo;var tl=Object.defineProperty,el=Object.getOwnPropertyDescriptor,oe=(t,e,i,n)=>{for(var r=n>1?void 0:n?el(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&tl(e,i,r),r};const mt=Q;let Ot=class extends M{constructor(){super(...arguments),this.title="Energetické Toky",this.time="",this.showStatus=!1,this.alertCount=0,this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1}onStatusClick(){this.dispatchEvent(new CustomEvent("status-click",{bubbles:!0}))}onEditClick(){this.dispatchEvent(new CustomEvent("edit-click",{bubbles:!0}))}onResetClick(){this.dispatchEvent(new CustomEvent("reset-click",{bubbles:!0}))}onToggleLeftPanel(){this.dispatchEvent(new CustomEvent("toggle-left-panel",{bubbles:!0}))}onToggleRightPanel(){this.dispatchEvent(new CustomEvent("toggle-right-panel",{bubbles:!0}))}render(){const t=this.alertCount>0?"warning":"ok";return d`
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
      background: ${mt(o.bgPrimary)};
      border-bottom: 1px solid ${mt(o.divider)};
      gap: 12px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
      color: ${mt(o.textPrimary)};
      margin: 0;
    }

    .title-icon { font-size: 20px; }

    .version {
      font-size: 11px;
      color: ${mt(o.textSecondary)};
      background: ${mt(o.bgSecondary)};
      padding: 2px 6px;
      border-radius: 4px;
    }

    .time {
      font-size: 13px;
      color: ${mt(o.textSecondary)};
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
      background: ${mt(o.warning)};
      color: #fff;
    }

    .status-badge.error {
      background: ${mt(o.error)};
      color: #fff;
    }

    .status-badge.ok {
      background: ${mt(o.success)};
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
      color: ${mt(o.textSecondary)};
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: ${mt(o.bgSecondary)};
      color: ${mt(o.textPrimary)};
    }

    .action-btn.active {
      background: ${mt(o.accent)};
      color: #fff;
    }
  `;oe([h({type:String})],Ot.prototype,"title",2);oe([h({type:String})],Ot.prototype,"time",2);oe([h({type:Boolean})],Ot.prototype,"showStatus",2);oe([h({type:Number})],Ot.prototype,"alertCount",2);oe([h({type:Boolean})],Ot.prototype,"leftPanelCollapsed",2);oe([h({type:Boolean})],Ot.prototype,"rightPanelCollapsed",2);Ot=oe([D("oig-header")],Ot);function pa(t,e){let i=null;return function(...n){i!==null&&clearTimeout(i),i=window.setTimeout(()=>{t.apply(this,n),i=null},e)}}var il=Object.defineProperty,nl=Object.getOwnPropertyDescriptor,gi=(t,e,i,n)=>{for(var r=n>1?void 0:n?nl(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&il(e,i,r),r};const kr="oig_v2_theme";let ie=class extends M{constructor(){super(...arguments),this.mode="auto",this.isDark=!1,this.breakpoint="desktop",this.width=1280,this.mediaQuery=null,this.resizeObserver=null,this.debouncedResize=pa(this.updateBreakpoint.bind(this),100),this.onMediaChange=t=>{this.mode==="auto"&&(this.isDark=t.matches,this.dispatchEvent(new CustomEvent("theme-changed",{detail:{isDark:this.isDark}})))},this.onThemeChange=()=>{this.detectTheme()}}connectedCallback(){super.connectedCallback(),this.loadTheme(),this.setupMediaQuery(),this.setupResizeObserver(),this.detectTheme(),window.addEventListener("oig-theme-change",this.onThemeChange)}disconnectedCallback(){var t,e;super.disconnectedCallback(),(t=this.mediaQuery)==null||t.removeEventListener("change",this.onMediaChange),(e=this.resizeObserver)==null||e.disconnect(),window.removeEventListener("oig-theme-change",this.onThemeChange)}loadTheme(){const t=localStorage.getItem(kr);t&&["light","dark","auto"].includes(t)&&(this.mode=t)}saveTheme(){localStorage.setItem(kr,this.mode)}setupMediaQuery(){this.mediaQuery=window.matchMedia("(prefers-color-scheme: dark)"),this.mediaQuery.addEventListener("change",this.onMediaChange)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(this.debouncedResize),this.resizeObserver.observe(document.documentElement),this.updateBreakpoint()}updateBreakpoint(){this.width=window.innerWidth,this.breakpoint=ye(this.width)}detectTheme(){this.mode==="auto"?this.isDark=window.matchMedia("(prefers-color-scheme: dark)").matches:this.isDark=this.mode==="dark"}setTheme(t){this.mode=t,this.saveTheme(),this.detectTheme(),this.dispatchEvent(new CustomEvent("theme-changed",{detail:{mode:t,isDark:this.isDark}})),v.info("Theme changed",{mode:t,isDark:this.isDark})}getThemeInfo(){return{mode:this.mode,isDark:this.isDark,breakpoint:this.breakpoint,width:this.width}}render(){return d`
      <slot></slot>
    `}};ie.styles=P`
    :host {
      display: contents;
    }
  `;gi([h({type:String})],ie.prototype,"mode",2);gi([x()],ie.prototype,"isDark",2);gi([x()],ie.prototype,"breakpoint",2);gi([x()],ie.prototype,"width",2);ie=gi([D("oig-theme-provider")],ie);var rl=Object.defineProperty,al=Object.getOwnPropertyDescriptor,zn=(t,e,i,n)=>{for(var r=n>1?void 0:n?al(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&rl(e,i,r),r};let ti=class extends M{constructor(){super(...arguments),this.tabs=[],this.activeTab=""}onTabClick(t){t!==this.activeTab&&(this.activeTab=t,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tabId:t},bubbles:!0})))}isActive(t){return this.activeTab===t}render(){return d`
      ${this.tabs.map(t=>d`
        <button 
          class="tab ${this.isActive(t.id)?"active":""}"
          @click=${()=>this.onTabClick(t.id)}
        >
          ${t.icon?d`<span class="tab-icon">${t.icon}</span>`:null}
          <span>${t.label}</span>
        </button>
      `)}
    `}};ti.styles=P`
    :host {
      display: flex;
      gap: 8px;
      padding: 0 16px;
      background: ${Q(o.bgPrimary)};
      border-bottom: 1px solid ${Q(o.divider)};
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
      color: ${Q(o.textSecondary)};
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab:hover {
      color: ${Q(o.textPrimary)};
      background: ${Q(o.bgSecondary)};
    }

    .tab.active {
      color: ${Q(o.accent)};
      border-bottom-color: ${Q(o.accent)};
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
  `;zn([h({type:Array})],ti.prototype,"tabs",2);zn([h({type:String})],ti.prototype,"activeTab",2);ti=zn([D("oig-tabs")],ti);var sl=Object.defineProperty,ol=Object.getOwnPropertyDescriptor,Ln=(t,e,i,n)=>{for(var r=n>1?void 0:n?ol(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&sl(e,i,r),r};const ll="oig_v2_layout_",fn=Q;let ei=class extends M{constructor(){super(...arguments),this.editable=!1,this.breakpoint="desktop",this.onResize=pa(()=>{this.breakpoint=ye(window.innerWidth)},100)}connectedCallback(){super.connectedCallback(),this.breakpoint=ye(window.innerWidth),window.addEventListener("resize",this.onResize)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("resize",this.onResize)}updated(t){t.has("breakpoint")&&this.setAttribute("breakpoint",this.breakpoint)}resetLayout(){const t=`${ll}${this.breakpoint}`;localStorage.removeItem(t),this.requestUpdate()}render(){return d`<slot></slot>`}};ei.styles=P`
    :host {
      display: grid;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      background: ${fn(o.bgSecondary)};
    }

    :host([breakpoint='mobile']) { grid-template-columns: 1fr; }
    :host([breakpoint='tablet']) { grid-template-columns: repeat(2, 1fr); }
    :host([breakpoint='desktop']) { grid-template-columns: repeat(3, 1fr); }

    .grid-item {
      position: relative;
      background: ${fn(o.cardBg)};
      border-radius: 8px;
      box-shadow: ${fn(o.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .grid-item.editable { cursor: move; }
    .grid-item.editable:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .grid-item.dragging { opacity: 0.8; transform: scale(1.02); z-index: 100; }

    @media (max-width: 768px) {
      :host { gap: 12px; padding: 12px; }
    }
  `;Ln([h({type:Boolean})],ei.prototype,"editable",2);Ln([x()],ei.prototype,"breakpoint",2);ei=Ln([D("oig-grid")],ei);const cl={off:"Vypnuto",on:"Zapnuto",limited:"Omezeno",unknown:"?"};function Qe(t){return cl[t]??t}const An=t=>{const e=t.trim();return e?e.endsWith("W")?e:`${e}W`:""};function dl(t){const e=t.isUnavailable;let i;e||t.currentLiveDelivery==="unknown"?i="?":t.currentLiveDelivery==="limited"&&t.currentLiveLimit!==null?i=`Omezeno ${t.currentLiveLimit}W`:i=Qe(t.currentLiveDelivery);const n=t.pendingDeliveryTarget!==null,r=t.pendingLimitTarget!==null;let a=null,s=null;return n&&r?(a=`Ve frontě: ${Qe(t.pendingDeliveryTarget)} / ${t.pendingLimitTarget}W`,s="both"):r?(a=`Ve frontě: limit ${An(String(t.pendingLimitTarget))}`,s="limit"):n&&(a=`Ve frontě: ${Qe(t.pendingDeliveryTarget)}`,s="mode"),{currentText:i,currentUnavailable:e,pendingText:a,pendingKind:s,isTransitioning:t.isTransitioning}}function ul(t){const e=t.isUnavailable;let i;e||t.currentLiveDelivery==="unknown"?i="?":t.currentLiveDelivery==="limited"&&t.currentLiveLimit!==null?i=`Omezeno ${t.currentLiveLimit}W`:i=Qe(t.currentLiveDelivery);const n=!e&&t.currentLiveDelivery==="limited";let r=null,a=null;!e&&t.currentLiveLimit!==null&&(a=`${t.currentLiveLimit}W`,r=n?"Aktivní limit":"Nastavený limit");let s=null,l=null;return t.pendingDeliveryTarget!==null&&(s=`Ve frontě: ${Qe(t.pendingDeliveryTarget)}`),t.pendingLimitTarget!==null&&(l=`Ve frontě: limit ${An(String(t.pendingLimitTarget))}`),{currentModeText:i,limitLabel:r,limitValue:a,showLimitAsActive:n,isUnavailable:e,isTransitioning:t.isTransitioning,pendingModeText:s,pendingLimitText:l}}function Sr(t,e){const i=e.has("box_mode"),n=t.get("box_mode"),r=e.has("grid_mode")||e.has("grid_limit"),a=t.get("grid_limit"),s=t.get("grid_mode");let l=null;if(a){const c=An(a);l=c?`→ ${c}`:null}else s&&(l=`→ ${s}`);return{inverterModeChanging:i,inverterModeText:n?`→ ${n}`:null,gridExportChanging:r,gridExportText:l}}var pl=Object.defineProperty,hl=Object.getOwnPropertyDescriptor,Ji=(t,e,i,n)=>{for(var r=n>1?void 0:n?hl(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&pl(e,i,r),r};let $e=class extends M{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1}get fillHeight(){return Math.max(0,Math.min(100,this.soc))/100*54}get fillY(){return 13+(54-this.fillHeight)}render(){return d`
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
    `}};$e.styles=P`
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
  `;Ji([h({type:Number})],$e.prototype,"soc",2);Ji([h({type:Boolean})],$e.prototype,"charging",2);Ji([h({type:Boolean})],$e.prototype,"gridCharging",2);$e=Ji([D("oig-battery-gauge")],$e);var gl=Object.defineProperty,fl=Object.getOwnPropertyDescriptor,tn=(t,e,i,n)=>{for(var r=n>1?void 0:n?fl(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&gl(e,i,r),r};let _e=class extends M{constructor(){super(...arguments),this.power=0,this.percent=0,this.maxPower=5400}get isNight(){return this.percent<2}get level(){return this.percent<2?"night":this.percent<20?"low":this.percent<65?"mid":"high"}get sunColor(){const t=this.level;return t==="low"?"#b0bec5":t==="mid"?"#ffd54f":"#ffb300"}get rayLen(){const t=this.level;return t==="low"?4:t==="mid"?7:10}get rayOpacity(){const t=this.level;return t==="low"?.5:t==="mid"?.8:1}get coreRadius(){const t=this.level;return t==="low"?7:t==="mid"?9:11}renderMoon(){return Tt`
      <circle cx="24" cy="24" r="20" fill="#3949ab" opacity="0.28"/>
      <g class="moon-body">
        <path d="M24 6 A18 18 0 1 0 24 42 A13 13 0 1 1 24 6Z" fill="#cfd8dc" opacity="0.95"/>
      </g>
      <circle class="star" cx="7" cy="10" r="1.5" fill="#e8eaf6" style="animation-delay:0s"/>
      <circle class="star" cx="41" cy="7" r="1.8" fill="#e8eaf6" style="animation-delay:0.7s"/>
      <circle class="star" cx="5" cy="30" r="1.2" fill="#c5cae9" style="animation-delay:1.4s"/>
      <circle class="star" cx="6" cy="44" r="1.0" fill="#c5cae9" style="animation-delay:2.1s"/>
      <circle class="star" cx="42" cy="39" r="1.3" fill="#e8eaf6" style="animation-delay:2.8s"/>
    `}renderSun(){const i=this.coreRadius,n=i+3,r=n+this.rayLen,a=this.sunColor,s=this.rayOpacity,c=[0,45,90,135,180,225,270,315].map(p=>{const f=p*Math.PI/180,y=24+Math.cos(f)*n,m=24+Math.sin(f)*n,g=24+Math.cos(f)*r,b=24+Math.sin(f)*r;return Tt`
        <line class="ray"
          x1="${y}" y1="${m}" x2="${g}" y2="${b}"
          stroke="${a}" stroke-width="2.5" opacity="${s}"
        />
      `}),u=this.level==="low";return Tt`
      <!-- Paprsky obaleny v <g> pro CSS rotaci -->
      <g class="rays-group">
        ${c}
      </g>
      <circle class="sun-core" cx="${24}" cy="${24}" r="${i}" fill="${a}" />
      ${u?Tt`
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
    `}};_e.styles=P`
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
  `;tn([h({type:Number})],_e.prototype,"power",2);tn([h({type:Number})],_e.prototype,"percent",2);tn([h({type:Number})],_e.prototype,"maxPower",2);_e=tn([D("oig-solar-icon")],_e);var ml=Object.defineProperty,bl=Object.getOwnPropertyDescriptor,fi=(t,e,i,n)=>{for(var r=n>1?void 0:n?bl(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&ml(e,i,r),r};let ne=class extends M{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1,this.discharging=!1,this._clipId=`batt-clip-${Math.random().toString(36).slice(2)}`}get fillColor(){return this.gridCharging?"#42a5f5":this.soc>50?"#4caf50":this.soc>20?"#ff9800":"#f44336"}get fillHeight(){return Math.max(1,Math.min(100,this.soc)/100*48)}get fillY(){return 14+(48-this.fillHeight)}get stripeColor(){return this.gridCharging?"#90caf9":"#a5d6a7"}render(){const t=this.charging||this.gridCharging,e=this.soc>=25;return d`
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
        ${t?Tt`
          <rect
            class="charge-stripe active"
            x="4" y="52" width="24" height="8" rx="2"
            fill="${this.stripeColor}"
            clip-path="url(#${this._clipId})"
          />
        `:""}

        <!-- SoC text uvnitř -->
        ${e?Tt`
          <text class="soc-text" x="16" y="${this.fillY+this.fillHeight/2}">
            ${Math.round(this.soc)}%
          </text>
        `:""}
      </svg>
    `}};ne.styles=P`
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
  `;fi([h({type:Number})],ne.prototype,"soc",2);fi([h({type:Boolean})],ne.prototype,"charging",2);fi([h({type:Boolean})],ne.prototype,"gridCharging",2);fi([h({type:Boolean})],ne.prototype,"discharging",2);ne=fi([D("oig-battery-icon")],ne);var yl=Object.defineProperty,vl=Object.getOwnPropertyDescriptor,ha=(t,e,i,n)=>{for(var r=n>1?void 0:n?vl(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&yl(e,i,r),r};let Li=class extends M{constructor(){super(...arguments),this.power=0}get mode(){return this.power>50?"importing":this.power<-50?"exporting":"idle"}render(){const t=this.mode;return d`
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
    `}};Li.styles=P`
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
  `;ha([h({type:Number})],Li.prototype,"power",2);Li=ha([D("oig-grid-icon")],Li);var xl=Object.defineProperty,wl=Object.getOwnPropertyDescriptor,en=(t,e,i,n)=>{for(var r=n>1?void 0:n?wl(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&xl(e,i,r),r};let ke=class extends M{constructor(){super(...arguments),this.power=0,this.maxPower=1e4,this.boilerActive=!1}get percent(){return Math.min(100,this.power/Math.max(1,this.maxPower)*100)}get fillColor(){const t=this.percent;return t<15?"#546e7a":t<40?"#f06292":t<70?"#e91e63":"#c62828"}get level(){const t=this.percent;return t<15?"low":t<60?"mid":"high"}get windowColor(){const t=this.level;return t==="low"?"#37474f":t==="mid"?"#ffd54f":"#ffb300"}render(){const t=this.percent,e=24,i=22,n=Math.max(1,t/100*e),r=i+(e-n),a=this.level;return d`
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
        ${this.boilerActive?Tt`
          <circle class="boiler-dot" cx="10" cy="43" r="3.5" fill="#ff5722" opacity="0.9"/>
          <text x="10" y="43" text-anchor="middle" dominant-baseline="middle" font-size="5" fill="white">🔥</text>
        `:""}
      </svg>
    `}};ke.styles=P`
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
  `;en([h({type:Number})],ke.prototype,"power",2);en([h({type:Number})],ke.prototype,"maxPower",2);en([h({type:Boolean})],ke.prototype,"boilerActive",2);ke=en([D("oig-house-icon")],ke);var $l=Object.defineProperty,_l=Object.getOwnPropertyDescriptor,mi=(t,e,i,n)=>{for(var r=n>1?void 0:n?_l(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&$l(e,i,r),r};let re=class extends M{constructor(){super(...arguments),this.mode="",this.bypassActive=!1,this.hasAlarm=!1,this.plannerAuto=!1}get modeType(){return this.hasAlarm?"alarm":this.bypassActive?"bypass":this.mode.includes("UPS")?"ups":"normal"}render(){const t=this.modeType;return d`
      <svg viewBox="0 0 48 48">
        <!-- Hlavní box střídače -->
        <rect
          class="box ${t}"
          x="4" y="8" width="40" height="34" rx="5"
        />

        <!-- Sinusoida výstupu -->
        <path class="sine-out ${t}" d="${"M 10,28 C 14,28 14,20 18,22 C 22,24 22,32 26,32 C 30,32 30,20 34,22 C 38,24 38,28 38,28"}"/>

        <!-- UPS blesk -->
        ${t==="ups"?Tt`
          <path class="ups-bolt active"
            d="M 25,12 L 20,26 L 24,26 L 23,36 L 28,22 L 24,22 Z"
          />
        `:""}

        <!-- Bypass výstraha — trojúhelník nahoře -->
        ${t==="bypass"?Tt`
          <polygon
            class="warning-triangle active"
            points="24,6 18,16 30,16"
          />
          <text x="24" y="15" text-anchor="middle" dominant-baseline="middle"
            font-size="6" font-weight="bold" fill="#fff">!</text>
        `:""}

        <!-- Alarm kroužek -->
        ${t==="alarm"?Tt`
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
    `}};re.styles=P`
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
  `;mi([h({type:String})],re.prototype,"mode",2);mi([h({type:Boolean})],re.prototype,"bypassActive",2);mi([h({type:Boolean})],re.prototype,"hasAlarm",2);mi([h({type:Boolean})],re.prototype,"plannerAuto",2);re=mi([D("oig-inverter-icon")],re);var kl=Object.defineProperty,Sl=Object.getOwnPropertyDescriptor,Dt=(t,e,i,n)=>{for(var r=n>1?void 0:n?Sl(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&kl(e,i,r),r};const H=Q,Cr=new URLSearchParams(window.location.search),Cl=Cr.get("sn")||Cr.get("inverter_sn")||"2206237016",Pl=t=>`sensor.oig_${Cl}_${t}`,mn="oig_v2_flow_layout_",Qt=["solar","battery","inverter","grid","house"],Tl={solar:{top:"0%",left:"0%"},house:{top:"0%",left:"65%"},inverter:{top:"35%",left:"35%"},grid:{top:"70%",left:"0%"},battery:{top:"70%",left:"65%"}};function A(t){return()=>J.openEntityDialog(Pl(t))}let xt=class extends M{constructor(){super(...arguments),this.data=En,this.editMode=!1,this.pendingServices=new Map,this.changingServices=new Set,this.shieldStatus="idle",this.shieldQueueCount=0,this.gridDeliveryState={currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},this.shieldUnsub=null,this.expandedNodes=new Set,this.customPositions={},this.draggedNodeId=null,this.dragStartX=0,this.dragStartY=0,this.dragStartTop=0,this.dragStartLeft=0,this.onShieldUpdate=t=>{this.pendingServices=t.pendingServices,this.changingServices=t.changingServices,this.shieldStatus=t.status,this.shieldQueueCount=t.queueCount,this.gridDeliveryState=t.gridDeliveryState},this.handleDragStart=t=>{if(!this.editMode)return;t.preventDefault(),t.stopPropagation();const i=t.target.closest(".node");if(!i)return;const n=this.findNodeId(i);if(!n)return;this.draggedNodeId=n,i.classList.add("dragging");const r=i.getBoundingClientRect();this.dragStartX=t.clientX,this.dragStartY=t.clientY,this.dragStartTop=r.top,this.dragStartLeft=r.left},this.handleTouchStart=t=>{if(!this.editMode)return;t.preventDefault();const i=t.target.closest(".node");if(!i)return;const n=this.findNodeId(i);if(!n)return;this.draggedNodeId=n,i.classList.add("dragging");const r=t.touches[0],a=i.getBoundingClientRect();this.dragStartX=r.clientX,this.dragStartY=r.clientY,this.dragStartTop=a.top,this.dragStartLeft=a.left},this.handleDragMove=t=>{!this.draggedNodeId||!this.editMode||(t.preventDefault(),this.updateDragPosition(t.clientX,t.clientY))},this.handleTouchMove=t=>{if(!this.draggedNodeId||!this.editMode)return;t.preventDefault();const e=t.touches[0];this.updateDragPosition(e.clientX,e.clientY)},this.handleDragEnd=t=>{var n;if(!this.draggedNodeId||!this.editMode)return;const e=(n=this.shadowRoot)==null?void 0:n.querySelector(".flow-grid"),i=e==null?void 0:e.querySelector(`.node-${this.draggedNodeId}`);i&&i.classList.remove("dragging"),this.saveLayout(),this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0})),this.draggedNodeId=null},this.handleTouchEnd=t=>{this.handleDragEnd(t)}}connectedCallback(){super.connectedCallback(),this.loadSavedLayout(),this.shieldUnsub=X.subscribe(this.onShieldUpdate)}disconnectedCallback(){var t;super.disconnectedCallback(),this.removeDragListeners(),(t=this.shieldUnsub)==null||t.call(this),this.shieldUnsub=null}updated(t){t.has("editMode")&&(this.editMode?(this.setAttribute("editmode",""),this.loadSavedLayout(),this.requestUpdate(),this.updateComplete.then(()=>this.applySavedPositions())):(this.removeAttribute("editmode"),this.removeDragListeners(),this.clearInlinePositions(),this.updateComplete.then(()=>this.applyCustomPositions()))),!this.editMode&&this.hasCustomLayout&&this.updateComplete.then(()=>this.applyCustomPositions())}loadSavedLayout(){const t=ye(window.innerWidth),e=`${mn}${t}`;try{const i=localStorage.getItem(e);i&&(this.customPositions=JSON.parse(i),v.debug("[FlowNode] Loaded layout for "+t))}catch{}}applySavedPositions(){var e;if(!this.editMode)return;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".flow-grid");if(t){for(const i of Qt){const n=this.customPositions[i];if(!n)continue;const r=t.querySelector(`.node-${i}`);r&&(r.style.top=n.top,r.style.left=n.left)}this.initDragListeners()}}clearInlinePositions(){var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".flow-grid");if(t)for(const i of Qt){const n=t.querySelector(`.node-${i}`);n&&(n.style.top="",n.style.left="")}}saveLayout(){const t=ye(window.innerWidth),e=`${mn}${t}`;try{localStorage.setItem(e,JSON.stringify(this.customPositions)),v.debug("[FlowNode] Saved layout for "+t)}catch{}}toggleExpand(t,e){const i=e.target;if(i.closest(".clickable")||i.closest(".indicator")||i.closest(".forecast-badge")||i.closest(".node-value")||i.closest(".node-subvalue")||i.closest(".gc-plan-btn"))return;const n=new Set(this.expandedNodes);n.has(t)?n.delete(t):n.add(t),this.expandedNodes=n}nodeClass(t,e=""){const i=this.expandedNodes.has(t)?" expanded":"";return`node node-${t}${i}${e?" "+e:""}`}get hasCustomLayout(){return Qt.some(t=>{const e=this.customPositions[t];return(e==null?void 0:e.top)!=null&&(e==null?void 0:e.left)!=null})}applyCustomPositions(){var e;if(this.editMode||!this.hasCustomLayout)return;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".flow-grid");if(t)for(const i of Qt){const n=t.querySelector(`.node-${i}`);if(!n)continue;const r=this.customPositions[i]??Tl[i];n.style.top=r.top,n.style.left=r.left}}resetLayout(){const t=ye(window.innerWidth),e=`${mn}${t}`;localStorage.removeItem(e),this.customPositions={},this.clearInlinePositions(),this.editMode&&this.requestUpdate(),v.debug("[FlowNode] Reset layout for "+t)}initDragListeners(){var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".flow-grid");if(t){for(const i of Qt){const n=t.querySelector(`.node-${i}`);n&&(n.addEventListener("mousedown",this.handleDragStart),n.addEventListener("touchstart",this.handleTouchStart,{passive:!1}))}document.addEventListener("mousemove",this.handleDragMove),document.addEventListener("mouseup",this.handleDragEnd),document.addEventListener("touchmove",this.handleTouchMove,{passive:!1}),document.addEventListener("touchend",this.handleTouchEnd)}}removeDragListeners(){document.removeEventListener("mousemove",this.handleDragMove),document.removeEventListener("mouseup",this.handleDragEnd),document.removeEventListener("touchmove",this.handleTouchMove),document.removeEventListener("touchend",this.handleTouchEnd)}findNodeId(t){for(const i of Qt)if(t.classList.contains(`node-${i}`))return i;const e=t.closest('[class*="node-"]');if(!e)return null;for(const i of Qt)if(e.classList.contains(`node-${i}`))return i;return null}updateDragPosition(t,e){var _;if(!this.draggedNodeId)return;const i=(_=this.shadowRoot)==null?void 0:_.querySelector(".flow-grid");if(!i)return;const n=i.querySelector(`.node-${this.draggedNodeId}`);if(!n)return;const r=i.getBoundingClientRect(),a=n.getBoundingClientRect(),s=t-this.dragStartX,l=e-this.dragStartY,c=this.dragStartLeft+s,u=this.dragStartTop+l,p=r.left,f=r.right-a.width,y=r.top,m=r.bottom-a.height,g=Math.max(p,Math.min(f,c)),b=Math.max(y,Math.min(m,u)),$=(g-r.left)/r.width*100,S=(b-r.top)/r.height*100;n.style.left=`${$}%`,n.style.top=`${S}%`,this.customPositions[this.draggedNodeId]={top:`${S}%`,left:`${$}%`},this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0}))}renderSolar(){const t=this.data,e=t.solarPercent,i=e<2,n=i?"linear-gradient(135deg, rgba(57,73,171,0.25) 0%, rgba(26,35,126,0.18) 100%)":Fe.solar,r=i?"rgba(121,134,203,0.5)":Ne.solar,a=i?"position:absolute;top:4px;left:6px;font-size:11px;background:rgba(57,73,171,0.35);color:#9fa8da;padding:3px 8px;border-radius:4px;border:1px solid rgba(121,134,203,0.4)":"position:absolute;top:4px;left:6px;font-size:9px",s=i?"position:absolute;top:4px;right:6px;font-size:11px;background:rgba(57,73,171,0.35);color:#9fa8da;padding:3px 8px;border-radius:4px;border:1px solid rgba(121,134,203,0.4)":"position:absolute;top:4px;right:6px;font-size:9px";return d`
      <div class="${this.nodeClass("solar",i?"night":"")}" style="--node-gradient: ${n}; --node-border: ${r};"
        @click=${l=>this.toggleExpand("solar",l)}>
        <div class="node-header" style="margin-top:16px">
          <oig-solar-icon .power=${t.solarPower} .percent=${e} .maxPower=${5400}></oig-solar-icon>
          <span class="node-label">Solár</span>
        </div>
        <div class="node-value" @click=${A("actual_fv_total")}>
          ${He(t.solarPower)}
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
    `}openGridChargingDialog(){this.dispatchEvent(new CustomEvent("oig-grid-charging-open",{bubbles:!0,composed:!0,detail:{data:this.data.gridChargingPlan}}))}getBatteryStatus(){const t=this.data;return t.batteryPower>10?{text:`⚡ Nabíjení${t.timeToFull?` (${t.timeToFull})`:""}`,cls:"status-charging pulse"}:t.batteryPower<-10?{text:`⚡ Vybíjení${t.timeToEmpty?` (${t.timeToEmpty})`:""}`,cls:"status-discharging pulse"}:{text:"◉ Klid",cls:"status-idle"}}getBalancingIndicator(){const t=this.data,e=t.balancingState;return e!=="charging"&&e!=="holding"&&e!=="completed"?{show:!1,text:"",icon:"",cls:""}:e==="charging"?{show:!0,text:`Nabíjení${t.balancingTimeRemaining?` (${t.balancingTimeRemaining})`:""}`,icon:"⚡",cls:"charging"}:e==="holding"?{show:!0,text:`Držení${t.balancingTimeRemaining?` (${t.balancingTimeRemaining})`:""}`,icon:"⏸️",cls:"holding"}:{show:!0,text:"Dokončeno",icon:"✅",cls:"completed"}}renderBattery(){const t=this.data,e=this.getBatteryStatus(),i=this.getBalancingIndicator(),n=t.batteryPower>10,r=t.batteryTemp>25?"🌡️":t.batteryTemp<15?"🧊":"🌡️",a=t.batteryTemp>25?"temp-hot":t.batteryTemp<15?"temp-cold":"";return d`
      <div class="${this.nodeClass("battery")}" style="--node-gradient: ${Fe.battery}; --node-border: ${Ne.battery};"
        @click=${s=>this.toggleExpand("battery",s)}>

        <div class="node-header">
          <!-- Jediná ikona: SVG baterie nahrazuje gauge + emoji -->
          <oig-battery-icon
            .soc=${t.batterySoC}
            ?charging=${n&&!t.isGridCharging}
            ?gridCharging=${t.isGridCharging&&n}
            ?discharging=${t.batteryPower<-10}
          ></oig-battery-icon>
          <span class="node-label">Baterie</span>
        </div>

        <div class="node-value" @click=${A("batt_bat_c")}>
          ${Math.round(t.batterySoC)} %
        </div>
        <div class="node-subvalue" @click=${A("batt_batt_comp_p")}>
          ${He(t.batteryPower)}
        </div>

        <div class="node-status ${e.cls}">${e.text}</div>

        ${t.isGridCharging?d`
          <span class="grid-charging-badge">⚡🔌 Síťové nabíjení</span>
        `:O}
        ${i.show?d`
          <span class="balancing-indicator ${i.cls}">
            <span>${i.icon}</span>
            <span>${i.text}</span>
          </span>
        `:O}

        <div class="battery-indicators">
          <button class="indicator" @click=${A("extended_battery_voltage")}>
            ⚡ ${t.batteryVoltage.toFixed(1)} V
          </button>
          <button class="indicator" @click=${A("extended_battery_current")}>
            〰️ ${t.batteryCurrent.toFixed(1)} A
          </button>
          <button class="indicator ${a}" @click=${A("extended_battery_temperature")}>
            ${r} ${t.batteryTemp.toFixed(1)} °C
          </button>
        </div>

        <!-- Energie + gc-plan vždy viditelné (ne v detail-section) -->
        <div class="battery-energy-section">
          <div class="detail-header">⚡ Energie dnes</div>
          <div class="energy-grid">
            <div class="detail-row">
              <span class="icon">⬆️</span>
              <button class="clickable" @click=${A("computed_batt_charge_energy_today")}>
                Nab: ${Kt(t.batteryChargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">⬇️</span>
              <button class="clickable" @click=${A("computed_batt_discharge_energy_today")}>
                Vyb: ${Kt(t.batteryDischargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">☀️</span>
              <button class="clickable" @click=${A("computed_batt_charge_fve_energy_today")}>
                FVE: ${Kt(t.batteryChargeSolar)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">🔌</span>
              <button class="clickable" @click=${A("computed_batt_charge_grid_energy_today")}>
                Síť: ${Kt(t.batteryChargeGrid)}
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
    `}getInverterModeDesc(){const t=this.data.inverterMode;return t.includes("Home 1")?"🏠 Home 1: Max baterie + FVE":t.includes("Home 2")?"🔋 Home 2: Šetří baterii":t.includes("Home 3")?"☀️ Home 3: Priorita nabíjení":t.includes("UPS")?"⚡ UPS: Vše ze sítě":`⚙️ ${t||"--"}`}renderInverter(){const t=this.data,e=io(t.inverterMode),i=t.bypassStatus.toLowerCase()==="on"||t.bypassStatus==="1",n=t.inverterTemp>35?"🔥":"🌡️",r=no(t.inverterGridMode),a=Sr(this.pendingServices,this.changingServices),s=ul(this.gridDeliveryState);let l="planner-unknown",c="Plánovač: N/A";return t.plannerAutoMode===!0?(l="planner-auto",c="Plánovač: AUTO"):t.plannerAutoMode===!1&&(l="planner-off",c="Plánovač: VYPNUTO"),d`
      <div class="${this.nodeClass("inverter",a.inverterModeChanging?"mode-changing":"")}" style="--node-gradient: ${Fe.inverter}; --node-border: ${Ne.inverter};"
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
          <button class="bypass-active bypass-warning" style="position:absolute;top:4px;right:6px;font-size:9px" @click=${A("bypass_status")}>
            🔴 Bypass
          </button>
        `:O}

        <div class="node-value" @click=${A("box_prms_mode")}>
          ${a.inverterModeChanging?d`<span class="spinner spinner--small"></span>`:O}
          ${e.icon} ${e.text}
        </div>
        <div class="node-subvalue">${this.getInverterModeDesc()}</div>
        ${a.inverterModeText?d`<div class="pending-text">${a.inverterModeText}</div>`:O}

        <div class="planner-badge ${l}">${c}</div>
        <div class="shield-badge ${this.shieldStatus==="running"?"shield-running":"shield-idle"}">
          🛡️ ${this.shieldStatus==="running"?"Zpracovávám":"Nečinný"}${this.shieldQueueCount>0?d` <span class="shield-queue">(${this.shieldQueueCount})</span>`:O}
        </div>

        <div class="battery-indicators" style="margin-top:6px">
          <button class="indicator" @click=${A("box_temp")}>
            ${n} ${t.inverterTemp.toFixed(1)} °C
          </button>
          <button class="indicator ${i?"bypass-warning":""}" @click=${A("bypass_status")}>
            <span id="inverter-bypass-icon">${i?"🔴":"🟢"}</span> Bypass: ${i?"ON":"OFF"}
          </button>
        </div>

        <!-- Přetoky + notifikace — vždy viditelné -->
        <div class="battery-indicators" style="margin-top:4px">
          <button class="indicator ${s.isUnavailable?"current-state-unknown":""}" @click=${A("invertor_prms_to_grid")}>
            ${r.icon} ${s.currentModeText}
          </button>
          <button class="clickable notif-badge ${t.notificationsError>0?"has-error":t.notificationsUnread>0?"has-unread":"indicator"}"
            @click=${A("notification_count_unread")}>
            🔔 ${t.notificationsUnread}/${t.notificationsError}
          </button>
        </div>
        ${s.pendingModeText?d`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${s.pendingModeText}
          </div>
        `:O}

        <div class="detail-section">
          <div class="detail-header">🌊 Přetoky — limit</div>
          ${s.limitLabel!==null?d`
            <div class="detail-row">
              <span class="detail-label">${s.limitLabel}</span>
              <button class="clickable ${s.showLimitAsActive?"limit-active":""}" @click=${A("invertor_prm1_p_max_feed_grid")}>
                ${s.limitValue}
              </button>
            </div>
          `:O}
          ${s.pendingLimitText?d`
            <div class="pending-overlay">
              <span class="spinner spinner--small"></span>
              ${s.pendingLimitText}
            </div>
          `:O}
        </div>
      </div>
    `}getGridStatus(){const t=this.data.gridPower;return t>10?{text:"⬇ Import",cls:"status-importing pulse"}:t<-10?{text:"⬆ Export",cls:"status-exporting pulse"}:{text:"◉ Žádný tok",cls:"status-idle"}}renderGrid(){const t=this.data,e=this.getGridStatus(),i=Sr(this.pendingServices,this.changingServices),n=dl(this.gridDeliveryState);return d`
      <div class="${this.nodeClass("grid",i.gridExportChanging?"mode-changing":"")}" style="--node-gradient: ${Fe.grid}; --node-border: ${Ne.grid};"
        @click=${r=>this.toggleExpand("grid",r)}>

        <!-- Tarif badge vlevo nahoře -->
        <button class="indicator" style="position:absolute;top:4px;left:6px;font-size:9px" @click=${A("current_tariff")}>
          ${eo(t.currentTariff)}
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
          ${He(t.gridPower)}
        </div>
        <div class="node-status ${e.cls}">${e.text}</div>
        <div class="node-subvalue ${n.currentUnavailable?"current-state-unknown":""}" @click=${A("invertor_prms_to_grid")}>
          ${n.currentText}
        </div>
        ${n.pendingText?d`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${n.pendingText}
          </div>
        `:O}

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
            <button class="phase-val" style="font-size:10px;color:${H(o.textSecondary)}" @click=${A("ac_in_aci_vr")}>${Math.round(t.gridL1V)}V</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L2</span>
            <button class="phase-val" @click=${A("actual_aci_ws")}>${Math.round(t.gridL2P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${H(o.textSecondary)}" @click=${A("ac_in_aci_vs")}>${Math.round(t.gridL2V)}V</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L3</span>
            <button class="phase-val" @click=${A("actual_aci_wt")}>${Math.round(t.gridL3P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${H(o.textSecondary)}" @click=${A("ac_in_aci_vt")}>${Math.round(t.gridL3V)}V</button>
          </div>
        </div>

        <div class="detail-section">
          <!-- Energie dnes — odběr vlevo, dodávka vpravo -->
          <div class="energy-symmetric">
            <div class="energy-side">
              <span class="energy-side-label">⬇ Odběr</span>
              <button class="energy-side-val energy-import" @click=${A("ac_in_ac_ad")}>
                ${Kt(t.gridImportToday)}
              </button>
            </div>
            <div class="energy-divider-v"></div>
            <div class="energy-side">
              <span class="energy-side-label">⬆ Dodávka</span>
              <button class="energy-side-val energy-export" @click=${A("ac_in_ac_pd")}>
                ${Kt(t.gridExportToday)}
              </button>
            </div>
          </div>

        </div>
      </div>
    `}renderHouse(){const t=this.data;return d`
      <div class="${this.nodeClass("house")}" style="--node-gradient: ${Fe.house}; --node-border: ${Ne.house};"
        @click=${e=>this.toggleExpand("house",e)}>
        <div class="node-header">
          <oig-house-icon
            .power=${t.housePower}
            .maxPower=${t.boilerInstallPower>0?1e4:8e3}
            ?boilerActive=${t.boilerIsUse}
          ></oig-house-icon>
          <span class="node-label">Spotřeba</span>
        </div>

        <div class="node-value" @click=${A("actual_aco_p")}>
          ${He(t.housePower)}
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
                ${He(t.boilerPower)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">📊</span>
              <span>Nabito:</span>
              <button class="clickable" @click=${A("boiler_day_w")}>
                ${Kt(t.boilerDayEnergy)}
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
        `:O}
      </div>
    `}render(){return d`
      <div class="flow-grid ${this.hasCustomLayout&&!this.editMode?"custom-layout":""}">
        ${this.renderSolar()}
        ${this.renderBattery()}
        ${this.renderInverter()}
        ${this.renderGrid()}
        ${this.renderHouse()}
      </div>
    `}};xt.styles=P`
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
      color: ${H(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .node-value {
      font-size: 22px;
      font-weight: 700;
      color: ${H(o.textPrimary)};
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
      color: ${H(o.textSecondary)};
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
      color: ${H(o.textSecondary)};
      margin-top: 4px;
    }

    .pending-overlay {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: ${H(o.accent)};
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 4px;
      padding: 2px 6px;
      margin-top: 4px;
    }

    .current-state-unknown {
      color: ${H(o.textSecondary)};
      font-style: italic;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid ${H(o.divider)};
      border-top-color: ${H(o.accent)};
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
      border-top: 1px solid ${H(o.divider)};
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
      border-top: 1px dashed ${H(o.divider)};
    }

    .detail-header {
      font-size: 10px;
      font-weight: 600;
      color: ${H(o.textSecondary)};
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: ${H(o.textSecondary)};
      margin-bottom: 2px;
    }

    .detail-row .icon { width: 14px; text-align: center; flex-shrink: 0; }

    .clickable {
      cursor: pointer;
      color: ${H(o.textPrimary)};
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
      color: ${H(o.textSecondary)};
      margin: 4px 0;
      align-items: center;
    }

    .phase-sep { color: ${H(o.divider)}; }

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
      background: ${H(o.bgSecondary)};
      border: none;
      font-family: inherit;
      color: ${H(o.textSecondary)};
    }

    .indicator:hover { background: ${H(o.divider)}; }

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
      border-top: 1px solid ${H(o.divider)};
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
      border: 1px solid ${H(o.divider)};
      background: transparent;
      color: ${H(o.textSecondary)};
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .gc-plan-btn:hover {
      background: rgba(255,255,255,0.06);
      color: ${H(o.textPrimary)};
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
      border-top: 1px dashed ${H(o.divider)};
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
      color: ${H(o.textSecondary)};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .phase-val {
      font-size: 11px;
      font-weight: 600;
      color: ${H(o.textPrimary)};
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    .phase-val:hover { text-decoration: underline; }
    .phase-divider {
      border: none;
      border-top: 1px solid ${H(o.divider)};
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
      color: ${H(o.textSecondary)};
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
      color: ${H(o.textPrimary)};
    }
    .energy-side-val:hover { text-decoration: underline; }
    .energy-import { color: #ef5350; }
    .energy-export { color: #66bb6a; }
    .energy-divider-v {
      width: 1px;
      height: 28px;
      background: ${H(o.divider)};
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
      color: ${H(o.textSecondary)};
      text-transform: uppercase;
    }
    .price-val {
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: ${H(o.textPrimary)};
    }
    .price-val:hover { text-decoration: underline; }
    .price-spot { color: #ef5350; }
    .price-export { color: #66bb6a; }

    @media (min-width: 1025px) {
      .detail-section {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid ${H(o.divider)};
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
        border-top: 1px dashed ${H(o.divider)};
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
  `;Dt([h({type:Object})],xt.prototype,"data",2);Dt([h({type:Boolean})],xt.prototype,"editMode",2);Dt([x()],xt.prototype,"pendingServices",2);Dt([x()],xt.prototype,"changingServices",2);Dt([x()],xt.prototype,"shieldStatus",2);Dt([x()],xt.prototype,"shieldQueueCount",2);Dt([x()],xt.prototype,"gridDeliveryState",2);Dt([x()],xt.prototype,"expandedNodes",2);Dt([x()],xt.prototype,"customPositions",2);xt=Dt([D("oig-flow-node")],xt);var Ml=Object.defineProperty,Dl=Object.getOwnPropertyDescriptor,le=(t,e,i,n)=>{for(var r=n>1?void 0:n?Dl(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&Ml(e,i,r),r};function El(t,e){return{fromColor:rr[t]||"#9e9e9e",toColor:rr[e]||"#9e9e9e"}}const Ol=Q;let zt=class extends M{constructor(){super(...arguments),this.data=En,this.particlesEnabled=!0,this.active=!0,this.editMode=!1,this.lines=[],this.animationId=null,this.lastSpawnTime={},this.particleCount=0,this.MAX_PARTICLES=50,this.onVisibilityChange=()=>{this.updateAnimationState()},this.onLayoutChanged=()=>{this.drawConnectionsDeferred()}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this.onVisibilityChange),this.addEventListener("layout-changed",this.onLayoutChanged)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this.onVisibilityChange),this.removeEventListener("layout-changed",this.onLayoutChanged),this.stopAnimation()}updated(t){t.has("data")&&(this.updateLines(),this.animationId!==null&&this.spawnParticles()),(t.has("active")||t.has("particlesEnabled"))&&this.updateAnimationState(),this.drawConnectionsDeferred()}firstUpdated(){this.updateLines(),this.updateAnimationState(),new ResizeObserver(()=>this.drawConnectionsDeferred()).observe(this)}drawConnectionsDeferred(){requestAnimationFrame(()=>this.drawConnectionsSVG())}getParticlesLayer(){var t;return(t=this.renderRoot)==null?void 0:t.querySelector(".particles-layer")}getGridMetrics(){var a,s;const t=(a=this.renderRoot)==null?void 0:a.querySelector("oig-flow-node");if(!t)return null;const i=(t.renderRoot||t.shadowRoot||t).querySelector(".flow-grid");if(!i)return null;const n=(s=this.renderRoot)==null?void 0:s.querySelector(".canvas-container");if(!n)return null;const r=i.getBoundingClientRect();return r.width===0||r.height===0?null:{grid:i,gridRect:r,canvasRect:n.getBoundingClientRect()}}positionOverlayLayer(t,e,i){const n=e.left-i.left,r=e.top-i.top;t.style.left=`${n}px`,t.style.top=`${r}px`,t.style.width=`${e.width}px`,t.style.height=`${e.height}px`}updateLines(){const t=this.data,e=[],i=t.solarPower>50;e.push({id:"solar-inverter",from:"solar",to:"inverter",color:pe.solar,power:i?t.solarPower:0,params:i?_i(t.solarPower,$i.solar,"solar"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:i});const n=Math.abs(t.batteryPower)>50,r=t.batteryPower>0;e.push({id:"battery-inverter",from:n&&r?"inverter":"battery",to:n&&r?"battery":"inverter",color:pe.battery,power:n?Math.abs(t.batteryPower):0,params:n?_i(t.batteryPower,$i.battery,"battery"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:n});const a=Math.abs(t.gridPower)>50,s=t.gridPower>0;e.push({id:"grid-inverter",from:a?s?"grid":"inverter":"grid",to:a?s?"inverter":"grid":"inverter",color:a?s?pe.grid_import:pe.grid_export:pe.grid_import,power:a?Math.abs(t.gridPower):0,params:a?_i(t.gridPower,$i.grid,"grid"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:a});const l=t.housePower>50;e.push({id:"inverter-house",from:"inverter",to:"house",color:pe.house,power:l?t.housePower:0,params:l?_i(t.housePower,$i.house,"house"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:l}),this.lines=e}calcEdgePoint(t,e,i,n){const r=e.x-t.x,a=e.y-t.y;if(r===0&&a===0)return{...t};const s=Math.abs(r),l=Math.abs(a),c=s*n>l*i?i/s:n/l;return{x:t.x+r*c,y:t.y+a*c}}getNodeInfo(t,e,i){const n=t.querySelector(`.node-${i}`);if(!n)return null;const r=n.getBoundingClientRect();return{x:r.left+r.width/2-e.left,y:r.top+r.height/2-e.top,hw:r.width/2,hh:r.height/2}}drawConnectionsSVG(){const t=this.svgEl;if(!t)return;const e=this.getGridMetrics();if(!e)return;const{grid:i,gridRect:n,canvasRect:r}=e;this.positionOverlayLayer(t,n,r),t.setAttribute("viewBox",`0 0 ${n.width} ${n.height}`);const a=this.getParticlesLayer();a&&this.positionOverlayLayer(a,n,r),t.innerHTML="";const s="http://www.w3.org/2000/svg",l=document.createElementNS(s,"defs"),c=document.createElementNS(s,"filter");c.setAttribute("id","neon-glow"),c.setAttribute("x","-50%"),c.setAttribute("y","-50%"),c.setAttribute("width","200%"),c.setAttribute("height","200%");const u=document.createElementNS(s,"feGaussianBlur");u.setAttribute("in","SourceGraphic"),u.setAttribute("stdDeviation","3"),u.setAttribute("result","blur"),c.appendChild(u);const p=document.createElementNS(s,"feMerge"),f=document.createElementNS(s,"feMergeNode");f.setAttribute("in","blur"),p.appendChild(f);const y=document.createElementNS(s,"feMergeNode");y.setAttribute("in","SourceGraphic"),p.appendChild(y),c.appendChild(p),l.appendChild(c),t.appendChild(l);for(const m of this.lines){const g=this.getNodeInfo(i,n,m.from),b=this.getNodeInfo(i,n,m.to);if(!g||!b)continue;const $={x:g.x,y:g.y},S={x:b.x,y:b.y},_=this.calcEdgePoint($,S,g.hw,g.hh),C=this.calcEdgePoint(S,$,b.hw,b.hh),G=C.x-_.x,K=C.y-_.y,w=Math.sqrt(G*G+K*K),j=Math.min(w*.2,40),L=-K/w,z=G/w,Y=(_.x+C.x)/2,V=(_.y+C.y)/2,N=Y+L*j,wt=V+z*j,Yt=`grad-${m.id}`,{fromColor:an,toColor:sn}=El(m.from,m.to),St=document.createElementNS(s,"linearGradient");St.setAttribute("id",Yt),St.setAttribute("x1","0%"),St.setAttribute("y1","0%"),St.setAttribute("x2","100%"),St.setAttribute("y2","0%");const Ae=document.createElementNS(s,"stop");Ae.setAttribute("offset","0%"),Ae.setAttribute("stop-color",an);const Ie=document.createElementNS(s,"stop");Ie.setAttribute("offset","100%"),Ie.setAttribute("stop-color",sn),St.appendChild(Ae),St.appendChild(Ie),l.appendChild(St);const yt=document.createElementNS(s,"path");if(yt.setAttribute("d",`M ${_.x} ${_.y} Q ${N} ${wt} ${C.x} ${C.y}`),yt.setAttribute("stroke",`url(#${Yt})`),yt.setAttribute("stroke-width","3"),yt.setAttribute("stroke-linecap","round"),yt.setAttribute("fill","none"),yt.setAttribute("opacity",m.active?"0.8":"0.18"),m.active&&yt.setAttribute("filter","url(#neon-glow)"),yt.classList.add("flow-line"),m.active||yt.classList.add("flow-line--inactive"),t.appendChild(yt),m.params.active){const Gt=document.createElementNS(s,"polygon");Gt.setAttribute("points",`0,-6 ${6*1.2},0 0,6`),Gt.setAttribute("fill",m.color),Gt.setAttribute("opacity","0.9");const Ut=document.createElementNS(s,"animateMotion");Ut.setAttribute("dur",`${Math.max(1,m.params.speed/1e3)}s`),Ut.setAttribute("repeatCount","indefinite"),Ut.setAttribute("path",`M ${_.x} ${_.y} Q ${N} ${wt} ${C.x} ${C.y}`),Ut.setAttribute("rotate","auto"),Gt.appendChild(Ut),t.appendChild(Gt)}}}updateAnimationState(){this.particlesEnabled&&this.active&&!document.hidden&&!vt.reduceMotion?(this.spawnParticles(),this.startAnimation()):this.stopAnimation()}startAnimation(){if(this.animationId!==null)return;const t=()=>{this.spawnParticles(),this.animationId=requestAnimationFrame(t)};this.animationId=requestAnimationFrame(t)}stopAnimation(){this.animationId!==null&&(cancelAnimationFrame(this.animationId),this.animationId=null)}spawnParticles(){if(this.particleCount>=this.MAX_PARTICLES)return;const t=this.getParticlesLayer();if(!t)return;const e=this.getGridMetrics();if(!e)return;const{grid:i,gridRect:n,canvasRect:r}=e;this.positionOverlayLayer(t,n,r);const a=performance.now();for(const s of this.lines){if(!s.params.active)continue;const l=s.params.speed,c=this.lastSpawnTime[s.id]||0;if(a-c<l)continue;const u=this.getNodeInfo(i,n,s.from),p=this.getNodeInfo(i,n,s.to);if(!u||!p)continue;const f={x:u.x,y:u.y},y={x:p.x,y:p.y},m=this.calcEdgePoint(f,y,u.hw,u.hh),g=this.calcEdgePoint(y,f,p.hw,p.hh);this.lastSpawnTime[s.id]=a;const b=s.params.count;for(let $=0;$<b&&!(this.particleCount>=this.MAX_PARTICLES);$++)this.createParticle(t,m,g,s.color,s.params,$*(s.params.speed/b/2))}}createParticle(t,e,i,n,r,a){const s=document.createElement("div");s.className="particle";const l=r.size;s.style.width=`${l}px`,s.style.height=`${l}px`,s.style.background=n,s.style.left=`${e.x}px`,s.style.top=`${e.y}px`,s.style.boxShadow=`0 0 ${l}px ${n}`,s.style.opacity="0",t.appendChild(s),this.particleCount++;const c=r.speed;setTimeout(()=>{let u=!1;const p=()=>{u||(u=!0,s.isConnected&&s.remove(),this.particleCount=Math.max(0,this.particleCount-1))};if(typeof s.animate=="function"){const f=s.animate([{left:`${e.x}px`,top:`${e.y}px`,opacity:0,offset:0},{opacity:r.opacity,offset:.1},{opacity:r.opacity,offset:.9},{left:`${i.x}px`,top:`${i.y}px`,opacity:0,offset:1}],{duration:c,easing:"linear"});f.onfinish=p,f.oncancel=p}else s.style.transition=`left ${c}ms linear, top ${c}ms linear, opacity ${c}ms linear`,s.style.opacity=`${r.opacity}`,requestAnimationFrame(()=>{s.style.left=`${i.x}px`,s.style.top=`${i.y}px`,s.style.opacity="0"}),s.addEventListener("transitionend",p,{once:!0}),window.setTimeout(p,c+50)},a)}render(){return d`
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
      background: ${Ol(o.bgSecondary)};
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
  `;le([h({type:Object})],zt.prototype,"data",2);le([h({type:Boolean})],zt.prototype,"particlesEnabled",2);le([h({type:Boolean})],zt.prototype,"active",2);le([h({type:Boolean})],zt.prototype,"editMode",2);le([x()],zt.prototype,"lines",2);le([Xi(".connections-layer")],zt.prototype,"svgEl",2);zt=le([D("oig-flow-canvas")],zt);var zl=Object.defineProperty,Ll=Object.getOwnPropertyDescriptor,In=(t,e,i,n)=>{for(var r=n>1?void 0:n?Ll(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&zl(e,i,r),r};const $t=Q;let ii=class extends M{constructor(){super(...arguments),this.data=null,this.open=!1,this.onKeyDown=t=>{t.key==="Escape"&&this.hide()}}show(){this.open=!0}hide(){this.open=!1}onOverlayClick(t){t.target===t.currentTarget&&this.hide()}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onKeyDown),this.addEventListener("oig-grid-charging-open",()=>this.show())}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onKeyDown)}formatTime(t){const e=t.time_from??"--:--",i=t.time_to??"--:--";return`${e} – ${i}`}isBlockActive(t){if(!t.time_from||!t.time_to)return!1;const e=new Date,i=e.toISOString().slice(0,10);if(t.day==="tomorrow")return!1;const n=`${i}T${t.time_from}`,r=`${i}T${t.time_to}`,a=new Date(n),s=new Date(r);return e>=a&&e<s}renderEmpty(){return d`
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
          `:O}
          ${t.totalCostCzk>0?d`
            <span class="summary-chip cost">💰 ~${t.totalCostCzk.toFixed(0)} Kč</span>
          `:O}
          ${t.windowLabel?d`
            <span class="summary-chip time">🪟 ${t.windowLabel}</span>
          `:O}
          ${t.durationMinutes>0?d`
            <span class="summary-chip time">⏱️ ${Math.round(t.durationMinutes)} min</span>
          `:O}
        </div>

        <!-- Active block banner -->
        ${e?d`
          <div class="active-block-banner">
            <div class="pulse-dot"></div>
            <span>Probíhá: ${this.formatTime(e)}
              ${e.grid_charge_kwh!=null?` · ${e.grid_charge_kwh.toFixed(1)} kWh`:O}
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
            ${t.blocks.map((i,n)=>{const r=this.isBlockActive(i);return d`
                <tr class="${r?"is-active":!r&&n===0&&!e?"is-next":""}">
                  <td>${this.formatTime(i)}</td>
                  <td>
                    ${i.day?d`
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
              `:O}
            </div>
            <button class="close-btn" @click=${()=>this.hide()} aria-label="Zavřít">✕</button>
          </div>
          <div class="dialog-body">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `:O}};ii.styles=P`
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
      background: ${$t(o.cardBg)};
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
      border-bottom: 1px solid ${$t(o.divider)};
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
      color: ${$t(o.textPrimary)};
    }

    .dialog-header-subtitle {
      font-size: 11px;
      color: ${$t(o.textSecondary)};
      margin-top: 2px;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: ${$t(o.textSecondary)};
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
      color: ${$t(o.textPrimary)};
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
      color: ${$t(o.textSecondary)};
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
      color: ${$t(o.textSecondary)};
      padding: 0 6px 8px;
      border-bottom: 1px solid ${$t(o.divider)};
    }

    .blocks-table th:last-child,
    .blocks-table td:last-child {
      text-align: right;
    }

    .blocks-table td {
      padding: 8px 6px;
      font-size: 12px;
      color: ${$t(o.textPrimary)};
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
      color: ${$t(o.textSecondary)};
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
  `;In([h({type:Object})],ii.prototype,"data",2);In([x()],ii.prototype,"open",2);ii=In([D("oig-grid-charging-dialog")],ii);var Al=Object.defineProperty,Il=Object.getOwnPropertyDescriptor,dt=(t,e,i,n)=>{for(var r=n>1?void 0:n?Il(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&Al(e,i,r),r};const et=Q;Qi.register(Rr,Hr,Wr,jr,Vr,qr,Yr);let Ft=class extends M{constructor(){super(...arguments),this.values=[],this.color="rgba(76, 175, 80, 1)",this.startTime="",this.endTime="",this.chart=null,this.lastDataKey="",this.initializing=!1}render(){return d`<canvas></canvas>`}firstUpdated(){this.values.length>0&&(this.initializing=!0,requestAnimationFrame(()=>{this.createSparkline(),this.initializing=!1}))}updated(t){this.initializing||(t.has("values")||t.has("color"))&&this.updateOrCreateSparkline()}disconnectedCallback(){super.disconnectedCallback(),this.destroyChart()}updateOrCreateSparkline(){var e,i,n,r;if(!this.canvas||this.values.length===0)return;const t=JSON.stringify({v:this.values,c:this.color});if(!(t===this.lastDataKey&&this.chart)){if(this.lastDataKey=t,(n=(i=(e=this.chart)==null?void 0:e.data)==null?void 0:i.datasets)!=null&&n[0]){const a=this.chart.data.datasets[0];if(!((((r=this.chart.data.labels)==null?void 0:r.length)||0)!==this.values.length)){a.data=this.values,a.borderColor=this.color,a.backgroundColor=this.color.replace("1)","0.2)"),this.chart.update("none");return}}this.destroyChart(),this.createSparkline()}}createSparkline(){if(!this.canvas||this.values.length===0)return;this.destroyChart();const t=this.color,e=this.values,i=new Date(this.startTime),n=e.map((r,a)=>new Date(i.getTime()+a*15*60*1e3).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}));this.chart=new Qi(this.canvas,{type:"line",data:{labels:n,datasets:[{data:e,borderColor:t,backgroundColor:t.replace("1)","0.2)"),borderWidth:2,fill:!0,tension:.3,pointRadius:0,pointHoverRadius:5}]},plugins:[],options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:0},plugins:{legend:{display:!1},tooltip:{enabled:!0,backgroundColor:"rgba(0, 0, 0, 0.8)",titleColor:"#fff",bodyColor:"#fff",padding:8,displayColors:!1,callbacks:{title:r=>{var a;return((a=r[0])==null?void 0:a.label)||""},label:r=>`${r.parsed.y.toFixed(2)} Kč/kWh`}},datalabels:{display:!1},zoom:{pan:{enabled:!0,mode:"x",modifierKey:"shift"},zoom:{wheel:{enabled:!0,speed:.1},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)"},mode:"x"}}},scales:{x:{display:!1},y:{display:!0,position:"right",grace:"10%",ticks:{color:"rgba(255, 255, 255, 0.6)",font:{size:8},callback:r=>Number(r).toFixed(1),maxTicksLimit:3},grid:{display:!1}}},layout:{padding:0},interaction:{mode:"nearest",intersect:!1}}})}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}};Ft.styles=P`
    :host {
      display: block;
      width: 100%;
      height: 30px;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `;dt([h({type:Array})],Ft.prototype,"values",2);dt([h({type:String})],Ft.prototype,"color",2);dt([h({type:String})],Ft.prototype,"startTime",2);dt([h({type:String})],Ft.prototype,"endTime",2);dt([Xi("canvas")],Ft.prototype,"canvas",2);Ft=dt([D("oig-mini-sparkline")],Ft);let ft=class extends M{constructor(){super(...arguments),this.title="",this.time="",this.valueText="",this.value=0,this.unit="Kč/kWh",this.variant="default",this.clickable=!1,this.startTime="",this.endTime="",this.sparklineValues=[],this.sparklineColor="rgba(76, 175, 80, 1)",this.handleClick=()=>{this.clickable&&this.dispatchEvent(new CustomEvent("card-click",{detail:{startTime:this.startTime,endTime:this.endTime,value:this.value},bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),this.clickable&&this.addEventListener("click",this.handleClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleClick)}render(){const t=this.valueText||`${this.value.toFixed(2)} <span class="stat-unit">${this.unit}</span>`;return d`
      <div class="card-title">${this.title}</div>
      <div class="card-value ${this.variant}" .innerHTML=${t}></div>
      ${this.time?d`<div class="card-time">${this.time}</div>`:O}
      ${this.sparklineValues.length>0?d`
            <div class="sparkline-container">
              <oig-mini-sparkline
                .values=${this.sparklineValues}
                .color=${this.sparklineColor}
                .startTime=${this.startTime}
                .endTime=${this.endTime}
              ></oig-mini-sparkline>
            </div>
          `:O}
    `}};ft.styles=P`
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
  `;dt([h({type:String})],ft.prototype,"title",2);dt([h({type:String})],ft.prototype,"time",2);dt([h({type:String})],ft.prototype,"valueText",2);dt([h({type:Number})],ft.prototype,"value",2);dt([h({type:String})],ft.prototype,"unit",2);dt([h({type:String})],ft.prototype,"variant",2);dt([h({type:Boolean})],ft.prototype,"clickable",2);dt([h({type:String})],ft.prototype,"startTime",2);dt([h({type:String})],ft.prototype,"endTime",2);dt([h({type:Array})],ft.prototype,"sparklineValues",2);dt([h({type:String})],ft.prototype,"sparklineColor",2);ft=dt([D("oig-stats-card")],ft);function Bl(t){const e=new Date(t.start),i=new Date(t.end),n=e.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit"}),r=e.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}),a=i.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"});return`${n} ${r} - ${a}`}let ni=class extends M{constructor(){super(...arguments),this.data=null,this.topOnly=!1}onCardClick(t){this.dispatchEvent(new CustomEvent("zoom-to-block",{detail:t.detail,bubbles:!0,composed:!0}))}renderPriceTiles(){if(!this.data)return O;const t=this.data.solarForecastTotal>0;return d`
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
    `}renderBlockCard(t,e,i,n){return e?d`
      <oig-stats-card
        title=${t}
        .value=${e.avg}
        unit="Kč/kWh"
        .time=${Bl(e)}
        variant=${i}
        clickable
        .startTime=${e.start}
        .endTime=${e.end}
        .sparklineValues=${e.values}
        .sparklineColor=${n}
        @card-click=${this.onCardClick}
      ></oig-stats-card>
    `:O}renderExtremeBlocks(){if(!this.data)return O;const{cheapestBuyBlock:t,expensiveBuyBlock:e,bestExportBlock:i,worstExportBlock:n}=this.data;return d`
      ${this.renderBlockCard("Nejlevnější nákup",t,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejdražší nákup",e,"danger","rgba(244, 67, 54, 1)")}
      ${this.renderBlockCard("Nejlepší výkup",i,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejhorší výkup",n,"warning","rgba(255, 167, 38, 1)")}
    `}renderPlannedConsumption(){var s;const t=(s=this.data)==null?void 0:s.plannedConsumption;if(!t)return O;const e=t.todayTotalKwh,i=t.tomorrowKwh,n=e+(i||0),r=n>0?e/n*100:50,a=n>0?(i||0)/n*100:50;return d`
      <div class="planned-section">
        <div class="section-label" style="margin-bottom: 8px;">Plánovaná spotřeba</div>
        <div class="planned-header">
          <div>
            <div class="planned-main-value">
              ${t.totalPlannedKwh>0?d`${t.totalPlannedKwh.toFixed(1)} <span class="unit">kWh</span>`:"--"}
            </div>
            <div class="planned-profile">${t.profile}</div>
          </div>
          ${t.trendText?d`<div class="planned-trend">${t.trendText}</div>`:O}
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

        ${n>0?d`
              <div class="planned-bars">
                <div class="bar-today" style="width: ${r}%"></div>
                <div class="bar-tomorrow" style="width: ${a}%"></div>
              </div>
              <div class="bar-labels">
                <span>Dnes: ${e.toFixed(1)}</span>
                <span>Zítra: ${i!=null?i.toFixed(1):"--"}</span>
              </div>
            `:O}
      </div>
    `}render(){return!this.data||this.data.timeline.length===0?this.topOnly?O:d`<div style="color: ${o.textSecondary}; padding: 16px;">Načítání cenových dat...</div>`:this.topOnly?d`
        <div class="top-row">
          ${this.renderPriceTiles()}
          ${this.renderExtremeBlocks()}
        </div>
      `:d`${this.renderPlannedConsumption()}`}};ni.styles=P`
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
  `;dt([h({type:Object})],ni.prototype,"data",2);dt([h({type:Boolean})],ni.prototype,"topOnly",2);ni=dt([D("oig-pricing-stats")],ni);const ga=6048e5,Fl=864e5,bi=6e4,yi=36e5,Nl=1e3,Pr=Symbol.for("constructDateFrom");function st(t,e){return typeof t=="function"?t(e):t&&typeof t=="object"&&Pr in t?t[Pr](e):t instanceof Date?new t.constructor(e):new Date(e)}function I(t,e){return st(e||t,t)}function nn(t,e,i){const n=I(t,i==null?void 0:i.in);return isNaN(e)?st((i==null?void 0:i.in)||t,NaN):(e&&n.setDate(n.getDate()+e),n)}function Bn(t,e,i){const n=I(t,i==null?void 0:i.in);if(isNaN(e))return st(t,NaN);if(!e)return n;const r=n.getDate(),a=st(t,n.getTime());a.setMonth(n.getMonth()+e+1,0);const s=a.getDate();return r>=s?a:(n.setFullYear(a.getFullYear(),a.getMonth(),r),n)}function Fn(t,e,i){return st(t,+I(t)+e)}function Rl(t,e,i){return Fn(t,e*yi)}let Hl={};function ce(){return Hl}function Mt(t,e){var l,c,u,p;const i=ce(),n=(e==null?void 0:e.weekStartsOn)??((c=(l=e==null?void 0:e.locale)==null?void 0:l.options)==null?void 0:c.weekStartsOn)??i.weekStartsOn??((p=(u=i.locale)==null?void 0:u.options)==null?void 0:p.weekStartsOn)??0,r=I(t,e==null?void 0:e.in),a=r.getDay(),s=(a<n?7:0)+a-n;return r.setDate(r.getDate()-s),r.setHours(0,0,0,0),r}function Se(t,e){return Mt(t,{...e,weekStartsOn:1})}function fa(t,e){const i=I(t,e==null?void 0:e.in),n=i.getFullYear(),r=st(i,0);r.setFullYear(n+1,0,4),r.setHours(0,0,0,0);const a=Se(r),s=st(i,0);s.setFullYear(n,0,4),s.setHours(0,0,0,0);const l=Se(s);return i.getTime()>=a.getTime()?n+1:i.getTime()>=l.getTime()?n:n-1}function Ai(t){const e=I(t),i=new Date(Date.UTC(e.getFullYear(),e.getMonth(),e.getDate(),e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()));return i.setUTCFullYear(e.getFullYear()),+t-+i}function de(t,...e){const i=st.bind(null,e.find(n=>typeof n=="object"));return e.map(i)}function Pn(t,e){const i=I(t,e==null?void 0:e.in);return i.setHours(0,0,0,0),i}function ma(t,e,i){const[n,r]=de(i==null?void 0:i.in,t,e),a=Pn(n),s=Pn(r),l=+a-Ai(a),c=+s-Ai(s);return Math.round((l-c)/Fl)}function Wl(t,e){const i=fa(t,e),n=st(t,0);return n.setFullYear(i,0,4),n.setHours(0,0,0,0),Se(n)}function jl(t,e,i){const n=I(t,i==null?void 0:i.in);return n.setTime(n.getTime()+e*bi),n}function Vl(t,e,i){return Bn(t,e*3,i)}function ql(t,e,i){return Fn(t,e*1e3)}function Yl(t,e,i){return nn(t,e*7,i)}function Gl(t,e,i){return Bn(t,e*12,i)}function Xe(t,e){const i=+I(t)-+I(e);return i<0?-1:i>0?1:i}function Ul(t){return t instanceof Date||typeof t=="object"&&Object.prototype.toString.call(t)==="[object Date]"}function ba(t){return!(!Ul(t)&&typeof t!="number"||isNaN(+I(t)))}function Zl(t,e,i){const[n,r]=de(i==null?void 0:i.in,t,e),a=n.getFullYear()-r.getFullYear(),s=n.getMonth()-r.getMonth();return a*12+s}function Kl(t,e,i){const[n,r]=de(i==null?void 0:i.in,t,e);return n.getFullYear()-r.getFullYear()}function ya(t,e,i){const[n,r]=de(i==null?void 0:i.in,t,e),a=Tr(n,r),s=Math.abs(ma(n,r));n.setDate(n.getDate()-a*s);const l=+(Tr(n,r)===-a),c=a*(s-l);return c===0?0:c}function Tr(t,e){const i=t.getFullYear()-e.getFullYear()||t.getMonth()-e.getMonth()||t.getDate()-e.getDate()||t.getHours()-e.getHours()||t.getMinutes()-e.getMinutes()||t.getSeconds()-e.getSeconds()||t.getMilliseconds()-e.getMilliseconds();return i<0?-1:i>0?1:i}function vi(t){return e=>{const n=(t?Math[t]:Math.trunc)(e);return n===0?0:n}}function Ql(t,e,i){const[n,r]=de(i==null?void 0:i.in,t,e),a=(+n-+r)/yi;return vi(i==null?void 0:i.roundingMethod)(a)}function Nn(t,e){return+I(t)-+I(e)}function Xl(t,e,i){const n=Nn(t,e)/bi;return vi(i==null?void 0:i.roundingMethod)(n)}function va(t,e){const i=I(t,e==null?void 0:e.in);return i.setHours(23,59,59,999),i}function xa(t,e){const i=I(t,e==null?void 0:e.in),n=i.getMonth();return i.setFullYear(i.getFullYear(),n+1,0),i.setHours(23,59,59,999),i}function Jl(t,e){const i=I(t,e==null?void 0:e.in);return+va(i,e)==+xa(i,e)}function wa(t,e,i){const[n,r,a]=de(i==null?void 0:i.in,t,t,e),s=Xe(r,a),l=Math.abs(Zl(r,a));if(l<1)return 0;r.getMonth()===1&&r.getDate()>27&&r.setDate(30),r.setMonth(r.getMonth()-s*l);let c=Xe(r,a)===-s;Jl(n)&&l===1&&Xe(n,a)===1&&(c=!1);const u=s*(l-+c);return u===0?0:u}function tc(t,e,i){const n=wa(t,e,i)/3;return vi(i==null?void 0:i.roundingMethod)(n)}function ec(t,e,i){const n=Nn(t,e)/1e3;return vi(i==null?void 0:i.roundingMethod)(n)}function ic(t,e,i){const n=ya(t,e,i)/7;return vi(i==null?void 0:i.roundingMethod)(n)}function nc(t,e,i){const[n,r]=de(i==null?void 0:i.in,t,e),a=Xe(n,r),s=Math.abs(Kl(n,r));n.setFullYear(1584),r.setFullYear(1584);const l=Xe(n,r)===-a,c=a*(s-+l);return c===0?0:c}function rc(t,e){const i=I(t,e==null?void 0:e.in),n=i.getMonth(),r=n-n%3;return i.setMonth(r,1),i.setHours(0,0,0,0),i}function ac(t,e){const i=I(t,e==null?void 0:e.in);return i.setDate(1),i.setHours(0,0,0,0),i}function sc(t,e){const i=I(t,e==null?void 0:e.in),n=i.getFullYear();return i.setFullYear(n+1,0,0),i.setHours(23,59,59,999),i}function $a(t,e){const i=I(t,e==null?void 0:e.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}function oc(t,e){const i=I(t,e==null?void 0:e.in);return i.setMinutes(59,59,999),i}function lc(t,e){var l,c;const i=ce(),n=i.weekStartsOn??((c=(l=i.locale)==null?void 0:l.options)==null?void 0:c.weekStartsOn)??0,r=I(t,e==null?void 0:e.in),a=r.getDay(),s=(a<n?-7:0)+6-(a-n);return r.setDate(r.getDate()+s),r.setHours(23,59,59,999),r}function cc(t,e){const i=I(t,e==null?void 0:e.in);return i.setSeconds(59,999),i}function dc(t,e){const i=I(t,e==null?void 0:e.in),n=i.getMonth(),r=n-n%3+3;return i.setMonth(r,0),i.setHours(23,59,59,999),i}function uc(t,e){const i=I(t,e==null?void 0:e.in);return i.setMilliseconds(999),i}const pc={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},hc=(t,e,i)=>{let n;const r=pc[t];return typeof r=="string"?n=r:e===1?n=r.one:n=r.other.replace("{{count}}",e.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+n:n+" ago":n};function bn(t){return(e={})=>{const i=e.width?String(e.width):t.defaultWidth;return t.formats[i]||t.formats[t.defaultWidth]}}const gc={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},fc={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},mc={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},bc={date:bn({formats:gc,defaultWidth:"full"}),time:bn({formats:fc,defaultWidth:"full"}),dateTime:bn({formats:mc,defaultWidth:"full"})},yc={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},vc=(t,e,i,n)=>yc[t];function qe(t){return(e,i)=>{const n=i!=null&&i.context?String(i.context):"standalone";let r;if(n==="formatting"&&t.formattingValues){const s=t.defaultFormattingWidth||t.defaultWidth,l=i!=null&&i.width?String(i.width):s;r=t.formattingValues[l]||t.formattingValues[s]}else{const s=t.defaultWidth,l=i!=null&&i.width?String(i.width):t.defaultWidth;r=t.values[l]||t.values[s]}const a=t.argumentCallback?t.argumentCallback(e):e;return r[a]}}const xc={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},wc={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},$c={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},_c={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},kc={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},Sc={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},Cc=(t,e)=>{const i=Number(t),n=i%100;if(n>20||n<10)switch(n%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},Pc={ordinalNumber:Cc,era:qe({values:xc,defaultWidth:"wide"}),quarter:qe({values:wc,defaultWidth:"wide",argumentCallback:t=>t-1}),month:qe({values:$c,defaultWidth:"wide"}),day:qe({values:_c,defaultWidth:"wide"}),dayPeriod:qe({values:kc,defaultWidth:"wide",formattingValues:Sc,defaultFormattingWidth:"wide"})};function Ye(t){return(e,i={})=>{const n=i.width,r=n&&t.matchPatterns[n]||t.matchPatterns[t.defaultMatchWidth],a=e.match(r);if(!a)return null;const s=a[0],l=n&&t.parsePatterns[n]||t.parsePatterns[t.defaultParseWidth],c=Array.isArray(l)?Mc(l,f=>f.test(s)):Tc(l,f=>f.test(s));let u;u=t.valueCallback?t.valueCallback(c):c,u=i.valueCallback?i.valueCallback(u):u;const p=e.slice(s.length);return{value:u,rest:p}}}function Tc(t,e){for(const i in t)if(Object.prototype.hasOwnProperty.call(t,i)&&e(t[i]))return i}function Mc(t,e){for(let i=0;i<t.length;i++)if(e(t[i]))return i}function Dc(t){return(e,i={})=>{const n=e.match(t.matchPattern);if(!n)return null;const r=n[0],a=e.match(t.parsePattern);if(!a)return null;let s=t.valueCallback?t.valueCallback(a[0]):a[0];s=i.valueCallback?i.valueCallback(s):s;const l=e.slice(r.length);return{value:s,rest:l}}}const Ec=/^(\d+)(th|st|nd|rd)?/i,Oc=/\d+/i,zc={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},Lc={any:[/^b/i,/^(a|c)/i]},Ac={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},Ic={any:[/1/i,/2/i,/3/i,/4/i]},Bc={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},Fc={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},Nc={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},Rc={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},Hc={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},Wc={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},jc={ordinalNumber:Dc({matchPattern:Ec,parsePattern:Oc,valueCallback:t=>parseInt(t,10)}),era:Ye({matchPatterns:zc,defaultMatchWidth:"wide",parsePatterns:Lc,defaultParseWidth:"any"}),quarter:Ye({matchPatterns:Ac,defaultMatchWidth:"wide",parsePatterns:Ic,defaultParseWidth:"any",valueCallback:t=>t+1}),month:Ye({matchPatterns:Bc,defaultMatchWidth:"wide",parsePatterns:Fc,defaultParseWidth:"any"}),day:Ye({matchPatterns:Nc,defaultMatchWidth:"wide",parsePatterns:Rc,defaultParseWidth:"any"}),dayPeriod:Ye({matchPatterns:Hc,defaultMatchWidth:"any",parsePatterns:Wc,defaultParseWidth:"any"})},_a={code:"en-US",formatDistance:hc,formatLong:bc,formatRelative:vc,localize:Pc,match:jc,options:{weekStartsOn:0,firstWeekContainsDate:1}};function Vc(t,e){const i=I(t,e==null?void 0:e.in);return ma(i,$a(i))+1}function ka(t,e){const i=I(t,e==null?void 0:e.in),n=+Se(i)-+Wl(i);return Math.round(n/ga)+1}function Rn(t,e){var p,f,y,m;const i=I(t,e==null?void 0:e.in),n=i.getFullYear(),r=ce(),a=(e==null?void 0:e.firstWeekContainsDate)??((f=(p=e==null?void 0:e.locale)==null?void 0:p.options)==null?void 0:f.firstWeekContainsDate)??r.firstWeekContainsDate??((m=(y=r.locale)==null?void 0:y.options)==null?void 0:m.firstWeekContainsDate)??1,s=st((e==null?void 0:e.in)||t,0);s.setFullYear(n+1,0,a),s.setHours(0,0,0,0);const l=Mt(s,e),c=st((e==null?void 0:e.in)||t,0);c.setFullYear(n,0,a),c.setHours(0,0,0,0);const u=Mt(c,e);return+i>=+l?n+1:+i>=+u?n:n-1}function qc(t,e){var l,c,u,p;const i=ce(),n=(e==null?void 0:e.firstWeekContainsDate)??((c=(l=e==null?void 0:e.locale)==null?void 0:l.options)==null?void 0:c.firstWeekContainsDate)??i.firstWeekContainsDate??((p=(u=i.locale)==null?void 0:u.options)==null?void 0:p.firstWeekContainsDate)??1,r=Rn(t,e),a=st((e==null?void 0:e.in)||t,0);return a.setFullYear(r,0,n),a.setHours(0,0,0,0),Mt(a,e)}function Sa(t,e){const i=I(t,e==null?void 0:e.in),n=+Mt(i,e)-+qc(i,e);return Math.round(n/ga)+1}function Z(t,e){const i=t<0?"-":"",n=Math.abs(t).toString().padStart(e,"0");return i+n}const At={y(t,e){const i=t.getFullYear(),n=i>0?i:1-i;return Z(e==="yy"?n%100:n,e.length)},M(t,e){const i=t.getMonth();return e==="M"?String(i+1):Z(i+1,2)},d(t,e){return Z(t.getDate(),e.length)},a(t,e){const i=t.getHours()/12>=1?"pm":"am";switch(e){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(t,e){return Z(t.getHours()%12||12,e.length)},H(t,e){return Z(t.getHours(),e.length)},m(t,e){return Z(t.getMinutes(),e.length)},s(t,e){return Z(t.getSeconds(),e.length)},S(t,e){const i=e.length,n=t.getMilliseconds(),r=Math.trunc(n*Math.pow(10,i-3));return Z(r,e.length)}},he={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},Mr={G:function(t,e,i){const n=t.getFullYear()>0?1:0;switch(e){case"G":case"GG":case"GGG":return i.era(n,{width:"abbreviated"});case"GGGGG":return i.era(n,{width:"narrow"});case"GGGG":default:return i.era(n,{width:"wide"})}},y:function(t,e,i){if(e==="yo"){const n=t.getFullYear(),r=n>0?n:1-n;return i.ordinalNumber(r,{unit:"year"})}return At.y(t,e)},Y:function(t,e,i,n){const r=Rn(t,n),a=r>0?r:1-r;if(e==="YY"){const s=a%100;return Z(s,2)}return e==="Yo"?i.ordinalNumber(a,{unit:"year"}):Z(a,e.length)},R:function(t,e){const i=fa(t);return Z(i,e.length)},u:function(t,e){const i=t.getFullYear();return Z(i,e.length)},Q:function(t,e,i){const n=Math.ceil((t.getMonth()+1)/3);switch(e){case"Q":return String(n);case"QQ":return Z(n,2);case"Qo":return i.ordinalNumber(n,{unit:"quarter"});case"QQQ":return i.quarter(n,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(n,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(n,{width:"wide",context:"formatting"})}},q:function(t,e,i){const n=Math.ceil((t.getMonth()+1)/3);switch(e){case"q":return String(n);case"qq":return Z(n,2);case"qo":return i.ordinalNumber(n,{unit:"quarter"});case"qqq":return i.quarter(n,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(n,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(n,{width:"wide",context:"standalone"})}},M:function(t,e,i){const n=t.getMonth();switch(e){case"M":case"MM":return At.M(t,e);case"Mo":return i.ordinalNumber(n+1,{unit:"month"});case"MMM":return i.month(n,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(n,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(n,{width:"wide",context:"formatting"})}},L:function(t,e,i){const n=t.getMonth();switch(e){case"L":return String(n+1);case"LL":return Z(n+1,2);case"Lo":return i.ordinalNumber(n+1,{unit:"month"});case"LLL":return i.month(n,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(n,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(n,{width:"wide",context:"standalone"})}},w:function(t,e,i,n){const r=Sa(t,n);return e==="wo"?i.ordinalNumber(r,{unit:"week"}):Z(r,e.length)},I:function(t,e,i){const n=ka(t);return e==="Io"?i.ordinalNumber(n,{unit:"week"}):Z(n,e.length)},d:function(t,e,i){return e==="do"?i.ordinalNumber(t.getDate(),{unit:"date"}):At.d(t,e)},D:function(t,e,i){const n=Vc(t);return e==="Do"?i.ordinalNumber(n,{unit:"dayOfYear"}):Z(n,e.length)},E:function(t,e,i){const n=t.getDay();switch(e){case"E":case"EE":case"EEE":return i.day(n,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(n,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(n,{width:"short",context:"formatting"});case"EEEE":default:return i.day(n,{width:"wide",context:"formatting"})}},e:function(t,e,i,n){const r=t.getDay(),a=(r-n.weekStartsOn+8)%7||7;switch(e){case"e":return String(a);case"ee":return Z(a,2);case"eo":return i.ordinalNumber(a,{unit:"day"});case"eee":return i.day(r,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(r,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(r,{width:"short",context:"formatting"});case"eeee":default:return i.day(r,{width:"wide",context:"formatting"})}},c:function(t,e,i,n){const r=t.getDay(),a=(r-n.weekStartsOn+8)%7||7;switch(e){case"c":return String(a);case"cc":return Z(a,e.length);case"co":return i.ordinalNumber(a,{unit:"day"});case"ccc":return i.day(r,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(r,{width:"narrow",context:"standalone"});case"cccccc":return i.day(r,{width:"short",context:"standalone"});case"cccc":default:return i.day(r,{width:"wide",context:"standalone"})}},i:function(t,e,i){const n=t.getDay(),r=n===0?7:n;switch(e){case"i":return String(r);case"ii":return Z(r,e.length);case"io":return i.ordinalNumber(r,{unit:"day"});case"iii":return i.day(n,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(n,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(n,{width:"short",context:"formatting"});case"iiii":default:return i.day(n,{width:"wide",context:"formatting"})}},a:function(t,e,i){const r=t.getHours()/12>=1?"pm":"am";switch(e){case"a":case"aa":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},b:function(t,e,i){const n=t.getHours();let r;switch(n===12?r=he.noon:n===0?r=he.midnight:r=n/12>=1?"pm":"am",e){case"b":case"bb":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},B:function(t,e,i){const n=t.getHours();let r;switch(n>=17?r=he.evening:n>=12?r=he.afternoon:n>=4?r=he.morning:r=he.night,e){case"B":case"BB":case"BBB":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},h:function(t,e,i){if(e==="ho"){let n=t.getHours()%12;return n===0&&(n=12),i.ordinalNumber(n,{unit:"hour"})}return At.h(t,e)},H:function(t,e,i){return e==="Ho"?i.ordinalNumber(t.getHours(),{unit:"hour"}):At.H(t,e)},K:function(t,e,i){const n=t.getHours()%12;return e==="Ko"?i.ordinalNumber(n,{unit:"hour"}):Z(n,e.length)},k:function(t,e,i){let n=t.getHours();return n===0&&(n=24),e==="ko"?i.ordinalNumber(n,{unit:"hour"}):Z(n,e.length)},m:function(t,e,i){return e==="mo"?i.ordinalNumber(t.getMinutes(),{unit:"minute"}):At.m(t,e)},s:function(t,e,i){return e==="so"?i.ordinalNumber(t.getSeconds(),{unit:"second"}):At.s(t,e)},S:function(t,e){return At.S(t,e)},X:function(t,e,i){const n=t.getTimezoneOffset();if(n===0)return"Z";switch(e){case"X":return Er(n);case"XXXX":case"XX":return te(n);case"XXXXX":case"XXX":default:return te(n,":")}},x:function(t,e,i){const n=t.getTimezoneOffset();switch(e){case"x":return Er(n);case"xxxx":case"xx":return te(n);case"xxxxx":case"xxx":default:return te(n,":")}},O:function(t,e,i){const n=t.getTimezoneOffset();switch(e){case"O":case"OO":case"OOO":return"GMT"+Dr(n,":");case"OOOO":default:return"GMT"+te(n,":")}},z:function(t,e,i){const n=t.getTimezoneOffset();switch(e){case"z":case"zz":case"zzz":return"GMT"+Dr(n,":");case"zzzz":default:return"GMT"+te(n,":")}},t:function(t,e,i){const n=Math.trunc(+t/1e3);return Z(n,e.length)},T:function(t,e,i){return Z(+t,e.length)}};function Dr(t,e=""){const i=t>0?"-":"+",n=Math.abs(t),r=Math.trunc(n/60),a=n%60;return a===0?i+String(r):i+String(r)+e+Z(a,2)}function Er(t,e){return t%60===0?(t>0?"-":"+")+Z(Math.abs(t)/60,2):te(t,e)}function te(t,e=""){const i=t>0?"-":"+",n=Math.abs(t),r=Z(Math.trunc(n/60),2),a=Z(n%60,2);return i+r+e+a}const Or=(t,e)=>{switch(t){case"P":return e.date({width:"short"});case"PP":return e.date({width:"medium"});case"PPP":return e.date({width:"long"});case"PPPP":default:return e.date({width:"full"})}},Ca=(t,e)=>{switch(t){case"p":return e.time({width:"short"});case"pp":return e.time({width:"medium"});case"ppp":return e.time({width:"long"});case"pppp":default:return e.time({width:"full"})}},Yc=(t,e)=>{const i=t.match(/(P+)(p+)?/)||[],n=i[1],r=i[2];if(!r)return Or(t,e);let a;switch(n){case"P":a=e.dateTime({width:"short"});break;case"PP":a=e.dateTime({width:"medium"});break;case"PPP":a=e.dateTime({width:"long"});break;case"PPPP":default:a=e.dateTime({width:"full"});break}return a.replace("{{date}}",Or(n,e)).replace("{{time}}",Ca(r,e))},Tn={p:Ca,P:Yc},Gc=/^D+$/,Uc=/^Y+$/,Zc=["D","DD","YY","YYYY"];function Pa(t){return Gc.test(t)}function Ta(t){return Uc.test(t)}function Mn(t,e,i){const n=Kc(t,e,i);if(console.warn(n),Zc.includes(t))throw new RangeError(n)}function Kc(t,e,i){const n=t[0]==="Y"?"years":"days of the month";return`Use \`${t.toLowerCase()}\` instead of \`${t}\` (in \`${e}\`) for formatting ${n} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const Qc=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Xc=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Jc=/^'([^]*?)'?$/,td=/''/g,ed=/[a-zA-Z]/;function id(t,e,i){var p,f,y,m,g,b,$,S;const n=ce(),r=(i==null?void 0:i.locale)??n.locale??_a,a=(i==null?void 0:i.firstWeekContainsDate)??((f=(p=i==null?void 0:i.locale)==null?void 0:p.options)==null?void 0:f.firstWeekContainsDate)??n.firstWeekContainsDate??((m=(y=n.locale)==null?void 0:y.options)==null?void 0:m.firstWeekContainsDate)??1,s=(i==null?void 0:i.weekStartsOn)??((b=(g=i==null?void 0:i.locale)==null?void 0:g.options)==null?void 0:b.weekStartsOn)??n.weekStartsOn??((S=($=n.locale)==null?void 0:$.options)==null?void 0:S.weekStartsOn)??0,l=I(t,i==null?void 0:i.in);if(!ba(l))throw new RangeError("Invalid time value");let c=e.match(Xc).map(_=>{const C=_[0];if(C==="p"||C==="P"){const G=Tn[C];return G(_,r.formatLong)}return _}).join("").match(Qc).map(_=>{if(_==="''")return{isToken:!1,value:"'"};const C=_[0];if(C==="'")return{isToken:!1,value:nd(_)};if(Mr[C])return{isToken:!0,value:_};if(C.match(ed))throw new RangeError("Format string contains an unescaped latin alphabet character `"+C+"`");return{isToken:!1,value:_}});r.localize.preprocessor&&(c=r.localize.preprocessor(l,c));const u={firstWeekContainsDate:a,weekStartsOn:s,locale:r};return c.map(_=>{if(!_.isToken)return _.value;const C=_.value;(!(i!=null&&i.useAdditionalWeekYearTokens)&&Ta(C)||!(i!=null&&i.useAdditionalDayOfYearTokens)&&Pa(C))&&Mn(C,e,String(t));const G=Mr[C[0]];return G(l,C,r.localize,u)}).join("")}function nd(t){const e=t.match(Jc);return e?e[1].replace(td,"'"):t}function rd(){return Object.assign({},ce())}function ad(t,e){const i=I(t,e==null?void 0:e.in).getDay();return i===0?7:i}function sd(t,e){const i=od(e)?new e(0):st(e,0);return i.setFullYear(t.getFullYear(),t.getMonth(),t.getDate()),i.setHours(t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()),i}function od(t){var e;return typeof t=="function"&&((e=t.prototype)==null?void 0:e.constructor)===t}const ld=10;class Ma{constructor(){k(this,"subPriority",0)}validate(e,i){return!0}}class cd extends Ma{constructor(e,i,n,r,a){super(),this.value=e,this.validateValue=i,this.setValue=n,this.priority=r,a&&(this.subPriority=a)}validate(e,i){return this.validateValue(e,this.value,i)}set(e,i,n){return this.setValue(e,i,this.value,n)}}class dd extends Ma{constructor(i,n){super();k(this,"priority",ld);k(this,"subPriority",-1);this.context=i||(r=>st(n,r))}set(i,n){return n.timestampIsSet?i:st(i,sd(i,this.context))}}class U{run(e,i,n,r){const a=this.parse(e,i,n,r);return a?{setter:new cd(a.value,this.validate,this.set,this.priority,this.subPriority),rest:a.rest}:null}validate(e,i,n){return!0}}class ud extends U{constructor(){super(...arguments);k(this,"priority",140);k(this,"incompatibleTokens",["R","u","t","T"])}parse(i,n,r){switch(n){case"G":case"GG":case"GGG":return r.era(i,{width:"abbreviated"})||r.era(i,{width:"narrow"});case"GGGGG":return r.era(i,{width:"narrow"});case"GGGG":default:return r.era(i,{width:"wide"})||r.era(i,{width:"abbreviated"})||r.era(i,{width:"narrow"})}}set(i,n,r){return n.era=r,i.setFullYear(r,0,1),i.setHours(0,0,0,0),i}}const lt={month:/^(1[0-2]|0?\d)/,date:/^(3[0-1]|[0-2]?\d)/,dayOfYear:/^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,week:/^(5[0-3]|[0-4]?\d)/,hour23h:/^(2[0-3]|[0-1]?\d)/,hour24h:/^(2[0-4]|[0-1]?\d)/,hour11h:/^(1[0-1]|0?\d)/,hour12h:/^(1[0-2]|0?\d)/,minute:/^[0-5]?\d/,second:/^[0-5]?\d/,singleDigit:/^\d/,twoDigits:/^\d{1,2}/,threeDigits:/^\d{1,3}/,fourDigits:/^\d{1,4}/,anyDigitsSigned:/^-?\d+/,singleDigitSigned:/^-?\d/,twoDigitsSigned:/^-?\d{1,2}/,threeDigitsSigned:/^-?\d{1,3}/,fourDigitsSigned:/^-?\d{1,4}/},Ct={basicOptionalMinutes:/^([+-])(\d{2})(\d{2})?|Z/,basic:/^([+-])(\d{2})(\d{2})|Z/,basicOptionalSeconds:/^([+-])(\d{2})(\d{2})((\d{2}))?|Z/,extended:/^([+-])(\d{2}):(\d{2})|Z/,extendedOptionalSeconds:/^([+-])(\d{2}):(\d{2})(:(\d{2}))?|Z/};function ct(t,e){return t&&{value:e(t.value),rest:t.rest}}function nt(t,e){const i=e.match(t);return i?{value:parseInt(i[0],10),rest:e.slice(i[0].length)}:null}function Pt(t,e){const i=e.match(t);if(!i)return null;if(i[0]==="Z")return{value:0,rest:e.slice(1)};const n=i[1]==="+"?1:-1,r=i[2]?parseInt(i[2],10):0,a=i[3]?parseInt(i[3],10):0,s=i[5]?parseInt(i[5],10):0;return{value:n*(r*yi+a*bi+s*Nl),rest:e.slice(i[0].length)}}function Da(t){return nt(lt.anyDigitsSigned,t)}function ot(t,e){switch(t){case 1:return nt(lt.singleDigit,e);case 2:return nt(lt.twoDigits,e);case 3:return nt(lt.threeDigits,e);case 4:return nt(lt.fourDigits,e);default:return nt(new RegExp("^\\d{1,"+t+"}"),e)}}function Ii(t,e){switch(t){case 1:return nt(lt.singleDigitSigned,e);case 2:return nt(lt.twoDigitsSigned,e);case 3:return nt(lt.threeDigitsSigned,e);case 4:return nt(lt.fourDigitsSigned,e);default:return nt(new RegExp("^-?\\d{1,"+t+"}"),e)}}function Hn(t){switch(t){case"morning":return 4;case"evening":return 17;case"pm":case"noon":case"afternoon":return 12;case"am":case"midnight":case"night":default:return 0}}function Ea(t,e){const i=e>0,n=i?e:1-e;let r;if(n<=50)r=t||100;else{const a=n+50,s=Math.trunc(a/100)*100,l=t>=a%100;r=t+s-(l?100:0)}return i?r:1-r}function Oa(t){return t%400===0||t%4===0&&t%100!==0}class pd extends U{constructor(){super(...arguments);k(this,"priority",130);k(this,"incompatibleTokens",["Y","R","u","w","I","i","e","c","t","T"])}parse(i,n,r){const a=s=>({year:s,isTwoDigitYear:n==="yy"});switch(n){case"y":return ct(ot(4,i),a);case"yo":return ct(r.ordinalNumber(i,{unit:"year"}),a);default:return ct(ot(n.length,i),a)}}validate(i,n){return n.isTwoDigitYear||n.year>0}set(i,n,r){const a=i.getFullYear();if(r.isTwoDigitYear){const l=Ea(r.year,a);return i.setFullYear(l,0,1),i.setHours(0,0,0,0),i}const s=!("era"in n)||n.era===1?r.year:1-r.year;return i.setFullYear(s,0,1),i.setHours(0,0,0,0),i}}class hd extends U{constructor(){super(...arguments);k(this,"priority",130);k(this,"incompatibleTokens",["y","R","u","Q","q","M","L","I","d","D","i","t","T"])}parse(i,n,r){const a=s=>({year:s,isTwoDigitYear:n==="YY"});switch(n){case"Y":return ct(ot(4,i),a);case"Yo":return ct(r.ordinalNumber(i,{unit:"year"}),a);default:return ct(ot(n.length,i),a)}}validate(i,n){return n.isTwoDigitYear||n.year>0}set(i,n,r,a){const s=Rn(i,a);if(r.isTwoDigitYear){const c=Ea(r.year,s);return i.setFullYear(c,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),Mt(i,a)}const l=!("era"in n)||n.era===1?r.year:1-r.year;return i.setFullYear(l,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),Mt(i,a)}}class gd extends U{constructor(){super(...arguments);k(this,"priority",130);k(this,"incompatibleTokens",["G","y","Y","u","Q","q","M","L","w","d","D","e","c","t","T"])}parse(i,n){return Ii(n==="R"?4:n.length,i)}set(i,n,r){const a=st(i,0);return a.setFullYear(r,0,4),a.setHours(0,0,0,0),Se(a)}}class fd extends U{constructor(){super(...arguments);k(this,"priority",130);k(this,"incompatibleTokens",["G","y","Y","R","w","I","i","e","c","t","T"])}parse(i,n){return Ii(n==="u"?4:n.length,i)}set(i,n,r){return i.setFullYear(r,0,1),i.setHours(0,0,0,0),i}}class md extends U{constructor(){super(...arguments);k(this,"priority",120);k(this,"incompatibleTokens",["Y","R","q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"Q":case"QQ":return ot(n.length,i);case"Qo":return r.ordinalNumber(i,{unit:"quarter"});case"QQQ":return r.quarter(i,{width:"abbreviated",context:"formatting"})||r.quarter(i,{width:"narrow",context:"formatting"});case"QQQQQ":return r.quarter(i,{width:"narrow",context:"formatting"});case"QQQQ":default:return r.quarter(i,{width:"wide",context:"formatting"})||r.quarter(i,{width:"abbreviated",context:"formatting"})||r.quarter(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=1&&n<=4}set(i,n,r){return i.setMonth((r-1)*3,1),i.setHours(0,0,0,0),i}}class bd extends U{constructor(){super(...arguments);k(this,"priority",120);k(this,"incompatibleTokens",["Y","R","Q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"q":case"qq":return ot(n.length,i);case"qo":return r.ordinalNumber(i,{unit:"quarter"});case"qqq":return r.quarter(i,{width:"abbreviated",context:"standalone"})||r.quarter(i,{width:"narrow",context:"standalone"});case"qqqqq":return r.quarter(i,{width:"narrow",context:"standalone"});case"qqqq":default:return r.quarter(i,{width:"wide",context:"standalone"})||r.quarter(i,{width:"abbreviated",context:"standalone"})||r.quarter(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=1&&n<=4}set(i,n,r){return i.setMonth((r-1)*3,1),i.setHours(0,0,0,0),i}}class yd extends U{constructor(){super(...arguments);k(this,"incompatibleTokens",["Y","R","q","Q","L","w","I","D","i","e","c","t","T"]);k(this,"priority",110)}parse(i,n,r){const a=s=>s-1;switch(n){case"M":return ct(nt(lt.month,i),a);case"MM":return ct(ot(2,i),a);case"Mo":return ct(r.ordinalNumber(i,{unit:"month"}),a);case"MMM":return r.month(i,{width:"abbreviated",context:"formatting"})||r.month(i,{width:"narrow",context:"formatting"});case"MMMMM":return r.month(i,{width:"narrow",context:"formatting"});case"MMMM":default:return r.month(i,{width:"wide",context:"formatting"})||r.month(i,{width:"abbreviated",context:"formatting"})||r.month(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.setMonth(r,1),i.setHours(0,0,0,0),i}}class vd extends U{constructor(){super(...arguments);k(this,"priority",110);k(this,"incompatibleTokens",["Y","R","q","Q","M","w","I","D","i","e","c","t","T"])}parse(i,n,r){const a=s=>s-1;switch(n){case"L":return ct(nt(lt.month,i),a);case"LL":return ct(ot(2,i),a);case"Lo":return ct(r.ordinalNumber(i,{unit:"month"}),a);case"LLL":return r.month(i,{width:"abbreviated",context:"standalone"})||r.month(i,{width:"narrow",context:"standalone"});case"LLLLL":return r.month(i,{width:"narrow",context:"standalone"});case"LLLL":default:return r.month(i,{width:"wide",context:"standalone"})||r.month(i,{width:"abbreviated",context:"standalone"})||r.month(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.setMonth(r,1),i.setHours(0,0,0,0),i}}function xd(t,e,i){const n=I(t,i==null?void 0:i.in),r=Sa(n,i)-e;return n.setDate(n.getDate()-r*7),I(n,i==null?void 0:i.in)}class wd extends U{constructor(){super(...arguments);k(this,"priority",100);k(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","i","t","T"])}parse(i,n,r){switch(n){case"w":return nt(lt.week,i);case"wo":return r.ordinalNumber(i,{unit:"week"});default:return ot(n.length,i)}}validate(i,n){return n>=1&&n<=53}set(i,n,r,a){return Mt(xd(i,r,a),a)}}function $d(t,e,i){const n=I(t,i==null?void 0:i.in),r=ka(n,i)-e;return n.setDate(n.getDate()-r*7),n}class _d extends U{constructor(){super(...arguments);k(this,"priority",100);k(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","e","c","t","T"])}parse(i,n,r){switch(n){case"I":return nt(lt.week,i);case"Io":return r.ordinalNumber(i,{unit:"week"});default:return ot(n.length,i)}}validate(i,n){return n>=1&&n<=53}set(i,n,r){return Se($d(i,r))}}const kd=[31,28,31,30,31,30,31,31,30,31,30,31],Sd=[31,29,31,30,31,30,31,31,30,31,30,31];class Cd extends U{constructor(){super(...arguments);k(this,"priority",90);k(this,"subPriority",1);k(this,"incompatibleTokens",["Y","R","q","Q","w","I","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"d":return nt(lt.date,i);case"do":return r.ordinalNumber(i,{unit:"date"});default:return ot(n.length,i)}}validate(i,n){const r=i.getFullYear(),a=Oa(r),s=i.getMonth();return a?n>=1&&n<=Sd[s]:n>=1&&n<=kd[s]}set(i,n,r){return i.setDate(r),i.setHours(0,0,0,0),i}}class Pd extends U{constructor(){super(...arguments);k(this,"priority",90);k(this,"subpriority",1);k(this,"incompatibleTokens",["Y","R","q","Q","M","L","w","I","d","E","i","e","c","t","T"])}parse(i,n,r){switch(n){case"D":case"DD":return nt(lt.dayOfYear,i);case"Do":return r.ordinalNumber(i,{unit:"date"});default:return ot(n.length,i)}}validate(i,n){const r=i.getFullYear();return Oa(r)?n>=1&&n<=366:n>=1&&n<=365}set(i,n,r){return i.setMonth(0,r),i.setHours(0,0,0,0),i}}function Wn(t,e,i){var f,y,m,g;const n=ce(),r=(i==null?void 0:i.weekStartsOn)??((y=(f=i==null?void 0:i.locale)==null?void 0:f.options)==null?void 0:y.weekStartsOn)??n.weekStartsOn??((g=(m=n.locale)==null?void 0:m.options)==null?void 0:g.weekStartsOn)??0,a=I(t,i==null?void 0:i.in),s=a.getDay(),c=(e%7+7)%7,u=7-r,p=e<0||e>6?e-(s+u)%7:(c+u)%7-(s+u)%7;return nn(a,p,i)}class Td extends U{constructor(){super(...arguments);k(this,"priority",90);k(this,"incompatibleTokens",["D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"E":case"EE":case"EEE":return r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"EEEEE":return r.day(i,{width:"narrow",context:"formatting"});case"EEEEEE":return r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"EEEE":default:return r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=Wn(i,r,a),i.setHours(0,0,0,0),i}}class Md extends U{constructor(){super(...arguments);k(this,"priority",90);k(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","c","t","T"])}parse(i,n,r,a){const s=l=>{const c=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+c};switch(n){case"e":case"ee":return ct(ot(n.length,i),s);case"eo":return ct(r.ordinalNumber(i,{unit:"day"}),s);case"eee":return r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"eeeee":return r.day(i,{width:"narrow",context:"formatting"});case"eeeeee":return r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"eeee":default:return r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=Wn(i,r,a),i.setHours(0,0,0,0),i}}class Dd extends U{constructor(){super(...arguments);k(this,"priority",90);k(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","e","t","T"])}parse(i,n,r,a){const s=l=>{const c=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+c};switch(n){case"c":case"cc":return ct(ot(n.length,i),s);case"co":return ct(r.ordinalNumber(i,{unit:"day"}),s);case"ccc":return r.day(i,{width:"abbreviated",context:"standalone"})||r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"});case"ccccc":return r.day(i,{width:"narrow",context:"standalone"});case"cccccc":return r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"});case"cccc":default:return r.day(i,{width:"wide",context:"standalone"})||r.day(i,{width:"abbreviated",context:"standalone"})||r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=Wn(i,r,a),i.setHours(0,0,0,0),i}}function Ed(t,e,i){const n=I(t,i==null?void 0:i.in),r=ad(n,i),a=e-r;return nn(n,a,i)}class Od extends U{constructor(){super(...arguments);k(this,"priority",90);k(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","E","e","c","t","T"])}parse(i,n,r){const a=s=>s===0?7:s;switch(n){case"i":case"ii":return ot(n.length,i);case"io":return r.ordinalNumber(i,{unit:"day"});case"iii":return ct(r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a);case"iiiii":return ct(r.day(i,{width:"narrow",context:"formatting"}),a);case"iiiiii":return ct(r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a);case"iiii":default:return ct(r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a)}}validate(i,n){return n>=1&&n<=7}set(i,n,r){return i=Ed(i,r),i.setHours(0,0,0,0),i}}class zd extends U{constructor(){super(...arguments);k(this,"priority",80);k(this,"incompatibleTokens",["b","B","H","k","t","T"])}parse(i,n,r){switch(n){case"a":case"aa":case"aaa":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaaa":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaa":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(Hn(r),0,0,0),i}}class Ld extends U{constructor(){super(...arguments);k(this,"priority",80);k(this,"incompatibleTokens",["a","B","H","k","t","T"])}parse(i,n,r){switch(n){case"b":case"bb":case"bbb":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbbb":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbb":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(Hn(r),0,0,0),i}}class Ad extends U{constructor(){super(...arguments);k(this,"priority",80);k(this,"incompatibleTokens",["a","b","t","T"])}parse(i,n,r){switch(n){case"B":case"BB":case"BBB":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBBB":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBB":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(Hn(r),0,0,0),i}}class Id extends U{constructor(){super(...arguments);k(this,"priority",70);k(this,"incompatibleTokens",["H","K","k","t","T"])}parse(i,n,r){switch(n){case"h":return nt(lt.hour12h,i);case"ho":return r.ordinalNumber(i,{unit:"hour"});default:return ot(n.length,i)}}validate(i,n){return n>=1&&n<=12}set(i,n,r){const a=i.getHours()>=12;return a&&r<12?i.setHours(r+12,0,0,0):!a&&r===12?i.setHours(0,0,0,0):i.setHours(r,0,0,0),i}}class Bd extends U{constructor(){super(...arguments);k(this,"priority",70);k(this,"incompatibleTokens",["a","b","h","K","k","t","T"])}parse(i,n,r){switch(n){case"H":return nt(lt.hour23h,i);case"Ho":return r.ordinalNumber(i,{unit:"hour"});default:return ot(n.length,i)}}validate(i,n){return n>=0&&n<=23}set(i,n,r){return i.setHours(r,0,0,0),i}}class Fd extends U{constructor(){super(...arguments);k(this,"priority",70);k(this,"incompatibleTokens",["h","H","k","t","T"])}parse(i,n,r){switch(n){case"K":return nt(lt.hour11h,i);case"Ko":return r.ordinalNumber(i,{unit:"hour"});default:return ot(n.length,i)}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.getHours()>=12&&r<12?i.setHours(r+12,0,0,0):i.setHours(r,0,0,0),i}}class Nd extends U{constructor(){super(...arguments);k(this,"priority",70);k(this,"incompatibleTokens",["a","b","h","H","K","t","T"])}parse(i,n,r){switch(n){case"k":return nt(lt.hour24h,i);case"ko":return r.ordinalNumber(i,{unit:"hour"});default:return ot(n.length,i)}}validate(i,n){return n>=1&&n<=24}set(i,n,r){const a=r<=24?r%24:r;return i.setHours(a,0,0,0),i}}class Rd extends U{constructor(){super(...arguments);k(this,"priority",60);k(this,"incompatibleTokens",["t","T"])}parse(i,n,r){switch(n){case"m":return nt(lt.minute,i);case"mo":return r.ordinalNumber(i,{unit:"minute"});default:return ot(n.length,i)}}validate(i,n){return n>=0&&n<=59}set(i,n,r){return i.setMinutes(r,0,0),i}}class Hd extends U{constructor(){super(...arguments);k(this,"priority",50);k(this,"incompatibleTokens",["t","T"])}parse(i,n,r){switch(n){case"s":return nt(lt.second,i);case"so":return r.ordinalNumber(i,{unit:"second"});default:return ot(n.length,i)}}validate(i,n){return n>=0&&n<=59}set(i,n,r){return i.setSeconds(r,0),i}}class Wd extends U{constructor(){super(...arguments);k(this,"priority",30);k(this,"incompatibleTokens",["t","T"])}parse(i,n){const r=a=>Math.trunc(a*Math.pow(10,-n.length+3));return ct(ot(n.length,i),r)}set(i,n,r){return i.setMilliseconds(r),i}}class jd extends U{constructor(){super(...arguments);k(this,"priority",10);k(this,"incompatibleTokens",["t","T","x"])}parse(i,n){switch(n){case"X":return Pt(Ct.basicOptionalMinutes,i);case"XX":return Pt(Ct.basic,i);case"XXXX":return Pt(Ct.basicOptionalSeconds,i);case"XXXXX":return Pt(Ct.extendedOptionalSeconds,i);case"XXX":default:return Pt(Ct.extended,i)}}set(i,n,r){return n.timestampIsSet?i:st(i,i.getTime()-Ai(i)-r)}}class Vd extends U{constructor(){super(...arguments);k(this,"priority",10);k(this,"incompatibleTokens",["t","T","X"])}parse(i,n){switch(n){case"x":return Pt(Ct.basicOptionalMinutes,i);case"xx":return Pt(Ct.basic,i);case"xxxx":return Pt(Ct.basicOptionalSeconds,i);case"xxxxx":return Pt(Ct.extendedOptionalSeconds,i);case"xxx":default:return Pt(Ct.extended,i)}}set(i,n,r){return n.timestampIsSet?i:st(i,i.getTime()-Ai(i)-r)}}class qd extends U{constructor(){super(...arguments);k(this,"priority",40);k(this,"incompatibleTokens","*")}parse(i){return Da(i)}set(i,n,r){return[st(i,r*1e3),{timestampIsSet:!0}]}}class Yd extends U{constructor(){super(...arguments);k(this,"priority",20);k(this,"incompatibleTokens","*")}parse(i){return Da(i)}set(i,n,r){return[st(i,r),{timestampIsSet:!0}]}}const Gd={G:new ud,y:new pd,Y:new hd,R:new gd,u:new fd,Q:new md,q:new bd,M:new yd,L:new vd,w:new wd,I:new _d,d:new Cd,D:new Pd,E:new Td,e:new Md,c:new Dd,i:new Od,a:new zd,b:new Ld,B:new Ad,h:new Id,H:new Bd,K:new Fd,k:new Nd,m:new Rd,s:new Hd,S:new Wd,X:new jd,x:new Vd,t:new qd,T:new Yd},Ud=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Zd=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Kd=/^'([^]*?)'?$/,Qd=/''/g,Xd=/\S/,Jd=/[a-zA-Z]/;function tu(t,e,i,n){var $,S,_,C,G,K,w,j;const r=()=>st((n==null?void 0:n.in)||i,NaN),a=rd(),s=(n==null?void 0:n.locale)??a.locale??_a,l=(n==null?void 0:n.firstWeekContainsDate)??((S=($=n==null?void 0:n.locale)==null?void 0:$.options)==null?void 0:S.firstWeekContainsDate)??a.firstWeekContainsDate??((C=(_=a.locale)==null?void 0:_.options)==null?void 0:C.firstWeekContainsDate)??1,c=(n==null?void 0:n.weekStartsOn)??((K=(G=n==null?void 0:n.locale)==null?void 0:G.options)==null?void 0:K.weekStartsOn)??a.weekStartsOn??((j=(w=a.locale)==null?void 0:w.options)==null?void 0:j.weekStartsOn)??0;if(!e)return t?r():I(i,n==null?void 0:n.in);const u={firstWeekContainsDate:l,weekStartsOn:c,locale:s},p=[new dd(n==null?void 0:n.in,i)],f=e.match(Zd).map(L=>{const z=L[0];if(z in Tn){const Y=Tn[z];return Y(L,s.formatLong)}return L}).join("").match(Ud),y=[];for(let L of f){!(n!=null&&n.useAdditionalWeekYearTokens)&&Ta(L)&&Mn(L,e,t),!(n!=null&&n.useAdditionalDayOfYearTokens)&&Pa(L)&&Mn(L,e,t);const z=L[0],Y=Gd[z];if(Y){const{incompatibleTokens:V}=Y;if(Array.isArray(V)){const wt=y.find(Yt=>V.includes(Yt.token)||Yt.token===z);if(wt)throw new RangeError(`The format string mustn't contain \`${wt.fullToken}\` and \`${L}\` at the same time`)}else if(Y.incompatibleTokens==="*"&&y.length>0)throw new RangeError(`The format string mustn't contain \`${L}\` and any other token at the same time`);y.push({token:z,fullToken:L});const N=Y.run(t,L,s.match,u);if(!N)return r();p.push(N.setter),t=N.rest}else{if(z.match(Jd))throw new RangeError("Format string contains an unescaped latin alphabet character `"+z+"`");if(L==="''"?L="'":z==="'"&&(L=eu(L)),t.indexOf(L)===0)t=t.slice(L.length);else return r()}}if(t.length>0&&Xd.test(t))return r();const m=p.map(L=>L.priority).sort((L,z)=>z-L).filter((L,z,Y)=>Y.indexOf(L)===z).map(L=>p.filter(z=>z.priority===L).sort((z,Y)=>Y.subPriority-z.subPriority)).map(L=>L[0]);let g=I(i,n==null?void 0:n.in);if(isNaN(+g))return r();const b={};for(const L of m){if(!L.validate(g,u))return r();const z=L.set(g,b,u);Array.isArray(z)?(g=z[0],Object.assign(b,z[1])):g=z}return g}function eu(t){return t.match(Kd)[1].replace(Qd,"'")}function iu(t,e){const i=I(t,e==null?void 0:e.in);return i.setMinutes(0,0,0),i}function nu(t,e){const i=I(t,e==null?void 0:e.in);return i.setSeconds(0,0),i}function ru(t,e){const i=I(t,e==null?void 0:e.in);return i.setMilliseconds(0),i}function au(t,e){const i=()=>st(e==null?void 0:e.in,NaN),n=(e==null?void 0:e.additionalDigits)??2,r=cu(t);let a;if(r.date){const u=du(r.date,n);a=uu(u.restDateString,u.year)}if(!a||isNaN(+a))return i();const s=+a;let l=0,c;if(r.time&&(l=pu(r.time),isNaN(l)))return i();if(r.timezone){if(c=hu(r.timezone),isNaN(c))return i()}else{const u=new Date(s+l),p=I(0,e==null?void 0:e.in);return p.setFullYear(u.getUTCFullYear(),u.getUTCMonth(),u.getUTCDate()),p.setHours(u.getUTCHours(),u.getUTCMinutes(),u.getUTCSeconds(),u.getUTCMilliseconds()),p}return I(s+l+c,e==null?void 0:e.in)}const Ci={dateTimeDelimiter:/[T ]/,timeZoneDelimiter:/[Z ]/i,timezone:/([Z+-].*)$/},su=/^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/,ou=/^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/,lu=/^([+-])(\d{2})(?::?(\d{2}))?$/;function cu(t){const e={},i=t.split(Ci.dateTimeDelimiter);let n;if(i.length>2)return e;if(/:/.test(i[0])?n=i[0]:(e.date=i[0],n=i[1],Ci.timeZoneDelimiter.test(e.date)&&(e.date=t.split(Ci.timeZoneDelimiter)[0],n=t.substr(e.date.length,t.length))),n){const r=Ci.timezone.exec(n);r?(e.time=n.replace(r[1],""),e.timezone=r[1]):e.time=n}return e}function du(t,e){const i=new RegExp("^(?:(\\d{4}|[+-]\\d{"+(4+e)+"})|(\\d{2}|[+-]\\d{"+(2+e)+"})$)"),n=t.match(i);if(!n)return{year:NaN,restDateString:""};const r=n[1]?parseInt(n[1]):null,a=n[2]?parseInt(n[2]):null;return{year:a===null?r:a*100,restDateString:t.slice((n[1]||n[2]).length)}}function uu(t,e){if(e===null)return new Date(NaN);const i=t.match(su);if(!i)return new Date(NaN);const n=!!i[4],r=Ge(i[1]),a=Ge(i[2])-1,s=Ge(i[3]),l=Ge(i[4]),c=Ge(i[5])-1;if(n)return yu(e,l,c)?gu(e,l,c):new Date(NaN);{const u=new Date(0);return!mu(e,a,s)||!bu(e,r)?new Date(NaN):(u.setUTCFullYear(e,a,Math.max(r,s)),u)}}function Ge(t){return t?parseInt(t):1}function pu(t){const e=t.match(ou);if(!e)return NaN;const i=yn(e[1]),n=yn(e[2]),r=yn(e[3]);return vu(i,n,r)?i*yi+n*bi+r*1e3:NaN}function yn(t){return t&&parseFloat(t.replace(",","."))||0}function hu(t){if(t==="Z")return 0;const e=t.match(lu);if(!e)return 0;const i=e[1]==="+"?-1:1,n=parseInt(e[2]),r=e[3]&&parseInt(e[3])||0;return xu(n,r)?i*(n*yi+r*bi):NaN}function gu(t,e,i){const n=new Date(0);n.setUTCFullYear(t,0,4);const r=n.getUTCDay()||7,a=(e-1)*7+i+1-r;return n.setUTCDate(n.getUTCDate()+a),n}const fu=[31,null,31,30,31,30,31,31,30,31,30,31];function za(t){return t%400===0||t%4===0&&t%100!==0}function mu(t,e,i){return e>=0&&e<=11&&i>=1&&i<=(fu[e]||(za(t)?29:28))}function bu(t,e){return e>=1&&e<=(za(t)?366:365)}function yu(t,e,i){return e>=1&&e<=53&&i>=0&&i<=6}function vu(t,e,i){return t===24?e===0&&i===0:i>=0&&i<60&&e>=0&&e<60&&t>=0&&t<25}function xu(t,e){return e>=0&&e<=59}/*!
 * chartjs-adapter-date-fns v3.0.0
 * https://www.chartjs.org
 * (c) 2022 chartjs-adapter-date-fns Contributors
 * Released under the MIT license
 */const wu={datetime:"MMM d, yyyy, h:mm:ss aaaa",millisecond:"h:mm:ss.SSS aaaa",second:"h:mm:ss aaaa",minute:"h:mm aaaa",hour:"ha",day:"MMM d",week:"PP",month:"MMM yyyy",quarter:"qqq - yyyy",year:"yyyy"};hs._date.override({_id:"date-fns",formats:function(){return wu},parse:function(t,e){if(t===null||typeof t>"u")return null;const i=typeof t;return i==="number"||t instanceof Date?t=I(t):i==="string"&&(typeof e=="string"?t=tu(t,e,new Date,this.options):t=au(t,this.options)),ba(t)?t.getTime():null},format:function(t,e){return id(t,e,this.options)},add:function(t,e,i){switch(i){case"millisecond":return Fn(t,e);case"second":return ql(t,e);case"minute":return jl(t,e);case"hour":return Rl(t,e);case"day":return nn(t,e);case"week":return Yl(t,e);case"month":return Bn(t,e);case"quarter":return Vl(t,e);case"year":return Gl(t,e);default:return t}},diff:function(t,e,i){switch(i){case"millisecond":return Nn(t,e);case"second":return ec(t,e);case"minute":return Xl(t,e);case"hour":return Ql(t,e);case"day":return ya(t,e);case"week":return ic(t,e);case"month":return wa(t,e);case"quarter":return tc(t,e);case"year":return nc(t,e);default:return 0}},startOf:function(t,e,i){switch(e){case"second":return ru(t);case"minute":return nu(t);case"hour":return iu(t);case"day":return Pn(t);case"week":return Mt(t);case"isoWeek":return Mt(t,{weekStartsOn:+i});case"month":return ac(t);case"quarter":return rc(t);case"year":return $a(t);default:return t}},endOf:function(t,e){switch(e){case"second":return uc(t);case"minute":return cc(t);case"hour":return oc(t);case"day":return va(t);case"week":return lc(t);case"month":return xa(t);case"quarter":return dc(t);case"year":return sc(t);default:return t}}});function zr(t,e){if(!(e!=null&&e.start)||!(e!=null&&e.end))return null;const i=t.getPixelForValue(e.start.getTime()),n=t.getPixelForValue(e.end.getTime());if(!Number.isFinite(i)||!Number.isFinite(n))return null;const r=Math.min(i,n),a=Math.max(Math.abs(n-i),2);return!Number.isFinite(a)||a<=0?null:{left:r,width:a}}const $u={id:"pricingModeIcons",beforeDatasetsDraw(t,e,i){var c;const n=i,r=n==null?void 0:n.segments;if(!(r!=null&&r.length))return;const a=t.chartArea,s=(c=t.scales)==null?void 0:c.x;if(!a||!s)return;const l=t.ctx;l.save(),l.globalAlpha=(n==null?void 0:n.backgroundOpacity)??.12;for(const u of r){const p=zr(s,u);p&&(l.fillStyle=u.color||"rgba(255, 255, 255, 0.1)",l.fillRect(p.left,a.top,p.width,a.bottom-a.top))}l.restore()},afterDatasetsDraw(t,e,i){var L;const n=i,r=n==null?void 0:n.segments;if(!(r!=null&&r.length))return;const a=(L=t.scales)==null?void 0:L.x,s=t.chartArea;if(!a||!s)return;const l=(n==null?void 0:n.iconSize)??16,c=(n==null?void 0:n.labelSize)??9,u=`${l}px "Inter", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,p=`${c}px "Inter", sans-serif`,f=(n==null?void 0:n.iconColor)||"rgba(255, 255, 255, 0.95)",y=(n==null?void 0:n.labelColor)||"rgba(255, 255, 255, 0.7)",m=(n==null?void 0:n.axisBandPadding)??10,g=(n==null?void 0:n.axisBandHeight)??l+c+10,b=(n==null?void 0:n.axisBandColor)||"rgba(6, 10, 18, 0.12)",$=(n==null?void 0:n.iconAlignment)||"start",S=(n==null?void 0:n.iconStartOffset)??12,_=(n==null?void 0:n.iconBaselineOffset)??4,C=(a.bottom||s.bottom)+m,G=Math.min(C,t.height-g-2),K=s.right-s.left,w=G+_,j=t.ctx;j.save(),j.globalCompositeOperation="destination-over",j.fillStyle=b,j.fillRect(s.left,G,K,g),j.restore(),j.save(),j.globalCompositeOperation="destination-over",j.textAlign="center",j.textBaseline="top";for(const z of r){const Y=zr(a,z);if(!Y)continue;let V;if($==="start"){V=Y.left+S;const N=Y.left+Y.width-l/2;V>N&&(V=Y.left+Y.width/2)}else V=Y.left+Y.width/2;j.font=u,j.fillStyle=f,j.fillText(z.icon||"❓",V,w),z.shortLabel&&(j.font=p,j.fillStyle=y,j.fillText(z.shortLabel,V,w+l-2))}j.restore()}};function Lr(t,e){if(!t)return;t.layout||(t.layout={}),t.layout.padding||(t.layout.padding={});const i=t.layout.padding,n=12;i.top=i.top??12,i.bottom=Math.max(i.bottom||0,n)}var _u=Object.defineProperty,ku=Object.getOwnPropertyDescriptor,Ee=(t,e,i,n)=>{for(var r=n>1?void 0:n?ku(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&_u(e,i,r),r};const It=Q;Qi.register(Rr,Hr,gs,fs,Wr,jr,ms,Vr,bs,ys,qr,Yr,vs,xs,Gr,$u);function Su(t){const e=t.timeline.map(i=>i.spot_price_czk??0);return{label:"📊 Spotová cena nákupu",data:e,borderColor:"#2196F3",backgroundColor:"rgba(33, 150, 243, 0.15)",borderWidth:3,fill:!1,tension:.4,type:"line",yAxisID:"y-price",pointRadius:e.map(()=>0),pointHoverRadius:7,pointBackgroundColor:e.map(()=>"#42a5f5"),pointBorderColor:e.map(()=>"#42a5f5"),pointBorderWidth:2,order:1,datalabels:{display:!1}}}function Cu(t){return{label:"💰 Výkupní cena",data:t.timeline.map(e=>e.export_price_czk??0),borderColor:"#4CAF50",backgroundColor:"rgba(76, 187, 106, 0.15)",borderWidth:2,fill:!1,type:"line",tension:.4,yAxisID:"y-price",pointRadius:0,pointHoverRadius:5,order:1,borderDash:[5,5]}}function Pu(t){if(!t.solar)return[];const{string1:e,string2:i,hasString1:n,hasString2:r}=t.solar,a=(n?1:0)+(r?1:0),s={string1:{border:"rgba(255, 193, 7, 0.8)",bg:"rgba(255, 193, 7, 0.2)"},string2:{border:"rgba(255, 152, 0, 0.8)",bg:"rgba(255, 152, 0, 0.2)"}};if(a===1){const l=n?e:i,c=n?s.string1:s.string2;return[{label:"☀️ Solární předpověď",data:l,borderColor:c.border,backgroundColor:c.bg,borderWidth:2,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",pointRadius:0,pointHoverRadius:5,order:2}]}return a===2?[{label:"☀️ String 2",data:i,borderColor:s.string2.border,backgroundColor:s.string2.bg,borderWidth:1.5,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2},{label:"☀️ String 1",data:e,borderColor:s.string1.border,backgroundColor:s.string1.bg,borderWidth:1.5,fill:"-1",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2}]:[]}function Tu(t){if(!t.battery)return[];const{baseline:e,solarCharge:i,gridCharge:n,gridNet:r,consumption:a}=t.battery,s=[],l={baseline:{border:"#78909C",bg:"rgba(120, 144, 156, 0.25)"},solar:{border:"transparent",bg:"rgba(255, 167, 38, 0.6)"},grid:{border:"transparent",bg:"rgba(33, 150, 243, 0.6)"}};return a.some(c=>c!=null&&c>0)&&s.push({label:"🏠 Spotřeba (plán)",data:a,borderColor:"rgba(255, 112, 67, 0.7)",backgroundColor:"rgba(255, 112, 67, 0.12)",borderWidth:1.5,type:"line",fill:!1,tension:.25,pointRadius:0,pointHoverRadius:5,yAxisID:"y-power",stack:"consumption",borderDash:[6,4],order:2}),n.some(c=>c!=null&&c>0)&&s.push({label:"⚡ Do baterie ze sítě",data:n,backgroundColor:l.grid.bg,borderColor:l.grid.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),i.some(c=>c!=null&&c>0)&&s.push({label:"☀️ Do baterie ze soláru",data:i,backgroundColor:l.solar.bg,borderColor:l.solar.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),s.push({label:"🔋 Zbývající kapacita",data:e,backgroundColor:l.baseline.bg,borderColor:l.baseline.border,borderWidth:3,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),r.some(c=>c!==null)&&s.push({label:"📡 Netto odběr ze sítě",data:r,borderColor:"#00BCD4",backgroundColor:"transparent",borderWidth:2,type:"line",fill:!1,tension:.2,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",order:2}),s}function Ar(t){const e=[];return t.prices.length>0&&e.push(Su(t)),t.exportPrices.length>0&&e.push(Cu(t)),e.push(...Pu(t)),e.push(...Tu(t)),e}function Pi(t,e,i=""){if(t==null)return"";const n=i?` ${i}`:"";return`${t.toFixed(e)}${n}`}function fe(t){var r;const e=(r=t.scales)==null?void 0:r.x;if(!e)return"overview";const n=(e.max-e.min)/(1e3*60*60);return n<=6?"detail":n<=24?"day":"overview"}function Xt(t,e){var p,f,y,m,g,b,$,S,_,C,G;if(!((p=t==null?void 0:t.scales)!=null&&p.x))return;const i=t.scales.x,r=(i.max-i.min)/(1e3*60*60),a=fe(t),s=(y=(f=t.options.plugins)==null?void 0:f.legend)==null?void 0:y.labels;s&&(s.padding=10,s.font&&(s.font.size=11),a==="detail"&&(s.padding=12,s.font&&(s.font.size=12)));const l=["y-price","y-solar","y-power"];for(const K of l){const w=(m=t.options.scales)==null?void 0:m[K];w&&(a==="overview"?(w.title&&(w.title.display=!1),(g=w.ticks)!=null&&g.font&&(w.ticks.font.size=10),K==="y-solar"&&(w.display=!1)):a==="detail"?(w.title&&(w.title.display=!0,w.title.font&&(w.title.font.size=12)),(b=w.ticks)!=null&&b.font&&(w.ticks.font.size=11),w.display=!0):(w.title&&(w.title.display=!0,w.title.font&&(w.title.font.size=11)),($=w.ticks)!=null&&$.font&&(w.ticks.font.size=10),w.display=!0))}const c=(S=t.options.scales)==null?void 0:S.x;c&&(a==="overview"?c.ticks&&(c.ticks.maxTicksLimit=12,c.ticks.font&&(c.ticks.font.size=10)):a==="detail"?(c.ticks&&(c.ticks.maxTicksLimit=24,c.ticks.font&&(c.ticks.font.size=11)),c.time&&(c.time.displayFormats.hour="HH:mm")):(c.ticks&&(c.ticks.maxTicksLimit=16,c.ticks.font&&(c.ticks.font.size=10)),c.time&&(c.time.displayFormats.hour="dd.MM HH:mm")));const u=e==="always"||e==="auto"&&r<=6;for(const K of t.data.datasets){const w=K;if(w.datalabels||(w.datalabels={}),e==="never"){w.datalabels.display=!1;continue}if(u){let j=1;r>3&&r<=6?j=2:r>6&&(j=4),w.datalabels.display=V=>{const N=V.dataset.data[V.dataIndex];return N==null||N===0?!1:V.dataIndex%j===0};const L=w.yAxisID==="y-price",z=((_=w.label)==null?void 0:_.includes("Solární"))||((C=w.label)==null?void 0:C.includes("String")),Y=(G=w.label)==null?void 0:G.includes("kapacita");w.datalabels.align="top",w.datalabels.offset=6,w.datalabels.color="#fff",w.datalabels.font={size:9,weight:"bold"},L?(w.datalabels.formatter=V=>Pi(V,2,"Kč"),w.datalabels.backgroundColor=w.borderColor||"rgba(33, 150, 243, 0.8)"):z?(w.datalabels.formatter=V=>Pi(V,1,"kW"),w.datalabels.backgroundColor=w.borderColor||"rgba(255, 193, 7, 0.8)"):Y?(w.datalabels.formatter=V=>Pi(V,1,"kWh"),w.datalabels.backgroundColor=w.borderColor||"rgba(120, 144, 156, 0.8)"):(w.datalabels.formatter=V=>Pi(V,1),w.datalabels.backgroundColor=w.borderColor||"rgba(33, 150, 243, 0.8)"),w.datalabels.borderRadius=4,w.datalabels.padding={top:3,bottom:3,left:5,right:5}}else w.datalabels.display=!1}t.update("none"),v.debug(`[PricingChart] Detail: ${r.toFixed(1)}h, Labels: ${u?"ON":"OFF"}, Mode: ${e}`)}let Nt=class extends M{constructor(){super(...arguments),this.data=null,this.datalabelMode="auto",this.zoomState={start:null,end:null},this.currentDetailLevel="overview",this.chart=null,this.resizeObserver=null}firstUpdated(){this.setupResizeObserver(),this.data&&this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())}updated(t){t.has("data")&&this.data&&(this.chart?this.updateChartData():this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())),t.has("datalabelMode")&&this.chart&&Xt(this.chart,this.datalabelMode)}disconnectedCallback(){var t;super.disconnectedCallback(),this.destroyChart(),(t=this.resizeObserver)==null||t.disconnect(),this.resizeObserver=null}zoomToTimeRange(t,e){if(!this.chart){v.warn("[PricingChart] Chart not available for zoom");return}const i=new Date(t),n=new Date(e),r=15*60*1e3,a=i.getTime()-r,s=n.getTime()+r;if(this.zoomState.start!==null&&Math.abs(this.zoomState.start-a)<6e4&&this.zoomState.end!==null&&Math.abs(this.zoomState.end-s)<6e4){v.debug("[PricingChart] Already zoomed to same range → reset"),this.resetZoom();return}try{const l=this.chart.options;l.scales.x.min=a,l.scales.x.max=s,this.chart.update("none"),this.zoomState={start:a,end:s},this.currentDetailLevel=fe(this.chart),Xt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-change",{detail:{start:a,end:s,level:this.currentDetailLevel},bubbles:!0,composed:!0})),v.debug("[PricingChart] Zoomed to range",{start:new Date(a).toISOString(),end:new Date(s).toISOString()})}catch(l){v.error("[PricingChart] Zoom error",l)}}resetZoom(){if(!this.chart)return;const t=this.chart.options;delete t.scales.x.min,delete t.scales.x.max,this.chart.update("none"),this.zoomState={start:null,end:null},this.currentDetailLevel=fe(this.chart),Xt(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-reset",{bubbles:!0,composed:!0}))}getChart(){return this.chart}createChart(){if(!this.canvas||!this.data||this.data.timeline.length===0)return;this.chart&&this.destroyChart();const t=this.data,e=Ar(t),i={responsive:!0,maintainAspectRatio:!1,animation:{duration:0},interaction:{mode:"index",intersect:!1},plugins:{legend:{labels:{color:"#ffffff",font:{size:11,weight:"500"},padding:10,usePointStyle:!0,pointStyle:"circle",boxWidth:12,boxHeight:12},position:"top"},tooltip:{backgroundColor:"rgba(0,0,0,0.9)",titleColor:"#ffffff",bodyColor:"#ffffff",titleFont:{size:13,weight:"bold"},bodyFont:{size:11},padding:10,cornerRadius:6,displayColors:!0,callbacks:{title:r=>r.length>0?new Date(r[0].parsed.x).toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"",label:r=>{let a=r.dataset.label||"";return a&&(a+=": "),r.parsed.y!==null&&(r.dataset.yAxisID==="y-price"?a+=r.parsed.y.toFixed(2)+" Kč/kWh":r.dataset.yAxisID==="y-solar"?a+=r.parsed.y.toFixed(2)+" kWh":r.dataset.yAxisID==="y-power"?a+=r.parsed.y.toFixed(2)+" kW":a+=r.parsed.y),a}}},datalabels:{display:!1},zoom:{zoom:{wheel:{enabled:!0,modifierKey:null},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)",borderColor:"rgba(33, 150, 243, 0.8)",borderWidth:2},pinch:{enabled:!0},mode:"x",onZoomComplete:({chart:r})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=fe(r),Xt(r,this.datalabelMode)}},pan:{enabled:!0,mode:"x",modifierKey:"shift",onPanComplete:({chart:r})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=fe(r),Xt(r,this.datalabelMode)}},limits:{x:{minRange:36e5}}},pricingModeIcons:null},scales:{x:{type:"timeseries",time:{unit:"hour",displayFormats:{hour:"dd.MM HH:mm"},tooltipFormat:"dd.MM.yyyy HH:mm"},ticks:{color:this.getTextColor(),maxRotation:45,minRotation:45,font:{size:11},maxTicksLimit:20},grid:{color:this.getGridColor(),lineWidth:1}},"y-price":{type:"linear",position:"left",ticks:{color:"#2196F3",font:{size:11,weight:"500"},callback:r=>r.toFixed(2)+" Kč"},grid:{color:"rgba(33, 150, 243, 0.15)",lineWidth:1},title:{display:!0,text:"💰 Cena (Kč/kWh)",color:"#2196F3",font:{size:13,weight:"bold"}}},"y-solar":{type:"linear",position:"left",stacked:!0,ticks:{color:"#78909C",font:{size:11,weight:"500"},callback:r=>r.toFixed(1)+" kWh",display:!0},grid:{display:!0,color:"rgba(120, 144, 156, 0.15)",lineWidth:1,drawOnChartArea:!0},title:{display:!0,text:"🔋 Kapacita baterie (kWh)",color:"#78909C",font:{size:11,weight:"bold"}},beginAtZero:!1},"y-power":{type:"linear",position:"right",stacked:!0,ticks:{color:"#FFA726",font:{size:11,weight:"500"},callback:r=>r.toFixed(2)+" kW"},grid:{display:!1},title:{display:!0,text:"☀️ Výkon (kW)",color:"#FFA726",font:{size:13,weight:"bold"}}}}};Lr(i);const n={type:"bar",data:{labels:t.labels,datasets:e},plugins:[Gr],options:i};try{this.chart=new Qi(this.canvas,n),Xt(this.chart,this.datalabelMode),t.initialZoomStart&&t.initialZoomEnd&&requestAnimationFrame(()=>{if(!this.chart)return;const r=this.chart.options;r.scales.x.min=t.initialZoomStart,r.scales.x.max=t.initialZoomEnd,this.chart.update("none"),this.currentDetailLevel=fe(this.chart),Xt(this.chart,this.datalabelMode)}),v.info("[PricingChart] Chart created",{datasets:e.length,labels:t.labels.length,segments:t.modeSegments.length})}catch(r){v.error("[PricingChart] Failed to create chart",r)}}updateChartData(){var s;if(!this.chart||!this.data)return;const t=this.data,e=Ar(t),i=((s=this.chart.data.labels)==null?void 0:s.length)!==t.labels.length,n=this.chart.data.datasets.length!==e.length;i&&(this.chart.data.labels=t.labels);let r="none";n?(this.chart.data.datasets=e,r=void 0):e.forEach((l,c)=>{const u=this.chart.data.datasets[c];u&&(u.data=l.data,u.label=l.label,u.backgroundColor=l.backgroundColor,u.borderColor=l.borderColor)});const a=this.chart.options;a.plugins||(a.plugins={}),a.plugins.pricingModeIcons=null,Lr(a),this.chart.update(r),v.debug("[PricingChart] Chart updated incrementally")}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(()=>{var t;(t=this.chart)==null||t.resize()}),this.resizeObserver.observe(this)}getTextColor(){try{return getComputedStyle(this).getPropertyValue("--oig-text-primary").trim()||"#e0e0e0"}catch{return"#e0e0e0"}}getGridColor(){try{return getComputedStyle(this).getPropertyValue("--oig-border").trim()||"rgba(255,255,255,0.1)"}catch{return"rgba(255,255,255,0.1)"}}setDatalabelMode(t){this.datalabelMode=t,this.dispatchEvent(new CustomEvent("datalabel-mode-change",{detail:{mode:t},bubbles:!0,composed:!0}))}get isZoomed(){return this.zoomState.start!==null||this.zoomState.end!==null}renderControls(){const t=e=>{const i=this.datalabelMode===e?"active":"";return e==="always"&&this.datalabelMode==="always"?`control-btn mode-always ${i}`:e==="never"&&this.datalabelMode==="never"?`control-btn mode-never ${i}`:`control-btn ${i}`};return d`
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
      background: ${It(o.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${It(o.cardShadow)};
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
      color: ${It(o.textPrimary)};
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
      color: ${It(o.textSecondary)};
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .control-btn:hover {
      background: ${It(o.accent)};
      color: #fff;
    }

    .control-btn.active {
      background: ${It(o.accent)};
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
      color: ${It(o.textSecondary)};
      font-size: 14px;
    }

    .chart-hint {
      font-size: 10px;
      color: ${It(o.textSecondary)};
      opacity: 0.7;
      margin-top: 6px;
      text-align: center;
    }
  `;Ee([h({type:Object})],Nt.prototype,"data",2);Ee([h({type:String})],Nt.prototype,"datalabelMode",2);Ee([x()],Nt.prototype,"zoomState",2);Ee([x()],Nt.prototype,"currentDetailLevel",2);Ee([Xi("#pricing-canvas")],Nt.prototype,"canvas",2);Nt=Ee([D("oig-pricing-chart")],Nt);var Mu=Object.defineProperty,Du=Object.getOwnPropertyDescriptor,q=(t,e,i,n)=>{for(var r=n>1?void 0:n?Du(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&Mu(e,i,r),r};const T=Q,ue=P`
  background: ${T(o.cardBg)};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${T(o.cardShadow)};
`,Vt=P`
  font-size: 15px;
  font-weight: 600;
  color: ${T(o.textPrimary)};
  margin: 0 0 12px 0;
`;function Eu(t){return Math.max(0,Math.min(100,t))}function Ir(t){const n=Math.max(0,Math.min(1,(t-10)/60)),r={r:33,g:150,b:243},a={r:255,g:87,b:34},s=(l,c)=>Math.round(l+(c-l)*n);return`rgb(${s(r.r,a.r)}, ${s(r.g,a.g)}, ${s(r.b,a.b)})`}let ri=class extends M{constructor(){super(...arguments),this.collapsed=!0,this.busy=!1}toggle(){this.collapsed=!this.collapsed}async doAction(t,e){this.busy=!0;try{const i=await t();this.dispatchEvent(new CustomEvent("action-done",{detail:{success:i,label:e},bubbles:!0,composed:!0}))}finally{this.busy=!1}}render(){return d`
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
              @click=${()=>this.doAction(Bo,"plan")}>
              Preplanovat (debug)
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(Fo,"apply")}>
              Aplikovat rucne
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(No,"cancel")}>
              Zrusit plan
            </button>
          </div>
        </div>
      </div>
    `}};ri.styles=P`
    :host { display: block; }

    .panel {
      ${ue};
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
  `;q([x()],ri.prototype,"collapsed",2);q([x()],ri.prototype,"busy",2);ri=q([D("oig-boiler-debug-panel")],ri);let Bi=class extends M{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return d`<div>Nacitani stavu...</div>`;const e=(i,n,r=1)=>i!=null?`${i.toFixed(r)} ${n}`:`-- ${n}`;return d`
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
        `:O}
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
    `}};Bi.styles=P`
    :host { display: block; }

    h3 { ${Vt}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .card {
      ${ue};
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
  `;q([h({type:Object})],Bi.prototype,"data",2);Bi=q([D("oig-boiler-status-grid")],Bi);let Fi=class extends M{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return O;const e=i=>`${i.toFixed(2)} kWh`;return d`
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
    `}};Fi.styles=P`
    :host { display: block; }

    h3 { ${Vt}; }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .card {
      ${ue};
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
  `;q([h({type:Object})],Fi.prototype,"data",2);Fi=q([D("oig-boiler-energy-breakdown")],Fi);let Ni=class extends M{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return O;const e=t.peakHours.length?t.peakHours.map(r=>`${r}h`).join(", "):"--",i=t.waterLiters40c!==null?`${t.waterLiters40c.toFixed(0)} L`:"-- L",n=t.circulationNow.startsWith("ANO");return d`
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
          <span class="value ${n?"active":"idle"}">${t.circulationNow}</span>
        </div>
      </div>
    `}};Ni.styles=P`
    :host { display: block; }

    h3 { ${Vt}; }

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
  `;q([h({type:Object})],Ni.prototype,"data",2);Ni=q([D("oig-boiler-predicted-usage")],Ni);let ai=class extends M{constructor(){super(...arguments),this.plan=null,this.forecastWindows={fve:"--",grid:"--"}}render(){var n;const t=this.plan,e=this.forecastWindows,i=r=>r??"--";return d`
      <h3>Informace o planu</h3>
      <div class="rows">
        <div class="row">
          <span class="row-label">Mix zdroju:</span>
          <span class="row-value">${i(t==null?void 0:t.sourceDigest)}</span>
        </div>
        <div class="row">
          <span class="row-label">Slotu:</span>
          <span class="row-value">${((n=t==null?void 0:t.slots)==null?void 0:n.length)??"--"}</span>
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
    `}};ai.styles=P`
    :host { display: block; }

    h3 { ${Vt}; }

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
  `;q([h({type:Object})],ai.prototype,"plan",2);q([h({type:Object})],ai.prototype,"forecastWindows",2);ai=q([D("oig-boiler-plan-info")],ai);let si=class extends M{constructor(){super(...arguments),this.boilerState=null,this.targetTemp=60}render(){const t=this.boilerState;if(!t)return d`<div>Nacitani...</div>`;const e=10,i=70,n=m=>Eu((m-e)/(i-e)*100),r=t.heatingPercent??0,a=t.tempTop!==null?n(t.tempTop):null,s=t.tempBottom!==null?n(t.tempBottom):null,l=n(this.targetTemp),c=Ir(t.tempTop??this.targetTemp),u=Ir(t.tempBottom??10),p=`linear-gradient(180deg, ${c} 0%, ${u} 100%)`,f=t.heatingPercent!==null?`${t.heatingPercent.toFixed(0)}% nahrato`:"-- % nahrato";return d`
      <h3>Vizualizace bojleru</h3>

      <div class="tank-wrapper">
        <div class="temp-scale">
          ${[70,60,50,40,30,20,10].map(m=>d`<span>${m}°C</span>`)}
        </div>

        <div class="tank">
          <div class="water" style="height:${r}%; background:${p}"></div>

          <div class="target-line" style="bottom:${l}%">
            <span class="target-label">Cil</span>
          </div>

          ${a!==null?d`
            <div class="sensor top" style="bottom:${a}%">
              <span class="sensor-label">${t.tempTop.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:O}

          ${s!==null?d`
            <div class="sensor bottom" style="bottom:${s}%">
              <span class="sensor-label">${t.tempBottom.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:O}
        </div>
      </div>

      <div class="grade-label">${f}</div>
    `}};si.styles=P`
    :host { display: block; }

    h3 { ${Vt}; }

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
  `;q([h({type:Object})],si.prototype,"boilerState",2);q([h({type:Number})],si.prototype,"targetTemp",2);si=q([D("oig-boiler-tank")],si);let oi=class extends M{constructor(){super(...arguments),this.current="",this.available=[]}onChange(t){const e=t.target.value;this.dispatchEvent(new CustomEvent("category-change",{detail:{category:e},bubbles:!0,composed:!0}))}render(){const t=this.available.length?this.available:Object.keys(fr);return d`
      <div class="row">
        <label>Profil:</label>
        <select @change=${this.onChange}>
          ${t.map(e=>d`
            <option value=${e} ?selected=${e===this.current}>
              ${fr[e]||e}
            </option>
          `)}
        </select>
      </div>
    `}};oi.styles=P`
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
  `;q([h({type:String})],oi.prototype,"current",2);q([h({type:Array})],oi.prototype,"available",2);oi=q([D("oig-boiler-category-select")],oi);let Ri=class extends M{constructor(){super(...arguments),this.data=[]}render(){if(!this.data.length)return O;const t=this.data.flatMap(s=>s.hours),e=Math.max(...t,.1),i=e*.3,n=e*.7,r=Array.from({length:24},(s,l)=>l),a=s=>s===0?"none":s<i?"low":s<n?"medium":"high";return d`
      <h3>Mapa spotreby (7 dni)</h3>
      <div class="wrapper">
        <div class="grid">
          <!-- Header row -->
          <div></div>
          ${r.map(s=>d`<div class="hour-header">${s}</div>`)}

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
    `}};Ri.styles=P`
    :host { display: block; }

    h3 { ${Vt}; }

    .wrapper {
      ${ue};
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
  `;q([h({type:Array})],Ri.prototype,"data",2);Ri=q([D("oig-boiler-heatmap-grid")],Ri);let Hi=class extends M{constructor(){super(...arguments),this.plan=null}render(){const t=this.plan,e=(i,n=2)=>i!=null?i.toFixed(n):"-";return d`
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
    `}};Hi.styles=P`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .card {
      ${ue};
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
  `;q([h({type:Object})],Hi.prototype,"plan",2);Hi=q([D("oig-boiler-stats-cards")],Hi);let Wi=class extends M{constructor(){super(...arguments),this.data=null}render(){const t=this.data;if(!t)return O;const e=Math.max(...t.hourlyAvg,.01),i=new Set(t.peakHours),n=t.peakHours.length?t.peakHours.map(a=>`${a}h`).join(", "):"--",r=t.confidence!==null?`${Math.round(t.confidence*100)} %`:"-- %";return d`
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
            <span class="stat-value">${n}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Spolehlivost:</span>
            <span class="stat-value">${r}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Sledovano:</span>
            <span class="stat-value">${t.daysTracked} dni</span>
          </div>
        </div>
      </div>
    `}};Wi.styles=P`
    :host { display: block; }

    h3 { ${Vt}; }

    .wrapper {
      ${ue};
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
  `;q([h({type:Object})],Wi.prototype,"data",2);Wi=q([D("oig-boiler-profiling")],Wi);let ji=class extends M{constructor(){super(...arguments),this.config=null}render(){const t=this.config;if(!t)return O;const e=(i,n="")=>i!=null?`${i}${n?" "+n:""}`:`--${n?" "+n:""}`;return d`
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
    `}};ji.styles=P`
    :host { display: block; }

    h3 { ${Vt}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .card {
      ${ue};
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
  `;q([h({type:Object})],ji.prototype,"config",2);ji=q([D("oig-boiler-config-section")],ji);let Vi=class extends M{constructor(){super(...arguments),this.state=null}render(){return this.state?d`
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
    `:d`<div>Nacitani...</div>`}};Vi.styles=P`
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
  `;q([h({type:Object})],Vi.prototype,"state",2);Vi=q([D("oig-boiler-state")],Vi);let qi=class extends M{constructor(){super(...arguments),this.data=[]}render(){return O}};qi.styles=P`
    :host { display: block; }
  `;q([h({type:Array})],qi.prototype,"data",2);qi=q([D("oig-boiler-heatmap")],qi);let li=class extends M{constructor(){super(...arguments),this.profiles=[],this.editMode=!1}render(){return O}};li.styles=P`
    :host { display: block; }
  `;q([h({type:Array})],li.prototype,"profiles",2);q([h({type:Boolean})],li.prototype,"editMode",2);li=q([D("oig-boiler-profiles")],li);var Ou=Object.defineProperty,zu=Object.getOwnPropertyDescriptor,pt=(t,e,i,n)=>{for(var r=n>1?void 0:n?zu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&Ou(e,i,r),r};const Jt=Q,rn=P`
  .selector-label {
    font-size: 12px;
    color: ${Jt(o.textSecondary)};
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
    border: 2px solid ${Jt(o.divider)};
    background: ${Jt(o.bgSecondary)};
    color: ${Jt(o.textPrimary)};
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .mode-btn:hover:not(:disabled):not(.active) {
    border-color: ${Jt(o.accent)};
  }

  .mode-btn.active {
    background: ${Jt(o.accent)};
    border-color: ${Jt(o.accent)};
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
`;let Ce=class extends M{constructor(){super(...arguments),this.value="home_1",this.disabled=!1,this.buttonStates={home_1:"idle",home_2:"idle",home_3:"idle",home_ups:"idle"}}onModeClick(t){const e=this.buttonStates[t];this.disabled||e==="active"||e==="pending"||e==="processing"||e==="disabled-by-service"||this.dispatchEvent(new CustomEvent("mode-change",{detail:{mode:t},bubbles:!0}))}render(){return d`
      <div class="selector-label">
        Re\u017Eim st\u0159\u00EDda\u010De
      </div>
      <div class="mode-buttons">
        ${["home_1","home_2","home_3","home_ups"].map(e=>{const i=this.buttonStates[e],n=this.disabled||i==="pending"||i==="processing"||i==="disabled-by-service";return d`
            <button
              class="mode-btn ${i}"
              ?disabled=${n}
              @click=${()=>this.onModeClick(e)}
            >
              ${Zr[e]}
              ${i==="pending"?d`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?d`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};Ce.styles=[rn];pt([h({type:String})],Ce.prototype,"value",2);pt([h({type:Boolean})],Ce.prototype,"disabled",2);pt([h({type:Object})],Ce.prototype,"buttonStates",2);Ce=pt([D("oig-box-mode-selector")],Ce);let Rt=class extends M{constructor(){super(...arguments),this.value="off",this.limit=0,this.disabled=!1,this.pendingTarget=null,this.buttonStates={off:"idle",on:"idle",limited:"idle"}}onDeliveryClick(t){const e=this.buttonStates[t];this.disabled||e==="pending"||e==="processing"||e==="disabled-by-service"||e==="active"&&t!=="limited"||this.dispatchEvent(new CustomEvent("delivery-change",{detail:{value:t,limit:t==="limited"?this.limit:null},bubbles:!0}))}render(){const t=[{value:"off",label:Ke.off},{value:"on",label:Ke.on},{value:"limited",label:Ke.limited}],i=this.pendingTarget!==null&&this.pendingTarget!==this.value?d`<span class="status-text transitioning">\u23F3\u00A0${Ke[this.pendingTarget]}</span>`:null;return d`
      <div class="selector-label">
        Dod\u00E1vka do s\u00EDt\u011B ${i}
      </div>
      <div class="mode-buttons">
        ${t.map(n=>{const r=this.buttonStates[n.value],a=n.value===this.value,s=n.value===this.pendingTarget&&!a,l=this.disabled||r==="pending"||r==="processing"||r==="disabled-by-service",c=a&&r==="disabled-by-service"?"active disabled-by-service":s?`${r} pending-target`:r;return d`
            <button
              class="mode-btn ${c}"
              ?disabled=${l}
              @click=${()=>this.onDeliveryClick(n.value)}
            >
              ${n.label}
              ${r==="pending"?d`<span style="font-size:10px"> \u23F3</span>`:""}
              ${r==="processing"?d`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};Rt.styles=[rn,P`
      .mode-btn.pending-target {
        border-color: #ffc107;
        color: #ffc107;
        background: rgba(255, 193, 7, 0.08);
      }
    `];pt([h({type:String})],Rt.prototype,"value",2);pt([h({type:Number})],Rt.prototype,"limit",2);pt([h({type:Boolean})],Rt.prototype,"disabled",2);pt([h({type:String})],Rt.prototype,"pendingTarget",2);pt([h({type:Object})],Rt.prototype,"buttonStates",2);Rt=pt([D("oig-grid-delivery-selector")],Rt);let Pe=class extends M{constructor(){super(...arguments),this.value="cbb",this.disabled=!1,this.buttonStates={cbb:"idle",manual:"idle"}}onModeClick(t){const e=this.buttonStates[t];this.disabled||e==="active"||e==="pending"||e==="processing"||e==="disabled-by-service"||this.dispatchEvent(new CustomEvent("boiler-mode-change",{detail:{mode:t},bubbles:!0}))}render(){return d`
      <div class="selector-label">
        Re\u017Eim bojleru
      </div>
      <div class="mode-buttons">
        ${["cbb","manual"].map(e=>{const i=this.buttonStates[e],n=this.disabled||i==="pending"||i==="processing"||i==="disabled-by-service";return d`
            <button
              class="mode-btn ${i}"
              ?disabled=${n}
              @click=${()=>this.onModeClick(e)}
            >
              ${Qr[e]} ${Kr[e]}
              ${i==="pending"?d`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?d`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};Pe.styles=[rn];pt([h({type:String})],Pe.prototype,"value",2);pt([h({type:Boolean})],Pe.prototype,"disabled",2);pt([h({type:Object})],Pe.prototype,"buttonStates",2);Pe=pt([D("oig-boiler-mode-selector")],Pe);let Ht=class extends M{constructor(){super(...arguments),this.homeGridV=!1,this.homeGridVi=!1,this.flexibilita=!1,this.available=!1,this.disabled=!1}getButtonClass(t){return t&&this.disabled?"active disabled-by-service":t?"active":this.disabled?"disabled-by-service":"idle"}onToggleClick(t){this.disabled||this.dispatchEvent(new CustomEvent("supplementary-toggle",{detail:{key:t},bubbles:!0}))}render(){const t=this.getButtonClass(this.homeGridV),e=this.getButtonClass(this.homeGridVi),i=this.flexibilita?d`<span class="flexibilita-badge">\u26A1 Flexibilita</span>`:"";return d`
      <div class="selector-label">
        Dopl\u0148kov\u00FD re\u017Eim ${i}
      </div>
      <div class="mode-buttons">
        <button
          class="mode-btn ${t}"
          ?disabled=${this.disabled}
          @click=${()=>this.onToggleClick("home_grid_v")}
        >
          Home 5
          ${this.homeGridV&&!this.disabled?d`<span style="font-size:10px"> \u2713</span>`:""}
        </button>
        <button
          class="mode-btn ${e}"
          ?disabled=${this.disabled}
          @click=${()=>this.onToggleClick("home_grid_vi")}
        >
          Home 6
          ${this.homeGridVi&&!this.disabled?d`<span style="font-size:10px"> \u2713</span>`:""}
        </button>
      </div>
    `}};Ht.styles=[rn,P`
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
    `];pt([h({type:Boolean})],Ht.prototype,"homeGridV",2);pt([h({type:Boolean})],Ht.prototype,"homeGridVi",2);pt([h({type:Boolean})],Ht.prototype,"flexibilita",2);pt([h({type:Boolean})],Ht.prototype,"available",2);pt([h({type:Boolean})],Ht.prototype,"disabled",2);Ht=pt([D("oig-supplementary-selector")],Ht);function Lu(t){const e=!t.available||t.flexibilita;return t.available?{home_grid_v:t.home_grid_v,home_grid_vi:t.home_grid_vi,flexibilita:t.flexibilita,available:t.available,disabled:e}:{home_grid_v:!1,home_grid_vi:!1,flexibilita:t.flexibilita,available:!1,disabled:!0}}var Au=Object.defineProperty,Iu=Object.getOwnPropertyDescriptor,Oe=(t,e,i,n)=>{for(var r=n>1?void 0:n?Iu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&Au(e,i,r),r};const bt=Q;let Wt=class extends M{constructor(){super(...arguments),this.items=[],this.expanded=!1,this.shieldStatus="idle",this.queueCount=0,this._now=Date.now(),this.updateInterval=null}connectedCallback(){super.connectedCallback(),this.updateInterval=window.setInterval(()=>{this._now=Date.now()},1e3)}disconnectedCallback(){super.disconnectedCallback(),this.updateInterval!==null&&clearInterval(this.updateInterval)}toggleExpanded(){this.expanded=!this.expanded}removeItem(t,e){e.stopPropagation(),this.dispatchEvent(new CustomEvent("remove-item",{detail:{position:t},bubbles:!0}))}formatServiceName(t,e){return e==="supplementary_toggle"?"⚙️ Změna doplňkového režimu":Rs[t]||t||"N/A"}formatChanges(t){return!t||t.length===0?"N/A":t.map(e=>{const i=e.indexOf("→");if(i===-1)return e;const n=e.slice(0,i).trim(),r=e.slice(i+1).trim(),a=n.indexOf(":"),s=a===-1?n:n.slice(a+1),l=n.includes("prm2_app")?Xr:Hs,c=(l[s.replace(/'/g,"").trim()]||s).replace(/'/g,"").trim(),u=r.replace(/\s*\(nyní:[^)]*\)\s*$/,""),p=(l[u.replace(/'/g,"").trim()]||u).replace(/'/g,"").trim();return`${c} → ${p}`}).join(", ")}formatTimestamp(t){if(!t)return{time:"--",duration:"--"};try{const e=new Date(t);if(isNaN(e.getTime()))return{time:"--",duration:"--"};const i=new Date(this._now),n=Math.floor((i.getTime()-e.getTime())/1e3),r=String(e.getHours()).padStart(2,"0"),a=String(e.getMinutes()).padStart(2,"0");let s=`${r}:${a}`;if(e.toDateString()!==i.toDateString()){const c=e.getDate(),u=e.getMonth()+1;s=`${c}.${u}. ${s}`}let l;if(n<60)l=`${n}s`;else if(n<3600){const c=Math.floor(n/60),u=n%60;l=`${c}m ${u}s`}else{const c=Math.floor(n/3600),u=Math.floor(n%3600/60);l=`${c}h ${u}m`}return{time:s,duration:l}}catch{return{time:"--",duration:"--"}}}get activeCount(){return this.items.length}render(){this._now;const t=this.shieldStatus==="running"?"running":"idle",e=this.shieldStatus==="running"?"🔄 Zpracovává":"✓ Připraveno";return d`
      <div class="queue-header" @click=${this.toggleExpanded}>
        <div class="queue-title-area">
          <span class="queue-title">Shield fronta</span>
          ${this.activeCount>0?d`
            <span class="queue-count">(${this.activeCount} aktivn\u00EDch)</span>
          `:O}
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
                ${this.items.map((i,n)=>this.renderRow(i,n))}
              </tbody>
            </table>
          `}
        </div>
      `:O}
    `}renderRow(t,e){const i=t.status==="running",{time:n,duration:r}=this.formatTimestamp(t.createdAt);return d`
      <tr>
        <td class="${i?"status-running":"status-queued"}">
          ${i?"🔄 Zpracovává se":"⏳ Čeká"}
        </td>
        <td>${this.formatServiceName(t.service,t.type)}</td>
        <td class="hide-mobile" style="font-size: 11px;">${this.formatChanges(t.changes)}</td>
        <td class="queue-time">${n}</td>
        <td class="queue-time duration">${r}</td>
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
    `}};Wt.styles=P`
    :host {
      display: block;
      background: ${bt(o.cardBg)};
      border-radius: 12px;
      box-shadow: ${bt(o.cardShadow)};
      overflow: hidden;
    }

    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: ${bt(o.bgSecondary)};
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
      color: ${bt(o.textPrimary)};
    }

    .queue-count {
      font-size: 12px;
      color: ${bt(o.textSecondary)};
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
      color: ${bt(o.accent)};
      transition: transform 0.2s;
    }

    .queue-toggle.expanded {
      transform: rotate(180deg);
    }

    .queue-content {
      padding: 0;
      border-top: 1px solid ${bt(o.divider)};
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
      color: ${bt(o.textSecondary)};
      border-bottom: 1px solid ${bt(o.divider)};
      background: ${bt(o.bgSecondary)};
    }

    .queue-table td {
      padding: 8px 12px;
      color: ${bt(o.textPrimary)};
      border-bottom: 1px solid ${bt(o.divider)};
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
      color: ${bt(o.textSecondary)};
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
  `;Oe([h({type:Array})],Wt.prototype,"items",2);Oe([h({type:Boolean})],Wt.prototype,"expanded",2);Oe([h({type:String})],Wt.prototype,"shieldStatus",2);Oe([h({type:Number})],Wt.prototype,"queueCount",2);Oe([x()],Wt.prototype,"_now",2);Wt=Oe([D("oig-shield-queue")],Wt);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Bu={CHILD:2},Fu=t=>(...e)=>({_$litDirective$:t,values:e});class Nu{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,i,n){this._$Ct=e,this._$AM=i,this._$Ci=n}_$AS(e,i){return this.update(e,i)}update(e,i){return this.render(...i)}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Dn extends Nu{constructor(e){if(super(e),this.it=O,e.type!==Bu.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(e){if(e===O||e==null)return this._t=void 0,this.it=e;if(e===ps)return e;if(typeof e!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(e===this.it)return this._t;this.it=e;const i=[e];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}}Dn.directiveName="unsafeHTML",Dn.resultType=1;const Ru=Fu(Dn);var Hu=Object.defineProperty,Wu=Object.getOwnPropertyDescriptor,xi=(t,e,i,n)=>{for(var r=n>1?void 0:n?Wu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&Hu(e,i,r),r};const ht=Q;let ae=class extends M{constructor(){super(...arguments),this.open=!1,this.config={title:"",message:""},this.acknowledged=!1,this.limitValue=5e3,this.resolver=null,this.onOverlayClick=()=>{this.closeDialog({confirmed:!1})},this.onDialogClick=t=>{t.stopPropagation()},this.onKeyDown=t=>{t.key==="Escape"&&this.open&&this.closeDialog({confirmed:!1})},this.onAckChange=t=>{this.acknowledged=t.target.checked},this.onLimitInput=t=>{this.limitValue=parseInt(t.target.value,10)||0},this.onCancel=()=>{this.closeDialog({confirmed:!1})},this.onConfirm=()=>{const t=this.config.showLimitInput||this.config.limitOnly;if(t){const e=this.config.limitMin??1,i=this.config.limitMax??2e4;if(isNaN(this.limitValue)||this.limitValue<e||this.limitValue>i)return}this.closeDialog({confirmed:!0,limit:t?this.limitValue:void 0})}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeyDown)}showDialog(t){return this.config=t,this.acknowledged=!1,this.limitValue=t.limitValue??5e3,this.open=!0,new Promise(e=>{this.resolver=e})}closeDialog(t){var e;this.open=!1,(e=this.resolver)==null||e.call(this,t),this.resolver=null}get canConfirm(){return!(this.config.requireAcknowledgement&&!this.acknowledged)}render(){if(!this.open)return O;const t=this.config;return t.limitOnly?d`
        <div @click=${this.onOverlayClick}>
          <div class="dialog" @click=${this.onDialogClick}>
            <div class="dialog-header">
              ${t.title||"Změnit limit přetoků"}
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
                min=${t.limitMin??1}
                max=${t.limitMax??2e4}
                step=${t.limitStep??100}
                @input=${this.onLimitInput}
                placeholder="např. 5000"
              />
              <small class="limit-hint">Rozsah: ${t.limitMin??1}–${t.limitMax??2e4} W</small>
            </div>

            <div class="dialog-actions">
              <button class="btn btn-cancel" @click=${this.onCancel}>
                ${t.cancelText||"Zrušit"}
              </button>
              <button
                class="btn btn-confirm"
                ?disabled=${!this.canConfirm}
                @click=${this.onConfirm}
              >
                ${t.confirmText||"Uložit limit"}
              </button>
            </div>
          </div>
        </div>
      `:d`
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
          `:O}

          ${t.warning?d`
            <div class="dialog-warning">
              \u26A0\uFE0F ${this.renderHTML(t.warning)}
            </div>
          `:O}

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
          `:O}

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
    `}renderHTML(t){return Ru(t)}};ae.styles=P`
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
      background: ${ht(o.cardBg)};
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
      color: ${ht(o.textPrimary)};
      border-bottom: 1px solid ${ht(o.divider)};
    }

    .dialog-body {
      padding: 16px 20px;
      font-size: 14px;
      line-height: 1.5;
      color: ${ht(o.textPrimary)};
    }

    .dialog-warning {
      margin: 0 20px 12px;
      padding: 10px 14px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      font-size: 13px;
      color: ${ht(o.textPrimary)};
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
      background: ${ht(o.bgSecondary)};
      border-radius: 8px;
      cursor: pointer;
    }

    .ack-wrapper input[type="checkbox"] {
      margin-top: 2px;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${ht(o.accent)};
    }

    .ack-wrapper label {
      font-size: 13px;
      line-height: 1.4;
      color: ${ht(o.textPrimary)};
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
      color: ${ht(o.textPrimary)};
    }

    .limit-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid ${ht(o.divider)};
      border-radius: 8px;
      font-size: 14px;
      background: ${ht(o.bgPrimary)};
      color: ${ht(o.textPrimary)};
      box-sizing: border-box;
    }

    .limit-hint {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      opacity: 0.7;
      color: ${ht(o.textSecondary)};
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

    .btn-confirm:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-confirm:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;xi([h({type:Boolean,reflect:!0})],ae.prototype,"open",2);xi([h({type:Object})],ae.prototype,"config",2);xi([x()],ae.prototype,"acknowledged",2);xi([x()],ae.prototype,"limitValue",2);ae=xi([D("oig-confirm-dialog")],ae);var ju=Object.defineProperty,Vu=Object.getOwnPropertyDescriptor,La=(t,e,i,n)=>{for(var r=n>1?void 0:n?Vu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&ju(e,i,r),r};const Ue=Q;let Yi=class extends M{constructor(){super(...arguments),this.shieldState=null}render(){if(!this.shieldState)return O;const t=this.determineStatus(this.shieldState),e=t.toLowerCase(),i=this.getStatusIcon(t),n=this.getStatusLabel(t),a=this.shieldState.queueCount>0?"has-items":"";return d`
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
          <span class="shield-status-badge ${e}">${n}</span>
        </div>
      </div>
    `}determineStatus(t){return t.status==="running"?"processing":t.queueCount>0?"pending":"idle"}getStatusIcon(t){switch(t){case"idle":return"✓";case"pending":return"⏳";case"processing":return"🔄";default:return"✓"}}getStatusLabel(t){switch(t){case"idle":return"Připraveno";case"pending":return"Čeká";case"processing":return"Zpracovává";default:return"Neznámý"}}getActivityText(){return this.shieldState?this.shieldState.activity?this.shieldState.activity:this.shieldState.queueCount>0?`${this.shieldState.queueCount} operací ve frontě`:"Systém připraven":"Žádná aktivita"}};Yi.styles=P`
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
  `;La([h({type:Object})],Yi.prototype,"shieldState",2);Yi=La([D("oig-shield-status")],Yi);var qu=Object.defineProperty,Yu=Object.getOwnPropertyDescriptor,jn=(t,e,i,n)=>{for(var r=n>1?void 0:n?Yu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&qu(e,i,r),r};const ge=Q;let ci=class extends M{constructor(){super(...arguments),this.shieldState={...Jr,pendingServices:new Map,changingServices:new Set},this._confirmDialogOverride=null,this.unsubscribe=null,this.onShieldUpdate=t=>{this.shieldState=t}}get confirmDialog(){return this._confirmDialogOverride??this._confirmDialogQuery}set confirmDialog(t){this._confirmDialogOverride=t}connectedCallback(){super.connectedCallback(),this.unsubscribe=X.subscribe(this.onShieldUpdate)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this.unsubscribe)==null||t.call(this),this.unsubscribe=null}get boxModeButtonStates(){return{home_1:X.getBoxModeButtonState("home_1"),home_2:X.getBoxModeButtonState("home_2"),home_3:X.getBoxModeButtonState("home_3"),home_ups:X.getBoxModeButtonState("home_ups")}}get gridDeliveryButtonStates(){return{off:X.getGridDeliveryButtonState("off"),on:X.getGridDeliveryButtonState("on"),limited:X.getGridDeliveryButtonState("limited")}}get boilerModeButtonStates(){return{cbb:X.getBoilerModeButtonState("cbb"),manual:X.getBoilerModeButtonState("manual")}}get supplementaryView(){return Lu(this.shieldState.supplementary)}async onBoxModeChange(t){const{mode:e}=t.detail,i=Zr[e];if(v.debug("Control panel: box mode change requested",{mode:e}),!(await this.confirmDialog.showDialog({title:"Změna režimu střídače",message:`Chystáte se změnit režim boxu na <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování celého systému a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!X.shouldProceedWithQueue())return;await X.setBoxMode(e)||v.warn("Box mode change failed or already active",{mode:e})}async onGridDeliveryChange(t){const{value:e,limit:i}=t.detail,n=Ke[e],r=Ns[e],a=e==="limited",s=this.shieldState.gridDeliveryState.currentLiveLimit??5e3;v.debug("Control panel: grid delivery change requested",{delivery:e,limit:i});const l=this.shieldState.gridDeliveryState.currentLiveDelivery;if(!this.shieldState.gridDeliveryState.isTransitioning&&l==="limited"&&e==="limited"){const m={title:"🚰 Změnit limit přetoků",message:"",limitOnly:!0,showLimitInput:!0,limitValue:s,limitMin:1,limitMax:2e4,limitStep:100,confirmText:"Uložit limit",cancelText:"Zrušit"},g=await this.confirmDialog.showDialog(m);if(!g.confirmed||!X.shouldProceedWithQueue())return;await X.setGridDelivery("limited",g.limit);return}const u={title:`${r} Změna dodávky do sítě`,message:`Chystáte se změnit dodávku do sítě na: <strong>"${n}"</strong>`,warning:a?"Režim a limit budou změněny postupně (serializováno). Každá změna může trvat až 10 minut.":"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,acknowledgementText:"<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost. Aplikace nenese odpovědnost za případné negativní důsledky této změny.",confirmText:"Potvrdit změnu",cancelText:"Zrušit",showLimitInput:a,limitValue:s,limitMin:1,limitMax:2e4,limitStep:100},p=await this.confirmDialog.showDialog(u);if(!p.confirmed||!X.shouldProceedWithQueue())return;const f=this.shieldState.gridDeliveryState.currentLiveDelivery==="limited",y=e==="limited";f&&y&&p.limit!=null?await X.setGridDelivery(e,p.limit):y&&p.limit!=null?await X.setGridDelivery(e,p.limit):await X.setGridDelivery(e)}async onBoilerModeChange(t){const{mode:e}=t.detail,i=Kr[e],n=Qr[e];if(v.debug("Control panel: boiler mode change requested",{mode:e}),!(await this.confirmDialog.showDialog({title:"Změna režimu bojleru",message:`Chystáte se změnit režim bojleru na <strong>"${n} ${i}"</strong>.<br><br>Tato změna ovlivní chování ohřevu vody a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!X.shouldProceedWithQueue())return;await X.setBoilerMode(e)||v.warn("Boiler mode change failed or already active",{mode:e})}async onSupplementaryToggle(t){const{key:e}=t.detail,i=e==="home_grid_v"?"Home 5":"Home 6",n=!this.shieldState.supplementary[e];if(v.debug("Control panel: supplementary toggle requested",{key:e}),!(await this.confirmDialog.showDialog({title:"Změna doplňkového režimu",message:`Chystáte se přepnout <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování systému a může trvat až 10 minut.`,warning:"Změna může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!X.shouldProceedWithQueue())return;await X.setSupplementaryToggle(e,n)||v.warn("Supplementary toggle failed",{key:e})}async onQueueRemoveItem(t){const{position:e}=t.detail;v.debug("Control panel: queue remove requested",{position:e});const i=this.shieldState.allRequests.find(s=>s.position===e);let n="Operace";if(i&&(i.service.includes("set_box_mode")?n=`Změna režimu na ${i.targetValue||"neznámý"}`:i.service.includes("set_grid_delivery")?n=`Změna dodávky do sítě na ${i.targetValue||"neznámý"}`:i.service.includes("set_boiler_mode")&&(n=`Změna režimu bojleru na ${i.targetValue||"neznámý"}`)),!(await this.confirmDialog.showDialog({title:n,message:"Operace bude odstraněna z fronty bez provedení.",requireAcknowledgement:!1,confirmText:"OK",cancelText:"Zrušit"})).confirmed)return;await X.removeFromQueue(e)||v.warn("Failed to remove from queue",{position:e})}render(){const t=this.shieldState,e=t.status==="running"?"running":"idle",i=t.status==="running"?"Zpracovává":"Připraveno",n=t.allRequests.length>0;return d`
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
              .value=${t.gridDeliveryState.currentLiveDelivery}
              .limit=${t.gridDeliveryState.currentLiveLimit??0}
              .pendingTarget=${t.gridDeliveryState.pendingDeliveryTarget}
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
        ${n?d`
          <div class="queue-section">
            <oig-shield-queue
              .items=${t.allRequests}
              .shieldStatus=${t.status}
              .queueCount=${t.queueCount}
              .expanded=${!1}
              @remove-item=${this.onQueueRemoveItem}
            ></oig-shield-queue>
          </div>
        `:O}
      </div>

      <!-- Shared confirm dialog instance -->
      <oig-confirm-dialog></oig-confirm-dialog>
    `}};ci.styles=P`
    :host {
      display: block;
      margin-top: 16px;
    }

    .control-panel {
      background: ${ge(o.cardBg)};
      border-radius: 16px;
      box-shadow: ${ge(o.cardShadow)};
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid ${ge(o.divider)};
    }

    .panel-title {
      font-size: 15px;
      font-weight: 600;
      color: ${ge(o.textPrimary)};
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
      background: ${ge(o.divider)};
      margin: 16px 0;
    }

    .queue-section {
      border-top: 1px solid ${ge(o.divider)};
    }

    @media (max-width: 480px) {
      .panel-body {
        padding: 12px 14px;
      }
    }
  `;jn([x()],ci.prototype,"shieldState",2);jn([Xi("oig-confirm-dialog")],ci.prototype,"_confirmDialogQuery",2);ci=jn([D("oig-control-panel")],ci);var Gu=Object.defineProperty,Uu=Object.getOwnPropertyDescriptor,ze=(t,e,i,n)=>{for(var r=n>1?void 0:n?Uu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&Gu(e,i,r),r};const gt=Q;let jt=class extends M{constructor(){super(...arguments),this.open=!1,this.currentSoc=0,this.maxSoc=100,this.estimate=null,this.targetSoc=80}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onSliderInput(t){this.targetSoc=parseInt(t.target.value,10),this.dispatchEvent(new CustomEvent("soc-change",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}onConfirm(){this.dispatchEvent(new CustomEvent("confirm",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}render(){return d`
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
    `}};jt.styles=P`
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
      background: ${gt(o.cardBg)};
      border-radius: 16px;
      padding: 24px;
      min-width: 320px;
      max-width: 90vw;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${gt(o.textPrimary)};
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
      color: ${gt(o.textSecondary)};
    }

    .soc-value {
      font-size: 24px;
      font-weight: 600;
      color: ${gt(o.textPrimary)};
    }

    .soc-arrow {
      font-size: 20px;
      color: ${gt(o.textSecondary)};
    }

    .slider-container {
      margin: 16px 0;
    }

    .slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: ${gt(o.bgSecondary)};
      -webkit-appearance: none;
      appearance: none;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${gt(o.accent)};
      cursor: pointer;
    }

    .estimate {
      background: ${gt(o.bgSecondary)};
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
      color: ${gt(o.textSecondary)};
    }

    .estimate-value {
      color: ${gt(o.textPrimary)};
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
      background: ${gt(o.bgSecondary)};
      color: ${gt(o.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${gt(o.divider)};
    }

    .btn-confirm {
      background: ${gt(o.accent)};
      color: #fff;
    }

    .btn-confirm:hover {
      opacity: 0.9;
    }
  `;ze([h({type:Boolean})],jt.prototype,"open",2);ze([h({type:Number})],jt.prototype,"currentSoc",2);ze([h({type:Number})],jt.prototype,"maxSoc",2);ze([h({type:Object})],jt.prototype,"estimate",2);ze([x()],jt.prototype,"targetSoc",2);jt=ze([D("oig-battery-charge-dialog")],jt);var Zu=Object.defineProperty,Ku=Object.getOwnPropertyDescriptor,kt=(t,e,i,n)=>{for(var r=n>1?void 0:n?Ku(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&Zu(e,i,r),r};const vn=Q,Vn=P`
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
`;let di=class extends M{constructor(){super(...arguments),this.title="",this.icon="📊"}render(){return d`
      <div class="block-header">
        <span class="block-icon">${this.icon}</span>
        <span class="block-title">${this.title}</span>
      </div>
      <slot></slot>
    `}};di.styles=P`
    :host {
      display: block;
      background: ${vn(o.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${vn(o.cardShadow)};
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
      color: ${vn(o.textPrimary)};
    }

    ${Vn}
  `;kt([h({type:String})],di.prototype,"title",2);kt([h({type:String})],di.prototype,"icon",2);di=kt([D("oig-analytics-block")],di);let Gi=class extends M{constructor(){super(...arguments),this.data=null}render(){if(!this.data)return d`<div>Načítání...</div>`;const t=this.data.trend>=0?"positive":"negative",e=this.data.trend>=0?"+":"",i=this.data.period==="last_month"?"Minulý měsíc":`Aktuální měsíc (${this.data.currentMonthDays} dní)`;return d`
      <div class="efficiency-value">${xe(this.data.efficiency,1)}</div>
      <div class="period-label">${i}</div>

      ${this.data.trend!==0?d`
        <div class="comparison ${t}">
          ${e}${xe(this.data.trend)} vs minulý měsíc
        </div>
      `:null}

      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${ve(this.data.charged)}</div>
          <div class="stat-label">Nabito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${ve(this.data.discharged)}</div>
          <div class="stat-label">Vybito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${ve(this.data.losses)}</div>
          <div class="stat-label">Ztráty</div>
          ${this.data.lossesPct?d`
            <div class="losses-pct">${xe(this.data.lossesPct,1)}</div>
          `:null}
        </div>
      </div>
    `}};Gi.styles=P`
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
  `;kt([h({type:Object})],Gi.prototype,"data",2);Gi=kt([D("oig-battery-efficiency")],Gi);let Ui=class extends M{constructor(){super(...arguments),this.data=null}renderSparkline(){var c;const t=(c=this.data)==null?void 0:c.measurementHistory;if(!t||t.length<2)return null;const e=t.map(u=>u.soh_percent),i=Math.min(...e)-1,r=Math.max(...e)+1-i||1,a=200,s=40,l=e.map((u,p)=>{const f=p/(e.length-1)*a,y=s-(u-i)/r*s;return`${f},${y}`}).join(" ");return d`
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
          <span class="metric-value">${xe(this.data.soh,1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Kapacita (P80)</span>
          <span class="metric-value">${ve(this.data.capacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Min. kapacita (P20)</span>
          <span class="metric-value">${ve(this.data.minCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Nominální kapacita</span>
          <span class="metric-value">${ve(this.data.nominalCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Počet měření</span>
          <span class="metric-value">${this.data.measurementCount}</span>
        </div>
        ${this.data.qualityScore!=null?d`
          <div class="metric">
            <span class="metric-label">Kvalita dat</span>
            <span class="metric-value">${xe(this.data.qualityScore,0)}</span>
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
                Spolehlivost: <span class="prediction-value">${xe(this.data.trendConfidence,0)}</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:d`<div>Načítání...</div>`}};Ui.styles=P`
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

    ${Vn}

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
  `;kt([h({type:Object})],Ui.prototype,"data",2);Ui=kt([D("oig-battery-health")],Ui);let Zi=class extends M{constructor(){super(...arguments),this.data=null}getProgressClass(t){return t==null?"ok":t>=95?"overdue":t>=80?"due-soon":"ok"}render(){return this.data?d`
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
    `:d`<div>Načítání...</div>`}};Zi.styles=P`
    :host { display: block; }
    ${Vn}

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
  `;kt([h({type:Object})],Zi.prototype,"data",2);Zi=kt([D("oig-battery-balancing")],Zi);let Ki=class extends M{constructor(){super(...arguments),this.data=null}render(){return this.data?d`
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
    `:d`<div>Načítání...</div>`}};Ki.styles=P`
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
  `;kt([h({type:Object})],Ki.prototype,"data",2);Ki=kt([D("oig-cost-comparison")],Ki);var Qu=Object.defineProperty,Xu=Object.getOwnPropertyDescriptor,Le=(t,e,i,n)=>{for(var r=n>1?void 0:n?Xu(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&Qu(e,i,r),r};const me=Q;let ui=class extends M{constructor(){super(...arguments),this.data=Je,this.compact=!1,this.onClick=()=>{this.dispatchEvent(new CustomEvent("badge-click",{bubbles:!0}))}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.onClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.onClick)}render(){const t=this.data.effectiveSeverity,e=Oi[t]??Oi[0],i=this.data.warningsCount>0&&t>0,n=i?oa(this.data.eventType):"✓";return d`
      <style>
        :host { background: ${me(e)}; }
      </style>
      <span class="badge-icon">${n}</span>
      ${i?d`
        <span class="badge-count">${this.data.warningsCount}</span>
      `:null}
      <span class="badge-label">${i?la[t]??"Výstraha":"OK"}</span>
    `}};ui.styles=P`
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
  `;Le([h({type:Object})],ui.prototype,"data",2);Le([h({type:Boolean})],ui.prototype,"compact",2);ui=Le([D("oig-chmu-badge")],ui);let pi=class extends M{constructor(){super(...arguments),this.open=!1,this.data=Je}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}formatTime(t){return t?new Date(t).toLocaleString("cs-CZ"):"—"}renderWarning(t){const e=Oi[t.severity]??Oi[2],i=oa(t.event_type),n=la[t.severity]??"Neznámá";return d`
      <div class="warning-item" style="background: ${e}">
        <div class="warning-header">
          <span class="warning-icon">${i}</span>
          <span class="warning-type">${t.event_type}</span>
          <span class="warning-level">${n}</span>
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
    `}};pi.styles=P`
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
      background: ${me(o.cardBg)};
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
      color: ${me(o.textPrimary)};
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      font-size: 20px;
      cursor: pointer;
      color: ${me(o.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${me(o.bgSecondary)};
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
      color: ${me(o.textSecondary)};
    }

    .eta-badge {
      display: inline-block;
      font-size: 10px;
      padding: 1px 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      margin-left: 6px;
    }
  `;Le([h({type:Boolean,reflect:!0})],pi.prototype,"open",2);Le([h({type:Object})],pi.prototype,"data",2);pi=Le([D("oig-chmu-modal")],pi);var Ju=Object.defineProperty,tp=Object.getOwnPropertyDescriptor,Lt=(t,e,i,n)=>{for(var r=n>1?void 0:n?tp(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&Ju(e,i,r),r};const F=Q;let se=class extends M{constructor(){super(...arguments),this.open=!1,this.activeTab="today",this.data=null,this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.open&&this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onTabClick(t){this.activeTab=t,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:t},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(t){return`${t.toFixed(0)}%`}adherenceColor(t){return t>=90?"#4caf50":t>=70?"#ff9800":"#f44336"}getModeConfig(t){return ca[t]??{icon:"❓",color:"#666",label:t}}renderModeBlock(t){const e=this.getModeConfig(t.modePlanned||t.modeHistorical),i=t.status==="current";return d`
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
    `}renderMetricTile(t,e){const i=e.unit==="Kč"?it(e.plan):`${e.plan.toFixed(1)} ${e.unit}`;let n="",r="";return e.hasActual&&e.actual!=null&&(r=e.unit==="Kč"?it(e.actual):`${e.actual.toFixed(1)} ${e.unit}`,e.unit==="Kč"?n=e.actual<=e.plan?"better":"worse":n=e.actual>=e.plan?"better":"worse"),d`
      <div class="metric-tile">
        <div class="metric-label">${t}</div>
        <div class="metric-values">
          <span class="metric-plan">${i}</span>
          ${e.hasActual?d`
            <span class="metric-actual ${n}">(${r})</span>
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
              ${da[e]}
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
    `}};se.styles=P`
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
  `;Lt([h({type:Boolean,reflect:!0})],se.prototype,"open",2);Lt([h({type:String})],se.prototype,"activeTab",2);Lt([h({type:Object})],se.prototype,"data",2);Lt([x()],se.prototype,"autoRefresh",2);se=Lt([D("oig-timeline-dialog")],se);let Te=class extends M{constructor(){super(...arguments),this.data=null,this.activeTab="today",this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onTabClick(t){this.activeTab=t,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:t},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(t){return`${t.toFixed(0)}%`}adherenceColor(t){return t>=90?"#4caf50":t>=70?"#ff9800":"#f44336"}getModeConfig(t){return ca[t]??{icon:"❓",color:"#666",label:t}}renderModeBlock(t){const e=this.getModeConfig(t.modePlanned||t.modeHistorical),i=t.status==="current";return d`
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
    `}renderMetricTile(t,e){const i=e.unit==="Kč"?it(e.plan):`${e.plan.toFixed(1)} ${e.unit}`;let n="",r="";return e.hasActual&&e.actual!=null&&(r=e.unit==="Kč"?it(e.actual):`${e.actual.toFixed(1)} ${e.unit}`,e.unit==="Kč"?n=e.actual<=e.plan?"better":"worse":n=e.actual>=e.plan?"better":"worse"),d`
      <div class="metric-tile">
        <div class="metric-label">${t}</div>
        <div class="metric-values">
          <span class="metric-plan">${i}</span>
          ${e.hasActual?d`
            <span class="metric-actual ${n}">(${r})</span>
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
              ${da[e]}
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
    `}};Te.styles=P`
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
  `;Lt([h({type:Object})],Te.prototype,"data",2);Lt([h({type:String})],Te.prototype,"activeTab",2);Lt([x()],Te.prototype,"autoRefresh",2);Te=Lt([D("oig-timeline-tile")],Te);var ep=Object.defineProperty,ip=Object.getOwnPropertyDescriptor,qt=(t,e,i,n)=>{for(var r=n>1?void 0:n?ip(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&ep(e,i,r),r};const at=Q;let Me=class extends M{constructor(){super(...arguments),this.data=null,this.editMode=!1,this.tileType="entity"}onTileClick(){var e;if(this.editMode)return;const t=(e=this.data)==null?void 0:e.config;t&&(t.type==="button"&&t.action?Qo(t.entity_id,t.action):J.openEntityDialog(t.entity_id))}onSupportClick(t,e){t.stopPropagation(),!this.editMode&&J.openEntityDialog(e)}onEdit(){var t;this.dispatchEvent(new CustomEvent("edit-tile",{detail:{entityId:(t=this.data)==null?void 0:t.config.entity_id},bubbles:!0,composed:!0}))}onDelete(){var t;this.dispatchEvent(new CustomEvent("delete-tile",{detail:{entityId:(t=this.data)==null?void 0:t.config.entity_id},bubbles:!0,composed:!0}))}render(){var c,u;if(!this.data)return null;const t=this.data.config,e=t.type==="button";this.tileType!==t.type&&(this.tileType=t.type??"entity");const i=t.color||"",n=t.icon||(e?"⚡":"📊"),r=n.startsWith("mdi:")?zi(n):n,a=(c=t.support_entities)==null?void 0:c.top_right,s=(u=t.support_entities)==null?void 0:u.bottom_right,l=this.data.supportValues.topRight||this.data.supportValues.bottomRight;return d`
      ${i?d`<style>:host { --tile-color: ${at(i)}; }</style>`:null}

      <div class="tile-top" @click=${this.onTileClick} title=${this.editMode?"":t.entity_id}>
        <span class="tile-icon">${r}</span>
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
    `}};Me.styles=P`
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
  `;qt([h({type:Object})],Me.prototype,"data",2);qt([h({type:Boolean})],Me.prototype,"editMode",2);qt([h({type:String,reflect:!0})],Me.prototype,"tileType",2);Me=qt([D("oig-tile")],Me);let De=class extends M{constructor(){super(...arguments),this.tiles=[],this.editMode=!1,this.position="left"}render(){return this.tiles.length===0?d`<div class="empty-state">Žádné dlaždice</div>`:d`
      ${this.tiles.map(t=>d`
        <oig-tile
          .data=${t}
          .editMode=${this.editMode}
          .tileType=${t.config.type??"entity"}
          class="${t.isZero?"inactive":""}"
        ></oig-tile>
      `)}
    `}};De.styles=P`
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
  `;qt([h({type:Array})],De.prototype,"tiles",2);qt([h({type:Boolean})],De.prototype,"editMode",2);qt([h({type:String,reflect:!0})],De.prototype,"position",2);De=qt([D("oig-tiles-container")],De);var np=Object.defineProperty,rp=Object.getOwnPropertyDescriptor,qn=(t,e,i,n)=>{for(var r=n>1?void 0:n?rp(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&np(e,i,r),r};const tt=Q,Br={Spotrebice:["fridge","fridge-outline","dishwasher","washing-machine","tumble-dryer","stove","microwave","coffee-maker","kettle","toaster","blender","food-processor","rice-cooker","slow-cooker","pressure-cooker","air-fryer","oven","range-hood"],Osvetleni:["lightbulb","lightbulb-outline","lamp","ceiling-light","floor-lamp","led-strip","led-strip-variant","wall-sconce","chandelier","desk-lamp","spotlight","light-switch"],"Vytapeni & Chlazeni":["thermometer","thermostat","radiator","radiator-disabled","heat-pump","air-conditioner","fan","hvac","fire","snowflake","fireplace","heating-coil"],"Energie & Baterie":["lightning-bolt","flash","battery","battery-charging","battery-50","battery-10","solar-panel","solar-power","meter-electric","power-plug","power-socket","ev-plug","transmission-tower","current-ac","current-dc"],"Auto & Doprava":["car","car-electric","car-battery","ev-station","ev-plug-type2","garage","garage-open","motorcycle","bicycle","scooter","bus","train","airplane"],Zabezpeceni:["door","door-open","lock","lock-open","shield-home","cctv","camera","motion-sensor","alarm-light","bell","eye","key","fingerprint","shield-check"],"Okna & Stineni":["window-closed","window-open","blinds","blinds-open","curtains","roller-shade","window-shutter","balcony","door-sliding"],"Media & Zabava":["television","speaker","speaker-wireless","music","volume-high","cast","chromecast","radio","headphones","microphone","gamepad","movie","spotify"],"Sit & IT":["router-wireless","wifi","access-point","lan","network","home-assistant","server","nas","cloud","ethernet","bluetooth","cellphone","tablet","laptop"],"Voda & Koupelna":["water","water-percent","water-boiler","water-pump","shower","toilet","faucet","pipe","bathtub","sink","water-heater","pool"],Pocasi:["weather-sunny","weather-cloudy","weather-night","weather-rainy","weather-snowy","weather-windy","weather-fog","weather-lightning","weather-hail","temperature","humidity","barometer"],"Ventilace & Kvalita vzduchu":["fan","air-filter","air-purifier","smoke-detector","co2","wind-turbine"],"Zahrada & Venku":["flower","tree","sprinkler","grass","garden-light","outdoor-lamp","grill","pool","hot-tub","umbrella","thermometer-lines"],Domacnost:["iron","vacuum","broom","mop","washing","basket","hanger","scissors"],"Notifikace & Stav":["information","help-circle","alert-circle","checkbox-marked-circle","check","close","minus","plus","arrow-up","arrow-down","refresh","sync","bell-ring"],Ovladani:["toggle-switch","power","play","pause","stop","skip-next","skip-previous","volume-up","volume-down","brightness-up","brightness-down"],"Cas & Planovani":["clock","timer","alarm","calendar","calendar-clock","schedule","history"],Ostatni:["home","cog","tools","wrench","hammer","chart-line","gauge","dots-vertical","menu","settings","account","logout"]};let hi=class extends M{constructor(){super(...arguments),this.isOpen=!1,this.searchQuery=""}get filteredCategories(){const t=this.searchQuery.trim().toLowerCase();if(!t)return Br;const e=Object.entries(Br).map(([i,n])=>{const r=n.filter(a=>a.toLowerCase().includes(t));return[i,r]}).filter(([,i])=>i.length>0);return Object.fromEntries(e)}open(){this.isOpen=!0}close(){this.isOpen=!1,this.searchQuery=""}onOverlayClick(t){t.target===t.currentTarget&&this.close()}onSearchInput(t){const e=t.target;this.searchQuery=(e==null?void 0:e.value)??""}onIconClick(t){this.dispatchEvent(new CustomEvent("icon-selected",{detail:{icon:`mdi:${t}`},bubbles:!0,composed:!0})),this.close()}render(){if(!this.isOpen)return null;const t=this.filteredCategories,e=Object.entries(t);return d`
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
            `:e.map(([i,n])=>d`
              <div class="category">
                <div class="category-title">${i}</div>
                <div class="icon-grid">
                  ${n.map(r=>d`
                    <button class="icon-item" type="button" @click=${()=>this.onIconClick(r)}>
                      <span class="icon-emoji">${zi(r)}</span>
                      <span class="icon-name">${r}</span>
                    </button>
                  `)}
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}};hi.styles=P`
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
  `;qn([h({type:Boolean,reflect:!0,attribute:"open"})],hi.prototype,"isOpen",2);qn([x()],hi.prototype,"searchQuery",2);hi=qn([D("oig-icon-picker")],hi);var ap=Object.defineProperty,sp=Object.getOwnPropertyDescriptor,ut=(t,e,i,n)=>{for(var r=n>1?void 0:n?sp(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&ap(e,i,r),r};const E=Q;let rt=class extends M{constructor(){super(...arguments),this.isOpen=!1,this.tileIndex=-1,this.tileSide="left",this.existingConfig=null,this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}loadTileConfig(t){var e,i;this.currentTab=t.type,t.type==="entity"?this.selectedEntityId=t.entity_id:this.selectedButtonEntityId=t.entity_id,this.label=t.label||"",this.icon=t.icon||"",this.color=t.color||"#03A9F4",this.action=t.action||"toggle",this.supportEntity1=((e=t.support_entities)==null?void 0:e.top_right)||"",this.supportEntity2=((i=t.support_entities)==null?void 0:i.bottom_right)||""}resetForm(){this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}handleClose(){this.isOpen=!1,this.resetForm(),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}getEntities(){const t=Bt();return t?t.getAll():{}}getEntityItems(t,e){const i=e.trim().toLowerCase(),n=this.getEntities();return Object.entries(n).filter(([a])=>t.some(s=>a.startsWith(s))).map(([a,s])=>{const l=this.getAttributeValue(s,"friendly_name")||a,c=this.getAttributeValue(s,"unit_of_measurement"),u=this.getAttributeValue(s,"icon");return{id:a,name:l,value:s.state,unit:c,icon:u,state:s}}).filter(a=>i?a.name.toLowerCase().includes(i)||a.id.toLowerCase().includes(i):!0).sort((a,s)=>a.name.localeCompare(s.name))}getSupportEntities(t){const e=t.trim().toLowerCase();if(!e)return[];const i=this.getEntities();return Object.entries(i).map(([n,r])=>{const a=this.getAttributeValue(r,"friendly_name")||n,s=this.getAttributeValue(r,"unit_of_measurement"),l=this.getAttributeValue(r,"icon");return{id:n,name:a,value:r.state,unit:s,icon:l,state:r}}).filter(n=>n.name.toLowerCase().includes(e)||n.id.toLowerCase().includes(e)).sort((n,r)=>n.name.localeCompare(r.name)).slice(0,20)}getDisplayIcon(t){return t?t.startsWith("mdi:")?zi(t):t:zi("")}getColorForEntity(t){switch(t.split(".")[0]){case"sensor":return"#03A9F4";case"binary_sensor":return"#4CAF50";case"switch":return"#FFC107";case"light":return"#FF9800";case"fan":return"#00BCD4";case"input_boolean":return"#9C27B0";default:return"#03A9F4"}}applyEntityDefaults(t){if(!t)return;const i=this.getEntities()[t];if(!i)return;this.label||(this.label=this.getAttributeValue(i,"friendly_name"));const n=this.getAttributeValue(i,"icon");!this.icon&&n&&(this.icon=n),this.color=this.getColorForEntity(t)}handleEntitySelect(t){this.selectedEntityId=t,this.applyEntityDefaults(t)}handleButtonEntitySelect(t){this.selectedButtonEntityId=t,this.applyEntityDefaults(t)}handleSupportInput(t,e){const i=e.trim();t===1?(this.supportSearch1=e,this.showSupportList1=!!i,i||(this.supportEntity1="")):(this.supportSearch2=e,this.showSupportList2=!!i,i||(this.supportEntity2=""))}handleSupportSelect(t,e){const i=e.name||e.id;t===1?(this.supportEntity1=e.id,this.supportSearch1=i,this.showSupportList1=!1):(this.supportEntity2=e.id,this.supportSearch2=i,this.showSupportList2=!1)}getSupportInputValue(t,e){if(t)return t;if(!e)return"";const i=this.getEntities()[e];return i&&this.getAttributeValue(i,"friendly_name")||e}getAttributeValue(t,e){var n;const i=(n=t.attributes)==null?void 0:n[e];return i==null?"":String(i)}handleSave(){const t=this.currentTab==="entity"?this.selectedEntityId:this.selectedButtonEntityId;if(!t){window.alert("Vyberte entitu");return}const e={top_right:this.supportEntity1||void 0,bottom_right:this.supportEntity2||void 0},i={type:this.currentTab,entity_id:t,label:this.label||void 0,icon:this.icon||void 0,color:this.color||void 0,action:this.currentTab==="button"?this.action:void 0,support_entities:e};this.dispatchEvent(new CustomEvent("tile-saved",{detail:{index:this.tileIndex,side:this.tileSide,config:i},bubbles:!0,composed:!0})),this.handleClose()}onIconSelected(t){var e;this.icon=((e=t.detail)==null?void 0:e.icon)||"",this.iconPickerOpen=!1}renderEntityList(t,e,i,n){const r=this.getEntityItems(t,e);return r.length===0?d`<div class="support-empty">Žádné entity nenalezeny</div>`:d`
      ${r.map(a=>d`
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
    `}renderSupportList(t,e){const i=this.getSupportEntities(t);return i.length===0?d`<div class="support-empty">Žádné entity nenalezeny</div>`:d`
      ${i.map(n=>d`
        <div
          class="support-item"
          @mousedown=${()=>this.handleSupportSelect(e,n)}
        >
          <div class="support-name">${n.name}</div>
          <div class="support-value">${n.value} ${n.unit}</div>
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
    `:null}};rt.styles=P`
    :host {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      font-family: ${E(o.fontFamily)};
    }

    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${E(o.bgPrimary)} 35%, transparent);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .dialog {
      width: min(520px, 100%);
      max-height: 85vh;
      background: ${E(o.cardBg)};
      border: 1px solid ${E(o.divider)};
      border-radius: 16px;
      box-shadow: ${E(o.cardShadow)};
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
      border-bottom: 1px solid ${E(o.divider)};
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${E(o.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${E(o.bgSecondary)};
      color: ${E(o.textPrimary)};
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
      background: ${E(o.divider)};
      transform: scale(1.05);
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 18px;
      background: ${E(o.bgSecondary)};
      border-bottom: 1px solid ${E(o.divider)};
    }

    .tab-btn {
      border: 1px solid transparent;
      background: ${E(o.cardBg)};
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: ${E(o.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: border 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }

    .tab-btn.active {
      border-color: ${E(o.accent)};
      color: ${E(o.textPrimary)};
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
      color: ${E(o.textSecondary)};
      font-weight: 600;
    }

    .input,
    select,
    .color-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${E(o.divider)};
      background: ${E(o.bgPrimary)};
      color: ${E(o.textPrimary)};
      font-size: 12px;
      outline: none;
      transition: border 0.2s ease, box-shadow 0.2s ease;
    }

    .input::placeholder {
      color: ${E(o.textSecondary)};
    }

    .input:focus,
    select:focus,
    .color-input:focus {
      border-color: ${E(o.accent)};
      box-shadow: 0 0 0 2px color-mix(in srgb, ${E(o.accent)} 20%, transparent);
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
      border: 1px dashed ${E(o.divider)};
      display: grid;
      place-items: center;
      font-size: 22px;
      cursor: pointer;
      background: ${E(o.bgSecondary)};
      transition: border 0.2s ease, transform 0.2s ease;
    }

    .icon-preview:hover {
      border-color: ${E(o.accent)};
      transform: translateY(-1px);
    }

    .icon-field {
      font-size: 11px;
    }

    .icon-btn {
      border: none;
      background: ${E(o.bgSecondary)};
      color: ${E(o.textPrimary)};
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .divider {
      height: 1px;
      background: ${E(o.divider)};
      margin: 6px 0;
      opacity: 0.8;
    }

    .entity-list {
      border: 1px solid ${E(o.divider)};
      border-radius: 12px;
      overflow: hidden;
      max-height: 200px;
      overflow-y: auto;
      background: ${E(o.bgPrimary)};
    }

    .entity-item {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid ${E(o.divider)};
      cursor: pointer;
      align-items: center;
      transition: background 0.2s ease;
    }

    .entity-item:last-child {
      border-bottom: none;
    }

    .entity-item:hover {
      background: ${E(o.bgSecondary)};
    }

    .entity-item.selected {
      background: color-mix(in srgb, ${E(o.accent)} 16%, transparent);
      border-left: 3px solid ${E(o.accent)};
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
      color: ${E(o.textPrimary)};
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-sub {
      font-size: 10px;
      color: ${E(o.textSecondary)};
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
      background: ${E(o.cardBg)};
      border: 1px solid ${E(o.divider)};
      border-radius: 12px;
      z-index: 10;
      max-height: 180px;
      overflow-y: auto;
      box-shadow: ${E(o.cardShadow)};
    }

    .support-item {
      padding: 10px 12px;
      border-bottom: 1px solid ${E(o.divider)};
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
      background: ${E(o.bgSecondary)};
    }

    .support-name {
      font-size: 12px;
      color: ${E(o.textPrimary)};
      font-weight: 600;
    }

    .support-value {
      font-size: 10px;
      color: ${E(o.textSecondary)};
    }

    .support-empty {
      padding: 12px;
      font-size: 11px;
      color: ${E(o.textSecondary)};
      text-align: center;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px 18px;
      border-top: 1px solid ${E(o.divider)};
      background: ${E(o.bgSecondary)};
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
      background: ${E(o.bgPrimary)};
      color: ${E(o.textPrimary)};
      border: 1px solid ${E(o.divider)};
    }

    .btn-primary {
      background: ${E(o.accent)};
      color: #fff;
      box-shadow: 0 6px 14px color-mix(in srgb, ${E(o.accent)} 40%, transparent);
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
  `;ut([h({type:Boolean,reflect:!0,attribute:"open"})],rt.prototype,"isOpen",2);ut([h({type:Number})],rt.prototype,"tileIndex",2);ut([h({attribute:!1})],rt.prototype,"tileSide",2);ut([h({attribute:!1})],rt.prototype,"existingConfig",2);ut([x()],rt.prototype,"currentTab",2);ut([x()],rt.prototype,"entitySearchText",2);ut([x()],rt.prototype,"buttonSearchText",2);ut([x()],rt.prototype,"selectedEntityId",2);ut([x()],rt.prototype,"selectedButtonEntityId",2);ut([x()],rt.prototype,"label",2);ut([x()],rt.prototype,"icon",2);ut([x()],rt.prototype,"color",2);ut([x()],rt.prototype,"action",2);ut([x()],rt.prototype,"supportEntity1",2);ut([x()],rt.prototype,"supportEntity2",2);ut([x()],rt.prototype,"supportSearch1",2);ut([x()],rt.prototype,"supportSearch2",2);ut([x()],rt.prototype,"showSupportList1",2);ut([x()],rt.prototype,"showSupportList2",2);ut([x()],rt.prototype,"iconPickerOpen",2);rt=ut([D("oig-tile-dialog")],rt);var op=Object.defineProperty,lp=Object.getOwnPropertyDescriptor,W=(t,e,i,n)=>{for(var r=n>1?void 0:n?lp(e,i):e,a=t.length-1,s;a>=0;a--)(s=t[a])&&(r=(n?s(e,i,r):s(r))||r);return n&&r&&op(e,i,r),r};const _t=Q,Fr=new URLSearchParams(window.location.search),be=Fr.get("sn")||Fr.get("inverter_sn")||"2206237016",Nr=`sensor.oig_${be}_`,cp=[{id:"flow",label:"Toky",icon:"⚡"},{id:"pricing",label:"Ceny",icon:"💰"},{id:"boiler",label:"Bojler",icon:"🔥"}];let R=class extends M{constructor(){super(...arguments),this.hass=null,this.loading=!0,this.error=null,this.activeTab="flow",this.editMode=!1,this.time="",this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1,this.flowData=En,this.pricingData=null,this.pricingLoading=!1,this.boilerState=null,this.boilerLoading=!1,this.boilerPlan=null,this.boilerEnergyBreakdown=null,this.boilerPredictedUsage=null,this.boilerConfig=null,this.boilerHeatmap7x24=[],this.boilerProfiling=null,this.boilerCurrentCategory="",this.boilerAvailableCategories=[],this.boilerForecastWindows={fve:"--",grid:"--"},this.boilerRefreshTimer=null,this.analyticsData=vr,this.chmuData=Je,this.chmuModalOpen=!1,this.timelineTab="today",this.timelineData=null,this.tilesConfig=null,this.tilesLeft=[],this.tilesRight=[],this.tileDialogOpen=!1,this.editingTileIndex=-1,this.editingTileSide="left",this.editingTileConfig=null,this.entityStore=null,this.timeInterval=null,this.stateWatcherUnsub=null,this.tileEntityUnsubs=[],this.pricingDirty=!1,this.timelineDirty=!1,this.analyticsDirty=!1,this.boilerDirty=!1,this.reconnecting=!1,this.throttledUpdateFlow=gn(()=>this.updateFlowData(),500),this.throttledUpdateSensors=gn(()=>this.updateSensorData(),1e3),this.throttledRefreshDerivedData=gn(()=>this.refreshDerivedData(),5e3),this.onPageShow=()=>{this.rebindHassContext()},this.onDocumentVisibilityChange=()=>{document.visibilityState==="visible"&&this.rebindHassContext()}}connectedCallback(){super.connectedCallback(),window.addEventListener("pageshow",this.onPageShow),document.addEventListener("visibilitychange",this.onDocumentVisibilityChange),this.initApp(),this.startTimeUpdate()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("pageshow",this.onPageShow),document.removeEventListener("visibilitychange",this.onDocumentVisibilityChange),this.cleanup()}updated(t){t.has("hass")&&!t.has("loading")&&this.rebindHassContext(),t.has("activeTab")&&(this.activeTab==="pricing"&&(!this.pricingData||this.pricingDirty)&&this.loadPricingData(),this.activeTab==="pricing"&&(this.analyticsData===vr||this.analyticsDirty)&&this.loadAnalyticsAsync(),this.activeTab==="pricing"&&(!this.timelineData||this.timelineDirty)&&this.loadTimelineTabData(this.timelineTab),this.activeTab==="boiler"&&(!this.boilerState||this.boilerDirty)&&this.loadBoilerDataAsync())}async initApp(){try{const t=await J.getHass();if(!t)throw new Error("Cannot access Home Assistant context");this.hass=t,this.entityStore=As(t,be),await ee.start({getHass:()=>J.getHassSync(),prefixes:[Nr]}),this.stateWatcherUnsub=ee.onEntityChange((e,i)=>{this.syncHassState(e,i),this.throttledUpdateFlow(),this.throttledUpdateSensors(),this.throttledRefreshDerivedData()}),X.start(),this.updateFlowData(),this.updateSensorData(),this.loadPricingData(),this.loadBoilerDataAsync(),this.loadAnalyticsAsync(),this.loadTilesAsync(),this.loading=!1,v.info("App initialized",{entities:Object.keys(t.states||{}).length,inverterSn:be})}catch(t){this.error=t.message,this.loading=!1,v.error("App init failed",t)}}cleanup(){var t,e;(t=this.stateWatcherUnsub)==null||t.call(this),this.stateWatcherUnsub=null,ee.stop(),X.stop(),this.tileEntityUnsubs.forEach(i=>i()),this.tileEntityUnsubs=[],(e=this.entityStore)==null||e.destroy(),this.entityStore=null,this.timeInterval!==null&&(clearInterval(this.timeInterval),this.timeInterval=null),this.boilerRefreshTimer!==null&&(clearInterval(this.boilerRefreshTimer),this.boilerRefreshTimer=null)}async rebindHassContext(){var t;if(!this.reconnecting){this.reconnecting=!0;try{const e=await J.refreshHass();if(!e)return;this.hass=e,(t=this.entityStore)==null||t.updateHass(e),await ee.start({getHass:()=>J.getHassSync(),prefixes:[Nr]}),this.updateFlowData(),this.updateSensorData()}catch(e){v.error("Failed to rebind hass context",e)}finally{this.reconnecting=!1}}}updateFlowData(){var t;if(this.hass)try{const e=((t=this.entityStore)==null?void 0:t.getAll())??this.hass;this.flowData=to(e)}catch(e){v.error("Failed to extract flow data",e)}}updateSensorData(){if(this.chmuData=qo(be),this.activeTab==="pricing"&&(this.analyticsData={...this.analyticsData,...jo()}),this.tilesConfig){const t=je(this.tilesConfig);this.tilesLeft=t.left,this.tilesRight=t.right}}updateTilesImmediate(){if(!this.tilesConfig)return;const t=je(this.tilesConfig);this.tilesLeft=t.left,this.tilesRight=t.right}subscribeTileEntities(){if(this.tileEntityUnsubs.forEach(e=>e()),this.tileEntityUnsubs=[],!this.tilesConfig||!this.entityStore)return;const t=new Set;[...this.tilesConfig.tiles_left,...this.tilesConfig.tiles_right].forEach(e=>{var i,n;e&&(t.add(e.entity_id),(i=e.support_entities)!=null&&i.top_right&&t.add(e.support_entities.top_right),(n=e.support_entities)!=null&&n.bottom_right&&t.add(e.support_entities.bottom_right))});for(const e of t){const i=this.entityStore.subscribe(e,()=>{this.updateTilesImmediate()});this.tileEntityUnsubs.push(i)}}async loadPricingData(){if(!(!this.hass||this.pricingLoading)){this.pricingLoading=!0;try{const t=await Ve(()=>vo(this.hass));this.pricingData=t,this.pricingDirty=!1}catch(t){v.error("Failed to load pricing data",t)}finally{this.pricingLoading=!1}}}async loadBoilerDataAsync(){if(!(!this.hass||this.boilerLoading)){this.boilerLoading=!0;try{const t=await Ve(()=>Ro(this.hass));this.boilerState=t.state,this.boilerPlan=t.plan,this.boilerEnergyBreakdown=t.energyBreakdown,this.boilerPredictedUsage=t.predictedUsage,this.boilerConfig=t.config,this.boilerHeatmap7x24=t.heatmap7x24,this.boilerProfiling=t.profiling,this.boilerCurrentCategory=t.currentCategory,this.boilerAvailableCategories=t.availableCategories,this.boilerForecastWindows=t.forecastWindows,this.boilerDirty=!1,this.boilerRefreshTimer||(this.boilerRefreshTimer=window.setInterval(()=>this.loadBoilerDataAsync(),5*60*1e3))}catch(t){v.error("Failed to load boiler data",t)}finally{this.boilerLoading=!1}}}async loadAnalyticsAsync(){try{this.analyticsData=await Ve(()=>Wo(be)),this.analyticsDirty=!1}catch(t){v.error("Failed to load analytics",t)}}async loadTilesAsync(){try{this.tilesConfig=await Ve(()=>Ko());const t=je(this.tilesConfig);this.tilesLeft=t.left,this.tilesRight=t.right,this.subscribeTileEntities()}catch(t){v.error("Failed to load tiles config",t)}}async loadTimelineTabData(t){try{this.timelineData=await Ve(()=>Uo(be,t)),this.timelineDirty=!1}catch(e){v.error(`Failed to load timeline tab: ${t}`,e)}}syncHassState(t,e){if(this.hass){if(this.hass.states||(this.hass.states={}),e){this.hass.states[t]=e;return}delete this.hass.states[t]}}refreshDerivedData(){if(this.pricingDirty=!0,this.timelineDirty=!0,this.analyticsDirty=!0,this.boilerDirty=!0,this.activeTab==="pricing"){oo(),this.loadPricingData(),this.loadTimelineTabData(this.timelineTab),this.loadAnalyticsAsync();return}this.activeTab==="boiler"&&this.loadBoilerDataAsync()}startTimeUpdate(){const t=()=>{this.time=new Date().toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})};t(),this.timeInterval=window.setInterval(t,1e3)}onTabChange(t){this.activeTab=t.detail.tabId}onGridChargingOpen(){var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector("oig-grid-charging-dialog");t==null||t.show()}onEditClick(){this.editMode=!this.editMode}onResetClick(){var i,n;const t=(i=this.shadowRoot)==null?void 0:i.querySelector("oig-flow-canvas");t!=null&&t.resetLayout&&t.resetLayout();const e=(n=this.shadowRoot)==null?void 0:n.querySelector("oig-grid");e&&e.resetLayout()}onToggleLeftPanel(){this.leftPanelCollapsed=!this.leftPanelCollapsed}onToggleRightPanel(){this.rightPanelCollapsed=!this.rightPanelCollapsed}onChmuBadgeClick(){this.chmuModalOpen=!0}onChmuModalClose(){this.chmuModalOpen=!1}onTimelineTabChange(t){this.timelineTab=t.detail.tab,this.loadTimelineTabData(t.detail.tab)}onTimelineRefresh(){this.loadTimelineTabData(this.timelineTab)}onBoilerCategoryChange(t){const e=t.detail.category;this.boilerCurrentCategory=e,this.loadBoilerDataAsync()}onBoilerActionDone(t){const{success:e,label:i}=t.detail;v.info(`[Boiler] Action ${i}: ${e?"OK":"FAIL"}`),e&&setTimeout(()=>this.loadBoilerDataAsync(),2e3)}onEditTile(t){const{entityId:e}=t.detail;let i=-1,n="left",r=null;if(this.tilesConfig){const a=this.tilesConfig.tiles_left.findIndex(s=>s&&s.entity_id===e);if(a>=0)i=a,n="left",r=this.tilesConfig.tiles_left[a];else{const s=this.tilesConfig.tiles_right.findIndex(l=>l&&l.entity_id===e);s>=0&&(i=s,n="right",r=this.tilesConfig.tiles_right[s])}}this.editingTileIndex=i,this.editingTileSide=n,this.editingTileConfig=r,this.tileDialogOpen=!0,r&&requestAnimationFrame(()=>{var s;const a=(s=this.shadowRoot)==null?void 0:s.querySelector("oig-tile-dialog");a==null||a.loadTileConfig(r)})}onDeleteTile(t){const{entityId:e}=t.detail;if(!this.tilesConfig||!e)return;const i={...this.tilesConfig};i.tiles_left=i.tiles_left.map(r=>r&&r.entity_id===e?null:r),i.tiles_right=i.tiles_right.map(r=>r&&r.entity_id===e?null:r),this.tilesConfig=i;const n=je(i);this.tilesLeft=n.left,this.tilesRight=n.right,$r(i),this.subscribeTileEntities()}onTileSaved(t){const{index:e,side:i,config:n}=t.detail;if(!this.tilesConfig)return;const r={...this.tilesConfig},a=i==="left"?[...r.tiles_left]:[...r.tiles_right];if(e>=0&&e<a.length)a[e]=n;else{const l=a.findIndex(c=>c===null);l>=0?a[l]=n:a.push(n)}i==="left"?r.tiles_left=a:r.tiles_right=a,this.tilesConfig=r;const s=je(r);this.tilesLeft=s.left,this.tilesRight=s.right,$r(r),this.subscribeTileEntities()}onTileDialogClose(){this.tileDialogOpen=!1,this.editingTileConfig=null,this.editingTileIndex=-1}render(){var e;if(this.loading)return d`<div class="loading"><div class="spinner"></div><span>Načítání...</span></div>`;if(this.error)return d`
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
          .tabs=${cp}
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
              ${this.boilerLoading?d`
                <div class="tab-loading-overlay">
                  <div class="spinner spinner--small"></div>
                  <span>Načítání bojleru...</span>
                </div>
              `:O}

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
    `}};R.styles=P`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      font-family: ${_t(o.fontFamily)};
      color: ${_t(o.textPrimary)};
      background: ${_t(o.bgPrimary)};
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
      color: ${_t(o.textSecondary)};
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid ${_t(o.divider)};
      border-top-color: ${_t(o.accent)};
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
      color: ${_t(o.error)};
      text-align: center;
      animation: fadeIn 0.3s ease;
    }

    .error h2 {
      margin-bottom: 8px;
    }

    .error button {
      margin-top: 12px;
      padding: 8px 16px;
      background: ${_t(o.accent)};
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
      background: ${_t(o.bgSecondary)};
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
      background: ${_t(o.cardBg)};
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      font-size: 12px;
      color: ${_t(o.textSecondary)};
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
  `;W([h({type:Object})],R.prototype,"hass",2);W([x()],R.prototype,"loading",2);W([x()],R.prototype,"error",2);W([x()],R.prototype,"activeTab",2);W([x()],R.prototype,"editMode",2);W([x()],R.prototype,"time",2);W([x()],R.prototype,"leftPanelCollapsed",2);W([x()],R.prototype,"rightPanelCollapsed",2);W([x()],R.prototype,"flowData",2);W([x()],R.prototype,"pricingData",2);W([x()],R.prototype,"pricingLoading",2);W([x()],R.prototype,"boilerState",2);W([x()],R.prototype,"boilerLoading",2);W([x()],R.prototype,"boilerPlan",2);W([x()],R.prototype,"boilerEnergyBreakdown",2);W([x()],R.prototype,"boilerPredictedUsage",2);W([x()],R.prototype,"boilerConfig",2);W([x()],R.prototype,"boilerHeatmap7x24",2);W([x()],R.prototype,"boilerProfiling",2);W([x()],R.prototype,"boilerCurrentCategory",2);W([x()],R.prototype,"boilerAvailableCategories",2);W([x()],R.prototype,"boilerForecastWindows",2);W([x()],R.prototype,"analyticsData",2);W([x()],R.prototype,"chmuData",2);W([x()],R.prototype,"chmuModalOpen",2);W([x()],R.prototype,"timelineTab",2);W([x()],R.prototype,"timelineData",2);W([x()],R.prototype,"tilesConfig",2);W([x()],R.prototype,"tilesLeft",2);W([x()],R.prototype,"tilesRight",2);W([x()],R.prototype,"tileDialogOpen",2);W([x()],R.prototype,"editingTileIndex",2);W([x()],R.prototype,"editingTileSide",2);W([x()],R.prototype,"editingTileConfig",2);R=W([D("oig-app")],R);v.info("V2 starting",{version:"2.0.0-beta.1"});Ms();async function dp(){try{const t=await Ts(),e=document.getElementById("app");e&&(e.innerHTML="",e.appendChild(t)),v.info("V2 mounted successfully")}catch(t){v.error("V2 bootstrap failed",t);const e=document.getElementById("app");e&&(e.innerHTML=`
        <div style="padding: 20px; font-family: system-ui;">
          <h2>Chyba načítání</h2>
          <p>Nepodařilo se načíst dashboard. Zkuste obnovit stránku.</p>
          <details>
            <summary>Detaily</summary>
            <pre>${t.message}</pre>
          </details>
        </div>`)}}dp();
//# sourceMappingURL=index.js.map
