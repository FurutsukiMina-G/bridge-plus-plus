import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Marked} from 'marked';
import {cjkEmphasis,emphasisTokenizer,flanking} from '../app/ui/markdown-cjk.js';

// The renderer parses with these options (app.js markdown()).
const options={gfm:true,breaks:true};
const plain=new Marked(options),cjk=new Marked(options,cjkEmphasis);
const replica=new Marked(options,{tokenizer:{emStrong:emphasisTokenizer({cjk:false,fallback:false})}});

test('bold and italic close and open next to Chinese punctuation',()=>{
  const cases={
    '**大红色（纯红）**纯色':'<strong>大红色（纯红）</strong>纯色',
    '前文**（括号）中文**后文':'前文<strong>（括号）中文</strong>后文',
    '这是**“重要”**的事':'这是<strong>“重要”</strong>的事',
    '中**(注)**文':'中<strong>(注)</strong>文',
    '涨了**50%**的幅度':'涨了<strong>50%</strong>的幅度',
    '**`npm test`**会跑全部测试':'<strong><code>npm test</code></strong>会跑全部测试',
    '*斜体（注）*后文':'<em>斜体（注）</em>后文',
    '**注**：**说明（一）**结尾':'<strong>注</strong>：<strong>说明（一）</strong>结尾',
    '**「日本語」**テスト':'<strong>「日本語」</strong>テスト',
  };
  for(const [source,html] of Object.entries(cases))assert.equal(cjk.parseInline(source),html,source);
  // Without the extension these stay literal, which is the bug being fixed.
  assert.equal(plain.parseInline('**大红色（纯红）**纯色'),'**大红色（纯红）**纯色');
});

test('a CJK neighbour counts like punctuation on that side, spaces still win',()=>{
  assert.deepEqual(flanking('）','纯'),{left:true,right:true});
  assert.deepEqual(flanking('）','纯',{cjk:false}),{left:true,right:false});
  assert.deepEqual(flanking('说','（'),{left:true,right:true});
  assert.deepEqual(flanking('说','（',{cjk:false}),{left:false,right:true});
  assert.deepEqual(flanking(' ','（'),{left:true,right:false});
  assert.deepEqual(flanking('）',' '),{left:false,right:true});
  assert.deepEqual(flanking('　','中'),{left:true,right:false});
});

// CommonMark emphasis examples and everyday Markdown without CJK.
const latin=['*foo bar*','a * foo bar*','a*"foo"*','* a *','foo*bar*','5*6*78','_foo bar_','**foo bar**','** foo bar**','a**"foo"**','foo**bar**',
  '*(**foo**)*','**Gomphocarpus (*Gomphocarpus physocarpus*, syn. *Asclepias physocarpa*)**','*foo**bar**baz*','***foo** bar*','*foo **bar***',
  'foo***bar***baz','foo******bar*********baz','*foo [bar](/url)*','**foo*','*foo**','***foo***','_____foo_____','*foo _bar* baz_','*[bar*](/url)',
  '**a<http://foo.bar/?q=**>','*a `*`*','**foo "*bar*" foo**','*foo*bar','**foo**bar','*(*foo*)*','**(**foo)','__foo, __bar__, baz__',
  'foo *\\**','foo **\\***','*foo`*`','**Note:** run `npm test` first.','Use *emphasis*, **strong** and ***both***.','~~gone~~ *still*','a ~*b*~ c',
  '***a**b*','*a**b***','**a*b*c**','2 * 3 * 4 = 24','list: *one*, *two*; **three**.'];

test('text without CJK renders exactly as marked does',()=>{
  for(const source of latin)assert.equal(cjk.parseInline(source),plain.parseInline(source),source);
});

test('the scan reproduces marked when the CJK rule is off',()=>{
  for(const source of latin)assert.equal(replica.parseInline(source),plain.parseInline(source),source);
  // Random strings over the characters that matter for emphasis, with a fixed seed.
  const alphabet=['*','*','*','_','a','b',' ',' ','(',')','.','`','[',']','~','"','中','（','）','：','\\'];
  let seed=20261103;const random=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  for(let n=0;n<4000;n++){
    let source='';const size=1+Math.floor(random()*22);
    for(let i=0;i<size;i++)source+=alphabet[Math.floor(random()*alphabet.length)];
    assert.equal(replica.parseInline(source),plain.parseInline(source),JSON.stringify(source));
  }
});

test('the CJK rule never throws and keeps CJK-free random text unchanged',()=>{
  const alphabet=['*','*','*','_',' ','a','中','文','（','）','“','”','：','。','!','`','~','　'];
  let seed=7;const random=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  for(let n=0;n<4000;n++){
    let source='';const size=1+Math.floor(random()*22);
    for(let i=0;i<size;i++)source+=alphabet[Math.floor(random()*alphabet.length)];
    const html=cjk.parseInline(source);
    assert.equal(typeof html,'string');
    if(![...source].some(c=>/[　-〿一-鿿＀-￯“”]/u.test(c)))assert.equal(html,plain.parseInline(source),JSON.stringify(source));
  }
});
