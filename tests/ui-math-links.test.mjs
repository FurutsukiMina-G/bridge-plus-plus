import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Marked} from 'marked';
import {mathExtension,replaceMath} from '../app/ui/math.js';
import {fileLinks,parseFileLink,toolFilePath,webLink} from '../app/ui/file-links.js';
import {webUrl} from '../app/services/file-operations.mjs';

const md=new Marked({breaks:true,gfm:true});md.use(mathExtension);md.use(fileLinks);
const render=text=>replaceMath(md.parse(text));
const formulas=html=>(html.match(/class="katex"/g)??[]).length;

test('all four delimiters render',()=>{
  assert.equal(formulas(render('质能方程 $E=mc^2$ 很有名')),1);
  assert.equal(formulas(render('行内 \\(a^2+b^2=c^2\\) 公式')),1);
  assert.match(render('$$\n\\int_0^1 x\\,dx\n$$'),/math-block/);
  assert.match(render('\\[\n\\frac{1}{2}\n\\]'),/math-block/);
  assert.match(render('前文 $$x$$ 后文'),/math-block/);
});

test('a formula works inside Chinese text, lists and bold',()=>{
  assert.equal(formulas(render('当$\\lambda=600$nm时，**$d$**变大')),2);
  assert.equal(formulas(render('- 第一项 $a$\n- 第二项 $b$')),2);
});

test('prices and ordinary dollars stay text',()=>{
  for(const text of ['价格 $5 和 $10','花了$5，还剩$10','大约 $ 5 $ 左右','只有一个 $ 符号'])assert.equal(formulas(render(text)),0,text);
  assert.match(render('\\$5 和 \\$6'),/\$5 和 \$6/);
});

test('code stays code',()=>{
  assert.equal(formulas(render('`$a$` 和\n\n```\n$$b$$\n```')),0);
});

test('an unfinished formula during streaming stays as text',()=>{
  assert.equal(formulas(render('公式 $$\\frac{1}{2')),0);
  assert.equal(formulas(render('公式 $x+')),0);
});

test('a bad formula shows its source and nothing runs',()=>{
  assert.match(render('$\\notacommand{x}$'),/katex-error|\\notacommand/);
  const html=render('$\\href{javascript:alert(1)}{x}$');
  assert.doesNotMatch(html,/href="javascript/);
  assert.doesNotMatch(render('$<img src=x onerror=alert(1)>$'),/<img/);
  assert.equal(replaceMath('<span data-md-math="%E0%A4%A"></span>'),'');
});

test('file links are recognised, web links are left alone',()=>{
  assert.deepEqual(parseFileLink('D:\\Work++\\a.pdf'),{path:'D:\\Work++\\a.pdf',line:null});
  assert.deepEqual(parseFileLink('D:%5CWork++%5C%E5%85%89.pdf'),{path:'D:\\Work++\\光.pdf',line:null});
  assert.deepEqual(parseFileLink('C:/x/y.ts:42'),{path:'C:/x/y.ts',line:42});
  assert.deepEqual(parseFileLink('src/a.ts#L7'),{path:'src/a.ts',line:7});
  assert.deepEqual(parseFileLink('src/a.ts#L7-L9'),{path:'src/a.ts',line:7});
  assert.deepEqual(parseFileLink('file:///D:/x/y.md'),{path:'D:/x/y.md',line:null});
  assert.deepEqual(parseFileLink('app/main.mjs:12:3'),{path:'app/main.mjs',line:12});
  for(const href of ['https://a.com/b.pdf','http://a','mailto:a@b.c','bridge-media://x','#section','',null])assert.equal(parseFileLink(href),null,String(href));
});

test('a file link keeps its label and its path survives quoting',()=>{
  const html=md.parse('[作业.pdf](<D:\\Work++\\作业.pdf>) 和 [网站](https://example.com)');
  assert.match(html,/class="file-link"/);
  assert.match(html,/data-link-path="D:\\Work\+\+\\作业\.pdf"/);
  assert.match(html,/>作业\.pdf<\/a>/);
  assert.match(html,/href="https:\/\/example\.com\/"/);
  assert.match(md.parse('[x](a.ts:3)'),/data-link-line="3"/);
  assert.doesNotMatch(md.parse('[x](a"><b>.ts)'),/<b>\.ts/);
});

test('only plain web links may open in the browser, here and in the backend',()=>{
  assert.equal(webLink('https://a.com/b?c=1'),'https://a.com/b?c=1');
  assert.equal(webUrl('http://a.com/'),'http://a.com/');
  for(const href of ['javascript:alert(1)','file:///C:/a.txt','mailto:a@b.c','bridge-media://x','https://user:pass@a.com/','not a url','',null]){
    assert.equal(webLink(href),null,String(href));
    assert.throws(()=>webUrl(href),String(href));
  }
  assert.throws(()=>webUrl('https://a.com/'+'x'.repeat(9000)));
});

test('a web link shows where it goes',()=>{
  const html=md.parse('[科普中国](https://example.com/a) 和 https://example.org/b');
  assert.match(html,/href="https:\/\/example\.com\/a" title="https:\/\/example\.com\/a">科普中国</);
  assert.match(html,/href="https:\/\/example\.org\/b"/);
  assert.match(md.parse('[x](https://a.com "说明")'),/title="说明"/);
});

test('copying goes through the main process, because the window is refused every browser permission',()=>{
  const ui=new URL('../app/ui/',import.meta.url);
  for(const name of readdirSync(ui).filter(file=>file.endsWith('.js')&&file!=='build.js'))assert.doesNotMatch(readFileSync(new URL(name,ui),'utf8'),/navigator\.clipboard/,name);
});

test('a tool call names its file under any of the usual arguments',()=>{
  assert.equal(toolFilePath({path:'a.txt'}),'a.txt');
  assert.equal(toolFilePath({file_path:'b.txt',content:'x'}),'b.txt');
  assert.equal(toolFilePath({AbsolutePath:'c.txt'}),'c.txt');
  assert.equal(toolFilePath({TargetFile:'d.txt'}),'d.txt');
  assert.equal(toolFilePath({query:'x'}),null);
  assert.equal(toolFilePath(null),null);
});
