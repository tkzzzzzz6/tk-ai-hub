"use client";

import {useId,useLayoutEffect,useRef,useState} from "react";
import {BookOpen,Bot,Check,Copy,ExternalLink,Heart,Layers,LoaderCircle,Puzzle,RotateCcw,WandSparkles} from "lucide-react";
import type {Resource} from "@/lib/catalog";
import {topicOf} from "@/lib/taxonomy";
import {resourceTone} from "@/lib/resource-tones";
import {skillInstallPrompt} from "@/lib/skill-install";
import DemoPreview from "./demo-preview";

type Props={
  resource:Resource;
  isFavorite:boolean;
  pending:boolean;
  favoriteUnavailable:boolean;
  selectedTag:string;
  copied:string;
  onFavorite:(resource:Resource)=>void;
  onTag:(tag:string)=>void;
  onCopy:(resource:Resource,language:"zh"|"en",install?:boolean)=>void;
  onOpen:(resource:Resource)=>void;
};
const icons:Record<string,typeof Bot>={"提示词":WandSparkles,Skills:Puzzle,MCP:Layers};

export default function ResourceCard({resource,isFavorite,pending,favoriteUnavailable,selectedTag,copied,onFavorite,onTag,onCopy,onOpen}:Props){
  const [flipped,setFlipped]=useState(false),[language,setLanguage]=useState<"zh"|"en">("zh");
  const articleRef=useRef<HTMLElement>(null),titleRef=useRef<HTMLButtonElement>(null),returnRef=useRef<HTMLButtonElement>(null),moveFocus=useRef(false);
  const backId=useId();
  const Icon=icons[resource.category]||Bot;
  const install=resource.category==="Skills"&&!!skillInstallPrompt(resource);
  const text=install?skillInstallPrompt(resource,language):language==="zh"?resource.content:resource.contentEn||"";
  const hasEnglish=install||!!resource.contentEn;
  const preview=text.length>1000?text.slice(0,1000)+"\n…":text;

  function flip(value:boolean){
    moveFocus.current=!!articleRef.current?.contains(document.activeElement);
    setFlipped(value);
  }
  useLayoutEffect(()=>{
    if(!moveFocus.current)return;
    moveFocus.current=false;
    (flipped?returnRef.current:titleRef.current)?.focus({preventScroll:true});
  },[flipped]);
  function bodyClick(event:React.MouseEvent<HTMLElement>){
    if(!(event.target instanceof Element)||event.target.closest("button,a,input,textarea,select,summary,video,[role=button],[data-no-flip]"))return;
    if(window.getSelection()?.toString())return;
    flip(!flipped);
  }
  function copyOptions(back=false){
    const active=back?flipped:!flipped;
    return <div className={"copy-options"+(install?" skill-card-install":"")}>
      {(["zh","en"] as const).map(lang=>{
        const key=resource.id+(install?"install":"")+lang,done=active&&copied===key;
        const label=install?lang==="zh"?"安装指令":"EN":lang==="zh"?"中文":"English";
        return <button key={lang} type="button" data-copied={done} disabled={lang==="en"&&!hasEnglish} onClick={()=>onCopy(resource,lang,install)} aria-label={"复制 "+resource.title+" "+(lang==="zh"?"中文":"英文")+(install?"安装指令":"版")}>
          {done?<Check size={15} aria-hidden="true"/>:<Copy size={15} aria-hidden="true"/>}{label}
        </button>;
      })}
    </div>;
  }

  return <div className="resource-slot"><article ref={articleRef} className="resource-card glass-resource-card" aria-label={resource.title} data-resource-id={resource.id} data-material={resource.category==="Skills"?"skill":resource.category==="MCP"?"mcp":"prompt"} data-tone={resourceTone(resource)} data-flipped={flipped} onClick={bodyClick} onKeyDown={event=>{if(event.key==="Escape"&&flipped){event.preventDefault();event.stopPropagation();flip(false);}}}>
    <div className="card-flip-stage"><div className="card-flip">
      <div className="card-face card-front" aria-hidden={flipped} inert={flipped}>
        <span className="feedback-flash" aria-hidden="true"/>
        <DemoPreview demoUrl={resource.demoUrl} demoType={resource.demoType} title={resource.title} compact onOpen={()=>onOpen(resource)}/>
        <div className="card-top"><span className={"resource-icon type-"+resource.category}><Icon size={23} aria-hidden="true"/></span><span className="type-label">{resource.category}<small>{topicOf(resource)}</small></span><button type="button" className={isFavorite?"favorite is-favorite":"favorite"} aria-pressed={isFavorite} aria-busy={pending} data-copied={!flipped&&copied===resource.id+"favorite"} aria-label={(isFavorite?"取消收藏 ":"收藏 ")+resource.title} disabled={pending||favoriteUnavailable} onClick={()=>onFavorite(resource)}>{pending?<LoaderCircle size={18} className="saving-icon" aria-hidden="true"/>:<Heart size={19} aria-hidden="true"/>}</button></div>
        <button type="button" ref={titleRef} className="card-title" aria-controls={backId} aria-expanded={flipped} onClick={()=>flip(true)}>{resource.title}</button>
        <p>{resource.description}</p>
        <div className="tags">{resource.tags.slice(0,3).map(item=><button type="button" key={item} aria-pressed={selectedTag===item} onClick={()=>onTag(item)}>{item}</button>)}</div>
        <div className="card-bottom">
          {install||["提示词","Skills"].includes(resource.category)?copyOptions():<a href={resource.url} target="_blank" rel="noopener noreferrer">查看来源<ExternalLink size={14} aria-hidden="true"/></a>}
          <button type="button" className="card-action" aria-label={"展开详情 "+resource.title} onClick={()=>onOpen(resource)}>展开详情<BookOpen size={15} aria-hidden="true"/></button>
        </div>
      </div>
      <div id={backId} className="card-face card-back" aria-hidden={!flipped} inert={!flipped}>
        <span className="feedback-flash" aria-hidden="true"/>
        <div className="card-back-header"><div><span className="card-back-label">{install?"安装指令":resource.category==="提示词"?"提示词预览":"使用说明"}</span><h3><button type="button" className="card-back-title" onClick={()=>flip(false)}>{resource.title}</button></h3></div><button type="button" ref={returnRef} className="flip-return" aria-label={"翻回 "+resource.title} onClick={()=>flip(false)}><RotateCcw size={17} aria-hidden="true"/>翻回</button></div>
        <div className="card-language-tabs" role="group" aria-label={resource.title+"预览语言"}><button type="button" aria-pressed={language==="zh"} onClick={()=>setLanguage("zh")}>中文</button><button type="button" aria-pressed={language==="en"} disabled={!hasEnglish} onClick={()=>setLanguage("en")}>English</button></div>
        <pre className="card-preview-text" lang={language==="zh"?"zh-CN":"en"} tabIndex={0}>{preview||"正文暂未补齐，可展开详情查看来源。"}</pre>
        <div className="card-back-footer">{copyOptions(true)}<button type="button" className="card-action" aria-label={"展开详情 "+resource.title} onClick={()=>onOpen(resource)}>展开详情<BookOpen size={15} aria-hidden="true"/></button></div>
      </div>
    </div></div>
  </article></div>;
}
