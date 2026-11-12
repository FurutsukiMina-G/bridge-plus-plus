import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDecision} from '../src/decision.mjs';
import {compatibleDsml} from '../src/dsml-compat.mjs';
// Literal fixtures copied from Qoder dsml-closers.test.ts. Existing parser gaps stay explicit.
const corpus=[
  [
    "loose parameter and invoke closers",
    "<｜｜DSML｜｜ calls>\n<｜｜DSML｜｜ invoke name=\"read\">\n<｜｜DSML｜｜ parameter name=\"file_path\" string=\"true\">D:\\some dir\\a.ts</parameter>\n<｜｜DSML｜｜ parameter name=\"offset\" string=\"false\">1</parameter>\n<｜｜DSML｜｜ parameter name=\"limit\" string=\"false\">130</parameter>\n</｜｜DSML｜｜ parameter>\n<｜｜DSML｜｜ invoke>\n<｜｜DSML｜｜ invoke name=\"read\">\n<｜｜DSML｜｜ parameter name=\"file_path\" string=\"true\">D:\\some dir\\a.ts</parameter>\n<｜｜DSML｜｜ parameter name=\"offset\" string=\"false\">270</parameter>\n<｜｜DSML｜｜ parameter name=\"limit\" string=\"false\">120</parameter>\n</｜｜DSML｜｜ parameter>\n<｜｜DSML｜｜ invoke>\n</｜｜DSML｜｜ calls>"
  ],
  [
    "parameter-only short closer",
    "<｜｜DSML｜｜ calls>\n<｜｜DSML｜｜ invoke name=\"read\">\n<｜｜DSML｜｜ parameter name=\"file_path\" string=\"true\">D:\\some dir\\a.ts</parameter>\n<｜｜DSML｜｜ parameter name=\"offset\" string=\"false\">1</parameter>\n<｜｜DSML｜｜ parameter name=\"limit\" string=\"false\">130</parameter>\n</｜｜DSML｜｜ parameter>\n<｜｜DSML｜｜ invoke>\n<｜｜DSML｜｜ invoke name=\"read\">\n<｜｜DSML｜｜ parameter name=\"file_path\" string=\"true\">D:\\some dir\\a.ts</parameter>\n<｜｜DSML｜｜ parameter name=\"offset\" string=\"false\">270</parameter>\n<｜｜DSML｜｜ parameter name=\"limit\" string=\"false\">120</parameter>\n</｜｜DSML｜｜ parameter>\n<｜｜DSML｜｜ invoke>\n</｜｜DSML｜｜ calls>"
  ],
  [
    "invalid numeric JSON",
    "<｜｜DSML｜｜ calls>\n<｜｜DSML｜｜ invoke name=\"read\">\n<｜｜DSML｜｜ parameter name=\"file_path\" string=\"true\">D:\\some dir\\a.ts</parameter>\n<｜｜DSML｜｜ parameter name=\"offset\" string=\"false\">130px</parameter>\n<｜｜DSML｜｜ parameter name=\"limit\" string=\"false\">130</parameter>\n</｜｜DSML｜｜ parameter>\n<｜｜DSML｜｜ invoke>\n<｜｜DSML｜｜ invoke name=\"read\">\n<｜｜DSML｜｜ parameter name=\"file_path\" string=\"true\">D:\\some dir\\a.ts</parameter>\n<｜｜DSML｜｜ parameter name=\"offset\" string=\"false\">270</parameter>\n<｜｜DSML｜｜ parameter name=\"limit\" string=\"false\">120</parameter>\n</｜｜DSML｜｜ parameter>\n<｜｜DSML｜｜ invoke>\n</｜｜DSML｜｜ calls>"
  ],
  [
    "undeclared tool",
    "<｜｜DSML｜｜ calls>\n<｜｜DSML｜｜ invoke name=\"unknown_tool\">\n<｜｜DSML｜｜ parameter name=\"file_path\" string=\"true\">D:\\some dir\\a.ts</parameter>\n<｜｜DSML｜｜ parameter name=\"offset\" string=\"false\">1</parameter>\n<｜｜DSML｜｜ parameter name=\"limit\" string=\"false\">130</parameter>\n</｜｜DSML｜｜ parameter>\n<｜｜DSML｜｜ invoke>\n<｜｜DSML｜｜ invoke name=\"read\">\n<｜｜DSML｜｜ parameter name=\"file_path\" string=\"true\">D:\\some dir\\a.ts</parameter>\n<｜｜DSML｜｜ parameter name=\"offset\" string=\"false\">270</parameter>\n<｜｜DSML｜｜ parameter name=\"limit\" string=\"false\">120</parameter>\n</｜｜DSML｜｜ parameter>\n<｜｜DSML｜｜ invoke>\n</｜｜DSML｜｜ calls>"
  ],
  [
    "unclosed root",
    "<｜｜DSML｜｜ calls>\n<｜｜DSML｜｜ invoke name=\"read\">\n<｜｜DSML｜｜ parameter name=\"file_path\" string=\"true\">D:\\some dir\\a.ts</parameter>\n<｜｜DSML｜｜ parameter name=\"offset\" string=\"false\">1</parameter>\n<｜｜DSML｜｜ parameter name=\"limit\" string=\"false\">130</parameter>\n</｜｜DSML｜｜ parameter>\n<｜｜DSML｜｜ invoke>\n<｜｜DSML｜｜ invoke name=\"read\">\n<｜｜DSML｜｜ parameter name=\"file_path\" string=\"true\">D:\\some dir\\a.ts</parameter>\n<｜｜DSML｜｜ parameter name=\"offset\" string=\"false\">270</parameter>\n<｜｜DSML｜｜ parameter name=\"limit\" string=\"false\">120</parameter>\n</｜｜DSML｜｜ parameter>\n<｜｜DSML｜｜ invoke>\n</｜｜DSML｜｜ calls>"
  ]
];
const body={tools:[{type:'function',function:{name:'read',parameters:{type:'object',properties:{file_path:{type:'string'},offset:{type:'number'},limit:{type:'number'}},required:['file_path'],additionalProperties:false}}}]};
for(const [name,source]of corpus)test('Qoder DSML corpus: '+name+' is rejected by the existing WorkBuddy grammar',()=>{
  assert.throws(()=>compatibleDsml(source));assert.throws(()=>parseDecision(source,body));
});
test('Qoder canonical typed DSML remains accepted without altering the JSON parser',()=>{
 const source='<｜｜DSML｜｜ calls><｜｜DSML｜｜ invoke name="read"><｜｜DSML｜｜ parameter name="file_path" string="true">D:/some dir/a.ts</｜｜DSML｜｜ parameter><｜｜DSML｜｜ parameter name="offset" string="false">1</｜｜DSML｜｜ parameter></｜｜DSML｜｜ invoke></｜｜DSML｜｜ calls>';
 assert.deepEqual(parseDecision(source,body).calls,[{name:'read',arguments:{file_path:'D:/some dir/a.ts',offset:1}}]);
});
test('Qoder extra-angle edit fixture is an explicit existing compatibility gap',()=>{
 const source='<｜｜DSML｜｜ calls><｜｜DSML｜｜ invoke name="edit"><｜｜DSML｜｜ parameter name="file_path">D:/a.ts</｜｜DSML｜｜ parameter><｜｜DSML｜｜> parameter name="new_string">new text</｜｜DSML｜｜> parameter></｜｜DSML｜｜> invoke><｜｜DSML｜｜ calls>';
 assert.throws(()=>compatibleDsml(source));
});
