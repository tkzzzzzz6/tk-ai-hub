import packageData from "@/data/skill-packages.json";
import type {Resource} from "./catalog";

export type SkillPackage={downloadUrl:string;downloadLabel:string;commit:string;packagedAt:string;kind:"repository"|"skill"|"collection";installTarget?:{zh:string;en:string}};
export const skillPackages=packageData as Record<string,SkillPackage>;
const sourceKey=(url:string)=>url.replace(/\/$/,"");
export function skillPackage(resource:Resource){return resource.category==="Skills"?skillPackages[sourceKey(resource.url)]:undefined;}
export function skillInstallPrompt(resource:Resource,language:"zh"|"en"="zh"){
 if(resource.category!=="Skills"||!/^https:\/\//i.test(resource.url))return "";
 const target=skillPackage(resource)?.installTarget||{zh:`安装「${resource.title}」`,en:`install “${resource.titleEn||resource.title}”`};
 return language==="zh"?`请根据 ${resource.url} 的官方安装说明，识别你当前的 Agent、操作系统和技能目录，${target.zh}，优先使用官方安装器并优先安装到当前项目，保留所有必要的脚本、参考文档、数据和许可证，不覆盖已有技能的本地修改；若缺少权限或必需依赖，请明确说明，完成后报告安装位置、版本及是否能被 Agent 识别。`:`Follow the official installation instructions at ${resource.url}, identify your current agent, operating system, and skills directory, and ${target.en}; prefer the official installer and project-local installation, retain all required scripts, references, data, and licenses without overwriting local modifications to existing skills, explain any missing permissions or required dependencies, and report the installation path, version, and whether the agent recognizes the skill after installation.`;
}
