// node_modules/marked/lib/marked.esm.js
function B() {
  return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
}
var y = B();
function V(a3) {
  y = a3;
}
var M = { exec: () => null };
function D(a3) {
  let e = [];
  return (t) => {
    let n = Math.max(0, Math.min(3, t - 1)), i2 = e[n];
    return i2 || (i2 = a3(n), e[n] = i2), i2;
  };
}
function h(a3, e = "") {
  let t = typeof a3 == "string" ? a3 : a3.source, n = { replace: (i2, r) => {
    let o = typeof r == "string" ? r : r.source;
    return o = o.replace(x.caret, "$1"), t = t.replace(i2, o), n;
  }, getRegex: () => new RegExp(t, e) };
  return n;
}
var ze = ((a3 = "") => {
  try {
    return !!new RegExp("(?<=1)(?<!1)" + a3);
  } catch {
    return false;
  }
})();
var x = { codeRemoveIndent: /^(?: {0,3}\t| {1,4})/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, endingSpaceTabChar: /[ \t]$/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, leadingSpaceTab: /^[ \t]+/, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] +\S/, listReplaceTask: /^\[[ xX]\] +/, listTaskCheckbox: /\[[ xX]\]/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, numericCharacterReference: /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));/, numericCharacterReferenceOrAmpersand: /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (a3) => new RegExp(`^( {0,3}${a3})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: D((a3) => new RegExp(`^ {0,${a3}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)), hrRegex: D((a3) => new RegExp(`^ {0,${a3}}((?:-[ 	]*){3,}|(?:_[ 	]*){3,}|(?:\\*[ 	]*){3,})(?:\\n+|$)`)), fencesBeginRegex: D((a3) => new RegExp(`^ {0,${a3}}(?:\`\`\`|~~~)`)), headingBeginRegex: D((a3) => new RegExp(`^ {0,${a3}}#`)), htmlBeginRegex: D((a3) => new RegExp(`^ {0,${a3}}(?:</?(?:${Q})(?: +|$|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)`, "i")), blockquoteBeginRegex: D((a3) => new RegExp(`^ {0,${a3}}>`)) };
var Ee = /^(?:[ \t]*(?:\n|$))+/;
var Me = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
var Ce = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
var N = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
var Ie = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
var Y = / {0,3}(?:[*+-]|\d{1,9}[.)])/;
var fe = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |fences|blockquote|heading|hr|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
var me = h(fe).replace(/bull/g, Y).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/hr/g, / {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
var Be = h(fe).replace(/bull/g, Y).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/hr/g, / {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
var ee = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/;
var De = /^[^\n]+/;
var te = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
var qe = h(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", te).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
var Ze = h(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g, Y).getRegex();
var Q = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
var ne = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
var ve = h("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!(?:script|pre|style|textarea)(?![a-z0-9-]))([a-z][a-z0-9-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</[a-z][a-z0-9-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", ne).replace("tag", Q).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
var xe = (a3) => h(ee).replace("hr", N).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", a3).replace("html", " {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)").replace("tag", Q).getRegex();
var He = xe(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/);
var Ge = xe(/ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]|\n|$)/);
var Ne = h(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", Ge).getRegex();
var re = { blockquote: Ne, code: Me, def: qe, fences: Ce, heading: Ie, hr: N, html: ve, lheading: me, list: Ze, newline: Ee, paragraph: He, table: M, text: De };
var de = h("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", N).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", " {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)").replace("tag", Q).getRegex();
var Qe = { ...re, lheading: Be, table: de, paragraph: h(ee).replace("hr", N).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", de).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html", " {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)").replace("tag", Q).getRegex() };
var je = { ...re, html: h(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", ne).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: M, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: h(ee).replace("hr", N).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", me).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() };
var Fe = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
var Ue = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
var be = /^( {2,}|\\)\n(?!\s*$)[ \t]*/;
var Ke = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
var S = /[\p{P}\p{S}]/u;
var q = /[\s\p{P}\p{S}]/u;
var j = /[^\s\p{P}\p{S}]/u;
var Xe = h(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, q).getRegex();
var We = /[\p{Pi}\p{Ps}"']/u;
var Re = /(?!~)[\p{P}\p{S}]/u;
var Ve = /(?!~)[\s\p{P}\p{S}]/u;
var Je = /(?:[^\s\p{P}\p{S}]|~)/u;
var Ye = h(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", ze ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
var Te = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/;
var et = h(Te, "u").replace(/punct/g, S).getRegex();
var tt = h(Te, "u").replace(/punct/g, Re).getRegex();
var nt = /^(?:\*+(?:((?!\*)(?!openQuote)punct)|([^\s*]))?)|^_+(?:((?!_)(?!openQuote)punct)|([^\s_]))?/;
var rt = h(nt, "u").replace(/openQuote/g, We).replace(/punct/g, S).getRegex();
var Oe = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
var st = h(Oe, "gu").replace(/notPunctSpace/g, j).replace(/punctSpace/g, q).replace(/punct/g, S).getRegex();
var it = h(Oe, "gu").replace(/notPunctSpace/g, Je).replace(/punctSpace/g, Ve).replace(/punct/g, Re).getRegex();
var ot = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)[\\s](\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|(?:(?!\\*)punct|notPunctSpace)(\\*+)(?!\\*)(?=notPunctSpace)";
var at = h(ot, "gu").replace(/notPunctSpace/g, j).replace(/punctSpace/g, q).replace(/punct/g, S).getRegex();
var lt = h("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, j).replace(/punctSpace/g, q).replace(/punct/g, S).getRegex();
var ut = "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)[\\s](_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)|(?:(?!_)punct|notPunctSpace)(_+)(?!_)(?=notPunctSpace)";
var pt = h(ut, "gu").replace(/notPunctSpace/g, j).replace(/punctSpace/g, q).replace(/punct/g, S).getRegex();
var ct = h(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, S).getRegex();
var ht = "^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)";
var dt = h(ht, "gu").replace(/notPunctSpace/g, j).replace(/punctSpace/g, q).replace(/punct/g, S).getRegex();
var kt = h(/\\(punct)/, "gu").replace(/punct/g, S).getRegex();
var gt = h(/(`+)(?:[^`]|[^`][\s\S]*?[^`])\1(?!`)|`+|\\(punct)/, "gu").replace(/punct/g, S).getRegex();
var ft = h(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
var mt = h(ne).replace("(?:-->|$)", "-->").getRegex();
var xt = h("^comment|^</[a-zA-Z][a-zA-Z0-9-]*\\s*>|^<[a-zA-Z][a-zA-Z0-9-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", mt).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
var we = /\[(?:\\[\s\S]|[^\[\]\\])*\]/;
var K = h(/(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/).replace("brackets", we).getRegex();
var bt = h(/^!?\[(label)\]\([ \t\n]*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?[ \t\n]*\)/).replace("label", K).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
var Rt = h(/^!?\[(label)\]\[(ref)\]/).replace("label", K).replace("ref", te).getRegex();
var Tt = h(/^!?\[(ref)\](?:\[\])?/).replace("ref", te).getRegex();
var ke = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\]){1,999}/;
var Ot = h(/(?:[^\[\]\\`]*(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\]))){0,999}?[^\[\]\\`]*?/).replace("brackets", we).getRegex();
var wt = h("reflink|nolink(?!\\()", "g").replace("reflink", h(/^!?\[(label)\]\[(ref)\]/).replace("label", Ot).replace("ref", ke).getRegex()).replace("nolink", h(/^!?\[(ref)\](?:\[\])?/).replace("ref", ke).getRegex()).getRegex();
var ge = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
var Pt = /[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/;
var yt = h(/(?:mailto:email|xmpp:email(?:\/[A-Za-z0-9@.]+)?)/).replace(/email/g, Pt).getRegex();
var se = { _backpedal: M, anyPunctuation: kt, anyPunctuationOutsideCode: gt, autolink: ft, blockSkip: Ye, br: be, code: Ue, del: M, delLDelim: M, delRDelim: M, emStrongLDelim: et, emStrongRDelimAst: st, emStrongRDelimUnd: lt, escape: Fe, link: bt, nolink: Tt, punctuation: Xe, reflink: Rt, reflinkSearch: wt, tag: xt, text: Ke, url: M };
var St = { ...se, emStrongLDelim: rt, emStrongRDelimAst: at, emStrongRDelimUnd: pt, link: h(/^!?\[(label)\]\((.*?)\)/).replace("label", K).getRegex(), reflink: h(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", K).getRegex() };
var J = { ...se, emStrongRDelimAst: it, emStrongLDelim: tt, delLDelim: ct, delRDelim: dt, url: h(/^emailProtocol|^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("emailProtocol", yt).replace("protocol", ge).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: h(/^(?:[^a-zA-Z0-9](?=emailProtocol)|(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9](?=emailProtocol)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))))/).replace("protocol", ge).replace(/emailProtocol/g, /(?:mailto|xmpp):/).getRegex() };
var _t = { ...J, br: h(be).replace("{2,}", "*").getRegex(), text: h(J.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() };
var F = { normal: re, gfm: Qe, pedantic: je };
var Z = { normal: se, gfm: J, breaks: _t, pedantic: St };
var $t = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
var Pe = (a3) => $t[a3];
function w(a3, e) {
  if (e) {
    if (x.escapeTest.test(a3)) return a3.replace(x.escapeReplace, Pe);
  } else if (x.escapeTestNoEncode.test(a3)) return a3.replace(x.escapeReplaceNoEncode, Pe);
  return a3;
}
function ye(a3) {
  return x.numericCharacterReference.test(a3) ? a3.replace(x.numericCharacterReferenceOrAmpersand, (e, t, n) => {
    if (t === void 0 && n === void 0) return "&amp;";
    let i2 = t === void 0 ? Number.parseInt(n, 16) : Number.parseInt(t, 10);
    return i2 === 0 || i2 > 1114111 || i2 >= 55296 && i2 <= 57343 ? "\uFFFD" : i2 === 38 ? "&amp;" : String.fromCodePoint(i2);
  }) : a3;
}
function ie(a3) {
  try {
    a3 = encodeURI(a3).replace(x.percentDecode, "%");
  } catch {
    return null;
  }
  return a3;
}
function oe(a3, e) {
  let t = a3.replace(x.findPipe, (r, o, s) => {
    let l = false, u = o;
    for (; --u >= 0 && s[u] === "\\"; ) l = !l;
    return l ? "|" : " |";
  }), n = t.split(x.splitPipe), i2 = 0;
  if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e) if (n.length > e) n.splice(e);
  else for (; n.length < e; ) n.push("");
  for (; i2 < n.length; i2++) n[i2] = n[i2].trim().replace(x.slashPipe, "|");
  return n;
}
function A(a3, e, t) {
  let n = a3.length;
  if (n === 0) return "";
  let i2 = 0;
  for (; i2 < n; ) {
    let r = a3.charAt(n - i2 - 1);
    if (r === e && !t) i2++;
    else if (r !== e && t) i2++;
    else break;
  }
  return a3.slice(0, n - i2);
}
function ae(a3) {
  let e = a3.split(`
`), t = e.length - 1;
  for (; t >= 0 && x.blankLine.test(e[t]); ) t--;
  return e.length - t <= 2 ? a3 : e.slice(0, t + 1).join(`
`);
}
function v(a3) {
  return a3.trim().toLowerCase().toUpperCase().toLowerCase();
}
function le(a3, e) {
  if (a3.indexOf(e[0]) === -1 && a3.indexOf(e[1]) === -1) return -1;
  let t = 0;
  for (let n = 0; n < a3.length; n++) if (a3[n] === "\\") n++;
  else if (a3[n] === e[0]) t++;
  else if (a3[n] === e[1] && (t--, t < 0)) return n;
  return t > 0 ? -2 : -1;
}
function X(a3, e = 0) {
  let t = e, n = "";
  for (let i2 of a3) if (i2 === "	") {
    let r = 4 - t % 4;
    n += " ".repeat(r), t += r;
  } else n += i2, t++;
  return n;
}
function Se(a3, e, t, n, i2) {
  let r = e.href, o = e.title || null, s = a3[1].replace(i2.other.outputLinkReplace, "$1"), l = a3[0].charAt(0) === "!", u = n.state.inLink, c = n.state.linkEmitted, p = n.state.inRawBlock;
  n.state.inLink = true, n.state.linkEmitted = false;
  let d = n.inlineTokens(s), g = n.state.linkEmitted;
  if (n.state.linkEmitted = c, n.state.inLink = u, !l) {
    if (g) {
      n.state.inRawBlock = p;
      return;
    }
    n.state.linkEmitted = true;
  }
  return { type: l ? "image" : "link", raw: t, href: r, title: o, text: s, tokens: d };
}
function Lt(a3, e, t) {
  let n = a3.match(t.other.indentCodeCompensation);
  if (n === null) return e;
  let i2 = n[1];
  return e.split(`
`).map((r) => {
    let o = r.match(t.other.beginningSpace);
    if (o === null) return r;
    let [s] = o;
    return r.slice(Math.min(s.length, i2.length));
  }).join(`
`);
}
function _e(a3, e, t, n) {
  if (!e.includes("<")) return false;
  for (let i2 = 0; i2 < e.length; i2++) {
    if (e[i2] === "\\") {
      i2++;
      continue;
    }
    if (e[i2] === "`") {
      let s = n.inline.code.exec(e.slice(i2));
      if (s) {
        i2 += s[0].length - 1;
        continue;
      }
    }
    if (e[i2] !== "<") continue;
    let r = a3.slice(t + i2), o = n.inline.tag.exec(r) || n.inline.autolink.exec(r);
    if (o) {
      if (o[0].length > e.length - i2) return true;
      i2 += o[0].length - 1;
    }
  }
  return false;
}
var _ = class {
  options;
  rules;
  lexer;
  constructor(e) {
    this.options = e || y;
  }
  space(e) {
    let t = this.rules.block.newline.exec(e);
    if (t && t[0].length > 0) return { type: "space", raw: t[0] };
  }
  code(e) {
    let t = this.rules.block.code.exec(e);
    if (t) {
      let n = this.options.pedantic ? t[0] : ae(t[0]), i2 = n.replace(this.rules.other.codeRemoveIndent, "");
      return { type: "code", raw: n, codeBlockStyle: "indented", text: i2 };
    }
  }
  fences(e) {
    let t = this.rules.block.fences.exec(e);
    if (t) {
      let n = t[0], i2 = Lt(n, t[3] || "", this.rules);
      return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: i2 };
    }
  }
  heading(e) {
    let t = this.rules.block.heading.exec(e);
    if (t) {
      let n = t[2].trim();
      if (this.rules.other.endingHash.test(n)) {
        let i2 = A(n, "#");
        (this.options.pedantic || !i2 || this.rules.other.endingSpaceTabChar.test(i2)) && (n = i2.trim());
      }
      return { type: "heading", raw: A(t[0], `
`), depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
    }
  }
  hr(e) {
    let t = this.rules.block.hr.exec(e);
    if (t) return { type: "hr", raw: A(t[0], `
`) };
  }
  blockquote(e) {
    let t = this.rules.block.blockquote.exec(e);
    if (t) {
      let n = A(t[0], `
`).split(`
`), i2 = "", r = "", o = [];
      for (; n.length > 0; ) {
        let s = false, l = [], u;
        for (u = 0; u < n.length; u++) if (this.rules.other.blockquoteStart.test(n[u])) l.push(n[u]), s = true;
        else if (!s) l.push(n[u]);
        else break;
        n = n.slice(u);
        let c = l.join(`
`), p = c.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        i2 = i2 ? `${i2}
${c}` : c, r = r ? `${r}
${p}` : p;
        let d = this.lexer.state.top;
        if (this.lexer.state.top = true, this.lexer.blockTokens(p, o, true), this.lexer.state.top = d, n.length === 0) break;
        let g = o.at(-1);
        if (g?.type === "code" || g?.type === "heading" || g?.type === "hr" || g?.type === "html") break;
        if (g?.type === "blockquote") {
          let k = g, P = n.join(`
`), R = k.raw + `
` + P.replace(this.rules.other.blockquoteSetextReplace2, ""), m = this.blockquote(R);
          o[o.length - 1] = m;
          let E = R.substring(m.raw.length).replace(/^\n/, ""), b = E ? E.split(`
`).length : 0, H = b ? n.slice(0, -b) : n;
          H.length > 0 && (i2 = `${i2}
${H.join(`
`)}`), r = r.substring(0, r.length - k.text.length) + m.text;
          break;
        } else if (g?.type === "list") {
          let k = g, P = k.raw + `
` + n.join(`
`), R = this.list(P);
          o[o.length - 1] = R, i2 = i2.substring(0, i2.length - g.raw.length) + R.raw, r = r.substring(0, r.length - k.raw.length) + R.raw, n = P.substring(o.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return { type: "blockquote", raw: i2, tokens: o, text: r };
    }
  }
  list(e) {
    let t = this.rules.block.list.exec(e);
    if (t) {
      let n = e, i2 = () => n.length - e.length, r = t[1].trim(), o = r.length > 1, s = { type: "list", raw: "", ordered: o, start: o ? +r.slice(0, -1) : "", loose: false, items: [] };
      r = o ? `\\d{1,9}\\${r.slice(-1)}` : `\\${r}`, this.options.pedantic && (r = o ? r : "[*+-]");
      let l = this.rules.other.listItemRegex(r), u = false;
      for (; e; ) {
        let p = false, d = "";
        if (!(t = l.exec(e)) || this.rules.block.hr.test(e)) break;
        let g = i2();
        e = e.substring(t[0].length);
        let k = t[2].split(`
`, 1)[0], P = t[1].length, R = this.options.pedantic ? X(k, P) : k.replace(this.rules.other.leadingSpaceTab, (W) => X(W, P)), m = e.split(`
`, 1)[0], E = !R.trim(), b = 0;
        if (this.options.pedantic ? (b = 2, d = R.trimStart()) : E ? b = P + 1 : (b = R.search(this.rules.other.nonSpaceChar), b = b > 4 ? 1 : b, d = R.slice(b), b += P), E && this.rules.other.blankLine.test(m) && (e = e.substring(m.length + 1), p = true), !p) {
          let W = this.rules.other.nextBulletRegex(b), ue = this.rules.other.hrRegex(b), pe = this.rules.other.fencesBeginRegex(b), ce = this.rules.other.headingBeginRegex(b), $e = this.rules.other.htmlBeginRegex(b), Le = this.rules.other.blockquoteBeginRegex(b);
          for (; e; ) {
            let he = e.split(`
`, 1)[0], G;
            if (m = he, this.options.pedantic ? (m = m.replace(this.rules.other.listReplaceNesting, "  "), G = m) : G = m.replace(this.rules.other.leadingSpaceTab, (Ae) => X(Ae)), pe.test(m) || ce.test(m) || $e.test(m) || Le.test(m) || W.test(m) || ue.test(m)) break;
            if (G.search(this.rules.other.nonSpaceChar) >= b || !m.trim()) d += `
` + G.slice(b);
            else {
              if (E || R.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || pe.test(R) || ce.test(R) || ue.test(R)) break;
              d += `
` + m;
            }
            E = !m.trim(), e = e.substring(he.length + 1), R = G.slice(b);
          }
        }
        let H = n.slice(g, i2());
        s.loose || (u ? s.loose = true : this.rules.other.doubleBlankLine.test(H) && (u = true)), s.items.push({ type: "list_item", raw: H, task: !!this.options.gfm && this.rules.other.listIsTask.test(d), loose: false, text: d, tokens: [] });
      }
      let c = s.items.at(-1);
      if (c) c.raw = c.raw.trimEnd(), c.text = c.text.trimEnd();
      else return;
      s.raw = n.slice(0, i2()).trimEnd();
      for (let p of s.items) if (this.lexer.state.top = false, p.tokens = this.lexer.blockTokens(p.text, []), !s.loose) {
        let d = p.tokens.filter((k) => k.type === "space"), g = d.length > 0 && d.some((k) => this.rules.other.anyLine.test(k.raw));
        s.loose = g;
      }
      for (let p of s.items) {
        let d = p.tokens[0];
        if (p.task && (d?.type === "text" || d?.type === "paragraph")) {
          p.text = p.text.replace(this.rules.other.listReplaceTask, ""), d.raw = d.raw.replace(this.rules.other.listReplaceTask, ""), d.text = d.text.replace(this.rules.other.listReplaceTask, "");
          for (let k = this.lexer.inlineQueue.length - 1; k >= 0; k--) if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[k].src)) {
            this.lexer.inlineQueue[k].src = this.lexer.inlineQueue[k].src.replace(this.rules.other.listReplaceTask, "");
            break;
          }
          let g = this.rules.other.listTaskCheckbox.exec(p.raw);
          if (g) {
            let k = { type: "checkbox", raw: g[0] + " ", checked: g[0] !== "[ ]" };
            p.checked = k.checked, s.loose ? p.tokens[0] && ["paragraph", "text"].includes(p.tokens[0].type) && "tokens" in p.tokens[0] && p.tokens[0].tokens ? (p.tokens[0].raw = k.raw + p.tokens[0].raw, p.tokens[0].text = k.raw + p.tokens[0].text, p.tokens[0].tokens.unshift(k)) : p.tokens.unshift({ type: "paragraph", raw: k.raw, text: k.raw, tokens: [k] }) : p.tokens.unshift(k);
          }
        } else p.task && (p.task = false);
      }
      if (s.loose) for (let p of s.items) {
        p.loose = true;
        for (let d of p.tokens) d.type === "text" && (d.type = "paragraph");
      }
      return s;
    }
  }
  html(e) {
    let t = this.rules.block.html.exec(e);
    if (t) {
      let n = ae(t[0]);
      return { type: "html", block: true, raw: n, pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: n };
    }
  }
  def(e) {
    let t = this.rules.block.def.exec(e);
    if (t) {
      if (!this.rules.other.startAngleBracket.test(t[2]) && le(t[2], "()") !== -1) return;
      let n = v(t[1]).replace(this.rules.other.multipleSpaceGlobal, " "), i2 = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", r = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
      return { type: "def", tag: n, raw: A(t[0], `
`), href: i2, title: r };
    }
  }
  table(e) {
    let t = this.rules.block.table.exec(e);
    if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
    let n = oe(t[1]), i2 = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), r = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], o = { type: "table", raw: A(t[0], `
`), header: [], align: [], rows: [] };
    if (n.length === i2.length) {
      for (let s of i2) this.rules.other.tableAlignRight.test(s) ? o.align.push("right") : this.rules.other.tableAlignCenter.test(s) ? o.align.push("center") : this.rules.other.tableAlignLeft.test(s) ? o.align.push("left") : o.align.push(null);
      for (let s = 0; s < n.length; s++) o.header.push({ text: n[s], tokens: this.lexer.inline(n[s]), header: true, align: o.align[s] });
      for (let s of r) o.rows.push(oe(s, o.header.length).map((l, u) => ({ text: l, tokens: this.lexer.inline(l), header: false, align: o.align[u] })));
      return o;
    }
  }
  lheading(e) {
    let t = this.rules.block.lheading.exec(e);
    if (t) {
      let n = t[1].trim();
      return { type: "heading", raw: A(t[0], `
`), depth: t[2].charAt(0) === "=" ? 1 : 2, text: n, tokens: this.lexer.inline(n) };
    }
  }
  paragraph(e) {
    let t = this.rules.block.paragraph.exec(e);
    if (t) {
      let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
      return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
    }
  }
  text(e) {
    let t = this.rules.block.text.exec(e);
    if (t) return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
  }
  escape(e) {
    let t = this.rules.inline.escape.exec(e);
    if (t) return { type: "escape", raw: t[0], text: t[1] };
  }
  tag(e) {
    let t = this.rules.inline.tag.exec(e);
    if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = false), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
  }
  link(e) {
    if (this.lexer.state.linkParenPossible === false) return;
    let t = this.rules.inline.link.exec(e);
    if (t) {
      let n = t[0].charAt(0) === "!" ? 2 : 1;
      if (!this.options.pedantic && _e(e, t[1], n, this.rules)) return;
      let i2 = t[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(i2)) {
        if (!this.rules.other.endAngleBracket.test(i2)) return;
        let s = A(i2.slice(0, -1), "\\");
        if ((i2.length - s.length) % 2 === 0) return;
      } else {
        let s = le(t[2], "()");
        if (s === -2) return;
        if (s > -1) {
          let u = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + s;
          t[2] = t[2].substring(0, s), t[0] = t[0].substring(0, u).trim(), t[3] = "";
        }
      }
      let r = t[2], o = "";
      if (this.options.pedantic) {
        let s = this.rules.other.pedanticHrefTitle.exec(r);
        s && (r = s[1], o = s[3]);
      } else o = t[3] ? t[3].slice(1, -1) : "";
      return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(i2) ? r = r.slice(1) : r = r.slice(1, -1)), Se(t, { href: r && r.replace(this.rules.inline.anyPunctuation, "$1"), title: o && o.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
    }
  }
  reflink(e, t) {
    let n;
    if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
      let i2 = n[0].charAt(0) === "!" ? 2 : 1;
      if (!this.options.pedantic && _e(e, n[1], i2, this.rules)) return;
      let r = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), o = t[v(r)];
      if (!o) {
        let s = n[0].charAt(0);
        return { type: "text", raw: s, text: s };
      }
      return Se(n, o, n[0], this.lexer, this.rules);
    }
  }
  emStrong(e, t, n = "") {
    let i2 = this.rules.inline.emStrongLDelim.exec(e);
    if (!i2 || !i2[1] && !i2[2] && !i2[3] && !i2[4] || i2[4] && n.match(this.rules.other.unicodeAlphaNumeric)) return;
    if (!(i2[1] || i2[3] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let o = [...i2[0]].length - 1, s, l, u = o, c = 0, p = i2[0][0], d = n === p, g = p === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (g.lastIndex = 0, t = t.slice(-1 * e.length + o); (i2 = g.exec(t)) !== null; ) {
        if (s = i2[1] || i2[2] || i2[3] || i2[4] || i2[5] || i2[6], !s) continue;
        if (l = [...s].length, i2[3] || i2[4]) {
          u += l;
          continue;
        } else if (i2[5] || i2[6]) {
          if (o % 3 && !((o + l) % 3)) {
            c += l;
            continue;
          }
          if (d) break;
        }
        if (u -= l, u > 0) continue;
        l = Math.min(l, l + u + c);
        let k = [...i2[0]][0].length, P = e.slice(0, o + i2.index + k + l);
        if (Math.min(o, l) % 2) {
          let m = P.slice(1, -1);
          return { type: "em", raw: P, text: m, tokens: this.lexer.inlineTokens(m) };
        }
        let R = P.slice(2, -2);
        return { type: "strong", raw: P, text: R, tokens: this.lexer.inlineTokens(R) };
      }
    }
  }
  codespan(e) {
    let t = this.rules.inline.code.exec(e);
    if (t) {
      let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), i2 = this.rules.other.nonSpaceChar.test(n), r = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
      return i2 && r && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
    }
  }
  br(e) {
    let t = this.rules.inline.br.exec(e);
    if (t) return { type: "br", raw: t[0] };
  }
  del(e, t, n = "") {
    let i2 = this.rules.inline.delLDelim.exec(e);
    if (!i2) return;
    if (!(i2[1] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let o = [...i2[0]].length - 1, s, l, u = o, c = this.rules.inline.delRDelim;
      for (c.lastIndex = 0, t = t.slice(-1 * e.length + o); (i2 = c.exec(t)) !== null; ) {
        if (s = i2[1] || i2[2] || i2[3] || i2[4] || i2[5] || i2[6], !s || (l = [...s].length, l !== o)) continue;
        if (i2[3] || i2[4]) {
          u += l;
          continue;
        }
        if (u -= l, u > 0) continue;
        l = Math.min(l, l + u);
        let p = [...i2[0]][0].length, d = e.slice(0, o + i2.index + p + l), g = d.slice(o, -o);
        return { type: "del", raw: d, text: g, tokens: this.lexer.inlineTokens(g) };
      }
    }
  }
  autolink(e) {
    let t = this.rules.inline.autolink.exec(e);
    if (t) {
      let n, i2;
      return t[2] === "@" ? (n = t[1], i2 = "mailto:" + n) : (n = t[1], i2 = n), { type: "link", raw: t[0], text: n, href: i2, autolink: true, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  url(e) {
    let t;
    if (t = this.rules.inline.url.exec(e)) {
      let n, i2;
      if (t[2] === "@") n = t[0], i2 = "mailto:" + n;
      else {
        let r;
        do
          r = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
        while (r !== t[0]);
        n = t[0], t[1] === "www." ? i2 = "http://" + t[0] : i2 = t[0];
      }
      return { type: "link", raw: t[0], text: n, href: i2, autolink: true, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  inlineText(e) {
    let t = this.rules.inline.text.exec(e);
    if (t) {
      let n = this.lexer.state.inRawBlock;
      return { type: "text", raw: t[0], text: n ? t[0] : ye(t[0]), escaped: n };
    }
  }
};
var T = class a {
  tokens;
  options;
  state;
  inlineQueue;
  tokenizer;
  constructor(e) {
    this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e || y, this.options.tokenizer = this.options.tokenizer || new _(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, linkEmitted: false, linkParenPossible: true, top: true };
    let t = { other: x, block: F.normal, inline: Z.normal };
    this.options.pedantic ? (t.block = F.pedantic, t.inline = Z.pedantic) : this.options.gfm && (t.block = F.gfm, this.options.breaks ? t.inline = Z.breaks : t.inline = Z.gfm), this.tokenizer.rules = t;
  }
  static get rules() {
    return { block: F, inline: Z };
  }
  static lex(e, t) {
    return new a(t).lex(e);
  }
  static lexInline(e, t) {
    return new a(t).inlineTokens(e);
  }
  lex(e) {
    e = e.replace(x.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let t = 0; t < this.inlineQueue.length; t++) {
      let n = this.inlineQueue[t];
      this.inlineTokens(n.src, n.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, t = [], n = false) {
    this.tokenizer.lexer = this, this.options.pedantic && (e = e.replace(x.tabCharGlobal, "    ").replace(x.spaceLine, ""));
    let i2 = 1 / 0;
    for (; e; ) {
      if (e.length < i2) i2 = e.length;
      else {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
      let r;
      if (this.options.extensions?.block?.some((s) => (r = s.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), true) : false)) continue;
      if (r = this.tokenizer.space(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        r.raw.length === 1 && s !== void 0 ? s.raw += `
` : t.push(r);
        continue;
      }
      if (r = this.tokenizer.code(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.at(-1).src = s.text) : t.push(r);
        continue;
      }
      if (r = this.tokenizer.fences(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.heading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.hr(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.blockquote(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.list(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.html(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.def(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.raw, this.inlineQueue.at(-1).src = s.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = { href: r.href, title: r.title }, t.push(r));
        continue;
      }
      if (r = this.tokenizer.table(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.lheading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      let o = e;
      if (this.options.extensions?.startBlock) {
        let s = 1 / 0, l = e.slice(1), u;
        this.options.extensions.startBlock.forEach((c) => {
          u = c.call({ lexer: this }, l), typeof u == "number" && u >= 0 && (s = Math.min(s, u));
        }), s < 1 / 0 && s >= 0 && (o = e.substring(0, s + 1));
      }
      if (this.state.top && (r = this.tokenizer.paragraph(o))) {
        let s = t.at(-1);
        n && s?.type === "paragraph" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r), n = o.length !== e.length, e = e.substring(r.raw.length);
        continue;
      }
      if (r = this.tokenizer.text(e)) {
        e = e.substring(r.raw.length);
        let s = t.at(-1);
        s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r);
        continue;
      }
      if (e) {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
    }
    return this.state.top = true, t;
  }
  inline(e, t = []) {
    return this.inlineQueue.push({ src: e, tokens: t }), t;
  }
  linkInText(e) {
    if (!e.includes("[")) return false;
    let t = this.tokenizer.rules.inline.link;
    for (let n of e.matchAll(this.tokenizer.rules.inline.blockSkip)) if (t.test(n[0]) && e.charAt(n.index - 1) !== "!") return true;
    for (let n of e.matchAll(this.tokenizer.rules.inline.reflinkSearch)) {
      let i2 = n[0], r = i2.lastIndexOf("[");
      if (!(i2.charAt(0) === "!" || !Object.hasOwn(this.tokens.links, v(i2.slice(r + 1, -1)))) && !(r > 1 && this.linkInText(i2.slice(1, r - 1)))) return true;
    }
    return false;
  }
  inlineTokens(e, t = []) {
    this.tokenizer.lexer = this;
    let n = this.state.linkParenPossible;
    this.state.linkParenPossible = n && e.includes(")");
    try {
      return this.#e(e, t);
    } finally {
      this.state.linkParenPossible = n;
    }
  }
  #e(e, t) {
    let n = e;
    if (this.tokens.links && e.includes("[")) {
      let s = this.tokenizer.rules.inline.reflinkSearch, l = (u) => {
        let c = u.lastIndexOf("[");
        if (!Object.hasOwn(this.tokens.links, v(u.slice(c + 1, -1)))) return u;
        if (c > 1 && u.charAt(0) !== "!") {
          let p = u.slice(1, c - 1);
          if (this.linkInText(p)) return "[" + p.replace(s, l) + "][" + "a".repeat(u.length - c - 2) + "]";
        }
        return "[" + "a".repeat(u.length - 2) + "]";
      };
      n = n.replace(s, l);
    }
    n = n.replace(this.tokenizer.rules.inline.anyPunctuationOutsideCode, (s, l, u) => u ? "+".repeat(s.length) : l ? l + s.slice(l.length, -l.length).replace(/`/g, "+") + l : s), n = n.replace(this.tokenizer.rules.inline.blockSkip, (s, l, u) => {
      let c = u ? u.length : 0;
      return s.slice(0, c) + "[" + "a".repeat(s.length - c - 2) + "]";
    }), n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
    let i2 = false, r = "", o = 1 / 0;
    for (; e; ) {
      if (e.length < o) o = e.length;
      else {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
      i2 || (r = ""), i2 = false;
      let s;
      if (this.options.extensions?.inline?.some((u) => (s = u.call({ lexer: this }, e, t)) ? (e = e.substring(s.raw.length), t.push(s), true) : false)) continue;
      if (s = this.tokenizer.escape(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.tag(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.link(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.reflink(e, this.tokens.links)) {
        e = e.substring(s.raw.length);
        let u = t.at(-1);
        s.type === "text" && u?.type === "text" ? (u.raw += s.raw, u.text += s.text) : t.push(s);
        continue;
      }
      if (s = this.tokenizer.emStrong(e, n, r)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.codespan(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.br(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.del(e, n, r)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (s = this.tokenizer.autolink(e)) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      if (!this.state.inLink && (s = this.tokenizer.url(e))) {
        e = e.substring(s.raw.length), t.push(s);
        continue;
      }
      let l = e;
      if (this.options.extensions?.startInline) {
        let u = 1 / 0, c = e.slice(1), p;
        this.options.extensions.startInline.forEach((d) => {
          p = d.call({ lexer: this }, c), typeof p == "number" && p >= 0 && (u = Math.min(u, p));
        }), u < 1 / 0 && u >= 0 && (l = e.substring(0, u + 1));
      }
      if (s = this.tokenizer.inlineText(l)) {
        e = e.substring(s.raw.length), s.raw.slice(-1) !== "_" && (r = s.raw.slice(-1)), i2 = true;
        let u = t.at(-1);
        u?.type === "text" ? (u.raw += s.raw, u.text += s.text) : t.push(s);
        continue;
      }
      if (e) {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
    }
    return t;
  }
  infiniteLoopError(e) {
    let t = "Infinite loop on byte: " + e;
    if (this.options.silent) console.error(t);
    else throw new Error(t);
  }
};
var $ = class {
  options;
  parser;
  constructor(e) {
    this.options = e || y;
  }
  space(e) {
    return "";
  }
  code({ text: e, lang: t, escaped: n }) {
    let i2 = (t || "").match(x.notSpaceStart)?.[0], r = e ? e.replace(x.endingNewline, "") + `
` : "";
    return i2 ? '<pre><code class="language-' + w(i2) + '">' + (n ? r : w(r, true)) + `</code></pre>
` : "<pre><code>" + (n ? r : w(r, true)) + `</code></pre>
`;
  }
  blockquote({ tokens: e }) {
    return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
  }
  html({ text: e }) {
    return e;
  }
  def(e) {
    return "";
  }
  heading({ tokens: e, depth: t }) {
    return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
  }
  hr(e) {
    return `<hr>
`;
  }
  list(e) {
    let t = e.ordered, n = e.start, i2 = "";
    for (let s = 0; s < e.items.length; s++) {
      let l = e.items[s];
      i2 += this.listitem(l);
    }
    let r = t ? "ol" : "ul", o = t && n !== 1 ? ' start="' + n + '"' : "";
    return "<" + r + o + `>
` + i2 + "</" + r + `>
`;
  }
  listitem(e) {
    return `<li>${this.parser.parse(e.tokens)}</li>
`;
  }
  checkbox({ checked: e }) {
    return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox"> ';
  }
  paragraph({ tokens: e }) {
    return `<p>${this.parser.parseInline(e)}</p>
`;
  }
  table(e) {
    let t = "", n = "";
    for (let r = 0; r < e.header.length; r++) n += this.tablecell(e.header[r]);
    t += this.tablerow({ text: n });
    let i2 = "";
    for (let r = 0; r < e.rows.length; r++) {
      let o = e.rows[r];
      n = "";
      for (let s = 0; s < o.length; s++) n += this.tablecell(o[s]);
      i2 += this.tablerow({ text: n });
    }
    return i2 && (i2 = `<tbody>${i2}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + i2 + `</table>
`;
  }
  tablerow({ text: e }) {
    return `<tr>
${e}</tr>
`;
  }
  tablecell(e) {
    let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
    return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
  }
  strong({ tokens: e }) {
    return `<strong>${this.parser.parseInline(e)}</strong>`;
  }
  em({ tokens: e }) {
    return `<em>${this.parser.parseInline(e)}</em>`;
  }
  codespan({ text: e }) {
    return `<code>${w(e, true)}</code>`;
  }
  br(e) {
    return "<br>";
  }
  del({ tokens: e }) {
    return `<del>${this.parser.parseInline(e)}</del>`;
  }
  link({ href: e, title: t, text: n, tokens: i2, autolink: r }) {
    let o = r ? w(n, true) : this.parser.parseInline(i2), s = ie(e);
    if (s === null) return o;
    e = w(s, r);
    let l = '<a href="' + e + '"';
    return t && (l += ' title="' + w(t) + '"'), l += ">" + o + "</a>", l;
  }
  image({ href: e, title: t, text: n, tokens: i2 }) {
    i2 && (n = this.parser.parseInline(i2, this.parser.textRenderer));
    let r = ie(e);
    if (r === null) return w(n);
    e = r;
    let o = `<img src="${w(e)}" alt="${w(n)}"`;
    return t && (o += ` title="${w(t)}"`), o += ">", o;
  }
  text(e) {
    return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : w(e.text);
  }
};
var z = class {
  strong({ text: e }) {
    return e;
  }
  em({ text: e }) {
    return e;
  }
  codespan({ text: e }) {
    return e;
  }
  del({ text: e }) {
    return e;
  }
  html({ text: e }) {
    return e;
  }
  text({ text: e }) {
    return e;
  }
  link({ text: e }) {
    return "" + e;
  }
  image({ text: e }) {
    return "" + e;
  }
  br() {
    return "";
  }
  checkbox({ raw: e }) {
    return e;
  }
};
var O = class a2 {
  options;
  renderer;
  textRenderer;
  constructor(e) {
    this.options = e || y, this.options.renderer = this.options.renderer || new $(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new z();
  }
  static parse(e, t) {
    return new a2(t).parse(e);
  }
  static parseInline(e, t) {
    return new a2(t).parseInline(e);
  }
  parse(e) {
    this.renderer.parser = this;
    let t = "";
    for (let n = 0; n < e.length; n++) {
      let i2 = e[n];
      if (this.options.extensions?.renderers?.[i2.type]) {
        let o = i2, s = this.options.extensions.renderers[o.type].call({ parser: this }, o);
        if (s !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "checkbox", "html", "def", "paragraph", "text"].includes(o.type)) {
          t += s || "";
          continue;
        }
      }
      let r = i2;
      switch (r.type) {
        case "space": {
          t += this.renderer.space(r);
          break;
        }
        case "hr": {
          t += this.renderer.hr(r);
          break;
        }
        case "heading": {
          t += this.renderer.heading(r);
          break;
        }
        case "code": {
          t += this.renderer.code(r);
          break;
        }
        case "table": {
          t += this.renderer.table(r);
          break;
        }
        case "blockquote": {
          t += this.renderer.blockquote(r);
          break;
        }
        case "list": {
          t += this.renderer.list(r);
          break;
        }
        case "checkbox": {
          t += this.renderer.checkbox(r);
          break;
        }
        case "html": {
          t += this.renderer.html(r);
          break;
        }
        case "def": {
          t += this.renderer.def(r);
          break;
        }
        case "paragraph": {
          t += this.renderer.paragraph(r);
          break;
        }
        case "text": {
          t += this.renderer.text(r);
          break;
        }
        default: {
          let o = 'Token with "' + r.type + '" type was not found.';
          if (this.options.silent) return console.error(o), "";
          throw new Error(o);
        }
      }
    }
    return t;
  }
  parseInline(e, t = this.renderer) {
    this.renderer.parser = this;
    let n = "";
    for (let i2 = 0; i2 < e.length; i2++) {
      let r = e[i2];
      if (this.options.extensions?.renderers?.[r.type]) {
        let s = this.options.extensions.renderers[r.type].call({ parser: this }, r);
        if (s !== false || !["escape", "html", "link", "image", "checkbox", "strong", "em", "codespan", "br", "del", "text"].includes(r.type)) {
          n += s || "";
          continue;
        }
      }
      let o = r;
      switch (o.type) {
        case "escape": {
          n += t.text(o);
          break;
        }
        case "html": {
          n += t.html(o);
          break;
        }
        case "link": {
          n += t.link(o);
          break;
        }
        case "image": {
          n += t.image(o);
          break;
        }
        case "checkbox": {
          n += t.checkbox(o);
          break;
        }
        case "strong": {
          n += t.strong(o);
          break;
        }
        case "em": {
          n += t.em(o);
          break;
        }
        case "codespan": {
          n += t.codespan(o);
          break;
        }
        case "br": {
          n += t.br(o);
          break;
        }
        case "del": {
          n += t.del(o);
          break;
        }
        case "text": {
          n += t.text(o);
          break;
        }
        default: {
          let s = 'Token with "' + o.type + '" type was not found.';
          if (this.options.silent) return console.error(s), "";
          throw new Error(s);
        }
      }
    }
    return n;
  }
};
var L = class {
  options;
  block;
  constructor(e) {
    this.options = e || y;
  }
  static passThroughHooks = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"]);
  static passThroughHooksRespectAsync = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens"]);
  preprocess(e) {
    return e;
  }
  postprocess(e) {
    return e;
  }
  processAllTokens(e) {
    return e;
  }
  emStrongMask(e) {
    return e;
  }
  provideLexer(e = this.block) {
    return e ? T.lex : T.lexInline;
  }
  provideParser(e = this.block) {
    return e ? O.parse : O.parseInline;
  }
};
function C(a3, e) {
  if (Array.isArray(e)) for (let t = 0; t < e.length; t++) a3.push(e[t]);
  else a3.push(e);
}
var U = class {
  defaults = B();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = O;
  Renderer = $;
  TextRenderer = z;
  Lexer = T;
  Tokenizer = _;
  Hooks = L;
  constructor(...e) {
    this.use(...e);
  }
  walkTokens(e, t) {
    let n = [];
    for (let i2 of e) switch (C(n, t.call(this, i2)), i2.type) {
      case "table": {
        let r = i2;
        for (let o of r.header) C(n, this.walkTokens(o.tokens, t));
        for (let o of r.rows) for (let s of o) C(n, this.walkTokens(s.tokens, t));
        break;
      }
      case "list": {
        let r = i2;
        C(n, this.walkTokens(r.items, t));
        break;
      }
      default: {
        let r = i2;
        this.defaults.extensions?.childTokens?.[r.type] ? this.defaults.extensions.childTokens[r.type].forEach((o) => {
          let s = r[o].flat(1 / 0);
          C(n, this.walkTokens(s, t));
        }) : r.tokens && C(n, this.walkTokens(r.tokens, t));
      }
    }
    return n;
  }
  use(...e) {
    let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return e.forEach((n) => {
      let i2 = { ...n };
      if (i2.async = this.defaults.async || i2.async || false, n.extensions && (n.extensions.forEach((r) => {
        if (!r.name) throw new Error("extension name required");
        if ("renderer" in r) {
          let o = t.renderers[r.name];
          o ? t.renderers[r.name] = function(...s) {
            let l = r.renderer.apply(this, s);
            return l === false && (l = o.apply(this, s)), l;
          } : t.renderers[r.name] = r.renderer;
        }
        if ("tokenizer" in r) {
          if (!r.level || r.level !== "block" && r.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
          let o = t[r.level];
          o ? o.unshift(r.tokenizer) : t[r.level] = [r.tokenizer], r.start && (r.level === "block" ? t.startBlock ? t.startBlock.push(r.start) : t.startBlock = [r.start] : r.level === "inline" && (t.startInline ? t.startInline.push(r.start) : t.startInline = [r.start]));
        }
        "childTokens" in r && r.childTokens && (t.childTokens[r.name] = r.childTokens);
      }), i2.extensions = t), n.renderer) {
        let r = this.defaults.renderer || new $(this.defaults);
        for (let o in n.renderer) {
          if (!(o in r)) throw new Error(`renderer '${o}' does not exist`);
          if (["options", "parser"].includes(o)) continue;
          let s = o, l = n.renderer[s], u = r[s];
          r[s] = (...c) => {
            let p = l.apply(r, c);
            return p === false && (p = u.apply(r, c)), p || "";
          };
        }
        i2.renderer = r;
      }
      if (n.tokenizer) {
        let r = this.defaults.tokenizer || new _(this.defaults);
        for (let o in n.tokenizer) {
          if (!(o in r)) throw new Error(`tokenizer '${o}' does not exist`);
          if (["options", "rules", "lexer"].includes(o)) continue;
          let s = o, l = n.tokenizer[s], u = r[s];
          r[s] = (...c) => {
            let p = l.apply(r, c);
            return p === false && (p = u.apply(r, c)), p;
          };
        }
        i2.tokenizer = r;
      }
      if (n.hooks) {
        let r = this.defaults.hooks || new L();
        for (let o in n.hooks) {
          if (!(o in r)) throw new Error(`hook '${o}' does not exist`);
          if (["options", "block"].includes(o)) continue;
          let s = o, l = n.hooks[s], u = r[s];
          L.passThroughHooks.has(o) ? r[s] = (c) => {
            if (this.defaults.async && L.passThroughHooksRespectAsync.has(o)) return (async () => {
              let d = await l.call(r, c);
              return u.call(r, d);
            })();
            let p = l.call(r, c);
            return u.call(r, p);
          } : r[s] = (...c) => {
            if (this.defaults.async) return (async () => {
              let d = await l.apply(r, c);
              return d === false && (d = await u.apply(r, c)), d;
            })();
            let p = l.apply(r, c);
            return p === false && (p = u.apply(r, c)), p;
          };
        }
        i2.hooks = r;
      }
      if (n.walkTokens) {
        let r = this.defaults.walkTokens, o = n.walkTokens;
        i2.walkTokens = function(s) {
          let l = [];
          return l.push(o.call(this, s)), r && C(l, r.call(this, s)), l;
        };
      }
      this.defaults = { ...this.defaults, ...i2 };
    }), this;
  }
  setOptions(e) {
    return this.defaults = { ...this.defaults, ...e }, this;
  }
  lexer(e, t) {
    return T.lex(e, t ?? this.defaults);
  }
  parser(e, t) {
    return O.parse(e, t ?? this.defaults);
  }
  parseMarkdown(e) {
    return (n, i2) => {
      let r = { ...i2 }, o = { ...this.defaults, ...r }, s = this.onError(!!o.silent, !!o.async);
      if (this.defaults.async === true && r.async === false) return s(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof n > "u" || n === null) return s(new Error("marked(): input parameter is undefined or null"));
      if (typeof n != "string") return s(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
      if (o.hooks && (o.hooks.options = o, o.hooks.block = e), o.async) return (async () => {
        let l = o.hooks ? await o.hooks.preprocess(n) : n, c = await (o.hooks ? await o.hooks.provideLexer(e) : e ? T.lex : T.lexInline)(l, o), p = o.hooks ? await o.hooks.processAllTokens(c) : c;
        o.walkTokens && await Promise.all(this.walkTokens(p, o.walkTokens));
        let g = await (o.hooks ? await o.hooks.provideParser(e) : e ? O.parse : O.parseInline)(p, o);
        return o.hooks ? await o.hooks.postprocess(g) : g;
      })().catch(s);
      try {
        o.hooks && (n = o.hooks.preprocess(n));
        let u = (o.hooks ? o.hooks.provideLexer(e) : e ? T.lex : T.lexInline)(n, o);
        o.hooks && (u = o.hooks.processAllTokens(u)), o.walkTokens && this.walkTokens(u, o.walkTokens);
        let p = (o.hooks ? o.hooks.provideParser(e) : e ? O.parse : O.parseInline)(u, o);
        return o.hooks && (p = o.hooks.postprocess(p)), p;
      } catch (l) {
        return s(l);
      }
    };
  }
  onError(e, t) {
    return (n) => {
      if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
        let i2 = "<p>An error occurred:</p><pre>" + w(n.message + "", true) + "</pre>";
        return t ? Promise.resolve(i2) : i2;
      }
      if (t) return Promise.reject(n);
      throw n;
    };
  }
};
var I = new U();
function f(a3, e) {
  return I.parse(a3, e);
}
f.options = f.setOptions = function(a3) {
  return I.setOptions(a3), f.defaults = I.defaults, V(f.defaults), f;
};
f.getDefaults = B;
f.defaults = y;
function At(...a3) {
  return I.use(...a3), f.defaults = I.defaults, V(f.defaults), f;
}
f.use = At;
f.walkTokens = function(a3, e) {
  return I.walkTokens(a3, e);
};
f.parseInline = I.parseInline;
f.Parser = O;
f.parser = O.parse;
f.Renderer = $;
f.TextRenderer = z;
f.Lexer = T;
f.lexer = T.lex;
f.Tokenizer = _;
f.Hooks = L;
f.parse = f;
var Rn = f.options;
var Tn = f.setOptions;
var On = f.walkTokens;
var wn = f.parseInline;
var yn = O.parse;
var Sn = T.lex;

// node_modules/dompurify/dist/purify.es.mjs
function _OverloadYield(e, d) {
  this.v = e, this.k = d;
}
function _arrayLikeToArray(r, a3) {
  (null == a3 || a3 > r.length) && (a3 = r.length);
  for (var e = 0, n = Array(a3); e < a3; e++) n[e] = r[e];
  return n;
}
function _arrayWithHoles(r) {
  if (Array.isArray(r)) return r;
}
function _iterableToArrayLimit(r, l) {
  var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (null != t) {
    var e, n, i2, u, a3 = [], f2 = true, o = false;
    try {
      if (i2 = (t = t.call(r)).next, 0 === l) {
        if (Object(t) !== t) return;
        f2 = false;
      } else for (; !(f2 = (e = i2.call(t)).done) && (a3.push(e.value), a3.length !== l); f2 = true) ;
    } catch (r2) {
      o = true, n = r2;
    } finally {
      try {
        if (!f2 && null != t.return && (u = t.return(), Object(u) !== u)) return;
      } finally {
        if (o) throw n;
      }
    }
    return a3;
  }
}
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _slicedToArray(r, e) {
  return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
}
function _unsupportedIterableToArray(r, a3) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray(r, a3);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a3) : void 0;
  }
}
function AsyncGenerator(e) {
  var t, n;
  function resume(t2, n2) {
    try {
      var r = e[t2](n2), o = r.value, u = o instanceof _OverloadYield;
      Promise.resolve(u ? o.v : o).then(function(n3) {
        if (u) {
          var i2 = "return" === t2 && o.k ? t2 : "next";
          if (!o.k || n3.done) return resume(i2, n3);
          n3 = e[i2](n3).value;
        }
        settle(!!r.done, n3);
      }, function(e2) {
        resume("throw", e2);
      });
    } catch (e2) {
      settle(2, e2);
    }
  }
  function settle(e2, r) {
    2 === e2 ? t.reject(r) : t.resolve({
      value: r,
      done: e2
    }), (t = t.next) ? resume(t.key, t.arg) : n = null;
  }
  this._invoke = function(e2, r) {
    return new Promise(function(o, u) {
      var i2 = {
        key: e2,
        arg: r,
        resolve: o,
        reject: u,
        next: null
      };
      n ? n = n.next = i2 : (t = n = i2, resume(e2, r));
    });
  }, "function" != typeof e.return && (this.return = void 0);
}
AsyncGenerator.prototype["function" == typeof Symbol && Symbol.asyncIterator || "@@asyncIterator"] = function() {
  return this;
}, AsyncGenerator.prototype.next = function(e) {
  return this._invoke("next", e);
}, AsyncGenerator.prototype.throw = function(e) {
  return this._invoke("throw", e);
}, AsyncGenerator.prototype.return = function(e) {
  return this._invoke("return", e);
};
var entries = Object.entries;
var setPrototypeOf = Object.setPrototypeOf;
var isFrozen = Object.isFrozen;
var getPrototypeOf = Object.getPrototypeOf;
var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
var freeze = Object.freeze;
var seal = Object.seal;
var create = Object.create;
var _ref = typeof Reflect !== "undefined" && Reflect;
var apply = _ref.apply;
var construct = _ref.construct;
if (!freeze) freeze = function freeze2(x2) {
  return x2;
};
if (!seal) seal = function seal2(x2) {
  return x2;
};
if (!apply) apply = function apply2(func, thisArg) {
  for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) args[_key - 2] = arguments[_key];
  return func.apply(thisArg, args);
};
if (!construct) construct = function construct2(Func) {
  for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) args[_key2 - 1] = arguments[_key2];
  return new Func(...args);
};
var arrayForEach = unapply(Array.prototype.forEach);
Array.prototype.indexOf;
var arrayLastIndexOf = unapply(Array.prototype.lastIndexOf);
var arrayPop = unapply(Array.prototype.pop);
var arrayPush = unapply(Array.prototype.push);
var arraySlice = unapply(Array.prototype.slice);
var arraySplice = unapply(Array.prototype.splice);
var arrayIsArray = Array.isArray;
var setCreate = unconstruct(Set);
var setAdd = unapply(Set.prototype.add);
var setHas = unapply(Set.prototype.has);
var stringToLowerCase = unapply(String.prototype.toLowerCase);
var stringToString = unapply(String.prototype.toString);
var stringMatch = unapply(String.prototype.match);
var stringReplace = unapply(String.prototype.replace);
var stringIndexOf = unapply(String.prototype.indexOf);
var stringTrim = unapply(String.prototype.trim);
var numberToString = unapply(Number.prototype.toString);
var booleanToString = unapply(Boolean.prototype.toString);
var bigintToString = typeof BigInt === "undefined" ? null : unapply(BigInt.prototype.toString);
var symbolToString = typeof Symbol === "undefined" ? null : unapply(Symbol.prototype.toString);
var objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
var objectToString = unapply(Object.prototype.toString);
var regExpTest = unapply(RegExp.prototype.test);
var typeErrorCreate = unconstruct(TypeError);
function unapply(func) {
  return function(thisArg) {
    if (thisArg instanceof RegExp) thisArg.lastIndex = 0;
    for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) args[_key3 - 1] = arguments[_key3];
    return apply(func, thisArg, args);
  };
}
function unconstruct(Func) {
  return function() {
    for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) args[_key4] = arguments[_key4];
    return construct(Func, args);
  };
}
function addToSet(set, array) {
  let transformCaseFunc = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : stringToLowerCase;
  if (setPrototypeOf) setPrototypeOf(set, null);
  if (!arrayIsArray(array)) return set;
  let l = array.length;
  while (l--) {
    let element = array[l];
    if (typeof element === "string") {
      const lcElement = transformCaseFunc(element);
      if (lcElement !== element) {
        if (!isFrozen(array)) array[l] = lcElement;
        element = lcElement;
      }
    }
    set[element] = true;
  }
  return set;
}
function cleanArray(array) {
  for (let index = 0; index < array.length; index++) if (!objectHasOwnProperty(array, index)) array[index] = null;
  return array;
}
function clone(object) {
  const newObject = create(null);
  for (const _ref2 of entries(object)) {
    var _ref3 = _slicedToArray(_ref2, 2);
    const property = _ref3[0];
    const value = _ref3[1];
    if (objectHasOwnProperty(object, property)) {
      if (arrayIsArray(value)) newObject[property] = cleanArray(value);
      else if (value && typeof value === "object" && value.constructor === Object) newObject[property] = clone(value);
      else newObject[property] = value;
    }
  }
  return newObject;
}
function stringifyValue(value) {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
      return numberToString(value);
    case "boolean":
      return booleanToString(value);
    case "bigint":
      return bigintToString ? bigintToString(value) : "0";
    case "symbol":
      return symbolToString ? symbolToString(value) : "Symbol()";
    case "undefined":
      return objectToString(value);
    case "function":
    case "object": {
      if (value === null) return objectToString(value);
      const valueAsRecord = value;
      const valueToString = lookupGetter(valueAsRecord, "toString");
      if (typeof valueToString === "function") {
        const stringified = valueToString(valueAsRecord);
        return typeof stringified === "string" ? stringified : objectToString(stringified);
      }
      return objectToString(value);
    }
    default:
      return objectToString(value);
  }
}
function lookupGetter(object, prop) {
  while (object !== null) {
    const desc = getOwnPropertyDescriptor(object, prop);
    if (desc) {
      if (desc.get) return unapply(desc.get);
      if (typeof desc.value === "function") return unapply(desc.value);
    }
    object = getPrototypeOf(object);
  }
  function fallbackValue() {
    return null;
  }
  return fallbackValue;
}
function lookupAccessor(object, prop) {
  while (object !== null) {
    const desc = getOwnPropertyDescriptor(object, prop);
    if (desc) return desc.get ? unapply(desc.get) : null;
    object = getPrototypeOf(object);
  }
  return null;
}
function isRegex(value) {
  try {
    regExpTest(value, "");
    return true;
  } catch (_unused) {
    return false;
  }
}
var html$1 = freeze([
  "a",
  "abbr",
  "acronym",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "bdi",
  "bdo",
  "big",
  "blink",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "center",
  "cite",
  "code",
  "col",
  "colgroup",
  "content",
  "data",
  "datalist",
  "dd",
  "decorator",
  "del",
  "details",
  "dfn",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "element",
  "em",
  "fieldset",
  "figcaption",
  "figure",
  "font",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "main",
  "map",
  "mark",
  "marquee",
  "menu",
  "menuitem",
  "meter",
  "nav",
  "nobr",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "search",
  "section",
  "select",
  "shadow",
  "slot",
  "small",
  "source",
  "spacer",
  "span",
  "strike",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "track",
  "tt",
  "u",
  "ul",
  "var",
  "video",
  "wbr"
]);
var svg$1 = freeze([
  "svg",
  "a",
  "altglyph",
  "altglyphdef",
  "altglyphitem",
  "animatecolor",
  "animatemotion",
  "animatetransform",
  "circle",
  "clippath",
  "defs",
  "desc",
  "ellipse",
  "enterkeyhint",
  "exportparts",
  "filter",
  "font",
  "g",
  "glyph",
  "glyphref",
  "hkern",
  "image",
  "inputmode",
  "line",
  "lineargradient",
  "marker",
  "mask",
  "metadata",
  "mpath",
  "part",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialgradient",
  "rect",
  "stop",
  "style",
  "switch",
  "symbol",
  "text",
  "textpath",
  "title",
  "tref",
  "tspan",
  "view",
  "vkern"
]);
var svgFilters = freeze([
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence"
]);
var svgDisallowed = freeze([
  "animate",
  "color-profile",
  "cursor",
  "discard",
  "font-face",
  "font-face-format",
  "font-face-name",
  "font-face-src",
  "font-face-uri",
  "foreignobject",
  "hatch",
  "hatchpath",
  "mesh",
  "meshgradient",
  "meshpatch",
  "meshrow",
  "missing-glyph",
  "script",
  "set",
  "solidcolor",
  "unknown",
  "use"
]);
var mathMl$1 = freeze([
  "math",
  "menclose",
  "merror",
  "mfenced",
  "mfrac",
  "mglyph",
  "mi",
  "mlabeledtr",
  "mmultiscripts",
  "mn",
  "mo",
  "mover",
  "mpadded",
  "mphantom",
  "mroot",
  "mrow",
  "ms",
  "mspace",
  "msqrt",
  "mstyle",
  "msub",
  "msup",
  "msubsup",
  "mtable",
  "mtd",
  "mtext",
  "mtr",
  "munder",
  "munderover",
  "mprescripts"
]);
var mathMlDisallowed = freeze([
  "maction",
  "maligngroup",
  "malignmark",
  "mlongdiv",
  "mscarries",
  "mscarry",
  "msgroup",
  "mstack",
  "msline",
  "msrow",
  "semantics",
  "annotation",
  "annotation-xml",
  "mprescripts",
  "none"
]);
var text = freeze(["#text"]);
var html = freeze([
  "accept",
  "action",
  "align",
  "alt",
  "autocapitalize",
  "autocomplete",
  "autopictureinpicture",
  "autoplay",
  "background",
  "bgcolor",
  "border",
  "capture",
  "cellpadding",
  "cellspacing",
  "checked",
  "cite",
  "class",
  "clear",
  "color",
  "cols",
  "colspan",
  "command",
  "commandfor",
  "controls",
  "controlslist",
  "coords",
  "crossorigin",
  "datetime",
  "decoding",
  "default",
  "dir",
  "disabled",
  "disablepictureinpicture",
  "disableremoteplayback",
  "download",
  "draggable",
  "enctype",
  "enterkeyhint",
  "exportparts",
  "face",
  "for",
  "headers",
  "height",
  "hidden",
  "high",
  "href",
  "hreflang",
  "id",
  "inert",
  "inputmode",
  "integrity",
  "ismap",
  "kind",
  "label",
  "lang",
  "list",
  "loading",
  "loop",
  "low",
  "max",
  "maxlength",
  "media",
  "method",
  "min",
  "minlength",
  "multiple",
  "muted",
  "name",
  "nonce",
  "noshade",
  "novalidate",
  "nowrap",
  "open",
  "optimum",
  "part",
  "pattern",
  "placeholder",
  "playsinline",
  "popover",
  "popovertarget",
  "popovertargetaction",
  "poster",
  "preload",
  "pubdate",
  "radiogroup",
  "readonly",
  "rel",
  "required",
  "rev",
  "reversed",
  "role",
  "rows",
  "rowspan",
  "spellcheck",
  "scope",
  "selected",
  "shape",
  "size",
  "sizes",
  "slot",
  "span",
  "srclang",
  "start",
  "src",
  "srcset",
  "step",
  "style",
  "summary",
  "tabindex",
  "title",
  "translate",
  "type",
  "usemap",
  "valign",
  "value",
  "width",
  "wrap",
  "xmlns"
]);
var svg = freeze([
  "accent-height",
  "accumulate",
  "additive",
  "alignment-baseline",
  "amplitude",
  "ascent",
  "attributename",
  "attributetype",
  "azimuth",
  "basefrequency",
  "baseline-shift",
  "begin",
  "bias",
  "by",
  "class",
  "clip",
  "clippathunits",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "cx",
  "cy",
  "d",
  "dx",
  "dy",
  "diffuseconstant",
  "direction",
  "display",
  "divisor",
  "dominant-baseline",
  "dur",
  "edgemode",
  "elevation",
  "end",
  "exponent",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "filterunits",
  "flood-color",
  "flood-opacity",
  "font-family",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "fx",
  "fy",
  "g1",
  "g2",
  "glyph-name",
  "glyphref",
  "gradientunits",
  "gradienttransform",
  "height",
  "href",
  "id",
  "image-rendering",
  "in",
  "in2",
  "intercept",
  "k",
  "k1",
  "k2",
  "k3",
  "k4",
  "kerning",
  "keypoints",
  "keysplines",
  "keytimes",
  "lang",
  "lengthadjust",
  "letter-spacing",
  "kernelmatrix",
  "kernelunitlength",
  "lighting-color",
  "local",
  "marker-end",
  "marker-mid",
  "marker-start",
  "markerheight",
  "markerunits",
  "markerwidth",
  "maskcontentunits",
  "maskunits",
  "max",
  "mask",
  "mask-type",
  "media",
  "method",
  "mode",
  "min",
  "name",
  "numoctaves",
  "offset",
  "operator",
  "opacity",
  "order",
  "orient",
  "orientation",
  "origin",
  "overflow",
  "paint-order",
  "path",
  "pathlength",
  "patterncontentunits",
  "patterntransform",
  "patternunits",
  "pointer-events",
  "points",
  "preservealpha",
  "preserveaspectratio",
  "primitiveunits",
  "r",
  "rx",
  "ry",
  "radius",
  "refx",
  "refy",
  "repeatcount",
  "repeatdur",
  "restart",
  "result",
  "rotate",
  "scale",
  "seed",
  "shape-rendering",
  "slope",
  "specularconstant",
  "specularexponent",
  "spreadmethod",
  "startoffset",
  "stddeviation",
  "stitchtiles",
  "stop-color",
  "stop-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke",
  "stroke-width",
  "style",
  "surfacescale",
  "systemlanguage",
  "tabindex",
  "tablevalues",
  "targetx",
  "targety",
  "transform",
  "transform-origin",
  "text-anchor",
  "text-decoration",
  "text-orientation",
  "text-rendering",
  "textlength",
  "type",
  "u1",
  "u2",
  "unicode",
  "values",
  "vector-effect",
  "viewbox",
  "visibility",
  "version",
  "vert-adv-y",
  "vert-origin-x",
  "vert-origin-y",
  "width",
  "word-spacing",
  "wrap",
  "writing-mode",
  "xchannelselector",
  "ychannelselector",
  "x",
  "x1",
  "x2",
  "xmlns",
  "y",
  "y1",
  "y2",
  "z",
  "zoomandpan"
]);
var mathMl = freeze([
  "accent",
  "accentunder",
  "align",
  "bevelled",
  "close",
  "columnalign",
  "columnlines",
  "columnspacing",
  "columnspan",
  "denomalign",
  "depth",
  "dir",
  "display",
  "displaystyle",
  "encoding",
  "fence",
  "frame",
  "height",
  "href",
  "id",
  "largeop",
  "length",
  "linethickness",
  "lquote",
  "lspace",
  "mathbackground",
  "mathcolor",
  "mathsize",
  "mathvariant",
  "maxsize",
  "minsize",
  "movablelimits",
  "notation",
  "numalign",
  "open",
  "rowalign",
  "rowlines",
  "rowspacing",
  "rowspan",
  "rspace",
  "rquote",
  "scriptlevel",
  "scriptminsize",
  "scriptsizemultiplier",
  "selection",
  "separator",
  "separators",
  "stretchy",
  "subscriptshift",
  "supscriptshift",
  "symmetric",
  "voffset",
  "width",
  "xmlns"
]);
var xml = freeze([
  "xlink:href",
  "xml:id",
  "xlink:title",
  "xml:space",
  "xmlns:xlink"
]);
var MUSTACHE_EXPR = seal(/{{[\w\W]*|^[\w\W]*}}/g);
var ERB_EXPR = seal(/<%[\w\W]*|^[\w\W]*%>/g);
var TMPLIT_EXPR = seal(/\${[\w\W]*/g);
var DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]+$/);
var ARIA_ATTR = seal(/^aria-[\-\w]+$/);
var IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i);
var IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
var ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g);
var DOCTYPE_NAME = seal(/^html$/i);
var CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);
var ELEMENT_MARKUP_PROBE = seal(/<[/\w!]/g);
var COMMENT_MARKUP_PROBE = seal(/<[/\w]/g);
var FALLBACK_TAG_CLOSE = seal(/<\/no(script|embed|frames)/i);
var SELF_CLOSING_TAG = seal(/\/>/i);
var NODE_TYPE = {
  element: 1,
  attribute: 2,
  text: 3,
  cdataSection: 4,
  entityReference: 5,
  entityNode: 6,
  processingInstruction: 7,
  comment: 8,
  document: 9,
  documentType: 10,
  documentFragment: 11,
  notation: 12
};
var LITERAL_TEXT_ELEMENTS = freeze(addToSet({}, [
  "style",
  "script",
  "xmp",
  "iframe",
  "noembed",
  "noframes",
  "plaintext",
  "noscript"
]));
var getGlobal = function getGlobal2() {
  return typeof window === "undefined" ? null : window;
};
var _createTrustedTypesPolicy = function _createTrustedTypesPolicy2(trustedTypes, purifyHostElement) {
  if (typeof trustedTypes !== "object" || typeof trustedTypes.createPolicy !== "function") return null;
  let suffix = null;
  const ATTR_NAME = "data-tt-policy-suffix";
  if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME)) suffix = purifyHostElement.getAttribute(ATTR_NAME);
  const policyName = "dompurify" + (suffix ? "#" + suffix : "");
  try {
    return trustedTypes.createPolicy(policyName, {
      createHTML(html2) {
        return html2;
      },
      createScriptURL(scriptUrl) {
        return scriptUrl;
      }
    });
  } catch (_2) {
    console.warn("TrustedTypes policy " + policyName + " could not be created.");
    return null;
  }
};
var _createHooksMap = function _createHooksMap2() {
  return {
    afterSanitizeAttributes: [],
    afterSanitizeElements: [],
    afterSanitizeShadowDOM: [],
    beforeSanitizeAttributes: [],
    beforeSanitizeElements: [],
    beforeSanitizeShadowDOM: [],
    uponSanitizeAttribute: [],
    uponSanitizeElement: [],
    uponSanitizeShadowNode: []
  };
};
var _resolveSetOption = function _resolveSetOption2(cfg, key, fallback, options) {
  return objectHasOwnProperty(cfg, key) && arrayIsArray(cfg[key]) ? addToSet(options.base ? clone(options.base) : {}, cfg[key], options.transform) : fallback;
};
var _resolveObjectOption = function _resolveObjectOption2(cfg, key, makeFallback) {
  const value = objectHasOwnProperty(cfg, key) ? cfg[key] : void 0;
  return value && typeof value === "object" ? clone(value) : makeFallback();
};
function createDOMPurify() {
  let window2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : getGlobal();
  const DOMPurify = (root) => createDOMPurify(root);
  DOMPurify.version = "3.4.17";
  DOMPurify.removed = [];
  if (!window2 || !window2.document || window2.document.nodeType !== NODE_TYPE.document || !window2.Element) {
    DOMPurify.isSupported = false;
    return DOMPurify;
  }
  let document2 = window2.document;
  const originalDocument = document2;
  const currentScript = originalDocument.currentScript;
  window2.DocumentFragment;
  const HTMLTemplateElement = window2.HTMLTemplateElement, Node2 = window2.Node, Element = window2.Element, NodeFilter = window2.NodeFilter;
  window2.NamedNodeMap === void 0 && (window2.NamedNodeMap || window2.MozNamedAttrMap);
  window2.HTMLFormElement;
  const DOMParser = window2.DOMParser, trustedTypes = window2.trustedTypes;
  const ElementPrototype = Element.prototype;
  const cloneNode = lookupGetter(ElementPrototype, "cloneNode");
  const remove = lookupGetter(ElementPrototype, "remove");
  const removeAttributeNode = lookupGetter(ElementPrototype, "removeAttributeNode");
  const getNextSibling = lookupGetter(ElementPrototype, "nextSibling");
  const getChildNodes = lookupGetter(ElementPrototype, "childNodes");
  const getParentNode = lookupGetter(ElementPrototype, "parentNode");
  const getShadowRoot = lookupGetter(ElementPrototype, "shadowRoot");
  const getAttributes = lookupGetter(ElementPrototype, "attributes");
  const getNodeType = Node2 && Node2.prototype ? lookupGetter(Node2.prototype, "nodeType") : null;
  const getNodeName = Node2 && Node2.prototype ? lookupGetter(Node2.prototype, "nodeName") : null;
  const getOwnerDocument = Node2 && Node2.prototype ? lookupGetter(Node2.prototype, "ownerDocument") : null;
  const _readNodeType = function _readNodeType2(node) {
    return getNodeType ? getNodeType(node) : node.nodeType;
  };
  const _readNodeName = function _readNodeName2(node) {
    return getNodeName ? getNodeName(node) : node.nodeName;
  };
  const getNamespaceURI = lookupAccessor(ElementPrototype, "namespaceURI");
  const _readNamespaceURI = function _readNamespaceURI2(element) {
    return getNamespaceURI ? getNamespaceURI(element) : element.namespaceURI;
  };
  if (typeof HTMLTemplateElement === "function") {
    const template = document2.createElement("template");
    if (template.content && template.content.ownerDocument) document2 = template.content.ownerDocument;
  }
  let trustedTypesPolicy;
  let emptyHTML = "";
  let defaultTrustedTypesPolicy;
  let defaultTrustedTypesPolicyResolved = false;
  let IN_TRUSTED_TYPES_POLICY = 0;
  const _assertNotInTrustedTypesPolicy = function _assertNotInTrustedTypesPolicy2() {
    if (IN_TRUSTED_TYPES_POLICY > 0) throw typeErrorCreate('A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the "DOMPurify and Trusted Types" section of the README.');
  };
  const _createTrustedHTML = function _createTrustedHTML2(html2) {
    _assertNotInTrustedTypesPolicy();
    IN_TRUSTED_TYPES_POLICY++;
    try {
      return trustedTypesPolicy.createHTML(html2);
    } finally {
      IN_TRUSTED_TYPES_POLICY--;
    }
  };
  const _createTrustedScriptURL = function _createTrustedScriptURL2(scriptUrl) {
    _assertNotInTrustedTypesPolicy();
    IN_TRUSTED_TYPES_POLICY++;
    try {
      return trustedTypesPolicy.createScriptURL(scriptUrl);
    } finally {
      IN_TRUSTED_TYPES_POLICY--;
    }
  };
  const _getDefaultTrustedTypesPolicy = function _getDefaultTrustedTypesPolicy2() {
    if (!defaultTrustedTypesPolicyResolved) {
      defaultTrustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
      defaultTrustedTypesPolicyResolved = true;
    }
    return defaultTrustedTypesPolicy;
  };
  const _document = document2, implementation = _document.implementation, createNodeIterator = _document.createNodeIterator, createDocumentFragment = _document.createDocumentFragment, getElementsByTagName = _document.getElementsByTagName;
  const importNode = originalDocument.importNode;
  let hooks = _createHooksMap();
  DOMPurify.isSupported = typeof entries === "function" && typeof getParentNode === "function" && implementation && implementation.createHTMLDocument !== void 0;
  const MUSTACHE_EXPR$1 = MUSTACHE_EXPR, ERB_EXPR$1 = ERB_EXPR, TMPLIT_EXPR$1 = TMPLIT_EXPR, DATA_ATTR$1 = DATA_ATTR, ARIA_ATTR$1 = ARIA_ATTR, IS_SCRIPT_OR_DATA$1 = IS_SCRIPT_OR_DATA, ATTR_WHITESPACE$1 = ATTR_WHITESPACE, CUSTOM_ELEMENT$1 = CUSTOM_ELEMENT;
  let IS_ALLOWED_URI$1 = IS_ALLOWED_URI;
  let ALLOWED_TAGS = null;
  const DEFAULT_ALLOWED_TAGS = addToSet({}, [
    ...html$1,
    ...svg$1,
    ...svgFilters,
    ...mathMl$1,
    ...text
  ]);
  let ALLOWED_ATTR = null;
  const DEFAULT_ALLOWED_ATTR = addToSet({}, [
    ...html,
    ...svg,
    ...mathMl,
    ...xml
  ]);
  let CUSTOM_ELEMENT_HANDLING = Object.seal(create(null, {
    tagNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    attributeNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    allowCustomizedBuiltInElements: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: false
    }
  }));
  let FORBID_TAGS = null;
  let FORBID_ATTR = null;
  const EXTRA_ELEMENT_HANDLING = Object.seal(create(null, {
    tagCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    attributeCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    }
  }));
  let ALLOW_ARIA_ATTR = true;
  let ALLOW_DATA_ATTR = true;
  let ALLOW_UNKNOWN_PROTOCOLS = false;
  let ALLOW_SELF_CLOSE_IN_ATTR = true;
  let SAFE_FOR_TEMPLATES = false;
  let SAFE_FOR_XML = true;
  let WHOLE_DOCUMENT = false;
  let SET_CONFIG = false;
  let SET_CONFIG_ALLOWED_TAGS = null;
  let SET_CONFIG_ALLOWED_ATTR = null;
  let FORCE_BODY = false;
  let RETURN_DOM = false;
  let RETURN_DOM_FRAGMENT = false;
  let RETURN_TRUSTED_TYPE = false;
  let SANITIZE_DOM = true;
  let SANITIZE_NAMED_PROPS = false;
  const SANITIZE_NAMED_PROPS_PREFIX = "user-content-";
  let KEEP_CONTENT = true;
  let IN_PLACE = false;
  let IN_PLACE_VISITED = null;
  let USE_PROFILES = {};
  let FORBID_CONTENTS = null;
  const DEFAULT_FORBID_CONTENTS = addToSet({}, [
    "annotation-xml",
    "audio",
    "colgroup",
    "desc",
    "foreignobject",
    "head",
    "iframe",
    "math",
    "mi",
    "mn",
    "mo",
    "ms",
    "mtext",
    "noembed",
    "noframes",
    "noscript",
    "plaintext",
    "script",
    "selectedcontent",
    "style",
    "svg",
    "template",
    "thead",
    "title",
    "video",
    "xmp"
  ]);
  let DATA_URI_TAGS = null;
  const DEFAULT_DATA_URI_TAGS = addToSet({}, [
    "audio",
    "video",
    "img",
    "source",
    "image",
    "track"
  ]);
  let URI_SAFE_ATTRIBUTES = null;
  const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, [
    "alt",
    "class",
    "for",
    "id",
    "label",
    "name",
    "pattern",
    "placeholder",
    "role",
    "summary",
    "title",
    "value",
    "style",
    "xmlns"
  ]);
  const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
  let NAMESPACE = HTML_NAMESPACE;
  let IS_EMPTY_INPUT = false;
  let ALLOWED_NAMESPACES = null;
  const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [
    MATHML_NAMESPACE,
    SVG_NAMESPACE,
    HTML_NAMESPACE
  ], stringToString);
  const DEFAULT_MATHML_TEXT_INTEGRATION_POINTS = freeze([
    "mi",
    "mo",
    "mn",
    "ms",
    "mtext"
  ]);
  let MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS);
  const DEFAULT_HTML_INTEGRATION_POINTS = freeze(["annotation-xml"]);
  let HTML_INTEGRATION_POINTS = addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS);
  const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, [
    "title",
    "style",
    "font",
    "a",
    "script"
  ]);
  let PARSER_MEDIA_TYPE = null;
  const SUPPORTED_PARSER_MEDIA_TYPES = ["application/xhtml+xml", "text/html"];
  const DEFAULT_PARSER_MEDIA_TYPE = "text/html";
  let transformCaseFunc = null;
  let CONFIG = null;
  const formElement = document2.createElement("form");
  const isRegexOrFunction = function isRegexOrFunction2(testValue) {
    return testValue instanceof RegExp || testValue instanceof Function;
  };
  const _parseConfig = function _parseConfig2() {
    let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (CONFIG && CONFIG === cfg) return;
    if (!cfg || typeof cfg !== "object") cfg = {};
    cfg = clone(cfg);
    PARSER_MEDIA_TYPE = SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;
    transformCaseFunc = PARSER_MEDIA_TYPE === "application/xhtml+xml" ? stringToString : stringToLowerCase;
    ALLOWED_TAGS = _resolveSetOption(cfg, "ALLOWED_TAGS", DEFAULT_ALLOWED_TAGS, { transform: transformCaseFunc });
    ALLOWED_ATTR = _resolveSetOption(cfg, "ALLOWED_ATTR", DEFAULT_ALLOWED_ATTR, { transform: transformCaseFunc });
    ALLOWED_NAMESPACES = _resolveSetOption(cfg, "ALLOWED_NAMESPACES", DEFAULT_ALLOWED_NAMESPACES, { transform: stringToString });
    URI_SAFE_ATTRIBUTES = _resolveSetOption(cfg, "ADD_URI_SAFE_ATTR", DEFAULT_URI_SAFE_ATTRIBUTES, {
      transform: transformCaseFunc,
      base: DEFAULT_URI_SAFE_ATTRIBUTES
    });
    DATA_URI_TAGS = _resolveSetOption(cfg, "ADD_DATA_URI_TAGS", DEFAULT_DATA_URI_TAGS, {
      transform: transformCaseFunc,
      base: DEFAULT_DATA_URI_TAGS
    });
    FORBID_CONTENTS = _resolveSetOption(cfg, "FORBID_CONTENTS", DEFAULT_FORBID_CONTENTS, { transform: transformCaseFunc });
    FORBID_TAGS = _resolveSetOption(cfg, "FORBID_TAGS", clone({}), { transform: transformCaseFunc });
    FORBID_ATTR = _resolveSetOption(cfg, "FORBID_ATTR", clone({}), { transform: transformCaseFunc });
    USE_PROFILES = objectHasOwnProperty(cfg, "USE_PROFILES") ? cfg.USE_PROFILES && typeof cfg.USE_PROFILES === "object" ? clone(cfg.USE_PROFILES) : cfg.USE_PROFILES : false;
    ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false;
    ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false;
    ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false;
    ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false;
    SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false;
    SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false;
    WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false;
    RETURN_DOM = cfg.RETURN_DOM || false;
    RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false;
    RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false;
    FORCE_BODY = cfg.FORCE_BODY || false;
    SANITIZE_DOM = cfg.SANITIZE_DOM !== false;
    SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false;
    KEEP_CONTENT = cfg.KEEP_CONTENT !== false;
    IN_PLACE = cfg.IN_PLACE || false;
    IS_ALLOWED_URI$1 = isRegex(cfg.ALLOWED_URI_REGEXP) ? cfg.ALLOWED_URI_REGEXP : IS_ALLOWED_URI;
    NAMESPACE = typeof cfg.NAMESPACE === "string" ? cfg.NAMESPACE : HTML_NAMESPACE;
    MATHML_TEXT_INTEGRATION_POINTS = _resolveObjectOption(cfg, "MATHML_TEXT_INTEGRATION_POINTS", () => addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS));
    HTML_INTEGRATION_POINTS = _resolveObjectOption(cfg, "HTML_INTEGRATION_POINTS", () => addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS));
    const customElementHandling = _resolveObjectOption(cfg, "CUSTOM_ELEMENT_HANDLING", () => create(null));
    CUSTOM_ELEMENT_HANDLING = create(null);
    if (objectHasOwnProperty(customElementHandling, "tagNameCheck") && isRegexOrFunction(customElementHandling.tagNameCheck)) CUSTOM_ELEMENT_HANDLING.tagNameCheck = customElementHandling.tagNameCheck;
    if (objectHasOwnProperty(customElementHandling, "attributeNameCheck") && isRegexOrFunction(customElementHandling.attributeNameCheck)) CUSTOM_ELEMENT_HANDLING.attributeNameCheck = customElementHandling.attributeNameCheck;
    if (objectHasOwnProperty(customElementHandling, "allowCustomizedBuiltInElements") && typeof customElementHandling.allowCustomizedBuiltInElements === "boolean") CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = customElementHandling.allowCustomizedBuiltInElements;
    seal(CUSTOM_ELEMENT_HANDLING);
    if (SAFE_FOR_TEMPLATES) ALLOW_DATA_ATTR = false;
    if (RETURN_DOM_FRAGMENT) RETURN_DOM = true;
    if (USE_PROFILES) {
      ALLOWED_TAGS = addToSet({}, text);
      ALLOWED_ATTR = create(null);
      if (USE_PROFILES.html === true) {
        addToSet(ALLOWED_TAGS, html$1);
        addToSet(ALLOWED_ATTR, html);
      }
      if (USE_PROFILES.svg === true) {
        addToSet(ALLOWED_TAGS, svg$1);
        addToSet(ALLOWED_ATTR, svg);
        addToSet(ALLOWED_ATTR, xml);
      }
      if (USE_PROFILES.svgFilters === true) {
        addToSet(ALLOWED_TAGS, svgFilters);
        addToSet(ALLOWED_ATTR, svg);
        addToSet(ALLOWED_ATTR, xml);
      }
      if (USE_PROFILES.mathMl === true) {
        addToSet(ALLOWED_TAGS, mathMl$1);
        addToSet(ALLOWED_ATTR, mathMl);
        addToSet(ALLOWED_ATTR, xml);
      }
    }
    EXTRA_ELEMENT_HANDLING.tagCheck = null;
    EXTRA_ELEMENT_HANDLING.attributeCheck = null;
    if (objectHasOwnProperty(cfg, "ADD_TAGS")) {
      if (typeof cfg.ADD_TAGS === "function") EXTRA_ELEMENT_HANDLING.tagCheck = cfg.ADD_TAGS;
      else if (arrayIsArray(cfg.ADD_TAGS)) {
        if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) ALLOWED_TAGS = clone(ALLOWED_TAGS);
        addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
      }
    }
    if (objectHasOwnProperty(cfg, "ADD_ATTR")) {
      if (typeof cfg.ADD_ATTR === "function") EXTRA_ELEMENT_HANDLING.attributeCheck = cfg.ADD_ATTR;
      else if (arrayIsArray(cfg.ADD_ATTR)) {
        if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) ALLOWED_ATTR = clone(ALLOWED_ATTR);
        addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
      }
    }
    if (objectHasOwnProperty(cfg, "ADD_FORBID_CONTENTS") && arrayIsArray(cfg.ADD_FORBID_CONTENTS)) {
      if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) FORBID_CONTENTS = clone(FORBID_CONTENTS);
      addToSet(FORBID_CONTENTS, cfg.ADD_FORBID_CONTENTS, transformCaseFunc);
    }
    if (KEEP_CONTENT) ALLOWED_TAGS["#text"] = true;
    if (WHOLE_DOCUMENT) addToSet(ALLOWED_TAGS, [
      "html",
      "head",
      "body"
    ]);
    if (ALLOWED_TAGS.table) {
      addToSet(ALLOWED_TAGS, ["tbody"]);
      delete FORBID_TAGS.tbody;
    }
    if (cfg.TRUSTED_TYPES_POLICY) {
      if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== "function") throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
      if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== "function") throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
      const previousTrustedTypesPolicy = trustedTypesPolicy;
      trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;
      try {
        emptyHTML = _createTrustedHTML("");
      } catch (error) {
        trustedTypesPolicy = previousTrustedTypesPolicy;
        throw error;
      }
    } else if (cfg.TRUSTED_TYPES_POLICY === null) {
      trustedTypesPolicy = void 0;
      emptyHTML = "";
    } else {
      if (trustedTypesPolicy === void 0) trustedTypesPolicy = _getDefaultTrustedTypesPolicy();
      if (trustedTypesPolicy && typeof emptyHTML === "string") emptyHTML = _createTrustedHTML("");
    }
    if (freeze) freeze(cfg);
    CONFIG = cfg;
  };
  const ALL_SVG_TAGS = addToSet({}, [
    ...svg$1,
    ...svgFilters,
    ...svgDisallowed
  ]);
  const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);
  const _checkSvgNamespace = function _checkSvgNamespace2(tagName, parent, parentTagName) {
    if (parent.namespaceURI === HTML_NAMESPACE) return tagName === "svg";
    if (parent.namespaceURI === MATHML_NAMESPACE) return tagName === "svg" && (parentTagName === "annotation-xml" || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
    return Boolean(ALL_SVG_TAGS[tagName]);
  };
  const _checkMathMlNamespace = function _checkMathMlNamespace2(tagName, parent, parentTagName) {
    if (parent.namespaceURI === HTML_NAMESPACE) return tagName === "math";
    if (parent.namespaceURI === SVG_NAMESPACE) return tagName === "math" && HTML_INTEGRATION_POINTS[parentTagName];
    return Boolean(ALL_MATHML_TAGS[tagName]);
  };
  const _checkHtmlNamespace = function _checkHtmlNamespace2(tagName, parent, parentTagName) {
    if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) return false;
    if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) return false;
    return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
  };
  const _checkValidNamespace = function _checkValidNamespace2(element) {
    const elementNamespace = _readNamespaceURI(element);
    const tagName = stringToLowerCase(_readNodeName(element));
    const parentNode = getParentNode(element);
    let parent;
    let parentTagName;
    if (parentNode && _readNodeType(parentNode) === NODE_TYPE.element) {
      parent = { namespaceURI: _readNamespaceURI(parentNode) };
      parentTagName = stringToLowerCase(_readNodeName(parentNode));
    } else {
      parent = { namespaceURI: NAMESPACE };
      parentTagName = "template";
    }
    if (!ALLOWED_NAMESPACES[elementNamespace]) return false;
    if (elementNamespace === SVG_NAMESPACE) return _checkSvgNamespace(tagName, parent, parentTagName);
    if (elementNamespace === MATHML_NAMESPACE) return _checkMathMlNamespace(tagName, parent, parentTagName);
    if (elementNamespace === HTML_NAMESPACE) return _checkHtmlNamespace(tagName, parent, parentTagName);
    if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && ALLOWED_NAMESPACES[elementNamespace]) return true;
    return false;
  };
  const _forceRemove = function _forceRemove2(node) {
    arrayPush(DOMPurify.removed, { element: node });
    try {
      getParentNode(node).removeChild(node);
    } catch (_2) {
      remove(node);
      if (!getParentNode(node)) throw typeErrorCreate("a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place");
    }
  };
  const _stripAttributeNode = function _stripAttributeNode2(element, attribute, name) {
    try {
      removeAttributeNode(element, attribute);
    } catch (_2) {
      try {
        element.removeAttribute(name);
      } catch (_3) {
      }
    }
  };
  const _neutralizeRoot = function _neutralizeRoot2(root) {
    _neutralizeSubtree(root);
    const childNodes = getChildNodes(root);
    if (childNodes) arrayForEach(arraySlice(childNodes), (child) => {
      try {
        remove(child);
      } catch (_2) {
      }
    });
    const attributes = _readNodeType(root) === NODE_TYPE.element ? getAttributes(root) : null;
    if (attributes) for (let i2 = attributes.length - 1; i2 >= 0; --i2) {
      const attribute = attributes[i2];
      const name = attribute && attribute.name;
      if (typeof name === "string") _stripAttributeNode(root, attribute, name);
    }
  };
  const _removeAttribute = function _removeAttribute2(name, element, attr2) {
    if (!attr2) try {
      attr2 = element.getAttributeNode(name);
    } catch (_2) {
      attr2 = null;
    }
    arrayPush(DOMPurify.removed, {
      attribute: attr2 || null,
      from: element
    });
    try {
      if (attr2) removeAttributeNode(element, attr2);
      else element.removeAttribute(name);
    } catch (_2) {
      try {
        element.removeAttribute(name);
      } catch (_3) {
      }
    }
    if (name === "is") {
      if (RETURN_DOM || RETURN_DOM_FRAGMENT) try {
        _forceRemove(element);
      } catch (_2) {
      }
      else try {
        element.setAttribute(name, "");
      } catch (_2) {
      }
    }
  };
  const _stripDisallowedAttributes = function _stripDisallowedAttributes2(element) {
    const attributes = getAttributes(element);
    if (!attributes) return;
    for (let i2 = attributes.length - 1; i2 >= 0; --i2) {
      const attribute = attributes[i2];
      const name = attribute && attribute.name;
      if (typeof name !== "string" || ALLOWED_ATTR[transformCaseFunc(name)]) continue;
      _stripAttributeNode(element, attribute, name);
    }
  };
  const _walkTree = function _walkTree2(root, visit) {
    let intoShadow = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
    const stack = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (visit(node) === false) continue;
      if (intoShadow && _readNodeType(node) === NODE_TYPE.element) {
        const shadowRoot = getShadowRoot(node);
        if (_isDocumentFragment(shadowRoot)) stack.push(shadowRoot);
      }
      const childNodes = getChildNodes(node);
      if (childNodes) for (let i2 = childNodes.length - 1; i2 >= 0; --i2) stack.push(childNodes[i2]);
    }
  };
  const _neutralizeSubtree = function _neutralizeSubtree2(root) {
    _walkTree(root, (node) => {
      if (_readNodeType(node) === NODE_TYPE.element) _stripDisallowedAttributes(node);
    });
  };
  const _collectLiveNodes = function _collectLiveNodes2(root) {
    const nodes = [];
    _walkTree(root, (node) => {
      nodes.push(node);
    }, true);
    return nodes;
  };
  const _neutralizeEscapedElements = function _neutralizeEscapedElements2(root, before) {
    const reachable = setCreate();
    arrayForEach(_collectLiveNodes(root), (node) => {
      if (_readNodeType(node) === NODE_TYPE.element) setAdd(reachable, node);
    });
    arrayForEach(before, (node) => {
      if (_readNodeType(node) === NODE_TYPE.element && !setHas(reachable, node)) _stripDisallowedAttributes(node);
    });
  };
  const _neutralizeDiscarded = function _neutralizeDiscarded2(root, before) {
    let rootRemoved = false;
    arrayForEach(DOMPurify.removed, (entry) => {
      if (entry.element) {
        rootRemoved = rootRemoved || entry.element === root;
        _neutralizeSubtree(entry.element);
      }
    });
    _neutralizeEscapedElements(root, before);
    return rootRemoved;
  };
  const MAX_UNVISITED_ROUNDS = 8;
  const _sanitizeUnvisitedNodes = function _sanitizeUnvisitedNodes2(root, before) {
    const visited = IN_PLACE_VISITED;
    let original = null;
    const getOriginal = () => {
      if (!original) {
        original = setCreate();
        arrayForEach(before, (beforeNode) => {
          setAdd(original, beforeNode);
        });
      }
      return original;
    };
    for (let round = 0; ; round++) {
      const live = _collectLiveNodes(root);
      const containers = [root];
      let pending2 = false;
      arrayForEach(live, (node) => {
        if (_readNodeType(node) === NODE_TYPE.documentFragment) arrayPush(containers, node);
        else if (!pending2 && !setHas(visited, node)) pending2 = setHas(getOriginal(), node);
      });
      if (!pending2) return;
      if (round >= MAX_UNVISITED_ROUNDS) throw typeErrorCreate("the tree kept changing during in-place sanitization; refusing to return it");
      arrayForEach(containers, (container, index) => {
        _sanitizeUnvisitedIn(container, index > 0, root, getOriginal());
      });
    }
  };
  const _sanitizeUnvisitedIn = function _sanitizeUnvisitedIn2(container, inShadow, root, original) {
    const iterator = _createNodeIterator(container);
    let node;
    while (node = iterator.nextNode()) {
      if (!setHas(original, node) || setHas(IN_PLACE_VISITED, node)) continue;
      if (inShadow) _executeHooks(hooks.uponSanitizeShadowNode, node, null);
      _sanitizeElements(node, root);
      _sanitizeAttributes(node, root);
      if (_isDocumentFragment(node.content)) _sanitizeShadowDOM2(node.content);
    }
  };
  const _markVisited = function _markVisited2(node) {
    if (IN_PLACE_VISITED) setAdd(IN_PLACE_VISITED, node);
  };
  const _isPatchLinkageAttribute = function _isPatchLinkageAttribute2(lcName, lcTag) {
    if (!SAFE_FOR_XML) return false;
    if (lcName === "patchsrc") return true;
    return lcName === "for" && lcTag !== "label" && lcTag !== "output";
  };
  const _neutralizePatchLinkage = function _neutralizePatchLinkage2(root) {
    if (!SAFE_FOR_XML) return;
    _walkTree(root, (node) => {
      const nodeType = _readNodeType(node);
      if (nodeType === NODE_TYPE.processingInstruction || nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, node.data)) {
        try {
          remove(node);
        } catch (_2) {
        }
        return false;
      }
      if (nodeType === NODE_TYPE.element) {
        const element = node;
        const lcTag = transformCaseFunc(_readNodeName(node));
        try {
          if (element.hasAttribute && element.hasAttribute("patchsrc")) element.removeAttribute("patchsrc");
          if (element.hasAttribute && element.hasAttribute("for") && _isPatchLinkageAttribute("for", lcTag)) element.removeAttribute("for");
        } catch (_2) {
        }
      }
      return true;
    });
  };
  const _initDocument = function _initDocument2(dirty) {
    let doc = null;
    let leadingWhitespace = null;
    if (FORCE_BODY) dirty = "<remove></remove>" + dirty;
    else {
      const matches = stringMatch(dirty, /^[\r\n\t ]+/);
      leadingWhitespace = matches && matches[0];
    }
    if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && NAMESPACE === HTML_NAMESPACE) dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + "</body></html>";
    const dirtyPayload = trustedTypesPolicy ? _createTrustedHTML(dirty) : dirty;
    if (NAMESPACE === HTML_NAMESPACE) try {
      doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
    } catch (_2) {
    }
    if (!doc || !doc.documentElement) {
      doc = implementation.createDocument(NAMESPACE, "template", null);
      try {
        doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
      } catch (_2) {
      }
    }
    const body = doc.body || doc.documentElement;
    if (dirty && leadingWhitespace) body.insertBefore(document2.createTextNode(leadingWhitespace), body.childNodes[0] || null);
    if (NAMESPACE === HTML_NAMESPACE) return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? "html" : "body")[0];
    return WHOLE_DOCUMENT ? doc.documentElement : body;
  };
  const _createNodeIterator = function _createNodeIterator2(root) {
    const doc = getOwnerDocument ? getOwnerDocument(root) : root.ownerDocument;
    return createNodeIterator.call(doc || root, root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_PROCESSING_INSTRUCTION | NodeFilter.SHOW_CDATA_SECTION, null);
  };
  const _stripTemplateExpressions = function _stripTemplateExpressions2(value) {
    value = stringReplace(value, MUSTACHE_EXPR$1, " ");
    value = stringReplace(value, ERB_EXPR$1, " ");
    value = stringReplace(value, TMPLIT_EXPR$1, " ");
    return value;
  };
  const _scrubTemplateExpressions2 = function _scrubTemplateExpressions(node) {
    var _node$querySelectorAl;
    _scrubOwnCharacterData(node);
    const templates = (_node$querySelectorAl = node.querySelectorAll) === null || _node$querySelectorAl === void 0 ? void 0 : _node$querySelectorAl.call(node, "template");
    if (templates) arrayForEach(templates, (tmpl) => {
      if (_isDocumentFragment(tmpl.content)) _scrubTemplateExpressions2(tmpl.content);
    });
  };
  const _scrubOwnCharacterData = function _scrubOwnCharacterData2(node) {
    node.normalize();
    const doc = getOwnerDocument ? getOwnerDocument(node) : node.ownerDocument;
    const walker = createNodeIterator.call(doc || node, node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_CDATA_SECTION | NodeFilter.SHOW_PROCESSING_INSTRUCTION, null);
    let currentNode = walker.nextNode();
    while (currentNode) {
      currentNode.data = _stripTemplateExpressions(currentNode.data);
      currentNode = walker.nextNode();
    }
  };
  const _isClobbered = function _isClobbered2(element) {
    const realTagName = getNodeName ? getNodeName(element) : null;
    if (typeof realTagName !== "string") return false;
    if (transformCaseFunc(realTagName) !== "form") return false;
    return typeof element.nodeName !== "string" || typeof element.textContent !== "string" || typeof element.removeChild !== "function" || element.attributes !== getAttributes(element) || typeof element.removeAttribute !== "function" || typeof element.removeAttributeNode !== "function" || typeof element.getAttributeNode !== "function" || typeof element.setAttribute !== "function" || typeof element.namespaceURI !== "string" || typeof element.insertBefore !== "function" || typeof element.hasChildNodes !== "function" || element.nodeType !== getNodeType(element) || element.childNodes !== getChildNodes(element);
  };
  const _isDocumentFragment = function _isDocumentFragment2(value) {
    if (!getNodeType || typeof value !== "object" || value === null) return false;
    try {
      return getNodeType(value) === NODE_TYPE.documentFragment;
    } catch (_2) {
      return false;
    }
  };
  const _isNode = function _isNode2(value) {
    if (!getNodeType || typeof value !== "object" || value === null) return false;
    try {
      return typeof getNodeType(value) === "number";
    } catch (_2) {
      return false;
    }
  };
  function _executeHooks(hooks2, currentNode, data) {
    if (hooks2.length === 0) return;
    arrayForEach(hooks2, (hook) => {
      hook.call(DOMPurify, currentNode, data, CONFIG);
    });
  }
  const _isUnsafeNode = function _isUnsafeNode2(currentNode, tagName) {
    if (SAFE_FOR_XML && currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.textContent) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.innerHTML)) return true;
    if (SAFE_FOR_XML && LITERAL_TEXT_ELEMENTS[tagName] && _readNodeType(currentNode) === NODE_TYPE.element && _readNamespaceURI(currentNode) === HTML_NAMESPACE && (_isNode(currentNode.firstElementChild) || typeof currentNode.textContent === "string" && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.textContent))) return true;
    if (currentNode.nodeType === NODE_TYPE.processingInstruction) return true;
    if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, currentNode.data)) return true;
    return false;
  };
  const _matchesNameCheck = function _matchesNameCheck2(check, name) {
    if (check instanceof RegExp) return regExpTest(check, name);
    if (check instanceof Function) {
      for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) args[_key - 2] = arguments[_key];
      return Boolean(check(name, ...args));
    }
    return false;
  };
  const _sanitizeDisallowedNode = function _sanitizeDisallowedNode2(currentNode, tagName, root) {
    if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) return false;
    if (KEEP_CONTENT && !FORBID_CONTENTS[tagName] && !FORBID_CONTENTS[stringToLowerCase(tagName)]) {
      const parentNode = getParentNode(currentNode);
      const childNodes = getChildNodes(currentNode);
      if (childNodes && parentNode) {
        const childCount = childNodes.length;
        for (let i2 = childCount - 1; i2 >= 0; --i2) {
          const hoisted = currentNode === root ? cloneNode(childNodes[i2], true) : childNodes[i2];
          parentNode.insertBefore(hoisted, getNextSibling(currentNode));
        }
      }
    }
    _forceRemove(currentNode);
    return true;
  };
  const _forkSharedAllowlist = function _forkSharedAllowlist2(hookList, set, defaultSet, setConfigSet) {
    if (hookList.length === 0) return set;
    return set === defaultSet || set === setConfigSet ? clone(set) : set;
  };
  const _handleHookDetachedNode = function _handleHookDetachedNode2(currentNode, root) {
    if (currentNode === root || getParentNode(currentNode) !== null) return false;
    if (IN_PLACE) _neutralizeSubtree(currentNode);
    return true;
  };
  const _sanitizeElements = function _sanitizeElements2(currentNode, root) {
    _markVisited(currentNode);
    _executeHooks(hooks.beforeSanitizeElements, currentNode, null);
    if (_handleHookDetachedNode(currentNode, root)) return true;
    if (_isClobbered(currentNode)) {
      _forceRemove(currentNode);
      return true;
    }
    const tagName = transformCaseFunc(_readNodeName(currentNode));
    ALLOWED_TAGS = _forkSharedAllowlist(hooks.uponSanitizeElement, ALLOWED_TAGS, DEFAULT_ALLOWED_TAGS, SET_CONFIG_ALLOWED_TAGS);
    _executeHooks(hooks.uponSanitizeElement, currentNode, {
      tagName,
      allowedTags: ALLOWED_TAGS
    });
    if (_handleHookDetachedNode(currentNode, root)) return true;
    if (_isUnsafeNode(currentNode, tagName)) {
      _forceRemove(currentNode);
      return true;
    }
    if (FORBID_TAGS[tagName] || !(EXTRA_ELEMENT_HANDLING.tagCheck instanceof Function && EXTRA_ELEMENT_HANDLING.tagCheck(tagName)) && !ALLOWED_TAGS[tagName]) {
      const removed = _sanitizeDisallowedNode(currentNode, tagName, root);
      if (removed === false) {
        _executeHooks(hooks.afterSanitizeElements, currentNode, null);
        if (_handleHookDetachedNode(currentNode, root)) return true;
      }
      return removed;
    }
    if (_readNodeType(currentNode) === NODE_TYPE.element && !_checkValidNamespace(currentNode)) {
      _forceRemove(currentNode);
      return true;
    }
    if ((tagName === "noscript" || tagName === "noembed" || tagName === "noframes") && regExpTest(FALLBACK_TAG_CLOSE, currentNode.innerHTML)) {
      _forceRemove(currentNode);
      return true;
    }
    if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
      const content = _stripTemplateExpressions(currentNode.textContent);
      if (currentNode.textContent !== content) {
        arrayPush(DOMPurify.removed, { element: currentNode.cloneNode() });
        currentNode.textContent = content;
      }
    }
    _executeHooks(hooks.afterSanitizeElements, currentNode, null);
    return _handleHookDetachedNode(currentNode, root);
  };
  const _isValidAttribute = function _isValidAttribute2(lcTag, lcName, value) {
    if (FORBID_ATTR[lcName]) return false;
    if (_isPatchLinkageAttribute(lcName, lcTag)) return false;
    if (SANITIZE_DOM && (lcName === "id" || lcName === "name") && (value in document2 || value in formElement)) return false;
    const nameIsPermitted = ALLOWED_ATTR[lcName] || EXTRA_ELEMENT_HANDLING.attributeCheck instanceof Function && EXTRA_ELEMENT_HANDLING.attributeCheck(lcName, lcTag);
    if (ALLOW_DATA_ATTR && regExpTest(DATA_ATTR$1, lcName)) return true;
    if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR$1, lcName)) return true;
    if (!nameIsPermitted) return _isBasicCustomElement(lcTag) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName, lcTag) || lcName === "is" && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value);
    if (URI_SAFE_ATTRIBUTES[lcName]) return true;
    if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE$1, ""))) return true;
    if ((lcName === "src" || lcName === "xlink:href" || lcName === "href") && lcTag !== "script" && stringIndexOf(value, "data:") === 0 && DATA_URI_TAGS[lcTag]) return true;
    if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA$1, stringReplace(value, ATTR_WHITESPACE$1, ""))) return true;
    return !value;
  };
  const RESERVED_CUSTOM_ELEMENT_NAMES = addToSet({}, [
    "annotation-xml",
    "color-profile",
    "font-face",
    "font-face-format",
    "font-face-name",
    "font-face-src",
    "font-face-uri",
    "missing-glyph"
  ]);
  const _isBasicCustomElement = function _isBasicCustomElement2(tagName) {
    return !RESERVED_CUSTOM_ELEMENT_NAMES[stringToLowerCase(tagName)] && regExpTest(CUSTOM_ELEMENT$1, tagName);
  };
  const _applyTrustedTypesToAttribute = function _applyTrustedTypesToAttribute2(lcTag, lcName, namespaceURI, value) {
    if (trustedTypesPolicy && typeof trustedTypes === "object" && typeof trustedTypes.getAttributeType === "function" && !namespaceURI) switch (trustedTypes.getAttributeType(lcTag, lcName)) {
      case "TrustedHTML":
        return _createTrustedHTML(value);
      case "TrustedScriptURL":
        return _createTrustedScriptURL(value);
    }
    return value;
  };
  const _setAttributeValue = function _setAttributeValue2(currentNode, name, namespaceURI, value) {
    try {
      if (namespaceURI) currentNode.setAttributeNS(namespaceURI, name, value);
      else currentNode.setAttribute(name, value);
      if (_isClobbered(currentNode)) {
        _forceRemove(currentNode);
        return false;
      }
      return true;
    } catch (_2) {
      _removeAttribute(name, currentNode);
      return false;
    }
  };
  const _isUnsafeAttributeValue = function _isUnsafeAttributeValue2(name, value) {
    if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, value)) return true;
    return stringToLowerCase(name) === "attributename" && stringMatch(value, "href") !== null;
  };
  const _sanitizeAttributes = function _sanitizeAttributes2(currentNode, root) {
    _executeHooks(hooks.beforeSanitizeAttributes, currentNode, null);
    if (_handleHookDetachedNode(currentNode, root)) return;
    const attributes = currentNode.attributes;
    if (!attributes || _isClobbered(currentNode)) return;
    ALLOWED_ATTR = _forkSharedAllowlist(hooks.uponSanitizeAttribute, ALLOWED_ATTR, DEFAULT_ALLOWED_ATTR, SET_CONFIG_ALLOWED_ATTR);
    const hookEvent = {
      attrName: "",
      attrValue: "",
      keepAttr: true,
      allowedAttributes: ALLOWED_ATTR,
      forceKeepAttr: void 0
    };
    let l = attributes.length;
    const lcTag = transformCaseFunc(currentNode.nodeName);
    while (l--) {
      const attr2 = attributes[l];
      const name = attr2.name, namespaceURI = attr2.namespaceURI, attrValue = attr2.value;
      const lcName = transformCaseFunc(name);
      const initValue = attrValue;
      let value = name === "value" ? initValue : stringTrim(initValue);
      let recreatedNamedProp = false;
      hookEvent.attrName = lcName;
      hookEvent.attrValue = value;
      hookEvent.keepAttr = true;
      hookEvent.forceKeepAttr = void 0;
      _executeHooks(hooks.uponSanitizeAttribute, currentNode, hookEvent);
      value = hookEvent.attrValue;
      if (SANITIZE_NAMED_PROPS && (lcName === "id" || lcName === "name") && stringIndexOf(value, SANITIZE_NAMED_PROPS_PREFIX) !== 0) {
        _removeAttribute(name, currentNode, attr2);
        value = SANITIZE_NAMED_PROPS_PREFIX + value;
        recreatedNamedProp = true;
      }
      if (_isUnsafeAttributeValue(name, value)) {
        _removeAttribute(name, currentNode, attr2);
        continue;
      }
      if (hookEvent.forceKeepAttr) continue;
      if (!hookEvent.keepAttr) {
        _removeAttribute(name, currentNode, attr2);
        continue;
      }
      if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(SELF_CLOSING_TAG, value)) {
        _removeAttribute(name, currentNode, attr2);
        continue;
      }
      if (SAFE_FOR_TEMPLATES) value = _stripTemplateExpressions(value);
      if (!_isValidAttribute(lcTag, lcName, value)) {
        _removeAttribute(name, currentNode, attr2);
        continue;
      }
      value = _applyTrustedTypesToAttribute(lcTag, lcName, namespaceURI, value);
      if (value !== initValue) {
        if (_setAttributeValue(currentNode, name, namespaceURI, value) && recreatedNamedProp) arrayPop(DOMPurify.removed);
      }
    }
    _executeHooks(hooks.afterSanitizeAttributes, currentNode, null);
    _handleHookDetachedNode(currentNode, root);
  };
  const _sanitizeShadowDOM2 = function _sanitizeShadowDOM(fragment2) {
    let shadowNode = null;
    const shadowIterator = _createNodeIterator(fragment2);
    _executeHooks(hooks.beforeSanitizeShadowDOM, fragment2, null);
    while (shadowNode = shadowIterator.nextNode()) {
      _executeHooks(hooks.uponSanitizeShadowNode, shadowNode, null);
      _sanitizeElements(shadowNode, fragment2);
      _sanitizeAttributes(shadowNode, fragment2);
      if (_isDocumentFragment(shadowNode.content)) _sanitizeShadowDOM2(shadowNode.content);
      if (_readNodeType(shadowNode) === NODE_TYPE.element) {
        const innerSr = getShadowRoot(shadowNode);
        if (_isDocumentFragment(innerSr)) {
          _sanitizeAttachedShadowRoots(innerSr);
          _sanitizeShadowDOM2(innerSr);
        }
      }
    }
    if (SAFE_FOR_TEMPLATES) _scrubOwnCharacterData(fragment2);
    _executeHooks(hooks.afterSanitizeShadowDOM, fragment2, null);
  };
  const _sanitizeAttachedShadowRoots = function _sanitizeAttachedShadowRoots2(root) {
    const stack = [{
      node: root,
      shadow: null
    }];
    while (stack.length > 0) {
      const item = stack.pop();
      if (item.shadow) {
        _sanitizeShadowDOM2(item.shadow);
        continue;
      }
      const node = item.node;
      const isElement = _readNodeType(node) === NODE_TYPE.element;
      const childNodes = getChildNodes(node);
      if (childNodes) for (let i2 = childNodes.length - 1; i2 >= 0; --i2) stack.push({
        node: childNodes[i2],
        shadow: null
      });
      if (isElement) {
        const rootName = getNodeName ? getNodeName(node) : null;
        if (typeof rootName === "string" && transformCaseFunc(rootName) === "template") {
          const content = node.content;
          if (_isDocumentFragment(content)) stack.push({
            node: content,
            shadow: null
          });
        }
      }
      if (isElement) {
        const sr = getShadowRoot(node);
        if (_isDocumentFragment(sr)) stack.push({
          node: null,
          shadow: sr
        }, {
          node: sr,
          shadow: null
        });
      }
    }
  };
  DOMPurify.sanitize = function(dirty) {
    let cfg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    let body = null;
    let importedNode = null;
    let currentNode = null;
    let returnNode = null;
    IS_EMPTY_INPUT = !dirty;
    if (IS_EMPTY_INPUT) dirty = "<!-->";
    if (typeof dirty !== "string" && !_isNode(dirty)) {
      dirty = stringifyValue(dirty);
      if (typeof dirty !== "string") throw typeErrorCreate("dirty is not a string, aborting");
    }
    if (!DOMPurify.isSupported) return dirty;
    if (SET_CONFIG) {
      ALLOWED_TAGS = SET_CONFIG_ALLOWED_TAGS;
      ALLOWED_ATTR = SET_CONFIG_ALLOWED_ATTR;
    } else _parseConfig(cfg);
    if (hooks.uponSanitizeElement.length > 0 || hooks.uponSanitizeAttribute.length > 0) ALLOWED_TAGS = clone(ALLOWED_TAGS);
    if (hooks.uponSanitizeAttribute.length > 0) ALLOWED_ATTR = clone(ALLOWED_ATTR);
    DOMPurify.removed = [];
    const inPlace = IN_PLACE && typeof dirty !== "string" && _isNode(dirty);
    let inPlaceNodes = [];
    const outerVisited = IN_PLACE_VISITED;
    if (inPlace) {
      _neutralizePatchLinkage(dirty);
      const nn = _readNodeName(dirty);
      if (typeof nn === "string") {
        const tagName = transformCaseFunc(nn);
        if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
          _neutralizeRoot(dirty);
          throw typeErrorCreate("root node is forbidden and cannot be sanitized in-place");
        }
      }
      if (_isClobbered(dirty)) {
        _neutralizeRoot(dirty);
        throw typeErrorCreate("root node is clobbered and cannot be sanitized in-place");
      }
      inPlaceNodes = _collectLiveNodes(dirty);
      IN_PLACE_VISITED = setCreate();
    } else if (_isNode(dirty)) {
      body = _initDocument("<!---->");
      importedNode = body.ownerDocument.importNode(dirty, true);
      if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === "BODY") body = importedNode;
      else if (importedNode.nodeName === "HTML") body = importedNode;
      else body.appendChild(importedNode);
      _sanitizeAttachedShadowRoots(body);
    } else {
      if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT && dirty.indexOf("<") === -1) return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(dirty) : dirty;
      body = _initDocument(dirty);
      if (!body) return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : "";
    }
    if (body && FORCE_BODY) _forceRemove(body.firstChild);
    const walkRoot = inPlace ? dirty : body;
    try {
      if (inPlace) _sanitizeAttachedShadowRoots(dirty);
      const nodeIterator = _createNodeIterator(walkRoot);
      while (currentNode = nodeIterator.nextNode()) {
        _sanitizeElements(currentNode, walkRoot);
        _sanitizeAttributes(currentNode, walkRoot);
        if (_isDocumentFragment(currentNode.content)) _sanitizeShadowDOM2(currentNode.content);
      }
      if (inPlace) _sanitizeUnvisitedNodes(dirty, inPlaceNodes);
    } catch (error) {
      if (inPlace) {
        _neutralizeRoot(dirty);
        _neutralizeDiscarded(dirty, inPlaceNodes);
      }
      throw error;
    } finally {
      IN_PLACE_VISITED = outerVisited;
    }
    if (inPlace) {
      if (_neutralizeDiscarded(dirty, inPlaceNodes)) throw typeErrorCreate("a node selected for removal could not be safely returned; refusing to sanitize in place");
      if (SAFE_FOR_TEMPLATES) _scrubTemplateExpressions2(dirty);
      return dirty;
    }
    if (RETURN_DOM) {
      if (SAFE_FOR_TEMPLATES) _scrubTemplateExpressions2(body);
      if (RETURN_DOM_FRAGMENT) {
        returnNode = createDocumentFragment.call(body.ownerDocument);
        while (body.firstChild) returnNode.appendChild(body.firstChild);
      } else returnNode = body;
      if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode) returnNode = importNode.call(originalDocument, returnNode, true);
      return returnNode;
    }
    let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
    if (WHOLE_DOCUMENT && ALLOWED_TAGS["!doctype"] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) serializedHTML = "<!DOCTYPE " + body.ownerDocument.doctype.name + ">\n" + serializedHTML;
    if (SAFE_FOR_TEMPLATES) serializedHTML = _stripTemplateExpressions(serializedHTML);
    return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(serializedHTML) : serializedHTML;
  };
  DOMPurify.setConfig = function() {
    let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    _parseConfig(cfg);
    SET_CONFIG = true;
    SET_CONFIG_ALLOWED_TAGS = ALLOWED_TAGS;
    SET_CONFIG_ALLOWED_ATTR = ALLOWED_ATTR;
  };
  DOMPurify.clearConfig = function() {
    CONFIG = null;
    SET_CONFIG = false;
    SET_CONFIG_ALLOWED_TAGS = null;
    SET_CONFIG_ALLOWED_ATTR = null;
    trustedTypesPolicy = defaultTrustedTypesPolicy;
    emptyHTML = "";
  };
  DOMPurify.isValidAttribute = function(tag, attr2, value) {
    if (!CONFIG) _parseConfig({});
    const lcTag = transformCaseFunc(tag);
    const lcName = transformCaseFunc(attr2);
    if (typeof value === "string" && (_isUnsafeAttributeValue(attr2, value) || !ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(SELF_CLOSING_TAG, value))) return false;
    return _isValidAttribute(lcTag, lcName, value);
  };
  DOMPurify.addHook = function(entryPoint, hookFunction) {
    if (typeof hookFunction !== "function") return;
    if (!objectHasOwnProperty(hooks, entryPoint)) return;
    arrayPush(hooks[entryPoint], hookFunction);
  };
  DOMPurify.removeHook = function(entryPoint, hookFunction) {
    if (!objectHasOwnProperty(hooks, entryPoint)) return;
    if (hookFunction !== void 0) {
      const index = arrayLastIndexOf(hooks[entryPoint], hookFunction);
      return index === -1 ? void 0 : arraySplice(hooks[entryPoint], index, 1)[0];
    }
    return arrayPop(hooks[entryPoint]);
  };
  DOMPurify.removeHooks = function(entryPoint) {
    if (!objectHasOwnProperty(hooks, entryPoint)) return;
    hooks[entryPoint] = [];
  };
  DOMPurify.removeAllHooks = function() {
    hooks = _createHooksMap();
  };
  return DOMPurify;
}
var purify_default = createDOMPurify();

// app/ui/view-state.js
var visible = /* @__PURE__ */ new Set(["user", "text", "thinking", "tool-start", "tool-end", "tool-output", "subagent", "plan", "diff", "approval", "approval-resolved", "question", "error", "notice", "usage", "turn-end", "media", "attachments-discarded", "upstream-error", "steer-state"]);
function appendDisplayEvent(events, event) {
  if (event.type === "content-replace") {
    const indices = [];
    events.forEach((item, index) => {
      if (item.type === event.channel && item.attemptId === event.attemptId && event.attemptId) indices.push(index);
    });
    if (indices.length) {
      events[indices[0]] = { ...event, type: event.channel, id: events[indices[0]].id ?? event.id };
      for (const index of indices.slice(1).reverse()) events.splice(index, 1);
      return;
    }
    event = { ...event, type: event.channel };
  }
  if (!visible.has(event.type)) return;
  const last = events.at(-1);
  if (["text", "thinking", "tool-output"].includes(event.type) && last?.type === event.type && last.turnId === event.turnId && last.itemId === event.itemId && last.toolId === event.toolId && last.attemptId === event.attemptId && typeof event.text === "string" && typeof last.text === "string") last.text += event.text;
  else events.push({ ...event });
}
function displayEvents(events) {
  const result = [];
  for (const event of events) appendDisplayEvent(result, event);
  return result;
}
var WorkspaceViews = class {
  constructor() {
    this.projects = /* @__PURE__ */ new Map();
    this.terminals = /* @__PURE__ */ new Map();
    this.drafts = /* @__PURE__ */ new Map();
  }
  draftKey(state2) {
    return (state2.projectId ?? "none") + ":" + (state2.sessionId ?? "draft");
  }
  saveDraft(state2) {
    this.drafts.set(this.draftKey(state2), state2.draft);
  }
  loadDraft(state2) {
    state2.draft = this.drafts.get(this.draftKey(state2)) ?? "";
  }
  stash(state2) {
    if (state2.projectId) this.projects.set(state2.projectId, { file: state2.file, dirty: state2.dirty, tree: state2.tree, expanded: state2.expanded, git: state2.git });
  }
  activate(state2, projectId) {
    if (state2.projectId !== projectId) {
      this.stash(state2);
      state2.projectId = projectId;
      Object.assign(state2, this.projects.get(projectId) ?? { file: null, dirty: false, tree: /* @__PURE__ */ new Map(), expanded: /* @__PURE__ */ new Set(), git: null });
    }
    const terminal = this.terminal(projectId);
    state2.terminalText = terminal.text;
    state2.terminalBusy = terminal.running;
  }
  saved(state2, projectId, file) {
    const view = this.projects.get(projectId);
    if (view?.file?.path === file.path) {
      view.file = file;
      view.dirty = false;
    }
    if (state2.projectId === projectId && state2.file?.path === file.path) {
      state2.file = file;
      state2.dirty = false;
    }
  }
  anyDirty(state2) {
    return state2.dirty || [...this.projects.entries()].some(([id, view]) => id !== state2.projectId && view.dirty);
  }
  terminal(projectId) {
    if (!this.terminals.has(projectId)) this.terminals.set(projectId, { text: "", running: false });
    return this.terminals.get(projectId);
  }
  terminalEvent(event) {
    const value = this.terminal(event.projectId);
    value.revision = (value.revision ?? 0) + 1;
    if (event.type === "terminal") value.text = (value.text + event.text).slice(-2 * 1024 * 1024);
    else if (event.type === "terminal-exit") {
      value.running = false;
      value.text += "\n[\u9000\u51FA\u4EE3\u7801 " + event.code + "]\n";
    } else if (event.type === "terminal-start") value.running = true;
    return value;
  }
};

// app/ui/icons.js
var paths = {
  plus: "M12 5v14M5 12h14",
  folder: "M3.5 7.5a2 2 0 0 1 2-2h3.6l2 2h7.4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-9Z",
  folderPlus: "M3.5 7.5a2 2 0 0 1 2-2h3.6l2 2h7.4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-9ZM12 10.5v5M9.5 13h5",
  chevronRight: "m9.5 6 6 6-6 6",
  chevronDown: "m6 9.5 6 6 6-6",
  panelLeft: "M4.5 4.5h15a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1ZM9.5 4.5v15",
  panelRight: "M4.5 4.5h15a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1ZM14.5 4.5v15",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
  search: "M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm8.5 15-3.9-3.9",
  terminal: "m5.5 7.5 4.5 4.5-4.5 4.5M12.5 16.5h6",
  git: "M6.5 4v10.5M17.5 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM17.5 9.5c0 5-4 6.5-9 7.5",
  file: "M13.5 3.5h-6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-10l-5-5Zm0 0v5h5",
  fileDiff: "M13.5 3.5h-6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-10l-5-5Zm0 0v5h5M12 11v5M9.5 13.5h5",
  check: "m5 12.5 4.5 4.5L19 7.5",
  close: "M17.5 6.5l-11 11M6.5 6.5l11 11",
  arrowUp: "M12 19V5.5M6 11.5l6-6 6 6",
  arrowLeft: "M19 12H5.5M11.5 6l-6 6 6 6",
  spark: "M12 3.5c.5 3.9 1.6 5.9 3.3 7.2 1.3 1 2.9 1.4 5.2 1.3-2.3 0-3.9.4-5.2 1.4-1.7 1.3-2.8 3.3-3.3 7.1-.5-3.8-1.6-5.8-3.3-7.1C7.4 12.4 5.8 12 3.5 12c2.3.1 3.9-.3 5.2-1.3 1.7-1.3 2.8-3.3 3.3-7.2Z",
  cpu: "M7 7h10v10H7V7Zm3-3.5V7m4-3.5V7m-4 10v3.5m4-3.5v3.5M3.5 10H7m-3.5 4H7m10-4h3.5M17 14h3.5",
  layers: "m12 3.5 8.5 4.5-8.5 4.5L3.5 8 12 3.5ZM3.5 12l8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5",
  bulb: "M9 17.5h6M10 20.5h4M12 3.5a5.5 5.5 0 0 0-3.4 9.8c.6.5.9 1.2.9 2V15.5h5v-.2c0-.8.3-1.5.9-2A5.5 5.5 0 0 0 12 3.5Z",
  window: "M4.5 5.5h15v13h-15v-13ZM4.5 9.5h15",
  refresh: "M19.5 12a7.5 7.5 0 0 1-13 5.1M4.5 12a7.5 7.5 0 0 1 13-5.1M19.5 4.5v4h-4M4.5 19.5v-4h4",
  external: "M14 4.5h5.5V10M19.5 4.5 11 13M18 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H10",
  archive: "M4 5h16v4H4V5Zm1.5 4v9.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9M10 12.5h4",
  edit: "M4.5 19.5h4l10-10-4-4-10 10v4ZM13 7l4 4",
  copy: "M9 9h10.5v10.5H9V9ZM5 15H4.5V4.5H15V5",
  more: "M6 12h.01M12 12h.01M18 12h.01",
  clock: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 7.5V12l3 2",
  alert: "M12 9.5v4M12 17h.01M10.3 4.2 3 17a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z",
  lock: "M6.5 11h11v8.5h-11V11Zm2-.5V8a3.5 3.5 0 0 1 7 0v2.5",
  activity: "M3.5 12h3.5l2.5-6.5 5 13 2.5-6.5h3.5",
  zap: "M13 3.5 5 13.5h6l-1 7 8-10h-6l1-7Z",
  database: "M12 3.5c4.1 0 7.5 1.3 7.5 3s-3.4 3-7.5 3-7.5-1.3-7.5-3 3.4-3 7.5-3Zm-7.5 3v5.5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6.5M4.5 12v5.5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V12",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4",
  moon: "M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z",
  monitor: "M3.5 5h17v11h-17V5ZM9 20h6M12 16v4",
  tool: "M14.5 6.5a4 4 0 0 0-5 5L3.5 17.5l3 3 6-6a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5 2.5-2.5Z",
  bot: "M12 4.5V7M6.5 7h11a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2ZM9.5 12.5h.01M14.5 12.5h.01M2.5 12v3M21.5 12v3",
  list: "M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01",
  info: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 11v5.5M12 7.5h.01",
  shield: "M12 3.5 5.5 6v5.2c0 4.1 2.7 7.6 6.5 9.3 3.8-1.7 6.5-5.2 6.5-9.3V6L12 3.5Z",
  shieldCheck: "M12 3.5 5.5 6v5.2c0 4.1 2.7 7.6 6.5 9.3 3.8-1.7 6.5-5.2 6.5-9.3V6L12 3.5ZM9.2 12.2l2 2 3.8-3.9",
  key: "M14.5 9.5a5 5 0 1 0-4.6 5L8 16.5v2H6v2H3.5V18l6.1-6.1M15.5 8.5h.01",
  keyboard: "M3.5 6.5h17v11h-17v-11ZM7 10h.01M10.5 10h.01M14 10h.01M17.5 10h.01M7.5 14h9",
  paperclip: "m20 11.2-7.9 7.9a5 5 0 0 1-7.1-7.1l7.9-7.9a3.4 3.4 0 0 1 4.8 4.8l-7.9 7.9a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3",
  image: "M5.5 4.5h13a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1ZM9 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM19.5 15.5l-4.5-4.5-9.5 8.5",
  film: "M4.5 5.5h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1ZM10 9.3v5.4l4.5-2.7L10 9.3Z",
  music: "M9 18.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM20 16.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM9 18.5V6.5l11-2v12",
  download: "M12 4.5v10.5M7.5 10.5 12 15l4.5-4.5M5 19.5h14",
  expand: "M14.5 4.5h5v5M19.5 4.5l-6 6M9.5 19.5h-5v-5M4.5 19.5l6-6",
  plug: "M9 3.5v4M15 3.5v4M6.5 7.5h11v3a5.5 5.5 0 0 1-11 0v-3ZM12 16v4.5",
  play: "M7.5 5.5v13l11-6.5-11-6.5Z",
  eye: "M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12ZM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  stop: ""
};
var heavy = /* @__PURE__ */ new Set(["more"]);
function icon(name, extra = "") {
  if (name === "stop") return `<svg viewBox="0 0 24 24" aria-hidden="true" class="icon ${extra}"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/></svg>`;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${heavy.has(name) ? 3 : 1.6}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="icon ${extra}"><path d="${paths[name] ?? paths.spark}"/></svg>`;
}
function logo(size = 22) {
  return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--accent)"/><path d="M6.5 21.5h19M9 21.5v-3.2a7 7 0 0 1 14 0v3.2M13 21.5v-2.8a3 3 0 0 1 6 0v2.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22.5 8.5v4M20.5 10.5h4" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/></svg>`;
}

// app/ui/metrics.js
var count = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
var pick = (...values) => {
  for (const value of values) {
    const n = count(value);
    if (n !== null) return n;
  }
  return null;
};
var cjk = /[⺀-鿿가-힯豈-﫿＀-￯]/g;
function estimateTokens(text3) {
  if (typeof text3 !== "string" || !text3) return 0;
  const wide = (text3.match(cjk) ?? []).length;
  return wide * 0.7 + (text3.length - wide) / 3.6;
}
function shape(v2) {
  if (v2.input === null && v2.output === null) return null;
  const status = v2.cached === null || v2.cached === void 0 ? "not_reported" : v2.cacheStatus === "estimated" ? "estimated" : "reported";
  return {
    input: v2.input,
    output: v2.output,
    cached: status === "not_reported" ? null : v2.cached,
    reasoning: v2.reasoning ?? null,
    window: v2.window ?? null,
    cacheStatus: status,
    firstTokenMs: v2.firstTokenMs ?? null,
    durationMs: v2.durationMs ?? null
  };
}
function readUsage(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.last && typeof raw.last === "object") {
    const u2 = raw.last;
    return shape({
      input: pick(u2.inputTokens, u2.input_tokens),
      output: pick(u2.outputTokens, u2.output_tokens),
      cached: pick(u2.cachedInputTokens, u2.cached_input_tokens),
      reasoning: pick(u2.reasoningOutputTokens, u2.reasoning_output_tokens),
      window: pick(raw.modelContextWindow, raw.model_context_window)
    });
  }
  const u = raw.usage && typeof raw.usage === "object" && !("prompt_tokens" in raw) ? raw.usage : raw;
  if ("prompt_tokens" in u || "completion_tokens" in u) return shape({
    input: pick(u.prompt_tokens),
    output: pick(u.completion_tokens),
    cached: pick(u.cached_tokens, u.prompt_tokens_details?.cached_tokens),
    reasoning: pick(u.reasoning_tokens, u.completion_tokens_details?.reasoning_tokens),
    window: pick(u.context_window),
    cacheStatus: u.cache_status,
    firstTokenMs: pick(u.first_token_ms),
    durationMs: pick(u.duration_ms)
  });
  if ("input_tokens" in u || "output_tokens" in u) {
    const read = pick(u.cache_read_input_tokens), write = pick(u.cache_creation_input_tokens), base = pick(u.input_tokens);
    return shape({ input: base === null ? null : base + (read ?? 0) + (write ?? 0), output: pick(u.output_tokens), cached: read });
  }
  if ("inputTokens" in u || "outputTokens" in u) return shape({
    input: pick(u.inputTokens),
    output: pick(u.outputTokens),
    cached: pick(u.cachedInputTokens, u.cacheReadInputTokens),
    reasoning: pick(u.reasoningOutputTokens, u.reasoningTokens)
  });
  if ("input" in u && "output" in u) {
    const read = pick(u.cacheRead), write = pick(u.cacheWrite), base = pick(u.input);
    return shape({ input: base === null ? null : base + (read ?? 0) + (write ?? 0), output: pick(u.output), cached: read });
  }
  return null;
}
var SessionMetrics = class {
  constructor() {
    this.clear();
  }
  clear() {
    this.requests = [];
    this.cumulative = null;
    this.window = null;
    this.samples = [];
    this.segment = null;
    this.lastDeltaAt = null;
  }
  feed(event) {
    const t = Date.parse(event.at ?? "") || Date.now();
    if (event.type === "text" || event.type === "thinking") {
      const tokens = estimateTokens(event.text);
      if (!tokens) return;
      this.segment ??= { first: t, last: t, tokens: 0 };
      this.segment.last = t;
      this.segment.tokens += tokens;
      this.lastDeltaAt = t;
      this.samples.push({ t, tokens });
      if (this.samples.length > 600) this.samples.splice(0, 300);
    } else if (event.type === "usage") {
      const usage = readUsage(event.data);
      if (!usage) return;
      if (event.scope === "native-session") {
        this.cumulative = usage;
        return;
      }
      const segment = this.segment;
      this.segment = null;
      let rate = null, estimated = false;
      if (usage.output && usage.durationMs) {
        const ms = usage.durationMs - (usage.firstTokenMs ?? 0);
        if (ms >= 250) rate = usage.output / (ms / 1e3);
      } else if (usage.output && segment && segment.last - segment.first >= 400) rate = usage.output / ((segment.last - segment.first) / 1e3);
      else if (segment && segment.last - segment.first >= 400) {
        rate = segment.tokens / ((segment.last - segment.first) / 1e3);
        estimated = true;
      }
      if (usage.window) this.window = usage.window;
      this.requests.push({ ...usage, at: t, turnId: event.turnId ?? null, rate, rateEstimated: estimated, auxiliary: event.data?.auxiliary === true });
    } else if (event.type === "native-event" && event.name === "request/context" && count(event.data?.contextWindow)) this.window = event.data.contextWindow;
    else if (event.type === "turn-end") this.segment = null;
  }
  /** The latest request with a prompt count; `main` skips the gateway's auxiliary requests when there is any other. */
  lastRequest({ main: main2 = false } = {}) {
    for (let i2 = this.requests.length - 1; i2 >= 0; i2--) {
      const r = this.requests[i2];
      if (r.input !== null && (!main2 || !r.auxiliary)) return r;
    }
    return main2 ? this.lastRequest() : null;
  }
  context(fallbackWindow) {
    const last = this.lastRequest({ main: true }), window2 = last?.window ?? this.window ?? fallbackWindow ?? null;
    if (!last) return { used: null, window: window2, ratio: null };
    const used = last.input + (last.output ?? 0);
    return { used, window: window2, ratio: window2 ? Math.min(1, used / window2) : null };
  }
  cache() {
    const known = this.requests.filter((r) => r.input > 0 && r.cached !== null);
    if (known.length) {
      const main2 = known.filter((r) => !r.auxiliary), last = (main2.length ? main2 : known).at(-1), input = known.reduce((n, r) => n + r.input, 0), cached = known.reduce((n, r) => n + r.cached, 0);
      return { ratio: last.cached / last.input, status: last.cacheStatus, sessionRatio: cached / input, requests: known.length };
    }
    const c = this.cumulative;
    if (c?.input > 0 && c.cached !== null) return { ratio: c.cached / c.input, status: c.cacheStatus, sessionRatio: c.cached / c.input, requests: 0 };
    return null;
  }
  rate(now = Date.now(), live = false) {
    if (live && this.lastDeltaAt && now - this.lastDeltaAt < 4e3) {
      const recent = this.samples.filter((s) => now - s.t <= 5e3);
      if (recent.length > 1) {
        const span = Math.max(1e3, now - recent[0].t), tokens = recent.reduce((n, s) => n + s.tokens, 0);
        return { value: tokens / (span / 1e3), estimated: true, live: true };
      }
    }
    let side = null;
    for (let i2 = this.requests.length - 1; i2 >= 0; i2--) {
      const r = this.requests[i2];
      if (!r.rate) continue;
      if (!r.auxiliary) return { value: r.rate, estimated: r.rateEstimated, live: false };
      side ??= { value: r.rate, estimated: r.rateEstimated, live: false };
    }
    return side;
  }
  turn(turnId) {
    const rows = this.requests.filter((r) => r.turnId === turnId);
    if (!rows.length) return null;
    const sum = (key) => rows.every((r) => r[key] !== null) ? rows.reduce((n, r) => n + r[key], 0) : null;
    const known = rows.filter((r) => r.cached !== null && r.input > 0), mainKnown = known.filter((r) => !r.auxiliary), cachedRows = mainKnown.length ? mainKnown : known;
    return {
      requests: rows.length,
      input: sum("input"),
      output: sum("output"),
      cacheRatio: cachedRows.length ? cachedRows.reduce((n, r) => n + r.cached, 0) / cachedRows.reduce((n, r) => n + r.input, 0) : null,
      cacheStatus: cachedRows.some((r) => r.cacheStatus === "estimated") ? "estimated" : cachedRows.length ? "reported" : "not_reported"
    };
  }
};

// app/ui/activity.js
function acpArgs(data) {
  const text3 = data?.sessionUpdate === "tool_call_update" ? null : data?.content?.[0]?.content?.text;
  if (typeof text3 !== "string") return null;
  try {
    const value = JSON.parse(text3);
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}
function argsOf(data) {
  let value = data?.arguments ?? data?.rawInput ?? data?.input ?? data?.parameters ?? data?.item ?? acpArgs(data) ?? data;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return { text: value };
    }
  }
  return value && typeof value === "object" ? value : {};
}
function toolSummary(event) {
  const d = event?.data ?? {}, v2 = Object.fromEntries(Object.entries(argsOf(d)).map(([k, x2]) => [k.toLowerCase(), x2]));
  const command = Array.isArray(v2.command) ? v2.command.join(" ") : v2.command ?? v2.commandline;
  const text3 = (x2) => typeof x2 === "string" && x2.trim(), wanted = [v2.pattern, v2.query].find(text3), place = [v2.path, v2.searchpath, v2.directorypath].find(text3);
  const first = [command, wanted && place ? `${wanted} \xB7 ${place}` : null, v2.file_path, v2.path, v2.absolutepath, v2.targetfile, v2.directorypath, v2.searchpath, v2.pattern, v2.query, Array.isArray(v2.queries) ? v2.queries.join(", ") : null, v2.url, v2.skill, v2.description, v2.prompt, v2.text, Array.isArray(v2.questions) ? v2.questions[0]?.question : null, d.title, d.tool_name].find((x2) => typeof x2 === "string" && x2.trim());
  if (first) return first.replace(/\s+/g, " ").slice(0, 160);
  if (Array.isArray(v2.changes)) return v2.changes.map((c) => c.path).filter(Boolean).join(", ").slice(0, 160);
  if (Array.isArray(d.locations)) return d.locations.map((l) => l.path).filter(Boolean).join(", ").slice(0, 160);
  return "";
}
var TOOL_KINDS = [
  // Claude Code's own tools whose names the generic patterns below would misread.
  [/^toolsearch$/i, "\u52A0\u8F7D\u5DE5\u5177", "\u6B63\u5728\u52A0\u8F7D\u5DE5\u5177\u5B9A\u4E49"],
  [/^skill$/i, "\u4F7F\u7528\u6280\u80FD", "\u6B63\u5728\u4F7F\u7528\u6280\u80FD"],
  [/^askuserquestion$/i, "\u63D0\u95EE", "\u6B63\u5728\u7B49\u4F60\u56DE\u7B54"],
  [/^(enter|exit)planmode$/i, "\u8BA1\u5212\u6A21\u5F0F", "\u6B63\u5728\u5207\u6362\u8BA1\u5212\u6A21\u5F0F"],
  [/^(enter|exit)worktree$/i, "\u5207\u6362\u5DE5\u4F5C\u6811", "\u6B63\u5728\u5207\u6362\u5DE5\u4F5C\u6811"],
  [/^(taskstop|sendmessage|listagents)$/i, "\u5B50\u4EE3\u7406", "\u6B63\u5728\u7BA1\u7406\u5B50\u4EE3\u7406"],
  [/^(cron(create|delete|list)|schedulewakeup)$/i, "\u5B9A\u65F6\u4EFB\u52A1", "\u6B63\u5728\u8BBE\u7F6E\u5B9A\u65F6\u4EFB\u52A1"],
  [/^workflow$/i, "\u5DE5\u4F5C\u6D41", "\u6B63\u5728\u8FD0\u884C\u5DE5\u4F5C\u6D41"],
  [/^reportfindings$/i, "\u63D0\u4EA4\u7ED3\u8BBA", "\u6B63\u5728\u63D0\u4EA4\u5BA1\u67E5\u7ED3\u8BBA"],
  [/mcp/i, "MCP \u5DE5\u5177", "\u6B63\u5728\u8C03\u7528 MCP \u5DE5\u5177"],
  [/web_?search|search_?web/i, "\u8054\u7F51\u641C\u7D22", "\u6B63\u5728\u8054\u7F51\u641C\u7D22"],
  [/fetch|url|browser|http|web/i, "\u8BFB\u53D6\u7F51\u9875", "\u6B63\u5728\u8BFB\u53D6\u7F51\u9875"],
  [/agent|collab|delegate|spawn|^task$/i, "\u5B50\u4EE3\u7406", "\u5B50\u4EE3\u7406\u6B63\u5728\u5DE5\u4F5C"],
  [/todo|plan/i, "\u66F4\u65B0\u8BA1\u5212", "\u6B63\u5728\u66F4\u65B0\u8BA1\u5212"],
  [/^think/i, "\u601D\u8003\u4E2D", "\u6B63\u5728\u601D\u8003"],
  [/image/i, "\u751F\u6210\u56FE\u7247", "\u6B63\u5728\u751F\u6210\u56FE\u7247"],
  [/edit|write|patch|filechange|replace|create|delete|remove|move|rename|apply|insert/i, "\u4FEE\u6539\u6587\u4EF6", "\u6B63\u5728\u4FEE\u6539\u6587\u4EF6"],
  [/command|shell|bash|exec|terminal|powershell|^run|script/i, "\u8FD0\u884C\u547D\u4EE4", "\u6B63\u5728\u8FD0\u884C\u547D\u4EE4"],
  [/list_?dir|^ls$|tree/i, "\u6D4F\u89C8\u76EE\u5F55", "\u6B63\u5728\u6D4F\u89C8\u76EE\u5F55"],
  [/read|view|^cat$|open/i, "\u8BFB\u53D6\u6587\u4EF6", "\u6B63\u5728\u8BFB\u53D6\u6587\u4EF6"],
  [/grep|glob|search|find|^rg$/i, "\u641C\u7D22\u4EE3\u7801", "\u6B63\u5728\u641C\u7D22\u4EE3\u7801"]
];
var ACP_ALIAS = { search: "grep", execute: "exec" };
var clip = (text3, max = 80) => {
  const s = String(text3 ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
};
function toolActivity(event) {
  const d = event?.data ?? {}, name = String(event?.name ?? d.name ?? d.tool_name ?? "\u5DE5\u5177");
  const probes = [d.kind && d.kind !== "other" ? ACP_ALIAS[d.kind] ?? d.kind : null, name, d.type].filter((x2) => typeof x2 === "string" && x2);
  let hit = null;
  for (const probe of probes) {
    hit = TOOL_KINDS.find(([re2]) => re2.test(probe));
    if (hit) break;
  }
  const summary = toolSummary(event) || (d.server && d.tool ? `${d.server} \xB7 ${d.tool}` : "");
  if (!hit) return { kind: "tool", short: "\u8C03\u7528\u5DE5\u5177", long: "\u6B63\u5728\u8C03\u7528\u5DE5\u5177", detail: summary && summary !== name ? `${name} \xB7 ${summary}` : name };
  return { kind: "tool", short: hit[1], long: hit[2], detail: summary };
}
function gatewayNotice(text3) {
  const s = String(text3 ?? "");
  let m = /Still waiting for Qoder \((\d+)s/i.exec(s);
  if (m) return { kind: "upstream", short: "\u7B49\u5F85\u4E0A\u6E38", long: "\u7B49\u5F85 Qoder \u4E0A\u6E38\u54CD\u5E94", detail: `${m[1]} \u79D2\u6CA1\u6709\u8F93\u51FA`, transient: true };
  m = /upstream retry (\d+)\/(\d+)(?: \(HTTP (\d+)\))?; next attempt in (\d+)s/i.exec(s);
  if (m) return { kind: "retry", short: "\u91CD\u8BD5\u4E2D", long: `Qoder \u4E0A\u6E38\u8BF7\u6C42\u91CD\u8BD5 ${m[1]}/${m[2]}`, detail: [m[3] && `HTTP ${m[3]}`, `${m[4]} \u79D2\u540E\u91CD\u8BD5`].filter(Boolean).join(" \xB7 ") };
  return null;
}
function failureText(f2) {
  if (!f2 || typeof f2 !== "object") return clip(f2, 60);
  const status = f2.status ?? f2.httpStatus ?? f2.statusCode;
  return clip([Number.isInteger(status) ? `HTTP ${status}` : null, f2.code, f2.kind, f2.message].find((x2) => typeof x2 === "string" && x2) ?? "", 60);
}
var fresh = (at2) => ({ phase: "request", at: at2, tools: /* @__PURE__ */ new Map(), approvals: /* @__PURE__ */ new Map(), note: null, compacting: false });
var STATES = {
  request: { kind: "request", short: "\u7B49\u5F85\u54CD\u5E94", long: "\u7B49\u5F85\u6A21\u578B\u54CD\u5E94", detail: "" },
  thinking: { kind: "thinking", short: "\u601D\u8003\u4E2D", long: "\u6B63\u5728\u601D\u8003", detail: "" },
  writing: { kind: "writing", short: "\u8F93\u51FA\u4E2D", long: "\u6B63\u5728\u8F93\u51FA\u56DE\u590D", detail: "" }
};
var ActivityTracker = class {
  constructor() {
    this.sessions = /* @__PURE__ */ new Map();
  }
  reset(id) {
    this.sessions.delete(id);
  }
  /** Rebuild one session from its stored events, e.g. after the renderer reloads mid-turn. */
  replay(id, events) {
    this.sessions.delete(id);
    for (const event of events) this.feed(event, id);
  }
  feed(event, id = event.sessionId) {
    if (!id || !event) return;
    if (event.type === "user" && event.delivery === "steer") return;
    if (event.type === "user") {
      this.sessions.set(id, fresh(event.at));
      return;
    }
    let r = this.sessions.get(id);
    if (!r) {
      r = fresh(event.at);
      this.sessions.set(id, r);
    }
    if (event.type === "turn-end") {
      r.ended = true;
      return;
    }
    const type = event.type === "content-replace" ? event.channel : event.type, key = event.toolId ?? event.data?.callId ?? event.id;
    switch (type) {
      case "thinking":
      case "text":
        r.phase = type === "text" ? "writing" : "thinking";
        r.note = null;
        r.tools.clear();
        break;
      case "tool-start":
      case "tool-output": {
        const known = r.tools.get(key);
        if (type === "tool-start" || !known) r.tools.set(key, { event: type === "tool-start" || !known ? event : known.event, root: known?.root });
        r.note = null;
        break;
      }
      case "tool-end":
        r.tools.delete(key);
        for (const [k, t] of r.tools) if (t.root === key) r.tools.delete(k);
        if (!r.tools.size) r.phase = "request";
        break;
      case "approval":
      case "question":
        r.approvals.set(event.approvalId, event);
        break;
      case "approval-resolved":
        r.approvals.delete(event.approvalId);
        break;
      case "subagent":
        r.note = { kind: "subagent", short: "\u5B50\u4EE3\u7406", long: "\u5B50\u4EE3\u7406\u6B63\u5728\u5DE5\u4F5C", detail: clip(event.data?.name ?? event.data?.description ?? event.data?.task ?? "") };
        break;
      case "notice":
        if (event.source === "gateway") {
          const note = gatewayNotice(event.text);
          if (note) r.note = note;
        }
        break;
      case "upstream-error":
        r.note = { kind: "retry", short: "\u4E0A\u6E38\u62A5\u9519", long: event.retrying === false ? "\u4E0A\u6E38\u5DF2\u4E2D\u65AD\u672C\u8F6E" : "\u4E0A\u6E38\u62A5\u9519\uFF0C\u7B49\u5F85\u91CD\u8BD5", detail: clip(event.message, 60) };
        break;
      case "error":
        if (event.data?.willRetry === true) r.note = { kind: "retry", short: "\u91CD\u8BD5\u4E2D", long: "\u8FDE\u63A5\u4E2D\u65AD\uFF0C\u6B63\u5728\u91CD\u8BD5", detail: clip(event.data?.error?.message ?? event.text, 60) };
        break;
      case "native-event":
        this.native(r, event);
        break;
    }
  }
  native(r, e) {
    const name = e.name ?? "", d = e.data ?? {}, item = d.item ?? {};
    if (["step/start", "request/header", "request/context", "turn/started"].includes(name)) {
      r.tools.clear();
      r.phase = "request";
      return;
    }
    if (name === "compaction/start" || name === "item/started" && item.type === "contextCompaction") {
      r.compacting = true;
      return;
    }
    if (name === "compaction/end" || name === "thread/compacted" || name === "item/completed" && item.type === "contextCompaction") {
      r.compacting = false;
      return;
    }
    if (name === "item/started" && item.type === "reasoning") {
      r.phase = "thinking";
      return;
    }
    if (name === "assistant-stream" && d.chunk?.type === "tool-call-delta" || name === "gateway/tool-call") {
      const call2 = d.chunk?.name ?? d.name;
      if (r.phase !== "tool-call") r.call = null;
      if (typeof call2 === "string" && call2) r.call = call2;
      r.phase = "tool-call";
      r.note = null;
      return;
    }
    if (name === "llm/retry") {
      r.note = { kind: "retry", short: "\u91CD\u8BD5\u4E2D", long: `\u8BF7\u6C42\u5931\u8D25\uFF0C\u51C6\u5907\u7B2C ${d.retry} \u6B21\u91CD\u8BD5${d.maxRetries ? `\uFF08\u6700\u591A ${d.maxRetries} \u6B21\uFF09` : ""}`, detail: [failureText(d.failure), Number.isFinite(d.delayMs) ? `${Math.max(1, Math.round(d.delayMs / 1e3))} \u79D2\u540E` : null].filter(Boolean).join(" \xB7 ") };
      return;
    }
    if (name === "llm/retry-started") {
      r.note = { kind: "retry", short: "\u91CD\u8BD5\u4E2D", long: `\u6B63\u5728\u91CD\u8BD5\u8BF7\u6C42\uFF08\u7B2C ${d.retry} \u6B21\uFF09`, detail: "" };
      r.phase = "request";
      return;
    }
    if (name === "tool/ptc-dispatch-start" && d.subCallId) {
      r.tools.set(`ptc:${d.subCallId}`, { event: { name: d.name, data: { arguments: d.arguments } }, root: d.rootCallId });
      return;
    }
    if (name === "tool/ptc-dispatch" && d.subCallId) r.tools.delete(`ptc:${d.subCallId}`);
  }
  /** One status for display: `short` for lists, `long` (+ `detail`) for the active session. */
  describe(id, status, { runtime: runtime2 = "", stopping: stopping2 = false } = {}) {
    if (stopping2) return { kind: "stopping", short: "\u6B63\u5728\u505C\u6B62", long: "\u6B63\u5728\u505C\u6B62\u672C\u8F6E", detail: "" };
    if (status === "starting") return { kind: "starting", short: "\u8FDE\u63A5\u4E2D", long: runtime2 ? `\u6B63\u5728\u8FDE\u63A5 ${runtime2}` : "\u6B63\u5728\u8FDE\u63A5\u8FD0\u884C\u73AF\u5883", detail: "" };
    const r = this.sessions.get(id);
    if (status === "waiting") {
      const ask = r && [...r.approvals.values()].at(-1), d = ask?.data ?? {};
      if (ask?.type === "question") return { kind: "question", short: "\u7B49\u5F85\u56DE\u7B54", long: "\u7B49\u5F85\u4F60\u56DE\u7B54\u95EE\u9898", detail: "" };
      return { kind: "approval", short: "\u7B49\u5F85\u6388\u6743", long: "\u7B49\u5F85\u4F60\u6388\u6743", detail: clip(d.toolName ?? d.toolCall?.title ?? ask?.name ?? "") };
    }
    if (!r) return STATES.request;
    if (r.ended) return { kind: "ending", short: "\u6536\u5C3E\u4E2D", long: "\u6B63\u5728\u7ED3\u675F\u672C\u8F6E", detail: "" };
    if (r.compacting) return { kind: "compacting", short: "\u538B\u7F29\u4E0A\u4E0B\u6587", long: "\u6B63\u5728\u538B\u7F29\u4E0A\u4E0B\u6587", detail: "" };
    if (r.note) return r.note;
    if (r.tools.size === 1) return toolActivity([...r.tools.values()][0].event);
    if (r.tools.size > 1) {
      const kinds = [...new Set([...r.tools.values()].map((t) => toolActivity(t.event).short))];
      return { kind: "tool", short: `${r.tools.size} \u4E2A\u5DE5\u5177`, long: `\u6B63\u5728\u5E76\u884C\u8FD0\u884C ${r.tools.size} \u4E2A\u5DE5\u5177`, detail: kinds.join("\u3001") };
    }
    if (r.phase === "tool-call") return { kind: "tool-call", short: "\u51C6\u5907\u5DE5\u5177", long: "\u6B63\u5728\u751F\u6210\u5DE5\u5177\u8C03\u7528", detail: r.call ?? "" };
    return STATES[r.phase] ?? STATES.request;
  }
};

// app/ui/attachments.js
var esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var KINDS = ["image", "video", "audio"];
var kindNames = { image: "\u56FE\u7247", video: "\u89C6\u9891", audio: "\u97F3\u9891" };
var kindIcons = { image: "image", video: "film", audio: "music" };
var kindName = (kind) => kindNames[kind] ?? "\u6587\u4EF6";
var kindIcon = (kind) => kindIcons[kind] ?? "file";
var mediaUrl = (url) => typeof url === "string" && /^bridge-media:\/\//i.test(url) ? url : null;
function fileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024, unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 100 ? Math.round(value) : +value.toFixed(1)} ${units[unit]}`;
}
var mimeExtensions = { "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"], "image/gif": ["gif"], "image/webp": ["webp"], "audio/wav": ["wav"], "audio/mpeg": ["mp3"], "audio/ogg": ["ogg"], "audio/flac": ["flac"], "video/mp4": ["mp4"], "video/webm": ["webm"] };
var extensionOf = (name) => (/\.([^.]+)$/.exec(name)?.[1] ?? "").toLowerCase();
var extensionsOf = (caps, kind) => (caps?.[kind]?.mimes ?? []).flatMap((m) => mimeExtensions[m] ?? []);
function kindOf(name, caps) {
  const ext = extensionOf(name);
  return KINDS.find((kind) => extensionsOf(caps, kind).includes(ext)) ?? null;
}
var formatLabels = { jpg: "JPEG", jpeg: "JPEG", webp: "WebP", webm: "WebM" };
function formatsText(caps, kinds) {
  return [...new Set(kinds.flatMap((kind) => extensionsOf(caps, kind)).map((e) => formatLabels[e] ?? e.toUpperCase()))].join("\u3001");
}
var brokenUrls = /* @__PURE__ */ new Set();
function markBroken(url) {
  if (!mediaUrl(url) || brokenUrls.has(url)) return false;
  brokenUrls.add(url);
  return true;
}
function allowedKinds(caps) {
  return caps ? KINDS.filter((kind) => caps[kind]?.allowed) : [];
}
function refusal(caps, kind) {
  if (caps === void 0) return "\u6B63\u5728\u786E\u8BA4\u5F53\u524D\u6A21\u578B\u652F\u6301\u7684\u9644\u4EF6\u7C7B\u578B\u2026";
  if (!caps) return "\u5F53\u524D\u7248\u672C\u7684\u540E\u7AEF\u8FD8\u4E0D\u652F\u6301\u9644\u4EF6";
  const entry = caps[kind];
  if (kind && entry && !entry.allowed) return entry.reason || `\u5F53\u524D\u6A21\u578B\u4E0D\u652F\u6301${kindName(kind)}\u8F93\u5165`;
  const reason = KINDS.map((k) => caps[k]?.reason).find(Boolean);
  return reason ? `\u5F53\u524D\u6A21\u578B\u4E0D\u63A5\u53D7\u9644\u4EF6\uFF1A${reason}` : "\u5F53\u524D\u6A21\u578B\u4E0D\u63A5\u53D7\u9644\u4EF6";
}
var capabilityKey = (runtimeId, selection) => JSON.stringify([runtimeId, selection?.modelKey ?? null, selection?.identity ?? null, selection?.nativeModel ?? null]);
var PendingAttachments = class {
  constructor() {
    this.byDraft = /* @__PURE__ */ new Map();
    this.seq = 0;
  }
  list(key) {
    return this.byDraft.get(key) ?? [];
  }
  add(key, item) {
    const entry = { localId: `att-${++this.seq}`, ...item };
    this.byDraft.set(key, [...this.list(key), entry]);
    return entry;
  }
  update(key, localId, patch) {
    this.byDraft.set(key, this.list(key).map((x2) => x2.localId === localId ? { ...x2, ...patch } : x2));
  }
  remove(key, localId) {
    const entry = this.list(key).find((x2) => x2.localId === localId);
    this.byDraft.set(key, this.list(key).filter((x2) => x2.localId !== localId));
    return entry;
  }
  take(key) {
    const list = this.list(key);
    this.byDraft.delete(key);
    return list;
  }
  move(from, to) {
    if (from === to) return;
    const moved = this.take(from);
    if (moved.length) this.byDraft.set(to, [...this.list(to), ...moved]);
  }
};
function trayThumb(item) {
  const url = mediaUrl(item.attachment?.url), kind = item.attachment?.kind ?? item.kind;
  if (item.status === "ready" && kind === "image" && url) return `<img src="${esc(url)}" alt="" draggable="false">`;
  if (item.status === "ready" && kind === "video" && url) return `<video class="tray-video" src="${esc(url)}" muted preload="metadata"></video>`;
  return `<span class="tray-glyph">${item.status === "staging" ? '<span class="spinner"></span>' : icon(item.status === "error" ? "alert" : kindIcon(kind))}</span>`;
}
function trayHtml(items) {
  return items.map((item) => {
    const a3 = item.attachment ?? {}, name = a3.name ?? item.name, size = fileSize(a3.size ?? item.size);
    const sub2 = item.status === "staging" ? "\u6B63\u5728\u5904\u7406\u2026" : item.status === "error" ? item.error || "\u65E0\u6CD5\u6DFB\u52A0" : [kindName(a3.kind ?? item.kind), size].filter(Boolean).join(" \xB7 ");
    return `<div class="tray-item ${esc(item.status)}" title="${esc(item.status === "error" ? `${name}\uFF1A${item.error ?? "\u65E0\u6CD5\u6DFB\u52A0"}` : name)}">${trayThumb(item)}<span class="tray-text"><span class="tray-name">${esc(name)}</span><span class="tray-sub">${esc(sub2)}</span></span><button class="tray-remove" data-attach-remove="${esc(item.localId)}" title="\u79FB\u9664" aria-label="\u79FB\u9664 ${esc(name)}">${icon("close")}</button></div>`;
  }).join("");
}
function mediaActions(url, name) {
  return `<span class="media-actions"><button class="icon-btn xs" data-media-reveal="${esc(url)}" title="\u5728\u6587\u4EF6\u5939\u4E2D\u663E\u793A">${icon("folder")}</button><button class="icon-btn xs" data-media-save="${esc(url)}" data-media-name="${esc(name)}" title="\u53E6\u5B58\u4E3A\u2026">${icon("download")}</button></span>`;
}
function mediaElement(a3, { thumb = false, gone = false } = {}) {
  const url = mediaUrl(a3?.url), name = a3?.name ?? kindName(a3?.kind);
  if (gone) return `<span class="media-missing">${icon(kindIcon(a3?.kind))}<span>${esc(name)}</span><span class="muted">\uFF08\u53D1\u9001\u5931\u8D25\uFF0C\u5DF2\u6E05\u7406\uFF09</span></span>`;
  if (!url || brokenUrls.has(url)) return `<span class="media-missing">${icon("alert")}<span>${esc(name)}</span><span class="muted">\uFF08\u6587\u4EF6\u5DF2\u4E0D\u5728\uFF09</span></span>`;
  if (a3.kind === "image") return `<button class="media-image${thumb ? " thumb" : ""}" data-media-open="${esc(url)}" data-media-name="${esc(name)}" title="\u67E5\u770B\u5927\u56FE"><img src="${esc(url)}" alt="${esc(name)}" loading="lazy" draggable="false"></button>`;
  if (a3.kind === "video") return `<video class="media-video" src="${esc(url)}" controls preload="metadata"></video>`;
  if (a3.kind === "audio") return `<audio class="media-audio" src="${esc(url)}" controls preload="metadata"></audio>`;
  return `<span class="media-missing">${icon("file")}<span>${esc(name)}</span></span>`;
}
function userMediaHtml(list, discarded = /* @__PURE__ */ new Set()) {
  if (!Array.isArray(list) || !list.length) return "";
  const gone = list.filter((a3) => discarded.has(a3.id) || brokenUrls.has(a3.url)), shown = list.filter((a3) => !gone.includes(a3));
  const images = shown.filter((a3) => a3.kind === "image"), others = shown.filter((a3) => a3.kind !== "image");
  const grid = images.length ? `<div class="user-media-grid count-${Math.min(images.length, 4)}">${images.map((a3) => mediaElement(a3, { thumb: true })).join("")}</div>` : "";
  const rest = others.map((a3) => `<figure class="user-media-item">${mediaElement(a3)}<figcaption>${icon(kindIcon(a3.kind))}<span>${esc(a3.name ?? kindName(a3.kind))}</span><span class="muted">${esc(fileSize(a3.size))}</span></figcaption></figure>`).join("");
  const missing = gone.map((a3) => mediaElement(a3, { gone: discarded.has(a3.id) })).join("");
  return `<div class="user-media">${grid}${rest}${missing}</div>`;
}
var originNames = { imageGeneration: "\u56FE\u7247\u751F\u6210", image_generation: "\u56FE\u7247\u751F\u6210", generate_image: "\u56FE\u7247\u751F\u6210", codex: "Codex", kimi: "Kimi Code", dsh: "DSH", antigravity: "Antigravity", claude: "Claude Code" };
function mediaCardHtml(e) {
  const url = mediaUrl(e.url), name = e.name ?? kindName(e.kind), raw = e.origin?.tool ?? e.origin?.runtimeId ?? "", origin = originNames[raw] ?? raw;
  const meta = [kindName(e.kind), fileSize(e.size), origin].filter(Boolean).join(" \xB7 ");
  return `<figure class="media-card kind-${esc(e.kind ?? "file")}">${mediaElement(e)}<figcaption><span class="media-name">${icon(kindIcon(e.kind))}<span>${esc(name)}</span></span><span class="muted">${esc(meta)}</span>${url ? mediaActions(url, name) : ""}</figcaption></figure>`;
}
var markerHtml = (href, alt) => `<span data-md-media="${esc(encodeURIComponent(href ?? ""))}" data-md-alt="${esc(encodeURIComponent(alt ?? ""))}"></span>`;
var MARKER = /<span data-md-media="([^"]*)" data-md-alt="([^"]*)"><\/span>/g;
var isRemote = (href) => /^(https?:)?\/\//i.test(href) || /^(data|blob|javascript):/i.test(href);
function replaceMarkers(html2, lookup) {
  return html2.replace(MARKER, (_2, rawHref, rawAlt) => {
    let href, alt;
    try {
      href = decodeURIComponent(rawHref);
      alt = decodeURIComponent(rawAlt);
    } catch {
      return "";
    }
    const label = alt || href;
    if (isRemote(href)) return `<span class="md-media-link" title="${esc(href)}">${icon("image")}<span>${esc(label)}</span><span class="muted">\uFF08\u8FDC\u7A0B\u56FE\u7247\u672A\u52A0\u8F7D\uFF09</span></span>`;
    const found = lookup(href);
    if (found === void 0) return `<span class="md-media-link loading" title="${esc(href)}"><span class="spinner"></span><span>${esc(label)}</span></span>`;
    if (!found || !mediaUrl(found.url)) return `<span class="md-media-link" title="${esc(href)}">${icon("image")}<span>${esc(label)}</span><span class="muted">\uFF08\u627E\u4E0D\u5230\u6216\u4E0D\u662F\u9879\u76EE\u5185\u7684\u5A92\u4F53\u6587\u4EF6\uFF09</span></span>`;
    return `<span class="md-media">${mediaElement({ ...found, name: found.name ?? alt })}</span>`;
  });
}

// app/ui/markdown-cjk.js
var CJK = /[\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}\p{scx=Hangul}\p{scx=Bopomofo}　-〿︐-︟︰-﹯＀-￯]/u;
var SPACE = /\s/u;
var PUNCT = /[\p{P}\p{S}]/u;
var RUN = /\*+/g;
var ORPHAN = /^[^_*]*?__[^_*]*?\*[^_*]*?(?=__)/;
var isCjk = (c) => !!c && CJK.test(c);
function charBefore(text3, index) {
  if (index <= 0) return "";
  const low = text3.charCodeAt(index - 1);
  return low >= 56320 && low <= 57343 && index > 1 ? text3.slice(index - 2, index) : text3[index - 1];
}
var charAt = (text3, index) => index < text3.length ? String.fromCodePoint(text3.codePointAt(index)) : "";
function flanking(before, after, { gfm = true, cjk: cjk2 = true } = {}) {
  const punct2 = (c) => !!c && PUNCT.test(c) && !(gfm && c === "~"), space = (c) => !c || SPACE.test(c);
  const sb = space(before), sa = space(after), pb = punct2(before), pa = punct2(after), wide = cjk2 && (isCjk(before) || isCjk(after));
  return { left: !sa && (!pa || sb || pb || wide), right: !sb && (!pb || sa || pa || wide) };
}
function emphasisTokenizer({ cjk: cjk2 = true, fallback = true } = {}) {
  return function emStrong(src, maskedSrc, prevChar = "") {
    if (src[0] !== "*" || this.options.pedantic) return false;
    const open2 = this.rules.inline.emStrongLDelim.exec(src);
    if (!open2 || !open2[1] && !open2[2]) return false;
    const gfm = !!this.options.gfm, length = /^\*+/.exec(src)[0].length;
    const strict = !open2[1] || !prevChar || !!this.rules.inline.punctuation.exec(prevChar);
    if (!strict && !(cjk2 && (isCjk(prevChar) || isCjk(open2[1])))) return false;
    const rest = maskedSrc.slice(-src.length + length), skip = ORPHAN.exec(rest)?.[0].length ?? 0, runs = [];
    let changed = !strict;
    for (const m of rest.slice(skip).matchAll(RUN)) {
      const index = skip + m.index, before = charBefore(rest, index), after = charAt(rest, index + m[0].length);
      const run = { index, length: m[0].length, ...flanking(before, after, { gfm, cjk: cjk2 }) };
      if (cjk2) {
        const plain = flanking(before, after, { gfm, cjk: false });
        if (plain.left !== run.left || plain.right !== run.right) changed = true;
      }
      runs.push(run);
    }
    if (fallback && !changed) return false;
    let total = length, middle = 0;
    for (const run of runs) {
      if (!run.left && !run.right) continue;
      if (!run.right) {
        total += run.length;
        continue;
      }
      if (run.left) {
        if (length % 3 && !((length + run.length) % 3)) {
          middle += run.length;
          continue;
        }
        if (prevChar === "*") break;
      }
      total -= run.length;
      if (total > 0) continue;
      const used = Math.min(run.length, run.length + total + middle), raw = src.slice(0, length + run.index + used);
      if (Math.min(length, used) % 2) {
        const text4 = raw.slice(1, -1);
        return { type: "em", raw, text: text4, tokens: this.lexer.inlineTokens(text4) };
      }
      const text3 = raw.slice(2, -2);
      return { type: "strong", raw, text: text3, tokens: this.lexer.inlineTokens(text3) };
    }
  };
}
var cjkEmphasis = { tokenizer: { emStrong: emphasisTokenizer() } };

// app/ui/tool-groups.js
var MIN_FOLD = 3;
function toolFailed(end) {
  const d = end?.data ?? {};
  return d.isError === true || d.is_error === true || d.message?.isError === true || d.status === "failed" || d.item?.status === "failed" || Number.isInteger(d.item?.exitCode) && d.item.exitCode !== 0 || !!d.error;
}
var toolStatus = (t, running2) => t.end ? toolFailed(t.end) ? "failed" : "done" : running2 ? "running" : "stopped";
function foldRuns(blocks) {
  const out = [];
  let run = [];
  const flush = () => {
    if (run.filter((b) => b.work.tool).length >= MIN_FOLD) out.push({ fold: run });
    else out.push(...run);
    run = [];
  };
  for (const block of blocks) {
    if (block.work) run.push(block);
    else {
      flush();
      out.push(block);
    }
  }
  flush();
  return out;
}
function foldSummary(run, running2) {
  const tools = run.filter((b) => b.work.tool).map((b) => b.work.tool), statuses = tools.map((t) => toolStatus(t, running2));
  const failed = statuses.filter((s) => s === "failed").length, live = tools.findLast((t, i2) => statuses[i2] === "running");
  const status = live ? "running" : failed ? "failed" : statuses.includes("stopped") ? "stopped" : "done";
  const title = `${tools.length} \u6B21\u5DE5\u5177\u8C03\u7528`;
  if (live) {
    const now = toolActivity(live.start ?? live.end);
    return { status, title, detail: now.detail ? `${now.long} \xB7 ${now.detail}` : now.long };
  }
  const counts = /* @__PURE__ */ new Map();
  for (const t of tools) {
    const kind = toolActivity(t.start ?? t.end).short;
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  const parts = [...counts].sort((a3, b) => b[1] - a3[1]).map(([kind, n]) => `${kind} ${n}`);
  const count2 = (kind) => run.filter((b) => b.work[kind]).length, thinking = count2("thinking"), approved = count2("approval") + count2("review");
  if (thinking) parts.push(`\u601D\u8003 ${thinking} \u6BB5`);
  if (approved) parts.push(`\u5DF2\u6388\u6743 ${approved} \u6B21`);
  if (failed) parts.unshift(`${failed} \u4E2A\u5931\u8D25`);
  return { status, title, detail: parts.join(" \xB7 ") };
}

// app/ui/rules.js
var esc2 = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var MODEL_NAMES = { "qoder:qfmodel": "Q-Qwen3.8-Flash", "workbuddy:hy4free": "W-Hy4" };
var SOURCE_NAMES = { qoder: "Qoder", workbuddy: "WorkBuddy" };
var modelName = (key) => MODEL_NAMES[key] ?? String(key ?? "").split(":").pop();
var sourceOf = (key) => SOURCE_NAMES[String(key ?? "").split(":")[0]] ?? String(key ?? "").split(":")[0];
function ruleTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1} \u6708 ${d.getDate()} \u65E5 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function detectorNote(view) {
  const d = view.detector ?? {}, fallback = d.fallback ? `${modelName(d.fallback)}\uFF08${sourceOf(d.fallback)}\uFF09` : "Q-Qwen3.8-Flash";
  const who = !d.model || d.model === "session" ? `\u4F60\u53D1\u7684\u6BCF\u6761\u6D88\u606F\u7531\u8FD9\u4E2A\u4F1A\u8BDD\u6B63\u5728\u7528\u7684\u6A21\u578B\u987A\u5E26\u5224\u65AD\uFF08\u8F85\u52A9\u8BF7\u6C42\u3001\u8C03\u4F4E\u601D\u8003\u5F3A\u5EA6\uFF09\uFF0C\u6D88\u606F\u4E0D\u4F1A\u53D1\u7ED9\u522B\u7684\u6A21\u578B\u6E90\uFF1B\u4F1A\u8BDD\u7528\u539F\u751F\u6A21\u578B\uFF08\u4E0D\u7ECF\u8FC7 Bridge++ \u6A21\u578B\u6E90\uFF09\u65F6\u6539\u7528 ${esc2(fallback)}\u3002` : `\u4F60\u53D1\u7684\u6BCF\u6761\u6D88\u606F\u7531 ${esc2(modelName(d.model))} \u5224\u65AD\uFF0C\u4F1A\u53D1\u7ED9 ${esc2(sourceOf(d.model))}\uFF1B\u5B83\u4E0D\u53EF\u7528\u65F6\u6539\u7528 ${esc2(fallback)}\u3002`;
  return `${who}\u6709\u957F\u671F\u8981\u6C42\u5C31\u76F4\u63A5\u8BB0\u4E0B\uFF0C\u5E76\u5728\u5BF9\u8BDD\u91CC\u63D0\u793A\uFF0C\u53EF\u4EE5\u64A4\u9500\uFF1B\u90FD\u4E0D\u53EF\u7528\u65F6\u8DF3\u8FC7\uFF0C\u4E0D\u5F71\u54CD\u4EFB\u52A1\u3002${d.available === false ? ' <b class="warn-text">\u73B0\u5728\u6CA1\u6709\u53EF\u7528\u7684\u8BC6\u522B\u6A21\u578B\u3002</b>' : ""}`;
}
function detectorPicker(view, models2 = []) {
  const current = view.detector?.model ?? "session", known = models2.some((m) => m.key === current);
  const groups = [...new Set(models2.map((m) => m.group))];
  const options = groups.map((g) => `<optgroup label="${esc2(g)}">${models2.filter((m) => m.group === g).map((m) => `<option value="${esc2(m.key)}"${m.key === current ? " selected" : ""}>${esc2(m.name)}</option>`).join("")}</optgroup>`).join("");
  return `<label class="rules-detector"><span>\u8BC6\u522B\u7528\u7684\u6A21\u578B</span><select data-rules-detector><option value="session"${current === "session" ? " selected" : ""}>\u8DDF\u968F\u4F1A\u8BDD\u5F53\u524D\u6A21\u578B\uFF08\u9ED8\u8BA4\uFF09</option>${!known && current !== "session" ? `<option value="${esc2(current)}" selected>${esc2(modelName(current))}\uFF08\u73B0\u5728\u4E0D\u53EF\u7528\uFF09</option>` : ""}${options}</select></label>`;
}
function itemHtml(item, view) {
  const injected = !Array.isArray(view.injected) || view.injected.includes(item.id);
  const origin = item.auto ? "\u81EA\u52A8\u8BB0\u5F55" : "\u624B\u52A8\u6DFB\u52A0", time = ruleTime(item.at);
  const from = item.sessionId ? `<button class="link-btn" data-rule-session="${esc2(item.sessionId)}" title="\u6253\u5F00\u6765\u6E90\u4F1A\u8BDD">${esc2(item.sessionTitle || "\u6765\u6E90\u4F1A\u8BDD")}</button>` : "";
  return `<li class="rule-item${injected ? "" : " dropped"}" data-rule-id="${esc2(item.id)}">
    <div class="rule-text">${esc2(item.text)}</div>
    <div class="rule-meta"><span>${origin}</span>${time ? `<span>${esc2(time)}</span>` : ""}${from ? `<span>\u6765\u81EA ${from}</span>` : ""}${injected ? "" : `<span class="rule-tag" title="\u8D85\u8FC7 50 \u6761\u6216 8 KB \u7684\u90E8\u5206\u6682\u4E0D\u4EA4\u7ED9\u6A21\u578B\uFF0C\u5220\u6389\u4E00\u4E9B\u65E7\u7684\u5C31\u4F1A\u6062\u590D">\u672A\u6CE8\u5165</span>`}</div>
    <button class="icon-btn sm" data-rule-delete="${esc2(item.id)}" title="\u5220\u9664\u8FD9\u6761">${icon("close")}</button>
  </li>`;
}
function rulesPageHtml(view, { editing = false, draft = null, loading = false, error = null, models: models2 = [] } = {}) {
  const head = `<div class="settings-head"><h1>\u957F\u671F\u8981\u6C42</h1><p>\u4F60\u5728\u5DE5\u4F5C\u4E2D\u63D0\u51FA\u7684\u957F\u671F\u8981\u6C42\u8BB0\u5728 Bridge++ \u81EA\u5DF1\u7684 AGENTS.md \u91CC\uFF0C\u6240\u6709\u73AF\u5883\u548C\u6A21\u578B\u90FD\u80FD\u770B\u5230\uFF1ACodex\uFF08\u6A21\u578B\u6E90\u7684\u6A21\u578B\uFF09\u548C Claude Code \u653E\u8FDB\u5B83\u4EEC\u7684\u5168\u5C40\u6307\u4EE4\uFF0C\u5176\u4ED6\u73AF\u5883\u5728\u6BCF\u4E2A\u65B0\u4F1A\u8BDD\u7684\u7B2C\u4E00\u6761\u6D88\u606F\u524D\u9644\u4E0A\u3002\u6539\u52A8\u5BF9\u4E4B\u540E\u65B0\u5F00\u7684\u4F1A\u8BDD\u751F\u6548\u3002</p></div>`;
  if (!view) return head + (error ? `<div class="note warn">${icon("alert")}<span>\u8BFB\u53D6\u5931\u8D25\uFF1A${esc2(error)}</span></div>` : `<div class="rules-loading"><span class="spinner"></span><span>\u6B63\u5728\u8BFB\u53D6\u2026</span></div>`);
  const items = Array.isArray(view.items) ? view.items : [];
  const auto = `<label class="update-auto rules-auto"><input type="checkbox" data-rules-auto ${view.autoRecord ? "checked" : ""}><span><b>\u81EA\u52A8\u8BB0\u5F55\u957F\u671F\u8981\u6C42</b><small>${detectorNote(view)}</small></span></label>${view.autoRecord ? detectorPicker(view, models2) : ""}`;
  if (editing) return `${head}${auto}
    <div class="rules-editor"><div class="rules-editor-head"><b>\u7F16\u8F91\u5168\u6587</b><small>\u4EE5\u201C- \u201D\u5F00\u5934\u7684\u6BCF\u4E00\u884C\u662F\u4E00\u6761\u8981\u6C42\uFF1B\u884C\u5C3E\u7684\u6CE8\u91CA\u8BB0\u5F55\u6765\u6E90\uFF0C\u53EF\u4EE5\u5220\u3002</small></div>
    <textarea id="rules-text" spellcheck="false">${esc2(draft ?? view.text ?? "")}</textarea>
    <div class="rules-editor-actions"><button class="btn" data-rules="cancel-edit">\u53D6\u6D88</button><button class="btn primary" data-rules="save-text"${loading ? " disabled" : ""}>${loading ? '<span class="spinner"></span>' : ""}\u4FDD\u5B58</button></div></div>`;
  const list = items.length ? `<ul class="rule-list">${items.map((item) => itemHtml(item, view)).join("")}</ul>` : `<div class="rules-empty">${icon("list")}<span>\u8FD8\u6CA1\u6709\u957F\u671F\u8981\u6C42\u3002\u4F60\u5728\u5BF9\u8BDD\u91CC\u8BF4\u201C\u4EE5\u540E\u90FD\u2026\u201D\u201C\u6BCF\u6B21\u2026\u201D\u201C\u8BB0\u4F4F\u2026\u201D\u8FD9\u7C7B\u8BDD\u65F6\uFF0C\u4F1A\u81EA\u52A8\u8BB0\u5230\u8FD9\u91CC\uFF1B\u4E5F\u53EF\u4EE5\u5728\u4E0B\u9762\u76F4\u63A5\u6DFB\u52A0\u3002</span></div>`;
  const overflow = view.overflow ? `<div class="note warn">${icon("alert")}<span>\u8981\u6C42\u592A\u591A\uFF08\u8D85\u8FC7 50 \u6761\u6216 8 KB\uFF09\uFF0C\u6700\u65E9\u7684\u81EA\u52A8\u8BB0\u5F55\u6682\u65F6\u6CA1\u6709\u4EA4\u7ED9\u6A21\u578B\u3002</span></div>` : "";
  return `${head}${auto}
    <h2>\u5F53\u524D\u8981\u6C42${items.length ? `<span class="muted"> \xB7 ${items.length} \u6761</span>` : ""}</h2>${overflow}${list}
    <div class="rule-add"><input id="rule-add-text" placeholder="\u6DFB\u52A0\u4E00\u6761\u8981\u6C42\uFF0C\u4F8B\u5982\uFF1A\u56DE\u590D\u7528\u4E2D\u6587\uFF1B\u6539\u4EE3\u7801\u524D\u5148\u8BF4\u660E\u65B9\u6848" maxlength="300" autocomplete="off"><button class="btn" data-rules="add">${icon("plus")}\u6DFB\u52A0</button></div>
    <div class="rules-footer"><button class="btn sm" data-rules="edit">${icon("edit")}\u7F16\u8F91\u5168\u6587</button><span class="muted mono" title="${esc2(view.path)}">${esc2(view.path ?? "")}</span>${view.path ? `<button class="link-btn" data-copy-text="${esc2(view.path)}">\u590D\u5236\u8DEF\u5F84</button>` : ""}</div>`;
}
function ruleNoticeHtml(e, undone = false) {
  const text3 = e.rule?.text ?? String(e.text ?? "").replace(/^已记为长期要求：/, "");
  return `<div class="event-note notice rule-note${undone ? " undone" : ""}">${icon("bulb")}<span>${undone ? "\u5DF2\u64A4\u9500\u957F\u671F\u8981\u6C42\uFF1A" : "\u5DF2\u8BB0\u4E3A\u957F\u671F\u8981\u6C42\uFF1A"}${esc2(text3)}</span>${undone || !e.ruleId ? "" : `<button class="link-btn" data-rule-undo="${esc2(e.ruleId)}">\u64A4\u9500</button>`}<button class="link-btn" data-open-rules>\u67E5\u770B\u5168\u90E8</button></div>`;
}

// app/ui/upstream.js
var esc3 = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var sources = { qoder: "Qoder", workbuddy: "WorkBuddy" };
var pad = (n) => String(n).padStart(2, "0");
var rateLimited = (e) => e?.status === 429 || /rate.?limit|quota/i.test(String(e?.code ?? ""));
var upstreamTitle = (e) => rateLimited(e) ? "\u4E0A\u6E38\u9650\u901F" : "\u4E0A\u6E38\u62A5\u9519";
var upstreamText = (e) => String(e?.message ?? "").replace(/^(?:HTTP\s*)?\d{3}\s+/i, "");
function resetText(at2, now = Date.now()) {
  const date = new Date(at2), left = date.getTime() - now;
  if (!at2 || !Number.isFinite(left)) return "";
  const today = new Date(now).toDateString() === date.toDateString();
  const clock2 = `${today ? "" : `${date.getMonth() + 1} \u6708 ${date.getDate()} \u65E5 `}${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (left <= 0) return `${clock2} \u5DF2\u91CD\u7F6E`;
  const minutes = Math.ceil(left / 6e4);
  return `${clock2} \u91CD\u7F6E\uFF08\u7EA6 ${minutes < 60 ? `${minutes} \u5206\u949F` : `${Math.round(minutes / 60)} \u5C0F\u65F6`}\u540E\uFF09`;
}
var sameUpstream = (a3, b) => !!a3 && !!b && a3.provider === b.provider && a3.code === b.code && a3.status === b.status && a3.message === b.message;
function upstreamHtml(e, count2 = 1, now = Date.now()) {
  const where = [sources[e.provider] ?? e.provider, e.model, Number.isInteger(e.status) ? `HTTP ${e.status}` : null].filter(Boolean).join(" \xB7 ");
  const reset = resetText(e.resetAt, now), diagnosis = [e.code && `\u9519\u8BEF\u7801\uFF1A${e.code}`, e.requestId && `\u8BF7\u6C42 ID\uFF1A${e.requestId}`].filter(Boolean).join("\n");
  return `<div class="upstream-card${rateLimited(e) ? " limited" : ""}"><div class="upstream-head">${icon("alert")}<b>${upstreamTitle(e)}</b>${where ? `<span class="muted">${esc3(where)}</span>` : ""}${count2 > 1 ? `<span class="upstream-count" title="\u540C\u6837\u7684\u9519\u8BEF\u51FA\u73B0\u4E86 ${count2} \u6B21">\xD7${count2}</span>` : ""}</div>
    <div class="upstream-message">${esc3(upstreamText(e) || "\u4E0A\u6E38\u6CA1\u6709\u8BF4\u660E\u539F\u56E0\u3002")}</div>
    ${reset ? `<div class="upstream-meta">${icon("clock")}<span>${esc3(reset)}</span></div>` : ""}
    ${diagnosis ? `<details class="upstream-details" data-expand="upstream-${esc3(e.id)}"><summary>\u8BCA\u65AD\u8BE6\u60C5</summary><pre>${esc3(diagnosis)}</pre></details>` : ""}</div>`;
}
function stopLabel(reason) {
  if (!reason) return "";
  if (reason.kind === "upstream") return upstreamTitle(reason);
  return { cancelled: "\u4F60\u5DF2\u505C\u6B62", runtime: "\u539F\u751F\u8FDB\u7A0B\u4E2D\u65AD", unfinished: "\u6A21\u578B\u6CA1\u6709\u7ED9\u51FA\u7ED3\u679C" }[reason.kind] ?? "";
}
function stopNote(reason, shown = /* @__PURE__ */ new Set()) {
  if (!reason?.message || reason.kind === "cancelled" || shown.has(reason.message)) return "";
  const reset = resetText(reason.resetAt);
  return reset ? `${reason.message}\uFF08${reset}\uFF09` : reason.message;
}
function turnExtras(stats) {
  const parts = [];
  if (stats?.requests) parts.push(`\u8BF7\u6C42 ${stats.requests} \u6B21`);
  if (stats?.failedRequests) parts.push(`\u5931\u8D25 ${stats.failedRequests} \u6B21`);
  if (stats?.corrections) parts.push(`\u683C\u5F0F\u7EA0\u6B63 ${stats.corrections} \u6B21`);
  if (stats?.continuations) parts.push(`\u81EA\u52A8\u7EED\u4F5C ${stats.continuations} \u6B21`);
  return parts;
}
function limitNotice(failure, now = Date.now()) {
  if (failure?.kind !== "upstream" || !failure.resetAt || !(new Date(failure.resetAt).getTime() > now)) return "";
  return `${failure.source ? `${failure.source} ` : ""}\u9650\u901F\u4E2D\uFF0C${resetText(failure.resetAt, now)}\u3002\u73B0\u5728\u53D1\u9001\u53EF\u80FD\u7EE7\u7EED\u5931\u8D25\u3002`;
}

// node_modules/katex/dist/katex.mjs
var ParseError = class _ParseError extends Error {
  // The underlying error message without any context added.
  constructor(message, token) {
    var error = "KaTeX parse error: " + message;
    var start2;
    var end;
    var loc = token && token.loc;
    if (loc && loc.start <= loc.end) {
      var input = loc.lexer.input;
      start2 = loc.start;
      end = loc.end;
      if (start2 === input.length) {
        error += " at end of input: ";
      } else {
        error += " at position " + (start2 + 1) + ": ";
      }
      var underlined = input.slice(start2, end).replace(/[^]/g, "$&\u0332");
      var left;
      if (start2 > 15) {
        left = "\u2026" + input.slice(start2 - 15, start2);
      } else {
        left = input.slice(0, start2);
      }
      var right;
      if (end + 15 < input.length) {
        right = input.slice(end, end + 15) + "\u2026";
      } else {
        right = input.slice(end);
      }
      error += left + underlined + right;
    }
    super(error);
    this.name = "ParseError";
    this.position = void 0;
    this.length = void 0;
    this.rawMessage = void 0;
    Object.setPrototypeOf(this, _ParseError.prototype);
    this.position = start2;
    if (start2 != null && end != null) {
      this.length = end - start2;
    }
    this.rawMessage = message;
  }
};
var uppercase = /([A-Z])/g;
var hyphenate = (str) => str.replace(uppercase, "-$1").toLowerCase();
var ESCAPE_LOOKUP = {
  "&": "&amp;",
  ">": "&gt;",
  "<": "&lt;",
  '"': "&quot;",
  "'": "&#x27;"
};
var ESCAPE_REGEX = /[&><"']/g;
var escape = (text3) => String(text3).replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match]);
var getBaseElem = (group) => {
  if (group.type === "ordgroup") {
    if (group.body.length === 1) {
      return getBaseElem(group.body[0]);
    } else {
      return group;
    }
  } else if (group.type === "color") {
    if (group.body.length === 1) {
      return getBaseElem(group.body[0]);
    } else {
      return group;
    }
  } else if (group.type === "font") {
    return getBaseElem(group.body);
  } else {
    return group;
  }
};
var characterNodesTypes = /* @__PURE__ */ new Set(["mathord", "textord", "atom"]);
var isCharacterBox = (group) => characterNodesTypes.has(getBaseElem(group).type);
var protocolFromUrl = (url) => {
  var protocol = /^[\x00-\x20]*([^\\/#?]*?)(:|&#0*58|&#x0*3a|&colon)/i.exec(url);
  if (!protocol) {
    return "_relative";
  }
  if (protocol[2] !== ":") {
    return null;
  }
  if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*$/.test(protocol[1])) {
    return null;
  }
  return protocol[1].toLowerCase();
};
var SETTINGS_SCHEMA = {
  displayMode: {
    type: "boolean",
    description: "Render math in display mode, which puts the math in display style (so \\int and \\sum are large, for example), and centers the math on the page on its own line.",
    cli: "-d, --display-mode"
  },
  output: {
    type: {
      enum: ["htmlAndMathml", "html", "mathml"]
    },
    description: "Determines the markup language of the output.",
    cli: "-F, --format <type>"
  },
  leqno: {
    type: "boolean",
    description: "Render display math in leqno style (left-justified tags)."
  },
  fleqn: {
    type: "boolean",
    description: "Render display math flush left."
  },
  throwOnError: {
    type: "boolean",
    default: true,
    cli: "-t, --no-throw-on-error",
    cliDescription: "Render errors (in the color given by --error-color) instead of throwing a ParseError exception when encountering an error."
  },
  errorColor: {
    type: "string",
    default: "#cc0000",
    cli: "-c, --error-color <color>",
    cliDescription: "A color string given in the format 'rgb' or 'rrggbb' (no #). This option determines the color of errors rendered by the -t option.",
    cliProcessor: (color) => "#" + color
  },
  macros: {
    type: "object",
    cli: "-m, --macro <def>",
    cliDescription: "Define custom macro of the form '\\foo:expansion' (use multiple -m arguments for multiple macros).",
    cliDefault: [],
    cliProcessor: (def, defs) => {
      defs.push(def);
      return defs;
    }
  },
  minRuleThickness: {
    type: "number",
    description: "Specifies a minimum thickness, in ems, for fraction lines, `\\sqrt` top lines, `{array}` vertical lines, `\\hline`, `\\hdashline`, `\\underline`, `\\overline`, and the borders of `\\fbox`, `\\boxed`, and `\\fcolorbox`.",
    processor: (t) => Math.max(0, t),
    cli: "--min-rule-thickness <size>",
    cliProcessor: parseFloat
  },
  colorIsTextColor: {
    type: "boolean",
    description: "Makes \\color behave like LaTeX's 2-argument \\textcolor, instead of LaTeX's one-argument \\color mode change.",
    cli: "-b, --color-is-text-color"
  },
  strict: {
    type: [{
      enum: ["warn", "ignore", "error"]
    }, "boolean", "function"],
    description: "Turn on strict / LaTeX faithfulness mode, which throws an error if the input uses features that are not supported by LaTeX.",
    cli: "-S, --strict",
    cliDefault: false
  },
  trust: {
    type: ["boolean", "function"],
    description: "Trust the input, enabling all HTML features such as \\url.",
    cli: "-T, --trust"
  },
  maxSize: {
    type: "number",
    default: Infinity,
    description: "If non-zero, all user-specified sizes, e.g. in \\rule{500em}{500em}, will be capped to maxSize ems. Otherwise, elements and spaces can be arbitrarily large",
    processor: (s) => Math.max(0, s),
    cli: "-s, --max-size <n>",
    cliProcessor: parseInt
  },
  maxExpand: {
    type: "number",
    default: 1e3,
    description: "Limit the number of macro expansions to the specified number, to prevent e.g. infinite macro loops. If set to Infinity, the macro expander will try to fully expand as in LaTeX.",
    processor: (n) => Math.max(0, n),
    cli: "-e, --max-expand <n>",
    cliProcessor: (n) => n === "Infinity" ? Infinity : parseInt(n)
  },
  globalGroup: {
    type: "boolean",
    cli: false
  }
};
function getImplicitDefault(type) {
  if (typeof type !== "string") {
    return type.enum[0];
  }
  switch (type) {
    case "boolean":
      return false;
    case "string":
      return "";
    case "number":
      return 0;
    case "object":
      return {};
    default:
      throw new Error("Unexpected schema type; settings must declare an explicit default.");
  }
}
function getDefaultValue(schema) {
  if (Object.prototype.hasOwnProperty.call(schema, "default") && schema.default !== void 0) {
    return schema.default;
  }
  var type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  return getImplicitDefault(type);
}
function applySetting(target, prop, options, schema) {
  var optionValue = Object.prototype.hasOwnProperty.call(options, prop) ? options[prop] : void 0;
  var processor = Object.prototype.hasOwnProperty.call(schema, "processor") ? schema.processor : void 0;
  target[prop] = optionValue !== void 0 ? processor ? processor(optionValue) : optionValue : getDefaultValue(schema);
}
var Settings = class {
  constructor(options) {
    if (options === void 0) {
      options = {};
    }
    this.displayMode = void 0;
    this.output = void 0;
    this.leqno = void 0;
    this.fleqn = void 0;
    this.throwOnError = void 0;
    this.errorColor = void 0;
    this.macros = void 0;
    this.minRuleThickness = void 0;
    this.colorIsTextColor = void 0;
    this.strict = void 0;
    this.trust = void 0;
    this.maxSize = void 0;
    this.maxExpand = void 0;
    this.globalGroup = void 0;
    options = options || {};
    for (var prop of Object.keys(SETTINGS_SCHEMA)) {
      var schema = SETTINGS_SCHEMA[prop];
      if (schema) {
        applySetting(this, prop, options, schema);
      }
    }
  }
  /**
   * Check whether to test potentially dangerous input, and return
   * `true` (trusted) or `false` (untrusted).  The sole argument `context`
   * should be an object with `command` field specifying the relevant LaTeX
   * command (as a string starting with `\`), and any other arguments, etc.
   * If `context` has a `url` field, a `protocol` field will automatically
   * get added by this function (changing the specified object).
   */
  isTrusted(context) {
    if ("url" in context && context.url && !context.protocol) {
      var protocol = protocolFromUrl(context.url);
      if (protocol == null) {
        return false;
      }
      context.protocol = protocol;
    }
    var trust = typeof this.trust === "function" ? this.trust(context) : this.trust;
    return Boolean(trust);
  }
};
var Style = class {
  constructor(id, size, cramped) {
    this.id = void 0;
    this.size = void 0;
    this.cramped = void 0;
    this.id = id;
    this.size = size;
    this.cramped = cramped;
  }
  /**
   * Get the style of a superscript given a base in the current style.
   */
  sup() {
    return styles[sup[this.id]];
  }
  /**
   * Get the style of a subscript given a base in the current style.
   */
  sub() {
    return styles[sub[this.id]];
  }
  /**
   * Get the style of a fraction numerator given the fraction in the current
   * style.
   */
  fracNum() {
    return styles[fracNum[this.id]];
  }
  /**
   * Get the style of a fraction denominator given the fraction in the current
   * style.
   */
  fracDen() {
    return styles[fracDen[this.id]];
  }
  /**
   * Get the cramped version of a style (in particular, cramping a cramped style
   * doesn't change the style).
   */
  cramp() {
    return styles[cramp[this.id]];
  }
  /**
   * Get a text or display version of this style.
   */
  text() {
    return styles[text$1[this.id]];
  }
  /**
   * Return true if this style is tightly spaced (scriptstyle/scriptscriptstyle)
   */
  isTight() {
    return this.size >= 2;
  }
};
var D2 = 0;
var Dc = 1;
var T2 = 2;
var Tc = 3;
var S2 = 4;
var Sc = 5;
var SS = 6;
var SSc = 7;
var styles = [new Style(D2, 0, false), new Style(Dc, 0, true), new Style(T2, 1, false), new Style(Tc, 1, true), new Style(S2, 2, false), new Style(Sc, 2, true), new Style(SS, 3, false), new Style(SSc, 3, true)];
var sup = [S2, Sc, S2, Sc, SS, SSc, SS, SSc];
var sub = [Sc, Sc, Sc, Sc, SSc, SSc, SSc, SSc];
var fracNum = [T2, Tc, S2, Sc, SS, SSc, SS, SSc];
var fracDen = [Tc, Tc, Sc, Sc, SSc, SSc, SSc, SSc];
var cramp = [Dc, Dc, Tc, Tc, Sc, Sc, SSc, SSc];
var text$1 = [D2, Dc, T2, Tc, T2, Tc, T2, Tc];
var Style$1 = {
  DISPLAY: styles[D2],
  TEXT: styles[T2],
  SCRIPT: styles[S2],
  SCRIPTSCRIPT: styles[SS]
};
var scriptData = [{
  // Latin characters beyond the Latin-1 characters we have metrics for.
  // Needed for Czech, Hungarian and Turkish text, for example.
  name: "latin",
  blocks: [
    [256, 591],
    // Latin Extended-A and Latin Extended-B
    [768, 879]
    // Combining Diacritical marks
  ]
}, {
  // The Cyrillic script used by Russian and related languages.
  // A Cyrillic subset used to be supported as explicitly defined
  // symbols in symbols.js
  name: "cyrillic",
  blocks: [[1024, 1279]]
}, {
  // Armenian
  name: "armenian",
  blocks: [[1328, 1423]]
}, {
  // The Brahmic scripts of South and Southeast Asia
  // Devanagari (0900–097F)
  // Bengali (0980–09FF)
  // Gurmukhi (0A00–0A7F)
  // Gujarati (0A80–0AFF)
  // Oriya (0B00–0B7F)
  // Tamil (0B80–0BFF)
  // Telugu (0C00–0C7F)
  // Kannada (0C80–0CFF)
  // Malayalam (0D00–0D7F)
  // Sinhala (0D80–0DFF)
  // Thai (0E00–0E7F)
  // Lao (0E80–0EFF)
  // Tibetan (0F00–0FFF)
  // Myanmar (1000–109F)
  name: "brahmic",
  blocks: [[2304, 4255]]
}, {
  name: "georgian",
  blocks: [[4256, 4351]]
}, {
  // Chinese and Japanese.
  // The "k" in cjk is for Korean, but we've separated Korean out
  name: "cjk",
  blocks: [
    [12288, 12543],
    // CJK symbols and punctuation, Hiragana, Katakana
    [19968, 40879],
    // CJK ideograms
    [65280, 65376]
    // Fullwidth punctuation
    // TODO: add halfwidth Katakana and Romanji glyphs
  ]
}, {
  // Korean
  name: "hangul",
  blocks: [[44032, 55215]]
}];
function scriptFromCodepoint(codepoint) {
  for (var i2 = 0; i2 < scriptData.length; i2++) {
    var script2 = scriptData[i2];
    for (var _i6 = 0; _i6 < script2.blocks.length; _i6++) {
      var block = script2.blocks[_i6];
      if (codepoint >= block[0] && codepoint <= block[1]) {
        return script2.name;
      }
    }
  }
  return null;
}
var allBlocks = [];
scriptData.forEach((s) => s.blocks.forEach((b) => allBlocks.push(...b)));
function supportedCodepoint(codepoint) {
  for (var i2 = 0; i2 < allBlocks.length; i2 += 2) {
    if (codepoint >= allBlocks[i2] && codepoint <= allBlocks[i2 + 1]) {
      return true;
    }
  }
  return false;
}
var doubleBrushStroke = (svgPath) => svgPath + " " + svgPath;
var hLinePad = 80;
var sqrtMain = function sqrtMain2(extraVinculum, hLinePad2) {
  return "M95," + (622 + extraVinculum + hLinePad2) + "\nc-2.7,0,-7.17,-2.7,-13.5,-8c-5.8,-5.3,-9.5,-10,-9.5,-14\nc0,-2,0.3,-3.3,1,-4c1.3,-2.7,23.83,-20.7,67.5,-54\nc44.2,-33.3,65.8,-50.3,66.5,-51c1.3,-1.3,3,-2,5,-2c4.7,0,8.7,3.3,12,10\ns173,378,173,378c0.7,0,35.3,-71,104,-213c68.7,-142,137.5,-285,206.5,-429\nc69,-144,104.5,-217.7,106.5,-221\nl" + extraVinculum / 2.075 + " -" + extraVinculum + "\nc5.3,-9.3,12,-14,20,-14\nH400000v" + (40 + extraVinculum) + "H845.2724\ns-225.272,467,-225.272,467s-235,486,-235,486c-2.7,4.7,-9,7,-19,7\nc-6,0,-10,-1,-12,-3s-194,-422,-194,-422s-65,47,-65,47z\nM" + (834 + extraVinculum) + " " + hLinePad2 + "h400000v" + (40 + extraVinculum) + "h-400000z";
};
var sqrtSize1 = function sqrtSize12(extraVinculum, hLinePad2) {
  return "M263," + (601 + extraVinculum + hLinePad2) + "c0.7,0,18,39.7,52,119\nc34,79.3,68.167,158.7,102.5,238c34.3,79.3,51.8,119.3,52.5,120\nc340,-704.7,510.7,-1060.3,512,-1067\nl" + extraVinculum / 2.084 + " -" + extraVinculum + "\nc4.7,-7.3,11,-11,19,-11\nH40000v" + (40 + extraVinculum) + "H1012.3\ns-271.3,567,-271.3,567c-38.7,80.7,-84,175,-136,283c-52,108,-89.167,185.3,-111.5,232\nc-22.3,46.7,-33.8,70.3,-34.5,71c-4.7,4.7,-12.3,7,-23,7s-12,-1,-12,-1\ns-109,-253,-109,-253c-72.7,-168,-109.3,-252,-110,-252c-10.7,8,-22,16.7,-34,26\nc-22,17.3,-33.3,26,-34,26s-26,-26,-26,-26s76,-59,76,-59s76,-60,76,-60z\nM" + (1001 + extraVinculum) + " " + hLinePad2 + "h400000v" + (40 + extraVinculum) + "h-400000z";
};
var sqrtSize2 = function sqrtSize22(extraVinculum, hLinePad2) {
  return "M983 " + (10 + extraVinculum + hLinePad2) + "\nl" + extraVinculum / 3.13 + " -" + extraVinculum + "\nc4,-6.7,10,-10,18,-10 H400000v" + (40 + extraVinculum) + "\nH1013.1s-83.4,268,-264.1,840c-180.7,572,-277,876.3,-289,913c-4.7,4.7,-12.7,7,-24,7\ns-12,0,-12,0c-1.3,-3.3,-3.7,-11.7,-7,-25c-35.3,-125.3,-106.7,-373.3,-214,-744\nc-10,12,-21,25,-33,39s-32,39,-32,39c-6,-5.3,-15,-14,-27,-26s25,-30,25,-30\nc26.7,-32.7,52,-63,76,-91s52,-60,52,-60s208,722,208,722\nc56,-175.3,126.3,-397.3,211,-666c84.7,-268.7,153.8,-488.2,207.5,-658.5\nc53.7,-170.3,84.5,-266.8,92.5,-289.5z\nM" + (1001 + extraVinculum) + " " + hLinePad2 + "h400000v" + (40 + extraVinculum) + "h-400000z";
};
var sqrtSize3 = function sqrtSize32(extraVinculum, hLinePad2) {
  return "M424," + (2398 + extraVinculum + hLinePad2) + "\nc-1.3,-0.7,-38.5,-172,-111.5,-514c-73,-342,-109.8,-513.3,-110.5,-514\nc0,-2,-10.7,14.3,-32,49c-4.7,7.3,-9.8,15.7,-15.5,25c-5.7,9.3,-9.8,16,-12.5,20\ns-5,7,-5,7c-4,-3.3,-8.3,-7.7,-13,-13s-13,-13,-13,-13s76,-122,76,-122s77,-121,77,-121\ns209,968,209,968c0,-2,84.7,-361.7,254,-1079c169.3,-717.3,254.7,-1077.7,256,-1081\nl" + extraVinculum / 4.223 + " -" + extraVinculum + "c4,-6.7,10,-10,18,-10 H400000\nv" + (40 + extraVinculum) + "H1014.6\ns-87.3,378.7,-272.6,1166c-185.3,787.3,-279.3,1182.3,-282,1185\nc-2,6,-10,9,-24,9\nc-8,0,-12,-0.7,-12,-2z M" + (1001 + extraVinculum) + " " + hLinePad2 + "\nh400000v" + (40 + extraVinculum) + "h-400000z";
};
var sqrtSize4 = function sqrtSize42(extraVinculum, hLinePad2) {
  return "M473," + (2713 + extraVinculum + hLinePad2) + "\nc339.3,-1799.3,509.3,-2700,510,-2702 l" + extraVinculum / 5.298 + " -" + extraVinculum + "\nc3.3,-7.3,9.3,-11,18,-11 H400000v" + (40 + extraVinculum) + "H1017.7\ns-90.5,478,-276.2,1466c-185.7,988,-279.5,1483,-281.5,1485c-2,6,-10,9,-24,9\nc-8,0,-12,-0.7,-12,-2c0,-1.3,-5.3,-32,-16,-92c-50.7,-293.3,-119.7,-693.3,-207,-1200\nc0,-1.3,-5.3,8.7,-16,30c-10.7,21.3,-21.3,42.7,-32,64s-16,33,-16,33s-26,-26,-26,-26\ns76,-153,76,-153s77,-151,77,-151c0.7,0.7,35.7,202,105,604c67.3,400.7,102,602.7,104,\n606zM" + (1001 + extraVinculum) + " " + hLinePad2 + "h400000v" + (40 + extraVinculum) + "H1017.7z";
};
var phasePath = function phasePath2(y2) {
  var x2 = y2 / 2;
  return "M400000 " + y2 + " H0 L" + x2 + " 0 l65 45 L145 " + (y2 - 80) + " H400000z";
};
var sqrtTall = function sqrtTall2(extraVinculum, hLinePad2, viewBoxHeight) {
  var vertSegment = viewBoxHeight - 54 - hLinePad2 - extraVinculum;
  return "M702 " + (extraVinculum + hLinePad2) + "H400000" + (40 + extraVinculum) + "\nH742v" + vertSegment + "l-4 4-4 4c-.667.7 -2 1.5-4 2.5s-4.167 1.833-6.5 2.5-5.5 1-9.5 1\nh-12l-28-84c-16.667-52-96.667 -294.333-240-727l-212 -643 -85 170\nc-4-3.333-8.333-7.667-13 -13l-13-13l77-155 77-156c66 199.333 139 419.667\n219 661 l218 661zM702 " + hLinePad2 + "H400000v" + (40 + extraVinculum) + "H742z";
};
var sqrtPath = function sqrtPath2(size, extraVinculum, viewBoxHeight) {
  extraVinculum = 1e3 * extraVinculum;
  var path2 = "";
  switch (size) {
    case "sqrtMain":
      path2 = sqrtMain(extraVinculum, hLinePad);
      break;
    case "sqrtSize1":
      path2 = sqrtSize1(extraVinculum, hLinePad);
      break;
    case "sqrtSize2":
      path2 = sqrtSize2(extraVinculum, hLinePad);
      break;
    case "sqrtSize3":
      path2 = sqrtSize3(extraVinculum, hLinePad);
      break;
    case "sqrtSize4":
      path2 = sqrtSize4(extraVinculum, hLinePad);
      break;
    case "sqrtTall":
      path2 = sqrtTall(extraVinculum, hLinePad, viewBoxHeight);
  }
  return path2;
};
var innerPath = function innerPath2(name, height) {
  switch (name) {
    case "\u239C":
      return doubleBrushStroke("M291 0 H417 V" + height + " H291z");
    case "\u2223":
      return doubleBrushStroke("M145 0 H188 V" + height + " H145z");
    case "\u2225":
      return doubleBrushStroke("M145 0 H188 V" + height + " H145z") + doubleBrushStroke("M367 0 H410 V" + height + " H367z");
    case "\u239F":
      return doubleBrushStroke("M457 0 H583 V" + height + " H457z");
    case "\u23A2":
      return doubleBrushStroke("M319 0 H403 V" + height + " H319z");
    case "\u23A5":
      return doubleBrushStroke("M263 0 H347 V" + height + " H263z");
    case "\u23AA":
      return doubleBrushStroke("M384 0 H504 V" + height + " H384z");
    case "\u23D0":
      return doubleBrushStroke("M312 0 H355 V" + height + " H312z");
    case "\u2016":
      return doubleBrushStroke("M257 0 H300 V" + height + " H257z") + doubleBrushStroke("M478 0 H521 V" + height + " H478z");
    default:
      return "";
  }
};
var path = {
  // The doubleleftarrow geometry is from glyph U+21D0 in the font KaTeX Main
  doubleleftarrow: "M262 157\nl10-10c34-36 62.7-77 86-123 3.3-8 5-13.3 5-16 0-5.3-6.7-8-20-8-7.3\n 0-12.2.5-14.5 1.5-2.3 1-4.8 4.5-7.5 10.5-49.3 97.3-121.7 169.3-217 216-28\n 14-57.3 25-88 33-6.7 2-11 3.8-13 5.5-2 1.7-3 4.2-3 7.5s1 5.8 3 7.5\nc2 1.7 6.3 3.5 13 5.5 68 17.3 128.2 47.8 180.5 91.5 52.3 43.7 93.8 96.2 124.5\n 157.5 9.3 8 15.3 12.3 18 13h6c12-.7 18-4 18-10 0-2-1.7-7-5-15-23.3-46-52-87\n-86-123l-10-10h399738v-40H218c328 0 0 0 0 0l-10-8c-26.7-20-65.7-43-117-69 2.7\n-2 6-3.7 10-5 36.7-16 72.3-37.3 107-64l10-8h399782v-40z\nm8 0v40h399730v-40zm0 194v40h399730v-40z",
  // doublerightarrow is from glyph U+21D2 in font KaTeX Main
  doublerightarrow: "M399738 392l\n-10 10c-34 36-62.7 77-86 123-3.3 8-5 13.3-5 16 0 5.3 6.7 8 20 8 7.3 0 12.2-.5\n 14.5-1.5 2.3-1 4.8-4.5 7.5-10.5 49.3-97.3 121.7-169.3 217-216 28-14 57.3-25 88\n-33 6.7-2 11-3.8 13-5.5 2-1.7 3-4.2 3-7.5s-1-5.8-3-7.5c-2-1.7-6.3-3.5-13-5.5-68\n-17.3-128.2-47.8-180.5-91.5-52.3-43.7-93.8-96.2-124.5-157.5-9.3-8-15.3-12.3-18\n-13h-6c-12 .7-18 4-18 10 0 2 1.7 7 5 15 23.3 46 52 87 86 123l10 10H0v40h399782\nc-328 0 0 0 0 0l10 8c26.7 20 65.7 43 117 69-2.7 2-6 3.7-10 5-36.7 16-72.3 37.3\n-107 64l-10 8H0v40zM0 157v40h399730v-40zm0 194v40h399730v-40z",
  // leftarrow is from glyph U+2190 in font KaTeX Main
  leftarrow: "M400000 241H110l3-3c68.7-52.7 113.7-120\n 135-202 4-14.7 6-23 6-25 0-7.3-7-11-21-11-8 0-13.2.8-15.5 2.5-2.3 1.7-4.2 5.8\n-5.5 12.5-1.3 4.7-2.7 10.3-4 17-12 48.7-34.8 92-68.5 130S65.3 228.3 18 247\nc-10 4-16 7.7-18 11 0 8.7 6 14.3 18 17 47.3 18.7 87.8 47 121.5 85S196 441.3 208\n 490c.7 2 1.3 5 2 9s1.2 6.7 1.5 8c.3 1.3 1 3.3 2 6s2.2 4.5 3.5 5.5c1.3 1 3.3\n 1.8 6 2.5s6 1 10 1c14 0 21-3.7 21-11 0-2-2-10.3-6-25-20-79.3-65-146.7-135-202\n l-3-3h399890zM100 241v40h399900v-40z",
  // overbrace is from glyphs U+23A9/23A8/23A7 in font KaTeX_Size4-Regular
  leftbrace: "M6 548l-6-6v-35l6-11c56-104 135.3-181.3 238-232 57.3-28.7 117\n-45 179-50h399577v120H403c-43.3 7-81 15-113 26-100.7 33-179.7 91-237 174-2.7\n 5-6 9-10 13-.7 1-7.3 1-20 1H6z",
  leftbraceunder: "M0 6l6-6h17c12.688 0 19.313.3 20 1 4 4 7.313 8.3 10 13\n 35.313 51.3 80.813 93.8 136.5 127.5 55.688 33.7 117.188 55.8 184.5 66.5.688\n 0 2 .3 4 1 18.688 2.7 76 4.3 172 5h399450v120H429l-6-1c-124.688-8-235-61.7\n-331-161C60.687 138.7 32.312 99.3 7 54L0 41V6z",
  // overgroup is from the MnSymbol package (public domain)
  leftgroup: "M400000 80\nH435C64 80 168.3 229.4 21 260c-5.9 1.2-18 0-18 0-2 0-3-1-3-3v-38C76 61 257 0\n 435 0h399565z",
  leftgroupunder: "M400000 262\nH435C64 262 168.3 112.6 21 82c-5.9-1.2-18 0-18 0-2 0-3 1-3 3v38c76 158 257 219\n 435 219h399565z",
  // Harpoons are from glyph U+21BD in font KaTeX Main
  leftharpoon: "M0 267c.7 5.3 3 10 7 14h399993v-40H93c3.3\n-3.3 10.2-9.5 20.5-18.5s17.8-15.8 22.5-20.5c50.7-52 88-110.3 112-175 4-11.3 5\n-18.3 3-21-1.3-4-7.3-6-18-6-8 0-13 .7-15 2s-4.7 6.7-8 16c-42 98.7-107.3 174.7\n-196 228-6.7 4.7-10.7 8-12 10-1.3 2-2 5.7-2 11zm100-26v40h399900v-40z",
  leftharpoonplus: "M0 267c.7 5.3 3 10 7 14h399993v-40H93c3.3-3.3 10.2-9.5\n 20.5-18.5s17.8-15.8 22.5-20.5c50.7-52 88-110.3 112-175 4-11.3 5-18.3 3-21-1.3\n-4-7.3-6-18-6-8 0-13 .7-15 2s-4.7 6.7-8 16c-42 98.7-107.3 174.7-196 228-6.7 4.7\n-10.7 8-12 10-1.3 2-2 5.7-2 11zm100-26v40h399900v-40zM0 435v40h400000v-40z\nm0 0v40h400000v-40z",
  leftharpoondown: "M7 241c-4 4-6.333 8.667-7 14 0 5.333.667 9 2 11s5.333\n 5.333 12 10c90.667 54 156 130 196 228 3.333 10.667 6.333 16.333 9 17 2 .667 5\n 1 9 1h5c10.667 0 16.667-2 18-6 2-2.667 1-9.667-3-21-32-87.333-82.667-157.667\n-152-211l-3-3h399907v-40zM93 281 H400000 v-40L7 241z",
  leftharpoondownplus: "M7 435c-4 4-6.3 8.7-7 14 0 5.3.7 9 2 11s5.3 5.3 12\n 10c90.7 54 156 130 196 228 3.3 10.7 6.3 16.3 9 17 2 .7 5 1 9 1h5c10.7 0 16.7\n-2 18-6 2-2.7 1-9.7-3-21-32-87.3-82.7-157.7-152-211l-3-3h399907v-40H7zm93 0\nv40h399900v-40zM0 241v40h399900v-40zm0 0v40h399900v-40z",
  // hook is from glyph U+21A9 in font KaTeX Main
  lefthook: "M400000 281 H103s-33-11.2-61-33.5S0 197.3 0 164s14.2-61.2 42.5\n-83.5C70.8 58.2 104 47 142 47 c16.7 0 25 6.7 25 20 0 12-8.7 18.7-26 20-40 3.3\n-68.7 15.7-86 37-10 12-15 25.3-15 40 0 22.7 9.8 40.7 29.5 54 19.7 13.3 43.5 21\n 71.5 23h399859zM103 281v-40h399897v40z",
  leftlinesegment: doubleBrushStroke("M40 281 V428 H0 V94 H40 V241 H400000 v40z"),
  leftbracketunder: doubleBrushStroke("M0 0 h120 V290 H399995 v120 H0z"),
  leftbracketover: doubleBrushStroke("M0 440 h120 V150 H399995 v-120 H0z"),
  leftmapsto: doubleBrushStroke("M40 281 V448H0V74H40V241H400000v40z"),
  // tofrom is from glyph U+21C4 in font KaTeX AMS Regular
  leftToFrom: "M0 147h400000v40H0zm0 214c68 40 115.7 95.7 143 167h22c15.3 0 23\n-.3 23-1 0-1.3-5.3-13.7-16-37-18-35.3-41.3-69-70-101l-7-8h399905v-40H95l7-8\nc28.7-32 52-65.7 70-101 10.7-23.3 16-35.7 16-37 0-.7-7.7-1-23-1h-22C115.7 265.3\n 68 321 0 361zm0-174v-40h399900v40zm100 154v40h399900v-40z",
  longequal: doubleBrushStroke("M0 50 h400000 v40H0z m0 194h40000v40H0z"),
  midbrace: "M200428 334\nc-100.7-8.3-195.3-44-280-108-55.3-42-101.7-93-139-153l-9-14c-2.7 4-5.7 8.7-9 14\n-53.3 86.7-123.7 153-211 199-66.7 36-137.3 56.3-212 62H0V214h199568c178.3-11.7\n 311.7-78.3 403-201 6-8 9.7-12 11-12 .7-.7 6.7-1 18-1s17.3.3 18 1c1.3 0 5 4 11\n 12 44.7 59.3 101.3 106.3 170 141s145.3 54.3 229 60h199572v120z",
  midbraceunder: "M199572 214\nc100.7 8.3 195.3 44 280 108 55.3 42 101.7 93 139 153l9 14c2.7-4 5.7-8.7 9-14\n 53.3-86.7 123.7-153 211-199 66.7-36 137.3-56.3 212-62h199568v120H200432c-178.3\n 11.7-311.7 78.3-403 201-6 8-9.7 12-11 12-.7.7-6.7 1-18 1s-17.3-.3-18-1c-1.3 0\n-5-4-11-12-44.7-59.3-101.3-106.3-170-141s-145.3-54.3-229-60H0V214z",
  oiintSize1: "M512.6 71.6c272.6 0 320.3 106.8 320.3 178.2 0 70.8-47.7 177.6\n-320.3 177.6S193.1 320.6 193.1 249.8c0-71.4 46.9-178.2 319.5-178.2z\nm368.1 178.2c0-86.4-60.9-215.4-368.1-215.4-306.4 0-367.3 129-367.3 215.4 0 85.8\n60.9 214.8 367.3 214.8 307.2 0 368.1-129 368.1-214.8z",
  oiintSize2: "M757.8 100.1c384.7 0 451.1 137.6 451.1 230 0 91.3-66.4 228.8\n-451.1 228.8-386.3 0-452.7-137.5-452.7-228.8 0-92.4 66.4-230 452.7-230z\nm502.4 230c0-111.2-82.4-277.2-502.4-277.2s-504 166-504 277.2\nc0 110 84 276 504 276s502.4-166 502.4-276z",
  oiiintSize1: "M681.4 71.6c408.9 0 480.5 106.8 480.5 178.2 0 70.8-71.6 177.6\n-480.5 177.6S202.1 320.6 202.1 249.8c0-71.4 70.5-178.2 479.3-178.2z\nm525.8 178.2c0-86.4-86.8-215.4-525.7-215.4-437.9 0-524.7 129-524.7 215.4 0\n85.8 86.8 214.8 524.7 214.8 438.9 0 525.7-129 525.7-214.8z",
  oiiintSize2: "M1021.2 53c603.6 0 707.8 165.8 707.8 277.2 0 110-104.2 275.8\n-707.8 275.8-606 0-710.2-165.8-710.2-275.8C311 218.8 415.2 53 1021.2 53z\nm770.4 277.1c0-131.2-126.4-327.6-770.5-327.6S248.4 198.9 248.4 330.1\nc0 130 128.8 326.4 772.7 326.4s770.5-196.4 770.5-326.4z",
  rightarrow: "M0 241v40h399891c-47.3 35.3-84 78-110 128\n-16.7 32-27.7 63.7-33 95 0 1.3-.2 2.7-.5 4-.3 1.3-.5 2.3-.5 3 0 7.3 6.7 11 20\n 11 8 0 13.2-.8 15.5-2.5 2.3-1.7 4.2-5.5 5.5-11.5 2-13.3 5.7-27 11-41 14.7-44.7\n 39-84.5 73-119.5s73.7-60.2 119-75.5c6-2 9-5.7 9-11s-3-9-9-11c-45.3-15.3-85\n-40.5-119-75.5s-58.3-74.8-73-119.5c-4.7-14-8.3-27.3-11-40-1.3-6.7-3.2-10.8-5.5\n-12.5-2.3-1.7-7.5-2.5-15.5-2.5-14 0-21 3.7-21 11 0 2 2 10.3 6 25 20.7 83.3 67\n 151.7 139 205zm0 0v40h399900v-40z",
  rightbrace: "M400000 542l\n-6 6h-17c-12.7 0-19.3-.3-20-1-4-4-7.3-8.3-10-13-35.3-51.3-80.8-93.8-136.5-127.5\ns-117.2-55.8-184.5-66.5c-.7 0-2-.3-4-1-18.7-2.7-76-4.3-172-5H0V214h399571l6 1\nc124.7 8 235 61.7 331 161 31.3 33.3 59.7 72.7 85 118l7 13v35z",
  rightbraceunder: "M399994 0l6 6v35l-6 11c-56 104-135.3 181.3-238 232-57.3\n 28.7-117 45-179 50H-300V214h399897c43.3-7 81-15 113-26 100.7-33 179.7-91 237\n-174 2.7-5 6-9 10-13 .7-1 7.3-1 20-1h17z",
  rightgroup: "M0 80h399565c371 0 266.7 149.4 414 180 5.9 1.2 18 0 18 0 2 0\n 3-1 3-3v-38c-76-158-257-219-435-219H0z",
  rightgroupunder: "M0 262h399565c371 0 266.7-149.4 414-180 5.9-1.2 18 0 18\n 0 2 0 3 1 3 3v38c-76 158-257 219-435 219H0z",
  rightharpoon: "M0 241v40h399993c4.7-4.7 7-9.3 7-14 0-9.3\n-3.7-15.3-11-18-92.7-56.7-159-133.7-199-231-3.3-9.3-6-14.7-8-16-2-1.3-7-2-15-2\n-10.7 0-16.7 2-18 6-2 2.7-1 9.7 3 21 15.3 42 36.7 81.8 64 119.5 27.3 37.7 58\n 69.2 92 94.5zm0 0v40h399900v-40z",
  rightharpoonplus: "M0 241v40h399993c4.7-4.7 7-9.3 7-14 0-9.3-3.7-15.3-11\n-18-92.7-56.7-159-133.7-199-231-3.3-9.3-6-14.7-8-16-2-1.3-7-2-15-2-10.7 0-16.7\n 2-18 6-2 2.7-1 9.7 3 21 15.3 42 36.7 81.8 64 119.5 27.3 37.7 58 69.2 92 94.5z\nm0 0v40h399900v-40z m100 194v40h399900v-40zm0 0v40h399900v-40z",
  rightharpoondown: "M399747 511c0 7.3 6.7 11 20 11 8 0 13-.8 15-2.5s4.7-6.8\n 8-15.5c40-94 99.3-166.3 178-217 13.3-8 20.3-12.3 21-13 5.3-3.3 8.5-5.8 9.5\n-7.5 1-1.7 1.5-5.2 1.5-10.5s-2.3-10.3-7-15H0v40h399908c-34 25.3-64.7 57-92 95\n-27.3 38-48.7 77.7-64 119-3.3 8.7-5 14-5 16zM0 241v40h399900v-40z",
  rightharpoondownplus: "M399747 705c0 7.3 6.7 11 20 11 8 0 13-.8\n 15-2.5s4.7-6.8 8-15.5c40-94 99.3-166.3 178-217 13.3-8 20.3-12.3 21-13 5.3-3.3\n 8.5-5.8 9.5-7.5 1-1.7 1.5-5.2 1.5-10.5s-2.3-10.3-7-15H0v40h399908c-34 25.3\n-64.7 57-92 95-27.3 38-48.7 77.7-64 119-3.3 8.7-5 14-5 16zM0 435v40h399900v-40z\nm0-194v40h400000v-40zm0 0v40h400000v-40z",
  righthook: "M399859 241c-764 0 0 0 0 0 40-3.3 68.7-15.7 86-37 10-12 15-25.3\n 15-40 0-22.7-9.8-40.7-29.5-54-19.7-13.3-43.5-21-71.5-23-17.3-1.3-26-8-26-20 0\n-13.3 8.7-20 26-20 38 0 71 11.2 99 33.5 0 0 7 5.6 21 16.7 14 11.2 21 33.5 21\n 66.8s-14 61.2-42 83.5c-28 22.3-61 33.5-99 33.5L0 241z M0 281v-40h399859v40z",
  rightlinesegment: doubleBrushStroke("M399960 241 V94 h40 V428 h-40 V281 H0 v-40z"),
  rightbracketunder: doubleBrushStroke("M399995 0 h-120 V290 H0 v120 H400000z"),
  rightbracketover: doubleBrushStroke("M399995 440 h-120 V150 H0 v-120 H399995z"),
  rightToFrom: "M400000 167c-70.7-42-118-97.7-142-167h-23c-15.3 0-23 .3-23\n 1 0 1.3 5.3 13.7 16 37 18 35.3 41.3 69 70 101l7 8H0v40h399905l-7 8c-28.7 32\n-52 65.7-70 101-10.7 23.3-16 35.7-16 37 0 .7 7.7 1 23 1h23c24-69.3 71.3-125 142\n-167z M100 147v40h399900v-40zM0 341v40h399900v-40z",
  // twoheadleftarrow is from glyph U+219E in font KaTeX AMS Regular
  twoheadleftarrow: "M0 167c68 40\n 115.7 95.7 143 167h22c15.3 0 23-.3 23-1 0-1.3-5.3-13.7-16-37-18-35.3-41.3-69\n-70-101l-7-8h125l9 7c50.7 39.3 85 86 103 140h46c0-4.7-6.3-18.7-19-42-18-35.3\n-40-67.3-66-96l-9-9h399716v-40H284l9-9c26-28.7 48-60.7 66-96 12.7-23.333 19\n-37.333 19-42h-46c-18 54-52.3 100.7-103 140l-9 7H95l7-8c28.7-32 52-65.7 70-101\n 10.7-23.333 16-35.7 16-37 0-.7-7.7-1-23-1h-22C115.7 71.3 68 127 0 167z",
  twoheadrightarrow: "M400000 167\nc-68-40-115.7-95.7-143-167h-22c-15.3 0-23 .3-23 1 0 1.3 5.3 13.7 16 37 18 35.3\n 41.3 69 70 101l7 8h-125l-9-7c-50.7-39.3-85-86-103-140h-46c0 4.7 6.3 18.7 19 42\n 18 35.3 40 67.3 66 96l9 9H0v40h399716l-9 9c-26 28.7-48 60.7-66 96-12.7 23.333\n-19 37.333-19 42h46c18-54 52.3-100.7 103-140l9-7h125l-7 8c-28.7 32-52 65.7-70\n 101-10.7 23.333-16 35.7-16 37 0 .7 7.7 1 23 1h22c27.3-71.3 75-127 143-167z",
  // tilde1 is a modified version of a glyph from the MnSymbol package
  tilde1: "M200 55.538c-77 0-168 73.953-177 73.953-3 0-7\n-2.175-9-5.437L2 97c-1-2-2-4-2-6 0-4 2-7 5-9l20-12C116 12 171 0 207 0c86 0\n 114 68 191 68 78 0 168-68 177-68 4 0 7 2 9 5l12 19c1 2.175 2 4.35 2 6.525 0\n 4.35-2 7.613-5 9.788l-19 13.05c-92 63.077-116.937 75.308-183 76.128\n-68.267.847-113-73.952-191-73.952z",
  // ditto tilde2, tilde3, & tilde4
  tilde2: "M344 55.266c-142 0-300.638 81.316-311.5 86.418\n-8.01 3.762-22.5 10.91-23.5 5.562L1 120c-1-2-1-3-1-4 0-5 3-9 8-10l18.4-9C160.9\n 31.9 283 0 358 0c148 0 188 122 331 122s314-97 326-97c4 0 8 2 10 7l7 21.114\nc1 2.14 1 3.21 1 4.28 0 5.347-3 9.626-7 10.696l-22.3 12.622C852.6 158.372 751\n 181.476 676 181.476c-149 0-189-126.21-332-126.21z",
  tilde3: "M786 59C457 59 32 175.242 13 175.242c-6 0-10-3.457\n-11-10.37L.15 138c-1-7 3-12 10-13l19.2-6.4C378.4 40.7 634.3 0 804.3 0c337 0\n 411.8 157 746.8 157 328 0 754-112 773-112 5 0 10 3 11 9l1 14.075c1 8.066-.697\n 16.595-6.697 17.492l-21.052 7.31c-367.9 98.146-609.15 122.696-778.15 122.696\n -338 0-409-156.573-744-156.573z",
  tilde4: "M786 58C457 58 32 177.487 13 177.487c-6 0-10-3.345\n-11-10.035L.15 143c-1-7 3-12 10-13l22-6.7C381.2 35 637.15 0 807.15 0c337 0 409\n 177 744 177 328 0 754-127 773-127 5 0 10 3 11 9l1 14.794c1 7.805-3 13.38-9\n 14.495l-20.7 5.574c-366.85 99.79-607.3 139.372-776.3 139.372-338 0-409\n -175.236-744-175.236z",
  // vec is from glyph U+20D7 in font KaTeX Main
  vec: "M377 20c0-5.333 1.833-10 5.5-14S391 0 397 0c4.667 0 8.667 1.667 12 5\n3.333 2.667 6.667 9 10 19 6.667 24.667 20.333 43.667 41 57 7.333 4.667 11\n10.667 11 18 0 6-1 10-3 12s-6.667 5-14 9c-28.667 14.667-53.667 35.667-75 63\n-1.333 1.333-3.167 3.5-5.5 6.5s-4 4.833-5 5.5c-1 .667-2.5 1.333-4.5 2s-4.333 1\n-7 1c-4.667 0-9.167-1.833-13.5-5.5S337 184 337 178c0-12.667 15.667-32.333 47-59\nH213l-171-1c-8.667-6-13-12.333-13-19 0-4.667 4.333-11.333 13-20h359\nc-16-25.333-24-45-24-59z",
  // widehat1 is a modified version of a glyph from the MnSymbol package
  widehat1: "M529 0h5l519 115c5 1 9 5 9 10 0 1-1 2-1 3l-4 22\nc-1 5-5 9-11 9h-2L532 67 19 159h-2c-5 0-9-4-11-9l-5-22c-1-6 2-12 8-13z",
  // ditto widehat2, widehat3, & widehat4
  widehat2: "M1181 0h2l1171 176c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 220h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
  widehat3: "M1181 0h2l1171 236c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 280h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
  widehat4: "M1181 0h2l1171 296c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 340h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
  // widecheck paths are all inverted versions of widehat
  widecheck1: "M529,159h5l519,-115c5,-1,9,-5,9,-10c0,-1,-1,-2,-1,-3l-4,-22c-1,\n-5,-5,-9,-11,-9h-2l-512,92l-513,-92h-2c-5,0,-9,4,-11,9l-5,22c-1,6,2,12,8,13z",
  widecheck2: "M1181,220h2l1171,-176c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,153l-1167,-153h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
  widecheck3: "M1181,280h2l1171,-236c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,213l-1167,-213h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
  widecheck4: "M1181,340h2l1171,-296c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,273l-1167,-273h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
  // The next ten paths support reaction arrows from the mhchem package.
  // Arrows for \ce{<-->} are offset from xAxis by 0.22ex, per mhchem in LaTeX
  // baraboveleftarrow is mostly from glyph U+2190 in font KaTeX Main
  baraboveleftarrow: "M400000 620h-399890l3 -3c68.7 -52.7 113.7 -120 135 -202\nc4 -14.7 6 -23 6 -25c0 -7.3 -7 -11 -21 -11c-8 0 -13.2 0.8 -15.5 2.5\nc-2.3 1.7 -4.2 5.8 -5.5 12.5c-1.3 4.7 -2.7 10.3 -4 17c-12 48.7 -34.8 92 -68.5 130\ns-74.2 66.3 -121.5 85c-10 4 -16 7.7 -18 11c0 8.7 6 14.3 18 17c47.3 18.7 87.8 47\n121.5 85s56.5 81.3 68.5 130c0.7 2 1.3 5 2 9s1.2 6.7 1.5 8c0.3 1.3 1 3.3 2 6\ns2.2 4.5 3.5 5.5c1.3 1 3.3 1.8 6 2.5s6 1 10 1c14 0 21 -3.7 21 -11\nc0 -2 -2 -10.3 -6 -25c-20 -79.3 -65 -146.7 -135 -202l-3 -3h399890z\nM100 620v40h399900v-40z M0 241v40h399900v-40zM0 241v40h399900v-40z",
  // rightarrowabovebar is mostly from glyph U+2192, KaTeX Main
  rightarrowabovebar: "M0 241v40h399891c-47.3 35.3-84 78-110 128-16.7 32\n-27.7 63.7-33 95 0 1.3-.2 2.7-.5 4-.3 1.3-.5 2.3-.5 3 0 7.3 6.7 11 20 11 8 0\n13.2-.8 15.5-2.5 2.3-1.7 4.2-5.5 5.5-11.5 2-13.3 5.7-27 11-41 14.7-44.7 39\n-84.5 73-119.5s73.7-60.2 119-75.5c6-2 9-5.7 9-11s-3-9-9-11c-45.3-15.3-85-40.5\n-119-75.5s-58.3-74.8-73-119.5c-4.7-14-8.3-27.3-11-40-1.3-6.7-3.2-10.8-5.5\n-12.5-2.3-1.7-7.5-2.5-15.5-2.5-14 0-21 3.7-21 11 0 2 2 10.3 6 25 20.7 83.3 67\n151.7 139 205zm96 379h399894v40H0zm0 0h399904v40H0z",
  // The short left harpoon has 0.5em (i.e. 500 units) kern on the left end.
  // Ref from mhchem.sty: \rlap{\raisebox{-.22ex}{$\kern0.5em
  baraboveshortleftharpoon: "M507,435c-4,4,-6.3,8.7,-7,14c0,5.3,0.7,9,2,11\nc1.3,2,5.3,5.3,12,10c90.7,54,156,130,196,228c3.3,10.7,6.3,16.3,9,17\nc2,0.7,5,1,9,1c0,0,5,0,5,0c10.7,0,16.7,-2,18,-6c2,-2.7,1,-9.7,-3,-21\nc-32,-87.3,-82.7,-157.7,-152,-211c0,0,-3,-3,-3,-3l399351,0l0,-40\nc-398570,0,-399437,0,-399437,0z M593 435 v40 H399500 v-40z\nM0 281 v-40 H399908 v40z M0 281 v-40 H399908 v40z",
  rightharpoonaboveshortbar: "M0,241 l0,40c399126,0,399993,0,399993,0\nc4.7,-4.7,7,-9.3,7,-14c0,-9.3,-3.7,-15.3,-11,-18c-92.7,-56.7,-159,-133.7,-199,\n-231c-3.3,-9.3,-6,-14.7,-8,-16c-2,-1.3,-7,-2,-15,-2c-10.7,0,-16.7,2,-18,6\nc-2,2.7,-1,9.7,3,21c15.3,42,36.7,81.8,64,119.5c27.3,37.7,58,69.2,92,94.5z\nM0 241 v40 H399908 v-40z M0 475 v-40 H399500 v40z M0 475 v-40 H399500 v40z",
  shortbaraboveleftharpoon: "M7,435c-4,4,-6.3,8.7,-7,14c0,5.3,0.7,9,2,11\nc1.3,2,5.3,5.3,12,10c90.7,54,156,130,196,228c3.3,10.7,6.3,16.3,9,17c2,0.7,5,1,9,\n1c0,0,5,0,5,0c10.7,0,16.7,-2,18,-6c2,-2.7,1,-9.7,-3,-21c-32,-87.3,-82.7,-157.7,\n-152,-211c0,0,-3,-3,-3,-3l399907,0l0,-40c-399126,0,-399993,0,-399993,0z\nM93 435 v40 H400000 v-40z M500 241 v40 H400000 v-40z M500 241 v40 H400000 v-40z",
  shortrightharpoonabovebar: "M53,241l0,40c398570,0,399437,0,399437,0\nc4.7,-4.7,7,-9.3,7,-14c0,-9.3,-3.7,-15.3,-11,-18c-92.7,-56.7,-159,-133.7,-199,\n-231c-3.3,-9.3,-6,-14.7,-8,-16c-2,-1.3,-7,-2,-15,-2c-10.7,0,-16.7,2,-18,6\nc-2,2.7,-1,9.7,3,21c15.3,42,36.7,81.8,64,119.5c27.3,37.7,58,69.2,92,94.5z\nM500 241 v40 H399408 v-40z M500 435 v40 H400000 v-40z"
};
var tallDelim = function tallDelim2(label, midHeight) {
  switch (label) {
    case "lbrack":
      return "M403 1759 V84 H666 V0 H319 V1759 v" + midHeight + " v1759 v84 h347 v-84\nH403z M403 1759 V0 H319 V1759 v" + midHeight + " v1759 v84 h84z";
    case "rbrack":
      return "M347 1759 V0 H0 V84 H263 V1759 v" + midHeight + " v1759 H0 v84 H347z\nM347 1759 V0 H263 V1759 v" + midHeight + " v1759 h84z";
    case "vert":
      return "M145 15 v585 v" + midHeight + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -midHeight + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M188 15 H145 v585 v" + midHeight + " v585 h43z";
    case "doublevert":
      return "M145 15 v585 v" + midHeight + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -midHeight + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M188 15 H145 v585 v" + midHeight + " v585 h43z\nM367 15 v585 v" + midHeight + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -midHeight + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M410 15 H367 v585 v" + midHeight + " v585 h43z";
    case "lfloor":
      return "M319 602 V0 H403 V602 v" + midHeight + " v1715 h263 v84 H319z\nMM319 602 V0 H403 V602 v" + midHeight + " v1715 H319z";
    case "rfloor":
      return "M319 602 V0 H403 V602 v" + midHeight + " v1799 H0 v-84 H319z\nMM319 602 V0 H403 V602 v" + midHeight + " v1715 H319z";
    case "lceil":
      return "M403 1759 V84 H666 V0 H319 V1759 v" + midHeight + " v602 h84z\nM403 1759 V0 H319 V1759 v" + midHeight + " v602 h84z";
    case "rceil":
      return "M347 1759 V0 H0 V84 H263 V1759 v" + midHeight + " v602 h84z\nM347 1759 V0 h-84 V1759 v" + midHeight + " v602 h84z";
    case "lparen":
      return "M863,9c0,-2,-2,-5,-6,-9c0,0,-17,0,-17,0c-12.7,0,-19.3,0.3,-20,1\nc-5.3,5.3,-10.3,11,-15,17c-242.7,294.7,-395.3,682,-458,1162c-21.3,163.3,-33.3,349,\n-36,557 l0," + (midHeight + 84) + "c0.2,6,0,26,0,60c2,159.3,10,310.7,24,454c53.3,528,210,\n949.7,470,1265c4.7,6,9.7,11.7,15,17c0.7,0.7,7,1,19,1c0,0,18,0,18,0c4,-4,6,-7,6,-9\nc0,-2.7,-3.3,-8.7,-10,-18c-135.3,-192.7,-235.5,-414.3,-300.5,-665c-65,-250.7,-102.5,\n-544.7,-112.5,-882c-2,-104,-3,-167,-3,-189\nl0,-" + (midHeight + 92) + "c0,-162.7,5.7,-314,17,-454c20.7,-272,63.7,-513,129,-723c65.3,\n-210,155.3,-396.3,270,-559c6.7,-9.3,10,-15.3,10,-18z";
    case "rparen":
      return "M76,0c-16.7,0,-25,3,-25,9c0,2,2,6.3,6,13c21.3,28.7,42.3,60.3,\n63,95c96.7,156.7,172.8,332.5,228.5,527.5c55.7,195,92.8,416.5,111.5,664.5\nc11.3,139.3,17,290.7,17,454c0,28,1.7,43,3.3,45l0," + (midHeight + 9) + "\nc-3,4,-3.3,16.7,-3.3,38c0,162,-5.7,313.7,-17,455c-18.7,248,-55.8,469.3,-111.5,664\nc-55.7,194.7,-131.8,370.3,-228.5,527c-20.7,34.7,-41.7,66.3,-63,95c-2,3.3,-4,7,-6,11\nc0,7.3,5.7,11,17,11c0,0,11,0,11,0c9.3,0,14.3,-0.3,15,-1c5.3,-5.3,10.3,-11,15,-17\nc242.7,-294.7,395.3,-681.7,458,-1161c21.3,-164.7,33.3,-350.7,36,-558\nl0,-" + (midHeight + 144) + "c-2,-159.3,-10,-310.7,-24,-454c-53.3,-528,-210,-949.7,\n-470,-1265c-4.7,-6,-9.7,-11.7,-15,-17c-0.7,-0.7,-6.7,-1,-18,-1z";
    default:
      throw new Error("Unknown stretchy delimiter.");
  }
};
function isMathDomNode(node) {
  return "toText" in node;
}
var DocumentFragment = class {
  // Never used; needed for satisfying interface.
  constructor(children) {
    this.children = void 0;
    this.classes = void 0;
    this.height = void 0;
    this.depth = void 0;
    this.maxFontSize = void 0;
    this.style = void 0;
    this.children = children;
    this.classes = [];
    this.height = 0;
    this.depth = 0;
    this.maxFontSize = 0;
    this.style = {};
  }
  hasClass(className) {
    return this.classes.includes(className);
  }
  /** Convert the fragment into a node. */
  toNode() {
    var frag = document.createDocumentFragment();
    for (var i2 = 0; i2 < this.children.length; i2++) {
      frag.appendChild(this.children[i2].toNode());
    }
    return frag;
  }
  /** Convert the fragment into HTML markup. */
  toMarkup() {
    var markup = "";
    for (var i2 = 0; i2 < this.children.length; i2++) {
      markup += this.children[i2].toMarkup();
    }
    return markup;
  }
  /**
   * Converts the math node into a string, similar to innerText. Applies to
   * MathDomNode's only.
   */
  toText() {
    return this.children.map((child) => {
      if (isMathDomNode(child)) {
        return child.toText();
      }
      throw new Error("Expected MathDomNode with toText, got " + child.constructor.name);
    }).join("");
  }
};
var ptPerUnit = {
  // https://en.wikibooks.org/wiki/LaTeX/Lengths and
  // https://tex.stackexchange.com/a/8263
  "pt": 1,
  // TeX point
  "mm": 7227 / 2540,
  // millimeter
  "cm": 7227 / 254,
  // centimeter
  "in": 72.27,
  // inch
  "bp": 803 / 800,
  // big (PostScript) points
  "pc": 12,
  // pica
  "dd": 1238 / 1157,
  // didot
  "cc": 14856 / 1157,
  // cicero (12 didot)
  "nd": 685 / 642,
  // new didot
  "nc": 1370 / 107,
  // new cicero (12 new didot)
  "sp": 1 / 65536,
  // scaled point (TeX's internal smallest unit)
  // https://tex.stackexchange.com/a/41371
  "px": 803 / 800
  // \pdfpxdimen defaults to 1 bp in pdfTeX and LuaTeX
};
var relativeUnit = {
  "ex": true,
  "em": true,
  "mu": true
};
var validUnit = function validUnit2(unit) {
  if (typeof unit !== "string") {
    unit = unit.unit;
  }
  return unit in ptPerUnit || unit in relativeUnit || unit === "ex";
};
var calculateSize = function calculateSize2(sizeValue, options) {
  var scale;
  if (sizeValue.unit in ptPerUnit) {
    scale = ptPerUnit[sizeValue.unit] / options.fontMetrics().ptPerEm / options.sizeMultiplier;
  } else if (sizeValue.unit === "mu") {
    scale = options.fontMetrics().cssEmPerMu;
  } else {
    var unitOptions;
    if (options.style.isTight()) {
      unitOptions = options.havingStyle(options.style.text());
    } else {
      unitOptions = options;
    }
    if (sizeValue.unit === "ex") {
      scale = unitOptions.fontMetrics().xHeight;
    } else if (sizeValue.unit === "em") {
      scale = unitOptions.fontMetrics().quad;
    } else {
      throw new ParseError("Invalid unit: '" + sizeValue.unit + "'");
    }
    if (unitOptions !== options) {
      scale *= unitOptions.sizeMultiplier / options.sizeMultiplier;
    }
  }
  return Math.min(sizeValue.number * scale, options.maxSize);
};
var makeEm = function makeEm2(n) {
  return +n.toFixed(4) + "em";
};
var createClass = function createClass2(classes) {
  return classes.filter((cls) => cls).join(" ");
};
var cssStyleToString = function cssStyleToString2(style) {
  var styles2 = "";
  for (var key of Object.keys(style)) {
    var value = style[key];
    if (value !== void 0) {
      styles2 += hyphenate(key) + ":" + value + ";";
    }
  }
  return styles2;
};
var initNode = function initNode2(classes, options, style) {
  this.classes = classes || [];
  this.attributes = {};
  this.height = 0;
  this.depth = 0;
  this.maxFontSize = 0;
  this.style = style || {};
  if (options) {
    if (options.style.isTight()) {
      this.classes.push("mtight");
    }
    var color = options.getColor();
    if (color) {
      this.style.color = color;
    }
  }
};
var toNode = function toNode2(tagName) {
  var node = document.createElement(tagName);
  node.className = createClass(this.classes);
  Object.assign(node.style, this.style);
  for (var attr2 of Object.keys(this.attributes)) {
    node.setAttribute(attr2, this.attributes[attr2]);
  }
  for (var i2 = 0; i2 < this.children.length; i2++) {
    node.appendChild(this.children[i2].toNode());
  }
  return node;
};
var invalidAttributeNameRegex = /[\s"'>/=\x00-\x1f]/;
var toMarkup = function toMarkup2(tagName) {
  var markup = "<" + tagName;
  if (this.classes.length) {
    markup += ' class="' + escape(createClass(this.classes)) + '"';
  }
  var styles2 = cssStyleToString(this.style);
  if (styles2) {
    markup += ' style="' + escape(styles2) + '"';
  }
  for (var attr2 of Object.keys(this.attributes)) {
    if (invalidAttributeNameRegex.test(attr2)) {
      throw new ParseError("Invalid attribute name '" + attr2 + "'");
    }
    markup += " " + attr2 + '="' + escape(this.attributes[attr2]) + '"';
  }
  markup += ">";
  for (var i2 = 0; i2 < this.children.length; i2++) {
    markup += this.children[i2].toMarkup();
  }
  markup += "</" + tagName + ">";
  return markup;
};
var Span = class {
  constructor(classes, children, options, style) {
    this.children = void 0;
    this.attributes = void 0;
    this.classes = void 0;
    this.height = void 0;
    this.depth = void 0;
    this.width = void 0;
    this.maxFontSize = void 0;
    this.style = void 0;
    this.italic = void 0;
    initNode.call(this, classes, options, style);
    this.children = children || [];
  }
  /**
   * Sets an arbitrary attribute on the span. Warning: use this wisely. Not
   * all browsers support attributes the same, and having too many custom
   * attributes is probably bad.
   */
  setAttribute(attribute, value) {
    this.attributes[attribute] = value;
  }
  hasClass(className) {
    return this.classes.includes(className);
  }
  toNode() {
    return toNode.call(this, "span");
  }
  toMarkup() {
    return toMarkup.call(this, "span");
  }
};
var Anchor = class {
  constructor(href, classes, children, options) {
    this.children = void 0;
    this.attributes = void 0;
    this.classes = void 0;
    this.height = void 0;
    this.depth = void 0;
    this.maxFontSize = void 0;
    this.style = void 0;
    initNode.call(this, classes, options);
    this.children = children || [];
    this.setAttribute("href", href);
  }
  setAttribute(attribute, value) {
    this.attributes[attribute] = value;
  }
  hasClass(className) {
    return this.classes.includes(className);
  }
  toNode() {
    return toNode.call(this, "a");
  }
  toMarkup() {
    return toMarkup.call(this, "a");
  }
};
var Img = class {
  constructor(src, alt, style) {
    this.src = void 0;
    this.alt = void 0;
    this.classes = void 0;
    this.height = void 0;
    this.depth = void 0;
    this.maxFontSize = void 0;
    this.style = void 0;
    this.alt = alt;
    this.src = src;
    this.classes = ["mord"];
    this.height = 0;
    this.depth = 0;
    this.maxFontSize = 0;
    this.style = style;
  }
  hasClass(className) {
    return this.classes.includes(className);
  }
  toNode() {
    var node = document.createElement("img");
    node.src = this.src;
    node.alt = this.alt;
    node.className = "mord";
    Object.assign(node.style, this.style);
    return node;
  }
  toMarkup() {
    var markup = '<img src="' + escape(this.src) + '"' + (' alt="' + escape(this.alt) + '"');
    var styles2 = cssStyleToString(this.style);
    if (styles2) {
      markup += ' style="' + escape(styles2) + '"';
    }
    markup += "'/>";
    return markup;
  }
};
var iCombinations = {
  "\xEE": "\u0131\u0302",
  "\xEF": "\u0131\u0308",
  "\xED": "\u0131\u0301",
  // 'ī': '\u0131\u0304', // enable when we add Extended Latin
  "\xEC": "\u0131\u0300"
};
var SymbolNode = class {
  constructor(text3, height, depth, italic2, skew, width, classes, style) {
    this.text = void 0;
    this.height = void 0;
    this.depth = void 0;
    this.italic = void 0;
    this.skew = void 0;
    this.width = void 0;
    this.maxFontSize = void 0;
    this.classes = void 0;
    this.style = void 0;
    this.text = text3;
    this.height = height || 0;
    this.depth = depth || 0;
    this.italic = italic2 || 0;
    this.skew = skew || 0;
    this.width = width || 0;
    this.classes = classes || [];
    this.style = style || {};
    this.maxFontSize = 0;
    var script2 = scriptFromCodepoint(this.text.charCodeAt(0));
    if (script2) {
      this.classes.push(script2 + "_fallback");
    }
    if (/[îïíì]/.test(this.text)) {
      this.text = iCombinations[this.text];
    }
  }
  hasClass(className) {
    return this.classes.includes(className);
  }
  /**
   * Creates a text node or span from a symbol node. Note that a span is only
   * created if it is needed.
   */
  toNode() {
    var node = document.createTextNode(this.text);
    var span = null;
    if (this.italic > 0) {
      span = document.createElement("span");
      span.style.marginRight = makeEm(this.italic);
    }
    if (this.classes.length > 0) {
      span = span || document.createElement("span");
      span.className = createClass(this.classes);
    }
    if (Object.keys(this.style).length > 0) {
      span = span || document.createElement("span");
      Object.assign(span.style, this.style);
    }
    if (span) {
      span.appendChild(node);
      return span;
    } else {
      return node;
    }
  }
  /**
   * Creates markup for a symbol node.
   */
  toMarkup() {
    var needsSpan = false;
    var markup = "<span";
    if (this.classes.length) {
      needsSpan = true;
      markup += ' class="';
      markup += escape(createClass(this.classes));
      markup += '"';
    }
    var styles2 = "";
    if (this.italic > 0) {
      styles2 += "margin-right:" + makeEm(this.italic) + ";";
    }
    styles2 += cssStyleToString(this.style);
    if (styles2) {
      needsSpan = true;
      markup += ' style="' + escape(styles2) + '"';
    }
    var escaped = escape(this.text);
    if (needsSpan) {
      markup += ">";
      markup += escaped;
      markup += "</span>";
      return markup;
    } else {
      return escaped;
    }
  }
};
var SvgNode = class {
  constructor(children, attributes) {
    this.children = void 0;
    this.attributes = void 0;
    this.children = children || [];
    this.attributes = attributes || {};
  }
  toNode() {
    var svgNS = "http://www.w3.org/2000/svg";
    var node = document.createElementNS(svgNS, "svg");
    for (var attr2 of Object.keys(this.attributes)) {
      node.setAttribute(attr2, this.attributes[attr2]);
    }
    for (var i2 = 0; i2 < this.children.length; i2++) {
      node.appendChild(this.children[i2].toNode());
    }
    return node;
  }
  toMarkup() {
    var markup = '<svg xmlns="http://www.w3.org/2000/svg"';
    for (var attr2 of Object.keys(this.attributes)) {
      markup += " " + attr2 + '="' + escape(this.attributes[attr2]) + '"';
    }
    markup += ">";
    for (var i2 = 0; i2 < this.children.length; i2++) {
      markup += this.children[i2].toMarkup();
    }
    markup += "</svg>";
    return markup;
  }
};
var PathNode = class {
  constructor(pathName, alternate) {
    this.pathName = void 0;
    this.alternate = void 0;
    this.pathName = pathName;
    this.alternate = alternate;
  }
  toNode() {
    var svgNS = "http://www.w3.org/2000/svg";
    var node = document.createElementNS(svgNS, "path");
    if (this.alternate) {
      node.setAttribute("d", this.alternate);
    } else {
      node.setAttribute("d", path[this.pathName]);
    }
    return node;
  }
  toMarkup() {
    if (this.alternate) {
      return '<path d="' + escape(this.alternate) + '"/>';
    } else {
      return '<path d="' + escape(path[this.pathName]) + '"/>';
    }
  }
};
var LineNode = class {
  constructor(attributes) {
    this.attributes = void 0;
    this.attributes = attributes || {};
  }
  toNode() {
    var svgNS = "http://www.w3.org/2000/svg";
    var node = document.createElementNS(svgNS, "line");
    for (var attr2 of Object.keys(this.attributes)) {
      node.setAttribute(attr2, this.attributes[attr2]);
    }
    return node;
  }
  toMarkup() {
    var markup = "<line";
    for (var attr2 of Object.keys(this.attributes)) {
      markup += " " + attr2 + '="' + escape(this.attributes[attr2]) + '"';
    }
    markup += "/>";
    return markup;
  }
};
function assertSymbolDomNode(group) {
  if (group instanceof SymbolNode) {
    return group;
  } else {
    throw new Error("Expected symbolNode but got " + String(group) + ".");
  }
}
function assertSpan(group) {
  if (group instanceof Span) {
    return group;
  } else {
    throw new Error("Expected span<HtmlDomNode> but got " + String(group) + ".");
  }
}
var hasHtmlDomChildren = (node) => node instanceof Span || node instanceof Anchor || node instanceof DocumentFragment;
var fontMetricsData = {
  "AMS-Regular": {
    "32": [0, 0, 0, 0, 0.25],
    "65": [0, 0.68889, 0, 0, 0.72222],
    "66": [0, 0.68889, 0, 0, 0.66667],
    "67": [0, 0.68889, 0, 0, 0.72222],
    "68": [0, 0.68889, 0, 0, 0.72222],
    "69": [0, 0.68889, 0, 0, 0.66667],
    "70": [0, 0.68889, 0, 0, 0.61111],
    "71": [0, 0.68889, 0, 0, 0.77778],
    "72": [0, 0.68889, 0, 0, 0.77778],
    "73": [0, 0.68889, 0, 0, 0.38889],
    "74": [0.16667, 0.68889, 0, 0, 0.5],
    "75": [0, 0.68889, 0, 0, 0.77778],
    "76": [0, 0.68889, 0, 0, 0.66667],
    "77": [0, 0.68889, 0, 0, 0.94445],
    "78": [0, 0.68889, 0, 0, 0.72222],
    "79": [0.16667, 0.68889, 0, 0, 0.77778],
    "80": [0, 0.68889, 0, 0, 0.61111],
    "81": [0.16667, 0.68889, 0, 0, 0.77778],
    "82": [0, 0.68889, 0, 0, 0.72222],
    "83": [0, 0.68889, 0, 0, 0.55556],
    "84": [0, 0.68889, 0, 0, 0.66667],
    "85": [0, 0.68889, 0, 0, 0.72222],
    "86": [0, 0.68889, 0, 0, 0.72222],
    "87": [0, 0.68889, 0, 0, 1],
    "88": [0, 0.68889, 0, 0, 0.72222],
    "89": [0, 0.68889, 0, 0, 0.72222],
    "90": [0, 0.68889, 0, 0, 0.66667],
    "107": [0, 0.68889, 0, 0, 0.55556],
    "160": [0, 0, 0, 0, 0.25],
    "165": [0, 0.675, 0.025, 0, 0.75],
    "174": [0.15559, 0.69224, 0, 0, 0.94666],
    "240": [0, 0.68889, 0, 0, 0.55556],
    "295": [0, 0.68889, 0, 0, 0.54028],
    "710": [0, 0.825, 0, 0, 2.33334],
    "732": [0, 0.9, 0, 0, 2.33334],
    "770": [0, 0.825, 0, 0, 2.33334],
    "771": [0, 0.9, 0, 0, 2.33334],
    "989": [0.08167, 0.58167, 0, 0, 0.77778],
    "1008": [0, 0.43056, 0.04028, 0, 0.66667],
    "8245": [0, 0.54986, 0, 0, 0.275],
    "8463": [0, 0.68889, 0, 0, 0.54028],
    "8487": [0, 0.68889, 0, 0, 0.72222],
    "8498": [0, 0.68889, 0, 0, 0.55556],
    "8502": [0, 0.68889, 0, 0, 0.66667],
    "8503": [0, 0.68889, 0, 0, 0.44445],
    "8504": [0, 0.68889, 0, 0, 0.66667],
    "8513": [0, 0.68889, 0, 0, 0.63889],
    "8592": [-0.03598, 0.46402, 0, 0, 0.5],
    "8594": [-0.03598, 0.46402, 0, 0, 0.5],
    "8602": [-0.13313, 0.36687, 0, 0, 1],
    "8603": [-0.13313, 0.36687, 0, 0, 1],
    "8606": [0.01354, 0.52239, 0, 0, 1],
    "8608": [0.01354, 0.52239, 0, 0, 1],
    "8610": [0.01354, 0.52239, 0, 0, 1.11111],
    "8611": [0.01354, 0.52239, 0, 0, 1.11111],
    "8619": [0, 0.54986, 0, 0, 1],
    "8620": [0, 0.54986, 0, 0, 1],
    "8621": [-0.13313, 0.37788, 0, 0, 1.38889],
    "8622": [-0.13313, 0.36687, 0, 0, 1],
    "8624": [0, 0.69224, 0, 0, 0.5],
    "8625": [0, 0.69224, 0, 0, 0.5],
    "8630": [0, 0.43056, 0, 0, 1],
    "8631": [0, 0.43056, 0, 0, 1],
    "8634": [0.08198, 0.58198, 0, 0, 0.77778],
    "8635": [0.08198, 0.58198, 0, 0, 0.77778],
    "8638": [0.19444, 0.69224, 0, 0, 0.41667],
    "8639": [0.19444, 0.69224, 0, 0, 0.41667],
    "8642": [0.19444, 0.69224, 0, 0, 0.41667],
    "8643": [0.19444, 0.69224, 0, 0, 0.41667],
    "8644": [0.1808, 0.675, 0, 0, 1],
    "8646": [0.1808, 0.675, 0, 0, 1],
    "8647": [0.1808, 0.675, 0, 0, 1],
    "8648": [0.19444, 0.69224, 0, 0, 0.83334],
    "8649": [0.1808, 0.675, 0, 0, 1],
    "8650": [0.19444, 0.69224, 0, 0, 0.83334],
    "8651": [0.01354, 0.52239, 0, 0, 1],
    "8652": [0.01354, 0.52239, 0, 0, 1],
    "8653": [-0.13313, 0.36687, 0, 0, 1],
    "8654": [-0.13313, 0.36687, 0, 0, 1],
    "8655": [-0.13313, 0.36687, 0, 0, 1],
    "8666": [0.13667, 0.63667, 0, 0, 1],
    "8667": [0.13667, 0.63667, 0, 0, 1],
    "8669": [-0.13313, 0.37788, 0, 0, 1],
    "8672": [-0.064, 0.437, 0, 0, 1.334],
    "8674": [-0.064, 0.437, 0, 0, 1.334],
    "8705": [0, 0.825, 0, 0, 0.5],
    "8708": [0, 0.68889, 0, 0, 0.55556],
    "8709": [0.08167, 0.58167, 0, 0, 0.77778],
    "8717": [0, 0.43056, 0, 0, 0.42917],
    "8722": [-0.03598, 0.46402, 0, 0, 0.5],
    "8724": [0.08198, 0.69224, 0, 0, 0.77778],
    "8726": [0.08167, 0.58167, 0, 0, 0.77778],
    "8733": [0, 0.69224, 0, 0, 0.77778],
    "8736": [0, 0.69224, 0, 0, 0.72222],
    "8737": [0, 0.69224, 0, 0, 0.72222],
    "8738": [0.03517, 0.52239, 0, 0, 0.72222],
    "8739": [0.08167, 0.58167, 0, 0, 0.22222],
    "8740": [0.25142, 0.74111, 0, 0, 0.27778],
    "8741": [0.08167, 0.58167, 0, 0, 0.38889],
    "8742": [0.25142, 0.74111, 0, 0, 0.5],
    "8756": [0, 0.69224, 0, 0, 0.66667],
    "8757": [0, 0.69224, 0, 0, 0.66667],
    "8764": [-0.13313, 0.36687, 0, 0, 0.77778],
    "8765": [-0.13313, 0.37788, 0, 0, 0.77778],
    "8769": [-0.13313, 0.36687, 0, 0, 0.77778],
    "8770": [-0.03625, 0.46375, 0, 0, 0.77778],
    "8774": [0.30274, 0.79383, 0, 0, 0.77778],
    "8776": [-0.01688, 0.48312, 0, 0, 0.77778],
    "8778": [0.08167, 0.58167, 0, 0, 0.77778],
    "8782": [0.06062, 0.54986, 0, 0, 0.77778],
    "8783": [0.06062, 0.54986, 0, 0, 0.77778],
    "8785": [0.08198, 0.58198, 0, 0, 0.77778],
    "8786": [0.08198, 0.58198, 0, 0, 0.77778],
    "8787": [0.08198, 0.58198, 0, 0, 0.77778],
    "8790": [0, 0.69224, 0, 0, 0.77778],
    "8791": [0.22958, 0.72958, 0, 0, 0.77778],
    "8796": [0.08198, 0.91667, 0, 0, 0.77778],
    "8806": [0.25583, 0.75583, 0, 0, 0.77778],
    "8807": [0.25583, 0.75583, 0, 0, 0.77778],
    "8808": [0.25142, 0.75726, 0, 0, 0.77778],
    "8809": [0.25142, 0.75726, 0, 0, 0.77778],
    "8812": [0.25583, 0.75583, 0, 0, 0.5],
    "8814": [0.20576, 0.70576, 0, 0, 0.77778],
    "8815": [0.20576, 0.70576, 0, 0, 0.77778],
    "8816": [0.30274, 0.79383, 0, 0, 0.77778],
    "8817": [0.30274, 0.79383, 0, 0, 0.77778],
    "8818": [0.22958, 0.72958, 0, 0, 0.77778],
    "8819": [0.22958, 0.72958, 0, 0, 0.77778],
    "8822": [0.1808, 0.675, 0, 0, 0.77778],
    "8823": [0.1808, 0.675, 0, 0, 0.77778],
    "8828": [0.13667, 0.63667, 0, 0, 0.77778],
    "8829": [0.13667, 0.63667, 0, 0, 0.77778],
    "8830": [0.22958, 0.72958, 0, 0, 0.77778],
    "8831": [0.22958, 0.72958, 0, 0, 0.77778],
    "8832": [0.20576, 0.70576, 0, 0, 0.77778],
    "8833": [0.20576, 0.70576, 0, 0, 0.77778],
    "8840": [0.30274, 0.79383, 0, 0, 0.77778],
    "8841": [0.30274, 0.79383, 0, 0, 0.77778],
    "8842": [0.13597, 0.63597, 0, 0, 0.77778],
    "8843": [0.13597, 0.63597, 0, 0, 0.77778],
    "8847": [0.03517, 0.54986, 0, 0, 0.77778],
    "8848": [0.03517, 0.54986, 0, 0, 0.77778],
    "8858": [0.08198, 0.58198, 0, 0, 0.77778],
    "8859": [0.08198, 0.58198, 0, 0, 0.77778],
    "8861": [0.08198, 0.58198, 0, 0, 0.77778],
    "8862": [0, 0.675, 0, 0, 0.77778],
    "8863": [0, 0.675, 0, 0, 0.77778],
    "8864": [0, 0.675, 0, 0, 0.77778],
    "8865": [0, 0.675, 0, 0, 0.77778],
    "8872": [0, 0.69224, 0, 0, 0.61111],
    "8873": [0, 0.69224, 0, 0, 0.72222],
    "8874": [0, 0.69224, 0, 0, 0.88889],
    "8876": [0, 0.68889, 0, 0, 0.61111],
    "8877": [0, 0.68889, 0, 0, 0.61111],
    "8878": [0, 0.68889, 0, 0, 0.72222],
    "8879": [0, 0.68889, 0, 0, 0.72222],
    "8882": [0.03517, 0.54986, 0, 0, 0.77778],
    "8883": [0.03517, 0.54986, 0, 0, 0.77778],
    "8884": [0.13667, 0.63667, 0, 0, 0.77778],
    "8885": [0.13667, 0.63667, 0, 0, 0.77778],
    "8888": [0, 0.54986, 0, 0, 1.11111],
    "8890": [0.19444, 0.43056, 0, 0, 0.55556],
    "8891": [0.19444, 0.69224, 0, 0, 0.61111],
    "8892": [0.19444, 0.69224, 0, 0, 0.61111],
    "8901": [0, 0.54986, 0, 0, 0.27778],
    "8903": [0.08167, 0.58167, 0, 0, 0.77778],
    "8905": [0.08167, 0.58167, 0, 0, 0.77778],
    "8906": [0.08167, 0.58167, 0, 0, 0.77778],
    "8907": [0, 0.69224, 0, 0, 0.77778],
    "8908": [0, 0.69224, 0, 0, 0.77778],
    "8909": [-0.03598, 0.46402, 0, 0, 0.77778],
    "8910": [0, 0.54986, 0, 0, 0.76042],
    "8911": [0, 0.54986, 0, 0, 0.76042],
    "8912": [0.03517, 0.54986, 0, 0, 0.77778],
    "8913": [0.03517, 0.54986, 0, 0, 0.77778],
    "8914": [0, 0.54986, 0, 0, 0.66667],
    "8915": [0, 0.54986, 0, 0, 0.66667],
    "8916": [0, 0.69224, 0, 0, 0.66667],
    "8918": [0.0391, 0.5391, 0, 0, 0.77778],
    "8919": [0.0391, 0.5391, 0, 0, 0.77778],
    "8920": [0.03517, 0.54986, 0, 0, 1.33334],
    "8921": [0.03517, 0.54986, 0, 0, 1.33334],
    "8922": [0.38569, 0.88569, 0, 0, 0.77778],
    "8923": [0.38569, 0.88569, 0, 0, 0.77778],
    "8926": [0.13667, 0.63667, 0, 0, 0.77778],
    "8927": [0.13667, 0.63667, 0, 0, 0.77778],
    "8928": [0.30274, 0.79383, 0, 0, 0.77778],
    "8929": [0.30274, 0.79383, 0, 0, 0.77778],
    "8934": [0.23222, 0.74111, 0, 0, 0.77778],
    "8935": [0.23222, 0.74111, 0, 0, 0.77778],
    "8936": [0.23222, 0.74111, 0, 0, 0.77778],
    "8937": [0.23222, 0.74111, 0, 0, 0.77778],
    "8938": [0.20576, 0.70576, 0, 0, 0.77778],
    "8939": [0.20576, 0.70576, 0, 0, 0.77778],
    "8940": [0.30274, 0.79383, 0, 0, 0.77778],
    "8941": [0.30274, 0.79383, 0, 0, 0.77778],
    "8994": [0.19444, 0.69224, 0, 0, 0.77778],
    "8995": [0.19444, 0.69224, 0, 0, 0.77778],
    "9416": [0.15559, 0.69224, 0, 0, 0.90222],
    "9484": [0, 0.69224, 0, 0, 0.5],
    "9488": [0, 0.69224, 0, 0, 0.5],
    "9492": [0, 0.37788, 0, 0, 0.5],
    "9496": [0, 0.37788, 0, 0, 0.5],
    "9585": [0.19444, 0.68889, 0, 0, 0.88889],
    "9586": [0.19444, 0.74111, 0, 0, 0.88889],
    "9632": [0, 0.675, 0, 0, 0.77778],
    "9633": [0, 0.675, 0, 0, 0.77778],
    "9650": [0, 0.54986, 0, 0, 0.72222],
    "9651": [0, 0.54986, 0, 0, 0.72222],
    "9654": [0.03517, 0.54986, 0, 0, 0.77778],
    "9660": [0, 0.54986, 0, 0, 0.72222],
    "9661": [0, 0.54986, 0, 0, 0.72222],
    "9664": [0.03517, 0.54986, 0, 0, 0.77778],
    "9674": [0.11111, 0.69224, 0, 0, 0.66667],
    "9733": [0.19444, 0.69224, 0, 0, 0.94445],
    "10003": [0, 0.69224, 0, 0, 0.83334],
    "10016": [0, 0.69224, 0, 0, 0.83334],
    "10731": [0.11111, 0.69224, 0, 0, 0.66667],
    "10846": [0.19444, 0.75583, 0, 0, 0.61111],
    "10877": [0.13667, 0.63667, 0, 0, 0.77778],
    "10878": [0.13667, 0.63667, 0, 0, 0.77778],
    "10885": [0.25583, 0.75583, 0, 0, 0.77778],
    "10886": [0.25583, 0.75583, 0, 0, 0.77778],
    "10887": [0.13597, 0.63597, 0, 0, 0.77778],
    "10888": [0.13597, 0.63597, 0, 0, 0.77778],
    "10889": [0.26167, 0.75726, 0, 0, 0.77778],
    "10890": [0.26167, 0.75726, 0, 0, 0.77778],
    "10891": [0.48256, 0.98256, 0, 0, 0.77778],
    "10892": [0.48256, 0.98256, 0, 0, 0.77778],
    "10901": [0.13667, 0.63667, 0, 0, 0.77778],
    "10902": [0.13667, 0.63667, 0, 0, 0.77778],
    "10933": [0.25142, 0.75726, 0, 0, 0.77778],
    "10934": [0.25142, 0.75726, 0, 0, 0.77778],
    "10935": [0.26167, 0.75726, 0, 0, 0.77778],
    "10936": [0.26167, 0.75726, 0, 0, 0.77778],
    "10937": [0.26167, 0.75726, 0, 0, 0.77778],
    "10938": [0.26167, 0.75726, 0, 0, 0.77778],
    "10949": [0.25583, 0.75583, 0, 0, 0.77778],
    "10950": [0.25583, 0.75583, 0, 0, 0.77778],
    "10955": [0.28481, 0.79383, 0, 0, 0.77778],
    "10956": [0.28481, 0.79383, 0, 0, 0.77778],
    "57350": [0.08167, 0.58167, 0, 0, 0.22222],
    "57351": [0.08167, 0.58167, 0, 0, 0.38889],
    "57352": [0.08167, 0.58167, 0, 0, 0.77778],
    "57353": [0, 0.43056, 0.04028, 0, 0.66667],
    "57356": [0.25142, 0.75726, 0, 0, 0.77778],
    "57357": [0.25142, 0.75726, 0, 0, 0.77778],
    "57358": [0.41951, 0.91951, 0, 0, 0.77778],
    "57359": [0.30274, 0.79383, 0, 0, 0.77778],
    "57360": [0.30274, 0.79383, 0, 0, 0.77778],
    "57361": [0.41951, 0.91951, 0, 0, 0.77778],
    "57366": [0.25142, 0.75726, 0, 0, 0.77778],
    "57367": [0.25142, 0.75726, 0, 0, 0.77778],
    "57368": [0.25142, 0.75726, 0, 0, 0.77778],
    "57369": [0.25142, 0.75726, 0, 0, 0.77778],
    "57370": [0.13597, 0.63597, 0, 0, 0.77778],
    "57371": [0.13597, 0.63597, 0, 0, 0.77778]
  },
  "Caligraphic-Regular": {
    "32": [0, 0, 0, 0, 0.25],
    "65": [0, 0.68333, 0, 0.19445, 0.79847],
    "66": [0, 0.68333, 0.03041, 0.13889, 0.65681],
    "67": [0, 0.68333, 0.05834, 0.13889, 0.52653],
    "68": [0, 0.68333, 0.02778, 0.08334, 0.77139],
    "69": [0, 0.68333, 0.08944, 0.11111, 0.52778],
    "70": [0, 0.68333, 0.09931, 0.11111, 0.71875],
    "71": [0.09722, 0.68333, 0.0593, 0.11111, 0.59487],
    "72": [0, 0.68333, 965e-5, 0.11111, 0.84452],
    "73": [0, 0.68333, 0.07382, 0, 0.54452],
    "74": [0.09722, 0.68333, 0.18472, 0.16667, 0.67778],
    "75": [0, 0.68333, 0.01445, 0.05556, 0.76195],
    "76": [0, 0.68333, 0, 0.13889, 0.68972],
    "77": [0, 0.68333, 0, 0.13889, 1.2009],
    "78": [0, 0.68333, 0.14736, 0.08334, 0.82049],
    "79": [0, 0.68333, 0.02778, 0.11111, 0.79611],
    "80": [0, 0.68333, 0.08222, 0.08334, 0.69556],
    "81": [0.09722, 0.68333, 0, 0.11111, 0.81667],
    "82": [0, 0.68333, 0, 0.08334, 0.8475],
    "83": [0, 0.68333, 0.075, 0.13889, 0.60556],
    "84": [0, 0.68333, 0.25417, 0, 0.54464],
    "85": [0, 0.68333, 0.09931, 0.08334, 0.62583],
    "86": [0, 0.68333, 0.08222, 0, 0.61278],
    "87": [0, 0.68333, 0.08222, 0.08334, 0.98778],
    "88": [0, 0.68333, 0.14643, 0.13889, 0.7133],
    "89": [0.09722, 0.68333, 0.08222, 0.08334, 0.66834],
    "90": [0, 0.68333, 0.07944, 0.13889, 0.72473],
    "160": [0, 0, 0, 0, 0.25]
  },
  "Fraktur-Regular": {
    "32": [0, 0, 0, 0, 0.25],
    "33": [0, 0.69141, 0, 0, 0.29574],
    "34": [0, 0.69141, 0, 0, 0.21471],
    "38": [0, 0.69141, 0, 0, 0.73786],
    "39": [0, 0.69141, 0, 0, 0.21201],
    "40": [0.24982, 0.74947, 0, 0, 0.38865],
    "41": [0.24982, 0.74947, 0, 0, 0.38865],
    "42": [0, 0.62119, 0, 0, 0.27764],
    "43": [0.08319, 0.58283, 0, 0, 0.75623],
    "44": [0, 0.10803, 0, 0, 0.27764],
    "45": [0.08319, 0.58283, 0, 0, 0.75623],
    "46": [0, 0.10803, 0, 0, 0.27764],
    "47": [0.24982, 0.74947, 0, 0, 0.50181],
    "48": [0, 0.47534, 0, 0, 0.50181],
    "49": [0, 0.47534, 0, 0, 0.50181],
    "50": [0, 0.47534, 0, 0, 0.50181],
    "51": [0.18906, 0.47534, 0, 0, 0.50181],
    "52": [0.18906, 0.47534, 0, 0, 0.50181],
    "53": [0.18906, 0.47534, 0, 0, 0.50181],
    "54": [0, 0.69141, 0, 0, 0.50181],
    "55": [0.18906, 0.47534, 0, 0, 0.50181],
    "56": [0, 0.69141, 0, 0, 0.50181],
    "57": [0.18906, 0.47534, 0, 0, 0.50181],
    "58": [0, 0.47534, 0, 0, 0.21606],
    "59": [0.12604, 0.47534, 0, 0, 0.21606],
    "61": [-0.13099, 0.36866, 0, 0, 0.75623],
    "63": [0, 0.69141, 0, 0, 0.36245],
    "65": [0, 0.69141, 0, 0, 0.7176],
    "66": [0, 0.69141, 0, 0, 0.88397],
    "67": [0, 0.69141, 0, 0, 0.61254],
    "68": [0, 0.69141, 0, 0, 0.83158],
    "69": [0, 0.69141, 0, 0, 0.66278],
    "70": [0.12604, 0.69141, 0, 0, 0.61119],
    "71": [0, 0.69141, 0, 0, 0.78539],
    "72": [0.06302, 0.69141, 0, 0, 0.7203],
    "73": [0, 0.69141, 0, 0, 0.55448],
    "74": [0.12604, 0.69141, 0, 0, 0.55231],
    "75": [0, 0.69141, 0, 0, 0.66845],
    "76": [0, 0.69141, 0, 0, 0.66602],
    "77": [0, 0.69141, 0, 0, 1.04953],
    "78": [0, 0.69141, 0, 0, 0.83212],
    "79": [0, 0.69141, 0, 0, 0.82699],
    "80": [0.18906, 0.69141, 0, 0, 0.82753],
    "81": [0.03781, 0.69141, 0, 0, 0.82699],
    "82": [0, 0.69141, 0, 0, 0.82807],
    "83": [0, 0.69141, 0, 0, 0.82861],
    "84": [0, 0.69141, 0, 0, 0.66899],
    "85": [0, 0.69141, 0, 0, 0.64576],
    "86": [0, 0.69141, 0, 0, 0.83131],
    "87": [0, 0.69141, 0, 0, 1.04602],
    "88": [0, 0.69141, 0, 0, 0.71922],
    "89": [0.18906, 0.69141, 0, 0, 0.83293],
    "90": [0.12604, 0.69141, 0, 0, 0.60201],
    "91": [0.24982, 0.74947, 0, 0, 0.27764],
    "93": [0.24982, 0.74947, 0, 0, 0.27764],
    "94": [0, 0.69141, 0, 0, 0.49965],
    "97": [0, 0.47534, 0, 0, 0.50046],
    "98": [0, 0.69141, 0, 0, 0.51315],
    "99": [0, 0.47534, 0, 0, 0.38946],
    "100": [0, 0.62119, 0, 0, 0.49857],
    "101": [0, 0.47534, 0, 0, 0.40053],
    "102": [0.18906, 0.69141, 0, 0, 0.32626],
    "103": [0.18906, 0.47534, 0, 0, 0.5037],
    "104": [0.18906, 0.69141, 0, 0, 0.52126],
    "105": [0, 0.69141, 0, 0, 0.27899],
    "106": [0, 0.69141, 0, 0, 0.28088],
    "107": [0, 0.69141, 0, 0, 0.38946],
    "108": [0, 0.69141, 0, 0, 0.27953],
    "109": [0, 0.47534, 0, 0, 0.76676],
    "110": [0, 0.47534, 0, 0, 0.52666],
    "111": [0, 0.47534, 0, 0, 0.48885],
    "112": [0.18906, 0.52396, 0, 0, 0.50046],
    "113": [0.18906, 0.47534, 0, 0, 0.48912],
    "114": [0, 0.47534, 0, 0, 0.38919],
    "115": [0, 0.47534, 0, 0, 0.44266],
    "116": [0, 0.62119, 0, 0, 0.33301],
    "117": [0, 0.47534, 0, 0, 0.5172],
    "118": [0, 0.52396, 0, 0, 0.5118],
    "119": [0, 0.52396, 0, 0, 0.77351],
    "120": [0.18906, 0.47534, 0, 0, 0.38865],
    "121": [0.18906, 0.47534, 0, 0, 0.49884],
    "122": [0.18906, 0.47534, 0, 0, 0.39054],
    "160": [0, 0, 0, 0, 0.25],
    "8216": [0, 0.69141, 0, 0, 0.21471],
    "8217": [0, 0.69141, 0, 0, 0.21471],
    "58112": [0, 0.62119, 0, 0, 0.49749],
    "58113": [0, 0.62119, 0, 0, 0.4983],
    "58114": [0.18906, 0.69141, 0, 0, 0.33328],
    "58115": [0.18906, 0.69141, 0, 0, 0.32923],
    "58116": [0.18906, 0.47534, 0, 0, 0.50343],
    "58117": [0, 0.69141, 0, 0, 0.33301],
    "58118": [0, 0.62119, 0, 0, 0.33409],
    "58119": [0, 0.47534, 0, 0, 0.50073]
  },
  "Main-Bold": {
    "32": [0, 0, 0, 0, 0.25],
    "33": [0, 0.69444, 0, 0, 0.35],
    "34": [0, 0.69444, 0, 0, 0.60278],
    "35": [0.19444, 0.69444, 0, 0, 0.95833],
    "36": [0.05556, 0.75, 0, 0, 0.575],
    "37": [0.05556, 0.75, 0, 0, 0.95833],
    "38": [0, 0.69444, 0, 0, 0.89444],
    "39": [0, 0.69444, 0, 0, 0.31944],
    "40": [0.25, 0.75, 0, 0, 0.44722],
    "41": [0.25, 0.75, 0, 0, 0.44722],
    "42": [0, 0.75, 0, 0, 0.575],
    "43": [0.13333, 0.63333, 0, 0, 0.89444],
    "44": [0.19444, 0.15556, 0, 0, 0.31944],
    "45": [0, 0.44444, 0, 0, 0.38333],
    "46": [0, 0.15556, 0, 0, 0.31944],
    "47": [0.25, 0.75, 0, 0, 0.575],
    "48": [0, 0.64444, 0, 0, 0.575],
    "49": [0, 0.64444, 0, 0, 0.575],
    "50": [0, 0.64444, 0, 0, 0.575],
    "51": [0, 0.64444, 0, 0, 0.575],
    "52": [0, 0.64444, 0, 0, 0.575],
    "53": [0, 0.64444, 0, 0, 0.575],
    "54": [0, 0.64444, 0, 0, 0.575],
    "55": [0, 0.64444, 0, 0, 0.575],
    "56": [0, 0.64444, 0, 0, 0.575],
    "57": [0, 0.64444, 0, 0, 0.575],
    "58": [0, 0.44444, 0, 0, 0.31944],
    "59": [0.19444, 0.44444, 0, 0, 0.31944],
    "60": [0.08556, 0.58556, 0, 0, 0.89444],
    "61": [-0.10889, 0.39111, 0, 0, 0.89444],
    "62": [0.08556, 0.58556, 0, 0, 0.89444],
    "63": [0, 0.69444, 0, 0, 0.54305],
    "64": [0, 0.69444, 0, 0, 0.89444],
    "65": [0, 0.68611, 0, 0, 0.86944],
    "66": [0, 0.68611, 0, 0, 0.81805],
    "67": [0, 0.68611, 0, 0, 0.83055],
    "68": [0, 0.68611, 0, 0, 0.88194],
    "69": [0, 0.68611, 0, 0, 0.75555],
    "70": [0, 0.68611, 0, 0, 0.72361],
    "71": [0, 0.68611, 0, 0, 0.90416],
    "72": [0, 0.68611, 0, 0, 0.9],
    "73": [0, 0.68611, 0, 0, 0.43611],
    "74": [0, 0.68611, 0, 0, 0.59444],
    "75": [0, 0.68611, 0, 0, 0.90138],
    "76": [0, 0.68611, 0, 0, 0.69166],
    "77": [0, 0.68611, 0, 0, 1.09166],
    "78": [0, 0.68611, 0, 0, 0.9],
    "79": [0, 0.68611, 0, 0, 0.86388],
    "80": [0, 0.68611, 0, 0, 0.78611],
    "81": [0.19444, 0.68611, 0, 0, 0.86388],
    "82": [0, 0.68611, 0, 0, 0.8625],
    "83": [0, 0.68611, 0, 0, 0.63889],
    "84": [0, 0.68611, 0, 0, 0.8],
    "85": [0, 0.68611, 0, 0, 0.88472],
    "86": [0, 0.68611, 0.01597, 0, 0.86944],
    "87": [0, 0.68611, 0.01597, 0, 1.18888],
    "88": [0, 0.68611, 0, 0, 0.86944],
    "89": [0, 0.68611, 0.02875, 0, 0.86944],
    "90": [0, 0.68611, 0, 0, 0.70277],
    "91": [0.25, 0.75, 0, 0, 0.31944],
    "92": [0.25, 0.75, 0, 0, 0.575],
    "93": [0.25, 0.75, 0, 0, 0.31944],
    "94": [0, 0.69444, 0, 0, 0.575],
    "95": [0.31, 0.13444, 0.03194, 0, 0.575],
    "97": [0, 0.44444, 0, 0, 0.55902],
    "98": [0, 0.69444, 0, 0, 0.63889],
    "99": [0, 0.44444, 0, 0, 0.51111],
    "100": [0, 0.69444, 0, 0, 0.63889],
    "101": [0, 0.44444, 0, 0, 0.52708],
    "102": [0, 0.69444, 0.10903, 0, 0.35139],
    "103": [0.19444, 0.44444, 0.01597, 0, 0.575],
    "104": [0, 0.69444, 0, 0, 0.63889],
    "105": [0, 0.69444, 0, 0, 0.31944],
    "106": [0.19444, 0.69444, 0, 0, 0.35139],
    "107": [0, 0.69444, 0, 0, 0.60694],
    "108": [0, 0.69444, 0, 0, 0.31944],
    "109": [0, 0.44444, 0, 0, 0.95833],
    "110": [0, 0.44444, 0, 0, 0.63889],
    "111": [0, 0.44444, 0, 0, 0.575],
    "112": [0.19444, 0.44444, 0, 0, 0.63889],
    "113": [0.19444, 0.44444, 0, 0, 0.60694],
    "114": [0, 0.44444, 0, 0, 0.47361],
    "115": [0, 0.44444, 0, 0, 0.45361],
    "116": [0, 0.63492, 0, 0, 0.44722],
    "117": [0, 0.44444, 0, 0, 0.63889],
    "118": [0, 0.44444, 0.01597, 0, 0.60694],
    "119": [0, 0.44444, 0.01597, 0, 0.83055],
    "120": [0, 0.44444, 0, 0, 0.60694],
    "121": [0.19444, 0.44444, 0.01597, 0, 0.60694],
    "122": [0, 0.44444, 0, 0, 0.51111],
    "123": [0.25, 0.75, 0, 0, 0.575],
    "124": [0.25, 0.75, 0, 0, 0.31944],
    "125": [0.25, 0.75, 0, 0, 0.575],
    "126": [0.35, 0.34444, 0, 0, 0.575],
    "160": [0, 0, 0, 0, 0.25],
    "163": [0, 0.69444, 0, 0, 0.86853],
    "168": [0, 0.69444, 0, 0, 0.575],
    "172": [0, 0.44444, 0, 0, 0.76666],
    "176": [0, 0.69444, 0, 0, 0.86944],
    "177": [0.13333, 0.63333, 0, 0, 0.89444],
    "184": [0.17014, 0, 0, 0, 0.51111],
    "198": [0, 0.68611, 0, 0, 1.04166],
    "215": [0.13333, 0.63333, 0, 0, 0.89444],
    "216": [0.04861, 0.73472, 0, 0, 0.89444],
    "223": [0, 0.69444, 0, 0, 0.59722],
    "230": [0, 0.44444, 0, 0, 0.83055],
    "247": [0.13333, 0.63333, 0, 0, 0.89444],
    "248": [0.09722, 0.54167, 0, 0, 0.575],
    "305": [0, 0.44444, 0, 0, 0.31944],
    "338": [0, 0.68611, 0, 0, 1.16944],
    "339": [0, 0.44444, 0, 0, 0.89444],
    "567": [0.19444, 0.44444, 0, 0, 0.35139],
    "710": [0, 0.69444, 0, 0, 0.575],
    "711": [0, 0.63194, 0, 0, 0.575],
    "713": [0, 0.59611, 0, 0, 0.575],
    "714": [0, 0.69444, 0, 0, 0.575],
    "715": [0, 0.69444, 0, 0, 0.575],
    "728": [0, 0.69444, 0, 0, 0.575],
    "729": [0, 0.69444, 0, 0, 0.31944],
    "730": [0, 0.69444, 0, 0, 0.86944],
    "732": [0, 0.69444, 0, 0, 0.575],
    "733": [0, 0.69444, 0, 0, 0.575],
    "915": [0, 0.68611, 0, 0, 0.69166],
    "916": [0, 0.68611, 0, 0, 0.95833],
    "920": [0, 0.68611, 0, 0, 0.89444],
    "923": [0, 0.68611, 0, 0, 0.80555],
    "926": [0, 0.68611, 0, 0, 0.76666],
    "928": [0, 0.68611, 0, 0, 0.9],
    "931": [0, 0.68611, 0, 0, 0.83055],
    "933": [0, 0.68611, 0, 0, 0.89444],
    "934": [0, 0.68611, 0, 0, 0.83055],
    "936": [0, 0.68611, 0, 0, 0.89444],
    "937": [0, 0.68611, 0, 0, 0.83055],
    "8211": [0, 0.44444, 0.03194, 0, 0.575],
    "8212": [0, 0.44444, 0.03194, 0, 1.14999],
    "8216": [0, 0.69444, 0, 0, 0.31944],
    "8217": [0, 0.69444, 0, 0, 0.31944],
    "8220": [0, 0.69444, 0, 0, 0.60278],
    "8221": [0, 0.69444, 0, 0, 0.60278],
    "8224": [0.19444, 0.69444, 0, 0, 0.51111],
    "8225": [0.19444, 0.69444, 0, 0, 0.51111],
    "8242": [0, 0.55556, 0, 0, 0.34444],
    "8407": [0, 0.72444, 0.15486, 0, 0.575],
    "8463": [0, 0.69444, 0, 0, 0.66759],
    "8465": [0, 0.69444, 0, 0, 0.83055],
    "8467": [0, 0.69444, 0, 0, 0.47361],
    "8472": [0.19444, 0.44444, 0, 0, 0.74027],
    "8476": [0, 0.69444, 0, 0, 0.83055],
    "8501": [0, 0.69444, 0, 0, 0.70277],
    "8592": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8593": [0.19444, 0.69444, 0, 0, 0.575],
    "8594": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8595": [0.19444, 0.69444, 0, 0, 0.575],
    "8596": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8597": [0.25, 0.75, 0, 0, 0.575],
    "8598": [0.19444, 0.69444, 0, 0, 1.14999],
    "8599": [0.19444, 0.69444, 0, 0, 1.14999],
    "8600": [0.19444, 0.69444, 0, 0, 1.14999],
    "8601": [0.19444, 0.69444, 0, 0, 1.14999],
    "8636": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8637": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8640": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8641": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8656": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8657": [0.19444, 0.69444, 0, 0, 0.70277],
    "8658": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8659": [0.19444, 0.69444, 0, 0, 0.70277],
    "8660": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8661": [0.25, 0.75, 0, 0, 0.70277],
    "8704": [0, 0.69444, 0, 0, 0.63889],
    "8706": [0, 0.69444, 0.06389, 0, 0.62847],
    "8707": [0, 0.69444, 0, 0, 0.63889],
    "8709": [0.05556, 0.75, 0, 0, 0.575],
    "8711": [0, 0.68611, 0, 0, 0.95833],
    "8712": [0.08556, 0.58556, 0, 0, 0.76666],
    "8715": [0.08556, 0.58556, 0, 0, 0.76666],
    "8722": [0.13333, 0.63333, 0, 0, 0.89444],
    "8723": [0.13333, 0.63333, 0, 0, 0.89444],
    "8725": [0.25, 0.75, 0, 0, 0.575],
    "8726": [0.25, 0.75, 0, 0, 0.575],
    "8727": [-0.02778, 0.47222, 0, 0, 0.575],
    "8728": [-0.02639, 0.47361, 0, 0, 0.575],
    "8729": [-0.02639, 0.47361, 0, 0, 0.575],
    "8730": [0.18, 0.82, 0, 0, 0.95833],
    "8733": [0, 0.44444, 0, 0, 0.89444],
    "8734": [0, 0.44444, 0, 0, 1.14999],
    "8736": [0, 0.69224, 0, 0, 0.72222],
    "8739": [0.25, 0.75, 0, 0, 0.31944],
    "8741": [0.25, 0.75, 0, 0, 0.575],
    "8743": [0, 0.55556, 0, 0, 0.76666],
    "8744": [0, 0.55556, 0, 0, 0.76666],
    "8745": [0, 0.55556, 0, 0, 0.76666],
    "8746": [0, 0.55556, 0, 0, 0.76666],
    "8747": [0.19444, 0.69444, 0.12778, 0, 0.56875],
    "8764": [-0.10889, 0.39111, 0, 0, 0.89444],
    "8768": [0.19444, 0.69444, 0, 0, 0.31944],
    "8771": [222e-5, 0.50222, 0, 0, 0.89444],
    "8773": [0.027, 0.638, 0, 0, 0.894],
    "8776": [0.02444, 0.52444, 0, 0, 0.89444],
    "8781": [222e-5, 0.50222, 0, 0, 0.89444],
    "8801": [222e-5, 0.50222, 0, 0, 0.89444],
    "8804": [0.19667, 0.69667, 0, 0, 0.89444],
    "8805": [0.19667, 0.69667, 0, 0, 0.89444],
    "8810": [0.08556, 0.58556, 0, 0, 1.14999],
    "8811": [0.08556, 0.58556, 0, 0, 1.14999],
    "8826": [0.08556, 0.58556, 0, 0, 0.89444],
    "8827": [0.08556, 0.58556, 0, 0, 0.89444],
    "8834": [0.08556, 0.58556, 0, 0, 0.89444],
    "8835": [0.08556, 0.58556, 0, 0, 0.89444],
    "8838": [0.19667, 0.69667, 0, 0, 0.89444],
    "8839": [0.19667, 0.69667, 0, 0, 0.89444],
    "8846": [0, 0.55556, 0, 0, 0.76666],
    "8849": [0.19667, 0.69667, 0, 0, 0.89444],
    "8850": [0.19667, 0.69667, 0, 0, 0.89444],
    "8851": [0, 0.55556, 0, 0, 0.76666],
    "8852": [0, 0.55556, 0, 0, 0.76666],
    "8853": [0.13333, 0.63333, 0, 0, 0.89444],
    "8854": [0.13333, 0.63333, 0, 0, 0.89444],
    "8855": [0.13333, 0.63333, 0, 0, 0.89444],
    "8856": [0.13333, 0.63333, 0, 0, 0.89444],
    "8857": [0.13333, 0.63333, 0, 0, 0.89444],
    "8866": [0, 0.69444, 0, 0, 0.70277],
    "8867": [0, 0.69444, 0, 0, 0.70277],
    "8868": [0, 0.69444, 0, 0, 0.89444],
    "8869": [0, 0.69444, 0, 0, 0.89444],
    "8900": [-0.02639, 0.47361, 0, 0, 0.575],
    "8901": [-0.02639, 0.47361, 0, 0, 0.31944],
    "8902": [-0.02778, 0.47222, 0, 0, 0.575],
    "8968": [0.25, 0.75, 0, 0, 0.51111],
    "8969": [0.25, 0.75, 0, 0, 0.51111],
    "8970": [0.25, 0.75, 0, 0, 0.51111],
    "8971": [0.25, 0.75, 0, 0, 0.51111],
    "8994": [-0.13889, 0.36111, 0, 0, 1.14999],
    "8995": [-0.13889, 0.36111, 0, 0, 1.14999],
    "9651": [0.19444, 0.69444, 0, 0, 1.02222],
    "9657": [-0.02778, 0.47222, 0, 0, 0.575],
    "9661": [0.19444, 0.69444, 0, 0, 1.02222],
    "9667": [-0.02778, 0.47222, 0, 0, 0.575],
    "9711": [0.19444, 0.69444, 0, 0, 1.14999],
    "9824": [0.12963, 0.69444, 0, 0, 0.89444],
    "9825": [0.12963, 0.69444, 0, 0, 0.89444],
    "9826": [0.12963, 0.69444, 0, 0, 0.89444],
    "9827": [0.12963, 0.69444, 0, 0, 0.89444],
    "9837": [0, 0.75, 0, 0, 0.44722],
    "9838": [0.19444, 0.69444, 0, 0, 0.44722],
    "9839": [0.19444, 0.69444, 0, 0, 0.44722],
    "10216": [0.25, 0.75, 0, 0, 0.44722],
    "10217": [0.25, 0.75, 0, 0, 0.44722],
    "10815": [0, 0.68611, 0, 0, 0.9],
    "10927": [0.19667, 0.69667, 0, 0, 0.89444],
    "10928": [0.19667, 0.69667, 0, 0, 0.89444],
    "57376": [0.19444, 0.69444, 0, 0, 0]
  },
  "Main-BoldItalic": {
    "32": [0, 0, 0, 0, 0.25],
    "33": [0, 0.69444, 0.11417, 0, 0.38611],
    "34": [0, 0.69444, 0.07939, 0, 0.62055],
    "35": [0.19444, 0.69444, 0.06833, 0, 0.94444],
    "37": [0.05556, 0.75, 0.12861, 0, 0.94444],
    "38": [0, 0.69444, 0.08528, 0, 0.88555],
    "39": [0, 0.69444, 0.12945, 0, 0.35555],
    "40": [0.25, 0.75, 0.15806, 0, 0.47333],
    "41": [0.25, 0.75, 0.03306, 0, 0.47333],
    "42": [0, 0.75, 0.14333, 0, 0.59111],
    "43": [0.10333, 0.60333, 0.03306, 0, 0.88555],
    "44": [0.19444, 0.14722, 0, 0, 0.35555],
    "45": [0, 0.44444, 0.02611, 0, 0.41444],
    "46": [0, 0.14722, 0, 0, 0.35555],
    "47": [0.25, 0.75, 0.15806, 0, 0.59111],
    "48": [0, 0.64444, 0.13167, 0, 0.59111],
    "49": [0, 0.64444, 0.13167, 0, 0.59111],
    "50": [0, 0.64444, 0.13167, 0, 0.59111],
    "51": [0, 0.64444, 0.13167, 0, 0.59111],
    "52": [0.19444, 0.64444, 0.13167, 0, 0.59111],
    "53": [0, 0.64444, 0.13167, 0, 0.59111],
    "54": [0, 0.64444, 0.13167, 0, 0.59111],
    "55": [0.19444, 0.64444, 0.13167, 0, 0.59111],
    "56": [0, 0.64444, 0.13167, 0, 0.59111],
    "57": [0, 0.64444, 0.13167, 0, 0.59111],
    "58": [0, 0.44444, 0.06695, 0, 0.35555],
    "59": [0.19444, 0.44444, 0.06695, 0, 0.35555],
    "61": [-0.10889, 0.39111, 0.06833, 0, 0.88555],
    "63": [0, 0.69444, 0.11472, 0, 0.59111],
    "64": [0, 0.69444, 0.09208, 0, 0.88555],
    "65": [0, 0.68611, 0, 0, 0.86555],
    "66": [0, 0.68611, 0.0992, 0, 0.81666],
    "67": [0, 0.68611, 0.14208, 0, 0.82666],
    "68": [0, 0.68611, 0.09062, 0, 0.87555],
    "69": [0, 0.68611, 0.11431, 0, 0.75666],
    "70": [0, 0.68611, 0.12903, 0, 0.72722],
    "71": [0, 0.68611, 0.07347, 0, 0.89527],
    "72": [0, 0.68611, 0.17208, 0, 0.8961],
    "73": [0, 0.68611, 0.15681, 0, 0.47166],
    "74": [0, 0.68611, 0.145, 0, 0.61055],
    "75": [0, 0.68611, 0.14208, 0, 0.89499],
    "76": [0, 0.68611, 0, 0, 0.69777],
    "77": [0, 0.68611, 0.17208, 0, 1.07277],
    "78": [0, 0.68611, 0.17208, 0, 0.8961],
    "79": [0, 0.68611, 0.09062, 0, 0.85499],
    "80": [0, 0.68611, 0.0992, 0, 0.78721],
    "81": [0.19444, 0.68611, 0.09062, 0, 0.85499],
    "82": [0, 0.68611, 0.02559, 0, 0.85944],
    "83": [0, 0.68611, 0.11264, 0, 0.64999],
    "84": [0, 0.68611, 0.12903, 0, 0.7961],
    "85": [0, 0.68611, 0.17208, 0, 0.88083],
    "86": [0, 0.68611, 0.18625, 0, 0.86555],
    "87": [0, 0.68611, 0.18625, 0, 1.15999],
    "88": [0, 0.68611, 0.15681, 0, 0.86555],
    "89": [0, 0.68611, 0.19803, 0, 0.86555],
    "90": [0, 0.68611, 0.14208, 0, 0.70888],
    "91": [0.25, 0.75, 0.1875, 0, 0.35611],
    "93": [0.25, 0.75, 0.09972, 0, 0.35611],
    "94": [0, 0.69444, 0.06709, 0, 0.59111],
    "95": [0.31, 0.13444, 0.09811, 0, 0.59111],
    "97": [0, 0.44444, 0.09426, 0, 0.59111],
    "98": [0, 0.69444, 0.07861, 0, 0.53222],
    "99": [0, 0.44444, 0.05222, 0, 0.53222],
    "100": [0, 0.69444, 0.10861, 0, 0.59111],
    "101": [0, 0.44444, 0.085, 0, 0.53222],
    "102": [0.19444, 0.69444, 0.21778, 0, 0.4],
    "103": [0.19444, 0.44444, 0.105, 0, 0.53222],
    "104": [0, 0.69444, 0.09426, 0, 0.59111],
    "105": [0, 0.69326, 0.11387, 0, 0.35555],
    "106": [0.19444, 0.69326, 0.1672, 0, 0.35555],
    "107": [0, 0.69444, 0.11111, 0, 0.53222],
    "108": [0, 0.69444, 0.10861, 0, 0.29666],
    "109": [0, 0.44444, 0.09426, 0, 0.94444],
    "110": [0, 0.44444, 0.09426, 0, 0.64999],
    "111": [0, 0.44444, 0.07861, 0, 0.59111],
    "112": [0.19444, 0.44444, 0.07861, 0, 0.59111],
    "113": [0.19444, 0.44444, 0.105, 0, 0.53222],
    "114": [0, 0.44444, 0.11111, 0, 0.50167],
    "115": [0, 0.44444, 0.08167, 0, 0.48694],
    "116": [0, 0.63492, 0.09639, 0, 0.385],
    "117": [0, 0.44444, 0.09426, 0, 0.62055],
    "118": [0, 0.44444, 0.11111, 0, 0.53222],
    "119": [0, 0.44444, 0.11111, 0, 0.76777],
    "120": [0, 0.44444, 0.12583, 0, 0.56055],
    "121": [0.19444, 0.44444, 0.105, 0, 0.56166],
    "122": [0, 0.44444, 0.13889, 0, 0.49055],
    "126": [0.35, 0.34444, 0.11472, 0, 0.59111],
    "160": [0, 0, 0, 0, 0.25],
    "168": [0, 0.69444, 0.11473, 0, 0.59111],
    "176": [0, 0.69444, 0, 0, 0.94888],
    "184": [0.17014, 0, 0, 0, 0.53222],
    "198": [0, 0.68611, 0.11431, 0, 1.02277],
    "216": [0.04861, 0.73472, 0.09062, 0, 0.88555],
    "223": [0.19444, 0.69444, 0.09736, 0, 0.665],
    "230": [0, 0.44444, 0.085, 0, 0.82666],
    "248": [0.09722, 0.54167, 0.09458, 0, 0.59111],
    "305": [0, 0.44444, 0.09426, 0, 0.35555],
    "338": [0, 0.68611, 0.11431, 0, 1.14054],
    "339": [0, 0.44444, 0.085, 0, 0.82666],
    "567": [0.19444, 0.44444, 0.04611, 0, 0.385],
    "710": [0, 0.69444, 0.06709, 0, 0.59111],
    "711": [0, 0.63194, 0.08271, 0, 0.59111],
    "713": [0, 0.59444, 0.10444, 0, 0.59111],
    "714": [0, 0.69444, 0.08528, 0, 0.59111],
    "715": [0, 0.69444, 0, 0, 0.59111],
    "728": [0, 0.69444, 0.10333, 0, 0.59111],
    "729": [0, 0.69444, 0.12945, 0, 0.35555],
    "730": [0, 0.69444, 0, 0, 0.94888],
    "732": [0, 0.69444, 0.11472, 0, 0.59111],
    "733": [0, 0.69444, 0.11472, 0, 0.59111],
    "915": [0, 0.68611, 0.12903, 0, 0.69777],
    "916": [0, 0.68611, 0, 0, 0.94444],
    "920": [0, 0.68611, 0.09062, 0, 0.88555],
    "923": [0, 0.68611, 0, 0, 0.80666],
    "926": [0, 0.68611, 0.15092, 0, 0.76777],
    "928": [0, 0.68611, 0.17208, 0, 0.8961],
    "931": [0, 0.68611, 0.11431, 0, 0.82666],
    "933": [0, 0.68611, 0.10778, 0, 0.88555],
    "934": [0, 0.68611, 0.05632, 0, 0.82666],
    "936": [0, 0.68611, 0.10778, 0, 0.88555],
    "937": [0, 0.68611, 0.0992, 0, 0.82666],
    "8211": [0, 0.44444, 0.09811, 0, 0.59111],
    "8212": [0, 0.44444, 0.09811, 0, 1.18221],
    "8216": [0, 0.69444, 0.12945, 0, 0.35555],
    "8217": [0, 0.69444, 0.12945, 0, 0.35555],
    "8220": [0, 0.69444, 0.16772, 0, 0.62055],
    "8221": [0, 0.69444, 0.07939, 0, 0.62055]
  },
  "Main-Italic": {
    "32": [0, 0, 0, 0, 0.25],
    "33": [0, 0.69444, 0.12417, 0, 0.30667],
    "34": [0, 0.69444, 0.06961, 0, 0.51444],
    "35": [0.19444, 0.69444, 0.06616, 0, 0.81777],
    "37": [0.05556, 0.75, 0.13639, 0, 0.81777],
    "38": [0, 0.69444, 0.09694, 0, 0.76666],
    "39": [0, 0.69444, 0.12417, 0, 0.30667],
    "40": [0.25, 0.75, 0.16194, 0, 0.40889],
    "41": [0.25, 0.75, 0.03694, 0, 0.40889],
    "42": [0, 0.75, 0.14917, 0, 0.51111],
    "43": [0.05667, 0.56167, 0.03694, 0, 0.76666],
    "44": [0.19444, 0.10556, 0, 0, 0.30667],
    "45": [0, 0.43056, 0.02826, 0, 0.35778],
    "46": [0, 0.10556, 0, 0, 0.30667],
    "47": [0.25, 0.75, 0.16194, 0, 0.51111],
    "48": [0, 0.64444, 0.13556, 0, 0.51111],
    "49": [0, 0.64444, 0.13556, 0, 0.51111],
    "50": [0, 0.64444, 0.13556, 0, 0.51111],
    "51": [0, 0.64444, 0.13556, 0, 0.51111],
    "52": [0.19444, 0.64444, 0.13556, 0, 0.51111],
    "53": [0, 0.64444, 0.13556, 0, 0.51111],
    "54": [0, 0.64444, 0.13556, 0, 0.51111],
    "55": [0.19444, 0.64444, 0.13556, 0, 0.51111],
    "56": [0, 0.64444, 0.13556, 0, 0.51111],
    "57": [0, 0.64444, 0.13556, 0, 0.51111],
    "58": [0, 0.43056, 0.0582, 0, 0.30667],
    "59": [0.19444, 0.43056, 0.0582, 0, 0.30667],
    "61": [-0.13313, 0.36687, 0.06616, 0, 0.76666],
    "63": [0, 0.69444, 0.1225, 0, 0.51111],
    "64": [0, 0.69444, 0.09597, 0, 0.76666],
    "65": [0, 0.68333, 0, 0, 0.74333],
    "66": [0, 0.68333, 0.10257, 0, 0.70389],
    "67": [0, 0.68333, 0.14528, 0, 0.71555],
    "68": [0, 0.68333, 0.09403, 0, 0.755],
    "69": [0, 0.68333, 0.12028, 0, 0.67833],
    "70": [0, 0.68333, 0.13305, 0, 0.65277],
    "71": [0, 0.68333, 0.08722, 0, 0.77361],
    "72": [0, 0.68333, 0.16389, 0, 0.74333],
    "73": [0, 0.68333, 0.15806, 0, 0.38555],
    "74": [0, 0.68333, 0.14028, 0, 0.525],
    "75": [0, 0.68333, 0.14528, 0, 0.76888],
    "76": [0, 0.68333, 0, 0, 0.62722],
    "77": [0, 0.68333, 0.16389, 0, 0.89666],
    "78": [0, 0.68333, 0.16389, 0, 0.74333],
    "79": [0, 0.68333, 0.09403, 0, 0.76666],
    "80": [0, 0.68333, 0.10257, 0, 0.67833],
    "81": [0.19444, 0.68333, 0.09403, 0, 0.76666],
    "82": [0, 0.68333, 0.03868, 0, 0.72944],
    "83": [0, 0.68333, 0.11972, 0, 0.56222],
    "84": [0, 0.68333, 0.13305, 0, 0.71555],
    "85": [0, 0.68333, 0.16389, 0, 0.74333],
    "86": [0, 0.68333, 0.18361, 0, 0.74333],
    "87": [0, 0.68333, 0.18361, 0, 0.99888],
    "88": [0, 0.68333, 0.15806, 0, 0.74333],
    "89": [0, 0.68333, 0.19383, 0, 0.74333],
    "90": [0, 0.68333, 0.14528, 0, 0.61333],
    "91": [0.25, 0.75, 0.1875, 0, 0.30667],
    "93": [0.25, 0.75, 0.10528, 0, 0.30667],
    "94": [0, 0.69444, 0.06646, 0, 0.51111],
    "95": [0.31, 0.12056, 0.09208, 0, 0.51111],
    "97": [0, 0.43056, 0.07671, 0, 0.51111],
    "98": [0, 0.69444, 0.06312, 0, 0.46],
    "99": [0, 0.43056, 0.05653, 0, 0.46],
    "100": [0, 0.69444, 0.10333, 0, 0.51111],
    "101": [0, 0.43056, 0.07514, 0, 0.46],
    "102": [0.19444, 0.69444, 0.21194, 0, 0.30667],
    "103": [0.19444, 0.43056, 0.08847, 0, 0.46],
    "104": [0, 0.69444, 0.07671, 0, 0.51111],
    "105": [0, 0.65536, 0.1019, 0, 0.30667],
    "106": [0.19444, 0.65536, 0.14467, 0, 0.30667],
    "107": [0, 0.69444, 0.10764, 0, 0.46],
    "108": [0, 0.69444, 0.10333, 0, 0.25555],
    "109": [0, 0.43056, 0.07671, 0, 0.81777],
    "110": [0, 0.43056, 0.07671, 0, 0.56222],
    "111": [0, 0.43056, 0.06312, 0, 0.51111],
    "112": [0.19444, 0.43056, 0.06312, 0, 0.51111],
    "113": [0.19444, 0.43056, 0.08847, 0, 0.46],
    "114": [0, 0.43056, 0.10764, 0, 0.42166],
    "115": [0, 0.43056, 0.08208, 0, 0.40889],
    "116": [0, 0.61508, 0.09486, 0, 0.33222],
    "117": [0, 0.43056, 0.07671, 0, 0.53666],
    "118": [0, 0.43056, 0.10764, 0, 0.46],
    "119": [0, 0.43056, 0.10764, 0, 0.66444],
    "120": [0, 0.43056, 0.12042, 0, 0.46389],
    "121": [0.19444, 0.43056, 0.08847, 0, 0.48555],
    "122": [0, 0.43056, 0.12292, 0, 0.40889],
    "126": [0.35, 0.31786, 0.11585, 0, 0.51111],
    "160": [0, 0, 0, 0, 0.25],
    "168": [0, 0.66786, 0.10474, 0, 0.51111],
    "176": [0, 0.69444, 0, 0, 0.83129],
    "184": [0.17014, 0, 0, 0, 0.46],
    "198": [0, 0.68333, 0.12028, 0, 0.88277],
    "216": [0.04861, 0.73194, 0.09403, 0, 0.76666],
    "223": [0.19444, 0.69444, 0.10514, 0, 0.53666],
    "230": [0, 0.43056, 0.07514, 0, 0.71555],
    "248": [0.09722, 0.52778, 0.09194, 0, 0.51111],
    "338": [0, 0.68333, 0.12028, 0, 0.98499],
    "339": [0, 0.43056, 0.07514, 0, 0.71555],
    "710": [0, 0.69444, 0.06646, 0, 0.51111],
    "711": [0, 0.62847, 0.08295, 0, 0.51111],
    "713": [0, 0.56167, 0.10333, 0, 0.51111],
    "714": [0, 0.69444, 0.09694, 0, 0.51111],
    "715": [0, 0.69444, 0, 0, 0.51111],
    "728": [0, 0.69444, 0.10806, 0, 0.51111],
    "729": [0, 0.66786, 0.11752, 0, 0.30667],
    "730": [0, 0.69444, 0, 0, 0.83129],
    "732": [0, 0.66786, 0.11585, 0, 0.51111],
    "733": [0, 0.69444, 0.1225, 0, 0.51111],
    "915": [0, 0.68333, 0.13305, 0, 0.62722],
    "916": [0, 0.68333, 0, 0, 0.81777],
    "920": [0, 0.68333, 0.09403, 0, 0.76666],
    "923": [0, 0.68333, 0, 0, 0.69222],
    "926": [0, 0.68333, 0.15294, 0, 0.66444],
    "928": [0, 0.68333, 0.16389, 0, 0.74333],
    "931": [0, 0.68333, 0.12028, 0, 0.71555],
    "933": [0, 0.68333, 0.11111, 0, 0.76666],
    "934": [0, 0.68333, 0.05986, 0, 0.71555],
    "936": [0, 0.68333, 0.11111, 0, 0.76666],
    "937": [0, 0.68333, 0.10257, 0, 0.71555],
    "8211": [0, 0.43056, 0.09208, 0, 0.51111],
    "8212": [0, 0.43056, 0.09208, 0, 1.02222],
    "8216": [0, 0.69444, 0.12417, 0, 0.30667],
    "8217": [0, 0.69444, 0.12417, 0, 0.30667],
    "8220": [0, 0.69444, 0.1685, 0, 0.51444],
    "8221": [0, 0.69444, 0.06961, 0, 0.51444],
    "8463": [0, 0.68889, 0, 0, 0.54028]
  },
  "Main-Regular": {
    "32": [0, 0, 0, 0, 0.25],
    "33": [0, 0.69444, 0, 0, 0.27778],
    "34": [0, 0.69444, 0, 0, 0.5],
    "35": [0.19444, 0.69444, 0, 0, 0.83334],
    "36": [0.05556, 0.75, 0, 0, 0.5],
    "37": [0.05556, 0.75, 0, 0, 0.83334],
    "38": [0, 0.69444, 0, 0, 0.77778],
    "39": [0, 0.69444, 0, 0, 0.27778],
    "40": [0.25, 0.75, 0, 0, 0.38889],
    "41": [0.25, 0.75, 0, 0, 0.38889],
    "42": [0, 0.75, 0, 0, 0.5],
    "43": [0.08333, 0.58333, 0, 0, 0.77778],
    "44": [0.19444, 0.10556, 0, 0, 0.27778],
    "45": [0, 0.43056, 0, 0, 0.33333],
    "46": [0, 0.10556, 0, 0, 0.27778],
    "47": [0.25, 0.75, 0, 0, 0.5],
    "48": [0, 0.64444, 0, 0, 0.5],
    "49": [0, 0.64444, 0, 0, 0.5],
    "50": [0, 0.64444, 0, 0, 0.5],
    "51": [0, 0.64444, 0, 0, 0.5],
    "52": [0, 0.64444, 0, 0, 0.5],
    "53": [0, 0.64444, 0, 0, 0.5],
    "54": [0, 0.64444, 0, 0, 0.5],
    "55": [0, 0.64444, 0, 0, 0.5],
    "56": [0, 0.64444, 0, 0, 0.5],
    "57": [0, 0.64444, 0, 0, 0.5],
    "58": [0, 0.43056, 0, 0, 0.27778],
    "59": [0.19444, 0.43056, 0, 0, 0.27778],
    "60": [0.0391, 0.5391, 0, 0, 0.77778],
    "61": [-0.13313, 0.36687, 0, 0, 0.77778],
    "62": [0.0391, 0.5391, 0, 0, 0.77778],
    "63": [0, 0.69444, 0, 0, 0.47222],
    "64": [0, 0.69444, 0, 0, 0.77778],
    "65": [0, 0.68333, 0, 0, 0.75],
    "66": [0, 0.68333, 0, 0, 0.70834],
    "67": [0, 0.68333, 0, 0, 0.72222],
    "68": [0, 0.68333, 0, 0, 0.76389],
    "69": [0, 0.68333, 0, 0, 0.68056],
    "70": [0, 0.68333, 0, 0, 0.65278],
    "71": [0, 0.68333, 0, 0, 0.78472],
    "72": [0, 0.68333, 0, 0, 0.75],
    "73": [0, 0.68333, 0, 0, 0.36111],
    "74": [0, 0.68333, 0, 0, 0.51389],
    "75": [0, 0.68333, 0, 0, 0.77778],
    "76": [0, 0.68333, 0, 0, 0.625],
    "77": [0, 0.68333, 0, 0, 0.91667],
    "78": [0, 0.68333, 0, 0, 0.75],
    "79": [0, 0.68333, 0, 0, 0.77778],
    "80": [0, 0.68333, 0, 0, 0.68056],
    "81": [0.19444, 0.68333, 0, 0, 0.77778],
    "82": [0, 0.68333, 0, 0, 0.73611],
    "83": [0, 0.68333, 0, 0, 0.55556],
    "84": [0, 0.68333, 0, 0, 0.72222],
    "85": [0, 0.68333, 0, 0, 0.75],
    "86": [0, 0.68333, 0.01389, 0, 0.75],
    "87": [0, 0.68333, 0.01389, 0, 1.02778],
    "88": [0, 0.68333, 0, 0, 0.75],
    "89": [0, 0.68333, 0.025, 0, 0.75],
    "90": [0, 0.68333, 0, 0, 0.61111],
    "91": [0.25, 0.75, 0, 0, 0.27778],
    "92": [0.25, 0.75, 0, 0, 0.5],
    "93": [0.25, 0.75, 0, 0, 0.27778],
    "94": [0, 0.69444, 0, 0, 0.5],
    "95": [0.31, 0.12056, 0.02778, 0, 0.5],
    "97": [0, 0.43056, 0, 0, 0.5],
    "98": [0, 0.69444, 0, 0, 0.55556],
    "99": [0, 0.43056, 0, 0, 0.44445],
    "100": [0, 0.69444, 0, 0, 0.55556],
    "101": [0, 0.43056, 0, 0, 0.44445],
    "102": [0, 0.69444, 0.07778, 0, 0.30556],
    "103": [0.19444, 0.43056, 0.01389, 0, 0.5],
    "104": [0, 0.69444, 0, 0, 0.55556],
    "105": [0, 0.66786, 0, 0, 0.27778],
    "106": [0.19444, 0.66786, 0, 0, 0.30556],
    "107": [0, 0.69444, 0, 0, 0.52778],
    "108": [0, 0.69444, 0, 0, 0.27778],
    "109": [0, 0.43056, 0, 0, 0.83334],
    "110": [0, 0.43056, 0, 0, 0.55556],
    "111": [0, 0.43056, 0, 0, 0.5],
    "112": [0.19444, 0.43056, 0, 0, 0.55556],
    "113": [0.19444, 0.43056, 0, 0, 0.52778],
    "114": [0, 0.43056, 0, 0, 0.39167],
    "115": [0, 0.43056, 0, 0, 0.39445],
    "116": [0, 0.61508, 0, 0, 0.38889],
    "117": [0, 0.43056, 0, 0, 0.55556],
    "118": [0, 0.43056, 0.01389, 0, 0.52778],
    "119": [0, 0.43056, 0.01389, 0, 0.72222],
    "120": [0, 0.43056, 0, 0, 0.52778],
    "121": [0.19444, 0.43056, 0.01389, 0, 0.52778],
    "122": [0, 0.43056, 0, 0, 0.44445],
    "123": [0.25, 0.75, 0, 0, 0.5],
    "124": [0.25, 0.75, 0, 0, 0.27778],
    "125": [0.25, 0.75, 0, 0, 0.5],
    "126": [0.35, 0.31786, 0, 0, 0.5],
    "160": [0, 0, 0, 0, 0.25],
    "163": [0, 0.69444, 0, 0, 0.76909],
    "167": [0.19444, 0.69444, 0, 0, 0.44445],
    "168": [0, 0.66786, 0, 0, 0.5],
    "172": [0, 0.43056, 0, 0, 0.66667],
    "176": [0, 0.69444, 0, 0, 0.75],
    "177": [0.08333, 0.58333, 0, 0, 0.77778],
    "182": [0.19444, 0.69444, 0, 0, 0.61111],
    "184": [0.17014, 0, 0, 0, 0.44445],
    "198": [0, 0.68333, 0, 0, 0.90278],
    "215": [0.08333, 0.58333, 0, 0, 0.77778],
    "216": [0.04861, 0.73194, 0, 0, 0.77778],
    "223": [0, 0.69444, 0, 0, 0.5],
    "230": [0, 0.43056, 0, 0, 0.72222],
    "247": [0.08333, 0.58333, 0, 0, 0.77778],
    "248": [0.09722, 0.52778, 0, 0, 0.5],
    "305": [0, 0.43056, 0, 0, 0.27778],
    "338": [0, 0.68333, 0, 0, 1.01389],
    "339": [0, 0.43056, 0, 0, 0.77778],
    "567": [0.19444, 0.43056, 0, 0, 0.30556],
    "710": [0, 0.69444, 0, 0, 0.5],
    "711": [0, 0.62847, 0, 0, 0.5],
    "713": [0, 0.56778, 0, 0, 0.5],
    "714": [0, 0.69444, 0, 0, 0.5],
    "715": [0, 0.69444, 0, 0, 0.5],
    "728": [0, 0.69444, 0, 0, 0.5],
    "729": [0, 0.66786, 0, 0, 0.27778],
    "730": [0, 0.69444, 0, 0, 0.75],
    "732": [0, 0.66786, 0, 0, 0.5],
    "733": [0, 0.69444, 0, 0, 0.5],
    "915": [0, 0.68333, 0, 0, 0.625],
    "916": [0, 0.68333, 0, 0, 0.83334],
    "920": [0, 0.68333, 0, 0, 0.77778],
    "923": [0, 0.68333, 0, 0, 0.69445],
    "926": [0, 0.68333, 0, 0, 0.66667],
    "928": [0, 0.68333, 0, 0, 0.75],
    "931": [0, 0.68333, 0, 0, 0.72222],
    "933": [0, 0.68333, 0, 0, 0.77778],
    "934": [0, 0.68333, 0, 0, 0.72222],
    "936": [0, 0.68333, 0, 0, 0.77778],
    "937": [0, 0.68333, 0, 0, 0.72222],
    "8211": [0, 0.43056, 0.02778, 0, 0.5],
    "8212": [0, 0.43056, 0.02778, 0, 1],
    "8216": [0, 0.69444, 0, 0, 0.27778],
    "8217": [0, 0.69444, 0, 0, 0.27778],
    "8220": [0, 0.69444, 0, 0, 0.5],
    "8221": [0, 0.69444, 0, 0, 0.5],
    "8224": [0.19444, 0.69444, 0, 0, 0.44445],
    "8225": [0.19444, 0.69444, 0, 0, 0.44445],
    "8230": [0, 0.123, 0, 0, 1.172],
    "8242": [0, 0.55556, 0, 0, 0.275],
    "8407": [0, 0.71444, 0.15382, 0, 0.5],
    "8463": [0, 0.68889, 0, 0, 0.54028],
    "8465": [0, 0.69444, 0, 0, 0.72222],
    "8467": [0, 0.69444, 0, 0.11111, 0.41667],
    "8472": [0.19444, 0.43056, 0, 0.11111, 0.63646],
    "8476": [0, 0.69444, 0, 0, 0.72222],
    "8501": [0, 0.69444, 0, 0, 0.61111],
    "8592": [-0.13313, 0.36687, 0, 0, 1],
    "8593": [0.19444, 0.69444, 0, 0, 0.5],
    "8594": [-0.13313, 0.36687, 0, 0, 1],
    "8595": [0.19444, 0.69444, 0, 0, 0.5],
    "8596": [-0.13313, 0.36687, 0, 0, 1],
    "8597": [0.25, 0.75, 0, 0, 0.5],
    "8598": [0.19444, 0.69444, 0, 0, 1],
    "8599": [0.19444, 0.69444, 0, 0, 1],
    "8600": [0.19444, 0.69444, 0, 0, 1],
    "8601": [0.19444, 0.69444, 0, 0, 1],
    "8614": [0.011, 0.511, 0, 0, 1],
    "8617": [0.011, 0.511, 0, 0, 1.126],
    "8618": [0.011, 0.511, 0, 0, 1.126],
    "8636": [-0.13313, 0.36687, 0, 0, 1],
    "8637": [-0.13313, 0.36687, 0, 0, 1],
    "8640": [-0.13313, 0.36687, 0, 0, 1],
    "8641": [-0.13313, 0.36687, 0, 0, 1],
    "8652": [0.011, 0.671, 0, 0, 1],
    "8656": [-0.13313, 0.36687, 0, 0, 1],
    "8657": [0.19444, 0.69444, 0, 0, 0.61111],
    "8658": [-0.13313, 0.36687, 0, 0, 1],
    "8659": [0.19444, 0.69444, 0, 0, 0.61111],
    "8660": [-0.13313, 0.36687, 0, 0, 1],
    "8661": [0.25, 0.75, 0, 0, 0.61111],
    "8704": [0, 0.69444, 0, 0, 0.55556],
    "8706": [0, 0.69444, 0.05556, 0.08334, 0.5309],
    "8707": [0, 0.69444, 0, 0, 0.55556],
    "8709": [0.05556, 0.75, 0, 0, 0.5],
    "8711": [0, 0.68333, 0, 0, 0.83334],
    "8712": [0.0391, 0.5391, 0, 0, 0.66667],
    "8715": [0.0391, 0.5391, 0, 0, 0.66667],
    "8722": [0.08333, 0.58333, 0, 0, 0.77778],
    "8723": [0.08333, 0.58333, 0, 0, 0.77778],
    "8725": [0.25, 0.75, 0, 0, 0.5],
    "8726": [0.25, 0.75, 0, 0, 0.5],
    "8727": [-0.03472, 0.46528, 0, 0, 0.5],
    "8728": [-0.05555, 0.44445, 0, 0, 0.5],
    "8729": [-0.05555, 0.44445, 0, 0, 0.5],
    "8730": [0.2, 0.8, 0, 0, 0.83334],
    "8733": [0, 0.43056, 0, 0, 0.77778],
    "8734": [0, 0.43056, 0, 0, 1],
    "8736": [0, 0.69224, 0, 0, 0.72222],
    "8739": [0.25, 0.75, 0, 0, 0.27778],
    "8741": [0.25, 0.75, 0, 0, 0.5],
    "8743": [0, 0.55556, 0, 0, 0.66667],
    "8744": [0, 0.55556, 0, 0, 0.66667],
    "8745": [0, 0.55556, 0, 0, 0.66667],
    "8746": [0, 0.55556, 0, 0, 0.66667],
    "8747": [0.19444, 0.69444, 0.11111, 0, 0.41667],
    "8764": [-0.13313, 0.36687, 0, 0, 0.77778],
    "8768": [0.19444, 0.69444, 0, 0, 0.27778],
    "8771": [-0.03625, 0.46375, 0, 0, 0.77778],
    "8773": [-0.022, 0.589, 0, 0, 0.778],
    "8776": [-0.01688, 0.48312, 0, 0, 0.77778],
    "8781": [-0.03625, 0.46375, 0, 0, 0.77778],
    "8784": [-0.133, 0.673, 0, 0, 0.778],
    "8801": [-0.03625, 0.46375, 0, 0, 0.77778],
    "8804": [0.13597, 0.63597, 0, 0, 0.77778],
    "8805": [0.13597, 0.63597, 0, 0, 0.77778],
    "8810": [0.0391, 0.5391, 0, 0, 1],
    "8811": [0.0391, 0.5391, 0, 0, 1],
    "8826": [0.0391, 0.5391, 0, 0, 0.77778],
    "8827": [0.0391, 0.5391, 0, 0, 0.77778],
    "8834": [0.0391, 0.5391, 0, 0, 0.77778],
    "8835": [0.0391, 0.5391, 0, 0, 0.77778],
    "8838": [0.13597, 0.63597, 0, 0, 0.77778],
    "8839": [0.13597, 0.63597, 0, 0, 0.77778],
    "8846": [0, 0.55556, 0, 0, 0.66667],
    "8849": [0.13597, 0.63597, 0, 0, 0.77778],
    "8850": [0.13597, 0.63597, 0, 0, 0.77778],
    "8851": [0, 0.55556, 0, 0, 0.66667],
    "8852": [0, 0.55556, 0, 0, 0.66667],
    "8853": [0.08333, 0.58333, 0, 0, 0.77778],
    "8854": [0.08333, 0.58333, 0, 0, 0.77778],
    "8855": [0.08333, 0.58333, 0, 0, 0.77778],
    "8856": [0.08333, 0.58333, 0, 0, 0.77778],
    "8857": [0.08333, 0.58333, 0, 0, 0.77778],
    "8866": [0, 0.69444, 0, 0, 0.61111],
    "8867": [0, 0.69444, 0, 0, 0.61111],
    "8868": [0, 0.69444, 0, 0, 0.77778],
    "8869": [0, 0.69444, 0, 0, 0.77778],
    "8872": [0.249, 0.75, 0, 0, 0.867],
    "8900": [-0.05555, 0.44445, 0, 0, 0.5],
    "8901": [-0.05555, 0.44445, 0, 0, 0.27778],
    "8902": [-0.03472, 0.46528, 0, 0, 0.5],
    "8904": [5e-3, 0.505, 0, 0, 0.9],
    "8942": [0.03, 0.903, 0, 0, 0.278],
    "8943": [-0.19, 0.313, 0, 0, 1.172],
    "8945": [-0.1, 0.823, 0, 0, 1.282],
    "8968": [0.25, 0.75, 0, 0, 0.44445],
    "8969": [0.25, 0.75, 0, 0, 0.44445],
    "8970": [0.25, 0.75, 0, 0, 0.44445],
    "8971": [0.25, 0.75, 0, 0, 0.44445],
    "8994": [-0.14236, 0.35764, 0, 0, 1],
    "8995": [-0.14236, 0.35764, 0, 0, 1],
    "9136": [0.244, 0.744, 0, 0, 0.412],
    "9137": [0.244, 0.745, 0, 0, 0.412],
    "9651": [0.19444, 0.69444, 0, 0, 0.88889],
    "9657": [-0.03472, 0.46528, 0, 0, 0.5],
    "9661": [0.19444, 0.69444, 0, 0, 0.88889],
    "9667": [-0.03472, 0.46528, 0, 0, 0.5],
    "9711": [0.19444, 0.69444, 0, 0, 1],
    "9824": [0.12963, 0.69444, 0, 0, 0.77778],
    "9825": [0.12963, 0.69444, 0, 0, 0.77778],
    "9826": [0.12963, 0.69444, 0, 0, 0.77778],
    "9827": [0.12963, 0.69444, 0, 0, 0.77778],
    "9837": [0, 0.75, 0, 0, 0.38889],
    "9838": [0.19444, 0.69444, 0, 0, 0.38889],
    "9839": [0.19444, 0.69444, 0, 0, 0.38889],
    "10216": [0.25, 0.75, 0, 0, 0.38889],
    "10217": [0.25, 0.75, 0, 0, 0.38889],
    "10222": [0.244, 0.744, 0, 0, 0.412],
    "10223": [0.244, 0.745, 0, 0, 0.412],
    "10229": [0.011, 0.511, 0, 0, 1.609],
    "10230": [0.011, 0.511, 0, 0, 1.638],
    "10231": [0.011, 0.511, 0, 0, 1.859],
    "10232": [0.024, 0.525, 0, 0, 1.609],
    "10233": [0.024, 0.525, 0, 0, 1.638],
    "10234": [0.024, 0.525, 0, 0, 1.858],
    "10236": [0.011, 0.511, 0, 0, 1.638],
    "10815": [0, 0.68333, 0, 0, 0.75],
    "10927": [0.13597, 0.63597, 0, 0, 0.77778],
    "10928": [0.13597, 0.63597, 0, 0, 0.77778],
    "57376": [0.19444, 0.69444, 0, 0, 0]
  },
  "Math-BoldItalic": {
    "32": [0, 0, 0, 0, 0.25],
    "48": [0, 0.44444, 0, 0, 0.575],
    "49": [0, 0.44444, 0, 0, 0.575],
    "50": [0, 0.44444, 0, 0, 0.575],
    "51": [0.19444, 0.44444, 0, 0, 0.575],
    "52": [0.19444, 0.44444, 0, 0, 0.575],
    "53": [0.19444, 0.44444, 0, 0, 0.575],
    "54": [0, 0.64444, 0, 0, 0.575],
    "55": [0.19444, 0.44444, 0, 0, 0.575],
    "56": [0, 0.64444, 0, 0, 0.575],
    "57": [0.19444, 0.44444, 0, 0, 0.575],
    "65": [0, 0.68611, 0, 0, 0.86944],
    "66": [0, 0.68611, 0.04835, 0, 0.8664],
    "67": [0, 0.68611, 0.06979, 0, 0.81694],
    "68": [0, 0.68611, 0.03194, 0, 0.93812],
    "69": [0, 0.68611, 0.05451, 0, 0.81007],
    "70": [0, 0.68611, 0.15972, 0, 0.68889],
    "71": [0, 0.68611, 0, 0, 0.88673],
    "72": [0, 0.68611, 0.08229, 0, 0.98229],
    "73": [0, 0.68611, 0.07778, 0, 0.51111],
    "74": [0, 0.68611, 0.10069, 0, 0.63125],
    "75": [0, 0.68611, 0.06979, 0, 0.97118],
    "76": [0, 0.68611, 0, 0, 0.75555],
    "77": [0, 0.68611, 0.11424, 0, 1.14201],
    "78": [0, 0.68611, 0.11424, 0, 0.95034],
    "79": [0, 0.68611, 0.03194, 0, 0.83666],
    "80": [0, 0.68611, 0.15972, 0, 0.72309],
    "81": [0.19444, 0.68611, 0, 0, 0.86861],
    "82": [0, 0.68611, 421e-5, 0, 0.87235],
    "83": [0, 0.68611, 0.05382, 0, 0.69271],
    "84": [0, 0.68611, 0.15972, 0, 0.63663],
    "85": [0, 0.68611, 0.11424, 0, 0.80027],
    "86": [0, 0.68611, 0.25555, 0, 0.67778],
    "87": [0, 0.68611, 0.15972, 0, 1.09305],
    "88": [0, 0.68611, 0.07778, 0, 0.94722],
    "89": [0, 0.68611, 0.25555, 0, 0.67458],
    "90": [0, 0.68611, 0.06979, 0, 0.77257],
    "97": [0, 0.44444, 0, 0, 0.63287],
    "98": [0, 0.69444, 0, 0, 0.52083],
    "99": [0, 0.44444, 0, 0, 0.51342],
    "100": [0, 0.69444, 0, 0, 0.60972],
    "101": [0, 0.44444, 0, 0, 0.55361],
    "102": [0.19444, 0.69444, 0.11042, 0, 0.56806],
    "103": [0.19444, 0.44444, 0.03704, 0, 0.5449],
    "104": [0, 0.69444, 0, 0, 0.66759],
    "105": [0, 0.69326, 0, 0, 0.4048],
    "106": [0.19444, 0.69326, 0.0622, 0, 0.47083],
    "107": [0, 0.69444, 0.01852, 0, 0.6037],
    "108": [0, 0.69444, 88e-4, 0, 0.34815],
    "109": [0, 0.44444, 0, 0, 1.0324],
    "110": [0, 0.44444, 0, 0, 0.71296],
    "111": [0, 0.44444, 0, 0, 0.58472],
    "112": [0.19444, 0.44444, 0, 0, 0.60092],
    "113": [0.19444, 0.44444, 0.03704, 0, 0.54213],
    "114": [0, 0.44444, 0.03194, 0, 0.5287],
    "115": [0, 0.44444, 0, 0, 0.53125],
    "116": [0, 0.63492, 0, 0, 0.41528],
    "117": [0, 0.44444, 0, 0, 0.68102],
    "118": [0, 0.44444, 0.03704, 0, 0.56666],
    "119": [0, 0.44444, 0.02778, 0, 0.83148],
    "120": [0, 0.44444, 0, 0, 0.65903],
    "121": [0.19444, 0.44444, 0.03704, 0, 0.59028],
    "122": [0, 0.44444, 0.04213, 0, 0.55509],
    "160": [0, 0, 0, 0, 0.25],
    "915": [0, 0.68611, 0.15972, 0, 0.65694],
    "916": [0, 0.68611, 0, 0, 0.95833],
    "920": [0, 0.68611, 0.03194, 0, 0.86722],
    "923": [0, 0.68611, 0, 0, 0.80555],
    "926": [0, 0.68611, 0.07458, 0, 0.84125],
    "928": [0, 0.68611, 0.08229, 0, 0.98229],
    "931": [0, 0.68611, 0.05451, 0, 0.88507],
    "933": [0, 0.68611, 0.15972, 0, 0.67083],
    "934": [0, 0.68611, 0, 0, 0.76666],
    "936": [0, 0.68611, 0.11653, 0, 0.71402],
    "937": [0, 0.68611, 0.04835, 0, 0.8789],
    "945": [0, 0.44444, 0, 0, 0.76064],
    "946": [0.19444, 0.69444, 0.03403, 0, 0.65972],
    "947": [0.19444, 0.44444, 0.06389, 0, 0.59003],
    "948": [0, 0.69444, 0.03819, 0, 0.52222],
    "949": [0, 0.44444, 0, 0, 0.52882],
    "950": [0.19444, 0.69444, 0.06215, 0, 0.50833],
    "951": [0.19444, 0.44444, 0.03704, 0, 0.6],
    "952": [0, 0.69444, 0.03194, 0, 0.5618],
    "953": [0, 0.44444, 0, 0, 0.41204],
    "954": [0, 0.44444, 0, 0, 0.66759],
    "955": [0, 0.69444, 0, 0, 0.67083],
    "956": [0.19444, 0.44444, 0, 0, 0.70787],
    "957": [0, 0.44444, 0.06898, 0, 0.57685],
    "958": [0.19444, 0.69444, 0.03021, 0, 0.50833],
    "959": [0, 0.44444, 0, 0, 0.58472],
    "960": [0, 0.44444, 0.03704, 0, 0.68241],
    "961": [0.19444, 0.44444, 0, 0, 0.6118],
    "962": [0.09722, 0.44444, 0.07917, 0, 0.42361],
    "963": [0, 0.44444, 0.03704, 0, 0.68588],
    "964": [0, 0.44444, 0.13472, 0, 0.52083],
    "965": [0, 0.44444, 0.03704, 0, 0.63055],
    "966": [0.19444, 0.44444, 0, 0, 0.74722],
    "967": [0.19444, 0.44444, 0, 0, 0.71805],
    "968": [0.19444, 0.69444, 0.03704, 0, 0.75833],
    "969": [0, 0.44444, 0.03704, 0, 0.71782],
    "977": [0, 0.69444, 0, 0, 0.69155],
    "981": [0.19444, 0.69444, 0, 0, 0.7125],
    "982": [0, 0.44444, 0.03194, 0, 0.975],
    "1009": [0.19444, 0.44444, 0, 0, 0.6118],
    "1013": [0, 0.44444, 0, 0, 0.48333],
    "57649": [0, 0.44444, 0, 0, 0.39352],
    "57911": [0.19444, 0.44444, 0, 0, 0.43889]
  },
  "Math-Italic": {
    "32": [0, 0, 0, 0, 0.25],
    "48": [0, 0.43056, 0, 0, 0.5],
    "49": [0, 0.43056, 0, 0, 0.5],
    "50": [0, 0.43056, 0, 0, 0.5],
    "51": [0.19444, 0.43056, 0, 0, 0.5],
    "52": [0.19444, 0.43056, 0, 0, 0.5],
    "53": [0.19444, 0.43056, 0, 0, 0.5],
    "54": [0, 0.64444, 0, 0, 0.5],
    "55": [0.19444, 0.43056, 0, 0, 0.5],
    "56": [0, 0.64444, 0, 0, 0.5],
    "57": [0.19444, 0.43056, 0, 0, 0.5],
    "65": [0, 0.68333, 0, 0.13889, 0.75],
    "66": [0, 0.68333, 0.05017, 0.08334, 0.75851],
    "67": [0, 0.68333, 0.07153, 0.08334, 0.71472],
    "68": [0, 0.68333, 0.02778, 0.05556, 0.82792],
    "69": [0, 0.68333, 0.05764, 0.08334, 0.7382],
    "70": [0, 0.68333, 0.13889, 0.08334, 0.64306],
    "71": [0, 0.68333, 0, 0.08334, 0.78625],
    "72": [0, 0.68333, 0.08125, 0.05556, 0.83125],
    "73": [0, 0.68333, 0.07847, 0.11111, 0.43958],
    "74": [0, 0.68333, 0.09618, 0.16667, 0.55451],
    "75": [0, 0.68333, 0.07153, 0.05556, 0.84931],
    "76": [0, 0.68333, 0, 0.02778, 0.68056],
    "77": [0, 0.68333, 0.10903, 0.08334, 0.97014],
    "78": [0, 0.68333, 0.10903, 0.08334, 0.80347],
    "79": [0, 0.68333, 0.02778, 0.08334, 0.76278],
    "80": [0, 0.68333, 0.13889, 0.08334, 0.64201],
    "81": [0.19444, 0.68333, 0, 0.08334, 0.79056],
    "82": [0, 0.68333, 773e-5, 0.08334, 0.75929],
    "83": [0, 0.68333, 0.05764, 0.08334, 0.6132],
    "84": [0, 0.68333, 0.13889, 0.08334, 0.58438],
    "85": [0, 0.68333, 0.10903, 0.02778, 0.68278],
    "86": [0, 0.68333, 0.22222, 0, 0.58333],
    "87": [0, 0.68333, 0.13889, 0, 0.94445],
    "88": [0, 0.68333, 0.07847, 0.08334, 0.82847],
    "89": [0, 0.68333, 0.22222, 0, 0.58056],
    "90": [0, 0.68333, 0.07153, 0.08334, 0.68264],
    "97": [0, 0.43056, 0, 0, 0.52859],
    "98": [0, 0.69444, 0, 0, 0.42917],
    "99": [0, 0.43056, 0, 0.05556, 0.43276],
    "100": [0, 0.69444, 0, 0.16667, 0.52049],
    "101": [0, 0.43056, 0, 0.05556, 0.46563],
    "102": [0.19444, 0.69444, 0.10764, 0.16667, 0.48959],
    "103": [0.19444, 0.43056, 0.03588, 0.02778, 0.47697],
    "104": [0, 0.69444, 0, 0, 0.57616],
    "105": [0, 0.65952, 0, 0, 0.34451],
    "106": [0.19444, 0.65952, 0.05724, 0, 0.41181],
    "107": [0, 0.69444, 0.03148, 0, 0.5206],
    "108": [0, 0.69444, 0.01968, 0.08334, 0.29838],
    "109": [0, 0.43056, 0, 0, 0.87801],
    "110": [0, 0.43056, 0, 0, 0.60023],
    "111": [0, 0.43056, 0, 0.05556, 0.48472],
    "112": [0.19444, 0.43056, 0, 0.08334, 0.50313],
    "113": [0.19444, 0.43056, 0.03588, 0.08334, 0.44641],
    "114": [0, 0.43056, 0.02778, 0.05556, 0.45116],
    "115": [0, 0.43056, 0, 0.05556, 0.46875],
    "116": [0, 0.61508, 0, 0.08334, 0.36111],
    "117": [0, 0.43056, 0, 0.02778, 0.57246],
    "118": [0, 0.43056, 0.03588, 0.02778, 0.48472],
    "119": [0, 0.43056, 0.02691, 0.08334, 0.71592],
    "120": [0, 0.43056, 0, 0.02778, 0.57153],
    "121": [0.19444, 0.43056, 0.03588, 0.05556, 0.49028],
    "122": [0, 0.43056, 0.04398, 0.05556, 0.46505],
    "160": [0, 0, 0, 0, 0.25],
    "915": [0, 0.68333, 0.13889, 0.08334, 0.61528],
    "916": [0, 0.68333, 0, 0.16667, 0.83334],
    "920": [0, 0.68333, 0.02778, 0.08334, 0.76278],
    "923": [0, 0.68333, 0, 0.16667, 0.69445],
    "926": [0, 0.68333, 0.07569, 0.08334, 0.74236],
    "928": [0, 0.68333, 0.08125, 0.05556, 0.83125],
    "931": [0, 0.68333, 0.05764, 0.08334, 0.77986],
    "933": [0, 0.68333, 0.13889, 0.05556, 0.58333],
    "934": [0, 0.68333, 0, 0.08334, 0.66667],
    "936": [0, 0.68333, 0.11, 0.05556, 0.61222],
    "937": [0, 0.68333, 0.05017, 0.08334, 0.7724],
    "945": [0, 0.43056, 37e-4, 0.02778, 0.6397],
    "946": [0.19444, 0.69444, 0.05278, 0.08334, 0.56563],
    "947": [0.19444, 0.43056, 0.05556, 0, 0.51773],
    "948": [0, 0.69444, 0.03785, 0.05556, 0.44444],
    "949": [0, 0.43056, 0, 0.08334, 0.46632],
    "950": [0.19444, 0.69444, 0.07378, 0.08334, 0.4375],
    "951": [0.19444, 0.43056, 0.03588, 0.05556, 0.49653],
    "952": [0, 0.69444, 0.02778, 0.08334, 0.46944],
    "953": [0, 0.43056, 0, 0.05556, 0.35394],
    "954": [0, 0.43056, 0, 0, 0.57616],
    "955": [0, 0.69444, 0, 0, 0.58334],
    "956": [0.19444, 0.43056, 0, 0.02778, 0.60255],
    "957": [0, 0.43056, 0.06366, 0.02778, 0.49398],
    "958": [0.19444, 0.69444, 0.04601, 0.11111, 0.4375],
    "959": [0, 0.43056, 0, 0.05556, 0.48472],
    "960": [0, 0.43056, 0.03588, 0, 0.57003],
    "961": [0.19444, 0.43056, 0, 0.08334, 0.51702],
    "962": [0.09722, 0.43056, 0.07986, 0.08334, 0.36285],
    "963": [0, 0.43056, 0.03588, 0, 0.57141],
    "964": [0, 0.43056, 0.1132, 0.02778, 0.43715],
    "965": [0, 0.43056, 0.03588, 0.02778, 0.54028],
    "966": [0.19444, 0.43056, 0, 0.08334, 0.65417],
    "967": [0.19444, 0.43056, 0, 0.05556, 0.62569],
    "968": [0.19444, 0.69444, 0.03588, 0.11111, 0.65139],
    "969": [0, 0.43056, 0.03588, 0, 0.62245],
    "977": [0, 0.69444, 0, 0.08334, 0.59144],
    "981": [0.19444, 0.69444, 0, 0.08334, 0.59583],
    "982": [0, 0.43056, 0.02778, 0, 0.82813],
    "1009": [0.19444, 0.43056, 0, 0.08334, 0.51702],
    "1013": [0, 0.43056, 0, 0.05556, 0.4059],
    "57649": [0, 0.43056, 0, 0.02778, 0.32246],
    "57911": [0.19444, 0.43056, 0, 0.08334, 0.38403]
  },
  "SansSerif-Bold": {
    "32": [0, 0, 0, 0, 0.25],
    "33": [0, 0.69444, 0, 0, 0.36667],
    "34": [0, 0.69444, 0, 0, 0.55834],
    "35": [0.19444, 0.69444, 0, 0, 0.91667],
    "36": [0.05556, 0.75, 0, 0, 0.55],
    "37": [0.05556, 0.75, 0, 0, 1.02912],
    "38": [0, 0.69444, 0, 0, 0.83056],
    "39": [0, 0.69444, 0, 0, 0.30556],
    "40": [0.25, 0.75, 0, 0, 0.42778],
    "41": [0.25, 0.75, 0, 0, 0.42778],
    "42": [0, 0.75, 0, 0, 0.55],
    "43": [0.11667, 0.61667, 0, 0, 0.85556],
    "44": [0.10556, 0.13056, 0, 0, 0.30556],
    "45": [0, 0.45833, 0, 0, 0.36667],
    "46": [0, 0.13056, 0, 0, 0.30556],
    "47": [0.25, 0.75, 0, 0, 0.55],
    "48": [0, 0.69444, 0, 0, 0.55],
    "49": [0, 0.69444, 0, 0, 0.55],
    "50": [0, 0.69444, 0, 0, 0.55],
    "51": [0, 0.69444, 0, 0, 0.55],
    "52": [0, 0.69444, 0, 0, 0.55],
    "53": [0, 0.69444, 0, 0, 0.55],
    "54": [0, 0.69444, 0, 0, 0.55],
    "55": [0, 0.69444, 0, 0, 0.55],
    "56": [0, 0.69444, 0, 0, 0.55],
    "57": [0, 0.69444, 0, 0, 0.55],
    "58": [0, 0.45833, 0, 0, 0.30556],
    "59": [0.10556, 0.45833, 0, 0, 0.30556],
    "61": [-0.09375, 0.40625, 0, 0, 0.85556],
    "63": [0, 0.69444, 0, 0, 0.51945],
    "64": [0, 0.69444, 0, 0, 0.73334],
    "65": [0, 0.69444, 0, 0, 0.73334],
    "66": [0, 0.69444, 0, 0, 0.73334],
    "67": [0, 0.69444, 0, 0, 0.70278],
    "68": [0, 0.69444, 0, 0, 0.79445],
    "69": [0, 0.69444, 0, 0, 0.64167],
    "70": [0, 0.69444, 0, 0, 0.61111],
    "71": [0, 0.69444, 0, 0, 0.73334],
    "72": [0, 0.69444, 0, 0, 0.79445],
    "73": [0, 0.69444, 0, 0, 0.33056],
    "74": [0, 0.69444, 0, 0, 0.51945],
    "75": [0, 0.69444, 0, 0, 0.76389],
    "76": [0, 0.69444, 0, 0, 0.58056],
    "77": [0, 0.69444, 0, 0, 0.97778],
    "78": [0, 0.69444, 0, 0, 0.79445],
    "79": [0, 0.69444, 0, 0, 0.79445],
    "80": [0, 0.69444, 0, 0, 0.70278],
    "81": [0.10556, 0.69444, 0, 0, 0.79445],
    "82": [0, 0.69444, 0, 0, 0.70278],
    "83": [0, 0.69444, 0, 0, 0.61111],
    "84": [0, 0.69444, 0, 0, 0.73334],
    "85": [0, 0.69444, 0, 0, 0.76389],
    "86": [0, 0.69444, 0.01528, 0, 0.73334],
    "87": [0, 0.69444, 0.01528, 0, 1.03889],
    "88": [0, 0.69444, 0, 0, 0.73334],
    "89": [0, 0.69444, 0.0275, 0, 0.73334],
    "90": [0, 0.69444, 0, 0, 0.67223],
    "91": [0.25, 0.75, 0, 0, 0.34306],
    "93": [0.25, 0.75, 0, 0, 0.34306],
    "94": [0, 0.69444, 0, 0, 0.55],
    "95": [0.35, 0.10833, 0.03056, 0, 0.55],
    "97": [0, 0.45833, 0, 0, 0.525],
    "98": [0, 0.69444, 0, 0, 0.56111],
    "99": [0, 0.45833, 0, 0, 0.48889],
    "100": [0, 0.69444, 0, 0, 0.56111],
    "101": [0, 0.45833, 0, 0, 0.51111],
    "102": [0, 0.69444, 0.07639, 0, 0.33611],
    "103": [0.19444, 0.45833, 0.01528, 0, 0.55],
    "104": [0, 0.69444, 0, 0, 0.56111],
    "105": [0, 0.69444, 0, 0, 0.25556],
    "106": [0.19444, 0.69444, 0, 0, 0.28611],
    "107": [0, 0.69444, 0, 0, 0.53056],
    "108": [0, 0.69444, 0, 0, 0.25556],
    "109": [0, 0.45833, 0, 0, 0.86667],
    "110": [0, 0.45833, 0, 0, 0.56111],
    "111": [0, 0.45833, 0, 0, 0.55],
    "112": [0.19444, 0.45833, 0, 0, 0.56111],
    "113": [0.19444, 0.45833, 0, 0, 0.56111],
    "114": [0, 0.45833, 0.01528, 0, 0.37222],
    "115": [0, 0.45833, 0, 0, 0.42167],
    "116": [0, 0.58929, 0, 0, 0.40417],
    "117": [0, 0.45833, 0, 0, 0.56111],
    "118": [0, 0.45833, 0.01528, 0, 0.5],
    "119": [0, 0.45833, 0.01528, 0, 0.74445],
    "120": [0, 0.45833, 0, 0, 0.5],
    "121": [0.19444, 0.45833, 0.01528, 0, 0.5],
    "122": [0, 0.45833, 0, 0, 0.47639],
    "126": [0.35, 0.34444, 0, 0, 0.55],
    "160": [0, 0, 0, 0, 0.25],
    "168": [0, 0.69444, 0, 0, 0.55],
    "176": [0, 0.69444, 0, 0, 0.73334],
    "180": [0, 0.69444, 0, 0, 0.55],
    "184": [0.17014, 0, 0, 0, 0.48889],
    "305": [0, 0.45833, 0, 0, 0.25556],
    "567": [0.19444, 0.45833, 0, 0, 0.28611],
    "710": [0, 0.69444, 0, 0, 0.55],
    "711": [0, 0.63542, 0, 0, 0.55],
    "713": [0, 0.63778, 0, 0, 0.55],
    "728": [0, 0.69444, 0, 0, 0.55],
    "729": [0, 0.69444, 0, 0, 0.30556],
    "730": [0, 0.69444, 0, 0, 0.73334],
    "732": [0, 0.69444, 0, 0, 0.55],
    "733": [0, 0.69444, 0, 0, 0.55],
    "915": [0, 0.69444, 0, 0, 0.58056],
    "916": [0, 0.69444, 0, 0, 0.91667],
    "920": [0, 0.69444, 0, 0, 0.85556],
    "923": [0, 0.69444, 0, 0, 0.67223],
    "926": [0, 0.69444, 0, 0, 0.73334],
    "928": [0, 0.69444, 0, 0, 0.79445],
    "931": [0, 0.69444, 0, 0, 0.79445],
    "933": [0, 0.69444, 0, 0, 0.85556],
    "934": [0, 0.69444, 0, 0, 0.79445],
    "936": [0, 0.69444, 0, 0, 0.85556],
    "937": [0, 0.69444, 0, 0, 0.79445],
    "8211": [0, 0.45833, 0.03056, 0, 0.55],
    "8212": [0, 0.45833, 0.03056, 0, 1.10001],
    "8216": [0, 0.69444, 0, 0, 0.30556],
    "8217": [0, 0.69444, 0, 0, 0.30556],
    "8220": [0, 0.69444, 0, 0, 0.55834],
    "8221": [0, 0.69444, 0, 0, 0.55834]
  },
  "SansSerif-Italic": {
    "32": [0, 0, 0, 0, 0.25],
    "33": [0, 0.69444, 0.05733, 0, 0.31945],
    "34": [0, 0.69444, 316e-5, 0, 0.5],
    "35": [0.19444, 0.69444, 0.05087, 0, 0.83334],
    "36": [0.05556, 0.75, 0.11156, 0, 0.5],
    "37": [0.05556, 0.75, 0.03126, 0, 0.83334],
    "38": [0, 0.69444, 0.03058, 0, 0.75834],
    "39": [0, 0.69444, 0.07816, 0, 0.27778],
    "40": [0.25, 0.75, 0.13164, 0, 0.38889],
    "41": [0.25, 0.75, 0.02536, 0, 0.38889],
    "42": [0, 0.75, 0.11775, 0, 0.5],
    "43": [0.08333, 0.58333, 0.02536, 0, 0.77778],
    "44": [0.125, 0.08333, 0, 0, 0.27778],
    "45": [0, 0.44444, 0.01946, 0, 0.33333],
    "46": [0, 0.08333, 0, 0, 0.27778],
    "47": [0.25, 0.75, 0.13164, 0, 0.5],
    "48": [0, 0.65556, 0.11156, 0, 0.5],
    "49": [0, 0.65556, 0.11156, 0, 0.5],
    "50": [0, 0.65556, 0.11156, 0, 0.5],
    "51": [0, 0.65556, 0.11156, 0, 0.5],
    "52": [0, 0.65556, 0.11156, 0, 0.5],
    "53": [0, 0.65556, 0.11156, 0, 0.5],
    "54": [0, 0.65556, 0.11156, 0, 0.5],
    "55": [0, 0.65556, 0.11156, 0, 0.5],
    "56": [0, 0.65556, 0.11156, 0, 0.5],
    "57": [0, 0.65556, 0.11156, 0, 0.5],
    "58": [0, 0.44444, 0.02502, 0, 0.27778],
    "59": [0.125, 0.44444, 0.02502, 0, 0.27778],
    "61": [-0.13, 0.37, 0.05087, 0, 0.77778],
    "63": [0, 0.69444, 0.11809, 0, 0.47222],
    "64": [0, 0.69444, 0.07555, 0, 0.66667],
    "65": [0, 0.69444, 0, 0, 0.66667],
    "66": [0, 0.69444, 0.08293, 0, 0.66667],
    "67": [0, 0.69444, 0.11983, 0, 0.63889],
    "68": [0, 0.69444, 0.07555, 0, 0.72223],
    "69": [0, 0.69444, 0.11983, 0, 0.59722],
    "70": [0, 0.69444, 0.13372, 0, 0.56945],
    "71": [0, 0.69444, 0.11983, 0, 0.66667],
    "72": [0, 0.69444, 0.08094, 0, 0.70834],
    "73": [0, 0.69444, 0.13372, 0, 0.27778],
    "74": [0, 0.69444, 0.08094, 0, 0.47222],
    "75": [0, 0.69444, 0.11983, 0, 0.69445],
    "76": [0, 0.69444, 0, 0, 0.54167],
    "77": [0, 0.69444, 0.08094, 0, 0.875],
    "78": [0, 0.69444, 0.08094, 0, 0.70834],
    "79": [0, 0.69444, 0.07555, 0, 0.73611],
    "80": [0, 0.69444, 0.08293, 0, 0.63889],
    "81": [0.125, 0.69444, 0.07555, 0, 0.73611],
    "82": [0, 0.69444, 0.08293, 0, 0.64584],
    "83": [0, 0.69444, 0.09205, 0, 0.55556],
    "84": [0, 0.69444, 0.13372, 0, 0.68056],
    "85": [0, 0.69444, 0.08094, 0, 0.6875],
    "86": [0, 0.69444, 0.1615, 0, 0.66667],
    "87": [0, 0.69444, 0.1615, 0, 0.94445],
    "88": [0, 0.69444, 0.13372, 0, 0.66667],
    "89": [0, 0.69444, 0.17261, 0, 0.66667],
    "90": [0, 0.69444, 0.11983, 0, 0.61111],
    "91": [0.25, 0.75, 0.15942, 0, 0.28889],
    "93": [0.25, 0.75, 0.08719, 0, 0.28889],
    "94": [0, 0.69444, 0.0799, 0, 0.5],
    "95": [0.35, 0.09444, 0.08616, 0, 0.5],
    "97": [0, 0.44444, 981e-5, 0, 0.48056],
    "98": [0, 0.69444, 0.03057, 0, 0.51667],
    "99": [0, 0.44444, 0.08336, 0, 0.44445],
    "100": [0, 0.69444, 0.09483, 0, 0.51667],
    "101": [0, 0.44444, 0.06778, 0, 0.44445],
    "102": [0, 0.69444, 0.21705, 0, 0.30556],
    "103": [0.19444, 0.44444, 0.10836, 0, 0.5],
    "104": [0, 0.69444, 0.01778, 0, 0.51667],
    "105": [0, 0.67937, 0.09718, 0, 0.23889],
    "106": [0.19444, 0.67937, 0.09162, 0, 0.26667],
    "107": [0, 0.69444, 0.08336, 0, 0.48889],
    "108": [0, 0.69444, 0.09483, 0, 0.23889],
    "109": [0, 0.44444, 0.01778, 0, 0.79445],
    "110": [0, 0.44444, 0.01778, 0, 0.51667],
    "111": [0, 0.44444, 0.06613, 0, 0.5],
    "112": [0.19444, 0.44444, 0.0389, 0, 0.51667],
    "113": [0.19444, 0.44444, 0.04169, 0, 0.51667],
    "114": [0, 0.44444, 0.10836, 0, 0.34167],
    "115": [0, 0.44444, 0.0778, 0, 0.38333],
    "116": [0, 0.57143, 0.07225, 0, 0.36111],
    "117": [0, 0.44444, 0.04169, 0, 0.51667],
    "118": [0, 0.44444, 0.10836, 0, 0.46111],
    "119": [0, 0.44444, 0.10836, 0, 0.68334],
    "120": [0, 0.44444, 0.09169, 0, 0.46111],
    "121": [0.19444, 0.44444, 0.10836, 0, 0.46111],
    "122": [0, 0.44444, 0.08752, 0, 0.43472],
    "126": [0.35, 0.32659, 0.08826, 0, 0.5],
    "160": [0, 0, 0, 0, 0.25],
    "168": [0, 0.67937, 0.06385, 0, 0.5],
    "176": [0, 0.69444, 0, 0, 0.73752],
    "184": [0.17014, 0, 0, 0, 0.44445],
    "305": [0, 0.44444, 0.04169, 0, 0.23889],
    "567": [0.19444, 0.44444, 0.04169, 0, 0.26667],
    "710": [0, 0.69444, 0.0799, 0, 0.5],
    "711": [0, 0.63194, 0.08432, 0, 0.5],
    "713": [0, 0.60889, 0.08776, 0, 0.5],
    "714": [0, 0.69444, 0.09205, 0, 0.5],
    "715": [0, 0.69444, 0, 0, 0.5],
    "728": [0, 0.69444, 0.09483, 0, 0.5],
    "729": [0, 0.67937, 0.07774, 0, 0.27778],
    "730": [0, 0.69444, 0, 0, 0.73752],
    "732": [0, 0.67659, 0.08826, 0, 0.5],
    "733": [0, 0.69444, 0.09205, 0, 0.5],
    "915": [0, 0.69444, 0.13372, 0, 0.54167],
    "916": [0, 0.69444, 0, 0, 0.83334],
    "920": [0, 0.69444, 0.07555, 0, 0.77778],
    "923": [0, 0.69444, 0, 0, 0.61111],
    "926": [0, 0.69444, 0.12816, 0, 0.66667],
    "928": [0, 0.69444, 0.08094, 0, 0.70834],
    "931": [0, 0.69444, 0.11983, 0, 0.72222],
    "933": [0, 0.69444, 0.09031, 0, 0.77778],
    "934": [0, 0.69444, 0.04603, 0, 0.72222],
    "936": [0, 0.69444, 0.09031, 0, 0.77778],
    "937": [0, 0.69444, 0.08293, 0, 0.72222],
    "8211": [0, 0.44444, 0.08616, 0, 0.5],
    "8212": [0, 0.44444, 0.08616, 0, 1],
    "8216": [0, 0.69444, 0.07816, 0, 0.27778],
    "8217": [0, 0.69444, 0.07816, 0, 0.27778],
    "8220": [0, 0.69444, 0.14205, 0, 0.5],
    "8221": [0, 0.69444, 316e-5, 0, 0.5]
  },
  "SansSerif-Regular": {
    "32": [0, 0, 0, 0, 0.25],
    "33": [0, 0.69444, 0, 0, 0.31945],
    "34": [0, 0.69444, 0, 0, 0.5],
    "35": [0.19444, 0.69444, 0, 0, 0.83334],
    "36": [0.05556, 0.75, 0, 0, 0.5],
    "37": [0.05556, 0.75, 0, 0, 0.83334],
    "38": [0, 0.69444, 0, 0, 0.75834],
    "39": [0, 0.69444, 0, 0, 0.27778],
    "40": [0.25, 0.75, 0, 0, 0.38889],
    "41": [0.25, 0.75, 0, 0, 0.38889],
    "42": [0, 0.75, 0, 0, 0.5],
    "43": [0.08333, 0.58333, 0, 0, 0.77778],
    "44": [0.125, 0.08333, 0, 0, 0.27778],
    "45": [0, 0.44444, 0, 0, 0.33333],
    "46": [0, 0.08333, 0, 0, 0.27778],
    "47": [0.25, 0.75, 0, 0, 0.5],
    "48": [0, 0.65556, 0, 0, 0.5],
    "49": [0, 0.65556, 0, 0, 0.5],
    "50": [0, 0.65556, 0, 0, 0.5],
    "51": [0, 0.65556, 0, 0, 0.5],
    "52": [0, 0.65556, 0, 0, 0.5],
    "53": [0, 0.65556, 0, 0, 0.5],
    "54": [0, 0.65556, 0, 0, 0.5],
    "55": [0, 0.65556, 0, 0, 0.5],
    "56": [0, 0.65556, 0, 0, 0.5],
    "57": [0, 0.65556, 0, 0, 0.5],
    "58": [0, 0.44444, 0, 0, 0.27778],
    "59": [0.125, 0.44444, 0, 0, 0.27778],
    "61": [-0.13, 0.37, 0, 0, 0.77778],
    "63": [0, 0.69444, 0, 0, 0.47222],
    "64": [0, 0.69444, 0, 0, 0.66667],
    "65": [0, 0.69444, 0, 0, 0.66667],
    "66": [0, 0.69444, 0, 0, 0.66667],
    "67": [0, 0.69444, 0, 0, 0.63889],
    "68": [0, 0.69444, 0, 0, 0.72223],
    "69": [0, 0.69444, 0, 0, 0.59722],
    "70": [0, 0.69444, 0, 0, 0.56945],
    "71": [0, 0.69444, 0, 0, 0.66667],
    "72": [0, 0.69444, 0, 0, 0.70834],
    "73": [0, 0.69444, 0, 0, 0.27778],
    "74": [0, 0.69444, 0, 0, 0.47222],
    "75": [0, 0.69444, 0, 0, 0.69445],
    "76": [0, 0.69444, 0, 0, 0.54167],
    "77": [0, 0.69444, 0, 0, 0.875],
    "78": [0, 0.69444, 0, 0, 0.70834],
    "79": [0, 0.69444, 0, 0, 0.73611],
    "80": [0, 0.69444, 0, 0, 0.63889],
    "81": [0.125, 0.69444, 0, 0, 0.73611],
    "82": [0, 0.69444, 0, 0, 0.64584],
    "83": [0, 0.69444, 0, 0, 0.55556],
    "84": [0, 0.69444, 0, 0, 0.68056],
    "85": [0, 0.69444, 0, 0, 0.6875],
    "86": [0, 0.69444, 0.01389, 0, 0.66667],
    "87": [0, 0.69444, 0.01389, 0, 0.94445],
    "88": [0, 0.69444, 0, 0, 0.66667],
    "89": [0, 0.69444, 0.025, 0, 0.66667],
    "90": [0, 0.69444, 0, 0, 0.61111],
    "91": [0.25, 0.75, 0, 0, 0.28889],
    "93": [0.25, 0.75, 0, 0, 0.28889],
    "94": [0, 0.69444, 0, 0, 0.5],
    "95": [0.35, 0.09444, 0.02778, 0, 0.5],
    "97": [0, 0.44444, 0, 0, 0.48056],
    "98": [0, 0.69444, 0, 0, 0.51667],
    "99": [0, 0.44444, 0, 0, 0.44445],
    "100": [0, 0.69444, 0, 0, 0.51667],
    "101": [0, 0.44444, 0, 0, 0.44445],
    "102": [0, 0.69444, 0.06944, 0, 0.30556],
    "103": [0.19444, 0.44444, 0.01389, 0, 0.5],
    "104": [0, 0.69444, 0, 0, 0.51667],
    "105": [0, 0.67937, 0, 0, 0.23889],
    "106": [0.19444, 0.67937, 0, 0, 0.26667],
    "107": [0, 0.69444, 0, 0, 0.48889],
    "108": [0, 0.69444, 0, 0, 0.23889],
    "109": [0, 0.44444, 0, 0, 0.79445],
    "110": [0, 0.44444, 0, 0, 0.51667],
    "111": [0, 0.44444, 0, 0, 0.5],
    "112": [0.19444, 0.44444, 0, 0, 0.51667],
    "113": [0.19444, 0.44444, 0, 0, 0.51667],
    "114": [0, 0.44444, 0.01389, 0, 0.34167],
    "115": [0, 0.44444, 0, 0, 0.38333],
    "116": [0, 0.57143, 0, 0, 0.36111],
    "117": [0, 0.44444, 0, 0, 0.51667],
    "118": [0, 0.44444, 0.01389, 0, 0.46111],
    "119": [0, 0.44444, 0.01389, 0, 0.68334],
    "120": [0, 0.44444, 0, 0, 0.46111],
    "121": [0.19444, 0.44444, 0.01389, 0, 0.46111],
    "122": [0, 0.44444, 0, 0, 0.43472],
    "126": [0.35, 0.32659, 0, 0, 0.5],
    "160": [0, 0, 0, 0, 0.25],
    "168": [0, 0.67937, 0, 0, 0.5],
    "176": [0, 0.69444, 0, 0, 0.66667],
    "184": [0.17014, 0, 0, 0, 0.44445],
    "305": [0, 0.44444, 0, 0, 0.23889],
    "567": [0.19444, 0.44444, 0, 0, 0.26667],
    "710": [0, 0.69444, 0, 0, 0.5],
    "711": [0, 0.63194, 0, 0, 0.5],
    "713": [0, 0.60889, 0, 0, 0.5],
    "714": [0, 0.69444, 0, 0, 0.5],
    "715": [0, 0.69444, 0, 0, 0.5],
    "728": [0, 0.69444, 0, 0, 0.5],
    "729": [0, 0.67937, 0, 0, 0.27778],
    "730": [0, 0.69444, 0, 0, 0.66667],
    "732": [0, 0.67659, 0, 0, 0.5],
    "733": [0, 0.69444, 0, 0, 0.5],
    "915": [0, 0.69444, 0, 0, 0.54167],
    "916": [0, 0.69444, 0, 0, 0.83334],
    "920": [0, 0.69444, 0, 0, 0.77778],
    "923": [0, 0.69444, 0, 0, 0.61111],
    "926": [0, 0.69444, 0, 0, 0.66667],
    "928": [0, 0.69444, 0, 0, 0.70834],
    "931": [0, 0.69444, 0, 0, 0.72222],
    "933": [0, 0.69444, 0, 0, 0.77778],
    "934": [0, 0.69444, 0, 0, 0.72222],
    "936": [0, 0.69444, 0, 0, 0.77778],
    "937": [0, 0.69444, 0, 0, 0.72222],
    "8211": [0, 0.44444, 0.02778, 0, 0.5],
    "8212": [0, 0.44444, 0.02778, 0, 1],
    "8216": [0, 0.69444, 0, 0, 0.27778],
    "8217": [0, 0.69444, 0, 0, 0.27778],
    "8220": [0, 0.69444, 0, 0, 0.5],
    "8221": [0, 0.69444, 0, 0, 0.5]
  },
  "Script-Regular": {
    "32": [0, 0, 0, 0, 0.25],
    "65": [0, 0.7, 0.22925, 0, 0.80253],
    "66": [0, 0.7, 0.04087, 0, 0.90757],
    "67": [0, 0.7, 0.1689, 0, 0.66619],
    "68": [0, 0.7, 0.09371, 0, 0.77443],
    "69": [0, 0.7, 0.18583, 0, 0.56162],
    "70": [0, 0.7, 0.13634, 0, 0.89544],
    "71": [0, 0.7, 0.17322, 0, 0.60961],
    "72": [0, 0.7, 0.29694, 0, 0.96919],
    "73": [0, 0.7, 0.19189, 0, 0.80907],
    "74": [0.27778, 0.7, 0.19189, 0, 1.05159],
    "75": [0, 0.7, 0.31259, 0, 0.91364],
    "76": [0, 0.7, 0.19189, 0, 0.87373],
    "77": [0, 0.7, 0.15981, 0, 1.08031],
    "78": [0, 0.7, 0.3525, 0, 0.9015],
    "79": [0, 0.7, 0.08078, 0, 0.73787],
    "80": [0, 0.7, 0.08078, 0, 1.01262],
    "81": [0, 0.7, 0.03305, 0, 0.88282],
    "82": [0, 0.7, 0.06259, 0, 0.85],
    "83": [0, 0.7, 0.19189, 0, 0.86767],
    "84": [0, 0.7, 0.29087, 0, 0.74697],
    "85": [0, 0.7, 0.25815, 0, 0.79996],
    "86": [0, 0.7, 0.27523, 0, 0.62204],
    "87": [0, 0.7, 0.27523, 0, 0.80532],
    "88": [0, 0.7, 0.26006, 0, 0.94445],
    "89": [0, 0.7, 0.2939, 0, 0.70961],
    "90": [0, 0.7, 0.24037, 0, 0.8212],
    "160": [0, 0, 0, 0, 0.25]
  },
  "Size1-Regular": {
    "32": [0, 0, 0, 0, 0.25],
    "40": [0.35001, 0.85, 0, 0, 0.45834],
    "41": [0.35001, 0.85, 0, 0, 0.45834],
    "47": [0.35001, 0.85, 0, 0, 0.57778],
    "91": [0.35001, 0.85, 0, 0, 0.41667],
    "92": [0.35001, 0.85, 0, 0, 0.57778],
    "93": [0.35001, 0.85, 0, 0, 0.41667],
    "123": [0.35001, 0.85, 0, 0, 0.58334],
    "125": [0.35001, 0.85, 0, 0, 0.58334],
    "160": [0, 0, 0, 0, 0.25],
    "710": [0, 0.72222, 0, 0, 0.55556],
    "732": [0, 0.72222, 0, 0, 0.55556],
    "770": [0, 0.72222, 0, 0, 0.55556],
    "771": [0, 0.72222, 0, 0, 0.55556],
    "8214": [-99e-5, 0.601, 0, 0, 0.77778],
    "8593": [1e-5, 0.6, 0, 0, 0.66667],
    "8595": [1e-5, 0.6, 0, 0, 0.66667],
    "8657": [1e-5, 0.6, 0, 0, 0.77778],
    "8659": [1e-5, 0.6, 0, 0, 0.77778],
    "8719": [0.25001, 0.75, 0, 0, 0.94445],
    "8720": [0.25001, 0.75, 0, 0, 0.94445],
    "8721": [0.25001, 0.75, 0, 0, 1.05556],
    "8730": [0.35001, 0.85, 0, 0, 1],
    "8739": [-599e-5, 0.606, 0, 0, 0.33333],
    "8741": [-599e-5, 0.606, 0, 0, 0.55556],
    "8747": [0.30612, 0.805, 0.19445, 0, 0.47222],
    "8748": [0.306, 0.805, 0.19445, 0, 0.47222],
    "8749": [0.306, 0.805, 0.19445, 0, 0.47222],
    "8750": [0.30612, 0.805, 0.19445, 0, 0.47222],
    "8896": [0.25001, 0.75, 0, 0, 0.83334],
    "8897": [0.25001, 0.75, 0, 0, 0.83334],
    "8898": [0.25001, 0.75, 0, 0, 0.83334],
    "8899": [0.25001, 0.75, 0, 0, 0.83334],
    "8968": [0.35001, 0.85, 0, 0, 0.47222],
    "8969": [0.35001, 0.85, 0, 0, 0.47222],
    "8970": [0.35001, 0.85, 0, 0, 0.47222],
    "8971": [0.35001, 0.85, 0, 0, 0.47222],
    "9168": [-99e-5, 0.601, 0, 0, 0.66667],
    "10216": [0.35001, 0.85, 0, 0, 0.47222],
    "10217": [0.35001, 0.85, 0, 0, 0.47222],
    "10752": [0.25001, 0.75, 0, 0, 1.11111],
    "10753": [0.25001, 0.75, 0, 0, 1.11111],
    "10754": [0.25001, 0.75, 0, 0, 1.11111],
    "10756": [0.25001, 0.75, 0, 0, 0.83334],
    "10758": [0.25001, 0.75, 0, 0, 0.83334]
  },
  "Size2-Regular": {
    "32": [0, 0, 0, 0, 0.25],
    "40": [0.65002, 1.15, 0, 0, 0.59722],
    "41": [0.65002, 1.15, 0, 0, 0.59722],
    "47": [0.65002, 1.15, 0, 0, 0.81111],
    "91": [0.65002, 1.15, 0, 0, 0.47222],
    "92": [0.65002, 1.15, 0, 0, 0.81111],
    "93": [0.65002, 1.15, 0, 0, 0.47222],
    "123": [0.65002, 1.15, 0, 0, 0.66667],
    "125": [0.65002, 1.15, 0, 0, 0.66667],
    "160": [0, 0, 0, 0, 0.25],
    "710": [0, 0.75, 0, 0, 1],
    "732": [0, 0.75, 0, 0, 1],
    "770": [0, 0.75, 0, 0, 1],
    "771": [0, 0.75, 0, 0, 1],
    "8719": [0.55001, 1.05, 0, 0, 1.27778],
    "8720": [0.55001, 1.05, 0, 0, 1.27778],
    "8721": [0.55001, 1.05, 0, 0, 1.44445],
    "8730": [0.65002, 1.15, 0, 0, 1],
    "8747": [0.86225, 1.36, 0.44445, 0, 0.55556],
    "8748": [0.862, 1.36, 0.44445, 0, 0.55556],
    "8749": [0.862, 1.36, 0.44445, 0, 0.55556],
    "8750": [0.86225, 1.36, 0.44445, 0, 0.55556],
    "8896": [0.55001, 1.05, 0, 0, 1.11111],
    "8897": [0.55001, 1.05, 0, 0, 1.11111],
    "8898": [0.55001, 1.05, 0, 0, 1.11111],
    "8899": [0.55001, 1.05, 0, 0, 1.11111],
    "8968": [0.65002, 1.15, 0, 0, 0.52778],
    "8969": [0.65002, 1.15, 0, 0, 0.52778],
    "8970": [0.65002, 1.15, 0, 0, 0.52778],
    "8971": [0.65002, 1.15, 0, 0, 0.52778],
    "10216": [0.65002, 1.15, 0, 0, 0.61111],
    "10217": [0.65002, 1.15, 0, 0, 0.61111],
    "10752": [0.55001, 1.05, 0, 0, 1.51112],
    "10753": [0.55001, 1.05, 0, 0, 1.51112],
    "10754": [0.55001, 1.05, 0, 0, 1.51112],
    "10756": [0.55001, 1.05, 0, 0, 1.11111],
    "10758": [0.55001, 1.05, 0, 0, 1.11111]
  },
  "Size3-Regular": {
    "32": [0, 0, 0, 0, 0.25],
    "40": [0.95003, 1.45, 0, 0, 0.73611],
    "41": [0.95003, 1.45, 0, 0, 0.73611],
    "47": [0.95003, 1.45, 0, 0, 1.04445],
    "91": [0.95003, 1.45, 0, 0, 0.52778],
    "92": [0.95003, 1.45, 0, 0, 1.04445],
    "93": [0.95003, 1.45, 0, 0, 0.52778],
    "123": [0.95003, 1.45, 0, 0, 0.75],
    "125": [0.95003, 1.45, 0, 0, 0.75],
    "160": [0, 0, 0, 0, 0.25],
    "710": [0, 0.75, 0, 0, 1.44445],
    "732": [0, 0.75, 0, 0, 1.44445],
    "770": [0, 0.75, 0, 0, 1.44445],
    "771": [0, 0.75, 0, 0, 1.44445],
    "8730": [0.95003, 1.45, 0, 0, 1],
    "8968": [0.95003, 1.45, 0, 0, 0.58334],
    "8969": [0.95003, 1.45, 0, 0, 0.58334],
    "8970": [0.95003, 1.45, 0, 0, 0.58334],
    "8971": [0.95003, 1.45, 0, 0, 0.58334],
    "10216": [0.95003, 1.45, 0, 0, 0.75],
    "10217": [0.95003, 1.45, 0, 0, 0.75]
  },
  "Size4-Regular": {
    "32": [0, 0, 0, 0, 0.25],
    "40": [1.25003, 1.75, 0, 0, 0.79167],
    "41": [1.25003, 1.75, 0, 0, 0.79167],
    "47": [1.25003, 1.75, 0, 0, 1.27778],
    "91": [1.25003, 1.75, 0, 0, 0.58334],
    "92": [1.25003, 1.75, 0, 0, 1.27778],
    "93": [1.25003, 1.75, 0, 0, 0.58334],
    "123": [1.25003, 1.75, 0, 0, 0.80556],
    "125": [1.25003, 1.75, 0, 0, 0.80556],
    "160": [0, 0, 0, 0, 0.25],
    "710": [0, 0.825, 0, 0, 1.8889],
    "732": [0, 0.825, 0, 0, 1.8889],
    "770": [0, 0.825, 0, 0, 1.8889],
    "771": [0, 0.825, 0, 0, 1.8889],
    "8730": [1.25003, 1.75, 0, 0, 1],
    "8968": [1.25003, 1.75, 0, 0, 0.63889],
    "8969": [1.25003, 1.75, 0, 0, 0.63889],
    "8970": [1.25003, 1.75, 0, 0, 0.63889],
    "8971": [1.25003, 1.75, 0, 0, 0.63889],
    "9115": [0.64502, 1.155, 0, 0, 0.875],
    "9116": [1e-5, 0.6, 0, 0, 0.875],
    "9117": [0.64502, 1.155, 0, 0, 0.875],
    "9118": [0.64502, 1.155, 0, 0, 0.875],
    "9119": [1e-5, 0.6, 0, 0, 0.875],
    "9120": [0.64502, 1.155, 0, 0, 0.875],
    "9121": [0.64502, 1.155, 0, 0, 0.66667],
    "9122": [-99e-5, 0.601, 0, 0, 0.66667],
    "9123": [0.64502, 1.155, 0, 0, 0.66667],
    "9124": [0.64502, 1.155, 0, 0, 0.66667],
    "9125": [-99e-5, 0.601, 0, 0, 0.66667],
    "9126": [0.64502, 1.155, 0, 0, 0.66667],
    "9127": [1e-5, 0.9, 0, 0, 0.88889],
    "9128": [0.65002, 1.15, 0, 0, 0.88889],
    "9129": [0.90001, 0, 0, 0, 0.88889],
    "9130": [0, 0.3, 0, 0, 0.88889],
    "9131": [1e-5, 0.9, 0, 0, 0.88889],
    "9132": [0.65002, 1.15, 0, 0, 0.88889],
    "9133": [0.90001, 0, 0, 0, 0.88889],
    "9143": [0.88502, 0.915, 0, 0, 1.05556],
    "10216": [1.25003, 1.75, 0, 0, 0.80556],
    "10217": [1.25003, 1.75, 0, 0, 0.80556],
    "57344": [-499e-5, 0.605, 0, 0, 1.05556],
    "57345": [-499e-5, 0.605, 0, 0, 1.05556],
    "57680": [0, 0.12, 0, 0, 0.45],
    "57681": [0, 0.12, 0, 0, 0.45],
    "57682": [0, 0.12, 0, 0, 0.45],
    "57683": [0, 0.12, 0, 0, 0.45]
  },
  "Typewriter-Regular": {
    "32": [0, 0, 0, 0, 0.525],
    "33": [0, 0.61111, 0, 0, 0.525],
    "34": [0, 0.61111, 0, 0, 0.525],
    "35": [0, 0.61111, 0, 0, 0.525],
    "36": [0.08333, 0.69444, 0, 0, 0.525],
    "37": [0.08333, 0.69444, 0, 0, 0.525],
    "38": [0, 0.61111, 0, 0, 0.525],
    "39": [0, 0.61111, 0, 0, 0.525],
    "40": [0.08333, 0.69444, 0, 0, 0.525],
    "41": [0.08333, 0.69444, 0, 0, 0.525],
    "42": [0, 0.52083, 0, 0, 0.525],
    "43": [-0.08056, 0.53055, 0, 0, 0.525],
    "44": [0.13889, 0.125, 0, 0, 0.525],
    "45": [-0.08056, 0.53055, 0, 0, 0.525],
    "46": [0, 0.125, 0, 0, 0.525],
    "47": [0.08333, 0.69444, 0, 0, 0.525],
    "48": [0, 0.61111, 0, 0, 0.525],
    "49": [0, 0.61111, 0, 0, 0.525],
    "50": [0, 0.61111, 0, 0, 0.525],
    "51": [0, 0.61111, 0, 0, 0.525],
    "52": [0, 0.61111, 0, 0, 0.525],
    "53": [0, 0.61111, 0, 0, 0.525],
    "54": [0, 0.61111, 0, 0, 0.525],
    "55": [0, 0.61111, 0, 0, 0.525],
    "56": [0, 0.61111, 0, 0, 0.525],
    "57": [0, 0.61111, 0, 0, 0.525],
    "58": [0, 0.43056, 0, 0, 0.525],
    "59": [0.13889, 0.43056, 0, 0, 0.525],
    "60": [-0.05556, 0.55556, 0, 0, 0.525],
    "61": [-0.19549, 0.41562, 0, 0, 0.525],
    "62": [-0.05556, 0.55556, 0, 0, 0.525],
    "63": [0, 0.61111, 0, 0, 0.525],
    "64": [0, 0.61111, 0, 0, 0.525],
    "65": [0, 0.61111, 0, 0, 0.525],
    "66": [0, 0.61111, 0, 0, 0.525],
    "67": [0, 0.61111, 0, 0, 0.525],
    "68": [0, 0.61111, 0, 0, 0.525],
    "69": [0, 0.61111, 0, 0, 0.525],
    "70": [0, 0.61111, 0, 0, 0.525],
    "71": [0, 0.61111, 0, 0, 0.525],
    "72": [0, 0.61111, 0, 0, 0.525],
    "73": [0, 0.61111, 0, 0, 0.525],
    "74": [0, 0.61111, 0, 0, 0.525],
    "75": [0, 0.61111, 0, 0, 0.525],
    "76": [0, 0.61111, 0, 0, 0.525],
    "77": [0, 0.61111, 0, 0, 0.525],
    "78": [0, 0.61111, 0, 0, 0.525],
    "79": [0, 0.61111, 0, 0, 0.525],
    "80": [0, 0.61111, 0, 0, 0.525],
    "81": [0.13889, 0.61111, 0, 0, 0.525],
    "82": [0, 0.61111, 0, 0, 0.525],
    "83": [0, 0.61111, 0, 0, 0.525],
    "84": [0, 0.61111, 0, 0, 0.525],
    "85": [0, 0.61111, 0, 0, 0.525],
    "86": [0, 0.61111, 0, 0, 0.525],
    "87": [0, 0.61111, 0, 0, 0.525],
    "88": [0, 0.61111, 0, 0, 0.525],
    "89": [0, 0.61111, 0, 0, 0.525],
    "90": [0, 0.61111, 0, 0, 0.525],
    "91": [0.08333, 0.69444, 0, 0, 0.525],
    "92": [0.08333, 0.69444, 0, 0, 0.525],
    "93": [0.08333, 0.69444, 0, 0, 0.525],
    "94": [0, 0.61111, 0, 0, 0.525],
    "95": [0.09514, 0, 0, 0, 0.525],
    "96": [0, 0.61111, 0, 0, 0.525],
    "97": [0, 0.43056, 0, 0, 0.525],
    "98": [0, 0.61111, 0, 0, 0.525],
    "99": [0, 0.43056, 0, 0, 0.525],
    "100": [0, 0.61111, 0, 0, 0.525],
    "101": [0, 0.43056, 0, 0, 0.525],
    "102": [0, 0.61111, 0, 0, 0.525],
    "103": [0.22222, 0.43056, 0, 0, 0.525],
    "104": [0, 0.61111, 0, 0, 0.525],
    "105": [0, 0.61111, 0, 0, 0.525],
    "106": [0.22222, 0.61111, 0, 0, 0.525],
    "107": [0, 0.61111, 0, 0, 0.525],
    "108": [0, 0.61111, 0, 0, 0.525],
    "109": [0, 0.43056, 0, 0, 0.525],
    "110": [0, 0.43056, 0, 0, 0.525],
    "111": [0, 0.43056, 0, 0, 0.525],
    "112": [0.22222, 0.43056, 0, 0, 0.525],
    "113": [0.22222, 0.43056, 0, 0, 0.525],
    "114": [0, 0.43056, 0, 0, 0.525],
    "115": [0, 0.43056, 0, 0, 0.525],
    "116": [0, 0.55358, 0, 0, 0.525],
    "117": [0, 0.43056, 0, 0, 0.525],
    "118": [0, 0.43056, 0, 0, 0.525],
    "119": [0, 0.43056, 0, 0, 0.525],
    "120": [0, 0.43056, 0, 0, 0.525],
    "121": [0.22222, 0.43056, 0, 0, 0.525],
    "122": [0, 0.43056, 0, 0, 0.525],
    "123": [0.08333, 0.69444, 0, 0, 0.525],
    "124": [0.08333, 0.69444, 0, 0, 0.525],
    "125": [0.08333, 0.69444, 0, 0, 0.525],
    "126": [0, 0.61111, 0, 0, 0.525],
    "127": [0, 0.61111, 0, 0, 0.525],
    "160": [0, 0, 0, 0, 0.525],
    "176": [0, 0.61111, 0, 0, 0.525],
    "184": [0.19445, 0, 0, 0, 0.525],
    "305": [0, 0.43056, 0, 0, 0.525],
    "567": [0.22222, 0.43056, 0, 0, 0.525],
    "711": [0, 0.56597, 0, 0, 0.525],
    "713": [0, 0.56555, 0, 0, 0.525],
    "714": [0, 0.61111, 0, 0, 0.525],
    "715": [0, 0.61111, 0, 0, 0.525],
    "728": [0, 0.61111, 0, 0, 0.525],
    "730": [0, 0.61111, 0, 0, 0.525],
    "770": [0, 0.61111, 0, 0, 0.525],
    "771": [0, 0.61111, 0, 0, 0.525],
    "776": [0, 0.61111, 0, 0, 0.525],
    "915": [0, 0.61111, 0, 0, 0.525],
    "916": [0, 0.61111, 0, 0, 0.525],
    "920": [0, 0.61111, 0, 0, 0.525],
    "923": [0, 0.61111, 0, 0, 0.525],
    "926": [0, 0.61111, 0, 0, 0.525],
    "928": [0, 0.61111, 0, 0, 0.525],
    "931": [0, 0.61111, 0, 0, 0.525],
    "933": [0, 0.61111, 0, 0, 0.525],
    "934": [0, 0.61111, 0, 0, 0.525],
    "936": [0, 0.61111, 0, 0, 0.525],
    "937": [0, 0.61111, 0, 0, 0.525],
    "8216": [0, 0.61111, 0, 0, 0.525],
    "8217": [0, 0.61111, 0, 0, 0.525],
    "8242": [0, 0.61111, 0, 0, 0.525],
    "9251": [0.11111, 0.21944, 0, 0, 0.525]
  }
};
var sigmasAndXis = {
  slant: [0.25, 0.25, 0.25],
  // sigma1
  space: [0, 0, 0],
  // sigma2
  stretch: [0, 0, 0],
  // sigma3
  shrink: [0, 0, 0],
  // sigma4
  xHeight: [0.431, 0.431, 0.431],
  // sigma5
  quad: [1, 1.171, 1.472],
  // sigma6
  extraSpace: [0, 0, 0],
  // sigma7
  num1: [0.677, 0.732, 0.925],
  // sigma8
  num2: [0.394, 0.384, 0.387],
  // sigma9
  num3: [0.444, 0.471, 0.504],
  // sigma10
  denom1: [0.686, 0.752, 1.025],
  // sigma11
  denom2: [0.345, 0.344, 0.532],
  // sigma12
  sup1: [0.413, 0.503, 0.504],
  // sigma13
  sup2: [0.363, 0.431, 0.404],
  // sigma14
  sup3: [0.289, 0.286, 0.294],
  // sigma15
  sub1: [0.15, 0.143, 0.2],
  // sigma16
  sub2: [0.247, 0.286, 0.4],
  // sigma17
  supDrop: [0.386, 0.353, 0.494],
  // sigma18
  subDrop: [0.05, 0.071, 0.1],
  // sigma19
  delim1: [2.39, 1.7, 1.98],
  // sigma20
  delim2: [1.01, 1.157, 1.42],
  // sigma21
  axisHeight: [0.25, 0.25, 0.25],
  // sigma22
  // These font metrics are extracted from TeX by using tftopl on cmex10.tfm;
  // they correspond to the font parameters of the extension fonts (family 3).
  // See the TeXbook, page 441. In AMSTeX, the extension fonts scale; to
  // match cmex7, we'd use cmex7.tfm values for script and scriptscript
  // values.
  defaultRuleThickness: [0.04, 0.049, 0.049],
  // xi8; cmex7: 0.049
  bigOpSpacing1: [0.111, 0.111, 0.111],
  // xi9
  bigOpSpacing2: [0.166, 0.166, 0.166],
  // xi10
  bigOpSpacing3: [0.2, 0.2, 0.2],
  // xi11
  bigOpSpacing4: [0.6, 0.611, 0.611],
  // xi12; cmex7: 0.611
  bigOpSpacing5: [0.1, 0.143, 0.143],
  // xi13; cmex7: 0.143
  // The \sqrt rule width is taken from the height of the surd character.
  // Since we use the same font at all sizes, this thickness doesn't scale.
  sqrtRuleThickness: [0.04, 0.04, 0.04],
  // This value determines how large a pt is, for metrics which are defined
  // in terms of pts.
  // This value is also used in katex.scss; if you change it make sure the
  // values match.
  ptPerEm: [10, 10, 10],
  // The space between adjacent `|` columns in an array definition. From
  // `\showthe\doublerulesep` in LaTeX. Equals 2.0 / ptPerEm.
  doubleRuleSep: [0.2, 0.2, 0.2],
  // The width of separator lines in {array} environments. From
  // `\showthe\arrayrulewidth` in LaTeX. Equals 0.4 / ptPerEm.
  arrayRuleWidth: [0.04, 0.04, 0.04],
  // Two values from LaTeX source2e:
  fboxsep: [0.3, 0.3, 0.3],
  //        3 pt / ptPerEm
  fboxrule: [0.04, 0.04, 0.04]
  // 0.4 pt / ptPerEm
};
var extraCharacterMap = {
  // Latin-1
  "\xC5": "A",
  "\xD0": "D",
  "\xDE": "o",
  "\xE5": "a",
  "\xF0": "d",
  "\xFE": "o",
  // Cyrillic
  "\u0410": "A",
  "\u0411": "B",
  "\u0412": "B",
  "\u0413": "F",
  "\u0414": "A",
  "\u0415": "E",
  "\u0416": "K",
  "\u0417": "3",
  "\u0418": "N",
  "\u0419": "N",
  "\u041A": "K",
  "\u041B": "N",
  "\u041C": "M",
  "\u041D": "H",
  "\u041E": "O",
  "\u041F": "N",
  "\u0420": "P",
  "\u0421": "C",
  "\u0422": "T",
  "\u0423": "y",
  "\u0424": "O",
  "\u0425": "X",
  "\u0426": "U",
  "\u0427": "h",
  "\u0428": "W",
  "\u0429": "W",
  "\u042A": "B",
  "\u042B": "X",
  "\u042C": "B",
  "\u042D": "3",
  "\u042E": "X",
  "\u042F": "R",
  "\u0430": "a",
  "\u0431": "b",
  "\u0432": "a",
  "\u0433": "r",
  "\u0434": "y",
  "\u0435": "e",
  "\u0436": "m",
  "\u0437": "e",
  "\u0438": "n",
  "\u0439": "n",
  "\u043A": "n",
  "\u043B": "n",
  "\u043C": "m",
  "\u043D": "n",
  "\u043E": "o",
  "\u043F": "n",
  "\u0440": "p",
  "\u0441": "c",
  "\u0442": "o",
  "\u0443": "y",
  "\u0444": "b",
  "\u0445": "x",
  "\u0446": "n",
  "\u0447": "n",
  "\u0448": "w",
  "\u0449": "w",
  "\u044A": "a",
  "\u044B": "m",
  "\u044C": "a",
  "\u044D": "e",
  "\u044E": "m",
  "\u044F": "r"
};
function setFontMetrics(fontName, metrics2) {
  fontMetricsData[fontName] = metrics2;
}
function getCharacterMetrics(character, font, mode) {
  if (!fontMetricsData[font]) {
    throw new Error("Font metrics not found for font: " + font + ".");
  }
  var ch2 = character.charCodeAt(0);
  var metrics2 = fontMetricsData[font][ch2];
  if (!metrics2 && character[0] in extraCharacterMap) {
    ch2 = extraCharacterMap[character[0]].charCodeAt(0);
    metrics2 = fontMetricsData[font][ch2];
  }
  if (!metrics2 && mode === "text") {
    if (supportedCodepoint(ch2)) {
      metrics2 = fontMetricsData[font][77];
    }
  }
  if (metrics2) {
    return {
      depth: metrics2[0],
      height: metrics2[1],
      italic: metrics2[2],
      skew: metrics2[3],
      width: metrics2[4]
    };
  }
}
var fontMetricsBySizeIndex = {};
function getGlobalMetrics(size) {
  var sizeIndex;
  if (size >= 5) {
    sizeIndex = 0;
  } else if (size >= 3) {
    sizeIndex = 1;
  } else {
    sizeIndex = 2;
  }
  if (!fontMetricsBySizeIndex[sizeIndex]) {
    var metrics2 = fontMetricsBySizeIndex[sizeIndex] = {
      cssEmPerMu: sigmasAndXis.quad[sizeIndex] / 18
    };
    for (var key of Object.keys(sigmasAndXis)) {
      metrics2[key] = sigmasAndXis[key][sizeIndex];
    }
  }
  return fontMetricsBySizeIndex[sizeIndex];
}
var symbols = {
  "math": {},
  "text": {}
};
function defineSymbol(mode, font, group, replace, name, acceptUnicodeChar) {
  symbols[mode][name] = {
    font,
    group,
    replace
  };
  if (acceptUnicodeChar && replace) {
    symbols[mode][replace] = symbols[mode][name];
  }
}
var math = "math";
var text2 = "text";
var main = "main";
var ams = "ams";
var accent = "accent-token";
var bin = "bin";
var close = "close";
var inner = "inner";
var mathord = "mathord";
var op = "op-token";
var open = "open";
var punct = "punct";
var rel = "rel";
var spacing = "spacing";
var textord = "textord";
defineSymbol(math, main, rel, "\u2261", "\\equiv", true);
defineSymbol(math, main, rel, "\u227A", "\\prec", true);
defineSymbol(math, main, rel, "\u227B", "\\succ", true);
defineSymbol(math, main, rel, "\u223C", "\\sim", true);
defineSymbol(math, main, rel, "\u22A5", "\\perp");
defineSymbol(math, main, rel, "\u2AAF", "\\preceq", true);
defineSymbol(math, main, rel, "\u2AB0", "\\succeq", true);
defineSymbol(math, main, rel, "\u2243", "\\simeq", true);
defineSymbol(math, main, rel, "\u2223", "\\mid", true);
defineSymbol(math, main, rel, "\u226A", "\\ll", true);
defineSymbol(math, main, rel, "\u226B", "\\gg", true);
defineSymbol(math, main, rel, "\u224D", "\\asymp", true);
defineSymbol(math, main, rel, "\u2225", "\\parallel");
defineSymbol(math, main, rel, "\u22C8", "\\bowtie", true);
defineSymbol(math, main, rel, "\u2323", "\\smile", true);
defineSymbol(math, main, rel, "\u2291", "\\sqsubseteq", true);
defineSymbol(math, main, rel, "\u2292", "\\sqsupseteq", true);
defineSymbol(math, main, rel, "\u2250", "\\doteq", true);
defineSymbol(math, main, rel, "\u2322", "\\frown", true);
defineSymbol(math, main, rel, "\u220B", "\\ni", true);
defineSymbol(math, main, rel, "\u221D", "\\propto", true);
defineSymbol(math, main, rel, "\u22A2", "\\vdash", true);
defineSymbol(math, main, rel, "\u22A3", "\\dashv", true);
defineSymbol(math, main, rel, "\u220B", "\\owns");
defineSymbol(math, main, punct, ".", "\\ldotp");
defineSymbol(math, main, punct, "\u22C5", "\\cdotp");
defineSymbol(math, main, punct, "\u22C5", "\xB7");
defineSymbol(text2, main, textord, "\u22C5", "\xB7");
defineSymbol(math, main, textord, "#", "\\#");
defineSymbol(text2, main, textord, "#", "\\#");
defineSymbol(math, main, textord, "&", "\\&");
defineSymbol(text2, main, textord, "&", "\\&");
defineSymbol(math, main, textord, "\u2135", "\\aleph", true);
defineSymbol(math, main, textord, "\u2200", "\\forall", true);
defineSymbol(math, main, textord, "\u210F", "\\hbar", true);
defineSymbol(math, main, textord, "\u2203", "\\exists", true);
defineSymbol(math, main, textord, "\u2207", "\\nabla", true);
defineSymbol(math, main, textord, "\u266D", "\\flat", true);
defineSymbol(math, main, textord, "\u2113", "\\ell", true);
defineSymbol(math, main, textord, "\u266E", "\\natural", true);
defineSymbol(math, main, textord, "\u2663", "\\clubsuit", true);
defineSymbol(math, main, textord, "\u2118", "\\wp", true);
defineSymbol(math, main, textord, "\u266F", "\\sharp", true);
defineSymbol(math, main, textord, "\u2662", "\\diamondsuit", true);
defineSymbol(math, main, textord, "\u211C", "\\Re", true);
defineSymbol(math, main, textord, "\u2661", "\\heartsuit", true);
defineSymbol(math, main, textord, "\u2111", "\\Im", true);
defineSymbol(math, main, textord, "\u2660", "\\spadesuit", true);
defineSymbol(math, main, textord, "\xA7", "\\S", true);
defineSymbol(text2, main, textord, "\xA7", "\\S");
defineSymbol(math, main, textord, "\xB6", "\\P", true);
defineSymbol(text2, main, textord, "\xB6", "\\P");
defineSymbol(math, main, textord, "\u2020", "\\dag");
defineSymbol(text2, main, textord, "\u2020", "\\dag");
defineSymbol(text2, main, textord, "\u2020", "\\textdagger");
defineSymbol(math, main, textord, "\u2021", "\\ddag");
defineSymbol(text2, main, textord, "\u2021", "\\ddag");
defineSymbol(text2, main, textord, "\u2021", "\\textdaggerdbl");
defineSymbol(math, main, close, "\u23B1", "\\rmoustache", true);
defineSymbol(math, main, open, "\u23B0", "\\lmoustache", true);
defineSymbol(math, main, close, "\u27EF", "\\rgroup", true);
defineSymbol(math, main, open, "\u27EE", "\\lgroup", true);
defineSymbol(math, main, bin, "\u2213", "\\mp", true);
defineSymbol(math, main, bin, "\u2296", "\\ominus", true);
defineSymbol(math, main, bin, "\u228E", "\\uplus", true);
defineSymbol(math, main, bin, "\u2293", "\\sqcap", true);
defineSymbol(math, main, bin, "\u2217", "\\ast");
defineSymbol(math, main, bin, "\u2294", "\\sqcup", true);
defineSymbol(math, main, bin, "\u25EF", "\\bigcirc", true);
defineSymbol(math, main, bin, "\u2219", "\\bullet", true);
defineSymbol(math, main, bin, "\u2021", "\\ddagger");
defineSymbol(math, main, bin, "\u2240", "\\wr", true);
defineSymbol(math, main, bin, "\u2A3F", "\\amalg");
defineSymbol(math, main, bin, "&", "\\And");
defineSymbol(math, main, rel, "\u27F5", "\\longleftarrow", true);
defineSymbol(math, main, rel, "\u21D0", "\\Leftarrow", true);
defineSymbol(math, main, rel, "\u27F8", "\\Longleftarrow", true);
defineSymbol(math, main, rel, "\u27F6", "\\longrightarrow", true);
defineSymbol(math, main, rel, "\u21D2", "\\Rightarrow", true);
defineSymbol(math, main, rel, "\u27F9", "\\Longrightarrow", true);
defineSymbol(math, main, rel, "\u2194", "\\leftrightarrow", true);
defineSymbol(math, main, rel, "\u27F7", "\\longleftrightarrow", true);
defineSymbol(math, main, rel, "\u21D4", "\\Leftrightarrow", true);
defineSymbol(math, main, rel, "\u27FA", "\\Longleftrightarrow", true);
defineSymbol(math, main, rel, "\u21A6", "\\mapsto", true);
defineSymbol(math, main, rel, "\u27FC", "\\longmapsto", true);
defineSymbol(math, main, rel, "\u2197", "\\nearrow", true);
defineSymbol(math, main, rel, "\u21A9", "\\hookleftarrow", true);
defineSymbol(math, main, rel, "\u21AA", "\\hookrightarrow", true);
defineSymbol(math, main, rel, "\u2198", "\\searrow", true);
defineSymbol(math, main, rel, "\u21BC", "\\leftharpoonup", true);
defineSymbol(math, main, rel, "\u21C0", "\\rightharpoonup", true);
defineSymbol(math, main, rel, "\u2199", "\\swarrow", true);
defineSymbol(math, main, rel, "\u21BD", "\\leftharpoondown", true);
defineSymbol(math, main, rel, "\u21C1", "\\rightharpoondown", true);
defineSymbol(math, main, rel, "\u2196", "\\nwarrow", true);
defineSymbol(math, main, rel, "\u21CC", "\\rightleftharpoons", true);
defineSymbol(math, ams, rel, "\u226E", "\\nless", true);
defineSymbol(math, ams, rel, "\uE010", "\\@nleqslant");
defineSymbol(math, ams, rel, "\uE011", "\\@nleqq");
defineSymbol(math, ams, rel, "\u2A87", "\\lneq", true);
defineSymbol(math, ams, rel, "\u2268", "\\lneqq", true);
defineSymbol(math, ams, rel, "\uE00C", "\\@lvertneqq");
defineSymbol(math, ams, rel, "\u22E6", "\\lnsim", true);
defineSymbol(math, ams, rel, "\u2A89", "\\lnapprox", true);
defineSymbol(math, ams, rel, "\u2280", "\\nprec", true);
defineSymbol(math, ams, rel, "\u22E0", "\\npreceq", true);
defineSymbol(math, ams, rel, "\u22E8", "\\precnsim", true);
defineSymbol(math, ams, rel, "\u2AB9", "\\precnapprox", true);
defineSymbol(math, ams, rel, "\u2241", "\\nsim", true);
defineSymbol(math, ams, rel, "\uE006", "\\@nshortmid");
defineSymbol(math, ams, rel, "\u2224", "\\nmid", true);
defineSymbol(math, ams, rel, "\u22AC", "\\nvdash", true);
defineSymbol(math, ams, rel, "\u22AD", "\\nvDash", true);
defineSymbol(math, ams, rel, "\u22EA", "\\ntriangleleft");
defineSymbol(math, ams, rel, "\u22EC", "\\ntrianglelefteq", true);
defineSymbol(math, ams, rel, "\u228A", "\\subsetneq", true);
defineSymbol(math, ams, rel, "\uE01A", "\\@varsubsetneq");
defineSymbol(math, ams, rel, "\u2ACB", "\\subsetneqq", true);
defineSymbol(math, ams, rel, "\uE017", "\\@varsubsetneqq");
defineSymbol(math, ams, rel, "\u226F", "\\ngtr", true);
defineSymbol(math, ams, rel, "\uE00F", "\\@ngeqslant");
defineSymbol(math, ams, rel, "\uE00E", "\\@ngeqq");
defineSymbol(math, ams, rel, "\u2A88", "\\gneq", true);
defineSymbol(math, ams, rel, "\u2269", "\\gneqq", true);
defineSymbol(math, ams, rel, "\uE00D", "\\@gvertneqq");
defineSymbol(math, ams, rel, "\u22E7", "\\gnsim", true);
defineSymbol(math, ams, rel, "\u2A8A", "\\gnapprox", true);
defineSymbol(math, ams, rel, "\u2281", "\\nsucc", true);
defineSymbol(math, ams, rel, "\u22E1", "\\nsucceq", true);
defineSymbol(math, ams, rel, "\u22E9", "\\succnsim", true);
defineSymbol(math, ams, rel, "\u2ABA", "\\succnapprox", true);
defineSymbol(math, ams, rel, "\u2246", "\\ncong", true);
defineSymbol(math, ams, rel, "\uE007", "\\@nshortparallel");
defineSymbol(math, ams, rel, "\u2226", "\\nparallel", true);
defineSymbol(math, ams, rel, "\u22AF", "\\nVDash", true);
defineSymbol(math, ams, rel, "\u22EB", "\\ntriangleright");
defineSymbol(math, ams, rel, "\u22ED", "\\ntrianglerighteq", true);
defineSymbol(math, ams, rel, "\uE018", "\\@nsupseteqq");
defineSymbol(math, ams, rel, "\u228B", "\\supsetneq", true);
defineSymbol(math, ams, rel, "\uE01B", "\\@varsupsetneq");
defineSymbol(math, ams, rel, "\u2ACC", "\\supsetneqq", true);
defineSymbol(math, ams, rel, "\uE019", "\\@varsupsetneqq");
defineSymbol(math, ams, rel, "\u22AE", "\\nVdash", true);
defineSymbol(math, ams, rel, "\u2AB5", "\\precneqq", true);
defineSymbol(math, ams, rel, "\u2AB6", "\\succneqq", true);
defineSymbol(math, ams, rel, "\uE016", "\\@nsubseteqq");
defineSymbol(math, ams, bin, "\u22B4", "\\unlhd");
defineSymbol(math, ams, bin, "\u22B5", "\\unrhd");
defineSymbol(math, ams, rel, "\u219A", "\\nleftarrow", true);
defineSymbol(math, ams, rel, "\u219B", "\\nrightarrow", true);
defineSymbol(math, ams, rel, "\u21CD", "\\nLeftarrow", true);
defineSymbol(math, ams, rel, "\u21CF", "\\nRightarrow", true);
defineSymbol(math, ams, rel, "\u21AE", "\\nleftrightarrow", true);
defineSymbol(math, ams, rel, "\u21CE", "\\nLeftrightarrow", true);
defineSymbol(math, ams, rel, "\u25B3", "\\vartriangle");
defineSymbol(math, ams, textord, "\u210F", "\\hslash");
defineSymbol(math, ams, textord, "\u25BD", "\\triangledown");
defineSymbol(math, ams, textord, "\u25CA", "\\lozenge");
defineSymbol(math, ams, textord, "\u24C8", "\\circledS");
defineSymbol(math, ams, textord, "\xAE", "\\circledR");
defineSymbol(text2, ams, textord, "\xAE", "\\circledR");
defineSymbol(math, ams, textord, "\u2221", "\\measuredangle", true);
defineSymbol(math, ams, textord, "\u2204", "\\nexists");
defineSymbol(math, ams, textord, "\u2127", "\\mho");
defineSymbol(math, ams, textord, "\u2132", "\\Finv", true);
defineSymbol(math, ams, textord, "\u2141", "\\Game", true);
defineSymbol(math, ams, textord, "\u2035", "\\backprime");
defineSymbol(math, ams, textord, "\u25B2", "\\blacktriangle");
defineSymbol(math, ams, textord, "\u25BC", "\\blacktriangledown");
defineSymbol(math, ams, textord, "\u25A0", "\\blacksquare");
defineSymbol(math, ams, textord, "\u29EB", "\\blacklozenge");
defineSymbol(math, ams, textord, "\u2605", "\\bigstar");
defineSymbol(math, ams, textord, "\u2222", "\\sphericalangle", true);
defineSymbol(math, ams, textord, "\u2201", "\\complement", true);
defineSymbol(math, ams, textord, "\xF0", "\\eth", true);
defineSymbol(text2, main, textord, "\xF0", "\xF0");
defineSymbol(math, ams, textord, "\u2571", "\\diagup");
defineSymbol(math, ams, textord, "\u2572", "\\diagdown");
defineSymbol(math, ams, textord, "\u25A1", "\\square");
defineSymbol(math, ams, textord, "\u25A1", "\\Box");
defineSymbol(math, ams, textord, "\u25CA", "\\Diamond");
defineSymbol(math, ams, textord, "\xA5", "\\yen", true);
defineSymbol(text2, ams, textord, "\xA5", "\\yen", true);
defineSymbol(math, ams, textord, "\u2713", "\\checkmark", true);
defineSymbol(text2, ams, textord, "\u2713", "\\checkmark");
defineSymbol(math, ams, textord, "\u2136", "\\beth", true);
defineSymbol(math, ams, textord, "\u2138", "\\daleth", true);
defineSymbol(math, ams, textord, "\u2137", "\\gimel", true);
defineSymbol(math, ams, textord, "\u03DD", "\\digamma", true);
defineSymbol(math, ams, textord, "\u03F0", "\\varkappa");
defineSymbol(math, ams, open, "\u250C", "\\@ulcorner", true);
defineSymbol(math, ams, close, "\u2510", "\\@urcorner", true);
defineSymbol(math, ams, open, "\u2514", "\\@llcorner", true);
defineSymbol(math, ams, close, "\u2518", "\\@lrcorner", true);
defineSymbol(math, ams, rel, "\u2266", "\\leqq", true);
defineSymbol(math, ams, rel, "\u2A7D", "\\leqslant", true);
defineSymbol(math, ams, rel, "\u2A95", "\\eqslantless", true);
defineSymbol(math, ams, rel, "\u2272", "\\lesssim", true);
defineSymbol(math, ams, rel, "\u2A85", "\\lessapprox", true);
defineSymbol(math, ams, rel, "\u224A", "\\approxeq", true);
defineSymbol(math, ams, bin, "\u22D6", "\\lessdot");
defineSymbol(math, ams, rel, "\u22D8", "\\lll", true);
defineSymbol(math, ams, rel, "\u2276", "\\lessgtr", true);
defineSymbol(math, ams, rel, "\u22DA", "\\lesseqgtr", true);
defineSymbol(math, ams, rel, "\u2A8B", "\\lesseqqgtr", true);
defineSymbol(math, ams, rel, "\u2251", "\\doteqdot");
defineSymbol(math, ams, rel, "\u2253", "\\risingdotseq", true);
defineSymbol(math, ams, rel, "\u2252", "\\fallingdotseq", true);
defineSymbol(math, ams, rel, "\u223D", "\\backsim", true);
defineSymbol(math, ams, rel, "\u22CD", "\\backsimeq", true);
defineSymbol(math, ams, rel, "\u2AC5", "\\subseteqq", true);
defineSymbol(math, ams, rel, "\u22D0", "\\Subset", true);
defineSymbol(math, ams, rel, "\u228F", "\\sqsubset", true);
defineSymbol(math, ams, rel, "\u227C", "\\preccurlyeq", true);
defineSymbol(math, ams, rel, "\u22DE", "\\curlyeqprec", true);
defineSymbol(math, ams, rel, "\u227E", "\\precsim", true);
defineSymbol(math, ams, rel, "\u2AB7", "\\precapprox", true);
defineSymbol(math, ams, rel, "\u22B2", "\\vartriangleleft");
defineSymbol(math, ams, rel, "\u22B4", "\\trianglelefteq");
defineSymbol(math, ams, rel, "\u22A8", "\\vDash", true);
defineSymbol(math, ams, rel, "\u22AA", "\\Vvdash", true);
defineSymbol(math, ams, rel, "\u2323", "\\smallsmile");
defineSymbol(math, ams, rel, "\u2322", "\\smallfrown");
defineSymbol(math, ams, rel, "\u224F", "\\bumpeq", true);
defineSymbol(math, ams, rel, "\u224E", "\\Bumpeq", true);
defineSymbol(math, ams, rel, "\u2267", "\\geqq", true);
defineSymbol(math, ams, rel, "\u2A7E", "\\geqslant", true);
defineSymbol(math, ams, rel, "\u2A96", "\\eqslantgtr", true);
defineSymbol(math, ams, rel, "\u2273", "\\gtrsim", true);
defineSymbol(math, ams, rel, "\u2A86", "\\gtrapprox", true);
defineSymbol(math, ams, bin, "\u22D7", "\\gtrdot");
defineSymbol(math, ams, rel, "\u22D9", "\\ggg", true);
defineSymbol(math, ams, rel, "\u2277", "\\gtrless", true);
defineSymbol(math, ams, rel, "\u22DB", "\\gtreqless", true);
defineSymbol(math, ams, rel, "\u2A8C", "\\gtreqqless", true);
defineSymbol(math, ams, rel, "\u2256", "\\eqcirc", true);
defineSymbol(math, ams, rel, "\u2257", "\\circeq", true);
defineSymbol(math, ams, rel, "\u225C", "\\triangleq", true);
defineSymbol(math, ams, rel, "\u223C", "\\thicksim");
defineSymbol(math, ams, rel, "\u2248", "\\thickapprox");
defineSymbol(math, ams, rel, "\u2AC6", "\\supseteqq", true);
defineSymbol(math, ams, rel, "\u22D1", "\\Supset", true);
defineSymbol(math, ams, rel, "\u2290", "\\sqsupset", true);
defineSymbol(math, ams, rel, "\u227D", "\\succcurlyeq", true);
defineSymbol(math, ams, rel, "\u22DF", "\\curlyeqsucc", true);
defineSymbol(math, ams, rel, "\u227F", "\\succsim", true);
defineSymbol(math, ams, rel, "\u2AB8", "\\succapprox", true);
defineSymbol(math, ams, rel, "\u22B3", "\\vartriangleright");
defineSymbol(math, ams, rel, "\u22B5", "\\trianglerighteq");
defineSymbol(math, ams, rel, "\u22A9", "\\Vdash", true);
defineSymbol(math, ams, rel, "\u2223", "\\shortmid");
defineSymbol(math, ams, rel, "\u2225", "\\shortparallel");
defineSymbol(math, ams, rel, "\u226C", "\\between", true);
defineSymbol(math, ams, rel, "\u22D4", "\\pitchfork", true);
defineSymbol(math, ams, rel, "\u221D", "\\varpropto");
defineSymbol(math, ams, rel, "\u25C0", "\\blacktriangleleft");
defineSymbol(math, ams, rel, "\u2234", "\\therefore", true);
defineSymbol(math, ams, rel, "\u220D", "\\backepsilon");
defineSymbol(math, ams, rel, "\u25B6", "\\blacktriangleright");
defineSymbol(math, ams, rel, "\u2235", "\\because", true);
defineSymbol(math, ams, rel, "\u22D8", "\\llless");
defineSymbol(math, ams, rel, "\u22D9", "\\gggtr");
defineSymbol(math, ams, bin, "\u22B2", "\\lhd");
defineSymbol(math, ams, bin, "\u22B3", "\\rhd");
defineSymbol(math, ams, rel, "\u2242", "\\eqsim", true);
defineSymbol(math, main, rel, "\u22C8", "\\Join");
defineSymbol(math, ams, rel, "\u2251", "\\Doteq", true);
defineSymbol(math, ams, bin, "\u2214", "\\dotplus", true);
defineSymbol(math, ams, bin, "\u2216", "\\smallsetminus");
defineSymbol(math, ams, bin, "\u22D2", "\\Cap", true);
defineSymbol(math, ams, bin, "\u22D3", "\\Cup", true);
defineSymbol(math, ams, bin, "\u2A5E", "\\doublebarwedge", true);
defineSymbol(math, ams, bin, "\u229F", "\\boxminus", true);
defineSymbol(math, ams, bin, "\u229E", "\\boxplus", true);
defineSymbol(math, ams, bin, "\u22C7", "\\divideontimes", true);
defineSymbol(math, ams, bin, "\u22C9", "\\ltimes", true);
defineSymbol(math, ams, bin, "\u22CA", "\\rtimes", true);
defineSymbol(math, ams, bin, "\u22CB", "\\leftthreetimes", true);
defineSymbol(math, ams, bin, "\u22CC", "\\rightthreetimes", true);
defineSymbol(math, ams, bin, "\u22CF", "\\curlywedge", true);
defineSymbol(math, ams, bin, "\u22CE", "\\curlyvee", true);
defineSymbol(math, ams, bin, "\u229D", "\\circleddash", true);
defineSymbol(math, ams, bin, "\u229B", "\\circledast", true);
defineSymbol(math, ams, bin, "\u22C5", "\\centerdot");
defineSymbol(math, ams, bin, "\u22BA", "\\intercal", true);
defineSymbol(math, ams, bin, "\u22D2", "\\doublecap");
defineSymbol(math, ams, bin, "\u22D3", "\\doublecup");
defineSymbol(math, ams, bin, "\u22A0", "\\boxtimes", true);
defineSymbol(math, ams, rel, "\u21E2", "\\dashrightarrow", true);
defineSymbol(math, ams, rel, "\u21E0", "\\dashleftarrow", true);
defineSymbol(math, ams, rel, "\u21C7", "\\leftleftarrows", true);
defineSymbol(math, ams, rel, "\u21C6", "\\leftrightarrows", true);
defineSymbol(math, ams, rel, "\u21DA", "\\Lleftarrow", true);
defineSymbol(math, ams, rel, "\u219E", "\\twoheadleftarrow", true);
defineSymbol(math, ams, rel, "\u21A2", "\\leftarrowtail", true);
defineSymbol(math, ams, rel, "\u21AB", "\\looparrowleft", true);
defineSymbol(math, ams, rel, "\u21CB", "\\leftrightharpoons", true);
defineSymbol(math, ams, rel, "\u21B6", "\\curvearrowleft", true);
defineSymbol(math, ams, rel, "\u21BA", "\\circlearrowleft", true);
defineSymbol(math, ams, rel, "\u21B0", "\\Lsh", true);
defineSymbol(math, ams, rel, "\u21C8", "\\upuparrows", true);
defineSymbol(math, ams, rel, "\u21BF", "\\upharpoonleft", true);
defineSymbol(math, ams, rel, "\u21C3", "\\downharpoonleft", true);
defineSymbol(math, main, rel, "\u22B6", "\\origof", true);
defineSymbol(math, main, rel, "\u22B7", "\\imageof", true);
defineSymbol(math, ams, rel, "\u22B8", "\\multimap", true);
defineSymbol(math, ams, rel, "\u21AD", "\\leftrightsquigarrow", true);
defineSymbol(math, ams, rel, "\u21C9", "\\rightrightarrows", true);
defineSymbol(math, ams, rel, "\u21C4", "\\rightleftarrows", true);
defineSymbol(math, ams, rel, "\u21A0", "\\twoheadrightarrow", true);
defineSymbol(math, ams, rel, "\u21A3", "\\rightarrowtail", true);
defineSymbol(math, ams, rel, "\u21AC", "\\looparrowright", true);
defineSymbol(math, ams, rel, "\u21B7", "\\curvearrowright", true);
defineSymbol(math, ams, rel, "\u21BB", "\\circlearrowright", true);
defineSymbol(math, ams, rel, "\u21B1", "\\Rsh", true);
defineSymbol(math, ams, rel, "\u21CA", "\\downdownarrows", true);
defineSymbol(math, ams, rel, "\u21BE", "\\upharpoonright", true);
defineSymbol(math, ams, rel, "\u21C2", "\\downharpoonright", true);
defineSymbol(math, ams, rel, "\u21DD", "\\rightsquigarrow", true);
defineSymbol(math, ams, rel, "\u21DD", "\\leadsto");
defineSymbol(math, ams, rel, "\u21DB", "\\Rrightarrow", true);
defineSymbol(math, ams, rel, "\u21BE", "\\restriction");
defineSymbol(math, main, textord, "\u2018", "`");
defineSymbol(math, main, textord, "$", "\\$");
defineSymbol(text2, main, textord, "$", "\\$");
defineSymbol(text2, main, textord, "$", "\\textdollar");
defineSymbol(math, main, textord, "%", "\\%");
defineSymbol(text2, main, textord, "%", "\\%");
defineSymbol(math, main, textord, "_", "\\_");
defineSymbol(text2, main, textord, "_", "\\_");
defineSymbol(text2, main, textord, "_", "\\textunderscore");
defineSymbol(math, main, textord, "\u2220", "\\angle", true);
defineSymbol(math, main, textord, "\u221E", "\\infty", true);
defineSymbol(math, main, textord, "\u2032", "\\prime");
defineSymbol(math, main, textord, "\u25B3", "\\triangle");
defineSymbol(math, main, textord, "\u0393", "\\Gamma", true);
defineSymbol(math, main, textord, "\u0394", "\\Delta", true);
defineSymbol(math, main, textord, "\u0398", "\\Theta", true);
defineSymbol(math, main, textord, "\u039B", "\\Lambda", true);
defineSymbol(math, main, textord, "\u039E", "\\Xi", true);
defineSymbol(math, main, textord, "\u03A0", "\\Pi", true);
defineSymbol(math, main, textord, "\u03A3", "\\Sigma", true);
defineSymbol(math, main, textord, "\u03A5", "\\Upsilon", true);
defineSymbol(math, main, textord, "\u03A6", "\\Phi", true);
defineSymbol(math, main, textord, "\u03A8", "\\Psi", true);
defineSymbol(math, main, textord, "\u03A9", "\\Omega", true);
defineSymbol(math, main, textord, "A", "\u0391");
defineSymbol(math, main, textord, "B", "\u0392");
defineSymbol(math, main, textord, "E", "\u0395");
defineSymbol(math, main, textord, "Z", "\u0396");
defineSymbol(math, main, textord, "H", "\u0397");
defineSymbol(math, main, textord, "I", "\u0399");
defineSymbol(math, main, textord, "K", "\u039A");
defineSymbol(math, main, textord, "M", "\u039C");
defineSymbol(math, main, textord, "N", "\u039D");
defineSymbol(math, main, textord, "O", "\u039F");
defineSymbol(math, main, textord, "P", "\u03A1");
defineSymbol(math, main, textord, "T", "\u03A4");
defineSymbol(math, main, textord, "X", "\u03A7");
defineSymbol(math, main, textord, "\xAC", "\\neg", true);
defineSymbol(math, main, textord, "\xAC", "\\lnot");
defineSymbol(math, main, textord, "\u22A4", "\\top");
defineSymbol(math, main, textord, "\u22A5", "\\bot");
defineSymbol(math, main, textord, "\u2205", "\\emptyset");
defineSymbol(math, ams, textord, "\u2205", "\\varnothing");
defineSymbol(math, main, mathord, "\u03B1", "\\alpha", true);
defineSymbol(math, main, mathord, "\u03B2", "\\beta", true);
defineSymbol(math, main, mathord, "\u03B3", "\\gamma", true);
defineSymbol(math, main, mathord, "\u03B4", "\\delta", true);
defineSymbol(math, main, mathord, "\u03F5", "\\epsilon", true);
defineSymbol(math, main, mathord, "\u03B6", "\\zeta", true);
defineSymbol(math, main, mathord, "\u03B7", "\\eta", true);
defineSymbol(math, main, mathord, "\u03B8", "\\theta", true);
defineSymbol(math, main, mathord, "\u03B9", "\\iota", true);
defineSymbol(math, main, mathord, "\u03BA", "\\kappa", true);
defineSymbol(math, main, mathord, "\u03BB", "\\lambda", true);
defineSymbol(math, main, mathord, "\u03BC", "\\mu", true);
defineSymbol(math, main, mathord, "\u03BD", "\\nu", true);
defineSymbol(math, main, mathord, "\u03BE", "\\xi", true);
defineSymbol(math, main, mathord, "\u03BF", "\\omicron", true);
defineSymbol(math, main, mathord, "\u03C0", "\\pi", true);
defineSymbol(math, main, mathord, "\u03C1", "\\rho", true);
defineSymbol(math, main, mathord, "\u03C3", "\\sigma", true);
defineSymbol(math, main, mathord, "\u03C4", "\\tau", true);
defineSymbol(math, main, mathord, "\u03C5", "\\upsilon", true);
defineSymbol(math, main, mathord, "\u03D5", "\\phi", true);
defineSymbol(math, main, mathord, "\u03C7", "\\chi", true);
defineSymbol(math, main, mathord, "\u03C8", "\\psi", true);
defineSymbol(math, main, mathord, "\u03C9", "\\omega", true);
defineSymbol(math, main, mathord, "\u03B5", "\\varepsilon", true);
defineSymbol(math, main, mathord, "\u03D1", "\\vartheta", true);
defineSymbol(math, main, mathord, "\u03D6", "\\varpi", true);
defineSymbol(math, main, mathord, "\u03F1", "\\varrho", true);
defineSymbol(math, main, mathord, "\u03C2", "\\varsigma", true);
defineSymbol(math, main, mathord, "\u03C6", "\\varphi", true);
defineSymbol(math, main, bin, "\u2217", "*", true);
defineSymbol(math, main, bin, "+", "+");
defineSymbol(math, main, bin, "\u2212", "-", true);
defineSymbol(math, main, bin, "\u22C5", "\\cdot", true);
defineSymbol(math, main, bin, "\u2218", "\\circ", true);
defineSymbol(math, main, bin, "\xF7", "\\div", true);
defineSymbol(math, main, bin, "\xB1", "\\pm", true);
defineSymbol(math, main, bin, "\xD7", "\\times", true);
defineSymbol(math, main, bin, "\u2229", "\\cap", true);
defineSymbol(math, main, bin, "\u222A", "\\cup", true);
defineSymbol(math, main, bin, "\u2216", "\\setminus", true);
defineSymbol(math, main, bin, "\u2227", "\\land");
defineSymbol(math, main, bin, "\u2228", "\\lor");
defineSymbol(math, main, bin, "\u2227", "\\wedge", true);
defineSymbol(math, main, bin, "\u2228", "\\vee", true);
defineSymbol(math, main, textord, "\u221A", "\\surd");
defineSymbol(math, main, open, "\u27E8", "\\langle", true);
defineSymbol(math, main, open, "\u2223", "\\lvert");
defineSymbol(math, main, open, "\u2225", "\\lVert");
defineSymbol(math, main, close, "?", "?");
defineSymbol(math, main, close, "!", "!");
defineSymbol(math, main, close, "\u27E9", "\\rangle", true);
defineSymbol(math, main, close, "\u2223", "\\rvert");
defineSymbol(math, main, close, "\u2225", "\\rVert");
defineSymbol(math, main, rel, "=", "=");
defineSymbol(math, main, rel, ":", ":");
defineSymbol(math, main, rel, "\u2248", "\\approx", true);
defineSymbol(math, main, rel, "\u2245", "\\cong", true);
defineSymbol(math, main, rel, "\u2265", "\\ge");
defineSymbol(math, main, rel, "\u2265", "\\geq", true);
defineSymbol(math, main, rel, "\u2190", "\\gets");
defineSymbol(math, main, rel, ">", "\\gt", true);
defineSymbol(math, main, rel, "\u2208", "\\in", true);
defineSymbol(math, main, rel, "\uE020", "\\@not");
defineSymbol(math, main, rel, "\u2282", "\\subset", true);
defineSymbol(math, main, rel, "\u2283", "\\supset", true);
defineSymbol(math, main, rel, "\u2286", "\\subseteq", true);
defineSymbol(math, main, rel, "\u2287", "\\supseteq", true);
defineSymbol(math, ams, rel, "\u2288", "\\nsubseteq", true);
defineSymbol(math, ams, rel, "\u2289", "\\nsupseteq", true);
defineSymbol(math, main, rel, "\u22A8", "\\models");
defineSymbol(math, main, rel, "\u2190", "\\leftarrow", true);
defineSymbol(math, main, rel, "\u2264", "\\le");
defineSymbol(math, main, rel, "\u2264", "\\leq", true);
defineSymbol(math, main, rel, "<", "\\lt", true);
defineSymbol(math, main, rel, "\u2192", "\\rightarrow", true);
defineSymbol(math, main, rel, "\u2192", "\\to");
defineSymbol(math, ams, rel, "\u2271", "\\ngeq", true);
defineSymbol(math, ams, rel, "\u2270", "\\nleq", true);
defineSymbol(math, main, spacing, "\xA0", "\\ ");
defineSymbol(math, main, spacing, "\xA0", "\\space");
defineSymbol(math, main, spacing, "\xA0", "\\nobreakspace");
defineSymbol(text2, main, spacing, "\xA0", "\\ ");
defineSymbol(text2, main, spacing, "\xA0", " ");
defineSymbol(text2, main, spacing, "\xA0", "\\space");
defineSymbol(text2, main, spacing, "\xA0", "\\nobreakspace");
defineSymbol(math, main, spacing, "", "\\nobreak");
defineSymbol(math, main, spacing, "", "\\allowbreak");
defineSymbol(math, main, punct, ",", ",");
defineSymbol(math, main, punct, ";", ";");
defineSymbol(math, ams, bin, "\u22BC", "\\barwedge", true);
defineSymbol(math, ams, bin, "\u22BB", "\\veebar", true);
defineSymbol(math, main, bin, "\u2299", "\\odot", true);
defineSymbol(math, main, bin, "\u2295", "\\oplus", true);
defineSymbol(math, main, bin, "\u2297", "\\otimes", true);
defineSymbol(math, main, textord, "\u2202", "\\partial", true);
defineSymbol(math, main, bin, "\u2298", "\\oslash", true);
defineSymbol(math, ams, bin, "\u229A", "\\circledcirc", true);
defineSymbol(math, ams, bin, "\u22A1", "\\boxdot", true);
defineSymbol(math, main, bin, "\u25B3", "\\bigtriangleup");
defineSymbol(math, main, bin, "\u25BD", "\\bigtriangledown");
defineSymbol(math, main, bin, "\u2020", "\\dagger");
defineSymbol(math, main, bin, "\u22C4", "\\diamond");
defineSymbol(math, main, bin, "\u22C6", "\\star");
defineSymbol(math, main, bin, "\u25C3", "\\triangleleft");
defineSymbol(math, main, bin, "\u25B9", "\\triangleright");
defineSymbol(math, main, open, "{", "\\{");
defineSymbol(text2, main, textord, "{", "\\{");
defineSymbol(text2, main, textord, "{", "\\textbraceleft");
defineSymbol(math, main, close, "}", "\\}");
defineSymbol(text2, main, textord, "}", "\\}");
defineSymbol(text2, main, textord, "}", "\\textbraceright");
defineSymbol(math, main, open, "{", "\\lbrace");
defineSymbol(math, main, close, "}", "\\rbrace");
defineSymbol(math, main, open, "[", "\\lbrack", true);
defineSymbol(text2, main, textord, "[", "\\lbrack", true);
defineSymbol(math, main, close, "]", "\\rbrack", true);
defineSymbol(text2, main, textord, "]", "\\rbrack", true);
defineSymbol(math, main, open, "(", "\\lparen", true);
defineSymbol(math, main, close, ")", "\\rparen", true);
defineSymbol(text2, main, textord, "<", "\\textless", true);
defineSymbol(text2, main, textord, ">", "\\textgreater", true);
defineSymbol(math, main, open, "\u230A", "\\lfloor", true);
defineSymbol(math, main, close, "\u230B", "\\rfloor", true);
defineSymbol(math, main, open, "\u2308", "\\lceil", true);
defineSymbol(math, main, close, "\u2309", "\\rceil", true);
defineSymbol(math, main, textord, "\\", "\\backslash");
defineSymbol(math, main, textord, "\u2223", "|");
defineSymbol(math, main, textord, "\u2223", "\\vert");
defineSymbol(text2, main, textord, "|", "\\textbar", true);
defineSymbol(math, main, textord, "\u2225", "\\|");
defineSymbol(math, main, textord, "\u2225", "\\Vert");
defineSymbol(text2, main, textord, "\u2225", "\\textbardbl");
defineSymbol(text2, main, textord, "~", "\\textasciitilde");
defineSymbol(text2, main, textord, "\\", "\\textbackslash");
defineSymbol(text2, main, textord, "^", "\\textasciicircum");
defineSymbol(math, main, rel, "\u2191", "\\uparrow", true);
defineSymbol(math, main, rel, "\u21D1", "\\Uparrow", true);
defineSymbol(math, main, rel, "\u2193", "\\downarrow", true);
defineSymbol(math, main, rel, "\u21D3", "\\Downarrow", true);
defineSymbol(math, main, rel, "\u2195", "\\updownarrow", true);
defineSymbol(math, main, rel, "\u21D5", "\\Updownarrow", true);
defineSymbol(math, main, op, "\u2210", "\\coprod");
defineSymbol(math, main, op, "\u22C1", "\\bigvee");
defineSymbol(math, main, op, "\u22C0", "\\bigwedge");
defineSymbol(math, main, op, "\u2A04", "\\biguplus");
defineSymbol(math, main, op, "\u22C2", "\\bigcap");
defineSymbol(math, main, op, "\u22C3", "\\bigcup");
defineSymbol(math, main, op, "\u222B", "\\int");
defineSymbol(math, main, op, "\u222B", "\\intop");
defineSymbol(math, main, op, "\u222C", "\\iint");
defineSymbol(math, main, op, "\u222D", "\\iiint");
defineSymbol(math, main, op, "\u220F", "\\prod");
defineSymbol(math, main, op, "\u2211", "\\sum");
defineSymbol(math, main, op, "\u2A02", "\\bigotimes");
defineSymbol(math, main, op, "\u2A01", "\\bigoplus");
defineSymbol(math, main, op, "\u2A00", "\\bigodot");
defineSymbol(math, main, op, "\u222E", "\\oint");
defineSymbol(math, main, op, "\u222F", "\\oiint");
defineSymbol(math, main, op, "\u2230", "\\oiiint");
defineSymbol(math, main, op, "\u2A06", "\\bigsqcup");
defineSymbol(math, main, op, "\u222B", "\\smallint");
defineSymbol(text2, main, inner, "\u2026", "\\textellipsis");
defineSymbol(math, main, inner, "\u2026", "\\mathellipsis");
defineSymbol(text2, main, inner, "\u2026", "\\ldots", true);
defineSymbol(math, main, inner, "\u2026", "\\ldots", true);
defineSymbol(math, main, inner, "\u22EF", "\\@cdots", true);
defineSymbol(math, main, inner, "\u22F1", "\\ddots", true);
defineSymbol(math, main, textord, "\u22EE", "\\varvdots");
defineSymbol(text2, main, textord, "\u22EE", "\\varvdots");
defineSymbol(math, main, accent, "\u02CA", "\\acute");
defineSymbol(math, main, accent, "\u02CB", "\\grave");
defineSymbol(math, main, accent, "\xA8", "\\ddot");
defineSymbol(math, main, accent, "~", "\\tilde");
defineSymbol(math, main, accent, "\u02C9", "\\bar");
defineSymbol(math, main, accent, "\u02D8", "\\breve");
defineSymbol(math, main, accent, "\u02C7", "\\check");
defineSymbol(math, main, accent, "^", "\\hat");
defineSymbol(math, main, accent, "\u20D7", "\\vec");
defineSymbol(math, main, accent, "\u02D9", "\\dot");
defineSymbol(math, main, accent, "\u02DA", "\\mathring");
defineSymbol(math, main, mathord, "\uE131", "\\@imath");
defineSymbol(math, main, mathord, "\uE237", "\\@jmath");
defineSymbol(math, main, textord, "\u0131", "\u0131");
defineSymbol(math, main, textord, "\u0237", "\u0237");
defineSymbol(text2, main, textord, "\u0131", "\\i", true);
defineSymbol(text2, main, textord, "\u0237", "\\j", true);
defineSymbol(text2, main, textord, "\xDF", "\\ss", true);
defineSymbol(text2, main, textord, "\xE6", "\\ae", true);
defineSymbol(text2, main, textord, "\u0153", "\\oe", true);
defineSymbol(text2, main, textord, "\xF8", "\\o", true);
defineSymbol(text2, main, textord, "\xC6", "\\AE", true);
defineSymbol(text2, main, textord, "\u0152", "\\OE", true);
defineSymbol(text2, main, textord, "\xD8", "\\O", true);
defineSymbol(text2, main, accent, "\u02CA", "\\'");
defineSymbol(text2, main, accent, "\u02CB", "\\`");
defineSymbol(text2, main, accent, "\u02C6", "\\^");
defineSymbol(text2, main, accent, "\u02DC", "\\~");
defineSymbol(text2, main, accent, "\u02C9", "\\=");
defineSymbol(text2, main, accent, "\u02D8", "\\u");
defineSymbol(text2, main, accent, "\u02D9", "\\.");
defineSymbol(text2, main, accent, "\xB8", "\\c");
defineSymbol(text2, main, accent, "\u02DA", "\\r");
defineSymbol(text2, main, accent, "\u02C7", "\\v");
defineSymbol(text2, main, accent, "\xA8", '\\"');
defineSymbol(text2, main, accent, "\u02DD", "\\H");
defineSymbol(text2, main, accent, "\u25EF", "\\textcircled");
var ligatures = {
  "--": true,
  "---": true,
  "``": true,
  "''": true
};
defineSymbol(text2, main, textord, "\u2013", "--", true);
defineSymbol(text2, main, textord, "\u2013", "\\textendash");
defineSymbol(text2, main, textord, "\u2014", "---", true);
defineSymbol(text2, main, textord, "\u2014", "\\textemdash");
defineSymbol(text2, main, textord, "\u2018", "`", true);
defineSymbol(text2, main, textord, "\u2018", "\\textquoteleft");
defineSymbol(text2, main, textord, "\u2019", "'", true);
defineSymbol(text2, main, textord, "\u2019", "\\textquoteright");
defineSymbol(text2, main, textord, "\u201C", "``", true);
defineSymbol(text2, main, textord, "\u201C", "\\textquotedblleft");
defineSymbol(text2, main, textord, "\u201D", "''", true);
defineSymbol(text2, main, textord, "\u201D", "\\textquotedblright");
defineSymbol(math, main, textord, "\xB0", "\\degree", true);
defineSymbol(text2, main, textord, "\xB0", "\\degree");
defineSymbol(text2, main, textord, "\xB0", "\\textdegree", true);
defineSymbol(math, main, textord, "\xA3", "\\pounds");
defineSymbol(math, main, textord, "\xA3", "\\mathsterling", true);
defineSymbol(text2, main, textord, "\xA3", "\\pounds");
defineSymbol(text2, main, textord, "\xA3", "\\textsterling", true);
defineSymbol(math, ams, textord, "\u2720", "\\maltese");
defineSymbol(text2, ams, textord, "\u2720", "\\maltese");
var mathTextSymbols = '0123456789/@."';
for (i = 0; i < mathTextSymbols.length; i++) {
  ch = mathTextSymbols.charAt(i);
  defineSymbol(math, main, textord, ch, ch);
}
var ch;
var i;
var textSymbols = '0123456789!@*()-=+";:?/.,';
for (_i = 0; _i < textSymbols.length; _i++) {
  _ch = textSymbols.charAt(_i);
  defineSymbol(text2, main, textord, _ch, _ch);
}
var _ch;
var _i;
var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
for (_i2 = 0; _i2 < letters.length; _i2++) {
  _ch2 = letters.charAt(_i2);
  defineSymbol(math, main, mathord, _ch2, _ch2);
  defineSymbol(text2, main, textord, _ch2, _ch2);
}
var _ch2;
var _i2;
defineSymbol(math, ams, textord, "C", "\u2102");
defineSymbol(text2, ams, textord, "C", "\u2102");
defineSymbol(math, ams, textord, "H", "\u210D");
defineSymbol(text2, ams, textord, "H", "\u210D");
defineSymbol(math, ams, textord, "N", "\u2115");
defineSymbol(text2, ams, textord, "N", "\u2115");
defineSymbol(math, ams, textord, "P", "\u2119");
defineSymbol(text2, ams, textord, "P", "\u2119");
defineSymbol(math, ams, textord, "Q", "\u211A");
defineSymbol(text2, ams, textord, "Q", "\u211A");
defineSymbol(math, ams, textord, "R", "\u211D");
defineSymbol(text2, ams, textord, "R", "\u211D");
defineSymbol(math, ams, textord, "Z", "\u2124");
defineSymbol(text2, ams, textord, "Z", "\u2124");
defineSymbol(math, main, mathord, "h", "\u210E");
defineSymbol(text2, main, mathord, "h", "\u210E");
var wideChar;
for (_i3 = 0; _i3 < letters.length; _i3++) {
  _ch3 = letters.charAt(_i3);
  wideChar = String.fromCharCode(55349, 56320 + _i3);
  defineSymbol(math, main, mathord, _ch3, wideChar);
  defineSymbol(text2, main, textord, _ch3, wideChar);
  wideChar = String.fromCharCode(55349, 56372 + _i3);
  defineSymbol(math, main, mathord, _ch3, wideChar);
  defineSymbol(text2, main, textord, _ch3, wideChar);
  wideChar = String.fromCharCode(55349, 56424 + _i3);
  defineSymbol(math, main, mathord, _ch3, wideChar);
  defineSymbol(text2, main, textord, _ch3, wideChar);
  wideChar = String.fromCharCode(55349, 56580 + _i3);
  defineSymbol(math, main, mathord, _ch3, wideChar);
  defineSymbol(text2, main, textord, _ch3, wideChar);
  wideChar = String.fromCharCode(55349, 56684 + _i3);
  defineSymbol(math, main, mathord, _ch3, wideChar);
  defineSymbol(text2, main, textord, _ch3, wideChar);
  wideChar = String.fromCharCode(55349, 56736 + _i3);
  defineSymbol(math, main, mathord, _ch3, wideChar);
  defineSymbol(text2, main, textord, _ch3, wideChar);
  wideChar = String.fromCharCode(55349, 56788 + _i3);
  defineSymbol(math, main, mathord, _ch3, wideChar);
  defineSymbol(text2, main, textord, _ch3, wideChar);
  wideChar = String.fromCharCode(55349, 56840 + _i3);
  defineSymbol(math, main, mathord, _ch3, wideChar);
  defineSymbol(text2, main, textord, _ch3, wideChar);
  wideChar = String.fromCharCode(55349, 56944 + _i3);
  defineSymbol(math, main, mathord, _ch3, wideChar);
  defineSymbol(text2, main, textord, _ch3, wideChar);
  if (_i3 < 26) {
    wideChar = String.fromCharCode(55349, 56632 + _i3);
    defineSymbol(math, main, mathord, _ch3, wideChar);
    defineSymbol(text2, main, textord, _ch3, wideChar);
    wideChar = String.fromCharCode(55349, 56476 + _i3);
    defineSymbol(math, main, mathord, _ch3, wideChar);
    defineSymbol(text2, main, textord, _ch3, wideChar);
  }
}
var _ch3;
var _i3;
wideChar = String.fromCharCode(55349, 56668);
defineSymbol(math, main, mathord, "k", wideChar);
defineSymbol(text2, main, textord, "k", wideChar);
for (_i4 = 0; _i4 < 10; _i4++) {
  _ch4 = _i4.toString();
  wideChar = String.fromCharCode(55349, 57294 + _i4);
  defineSymbol(math, main, mathord, _ch4, wideChar);
  defineSymbol(text2, main, textord, _ch4, wideChar);
  wideChar = String.fromCharCode(55349, 57314 + _i4);
  defineSymbol(math, main, mathord, _ch4, wideChar);
  defineSymbol(text2, main, textord, _ch4, wideChar);
  wideChar = String.fromCharCode(55349, 57324 + _i4);
  defineSymbol(math, main, mathord, _ch4, wideChar);
  defineSymbol(text2, main, textord, _ch4, wideChar);
  wideChar = String.fromCharCode(55349, 57334 + _i4);
  defineSymbol(math, main, mathord, _ch4, wideChar);
  defineSymbol(text2, main, textord, _ch4, wideChar);
}
var _ch4;
var _i4;
var extraLatin = "\xD0\xDE\xFE";
for (_i5 = 0; _i5 < extraLatin.length; _i5++) {
  _ch5 = extraLatin.charAt(_i5);
  defineSymbol(math, main, mathord, _ch5, _ch5);
  defineSymbol(text2, main, textord, _ch5, _ch5);
}
var _ch5;
var _i5;
var boldUpright = {
  mathClass: "mathbf",
  textClass: "textbf",
  font: "Main-Bold"
};
var italic = {
  mathClass: "mathnormal",
  textClass: "textit",
  font: "Math-Italic"
};
var boldItalic = {
  mathClass: "boldsymbol",
  textClass: "boldsymbol",
  font: "Main-BoldItalic"
};
var script = {
  mathClass: "mathscr",
  textClass: "textscr",
  font: "Script-Regular"
};
var noFont = {
  mathClass: "",
  textClass: "",
  font: ""
};
var fraktur = {
  mathClass: "mathfrak",
  textClass: "textfrak",
  font: "Fraktur-Regular"
};
var doubleStruck = {
  mathClass: "mathbb",
  textClass: "textbb",
  font: "AMS-Regular"
};
var boldFraktur = {
  mathClass: "mathboldfrak",
  textClass: "textboldfrak",
  font: "Fraktur-Regular"
};
var sansSerif = {
  mathClass: "mathsf",
  textClass: "textsf",
  font: "SansSerif-Regular"
};
var boldSansSerif = {
  mathClass: "mathboldsf",
  textClass: "textboldsf",
  font: "SansSerif-Bold"
};
var italicSansSerif = {
  mathClass: "mathitsf",
  textClass: "textitsf",
  font: "SansSerif-Italic"
};
var monospace = {
  mathClass: "mathtt",
  textClass: "texttt",
  font: "Typewriter-Regular"
};
var wideLatinLetterData = [
  boldUpright,
  boldUpright,
  // A-Z, a-z
  italic,
  italic,
  // A-Z, a-z
  boldItalic,
  boldItalic,
  // A-Z, a-z
  // Map fancy A-Z letters to script, not calligraphic.
  // This aligns with unicode-math and math fonts (except Cambria Math).
  script,
  noFont,
  // A-Z script, a-z — no font
  noFont,
  noFont,
  // A-Z bold script, a-z bold script — no font
  fraktur,
  fraktur,
  // A-Z, a-z
  doubleStruck,
  doubleStruck,
  // A-Z double-struck, k double-struck
  // Note that we are using a bold font, but font metrics for regular Fraktur.
  boldFraktur,
  boldFraktur,
  // A-Z, a-z
  sansSerif,
  sansSerif,
  // A-Z, a-z
  boldSansSerif,
  boldSansSerif,
  // A-Z, a-z
  italicSansSerif,
  italicSansSerif,
  // A-Z, a-z
  noFont,
  noFont,
  // A-Z bold italic sans, a-z bold italic sans - no font
  monospace,
  monospace
  // A-Z, a-z
];
var wideNumeralData = [
  boldUpright,
  // 0-9
  noFont,
  // 0-9 double-struck. No KaTeX font.
  sansSerif,
  // 0-9
  boldSansSerif,
  // 0-9
  monospace
  // 0-9
];
var wideCharacterFont = (wideChar2) => {
  var H = wideChar2.charCodeAt(0);
  var L2 = wideChar2.charCodeAt(1);
  var codePoint = (H - 55296) * 1024 + (L2 - 56320) + 65536;
  if (119808 <= codePoint && codePoint < 120484) {
    var i2 = Math.floor((codePoint - 119808) / 26);
    return wideLatinLetterData[i2];
  } else if (120782 <= codePoint && codePoint <= 120831) {
    var _i6 = Math.floor((codePoint - 120782) / 10);
    return wideNumeralData[_i6];
  } else if (codePoint === 120485 || codePoint === 120486) {
    return wideLatinLetterData[0];
  } else if (120486 < codePoint && codePoint < 120782) {
    return noFont;
  } else {
    throw new ParseError("Unsupported character: " + wideChar2);
  }
};
function handleStrict(params) {
  var strict = params.strict, errorCode = params.errorCode, errorMsg = params.errorMsg, token = params.token, report = params.report;
  var behavior = strict;
  if (typeof strict === "function") {
    if (report) {
      behavior = strict(errorCode, errorMsg, token);
    } else {
      try {
        behavior = strict(errorCode, errorMsg, token);
      } catch (error) {
        behavior = "error";
      }
    }
  }
  switch (behavior) {
    case true:
    case "error":
      if (report) {
        throw new ParseError("LaTeX-incompatible input and strict mode is set to 'error': " + (errorMsg + " [" + errorCode + "]"), token);
      } else {
        return true;
      }
    case false:
    case "ignore":
      if (!report) {
        return false;
      }
      break;
    case "warn":
    default:
      typeof console !== "undefined" && console.warn("LaTeX-incompatible input and strict mode is set to 'warn': " + (errorMsg + " [" + errorCode + "]"));
      if (!report) {
        return false;
      }
      break;
  }
}
var lookupSymbol = function lookupSymbol2(value, fontName, mode) {
  if (symbols[mode][value]) {
    var replacement = symbols[mode][value].replace;
    if (replacement) {
      value = replacement;
    }
  }
  return {
    value,
    metrics: getCharacterMetrics(value, fontName, mode)
  };
};
var makeSymbol = function makeSymbol2(value, fontName, mode, options, classes) {
  var lookup = lookupSymbol(value, fontName, mode);
  var metrics2 = lookup.metrics;
  value = lookup.value;
  var symbolNode;
  if (metrics2) {
    var italic2 = metrics2.italic;
    if (mode === "text" || options && options.font === "mathit") {
      italic2 = 0;
    }
    symbolNode = new SymbolNode(value, metrics2.height, metrics2.depth, italic2, metrics2.skew, metrics2.width, classes);
  } else {
    handleStrict({
      strict: options.strict,
      errorCode: "symbolNotInFont",
      errorMsg: "No character metrics for '" + value + "' in style '" + fontName + "' and mode '" + mode + "'",
      report: true
    });
    symbolNode = new SymbolNode(value, 0, 0, 0, 0, 0, classes);
  }
  symbolNode.maxFontSize = options.sizeMultiplier;
  if (options.style.isTight()) {
    symbolNode.classes.push("mtight");
  }
  var color = options.getColor();
  if (color) {
    symbolNode.style.color = color;
  }
  return symbolNode;
};
var mathsym = function mathsym2(value, mode, options, classes) {
  if (classes === void 0) {
    classes = [];
  }
  if (options.font === "boldsymbol" && lookupSymbol(value, "Main-Bold", mode).metrics) {
    return makeSymbol(value, "Main-Bold", mode, options, classes.concat(["mathbf"]));
  } else if (value === "\\" || symbols[mode][value].font === "main") {
    return makeSymbol(value, "Main-Regular", mode, options, classes);
  } else {
    return makeSymbol(value, "AMS-Regular", mode, options, classes.concat(["amsrm"]));
  }
};
var boldSymbol = function boldSymbol2(value, mode, type) {
  if (type !== "textord" && lookupSymbol(value, "Math-BoldItalic", mode).metrics) {
    return {
      fontName: "Math-BoldItalic",
      fontClass: "boldsymbol"
    };
  } else {
    return {
      fontName: "Main-Bold",
      fontClass: "mathbf"
    };
  }
};
var makeOrd = function makeOrd2(group, options) {
  var type = group.type === "mathord" ? "mathord" : "textord";
  var mode = group.mode;
  var text3 = group.text;
  var classes = ["mord"];
  var font = options.font, fontFamily = options.fontFamily, fontWeight = options.fontWeight, fontShape = options.fontShape;
  var useFont = mode === "math" || mode === "text" && !!font;
  var fontOrFamily = useFont ? font : fontFamily;
  var wideFontName = "";
  var wideFontClass = "";
  if (text3.charCodeAt(0) === 55349) {
    var wideCharData = wideCharacterFont(text3);
    wideFontName = wideCharData.font;
    wideFontClass = wideCharData[mode + "Class"];
  }
  if (wideFontName) {
    return makeSymbol(text3, wideFontName, mode, options, classes.concat(wideFontClass));
  } else if (fontOrFamily) {
    var fontName;
    var fontClasses;
    if (fontOrFamily === "boldsymbol") {
      var fontData = boldSymbol(text3, mode, type);
      fontName = fontData.fontName;
      fontClasses = [fontData.fontClass];
    } else if (useFont) {
      fontName = fontMap[font].fontName;
      fontClasses = [font];
    } else {
      fontName = retrieveTextFontName(fontFamily, fontWeight, fontShape);
      fontClasses = [fontFamily, fontWeight, fontShape];
    }
    if (lookupSymbol(text3, fontName, mode).metrics) {
      return makeSymbol(text3, fontName, mode, options, classes.concat(fontClasses));
    } else if (Object.prototype.hasOwnProperty.call(ligatures, text3) && fontName.slice(0, 10) === "Typewriter") {
      var parts = [];
      for (var i2 = 0; i2 < text3.length; i2++) {
        parts.push(makeSymbol(text3[i2], fontName, mode, options, classes.concat(fontClasses)));
      }
      return makeFragment(parts);
    }
  }
  if (type === "mathord") {
    return makeSymbol(text3, "Math-Italic", mode, options, classes.concat(["mathnormal"]));
  } else if (type === "textord") {
    var _font = symbols[mode][text3] && symbols[mode][text3].font;
    if (_font === "ams") {
      var _fontName = retrieveTextFontName("amsrm", fontWeight, fontShape);
      return makeSymbol(text3, _fontName, mode, options, classes.concat("amsrm", fontWeight, fontShape));
    } else if (_font === "main" || !_font) {
      var _fontName2 = retrieveTextFontName("textrm", fontWeight, fontShape);
      return makeSymbol(text3, _fontName2, mode, options, classes.concat(fontWeight, fontShape));
    } else {
      var _fontName3 = retrieveTextFontName(_font, fontWeight, fontShape);
      return makeSymbol(text3, _fontName3, mode, options, classes.concat(_fontName3, fontWeight, fontShape));
    }
  } else {
    throw new Error("unexpected type: " + type + " in makeOrd");
  }
};
var canCombine = (prev, next) => {
  if (createClass(prev.classes) !== createClass(next.classes) || prev.skew !== next.skew || prev.maxFontSize !== next.maxFontSize || prev.italic !== 0 && prev.hasClass("mathnormal")) {
    return false;
  }
  if (prev.classes.length === 1) {
    var cls = prev.classes[0];
    if (cls === "mbin" || cls === "mord") {
      return false;
    }
  }
  for (var key of Object.keys(prev.style)) {
    if (prev.style[key] !== next.style[key]) {
      return false;
    }
  }
  for (var _key of Object.keys(next.style)) {
    if (prev.style[_key] !== next.style[_key]) {
      return false;
    }
  }
  return true;
};
var tryCombineChars = (chars) => {
  for (var i2 = 0; i2 < chars.length - 1; i2++) {
    var prev = chars[i2];
    var next = chars[i2 + 1];
    if (prev instanceof SymbolNode && next instanceof SymbolNode && canCombine(prev, next)) {
      prev.text += next.text;
      prev.height = Math.max(prev.height, next.height);
      prev.depth = Math.max(prev.depth, next.depth);
      prev.italic = next.italic;
      chars.splice(i2 + 1, 1);
      i2--;
    }
  }
  return chars;
};
var sizeElementFromChildren = function sizeElementFromChildren2(elem) {
  var height = 0;
  var depth = 0;
  var maxFontSize = 0;
  for (var i2 = 0; i2 < elem.children.length; i2++) {
    var child = elem.children[i2];
    if (child.height > height) {
      height = child.height;
    }
    if (child.depth > depth) {
      depth = child.depth;
    }
    if (child.maxFontSize > maxFontSize) {
      maxFontSize = child.maxFontSize;
    }
  }
  elem.height = height;
  elem.depth = depth;
  elem.maxFontSize = maxFontSize;
};
var makeSpan = function makeSpan2(classes, children, options, style) {
  var span = new Span(classes, children, options, style);
  sizeElementFromChildren(span);
  return span;
};
var makeSvgSpan = (classes, children, options, style) => new Span(classes, children, options, style);
var makeLineSpan = function makeLineSpan2(className, options, thickness) {
  var line = makeSpan([className], [], options);
  line.height = Math.max(thickness || options.fontMetrics().defaultRuleThickness, options.minRuleThickness);
  line.style.borderBottomWidth = makeEm(line.height);
  line.maxFontSize = 1;
  return line;
};
var makeAnchor = function makeAnchor2(href, classes, children, options) {
  var anchor = new Anchor(href, classes, children, options);
  sizeElementFromChildren(anchor);
  return anchor;
};
var makeFragment = function makeFragment2(children) {
  var fragment2 = new DocumentFragment(children);
  sizeElementFromChildren(fragment2);
  return fragment2;
};
var wrapFragment = function wrapFragment2(group, options) {
  if (group instanceof DocumentFragment) {
    return makeSpan([], [group], options);
  }
  return group;
};
var getVListChildrenAndDepth = function getVListChildrenAndDepth2(params) {
  if (params.positionType === "individualShift") {
    var oldChildren = params.children;
    var children = [oldChildren[0]];
    var _depth = -oldChildren[0].shift - oldChildren[0].elem.depth;
    var currPos = _depth;
    for (var i2 = 1; i2 < oldChildren.length; i2++) {
      var diff = -oldChildren[i2].shift - currPos - oldChildren[i2].elem.depth;
      var size = diff - (oldChildren[i2 - 1].elem.height + oldChildren[i2 - 1].elem.depth);
      currPos = currPos + diff;
      children.push({
        type: "kern",
        size
      });
      children.push(oldChildren[i2]);
    }
    return {
      children,
      depth: _depth
    };
  }
  var depth;
  if (params.positionType === "top") {
    var bottom = params.positionData;
    for (var _i6 = 0; _i6 < params.children.length; _i6++) {
      var child = params.children[_i6];
      bottom -= child.type === "kern" ? child.size : child.elem.height + child.elem.depth;
    }
    depth = bottom;
  } else if (params.positionType === "bottom") {
    depth = -params.positionData;
  } else {
    var firstChild = params.children[0];
    if (firstChild.type !== "elem") {
      throw new Error('First child must have type "elem".');
    }
    if (params.positionType === "shift") {
      depth = -firstChild.elem.depth - params.positionData;
    } else if (params.positionType === "firstBaseline") {
      depth = -firstChild.elem.depth;
    } else {
      throw new Error("Invalid positionType " + params.positionType + ".");
    }
  }
  return {
    children: params.children,
    depth
  };
};
var makeVList = function makeVList2(params, options) {
  var _getVListChildrenAndD = getVListChildrenAndDepth(params), children = _getVListChildrenAndD.children, depth = _getVListChildrenAndD.depth;
  var pstrutSize = 0;
  for (var i2 = 0; i2 < children.length; i2++) {
    var child = children[i2];
    if (child.type === "elem") {
      var elem = child.elem;
      pstrutSize = Math.max(pstrutSize, elem.maxFontSize, elem.height);
    }
  }
  pstrutSize += 2;
  var pstrut = makeSpan(["pstrut"], []);
  pstrut.style.height = makeEm(pstrutSize);
  var realChildren = [];
  var minPos = depth;
  var maxPos = depth;
  var currPos = depth;
  for (var _i22 = 0; _i22 < children.length; _i22++) {
    var _child = children[_i22];
    if (_child.type === "kern") {
      currPos += _child.size;
    } else {
      var _elem = _child.elem;
      var classes = _child.wrapperClasses || [];
      var style = _child.wrapperStyle || {};
      var childWrap = makeSpan(classes, [pstrut, _elem], void 0, style);
      childWrap.style.top = makeEm(-pstrutSize - currPos - _elem.depth);
      if (_child.marginLeft) {
        childWrap.style.marginLeft = _child.marginLeft;
      }
      if (_child.marginRight) {
        childWrap.style.marginRight = _child.marginRight;
      }
      realChildren.push(childWrap);
      currPos += _elem.height + _elem.depth;
    }
    minPos = Math.min(minPos, currPos);
    maxPos = Math.max(maxPos, currPos);
  }
  var vlist = makeSpan(["vlist"], realChildren);
  vlist.style.height = makeEm(maxPos);
  var rows;
  if (minPos < 0) {
    var emptySpan = makeSpan([], []);
    var depthStrut = makeSpan(["vlist"], [emptySpan]);
    depthStrut.style.height = makeEm(-minPos);
    var topStrut = makeSpan(["vlist-s"], [new SymbolNode("\u200B")]);
    rows = [makeSpan(["vlist-r"], [vlist, topStrut]), makeSpan(["vlist-r"], [depthStrut])];
  } else {
    rows = [makeSpan(["vlist-r"], [vlist])];
  }
  var vtable = makeSpan(["vlist-t"], rows);
  if (rows.length === 2) {
    vtable.classes.push("vlist-t2");
  }
  vtable.height = maxPos;
  vtable.depth = -minPos;
  return vtable;
};
var makeGlue = (measurement, options) => {
  var rule = makeSpan(["mspace"], [], options);
  var size = calculateSize(measurement, options);
  rule.style.marginRight = makeEm(size);
  return rule;
};
var retrieveTextFontName = (fontFamily, fontWeight, fontShape) => {
  var baseFontName;
  var fontStylesName;
  switch (fontFamily) {
    case "amsrm":
      baseFontName = "AMS";
      break;
    case "textrm":
      baseFontName = "Main";
      break;
    case "textsf":
      baseFontName = "SansSerif";
      break;
    case "texttt":
      baseFontName = "Typewriter";
      break;
    default:
      baseFontName = fontFamily;
  }
  if (fontWeight === "textbf" && fontShape === "textit") {
    fontStylesName = "BoldItalic";
  } else if (fontWeight === "textbf") {
    fontStylesName = "Bold";
  } else if (fontShape === "textit") {
    fontStylesName = "Italic";
  } else {
    fontStylesName = "Regular";
  }
  return baseFontName + "-" + fontStylesName;
};
var fontMap = {
  // styles
  "mathbf": {
    variant: "bold",
    fontName: "Main-Bold"
  },
  "mathrm": {
    variant: "normal",
    fontName: "Main-Regular"
  },
  "textit": {
    variant: "italic",
    fontName: "Main-Italic"
  },
  "mathit": {
    variant: "italic",
    fontName: "Main-Italic"
  },
  "mathnormal": {
    variant: "italic",
    fontName: "Math-Italic"
  },
  "mathsfit": {
    variant: "sans-serif-italic",
    fontName: "SansSerif-Italic"
  },
  // "boldsymbol" is missing because they require the use of multiple fonts:
  // Math-BoldItalic and Main-Bold.  This is handled by a special case in
  // makeOrd which ends up calling boldsymbol.
  // families
  "mathbb": {
    variant: "double-struck",
    fontName: "AMS-Regular"
  },
  "mathcal": {
    variant: "script",
    fontName: "Caligraphic-Regular"
  },
  "mathfrak": {
    variant: "fraktur",
    fontName: "Fraktur-Regular"
  },
  "mathscr": {
    variant: "script",
    fontName: "Script-Regular"
  },
  "mathsf": {
    variant: "sans-serif",
    fontName: "SansSerif-Regular"
  },
  "mathtt": {
    variant: "monospace",
    fontName: "Typewriter-Regular"
  }
};
var svgData = {
  //   path, width, height
  vec: ["vec", 0.471, 0.714],
  // values from the font glyph
  oiintSize1: ["oiintSize1", 0.957, 0.499],
  // oval to overlay the integrand
  oiintSize2: ["oiintSize2", 1.472, 0.659],
  oiiintSize1: ["oiiintSize1", 1.304, 0.499],
  oiiintSize2: ["oiiintSize2", 1.98, 0.659]
};
var staticSvg = function staticSvg2(value, options) {
  var _svgData$value = svgData[value], pathName = _svgData$value[0], width = _svgData$value[1], height = _svgData$value[2];
  var path2 = new PathNode(pathName);
  var svgNode = new SvgNode([path2], {
    "width": makeEm(width),
    "height": makeEm(height),
    // Override CSS rule `.katex svg { width: 100% }`
    "style": "width:" + makeEm(width),
    "viewBox": "0 0 " + 1e3 * width + " " + 1e3 * height,
    "preserveAspectRatio": "xMinYMin"
  });
  var span = makeSvgSpan(["katex-overlay"], [svgNode], options);
  span.height = height;
  span.style.height = makeEm(height);
  span.style.width = makeEm(width);
  return span;
};
var thinspace = {
  number: 3,
  unit: "mu"
};
var mediumspace = {
  number: 4,
  unit: "mu"
};
var thickspace = {
  number: 5,
  unit: "mu"
};
var spacings = {
  mord: {
    mop: thinspace,
    mbin: mediumspace,
    mrel: thickspace,
    minner: thinspace
  },
  mop: {
    mord: thinspace,
    mop: thinspace,
    mrel: thickspace,
    minner: thinspace
  },
  mbin: {
    mord: mediumspace,
    mop: mediumspace,
    mopen: mediumspace,
    minner: mediumspace
  },
  mrel: {
    mord: thickspace,
    mop: thickspace,
    mopen: thickspace,
    minner: thickspace
  },
  mopen: {},
  mclose: {
    mop: thinspace,
    mbin: mediumspace,
    mrel: thickspace,
    minner: thinspace
  },
  mpunct: {
    mord: thinspace,
    mop: thinspace,
    mrel: thickspace,
    mopen: thinspace,
    mclose: thinspace,
    mpunct: thinspace,
    minner: thinspace
  },
  minner: {
    mord: thinspace,
    mop: thinspace,
    mbin: mediumspace,
    mrel: thickspace,
    mopen: thinspace,
    mpunct: thinspace,
    minner: thinspace
  }
};
var tightSpacings = {
  mord: {
    mop: thinspace
  },
  mop: {
    mord: thinspace,
    mop: thinspace
  },
  mbin: {},
  mrel: {},
  mopen: {},
  mclose: {
    mop: thinspace
  },
  mpunct: {},
  minner: {
    mop: thinspace
  }
};
var _functions = {};
var _htmlGroupBuilders = {};
var _mathmlGroupBuilders = {};
function defineFunction(data) {
  var type = data.type, names = data.names, htmlBuilder3 = data.htmlBuilder, mathmlBuilder3 = data.mathmlBuilder;
  for (var i2 = 0; i2 < names.length; ++i2) {
    _functions[names[i2]] = data;
  }
  if (type) {
    if (htmlBuilder3) {
      _htmlGroupBuilders[type] = htmlBuilder3;
    }
    if (mathmlBuilder3) {
      _mathmlGroupBuilders[type] = mathmlBuilder3;
    }
  }
}
function defineFunctionBuilders(_ref2) {
  var type = _ref2.type, htmlBuilder3 = _ref2.htmlBuilder, mathmlBuilder3 = _ref2.mathmlBuilder;
  if (htmlBuilder3) {
    _htmlGroupBuilders[type] = htmlBuilder3;
  }
  if (mathmlBuilder3) {
    _mathmlGroupBuilders[type] = mathmlBuilder3;
  }
}
var normalizeArgument = function normalizeArgument2(arg) {
  return arg.type === "ordgroup" && arg.body.length === 1 ? arg.body[0] : arg;
};
var ordargument = function ordargument2(arg) {
  return arg.type === "ordgroup" ? arg.body : [arg];
};
var binLeftCanceller = /* @__PURE__ */ new Set(["leftmost", "mbin", "mopen", "mrel", "mop", "mpunct"]);
var binRightCanceller = /* @__PURE__ */ new Set(["rightmost", "mrel", "mclose", "mpunct"]);
var styleMap$1 = {
  "display": Style$1.DISPLAY,
  "text": Style$1.TEXT,
  "script": Style$1.SCRIPT,
  "scriptscript": Style$1.SCRIPTSCRIPT
};
var DomEnum = {
  mord: "mord",
  mop: "mop",
  mbin: "mbin",
  mrel: "mrel",
  mopen: "mopen",
  mclose: "mclose",
  mpunct: "mpunct",
  minner: "minner"
};
var buildExpression$1 = function buildExpression(expression, options, isRealGroup, surrounding) {
  if (surrounding === void 0) {
    surrounding = [null, null];
  }
  var groups = [];
  for (var i2 = 0; i2 < expression.length; i2++) {
    var output = buildGroup$1(expression[i2], options);
    if (output instanceof DocumentFragment) {
      var children = output.children;
      groups.push(...children);
    } else {
      groups.push(output);
    }
  }
  tryCombineChars(groups);
  if (!isRealGroup) {
    return groups;
  }
  var glueOptions = options;
  if (expression.length === 1) {
    var node = expression[0];
    if (node.type === "sizing") {
      glueOptions = options.havingSize(node.size);
    } else if (node.type === "styling") {
      glueOptions = options.havingStyle(styleMap$1[node.style]);
    }
  }
  var dummyPrev = makeSpan([surrounding[0] || "leftmost"], [], options);
  var dummyNext = makeSpan([surrounding[1] || "rightmost"], [], options);
  var isRoot = isRealGroup === "root";
  _traverseNonSpaceNodes(groups, (node2, prev) => {
    var prevType = prev.classes[0];
    var type = node2.classes[0];
    if (prevType === "mbin" && binRightCanceller.has(type)) {
      prev.classes[0] = "mord";
    } else if (type === "mbin" && binLeftCanceller.has(prevType)) {
      node2.classes[0] = "mord";
    }
  }, {
    node: dummyPrev
  }, dummyNext, isRoot);
  _traverseNonSpaceNodes(groups, (node2, prev) => {
    var _tightSpacings$prevTy, _spacings$prevType;
    var prevType = getTypeOfDomTree(prev);
    var type = getTypeOfDomTree(node2);
    var space = prevType && type ? node2.hasClass("mtight") ? (_tightSpacings$prevTy = tightSpacings[prevType]) == null ? void 0 : _tightSpacings$prevTy[type] : (_spacings$prevType = spacings[prevType]) == null ? void 0 : _spacings$prevType[type] : null;
    if (space) {
      return makeGlue(space, glueOptions);
    }
  }, {
    node: dummyPrev
  }, dummyNext, isRoot);
  return groups;
};
var _traverseNonSpaceNodes = function traverseNonSpaceNodes(nodes, callback, prev, next, isRoot) {
  if (next) {
    nodes.push(next);
  }
  var i2 = 0;
  for (; i2 < nodes.length; i2++) {
    var node = nodes[i2];
    var partialGroup = checkPartialGroup(node);
    if (partialGroup) {
      _traverseNonSpaceNodes(partialGroup.children, callback, prev, null, isRoot);
      continue;
    }
    var nonspace = !node.hasClass("mspace");
    if (nonspace) {
      var result = callback(node, prev.node);
      if (result) {
        if (prev.insertAfter) {
          prev.insertAfter(result);
        } else {
          nodes.unshift(result);
          i2++;
        }
      }
    }
    if (nonspace) {
      prev.node = node;
    } else if (isRoot && node.hasClass("katex-newline")) {
      prev.node = makeSpan(["leftmost"]);
    }
    prev.insertAfter = /* @__PURE__ */ ((index) => (n) => {
      nodes.splice(index + 1, 0, n);
      i2++;
    })(i2);
  }
  if (next) {
    nodes.pop();
  }
};
var checkPartialGroup = function checkPartialGroup2(node) {
  if (node instanceof DocumentFragment || node instanceof Anchor || node instanceof Span && node.hasClass("enclosing")) {
    return node;
  }
  return null;
};
var _getOutermostNode = function getOutermostNode(node, side) {
  var partialGroup = checkPartialGroup(node);
  if (partialGroup) {
    var children = partialGroup.children;
    if (children.length) {
      if (side === "right") {
        return _getOutermostNode(children[children.length - 1], "right");
      } else if (side === "left") {
        return _getOutermostNode(children[0], "left");
      }
    }
  }
  return node;
};
var getTypeOfDomTree = function getTypeOfDomTree2(node, side) {
  if (!node) {
    return null;
  }
  if (side) {
    node = _getOutermostNode(node, side);
  }
  var className = node.classes[0];
  return DomEnum[className] || null;
};
var makeNullDelimiter = function makeNullDelimiter2(options, classes) {
  var moreClasses = ["nulldelimiter"].concat(options.baseSizingClasses());
  return makeSpan(classes.concat(moreClasses));
};
var buildGroup$1 = function buildGroup(group, options, baseOptions) {
  if (!group) {
    return makeSpan();
  }
  if (_htmlGroupBuilders[group.type]) {
    var groupNode = _htmlGroupBuilders[group.type](group, options);
    if (baseOptions && options.size !== baseOptions.size) {
      groupNode = makeSpan(options.sizingClasses(baseOptions), [groupNode], options);
      var multiplier = options.sizeMultiplier / baseOptions.sizeMultiplier;
      groupNode.height *= multiplier;
      groupNode.depth *= multiplier;
    }
    return groupNode;
  } else {
    throw new ParseError("Got group of unknown type: '" + group.type + "'");
  }
};
function buildHTMLUnbreakable(children, options) {
  var body = makeSpan(["katex-base"], children, options);
  var strut = makeSpan(["katex-strut"]);
  strut.style.height = makeEm(body.height + body.depth);
  if (body.depth) {
    strut.style.verticalAlign = makeEm(-body.depth);
  }
  body.children.unshift(strut);
  return body;
}
function buildHTML(tree, options) {
  var tag = null;
  if (tree.length === 1 && tree[0].type === "tag") {
    tag = tree[0].tag;
    tree = tree[0].body;
  }
  var expression = buildExpression$1(tree, options, "root");
  var eqnNum;
  if (expression.length === 2 && expression[1].hasClass("katex-tag")) {
    eqnNum = expression.pop();
  }
  var children = [];
  var parts = [];
  for (var i2 = 0; i2 < expression.length; i2++) {
    parts.push(expression[i2]);
    if (expression[i2].hasClass("mbin") || expression[i2].hasClass("mrel") || expression[i2].hasClass("allowbreak")) {
      var nobreak = false;
      while (i2 < expression.length - 1 && expression[i2 + 1].hasClass("mspace") && !expression[i2 + 1].hasClass("katex-newline")) {
        i2++;
        parts.push(expression[i2]);
        if (expression[i2].hasClass("nobreak")) {
          nobreak = true;
        }
      }
      if (!nobreak) {
        children.push(buildHTMLUnbreakable(parts, options));
        parts = [];
      }
    } else if (expression[i2].hasClass("katex-newline")) {
      parts.pop();
      if (parts.length > 0) {
        children.push(buildHTMLUnbreakable(parts, options));
        parts = [];
      }
      children.push(expression[i2]);
    }
  }
  if (parts.length > 0) {
    children.push(buildHTMLUnbreakable(parts, options));
  }
  var tagChild;
  if (tag) {
    tagChild = buildHTMLUnbreakable(buildExpression$1(tag, options, true), options);
    tagChild.classes = ["katex-tag"];
    children.push(tagChild);
  } else if (eqnNum) {
    children.push(eqnNum);
  }
  var htmlNode = makeSpan(["katex-html"], children);
  htmlNode.setAttribute("aria-hidden", "true");
  if (tagChild) {
    var strut = tagChild.children[0];
    strut.style.height = makeEm(htmlNode.height + htmlNode.depth);
    if (htmlNode.depth) {
      strut.style.verticalAlign = makeEm(-htmlNode.depth);
    }
  }
  return htmlNode;
}
function newDocumentFragment(children) {
  return new DocumentFragment(children);
}
var MathNode = class {
  constructor(type, children, classes) {
    this.type = void 0;
    this.attributes = void 0;
    this.children = void 0;
    this.classes = void 0;
    this.type = type;
    this.attributes = {};
    this.children = children || [];
    this.classes = classes || [];
  }
  /**
   * Sets an attribute on a MathML node. MathML depends on attributes to convey a
   * semantic content, so this is used heavily.
   */
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  /**
   * Gets an attribute on a MathML node.
   */
  getAttribute(name) {
    return this.attributes[name];
  }
  /**
   * Converts the math node into a MathML-namespaced DOM element.
   */
  toNode() {
    var node = document.createElementNS("http://www.w3.org/1998/Math/MathML", this.type);
    for (var _ref2 of Object.entries(this.attributes)) {
      var attr2 = _ref2[0];
      var value = _ref2[1];
      node.setAttribute(attr2, value);
    }
    if (this.classes.length > 0) {
      node.className = createClass(this.classes);
    }
    for (var i2 = 0; i2 < this.children.length; i2++) {
      if (this.children[i2] instanceof TextNode && this.children[i2 + 1] instanceof TextNode) {
        var text3 = this.children[i2].toText() + this.children[++i2].toText();
        while (this.children[i2 + 1] instanceof TextNode) {
          text3 += this.children[++i2].toText();
        }
        node.appendChild(new TextNode(text3).toNode());
      } else {
        node.appendChild(this.children[i2].toNode());
      }
    }
    return node;
  }
  /**
   * Converts the math node into an HTML markup string.
   */
  toMarkup() {
    var markup = "<" + this.type;
    for (var _ref4 of Object.entries(this.attributes)) {
      var attr2 = _ref4[0];
      var value = _ref4[1];
      markup += " " + attr2 + '="';
      markup += escape(value);
      markup += '"';
    }
    if (this.classes.length > 0) {
      markup += ' class ="' + escape(createClass(this.classes)) + '"';
    }
    markup += ">";
    for (var i2 = 0; i2 < this.children.length; i2++) {
      markup += this.children[i2].toMarkup();
    }
    markup += "</" + this.type + ">";
    return markup;
  }
  /**
   * Converts the math node into a string, similar to innerText, but escaped.
   */
  toText() {
    return this.children.map((child) => child.toText()).join("");
  }
};
var TextNode = class {
  constructor(text3) {
    this.text = void 0;
    this.text = text3;
  }
  /**
   * Converts the text node into a DOM text node.
   */
  toNode() {
    return document.createTextNode(this.text);
  }
  /**
   * Converts the text node into escaped HTML markup
   * (representing the text itself).
   */
  toMarkup() {
    return escape(this.toText());
  }
  /**
   * Converts the text node into a string
   * (representing the text itself).
   */
  toText() {
    return this.text;
  }
};
var SpaceNode = class {
  /**
   * Create a Space node with width given in CSS ems.
   */
  constructor(width) {
    this.width = void 0;
    this.character = void 0;
    this.width = width;
    if (width >= 0.05555 && width <= 0.05556) {
      this.character = "\u200A";
    } else if (width >= 0.1666 && width <= 0.1667) {
      this.character = "\u2009";
    } else if (width >= 0.2222 && width <= 0.2223) {
      this.character = "\u2005";
    } else if (width >= 0.2777 && width <= 0.2778) {
      this.character = "\u2005\u200A";
    } else if (width >= -0.05556 && width <= -0.05555) {
      this.character = "\u200A\u2063";
    } else if (width >= -0.1667 && width <= -0.1666) {
      this.character = "\u2009\u2063";
    } else if (width >= -0.2223 && width <= -0.2222) {
      this.character = "\u205F\u2063";
    } else if (width >= -0.2778 && width <= -0.2777) {
      this.character = "\u2005\u2063";
    } else {
      this.character = null;
    }
  }
  /**
   * Converts the math node into a MathML-namespaced DOM element.
   */
  toNode() {
    if (this.character) {
      return document.createTextNode(this.character);
    } else {
      var node = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mspace");
      node.setAttribute("width", makeEm(this.width));
      return node;
    }
  }
  /**
   * Converts the math node into an HTML markup string.
   */
  toMarkup() {
    if (this.character) {
      return "<mtext>" + this.character + "</mtext>";
    } else {
      return '<mspace width="' + makeEm(this.width) + '"/>';
    }
  }
  /**
   * Converts the math node into a string, similar to innerText.
   */
  toText() {
    if (this.character) {
      return this.character;
    } else {
      return " ";
    }
  }
};
var noVariantSymbols = /* @__PURE__ */ new Set(["\\imath", "\\jmath"]);
var rowLikeTypes = /* @__PURE__ */ new Set(["mrow", "mtable"]);
var makeText = function makeText2(text3, mode, options) {
  var _options$fontFamily, _options$font;
  if (symbols[mode][text3] && symbols[mode][text3].replace && text3.charCodeAt(0) !== 55349 && !(Object.prototype.hasOwnProperty.call(ligatures, text3) && ((options == null || (_options$fontFamily = options.fontFamily) == null ? void 0 : _options$fontFamily.slice(4, 6)) === "tt" || (options == null || (_options$font = options.font) == null ? void 0 : _options$font.slice(4, 6)) === "tt"))) {
    text3 = symbols[mode][text3].replace;
  }
  return new TextNode(text3);
};
var makeRow = function makeRow2(body) {
  if (body.length === 1) {
    return body[0];
  } else {
    return new MathNode("mrow", body);
  }
};
var mathFontVariants = {
  mathit: "italic",
  boldsymbol: (group) => group.type === "textord" ? "bold" : "bold-italic",
  mathbf: "bold",
  mathbb: "double-struck",
  mathsfit: "sans-serif-italic",
  mathfrak: "fraktur",
  mathscr: "script",
  mathcal: "script",
  mathsf: "sans-serif",
  mathtt: "monospace"
};
var getVariant = (group, options) => {
  if (group.mode === "text") {
    if (options.fontFamily === "texttt") {
      return "monospace";
    } else if (options.fontFamily === "textsf") {
      if (options.fontShape === "textit" && options.fontWeight === "textbf") {
        return "sans-serif-bold-italic";
      } else if (options.fontShape === "textit") {
        return "sans-serif-italic";
      } else if (options.fontWeight === "textbf") {
        return "bold-sans-serif";
      } else {
        return "sans-serif";
      }
    } else if (options.fontShape === "textit" && options.fontWeight === "textbf") {
      return "bold-italic";
    } else if (options.fontShape === "textit") {
      return "italic";
    } else if (options.fontWeight === "textbf") {
      return "bold";
    }
  }
  var font = options.font;
  if (!font || font === "mathnormal") {
    return null;
  }
  var mode = group.mode;
  var mathVariant = mathFontVariants[font];
  if (mathVariant) {
    return typeof mathVariant === "function" ? mathVariant(group) : mathVariant;
  }
  var text3 = group.text;
  if (noVariantSymbols.has(text3)) {
    return null;
  }
  if (symbols[mode][text3]) {
    var replacement = symbols[mode][text3].replace;
    if (replacement) {
      text3 = replacement;
    }
  }
  var fontName = fontMap[font].fontName;
  if (getCharacterMetrics(text3, fontName, mode)) {
    return fontMap[font].variant;
  }
  return null;
};
function isNumberPunctuation(group) {
  if (!group) {
    return false;
  }
  if (group.type === "mi" && group.children.length === 1) {
    var child = group.children[0];
    return child instanceof TextNode && child.text === ".";
  } else if (group.type === "mo" && group.children.length === 1 && group.getAttribute("separator") === "true" && group.getAttribute("lspace") === "0em" && group.getAttribute("rspace") === "0em") {
    var _child = group.children[0];
    return _child instanceof TextNode && _child.text === ",";
  } else {
    return false;
  }
}
var buildExpression2 = function buildExpression3(expression, options, isOrdgroup) {
  if (expression.length === 1) {
    var group = buildGroup2(expression[0], options);
    if (isOrdgroup && group instanceof MathNode && group.type === "mo") {
      group.setAttribute("lspace", "0em");
      group.setAttribute("rspace", "0em");
    }
    return [group];
  }
  var groups = [];
  var lastGroup;
  for (var i2 = 0; i2 < expression.length; i2++) {
    var _group = buildGroup2(expression[i2], options);
    if (_group instanceof MathNode && lastGroup instanceof MathNode) {
      if (_group.type === "mtext" && lastGroup.type === "mtext" && _group.getAttribute("mathvariant") === lastGroup.getAttribute("mathvariant")) {
        lastGroup.children.push(..._group.children);
        continue;
      } else if (_group.type === "mn" && lastGroup.type === "mn") {
        lastGroup.children.push(..._group.children);
        continue;
      } else if (isNumberPunctuation(_group) && lastGroup.type === "mn") {
        lastGroup.children.push(..._group.children);
        continue;
      } else if (_group.type === "mn" && isNumberPunctuation(lastGroup)) {
        _group.children = [...lastGroup.children, ..._group.children];
        groups.pop();
      } else if ((_group.type === "msup" || _group.type === "msub") && _group.children.length >= 1 && (lastGroup.type === "mn" || isNumberPunctuation(lastGroup))) {
        var base = _group.children[0];
        if (base instanceof MathNode && base.type === "mn") {
          base.children = [...lastGroup.children, ...base.children];
          groups.pop();
        }
      } else if (lastGroup.type === "mi" && lastGroup.children.length === 1) {
        var lastChild = lastGroup.children[0];
        if (lastChild instanceof TextNode && lastChild.text === "\u0338" && (_group.type === "mo" || _group.type === "mi" || _group.type === "mn")) {
          var child = _group.children[0];
          if (child instanceof TextNode && child.text.length > 0) {
            child.text = child.text.slice(0, 1) + "\u0338" + child.text.slice(1);
            groups.pop();
          }
        }
      }
    }
    groups.push(_group);
    lastGroup = _group;
  }
  return groups;
};
var buildExpressionRow = function buildExpressionRow2(expression, options, isOrdgroup) {
  return makeRow(buildExpression2(expression, options, isOrdgroup));
};
var buildGroup2 = function buildGroup3(group, options) {
  if (!group) {
    return new MathNode("mrow");
  }
  if (_mathmlGroupBuilders[group.type]) {
    return _mathmlGroupBuilders[group.type](group, options);
  } else {
    throw new ParseError("Got group of unknown type: '" + group.type + "'");
  }
};
function buildMathML(tree, texExpression, options, isDisplayMode, forMathmlOnly) {
  var expression = buildExpression2(tree, options);
  var wrapper;
  if (expression.length === 1 && expression[0] instanceof MathNode && rowLikeTypes.has(expression[0].type)) {
    wrapper = expression[0];
  } else {
    wrapper = new MathNode("mrow", expression);
  }
  var annotation = new MathNode("annotation", [new TextNode(texExpression)]);
  annotation.setAttribute("encoding", "application/x-tex");
  var semantics = new MathNode("semantics", [wrapper, annotation]);
  var math2 = new MathNode("math", [semantics]);
  math2.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML");
  if (isDisplayMode) {
    math2.setAttribute("display", "block");
  }
  var wrapperClass = forMathmlOnly ? "katex" : "katex-mathml";
  return makeSpan([wrapperClass], [math2]);
}
var sizeStyleMap = [
  // Each element contains [textsize, scriptsize, scriptscriptsize].
  // The size mappings are taken from TeX with \normalsize=10pt.
  [1, 1, 1],
  // size1: [5, 5, 5]              \tiny
  [2, 1, 1],
  // size2: [6, 5, 5]
  [3, 1, 1],
  // size3: [7, 5, 5]              \scriptsize
  [4, 2, 1],
  // size4: [8, 6, 5]              \footnotesize
  [5, 2, 1],
  // size5: [9, 6, 5]              \small
  [6, 3, 1],
  // size6: [10, 7, 5]             \normalsize
  [7, 4, 2],
  // size7: [12, 8, 6]             \large
  [8, 6, 3],
  // size8: [14.4, 10, 7]          \Large
  [9, 7, 6],
  // size9: [17.28, 12, 10]        \LARGE
  [10, 8, 7],
  // size10: [20.74, 14.4, 12]     \huge
  [11, 10, 9]
  // size11: [24.88, 20.74, 17.28] \HUGE
];
var sizeMultipliers = [
  // fontMetrics.js:getGlobalMetrics also uses size indexes, so if
  // you change size indexes, change that function.
  0.5,
  0.6,
  0.7,
  0.8,
  0.9,
  1,
  1.2,
  1.44,
  1.728,
  2.074,
  2.488
];
var sizeAtStyle = function sizeAtStyle2(size, style) {
  return style.size < 2 ? size : sizeStyleMap[size - 1][style.size - 1];
};
var Options = class _Options {
  constructor(data) {
    this.style = void 0;
    this.color = void 0;
    this.size = void 0;
    this.textSize = void 0;
    this.phantom = void 0;
    this.font = void 0;
    this.fontFamily = void 0;
    this.fontWeight = void 0;
    this.fontShape = void 0;
    this.sizeMultiplier = void 0;
    this.maxSize = void 0;
    this.minRuleThickness = void 0;
    this._fontMetrics = void 0;
    this.strict = void 0;
    this.style = data.style;
    this.color = data.color;
    this.size = data.size || _Options.BASESIZE;
    this.textSize = data.textSize || this.size;
    this.phantom = !!data.phantom;
    this.font = data.font || "";
    this.fontFamily = data.fontFamily || "";
    this.fontWeight = data.fontWeight || "";
    this.fontShape = data.fontShape || "";
    this.sizeMultiplier = sizeMultipliers[this.size - 1];
    this.maxSize = data.maxSize;
    this.minRuleThickness = data.minRuleThickness;
    this.strict = data.strict;
    this._fontMetrics = void 0;
  }
  /**
   * Returns a new options object with the same properties as "this".  Properties
   * from "extension" will be copied to the new options object.
   */
  extend(extension) {
    var data = {
      style: this.style,
      size: this.size,
      textSize: this.textSize,
      color: this.color,
      phantom: this.phantom,
      font: this.font,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
      fontShape: this.fontShape,
      maxSize: this.maxSize,
      minRuleThickness: this.minRuleThickness,
      strict: this.strict
    };
    Object.assign(data, extension);
    return new _Options(data);
  }
  /**
   * Return an options object with the given style. If `this.style === style`,
   * returns `this`.
   */
  havingStyle(style) {
    if (this.style === style) {
      return this;
    } else {
      return this.extend({
        style,
        size: sizeAtStyle(this.textSize, style)
      });
    }
  }
  /**
   * Return an options object with a cramped version of the current style. If
   * the current style is cramped, returns `this`.
   */
  havingCrampedStyle() {
    return this.havingStyle(this.style.cramp());
  }
  /**
   * Return an options object with the given size and in at least `\textstyle`.
   * Returns `this` if appropriate.
   */
  havingSize(size) {
    if (this.size === size && this.textSize === size) {
      return this;
    } else {
      return this.extend({
        style: this.style.text(),
        size,
        textSize: size,
        sizeMultiplier: sizeMultipliers[size - 1]
      });
    }
  }
  /**
   * Like `this.havingSize(BASESIZE).havingStyle(style)`. If `style` is omitted,
   * changes to at least `\textstyle`.
   */
  havingBaseStyle(style) {
    style = style || this.style.text();
    var wantSize = sizeAtStyle(_Options.BASESIZE, style);
    if (this.size === wantSize && this.textSize === _Options.BASESIZE && this.style === style) {
      return this;
    } else {
      return this.extend({
        style,
        size: wantSize
      });
    }
  }
  /**
   * Remove the effect of sizing changes such as \Huge.
   * Keep the effect of the current style, such as \scriptstyle.
   */
  havingBaseSizing() {
    var size;
    switch (this.style.id) {
      case 4:
      case 5:
        size = 3;
        break;
      case 6:
      case 7:
        size = 1;
        break;
      default:
        size = 6;
    }
    return this.extend({
      style: this.style.text(),
      size
    });
  }
  /**
   * Create a new options object with the given color.
   */
  withColor(color) {
    return this.extend({
      color
    });
  }
  /**
   * Create a new options object with "phantom" set to true.
   */
  withPhantom() {
    return this.extend({
      phantom: true
    });
  }
  /**
   * Creates a new options object with the given math font or old text font.
   * @type {[type]}
   */
  withFont(font) {
    return this.extend({
      font
    });
  }
  /**
   * Create a new options objects with the given fontFamily.
   */
  withTextFontFamily(fontFamily) {
    return this.extend({
      fontFamily,
      font: ""
    });
  }
  /**
   * Creates a new options object with the given font weight
   */
  withTextFontWeight(fontWeight) {
    return this.extend({
      fontWeight,
      font: ""
    });
  }
  /**
   * Creates a new options object with the given font weight
   */
  withTextFontShape(fontShape) {
    return this.extend({
      fontShape,
      font: ""
    });
  }
  /**
   * Return the CSS sizing classes required to switch from enclosing options
   * `oldOptions` to `this`. Returns an array of classes.
   */
  sizingClasses(oldOptions) {
    if (oldOptions.size !== this.size) {
      return ["katex-sizing", "reset-size" + oldOptions.size, "size" + this.size];
    } else {
      return [];
    }
  }
  /**
   * Return the CSS sizing classes required to switch to the base size. Like
   * `this.havingSize(BASESIZE).sizingClasses(this)`.
   */
  baseSizingClasses() {
    if (this.size !== _Options.BASESIZE) {
      return ["katex-sizing", "reset-size" + this.size, "size" + _Options.BASESIZE];
    } else {
      return [];
    }
  }
  /**
   * Return the font metrics for this size.
   */
  fontMetrics() {
    if (!this._fontMetrics) {
      this._fontMetrics = getGlobalMetrics(this.size);
    }
    return this._fontMetrics;
  }
  /**
   * Gets the CSS color of the current options object
   */
  getColor() {
    if (this.phantom) {
      return "transparent";
    } else {
      return this.color;
    }
  }
};
Options.BASESIZE = 6;
var optionsFromSettings = (settings) => new Options({
  style: settings.displayMode ? Style$1.DISPLAY : Style$1.TEXT,
  maxSize: settings.maxSize,
  minRuleThickness: settings.minRuleThickness,
  strict: settings.strict
});
var displayWrap = function displayWrap2(node, settings) {
  if (settings.displayMode) {
    var classes = ["katex-display"];
    if (settings.leqno) {
      classes.push("leqno");
    }
    if (settings.fleqn) {
      classes.push("fleqn");
    }
    node = makeSpan(classes, [node]);
  }
  return node;
};
var buildTree = function buildTree2(tree, expression, settings) {
  var options = optionsFromSettings(settings);
  var katexNode;
  if (settings.output === "mathml") {
    return buildMathML(tree, expression, options, settings.displayMode, true);
  } else if (settings.output === "html") {
    var htmlNode = buildHTML(tree, options);
    katexNode = makeSpan(["katex"], [htmlNode]);
  } else {
    var mathMLNode = buildMathML(tree, expression, options, settings.displayMode, false);
    var _htmlNode = buildHTML(tree, options);
    katexNode = makeSpan(["katex"], [mathMLNode, _htmlNode]);
  }
  return displayWrap(katexNode, settings);
};
var buildHTMLTree = function buildHTMLTree2(tree, settings) {
  var options = optionsFromSettings(settings);
  var htmlNode = buildHTML(tree, options);
  var katexNode = makeSpan(["katex"], [htmlNode]);
  return displayWrap(katexNode, settings);
};
var stretchyCodePoint = {
  widehat: "^",
  widecheck: "\u02C7",
  widetilde: "~",
  utilde: "~",
  overleftarrow: "\u2190",
  underleftarrow: "\u2190",
  xleftarrow: "\u2190",
  overrightarrow: "\u2192",
  underrightarrow: "\u2192",
  xrightarrow: "\u2192",
  underbrace: "\u23DF",
  overbrace: "\u23DE",
  underbracket: "\u23B5",
  overbracket: "\u23B4",
  overgroup: "\u23E0",
  undergroup: "\u23E1",
  overleftrightarrow: "\u2194",
  underleftrightarrow: "\u2194",
  xleftrightarrow: "\u2194",
  Overrightarrow: "\u21D2",
  xRightarrow: "\u21D2",
  overleftharpoon: "\u21BC",
  xleftharpoonup: "\u21BC",
  overrightharpoon: "\u21C0",
  xrightharpoonup: "\u21C0",
  xLeftarrow: "\u21D0",
  xLeftrightarrow: "\u21D4",
  xhookleftarrow: "\u21A9",
  xhookrightarrow: "\u21AA",
  xmapsto: "\u21A6",
  xrightharpoondown: "\u21C1",
  xleftharpoondown: "\u21BD",
  xrightleftharpoons: "\u21CC",
  xleftrightharpoons: "\u21CB",
  xtwoheadleftarrow: "\u219E",
  xtwoheadrightarrow: "\u21A0",
  xlongequal: "=",
  xtofrom: "\u21C4",
  xrightleftarrows: "\u21C4",
  xrightequilibrium: "\u21CC",
  // Not a perfect match.
  xleftequilibrium: "\u21CB",
  // None better available.
  "\\cdrightarrow": "\u2192",
  "\\cdleftarrow": "\u2190",
  "\\cdlongequal": "="
};
var stretchyMathML = function stretchyMathML2(label) {
  var node = new MathNode("mo", [new TextNode(stretchyCodePoint[label.replace(/^\\/, "")])]);
  node.setAttribute("stretchy", "true");
  return node;
};
var katexImagesData = {
  //   path(s), minWidth, height, align
  overrightarrow: [["rightarrow"], 0.888, 522, "xMaxYMin"],
  overleftarrow: [["leftarrow"], 0.888, 522, "xMinYMin"],
  underrightarrow: [["rightarrow"], 0.888, 522, "xMaxYMin"],
  underleftarrow: [["leftarrow"], 0.888, 522, "xMinYMin"],
  xrightarrow: [["rightarrow"], 1.469, 522, "xMaxYMin"],
  "\\cdrightarrow": [["rightarrow"], 3, 522, "xMaxYMin"],
  // CD minwwidth2.5pc
  xleftarrow: [["leftarrow"], 1.469, 522, "xMinYMin"],
  "\\cdleftarrow": [["leftarrow"], 3, 522, "xMinYMin"],
  Overrightarrow: [["doublerightarrow"], 0.888, 560, "xMaxYMin"],
  xRightarrow: [["doublerightarrow"], 1.526, 560, "xMaxYMin"],
  xLeftarrow: [["doubleleftarrow"], 1.526, 560, "xMinYMin"],
  overleftharpoon: [["leftharpoon"], 0.888, 522, "xMinYMin"],
  xleftharpoonup: [["leftharpoon"], 0.888, 522, "xMinYMin"],
  xleftharpoondown: [["leftharpoondown"], 0.888, 522, "xMinYMin"],
  overrightharpoon: [["rightharpoon"], 0.888, 522, "xMaxYMin"],
  xrightharpoonup: [["rightharpoon"], 0.888, 522, "xMaxYMin"],
  xrightharpoondown: [["rightharpoondown"], 0.888, 522, "xMaxYMin"],
  xlongequal: [["longequal"], 0.888, 334, "xMinYMin"],
  "\\cdlongequal": [["longequal"], 3, 334, "xMinYMin"],
  xtwoheadleftarrow: [["twoheadleftarrow"], 0.888, 334, "xMinYMin"],
  xtwoheadrightarrow: [["twoheadrightarrow"], 0.888, 334, "xMaxYMin"],
  overleftrightarrow: [["leftarrow", "rightarrow"], 0.888, 522],
  overbrace: [["leftbrace", "midbrace", "rightbrace"], 1.6, 548],
  underbrace: [["leftbraceunder", "midbraceunder", "rightbraceunder"], 1.6, 548],
  underleftrightarrow: [["leftarrow", "rightarrow"], 0.888, 522],
  xleftrightarrow: [["leftarrow", "rightarrow"], 1.75, 522],
  xLeftrightarrow: [["doubleleftarrow", "doublerightarrow"], 1.75, 560],
  xrightleftharpoons: [["leftharpoondownplus", "rightharpoonplus"], 1.75, 716],
  xleftrightharpoons: [["leftharpoonplus", "rightharpoondownplus"], 1.75, 716],
  xhookleftarrow: [["leftarrow", "righthook"], 1.08, 522],
  xhookrightarrow: [["lefthook", "rightarrow"], 1.08, 522],
  overlinesegment: [["leftlinesegment", "rightlinesegment"], 0.888, 522],
  underlinesegment: [["leftlinesegment", "rightlinesegment"], 0.888, 522],
  overbracket: [["leftbracketover", "rightbracketover"], 1.6, 440],
  underbracket: [["leftbracketunder", "rightbracketunder"], 1.6, 410],
  overgroup: [["leftgroup", "rightgroup"], 0.888, 342],
  undergroup: [["leftgroupunder", "rightgroupunder"], 0.888, 342],
  xmapsto: [["leftmapsto", "rightarrow"], 1.5, 522],
  xtofrom: [["leftToFrom", "rightToFrom"], 1.75, 528],
  // The next three arrows are from the mhchem package.
  // In mhchem.sty, min-length is 2.0em. But these arrows might appear in the
  // document as \xrightarrow or \xrightleftharpoons. Those have
  // min-length = 1.75em, so we set min-length on these next three to match.
  xrightleftarrows: [["baraboveleftarrow", "rightarrowabovebar"], 1.75, 901],
  xrightequilibrium: [["baraboveshortleftharpoon", "rightharpoonaboveshortbar"], 1.75, 716],
  xleftequilibrium: [["shortbaraboveleftharpoon", "shortrightharpoonabovebar"], 1.75, 716]
};
var wideAccentLabels = /* @__PURE__ */ new Set(["widehat", "widecheck", "widetilde", "utilde"]);
var stretchySvg = function stretchySvg2(group, options) {
  function buildSvgSpan_() {
    var viewBoxWidth = 4e5;
    var label = group.label.slice(1);
    if (wideAccentLabels.has(label) && "base" in group) {
      var numChars = group.base.type === "ordgroup" ? group.base.body.length : 1;
      var viewBoxHeight;
      var pathName;
      var _height;
      if (numChars > 5) {
        if (label === "widehat" || label === "widecheck") {
          viewBoxHeight = 420;
          viewBoxWidth = 2364;
          _height = 0.42;
          pathName = label + "4";
        } else {
          viewBoxHeight = 312;
          viewBoxWidth = 2340;
          _height = 0.34;
          pathName = "tilde4";
        }
      } else {
        var imgIndex = [1, 1, 2, 2, 3, 3][numChars];
        if (label === "widehat" || label === "widecheck") {
          viewBoxWidth = [0, 1062, 2364, 2364, 2364][imgIndex];
          viewBoxHeight = [0, 239, 300, 360, 420][imgIndex];
          _height = [0, 0.24, 0.3, 0.3, 0.36, 0.42][imgIndex];
          pathName = label + imgIndex;
        } else {
          viewBoxWidth = [0, 600, 1033, 2339, 2340][imgIndex];
          viewBoxHeight = [0, 260, 286, 306, 312][imgIndex];
          _height = [0, 0.26, 0.286, 0.3, 0.306, 0.34][imgIndex];
          pathName = "tilde" + imgIndex;
        }
      }
      var path2 = new PathNode(pathName);
      var svgNode = new SvgNode([path2], {
        "width": "100%",
        "height": makeEm(_height),
        "viewBox": "0 0 " + viewBoxWidth + " " + viewBoxHeight,
        "preserveAspectRatio": "none"
      });
      return {
        span: makeSvgSpan([], [svgNode], options),
        minWidth: 0,
        height: _height
      };
    } else {
      var spans = [];
      var data = katexImagesData[label];
      if (!data) {
        throw new Error('No SVG data for "' + label + '".');
      }
      var paths2 = data[0], _minWidth = data[1], _viewBoxHeight = data[2];
      var _height2 = _viewBoxHeight / 1e3;
      var numSvgChildren = paths2.length;
      var widthClasses;
      var aligns;
      if (numSvgChildren === 1) {
        if (data.length !== 4) {
          throw new Error('Expected 4-tuple for single-path SVG data "' + label + '".');
        }
        widthClasses = ["hide-tail"];
        aligns = [data[3]];
      } else if (numSvgChildren === 2) {
        widthClasses = ["halfarrow-left", "halfarrow-right"];
        aligns = ["xMinYMin", "xMaxYMin"];
      } else if (numSvgChildren === 3) {
        widthClasses = ["brace-left", "brace-center", "brace-right"];
        aligns = ["xMinYMin", "xMidYMin", "xMaxYMin"];
      } else {
        throw new Error("Correct katexImagesData or update code here to support\n                    " + numSvgChildren + " children.");
      }
      for (var i2 = 0; i2 < numSvgChildren; i2++) {
        var _path = new PathNode(paths2[i2]);
        var _svgNode = new SvgNode([_path], {
          "width": "400em",
          "height": makeEm(_height2),
          "viewBox": "0 0 " + viewBoxWidth + " " + _viewBoxHeight,
          "preserveAspectRatio": aligns[i2] + " slice"
        });
        var _span = makeSvgSpan([widthClasses[i2]], [_svgNode], options);
        if (numSvgChildren === 1) {
          return {
            span: _span,
            minWidth: _minWidth,
            height: _height2
          };
        } else {
          _span.style.height = makeEm(_height2);
          spans.push(_span);
        }
      }
      return {
        span: makeSpan(["katex-stretchy"], spans, options),
        minWidth: _minWidth,
        height: _height2
      };
    }
  }
  var _buildSvgSpan_ = buildSvgSpan_(), span = _buildSvgSpan_.span, minWidth = _buildSvgSpan_.minWidth, height = _buildSvgSpan_.height;
  span.height = height;
  span.style.height = makeEm(height);
  if (minWidth > 0) {
    span.style.minWidth = makeEm(minWidth);
  }
  return span;
};
var stretchyEnclose = function stretchyEnclose2(inner2, label, topPad, bottomPad, options) {
  var img;
  var totalHeight = inner2.height + inner2.depth + topPad + bottomPad;
  if (/fbox|color|angl/.test(label)) {
    img = makeSpan(["katex-stretchy", label], [], options);
    if (label === "fbox") {
      var color = options.color && options.getColor();
      if (color) {
        img.style.borderColor = color;
      }
    }
  } else {
    var lines = [];
    if (/^[bx]cancel$/.test(label)) {
      lines.push(new LineNode({
        "x1": "0",
        "y1": "0",
        "x2": "100%",
        "y2": "100%",
        "stroke-width": "0.046em"
      }));
    }
    if (/^x?cancel$/.test(label)) {
      lines.push(new LineNode({
        "x1": "0",
        "y1": "100%",
        "x2": "100%",
        "y2": "0",
        "stroke-width": "0.046em"
      }));
    }
    var svgNode = new SvgNode(lines, {
      "width": "100%",
      "height": makeEm(totalHeight)
    });
    img = makeSvgSpan([], [svgNode], options);
  }
  img.height = totalHeight;
  img.style.height = makeEm(totalHeight);
  return img;
};
var atomList = ["bin", "close", "inner", "open", "punct", "rel"];
var nonAtomList = ["accent-token", "mathord", "op-token", "spacing", "textord"];
var Atoms = new Set(atomList);
var NonAtoms = new Set(nonAtomList);
function isAtom(value) {
  return Atoms.has(value);
}
function assertNodeType(node, type) {
  if (!node || node.type !== type) {
    throw new Error("Expected node of type " + type + ", but got " + (node ? "node of type " + node.type : String(node)));
  }
  return node;
}
function assertSymbolNodeType(node) {
  var typedNode = checkSymbolNodeType(node);
  if (!typedNode) {
    throw new Error("Expected node of symbol group type, but got " + (node ? "node of type " + node.type : String(node)));
  }
  return typedNode;
}
function checkSymbolNodeType(node) {
  if (node.type === "atom" || NonAtoms.has(node.type)) {
    return node;
  }
  return null;
}
function assertCharacterGroup(group, errorMessage, allowSpaces) {
  var text3 = "";
  for (var node of group.body) {
    if (node.type === "textord") {
      text3 += node.text;
    } else if (allowSpaces && node.type === "spacing" && node.text === " ") {
      text3 += " ";
    } else {
      throw new ParseError(errorMessage, group);
    }
  }
  return text3;
}
var getBaseSymbol = (group) => {
  if (group instanceof SymbolNode) {
    return group;
  }
  if (hasHtmlDomChildren(group) && group.children.length === 1) {
    return getBaseSymbol(group.children[0]);
  }
};
var htmlBuilder$a = (grp, options) => {
  var base;
  var group;
  var supSubGroup;
  if (grp && grp.type === "supsub") {
    group = assertNodeType(grp.base, "accent");
    base = group.base;
    grp.base = base;
    supSubGroup = assertSpan(buildGroup$1(grp, options));
    grp.base = group;
  } else {
    group = assertNodeType(grp, "accent");
    base = group.base;
  }
  var body = buildGroup$1(base, options.havingCrampedStyle());
  var mustShift = group.isShifty && isCharacterBox(base);
  var skew = 0;
  if (mustShift) {
    var _getBaseSymbol$skew, _getBaseSymbol;
    skew = (_getBaseSymbol$skew = (_getBaseSymbol = getBaseSymbol(body)) == null ? void 0 : _getBaseSymbol.skew) != null ? _getBaseSymbol$skew : 0;
  }
  var accentBelow = group.label === "\\c";
  var clearance = accentBelow ? body.height + body.depth : Math.min(body.height, options.fontMetrics().xHeight);
  var accentBody;
  if (!group.isStretchy) {
    var accent2;
    var width;
    if (group.label === "\\vec") {
      accent2 = staticSvg("vec", options);
      width = svgData.vec[1];
    } else {
      accent2 = makeOrd({
        type: "textord",
        mode: group.mode,
        text: group.label
      }, options);
      accent2 = assertSymbolDomNode(accent2);
      accent2.italic = 0;
      width = accent2.width;
      if (accentBelow) {
        clearance += accent2.depth;
      }
    }
    accentBody = makeSpan(["accent-body"], [accent2]);
    var accentFull = group.label === "\\textcircled";
    if (accentFull) {
      accentBody.classes.push("accent-full");
      clearance = body.height;
    }
    var left = skew;
    if (!accentFull) {
      left -= width / 2;
    }
    accentBody.style.left = makeEm(left);
    if (group.label === "\\textcircled") {
      accentBody.style.top = ".2em";
    }
    accentBody = makeVList({
      positionType: "firstBaseline",
      children: [{
        type: "elem",
        elem: body
      }, {
        type: "kern",
        size: -clearance
      }, {
        type: "elem",
        elem: accentBody
      }]
    });
  } else {
    accentBody = stretchySvg(group, options);
    accentBody = makeVList({
      positionType: "firstBaseline",
      children: [{
        type: "elem",
        elem: body
      }, {
        type: "elem",
        elem: accentBody,
        wrapperClasses: ["svg-align"],
        wrapperStyle: skew > 0 ? {
          width: "calc(100% - " + makeEm(2 * skew) + ")",
          marginLeft: makeEm(2 * skew)
        } : void 0
      }]
    });
  }
  var accentWrap = makeSpan(["mord", "katex-accent"], [accentBody], options);
  if (supSubGroup) {
    supSubGroup.children[0] = accentWrap;
    supSubGroup.height = Math.max(accentWrap.height, supSubGroup.height);
    supSubGroup.classes[0] = "mord";
    return supSubGroup;
  } else {
    return accentWrap;
  }
};
var mathmlBuilder$9 = (group, options) => {
  var accentNode = group.isStretchy ? stretchyMathML(group.label) : new MathNode("mo", [makeText(group.label, group.mode)]);
  var node = new MathNode("mover", [buildGroup2(group.base, options), accentNode]);
  node.setAttribute("accent", "true");
  return node;
};
var NON_STRETCHY_ACCENT_REGEX = new RegExp(["\\acute", "\\grave", "\\ddot", "\\tilde", "\\bar", "\\breve", "\\check", "\\hat", "\\vec", "\\dot", "\\mathring"].map((accent2) => "\\" + accent2).join("|"));
defineFunction({
  type: "accent",
  names: ["\\acute", "\\grave", "\\ddot", "\\tilde", "\\bar", "\\breve", "\\check", "\\hat", "\\vec", "\\dot", "\\mathring", "\\widecheck", "\\widehat", "\\widetilde", "\\overrightarrow", "\\overleftarrow", "\\Overrightarrow", "\\overleftrightarrow", "\\overgroup", "\\overlinesegment", "\\overleftharpoon", "\\overrightharpoon"],
  numArgs: 1,
  handler: (context, args) => {
    var base = normalizeArgument(args[0]);
    var isStretchy = !NON_STRETCHY_ACCENT_REGEX.test(context.funcName);
    var isShifty = !isStretchy || context.funcName === "\\widehat" || context.funcName === "\\widetilde" || context.funcName === "\\widecheck";
    return {
      type: "accent",
      mode: context.parser.mode,
      label: context.funcName,
      isStretchy,
      isShifty,
      base
    };
  },
  htmlBuilder: htmlBuilder$a,
  mathmlBuilder: mathmlBuilder$9
});
defineFunction({
  type: "accent",
  names: ["\\'", "\\`", "\\^", "\\~", "\\=", "\\u", "\\.", '\\"', "\\c", "\\r", "\\H", "\\v", "\\textcircled"],
  numArgs: 1,
  allowedInText: true,
  allowedInMath: true,
  // unless in strict mode
  argTypes: ["primitive"],
  handler: (context, args) => {
    var base = args[0];
    var mode = context.parser.mode;
    if (mode === "math") {
      handleStrict({
        strict: context.parser.settings.strict,
        errorCode: "mathVsTextAccents",
        errorMsg: "LaTeX's accent " + context.funcName + " works only in text mode",
        report: true
      });
      mode = "text";
    }
    return {
      type: "accent",
      mode,
      label: context.funcName,
      isStretchy: false,
      isShifty: true,
      base
    };
  }
});
defineFunction({
  type: "accentUnder",
  names: ["\\underleftarrow", "\\underrightarrow", "\\underleftrightarrow", "\\undergroup", "\\underlinesegment", "\\utilde"],
  numArgs: 1,
  handler: (_ref2, args) => {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    var base = args[0];
    return {
      type: "accentUnder",
      mode: parser.mode,
      label: funcName,
      base
    };
  },
  htmlBuilder: (group, options) => {
    var innerGroup = buildGroup$1(group.base, options);
    var accentBody = stretchySvg(group, options);
    var kern = group.label === "\\utilde" ? 0.12 : 0;
    var vlist = makeVList({
      positionType: "top",
      positionData: innerGroup.height,
      children: [{
        type: "elem",
        elem: accentBody,
        wrapperClasses: ["svg-align"]
      }, {
        type: "kern",
        size: kern
      }, {
        type: "elem",
        elem: innerGroup
      }]
    });
    return makeSpan(["mord", "accentunder"], [vlist], options);
  },
  mathmlBuilder: (group, options) => {
    var accentNode = stretchyMathML(group.label);
    var node = new MathNode("munder", [buildGroup2(group.base, options), accentNode]);
    node.setAttribute("accentunder", "true");
    return node;
  }
});
var paddedNode = (group) => {
  var node = new MathNode("mpadded", group ? [group] : []);
  node.setAttribute("width", "+0.6em");
  node.setAttribute("lspace", "0.3em");
  return node;
};
defineFunction({
  type: "xArrow",
  names: [
    "\\xleftarrow",
    "\\xrightarrow",
    "\\xLeftarrow",
    "\\xRightarrow",
    "\\xleftrightarrow",
    "\\xLeftrightarrow",
    "\\xhookleftarrow",
    "\\xhookrightarrow",
    "\\xmapsto",
    "\\xrightharpoondown",
    "\\xrightharpoonup",
    "\\xleftharpoondown",
    "\\xleftharpoonup",
    "\\xrightleftharpoons",
    "\\xleftrightharpoons",
    "\\xlongequal",
    "\\xtwoheadrightarrow",
    "\\xtwoheadleftarrow",
    "\\xtofrom",
    // The next 3 functions are here to support the mhchem extension.
    // Direct use of these functions is discouraged and may break someday.
    "\\xrightleftarrows",
    "\\xrightequilibrium",
    "\\xleftequilibrium",
    // The next 3 functions are here only to support the {CD} environment.
    "\\\\cdrightarrow",
    "\\\\cdleftarrow",
    "\\\\cdlongequal"
  ],
  numArgs: 1,
  numOptionalArgs: 1,
  handler(_ref2, args, optArgs) {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    return {
      type: "xArrow",
      mode: parser.mode,
      label: funcName,
      body: args[0],
      below: optArgs[0]
    };
  },
  htmlBuilder(group, options) {
    var style = options.style;
    var newOptions = options.havingStyle(style.sup());
    var upperGroup = wrapFragment(buildGroup$1(group.body, newOptions, options), options);
    var arrowPrefix = group.label.slice(0, 2) === "\\x" ? "x" : "cd";
    upperGroup.classes.push(arrowPrefix + "-arrow-pad");
    var lowerGroup;
    if (group.below) {
      newOptions = options.havingStyle(style.sub());
      lowerGroup = wrapFragment(buildGroup$1(group.below, newOptions, options), options);
      lowerGroup.classes.push(arrowPrefix + "-arrow-pad");
    }
    var arrowBody = stretchySvg(group, options);
    var arrowShift = -options.fontMetrics().axisHeight + 0.5 * arrowBody.height;
    var upperShift = -options.fontMetrics().axisHeight - 0.5 * arrowBody.height - 0.111;
    if (upperGroup.depth > 0.25 || group.label === "\\xleftequilibrium") {
      upperShift -= upperGroup.depth;
    }
    var vlist;
    if (lowerGroup) {
      var lowerShift = -options.fontMetrics().axisHeight + lowerGroup.height + 0.5 * arrowBody.height + 0.111;
      vlist = makeVList({
        positionType: "individualShift",
        children: [{
          type: "elem",
          elem: upperGroup,
          shift: upperShift
        }, {
          type: "elem",
          elem: arrowBody,
          shift: arrowShift,
          wrapperClasses: ["svg-align"]
        }, {
          type: "elem",
          elem: lowerGroup,
          shift: lowerShift
        }]
      });
    } else {
      vlist = makeVList({
        positionType: "individualShift",
        children: [{
          type: "elem",
          elem: upperGroup,
          shift: upperShift
        }, {
          type: "elem",
          elem: arrowBody,
          shift: arrowShift,
          wrapperClasses: ["svg-align"]
        }]
      });
    }
    return makeSpan(["mrel", "x-arrow"], [vlist], options);
  },
  mathmlBuilder(group, options) {
    var arrowNode = stretchyMathML(group.label);
    arrowNode.setAttribute("minsize", group.label.charAt(0) === "x" ? "1.75em" : "3.0em");
    var node;
    if (group.body) {
      var upperNode = paddedNode(buildGroup2(group.body, options));
      if (group.below) {
        var lowerNode = paddedNode(buildGroup2(group.below, options));
        node = new MathNode("munderover", [arrowNode, lowerNode, upperNode]);
      } else {
        node = new MathNode("mover", [arrowNode, upperNode]);
      }
    } else if (group.below) {
      var _lowerNode = paddedNode(buildGroup2(group.below, options));
      node = new MathNode("munder", [arrowNode, _lowerNode]);
    } else {
      node = paddedNode();
      node = new MathNode("mover", [arrowNode, node]);
    }
    return node;
  }
});
function htmlBuilder$9(group, options) {
  var elements = buildExpression$1(group.body, options, true);
  return makeSpan([group.mclass], elements, options);
}
function mathmlBuilder$8(group, options) {
  var node;
  var inner2 = buildExpression2(group.body, options);
  if (group.mclass === "minner") {
    node = new MathNode("mpadded", inner2);
  } else if (group.mclass === "mord") {
    if (group.isCharacterBox) {
      node = inner2[0];
      node.type = "mi";
    } else {
      node = new MathNode("mi", inner2);
    }
  } else {
    if (group.isCharacterBox) {
      node = inner2[0];
      node.type = "mo";
    } else {
      node = new MathNode("mo", inner2);
    }
    if (group.mclass === "mbin") {
      node.attributes.lspace = "0.22em";
      node.attributes.rspace = "0.22em";
    } else if (group.mclass === "mpunct") {
      node.attributes.lspace = "0em";
      node.attributes.rspace = "0.17em";
    } else if (group.mclass === "mopen" || group.mclass === "mclose") {
      node.attributes.lspace = "0em";
      node.attributes.rspace = "0em";
    }
  }
  return node;
}
defineFunction({
  type: "mclass",
  names: ["\\mathord", "\\mathbin", "\\mathrel", "\\mathopen", "\\mathclose", "\\mathpunct", "\\mathinner"],
  numArgs: 1,
  primitive: true,
  handler(_ref2, args) {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    var body = args[0];
    return {
      type: "mclass",
      mode: parser.mode,
      mclass: "m" + funcName.slice(5),
      body: ordargument(body),
      isCharacterBox: isCharacterBox(body)
    };
  },
  htmlBuilder: htmlBuilder$9,
  mathmlBuilder: mathmlBuilder$8
});
var binrelClass = (arg) => {
  var atom = arg.type === "ordgroup" && arg.body.length ? arg.body[0] : arg;
  if (atom.type === "atom" && (atom.family === "bin" || atom.family === "rel")) {
    return "m" + atom.family;
  } else {
    return "mord";
  }
};
defineFunction({
  type: "mclass",
  names: ["\\@binrel"],
  numArgs: 2,
  handler(_ref2, args) {
    var parser = _ref2.parser;
    return {
      type: "mclass",
      mode: parser.mode,
      mclass: binrelClass(args[0]),
      body: ordargument(args[1]),
      isCharacterBox: isCharacterBox(args[1])
    };
  }
});
defineFunction({
  type: "mclass",
  names: ["\\stackrel", "\\overset", "\\underset"],
  numArgs: 2,
  handler(_ref3, args) {
    var parser = _ref3.parser, funcName = _ref3.funcName;
    var baseArg = args[1];
    var shiftedArg = args[0];
    var mclass;
    if (funcName !== "\\stackrel") {
      mclass = binrelClass(baseArg);
    } else {
      mclass = "mrel";
    }
    var baseOp = {
      type: "op",
      mode: baseArg.mode,
      limits: true,
      alwaysHandleSupSub: true,
      parentIsSupSub: false,
      symbol: false,
      suppressBaseShift: funcName !== "\\stackrel",
      body: ordargument(baseArg)
    };
    var supsub = funcName === "\\underset" ? {
      type: "supsub",
      mode: shiftedArg.mode,
      base: baseOp,
      sub: shiftedArg
    } : {
      type: "supsub",
      mode: shiftedArg.mode,
      base: baseOp,
      sup: shiftedArg
    };
    return {
      type: "mclass",
      mode: parser.mode,
      mclass,
      body: [supsub],
      isCharacterBox: isCharacterBox(supsub)
    };
  }
});
defineFunction({
  type: "pmb",
  names: ["\\pmb"],
  numArgs: 1,
  allowedInText: true,
  handler(_ref2, args) {
    var parser = _ref2.parser;
    return {
      type: "pmb",
      mode: parser.mode,
      mclass: binrelClass(args[0]),
      body: ordargument(args[0])
    };
  },
  htmlBuilder(group, options) {
    var elements = buildExpression$1(group.body, options, true);
    var node = makeSpan([group.mclass], elements, options);
    node.style.textShadow = "0.02em 0.01em 0.04px";
    return node;
  },
  mathmlBuilder(group, style) {
    var inner2 = buildExpression2(group.body, style);
    var node = new MathNode("mstyle", inner2);
    node.setAttribute("style", "text-shadow: 0.02em 0.01em 0.04px");
    return node;
  }
});
var cdArrowFunctionName = {
  ">": "\\\\cdrightarrow",
  "<": "\\\\cdleftarrow",
  "=": "\\\\cdlongequal",
  "A": "\\uparrow",
  "V": "\\downarrow",
  "|": "\\Vert",
  ".": "no arrow"
};
var newCell = () => {
  return {
    type: "styling",
    body: [],
    mode: "math",
    style: "display",
    resetFont: true
  };
};
var isStartOfArrow = (node) => {
  return node.type === "textord" && node.text === "@";
};
var isLabelEnd = (node, endChar) => {
  return (node.type === "mathord" || node.type === "atom") && node.text === endChar;
};
function cdArrow(arrowChar, labels2, parser) {
  var funcName = cdArrowFunctionName[arrowChar];
  switch (funcName) {
    case "\\\\cdrightarrow":
    case "\\\\cdleftarrow":
      return parser.callFunction(funcName, [labels2[0]], [labels2[1]]);
    case "\\uparrow":
    case "\\downarrow": {
      var leftLabel = parser.callFunction("\\\\cdleft", [labels2[0]], []);
      var bareArrow = {
        type: "atom",
        text: funcName,
        mode: "math",
        family: "rel"
      };
      var sizedArrow = parser.callFunction("\\Big", [bareArrow], []);
      var rightLabel = parser.callFunction("\\\\cdright", [labels2[1]], []);
      var arrowGroup = {
        type: "ordgroup",
        mode: "math",
        body: [leftLabel, sizedArrow, rightLabel]
      };
      return parser.callFunction("\\\\cdparent", [arrowGroup], []);
    }
    case "\\\\cdlongequal":
      return parser.callFunction("\\\\cdlongequal", [], []);
    case "\\Vert": {
      var arrow = {
        type: "textord",
        text: "\\Vert",
        mode: "math"
      };
      return parser.callFunction("\\Big", [arrow], []);
    }
    default:
      return {
        type: "textord",
        text: " ",
        mode: "math"
      };
  }
}
function parseCD(parser) {
  var parsedRows = [];
  parser.gullet.beginGroup();
  parser.gullet.macros.set("\\cr", "\\\\\\relax");
  parser.gullet.beginGroup();
  while (true) {
    parsedRows.push(parser.parseExpression(false, "\\\\"));
    parser.gullet.endGroup();
    parser.gullet.beginGroup();
    var next = parser.fetch().text;
    if (next === "&" || next === "\\\\") {
      parser.consume();
    } else if (next === "\\end") {
      if (parsedRows[parsedRows.length - 1].length === 0) {
        parsedRows.pop();
      }
      break;
    } else {
      throw new ParseError("Expected \\\\ or \\cr or \\end", parser.nextToken);
    }
  }
  var row = [];
  var body = [row];
  for (var i2 = 0; i2 < parsedRows.length; i2++) {
    var rowNodes = parsedRows[i2];
    var cell = newCell();
    for (var j2 = 0; j2 < rowNodes.length; j2++) {
      if (!isStartOfArrow(rowNodes[j2])) {
        cell.body.push(rowNodes[j2]);
      } else {
        row.push(cell);
        j2 += 1;
        var arrowChar = assertSymbolNodeType(rowNodes[j2]).text;
        var labels2 = new Array(2);
        labels2[0] = {
          type: "ordgroup",
          mode: "math",
          body: []
        };
        labels2[1] = {
          type: "ordgroup",
          mode: "math",
          body: []
        };
        if ("=|.".includes(arrowChar)) ;
        else if ("<>AV".includes(arrowChar)) {
          for (var labelNum = 0; labelNum < 2; labelNum++) {
            var inLabel = true;
            for (var k = j2 + 1; k < rowNodes.length; k++) {
              if (isLabelEnd(rowNodes[k], arrowChar)) {
                inLabel = false;
                j2 = k;
                break;
              }
              if (isStartOfArrow(rowNodes[k])) {
                throw new ParseError("Missing a " + arrowChar + " character to complete a CD arrow.", rowNodes[k]);
              }
              labels2[labelNum].body.push(rowNodes[k]);
            }
            if (inLabel) {
              throw new ParseError("Missing a " + arrowChar + " character to complete a CD arrow.", rowNodes[j2]);
            }
          }
        } else {
          throw new ParseError('Expected one of "<>AV=|." after @', rowNodes[j2]);
        }
        var arrow = cdArrow(arrowChar, labels2, parser);
        var wrappedArrow = {
          type: "styling",
          body: [arrow],
          mode: "math",
          style: "display",
          // CD is always displaystyle.
          resetFont: true
        };
        row.push(wrappedArrow);
        cell = newCell();
      }
    }
    if (i2 % 2 === 0) {
      row.push(cell);
    } else {
      row.shift();
    }
    row = [];
    body.push(row);
  }
  parser.gullet.endGroup();
  parser.gullet.endGroup();
  var cols = new Array(body[0].length).fill({
    type: "align",
    align: "c",
    pregap: 0.25,
    // CD package sets \enskip between columns.
    postgap: 0.25
    // So pre and post each get half an \enskip, i.e. 0.25em.
  });
  return {
    type: "array",
    mode: "math",
    body,
    arraystretch: 1,
    addJot: true,
    rowGaps: [null],
    cols,
    colSeparationType: "CD",
    hLinesBeforeRow: new Array(body.length + 1).fill([])
  };
}
defineFunction({
  type: "cdlabel",
  names: ["\\\\cdleft", "\\\\cdright"],
  numArgs: 1,
  handler(_ref2, args) {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    return {
      type: "cdlabel",
      mode: parser.mode,
      side: funcName.slice(4),
      label: args[0]
    };
  },
  htmlBuilder(group, options) {
    var newOptions = options.havingStyle(options.style.sup());
    var label = wrapFragment(buildGroup$1(group.label, newOptions, options), options);
    label.classes.push("cd-label-" + group.side);
    label.style.bottom = makeEm(0.8 - label.depth);
    label.height = 0;
    label.depth = 0;
    return label;
  },
  mathmlBuilder(group, options) {
    var label = new MathNode("mrow", [buildGroup2(group.label, options)]);
    label = new MathNode("mpadded", [label]);
    label.setAttribute("width", "0");
    if (group.side === "left") {
      label.setAttribute("lspace", "-1width");
    }
    label.setAttribute("voffset", "0.7em");
    label = new MathNode("mstyle", [label]);
    label.setAttribute("displaystyle", "false");
    label.setAttribute("scriptlevel", "1");
    return label;
  }
});
defineFunction({
  type: "cdlabelparent",
  names: ["\\\\cdparent"],
  numArgs: 1,
  handler(_ref2, args) {
    var parser = _ref2.parser;
    return {
      type: "cdlabelparent",
      mode: parser.mode,
      fragment: args[0]
    };
  },
  htmlBuilder(group, options) {
    var parent = wrapFragment(buildGroup$1(group.fragment, options), options);
    parent.classes.push("cd-vert-arrow");
    return parent;
  },
  mathmlBuilder(group, options) {
    return new MathNode("mrow", [buildGroup2(group.fragment, options)]);
  }
});
defineFunction({
  type: "textord",
  names: ["\\@char"],
  numArgs: 1,
  allowedInText: true,
  handler(_ref2, args) {
    var parser = _ref2.parser;
    var arg = assertNodeType(args[0], "ordgroup");
    var number = assertCharacterGroup(arg, "\\@char has non-numeric argument");
    var code = parseInt(number);
    var text3;
    if (isNaN(code)) {
      throw new ParseError("\\@char has non-numeric argument " + number);
    } else if (code < 0 || code > 1114111) {
      throw new ParseError("\\@char with invalid code point " + number);
    } else if (code <= 65535) {
      text3 = String.fromCharCode(code);
    } else {
      code -= 65536;
      text3 = String.fromCharCode((code >> 10) + 55296, (code & 1023) + 56320);
    }
    return {
      type: "textord",
      mode: parser.mode,
      text: text3
    };
  }
});
var htmlBuilder$8 = (group, options) => {
  var elements = buildExpression$1(group.body, options.withColor(group.color), false);
  return makeFragment(elements);
};
var mathmlBuilder$7 = (group, options) => {
  var inner2 = buildExpression2(group.body, options.withColor(group.color));
  var node = new MathNode("mstyle", inner2);
  node.setAttribute("mathcolor", group.color);
  return node;
};
defineFunction({
  type: "color",
  names: ["\\textcolor"],
  numArgs: 2,
  allowedInText: true,
  argTypes: ["color", "original"],
  handler(_ref2, args) {
    var parser = _ref2.parser;
    var color = assertNodeType(args[0], "color-token").color;
    var body = args[1];
    return {
      type: "color",
      mode: parser.mode,
      color,
      body: ordargument(body)
    };
  },
  htmlBuilder: htmlBuilder$8,
  mathmlBuilder: mathmlBuilder$7
});
defineFunction({
  type: "color",
  names: ["\\color"],
  numArgs: 1,
  allowedInText: true,
  argTypes: ["color"],
  handler(_ref2, args) {
    var parser = _ref2.parser, breakOnTokenText = _ref2.breakOnTokenText;
    var color = assertNodeType(args[0], "color-token").color;
    parser.gullet.macros.set("\\current@color", color);
    var body = parser.parseExpression(true, breakOnTokenText);
    return {
      type: "color",
      mode: parser.mode,
      color,
      body
    };
  }
});
defineFunction({
  type: "cr",
  names: ["\\\\"],
  numArgs: 0,
  numOptionalArgs: 0,
  allowedInText: true,
  handler(_ref2) {
    var parser = _ref2.parser;
    var size = parser.gullet.future().text === "[" ? parser.parseSizeGroup(true) : null;
    var newLine = !parser.settings.displayMode || !handleStrict({
      strict: parser.settings.strict,
      errorCode: "newLineInDisplayMode",
      errorMsg: "In LaTeX, \\\\ or \\newline does nothing in display mode",
      report: false
    });
    return {
      type: "cr",
      mode: parser.mode,
      newLine,
      size: size && assertNodeType(size, "size").value
    };
  },
  // The following builders are called only at the top level,
  // not within tabular/array environments.
  htmlBuilder(group, options) {
    var span = makeSpan(["mspace"], [], options);
    if (group.newLine) {
      span.classes.push("katex-newline");
      if (group.size) {
        span.style.marginTop = makeEm(calculateSize(group.size, options));
      }
    }
    return span;
  },
  mathmlBuilder(group, options) {
    var node = new MathNode("mspace");
    if (group.newLine) {
      node.setAttribute("linebreak", "newline");
      if (group.size) {
        node.setAttribute("height", makeEm(calculateSize(group.size, options)));
      }
    }
    return node;
  }
});
var globalMap = {
  "\\global": "\\global",
  "\\long": "\\\\globallong",
  "\\\\globallong": "\\\\globallong",
  "\\def": "\\gdef",
  "\\gdef": "\\gdef",
  "\\edef": "\\xdef",
  "\\xdef": "\\xdef",
  "\\let": "\\\\globallet",
  "\\futurelet": "\\\\globalfuture"
};
var checkControlSequence = (tok) => {
  var name = tok.text;
  if (/^(?:[\\{}$&#^_]|EOF)$/.test(name)) {
    throw new ParseError("Expected a control sequence", tok);
  }
  return name;
};
var getRHS = (parser) => {
  var tok = parser.gullet.popToken();
  if (tok.text === "=") {
    tok = parser.gullet.popToken();
    if (tok.text === " ") {
      tok = parser.gullet.popToken();
    }
  }
  return tok;
};
var letCommand = (parser, name, tok, global) => {
  var macro = parser.gullet.macros.get(tok.text);
  if (macro == null) {
    tok.noexpand = true;
    macro = {
      tokens: [tok],
      numArgs: 0,
      // reproduce the same behavior in expansion
      unexpandable: !parser.gullet.isExpandable(tok.text)
    };
  }
  parser.gullet.macros.set(name, macro, global);
};
defineFunction({
  type: "internal",
  names: [
    "\\global",
    "\\long",
    "\\\\globallong"
    // can’t be entered directly
  ],
  numArgs: 0,
  allowedInText: true,
  handler(_ref2) {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    parser.consumeSpaces();
    var token = parser.fetch();
    if (globalMap[token.text]) {
      if (funcName === "\\global" || funcName === "\\\\globallong") {
        token.text = globalMap[token.text];
      }
      return assertNodeType(parser.parseFunction(), "internal");
    }
    throw new ParseError("Invalid token after macro prefix", token);
  }
});
defineFunction({
  type: "internal",
  names: ["\\def", "\\gdef", "\\edef", "\\xdef"],
  numArgs: 0,
  allowedInText: true,
  primitive: true,
  handler(_ref2) {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    var tok = parser.gullet.popToken();
    var name = tok.text;
    if (/^(?:[\\{}$&#^_]|EOF)$/.test(name)) {
      throw new ParseError("Expected a control sequence", tok);
    }
    var numArgs = 0;
    var insert;
    var delimiters2 = [[]];
    while (parser.gullet.future().text !== "{") {
      tok = parser.gullet.popToken();
      if (tok.text === "#") {
        if (parser.gullet.future().text === "{") {
          insert = parser.gullet.future();
          delimiters2[numArgs].push("{");
          break;
        }
        tok = parser.gullet.popToken();
        if (!/^[1-9]$/.test(tok.text)) {
          throw new ParseError('Invalid argument number "' + tok.text + '"');
        }
        if (parseInt(tok.text) !== numArgs + 1) {
          throw new ParseError('Argument number "' + tok.text + '" out of order');
        }
        numArgs++;
        delimiters2.push([]);
      } else if (tok.text === "EOF") {
        throw new ParseError("Expected a macro definition");
      } else {
        delimiters2[numArgs].push(tok.text);
      }
    }
    var _parser$gullet$consum = parser.gullet.consumeArg(), tokens = _parser$gullet$consum.tokens;
    if (insert) {
      tokens.unshift(insert);
    }
    if (funcName === "\\edef" || funcName === "\\xdef") {
      tokens = parser.gullet.expandTokens(tokens);
      tokens.reverse();
    }
    parser.gullet.macros.set(name, {
      tokens,
      numArgs,
      delimiters: delimiters2
    }, funcName === globalMap[funcName]);
    return {
      type: "internal",
      mode: parser.mode
    };
  }
});
defineFunction({
  type: "internal",
  names: [
    "\\let",
    "\\\\globallet"
    // can’t be entered directly
  ],
  numArgs: 0,
  allowedInText: true,
  primitive: true,
  handler(_ref3) {
    var parser = _ref3.parser, funcName = _ref3.funcName;
    var name = checkControlSequence(parser.gullet.popToken());
    parser.gullet.consumeSpaces();
    var tok = getRHS(parser);
    letCommand(parser, name, tok, funcName === "\\\\globallet");
    return {
      type: "internal",
      mode: parser.mode
    };
  }
});
defineFunction({
  type: "internal",
  names: [
    "\\futurelet",
    "\\\\globalfuture"
    // can’t be entered directly
  ],
  numArgs: 0,
  allowedInText: true,
  primitive: true,
  handler(_ref4) {
    var parser = _ref4.parser, funcName = _ref4.funcName;
    var name = checkControlSequence(parser.gullet.popToken());
    var middle = parser.gullet.popToken();
    var tok = parser.gullet.popToken();
    letCommand(parser, name, tok, funcName === "\\\\globalfuture");
    parser.gullet.pushToken(tok);
    parser.gullet.pushToken(middle);
    return {
      type: "internal",
      mode: parser.mode
    };
  }
});
var getMetrics = function getMetrics2(symbol, font, mode) {
  var replace = symbols.math[symbol] && symbols.math[symbol].replace;
  var metrics2 = getCharacterMetrics(replace || symbol, font, mode);
  if (!metrics2) {
    throw new Error("Unsupported symbol " + symbol + " and font size " + font + ".");
  }
  return metrics2;
};
var styleWrap = function styleWrap2(delim, toStyle, options, classes) {
  var newOptions = options.havingBaseStyle(toStyle);
  var span = makeSpan(classes.concat(newOptions.sizingClasses(options)), [delim], options);
  var delimSizeMultiplier = newOptions.sizeMultiplier / options.sizeMultiplier;
  span.height *= delimSizeMultiplier;
  span.depth *= delimSizeMultiplier;
  span.maxFontSize = newOptions.sizeMultiplier;
  return span;
};
var centerSpan = function centerSpan2(span, options, style) {
  var newOptions = options.havingBaseStyle(style);
  var shift = (1 - options.sizeMultiplier / newOptions.sizeMultiplier) * options.fontMetrics().axisHeight;
  span.classes.push("delimcenter");
  span.style.top = makeEm(shift);
  span.height -= shift;
  span.depth += shift;
};
var makeSmallDelim = function makeSmallDelim2(delim, style, center, options, mode, classes) {
  var text3 = makeSymbol(delim, "Main-Regular", mode, options);
  var span = styleWrap(text3, style, options, classes);
  if (center) {
    centerSpan(span, options, style);
  }
  return span;
};
var mathrmSize = function mathrmSize2(value, size, mode, options) {
  return makeSymbol(value, "Size" + size + "-Regular", mode, options);
};
var makeLargeDelim = function makeLargeDelim2(delim, size, center, options, mode, classes) {
  var inner2 = mathrmSize(delim, size, mode, options);
  var span = styleWrap(makeSpan(["delimsizing", "size" + size], [inner2], options), Style$1.TEXT, options, classes);
  if (center) {
    centerSpan(span, options, Style$1.TEXT);
  }
  return span;
};
var makeGlyphSpan = function makeGlyphSpan2(symbol, font, mode, options) {
  var sizeClass;
  if (font === "Size1-Regular") {
    sizeClass = "delim-size1";
  } else {
    sizeClass = "delim-size4";
  }
  var corner = makeSpan(["delimsizinginner", sizeClass], [makeSpan([], [makeSymbol(symbol, font, mode, options)])]);
  return {
    type: "elem",
    elem: corner
  };
};
var makeInner = function makeInner2(ch2, height, options) {
  var width = fontMetricsData["Size4-Regular"][ch2.charCodeAt(0)] ? fontMetricsData["Size4-Regular"][ch2.charCodeAt(0)][4] : fontMetricsData["Size1-Regular"][ch2.charCodeAt(0)][4];
  var path2 = new PathNode("inner", innerPath(ch2, Math.round(1e3 * height)));
  var svgNode = new SvgNode([path2], {
    "width": makeEm(width),
    "height": makeEm(height),
    // Override CSS rule `.katex svg { width: 100% }`
    "style": "width:" + makeEm(width),
    "viewBox": "0 0 " + 1e3 * width + " " + Math.round(1e3 * height),
    "preserveAspectRatio": "xMinYMin"
  });
  var span = makeSvgSpan([], [svgNode], options);
  span.height = height;
  span.style.height = makeEm(height);
  span.style.width = makeEm(width);
  return {
    type: "elem",
    elem: span
  };
};
var lapInEms = 8e-3;
var lap = {
  type: "kern",
  size: -1 * lapInEms
};
var verts = /* @__PURE__ */ new Set(["|", "\\lvert", "\\rvert", "\\vert"]);
var doubleVerts = /* @__PURE__ */ new Set(["\\|", "\\lVert", "\\rVert", "\\Vert"]);
var makeStackedDelim = function makeStackedDelim2(delim, heightTotal, center, options, mode, classes) {
  var top;
  var middle;
  var repeat;
  var bottom;
  var svgLabel = "";
  var viewBoxWidth = 0;
  top = repeat = bottom = delim;
  middle = null;
  var font = "Size1-Regular";
  if (delim === "\\uparrow") {
    repeat = bottom = "\u23D0";
  } else if (delim === "\\Uparrow") {
    repeat = bottom = "\u2016";
  } else if (delim === "\\downarrow") {
    top = repeat = "\u23D0";
  } else if (delim === "\\Downarrow") {
    top = repeat = "\u2016";
  } else if (delim === "\\updownarrow") {
    top = "\\uparrow";
    repeat = "\u23D0";
    bottom = "\\downarrow";
  } else if (delim === "\\Updownarrow") {
    top = "\\Uparrow";
    repeat = "\u2016";
    bottom = "\\Downarrow";
  } else if (verts.has(delim)) {
    repeat = "\u2223";
    svgLabel = "vert";
    viewBoxWidth = 333;
  } else if (doubleVerts.has(delim)) {
    repeat = "\u2225";
    svgLabel = "doublevert";
    viewBoxWidth = 556;
  } else if (delim === "[" || delim === "\\lbrack") {
    top = "\u23A1";
    repeat = "\u23A2";
    bottom = "\u23A3";
    font = "Size4-Regular";
    svgLabel = "lbrack";
    viewBoxWidth = 667;
  } else if (delim === "]" || delim === "\\rbrack") {
    top = "\u23A4";
    repeat = "\u23A5";
    bottom = "\u23A6";
    font = "Size4-Regular";
    svgLabel = "rbrack";
    viewBoxWidth = 667;
  } else if (delim === "\\lfloor" || delim === "\u230A") {
    repeat = top = "\u23A2";
    bottom = "\u23A3";
    font = "Size4-Regular";
    svgLabel = "lfloor";
    viewBoxWidth = 667;
  } else if (delim === "\\lceil" || delim === "\u2308") {
    top = "\u23A1";
    repeat = bottom = "\u23A2";
    font = "Size4-Regular";
    svgLabel = "lceil";
    viewBoxWidth = 667;
  } else if (delim === "\\rfloor" || delim === "\u230B") {
    repeat = top = "\u23A5";
    bottom = "\u23A6";
    font = "Size4-Regular";
    svgLabel = "rfloor";
    viewBoxWidth = 667;
  } else if (delim === "\\rceil" || delim === "\u2309") {
    top = "\u23A4";
    repeat = bottom = "\u23A5";
    font = "Size4-Regular";
    svgLabel = "rceil";
    viewBoxWidth = 667;
  } else if (delim === "(" || delim === "\\lparen") {
    top = "\u239B";
    repeat = "\u239C";
    bottom = "\u239D";
    font = "Size4-Regular";
    svgLabel = "lparen";
    viewBoxWidth = 875;
  } else if (delim === ")" || delim === "\\rparen") {
    top = "\u239E";
    repeat = "\u239F";
    bottom = "\u23A0";
    font = "Size4-Regular";
    svgLabel = "rparen";
    viewBoxWidth = 875;
  } else if (delim === "\\{" || delim === "\\lbrace") {
    top = "\u23A7";
    middle = "\u23A8";
    bottom = "\u23A9";
    repeat = "\u23AA";
    font = "Size4-Regular";
  } else if (delim === "\\}" || delim === "\\rbrace") {
    top = "\u23AB";
    middle = "\u23AC";
    bottom = "\u23AD";
    repeat = "\u23AA";
    font = "Size4-Regular";
  } else if (delim === "\\lgroup" || delim === "\u27EE") {
    top = "\u23A7";
    bottom = "\u23A9";
    repeat = "\u23AA";
    font = "Size4-Regular";
  } else if (delim === "\\rgroup" || delim === "\u27EF") {
    top = "\u23AB";
    bottom = "\u23AD";
    repeat = "\u23AA";
    font = "Size4-Regular";
  } else if (delim === "\\lmoustache" || delim === "\u23B0") {
    top = "\u23A7";
    bottom = "\u23AD";
    repeat = "\u23AA";
    font = "Size4-Regular";
  } else if (delim === "\\rmoustache" || delim === "\u23B1") {
    top = "\u23AB";
    bottom = "\u23A9";
    repeat = "\u23AA";
    font = "Size4-Regular";
  }
  var topMetrics = getMetrics(top, font, mode);
  var topHeightTotal = topMetrics.height + topMetrics.depth;
  var repeatMetrics = getMetrics(repeat, font, mode);
  var repeatHeightTotal = repeatMetrics.height + repeatMetrics.depth;
  var bottomMetrics = getMetrics(bottom, font, mode);
  var bottomHeightTotal = bottomMetrics.height + bottomMetrics.depth;
  var middleHeightTotal = 0;
  var middleFactor = 1;
  if (middle !== null) {
    var middleMetrics = getMetrics(middle, font, mode);
    middleHeightTotal = middleMetrics.height + middleMetrics.depth;
    middleFactor = 2;
  }
  var minHeight = topHeightTotal + bottomHeightTotal + middleHeightTotal;
  var repeatCount = Math.max(0, Math.ceil((heightTotal - minHeight) / (middleFactor * repeatHeightTotal)));
  var realHeightTotal = minHeight + repeatCount * middleFactor * repeatHeightTotal;
  var axisHeight = options.fontMetrics().axisHeight;
  if (center) {
    axisHeight *= options.sizeMultiplier;
  }
  var depth = realHeightTotal / 2 - axisHeight;
  var stack = [];
  if (svgLabel.length > 0) {
    var midHeight = realHeightTotal - topHeightTotal - bottomHeightTotal;
    var viewBoxHeight = Math.round(realHeightTotal * 1e3);
    var pathStr = tallDelim(svgLabel, Math.round(midHeight * 1e3));
    var path2 = new PathNode(svgLabel, pathStr);
    var width = makeEm(viewBoxWidth / 1e3);
    var height = makeEm(viewBoxHeight / 1e3);
    var svg2 = new SvgNode([path2], {
      "width": width,
      "height": height,
      "viewBox": "0 0 " + viewBoxWidth + " " + viewBoxHeight
    });
    var wrapper = makeSvgSpan([], [svg2], options);
    wrapper.height = viewBoxHeight / 1e3;
    wrapper.style.width = width;
    wrapper.style.height = height;
    stack.push({
      type: "elem",
      elem: wrapper
    });
  } else {
    stack.push(makeGlyphSpan(bottom, font, mode, options));
    stack.push(lap);
    if (middle === null) {
      var innerHeight2 = realHeightTotal - topHeightTotal - bottomHeightTotal + 2 * lapInEms;
      stack.push(makeInner(repeat, innerHeight2, options));
    } else {
      var _innerHeight = (realHeightTotal - topHeightTotal - bottomHeightTotal - middleHeightTotal) / 2 + 2 * lapInEms;
      stack.push(makeInner(repeat, _innerHeight, options));
      stack.push(lap);
      stack.push(makeGlyphSpan(middle, font, mode, options));
      stack.push(lap);
      stack.push(makeInner(repeat, _innerHeight, options));
    }
    stack.push(lap);
    stack.push(makeGlyphSpan(top, font, mode, options));
  }
  var newOptions = options.havingBaseStyle(Style$1.TEXT);
  var inner2 = makeVList({
    positionType: "bottom",
    positionData: depth,
    children: stack
  });
  return styleWrap(makeSpan(["delimsizing", "mult"], [inner2], newOptions), Style$1.TEXT, options, classes);
};
var vbPad = 80;
var emPad = 0.08;
var sqrtSvg = function sqrtSvg2(sqrtName, height, viewBoxHeight, extraVinculum, options) {
  var path2 = sqrtPath(sqrtName, extraVinculum, viewBoxHeight);
  var pathNode = new PathNode(sqrtName, path2);
  var svg2 = new SvgNode([pathNode], {
    // Note: 1000:1 ratio of viewBox to document em width.
    "width": "400em",
    "height": makeEm(height),
    "viewBox": "0 0 400000 " + viewBoxHeight,
    "preserveAspectRatio": "xMinYMin slice"
  });
  return makeSvgSpan(["hide-tail"], [svg2], options);
};
var makeSqrtImage = function makeSqrtImage2(height, options) {
  var newOptions = options.havingBaseSizing();
  var delim = traverseSequence("\\surd", height * newOptions.sizeMultiplier, stackLargeDelimiterSequence, newOptions);
  var sizeMultiplier = newOptions.sizeMultiplier;
  var extraVinculum = Math.max(0, options.minRuleThickness - options.fontMetrics().sqrtRuleThickness);
  var span;
  var spanHeight;
  var texHeight;
  var viewBoxHeight;
  var advanceWidth;
  if (delim.type === "small") {
    viewBoxHeight = 1e3 + 1e3 * extraVinculum + vbPad;
    if (height < 1) {
      sizeMultiplier = 1;
    } else if (height < 1.4) {
      sizeMultiplier = 0.7;
    }
    spanHeight = (1 + extraVinculum + emPad) / sizeMultiplier;
    texHeight = (1 + extraVinculum) / sizeMultiplier;
    span = sqrtSvg("sqrtMain", spanHeight, viewBoxHeight, extraVinculum, options);
    span.style.minWidth = "0.853em";
    advanceWidth = 0.833 / sizeMultiplier;
  } else if (delim.type === "large") {
    viewBoxHeight = (1e3 + vbPad) * sizeToMaxHeight[delim.size];
    texHeight = (sizeToMaxHeight[delim.size] + extraVinculum) / sizeMultiplier;
    spanHeight = (sizeToMaxHeight[delim.size] + extraVinculum + emPad) / sizeMultiplier;
    span = sqrtSvg("sqrtSize" + delim.size, spanHeight, viewBoxHeight, extraVinculum, options);
    span.style.minWidth = "1.02em";
    advanceWidth = 1 / sizeMultiplier;
  } else {
    spanHeight = height + extraVinculum + emPad;
    texHeight = height + extraVinculum;
    viewBoxHeight = Math.floor(1e3 * height + extraVinculum) + vbPad;
    span = sqrtSvg("sqrtTall", spanHeight, viewBoxHeight, extraVinculum, options);
    span.style.minWidth = "0.742em";
    advanceWidth = 1.056;
  }
  span.height = texHeight;
  span.style.height = makeEm(spanHeight);
  return {
    span,
    advanceWidth,
    // Calculate the actual line width.
    // This actually should depend on the chosen font -- e.g. \boldmath
    // should use the thicker surd symbols from e.g. KaTeX_Main-Bold, and
    // have thicker rules.
    ruleWidth: (options.fontMetrics().sqrtRuleThickness + extraVinculum) * sizeMultiplier
  };
};
var stackLargeDelimiters = /* @__PURE__ */ new Set(["(", "\\lparen", ")", "\\rparen", "[", "\\lbrack", "]", "\\rbrack", "\\{", "\\lbrace", "\\}", "\\rbrace", "\\lfloor", "\\rfloor", "\u230A", "\u230B", "\\lceil", "\\rceil", "\u2308", "\u2309", "\\surd"]);
var stackAlwaysDelimiters = /* @__PURE__ */ new Set(["\\uparrow", "\\downarrow", "\\updownarrow", "\\Uparrow", "\\Downarrow", "\\Updownarrow", "|", "\\|", "\\vert", "\\Vert", "\\lvert", "\\rvert", "\\lVert", "\\rVert", "\\lgroup", "\\rgroup", "\u27EE", "\u27EF", "\\lmoustache", "\\rmoustache", "\u23B0", "\u23B1"]);
var stackNeverDelimiters = /* @__PURE__ */ new Set(["<", ">", "\\langle", "\\rangle", "/", "\\backslash", "\\lt", "\\gt"]);
var sizeToMaxHeight = [0, 1.2, 1.8, 2.4, 3];
var makeSizedDelim = function makeSizedDelim2(delim, size, options, mode, classes) {
  if (delim === "<" || delim === "\\lt" || delim === "\u27E8") {
    delim = "\\langle";
  } else if (delim === ">" || delim === "\\gt" || delim === "\u27E9") {
    delim = "\\rangle";
  }
  if (stackLargeDelimiters.has(delim) || stackNeverDelimiters.has(delim)) {
    return makeLargeDelim(delim, size, false, options, mode, classes);
  } else if (stackAlwaysDelimiters.has(delim)) {
    return makeStackedDelim(delim, sizeToMaxHeight[size], false, options, mode, classes);
  } else {
    throw new ParseError("Illegal delimiter: '" + delim + "'");
  }
};
var stackNeverDelimiterSequence = [{
  type: "small",
  style: Style$1.SCRIPTSCRIPT
}, {
  type: "small",
  style: Style$1.SCRIPT
}, {
  type: "small",
  style: Style$1.TEXT
}, {
  type: "large",
  size: 1
}, {
  type: "large",
  size: 2
}, {
  type: "large",
  size: 3
}, {
  type: "large",
  size: 4
}];
var stackAlwaysDelimiterSequence = [{
  type: "small",
  style: Style$1.SCRIPTSCRIPT
}, {
  type: "small",
  style: Style$1.SCRIPT
}, {
  type: "small",
  style: Style$1.TEXT
}, {
  type: "stack"
}];
var stackLargeDelimiterSequence = [{
  type: "small",
  style: Style$1.SCRIPTSCRIPT
}, {
  type: "small",
  style: Style$1.SCRIPT
}, {
  type: "small",
  style: Style$1.TEXT
}, {
  type: "large",
  size: 1
}, {
  type: "large",
  size: 2
}, {
  type: "large",
  size: 3
}, {
  type: "large",
  size: 4
}, {
  type: "stack"
}];
var delimTypeToFont = function delimTypeToFont2(type) {
  if (type.type === "small") {
    return "Main-Regular";
  } else if (type.type === "large") {
    return "Size" + type.size + "-Regular";
  } else if (type.type === "stack") {
    return "Size4-Regular";
  } else {
    var delimKind = type.type;
    throw new Error("Add support for delim type '" + delimKind + "' here.");
  }
};
var traverseSequence = function traverseSequence2(delim, height, sequence, options) {
  var start2 = Math.min(2, 3 - options.style.size);
  for (var i2 = start2; i2 < sequence.length; i2++) {
    var delimType = sequence[i2];
    if (delimType.type === "stack") {
      break;
    }
    var metrics2 = getMetrics(delim, delimTypeToFont(delimType), "math");
    var heightDepth = metrics2.height + metrics2.depth;
    if (delimType.type === "small") {
      var newOptions = options.havingBaseStyle(delimType.style);
      heightDepth *= newOptions.sizeMultiplier;
    }
    if (heightDepth > height) {
      return delimType;
    }
  }
  return sequence[sequence.length - 1];
};
var makeCustomSizedDelim = function makeCustomSizedDelim2(delim, height, center, options, mode, classes) {
  if (delim === "<" || delim === "\\lt" || delim === "\u27E8") {
    delim = "\\langle";
  } else if (delim === ">" || delim === "\\gt" || delim === "\u27E9") {
    delim = "\\rangle";
  }
  var sequence;
  if (stackNeverDelimiters.has(delim)) {
    sequence = stackNeverDelimiterSequence;
  } else if (stackLargeDelimiters.has(delim)) {
    sequence = stackLargeDelimiterSequence;
  } else {
    sequence = stackAlwaysDelimiterSequence;
  }
  var delimType = traverseSequence(delim, height, sequence, options);
  if (delimType.type === "small") {
    return makeSmallDelim(delim, delimType.style, center, options, mode, classes);
  } else if (delimType.type === "large") {
    return makeLargeDelim(delim, delimType.size, center, options, mode, classes);
  } else {
    return makeStackedDelim(delim, height, center, options, mode, classes);
  }
};
var makeLeftRightDelim = function makeLeftRightDelim2(delim, height, depth, options, mode, classes) {
  var axisHeight = options.fontMetrics().axisHeight * options.sizeMultiplier;
  var delimiterFactor = 901;
  var delimiterExtend = 5 / options.fontMetrics().ptPerEm;
  var maxDistFromAxis = Math.max(height - axisHeight, depth + axisHeight);
  var totalHeight = Math.max(
    // In real TeX, calculations are done using integral values which are
    // 65536 per pt, or 655360 per em. So, the division here truncates in
    // TeX but doesn't here, producing different results. If we wanted to
    // exactly match TeX's calculation, we could do
    //   Math.floor(655360 * maxDistFromAxis / 500) *
    //    delimiterFactor / 655360
    // (To see the difference, compare
    //    x^{x^{\left(\rule{0.1em}{0.68em}\right)}}
    // in TeX and KaTeX)
    maxDistFromAxis / 500 * delimiterFactor,
    2 * maxDistFromAxis - delimiterExtend
  );
  return makeCustomSizedDelim(delim, totalHeight, true, options, mode, classes);
};
var delimiterSizes = {
  "\\bigl": {
    mclass: "mopen",
    size: 1
  },
  "\\Bigl": {
    mclass: "mopen",
    size: 2
  },
  "\\biggl": {
    mclass: "mopen",
    size: 3
  },
  "\\Biggl": {
    mclass: "mopen",
    size: 4
  },
  "\\bigr": {
    mclass: "mclose",
    size: 1
  },
  "\\Bigr": {
    mclass: "mclose",
    size: 2
  },
  "\\biggr": {
    mclass: "mclose",
    size: 3
  },
  "\\Biggr": {
    mclass: "mclose",
    size: 4
  },
  "\\bigm": {
    mclass: "mrel",
    size: 1
  },
  "\\Bigm": {
    mclass: "mrel",
    size: 2
  },
  "\\biggm": {
    mclass: "mrel",
    size: 3
  },
  "\\Biggm": {
    mclass: "mrel",
    size: 4
  },
  "\\big": {
    mclass: "mord",
    size: 1
  },
  "\\Big": {
    mclass: "mord",
    size: 2
  },
  "\\bigg": {
    mclass: "mord",
    size: 3
  },
  "\\Bigg": {
    mclass: "mord",
    size: 4
  }
};
var delimiters = /* @__PURE__ */ new Set(["(", "\\lparen", ")", "\\rparen", "[", "\\lbrack", "]", "\\rbrack", "\\{", "\\lbrace", "\\}", "\\rbrace", "\\lfloor", "\\rfloor", "\u230A", "\u230B", "\\lceil", "\\rceil", "\u2308", "\u2309", "<", ">", "\\langle", "\u27E8", "\\rangle", "\u27E9", "\\lt", "\\gt", "\\lvert", "\\rvert", "\\lVert", "\\rVert", "\\lgroup", "\\rgroup", "\u27EE", "\u27EF", "\\lmoustache", "\\rmoustache", "\u23B0", "\u23B1", "/", "\\backslash", "|", "\\vert", "\\|", "\\Vert", "\\uparrow", "\\Uparrow", "\\downarrow", "\\Downarrow", "\\updownarrow", "\\Updownarrow", "."]);
function isMiddleDelimNode(node) {
  return "isMiddle" in node;
}
function checkDelimiter(delim, context) {
  var symDelim = checkSymbolNodeType(delim);
  if (symDelim && delimiters.has(symDelim.text)) {
    return symDelim;
  } else if (symDelim) {
    throw new ParseError("Invalid delimiter '" + symDelim.text + "' after '" + context.funcName + "'", delim);
  } else {
    throw new ParseError("Invalid delimiter type '" + delim.type + "'", delim);
  }
}
defineFunction({
  type: "delimsizing",
  names: ["\\bigl", "\\Bigl", "\\biggl", "\\Biggl", "\\bigr", "\\Bigr", "\\biggr", "\\Biggr", "\\bigm", "\\Bigm", "\\biggm", "\\Biggm", "\\big", "\\Big", "\\bigg", "\\Bigg"],
  numArgs: 1,
  argTypes: ["primitive"],
  handler: (context, args) => {
    var delim = checkDelimiter(normalizeArgument(args[0]), context);
    return {
      type: "delimsizing",
      mode: context.parser.mode,
      size: delimiterSizes[context.funcName].size,
      mclass: delimiterSizes[context.funcName].mclass,
      delim: delim.text
    };
  },
  htmlBuilder: (group, options) => {
    if (group.delim === ".") {
      return makeSpan([group.mclass]);
    }
    return makeSizedDelim(group.delim, group.size, options, group.mode, [group.mclass]);
  },
  mathmlBuilder: (group) => {
    var children = [];
    if (group.delim !== ".") {
      children.push(makeText(group.delim, group.mode));
    }
    var node = new MathNode("mo", children);
    if (group.mclass === "mopen" || group.mclass === "mclose") {
      node.setAttribute("fence", "true");
    } else {
      node.setAttribute("fence", "false");
    }
    node.setAttribute("stretchy", "true");
    var size = makeEm(sizeToMaxHeight[group.size]);
    node.setAttribute("minsize", size);
    node.setAttribute("maxsize", size);
    return node;
  }
});
function assertParsed(group) {
  if (!group.body) {
    throw new Error("Bug: The leftright ParseNode wasn't fully parsed.");
  }
}
defineFunction({
  type: "leftright-right",
  names: ["\\right"],
  numArgs: 1,
  primitive: true,
  handler: (context, args) => {
    var color = context.parser.gullet.macros.get("\\current@color");
    if (color && typeof color !== "string") {
      throw new ParseError("\\current@color set to non-string in \\right");
    }
    return {
      type: "leftright-right",
      mode: context.parser.mode,
      delim: checkDelimiter(args[0], context).text,
      color
      // undefined if not set via \color
    };
  }
});
defineFunction({
  type: "leftright",
  names: ["\\left"],
  numArgs: 1,
  primitive: true,
  handler: (context, args) => {
    var delim = checkDelimiter(args[0], context);
    var parser = context.parser;
    ++parser.leftrightDepth;
    var body = parser.parseExpression(false);
    --parser.leftrightDepth;
    parser.expect("\\right", false);
    var right = assertNodeType(parser.parseFunction(), "leftright-right");
    return {
      type: "leftright",
      mode: parser.mode,
      body,
      left: delim.text,
      right: right.delim,
      rightColor: right.color
    };
  },
  htmlBuilder: (group, options) => {
    assertParsed(group);
    var inner2 = buildExpression$1(group.body, options, true, ["mopen", "mclose"]);
    var innerHeight2 = 0;
    var innerDepth = 0;
    var hadMiddle = false;
    for (var i2 = 0; i2 < inner2.length; i2++) {
      var node = inner2[i2];
      if (isMiddleDelimNode(node)) {
        hadMiddle = true;
      } else {
        innerHeight2 = Math.max(inner2[i2].height, innerHeight2);
        innerDepth = Math.max(inner2[i2].depth, innerDepth);
      }
    }
    innerHeight2 *= options.sizeMultiplier;
    innerDepth *= options.sizeMultiplier;
    var leftDelim;
    if (group.left === ".") {
      leftDelim = makeNullDelimiter(options, ["mopen"]);
    } else {
      leftDelim = makeLeftRightDelim(group.left, innerHeight2, innerDepth, options, group.mode, ["mopen"]);
    }
    inner2.unshift(leftDelim);
    if (hadMiddle) {
      for (var _i6 = 1; _i6 < inner2.length; _i6++) {
        var middleDelim = inner2[_i6];
        if (isMiddleDelimNode(middleDelim)) {
          var isMiddle = middleDelim.isMiddle;
          inner2[_i6] = makeLeftRightDelim(isMiddle.delim, innerHeight2, innerDepth, isMiddle.options, group.mode, []);
        }
      }
    }
    var rightDelim;
    if (group.right === ".") {
      rightDelim = makeNullDelimiter(options, ["mclose"]);
    } else {
      var colorOptions = group.rightColor ? options.withColor(group.rightColor) : options;
      rightDelim = makeLeftRightDelim(group.right, innerHeight2, innerDepth, colorOptions, group.mode, ["mclose"]);
    }
    inner2.push(rightDelim);
    return makeSpan(["minner"], inner2, options);
  },
  mathmlBuilder: (group, options) => {
    assertParsed(group);
    var inner2 = buildExpression2(group.body, options);
    if (group.left !== ".") {
      var leftNode = new MathNode("mo", [makeText(group.left, group.mode)]);
      leftNode.setAttribute("fence", "true");
      inner2.unshift(leftNode);
    }
    if (group.right !== ".") {
      var rightNode = new MathNode("mo", [makeText(group.right, group.mode)]);
      rightNode.setAttribute("fence", "true");
      if (group.rightColor) {
        rightNode.setAttribute("mathcolor", group.rightColor);
      }
      inner2.push(rightNode);
    }
    return makeRow(inner2);
  }
});
defineFunction({
  type: "middle",
  names: ["\\middle"],
  numArgs: 1,
  primitive: true,
  handler: (context, args) => {
    var delim = checkDelimiter(args[0], context);
    if (!context.parser.leftrightDepth) {
      throw new ParseError("\\middle without preceding \\left", delim);
    }
    return {
      type: "middle",
      mode: context.parser.mode,
      delim: delim.text
    };
  },
  htmlBuilder: (group, options) => {
    var middleDelim;
    if (group.delim === ".") {
      middleDelim = makeNullDelimiter(options, []);
    } else {
      middleDelim = makeSizedDelim(group.delim, 1, options, group.mode, []);
      middleDelim.isMiddle = {
        delim: group.delim,
        options
      };
    }
    return middleDelim;
  },
  mathmlBuilder: (group, options) => {
    var textNode = group.delim === "\\vert" || group.delim === "|" ? makeText("|", "text") : makeText(group.delim, group.mode);
    var middleNode = new MathNode("mo", [textNode]);
    middleNode.setAttribute("fence", "true");
    middleNode.setAttribute("lspace", "0.05em");
    middleNode.setAttribute("rspace", "0.05em");
    return middleNode;
  }
});
var htmlBuilder$7 = (group, options) => {
  var inner2 = wrapFragment(buildGroup$1(group.body, options), options);
  var label = group.label.slice(1);
  var scale = options.sizeMultiplier;
  var img;
  var imgShift;
  var isSingleChar = isCharacterBox(group.body);
  if (label === "sout") {
    img = makeSpan(["katex-stretchy", "katex-sout"]);
    img.height = options.fontMetrics().defaultRuleThickness / scale;
    imgShift = -0.5 * options.fontMetrics().xHeight;
  } else if (label === "phase") {
    var lineWeight = calculateSize({
      number: 0.6,
      unit: "pt"
    }, options);
    var clearance = calculateSize({
      number: 0.35,
      unit: "ex"
    }, options);
    var newOptions = options.havingBaseSizing();
    scale = scale / newOptions.sizeMultiplier;
    var angleHeight = inner2.height + inner2.depth + lineWeight + clearance;
    inner2.style.paddingLeft = makeEm(angleHeight / 2 + lineWeight);
    var viewBoxHeight = Math.floor(1e3 * angleHeight * scale);
    var path2 = phasePath(viewBoxHeight);
    var svgNode = new SvgNode([new PathNode("phase", path2)], {
      "width": "400em",
      "height": makeEm(viewBoxHeight / 1e3),
      "viewBox": "0 0 400000 " + viewBoxHeight,
      "preserveAspectRatio": "xMinYMin slice"
    });
    img = makeSvgSpan(["hide-tail"], [svgNode], options);
    img.style.height = makeEm(angleHeight);
    imgShift = inner2.depth + lineWeight + clearance;
  } else {
    if (/cancel/.test(label)) {
      if (!isSingleChar) {
        inner2.classes.push("cancel-pad");
      }
    } else if (label === "angl") {
      inner2.classes.push("anglpad");
    } else {
      inner2.classes.push("boxpad");
    }
    var topPad;
    var bottomPad;
    var ruleThickness = 0;
    if (/box/.test(label)) {
      ruleThickness = Math.max(
        options.fontMetrics().fboxrule,
        // default
        options.minRuleThickness
      );
      topPad = options.fontMetrics().fboxsep + (label === "colorbox" ? 0 : ruleThickness);
      bottomPad = topPad;
    } else if (label === "angl") {
      ruleThickness = Math.max(options.fontMetrics().defaultRuleThickness, options.minRuleThickness);
      topPad = 4 * ruleThickness;
      bottomPad = Math.max(0, 0.25 - inner2.depth);
    } else {
      topPad = isSingleChar ? 0.2 : 0;
      bottomPad = topPad;
    }
    img = stretchyEnclose(inner2, label, topPad, bottomPad, options);
    if (/fbox|boxed|fcolorbox/.test(label)) {
      img.style.borderStyle = "solid";
      img.style.borderWidth = makeEm(ruleThickness);
    } else if (label === "angl" && ruleThickness !== 0.049) {
      img.style.borderTopWidth = makeEm(ruleThickness);
      img.style.borderRightWidth = makeEm(ruleThickness);
    }
    imgShift = inner2.depth + bottomPad;
    if (group.backgroundColor) {
      img.style.backgroundColor = group.backgroundColor;
      if (group.borderColor) {
        img.style.borderColor = group.borderColor;
      }
    }
  }
  var vlist;
  if (group.backgroundColor) {
    vlist = makeVList({
      positionType: "individualShift",
      children: [
        // Put the color background behind inner;
        {
          type: "elem",
          elem: img,
          shift: imgShift
        },
        {
          type: "elem",
          elem: inner2,
          shift: 0
        }
      ]
    });
  } else {
    var classes = /cancel|phase/.test(label) ? ["svg-align"] : [];
    vlist = makeVList({
      positionType: "individualShift",
      children: [
        // Write the \cancel stroke on top of inner.
        {
          type: "elem",
          elem: inner2,
          shift: 0
        },
        {
          type: "elem",
          elem: img,
          shift: imgShift,
          wrapperClasses: classes
        }
      ]
    });
  }
  if (/cancel/.test(label)) {
    vlist.height = inner2.height;
    vlist.depth = inner2.depth;
  }
  if (/cancel/.test(label) && !isSingleChar) {
    return makeSpan(["mord", "cancel-lap"], [vlist], options);
  } else {
    return makeSpan(["mord"], [vlist], options);
  }
};
var mathmlBuilder$6 = (group, options) => {
  var fboxsep;
  var node = new MathNode(group.label.includes("colorbox") ? "mpadded" : "menclose", [buildGroup2(group.body, options)]);
  switch (group.label) {
    case "\\cancel":
      node.setAttribute("notation", "updiagonalstrike");
      break;
    case "\\bcancel":
      node.setAttribute("notation", "downdiagonalstrike");
      break;
    case "\\phase":
      node.setAttribute("notation", "phasorangle");
      break;
    case "\\sout":
      node.setAttribute("notation", "horizontalstrike");
      break;
    case "\\fbox":
      node.setAttribute("notation", "box");
      break;
    case "\\angl":
      node.setAttribute("notation", "actuarial");
      break;
    case "\\fcolorbox":
    case "\\colorbox":
      fboxsep = options.fontMetrics().fboxsep * options.fontMetrics().ptPerEm;
      node.setAttribute("width", "+" + 2 * fboxsep + "pt");
      node.setAttribute("height", "+" + 2 * fboxsep + "pt");
      node.setAttribute("lspace", fboxsep + "pt");
      node.setAttribute("voffset", fboxsep + "pt");
      if (group.label === "\\fcolorbox") {
        var thk = Math.max(
          options.fontMetrics().fboxrule,
          // default
          options.minRuleThickness
        );
        node.setAttribute("style", "border: " + makeEm(thk) + " solid " + group.borderColor);
      }
      break;
    case "\\xcancel":
      node.setAttribute("notation", "updiagonalstrike downdiagonalstrike");
      break;
  }
  if (group.backgroundColor) {
    node.setAttribute("mathbackground", group.backgroundColor);
  }
  return node;
};
defineFunction({
  type: "enclose",
  names: ["\\colorbox"],
  numArgs: 2,
  allowedInText: true,
  argTypes: ["color", "hbox"],
  handler(_ref2, args, optArgs) {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    var color = assertNodeType(args[0], "color-token").color;
    var body = args[1];
    return {
      type: "enclose",
      mode: parser.mode,
      label: funcName,
      backgroundColor: color,
      body
    };
  },
  htmlBuilder: htmlBuilder$7,
  mathmlBuilder: mathmlBuilder$6
});
defineFunction({
  type: "enclose",
  names: ["\\fcolorbox"],
  numArgs: 3,
  allowedInText: true,
  argTypes: ["color", "color", "hbox"],
  handler(_ref2, args, optArgs) {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    var borderColor = assertNodeType(args[0], "color-token").color;
    var backgroundColor = assertNodeType(args[1], "color-token").color;
    var body = args[2];
    return {
      type: "enclose",
      mode: parser.mode,
      label: funcName,
      backgroundColor,
      borderColor,
      body
    };
  }
});
defineFunction({
  type: "enclose",
  names: ["\\fbox"],
  numArgs: 1,
  argTypes: ["hbox"],
  allowedInText: true,
  handler(_ref3, args) {
    var parser = _ref3.parser;
    return {
      type: "enclose",
      mode: parser.mode,
      label: "\\fbox",
      body: args[0]
    };
  }
});
defineFunction({
  type: "enclose",
  names: ["\\cancel", "\\bcancel", "\\xcancel", "\\phase"],
  numArgs: 1,
  handler(_ref4, args) {
    var parser = _ref4.parser, funcName = _ref4.funcName;
    var body = args[0];
    return {
      type: "enclose",
      mode: parser.mode,
      label: funcName,
      body
    };
  }
});
defineFunction({
  type: "enclose",
  names: ["\\sout"],
  numArgs: 1,
  allowedInText: true,
  handler(_ref5, args) {
    var parser = _ref5.parser, funcName = _ref5.funcName;
    if (parser.mode === "math") {
      handleStrict({
        strict: parser.settings.strict,
        errorCode: "mathVsSout",
        errorMsg: "LaTeX's \\sout works only in text mode",
        report: true
      });
    }
    var body = args[0];
    return {
      type: "enclose",
      mode: parser.mode,
      label: funcName,
      body
    };
  }
});
defineFunction({
  type: "enclose",
  names: ["\\angl"],
  numArgs: 1,
  argTypes: ["hbox"],
  allowedInText: false,
  handler(_ref6, args) {
    var parser = _ref6.parser;
    return {
      type: "enclose",
      mode: parser.mode,
      label: "\\angl",
      body: args[0]
    };
  }
});
var _environments = {};
function defineEnvironment(_ref2) {
  var type = _ref2.type, names = _ref2.names, props = _ref2.props, handler2 = _ref2.handler, htmlBuilder3 = _ref2.htmlBuilder, mathmlBuilder3 = _ref2.mathmlBuilder;
  var data = {
    type,
    numArgs: props.numArgs || 0,
    allowedInText: false,
    numOptionalArgs: 0,
    handler: handler2
  };
  for (var i2 = 0; i2 < names.length; ++i2) {
    _environments[names[i2]] = data;
  }
  if (htmlBuilder3) {
    _htmlGroupBuilders[type] = htmlBuilder3;
  }
  if (mathmlBuilder3) {
    _mathmlGroupBuilders[type] = mathmlBuilder3;
  }
}
var _macros = {};
function defineMacro(name, body) {
  _macros[name] = body;
}
var SourceLocation = class _SourceLocation {
  // End offset, zero-based exclusive.
  constructor(lexer, start2, end) {
    this.lexer = void 0;
    this.start = void 0;
    this.end = void 0;
    this.lexer = lexer;
    this.start = start2;
    this.end = end;
  }
  /**
   * Merges two `SourceLocation`s from location providers, given they are
   * provided in order of appearance.
   * - Returns the first one's location if only the first is provided.
   * - Returns a merged range of the first and the last if both are provided
   *   and their lexers match.
   * - Otherwise, returns null.
   */
  static range(first, second) {
    if (!second) {
      return first && first.loc;
    } else if (!first || !first.loc || !second.loc || first.loc.lexer !== second.loc.lexer) {
      return null;
    } else {
      return new _SourceLocation(first.loc.lexer, first.loc.start, second.loc.end);
    }
  }
};
var Token = class _Token {
  // used in \noexpand
  constructor(text3, loc) {
    this.text = void 0;
    this.loc = void 0;
    this.noexpand = void 0;
    this.treatAsRelax = void 0;
    this.text = text3;
    this.loc = loc;
  }
  /**
   * Given a pair of tokens (this and endToken), compute a `Token` encompassing
   * the whole input range enclosed by these two.
   */
  range(endToken, text3) {
    return new _Token(text3, SourceLocation.range(this, endToken));
  }
};
function getHLines(parser) {
  var hlineInfo = [];
  parser.consumeSpaces();
  var nxt = parser.fetch().text;
  if (nxt === "\\relax") {
    parser.consume();
    parser.consumeSpaces();
    nxt = parser.fetch().text;
  }
  while (nxt === "\\hline" || nxt === "\\hdashline") {
    parser.consume();
    hlineInfo.push(nxt === "\\hdashline");
    parser.consumeSpaces();
    nxt = parser.fetch().text;
  }
  return hlineInfo;
}
var validateAmsEnvironmentContext = (context) => {
  var settings = context.parser.settings;
  if (!settings.displayMode) {
    throw new ParseError("{" + context.envName + "} can be used only in display mode.");
  }
};
var gatherEnvironments = /* @__PURE__ */ new Set(["gather", "gather*"]);
function getAutoTag(name) {
  if (!name.includes("ed")) {
    return !name.includes("*");
  }
}
function parseArray(parser, _ref2, style) {
  var hskipBeforeAndAfter = _ref2.hskipBeforeAndAfter, addJot = _ref2.addJot, cols = _ref2.cols, arraystretch = _ref2.arraystretch, colSeparationType = _ref2.colSeparationType, autoTag = _ref2.autoTag, singleRow = _ref2.singleRow, emptySingleRow = _ref2.emptySingleRow, maxNumCols = _ref2.maxNumCols, leqno = _ref2.leqno;
  parser.gullet.beginGroup();
  if (!singleRow) {
    parser.gullet.macros.set("\\cr", "\\\\\\relax");
  }
  if (!arraystretch) {
    var stretch = parser.gullet.expandMacroAsText("\\arraystretch");
    if (stretch == null) {
      arraystretch = 1;
    } else {
      arraystretch = parseFloat(stretch);
      if (!arraystretch || arraystretch < 0) {
        throw new ParseError("Invalid \\arraystretch: " + stretch);
      }
    }
  }
  parser.gullet.beginGroup();
  var row = [];
  var body = [row];
  var rowGaps = [];
  var hLinesBeforeRow = [];
  var tags = autoTag != null ? [] : void 0;
  function beginRow() {
    if (autoTag) {
      parser.gullet.macros.set("\\@eqnsw", "1", true);
    }
  }
  function endRow() {
    if (tags) {
      if (parser.gullet.macros.get("\\df@tag")) {
        tags.push(parser.subparse([new Token("\\df@tag")]));
        parser.gullet.macros.set("\\df@tag", void 0, true);
      } else {
        tags.push(Boolean(autoTag) && parser.gullet.macros.get("\\@eqnsw") === "1");
      }
    }
  }
  beginRow();
  hLinesBeforeRow.push(getHLines(parser));
  while (true) {
    var cellBody = parser.parseExpression(false, singleRow ? "\\end" : "\\\\");
    parser.gullet.endGroup();
    parser.gullet.beginGroup();
    var cell = {
      type: "ordgroup",
      mode: parser.mode,
      body: cellBody
    };
    if (style) {
      cell = {
        type: "styling",
        mode: parser.mode,
        style,
        resetFont: true,
        body: [cell]
      };
    }
    row.push(cell);
    var next = parser.fetch().text;
    if (next === "&") {
      if (maxNumCols && row.length === maxNumCols) {
        if (singleRow || colSeparationType) {
          throw new ParseError("Too many tab characters: &", parser.nextToken);
        } else {
          handleStrict({
            strict: parser.settings.strict,
            errorCode: "textEnv",
            errorMsg: "Too few columns specified in the {array} column argument.",
            report: true
          });
        }
      }
      parser.consume();
    } else if (next === "\\end") {
      endRow();
      if (row.length === 1 && cell.type === "styling" && cell.body.length === 1 && cell.body[0].type === "ordgroup" && cell.body[0].body.length === 0 && (body.length > 1 || !emptySingleRow) && !Array.isArray(tags == null ? void 0 : tags[tags.length - 1]) && !(autoTag && (tags == null ? void 0 : tags[tags.length - 1]) === true)) {
        body.pop();
      }
      if (hLinesBeforeRow.length < body.length + 1) {
        hLinesBeforeRow.push([]);
      }
      break;
    } else if (next === "\\\\") {
      parser.consume();
      var size = void 0;
      if (parser.gullet.future().text !== " ") {
        size = parser.parseSizeGroup(true);
      }
      rowGaps.push(size ? size.value : null);
      endRow();
      hLinesBeforeRow.push(getHLines(parser));
      row = [];
      body.push(row);
      beginRow();
    } else {
      throw new ParseError("Expected & or \\\\ or \\cr or \\end", parser.nextToken);
    }
  }
  parser.gullet.endGroup();
  parser.gullet.endGroup();
  return {
    type: "array",
    mode: parser.mode,
    addJot,
    arraystretch,
    body,
    cols,
    rowGaps,
    hskipBeforeAndAfter,
    hLinesBeforeRow,
    colSeparationType,
    tags,
    leqno
  };
}
function dCellStyle(envName) {
  if (envName.slice(0, 1) === "d") {
    return "display";
  } else {
    return "text";
  }
}
var htmlBuilder$6 = function htmlBuilder(group, options) {
  var r;
  var c;
  var nr = group.body.length;
  var hLinesBeforeRow = group.hLinesBeforeRow;
  var nc = 0;
  var body = new Array(nr);
  var hlines = [];
  var ruleThickness = Math.max(
    // From LaTeX \showthe\arrayrulewidth. Equals 0.04 em.
    options.fontMetrics().arrayRuleWidth,
    options.minRuleThickness
  );
  var pt2 = 1 / options.fontMetrics().ptPerEm;
  var arraycolsep = 5 * pt2;
  if (group.colSeparationType && group.colSeparationType === "small") {
    var localMultiplier = options.havingStyle(Style$1.SCRIPT).sizeMultiplier;
    arraycolsep = 0.2778 * (localMultiplier / options.sizeMultiplier);
  }
  var baselineskip = group.colSeparationType === "CD" ? calculateSize({
    number: 3,
    unit: "ex"
  }, options) : 12 * pt2;
  var jot = 3 * pt2;
  var arrayskip = group.arraystretch * baselineskip;
  var arstrutHeight = 0.7 * arrayskip;
  var arstrutDepth = 0.3 * arrayskip;
  var totalHeight = 0;
  function setHLinePos(hlinesInGap) {
    for (var i2 = 0; i2 < hlinesInGap.length; ++i2) {
      if (i2 > 0) {
        totalHeight += 0.25;
      }
      hlines.push({
        pos: totalHeight,
        isDashed: hlinesInGap[i2]
      });
    }
  }
  setHLinePos(hLinesBeforeRow[0]);
  for (r = 0; r < group.body.length; ++r) {
    var inrow = group.body[r];
    var height = arstrutHeight;
    var depth = arstrutDepth;
    if (nc < inrow.length) {
      nc = inrow.length;
    }
    var outrow = {
      cells: new Array(inrow.length),
      height: 0,
      depth: 0,
      pos: 0
    };
    for (c = 0; c < inrow.length; ++c) {
      var elt = buildGroup$1(inrow[c], options);
      if (depth < elt.depth) {
        depth = elt.depth;
      }
      if (height < elt.height) {
        height = elt.height;
      }
      outrow.cells[c] = elt;
    }
    var rowGap = group.rowGaps[r];
    var gap = 0;
    if (rowGap) {
      gap = calculateSize(rowGap, options);
      if (gap > 0) {
        gap += arstrutDepth;
        if (depth < gap) {
          depth = gap;
        }
        gap = 0;
      }
    }
    if (group.addJot && r < group.body.length - 1) {
      depth += jot;
    }
    outrow.height = height;
    outrow.depth = depth;
    totalHeight += height;
    outrow.pos = totalHeight;
    totalHeight += depth + gap;
    body[r] = outrow;
    setHLinePos(hLinesBeforeRow[r + 1]);
  }
  var offset = totalHeight / 2 + options.fontMetrics().axisHeight;
  var colDescriptions = group.cols || [];
  var cols = [];
  var colSep;
  var colDescrNum;
  var tagSpans = [];
  if (group.tags && group.tags.some((tag2) => tag2)) {
    for (r = 0; r < nr; ++r) {
      var rw = body[r];
      var shift = rw.pos - offset;
      var tag = group.tags[r];
      var tagSpan = void 0;
      if (tag === true) {
        tagSpan = makeSpan(["eqn-num"], [], options);
      } else if (tag === false) {
        tagSpan = makeSpan([], [], options);
      } else {
        tagSpan = makeSpan([], buildExpression$1(tag, options, true), options);
      }
      tagSpan.depth = rw.depth;
      tagSpan.height = rw.height;
      tagSpans.push({
        type: "elem",
        elem: tagSpan,
        shift
      });
    }
  }
  for (
    c = 0, colDescrNum = 0;
    // Continue while either there are more columns or more column
    // descriptions, so trailing separators don't get lost.
    c < nc || colDescrNum < colDescriptions.length;
    ++c, ++colDescrNum
  ) {
    var _colDescr3;
    var colDescr = colDescriptions[colDescrNum];
    var firstSeparator = true;
    while (((_colDescr = colDescr) == null ? void 0 : _colDescr.type) === "separator") {
      var _colDescr;
      if (!firstSeparator) {
        colSep = makeSpan(["arraycolsep"], []);
        colSep.style.width = makeEm(options.fontMetrics().doubleRuleSep);
        cols.push(colSep);
      }
      if (colDescr.separator === "|" || colDescr.separator === ":") {
        var lineType = colDescr.separator === "|" ? "solid" : "dashed";
        var separator = makeSpan(["vertical-separator"], [], options);
        separator.style.height = makeEm(totalHeight);
        separator.style.borderRightWidth = makeEm(ruleThickness);
        separator.style.borderRightStyle = lineType;
        separator.style.margin = "0 " + makeEm(-ruleThickness / 2);
        var _shift = totalHeight - offset;
        if (_shift) {
          separator.style.verticalAlign = makeEm(-_shift);
        }
        cols.push(separator);
      } else {
        throw new ParseError("Invalid separator type: " + colDescr.separator);
      }
      colDescrNum++;
      colDescr = colDescriptions[colDescrNum];
      firstSeparator = false;
    }
    if (c >= nc) {
      continue;
    }
    var sepwidth = void 0;
    if (c > 0 || group.hskipBeforeAndAfter) {
      var _colDescr$pregap, _colDescr2;
      sepwidth = (_colDescr$pregap = (_colDescr2 = colDescr) == null ? void 0 : _colDescr2.pregap) != null ? _colDescr$pregap : arraycolsep;
      if (sepwidth !== 0) {
        colSep = makeSpan(["arraycolsep"], []);
        colSep.style.width = makeEm(sepwidth);
        cols.push(colSep);
      }
    }
    var colElems = [];
    for (r = 0; r < nr; ++r) {
      var row = body[r];
      var elem = row.cells[c];
      if (!elem) {
        continue;
      }
      var _shift2 = row.pos - offset;
      elem.depth = row.depth;
      elem.height = row.height;
      colElems.push({
        type: "elem",
        elem,
        shift: _shift2
      });
    }
    var colVList = makeVList({
      positionType: "individualShift",
      children: colElems
    });
    var colSpan = makeSpan(["col-align-" + (((_colDescr3 = colDescr) == null ? void 0 : _colDescr3.align) || "c")], [colVList]);
    cols.push(colSpan);
    if (c < nc - 1 || group.hskipBeforeAndAfter) {
      var _colDescr$postgap, _colDescr4;
      sepwidth = (_colDescr$postgap = (_colDescr4 = colDescr) == null ? void 0 : _colDescr4.postgap) != null ? _colDescr$postgap : arraycolsep;
      if (sepwidth !== 0) {
        colSep = makeSpan(["arraycolsep"], []);
        colSep.style.width = makeEm(sepwidth);
        cols.push(colSep);
      }
    }
  }
  var tableBody = makeSpan(["mtable"], cols);
  if (hlines.length > 0) {
    var line = makeLineSpan("katex-hline", options, ruleThickness);
    var dashes = makeLineSpan("katex-hdashline", options, ruleThickness);
    var vListElems = [{
      type: "elem",
      elem: tableBody,
      shift: 0
    }];
    while (hlines.length > 0) {
      var hline = hlines.pop();
      var lineShift = hline.pos - offset;
      if (hline.isDashed) {
        vListElems.push({
          type: "elem",
          elem: dashes,
          shift: lineShift
        });
      } else {
        vListElems.push({
          type: "elem",
          elem: line,
          shift: lineShift
        });
      }
    }
    tableBody = makeVList({
      positionType: "individualShift",
      children: vListElems
    });
  }
  if (tagSpans.length === 0) {
    return makeSpan(["mord"], [tableBody], options);
  } else {
    var eqnNumCol = makeVList({
      positionType: "individualShift",
      children: tagSpans
    });
    var tagCol = makeSpan(["katex-tag"], [eqnNumCol], options);
    return makeFragment([tableBody, tagCol]);
  }
};
var alignMap = {
  c: "center ",
  l: "left ",
  r: "right "
};
var mathmlBuilder$5 = function mathmlBuilder(group, options) {
  var tbl = [];
  var glue = new MathNode("mtd", [], ["mtr-glue"]);
  var tag = new MathNode("mtd", [], ["mml-eqn-num"]);
  for (var i2 = 0; i2 < group.body.length; i2++) {
    var rw = group.body[i2];
    var row = [];
    for (var j2 = 0; j2 < rw.length; j2++) {
      row.push(new MathNode("mtd", [buildGroup2(rw[j2], options)]));
    }
    if (group.tags && group.tags[i2]) {
      row.unshift(glue);
      row.push(glue);
      if (group.leqno) {
        row.unshift(tag);
      } else {
        row.push(tag);
      }
    }
    tbl.push(new MathNode("mtr", row));
  }
  var table = new MathNode("mtable", tbl);
  var gap = group.arraystretch === 0.5 ? 0.1 : 0.16 + group.arraystretch - 1 + (group.addJot ? 0.09 : 0);
  table.setAttribute("rowspacing", makeEm(gap));
  var menclose = "";
  var align = "";
  if (group.cols && group.cols.length > 0) {
    var cols = group.cols;
    var columnLines = "";
    var prevTypeWasAlign = false;
    var iStart = 0;
    var iEnd = cols.length;
    if (cols[0].type === "separator") {
      menclose += "top ";
      iStart = 1;
    }
    if (cols[cols.length - 1].type === "separator") {
      menclose += "bottom ";
      iEnd -= 1;
    }
    for (var _i6 = iStart; _i6 < iEnd; _i6++) {
      var col = cols[_i6];
      if (col.type === "align") {
        align += alignMap[col.align];
        if (prevTypeWasAlign) {
          columnLines += "none ";
        }
        prevTypeWasAlign = true;
      } else if (col.type === "separator") {
        if (prevTypeWasAlign) {
          columnLines += col.separator === "|" ? "solid " : "dashed ";
          prevTypeWasAlign = false;
        }
      }
    }
    table.setAttribute("columnalign", align.trim());
    if (/[sd]/.test(columnLines)) {
      table.setAttribute("columnlines", columnLines.trim());
    }
  }
  if (group.colSeparationType === "align") {
    var _cols = group.cols || [];
    var spacing2 = "";
    for (var _i22 = 1; _i22 < _cols.length; _i22++) {
      spacing2 += _i22 % 2 ? "0em " : "1em ";
    }
    table.setAttribute("columnspacing", spacing2.trim());
  } else if (group.colSeparationType === "alignat" || group.colSeparationType === "gather") {
    table.setAttribute("columnspacing", "0em");
  } else if (group.colSeparationType === "small") {
    table.setAttribute("columnspacing", "0.2778em");
  } else if (group.colSeparationType === "CD") {
    table.setAttribute("columnspacing", "0.5em");
  } else {
    table.setAttribute("columnspacing", "1em");
  }
  var rowLines = "";
  var hlines = group.hLinesBeforeRow;
  menclose += hlines[0].length > 0 ? "left " : "";
  menclose += hlines[hlines.length - 1].length > 0 ? "right " : "";
  for (var _i32 = 1; _i32 < hlines.length - 1; _i32++) {
    rowLines += hlines[_i32].length === 0 ? "none " : hlines[_i32][0] ? "dashed " : "solid ";
  }
  if (/[sd]/.test(rowLines)) {
    table.setAttribute("rowlines", rowLines.trim());
  }
  if (menclose !== "") {
    table = new MathNode("menclose", [table]);
    table.setAttribute("notation", menclose.trim());
  }
  if (group.arraystretch && group.arraystretch < 1) {
    table = new MathNode("mstyle", [table]);
    table.setAttribute("scriptlevel", "1");
  }
  return table;
};
var alignedHandler = function alignedHandler2(context, args) {
  if (!context.envName.includes("ed")) {
    validateAmsEnvironmentContext(context);
  }
  var cols = [];
  var isSplit = context.envName === "split";
  var res = parseArray(context.parser, {
    cols,
    addJot: true,
    autoTag: isSplit ? void 0 : getAutoTag(context.envName),
    emptySingleRow: true,
    colSeparationType: context.envName.includes("at") ? "alignat" : "align",
    maxNumCols: isSplit ? 2 : void 0,
    leqno: context.parser.settings.leqno
  }, "display");
  var numMaths = 0;
  var numCols = 0;
  var emptyGroup = {
    type: "ordgroup",
    mode: context.mode,
    body: []
  };
  if (args[0] && args[0].type === "ordgroup") {
    var message = "Number of columns should be a positive integer";
    var numColumns = assertCharacterGroup(args[0], message);
    if (!/^[0-9]+$/.test(numColumns) || Number(numColumns) < 1) {
      throw new ParseError(message, args[0]);
    }
    numMaths = Number(numColumns);
    numCols = numMaths * 2;
  }
  var isAligned = !numCols;
  res.body.forEach(function(row) {
    for (var i3 = 1; i3 < row.length; i3 += 2) {
      var styling = assertNodeType(row[i3], "styling");
      var ordgroup = assertNodeType(styling.body[0], "ordgroup");
      ordgroup.body.unshift(emptyGroup);
    }
    if (!isAligned) {
      var curMaths = row.length / 2;
      if (numMaths < curMaths) {
        throw new ParseError("Too many math in a row: " + ("expected " + numMaths + ", but got " + curMaths), row[0]);
      }
    } else if (numCols < row.length) {
      numCols = row.length;
    }
  });
  for (var i2 = 0; i2 < numCols; ++i2) {
    var align = "r";
    var pregap = 0;
    if (i2 % 2 === 1) {
      align = "l";
    } else if (i2 > 0 && isAligned) {
      pregap = 1;
    }
    cols[i2] = {
      type: "align",
      align,
      pregap,
      postgap: 0
    };
  }
  res.colSeparationType = isAligned ? "align" : "alignat";
  return res;
};
defineEnvironment({
  type: "array",
  names: ["array", "darray"],
  props: {
    numArgs: 1
  },
  handler(context, args) {
    var symNode = checkSymbolNodeType(args[0]);
    var colalign = symNode ? [args[0]] : assertNodeType(args[0], "ordgroup").body;
    var cols = colalign.map(function(nde) {
      var node = assertSymbolNodeType(nde);
      var ca = node.text;
      if ("lcr".includes(ca)) {
        return {
          type: "align",
          align: ca
        };
      } else if (ca === "|") {
        return {
          type: "separator",
          separator: "|"
        };
      } else if (ca === ":") {
        return {
          type: "separator",
          separator: ":"
        };
      }
      throw new ParseError("Unknown column alignment: " + ca, nde);
    });
    var res = {
      cols,
      hskipBeforeAndAfter: true,
      // \@preamble in lttab.dtx
      maxNumCols: cols.length
    };
    return parseArray(context.parser, res, dCellStyle(context.envName));
  },
  htmlBuilder: htmlBuilder$6,
  mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
  type: "array",
  names: ["matrix", "pmatrix", "bmatrix", "Bmatrix", "vmatrix", "Vmatrix", "matrix*", "pmatrix*", "bmatrix*", "Bmatrix*", "vmatrix*", "Vmatrix*"],
  props: {
    numArgs: 0
  },
  handler(context) {
    var delimiters2 = {
      "matrix": null,
      "pmatrix": ["(", ")"],
      "bmatrix": ["[", "]"],
      "Bmatrix": ["\\{", "\\}"],
      "vmatrix": ["|", "|"],
      "Vmatrix": ["\\Vert", "\\Vert"]
    }[context.envName.replace("*", "")];
    var colAlign = "c";
    var payload = {
      hskipBeforeAndAfter: false,
      cols: [{
        type: "align",
        align: colAlign
      }]
    };
    if (context.envName.charAt(context.envName.length - 1) === "*") {
      var parser = context.parser;
      parser.consumeSpaces();
      if (parser.fetch().text === "[") {
        parser.consume();
        parser.consumeSpaces();
        colAlign = parser.fetch().text;
        if (!"lcr".includes(colAlign)) {
          throw new ParseError("Expected l or c or r", parser.nextToken);
        }
        parser.consume();
        parser.consumeSpaces();
        parser.expect("]");
        parser.consume();
        payload.cols = [{
          type: "align",
          align: colAlign
        }];
      }
    }
    var res = parseArray(context.parser, payload, dCellStyle(context.envName));
    var numCols = Math.max(0, ...res.body.map((row) => row.length));
    res.cols = new Array(numCols).fill({
      type: "align",
      align: colAlign
    });
    return delimiters2 ? {
      type: "leftright",
      mode: context.mode,
      body: [res],
      left: delimiters2[0],
      right: delimiters2[1],
      rightColor: void 0
      // \right uninfluenced by \color in array
    } : res;
  },
  htmlBuilder: htmlBuilder$6,
  mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
  type: "array",
  names: ["smallmatrix"],
  props: {
    numArgs: 0
  },
  handler(context) {
    var payload = {
      arraystretch: 0.5
    };
    var res = parseArray(context.parser, payload, "script");
    res.colSeparationType = "small";
    return res;
  },
  htmlBuilder: htmlBuilder$6,
  mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
  type: "array",
  names: ["subarray"],
  props: {
    numArgs: 1
  },
  handler(context, args) {
    var symNode = checkSymbolNodeType(args[0]);
    var colalign = symNode ? [args[0]] : assertNodeType(args[0], "ordgroup").body;
    var cols = colalign.map(function(nde) {
      var node = assertSymbolNodeType(nde);
      var ca = node.text;
      if ("lc".includes(ca)) {
        return {
          type: "align",
          align: ca
        };
      }
      throw new ParseError("Unknown column alignment: " + ca, nde);
    });
    if (cols.length > 1) {
      throw new ParseError("{subarray} can contain only one column");
    }
    var payload = {
      cols,
      hskipBeforeAndAfter: false,
      arraystretch: 0.5
    };
    var res = parseArray(context.parser, payload, "script");
    if (res.body.length > 0 && res.body[0].length > 1) {
      throw new ParseError("{subarray} can contain only one column");
    }
    return res;
  },
  htmlBuilder: htmlBuilder$6,
  mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
  type: "array",
  names: ["cases", "dcases", "rcases", "drcases"],
  props: {
    numArgs: 0
  },
  handler(context) {
    var payload = {
      arraystretch: 1.2,
      cols: [{
        type: "align",
        align: "l",
        pregap: 0,
        // TODO(kevinb) get the current style.
        // For now we use the metrics for TEXT style which is what we were
        // doing before.  Before attempting to get the current style we
        // should look at TeX's behavior especially for \over and matrices.
        postgap: 1
        /* 1em quad */
      }, {
        type: "align",
        align: "l",
        pregap: 0,
        postgap: 0
      }]
    };
    var res = parseArray(context.parser, payload, dCellStyle(context.envName));
    return {
      type: "leftright",
      mode: context.mode,
      body: [res],
      left: context.envName.includes("r") ? "." : "\\{",
      right: context.envName.includes("r") ? "\\}" : ".",
      rightColor: void 0
    };
  },
  htmlBuilder: htmlBuilder$6,
  mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
  type: "array",
  names: ["align", "align*", "aligned", "split"],
  props: {
    numArgs: 0
  },
  handler: alignedHandler,
  htmlBuilder: htmlBuilder$6,
  mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
  type: "array",
  names: ["gathered", "gather", "gather*"],
  props: {
    numArgs: 0
  },
  handler(context) {
    if (gatherEnvironments.has(context.envName)) {
      validateAmsEnvironmentContext(context);
    }
    var res = {
      cols: [{
        type: "align",
        align: "c"
      }],
      addJot: true,
      colSeparationType: "gather",
      autoTag: getAutoTag(context.envName),
      emptySingleRow: true,
      leqno: context.parser.settings.leqno
    };
    return parseArray(context.parser, res, "display");
  },
  htmlBuilder: htmlBuilder$6,
  mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
  type: "array",
  names: ["alignat", "alignat*", "alignedat"],
  props: {
    numArgs: 1
  },
  handler: alignedHandler,
  htmlBuilder: htmlBuilder$6,
  mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
  type: "array",
  names: ["equation", "equation*"],
  props: {
    numArgs: 0
  },
  handler(context) {
    validateAmsEnvironmentContext(context);
    var res = {
      autoTag: getAutoTag(context.envName),
      emptySingleRow: true,
      singleRow: true,
      maxNumCols: 1,
      leqno: context.parser.settings.leqno
    };
    return parseArray(context.parser, res, "display");
  },
  htmlBuilder: htmlBuilder$6,
  mathmlBuilder: mathmlBuilder$5
});
defineEnvironment({
  type: "array",
  names: ["CD"],
  props: {
    numArgs: 0
  },
  handler(context) {
    validateAmsEnvironmentContext(context);
    return parseCD(context.parser);
  },
  htmlBuilder: htmlBuilder$6,
  mathmlBuilder: mathmlBuilder$5
});
defineMacro("\\nonumber", "\\gdef\\@eqnsw{0}");
defineMacro("\\notag", "\\nonumber");
defineFunction({
  type: "text",
  // Doesn't matter what this is.
  names: ["\\hline", "\\hdashline"],
  numArgs: 0,
  allowedInText: true,
  allowedInMath: true,
  handler(context, args) {
    throw new ParseError(context.funcName + " valid only within array environment");
  }
});
var environments = _environments;
defineFunction({
  type: "environment",
  names: ["\\begin", "\\end"],
  numArgs: 1,
  argTypes: ["text"],
  handler(_ref2, args) {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    var nameGroup = args[0];
    if (nameGroup.type !== "ordgroup") {
      throw new ParseError("Invalid environment name", nameGroup);
    }
    var envName = assertCharacterGroup(nameGroup, "Environment name should contain only text characters and spaces", true);
    if (funcName === "\\begin") {
      if (!Object.prototype.hasOwnProperty.call(environments, envName)) {
        throw new ParseError("No such environment: " + envName, nameGroup);
      }
      var env = environments[envName];
      var _parser$parseArgument = parser.parseArguments("\\begin{" + envName + "}", env), _args = _parser$parseArgument.args, optArgs = _parser$parseArgument.optArgs;
      var context = {
        mode: parser.mode,
        envName,
        parser
      };
      var result = env.handler(context, _args, optArgs);
      parser.expect("\\end", false);
      var endNameToken = parser.nextToken;
      var end = assertNodeType(parser.parseFunction(), "environment");
      if (end.name !== envName) {
        throw new ParseError("Mismatch: \\begin{" + envName + "} matched by \\end{" + end.name + "}", endNameToken);
      }
      return result;
    }
    return {
      type: "environment",
      mode: parser.mode,
      name: envName,
      nameGroup
    };
  }
});
var htmlBuilder$5 = (group, options) => {
  var font = group.font;
  var newOptions = options.withFont(font);
  return buildGroup$1(group.body, newOptions);
};
var mathmlBuilder$4 = (group, options) => {
  var font = group.font;
  var newOptions = options.withFont(font);
  return buildGroup2(group.body, newOptions);
};
var fontAliases = {
  "\\Bbb": "\\mathbb",
  "\\bold": "\\mathbf",
  "\\frak": "\\mathfrak"
};
defineFunction({
  type: "font",
  names: [
    // styles, except \boldsymbol defined below
    "\\mathrm",
    "\\mathit",
    "\\mathbf",
    "\\mathnormal",
    "\\mathsfit",
    // families
    "\\mathbb",
    "\\mathcal",
    "\\mathfrak",
    "\\mathscr",
    "\\mathsf",
    "\\mathtt",
    // aliases, except \bm defined below
    "\\Bbb",
    "\\bold",
    "\\frak"
  ],
  numArgs: 1,
  allowedInArgument: true,
  handler: (_ref2, args) => {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    var body = normalizeArgument(args[0]);
    var func = funcName in fontAliases ? fontAliases[funcName] : funcName;
    return {
      type: "font",
      mode: parser.mode,
      font: func.slice(1),
      body
    };
  },
  htmlBuilder: htmlBuilder$5,
  mathmlBuilder: mathmlBuilder$4
});
defineFunction({
  type: "mclass",
  names: ["\\boldsymbol", "\\bm"],
  numArgs: 1,
  handler: (_ref2, args) => {
    var parser = _ref2.parser;
    var body = args[0];
    return {
      type: "mclass",
      mode: parser.mode,
      mclass: binrelClass(body),
      body: [{
        type: "font",
        mode: parser.mode,
        font: "boldsymbol",
        body
      }],
      isCharacterBox: isCharacterBox(body)
    };
  }
});
defineFunction({
  type: "font",
  names: ["\\rm", "\\sf", "\\tt", "\\bf", "\\it", "\\cal"],
  numArgs: 0,
  allowedInText: true,
  handler: (_ref3, args) => {
    var parser = _ref3.parser, funcName = _ref3.funcName, breakOnTokenText = _ref3.breakOnTokenText;
    var mode = parser.mode;
    var body = parser.parseExpression(true, breakOnTokenText);
    return {
      type: "font",
      mode,
      font: "math" + funcName.slice(1),
      body: {
        type: "ordgroup",
        mode: parser.mode,
        body
      }
    };
  }
});
var htmlBuilder$4 = (group, options) => {
  var style = options.style;
  var nstyle = style.fracNum();
  var dstyle = style.fracDen();
  var newOptions;
  newOptions = options.havingStyle(nstyle);
  var numerm = buildGroup$1(group.numer, newOptions, options);
  if (group.continued) {
    var hStrut = 8.5 / options.fontMetrics().ptPerEm;
    var dStrut = 3.5 / options.fontMetrics().ptPerEm;
    numerm.height = numerm.height < hStrut ? hStrut : numerm.height;
    numerm.depth = numerm.depth < dStrut ? dStrut : numerm.depth;
  }
  newOptions = options.havingStyle(dstyle);
  var denomm = buildGroup$1(group.denom, newOptions, options);
  var rule;
  var ruleWidth;
  var ruleSpacing;
  if (group.hasBarLine) {
    if (group.barSize) {
      ruleWidth = calculateSize(group.barSize, options);
      rule = makeLineSpan("frac-line", options, ruleWidth);
    } else {
      rule = makeLineSpan("frac-line", options);
    }
    ruleWidth = rule.height;
    ruleSpacing = rule.height;
  } else {
    rule = null;
    ruleWidth = 0;
    ruleSpacing = options.fontMetrics().defaultRuleThickness;
  }
  var numShift;
  var clearance;
  var denomShift;
  if (style.size === Style$1.DISPLAY.size) {
    numShift = options.fontMetrics().num1;
    if (ruleWidth > 0) {
      clearance = 3 * ruleSpacing;
    } else {
      clearance = 7 * ruleSpacing;
    }
    denomShift = options.fontMetrics().denom1;
  } else {
    if (ruleWidth > 0) {
      numShift = options.fontMetrics().num2;
      clearance = ruleSpacing;
    } else {
      numShift = options.fontMetrics().num3;
      clearance = 3 * ruleSpacing;
    }
    denomShift = options.fontMetrics().denom2;
  }
  var frac;
  if (!rule) {
    var candidateClearance = numShift - numerm.depth - (denomm.height - denomShift);
    if (candidateClearance < clearance) {
      numShift += 0.5 * (clearance - candidateClearance);
      denomShift += 0.5 * (clearance - candidateClearance);
    }
    frac = makeVList({
      positionType: "individualShift",
      children: [{
        type: "elem",
        elem: denomm,
        shift: denomShift
      }, {
        type: "elem",
        elem: numerm,
        shift: -numShift
      }]
    });
  } else {
    var axisHeight = options.fontMetrics().axisHeight;
    if (numShift - numerm.depth - (axisHeight + 0.5 * ruleWidth) < clearance) {
      numShift += clearance - (numShift - numerm.depth - (axisHeight + 0.5 * ruleWidth));
    }
    if (axisHeight - 0.5 * ruleWidth - (denomm.height - denomShift) < clearance) {
      denomShift += clearance - (axisHeight - 0.5 * ruleWidth - (denomm.height - denomShift));
    }
    var midShift = -(axisHeight - 0.5 * ruleWidth);
    frac = makeVList({
      positionType: "individualShift",
      children: [{
        type: "elem",
        elem: denomm,
        shift: denomShift
      }, {
        type: "elem",
        elem: rule,
        shift: midShift
      }, {
        type: "elem",
        elem: numerm,
        shift: -numShift
      }]
    });
  }
  newOptions = options.havingStyle(style);
  frac.height *= newOptions.sizeMultiplier / options.sizeMultiplier;
  frac.depth *= newOptions.sizeMultiplier / options.sizeMultiplier;
  var delimSize;
  if (style.size === Style$1.DISPLAY.size) {
    delimSize = options.fontMetrics().delim1;
  } else if (style.size === Style$1.SCRIPTSCRIPT.size) {
    delimSize = options.havingStyle(Style$1.SCRIPT).fontMetrics().delim2;
  } else {
    delimSize = options.fontMetrics().delim2;
  }
  var leftDelim;
  var rightDelim;
  if (group.leftDelim == null) {
    leftDelim = makeNullDelimiter(options, ["mopen"]);
  } else {
    leftDelim = makeCustomSizedDelim(group.leftDelim, delimSize, true, options.havingStyle(style), group.mode, ["mopen"]);
  }
  if (group.continued) {
    rightDelim = makeSpan([]);
  } else if (group.rightDelim == null) {
    rightDelim = makeNullDelimiter(options, ["mclose"]);
  } else {
    rightDelim = makeCustomSizedDelim(group.rightDelim, delimSize, true, options.havingStyle(style), group.mode, ["mclose"]);
  }
  return makeSpan(["mord"].concat(newOptions.sizingClasses(options)), [leftDelim, makeSpan(["mfrac"], [frac]), rightDelim], options);
};
var mathmlBuilder$3 = (group, options) => {
  var node = new MathNode("mfrac", [buildGroup2(group.numer, options), buildGroup2(group.denom, options)]);
  if (!group.hasBarLine) {
    node.setAttribute("linethickness", "0px");
  } else if (group.barSize) {
    var ruleWidth = calculateSize(group.barSize, options);
    node.setAttribute("linethickness", makeEm(ruleWidth));
  }
  if (group.leftDelim != null || group.rightDelim != null) {
    var withDelims = [];
    if (group.leftDelim != null) {
      var leftOp = new MathNode("mo", [new TextNode(group.leftDelim.replace("\\", ""))]);
      leftOp.setAttribute("fence", "true");
      withDelims.push(leftOp);
    }
    withDelims.push(node);
    if (group.rightDelim != null) {
      var rightOp = new MathNode("mo", [new TextNode(group.rightDelim.replace("\\", ""))]);
      rightOp.setAttribute("fence", "true");
      withDelims.push(rightOp);
    }
    return makeRow(withDelims);
  }
  return node;
};
var wrapWithStyle = (frac, style) => {
  if (!style) {
    return frac;
  }
  var wrapper = {
    type: "styling",
    mode: frac.mode,
    style,
    body: [frac]
  };
  return wrapper;
};
defineFunction({
  type: "genfrac",
  names: [
    "\\cfrac",
    "\\dfrac",
    "\\frac",
    "\\tfrac",
    "\\dbinom",
    "\\binom",
    "\\tbinom",
    "\\\\atopfrac",
    // can’t be entered directly
    "\\\\bracefrac",
    "\\\\brackfrac"
    // ditto
  ],
  numArgs: 2,
  allowedInArgument: true,
  handler: (_ref2, args) => {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    var numer = args[0];
    var denom = args[1];
    var hasBarLine;
    var leftDelim = null;
    var rightDelim = null;
    switch (funcName) {
      case "\\cfrac":
      case "\\dfrac":
      case "\\frac":
      case "\\tfrac":
        hasBarLine = true;
        break;
      case "\\\\atopfrac":
        hasBarLine = false;
        break;
      case "\\dbinom":
      case "\\binom":
      case "\\tbinom":
        hasBarLine = false;
        leftDelim = "(";
        rightDelim = ")";
        break;
      case "\\\\bracefrac":
        hasBarLine = false;
        leftDelim = "\\{";
        rightDelim = "\\}";
        break;
      case "\\\\brackfrac":
        hasBarLine = false;
        leftDelim = "[";
        rightDelim = "]";
        break;
      default:
        throw new Error("Unrecognized genfrac command");
    }
    var continued = funcName === "\\cfrac";
    var style = null;
    if (continued || funcName.startsWith("\\d")) {
      style = "display";
    } else if (funcName.startsWith("\\t")) {
      style = "text";
    }
    return wrapWithStyle({
      type: "genfrac",
      mode: parser.mode,
      numer,
      denom,
      continued,
      hasBarLine,
      leftDelim,
      rightDelim,
      barSize: null
    }, style);
  },
  htmlBuilder: htmlBuilder$4,
  mathmlBuilder: mathmlBuilder$3
});
defineFunction({
  type: "infix",
  names: ["\\over", "\\choose", "\\atop", "\\brace", "\\brack"],
  numArgs: 0,
  infix: true,
  handler(_ref2) {
    var parser = _ref2.parser, funcName = _ref2.funcName, token = _ref2.token;
    var replaceWith;
    switch (funcName) {
      case "\\over":
        replaceWith = "\\frac";
        break;
      case "\\choose":
        replaceWith = "\\binom";
        break;
      case "\\atop":
        replaceWith = "\\\\atopfrac";
        break;
      case "\\brace":
        replaceWith = "\\\\bracefrac";
        break;
      case "\\brack":
        replaceWith = "\\\\brackfrac";
        break;
      default:
        throw new Error("Unrecognized infix genfrac command");
    }
    return {
      type: "infix",
      mode: parser.mode,
      replaceWith,
      token
    };
  }
});
var stylArray = ["display", "text", "script", "scriptscript"];
var delimFromValue = function delimFromValue2(delimString) {
  var delim = null;
  if (delimString.length > 0) {
    delim = delimString;
    delim = delim === "." ? null : delim;
  }
  return delim;
};
defineFunction({
  type: "genfrac",
  names: ["\\genfrac"],
  numArgs: 6,
  allowedInArgument: true,
  argTypes: ["math", "math", "size", "text", "math", "math"],
  handler(_ref3, args) {
    var parser = _ref3.parser;
    var numer = args[4];
    var denom = args[5];
    var leftNode = normalizeArgument(args[0]);
    var leftDelim = leftNode.type === "atom" && leftNode.family === "open" ? delimFromValue(leftNode.text) : null;
    var rightNode = normalizeArgument(args[1]);
    var rightDelim = rightNode.type === "atom" && rightNode.family === "close" ? delimFromValue(rightNode.text) : null;
    var barNode = assertNodeType(args[2], "size");
    var hasBarLine;
    var barSize = null;
    if (barNode.isBlank) {
      hasBarLine = true;
    } else {
      barSize = barNode.value;
      hasBarLine = barSize.number > 0;
    }
    var size = null;
    var styl = args[3];
    if (styl.type === "ordgroup") {
      if (styl.body.length > 0) {
        var textOrd = assertNodeType(styl.body[0], "textord");
        size = stylArray[Number(textOrd.text)];
      }
    } else {
      styl = assertNodeType(styl, "textord");
      size = stylArray[Number(styl.text)];
    }
    return wrapWithStyle({
      type: "genfrac",
      mode: parser.mode,
      numer,
      denom,
      continued: false,
      hasBarLine,
      barSize,
      leftDelim,
      rightDelim
    }, size);
  }
});
defineFunction({
  type: "infix",
  names: ["\\above"],
  numArgs: 1,
  argTypes: ["size"],
  infix: true,
  handler(_ref4, args) {
    var parser = _ref4.parser;
    _ref4.funcName;
    var token = _ref4.token;
    return {
      type: "infix",
      mode: parser.mode,
      replaceWith: "\\\\abovefrac",
      size: assertNodeType(args[0], "size").value,
      token
    };
  }
});
defineFunction({
  type: "genfrac",
  names: ["\\\\abovefrac"],
  numArgs: 3,
  argTypes: ["math", "size", "math"],
  handler: (_ref5, args) => {
    var parser = _ref5.parser;
    _ref5.funcName;
    var numer = args[0];
    var barSize = assertNodeType(args[1], "infix").size;
    if (!barSize) {
      throw new Error("\\\\abovefrac expected size, but got " + String(barSize));
    }
    var denom = args[2];
    var hasBarLine = barSize.number > 0;
    return {
      type: "genfrac",
      mode: parser.mode,
      numer,
      denom,
      continued: false,
      hasBarLine,
      barSize,
      leftDelim: null,
      rightDelim: null
    };
  }
});
var htmlBuilder$3 = (grp, options) => {
  var style = options.style;
  var supSubGroup;
  var group;
  if (grp.type === "supsub") {
    supSubGroup = grp.sup ? buildGroup$1(grp.sup, options.havingStyle(style.sup()), options) : buildGroup$1(grp.sub, options.havingStyle(style.sub()), options);
    group = assertNodeType(grp.base, "horizBrace");
  } else {
    group = assertNodeType(grp, "horizBrace");
  }
  var body = buildGroup$1(group.base, options.havingBaseStyle(Style$1.DISPLAY));
  var braceBody = stretchySvg(group, options);
  var vlist;
  if (group.isOver) {
    vlist = makeVList({
      positionType: "firstBaseline",
      children: [{
        type: "elem",
        elem: body
      }, {
        type: "kern",
        size: 0.1
      }, {
        type: "elem",
        elem: braceBody,
        wrapperClasses: ["svg-align"]
      }]
    });
  } else {
    vlist = makeVList({
      positionType: "bottom",
      positionData: body.depth + 0.1 + braceBody.height,
      children: [{
        type: "elem",
        elem: braceBody,
        wrapperClasses: ["svg-align"]
      }, {
        type: "kern",
        size: 0.1
      }, {
        type: "elem",
        elem: body
      }]
    });
  }
  if (supSubGroup) {
    var vSpan = makeSpan(["minner", group.isOver ? "mover" : "munder"], [vlist], options);
    if (group.isOver) {
      vlist = makeVList({
        positionType: "firstBaseline",
        children: [{
          type: "elem",
          elem: vSpan
        }, {
          type: "kern",
          size: 0.2
        }, {
          type: "elem",
          elem: supSubGroup
        }]
      });
    } else {
      vlist = makeVList({
        positionType: "bottom",
        positionData: vSpan.depth + 0.2 + supSubGroup.height + supSubGroup.depth,
        children: [{
          type: "elem",
          elem: supSubGroup
        }, {
          type: "kern",
          size: 0.2
        }, {
          type: "elem",
          elem: vSpan
        }]
      });
    }
  }
  return makeSpan(["minner", group.isOver ? "mover" : "munder"], [vlist], options);
};
var mathmlBuilder$2 = (group, options) => {
  var accentNode = stretchyMathML(group.label);
  return new MathNode(group.isOver ? "mover" : "munder", [buildGroup2(group.base, options), accentNode]);
};
defineFunction({
  type: "horizBrace",
  names: ["\\overbrace", "\\underbrace", "\\overbracket", "\\underbracket"],
  numArgs: 1,
  handler(_ref2, args) {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    return {
      type: "horizBrace",
      mode: parser.mode,
      label: funcName,
      isOver: funcName.includes("\\over"),
      base: args[0]
    };
  },
  htmlBuilder: htmlBuilder$3,
  mathmlBuilder: mathmlBuilder$2
});
defineFunction({
  type: "href",
  names: ["\\href"],
  numArgs: 2,
  argTypes: ["url", "original"],
  allowedInText: true,
  handler: (_ref2, args) => {
    var parser = _ref2.parser;
    var body = args[1];
    var href = assertNodeType(args[0], "url").url;
    if (!parser.settings.isTrusted({
      command: "\\href",
      url: href
    })) {
      return parser.formatUnsupportedCmd("\\href");
    }
    return {
      type: "href",
      mode: parser.mode,
      href,
      body: ordargument(body)
    };
  },
  htmlBuilder: (group, options) => {
    var elements = buildExpression$1(group.body, options, false);
    return makeAnchor(group.href, [], elements, options);
  },
  mathmlBuilder: (group, options) => {
    var math2 = buildExpressionRow(group.body, options);
    if (!(math2 instanceof MathNode)) {
      math2 = new MathNode("mrow", [math2]);
    }
    math2.setAttribute("href", group.href);
    return math2;
  }
});
defineFunction({
  type: "href",
  names: ["\\url"],
  numArgs: 1,
  argTypes: ["url"],
  allowedInText: true,
  handler: (_ref2, args) => {
    var parser = _ref2.parser;
    var href = assertNodeType(args[0], "url").url;
    if (!parser.settings.isTrusted({
      command: "\\url",
      url: href
    })) {
      return parser.formatUnsupportedCmd("\\url");
    }
    var chars = [];
    for (var i2 = 0; i2 < href.length; i2++) {
      var c = href[i2];
      if (c === "~") {
        c = "\\textasciitilde";
      }
      chars.push({
        type: "textord",
        mode: "text",
        text: c
      });
    }
    var body = {
      type: "text",
      mode: parser.mode,
      font: "\\texttt",
      body: chars
    };
    return {
      type: "href",
      mode: parser.mode,
      href,
      body: ordargument(body)
    };
  }
});
defineFunction({
  type: "hbox",
  names: ["\\hbox"],
  numArgs: 1,
  argTypes: ["text"],
  allowedInText: true,
  primitive: true,
  handler(_ref2, args) {
    var parser = _ref2.parser;
    return {
      type: "hbox",
      mode: parser.mode,
      body: ordargument(args[0])
    };
  },
  htmlBuilder(group, options) {
    var elements = buildExpression$1(group.body, options.withFont(""), false);
    return makeFragment(elements);
  },
  mathmlBuilder(group, options) {
    return new MathNode("mrow", buildExpression2(group.body, options.withFont("")));
  }
});
defineFunction({
  type: "html",
  names: ["\\htmlClass", "\\htmlId", "\\htmlStyle", "\\htmlData"],
  numArgs: 2,
  argTypes: ["raw", "original"],
  allowedInText: true,
  handler: (_ref2, args) => {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    _ref2.token;
    var value = assertNodeType(args[0], "raw").string;
    var body = args[1];
    if (parser.settings.strict) {
      handleStrict({
        strict: parser.settings.strict,
        errorCode: "htmlExtension",
        errorMsg: "HTML extension is disabled on strict mode",
        report: true
      });
    }
    var trustContext;
    var attributes = {};
    switch (funcName) {
      case "\\htmlClass":
        attributes.class = value;
        trustContext = {
          command: "\\htmlClass",
          class: value
        };
        break;
      case "\\htmlId":
        attributes.id = value;
        trustContext = {
          command: "\\htmlId",
          id: value
        };
        break;
      case "\\htmlStyle":
        attributes.style = value;
        trustContext = {
          command: "\\htmlStyle",
          style: value
        };
        break;
      case "\\htmlData": {
        var ESCAPED_COMMA = "{,}";
        var data = [];
        var current = "";
        for (var i2 = 0; i2 < value.length; i2++) {
          if (value.startsWith(ESCAPED_COMMA, i2)) {
            current += ",";
            i2 += ESCAPED_COMMA.length - 1;
          } else if (value[i2] === ",") {
            data.push(current);
            current = "";
          } else {
            current += value[i2];
          }
        }
        data.push(current);
        for (var _i6 = 0; _i6 < data.length; _i6++) {
          var item = data[_i6];
          var firstEquals = item.indexOf("=");
          if (firstEquals < 0) {
            throw new ParseError("\\htmlData key/value '" + item + "' missing equals sign");
          }
          var key = item.slice(0, firstEquals);
          var _value = item.slice(firstEquals + 1);
          attributes["data-" + key.trim()] = _value;
        }
        trustContext = {
          command: "\\htmlData",
          attributes
        };
        break;
      }
      default:
        throw new Error("Unrecognized html command");
    }
    if (!parser.settings.isTrusted(trustContext)) {
      return parser.formatUnsupportedCmd(funcName);
    }
    return {
      type: "html",
      mode: parser.mode,
      attributes,
      body: ordargument(body)
    };
  },
  htmlBuilder: (group, options) => {
    var elements = buildExpression$1(group.body, options, false);
    var classes = ["enclosing"];
    if (group.attributes.class) {
      classes.push(...group.attributes.class.trim().split(/\s+/));
    }
    var span = makeSpan(classes, elements, options);
    for (var _ref3 of Object.entries(group.attributes)) {
      var attr2 = _ref3[0];
      var value = _ref3[1];
      if (attr2 !== "class") {
        span.setAttribute(attr2, value);
      }
    }
    return span;
  },
  mathmlBuilder: (group, options) => {
    return buildExpressionRow(group.body, options);
  }
});
defineFunction({
  type: "htmlmathml",
  names: ["\\html@mathml"],
  numArgs: 2,
  allowedInArgument: true,
  allowedInText: true,
  handler: (_ref2, args) => {
    var parser = _ref2.parser;
    return {
      type: "htmlmathml",
      mode: parser.mode,
      html: ordargument(args[0]),
      mathml: ordargument(args[1])
    };
  },
  htmlBuilder: (group, options) => {
    var elements = buildExpression$1(group.html, options, false);
    return makeFragment(elements);
  },
  mathmlBuilder: (group, options) => {
    return buildExpressionRow(group.mathml, options);
  }
});
var sizeData = function sizeData2(str) {
  if (/^[-+]? *(\d+(\.\d*)?|\.\d+)$/.test(str)) {
    return {
      number: +str,
      unit: "bp"
    };
  } else {
    var match = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(str);
    if (!match) {
      throw new ParseError("Invalid size: '" + str + "' in \\includegraphics");
    }
    var data = {
      number: +(match[1] + match[2]),
      // sign + magnitude, cast to number
      unit: match[3]
    };
    if (!validUnit(data)) {
      throw new ParseError("Invalid unit: '" + data.unit + "' in \\includegraphics.");
    }
    return data;
  }
};
defineFunction({
  type: "includegraphics",
  names: ["\\includegraphics"],
  numArgs: 1,
  numOptionalArgs: 1,
  argTypes: ["raw", "url"],
  allowedInText: false,
  handler: (_ref2, args, optArgs) => {
    var parser = _ref2.parser;
    var width = {
      number: 0,
      unit: "em"
    };
    var height = {
      number: 0.9,
      unit: "em"
    };
    var totalheight = {
      number: 0,
      unit: "em"
    };
    var alt = "";
    if (optArgs[0]) {
      var attributeStr = assertNodeType(optArgs[0], "raw").string;
      var attributes = attributeStr.split(",");
      for (var i2 = 0; i2 < attributes.length; i2++) {
        var keyVal = attributes[i2].split("=");
        if (keyVal.length === 2) {
          var str = keyVal[1].trim();
          switch (keyVal[0].trim()) {
            case "alt":
              alt = str;
              break;
            case "width":
              width = sizeData(str);
              break;
            case "height":
              height = sizeData(str);
              break;
            case "totalheight":
              totalheight = sizeData(str);
              break;
            default:
              throw new ParseError("Invalid key: '" + keyVal[0] + "' in \\includegraphics.");
          }
        }
      }
    }
    var src = assertNodeType(args[0], "url").url;
    if (alt === "") {
      alt = src;
      alt = alt.replace(/^.*[\\/]/, "");
      alt = alt.substring(0, alt.lastIndexOf("."));
    }
    if (!parser.settings.isTrusted({
      command: "\\includegraphics",
      url: src
    })) {
      return parser.formatUnsupportedCmd("\\includegraphics");
    }
    return {
      type: "includegraphics",
      mode: parser.mode,
      alt,
      width,
      height,
      totalheight,
      src
    };
  },
  htmlBuilder: (group, options) => {
    var height = calculateSize(group.height, options);
    var depth = 0;
    if (group.totalheight.number > 0) {
      depth = calculateSize(group.totalheight, options) - height;
    }
    var width = 0;
    if (group.width.number > 0) {
      width = calculateSize(group.width, options);
    }
    var style = {
      height: makeEm(height + depth)
    };
    if (width > 0) {
      style.width = makeEm(width);
    }
    if (depth > 0) {
      style.verticalAlign = makeEm(-depth);
    }
    var node = new Img(group.src, group.alt, style);
    node.height = height;
    node.depth = depth;
    return node;
  },
  mathmlBuilder: (group, options) => {
    var node = new MathNode("mglyph", []);
    node.setAttribute("alt", group.alt);
    var height = calculateSize(group.height, options);
    var depth = 0;
    if (group.totalheight.number > 0) {
      depth = calculateSize(group.totalheight, options) - height;
      node.setAttribute("valign", makeEm(-depth));
    }
    node.setAttribute("height", makeEm(height + depth));
    if (group.width.number > 0) {
      var width = calculateSize(group.width, options);
      node.setAttribute("width", makeEm(width));
    }
    node.setAttribute("src", group.src);
    return node;
  }
});
defineFunction({
  type: "kern",
  names: ["\\kern", "\\mkern", "\\hskip", "\\mskip"],
  numArgs: 1,
  argTypes: ["size"],
  primitive: true,
  allowedInText: true,
  handler(_ref2, args) {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    var size = assertNodeType(args[0], "size");
    if (parser.settings.strict) {
      var mathFunction = funcName[1] === "m";
      var muUnit = size.value.unit === "mu";
      if (mathFunction) {
        if (!muUnit) {
          handleStrict({
            strict: parser.settings.strict,
            errorCode: "mathVsTextUnits",
            errorMsg: "LaTeX's " + funcName + " supports only mu units, " + ("not " + size.value.unit + " units"),
            report: true
          });
        }
        if (parser.mode !== "math") {
          handleStrict({
            strict: parser.settings.strict,
            errorCode: "mathVsTextUnits",
            errorMsg: "LaTeX's " + funcName + " works only in math mode",
            report: true
          });
        }
      } else {
        if (muUnit) {
          handleStrict({
            strict: parser.settings.strict,
            errorCode: "mathVsTextUnits",
            errorMsg: "LaTeX's " + funcName + " doesn't support mu units",
            report: true
          });
        }
      }
    }
    return {
      type: "kern",
      mode: parser.mode,
      dimension: size.value
    };
  },
  htmlBuilder(group, options) {
    return makeGlue(group.dimension, options);
  },
  mathmlBuilder(group, options) {
    var dimension = calculateSize(group.dimension, options);
    return new SpaceNode(dimension);
  }
});
defineFunction({
  type: "lap",
  names: ["\\mathllap", "\\mathrlap", "\\mathclap"],
  numArgs: 1,
  allowedInText: true,
  handler: (_ref2, args) => {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    var body = args[0];
    return {
      type: "lap",
      mode: parser.mode,
      alignment: funcName.slice(5),
      body
    };
  },
  htmlBuilder: (group, options) => {
    var inner2;
    if (group.alignment === "clap") {
      inner2 = makeSpan([], [buildGroup$1(group.body, options)]);
      inner2 = makeSpan(["katex-inner"], [inner2], options);
    } else {
      inner2 = makeSpan(["katex-inner"], [buildGroup$1(group.body, options)]);
    }
    var fix = makeSpan(["katex-fix"], []);
    var node = makeSpan([group.alignment], [inner2, fix], options);
    var strut = makeSpan(["katex-strut"]);
    strut.style.height = makeEm(node.height + node.depth);
    if (node.depth) {
      strut.style.verticalAlign = makeEm(-node.depth);
    }
    node.children.unshift(strut);
    node = makeSpan(["katex-thinbox"], [node], options);
    return makeSpan(["mord", "katex-vbox"], [node], options);
  },
  mathmlBuilder: (group, options) => {
    var node = new MathNode("mpadded", [buildGroup2(group.body, options)]);
    if (group.alignment !== "rlap") {
      var offset = group.alignment === "llap" ? "-1" : "-0.5";
      node.setAttribute("lspace", offset + "width");
    }
    node.setAttribute("width", "0px");
    return node;
  }
});
defineFunction({
  type: "styling",
  names: ["\\(", "$"],
  numArgs: 0,
  allowedInText: true,
  allowedInMath: false,
  handler(_ref2, args) {
    var funcName = _ref2.funcName, parser = _ref2.parser;
    var outerMode = parser.mode;
    parser.switchMode("math");
    var close2 = funcName === "\\(" ? "\\)" : "$";
    var body = parser.parseExpression(false, close2);
    parser.expect(close2);
    parser.switchMode(outerMode);
    return {
      type: "styling",
      mode: parser.mode,
      style: "text",
      resetFont: true,
      body
    };
  }
});
defineFunction({
  type: "text",
  // Doesn't matter what this is.
  names: ["\\)", "\\]"],
  numArgs: 0,
  allowedInText: true,
  allowedInMath: false,
  handler(context, args) {
    throw new ParseError("Mismatched " + context.funcName);
  }
});
var chooseMathStyle = (group, options) => {
  switch (options.style.size) {
    case Style$1.DISPLAY.size:
      return group.display;
    case Style$1.TEXT.size:
      return group.text;
    case Style$1.SCRIPT.size:
      return group.script;
    case Style$1.SCRIPTSCRIPT.size:
      return group.scriptscript;
    default:
      return group.text;
  }
};
defineFunction({
  type: "mathchoice",
  names: ["\\mathchoice"],
  numArgs: 4,
  primitive: true,
  handler: (_ref2, args) => {
    var parser = _ref2.parser;
    return {
      type: "mathchoice",
      mode: parser.mode,
      display: ordargument(args[0]),
      text: ordargument(args[1]),
      script: ordargument(args[2]),
      scriptscript: ordargument(args[3])
    };
  },
  htmlBuilder: (group, options) => {
    var body = chooseMathStyle(group, options);
    var elements = buildExpression$1(body, options, false);
    return makeFragment(elements);
  },
  mathmlBuilder: (group, options) => {
    var body = chooseMathStyle(group, options);
    return buildExpressionRow(body, options);
  }
});
var assembleSupSub = (base, supGroup, subGroup, options, style, slant, baseShift) => {
  base = makeSpan([], [base]);
  var subIsSingleCharacter = subGroup && isCharacterBox(subGroup);
  var sub2;
  var sup2;
  if (supGroup) {
    var elem = buildGroup$1(supGroup, options.havingStyle(style.sup()), options);
    sup2 = {
      elem,
      kern: Math.max(options.fontMetrics().bigOpSpacing1, options.fontMetrics().bigOpSpacing3 - elem.depth)
    };
  }
  if (subGroup) {
    var _elem = buildGroup$1(subGroup, options.havingStyle(style.sub()), options);
    sub2 = {
      elem: _elem,
      kern: Math.max(options.fontMetrics().bigOpSpacing2, options.fontMetrics().bigOpSpacing4 - _elem.height)
    };
  }
  var finalGroup;
  if (sup2 && sub2) {
    var bottom = options.fontMetrics().bigOpSpacing5 + sub2.elem.height + sub2.elem.depth + sub2.kern + base.depth + baseShift;
    finalGroup = makeVList({
      positionType: "bottom",
      positionData: bottom,
      children: [{
        type: "kern",
        size: options.fontMetrics().bigOpSpacing5
      }, {
        type: "elem",
        elem: sub2.elem,
        marginLeft: makeEm(-slant)
      }, {
        type: "kern",
        size: sub2.kern
      }, {
        type: "elem",
        elem: base
      }, {
        type: "kern",
        size: sup2.kern
      }, {
        type: "elem",
        elem: sup2.elem,
        marginLeft: makeEm(slant)
      }, {
        type: "kern",
        size: options.fontMetrics().bigOpSpacing5
      }]
    });
  } else if (sub2) {
    var top = base.height - baseShift;
    finalGroup = makeVList({
      positionType: "top",
      positionData: top,
      children: [{
        type: "kern",
        size: options.fontMetrics().bigOpSpacing5
      }, {
        type: "elem",
        elem: sub2.elem,
        marginLeft: makeEm(-slant)
      }, {
        type: "kern",
        size: sub2.kern
      }, {
        type: "elem",
        elem: base
      }]
    });
  } else if (sup2) {
    var _bottom = base.depth + baseShift;
    finalGroup = makeVList({
      positionType: "bottom",
      positionData: _bottom,
      children: [{
        type: "elem",
        elem: base
      }, {
        type: "kern",
        size: sup2.kern
      }, {
        type: "elem",
        elem: sup2.elem,
        marginLeft: makeEm(slant)
      }, {
        type: "kern",
        size: options.fontMetrics().bigOpSpacing5
      }]
    });
  } else {
    return base;
  }
  var parts = [finalGroup];
  if (sub2 && slant !== 0 && !subIsSingleCharacter) {
    var spacer = makeSpan(["mspace"], [], options);
    spacer.style.marginRight = makeEm(slant);
    parts.unshift(spacer);
  }
  return makeSpan(["mop", "op-limits"], parts, options);
};
var noSuccessor = /* @__PURE__ */ new Set(["\\smallint"]);
var htmlBuilder$2 = (grp, options) => {
  var supGroup;
  var subGroup;
  var hasLimits = false;
  var group;
  if (grp.type === "supsub") {
    supGroup = grp.sup;
    subGroup = grp.sub;
    group = assertNodeType(grp.base, "op");
    hasLimits = true;
  } else {
    group = assertNodeType(grp, "op");
  }
  var style = options.style;
  var large = false;
  if (style.size === Style$1.DISPLAY.size && group.symbol && !noSuccessor.has(group.name)) {
    large = true;
  }
  var base;
  var symbolItalic;
  if (group.symbol) {
    var fontName = large ? "Size2-Regular" : "Size1-Regular";
    var stash = "";
    if (group.name === "\\oiint" || group.name === "\\oiiint") {
      stash = group.name.slice(1);
      group.name = stash === "oiint" ? "\\iint" : "\\iiint";
    }
    base = makeSymbol(group.name, fontName, "math", options, ["mop", "op-symbol", large ? "large-op" : "small-op"]);
    symbolItalic = base.italic;
    if (stash.length > 0) {
      var oval = staticSvg(stash + "Size" + (large ? "2" : "1"), options);
      base = makeVList({
        positionType: "individualShift",
        children: [{
          type: "elem",
          elem: base,
          shift: 0
        }, {
          type: "elem",
          elem: oval,
          shift: large ? 0.08 : 0
        }]
      });
      group.name = "\\" + stash;
      base.classes.unshift("mop");
      base.italic = symbolItalic;
    }
  } else if (group.body) {
    var inner2 = buildExpression$1(group.body, options, true);
    if (inner2.length === 1 && inner2[0] instanceof SymbolNode) {
      base = inner2[0];
      base.classes[0] = "mop";
    } else {
      base = makeSpan(["mop"], inner2, options);
    }
  } else {
    var output = [];
    for (var i2 = 1; i2 < group.name.length; i2++) {
      output.push(mathsym(group.name[i2], group.mode, options));
    }
    base = makeSpan(["mop"], output, options);
  }
  var baseShift = 0;
  var slant = 0;
  if ((base instanceof SymbolNode || group.name === "\\oiint" || group.name === "\\oiiint") && !group.suppressBaseShift) {
    var _base$italic;
    baseShift = (base.height - base.depth) / 2 - options.fontMetrics().axisHeight;
    slant = (_base$italic = base.italic) != null ? _base$italic : 0;
  }
  if (hasLimits) {
    return assembleSupSub(base, supGroup, subGroup, options, style, slant, baseShift);
  } else {
    if (baseShift) {
      base.style.position = "relative";
      base.style.top = makeEm(baseShift);
    }
    return base;
  }
};
var mathmlBuilder$1 = (group, options) => {
  var node;
  if (group.symbol) {
    node = new MathNode("mo", [makeText(group.name, group.mode)]);
    if (noSuccessor.has(group.name)) {
      node.setAttribute("largeop", "false");
    }
  } else if (group.body) {
    node = new MathNode("mo", buildExpression2(group.body, options));
  } else {
    node = new MathNode("mi", [new TextNode(group.name.slice(1))]);
    var operator = new MathNode("mo", [makeText("\u2061", "text")]);
    if (group.parentIsSupSub) {
      node = new MathNode("mrow", [node, operator]);
    } else {
      node = newDocumentFragment([node, operator]);
    }
  }
  return node;
};
var singleCharBigOps = {
  "\u220F": "\\prod",
  "\u2210": "\\coprod",
  "\u2211": "\\sum",
  "\u22C0": "\\bigwedge",
  "\u22C1": "\\bigvee",
  "\u22C2": "\\bigcap",
  "\u22C3": "\\bigcup",
  "\u2A00": "\\bigodot",
  "\u2A01": "\\bigoplus",
  "\u2A02": "\\bigotimes",
  "\u2A04": "\\biguplus",
  "\u2A06": "\\bigsqcup"
};
defineFunction({
  type: "op",
  names: ["\\coprod", "\\bigvee", "\\bigwedge", "\\biguplus", "\\bigcap", "\\bigcup", "\\intop", "\\prod", "\\sum", "\\bigotimes", "\\bigoplus", "\\bigodot", "\\bigsqcup", "\\smallint", "\u220F", "\u2210", "\u2211", "\u22C0", "\u22C1", "\u22C2", "\u22C3", "\u2A00", "\u2A01", "\u2A02", "\u2A04", "\u2A06"],
  numArgs: 0,
  handler: (_ref2, args) => {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    var fName = funcName;
    if (fName.length === 1) {
      fName = singleCharBigOps[fName];
    }
    return {
      type: "op",
      mode: parser.mode,
      limits: true,
      parentIsSupSub: false,
      symbol: true,
      name: fName
    };
  },
  htmlBuilder: htmlBuilder$2,
  mathmlBuilder: mathmlBuilder$1
});
defineFunction({
  type: "op",
  names: ["\\mathop"],
  numArgs: 1,
  primitive: true,
  handler: (_ref2, args) => {
    var parser = _ref2.parser;
    var body = args[0];
    return {
      type: "op",
      mode: parser.mode,
      limits: false,
      parentIsSupSub: false,
      symbol: false,
      body: ordargument(body)
    };
  }
});
var singleCharIntegrals = {
  "\u222B": "\\int",
  "\u222C": "\\iint",
  "\u222D": "\\iiint",
  "\u222E": "\\oint",
  "\u222F": "\\oiint",
  "\u2230": "\\oiiint"
};
defineFunction({
  type: "op",
  names: ["\\arcsin", "\\arccos", "\\arctan", "\\arctg", "\\arcctg", "\\arg", "\\ch", "\\cos", "\\cosec", "\\cosh", "\\cot", "\\cotg", "\\coth", "\\csc", "\\ctg", "\\cth", "\\deg", "\\dim", "\\exp", "\\hom", "\\ker", "\\lg", "\\ln", "\\log", "\\sec", "\\sin", "\\sinh", "\\sh", "\\tan", "\\tanh", "\\tg", "\\th"],
  numArgs: 0,
  handler(_ref3) {
    var parser = _ref3.parser, funcName = _ref3.funcName;
    return {
      type: "op",
      mode: parser.mode,
      limits: false,
      parentIsSupSub: false,
      symbol: false,
      name: funcName
    };
  }
});
defineFunction({
  type: "op",
  names: ["\\det", "\\gcd", "\\inf", "\\lim", "\\max", "\\min", "\\Pr", "\\sup"],
  numArgs: 0,
  handler(_ref4) {
    var parser = _ref4.parser, funcName = _ref4.funcName;
    return {
      type: "op",
      mode: parser.mode,
      limits: true,
      parentIsSupSub: false,
      symbol: false,
      name: funcName
    };
  }
});
defineFunction({
  type: "op",
  names: ["\\int", "\\iint", "\\iiint", "\\oint", "\\oiint", "\\oiiint", "\u222B", "\u222C", "\u222D", "\u222E", "\u222F", "\u2230"],
  numArgs: 0,
  allowedInArgument: true,
  handler(_ref5) {
    var parser = _ref5.parser, funcName = _ref5.funcName;
    var fName = funcName;
    if (fName.length === 1) {
      fName = singleCharIntegrals[fName];
    }
    return {
      type: "op",
      mode: parser.mode,
      limits: false,
      parentIsSupSub: false,
      symbol: true,
      name: fName
    };
  }
});
var htmlBuilder$1 = (grp, options) => {
  var supGroup;
  var subGroup;
  var hasLimits = false;
  var group;
  if (grp.type === "supsub") {
    supGroup = grp.sup;
    subGroup = grp.sub;
    group = assertNodeType(grp.base, "operatorname");
    hasLimits = true;
  } else {
    group = assertNodeType(grp, "operatorname");
  }
  var base;
  if (group.body.length > 0) {
    var body = group.body.map((child2) => {
      var childText = "text" in child2 ? child2.text : void 0;
      if (typeof childText === "string") {
        return {
          type: "textord",
          mode: child2.mode,
          text: childText
        };
      } else {
        return child2;
      }
    });
    var expression = buildExpression$1(body, options.withFont("mathrm"), true);
    for (var i2 = 0; i2 < expression.length; i2++) {
      var child = expression[i2];
      if (child instanceof SymbolNode) {
        child.text = child.text.replace(/\u2212/, "-").replace(/\u2217/, "*");
      }
    }
    base = makeSpan(["mop"], expression, options);
  } else {
    base = makeSpan(["mop"], [], options);
  }
  if (hasLimits) {
    return assembleSupSub(base, supGroup, subGroup, options, options.style, 0, 0);
  } else {
    return base;
  }
};
var mathmlBuilder2 = (group, options) => {
  var expression = buildExpression2(group.body, options.withFont("mathrm"));
  var isAllString = true;
  for (var i2 = 0; i2 < expression.length; i2++) {
    var node = expression[i2];
    if (node instanceof SpaceNode) ;
    else if (node instanceof MathNode) {
      switch (node.type) {
        case "mi":
        case "mn":
        case "mspace":
        case "mtext":
          break;
        // Do nothing yet.
        case "mo": {
          var child = node.children[0];
          if (node.children.length === 1 && child instanceof TextNode) {
            child.text = child.text.replace(/\u2212/, "-").replace(/\u2217/, "*");
          } else {
            isAllString = false;
          }
          break;
        }
        default:
          isAllString = false;
      }
    } else {
      isAllString = false;
    }
  }
  if (isAllString) {
    var word = expression.map((node2) => node2.toText()).join("");
    expression = [new TextNode(word)];
  }
  var identifier = new MathNode("mi", expression);
  identifier.setAttribute("mathvariant", "normal");
  var operator = new MathNode("mo", [makeText("\u2061", "text")]);
  if (group.parentIsSupSub) {
    return new MathNode("mrow", [identifier, operator]);
  } else {
    return newDocumentFragment([identifier, operator]);
  }
};
defineFunction({
  type: "operatorname",
  names: ["\\operatorname@", "\\operatornamewithlimits"],
  numArgs: 1,
  handler: (_ref2, args) => {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    var body = args[0];
    return {
      type: "operatorname",
      mode: parser.mode,
      body: ordargument(body),
      alwaysHandleSupSub: funcName === "\\operatornamewithlimits",
      limits: false,
      parentIsSupSub: false
    };
  },
  htmlBuilder: htmlBuilder$1,
  mathmlBuilder: mathmlBuilder2
});
defineMacro("\\operatorname", "\\@ifstar\\operatornamewithlimits\\operatorname@");
defineFunctionBuilders({
  type: "ordgroup",
  htmlBuilder(group, options) {
    if (group.semisimple) {
      return makeFragment(buildExpression$1(group.body, options, false));
    }
    return makeSpan(["mord"], buildExpression$1(group.body, options, true), options);
  },
  mathmlBuilder(group, options) {
    return buildExpressionRow(group.body, options, true);
  }
});
defineFunction({
  type: "overline",
  names: ["\\overline"],
  numArgs: 1,
  handler(_ref2, args) {
    var parser = _ref2.parser;
    var body = args[0];
    return {
      type: "overline",
      mode: parser.mode,
      body
    };
  },
  htmlBuilder(group, options) {
    var innerGroup = buildGroup$1(group.body, options.havingCrampedStyle());
    var line = makeLineSpan("overline-line", options);
    var defaultRuleThickness = options.fontMetrics().defaultRuleThickness;
    var vlist = makeVList({
      positionType: "firstBaseline",
      children: [{
        type: "elem",
        elem: innerGroup
      }, {
        type: "kern",
        size: 3 * defaultRuleThickness
      }, {
        type: "elem",
        elem: line
      }, {
        type: "kern",
        size: defaultRuleThickness
      }]
    });
    return makeSpan(["mord", "katex-overline"], [vlist], options);
  },
  mathmlBuilder(group, options) {
    var operator = new MathNode("mo", [new TextNode("\u203E")]);
    operator.setAttribute("stretchy", "true");
    var node = new MathNode("mover", [buildGroup2(group.body, options), operator]);
    node.setAttribute("accent", "true");
    return node;
  }
});
defineFunction({
  type: "phantom",
  names: ["\\phantom"],
  numArgs: 1,
  allowedInText: true,
  handler: (_ref2, args) => {
    var parser = _ref2.parser;
    var body = args[0];
    return {
      type: "phantom",
      mode: parser.mode,
      body: ordargument(body)
    };
  },
  htmlBuilder: (group, options) => {
    var elements = buildExpression$1(group.body, options.withPhantom(), false);
    return makeFragment(elements);
  },
  mathmlBuilder: (group, options) => {
    var inner2 = buildExpression2(group.body, options);
    return new MathNode("mphantom", inner2);
  }
});
defineMacro("\\hphantom", "\\smash{\\phantom{#1}}");
defineFunction({
  type: "vphantom",
  names: ["\\vphantom"],
  numArgs: 1,
  allowedInText: true,
  handler: (_ref2, args) => {
    var parser = _ref2.parser;
    var body = args[0];
    return {
      type: "vphantom",
      mode: parser.mode,
      body
    };
  },
  htmlBuilder: (group, options) => {
    var inner2 = makeSpan(["katex-inner"], [buildGroup$1(group.body, options.withPhantom())]);
    var fix = makeSpan(["katex-fix"], []);
    return makeSpan(["mord", "rlap"], [inner2, fix], options);
  },
  mathmlBuilder: (group, options) => {
    var inner2 = buildExpression2(ordargument(group.body), options);
    var phantom = new MathNode("mphantom", inner2);
    var node = new MathNode("mpadded", [phantom]);
    node.setAttribute("width", "0px");
    return node;
  }
});
defineFunction({
  type: "raisebox",
  names: ["\\raisebox"],
  numArgs: 2,
  argTypes: ["size", "hbox"],
  allowedInText: true,
  handler(_ref2, args) {
    var parser = _ref2.parser;
    var amount = assertNodeType(args[0], "size").value;
    var body = args[1];
    return {
      type: "raisebox",
      mode: parser.mode,
      dy: amount,
      body
    };
  },
  htmlBuilder(group, options) {
    var body = buildGroup$1(group.body, options);
    var dy = calculateSize(group.dy, options);
    return makeVList({
      positionType: "shift",
      positionData: -dy,
      children: [{
        type: "elem",
        elem: body
      }]
    });
  },
  mathmlBuilder(group, options) {
    var node = new MathNode("mpadded", [buildGroup2(group.body, options)]);
    var dy = group.dy.number + group.dy.unit;
    node.setAttribute("voffset", dy);
    return node;
  }
});
var handler = (_ref2, args) => {
  var parser = _ref2.parser;
  return {
    type: "reflectbox",
    mode: parser.mode,
    body: args[0]
  };
};
defineFunction({
  type: "reflectbox",
  names: ["\\reflectbox"],
  numArgs: 1,
  argTypes: ["hbox"],
  allowedInText: true,
  handler,
  htmlBuilder(group, options) {
    return makeSpan(["mord", "reflectbox"], [buildGroup$1(group.body, options)], options);
  },
  mathmlBuilder(group, options) {
    return buildGroup2(group.body, options);
  }
});
defineFunction({
  type: "reflectbox",
  names: ["\\mathreflectbox"],
  numArgs: 1,
  argTypes: ["math"],
  handler
});
defineFunction({
  type: "internal",
  names: ["\\relax"],
  numArgs: 0,
  allowedInText: true,
  allowedInArgument: true,
  handler(_ref2) {
    var parser = _ref2.parser;
    return {
      type: "internal",
      mode: parser.mode
    };
  }
});
defineFunction({
  type: "rule",
  names: ["\\rule"],
  numArgs: 2,
  numOptionalArgs: 1,
  allowedInText: true,
  allowedInMath: true,
  argTypes: ["size", "size", "size"],
  handler(_ref2, args, optArgs) {
    var parser = _ref2.parser;
    var shift = optArgs[0];
    var width = assertNodeType(args[0], "size");
    var height = assertNodeType(args[1], "size");
    return {
      type: "rule",
      mode: parser.mode,
      shift: shift && assertNodeType(shift, "size").value,
      width: width.value,
      height: height.value
    };
  },
  htmlBuilder(group, options) {
    var rule = makeSpan(["mord", "katex-rule"], [], options);
    var width = calculateSize(group.width, options);
    var height = calculateSize(group.height, options);
    var shift = group.shift ? calculateSize(group.shift, options) : 0;
    rule.style.borderRightWidth = makeEm(width);
    rule.style.borderTopWidth = makeEm(height);
    rule.style.bottom = makeEm(shift);
    rule.width = width;
    rule.height = height + shift;
    rule.depth = -shift;
    rule.maxFontSize = height * 1.125 * options.sizeMultiplier;
    return rule;
  },
  mathmlBuilder(group, options) {
    var width = calculateSize(group.width, options);
    var height = calculateSize(group.height, options);
    var shift = group.shift ? calculateSize(group.shift, options) : 0;
    var color = options.color && options.getColor() || "black";
    var rule = new MathNode("mspace");
    rule.setAttribute("mathbackground", color);
    rule.setAttribute("width", makeEm(width));
    rule.setAttribute("height", makeEm(height));
    var wrapper = new MathNode("mpadded", [rule]);
    if (shift >= 0) {
      wrapper.setAttribute("height", makeEm(shift));
    } else {
      wrapper.setAttribute("height", makeEm(shift));
      wrapper.setAttribute("depth", makeEm(-shift));
    }
    wrapper.setAttribute("voffset", makeEm(shift));
    return wrapper;
  }
});
function sizingGroup(value, options, baseOptions) {
  var inner2 = buildExpression$1(value, options, false);
  var multiplier = options.sizeMultiplier / baseOptions.sizeMultiplier;
  for (var i2 = 0; i2 < inner2.length; i2++) {
    var pos = inner2[i2].classes.indexOf("katex-sizing");
    if (pos < 0) {
      Array.prototype.push.apply(inner2[i2].classes, options.sizingClasses(baseOptions));
    } else if (inner2[i2].classes[pos + 1] === "reset-size" + options.size) {
      inner2[i2].classes[pos + 1] = "reset-size" + baseOptions.size;
    }
    inner2[i2].height *= multiplier;
    inner2[i2].depth *= multiplier;
  }
  return makeFragment(inner2);
}
var sizeFuncs = ["\\tiny", "\\sixptsize", "\\scriptsize", "\\footnotesize", "\\small", "\\normalsize", "\\large", "\\Large", "\\LARGE", "\\huge", "\\Huge"];
var htmlBuilder2 = (group, options) => {
  var newOptions = options.havingSize(group.size);
  return sizingGroup(group.body, newOptions, options);
};
defineFunction({
  type: "sizing",
  names: sizeFuncs,
  numArgs: 0,
  allowedInText: true,
  handler: (_ref2, args) => {
    var breakOnTokenText = _ref2.breakOnTokenText, funcName = _ref2.funcName, parser = _ref2.parser;
    var body = parser.parseExpression(false, breakOnTokenText);
    return {
      type: "sizing",
      mode: parser.mode,
      // Figure out what size to use based on the list of functions above
      size: sizeFuncs.indexOf(funcName) + 1,
      body
    };
  },
  htmlBuilder: htmlBuilder2,
  mathmlBuilder: (group, options) => {
    var newOptions = options.havingSize(group.size);
    var inner2 = buildExpression2(group.body, newOptions);
    var node = new MathNode("mstyle", inner2);
    node.setAttribute("mathsize", makeEm(newOptions.sizeMultiplier));
    return node;
  }
});
defineFunction({
  type: "smash",
  names: ["\\smash"],
  numArgs: 1,
  numOptionalArgs: 1,
  allowedInText: true,
  handler: (_ref2, args, optArgs) => {
    var parser = _ref2.parser;
    var smashHeight = false;
    var smashDepth = false;
    var tbArg = optArgs[0] && assertNodeType(optArgs[0], "ordgroup");
    if (tbArg) {
      var letter;
      for (var i2 = 0; i2 < tbArg.body.length; ++i2) {
        var node = tbArg.body[i2];
        letter = assertSymbolNodeType(node).text;
        if (letter === "t") {
          smashHeight = true;
        } else if (letter === "b") {
          smashDepth = true;
        } else {
          smashHeight = false;
          smashDepth = false;
          break;
        }
      }
    } else {
      smashHeight = true;
      smashDepth = true;
    }
    var body = args[0];
    return {
      type: "smash",
      mode: parser.mode,
      body,
      smashHeight,
      smashDepth
    };
  },
  htmlBuilder: (group, options) => {
    var node = makeSpan([], [buildGroup$1(group.body, options)]);
    if (!group.smashHeight && !group.smashDepth) {
      return node;
    }
    if (group.smashHeight) {
      node.height = 0;
    }
    if (group.smashDepth) {
      node.depth = 0;
    }
    if (group.smashHeight && group.smashDepth) {
      return makeSpan(["mord", "katex-smash"], [node], options);
    }
    if (node.children) {
      for (var i2 = 0; i2 < node.children.length; i2++) {
        if (group.smashHeight) {
          node.children[i2].height = 0;
        }
        if (group.smashDepth) {
          node.children[i2].depth = 0;
        }
      }
    }
    var smashedNode = makeVList({
      positionType: "firstBaseline",
      children: [{
        type: "elem",
        elem: node
      }]
    });
    return makeSpan(["mord"], [smashedNode], options);
  },
  mathmlBuilder: (group, options) => {
    var node = new MathNode("mpadded", [buildGroup2(group.body, options)]);
    if (group.smashHeight) {
      node.setAttribute("height", "0px");
    }
    if (group.smashDepth) {
      node.setAttribute("depth", "0px");
    }
    return node;
  }
});
defineFunction({
  type: "sqrt",
  names: ["\\sqrt"],
  numArgs: 1,
  numOptionalArgs: 1,
  handler(_ref2, args, optArgs) {
    var parser = _ref2.parser;
    var index = optArgs[0];
    var body = args[0];
    return {
      type: "sqrt",
      mode: parser.mode,
      body,
      index
    };
  },
  htmlBuilder(group, options) {
    var inner2 = buildGroup$1(group.body, options.havingCrampedStyle());
    if (inner2.height === 0) {
      inner2.height = options.fontMetrics().xHeight;
    }
    inner2 = wrapFragment(inner2, options);
    var metrics2 = options.fontMetrics();
    var theta = metrics2.defaultRuleThickness;
    var phi = theta;
    if (options.style.id < Style$1.TEXT.id) {
      phi = options.fontMetrics().xHeight;
    }
    var lineClearance = theta + phi / 4;
    var minDelimiterHeight = inner2.height + inner2.depth + lineClearance + theta;
    var _makeSqrtImage = makeSqrtImage(minDelimiterHeight, options), img = _makeSqrtImage.span, ruleWidth = _makeSqrtImage.ruleWidth, advanceWidth = _makeSqrtImage.advanceWidth;
    var delimDepth = img.height - ruleWidth;
    if (delimDepth > inner2.height + inner2.depth + lineClearance) {
      lineClearance = (lineClearance + delimDepth - inner2.height - inner2.depth) / 2;
    }
    var imgShift = img.height - inner2.height - lineClearance - ruleWidth;
    inner2.style.paddingLeft = makeEm(advanceWidth);
    var body = makeVList({
      positionType: "firstBaseline",
      children: [{
        type: "elem",
        elem: inner2,
        wrapperClasses: ["svg-align"]
      }, {
        type: "kern",
        size: -(inner2.height + imgShift)
      }, {
        type: "elem",
        elem: img
      }, {
        type: "kern",
        size: ruleWidth
      }]
    });
    if (!group.index) {
      return makeSpan(["mord", "sqrt"], [body], options);
    } else {
      var newOptions = options.havingStyle(Style$1.SCRIPTSCRIPT);
      var rootm = buildGroup$1(group.index, newOptions, options);
      var toShift = 0.6 * (body.height - body.depth);
      var rootVList = makeVList({
        positionType: "shift",
        positionData: -toShift,
        children: [{
          type: "elem",
          elem: rootm
        }]
      });
      var rootVListWrap = makeSpan(["katex-root"], [rootVList]);
      return makeSpan(["mord", "sqrt"], [rootVListWrap, body], options);
    }
  },
  mathmlBuilder(group, options) {
    var body = group.body, index = group.index;
    return index ? new MathNode("mroot", [buildGroup2(body, options), buildGroup2(index, options)]) : new MathNode("msqrt", [buildGroup2(body, options)]);
  }
});
var styleMap = {
  "display": Style$1.DISPLAY,
  "text": Style$1.TEXT,
  "script": Style$1.SCRIPT,
  "scriptscript": Style$1.SCRIPTSCRIPT
};
function isStyleStr(s) {
  return s in styleMap;
}
defineFunction({
  type: "styling",
  names: ["\\displaystyle", "\\textstyle", "\\scriptstyle", "\\scriptscriptstyle"],
  numArgs: 0,
  allowedInText: true,
  primitive: true,
  handler(_ref2, args) {
    var breakOnTokenText = _ref2.breakOnTokenText, funcName = _ref2.funcName, parser = _ref2.parser;
    var body = parser.parseExpression(true, breakOnTokenText);
    var style = funcName.slice(1, funcName.length - 5);
    if (!isStyleStr(style)) {
      throw new Error("Unknown style: " + style);
    }
    return {
      type: "styling",
      mode: parser.mode,
      // Figure out what style to use by pulling out the style from
      // the function name
      style,
      body
    };
  },
  htmlBuilder(group, options) {
    var newStyle = styleMap[group.style];
    var newOptions = options.havingStyle(newStyle);
    if (group.resetFont) {
      newOptions = newOptions.withFont("");
    }
    return sizingGroup(group.body, newOptions, options);
  },
  mathmlBuilder(group, options) {
    var newStyle = styleMap[group.style];
    var newOptions = options.havingStyle(newStyle);
    if (group.resetFont) {
      newOptions = newOptions.withFont("");
    }
    var inner2 = buildExpression2(group.body, newOptions);
    var node = new MathNode("mstyle", inner2);
    var styleAttributes = {
      "display": ["0", "true"],
      "text": ["0", "false"],
      "script": ["1", "false"],
      "scriptscript": ["2", "false"]
    };
    var attr2 = styleAttributes[group.style];
    node.setAttribute("scriptlevel", attr2[0]);
    node.setAttribute("displaystyle", attr2[1]);
    return node;
  }
});
var htmlBuilderDelegate = function htmlBuilderDelegate2(group, options) {
  var base = group.base;
  if (!base) {
    return null;
  } else if (base.type === "op") {
    var delegate = base.limits && (options.style.size === Style$1.DISPLAY.size || base.alwaysHandleSupSub);
    return delegate ? htmlBuilder$2 : null;
  } else if (base.type === "operatorname") {
    var _delegate = base.alwaysHandleSupSub && (options.style.size === Style$1.DISPLAY.size || base.limits);
    return _delegate ? htmlBuilder$1 : null;
  } else if (base.type === "accent") {
    return isCharacterBox(base.base) ? htmlBuilder$a : null;
  } else if (base.type === "horizBrace") {
    var isSup = !group.sub;
    return isSup === base.isOver ? htmlBuilder$3 : null;
  } else {
    return null;
  }
};
defineFunctionBuilders({
  type: "supsub",
  htmlBuilder(group, options) {
    var builderDelegate = htmlBuilderDelegate(group, options);
    if (builderDelegate) {
      return builderDelegate(group, options);
    }
    var valueBase = group.base, valueSup = group.sup, valueSub = group.sub;
    var base = buildGroup$1(valueBase, options);
    var supm;
    var subm;
    var metrics2 = options.fontMetrics();
    var supShift = 0;
    var subShift = 0;
    var isCharBox = valueBase && isCharacterBox(valueBase);
    if (valueSup) {
      var newOptions = options.havingStyle(options.style.sup());
      supm = buildGroup$1(valueSup, newOptions, options);
      if (!isCharBox) {
        supShift = base.height - newOptions.fontMetrics().supDrop * newOptions.sizeMultiplier / options.sizeMultiplier;
      }
    }
    if (valueSub) {
      var _newOptions = options.havingStyle(options.style.sub());
      subm = buildGroup$1(valueSub, _newOptions, options);
      if (!isCharBox) {
        subShift = base.depth + _newOptions.fontMetrics().subDrop * _newOptions.sizeMultiplier / options.sizeMultiplier;
      }
    }
    var minSupShift;
    if (options.style === Style$1.DISPLAY) {
      minSupShift = metrics2.sup1;
    } else if (options.style.cramped) {
      minSupShift = metrics2.sup3;
    } else {
      minSupShift = metrics2.sup2;
    }
    var multiplier = options.sizeMultiplier;
    var marginRight = makeEm(0.5 / metrics2.ptPerEm / multiplier);
    var marginLeft = null;
    if (subm) {
      var isOiint = group.base && group.base.type === "op" && group.base.name && (group.base.name === "\\oiint" || group.base.name === "\\oiiint");
      if (base instanceof SymbolNode || isOiint) {
        var _base$italic;
        marginLeft = makeEm(-((_base$italic = base.italic) != null ? _base$italic : 0));
      }
    }
    var supsub;
    if (supm && subm) {
      supShift = Math.max(supShift, minSupShift, supm.depth + 0.25 * metrics2.xHeight);
      subShift = Math.max(subShift, metrics2.sub2);
      var ruleWidth = metrics2.defaultRuleThickness;
      var maxWidth = 4 * ruleWidth;
      if (supShift - supm.depth - (subm.height - subShift) < maxWidth) {
        subShift = maxWidth - (supShift - supm.depth) + subm.height;
        var psi = 0.8 * metrics2.xHeight - (supShift - supm.depth);
        if (psi > 0) {
          supShift += psi;
          subShift -= psi;
        }
      }
      var vlistElem = [{
        type: "elem",
        elem: subm,
        shift: subShift,
        marginRight,
        marginLeft
      }, {
        type: "elem",
        elem: supm,
        shift: -supShift,
        marginRight
      }];
      supsub = makeVList({
        positionType: "individualShift",
        children: vlistElem
      });
    } else if (subm) {
      subShift = Math.max(subShift, metrics2.sub1, subm.height - 0.8 * metrics2.xHeight);
      var _vlistElem = [{
        type: "elem",
        elem: subm,
        marginLeft,
        marginRight
      }];
      supsub = makeVList({
        positionType: "shift",
        positionData: subShift,
        children: _vlistElem
      });
    } else if (supm) {
      supShift = Math.max(supShift, minSupShift, supm.depth + 0.25 * metrics2.xHeight);
      supsub = makeVList({
        positionType: "shift",
        positionData: -supShift,
        children: [{
          type: "elem",
          elem: supm,
          marginRight
        }]
      });
    } else {
      throw new Error("supsub must have either sup or sub.");
    }
    var mclass = getTypeOfDomTree(base, "right") || "mord";
    return makeSpan([mclass], [base, makeSpan(["msupsub"], [supsub])], options);
  },
  mathmlBuilder(group, options) {
    var isBrace = false;
    var isOver;
    var isSup;
    if (group.base && group.base.type === "horizBrace") {
      isSup = !!group.sup;
      if (isSup === group.base.isOver) {
        isBrace = true;
        isOver = group.base.isOver;
      }
    }
    if (group.base && (group.base.type === "op" || group.base.type === "operatorname")) {
      group.base.parentIsSupSub = true;
    }
    var children = [buildGroup2(group.base, options)];
    if (group.sub) {
      children.push(buildGroup2(group.sub, options));
    }
    if (group.sup) {
      children.push(buildGroup2(group.sup, options));
    }
    var nodeType;
    if (isBrace) {
      nodeType = isOver ? "mover" : "munder";
    } else if (!group.sub) {
      var base = group.base;
      if (base && base.type === "op" && base.limits && (options.style === Style$1.DISPLAY || base.alwaysHandleSupSub)) {
        nodeType = "mover";
      } else if (base && base.type === "operatorname" && base.alwaysHandleSupSub && (base.limits || options.style === Style$1.DISPLAY)) {
        nodeType = "mover";
      } else {
        nodeType = "msup";
      }
    } else if (!group.sup) {
      var _base = group.base;
      if (_base && _base.type === "op" && _base.limits && (options.style === Style$1.DISPLAY || _base.alwaysHandleSupSub)) {
        nodeType = "munder";
      } else if (_base && _base.type === "operatorname" && _base.alwaysHandleSupSub && (_base.limits || options.style === Style$1.DISPLAY)) {
        nodeType = "munder";
      } else {
        nodeType = "msub";
      }
    } else {
      var _base2 = group.base;
      if (_base2 && _base2.type === "op" && _base2.limits && options.style === Style$1.DISPLAY) {
        nodeType = "munderover";
      } else if (_base2 && _base2.type === "operatorname" && _base2.alwaysHandleSupSub && (options.style === Style$1.DISPLAY || _base2.limits)) {
        nodeType = "munderover";
      } else {
        nodeType = "msubsup";
      }
    }
    return new MathNode(nodeType, children);
  }
});
defineFunctionBuilders({
  type: "atom",
  htmlBuilder(group, options) {
    return mathsym(group.text, group.mode, options, ["m" + group.family]);
  },
  mathmlBuilder(group, options) {
    var node = new MathNode("mo", [makeText(group.text, group.mode)]);
    if (group.family === "bin") {
      var variant = getVariant(group, options);
      if (variant === "bold-italic") {
        node.setAttribute("mathvariant", variant);
      }
    } else if (group.family === "punct") {
      node.setAttribute("separator", "true");
    } else if (group.family === "open" || group.family === "close") {
      node.setAttribute("stretchy", "false");
    }
    return node;
  }
});
var defaultVariant = {
  "mi": "italic",
  "mn": "normal",
  "mtext": "normal"
};
defineFunctionBuilders({
  type: "mathord",
  htmlBuilder(group, options) {
    return makeOrd(group, options);
  },
  mathmlBuilder(group, options) {
    var node = new MathNode("mi", [makeText(group.text, group.mode, options)]);
    var variant = getVariant(group, options) || "italic";
    if (variant !== defaultVariant[node.type]) {
      node.setAttribute("mathvariant", variant);
    }
    return node;
  }
});
defineFunctionBuilders({
  type: "textord",
  htmlBuilder(group, options) {
    return makeOrd(group, options);
  },
  mathmlBuilder(group, options) {
    var text3 = makeText(group.text, group.mode, options);
    var variant = getVariant(group, options) || "normal";
    var node;
    if (group.mode === "text") {
      node = new MathNode("mtext", [text3]);
    } else if (/[0-9]/.test(group.text)) {
      node = new MathNode("mn", [text3]);
    } else if (group.text === "\\prime") {
      node = new MathNode("mo", [text3]);
    } else {
      node = new MathNode("mi", [text3]);
    }
    if (variant !== defaultVariant[node.type]) {
      node.setAttribute("mathvariant", variant);
    }
    return node;
  }
});
var cssSpace = /* @__PURE__ */ new Map([["\\nobreak", "nobreak"], ["\\allowbreak", "allowbreak"]]);
var regularSpace = /* @__PURE__ */ new Map([[" ", {}], ["\\ ", {}], ["~", {
  className: "nobreak"
}], ["\\space", {}], ["\\nobreakspace", {
  className: "nobreak"
}]]);
defineFunctionBuilders({
  type: "spacing",
  htmlBuilder(group, options) {
    var regularSpaceItem = regularSpace.get(group.text);
    var cssSpaceClass = cssSpace.get(group.text);
    if (regularSpaceItem) {
      var className = regularSpaceItem.className || "";
      if (group.mode === "text") {
        var ord = makeOrd(group, options);
        ord.classes.push(className);
        return ord;
      } else {
        return makeSpan(["mspace", className], [mathsym(group.text, group.mode, options)], options);
      }
    } else if (cssSpaceClass) {
      return makeSpan(["mspace", cssSpaceClass], [], options);
    } else {
      throw new ParseError('Unknown type of space "' + group.text + '"');
    }
  },
  mathmlBuilder(group, options) {
    var node;
    if (regularSpace.has(group.text)) {
      node = new MathNode("mtext", [new TextNode("\xA0")]);
    } else if (cssSpace.has(group.text)) {
      return new MathNode("mspace");
    } else {
      throw new ParseError('Unknown type of space "' + group.text + '"');
    }
    return node;
  }
});
var pad2 = () => {
  var padNode = new MathNode("mtd", []);
  padNode.setAttribute("width", "50%");
  return padNode;
};
defineFunctionBuilders({
  type: "tag",
  mathmlBuilder(group, options) {
    var table = new MathNode("mtable", [new MathNode("mtr", [pad2(), new MathNode("mtd", [buildExpressionRow(group.body, options)]), pad2(), new MathNode("mtd", [buildExpressionRow(group.tag, options)])])]);
    table.setAttribute("width", "100%");
    return table;
  }
});
var textFontFamilies = {
  "\\text": void 0,
  "\\textrm": "textrm",
  "\\textsf": "textsf",
  "\\texttt": "texttt",
  "\\textnormal": "textrm"
};
var textFontWeights = {
  "\\textbf": "textbf",
  "\\textmd": "textmd"
};
var textFontShapes = {
  "\\textit": "textit",
  "\\textup": "textup"
};
var optionsWithFont = (group, options) => {
  var font = group.font;
  if (!font) {
    return options;
  } else if (textFontFamilies[font]) {
    return options.withTextFontFamily(textFontFamilies[font]);
  } else if (textFontWeights[font]) {
    return options.withTextFontWeight(textFontWeights[font]);
  } else if (font === "\\emph") {
    return options.fontShape === "textit" ? options.withTextFontShape("textup") : options.withTextFontShape("textit");
  }
  return options.withTextFontShape(textFontShapes[font]);
};
defineFunction({
  type: "text",
  names: [
    // Font families
    "\\text",
    "\\textrm",
    "\\textsf",
    "\\texttt",
    "\\textnormal",
    // Font weights
    "\\textbf",
    "\\textmd",
    // Font Shapes
    "\\textit",
    "\\textup",
    "\\emph"
  ],
  numArgs: 1,
  argTypes: ["text"],
  allowedInArgument: true,
  allowedInText: true,
  handler(_ref2, args) {
    var parser = _ref2.parser, funcName = _ref2.funcName;
    var body = args[0];
    return {
      type: "text",
      mode: parser.mode,
      body: ordargument(body),
      font: funcName
    };
  },
  htmlBuilder(group, options) {
    var newOptions = optionsWithFont(group, options);
    var inner2 = buildExpression$1(group.body, newOptions, true);
    return makeSpan(["mord", "text"], inner2, newOptions);
  },
  mathmlBuilder(group, options) {
    var newOptions = optionsWithFont(group, options);
    return buildExpressionRow(group.body, newOptions);
  }
});
defineFunction({
  type: "underline",
  names: ["\\underline"],
  numArgs: 1,
  allowedInText: true,
  handler(_ref2, args) {
    var parser = _ref2.parser;
    return {
      type: "underline",
      mode: parser.mode,
      body: args[0]
    };
  },
  htmlBuilder(group, options) {
    var innerGroup = buildGroup$1(group.body, options);
    var line = makeLineSpan("underline-line", options);
    var defaultRuleThickness = options.fontMetrics().defaultRuleThickness;
    var vlist = makeVList({
      positionType: "top",
      positionData: innerGroup.height,
      children: [{
        type: "kern",
        size: defaultRuleThickness
      }, {
        type: "elem",
        elem: line
      }, {
        type: "kern",
        size: 3 * defaultRuleThickness
      }, {
        type: "elem",
        elem: innerGroup
      }]
    });
    return makeSpan(["mord", "katex-underline"], [vlist], options);
  },
  mathmlBuilder(group, options) {
    var operator = new MathNode("mo", [new TextNode("\u203E")]);
    operator.setAttribute("stretchy", "true");
    var node = new MathNode("munder", [buildGroup2(group.body, options), operator]);
    node.setAttribute("accentunder", "true");
    return node;
  }
});
defineFunction({
  type: "vcenter",
  names: ["\\vcenter"],
  numArgs: 1,
  argTypes: ["original"],
  // In LaTeX, \vcenter can act only on a box.
  allowedInText: false,
  handler(_ref2, args) {
    var parser = _ref2.parser;
    return {
      type: "vcenter",
      mode: parser.mode,
      body: args[0]
    };
  },
  htmlBuilder(group, options) {
    var body = buildGroup$1(group.body, options);
    var axisHeight = options.fontMetrics().axisHeight;
    var dy = 0.5 * (body.height - axisHeight - (body.depth + axisHeight));
    return makeVList({
      positionType: "shift",
      positionData: dy,
      children: [{
        type: "elem",
        elem: body
      }]
    });
  },
  mathmlBuilder(group, options) {
    var mpadded = new MathNode("mpadded", [buildGroup2(group.body, options)], ["vcenter"]);
    return new MathNode("mrow", [mpadded]);
  }
});
defineFunction({
  type: "verb",
  names: ["\\verb"],
  numArgs: 0,
  allowedInText: true,
  handler(context, args, optArgs) {
    throw new ParseError("\\verb ended by end of line instead of matching delimiter");
  },
  htmlBuilder(group, options) {
    var text3 = makeVerb(group);
    var body = [];
    var newOptions = options.havingStyle(options.style.text());
    for (var i2 = 0; i2 < text3.length; i2++) {
      var c = text3[i2];
      if (c === "~") {
        c = "\\textasciitilde";
      }
      body.push(makeSymbol(c, "Typewriter-Regular", group.mode, newOptions, ["mord", "texttt"]));
    }
    return makeSpan(["mord", "text"].concat(newOptions.sizingClasses(options)), tryCombineChars(body), newOptions);
  },
  mathmlBuilder(group, options) {
    var text3 = new TextNode(makeVerb(group));
    var node = new MathNode("mtext", [text3]);
    node.setAttribute("mathvariant", "monospace");
    return node;
  }
});
var makeVerb = (group) => group.body.replace(/ /g, group.star ? "\u2423" : "\xA0");
var functions = _functions;
var spaceRegexString = "[ \r\n	]";
var controlWordRegexString = "\\\\[a-zA-Z@]+";
var controlSymbolRegexString = "\\\\[^\uD800-\uDFFF]";
var controlWordWhitespaceRegexString = "(" + controlWordRegexString + ")" + spaceRegexString + "*";
var controlSpaceRegexString = "\\\\(\n|[ \r	]+\n?)[ \r	]*";
var combiningDiacriticalMarkString = "[\u0300-\u036F]";
var combiningDiacriticalMarksEndRegex = new RegExp(combiningDiacriticalMarkString + "+$");
var tokenRegexString = "(" + spaceRegexString + "+)|" + // whitespace
(controlSpaceRegexString + "|") + // \whitespace
"([!-\\[\\]-\u2027\u202A-\uD7FF\uF900-\uFFFF]" + // single codepoint
(combiningDiacriticalMarkString + "*") + // ...plus accents
"|[\uD800-\uDBFF][\uDC00-\uDFFF]" + // surrogate pair
(combiningDiacriticalMarkString + "*") + // ...plus accents
"|\\\\verb\\*([^]).*?\\4|\\\\verb([^*a-zA-Z]).*?\\5" + // \verb unstarred
("|" + controlWordWhitespaceRegexString) + // \macroName + spaces
("|" + controlSymbolRegexString + ")");
var Lexer = class {
  constructor(input, settings) {
    this.input = void 0;
    this.settings = void 0;
    this.tokenRegex = void 0;
    this.catcodes = void 0;
    this.input = input;
    this.settings = settings;
    this.tokenRegex = new RegExp(tokenRegexString, "g");
    this.catcodes = {
      "%": 14,
      // comment character
      "~": 13
      // active character
    };
  }
  setCatcode(char, code) {
    this.catcodes[char] = code;
  }
  /**
   * This function lexes a single token.
   */
  lex() {
    var input = this.input;
    var pos = this.tokenRegex.lastIndex;
    if (pos === input.length) {
      return new Token("EOF", new SourceLocation(this, pos, pos));
    }
    var match = this.tokenRegex.exec(input);
    if (match === null || match.index !== pos) {
      throw new ParseError("Unexpected character: '" + input[pos] + "'", new Token(input[pos], new SourceLocation(this, pos, pos + 1)));
    }
    var text3 = match[6] || match[3] || (match[2] ? "\\ " : " ");
    if (this.catcodes[text3] === 14) {
      var nlIndex = input.indexOf("\n", this.tokenRegex.lastIndex);
      if (nlIndex === -1) {
        this.tokenRegex.lastIndex = input.length;
        handleStrict({
          strict: this.settings.strict,
          errorCode: "commentAtEnd",
          errorMsg: "% comment has no terminating newline; LaTeX would fail because of commenting the end of math mode (e.g. $)",
          report: true
        });
      } else {
        this.tokenRegex.lastIndex = nlIndex + 1;
      }
      return this.lex();
    }
    return new Token(text3, new SourceLocation(this, pos, this.tokenRegex.lastIndex));
  }
};
var Namespace = class {
  /**
   * Both arguments are optional.  The first argument is an object of
   * built-in mappings which never change.  The second argument is an object
   * of initial (global-level) mappings, which will constantly change
   * according to any global/top-level `set`s done.
   */
  constructor(builtins, globalMacros) {
    if (builtins === void 0) {
      builtins = {};
    }
    if (globalMacros === void 0) {
      globalMacros = {};
    }
    this.current = void 0;
    this.builtins = void 0;
    this.undefStack = void 0;
    this.current = globalMacros;
    this.builtins = builtins;
    this.undefStack = [];
  }
  /**
   * Start a new nested group, affecting future local `set`s.
   */
  beginGroup() {
    this.undefStack.push({});
  }
  /**
   * End current nested group, restoring values before the group began.
   */
  endGroup() {
    if (this.undefStack.length === 0) {
      throw new ParseError("Unbalanced namespace destruction: attempt to pop global namespace; please report this as a bug");
    }
    var undefs = this.undefStack.pop();
    for (var key of Object.keys(undefs)) {
      if (undefs[key] === void 0) {
        delete this.current[key];
      } else {
        this.current[key] = undefs[key];
      }
    }
  }
  /**
   * Ends all currently nested groups (if any), restoring values before the
   * groups began.  Useful in case of an error in the middle of parsing.
   */
  endGroups() {
    while (this.undefStack.length > 0) {
      this.endGroup();
    }
  }
  /**
   * Detect whether `name` has a definition.  Equivalent to
   * `get(name) != null`.
   */
  has(name) {
    return Object.prototype.hasOwnProperty.call(this.current, name) || Object.prototype.hasOwnProperty.call(this.builtins, name);
  }
  /**
   * Get the current value of a name, or `undefined` if there is no value.
   *
   * Note: Do not use `if (namespace.get(...))` to detect whether a macro
   * is defined, as the definition may be the empty string which evaluates
   * to `false` in JavaScript.  Use `if (namespace.get(...) != null)` or
   * `if (namespace.has(...))`.
   */
  get(name) {
    if (Object.prototype.hasOwnProperty.call(this.current, name)) {
      return this.current[name];
    } else if (Object.prototype.hasOwnProperty.call(this.builtins, name)) {
      return this.builtins[name];
    } else {
      return void 0;
    }
  }
  /**
   * Set the current value of a name, and optionally set it globally too.
   * Local set() sets the current value and (when appropriate) adds an undo
   * operation to the undo stack.  Global set() may change the undo
   * operation at every level, so takes time linear in their number.
   * A value of undefined means to delete existing definitions.
   */
  set(name, value, global) {
    if (global === void 0) {
      global = false;
    }
    if (global) {
      for (var i2 = 0; i2 < this.undefStack.length; i2++) {
        delete this.undefStack[i2][name];
      }
      if (this.undefStack.length > 0) {
        this.undefStack[this.undefStack.length - 1][name] = value;
      }
    } else {
      var top = this.undefStack[this.undefStack.length - 1];
      if (top && !Object.prototype.hasOwnProperty.call(top, name)) {
        top[name] = Object.prototype.hasOwnProperty.call(this.current, name) ? this.current[name] : void 0;
      }
    }
    if (value == null) {
      delete this.current[name];
    } else {
      this.current[name] = value;
    }
  }
};
var macros = _macros;
defineMacro("\\noexpand", function(context) {
  var t = context.popToken();
  if (context.isExpandable(t.text)) {
    t.noexpand = true;
    t.treatAsRelax = true;
  }
  return {
    tokens: [t],
    numArgs: 0
  };
});
defineMacro("\\expandafter", function(context) {
  var t = context.popToken();
  context.expandOnce(true);
  return {
    tokens: [t],
    numArgs: 0
  };
});
defineMacro("\\@firstoftwo", function(context) {
  var args = context.consumeArgs(2);
  return {
    tokens: args[0],
    numArgs: 0
  };
});
defineMacro("\\@secondoftwo", function(context) {
  var args = context.consumeArgs(2);
  return {
    tokens: args[1],
    numArgs: 0
  };
});
defineMacro("\\@ifnextchar", function(context) {
  var args = context.consumeArgs(3);
  context.consumeSpaces();
  var nextToken = context.future();
  if (args[0].length === 1 && args[0][0].text === nextToken.text) {
    return {
      tokens: args[1],
      numArgs: 0
    };
  } else {
    return {
      tokens: args[2],
      numArgs: 0
    };
  }
});
defineMacro("\\@ifstar", "\\@ifnextchar *{\\@firstoftwo{#1}}");
defineMacro("\\TextOrMath", function(context) {
  var args = context.consumeArgs(2);
  if (context.mode === "text") {
    return {
      tokens: args[0],
      numArgs: 0
    };
  } else {
    return {
      tokens: args[1],
      numArgs: 0
    };
  }
});
var digitToNumber = {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "a": 10,
  "A": 10,
  "b": 11,
  "B": 11,
  "c": 12,
  "C": 12,
  "d": 13,
  "D": 13,
  "e": 14,
  "E": 14,
  "f": 15,
  "F": 15
};
defineMacro("\\char", function(context) {
  var token = context.popToken();
  var base;
  var number = 0;
  if (token.text === "'") {
    base = 8;
    token = context.popToken();
  } else if (token.text === '"') {
    base = 16;
    token = context.popToken();
  } else if (token.text === "`") {
    token = context.popToken();
    if (token.text[0] === "\\") {
      number = token.text.charCodeAt(1);
    } else if (token.text === "EOF") {
      throw new ParseError("\\char` missing argument");
    } else {
      number = token.text.charCodeAt(0);
    }
  } else {
    base = 10;
  }
  if (base) {
    number = digitToNumber[token.text];
    if (number == null || number >= base) {
      throw new ParseError("Invalid base-" + base + " digit " + token.text);
    }
    var digit;
    while ((digit = digitToNumber[context.future().text]) != null && digit < base) {
      number *= base;
      number += digit;
      context.popToken();
    }
  }
  return "\\@char{" + number + "}";
});
var newcommand = (context, existsOK, nonexistsOK, skipIfExists) => {
  var arg = context.consumeArg().tokens;
  if (arg.length !== 1) {
    throw new ParseError("\\newcommand's first argument must be a macro name");
  }
  var name = arg[0].text;
  var exists = context.isDefined(name);
  if (exists && !existsOK) {
    throw new ParseError("\\newcommand{" + name + "} attempting to redefine " + (name + "; use \\renewcommand"));
  }
  if (!exists && !nonexistsOK) {
    throw new ParseError("\\renewcommand{" + name + "} when command " + name + " does not yet exist; use \\newcommand");
  }
  var numArgs = 0;
  arg = context.consumeArg().tokens;
  if (arg.length === 1 && arg[0].text === "[") {
    var argText = "";
    var token = context.expandNextToken();
    while (token.text !== "]" && token.text !== "EOF") {
      argText += token.text;
      token = context.expandNextToken();
    }
    if (!argText.match(/^\s*[0-9]+\s*$/)) {
      throw new ParseError("Invalid number of arguments: " + argText);
    }
    numArgs = parseInt(argText);
    arg = context.consumeArg().tokens;
  }
  if (!(exists && skipIfExists)) {
    context.macros.set(name, {
      tokens: arg,
      numArgs
    });
  }
  return "";
};
defineMacro("\\newcommand", (context) => newcommand(context, false, true, false));
defineMacro("\\renewcommand", (context) => newcommand(context, true, false, false));
defineMacro("\\providecommand", (context) => newcommand(context, true, true, true));
defineMacro("\\message", (context) => {
  var arg = context.consumeArgs(1)[0];
  console.log(arg.reverse().map((token) => token.text).join(""));
  return "";
});
defineMacro("\\errmessage", (context) => {
  var arg = context.consumeArgs(1)[0];
  console.error(arg.reverse().map((token) => token.text).join(""));
  return "";
});
defineMacro("\\show", (context) => {
  var tok = context.popToken();
  var name = tok.text;
  console.log(tok, context.macros.get(name), functions[name], symbols.math[name], symbols.text[name]);
  return "";
});
defineMacro("\\bgroup", "{");
defineMacro("\\egroup", "}");
defineMacro("~", "\\nobreakspace");
defineMacro("\\lq", "`");
defineMacro("\\rq", "'");
defineMacro("\\aa", "\\r a");
defineMacro("\\AA", "\\r A");
defineMacro("\\textcopyright", "\\html@mathml{\\textcircled{c}}{\\char`\xA9}");
defineMacro("\\copyright", "\\TextOrMath{\\textcopyright}{\\text{\\textcopyright}}");
defineMacro("\\textregistered", "\\html@mathml{\\textcircled{\\scriptsize R}}{\\char`\xAE}");
defineMacro("\u212C", "\\mathscr{B}");
defineMacro("\u2130", "\\mathscr{E}");
defineMacro("\u2131", "\\mathscr{F}");
defineMacro("\u210B", "\\mathscr{H}");
defineMacro("\u2110", "\\mathscr{I}");
defineMacro("\u2112", "\\mathscr{L}");
defineMacro("\u2133", "\\mathscr{M}");
defineMacro("\u211B", "\\mathscr{R}");
defineMacro("\u212D", "\\mathfrak{C}");
defineMacro("\u210C", "\\mathfrak{H}");
defineMacro("\u2128", "\\mathfrak{Z}");
defineMacro("\\Bbbk", "\\Bbb{k}");
defineMacro("\\llap", "\\mathllap{\\textrm{#1}}");
defineMacro("\\rlap", "\\mathrlap{\\textrm{#1}}");
defineMacro("\\clap", "\\mathclap{\\textrm{#1}}");
defineMacro("\\mathstrut", "\\vphantom{(}");
defineMacro("\\underbar", "\\underline{\\text{#1}}");
defineMacro("\\not", '\\html@mathml{\\mathrel{\\mathrlap\\@not}\\nobreak}{\\char"338}');
defineMacro("\\neq", "\\html@mathml{\\mathrel{\\not=}}{\\mathrel{\\char`\u2260}}");
defineMacro("\\ne", "\\neq");
defineMacro("\u2260", "\\neq");
defineMacro("\\notin", "\\html@mathml{\\mathrel{{\\in}\\mathllap{/\\mskip1mu}}}{\\mathrel{\\char`\u2209}}");
defineMacro("\u2209", "\\notin");
defineMacro("\u2258", "\\html@mathml{\\mathrel{=\\kern{-1em}\\raisebox{0.4em}{$\\scriptsize\\frown$}}}{\\mathrel{\\char`\u2258}}");
defineMacro("\u2259", "\\html@mathml{\\stackrel{\\tiny\\wedge}{=}}{\\mathrel{\\char`\u2258}}");
defineMacro("\u225A", "\\html@mathml{\\stackrel{\\tiny\\vee}{=}}{\\mathrel{\\char`\u225A}}");
defineMacro("\u225B", "\\html@mathml{\\stackrel{\\scriptsize\\star}{=}}{\\mathrel{\\char`\u225B}}");
defineMacro("\u225D", "\\html@mathml{\\stackrel{\\tiny\\mathrm{def}}{=}}{\\mathrel{\\char`\u225D}}");
defineMacro("\u225E", "\\html@mathml{\\stackrel{\\tiny\\mathrm{m}}{=}}{\\mathrel{\\char`\u225E}}");
defineMacro("\u225F", "\\html@mathml{\\stackrel{\\tiny?}{=}}{\\mathrel{\\char`\u225F}}");
defineMacro("\u27C2", "\\perp");
defineMacro("\u203C", "\\mathclose{!\\mkern-0.8mu!}");
defineMacro("\u220C", "\\notni");
defineMacro("\u231C", "\\ulcorner");
defineMacro("\u231D", "\\urcorner");
defineMacro("\u231E", "\\llcorner");
defineMacro("\u231F", "\\lrcorner");
defineMacro("\xA9", "\\copyright");
defineMacro("\xAE", "\\textregistered");
defineMacro("\\ulcorner", '\\html@mathml{\\@ulcorner}{\\mathop{\\char"231c}}');
defineMacro("\\urcorner", '\\html@mathml{\\@urcorner}{\\mathop{\\char"231d}}');
defineMacro("\\llcorner", '\\html@mathml{\\@llcorner}{\\mathop{\\char"231e}}');
defineMacro("\\lrcorner", '\\html@mathml{\\@lrcorner}{\\mathop{\\char"231f}}');
defineMacro("\\vdots", "{\\varvdots\\rule{0pt}{15pt}}");
defineMacro("\u22EE", "\\vdots");
defineMacro("\\varGamma", "\\mathit{\\Gamma}");
defineMacro("\\varDelta", "\\mathit{\\Delta}");
defineMacro("\\varTheta", "\\mathit{\\Theta}");
defineMacro("\\varLambda", "\\mathit{\\Lambda}");
defineMacro("\\varXi", "\\mathit{\\Xi}");
defineMacro("\\varPi", "\\mathit{\\Pi}");
defineMacro("\\varSigma", "\\mathit{\\Sigma}");
defineMacro("\\varUpsilon", "\\mathit{\\Upsilon}");
defineMacro("\\varPhi", "\\mathit{\\Phi}");
defineMacro("\\varPsi", "\\mathit{\\Psi}");
defineMacro("\\varOmega", "\\mathit{\\Omega}");
defineMacro("\\substack", "\\begin{subarray}{c}#1\\end{subarray}");
defineMacro("\\colon", "\\nobreak\\mskip2mu\\mathpunct{}\\mathchoice{\\mkern-3mu}{\\mkern-3mu}{}{}{:}\\mskip6mu\\relax");
defineMacro("\\boxed", "\\fbox{$\\displaystyle{#1}$}");
defineMacro("\\iff", "\\DOTSB\\;\\Longleftrightarrow\\;");
defineMacro("\\implies", "\\DOTSB\\;\\Longrightarrow\\;");
defineMacro("\\impliedby", "\\DOTSB\\;\\Longleftarrow\\;");
defineMacro("\\dddot", "{\\overset{\\raisebox{-0.1ex}{\\normalsize ...}}{#1}}");
defineMacro("\\ddddot", "{\\overset{\\raisebox{-0.1ex}{\\normalsize ....}}{#1}}");
var dotsByToken = {
  ",": "\\dotsc",
  "\\not": "\\dotsb",
  // \keybin@ checks for the following:
  "+": "\\dotsb",
  "=": "\\dotsb",
  "<": "\\dotsb",
  ">": "\\dotsb",
  "-": "\\dotsb",
  "*": "\\dotsb",
  ":": "\\dotsb",
  // Symbols whose definition starts with \DOTSB:
  "\\DOTSB": "\\dotsb",
  "\\coprod": "\\dotsb",
  "\\bigvee": "\\dotsb",
  "\\bigwedge": "\\dotsb",
  "\\biguplus": "\\dotsb",
  "\\bigcap": "\\dotsb",
  "\\bigcup": "\\dotsb",
  "\\prod": "\\dotsb",
  "\\sum": "\\dotsb",
  "\\bigotimes": "\\dotsb",
  "\\bigoplus": "\\dotsb",
  "\\bigodot": "\\dotsb",
  "\\bigsqcup": "\\dotsb",
  "\\And": "\\dotsb",
  "\\longrightarrow": "\\dotsb",
  "\\Longrightarrow": "\\dotsb",
  "\\longleftarrow": "\\dotsb",
  "\\Longleftarrow": "\\dotsb",
  "\\longleftrightarrow": "\\dotsb",
  "\\Longleftrightarrow": "\\dotsb",
  "\\mapsto": "\\dotsb",
  "\\longmapsto": "\\dotsb",
  "\\hookrightarrow": "\\dotsb",
  "\\doteq": "\\dotsb",
  // Symbols whose definition starts with \mathbin:
  "\\mathbin": "\\dotsb",
  // Symbols whose definition starts with \mathrel:
  "\\mathrel": "\\dotsb",
  "\\relbar": "\\dotsb",
  "\\Relbar": "\\dotsb",
  "\\xrightarrow": "\\dotsb",
  "\\xleftarrow": "\\dotsb",
  // Symbols whose definition starts with \DOTSI:
  "\\DOTSI": "\\dotsi",
  "\\int": "\\dotsi",
  "\\oint": "\\dotsi",
  "\\iint": "\\dotsi",
  "\\iiint": "\\dotsi",
  "\\iiiint": "\\dotsi",
  "\\idotsint": "\\dotsi",
  // Symbols whose definition starts with \DOTSX:
  "\\DOTSX": "\\dotsx"
};
var dotsbGroups = /* @__PURE__ */ new Set(["bin", "rel"]);
defineMacro("\\dots", function(context) {
  var thedots = "\\dotso";
  var next = context.expandAfterFuture().text;
  if (next in dotsByToken) {
    thedots = dotsByToken[next];
  } else if (next.slice(0, 4) === "\\not") {
    thedots = "\\dotsb";
  } else if (next in symbols.math) {
    if (dotsbGroups.has(symbols.math[next].group)) {
      thedots = "\\dotsb";
    }
  }
  return thedots;
});
var spaceAfterDots = {
  // \rightdelim@ checks for the following:
  ")": true,
  "]": true,
  "\\rbrack": true,
  "\\}": true,
  "\\rbrace": true,
  "\\rangle": true,
  "\\rceil": true,
  "\\rfloor": true,
  "\\rgroup": true,
  "\\rmoustache": true,
  "\\right": true,
  "\\bigr": true,
  "\\biggr": true,
  "\\Bigr": true,
  "\\Biggr": true,
  // \extra@ also tests for the following:
  "$": true,
  // \extrap@ checks for the following:
  ";": true,
  ".": true,
  ",": true
};
defineMacro("\\dotso", function(context) {
  var next = context.future().text;
  if (next in spaceAfterDots) {
    return "\\ldots\\,";
  } else {
    return "\\ldots";
  }
});
defineMacro("\\dotsc", function(context) {
  var next = context.future().text;
  if (next in spaceAfterDots && next !== ",") {
    return "\\ldots\\,";
  } else {
    return "\\ldots";
  }
});
defineMacro("\\cdots", function(context) {
  var next = context.future().text;
  if (next in spaceAfterDots) {
    return "\\@cdots\\,";
  } else {
    return "\\@cdots";
  }
});
defineMacro("\\dotsb", "\\cdots");
defineMacro("\\dotsm", "\\cdots");
defineMacro("\\dotsi", "\\!\\cdots");
defineMacro("\\dotsx", "\\ldots\\,");
defineMacro("\\DOTSI", "\\relax");
defineMacro("\\DOTSB", "\\relax");
defineMacro("\\DOTSX", "\\relax");
defineMacro("\\tmspace", "\\TextOrMath{\\kern#1#3}{\\mskip#1#2}\\relax");
defineMacro("\\,", "\\tmspace+{3mu}{.1667em}");
defineMacro("\\thinspace", "\\,");
defineMacro("\\>", "\\mskip{4mu}");
defineMacro("\\:", "\\tmspace+{4mu}{.2222em}");
defineMacro("\\medspace", "\\:");
defineMacro("\\;", "\\tmspace+{5mu}{.2777em}");
defineMacro("\\thickspace", "\\;");
defineMacro("\\!", "\\tmspace-{3mu}{.1667em}");
defineMacro("\\negthinspace", "\\!");
defineMacro("\\negmedspace", "\\tmspace-{4mu}{.2222em}");
defineMacro("\\negthickspace", "\\tmspace-{5mu}{.277em}");
defineMacro("\\enspace", "\\kern.5em ");
defineMacro("\\enskip", "\\hskip.5em\\relax");
defineMacro("\\quad", "\\hskip1em\\relax");
defineMacro("\\qquad", "\\hskip2em\\relax");
defineMacro("\\tag", "\\@ifstar\\tag@literal\\tag@paren");
defineMacro("\\tag@paren", "\\tag@literal{({#1})}");
defineMacro("\\tag@literal", (context) => {
  if (context.macros.get("\\df@tag")) {
    throw new ParseError("Multiple \\tag");
  }
  return "\\gdef\\df@tag{\\text{#1}}";
});
defineMacro("\\bmod", "\\mathchoice{\\mskip1mu}{\\mskip1mu}{\\mskip5mu}{\\mskip5mu}\\mathbin{\\rm mod}\\mathchoice{\\mskip1mu}{\\mskip1mu}{\\mskip5mu}{\\mskip5mu}");
defineMacro("\\pod", "\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern8mu}{\\mkern8mu}{\\mkern8mu}(#1)");
defineMacro("\\pmod", "\\pod{{\\rm mod}\\mkern6mu#1}");
defineMacro("\\mod", "\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern12mu}{\\mkern12mu}{\\mkern12mu}{\\rm mod}\\,\\,#1");
defineMacro("\\newline", "\\\\\\relax");
defineMacro("\\TeX", "\\textrm{\\html@mathml{T\\kern-.1667em\\raisebox{-.5ex}{E}\\kern-.125emX}{TeX}}");
var latexRaiseA = makeEm(fontMetricsData["Main-Regular"]["T".charCodeAt(0)][1] - 0.7 * fontMetricsData["Main-Regular"]["A".charCodeAt(0)][1]);
defineMacro("\\LaTeX", "\\textrm{\\html@mathml{" + ("L\\kern-.36em\\raisebox{" + latexRaiseA + "}{\\scriptstyle A}") + "\\kern-.15em\\TeX}{LaTeX}}");
defineMacro("\\KaTeX", "\\textrm{\\html@mathml{" + ("K\\kern-.17em\\raisebox{" + latexRaiseA + "}{\\scriptstyle A}") + "\\kern-.15em\\TeX}{KaTeX}}");
defineMacro("\\hspace", "\\@ifstar\\@hspacer\\@hspace");
defineMacro("\\@hspace", "\\hskip #1\\relax");
defineMacro("\\@hspacer", "\\rule{0pt}{0pt}\\hskip #1\\relax");
defineMacro("\\ordinarycolon", ":");
defineMacro("\\vcentcolon", "\\mathrel{\\mathop\\ordinarycolon}");
defineMacro("\\dblcolon", '\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-.9mu}\\vcentcolon}}{\\mathop{\\char"2237}}');
defineMacro("\\coloneqq", '\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}=}}{\\mathop{\\char"2254}}');
defineMacro("\\Coloneqq", '\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}=}}{\\mathop{\\char"2237\\char"3d}}');
defineMacro("\\coloneq", '\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\mathrel{-}}}{\\mathop{\\char"3a\\char"2212}}');
defineMacro("\\Coloneq", '\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\mathrel{-}}}{\\mathop{\\char"2237\\char"2212}}');
defineMacro("\\eqqcolon", '\\html@mathml{\\mathrel{=\\mathrel{\\mkern-1.2mu}\\vcentcolon}}{\\mathop{\\char"2255}}');
defineMacro("\\Eqqcolon", '\\html@mathml{\\mathrel{=\\mathrel{\\mkern-1.2mu}\\dblcolon}}{\\mathop{\\char"3d\\char"2237}}');
defineMacro("\\eqcolon", '\\html@mathml{\\mathrel{\\mathrel{-}\\mathrel{\\mkern-1.2mu}\\vcentcolon}}{\\mathop{\\char"2239}}');
defineMacro("\\Eqcolon", '\\html@mathml{\\mathrel{\\mathrel{-}\\mathrel{\\mkern-1.2mu}\\dblcolon}}{\\mathop{\\char"2212\\char"2237}}');
defineMacro("\\colonapprox", '\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\approx}}{\\mathop{\\char"3a\\char"2248}}');
defineMacro("\\Colonapprox", '\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\approx}}{\\mathop{\\char"2237\\char"2248}}');
defineMacro("\\colonsim", '\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\sim}}{\\mathop{\\char"3a\\char"223c}}');
defineMacro("\\Colonsim", '\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\sim}}{\\mathop{\\char"2237\\char"223c}}');
defineMacro("\u2237", "\\dblcolon");
defineMacro("\u2239", "\\eqcolon");
defineMacro("\u2254", "\\coloneqq");
defineMacro("\u2255", "\\eqqcolon");
defineMacro("\u2A74", "\\Coloneqq");
defineMacro("\\ratio", "\\vcentcolon");
defineMacro("\\coloncolon", "\\dblcolon");
defineMacro("\\colonequals", "\\coloneqq");
defineMacro("\\coloncolonequals", "\\Coloneqq");
defineMacro("\\equalscolon", "\\eqqcolon");
defineMacro("\\equalscoloncolon", "\\Eqqcolon");
defineMacro("\\colonminus", "\\coloneq");
defineMacro("\\coloncolonminus", "\\Coloneq");
defineMacro("\\minuscolon", "\\eqcolon");
defineMacro("\\minuscoloncolon", "\\Eqcolon");
defineMacro("\\coloncolonapprox", "\\Colonapprox");
defineMacro("\\coloncolonsim", "\\Colonsim");
defineMacro("\\simcolon", "\\mathrel{\\sim\\mathrel{\\mkern-1.2mu}\\vcentcolon}");
defineMacro("\\simcoloncolon", "\\mathrel{\\sim\\mathrel{\\mkern-1.2mu}\\dblcolon}");
defineMacro("\\approxcolon", "\\mathrel{\\approx\\mathrel{\\mkern-1.2mu}\\vcentcolon}");
defineMacro("\\approxcoloncolon", "\\mathrel{\\approx\\mathrel{\\mkern-1.2mu}\\dblcolon}");
defineMacro("\\notni", "\\html@mathml{\\not\\ni}{\\mathrel{\\char`\u220C}}");
defineMacro("\\limsup", "\\DOTSB\\operatorname*{lim\\,sup}");
defineMacro("\\liminf", "\\DOTSB\\operatorname*{lim\\,inf}");
defineMacro("\\injlim", "\\DOTSB\\operatorname*{inj\\,lim}");
defineMacro("\\projlim", "\\DOTSB\\operatorname*{proj\\,lim}");
defineMacro("\\varlimsup", "\\DOTSB\\operatorname*{\\overline{lim}}");
defineMacro("\\varliminf", "\\DOTSB\\operatorname*{\\underline{lim}}");
defineMacro("\\varinjlim", "\\DOTSB\\operatorname*{\\underrightarrow{lim}}");
defineMacro("\\varprojlim", "\\DOTSB\\operatorname*{\\underleftarrow{lim}}");
defineMacro("\\gvertneqq", "\\html@mathml{\\@gvertneqq}{\u2269}");
defineMacro("\\lvertneqq", "\\html@mathml{\\@lvertneqq}{\u2268}");
defineMacro("\\ngeqq", "\\html@mathml{\\@ngeqq}{\u2271}");
defineMacro("\\ngeqslant", "\\html@mathml{\\@ngeqslant}{\u2271}");
defineMacro("\\nleqq", "\\html@mathml{\\@nleqq}{\u2270}");
defineMacro("\\nleqslant", "\\html@mathml{\\@nleqslant}{\u2270}");
defineMacro("\\nshortmid", "\\html@mathml{\\@nshortmid}{\u2224}");
defineMacro("\\nshortparallel", "\\html@mathml{\\@nshortparallel}{\u2226}");
defineMacro("\\nsubseteqq", "\\html@mathml{\\@nsubseteqq}{\u2288}");
defineMacro("\\nsupseteqq", "\\html@mathml{\\@nsupseteqq}{\u2289}");
defineMacro("\\varsubsetneq", "\\html@mathml{\\@varsubsetneq}{\u228A}");
defineMacro("\\varsubsetneqq", "\\html@mathml{\\@varsubsetneqq}{\u2ACB}");
defineMacro("\\varsupsetneq", "\\html@mathml{\\@varsupsetneq}{\u228B}");
defineMacro("\\varsupsetneqq", "\\html@mathml{\\@varsupsetneqq}{\u2ACC}");
defineMacro("\\imath", "\\html@mathml{\\@imath}{\u0131}");
defineMacro("\\jmath", "\\html@mathml{\\@jmath}{\u0237}");
defineMacro("\\llbracket", "\\html@mathml{\\mathopen{[\\mkern-3.2mu[}}{\\mathopen{\\char`\u27E6}}");
defineMacro("\\rrbracket", "\\html@mathml{\\mathclose{]\\mkern-3.2mu]}}{\\mathclose{\\char`\u27E7}}");
defineMacro("\u27E6", "\\llbracket");
defineMacro("\u27E7", "\\rrbracket");
defineMacro("\\lBrace", "\\html@mathml{\\mathopen{\\{\\mkern-3.2mu[}}{\\mathopen{\\char`\u2983}}");
defineMacro("\\rBrace", "\\html@mathml{\\mathclose{]\\mkern-3.2mu\\}}}{\\mathclose{\\char`\u2984}}");
defineMacro("\u21A4", "\\mapsfrom");
defineMacro("\\mapsfrom", "\\html@mathml{\\mathrel{\\mathreflectbox{\\mapsto}}}{\\mathrel{\\char`\u21A4}}");
defineMacro("\u2983", "\\lBrace");
defineMacro("\u2984", "\\rBrace");
defineMacro("\\minuso", "\\mathbin{\\html@mathml{{\\mathrlap{\\mathchoice{\\kern{0.145em}}{\\kern{0.145em}}{\\kern{0.1015em}}{\\kern{0.0725em}}\\circ}{-}}}{\\char`\u29B5}}");
defineMacro("\u29B5", "\\minuso");
defineMacro("\\darr", "\\downarrow");
defineMacro("\\dArr", "\\Downarrow");
defineMacro("\\Darr", "\\Downarrow");
defineMacro("\\lang", "\\langle");
defineMacro("\\rang", "\\rangle");
defineMacro("\\uarr", "\\uparrow");
defineMacro("\\uArr", "\\Uparrow");
defineMacro("\\Uarr", "\\Uparrow");
defineMacro("\\N", "\\mathbb{N}");
defineMacro("\\R", "\\mathbb{R}");
defineMacro("\\Z", "\\mathbb{Z}");
defineMacro("\\alef", "\\aleph");
defineMacro("\\alefsym", "\\aleph");
defineMacro("\\Alpha", "\\mathrm{A}");
defineMacro("\\Beta", "\\mathrm{B}");
defineMacro("\\bull", "\\bullet");
defineMacro("\\Chi", "\\mathrm{X}");
defineMacro("\\clubs", "\\clubsuit");
defineMacro("\\cnums", "\\mathbb{C}");
defineMacro("\\Complex", "\\mathbb{C}");
defineMacro("\\Dagger", "\\ddagger");
defineMacro("\\diamonds", "\\diamondsuit");
defineMacro("\\empty", "\\emptyset");
defineMacro("\\Epsilon", "\\mathrm{E}");
defineMacro("\\Eta", "\\mathrm{H}");
defineMacro("\\exist", "\\exists");
defineMacro("\\harr", "\\leftrightarrow");
defineMacro("\\hArr", "\\Leftrightarrow");
defineMacro("\\Harr", "\\Leftrightarrow");
defineMacro("\\hearts", "\\heartsuit");
defineMacro("\\image", "\\Im");
defineMacro("\\infin", "\\infty");
defineMacro("\\Iota", "\\mathrm{I}");
defineMacro("\\isin", "\\in");
defineMacro("\\Kappa", "\\mathrm{K}");
defineMacro("\\larr", "\\leftarrow");
defineMacro("\\lArr", "\\Leftarrow");
defineMacro("\\Larr", "\\Leftarrow");
defineMacro("\\lrarr", "\\leftrightarrow");
defineMacro("\\lrArr", "\\Leftrightarrow");
defineMacro("\\Lrarr", "\\Leftrightarrow");
defineMacro("\\Mu", "\\mathrm{M}");
defineMacro("\\natnums", "\\mathbb{N}");
defineMacro("\\Nu", "\\mathrm{N}");
defineMacro("\\Omicron", "\\mathrm{O}");
defineMacro("\\plusmn", "\\pm");
defineMacro("\\rarr", "\\rightarrow");
defineMacro("\\rArr", "\\Rightarrow");
defineMacro("\\Rarr", "\\Rightarrow");
defineMacro("\\real", "\\Re");
defineMacro("\\reals", "\\mathbb{R}");
defineMacro("\\Reals", "\\mathbb{R}");
defineMacro("\\Rho", "\\mathrm{P}");
defineMacro("\\sdot", "\\cdot");
defineMacro("\\sect", "\\S");
defineMacro("\\spades", "\\spadesuit");
defineMacro("\\sub", "\\subset");
defineMacro("\\sube", "\\subseteq");
defineMacro("\\supe", "\\supseteq");
defineMacro("\\Tau", "\\mathrm{T}");
defineMacro("\\thetasym", "\\vartheta");
defineMacro("\\weierp", "\\wp");
defineMacro("\\Zeta", "\\mathrm{Z}");
defineMacro("\\argmin", "\\DOTSB\\operatorname*{arg\\,min}");
defineMacro("\\argmax", "\\DOTSB\\operatorname*{arg\\,max}");
defineMacro("\\plim", "\\DOTSB\\mathop{\\operatorname{plim}}\\limits");
defineMacro("\\bra", "\\mathinner{\\langle{#1}|}");
defineMacro("\\ket", "\\mathinner{|{#1}\\rangle}");
defineMacro("\\braket", "\\mathinner{\\langle{#1}\\rangle}");
defineMacro("\\Bra", "\\left\\langle#1\\right|");
defineMacro("\\Ket", "\\left|#1\\right\\rangle");
var braketHelper = (one) => (context) => {
  var left = context.consumeArg().tokens;
  var middle = context.consumeArg().tokens;
  var middleDouble = context.consumeArg().tokens;
  var right = context.consumeArg().tokens;
  var oldMiddle = context.macros.get("|");
  var oldMiddleDouble = context.macros.get("\\|");
  context.macros.beginGroup();
  var midMacro = (double) => (context2) => {
    if (one) {
      context2.macros.set("|", oldMiddle);
      if (middleDouble.length) {
        context2.macros.set("\\|", oldMiddleDouble);
      }
    }
    var doubled = double;
    if (!double && middleDouble.length) {
      var nextToken = context2.future();
      if (nextToken.text === "|") {
        context2.popToken();
        doubled = true;
      }
    }
    return {
      tokens: doubled ? middleDouble : middle,
      numArgs: 0
    };
  };
  context.macros.set("|", midMacro(false));
  if (middleDouble.length) {
    context.macros.set("\\|", midMacro(true));
  }
  var arg = context.consumeArg().tokens;
  var expanded = context.expandTokens([
    ...right,
    ...arg,
    ...left
    // reversed
  ]);
  context.macros.endGroup();
  return {
    tokens: expanded.reverse(),
    numArgs: 0
  };
};
defineMacro("\\bra@ket", braketHelper(false));
defineMacro("\\bra@set", braketHelper(true));
defineMacro("\\Braket", "\\bra@ket{\\left\\langle}{\\,\\middle\\vert\\,}{\\,\\middle\\vert\\,}{\\right\\rangle}");
defineMacro("\\Set", "\\bra@set{\\left\\{\\:}{\\;\\middle\\vert\\;}{\\;\\middle\\Vert\\;}{\\:\\right\\}}");
defineMacro("\\set", "\\bra@set{\\{\\,}{\\mid}{}{\\,\\}}");
defineMacro("\\angln", "{\\angl n}");
defineMacro("\\blue", "\\textcolor{##6495ed}{#1}");
defineMacro("\\orange", "\\textcolor{##ffa500}{#1}");
defineMacro("\\pink", "\\textcolor{##ff00af}{#1}");
defineMacro("\\red", "\\textcolor{##df0030}{#1}");
defineMacro("\\green", "\\textcolor{##28ae7b}{#1}");
defineMacro("\\gray", "\\textcolor{gray}{#1}");
defineMacro("\\purple", "\\textcolor{##9d38bd}{#1}");
defineMacro("\\blueA", "\\textcolor{##ccfaff}{#1}");
defineMacro("\\blueB", "\\textcolor{##80f6ff}{#1}");
defineMacro("\\blueC", "\\textcolor{##63d9ea}{#1}");
defineMacro("\\blueD", "\\textcolor{##11accd}{#1}");
defineMacro("\\blueE", "\\textcolor{##0c7f99}{#1}");
defineMacro("\\tealA", "\\textcolor{##94fff5}{#1}");
defineMacro("\\tealB", "\\textcolor{##26edd5}{#1}");
defineMacro("\\tealC", "\\textcolor{##01d1c1}{#1}");
defineMacro("\\tealD", "\\textcolor{##01a995}{#1}");
defineMacro("\\tealE", "\\textcolor{##208170}{#1}");
defineMacro("\\greenA", "\\textcolor{##b6ffb0}{#1}");
defineMacro("\\greenB", "\\textcolor{##8af281}{#1}");
defineMacro("\\greenC", "\\textcolor{##74cf70}{#1}");
defineMacro("\\greenD", "\\textcolor{##1fab54}{#1}");
defineMacro("\\greenE", "\\textcolor{##0d923f}{#1}");
defineMacro("\\goldA", "\\textcolor{##ffd0a9}{#1}");
defineMacro("\\goldB", "\\textcolor{##ffbb71}{#1}");
defineMacro("\\goldC", "\\textcolor{##ff9c39}{#1}");
defineMacro("\\goldD", "\\textcolor{##e07d10}{#1}");
defineMacro("\\goldE", "\\textcolor{##a75a05}{#1}");
defineMacro("\\redA", "\\textcolor{##fca9a9}{#1}");
defineMacro("\\redB", "\\textcolor{##ff8482}{#1}");
defineMacro("\\redC", "\\textcolor{##f9685d}{#1}");
defineMacro("\\redD", "\\textcolor{##e84d39}{#1}");
defineMacro("\\redE", "\\textcolor{##bc2612}{#1}");
defineMacro("\\maroonA", "\\textcolor{##ffbde0}{#1}");
defineMacro("\\maroonB", "\\textcolor{##ff92c6}{#1}");
defineMacro("\\maroonC", "\\textcolor{##ed5fa6}{#1}");
defineMacro("\\maroonD", "\\textcolor{##ca337c}{#1}");
defineMacro("\\maroonE", "\\textcolor{##9e034e}{#1}");
defineMacro("\\purpleA", "\\textcolor{##ddd7ff}{#1}");
defineMacro("\\purpleB", "\\textcolor{##c6b9fc}{#1}");
defineMacro("\\purpleC", "\\textcolor{##aa87ff}{#1}");
defineMacro("\\purpleD", "\\textcolor{##7854ab}{#1}");
defineMacro("\\purpleE", "\\textcolor{##543b78}{#1}");
defineMacro("\\mintA", "\\textcolor{##f5f9e8}{#1}");
defineMacro("\\mintB", "\\textcolor{##edf2df}{#1}");
defineMacro("\\mintC", "\\textcolor{##e0e5cc}{#1}");
defineMacro("\\grayA", "\\textcolor{##f6f7f7}{#1}");
defineMacro("\\grayB", "\\textcolor{##f0f1f2}{#1}");
defineMacro("\\grayC", "\\textcolor{##e3e5e6}{#1}");
defineMacro("\\grayD", "\\textcolor{##d6d8da}{#1}");
defineMacro("\\grayE", "\\textcolor{##babec2}{#1}");
defineMacro("\\grayF", "\\textcolor{##888d93}{#1}");
defineMacro("\\grayG", "\\textcolor{##626569}{#1}");
defineMacro("\\grayH", "\\textcolor{##3b3e40}{#1}");
defineMacro("\\grayI", "\\textcolor{##21242c}{#1}");
defineMacro("\\kaBlue", "\\textcolor{##314453}{#1}");
defineMacro("\\kaGreen", "\\textcolor{##71B307}{#1}");
var implicitCommands = {
  "^": true,
  // Parser.js
  "_": true,
  // Parser.js
  "\\limits": true,
  // Parser.js
  "\\nolimits": true
  // Parser.js
};
var MacroExpander = class {
  constructor(input, settings, mode) {
    this.settings = void 0;
    this.expansionCount = void 0;
    this.lexer = void 0;
    this.macros = void 0;
    this.stack = void 0;
    this.mode = void 0;
    this.settings = settings;
    this.expansionCount = 0;
    this.feed(input);
    this.macros = new Namespace(macros, settings.macros);
    this.mode = mode;
    this.stack = [];
  }
  /**
   * Feed a new input string to the same MacroExpander
   * (with existing macros etc.).
   */
  feed(input) {
    this.lexer = new Lexer(input, this.settings);
  }
  /**
   * Switches between "text" and "math" modes.
   */
  switchMode(newMode) {
    this.mode = newMode;
  }
  /**
   * Start a new group nesting within all namespaces.
   */
  beginGroup() {
    this.macros.beginGroup();
  }
  /**
   * End current group nesting within all namespaces.
   */
  endGroup() {
    this.macros.endGroup();
  }
  /**
   * Ends all currently nested groups (if any), restoring values before the
   * groups began.  Useful in case of an error in the middle of parsing.
   */
  endGroups() {
    this.macros.endGroups();
  }
  /**
   * Returns the topmost token on the stack, without expanding it.
   * Similar in behavior to TeX's `\futurelet`.
   */
  future() {
    if (this.stack.length === 0) {
      this.pushToken(this.lexer.lex());
    }
    return this.stack[this.stack.length - 1];
  }
  /**
   * Remove and return the next unexpanded token.
   */
  popToken() {
    this.future();
    return this.stack.pop();
  }
  /**
   * Add a given token to the token stack.  In particular, this get be used
   * to put back a token returned from one of the other methods.
   */
  pushToken(token) {
    this.stack.push(token);
  }
  /**
   * Append an array of tokens to the token stack.
   */
  pushTokens(tokens) {
    this.stack.push(...tokens);
  }
  /**
   * Find an macro argument without expanding tokens and append the array of
   * tokens to the token stack. Uses Token as a container for the result.
   */
  scanArgument(isOptional) {
    var start2;
    var end;
    var tokens;
    if (isOptional) {
      this.consumeSpaces();
      if (this.future().text !== "[") {
        return null;
      }
      start2 = this.popToken();
      var _this$consumeArg = this.consumeArg(["]"]);
      tokens = _this$consumeArg.tokens;
      end = _this$consumeArg.end;
    } else {
      var _this$consumeArg2 = this.consumeArg();
      tokens = _this$consumeArg2.tokens;
      start2 = _this$consumeArg2.start;
      end = _this$consumeArg2.end;
    }
    this.pushToken(new Token("EOF", end.loc));
    this.pushTokens(tokens);
    return new Token("", SourceLocation.range(start2, end));
  }
  /**
   * Consume all following space tokens, without expansion.
   */
  consumeSpaces() {
    for (; ; ) {
      var token = this.future();
      if (token.text === " ") {
        this.stack.pop();
      } else {
        break;
      }
    }
  }
  /**
   * Consume an argument from the token stream, and return the resulting array
   * of tokens and start/end token.
   */
  consumeArg(delims) {
    var tokens = [];
    var isDelimited = delims && delims.length > 0;
    if (!isDelimited) {
      this.consumeSpaces();
    }
    var start2 = this.future();
    var tok;
    var depth = 0;
    var match = 0;
    do {
      tok = this.popToken();
      tokens.push(tok);
      if (tok.text === "{") {
        ++depth;
      } else if (tok.text === "}") {
        --depth;
        if (depth === -1) {
          throw new ParseError("Extra }", tok);
        }
      } else if (tok.text === "EOF") {
        throw new ParseError("Unexpected end of input in a macro argument, expected '" + (delims && isDelimited ? delims[match] : "}") + "'", tok);
      }
      if (delims && isDelimited) {
        if ((depth === 0 || depth === 1 && delims[match] === "{") && tok.text === delims[match]) {
          ++match;
          if (match === delims.length) {
            tokens.splice(-match, match);
            break;
          }
        } else {
          match = 0;
        }
      }
    } while (depth !== 0 || isDelimited);
    if (start2.text === "{" && tokens[tokens.length - 1].text === "}") {
      tokens.pop();
      tokens.shift();
    }
    tokens.reverse();
    return {
      tokens,
      start: start2,
      end: tok
    };
  }
  /**
   * Consume the specified number of (delimited) arguments from the token
   * stream and return the resulting array of arguments.
   */
  consumeArgs(numArgs, delimiters2) {
    if (delimiters2) {
      if (delimiters2.length !== numArgs + 1) {
        throw new ParseError("The length of delimiters doesn't match the number of args!");
      }
      var delims = delimiters2[0];
      for (var i2 = 0; i2 < delims.length; i2++) {
        var tok = this.popToken();
        if (delims[i2] !== tok.text) {
          throw new ParseError("Use of the macro doesn't match its definition", tok);
        }
      }
    }
    var args = [];
    for (var _i6 = 0; _i6 < numArgs; _i6++) {
      args.push(this.consumeArg(delimiters2 && delimiters2[_i6 + 1]).tokens);
    }
    return args;
  }
  /**
   * Increment `expansionCount` by the specified amount.
   * Throw an error if it exceeds `maxExpand`.
   */
  countExpansion(amount) {
    this.expansionCount += amount;
    if (this.expansionCount > this.settings.maxExpand) {
      throw new ParseError("Too many expansions: infinite loop or need to increase maxExpand setting");
    }
  }
  /**
   * Expand the next token only once if possible.
   *
   * If the token is expanded, the resulting tokens will be pushed onto
   * the stack in reverse order, and the number of such tokens will be
   * returned.  This number might be zero or positive.
   *
   * If not, the return value is `false`, and the next token remains at the
   * top of the stack.
   *
   * In either case, the next token will be on the top of the stack,
   * or the stack will be empty (in case of empty expansion
   * and no other tokens).
   *
   * Used to implement `expandAfterFuture` and `expandNextToken`.
   *
   * If expandableOnly, only expandable tokens are expanded and
   * an undefined control sequence results in an error.
   */
  expandOnce(expandableOnly) {
    var topToken = this.popToken();
    var name = topToken.text;
    var expansion = !topToken.noexpand ? this._getExpansion(name) : null;
    if (expansion == null || expandableOnly && expansion.unexpandable) {
      if (expandableOnly && expansion == null && name[0] === "\\" && !this.isDefined(name)) {
        throw new ParseError("Undefined control sequence: " + name);
      }
      this.pushToken(topToken);
      return false;
    }
    this.countExpansion(1);
    var tokens = expansion.tokens;
    var args = this.consumeArgs(expansion.numArgs, expansion.delimiters);
    if (expansion.numArgs) {
      tokens = tokens.slice();
      for (var i2 = tokens.length - 1; i2 >= 0; --i2) {
        var tok = tokens[i2];
        if (tok.text === "#") {
          if (i2 === 0) {
            throw new ParseError("Incomplete placeholder at end of macro body", tok);
          }
          tok = tokens[--i2];
          if (tok.text === "#") {
            tokens.splice(i2 + 1, 1);
          } else if (/^[1-9]$/.test(tok.text)) {
            tokens.splice(i2, 2, ...args[+tok.text - 1]);
          } else {
            throw new ParseError("Not a valid argument number", tok);
          }
        }
      }
    }
    this.pushTokens(tokens);
    return tokens.length;
  }
  /**
   * Expand the next token only once (if possible), and return the resulting
   * top token on the stack (without removing anything from the stack).
   * Similar in behavior to TeX's `\expandafter\futurelet`.
   * Equivalent to expandOnce() followed by future().
   */
  expandAfterFuture() {
    this.expandOnce();
    return this.future();
  }
  /**
   * Recursively expand first token, then return first non-expandable token.
   */
  expandNextToken() {
    for (; ; ) {
      if (this.expandOnce() === false) {
        var token = this.stack.pop();
        if (token.treatAsRelax) {
          token.text = "\\relax";
        }
        return token;
      }
    }
  }
  /**
   * Fully expand the given macro name and return the resulting list of
   * tokens, or return `undefined` if no such macro is defined.
   */
  expandMacro(name) {
    return this.macros.has(name) ? this.expandTokens([new Token(name)]) : void 0;
  }
  /**
   * Fully expand the given token stream and return the resulting list of
   * tokens.  Note that the input tokens are in reverse order, but the
   * output tokens are in forward order.
   */
  expandTokens(tokens) {
    var output = [];
    var oldStackLength = this.stack.length;
    this.pushTokens(tokens);
    while (this.stack.length > oldStackLength) {
      if (this.expandOnce(true) === false) {
        var token = this.stack.pop();
        if (token.treatAsRelax) {
          token.noexpand = false;
          token.treatAsRelax = false;
        }
        output.push(token);
      }
    }
    this.countExpansion(output.length);
    return output;
  }
  /**
   * Fully expand the given macro name and return the result as a string,
   * or return `undefined` if no such macro is defined.
   */
  expandMacroAsText(name) {
    var tokens = this.expandMacro(name);
    if (tokens) {
      return tokens.map((token) => token.text).join("");
    } else {
      return tokens;
    }
  }
  /**
   * Returns the expanded macro as a reversed array of tokens and a macro
   * argument count.  Or returns `null` if no such macro.
   */
  _getExpansion(name) {
    var definition = this.macros.get(name);
    if (definition == null) {
      return definition;
    }
    if (name.length === 1) {
      var catcode = this.lexer.catcodes[name];
      if (catcode != null && catcode !== 13) {
        return;
      }
    }
    var expansion = typeof definition === "function" ? definition(this) : definition;
    if (typeof expansion === "string") {
      var numArgs = 0;
      if (expansion.includes("#")) {
        var stripped = expansion.replace(/##/g, "");
        while (stripped.includes("#" + (numArgs + 1))) {
          ++numArgs;
        }
      }
      var bodyLexer = new Lexer(expansion, this.settings);
      var tokens = [];
      var tok = bodyLexer.lex();
      while (tok.text !== "EOF") {
        tokens.push(tok);
        tok = bodyLexer.lex();
      }
      tokens.reverse();
      var expanded = {
        tokens,
        numArgs
      };
      return expanded;
    }
    return expansion;
  }
  /**
   * Determine whether a command is currently "defined" (has some
   * functionality), meaning that it's a macro (in the current group),
   * a function, a symbol, or one of the special commands listed in
   * `implicitCommands`.
   */
  isDefined(name) {
    return this.macros.has(name) || Object.prototype.hasOwnProperty.call(functions, name) || Object.prototype.hasOwnProperty.call(symbols.math, name) || Object.prototype.hasOwnProperty.call(symbols.text, name) || Object.prototype.hasOwnProperty.call(implicitCommands, name);
  }
  /**
   * Determine whether a command is expandable.
   */
  isExpandable(name) {
    var macro = this.macros.get(name);
    if (macro != null) {
      return typeof macro === "string" || typeof macro === "function" || !macro.unexpandable;
    }
    return Object.prototype.hasOwnProperty.call(functions, name) && !functions[name].primitive;
  }
};
var unicodeSubRegEx = /^[₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᵦᵧᵨᵩᵪ]/;
var uSubsAndSups = Object.freeze({
  "\u208A": "+",
  "\u208B": "-",
  "\u208C": "=",
  "\u208D": "(",
  "\u208E": ")",
  "\u2080": "0",
  "\u2081": "1",
  "\u2082": "2",
  "\u2083": "3",
  "\u2084": "4",
  "\u2085": "5",
  "\u2086": "6",
  "\u2087": "7",
  "\u2088": "8",
  "\u2089": "9",
  "\u2090": "a",
  "\u2091": "e",
  "\u2095": "h",
  "\u1D62": "i",
  "\u2C7C": "j",
  "\u2096": "k",
  "\u2097": "l",
  "\u2098": "m",
  "\u2099": "n",
  "\u2092": "o",
  "\u209A": "p",
  "\u1D63": "r",
  "\u209B": "s",
  "\u209C": "t",
  "\u1D64": "u",
  "\u1D65": "v",
  "\u2093": "x",
  "\u1D66": "\u03B2",
  "\u1D67": "\u03B3",
  "\u1D68": "\u03C1",
  "\u1D69": "\u03D5",
  "\u1D6A": "\u03C7",
  "\u207A": "+",
  "\u207B": "-",
  "\u207C": "=",
  "\u207D": "(",
  "\u207E": ")",
  "\u2070": "0",
  "\xB9": "1",
  "\xB2": "2",
  "\xB3": "3",
  "\u2074": "4",
  "\u2075": "5",
  "\u2076": "6",
  "\u2077": "7",
  "\u2078": "8",
  "\u2079": "9",
  "\u1D2C": "A",
  "\u1D2E": "B",
  "\u1D30": "D",
  "\u1D31": "E",
  "\u1D33": "G",
  "\u1D34": "H",
  "\u1D35": "I",
  "\u1D36": "J",
  "\u1D37": "K",
  "\u1D38": "L",
  "\u1D39": "M",
  "\u1D3A": "N",
  "\u1D3C": "O",
  "\u1D3E": "P",
  "\u1D3F": "R",
  "\u1D40": "T",
  "\u1D41": "U",
  "\u2C7D": "V",
  "\u1D42": "W",
  "\u1D43": "a",
  "\u1D47": "b",
  "\u1D9C": "c",
  "\u1D48": "d",
  "\u1D49": "e",
  "\u1DA0": "f",
  "\u1D4D": "g",
  "\u02B0": "h",
  "\u2071": "i",
  "\u02B2": "j",
  "\u1D4F": "k",
  "\u02E1": "l",
  "\u1D50": "m",
  "\u207F": "n",
  "\u1D52": "o",
  "\u1D56": "p",
  "\u02B3": "r",
  "\u02E2": "s",
  "\u1D57": "t",
  "\u1D58": "u",
  "\u1D5B": "v",
  "\u02B7": "w",
  "\u02E3": "x",
  "\u02B8": "y",
  "\u1DBB": "z",
  "\u1D5D": "\u03B2",
  "\u1D5E": "\u03B3",
  "\u1D5F": "\u03B4",
  "\u1D60": "\u03D5",
  "\u1D61": "\u03C7",
  "\u1DBF": "\u03B8"
});
var unicodeAccents = {
  "\u0301": {
    "text": "\\'",
    "math": "\\acute"
  },
  "\u0300": {
    "text": "\\`",
    "math": "\\grave"
  },
  "\u0308": {
    "text": '\\"',
    "math": "\\ddot"
  },
  "\u0303": {
    "text": "\\~",
    "math": "\\tilde"
  },
  "\u0304": {
    "text": "\\=",
    "math": "\\bar"
  },
  "\u0306": {
    "text": "\\u",
    "math": "\\breve"
  },
  "\u030C": {
    "text": "\\v",
    "math": "\\check"
  },
  "\u0302": {
    "text": "\\^",
    "math": "\\hat"
  },
  "\u0307": {
    "text": "\\.",
    "math": "\\dot"
  },
  "\u030A": {
    "text": "\\r",
    "math": "\\mathring"
  },
  "\u030B": {
    "text": "\\H"
  },
  "\u0327": {
    "text": "\\c"
  }
};
var unicodeSymbols = {
  "\xE1": "a\u0301",
  "\xE0": "a\u0300",
  "\xE4": "a\u0308",
  "\u01DF": "a\u0308\u0304",
  "\xE3": "a\u0303",
  "\u0101": "a\u0304",
  "\u0103": "a\u0306",
  "\u1EAF": "a\u0306\u0301",
  "\u1EB1": "a\u0306\u0300",
  "\u1EB5": "a\u0306\u0303",
  "\u01CE": "a\u030C",
  "\xE2": "a\u0302",
  "\u1EA5": "a\u0302\u0301",
  "\u1EA7": "a\u0302\u0300",
  "\u1EAB": "a\u0302\u0303",
  "\u0227": "a\u0307",
  "\u01E1": "a\u0307\u0304",
  "\xE5": "a\u030A",
  "\u01FB": "a\u030A\u0301",
  "\u1E03": "b\u0307",
  "\u0107": "c\u0301",
  "\u1E09": "c\u0327\u0301",
  "\u010D": "c\u030C",
  "\u0109": "c\u0302",
  "\u010B": "c\u0307",
  "\xE7": "c\u0327",
  "\u010F": "d\u030C",
  "\u1E0B": "d\u0307",
  "\u1E11": "d\u0327",
  "\xE9": "e\u0301",
  "\xE8": "e\u0300",
  "\xEB": "e\u0308",
  "\u1EBD": "e\u0303",
  "\u0113": "e\u0304",
  "\u1E17": "e\u0304\u0301",
  "\u1E15": "e\u0304\u0300",
  "\u0115": "e\u0306",
  "\u1E1D": "e\u0327\u0306",
  "\u011B": "e\u030C",
  "\xEA": "e\u0302",
  "\u1EBF": "e\u0302\u0301",
  "\u1EC1": "e\u0302\u0300",
  "\u1EC5": "e\u0302\u0303",
  "\u0117": "e\u0307",
  "\u0229": "e\u0327",
  "\u1E1F": "f\u0307",
  "\u01F5": "g\u0301",
  "\u1E21": "g\u0304",
  "\u011F": "g\u0306",
  "\u01E7": "g\u030C",
  "\u011D": "g\u0302",
  "\u0121": "g\u0307",
  "\u0123": "g\u0327",
  "\u1E27": "h\u0308",
  "\u021F": "h\u030C",
  "\u0125": "h\u0302",
  "\u1E23": "h\u0307",
  "\u1E29": "h\u0327",
  "\xED": "i\u0301",
  "\xEC": "i\u0300",
  "\xEF": "i\u0308",
  "\u1E2F": "i\u0308\u0301",
  "\u0129": "i\u0303",
  "\u012B": "i\u0304",
  "\u012D": "i\u0306",
  "\u01D0": "i\u030C",
  "\xEE": "i\u0302",
  "\u01F0": "j\u030C",
  "\u0135": "j\u0302",
  "\u1E31": "k\u0301",
  "\u01E9": "k\u030C",
  "\u0137": "k\u0327",
  "\u013A": "l\u0301",
  "\u013E": "l\u030C",
  "\u013C": "l\u0327",
  "\u1E3F": "m\u0301",
  "\u1E41": "m\u0307",
  "\u0144": "n\u0301",
  "\u01F9": "n\u0300",
  "\xF1": "n\u0303",
  "\u0148": "n\u030C",
  "\u1E45": "n\u0307",
  "\u0146": "n\u0327",
  "\xF3": "o\u0301",
  "\xF2": "o\u0300",
  "\xF6": "o\u0308",
  "\u022B": "o\u0308\u0304",
  "\xF5": "o\u0303",
  "\u1E4D": "o\u0303\u0301",
  "\u1E4F": "o\u0303\u0308",
  "\u022D": "o\u0303\u0304",
  "\u014D": "o\u0304",
  "\u1E53": "o\u0304\u0301",
  "\u1E51": "o\u0304\u0300",
  "\u014F": "o\u0306",
  "\u01D2": "o\u030C",
  "\xF4": "o\u0302",
  "\u1ED1": "o\u0302\u0301",
  "\u1ED3": "o\u0302\u0300",
  "\u1ED7": "o\u0302\u0303",
  "\u022F": "o\u0307",
  "\u0231": "o\u0307\u0304",
  "\u0151": "o\u030B",
  "\u1E55": "p\u0301",
  "\u1E57": "p\u0307",
  "\u0155": "r\u0301",
  "\u0159": "r\u030C",
  "\u1E59": "r\u0307",
  "\u0157": "r\u0327",
  "\u015B": "s\u0301",
  "\u1E65": "s\u0301\u0307",
  "\u0161": "s\u030C",
  "\u1E67": "s\u030C\u0307",
  "\u015D": "s\u0302",
  "\u1E61": "s\u0307",
  "\u015F": "s\u0327",
  "\u1E97": "t\u0308",
  "\u0165": "t\u030C",
  "\u1E6B": "t\u0307",
  "\u0163": "t\u0327",
  "\xFA": "u\u0301",
  "\xF9": "u\u0300",
  "\xFC": "u\u0308",
  "\u01D8": "u\u0308\u0301",
  "\u01DC": "u\u0308\u0300",
  "\u01D6": "u\u0308\u0304",
  "\u01DA": "u\u0308\u030C",
  "\u0169": "u\u0303",
  "\u1E79": "u\u0303\u0301",
  "\u016B": "u\u0304",
  "\u1E7B": "u\u0304\u0308",
  "\u016D": "u\u0306",
  "\u01D4": "u\u030C",
  "\xFB": "u\u0302",
  "\u016F": "u\u030A",
  "\u0171": "u\u030B",
  "\u1E7D": "v\u0303",
  "\u1E83": "w\u0301",
  "\u1E81": "w\u0300",
  "\u1E85": "w\u0308",
  "\u0175": "w\u0302",
  "\u1E87": "w\u0307",
  "\u1E98": "w\u030A",
  "\u1E8D": "x\u0308",
  "\u1E8B": "x\u0307",
  "\xFD": "y\u0301",
  "\u1EF3": "y\u0300",
  "\xFF": "y\u0308",
  "\u1EF9": "y\u0303",
  "\u0233": "y\u0304",
  "\u0177": "y\u0302",
  "\u1E8F": "y\u0307",
  "\u1E99": "y\u030A",
  "\u017A": "z\u0301",
  "\u017E": "z\u030C",
  "\u1E91": "z\u0302",
  "\u017C": "z\u0307",
  "\xC1": "A\u0301",
  "\xC0": "A\u0300",
  "\xC4": "A\u0308",
  "\u01DE": "A\u0308\u0304",
  "\xC3": "A\u0303",
  "\u0100": "A\u0304",
  "\u0102": "A\u0306",
  "\u1EAE": "A\u0306\u0301",
  "\u1EB0": "A\u0306\u0300",
  "\u1EB4": "A\u0306\u0303",
  "\u01CD": "A\u030C",
  "\xC2": "A\u0302",
  "\u1EA4": "A\u0302\u0301",
  "\u1EA6": "A\u0302\u0300",
  "\u1EAA": "A\u0302\u0303",
  "\u0226": "A\u0307",
  "\u01E0": "A\u0307\u0304",
  "\xC5": "A\u030A",
  "\u01FA": "A\u030A\u0301",
  "\u1E02": "B\u0307",
  "\u0106": "C\u0301",
  "\u1E08": "C\u0327\u0301",
  "\u010C": "C\u030C",
  "\u0108": "C\u0302",
  "\u010A": "C\u0307",
  "\xC7": "C\u0327",
  "\u010E": "D\u030C",
  "\u1E0A": "D\u0307",
  "\u1E10": "D\u0327",
  "\xC9": "E\u0301",
  "\xC8": "E\u0300",
  "\xCB": "E\u0308",
  "\u1EBC": "E\u0303",
  "\u0112": "E\u0304",
  "\u1E16": "E\u0304\u0301",
  "\u1E14": "E\u0304\u0300",
  "\u0114": "E\u0306",
  "\u1E1C": "E\u0327\u0306",
  "\u011A": "E\u030C",
  "\xCA": "E\u0302",
  "\u1EBE": "E\u0302\u0301",
  "\u1EC0": "E\u0302\u0300",
  "\u1EC4": "E\u0302\u0303",
  "\u0116": "E\u0307",
  "\u0228": "E\u0327",
  "\u1E1E": "F\u0307",
  "\u01F4": "G\u0301",
  "\u1E20": "G\u0304",
  "\u011E": "G\u0306",
  "\u01E6": "G\u030C",
  "\u011C": "G\u0302",
  "\u0120": "G\u0307",
  "\u0122": "G\u0327",
  "\u1E26": "H\u0308",
  "\u021E": "H\u030C",
  "\u0124": "H\u0302",
  "\u1E22": "H\u0307",
  "\u1E28": "H\u0327",
  "\xCD": "I\u0301",
  "\xCC": "I\u0300",
  "\xCF": "I\u0308",
  "\u1E2E": "I\u0308\u0301",
  "\u0128": "I\u0303",
  "\u012A": "I\u0304",
  "\u012C": "I\u0306",
  "\u01CF": "I\u030C",
  "\xCE": "I\u0302",
  "\u0130": "I\u0307",
  "\u0134": "J\u0302",
  "\u1E30": "K\u0301",
  "\u01E8": "K\u030C",
  "\u0136": "K\u0327",
  "\u0139": "L\u0301",
  "\u013D": "L\u030C",
  "\u013B": "L\u0327",
  "\u1E3E": "M\u0301",
  "\u1E40": "M\u0307",
  "\u0143": "N\u0301",
  "\u01F8": "N\u0300",
  "\xD1": "N\u0303",
  "\u0147": "N\u030C",
  "\u1E44": "N\u0307",
  "\u0145": "N\u0327",
  "\xD3": "O\u0301",
  "\xD2": "O\u0300",
  "\xD6": "O\u0308",
  "\u022A": "O\u0308\u0304",
  "\xD5": "O\u0303",
  "\u1E4C": "O\u0303\u0301",
  "\u1E4E": "O\u0303\u0308",
  "\u022C": "O\u0303\u0304",
  "\u014C": "O\u0304",
  "\u1E52": "O\u0304\u0301",
  "\u1E50": "O\u0304\u0300",
  "\u014E": "O\u0306",
  "\u01D1": "O\u030C",
  "\xD4": "O\u0302",
  "\u1ED0": "O\u0302\u0301",
  "\u1ED2": "O\u0302\u0300",
  "\u1ED6": "O\u0302\u0303",
  "\u022E": "O\u0307",
  "\u0230": "O\u0307\u0304",
  "\u0150": "O\u030B",
  "\u1E54": "P\u0301",
  "\u1E56": "P\u0307",
  "\u0154": "R\u0301",
  "\u0158": "R\u030C",
  "\u1E58": "R\u0307",
  "\u0156": "R\u0327",
  "\u015A": "S\u0301",
  "\u1E64": "S\u0301\u0307",
  "\u0160": "S\u030C",
  "\u1E66": "S\u030C\u0307",
  "\u015C": "S\u0302",
  "\u1E60": "S\u0307",
  "\u015E": "S\u0327",
  "\u0164": "T\u030C",
  "\u1E6A": "T\u0307",
  "\u0162": "T\u0327",
  "\xDA": "U\u0301",
  "\xD9": "U\u0300",
  "\xDC": "U\u0308",
  "\u01D7": "U\u0308\u0301",
  "\u01DB": "U\u0308\u0300",
  "\u01D5": "U\u0308\u0304",
  "\u01D9": "U\u0308\u030C",
  "\u0168": "U\u0303",
  "\u1E78": "U\u0303\u0301",
  "\u016A": "U\u0304",
  "\u1E7A": "U\u0304\u0308",
  "\u016C": "U\u0306",
  "\u01D3": "U\u030C",
  "\xDB": "U\u0302",
  "\u016E": "U\u030A",
  "\u0170": "U\u030B",
  "\u1E7C": "V\u0303",
  "\u1E82": "W\u0301",
  "\u1E80": "W\u0300",
  "\u1E84": "W\u0308",
  "\u0174": "W\u0302",
  "\u1E86": "W\u0307",
  "\u1E8C": "X\u0308",
  "\u1E8A": "X\u0307",
  "\xDD": "Y\u0301",
  "\u1EF2": "Y\u0300",
  "\u0178": "Y\u0308",
  "\u1EF8": "Y\u0303",
  "\u0232": "Y\u0304",
  "\u0176": "Y\u0302",
  "\u1E8E": "Y\u0307",
  "\u0179": "Z\u0301",
  "\u017D": "Z\u030C",
  "\u1E90": "Z\u0302",
  "\u017B": "Z\u0307",
  "\u03AC": "\u03B1\u0301",
  "\u1F70": "\u03B1\u0300",
  "\u1FB1": "\u03B1\u0304",
  "\u1FB0": "\u03B1\u0306",
  "\u03AD": "\u03B5\u0301",
  "\u1F72": "\u03B5\u0300",
  "\u03AE": "\u03B7\u0301",
  "\u1F74": "\u03B7\u0300",
  "\u03AF": "\u03B9\u0301",
  "\u1F76": "\u03B9\u0300",
  "\u03CA": "\u03B9\u0308",
  "\u0390": "\u03B9\u0308\u0301",
  "\u1FD2": "\u03B9\u0308\u0300",
  "\u1FD1": "\u03B9\u0304",
  "\u1FD0": "\u03B9\u0306",
  "\u03CC": "\u03BF\u0301",
  "\u1F78": "\u03BF\u0300",
  "\u03CD": "\u03C5\u0301",
  "\u1F7A": "\u03C5\u0300",
  "\u03CB": "\u03C5\u0308",
  "\u03B0": "\u03C5\u0308\u0301",
  "\u1FE2": "\u03C5\u0308\u0300",
  "\u1FE1": "\u03C5\u0304",
  "\u1FE0": "\u03C5\u0306",
  "\u03CE": "\u03C9\u0301",
  "\u1F7C": "\u03C9\u0300",
  "\u038E": "\u03A5\u0301",
  "\u1FEA": "\u03A5\u0300",
  "\u03AB": "\u03A5\u0308",
  "\u1FE9": "\u03A5\u0304",
  "\u1FE8": "\u03A5\u0306",
  "\u038F": "\u03A9\u0301",
  "\u1FFA": "\u03A9\u0300"
};
var Parser = class _Parser {
  constructor(input, settings) {
    this.mode = void 0;
    this.gullet = void 0;
    this.settings = void 0;
    this.leftrightDepth = void 0;
    this.nextToken = void 0;
    this.mode = "math";
    this.gullet = new MacroExpander(input, settings, this.mode);
    this.settings = settings;
    this.leftrightDepth = 0;
    this.nextToken = null;
  }
  /**
   * Checks a result to make sure it has the right type, and throws an
   * appropriate error otherwise.
   */
  expect(text3, consume) {
    if (consume === void 0) {
      consume = true;
    }
    if (this.fetch().text !== text3) {
      throw new ParseError("Expected '" + text3 + "', got '" + this.fetch().text + "'", this.fetch());
    }
    if (consume) {
      this.consume();
    }
  }
  /**
   * Discards the current lookahead token, considering it consumed.
   */
  consume() {
    this.nextToken = null;
  }
  /**
   * Return the current lookahead token, or if there isn't one (at the
   * beginning, or if the previous lookahead token was consume()d),
   * fetch the next token as the new lookahead token and return it.
   */
  fetch() {
    if (this.nextToken == null) {
      this.nextToken = this.gullet.expandNextToken();
    }
    return this.nextToken;
  }
  /**
   * Switches between "text" and "math" modes.
   */
  switchMode(newMode) {
    this.mode = newMode;
    this.gullet.switchMode(newMode);
  }
  /**
   * Main parsing function, which parses an entire input.
   */
  parse() {
    if (!this.settings.globalGroup) {
      this.gullet.beginGroup();
    }
    if (this.settings.colorIsTextColor) {
      this.gullet.macros.set("\\color", "\\textcolor");
    }
    try {
      var parse = this.parseExpression(false);
      this.expect("EOF");
      if (!this.settings.globalGroup) {
        this.gullet.endGroup();
      }
      return parse;
    } finally {
      this.gullet.endGroups();
    }
  }
  /**
   * Fully parse a separate sequence of tokens as a separate job.
   * Tokens should be specified in reverse order, as in a MacroDefinition.
   */
  subparse(tokens) {
    var oldToken = this.nextToken;
    this.consume();
    this.gullet.pushToken(new Token("}"));
    this.gullet.pushTokens(tokens);
    var parse = this.parseExpression(false);
    this.expect("}");
    this.nextToken = oldToken;
    return parse;
  }
  /**
   * Parses an "expression", which is a list of atoms.
   *
   * `breakOnInfix`: Should the parsing stop when we hit infix nodes? This
   *                 happens when functions have higher precedence than infix
   *                 nodes in implicit parses.
   *
   * `breakOnTokenText`: The text of the token that the expression should end
   *                     with, or `null` if something else should end the
   *                     expression.
   */
  parseExpression(breakOnInfix, breakOnTokenText) {
    var body = [];
    while (true) {
      if (this.mode === "math") {
        this.consumeSpaces();
      }
      var lex = this.fetch();
      if (_Parser.endOfExpression.has(lex.text)) {
        break;
      }
      if (breakOnTokenText && lex.text === breakOnTokenText) {
        break;
      }
      if (breakOnInfix && functions[lex.text] && functions[lex.text].infix) {
        break;
      }
      var atom = this.parseAtom(breakOnTokenText);
      if (!atom) {
        break;
      } else if (atom.type === "internal") {
        continue;
      }
      body.push(atom);
    }
    if (this.mode === "text") {
      this.formLigatures(body);
    }
    return this.handleInfixNodes(body);
  }
  /**
   * Rewrites infix operators such as \over with corresponding commands such
   * as \frac.
   *
   * There can only be one infix operator per group.  If there's more than one
   * then the expression is ambiguous.  This can be resolved by adding {}.
   */
  handleInfixNodes(body) {
    var overIndex = -1;
    var funcName;
    for (var i2 = 0; i2 < body.length; i2++) {
      var node = body[i2];
      if (node.type === "infix") {
        if (overIndex !== -1) {
          throw new ParseError("only one infix operator per group", node.token);
        }
        overIndex = i2;
        funcName = node.replaceWith;
      }
    }
    if (overIndex !== -1 && funcName) {
      var numerNode;
      var denomNode;
      var numerBody = body.slice(0, overIndex);
      var denomBody = body.slice(overIndex + 1);
      if (numerBody.length === 1 && numerBody[0].type === "ordgroup") {
        numerNode = numerBody[0];
      } else {
        numerNode = {
          type: "ordgroup",
          mode: this.mode,
          body: numerBody
        };
      }
      if (denomBody.length === 1 && denomBody[0].type === "ordgroup") {
        denomNode = denomBody[0];
      } else {
        denomNode = {
          type: "ordgroup",
          mode: this.mode,
          body: denomBody
        };
      }
      var _node;
      if (funcName === "\\\\abovefrac") {
        _node = this.callFunction(funcName, [numerNode, body[overIndex], denomNode], []);
      } else {
        _node = this.callFunction(funcName, [numerNode, denomNode], []);
      }
      return [_node];
    } else {
      return body;
    }
  }
  /**
   * Handle a subscript or superscript with nice errors.
   */
  handleSupSubscript(name) {
    var symbolToken = this.fetch();
    var symbol = symbolToken.text;
    this.consume();
    this.consumeSpaces();
    var group;
    do {
      var _group;
      group = this.parseGroup(name);
    } while (((_group = group) == null ? void 0 : _group.type) === "internal");
    if (!group) {
      throw new ParseError("Expected group after '" + symbol + "'", symbolToken);
    }
    return group;
  }
  /**
   * Converts the textual input of an unsupported command into a text node
   * contained within a color node whose color is determined by errorColor
   */
  formatUnsupportedCmd(text3) {
    var textordArray = [];
    for (var i2 = 0; i2 < text3.length; i2++) {
      textordArray.push({
        type: "textord",
        mode: "text",
        text: text3[i2]
      });
    }
    var textNode = {
      type: "text",
      mode: this.mode,
      body: textordArray
    };
    var colorNode = {
      type: "color",
      mode: this.mode,
      color: this.settings.errorColor,
      body: [textNode]
    };
    return colorNode;
  }
  /**
   * Parses a group with optional super/subscripts.
   */
  parseAtom(breakOnTokenText) {
    var base = this.parseGroup("atom", breakOnTokenText);
    if ((base == null ? void 0 : base.type) === "internal") {
      return base;
    }
    if (this.mode === "text") {
      return base;
    }
    var superscript;
    var subscript;
    while (true) {
      this.consumeSpaces();
      var lex = this.fetch();
      if (lex.text === "\\limits" || lex.text === "\\nolimits") {
        if (base && base.type === "op") {
          base.limits = lex.text === "\\limits";
          base.alwaysHandleSupSub = true;
        } else if (base && base.type === "operatorname") {
          if (base.alwaysHandleSupSub) {
            base.limits = lex.text === "\\limits";
          }
        } else {
          throw new ParseError("Limit controls must follow a math operator", lex);
        }
        this.consume();
      } else if (lex.text === "^") {
        if (superscript) {
          throw new ParseError("Double superscript", lex);
        }
        superscript = this.handleSupSubscript("superscript");
      } else if (lex.text === "_") {
        if (subscript) {
          throw new ParseError("Double subscript", lex);
        }
        subscript = this.handleSupSubscript("subscript");
      } else if (lex.text === "'") {
        if (superscript) {
          throw new ParseError("Double superscript", lex);
        }
        var prime = {
          type: "textord",
          mode: this.mode,
          text: "\\prime"
        };
        var primes = [prime];
        this.consume();
        while (this.fetch().text === "'") {
          primes.push(prime);
          this.consume();
        }
        if (this.fetch().text === "^") {
          primes.push(this.handleSupSubscript("superscript"));
        }
        superscript = {
          type: "ordgroup",
          mode: this.mode,
          body: primes
        };
      } else if (uSubsAndSups[lex.text]) {
        var isSub = unicodeSubRegEx.test(lex.text);
        var subsupTokens = [];
        subsupTokens.push(new Token(uSubsAndSups[lex.text]));
        this.consume();
        while (true) {
          var token = this.fetch().text;
          if (!uSubsAndSups[token]) {
            break;
          }
          if (unicodeSubRegEx.test(token) !== isSub) {
            break;
          }
          subsupTokens.unshift(new Token(uSubsAndSups[token]));
          this.consume();
        }
        var body = this.subparse(subsupTokens);
        if (isSub) {
          subscript = {
            type: "ordgroup",
            mode: "math",
            body
          };
        } else {
          superscript = {
            type: "ordgroup",
            mode: "math",
            body
          };
        }
      } else {
        break;
      }
    }
    if (superscript && subscript) {
      return {
        type: "supsub",
        mode: this.mode,
        base,
        sup: superscript,
        sub: subscript
      };
    } else if (superscript) {
      return {
        type: "supsub",
        mode: this.mode,
        base,
        sup: superscript
      };
    } else if (subscript) {
      return {
        type: "supsub",
        mode: this.mode,
        base,
        sub: subscript
      };
    } else {
      return base;
    }
  }
  /**
   * Parses an entire function, including its base and all of its arguments.
   */
  parseFunction(breakOnTokenText, name) {
    var token = this.fetch();
    var func = token.text;
    var funcData = functions[func];
    if (!funcData) {
      return null;
    }
    this.consume();
    if (name && name !== "atom" && !funcData.allowedInArgument) {
      throw new ParseError("Got function '" + func + "' with no arguments" + (name ? " as " + name : ""), token);
    } else if (this.mode === "text" && !funcData.allowedInText) {
      throw new ParseError("Can't use function '" + func + "' in text mode", token);
    } else if (this.mode === "math" && funcData.allowedInMath === false) {
      throw new ParseError("Can't use function '" + func + "' in math mode", token);
    }
    var _this$parseArguments = this.parseArguments(func, funcData), args = _this$parseArguments.args, optArgs = _this$parseArguments.optArgs;
    return this.callFunction(func, args, optArgs, token, breakOnTokenText);
  }
  /**
   * Call a function handler with a suitable context and arguments.
   */
  callFunction(name, args, optArgs, token, breakOnTokenText) {
    var context = {
      funcName: name,
      parser: this,
      token,
      breakOnTokenText
    };
    var func = functions[name];
    if (func && func.handler) {
      return func.handler(context, args, optArgs);
    } else {
      throw new ParseError("No function handler for " + name);
    }
  }
  /**
   * Parses the arguments of a function or environment
   */
  parseArguments(func, funcData) {
    var _funcData$numOptional;
    var numOptionalArgs = (_funcData$numOptional = funcData.numOptionalArgs) != null ? _funcData$numOptional : 0;
    var totalArgs = funcData.numArgs + numOptionalArgs;
    if (totalArgs === 0) {
      return {
        args: [],
        optArgs: []
      };
    }
    var args = [];
    var optArgs = [];
    for (var i2 = 0; i2 < totalArgs; i2++) {
      var _funcData$argTypes;
      var argType = (_funcData$argTypes = funcData.argTypes) == null ? void 0 : _funcData$argTypes[i2];
      var isOptional = i2 < numOptionalArgs;
      if ("primitive" in funcData && funcData.primitive && argType == null || // \sqrt expands into primitive if optional argument doesn't exist
      funcData.type === "sqrt" && i2 === 1 && optArgs[0] == null) {
        argType = "primitive";
      }
      var arg = this.parseGroupOfType("argument to '" + func + "'", argType, isOptional);
      if (isOptional) {
        optArgs.push(arg);
      } else if (arg != null) {
        args.push(arg);
      } else {
        throw new ParseError("Null argument, please report this as a bug");
      }
    }
    return {
      args,
      optArgs
    };
  }
  /**
   * Parses a group when the mode is changing.
   */
  parseGroupOfType(name, type, optional) {
    switch (type) {
      case "color":
        return this.parseColorGroup(optional);
      case "size":
        return this.parseSizeGroup(optional);
      case "url":
        return this.parseUrlGroup(optional);
      case "math":
      case "text":
        return this.parseArgumentGroup(optional, type);
      case "hbox": {
        var group = this.parseArgumentGroup(optional, "text");
        return group != null ? {
          type: "styling",
          mode: group.mode,
          body: [group],
          style: "text",
          // simulate \textstyle
          resetFont: true
        } : null;
      }
      case "raw": {
        this.gullet.consumeSpaces();
        var percentCatcode = this.gullet.lexer.catcodes["%"];
        this.gullet.lexer.setCatcode("%", 12);
        var token = this.parseStringGroup(optional);
        this.gullet.lexer.setCatcode("%", percentCatcode);
        return token != null ? {
          type: "raw",
          mode: "text",
          string: token.text
        } : null;
      }
      case "primitive": {
        if (optional) {
          throw new ParseError("A primitive argument cannot be optional");
        }
        var _group2 = this.parseGroup(name);
        if (_group2 == null) {
          throw new ParseError("Expected group as " + name, this.fetch());
        }
        return _group2;
      }
      case "original":
      case void 0:
        return this.parseArgumentGroup(optional);
      default:
        throw new ParseError("Unknown group type as " + name, this.fetch());
    }
  }
  /**
   * Discard any space tokens, fetching the next non-space token.
   */
  consumeSpaces() {
    while (this.fetch().text === " ") {
      this.consume();
    }
  }
  /**
   * Parses a group, essentially returning the string formed by the
   * brace-enclosed tokens plus some position information.
   */
  parseStringGroup(optional) {
    var argToken = this.gullet.scanArgument(optional);
    if (argToken == null) {
      return null;
    }
    var str = "";
    var nextToken;
    while ((nextToken = this.fetch()).text !== "EOF") {
      str += nextToken.text;
      this.consume();
    }
    this.consume();
    argToken.text = str;
    return argToken;
  }
  /**
   * Parses a regex-delimited group: the largest sequence of tokens
   * whose concatenated strings match `regex`. Returns the string
   * formed by the tokens plus some position information.
   */
  parseRegexGroup(regex, modeName) {
    var firstToken = this.fetch();
    var lastToken = firstToken;
    var str = "";
    var nextToken;
    while ((nextToken = this.fetch()).text !== "EOF" && regex.test(str + nextToken.text)) {
      lastToken = nextToken;
      str += lastToken.text;
      this.consume();
    }
    if (str === "") {
      throw new ParseError("Invalid " + modeName + ": '" + firstToken.text + "'", firstToken);
    }
    return firstToken.range(lastToken, str);
  }
  /**
   * Parses a color description.
   */
  parseColorGroup(optional) {
    var res = this.parseStringGroup(optional);
    if (res == null) {
      return null;
    }
    var match = /^(#[a-f0-9]{3,4}|#[a-f0-9]{6}|#[a-f0-9]{8}|[a-f0-9]{6}|[a-z]+)$/i.exec(res.text);
    if (!match) {
      throw new ParseError("Invalid color: '" + res.text + "'", res);
    }
    var color = match[0];
    if (/^[0-9a-f]{6}$/i.test(color)) {
      color = "#" + color;
    }
    return {
      type: "color-token",
      mode: this.mode,
      color
    };
  }
  /**
   * Parses a size specification, consisting of magnitude and unit.
   */
  parseSizeGroup(optional) {
    var res;
    var isBlank = false;
    this.gullet.consumeSpaces();
    if (!optional && this.gullet.future().text !== "{") {
      res = this.parseRegexGroup(/^[-+]? *(?:$|\d+|\d+\.\d*|\.\d*) *[a-z]{0,2} *$/, "size");
    } else {
      res = this.parseStringGroup(optional);
    }
    if (!res) {
      return null;
    }
    if (!optional && res.text.length === 0) {
      res.text = "0pt";
      isBlank = true;
    }
    var match = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(res.text);
    if (!match) {
      throw new ParseError("Invalid size: '" + res.text + "'", res);
    }
    var data = {
      number: +(match[1] + match[2]),
      // sign + magnitude, cast to number
      unit: match[3]
    };
    if (!validUnit(data)) {
      throw new ParseError("Invalid unit: '" + data.unit + "'", res);
    }
    return {
      type: "size",
      mode: this.mode,
      value: data,
      isBlank
    };
  }
  /**
   * Parses an URL, checking escaped letters and allowed protocols,
   * and setting the catcode of % as an active character (as in \hyperref).
   */
  parseUrlGroup(optional) {
    var percentCatcode = this.gullet.lexer.catcodes["%"];
    var tildeCatcode = this.gullet.lexer.catcodes["~"];
    this.gullet.lexer.setCatcode("%", 13);
    this.gullet.lexer.setCatcode("~", 12);
    var res = this.parseStringGroup(optional);
    this.gullet.lexer.setCatcode("%", percentCatcode);
    this.gullet.lexer.setCatcode("~", tildeCatcode);
    if (res == null) {
      return null;
    }
    var url = res.text.replace(/\\([#$%&~_^{}])/g, "$1");
    return {
      type: "url",
      mode: this.mode,
      url
    };
  }
  /**
   * Parses an argument with the mode specified.
   */
  parseArgumentGroup(optional, mode) {
    var argToken = this.gullet.scanArgument(optional);
    if (argToken == null) {
      return null;
    }
    var outerMode = this.mode;
    if (mode) {
      this.switchMode(mode);
    }
    this.gullet.beginGroup();
    var expression = this.parseExpression(false, "EOF");
    this.expect("EOF");
    this.gullet.endGroup();
    var result = {
      type: "ordgroup",
      mode: this.mode,
      loc: argToken.loc,
      body: expression
    };
    if (mode) {
      this.switchMode(outerMode);
    }
    return result;
  }
  /**
   * Parses an ordinary group, which is either a single nucleus (like "x")
   * or an expression in braces (like "{x+y}") or an implicit group, a group
   * that starts at the current position, and ends right before a higher explicit
   * group ends, or at EOF.
   */
  parseGroup(name, breakOnTokenText) {
    var firstToken = this.fetch();
    var text3 = firstToken.text;
    var result;
    if (text3 === "{" || text3 === "\\begingroup") {
      this.consume();
      var groupEnd = text3 === "{" ? "}" : "\\endgroup";
      this.gullet.beginGroup();
      var expression = this.parseExpression(false, groupEnd);
      var lastToken = this.fetch();
      this.expect(groupEnd);
      this.gullet.endGroup();
      result = {
        type: "ordgroup",
        mode: this.mode,
        loc: SourceLocation.range(firstToken, lastToken),
        body: expression,
        // A group formed by \begingroup...\endgroup is a semi-simple group
        // which doesn't affect spacing in math mode, i.e., is transparent.
        // https://tex.stackexchange.com/questions/1930/when-should-one-
        // use-begingroup-instead-of-bgroup
        semisimple: text3 === "\\begingroup" || void 0
      };
    } else {
      result = this.parseFunction(breakOnTokenText, name) || this.parseSymbol();
      if (result == null && text3[0] === "\\" && !Object.prototype.hasOwnProperty.call(implicitCommands, text3)) {
        if (this.settings.throwOnError) {
          throw new ParseError("Undefined control sequence: " + text3, firstToken);
        }
        result = this.formatUnsupportedCmd(text3);
        this.consume();
      }
    }
    return result;
  }
  /**
   * Form ligature-like combinations of characters for text mode.
   * This includes inputs like "--", "---", "``" and "''".
   * The result will simply replace multiple textord nodes with a single
   * character in each value by a single textord node having multiple
   * characters in its value.  The representation is still ASCII source.
   * The group will be modified in place.
   */
  formLigatures(group) {
    var n = group.length - 1;
    for (var i2 = 0; i2 < n; ++i2) {
      var a3 = group[i2];
      if (a3.type !== "textord") {
        continue;
      }
      var v2 = a3.text;
      var next = group[i2 + 1];
      if (!next || next.type !== "textord") {
        continue;
      }
      if (v2 === "-" && next.text === "-") {
        var afterNext = group[i2 + 2];
        if (i2 + 1 < n && afterNext && afterNext.type === "textord" && afterNext.text === "-") {
          group.splice(i2, 3, {
            type: "textord",
            mode: "text",
            loc: SourceLocation.range(a3, afterNext),
            text: "---"
          });
          n -= 2;
        } else {
          group.splice(i2, 2, {
            type: "textord",
            mode: "text",
            loc: SourceLocation.range(a3, next),
            text: "--"
          });
          n -= 1;
        }
      }
      if ((v2 === "'" || v2 === "`") && next.text === v2) {
        group.splice(i2, 2, {
          type: "textord",
          mode: "text",
          loc: SourceLocation.range(a3, next),
          text: v2 + v2
        });
        n -= 1;
      }
    }
  }
  /**
   * Parse a single symbol out of the string. Here, we handle single character
   * symbols and special functions like \verb.
   */
  parseSymbol() {
    var nucleus = this.fetch();
    var text3 = nucleus.text;
    if (/^\\verb[^a-zA-Z]/.test(text3)) {
      this.consume();
      var arg = text3.slice(5);
      var star = arg.charAt(0) === "*";
      if (star) {
        arg = arg.slice(1);
      }
      if (arg.length < 2 || arg.charAt(0) !== arg.slice(-1)) {
        throw new ParseError("\\verb assertion failed --\n                    please report what input caused this bug");
      }
      arg = arg.slice(1, -1);
      return {
        type: "verb",
        mode: "text",
        body: arg,
        star
      };
    }
    if (Object.prototype.hasOwnProperty.call(unicodeSymbols, text3[0]) && !symbols[this.mode][text3[0]]) {
      if (this.settings.strict && this.mode === "math") {
        handleStrict({
          strict: this.settings.strict,
          errorCode: "unicodeTextInMathMode",
          errorMsg: 'Accented Unicode text character "' + text3[0] + '" used in math mode',
          report: true,
          token: nucleus
        });
      }
      text3 = unicodeSymbols[text3[0]] + text3.slice(1);
    }
    var match = combiningDiacriticalMarksEndRegex.exec(text3);
    if (match) {
      text3 = text3.substring(0, match.index);
      if (text3 === "i") {
        text3 = "\u0131";
      } else if (text3 === "j") {
        text3 = "\u0237";
      }
    }
    var symbol;
    if (symbols[this.mode][text3]) {
      if (this.settings.strict && this.mode === "math" && extraLatin.includes(text3)) {
        handleStrict({
          strict: this.settings.strict,
          errorCode: "unicodeTextInMathMode",
          errorMsg: 'Latin-1/Unicode text character "' + text3[0] + '" used in math mode',
          report: true,
          token: nucleus
        });
      }
      var group = symbols[this.mode][text3].group;
      var loc = SourceLocation.range(nucleus);
      var s;
      if (isAtom(group)) {
        s = {
          type: "atom",
          mode: this.mode,
          family: group,
          loc,
          text: text3
        };
      } else {
        s = {
          type: group,
          mode: this.mode,
          loc,
          text: text3
        };
      }
      symbol = s;
    } else if (text3.charCodeAt(0) >= 128) {
      if (this.settings.strict) {
        if (!supportedCodepoint(text3.charCodeAt(0))) {
          handleStrict({
            strict: this.settings.strict,
            errorCode: "unknownSymbol",
            errorMsg: 'Unrecognized Unicode character "' + text3[0] + '"' + (" (" + text3.charCodeAt(0) + ")"),
            report: true,
            token: nucleus
          });
        } else if (this.mode === "math") {
          handleStrict({
            strict: this.settings.strict,
            errorCode: "unicodeTextInMathMode",
            errorMsg: 'Unicode text character "' + text3[0] + '" used in math mode',
            report: true,
            token: nucleus
          });
        }
      }
      symbol = {
        type: "textord",
        mode: "text",
        loc: SourceLocation.range(nucleus),
        text: text3
      };
    } else {
      return null;
    }
    this.consume();
    if (match) {
      for (var i2 = 0; i2 < match[0].length; i2++) {
        var accent2 = match[0][i2];
        if (!unicodeAccents[accent2]) {
          throw new ParseError("Unknown accent ' " + accent2 + "'", nucleus);
        }
        var command = unicodeAccents[accent2][this.mode] || unicodeAccents[accent2].text;
        if (!command) {
          throw new ParseError("Accent " + accent2 + " unsupported in " + this.mode + " mode", nucleus);
        }
        symbol = {
          type: "accent",
          mode: this.mode,
          loc: SourceLocation.range(nucleus),
          label: command,
          isStretchy: false,
          isShifty: true,
          base: symbol
        };
      }
    }
    return symbol;
  }
};
Parser.endOfExpression = /* @__PURE__ */ new Set(["}", "\\endgroup", "\\end", "\\right", "&"]);
var parseTree = function parseTree2(toParse, settings) {
  if (!(typeof toParse === "string" || toParse instanceof String)) {
    throw new TypeError("KaTeX can only parse string typed expression");
  }
  var parser = new Parser(toParse, settings);
  delete parser.gullet.macros.current["\\df@tag"];
  var tree = parser.parse();
  delete parser.gullet.macros.current["\\current@color"];
  delete parser.gullet.macros.current["\\color"];
  if (parser.gullet.macros.get("\\df@tag")) {
    if (!settings.displayMode) {
      throw new ParseError("\\tag works only in display equations");
    }
    tree = [{
      type: "tag",
      mode: "text",
      body: tree,
      tag: parser.subparse([new Token("\\df@tag")])
    }];
  }
  return tree;
};
var render = function render2(expression, baseNode, options) {
  baseNode.textContent = "";
  var node = renderToDomTree(expression, options).toNode();
  baseNode.appendChild(node);
};
if (typeof document !== "undefined") {
  if (document.compatMode !== "CSS1Compat") {
    typeof console !== "undefined" && console.warn("Warning: KaTeX doesn't work in quirks mode. Make sure your website has a suitable doctype.");
    render = function render3() {
      throw new ParseError("KaTeX doesn't work in quirks mode.");
    };
  }
}
var renderToString = function renderToString2(expression, options) {
  var markup = renderToDomTree(expression, options).toMarkup();
  return markup;
};
var generateParseTree = function generateParseTree2(expression, options) {
  var settings = new Settings(options);
  return parseTree(expression, settings);
};
var renderError = function renderError2(error, expression, options) {
  if (options.throwOnError || !(error instanceof ParseError)) {
    throw error;
  }
  var node = makeSpan(["katex-error"], [new SymbolNode(expression)]);
  node.setAttribute("title", error.toString());
  node.setAttribute("style", "color:" + options.errorColor);
  return node;
};
var renderToDomTree = function renderToDomTree2(expression, options) {
  var settings = new Settings(options);
  try {
    var tree = parseTree(expression, settings);
    return buildTree(tree, expression, settings);
  } catch (error) {
    return renderError(error, expression, settings);
  }
};
var renderToHTMLTree = function renderToHTMLTree2(expression, options) {
  var settings = new Settings(options);
  try {
    var tree = parseTree(expression, settings);
    return buildHTMLTree(tree, settings);
  } catch (error) {
    return renderError(error, expression, settings);
  }
};
var version = "0.19.1";
var __domTree = {
  Span,
  Anchor,
  SymbolNode,
  SvgNode,
  PathNode,
  LineNode
};
var katex = {
  /**
   * Current KaTeX version
   */
  version,
  /**
   * Renders the given LaTeX into an HTML+MathML combination, and adds
   * it as a child to the specified DOM node.
   */
  render,
  /**
   * Renders the given LaTeX into an HTML+MathML combination string,
   * for sending to the client.
   */
  renderToString,
  /**
   * KaTeX error, usually during parsing.
   */
  ParseError,
  /**
   * The schema of Settings
   */
  SETTINGS_SCHEMA,
  /**
   * Parses the given LaTeX into KaTeX's internal parse tree structure,
   * without rendering to HTML or MathML.
   *
   * NOTE: This method is not currently recommended for public use.
   * The internal tree representation is unstable and is very likely
   * to change. Use at your own risk.
   */
  __parse: generateParseTree,
  /**
   * Renders the given LaTeX into an HTML+MathML internal DOM tree
   * representation, without flattening that representation to a string.
   *
   * NOTE: This method is not currently recommended for public use.
   * The internal tree representation is unstable and is very likely
   * to change. Use at your own risk.
   */
  __renderToDomTree: renderToDomTree,
  /**
   * Renders the given LaTeX into an HTML internal DOM tree representation,
   * without MathML and without flattening that representation to a string.
   *
   * NOTE: This method is not currently recommended for public use.
   * The internal tree representation is unstable and is very likely
   * to change. Use at your own risk.
   */
  __renderToHTMLTree: renderToHTMLTree,
  /**
   * extends internal font metrics object with a new object
   * each key in the new object represents a font name
  */
  __setFontMetrics: setFontMetrics,
  /**
   * adds a new symbol to builtin symbols table
   */
  __defineSymbol: defineSymbol,
  /**
   * adds a new function to builtin function list,
   * which directly produce parse tree elements
   * and have their own html/mathml builders
   */
  __defineFunction: defineFunction,
  /**
   * adds a new macro to builtin macro list
   */
  __defineMacro: defineMacro,
  /**
   * Expose the dom tree node types, which can be useful for type checking nodes.
   *
   * NOTE: These methods are not currently recommended for public use.
   * The internal tree representation is unstable and is very likely
   * to change. Use at your own risk.
   */
  __domTree
};

// app/ui/math.js
var marker = (tex, display) => `<span data-md-math="${encodeURIComponent(tex)}"${display ? ' data-display="1"' : ""}></span>`;
var DISPLAY = [/^\$\$([\s\S]+?)\$\$/, /^\\\[([\s\S]+?)\\\]/];
var INLINE = [/^\\\(([\s\S]+?)\\\)/, /^\$(?![\s$])((?:\\.|[^$\\\n])+?)(?<![\s\\])\$(?!\d)/];
var mathExtension = { extensions: [
  {
    name: "mathBlock",
    level: "block",
    start(src) {
      const at2 = src.search(/^[ \t]*(?:\$\$|\\\[)/m);
      return at2 < 0 ? void 0 : at2;
    },
    tokenizer(src) {
      const found = /^[ \t]*(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])[ \t]*(?:\n+|$)/.exec(src);
      return found ? { type: "mathBlock", raw: found[0], text: (found[1] ?? found[2]).trim() } : void 0;
    },
    renderer(token) {
      return marker(token.text, true) + "\n";
    }
  },
  {
    name: "mathInline",
    level: "inline",
    start(src) {
      const at2 = src.search(/(?<!\\)\$|\\[([]/);
      return at2 < 0 ? void 0 : at2;
    },
    tokenizer(src) {
      for (const [rules, display] of [[DISPLAY, true], [INLINE, false]]) for (const rule of rules) {
        const found = rule.exec(src);
        if (found) return { type: "mathInline", raw: found[0], text: found[1].trim(), display };
      }
    },
    renderer(token) {
      return marker(token.text, token.display);
    }
  }
] };
function replaceMath(html2) {
  return html2.replace(/<span data-md-math="([^"]*)"( data-display="1")?><\/span>/g, (_2, raw, display) => {
    let tex;
    try {
      tex = decodeURIComponent(raw);
    } catch {
      return "";
    }
    const rendered = katex.renderToString(tex, { displayMode: !!display, throwOnError: false, strict: "ignore", trust: false, output: "htmlAndMathml" });
    return display ? `<span class="math-block">${rendered}</span>` : rendered;
  });
}

// app/ui/file-links.js
var attr = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function parseFileLink(href) {
  let text3 = String(href ?? "").trim();
  if (!text3 || text3.startsWith("#")) return null;
  const scheme = /^[a-z][a-z0-9+-]+:/i.exec(text3);
  if (/^file:/i.test(text3)) text3 = text3.replace(/^file:\/*/i, "");
  else if (scheme && !/^\d+(?::\d+)?$/.test(text3.slice(scheme[0].length))) return null;
  try {
    text3 = decodeURIComponent(text3);
  } catch {
  }
  const fragment2 = /#L?(\d+)(?:[-,]L?\d+)?$/i.exec(text3);
  if (fragment2) text3 = text3.slice(0, fragment2.index);
  const suffix = fragment2 ? null : /:(\d+)(?::\d+)?$/.exec(text3);
  if (suffix) text3 = text3.slice(0, suffix.index);
  if (!text3) return null;
  const line = Number((fragment2 ?? suffix)?.[1]);
  return { path: text3, line: line > 0 ? line : null };
}
function webLink(href) {
  try {
    const url = new URL(String(href ?? ""));
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
var fileLinks = { renderer: {
  link(token) {
    const web = webLink(token.href);
    if (web) return `<a href="${attr(web)}" title="${attr(token.title || web)}">${this.parser.parseInline(token.tokens)}</a>`;
    const file = parseFileLink(token.href);
    if (!file) return false;
    return `<a class="file-link" href="#" data-link-path="${attr(file.path)}"${file.line ? ` data-link-line="${file.line}"` : ""} title="${attr(file.path)}">${this.parser.parseInline(token.tokens)}</a>`;
  }
} };
function toolFilePath(args) {
  const value = Object.entries(args ?? {}).find(([key]) => /^(?:file_?path|path|absolute_?path|target_?file)$/i.test(key))?.[1];
  return typeof value === "string" && value.trim() ? value : null;
}

// app/ui/setup.js
var esc4 = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var tiles = { dsh: "DS", kimi: "Ki", codex: "Cx", antigravity: "AG", claude: "CC" };
var tile = (r) => `<span class="rt-tile rt-${esc4(r?.id ?? "none")}">${esc4(tiles[r?.id] ?? "?")}</span>`;
var usable = (r) => !!r && (r.status ? r.status === "ready" : !!r.installed);
var permissionWarnings = { dsh: {
  auto: { title: "\u786E\u8BA4\u542F\u7528\u5B8C\u5168\u6743\u9650\uFF1F", text: "\u8FD9\u4E00\u6863\u6CA1\u6709\u6C99\u7BB1\uFF0C\u4E5F\u4E0D\u518D\u8BE2\u95EE\uFF1AAgent \u53EF\u4EE5\u76F4\u63A5\u6539\u6587\u4EF6\u3001\u8FD0\u884C\u5916\u90E8\u547D\u4EE4\uFF0C\u5305\u62EC\u654F\u611F\u64CD\u4F5C\u3002\u53EA\u5728\u4F60\u4FE1\u4EFB\u5F53\u524D\u4EFB\u52A1\u65F6\u4F7F\u7528\u3002", confirm: "\u542F\u7528\u5B8C\u5168\u6743\u9650" },
  "auto-review": { title: "\u786E\u8BA4\u542F\u7528\u81EA\u52A8\u5BA1\u67E5\uFF1F", text: "\u8FD9\u4E00\u6863\u6CA1\u6709\u6C99\u7BB1\u3002\u6BCF\u6B21\u5DE5\u5177\u8C03\u7528\u524D\u7531\u5F53\u524D\u6A21\u578B\u5BA1\u67E5\uFF0C\u5BA1\u67E5\u62D2\u7EDD\u7684\u8C03\u7528\u518D\u7531\u4F60\u51B3\u5B9A\u3002\u8FD9\u662F DSH \u7684\u5B9E\u9A8C\u529F\u80FD\uFF0C\u53EF\u80FD\u8BEF\u653E\u884C\u6216\u8BEF\u62D2\u7EDD\uFF0C\u4E5F\u4F1A\u591A\u6D88\u8017 token\u3002", confirm: "\u542F\u7528\u81EA\u52A8\u5BA1\u67E5" }
}, claude: {
  // Native bypassPermissions: Claude Code has no OS sandbox of its own on Windows.
  auto: { title: "\u786E\u8BA4\u8DF3\u8FC7\u6240\u6709\u6743\u9650\u8BE2\u95EE\uFF1F", text: "\u8FD9\u4E00\u6863\u5BF9\u5E94 Claude Code \u539F\u751F\u7684 bypassPermissions\uFF1A\u4E0D\u518D\u8BE2\u95EE\uFF0CAgent \u53EF\u4EE5\u76F4\u63A5\u6539\u6587\u4EF6\u3001\u8FD0\u884C\u4EFB\u4F55\u547D\u4EE4\uFF0C\u5305\u62EC\u5220\u9664\u548C\u8054\u7F51\u64CD\u4F5C\u3002Claude Code \u5728 Windows \u4E0A\u6CA1\u6709\u6C99\u7BB1\u3002\u53EA\u5728\u4F60\u4FE1\u4EFB\u5F53\u524D\u4EFB\u52A1\u65F6\u4F7F\u7528\u3002", confirm: "\u8DF3\u8FC7\u6240\u6709\u8BE2\u95EE" }
} };
var permissionWarning = (runtimeId, mode) => permissionWarnings[runtimeId]?.[mode] ?? null;
var statusOf = (r) => r?.status ?? (r?.installed ? "ready" : "missing");
var statusNames = { ready: "\u53EF\u7528", missing: "\u672A\u5B89\u88C5", "needs-setup": "\u9700\u8981\u8BBE\u7F6E", error: "\u68C0\u6D4B\u5931\u8D25", checking: "\u6B63\u5728\u68C0\u6D4B" };
function unusableReason(r) {
  if (!r) return "\u672A\u9009\u62E9\u8FD0\u884C\u73AF\u5883";
  if (r.checking && !usable(r)) return "\u6B63\u5728\u68C0\u6D4B\u8FD9\u4E2A\u8FD0\u884C\u73AF\u5883";
  if (r.reason) return r.reason;
  return { missing: `${r.name} \u5C1A\u672A\u5B89\u88C5`, "needs-setup": `${r.name} \u8FD8\u9700\u8981\u5B8C\u6210\u8BBE\u7F6E`, error: `${r.name} \u68C0\u6D4B\u5931\u8D25` }[statusOf(r)] ?? "";
}
var networkNotes = { codex: "\u9700\u8981\u80FD\u8BBF\u95EE OpenAI \u7684\u7F51\u7EDC\u4E0E\u8D26\u53F7", antigravity: "\u9700\u8981\u80FD\u8BBF\u95EE Google \u7684\u7F51\u7EDC\u4E0E\u8D26\u53F7", claude: "\u7531 Bridge++ \u4ECE npm \u4ED3\u5E93\u4E0B\u8F7D\u5B89\u88C5\uFF08\u7EA6 345 MB\uFF09\uFF0C\u4E0D\u9700\u8981 Anthropic \u8D26\u53F7" };
var executorOnly = /* @__PURE__ */ new Set(["claude"]);
var isolationNotes = { claude: "\u72EC\u7ACB\u7684\u914D\u7F6E\u76EE\u5F55\uFF0C\u4E0D\u767B\u5F55\u3001\u4E0D\u5E26\u4EFB\u4F55 Anthropic \u51ED\u636E\uFF1B\u53EA\u8FDE Bridge++ \u672C\u5730\u7F51\u5173\uFF0C\u7528 Qoder CN / WorkBuddy \u6A21\u578B\u3002\u4E0D\u8BFB\u5199\u672C\u673A Claude \u684C\u9762\u7248\u7684\u6570\u636E\u3002" };
var kindNames2 = { managed: "\u7531 Bridge++ \u7BA1\u7406", bundled: "\u968F Bridge++ \u9644\u5E26", system: "\u7CFB\u7EDF\u5B89\u88C5" };
var jobVerbs = { install: "\u5B89\u88C5", update: "\u66F4\u65B0" };
var ago = (date) => {
  const s = (Date.now() - Date.parse(date)) / 1e3;
  if (!(s >= 0)) return "";
  if (s < 60) return "\u521A\u521A";
  if (s < 3600) return `${Math.floor(s / 60)} \u5206\u949F\u524D`;
  if (s < 86400) return `${Math.floor(s / 3600)} \u5C0F\u65F6\u524D`;
  return `${Math.floor(s / 86400)} \u5929\u524D`;
};
var running = (job) => !!job && ["downloading", "verifying", "installing"].includes(job.state);
function jobHtml(job) {
  if (!job) return "";
  const verb = jobVerbs[job.action] ?? "\u5904\u7406";
  if (job.state === "downloading") {
    const total = job.total > 0 ? job.total : null, share = total ? Math.min(1, (job.received ?? 0) / total) : null;
    return `<div class="job"><div class="job-text"><span class="spinner"></span>\u6B63\u5728\u4E0B\u8F7D${share === null ? "" : ` ${Math.round(share * 100)}%`}<span class="muted">${esc4([fileSize(job.received ?? 0), total ? fileSize(total) : ""].filter(Boolean).join(" / "))}</span></div><div class="job-bar${share === null ? " unknown" : ""}"><i style="width:${share === null ? 35 : Math.round(share * 100)}%"></i></div></div>`;
  }
  if (job.state === "verifying") return `<div class="job"><div class="job-text"><span class="spinner"></span>\u6B63\u5728\u6821\u9A8C\u4E0B\u8F7D\u7684\u6587\u4EF6\u2026</div><div class="job-bar unknown"><i></i></div></div>`;
  if (job.state === "installing") return `<div class="job"><div class="job-text"><span class="spinner"></span>\u6B63\u5728${verb}${job.message ? `<span class="muted">${esc4(job.message)}</span>` : "\uFF0C\u8BF7\u5728\u5B89\u88C5\u7A0B\u5E8F\u91CC\u5B8C\u6210"}</div><div class="job-bar unknown"><i></i></div></div>`;
  if (job.state === "done") return `<div class="job done">${icon("check")}<span>${verb}\u5B8C\u6210${job.message ? `\uFF1A${esc4(job.message)}` : ""}</span></div>`;
  if (job.state === "cancelled") return `<div class="job muted">${icon("close")}<span>\u5DF2\u53D6\u6D88${verb}</span></div>`;
  if (job.state === "failed") return `<div class="error-box">${esc4(`${verb}\u5931\u8D25\uFF1A${job.message ?? "\u672A\u77E5\u539F\u56E0"}`)}</div>`;
  return "";
}
function versionLine(env, r) {
  const installed = env?.installed ?? (r?.version ? { version: r.version } : null);
  const parts = [];
  if (installed?.version) parts.push(`<span>\u5DF2\u5B89\u88C5 <b>${esc4(installed.version)}</b>${installed.kind && kindNames2[installed.kind] ? `<span class="muted"> \xB7 ${kindNames2[installed.kind]}</span>` : ""}</span>`);
  if (env?.updateAvailable && env.latest?.version) parts.push(`<span class="update-tag">${icon("download")}\u53EF\u66F4\u65B0\u5230 ${esc4(env.latest.version)}</span>`);
  else if (env?.latest?.version && installed?.version) parts.push(`<span class="muted">\u5DF2\u662F\u6700\u65B0${env.latest.checkedAt ? ` \xB7 ${ago(env.latest.checkedAt)}\u68C0\u67E5` : ""}</span>`);
  else if (env?.latest?.version) parts.push(`<span class="muted">\u6700\u65B0 ${esc4(env.latest.version)}</span>`);
  return parts.length ? `<div class="env-version">${parts.join("")}</div>` : "";
}
function environmentActions(env, r, { canOpenNative }) {
  const a3 = env?.actions ?? {}, busy2 = running(env?.job), list = [];
  if (busy2 && a3.cancel) list.push(`<button class="btn sm" data-env-cancel="${esc4(r.id)}">\u53D6\u6D88</button>`);
  if (!busy2 && a3.install && statusOf(r) === "missing") list.push(`<button class="btn sm primary" data-env-install="${esc4(r.id)}">${icon("download")}\u4E0B\u8F7D\u5B89\u88C5</button>`);
  if (!busy2 && a3.update && env?.updateAvailable === true) list.push(`<button class="btn sm primary" data-env-update="${esc4(r.id)}">${icon("download")}\u66F4\u65B0${env.latest?.version ? `\u5230 ${esc4(env.latest.version)}` : ""}</button>`);
  else if (!busy2 && a3.update && !a3.check && usable(r)) list.push(`<button class="btn sm" data-env-update="${esc4(r.id)}">${icon("download")}\u8FD0\u884C\u5B98\u65B9\u66F4\u65B0</button>`);
  if (!busy2 && a3.check) list.push(`<button class="btn sm" data-env-check="${esc4(r.id)}">${icon("refresh")}\u68C0\u67E5\u66F4\u65B0</button>`);
  if (env?.page) list.push(`<button class="btn sm" data-env-page="${esc4(r.id)}">${icon("external")}\u5B98\u65B9\u9875\u9762</button>`);
  list.push(`<button class="btn sm" data-configure-runtime="${esc4(r.id)}">\u6307\u5B9A\u8DEF\u5F84</button>`);
  if (usable(r)) list.push(`${executorOnly.has(r.id) ? "" : `<button class="btn sm" data-open-runtime="${esc4(r.id)}" ${canOpenNative ? "" : "disabled"}>${icon("external")}\u539F\u751F\u7A0B\u5E8F</button>`}<button class="link-btn" data-use-runtime="${esc4(r.id)}">\u7528\u4E8E\u65B0\u4F1A\u8BDD</button>`);
  return `<div class="card-actions">${list.join("")}</div>`;
}
function environmentCardHtml(r, env, { permissions = "", canOpenNative = false } = {}) {
  const status = statusOf(r), busy2 = running(env?.job), scanning = !!r.checking && !busy2;
  const label = busy2 ? `\u6B63\u5728${jobVerbs[env.job.action] ?? "\u5904\u7406"}` : scanning ? statusNames.checking : statusNames[status] ?? status;
  const reason = status !== "ready" && !scanning ? unusableReason(r) : "";
  const note = (status !== "ready" && !scanning && networkNotes[r.id] ? `<div class="env-note">${icon("info")}<span>${networkNotes[r.id]}</span></div>` : "") + (isolationNotes[r.id] ? `<div class="env-note">${icon("lock")}<span>${isolationNotes[r.id]}</span></div>` : "");
  return `<article class="runtime-card env-${esc4(status)}"><div class="card-top">${tile(r)}<span class="card-status ${busy2 || scanning ? "busy" : status === "ready" ? "ready" : status === "missing" ? "none" : status === "error" ? "error" : "warn"}">${busy2 || scanning ? '<span class="spinner"></span>' : '<span class="status-dot"></span>'}${esc4(label)}</span></div>
    <h3>${esc4(r.name)}<span class="proto">${esc4(r.protocol)}</span></h3><p>${esc4(r.description)}</p>
    ${versionLine(env, r)}${reason ? `<div class="env-reason">${icon("alert")}<span>${esc4(reason)}</span></div>` : ""}${r.warning ? `<div class="env-reason">${icon("alert")}<span>${esc4(r.warning)}</span></div>` : ""}${note}${jobHtml(env?.job)}
    ${usable(r) ? `<div class="features">${esc4(r.tools)}</div>${permissions}` : ""}
    ${r.executable || r.desktop ? `<div class="runtime-path mono" title="${esc4(r.executable ?? r.desktop)}">${esc4(r.executable ?? r.desktop)}</div>` : ""}
    ${scanning ? "" : environmentActions(env, r, { canOpenNative })}</article>`;
}
var serviceStates = { running: "\u8FD0\u884C\u4E2D", stopped: "\u5DF2\u505C\u6B62", starting: "\u6B63\u5728\u542F\u52A8", error: "\u51FA\u9519", checking: "\u6B63\u5728\u6838\u5B9E", unavailable: "\u4E0D\u53EF\u7528", crashed: "\u5DF2\u5F02\u5E38\u9000\u51FA" };
var sourceLogos = { qoder: "Q", workbuddy: "W" };
var profileNames = { dsh: "DeepSeek Harness", kimi: "Kimi Code", codex: "Codex CLI" };
function serviceStatus(s) {
  const busyPort = s.error?.code === "port_in_use" || !!s.portOwner;
  const pending2 = ["starting", "checking"].includes(s.status), cls = s.status === "running" ? "ready" : pending2 ? "busy" : ["error", "unavailable", "crashed"].includes(s.status) || busyPort ? "error" : "none";
  const text3 = busyPort && s.status !== "running" ? "\u7AEF\u53E3\u88AB\u5360\u7528" : serviceStates[s.status] ?? s.status ?? "\u672A\u77E5";
  return `<span class="card-status ${cls}">${pending2 ? '<span class="spinner"></span>' : '<span class="status-dot"></span>'}${esc4(text3)}${s.status === "running" && s.pid ? `<span class="muted"> \xB7 pid ${esc4(s.pid)}</span>` : ""}</span>`;
}
function copyRow(label, value, { id, mono = true, extra = "" }) {
  return `<div class="svc-row"><span class="svc-label">${label}</span><code class="svc-value${mono ? " mono" : ""}" ${id ? `id="${id}"` : ""} title="${esc4(value)}">${esc4(value)}</code>${extra}</div>`;
}
function serviceModelsHtml(list) {
  if (!Array.isArray(list)) return `<div class="svc-models"><div class="table-empty"><span class="spinner"></span> \u6B63\u5728\u8BFB\u53D6\u6A21\u578B\u2026</div></div>`;
  if (!list.length) return `<div class="svc-models"><div class="table-empty">\u8FD9\u4E2A\u63A5\u53E3\u8FD8\u6CA1\u6709\u53EF\u7528\u6A21\u578B\u3002\u8BF7\u5148\u5728\u300C\u6A21\u578B\u6E90\u300D\u91CC\u4E0B\u8F7D\u7EC4\u4EF6\u5E76\u767B\u5F55\u3002</div></div>`;
  return `<div class="svc-models table-wrap"><table class="catalog-table"><thead><tr><th>\u6A21\u578B / ID</th><th>\u7A97\u53E3</th><th>\u601D\u8003\u6863\u4F4D</th></tr></thead><tbody>${list.map((m) => `<tr><td><div class="model-name">${esc4(m.name ?? m.id)}${(m.input_modalities ?? ["text"]).includes("image") ? `<span class="img-badge" title="\u652F\u6301\u56FE\u7247\u8F93\u5165">${icon("image")}</span>` : ""}</div><button class="model-id mono copy-id" data-copy-text="${esc4(m.id)}" title="\u590D\u5236\u6A21\u578B ID">${esc4(m.id)}${icon("copy")}</button></td><td>${m.context_window ? `<span class="ctx-tag">${esc4(compactTokens(m.context_window))}</span>` : '<span class="muted">\u2014</span>'}</td><td>${(m.reasoning_efforts ?? []).length ? m.reasoning_efforts.map((e) => `<span class="effort-tag${e === m.default_reasoning_effort ? " default" : ""}">${esc4(e === "none" ? "\u5173\u95ED" : e)}</span>`).join("") : '<span class="muted">\u9ED8\u8BA4</span>'}</td></tr>`).join("")}</tbody></table></div>`;
}
var compactTokens = (n) => n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(0)}K` : String(n);
function connectionsOf(s) {
  const list = s.connections ?? { dsh: s.dsh ?? null };
  const file = (path2) => `<span class="mono" title="${esc4(path2)}">${esc4(path2.split(/[\\/]/).slice(-2).join("/"))}</span>`;
  return Object.entries(list).filter(([, c]) => c).map(([target, c]) => {
    const where = target === "codex" && c.profile ? `<span class="mono">codex --profile ${esc4(c.profile)}</span>` : target === "kimi" && c.path ? file(c.path) : c.providerId ? `provider <span class="mono">${esc4(c.providerId)}</span>` : c.path ? file(c.path) : "";
    const env = [c.requiredEnv].flat().filter(Boolean);
    return `<div class="svc-dsh${env.length ? " pending" : ""}">${icon(env.length ? "alert" : "check")}<span>${env.length ? "\u5DEE\u4E00\u6B65\u63A5\u5165" : "\u5DF2\u63A5\u5165"} ${esc4(profileNames[target] ?? target)}${where ? ` \xB7 ${where}` : ""}${env.length ? ` \xB7 \u8FD8\u9700\u8981\u8BBE\u7F6E\u73AF\u5883\u53D8\u91CF <span class="mono">${esc4(env.join("\u3001"))}</span>` : c.connectedAt ? ` \xB7 ${ago(c.connectedAt)}` : ""}</span><button class="link-btn svc-disconnect" data-svc-disconnect="${esc4(s.id)}|${esc4(target)}" title="\u4ECE ${esc4(profileNames[target] ?? target)} \u7684\u914D\u7F6E\u91CC\u79FB\u9664\u8FD9\u4E2A\u63A5\u53E3">\u65AD\u5F00</button></div>`;
  }).join("");
}
function serviceFailure(e, now = Date.now()) {
  if (!e?.message || !(now - Date.parse(e.at) < 864e5)) return "";
  const where = [ago(e.at), e.model, Number.isInteger(e.status) ? `HTTP ${e.status}` : null].filter(Boolean).join(" \xB7 "), reset = resetText(e.resetAt, now);
  return `<div class="svc-failure">${icon("alert")}<span><b>\u6700\u8FD1\u5931\u8D25</b>${where ? ` \xB7 ${esc4(where)}` : ""}<br>${esc4(upstreamText(e))}${reset ? `<br>${esc4(reset)}` : ""}</span></div>`;
}
function serviceCardHtml(s, view = {}) {
  const id = esc4(s.id), runningNow = s.status === "running", starting = s.status === "starting";
  const top = `<div class="card-top"><span class="source-logo ${esc4(s.source)}">${esc4(sourceLogos[s.source] ?? "?")}</span>${serviceStatus(s)}</div>
    <h3>${esc4(s.name)}<span class="proto">${esc4(s.sourceName ?? s.source)}</span></h3>`;
  if (s.status === "checking") return `<article class="service-card" data-service="${id}">${top}<p class="svc-pending">\u6B63\u5728\u6838\u5B9E\u8FD9\u4E2A\u63A5\u53E3\u7684\u72B6\u6001\u2026</p></article>`;
  if (s.status === "unavailable") return `<article class="service-card" data-service="${id}">${top}<div class="error-box">${esc4(s.error?.message ?? "\u8FD9\u4E2A\u63A5\u53E3\u6682\u65F6\u4E0D\u80FD\u4F7F\u7528")}</div><div class="card-actions"><button class="btn sm primary" data-svc-action="${id}|retry">${icon("refresh")}\u91CD\u8BD5</button></div></article>`;
  const profiles = s.profiles?.length ? s.profiles : Object.keys(profileNames).map((p) => ({ id: p }));
  const target = profiles.find((p) => p.id === s.defaultProfile) ?? profiles[0], targetName = profileNames[target?.id] ?? target?.name ?? target?.id;
  const address = target?.baseURL ?? s.baseURL ?? "\u2014";
  const key = view.key ? `<code class="svc-value mono revealed">${esc4(view.key)}</code>` : `<code class="svc-value mono">${esc4(s.keyPreview ?? "\u672A\u751F\u6210")}</code>`;
  const owner = s.portOwner ? `<div class="error-box">\u7AEF\u53E3 ${esc4(s.port)} \u5DF2\u88AB ${esc4(s.portOwner.name ?? "\u5176\u4ED6\u7A0B\u5E8F")}\uFF08pid ${esc4(s.portOwner.pid ?? "?")}\uFF09\u5360\u7528${s.portOwner.command ? `\uFF1A<span class="mono">${esc4(s.portOwner.command)}</span>` : ""}\u3002\u8BF7\u5148\u505C\u6B62\u5360\u7528\u5B83\u7684\u7A0B\u5E8F\uFF0C\u6216\u6362\u4E00\u4E2A\u7AEF\u53E3\u3002</div>` : s.error?.message ? `<div class="error-box">${esc4(s.error.message)}</div>` : "";
  const autostart = s.autostart ?? {};
  const stale = s.stale ? `<div class="env-note">${icon("info")}<span>\u73B0\u5728\u8FD0\u884C\u7684\u662F ${esc4(s.stale.running ?? "\u65E7\u7248\u672C")}\uFF0C\u8FD9\u4E2A\u63A5\u53E3\u7A7A\u95F2\u540E\u4F1A\u81EA\u52A8\u6362\u6210 ${esc4(s.stale.current)}\uFF0C\u4E5F\u53EF\u4EE5\u73B0\u5728\u91CD\u542F\u3002</span></div>` : "";
  const requests = s.requests?.total ? `<span class="muted">\u5DF2\u5904\u7406 ${esc4(s.requests.total)} \u4E2A\u8BF7\u6C42${s.requests.failed ? `\uFF0C\u5931\u8D25 ${esc4(s.requests.failed)} \u4E2A` : ""}${s.requests.lastAt ? ` \xB7 \u6700\u8FD1 ${ago(s.requests.lastAt)}` : ""}</span>` : '<span class="muted">\u8FD8\u6CA1\u6709\u8BF7\u6C42</span>';
  const models2 = s.models ?? {};
  return `<article class="service-card" data-service="${id}">${top}
    <div class="svc-rows">
      <div class="svc-row"><span class="svc-label">\u63A5\u5165\u5230</span><select class="svc-select" data-svc-profile="${id}" title="\u5E95\u4E0B\u7684\u300C\u63A5\u5165\u300D\u6309\u94AE\u767B\u8BB0\u5230\u8FD9\u4E2A Agent\uFF1B\u4E0D\u5E26\u524D\u7F00\u7684 /v1 \u4E5F\u6309\u5B83\u7684\u5DE5\u5177\u7EA6\u5B9A\u56DE\u7B54">${profiles.map((p) => `<option value="${esc4(p.id)}" ${p.id === target?.id ? "selected" : ""}>${esc4(profileNames[p.id] ?? p.name ?? p.id)}</option>`).join("")}</select></div>
      ${copyRow("\u5730\u5740", address, { extra: `<button class="icon-btn xs" data-copy-text="${esc4(address)}" title="\u590D\u5236\u5730\u5740">${icon("copy")}</button>` })}
      <div class="svc-row"><span class="svc-label">\u5BC6\u94A5</span>${key}<button class="icon-btn xs" data-svc-key="${id}|reveal" title="${view.key ? "\u9690\u85CF" : "\u663E\u793A"}">${icon("eye")}</button><button class="icon-btn xs" data-svc-key="${id}|copy" title="\u590D\u5236\u5BC6\u94A5">${icon("copy")}</button><button class="icon-btn xs" data-svc-key="${id}|regenerate" title="\u91CD\u65B0\u751F\u6210\u5BC6\u94A5">${icon("refresh")}</button></div>
      <div class="svc-row"><span class="svc-label">\u7AEF\u53E3</span><input class="svc-port" type="number" min="1024" max="65535" value="${esc4(s.port ?? "")}" data-svc-port="${id}"><button class="btn sm" data-svc-apply-port="${id}">\u5E94\u7528</button></div>
      <label class="svc-row svc-toggle"><span class="svc-label">\u5F00\u673A\u542F\u52A8</span><input type="checkbox" data-svc-autostart="${id}" ${autostart.enabled ? "checked" : ""}><span>\u767B\u5F55 Windows \u65F6\u5728\u540E\u53F0\u542F\u52A8</span>${autostart.enabled && autostart.valid === false ? `<span class="svc-issue">${icon("alert")}${esc4(autostart.issue ?? "\u5F00\u673A\u4EFB\u52A1\u9700\u8981\u4FEE\u590D")}</span>` : ""}</label>
    </div>
    ${owner}${stale}
    <div class="card-foot"><span><b>${esc4(models2.count ?? "\u2014")}</b> \u4E2A\u6A21\u578B${models2.refreshedAt ? ` \xB7 ${ago(models2.refreshedAt)}\u5237\u65B0` : ""}</span>${requests}</div>
    ${models2.error ? `<div class="error-box">${esc4(models2.error)}</div>` : ""}
    ${serviceFailure(s.requests?.lastError)}
    <div class="card-actions">${runningNow ? `<button class="btn sm" data-svc-action="${id}|restart">${icon("refresh")}\u91CD\u542F</button><button class="btn sm danger" data-svc-action="${id}|stop">${icon("stop")}\u505C\u6B62</button>` : `<button class="btn sm primary" data-svc-action="${id}|start" ${starting ? "disabled" : ""}>${icon("play")}${s.status === "crashed" ? "\u91CD\u65B0\u542F\u52A8" : "\u542F\u52A8"}</button>`}<button class="btn sm" data-svc-models="${id}">${icon("list")}${view.models ? "\u6536\u8D77\u6A21\u578B" : "\u67E5\u770B\u6A21\u578B"}</button><button class="btn sm" data-svc-refresh="${id}">${icon("refresh")}\u5237\u65B0\u6A21\u578B</button><button class="btn sm${runningNow ? " primary" : ""}" data-svc-connect="${id}|${esc4(target?.id ?? "dsh")}" ${runningNow && !view.connecting ? "" : "disabled"} title="${runningNow ? `\u628A\u8FD9\u4E2A\u63A5\u53E3\u767B\u8BB0\u5230 ${esc4(targetName)}` : "\u5148\u542F\u52A8\u63A5\u53E3"}">${view.connecting ? `<span class="spinner"></span>\u63A5\u5165\u4E2D\u2026` : `${icon("plug")}\u63A5\u5165 ${esc4(targetName)}`}</button></div>
    ${connectionsOf(s)}
    ${view.models ? serviceModelsHtml(view.list) : ""}</article>`;
}
var serviceCardsHtml = (services, views2) => services.map((s) => serviceCardHtml(s, views2.get(s.id))).join("");
function servicesPageHtml(services, views2) {
  const body = Array.isArray(services) ? `<div class="service-grid" id="service-grid">${serviceCardsHtml(services, views2)}</div>` : `<div class="note">${icon("info")}<span>\u5F53\u524D\u540E\u7AEF\u8FD8\u6CA1\u6709\u63D0\u4F9B\u5BF9\u5916\u63A5\u53E3\u3002</span></div>`;
  return `<div class="settings-head"><h1>\u5BF9\u5916\u63A5\u53E3</h1><p>\u628A Qoder CN \u548C WorkBuddy \u6A21\u578B\u6E90\u4F5C\u4E3A OpenAI \u517C\u5BB9\u63A5\u53E3\u63D0\u4F9B\u7ED9\u5176\u4ED6 Agent\uFF08\u4F8B\u5982 DeepSeek Harness\uFF09\u3002\u63A5\u53E3\u53EA\u76D1\u542C\u672C\u673A\uFF0C\u5173\u6389 Bridge++ \u7A97\u53E3\u540E\u4ECD\u5728\u540E\u53F0\u8FD0\u884C\u3002</p></div>${body}
    <div class="note">${icon("info")}<span>\u5148\u5728\u300C\u63A5\u5165\u5230\u300D\u9009\u8981\u767B\u8BB0\u7684 Agent\uFF0C\u518D\u70B9\u5E95\u4E0B\u7684\u300C\u63A5\u5165\u300D\u6309\u94AE\uFF1B\u5730\u5740\u680F\u663E\u793A\u7684\u662F\u8BE5 Agent \u4E13\u7528\u7684\u8DEF\u5F84\uFF08<span class="mono">/dsh/v1</span>\u3001<span class="mono">/kimi/v1</span>\u3001<span class="mono">/codex/v1</span>\uFF09\uFF0C\u4E0D\u5E26\u524D\u7F00\u7684 <span class="mono">/v1</span> \u4E5F\u6309\u6240\u9009 Agent \u7684\u5DE5\u5177\u7EA6\u5B9A\u56DE\u7B54\u3002\u6A21\u578B ID\u3001\u601D\u8003\u6863\u4F4D\u548C\u56FE\u7247\u8F93\u5165\u4EE5\u63A5\u53E3\u7684\u6A21\u578B\u5217\u8868\u4E3A\u51C6\u3002\u5730\u5740\u8981\u5199 <span class="mono">127.0.0.1</span>\uFF1A\u7528 localhost \u6216\u4ECE\u7F51\u9875\u91CC\u53D1\u8D77\u7684\u8BF7\u6C42\u4F1A\u88AB\u62D2\u7EDD\uFF0C\u4EE5\u514D\u7F51\u9875\u501F\u7528\u672C\u673A\u63A5\u53E3\u3002</span></div>`;
}
var recommended = /* @__PURE__ */ new Set(["dsh", "kimi"]);
function guideEnvRow(r, env) {
  const status = statusOf(r), busy2 = running(env?.job), a3 = env?.actions ?? {};
  let side;
  if (busy2) side = `<span class="guide-state"><span class="spinner"></span>${env.job.state === "downloading" && env.job.total ? `${Math.round(100 * (env.job.received ?? 0) / env.job.total)}%` : "\u5904\u7406\u4E2D"}</span>`;
  else if (r.checking && status !== "ready") side = '<span class="guide-state"><span class="spinner"></span>\u68C0\u6D4B\u4E2D</span>';
  else if (status === "ready") side = `<span class="guide-state ok">${icon("check")}${esc4(env?.installed?.version ? `\u5DF2\u5C31\u7EEA \xB7 ${env.installed.version}` : "\u5DF2\u5C31\u7EEA")}</span>`;
  else if (a3.install) side = `<button class="btn sm primary" data-env-install="${esc4(r.id)}">${icon("download")}\u4E0B\u8F7D\u5B89\u88C5</button>`;
  else if (env?.page) side = `<button class="btn sm" data-env-page="${esc4(r.id)}">${icon("external")}\u5B98\u65B9\u9875\u9762</button>`;
  else side = `<button class="btn sm" data-configure-runtime="${esc4(r.id)}">\u6307\u5B9A\u8DEF\u5F84</button>`;
  const sub2 = status === "ready" ? r.description : busy2 ? "" : r.checking ? r.description : unusableReason(r) + (networkNotes[r.id] ? ` \xB7 ${networkNotes[r.id]}` : "");
  return `<div class="guide-row">${tile(r)}<span class="guide-main"><span class="guide-name">${esc4(r.name)}${recommended.has(r.id) ? '<span class="mi-tag">\u63A8\u8350</span>' : ""}</span><span class="guide-sub">${esc4(sub2)}</span>${env?.job?.state === "failed" ? `<span class="guide-error">${esc4(env.job.message ?? "\u5931\u8D25")}</span>` : ""}</span>${side}</div>`;
}
var sourceTitles = { qoder: "Qoder CN", workbuddy: "WorkBuddy", antigravity: "Antigravity \xB7 Gemini" };
function sourceState(catalog, component) {
  if (running(component?.job)) return { key: "working", label: "\u6B63\u5728\u4E0B\u8F7D\u7EC4\u4EF6" };
  if (component ? component.status !== "ready" : catalog?.status === "needs-component") return { key: "component", label: "\u9700\u8981\u4E0B\u8F7D\u7EC4\u4EF6" };
  if (catalog?.status === "loading") return { key: "loading", label: "\u6B63\u5728\u8BFB\u53D6\u76EE\u5F55" };
  if (catalog?.status === "ready") return { key: "ready", label: "\u5DF2\u8FDE\u63A5" };
  if (catalog?.status === "error") return { key: "error", label: "\u9700\u8981\u5904\u7406" };
  return { key: "idle", label: "\u5C1A\u672A\u8BFB\u53D6" };
}
var sourceInstallButton = (id) => `<button class="btn sm primary" data-source-install="${esc4(id)}">${icon("download")}\u4E0B\u8F7D\u7EC4\u4EF6</button>`;
var sourceRefreshButton = (id, busy2 = false) => `<button class="btn sm" data-refresh-source="${esc4(id)}" ${busy2 ? "disabled" : ""}>${icon("refresh")}${busy2 ? "\u8BFB\u53D6\u4E2D" : "\u91CD\u65B0\u68C0\u6D4B"}</button>`;
var sourcePageButton = (id, component) => component?.page ? `<button class="btn sm" data-source-page="${esc4(id)}">${icon("external")}\u5B98\u65B9\u9875\u9762</button>` : "";
var jobShare = (job) => job?.state === "downloading" && job.total ? `${Math.round(100 * (job.received ?? 0) / job.total)}%` : "\u5904\u7406\u4E2D";
function guideSourceRow(id, snap) {
  const c = snap.catalog?.[id], component = snap.sourceComponents?.find((x2) => x2.id === id), now = sourceState(c, component), count2 = c?.models?.filter((m) => m.enabled).length ?? 0;
  const sub2 = { working: "", component: component?.signIn ?? "\u9700\u8981\u5148\u4E0B\u8F7D\u8FD9\u4E2A\u6765\u6E90\u7684\u7EC4\u4EF6", loading: "\u6B63\u5728\u8BFB\u53D6\u76EE\u5F55\u2026", ready: `\u5DF2\u8FDE\u63A5 \xB7 ${count2} \u4E2A\u53EF\u7528\u6A21\u578B`, error: c?.error ?? component?.signIn ?? "\u9700\u8981\u5904\u7406", idle: "\u7EC4\u4EF6\u5DF2\u5C31\u7EEA\uFF0C\u8FD8\u6CA1\u6709\u8BFB\u53D6\u76EE\u5F55" }[now.key];
  const side = { working: `<span class="guide-state"><span class="spinner"></span>${jobShare(component?.job)}</span>`, component: `<span class="guide-actions">${sourcePageButton(id, component)}${sourceInstallButton(id)}</span>`, loading: '<span class="guide-state"><span class="spinner"></span>\u8BFB\u53D6\u4E2D</span>', ready: `<span class="guide-state ok">${icon("check")}\u5DF2\u8FDE\u63A5</span>`, error: `<span class="guide-actions">${sourcePageButton(id, component)}${sourceRefreshButton(id)}</span>`, idle: `<span class="guide-actions">${sourceRefreshButton(id)}</span>` }[now.key];
  const failed = component?.job?.state === "failed" ? component.job.message ?? "\u4E0B\u8F7D\u5931\u8D25" : component?.status === "error" ? component.error : "";
  return `<div class="guide-row"><span class="source-logo ${esc4(id)}">${sourceLogos[id]}</span><span class="guide-main"><span class="guide-name">${sourceTitles[id]}</span><span class="guide-sub">${esc4(sub2)}</span>${failed ? `<span class="guide-error">${esc4(failed)}</span>` : ""}</span>${side}</div>`;
}
function sourceCardHtml(id, description, c, component) {
  const now = sourceState(c, component), working = now.key === "working", loading = now.key === "loading";
  const status = { ready: "ready", error: "error", component: "warn", working: "loading", loading: "loading" }[now.key] ?? "none";
  const count2 = c?.models?.filter((m) => m.enabled).length;
  const actions = working ? `<button class="btn sm" data-source-cancel="${esc4(id)}">${icon("close")}\u53D6\u6D88</button>` : now.key === "component" ? `${sourceInstallButton(id)}${sourcePageButton(id, component)}` : `<button class="btn sm" data-refresh-source="${esc4(id)}" ${loading ? "disabled" : ""}>${icon("refresh")}${loading ? "\u8BFB\u53D6\u4E2D" : "\u5237\u65B0\u76EE\u5F55"}</button>${now.key === "error" ? sourcePageButton(id, component) : ""}`;
  const detail = component ? `<span class="source-package mono" title="\u4E0B\u8F7D\u5230\u672C\u673A\u7684\u7EC4\u4EF6">${esc4(component.package)} ${esc4(component.installedVersion ?? component.version)}</span>` : "";
  return `<article class="source-card"><div class="card-top"><span class="source-logo ${esc4(id)}">${sourceLogos[id] ?? "G"}</span><span class="card-status ${status}">${working || loading ? '<span class="spinner"></span>' : '<span class="status-dot"></span>'}${now.label}</span></div><h3>${esc4(sourceTitles[id] ?? id)}</h3><p>${esc4(description)}</p>${now.key === "component" || now.key === "error" ? `<p class="source-hint">${esc4(component?.signIn ?? "")}</p>` : ""}${detail}${component?.status === "error" && component.error ? `<div class="error-box">${esc4(component.error)}</div>` : ""}${c?.error && now.key === "error" ? `<div class="error-box">${esc4(c.error)}</div>` : ""}${jobHtml(component?.job)}<div class="card-foot"><span><b>${count2 ?? "\u2014"}</b> \u4E2A\u53EF\u7528\u6A21\u578B${c?.checkedAt ? ` \xB7 ${ago(c.checkedAt)}` : ""}</span><span class="source-actions">${actions}</span></div></article>`;
}
function onboardingHtml(snap) {
  const envs = new Map((snap.environments ?? []).map((e) => [e.id, e]));
  const ready = snap.runtimes.filter(usable).length, scanning = snap.runtimes.some((r) => r.checking);
  const order = [...snap.runtimes].sort((a3, b) => (recommended.has(b.id) ? 1 : 0) - (recommended.has(a3.id) ? 1 : 0));
  const sources2 = ["qoder", "workbuddy"].map((id) => guideSourceRow(id, snap)).join("");
  const folders = snap.projects.length ? `<div class="guide-row">${icon("folder", "guide-icon")}<span class="guide-main"><span class="guide-name">\u5DE5\u4F5C\u6587\u4EF6\u5939</span><span class="guide-sub">\u5DF2\u6253\u5F00 ${snap.projects.length} \u4E2A</span></span><span class="guide-state ok">${icon("check")}\u5DF2\u5B8C\u6210</span></div>` : `<div class="guide-row">${icon("folder", "guide-icon")}<span class="guide-main"><span class="guide-name">\u5DE5\u4F5C\u6587\u4EF6\u5939</span><span class="guide-sub">Agent \u53EA\u5728\u4F60\u6253\u5F00\u7684\u6587\u4EF6\u5939\u91CC\u5DE5\u4F5C</span></span><button class="btn sm" id="guide-add-project">${icon("folderPlus")}\u6253\u5F00\u6587\u4EF6\u5939</button></div>`;
  return `<div class="guide"><div class="guide-head">${logo(36)}<div><h2>\u6B22\u8FCE\u4F7F\u7528 Bridge++</h2><p>Bridge++ \u628A Qoder CN\u3001WorkBuddy \u7684\u6A21\u578B\u63A5\u5230\u4F60\u719F\u6089\u7684\u5F00\u53D1\u73AF\u5883\u91CC\u3002\u88C5\u597D\u4EFB\u610F\u4E00\u4E2A\u5F00\u53D1\u73AF\u5883\u5C31\u80FD\u5F00\u59CB\uFF0C\u5176\u4F59\u7684\u4EE5\u540E\u968F\u65F6\u5728\u8BBE\u7F6E\u91CC\u6DFB\u52A0\u3002\u6A21\u578B\u6E90\u7684\u7EC4\u4EF6\u4ECE npm \u4E0B\u8F7D\u5230\u4F60\u7684\u7535\u8111\uFF0C\u8D26\u53F7\u7528\u5B98\u65B9\u5BA2\u6237\u7AEF\u767B\u5F55\uFF0CBridge++ \u4E0D\u9644\u5E26\u4E5F\u4E0D\u4FDD\u7BA1\u3002</p></div></div>
    <h3><span class="guide-step">1</span>\u5F00\u53D1\u73AF\u5883${ready ? `<span class="guide-count">${ready} \u4E2A\u53EF\u7528</span>` : ""}</h3><div class="guide-list">${order.map((r) => guideEnvRow(r, envs.get(r.id))).join("")}</div>
    <h3><span class="guide-step">2</span>\u6A21\u578B\u6E90</h3><div class="guide-list">${sources2}</div>
    <h3><span class="guide-step">3</span>\u5DE5\u4F5C\u6587\u4EF6\u5939</h3><div class="guide-list">${folders}</div>
    <div class="modal-actions"><button id="guide-later" class="btn">\u7A0D\u540E</button><button id="guide-done" class="btn primary" ${ready ? "" : "disabled"} title="${ready ? "" : scanning ? "\u6B63\u5728\u68C0\u6D4B\u5F00\u53D1\u73AF\u5883" : "\u81F3\u5C11\u9700\u8981\u4E00\u4E2A\u53EF\u7528\u7684\u5F00\u53D1\u73AF\u5883"}">\u5F00\u59CB\u4F7F\u7528</button></div></div>`;
}

// app/ui/questions.js
var esc5 = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var questionOptions = (q2) => Array.isArray(q2?.options) ? q2.options : [];
function structuredQuestions(data) {
  const qs = Array.isArray(data?.questions) ? data.questions : null;
  const ok = (q2) => typeof q2?.question === "string" && q2.question.trim() && (q2.options == null || Array.isArray(q2.options) && q2.options.every((o) => typeof o?.label === "string")) && (q2.allowCustom !== false || questionOptions(q2).length > 0);
  return qs?.length && qs.every(ok) ? qs : null;
}
function questionFormHtml(qs) {
  const note = qs.length > 1 ? '<p class="q-note">\u53EF\u4EE5\u53EA\u56DE\u7B54\u5176\u4E2D\u4E00\u90E8\u5206\uFF1B\u6CA1\u56DE\u7B54\u7684\u95EE\u9898\u4F1A\u544A\u8BC9 Agent \u4F60\u8DF3\u8FC7\u4E86\u3002</p>' : "";
  return `<div class="q-form">${note}${qs.map((q2, i2) => {
    const options = questionOptions(q2);
    const other = !options.length ? "\u4F60\u7684\u56DE\u7B54" : q2.multiSelect ? "\u53E6\u5916\u8865\u5145\uFF08\u53EF\u9009\uFF09" : "\u5176\u4ED6\u7B54\u6848\uFF08\u586B\u5199\u540E\u4EE3\u66FF\u4E0A\u9762\u7684\u9009\u9879\uFF09";
    const input = q2.allowCustom === false ? "" : `<input class="q-other" type="${q2.secret === true ? "password" : "text"}" data-q-other="${i2}" placeholder="${other}" maxlength="2000" autocomplete="off">`;
    const detail = typeof q2.detail === "string" && q2.detail.trim() ? `<p class="q-detail">${esc5(q2.detail)}</p>` : "";
    const picks = options.map((o, j2) => `<label class="q-option"><input type="${q2.multiSelect ? "checkbox" : "radio"}" name="q${i2}" value="${j2}"><span class="q-option-text"><b>${esc5(o.label)}</b>${o.description ? `<span class="muted">${esc5(o.description)}</span>` : ""}</span></label>`).join("");
    return `<fieldset class="q-field"><legend>${q2.header ? `<span class="q-tag">${esc5(q2.header)}</span>` : ""}<span class="q-text">${esc5(q2.question)}</span>${q2.multiSelect && options.length ? '<span class="muted">\u53EF\u591A\u9009</span>' : ""}</legend>${detail}${picks}${input}</fieldset>`;
  }).join("")}</div>`;
}
function buildAnswers(qs, read) {
  const answers = {}, items = [];
  qs.forEach((q2, i2) => {
    const options = questionOptions(q2), { picked = [], other: typed = "" } = read(i2) ?? {};
    let labels2 = [...new Set(picked)].map((j2) => options[j2]?.label).filter((label) => typeof label === "string");
    if (!q2.multiSelect) labels2 = labels2.slice(0, 1);
    const other = q2.allowCustom === false ? "" : String(typed ?? "").trim();
    const selected = q2.multiSelect || !other ? labels2 : [], chosen = [...selected, ...other ? [other] : []];
    const base = { ...typeof q2.id === "string" ? { id: q2.id } : {}, question: q2.question };
    if (!chosen.length) {
      items.push({ ...base, selected: [], skipped: true });
      return;
    }
    answers[q2.question] = chosen.join(", ");
    items.push({ ...base, selected, ...other ? { custom: other } : {} });
  });
  return { answers, items };
}

// app/ui/tokens.js
var UNITS = { k: 1e3, m: 1e6, "\u4E07": 1e4 };
function parseTokens(raw) {
  const text3 = String(raw ?? "").trim().replace(/\s*tokens?$/i, "").replace(/[\s,，_]/g, "");
  if (!text3) return null;
  const match = /^(\d+(?:\.\d+)?|\.\d+)([kKmM万])?$/.exec(text3);
  if (!match) return NaN;
  const value = Number(match[1]) * (match[2] ? UNITS[match[2].toLowerCase()] : 1);
  return Number.isFinite(value) ? Math.round(value) : NaN;
}
function formatTokens(n) {
  if (!Number.isSafeInteger(n) || n < 0) return "";
  if (n >= 1e6 && n % 1e3 === 0) return `${n / 1e6}M`;
  if (n >= 1e3 && n % 1e3 === 0) return `${n / 1e3}K`;
  return String(n);
}
function compactTokens2(n) {
  if (n == null || !Number.isFinite(n)) return "\u2014";
  if (n >= 1e6) return `${+(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${+(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}
function budgetCheck(raw, { min = 4096, max } = {}) {
  const value = parseTokens(raw);
  if (value === null) return { ok: true, value: null, text: `\u7559\u7A7A\u5219\u4E0D\u8BBE\u7F6E\uFF1B\u53EF\u4EE5\u5199 200K\u30010.5M \u8FD9\u6837\u7684\u6570\uFF0C\u8303\u56F4 ${min.toLocaleString()}\u2013${compactTokens2(max)}` };
  if (Number.isNaN(value)) return { ok: false, value, text: "\u6CA1\u770B\u61C2\u8FD9\u4E2A\u6570\uFF0C\u53EF\u4EE5\u5199 900K\u30011M\u30010.75M \u6216 786432" };
  if (value < min) return { ok: false, value, text: `\u81F3\u5C11 ${min.toLocaleString()} tokens` };
  if (max && value > max) return { ok: false, value, text: `\u4E0D\u80FD\u8D85\u8FC7\u4E0A\u4E0B\u6587\u7A97\u53E3 ${compactTokens2(max)}\uFF08${max.toLocaleString()} tokens\uFF09` };
  return { ok: true, value, text: `= ${value.toLocaleString()} tokens` };
}

// app/ui/app.js
var $2 = (selector) => document.querySelector(selector);
var esc6 = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var labels = { idle: "\u51C6\u5907\u5C31\u7EEA", starting: "\u6B63\u5728\u8FDE\u63A5", running: "\u8FD0\u884C\u4E2D", waiting: "\u7B49\u5F85\u6388\u6743", completed: "\u5DF2\u5B8C\u6210", failed: "\u8FD0\u884C\u5931\u8D25", interrupted: "\u5DF2\u4E2D\u65AD", paused: "\u5DF2\u6682\u505C" };
var sourceNames = { qoder: "Qoder CN", workbuddy: "WorkBuddy", antigravity: "Antigravity \xB7 Gemini" };
var tiles2 = { dsh: "DS", kimi: "Ki", codex: "Cx", antigravity: "AG", claude: "CC" };
var gatewayOnly = (runtimeId) => runtimeId === "dsh" || runtimeId === "claude";
var hasNativeUi = (runtimeId) => runtimeId !== "claude";
var choiceLabels = { approve: "\u5141\u8BB8\u8FD9\u6B21", "approve-session": "\u672C\u4F1A\u8BDD\u59CB\u7EC8\u5141\u8BB8", reject: "\u62D2\u7EDD", "reject-session": "\u672C\u4F1A\u8BDD\u59CB\u7EC8\u62D2\u7EDD" };
var resolvedLabels = { approve: "\u5DF2\u5141\u8BB8", "approve-session": "\u5DF2\u5141\u8BB8\uFF08\u672C\u4F1A\u8BDD\uFF09", reject: "\u5DF2\u62D2\u7EDD", "reject-session": "\u5DF2\u62D2\u7EDD\uFF08\u672C\u4F1A\u8BDD\uFF09", expired: "\u5DF2\u8FC7\u671F" };
var busyStates = ["running", "starting", "waiting"];
var state = {
  snapshot: null,
  projectId: null,
  sessionId: null,
  events: [],
  draft: "",
  historyLoading: null,
  runtimeId: "dsh",
  modelKey: null,
  reasoning: "",
  contextTokens: null,
  contextBudget: null,
  nativeModel: "",
  tree: /* @__PURE__ */ new Map(),
  expanded: /* @__PURE__ */ new Set(),
  file: null,
  dirty: false,
  git: null,
  diffPath: null,
  diff: "",
  terminalText: "",
  terminalBusy: false,
  settings: null,
  catalogSearch: "",
  catalogSource: "all",
  sessionSearch: "",
  menuSearch: "",
  params: null,
  delivery: "steer",
  rules: null,
  rulesLoading: false,
  rulesError: null,
  rulesEditing: false,
  rulesDraft: null,
  rulesSaving: false
};
var ui = loadUi();
var views = new WorkspaceViews();
var metrics = new SessionMetrics();
var activity = new ActivityTracker();
var stopping = /* @__PURE__ */ new Set();
var nativeCatalog = /* @__PURE__ */ new Map();
var showAll = /* @__PURE__ */ new Set();
var markdownCache = /* @__PURE__ */ new Map();
var blockSource = /* @__PURE__ */ new WeakMap();
var pending = new PendingAttachments();
var capCache = /* @__PURE__ */ new Map();
var capLoading = /* @__PURE__ */ new Set();
var mediaLookup = /* @__PURE__ */ new Map();
var mediaResolving = /* @__PURE__ */ new Set();
var serviceViews = /* @__PURE__ */ new Map();
var serviceView = (id) => {
  if (!serviceViews.has(id)) serviceViews.set(id, {});
  return serviceViews.get(id);
};
var guideOpen = false;
var guideShown = false;
var toastTimer;
var chatTimer;
var refreshTimer;
var tickTimer;
var sessionEpoch = 0;
var fileEpoch = 0;
var rightEpoch = 0;
var reportedDirty = false;
var submitting = false;
var menu = null;
var lastBusy = false;
var dragging = null;
var mediaGen = 0;
var dropDepth = 0;
f.use({ renderer: { image(token) {
  return markerHtml(token.href, token.text);
} } });
f.use(cjkEmphasis);
f.use(mathExtension);
f.use(fileLinks);
function loadUi() {
  const fallback = { left: true, right: true, rightTab: "changes", rightWidth: 400, collapsed: [], runtimeId: null };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem("bridgepp.ui") ?? "{}") };
  } catch {
    return fallback;
  }
}
function saveUi() {
  try {
    localStorage.setItem("bridgepp.ui", JSON.stringify(ui));
  } catch {
  }
}
async function call(method, args = {}) {
  const result = await window.workbench.call(method, args);
  if (!result.ok) {
    const error = new Error(result.error);
    if (result.code) error.code = result.code;
    throw error;
  }
  return result.value;
}
function toast(text3, error = false) {
  clearTimeout(toastTimer);
  const el = $2("#toast");
  el.innerHTML = `${icon(error ? "alert" : "check")}<span>${esc6(text3)}</span>`;
  el.className = `toast${error ? " error" : ""}`;
  toastTimer = setTimeout(() => el.classList.add("hidden"), error ? 7e3 : Math.max(3600, text3.length * 110));
}
async function action(fn) {
  try {
    return await fn();
  } catch (e) {
    toast(e.message, true);
  }
}
function bind(selector, event, fn) {
  const el = $2(selector);
  if (el) el.addEventListener(event, fn);
}
var fragment = (html2) => {
  const t = document.createElement("template");
  t.innerHTML = html2;
  return t.content;
};
function morph(from, to) {
  if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) {
    from.replaceWith(to);
    return to;
  }
  if (from.nodeType !== Node.ELEMENT_NODE) {
    if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue;
    return from;
  }
  const settled = from.classList.contains("settled");
  for (const { name } of [...from.attributes]) if (!to.hasAttribute(name) && name !== "open") from.removeAttribute(name);
  for (const { name, value } of [...to.attributes]) if (from.getAttribute(name) !== value) from.setAttribute(name, value);
  if (settled) from.classList.add("settled");
  const old = [...from.childNodes], next = [...to.childNodes];
  next.forEach((node, i2) => {
    if (i2 < old.length) morph(old[i2], node);
    else from.appendChild(node);
  });
  for (const node of old.slice(next.length)) node.remove();
  return from;
}
function patchHtml(el, html2) {
  const shell = el.cloneNode(false);
  shell.append(fragment(html2));
  morph(el, shell);
}
function patchBlocks(container, blocks, quiet) {
  const current = /* @__PURE__ */ new Map();
  for (const el of [...container.children]) {
    if (el.dataset.key && !current.has(el.dataset.key)) current.set(el.dataset.key, el);
    else el.remove();
  }
  const wanted = new Set(blocks.map(([key]) => key));
  for (const [key, el] of current) if (!wanted.has(key)) {
    el.remove();
    current.delete(key);
  }
  blocks.forEach(([key, html2], index) => {
    let el = current.get(key);
    if (!el) {
      el = fragment(html2).firstElementChild;
      el.dataset.key = key;
      if (quiet) el.classList.add("settled");
    } else if (blockSource.get(el) !== html2) {
      const next = fragment(html2).firstElementChild;
      next.dataset.key = key;
      const kept = morph(el, next);
      if (kept !== el) {
        kept.classList.add("settled");
        el = kept;
      }
    }
    blockSource.set(el, html2);
    const at2 = container.children[index];
    if (at2 !== el) {
      if (el.isConnected) el.classList.add("settled");
      container.insertBefore(el, at2 ?? null);
    }
  });
}
new MutationObserver(() => {
  for (const a3 of document.getAnimations()) if (a3.startTime !== 0 && a3.effect?.getTiming().iterations === Infinity) a3.startTime = 0;
}).observe(document.body, { childList: true, subtree: true });
var models = () => Object.values(state.snapshot?.catalog ?? {}).flatMap((c) => c.models ?? []);
var project = () => state.snapshot?.projects.find((p) => p.id === state.projectId);
var session = () => state.snapshot?.sessions.find((s) => s.id === state.sessionId);
var runtime = (id) => state.snapshot?.runtimes.find((r) => r.id === id);
var currentModel = () => models().find((m) => m.key === state.modelKey);
var modelOf = (selection) => selection?.modelKey && selection.modelKey !== "native" ? models().find((m) => m.key === selection.modelKey) : null;
var busy = (s) => !!s && busyStates.includes(s.status);
var activityOf = (s) => activity.describe(s.id, s.status, { runtime: runtime(s.runtimeId)?.name, stopping: stopping.has(s.id) });
var compact = compactTokens2;
var pct = (n) => n == null ? "\u2014" : `${Math.round(n * 100)}%`;
var clock = (date) => new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(new Date(date));
var pretty = (data) => {
  try {
    return typeof data === "string" ? data : JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};
var clip2 = (text3, max = 2e4) => text3.length > max ? `${text3.slice(0, max)}
\u2026 \u5DF2\u622A\u65AD ${(text3.length - max).toLocaleString()} \u5B57\u7B26` : text3;
var tile2 = (r) => `<span class="rt-tile rt-${esc6(r?.id ?? "none")}">${esc6(tiles2[r?.id] ?? "?")}</span>`;
var effortName = (e) => e === "none" ? "\u5173\u95ED" : e;
function ago2(date) {
  const s = (Date.now() - Date.parse(date)) / 1e3;
  if (!(s >= 0)) return "";
  if (s < 60) return "\u521A\u521A";
  if (s < 3600) return `${Math.floor(s / 60)} \u5206\u949F`;
  if (s < 86400) return `${Math.floor(s / 3600)} \u5C0F\u65F6`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} \u5929`;
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(date));
}
var since = (date) => {
  const text3 = ago2(date);
  return text3 === "\u521A\u521A" || !text3 || text3.includes("/") ? text3 : `${text3}\u524D`;
};
function elapsed(from) {
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(from)) / 1e3));
  return s < 60 ? `${s} \u79D2` : `${Math.floor(s / 60)} \u5206 ${String(s % 60).padStart(2, "0")} \u79D2`;
}
function greeting() {
  const h2 = (/* @__PURE__ */ new Date()).getHours();
  return h2 < 5 ? "\u591C\u6DF1\u4E86" : h2 < 11 ? "\u65E9\u4E0A\u597D" : h2 < 13 ? "\u4E2D\u5348\u597D" : h2 < 18 ? "\u4E0B\u5348\u597D" : "\u665A\u4E0A\u597D";
}
function compatible(runtimeId, model) {
  if (!model) return !gatewayOnly(runtimeId);
  if (!model.enabled || model.tools === false) return false;
  if (model.boundRuntime) return runtimeId === model.boundRuntime;
  return runtimeId === "antigravity" ? model.source === "antigravity" : model.source !== "antigravity";
}
function preferredModel(runtimeId) {
  const list = models().filter((m) => compatible(runtimeId, m));
  return list.find((m) => /deepseek.*flash/i.test(m.name)) ?? list[0];
}
function fallbackModel(runtimeId) {
  const remembered = ui.models?.[runtimeId], usable2 = (key) => {
    const m = models().find((x2) => x2.key === key);
    return !!m && compatible(runtimeId, m);
  };
  if (remembered === "native" && !gatewayOnly(runtimeId)) return "native";
  if (usable2(remembered)) return remembered;
  const paired = Object.entries(state.snapshot?.preferences.modelDefaults ?? {}).find(([key, v2]) => v2?.runtimeId === runtimeId && usable2(key));
  if (paired) return paired[0];
  if (runtimeId === "kimi" || runtimeId === "codex") return "native";
  return preferredModel(runtimeId)?.key ?? (gatewayOnly(runtimeId) ? null : "native");
}
var defaultContext = (model) => model?.contexts.length ? model.contexts.some((c) => c.tokens === model.defaultContextTokens) ? model.defaultContextTokens : model.contexts[0].tokens : null;
function validBudget(model, budget, context) {
  return Number.isSafeInteger(budget) && budget >= 4096 && !!model?.contextMaximum && budget <= model.contextMaximum && !(model.source === "qoder" && context && budget > context);
}
var budgetMax = (model, context) => model?.source === "qoder" && context ? context : model?.contextMaximum ?? null;
function selectModel(key) {
  state.modelKey = key;
  if (key) {
    ui.models = { ...ui.models, [state.runtimeId]: key };
    saveUi();
  }
  const model = currentModel(), saved = state.snapshot?.preferences.modelDefaults ?? {};
  if (key === "native") {
    const defaults2 = saved["native:" + state.runtimeId] ?? (saved.native?.runtimeId === state.runtimeId ? saved.native : null);
    Object.assign(state, { reasoning: defaults2?.reasoning ?? "", contextTokens: null, contextBudget: null, nativeModel: defaults2?.nativeModel ?? "" });
    return;
  }
  const defaults = saved[key];
  state.reasoning = model?.reasoning.includes(defaults?.reasoning) ? defaults.reasoning : "";
  state.contextTokens = model?.contexts.some((c) => c.tokens === defaults?.contextTokens) ? defaults.contextTokens : defaultContext(model);
  state.contextBudget = validBudget(model, defaults?.contextBudget, state.contextTokens) ? defaults.contextBudget : null;
  state.nativeModel = model?.boundRuntime ? model.id : "";
}
function selectRuntime(runtimeId) {
  if (!usable(runtime(runtimeId))) {
    toast(unusableReason(runtime(runtimeId)) || "\u8FD9\u4E2A\u8FD0\u884C\u73AF\u5883\u6682\u65F6\u4E0D\u80FD\u4F7F\u7528", true);
    return false;
  }
  state.runtimeId = runtimeId;
  ui.runtimeId = runtimeId;
  saveUi();
  const current = state.modelKey;
  if (current === "native" && !gatewayOnly(runtimeId) && (ui.models?.[runtimeId] ?? (runtimeId === "antigravity" ? null : "native")) === "native") {
    selectModel("native");
    return true;
  }
  if (current && current !== "native" && compatible(runtimeId, currentModel())) {
    ui.models = { ...ui.models, [runtimeId]: current };
    saveUi();
    return true;
  }
  const key = fallbackModel(runtimeId);
  if (key) selectModel(key);
  else state.modelKey = null;
  return true;
}
function modelLabel(selection, model) {
  if (!selection?.modelKey) return '<span class="ml-name">\u9009\u62E9\u6A21\u578B</span>';
  if (selection.modelKey === "native") return `<span class="ml-name">\u539F\u751F\u6A21\u578B</span><span class="ml-meta">${esc6(selection.nativeModel || "\u5F53\u524D\u9ED8\u8BA4")}${selection.reasoning ? ` \xB7 ${esc6(effortName(selection.reasoning))}` : ""}</span>`;
  if (!model) return `<span class="ml-name">${esc6(selection.modelKey.split(":").slice(1).join(":"))}</span><span class="ml-meta">\u76EE\u5F55\u4E2D\u4E0D\u53EF\u7528</span>`;
  const parts = [];
  if (model.source !== "antigravity") {
    parts.push(selection.reasoning ? effortName(selection.reasoning) : "\u9ED8\u8BA4\u601D\u8003");
    const ctx = selection.contextTokens ?? null;
    if (ctx) parts.push(compact(ctx));
    if (selection.contextBudget) parts.push(`\u9884\u7B97 ${compact(selection.contextBudget)}`);
  } else parts.push("\u539F\u751F\u6267\u884C");
  return `<span class="ml-name">${esc6(sourceName(model))}</span><span class="ml-meta">${esc6(parts.join(" \xB7 "))}</span>`;
}
function modelTitle(selection, model, locked) {
  const lead = locked ? "\u67E5\u770B\u6216\u8C03\u6574\u6B64\u4F1A\u8BDD\u7684\u53C2\u6570" : "\u9009\u62E9\u6A21\u578B\u3001\u601D\u8003\u5F3A\u5EA6\u4E0E\u4E0A\u4E0B\u6587\u7A97\u53E3";
  if (!model || selection?.modelKey === "native") return lead;
  const rows = [`${sourceNames[model.source]} \xB7 ${model.name}\uFF08${model.id}\uFF09`, `\u601D\u8003\u5F3A\u5EA6\uFF1A${selection.reasoning ? effortName(selection.reasoning) : "\u9ED8\u8BA4"}`];
  if (selection.contextTokens) rows.push(`\u4E0A\u4E0B\u6587\u7A97\u53E3\uFF1A${compact(selection.contextTokens)}\uFF08${selection.contextTokens.toLocaleString()} tokens\uFF09`);
  rows.push(`\u672C\u5730\u538B\u7F29\u9884\u7B97\uFF1A${selection.contextBudget ? `${compact(selection.contextBudget)}\uFF08${selection.contextBudget.toLocaleString()} tokens\uFF09` : "\u4E0D\u8BBE\u7F6E"}`);
  return `${rows.join("\n")}
${lead}`;
}
var composerSelection = () => ({ modelKey: state.modelKey, identity: state.modelKey === "native" ? void 0 : currentModel()?.identity, reasoning: state.reasoning, contextTokens: state.contextTokens, contextBudget: state.contextBudget, nativeModel: state.nativeModel });
function reportDirty() {
  const dirty = views.anyDirty(state);
  if (dirty !== reportedDirty) {
    reportedDirty = dirty;
    void call("editor:dirty", { dirty }).catch(() => {
    });
  }
}
var stashDraft = () => views.saveDraft(state);
function activateProject(id) {
  if (state.projectId !== id) {
    fileEpoch++;
    state.diffPath = null;
    state.diff = "";
  }
  views.activate(state, id);
  reportDirty();
}
function applyTheme() {
  const pref = state.snapshot?.preferences.theme ?? "dark";
  const dark = pref === "system" ? matchMedia("(prefers-color-scheme: dark)").matches : pref !== "light";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
function applyLayout() {
  const app = $2("#app");
  app.classList.toggle("left-collapsed", !ui.left);
  app.classList.toggle("right-collapsed", !ui.right);
  const room = innerWidth - (ui.left ? 272 : 0) - 520;
  app.style.setProperty("--right-w", `${Math.max(300, Math.min(ui.rightWidth, room))}px`);
}
async function snapshot() {
  state.snapshot = await call("snapshot");
  if (!state.projectId || !project()) activateProject(state.snapshot.projects[0]?.id ?? null);
  if (state.sessionId && !session()) {
    state.sessionId = null;
    state.events = [];
    metrics.clear();
  }
  if (!state.modelKey) {
    const remembered = runtime(ui.runtimeId);
    state.runtimeId = usable(remembered) ? remembered.id : state.snapshot.runtimes.find(usable)?.id ?? "dsh";
    const key = fallbackModel(state.runtimeId);
    if (key) selectModel(key);
  } else if (!session() && !usable(runtime(state.runtimeId))) {
    const next = state.snapshot.runtimes.find(usable);
    if (next) selectRuntime(next.id);
  }
  applyTheme();
}
function renderSidebarFrame() {
  $2("#sidebar").innerHTML = `<div class="sidebar-top"><div class="brand">${logo(22)}<span>Bridge<b>++</b></span></div><button class="icon-btn" id="collapse-left" title="\u6536\u8D77\u4FA7\u680F (Ctrl+B)">${icon("panelLeft")}</button></div>
    <button class="new-session" id="new-session"><span class="ns-icon">${icon("plus")}</span><span>\u65B0\u5EFA\u4F1A\u8BDD</span><kbd>Ctrl N</kbd></button>
    <label class="sidebar-search">${icon("search")}<input id="session-search" placeholder="\u641C\u7D22\u4F1A\u8BDD" autocomplete="off" spellcheck="false"></label>
    <div class="section-head"><span>\u5DE5\u4F5C\u6587\u4EF6\u5939</span><button class="icon-btn sm" id="add-project" title="\u6253\u5F00\u6587\u4EF6\u5939">${icon("folderPlus")}</button></div>
    <nav id="folders" class="folders"></nav>
    <div id="update-slot" class="update-slot"></div>
    <div class="sidebar-bottom"><button class="settings-entry" id="open-settings" title="\u8BBE\u7F6E (Ctrl+,)">${icon("settings")}<span>\u8BBE\u7F6E</span></button><span class="version" id="app-version"></span></div>`;
  bind("#session-search", "input", (e) => {
    state.sessionSearch = e.target.value;
    renderFolders();
  });
}
function sessionRow(s) {
  return `<button class="session-row${s.id === state.sessionId ? " active" : ""}" data-session="${s.id}" title="${esc6(s.title)}${s.lastFailure?.message ? `
\u4E0A\u4E00\u8F6E\u4E2D\u65AD\uFF1A${esc6(s.lastFailure.message)}` : ""}">
    <span class="dot ${esc6(s.status)}"></span><span class="session-title">${esc6(s.title)}</span>
    <span class="session-meta">${esc6(runtime(s.runtimeId)?.short ?? s.runtimeId)} \xB7 ${busy(s) ? `<span class="session-activity" data-activity="${s.id}">${esc6(activityOf(s).short)}</span>` : ago2(s.updatedAt)}</span>
    <span class="row-action" data-archive="${s.id}" title="\u5F52\u6863">${icon("archive")}</span></button>`;
}
function renderFolders() {
  const snap = state.snapshot, query = state.sessionSearch.trim().toLowerCase(), el = $2("#folders");
  if (!snap || !el) return;
  $2("#app-version").textContent = `v${snap.app.version}`;
  renderUpdateSlot();
  if (!snap.projects.length) {
    el.innerHTML = `<div class="folders-empty">${icon("folder")}<p>\u6253\u5F00\u4E00\u4E2A\u672C\u673A\u6587\u4EF6\u5939\uFF0C\u4F1A\u8BDD\u4F1A\u6309\u6587\u4EF6\u5939\u6574\u7406\u5728\u8FD9\u91CC\u3002</p><button class="btn sm" id="empty-add-project">${icon("folderPlus")}\u6253\u5F00\u6587\u4EF6\u5939</button></div>`;
    return;
  }
  el.innerHTML = snap.projects.map((p) => {
    const rows = snap.sessions.filter((s) => !s.archived && s.projectId === p.id && (!query || s.title.toLowerCase().includes(query))).sort((a3, b) => Date.parse(b.updatedAt) - Date.parse(a3.updatedAt));
    if (query && !rows.length) return "";
    const collapsed = !query && ui.collapsed.includes(p.id), live = rows.filter(busy).length, limit = showAll.has(p.id) || query ? rows.length : 12;
    return `<div class="folder${collapsed ? " collapsed" : ""}${p.id === state.projectId ? " current" : ""}">
      <div class="folder-head" data-folder="${p.id}" title="${esc6(p.path)}">${icon("chevronDown", "chev")}${icon("folder", "folder-icon")}<span class="folder-name">${esc6(p.name)}</span>${live ? `<span class="live-count" title="${live} \u4E2A\u4F1A\u8BDD\u6B63\u5728\u8FD0\u884C">${live}</span>` : ""}
        <span class="folder-actions"><button class="icon-btn xs" data-new-in="${p.id}" title="\u5728\u6B64\u6587\u4EF6\u5939\u65B0\u5EFA\u4F1A\u8BDD">${icon("plus")}</button><button class="icon-btn xs" data-reveal="${p.id}" title="\u5728\u8D44\u6E90\u7BA1\u7406\u5668\u4E2D\u6253\u5F00">${icon("external")}</button></span></div>
      <div class="folder-sessions">${rows.length ? rows.slice(0, limit).map(sessionRow).join("") + (rows.length > limit ? `<button class="show-more" data-show-all="${p.id}">\u663E\u793A\u5168\u90E8 ${rows.length} \u4E2A\u4F1A\u8BDD</button>` : "") : '<div class="folder-empty">\u8FD8\u6CA1\u6709\u4F1A\u8BDD</div>'}</div></div>`;
  }).join("") || '<div class="folders-empty"><p>\u6CA1\u6709\u5339\u914D\u7684\u4F1A\u8BDD</p></div>';
}
function renderTopbar() {
  const s = session(), p = project();
  const left = ui.left ? "" : `<button class="icon-btn" id="toggle-left" title="\u5C55\u5F00\u4FA7\u680F (Ctrl+B)">${icon("panelLeft")}</button><span class="topbar-brand">${logo(18)}</span>`;
  const crumb = p ? `<span class="crumb" title="${esc6(p.path)}">${icon("folder")}${esc6(p.name)}</span>` : "";
  const title = s ? `<span class="crumb-sep">/</span><button class="title-btn" id="rename-session" title="\u91CD\u547D\u540D\u4F1A\u8BDD">${esc6(s.title)}</button>` : p ? '<span class="crumb-sep">/</span><span class="title-muted">\u65B0\u4F1A\u8BDD</span>' : '<span class="title-muted">Bridge++</span>';
  const actions = s ? `${hasNativeUi(s.runtimeId) ? `<button class="ghost-btn" id="native-session" title="\u5728\u539F\u751F\u5B8C\u6574\u754C\u9762\u4E2D\u7EE7\u7EED">${icon("external")}<span>\u539F\u751F\u754C\u9762</span></button>` : ""}<button class="icon-btn" id="session-more" title="\u66F4\u591A">${icon("more")}</button>` : "";
  const right = ui.right ? "" : `<button class="icon-btn" id="toggle-right" title="\u5C55\u5F00\u53F3\u4FA7\u9762\u677F (Ctrl+Alt+B)">${icon("panelRight")}</button>`;
  $2("#topbar").innerHTML = `<div class="topbar-left">${left}${crumb}${title}</div><div class="topbar-right">${actions}${right}</div>`;
}
function renderView() {
  const s = session(), view = $2("#view");
  if (s) {
    view.className = "view chat-view";
    view.innerHTML = '<div class="scroller" id="scroller"><div class="transcript" id="chat"></div></div><div class="composer-dock"><div class="composer-slot"></div></div>';
  } else {
    view.className = "view welcome-view";
    const hasProjects = !!state.snapshot.projects.length;
    view.innerHTML = `<div class="welcome"><div class="welcome-mark">${logo(40)}</div><h1>${greeting()}\uFF0C\u4ECA\u5929\u60F3\u6784\u5EFA\u4EC0\u4E48\uFF1F</h1><div class="composer-slot"></div>
      <div class="welcome-hints">${hasProjects ? "" : `<button class="hint-chip primary" data-quick="project">${icon("folderPlus")}\u6253\u5F00\u6587\u4EF6\u5939</button>`}<button class="hint-chip" data-quick="sources">${icon("layers")}\u6A21\u578B\u6E90</button><button class="hint-chip" data-quick="runtimes">${icon("cpu")}\u8FD0\u884C\u73AF\u5883</button>${hasProjects ? `<button class="hint-chip" data-quick="project">${icon("folderPlus")}\u6253\u5F00\u5176\u4ED6\u6587\u4EF6\u5939</button>` : ""}</div></div>`;
  }
  mountComposer();
  if (s) renderChat(true);
}
function autosize(el) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, Math.round(innerHeight * 0.4))}px`;
}
function mountComposer() {
  const slot = $2(".composer-slot");
  if (!slot) return;
  slot.innerHTML = `<div class="composer${session() ? "" : " centered"}"><div id="composer-banner"></div><div class="queue-strip" id="queue-strip" hidden></div><div class="composer-box"><div class="attach-tray" id="attach-tray" hidden></div><textarea id="prompt" rows="1" aria-label="\u4EFB\u52A1" spellcheck="false"></textarea><div class="composer-row" id="composer-controls"></div><div class="drop-hint" id="drop-hint" hidden></div></div><div class="composer-footer" id="composer-footer"></div></div>`;
  const prompt = $2("#prompt");
  prompt.value = state.draft;
  prompt.addEventListener("input", (e) => {
    state.draft = e.target.value;
    stashDraft();
    autosize(e.target);
    syncDraftMark();
  });
  prompt.addEventListener("compositionstart", (e) => {
    e.target.dataset.composing = "true";
  });
  prompt.addEventListener("compositionend", (e) => {
    e.target.dataset.composing = "false";
    state.draft = e.target.value;
    stashDraft();
  });
  prompt.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      void submit();
    }
  });
  prompt.addEventListener("paste", (e) => {
    const files = [...e.clipboardData?.files ?? []];
    if (!files.length) return;
    e.preventDefault();
    const text3 = e.clipboardData.getData("text/plain");
    if (text3) {
      prompt.setRangeText(text3, prompt.selectionStart, prompt.selectionEnd, "end");
      prompt.dispatchEvent(new Event("input"));
    }
    void addFiles(files);
  });
  renderComposerControls();
  renderBanner();
  renderFooter();
  renderTray();
  requestAnimationFrame(() => autosize(prompt));
}
function syncDraftMark() {
  const box = $2(".composer-box");
  if (box) box.classList.toggle("has-draft", !!state.draft.trim() || pending.list(attachKey()).some((x2) => x2.status !== "error"));
}
function deliveryFor(s) {
  return s?.interject?.steer === true && state.delivery !== "queue" ? "steer" : "queue";
}
function sendTitle(s) {
  if (!busy(s)) return "\u53D1\u9001 (Enter)";
  return deliveryFor(s) === "steer" ? "\u63D2\u8BDD (Enter)\uFF1A\u6A21\u578B\u4E0B\u4E00\u6B65\u5C31\u80FD\u770B\u5230" : `\u6392\u961F (Enter)\uFF1A\u672C\u8F6E\u7ED3\u675F\u540E\u81EA\u52A8\u53D1\u9001${s?.interject?.steer === false && s.interject.reason ? `\u3002${s.interject.reason}` : ""}`;
}
function renderQueue() {
  const el = $2("#queue-strip"), s = session();
  if (!el) return;
  const items = s?.queue ?? [];
  el.hidden = !items.length;
  if (!items.length) {
    el.innerHTML = "";
    return;
  }
  const running2 = busy(s);
  const held = new Set(s.queueDispatch?.ids ?? []), onHold = items.some((q2) => held.has(q2.id));
  const head = running2 ? `\u6392\u961F ${items.length} \u6761 \xB7 \u672C\u8F6E\u7ED3\u675F\u540E\u81EA\u52A8\u53D1\u9001` : onHold ? "\u4E0A\u6B21\u53D1\u9001\u540E\u6CA1\u6536\u5230\u539F\u751F\u786E\u8BA4\uFF0C\u6D88\u606F\u5148\u4FDD\u7559\uFF0C\u4E0D\u4F1A\u81EA\u52A8\u91CD\u53D1" : `\u6709 ${items.length} \u6761\u6392\u961F\u6D88\u606F\u6CA1\u6709\u53D1\u51FA\uFF08\u4E0A\u4E00\u8F6E\u6CA1\u6709\u6B63\u5E38\u7ED3\u675F\uFF09`;
  const actions = (q2) => held.has(q2.id) ? `<span class="queue-held" title="\u8BF7\u5728\u539F\u751F\u754C\u9762\u786E\u8BA4\u8FD9\u6761\u6D88\u606F\u662F\u5426\u5DF2\u7ECF\u53D1\u51FA\uFF0C\u518D\u51B3\u5B9A\u662F\u5426\u91CD\u53D1">\u5F85\u6838\u5BF9</span>` : `<button class="icon-btn xs" data-queue-edit="${esc6(q2.id)}" title="\u53D6\u56DE\u5230\u8F93\u5165\u6846\u4FEE\u6539">${icon("edit")}</button><button class="icon-btn xs" data-queue-remove="${esc6(q2.id)}" title="\u5220\u9664\u8FD9\u6761">${icon("close")}</button>`;
  patchHtml(el, `<div class="queue-head">${icon(onHold && !running2 ? "alert" : "clock")}<span>${esc6(head)}</span>${running2 || onHold ? "" : `<button class="btn sm primary" data-queue-send="all">${icon("arrowUp")}\u73B0\u5728\u53D1\u9001</button>`}</div>${items.map((q2) => `<div class="queue-item"><span class="queue-text" title="${esc6(q2.text)}">${esc6(q2.text || `${q2.attachments?.length ?? 0} \u4E2A\u9644\u4EF6`)}</span>${q2.attachments?.length ? `<span class="queue-att" title="${esc6(q2.attachments.map((a3) => a3.name).join("\u3001"))}">${icon("paperclip")}${q2.attachments.length}</span>` : ""}${actions(q2)}</div>`).join("")}`);
}
async function dequeue(s, queueId) {
  const item = await call("session:dequeue", { sessionId: s.id, queueId });
  await snapshot();
  renderQueue();
  return item ?? { text: "", attachments: [] };
}
async function editQueued(queueId) {
  const s = session();
  if (!s) return;
  const item = await dequeue(s, queueId), key = attachKey();
  if (item.text) state.draft = state.draft.trim() ? `${state.draft.replace(/\s+$/, "")}
${item.text}` : item.text;
  for (const a3 of item.attachments ?? []) pending.add(key, { status: "ready", name: a3.name, kind: a3.kind, size: a3.size, attachment: a3 });
  stashDraft();
  const prompt = $2("#prompt");
  if (prompt) {
    prompt.value = state.draft;
    autosize(prompt);
    prompt.focus();
  }
  renderTray();
  syncDraftMark();
}
async function removeQueued(queueId) {
  const s = session();
  if (!s) return;
  const item = await dequeue(s, queueId);
  for (const a3 of item.attachments ?? []) void call("attachment:discard", { id: a3.id }).catch(() => {
  });
  toast("\u5DF2\u5220\u9664\u8FD9\u6761\u6392\u961F\u6D88\u606F");
}
async function sendQueuedNow() {
  const s = session();
  if (!s?.queue?.length) return;
  const items = [];
  for (const q2 of [...s.queue]) items.push(await dequeue(s, q2.id));
  const text3 = items.map((x2) => x2.text).filter(Boolean).join("\n\n"), attachments = items.flatMap((x2) => x2.attachments ?? []);
  const now = session(), delivery = busy(now) ? "queue" : void 0;
  try {
    await call("session:prompt", { sessionId: s.id, text: text3, ...attachments.length ? { attachments: attachments.map((a3) => a3.id) } : {}, ...delivery ? { delivery } : {} });
  } catch (error) {
    const key = attachKey();
    state.draft = [state.draft.trim(), text3].filter(Boolean).join("\n");
    for (const a3 of attachments) pending.add(key, { status: "ready", name: a3.name, kind: a3.kind, size: a3.size, attachment: a3 });
    const prompt = $2("#prompt");
    if (prompt) {
      prompt.value = state.draft;
      autosize(prompt);
    }
    renderTray();
    syncDraftMark();
    throw error;
  }
  await snapshot();
  renderComposerControls();
  renderFooter();
}
var attachKey = () => views.draftKey(state);
function attachCaps() {
  const s = session();
  if (s && s.attachments !== void 0) return s.attachments;
  const runtimeId = s ? s.runtimeId : state.runtimeId, selection = s ? s.selection : composerSelection();
  if (!runtimeId || !selection?.modelKey) return Object.fromEntries(KINDS.map((k) => [k, { allowed: false, reason: "\u8BF7\u5148\u9009\u62E9\u6A21\u578B" }]));
  const key = capabilityKey(runtimeId, selection);
  if (capCache.has(key)) return capCache.get(key);
  if (!capLoading.has(key)) {
    capLoading.add(key);
    call("attachment:capabilities", { runtimeId, selection }).catch(() => null).then((caps) => {
      capLoading.delete(key);
      capCache.set(key, caps ?? null);
      renderComposerControls();
    });
  }
  return void 0;
}
function attachButtonHtml() {
  if (!project()) return "";
  const caps = attachCaps(), kinds = allowedKinds(caps);
  if (caps === null) return "";
  const tip = kinds.length ? `\u6DFB\u52A0${kinds.map(kindName).join("\u3001")}\uFF08\u4E5F\u53EF\u4EE5\u62D6\u8FDB\u6765\u6216\u7C98\u8D34\uFF09` : refusal(caps);
  return `<button class="chip-btn attach-btn${kinds.length ? "" : " unavailable"}" id="attach-btn" title="${esc6(tip)}" aria-label="${esc6(tip)}">${icon("paperclip")}</button>`;
}
function renderTray() {
  const el = $2("#attach-tray");
  if (!el) return;
  const items = pending.list(attachKey());
  el.hidden = !items.length;
  patchHtml(el, trayHtml(items));
  syncDraftMark();
}
async function addFiles(files) {
  if (!project()) {
    toast("\u8BF7\u5148\u6253\u5F00\u4E00\u4E2A\u5DE5\u4F5C\u6587\u4EF6\u5939", true);
    return;
  }
  const caps = attachCaps(), key = attachKey(), projectId = state.projectId;
  if (!caps) {
    toast(refusal(caps), true);
    return;
  }
  const refused = [], jobs = [], allowed = allowedKinds(caps), turn = caps.turn ?? {};
  const queued = pending.list(key).filter((x2) => x2.status !== "error");
  let count2 = queued.length, total = queued.reduce((n, x2) => n + (x2.attachment?.size ?? x2.size ?? 0), 0);
  for (const file of files) {
    const kind = kindOf(file.name, caps), rule = kind ? caps[kind] : null;
    if (!kind) refused.push(`${file.name}\uFF1A\u4E0D\u652F\u6301\u8FD9\u79CD\u683C\u5F0F${allowed.length ? `\uFF08\u53EF\u4EE5\u6DFB\u52A0 ${formatsText(caps, allowed)}\uFF09` : ""}`);
    else if (!rule?.allowed) refused.push(`${file.name}\uFF1A${refusal(caps, kind)}`);
    else if (rule.maxBytes && file.size > rule.maxBytes) refused.push(`${file.name}\uFF1A\u8D85\u8FC7\u5355\u4E2A${kindName(kind)}\u4E0A\u9650 ${fileSize(rule.maxBytes)}`);
    else if (turn.maxCount && count2 + 1 > turn.maxCount) refused.push(`${file.name}\uFF1A\u6BCF\u6B21\u6700\u591A\u53D1\u9001 ${turn.maxCount} \u4E2A\u9644\u4EF6`);
    else if (turn.maxTotalBytes && total + file.size > turn.maxTotalBytes) refused.push(`${file.name}\uFF1A\u8FD9\u4E00\u6B21\u7684\u9644\u4EF6\u5408\u8BA1\u4F1A\u8D85\u8FC7 ${fileSize(turn.maxTotalBytes)}`);
    else {
      count2++;
      total += file.size;
      jobs.push(stageFile(key, projectId, pending.add(key, { status: "staging", name: file.name, kind, size: file.size }), file));
    }
  }
  if (refused.length) toast(refused.length > 1 ? `${refused.length} \u4E2A\u6587\u4EF6\u6CA1\u6709\u6DFB\u52A0\uFF1A${refused.join("\uFF1B")}` : refused[0], true);
  renderTray();
  await Promise.all(jobs);
}
async function stageFile(key, projectId, item, file) {
  let attachment = null, error = null;
  try {
    attachment = await call("attachment:stage", { projectId, name: file.name, data: new Uint8Array(await file.arrayBuffer()) });
  } catch (e) {
    error = e.message;
  }
  if (!pending.list(key).some((x2) => x2.localId === item.localId)) {
    if (attachment) void call("attachment:discard", { id: attachment.id }).catch(() => {
    });
    return;
  }
  pending.update(key, item.localId, attachment ? { status: "ready", attachment } : { status: "error", error });
  if (attachKey() === key) renderTray();
}
async function pickFiles() {
  const caps = attachCaps(), kinds = allowedKinds(caps);
  if (!kinds.length) {
    toast(refusal(caps), true);
    return;
  }
  const key = attachKey(), turn = caps.turn ?? {};
  const picked = await call("attachment:pick", { projectId: state.projectId, kinds });
  const queued = pending.list(key).filter((x2) => x2.status !== "error"), refused = [];
  let count2 = queued.length, total = queued.reduce((n, x2) => n + (x2.attachment?.size ?? x2.size ?? 0), 0);
  for (const attachment of picked ?? []) {
    const over = turn.maxCount && count2 + 1 > turn.maxCount ? `\u6BCF\u6B21\u6700\u591A\u53D1\u9001 ${turn.maxCount} \u4E2A\u9644\u4EF6` : turn.maxTotalBytes && total + attachment.size > turn.maxTotalBytes ? `\u8FD9\u4E00\u6B21\u7684\u9644\u4EF6\u5408\u8BA1\u4F1A\u8D85\u8FC7 ${fileSize(turn.maxTotalBytes)}` : null;
    if (over) {
      refused.push(`${attachment.name}\uFF1A${over}`);
      void call("attachment:discard", { id: attachment.id }).catch(() => {
      });
      continue;
    }
    count2++;
    total += attachment.size;
    pending.add(key, { status: "ready", name: attachment.name, kind: attachment.kind, size: attachment.size, attachment });
  }
  if (refused.length) toast(refused.length > 1 ? `${refused.length} \u4E2A\u6587\u4EF6\u6CA1\u6709\u6DFB\u52A0\uFF1A${refused.join("\uFF1B")}` : refused[0], true);
  renderTray();
  $2("#prompt")?.focus();
}
var discardedAttachments = /* @__PURE__ */ new Set();
function markDiscarded(ids) {
  for (const id of ids) discardedAttachments.add(id);
  let changed = false;
  for (const [key, list] of pending.byDraft) for (const item of list)
    if (item.status !== "error" && discardedAttachments.has(item.attachment?.id)) {
      pending.update(key, item.localId, { status: "error", error: "\u53D1\u9001\u5931\u8D25\uFF0C\u9644\u4EF6\u5DF2\u6E05\u7406\uFF0C\u8BF7\u79FB\u9664\u540E\u91CD\u65B0\u6DFB\u52A0" });
      changed = true;
    }
  if (changed) renderTray();
}
function removeAttachment(localId) {
  const item = pending.remove(attachKey(), localId);
  if (item?.attachment?.id) void call("attachment:discard", { id: item.attachment.id }).catch(() => {
  });
  renderTray();
}
var carriesFiles = (e) => [...e.dataTransfer?.types ?? []].includes("Files");
function showDropHint(on) {
  const hint = $2("#drop-hint"), box = $2(".composer-box");
  if (!hint || !box) return;
  box.classList.toggle("dropping", on);
  if (!on) {
    hint.hidden = true;
    return;
  }
  const caps = attachCaps(), kinds = allowedKinds(caps);
  hint.className = `drop-hint${kinds.length ? "" : " refused"}`;
  hint.innerHTML = kinds.length ? `${icon("paperclip")}<span>\u677E\u5F00\u5373\u53EF\u6DFB\u52A0${esc6(kinds.map(kindName).join("\u3001"))}</span>` : `${icon("alert")}<span>${esc6(refusal(caps))}</span>`;
  hint.hidden = false;
}
function renderComposerControls() {
  const el = $2("#composer-controls"), prompt = $2("#prompt");
  if (!el) return;
  const s = session(), p = project(), running2 = busy(s), env = runtime(s ? s.runtimeId : state.runtimeId);
  const steer = running2 && deliveryFor(s) === "steer";
  prompt.placeholder = !p ? "\u5148\u6253\u5F00\u4E00\u4E2A\u5DE5\u4F5C\u6587\u4EF6\u5939\uFF0C\u518D\u5F00\u59CB\u2026" : s ? running2 ? steer ? "\u8865\u5145\u6216\u7EA0\u6B63\u8981\u6C42\uFF0CEnter \u63D2\u8BDD\uFF0C\u6A21\u578B\u4E0B\u4E00\u6B65\u5C31\u80FD\u770B\u5230\u2026" : "Enter \u6392\u961F\uFF0C\u672C\u8F6E\u7ED3\u675F\u540E\u81EA\u52A8\u53D1\u9001\u2026" : "\u7EE7\u7EED\u8FD9\u4E2A\u4EFB\u52A1\u2026" : "\u63CF\u8FF0\u8981\u5B8C\u6210\u7684\u4EFB\u52A1\uFF0CAgent \u4F1A\u5728\u6240\u9009\u6587\u4EF6\u5939\u4E2D\u5DE5\u4F5C\u2026";
  const selection = s ? s.selection : composerSelection(), model = s ? modelOf(s.selection) : currentModel();
  const folder = s ? "" : `<button class="chip-btn" id="folder-chip" data-value="${esc6(p?.id ?? "")}" title="${esc6(p?.path ?? "\u9009\u62E9\u5DE5\u4F5C\u6587\u4EF6\u5939")}">${icon("folder")}<span class="chip-text">${esc6(p?.name ?? "\u9009\u62E9\u6587\u4EF6\u5939")}</span>${icon("chevronDown", "caret")}</button>`;
  const envOk = !!s || usable(env);
  const envChip = `<button class="chip-btn${s ? " locked" : ""}${envOk ? "" : " unavailable"}" id="env-chip" data-value="${esc6(env?.id ?? "")}" title="${s ? "\u4F1A\u8BDD\u521B\u5EFA\u540E\u4E0D\u80FD\u66F4\u6362\u8FD0\u884C\u73AF\u5883" : envOk ? "\u5148\u9009\u62E9\u8FD0\u884C\u73AF\u5883" : esc6(unusableReason(env))}">${tile2(env)}<span class="chip-text">${esc6(env?.name ?? "\u9009\u62E9\u73AF\u5883")}</span>${icon(s ? "lock" : "chevronDown", "caret")}</button>`;
  const chipTitle = modelTitle(selection, model, !!s) + (s?.selectionNext ? `
\u5DF2\u6392\u961F\uFF08\u672C\u8F6E\u7ED3\u675F\u540E\u5E94\u7528\uFF09\uFF1A${paramsText(s.selectionNext)}` : "");
  const modelChip = `<button class="chip-btn model-chip${s?.selectionNext ? " has-queued" : ""}" id="model-chip" data-value="${esc6(selection.modelKey ?? "")}" title="${esc6(chipTitle)}">${icon("layers")}<span class="chip-text">${modelLabel(selection, model)}</span>${s?.selectionNext ? `<span class="queued-dot" aria-label="\u53C2\u6570\u4FEE\u6539\u5DF2\u6392\u961F"></span>` : ""}${icon("chevronDown", "caret")}</button>`;
  const permChip = permissionChipHtml(s, env);
  const waiting = !running2 && !!env?.checking;
  const choice = running2 && s.interject?.steer === true ? `<div class="delivery-seg" role="radiogroup" aria-label="\u8FD0\u884C\u4E2D\u53D1\u9001\u65B9\u5F0F"><button role="radio" aria-checked="${steer}" class="${steer ? "on" : ""}" data-delivery="steer" title="\u63D2\u8FDB\u6B63\u5728\u8FD0\u884C\u7684\u8FD9\u4E00\u8F6E\uFF0C\u6A21\u578B\u4E0B\u4E00\u6B65\u5C31\u80FD\u770B\u5230">\u63D2\u8BDD</button><button role="radio" aria-checked="${!steer}" class="${steer ? "" : "on"}" data-delivery="queue" title="\u7B49\u8FD9\u4E00\u8F6E\u7ED3\u675F\u540E\u518D\u53D1\u9001">\u6392\u961F</button></div>` : "";
  const actions = running2 ? `<div class="run-actions">${choice}<button class="send stop" id="stop-run" title="\u505C\u6B62\u672C\u8F6E" aria-label="\u505C\u6B62\u672C\u8F6E">${icon("stop")}</button><button class="send run-send" id="send" title="${esc6(sendTitle(s))}" aria-label="${steer ? "\u63D2\u8BDD" : "\u6392\u961F"}">${icon("arrowUp")}</button></div>` : `<button class="send" id="send" title="${waiting ? "\u6B63\u5728\u68C0\u6D4B\u8FD0\u884C\u73AF\u5883\uFF0C\u7A0D\u7B49\u51E0\u79D2" : "\u53D1\u9001 (Enter)"}" aria-label="\u53D1\u9001" ${p && envOk && !waiting ? "" : "disabled"}>${icon("arrowUp")}</button>`;
  el.innerHTML = `<div class="composer-left">${attachButtonHtml()}${folder}${envChip}<span class="chip-sep">${icon("chevronRight")}</span>${modelChip}${permChip}</div>${actions}`;
  $2(".composer-box")?.classList.toggle("running", running2);
  syncDraftMark();
  renderQueue();
  if (menu && !$2("#popover").classList.contains("hidden")) placeMenu();
}
var permissionIcons = { ask: "shield", "auto-review": "shieldCheck", auto: "zap", readonly: "lock" };
var permissionScopes = { "exec-json": "\u539F\u751F\u6A21\u578B", "app-server": "\u7B2C\u4E09\u65B9\u6A21\u578B" };
function permissionsFor(s, env) {
  if (s) return s.permissions ?? env?.permissions ?? null;
  const p = env?.permissions;
  if (!p?.bySelection) return p ?? null;
  return (state.modelKey === "native" ? p.bySelection.native : p.bySelection.gateway) ?? p;
}
function permissionScope(p, s, env) {
  const named = permissionScopes[p.protocol] ?? (env?.id === "codex" ? (s ? s.selection?.modelKey : state.modelKey) === "native" ? "\u539F\u751F\u6A21\u578B" : "\u7B2C\u4E09\u65B9\u6A21\u578B" : null);
  return named ? ` \xB7 ${named}` : "";
}
function permissionChoices(p) {
  if (!p) return [];
  if (p.default != null) return [...p.modes ?? []];
  const args = p.defaultNative?.args?.length ? p.defaultNative.args.join(" ") : null;
  const description = args ? "Bridge++ \u7684\u5B89\u5168\u9ED8\u8BA4\uFF1A\u53EF\u4EE5\u7F16\u8F91\u5DE5\u4F5C\u533A\u6587\u4EF6\uFF0C\u547D\u4EE4\u4ECD\u7531\u539F\u751F\u6743\u9650\u51B3\u5B9A\uFF08" + args + "\uFF09\u3002" : "\u6CBF\u7528\u539F\u751F\u7A0B\u5E8F\u81EA\u5DF1\u7684\u8BBE\u7F6E\uFF0CBridge++ \u4E0D\u989D\u5916\u4F20\u6388\u6743\u53C2\u6570\u3002";
  return [{ id: null, label: "\u9ED8\u8BA4", description }, ...p.modes ?? []];
}
function permissionLabel(p, mode) {
  if (mode == null) return "\u9ED8\u8BA4";
  return p?.modes?.find((m) => m.id === mode)?.label ?? mode;
}
function sessionPermission(s) {
  const next = s && Object.hasOwn(s, "permissionModeNext") ? s.permissionModeNext : void 0;
  return { mode: s?.permissions ? s.permissions.current ?? null : s?.permissionMode ?? null, next };
}
function permissionChipHtml(s, env) {
  const p = permissionsFor(s, env);
  if (!env?.installed || !p || !p.modes?.length) return "";
  const { mode, next } = s ? sessionPermission(s) : { mode: p.current ?? null, next: void 0 };
  const label = permissionLabel(p, mode) + (next !== void 0 ? " \u2192 " + permissionLabel(p, next) : "");
  const scope = permissionScope(p, s, env);
  const tip = s ? "\u6B64\u4F1A\u8BDD\u7684\u6388\u6743\u65B9\u5F0F\uFF1B\u8FD0\u884C\u4E2D\u5207\u6362\u4F1A\u5728\u4E0B\u4E00\u8F6E\u751F\u6548" : `\u65B0\u4F1A\u8BDD\u7684\u9ED8\u8BA4\u6388\u6743\u65B9\u5F0F\uFF08${env.name}${scope}\uFF09`;
  return `<button class="chip-btn perm-chip${p.issue ? " warn" : ""}${mode === "auto" || permissionWarning(env.id, mode) ? " risky" : ""}" id="perm-chip" data-value="${esc6(mode ?? "")}" title="${esc6(tip)}">${icon(permissionIcons[mode] ?? "shield")}<span class="chip-text">${esc6(label)}</span>${icon("chevronDown", "caret")}</button>`;
}
function permissionMenuHtml() {
  const s = session(), env = runtime(s ? s.runtimeId : state.runtimeId), p = permissionsFor(s, env);
  if (!p) return `<div class="menu-label">\u6388\u6743\u65B9\u5F0F</div><div class="menu-static"><span class="mi-main"><span class="mi-sub">\u6B64\u8FD0\u884C\u73AF\u5883\u6CA1\u6709\u53EF\u5207\u6362\u7684\u6388\u6743\u65B9\u5F0F\u3002</span></span></div>`;
  const { mode, next } = s ? sessionPermission(s) : { mode: p.current ?? null, next: void 0 };
  const scope = permissionScope(p, s, env);
  const head = s ? `\u6B64\u4F1A\u8BDD \xB7 ${esc6(env.name)}${scope}${busy(s) ? " \xB7 \u4E0B\u4E00\u8F6E\u751F\u6548" : ""}` : `\u65B0\u4F1A\u8BDD\u9ED8\u8BA4 \xB7 ${esc6(env.name)}${scope}`;
  const items = permissionChoices(p).map((m) => {
    const id = m.id ?? null, selected = id === mode, queued = next !== void 0 && id === next && id !== mode;
    return `<button class="menu-item perm-item${selected ? " selected" : ""}" data-permission-choice="${esc6(id ?? "__default")}">${icon(permissionIcons[id] ?? "shield", "mi-icon")}<span class="mi-main"><span class="mi-name">${esc6(m.label)}${queued ? '<span class="mi-tag">\u4E0B\u4E00\u8F6E</span>' : ""}</span><span class="mi-sub">${esc6(m.description ?? "")}</span></span>${selected ? icon("check", "mi-check") : ""}</button>`;
  }).join("");
  const issue = p.issue ? `<div class="menu-note warn">${icon("alert")}<span>${esc6(p.issue)}</span></div>` : "";
  const migrated = p.migration?.reason ? `<div class="menu-note">${icon("info")}<span>${esc6(p.migration.reason)}</span></div>` : "";
  const exec = p.protocol === "exec-json" ? `<div class="menu-note">${icon("info")}<span>\u539F\u751F Codex \u6309\u5B98\u65B9 CLI \u7684 exec \u65B9\u5F0F\u8FD0\u884C\uFF0C\u4E0D\u80FD\u9010\u6761\u8BE2\u95EE\uFF1B\u9700\u8981\u66F4\u9AD8\u6743\u9650\u7684\u64CD\u4F5C\u7531\u539F\u751F\u6C99\u7BB1\u62D2\u7EDD\uFF0C\u6216\u4EA4\u7ED9\u81EA\u52A8\u5BA1\u67E5\u3002</span></div>` : "";
  const review = env?.id === "dsh" && p.modes?.some((m) => m.id === "auto-review") ? `<div class="menu-note">${icon("zap")}<span>\u81EA\u52A8\u5BA1\u67E5\u4F1A\u5728\u6BCF\u6B21\u5DE5\u5177\u8C03\u7528\u524D\u53E6\u53D1\u4E00\u6B21\u6A21\u578B\u8BF7\u6C42\uFF0C\u8BF7\u6C42\u6570\u5927\u7EA6\u7FFB\u500D\uFF0C\u4E5F\u66F4\u6162\u3002</span></div>` : "";
  const claudeAuto = env?.id === "claude" && p.modes?.some((m) => m.id === "auto-review") ? `<div class="menu-note">${icon("zap")}<span>\u201C\u81EA\u52A8\u5BA1\u67E5\u201D\u7528 Claude Code \u539F\u751F\u7684 auto \u6A21\u5F0F\uFF1A\u5DE5\u4F5C\u533A\u5185\u7684\u7F16\u8F91\u76F4\u63A5\u6267\u884C\uFF0C\u5176\u4ED6\u64CD\u4F5C\u5148\u7531\u540C\u4E00\u4E2A\u6A21\u578B\u5224\u65AD\u662F\u5426\u5B89\u5168\uFF0C\u4F1A\u591A\u53D1\u6A21\u578B\u8BF7\u6C42\u3002</span></div>` : "";
  return `<div class="menu-label">\u6388\u6743\u65B9\u5F0F \xB7 ${head}</div>${items}${issue}${migrated}${exec}${review}${claudeAuto}<div class="menu-note">${icon("info")}<span>\u7531\u539F\u751F\u8FD0\u884C\u73AF\u5883\u6267\u884C\uFF1ABridge++ \u53EA\u4F20\u539F\u751F\u53C2\u6570\u6216\u4EE3\u4F60\u56DE\u7B54\u6388\u6743\u8BF7\u6C42\uFF0C\u4E0D\u4F1A\u8D8A\u8FC7\u539F\u751F\u6C99\u7BB1\u3002</span></div>`;
}
function changePermission(runtimeId, mode, current, apply3) {
  const warning = mode === current ? null : permissionWarning(runtimeId, mode);
  if (!warning) {
    void action(apply3);
    return;
  }
  closeMenu();
  modal(warning.title, `<p class="modal-text">${esc6(warning.text)}</p>`, apply3, { confirm: warning.confirm, danger: true });
}
function runtimePermissionHtml(r) {
  const p = r.permissions;
  if (!r.installed || !p) return "";
  const scopes = p.bySelection ? [["native", p.bySelection.native], ["gateway", p.bySelection.gateway]] : [["", p]];
  return scopes.filter(([, c]) => c?.modes?.length).map(([scope, c]) => permissionBlockHtml(r, scope, c)).join("");
}
function permissionBlockHtml(r, scope, p) {
  const choices = permissionChoices(p), current = p.current ?? null, chosen = choices.find((m) => (m.id ?? null) === current) ?? choices[0];
  const named = scope ? permissionScopes[p.protocol] ?? (scope === "native" ? "\u539F\u751F\u6A21\u578B" : "\u7B2C\u4E09\u65B9\u6A21\u578B") : "", title = named ? ` \xB7 ${named}` : "";
  const version2 = p.observed?.version ? `<span class="perm-observed">\u5DF2\u6309\u672C\u673A ${esc6(String(p.observed.version))} \u6838\u5B9E\u53EF\u7528\u6A21\u5F0F</span>` : "";
  const migrated = p.migration?.reason ? `<p class="perm-desc">${esc6(p.migration.reason)}</p>` : "";
  return `<div class="perm-block"><div class="perm-title">${icon("shield")}<span>\u6388\u6743\u65B9\u5F0F</span><span class="perm-scope">\xB7 ${named ? `${esc6(named)} \xB7 ` : ""}\u65B0\u4F1A\u8BDD\u9ED8\u8BA4</span></div><div class="perm-options" role="radiogroup" aria-label="${esc6(r.name)}${esc6(title)} \u6388\u6743\u65B9\u5F0F">${choices.map((m) => {
    const id = m.id ?? null;
    return `<button class="perm-option${id === current ? " active" : ""}" role="radio" aria-checked="${id === current}" data-runtime-permission="${esc6(r.id)}|${esc6(id ?? "__default")}|${esc6(scope)}" title="${esc6(m.description ?? "")}">${icon(permissionIcons[id] ?? "shield")}${esc6(m.label)}</button>`;
  }).join("")}</div><p class="perm-desc">${esc6(chosen?.description ?? p.description ?? "")}</p>${migrated}${version2}${p.issue ? `<p class="perm-issue">${icon("alert")}<span>${esc6(p.issue)}</span></p>` : ""}</div>`;
}
function renderBanner() {
  const el = $2("#composer-banner");
  if (!el) return;
  const s = session(), notes = [];
  if (s?.selectionIssue) {
    el.innerHTML = `<div class="banner warn" id="session-model-warning">${icon("alert")}<span>${esc6(s.selectionIssue)}</span><span class="banner-actions"><button class="btn sm" id="refresh-session-model">\u5237\u65B0\u6765\u6E90</button><button class="btn primary sm" id="rebind-session-model" ${busy(s) ? "disabled" : ""}>\u91CD\u65B0\u786E\u8BA4\u6A21\u578B</button></span></div>`;
    return;
  }
  if (!s && project()) {
    const env = runtime(state.runtimeId);
    if (!state.snapshot.runtimes.some(usable) && env?.checking) {
      el.innerHTML = `<div class="banner"><span class="spinner"></span><span>\u6B63\u5728\u68C0\u6D4B\u5F00\u53D1\u73AF\u5883\u2026</span></div>`;
      return;
    }
    if (!state.snapshot.runtimes.some(usable)) {
      el.innerHTML = `<div class="banner warn">${icon("alert")}<span>\u8FD8\u6CA1\u6709\u53EF\u7528\u7684\u5F00\u53D1\u73AF\u5883\u3002\u88C5\u597D DeepSeek Harness \u6216 Kimi Code \u4E2D\u7684\u4EFB\u610F\u4E00\u4E2A\u5C31\u80FD\u5F00\u59CB\u3002</span><span class="banner-actions"><button class="btn primary sm" id="open-guide">\u67E5\u770B\u5F15\u5BFC</button></span></div>`;
      return;
    }
    if (env && !usable(env)) notes.push(env.checking ? `${unusableReason(env)}\u2026` : `${unusableReason(env)}\u3002\u8BF7\u6362\u4E00\u4E2A\u8FD0\u884C\u73AF\u5883\uFF0C\u6216\u5230\u8BBE\u7F6E \u2192 \u8FD0\u884C\u73AF\u5883\u5904\u7406\u3002`);
    else if (!state.modelKey) notes.push(state.runtimeId === "dsh" ? "DSH \u7EDF\u4E00\u4F1A\u8BDD\u9700\u8981 Qoder CN \u6216 WorkBuddy \u6A21\u578B\u3002\u8BF7\u5728\u8BBE\u7F6E \u2192 \u6A21\u578B\u6E90\u4E0B\u8F7D\u7EC4\u4EF6\u5E76\u767B\u5F55\u3002" : state.runtimeId === "claude" ? "Claude Code \u5728 Bridge++ \u91CC\u53EA\u7528 Qoder CN \u6216 WorkBuddy \u7684\u6A21\u578B\uFF0C\u4E0D\u7528 Claude \u6A21\u578B\u3002\u8BF7\u5728\u8BBE\u7F6E \u2192 \u6A21\u578B\u6E90\u4E0B\u8F7D\u7EC4\u4EF6\u5E76\u767B\u5F55\u3002" : "\u8BF7\u9009\u62E9\u6A21\u578B\u3002");
    else if (state.modelKey !== "native" && !currentModel()) notes.push("\u6240\u9009\u6A21\u578B\u4E0D\u5728\u5F53\u524D\u76EE\u5F55\u4E2D\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u6216\u5237\u65B0\u6A21\u578B\u6E90\u3002");
  }
  const limit = s && !busy(s) ? limitNotice(s.lastFailure) : "";
  if (limit) notes.push(limit);
  const queued = s?.selectionNext ? `<div class="banner" id="queued-params-banner">${icon("clock")}<span>\u53C2\u6570\u4FEE\u6539\u5DF2\u6392\u961F\uFF1A${esc6(paramsText(s.selectionNext))}\uFF0C\u672C\u8F6E\u7ED3\u675F\u540E\u81EA\u52A8\u5E94\u7528\u3002</span><span class="banner-actions"><button class="btn sm" id="cancel-queued-params">\u53D6\u6D88</button></span></div>` : "";
  el.innerHTML = queued + notes.map((text3) => `<div class="banner">${icon("info")}<span>${esc6(text3)}</span></div>`).join("");
}
function ringSvg(ratio) {
  const r = 8.5, c = 2 * Math.PI * r, level = ratio == null ? "none" : ratio >= 0.85 ? "high" : ratio >= 0.6 ? "mid" : "low";
  return `<svg class="ring ${level}" viewBox="0 0 22 22" aria-hidden="true"><circle class="ring-track" cx="11" cy="11" r="${r}"/>${ratio == null ? "" : `<circle class="ring-value" cx="11" cy="11" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - ratio)).toFixed(2)}" transform="rotate(-90 11 11)"/>`}</svg>`;
}
function selectionWindow(s) {
  const m = modelOf(s.selection);
  return s.selection.contextBudget ?? s.selection.contextTokens ?? m?.contextMaximum ?? null;
}
function turnStartedAt() {
  for (let i2 = state.events.length - 1; i2 >= 0; i2--) if (state.events[i2].type === "user" && state.events[i2].delivery !== "steer") return state.events[i2].at;
  return session()?.updatedAt;
}
function renderFooter() {
  const el = $2("#composer-footer");
  if (!el) return;
  const s = session();
  if (!s) {
    patchHtml(el, `<span class="footer-left">${icon("keyboard")}Enter \u53D1\u9001 \xB7 Shift + Enter \u6362\u884C</span><span class="footer-center"></span><span class="footer-right"></span>`);
    return;
  }
  const live = busy(s), rate = metrics.rate(Date.now(), live), cache = metrics.cache(), ctx = metrics.context(selectionWindow(s));
  const rateText = rate ? `${rate.estimated ? "\u2248" : ""}${rate.value >= 100 ? Math.round(rate.value) : rate.value.toFixed(1)} tok/s` : "\u2014 tok/s";
  const rateTitle = rate ? rate.live ? "\u5B9E\u65F6\u8F93\u51FA\u901F\u7387\uFF08\u6309\u6D41\u5F0F\u6587\u5B57\u4F30\u7B97\uFF09" : rate.estimated ? "\u6700\u8FD1\u4E00\u6B21\u8BF7\u6C42\u7684\u8F93\u51FA\u901F\u7387\uFF08\u6309\u6D41\u5F0F\u6587\u5B57\u4F30\u7B97\uFF09" : "\u6700\u8FD1\u4E00\u6B21\u8BF7\u6C42\u7684\u8F93\u51FA\u901F\u7387\uFF08\u6765\u6E90\u62A5\u544A\u7684 token \u6570\uFF09" : "\u8FD8\u6CA1\u6709\u901F\u7387\u6570\u636E";
  const cacheText = cache ? `${cache.status === "estimated" ? "\u2248" : ""}${pct(cache.ratio)}` : "\u672A\u62A5\u544A";
  const cacheTitle = cache ? `\u6700\u8FD1\u4E00\u6B21\u8BF7\u6C42\u547D\u4E2D ${pct(cache.ratio)}\uFF0C\u672C\u4F1A\u8BDD\u7D2F\u8BA1 ${pct(cache.sessionRatio)}${cache.status === "estimated" ? "\uFF08\u4F30\u7B97\uFF09" : ""}` : "\u5F53\u524D\u8FD0\u884C\u73AF\u5883\u6216\u6A21\u578B\u6E90\u6CA1\u6709\u62A5\u544A\u7F13\u5B58\u547D\u4E2D";
  const ctxTitle = ctx.used !== null ? `\u4E0A\u4E0B\u6587\u5DF2\u7528 ${compact(ctx.used)} / ${compact(ctx.window)} tokens` : ctx.window ? `\u4E0A\u4E0B\u6587\u7A97\u53E3 ${compact(ctx.window)} tokens\uFF0C\u8FD8\u6CA1\u6709\u7528\u91CF\u6570\u636E` : "\u8FD8\u6CA1\u6709\u4E0A\u4E0B\u6587\u6570\u636E";
  patchHtml(el, `<span class="footer-left"><span class="dot ${esc6(s.status)}"></span><span class="footer-status">${esc6(live ? activityOf(s).long : labels[s.status] ?? s.status)}</span>${live ? `<span class="footer-elapsed">\xB7 ${elapsed(turnStartedAt())}</span>` : ""}</span>
    <span class="footer-center"><span class="metric" title="${esc6(rateTitle)}">${icon("zap")}${rateText}</span><span class="metric-sep"></span><span class="metric" title="${esc6(cacheTitle)}">${icon("database")}\u7F13\u5B58\u547D\u4E2D ${cacheText}</span></span>
    <span class="footer-right" title="${esc6(ctxTitle)}" id="context-ring"><span class="ctx-text">${ctx.ratio !== null ? pct(ctx.ratio) : ctx.window ? compact(ctx.window) : "\u2014"}</span>${ringSvg(ctx.ratio)}</span>`);
}
function tick() {
  const live = state.snapshot?.sessions.some(busy);
  if (live && !tickTimer) tickTimer = setInterval(() => {
    if (busy(session())) {
      renderFooter();
      const w2 = $2("#working-elapsed");
      if (w2) w2.textContent = elapsed(turnStartedAt());
    }
    for (const el of document.querySelectorAll("[data-elapsed-from]")) el.textContent = elapsed(el.dataset.elapsedFrom);
  }, 1e3);
  else if (!live && tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}
function markdown(text3) {
  const clean = replaceMath(purify_default.sanitize(f.parse(text3 ?? "", { breaks: true, gfm: true }), { FORBID_TAGS: ["img", "style", "input", "button", "form", "iframe"], FORBID_ATTR: ["style", "id"] }));
  return clean.includes("data-md-media=") ? { html: replaceMarkers(clean, lookupMedia), media: true } : { html: clean, media: false };
}
function cachedMarkdown(e) {
  const hit = markdownCache.get(e.id);
  if (hit?.text === e.text && (!hit.media || hit.gen === mediaGen)) return hit.html;
  if (markdownCache.size > 600) markdownCache.clear();
  const { html: html2, media } = markdown(e.text);
  markdownCache.set(e.id, { text: e.text, html: html2, media, gen: mediaGen });
  return html2;
}
function lookupMedia(href) {
  const sessionId = state.sessionId, key = `${sessionId}\0${href}`;
  if (mediaLookup.has(key)) return mediaLookup.get(key);
  if (sessionId && !mediaResolving.has(key)) {
    mediaResolving.add(key);
    call("media:resolve", { sessionId, href }).catch(() => null).then((found) => {
      mediaResolving.delete(key);
      mediaLookup.set(key, found ?? null);
      mediaGen++;
      if (state.sessionId === sessionId) scheduleChat();
    });
  }
  return void 0;
}
function toolOutput(t) {
  const parts = t.outputs.map((o) => typeof o.text === "string" && o.text ? o.text : "").filter(Boolean);
  if (parts.length) return parts.join("");
  const d = t.end?.data;
  if (!d) return "";
  const content = d.message?.content ?? d.content;
  if (typeof content === "string" && content) return content;
  if (Array.isArray(content)) {
    const text3 = content.map((p) => p?.type === "tool_reference" && typeof p.tool_name === "string" ? `\u5DF2\u52A0\u8F7D\u5DE5\u5177\u5B9A\u4E49\uFF1A${p.tool_name}
` : p?.text ?? p?.content?.text ?? "").join("");
    if (text3) return text3;
  }
  if (typeof d.error?.message === "string") return d.error.message;
  return d.item?.aggregatedOutput ?? d.rawOutput ?? pretty(d);
}
var toolNames = {
  commandExecution: "\u8FD0\u884C\u547D\u4EE4",
  command_execution: "\u8FD0\u884C\u547D\u4EE4",
  fileChange: "\u4FEE\u6539\u6587\u4EF6",
  file_change: "\u4FEE\u6539\u6587\u4EF6",
  webSearch: "\u7F51\u7EDC\u641C\u7D22",
  web_search: "\u7F51\u7EDC\u641C\u7D22",
  mcpToolCall: "MCP \u5DE5\u5177",
  mcp_tool_call: "MCP \u5DE5\u5177",
  imageGeneration: "\u751F\u6210\u56FE\u7247",
  image_generation: "\u751F\u6210\u56FE\u7247",
  todo_list: "\u5F85\u529E",
  read_file: "\u8BFB\u53D6\u6587\u4EF6",
  view_file: "\u8BFB\u53D6\u6587\u4EF6",
  run_command: "\u8FD0\u884C\u547D\u4EE4",
  command_status: "\u547D\u4EE4\u72B6\u6001",
  send_command_input: "\u547D\u4EE4\u8F93\u5165",
  list_dir: "\u6D4F\u89C8\u76EE\u5F55",
  find_by_name: "\u67E5\u627E\u6587\u4EF6",
  grep_search: "\u641C\u7D22\u4EE3\u7801",
  write_to_file: "\u5199\u5165\u6587\u4EF6",
  replace_file_content: "\u4FEE\u6539\u6587\u4EF6",
  multi_replace_file_content: "\u4FEE\u6539\u6587\u4EF6",
  sed_file: "\u4FEE\u6539\u6587\u4EF6",
  search_web: "\u7F51\u7EDC\u641C\u7D22",
  read_url_content: "\u8BFB\u53D6\u7F51\u9875",
  generate_image: "\u751F\u6210\u56FE\u7247",
  call_mcp_tool: "MCP \u5DE5\u5177",
  invoke_subagent: "\u5B50\u4EE3\u7406",
  browser_subagent: "\u6D4F\u89C8\u5668\u5B50\u4EE3\u7406"
};
function attachmentSummary(summary, names) {
  const id = /[\\/]([0-9a-f-]{36})\.[a-z0-9]+$/i.exec(summary)?.[1];
  return id && names.has(id) ? `\u9644\u4EF6 \xB7 ${names.get(id)}` : summary;
}
var toolMark = (status) => status === "running" ? '<span class="spinner"></span>' : icon(status === "failed" ? "alert" : status === "done" ? "check" : "clock", "tool-status");
function toolBlock(key, t, running2, names = /* @__PURE__ */ new Map()) {
  const start2 = t.start, end = t.end, raw = start2?.name ?? end?.name ?? "\u5DE5\u5177", name = toolNames[raw] ?? raw;
  const status = toolStatus(t, running2), summary = attachmentSummary(toolSummary(start2 ?? end), names), file = start2?.data ? toolFilePath(argsOf(start2.data)) : null;
  const input = start2?.data ? clip2(pretty(argsOf(start2.data))) : "", output = clip2(toolOutput(t));
  return `<details class="tool ${status}" data-expand="tool-${esc6(key)}"><summary>${toolMark(status)}<span class="tool-name">${esc6(name)}</span><span class="tool-summary"${file ? ` data-link-path="${esc6(file)}"` : ""}>${esc6(summary === raw ? "" : summary)}</span>${icon("chevronRight", "tool-caret")}</summary><div class="tool-body">${input && input !== "{}" ? `<div class="tool-label">\u8F93\u5165</div><pre>${esc6(input)}</pre>` : ""}${output ? `<div class="tool-label">\u8F93\u51FA</div><pre>${esc6(output)}</pre>` : ""}${!input && !output ? '<div class="tool-label">\u6CA1\u6709\u53EF\u663E\u793A\u7684\u53C2\u6570</div>' : ""}</div></details>`;
}
function foldBlock(run, running2, open2) {
  const first = run.find((b) => b.work.tool).key.replace(/^tool:/, ""), id = `tools-${first}`, { status, title, detail } = foldSummary(run, running2);
  return [`tools:${first}`, `<details class="tool tool-fold ${status}" data-expand="${esc6(id)}"><summary>${toolMark(status)}<span class="tool-name">${esc6(title)}</span><span class="tool-summary">${esc6(detail)}</span>${icon("chevronRight", "tool-caret")}</summary><div class="tool-fold-body">${open2.has(id) ? run.map((b) => b.html()).join("") : ""}</div></details>`];
}
function diffStat(text3) {
  let files = 0, adds = 0, dels = 0;
  for (const line of text3.split("\n")) {
    if (line.startsWith("diff --git")) files++;
    else if (line.startsWith("+") && !line.startsWith("+++")) adds++;
    else if (line.startsWith("-") && !line.startsWith("---")) dels++;
  }
  return `${files || 1} \u4E2A\u6587\u4EF6 \xB7 +${adds} \u2212${dels}`;
}
function diffHtml(text3) {
  if (!text3) return '<div class="pane-empty small">\u6CA1\u6709\u6587\u672C\u5DEE\u5F02\u3002</div>';
  return `<pre class="diff">${clip2(text3, 3e5).split("\n").map((l) => `<span class="dl${l.startsWith("diff ") || l.startsWith("+++") || l.startsWith("---") || l.startsWith("index ") ? " dh" : l.startsWith("+") ? " da" : l.startsWith("-") ? " dd" : l.startsWith("@@") ? " dk" : ""}">${esc6(l) || " "}</span>`).join("")}</pre>`;
}
function approvalSummary(e) {
  const d = e.data ?? {};
  if (e.type === "question") {
    const qs = Array.isArray(d.questions) ? d.questions.map((q2) => q2.question ?? q2.prompt ?? "").filter(Boolean) : [d.question ?? d.prompt ?? d.message].filter(Boolean);
    return qs.join("\n");
  }
  const v2 = argsOf(d.toolCall ?? d);
  const command = Array.isArray(d.command) ? d.command.join(" ") : d.command;
  return [d.toolCall?.title, command, d.reason, v2.command && (Array.isArray(v2.command) ? v2.command.join(" ") : v2.command), v2.file_path ?? v2.path, v2.plan, v2.url, d.grantRoot, d.description].find((x2) => typeof x2 === "string" && x2.trim()) ?? "";
}
var REVIEW_RISK = { low: "\u4F4E\u98CE\u9669", medium: "\u4E2D\u7B49\u98CE\u9669", high: "\u9AD8\u98CE\u9669" };
function reviewNote(review) {
  if (!review?.reason) return "";
  return `<div class="approval-review ${esc6(review.risk ?? "")}">${icon("shield")}<span>\u81EA\u52A8\u5BA1\u67E5${review.risk && REVIEW_RISK[review.risk] ? `\uFF08${REVIEW_RISK[review.risk]}\uFF09` : ""}\uFF1A${esc6(review.reason)}</span></div>`;
}
function approvalBlock(e, resolved) {
  const done = resolved.get(e.approvalId);
  if (done !== void 0) return `<div class="approval-done ${done === "reject" || done === "reject-session" ? "rejected" : ""}">${icon(done === "expired" ? "clock" : done?.startsWith?.("reject") ? "close" : "check")}<span>${e.type === "question" ? "\u95EE\u9898" : "\u6388\u6743"}${esc6(resolvedLabels[done] ?? "\u5DF2\u5904\u7406")}</span><span class="muted">${esc6(e.name ?? "")}</span></div>`;
  const summary = approvalSummary(e), choices = e.choices?.length ? e.choices : ["approve", "reject"];
  let buttons;
  if (choices.includes("native")) buttons = '<button class="btn primary sm" data-approval-native="true">\u5728\u5B8C\u6574\u5DE5\u5177\u754C\u9762\u5904\u7406</button>';
  else if (e.type === "question") buttons = `<button class="btn primary sm" data-question="${esc6(e.approvalId)}">\u56DE\u7B54</button><button class="btn sm danger" data-approval="${esc6(e.approvalId)}" data-choice="reject">\u4E0D\u56DE\u7B54</button>${hasNativeUi(session()?.runtimeId) ? '<button class="btn sm" data-approval-native="true">\u5728\u539F\u751F\u754C\u9762\u5904\u7406</button>' : ""}`;
  else buttons = choices.filter((c) => choiceLabels[c]).map((c) => `<button class="btn sm${c === "approve" ? " primary" : c.startsWith("reject") ? " danger" : ""}" data-approval="${esc6(e.approvalId)}" data-choice="${esc6(c)}">${choiceLabels[c]}</button>`).join("");
  return `<div class="approval-card"><div class="approval-head">${icon(e.type === "question" ? "info" : "key")}<b>${e.type === "question" ? "Agent \u9700\u8981\u4F60\u8865\u5145\u4FE1\u606F" : "Agent \u8BF7\u6C42\u6388\u6743"}</b>${e.name ? `<span class="muted">${esc6(e.name)}</span>` : ""}</div>${summary ? `<div class="approval-summary">${esc6(summary)}</div>` : ""}${reviewNote(e.data?.review)}<details class="approval-details" data-expand="approval-${esc6(e.approvalId)}"><summary>\u8BE6\u7EC6\u53C2\u6570</summary><pre>${esc6(clip2(pretty(e.data)))}</pre></details><div class="approval-actions">${buttons}</div></div>`;
}
function planBlock(e, live) {
  const d = e.data ?? {}, items = (d.entries ?? d.plan ?? []).map((x2) => ({ text: x2.content ?? x2.step ?? "", status: String(x2.status ?? "") }));
  if (!items.length) return miscBlock(e, "list", "\u8BA1\u5212");
  const doing = (x2) => /progress/i.test(x2.status), stalled = !live && items.some(doing);
  const mark = (x2) => x2.status === "completed" ? icon("check") : doing(x2) ? live ? '<span class="spinner"></span>' : '<span class="plan-stalled" title="\u8FD9\u4E00\u8F6E\u5DF2\u7ECF\u7ED3\u675F\uFF0C\u8FD9\u4E00\u9879\u6CA1\u6709\u5B8C\u6210"></span>' : '<span class="plan-dot"></span>';
  return `<div class="plan-card"><div class="plan-head">${icon("list")}<span>\u8BA1\u5212</span><span class="muted">${items.filter((x2) => x2.status === "completed").length}/${items.length}</span>${stalled ? '<span class="plan-state">\u672A\u5B8C\u6210</span>' : ""}</div><ul>${items.map((x2) => `<li class="${doing(x2) ? live ? "doing" : "stalled" : x2.status === "completed" ? "done" : ""}">${mark(x2)}<span>${esc6(x2.text)}</span></li>`).join("")}</ul></div>`;
}
var steerNotes = {
  pending: ["clock", "\u63D2\u8BDD \xB7 \u7B49\u5F85\u63D2\u5165\u4E0B\u4E00\u6B65"],
  delivered: ["check", "\u63D2\u8BDD \xB7 \u5DF2\u9001\u8FBE\uFF0C\u6A21\u578B\u4E0B\u4E00\u6B65\u4F1A\u770B\u5230"],
  carried: ["chevronRight", "\u63D2\u8BDD \xB7 \u8FD9\u4E00\u8F6E\u5148\u7ED3\u675F\u4E86\uFF0C\u5DF2\u4F5C\u4E3A\u4E0B\u4E00\u8F6E\u7684\u8F93\u5165"],
  failed: ["alert", "\u63D2\u8BDD\u6CA1\u6709\u9001\u8FBE\uFF0C\u5DF2\u653E\u56DE\u6392\u961F"]
};
function userBlock(e, discarded, steers) {
  let note = "";
  if (e.delivery === "steer") {
    const s = steers.get(e.steerId), key = steerNotes[s?.state] ? s.state : "pending", [ico, text3] = steerNotes[key];
    note = `<div class="user-note ${key}"${s?.reason ? ` title="${esc6(s.reason)}"` : ""}>${icon(ico)}<span>${esc6(text3)}${key === "failed" && s?.reason ? `\uFF1A${esc6(s.reason)}` : ""}</span></div>`;
  } else if (e.fromQueue?.length) note = `<div class="user-note queued">${icon("clock")}<span>${e.fromQueue.length > 1 ? `\u6392\u961F\u7684 ${e.fromQueue.length} \u6761\u6D88\u606F\uFF0C\u5408\u5E76\u53D1\u51FA` : "\u6392\u961F\u6D88\u606F\uFF0C\u4E0A\u4E00\u8F6E\u7ED3\u675F\u540E\u53D1\u51FA"}</span></div>`;
  return `<article class="message user-message${e.delivery === "steer" ? " steer" : ""}">${userMediaHtml(e.attachments, discarded)}${e.text ? `<div class="user-bubble">${esc6(e.text)}</div>` : ""}${note}<div class="user-meta">${clock(e.at)}</div></article>`;
}
function miscBlock(e, ico, label) {
  return `<details class="tool" data-expand="${esc6(e.id)}"><summary>${icon(ico, "tool-status")}<span class="tool-name">${label}</span><span class="tool-summary">${esc6(toolSummary(e))}</span>${icon("chevronRight", "tool-caret")}</summary><div class="tool-body"><pre>${esc6(clip2(e.text ?? pretty(e.data ?? {})))}</pre></div></details>`;
}
function diffBlock(e) {
  const text3 = typeof e.text === "string" && e.text ? e.text : null;
  return `<details class="tool diff-event" data-expand="diff-${esc6(e.turnId ?? e.id)}"><summary>${icon("fileDiff", "tool-status")}<span class="tool-name">\u4EE3\u7801\u53D8\u66F4</span><span class="tool-summary">${esc6(text3 ? diffStat(text3) : "\u5DE5\u4F5C\u533A\u53D8\u66F4")}</span>${icon("chevronRight", "tool-caret")}</summary><div class="tool-body">${text3 ? diffHtml(text3) : `<pre>${esc6(clip2(pretty(e.data)))}</pre>`}</div></details>`;
}
function turnEndBlock(e) {
  const t = e.turnId ? metrics.turn(e.turnId) : null, why = ["completed", "paused"].includes(e.status) ? "" : stopLabel(e.reason), parts = [{ completed: "\u672C\u8F6E\u5B8C\u6210", interrupted: "\u5DF2\u505C\u6B62", failed: "\u672C\u8F6E\u672A\u5B8C\u6210", paused: "\u5DF2\u6682\u505C" }[e.status] ?? "\u672C\u8F6E\u7ED3\u675F", ...why ? [why] : [], clock(e.at)];
  if (t?.input != null) parts.push(`\u8F93\u5165 ${compact(t.input)}`);
  if (t?.output != null) parts.push(`\u8F93\u51FA ${compact(t.output)}`);
  if (t?.cacheRatio != null) parts.push(`\u7F13\u5B58 ${t.cacheStatus === "estimated" ? "\u2248" : ""}${pct(t.cacheRatio)}`);
  parts.push(...turnExtras(e.stats));
  return `<div class="turn-end ${esc6(e.status)}"><span>${parts.map(esc6).join(" \xB7 ")}</span></div>`;
}
function renderChat(quiet = false) {
  const chat = $2("#chat"), scroller = $2("#scroller");
  if (!chat || !scroller) return;
  const s = session(), running2 = busy(s), events = state.events, blocks = [], keys = /* @__PURE__ */ new Set();
  const add = (key, html2, work) => {
    if (keys.has(key)) key += `#${blocks.length}`;
    keys.add(key);
    blocks.push({ key, html: html2, work });
  };
  const open2 = new Set([...chat.querySelectorAll("details[data-expand][open]")].map((el) => el.dataset.expand));
  const resolved = new Map(events.filter((e) => e.type === "approval-resolved").map((e) => [e.approvalId, e.choice]));
  const rulesUndone = new Set(events.filter((e) => e.type === "notice" && e.source === "long-term-rule" && e.undone).map((e) => e.ruleId));
  const discarded = new Set(events.filter((e) => e.type === "attachments-discarded").flatMap((e) => e.attachmentIds ?? []));
  const names = new Map(events.filter((e) => e.type === "user").flatMap((e) => (e.attachments ?? []).map((a3) => [a3.id, a3.name])));
  const steers = new Map(events.filter((e) => e.type === "steer-state").map((e) => [e.steerId, e]));
  const liveTurn = running2 ? events.findLast((e) => e.type === "user" && e.delivery !== "steer")?.turnId : null;
  const livePlan = liveTurn ? events.findLast((e) => e.type === "plan" && e.turnId === liveTurn)?.id : null;
  const tools = /* @__PURE__ */ new Map(), lastDiff = /* @__PURE__ */ new Map(), toolKey = (e) => e.toolId ?? e.data?.callId ?? null;
  const upstreamSaid = new Set(events.filter((e) => e.type === "upstream-error").map((e) => `${e.turnId}\0${e.message}`));
  for (const e of events) {
    if (toolKey(e) && ["tool-start", "tool-output", "tool-end"].includes(e.type)) {
      const t = tools.get(toolKey(e)) ?? { outputs: [] };
      if (e.type === "tool-start") t.start ??= e;
      else if (e.type === "tool-end") t.end = e;
      else t.outputs.push(e);
      tools.set(toolKey(e), t);
    } else if (e.type === "diff") lastDiff.set(e.turnId ?? "none", e);
  }
  for (const e of events) {
    if (e.type === "user") add(`user:${e.id}`, userBlock(e, discarded, steers));
    else if (e.type === "media") add(`media:${e.id}`, `<article class="message media-message">${mediaCardHtml(e)}</article>`);
    else if (e.type === "text") {
      if (!e.text?.trim()) continue;
      add(`text:${e.id}`, `<article class="message"><div class="message-content markdown">${cachedMarkdown(e)}</div><div class="message-tools"><button class="icon-btn xs copy-answer" title="\u590D\u5236">${icon("copy")}</button></div></article>`);
    } else if (e.type === "thinking") add(`thinking:${e.id}`, () => `<details class="thinking" data-expand="thinking-${esc6(e.id)}"><summary>${icon("bulb")}<span>\u601D\u8003\u8FC7\u7A0B</span><span class="muted">${(e.text ?? "").length.toLocaleString()} \u5B57</span>${icon("chevronRight", "tool-caret")}</summary><div class="thinking-body">${esc6(clip2(e.text ?? "", 6e4))}</div></details>`, { thinking: true });
    else if (["tool-start", "tool-output", "tool-end"].includes(e.type)) {
      const key = toolKey(e);
      if (!key) {
        const t2 = { start: e.type === "tool-start" ? e : null, outputs: e.type === "tool-output" ? [e] : [], end: e.type === "tool-end" ? e : null };
        add(`tool:${e.id}`, () => toolBlock(e.id, t2, running2, names), { tool: t2 });
        continue;
      }
      const t = tools.get(key);
      if (t.rendered) continue;
      t.rendered = true;
      add(`tool:${key}`, () => toolBlock(key, t, running2, names), { tool: t });
    } else if (e.type === "subagent") add(`subagent:${e.id}`, miscBlock(e, "bot", "\u5B50\u4EE3\u7406"));
    else if (e.type === "plan") add(`plan:${e.id}`, planBlock(e, e.id === livePlan));
    else if (e.type === "diff") {
      if (lastDiff.get(e.turnId ?? "none") === e) add(`diff:${e.turnId ?? e.id}`, diffBlock(e));
    } else if (e.type === "approval" && ["approve", "approve-session"].includes(resolved.get(e.approvalId))) add(`approval:${e.approvalId ?? e.id}`, () => approvalBlock(e, resolved), { approval: true });
    else if (e.type === "approval" || e.type === "question") add(`approval:${e.approvalId ?? e.id}`, approvalBlock(e, resolved));
    else if (e.type === "notice" && e.source === "long-term-rule") {
      if (!e.undone) add(`note:${e.id}`, ruleNoticeHtml(e, rulesUndone.has(e.ruleId)));
    } else if (e.type === "notice" && e.source === "auto-review" && /^自动审查已允许/.test(e.text ?? "")) add(`note:${e.id}`, () => `<div class="event-note notice quiet" title="${esc6(e.text)}">${icon("shield")}<span>${esc6(e.text)}</span></div>`, { review: true });
    else if (e.type === "error" || e.type === "notice") {
      if (e.type === "error" && upstreamSaid.has(`${e.turnId}\0${e.text}`)) continue;
      const note = e.type === "notice" && e.source === "gateway" ? gatewayNotice(e.text) : null;
      if (note?.transient) continue;
      const quiet2 = e.type === "notice" && e.source === "native-warning";
      add(`note:${e.id}`, `<div class="event-note ${e.type}${quiet2 ? " quiet" : ""}"${quiet2 ? ` title="${esc6(e.text)}"` : ""}>${icon(e.type === "error" ? "alert" : "info")}<span>${esc6(note ? `${note.long}${note.detail ? ` \xB7 ${note.detail}` : ""}` : e.text)}</span>${e.detail ? `<details><summary>\u8BCA\u65AD\u8BE6\u60C5</summary><pre>${esc6(e.detail)}</pre></details>` : ""}</div>`);
    } else if (e.type === "upstream-error") {
      const last = blocks.at(-1);
      if (sameUpstream(last?.upstream?.e, e)) {
        last.upstream.count++;
        last.html = upstreamHtml(last.upstream.e, last.upstream.count);
        continue;
      }
      add(`upstream:${e.id}`, upstreamHtml(e));
      blocks.at(-1).upstream = { e, count: 1 };
    } else if (e.type === "turn-end") {
      const said = new Set(events.filter((x2) => x2.turnId === e.turnId && ["error", "upstream-error"].includes(x2.type)).flatMap((x2) => [x2.text, x2.message]));
      const note = e.status === "completed" ? "" : stopNote(e.reason, said);
      if (note) add(`stop:${e.id}`, `<div class="event-note error">${icon("alert")}<span>${esc6(note)}</span></div>`);
      add(`end:${e.id}`, turnEndBlock(e));
    }
  }
  if (state.historyLoading) add("loading", '<div class="empty-chat">\u6B63\u5728\u8BFB\u53D6\u4F1A\u8BDD\u8BB0\u5F55\u2026</div>');
  else if (!events.length) add("empty", `<div class="empty-chat">${icon("spark")}<span>\u4F1A\u8BDD\u5DF2\u51C6\u5907\u597D\uFF0C\u53D1\u9001\u7B2C\u4E00\u4E2A\u4EFB\u52A1\u5F00\u59CB\u534F\u4F5C\u3002</span></div>`);
  if (running2) {
    const now = activityOf(s);
    add("working", `<div class="working" data-state="${esc6(now.kind)}"><span class="pulse"></span><span class="working-label">${esc6(now.long)}</span>${now.detail ? `<span class="working-detail" title="${esc6(now.detail)}">${esc6(now.detail)}</span>` : ""}<span class="working-elapsed" id="working-elapsed">${elapsed(turnStartedAt())}</span></div>`);
  }
  const near = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160;
  patchBlocks(chat, foldRuns(blocks).map((b) => b.fold ? foldBlock(b.fold, running2, open2) : [b.key, b.work ? b.html() : b.html]), quiet);
  for (const el of chat.querySelectorAll("details[data-expand]")) el.open = open2.has(el.dataset.expand);
  if (near || events.length < 3) scroller.scrollTop = scroller.scrollHeight;
}
function paintActivity(id) {
  const s = state.snapshot?.sessions.find((x2) => x2.id === id);
  if (!s || !busy(s)) return;
  const text3 = activityOf(s).short;
  for (const el of document.querySelectorAll(`[data-activity="${CSS.escape(id)}"]`)) if (el.textContent !== text3) el.textContent = text3;
}
function stopSession(id) {
  stopping.add(id);
  paintActivity(id);
  if (id === state.sessionId) scheduleChat();
  void action(async () => {
    try {
      await call("session:cancel", { sessionId: id });
    } catch (error) {
      stopping.delete(id);
      paintActivity(id);
      if (id === state.sessionId) scheduleChat();
      throw error;
    }
  });
}
function scheduleChat() {
  if (chatTimer) return;
  chatTimer = setTimeout(() => {
    chatTimer = null;
    renderChat();
    renderFooter();
  }, 55);
}
function openMenu(anchor, kind) {
  closeMenu();
  menu = { kind, anchorId: anchor.id };
  if (kind === "model") {
    state.menuSearch = "";
    openGroups.clear();
    const s = session();
    const base = s?.selectionNext ?? s?.selection;
    if (s) state.params = { reasoning: base.reasoning ?? "", contextTokens: base.contextTokens ?? null, contextBudget: base.contextBudget ?? null };
    refreshBalances();
  }
  paintMenu();
}
var balanceAsked = /* @__PURE__ */ new Map();
function refreshBalances() {
  for (const source of ["qoder", "workbuddy"]) {
    const cat = state.snapshot?.catalog?.[source], at2 = Date.parse(cat?.account?.fetchedAt ?? "");
    if (!cat?.models?.length || Date.now() - (Number.isFinite(at2) ? at2 : 0) < 3e5 || Date.now() - (balanceAsked.get(source) ?? 0) < 6e4) continue;
    balanceAsked.set(source, Date.now());
    void call("provider:account", { source }).then((account) => {
      if (!account || !state.snapshot?.catalog?.[source]) return;
      state.snapshot.catalog[source].account = account;
      const list = menu?.kind === "model" ? $2("#menu-list") : null;
      if (list) list.innerHTML = modelListHtml();
    }).catch(() => {
    });
  }
}
setInterval(() => {
  if (menu?.kind !== "model") return;
  const list = $2("#menu-list");
  if (list && !state.menuSearch) list.innerHTML = modelListHtml();
}, 6e4);
function closeMenu() {
  menu = null;
  const el = $2("#popover");
  el.classList.add("hidden");
  el.innerHTML = "";
}
function paintMenu() {
  if (!menu) return;
  const el = $2("#popover");
  el.className = `popover ${menu.kind}-menu`;
  el.innerHTML = menu.kind === "model" ? modelMenuHtml() : menu.kind === "env" ? envMenuHtml() : menu.kind === "folder" ? folderMenuHtml() : menu.kind === "permission" ? permissionMenuHtml() : menu.kind === "file" ? fileMenuHtml() : menu.kind === "link" ? linkMenuHtml() : sessionMenuHtml();
  bind("#menu-search", "input", (e) => {
    state.menuSearch = e.target.value;
    const list = $2("#menu-list");
    if (list) list.innerHTML = modelListHtml();
  });
  bindNativeInputs();
  if (menu.kind === "model") syncNativeChoice();
  placeMenu();
  $2("#popover .menu-item.selected")?.scrollIntoView({ block: "nearest" });
  $2("#menu-search")?.focus();
}
function placeMenu() {
  if (!menu) return;
  const anchor = document.getElementById(menu.anchorId), el = $2("#popover");
  if (!anchor && !menu.at) {
    closeMenu();
    return;
  }
  if (menu.at) {
    el.style.left = `${Math.max(8, Math.min(menu.at.x, innerWidth - el.offsetWidth - 8))}px`;
    el.style.top = `${Math.max(8, Math.min(menu.at.y, innerHeight - el.offsetHeight - 8))}px`;
    return;
  }
  const a3 = anchor.getBoundingClientRect(), w2 = el.offsetWidth, h2 = el.offsetHeight, above = a3.top > innerHeight / 2;
  el.style.left = `${Math.max(8, Math.min(a3.left, innerWidth - w2 - 8))}px`;
  el.style.top = `${above ? Math.max(8, a3.top - h2 - 8) : Math.min(innerHeight - h2 - 8, a3.bottom + 8)}px`;
}
var fileTarget = (node) => {
  const el = node.closest?.("[data-link-path],[data-file-path],[data-diff-file]");
  return el ? { path: el.dataset.linkPath ?? el.dataset.filePath ?? el.dataset.diffFile, line: Number(el.dataset.linkLine) || null } : null;
};
var locateFile = (path2) => call("file:locate", { projectId: state.projectId, path: path2 });
function fileMenuHtml() {
  const f2 = menu.file, here = f2.inside && f2.exists, name = f2.path.split(/[\\/]/).filter(Boolean).pop() ?? f2.path;
  const item = (id, glyph, label, on = true) => `<button class="menu-item" data-file-menu="${id}" ${on ? "" : "disabled"}>${icon(glyph, "mi-icon")}<span class="mi-main"><span class="mi-name">${label}</span></span></button>`;
  const note = here ? "" : `<div class="menu-note">${icon("info")}<span>${f2.inside ? "\u8FD9\u4E2A\u6587\u4EF6\u5DF2\u7ECF\u4E0D\u5B58\u5728" : "\u4E0D\u5728\u5F53\u524D\u5DE5\u4F5C\u6587\u4EF6\u5939\u91CC\uFF0C\u53EA\u80FD\u590D\u5236\u8DEF\u5F84"}</span></div>`;
  return `<div class="menu-label" title="${esc6(f2.path)}">${esc6(name)}</div>${item("preview", "eye", "\u9884\u89C8", here && !!f2.preview)}${item("reveal", "folder", "\u5728\u8D44\u6E90\u7BA1\u7406\u5668\u4E2D\u663E\u793A", here)}${item("open", "external", "\u7528\u9ED8\u8BA4\u5E94\u7528\u6253\u5F00", here && f2.kind === "file" && f2.openable !== false)}${item("copy", "copy", "\u590D\u5236\u8DEF\u5F84")}${note}${here && f2.kind === "file" && f2.openable === false ? `<div class="menu-note">${icon("info")}<span>\u8FD9\u7C7B\u6587\u4EF6\u53EF\u80FD\u4F1A\u8FD0\u884C\u7A0B\u5E8F\uFF0C\u4E0D\u80FD\u76F4\u63A5\u6253\u5F00\uFF0C\u53EF\u4EE5\u5728\u8D44\u6E90\u7BA1\u7406\u5668\u91CC\u67E5\u770B</span></div>` : ""}`;
}
function linkMenuHtml() {
  const { host } = new URL(menu.url);
  return `<div class="menu-label" title="${esc6(menu.url)}">${esc6(host)}</div><button class="menu-item" data-link-menu="open">${icon("external", "mi-icon")}<span class="mi-main"><span class="mi-name">\u5728\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00</span></span></button><button class="menu-item" data-link-menu="copy">${icon("copy", "mi-icon")}<span class="mi-main"><span class="mi-name">\u590D\u5236\u94FE\u63A5</span></span></button>`;
}
async function previewFile(f2, line) {
  if (!f2.inside || !f2.exists) throw new Error(f2.inside ? "\u8FD9\u4E2A\u6587\u4EF6\u5DF2\u7ECF\u4E0D\u5B58\u5728" : "\u8FD9\u4E2A\u6587\u4EF6\u4E0D\u5728\u5F53\u524D\u5DE5\u4F5C\u6587\u4EF6\u5939\u91CC");
  if (f2.preview === "pdf") {
    await call("file:previewPdf", { projectId: state.projectId, path: f2.relative });
    return;
  }
  if (f2.preview === "image") {
    const found = await call("media:resolve", { sessionId: state.sessionId, href: f2.absolute });
    if (!found?.url) throw new Error("\u8FD9\u5F20\u56FE\u7247\u4E0D\u80FD\u9884\u89C8");
    openLightbox(found.url, found.name ?? f2.relative);
    return;
  }
  if (f2.preview !== "text") throw new Error(f2.openable === false ? "\u8FD9\u79CD\u6587\u4EF6\u4E0D\u80FD\u5728\u8FD9\u91CC\u9884\u89C8\uFF0C\u53EF\u4EE5\u53F3\u952E\u5728\u8D44\u6E90\u7BA1\u7406\u5668\u4E2D\u663E\u793A" : "\u8FD9\u79CD\u6587\u4EF6\u4E0D\u80FD\u5728\u8FD9\u91CC\u9884\u89C8\uFF0C\u53F3\u952E\u53EF\u4EE5\u7528\u9ED8\u8BA4\u5E94\u7528\u6253\u5F00");
  setRightTab("files");
  await openFile(f2.relative, false);
  const view = document.querySelector("#preview-pane .code-view");
  if (view && line) view.scrollTop = (line - 1) * parseFloat(getComputedStyle(view).lineHeight || "18");
}
async function fileMenuAction(id, f2) {
  if (id === "preview") return previewFile(f2, f2.line);
  if (id === "reveal") return call("file:reveal", { projectId: state.projectId, path: f2.relative });
  if (id === "open") return call("file:open", { projectId: state.projectId, path: f2.relative });
  await call("clipboard:write", { text: f2.absolute ?? f2.path });
  toast("\u5DF2\u590D\u5236\u8DEF\u5F84");
}
function folderMenuHtml() {
  return `<div class="menu-label">\u5DE5\u4F5C\u6587\u4EF6\u5939</div>${state.snapshot.projects.map((p) => `<button class="menu-item${p.id === state.projectId ? " selected" : ""}" data-pick-folder="${p.id}">${icon("folder", "mi-icon")}<span class="mi-main"><span class="mi-name">${esc6(p.name)}</span><span class="mi-sub">${esc6(p.path)}</span></span>${p.id === state.projectId ? icon("check", "mi-check") : ""}</button>`).join("")}${state.snapshot.projects.length ? '<div class="menu-sep"></div>' : ""}<button class="menu-item" id="menu-open-folder">${icon("folderPlus", "mi-icon")}<span class="mi-main"><span class="mi-name">\u6253\u5F00\u6587\u4EF6\u5939\u2026</span></span></button>`;
}
function envMenuHtml() {
  const s = session();
  if (s) {
    const r = runtime(s.runtimeId);
    return `<div class="menu-label">\u8FD0\u884C\u73AF\u5883</div><div class="menu-static">${tile2(r)}<span class="mi-main"><span class="mi-name">${esc6(r?.name ?? s.runtimeId)}</span><span class="mi-sub">\u4F1A\u8BDD\u521B\u5EFA\u540E\u4E0D\u80FD\u66F4\u6362\u8FD0\u884C\u73AF\u5883\u3002\u8981\u6362\u73AF\u5883\uFF0C\u8BF7\u65B0\u5EFA\u4F1A\u8BDD\u3002</span></span>${icon("lock", "mi-check")}</div>`;
  }
  return `<div class="menu-label">\u8FD0\u884C\u73AF\u5883 \xB7 \u5148\u9009\u73AF\u5883\uFF0C\u518D\u9009\u6A21\u578B</div>${state.snapshot.runtimes.map((r) => {
    const ok = usable(r), current = ok && r.id === state.runtimeId;
    return `<button class="menu-item env-item${current ? " selected" : ""}" data-env="${r.id}" ${ok ? "" : "disabled"}>${tile2(r)}<span class="mi-main"><span class="mi-name">${esc6(r.name)}<span class="mi-tag">${esc6(r.protocol)}</span></span><span class="mi-sub">${ok ? esc6(r.description) : r.checking ? esc6(unusableReason(r)) : `${esc6(unusableReason(r))} \xB7 \u53EF\u5728\u8BBE\u7F6E \u2192 \u8FD0\u884C\u73AF\u5883\u91CC\u5B89\u88C5\u6216\u6307\u5B9A\u8DEF\u5F84`}</span></span>${current ? icon("check", "mi-check") : ""}</button>`;
  }).join("")}<div class="menu-sep"></div><button class="menu-item subtle" data-open-settings="runtimes">${icon("settings", "mi-icon")}<span class="mi-main"><span class="mi-name">\u7BA1\u7406\u8FD0\u884C\u73AF\u5883\u2026</span></span></button>`;
}
function sessionMenuHtml() {
  const s = session();
  return `<button class="menu-item" id="menu-rename">${icon("edit", "mi-icon")}<span class="mi-main"><span class="mi-name">\u91CD\u547D\u540D</span></span></button><button class="menu-item" id="menu-reveal">${icon("folder", "mi-icon")}<span class="mi-main"><span class="mi-name">\u5728\u8D44\u6E90\u7BA1\u7406\u5668\u4E2D\u6253\u5F00\u6587\u4EF6\u5939</span></span></button><button class="menu-item" id="menu-feedback">${icon("download", "mi-icon")}<span class="mi-main"><span class="mi-name">\u5BFC\u51FA\u53CD\u9988\u2026</span><span class="mi-sub">\u6253\u5305\u8FD9\u4E2A\u4F1A\u8BDD\u7684\u62A5\u9519\u548C\u7EA0\u6B63\u8BB0\u5F55</span></span></button><div class="menu-sep"></div><button class="menu-item danger" data-archive="${s?.id ?? ""}" ${busy(s) ? "disabled" : ""}>${icon("archive", "mi-icon")}<span class="mi-main"><span class="mi-name">\u5F52\u6863\u4F1A\u8BDD</span></span></button>`;
}
var sourcePrefix = { qoder: "Q-", workbuddy: "W-" };
var sourceName = (m) => `${sourcePrefix[m?.source] ?? ""}${m?.name ?? ""}`;
var openGroups = /* @__PURE__ */ new Set();
var factorText = (v2) => Number.isFinite(v2) ? `\xD7${Number(v2.toFixed(3))}` : "";
function clockIn(timezone, now = /* @__PURE__ */ new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone || "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
    const h2 = Number(parts.find((p) => p.type === "hour")?.value) % 24, m = Number(parts.find((p) => p.type === "minute")?.value);
    return h2 * 60 + m;
  } catch {
    return now.getHours() * 60 + now.getMinutes();
  }
}
var minutesOf = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
var WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function dayIn(timezone, now = /* @__PURE__ */ new Date()) {
  try {
    return WEEKDAY[new Intl.DateTimeFormat("en-US", { timeZone: timezone || "Asia/Shanghai", weekday: "short" }).format(now)] ?? now.getDay();
  } catch {
    return now.getDay();
  }
}
function peakActive(peak, now = /* @__PURE__ */ new Date()) {
  if (!peak || !(peak.days ?? []).includes(dayIn(peak.timezone, now))) return false;
  const t = clockIn(peak.timezone, now);
  return (peak.ranges ?? []).some(([s, e]) => {
    const a3 = minutesOf(s), b = minutesOf(e);
    return a3 !== null && b !== null && t >= a3 && t < b;
  });
}
var windowWord = (w2) => String(w2?.label || "\u4F4E\u5CF0").replace(/\s*[\d.]+\s*折\s*$/, "").trim() || "\u4F4E\u5CF0";
function priceNow(pricing, now = /* @__PURE__ */ new Date()) {
  if (!pricing) return null;
  const until = pricing.freeUntil ? Date.parse(pricing.freeUntil) : NaN;
  const free = pricing.free === true && (!Number.isFinite(until) || until > now.getTime());
  const base = Number.isFinite(pricing.base) ? pricing.base : null;
  let active = null, next = null;
  for (const w2 of Array.isArray(pricing.windows) ? pricing.windows : []) {
    const s = minutesOf(w2.start), e = minutesOf(w2.end);
    if (s === null || e === null || !Number.isFinite(w2.factor)) continue;
    const t = clockIn(w2.timezone, now), inside = s <= e ? t >= s && t < e : t >= s || t < e;
    if (inside) {
      if (!active || w2.factor < active.factor) active = w2;
      continue;
    }
    const wait = (s - t + 1440) % 1440;
    if (wait <= 180 && (!next || wait < next.wait)) next = { ...w2, wait };
  }
  const value = free ? 0 : base === null ? null : active ? base * active.factor : base;
  return { free, base, value, active, next, until: free && Number.isFinite(until) ? until : null, peak: peakActive(pricing.peak, now) };
}
var windowText = (w2) => `${windowWord(w2)} ${w2.start}\u2013${w2.end}${w2.timezone && w2.timezone !== "Asia/Shanghai" ? `\uFF08${w2.timezone}\uFF09` : ""}\uFF0C${Number(((w2.factor ?? 1) * 10).toFixed(1))} \u6298`;
function priceTag(m) {
  const p = priceNow(m.pricing);
  if (!p) return "";
  const tip = ["\u79EF\u5206\u500D\u7387" + (Number.isFinite(p.base) ? ` ${factorText(p.base)}` : ""), m.pricing.original && m.pricing.original !== p.base ? `\u539F\u4EF7 ${factorText(m.pricing.original)}` : "", m.pricing.badge, ...(m.pricing.windows ?? []).map(windowText), m.pricing.peak?.note, p.until ? `\u9650\u514D\u81F3 ${new Date(p.until).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""].filter(Boolean).join("\n");
  if (p.free) return `<span class="mi-tag price free" title="${esc6(tip)}">${m.pricing.limited || p.until ? "\u9650\u514D" : "\u514D\u8D39"}</span>`;
  if (p.value === null) return "";
  const peak = p.peak ? `<span class="mi-tag price peak" title="${esc6(m.pricing.peak?.note ?? "")}">${esc6(m.pricing.peak?.label || "\u9AD8\u5CF0")} \xD7${m.pricing.peak?.factor ?? 2}</span>` : "";
  const original = Number.isFinite(m.pricing.original) && m.pricing.original !== p.value ? m.pricing.original : p.active ? p.base : null;
  if (p.active) return `<span class="mi-tag price deal" title="${esc6(tip)}">${esc6(windowWord(p.active))} ${factorText(p.value)}<s>${factorText(original)}</s></span>${peak}`;
  const soon = p.next ? `<span class="mi-tag price soon" title="${esc6(tip)}">${p.next.wait < 60 ? `${p.next.wait} \u5206\u949F\u540E` : `${p.next.start} \u8D77`}${esc6(windowWord(p.next))} ${factorText(p.base * p.next.factor)}</span>` : "";
  return `<span class="mi-tag price${original ? " deal" : ""}" title="${esc6(tip)}">${factorText(p.value)}${original ? `<s>${factorText(original)}</s>` : ""}</span>${peak}${soon}`;
}
function balanceText(source) {
  const a3 = state.snapshot?.catalog?.[source]?.account;
  if (!a3 || !Number.isFinite(a3.balance)) return "";
  const n = a3.balance >= 1e3 ? Math.round(a3.balance).toLocaleString("zh-CN") : Number(a3.balance.toFixed(1)).toString();
  return `<span class="mg-balance" title="${esc6(`${a3.unit ?? "\u79EF\u5206"}\u4F59\u989D${a3.fetchedAt ? `\uFF0C${since(a3.fetchedAt)}\u66F4\u65B0` : ""}`)}">\u4F59\u989D ${esc6(n)}</span>`;
}
function modelItemHtml(m) {
  return `<button class="menu-item model-item${m.key === state.modelKey ? " selected" : ""}" data-model-key="${esc6(m.key)}"><span class="mi-main"><span class="mi-name">${esc6(sourceName(m))}</span><span class="mi-sub mono">${esc6(m.id)}</span></span><span class="mi-tags">${priceTag(m)}${m.reasoning.some((e) => e !== "none") ? '<span class="mi-tag">\u601D\u8003</span>' : ""}${m.contextMaximum ? `<span class="mi-tag">${compact(m.contextMaximum)}</span>` : ""}</span>${m.key === state.modelKey ? icon("check", "mi-check") : ""}</button>`;
}
function modelListHtml() {
  const env = state.runtimeId, q2 = state.menuSearch.trim().toLowerCase();
  const groups = ["qoder", "workbuddy", "antigravity"].map((source) => {
    const all = models().filter((m) => m.source === source && compatible(env, m));
    const list = all.filter((m) => !q2 || `${sourceName(m)} ${m.name} ${m.id}`.toLowerCase().includes(q2));
    if (!list.length) return "";
    const open2 = !!q2 || openGroups.has(source), chosen = all.find((m) => m.key === state.modelKey);
    return `<div class="model-group${open2 ? " open" : ""}"><button class="model-group-head" data-model-group="${source}" aria-expanded="${open2}">${icon("chevronRight", "mg-caret")}<span class="mg-name">${esc6(sourceNames[source])}</span><span class="mg-count">${q2 ? `${list.length}/${all.length}` : all.length} \u4E2A</span>${balanceText(source)}${chosen && !open2 ? `<span class="mg-chosen" title="\u5F53\u524D\u9009\u62E9">${icon("check")}${esc6(sourceName(chosen))}</span>` : ""}</button>${open2 ? `<div class="model-group-body">${list.map(modelItemHtml).join("")}</div>` : ""}</div>`;
  }).join("");
  const native = !gatewayOnly(env) && (!q2 || "\u539F\u751F native".includes(q2)) ? `<div class="menu-label">\u539F\u751F</div><button class="menu-item model-item${state.modelKey === "native" ? " selected" : ""}" data-model-key="native"><span class="mi-main"><span class="mi-name">\u539F\u751F\u6A21\u578B\u8BBE\u7F6E</span><span class="mi-sub">\u4F7F\u7528 ${esc6(runtime(env)?.name ?? "")} \u81EA\u5DF1\u7684\u6A21\u578B\u4E0E\u767B\u5F55</span></span>${state.modelKey === "native" ? icon("check", "mi-check") : ""}</button>` : "";
  return groups + native || `<div class="menu-empty">${models().length ? "\u6CA1\u6709\u5339\u914D\u7684\u6A21\u578B" : "\u8FD8\u6CA1\u6709\u6A21\u578B\u76EE\u5F55\u3002\u8BF7\u5230\u8BBE\u7F6E \u2192 \u6A21\u578B\u6E90\u4E0B\u8F7D\u7EC4\u4EF6\u5E76\u767B\u5F55\u3002"}</div>`;
}
function effortRow(model, value) {
  if (!model.reasoning.length) return `<div class="param"><span class="param-label">${icon("bulb")}\u601D\u8003\u5F3A\u5EA6</span><span class="param-inline">\u6765\u6E90\u672A\u58F0\u660E\u6863\u4F4D\uFF0C\u4F7F\u7528\u9ED8\u8BA4</span></div>`;
  return `<div class="param"><span class="param-label">${icon("bulb")}\u601D\u8003\u5F3A\u5EA6</span><div class="seg">${["", ...model.reasoning].map((e) => `<button class="${value === e ? "on" : ""}" data-effort="${esc6(e)}">${e ? esc6(effortName(e)) : `\u9ED8\u8BA4${model.defaultReasoning ? `<small>${esc6(effortName(model.defaultReasoning))}</small>` : ""}`}</button>`).join("")}</div></div>`;
}
function contextRow(model, value) {
  if (!model.contexts.length) return "";
  return `<div class="param"><span class="param-label">${icon("window")}\u4E0A\u4E0B\u6587\u7A97\u53E3</span><div class="seg">${[...model.contexts].sort((a3, b) => a3.tokens - b.tokens).map((c) => `<button class="${value === c.tokens ? "on" : ""}" data-context="${c.tokens}">${compact(c.tokens)}${c.tokens === model.defaultContextTokens ? "<small>\u9ED8\u8BA4</small>" : ""}</button>`).join("")}</div></div>`;
}
function budgetRow(model, value, context) {
  if (!model.contextMaximum) return "";
  const max = budgetMax(model, context), text3 = value ? formatTokens(value) : "";
  return `<div class="param"><span class="param-label">${icon("database")}\u672C\u5730\u538B\u7F29\u9884\u7B97</span><div class="budget"><input id="budget-input" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="\u4E0D\u8BBE\u7F6E" value="${esc6(text3)}" data-max="${max ?? ""}" aria-describedby="budget-help" title="\u53EF\u4EE5\u5199 900K\u30011M\u30010.75M\u300190\u4E07 \u6216\u5177\u4F53\u6570\u5B57\uFF1BK\u3001M \u6309 1000 \u8FDB\u4F4D\uFF0C\u548C\u6A21\u578B\u6E90\u6807\u7684\u7A97\u53E3\u4E00\u81F4"><span class="budget-help" id="budget-help">${esc6(value ? budgetCheck(text3, { max }).text : `\u4F8B\u5982 200K\u30010.5M\uFF0C\u6700\u5927 ${compact(max)}`)}</span></div></div>`;
}
function paintBudgetHelp(input) {
  const help = $2("#budget-help");
  if (!input || !help) return;
  const check = budgetCheck(input.value, { max: Number(input.dataset.max) || null });
  help.textContent = input.value.trim() ? check.text : `\u4F8B\u5982 200K\u30010.5M\uFF0C\u6700\u5927 ${compact(Number(input.dataset.max) || null)}`;
  help.classList.toggle("bad", !check.ok);
  input.classList.toggle("bad", !check.ok);
}
var budgetNote = "\u9884\u7B97\u53EA\u51B3\u5B9A\u8FD0\u884C\u73AF\u5883\u4F55\u65F6\u538B\u7F29\u4E0A\u4E0B\u6587\uFF0C\u4E0D\u6539\u53D8\u4E0A\u6E38\u7A97\u53E3\u3002\u9884\u7B97\u8D8A\u5927\uFF0C\u6BCF\u4E00\u6B65\u91CD\u53D1\u7ED9\u6A21\u578B\u7684\u5386\u53F2\u8D8A\u591A\uFF0C\u7528\u91CF\u4E5F\u8D8A\u5927\u3002";
function paramsHtml() {
  if (state.modelKey === "native") return nativeParamsHtml();
  const m = currentModel();
  if (!m) return "";
  if (m.source === "antigravity") return `<div class="param-note">${icon("info")}<span>Gemini \u7531 Antigravity \u539F\u751F\u6267\u884C\u3002\u601D\u8003\u6863\u4F4D\u5DF2\u5305\u542B\u5728\u6A21\u578B ID \u4E2D\uFF0C\u4E0A\u4E0B\u6587\u7531\u539F\u751F\u540E\u7AEF\u7BA1\u7406\u3002</span></div>`;
  return `${effortRow(m, state.reasoning)}${contextRow(m, state.contextTokens)}${budgetRow(m, state.contextBudget, state.contextTokens)}<div class="param-hint">${budgetNote}</div><div class="param-actions"><button class="btn sm" id="save-model-default">${icon("check")}\u8BB0\u4F4F\u6B64\u642D\u914D</button></div>`;
}
function nativeEfforts() {
  const rows = nativeCatalog.get(state.runtimeId) ?? [], row = rows.find((r) => r.id === state.nativeModel);
  const list = row?.reasoning?.length ? row.reasoning : state.runtimeId === "codex" ? [] : ["low", "medium", "high", "xhigh", "max"];
  return state.reasoning && !list.includes(state.reasoning) ? [...list, state.reasoning] : list;
}
function nativeChoiceHtml() {
  const rows = nativeCatalog.get(state.runtimeId) ?? [];
  if (!rows.length) return "";
  const group = (items, label) => items.length ? `<optgroup label="${label}">${items.map((r) => `<option value="${esc6(r.id)}">${esc6(r.name)} \xB7 ${esc6(r.id)}${r.hidden ? " \xB7 \u9690\u85CF" : ""}</option>`).join("")}</optgroup>` : "";
  return `<select id="native-model-choice" aria-label="\u5B8C\u6574\u539F\u751F\u6A21\u578B\u5217\u8868"><option value="">\u624B\u52A8\u586B\u5199 / \u539F\u751F\u5F53\u524D\u6A21\u578B</option>${group(rows.filter((r) => !r.hidden), "\u5E38\u89C4\u6A21\u578B")}${group(rows.filter((r) => r.hidden), "\u539F\u751F\u9690\u85CF\u6761\u76EE")}</select>`;
}
function nativeParamsHtml() {
  const rows = nativeCatalog.get(state.runtimeId) ?? [], canList = ["codex", "antigravity"].includes(state.runtimeId);
  return `<div class="param"><span class="param-label">${icon("cpu")}\u539F\u751F\u6A21\u578B ID</span><div class="native-row"><input id="native-id" placeholder="\u7559\u7A7A\u4F7F\u7528\u539F\u751F\u5F53\u524D\u6A21\u578B" value="${esc6(state.nativeModel)}" autocomplete="off" spellcheck="false">${canList ? `<button class="btn sm" id="load-native-models">${rows.length ? "\u5237\u65B0\u76EE\u5F55" : "\u8BFB\u53D6\u539F\u751F\u76EE\u5F55"}</button>` : ""}</div></div>
    <div id="native-choice-slot">${nativeChoiceHtml()}</div>
    <div class="param"><span class="param-label">${icon("bulb")}\u601D\u8003\u5F3A\u5EA6</span><select id="native-effort"><option value="">\u539F\u751F\u9ED8\u8BA4</option>${nativeEfforts().map((e) => `<option value="${esc6(e)}" ${state.reasoning === e ? "selected" : ""}>${esc6(effortName(e))}</option>`).join("")}</select></div>
    <div class="param-hint" id="native-model-summary">${rows.length ? `\u5171 ${rows.length} \u4E2A\u539F\u751F\u6A21\u578B${rows.some((r) => r.hidden) ? `\uFF08\u542B ${rows.filter((r) => r.hidden).length} \u4E2A\u9690\u85CF\u6761\u76EE\uFF09` : ""}` : "\u5DE5\u5177\u3001\u6280\u80FD\u3001MCP \u4E0E\u6743\u9650\u90FD\u4F7F\u7528\u539F\u751F\u914D\u7F6E\u3002"}</div>
    <div class="param-actions"><button class="btn sm" id="save-model-default">${icon("check")}\u8BB0\u4F4F\u6B64\u642D\u914D</button></div>`;
}
function syncNativeChoice() {
  const choice = $2("#native-model-choice");
  if (choice) choice.value = (nativeCatalog.get(state.runtimeId) ?? []).some((r) => r.id === state.nativeModel) ? state.nativeModel : "";
  repaintNativeEffort();
  renderComposerControls();
}
function repaintNativeEffort() {
  const select = $2("#native-effort");
  if (!select) return;
  const efforts = nativeEfforts();
  if (!efforts.includes(state.reasoning)) state.reasoning = "";
  select.innerHTML = `<option value="">\u539F\u751F\u9ED8\u8BA4</option>${efforts.map((e) => `<option value="${esc6(e)}">${esc6(effortName(e))}</option>`).join("")}`;
  select.value = state.reasoning;
}
function sessionParamsHtml(s) {
  const m = modelOf(s.selection), p = state.params;
  const native = s.selection.modelKey === "native";
  if (!m || m.source === "antigravity") return `<div class="menu-session-head">${icon("lock")}<div><b>${esc6(m?.name ?? (native ? "\u539F\u751F\u6A21\u578B" : s.selection.modelKey))}</b><small>${esc6(native ? s.selection.nativeModel || "\u539F\u751F\u5F53\u524D\u6A21\u578B" : m ? m.id : "\u4E0D\u5728\u5F53\u524D\u6A21\u578B\u76EE\u5F55\u4E2D")}</small></div></div><div class="param-note">${icon("info")}<span>${m ? "Gemini \u7531 Antigravity \u539F\u751F\u6267\u884C\uFF0C\u53C2\u6570\u5728\u539F\u751F\u754C\u9762\u4E2D\u8C03\u6574\u3002" : native ? "\u539F\u751F\u6A21\u578B\u4F1A\u8BDD\u7684\u53C2\u6570\u8BF7\u5728\u539F\u751F\u754C\u9762\u4E2D\u8C03\u6574\u3002" : "\u8FD9\u4E2A\u6A21\u578B\u4E0D\u5728\u5F53\u524D\u76EE\u5F55\u4E2D\u3002\u8BF7\u5237\u65B0\u6A21\u578B\u6E90\uFF0C\u518D\u7528\u7F16\u8F91\u6846\u4E0A\u65B9\u7684\u201C\u91CD\u65B0\u786E\u8BA4\u6A21\u578B\u201D\u3002"}</span></div>`;
  const running2 = busy(s), pending2 = s.selectionNext;
  const queued = pending2 ? `<div class="param-pending">${icon("clock")}<span><b>\u5DF2\u6392\u961F</b>${esc6(paramsText(pending2))}<small>\u672C\u8F6E\u7ED3\u675F\u540E\u81EA\u52A8\u5E94\u7528</small></span><button class="btn sm" id="cancel-session-params">\u53D6\u6D88\u6392\u961F</button></div>` : "";
  const timing = running2 ? "\u4EFB\u52A1\u6B63\u5728\u8FD0\u884C\uFF1A\u65B0\u53C2\u6570\u5148\u6392\u961F\uFF0C\u672C\u8F6E\u7ED3\u675F\u540E\u81EA\u52A8\u5E94\u7528\uFF0C\u5E94\u7528\u524D\u53EF\u4EE5\u968F\u65F6\u53D6\u6D88\u3002" : "";
  return `<div class="menu-session-head">${icon("lock")}<div><b>${esc6(m.name)}</b><small>${esc6(sourceNames[m.source])} \xB7 ${esc6(m.id)}</small></div></div><div class="menu-params">${effortRow(m, p.reasoning)}${contextRow(m, p.contextTokens)}${budgetRow(m, p.contextBudget, p.contextTokens)}<div class="param-hint">${budgetNote}\u4F1A\u8BDD\u521B\u5EFA\u540E\u4E0D\u80FD\u66F4\u6362\u6A21\u578B\u6216\u8FD0\u884C\u73AF\u5883\uFF1B\u5E94\u7528\u65B0\u53C2\u6570\u4F1A\u91CD\u542F\u8FD9\u4E2A\u4F1A\u8BDD\u7684\u8FD0\u884C\u73AF\u5883\uFF0C\u4E0B\u4E00\u8F6E\u4F1A\u91CD\u65B0\u53D1\u9001\u5B8C\u6574\u4E0A\u4E0B\u6587\u3002${timing}</div>${queued}<div class="param-actions"><button class="btn primary sm" id="apply-session-params">${running2 ? pending2 ? "\u66FF\u6362\u6392\u961F\u7684\u53C2\u6570" : "\u672C\u8F6E\u7ED3\u675F\u540E\u5E94\u7528" : "\u5E94\u7528\u5230\u6B64\u4F1A\u8BDD"}</button></div></div>`;
}
function modelMenuHtml() {
  const s = session();
  if (s) return sessionParamsHtml(s);
  return `<div class="menu-search">${icon("search")}<input id="menu-search" placeholder="\u641C\u7D22\u6A21\u578B\u540D\u79F0\u6216 ID" autocomplete="off" spellcheck="false"></div><div class="menu-list" id="menu-list">${modelListHtml()}</div><div class="menu-params" id="menu-params">${paramsHtml()}</div>`;
}
var paramTarget = () => session() ? state.params : state;
function setBudget(raw) {
  const s = session(), target = paramTarget(), m = s ? modelOf(s.selection) : currentModel(), check = budgetCheck(raw, { max: budgetMax(m, target.contextTokens) });
  if (!check.ok || check.value !== null && !validBudget(m, check.value, target.contextTokens)) throw new Error(`\u672C\u5730\u538B\u7F29\u9884\u7B97\uFF1A${check.ok ? "\u8D85\u51FA\u8FD9\u4E2A\u6A21\u578B\u5141\u8BB8\u7684\u8303\u56F4" : check.text}`);
  target.contextBudget = check.value;
  const input = $2("#budget-input");
  if (input) {
    input.value = check.value ? formatTokens(check.value) : "";
    paintBudgetHelp(input);
  }
  if (!s) renderComposerControls();
}
async function loadNativeModels() {
  const button = $2("#load-native-models"), runtimeId = state.runtimeId, projectId = state.projectId;
  if (!button) return;
  button.disabled = true;
  button.textContent = "\u8BFB\u53D6\u4E2D\u2026";
  try {
    const rows = await call("native:models", { runtimeId, projectId });
    if (!Array.isArray(rows)) throw new Error("\u539F\u751F\u540E\u7AEF\u8FD4\u56DE\u4E86\u65E0\u6548\u76EE\u5F55");
    nativeCatalog.set(runtimeId, rows);
    if (!state.nativeModel) state.nativeModel = (rows.find((r) => r.isDefault) ?? rows.find((r) => !r.hidden) ?? rows[0])?.id ?? "";
  } catch (error) {
    toast(error.message, true);
  } finally {
    if (menu?.kind === "model" && state.runtimeId === runtimeId) {
      const params = $2("#menu-params");
      if (params) {
        params.innerHTML = paramsHtml();
        bindNativeInputs();
        placeMenu();
      }
      syncNativeChoice();
    }
  }
}
function bindNativeInputs() {
  bind("#native-id", "input", (e) => {
    state.nativeModel = e.target.value.trim();
    syncNativeChoice();
  });
  bind("#native-model-choice", "change", (e) => {
    state.nativeModel = e.target.value;
    const input = $2("#native-id");
    if (input) input.value = e.target.value;
    repaintNativeEffort();
    renderComposerControls();
  });
  bind("#native-effort", "change", (e) => {
    state.reasoning = e.target.value;
    renderComposerControls();
  });
  bind("#budget-input", "input", (e) => paintBudgetHelp(e.target));
  bind("#budget-input", "change", (e) => void action(() => setBudget(e.target.value)));
  bind("#budget-input", "keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      e.target.blur();
    }
  });
}
function repaintParams() {
  const s = session();
  if (s) {
    paintMenu();
    return;
  }
  const params = $2("#menu-params");
  if (params) {
    params.innerHTML = paramsHtml();
    bindNativeInputs();
  }
  const list = $2("#menu-list");
  if (list) list.innerHTML = modelListHtml();
  renderComposerControls();
  renderBanner();
  placeMenu();
}
function renderRightFrame() {
  $2("#rightpanel").innerHTML = `<div class="rp-head"><div class="rp-tabs" id="rp-tabs"></div><button class="icon-btn" id="collapse-right" title="\u6536\u8D77\u53F3\u4FA7\u9762\u677F (Ctrl+Alt+B)">${icon("panelRight")}</button></div><div class="rp-body" id="rp-body"></div><div class="rp-resizer" id="rp-resizer" title="\u62D6\u52A8\u8C03\u6574\u5BBD\u5EA6"></div>`;
  renderRightTabs();
}
function renderRightTabs() {
  const el = $2("#rp-tabs");
  if (!el) return;
  const live = state.snapshot?.sessions.filter((s) => !s.archived && busy(s)).length ?? 0, changes = state.git?.files?.length ?? 0;
  el.innerHTML = [["changes", "fileDiff", "\u53D8\u66F4", changes], ["files", "file", "\u6587\u4EF6", 0], ["tasks", "activity", "\u4EFB\u52A1", live]].map(([id, ico, label, n]) => `<button class="rp-tab${ui.rightTab === id ? " active" : ""}" data-rtab="${id}">${icon(ico)}<span>${label}</span>${n ? `<span class="tab-badge${id === "tasks" ? " live" : ""}">${n}</span>` : ""}</button>`).join("");
}
function renderRightBody() {
  if (!ui.right) return;
  rightEpoch++;
  if (ui.rightTab === "files") void renderFiles();
  else if (ui.rightTab === "tasks") renderTasks();
  else void renderChanges();
}
var emptyPane = (ico, text3, extra = "") => `<div class="pane-empty">${icon(ico)}<span>${esc6(text3)}</span>${extra}</div>`;
function statusClass(status) {
  const s = status.trim();
  return s === "??" ? "untracked" : s.includes("D") ? "deleted" : s.includes("A") ? "added" : s.includes("R") ? "renamed" : "modified";
}
function lastAgentDiff() {
  for (let i2 = state.events.length - 1; i2 >= 0; i2--) if (state.events[i2].type === "diff") return state.events[i2];
  return null;
}
function paintChanges() {
  const body = $2("#rp-body"), g = state.git;
  if (!body || ui.rightTab !== "changes" || !g) return;
  const agent = lastAgentDiff(), agentOpen = !!body.querySelector(".agent-diff")?.open, message = body.querySelector("#commit-message")?.value ?? "", checked = new Set([...body.querySelectorAll('input[name="stage-file"]:checked')].map((x2) => x2.value));
  const rows = g.files.map((f2) => {
    const slash = f2.path.lastIndexOf("/"), dir = slash >= 0 ? f2.path.slice(0, slash + 1) : "", name = f2.path.slice(slash + 1), staged = f2.status[0] !== " " && f2.status[0] !== "?";
    return `<div class="change-row${state.diffPath === f2.path ? " open" : ""}"><input type="checkbox" name="stage-file" value="${esc6(f2.path)}" aria-label="\u9009\u62E9 ${esc6(f2.path)}"><button class="change-main" data-diff-file="${esc6(f2.path)}" title="${esc6(f2.oldPath ? `${f2.oldPath} \u2192 ${f2.path}` : f2.path)}"><span class="badge ${statusClass(f2.status)}">${esc6(f2.status.trim() === "??" ? "U" : f2.status.trim()[0] ?? "M")}</span><span class="change-path"><span class="change-name">${esc6(name)}</span><span class="change-dir">${esc6(dir)}</span></span>${staged ? '<span class="staged">\u5DF2\u6682\u5B58</span>' : ""}</button></div>${state.diffPath === f2.path ? `<div class="diff-box" id="diff-container">${diffHtml(state.diff)}</div>` : ""}`;
  }).join("");
  body.innerHTML = `<div class="changes"><div class="pane-toolbar"><span class="pane-title">${icon("git")}${g.repository ? esc6(g.branch) : "\u672A\u521D\u59CB\u5316 Git"}</span><span class="pane-meta">${g.repository ? `${g.files.length} \u4E2A\u6587\u4EF6` : ""}</span><button class="icon-btn sm" id="refresh-git" title="\u5237\u65B0">${icon("refresh")}</button></div>
    ${agent ? `<details class="agent-diff" data-expand="agent-diff"><summary>${icon("spark")}<span>\u672C\u4F1A\u8BDD Agent \u62A5\u544A\u7684\u53D8\u66F4</span><span class="muted">${esc6(typeof agent.text === "string" && agent.text ? diffStat(agent.text) : "")}</span></summary>${typeof agent.text === "string" && agent.text ? diffHtml(agent.text) : `<pre>${esc6(clip2(pretty(agent.data)))}</pre>`}</details>` : ""}
    ${!g.repository ? emptyPane("git", "\u8FD9\u4E2A\u6587\u4EF6\u5939\u8FD8\u4E0D\u662F Git \u4ED3\u5E93", '<button class="btn sm" id="init-git">\u521D\u59CB\u5316 Git \u4ED3\u5E93</button>') : !g.files.length ? emptyPane("check", "\u5DE5\u4F5C\u76EE\u5F55\u662F\u5E72\u51C0\u7684", "<small>Agent \u4FEE\u6539\u7684\u6587\u4EF6\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002</small>") : `<div class="change-list">${rows}</div><div class="commit-box"><div class="commit-actions"><button class="btn sm" id="stage-selected">\u6682\u5B58\u6240\u9009</button><span class="muted">\u53EA\u63D0\u4EA4\u5DF2\u6682\u5B58\u7684\u53D8\u66F4</span></div><textarea id="commit-message" rows="2" placeholder="\u63D0\u4EA4\u8BF4\u660E"></textarea><button class="btn primary sm" id="commit">${icon("check")}\u63D0\u4EA4\u5230\u672C\u5730</button></div>`}</div>`;
  const details = body.querySelector(".agent-diff");
  if (details) details.open = agentOpen;
  const box = body.querySelector("#commit-message");
  if (box) box.value = message;
  for (const input of body.querySelectorAll('input[name="stage-file"]')) input.checked = checked.has(input.value);
}
async function renderChanges() {
  const body = $2("#rp-body"), projectId = state.projectId, epoch = rightEpoch;
  if (!body) return;
  if (!project()) {
    body.innerHTML = emptyPane("fileDiff", "\u6253\u5F00\u4E00\u4E2A\u5DE5\u4F5C\u6587\u4EF6\u5939\u540E\uFF0C\u8FD9\u91CC\u4F1A\u5217\u51FA\u6587\u4EF6\u53D8\u66F4\u3002");
    return;
  }
  if (state.git) paintChanges();
  else body.innerHTML = '<div class="pane-loading"><span class="spinner"></span>\u8BFB\u53D6 Git \u72B6\u6001\u2026</div>';
  try {
    const g = await call("git:status", { projectId });
    if (projectId !== state.projectId || epoch !== rightEpoch || ui.rightTab !== "changes") return;
    state.git = g;
    if (state.diffPath && !g.files.some((f2) => f2.path === state.diffPath)) {
      state.diffPath = null;
      state.diff = "";
    }
    paintChanges();
    renderRightTabs();
  } catch (e) {
    toast(e.message, true);
  }
}
async function showDiff(path2) {
  if (state.diffPath === path2) {
    state.diffPath = null;
    state.diff = "";
    paintChanges();
    return;
  }
  const projectId = state.projectId, diff = await call("git:diff", { projectId, path: path2 });
  if (projectId !== state.projectId) return;
  state.diffPath = path2;
  state.diff = diff;
  paintChanges();
}
async function loadTree(path2 = "", projectId = state.projectId, cache = state.tree) {
  cache.set(path2, await call("project:tree", { projectId, path: path2 }));
}
function treeHtml(path2 = "", depth = 0) {
  return (state.tree.get(path2) ?? []).map((f2) => `<button class="tree-row d${Math.min(depth, 9)}${state.file?.path === f2.path ? " active" : ""}" data-file-path="${esc6(f2.path)}" data-directory="${f2.directory}">${f2.directory ? icon(state.expanded.has(f2.path) ? "chevronDown" : "chevronRight", "tree-caret") : '<span class="tree-caret"></span>'}${icon(f2.directory ? "folder" : "file", "tree-icon")}<span class="tree-name">${esc6(f2.name)}</span></button>${f2.directory && state.expanded.has(f2.path) ? treeHtml(f2.path, depth + 1) : ""}`).join("");
}
function codeHtml(text3) {
  const lines = text3.split("\n"), max = 4e3;
  return `<pre class="code">${lines.slice(0, max).map((l, i2) => `<span class="cl"><span class="ln">${i2 + 1}</span><span class="lc">${esc6(l) || " "}</span></span>`).join("")}</pre>${lines.length > max ? `<div class="pane-note">\u4EC5\u9884\u89C8\u524D ${max} \u884C\uFF0C\u5171 ${lines.length.toLocaleString()} \u884C\u3002\u8FDB\u5165\u7F16\u8F91\u53EF\u67E5\u770B\u5168\u90E8\u5185\u5BB9\u3002</div>` : ""}`;
}
async function renderFiles() {
  const body = $2("#rp-body"), projectId = state.projectId, epoch = rightEpoch;
  if (!body) return;
  if (!project()) {
    body.innerHTML = emptyPane("file", "\u6253\u5F00\u4E00\u4E2A\u5DE5\u4F5C\u6587\u4EF6\u5939\u540E\uFF0C\u53EF\u4EE5\u5728\u8FD9\u91CC\u6D4F\u89C8\u4E0E\u9884\u89C8\u6587\u4EF6\u3002");
    return;
  }
  try {
    if (!state.tree.has("")) await loadTree();
    if (projectId !== state.projectId || epoch !== rightEpoch || ui.rightTab !== "files") return;
    const f2 = state.file;
    body.innerHTML = `<div class="files${f2 ? " has-file" : ""}"><div class="tree-pane"><div class="pane-toolbar"><span class="pane-title">${icon("folder")}${esc6(project().name)}</span><button class="icon-btn sm" id="refresh-files" title="\u5237\u65B0">${icon("refresh")}</button></div><div id="tree" class="tree">${treeHtml() || '<div class="pane-empty small">\u7A7A\u6587\u4EF6\u5939</div>'}</div></div>
      ${f2 ? `<div class="preview-pane${state.dirty ? " dirty" : ""}" id="preview-pane"><div class="pane-toolbar"><span class="pane-title mono" title="${esc6(f2.path)}">${icon("file")}<span class="file-path">${esc6(f2.path)}</span><i class="dirty-dot" title="\u672A\u4FDD\u5B58"></i></span><span class="pane-actions">${f2.editing ? '<button class="btn sm" id="cancel-edit">\u5B8C\u6210</button><button class="btn primary sm" id="save-file">\u4FDD\u5B58</button>' : `<button class="btn sm" id="reference-file" title="\u628A\u6587\u4EF6\u8DEF\u5F84\u52A0\u5165\u4EFB\u52A1\u8349\u7A3F">\u5F15\u7528</button><button class="btn sm" id="edit-file">${icon("edit")}\u7F16\u8F91</button>`}<button class="icon-btn sm" id="close-file" title="\u5173\u95ED\u6587\u4EF6">${icon("close")}</button></span></div>${f2.editing ? '<textarea id="editor" class="editor" spellcheck="false" aria-label="\u6587\u4EF6\u7F16\u8F91\u5668"></textarea>' : `<div class="code-view">${codeHtml(f2.text)}</div>`}</div>` : ""}</div>`;
    if (f2?.editing) {
      const editor = $2("#editor");
      editor.value = f2.text;
      editor.addEventListener("input", (e) => {
        state.file.text = e.target.value;
        if (!state.dirty) {
          state.dirty = true;
          $2("#preview-pane")?.classList.add("dirty");
        }
        reportDirty();
      });
    }
  } catch (e) {
    toast(e.message, true);
  }
}
async function openFile(path2, directory) {
  const projectId = state.projectId, cache = state.tree, expanded = state.expanded, token = ++fileEpoch;
  if (directory) {
    if (expanded.has(path2)) expanded.delete(path2);
    else {
      await loadTree(path2, projectId, cache);
      expanded.add(path2);
    }
    if (projectId === state.projectId && $2("#tree")) $2("#tree").innerHTML = treeHtml();
    return;
  }
  if (state.dirty) throw new Error("\u5F53\u524D\u6587\u4EF6\u5C1A\u672A\u4FDD\u5B58\uFF0C\u8BF7\u5148\u4FDD\u5B58\u540E\u518D\u6253\u5F00\u5176\u4ED6\u6587\u4EF6");
  const file = await call("file:read", { projectId, path: path2 });
  if (token !== fileEpoch || projectId !== state.projectId) return;
  state.file = { ...file, projectId, editing: false };
  state.dirty = false;
  reportDirty();
  if (ui.rightTab === "files") await renderFiles();
}
async function saveFile() {
  await action(async () => {
    if (!state.file) return;
    const original = state.file, projectId = original.projectId ?? state.projectId, text3 = original.text, editing = original.editing;
    const saved = await call("file:write", { projectId, path: original.path, text: text3, revision: original.revision });
    if (original.text !== text3) {
      original.revision = saved.revision;
      toast("\u5DF2\u4FDD\u5B58\u63D0\u4EA4\u65F6\u7684\u5185\u5BB9\uFF0C\u4E4B\u540E\u7684\u7F16\u8F91\u5C1A\u672A\u4FDD\u5B58");
    } else {
      views.saved(state, projectId, { ...saved, projectId, editing });
      toast("\u6587\u4EF6\u5DF2\u4FDD\u5B58");
    }
    reportDirty();
    if (state.projectId === projectId && ui.rightTab === "files" && state.file?.path === saved.path) await renderFiles();
  });
}
async function discardFile(close2) {
  const f2 = state.file;
  if (!f2) return;
  const done = async () => {
    if (close2) state.file = null;
    else {
      const file = await call("file:read", { projectId: f2.projectId ?? state.projectId, path: f2.path });
      state.file = { ...file, projectId: f2.projectId, editing: false };
    }
    state.dirty = false;
    reportDirty();
    await renderFiles();
  };
  if (state.dirty) modal("\u653E\u5F03\u672A\u4FDD\u5B58\u7684\u4FEE\u6539\uFF1F", `<p>${esc6(f2.path)} \u6709\u672A\u4FDD\u5B58\u7684\u4FEE\u6539\u3002\u653E\u5F03\u540E\u4F1A\u6062\u590D\u4E3A\u78C1\u76D8\u4E0A\u7684\u5185\u5BB9\u3002</p>`, done, { confirm: "\u653E\u5F03\u4FEE\u6539", danger: true });
  else if (close2) await done();
  else {
    f2.editing = false;
    await renderFiles();
  }
}
function renderTasks() {
  const body = $2("#rp-body");
  if (!body) return;
  body.innerHTML = '<div class="tasks"><section class="task-section" id="tasks-live"></section><section class="task-section terminal-section" id="terminal-section"></section></div>';
  renderTasksLive();
  renderTerminal();
}
function renderTasksLive() {
  const el = $2("#tasks-live");
  if (!el) return;
  const snap = state.snapshot, live = snap.sessions.filter((s) => !s.archived && busy(s));
  const sources2 = ["qoder", "workbuddy", "antigravity"].map((id) => {
    const c = snap.catalog[id], status = c?.status ?? "none";
    return `<div class="task-row"><span class="dot ${status === "ready" ? "completed" : status === "loading" ? "running" : status === "error" ? "failed" : "idle"}"></span><span class="task-main static"><span class="task-title">${sourceNames[id]}</span><span class="task-sub">${status === "loading" ? "\u6B63\u5728\u8BFB\u53D6\u76EE\u5F55\u2026" : status === "needs-component" ? "\u9700\u8981\u4E0B\u8F7D\u7EC4\u4EF6" : status === "ready" ? `${c.models.filter((m) => m.enabled).length} \u4E2A\u6A21\u578B \xB7 ${since(c.checkedAt)}\u66F4\u65B0` : status === "error" ? esc6(c.error) : "\u5C1A\u672A\u8BFB\u53D6"}</span></span><button class="icon-btn sm" data-refresh-source="${id}" title="\u5237\u65B0\u76EE\u5F55" ${status === "loading" ? "disabled" : ""}>${icon("refresh")}</button></div>`;
  }).join("");
  el.innerHTML = `<h4>${icon("activity")}\u8FD0\u884C\u4E2D\u7684\u4F1A\u8BDD<span class="count">${live.length}</span></h4>${live.length ? live.map((s) => `<div class="task-row"><span class="dot ${esc6(s.status)}"></span><button class="task-main" data-session="${s.id}"><span class="task-title">${esc6(s.title)}</span><span class="task-sub">${esc6(snap.projects.find((p) => p.id === s.projectId)?.name ?? "")} \xB7 ${esc6(runtime(s.runtimeId)?.name ?? s.runtimeId)} \xB7 <span data-activity="${s.id}">${esc6(activityOf(s).short)}</span> \xB7 <span data-elapsed-from="${esc6(s.updatedAt)}">${elapsed(s.updatedAt)}</span></span></button><button class="icon-btn sm" data-stop-session="${s.id}" title="\u505C\u6B62">${icon("stop")}</button></div>`).join("") : '<div class="task-empty">\u6CA1\u6709\u6B63\u5728\u8FD0\u884C\u7684\u4F1A\u8BDD</div>'}<h4>${icon("layers")}\u6A21\u578B\u76EE\u5F55</h4>${sources2}`;
}
function renderTerminal() {
  const el = $2("#terminal-section");
  const t = views.terminal(state.projectId);
  state.terminalText = t.text;
  state.terminalBusy = t.running;
  if (!el) return;
  const p = project();
  el.innerHTML = `<h4>${icon("terminal")}\u7EC8\u7AEF<span class="muted">PowerShell \xB7 ${esc6(p?.name ?? "\u672A\u9009\u62E9\u6587\u4EF6\u5939")}</span><span class="spacer"></span>${state.terminalBusy ? '<button class="btn sm danger" id="stop-terminal">\u505C\u6B62</button>' : ""}<button class="ghost-btn" id="clear-terminal" title="\u6E05\u7A7A\u8F93\u51FA">\u6E05\u7A7A</button></h4><pre class="terminal-output" id="terminal-output"></pre><form class="terminal-input" id="terminal-form"><span class="prompt-sign">\u276F</span><input id="terminal-command" placeholder="${p ? "\u5728\u5F53\u524D\u6587\u4EF6\u5939\u8FD0\u884C\u547D\u4EE4" : "\u5148\u6253\u5F00\u4E00\u4E2A\u6587\u4EF6\u5939"}" autocomplete="off" spellcheck="false" ${state.terminalBusy ? "disabled" : ""}><button class="btn sm" ${state.terminalBusy || !p ? "disabled" : ""}>\u8FD0\u884C</button></form>`;
  const out = $2("#terminal-output");
  out.textContent = state.terminalText || "";
  out.scrollTop = out.scrollHeight;
  bind("#terminal-form", "submit", (e) => {
    e.preventDefault();
    void action(async () => {
      const command = $2("#terminal-command").value;
      if (!command.trim()) return;
      const projectId = state.projectId, terminal = views.terminal(projectId);
      terminal.text += `\u276F ${command}
`;
      terminal.running = true;
      renderTerminal();
      try {
        await call("terminal:run", { projectId, command });
      } catch (error) {
        terminal.running = false;
        if (state.projectId === projectId) renderTerminal();
        throw error;
      }
    });
  });
}
function openSettings(tab = "general") {
  closeMenu();
  state.settings = tab;
  $2("#settings").classList.remove("hidden");
  renderSettings();
}
function closeSettings() {
  state.settings = null;
  $2("#settings").classList.add("hidden");
  $2("#settings").innerHTML = "";
}
var sourceCard = (id, desc) => sourceCardHtml(id, desc, state.snapshot.catalog[id], state.snapshot.sourceComponents?.find((c) => c.id === id));
function catalogRows() {
  const q2 = state.catalogSearch.toLowerCase(), rows = models().filter((m) => (state.catalogSource === "all" || m.source === state.catalogSource) && `${m.name} ${m.id} ${m.source}`.toLowerCase().includes(q2));
  return rows.length ? rows.map((m) => `<tr><td><div class="model-name">${esc6(m.name)}${m.enabled ? "" : '<span class="muted"> \xB7 \u4E0D\u53EF\u7528</span>'}</div><div class="model-id mono">${esc6(m.id)}</div></td><td>${sourceNames[m.source]}</td><td>${m.contexts.length ? m.contexts.map((c) => `<span class="ctx-tag${c.tokens === m.defaultContextTokens ? " default" : ""}">${compact(c.tokens)}</span>`).join("") : '<span class="muted">\u672A\u58F0\u660E</span>'}</td><td>${m.reasoning.length ? m.reasoning.map((e) => `<span class="effort-tag">${esc6(effortName(e))}</span>`).join("") : '<span class="muted">\u9ED8\u8BA4</span>'}</td><td><button class="link-btn" data-use-model="${esc6(m.key)}" ${m.enabled ? "" : "disabled"}>\u7528\u4E8E\u65B0\u4F1A\u8BDD</button></td></tr>`).join("") : '<tr><td colspan="5" class="table-empty">\u6CA1\u6709\u5339\u914D\u7684\u6A21\u578B\u3002\u5237\u65B0\u6765\u6E90\u76EE\u5F55\u540E\uFF0C\u6240\u6709\u53EF\u7528\u6A21\u578B\u90FD\u4F1A\u5217\u5728\u8FD9\u91CC\u3002</td></tr>';
}
function settingsBody(tab) {
  const snap = state.snapshot, theme = snap.preferences.theme ?? "dark";
  if (tab === "sources") return `<div class="settings-head"><h1>\u6A21\u578B\u6E90</h1><p>\u8BFB\u53D6\u8D26\u6237\u7684\u771F\u5B9E\u53EF\u7528\u76EE\u5F55\u3002\u601D\u8003\u5F3A\u5EA6\u548C\u4E0A\u4E0B\u6587\u7A97\u53E3\u4F7F\u7528\u6765\u6E90\u58F0\u660E\u7684\u80FD\u529B\uFF0C\u672A\u58F0\u660E\u7684\u4FDD\u6301\u672A\u77E5\u3002</p></div>
    <div class="source-grid" id="source-grid">${sourceCard("qoder", "\u72EC\u7ACB SDK \u526F\u672C\uFF0C\u590D\u7528\u5B98\u65B9 CLI \u767B\u5F55\u6001\u3002")}${sourceCard("workbuddy", "\u72EC\u7ACB bridge \u526F\u672C\uFF0C\u590D\u7528\u672C\u673A WorkBuddy \u767B\u5F55\u6001\u3002")}${sourceCard("antigravity", "\u72EC\u7ACB Gemini \u6765\u6E90\uFF0C\u56FA\u5B9A\u7531 Antigravity \u539F\u751F\u6267\u884C\u3002")}</div>
    <div class="catalog-controls"><label class="search-field">${icon("search")}<input id="catalog-search" placeholder="\u641C\u7D22\u6A21\u578B\u540D\u79F0\u3001ID \u6216\u6765\u6E90" value="${esc6(state.catalogSearch)}" autocomplete="off"></label><select id="catalog-source"><option value="all">\u5168\u90E8\u6765\u6E90</option>${Object.entries(sourceNames).map(([id, name]) => `<option value="${id}" ${state.catalogSource === id ? "selected" : ""}>${name}</option>`).join("")}</select></div>
    <div class="table-wrap"><table class="catalog-table"><thead><tr><th>\u6A21\u578B / \u4E0A\u6E38 ID</th><th>\u6765\u6E90</th><th>\u4E0A\u4E0B\u6587\u7A97\u53E3</th><th>\u601D\u8003\u5F3A\u5EA6</th><th></th></tr></thead><tbody id="model-rows">${catalogRows()}</tbody></table></div>
    <div class="note">${icon("info")}<span>Antigravity \u6765\u6E90\u7684 Gemini \u56FA\u5B9A\u7531 Antigravity \u6267\u884C\uFF0C\u9009\u62E9\u540E\u81EA\u52A8\u5207\u6362\u5230\u8BE5\u73AF\u5883\u3002\u672C\u5730\u538B\u7F29\u9884\u7B97\u53EA\u5F71\u54CD\u8FD0\u884C\u73AF\u5883\u4F55\u65F6\u538B\u7F29\uFF0C\u4E0D\u8868\u793A\u4E0A\u6E38\u7A97\u53E3\u3002</span></div>`;
  if (tab === "runtimes") return `<div class="settings-head row"><div><h1>\u8FD0\u884C\u73AF\u5883</h1><p>\u4EFB\u52A1\u7531\u539F\u751F Agent \u6267\u884C\uFF0C\u5DE5\u5177\u3001\u6280\u80FD\u3001MCP\u3001\u5B50\u4EE3\u7406\u4E0E\u6743\u9650\u90FD\u4FDD\u7559\u5728\u5404\u81EA\u73AF\u5883\u91CC\u3002\u88C5\u597D\u4EFB\u610F\u4E00\u4E2A\u5C31\u80FD\u4F7F\u7528 Bridge++\uFF0C\u6CA1\u88C5\u7684\u73AF\u5883\u4E0D\u4F1A\u51FA\u73B0\u5728\u5DE5\u4F5C\u53F0\u7684\u53EF\u9009\u9879\u91CC\u3002</p></div><div class="head-actions"><button class="btn" id="open-guide">${icon("spark")}\u5F15\u5BFC</button>${Array.isArray(snap.environments) ? `<button class="btn" id="check-environments">${icon("download")}\u68C0\u67E5\u66F4\u65B0</button>` : ""}<button class="btn" id="refresh-runtimes">${icon("refresh")}\u91CD\u65B0\u68C0\u6D4B</button></div></div>
    <div class="runtime-grid" id="runtime-grid">${runtimeCards()}</div>
    <div class="note">${icon("info")}<span>\u300C\u53EF\u7528\u300D\u8868\u793A\u7A0B\u5E8F\u5DF2\u5B89\u88C5\u5E76\u901A\u8FC7\u4E86\u57FA\u672C\u68C0\u6D4B\uFF0C\u4E0D\u4EE3\u8868\u5DF2\u767B\u5F55\u6216\u5DF2\u5B9E\u6D4B\u6A21\u578B\u3002\u771F\u5B9E\u8FDE\u63A5\u7ED3\u679C\u4EE5\u4F1A\u8BDD\u4E2D\u7684\u4E8B\u4EF6\u548C\u9519\u8BEF\u4E3A\u51C6\u3002</span></div>`;
  if (tab === "services") return servicesPageHtml(snap.modelServices, serviceViews);
  if (tab === "defaults") {
    const rows = Object.entries(snap.preferences.modelDefaults);
    return `<div class="settings-head"><h1>\u9ED8\u8BA4\u642D\u914D</h1><p>\u5728\u7F16\u8F91\u6846\u7684\u6A21\u578B\u83DC\u5355\u91CC\u70B9\u51FB\u201C\u8BB0\u4F4F\u6B64\u642D\u914D\u201D\uFF0C\u518D\u6B21\u9009\u62E9\u8BE5\u6A21\u578B\u65F6\u4F1A\u81EA\u52A8\u6062\u590D\u601D\u8003\u5F3A\u5EA6\u3001\u7A97\u53E3\u4E0E\u9884\u7B97\u3002</p></div>${rows.length ? `<div class="table-wrap"><table class="catalog-table"><thead><tr><th>\u6A21\u578B</th><th>\u8FD0\u884C\u73AF\u5883</th><th>\u601D\u8003</th><th>\u7A97\u53E3</th><th>\u9884\u7B97</th></tr></thead><tbody>${rows.map(([key, v2]) => {
      const m = models().find((x2) => x2.key === key);
      return `<tr><td><div class="model-name">${esc6(key.startsWith("native") ? `\u539F\u751F\u6A21\u578B \xB7 ${v2.nativeModel || "\u5F53\u524D\u9ED8\u8BA4"}` : m?.name ?? key)}</div><div class="model-id mono">${esc6(key)}</div></td><td>${esc6(runtime(v2.runtimeId)?.name ?? v2.runtimeId ?? "\u2014")}</td><td>${esc6(v2.reasoning ? effortName(v2.reasoning) : "\u9ED8\u8BA4")}</td><td>${v2.contextTokens ? compact(v2.contextTokens) : "\u2014"}</td><td>${v2.contextBudget ? compact(v2.contextBudget) : "\u2014"}</td></tr>`;
    }).join("")}</tbody></table></div>` : '<div class="note">\u8FD8\u6CA1\u6709\u4FDD\u5B58\u7684\u642D\u914D\u3002</div>'}`;
  }
  if (tab === "rules") {
    if (!state.rules && !state.rulesLoading && !state.rulesError) void loadRules();
    const sourceModels = models().filter((m) => m.enabled && ["qoder", "workbuddy"].includes(m.source)), seen = /* @__PURE__ */ new Map();
    for (const m of sourceModels) seen.set(sourceName(m), (seen.get(sourceName(m)) ?? 0) + 1);
    const detectorModels = sourceModels.map((m) => ({ key: m.key, name: seen.get(sourceName(m)) > 1 ? `${sourceName(m)} \xB7 ${m.id}` : sourceName(m), group: sourceNames[m.source] ?? m.source }));
    return rulesPageHtml(state.rules, { editing: state.rulesEditing, draft: state.rulesDraft, loading: state.rulesSaving, error: state.rulesError, models: detectorModels });
  }
  if (tab === "shortcuts") return `<div class="settings-head"><h1>\u5FEB\u6377\u952E</h1></div><dl class="kv">${[["Ctrl + N", "\u65B0\u5EFA\u4F1A\u8BDD"], ["Enter", "\u53D1\u9001\u4EFB\u52A1"], ["Shift + Enter", "\u6362\u884C"], ["Ctrl + B", "\u6536\u8D77 / \u5C55\u5F00\u5DE6\u4FA7\u680F"], ["Ctrl + Alt + B", "\u6536\u8D77 / \u5C55\u5F00\u53F3\u4FA7\u9762\u677F"], ["Ctrl + J", "\u6253\u5F00\u4EFB\u52A1\u4E0E\u7EC8\u7AEF"], ["Ctrl + S", "\u4FDD\u5B58\u6B63\u5728\u7F16\u8F91\u7684\u6587\u4EF6"], ["Ctrl + ,", "\u6253\u5F00\u8BBE\u7F6E"], ["Esc", "\u5173\u95ED\u83DC\u5355\u6216\u8BBE\u7F6E"]].map(([k, v2]) => `<dt><kbd>${k}</kbd></dt><dd>${v2}</dd>`).join("")}</dl>`;
  if (tab === "about") return `<div class="settings-head about"><div class="about-mark">${logo(48)}</div><h1>Bridge++</h1><p>\u628A\u4F60\u7684\u6A21\u578B\u6E90\u63A5\u5230\u719F\u6089\u7684\u539F\u751F Agent \u91CC\uFF0C\u5728\u4E00\u4E2A\u5DE5\u4F5C\u533A\u7BA1\u7406\u4F1A\u8BDD\u3001\u53D8\u66F4\u4E0E\u6587\u4EF6\u3002</p></div><dl class="kv"><dt>\u7248\u672C</dt><dd>${esc6(snap.app.version)}</dd><dt>\u5DE5\u4F5C\u533A\u6570\u636E</dt><dd class="mono">${esc6(snap.app.dataDir)}</dd><dt>\u5DE5\u4F5C\u6587\u4EF6\u5939</dt><dd>${snap.projects.length} \u4E2A</dd><dt>\u5DF2\u4FDD\u5B58\u4F1A\u8BDD</dt><dd>${snap.sessions.length} \u4E2A</dd></dl>${updateSectionHtml(snap.updates)}<div class="note">${icon("info")}<span>Qoder CN \u548C WorkBuddy \u7684 bridge \u5185\u7F6E\u5728 Bridge++ \u91CC\uFF1B\u8981\u8BA9\u5176\u4ED6 Agent \u4F7F\u7528\u8FD9\u4E24\u4E2A\u6A21\u578B\u6E90\uFF0C\u8BF7\u5230\u8BBE\u7F6E \u2192 \u5BF9\u5916\u63A5\u53E3\u3002</span></div>`;
  return `<div class="settings-head"><h1>\u901A\u7528</h1><p>\u754C\u9762\u5916\u89C2\u4E0E\u5DE5\u4F5C\u533A\u4FE1\u606F\u3002</p></div>
    <h2>\u5916\u89C2</h2><div class="theme-grid">${[["system", "monitor", "\u8DDF\u968F\u7CFB\u7EDF"], ["light", "sun", "\u6D45\u8272"], ["dark", "moon", "\u6DF1\u8272"]].map(([id, ico, label]) => `<button class="theme-card${theme === id ? " active" : ""}" data-theme-choice="${id}"><span class="theme-preview ${id}"><i></i><i></i><i></i></span><span class="theme-label">${icon(ico)}${label}</span></button>`).join("")}</div>
    <h2>\u5DE5\u4F5C\u533A</h2><dl class="kv"><dt>\u6570\u636E\u76EE\u5F55</dt><dd class="mono">${esc6(snap.app.dataDir)}</dd><dt>\u5DE5\u4F5C\u6587\u4EF6\u5939</dt><dd>${snap.projects.length} \u4E2A</dd><dt>\u4F1A\u8BDD</dt><dd>${snap.sessions.filter((s) => !s.archived).length} \u4E2A\uFF08\u53E6\u6709 ${snap.sessions.filter((s) => s.archived).length} \u4E2A\u5DF2\u5F52\u6863\uFF09</dd><dt>\u7248\u672C</dt><dd>${esc6(snap.app.version)}</dd></dl>`;
}
function renderSettings() {
  const tab = state.settings, el = $2("#settings");
  if (!tab || !state.snapshot) return;
  const nav = [["general", "settings", "\u901A\u7528"], ["sources", "layers", "\u6A21\u578B\u6E90"], ["runtimes", "cpu", "\u8FD0\u884C\u73AF\u5883"], ["services", "plug", "\u5BF9\u5916\u63A5\u53E3"], ["defaults", "list", "\u9ED8\u8BA4\u642D\u914D"], ["rules", "bulb", "\u957F\u671F\u8981\u6C42"], ["shortcuts", "keyboard", "\u5FEB\u6377\u952E"], ["about", "info", "\u5173\u4E8E"]];
  el.innerHTML = `<aside class="settings-nav"><div class="settings-top"><button class="icon-btn" id="close-settings" title="\u8FD4\u56DE (Esc)">${icon("arrowLeft")}</button><span>\u8BBE\u7F6E</span></div>${nav.map(([id, ico, label]) => `<button class="settings-tab${tab === id ? " active" : ""}" data-settings-tab="${id}">${icon(ico)}<span>${label}</span></button>`).join("")}</aside><div class="settings-main"><div class="settings-drag"></div><div class="settings-scroll"><div class="settings-body" id="settings-body">${settingsBody(tab)}</div></div></div>`;
  bind("#catalog-search", "input", (e) => {
    state.catalogSearch = e.target.value;
    $2("#model-rows").innerHTML = catalogRows();
  });
  bind("#catalog-source", "change", (e) => {
    state.catalogSource = e.target.value;
    $2("#model-rows").innerHTML = catalogRows();
  });
  bind("#rule-add-text", "keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      void action(() => rulesAction("add"));
    }
  });
  bind("#rules-text", "input", (e) => {
    state.rulesDraft = e.target.value;
  });
}
async function loadRules() {
  state.rulesLoading = true;
  try {
    state.rules = await call("rules:get");
    state.rulesError = null;
  } catch (error) {
    state.rulesError = error.message;
  } finally {
    state.rulesLoading = false;
  }
  if (state.settings === "rules" && !state.rulesEditing) renderSettings();
}
async function rulesAction(kind) {
  if (kind === "edit") {
    state.rulesEditing = true;
    state.rulesDraft = state.rules?.text ?? "";
    renderSettings();
    $2("#rules-text")?.focus();
    return;
  }
  if (kind === "cancel-edit") {
    state.rulesEditing = false;
    state.rulesDraft = null;
    renderSettings();
    return;
  }
  if (kind === "add") {
    const input = $2("#rule-add-text"), text3 = input?.value.trim();
    if (!text3) {
      input?.focus();
      return;
    }
    state.rules = await call("rules:add", { text: text3 });
    renderSettings();
    toast("\u5DF2\u6DFB\u52A0\u957F\u671F\u8981\u6C42");
    return;
  }
  if (kind === "save-text") {
    state.rulesSaving = true;
    renderSettings();
    try {
      state.rules = await call("rules:save", { text: $2("#rules-text")?.value ?? state.rulesDraft ?? "" });
      state.rulesEditing = false;
      state.rulesDraft = null;
      toast("\u5DF2\u4FDD\u5B58");
    } finally {
      state.rulesSaving = false;
      renderSettings();
    }
  }
}
function runtimeCards() {
  const envs = new Map((state.snapshot.environments ?? []).map((e) => [e.id, e]));
  return state.snapshot.runtimes.map((r) => environmentCardHtml(r, envs.get(r.id), { permissions: runtimePermissionHtml(r), canOpenNative: !!project() })).join("");
}
function refreshSettingsLive() {
  if (state.settings === "sources") {
    const grid = $2("#source-grid");
    if (grid) grid.innerHTML = sourceCard("qoder", "\u72EC\u7ACB SDK \u526F\u672C\uFF0C\u590D\u7528\u5B98\u65B9 CLI \u767B\u5F55\u6001\u3002") + sourceCard("workbuddy", "\u72EC\u7ACB bridge \u526F\u672C\uFF0C\u590D\u7528\u672C\u673A WorkBuddy \u767B\u5F55\u6001\u3002") + sourceCard("antigravity", "\u72EC\u7ACB Gemini \u6765\u6E90\uFF0C\u56FA\u5B9A\u7531 Antigravity \u539F\u751F\u6267\u884C\u3002");
    const rows = $2("#model-rows");
    if (rows) rows.innerHTML = catalogRows();
  } else if (state.settings === "runtimes" || state.settings === "services") {
    const active = document.activeElement;
    if (active?.closest?.("#settings") && (active.tagName === "TEXTAREA" || active.tagName === "SELECT" || active.tagName === "INPUT" && active.type !== "checkbox")) return;
    const grid = $2(state.settings === "runtimes" ? "#runtime-grid" : "#service-grid");
    if (grid) patchHtml(grid, state.settings === "runtimes" ? runtimeCards() : serviceCardsHtml(state.snapshot.modelServices ?? [], serviceViews));
    else renderSettings();
  } else if (state.settings && !document.activeElement?.closest("#settings")) renderSettings();
}
function modal(title, body, confirm, { confirm: confirmText = "\u4FDD\u5B58", danger = false } = {}) {
  const el = $2("#modal");
  el.className = "";
  guideOpen = false;
  el.innerHTML = `<h2>${esc6(title)}</h2><div class="modal-body">${body}</div><div class="modal-actions"><button id="modal-cancel" class="btn">\u53D6\u6D88</button><button id="modal-confirm" class="btn ${danger ? "danger-solid" : "primary"}">${esc6(confirmText)}</button></div>`;
  el.showModal();
  bind("#modal-cancel", "click", () => el.close());
  bind("#modal-confirm", "click", () => void action(async () => {
    await confirm();
    el.close();
  }));
}
var sizeText = (n) => !Number.isFinite(n) || n <= 0 ? "" : n >= 1073741824 ? `${(n / 1073741824).toFixed(2)} GB` : n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
var releaseDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1} \u6708 ${d.getDate()} \u65E5`;
};
var percent = (d) => d.total ? Math.min(100, Math.floor(d.received / d.total * 100)) : 0;
function updateSlotHtml(u) {
  const d = u?.download ?? {}, v2 = u?.latest?.version;
  if (d.status === "downloaded" && d.version) return `<div class="update-card ready"><span class="uc-icon">${icon("download")}</span><span class="uc-text"><b>\u6709\u65B0\u66F4\u65B0\u5F85\u5B89\u88C5</b><small>V${esc6(d.version)} \u5DF2\u4E0B\u8F7D</small></span><button class="btn primary sm" data-update="install">\u5B89\u88C5</button></div>`;
  if (u?.status !== "available" || !v2) return "";
  if (d.status === "downloading") return `<div class="update-card"><span class="uc-icon"><span class="spinner"></span></span><span class="uc-text"><b>\u6B63\u5728\u4E0B\u8F7D V${esc6(v2)}</b><small>${d.total ? `${percent(d)}% \xB7 ${sizeText(d.received) || "0 KB"} / ${sizeText(d.total)}` : "\u6B63\u5728\u8FDE\u63A5\u2026"}</small><span class="uc-bar"><i style="width:${percent(d)}%"></i></span></span><button class="icon-btn sm" data-update="cancel" title="\u53D6\u6D88\u4E0B\u8F7D">${icon("close")}</button></div>`;
  const failed = d.status === "failed" && (!d.version || d.version === v2), asset = u.latest.asset;
  const sub2 = failed ? `<small class="uc-error" title="${esc6(d.error ?? "")}">\u4E0B\u8F7D\u5931\u8D25${d.error ? `\uFF1A${esc6(d.error)}` : ""}</small>` : `<small>${asset ? esc6(sizeText(asset.size)) : "\u5230\u53D1\u5E03\u9875\u4E0B\u8F7D"}</small>`;
  return `<div class="update-card"><span class="uc-icon">${icon("arrowUp")}</span><span class="uc-text"><b>\u6709\u65B0\u7248\u672C V${esc6(v2)}</b>${sub2}</span><button class="btn sm" data-update="${asset ? "download" : "page"}">${asset ? failed ? "\u91CD\u8BD5" : "\u4E0B\u8F7D" : "\u67E5\u770B"}</button></div>`;
}
function renderUpdateSlot() {
  const el = $2("#update-slot");
  if (!el) return;
  const html2 = updateSlotHtml(state.snapshot?.updates);
  if (el.innerHTML !== html2) el.innerHTML = html2;
}
function updateSectionHtml(u) {
  if (!u) return "";
  const d = u.download ?? {}, v2 = u.latest?.version;
  const line = u.checking ? `<span class="spinner"></span><span>\u6B63\u5728\u68C0\u67E5\u66F4\u65B0\u2026</span>` : u.status === "error" ? `${icon("alert")}<span>\u68C0\u67E5\u5931\u8D25\uFF1A${esc6(u.error ?? "\u672A\u77E5\u539F\u56E0")}</span>` : u.status === "available" && v2 ? `${icon("arrowUp")}<span>\u6709\u65B0\u7248\u672C V${esc6(v2)}${u.latest.publishedAt ? `\uFF08${esc6(releaseDate(u.latest.publishedAt))}\u53D1\u5E03\uFF09` : ""}</span>${u.latest.url ? `<button class="link-btn" data-update="page">\u53D1\u5E03\u8BF4\u660E</button>` : ""}` : u.status === "latest" ? `${icon("check")}<span>\u5DF2\u662F\u6700\u65B0\u7248\u672C</span>` : `${icon("info")}<span>\u8FD8\u6CA1\u6709\u68C0\u67E5\u8FC7\u66F4\u65B0</span>`;
  const download = d.status === "downloading" ? `<div class="update-line"><span class="spinner"></span><span>\u6B63\u5728\u4E0B\u8F7D V${esc6(d.version ?? v2 ?? "")}${d.total ? ` \xB7 ${percent(d)}%` : ""}</span><span class="uc-bar wide"><i style="width:${percent(d)}%"></i></span><button class="link-btn" data-update="cancel">\u53D6\u6D88</button></div>` : d.status === "downloaded" && d.version ? `<div class="update-line">${icon("download")}<span>V${esc6(d.version)} \u5DF2\u4E0B\u8F7D${u.latest?.version === d.version && !u.latest?.asset?.digest ? "\uFF08\u53D1\u5E03\u6CA1\u6709\u63D0\u4F9B SHA-256\uFF0C\u53EA\u6838\u5BF9\u4E86\u6587\u4EF6\u5927\u5C0F\uFF09" : ""}\u3002\u5B89\u88C5\u65F6\u4F1A\u5173\u95ED Bridge++\uFF0C\u6570\u636E\u548C\u8BBE\u7F6E\u90FD\u4F1A\u4FDD\u7559\u3002</span><button class="btn primary sm" data-update="install">\u5B89\u88C5</button></div>` : d.status === "failed" && d.error ? `<div class="update-line warn">${icon("alert")}<span>\u4E0B\u8F7D\u5931\u8D25\uFF1A${esc6(d.error)}</span>${u.latest?.asset ? `<button class="link-btn" data-update="download">\u91CD\u8BD5</button>` : ""}</div>` : u.status === "available" && u.latest?.asset ? `<div class="update-line"><button class="btn sm" data-update="download">${icon("download")}\u4E0B\u8F7D\u66F4\u65B0\u5305\uFF08${esc6(sizeText(u.latest.asset.size))}\uFF09</button></div>` : "";
  return `<h2>\u66F4\u65B0</h2><div class="update-line">${line}</div>${download}
    <div class="update-actions"><button class="btn sm" data-update="check" ${u.checking ? "disabled" : ""}>${icon("refresh")}\u68C0\u67E5\u66F4\u65B0</button><span class="muted">${u.checkedAt ? `\u4E0A\u6B21\u68C0\u67E5\uFF1A${esc6(since(u.checkedAt))}` : "\u6BCF\u5929\u7B2C\u4E00\u6B21\u542F\u52A8\u65F6\u81EA\u52A8\u68C0\u67E5"}</span></div>
    <label class="update-auto"><input type="checkbox" data-update-auto ${u.autoDownload ? "checked" : ""}><span><b>\u81EA\u52A8\u4E0B\u8F7D\u66F4\u65B0\u5305</b><small>\u6709\u65B0\u7248\u672C\u65F6\u5728\u540E\u53F0\u4E0B\u8F7D\uFF0C\u4E0B\u8F7D\u5B8C\u5728\u5DE6\u4E0B\u89D2\u63D0\u793A\u5B89\u88C5</small></span></label>`;
}
async function installUpdate(force) {
  try {
    await call("update:install", { force });
  } catch (error) {
    if (error.code !== "sessions_running" || force) throw error;
    setTimeout(() => modal("\u5B89\u88C5\u66F4\u65B0", `<p>${esc6(error.message)}\u3002</p><p>\u4ECD\u8981\u73B0\u5728\u5B89\u88C5\u5417\uFF1F</p>`, () => installUpdate(true), { confirm: "\u4E2D\u65AD\u4EFB\u52A1\u5E76\u5B89\u88C5", danger: true }), 0);
  }
}
async function updateAction(kind) {
  const u = state.snapshot?.updates;
  if (kind === "page") {
    if (u?.latest?.url) await call("link:open", { url: u.latest.url });
    return;
  }
  if (kind === "install") {
    modal("\u5B89\u88C5\u66F4\u65B0", `<p>\u5C06\u5173\u95ED Bridge++ \u5E76\u8FD0\u884C V${esc6(u?.download?.version ?? "")} \u7684\u5B89\u88C5\u7A0B\u5E8F\u3002\u6570\u636E\u548C\u8BBE\u7F6E\u90FD\u4F1A\u4FDD\u7559\uFF0C\u88C5\u597D\u540E\u81EA\u52A8\u6253\u5F00\u3002</p><p class="q-note">\u5BF9\u5916\u63A5\u53E3\u4F1A\u5728\u5B89\u88C5\u65F6\u6682\u505C\uFF0C\u88C5\u5B8C\u81EA\u52A8\u6062\u590D\u3002</p>`, () => installUpdate(false), { confirm: "\u5173\u95ED\u5E76\u5B89\u88C5" });
    return;
  }
  if (kind === "check") {
    if (u) {
      u.checking = true;
      refreshSettingsLive();
    }
    let r;
    try {
      r = await call("update:check");
    } finally {
      if (u) u.checking = false;
    }
    if (state.snapshot) state.snapshot.updates = r;
    toast(r.status === "available" ? `\u6709\u65B0\u7248\u672C V${r.latest?.version}` : r.status === "latest" ? "\u5DF2\u662F\u6700\u65B0\u7248\u672C" : `\u68C0\u67E5\u5931\u8D25\uFF1A${r.error ?? "\u672A\u77E5\u539F\u56E0"}`, r.status === "error");
  } else if (kind === "download" || kind === "cancel") {
    const r = await call(`update:${kind}`);
    if (state.snapshot) state.snapshot.updates = r;
  }
  renderUpdateSlot();
  refreshSettingsLive();
}
var FEEDBACK_KINDS = {
  upstream: "\u4E0A\u6E38\u62A5\u9519",
  bridge: "\u6865/\u7F51\u5173\u62A5\u9519",
  runtime: "\u8FD0\u884C\u73AF\u5883\u62A5\u9519",
  rate_limit: "\u9650\u901F",
  timeout: "\u8D85\u65F6",
  retry: "\u81EA\u52A8\u91CD\u8BD5",
  tool_recovery: "\u5DE5\u5177\u8C03\u7528\u7EA0\u6B63",
  runtime_rebuild: "\u8FD0\u884C\u65F6\u91CD\u5EFA",
  late_followup: "\u8FDF\u5230\u7684\u7ED3\u679C",
  protocol_filter: "\u534F\u8BAE\u6B8B\u7559\u8FC7\u6EE4",
  json_fallback: "\u9000\u56DE JSON \u8DEF\u5F84",
  context_compaction: "\u4E0A\u4E0B\u6587\u538B\u7F29",
  stop: "\u4F60\u505C\u6B62\u4E86\u4EFB\u52A1",
  steer: "\u8FD0\u884C\u4E2D\u63D2\u8BDD",
  approval_denied: "\u62D2\u7EDD\u6388\u6743",
  follow_up_message: "\u62A5\u9519\u540E\u8FFD\u95EE",
  rebind: "\u6362\u6A21\u578B\u6216\u53C2\u6570"
};
function feedbackSummaryHtml(p) {
  const chips = (group) => Object.entries(group?.byKind ?? {}).filter(([, n]) => n).map(([k, n]) => `<span class="fb-chip">${esc6(FEEDBACK_KINDS[k] ?? k)} ${n}</span>`).join("");
  const all = chips(p.errors) + chips(p.corrections);
  return `<div class="fb-counts"><span><b>${p.turns ?? 0}</b> \u8F6E</span><span><b>${p.errors?.total ?? 0}</b> \u5904\u62A5\u9519</span><span><b>${p.corrections?.total ?? 0}</b> \u6B21\u7EA0\u6B63</span><span class="muted">\u7EA6 ${esc6(sizeText(p.bytes) || "1 KB")}${p.truncated ? "\uFF0C\u6700\u65E9\u7684\u8BB0\u5F55\u5DF2\u622A\u65AD" : ""}</span></div>${all ? `<div class="fb-chips">${all}</div>` : ""}`;
}
async function openFeedback() {
  const s = session();
  if (!s) return;
  const opts = { includeConversation: false, includeTools: false };
  modal("\u5BFC\u51FA\u53CD\u9988", `<p>\u628A\u8FD9\u4E2A\u4F1A\u8BDD\u7684\u62A5\u9519\u3001\u81EA\u52A8\u7EA0\u6B63\u548C\u4F60\u7684\u64CD\u4F5C\uFF08\u505C\u6B62\u3001\u63D2\u8BDD\u3001\u62D2\u7EDD\u6388\u6743\u3001\u6362\u6A21\u578B\uFF09\u6253\u5305\u6210\u4E00\u4E2A zip\uFF0C\u53D1\u7ED9\u5F00\u53D1\u8005\u5C31\u80FD\u5B9A\u4F4D\u95EE\u9898\u3002</p>
    <div class="fb-summary" id="fb-summary"><div class="fb-loading"><span class="spinner"></span><span>\u6B63\u5728\u7EDF\u8BA1\u2026</span></div></div>
    <label class="q-option"><input type="checkbox" id="fb-conversation"><span class="fb-opt"><b>\u5305\u542B\u5BF9\u8BDD\u5185\u5BB9</b><small>\u4F60\u53D1\u7684\u6D88\u606F\u548C\u6A21\u578B\u7684\u56DE\u590D\uFF0C\u4E0D\u542B\u601D\u8003\u8FC7\u7A0B</small></span></label>
    <label class="q-option"><input type="checkbox" id="fb-tools"><span class="fb-opt"><b>\u5305\u542B\u5DE5\u5177\u53C2\u6570\u548C\u8F93\u51FA</b><small>\u547D\u4EE4\u3001\u6587\u4EF6\u6539\u52A8\u548C\u5DE5\u5177\u7ED3\u679C\uFF0C\u6BCF\u9879\u6700\u591A 2000 \u5B57</small></span></label>
    <label for="fb-note">\u95EE\u9898\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09</label><textarea id="fb-note" rows="4" maxlength="4000" placeholder="\u53D1\u751F\u4E86\u4EC0\u4E48\u3001\u4F60\u671F\u671B\u7684\u7ED3\u679C\u3001\u600E\u4E48\u590D\u73B0"></textarea>
    <p class="q-note">\u5BC6\u94A5\u3001\u7528\u6237\u76EE\u5F55\u3001\u9879\u76EE\u548C\u6570\u636E\u76EE\u5F55\u7684\u8DEF\u5F84\u3001\u90AE\u7BB1\u548C\u624B\u673A\u53F7\u4F1A\u88AB\u66FF\u6362\uFF1B\u5BF9\u8BDD\u548C\u5DE5\u5177\u8F93\u51FA\u91CC\u7684\u5176\u4ED6\u5185\u5BB9\u539F\u6837\u4FDD\u7559\u3002\u6587\u4EF6\u53EA\u4FDD\u5B58\u5728\u4F60\u7684\u7535\u8111\u4E0A\uFF0C\u4E0D\u4F1A\u4E0A\u4F20\u3002</p>`, async () => {
    const r = await call("feedback:export", { sessionId: s.id, ...opts, note: $2("#fb-note")?.value ?? "" });
    if (!r) return;
    toast(`\u53CD\u9988\u5DF2\u5BFC\u51FA\uFF1A${r.path.split(/[\\/]/).pop()}`);
    void call("feedback:reveal", { path: r.path }).catch(() => {
    });
  }, { confirm: "\u5BFC\u51FA\u2026" });
  let seq = 0;
  const paint = async () => {
    const mine = ++seq, el = () => mine === seq ? $2("#fb-summary") : null;
    try {
      const p = await call("feedback:preview", { sessionId: s.id, ...opts });
      const box = el();
      if (box) box.innerHTML = feedbackSummaryHtml(p);
    } catch (e) {
      const box = el();
      if (box) box.innerHTML = `<div class="fb-loading">${icon("alert")}<span>${esc6(e.message)}</span></div>`;
    }
  };
  bind("#fb-conversation", "change", (e) => {
    opts.includeConversation = e.target.checked;
    void paint();
  });
  bind("#fb-tools", "change", (e) => {
    opts.includeTools = e.target.checked;
    void paint();
  });
  await paint();
}
function openGuide() {
  const el = $2("#modal");
  el.className = "guide-modal";
  el.innerHTML = onboardingHtml(state.snapshot);
  if (!el.open) el.showModal();
  guideOpen = guideShown = true;
}
function paintGuide() {
  if (guideOpen && $2("#modal").open) patchHtml($2("#modal"), onboardingHtml(state.snapshot));
}
function closeGuide() {
  if (guideOpen && $2("#modal").open) $2("#modal").close();
}
$2("#modal").addEventListener("close", () => {
  if (guideOpen) {
    guideOpen = false;
    $2("#modal").className = "";
  }
});
async function serviceKey(id, verb) {
  const view = serviceView(id), reveal = async () => {
    const r = await call("bridgeService:key", { id, action: "reveal" });
    return typeof r === "string" ? r : r?.key ?? null;
  };
  if (verb === "reveal") {
    view.key = view.key ? null : await reveal();
    refreshSettingsLive();
    return;
  }
  if (verb === "copy") {
    const key = view.key ?? await reveal();
    if (!key) throw new Error("\u8FD9\u4E2A\u63A5\u53E3\u8FD8\u6CA1\u6709\u5BC6\u94A5");
    await call("clipboard:write", { text: key });
    toast("\u5BC6\u94A5\u5DF2\u590D\u5236");
    return;
  }
  modal("\u91CD\u65B0\u751F\u6210\u5BC6\u94A5", '<p class="modal-text">\u65E7\u5BC6\u94A5\u4F1A\u7ACB\u5373\u5931\u6548\uFF0C\u5DF2\u7ECF\u63A5\u5165\u7684\u5BA2\u6237\u7AEF\u9700\u8981\u6362\u6210\u65B0\u5BC6\u94A5\u3002\u63A5\u5165\u8FC7 DSH \u7684\u8BDD\uFF0C\u751F\u6210\u540E\u518D\u70B9\u4E00\u6B21\u300C\u63A5\u5165 DSH\u300D\u5373\u53EF\u3002</p>', async () => {
    await call("bridgeService:key", { id, action: "regenerate" });
    view.key = null;
    await snapshot();
    refreshSettingsLive();
    toast("\u5DF2\u751F\u6210\u65B0\u5BC6\u94A5");
  }, { confirm: "\u91CD\u65B0\u751F\u6210", danger: true });
}
async function toggleServiceModels(id) {
  const view = serviceView(id);
  view.models = !view.models;
  view.list = void 0;
  refreshSettingsLive();
  if (!view.models) return;
  try {
    const r = await call("bridgeService:models", { id });
    view.list = Array.isArray(r) ? r : r?.data ?? [];
  } catch (error) {
    view.models = false;
    toast(error.message, true);
  }
  refreshSettingsLive();
}
async function serviceCall(method, args, done) {
  if (method) await call(method, args);
  await snapshot();
  refreshSettingsLive();
  if (done) toast(done);
}
function renderAll() {
  applyLayout();
  renderFolders();
  renderTopbar();
  renderView();
  renderRightTabs();
  renderRightBody();
  if (state.settings) renderSettings();
}
async function submit() {
  await action(async () => {
    if (!project()) throw new Error("\u8BF7\u5148\u6253\u5F00\u4E00\u4E2A\u5DE5\u4F5C\u6587\u4EF6\u5939");
    let s = session();
    const delivery = s && busy(s) ? deliveryFor(s) : void 0;
    if (s?.selectionIssue && !delivery) throw new Error(s.selectionIssue + "\uFF1B\u8BF7\u5148\u5237\u65B0\u6765\u6E90\u5E76\u91CD\u65B0\u786E\u8BA4\u6A21\u578B");
    if (submitting) return;
    if (runtime(s ? s.runtimeId : state.runtimeId)?.checking) {
      toast("\u6B63\u5728\u68C0\u6D4B\u8FD0\u884C\u73AF\u5883\uFF0C\u7A0D\u7B49\u51E0\u79D2\u518D\u53D1\u9001");
      return;
    }
    const text3 = state.draft.trim(), queued = pending.list(views.draftKey(state));
    if (queued.some((x2) => x2.status === "staging")) {
      toast("\u9644\u4EF6\u8FD8\u5728\u5904\u7406\uFF0C\u7A0D\u7B49\u4E00\u4E0B\u518D\u53D1\u9001");
      return;
    }
    if (queued.some((x2) => x2.status === "error")) {
      toast("\u6709\u9644\u4EF6\u6CA1\u80FD\u6DFB\u52A0\uFF0C\u8BF7\u5148\u79FB\u9664\u5B83\u4EEC", true);
      return;
    }
    const attachments = queued.map((x2) => x2.attachment.id);
    if (!text3 && !attachments.length) return;
    if (!s) {
      const env = runtime(state.runtimeId);
      if (!usable(env)) throw new Error(`${unusableReason(env) || "\u8FD0\u884C\u73AF\u5883\u4E0D\u53EF\u7528"}\uFF0C\u8BF7\u6362\u4E00\u4E2A\u8FD0\u884C\u73AF\u5883\uFF0C\u6216\u5230\u8BBE\u7F6E \u2192 \u8FD0\u884C\u73AF\u5883\u5904\u7406`);
      if (!state.modelKey) throw new Error("\u8BF7\u5148\u9009\u62E9\u6A21\u578B");
    }
    const token = sessionEpoch, projectId = state.projectId, draftKey = views.draftKey(state);
    submitting = true;
    try {
      if (!s) {
        const model = currentModel();
        s = await call("session:create", { projectId, runtimeId: state.runtimeId, selection: { modelKey: state.modelKey, identity: model?.identity, reasoning: state.reasoning || void 0, contextTokens: state.modelKey === "native" ? null : state.contextTokens, contextBudget: state.contextBudget, nativeModel: state.nativeModel || void 0 } });
        views.drafts.delete(draftKey);
        if (token === sessionEpoch && projectId === state.projectId) {
          state.sessionId = s.id;
          state.events = [];
          state.historyLoading = null;
          state.draft = "";
          metrics.clear();
          await snapshot();
          if (token === sessionEpoch && state.sessionId === s.id) {
            renderFolders();
            renderTopbar();
            renderView();
            renderRightTabs();
          }
        }
      }
      views.drafts.delete(projectId + ":" + s.id);
      const taken = pending.take(draftKey);
      if (state.sessionId === s.id) {
        state.draft = "";
        const prompt = $2("#prompt");
        if (prompt) {
          prompt.value = "";
          autosize(prompt);
        }
        renderTray();
      }
      const sent = call("session:prompt", { sessionId: s.id, text: text3, ...attachments.length ? { attachments } : {}, ...delivery ? { delivery } : {} });
      submitting = false;
      let result;
      try {
        result = await sent;
      } catch (error) {
        for (const item of taken) pending.add(projectId + ":" + s.id, item);
        markDiscarded([]);
        if (state.sessionId === s.id) renderTray();
        throw error;
      }
      if (delivery === "steer" && result?.delivery === "queue") toast(result.note || "\u8FD9\u4E00\u523B\u8FD8\u4E0D\u80FD\u63D2\u8BDD\uFF0C\u5DF2\u6539\u4E3A\u6392\u961F\uFF0C\u672C\u8F6E\u7ED3\u675F\u540E\u53D1\u9001");
      else if (delivery === "queue" && result?.delivery === "queue") toast("\u5DF2\u6392\u961F\uFF0C\u672C\u8F6E\u7ED3\u675F\u540E\u81EA\u52A8\u53D1\u9001");
      await snapshot();
      if (state.sessionId === s.id) {
        renderComposerControls();
        renderFooter();
      }
    } catch (error) {
      if (s) {
        const key = projectId + ":" + s.id;
        if (!views.drafts.has(key)) views.drafts.set(key, text3);
        if (state.sessionId === s.id && !state.draft) {
          state.draft = views.drafts.get(key);
          const prompt = $2("#prompt");
          if (prompt) prompt.value = state.draft;
        }
      }
      throw error;
    } finally {
      submitting = false;
    }
  });
}
async function openSession(id) {
  const token = ++sessionEpoch;
  closeMenu();
  if (state.settings) closeSettings();
  stashDraft();
  const s = state.snapshot.sessions.find((x2) => x2.id === id);
  activateProject(s.projectId);
  state.sessionId = id;
  views.loadDraft(state);
  state.events = [];
  state.historyLoading = { token, events: [] };
  metrics.clear();
  renderAll();
  let events;
  try {
    events = await call("session:events", { sessionId: id });
  } catch (error) {
    if (token === sessionEpoch && state.sessionId === id) {
      const buffered = state.historyLoading?.events ?? [];
      state.historyLoading = null;
      for (const e of buffered) metrics.feed(e);
      state.events = displayEvents(buffered);
      renderChat(true);
    }
    throw error;
  }
  if (token !== sessionEpoch || state.sessionId !== id) return;
  const ids = new Set(events.map((e) => e.id)), all = [...events, ...state.historyLoading.events.filter((e) => !ids.has(e.id))];
  state.historyLoading = null;
  for (const e of all) metrics.feed(e);
  activity.replay(id, all);
  state.events = displayEvents(all);
  renderChat(true);
  renderFooter();
  if (ui.rightTab === "changes") paintChanges();
}
function newSession(projectId = state.projectId) {
  sessionEpoch++;
  closeMenu();
  if (state.settings) closeSettings();
  stashDraft();
  if (projectId && projectId !== state.projectId) activateProject(projectId);
  if (projectId && ui.collapsed.includes(projectId)) {
    ui.collapsed = ui.collapsed.filter((x2) => x2 !== projectId);
    saveUi();
  }
  state.sessionId = null;
  state.historyLoading = null;
  state.events = [];
  metrics.clear();
  views.loadDraft(state);
  renderAll();
  $2("#prompt")?.focus();
}
async function addProject() {
  await action(async () => {
    const p = await call("project:add");
    if (!p) return;
    await snapshot();
    newSession(p.id);
  });
}
async function openNative() {
  if (!project()) throw new Error("\u8BF7\u5148\u9009\u62E9\u5DE5\u4F5C\u6587\u4EF6\u5939");
  await action(() => call("native:open", { runtimeId: session()?.runtimeId ?? state.runtimeId, projectId: state.projectId, sessionId: state.sessionId }));
}
function renameSession() {
  const s = session();
  if (!s) return;
  modal("\u91CD\u547D\u540D\u4F1A\u8BDD", `<input id="session-title" value="${esc6(s.title)}" maxlength="100" autocomplete="off">`, async () => {
    await call("session:rename", { sessionId: s.id, title: $2("#session-title").value });
    await snapshot();
    renderFolders();
    renderTopbar();
  });
  const input = $2("#session-title");
  input.focus();
  input.select();
}
function archiveSession(id) {
  const s = state.snapshot.sessions.find((x2) => x2.id === id);
  if (!s) return;
  modal("\u5F52\u6863\u4F1A\u8BDD", `<p>\u201C${esc6(s.title)}\u201D\u4F1A\u4ECE\u5217\u8868\u4E2D\u9690\u85CF\uFF0C\u4F1A\u8BDD\u8BB0\u5F55\u4ECD\u4FDD\u7559\u5728\u5DE5\u4F5C\u533A\u6570\u636E\u76EE\u5F55\u91CC\u3002</p>`, async () => {
    await call("session:archive", { sessionId: id });
    if (state.sessionId === id) {
      state.sessionId = null;
      state.events = [];
      metrics.clear();
      views.loadDraft(state);
    }
    await snapshot();
    renderAll();
  }, { confirm: "\u5F52\u6863", danger: true });
}
function openRecovery(s) {
  const model = modelOf(s.selection);
  if (!model?.enabled) throw new Error("\u8BF7\u5148\u5237\u65B0\u6A21\u578B\u6E90\uFF0C\u7B49\u540C\u4E00\u6A21\u578B\u91CD\u65B0\u53EF\u7528\u540E\u518D\u786E\u8BA4");
  const selected = s.selection, hasContext = model.contexts.some((c) => c.tokens === selected.contextTokens);
  modal("\u91CD\u65B0\u786E\u8BA4\u6A21\u578B\u4E0E\u53C2\u6570", `<p>\u7EE7\u7EED\u4F7F\u7528 ${esc6(sourceNames[model.source])} \xB7 ${esc6(model.name)}<br><span class="mono">\u6A21\u578B ID\uFF1A${esc6(model.id)}</span><br>\u786E\u8BA4\u540E\u4FDD\u7559\u5F53\u524D\u8FD0\u884C\u73AF\u5883\u3001\u539F\u751F\u4F1A\u8BDD\u548C\u5386\u53F2\u8BB0\u5F55\u3002</p>
    <label for="rebind-reasoning">\u601D\u8003\u5F3A\u5EA6</label><select id="rebind-reasoning"><option value="">\u6765\u6E90\u9ED8\u8BA4</option>${model.reasoning.map((e) => `<option value="${esc6(e)}" ${selected.reasoning === e ? "selected" : ""}>${esc6(effortName(e))}</option>`).join("")}</select>
    <label for="rebind-context">\u4E0A\u4E0B\u6587\u7A97\u53E3</label><select id="rebind-context">${model.contexts.length ? "" : '<option value="">\u539F\u751F\u9ED8\u8BA4</option>'}${model.contexts.map((c) => `<option value="${c.tokens}" ${(hasContext ? selected.contextTokens : defaultContext(model)) === c.tokens ? "selected" : ""}>${compact(c.tokens)}${c.tokens === model.defaultContextTokens ? "\uFF08\u9ED8\u8BA4\uFF09" : ""}</option>`).join("")}</select>
    <label for="rebind-budget">\u672C\u5730\u538B\u7F29\u9884\u7B97\uFF08\u53EF\u7559\u7A7A\uFF0C\u4F8B\u5982 200K\u30010.5M\uFF09</label><input id="rebind-budget" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="\u4E0D\u8BBE\u7F6E" value="${esc6(selected.contextBudget ? formatTokens(selected.contextBudget) : "")}">`, async () => {
    const context = $2("#rebind-context").value, contextTokens = context ? Number(context) : null, check = budgetCheck($2("#rebind-budget").value, { max: budgetMax(model, contextTokens) });
    if (!check.ok) throw new Error(`\u672C\u5730\u538B\u7F29\u9884\u7B97\uFF1A${check.text}`);
    await call("session:rebind", { sessionId: s.id, selection: { ...selected, identity: model.identity, reasoning: $2("#rebind-reasoning").value || void 0, contextTokens, contextBudget: check.value } });
    await snapshot();
    if (state.sessionId === s.id) {
      renderComposerControls();
      renderBanner();
      renderFooter();
    }
    toast("\u5DF2\u786E\u8BA4\u6A21\u578B\u66F4\u65B0\uFF0C\u53EF\u4EE5\u7EE7\u7EED\u5F53\u524D\u4F1A\u8BDD");
  }, { confirm: "\u786E\u8BA4" });
}
async function applySessionParams() {
  const s = session(), m = modelOf(s?.selection), p = state.params;
  if (!s || !m) return;
  const result = await call("session:rebind", { sessionId: s.id, selection: { ...s.selection, identity: m.identity, reasoning: p.reasoning || void 0, contextTokens: p.contextTokens, contextBudget: p.contextBudget } });
  closeMenu();
  await snapshot();
  renderComposerControls();
  renderBanner();
  renderFooter();
  toast(result?.queued ? "\u65B0\u53C2\u6570\u5DF2\u6392\u961F\uFF0C\u672C\u8F6E\u7ED3\u675F\u540E\u81EA\u52A8\u5E94\u7528\uFF1B\u5E94\u7528\u524D\u53EF\u4EE5\u53D6\u6D88" : "\u5DF2\u66F4\u65B0\u6B64\u4F1A\u8BDD\u7684\u53C2\u6570\uFF0C\u4E0B\u4E00\u8F6E\u751F\u6548");
}
async function cancelQueuedParams() {
  const s = session();
  if (!s?.selectionNext) return;
  await call("session:rebind-cancel", { sessionId: s.id });
  closeMenu();
  await snapshot();
  renderComposerControls();
  renderBanner();
  toast("\u5DF2\u53D6\u6D88\u6392\u961F\u7684\u53C2\u6570\u4FEE\u6539");
}
function paramsText(selection) {
  const parts = [selection.reasoning ? effortName(selection.reasoning) : "\u9ED8\u8BA4\u601D\u8003"];
  if (selection.contextTokens) parts.push(`\u7A97\u53E3 ${compact(selection.contextTokens)}`);
  if (selection.contextBudget) parts.push(`\u9884\u7B97 ${compact(selection.contextBudget)}`);
  return parts.join(" \xB7 ");
}
var readQuestionForm = (i2) => ({ picked: [...document.querySelectorAll(`input[name="q${i2}"]:checked`)].map((x2) => Number(x2.value)), other: document.querySelector(`[data-q-other="${i2}"]`)?.value ?? "" });
function answerQuestion(approvalId) {
  const e = state.events.find((x2) => x2.approvalId === approvalId && x2.type === "question"), summary = e ? approvalSummary(e) : "";
  const qs = structuredQuestions(e?.data);
  if (qs) {
    modal(qs.length > 1 ? `\u56DE\u7B54 Agent \u7684 ${qs.length} \u4E2A\u95EE\u9898` : "\u56DE\u7B54 Agent \u7684\u95EE\u9898", questionFormHtml(qs), async () => {
      const { answers, items } = buildAnswers(qs, readQuestionForm);
      if (!Object.keys(answers).length) throw new Error(qs.length > 1 ? "\u81F3\u5C11\u56DE\u7B54\u4E00\u4E2A\u95EE\u9898\uFF1B\u90FD\u4E0D\u60F3\u56DE\u7B54\u53EF\u4EE5\u5173\u6389\u8FD9\u4E2A\u7A97\u53E3\uFF0C\u70B9\u201C\u4E0D\u56DE\u7B54\u201D" : "\u8BF7\u9009\u4E00\u9879\u6216\u8005\u586B\u5199\u4F60\u7684\u56DE\u7B54\uFF1B\u4E0D\u60F3\u56DE\u7B54\u53EF\u4EE5\u70B9\u201C\u4E0D\u56DE\u7B54\u201D");
      await call("session:approve", { sessionId: state.sessionId, approvalId, choice: "approve", answer: { answers, items } });
    }, { confirm: "\u53D1\u9001\u56DE\u7B54" });
    return;
  }
  modal("\u56DE\u7B54 Agent \u7684\u95EE\u9898", `${summary ? `<p class="question-text">${esc6(summary)}</p>` : ""}<p class="muted">\u6309\u539F\u751F\u534F\u8BAE\u586B\u5199 answers \u5BF9\u8C61\uFF08JSON\uFF09\u3002\u590D\u6742\u4EA4\u4E92\u4E5F\u53EF\u4EE5\u5728\u539F\u751F\u754C\u9762\u4E2D\u5B8C\u6210\u3002</p><textarea id="question-answer" rows="7" placeholder="{}" spellcheck="false"></textarea>`, async () => {
    const answer = JSON.parse($2("#question-answer").value || "{}");
    await call("session:approve", { sessionId: state.sessionId, approvalId, choice: "approve", answer });
  }, { confirm: "\u53D1\u9001\u56DE\u7B54" });
}
function toggleLeft() {
  ui.left = !ui.left;
  saveUi();
  applyLayout();
  renderTopbar();
}
function toggleRight() {
  ui.right = !ui.right;
  saveUi();
  applyLayout();
  renderTopbar();
  if (ui.right) renderRightBody();
}
function setRightTab(tab) {
  ui.rightTab = tab;
  saveUi();
  if (!ui.right) {
    ui.right = true;
    applyLayout();
    renderTopbar();
  }
  renderRightTabs();
  renderRightBody();
}
async function saveModelDefault() {
  await call("preference:save", { modelKey: state.modelKey === "native" ? "native:" + state.runtimeId : state.modelKey, value: { runtimeId: state.runtimeId, nativeModel: state.nativeModel, reasoning: state.reasoning, contextTokens: state.contextTokens, contextBudget: state.contextBudget } });
  await snapshot();
  toast("\u5DF2\u8BB0\u4F4F\u6B64\u6A21\u578B\u7684\u53C2\u6570\u642D\u914D");
}
document.addEventListener("mousedown", (e) => {
  if (!menu) return;
  if (e.target.closest("#popover") || e.target.closest(`#${menu.anchorId}`)) return;
  closeMenu();
});
document.addEventListener("toggle", (e) => {
  if (!e.target.matches?.(".tool-fold") || !e.target.open || e.target.querySelector(".tool-fold-body")?.childElementCount) return;
  const scroller = $2("#scroller"), top = scroller?.scrollTop;
  renderChat(true);
  if (scroller) scroller.scrollTop = top;
}, true);
document.addEventListener("contextmenu", (e) => {
  const link = e.target.closest?.(".markdown a:not(.file-link)"), url = link && webLink(link.getAttribute("href"));
  if (url) {
    e.preventDefault();
    closeMenu();
    menu = { kind: "link", at: { x: e.clientX, y: e.clientY }, url };
    paintMenu();
    return;
  }
  const target = fileTarget(e.target);
  if (!target || !state.projectId) return;
  e.preventDefault();
  const at2 = { x: e.clientX, y: e.clientY };
  void action(async () => {
    const info = await locateFile(target.path);
    closeMenu();
    menu = { kind: "file", at: at2, file: { ...info, path: target.path, line: target.line } };
    paintMenu();
  });
});
document.addEventListener("click", (e) => {
  const t = e.target;
  const hit = (selector) => t.closest(selector);
  let el;
  if (el = hit("[data-archive]")) {
    e.stopPropagation();
    closeMenu();
    if (el.dataset.archive) archiveSession(el.dataset.archive);
    return;
  }
  if (el = hit("[data-new-in]")) {
    newSession(el.dataset.newIn);
    return;
  }
  if (el = hit("[data-reveal]")) {
    void action(() => call("project:reveal", { projectId: el.dataset.reveal }));
    return;
  }
  if (el = hit("[data-folder]")) {
    const id2 = el.dataset.folder;
    ui.collapsed = ui.collapsed.includes(id2) ? ui.collapsed.filter((x2) => x2 !== id2) : [...ui.collapsed, id2];
    saveUi();
    renderFolders();
    return;
  }
  if (el = hit("[data-show-all]")) {
    showAll.add(el.dataset.showAll);
    renderFolders();
    return;
  }
  if (el = hit("[data-session]")) {
    void action(() => openSession(el.dataset.session));
    return;
  }
  if (el = hit("[data-stop-session]")) {
    stopSession(el.dataset.stopSession);
    return;
  }
  if (el = hit("[data-rtab]")) {
    setRightTab(el.dataset.rtab);
    return;
  }
  if (el = hit("[data-pick-folder]")) {
    closeMenu();
    newSession(el.dataset.pickFolder);
    return;
  }
  if (el = hit("[data-env]")) {
    selectRuntime(el.dataset.env);
    closeMenu();
    renderComposerControls();
    renderBanner();
    return;
  }
  if (el = hit("[data-permission-choice]")) {
    const value = el.dataset.permissionChoice === "__default" ? null : el.dataset.permissionChoice, s = session(), runtimeId = s ? s.runtimeId : state.runtimeId;
    const current = s ? sessionPermission(s).mode : permissionsFor(null, runtime(runtimeId))?.current ?? null;
    changePermission(runtimeId, value, current, async () => {
      if (s) await call("session:permission", { sessionId: s.id, mode: value });
      else await call("runtime:permission", { runtimeId, mode: value, selection: { modelKey: state.modelKey } });
      await snapshot();
      closeMenu();
      renderComposerControls();
    });
    return;
  }
  if (el = hit("[data-runtime-permission]")) {
    const [runtimeId, choice, scope] = el.dataset.runtimePermission.split("|");
    const mode = choice === "__default" ? null : choice, saved = runtime(runtimeId)?.permissions, current = (scope === "native" ? saved?.bySelection?.native : saved)?.current ?? null;
    changePermission(runtimeId, mode, current, async () => {
      await call("runtime:permission", { runtimeId, mode, ...scope === "native" ? { selection: { modelKey: "native" } } : {} });
      await snapshot();
      renderSettings();
      renderComposerControls();
    });
    return;
  }
  if (el = hit("[data-model-group]")) {
    const source = el.dataset.modelGroup;
    if (openGroups.has(source)) openGroups.delete(source);
    else openGroups.add(source);
    const list = $2("#menu-list");
    if (list) {
      list.innerHTML = modelListHtml();
      placeMenu();
    }
    return;
  }
  if (el = hit("[data-model-key]")) {
    selectModel(el.dataset.modelKey);
    repaintParams();
    return;
  }
  if (el = hit("[data-effort]")) {
    paramTarget().reasoning = el.dataset.effort;
    repaintParams();
    return;
  }
  if (el = hit("[data-context]")) {
    const target = paramTarget(), value = Number(el.dataset.context), m = session() ? modelOf(session().selection) : currentModel();
    target.contextTokens = value;
    if (target.contextBudget && !validBudget(m, target.contextBudget, value)) target.contextBudget = null;
    repaintParams();
    return;
  }
  if (el = hit("[data-open-settings]")) {
    closeGuide();
    openSettings(el.dataset.openSettings);
    return;
  }
  if (el = hit("[data-update]")) {
    void action(() => updateAction(el.dataset.update));
    return;
  }
  if (el = hit("[data-rules]")) {
    void action(() => rulesAction(el.dataset.rules));
    return;
  }
  if (el = hit("[data-rule-delete]")) {
    const id2 = el.dataset.ruleDelete;
    void action(async () => {
      state.rules = await call("rules:delete", { id: id2 });
      renderSettings();
      toast("\u5DF2\u5220\u9664");
    });
    return;
  }
  if (el = hit("[data-rule-undo]")) {
    const id2 = el.dataset.ruleUndo;
    el.disabled = true;
    void action(async () => {
      try {
        const view = await call("rules:undo", { id: id2 });
        if (state.rules) state.rules = view;
        toast("\u5DF2\u64A4\u9500\u8FD9\u6761\u957F\u671F\u8981\u6C42");
      } finally {
        el.disabled = false;
      }
    });
    return;
  }
  if (el = hit("[data-open-rules]")) {
    openSettings("rules");
    return;
  }
  if (el = hit("[data-rule-session]")) {
    const id2 = el.dataset.ruleSession;
    closeSettings();
    void action(() => openSession(id2));
    return;
  }
  if (el = hit("[data-source-install]")) {
    void action(() => call("source:install", { id: el.dataset.sourceInstall }));
    return;
  }
  if (el = hit("[data-source-cancel]")) {
    void action(() => call("source:cancel", { id: el.dataset.sourceCancel }));
    return;
  }
  if (el = hit("[data-source-page]")) {
    void action(() => call("source:openPage", { id: el.dataset.sourcePage }));
    return;
  }
  if (el = hit("[data-env-install]")) {
    void action(() => call("environment:install", { id: el.dataset.envInstall }));
    return;
  }
  if (el = hit("[data-env-update]")) {
    void action(() => call("environment:update", { id: el.dataset.envUpdate }));
    return;
  }
  if (el = hit("[data-env-check]")) {
    const id2 = el.dataset.envCheck;
    void action(() => serviceCall("environment:check", { id: id2 }, "\u5DF2\u68C0\u67E5\u66F4\u65B0"));
    return;
  }
  if (el = hit("[data-env-cancel]")) {
    void action(() => call("environment:cancel", { id: el.dataset.envCancel }));
    return;
  }
  if (el = hit("[data-env-page]")) {
    void action(() => call("environment:openPage", { id: el.dataset.envPage }));
    return;
  }
  if (el = hit("[data-svc-action]")) {
    const [id2, verb] = el.dataset.svcAction.split("|");
    el.disabled = true;
    void action(() => serviceCall(`bridgeService:${verb}`, { id: id2 })).finally(() => {
      el.disabled = false;
    });
    return;
  }
  if (el = hit("[data-svc-key]")) {
    const [id2, verb] = el.dataset.svcKey.split("|");
    void action(() => serviceKey(id2, verb));
    return;
  }
  if (el = hit("[data-svc-models]")) {
    void toggleServiceModels(el.dataset.svcModels);
    return;
  }
  if (el = hit("[data-svc-refresh]")) {
    const id2 = el.dataset.svcRefresh, view = serviceView(id2);
    el.disabled = true;
    void action(async () => {
      await call("bridgeService:refreshModels", { id: id2 });
      if (view.models) {
        const r = await call("bridgeService:models", { id: id2 });
        view.list = Array.isArray(r) ? r : r?.data ?? [];
      }
      await serviceCall(null, null, "\u6A21\u578B\u5217\u8868\u5DF2\u5237\u65B0");
    }).finally(() => {
      el.disabled = false;
    });
    return;
  }
  if (el = hit("[data-svc-connect]")) {
    const [id2, target] = el.dataset.svcConnect.split("|"), name = { dsh: "DeepSeek Harness", kimi: "Kimi Code", codex: "Codex CLI" }[target] ?? target, view = serviceView(id2);
    view.connecting = true;
    refreshSettingsLive();
    void action(async () => {
      const r = await call("bridgeService:connect", { id: id2, target }), moved = r?.defaultMigration?.to, env = [r?.requiredEnv].flat().filter(Boolean);
      await serviceCall(null, null);
      if (env.length) {
        modal(`\u8FD8\u5DEE\u4E00\u6B65\u63A5\u5165 ${name}`, `<p class="modal-text">${esc6(r.message ?? `\u8BF7\u628A\u672C\u63A5\u53E3\u7684\u5BC6\u94A5\u8BBE\u4E3A\u73AF\u5883\u53D8\u91CF ${env.join("\u3001")}\uFF0C\u518D\u91CD\u65B0\u6253\u5F00 ${name}\u3002`)}</p>`, () => {
        }, { confirm: "\u77E5\u9053\u4E86" });
        return;
      }
      const where = target === "codex" && r?.profile ? `\uFF0C\u5728 Codex \u91CC\u7528 codex --profile ${r.profile} \u4F7F\u7528` : target === "kimi" && r?.path ? ` \xB7 ${r.path}` : r?.providerId ? ` \xB7 ${r.providerId}` : "";
      const live = r?.applied === "hot-reload" ? "\u3002\u8FD0\u884C\u4E2D\u7684 DSH \u51E0\u79D2\u5185\u81EA\u52A8\u52A0\u8F7D\uFF0C\u6CA1\u5F00\u7684\u8BDD\u4E0B\u6B21\u542F\u52A8\u751F\u6548" : "";
      toast(`\u5DF2\u63A5\u5165 ${name}${where}${moved ? `\uFF1BDSH \u9ED8\u8BA4\u6A21\u578B\u6539\u4E3A ${moved.model}${r.defaultMigration.matched === false ? "\uFF08\u6CA1\u627E\u5230\u540C\u6B3E\uFF0C\u7528\u4E86\u7B2C\u4E00\u4E2A\uFF09" : ""}` : ""}${live}`);
    }).finally(() => {
      view.connecting = false;
      refreshSettingsLive();
    });
    return;
  }
  if (el = hit("[data-svc-disconnect]")) {
    const [id2, target] = el.dataset.svcDisconnect.split("|"), name = { dsh: "DeepSeek Harness", kimi: "Kimi Code", codex: "Codex CLI" }[target] ?? target;
    modal(`\u65AD\u5F00 ${name}`, `<p class="modal-text">\u4F1A\u4ECE ${esc6(name)} \u7684\u914D\u7F6E\u91CC\u79FB\u9664\u8FD9\u4E2A\u63A5\u53E3\u548C\u5B83\u7684\u5BC6\u94A5\uFF0C\u5176\u4ED6\u914D\u7F6E\u4E0D\u53D8\u3002\u4FEE\u6539\u524D\u4F1A\u7559\u4E00\u4EFD\u5907\u4EFD\u3002</p>`, async () => {
      const r = await call("bridgeService:disconnect", { id: id2, target });
      await serviceCall(null, null, r?.changed === false ? `${name} \u91CC\u6CA1\u6709\u8FD9\u4E2A\u63A5\u53E3` : r?.message ?? `\u5DF2\u65AD\u5F00 ${name}`);
    }, { confirm: "\u65AD\u5F00", danger: true });
    return;
  }
  if (el = hit("[data-svc-apply-port]")) {
    const id2 = el.dataset.svcApplyPort, input = document.querySelector(`[data-svc-port="${CSS.escape(id2)}"]`), port = Number(input?.value);
    void action(async () => {
      if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("\u7AEF\u53E3\u9700\u8981\u662F 1024\u201365535 \u4E4B\u95F4\u7684\u6574\u6570");
      input.blur();
      await serviceCall("bridgeService:configure", { id: id2, port }, `\u7AEF\u53E3\u5DF2\u6539\u4E3A ${port}`);
    });
    return;
  }
  if (el = hit("[data-copy-text]")) {
    const text3 = el.dataset.copyText;
    if (text3) void action(async () => {
      await call("clipboard:write", { text: text3 });
      toast("\u5DF2\u590D\u5236");
    });
    return;
  }
  if (el = hit("[data-settings-tab]")) {
    state.settings = el.dataset.settingsTab;
    renderSettings();
    return;
  }
  if (el = hit("[data-theme-choice]")) {
    void action(async () => {
      await call("preference:theme", { theme: el.dataset.themeChoice });
      await snapshot();
      renderSettings();
    });
    return;
  }
  if (el = hit("[data-refresh-source]")) {
    const source = el.dataset.refreshSource;
    void action(async () => {
      const pending2 = call("provider:refresh", { source });
      setTimeout(() => void snapshot().then(() => {
        refreshSettingsLive();
        if (ui.rightTab === "tasks") renderTasksLive();
      }), 120);
      await pending2;
      capCache.clear();
      await snapshot();
      refreshSettingsLive();
      renderComposerControls();
      paintGuide();
      toast(`${sourceNames[source]} \u76EE\u5F55\u5DF2\u66F4\u65B0`);
    });
    return;
  }
  if (el = hit("[data-use-model]")) {
    const key = el.dataset.useModel, m = models().find((x2) => x2.key === key);
    if (m) {
      const target = m.boundRuntime ?? (compatible(state.runtimeId, m) && usable(runtime(state.runtimeId)) ? state.runtimeId : state.snapshot.runtimes.find((r) => usable(r) && compatible(r.id, m))?.id);
      if (!target || !usable(runtime(target))) {
        toast(target ? unusableReason(runtime(target)) : "\u6CA1\u6709\u80FD\u8FD0\u884C\u8FD9\u4E2A\u6A21\u578B\u7684\u53EF\u7528\u73AF\u5883", true);
        return;
      }
      state.runtimeId = target;
      ui.runtimeId = target;
    }
    closeSettings();
    selectModel(key);
    newSession(state.projectId);
    return;
  }
  if (el = hit("[data-use-runtime]")) {
    if (selectRuntime(el.dataset.useRuntime)) {
      closeSettings();
      newSession(state.projectId);
    }
    return;
  }
  if (el = hit("[data-configure-runtime]")) {
    void action(async () => {
      await call("runtime:configure", { runtimeId: el.dataset.configureRuntime });
      await snapshot();
      renderSettings();
      renderComposerControls();
      renderBanner();
    });
    return;
  }
  if (el = hit("[data-open-runtime]")) {
    void action(() => call("native:open", { runtimeId: el.dataset.openRuntime, projectId: state.projectId }));
    return;
  }
  if (el = hit("[data-file-path]")) {
    void action(() => openFile(el.dataset.filePath, el.dataset.directory === "true"));
    return;
  }
  if (el = hit("[data-diff-file]")) {
    void action(() => showDiff(el.dataset.diffFile));
    return;
  }
  if (el = hit("[data-approval]")) {
    const sessionId = state.sessionId, card = el.closest(".approval-card");
    card?.querySelectorAll("button").forEach((b) => {
      b.disabled = true;
    });
    void call("session:approve", { sessionId, approvalId: el.dataset.approval, choice: el.dataset.choice }).catch(async (error) => {
      if (/已结束或已过期/.test(error.message)) toast("\u8FD9\u6761\u6388\u6743\u5DF2\u7ECF\u7ED3\u675F\uFF1A\u4EFB\u52A1\u5DF2\u505C\u6B62\u6216\u8FD9\u4E00\u8F6E\u5DF2\u7ECF\u7ED3\u675F\u3002");
      else {
        card?.querySelectorAll("button").forEach((b) => {
          b.disabled = false;
        });
        toast(error.message, true);
      }
    });
    return;
  }
  if (hit("[data-approval-native]")) {
    void openNative();
    return;
  }
  if (el = hit("[data-question]")) {
    answerQuestion(el.dataset.question);
    return;
  }
  if (el = hit("[data-quick]")) {
    const v2 = el.dataset.quick;
    if (v2 === "project") void addProject();
    else openSettings(v2);
    return;
  }
  if (el = hit(".copy-answer")) {
    void action(async () => {
      await call("clipboard:write", { text: el.closest(".message").querySelector(".message-content")?.innerText ?? "" });
      toast("\u5DF2\u590D\u5236");
    });
    return;
  }
  if (el = hit("[data-attach-remove]")) {
    removeAttachment(el.dataset.attachRemove);
    return;
  }
  if (el = hit("[data-delivery]")) {
    state.delivery = el.dataset.delivery === "queue" ? "queue" : "steer";
    renderComposerControls();
    $2("#prompt")?.focus();
    return;
  }
  if (el = hit("[data-queue-edit]")) {
    void action(() => editQueued(el.dataset.queueEdit));
    return;
  }
  if (el = hit("[data-queue-remove]")) {
    void action(() => removeQueued(el.dataset.queueRemove));
    return;
  }
  if (el = hit("[data-queue-send]")) {
    el.disabled = true;
    void action(sendQueuedNow).finally(() => {
      el.disabled = false;
    });
    return;
  }
  if (el = hit("[data-media-open]")) {
    openLightbox(el.dataset.mediaOpen, el.dataset.mediaName);
    return;
  }
  if (el = hit("[data-media-reveal]")) {
    void action(() => call("media:reveal", { url: el.dataset.mediaReveal }));
    return;
  }
  if (el = hit("[data-media-save]")) {
    void action(async () => {
      if (await call("media:save", { url: el.dataset.mediaSave })) toast("\u5DF2\u53E6\u5B58");
    });
    return;
  }
  if (t.id === "lightbox") {
    $2("#lightbox").close();
    return;
  }
  if (el = hit("[data-file-menu]")) {
    const f2 = menu?.file, id2 = el.dataset.fileMenu;
    closeMenu();
    if (f2) void action(() => fileMenuAction(id2, f2));
    return;
  }
  if (el = hit(".file-link")) {
    e.preventDefault();
    const line = Number(el.dataset.linkLine) || null, path2 = el.dataset.linkPath;
    void action(async () => previewFile(await locateFile(path2), line));
    return;
  }
  if (el = hit("[data-link-menu]")) {
    const url = menu?.url, id2 = el.dataset.linkMenu;
    closeMenu();
    if (url) void action(async () => {
      if (id2 === "open") await call("link:open", { url });
      else {
        await call("clipboard:write", { text: url });
        toast("\u5DF2\u590D\u5236\u94FE\u63A5");
      }
    });
    return;
  }
  if (el = hit(".markdown a")) {
    e.preventDefault();
    const url = webLink(el.getAttribute("href"));
    if (url) void action(() => call("link:open", { url }));
    return;
  }
  const id = hit("button[id]")?.id;
  switch (id) {
    case "new-session":
      newSession();
      break;
    case "add-project":
    case "empty-add-project":
    case "menu-open-folder":
      closeMenu();
      void addProject();
      break;
    case "open-settings":
      openSettings();
      break;
    case "close-settings":
      closeSettings();
      break;
    case "collapse-left":
    case "toggle-left":
      toggleLeft();
      break;
    case "collapse-right":
    case "toggle-right":
      toggleRight();
      break;
    case "folder-chip":
      menu?.kind === "folder" ? closeMenu() : openMenu(hit("#folder-chip"), "folder");
      break;
    case "env-chip":
      menu?.kind === "env" ? closeMenu() : openMenu(hit("#env-chip"), "env");
      break;
    case "model-chip":
      menu?.kind === "model" ? closeMenu() : openMenu(hit("#model-chip"), "model");
      break;
    case "perm-chip":
      menu?.kind === "permission" ? closeMenu() : openMenu(hit("#perm-chip"), "permission");
      break;
    case "session-more":
      menu?.kind === "session" ? closeMenu() : openMenu(hit("#session-more"), "session");
      break;
    case "menu-rename":
      closeMenu();
      renameSession();
      break;
    case "menu-feedback":
      closeMenu();
      void action(openFeedback);
      break;
    case "menu-reveal":
      closeMenu();
      void action(() => call("project:reveal", { projectId: state.projectId }));
      break;
    case "rename-session":
      renameSession();
      break;
    case "native-session":
      void openNative();
      break;
    case "send":
      void submit();
      break;
    case "stop-run": {
      const s = session();
      if (s && busy(s)) stopSession(s.id);
      break;
    }
    case "attach-btn":
      void action(pickFiles);
      break;
    case "lightbox-close":
      $2("#lightbox").close();
      break;
    case "save-model-default":
      void action(saveModelDefault);
      break;
    case "apply-session-params":
      void action(applySessionParams);
      break;
    case "cancel-session-params":
    case "cancel-queued-params":
      void action(cancelQueuedParams);
      break;
    case "load-native-models":
      void loadNativeModels();
      break;
    case "refresh-session-model": {
      const s = session();
      void action(async () => {
        await call("provider:refresh", { source: s.selection.modelKey.split(":")[0] });
        await snapshot();
        renderComposerControls();
        renderBanner();
      });
      break;
    }
    case "rebind-session-model":
      void action(() => openRecovery(session()));
      break;
    case "refresh-git":
      void renderChanges();
      break;
    case "init-git":
      void action(async () => {
        await call("git:init", { projectId: state.projectId });
        state.git = null;
        await renderChanges();
      });
      break;
    case "stage-selected":
      void action(async () => {
        const paths2 = [...document.querySelectorAll('input[name="stage-file"]:checked')].map((x2) => x2.value);
        await call("git:stage", { projectId: state.projectId, paths: paths2 });
        toast("\u5DF2\u6682\u5B58\u6240\u9009\u6587\u4EF6");
        await renderChanges();
      });
      break;
    case "commit":
      void action(async () => {
        await call("git:commit", { projectId: state.projectId, message: $2("#commit-message").value });
        toast("\u5DF2\u521B\u5EFA\u672C\u5730\u63D0\u4EA4");
        await renderChanges();
      });
      break;
    case "refresh-files":
      void action(async () => {
        state.tree.clear();
        await loadTree();
        await renderFiles();
      });
      break;
    case "edit-file":
      if (state.file) {
        state.file.editing = true;
        void renderFiles().then(() => $2("#editor")?.focus());
      }
      break;
    case "save-file":
      void saveFile();
      break;
    case "cancel-edit":
      void action(() => discardFile(false));
      break;
    case "close-file":
      void action(() => discardFile(true));
      break;
    case "reference-file": {
      if (!state.file) break;
      state.draft = `${state.draft}${state.draft && !state.draft.endsWith("\n") ? "\n" : ""}\u8BF7\u67E5\u770B\u6587\u4EF6 \`${state.file.path}\`\u3002`;
      stashDraft();
      const prompt = $2("#prompt");
      if (prompt) {
        prompt.value = state.draft;
        autosize(prompt);
        prompt.focus();
      }
      toast("\u5DF2\u628A\u6587\u4EF6\u8DEF\u5F84\u52A0\u5165\u4EFB\u52A1\u8349\u7A3F");
      break;
    }
    case "stop-terminal":
      void action(() => call("terminal:stop", { projectId: state.projectId }));
      break;
    case "clear-terminal":
      views.terminal(state.projectId).text = "";
      renderTerminal();
      break;
    case "refresh-runtimes":
      void action(async () => {
        await call("runtime:refresh");
        capCache.clear();
        await snapshot();
        renderSettings();
        renderComposerControls();
        renderBanner();
        toast("\u5DF2\u91CD\u65B0\u68C0\u6D4B\u8FD0\u884C\u73AF\u5883");
      });
      break;
    case "check-environments": {
      const b = hit("#check-environments");
      b.disabled = true;
      void action(() => serviceCall("environment:check", {}, "\u5DF2\u68C0\u67E5\u5168\u90E8\u73AF\u5883\u7684\u66F4\u65B0")).finally(() => {
        b.disabled = false;
      });
      break;
    }
    case "open-guide":
      openGuide();
      break;
    case "guide-later":
      closeGuide();
      break;
    case "guide-done":
      void action(async () => {
        try {
          await call("onboarding:complete");
        } finally {
          closeGuide();
        }
      });
      break;
    case "guide-add-project":
      void addProject().then(paintGuide);
      break;
  }
});
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (e.key === "Escape") {
    if (menu) {
      closeMenu();
      e.preventDefault();
      return;
    }
    if (state.settings && !$2("#modal").open) {
      closeSettings();
      e.preventDefault();
    }
    return;
  }
  if (!e.ctrlKey) return;
  if (key === "n") {
    e.preventDefault();
    newSession();
  } else if (key === "b" && e.altKey) {
    e.preventDefault();
    toggleRight();
  } else if (key === "b") {
    e.preventDefault();
    toggleLeft();
  } else if (key === "j") {
    e.preventDefault();
    setRightTab("tasks");
    $2("#terminal-command")?.focus();
  } else if (key === ",") {
    e.preventDefault();
    state.settings ? closeSettings() : openSettings();
  } else if (key === "s" && state.file?.editing) {
    e.preventDefault();
    void saveFile();
  }
});
window.addEventListener("resize", () => {
  applyLayout();
  if (menu) placeMenu();
});
function startResize(e) {
  dragging = { x: e.clientX, width: ui.rightWidth };
  $2("#app").classList.add("resizing");
  e.preventDefault();
}
document.addEventListener("mousedown", (e) => {
  if (e.target.id === "rp-resizer") startResize(e);
});
var chatPinned = true;
document.addEventListener("scroll", (e) => {
  if (e.target.id === "scroller") {
    const s = e.target;
    chatPinned = s.scrollHeight - s.scrollTop - s.clientHeight < 160;
  }
}, true);
for (const type of ["load", "loadedmetadata"]) document.addEventListener(type, (e) => {
  if (!chatPinned || !["IMG", "VIDEO"].includes(e.target.tagName) || !e.target.closest("#chat")) return;
  const s = $2("#scroller");
  if (s) s.scrollTop = s.scrollHeight;
}, true);
document.addEventListener("error", (e) => {
  const el = e.target;
  if (!["IMG", "VIDEO", "AUDIO"].includes(el?.tagName) || !el.closest("#chat,#attach-tray")) return;
  if (markBroken(el.getAttribute("src"))) {
    mediaGen++;
    markdownCache.clear();
    scheduleChat();
  }
}, true);
document.addEventListener("dragenter", (e) => {
  if (!carriesFiles(e)) return;
  e.preventDefault();
  if (++dropDepth === 1 && $2("#prompt")) showDropHint(true);
});
document.addEventListener("dragover", (e) => {
  if (!carriesFiles(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = $2("#prompt") && allowedKinds(attachCaps()).length ? "copy" : "none";
});
document.addEventListener("dragleave", (e) => {
  if (!carriesFiles(e)) return;
  if (--dropDepth <= 0) {
    dropDepth = 0;
    showDropHint(false);
  }
});
document.addEventListener("drop", (e) => {
  if (!carriesFiles(e)) return;
  e.preventDefault();
  dropDepth = 0;
  showDropHint(false);
  if ($2("#prompt")) void addFiles([...e.dataTransfer.files]);
});
function openLightbox(url, name) {
  const el = $2("#lightbox"), src = mediaUrl(url);
  if (!el || !src) return;
  el.innerHTML = `<div class="lightbox-bar"><span class="lightbox-name">${esc6(name ?? "")}</span><button class="icon-btn" data-media-reveal="${esc6(src)}" title="\u5728\u6587\u4EF6\u5939\u4E2D\u663E\u793A">${icon("folder")}</button><button class="icon-btn" data-media-save="${esc6(src)}" data-media-name="${esc6(name ?? "")}" title="\u53E6\u5B58\u4E3A\u2026">${icon("download")}</button><button class="icon-btn" id="lightbox-close" title="\u5173\u95ED (Esc)">${icon("close")}</button></div><img src="${esc6(src)}" alt="${esc6(name ?? "")}">`;
  el.showModal();
}
document.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  ui.rightWidth = Math.round(Math.max(320, Math.min(Math.min(760, innerWidth - 560), dragging.width + dragging.x - e.clientX)));
  applyLayout();
});
document.addEventListener("mouseup", () => {
  if (!dragging) return;
  dragging = null;
  $2("#app").classList.remove("resizing");
  saveUi();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.matches?.("[data-svc-profile]")) {
    const id = t.dataset.svcProfile;
    t.blur();
    void action(() => serviceCall("bridgeService:configure", { id, defaultProfile: t.value }));
    return;
  }
  if (t.matches?.("[data-rules-auto]")) {
    const enabled = t.checked;
    void action(async () => {
      state.rules = await call("rules:auto", { enabled });
      renderSettings();
      toast(enabled ? "\u5DF2\u5F00\u542F\u81EA\u52A8\u8BB0\u5F55\u957F\u671F\u8981\u6C42" : "\u5DF2\u5173\u95ED\u81EA\u52A8\u8BB0\u5F55\u957F\u671F\u8981\u6C42");
    });
    return;
  }
  if (t.matches?.("[data-rules-detector]")) {
    const model = t.value;
    t.blur();
    void action(async () => {
      state.rules = await call("rules:detector", { model });
      renderSettings();
      toast(model === "session" ? "\u8BC6\u522B\u6539\u4E3A\u8DDF\u968F\u4F1A\u8BDD\u5F53\u524D\u6A21\u578B" : "\u5DF2\u66F4\u6362\u8BC6\u522B\u7528\u7684\u6A21\u578B");
    });
    return;
  }
  if (t.matches?.("[data-update-auto]")) {
    const enabled = t.checked;
    void action(async () => {
      await call("update:auto-download", { enabled });
      toast(enabled ? "\u5DF2\u5F00\u542F\u81EA\u52A8\u4E0B\u8F7D\u66F4\u65B0\u5305" : "\u5DF2\u5173\u95ED\u81EA\u52A8\u4E0B\u8F7D\u66F4\u65B0\u5305");
      await snapshot();
      refreshSettingsLive();
      renderUpdateSlot();
    });
    return;
  }
  if (t.matches?.("[data-svc-autostart]")) {
    const id = t.dataset.svcAutostart, enabled = t.checked;
    void action(async () => {
      try {
        await call("bridgeService:autostart", { id, enabled });
        toast(enabled ? "\u5DF2\u5F00\u542F\u5F00\u673A\u542F\u52A8" : "\u5DF2\u5173\u95ED\u5F00\u673A\u542F\u52A8");
      } finally {
        await serviceCall(null, null);
      }
    });
  }
});
var refreshing = false;
var refreshAgain = false;
async function refreshFromBackend() {
  if (refreshing) {
    refreshAgain = true;
    return;
  }
  refreshing = true;
  try {
    const wasChecking = state.snapshot?.startup?.environments === "checking";
    await snapshot();
    if (wasChecking && state.snapshot.startup?.environments !== "checking") {
      capCache.clear();
      if (!guideShown && !state.snapshot.runtimes.some(usable)) openGuide();
    }
    for (const id of stopping) if (!busy(state.snapshot.sessions.find((x2) => x2.id === id))) stopping.delete(id);
    const s = session(), wasBusy = lastBusy;
    lastBusy = busy(s);
    renderFolders();
    renderTopbar();
    renderComposerControls();
    renderBanner();
    renderFooter();
    renderRightTabs();
    if (ui.rightTab === "tasks") renderTasksLive();
    if (wasBusy && !lastBusy && ui.right && ui.rightTab === "changes") void renderChanges();
    if (state.settings) refreshSettingsLive();
    paintGuide();
    if (menu?.kind === "model" && !session()) repaintParams();
    if (s) scheduleChat();
    tick();
  } catch (e) {
    toast(e.message, true);
  } finally {
    refreshing = false;
    if (refreshAgain) {
      refreshAgain = false;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void refreshFromBackend(), 70);
    }
  }
}
window.workbench.onChange(() => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => void refreshFromBackend(), 70);
});
window.workbench.onEvent((event) => {
  if (event.type === "update-progress") {
    const d = state.snapshot?.updates?.download;
    if (d && d.status === "downloading" && (!d.version || d.version === event.version)) {
      d.received = event.received;
      d.total = event.total;
      renderUpdateSlot();
      if (state.settings === "about") refreshSettingsLive();
    }
    return;
  }
  if (event.type === "rules-change") {
    if (state.settings === "rules") {
      if (!state.rulesEditing) void loadRules();
    } else state.rules = null;
    return;
  }
  if (event.type === "catalog-diff") {
    const name = sourceNames[event.source] ?? event.source, list = (a3) => a3.slice(0, 4).join("\u3001") + (a3.length > 4 ? ` \u7B49 ${a3.length} \u4E2A` : "");
    const parts = [event.added?.length ? `\u65B0\u589E ${list(event.added)}` : "", event.removed?.length ? `\u4E0B\u67B6 ${list(event.removed)}` : ""].filter(Boolean);
    if (parts.length) toast(`${name} \u6A21\u578B\u76EE\u5F55\u5DF2\u66F4\u65B0\uFF1A${parts.join("\uFF1B")}`);
    return;
  }
  if (event.type === "source-job") {
    const component = state.snapshot?.sourceComponents?.find((x2) => x2.id === event.id);
    if (component) component.job = { action: event.action, state: event.state, received: event.received, total: event.total, message: event.message };
    if (state.settings === "sources") refreshSettingsLive();
    paintGuide();
    return;
  }
  if (event.type === "environment-job") {
    const env = state.snapshot?.environments?.find((x2) => x2.id === event.id);
    if (env) env.job = { action: event.action, state: event.state, received: event.received, total: event.total, message: event.message };
    if (state.settings === "runtimes") refreshSettingsLive();
    paintGuide();
    return;
  }
  if (["terminal", "terminal-start", "terminal-exit"].includes(event.type)) {
    const terminal = views.terminalEvent(event);
    if (event.projectId === state.projectId) {
      state.terminalText = terminal.text;
      state.terminalBusy = terminal.running;
      const out = $2("#terminal-output");
      if (event.type === "terminal" && out) {
        out.textContent = terminal.text;
        out.scrollTop = out.scrollHeight;
      } else if (event.type !== "terminal") renderTerminal();
    }
    return;
  }
  if (event.sessionId) {
    activity.feed(event);
    paintActivity(event.sessionId);
  }
  if (event.type === "attachments-discarded") markDiscarded(event.attachmentIds ?? []);
  if (event.sessionId !== state.sessionId) return;
  if (event.type === "turn-end") {
    let retry = false;
    for (const [key, found] of mediaLookup) if (found === null && key.startsWith(event.sessionId + "\0")) {
      mediaLookup.delete(key);
      retry = true;
    }
    if (retry) mediaGen++;
  }
  if (state.historyLoading) {
    state.historyLoading.events.push(event);
    return;
  }
  metrics.feed(event);
  appendDisplayEvent(state.events, event);
  scheduleChat();
  if (event.type === "diff" && ui.rightTab === "changes" && ui.right) paintChanges();
});
async function start() {
  renderSidebarFrame();
  renderRightFrame();
  applyLayout();
  await action(async () => {
    await snapshot();
    lastBusy = busy(session());
    renderAll();
    tick();
    const firstRun = state.snapshot.onboarding?.show && !state.snapshot.projects.length && !state.snapshot.sessions.length;
    const scanning = state.snapshot.startup?.environments === "checking";
    if (!guideShown && (firstRun || !scanning && !state.snapshot.runtimes.some(usable))) openGuide();
    await Promise.all(state.snapshot.projects.map(async (p) => {
      const terminal = views.terminal(p.id), revision = terminal.revision;
      const saved = await call("terminal:state", { projectId: p.id });
      if (terminal.revision === revision) Object.assign(terminal, saved);
    }));
    if (ui.rightTab === "tasks") renderTerminal();
  });
}
void start();
/*! Bundled license information:

dompurify/dist/purify.es.mjs:
  (*! @license DOMPurify 3.4.17 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.4.17/LICENSE *)
  (*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE *)
*/
//# sourceMappingURL=build.js.map
