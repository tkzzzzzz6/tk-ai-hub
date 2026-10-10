import type {Resource} from "./catalog";
import {topicOf,type Topic} from "./taxonomy";

export type ResourceTone="rose"|"peach"|"violet"|"mint"|"sky"|"sand"|"slate";

const topicTones:Record<Topic,ResourceTone>={
  "图像创作":"rose",
  "视频创作":"peach",
  "科研阅读":"violet",
  "前端设计":"violet",
  "前端动效":"violet",
  "学习整理":"mint",
  "文档处理":"mint",
  "资料检索":"mint",
  "编程开发":"sky",
  "写作表达":"sand",
  "语言翻译":"sand",
  "通用辅助":"slate",
  "未分类":"slate",
};

export function topicTone(topic:string):ResourceTone{
  return topicTones[topic as Topic]||"slate";
}

// Purpose colors distinguish prompts; Skills and MCP keep the archive's blue palette.
export function resourceTone(resource:Resource):ResourceTone|undefined{
  return resource.category==="提示词"?topicTone(topicOf(resource)):undefined;
}

export const promptColorLegend=[
  {label:"生图",tone:"rose"},
  {label:"视频",tone:"peach"},
  {label:"科研 / 设计",tone:"violet"},
  {label:"学习 / 文档",tone:"mint"},
  {label:"编程",tone:"sky"},
  {label:"写作 / 翻译",tone:"sand"},
] as const;
