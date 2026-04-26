var ms=Object.defineProperty;var bs=(e,t,i)=>t in e?ms(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var k=(e,t,i)=>bs(e,typeof t!="symbol"?t+"":t,i);import{f as ys,u as vs,i as D,a as S,b as d,r as K,w as Te,A as E,E as xs}from"./vendor.js";import{C as Xi,a as Gr,L as Ur,P as Zr,b as Kr,i as Qr,p as Xr,c as Jr,d as ws,T as $s,e as _s,B as ks,f as Ss,g as Cs,h as Ps,j as Ts,k as ea}from"./charts.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function i(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(r){if(r.ep)return;r.ep=!0;const a=i(r);fetch(r.href,a)}})();const Ze="[V2]";function Ds(){return new Date().toISOString().substr(11,12)}function wi(e,t){const i=Ds(),n=e.toUpperCase().padEnd(5);return`${i} ${n} ${t}`}const v={debug(e,t){typeof window<"u"&&window.OIG_DEBUG&&console.debug(Ze,wi("debug",e),t??"")},info(e,t){console.info(Ze,wi("info",e),t??"")},warn(e,t){console.warn(Ze,wi("warn",e),t??"")},error(e,t,i){const n=t?{error:t.message,stack:t.stack,...i}:i;console.error(Ze,wi("error",e),n??"")},time(e){console.time(`${Ze} ${e}`)},timeEnd(e){console.timeEnd(`${Ze} ${e}`)},group(e){console.group(`${Ze} ${e}`)},groupEnd(){console.groupEnd()}};function Ms(){window.addEventListener("error",Os),window.addEventListener("unhandledrejection",Es),v.debug("Error handling setup complete")}function Os(e){const t=e.error||new Error(e.message);v.error("Uncaught error",t,{filename:e.filename,lineno:e.lineno,colno:e.colno}),e.preventDefault()}function Es(e){const t=e.reason instanceof Error?e.reason:new Error(String(e.reason));v.error("Unhandled promise rejection",t),e.preventDefault()}class ta extends Error{constructor(t,i,n=!1,r){super(t),this.code=i,this.recoverable=n,this.cause=r,this.name="AppError"}}class Bt extends ta{constructor(t="Authentication failed"){super(t,"AUTH_ERROR",!1),this.name="AuthError"}}class sr extends ta{constructor(t="Network error",i){super(t,"NETWORK_ERROR",!0,i),this.name="NetworkError"}}const zs="oig_v2_";function Ls(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"";return/Home Assistant|HomeAssistant|HAcompanion/i.test(t)}catch{return!1}}function As(){var e;try{const t=((e=globalThis.navigator)==null?void 0:e.userAgent)||"",i=/Android|iPhone|iPad|iPod|Mobile/i.test(t),n=globalThis.innerWidth<=768;return i||n}catch{return!1}}const ve={isHaApp:!1,isMobile:!1,reduceMotion:!1};async function Is(){var i,n;v.info("Bootstrap starting"),Ms(),ve.isHaApp=Ls(),ve.isMobile=As(),ve.reduceMotion=ve.isHaApp||ve.isMobile||((n=(i=globalThis.matchMedia)==null?void 0:i.call(globalThis,"(prefers-reduced-motion: reduce)"))==null?void 0:n.matches)||!1;const e=document.documentElement;ve.isHaApp&&e.classList.add("oig-ha-app"),ve.isMobile&&e.classList.add("oig-mobile"),ve.reduceMotion&&e.classList.add("oig-reduce-motion");const t={version:"2.0.0-beta.1",storagePrefix:zs};return v.info("Bootstrap complete",{...t,isHaApp:ve.isHaApp,isMobile:ve.isMobile,reduceMotion:ve.reduceMotion}),document.createElement("oig-app")}const o={bgPrimary:"var(--primary-background-color, #ffffff)",bgSecondary:"var(--secondary-background-color, #f5f5f5)",textPrimary:"var(--primary-text-color, #212121)",textSecondary:"var(--secondary-text-color, #757575)",accent:"var(--accent-color, #03a9f4)",divider:"var(--divider-color, #e0e0e0)",error:"var(--error-color, #db4437)",success:"var(--success-color, #0f9d58)",warning:"var(--warning-color, #f4b400)",cardBg:"var(--card-background-color, #ffffff)",cardShadow:"var(--shadow-elevation-2dp_-_box-shadow, 0 2px 2px 0 rgba(0,0,0,0.14))",fontFamily:"var(--primary-font-family, system-ui, sans-serif)"},or={"--primary-background-color":"#111936","--secondary-background-color":"#1a2044","--primary-text-color":"#e1e1e1","--secondary-text-color":"rgba(255,255,255,0.7)","--accent-color":"#03a9f4","--divider-color":"rgba(255,255,255,0.12)","--error-color":"#ef5350","--success-color":"#66bb6a","--warning-color":"#ffa726","--card-background-color":"rgba(255,255,255,0.06)","--shadow-elevation-2dp_-_box-shadow":"0 2px 4px 0 rgba(0,0,0,0.4)"},lr={"--primary-background-color":"#ffffff","--secondary-background-color":"#f5f5f5","--primary-text-color":"#212121","--secondary-text-color":"#757575","--accent-color":"#03a9f4","--divider-color":"#e0e0e0","--error-color":"#db4437","--success-color":"#0f9d58","--warning-color":"#f4b400","--card-background-color":"#ffffff","--shadow-elevation-2dp_-_box-shadow":"0 2px 2px 0 rgba(0,0,0,0.14)"};function un(){var e,t;try{if(window.parent&&window.parent!==window){const i=(t=(e=window.parent.document)==null?void 0:e.querySelector("home-assistant"))==null?void 0:t.hass;if(i!=null&&i.themes){if(typeof i.themes.darkMode=="boolean")return i.themes.darkMode;const n=(i.themes.theme||"").toLowerCase();if(n.includes("dark"))return!0;if(n.includes("light"))return!1}}}catch{}return window.matchMedia("(prefers-color-scheme: dark)").matches}function pn(e){const t=e?or:lr,i=document.documentElement;for(const[n,r]of Object.entries(t))i.style.setProperty(n,r);i.classList.toggle("dark",e),document.body.style.background=e?or["--secondary-background-color"]:lr["--secondary-background-color"]}function Bs(){const e=un();pn(e),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{const i=un();pn(i)}),setInterval(()=>{const i=un(),n=document.documentElement.classList.contains("dark");i!==n&&pn(i)},5e3)}const cr={mobile:768,tablet:1024};function yt(e){return e<cr.mobile?"mobile":e<cr.tablet?"tablet":"desktop"}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const C=e=>(t,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Fs={attribute:!0,type:String,converter:vs,reflect:!1,hasChanged:ys},Ns=(e=Fs,t,i)=>{const{kind:n,metadata:r}=i;let a=globalThis.litPropertyMetadata.get(r);if(a===void 0&&globalThis.litPropertyMetadata.set(r,a=new Map),n==="setter"&&((e=Object.create(e)).wrapped=!0),a.set(i.name,e),n==="accessor"){const{name:s}=i;return{set(l){const c=t.get.call(this);t.set.call(this,l),this.requestUpdate(s,c,e,!0,l)},init(l){return l!==void 0&&this.C(s,void 0,e,l),l}}}if(n==="setter"){const{name:s}=i;return function(l){const c=this[s];t.call(this,l),this.requestUpdate(s,c,e,!0,l)}}throw Error("Unsupported decorator location: "+n)};function h(e){return(t,i)=>typeof i=="object"?Ns(e,t,i):((n,r,a)=>{const s=r.hasOwnProperty(a);return r.constructor.createProperty(a,n),s?Object.getOwnPropertyDescriptor(r,a):void 0})(e,t,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function x(e){return h({...e,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Rs=(e,t,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof t!="object"&&Object.defineProperty(e,t,i),i);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Ji(e,t){return(i,n,r)=>{const a=s=>{var l;return((l=s.renderRoot)==null?void 0:l.querySelector(e))??null};return Rs(i,n,{get(){return a(this)}})}}class Hs{constructor(){this.callbacks=new Set,this.watched=new Set,this.watchedPrefixes=new Set,this.unsub=null,this.running=!1,this.getHass=null,this.activeConnection=null}registerEntities(t){for(const i of t)typeof i=="string"&&i.length>0&&this.watched.add(i)}registerPrefix(t){var n;if(typeof t!="string"||t.length===0)return;this.watchedPrefixes.add(t);const i=(n=this.getHass)==null?void 0:n.call(this);if(i!=null&&i.states){const r=Object.keys(i.states).filter(a=>a.startsWith(t));this.registerEntities(r)}}onEntityChange(t){return this.callbacks.add(t),()=>{this.callbacks.delete(t)}}async start(t){this.getHass=t.getHass;const i=this.getHass();if(!(i!=null&&i.connection)){v.debug("StateWatcher: hass not ready, retrying in 500ms"),setTimeout(()=>this.start(t),500);return}if(this.running&&this.activeConnection===i.connection){const r=t.prefixes??[];for(const a of r)this.registerPrefix(a);return}this.running&&this.stop(),this.running=!0,this.activeConnection=i.connection;const n=t.prefixes??[];for(const r of n)this.registerPrefix(r);try{this.unsub=await i.connection.subscribeEvents(r=>this.handleStateChanged(r),"state_changed"),v.info("StateWatcher started",{prefixes:n,watchedCount:this.watched.size})}catch(r){this.running=!1,this.activeConnection=null,v.error("StateWatcher failed to subscribe",r)}}stop(){if(this.running=!1,this.activeConnection=null,this.unsub)try{this.unsub()}catch{}this.unsub=null,v.info("StateWatcher stopped")}isWatched(t){return this.matchesWatched(t)}destroy(){this.stop(),this.callbacks.clear(),this.watched.clear(),this.watchedPrefixes.clear(),this.getHass=null}matchesWatched(t){if(this.watched.has(t))return!0;for(const i of this.watchedPrefixes)if(t.startsWith(i))return!0;return!1}handleStateChanged(t){var r;const i=(r=t==null?void 0:t.data)==null?void 0:r.entity_id;if(!i||!this.matchesWatched(i))return;const n=t.data.new_state;for(const a of this.callbacks)try{a(i,n)}catch{}}}const it=new Hs;class Vs{constructor(t,i=""){this.subscriptions=new Map,this.cache=new Map,this.stateWatcherUnsub=null,this.hass=t,this.inverterSn=i,this.init()}init(){var t;if((t=this.hass)!=null&&t.states)for(const[i,n]of Object.entries(this.hass.states))this.cache.set(i,n);this.stateWatcherUnsub=it.onEntityChange((i,n)=>{n?this.cache.set(i,n):this.cache.delete(i),this.notifySubscribers(i,n)}),v.debug("EntityStore initialized",{entities:this.cache.size,inverterSn:this.inverterSn})}getSensorId(t){return`sensor.oig_${this.inverterSn}_${t}`}findSensorId(t){const i=this.getSensorId(t);for(const n of this.cache.keys()){if(n===i)return n;if(n.startsWith(i+"_")){const r=n.substring(i.length+1);if(/^\d+$/.test(r))return n}}return i}subscribe(t,i){this.subscriptions.has(t)||this.subscriptions.set(t,new Set),this.subscriptions.get(t).add(i),it.registerEntities([t]);const n=this.cache.get(t)??null;return i(n),()=>{var r,a;(r=this.subscriptions.get(t))==null||r.delete(i),((a=this.subscriptions.get(t))==null?void 0:a.size)===0&&this.subscriptions.delete(t)}}getNumeric(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"&&parseFloat(i.state)||0,lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:0,lastUpdated:null,attributes:{},exists:!1}}getString(t){const i=this.cache.get(t);return i?{value:i.state!=="unavailable"&&i.state!=="unknown"?i.state:"",lastUpdated:i.last_updated?new Date(i.last_updated):null,attributes:i.attributes??{},exists:!0}:{value:"",lastUpdated:null,attributes:{},exists:!1}}get(t){return this.cache.get(t)??null}getAll(){return Object.fromEntries(this.cache)}batchLoad(t){const i={};for(const n of t)i[n]=this.getNumeric(n);return i}updateHass(t){if(this.hass=t,t!=null&&t.states){const i=new Set(Object.keys(t.states));for(const n of Array.from(this.cache.keys()))i.has(n)||(this.cache.delete(n),this.notifySubscribers(n,null));for(const[n,r]of Object.entries(t.states)){const a=this.cache.get(n),s=r;this.cache.set(n,s),((a==null?void 0:a.state)!==s.state||(a==null?void 0:a.last_updated)!==s.last_updated)&&this.notifySubscribers(n,s)}}}notifySubscribers(t,i){const n=this.subscriptions.get(t);if(n)for(const r of n)try{r(i)}catch(a){v.error("Entity callback error",a,{entityId:t})}}destroy(){var t;(t=this.stateWatcherUnsub)==null||t.call(this),this.subscriptions.clear(),this.cache.clear(),v.debug("EntityStore destroyed")}}let Zt=null;function js(e,t){return Zt&&Zt.destroy(),Zt=new Vs(e,t),Zt}function Be(){return Zt}const Ws=3,qs=1e3;class Ys{constructor(){this.hass=null,this.initPromise=null}async getHass(){return this.hass?this.hass:this.initPromise?this.initPromise:(this.initPromise=this.initHass(),this.initPromise)}getHassSync(){return this.hass}async refreshHass(){const t=await this.findHass();return t?(this.hass=t,v.info("HASS client refreshed"),t):this.hass}async initHass(){v.debug("Initializing HASS client");const t=await this.findHass();return t?(this.hass=t,v.info("HASS client initialized"),t):(v.warn("HASS not found in parent context"),null)}async findHass(){var t,i;if(typeof window>"u")return null;if(window.hass)return window.hass;if(window.parent&&window.parent!==window)try{const n=(i=(t=window.parent.document)==null?void 0:t.querySelector("home-assistant"))==null?void 0:i.hass;if(n)return n}catch{v.debug("Cannot access parent HASS (cross-origin)")}return window.customPanel?window.customPanel.hass:null}async fetchWithAuth(t,i={}){var s,l;const n=await this.getHass();if(!n)throw new Bt("Cannot get HASS context");try{const u=new URL(t,window.location.href).hostname;if(u!=="localhost"&&u!=="127.0.0.1"&&!t.startsWith("/api/"))throw new Error(`fetchWithAuth rejected for non-localhost URL: ${t}`)}catch(c){if(c.message.includes("rejected"))throw c}const r=(l=(s=n.auth)==null?void 0:s.data)==null?void 0:l.access_token;if(!r)throw new Bt("No access token available");const a=new Headers(i.headers);return a.set("Authorization",`Bearer ${r}`),a.has("Content-Type")||a.set("Content-Type","application/json"),this.fetchWithRetry(t,{...i,headers:a})}async fetchWithRetry(t,i,n=Ws){try{const r=await fetch(t,i);if(!r.ok)throw r.status===401?new Bt("Token expired or invalid"):new sr(`HTTP ${r.status}: ${r.statusText}`);return r}catch(r){if(n>0&&r instanceof sr)return v.warn(`Retrying fetch (${n} left)`,{url:t}),await this.delay(qs),this.fetchWithRetry(t,i,n-1);throw r}}async callApi(t,i,n){const r=await this.getHass();if(!r)throw new Bt("Cannot get HASS context");return r.callApi(t,i,n)}async callService(t,i,n){const r=await this.getHass();if(!(r!=null&&r.callService))return v.error("Cannot call service — hass not available"),!1;try{return await r.callService(t,i,n),!0}catch(a){return v.error(`Service call failed (${t}.${i})`,a),!1}}async callWS(t){const i=await this.getHass();if(!(i!=null&&i.callWS))throw new Bt("Cannot get HASS context for WS call");return i.callWS(t)}async fetchOIGAPI(t,i={}){try{const n=`/api/oig_cloud${t.startsWith("/")?"":"/"}${t}`;return await(await this.fetchWithAuth(n,{...i,headers:{"Content-Type":"application/json",...Object.fromEntries(new Headers(i.headers).entries())}})).json()}catch(n){return v.error(`OIG API fetch error for ${t}`,n),null}}async loadBatteryTimeline(t,i="active"){return this.fetchOIGAPI(`/battery_forecast/${t}/timeline?type=${i}`)}async loadUnifiedCostTile(t){return this.fetchOIGAPI(`/battery_forecast/${t}/unified_cost_tile`)}async loadSpotPrices(t){return this.fetchOIGAPI(`/spot_prices/${t}/intervals`)}async loadAnalytics(t){return this.fetchOIGAPI(`/analytics/${t}`)}async loadPlannerSettings(t){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`)}async savePlannerSettings(t,i){return this.fetchOIGAPI(`/battery_forecast/${t}/planner_settings`,{method:"POST",body:JSON.stringify(i)})}async loadDetailTabs(t,i,n="hybrid"){return this.fetchOIGAPI(`/battery_forecast/${t}/detail_tabs?tab=${i}&plan=${n}`)}async loadModules(t){return this.fetchOIGAPI(`/${t}/modules`)}openEntityDialog(t){var i;try{const n=((i=window.parent.document)==null?void 0:i.querySelector("home-assistant"))??document.querySelector("home-assistant");if(!n)return v.warn("Cannot open entity dialog — home-assistant element not found"),!1;const r=new CustomEvent("hass-more-info",{bubbles:!0,composed:!0,detail:{entityId:t}});return n.dispatchEvent(r),!0}catch(n){return v.error("Cannot open entity dialog",n),!1}}async showNotification(t,i,n="success"){await this.callService("persistent_notification","create",{title:t,message:i,notification_id:`oig_dashboard_${Date.now()}`})||console.log(`[${n.toUpperCase()}] ${t}: ${i}`)}getToken(){var t,i,n;return((n=(i=(t=this.hass)==null?void 0:t.auth)==null?void 0:i.data)==null?void 0:n.access_token)??null}delay(t){return new Promise(i=>setTimeout(i,t))}}const J=new Ys,dr={solar:"#ffd54f",battery:"#4caf50",inverter:"#9575cd",grid:"#42a5f5",house:"#f06292"},Ft={solar:"linear-gradient(135deg, rgba(255,213,79,0.15) 0%, rgba(255,179,0,0.08) 100%)",battery:"linear-gradient(135deg, rgba(76,175,80,0.15) 0%, rgba(56,142,60,0.08) 100%)",grid:"linear-gradient(135deg, rgba(66,165,245,0.15) 0%, rgba(33,150,243,0.08) 100%)",house:"linear-gradient(135deg, rgba(240,98,146,0.15) 0%, rgba(233,30,99,0.08) 100%)",inverter:"linear-gradient(135deg, rgba(149,117,205,0.15) 0%, rgba(126,87,194,0.08) 100%)"},Nt={solar:"rgba(255,213,79,0.4)",battery:"rgba(76,175,80,0.4)",grid:"rgba(66,165,245,0.4)",house:"rgba(240,98,146,0.4)",inverter:"rgba(149,117,205,0.4)"},ht={solar:"#ffd54f",battery:"#ff9800",grid_import:"#f44336",grid_export:"#4caf50",house:"#f06292"},$i={solar:5400,battery:7e3,grid:17e3,house:1e4},In={solarPower:0,solarP1:0,solarP2:0,solarV1:0,solarV2:0,solarI1:0,solarI2:0,solarPercent:0,solarToday:0,solarForecastToday:0,solarForecastTomorrow:0,batterySoC:0,batteryPower:0,batteryVoltage:0,batteryCurrent:0,batteryTemp:0,batteryChargeTotal:0,batteryDischargeTotal:0,batteryChargeSolar:0,batteryChargeGrid:0,isGridCharging:!1,timeToEmpty:"",timeToFull:"",balancingState:"standby",balancingTimeRemaining:"",gridChargingPlan:{hasBlocks:!1,totalEnergyKwh:0,totalCostCzk:0,windowLabel:null,durationMinutes:0,currentBlockLabel:null,nextBlockLabel:null,blocks:[]},gridPower:0,gridVoltage:0,gridFrequency:0,gridImportToday:0,gridExportToday:0,gridL1V:0,gridL2V:0,gridL3V:0,gridL1P:0,gridL2P:0,gridL3P:0,spotPrice:0,exportPrice:0,currentTariff:"",housePower:0,houseTodayWh:0,houseL1:0,houseL2:0,houseL3:0,inverterMode:"",inverterGridMode:"unknown",inverterGridLimit:0,inverterTemp:0,bypassStatus:"off",notificationsUnread:0,notificationsError:0,boilerIsUse:!1,boilerPower:0,boilerDayEnergy:0,boilerManualMode:"",boilerInstallPower:3e3,plannerAutoMode:null,lastUpdate:""},ia={home_1:"Home 1",home_2:"Home 2",home_3:"Home 3",home_ups:"Home UPS"},ur={"Home 1":"home_1","Home 2":"home_2","Home 3":"home_3","Home UPS":"home_ups","Mode 0":"home_1","Mode 1":"home_2","Mode 2":"home_3","Mode 3":"home_ups","HOME I":"home_1","HOME II":"home_2","HOME III":"home_3","HOME UPS":"home_ups",0:"home_1",1:"home_2",2:"home_3",3:"home_ups"},Kt={off:"Vypnuto",on:"Zapnuto",limited:"S omezením"},hn={Vypnuto:"off",Zapnuto:"on",Omezeno:"limited",omezeno:"limited",vypnuto:"off",zapnuto:"on",Off:"off",On:"on",Limited:"limited",off:"off",on:"on",limited:"limited",0:"off",1:"on",2:"limited"},Gs={off:"🚫",on:"💧",limited:"🚰"},na={cbb:"Inteligentní",manual:"Manuální"},ra={cbb:"🤖",manual:"👤"},pr={CBB:"cbb",Manuální:"manual",Manual:"manual",Inteligentní:"cbb"},Us={set_box_mode:"🏠 Změna režimu boxu",set_grid_delivery:"💧 Změna nastavení přetoků",set_grid_delivery_limit:"🔢 Změna limitu přetoků",set_boiler_mode:"🔥 Změna nastavení bojleru",set_formating_mode:"🔋 Změna nabíjení baterie",set_battery_capacity:"⚡ Změna kapacity baterie"},Zs={CBB:"Inteligentní",Manual:"Manuální",Manuální:"Manuální"},aa={0:"Žádný",1:"Home 5",2:"Home 6",3:"Home 5 + Home 6",4:"Flexibilita"},sa={status:"idle",activity:"",queueCount:0,runningRequests:[],queuedRequests:[],allRequests:[],currentBoxMode:"home_1",currentGridDelivery:"off",currentGridLimit:0,currentBoilerMode:"cbb",pendingServices:new Map,changingServices:new Set,gridDeliveryState:{currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},supplementary:{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1}},Ks="probíhá změna";function wn(e){return e.trim().toLowerCase().includes(Ks)}function Bn(e){const t=e.trim();if(t in hn)return hn[t];const i=t.toLowerCase(),n=Object.entries(hn).find(([r])=>r.toLowerCase()===i);return n?n[1]:i.startsWith("omez")||i.includes("limit")?"limited":i.startsWith("zapn")||i==="on"?"on":i.startsWith("vypn")||i==="off"?"off":"unknown"}function Qs(e){const t=e.get("grid_mode");if(!t)return null;const i=Bn(t);return i==="unknown"?null:i}function Xs(e){const t=e.get("grid_limit");if(!t)return null;const i=parseInt(t,10);return Number.isFinite(i)&&i>=0?i:null}function Js(e){return e.changingServices.has("grid_mode")||e.changingServices.has("grid_limit")}function oa(e,t){const{gridModeRaw:i,gridLimit:n}=e,r=i.trim().toLowerCase(),a=r==="unavailable"||r==="unknown"||r==="",s=wn(i),l=Js(t),c=s||l;let u;a||s?u="unknown":u=Bn(i);let p=null;!a&&Number.isFinite(n)&&n>=0&&(p=n);const f=Qs(t.pendingServices),y=Xs(t.pendingServices);return{currentLiveDelivery:u,currentLiveLimit:p,pendingDeliveryTarget:f,pendingLimitTarget:y,isTransitioning:c,isUnavailable:a}}function eo(e){return e.isTransitioning&&e.pendingDeliveryTarget?e.pendingDeliveryTarget:e.currentLiveDelivery}const hr=new URLSearchParams(window.location.search),Fn=hr.get("sn")||hr.get("inverter_sn")||"";function Ti(e,t=Fn){return`sensor.oig_${t}_${e}`}function gr(e,t,i=Fn){var a;const n=Ti(t,i);return n in e?n:((a=Object.keys(e).filter(s=>s.startsWith(n+"_")).map(s=>({id:s,suffix:parseInt(s.substring(n.length+1),10)})).filter(s=>Number.isFinite(s.suffix)).sort((s,l)=>s.suffix-l.suffix)[0])==null?void 0:a.id)??null}function F(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function Oe(e){return!(e!=null&&e.state)||e.state==="unknown"||e.state==="unavailable"?"":e.state}function fr(e,t="on"){if(!(e!=null&&e.state))return!1;const i=e.state.toLowerCase();return i===t||i==="1"||i==="zapnuto"}function to(e){const t=(e||"").toLowerCase();return t==="charging"?"charging":t==="balancing"||t==="holding"?"holding":t==="completed"?"completed":t==="planned"?"planned":"standby"}function $n(e){return e==="tomorrow"?"zítra":e==="today"?"dnes":""}function mr(e){if(!e)return null;const[t,i]=e.split(":").map(Number);return!Number.isFinite(t)||!Number.isFinite(i)?null:t*60+i}function io(e){const t=Number(e.grid_import_kwh??e.grid_charge_kwh??0);if(Number.isFinite(t)&&t>0)return t;const i=Number(e.battery_start_kwh??0),n=Number(e.battery_end_kwh??0);return Number.isFinite(i)&&Number.isFinite(n)?Math.max(0,n-i):0}function la(e=[]){return[...e].sort((t,i)=>{const n=(t.day==="tomorrow"?1:0)-(i.day==="tomorrow"?1:0);return n!==0?n:(t.time_from||"").localeCompare(i.time_from||"")})}function no(e){if(!Array.isArray(e)||e.length===0)return null;const t=la(e),i=t[0],n=t.at(-1),r=$n(i==null?void 0:i.day),a=$n(n==null?void 0:n.day);if(r===a){const y=r?`${r} `:"";return!(i!=null&&i.time_from)||!(n!=null&&n.time_to)?y.trim()||null:`${y}${i.time_from} – ${n.time_to}`}const s=r?`${r} `:"",l=a?`${a} `:"",c=(i==null?void 0:i.time_from)||"--",u=(n==null?void 0:n.time_to)||"--",p=i?`${s}${c}`:"--",f=n?`${l}${u}`:"--";return`${p} → ${f}`}function ro(e){if(!Array.isArray(e)||e.length===0)return 0;let t=0;return e.forEach(i=>{const n=mr(i.time_from),r=mr(i.time_to);if(n===null||r===null)return;const a=r-n;a>0&&(t+=a)}),t}function br(e){const t=$n(e.day),i=t?`${t} `:"",n=e.time_from||"--",r=e.time_to||"--";return`${i}${n} - ${r}`}function ao(e){const t=e.find(r=>{const a=(r.status||"").toLowerCase();return a==="running"||a==="active"})||null,i=t?e[e.indexOf(t)+1]||null:e[0]||null;return{runningBlock:t,upcomingBlock:i,shouldShowNext:!!(i&&(!t||i!==t))}}function so(e){const t=(e==null?void 0:e.attributes)||{},i=Array.isArray(t.charging_blocks)?t.charging_blocks:[],n=la(i),r=Number(t.total_energy_kwh)||0,a=r>0?r:n.reduce((b,g)=>b+io(g),0),s=Number(t.total_cost_czk)||0,l=s>0?s:n.reduce((b,g)=>b+Number(g.total_cost_czk||0),0),c=no(n),u=ro(n),{runningBlock:p,upcomingBlock:f,shouldShowNext:y}=ao(n);return{hasBlocks:n.length>0,totalEnergyKwh:a,totalCostCzk:l,windowLabel:c,durationMinutes:u,currentBlockLabel:p?br(p):null,nextBlockLabel:y&&f?br(f):null,blocks:n}}function oo(e,t=Fn){var er,tr,ir,nr,rr,ar;const i=(e==null?void 0:e.states)||e||{},n=fs=>i[Ti(fs,t)]||null,r=F(n("actual_fv_p1")),a=F(n("actual_fv_p2")),s=F(n("extended_fve_voltage_1")),l=F(n("extended_fve_voltage_2")),c=F(n("extended_fve_current_1")),u=F(n("extended_fve_current_2")),p=n("solar_forecast"),f=(er=p==null?void 0:p.attributes)!=null&&er.today_total_kwh?parseFloat(p.attributes.today_total_kwh)||0:(tr=p==null?void 0:p.attributes)!=null&&tr.today_total_sum_kw?parseFloat(p.attributes.today_total_sum_kw)||0:F(p),y=(ir=p==null?void 0:p.attributes)!=null&&ir.tomorrow_total_sum_kw?parseFloat(p.attributes.tomorrow_total_sum_kw)||0:(nr=p==null?void 0:p.attributes)!=null&&nr.total_tomorrow_kwh&&parseFloat(p.attributes.total_tomorrow_kwh)||0,b=F(n("batt_bat_c")),g=F(n("batt_batt_comp_p")),m=F(n("extended_battery_voltage")),$=F(n("extended_battery_current")),P=F(n("extended_battery_temperature")),_=F(n("computed_batt_charge_energy_today")),T=F(n("computed_batt_discharge_energy_today")),G=F(n("computed_batt_charge_fve_energy_today")),Q=F(n("computed_batt_charge_grid_energy_today")),w=n("grid_charging_planned"),q=fr(w),z=Oe(n("time_to_empty")),B=Oe(n("time_to_full")),V=n("battery_balancing"),Y=to((rr=V==null?void 0:V.attributes)==null?void 0:rr.current_state),R=Oe({state:(ar=V==null?void 0:V.attributes)==null?void 0:ar.time_remaining}),we=so(w),Ye=F(n("actual_aci_wtotal")),sn=F(n("extended_grid_voltage")),on=F(n("ac_in_aci_f")),Se=F(n("ac_in_ac_ad")),At=F(n("ac_in_ac_pd")),It=F(n("ac_in_aci_vr")),ye=F(n("ac_in_aci_vs")),Xn=F(n("ac_in_aci_vt")),Ge=F(n("actual_aci_wr")),Ue=F(n("actual_aci_ws")),Va=F(n("actual_aci_wt")),ja=F(n("spot_price_current_15min")),Wa=F(n("export_price_current_15min")),qa=Oe(n("current_tariff")),Ya=F(n("actual_aco_p")),Ga=F(n("ac_out_en_day")),Ua=F(n("ac_out_aco_pr")),Za=F(n("ac_out_aco_ps")),Ka=F(n("ac_out_aco_pt")),Qa=Oe(n("box_prms_mode")),Xa=gr(i,"invertor_prms_to_grid",t)||Ti("invertor_prms_to_grid",t),Ja=gr(i,"invertor_prm1_p_max_feed_grid",t)||Ti("invertor_prm1_p_max_feed_grid",t),ln=i[Xa],cn=i[Ja],es=(ln==null?void 0:ln.state)??"",ts=parseFloat((cn==null?void 0:cn.state)??"")||0,Jn=oa({gridModeRaw:es,gridLimit:ts},{pendingServices:new Map,changingServices:new Set}),is=Jn.currentLiveDelivery,ns=Jn.currentLiveLimit??0,rs=F(n("box_temp")),as=Oe(n("bypass_status"))||"off",ss=F(n("notification_count_unread")),os=F(n("notification_count_error")),dn=n("boiler_is_use"),ls=dn?fr(dn)||Oe(dn)==="Zapnuto":!1,cs=F(n("boiler_current_cbb_w")),ds=F(n("boiler_day_w")),us=Oe(n("boiler_manual_mode")),ps=F(n("boiler_install_power"))||3e3,hs=n("real_data_update"),gs=Oe(hs);return{solarPower:r+a,solarP1:r,solarP2:a,solarV1:s,solarV2:l,solarI1:c,solarI2:u,solarPercent:F(n("dc_in_fv_proc")),solarToday:F(n("dc_in_fv_ad")),solarForecastToday:f,solarForecastTomorrow:y,batterySoC:b,batteryPower:g,batteryVoltage:m,batteryCurrent:$,batteryTemp:P,batteryChargeTotal:_,batteryDischargeTotal:T,batteryChargeSolar:G,batteryChargeGrid:Q,isGridCharging:q,timeToEmpty:z,timeToFull:B,balancingState:Y,balancingTimeRemaining:R,gridChargingPlan:we,gridPower:Ye,gridVoltage:sn,gridFrequency:on,gridImportToday:Se,gridExportToday:At,gridL1V:It,gridL2V:ye,gridL3V:Xn,gridL1P:Ge,gridL2P:Ue,gridL3P:Va,spotPrice:ja,exportPrice:Wa,currentTariff:qa,housePower:Ya,houseTodayWh:Ga,houseL1:Ua,houseL2:Za,houseL3:Ka,inverterMode:Qa,inverterGridMode:is,inverterGridLimit:ns,inverterTemp:rs,bypassStatus:as,notificationsUnread:ss,notificationsError:os,boilerIsUse:ls,boilerPower:cs,boilerDayEnergy:ds,boilerManualMode:us,boilerInstallPower:ps,plannerAutoMode:null,lastUpdate:gs}}const Rt={};function _i(e,t,i){const n=Math.abs(e),r=Math.min(100,n/t*100),a=Math.max(500,Math.round(3500-r*30));let s=a;return i&&Rt[i]!==void 0&&(s=Math.round(.3*a+(1-.3)*Rt[i]),Math.abs(s-Rt[i])<100&&(s=Rt[i])),i&&(Rt[i]=s),{active:n>=50,intensity:r,count:Math.max(1,Math.min(4,Math.ceil(1+r/33))),speed:s,size:Math.round(6+r/10),opacity:Math.min(1,.3+r/150)}}function Ht(e){return Math.abs(e)>=1e3?`${(e/1e3).toFixed(1)} kW`:`${Math.round(e)} W`}function Ke(e){return e>=1e3?`${(e/1e3).toFixed(2)} kWh`:`${Math.round(e)} Wh`}function lo(e){return e==="VT"||e.includes("vysoký")?"⚡ VT":e==="NT"||e.includes("nízký")?"🌙 NT":e?`⏰ ${e}`:"--"}function co(e){return e.includes("Home 1")?{icon:"🏠",text:"Home 1"}:e.includes("Home 2")?{icon:"🔋",text:"Home 2"}:e.includes("Home 3")?{icon:"☀️",text:"Home 3"}:e.includes("UPS")?{icon:"⚡",text:"Home UPS"}:{icon:"⚙️",text:e||"--"}}function uo(e){return e==="off"?{display:"Vypnuto",icon:"🚫"}:e==="on"?{display:"Zapnuto",icon:"💧"}:e==="limited"?{display:"Omezeno",icon:"🚰"}:{display:"--",icon:"💧"}}const po={"HOME I":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"HOME II":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"HOME III":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"rgba(158, 158, 158, 0.18)",label:"DO NOTHING"},"Mode 0":{icon:"🏠",color:"rgba(76, 175, 80, 0.16)",label:"HOME I"},"Mode 1":{icon:"⚡",color:"rgba(33, 150, 243, 0.16)",label:"HOME II"},"Mode 2":{icon:"🔋",color:"rgba(156, 39, 176, 0.16)",label:"HOME III"},"Mode 3":{icon:"🛡️",color:"rgba(255, 152, 0, 0.18)",label:"HOME UPS"}},yr={timeline:[],labels:[],prices:[],exportPrices:[],modeSegments:[],cheapestBuyBlock:null,expensiveBuyBlock:null,bestExportBlock:null,worstExportBlock:null,solar:null,battery:null,initialZoomStart:null,initialZoomEnd:null,currentSpotPrice:0,currentExportPrice:0,avgSpotPrice:0,plannedConsumption:null,whatIf:null,solarForecastTotal:0},vr=new URLSearchParams(window.location.search),_n=vr.get("sn")||vr.get("inverter_sn")||"";function wt(e){return`sensor.oig_${_n}_${e}`}function xr(e){if(!(e!=null&&e.state))return 0;const t=parseFloat(e.state);return isNaN(t)?0:t}function kn(e){const t=e.getFullYear(),i=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0"),r=String(e.getHours()).padStart(2,"0"),a=String(e.getMinutes()).padStart(2,"0"),s=String(e.getSeconds()).padStart(2,"0");return`${t}-${i}-${n}T${r}:${a}:${s}`}const Di={},ho=5*60*1e3;async function go(e="hybrid"){const t=Di[e];if(t&&Date.now()-t.ts<ho)return v.debug("Timeline cache hit",{plan:e,age:Math.round((Date.now()-t.ts)/1e3)}),t.data;try{const i=await J.getHass();if(!i)return[];let n;i.callApi?n=await i.callApi("GET",`oig_cloud/battery_forecast/${_n}/timeline?type=active`):n=await J.fetchOIGAPI(`battery_forecast/${_n}/timeline?type=active`);const r=(n==null?void 0:n.active)||(n==null?void 0:n.timeline)||[];return Di[e]={data:r,ts:Date.now()},v.info("Timeline fetched",{plan:e,points:r.length}),r}catch(i){return v.error("Failed to fetch timeline",i),[]}}function fo(e){Object.keys(Di).forEach(t=>delete Di[t])}function mo(e){const t=new Date,i=new Date(t);return i.setMinutes(Math.floor(t.getMinutes()/15)*15,0,0),e.filter(n=>new Date(n.timestamp)>=i)}function bo(e){return e.map(t=>{if(!t.timestamp)return new Date;try{const[i,n]=t.timestamp.split("T");if(!i||!n)return new Date;const[r,a,s]=i.split("-").map(Number),[l,c,u=0]=n.split(":").map(Number);return new Date(r,a-1,s,l,c,u)}catch{return new Date}})}function yo(e){const t=e.mode_name||e.mode_planned||e.mode||e.mode_display||null;if(!t||typeof t!="string")return null;const i=t.trim();return i.length?i:null}function vo(e){return e.startsWith("HOME ")?e.replace("HOME ","").trim():e==="FULL HOME UPS"||e==="HOME UPS"?"UPS":e==="DO NOTHING"?"DN":e.substring(0,3).toUpperCase()}function xo(e){return po[e]||{icon:"❓",color:"rgba(158, 158, 158, 0.15)",label:e}}function wo(e){if(!e.length)return[];const t=[];let i=null;for(const n of e){const r=yo(n);if(!r){i=null;continue}const a=new Date(n.timestamp),s=new Date(a.getTime()+15*60*1e3);if(i!==null&&i.mode===r)i.end=s;else{const l={mode:r,start:a,end:s};t.push(l),i=l}}return t.map(n=>{const r=xo(n.mode);return{...n,icon:r.icon,color:r.color,label:r.label,shortLabel:vo(n.mode)}})}function ki(e,t,i=3){const n=Math.floor(i*60/15);if(e.length<n)return null;let r=null,a=t?1/0:-1/0;for(let s=0;s<=e.length-n;s++){const l=e.slice(s,s+n),c=l.map(p=>p.price),u=c.reduce((p,f)=>p+f,0)/c.length;(t&&u<a||!t&&u>a)&&(a=u,r={start:l[0].timestamp,end:l[l.length-1].timestamp,avg:u,min:Math.min(...c),max:Math.max(...c),values:c,type:"cheapest-buy"})}return r}function $o(e,t){const n=((e==null?void 0:e.states)||{})[wt("solar_forecast")];if(!(n!=null&&n.attributes)||!t.length)return null;const r=n.attributes,a=r.today_total_kwh||0,s=r.today_hourly_string1_kw||{},l=r.tomorrow_hourly_string1_kw||{},c=r.today_hourly_string2_kw||{},u=r.tomorrow_hourly_string2_kw||{},p={...s,...l},f={...c,...u},y=(m,$,P)=>m==null||$==null?m||$||0:m+($-m)*P,b=[],g=[];for(const m of t){const $=m.getHours(),P=m.getMinutes(),_=new Date(m);_.setMinutes(0,0,0);const T=kn(_),G=new Date(_);G.setHours($+1);const Q=kn(G),w=p[T]||0,q=p[Q]||0,z=f[T]||0,B=f[Q]||0,V=P/60;b.push(y(w,q,V)),g.push(y(z,B,V))}return{string1:b,string2:g,todayTotal:a,hasString1:b.some(m=>m>0),hasString2:g.some(m=>m>0)}}function _o(e,t){if(!e.length)return{arrays:{baseline:[],solarCharge:[],gridCharge:[],gridNet:[],consumption:[]},initialZoomStart:null,initialZoomEnd:null};const i=e.map(f=>new Date(f.timestamp)),n=i[0].getTime(),r=i[i.length-1],a=r?r.getTime():n,s=[],l=[],c=[],u=[],p=[];for(const f of t){const y=kn(f),b=e.find(g=>g.timestamp===y);if(b){const g=(b.battery_capacity_kwh??b.battery_soc??b.battery_start)||0,m=b.solar_charge_kwh||0,$=b.grid_charge_kwh||0,P=typeof b.grid_net=="number"?b.grid_net:(b.grid_import||0)-(b.grid_export||0),_=b.load_kwh??b.consumption_kwh??b.load??0,T=(Number(_)||0)*4;s.push(g-m-$),l.push(m),c.push($),u.push(P),p.push(T)}else s.push(null),l.push(null),c.push(null),u.push(null),p.push(null)}return{arrays:{baseline:s,solarCharge:l,gridCharge:c,gridNet:u,consumption:p},initialZoomStart:n,initialZoomEnd:a}}function ko(e){const t=(e==null?void 0:e.states)||{},i=t[wt("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const n=i.attributes,r=n.planned_consumption_today??null,a=n.planned_consumption_tomorrow??null,s=n.profile_today||"Žádný profil",l=t[wt("ac_out_en_day")],c=l==null?void 0:l.state,p=(c&&c!=="unavailable"&&parseFloat(c)||0)/1e3,f=p+(r||0),y=(r||0)+(a||0);let b=null;if(f>0&&a!=null){const m=a-f,$=m/f*100;Math.abs($)<5?b="Zítra podobně":m>0?b=`Zítra více (+${Math.abs($).toFixed(0)}%)`:b=`Zítra méně (-${Math.abs($).toFixed(0)}%)`}return{todayConsumedKwh:p,todayPlannedKwh:r,todayTotalKwh:f,tomorrowKwh:a,totalPlannedKwh:y,profile:s!=="Žádný profil"&&s!=="Neznámý profil"?s:"Žádný profil",trendText:b}}function So(e){const i=((e==null?void 0:e.states)||{})[wt("battery_forecast")];if(!(i!=null&&i.attributes)||i.state==="unavailable"||i.state==="unknown")return null;const r=i.attributes.mode_optimization||{},a=r.alternatives||{},s=r.total_cost_czk||0,l=r.total_savings_vs_home_i_czk||0,c=a["DO NOTHING"],u=(c==null?void 0:c.current_mode)||null;return{totalCost:s,totalSavings:l,alternatives:a,activeMode:u}}async function Co(e,t="hybrid"){const i=performance.now();v.info("[Pricing] loadPricingData START");try{const n=await go(t),r=mo(n);if(!r.length)return v.warn("[Pricing] No timeline data"),yr;const a=r.map(R=>({timestamp:R.timestamp,price:R.spot_price_czk||0})),s=r.map(R=>({timestamp:R.timestamp,price:R.export_price_czk||0}));let l=bo(a);const c=wo(r),u=ki(a,!0,3);u&&(u.type="cheapest-buy");const p=ki(a,!1,3);p&&(p.type="expensive-buy");const f=ki(s,!1,3);f&&(f.type="best-export");const y=ki(s,!0,3);y&&(y.type="worst-export");const b=r.map(R=>new Date(R.timestamp)),g=new Set([...l,...b].map(R=>R.getTime()));l=Array.from(g).sort((R,we)=>R-we).map(R=>new Date(R));const{arrays:m,initialZoomStart:$,initialZoomEnd:P}=_o(r,l),_=$o(e,l),T=(e==null?void 0:e.states)||{},G=xr(T[wt("spot_price_current_15min")]),Q=xr(T[wt("export_price_current_15min")]),w=a.length>0?a.reduce((R,we)=>R+we.price,0)/a.length:0,q=ko(e),z=So(e),B=(_==null?void 0:_.todayTotal)||0,V={timeline:r,labels:l,prices:a,exportPrices:s,modeSegments:c,cheapestBuyBlock:u,expensiveBuyBlock:p,bestExportBlock:f,worstExportBlock:y,solar:_,battery:m,initialZoomStart:$,initialZoomEnd:P,currentSpotPrice:G,currentExportPrice:Q,avgSpotPrice:w,plannedConsumption:q,whatIf:z,solarForecastTotal:B},Y=(performance.now()-i).toFixed(0);return v.info(`[Pricing] loadPricingData COMPLETE in ${Y}ms`,{points:r.length,segments:c.length}),V}catch(n){return v.error("[Pricing] loadPricingData failed",n),yr}}const Po=120,wr={workday_spring:"Pracovní den - Jaro",workday_summer:"Pracovní den - Léto",workday_autumn:"Pracovní den - Podzim",workday_winter:"Pracovní den - Zima",weekend_spring:"Víkend - Jaro",weekend_summer:"Víkend - Léto",weekend_autumn:"Víkend - Podzim",weekend_winter:"Víkend - Zima"},To={fve:"FVE",grid:"Síť",alternative:"Alternativa"},Sn=new URLSearchParams(window.location.search),Cn=Sn.get("sn")||Sn.get("inverter_sn")||"",$r=Sn.get("entry_id")||"";function Do(e,t,i){return isNaN(e)?t:Math.max(t,Math.min(i,e))}function Mo(e,t,i){if(e==null)return null;const n=t-i;if(n<=0)return null;const r=(e-i)/n*100;return Do(r,0,100)}function Mi(e){if(!e)return"--:--";const t=e instanceof Date?e:new Date(e);return isNaN(t.getTime())?"--:--":t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})}function _r(e){if(!e)return"--";const t=new Date(e);return isNaN(t.getTime())?"--":t.toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}function Pn(e,t){return`${Mi(e)}–${Mi(t)}`}function kr(e){return To[e||""]||e||"--"}function ca(e){return e?Object.values(e).reduce((t,i)=>t+(parseFloat(String(i))||0),0):0}function da(e){return e?Object.entries(e).map(([i,n])=>({hour:parseInt(i,10),value:parseFloat(String(n))||0})).filter(i=>isFinite(i.value)).sort((i,n)=>n.value-i.value).slice(0,3).filter(i=>i.value>0).map(i=>i.hour).sort((i,n)=>i-n):[]}function Vt(e){if(!e)return null;const t=e.split(":").map(i=>parseInt(i,10));return t.length<2||!isFinite(t[0])||!isFinite(t[1])?null:t[0]*60+t[1]}function Sr(e,t,i){return t===null||i===null?!1:t<=i?e>=t&&e<i:e>=t||e<i}async function Oo(){var e,t,i,n,r;try{if(!$r||!Cn)return v.warn("[Boiler] No entry_id or inverter_sn — cannot fetch boiler canonical"),{profileData:null,planData:null,canonical:null};const a=await J.fetchOIGAPI(`/boiler/${$r}/${Cn}`);if(!a)return{profileData:null,planData:null,canonical:null};const s={state:{current_temp:((e=a.current_state.temperatures)==null?void 0:e.upper_zone)??((t=a.current_state.temperatures)==null?void 0:t.top),target_temp:void 0,heating:a.current_state.heating,temperatures:a.current_state.temperatures,energy_state:a.current_state.energy_state,recommended_source:a.selected_source||a.current_state.recommended_source||void 0,circulation_recommended:!1},slots:a.plan_slots.map(l=>({start:l.start,end:l.end,consumption_kwh:l.consumption_kwh,avg_consumption_kwh:l.consumption_kwh,recommended_source:l.recommended_source,spot_price:l.spot_price??void 0})),total_consumption_kwh:a.plan_slots.reduce((l,c)=>l+(c.consumption_kwh||0),0),fve_kwh:((i=a.current_state.energy_tracking)==null?void 0:i.fve_kwh)??0,grid_kwh:((n=a.current_state.energy_tracking)==null?void 0:n.grid_kwh)??0,alt_kwh:((r=a.current_state.energy_tracking)==null?void 0:r.alt_kwh)??0,next_slot:a.plan_slots[0]||void 0,profiles:{}};return{profileData:s,planData:s,canonical:a}}catch(a){return v.warn("[Boiler] Failed to fetch canonical",{err:a}),{profileData:null,planData:null,canonical:null}}}function Eo(e,t,i){const n=e||t,r=n==null?void 0:n.state,a=(r==null?void 0:r.temperatures)||{},s=(r==null?void 0:r.energy_state)||{},l=isFinite(a.upper_zone??a.top)?a.upper_zone??a.top??null:null,c=isFinite(a.lower_zone??a.bottom)?a.lower_zone??a.bottom??null:null,u=isFinite(s.avg_temp)?s.avg_temp??null:null,p=isFinite(s.energy_needed_kwh)?s.energy_needed_kwh??null:null,f=i.targetTempC??60,y=i.coldInletTempC??10,b=Mo(u,f,y),g=(e==null?void 0:e.slots)||[],m=(e==null?void 0:e.next_slot)||zo(g);let $="Neplánováno";if(m){const _=kr(m.recommended_source);$=`${Pn(m.start,m.end)} (${_})`}const P=kr((r==null?void 0:r.recommended_source)||(m==null?void 0:m.recommended_source));return{currentTemp:isFinite(r==null?void 0:r.current_temp)?(r==null?void 0:r.current_temp)??null:null,targetTemp:(r==null?void 0:r.target_temp)||f,heating:(r==null?void 0:r.heating)||!1,tempTop:l,tempBottom:c,avgTemp:u,heatingPercent:b,energyNeeded:p,planCost:(e==null?void 0:e.estimated_cost_czk)??null,nextHeating:$,recommendedSource:P,nextProfile:(r==null?void 0:r.next_profile)||"",nextStart:(r==null?void 0:r.next_start)||""}}function zo(e){if(!Array.isArray(e))return null;const t=Date.now();return e.find(i=>{const n=new Date(i.end||i.end_time||"").getTime(),r=i.consumption_kwh??i.avg_consumption_kwh??0;return n>t&&r>0})||null}function Lo(e){var y,b,g;if(!((y=e==null?void 0:e.slots)!=null&&y.length))return null;const t=e.slots.map(m=>({start:m.start||"",end:m.end||"",consumptionKwh:m.consumption_kwh??m.avg_consumption_kwh??0,recommendedSource:m.recommended_source||"",spotPrice:isFinite(m.spot_price)?m.spot_price??null:null,tempTop:m.temp_top,soc:m.soc})),i=t.filter(m=>m.consumptionKwh>0),n=parseFloat(String(e.total_consumption_kwh))||0,r=parseFloat(String(e.fve_kwh))||0,a=parseFloat(String(e.grid_kwh))||0,s=parseFloat(String(e.alt_kwh))||0,l=parseFloat(String(e.estimated_cost_czk))||0;let c="Mix: --";if(n>0){const m=Math.round(r/n*100),$=Math.round(a/n*100),P=Math.round(s/n*100);c=`Mix: FVE ${m}% · Síť ${$}% · Alt ${P}%`}const u=t.filter(m=>m.consumptionKwh>0&&m.spotPrice!==null).map(m=>({slot:m,price:m.spotPrice}));let p="--",f="--";if(u.length){const m=u.reduce((P,_)=>_.price<P.price?_:P),$=u.reduce((P,_)=>_.price>P.price?_:P);p=`${Pn(m.slot.start,m.slot.end)} (${m.price.toFixed(2)} Kč/kWh)`,f=`${Pn($.slot.start,$.slot.end)} (${$.price.toFixed(2)} Kč/kWh)`}return{slots:t,totalConsumptionKwh:n,fveKwh:r,gridKwh:a,altKwh:s,estimatedCostCzk:l,nextSlot:e.next_slot?{start:e.next_slot.start||"",end:e.next_slot.end||"",consumptionKwh:e.next_slot.consumption_kwh||0,recommendedSource:e.next_slot.recommended_source||"",spotPrice:e.next_slot.spot_price??null}:null,planStart:_r((b=e.slots[0])==null?void 0:b.start),planEnd:_r((g=e.slots[e.slots.length-1])==null?void 0:g.end),sourceDigest:c,activeSlotCount:i.length,cheapestSpot:p,mostExpensiveSpot:f}}function Ao(e){const t=parseFloat(String(e==null?void 0:e.fve_kwh))||0,i=parseFloat(String(e==null?void 0:e.grid_kwh))||0,n=parseFloat(String(e==null?void 0:e.alt_kwh))||0,r=t+i+n;return{fveKwh:t,gridKwh:i,altKwh:n,fvePercent:r>0?t/r*100:0,gridPercent:r>0?i/r*100:0,altPercent:r>0?n/r*100:0}}function Io(e,t,i){var y;const n=(e==null?void 0:e.summary)||{},r=(y=e==null?void 0:e.profiles)==null?void 0:y[i],a=(r==null?void 0:r.hourly_avg)||{},s=n.predicted_total_kwh??ca(a),l=n.peak_hours??da(a),c=isFinite(n.water_liters_40c)?n.water_liters_40c??null:null,u=n.circulation_windows||[],p=u.length?u.map(b=>`${b.start}–${b.end}`).join(", "):"--";let f="--";if(u.length){const b=new Date,g=b.getHours()*60+b.getMinutes();if(u.some($=>{const P=Vt($.start),_=Vt($.end);return Sr(g,P,_)})){const $=u.find(P=>{const _=Vt(P.start),T=Vt(P.end);return Sr(g,_,T)});f=$?`ANO (do ${$.end})`:"ANO"}else{const $=t==null?void 0:t.state,P=$==null?void 0:$.circulation_recommended;let _=1/0,T=null;for(const G of u){const Q=Vt(G.start);if(Q===null)continue;let w=Q-g;w<0&&(w+=24*60),w<_&&(_=w,T=G)}P&&T?f=`DOPORUČENO (${T.start}–${T.end})`:T?f=`Ne (další ${T.start}–${T.end})`:f="Ne"}}return{predictedTodayKwh:s,peakHours:l,waterLiters40c:c,circulationWindows:p,circulationNow:f}}function Bo(e){const t=(e==null?void 0:e.config)||{},i=isFinite(t.volume_l)?t.volume_l??null:null;return{volumeL:i,heaterPowerW:null,targetTempC:isFinite(t.target_temp_c)?t.target_temp_c??null:null,deadlineTime:t.deadline_time||"--:--",stratificationMode:t.stratification_mode||"--",kCoefficient:i?(i*.001163).toFixed(4):"--",coldInletTempC:isFinite(t.cold_inlet_temp_c)?t.cold_inlet_temp_c??10:10}}function Fo(e){return e!=null&&e.profiles?Object.entries(e.profiles).map(([t,i])=>({id:t,name:i.name||t,targetTemp:i.target_temp||55,startTime:i.start_time||"06:00",endTime:i.end_time||"22:00",days:i.days||[1,1,1,1,1,0,0],enabled:i.enabled!==!1})):[]}function No(e){var n;const t=[],i=((n=e==null?void 0:e.summary)==null?void 0:n.today_hours)||[];for(let r=0;r<24;r++){const a=i.includes(r);t.push({hour:r,temp:a?55:25,heating:a})}return t}function Ro(e,t){var s;const i=(s=e==null?void 0:e.profiles)==null?void 0:s[t],n=["Po","Út","St","Čt","Pá","So","Ne"];if(!i)return n.map(l=>({day:l,hours:Array(24).fill(0)}));const r=i.heatmap||[];let a=[];if(r.length>0)a=r.map(l=>l.map(c=>c&&typeof c=="object"?parseFloat(c.consumption)||0:parseFloat(String(c))||0));else{const l=i.hourly_avg||{};a=Array.from({length:7},()=>Array.from({length:24},(c,u)=>parseFloat(String(l[u]||0))))}return n.map((l,c)=>({day:l,hours:a[c]||Array(24).fill(0)}))}function Ho(e,t){var u;const i=(u=e==null?void 0:e.profiles)==null?void 0:u[t],n=(e==null?void 0:e.summary)||{},r=(i==null?void 0:i.hourly_avg)||{},a=Array.from({length:24},(p,f)=>parseFloat(String(r[f]||0))),s=n.predicted_total_kwh??ca(r),l=n.peak_hours??da(r),c=isFinite(n.avg_confidence)?n.avg_confidence??null:null;return{hourlyAvg:a,peakHours:l,predictedTotalKwh:s,confidence:c,daysTracked:7}}function Vo(e,t){var p,f,y;if(!((p=e==null?void 0:e.slots)!=null&&p.length)||!(t!=null&&t.length))return{fve:"--",grid:"--"};const i=(f=e.slots[0])==null?void 0:f.start,n=(y=e.slots[e.slots.length-1])==null?void 0:y.end,r=i?new Date(i).getTime():null,a=n?new Date(n).getTime():null,s=t.filter(b=>{if(!r||!a)return!0;const g=b.timestamp||b.time;if(!g)return!1;const m=new Date(g).getTime();return m>=r&&m<=a}),l=b=>{const g=[];let m=null;for(const $ of s){const P=$.timestamp||$.time;if(!P)continue;const _=new Date(P),T=b($);T&&!m?m={start:_,end:_}:T&&m?m.end=_:!T&&m&&(g.push(m),m=null)}return m&&g.push(m),g.length?g.map($=>`${Mi($.start)}–${Mi(new Date($.end.getTime()+15*6e4))}`).join(", "):"--"},c=l(b=>(parseFloat(b.solar_kwh??b.solar_charge_kwh??0)||0)>0),u=l(b=>(parseFloat(b.grid_charge_kwh??0)||0)>0);return{fve:c,grid:u}}async function jo(){return v.info("[Boiler] Planning heating..."),await J.callService("oig_cloud","plan_boiler_heating",{})}async function Wo(){return v.info("[Boiler] Applying plan..."),await J.callService("oig_cloud","apply_boiler_plan",{})}async function qo(){return v.info("[Boiler] Canceling plan..."),await J.callService("oig_cloud","cancel_boiler_plan",{})}function Yo(e){var y,b,g;const t={entryId:null,boxId:null,available:!1};if(!e)return{status:null,planSlots:[],explanation:null,manualOverride:null,identity:t,loading:!1,loadError:"Nepodařilo se načíst data bojleru"};const i=e.current_state,n=i.temperatures??{},r=isFinite(n.top)?n.top??null:isFinite(n.upper_zone)?n.upper_zone??null:null,a=isFinite(n.bottom)?n.bottom??null:isFinite(n.lower_zone)?n.lower_zone??null:null,s={currentState:i.heating?"heating":"idle",comfortSatisfied:e.comfort_status.comfort_satisfied,comfortStatusCode:e.comfort_status.comfort_status_code,selectedSource:e.selected_source,actuatedSource:e.actuated_source,temperatureTop:r,temperatureBottom:a,energyNeededKwh:isFinite((y=i.energy_state)==null?void 0:y.energy_needed_kwh)?((b=i.energy_state)==null?void 0:b.energy_needed_kwh)??null:null,heating:i.heating,lastUpdate:i.last_update??null,degraded:e.degraded_flags.degraded,degradedFlags:e.degraded_flags.flags??[]},l=(e.plan_slots??[]).map(m=>({start:m.start,end:m.end,consumptionKwh:m.consumption_kwh,confidence:m.confidence,recommendedSource:m.recommended_source,spotPrice:isFinite(m.spot_price)?m.spot_price??null:null,altPrice:isFinite(m.alt_price)?m.alt_price??null:null,overflowAvailable:m.overflow_available})),c=e.freshness??{},u={reasonCodes:e.reason_codes??[],planCreatedAt:c.plan_created_at??null,planValidUntil:c.plan_valid_until??null,dataAgeSecs:isFinite(c.data_age_seconds)?c.data_age_seconds??null:null,degradedReasons:e.degraded_flags.flags??[],unsatisfiedComfortGapC:e.comfort_status.unsatisfied_comfort_gap_c??null,temperatureAtDeadlineC:e.comfort_status.temperature_at_deadline_c??null},p={active:((g=e.manual_override)==null?void 0:g.active)??!1,ttlMinutes:Po,reason:"",capabilityAvailable:e.manual_override!=null},f={entryId:e.entry_id,boxId:e.box_id,available:!!(e.entry_id&&e.box_id)};return{status:s,planSlots:l,explanation:u,manualOverride:p,identity:f,loading:!1,loadError:null}}async function Go(e){const{profileData:t,planData:i,canonical:n}=await Oo();let r=null;try{const c=await J.loadBatteryTimeline(Cn,"active");r=(c==null?void 0:c.active)||c||null,Array.isArray(r)&&r.length===0&&(r=null)}catch{}const a=(t==null?void 0:t.current_category)||Object.keys((t==null?void 0:t.profiles)||{})[0]||"workday_summer",s=Object.keys((t==null?void 0:t.profiles)||{}),l=Bo(t);return{state:Eo(i,t,l),plan:Lo(i),energyBreakdown:Ao(i),predictedUsage:Io(t,i,a),config:l,profiles:Fo(t||i),heatmap:No(i||t),heatmap7x24:Ro(t,a),profiling:Ho(t,a),currentCategory:a,availableCategories:s,forecastWindows:Vo(i,r),v2Data:Yo(n)}}const Cr={efficiency:null,health:null,balancing:null,costComparison:null};function ua(e){const t=Be();if(!t)return null;const i=t.findSensorId("battery_efficiency"),n=t.get(i);if(!n)return v.debug("Battery efficiency sensor not found"),null;const r=n.attributes||{},a=r.efficiency_last_month_pct!=null?{efficiency:Number(r.efficiency_last_month_pct??0),charged:Number(r.last_month_charge_kwh??0),discharged:Number(r.last_month_discharge_kwh??0),losses:Number(r.losses_last_month_kwh??0)}:null,s=r.efficiency_current_month_pct!=null?{efficiency:Number(r.efficiency_current_month_pct??0),charged:Number(r.current_month_charge_kwh??0),discharged:Number(r.current_month_discharge_kwh??0),losses:Number(r.losses_current_month_kwh??0)}:null,l=a??s;if(!l)return null;const c=a?"last_month":"current_month",u=a&&s?s.efficiency-a.efficiency:0;return{efficiency:l.efficiency,charged:l.charged,discharged:l.discharged,losses:l.losses,lossesPct:r[c==="last_month"?"losses_last_month_pct":"losses_current_month_pct"]??0,trend:u,period:c,currentMonthDays:r.current_month_days??0,lastMonth:a,currentMonth:s}}function pa(e){const t=Be();if(!t)return null;const i=t.findSensorId("battery_health"),n=t.get(i);if(!n)return v.debug("Battery health sensor not found"),null;const r=parseFloat(n.state)||0,a=n.attributes||{};let s,l;return r>=95?(s="excellent",l="Vynikající"):r>=90?(s="good",l="Dobrý"):r>=80?(s="fair",l="Uspokojivý"):(s="poor",l="Špatný"),{soh:r,capacity:a.capacity_p80_last_20??a.current_capacity_kwh??0,nominalCapacity:a.current_capacity_kwh??0,minCapacity:a.capacity_p20_last_20??0,measurementCount:a.measurement_count??0,lastAnalysis:a.last_analysis??"",qualityScore:a.quality_score??null,sohMethod:a.soh_selection_method??null,sohMethodDescription:a.soh_method_description??null,measurementHistory:Array.isArray(a.measurement_history)?a.measurement_history:[],degradation3m:a.degradation_3_months_percent??null,degradation6m:a.degradation_6_months_percent??null,degradation12m:a.degradation_12_months_percent??null,degradationPerYear:a.degradation_per_year_percent??null,estimatedEolDate:a.estimated_eol_date??null,yearsTo80Pct:a.years_to_80pct??null,trendConfidence:a.trend_confidence??null,status:s,statusLabel:l}}function Pr(e,t,i){if(!e||!t)return{daysRemaining:null,progressPercent:null,intervalDays:i||null};try{const n=new Date(e),r=new Date(t),a=new Date;if(isNaN(n.getTime())||isNaN(r.getTime()))return{daysRemaining:null,progressPercent:null,intervalDays:i||null};const s=r.getTime()-n.getTime(),l=a.getTime()-n.getTime(),c=Math.max(0,Math.round((r.getTime()-a.getTime())/(1e3*60*60*24))),u=s>0?Math.min(100,Math.max(0,Math.round(l/s*100))):null,p=i||Math.round(s/(1e3*60*60*24));return{daysRemaining:c,progressPercent:u,intervalDays:p||null}}catch{return{daysRemaining:null,progressPercent:null,intervalDays:i||null}}}function ha(e){const t=Be();if(!t)return null;const i=t.findSensorId("battery_balancing"),n=t.get(i);if(!n){const c=t.get(t.findSensorId("battery_health")),u=c==null?void 0:c.attributes;if(u!=null&&u.balancing_status){const p=String(u.last_balancing??""),f=u.next_balancing?String(u.next_balancing):null,y=Pr(p,f,Number(u.balancing_interval_days??0));return{status:String(u.balancing_status??"unknown"),lastBalancing:p,cost:Number(u.balancing_cost??0),nextScheduled:f,...y,estimatedNextCost:u.estimated_next_cost!=null?Number(u.estimated_next_cost):null}}return null}const r=n.attributes||{},a=String(r.last_balancing??""),s=r.next_scheduled?String(r.next_scheduled):null,l=Pr(a,s,Number(r.interval_days??0));return{status:n.state||"unknown",lastBalancing:a,cost:Number(r.cost??0),nextScheduled:s,...l,estimatedNextCost:r.estimated_next_cost!=null?Number(r.estimated_next_cost):null}}async function Uo(e){var t,i;try{const n=await J.loadUnifiedCostTile(e);if(!n)return null;const r=n.hybrid??n,a=r.today??{},s=Math.round((a.actual_cost_so_far??a.actual_total_cost??0)*100)/100,l=a.future_plan_cost??0,c=a.plan_total_cost??s+l,u=((t=r.tomorrow)==null?void 0:t.plan_total_cost)??null;let p=null,f=null,y=null,b=null;try{const g=await J.loadBatteryTimeline(e,"active"),m=(i=g==null?void 0:g.timeline_extended)==null?void 0:i.yesterday;m!=null&&m.summary&&(p=m.summary.planned_total_cost??null,f=m.summary.actual_total_cost??null,y=m.summary.delta_cost??null,b=m.summary.accuracy_pct??null)}catch{v.debug("Yesterday analysis not available")}return{activePlan:"hybrid",actualSpent:s,planTotalCost:c,futurePlanCost:l,tomorrowCost:u,yesterdayPlannedCost:p,yesterdayActualCost:f,yesterdayDelta:y,yesterdayAccuracy:b}}catch(n){return v.error("Failed to fetch cost comparison",n),null}}async function Zo(e){const t=ua(),i=pa(),n=ha(),r=await Uo(e);return{efficiency:t,health:i,balancing:n,costComparison:r}}function Ko(e){return{efficiency:ua(),health:pa(),balancing:ha()}}const Jt={severity:0,warningsCount:0,eventType:"",description:"",instruction:"",onset:"",expires:"",etaHours:0,allWarnings:[],effectiveSeverity:0},Qo={vítr:"💨",déšť:"🌧️",sníh:"❄️",bouřky:"⛈️",mráz:"🥶",vedro:"🥵",mlha:"🌫️",náledí:"🧊",laviny:"🏔️"};function ga(e){const t=e.toLowerCase();for(const[i,n]of Object.entries(Qo))if(t.includes(i))return n;return"⚠️"}const fa={0:"Bez výstrahy",1:"Nízká",2:"Zvýšená",3:"Vysoká",4:"Extrémní"},Oi={0:"#4CAF50",1:"#8BC34A",2:"#FF9800",3:"#f44336",4:"#9C27B0"};function Xo(e){const t=Be();if(!t)return Jt;const i=`sensor.oig_${e}_chmu_warning_level`,n=t.get(i);if(!n)return v.debug("ČHMÚ sensor not found",{entityId:i}),Jt;const r=parseInt(n.state,10)||0,a=n.attributes||{},s=Number(a.warnings_count??0),l=String(a.event_type??""),c=String(a.description??""),u=String(a.instruction??""),p=String(a.onset??""),f=String(a.expires??""),y=Number(a.eta_hours??0),b=a.all_warnings_details??[],g=Array.isArray(b)?b.map(P=>({event_type:P.event_type??P.event??"",severity:P.severity??r,description:P.description??"",instruction:P.instruction??"",onset:P.onset??"",expires:P.expires??"",eta_hours:P.eta_hours??0})):[],m=l.toLowerCase().includes("žádná výstraha");return{severity:r,warningsCount:s,eventType:l,description:c,instruction:u,onset:p,expires:f,etaHours:y,allWarnings:g,effectiveSeverity:s===0||m?0:r}}const ma={"HOME I":{icon:"🏠",color:"#4CAF50",label:"HOME I"},"HOME II":{icon:"⚡",color:"#2196F3",label:"HOME II"},"HOME III":{icon:"🔋",color:"#9C27B0",label:"HOME III"},"HOME UPS":{icon:"🛡️",color:"#FF9800",label:"HOME UPS"},"FULL HOME UPS":{icon:"🛡️",color:"#FF9800",label:"FULL HOME UPS"},"DO NOTHING":{icon:"⏸️",color:"#9E9E9E",label:"DO NOTHING"}},ba={yesterday:"📊 Včera",today:"📆 Dnes",tomorrow:"📅 Zítra",history:"📈 Historie",detail:"💎 Detail"};function Tr(e){return{modeHistorical:e.mode_historical??e.mode??"",modePlanned:e.mode_planned??"",modeMatch:e.mode_match??!1,status:e.status??"planned",startTime:e.start_time??"",endTime:e.end_time??"",durationHours:e.duration_hours??0,costHistorical:e.cost_historical??null,costPlanned:e.cost_planned??null,costDelta:e.cost_delta??null,solarKwh:e.solar_total_kwh??0,consumptionKwh:e.consumption_total_kwh??0,gridImportKwh:e.grid_import_total_kwh??0,gridExportKwh:e.grid_export_total_kwh??0,intervalReasons:Array.isArray(e.interval_reasons)?e.interval_reasons:[]}}function Si(e){return{plan:(e==null?void 0:e.plan)??0,actual:(e==null?void 0:e.actual)??null,hasActual:(e==null?void 0:e.has_actual)??!1,unit:(e==null?void 0:e.unit)??""}}function Jo(e){const t=(e==null?void 0:e.metrics)??{};return{overallAdherence:(e==null?void 0:e.overall_adherence)??0,modeSwitches:(e==null?void 0:e.mode_switches)??0,totalCost:(e==null?void 0:e.total_cost)??0,metrics:{cost:Si(t.cost),solar:Si(t.solar),consumption:Si(t.consumption),grid:Si(t.grid)},completedSummary:e!=null&&e.completed_summary?{count:e.completed_summary.count??0,totalCost:e.completed_summary.total_cost??0,adherencePct:e.completed_summary.adherence_pct??0}:void 0,plannedSummary:e!=null&&e.planned_summary?{count:e.planned_summary.count??0,totalCost:e.planned_summary.total_cost??0}:void 0,progressPct:e==null?void 0:e.progress_pct,actualTotalCost:e==null?void 0:e.actual_total_cost,planTotalCost:e==null?void 0:e.plan_total_cost,vsPlanPct:e==null?void 0:e.vs_plan_pct,eodPrediction:e!=null&&e.eod_prediction?{predictedTotal:e.eod_prediction.predicted_total??0,predictedSavings:e.eod_prediction.predicted_savings??0}:void 0}}function el(e){return e?{date:e.date??"",modeBlocks:Array.isArray(e.mode_blocks)?e.mode_blocks.map(Tr):[],summary:Jo(e.summary),metadata:e.metadata?{activePlan:e.metadata.active_plan??"hybrid",comparisonPlanAvailable:e.metadata.comparison_plan_available}:void 0,comparison:e.comparison?{plan:e.comparison.plan??"",modeBlocks:Array.isArray(e.comparison.mode_blocks)?e.comparison.mode_blocks.map(Tr):[]}:void 0}:null}async function tl(e,t,i="hybrid"){try{const n=await J.loadDetailTabs(e,t,i);if(!n)return null;const r=n[t]??n;return el(r)}catch(n){return v.error(`Failed to load timeline tab: ${t}`,n),null}}const Tn={tiles_left:[null,null,null,null,null,null],tiles_right:[null,null,null,null,null,null],left_count:4,right_count:4,visible:!0,version:1},ya="oig_dashboard_tiles";function il(e,t){return t==="W"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kW"}:t==="Wh"&&Math.abs(e)>=1e3?{value:(e/1e3).toFixed(2),unit:"kWh"}:t==="W"||t==="Wh"?{value:Math.round(e).toString(),unit:t}:{value:e.toFixed(1),unit:t}}async function nl(){var e;try{const t=await J.callWS({type:"call_service",domain:"oig_cloud",service:"get_dashboard_tiles",service_data:{},return_response:!0}),i=(e=t==null?void 0:t.response)==null?void 0:e.config;if(i&&typeof i=="object")return v.debug("Loaded tiles config from HA"),Mr(i)}catch(t){v.debug("WS tile config load failed, trying localStorage",{error:t.message})}try{const t=localStorage.getItem(ya);if(t){const i=JSON.parse(t);return v.debug("Loaded tiles config from localStorage"),Mr(i)}}catch{v.debug("localStorage tile config load failed")}return Tn}async function Dr(e){try{return localStorage.setItem(ya,JSON.stringify(e)),await J.callService("oig_cloud","save_dashboard_tiles",{config:JSON.stringify(e)}),v.info("Tiles config saved"),!0}catch(t){return v.error("Failed to save tiles config",t),!1}}function Mr(e){return{tiles_left:Array.isArray(e.tiles_left)?e.tiles_left.slice(0,6):Tn.tiles_left,tiles_right:Array.isArray(e.tiles_right)?e.tiles_right.slice(0,6):Tn.tiles_right,left_count:typeof e.left_count=="number"?e.left_count:4,right_count:typeof e.right_count=="number"?e.right_count:4,visible:e.visible!==!1,version:e.version??1}}function gn(e){var l;const t=Be();if(!t)return{value:"--",unit:"",isActive:!1,rawValue:0};const i=t.get(e);if(!i||i.state==="unavailable"||i.state==="unknown")return{value:"--",unit:"",isActive:!1,rawValue:0};const n=i.state,r=String(((l=i.attributes)==null?void 0:l.unit_of_measurement)??""),a=parseFloat(n)||0;if(i.entity_id.startsWith("switch.")||i.entity_id.startsWith("binary_sensor."))return{value:n==="on"?"Zapnuto":"Vypnuto",unit:"",isActive:n==="on",rawValue:n==="on"?1:0};const s=il(a,r);return{value:s.value,unit:s.unit,isActive:a!==0,rawValue:a}}function jt(e){const t=(i,n)=>{var a,s;const r=[];for(let l=0;l<n;l++){const c=i[l];if(!c)continue;const u=gn(c.entity_id),p={};if((a=c.support_entities)!=null&&a.top_right){const f=gn(c.support_entities.top_right);p.topRight={value:f.value,unit:f.unit}}if((s=c.support_entities)!=null&&s.bottom_right){const f=gn(c.support_entities.bottom_right);p.bottomRight={value:f.value,unit:f.unit}}r.push({config:c,value:u.value,unit:u.unit,isActive:u.isActive,isZero:u.rawValue===0,formattedValue:u.unit?`${u.value} ${u.unit}`:u.value,supportValues:p})}return r};return{left:t(e.tiles_left,e.left_count),right:t(e.tiles_right,e.right_count)}}async function rl(e,t="toggle"){const i=e.split(".")[0];return J.callService(i,t,{entity_id:e})}function vt(e){return e==null||Number.isNaN(e)?"-- Wh":Math.abs(e)>=1e3?`${(e/1e3).toFixed(2)} kWh`:`${Math.round(e)} Wh`}function ie(e,t="CZK"){return e==null||Number.isNaN(e)?`-- ${t}`:`${e.toFixed(2)} ${t}`}function xt(e,t=0){return e==null||Number.isNaN(e)?"-- %":`${e.toFixed(t)} %`}const al={fridge:"❄️","fridge-outline":"❄️",dishwasher:"🍽️","washing-machine":"🧺","tumble-dryer":"🌪️",stove:"🔥",microwave:"📦","coffee-maker":"☕",kettle:"🫖",toaster:"🍞",lightbulb:"💡","lightbulb-outline":"💡",lamp:"🪔","ceiling-light":"💡","floor-lamp":"🪔","led-strip":"✨","led-strip-variant":"✨","wall-sconce":"💡",chandelier:"💡",thermometer:"🌡️",thermostat:"🌡️",radiator:"♨️","radiator-disabled":"❄️","heat-pump":"♨️","air-conditioner":"❄️",fan:"🌀",hvac:"♨️",fire:"🔥",snowflake:"❄️","lightning-bolt":"⚡",flash:"⚡",battery:"🔋","battery-charging":"🔋","battery-50":"🔋","solar-panel":"☀️","solar-power":"☀️","meter-electric":"⚡","power-plug":"🔌","power-socket":"🔌",car:"🚗","car-electric":"🚘","car-battery":"🔋","ev-station":"🔌","ev-plug-type2":"🔌",garage:"🏠","garage-open":"🏠",door:"🚪","door-open":"🚪",lock:"🔒","lock-open":"🔓","shield-home":"🛡️",cctv:"📹",camera:"📹","motion-sensor":"👁️","alarm-light":"🚨",bell:"🔔","window-closed":"🪟","window-open":"🪟",blinds:"🪟","blinds-open":"🪟",curtains:"🪟","roller-shade":"🪟",television:"📺",speaker:"🔊","speaker-wireless":"🔊",music:"🎵","volume-high":"🔊",cast:"📡",chromecast:"📡","router-wireless":"📡",wifi:"📶","access-point":"📡",lan:"🌐",network:"🌐","home-assistant":"🏠",water:"💧","water-percent":"💧","water-boiler":"♨️","water-pump":"💧",shower:"🚿",toilet:"🚽",faucet:"🚰",pipe:"🔧","weather-sunny":"☀️","weather-cloudy":"☁️","weather-night":"🌙","weather-rainy":"🌧️","weather-snowy":"❄️","weather-windy":"💨",information:"ℹ️","help-circle":"❓","alert-circle":"⚠️","checkbox-marked-circle":"✅","toggle-switch":"🔘",power:"⚡",sync:"🔄"};function Ei(e){const t=e.replace(/^mdi:/,"");return al[t]||"⚙️"}function fn(e,t){let i=!1;return(...n)=>{i||(e(...n),i=!0,setTimeout(()=>i=!1,t))}}async function Wt(e,t=3,i=1e3){let n;for(let r=0;r<=t;r++)try{return await e()}catch(a){if(n=a,a instanceof Error&&(a.message.includes("401")||a.message.includes("403")))throw a;if(r<t){const s=Math.min(i*Math.pow(2,r),5e3);await new Promise(l=>setTimeout(l,s))}}throw n}class sl{constructor(){this.state={...sa,pendingServices:new Map,changingServices:new Set},this.listeners=new Set,this.watcherUnsub=null,this.queueUpdateInterval=null,this.started=!1}start(){this.started||(this.started=!0,this.watcherUnsub=it.onEntityChange((t,i)=>{t&&this.shouldRefreshShield(t)&&this.refresh()}),this.refresh(),this.queueUpdateInterval=window.setInterval(()=>{this.state.allRequests.length>0&&this.notify()},1e3),v.debug("ShieldController started"))}stop(){var t;(t=this.watcherUnsub)==null||t.call(this),this.watcherUnsub=null,this.queueUpdateInterval!==null&&(clearInterval(this.queueUpdateInterval),this.queueUpdateInterval=null),this.started=!1,v.debug("ShieldController stopped")}subscribe(t){return this.listeners.add(t),t(this.state),()=>this.listeners.delete(t)}getState(){return this.state}shouldRefreshShield(t){return["service_shield_","box_prms_mode","box_mode_extended","box_prm2_app","boiler_manual_mode","invertor_prms_to_grid","invertor_prm1_p_max_feed_grid"].some(n=>t.includes(n))}readSupplementaryState(t){const i=t.findSensorId("box_mode_extended"),n=t.get(i);if(!n||n.state==="unavailable"||n.state==="unknown"||n.state==="")return{home_grid_v:!1,home_grid_vi:!1,flexibilita:!1,available:!1};const r=n.attributes??{};return{home_grid_v:r.home_grid_v===!0,home_grid_vi:r.home_grid_vi===!0,flexibilita:r.flexibilita===!0,available:!0}}refresh(){const t=Be();if(t)try{const i=t.findSensorId("service_shield_activity"),n=t.get(i),r=(n==null?void 0:n.attributes)??{},a=r.running_requests??[],s=r.queued_requests??[],l=t.findSensorId("service_shield_status"),c=t.findSensorId("service_shield_queue"),u=t.getString(l).value,p=t.getNumeric(c).value,f=t.getString(t.findSensorId("box_prms_mode")).value,y=t.getString(t.findSensorId("invertor_prms_to_grid")).value,b=t.getNumeric(t.findSensorId("invertor_prm1_p_max_feed_grid")).value,g=t.getString(t.findSensorId("boiler_manual_mode")).value,m=ur[f.trim()]??"home_1",$=pr[g.trim()]??"cbb",P=a.map((Y,R)=>this.parseRequest(Y,R,!0)),_=s.map((Y,R)=>this.parseRequest(Y,R+a.length,!1)),T=[...P,..._],G=new Map,Q=new Set;for(const Y of T){const R=this.parseServiceRequest(Y);R&&!G.has(R.type)&&(G.set(R.type,R.targetValue),Q.add(R.type))}const w=u==="Running"||u==="running",B=oa({gridModeRaw:y,gridLimit:b},{pendingServices:G,changingServices:Q,shieldStatus:w?"running":"idle"}),V=wn(y)||B.currentLiveDelivery==="unknown"?this.state.currentGridDelivery:B.currentLiveDelivery;this.state={status:w?"running":"idle",activity:(n==null?void 0:n.state)??"",queueCount:p,runningRequests:P,queuedRequests:_,allRequests:T,currentBoxMode:m,currentGridDelivery:V,currentGridLimit:B.currentLiveLimit??0,currentBoilerMode:$,pendingServices:G,changingServices:Q,gridDeliveryState:B,supplementary:this.readSupplementaryState(t)},this.notify()}catch(i){v.error("ShieldController refresh failed",i)}}parseRequest(t,i,n){const r=t||{},a=r.service??"",l=(Array.isArray(r.changes)?r.changes:[]).map(g=>typeof g=="string"?g:String(g??"")).filter(g=>g.length>0),c=r.started_at??r.queued_at??r.created_at??r.timestamp??r.created??"",u=Array.isArray(r.targets)?r.targets.map(g=>({param:String((g==null?void 0:g.param)??""),value:String((g==null?void 0:g.value)??(g==null?void 0:g.to)??""),entityId:String((g==null?void 0:g.entity_id)??(g==null?void 0:g.entityId)??""),from:String((g==null?void 0:g.from)??""),to:String((g==null?void 0:g.to)??(g==null?void 0:g.value)??""),current:String((g==null?void 0:g.current)??"")})):[],p=this.extractRequestParams(r.params),f=this.extractGridDeliveryStep(r,p),y=this.resolveRequestTargetValue(r,u,p,f);let b="mode_change";if(a.includes("set_box_mode")){const g=this.extractRequestParams(r.params);b=(g==null?void 0:g.home_grid_v)!==void 0||(g==null?void 0:g.home_grid_vi)!==void 0||Array.isArray(r.targets)&&r.targets.some($=>($==null?void 0:$.param)==="app")?"supplementary_toggle":"mode_change"}else a.includes("set_grid_delivery")&&!a.includes("limit")?b="grid_delivery":a.includes("grid_delivery_limit")||a.includes("set_grid_delivery")?b="grid_limit":a.includes("set_boiler_mode")?b="boiler_mode":a.includes("set_formating_mode")&&(b="battery_formating");return{id:`${a}_${i}_${c}`,type:b,status:n?"running":"queued",service:a,targetValue:y,changes:l,createdAt:c,position:i+1,description:typeof r.description=="string"?r.description:void 0,params:p,targets:u,traceId:typeof r.trace_id=="string"?r.trace_id:void 0,gridDeliveryStep:f}}parseServiceRequest(t){var u,p;const i=t.service;if(!i)return null;const n=t.changes.length>0?t.changes[0]:"",r=t.params,a=t.gridDeliveryStep,s=this.extractStructuredTarget(t);if(i.includes("set_grid_delivery")&&s)return s;if(i.includes("set_grid_delivery")&&n.includes("p_max_feed_grid")){const f=n.match(/→\s*'?(\d+)'?/),y=f?f[1]:t.targetValue;return y?{type:"grid_limit",targetValue:y}:null}const l=n.match(/→\s*'([^']+)'/),c=l?l[1]:t.targetValue||"";if(i.includes("set_box_mode")){if(((u=t.targets)==null?void 0:u.some(y=>y.param==="app"))||(r==null?void 0:r.home_grid_v)!==void 0||(r==null?void 0:r.home_grid_vi)!==void 0){const y=(p=t.targets)==null?void 0:p.find(m=>m.param==="app"),b=(y==null?void 0:y.to)||t.targetValue;return{type:"supplementary",targetValue:aa[b]??b??""}}return{type:"box_mode",targetValue:c}}if(i.includes("set_boiler_mode"))return{type:"boiler_mode",targetValue:c};if(i.includes("set_grid_delivery")&&n.includes("prms_to_grid"))return{type:"grid_mode",targetValue:c};if(i.includes("set_grid_delivery")){if(a==="limit"){const y=this.normalizeNumericTargetValue((r==null?void 0:r.limit)??t.targetValue);return y?{type:"grid_limit",targetValue:y}:null}if(a==="mode"){const y=this.normalizeModeTargetValue((r==null?void 0:r.mode)??t.targetValue);return y?{type:"grid_mode",targetValue:y}:null}const f=n.match(/→\s*'?(\d+)'?/);return f?{type:"grid_limit",targetValue:f[1]}:t.targetValue&&/^\d+$/.test(t.targetValue.trim())?{type:"grid_limit",targetValue:t.targetValue}:{type:"grid_mode",targetValue:c}}return null}extractRequestParams(t){if(!(!t||typeof t!="object"||Array.isArray(t)))return t}extractGridDeliveryStep(t,i){const n=(t==null?void 0:t.grid_delivery_step)??(i==null?void 0:i._grid_delivery_step);return typeof n=="string"?n:void 0}resolveRequestTargetValue(t,i,n,r){const a=this.extractStructuredTarget({service:(t==null?void 0:t.service)??"",targetValue:"",params:n,targets:i,gridDeliveryStep:r});if(a!=null&&a.targetValue)return a.targetValue;const s=t.target_value??t.target_display;return typeof s=="string"?s:""}extractStructuredTarget(t){if(!t.service.includes("set_grid_delivery"))return null;const i=t.gridDeliveryStep,n=t.params,r=t.targets??[];if(i==="limit"){const l=this.findTargetValue(r,["limit"]),c=this.normalizeNumericTargetValue(l??(n==null?void 0:n.limit)??t.targetValue);return c?{type:"grid_limit",targetValue:c}:null}if(i==="mode"){const l=this.findTargetValue(r,["mode"]),c=this.normalizeModeTargetValue(l??(n==null?void 0:n.mode)??t.targetValue);return c?{type:"grid_mode",targetValue:c}:null}const a=this.findTargetValue(r,["limit"]);if(a){const l=this.normalizeNumericTargetValue(a);if(l)return{type:"grid_limit",targetValue:l}}const s=this.findTargetValue(r,["mode"]);if(s){const l=this.normalizeModeTargetValue(s);if(l)return{type:"grid_mode",targetValue:l}}return null}findTargetValue(t,i){const n=new Set(i),r=t.find(a=>n.has(a.param));return(r==null?void 0:r.to)||(r==null?void 0:r.value)||void 0}normalizeNumericTargetValue(t){if(typeof t=="number"&&Number.isFinite(t))return String(Math.round(t));if(typeof t!="string")return"";const i=t.trim().match(/(\d+)/);return i?i[1]:""}normalizeModeTargetValue(t){if(typeof t!="string")return"";const i=t.trim();switch(i.toLowerCase()){case"off":return"Vypnuto";case"on":return"Zapnuto";case"limited":return"Omezeno";default:return i}}isLimitedGridDeliveryActiveOrPending(){const t=this.state.gridDeliveryState;if(t.pendingDeliveryTarget==="limited"||t.pendingLimitTarget!==null||t.currentLiveDelivery==="limited"||t.currentLiveDelivery==="unknown"&&(eo(t)==="limited"||this.state.currentGridDelivery==="limited"))return!0;const i=Be();if(i){const n=i.getString(i.findSensorId("invertor_prms_to_grid")).value;if(!wn(n)&&Bn(n)==="limited")return!0}return!1}needsGridModeChangeForLimitedRequest(){return!this.isLimitedGridDeliveryActiveOrPending()}getBoxModeButtonState(t){const i=this.state.pendingServices.get("box_mode");return i?ur[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoxMode===t?"active":"idle"}getGridDeliveryButtonState(t){return this.getGridDeliveryButtonStateV2(t)}getGridDeliveryButtonStateV2(t){const i=this.state.gridDeliveryState,r=this.state.status==="running"?"processing":"pending",a=i.pendingDeliveryTarget,s=i.pendingLimitTarget,l=i.currentLiveDelivery;return a!==null?a===t?r:t==="limited"&&l==="limited"||t==="limited"&&l==="unknown"&&this.state.currentGridDelivery==="limited"?"active":"disabled-by-service":s!==null?t==="limited"?r:"disabled-by-service":l===t?"active":"idle"}getBoilerModeButtonState(t){const i=this.state.pendingServices.get("boiler_mode");return i?pr[i]===t?this.state.status==="running"?"processing":"pending":"disabled-by-service":this.state.currentBoilerMode===t?"active":"idle"}isAnyServiceChanging(){return this.state.changingServices.size>0}shouldProceedWithQueue(){return this.state.queueCount<3?!0:window.confirm(`⚠️ VAROVÁNÍ: Fronta již obsahuje ${this.state.queueCount} úkolů!

Každá změna může trvat až 10 minut.
Opravdu chcete přidat další úkol?`)}async setBoxMode(t){if(this.state.currentBoxMode===t&&!this.state.changingServices.has("box_mode"))return!1;const i=await J.callService("oig_cloud","set_box_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async setGridDelivery(t,i){const n={acknowledgement:!0,warning:!0};t==="limited"&&i!=null?(this.needsGridModeChangeForLimitedRequest()&&(n.mode=t),n.limit=i):i!=null?n.limit=i:n.mode=t;const r=await J.callService("oig_cloud","set_grid_delivery",n);return r&&this.refresh(),r}async setBoilerMode(t){if(this.state.currentBoilerMode===t&&!this.state.changingServices.has("boiler_mode"))return!1;const i=await J.callService("oig_cloud","set_boiler_mode",{mode:t,acknowledgement:!0});return i&&this.refresh(),i}async removeFromQueue(t){const i=await J.callService("oig_cloud","shield_remove_from_queue",{position:t});return i&&this.refresh(),i}async setSupplementaryToggle(t,i){const n=await J.callService("oig_cloud","set_box_mode",{[t]:i,acknowledgement:!0});return n&&this.refresh(),n}notify(){for(const t of this.listeners)try{t(this.state)}catch(i){v.error("ShieldController listener error",i)}}}const X=new sl;var ol=Object.defineProperty,ll=Object.getOwnPropertyDescriptor,lt=(e,t,i,n)=>{for(var r=n>1?void 0:n?ll(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&ol(t,i,r),r};const me=K;let Ee=class extends S{constructor(){super(...arguments),this.title="Energetické Toky",this.time="",this.showStatus=!1,this.alertCount=0,this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1}onStatusClick(){this.dispatchEvent(new CustomEvent("status-click",{bubbles:!0}))}onEditClick(){this.dispatchEvent(new CustomEvent("edit-click",{bubbles:!0}))}onResetClick(){this.dispatchEvent(new CustomEvent("reset-click",{bubbles:!0}))}onToggleLeftPanel(){this.dispatchEvent(new CustomEvent("toggle-left-panel",{bubbles:!0}))}onToggleRightPanel(){this.dispatchEvent(new CustomEvent("toggle-right-panel",{bubbles:!0}))}render(){const e=this.alertCount>0?"warning":"ok";return d`
      <h1 class="title">
        <span class="title-icon">⚡</span>
        ${this.title}
        <span class="version">V2</span>
        ${this.time?d`<span class="time">${this.time}</span>`:null}
      </h1>
      
      <div class="spacer"></div>
      
      ${this.showStatus?d`
        <div class="status-badge ${e}" @click=${this.onStatusClick}>
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
    `}};Ee.styles=D`
    :host {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: ${me(o.bgPrimary)};
      border-bottom: 1px solid ${me(o.divider)};
      gap: 12px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
      color: ${me(o.textPrimary)};
      margin: 0;
    }

    .title-icon { font-size: 20px; }

    .version {
      font-size: 11px;
      color: ${me(o.textSecondary)};
      background: ${me(o.bgSecondary)};
      padding: 2px 6px;
      border-radius: 4px;
    }

    .time {
      font-size: 13px;
      color: ${me(o.textSecondary)};
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
      background: ${me(o.warning)};
      color: #fff;
    }

    .status-badge.error {
      background: ${me(o.error)};
      color: #fff;
    }

    .status-badge.ok {
      background: ${me(o.success)};
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
      color: ${me(o.textSecondary)};
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: ${me(o.bgSecondary)};
      color: ${me(o.textPrimary)};
    }

    .action-btn.active {
      background: ${me(o.accent)};
      color: #fff;
    }
  `;lt([h({type:String})],Ee.prototype,"title",2);lt([h({type:String})],Ee.prototype,"time",2);lt([h({type:Boolean})],Ee.prototype,"showStatus",2);lt([h({type:Number})],Ee.prototype,"alertCount",2);lt([h({type:Boolean})],Ee.prototype,"leftPanelCollapsed",2);lt([h({type:Boolean})],Ee.prototype,"rightPanelCollapsed",2);Ee=lt([C("oig-header")],Ee);function va(e,t){let i=null;return function(...n){i!==null&&clearTimeout(i),i=window.setTimeout(()=>{e.apply(this,n),i=null},t)}}var cl=Object.defineProperty,dl=Object.getOwnPropertyDescriptor,gi=(e,t,i,n)=>{for(var r=n>1?void 0:n?dl(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&cl(t,i,r),r};const Or="oig_v2_theme";let nt=class extends S{constructor(){super(...arguments),this.mode="auto",this.isDark=!1,this.breakpoint="desktop",this.width=1280,this.mediaQuery=null,this.resizeObserver=null,this.debouncedResize=va(this.updateBreakpoint.bind(this),100),this.onMediaChange=e=>{this.mode==="auto"&&(this.isDark=e.matches,this.dispatchEvent(new CustomEvent("theme-changed",{detail:{isDark:this.isDark}})))},this.onThemeChange=()=>{this.detectTheme()}}connectedCallback(){super.connectedCallback(),this.loadTheme(),this.setupMediaQuery(),this.setupResizeObserver(),this.detectTheme(),window.addEventListener("oig-theme-change",this.onThemeChange)}disconnectedCallback(){var e,t;super.disconnectedCallback(),(e=this.mediaQuery)==null||e.removeEventListener("change",this.onMediaChange),(t=this.resizeObserver)==null||t.disconnect(),window.removeEventListener("oig-theme-change",this.onThemeChange)}loadTheme(){const e=localStorage.getItem(Or);e&&["light","dark","auto"].includes(e)&&(this.mode=e)}saveTheme(){localStorage.setItem(Or,this.mode)}setupMediaQuery(){this.mediaQuery=window.matchMedia("(prefers-color-scheme: dark)"),this.mediaQuery.addEventListener("change",this.onMediaChange)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(this.debouncedResize),this.resizeObserver.observe(document.documentElement),this.updateBreakpoint()}updateBreakpoint(){this.width=window.innerWidth,this.breakpoint=yt(this.width)}detectTheme(){this.mode==="auto"?this.isDark=window.matchMedia("(prefers-color-scheme: dark)").matches:this.isDark=this.mode==="dark"}setTheme(e){this.mode=e,this.saveTheme(),this.detectTheme(),this.dispatchEvent(new CustomEvent("theme-changed",{detail:{mode:e,isDark:this.isDark}})),v.info("Theme changed",{mode:e,isDark:this.isDark})}getThemeInfo(){return{mode:this.mode,isDark:this.isDark,breakpoint:this.breakpoint,width:this.width}}render(){return d`
      <slot></slot>
    `}};nt.styles=D`
    :host {
      display: contents;
    }
  `;gi([h({type:String})],nt.prototype,"mode",2);gi([x()],nt.prototype,"isDark",2);gi([x()],nt.prototype,"breakpoint",2);gi([x()],nt.prototype,"width",2);nt=gi([C("oig-theme-provider")],nt);var ul=Object.defineProperty,pl=Object.getOwnPropertyDescriptor,Nn=(e,t,i,n)=>{for(var r=n>1?void 0:n?pl(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&ul(t,i,r),r};let ei=class extends S{constructor(){super(...arguments),this.tabs=[],this.activeTab=""}onTabClick(e){e!==this.activeTab&&(this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tabId:e},bubbles:!0})))}isActive(e){return this.activeTab===e}render(){return d`
      ${this.tabs.map(e=>d`
        <button 
          class="tab ${this.isActive(e.id)?"active":""}"
          @click=${()=>this.onTabClick(e.id)}
        >
          ${e.icon?d`<span class="tab-icon">${e.icon}</span>`:null}
          <span>${e.label}</span>
        </button>
      `)}
    `}};ei.styles=D`
    :host {
      display: flex;
      gap: 8px;
      padding: 0 16px;
      background: ${K(o.bgPrimary)};
      border-bottom: 1px solid ${K(o.divider)};
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
      color: ${K(o.textSecondary)};
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab:hover {
      color: ${K(o.textPrimary)};
      background: ${K(o.bgSecondary)};
    }

    .tab.active {
      color: ${K(o.accent)};
      border-bottom-color: ${K(o.accent)};
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
  `;Nn([h({type:Array})],ei.prototype,"tabs",2);Nn([h({type:String})],ei.prototype,"activeTab",2);ei=Nn([C("oig-tabs")],ei);var hl=Object.defineProperty,gl=Object.getOwnPropertyDescriptor,Rn=(e,t,i,n)=>{for(var r=n>1?void 0:n?gl(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&hl(t,i,r),r};const fl="oig_v2_layout_",mn=K;let ti=class extends S{constructor(){super(...arguments),this.editable=!1,this.breakpoint="desktop",this.onResize=va(()=>{this.breakpoint=yt(window.innerWidth)},100)}connectedCallback(){super.connectedCallback(),this.breakpoint=yt(window.innerWidth),window.addEventListener("resize",this.onResize)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("resize",this.onResize)}updated(e){e.has("breakpoint")&&this.setAttribute("breakpoint",this.breakpoint)}resetLayout(){const e=`${fl}${this.breakpoint}`;localStorage.removeItem(e),this.requestUpdate()}render(){return d`<slot></slot>`}};ti.styles=D`
    :host {
      display: grid;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      background: ${mn(o.bgSecondary)};
    }

    :host([breakpoint='mobile']) { grid-template-columns: 1fr; }
    :host([breakpoint='tablet']) { grid-template-columns: repeat(2, 1fr); }
    :host([breakpoint='desktop']) { grid-template-columns: repeat(3, 1fr); }

    .grid-item {
      position: relative;
      background: ${mn(o.cardBg)};
      border-radius: 8px;
      box-shadow: ${mn(o.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .grid-item.editable { cursor: move; }
    .grid-item.editable:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .grid-item.dragging { opacity: 0.8; transform: scale(1.02); z-index: 100; }

    @media (max-width: 768px) {
      :host { gap: 12px; padding: 12px; }
    }
  `;Rn([h({type:Boolean})],ti.prototype,"editable",2);Rn([x()],ti.prototype,"breakpoint",2);ti=Rn([C("oig-grid")],ti);const ml={off:"Vypnuto",on:"Zapnuto",limited:"Omezeno",unknown:"?"};function Qt(e){return ml[e]??e}const Hn=e=>{const t=e.trim();return t?t.endsWith("W")?t:`${t}W`:""};function bl(e){const t=e.isUnavailable;let i;t||e.currentLiveDelivery==="unknown"?i="?":e.currentLiveDelivery==="limited"&&e.currentLiveLimit!==null?i=`Omezeno ${e.currentLiveLimit}W`:i=Qt(e.currentLiveDelivery);const n=e.pendingDeliveryTarget!==null,r=e.pendingLimitTarget!==null;let a=null,s=null;return n&&r?(a=`Ve frontě: ${Qt(e.pendingDeliveryTarget)} / ${e.pendingLimitTarget}W`,s="both"):r?(a=`Ve frontě: limit ${Hn(String(e.pendingLimitTarget))}`,s="limit"):n&&(a=`Ve frontě: ${Qt(e.pendingDeliveryTarget)}`,s="mode"),{currentText:i,currentUnavailable:t,pendingText:a,pendingKind:s,isTransitioning:e.isTransitioning}}function yl(e){const t=e.isUnavailable;let i;t||e.currentLiveDelivery==="unknown"?i="?":e.currentLiveDelivery==="limited"&&e.currentLiveLimit!==null?i=`Omezeno ${e.currentLiveLimit}W`:i=Qt(e.currentLiveDelivery);const n=!t&&e.currentLiveDelivery==="limited";let r=null,a=null;!t&&e.currentLiveLimit!==null&&(a=`${e.currentLiveLimit}W`,r=n?"Aktivní limit":"Nastavený limit");let s=null,l=null;return e.pendingDeliveryTarget!==null&&(s=`Ve frontě: ${Qt(e.pendingDeliveryTarget)}`),e.pendingLimitTarget!==null&&(l=`Ve frontě: limit ${Hn(String(e.pendingLimitTarget))}`),{currentModeText:i,limitLabel:r,limitValue:a,showLimitAsActive:n,isUnavailable:t,isTransitioning:e.isTransitioning,pendingModeText:s,pendingLimitText:l}}function Er(e,t){const i=t.has("box_mode"),n=e.get("box_mode"),r=t.has("grid_mode")||t.has("grid_limit"),a=e.get("grid_limit"),s=e.get("grid_mode");let l=null;if(a){const c=Hn(a);l=c?`→ ${c}`:null}else s&&(l=`→ ${s}`);return{inverterModeChanging:i,inverterModeText:n?`→ ${n}`:null,gridExportChanging:r,gridExportText:l}}var vl=Object.defineProperty,xl=Object.getOwnPropertyDescriptor,en=(e,t,i,n)=>{for(var r=n>1?void 0:n?xl(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&vl(t,i,r),r};let $t=class extends S{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1}get fillHeight(){return Math.max(0,Math.min(100,this.soc))/100*54}get fillY(){return 13+(54-this.fillHeight)}render(){return d`
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
    `}};$t.styles=D`
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
  `;en([h({type:Number})],$t.prototype,"soc",2);en([h({type:Boolean})],$t.prototype,"charging",2);en([h({type:Boolean})],$t.prototype,"gridCharging",2);$t=en([C("oig-battery-gauge")],$t);var wl=Object.defineProperty,$l=Object.getOwnPropertyDescriptor,tn=(e,t,i,n)=>{for(var r=n>1?void 0:n?$l(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&wl(t,i,r),r};let _t=class extends S{constructor(){super(...arguments),this.power=0,this.percent=0,this.maxPower=5400}get isNight(){return this.percent<2}get level(){return this.percent<2?"night":this.percent<20?"low":this.percent<65?"mid":"high"}get sunColor(){const e=this.level;return e==="low"?"#b0bec5":e==="mid"?"#ffd54f":"#ffb300"}get rayLen(){const e=this.level;return e==="low"?4:e==="mid"?7:10}get rayOpacity(){const e=this.level;return e==="low"?.5:e==="mid"?.8:1}get coreRadius(){const e=this.level;return e==="low"?7:e==="mid"?9:11}renderMoon(){return Te`
      <circle cx="24" cy="24" r="20" fill="#3949ab" opacity="0.28"/>
      <g class="moon-body">
        <path d="M24 6 A18 18 0 1 0 24 42 A13 13 0 1 1 24 6Z" fill="#cfd8dc" opacity="0.95"/>
      </g>
      <circle class="star" cx="7" cy="10" r="1.5" fill="#e8eaf6" style="animation-delay:0s"/>
      <circle class="star" cx="41" cy="7" r="1.8" fill="#e8eaf6" style="animation-delay:0.7s"/>
      <circle class="star" cx="5" cy="30" r="1.2" fill="#c5cae9" style="animation-delay:1.4s"/>
      <circle class="star" cx="6" cy="44" r="1.0" fill="#c5cae9" style="animation-delay:2.1s"/>
      <circle class="star" cx="42" cy="39" r="1.3" fill="#e8eaf6" style="animation-delay:2.8s"/>
    `}renderSun(){const i=this.coreRadius,n=i+3,r=n+this.rayLen,a=this.sunColor,s=this.rayOpacity,c=[0,45,90,135,180,225,270,315].map(p=>{const f=p*Math.PI/180,y=24+Math.cos(f)*n,b=24+Math.sin(f)*n,g=24+Math.cos(f)*r,m=24+Math.sin(f)*r;return Te`
        <line class="ray"
          x1="${y}" y1="${b}" x2="${g}" y2="${m}"
          stroke="${a}" stroke-width="2.5" opacity="${s}"
        />
      `}),u=this.level==="low";return Te`
      <!-- Paprsky obaleny v <g> pro CSS rotaci -->
      <g class="rays-group">
        ${c}
      </g>
      <circle class="sun-core" cx="${24}" cy="${24}" r="${i}" fill="${a}" />
      ${u?Te`
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
    `}};_t.styles=D`
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
  `;tn([h({type:Number})],_t.prototype,"power",2);tn([h({type:Number})],_t.prototype,"percent",2);tn([h({type:Number})],_t.prototype,"maxPower",2);_t=tn([C("oig-solar-icon")],_t);var _l=Object.defineProperty,kl=Object.getOwnPropertyDescriptor,fi=(e,t,i,n)=>{for(var r=n>1?void 0:n?kl(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&_l(t,i,r),r};let rt=class extends S{constructor(){super(...arguments),this.soc=0,this.charging=!1,this.gridCharging=!1,this.discharging=!1,this._clipId=`batt-clip-${Math.random().toString(36).slice(2)}`}get fillColor(){return this.gridCharging?"#42a5f5":this.soc>50?"#4caf50":this.soc>20?"#ff9800":"#f44336"}get fillHeight(){return Math.max(1,Math.min(100,this.soc)/100*48)}get fillY(){return 14+(48-this.fillHeight)}get stripeColor(){return this.gridCharging?"#90caf9":"#a5d6a7"}render(){const e=this.charging||this.gridCharging,t=this.soc>=25;return d`
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
        ${e?Te`
          <rect
            class="charge-stripe active"
            x="4" y="52" width="24" height="8" rx="2"
            fill="${this.stripeColor}"
            clip-path="url(#${this._clipId})"
          />
        `:""}

        <!-- SoC text uvnitř -->
        ${t?Te`
          <text class="soc-text" x="16" y="${this.fillY+this.fillHeight/2}">
            ${Math.round(this.soc)}%
          </text>
        `:""}
      </svg>
    `}};rt.styles=D`
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
  `;fi([h({type:Number})],rt.prototype,"soc",2);fi([h({type:Boolean})],rt.prototype,"charging",2);fi([h({type:Boolean})],rt.prototype,"gridCharging",2);fi([h({type:Boolean})],rt.prototype,"discharging",2);rt=fi([C("oig-battery-icon")],rt);var Sl=Object.defineProperty,Cl=Object.getOwnPropertyDescriptor,xa=(e,t,i,n)=>{for(var r=n>1?void 0:n?Cl(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Sl(t,i,r),r};let zi=class extends S{constructor(){super(...arguments),this.power=0}get mode(){return this.power>50?"importing":this.power<-50?"exporting":"idle"}render(){const e=this.mode;return d`
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
        ${e!=="idle"?d`
          <path
            class="arrow ${e==="importing"?"import":"export"}"
            d="${e==="importing"?"M 24,10 L 24,4 M 24,4 L 20,8 M 24,4 L 28,8":"M 24,4 L 24,10 M 24,10 L 20,6 M 24,10 L 28,6"}"
          />
        `:""}
      </svg>
    `}};zi.styles=D`
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
  `;xa([h({type:Number})],zi.prototype,"power",2);zi=xa([C("oig-grid-icon")],zi);var Pl=Object.defineProperty,Tl=Object.getOwnPropertyDescriptor,nn=(e,t,i,n)=>{for(var r=n>1?void 0:n?Tl(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Pl(t,i,r),r};let kt=class extends S{constructor(){super(...arguments),this.power=0,this.maxPower=1e4,this.boilerActive=!1}get percent(){return Math.min(100,this.power/Math.max(1,this.maxPower)*100)}get fillColor(){const e=this.percent;return e<15?"#546e7a":e<40?"#f06292":e<70?"#e91e63":"#c62828"}get level(){const e=this.percent;return e<15?"low":e<60?"mid":"high"}get windowColor(){const e=this.level;return e==="low"?"#37474f":e==="mid"?"#ffd54f":"#ffb300"}render(){const e=this.percent,t=24,i=22,n=Math.max(1,e/100*t),r=i+(t-n),a=this.level;return d`
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
        ${this.boilerActive?Te`
          <circle class="boiler-dot" cx="10" cy="43" r="3.5" fill="#ff5722" opacity="0.9"/>
          <text x="10" y="43" text-anchor="middle" dominant-baseline="middle" font-size="5" fill="white">🔥</text>
        `:""}
      </svg>
    `}};kt.styles=D`
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
  `;nn([h({type:Number})],kt.prototype,"power",2);nn([h({type:Number})],kt.prototype,"maxPower",2);nn([h({type:Boolean})],kt.prototype,"boilerActive",2);kt=nn([C("oig-house-icon")],kt);var Dl=Object.defineProperty,Ml=Object.getOwnPropertyDescriptor,mi=(e,t,i,n)=>{for(var r=n>1?void 0:n?Ml(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Dl(t,i,r),r};let at=class extends S{constructor(){super(...arguments),this.mode="",this.bypassActive=!1,this.hasAlarm=!1,this.plannerAuto=!1}get modeType(){return this.hasAlarm?"alarm":this.bypassActive?"bypass":this.mode.includes("UPS")?"ups":"normal"}render(){const e=this.modeType;return d`
      <svg viewBox="0 0 48 48">
        <!-- Hlavní box střídače -->
        <rect
          class="box ${e}"
          x="4" y="8" width="40" height="34" rx="5"
        />

        <!-- Sinusoida výstupu -->
        <path class="sine-out ${e}" d="${"M 10,28 C 14,28 14,20 18,22 C 22,24 22,32 26,32 C 30,32 30,20 34,22 C 38,24 38,28 38,28"}"/>

        <!-- UPS blesk -->
        ${e==="ups"?Te`
          <path class="ups-bolt active"
            d="M 25,12 L 20,26 L 24,26 L 23,36 L 28,22 L 24,22 Z"
          />
        `:""}

        <!-- Bypass výstraha — trojúhelník nahoře -->
        ${e==="bypass"?Te`
          <polygon
            class="warning-triangle active"
            points="24,6 18,16 30,16"
          />
          <text x="24" y="15" text-anchor="middle" dominant-baseline="middle"
            font-size="6" font-weight="bold" fill="#fff">!</text>
        `:""}

        <!-- Alarm kroužek -->
        ${e==="alarm"?Te`
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
    `}};at.styles=D`
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
  `;mi([h({type:String})],at.prototype,"mode",2);mi([h({type:Boolean})],at.prototype,"bypassActive",2);mi([h({type:Boolean})],at.prototype,"hasAlarm",2);mi([h({type:Boolean})],at.prototype,"plannerAuto",2);at=mi([C("oig-inverter-icon")],at);var Ol=Object.defineProperty,El=Object.getOwnPropertyDescriptor,Me=(e,t,i,n)=>{for(var r=n>1?void 0:n?El(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Ol(t,i,r),r};const j=K,zr=new URLSearchParams(window.location.search),zl=zr.get("sn")||zr.get("inverter_sn")||"",Ll=e=>`sensor.oig_${zl}_${e}`,bn="oig_v2_flow_layout_",Qe=["solar","battery","inverter","grid","house"],Al={solar:{top:"0%",left:"0%"},house:{top:"0%",left:"65%"},inverter:{top:"35%",left:"35%"},grid:{top:"70%",left:"0%"},battery:{top:"70%",left:"65%"}};function L(e){return()=>J.openEntityDialog(Ll(e))}let xe=class extends S{constructor(){super(...arguments),this.data=In,this.editMode=!1,this.pendingServices=new Map,this.changingServices=new Set,this.shieldStatus="idle",this.shieldQueueCount=0,this.gridDeliveryState={currentLiveDelivery:"unknown",currentLiveLimit:null,pendingDeliveryTarget:null,pendingLimitTarget:null,isTransitioning:!1,isUnavailable:!1},this.shieldUnsub=null,this.expandedNodes=new Set,this.customPositions={},this.draggedNodeId=null,this.dragStartX=0,this.dragStartY=0,this.dragStartTop=0,this.dragStartLeft=0,this.onShieldUpdate=e=>{this.pendingServices=e.pendingServices,this.changingServices=e.changingServices,this.shieldStatus=e.status,this.shieldQueueCount=e.queueCount,this.gridDeliveryState=e.gridDeliveryState},this.handleDragStart=e=>{if(!this.editMode)return;e.preventDefault(),e.stopPropagation();const i=e.target.closest(".node");if(!i)return;const n=this.findNodeId(i);if(!n)return;this.draggedNodeId=n,i.classList.add("dragging");const r=i.getBoundingClientRect();this.dragStartX=e.clientX,this.dragStartY=e.clientY,this.dragStartTop=r.top,this.dragStartLeft=r.left},this.handleTouchStart=e=>{if(!this.editMode)return;e.preventDefault();const i=e.target.closest(".node");if(!i)return;const n=this.findNodeId(i);if(!n)return;this.draggedNodeId=n,i.classList.add("dragging");const r=e.touches[0],a=i.getBoundingClientRect();this.dragStartX=r.clientX,this.dragStartY=r.clientY,this.dragStartTop=a.top,this.dragStartLeft=a.left},this.handleDragMove=e=>{!this.draggedNodeId||!this.editMode||(e.preventDefault(),this.updateDragPosition(e.clientX,e.clientY))},this.handleTouchMove=e=>{if(!this.draggedNodeId||!this.editMode)return;e.preventDefault();const t=e.touches[0];this.updateDragPosition(t.clientX,t.clientY)},this.handleDragEnd=e=>{var n;if(!this.draggedNodeId||!this.editMode)return;const t=(n=this.shadowRoot)==null?void 0:n.querySelector(".flow-grid"),i=t==null?void 0:t.querySelector(`.node-${this.draggedNodeId}`);i&&i.classList.remove("dragging"),this.saveLayout(),this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0})),this.draggedNodeId=null},this.handleTouchEnd=e=>{this.handleDragEnd(e)}}connectedCallback(){super.connectedCallback(),this.loadSavedLayout(),this.shieldUnsub=X.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),this.removeDragListeners(),(e=this.shieldUnsub)==null||e.call(this),this.shieldUnsub=null}updated(e){e.has("editMode")&&(this.editMode?(this.setAttribute("editmode",""),this.loadSavedLayout(),this.requestUpdate(),this.updateComplete.then(()=>this.applySavedPositions())):(this.removeAttribute("editmode"),this.removeDragListeners(),this.clearInlinePositions(),this.updateComplete.then(()=>this.applyCustomPositions()))),!this.editMode&&this.hasCustomLayout&&this.updateComplete.then(()=>this.applyCustomPositions())}loadSavedLayout(){const e=yt(window.innerWidth),t=`${bn}${e}`;try{const i=localStorage.getItem(t);i&&(this.customPositions=JSON.parse(i),v.debug("[FlowNode] Loaded layout for "+e))}catch{}}applySavedPositions(){var t;if(!this.editMode)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of Qe){const n=this.customPositions[i];if(!n)continue;const r=e.querySelector(`.node-${i}`);r&&(r.style.top=n.top,r.style.left=n.left)}this.initDragListeners()}}clearInlinePositions(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of Qe){const n=e.querySelector(`.node-${i}`);n&&(n.style.top="",n.style.left="")}}saveLayout(){const e=yt(window.innerWidth),t=`${bn}${e}`;try{localStorage.setItem(t,JSON.stringify(this.customPositions)),v.debug("[FlowNode] Saved layout for "+e)}catch{}}toggleExpand(e,t){const i=t.target;if(i.closest(".clickable")||i.closest(".indicator")||i.closest(".forecast-badge")||i.closest(".node-value")||i.closest(".node-subvalue")||i.closest(".gc-plan-btn"))return;const n=new Set(this.expandedNodes);n.has(e)?n.delete(e):n.add(e),this.expandedNodes=n}nodeClass(e,t=""){const i=this.expandedNodes.has(e)?" expanded":"";return`node node-${e}${i}${t?" "+t:""}`}get hasCustomLayout(){return Qe.some(e=>{const t=this.customPositions[e];return(t==null?void 0:t.top)!=null&&(t==null?void 0:t.left)!=null})}applyCustomPositions(){var t;if(this.editMode||!this.hasCustomLayout)return;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e)for(const i of Qe){const n=e.querySelector(`.node-${i}`);if(!n)continue;const r=this.customPositions[i]??Al[i];n.style.top=r.top,n.style.left=r.left}}resetLayout(){const e=yt(window.innerWidth),t=`${bn}${e}`;localStorage.removeItem(t),this.customPositions={},this.clearInlinePositions(),this.editMode&&this.requestUpdate(),v.debug("[FlowNode] Reset layout for "+e)}initDragListeners(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".flow-grid");if(e){for(const i of Qe){const n=e.querySelector(`.node-${i}`);n&&(n.addEventListener("mousedown",this.handleDragStart),n.addEventListener("touchstart",this.handleTouchStart,{passive:!1}))}document.addEventListener("mousemove",this.handleDragMove),document.addEventListener("mouseup",this.handleDragEnd),document.addEventListener("touchmove",this.handleTouchMove,{passive:!1}),document.addEventListener("touchend",this.handleTouchEnd)}}removeDragListeners(){document.removeEventListener("mousemove",this.handleDragMove),document.removeEventListener("mouseup",this.handleDragEnd),document.removeEventListener("touchmove",this.handleTouchMove),document.removeEventListener("touchend",this.handleTouchEnd)}findNodeId(e){for(const i of Qe)if(e.classList.contains(`node-${i}`))return i;const t=e.closest('[class*="node-"]');if(!t)return null;for(const i of Qe)if(t.classList.contains(`node-${i}`))return i;return null}updateDragPosition(e,t){var _;if(!this.draggedNodeId)return;const i=(_=this.shadowRoot)==null?void 0:_.querySelector(".flow-grid");if(!i)return;const n=i.querySelector(`.node-${this.draggedNodeId}`);if(!n)return;const r=i.getBoundingClientRect(),a=n.getBoundingClientRect(),s=e-this.dragStartX,l=t-this.dragStartY,c=this.dragStartLeft+s,u=this.dragStartTop+l,p=r.left,f=r.right-a.width,y=r.top,b=r.bottom-a.height,g=Math.max(p,Math.min(f,c)),m=Math.max(y,Math.min(b,u)),$=(g-r.left)/r.width*100,P=(m-r.top)/r.height*100;n.style.left=`${$}%`,n.style.top=`${P}%`,this.customPositions[this.draggedNodeId]={top:`${P}%`,left:`${$}%`},this.dispatchEvent(new CustomEvent("layout-changed",{bubbles:!0,composed:!0}))}renderSolar(){const e=this.data,t=e.solarPercent,i=t<2,n=i?"linear-gradient(135deg, rgba(57,73,171,0.25) 0%, rgba(26,35,126,0.18) 100%)":Ft.solar,r=i?"rgba(121,134,203,0.5)":Nt.solar,a=i?"position:absolute;top:4px;left:6px;font-size:11px;background:rgba(57,73,171,0.35);color:#9fa8da;padding:3px 8px;border-radius:4px;border:1px solid rgba(121,134,203,0.4)":"position:absolute;top:4px;left:6px;font-size:9px",s=i?"position:absolute;top:4px;right:6px;font-size:11px;background:rgba(57,73,171,0.35);color:#9fa8da;padding:3px 8px;border-radius:4px;border:1px solid rgba(121,134,203,0.4)":"position:absolute;top:4px;right:6px;font-size:9px";return d`
      <div class="${this.nodeClass("solar",i?"night":"")}" style="--node-gradient: ${n}; --node-border: ${r};"
        @click=${l=>this.toggleExpand("solar",l)}>
        <div class="node-header" style="margin-top:16px">
          <oig-solar-icon .power=${e.solarPower} .percent=${t} .maxPower=${5400}></oig-solar-icon>
          <span class="node-label">Solár</span>
        </div>
        <div class="node-value" @click=${L("actual_fv_total")}>
          ${Ht(e.solarPower)}
        </div>
        <div class="node-subvalue" @click=${L("dc_in_fv_ad")}>
          Dnes: ${(e.solarToday/1e3).toFixed(2)} kWh
        </div>
        <div class="node-subvalue" @click=${L("solar_forecast")}>
          Zítra: ${e.solarForecastTomorrow.toFixed(1)} kWh
        </div>

        <button class="indicator" style="${a}" @click=${L("solar_forecast")}>
          🔮 ${e.solarForecastToday.toFixed(1)} kWh
        </button>
        <button class="indicator" style="${s}" @click=${L("solar_forecast")}>
          🌅 ${e.solarForecastTomorrow.toFixed(1)} kWh
        </button>

        <div class="detail-section">
          <div class="solar-strings">
            <div>
              <div class="detail-header">🏭 String 1</div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${L("extended_fve_voltage_1")}>${Math.round(e.solarV1)}V</button>
              </div>
              <div class="detail-row">
                <span class="icon">〰️</span>
                <button class="clickable" @click=${L("extended_fve_current_1")}>${e.solarI1.toFixed(1)}A</button>
              </div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${L("dc_in_fv_p1")}>${Math.round(e.solarP1)} W</button>
              </div>
            </div>
            <div>
              <div class="detail-header">🏭 String 2</div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${L("extended_fve_voltage_2")}>${Math.round(e.solarV2)}V</button>
              </div>
              <div class="detail-row">
                <span class="icon">〰️</span>
                <button class="clickable" @click=${L("extended_fve_current_2")}>${e.solarI2.toFixed(1)}A</button>
              </div>
              <div class="detail-row">
                <span class="icon">⚡</span>
                <button class="clickable" @click=${L("dc_in_fv_p2")}>${Math.round(e.solarP2)} W</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `}openGridChargingDialog(){this.dispatchEvent(new CustomEvent("oig-grid-charging-open",{bubbles:!0,composed:!0,detail:{data:this.data.gridChargingPlan}}))}getBatteryStatus(){const e=this.data;return e.batteryPower>10?{text:`⚡ Nabíjení${e.timeToFull?` (${e.timeToFull})`:""}`,cls:"status-charging pulse"}:e.batteryPower<-10?{text:`⚡ Vybíjení${e.timeToEmpty?` (${e.timeToEmpty})`:""}`,cls:"status-discharging pulse"}:{text:"◉ Klid",cls:"status-idle"}}getBalancingIndicator(){const e=this.data,t=e.balancingState;return t!=="charging"&&t!=="holding"&&t!=="completed"?{show:!1,text:"",icon:"",cls:""}:t==="charging"?{show:!0,text:`Nabíjení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⚡",cls:"charging"}:t==="holding"?{show:!0,text:`Držení${e.balancingTimeRemaining?` (${e.balancingTimeRemaining})`:""}`,icon:"⏸️",cls:"holding"}:{show:!0,text:"Dokončeno",icon:"✅",cls:"completed"}}renderBattery(){const e=this.data,t=this.getBatteryStatus(),i=this.getBalancingIndicator(),n=e.batteryPower>10,r=e.batteryTemp>25?"🌡️":e.batteryTemp<15?"🧊":"🌡️",a=e.batteryTemp>25?"temp-hot":e.batteryTemp<15?"temp-cold":"";return d`
      <div class="${this.nodeClass("battery")}" style="--node-gradient: ${Ft.battery}; --node-border: ${Nt.battery};"
        @click=${s=>this.toggleExpand("battery",s)}>

        <div class="node-header">
          <!-- Jediná ikona: SVG baterie nahrazuje gauge + emoji -->
          <oig-battery-icon
            .soc=${e.batterySoC}
            ?charging=${n&&!e.isGridCharging}
            ?gridCharging=${e.isGridCharging&&n}
            ?discharging=${e.batteryPower<-10}
          ></oig-battery-icon>
          <span class="node-label">Baterie</span>
        </div>

        <div class="node-value" @click=${L("batt_bat_c")}>
          ${Math.round(e.batterySoC)} %
        </div>
        <div class="node-subvalue" @click=${L("batt_batt_comp_p")}>
          ${Ht(e.batteryPower)}
        </div>

        <div class="node-status ${t.cls}">${t.text}</div>

        ${e.isGridCharging?d`
          <span class="grid-charging-badge">⚡🔌 Síťové nabíjení</span>
        `:E}
        ${i.show?d`
          <span class="balancing-indicator ${i.cls}">
            <span>${i.icon}</span>
            <span>${i.text}</span>
          </span>
        `:E}

        <div class="battery-indicators">
          <button class="indicator" @click=${L("extended_battery_voltage")}>
            ⚡ ${e.batteryVoltage.toFixed(1)} V
          </button>
          <button class="indicator" @click=${L("extended_battery_current")}>
            〰️ ${e.batteryCurrent.toFixed(1)} A
          </button>
          <button class="indicator ${a}" @click=${L("extended_battery_temperature")}>
            ${r} ${e.batteryTemp.toFixed(1)} °C
          </button>
        </div>

        <!-- Energie + gc-plan vždy viditelné (ne v detail-section) -->
        <div class="battery-energy-section">
          <div class="detail-header">⚡ Energie dnes</div>
          <div class="energy-grid">
            <div class="detail-row">
              <span class="icon">⬆️</span>
              <button class="clickable" @click=${L("computed_batt_charge_energy_today")}>
                Nab: ${Ke(e.batteryChargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">⬇️</span>
              <button class="clickable" @click=${L("computed_batt_discharge_energy_today")}>
                Vyb: ${Ke(e.batteryDischargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">☀️</span>
              <button class="clickable" @click=${L("computed_batt_charge_fve_energy_today")}>
                FVE: ${Ke(e.batteryChargeSolar)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">🔌</span>
              <button class="clickable" @click=${L("computed_batt_charge_grid_energy_today")}>
                Síť: ${Ke(e.batteryChargeGrid)}
              </button>
            </div>
          </div>

          <!-- Grid charging plan — always visible badge -->
          <div class="grid-charging-plan-summary">
            <button class="gc-plan-btn ${e.gridChargingPlan.hasBlocks?"has-plan":""}"
              @click=${s=>{s.stopPropagation(),this.openGridChargingDialog()}}>
              🔌
              ${e.gridChargingPlan.hasBlocks?d`Plán: ${e.gridChargingPlan.totalEnergyKwh.toFixed(1)} kWh`:d`Plán nabíjení`}
              <span class="gc-plan-arrow">›</span>
            </button>
          </div>
        </div>
      </div>
    `}getInverterModeDesc(){const e=this.data.inverterMode;return e.includes("Home 1")?"🏠 Home 1: Max baterie + FVE":e.includes("Home 2")?"🔋 Home 2: Šetří baterii":e.includes("Home 3")?"☀️ Home 3: Priorita nabíjení":e.includes("UPS")?"⚡ UPS: Vše ze sítě":`⚙️ ${e||"--"}`}renderInverter(){const e=this.data,t=co(e.inverterMode),i=e.bypassStatus.toLowerCase()==="on"||e.bypassStatus==="1",n=e.inverterTemp>35?"🔥":"🌡️",r=uo(e.inverterGridMode),a=Er(this.pendingServices,this.changingServices),s=yl(this.gridDeliveryState);let l="planner-unknown",c="Plánovač: N/A";return e.plannerAutoMode===!0?(l="planner-auto",c="Plánovač: AUTO"):e.plannerAutoMode===!1&&(l="planner-off",c="Plánovač: VYPNUTO"),d`
      <div class="${this.nodeClass("inverter",a.inverterModeChanging?"mode-changing":"")}" style="--node-gradient: ${Ft.inverter}; --node-border: ${Nt.inverter};"
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
        ${i?d`
          <button class="bypass-active bypass-warning" style="position:absolute;top:4px;right:6px;font-size:9px" @click=${L("bypass_status")}>
            🔴 Bypass
          </button>
        `:E}

        <div class="node-value" @click=${L("box_prms_mode")}>
          ${a.inverterModeChanging?d`<span class="spinner spinner--small"></span>`:E}
          ${t.icon} ${t.text}
        </div>
        <div class="node-subvalue">${this.getInverterModeDesc()}</div>
        ${a.inverterModeText?d`<div class="pending-text">${a.inverterModeText}</div>`:E}

        <div class="planner-badge ${l}">${c}</div>
        <div class="shield-badge ${this.shieldStatus==="running"?"shield-running":"shield-idle"}">
          🛡️ ${this.shieldStatus==="running"?"Zpracovávám":"Nečinný"}${this.shieldQueueCount>0?d` <span class="shield-queue">(${this.shieldQueueCount})</span>`:E}
        </div>

        <div class="battery-indicators" style="margin-top:6px">
          <button class="indicator" @click=${L("box_temp")}>
            ${n} ${e.inverterTemp.toFixed(1)} °C
          </button>
          <button class="indicator ${i?"bypass-warning":""}" @click=${L("bypass_status")}>
            <span id="inverter-bypass-icon">${i?"🔴":"🟢"}</span> Bypass: ${i?"ON":"OFF"}
          </button>
        </div>

        <!-- Přetoky + notifikace — vždy viditelné -->
        <div class="battery-indicators" style="margin-top:4px">
          <button class="indicator ${s.isUnavailable?"current-state-unknown":""}" @click=${L("invertor_prms_to_grid")}>
            ${r.icon} ${s.currentModeText}
          </button>
          <button class="clickable notif-badge ${e.notificationsError>0?"has-error":e.notificationsUnread>0?"has-unread":"indicator"}"
            @click=${L("notification_count_unread")}>
            🔔 ${e.notificationsUnread}/${e.notificationsError}
          </button>
        </div>
        ${s.pendingModeText?d`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${s.pendingModeText}
          </div>
        `:E}

        <div class="detail-section">
          <div class="detail-header">🌊 Přetoky — limit</div>
          ${s.limitLabel!==null?d`
            <div class="detail-row">
              <span class="detail-label">${s.limitLabel}</span>
              <button class="clickable ${s.showLimitAsActive?"limit-active":""}" @click=${L("invertor_prm1_p_max_feed_grid")}>
                ${s.limitValue}
              </button>
            </div>
          `:E}
          ${s.pendingLimitText?d`
            <div class="pending-overlay">
              <span class="spinner spinner--small"></span>
              ${s.pendingLimitText}
            </div>
          `:E}
        </div>
      </div>
    `}getGridStatus(){const e=this.data.gridPower;return e>10?{text:"⬇ Import",cls:"status-importing pulse"}:e<-10?{text:"⬆ Export",cls:"status-exporting pulse"}:{text:"◉ Žádný tok",cls:"status-idle"}}renderGrid(){const e=this.data,t=this.getGridStatus(),i=Er(this.pendingServices,this.changingServices),n=bl(this.gridDeliveryState);return d`
      <div class="${this.nodeClass("grid",i.gridExportChanging?"mode-changing":"")}" style="--node-gradient: ${Ft.grid}; --node-border: ${Nt.grid};"
        @click=${r=>this.toggleExpand("grid",r)}>

        <!-- Tarif badge vlevo nahoře -->
        <button class="indicator" style="position:absolute;top:4px;left:6px;font-size:9px" @click=${L("current_tariff")}>
          ${lo(e.currentTariff)}
        </button>
        <!-- Frekvence vpravo nahoře -->
        <button class="indicator" style="position:absolute;top:4px;right:6px;font-size:9px" @click=${L("ac_in_aci_f")}>
          ${e.gridFrequency.toFixed(1)} Hz
        </button>

        <!-- SVG ikona -->
        <div class="node-svg-icon" style="margin-top:14px">
          <oig-grid-icon .power=${e.gridPower} style="width:44px;height:44px"></oig-grid-icon>
        </div>
        <div class="node-label" style="margin-bottom:2px">Síť</div>

        <!-- Hlavní hodnota -->
        <div class="node-value" @click=${L("actual_aci_wtotal")}>
          ${Ht(e.gridPower)}
        </div>
        <div class="node-status ${t.cls}">${t.text}</div>
        <div class="node-subvalue ${n.currentUnavailable?"current-state-unknown":""}" @click=${L("invertor_prms_to_grid")}>
          ${n.currentText}
        </div>
        ${n.pendingText?d`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${n.pendingText}
          </div>
        `:E}

        <!-- Ceny — vždy viditelné jako rychlý přehled -->
        <div class="prices-row" style="margin-top:4px">
          <div class="price-cell">
            <span class="price-label">⬇ Spot</span>
            <button class="price-val price-spot" @click=${L("spot_price_current_15min")}>
              ${e.spotPrice.toFixed(2)} Kč
            </button>
          </div>
          <div class="energy-divider-v"></div>
          <div class="price-cell">
            <span class="price-label">⬆ Výkup</span>
            <button class="price-val price-export" @click=${L("export_price_current_15min")}>
              ${e.exportPrice.toFixed(2)} Kč
            </button>
          </div>
        </div>

        <!-- 3 fáze — vždy viditelné -->
        <div class="phases-grid" style="margin-top:6px">
          <div class="phase-cell">
            <span class="phase-label">L1</span>
            <button class="phase-val" @click=${L("actual_aci_wr")}>${Math.round(e.gridL1P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${j(o.textSecondary)}" @click=${L("ac_in_aci_vr")}>${Math.round(e.gridL1V)}V</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L2</span>
            <button class="phase-val" @click=${L("actual_aci_ws")}>${Math.round(e.gridL2P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${j(o.textSecondary)}" @click=${L("ac_in_aci_vs")}>${Math.round(e.gridL2V)}V</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L3</span>
            <button class="phase-val" @click=${L("actual_aci_wt")}>${Math.round(e.gridL3P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${j(o.textSecondary)}" @click=${L("ac_in_aci_vt")}>${Math.round(e.gridL3V)}V</button>
          </div>
        </div>

        <div class="detail-section">
          <!-- Energie dnes — odběr vlevo, dodávka vpravo -->
          <div class="energy-symmetric">
            <div class="energy-side">
              <span class="energy-side-label">⬇ Odběr</span>
              <button class="energy-side-val energy-import" @click=${L("ac_in_ac_ad")}>
                ${Ke(e.gridImportToday)}
              </button>
            </div>
            <div class="energy-divider-v"></div>
            <div class="energy-side">
              <span class="energy-side-label">⬆ Dodávka</span>
              <button class="energy-side-val energy-export" @click=${L("ac_in_ac_pd")}>
                ${Ke(e.gridExportToday)}
              </button>
            </div>
          </div>

        </div>
      </div>
    `}renderHouse(){const e=this.data;return d`
      <div class="${this.nodeClass("house")}" style="--node-gradient: ${Ft.house}; --node-border: ${Nt.house};"
        @click=${t=>this.toggleExpand("house",t)}>
        <div class="node-header">
          <oig-house-icon
            .power=${e.housePower}
            .maxPower=${e.boilerInstallPower>0?1e4:8e3}
            ?boilerActive=${e.boilerIsUse}
          ></oig-house-icon>
          <span class="node-label">Spotřeba</span>
        </div>

        <div class="node-value" @click=${L("actual_aco_p")}>
          ${Ht(e.housePower)}
        </div>
        <div class="node-subvalue" @click=${L("ac_out_en_day")}>
          Dnes: ${(e.houseTodayWh/1e3).toFixed(1)} kWh
        </div>

        <!-- Per-phase consumption (plain, not clickable — same as V1) -->
        <div class="phases">
          <span>${Math.round(e.houseL1)}W</span>
          <span class="phase-sep">|</span>
          <span>${Math.round(e.houseL2)}W</span>
          <span class="phase-sep">|</span>
          <span>${Math.round(e.houseL3)}W</span>
        </div>

        ${e.boilerIsUse?d`
          <div class="boiler-section">
            <div class="detail-header">🔥 Bojler</div>
            <div class="detail-row">
              <span class="icon">⚡</span>
              <span>Výkon:</span>
              <button class="clickable" @click=${L("boiler_current_cbb_w")}>
                ${Ht(e.boilerPower)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">📊</span>
              <span>Nabito:</span>
              <button class="clickable" @click=${L("boiler_day_w")}>
                ${Ke(e.boilerDayEnergy)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">${e.boilerManualMode==="CBB"?"🤖":e.boilerManualMode==="Manual"?"👤":"⚙️"}</span>
              <span>Režim:</span>
              <button class="clickable" @click=${L("boiler_manual_mode")}>
                ${e.boilerManualMode==="CBB"?"🤖 Inteligentní":e.boilerManualMode==="Manual"?"👤 Manuální":e.boilerManualMode||"--"}
              </button>
            </div>
          </div>
        `:E}
      </div>
    `}render(){return d`
      <div class="flow-grid ${this.hasCustomLayout&&!this.editMode?"custom-layout":""}">
        ${this.renderSolar()}
        ${this.renderBattery()}
        ${this.renderInverter()}
        ${this.renderGrid()}
        ${this.renderHouse()}
      </div>
    `}};xe.styles=D`
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
      color: ${j(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .node-value {
      font-size: 22px;
      font-weight: 700;
      color: ${j(o.textPrimary)};
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
      color: ${j(o.textSecondary)};
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
      color: ${j(o.textSecondary)};
      margin-top: 4px;
    }

    .pending-overlay {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: ${j(o.accent)};
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 4px;
      padding: 2px 6px;
      margin-top: 4px;
    }

    .current-state-unknown {
      color: ${j(o.textSecondary)};
      font-style: italic;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid ${j(o.divider)};
      border-top-color: ${j(o.accent)};
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
      border-top: 1px solid ${j(o.divider)};
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
      border-top: 1px dashed ${j(o.divider)};
    }

    .detail-header {
      font-size: 10px;
      font-weight: 600;
      color: ${j(o.textSecondary)};
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: ${j(o.textSecondary)};
      margin-bottom: 2px;
    }

    .detail-row .icon { width: 14px; text-align: center; flex-shrink: 0; }

    .clickable {
      cursor: pointer;
      color: ${j(o.textPrimary)};
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
      color: ${j(o.textSecondary)};
      margin: 4px 0;
      align-items: center;
    }

    .phase-sep { color: ${j(o.divider)}; }

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
      background: ${j(o.bgSecondary)};
      border: none;
      font-family: inherit;
      color: ${j(o.textSecondary)};
    }

    .indicator:hover { background: ${j(o.divider)}; }

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
      border-top: 1px solid ${j(o.divider)};
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
      border: 1px solid ${j(o.divider)};
      background: transparent;
      color: ${j(o.textSecondary)};
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .gc-plan-btn:hover {
      background: rgba(255,255,255,0.06);
      color: ${j(o.textPrimary)};
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
      border-top: 1px dashed ${j(o.divider)};
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
      color: ${j(o.textSecondary)};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .phase-val {
      font-size: 11px;
      font-weight: 600;
      color: ${j(o.textPrimary)};
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    .phase-val:hover { text-decoration: underline; }
    .phase-divider {
      border: none;
      border-top: 1px solid ${j(o.divider)};
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
      color: ${j(o.textSecondary)};
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
      color: ${j(o.textPrimary)};
    }
    .energy-side-val:hover { text-decoration: underline; }
    .energy-import { color: #ef5350; }
    .energy-export { color: #66bb6a; }
    .energy-divider-v {
      width: 1px;
      height: 28px;
      background: ${j(o.divider)};
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
      color: ${j(o.textSecondary)};
      text-transform: uppercase;
    }
    .price-val {
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: ${j(o.textPrimary)};
    }
    .price-val:hover { text-decoration: underline; }
    .price-spot { color: #ef5350; }
    .price-export { color: #66bb6a; }

    @media (min-width: 1025px) {
      .detail-section {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid ${j(o.divider)};
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
        border-top: 1px dashed ${j(o.divider)};
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
  `;Me([h({type:Object})],xe.prototype,"data",2);Me([h({type:Boolean})],xe.prototype,"editMode",2);Me([x()],xe.prototype,"pendingServices",2);Me([x()],xe.prototype,"changingServices",2);Me([x()],xe.prototype,"shieldStatus",2);Me([x()],xe.prototype,"shieldQueueCount",2);Me([x()],xe.prototype,"gridDeliveryState",2);Me([x()],xe.prototype,"expandedNodes",2);Me([x()],xe.prototype,"customPositions",2);xe=Me([C("oig-flow-node")],xe);var Il=Object.defineProperty,Bl=Object.getOwnPropertyDescriptor,ct=(e,t,i,n)=>{for(var r=n>1?void 0:n?Bl(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Il(t,i,r),r};function Fl(e,t){return{fromColor:dr[e]||"#9e9e9e",toColor:dr[t]||"#9e9e9e"}}const Nl=K;let ze=class extends S{constructor(){super(...arguments),this.data=In,this.particlesEnabled=!0,this.active=!0,this.editMode=!1,this.lines=[],this.animationId=null,this.lastSpawnTime={},this.particleCount=0,this.MAX_PARTICLES=50,this.onVisibilityChange=()=>{this.updateAnimationState()},this.onLayoutChanged=()=>{this.drawConnectionsDeferred()}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this.onVisibilityChange),this.addEventListener("layout-changed",this.onLayoutChanged)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this.onVisibilityChange),this.removeEventListener("layout-changed",this.onLayoutChanged),this.stopAnimation()}updated(e){e.has("data")&&(this.updateLines(),this.animationId!==null&&this.spawnParticles()),(e.has("active")||e.has("particlesEnabled"))&&this.updateAnimationState(),this.drawConnectionsDeferred()}firstUpdated(){this.updateLines(),this.updateAnimationState(),new ResizeObserver(()=>this.drawConnectionsDeferred()).observe(this)}drawConnectionsDeferred(){requestAnimationFrame(()=>this.drawConnectionsSVG())}getParticlesLayer(){var e;return(e=this.renderRoot)==null?void 0:e.querySelector(".particles-layer")}getGridMetrics(){var a,s;const e=(a=this.renderRoot)==null?void 0:a.querySelector("oig-flow-node");if(!e)return null;const i=(e.renderRoot||e.shadowRoot||e).querySelector(".flow-grid");if(!i)return null;const n=(s=this.renderRoot)==null?void 0:s.querySelector(".canvas-container");if(!n)return null;const r=i.getBoundingClientRect();return r.width===0||r.height===0?null:{grid:i,gridRect:r,canvasRect:n.getBoundingClientRect()}}positionOverlayLayer(e,t,i){const n=t.left-i.left,r=t.top-i.top;e.style.left=`${n}px`,e.style.top=`${r}px`,e.style.width=`${t.width}px`,e.style.height=`${t.height}px`}updateLines(){const e=this.data,t=[],i=e.solarPower>50;t.push({id:"solar-inverter",from:"solar",to:"inverter",color:ht.solar,power:i?e.solarPower:0,params:i?_i(e.solarPower,$i.solar,"solar"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:i});const n=Math.abs(e.batteryPower)>50,r=e.batteryPower>0;t.push({id:"battery-inverter",from:n&&r?"inverter":"battery",to:n&&r?"battery":"inverter",color:ht.battery,power:n?Math.abs(e.batteryPower):0,params:n?_i(e.batteryPower,$i.battery,"battery"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:n});const a=Math.abs(e.gridPower)>50,s=e.gridPower>0;t.push({id:"grid-inverter",from:a?s?"grid":"inverter":"grid",to:a?s?"inverter":"grid":"inverter",color:a?s?ht.grid_import:ht.grid_export:ht.grid_import,power:a?Math.abs(e.gridPower):0,params:a?_i(e.gridPower,$i.grid,"grid"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:a});const l=e.housePower>50;t.push({id:"inverter-house",from:"inverter",to:"house",color:ht.house,power:l?e.housePower:0,params:l?_i(e.housePower,$i.house,"house"):{active:!1,intensity:0,count:0,speed:0,size:0,opacity:0},active:l}),this.lines=t}calcEdgePoint(e,t,i,n){const r=t.x-e.x,a=t.y-e.y;if(r===0&&a===0)return{...e};const s=Math.abs(r),l=Math.abs(a),c=s*n>l*i?i/s:n/l;return{x:e.x+r*c,y:e.y+a*c}}getNodeInfo(e,t,i){const n=e.querySelector(`.node-${i}`);if(!n)return null;const r=n.getBoundingClientRect();return{x:r.left+r.width/2-t.left,y:r.top+r.height/2-t.top,hw:r.width/2,hh:r.height/2}}drawConnectionsSVG(){const e=this.svgEl;if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:n,canvasRect:r}=t;this.positionOverlayLayer(e,n,r),e.setAttribute("viewBox",`0 0 ${n.width} ${n.height}`);const a=this.getParticlesLayer();a&&this.positionOverlayLayer(a,n,r),e.innerHTML="";const s="http://www.w3.org/2000/svg",l=document.createElementNS(s,"defs"),c=document.createElementNS(s,"filter");c.setAttribute("id","neon-glow"),c.setAttribute("x","-50%"),c.setAttribute("y","-50%"),c.setAttribute("width","200%"),c.setAttribute("height","200%");const u=document.createElementNS(s,"feGaussianBlur");u.setAttribute("in","SourceGraphic"),u.setAttribute("stdDeviation","3"),u.setAttribute("result","blur"),c.appendChild(u);const p=document.createElementNS(s,"feMerge"),f=document.createElementNS(s,"feMergeNode");f.setAttribute("in","blur"),p.appendChild(f);const y=document.createElementNS(s,"feMergeNode");y.setAttribute("in","SourceGraphic"),p.appendChild(y),c.appendChild(p),l.appendChild(c),e.appendChild(l);for(const b of this.lines){const g=this.getNodeInfo(i,n,b.from),m=this.getNodeInfo(i,n,b.to);if(!g||!m)continue;const $={x:g.x,y:g.y},P={x:m.x,y:m.y},_=this.calcEdgePoint($,P,g.hw,g.hh),T=this.calcEdgePoint(P,$,m.hw,m.hh),G=T.x-_.x,Q=T.y-_.y,w=Math.sqrt(G*G+Q*Q),q=Math.min(w*.2,40),z=-Q/w,B=G/w,V=(_.x+T.x)/2,Y=(_.y+T.y)/2,R=V+z*q,we=Y+B*q,Ye=`grad-${b.id}`,{fromColor:sn,toColor:on}=Fl(b.from,b.to),Se=document.createElementNS(s,"linearGradient");Se.setAttribute("id",Ye),Se.setAttribute("x1","0%"),Se.setAttribute("y1","0%"),Se.setAttribute("x2","100%"),Se.setAttribute("y2","0%");const At=document.createElementNS(s,"stop");At.setAttribute("offset","0%"),At.setAttribute("stop-color",sn);const It=document.createElementNS(s,"stop");It.setAttribute("offset","100%"),It.setAttribute("stop-color",on),Se.appendChild(At),Se.appendChild(It),l.appendChild(Se);const ye=document.createElementNS(s,"path");if(ye.setAttribute("d",`M ${_.x} ${_.y} Q ${R} ${we} ${T.x} ${T.y}`),ye.setAttribute("stroke",`url(#${Ye})`),ye.setAttribute("stroke-width","3"),ye.setAttribute("stroke-linecap","round"),ye.setAttribute("fill","none"),ye.setAttribute("opacity",b.active?"0.8":"0.18"),b.active&&ye.setAttribute("filter","url(#neon-glow)"),ye.classList.add("flow-line"),b.active||ye.classList.add("flow-line--inactive"),e.appendChild(ye),b.params.active){const Ge=document.createElementNS(s,"polygon");Ge.setAttribute("points",`0,-6 ${6*1.2},0 0,6`),Ge.setAttribute("fill",b.color),Ge.setAttribute("opacity","0.9");const Ue=document.createElementNS(s,"animateMotion");Ue.setAttribute("dur",`${Math.max(1,b.params.speed/1e3)}s`),Ue.setAttribute("repeatCount","indefinite"),Ue.setAttribute("path",`M ${_.x} ${_.y} Q ${R} ${we} ${T.x} ${T.y}`),Ue.setAttribute("rotate","auto"),Ge.appendChild(Ue),e.appendChild(Ge)}}}updateAnimationState(){this.particlesEnabled&&this.active&&!document.hidden&&!ve.reduceMotion?(this.spawnParticles(),this.startAnimation()):this.stopAnimation()}startAnimation(){if(this.animationId!==null)return;const e=()=>{this.spawnParticles(),this.animationId=requestAnimationFrame(e)};this.animationId=requestAnimationFrame(e)}stopAnimation(){this.animationId!==null&&(cancelAnimationFrame(this.animationId),this.animationId=null)}spawnParticles(){if(this.particleCount>=this.MAX_PARTICLES)return;const e=this.getParticlesLayer();if(!e)return;const t=this.getGridMetrics();if(!t)return;const{grid:i,gridRect:n,canvasRect:r}=t;this.positionOverlayLayer(e,n,r);const a=performance.now();for(const s of this.lines){if(!s.params.active)continue;const l=s.params.speed,c=this.lastSpawnTime[s.id]||0;if(a-c<l)continue;const u=this.getNodeInfo(i,n,s.from),p=this.getNodeInfo(i,n,s.to);if(!u||!p)continue;const f={x:u.x,y:u.y},y={x:p.x,y:p.y},b=this.calcEdgePoint(f,y,u.hw,u.hh),g=this.calcEdgePoint(y,f,p.hw,p.hh);this.lastSpawnTime[s.id]=a;const m=s.params.count;for(let $=0;$<m&&!(this.particleCount>=this.MAX_PARTICLES);$++)this.createParticle(e,b,g,s.color,s.params,$*(s.params.speed/m/2))}}createParticle(e,t,i,n,r,a){const s=document.createElement("div");s.className="particle";const l=r.size;s.style.width=`${l}px`,s.style.height=`${l}px`,s.style.background=n,s.style.left=`${t.x}px`,s.style.top=`${t.y}px`,s.style.boxShadow=`0 0 ${l}px ${n}`,s.style.opacity="0",e.appendChild(s),this.particleCount++;const c=r.speed;setTimeout(()=>{let u=!1;const p=()=>{u||(u=!0,s.isConnected&&s.remove(),this.particleCount=Math.max(0,this.particleCount-1))};if(typeof s.animate=="function"){const f=s.animate([{left:`${t.x}px`,top:`${t.y}px`,opacity:0,offset:0},{opacity:r.opacity,offset:.1},{opacity:r.opacity,offset:.9},{left:`${i.x}px`,top:`${i.y}px`,opacity:0,offset:1}],{duration:c,easing:"linear"});f.onfinish=p,f.oncancel=p}else s.style.transition=`left ${c}ms linear, top ${c}ms linear, opacity ${c}ms linear`,s.style.opacity=`${r.opacity}`,requestAnimationFrame(()=>{s.style.left=`${i.x}px`,s.style.top=`${i.y}px`,s.style.opacity="0"}),s.addEventListener("transitionend",p,{once:!0}),window.setTimeout(p,c+50)},a)}render(){return d`
      <div class="canvas-container">
        <div class="flow-grid-wrapper">
          <oig-flow-node .data=${this.data} .editMode=${this.editMode}></oig-flow-node>
        </div>

        <svg class="connections-layer"></svg>

        <div class="particles-layer"></div>
      </div>
    `}resetLayout(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-flow-node");e!=null&&e.resetLayout&&e.resetLayout()}};ze.styles=D`
    :host {
      display: block;
      position: relative;
      width: 100%;
      background: ${Nl(o.bgSecondary)};
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
  `;ct([h({type:Object})],ze.prototype,"data",2);ct([h({type:Boolean})],ze.prototype,"particlesEnabled",2);ct([h({type:Boolean})],ze.prototype,"active",2);ct([h({type:Boolean})],ze.prototype,"editMode",2);ct([x()],ze.prototype,"lines",2);ct([Ji(".connections-layer")],ze.prototype,"svgEl",2);ze=ct([C("oig-flow-canvas")],ze);var Rl=Object.defineProperty,Hl=Object.getOwnPropertyDescriptor,Vn=(e,t,i,n)=>{for(var r=n>1?void 0:n?Hl(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Rl(t,i,r),r};const $e=K;let ii=class extends S{constructor(){super(...arguments),this.data=null,this.open=!1,this.onKeyDown=e=>{e.key==="Escape"&&this.hide()}}show(){this.open=!0}hide(){this.open=!1}onOverlayClick(e){e.target===e.currentTarget&&this.hide()}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.onKeyDown),this.addEventListener("oig-grid-charging-open",()=>this.show())}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this.onKeyDown)}formatTime(e){const t=e.time_from??"--:--",i=e.time_to??"--:--";return`${t} – ${i}`}isBlockActive(e){if(!e.time_from||!e.time_to)return!1;const t=new Date,i=t.toISOString().slice(0,10);if(e.day==="tomorrow")return!1;const n=`${i}T${e.time_from}`,r=`${i}T${e.time_to}`,a=new Date(n),s=new Date(r);return t>=a&&t<s}renderEmpty(){return d`
      <div class="empty-state">
        <div class="empty-icon">🔌</div>
        <div class="empty-text">Žádné plánované nabíjení</div>
        <div class="empty-sub">Plán nabíjení ze sítě není aktivní.</div>
      </div>
    `}renderContent(){const e=this.data;if(!e)return this.renderEmpty();const t=e.blocks.find(i=>this.isBlockActive(i));return d`
      ${e.hasBlocks?d`
        <!-- Summary chips -->
        <div class="summary-row">
          ${e.totalEnergyKwh>0?d`
            <span class="summary-chip energy">⚡ ${e.totalEnergyKwh.toFixed(1)} kWh</span>
          `:E}
          ${e.totalCostCzk>0?d`
            <span class="summary-chip cost">💰 ~${e.totalCostCzk.toFixed(0)} Kč</span>
          `:E}
          ${e.windowLabel?d`
            <span class="summary-chip time">🪟 ${e.windowLabel}</span>
          `:E}
          ${e.durationMinutes>0?d`
            <span class="summary-chip time">⏱️ ${Math.round(e.durationMinutes)} min</span>
          `:E}
        </div>

        <!-- Active block banner -->
        ${t?d`
          <div class="active-block-banner">
            <div class="pulse-dot"></div>
            <span>Probíhá: ${this.formatTime(t)}
              ${t.grid_charge_kwh!=null?` · ${t.grid_charge_kwh.toFixed(1)} kWh`:E}
            </span>
          </div>
        `:E}

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
            ${e.blocks.map((i,n)=>{const r=this.isBlockActive(i);return d`
                <tr class="${r?"is-active":!r&&n===0&&!t?"is-next":""}">
                  <td>${this.formatTime(i)}</td>
                  <td>
                    ${i.day?d`
                      <span class="day-badge ${i.day}">${i.day==="today"?"dnes":"zítra"}</span>
                    `:E}
                  </td>
                  <td>${i.grid_charge_kwh!=null?i.grid_charge_kwh.toFixed(1):"--"}</td>
                  <td>${i.total_cost_czk!=null?`${i.total_cost_czk.toFixed(0)} Kč`:"--"}</td>
                </tr>
              `})}
          </tbody>
        </table>
      `:this.renderEmpty()}
    `}render(){var e;return this.open?d`
      <div class="overlay" @click=${this.onOverlayClick}>
        <div class="dialog" role="dialog" aria-modal="true" aria-label="Plánované síťové nabíjení">
          <div class="dialog-header">
            <span class="dialog-header-icon">🔌</span>
            <div>
              <div class="dialog-header-title">Plánované síťové nabíjení</div>
              ${(e=this.data)!=null&&e.hasBlocks?d`
                <div class="dialog-header-subtitle">
                  ${this.data.blocks.length} blok${this.data.blocks.length>1?"ů":""}
                </div>
              `:E}
            </div>
            <button class="close-btn" @click=${()=>this.hide()} aria-label="Zavřít">✕</button>
          </div>
          <div class="dialog-body">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `:E}};ii.styles=D`
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
      background: ${$e(o.cardBg)};
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
      border-bottom: 1px solid ${$e(o.divider)};
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
      color: ${$e(o.textPrimary)};
    }

    .dialog-header-subtitle {
      font-size: 11px;
      color: ${$e(o.textSecondary)};
      margin-top: 2px;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: ${$e(o.textSecondary)};
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
      color: ${$e(o.textPrimary)};
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
      color: ${$e(o.textSecondary)};
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
      color: ${$e(o.textSecondary)};
      padding: 0 6px 8px;
      border-bottom: 1px solid ${$e(o.divider)};
    }

    .blocks-table th:last-child,
    .blocks-table td:last-child {
      text-align: right;
    }

    .blocks-table td {
      padding: 8px 6px;
      font-size: 12px;
      color: ${$e(o.textPrimary)};
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
      color: ${$e(o.textSecondary)};
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
  `;Vn([h({type:Object})],ii.prototype,"data",2);Vn([x()],ii.prototype,"open",2);ii=Vn([C("oig-grid-charging-dialog")],ii);var Vl=Object.defineProperty,jl=Object.getOwnPropertyDescriptor,de=(e,t,i,n)=>{for(var r=n>1?void 0:n?jl(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Vl(t,i,r),r};const te=K;Xi.register(Gr,Ur,Zr,Kr,Qr,Xr,Jr);let Fe=class extends S{constructor(){super(...arguments),this.values=[],this.color="rgba(76, 175, 80, 1)",this.startTime="",this.endTime="",this.chart=null,this.lastDataKey="",this.initializing=!1}render(){return d`<canvas></canvas>`}firstUpdated(){this.values.length>0&&(this.initializing=!0,requestAnimationFrame(()=>{this.createSparkline(),this.initializing=!1}))}updated(e){this.initializing||(e.has("values")||e.has("color"))&&this.updateOrCreateSparkline()}disconnectedCallback(){super.disconnectedCallback(),this.destroyChart()}updateOrCreateSparkline(){var t,i,n,r;if(!this.canvas||this.values.length===0)return;const e=JSON.stringify({v:this.values,c:this.color});if(!(e===this.lastDataKey&&this.chart)){if(this.lastDataKey=e,(n=(i=(t=this.chart)==null?void 0:t.data)==null?void 0:i.datasets)!=null&&n[0]){const a=this.chart.data.datasets[0];if(!((((r=this.chart.data.labels)==null?void 0:r.length)||0)!==this.values.length)){a.data=this.values,a.borderColor=this.color,a.backgroundColor=this.color.replace("1)","0.2)"),this.chart.update("none");return}}this.destroyChart(),this.createSparkline()}}createSparkline(){if(!this.canvas||this.values.length===0)return;this.destroyChart();const e=this.color,t=this.values,i=new Date(this.startTime),n=t.map((r,a)=>new Date(i.getTime()+a*15*60*1e3).toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}));this.chart=new Xi(this.canvas,{type:"line",data:{labels:n,datasets:[{data:t,borderColor:e,backgroundColor:e.replace("1)","0.2)"),borderWidth:2,fill:!0,tension:.3,pointRadius:0,pointHoverRadius:5}]},plugins:[],options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:0},plugins:{legend:{display:!1},tooltip:{enabled:!0,backgroundColor:"rgba(0, 0, 0, 0.8)",titleColor:"#fff",bodyColor:"#fff",padding:8,displayColors:!1,callbacks:{title:r=>{var a;return((a=r[0])==null?void 0:a.label)||""},label:r=>`${r.parsed.y.toFixed(2)} Kč/kWh`}},datalabels:{display:!1},zoom:{pan:{enabled:!0,mode:"x",modifierKey:"shift"},zoom:{wheel:{enabled:!0,speed:.1},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)"},mode:"x"}}},scales:{x:{display:!1},y:{display:!0,position:"right",grace:"10%",ticks:{color:"rgba(255, 255, 255, 0.6)",font:{size:8},callback:r=>Number(r).toFixed(1),maxTicksLimit:3},grid:{display:!1}}},layout:{padding:0},interaction:{mode:"nearest",intersect:!1}}})}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}};Fe.styles=D`
    :host {
      display: block;
      width: 100%;
      height: 30px;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `;de([h({type:Array})],Fe.prototype,"values",2);de([h({type:String})],Fe.prototype,"color",2);de([h({type:String})],Fe.prototype,"startTime",2);de([h({type:String})],Fe.prototype,"endTime",2);de([Ji("canvas")],Fe.prototype,"canvas",2);Fe=de([C("oig-mini-sparkline")],Fe);let fe=class extends S{constructor(){super(...arguments),this.title="",this.time="",this.valueText="",this.value=0,this.unit="Kč/kWh",this.variant="default",this.clickable=!1,this.startTime="",this.endTime="",this.sparklineValues=[],this.sparklineColor="rgba(76, 175, 80, 1)",this.handleClick=()=>{this.clickable&&this.dispatchEvent(new CustomEvent("card-click",{detail:{startTime:this.startTime,endTime:this.endTime,value:this.value},bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),this.clickable&&this.addEventListener("click",this.handleClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleClick)}render(){const e=this.valueText||`${this.value.toFixed(2)} <span class="stat-unit">${this.unit}</span>`;return d`
      <div class="card-title">${this.title}</div>
      <div class="card-value ${this.variant}" .innerHTML=${e}></div>
      ${this.time?d`<div class="card-time">${this.time}</div>`:E}
      ${this.sparklineValues.length>0?d`
            <div class="sparkline-container">
              <oig-mini-sparkline
                .values=${this.sparklineValues}
                .color=${this.sparklineColor}
                .startTime=${this.startTime}
                .endTime=${this.endTime}
              ></oig-mini-sparkline>
            </div>
          `:E}
    `}};fe.styles=D`
    :host {
      display: block;
      background: ${te(o.cardBg)};
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: ${te(o.cardShadow)};
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
      color: ${te(o.textSecondary)};
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 700;
      color: ${te(o.textPrimary)};
      line-height: 1.2;
    }

    .card-value .stat-unit {
      font-size: 12px;
      font-weight: 400;
      color: ${te(o.textSecondary)};
    }

    .card-value.success { color: #4CAF50; }
    .card-value.warning { color: #FFA726; }
    .card-value.danger { color: #F44336; }
    .card-value.info { color: #29B6F6; }

    .card-time {
      font-size: 10px;
      color: ${te(o.textSecondary)};
      margin-top: 4px;
    }

    .sparkline-container {
      margin-top: 8px;
    }
  `;de([h({type:String})],fe.prototype,"title",2);de([h({type:String})],fe.prototype,"time",2);de([h({type:String})],fe.prototype,"valueText",2);de([h({type:Number})],fe.prototype,"value",2);de([h({type:String})],fe.prototype,"unit",2);de([h({type:String})],fe.prototype,"variant",2);de([h({type:Boolean})],fe.prototype,"clickable",2);de([h({type:String})],fe.prototype,"startTime",2);de([h({type:String})],fe.prototype,"endTime",2);de([h({type:Array})],fe.prototype,"sparklineValues",2);de([h({type:String})],fe.prototype,"sparklineColor",2);fe=de([C("oig-stats-card")],fe);function Wl(e){const t=new Date(e.start),i=new Date(e.end),n=t.toLocaleDateString("cs-CZ",{day:"2-digit",month:"2-digit"}),r=t.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"}),a=i.toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"});return`${n} ${r} - ${a}`}let ni=class extends S{constructor(){super(...arguments),this.data=null,this.topOnly=!1}onCardClick(e){this.dispatchEvent(new CustomEvent("zoom-to-block",{detail:e.detail,bubbles:!0,composed:!0}))}renderPriceTiles(){if(!this.data)return E;const e=this.data.solarForecastTotal>0;return d`
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
          ${e?d`${this.data.solarForecastTotal.toFixed(1)} <span class="price-tile-unit">kWh</span>`:d`-- <span class="price-tile-unit">kWh</span>`}
        </div>
        <div class="price-tile-sub">${e?"Předpověď":"Nedostupná"}</div>
      </div>
    `}renderBlockCard(e,t,i,n){return t?d`
      <oig-stats-card
        title=${e}
        .value=${t.avg}
        unit="Kč/kWh"
        .time=${Wl(t)}
        variant=${i}
        clickable
        .startTime=${t.start}
        .endTime=${t.end}
        .sparklineValues=${t.values}
        .sparklineColor=${n}
        @card-click=${this.onCardClick}
      ></oig-stats-card>
    `:E}renderExtremeBlocks(){if(!this.data)return E;const{cheapestBuyBlock:e,expensiveBuyBlock:t,bestExportBlock:i,worstExportBlock:n}=this.data;return d`
      ${this.renderBlockCard("Nejlevnější nákup",e,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejdražší nákup",t,"danger","rgba(244, 67, 54, 1)")}
      ${this.renderBlockCard("Nejlepší výkup",i,"success","rgba(76, 175, 80, 1)")}
      ${this.renderBlockCard("Nejhorší výkup",n,"warning","rgba(255, 167, 38, 1)")}
    `}renderPlannedConsumption(){var s;const e=(s=this.data)==null?void 0:s.plannedConsumption;if(!e)return E;const t=e.todayTotalKwh,i=e.tomorrowKwh,n=t+(i||0),r=n>0?t/n*100:50,a=n>0?(i||0)/n*100:50;return d`
      <div class="planned-section">
        <div class="section-label" style="margin-bottom: 8px;">Plánovaná spotřeba</div>
        <div class="planned-header">
          <div>
            <div class="planned-main-value">
              ${e.totalPlannedKwh>0?d`${e.totalPlannedKwh.toFixed(1)} <span class="unit">kWh</span>`:"--"}
            </div>
            <div class="planned-profile">${e.profile}</div>
          </div>
          ${e.trendText?d`<div class="planned-trend">${e.trendText}</div>`:E}
        </div>

        <div class="planned-details">
          <div class="planned-detail-item">
            <div class="planned-detail-label">Dnes spotřeba</div>
            <div class="planned-detail-value">${e.todayConsumedKwh.toFixed(1)} kWh</div>
          </div>
          <div class="planned-detail-item">
            <div class="planned-detail-label">Dnes zbývá</div>
            <div class="planned-detail-value">
              ${e.todayPlannedKwh!=null?`${e.todayPlannedKwh.toFixed(1)} kWh`:"--"}
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
                <span>Dnes: ${t.toFixed(1)}</span>
                <span>Zítra: ${i!=null?i.toFixed(1):"--"}</span>
              </div>
            `:E}
      </div>
    `}render(){return!this.data||this.data.timeline.length===0?this.topOnly?E:d`<div style="color: ${o.textSecondary}; padding: 16px;">Načítání cenových dat...</div>`:this.topOnly?d`
        <div class="top-row">
          ${this.renderPriceTiles()}
          ${this.renderExtremeBlocks()}
        </div>
      `:d`${this.renderPlannedConsumption()}`}};ni.styles=D`
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
      background: ${te(o.cardBg)};
      border-radius: 10px;
      padding: 10px 12px;
      box-shadow: ${te(o.cardShadow)};
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 76px;
    }

    .price-tile.spot {
      background: linear-gradient(135deg, ${te(o.accent)}22 0%, ${te(o.accent)}11 100%);
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
      color: ${te(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .price-tile-value {
      font-size: 16px;
      font-weight: 700;
      color: ${te(o.textPrimary)};
      line-height: 1.2;
    }

    .price-tile-unit {
      font-size: 10px;
      font-weight: 400;
      color: ${te(o.textSecondary)};
      opacity: 0.7;
    }

    .price-tile-sub {
      font-size: 9px;
      color: ${te(o.textSecondary)};
      opacity: 0.55;
      margin-top: 3px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: ${te(o.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    /* Planned consumption */
    .planned-section {
      background: ${te(o.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: ${te(o.cardShadow)};
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
      color: ${te(o.textPrimary)};
    }

    .planned-main-value .unit {
      font-size: 12px;
      font-weight: 400;
      color: ${te(o.textSecondary)};
    }

    .planned-trend {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
    }

    .planned-profile {
      font-size: 11px;
      color: ${te(o.textSecondary)};
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
      color: ${te(o.textSecondary)};
      text-transform: uppercase;
    }

    .planned-detail-value {
      font-size: 14px;
      font-weight: 600;
      color: ${te(o.textPrimary)};
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
      color: ${te(o.textSecondary)};
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
  `;de([h({type:Object})],ni.prototype,"data",2);de([h({type:Boolean})],ni.prototype,"topOnly",2);ni=de([C("oig-pricing-stats")],ni);const wa=6048e5,ql=864e5,bi=6e4,yi=36e5,Yl=1e3,Lr=Symbol.for("constructDateFrom");function se(e,t){return typeof e=="function"?e(t):e&&typeof e=="object"&&Lr in e?e[Lr](t):e instanceof Date?new e.constructor(t):new Date(t)}function I(e,t){return se(t||e,e)}function rn(e,t,i){const n=I(e,i==null?void 0:i.in);return isNaN(t)?se((i==null?void 0:i.in)||e,NaN):(t&&n.setDate(n.getDate()+t),n)}function jn(e,t,i){const n=I(e,i==null?void 0:i.in);if(isNaN(t))return se(e,NaN);if(!t)return n;const r=n.getDate(),a=se(e,n.getTime());a.setMonth(n.getMonth()+t+1,0);const s=a.getDate();return r>=s?a:(n.setFullYear(a.getFullYear(),a.getMonth(),r),n)}function Wn(e,t,i){return se(e,+I(e)+t)}function Gl(e,t,i){return Wn(e,t*yi)}let Ul={};function dt(){return Ul}function De(e,t){var l,c,u,p;const i=dt(),n=(t==null?void 0:t.weekStartsOn)??((c=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:c.weekStartsOn)??i.weekStartsOn??((p=(u=i.locale)==null?void 0:u.options)==null?void 0:p.weekStartsOn)??0,r=I(e,t==null?void 0:t.in),a=r.getDay(),s=(a<n?7:0)+a-n;return r.setDate(r.getDate()-s),r.setHours(0,0,0,0),r}function St(e,t){return De(e,{...t,weekStartsOn:1})}function $a(e,t){const i=I(e,t==null?void 0:t.in),n=i.getFullYear(),r=se(i,0);r.setFullYear(n+1,0,4),r.setHours(0,0,0,0);const a=St(r),s=se(i,0);s.setFullYear(n,0,4),s.setHours(0,0,0,0);const l=St(s);return i.getTime()>=a.getTime()?n+1:i.getTime()>=l.getTime()?n:n-1}function Li(e){const t=I(e),i=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()));return i.setUTCFullYear(t.getFullYear()),+e-+i}function ut(e,...t){const i=se.bind(null,t.find(n=>typeof n=="object"));return t.map(i)}function Dn(e,t){const i=I(e,t==null?void 0:t.in);return i.setHours(0,0,0,0),i}function _a(e,t,i){const[n,r]=ut(i==null?void 0:i.in,e,t),a=Dn(n),s=Dn(r),l=+a-Li(a),c=+s-Li(s);return Math.round((l-c)/ql)}function Zl(e,t){const i=$a(e,t),n=se(e,0);return n.setFullYear(i,0,4),n.setHours(0,0,0,0),St(n)}function Kl(e,t,i){const n=I(e,i==null?void 0:i.in);return n.setTime(n.getTime()+t*bi),n}function Ql(e,t,i){return jn(e,t*3,i)}function Xl(e,t,i){return Wn(e,t*1e3)}function Jl(e,t,i){return rn(e,t*7,i)}function ec(e,t,i){return jn(e,t*12,i)}function Xt(e,t){const i=+I(e)-+I(t);return i<0?-1:i>0?1:i}function tc(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function ka(e){return!(!tc(e)&&typeof e!="number"||isNaN(+I(e)))}function ic(e,t,i){const[n,r]=ut(i==null?void 0:i.in,e,t),a=n.getFullYear()-r.getFullYear(),s=n.getMonth()-r.getMonth();return a*12+s}function nc(e,t,i){const[n,r]=ut(i==null?void 0:i.in,e,t);return n.getFullYear()-r.getFullYear()}function Sa(e,t,i){const[n,r]=ut(i==null?void 0:i.in,e,t),a=Ar(n,r),s=Math.abs(_a(n,r));n.setDate(n.getDate()-a*s);const l=+(Ar(n,r)===-a),c=a*(s-l);return c===0?0:c}function Ar(e,t){const i=e.getFullYear()-t.getFullYear()||e.getMonth()-t.getMonth()||e.getDate()-t.getDate()||e.getHours()-t.getHours()||e.getMinutes()-t.getMinutes()||e.getSeconds()-t.getSeconds()||e.getMilliseconds()-t.getMilliseconds();return i<0?-1:i>0?1:i}function vi(e){return t=>{const n=(e?Math[e]:Math.trunc)(t);return n===0?0:n}}function rc(e,t,i){const[n,r]=ut(i==null?void 0:i.in,e,t),a=(+n-+r)/yi;return vi(i==null?void 0:i.roundingMethod)(a)}function qn(e,t){return+I(e)-+I(t)}function ac(e,t,i){const n=qn(e,t)/bi;return vi(i==null?void 0:i.roundingMethod)(n)}function Ca(e,t){const i=I(e,t==null?void 0:t.in);return i.setHours(23,59,59,999),i}function Pa(e,t){const i=I(e,t==null?void 0:t.in),n=i.getMonth();return i.setFullYear(i.getFullYear(),n+1,0),i.setHours(23,59,59,999),i}function sc(e,t){const i=I(e,t==null?void 0:t.in);return+Ca(i,t)==+Pa(i,t)}function Ta(e,t,i){const[n,r,a]=ut(i==null?void 0:i.in,e,e,t),s=Xt(r,a),l=Math.abs(ic(r,a));if(l<1)return 0;r.getMonth()===1&&r.getDate()>27&&r.setDate(30),r.setMonth(r.getMonth()-s*l);let c=Xt(r,a)===-s;sc(n)&&l===1&&Xt(n,a)===1&&(c=!1);const u=s*(l-+c);return u===0?0:u}function oc(e,t,i){const n=Ta(e,t,i)/3;return vi(i==null?void 0:i.roundingMethod)(n)}function lc(e,t,i){const n=qn(e,t)/1e3;return vi(i==null?void 0:i.roundingMethod)(n)}function cc(e,t,i){const n=Sa(e,t,i)/7;return vi(i==null?void 0:i.roundingMethod)(n)}function dc(e,t,i){const[n,r]=ut(i==null?void 0:i.in,e,t),a=Xt(n,r),s=Math.abs(nc(n,r));n.setFullYear(1584),r.setFullYear(1584);const l=Xt(n,r)===-a,c=a*(s-+l);return c===0?0:c}function uc(e,t){const i=I(e,t==null?void 0:t.in),n=i.getMonth(),r=n-n%3;return i.setMonth(r,1),i.setHours(0,0,0,0),i}function pc(e,t){const i=I(e,t==null?void 0:t.in);return i.setDate(1),i.setHours(0,0,0,0),i}function hc(e,t){const i=I(e,t==null?void 0:t.in),n=i.getFullYear();return i.setFullYear(n+1,0,0),i.setHours(23,59,59,999),i}function Da(e,t){const i=I(e,t==null?void 0:t.in);return i.setFullYear(i.getFullYear(),0,1),i.setHours(0,0,0,0),i}function gc(e,t){const i=I(e,t==null?void 0:t.in);return i.setMinutes(59,59,999),i}function fc(e,t){var l,c;const i=dt(),n=i.weekStartsOn??((c=(l=i.locale)==null?void 0:l.options)==null?void 0:c.weekStartsOn)??0,r=I(e,t==null?void 0:t.in),a=r.getDay(),s=(a<n?-7:0)+6-(a-n);return r.setDate(r.getDate()+s),r.setHours(23,59,59,999),r}function mc(e,t){const i=I(e,t==null?void 0:t.in);return i.setSeconds(59,999),i}function bc(e,t){const i=I(e,t==null?void 0:t.in),n=i.getMonth(),r=n-n%3+3;return i.setMonth(r,0),i.setHours(23,59,59,999),i}function yc(e,t){const i=I(e,t==null?void 0:t.in);return i.setMilliseconds(999),i}const vc={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},xc=(e,t,i)=>{let n;const r=vc[e];return typeof r=="string"?n=r:t===1?n=r.one:n=r.other.replace("{{count}}",t.toString()),i!=null&&i.addSuffix?i.comparison&&i.comparison>0?"in "+n:n+" ago":n};function yn(e){return(t={})=>{const i=t.width?String(t.width):e.defaultWidth;return e.formats[i]||e.formats[e.defaultWidth]}}const wc={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},$c={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},_c={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},kc={date:yn({formats:wc,defaultWidth:"full"}),time:yn({formats:$c,defaultWidth:"full"}),dateTime:yn({formats:_c,defaultWidth:"full"})},Sc={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},Cc=(e,t,i,n)=>Sc[e];function qt(e){return(t,i)=>{const n=i!=null&&i.context?String(i.context):"standalone";let r;if(n==="formatting"&&e.formattingValues){const s=e.defaultFormattingWidth||e.defaultWidth,l=i!=null&&i.width?String(i.width):s;r=e.formattingValues[l]||e.formattingValues[s]}else{const s=e.defaultWidth,l=i!=null&&i.width?String(i.width):e.defaultWidth;r=e.values[l]||e.values[s]}const a=e.argumentCallback?e.argumentCallback(t):t;return r[a]}}const Pc={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},Tc={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},Dc={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},Mc={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},Oc={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},Ec={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},zc=(e,t)=>{const i=Number(e),n=i%100;if(n>20||n<10)switch(n%10){case 1:return i+"st";case 2:return i+"nd";case 3:return i+"rd"}return i+"th"},Lc={ordinalNumber:zc,era:qt({values:Pc,defaultWidth:"wide"}),quarter:qt({values:Tc,defaultWidth:"wide",argumentCallback:e=>e-1}),month:qt({values:Dc,defaultWidth:"wide"}),day:qt({values:Mc,defaultWidth:"wide"}),dayPeriod:qt({values:Oc,defaultWidth:"wide",formattingValues:Ec,defaultFormattingWidth:"wide"})};function Yt(e){return(t,i={})=>{const n=i.width,r=n&&e.matchPatterns[n]||e.matchPatterns[e.defaultMatchWidth],a=t.match(r);if(!a)return null;const s=a[0],l=n&&e.parsePatterns[n]||e.parsePatterns[e.defaultParseWidth],c=Array.isArray(l)?Ic(l,f=>f.test(s)):Ac(l,f=>f.test(s));let u;u=e.valueCallback?e.valueCallback(c):c,u=i.valueCallback?i.valueCallback(u):u;const p=t.slice(s.length);return{value:u,rest:p}}}function Ac(e,t){for(const i in e)if(Object.prototype.hasOwnProperty.call(e,i)&&t(e[i]))return i}function Ic(e,t){for(let i=0;i<e.length;i++)if(t(e[i]))return i}function Bc(e){return(t,i={})=>{const n=t.match(e.matchPattern);if(!n)return null;const r=n[0],a=t.match(e.parsePattern);if(!a)return null;let s=e.valueCallback?e.valueCallback(a[0]):a[0];s=i.valueCallback?i.valueCallback(s):s;const l=t.slice(r.length);return{value:s,rest:l}}}const Fc=/^(\d+)(th|st|nd|rd)?/i,Nc=/\d+/i,Rc={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},Hc={any:[/^b/i,/^(a|c)/i]},Vc={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},jc={any:[/1/i,/2/i,/3/i,/4/i]},Wc={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},qc={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},Yc={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},Gc={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},Uc={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},Zc={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},Kc={ordinalNumber:Bc({matchPattern:Fc,parsePattern:Nc,valueCallback:e=>parseInt(e,10)}),era:Yt({matchPatterns:Rc,defaultMatchWidth:"wide",parsePatterns:Hc,defaultParseWidth:"any"}),quarter:Yt({matchPatterns:Vc,defaultMatchWidth:"wide",parsePatterns:jc,defaultParseWidth:"any",valueCallback:e=>e+1}),month:Yt({matchPatterns:Wc,defaultMatchWidth:"wide",parsePatterns:qc,defaultParseWidth:"any"}),day:Yt({matchPatterns:Yc,defaultMatchWidth:"wide",parsePatterns:Gc,defaultParseWidth:"any"}),dayPeriod:Yt({matchPatterns:Uc,defaultMatchWidth:"any",parsePatterns:Zc,defaultParseWidth:"any"})},Ma={code:"en-US",formatDistance:xc,formatLong:kc,formatRelative:Cc,localize:Lc,match:Kc,options:{weekStartsOn:0,firstWeekContainsDate:1}};function Qc(e,t){const i=I(e,t==null?void 0:t.in);return _a(i,Da(i))+1}function Oa(e,t){const i=I(e,t==null?void 0:t.in),n=+St(i)-+Zl(i);return Math.round(n/wa)+1}function Yn(e,t){var p,f,y,b;const i=I(e,t==null?void 0:t.in),n=i.getFullYear(),r=dt(),a=(t==null?void 0:t.firstWeekContainsDate)??((f=(p=t==null?void 0:t.locale)==null?void 0:p.options)==null?void 0:f.firstWeekContainsDate)??r.firstWeekContainsDate??((b=(y=r.locale)==null?void 0:y.options)==null?void 0:b.firstWeekContainsDate)??1,s=se((t==null?void 0:t.in)||e,0);s.setFullYear(n+1,0,a),s.setHours(0,0,0,0);const l=De(s,t),c=se((t==null?void 0:t.in)||e,0);c.setFullYear(n,0,a),c.setHours(0,0,0,0);const u=De(c,t);return+i>=+l?n+1:+i>=+u?n:n-1}function Xc(e,t){var l,c,u,p;const i=dt(),n=(t==null?void 0:t.firstWeekContainsDate)??((c=(l=t==null?void 0:t.locale)==null?void 0:l.options)==null?void 0:c.firstWeekContainsDate)??i.firstWeekContainsDate??((p=(u=i.locale)==null?void 0:u.options)==null?void 0:p.firstWeekContainsDate)??1,r=Yn(e,t),a=se((t==null?void 0:t.in)||e,0);return a.setFullYear(r,0,n),a.setHours(0,0,0,0),De(a,t)}function Ea(e,t){const i=I(e,t==null?void 0:t.in),n=+De(i,t)-+Xc(i,t);return Math.round(n/wa)+1}function Z(e,t){const i=e<0?"-":"",n=Math.abs(e).toString().padStart(t,"0");return i+n}const Ae={y(e,t){const i=e.getFullYear(),n=i>0?i:1-i;return Z(t==="yy"?n%100:n,t.length)},M(e,t){const i=e.getMonth();return t==="M"?String(i+1):Z(i+1,2)},d(e,t){return Z(e.getDate(),t.length)},a(e,t){const i=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.toUpperCase();case"aaa":return i;case"aaaaa":return i[0];case"aaaa":default:return i==="am"?"a.m.":"p.m."}},h(e,t){return Z(e.getHours()%12||12,t.length)},H(e,t){return Z(e.getHours(),t.length)},m(e,t){return Z(e.getMinutes(),t.length)},s(e,t){return Z(e.getSeconds(),t.length)},S(e,t){const i=t.length,n=e.getMilliseconds(),r=Math.trunc(n*Math.pow(10,i-3));return Z(r,t.length)}},gt={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},Ir={G:function(e,t,i){const n=e.getFullYear()>0?1:0;switch(t){case"G":case"GG":case"GGG":return i.era(n,{width:"abbreviated"});case"GGGGG":return i.era(n,{width:"narrow"});case"GGGG":default:return i.era(n,{width:"wide"})}},y:function(e,t,i){if(t==="yo"){const n=e.getFullYear(),r=n>0?n:1-n;return i.ordinalNumber(r,{unit:"year"})}return Ae.y(e,t)},Y:function(e,t,i,n){const r=Yn(e,n),a=r>0?r:1-r;if(t==="YY"){const s=a%100;return Z(s,2)}return t==="Yo"?i.ordinalNumber(a,{unit:"year"}):Z(a,t.length)},R:function(e,t){const i=$a(e);return Z(i,t.length)},u:function(e,t){const i=e.getFullYear();return Z(i,t.length)},Q:function(e,t,i){const n=Math.ceil((e.getMonth()+1)/3);switch(t){case"Q":return String(n);case"QQ":return Z(n,2);case"Qo":return i.ordinalNumber(n,{unit:"quarter"});case"QQQ":return i.quarter(n,{width:"abbreviated",context:"formatting"});case"QQQQQ":return i.quarter(n,{width:"narrow",context:"formatting"});case"QQQQ":default:return i.quarter(n,{width:"wide",context:"formatting"})}},q:function(e,t,i){const n=Math.ceil((e.getMonth()+1)/3);switch(t){case"q":return String(n);case"qq":return Z(n,2);case"qo":return i.ordinalNumber(n,{unit:"quarter"});case"qqq":return i.quarter(n,{width:"abbreviated",context:"standalone"});case"qqqqq":return i.quarter(n,{width:"narrow",context:"standalone"});case"qqqq":default:return i.quarter(n,{width:"wide",context:"standalone"})}},M:function(e,t,i){const n=e.getMonth();switch(t){case"M":case"MM":return Ae.M(e,t);case"Mo":return i.ordinalNumber(n+1,{unit:"month"});case"MMM":return i.month(n,{width:"abbreviated",context:"formatting"});case"MMMMM":return i.month(n,{width:"narrow",context:"formatting"});case"MMMM":default:return i.month(n,{width:"wide",context:"formatting"})}},L:function(e,t,i){const n=e.getMonth();switch(t){case"L":return String(n+1);case"LL":return Z(n+1,2);case"Lo":return i.ordinalNumber(n+1,{unit:"month"});case"LLL":return i.month(n,{width:"abbreviated",context:"standalone"});case"LLLLL":return i.month(n,{width:"narrow",context:"standalone"});case"LLLL":default:return i.month(n,{width:"wide",context:"standalone"})}},w:function(e,t,i,n){const r=Ea(e,n);return t==="wo"?i.ordinalNumber(r,{unit:"week"}):Z(r,t.length)},I:function(e,t,i){const n=Oa(e);return t==="Io"?i.ordinalNumber(n,{unit:"week"}):Z(n,t.length)},d:function(e,t,i){return t==="do"?i.ordinalNumber(e.getDate(),{unit:"date"}):Ae.d(e,t)},D:function(e,t,i){const n=Qc(e);return t==="Do"?i.ordinalNumber(n,{unit:"dayOfYear"}):Z(n,t.length)},E:function(e,t,i){const n=e.getDay();switch(t){case"E":case"EE":case"EEE":return i.day(n,{width:"abbreviated",context:"formatting"});case"EEEEE":return i.day(n,{width:"narrow",context:"formatting"});case"EEEEEE":return i.day(n,{width:"short",context:"formatting"});case"EEEE":default:return i.day(n,{width:"wide",context:"formatting"})}},e:function(e,t,i,n){const r=e.getDay(),a=(r-n.weekStartsOn+8)%7||7;switch(t){case"e":return String(a);case"ee":return Z(a,2);case"eo":return i.ordinalNumber(a,{unit:"day"});case"eee":return i.day(r,{width:"abbreviated",context:"formatting"});case"eeeee":return i.day(r,{width:"narrow",context:"formatting"});case"eeeeee":return i.day(r,{width:"short",context:"formatting"});case"eeee":default:return i.day(r,{width:"wide",context:"formatting"})}},c:function(e,t,i,n){const r=e.getDay(),a=(r-n.weekStartsOn+8)%7||7;switch(t){case"c":return String(a);case"cc":return Z(a,t.length);case"co":return i.ordinalNumber(a,{unit:"day"});case"ccc":return i.day(r,{width:"abbreviated",context:"standalone"});case"ccccc":return i.day(r,{width:"narrow",context:"standalone"});case"cccccc":return i.day(r,{width:"short",context:"standalone"});case"cccc":default:return i.day(r,{width:"wide",context:"standalone"})}},i:function(e,t,i){const n=e.getDay(),r=n===0?7:n;switch(t){case"i":return String(r);case"ii":return Z(r,t.length);case"io":return i.ordinalNumber(r,{unit:"day"});case"iii":return i.day(n,{width:"abbreviated",context:"formatting"});case"iiiii":return i.day(n,{width:"narrow",context:"formatting"});case"iiiiii":return i.day(n,{width:"short",context:"formatting"});case"iiii":default:return i.day(n,{width:"wide",context:"formatting"})}},a:function(e,t,i){const r=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"aaa":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"aaaa":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},b:function(e,t,i){const n=e.getHours();let r;switch(n===12?r=gt.noon:n===0?r=gt.midnight:r=n/12>=1?"pm":"am",t){case"b":case"bb":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"bbb":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"bbbb":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},B:function(e,t,i){const n=e.getHours();let r;switch(n>=17?r=gt.evening:n>=12?r=gt.afternoon:n>=4?r=gt.morning:r=gt.night,t){case"B":case"BB":case"BBB":return i.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"BBBBB":return i.dayPeriod(r,{width:"narrow",context:"formatting"});case"BBBB":default:return i.dayPeriod(r,{width:"wide",context:"formatting"})}},h:function(e,t,i){if(t==="ho"){let n=e.getHours()%12;return n===0&&(n=12),i.ordinalNumber(n,{unit:"hour"})}return Ae.h(e,t)},H:function(e,t,i){return t==="Ho"?i.ordinalNumber(e.getHours(),{unit:"hour"}):Ae.H(e,t)},K:function(e,t,i){const n=e.getHours()%12;return t==="Ko"?i.ordinalNumber(n,{unit:"hour"}):Z(n,t.length)},k:function(e,t,i){let n=e.getHours();return n===0&&(n=24),t==="ko"?i.ordinalNumber(n,{unit:"hour"}):Z(n,t.length)},m:function(e,t,i){return t==="mo"?i.ordinalNumber(e.getMinutes(),{unit:"minute"}):Ae.m(e,t)},s:function(e,t,i){return t==="so"?i.ordinalNumber(e.getSeconds(),{unit:"second"}):Ae.s(e,t)},S:function(e,t){return Ae.S(e,t)},X:function(e,t,i){const n=e.getTimezoneOffset();if(n===0)return"Z";switch(t){case"X":return Fr(n);case"XXXX":case"XX":return et(n);case"XXXXX":case"XXX":default:return et(n,":")}},x:function(e,t,i){const n=e.getTimezoneOffset();switch(t){case"x":return Fr(n);case"xxxx":case"xx":return et(n);case"xxxxx":case"xxx":default:return et(n,":")}},O:function(e,t,i){const n=e.getTimezoneOffset();switch(t){case"O":case"OO":case"OOO":return"GMT"+Br(n,":");case"OOOO":default:return"GMT"+et(n,":")}},z:function(e,t,i){const n=e.getTimezoneOffset();switch(t){case"z":case"zz":case"zzz":return"GMT"+Br(n,":");case"zzzz":default:return"GMT"+et(n,":")}},t:function(e,t,i){const n=Math.trunc(+e/1e3);return Z(n,t.length)},T:function(e,t,i){return Z(+e,t.length)}};function Br(e,t=""){const i=e>0?"-":"+",n=Math.abs(e),r=Math.trunc(n/60),a=n%60;return a===0?i+String(r):i+String(r)+t+Z(a,2)}function Fr(e,t){return e%60===0?(e>0?"-":"+")+Z(Math.abs(e)/60,2):et(e,t)}function et(e,t=""){const i=e>0?"-":"+",n=Math.abs(e),r=Z(Math.trunc(n/60),2),a=Z(n%60,2);return i+r+t+a}const Nr=(e,t)=>{switch(e){case"P":return t.date({width:"short"});case"PP":return t.date({width:"medium"});case"PPP":return t.date({width:"long"});case"PPPP":default:return t.date({width:"full"})}},za=(e,t)=>{switch(e){case"p":return t.time({width:"short"});case"pp":return t.time({width:"medium"});case"ppp":return t.time({width:"long"});case"pppp":default:return t.time({width:"full"})}},Jc=(e,t)=>{const i=e.match(/(P+)(p+)?/)||[],n=i[1],r=i[2];if(!r)return Nr(e,t);let a;switch(n){case"P":a=t.dateTime({width:"short"});break;case"PP":a=t.dateTime({width:"medium"});break;case"PPP":a=t.dateTime({width:"long"});break;case"PPPP":default:a=t.dateTime({width:"full"});break}return a.replace("{{date}}",Nr(n,t)).replace("{{time}}",za(r,t))},Mn={p:za,P:Jc},ed=/^D+$/,td=/^Y+$/,id=["D","DD","YY","YYYY"];function La(e){return ed.test(e)}function Aa(e){return td.test(e)}function On(e,t,i){const n=nd(e,t,i);if(console.warn(n),id.includes(e))throw new RangeError(n)}function nd(e,t,i){const n=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${t}\`) for formatting ${n} to the input \`${i}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const rd=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,ad=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,sd=/^'([^]*?)'?$/,od=/''/g,ld=/[a-zA-Z]/;function cd(e,t,i){var p,f,y,b,g,m,$,P;const n=dt(),r=(i==null?void 0:i.locale)??n.locale??Ma,a=(i==null?void 0:i.firstWeekContainsDate)??((f=(p=i==null?void 0:i.locale)==null?void 0:p.options)==null?void 0:f.firstWeekContainsDate)??n.firstWeekContainsDate??((b=(y=n.locale)==null?void 0:y.options)==null?void 0:b.firstWeekContainsDate)??1,s=(i==null?void 0:i.weekStartsOn)??((m=(g=i==null?void 0:i.locale)==null?void 0:g.options)==null?void 0:m.weekStartsOn)??n.weekStartsOn??((P=($=n.locale)==null?void 0:$.options)==null?void 0:P.weekStartsOn)??0,l=I(e,i==null?void 0:i.in);if(!ka(l))throw new RangeError("Invalid time value");let c=t.match(ad).map(_=>{const T=_[0];if(T==="p"||T==="P"){const G=Mn[T];return G(_,r.formatLong)}return _}).join("").match(rd).map(_=>{if(_==="''")return{isToken:!1,value:"'"};const T=_[0];if(T==="'")return{isToken:!1,value:dd(_)};if(Ir[T])return{isToken:!0,value:_};if(T.match(ld))throw new RangeError("Format string contains an unescaped latin alphabet character `"+T+"`");return{isToken:!1,value:_}});r.localize.preprocessor&&(c=r.localize.preprocessor(l,c));const u={firstWeekContainsDate:a,weekStartsOn:s,locale:r};return c.map(_=>{if(!_.isToken)return _.value;const T=_.value;(!(i!=null&&i.useAdditionalWeekYearTokens)&&Aa(T)||!(i!=null&&i.useAdditionalDayOfYearTokens)&&La(T))&&On(T,t,String(e));const G=Ir[T[0]];return G(l,T,r.localize,u)}).join("")}function dd(e){const t=e.match(sd);return t?t[1].replace(od,"'"):e}function ud(){return Object.assign({},dt())}function pd(e,t){const i=I(e,t==null?void 0:t.in).getDay();return i===0?7:i}function hd(e,t){const i=gd(t)?new t(0):se(t,0);return i.setFullYear(e.getFullYear(),e.getMonth(),e.getDate()),i.setHours(e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()),i}function gd(e){var t;return typeof e=="function"&&((t=e.prototype)==null?void 0:t.constructor)===e}const fd=10;class Ia{constructor(){k(this,"subPriority",0)}validate(t,i){return!0}}class md extends Ia{constructor(t,i,n,r,a){super(),this.value=t,this.validateValue=i,this.setValue=n,this.priority=r,a&&(this.subPriority=a)}validate(t,i){return this.validateValue(t,this.value,i)}set(t,i,n){return this.setValue(t,i,this.value,n)}}class bd extends Ia{constructor(i,n){super();k(this,"priority",fd);k(this,"subPriority",-1);this.context=i||(r=>se(n,r))}set(i,n){return n.timestampIsSet?i:se(i,hd(i,this.context))}}class U{run(t,i,n,r){const a=this.parse(t,i,n,r);return a?{setter:new md(a.value,this.validate,this.set,this.priority,this.subPriority),rest:a.rest}:null}validate(t,i,n){return!0}}class yd extends U{constructor(){super(...arguments);k(this,"priority",140);k(this,"incompatibleTokens",["R","u","t","T"])}parse(i,n,r){switch(n){case"G":case"GG":case"GGG":return r.era(i,{width:"abbreviated"})||r.era(i,{width:"narrow"});case"GGGGG":return r.era(i,{width:"narrow"});case"GGGG":default:return r.era(i,{width:"wide"})||r.era(i,{width:"abbreviated"})||r.era(i,{width:"narrow"})}}set(i,n,r){return n.era=r,i.setFullYear(r,0,1),i.setHours(0,0,0,0),i}}const le={month:/^(1[0-2]|0?\d)/,date:/^(3[0-1]|[0-2]?\d)/,dayOfYear:/^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,week:/^(5[0-3]|[0-4]?\d)/,hour23h:/^(2[0-3]|[0-1]?\d)/,hour24h:/^(2[0-4]|[0-1]?\d)/,hour11h:/^(1[0-1]|0?\d)/,hour12h:/^(1[0-2]|0?\d)/,minute:/^[0-5]?\d/,second:/^[0-5]?\d/,singleDigit:/^\d/,twoDigits:/^\d{1,2}/,threeDigits:/^\d{1,3}/,fourDigits:/^\d{1,4}/,anyDigitsSigned:/^-?\d+/,singleDigitSigned:/^-?\d/,twoDigitsSigned:/^-?\d{1,2}/,threeDigitsSigned:/^-?\d{1,3}/,fourDigitsSigned:/^-?\d{1,4}/},Ce={basicOptionalMinutes:/^([+-])(\d{2})(\d{2})?|Z/,basic:/^([+-])(\d{2})(\d{2})|Z/,basicOptionalSeconds:/^([+-])(\d{2})(\d{2})((\d{2}))?|Z/,extended:/^([+-])(\d{2}):(\d{2})|Z/,extendedOptionalSeconds:/^([+-])(\d{2}):(\d{2})(:(\d{2}))?|Z/};function ce(e,t){return e&&{value:t(e.value),rest:e.rest}}function ne(e,t){const i=t.match(e);return i?{value:parseInt(i[0],10),rest:t.slice(i[0].length)}:null}function Pe(e,t){const i=t.match(e);if(!i)return null;if(i[0]==="Z")return{value:0,rest:t.slice(1)};const n=i[1]==="+"?1:-1,r=i[2]?parseInt(i[2],10):0,a=i[3]?parseInt(i[3],10):0,s=i[5]?parseInt(i[5],10):0;return{value:n*(r*yi+a*bi+s*Yl),rest:t.slice(i[0].length)}}function Ba(e){return ne(le.anyDigitsSigned,e)}function oe(e,t){switch(e){case 1:return ne(le.singleDigit,t);case 2:return ne(le.twoDigits,t);case 3:return ne(le.threeDigits,t);case 4:return ne(le.fourDigits,t);default:return ne(new RegExp("^\\d{1,"+e+"}"),t)}}function Ai(e,t){switch(e){case 1:return ne(le.singleDigitSigned,t);case 2:return ne(le.twoDigitsSigned,t);case 3:return ne(le.threeDigitsSigned,t);case 4:return ne(le.fourDigitsSigned,t);default:return ne(new RegExp("^-?\\d{1,"+e+"}"),t)}}function Gn(e){switch(e){case"morning":return 4;case"evening":return 17;case"pm":case"noon":case"afternoon":return 12;case"am":case"midnight":case"night":default:return 0}}function Fa(e,t){const i=t>0,n=i?t:1-t;let r;if(n<=50)r=e||100;else{const a=n+50,s=Math.trunc(a/100)*100,l=e>=a%100;r=e+s-(l?100:0)}return i?r:1-r}function Na(e){return e%400===0||e%4===0&&e%100!==0}class vd extends U{constructor(){super(...arguments);k(this,"priority",130);k(this,"incompatibleTokens",["Y","R","u","w","I","i","e","c","t","T"])}parse(i,n,r){const a=s=>({year:s,isTwoDigitYear:n==="yy"});switch(n){case"y":return ce(oe(4,i),a);case"yo":return ce(r.ordinalNumber(i,{unit:"year"}),a);default:return ce(oe(n.length,i),a)}}validate(i,n){return n.isTwoDigitYear||n.year>0}set(i,n,r){const a=i.getFullYear();if(r.isTwoDigitYear){const l=Fa(r.year,a);return i.setFullYear(l,0,1),i.setHours(0,0,0,0),i}const s=!("era"in n)||n.era===1?r.year:1-r.year;return i.setFullYear(s,0,1),i.setHours(0,0,0,0),i}}class xd extends U{constructor(){super(...arguments);k(this,"priority",130);k(this,"incompatibleTokens",["y","R","u","Q","q","M","L","I","d","D","i","t","T"])}parse(i,n,r){const a=s=>({year:s,isTwoDigitYear:n==="YY"});switch(n){case"Y":return ce(oe(4,i),a);case"Yo":return ce(r.ordinalNumber(i,{unit:"year"}),a);default:return ce(oe(n.length,i),a)}}validate(i,n){return n.isTwoDigitYear||n.year>0}set(i,n,r,a){const s=Yn(i,a);if(r.isTwoDigitYear){const c=Fa(r.year,s);return i.setFullYear(c,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),De(i,a)}const l=!("era"in n)||n.era===1?r.year:1-r.year;return i.setFullYear(l,0,a.firstWeekContainsDate),i.setHours(0,0,0,0),De(i,a)}}class wd extends U{constructor(){super(...arguments);k(this,"priority",130);k(this,"incompatibleTokens",["G","y","Y","u","Q","q","M","L","w","d","D","e","c","t","T"])}parse(i,n){return Ai(n==="R"?4:n.length,i)}set(i,n,r){const a=se(i,0);return a.setFullYear(r,0,4),a.setHours(0,0,0,0),St(a)}}class $d extends U{constructor(){super(...arguments);k(this,"priority",130);k(this,"incompatibleTokens",["G","y","Y","R","w","I","i","e","c","t","T"])}parse(i,n){return Ai(n==="u"?4:n.length,i)}set(i,n,r){return i.setFullYear(r,0,1),i.setHours(0,0,0,0),i}}class _d extends U{constructor(){super(...arguments);k(this,"priority",120);k(this,"incompatibleTokens",["Y","R","q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"Q":case"QQ":return oe(n.length,i);case"Qo":return r.ordinalNumber(i,{unit:"quarter"});case"QQQ":return r.quarter(i,{width:"abbreviated",context:"formatting"})||r.quarter(i,{width:"narrow",context:"formatting"});case"QQQQQ":return r.quarter(i,{width:"narrow",context:"formatting"});case"QQQQ":default:return r.quarter(i,{width:"wide",context:"formatting"})||r.quarter(i,{width:"abbreviated",context:"formatting"})||r.quarter(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=1&&n<=4}set(i,n,r){return i.setMonth((r-1)*3,1),i.setHours(0,0,0,0),i}}class kd extends U{constructor(){super(...arguments);k(this,"priority",120);k(this,"incompatibleTokens",["Y","R","Q","M","L","w","I","d","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"q":case"qq":return oe(n.length,i);case"qo":return r.ordinalNumber(i,{unit:"quarter"});case"qqq":return r.quarter(i,{width:"abbreviated",context:"standalone"})||r.quarter(i,{width:"narrow",context:"standalone"});case"qqqqq":return r.quarter(i,{width:"narrow",context:"standalone"});case"qqqq":default:return r.quarter(i,{width:"wide",context:"standalone"})||r.quarter(i,{width:"abbreviated",context:"standalone"})||r.quarter(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=1&&n<=4}set(i,n,r){return i.setMonth((r-1)*3,1),i.setHours(0,0,0,0),i}}class Sd extends U{constructor(){super(...arguments);k(this,"incompatibleTokens",["Y","R","q","Q","L","w","I","D","i","e","c","t","T"]);k(this,"priority",110)}parse(i,n,r){const a=s=>s-1;switch(n){case"M":return ce(ne(le.month,i),a);case"MM":return ce(oe(2,i),a);case"Mo":return ce(r.ordinalNumber(i,{unit:"month"}),a);case"MMM":return r.month(i,{width:"abbreviated",context:"formatting"})||r.month(i,{width:"narrow",context:"formatting"});case"MMMMM":return r.month(i,{width:"narrow",context:"formatting"});case"MMMM":default:return r.month(i,{width:"wide",context:"formatting"})||r.month(i,{width:"abbreviated",context:"formatting"})||r.month(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.setMonth(r,1),i.setHours(0,0,0,0),i}}class Cd extends U{constructor(){super(...arguments);k(this,"priority",110);k(this,"incompatibleTokens",["Y","R","q","Q","M","w","I","D","i","e","c","t","T"])}parse(i,n,r){const a=s=>s-1;switch(n){case"L":return ce(ne(le.month,i),a);case"LL":return ce(oe(2,i),a);case"Lo":return ce(r.ordinalNumber(i,{unit:"month"}),a);case"LLL":return r.month(i,{width:"abbreviated",context:"standalone"})||r.month(i,{width:"narrow",context:"standalone"});case"LLLLL":return r.month(i,{width:"narrow",context:"standalone"});case"LLLL":default:return r.month(i,{width:"wide",context:"standalone"})||r.month(i,{width:"abbreviated",context:"standalone"})||r.month(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.setMonth(r,1),i.setHours(0,0,0,0),i}}function Pd(e,t,i){const n=I(e,i==null?void 0:i.in),r=Ea(n,i)-t;return n.setDate(n.getDate()-r*7),I(n,i==null?void 0:i.in)}class Td extends U{constructor(){super(...arguments);k(this,"priority",100);k(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","i","t","T"])}parse(i,n,r){switch(n){case"w":return ne(le.week,i);case"wo":return r.ordinalNumber(i,{unit:"week"});default:return oe(n.length,i)}}validate(i,n){return n>=1&&n<=53}set(i,n,r,a){return De(Pd(i,r,a),a)}}function Dd(e,t,i){const n=I(e,i==null?void 0:i.in),r=Oa(n,i)-t;return n.setDate(n.getDate()-r*7),n}class Md extends U{constructor(){super(...arguments);k(this,"priority",100);k(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","e","c","t","T"])}parse(i,n,r){switch(n){case"I":return ne(le.week,i);case"Io":return r.ordinalNumber(i,{unit:"week"});default:return oe(n.length,i)}}validate(i,n){return n>=1&&n<=53}set(i,n,r){return St(Dd(i,r))}}const Od=[31,28,31,30,31,30,31,31,30,31,30,31],Ed=[31,29,31,30,31,30,31,31,30,31,30,31];class zd extends U{constructor(){super(...arguments);k(this,"priority",90);k(this,"subPriority",1);k(this,"incompatibleTokens",["Y","R","q","Q","w","I","D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"d":return ne(le.date,i);case"do":return r.ordinalNumber(i,{unit:"date"});default:return oe(n.length,i)}}validate(i,n){const r=i.getFullYear(),a=Na(r),s=i.getMonth();return a?n>=1&&n<=Ed[s]:n>=1&&n<=Od[s]}set(i,n,r){return i.setDate(r),i.setHours(0,0,0,0),i}}class Ld extends U{constructor(){super(...arguments);k(this,"priority",90);k(this,"subpriority",1);k(this,"incompatibleTokens",["Y","R","q","Q","M","L","w","I","d","E","i","e","c","t","T"])}parse(i,n,r){switch(n){case"D":case"DD":return ne(le.dayOfYear,i);case"Do":return r.ordinalNumber(i,{unit:"date"});default:return oe(n.length,i)}}validate(i,n){const r=i.getFullYear();return Na(r)?n>=1&&n<=366:n>=1&&n<=365}set(i,n,r){return i.setMonth(0,r),i.setHours(0,0,0,0),i}}function Un(e,t,i){var f,y,b,g;const n=dt(),r=(i==null?void 0:i.weekStartsOn)??((y=(f=i==null?void 0:i.locale)==null?void 0:f.options)==null?void 0:y.weekStartsOn)??n.weekStartsOn??((g=(b=n.locale)==null?void 0:b.options)==null?void 0:g.weekStartsOn)??0,a=I(e,i==null?void 0:i.in),s=a.getDay(),c=(t%7+7)%7,u=7-r,p=t<0||t>6?t-(s+u)%7:(c+u)%7-(s+u)%7;return rn(a,p,i)}class Ad extends U{constructor(){super(...arguments);k(this,"priority",90);k(this,"incompatibleTokens",["D","i","e","c","t","T"])}parse(i,n,r){switch(n){case"E":case"EE":case"EEE":return r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"EEEEE":return r.day(i,{width:"narrow",context:"formatting"});case"EEEEEE":return r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"EEEE":default:return r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=Un(i,r,a),i.setHours(0,0,0,0),i}}class Id extends U{constructor(){super(...arguments);k(this,"priority",90);k(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","c","t","T"])}parse(i,n,r,a){const s=l=>{const c=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+c};switch(n){case"e":case"ee":return ce(oe(n.length,i),s);case"eo":return ce(r.ordinalNumber(i,{unit:"day"}),s);case"eee":return r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"eeeee":return r.day(i,{width:"narrow",context:"formatting"});case"eeeeee":return r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"});case"eeee":default:return r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=Un(i,r,a),i.setHours(0,0,0,0),i}}class Bd extends U{constructor(){super(...arguments);k(this,"priority",90);k(this,"incompatibleTokens",["y","R","u","q","Q","M","L","I","d","D","E","i","e","t","T"])}parse(i,n,r,a){const s=l=>{const c=Math.floor((l-1)/7)*7;return(l+a.weekStartsOn+6)%7+c};switch(n){case"c":case"cc":return ce(oe(n.length,i),s);case"co":return ce(r.ordinalNumber(i,{unit:"day"}),s);case"ccc":return r.day(i,{width:"abbreviated",context:"standalone"})||r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"});case"ccccc":return r.day(i,{width:"narrow",context:"standalone"});case"cccccc":return r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"});case"cccc":default:return r.day(i,{width:"wide",context:"standalone"})||r.day(i,{width:"abbreviated",context:"standalone"})||r.day(i,{width:"short",context:"standalone"})||r.day(i,{width:"narrow",context:"standalone"})}}validate(i,n){return n>=0&&n<=6}set(i,n,r,a){return i=Un(i,r,a),i.setHours(0,0,0,0),i}}function Fd(e,t,i){const n=I(e,i==null?void 0:i.in),r=pd(n,i),a=t-r;return rn(n,a,i)}class Nd extends U{constructor(){super(...arguments);k(this,"priority",90);k(this,"incompatibleTokens",["y","Y","u","q","Q","M","L","w","d","D","E","e","c","t","T"])}parse(i,n,r){const a=s=>s===0?7:s;switch(n){case"i":case"ii":return oe(n.length,i);case"io":return r.ordinalNumber(i,{unit:"day"});case"iii":return ce(r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a);case"iiiii":return ce(r.day(i,{width:"narrow",context:"formatting"}),a);case"iiiiii":return ce(r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a);case"iiii":default:return ce(r.day(i,{width:"wide",context:"formatting"})||r.day(i,{width:"abbreviated",context:"formatting"})||r.day(i,{width:"short",context:"formatting"})||r.day(i,{width:"narrow",context:"formatting"}),a)}}validate(i,n){return n>=1&&n<=7}set(i,n,r){return i=Fd(i,r),i.setHours(0,0,0,0),i}}class Rd extends U{constructor(){super(...arguments);k(this,"priority",80);k(this,"incompatibleTokens",["b","B","H","k","t","T"])}parse(i,n,r){switch(n){case"a":case"aa":case"aaa":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaaa":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaa":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(Gn(r),0,0,0),i}}class Hd extends U{constructor(){super(...arguments);k(this,"priority",80);k(this,"incompatibleTokens",["a","B","H","k","t","T"])}parse(i,n,r){switch(n){case"b":case"bb":case"bbb":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbbb":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbb":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(Gn(r),0,0,0),i}}class Vd extends U{constructor(){super(...arguments);k(this,"priority",80);k(this,"incompatibleTokens",["a","b","t","T"])}parse(i,n,r){switch(n){case"B":case"BB":case"BBB":return r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBBB":return r.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBB":default:return r.dayPeriod(i,{width:"wide",context:"formatting"})||r.dayPeriod(i,{width:"abbreviated",context:"formatting"})||r.dayPeriod(i,{width:"narrow",context:"formatting"})}}set(i,n,r){return i.setHours(Gn(r),0,0,0),i}}class jd extends U{constructor(){super(...arguments);k(this,"priority",70);k(this,"incompatibleTokens",["H","K","k","t","T"])}parse(i,n,r){switch(n){case"h":return ne(le.hour12h,i);case"ho":return r.ordinalNumber(i,{unit:"hour"});default:return oe(n.length,i)}}validate(i,n){return n>=1&&n<=12}set(i,n,r){const a=i.getHours()>=12;return a&&r<12?i.setHours(r+12,0,0,0):!a&&r===12?i.setHours(0,0,0,0):i.setHours(r,0,0,0),i}}class Wd extends U{constructor(){super(...arguments);k(this,"priority",70);k(this,"incompatibleTokens",["a","b","h","K","k","t","T"])}parse(i,n,r){switch(n){case"H":return ne(le.hour23h,i);case"Ho":return r.ordinalNumber(i,{unit:"hour"});default:return oe(n.length,i)}}validate(i,n){return n>=0&&n<=23}set(i,n,r){return i.setHours(r,0,0,0),i}}class qd extends U{constructor(){super(...arguments);k(this,"priority",70);k(this,"incompatibleTokens",["h","H","k","t","T"])}parse(i,n,r){switch(n){case"K":return ne(le.hour11h,i);case"Ko":return r.ordinalNumber(i,{unit:"hour"});default:return oe(n.length,i)}}validate(i,n){return n>=0&&n<=11}set(i,n,r){return i.getHours()>=12&&r<12?i.setHours(r+12,0,0,0):i.setHours(r,0,0,0),i}}class Yd extends U{constructor(){super(...arguments);k(this,"priority",70);k(this,"incompatibleTokens",["a","b","h","H","K","t","T"])}parse(i,n,r){switch(n){case"k":return ne(le.hour24h,i);case"ko":return r.ordinalNumber(i,{unit:"hour"});default:return oe(n.length,i)}}validate(i,n){return n>=1&&n<=24}set(i,n,r){const a=r<=24?r%24:r;return i.setHours(a,0,0,0),i}}class Gd extends U{constructor(){super(...arguments);k(this,"priority",60);k(this,"incompatibleTokens",["t","T"])}parse(i,n,r){switch(n){case"m":return ne(le.minute,i);case"mo":return r.ordinalNumber(i,{unit:"minute"});default:return oe(n.length,i)}}validate(i,n){return n>=0&&n<=59}set(i,n,r){return i.setMinutes(r,0,0),i}}class Ud extends U{constructor(){super(...arguments);k(this,"priority",50);k(this,"incompatibleTokens",["t","T"])}parse(i,n,r){switch(n){case"s":return ne(le.second,i);case"so":return r.ordinalNumber(i,{unit:"second"});default:return oe(n.length,i)}}validate(i,n){return n>=0&&n<=59}set(i,n,r){return i.setSeconds(r,0),i}}class Zd extends U{constructor(){super(...arguments);k(this,"priority",30);k(this,"incompatibleTokens",["t","T"])}parse(i,n){const r=a=>Math.trunc(a*Math.pow(10,-n.length+3));return ce(oe(n.length,i),r)}set(i,n,r){return i.setMilliseconds(r),i}}class Kd extends U{constructor(){super(...arguments);k(this,"priority",10);k(this,"incompatibleTokens",["t","T","x"])}parse(i,n){switch(n){case"X":return Pe(Ce.basicOptionalMinutes,i);case"XX":return Pe(Ce.basic,i);case"XXXX":return Pe(Ce.basicOptionalSeconds,i);case"XXXXX":return Pe(Ce.extendedOptionalSeconds,i);case"XXX":default:return Pe(Ce.extended,i)}}set(i,n,r){return n.timestampIsSet?i:se(i,i.getTime()-Li(i)-r)}}class Qd extends U{constructor(){super(...arguments);k(this,"priority",10);k(this,"incompatibleTokens",["t","T","X"])}parse(i,n){switch(n){case"x":return Pe(Ce.basicOptionalMinutes,i);case"xx":return Pe(Ce.basic,i);case"xxxx":return Pe(Ce.basicOptionalSeconds,i);case"xxxxx":return Pe(Ce.extendedOptionalSeconds,i);case"xxx":default:return Pe(Ce.extended,i)}}set(i,n,r){return n.timestampIsSet?i:se(i,i.getTime()-Li(i)-r)}}class Xd extends U{constructor(){super(...arguments);k(this,"priority",40);k(this,"incompatibleTokens","*")}parse(i){return Ba(i)}set(i,n,r){return[se(i,r*1e3),{timestampIsSet:!0}]}}class Jd extends U{constructor(){super(...arguments);k(this,"priority",20);k(this,"incompatibleTokens","*")}parse(i){return Ba(i)}set(i,n,r){return[se(i,r),{timestampIsSet:!0}]}}const eu={G:new yd,y:new vd,Y:new xd,R:new wd,u:new $d,Q:new _d,q:new kd,M:new Sd,L:new Cd,w:new Td,I:new Md,d:new zd,D:new Ld,E:new Ad,e:new Id,c:new Bd,i:new Nd,a:new Rd,b:new Hd,B:new Vd,h:new jd,H:new Wd,K:new qd,k:new Yd,m:new Gd,s:new Ud,S:new Zd,X:new Kd,x:new Qd,t:new Xd,T:new Jd},tu=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,iu=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,nu=/^'([^]*?)'?$/,ru=/''/g,au=/\S/,su=/[a-zA-Z]/;function ou(e,t,i,n){var $,P,_,T,G,Q,w,q;const r=()=>se((n==null?void 0:n.in)||i,NaN),a=ud(),s=(n==null?void 0:n.locale)??a.locale??Ma,l=(n==null?void 0:n.firstWeekContainsDate)??((P=($=n==null?void 0:n.locale)==null?void 0:$.options)==null?void 0:P.firstWeekContainsDate)??a.firstWeekContainsDate??((T=(_=a.locale)==null?void 0:_.options)==null?void 0:T.firstWeekContainsDate)??1,c=(n==null?void 0:n.weekStartsOn)??((Q=(G=n==null?void 0:n.locale)==null?void 0:G.options)==null?void 0:Q.weekStartsOn)??a.weekStartsOn??((q=(w=a.locale)==null?void 0:w.options)==null?void 0:q.weekStartsOn)??0;if(!t)return e?r():I(i,n==null?void 0:n.in);const u={firstWeekContainsDate:l,weekStartsOn:c,locale:s},p=[new bd(n==null?void 0:n.in,i)],f=t.match(iu).map(z=>{const B=z[0];if(B in Mn){const V=Mn[B];return V(z,s.formatLong)}return z}).join("").match(tu),y=[];for(let z of f){!(n!=null&&n.useAdditionalWeekYearTokens)&&Aa(z)&&On(z,t,e),!(n!=null&&n.useAdditionalDayOfYearTokens)&&La(z)&&On(z,t,e);const B=z[0],V=eu[B];if(V){const{incompatibleTokens:Y}=V;if(Array.isArray(Y)){const we=y.find(Ye=>Y.includes(Ye.token)||Ye.token===B);if(we)throw new RangeError(`The format string mustn't contain \`${we.fullToken}\` and \`${z}\` at the same time`)}else if(V.incompatibleTokens==="*"&&y.length>0)throw new RangeError(`The format string mustn't contain \`${z}\` and any other token at the same time`);y.push({token:B,fullToken:z});const R=V.run(e,z,s.match,u);if(!R)return r();p.push(R.setter),e=R.rest}else{if(B.match(su))throw new RangeError("Format string contains an unescaped latin alphabet character `"+B+"`");if(z==="''"?z="'":B==="'"&&(z=lu(z)),e.indexOf(z)===0)e=e.slice(z.length);else return r()}}if(e.length>0&&au.test(e))return r();const b=p.map(z=>z.priority).sort((z,B)=>B-z).filter((z,B,V)=>V.indexOf(z)===B).map(z=>p.filter(B=>B.priority===z).sort((B,V)=>V.subPriority-B.subPriority)).map(z=>z[0]);let g=I(i,n==null?void 0:n.in);if(isNaN(+g))return r();const m={};for(const z of b){if(!z.validate(g,u))return r();const B=z.set(g,m,u);Array.isArray(B)?(g=B[0],Object.assign(m,B[1])):g=B}return g}function lu(e){return e.match(nu)[1].replace(ru,"'")}function cu(e,t){const i=I(e,t==null?void 0:t.in);return i.setMinutes(0,0,0),i}function du(e,t){const i=I(e,t==null?void 0:t.in);return i.setSeconds(0,0),i}function uu(e,t){const i=I(e,t==null?void 0:t.in);return i.setMilliseconds(0),i}function pu(e,t){const i=()=>se(t==null?void 0:t.in,NaN),n=(t==null?void 0:t.additionalDigits)??2,r=mu(e);let a;if(r.date){const u=bu(r.date,n);a=yu(u.restDateString,u.year)}if(!a||isNaN(+a))return i();const s=+a;let l=0,c;if(r.time&&(l=vu(r.time),isNaN(l)))return i();if(r.timezone){if(c=xu(r.timezone),isNaN(c))return i()}else{const u=new Date(s+l),p=I(0,t==null?void 0:t.in);return p.setFullYear(u.getUTCFullYear(),u.getUTCMonth(),u.getUTCDate()),p.setHours(u.getUTCHours(),u.getUTCMinutes(),u.getUTCSeconds(),u.getUTCMilliseconds()),p}return I(s+l+c,t==null?void 0:t.in)}const Ci={dateTimeDelimiter:/[T ]/,timeZoneDelimiter:/[Z ]/i,timezone:/([Z+-].*)$/},hu=/^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/,gu=/^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/,fu=/^([+-])(\d{2})(?::?(\d{2}))?$/;function mu(e){const t={},i=e.split(Ci.dateTimeDelimiter);let n;if(i.length>2)return t;if(/:/.test(i[0])?n=i[0]:(t.date=i[0],n=i[1],Ci.timeZoneDelimiter.test(t.date)&&(t.date=e.split(Ci.timeZoneDelimiter)[0],n=e.substr(t.date.length,e.length))),n){const r=Ci.timezone.exec(n);r?(t.time=n.replace(r[1],""),t.timezone=r[1]):t.time=n}return t}function bu(e,t){const i=new RegExp("^(?:(\\d{4}|[+-]\\d{"+(4+t)+"})|(\\d{2}|[+-]\\d{"+(2+t)+"})$)"),n=e.match(i);if(!n)return{year:NaN,restDateString:""};const r=n[1]?parseInt(n[1]):null,a=n[2]?parseInt(n[2]):null;return{year:a===null?r:a*100,restDateString:e.slice((n[1]||n[2]).length)}}function yu(e,t){if(t===null)return new Date(NaN);const i=e.match(hu);if(!i)return new Date(NaN);const n=!!i[4],r=Gt(i[1]),a=Gt(i[2])-1,s=Gt(i[3]),l=Gt(i[4]),c=Gt(i[5])-1;if(n)return Su(t,l,c)?wu(t,l,c):new Date(NaN);{const u=new Date(0);return!_u(t,a,s)||!ku(t,r)?new Date(NaN):(u.setUTCFullYear(t,a,Math.max(r,s)),u)}}function Gt(e){return e?parseInt(e):1}function vu(e){const t=e.match(gu);if(!t)return NaN;const i=vn(t[1]),n=vn(t[2]),r=vn(t[3]);return Cu(i,n,r)?i*yi+n*bi+r*1e3:NaN}function vn(e){return e&&parseFloat(e.replace(",","."))||0}function xu(e){if(e==="Z")return 0;const t=e.match(fu);if(!t)return 0;const i=t[1]==="+"?-1:1,n=parseInt(t[2]),r=t[3]&&parseInt(t[3])||0;return Pu(n,r)?i*(n*yi+r*bi):NaN}function wu(e,t,i){const n=new Date(0);n.setUTCFullYear(e,0,4);const r=n.getUTCDay()||7,a=(t-1)*7+i+1-r;return n.setUTCDate(n.getUTCDate()+a),n}const $u=[31,null,31,30,31,30,31,31,30,31,30,31];function Ra(e){return e%400===0||e%4===0&&e%100!==0}function _u(e,t,i){return t>=0&&t<=11&&i>=1&&i<=($u[t]||(Ra(e)?29:28))}function ku(e,t){return t>=1&&t<=(Ra(e)?366:365)}function Su(e,t,i){return t>=1&&t<=53&&i>=0&&i<=6}function Cu(e,t,i){return e===24?t===0&&i===0:i>=0&&i<60&&t>=0&&t<60&&e>=0&&e<25}function Pu(e,t){return t>=0&&t<=59}/*!
 * chartjs-adapter-date-fns v3.0.0
 * https://www.chartjs.org
 * (c) 2022 chartjs-adapter-date-fns Contributors
 * Released under the MIT license
 */const Tu={datetime:"MMM d, yyyy, h:mm:ss aaaa",millisecond:"h:mm:ss.SSS aaaa",second:"h:mm:ss aaaa",minute:"h:mm aaaa",hour:"ha",day:"MMM d",week:"PP",month:"MMM yyyy",quarter:"qqq - yyyy",year:"yyyy"};ws._date.override({_id:"date-fns",formats:function(){return Tu},parse:function(e,t){if(e===null||typeof e>"u")return null;const i=typeof e;return i==="number"||e instanceof Date?e=I(e):i==="string"&&(typeof t=="string"?e=ou(e,t,new Date,this.options):e=pu(e,this.options)),ka(e)?e.getTime():null},format:function(e,t){return cd(e,t,this.options)},add:function(e,t,i){switch(i){case"millisecond":return Wn(e,t);case"second":return Xl(e,t);case"minute":return Kl(e,t);case"hour":return Gl(e,t);case"day":return rn(e,t);case"week":return Jl(e,t);case"month":return jn(e,t);case"quarter":return Ql(e,t);case"year":return ec(e,t);default:return e}},diff:function(e,t,i){switch(i){case"millisecond":return qn(e,t);case"second":return lc(e,t);case"minute":return ac(e,t);case"hour":return rc(e,t);case"day":return Sa(e,t);case"week":return cc(e,t);case"month":return Ta(e,t);case"quarter":return oc(e,t);case"year":return dc(e,t);default:return 0}},startOf:function(e,t,i){switch(t){case"second":return uu(e);case"minute":return du(e);case"hour":return cu(e);case"day":return Dn(e);case"week":return De(e);case"isoWeek":return De(e,{weekStartsOn:+i});case"month":return pc(e);case"quarter":return uc(e);case"year":return Da(e);default:return e}},endOf:function(e,t){switch(t){case"second":return yc(e);case"minute":return mc(e);case"hour":return gc(e);case"day":return Ca(e);case"week":return fc(e);case"month":return Pa(e);case"quarter":return bc(e);case"year":return hc(e);default:return e}}});function Rr(e,t){if(!(t!=null&&t.start)||!(t!=null&&t.end))return null;const i=e.getPixelForValue(t.start.getTime()),n=e.getPixelForValue(t.end.getTime());if(!Number.isFinite(i)||!Number.isFinite(n))return null;const r=Math.min(i,n),a=Math.max(Math.abs(n-i),2);return!Number.isFinite(a)||a<=0?null:{left:r,width:a}}const Du={id:"pricingModeIcons",beforeDatasetsDraw(e,t,i){var c;const n=i,r=n==null?void 0:n.segments;if(!(r!=null&&r.length))return;const a=e.chartArea,s=(c=e.scales)==null?void 0:c.x;if(!a||!s)return;const l=e.ctx;l.save(),l.globalAlpha=(n==null?void 0:n.backgroundOpacity)??.12;for(const u of r){const p=Rr(s,u);p&&(l.fillStyle=u.color||"rgba(255, 255, 255, 0.1)",l.fillRect(p.left,a.top,p.width,a.bottom-a.top))}l.restore()},afterDatasetsDraw(e,t,i){var z;const n=i,r=n==null?void 0:n.segments;if(!(r!=null&&r.length))return;const a=(z=e.scales)==null?void 0:z.x,s=e.chartArea;if(!a||!s)return;const l=(n==null?void 0:n.iconSize)??16,c=(n==null?void 0:n.labelSize)??9,u=`${l}px "Inter", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,p=`${c}px "Inter", sans-serif`,f=(n==null?void 0:n.iconColor)||"rgba(255, 255, 255, 0.95)",y=(n==null?void 0:n.labelColor)||"rgba(255, 255, 255, 0.7)",b=(n==null?void 0:n.axisBandPadding)??10,g=(n==null?void 0:n.axisBandHeight)??l+c+10,m=(n==null?void 0:n.axisBandColor)||"rgba(6, 10, 18, 0.12)",$=(n==null?void 0:n.iconAlignment)||"start",P=(n==null?void 0:n.iconStartOffset)??12,_=(n==null?void 0:n.iconBaselineOffset)??4,T=(a.bottom||s.bottom)+b,G=Math.min(T,e.height-g-2),Q=s.right-s.left,w=G+_,q=e.ctx;q.save(),q.globalCompositeOperation="destination-over",q.fillStyle=m,q.fillRect(s.left,G,Q,g),q.restore(),q.save(),q.globalCompositeOperation="destination-over",q.textAlign="center",q.textBaseline="top";for(const B of r){const V=Rr(a,B);if(!V)continue;let Y;if($==="start"){Y=V.left+P;const R=V.left+V.width-l/2;Y>R&&(Y=V.left+V.width/2)}else Y=V.left+V.width/2;q.font=u,q.fillStyle=f,q.fillText(B.icon||"❓",Y,w),B.shortLabel&&(q.font=p,q.fillStyle=y,q.fillText(B.shortLabel,Y,w+l-2))}q.restore()}};function Hr(e,t){if(!e)return;e.layout||(e.layout={}),e.layout.padding||(e.layout.padding={});const i=e.layout.padding,n=12;i.top=i.top??12,i.bottom=Math.max(i.bottom||0,n)}var Mu=Object.defineProperty,Ou=Object.getOwnPropertyDescriptor,Ot=(e,t,i,n)=>{for(var r=n>1?void 0:n?Ou(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Mu(t,i,r),r};const Ie=K;Xi.register(Gr,Ur,$s,_s,Zr,Kr,ks,Qr,Ss,Cs,Xr,Jr,Ps,Ts,ea,Du);function Eu(e){const t=e.timeline.map(i=>i.spot_price_czk??0);return{label:"📊 Spotová cena nákupu",data:t,borderColor:"#2196F3",backgroundColor:"rgba(33, 150, 243, 0.15)",borderWidth:3,fill:!1,tension:.4,type:"line",yAxisID:"y-price",pointRadius:t.map(()=>0),pointHoverRadius:7,pointBackgroundColor:t.map(()=>"#42a5f5"),pointBorderColor:t.map(()=>"#42a5f5"),pointBorderWidth:2,order:1,datalabels:{display:!1}}}function zu(e){return{label:"💰 Výkupní cena",data:e.timeline.map(t=>t.export_price_czk??0),borderColor:"#4CAF50",backgroundColor:"rgba(76, 187, 106, 0.15)",borderWidth:2,fill:!1,type:"line",tension:.4,yAxisID:"y-price",pointRadius:0,pointHoverRadius:5,order:1,borderDash:[5,5]}}function Lu(e){if(!e.solar)return[];const{string1:t,string2:i,hasString1:n,hasString2:r}=e.solar,a=(n?1:0)+(r?1:0),s={string1:{border:"rgba(255, 193, 7, 0.8)",bg:"rgba(255, 193, 7, 0.2)"},string2:{border:"rgba(255, 152, 0, 0.8)",bg:"rgba(255, 152, 0, 0.2)"}};if(a===1){const l=n?t:i,c=n?s.string1:s.string2;return[{label:"☀️ Solární předpověď",data:l,borderColor:c.border,backgroundColor:c.bg,borderWidth:2,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",pointRadius:0,pointHoverRadius:5,order:2}]}return a===2?[{label:"☀️ String 2",data:i,borderColor:s.string2.border,backgroundColor:s.string2.bg,borderWidth:1.5,fill:"origin",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2},{label:"☀️ String 1",data:t,borderColor:s.string1.border,backgroundColor:s.string1.bg,borderWidth:1.5,fill:"-1",tension:.4,type:"line",yAxisID:"y-power",stack:"solar",pointRadius:0,pointHoverRadius:5,order:2}]:[]}function Au(e){if(!e.battery)return[];const{baseline:t,solarCharge:i,gridCharge:n,gridNet:r,consumption:a}=e.battery,s=[],l={baseline:{border:"#78909C",bg:"rgba(120, 144, 156, 0.25)"},solar:{border:"transparent",bg:"rgba(255, 167, 38, 0.6)"},grid:{border:"transparent",bg:"rgba(33, 150, 243, 0.6)"}};return a.some(c=>c!=null&&c>0)&&s.push({label:"🏠 Spotřeba (plán)",data:a,borderColor:"rgba(255, 112, 67, 0.7)",backgroundColor:"rgba(255, 112, 67, 0.12)",borderWidth:1.5,type:"line",fill:!1,tension:.25,pointRadius:0,pointHoverRadius:5,yAxisID:"y-power",stack:"consumption",borderDash:[6,4],order:2}),n.some(c=>c!=null&&c>0)&&s.push({label:"⚡ Do baterie ze sítě",data:n,backgroundColor:l.grid.bg,borderColor:l.grid.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),i.some(c=>c!=null&&c>0)&&s.push({label:"☀️ Do baterie ze soláru",data:i,backgroundColor:l.solar.bg,borderColor:l.solar.border,borderWidth:0,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),s.push({label:"🔋 Zbývající kapacita",data:t,backgroundColor:l.baseline.bg,borderColor:l.baseline.border,borderWidth:3,type:"line",fill:!0,tension:.4,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",stack:"charging",order:3}),r.some(c=>c!==null)&&s.push({label:"📡 Netto odběr ze sítě",data:r,borderColor:"#00BCD4",backgroundColor:"transparent",borderWidth:2,type:"line",fill:!1,tension:.2,pointRadius:0,pointHoverRadius:5,yAxisID:"y-solar",order:2}),s}function Vr(e){const t=[];return e.prices.length>0&&t.push(Eu(e)),e.exportPrices.length>0&&t.push(zu(e)),t.push(...Lu(e)),t.push(...Au(e)),t}function Pi(e,t,i=""){if(e==null)return"";const n=i?` ${i}`:"";return`${e.toFixed(t)}${n}`}function mt(e){var r;const t=(r=e.scales)==null?void 0:r.x;if(!t)return"overview";const n=(t.max-t.min)/(1e3*60*60);return n<=6?"detail":n<=24?"day":"overview"}function Xe(e,t){var p,f,y,b,g,m,$,P,_,T,G;if(!((p=e==null?void 0:e.scales)!=null&&p.x))return;const i=e.scales.x,r=(i.max-i.min)/(1e3*60*60),a=mt(e),s=(y=(f=e.options.plugins)==null?void 0:f.legend)==null?void 0:y.labels;s&&(s.padding=10,s.font&&(s.font.size=11),a==="detail"&&(s.padding=12,s.font&&(s.font.size=12)));const l=["y-price","y-solar","y-power"];for(const Q of l){const w=(b=e.options.scales)==null?void 0:b[Q];w&&(a==="overview"?(w.title&&(w.title.display=!1),(g=w.ticks)!=null&&g.font&&(w.ticks.font.size=10),Q==="y-solar"&&(w.display=!1)):a==="detail"?(w.title&&(w.title.display=!0,w.title.font&&(w.title.font.size=12)),(m=w.ticks)!=null&&m.font&&(w.ticks.font.size=11),w.display=!0):(w.title&&(w.title.display=!0,w.title.font&&(w.title.font.size=11)),($=w.ticks)!=null&&$.font&&(w.ticks.font.size=10),w.display=!0))}const c=(P=e.options.scales)==null?void 0:P.x;c&&(a==="overview"?c.ticks&&(c.ticks.maxTicksLimit=12,c.ticks.font&&(c.ticks.font.size=10)):a==="detail"?(c.ticks&&(c.ticks.maxTicksLimit=24,c.ticks.font&&(c.ticks.font.size=11)),c.time&&(c.time.displayFormats.hour="HH:mm")):(c.ticks&&(c.ticks.maxTicksLimit=16,c.ticks.font&&(c.ticks.font.size=10)),c.time&&(c.time.displayFormats.hour="dd.MM HH:mm")));const u=t==="always"||t==="auto"&&r<=6;for(const Q of e.data.datasets){const w=Q;if(w.datalabels||(w.datalabels={}),t==="never"){w.datalabels.display=!1;continue}if(u){let q=1;r>3&&r<=6?q=2:r>6&&(q=4),w.datalabels.display=Y=>{const R=Y.dataset.data[Y.dataIndex];return R==null||R===0?!1:Y.dataIndex%q===0};const z=w.yAxisID==="y-price",B=((_=w.label)==null?void 0:_.includes("Solární"))||((T=w.label)==null?void 0:T.includes("String")),V=(G=w.label)==null?void 0:G.includes("kapacita");w.datalabels.align="top",w.datalabels.offset=6,w.datalabels.color="#fff",w.datalabels.font={size:9,weight:"bold"},z?(w.datalabels.formatter=Y=>Pi(Y,2,"Kč"),w.datalabels.backgroundColor=w.borderColor||"rgba(33, 150, 243, 0.8)"):B?(w.datalabels.formatter=Y=>Pi(Y,1,"kW"),w.datalabels.backgroundColor=w.borderColor||"rgba(255, 193, 7, 0.8)"):V?(w.datalabels.formatter=Y=>Pi(Y,1,"kWh"),w.datalabels.backgroundColor=w.borderColor||"rgba(120, 144, 156, 0.8)"):(w.datalabels.formatter=Y=>Pi(Y,1),w.datalabels.backgroundColor=w.borderColor||"rgba(33, 150, 243, 0.8)"),w.datalabels.borderRadius=4,w.datalabels.padding={top:3,bottom:3,left:5,right:5}}else w.datalabels.display=!1}e.update("none"),v.debug(`[PricingChart] Detail: ${r.toFixed(1)}h, Labels: ${u?"ON":"OFF"}, Mode: ${t}`)}let Ne=class extends S{constructor(){super(...arguments),this.data=null,this.datalabelMode="auto",this.zoomState={start:null,end:null},this.currentDetailLevel="overview",this.chart=null,this.resizeObserver=null}firstUpdated(){this.setupResizeObserver(),this.data&&this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())}updated(e){e.has("data")&&this.data&&(this.chart?this.updateChartData():this.data.timeline.length>0&&requestAnimationFrame(()=>this.createChart())),e.has("datalabelMode")&&this.chart&&Xe(this.chart,this.datalabelMode)}disconnectedCallback(){var e;super.disconnectedCallback(),this.destroyChart(),(e=this.resizeObserver)==null||e.disconnect(),this.resizeObserver=null}zoomToTimeRange(e,t){if(!this.chart){v.warn("[PricingChart] Chart not available for zoom");return}const i=new Date(e),n=new Date(t),r=15*60*1e3,a=i.getTime()-r,s=n.getTime()+r;if(this.zoomState.start!==null&&Math.abs(this.zoomState.start-a)<6e4&&this.zoomState.end!==null&&Math.abs(this.zoomState.end-s)<6e4){v.debug("[PricingChart] Already zoomed to same range → reset"),this.resetZoom();return}try{const l=this.chart.options;l.scales.x.min=a,l.scales.x.max=s,this.chart.update("none"),this.zoomState={start:a,end:s},this.currentDetailLevel=mt(this.chart),Xe(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-change",{detail:{start:a,end:s,level:this.currentDetailLevel},bubbles:!0,composed:!0})),v.debug("[PricingChart] Zoomed to range",{start:new Date(a).toISOString(),end:new Date(s).toISOString()})}catch(l){v.error("[PricingChart] Zoom error",l)}}resetZoom(){if(!this.chart)return;const e=this.chart.options;delete e.scales.x.min,delete e.scales.x.max,this.chart.update("none"),this.zoomState={start:null,end:null},this.currentDetailLevel=mt(this.chart),Xe(this.chart,this.datalabelMode),this.dispatchEvent(new CustomEvent("zoom-reset",{bubbles:!0,composed:!0}))}getChart(){return this.chart}createChart(){if(!this.canvas||!this.data||this.data.timeline.length===0)return;this.chart&&this.destroyChart();const e=this.data,t=Vr(e),i={responsive:!0,maintainAspectRatio:!1,animation:{duration:0},interaction:{mode:"index",intersect:!1},plugins:{legend:{labels:{color:"#ffffff",font:{size:11,weight:"500"},padding:10,usePointStyle:!0,pointStyle:"circle",boxWidth:12,boxHeight:12},position:"top"},tooltip:{backgroundColor:"rgba(0,0,0,0.9)",titleColor:"#ffffff",bodyColor:"#ffffff",titleFont:{size:13,weight:"bold"},bodyFont:{size:11},padding:10,cornerRadius:6,displayColors:!0,callbacks:{title:r=>r.length>0?new Date(r[0].parsed.x).toLocaleString("cs-CZ",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"",label:r=>{let a=r.dataset.label||"";return a&&(a+=": "),r.parsed.y!==null&&(r.dataset.yAxisID==="y-price"?a+=r.parsed.y.toFixed(2)+" Kč/kWh":r.dataset.yAxisID==="y-solar"?a+=r.parsed.y.toFixed(2)+" kWh":r.dataset.yAxisID==="y-power"?a+=r.parsed.y.toFixed(2)+" kW":a+=r.parsed.y),a}}},datalabels:{display:!1},zoom:{zoom:{wheel:{enabled:!0,modifierKey:null},drag:{enabled:!0,backgroundColor:"rgba(33, 150, 243, 0.3)",borderColor:"rgba(33, 150, 243, 0.8)",borderWidth:2},pinch:{enabled:!0},mode:"x",onZoomComplete:({chart:r})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=mt(r),Xe(r,this.datalabelMode)}},pan:{enabled:!0,mode:"x",modifierKey:"shift",onPanComplete:({chart:r})=>{this.zoomState={start:null,end:null},this.currentDetailLevel=mt(r),Xe(r,this.datalabelMode)}},limits:{x:{minRange:36e5}}},pricingModeIcons:null},scales:{x:{type:"timeseries",time:{unit:"hour",displayFormats:{hour:"dd.MM HH:mm"},tooltipFormat:"dd.MM.yyyy HH:mm"},ticks:{color:this.getTextColor(),maxRotation:45,minRotation:45,font:{size:11},maxTicksLimit:20},grid:{color:this.getGridColor(),lineWidth:1}},"y-price":{type:"linear",position:"left",ticks:{color:"#2196F3",font:{size:11,weight:"500"},callback:r=>r.toFixed(2)+" Kč"},grid:{color:"rgba(33, 150, 243, 0.15)",lineWidth:1},title:{display:!0,text:"💰 Cena (Kč/kWh)",color:"#2196F3",font:{size:13,weight:"bold"}}},"y-solar":{type:"linear",position:"left",stacked:!0,ticks:{color:"#78909C",font:{size:11,weight:"500"},callback:r=>r.toFixed(1)+" kWh",display:!0},grid:{display:!0,color:"rgba(120, 144, 156, 0.15)",lineWidth:1,drawOnChartArea:!0},title:{display:!0,text:"🔋 Kapacita baterie (kWh)",color:"#78909C",font:{size:11,weight:"bold"}},beginAtZero:!1},"y-power":{type:"linear",position:"right",stacked:!0,ticks:{color:"#FFA726",font:{size:11,weight:"500"},callback:r=>r.toFixed(2)+" kW"},grid:{display:!1},title:{display:!0,text:"☀️ Výkon (kW)",color:"#FFA726",font:{size:13,weight:"bold"}}}}};Hr(i);const n={type:"bar",data:{labels:e.labels,datasets:t},plugins:[ea],options:i};try{this.chart=new Xi(this.canvas,n),Xe(this.chart,this.datalabelMode),e.initialZoomStart&&e.initialZoomEnd&&requestAnimationFrame(()=>{if(!this.chart)return;const r=this.chart.options;r.scales.x.min=e.initialZoomStart,r.scales.x.max=e.initialZoomEnd,this.chart.update("none"),this.currentDetailLevel=mt(this.chart),Xe(this.chart,this.datalabelMode)}),v.info("[PricingChart] Chart created",{datasets:t.length,labels:e.labels.length,segments:e.modeSegments.length})}catch(r){v.error("[PricingChart] Failed to create chart",r)}}updateChartData(){var s;if(!this.chart||!this.data)return;const e=this.data,t=Vr(e),i=((s=this.chart.data.labels)==null?void 0:s.length)!==e.labels.length,n=this.chart.data.datasets.length!==t.length;i&&(this.chart.data.labels=e.labels);let r="none";n?(this.chart.data.datasets=t,r=void 0):t.forEach((l,c)=>{const u=this.chart.data.datasets[c];u&&(u.data=l.data,u.label=l.label,u.backgroundColor=l.backgroundColor,u.borderColor=l.borderColor)});const a=this.chart.options;a.plugins||(a.plugins={}),a.plugins.pricingModeIcons=null,Hr(a),this.chart.update(r),v.debug("[PricingChart] Chart updated incrementally")}destroyChart(){this.chart&&(this.chart.destroy(),this.chart=null)}setupResizeObserver(){this.resizeObserver=new ResizeObserver(()=>{var e;(e=this.chart)==null||e.resize()}),this.resizeObserver.observe(this)}getTextColor(){try{return getComputedStyle(this).getPropertyValue("--oig-text-primary").trim()||"#e0e0e0"}catch{return"#e0e0e0"}}getGridColor(){try{return getComputedStyle(this).getPropertyValue("--oig-border").trim()||"rgba(255,255,255,0.1)"}catch{return"rgba(255,255,255,0.1)"}}setDatalabelMode(e){this.datalabelMode=e,this.dispatchEvent(new CustomEvent("datalabel-mode-change",{detail:{mode:e},bubbles:!0,composed:!0}))}get isZoomed(){return this.zoomState.start!==null||this.zoomState.end!==null}renderControls(){const e=t=>{const i=this.datalabelMode===t?"active":"";return t==="always"&&this.datalabelMode==="always"?`control-btn mode-always ${i}`:t==="never"&&this.datalabelMode==="never"?`control-btn mode-never ${i}`:`control-btn ${i}`};return d`
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
        ${this.isZoomed?d`<button class="control-btn reset-btn" @click=${()=>this.resetZoom()}>
              Reset zoom
            </button>`:null}
      </div>
    `}render(){const e=this.data&&this.data.timeline.length>0;return d`
      <div class="chart-header">
        <span class="chart-title">Ceny elektřiny & předpověď</span>
        ${this.renderControls()}
      </div>

      <div class="chart-container">
        ${e?d`<canvas id="pricing-canvas"></canvas>`:d`<div class="no-data">Žádná data o cenách</div>`}
      </div>

      ${e?d`<div class="chart-hint">
            Kolečko myši = zoom | Shift + tah = posun | Tah = výběr oblasti
          </div>`:null}
    `}};Ne.styles=D`
    :host {
      display: block;
      background: ${Ie(o.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${Ie(o.cardShadow)};
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
      color: ${Ie(o.textPrimary)};
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
      color: ${Ie(o.textSecondary)};
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .control-btn:hover {
      background: ${Ie(o.accent)};
      color: #fff;
    }

    .control-btn.active {
      background: ${Ie(o.accent)};
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
      color: ${Ie(o.textSecondary)};
      font-size: 14px;
    }

    .chart-hint {
      font-size: 10px;
      color: ${Ie(o.textSecondary)};
      opacity: 0.7;
      margin-top: 6px;
      text-align: center;
    }
  `;Ot([h({type:Object})],Ne.prototype,"data",2);Ot([h({type:String})],Ne.prototype,"datalabelMode",2);Ot([x()],Ne.prototype,"zoomState",2);Ot([x()],Ne.prototype,"currentDetailLevel",2);Ot([Ji("#pricing-canvas")],Ne.prototype,"canvas",2);Ne=Ot([C("oig-pricing-chart")],Ne);var Iu=Object.defineProperty,Bu=Object.getOwnPropertyDescriptor,A=(e,t,i,n)=>{for(var r=n>1?void 0:n?Bu(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Iu(t,i,r),r};const M=K,pt=D`
  background: ${M(o.cardBg)};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${M(o.cardShadow)};
`,We=D`
  font-size: 15px;
  font-weight: 600;
  color: ${M(o.textPrimary)};
  margin: 0 0 12px 0;
`;function Fu(e){return Math.max(0,Math.min(100,e))}function jr(e){const n=Math.max(0,Math.min(1,(e-10)/60)),r={r:33,g:150,b:243},a={r:255,g:87,b:34},s=(l,c)=>Math.round(l+(c-l)*n);return`rgb(${s(r.r,a.r)}, ${s(r.g,a.g)}, ${s(r.b,a.b)})`}let ri=class extends S{constructor(){super(...arguments),this.collapsed=!0,this.busy=!1}toggle(){this.collapsed=!this.collapsed}async doAction(e,t){this.busy=!0;try{const i=await e();this.dispatchEvent(new CustomEvent("action-done",{detail:{success:i,label:t},bubbles:!0,composed:!0}))}finally{this.busy=!1}}render(){return d`
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
              @click=${()=>this.doAction(jo,"plan")}>
              Preplanovat (debug)
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(Wo,"apply")}>
              Aplikovat rucne
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${()=>this.doAction(qo,"cancel")}>
              Zrusit plan
            </button>
          </div>
        </div>
      </div>
    `}};ri.styles=D`
    :host { display: block; }

    .panel {
      ${pt};
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
      color: ${M(o.textPrimary)};
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
      color: ${M(o.textSecondary)};
    }

    .info-bubble .tooltip {
      display: none;
      position: absolute;
      left: 0;
      top: 24px;
      width: 280px;
      padding: 10px;
      background: ${M(o.cardBg)};
      border: 1px solid ${M(o.divider)};
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      font-size: 11px;
      line-height: 1.5;
      color: ${M(o.textSecondary)};
      z-index: 100;
      white-space: normal;
    }

    .info-bubble:hover .tooltip { display: block; }

    .toggle-icon {
      font-size: 18px;
      font-weight: bold;
      color: ${M(o.textSecondary)};
      transition: transform 0.2s;
    }

    .panel-content {
      display: none;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid ${M(o.divider)};
    }

    .panel-content.open { display: block; }

    .section-label {
      font-size: 12px;
      font-weight: 600;
      color: ${M(o.textSecondary)};
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
      border: 1px solid ${M(o.divider)};
      border-radius: 8px;
      background: ${M(o.bgSecondary)};
      color: ${M(o.textPrimary)};
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      white-space: nowrap;
    }

    .action-btn:hover { background: ${M(o.divider)}; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `;A([x()],ri.prototype,"collapsed",2);A([x()],ri.prototype,"busy",2);ri=A([C("oig-boiler-debug-panel")],ri);let Ii=class extends S{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return d`<div>Nacitani stavu...</div>`;const t=(i,n,r=1)=>i!=null?`${i.toFixed(r)} ${n}`:`-- ${n}`;return d`
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
        ${e.tempBottom!==null?d`
          <div class="card">
            <div class="card-label">Teplota spodni</div>
            <div class="card-value">${t(e.tempBottom,"°C")}</div>
          </div>
        `:E}
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
    `}};Ii.styles=D`
    :host { display: block; }

    h3 { ${We}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .card {
      ${pt};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${M(o.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 18px;
      font-weight: 600;
      color: ${M(o.textPrimary)};
    }

    .card-value.small {
      font-size: 13px;
      font-weight: 500;
    }
  `;A([h({type:Object})],Ii.prototype,"data",2);Ii=A([C("oig-boiler-status-grid")],Ii);let Bi=class extends S{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return E;const t=i=>`${i.toFixed(2)} kWh`;return d`
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
    `}};Bi.styles=D`
    :host { display: block; }

    h3 { ${We}; }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .card {
      ${pt};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${M(o.textSecondary)};
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
      background: ${M(o.bgSecondary)};
    }

    .ratio-fve { background: #4CAF50; }
    .ratio-grid { background: #FF9800; }
    .ratio-alt { background: #2196F3; }

    .ratio-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 11px;
      color: ${M(o.textSecondary)};
    }
  `;A([h({type:Object})],Bi.prototype,"data",2);Bi=A([C("oig-boiler-energy-breakdown")],Bi);let Fi=class extends S{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return E;const t=e.peakHours.length?e.peakHours.map(r=>`${r}h`).join(", "):"--",i=e.waterLiters40c!==null?`${e.waterLiters40c.toFixed(0)} L`:"-- L",n=e.circulationNow.startsWith("ANO");return d`
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
    `}};Fi.styles=D`
    :host { display: block; }

    h3 { ${We}; }

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
      border-bottom: 1px solid ${M(o.divider)};
      font-size: 13px;
    }

    .item:last-child { border-bottom: none; }

    .label { color: ${M(o.textSecondary)}; }

    .value {
      font-weight: 600;
      color: ${M(o.textPrimary)};
    }

    .value.active { color: #4CAF50; }
    .value.idle { color: ${M(o.textSecondary)}; }
  `;A([h({type:Object})],Fi.prototype,"data",2);Fi=A([C("oig-boiler-predicted-usage")],Fi);let ai=class extends S{constructor(){super(...arguments),this.plan=null,this.forecastWindows={fve:"--",grid:"--"}}render(){var n;const e=this.plan,t=this.forecastWindows,i=r=>r??"--";return d`
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
    `}};ai.styles=D`
    :host { display: block; }

    h3 { ${We}; }

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
      border-bottom: 1px solid ${M(o.divider)};
      font-size: 13px;
    }

    .row:last-child { border-bottom: none; }

    .row-label { color: ${M(o.textSecondary)}; }
    .row-value {
      font-weight: 500;
      color: ${M(o.textPrimary)};
      text-align: right;
      max-width: 60%;
      word-break: break-word;
    }
  `;A([h({type:Object})],ai.prototype,"plan",2);A([h({type:Object})],ai.prototype,"forecastWindows",2);ai=A([C("oig-boiler-plan-info")],ai);let si=class extends S{constructor(){super(...arguments),this.boilerState=null,this.targetTemp=60}render(){const e=this.boilerState;if(!e)return d`<div>Nacitani...</div>`;const t=10,i=70,n=b=>Fu((b-t)/(i-t)*100),r=e.heatingPercent??0,a=e.tempTop!==null?n(e.tempTop):null,s=e.tempBottom!==null?n(e.tempBottom):null,l=n(this.targetTemp),c=jr(e.tempTop??this.targetTemp),u=jr(e.tempBottom??10),p=`linear-gradient(180deg, ${c} 0%, ${u} 100%)`,f=e.heatingPercent!==null?`${e.heatingPercent.toFixed(0)}% nahrato`:"-- % nahrato";return d`
      <h3>Vizualizace bojleru</h3>

      <div class="tank-wrapper">
        <div class="temp-scale">
          ${[70,60,50,40,30,20,10].map(b=>d`<span>${b}°C</span>`)}
        </div>

        <div class="tank">
          <div class="water" style="height:${r}%; background:${p}"></div>

          <div class="target-line" style="bottom:${l}%">
            <span class="target-label">Cil</span>
          </div>

          ${a!==null?d`
            <div class="sensor top" style="bottom:${a}%">
              <span class="sensor-label">${e.tempTop.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:E}

          ${s!==null?d`
            <div class="sensor bottom" style="bottom:${s}%">
              <span class="sensor-label">${e.tempBottom.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          `:E}
        </div>
      </div>

      <div class="grade-label">${f}</div>
    `}};si.styles=D`
    :host { display: block; }

    h3 { ${We}; }

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
      color: ${M(o.textSecondary)};
      text-align: right;
      padding: 2px 0;
    }

    /* Tank body */
    .tank {
      flex: 1;
      position: relative;
      border: 2px solid ${M(o.divider)};
      border-radius: 12px;
      overflow: hidden;
      background: ${M(o.bgSecondary)};
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
      border-top: 2px dashed ${M(o.accent)};
      z-index: 3;
    }

    .target-label {
      position: absolute;
      right: 4px;
      top: -14px;
      font-size: 9px;
      color: ${M(o.accent)};
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
      color: ${M(o.textPrimary)};
    }
  `;A([h({type:Object})],si.prototype,"boilerState",2);A([h({type:Number})],si.prototype,"targetTemp",2);si=A([C("oig-boiler-tank")],si);let oi=class extends S{constructor(){super(...arguments),this.current="",this.available=[]}onChange(e){const t=e.target.value;this.dispatchEvent(new CustomEvent("category-change",{detail:{category:t},bubbles:!0,composed:!0}))}render(){const e=this.available.length?this.available:Object.keys(wr);return d`
      <div class="row">
        <label>Profil:</label>
        <select @change=${this.onChange}>
          ${e.map(t=>d`
            <option value=${t} ?selected=${t===this.current}>
              ${wr[t]||t}
            </option>
          `)}
        </select>
      </div>
    `}};oi.styles=D`
    :host { display: block; margin: 12px 0; }

    .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    label {
      font-size: 13px;
      font-weight: 600;
      color: ${M(o.textPrimary)};
    }

    select {
      padding: 6px 10px;
      font-size: 13px;
      border: 1px solid ${M(o.divider)};
      border-radius: 6px;
      background: ${M(o.cardBg)};
      color: ${M(o.textPrimary)};
      cursor: pointer;
    }
  `;A([h({type:String})],oi.prototype,"current",2);A([h({type:Array})],oi.prototype,"available",2);oi=A([C("oig-boiler-category-select")],oi);let Ni=class extends S{constructor(){super(...arguments),this.data=[]}render(){if(!this.data.length)return E;const e=this.data.flatMap(s=>s.hours),t=Math.max(...e,.1),i=t*.3,n=t*.7,r=Array.from({length:24},(s,l)=>l),a=s=>s===0?"none":s<i?"low":s<n?"medium":"high";return d`
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
    `}};Ni.styles=D`
    :host { display: block; }

    h3 { ${We}; }

    .wrapper {
      ${pt};
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
      color: ${M(o.textSecondary)};
      text-align: center;
      padding: 2px 0;
    }

    .day-label {
      font-size: 10px;
      font-weight: 600;
      color: ${M(o.textSecondary)};
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

    .cell.none   { background: ${M(o.bgSecondary)}; }
    .cell.low    { background: #c8e6c9; }
    .cell.medium { background: #ff9800; }
    .cell.high   { background: #f44336; }

    .legend {
      display: flex;
      gap: 14px;
      margin-top: 10px;
      font-size: 11px;
      color: ${M(o.textSecondary)};
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
  `;A([h({type:Array})],Ni.prototype,"data",2);Ni=A([C("oig-boiler-heatmap-grid")],Ni);let Ri=class extends S{constructor(){super(...arguments),this.plan=null}render(){const e=this.plan,t=(i,n=2)=>i!=null?i.toFixed(n):"-";return d`
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
    `}};Ri.styles=D`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .card {
      ${pt};
      padding: 14px;
    }

    .card-title {
      font-size: 12px;
      color: ${M(o.textSecondary)};
      margin-bottom: 6px;
    }

    .card-value {
      font-size: 22px;
      font-weight: 700;
    }

    .total { color: ${M(o.textPrimary)}; }
    .fve { color: #4CAF50; }
    .grid-c { color: #FF9800; }
    .cost { color: #2196F3; }
  `;A([h({type:Object})],Ri.prototype,"plan",2);Ri=A([C("oig-boiler-stats-cards")],Ri);let Hi=class extends S{constructor(){super(...arguments),this.data=null}render(){const e=this.data;if(!e)return E;const t=Math.max(...e.hourlyAvg,.01),i=new Set(e.peakHours),n=e.peakHours.length?e.peakHours.map(a=>`${a}h`).join(", "):"--",r=e.confidence!==null?`${Math.round(e.confidence*100)} %`:"-- %";return d`
      <h3>Profil spotreby (tyden)</h3>
      <div class="wrapper">
        <div class="chart">
          ${e.hourlyAvg.map((a,s)=>{const l=t>0?a/t*100:0,c=i.has(s);return d`
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
    `}};Hi.styles=D`
    :host { display: block; }

    h3 { ${We}; }

    .wrapper {
      ${pt};
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
      color: ${M(o.textSecondary)};
      margin-top: 3px;
    }

    /* Stats row */
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid ${M(o.divider)};
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .stat-label { color: ${M(o.textSecondary)}; }
    .stat-value { font-weight: 600; color: ${M(o.textPrimary)}; }
  `;A([h({type:Object})],Hi.prototype,"data",2);Hi=A([C("oig-boiler-profiling")],Hi);let Vi=class extends S{constructor(){super(...arguments),this.config=null}render(){const e=this.config;if(!e)return E;const t=(i,n="")=>i!=null?`${i}${n?" "+n:""}`:`--${n?" "+n:""}`;return d`
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
    `}};Vi.styles=D`
    :host { display: block; }

    h3 { ${We}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .card {
      ${pt};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${M(o.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 600;
      color: ${M(o.textPrimary)};
    }
  `;A([h({type:Object})],Vi.prototype,"config",2);Vi=A([C("oig-boiler-config-section")],Vi);let ji=class extends S{constructor(){super(...arguments),this.state=null}render(){return this.state?d`
      <div class="temp-display">
        <div class="current-temp">${this.state.currentTemp!=null?`${this.state.currentTemp}°C`:"--"}</div>
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
    `:d`<div>Nacitani...</div>`}};ji.styles=D`
    :host {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: ${M(o.cardBg)};
      border-radius: 12px;
      box-shadow: ${M(o.cardShadow)};
    }

    .temp-display { text-align: center; }

    .current-temp {
      font-size: 36px;
      font-weight: 600;
      color: ${M(o.textPrimary)};
    }

    .target-temp {
      font-size: 14px;
      color: ${M(o.textSecondary)};
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
      color: ${M(o.textSecondary)};
    }
  `;A([h({type:Object})],ji.prototype,"state",2);ji=A([C("oig-boiler-state")],ji);let Wi=class extends S{constructor(){super(...arguments),this.data=[]}render(){return E}};Wi.styles=D`
    :host { display: block; }
  `;A([h({type:Array})],Wi.prototype,"data",2);Wi=A([C("oig-boiler-heatmap")],Wi);let li=class extends S{constructor(){super(...arguments),this.profiles=[],this.editMode=!1}render(){return E}};li.styles=D`
    :host { display: block; }
  `;A([h({type:Array})],li.prototype,"profiles",2);A([h({type:Boolean})],li.prototype,"editMode",2);li=A([C("oig-boiler-profiles")],li);let En=class extends S{constructor(){super(...arguments),this.data=null}render(){const e=this.data,t=(e==null?void 0:e.temperatureTop)!=null?`${e.temperatureTop}°C`:"--",i=(e==null?void 0:e.temperatureBottom)!=null?`${e.temperatureBottom}°C`:"--",n=(e==null?void 0:e.selectedSource)??"--",r=(e==null?void 0:e.heating)??!1,a=(e==null?void 0:e.degraded)??!1;return d`
      <div data-testid="boiler-status-panel" class="boiler-status-panel">
        <div class="degraded-badge" ?hidden=${!a}>Degradováno</div>
        <div class="state-row">
          <span class="state-label">${r?"Ohřev":"Nečinný"}</span>
          <span class="source-label">${n}</span>
        </div>
        <div class="temps-row">
          <span class="temp-top">${t}</span>
          <span class="temp-bottom">${i}</span>
        </div>
        ${(e==null?void 0:e.comfortSatisfied)===!1?d`<div class="comfort-gap">Komfort nesplněn</div>`:""}
      </div>
    `}};A([h({attribute:!1})],En.prototype,"data",2);En=A([C("oig-boiler-status-panel")],En);let zn=class extends S{constructor(){super(...arguments),this.slots=[]}render(){return d`
      <div data-testid="boiler-plan-timeline" class="boiler-plan-timeline">
        ${this.slots.map(e=>d`
          <div class="slot-row">
            <span class="slot-time">${e.start} – ${e.end}</span>
            <span class="slot-source">${e.recommendedSource}</span>
            <span class="slot-kwh">${e.consumptionKwh} kWh</span>
            ${e.spotPrice!=null?d`<span class="slot-price">${e.spotPrice} Kč</span>`:""}
          </div>
        `)}
      </div>
    `}};A([h({attribute:!1})],zn.prototype,"slots",2);zn=A([C("oig-boiler-plan-timeline")],zn);let Ln=class extends S{constructor(){super(...arguments),this.explanation=null}render(){const e=this.explanation;return d`
      <div data-testid="boiler-source-explanation" class="boiler-source-explanation">
        ${e?d`
          <div class="reason-codes">${e.reasonCodes.join(", ")}</div>
          ${e.planCreatedAt?d`<div class="plan-created">Plán: ${e.planCreatedAt}</div>`:""}
          ${e.unsatisfiedComfortGapC!=null?d`<div class="comfort-gap">Rozdíl: ${e.unsatisfiedComfortGapC}°C</div>`:""}
        `:d`<div class="no-explanation">Žádné vysvětlení</div>`}
      </div>
    `}};A([h({attribute:!1})],Ln.prototype,"explanation",2);Ln=A([C("oig-boiler-source-explanation")],Ln);let qi=class extends S{constructor(){super(...arguments),this.identity={entryId:null,boxId:null,available:!1},this.currentOverride=null}render(){var n;const e=this.identity.available,t=((n=this.currentOverride)==null?void 0:n.capabilityAvailable)??!1,i=e&&t;return d`
      <div data-testid="boiler-override-panel" class="boiler-override-panel">
        <div class="unavailable-notice" ?hidden=${e}>Nedostupné – identita bojleru není k dispozici</div>
        <div class="capability-notice" ?hidden=${!e||t}>Přepis není k dispozici – aktuátor nepodporuje ruční přepis</div>
        <label>
          Délka přepisu (minuty)
          <input
            data-testid="override-ttl-input"
            type="number"
            min="15"
            max="1440"
            step="15"
            value="120"
            ?disabled=${!i}
          />
        </label>
        <label>
          Důvod přepisu
          <textarea
            data-testid="override-reason-input"
            required
            ?disabled=${!i}
          ></textarea>
        </label>
        <button data-testid="override-submit-btn" ?disabled=${!i}>Aktivovat přepis</button>
      </div>
    `}};A([h({attribute:!1})],qi.prototype,"identity",2);A([h({attribute:!1})],qi.prototype,"currentOverride",2);qi=A([C("oig-boiler-override-panel")],qi);let Yi=class extends S{constructor(){super(...arguments),this.reason="unavailable",this.message=""}render(){return d`
      <div data-testid="boiler-unavailable-state" class="boiler-unavailable-state">
        <div class="spinner" ?hidden=${this.reason!=="loading"}>${this.reason==="loading"?"Načítání…":""}</div>
        <div class="error-msg" ?hidden=${this.reason!=="error"}>${this.message}</div>
        <div class="degraded-msg" ?hidden=${this.reason!=="degraded"}>${this.message}</div>
        <div class="unavailable-msg" ?hidden=${this.reason==="loading"||this.reason==="error"||this.reason==="degraded"}>${this.message}</div>
      </div>
    `}};A([h({type:String})],Yi.prototype,"reason",2);A([h({type:String})],Yi.prototype,"message",2);Yi=A([C("oig-boiler-unavailable-state")],Yi);var Nu=Object.defineProperty,Ru=Object.getOwnPropertyDescriptor,pe=(e,t,i,n)=>{for(var r=n>1?void 0:n?Ru(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Nu(t,i,r),r};const Je=K,an=D`
  .selector-label {
    font-size: 12px;
    color: ${Je(o.textSecondary)};
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
    border: 2px solid ${Je(o.divider)};
    background: ${Je(o.bgSecondary)};
    color: ${Je(o.textPrimary)};
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .mode-btn:hover:not(:disabled):not(.active) {
    border-color: ${Je(o.accent)};
  }

  .mode-btn.active {
    background: ${Je(o.accent)};
    border-color: ${Je(o.accent)};
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
`;let Ct=class extends S{constructor(){super(...arguments),this.value="home_1",this.disabled=!1,this.buttonStates={home_1:"idle",home_2:"idle",home_3:"idle",home_ups:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("mode-change",{detail:{mode:e},bubbles:!0}))}render(){return d`
      <div class="selector-label">
        Re\u017Eim st\u0159\u00EDda\u010De
      </div>
      <div class="mode-buttons">
        ${["home_1","home_2","home_3","home_ups"].map(t=>{const i=this.buttonStates[t],n=this.disabled||i==="pending"||i==="processing"||i==="disabled-by-service";return d`
            <button
              class="mode-btn ${i}"
              ?disabled=${n}
              @click=${()=>this.onModeClick(t)}
            >
              ${ia[t]}
              ${i==="pending"?d`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?d`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};Ct.styles=[an];pe([h({type:String})],Ct.prototype,"value",2);pe([h({type:Boolean})],Ct.prototype,"disabled",2);pe([h({type:Object})],Ct.prototype,"buttonStates",2);Ct=pe([C("oig-box-mode-selector")],Ct);let Re=class extends S{constructor(){super(...arguments),this.value="off",this.limit=0,this.disabled=!1,this.pendingTarget=null,this.buttonStates={off:"idle",on:"idle",limited:"idle"}}onDeliveryClick(e){const t=this.buttonStates[e];this.disabled||t==="pending"||t==="processing"||t==="disabled-by-service"||t==="active"&&e!=="limited"||this.dispatchEvent(new CustomEvent("delivery-change",{detail:{value:e,limit:e==="limited"?this.limit:null},bubbles:!0}))}render(){const e=[{value:"off",label:Kt.off},{value:"on",label:Kt.on},{value:"limited",label:Kt.limited}],i=this.pendingTarget!==null&&this.pendingTarget!==this.value?d`<span class="status-text transitioning">\u23F3\u00A0${Kt[this.pendingTarget]}</span>`:null;return d`
      <div class="selector-label">
        Dod\u00E1vka do s\u00EDt\u011B ${i}
      </div>
      <div class="mode-buttons">
        ${e.map(n=>{const r=this.buttonStates[n.value],a=n.value===this.value,s=n.value===this.pendingTarget&&!a,l=this.disabled||r==="pending"||r==="processing"||r==="disabled-by-service",c=a&&r==="disabled-by-service"?"active disabled-by-service":s?`${r} pending-target`:r;return d`
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
    `}};Re.styles=[an,D`
      .mode-btn.pending-target {
        border-color: #ffc107;
        color: #ffc107;
        background: rgba(255, 193, 7, 0.08);
      }
    `];pe([h({type:String})],Re.prototype,"value",2);pe([h({type:Number})],Re.prototype,"limit",2);pe([h({type:Boolean})],Re.prototype,"disabled",2);pe([h({type:String})],Re.prototype,"pendingTarget",2);pe([h({type:Object})],Re.prototype,"buttonStates",2);Re=pe([C("oig-grid-delivery-selector")],Re);let Pt=class extends S{constructor(){super(...arguments),this.value="cbb",this.disabled=!1,this.buttonStates={cbb:"idle",manual:"idle"}}onModeClick(e){const t=this.buttonStates[e];this.disabled||t==="active"||t==="pending"||t==="processing"||t==="disabled-by-service"||this.dispatchEvent(new CustomEvent("boiler-mode-change",{detail:{mode:e},bubbles:!0}))}render(){return d`
      <div class="selector-label">
        Re\u017Eim bojleru
      </div>
      <div class="mode-buttons">
        ${["cbb","manual"].map(t=>{const i=this.buttonStates[t],n=this.disabled||i==="pending"||i==="processing"||i==="disabled-by-service";return d`
            <button
              class="mode-btn ${i}"
              ?disabled=${n}
              @click=${()=>this.onModeClick(t)}
            >
              ${ra[t]} ${na[t]}
              ${i==="pending"?d`<span style="font-size:10px"> \u23F3</span>`:""}
              ${i==="processing"?d`<span style="font-size:10px"> \uD83D\uDD04</span>`:""}
            </button>
          `})}
      </div>
    `}};Pt.styles=[an];pe([h({type:String})],Pt.prototype,"value",2);pe([h({type:Boolean})],Pt.prototype,"disabled",2);pe([h({type:Object})],Pt.prototype,"buttonStates",2);Pt=pe([C("oig-boiler-mode-selector")],Pt);let He=class extends S{constructor(){super(...arguments),this.homeGridV=!1,this.homeGridVi=!1,this.flexibilita=!1,this.available=!1,this.disabled=!1}getButtonClass(e){return e&&this.disabled?"active disabled-by-service":e?"active":this.disabled?"disabled-by-service":"idle"}onToggleClick(e){this.disabled||this.dispatchEvent(new CustomEvent("supplementary-toggle",{detail:{key:e},bubbles:!0}))}render(){const e=this.getButtonClass(this.homeGridV),t=this.getButtonClass(this.homeGridVi),i=this.flexibilita?d`<span class="flexibilita-badge">\u26A1 Flexibilita</span>`:"";return d`
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
          ${this.homeGridV&&!this.disabled?d`<span style="font-size:10px"> \u2713</span>`:""}
        </button>
        <button
          class="mode-btn ${t}"
          ?disabled=${this.disabled}
          @click=${()=>this.onToggleClick("home_grid_vi")}
        >
          Home 6
          ${this.homeGridVi&&!this.disabled?d`<span style="font-size:10px"> \u2713</span>`:""}
        </button>
      </div>
    `}};He.styles=[an,D`
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
    `];pe([h({type:Boolean})],He.prototype,"homeGridV",2);pe([h({type:Boolean})],He.prototype,"homeGridVi",2);pe([h({type:Boolean})],He.prototype,"flexibilita",2);pe([h({type:Boolean})],He.prototype,"available",2);pe([h({type:Boolean})],He.prototype,"disabled",2);He=pe([C("oig-supplementary-selector")],He);function Hu(e){const t=!e.available||e.flexibilita;return e.available?{home_grid_v:e.home_grid_v,home_grid_vi:e.home_grid_vi,flexibilita:e.flexibilita,available:e.available,disabled:t}:{home_grid_v:!1,home_grid_vi:!1,flexibilita:e.flexibilita,available:!1,disabled:!0}}var Vu=Object.defineProperty,ju=Object.getOwnPropertyDescriptor,Et=(e,t,i,n)=>{for(var r=n>1?void 0:n?ju(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Vu(t,i,r),r};const be=K;let Ve=class extends S{constructor(){super(...arguments),this.items=[],this.expanded=!1,this.shieldStatus="idle",this.queueCount=0,this._now=Date.now(),this.updateInterval=null}connectedCallback(){super.connectedCallback(),this.updateInterval=window.setInterval(()=>{this._now=Date.now()},1e3)}disconnectedCallback(){super.disconnectedCallback(),this.updateInterval!==null&&clearInterval(this.updateInterval)}toggleExpanded(){this.expanded=!this.expanded}removeItem(e,t){t.stopPropagation(),this.dispatchEvent(new CustomEvent("remove-item",{detail:{position:e},bubbles:!0}))}formatServiceName(e,t){return t==="supplementary_toggle"?"⚙️ Změna doplňkového režimu":Us[e]||e||"N/A"}stripCurrentSuffix(e){const i=e.indexOf("(nyní:");return i===-1?e.trim():e.slice(0,i).trim()}formatChanges(e){return!e||e.length===0?"N/A":e.map(t=>{const i=t.indexOf("→");if(i===-1)return t;const n=t.slice(0,i).trim(),r=t.slice(i+1).trim(),a=n.indexOf(":"),s=a===-1?n:n.slice(a+1),l=n.includes("prm2_app")?aa:Zs,c=s.replaceAll("'","").trim(),u=this.stripCurrentSuffix(r).replaceAll("'","").trim(),p=l[c]||c,f=l[u]||u;return`${p} → ${f}`}).join(", ")}formatTimestamp(e){if(!e)return{time:"--",duration:"--"};try{const t=new Date(e);if(isNaN(t.getTime()))return{time:"--",duration:"--"};const i=new Date(this._now),n=Math.floor((i.getTime()-t.getTime())/1e3),r=String(t.getHours()).padStart(2,"0"),a=String(t.getMinutes()).padStart(2,"0");let s=`${r}:${a}`;if(t.toDateString()!==i.toDateString()){const c=t.getDate(),u=t.getMonth()+1;s=`${c}.${u}. ${s}`}let l;if(n<60)l=`${n}s`;else if(n<3600){const c=Math.floor(n/60),u=n%60;l=`${c}m ${u}s`}else{const c=Math.floor(n/3600),u=Math.floor(n%3600/60);l=`${c}h ${u}m`}return{time:s,duration:l}}catch{return{time:"--",duration:"--"}}}get activeCount(){return this.items.length}render(){this._now;const e=this.shieldStatus==="running"?"running":"idle",t=this.shieldStatus==="running"?"🔄 Zpracovává":"✓ Připraveno";return d`
      <div class="queue-header" @click=${this.toggleExpanded}>
        <div class="queue-title-area">
          <span class="queue-title">Shield fronta</span>
          ${this.activeCount>0?d`
            <span class="queue-count">(${this.activeCount} aktivn\u00EDch)</span>
          `:E}
          <span class="shield-status ${e}">${t}</span>
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
      `:E}
    `}renderRow(e,t){const i=e.status==="running",{time:n,duration:r}=this.formatTimestamp(e.createdAt);return d`
      <tr>
        <td class="${i?"status-running":"status-queued"}">
          ${i?"🔄 Zpracovává se":"⏳ Čeká"}
        </td>
        <td>${this.formatServiceName(e.service,e.type)}</td>
        <td class="hide-mobile" style="font-size: 11px;">${this.formatChanges(e.changes)}</td>
        <td class="queue-time">${n}</td>
        <td class="queue-time duration">${r}</td>
        <td style="text-align: center;">
          ${i?d`<span style="opacity: 0.4;">\u2014</span>`:d`
            <button
              class="remove-btn"
              title="Odstranit z fronty"
              @click=${a=>this.removeItem(e.position,a)}
            >\uD83D\uDDD1\uFE0F</button>
          `}
        </td>
      </tr>
    `}};Ve.styles=D`
    :host {
      display: block;
      background: ${be(o.cardBg)};
      border-radius: 12px;
      box-shadow: ${be(o.cardShadow)};
      overflow: hidden;
    }

    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: ${be(o.bgSecondary)};
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
      color: ${be(o.textPrimary)};
    }

    .queue-count {
      font-size: 12px;
      color: ${be(o.textSecondary)};
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
      color: ${be(o.accent)};
      transition: transform 0.2s;
    }

    .queue-toggle.expanded {
      transform: rotate(180deg);
    }

    .queue-content {
      padding: 0;
      border-top: 1px solid ${be(o.divider)};
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
      color: ${be(o.textSecondary)};
      border-bottom: 1px solid ${be(o.divider)};
      background: ${be(o.bgSecondary)};
    }

    .queue-table td {
      padding: 8px 12px;
      color: ${be(o.textPrimary)};
      border-bottom: 1px solid ${be(o.divider)};
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
      color: ${be(o.textSecondary)};
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
  `;Et([h({type:Array})],Ve.prototype,"items",2);Et([h({type:Boolean})],Ve.prototype,"expanded",2);Et([h({type:String})],Ve.prototype,"shieldStatus",2);Et([h({type:Number})],Ve.prototype,"queueCount",2);Et([x()],Ve.prototype,"_now",2);Ve=Et([C("oig-shield-queue")],Ve);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Wu={CHILD:2},qu=e=>(...t)=>({_$litDirective$:e,values:t});class Yu{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,n){this._$Ct=t,this._$AM=i,this._$Ci=n}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class An extends Yu{constructor(t){if(super(t),this.it=E,t.type!==Wu.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===E||t==null)return this._t=void 0,this.it=t;if(t===xs)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}}An.directiveName="unsafeHTML",An.resultType=1;const Gu=qu(An);var Uu=Object.defineProperty,Zu=Object.getOwnPropertyDescriptor,xi=(e,t,i,n)=>{for(var r=n>1?void 0:n?Zu(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Uu(t,i,r),r};const he=K;let st=class extends S{constructor(){super(...arguments),this.open=!1,this.config={title:"",message:""},this.acknowledged=!1,this.limitValue=5e3,this.resolver=null,this.onOverlayClick=()=>{this.closeDialog({confirmed:!1})},this.onDialogClick=e=>{e.stopPropagation()},this.onKeyDown=e=>{e.key==="Escape"&&this.open&&this.closeDialog({confirmed:!1})},this.onAckChange=e=>{this.acknowledged=e.target.checked},this.onLimitInput=e=>{this.limitValue=parseInt(e.target.value,10)||0},this.onCancel=()=>{this.closeDialog({confirmed:!1})},this.onConfirm=()=>{const e=this.config.showLimitInput||this.config.limitOnly;if(e){const t=this.config.limitMin??1,i=this.config.limitMax??2e4;if(isNaN(this.limitValue)||this.limitValue<t||this.limitValue>i)return}this.closeDialog({confirmed:!0,limit:e?this.limitValue:void 0})}}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.onKeyDown)}showDialog(e){return this.config=e,this.acknowledged=!1,this.limitValue=e.limitValue??5e3,this.open=!0,new Promise(t=>{this.resolver=t})}closeDialog(e){var t;this.open=!1,(t=this.resolver)==null||t.call(this,e),this.resolver=null}get canConfirm(){return!(this.config.requireAcknowledgement&&!this.acknowledged)}render(){if(!this.open)return E;const e=this.config;return e.limitOnly?d`
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
      `:d`
      <div @click=${this.onOverlayClick}>
        <div class="dialog" @click=${this.onDialogClick}>
          <div class="dialog-header">
            ${e.title}
          </div>

          <div class="dialog-body">
            ${this.renderHTML(e.message)}
          </div>

          ${e.showLimitInput?d`
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
          `:E}

          ${e.warning?d`
            <div class="dialog-warning">
              \u26A0\uFE0F ${this.renderHTML(e.warning)}
            </div>
          `:E}

          ${e.requireAcknowledgement?d`
            <div class="ack-wrapper" @click=${()=>{this.acknowledged=!this.acknowledged}}>
              <input
                type="checkbox"
                .checked=${this.acknowledged}
                @change=${this.onAckChange}
                @click=${t=>t.stopPropagation()}
              />
              <label>
                ${e.acknowledgementText?this.renderHTML(e.acknowledgementText):d`
                  <strong>Souhlas\u00EDm</strong> s t\u00EDm, \u017Ee m\u011Bn\u00EDm nastaven\u00ED na vlastn\u00ED odpov\u011Bdnost.
                  Aplikace nenese odpov\u011Bdnost za p\u0159\u00EDpadn\u00E9 negativn\u00ED d\u016Fsledky t\u00E9to zm\u011Bny.
                `}
              </label>
            </div>
          `:E}

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
    `}renderHTML(e){return Gu(e)}};st.styles=D`
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
      background: ${he(o.cardBg)};
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
      color: ${he(o.textPrimary)};
      border-bottom: 1px solid ${he(o.divider)};
    }

    .dialog-body {
      padding: 16px 20px;
      font-size: 14px;
      line-height: 1.5;
      color: ${he(o.textPrimary)};
    }

    .dialog-warning {
      margin: 0 20px 12px;
      padding: 10px 14px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      font-size: 13px;
      color: ${he(o.textPrimary)};
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
      background: ${he(o.bgSecondary)};
      border-radius: 8px;
      cursor: pointer;
    }

    .ack-wrapper input[type="checkbox"] {
      margin-top: 2px;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${he(o.accent)};
    }

    .ack-wrapper label {
      font-size: 13px;
      line-height: 1.4;
      color: ${he(o.textPrimary)};
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
      color: ${he(o.textPrimary)};
    }

    .limit-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid ${he(o.divider)};
      border-radius: 8px;
      font-size: 14px;
      background: ${he(o.bgPrimary)};
      color: ${he(o.textPrimary)};
      box-sizing: border-box;
    }

    .limit-hint {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      opacity: 0.7;
      color: ${he(o.textSecondary)};
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
      background: ${he(o.bgSecondary)};
      color: ${he(o.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${he(o.divider)};
    }

    .btn-confirm {
      background: ${he(o.accent)};
      color: #fff;
    }

    .btn-confirm:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-confirm:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;xi([h({type:Boolean,reflect:!0})],st.prototype,"open",2);xi([h({type:Object})],st.prototype,"config",2);xi([x()],st.prototype,"acknowledged",2);xi([x()],st.prototype,"limitValue",2);st=xi([C("oig-confirm-dialog")],st);var Ku=Object.defineProperty,Qu=Object.getOwnPropertyDescriptor,Ha=(e,t,i,n)=>{for(var r=n>1?void 0:n?Qu(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Ku(t,i,r),r};const Ut=K;let Gi=class extends S{constructor(){super(...arguments),this.shieldState=null}render(){if(!this.shieldState)return E;const e=this.determineStatus(this.shieldState),t=e.toLowerCase(),i=this.getStatusIcon(e),n=this.getStatusLabel(e),a=this.shieldState.queueCount>0?"has-items":"";return d`
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
    `}determineStatus(e){return e.status==="running"?"processing":e.queueCount>0?"pending":"idle"}getStatusIcon(e){switch(e){case"idle":return"✓";case"pending":return"⏳";case"processing":return"🔄";default:return"✓"}}getStatusLabel(e){switch(e){case"idle":return"Připraveno";case"pending":return"Čeká";case"processing":return"Zpracovává";default:return"Neznámý"}}getActivityText(){return this.shieldState?this.shieldState.activity?this.shieldState.activity:this.shieldState.queueCount>0?`${this.shieldState.queueCount} operací ve frontě`:"Systém připraven":"Žádná aktivita"}};Gi.styles=D`
    :host {
      display: block;
      padding: 16px 20px;
      border-top: 1px solid ${Ut(o.divider)};
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
      color: ${Ut(o.textPrimary)};
    }

    .shield-status-subtitle {
      font-size: 11px;
      color: ${Ut(o.textSecondary)};
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
      background: ${Ut(o.bgSecondary)};
      color: ${Ut(o.textSecondary)};
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
  `;Ha([h({type:Object})],Gi.prototype,"shieldState",2);Gi=Ha([C("oig-shield-status")],Gi);var Xu=Object.defineProperty,Ju=Object.getOwnPropertyDescriptor,Zn=(e,t,i,n)=>{for(var r=n>1?void 0:n?Ju(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&Xu(t,i,r),r};const ft=K;let ci=class extends S{constructor(){super(...arguments),this.shieldState={...sa,pendingServices:new Map,changingServices:new Set},this._confirmDialogOverride=null,this.unsubscribe=null,this.onShieldUpdate=e=>{this.shieldState=e}}get confirmDialog(){return this._confirmDialogOverride??this._confirmDialogQuery}set confirmDialog(e){this._confirmDialogOverride=e}connectedCallback(){super.connectedCallback(),this.unsubscribe=X.subscribe(this.onShieldUpdate)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.unsubscribe)==null||e.call(this),this.unsubscribe=null}get boxModeButtonStates(){return{home_1:X.getBoxModeButtonState("home_1"),home_2:X.getBoxModeButtonState("home_2"),home_3:X.getBoxModeButtonState("home_3"),home_ups:X.getBoxModeButtonState("home_ups")}}get gridDeliveryButtonStates(){return{off:X.getGridDeliveryButtonState("off"),on:X.getGridDeliveryButtonState("on"),limited:X.getGridDeliveryButtonState("limited")}}get boilerModeButtonStates(){return{cbb:X.getBoilerModeButtonState("cbb"),manual:X.getBoilerModeButtonState("manual")}}get supplementaryView(){return Hu(this.shieldState.supplementary)}async onBoxModeChange(e){const{mode:t}=e.detail,i=ia[t];if(v.debug("Control panel: box mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu střídače",message:`Chystáte se změnit režim boxu na <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování celého systému a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!X.shouldProceedWithQueue())return;await X.setBoxMode(t)||v.warn("Box mode change failed or already active",{mode:t})}async onGridDeliveryChange(e){const{value:t,limit:i}=e.detail,n=Kt[t],r=Gs[t],a=t==="limited",s=this.shieldState.gridDeliveryState.currentLiveLimit??5e3;v.debug("Control panel: grid delivery change requested",{delivery:t,limit:i});const l=this.shieldState.gridDeliveryState.currentLiveDelivery;if(!this.shieldState.gridDeliveryState.isTransitioning&&l==="limited"&&t==="limited"){const b={title:"🚰 Změnit limit přetoků",message:"",limitOnly:!0,showLimitInput:!0,limitValue:s,limitMin:1,limitMax:2e4,limitStep:100,confirmText:"Uložit limit",cancelText:"Zrušit"},g=await this.confirmDialog.showDialog(b);if(!g.confirmed||!X.shouldProceedWithQueue())return;await X.setGridDelivery("limited",g.limit);return}const u={title:`${r} Změna dodávky do sítě`,message:`Chystáte se změnit dodávku do sítě na: <strong>"${n}"</strong>`,warning:a?"Režim a limit budou změněny postupně (serializováno). Každá změna může trvat až 10 minut.":"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,acknowledgementText:"<strong>Souhlasím</strong> s tím, že měním dodávku do sítě na vlastní odpovědnost. Aplikace nenese odpovědnost za případné negativní důsledky této změny.",confirmText:"Potvrdit změnu",cancelText:"Zrušit",showLimitInput:a,limitValue:s,limitMin:1,limitMax:2e4,limitStep:100},p=await this.confirmDialog.showDialog(u);if(!p.confirmed||!X.shouldProceedWithQueue())return;const f=this.shieldState.gridDeliveryState.currentLiveDelivery==="limited",y=t==="limited";f&&y&&p.limit!=null?await X.setGridDelivery(t,p.limit):y&&p.limit!=null?await X.setGridDelivery(t,p.limit):await X.setGridDelivery(t)}async onBoilerModeChange(e){const{mode:t}=e.detail,i=na[t],n=ra[t];if(v.debug("Control panel: boiler mode change requested",{mode:t}),!(await this.confirmDialog.showDialog({title:"Změna režimu bojleru",message:`Chystáte se změnit režim bojleru na <strong>"${n} ${i}"</strong>.<br><br>Tato změna ovlivní chování ohřevu vody a může trvat až 10 minut.`,warning:"Změna režimu může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!X.shouldProceedWithQueue())return;await X.setBoilerMode(t)||v.warn("Boiler mode change failed or already active",{mode:t})}async onSupplementaryToggle(e){const{key:t}=e.detail,i=t==="home_grid_v"?"Home 5":"Home 6",n=!this.shieldState.supplementary[t];if(v.debug("Control panel: supplementary toggle requested",{key:t}),!(await this.confirmDialog.showDialog({title:"Změna doplňkového režimu",message:`Chystáte se přepnout <strong>"${i}"</strong>.<br><br>Tato změna ovlivní chování systému a může trvat až 10 minut.`,warning:"Změna může trvat až 10 minut. Během této doby je systém v přechodném stavu.",requireAcknowledgement:!0,confirmText:"Potvrdit změnu",cancelText:"Zrušit"})).confirmed||!X.shouldProceedWithQueue())return;await X.setSupplementaryToggle(t,n)||v.warn("Supplementary toggle failed",{key:t})}async onQueueRemoveItem(e){const{position:t}=e.detail;v.debug("Control panel: queue remove requested",{position:t});const i=this.shieldState.allRequests.find(s=>s.position===t);let n="Operace";if(i&&(i.service.includes("set_box_mode")?n=`Změna režimu na ${i.targetValue||"neznámý"}`:i.service.includes("set_grid_delivery")?n=`Změna dodávky do sítě na ${i.targetValue||"neznámý"}`:i.service.includes("set_boiler_mode")&&(n=`Změna režimu bojleru na ${i.targetValue||"neznámý"}`)),!(await this.confirmDialog.showDialog({title:n,message:"Operace bude odstraněna z fronty bez provedení.",requireAcknowledgement:!1,confirmText:"OK",cancelText:"Zrušit"})).confirmed)return;await X.removeFromQueue(t)||v.warn("Failed to remove from queue",{position:t})}render(){const e=this.shieldState,t=e.status==="running"?"running":"idle",i=e.status==="running"?"Zpracovává":"Připraveno",n=e.allRequests.length>0;return d`
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
        ${n?d`
          <div class="queue-section">
            <oig-shield-queue
              .items=${e.allRequests}
              .shieldStatus=${e.status}
              .queueCount=${e.queueCount}
              .expanded=${!1}
              @remove-item=${this.onQueueRemoveItem}
            ></oig-shield-queue>
          </div>
        `:E}
      </div>

      <!-- Shared confirm dialog instance -->
      <oig-confirm-dialog></oig-confirm-dialog>
    `}};ci.styles=D`
    :host {
      display: block;
      margin-top: 16px;
    }

    .control-panel {
      background: ${ft(o.cardBg)};
      border-radius: 16px;
      box-shadow: ${ft(o.cardShadow)};
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid ${ft(o.divider)};
    }

    .panel-title {
      font-size: 15px;
      font-weight: 600;
      color: ${ft(o.textPrimary)};
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
      background: ${ft(o.divider)};
      margin: 16px 0;
    }

    .queue-section {
      border-top: 1px solid ${ft(o.divider)};
    }

    @media (max-width: 480px) {
      .panel-body {
        padding: 12px 14px;
      }
    }
  `;Zn([x()],ci.prototype,"shieldState",2);Zn([Ji("oig-confirm-dialog")],ci.prototype,"_confirmDialogQuery",2);ci=Zn([C("oig-control-panel")],ci);var ep=Object.defineProperty,tp=Object.getOwnPropertyDescriptor,zt=(e,t,i,n)=>{for(var r=n>1?void 0:n?tp(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&ep(t,i,r),r};const ge=K;let je=class extends S{constructor(){super(...arguments),this.open=!1,this.currentSoc=0,this.maxSoc=100,this.estimate=null,this.targetSoc=80}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onSliderInput(e){this.targetSoc=parseInt(e.target.value,10),this.dispatchEvent(new CustomEvent("soc-change",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}onConfirm(){this.dispatchEvent(new CustomEvent("confirm",{detail:{targetSoc:this.targetSoc},bubbles:!0}))}render(){return d`
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
    `}};je.styles=D`
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
      background: ${ge(o.cardBg)};
      border-radius: 16px;
      padding: 24px;
      min-width: 320px;
      max-width: 90vw;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${ge(o.textPrimary)};
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
      color: ${ge(o.textSecondary)};
    }

    .soc-value {
      font-size: 24px;
      font-weight: 600;
      color: ${ge(o.textPrimary)};
    }

    .soc-arrow {
      font-size: 20px;
      color: ${ge(o.textSecondary)};
    }

    .slider-container {
      margin: 16px 0;
    }

    .slider {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: ${ge(o.bgSecondary)};
      -webkit-appearance: none;
      appearance: none;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${ge(o.accent)};
      cursor: pointer;
    }

    .estimate {
      background: ${ge(o.bgSecondary)};
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
      color: ${ge(o.textSecondary)};
    }

    .estimate-value {
      color: ${ge(o.textPrimary)};
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
      background: ${ge(o.bgSecondary)};
      color: ${ge(o.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${ge(o.divider)};
    }

    .btn-confirm {
      background: ${ge(o.accent)};
      color: #fff;
    }

    .btn-confirm:hover {
      opacity: 0.9;
    }
  `;zt([h({type:Boolean})],je.prototype,"open",2);zt([h({type:Number})],je.prototype,"currentSoc",2);zt([h({type:Number})],je.prototype,"maxSoc",2);zt([h({type:Object})],je.prototype,"estimate",2);zt([x()],je.prototype,"targetSoc",2);je=zt([C("oig-battery-charge-dialog")],je);var ip=Object.defineProperty,np=Object.getOwnPropertyDescriptor,ke=(e,t,i,n)=>{for(var r=n>1?void 0:n?np(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&ip(t,i,r),r};const xn=K,Kn=D`
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
`;let di=class extends S{constructor(){super(...arguments),this.title="",this.icon="📊"}render(){return d`
      <div class="block-header">
        <span class="block-icon">${this.icon}</span>
        <span class="block-title">${this.title}</span>
      </div>
      <slot></slot>
    `}};di.styles=D`
    :host {
      display: block;
      background: ${xn(o.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${xn(o.cardShadow)};
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
      color: ${xn(o.textPrimary)};
    }

    ${Kn}
  `;ke([h({type:String})],di.prototype,"title",2);ke([h({type:String})],di.prototype,"icon",2);di=ke([C("oig-analytics-block")],di);let Ui=class extends S{constructor(){super(...arguments),this.data=null}render(){if(!this.data)return d`<div>Načítání...</div>`;const e=this.data.trend>=0?"positive":"negative",t=this.data.trend>=0?"+":"",i=this.data.period==="last_month"?"Minulý měsíc":`Aktuální měsíc (${this.data.currentMonthDays} dní)`;return d`
      <div class="efficiency-value">${xt(this.data.efficiency,1)}</div>
      <div class="period-label">${i}</div>

      ${this.data.trend!==0?d`
        <div class="comparison ${e}">
          ${t}${xt(this.data.trend)} vs minulý měsíc
        </div>
      `:null}

      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${vt(this.data.charged)}</div>
          <div class="stat-label">Nabito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${vt(this.data.discharged)}</div>
          <div class="stat-label">Vybito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${vt(this.data.losses)}</div>
          <div class="stat-label">Ztráty</div>
          ${this.data.lossesPct?d`
            <div class="losses-pct">${xt(this.data.lossesPct,1)}</div>
          `:null}
        </div>
      </div>
    `}};Ui.styles=D`
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
  `;ke([h({type:Object})],Ui.prototype,"data",2);Ui=ke([C("oig-battery-efficiency")],Ui);let Zi=class extends S{constructor(){super(...arguments),this.data=null}renderSparkline(){var c;const e=(c=this.data)==null?void 0:c.measurementHistory;if(!e||e.length<2)return null;const t=e.map(u=>u.soh_percent),i=Math.min(...t)-1,r=Math.max(...t)+1-i||1,a=200,s=40,l=t.map((u,p)=>{const f=p/(t.length-1)*a,y=s-(u-i)/r*s;return`${f},${y}`}).join(" ");return d`
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
          <span class="metric-value">${xt(this.data.soh,1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Kapacita (P80)</span>
          <span class="metric-value">${vt(this.data.capacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Min. kapacita (P20)</span>
          <span class="metric-value">${vt(this.data.minCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Nominální kapacita</span>
          <span class="metric-value">${vt(this.data.nominalCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Počet měření</span>
          <span class="metric-value">${this.data.measurementCount}</span>
        </div>
        ${this.data.qualityScore!=null?d`
          <div class="metric">
            <span class="metric-label">Kvalita dat</span>
            <span class="metric-value">${xt(this.data.qualityScore,0)}</span>
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
                Spolehlivost: <span class="prediction-value">${xt(this.data.trendConfidence,0)}</span>
              </div>
            `:null}
          </div>
        `:null}
      </oig-analytics-block>
    `:d`<div>Načítání...</div>`}};Zi.styles=D`
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

    ${Kn}

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
  `;ke([h({type:Object})],Zi.prototype,"data",2);Zi=ke([C("oig-battery-health")],Zi);let Ki=class extends S{constructor(){super(...arguments),this.data=null}getProgressClass(e){return e==null?"ok":e>=95?"overdue":e>=80?"due-soon":"ok"}render(){return this.data?d`
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
          <span class="metric-value">${ie(this.data.cost)}</span>
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
            <span class="metric-value">${ie(this.data.estimatedNextCost)}</span>
          </div>
        `:null}
      </oig-analytics-block>
    `:d`<div>Načítání...</div>`}};Ki.styles=D`
    :host { display: block; }
    ${Kn}

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
  `;ke([h({type:Object})],Ki.prototype,"data",2);Ki=ke([C("oig-battery-balancing")],Ki);let Qi=class extends S{constructor(){super(...arguments),this.data=null}render(){return this.data?d`
      <oig-analytics-block title="Porovnání nákladů" icon="💰">
        <div class="cost-row">
          <span class="cost-label">Skutečné náklady</span>
          <span class="cost-value">${ie(this.data.actualSpent)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Plán celkem</span>
          <span class="cost-value">${ie(this.data.planTotalCost)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Zbývající plán</span>
          <span class="cost-value">${ie(this.data.futurePlanCost)}</span>
        </div>
        ${this.data.tomorrowCost!=null?d`
          <div class="cost-row">
            <span class="cost-label">Zítra odhad</span>
            <span class="cost-value">${ie(this.data.tomorrowCost)}</span>
          </div>
        `:null}

        ${this.data.yesterdayActualCost!=null?d`
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
            ${this.data.yesterdayDelta!=null?d`
              <div class="cost-row">
                <span class="cost-label">Rozdíl</span>
                <span class="cost-value ${this.data.yesterdayDelta<=0?"delta-positive":"delta-negative"}">
                  ${this.data.yesterdayDelta>=0?"+":""}${ie(this.data.yesterdayDelta)}
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
    `:d`<div>Načítání...</div>`}};Qi.styles=D`
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
  `;ke([h({type:Object})],Qi.prototype,"data",2);Qi=ke([C("oig-cost-comparison")],Qi);var rp=Object.defineProperty,ap=Object.getOwnPropertyDescriptor,Lt=(e,t,i,n)=>{for(var r=n>1?void 0:n?ap(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&rp(t,i,r),r};const bt=K;let ui=class extends S{constructor(){super(...arguments),this.data=Jt,this.compact=!1,this.onClick=()=>{this.dispatchEvent(new CustomEvent("badge-click",{bubbles:!0}))}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.onClick)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.onClick)}render(){const e=this.data.effectiveSeverity,t=Oi[e]??Oi[0],i=this.data.warningsCount>0&&e>0,n=i?ga(this.data.eventType):"✓";return d`
      <style>
        :host { background: ${bt(t)}; }
      </style>
      <span class="badge-icon">${n}</span>
      ${i?d`
        <span class="badge-count">${this.data.warningsCount}</span>
      `:null}
      <span class="badge-label">${i?fa[e]??"Výstraha":"OK"}</span>
    `}};ui.styles=D`
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
  `;Lt([h({type:Object})],ui.prototype,"data",2);Lt([h({type:Boolean})],ui.prototype,"compact",2);ui=Lt([C("oig-chmu-badge")],ui);let pi=class extends S{constructor(){super(...arguments),this.open=!1,this.data=Jt}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}formatTime(e){return e?new Date(e).toLocaleString("cs-CZ"):"—"}renderWarning(e){const t=Oi[e.severity]??Oi[2],i=ga(e.event_type),n=fa[e.severity]??"Neznámá";return d`
      <div class="warning-item" style="background: ${t}">
        <div class="warning-header">
          <span class="warning-icon">${i}</span>
          <span class="warning-type">${e.event_type}</span>
          <span class="warning-level">${n}</span>
          ${e.eta_hours>0?d`
            <span class="eta-badge">za ${e.eta_hours.toFixed(0)}h</span>
          `:null}
        </div>
        ${e.description?d`
          <div class="warning-description">${e.description}</div>
        `:null}
        ${e.instruction?d`
          <div class="warning-instruction">${e.instruction}</div>
        `:null}
        <div class="warning-time">
          ${this.formatTime(e.onset)} — ${this.formatTime(e.expires)}
        </div>
      </div>
    `}render(){const e=this.data.allWarnings,t=e.length>0&&this.data.effectiveSeverity>0;return d`
      <div class="modal" @click=${i=>i.stopPropagation()}>
        <div class="modal-header">
          <span class="modal-title">⚠️ ČHMÚ výstrahy</span>
          <button class="close-btn" @click=${this.onClose}>✕</button>
        </div>

        ${t?e.map(i=>this.renderWarning(i)):d`
          <div class="empty-state">Žádné aktivní výstrahy</div>
        `}
      </div>
    `}};pi.styles=D`
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
      background: ${bt(o.cardBg)};
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
      color: ${bt(o.textPrimary)};
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      font-size: 20px;
      cursor: pointer;
      color: ${bt(o.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${bt(o.bgSecondary)};
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
      color: ${bt(o.textSecondary)};
    }

    .eta-badge {
      display: inline-block;
      font-size: 10px;
      padding: 1px 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      margin-left: 6px;
    }
  `;Lt([h({type:Boolean,reflect:!0})],pi.prototype,"open",2);Lt([h({type:Object})],pi.prototype,"data",2);pi=Lt([C("oig-chmu-modal")],pi);var sp=Object.defineProperty,op=Object.getOwnPropertyDescriptor,Le=(e,t,i,n)=>{for(var r=n>1?void 0:n?op(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&sp(t,i,r),r};const N=K;let ot=class extends S{constructor(){super(...arguments),this.open=!1,this.activeTab="today",this.data=null,this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.open&&this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onClose(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0}))}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return ma[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return d`
      <div
        class="mode-block ${i?"current":""}"
        style="background: ${t.color}; flex: ${Math.max(e.durationHours,.5)}"
        title="${e.startTime}–${e.endTime} | ${t.label}"
      >
        ${e.modeMatch?null:d`<span class="mode-mismatch">!</span>`}
        <span class="mode-icon">${t.icon}</span>
        <span class="mode-name">${t.label}</span>
        <span class="mode-time">${e.startTime}–${e.endTime}</span>
        ${e.costPlanned!=null?d`
          <span class="mode-cost">${ie(e.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(e,t){const i=t.unit==="Kč"?ie(t.plan):`${t.plan.toFixed(1)} ${t.unit}`;let n="",r="";return t.hasActual&&t.actual!=null&&(r=t.unit==="Kč"?ie(t.actual):`${t.actual.toFixed(1)} ${t.unit}`,t.unit==="Kč"?n=t.actual<=t.plan?"better":"worse":n=t.actual>=t.plan?"better":"worse"),d`
      <div class="metric-tile">
        <div class="metric-label">${e}</div>
        <div class="metric-values">
          <span class="metric-plan">${i}</span>
          ${t.hasActual?d`
            <span class="metric-actual ${n}">(${r})</span>
          `:null}
        </div>
      </div>
    `}render(){const e=["yesterday","today","tomorrow","history","detail"];return d`
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
          ${e.map(t=>d`
            <button
              class="tab ${this.activeTab===t?"active":""}"
              @click=${()=>this.onTabClick(t)}
            >
              ${ba[t]}
            </button>
          `)}
        </div>

        <div class="dialog-content">
          ${this.data?this.renderDayContent():d`
            <div class="empty-state">Načítání dat...</div>
          `}
        </div>
      </div>
    `}renderDayContent(){const e=this.data,t=e.summary;return d`
      <!-- Adherence bar -->
      ${t.overallAdherence>0?d`
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
      ${t.progressPct!=null?d`
        <div class="progress-section">
          <div class="progress-item">
            Průběh: <span class="progress-value">${this.fmtPct(t.progressPct)}</span>
          </div>
          ${t.actualTotalCost!=null?d`
            <div class="progress-item">
              Skutečné: <span class="progress-value">${ie(t.actualTotalCost)}</span>
            </div>
          `:null}
          ${t.planTotalCost!=null?d`
            <div class="progress-item">
              Plán: <span class="progress-value">${ie(t.planTotalCost)}</span>
            </div>
          `:null}
          ${t.vsPlanPct!=null?d`
            <div class="progress-item">
              vs plán: <span class="progress-value" style="color: ${t.vsPlanPct<=100?"#4caf50":"#f44336"}">${this.fmtPct(t.vsPlanPct)}</span>
            </div>
          `:null}
        </div>
      `:null}

      <!-- EOD prediction -->
      ${t.eodPrediction?d`
        <div class="eod-prediction">
          Predikce konce dne: <span class="eod-value">${ie(t.eodPrediction.predictedTotal)}</span>
          ${t.eodPrediction.predictedSavings>0?d`
            <span class="eod-savings"> (úspora ${ie(t.eodPrediction.predictedSavings)})</span>
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
      ${e.modeBlocks.length>0?d`
        <div class="modes-section">
          <div class="section-title">Režimy (${e.modeBlocks.length} bloků, ${t.modeSwitches} přepnutí)</div>
          <div class="mode-blocks-timeline">
            ${e.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}

      <!-- Comparison plan (if available) -->
      ${e.comparison?d`
        <div class="modes-section">
          <div class="section-title">Srovnání: ${e.comparison.plan}</div>
          <div class="mode-blocks-timeline">
            ${e.comparison.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}
    `}};ot.styles=D`
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
      background: ${N(o.cardBg)};
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
      border-bottom: 1px solid ${N(o.divider)};
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${N(o.textPrimary)};
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
      color: ${N(o.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${N(o.bgSecondary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${N(o.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${N(o.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 12px 16px;
      border: none;
      background: transparent;
      font-size: 13px;
      color: ${N(o.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${N(o.textPrimary)};
    }

    .tab.active {
      color: ${N(o.accent)};
      border-bottom-color: ${N(o.accent)};
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
      color: ${N(o.textSecondary)};
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
      background: ${N(o.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
    }

    .metric-label {
      font-size: 11px;
      color: ${N(o.textSecondary)};
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
      color: ${N(o.textPrimary)};
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
      color: ${N(o.textPrimary)};
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
      color: ${N(o.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${N(o.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${N(o.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 12px;
      color: ${N(o.textSecondary)};
    }

    .eod-value {
      font-size: 16px;
      font-weight: 600;
      color: ${N(o.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: ${N(o.textSecondary)};
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
  `;Le([h({type:Boolean,reflect:!0})],ot.prototype,"open",2);Le([h({type:String})],ot.prototype,"activeTab",2);Le([h({type:Object})],ot.prototype,"data",2);Le([x()],ot.prototype,"autoRefresh",2);ot=Le([C("oig-timeline-dialog")],ot);let Tt=class extends S{constructor(){super(...arguments),this.data=null,this.activeTab="today",this.autoRefresh=!0,this.refreshInterval=null}connectedCallback(){super.connectedCallback(),this.autoRefresh&&this.startAutoRefresh()}disconnectedCallback(){super.disconnectedCallback(),this.stopAutoRefresh()}startAutoRefresh(){this.refreshInterval=window.setInterval(()=>{this.autoRefresh&&this.dispatchEvent(new CustomEvent("refresh",{bubbles:!0}))},6e4)}stopAutoRefresh(){this.refreshInterval!==null&&(clearInterval(this.refreshInterval),this.refreshInterval=null)}onTabClick(e){this.activeTab=e,this.dispatchEvent(new CustomEvent("tab-change",{detail:{tab:e},bubbles:!0}))}toggleAutoRefresh(){this.autoRefresh=!this.autoRefresh,this.autoRefresh?this.startAutoRefresh():this.stopAutoRefresh()}fmtPct(e){return`${e.toFixed(0)}%`}adherenceColor(e){return e>=90?"#4caf50":e>=70?"#ff9800":"#f44336"}getModeConfig(e){return ma[e]??{icon:"❓",color:"#666",label:e}}renderModeBlock(e){const t=this.getModeConfig(e.modePlanned||e.modeHistorical),i=e.status==="current";return d`
      <div
        class="mode-block ${i?"current":""}"
        style="background: ${t.color}; flex: ${Math.max(e.durationHours,.5)}"
        title="${e.startTime}–${e.endTime} | ${t.label}"
      >
        ${e.modeMatch?null:d`<span class="mode-mismatch">!</span>`}
        <span class="mode-icon">${t.icon}</span>
        <span class="mode-name">${t.label}</span>
        <span class="mode-time">${e.startTime}–${e.endTime}</span>
        ${e.costPlanned!=null?d`
          <span class="mode-cost">${ie(e.costPlanned)}</span>
        `:null}
      </div>
    `}renderMetricTile(e,t){const i=t.unit==="Kč"?ie(t.plan):`${t.plan.toFixed(1)} ${t.unit}`;let n="",r="";return t.hasActual&&t.actual!=null&&(r=t.unit==="Kč"?ie(t.actual):`${t.actual.toFixed(1)} ${t.unit}`,t.unit==="Kč"?n=t.actual<=t.plan?"better":"worse":n=t.actual>=t.plan?"better":"worse"),d`
      <div class="metric-tile">
        <div class="metric-label">${e}</div>
        <div class="metric-values">
          <span class="metric-plan">${i}</span>
          ${t.hasActual?d`
            <span class="metric-actual ${n}">(${r})</span>
          `:null}
        </div>
      </div>
    `}render(){const e=["yesterday","today","tomorrow","history","detail"];return d`
      <div class="tile">
        <div class="tile-header">
          <span class="tile-title">📅 Plán režimů</span>
          <label class="auto-refresh">
            <input type="checkbox" .checked=${this.autoRefresh} @change=${this.toggleAutoRefresh} />
            Auto
          </label>
        </div>

        <div class="tabs">
          ${e.map(t=>d`
            <button
              class="tab ${this.activeTab===t?"active":""}"
              @click=${()=>this.onTabClick(t)}
            >
              ${ba[t]}
            </button>
          `)}
        </div>

        <div class="tile-content">
          ${this.data?this.renderDayContent():d`
            <div class="empty-state">Načítání dat...</div>
          `}
        </div>
      </div>
    `}renderDayContent(){const e=this.data,t=e.summary;return d`
      <!-- Adherence bar -->
      ${t.overallAdherence>0?d`
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
      ${t.progressPct!=null?d`
        <div class="progress-section">
          <div class="progress-item">
            Průběh: <span class="progress-value">${this.fmtPct(t.progressPct)}</span>
          </div>
          ${t.actualTotalCost!=null?d`
            <div class="progress-item">
              Skutečné: <span class="progress-value">${ie(t.actualTotalCost)}</span>
            </div>
          `:null}
          ${t.planTotalCost!=null?d`
            <div class="progress-item">
              Plán: <span class="progress-value">${ie(t.planTotalCost)}</span>
            </div>
          `:null}
          ${t.vsPlanPct!=null?d`
            <div class="progress-item">
              vs plán: <span class="progress-value" style="color: ${t.vsPlanPct<=100?"#4caf50":"#f44336"}">${this.fmtPct(t.vsPlanPct)}</span>
            </div>
          `:null}
        </div>
      `:null}

      <!-- EOD prediction -->
      ${t.eodPrediction?d`
        <div class="eod-prediction">
          Predikce konce dne: <span class="eod-value">${ie(t.eodPrediction.predictedTotal)}</span>
          ${t.eodPrediction.predictedSavings>0?d`
            <span class="eod-savings"> (úspora ${ie(t.eodPrediction.predictedSavings)})</span>
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
      ${e.modeBlocks.length>0?d`
        <div class="modes-section">
          <div class="section-title">Režimy (${e.modeBlocks.length} bloků, ${t.modeSwitches} přepnutí)</div>
          <div class="mode-blocks-timeline">
            ${e.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}

      <!-- Comparison plan (if available) -->
      ${e.comparison?d`
        <div class="modes-section">
          <div class="section-title">Srovnání: ${e.comparison.plan}</div>
          <div class="mode-blocks-timeline">
            ${e.comparison.modeBlocks.map(i=>this.renderModeBlock(i))}
          </div>
        </div>
      `:null}
    `}};Tt.styles=D`
    :host {
      display: block;
    }

    .tile {
      background: ${N(o.cardBg)};
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
      border-bottom: 1px solid ${N(o.divider)};
    }

    .tile-title {
      font-size: 13px;
      font-weight: 600;
      color: ${N(o.textPrimary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${N(o.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${N(o.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 6px 10px;
      border: none;
      background: transparent;
      font-size: 11px;
      color: ${N(o.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${N(o.textPrimary)};
    }

    .tab.active {
      color: ${N(o.accent)};
      border-bottom-color: ${N(o.accent)};
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
      color: ${N(o.textSecondary)};
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
      background: ${N(o.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
    }

    .metric-label {
      font-size: 10px;
      color: ${N(o.textSecondary)};
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
      color: ${N(o.textPrimary)};
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
      color: ${N(o.textPrimary)};
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
      color: ${N(o.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${N(o.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${N(o.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${N(o.textSecondary)};
    }

    .eod-value {
      font-size: 14px;
      font-weight: 600;
      color: ${N(o.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 24px 16px;
      color: ${N(o.textSecondary)};
      font-size: 12px;
    }
  `;Le([h({type:Object})],Tt.prototype,"data",2);Le([h({type:String})],Tt.prototype,"activeTab",2);Le([x()],Tt.prototype,"autoRefresh",2);Tt=Le([C("oig-timeline-tile")],Tt);var lp=Object.defineProperty,cp=Object.getOwnPropertyDescriptor,qe=(e,t,i,n)=>{for(var r=n>1?void 0:n?cp(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&lp(t,i,r),r};const ae=K;let Dt=class extends S{constructor(){super(...arguments),this.data=null,this.editMode=!1,this.tileType="entity"}onTileClick(){var t;if(this.editMode)return;const e=(t=this.data)==null?void 0:t.config;e&&(e.type==="button"&&e.action?rl(e.entity_id,e.action):J.openEntityDialog(e.entity_id))}onSupportClick(e,t){e.stopPropagation(),!this.editMode&&J.openEntityDialog(t)}onEdit(){var e;this.dispatchEvent(new CustomEvent("edit-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}onDelete(){var e;this.dispatchEvent(new CustomEvent("delete-tile",{detail:{entityId:(e=this.data)==null?void 0:e.config.entity_id},bubbles:!0,composed:!0}))}render(){var c,u;if(!this.data)return null;const e=this.data.config,t=e.type==="button";this.tileType!==e.type&&(this.tileType=e.type??"entity");const i=e.color||"",n=e.icon||(t?"⚡":"📊"),r=n.startsWith("mdi:")?Ei(n):n,a=(c=e.support_entities)==null?void 0:c.top_right,s=(u=e.support_entities)==null?void 0:u.bottom_right,l=this.data.supportValues.topRight||this.data.supportValues.bottomRight;return d`
      ${i?d`<style>:host { --tile-color: ${ae(i)}; }</style>`:null}

      <div class="tile-top" @click=${this.onTileClick} title=${this.editMode?"":e.entity_id}>
        <span class="tile-icon">${r}</span>
        <span class="tile-label">${e.label||""}</span>
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
        ${t?d`
          <span class="state-dot ${this.data.isActive?"on":"off"}"></span>
        `:null}
      </div>

      ${this.editMode?d`
        <div class="edit-actions">
          <button class="edit-btn" @click=${this.onEdit}>⚙</button>
          <button class="delete-btn" @click=${this.onDelete}>✕</button>
        </div>
      `:null}
    `}};Dt.styles=D`
    /* ===== BASE ===== */
    :host {
      display: flex;
      flex-direction: column;
      padding: 10px 12px;
      background: ${ae(o.cardBg)};
      border-radius: 10px;
      box-shadow: ${ae(o.cardShadow)};
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
      color: ${ae(o.textSecondary)};
      opacity: 0.45;
      font-style: normal;
    }

    /* ===== BUTTON TILE ===== */
    :host([tiletype="button"]) {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--tile-color, ${ae(o.accent)}) 10%, ${ae(o.cardBg)}),
        ${ae(o.cardBg)}
      );
      border: 1px solid color-mix(in srgb, var(--tile-color, ${ae(o.accent)}) 38%, transparent);
    }

    :host([tiletype="button"]:not([editmode]):hover) {
      transform: translateY(-2px);
      cursor: pointer;
      box-shadow:
        0 4px 14px color-mix(in srgb, var(--tile-color, ${ae(o.accent)}) 28%, transparent),
        ${ae(o.cardShadow)};
    }

    :host([tiletype="button"]:not([editmode]):active) {
      transform: translateY(0) scale(0.98);
      opacity: 0.85;
    }

    :host([tiletype="button"]) .tile-icon {
      background: color-mix(in srgb, var(--tile-color, ${ae(o.accent)}) 18%, transparent);
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
      color: ${ae(o.textSecondary)};
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
      color: ${ae(o.textSecondary)};
      white-space: nowrap;
      line-height: 1.2;
    }

    .support-value.clickable {
      cursor: pointer;
    }

    .support-value.clickable:hover {
      text-decoration: underline;
      color: ${ae(o.textPrimary)};
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
      color: ${ae(o.textPrimary)};
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .tile-unit {
      font-size: 11px;
      font-weight: 400;
      color: ${ae(o.textSecondary)};
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
      background: ${ae(o.success)};
      box-shadow: 0 0 4px ${ae(o.success)};
    }

    .state-dot.off {
      background: ${ae(o.textSecondary)};
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
      background: ${ae(o.bgSecondary)};
      border-radius: 50%;
      font-size: 9px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .delete-btn:hover {
      background: ${ae(o.error)};
      color: #fff;
    }
  `;qe([h({type:Object})],Dt.prototype,"data",2);qe([h({type:Boolean})],Dt.prototype,"editMode",2);qe([h({type:String,reflect:!0})],Dt.prototype,"tileType",2);Dt=qe([C("oig-tile")],Dt);let Mt=class extends S{constructor(){super(...arguments),this.tiles=[],this.editMode=!1,this.position="left"}render(){return this.tiles.length===0?d`<div class="empty-state">Žádné dlaždice</div>`:d`
      ${this.tiles.map(e=>d`
        <oig-tile
          .data=${e}
          .editMode=${this.editMode}
          .tileType=${e.config.type??"entity"}
          class="${e.isZero?"inactive":""}"
        ></oig-tile>
      `)}
    `}};Mt.styles=D`
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }

    .empty-state {
      font-size: 12px;
      color: ${ae(o.textSecondary)};
      padding: 8px;
      text-align: center;
      opacity: 0.6;
    }
  `;qe([h({type:Array})],Mt.prototype,"tiles",2);qe([h({type:Boolean})],Mt.prototype,"editMode",2);qe([h({type:String,reflect:!0})],Mt.prototype,"position",2);Mt=qe([C("oig-tiles-container")],Mt);var dp=Object.defineProperty,up=Object.getOwnPropertyDescriptor,Qn=(e,t,i,n)=>{for(var r=n>1?void 0:n?up(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&dp(t,i,r),r};const ee=K,Wr={Spotrebice:["fridge","fridge-outline","dishwasher","washing-machine","tumble-dryer","stove","microwave","coffee-maker","kettle","toaster","blender","food-processor","rice-cooker","slow-cooker","pressure-cooker","air-fryer","oven","range-hood"],Osvetleni:["lightbulb","lightbulb-outline","lamp","ceiling-light","floor-lamp","led-strip","led-strip-variant","wall-sconce","chandelier","desk-lamp","spotlight","light-switch"],"Vytapeni & Chlazeni":["thermometer","thermostat","radiator","radiator-disabled","heat-pump","air-conditioner","fan","hvac","fire","snowflake","fireplace","heating-coil"],"Energie & Baterie":["lightning-bolt","flash","battery","battery-charging","battery-50","battery-10","solar-panel","solar-power","meter-electric","power-plug","power-socket","ev-plug","transmission-tower","current-ac","current-dc"],"Auto & Doprava":["car","car-electric","car-battery","ev-station","ev-plug-type2","garage","garage-open","motorcycle","bicycle","scooter","bus","train","airplane"],Zabezpeceni:["door","door-open","lock","lock-open","shield-home","cctv","camera","motion-sensor","alarm-light","bell","eye","key","fingerprint","shield-check"],"Okna & Stineni":["window-closed","window-open","blinds","blinds-open","curtains","roller-shade","window-shutter","balcony","door-sliding"],"Media & Zabava":["television","speaker","speaker-wireless","music","volume-high","cast","chromecast","radio","headphones","microphone","gamepad","movie","spotify"],"Sit & IT":["router-wireless","wifi","access-point","lan","network","home-assistant","server","nas","cloud","ethernet","bluetooth","cellphone","tablet","laptop"],"Voda & Koupelna":["water","water-percent","water-boiler","water-pump","shower","toilet","faucet","pipe","bathtub","sink","water-heater","pool"],Pocasi:["weather-sunny","weather-cloudy","weather-night","weather-rainy","weather-snowy","weather-windy","weather-fog","weather-lightning","weather-hail","temperature","humidity","barometer"],"Ventilace & Kvalita vzduchu":["fan","air-filter","air-purifier","smoke-detector","co2","wind-turbine"],"Zahrada & Venku":["flower","tree","sprinkler","grass","garden-light","outdoor-lamp","grill","pool","hot-tub","umbrella","thermometer-lines"],Domacnost:["iron","vacuum","broom","mop","washing","basket","hanger","scissors"],"Notifikace & Stav":["information","help-circle","alert-circle","checkbox-marked-circle","check","close","minus","plus","arrow-up","arrow-down","refresh","sync","bell-ring"],Ovladani:["toggle-switch","power","play","pause","stop","skip-next","skip-previous","volume-up","volume-down","brightness-up","brightness-down"],"Cas & Planovani":["clock","timer","alarm","calendar","calendar-clock","schedule","history"],Ostatni:["home","cog","tools","wrench","hammer","chart-line","gauge","dots-vertical","menu","settings","account","logout"]};let hi=class extends S{constructor(){super(...arguments),this.isOpen=!1,this.searchQuery=""}get filteredCategories(){const e=this.searchQuery.trim().toLowerCase();if(!e)return Wr;const t=Object.entries(Wr).map(([i,n])=>{const r=n.filter(a=>a.toLowerCase().includes(e));return[i,r]}).filter(([,i])=>i.length>0);return Object.fromEntries(t)}open(){this.isOpen=!0}close(){this.isOpen=!1,this.searchQuery=""}onOverlayClick(e){e.target===e.currentTarget&&this.close()}onSearchInput(e){const t=e.target;this.searchQuery=(t==null?void 0:t.value)??""}onIconClick(e){this.dispatchEvent(new CustomEvent("icon-selected",{detail:{icon:`mdi:${e}`},bubbles:!0,composed:!0})),this.close()}render(){if(!this.isOpen)return null;const e=this.filteredCategories,t=Object.entries(e);return d`
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
            ${t.length===0?d`
              <div class="empty">Žádné ikony nenalezeny</div>
            `:t.map(([i,n])=>d`
              <div class="category">
                <div class="category-title">${i}</div>
                <div class="icon-grid">
                  ${n.map(r=>d`
                    <button class="icon-item" type="button" @click=${()=>this.onIconClick(r)}>
                      <span class="icon-emoji">${Ei(r)}</span>
                      <span class="icon-name">${r}</span>
                    </button>
                  `)}
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}};hi.styles=D`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${ee(o.bgPrimary)} 35%, transparent);
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
      background: ${ee(o.cardBg)};
      box-shadow: ${ee(o.cardShadow)};
      border-radius: 14px;
      border: 1px solid ${ee(o.divider)};
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
      border-bottom: 1px solid ${ee(o.divider)};
      gap: 12px;
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${ee(o.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${ee(o.bgSecondary)};
      color: ${ee(o.textPrimary)};
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
      background: ${ee(o.divider)};
      transform: scale(1.05);
    }

    .search {
      padding: 12px 18px;
      border-bottom: 1px solid ${ee(o.divider)};
      background: ${ee(o.bgSecondary)};
    }

    .search input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${ee(o.divider)};
      background: ${ee(o.bgPrimary)};
      color: ${ee(o.textPrimary)};
      font-size: 13px;
      outline: none;
    }

    .search input::placeholder {
      color: ${ee(o.textSecondary)};
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
      color: ${ee(o.textSecondary)};
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
      background: ${ee(o.bgSecondary)};
      cursor: pointer;
      transition: transform 0.15s ease, border 0.2s ease, background 0.2s ease;
      text-align: center;
      font-size: 10px;
      color: ${ee(o.textSecondary)};
    }

    .icon-item:hover {
      background: ${ee(o.bgPrimary)};
      border-color: ${ee(o.accent)};
      transform: translateY(-2px);
      color: ${ee(o.textPrimary)};
    }

    .icon-emoji {
      font-size: 22px;
      line-height: 1;
      color: ${ee(o.textPrimary)};
    }

    .icon-name {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      font-size: 12px;
      color: ${ee(o.textSecondary)};
      text-align: center;
      padding: 24px 0 12px;
    }
  `;Qn([h({type:Boolean,reflect:!0,attribute:"open"})],hi.prototype,"isOpen",2);Qn([x()],hi.prototype,"searchQuery",2);hi=Qn([C("oig-icon-picker")],hi);var pp=Object.defineProperty,hp=Object.getOwnPropertyDescriptor,ue=(e,t,i,n)=>{for(var r=n>1?void 0:n?hp(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&pp(t,i,r),r};const O=K;let re=class extends S{constructor(){super(...arguments),this.isOpen=!1,this.tileIndex=-1,this.tileSide="left",this.existingConfig=null,this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}loadTileConfig(e){var t,i;this.currentTab=e.type,e.type==="entity"?this.selectedEntityId=e.entity_id:this.selectedButtonEntityId=e.entity_id,this.label=e.label||"",this.icon=e.icon||"",this.color=e.color||"#03A9F4",this.action=e.action||"toggle",this.supportEntity1=((t=e.support_entities)==null?void 0:t.top_right)||"",this.supportEntity2=((i=e.support_entities)==null?void 0:i.bottom_right)||""}resetForm(){this.currentTab="entity",this.entitySearchText="",this.buttonSearchText="",this.selectedEntityId="",this.selectedButtonEntityId="",this.label="",this.icon="",this.color="#03A9F4",this.action="toggle",this.supportEntity1="",this.supportEntity2="",this.supportSearch1="",this.supportSearch2="",this.showSupportList1=!1,this.showSupportList2=!1,this.iconPickerOpen=!1}handleClose(){this.isOpen=!1,this.resetForm(),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}getEntities(){const e=Be();return e?e.getAll():{}}getEntityItems(e,t){const i=t.trim().toLowerCase(),n=this.getEntities();return Object.entries(n).filter(([a])=>e.some(s=>a.startsWith(s))).map(([a,s])=>{const l=this.getAttributeValue(s,"friendly_name")||a,c=this.getAttributeValue(s,"unit_of_measurement"),u=this.getAttributeValue(s,"icon");return{id:a,name:l,value:s.state,unit:c,icon:u,state:s}}).filter(a=>i?a.name.toLowerCase().includes(i)||a.id.toLowerCase().includes(i):!0).sort((a,s)=>a.name.localeCompare(s.name))}getSupportEntities(e){const t=e.trim().toLowerCase();if(!t)return[];const i=this.getEntities();return Object.entries(i).map(([n,r])=>{const a=this.getAttributeValue(r,"friendly_name")||n,s=this.getAttributeValue(r,"unit_of_measurement"),l=this.getAttributeValue(r,"icon");return{id:n,name:a,value:r.state,unit:s,icon:l,state:r}}).filter(n=>n.name.toLowerCase().includes(t)||n.id.toLowerCase().includes(t)).sort((n,r)=>n.name.localeCompare(r.name)).slice(0,20)}getDisplayIcon(e){return e?e.startsWith("mdi:")?Ei(e):e:Ei("")}getColorForEntity(e){switch(e.split(".")[0]){case"sensor":return"#03A9F4";case"binary_sensor":return"#4CAF50";case"switch":return"#FFC107";case"light":return"#FF9800";case"fan":return"#00BCD4";case"input_boolean":return"#9C27B0";default:return"#03A9F4"}}applyEntityDefaults(e){if(!e)return;const i=this.getEntities()[e];if(!i)return;this.label||(this.label=this.getAttributeValue(i,"friendly_name"));const n=this.getAttributeValue(i,"icon");!this.icon&&n&&(this.icon=n),this.color=this.getColorForEntity(e)}handleEntitySelect(e){this.selectedEntityId=e,this.applyEntityDefaults(e)}handleButtonEntitySelect(e){this.selectedButtonEntityId=e,this.applyEntityDefaults(e)}handleSupportInput(e,t){const i=t.trim();e===1?(this.supportSearch1=t,this.showSupportList1=!!i,i||(this.supportEntity1="")):(this.supportSearch2=t,this.showSupportList2=!!i,i||(this.supportEntity2=""))}handleSupportSelect(e,t){const i=t.name||t.id;e===1?(this.supportEntity1=t.id,this.supportSearch1=i,this.showSupportList1=!1):(this.supportEntity2=t.id,this.supportSearch2=i,this.showSupportList2=!1)}getSupportInputValue(e,t){if(e)return e;if(!t)return"";const i=this.getEntities()[t];return i&&this.getAttributeValue(i,"friendly_name")||t}getAttributeValue(e,t){var n;const i=(n=e.attributes)==null?void 0:n[t];return i==null?"":String(i)}handleSave(){const e=this.currentTab==="entity"?this.selectedEntityId:this.selectedButtonEntityId;if(!e){window.alert("Vyberte entitu");return}const t={top_right:this.supportEntity1||void 0,bottom_right:this.supportEntity2||void 0},i={type:this.currentTab,entity_id:e,label:this.label||void 0,icon:this.icon||void 0,color:this.color||void 0,action:this.currentTab==="button"?this.action:void 0,support_entities:t};this.dispatchEvent(new CustomEvent("tile-saved",{detail:{index:this.tileIndex,side:this.tileSide,config:i},bubbles:!0,composed:!0})),this.handleClose()}onIconSelected(e){var t;this.icon=((t=e.detail)==null?void 0:t.icon)||"",this.iconPickerOpen=!1}renderEntityList(e,t,i,n){const r=this.getEntityItems(e,t);return r.length===0?d`<div class="support-empty">Žádné entity nenalezeny</div>`:d`
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
    `}renderSupportList(e,t){const i=this.getSupportEntities(e);return i.length===0?d`<div class="support-empty">Žádné entity nenalezeny</div>`:d`
      ${i.map(n=>d`
        <div
          class="support-item"
          @mousedown=${()=>this.handleSupportSelect(t,n)}
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
          @input=${e=>{this.handleSupportInput(2,e.target.value)}}
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
          @input=${e=>{this.handleSupportInput(2,e.target.value)}}
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
    `:null}};re.styles=D`
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
  `;ue([h({type:Boolean,reflect:!0,attribute:"open"})],re.prototype,"isOpen",2);ue([h({type:Number})],re.prototype,"tileIndex",2);ue([h({attribute:!1})],re.prototype,"tileSide",2);ue([h({attribute:!1})],re.prototype,"existingConfig",2);ue([x()],re.prototype,"currentTab",2);ue([x()],re.prototype,"entitySearchText",2);ue([x()],re.prototype,"buttonSearchText",2);ue([x()],re.prototype,"selectedEntityId",2);ue([x()],re.prototype,"selectedButtonEntityId",2);ue([x()],re.prototype,"label",2);ue([x()],re.prototype,"icon",2);ue([x()],re.prototype,"color",2);ue([x()],re.prototype,"action",2);ue([x()],re.prototype,"supportEntity1",2);ue([x()],re.prototype,"supportEntity2",2);ue([x()],re.prototype,"supportSearch1",2);ue([x()],re.prototype,"supportSearch2",2);ue([x()],re.prototype,"showSupportList1",2);ue([x()],re.prototype,"showSupportList2",2);ue([x()],re.prototype,"iconPickerOpen",2);re=ue([C("oig-tile-dialog")],re);var gp=Object.defineProperty,fp=Object.getOwnPropertyDescriptor,W=(e,t,i,n)=>{for(var r=n>1?void 0:n?fp(t,i):t,a=e.length-1,s;a>=0;a--)(s=e[a])&&(r=(n?s(t,i,r):s(r))||r);return n&&r&&gp(t,i,r),r};const _e=K,qr=new URLSearchParams(window.location.search),tt=qr.get("sn")||qr.get("inverter_sn")||"",Yr=`sensor.oig_${tt}_`,mp=[{id:"flow",label:"Toky",icon:"⚡"},{id:"pricing",label:"Ceny",icon:"💰"},{id:"boiler",label:"Bojler",icon:"🔥"}];let H=class extends S{constructor(){super(...arguments),this.hass=null,this.loading=!0,this.error=null,this.activeTab="flow",this.editMode=!1,this.time="",this.leftPanelCollapsed=!1,this.rightPanelCollapsed=!1,this.flowData=In,this.pricingData=null,this.pricingLoading=!1,this.boilerState=null,this.boilerLoading=!1,this.boilerPlan=null,this.boilerEnergyBreakdown=null,this.boilerPredictedUsage=null,this.boilerConfig=null,this.boilerHeatmap7x24=[],this.boilerProfiling=null,this.boilerCurrentCategory="",this.boilerAvailableCategories=[],this.boilerForecastWindows={fve:"--",grid:"--"},this.boilerV2Data=null,this.boilerRefreshTimer=null,this.analyticsData=Cr,this.chmuData=Jt,this.chmuModalOpen=!1,this.timelineTab="today",this.timelineData=null,this.tilesConfig=null,this.tilesLeft=[],this.tilesRight=[],this.tileDialogOpen=!1,this.editingTileIndex=-1,this.editingTileSide="left",this.editingTileConfig=null,this.entityStore=null,this.timeInterval=null,this.stateWatcherUnsub=null,this.tileEntityUnsubs=[],this.pricingDirty=!1,this.timelineDirty=!1,this.analyticsDirty=!1,this.boilerDirty=!1,this.reconnecting=!1,this.throttledUpdateFlow=fn(()=>this.updateFlowData(),500),this.throttledUpdateSensors=fn(()=>this.updateSensorData(),1e3),this.throttledRefreshDerivedData=fn(()=>this.refreshDerivedData(),5e3),this.onPageShow=()=>{this.rebindHassContext()},this.onDocumentVisibilityChange=()=>{document.visibilityState==="visible"&&this.rebindHassContext()}}connectedCallback(){super.connectedCallback(),window.addEventListener("pageshow",this.onPageShow),document.addEventListener("visibilitychange",this.onDocumentVisibilityChange),this.initApp(),this.startTimeUpdate()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("pageshow",this.onPageShow),document.removeEventListener("visibilitychange",this.onDocumentVisibilityChange),this.cleanup()}updated(e){e.has("hass")&&!e.has("loading")&&this.rebindHassContext(),e.has("activeTab")&&(this.activeTab==="pricing"&&(!this.pricingData||this.pricingDirty)&&this.loadPricingData(),this.activeTab==="pricing"&&(this.analyticsData===Cr||this.analyticsDirty)&&this.loadAnalyticsAsync(),this.activeTab==="pricing"&&(!this.timelineData||this.timelineDirty)&&this.loadTimelineTabData(this.timelineTab),this.activeTab==="boiler"&&(!this.boilerState||this.boilerDirty)&&this.loadBoilerDataAsync())}async initApp(){try{const e=await J.getHass();if(!e)throw new Error("Cannot access Home Assistant context");this.hass=e,this.entityStore=js(e,tt),await it.start({getHass:()=>J.getHassSync(),prefixes:[Yr]}),this.stateWatcherUnsub=it.onEntityChange((t,i)=>{this.syncHassState(t,i),this.throttledUpdateFlow(),this.throttledUpdateSensors(),this.throttledRefreshDerivedData()}),X.start(),this.updateFlowData(),this.updateSensorData(),this.loadPricingData(),this.loadBoilerDataAsync(),this.loadAnalyticsAsync(),this.loadTilesAsync(),this.loading=!1,v.info("App initialized",{entities:Object.keys(e.states||{}).length,inverterSn:tt})}catch(e){this.error=e.message,this.loading=!1,v.error("App init failed",e)}}cleanup(){var e,t;(e=this.stateWatcherUnsub)==null||e.call(this),this.stateWatcherUnsub=null,it.stop(),X.stop(),this.tileEntityUnsubs.forEach(i=>i()),this.tileEntityUnsubs=[],(t=this.entityStore)==null||t.destroy(),this.entityStore=null,this.timeInterval!==null&&(clearInterval(this.timeInterval),this.timeInterval=null),this.boilerRefreshTimer!==null&&(clearInterval(this.boilerRefreshTimer),this.boilerRefreshTimer=null)}async rebindHassContext(){var e;if(!this.reconnecting){this.reconnecting=!0;try{const t=await J.refreshHass();if(!t)return;this.hass=t,(e=this.entityStore)==null||e.updateHass(t),await it.start({getHass:()=>J.getHassSync(),prefixes:[Yr]}),this.updateFlowData(),this.updateSensorData()}catch(t){v.error("Failed to rebind hass context",t)}finally{this.reconnecting=!1}}}updateFlowData(){var e;if(this.hass)try{const t=((e=this.entityStore)==null?void 0:e.getAll())??this.hass;this.flowData=oo(t,tt)}catch(t){v.error("Failed to extract flow data",t)}}updateSensorData(){if(this.chmuData=Xo(tt),this.activeTab==="pricing"&&(this.analyticsData={...this.analyticsData,...Ko()}),this.tilesConfig){const e=jt(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}}updateTilesImmediate(){if(!this.tilesConfig)return;const e=jt(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right}subscribeTileEntities(){if(this.tileEntityUnsubs.forEach(t=>t()),this.tileEntityUnsubs=[],!this.tilesConfig||!this.entityStore)return;const e=new Set;[...this.tilesConfig.tiles_left,...this.tilesConfig.tiles_right].forEach(t=>{var i,n;t&&(e.add(t.entity_id),(i=t.support_entities)!=null&&i.top_right&&e.add(t.support_entities.top_right),(n=t.support_entities)!=null&&n.bottom_right&&e.add(t.support_entities.bottom_right))});for(const t of e){const i=this.entityStore.subscribe(t,()=>{this.updateTilesImmediate()});this.tileEntityUnsubs.push(i)}}async loadPricingData(){if(!(!this.hass||this.pricingLoading)){this.pricingLoading=!0;try{const e=await Wt(()=>Co(this.hass));this.pricingData=e,this.pricingDirty=!1}catch(e){v.error("Failed to load pricing data",e)}finally{this.pricingLoading=!1}}}async loadBoilerDataAsync(){if(!(!this.hass||this.boilerLoading)){this.boilerLoading=!0;try{const e=await Wt(()=>Go(this.hass));this.boilerState=e.state,this.boilerPlan=e.plan,this.boilerEnergyBreakdown=e.energyBreakdown,this.boilerPredictedUsage=e.predictedUsage,this.boilerConfig=e.config,this.boilerHeatmap7x24=e.heatmap7x24,this.boilerProfiling=e.profiling,this.boilerCurrentCategory=e.currentCategory,this.boilerAvailableCategories=e.availableCategories,this.boilerForecastWindows=e.forecastWindows,this.boilerV2Data=e.v2Data,this.boilerDirty=!1,this.boilerRefreshTimer||(this.boilerRefreshTimer=window.setInterval(()=>this.loadBoilerDataAsync(),5*60*1e3))}catch(e){v.error("Failed to load boiler data",e)}finally{this.boilerLoading=!1}}}async loadAnalyticsAsync(){try{this.analyticsData=await Wt(()=>Zo(tt)),this.analyticsDirty=!1}catch(e){v.error("Failed to load analytics",e)}}async loadTilesAsync(){try{this.tilesConfig=await Wt(()=>nl());const e=jt(this.tilesConfig);this.tilesLeft=e.left,this.tilesRight=e.right,this.subscribeTileEntities()}catch(e){v.error("Failed to load tiles config",e)}}async loadTimelineTabData(e){try{this.timelineData=await Wt(()=>tl(tt,e)),this.timelineDirty=!1}catch(t){v.error(`Failed to load timeline tab: ${e}`,t)}}syncHassState(e,t){if(this.hass){if(this.hass.states||(this.hass.states={}),t){this.hass.states[e]=t;return}delete this.hass.states[e]}}refreshDerivedData(){if(this.pricingDirty=!0,this.timelineDirty=!0,this.analyticsDirty=!0,this.boilerDirty=!0,this.activeTab==="pricing"){fo(),this.loadPricingData(),this.loadTimelineTabData(this.timelineTab),this.loadAnalyticsAsync();return}this.activeTab==="boiler"&&this.loadBoilerDataAsync()}startTimeUpdate(){const e=()=>{this.time=new Date().toLocaleTimeString("cs-CZ",{hour:"2-digit",minute:"2-digit"})};e(),this.timeInterval=window.setInterval(e,1e3)}onTabChange(e){this.activeTab=e.detail.tabId}onGridChargingOpen(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector("oig-grid-charging-dialog");e==null||e.show()}onEditClick(){this.editMode=!this.editMode}onResetClick(){var i,n;const e=(i=this.shadowRoot)==null?void 0:i.querySelector("oig-flow-canvas");e!=null&&e.resetLayout&&e.resetLayout();const t=(n=this.shadowRoot)==null?void 0:n.querySelector("oig-grid");t&&t.resetLayout()}onToggleLeftPanel(){this.leftPanelCollapsed=!this.leftPanelCollapsed}onToggleRightPanel(){this.rightPanelCollapsed=!this.rightPanelCollapsed}onChmuBadgeClick(){this.chmuModalOpen=!0}onChmuModalClose(){this.chmuModalOpen=!1}onTimelineTabChange(e){this.timelineTab=e.detail.tab,this.loadTimelineTabData(e.detail.tab)}onTimelineRefresh(){this.loadTimelineTabData(this.timelineTab)}onBoilerCategoryChange(e){const t=e.detail.category;this.boilerCurrentCategory=t,this.loadBoilerDataAsync()}onEditTile(e){const{entityId:t}=e.detail;let i=-1,n="left",r=null;if(this.tilesConfig){const a=this.tilesConfig.tiles_left.findIndex(s=>s&&s.entity_id===t);if(a>=0)i=a,n="left",r=this.tilesConfig.tiles_left[a];else{const s=this.tilesConfig.tiles_right.findIndex(l=>l&&l.entity_id===t);s>=0&&(i=s,n="right",r=this.tilesConfig.tiles_right[s])}}this.editingTileIndex=i,this.editingTileSide=n,this.editingTileConfig=r,this.tileDialogOpen=!0,r&&requestAnimationFrame(()=>{var s;const a=(s=this.shadowRoot)==null?void 0:s.querySelector("oig-tile-dialog");a==null||a.loadTileConfig(r)})}onDeleteTile(e){const{entityId:t}=e.detail;if(!this.tilesConfig||!t)return;const i={...this.tilesConfig};i.tiles_left=i.tiles_left.map(r=>r&&r.entity_id===t?null:r),i.tiles_right=i.tiles_right.map(r=>r&&r.entity_id===t?null:r),this.tilesConfig=i;const n=jt(i);this.tilesLeft=n.left,this.tilesRight=n.right,Dr(i),this.subscribeTileEntities()}onTileSaved(e){const{index:t,side:i,config:n}=e.detail;if(!this.tilesConfig)return;const r={...this.tilesConfig},a=i==="left"?[...r.tiles_left]:[...r.tiles_right];if(t>=0&&t<a.length)a[t]=n;else{const l=a.findIndex(c=>c===null);l>=0?a[l]=n:a.push(n)}i==="left"?r.tiles_left=a:r.tiles_right=a,this.tilesConfig=r;const s=jt(r);this.tilesLeft=s.left,this.tilesRight=s.right,Dr(r),this.subscribeTileEntities()}onTileDialogClose(){this.tileDialogOpen=!1,this.editingTileConfig=null,this.editingTileIndex=-1}render(){var t,i,n,r,a,s,l,c,u,p,f,y,b;if(this.loading)return d`<div class="loading"><div class="spinner"></div><span>Načítání...</span></div>`;if(this.error)return d`
        <div class="error">
          <h2>Chyba připojení</h2>
          <p>${this.error}</p>
          <button @click=${()=>{this.error=null,this.loading=!0,this.initApp()}}>Zkusit znovu</button>
        </div>
      `;const e=this.chmuData.effectiveSeverity>0?this.chmuData.warningsCount:0;return d`
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
          .tabs=${mp}
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
                `:E}
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
               `:E}

               <!-- V2: Status panel (heating state, source, temperatures, comfort) -->
               ${(t=this.boilerV2Data)!=null&&t.status?d`<oig-boiler-status-panel .data=${this.boilerV2Data.status}></oig-boiler-status-panel>`:this.boilerLoading?d`<oig-boiler-unavailable-state reason="loading" message=""></oig-boiler-unavailable-state>`:(i=this.boilerV2Data)!=null&&i.loadError?d`<oig-boiler-unavailable-state reason="error" .message=${this.boilerV2Data.loadError}></oig-boiler-unavailable-state>`:((n=this.boilerV2Data)==null?void 0:n.status)===null&&(((s=(a=(r=this.boilerV2Data)==null?void 0:r.explanation)==null?void 0:a.degradedReasons)==null?void 0:s.length)??0)>0?d`<oig-boiler-unavailable-state reason="degraded" .message=${(((c=(l=this.boilerV2Data)==null?void 0:l.explanation)==null?void 0:c.degradedReasons)??[]).join(", ")}></oig-boiler-unavailable-state>`:d`<oig-boiler-unavailable-state reason="unavailable" message="Data bojleru nejsou k dispozici"></oig-boiler-unavailable-state>`}

               <!-- V2: Plan timeline (slots) -->
               <oig-boiler-plan-timeline .slots=${((u=this.boilerV2Data)==null?void 0:u.planSlots)??[]}></oig-boiler-plan-timeline>

               <!-- V2: Source explanation (reason codes, freshness) -->
               <oig-boiler-source-explanation .explanation=${((p=this.boilerV2Data)==null?void 0:p.explanation)??null}></oig-boiler-source-explanation>

               <!-- V2: Manual override (secondary, collapsed by default) -->
               <details>
                 <summary>Ruční přepis zdroje</summary>
                 <oig-boiler-override-panel
                   .identity=${((f=this.boilerV2Data)==null?void 0:f.identity)??{entryId:null,boxId:null,available:!1}}
                   .currentOverride=${((y=this.boilerV2Data)==null?void 0:y.manualOverride)??null}
                 ></oig-boiler-override-panel>
               </details>

               <!-- Legacy sections (subordinate) -->
               <details>
                 <summary>Diagnostika a ladění</summary>

                 <!-- State header (current temp + heating dot) -->
                 <oig-boiler-state .state=${this.boilerState}></oig-boiler-state>

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
                     .targetTemp=${((b=this.boilerConfig)==null?void 0:b.targetTempC)??60}
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
               </details>
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
    `}};H.styles=D`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      font-family: ${_e(o.fontFamily)};
      color: ${_e(o.textPrimary)};
      background: ${_e(o.bgPrimary)};
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
      color: ${_e(o.textSecondary)};
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid ${_e(o.divider)};
      border-top-color: ${_e(o.accent)};
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
      color: ${_e(o.error)};
      text-align: center;
      animation: fadeIn 0.3s ease;
    }

    .error h2 {
      margin-bottom: 8px;
    }

    .error button {
      margin-top: 12px;
      padding: 8px 16px;
      background: ${_e(o.accent)};
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
      background: ${_e(o.bgSecondary)};
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
      background: ${_e(o.cardBg)};
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      font-size: 12px;
      color: ${_e(o.textSecondary)};
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
  `;W([h({type:Object})],H.prototype,"hass",2);W([x()],H.prototype,"loading",2);W([x()],H.prototype,"error",2);W([x()],H.prototype,"activeTab",2);W([x()],H.prototype,"editMode",2);W([x()],H.prototype,"time",2);W([x()],H.prototype,"leftPanelCollapsed",2);W([x()],H.prototype,"rightPanelCollapsed",2);W([x()],H.prototype,"flowData",2);W([x()],H.prototype,"pricingData",2);W([x()],H.prototype,"pricingLoading",2);W([x()],H.prototype,"boilerState",2);W([x()],H.prototype,"boilerLoading",2);W([x()],H.prototype,"boilerPlan",2);W([x()],H.prototype,"boilerEnergyBreakdown",2);W([x()],H.prototype,"boilerPredictedUsage",2);W([x()],H.prototype,"boilerConfig",2);W([x()],H.prototype,"boilerHeatmap7x24",2);W([x()],H.prototype,"boilerProfiling",2);W([x()],H.prototype,"boilerCurrentCategory",2);W([x()],H.prototype,"boilerAvailableCategories",2);W([x()],H.prototype,"boilerForecastWindows",2);W([x()],H.prototype,"boilerV2Data",2);W([x()],H.prototype,"analyticsData",2);W([x()],H.prototype,"chmuData",2);W([x()],H.prototype,"chmuModalOpen",2);W([x()],H.prototype,"timelineTab",2);W([x()],H.prototype,"timelineData",2);W([x()],H.prototype,"tilesConfig",2);W([x()],H.prototype,"tilesLeft",2);W([x()],H.prototype,"tilesRight",2);W([x()],H.prototype,"tileDialogOpen",2);W([x()],H.prototype,"editingTileIndex",2);W([x()],H.prototype,"editingTileSide",2);W([x()],H.prototype,"editingTileConfig",2);H=W([C("oig-app")],H);v.info("V2 starting",{version:"2.0.0-beta.1"});Bs();async function bp(){try{const e=await Is(),t=document.getElementById("app");t&&(t.innerHTML="",t.appendChild(e)),v.info("V2 mounted successfully")}catch(e){v.error("V2 bootstrap failed",e);const t=document.getElementById("app");t&&(t.innerHTML=`
        <div style="padding: 20px; font-family: system-ui;">
          <h2>Chyba načítání</h2>
          <p>Nepodařilo se načíst dashboard. Zkuste obnovit stránku.</p>
          <details>
            <summary>Detaily</summary>
            <pre>${e.message}</pre>
          </details>
        </div>`)}}bp();
//# sourceMappingURL=index.js.map
