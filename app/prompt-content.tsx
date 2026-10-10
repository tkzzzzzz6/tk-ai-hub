import {Fragment} from "react";
import {argumentMarker,promptArguments,uniquePromptArguments} from "@/lib/prompt-template";

export function PromptText({text,enabled=true}:{text:string;enabled?:boolean}){
 if(!enabled)return <>{text}</>;
 const parameters=promptArguments(text);
 let cursor=0;
 const parts=parameters.map(parameter=>{
  const preceding=text.slice(cursor,parameter.start);cursor=parameter.end;
  return <Fragment key={parameter.start}>{preceding}<mark className="prompt-placeholder" title={`可替换：${parameter.name}${parameter.defaultValue?"；示例："+parameter.defaultValue:""}`}>{argumentMarker(parameter)}</mark></Fragment>;
 });
 return <>{parts}{text.slice(cursor)}</>;
}

export function PromptParameters({text,language}:{text:string;language:"zh"|"en"}){
 const parameters=uniquePromptArguments(text);
 if(!parameters.length)return null;
 return <aside className="prompt-parameters" aria-label={language==="zh"?"可替换内容说明":"Replaceable content"}>
  <strong>{language==="zh"?"可替换内容":"Replaceable content"}</strong>
  <p>{language==="zh"?"复制后，替换 {{…}} 中的内容即可。下列值是示例，可按需更换。":"After copying, replace the content inside {{…}}. The values below are examples you can change."}</p>
  <dl>{parameters.map(parameter=><div key={parameter.name+parameter.defaultValue}><dt>{parameter.name}</dt><dd>{parameter.defaultValue||(language==="zh"?"请替换为你的内容":"Replace with your content")}</dd></div>)}</dl>
 </aside>;
}
