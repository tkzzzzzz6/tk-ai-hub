"use client";
import {useEffect,useRef} from "react";
import {stepSpring} from "@/lib/spring";
type Axis={position:number;velocity:number;target:number};
const axis=(value=0):Axis=>({position:value,velocity:0,target:value});
export function useLibraryMotion(){const rootRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{const root=rootRef.current;if(!root)return;const reduce=matchMedia("(prefers-reduced-motion: reduce)"),fine=matchMedia("(hover: hover) and (pointer: fine)");const states=new Map<HTMLElement,{rx:Axis;ry:Axis;y:Axis;scale:Axis}>();let frame=0,last=0,active:HTMLElement|null=null,pressed=false;
 const indicator=root.querySelector<HTMLElement>(".category-indicator"),tabs=indicator?.parentElement;const ix=axis(),iw=axis();let indicatorReady=false;
 function tickAxis(value:Axis,dt:number){const next=stepSpring(value.position,value.velocity,value.target,dt);value.position=next.position;value.velocity=next.velocity;const moving=Math.abs(value.position-value.target)>.001||Math.abs(value.velocity)>.01;if(!moving){value.position=value.target;value.velocity=0;}return moving;}
 function tick(time:number){frame=0;const dt=last?Math.min((time-last)/1000,1/30):1/60;last=time;let moving=false;
  for(const [element,state] of states){if(!element.isConnected){states.delete(element);continue;}let local=false;for(const value of Object.values(state))local=tickAxis(value,dt)||local;moving=local||moving;element.style.transform=`perspective(950px) translate3d(0,${state.y.position}px,0) rotateX(${state.rx.position}deg) rotateY(${state.ry.position}deg) scale(${state.scale.position})`;element.style.willChange=local?"transform":"";if(!local&&element!==active&&state.scale.target===1){element.style.removeProperty("transform");states.delete(element);}}
  if(indicator&&indicatorReady){moving=tickAxis(ix,dt)||moving;moving=tickAxis(iw,dt)||moving;indicator.style.transform=`translate3d(${ix.position}px,0,0)`;indicator.style.width=`${Math.max(0,iw.position)}px`;}
  if(moving&&!document.hidden&&!reduce.matches)frame=requestAnimationFrame(tick);else last=0;
 }
 function wake(){if(!frame&&!document.hidden&&!reduce.matches)frame=requestAnimationFrame(tick);}
 function resetElement(element:HTMLElement){const state=states.get(element);if(state){state.rx.target=0;state.ry.target=0;state.y.target=0;state.scale.target=1;wake();}}
 function move(event:PointerEvent){if(reduce.matches||!fine.matches||event.pointerType==="touch")return;const element=(event.target as Element).closest<HTMLElement>(".resource-card,.rem-card");if(element!==active){if(active)resetElement(active);active=element;pressed=false;}if(!element)return;const box=element.getBoundingClientRect(),x=Math.max(0,Math.min(1,(event.clientX-box.left)/box.width)),y=Math.max(0,Math.min(1,(event.clientY-box.top)/box.height));element.style.setProperty("--pointer-x",`${x*100}%`);element.style.setProperty("--pointer-y",`${y*100}%`);let state=states.get(element);if(!state){state={rx:axis(),ry:axis(),y:axis(),scale:axis(1)};states.set(element,state);}state.rx.target=(.5-y)*4;state.ry.target=(x-.5)*4;state.y.target=pressed?-2:-5;state.scale.target=pressed?.985:1.008;wake();}
 function leave(){if(active)resetElement(active);active=null;pressed=false;}
 function down(event:PointerEvent){move(event);if(active){pressed=true;const state=states.get(active);if(state){state.scale.target=.985;state.y.target=-2;wake();}}}
 function up(){pressed=false;if(active){const state=states.get(active);if(state){state.scale.target=1.008;state.y.target=-5;wake();}}}
 function updateIndicator(){if(!indicator||!tabs)return;const selected=tabs.querySelector<HTMLElement>("[role=tab][data-state=active]");if(!selected)return;const selectedBox=selected.getBoundingClientRect(),parentBox=tabs.getBoundingClientRect();ix.target=selectedBox.left-parentBox.left;iw.target=selectedBox.width;if(!indicatorReady||reduce.matches){ix.position=ix.target;iw.position=iw.target;ix.velocity=iw.velocity=0;indicator.style.transform=`translate3d(${ix.position}px,0,0)`;indicator.style.width=`${iw.position}px`;indicatorReady=true;indicator.style.opacity="1";}else wake();}
 function stop(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;for(const [element] of states){element.style.removeProperty("transform");element.style.removeProperty("will-change");}states.clear();active=null;pressed=false;}
 function visibility(){if(document.hidden)stop();else updateIndicator();}
 function preference(){if(reduce.matches||!fine.matches)stop();updateIndicator();}
 root.addEventListener("pointermove",move,{passive:true});root.addEventListener("pointerleave",leave);root.addEventListener("pointerdown",down,{passive:true});window.addEventListener("pointerup",up,{passive:true});window.addEventListener("pointercancel",leave);document.addEventListener("visibilitychange",visibility);reduce.addEventListener("change",preference);fine.addEventListener("change",preference);
 const mutation=new MutationObserver(updateIndicator);mutation.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:["data-state"]});const resize=new ResizeObserver(updateIndicator);if(tabs)resize.observe(tabs);window.addEventListener("resize",updateIndicator);updateIndicator();
 return()=>{stop();mutation.disconnect();resize.disconnect();root.removeEventListener("pointermove",move);root.removeEventListener("pointerleave",leave);root.removeEventListener("pointerdown",down);window.removeEventListener("pointerup",up);window.removeEventListener("pointercancel",leave);window.removeEventListener("resize",updateIndicator);document.removeEventListener("visibilitychange",visibility);reduce.removeEventListener("change",preference);fine.removeEventListener("change",preference);};
 },[]);return rootRef;
}
