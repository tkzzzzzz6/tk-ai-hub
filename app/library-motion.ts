"use client";

import {useRef} from "react";
import gsap from "gsap";
import {useGSAP} from "@gsap/react";

gsap.registerPlugin(useGSAP);

type MotionOptions={enabled:boolean;resultsKey:string;feedbackKey:string};
type QuickTween=ReturnType<typeof gsap.quickTo>;
type CardMotion={rotationX:QuickTween;rotationY:QuickTween;y:QuickTween;scaleX:QuickTween;scaleY:QuickTween};
type CaseMotion={y:QuickTween;z:QuickTween;scaleX:QuickTween;scaleY:QuickTween};
const reducedMotion="(prefers-reduced-motion: reduce)";
const finePointer="(hover: hover) and (pointer: fine)";
const clamp=(value:number)=>Math.min(1,Math.max(0,value));

function pauseWhenHidden(animations:gsap.core.Animation[]){
 const paused=new Set<gsap.core.Animation>();
 function visibility(){
  if(document.hidden){
   for(const animation of animations)if(!animation.paused()&&(animation.totalProgress()<1||animation.repeat()===-1)){animation.pause();paused.add(animation);}
  }else{for(const animation of paused)animation.resume();paused.clear();}
 }
 document.addEventListener("visibilitychange",visibility);
 if(document.hidden)visibility();
 return()=>{document.removeEventListener("visibilitychange",visibility);paused.clear();};
}

