"use client";
import {useState} from "react";
import {Check,Copy,Download,Terminal} from "lucide-react";
import {toast} from "sonner";
import type {Resource} from "@/lib/catalog";
import {skillInstallPrompt,skillPackage} from "@/lib/skill-install";
import "./skill-install.css";

export default function SkillInstallPanel({resource}:{resource:Resource}){
 const [copied,setCopied]=useState<"zh"|"en"|null>(null),bundle=skillPackage(resource);
 const zh=skillInstallPrompt(resource,"zh"),en=skillInstallPrompt(resource,"en");
 if(!zh)return null;
 async function copy(language:"zh"|"en"){
  try{await navigator.clipboard.writeText(language==="zh"?zh:en);setCopied(language);toast.success(language==="zh"?"已复制中文安装指令，粘贴给 Agent 即可":"English installation instruction copied");}
  catch{toast.error("复制失败，请展开安装指令后手动复制");}
 }
 return <section className="skill-install-panel" aria-label="安装这个技能">
  <div className="skill-install-heading"><Terminal size={19}/><h3>交给 Agent 安装</h3></div>
  <p>复制一句指令，粘贴给有联网和文件操作能力的 Agent。它会按官方说明安装完整技能。</p>
  <div className="skill-install-actions"><button className="primary-button" onClick={()=>copy("zh")}>{copied==="zh"?<Check size={16}/>:<Copy size={16}/>}复制中文安装指令</button><button className="secondary-button" onClick={()=>copy("en")}>{copied==="en"?<Check size={16}/>:<Copy size={16}/>}Copy install prompt</button></div>
  <details><summary>查看中英文安装指令</summary><div className="install-prompt-columns"><pre lang="zh-CN" tabIndex={0}>{zh}</pre><pre lang="en" tabIndex={0}>{en}</pre></div></details>
  {bundle&&<div className="skill-package-row"><a className="secondary-button" href={bundle.downloadUrl} download><Download size={16}/>{bundle.downloadLabel}</a><small>{bundle.kind==="repository"?"原仓库快照，需按官方说明安装":bundle.kind==="collection"?"合集含全部技能目录、示例和许可证":"含技能目录与原始许可证"}<br/>打包于 {bundle.packagedAt} · 源版本 {bundle.commit.slice(0,8)}</small></div>}
  <small className="skill-install-note">安装指令读取上游当前说明；ZIP 是标注版本的快照。复制指令后，由你的 Agent 执行安装。</small>
 </section>;
}
