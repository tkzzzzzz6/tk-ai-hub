import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';

// Execute the actual pure TypeScript modules and import SQL, without a Worker.
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(import.meta.url),modules=new Map();
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
async function moduleUrl(file){
 if(modules.has(file))return modules.get(file);
 if(file.endsWith('.json')){const result=asModule('export default '+fs.readFileSync(file,'utf8'));modules.set(file,result);return result;}
 let source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
 for(const match of [...source.matchAll(/from\s+(['"])([^'"]+)\1/g)]){
  const specifier=match[2];let target;
  if(specifier.startsWith('@/')||specifier.startsWith('.')){
   let resolved=specifier.startsWith('@/')?path.join(root,specifier.slice(2)):path.resolve(path.dirname(file),specifier);
   if(!path.extname(resolved))resolved+='.ts';
   target=await moduleUrl(resolved);
  }else target=pathToFileURL(require.resolve(specifier)).href;
  source=source.replace(match[0],'from '+JSON.stringify(target));
 }
 const result=asModule(source);modules.set(file,result);return result;
}
const load=async file=>import(await moduleUrl(path.join(root,file)));
const {promptArguments,promptForCopy,uniquePromptArguments}=await load('lib/prompt-template.ts');
const {configuredResources,catalogImports}=await load('lib/resource-catalog.ts');
const {catalogResourceSchema}=await load('lib/resource-schema.ts');
const {exportResource}=await load('lib/resource-export.ts');
const {importConfiguredResources}=await load('lib/resource-bootstrap.ts');
const image=configuredResources.find(resource=>resource.id==='minimal-doodle-action-chain');
assert(image);
assert.equal(image.topic,'图像创作');
assert.equal(image.demoType,'image');
assert.equal(image.demoUrl,'https://tk-pichost-1325224430.cos.ap-chengdu.myqcloud.com/blog/1791619228912.png');
assert.equal(promptArguments(image.content)[0].name,'角色列表');
assert.equal(promptArguments(image.contentEn)[0].name,'Character list');
assert(promptForCopy(image.content).startsWith('{{角色列表：角色A / 角色B / 角色C / 角色D}}，'));
assert(promptForCopy(image.contentEn).startsWith('{{Character list: Character A / Character B / Character C / Character D}},'));
assert.equal(promptForCopy(image.content).slice(promptForCopy(image.content).indexOf('，')),image.content.slice(image.content.indexOf('，')),'Copy must preserve every non-parameter character.');
assert.equal(promptForCopy('{{subject}} and {{subject}}'),'{{subject}} and {{subject}}');
assert.equal(uniquePromptArguments('{{subject}} and {{subject}}').length,1);
assert.equal(promptForCopy('{argument name="x" default="unfinished}'),' {argument name="x" default="unfinished}'.trim());
assert.equal(promptForCopy('{argument name="x" default=bad}'),'{argument name="x" default=bad}');
assert.equal(promptForCopy('{argument default="a" name="x"}'),'{{x: a}}');
assert.equal(promptForCopy('{argument name="x" name="y"}'),'{argument name="x" name="y"}');
assert.equal(promptForCopy('const x = { value: 1 }; <script>alert(1)</script>'),'const x = { value: 1 }; <script>alert(1)</script>');
assert(!catalogResourceSchema.safeParse({...image,contentEn:''}).success,'Incomplete public bilingual data must fail validation.');
assert(!catalogResourceSchema.safeParse({...image,demoUrl:'javascript:alert(1)'}).success,'Unsafe media URL must fail validation.');
assert.equal(exportResource({...image,secret:'private',duplicateOf:'internal'}).secret,undefined);
assert.equal(exportResource(image).content,image.content,'Export must keep original argument syntax.');

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(`CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE resources(id TEXT PRIMARY KEY,title TEXT,category TEXT,topic TEXT,description TEXT,url TEXT,demo_url TEXT,demo_type TEXT,canonical_url TEXT,tags TEXT,content TEXT,title_en TEXT,description_en TEXT,content_en TEXT,content_hash TEXT,original_language TEXT,source TEXT,status TEXT,updated_at TEXT);
 CREATE UNIQUE INDEX source_identity ON resources(canonical_url) WHERE canonical_url<>'' AND status<>'deleted';`);
const database={
 prepare(sql){return {sql,values:[],bind(...values){return {...this,values};},async first(){return sqlite.prepare(this.sql).get(...this.values)||null;}};},
 async batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>sqlite.prepare(s.sql).run(...s.values));sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}
};
await importConfiguredResources(database);
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM resources').get().n,5);
const imported=sqlite.prepare('SELECT * FROM resources WHERE id=?').get(image.id);
assert.equal(imported.status,'published');assert.equal(imported.demo_url,image.demoUrl);assert.equal(imported.content_en,image.contentEn);
sqlite.prepare("UPDATE resources SET title='admin edit',status='hidden' WHERE id=?").run(image.id);
await importConfiguredResources(database);
assert.equal(sqlite.prepare('SELECT title FROM resources WHERE id=?').get(image.id).title,'admin edit');
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM resources').get().n,5,'Imports must be idempotent.');
const imageBatch=catalogImports.find(batch=>batch.resourceIds.includes(image.id));
sqlite.prepare('DELETE FROM settings WHERE key=?').run(imageBatch.key);
await importConfiguredResources(database);
assert.equal(sqlite.prepare('SELECT status FROM resources WHERE id=?').get(image.id).status,'hidden','Existing IDs must win even if an import marker is missing.');

// Simulate a legacy deployment: completed batches must not recreate deleted rows.
sqlite.exec('DELETE FROM resources; DELETE FROM settings;');
for(const batch of catalogImports.slice(0,2))sqlite.prepare('INSERT INTO settings VALUES (?,?)').run(batch.key,'{}');
await importConfiguredResources(database);
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM resources').get().n,1);
sqlite.exec('DELETE FROM resources; DELETE FROM settings;');
const failing={...database,async batch(statements){return database.batch([...statements,database.prepare('INSERT INTO missing_table VALUES (1)')]);}};
await assert.rejects(importConfiguredResources(failing));
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM settings').get().n,0,'Failed batch must not leave a completed marker.');
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM resources').get().n,0);
sqlite.close();
console.log('PASS: bilingual data, replaceable arguments, lossless copy/export, media validation, real SQLite imports, legacy markers, admin-edit protection and rollback.');
