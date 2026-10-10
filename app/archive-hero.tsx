"use client";

import {ArrowDown, Layers, Puzzle, Sparkles, WandSparkles} from "lucide-react";
import type {Resource} from "@/lib/catalog";

const types = [
  {name: "提示词", Icon: WandSparkles},
  {name: "Skills", Icon: Puzzle},
  {name: "MCP", Icon: Layers},
];

export default function ArchiveHero({resources, onChooseType, onShare, onBrowse}: {
  resources: Resource[];
  onChooseType: (category: string) => void;
  onShare: () => void;
  onBrowse: () => void;
}) {
  return <section className="archive-hero" aria-labelledby="archive-title">
    <div className="hero-copy">
      <span className="hero-label"><Sparkles size={15} aria-hidden="true"/>你的 AI 灵感档案馆</span>
      <h1 id="archive-title">灵感，随时装备。</h1>
      <p className="hero-description">提示词、Skills 与 MCP，分类收藏。<br/>中英对照，随时取用。</p>
      <div className="hero-actions">
        <a className="primary-button" href="#resources" onClick={event => {event.preventDefault(); onBrowse();}}>浏览资源<ArrowDown size={16} aria-hidden="true"/></a>
        <button className="secondary-button" onClick={onShare}>分享一份资料<Sparkles size={16} aria-hidden="true"/></button>
      </div>
      <div className="hero-types" aria-label="按资源类型浏览">
        {types.map(({name, Icon}) => <button key={name} onClick={() => onChooseType(name)} aria-label={`浏览 ${name}，${resources.filter(r => r.category === name).length} 条资源`}>
          <Icon size={18} aria-hidden="true"/>
          <span>{name}<strong>{resources.filter(r => r.category === name).length}</strong></span>
        </button>)}
      </div>
      <p className="hero-hint"><span aria-hidden="true"/>中英对照保存 · 公开资料经审核收录</p>
    </div>
    <div className="hero-stage">
      <div className="stage-grid" aria-hidden="true"/>
      <div className="orbit-ring orbit-outer" aria-hidden="true"/>
      <div className="orbit-ring orbit-middle" aria-hidden="true"/>
      <div className="orbit-ring orbit-inner" aria-hidden="true"/>
      <span className="hero-crystal crystal-one" aria-hidden="true"/>
      <span className="hero-crystal crystal-two" aria-hidden="true"/>
      <span className="hero-crystal crystal-three" aria-hidden="true"/>
      <div className="hero-portrait"><img src="/rem.png" alt="雷姆的蓝白色角色插画" width={1024} height={1536} fetchPriority="high" decoding="async"/></div>
      <div className="stage-caption"><Sparkles size={15} aria-hidden="true"/><div><strong>你的灵感补给站</strong><span>整理 / 收藏 / 再出发</span></div></div>
      {[1, 2, 3, 4].map(n => <span className={`stage-corner corner-${n}`} aria-hidden="true" key={n}/>)}
    </div>
  </section>;
}
