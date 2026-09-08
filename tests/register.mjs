import {registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';
const root=fileURLToPath(new URL('../',import.meta.url));
registerHooks({
 resolve(specifier,context,next){
  if(specifier==='server-only')return{url:'data:text/javascript,export {}',shortCircuit:true};
  if(specifier==='next/headers')return{url:new URL('./mock-headers.mjs',import.meta.url).href,shortCircuit:true};
  if(specifier==='next/cache.js')return{url:new URL('./mock-cache.mjs',import.meta.url).href,shortCircuit:true};
  let path=specifier.startsWith('@/')?root+specifier.slice(2):specifier.startsWith('.')&&context.parentURL?.startsWith('file:')?fileURLToPath(new URL(specifier,context.parentURL)):null;
  if(path){for(const suffix of ['', '.ts','.tsx','.mjs'])if(existsSync(path+suffix)&&!path.endsWith('/'))return next(pathToFileURL(path+suffix).href,context)}
  return next(specifier,context);
 },
 load(url,context,next){if(/\.(ts|tsx)$/.test(url)&&!url.includes('/node_modules/')){const source=ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;return{format:'module',source,shortCircuit:true}}return next(url,context)}
});
