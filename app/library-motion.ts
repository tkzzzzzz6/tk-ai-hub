"use client";

import {useRef} from "react";
import gsap from "gsap";
import {useGSAP} from "@gsap/react";

gsap.registerPlugin(useGSAP);

type MotionOptions={enabled:boolean;resultsKey:string;feedbackKey:string};
type QuickTween=ReturnType<typeof gsap.quickTo>;
type CardMotion={rotationX:QuickTween;rotationY:QuickTween;y:QuickTween;scale:QuickTween};
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
   const heroRegion=root.querySelector<HTMLElement>(".hero-stage")||root.querySelector<HTMLElement>(".archive-hero");
   const heroBox=heroRegion?.getBoundingClientRect();
   let heroVisible=!heroBox||(heroBox.bottom>0&&heroBox.right>0&&heroBox.top<window.innerHeight&&heroBox.left<window.innerWidth);
   let active:HTMLElement|null=null;
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

   // One shared entrance is the signature moment; controls remain usable throughout.
   if(motion&&!document.hidden&&!heroPlayed.current){
    const stage=root.querySelector<HTMLElement>(".hero-stage");
    const copy=root.querySelectorAll<HTMLElement>(".hero-copy > *");
    if(stage||copy.length){
     const entry=gsap.timeline({defaults:{ease:"power3.out"}});
     if(stage)entry.from(stage,{opacity:0,y:22,scale:.965,duration:.9,clearProps:"opacity,transform"},0);
     if(copy.length)entry.from(copy,{opacity:0,y:13,duration:.55,stagger:.065,clearProps:"opacity,transform"},.14);
     track(entry);
     heroPlayed.current=true;
    }
   }
   if(motion){
    root.querySelectorAll<HTMLElement>(".orbit-ring").forEach((ring,index)=>{
     trackAmbient(gsap.to(ring,{rotation:index%2?"-=360":"+=360",duration:58+index*14,repeat:-1,ease:"none",transformOrigin:"50% 50%"}));
    });
    const crystals=root.querySelectorAll<HTMLElement>(".hero-crystal");
    if(crystals.length)trackAmbient(gsap.to(crystals,{y:"+=7",rotation:"+=4",duration:3.7,stagger:.45,yoyo:true,repeat:-1,ease:"sine.inOut"}));
   }
   // Only decorative loops depend on hero visibility; discovery stays responsive below it.
   const heroObserver=motion&&heroRegion?new IntersectionObserver(entries=>{
    const entry=entries.find(item=>item.target===heroRegion);
    if(!entry)return;
    heroVisible=entry.isIntersecting&&entry.intersectionRatio>0;
    updateAmbient();
   },{threshold:0}):null;
   if(heroObserver&&heroRegion)heroObserver.observe(heroRegion);

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
     gsap.set(element,{transformPerspective:900,transformOrigin:"50% 50%",willChange:"transform"});
     const options={duration:.45,ease:"power3.out",overwrite:"auto" as const};
     state={rotationX:gsap.quickTo(element,"rotationX",options),rotationY:gsap.quickTo(element,"rotationY",options),y:gsap.quickTo(element,"y",options),scale:gsap.quickTo(element,"scale",options)};
     cards.set(element,state);
    }
    return state;
   }
   function rest(element:HTMLElement){
    const state=cards.get(element);
    if(!state)return;
    state.rotationX(0);state.rotationY(0);state.y(0);state.scale(1);
    element.style.removeProperty("will-change");
   }
   const move=safe((event:PointerEvent)=>{
    if(!pointer||document.hidden||event.pointerType==="touch")return;
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
    state.rotationX((.5-y)*6);state.rotationY((x-.5)*6);
    state.y(pressed?-1:-4);state.scale(pressed?.985:1.006);
   });
   const leave=safe(()=>{if(active)rest(active);active=null;pressed=false;});
   const down=safe((event:PointerEvent)=>{
    move(event);
    if(!pointer||event.pointerType==="touch"||!active)return;
    pressed=true;
    const state=cardState(active);state.y(-1);state.scale(.985);
   });
   const up=safe(()=>{
    pressed=false;
    if(!pointer||document.hidden||!active)return;
    const state=cardState(active);state.y(-4);state.scale(1.006);
   });
   if(pointer){
    root.addEventListener("pointermove",move,{passive:true});
    root.addEventListener("pointerleave",leave);
    root.addEventListener("pointerdown",down,{passive:true});
    window.addEventListener("pointerup",up,{passive:true});
    window.addEventListener("pointercancel",leave);
    window.addEventListener("blur",leave);
   }

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
    window.removeEventListener("pointerup",up);
    window.removeEventListener("pointercancel",leave);
    window.removeEventListener("blur",leave);
    document.removeEventListener("visibilitychange",visibility);
    for(const [element,state] of cards)disposeCard(element,state);
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
   const entrance=gsap.fromTo(slots,{opacity:0,y:15},{opacity:1,y:0,duration:.38,ease:"power3.out",stagger:{each:.045},clearProps:"opacity,transform",overwrite:"auto"});
   return pauseWhenHidden([entrance]);
  },root);
  return()=>media.revert();
 },{scope:rootRef,dependencies:[enabled,resultsKey],revertOnUpdate:true});

 useGSAP(()=>{
  const root=rootRef.current;
  if(!root||!enabled||!feedbackKey||document.hidden)return;
  const buttons=root.querySelectorAll<HTMLElement>("[data-copied=true]");
  if(!buttons.length)return;
  const flashes=Array.from(new Set(Array.from(buttons).map(button=>button.closest(".resource-card")?.querySelector<HTMLElement>(".feedback-flash")).filter((flash):flash is HTMLElement=>Boolean(flash))));
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
