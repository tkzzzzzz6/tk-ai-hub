import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

// Run the actual filtering module without a browser or a database.
const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022},
}).outputText;
const asModule = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const taxonomy = asModule(compile('../lib/taxonomy.ts'));
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
console.log('PASS: bilingual search, combined filters, favorites isolation, empty collection and stable sorting.');
