export type PromptArgument={name:string;defaultValue:string;token:string;start:number;end:number};

/** Pure parsing; source text is data and is never evaluated or interpolated. */
export function promptArguments(text:string):PromptArgument[]{
 const result:PromptArgument[]=[];
 const expression=/\{argument\b([^{}\n]{1,1000})\}|\{\{([^{}\n]{1,500})\}\}/g;
 for(const match of text.matchAll(expression)){
  let name="",defaultValue="";
  if(match[1]!==undefined){
   const attributes=new Map<string,string>();
   const attributeExpression=/\s*(name|default)\s*=\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/gy;
   let consumed=0,valid=true;
   while(consumed<match[1].trimEnd().length){
    attributeExpression.lastIndex=consumed;
    const attribute=attributeExpression.exec(match[1]);
    if(!attribute||attributes.has(attribute[1])){valid=false;break;}
    const quoted=attribute[2];
    attributes.set(attribute[1],quoted.slice(1,-1).replace(/\\([\\"'])/g,"$1"));
    consumed=attributeExpression.lastIndex;
   }
   if(!valid)continue;
   name=attributes.get("name")?.trim()||"";
   defaultValue=attributes.get("default")||"";
  }else{
   const split=match[2].search(/[:：]/);
   name=(split<0?match[2]:match[2].slice(0,split)).trim();
   defaultValue=split<0?"":match[2].slice(split+1).trim();
  }
  if(!name)continue;
  result.push({name,defaultValue,token:match[0],start:match.index!,end:match.index!+match[0].length});
 }
 return result;
}

export function argumentMarker(argument:Pick<PromptArgument,"name"|"defaultValue">){
 const separator=/[\u3400-\u9fff]/.test(argument.name)?"：":": ";
 return "{{"+argument.name+(argument.defaultValue?separator+argument.defaultValue:"")+"}}";
}

/** Keep all prose, translate nothing here, and preserve explicit replacement marks. */
export function promptForCopy(text:string){
 const parameters=promptArguments(text);
 let cursor=0,result="";
 for(const parameter of parameters){
  result+=text.slice(cursor,parameter.start)+argumentMarker(parameter);
  cursor=parameter.end;
 }
 return result+text.slice(cursor);
}

export function uniquePromptArguments(text:string){
 const seen=new Set<string>();
 return promptArguments(text).filter(parameter=>{
  const key=parameter.name+"\u0000"+parameter.defaultValue;
  if(seen.has(key))return false;
  seen.add(key);return true;
 });
}
