"use client";

import {ArrowDown, ArrowUpRight, Archive, Layers, Plus, Puzzle, WandSparkles} from "lucide-react";
import type {Resource} from "@/lib/catalog";

const types = [
  {name: "提示词", Icon: WandSparkles, caseName: "portrait", number: "01", caption: "PROMPTS"},
  {name: "Skills", Icon: Puzzle, caseName: "skill", number: "02", caption: "AGENT SKILLS"},
  {name: "MCP", Icon: Layers, caseName: "mcp", number: "03", caption: "MCP TOOLS"},
];

export default function ArchiveHero({resources, onChooseType, onShare, onBrowse}: {
  resources: Resource[];
  onChooseType: (category: string) => void;
  onShare: () => void;
  onBrowse: () => void;
}) {
  const counts = new Map(types.map(type => [type.name, resources.filter(resource => resource.category === type.name).length]));
  return <section className="archive-hero" aria-labelledby="archive-title">
    <div className="hero-copy">
      <span className="hero-label"><Archive size={14} aria-hidden="true"/>TK / AI RESOURCE ARCHIVE</span>
      <h1 id="archive-title"><span>灵感归档。</span><span>随时调用。</span></h1>
      <p className="hero-description">把值得留下的提示词、Skills 与 MCP，<br/>整理成一份清晰的中英资源档案。</p>
      <div className="hero-actions">
        <a className="primary-button" href="#resources" onClick={event => {event.preventDefault(); onBrowse();}}>浏览档案<ArrowDown size={16} aria-hidden="true"/></a>
        <button className="secondary-button" onClick={onShare}><Plus size={16} aria-hidden="true"/>提交资源</button>
      </div>
      <div className="hero-types" aria-label="按资源类型浏览">
        {types.map(({name, Icon, number}) => <button key={name} onClick={() => onChooseType(name)} aria-label={`浏览 ${name}，${counts.get(name)} 条资源`}>
          <span className="type-number" aria-hidden="true">{number}</span>
          <Icon size={17} aria-hidden="true"/>
          <span>{name}<strong>{String(counts.get(name)).padStart(2, "0")}</strong></span>
        </button>)}
      </div>
      <p className="hero-hint"><span aria-hidden="true"/><strong>{resources.length}</strong> 份公开资料 · 中英对照 · 审核收录</p>
    </div>
    <div className="hero-stage">
      <div className="stage-grid" aria-hidden="true"/>
      <div className="stage-orbit" aria-hidden="true">{Array.from({length: 8}, (_, index) => <span key={index} style={{rotate: `${index * 45}deg`}}/>)}</div>
      <div className="stage-scan" aria-hidden="true"/>
      <div className="archive-stack">
        {types.map(({name, Icon, caseName, number, caption}) => <button key={name} className={`archive-case archive-case-${caseName}`} data-archive-case={caseName} onClick={() => onChooseType(name)} aria-label={`档案盒：浏览 ${name}，${counts.get(name)} 条资源`}>
          <div className="case-frame">
            <div className="case-topline"><span>TK–{number}</span><span>{caption}</span></div>
            <div className="case-mark">{caseName === "portrait" ? <img src="/rem.png" alt="雷姆的蓝白色角色插画" width={1024} height={1536} fetchPriority="high" decoding="async"/> : <><Icon size={44} strokeWidth={1.1} aria-hidden="true"/><span className="case-crosshair" aria-hidden="true"/></>}</div>
            <div className="case-label"><strong>{name}</strong><span>{String(counts.get(name)).padStart(2, "0")} FILES<ArrowUpRight size={12} aria-hidden="true"/></span></div>
            <span className="case-edge" aria-hidden="true"/>
            <span className="case-rivet rivet-one" aria-hidden="true"/>
            <span className="case-rivet rivet-two" aria-hidden="true"/>
          </div>
        </button>)}
      </div>
      <div className="stage-caption"><span className="stage-caption-index">3 类档案</span><div><strong>选择档案盒</strong><span>按分类浏览资源</span></div></div>
      {[1, 2, 3, 4].map(number => <span className={`stage-corner corner-${number}`} aria-hidden="true" key={number}/>)}
    </div>
  </section>;
}
