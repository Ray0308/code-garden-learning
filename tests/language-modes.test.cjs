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
assert.match(javaCourse.levels[36].solution, /if \(score >= 60\) \{/, 'Javaの条件分岐を使えます');
assert.match(phpCourse.levels[36].solution, /if \(\$score >= 60\) \{/, 'PHPの条件分岐を使えます');
assert.match(javascriptCourse.levels[24].solution, /let score = 10;/, 'JavaScriptでlet変数を使えます');
assert.match(javascriptCourse.levels[24].solution, /console\.log\(score\);/, 'JavaScriptでconsole.logを使えます');
assert.match(javascriptCourse.levels[40].solution, /let items = \[2, 4, 6\];/, 'JavaScriptで配列を作れます');
assert.ok(java.compile('move()', { capabilities: ['move'] }).errors.length > 0, 'Javaはセミコロン忘れをエラーにします');
assert.ok(php.compile('$score = 10', { capabilities: ['variables'] }).errors.length > 0, 'PHPはセミコロン忘れをエラーにします');
assert.ok(javascript.compile('let score = 10', { capabilities: ['variables'] }).errors.length > 0, 'JavaScriptはセミコロン忘れをエラーにします');
assert.match(htmlSource, /id="titleLanguageModeSelect"[^>]+data-language-mode-select/, 'タイトル画面に言語選択が必要です');
assert.equal((htmlSource.match(/data-language-mode-select/g) || []).length, 2, 'タイトルとゲーム画面の両方で言語を選べます');
assert.match(appSource, /querySelectorAll\('\[data-language-mode-select\]'\)/, '2つの言語選択を同じ登録済みモードから生成します');

console.log('Python・Java・PHP・JavaScriptの4言語×48階層の解析・動作一致に合格しました');
