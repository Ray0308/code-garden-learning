const assert = require('node:assert/strict');
const registry = require('../core/language-registry.js');
const content = require('../levels.js');
require('../courses/python-common.js');
require('../courses/python-hints.js');
const tools = require('../courses/language-variant-tools.js');
const javaCourse = require('../courses/java.js');
const phpCourse = require('../courses/php.js');
const javascriptCourse = require('../courses/javascript.js');
const python = require('../engines/python.js');
require('../engines/brace-adapter.js');
const java = require('../engines/java.js');
const php = require('../engines/php.js');
const javascript = require('../engines/javascript.js');
const gameSolutions = require('./solutions.cjs');
const fs = require('node:fs');
const path = require('node:path');
const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.deepEqual(registry.listModes().map(mode => mode.id), ['python', 'java', 'php', 'javascript']);
for (const course of [javaCourse, phpCourse, javascriptCourse]) {
  assert.equal(course.curriculum.length, 48, `${course.id}は48ステージ必要です`);
  assert.equal(Object.keys(course.levels).length, 48, `${course.id}の階層データは48件必要です`);
  assert.ok(course.curriculum.every(item => item.language === course.id), `${course.id}の教材メタデータを分離します`);
}

for (let floor = 0; floor < 48; floor++) {
  const pythonLevel = content.courses.python.levels[floor];
  const pythonSource = floor < 24 ? gameSolutions[floor] : pythonLevel.solution;
  const expected = python.compile(pythonSource, { capabilities: pythonLevel.capabilities });
  assert.deepEqual(expected.errors, [], `Python ${floor + 1}階層の基準コードが必要です`);
  for (const [id, course, engine] of [
    ['java', javaCourse, java],
    ['php', phpCourse, php],
    ['javascript', javascriptCourse, javascript]
  ]) {
    const source = floor < 24 ? tools.fromPython(pythonSource, id) : course.levels[floor].solution;
    const actual = engine.compile(source, { capabilities: course.levels[floor].capabilities });
    assert.deepEqual(actual.errors, [], `${id} ${floor + 1}階層の模範コードを解析できます`);
    assert.deepEqual(actual.commands, expected.commands, `${id} ${floor + 1}階層はPython版と同じ動作になります`);
  }
}

