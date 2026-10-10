import type {Resource} from "./catalog";
export const topics=["科研阅读","编程开发","前端设计","前端动效","写作表达","学习整理","文档处理","语言翻译","图像创作","视频创作","资料检索","通用辅助","未分类"] as const;
export type Topic=typeof topics[number];
const rules:{topic:Topic;words:RegExp}[]=[
{topic:"视频创作",words:/视频创作|视频生成|生成视频|文生视频|图生视频|视频提示词|video generation|video prompt|(?:text|image)[ -]to[ -]video|\bsora\b|\bveo\b|\bkling\b|\brunway\b|可灵/gi},
{topic:"前端动效",words:/GSAP|ScrollTrigger|滚动动画|前端动效|动画编排|animation|motion design/gi},
{topic:"前端设计",words:/前端设计|视觉设计|设计系统|玻璃拟态|排版|frontend.design|UI.UX|typography|glassmorphism/gi},
{topic:"科研阅读",words:/论文|科研|文献|实验|research|paper|academic|scientific|arxiv/gi},
{topic:"语言翻译",words:/翻译|译文|语言学习|translate|translator|translation|english improver|language tutor/gi},
{topic:"图像创作",words:/绘画|图像生成|生成图像|生图提示词|文生图(?!视频)|生图|海报|插画|midjourney|stable diffusion|image generation|image prompt|text[ -]to[ -]image|illustration|design prompt|dall[ -]?e/gi},
{topic:"文档处理",words:/文档|表格|演示|文稿|pdf|docx|spreadsheet|excel|presentation|filesystem|powerpoint/gi},
{topic:"编程开发",words:/编程|代码|开发|调试|程序|code|coding|developer|debug|javascript|python|linux terminal|github|gh-fix-ci|skill-creator/gi},
{topic:"写作表达",words:/写作|文章|博客|文案|writer|writing|blog|copywriting|essay/gi},
{topic:"学习整理",words:/学习|笔记|知识|复习|总结|study|learning|notes|teacher|tutor|summariz/gi},
{topic:"资料检索",words:/检索|搜索|查找|search|retrieval|registry|索引/gi},
{topic:"通用辅助",words:/助手|提示词|面试|记忆|规划|agent|prompt|assistant|interview|memory|plan/gi}
];
export function inferTopic(r:Pick<Resource,"title"|"description"|"tags"|"content">&{titleEn?:string;descriptionEn?:string;contentEn?:string}):Topic{
 let best:Topic="未分类",score=0;for(const rule of rules){const count=(text:string)=>Array.from(text.matchAll(rule.words)).length;const value=count(r.title+" "+(r.titleEn||""))*8+count(r.tags.join(" "))*4+count(r.description+" "+(r.descriptionEn||""))*3+Math.min(2,count((r.contentEn||r.content).slice(0,700)));if(value>score){best=rule.topic;score=value;}}return best;
}
export function topicOf(r:Resource):Topic{return topics.includes(r.topic as Topic)?r.topic as Topic:inferTopic(r);}
