import type {Resource} from "./catalog";

export type SkillPackage={downloadUrl:string;downloadLabel:string;commit:string;packagedAt:string;kind:"repository"|"skill"|"collection"};
export const skillPackages:Record<string,SkillPackage>={
 "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill":{downloadUrl:"/skills/ui-ux-pro-max-50d8a7de.zip",downloadLabel:"下载原仓库 ZIP",commit:"50d8a7de0900119855614541f15a1a616691eb33",packagedAt:"2026-10-10",kind:"repository"},
 "https://github.com/greensock/gsap-skills":{downloadUrl:"/skills/gsap-skills-aed9cfd3.zip",downloadLabel:"下载完整合集 ZIP",commit:"aed9cfd3277740755f6bfc1155c7aa645403b760",packagedAt:"2026-10-10",kind:"collection"},
 "https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md":{downloadUrl:"/skills/frontend-design-dbd4588f.zip",downloadLabel:"下载技能包 ZIP",commit:"dbd4588f9e1033efb41dad4bef2f7947c8993d44",packagedAt:"2026-10-10",kind:"skill"},
};
const sourceKey=(url:string)=>url.replace(/\/$/,"");
export function skillPackage(resource:Resource){return resource.category==="Skills"?skillPackages[sourceKey(resource.url)]:undefined;}
export function skillInstallPrompt(resource:Resource,language:"zh"|"en"="zh"){
 if(resource.category!=="Skills"||!/^https:\/\//i.test(resource.url))return "";
 const key=sourceKey(resource.url);
 const target=key.includes("anthropics/skills/blob/")?{zh:"仅安装 skills/frontend-design 这一个技能，不安装仓库中的其他技能",en:"install only the skills/frontend-design skill, not the other skills in the repository"}:key==="https://github.com/greensock/gsap-skills"?{zh:"安装 GSAP 官方技能合集中的全部 8 个技能",en:"install all 8 skills in the official GSAP collection"}:{zh:`安装「${resource.title}」`,en:`install “${resource.titleEn||resource.title}”`};
 return language==="zh"?`请根据 ${resource.url} 的官方安装说明，识别你当前的 Agent、操作系统和技能目录，${target.zh}，优先使用官方安装器并优先安装到当前项目，保留所有必要的脚本、参考文档、数据和许可证，不覆盖已有技能的本地修改；若缺少权限或必需依赖，请明确说明，完成后报告安装位置、版本及是否能被 Agent 识别。`:`Follow the official installation instructions at ${resource.url}, identify your current agent, operating system, and skills directory, and ${target.en}; prefer the official installer and project-local installation, retain all required scripts, references, data, and licenses without overwriting local modifications to existing skills, explain any missing permissions or required dependencies, and report the installation path, version, and whether the agent recognizes the skill after installation.`;
}
