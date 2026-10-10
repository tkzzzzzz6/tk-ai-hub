"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {Search,Sparkles,BookOpen,Heart,ExternalLink,Copy,UserRound,ShieldCheck,Layers,WandSparkles,Puzzle,Bot,Check,FolderOpen,Orbit,Pause,Play,X,Archive,Download} from "lucide-react";
import {Tabs,TabsList,TabsTrigger} from "@/components/ui/tabs";
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from "@/components/ui/sheet";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "@/components/ui/select";
import {Toaster,toast} from "sonner";
import {categories,type Resource,socialLinks} from "@/lib/catalog";
import {topics,topicOf} from "@/lib/taxonomy";
import {resourceTone,topicTone} from "@/lib/resource-tones";
import {filterLibrary} from "@/lib/library-filters";
import {skillInstallPrompt} from "@/lib/skill-install";
import {useResourceTools} from "@/lib/webmcp";
import DemoPreview from "./demo-preview";
import SkillInstallPanel from "./skill-install-panel";
import SubmissionDialog from "./submission-dialog";
import ArchiveHero from "./archive-hero";
import ResourceCard from "./resource-card";
import {useLibraryMotion} from "./library-motion";
import {PromptParameters,PromptText} from "./prompt-content";
import {promptArguments,promptForCopy} from "@/lib/prompt-template";

const icons:Record<string,typeof Bot>={"提示词":WandSparkles,Skills:Puzzle,MCP:Layers};
const motionPreferenceKey="tk-ai-hub:motion";

