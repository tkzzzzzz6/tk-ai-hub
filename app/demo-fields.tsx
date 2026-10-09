"use client";
import { type DemoFields as Fields, type DemoType } from "@/lib/demo";
import DemoPreview from "./demo-preview";

export default function DemoFields({demoUrl = "", demoType = "auto", onChange}: Fields & {onChange: (fields: Required<Fields>) => void}) {
  return <div className="demo-fields"><label>效果展示链接（可选）<input type="url" maxLength={2000} value={demoUrl} onChange={event => onChange({demoUrl: event.target.value, demoType})} placeholder="https://… 图片、视频或展示页"/></label>
    <p className="form-hint">图片、视频直链可在资源卡片中预览；展示页保留打开链接。留空即可。</p>
    {demoUrl && <><label>展示方式<select aria-label="效果展示方式" value={demoType} onChange={event => onChange({demoUrl, demoType: event.target.value as DemoType})}><option value="auto">自动识别</option><option value="image">图片</option><option value="video">视频</option><option value="link">展示页链接</option></select></label><p className="form-hint">直链没有文件后缀时，可手动选择图片或视频。</p><DemoPreview demoUrl={demoUrl} demoType={demoType} title="这份资料" compact/></>}
  </div>;
}