assert.match(javaCourse.levels[40].solution, /List\.of\(2, 4, 6\)/, 'Javaでリストを作れます');
assert.match(javaCourse.levels[40].solution, /items\.get\(0\)/, 'Javaでリスト要素を取得できます');
assert.match(javaCourse.levels[43].solution, /Map\.of\(/, 'JavaでMapを作れます');
assert.match(phpCourse.levels[40].solution, /\$items = \[2, 4, 6\]/, 'PHPで配列を作れます');
assert.match(phpCourse.levels[43].solution, /"name" => "Aoi"/, 'PHPで連想配列を作れます');
for (const level of Object.values(phpCourse.levels)) {
  assert.doesNotMatch(`${level.mission}\n${level.description}\n${level.goal}\n${level.solution}`, /\$\$[A-Za-z_]/, 'PHP教材で変数の$を二重に付けません');
  assert.doesNotMatch(JSON.stringify(level), /echo\s+\)/, 'PHP教材に閉じかっこだけ残ったechoを生成しません');
}
for (const course of [javaCourse, phpCourse, javascriptCourse]) {
  assert.doesNotMatch(JSON.stringify(course), /range\(\)/, `${course.id}教材にPython固有のrange()表記を残しません`);
  for (const [floor, level] of Object.entries(course.levels)) {
    if (Number(floor) < 24 || !['change', 'debug'].includes(level.support?.mode)) continue;
    assert.doesNotMatch(level.support.initialCode.trim(), /^(#|\/\/)/, `${course.id} ${Number(floor) + 1}階の変更・修正課題には作業対象コードが必要です`);
  }
}
assert.match(javaCourse.levels[36].solution, /if \(score >= 60\) \{/, 'Javaの条件分岐を使えます');
assert.match(phpCourse.levels[36].solution, /if \(\$score >= 60\) \{/, 'PHPの条件分岐を使えます');
assert.match(javascriptCourse.levels[24].solution, /let score = 10;/, 'JavaScriptでlet変数を使えます');
assert.match(javascriptCourse.levels[24].solution, /console\.log\(score\);/, 'JavaScriptでconsole.logを使えます');
assert.match(javascriptCourse.levels[40].solution, /let items = \[2, 4, 6\];/, 'JavaScriptで配列を作れます');
assert.match(javaCourse.levels[27].description, /Integer\.parseInt\(\)/, 'Javaの説明にはJavaの型変換を表示します');
const displayText = course => [
  ...course.curriculum.flatMap(item => [item.topic, item.syntax]),
  ...Object.values(course.levels).flatMap(level => [level.mission, level.description, level.goal, ...(level.support?.hints || [])])
].join('\n');
assert.doesNotMatch(displayText(javaCourse), /\bTrue\b|\bint\(\)|\blen\(\)/, 'Java教材にPython固有表記を残しません');
assert.doesNotMatch(displayText(javascriptCourse), /\bTrue\b|\bint\(\)|\blen\(\)/, 'JavaScript教材にPython固有表記を残しません');
assert.doesNotMatch(displayText(phpCourse), /\bTrue\b|\bint\(\)|\blen\(\)|\band\b|\bor\b/, 'PHP教材にPython固有表記を残しません');
assert.match(phpCourse.levels[16].description, /\$mob/, 'PHPの説明でも変数mobに$を付けます');
assert.ok(java.compile('move()', { capabilities: ['move'] }).errors.length > 0, 'Javaはセミコロン忘れをエラーにします');
assert.ok(php.compile('$score = 10', { capabilities: ['variables'] }).errors.length > 0, 'PHPはセミコロン忘れをエラーにします');
assert.ok(javascript.compile('let score = 10', { capabilities: ['variables'] }).errors.length > 0, 'JavaScriptはセミコロン忘れをエラーにします');
assert.match(htmlSource, /id="titleLanguageModeSelect"[^>]+data-language-mode-select/, 'タイトル画面に言語選択が必要です');
assert.equal((htmlSource.match(/data-language-mode-select/g) || []).length, 2, 'タイトルとゲーム画面の両方で言語を選べます');
assert.match(appSource, /querySelectorAll\('\[data-language-mode-select\]'\)/, '2つの言語選択を同じ登録済みモードから生成します');
assert.match(appSource, /floor === 0 \? 'T' : String\(floor\)/, 'テスト用階層ボタンはTutorialをT、通常階層を実際のFLOOR番号で表示します');

const userWrittenJavaScript = `let score = 75;
if(score >= 60){
    console.log("pass");
}
else{
    console.log("retry");
}
move();
move();
action();`;
assert.deepEqual(javascript.compile(userWrittenJavaScript, { capabilities: javascriptCourse.levels[36].capabilities }).errors, [], '空白の置き方が異なる手入力JavaScriptも受理します');
const userWrittenPhp = `$number = 8;
if($number % 2 == 0){
    echo "even";
}
else{
    echo "odd";
}
move();
move();
action();`;
assert.deepEqual(php.compile(userWrittenPhp, { capabilities: phpCourse.levels[37].capabilities }).errors, [], '手入力PHPの条件分岐と剰余演算を受理します');
assert.deepEqual(php.compile(userWrittenPhp.replace('else{', 'else {'), { capabilities: phpCourse.levels[37].capabilities }).errors, [], 'PHPのelseは空白の有無にかかわらず受理します');
const invalidJavaFor = java.compile('for(int i ; i < 3; i++){\n    move();\n}', { capabilities: ['for', 'move'] });
assert.ok(invalidJavaFor.errors.some(error => /初期値/.test(error.text)), 'Javaの不正なfor文は初期値を案内します');
assert.ok(invalidJavaFor.errors.every(error => !/インデントが多すぎ/.test(error.text)), 'Javaの不正なfor文をインデントエラーと誤案内しません');

console.log('Python・Java・PHP・JavaScriptの4言語×48階層の解析・動作一致に合格しました');