export default function Hub({initialResources,storageUnavailable=false}:{initialResources:Resource[];storageUnavailable?:boolean}){
  const resources=initialResources;
  const [category,setCategory]=useState("全部"),[topic,setTopic]=useState("全部用途"),[query,setQuery]=useState(""),[tag,setTag]=useState("全部标签"),[sort,setSort]=useState("默认排序");
  const [selected,setSelected]=useState<Resource|null>(null),[login,setLogin]=useState(false),[submissionOpen,setSubmissionOpen]=useState(false);
  const [user,setUser]=useState<{userId:string;displayName:string;role:string}|null>(null),[sessionLoading,setSessionLoading]=useState(true);
  const [favorites,setFavorites]=useState<string[]>([]),[onlyFavorites,setOnlyFavorites]=useState(false),[pendingFavorites,setPendingFavorites]=useState<string[]>([]);
  const favoriteRequests=useRef(new Set<string>()),searchRef=useRef<HTMLInputElement>(null),detailTriggerRef=useRef<HTMLElement|null>(null);
  const [copied,setCopied]=useState(""),[feedbackVersion,setFeedbackVersion]=useState(0),[motionEnabled,setMotionEnabled]=useState(true),[page,setPage]=useState(1);

  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/session",{signal:controller.signal}).then(async response=>{
      if(!response.ok)throw new Error();
      return response.json() as Promise<{user:typeof user;favorites:string[]}>;
    }).then(data=>{setUser(data.user);setFavorites(data.favorites);}).catch(()=>{
      if(!controller.signal.aborted&&!storageUnavailable)toast.error("账户与收藏暂时不可用");
    }).finally(()=>{if(!controller.signal.aborted)setSessionLoading(false);});
    return()=>controller.abort();
  },[storageUnavailable]);
  useEffect(()=>{try{setMotionEnabled(localStorage.getItem(motionPreferenceKey)!=="off");}catch{/* Preferences are optional. */}},[]);
  function toggleMotion(){
    const next=!motionEnabled;setMotionEnabled(next);
    try{localStorage.setItem(motionPreferenceKey,next?"on":"off");}catch{/* Session preference still applies. */}
  }
  useEffect(()=>{
    if(!copied)return;const timer=window.setTimeout(()=>setCopied(""),2000);
    return()=>window.clearTimeout(timer);
  },[copied,feedbackVersion]);
  useEffect(()=>{
    function shortcut(event:KeyboardEvent){
      if(selected||login||submissionOpen||event.defaultPrevented)return;
      const target=event.target as HTMLElement|null,editing=target?.closest("input,textarea,select,[contenteditable=true]");
      if(((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k")||(event.key==="/"&&!editing&&!event.ctrlKey&&!event.metaKey&&!event.altKey)){
        event.preventDefault();searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown",shortcut);return()=>document.removeEventListener("keydown",shortcut);
  },[selected,login,submissionOpen]);

  async function toggleFavorite(resource:Resource){
    if(!user){setLogin(true);return;}
    if(favoriteRequests.current.has(resource.id))return;
    favoriteRequests.current.add(resource.id);setPendingFavorites(previous=>[...previous,resource.id]);
    try{
      const saved=!favorites.includes(resource.id);
      const response=await fetch("/api/favorites",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resourceId:resource.id,saved})});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error||"收藏保存失败，请重试");
      setFavorites(previous=>saved?[...new Set([...previous,resource.id])]:previous.filter(id=>id!==resource.id));
      setCopied(resource.id+"favorite");setFeedbackVersion(previous=>previous+1);
      toast.success(saved?"已加入收藏":"已取消收藏");
    }catch(error){toast.error(error instanceof Error?error.message:"收藏失败");}
    finally{favoriteRequests.current.delete(resource.id);setPendingFavorites(previous=>previous.filter(id=>id!==resource.id));}
  }
  const filtered=useMemo(()=>filterLibrary(resources,{category,topic,tag,query,onlyFavorites,favorites,sort}),[resources,category,topic,query,tag,onlyFavorites,favorites,sort]);
  useEffect(()=>setPage(1),[category,topic,query,tag,onlyFavorites,sort]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/6)),currentPage=Math.min(page,pageCount),visible=filtered.slice((currentPage-1)*6,currentPage*6);
  // Typing should not replay every card's entrance.
  const motionRef=useLibraryMotion({enabled:motionEnabled,resultsKey:[category,topic,tag,onlyFavorites,sort,currentPage].join("|"),feedbackKey:copied+":"+feedbackVersion});
  const openResource=useCallback((resource:Resource)=>{
    detailTriggerRef.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setSelected(resource);
  },[]);
  useResourceTools(resources,openResource);
  const typeResources=resources.filter(resource=>(category==="全部"||resource.category===category)&&(!onlyFavorites||favorites.includes(resource.id)));
  const availableTopics=topics.filter(item=>typeResources.some(resource=>topicOf(resource)===item));
  const tags=[...new Set(typeResources.filter(resource=>topic==="全部用途"||topicOf(resource)===topic).flatMap(resource=>resource.tags))];
  const activeFilters=category!=="全部"||topic!=="全部用途"||tag!=="全部标签"||!!query.trim();
  function resetFilters(){setQuery("");setTag("全部标签");setCategory("全部");setTopic("全部用途");setPage(1);}
  function chooseType(value:string){setCategory(value);setTopic("全部用途");setTag("全部标签");setPage(1);}
  function showLibrary(){setOnlyFavorites(false);resetFilters();}
  function showFavorites(){if(!user){setLogin(true);return;}resetFilters();setOnlyFavorites(true);}
  function browseLibrary(){
    const library=document.getElementById("resources");
    library?.focus({preventScroll:true});
    library?.scrollIntoView({behavior:motionEnabled&&!matchMedia("(prefers-reduced-motion:reduce)").matches?"smooth":"instant",block:"start"});
  }
  function chooseFromHero(value:string){
    setOnlyFavorites(false);setQuery("");chooseType(value);
    browseLibrary();
  }
  async function copy(resource:Resource,language:"zh"|"en"="zh",install=false){
    const raw=install?skillInstallPrompt(resource,language):language==="en"?resource.contentEn:resource.content;
    const text=raw&&!install&&resource.category==="提示词"?promptForCopy(raw):raw;
    if(!text){toast.error(install?"请先补充有效的 HTTPS 来源链接":"这个语言版本还未补齐");return;}
    try{
      await navigator.clipboard.writeText(text);setCopied(resource.id+(install?"install":"")+language);setFeedbackVersion(previous=>previous+1);
      const message=install?language==="zh"?"已复制中文安装指令，粘贴给 Agent 即可":"English installation instruction copied":language==="en"?"已复制英文版":"已复制中文版";
      const marked=!install&&resource.category==="提示词"&&promptArguments(raw||"").length>0;
      toast.success(message+(marked?language==="zh"?"，请替换 {{…}} 中的内容":" — replace the content inside {{…}}":""));
    }catch{toast.error("复制失败，请在详情中选中正文复制");}
  }

  return <div className="site-shell archive-shell" ref={motionRef}>
    <a className="skip-link" href="#resources">跳到资源库</a>
    <div className="ambient-scene" aria-hidden="true"/><div className="reading-progress" aria-hidden="true"/>
    <Toaster position="bottom-right" richColors/>
    <header className="topbar">
      <a className="brand" href="/"><span className="brand-icon"><Archive size={23} aria-hidden="true"/></span><span>TK 的 AI 工具箱<small>提示词 / Skills / MCP</small></span></a>
      <nav aria-label="主导航"><button className={!onlyFavorites?"active":""} aria-pressed={!onlyFavorites} onClick={showLibrary}>资源库</button><button className={onlyFavorites?"active":""} aria-pressed={onlyFavorites} onClick={showFavorites} disabled={sessionLoading}><Heart size={16} aria-hidden="true"/>我的收藏</button></nav>
      <button className="contribute-button" onClick={()=>setSubmissionOpen(true)}>分享资料<Sparkles size={14} aria-hidden="true"/></button>
      <button className="motion-toggle" aria-label={motionEnabled?"关闭动态效果":"开启动态效果"} aria-pressed={motionEnabled} title={motionEnabled?"关闭动态效果":"开启动态效果"} onClick={toggleMotion}>{motionEnabled?<Pause size={17} aria-hidden="true"/>:<Play size={17} aria-hidden="true"/>}<span>动效</span></button>
      <button className="login-button" onClick={()=>setLogin(true)}><UserRound size={17} aria-hidden="true"/><span>{user?user.displayName:"登录"}</span></button>
    </header>
    <main className="workspace">
      <ArchiveHero resources={resources} onChooseType={chooseFromHero} onShare={()=>setSubmissionOpen(true)} onBrowse={browseLibrary}/>
      <section className="library" id="resources" aria-labelledby="library-heading" tabIndex={-1}>
        {storageUnavailable&&<div className="message-banner" role="alert">资源暂时无法读取，请稍后刷新；收藏与编辑暂时不能保存。</div>}
        <div className="archive-library-heading"><div><h2 id="library-heading">{onlyFavorites?"我的收藏":"探索资源库"}</h2><p>{onlyFavorites?"喜欢的资料，下次也能轻松找到。":"按类型、用途与标签，找到需要的那一份。"}</p></div><span><FolderOpen size={16} aria-hidden="true"/>{onlyFavorites?favorites.length:resources.length} 条</span></div>
        <div className="library-controls">
          <div className="search-row">
            <label className="search-field"><Search size={20} aria-hidden="true"/><input ref={searchRef} aria-label="搜索资源" value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜索名称、用途或中英文内容…"/>{query?<button aria-label="清空搜索" onClick={()=>{setQuery("");searchRef.current?.focus();}}><X size={17} aria-hidden="true"/></button>:<kbd aria-hidden="true">Ctrl K</kbd>}</label>
            <Select value={topic} onValueChange={value=>{setTopic(value);setTag("全部标签");}}><SelectTrigger className="scene-select" data-tone={topic==="全部用途"?undefined:topicTone(topic)} aria-label="按用途分类"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="全部用途">全部用途</SelectItem>{availableTopics.map(item=><SelectItem key={item} value={item} className="topic-option" data-tone={topicTone(item)}>{item} · {typeResources.filter(resource=>topicOf(resource)===item).length}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="filter-row">
            <Tabs value={category} onValueChange={chooseType}><TabsList className="category-tabs" aria-label="资源类型"><span className="category-indicator" aria-hidden="true"/>{categories.map(item=>{const Icon=icons[item]||FolderOpen;return <TabsTrigger key={item} value={item}><Icon size={15} aria-hidden="true"/>{item}<span>{resources.filter(resource=>(item==="全部"||resource.category===item)&&(!onlyFavorites||favorites.includes(resource.id))).length}</span></TabsTrigger>;})}</TabsList></Tabs>
            <label className="quality-filter"><select aria-label="资源排序" value={sort} onChange={event=>setSort(event.target.value)}><option>默认排序</option><option>最近更新</option></select></label>
          </div>
          <div className="topic-shortcuts" aria-label="用途分类快捷筛选"><button className={topic==="全部用途"?"active":""} aria-pressed={topic==="全部用途"} onClick={()=>{setTopic("全部用途");setTag("全部标签");}}>全部用途<span>{typeResources.length}</span></button>{availableTopics.map(item=><button key={item} data-tone={topicTone(item)} className={topic===item?"active":""} aria-pressed={topic===item} onClick={()=>{setTopic(item);setTag("全部标签");}}>{item}<span>{typeResources.filter(resource=>topicOf(resource)===item).length}</span></button>)}</div>
          {tags.length>0&&<details className="tag-filter"><summary>细分标签{tag!=="全部标签"&&" · "+tag}</summary><div className="tags"><button className={tag==="全部标签"?"chosen":""} aria-pressed={tag==="全部标签"} onClick={()=>setTag("全部标签")}>全部标签</button>{tags.map(item=><button key={item} className={tag===item?"chosen":""} aria-pressed={tag===item} onClick={()=>setTag(item)}>{item}</button>)}</div></details>}
          {activeFilters&&<div className="active-filter-row" aria-label="已应用的筛选">
            {category!=="全部"&&<button onClick={()=>chooseType("全部")} aria-label={"移除类型筛选 "+category}>{category}<X size={12} aria-hidden="true"/></button>}
            {topic!=="全部用途"&&<button data-tone={topicTone(topic)} onClick={()=>{setTopic("全部用途");setTag("全部标签");}} aria-label={"移除用途筛选 "+topic}>{topic}<X size={12} aria-hidden="true"/></button>}
            {tag!=="全部标签"&&<button onClick={()=>setTag("全部标签")} aria-label={"移除标签筛选 "+tag}>{tag}<X size={12} aria-hidden="true"/></button>}
            {query.trim()&&<button onClick={()=>setQuery("")} aria-label="移除搜索筛选">搜索：{query}<X size={12} aria-hidden="true"/></button>}
            <button className="clear-all" onClick={resetFilters}>清除筛选</button>
          </div>}
        </div>
        <div className="list-heading"><div><h2>{topic!=="全部用途"?topic:category==="全部"?onlyFavorites?"已收藏的资料":"全部资料":category}</h2><small className="card-interaction-hint">点击卡片翻面，再点翻回；右下角展开详情</small></div><div className="list-count"><span role="status" aria-live="polite" aria-atomic="true">找到 {filtered.length} 条资源</span><button className="mobile-contribute" onClick={()=>setSubmissionOpen(true)}>分享资料<Sparkles size={14} aria-hidden="true"/></button></div></div>
        <div className="resource-grid">{visible.map(resource=><ResourceCard key={resource.id} resource={resource} isFavorite={favorites.includes(resource.id)} pending={pendingFavorites.includes(resource.id)} favoriteUnavailable={sessionLoading||storageUnavailable} selectedTag={tag} copied={copied} onFavorite={resource=>void toggleFavorite(resource)} onTag={setTag} onCopy={(resource,language,install)=>void copy(resource,language,install)} onOpen={openResource}/>)}</div>
        {filtered.length>0&&pageCount>1&&<nav className="pagination" aria-label="资源分页"><button disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>上一页</button><span>{currentPage} / {pageCount}</span><button disabled={currentPage===pageCount} onClick={()=>setPage(currentPage+1)}>下一页</button></nav>}
        {!filtered.length&&<div className="empty"><Search size={30} aria-hidden="true"/><h3>{!resources.length?"这里还没有收录资料":onlyFavorites&&!favorites.length?"收藏你的第一条资源":"没有找到匹配的资源"}</h3><p>{!resources.length?"分享一份你真正想收藏的资料，整理与审核后就会出现在这里。":onlyFavorites&&!favorites.length?"在资源卡片上点击爱心，把喜欢的内容留在手边。":"试试其他用途、标签或关键词。"}</p>{!resources.length?<button className="secondary-button" onClick={()=>setSubmissionOpen(true)}>分享第一份资料</button>:onlyFavorites&&!favorites.length?<button className="secondary-button" onClick={showLibrary}>浏览资源库</button>:<button className="secondary-button" onClick={resetFilters}>清除筛选</button>}</div>}
      </section>
      <aside className="right-rail">
        <section className="archive-status"><span className="rail-label"><Orbit size={18} aria-hidden="true"/>档案概览</span><p>每一份资料，都有自己的位置。</p>{categories.filter(item=>item!=="全部").map(item=>{const Icon=icons[item];return <button className="status-row" key={item} onClick={()=>chooseFromHero(item)}><span><Icon size={17} aria-hidden="true"/>{item}</span><strong>{resources.filter(resource=>resource.category===item).length}<small>份</small></strong></button>;})}</section>
        <section className="rail-tip"><span className="rail-label"><FolderOpen size={17} aria-hidden="true"/>从这里开始</span><p>选类型，再选用途。提示词可直接复制中英正文；Skills 可复制安装指令交给 Agent。</p><small>搜索支持中英文内容。按 / 或 Ctrl K 快速查找。</small></section>
        <section className="rail-intake"><span className="rail-label"><Sparkles size={16} aria-hidden="true"/>一起补充档案</span><p>分享原文，整理中英版本、分类与标签，由管理员审核后公开。</p><button className="secondary-button" onClick={()=>setSubmissionOpen(true)}>提交一份资料</button></section>
        <div className="rail-note"><BookOpen size={20} aria-hidden="true"/><div><strong>继续阅读与记录</strong><a href="https://tanke.asia/" target="_blank" rel="noopener noreferrer">访问 TK 的小站<ExternalLink size={14} aria-hidden="true"/></a></div></div>
        {user&&["owner","admin"].includes(user.role)&&<a className="admin-link" href="/admin"><ShieldCheck size={17} aria-hidden="true"/>内容管理</a>}
      </aside>
    </main>
    <footer><span>TK 的 AI 工具箱 <span className="footer-flower" aria-hidden="true">✦</span>分类 · 收藏 · 中英对照</span><div><a href="/api/resources/export" download>导出公开资源 JSON</a>{socialLinks.map(([name,url])=><a key={name} href={url} target="_blank" rel="noopener noreferrer">{name}</a>)}</div></footer>
    <Sheet open={!!selected} onOpenChange={value=>{if(!value)setSelected(null);}}><SheetContent className="resource-sheet archive-detail" data-tone={selected?resourceTone(selected):undefined} data-motion={motionEnabled?"active":"disabled"} onCloseAutoFocus={event=>{if(detailTriggerRef.current?.isConnected){event.preventDefault();detailTriggerRef.current.focus({preventScroll:true});}}}>
      {selected&&<><SheetHeader><span className="type-label">{selected.category} · {topicOf(selected)}</span><SheetTitle className="detail-title">{selected.title}</SheetTitle><SheetDescription>{selected.description}</SheetDescription></SheetHeader><div className="detail-body">
        <div className="detail-toolbar"><button className="secondary-button" disabled={pendingFavorites.includes(selected.id)||sessionLoading||storageUnavailable} aria-pressed={favorites.includes(selected.id)} onClick={()=>toggleFavorite(selected)}><Heart size={16} aria-hidden="true"/>{pendingFavorites.includes(selected.id)?"正在保存…":favorites.includes(selected.id)?"已收藏":"收藏资料"}</button>{selected.url&&<a className="secondary-button" href={selected.url} target="_blank" rel="noopener noreferrer">打开来源<ExternalLink size={16} aria-hidden="true"/></a>}</div>
        <a className="secondary-button resource-export-link" href={"/api/resources/export?id="+encodeURIComponent(selected.id)} download><Download size={16} aria-hidden="true"/>导出 JSON</a>
        <div className="tags">{selected.tags.map(item=><span key={item}>{item}</span>)}</div>
        {selected.category==="Skills"&&<SkillInstallPanel key={selected.id} resource={selected}/>}
        <DemoPreview demoUrl={selected.demoUrl} demoType={selected.demoType} title={selected.title}/>
        <div className="bilingual-columns"><section lang="zh-CN"><div className="language-heading"><h3>中文版</h3><span>中文</span></div><p className="language-title">{selected.title}</p>{selected.category==="提示词"&&<PromptParameters text={selected.content} language="zh"/>}<pre tabIndex={0}><PromptText text={selected.content} enabled={selected.category==="提示词"}/></pre><button className="primary-button" data-copied={copied===selected.id+"zh"} onClick={()=>copy(selected,"zh")}>{copied===selected.id+"zh"?<Check size={16} aria-hidden="true"/>:<Copy size={16} aria-hidden="true"/>}复制中文版</button></section><section lang="en"><div className="language-heading"><h3>English</h3><span>EN</span></div><p className="language-title">{selected.titleEn}</p>{selected.category==="提示词"&&<PromptParameters text={selected.contentEn||""} language="en"/>}<pre tabIndex={0}><PromptText text={selected.contentEn||"English translation is pending."} enabled={selected.category==="提示词"}/></pre><button className="primary-button" disabled={!selected.contentEn} data-copied={copied===selected.id+"en"} onClick={()=>copy(selected,"en")}>{copied===selected.id+"en"?<Check size={16} aria-hidden="true"/>:<Copy size={16} aria-hidden="true"/>}Copy English</button></section></div>
        <p className="source-note">来源：{selected.source}{selected.updatedAt&&" · 更新于 "+new Date(selected.updatedAt).toLocaleDateString("zh-CN",{timeZone:"Asia/Shanghai"})}</p>
      </div></>}
    </SheetContent></Sheet>
    <SubmissionDialog open={submissionOpen} onOpenChange={setSubmissionOpen}/>
    <Dialog open={login} onOpenChange={setLogin}><DialogContent><DialogHeader><DialogTitle>登录与收藏</DialogTitle><DialogDescription>当前测试版使用 Sites 账户。GitHub／邮箱登录将在身份服务配置完成后开放。</DialogDescription></DialogHeader>{sessionLoading?<p>正在读取账户…</p>:user?<><p>当前账户：{user.displayName}</p><button className="primary-button" onClick={()=>{showFavorites();setLogin(false);}}>查看我的收藏</button>{["owner","admin"].includes(user.role)&&<a className="secondary-button" href="/admin">内容管理</a>}<a className="text-button" href="/signout-with-chatgpt?return_to=/" target="_top">退出测试账户</a></>:<a className="primary-button" href="/signin-with-chatgpt?return_to=/" target="_top">使用测试账户继续</a>}</DialogContent></Dialog>
  </div>;
}
