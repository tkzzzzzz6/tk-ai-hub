import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

// Run the actual filtering module without a browser or a database.
const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022},
}).outputText;
const asModule = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const taxonomy = asModule(compile('../lib/taxonomy.ts'));
const {inferTopic} = await import(taxonomy);
const tones = compile('../lib/resource-tones.ts').replace(/from ["']\.\/taxonomy["']/, 'from ' + JSON.stringify(taxonomy));
const {resourceTone} = await import(asModule(tones));
const filtering = compile('../lib/library-filters.ts').replace(/from ["']\.\/taxonomy["']/, 'from ' + JSON.stringify(taxonomy));
const {filterLibrary} = await import(asModule(filtering));
const defaults = {category: '全部', topic: '全部用途', tag: '全部标签', query: '', onlyFavorites: false, favorites: [], sort: '默认排序'};
const resources = [
  {id: 'coach', category: '提示词', topic: '学习整理', title: '算法教练', description: '逐级提示', tags: ['算法'], content: '中文题目', contentEn: 'Constraint-driven algorithm coaching', updatedAt: '2026-10-01'},
  {id: 'motion', category: 'Skills', topic: '前端动效', title: 'GSAP', description: '动画编排', tags: ['GSAP'], content: '中文动效', contentEn: 'Interruptible timelines', updatedAt: '2026-10-10'},
  {id: 'design', category: 'Skills', topic: '前端设计', title: 'Frontend Design', description: '界面设计', tags: ['设计'], content: '中文设计', contentEn: 'Visual design', updatedAt: '2026-10-05'},
];
const ids = filters => filterLibrary(resources, {...defaults, ...filters}).map(resource => resource.id);
assert.deepEqual(ids({query: '  CONSTRAINT-DRIVEN  '}), ['coach'], 'English prompt text is searchable, ignoring case and outer whitespace.');
assert.deepEqual(ids({category: 'Skills', topic: '前端动效', tag: 'GSAP'}), ['motion'], 'Type, purpose and tag filters work together.');
assert.deepEqual(ids({onlyFavorites: true, favorites: ['design', 'deleted-resource']}), ['design'], 'Favorites show only existing public entries.');
assert.deepEqual(ids({onlyFavorites: true, favorites: []}), [], 'An empty collection does not expose all resources.');
assert.deepEqual(ids({sort: '最近更新'}), ['motion', 'design', 'coach'], 'Newest-first sorting is deterministic.');
assert.deepEqual(resources.map(resource => resource.id), ['coach', 'motion', 'design'], 'Sorting must not mutate the source collection.');
assert.deepEqual(ids({query: 'no such resource'}), [], 'Unmatched searches remain empty.');
const prompt = fields => ({category:'提示词',title:'',description:'',tags:[],content:'',...fields});
const image = prompt({title:'文生图提示词',tags:['Midjourney']});
const video = prompt({title:'图生视频提示词',description:'Veo image-to-video generation and camera animation'});
assert.equal(inferTopic(image),'图像创作','Chinese image generation terms are classified explicitly.');
assert.equal(inferTopic(video),'视频创作','Video generation is distinct from frontend animation.');
assert.equal(inferTopic(prompt({title:'Sora video prompt'})),'视频创作','English video-generation inputs use the same topic.');
assert.equal(inferTopic(prompt({title:'GSAP ScrollTrigger animation',category:'Skills'})),'前端动效','Frontend animation retains its own purpose.');
assert.equal(resourceTone(image),'rose','Image prompts receive the pink palette.');
assert.equal(resourceTone(video),'peach','Video prompts receive the orange palette.');
assert.equal(resourceTone(prompt({title:'Sora video prompt',topic:'科研阅读'})),'violet','An explicit reviewed purpose takes precedence over keywords.');
assert.equal(resourceTone(resources[1]),undefined,'Skills keep the existing archive palette.');
assert.deepEqual(filterLibrary([image,video],{...defaults,topic:'视频创作'}),[video],'Video creation is available to purpose filters.');
console.log('PASS: bilingual search, combined filters, favorites isolation, stable sorting, image/video classification and prompt palettes.');
