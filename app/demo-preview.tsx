"use client";
import { useState } from "react";
import { ExternalLink, Image as ImageIcon, Film, Sparkles, ImageOff } from "lucide-react";
import { demoKind, validDemoUrl, type DemoFields } from "@/lib/demo";

export default function DemoPreview({demoUrl, demoType, title, compact = false, onOpen}: DemoFields & {title: string; compact?: boolean; onOpen?: () => void}) {
  const url = demoUrl ? validDemoUrl(demoUrl) : null;
  if (!url) return null;
  // A new URL/type gets a fresh error state when an editor changes the link.
  return <PreviewMedia key={url + (demoType || "auto")} url={url} type={demoKind(url, demoType)} title={title} compact={compact} onOpen={onOpen}/>;
}

function PreviewMedia({url, type, title, compact, onOpen}: {url: string; type: "image" | "video" | "link"; title: string; compact: boolean; onOpen?: () => void}) {
  const [failed, setFailed] = useState(false);
  const Icon = type === "video" ? Film : type === "image" ? ImageIcon : Sparkles;
  const image = <img src={url} alt={title + "的效果展示"} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>;
  return <section className={"demo-preview" + (compact ? " demo-compact" : "")} aria-label={title + "效果展示"}>
    <div className="demo-heading"><span><Icon size={14}/>效果展示</span><a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">打开原链接<ExternalLink size={13}/></a></div>
    {!failed && type === "image" ? (onOpen ? <button type="button" className="demo-surface" aria-label={"查看 " + title + " 效果与内容"} onClick={onOpen}>{image}</button> : <a className="demo-surface" href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{image}</a>) : !failed && type === "video" ?
      <div className="demo-surface demo-video"><video src={url} controls playsInline preload="metadata" aria-label={title + "效果视频"} onError={() => setFailed(true)}/></div> :
      <a className="demo-link-preview" href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><span className="demo-link-icon">{failed ? <ImageOff size={23}/> : <Sparkles size={23}/>}</span><span><strong>{failed ? "预览暂时不可用" : "打开效果展示"}</strong><small>{failed ? "可尝试在原页面查看" : new URL(url).hostname}</small></span><ExternalLink size={16}/></a>}
  </section>;
}