export function useLibraryMotion({enabled,resultsKey,feedbackKey}:MotionOptions){
 const rootRef=useRef<HTMLDivElement>(null);
 const heroPlayed=useRef(false);
 const previousResults=useRef<string|null>(null);

 useGSAP(()=>{
  const root=rootRef.current;
  if(!root)return;
  const media=gsap.matchMedia();
  media.add({all:"all",reduce:reducedMotion,fine:finePointer},mediaContext=>{
   // Event animations belong to the media context, never its owning React context.
   // Using a parent contextSafe here would link child -> parent -> child on setup.
   function safe<T extends (...args:never[])=>unknown>(handler:T):T{return mediaContext.add("",handler) as T;}
   const reduce=Boolean(mediaContext.conditions?.reduce);
   const pointer=enabled&&!reduce&&Boolean(mediaContext.conditions?.fine);
   const motion=enabled&&!reduce;
   const animations=new Set<gsap.core.Animation>();
   const ambient=new Set<gsap.core.Animation>();
   const paused=new Set<gsap.core.Animation>();
   const cards=new Map<HTMLElement,CardMotion>();
   const cases=new Map<HTMLElement,CaseMotion>();
   const heroRegion=root.querySelector<HTMLElement>(".hero-stage")||root.querySelector<HTMLElement>(".archive-hero");
   const heroStack=root.querySelector<HTMLElement>(".archive-stack");
   const heroBox=heroRegion?.getBoundingClientRect();
   let heroVisible=!heroBox||(heroBox.bottom>0&&heroBox.right>0&&heroBox.top<window.innerHeight&&heroBox.left<window.innerWidth);
   let active:HTMLElement|null=null;
   let activeCase:HTMLElement|null=null;
   let stagePointerActive=false;
   let pressed=false;
   function track<T extends gsap.core.Animation>(animation:T):T{
    animations.add(animation);
    const onComplete=animation.eventCallback("onComplete");
    animation.eventCallback("onComplete",function(this:unknown,...args:unknown[]){
     animations.delete(animation);paused.delete(animation);
     if(typeof onComplete==="function")onComplete.apply(this,args);
    });
    if(document.hidden){animation.pause();paused.add(animation);}
    return animation;
   }
   function trackAmbient<T extends gsap.core.Animation>(animation:T):T{
    track(animation);ambient.add(animation);
    if(!heroVisible)animation.pause();
    return animation;
   }
   function updateAmbient(){
    for(const animation of ambient){
     if(document.hidden||!heroVisible)animation.pause();
     else animation.resume();
    }
   }
   function updateMode(){root!.dataset.motion=!enabled?"disabled":reduce?"reduced":document.hidden?"paused":"active";}
   updateMode();

   // Files slide into their slots, then the labels reveal. Every control is live
   // during assembly; the scene never blocks browsing with a simulated boot screen.
   if(motion&&!document.hidden&&!heroPlayed.current){
    const stage=root.querySelector<HTMLElement>(".hero-stage");
    const copy=root.querySelectorAll<HTMLElement>(".hero-copy > *");
    const cassettes=Array.from(root.querySelectorAll<HTMLElement>("[data-archive-case]")).reverse();
    const labels=root.querySelectorAll<HTMLElement>(".case-label");
    if(stage||copy.length){
     const entry=gsap.timeline({defaults:{ease:"power3.out"}});
     if(stage)entry.from(stage,{opacity:0,duration:.55,clearProps:"opacity"},0);
     if(copy.length)entry.from(copy,{opacity:0,x:-18,duration:.55,stagger:.055,clearProps:"opacity,transform"},.05);
     if(cassettes.length)entry.from(cassettes,{opacity:0,x:76,y:58,z:-100,rotationY:16,duration:.9,stagger:.13,clearProps:"opacity,transform"},.12);
     if(labels.length)entry.from(labels,{opacity:0,x:9,duration:.36,stagger:.06,clearProps:"opacity,transform"},.72);
     track(entry);
     heroPlayed.current=true;
    }
   }
   if(motion){
    const orbit=root.querySelector<HTMLElement>(".stage-orbit");
    const scan=root.querySelector<HTMLElement>(".stage-scan");
    if(orbit)trackAmbient(gsap.to(orbit,{rotation:360,duration:38,repeat:-1,ease:"none",transformOrigin:"50% 50%"}));
    if(heroStack)trackAmbient(gsap.to(heroStack,{y:8,duration:3.7,yoyo:true,repeat:-1,ease:"sine.inOut"}));
    if(scan&&heroRegion)trackAmbient(gsap.to(scan,{x:()=>heroRegion.clientWidth*.72,duration:6.4,repeat:-1,yoyo:true,repeatRefresh:true,ease:"sine.inOut"}));
   }
   // Only decorative loops depend on hero visibility; discovery stays responsive below it.
   const heroObserver=motion&&heroRegion?new IntersectionObserver(entries=>{
    const entry=entries.find(item=>item.target===heroRegion);
    if(!entry)return;
    heroVisible=entry.isIntersecting&&entry.intersectionRatio>0;
    updateAmbient();
   },{threshold:0}):null;
   if(heroObserver&&heroRegion)heroObserver.observe(heroRegion);

   function extractCase(element:HTMLElement,extract:boolean){
    if(!motion||document.hidden)return;
    const frame=element.querySelector<HTMLElement>(".case-frame");
    if(!frame)return;
    let state=cases.get(frame);
    if(!state){
     const spring={duration:.48,ease:"back.out(1.25)",overwrite:"auto" as const};
     state={y:gsap.quickTo(frame,"y",spring),z:gsap.quickTo(frame,"z",spring),scaleX:gsap.quickTo(frame,"scaleX",spring),scaleY:gsap.quickTo(frame,"scaleY",spring)};
     cases.set(frame,state);
    }
    state.y(extract?-20:0);state.z(extract?24:0);
    state.scaleX(extract?1.025:1);state.scaleY(extract?1.025:1);
   }
   function restCase(){if(activeCase)extractCase(activeCase,false);activeCase=null;}
   const stackTilt=pointer&&heroStack?{
    x:gsap.quickTo(heroStack,"rotationX",{duration:.6,ease:"power3.out",overwrite:"auto"}),
    y:gsap.quickTo(heroStack,"rotationY",{duration:.6,ease:"power3.out",overwrite:"auto"}),
   }:null;

   function disposeCard(element:HTMLElement,state:CardMotion){
    Object.values(state).forEach(quick=>quick.tween.revert());
    element.style.removeProperty("transform");
    element.style.removeProperty("transform-origin");
    element.style.removeProperty("will-change");
    element.style.removeProperty("--pointer-x");
    element.style.removeProperty("--pointer-y");
    cards.delete(element);
   }
   function pruneCards(){
    for(const [element,state] of cards)if(!element.isConnected)disposeCard(element,state);
    if(active&&!active.isConnected){active=null;pressed=false;}
   }
   function cardState(element:HTMLElement){
    let state=cards.get(element);
    if(!state){
     pruneCards();
     gsap.set(element,{transformPerspective:1050,transformOrigin:"50% 50%",willChange:"transform"});
     const tilt={duration:.28,ease:"power3.out",overwrite:"auto" as const};
     const spring={duration:.4,ease:"back.out(1.35)",overwrite:"auto" as const};
     // CSS owns the inner flip; these reusable tweens only move the outer card.
     // Separate scale axes avoid quickTo's unsupported scale alias reset path.
     state={rotationX:gsap.quickTo(element,"rotationX",tilt),rotationY:gsap.quickTo(element,"rotationY",tilt),y:gsap.quickTo(element,"y",spring),scaleX:gsap.quickTo(element,"scaleX",spring),scaleY:gsap.quickTo(element,"scaleY",spring)};
     cards.set(element,state);
    }
    return state;
   }
   function rest(element:HTMLElement){
    const state=cards.get(element);
    if(!state)return;
    state.rotationX(0);state.rotationY(0);state.y(0);state.scaleX(1);state.scaleY(1);
    element.style.removeProperty("will-change");
   }
   const move=safe((event:PointerEvent)=>{
    if(!pointer||document.hidden||event.pointerType==="touch")return;
    const target=event.target instanceof Element?event.target:null;
    const archiveCase=target?.closest<HTMLElement>("[data-archive-case]")||null;
    if(archiveCase!==activeCase){restCase();if(archiveCase&&root.contains(archiveCase)){activeCase=archiveCase;extractCase(archiveCase,true);}}
    if(stackTilt&&heroRegion&&target&&heroRegion.contains(target)){
     stagePointerActive=true;
     const stageBox=heroRegion.getBoundingClientRect();
     if(stageBox.width&&stageBox.height){
      stackTilt.x((.5-clamp((event.clientY-stageBox.top)/stageBox.height))*8);
      stackTilt.y((clamp((event.clientX-stageBox.left)/stageBox.width)-.5)*12);
     }
    }else if(stackTilt&&stagePointerActive){stackTilt.x(0);stackTilt.y(0);stagePointerActive=false;}
    const element=event.target instanceof Element?event.target.closest<HTMLElement>(".resource-card"):null;
    if(element&&!root.contains(element))return;
    if(element!==active){if(active)rest(active);active=element;pressed=false;}
    if(!element)return;
    // Read the outer entrance slot, so tilt never changes its own pointer geometry.
    const box=(element.closest<HTMLElement>(".resource-slot")||element).getBoundingClientRect();
    if(!box.width||!box.height)return;
    const x=clamp((event.clientX-box.left)/box.width),y=clamp((event.clientY-box.top)/box.height);
    element.style.setProperty("--pointer-x",`${x*100}%`);
    element.style.setProperty("--pointer-y",`${y*100}%`);
    element.style.willChange="transform";
    const state=cardState(element);
    const depth=pressed?11:18,scale=pressed?.975:1.018;
    state.rotationX((.5-y)*depth);state.rotationY((x-.5)*depth);
    state.y(pressed?-2:-10);state.scaleX(scale);state.scaleY(scale);
   });
   const leave=safe(()=>{if(active)rest(active);active=null;pressed=false;restCase();stackTilt?.x(0);stackTilt?.y(0);stagePointerActive=false;});
   const down=safe((event:PointerEvent)=>{
    move(event);
    if(!pointer||event.pointerType==="touch"||!active)return;
    pressed=true;
    const state=cardState(active);state.y(-2);state.scaleX(.975);state.scaleY(.975);
   });
   const up=safe(()=>{
    pressed=false;
    if(!pointer||document.hidden||!active)return;
    const state=cardState(active);state.y(-10);state.scaleX(1.018);state.scaleY(1.018);
   });
   if(pointer){
    root.addEventListener("pointermove",move,{passive:true});
    root.addEventListener("pointerleave",leave);
    root.addEventListener("pointerdown",down,{passive:true});
    window.addEventListener("pointerup",up,{passive:true});
    window.addEventListener("pointercancel",leave);
    window.addEventListener("blur",leave);
   }
   const focusCase=safe((event:FocusEvent)=>{
    const element=event.target instanceof Element?event.target.closest<HTMLElement>("[data-archive-case]"):null;
    if(element&&root.contains(element)){restCase();activeCase=element;extractCase(element,true);}
   });
   const blurCase=safe((event:FocusEvent)=>{
    if(activeCase&&event.target instanceof Element&&activeCase.contains(event.target))restCase();
   });
   if(motion){root.addEventListener("focusin",focusCase);root.addEventListener("focusout",blurCase);}

   const indicator=root.querySelector<HTMLElement>(".category-indicator");
   const tabs=indicator?.parentElement;
   let indicatorReady=false;
   // Width is a fixed reference: movement and resizing use compositor transforms.
   if(indicator)gsap.set(indicator,{width:100,top:0,left:0,bottom:"auto",transformOrigin:"0% 50%"});
   const updateIndicator=safe(()=>{
    if(!indicator||!tabs)return;
    const selected=tabs.querySelector<HTMLElement>("[role=tab][data-state=active]");
    if(!selected)return;
    const box=selected.getBoundingClientRect(),parent=tabs.getBoundingClientRect();
    const target={x:box.left-parent.left+tabs.scrollLeft-tabs.clientLeft,y:box.top-parent.top+tabs.scrollTop-tabs.clientTop,scaleX:box.width/100,opacity:1};
    // A new row height is measured only when selection/layout changes, never per frame.
    gsap.set(indicator,{height:box.height});
    if(!motion||!indicatorReady||document.hidden)gsap.set(indicator,target);
    else track(gsap.to(indicator,{...target,duration:.4,ease:"back.out(1.25)",overwrite:"auto"}));
    indicatorReady=true;
   });
   const observer=new MutationObserver(updateIndicator);
   const resize=new ResizeObserver(updateIndicator);
   if(tabs){
    observer.observe(tabs,{subtree:true,childList:true,attributes:true,attributeFilter:["data-state"]});
    resize.observe(tabs);
    tabs.querySelectorAll<HTMLElement>("[role=tab]").forEach(tab=>resize.observe(tab));
    tabs.addEventListener("scroll",updateIndicator,{passive:true});
   }
   window.addEventListener("resize",updateIndicator,{passive:true});
   updateIndicator();

   const grid=root.querySelector(".resource-grid");
   const cardObserver=new MutationObserver(pruneCards);
   if(grid)cardObserver.observe(grid,{childList:true,subtree:false});
   const visibility=safe(()=>{
    updateMode();
    if(document.hidden){
     for(const animation of animations)if(!animation.paused()&&(animation.totalProgress()<1||animation.repeat()===-1)){animation.pause();paused.add(animation);}
     for(const [element,state] of cards)disposeCard(element,state);
     for(const state of cases.values())Object.values(state).forEach(quick=>quick.tween.revert());
     cases.clear();activeCase=null;
     if(stackTilt&&heroStack){stackTilt.x.tween.pause();stackTilt.y.tween.pause();gsap.set(heroStack,{rotationX:0,rotationY:0});}
     stagePointerActive=false;
     active=null;pressed=false;
    }else{
     for(const animation of paused)if(!ambient.has(animation)||heroVisible)animation.resume();
     paused.clear();
     updateAmbient();
     updateIndicator();
    }
   });
   document.addEventListener("visibilitychange",visibility);
   return()=>{
    observer.disconnect();resize.disconnect();cardObserver.disconnect();heroObserver?.disconnect();
    tabs?.removeEventListener("scroll",updateIndicator);
    window.removeEventListener("resize",updateIndicator);
    root.removeEventListener("pointermove",move);
    root.removeEventListener("pointerleave",leave);
    root.removeEventListener("pointerdown",down);
    root.removeEventListener("focusin",focusCase);
    root.removeEventListener("focusout",blurCase);
    window.removeEventListener("pointerup",up);
    window.removeEventListener("pointercancel",leave);
    window.removeEventListener("blur",leave);
    document.removeEventListener("visibilitychange",visibility);
    for(const [element,state] of cards)disposeCard(element,state);
    for(const state of cases.values())Object.values(state).forEach(quick=>quick.tween.revert());
    cases.clear();
    animations.forEach(animation=>animation.kill());
    paused.clear();ambient.clear();
   };
  },root);
  return()=>{media.revert();delete root.dataset.motion;};
 },{scope:rootRef,dependencies:[enabled],revertOnUpdate:true});

 useGSAP(()=>{
  const root=rootRef.current;
  if(!root)return;
  const slots=root.querySelectorAll<HTMLElement>(".resource-slot");
  const signature=Array.from(slots).map(slot=>slot.querySelector<HTMLElement>("[data-resource-id]")?.dataset.resourceId||slot.textContent||"").join("\u001f");
  if(previousResults.current===signature)return;
  previousResults.current=signature;
  if(!enabled||document.hidden||!slots.length)return;
  const media=gsap.matchMedia();
  media.add("(prefers-reduced-motion: no-preference)",()=>{
   const entrance=gsap.fromTo(slots,{opacity:0,x:24,rotationY:-4},{opacity:1,x:0,rotationY:0,duration:.42,ease:"power3.out",stagger:{each:.065},clearProps:"opacity,transform",overwrite:"auto"});
   return pauseWhenHidden([entrance]);
  },root);
  return()=>media.revert();
 },{scope:rootRef,dependencies:[enabled,resultsKey],revertOnUpdate:true});

 useGSAP(()=>{
  const root=rootRef.current;
  if(!root||!enabled||!feedbackKey||document.hidden)return;
  const buttons=root.querySelectorAll<HTMLElement>("[data-copied=true]");
  if(!buttons.length)return;
  const flashes=Array.from(new Set(Array.from(buttons).map(button=>(button.closest(".card-face")||button.closest(".resource-card"))?.querySelector<HTMLElement>(".feedback-flash")).filter((flash):flash is HTMLElement=>Boolean(flash))));
  const media=gsap.matchMedia();
  media.add("(prefers-reduced-motion: no-preference)",()=>{
   const animations:gsap.core.Animation[]=[gsap.fromTo(buttons,{scale:.94},{scale:1,duration:.32,ease:"back.out(2)",clearProps:"transform",overwrite:"auto"})];
   if(flashes.length)animations.push(gsap.fromTo(flashes,{opacity:.7,scale:.92},{opacity:0,scale:1.12,duration:.6,ease:"power2.out",clearProps:"opacity,transform",overwrite:"auto"}));
   return pauseWhenHidden(animations);
  },root);
  return()=>media.revert();
 },{scope:rootRef,dependencies:[enabled,feedbackKey],revertOnUpdate:true});

 return rootRef;
}
