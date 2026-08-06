const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const solutions = require('./solutions.cjs');
const languageRegistry = require('../core/language-registry.js');
const content = require('../levels.js');
require('../courses/python-common.js');
require('../courses/python-hints.js');
const pythonEngine = require('../engines/python.js');
const { course: pythonCourse, engine: registeredPythonEngine } = languageRegistry.getMode('python');
const { levels, curriculum, worldOnePlan } = pythonCourse;

const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const stylesSource = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const vectors = [{ dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: -1, dy: 0 }];

function compile(code) {
  const lines = code.split('\n');
  function block(start, indent) {
    const commands = [];
    let index = start;
    while (index < lines.length) {
      const raw = lines[index];
      const text = raw.trim();
      const spaces = raw.length - raw.trimStart().length;
      if (!text || text.startsWith('#')) { index++; continue; }
      if (spaces < indent || (spaces === indent && text === 'else:')) break;
      assert.equal(spaces, indent, `${index + 1}行目のインデントが不正です`);
      const loop = text.match(/^for _ in range\((\d+)\):$/);
      if (loop) {
        const nested = block(index + 1, indent + 4);
        for (let count = 0; count < Number(loop[1]); count++) commands.push(...nested.commands);
        index = nested.index;
        continue;
      }
      const condition = text.match(/^if ([A-Za-z_]\w*) == ["']([^"']+)["']:\s*$/);
      if (condition) {
        const yes = block(index + 1, indent + 4);
        assert.equal(lines[yes.index]?.trim(), 'else:', 'ifにはelseが必要です');
        const no = block(yes.index + 1, indent + 4);
        commands.push({ type: 'if', variable: condition[1], expected: condition[2], yes: yes.commands, no: no.commands });
        index = no.index;
        continue;
      }
      const input = text.match(/^([A-Za-z_]\w*) = input\(\)$/);
      const print = text.match(/^print\((.+)\)$/);
      commands.push(input ? { type: 'input', variable: input[1] } : print ? { type: 'print', value: print[1] } : { type: text });
      index++;
    }
    return { commands, index };
  }
  return block(0, 0).commands;
}

function simulate(floor, mobTypes = []) {
  const level = structuredClone(levels[floor]);
  if (level.setup?.type === 'adventurePassword') level.door.password = 'TEST-PASSWORD';
  if (level.setup?.type === 'randomMobs') level.mobs = level.setup.positions
    .map((mob, index) => ({ ...mob, type: mobTypes[index] || 'ally' }));
  const state = { ...level.start, steps: 0, collected: false, doorOpen: false, variables: {}, resolved: new Set(), cleared: false };
  const front = () => ({ x: state.x + vectors[state.direction].dx, y: state.y + vectors[state.direction].dy });
  const frontIndex = objects => objects.findIndex((object, index) => object.x === front().x && object.y === front().y && !state.resolved.has(index));
  function run(commands) {
    for (const command of commands) {
      if (command.type === 'if') {
        const condition = command.condition
          ? pythonEngine.evaluateExpression(command.condition, state.variables)
          : state.variables[command.variable] === command.expected;
        run(condition ? command.yes : command.no);
        continue;
      }
      state.steps++;
      assert.ok(state.steps <= level.maxSteps, `${floor}階層: 最大ステップ数を超えました`);
      if (command.type === 'move()') {
        const next = front();
        const mobIndex = frontIndex(level.mobs || []);
        const blocked = next.x < 0 || next.x >= 8 || next.y < 0 || next.y >= 10 || level.obstacles.includes(`${next.x},${next.y}`)
          || (level.door && !state.doorOpen && next.x === level.door.x && next.y === level.door.y)
          || (level.npc && next.x === level.npc.x && next.y === level.npc.y) || mobIndex >= 0;
        assert.equal(blocked, false, `${floor}階層: (${state.x},${state.y})から壁または対象物へ衝突しました`);
        Object.assign(state, next);
      } else if (command.type === 'turnLeft()') state.direction = (state.direction + 1) % 4;
      else if (command.type === 'turnRight()') state.direction = (state.direction + 3) % 4;
      else if (command.type === 'action()') {
        if (level.target && state.x === level.target.x && state.y === level.target.y) state.collected = true;
        else if (state.x === level.exit.x && state.y === level.exit.y) state.cleared = (!level.target || state.collected) && (!level.door || state.doorOpen) && (!level.mobs || state.resolved.size === level.mobs.length);
      } else if (command.type === 'input') {
        const mobIndex = frontIndex(level.mobs || []);
        if (level.npc && level.npc.x === front().x && level.npc.y === front().y) state.variables[command.variable] = level.door.password;
        else { assert.ok(mobIndex >= 0, `${floor}階層: input()の正面に対象がいません`); state.variables[command.variable] = level.mobs[mobIndex].type; }
      } else if (command.type === 'print') {
        const doorIsFront = level.door && level.door.x === front().x && level.door.y === front().y;
        const value = typeof command.value === 'string'
          ? (command.value.match(/^["'](.*)["']$/)?.[1] ?? state.variables[command.value])
          : pythonEngine.evaluateExpression(command.value, state.variables);
        assert.notEqual(value, undefined, `${floor}階層: print()する値がありません`);
        if (level.door) {
          assert.ok(doorIsFront, `${floor}階層: print()の正面に扉がありません`);
          assert.equal(value, level.door.password, `${floor}階層: 合言葉が一致しません`);
          state.doorOpen = true;
        }
      } else if (command.type === 'attack()' || command.type === 'sayHello()') {
        const mobIndex = frontIndex(level.mobs || []);
        assert.ok(mobIndex >= 0, `${floor}階層: ${command.type}の正面にMOBがいません`);
        const expected = level.mobs[mobIndex].type === 'enemy' ? 'attack()' : 'sayHello()';
        assert.equal(command.type, expected, `${floor}階層: MOBへの対応が違います`);
        state.resolved.add(mobIndex);
      } else assert.fail(`${floor}階層: 未対応の命令 ${command.type}`);
    }
  }
  const parsed = pythonEngine.compile(solutions[floor], { capabilities: level.capabilities, level });
  assert.deepEqual(parsed.errors, [], `${floor}階層: Pythonエンジンで模範解答を解釈できません`);
  const normalize = command => command.command === 'conditional'
    ? { type: 'if', variable: command.variable, expected: command.expected, condition: command.condition, yes: command.thenCommands.map(normalize), no: command.elseCommands.map(normalize) }
    : { ...command, type: command.command };
  run(parsed.commands.map(normalize));
  assert.equal(state.cleared, true, `${floor}階層: 模範解答でクリアできません`);
  return state.steps;
}

for (const floor of Object.keys(levels).map(Number).filter(floor => floor < 24)) console.log(`✓ ${floor}階層 ${levels[floor].title}: ${simulate(floor)}ステップ`);

const randomPatterns = Array.from({ length: 8 }, (_, bits) => Array.from({ length: 3 }, (_, index) => bits & (1 << index) ? 'enemy' : 'ally'));
for (const floor of Object.keys(levels).map(Number).filter(floor => levels[floor].setup?.type === 'randomMobs')) {
  for (const pattern of randomPatterns) simulate(floor, pattern);
}

assert.equal(curriculum.length, Object.keys(levels).length, '教材一覧と階層数が一致しません');
assert.equal(curriculum.length, 48, '共通編は全48ステージです');
assert.equal(Object.keys(levels).filter(floor => Number(floor) >= 24).length, 24, '5大機能を扱う共通後半は24ステージです');
assert.ok(Object.values(levels).filter(item => item.setup?.type === 'randomMobs').every(item => item.setup.positions.length === 3), '条件分岐ステージはランダムMOB3体で構成します');
assert.match(appSource, /type: null/, 'ランダムMOBはステージ開始時点では種類を未確定にします');
assert.match(appSource, /!mob\.type\) mob\.type = Math\.random\(\)/, 'input()実行時にMOBの種類を初めて決定します');
assert.doesNotMatch(appSource, /front\.x === mob\.x && front\.y === mob\.y/, '正面へ到達しただけではMOBの正体を表示しません');
assert.ok(curriculum.every(item => item.language && item.minutes), '言語と学習時間の教材メタデータが必要です');
assert.deepEqual(curriculum.slice(0, 4).map(item => item.stage), [1, 2, 3, 4], '第1章は4ステージを順番に実装します');
const basicDifficultyOrder = ['copy', 'change', 'fromScratch', 'debug'];
assert.deepEqual(curriculum.slice(0, 4).map(item => levels[item.floor].support.mode), basicDifficultyOrder, '第1章は写経・変更・自力・修正の順に進みます');
assert.deepEqual(curriculum.slice(4, 8).map(item => levels[item.floor].support.mode), basicDifficultyOrder, '第2章は写経・変更・自力・修正の順に進みます');
assert.deepEqual(curriculum.slice(8, 12).map(item => levels[item.floor].support.mode), basicDifficultyOrder, '第3章は写経・変更・自力・修正の順に進みます');
assert.ok(Object.values(levels).every(item => Array.isArray(item.capabilities)), '各ステージに使用可能な技の定義が必要です');
assert.ok(Object.values(levels).every(item => item.support?.mode && item.support?.instruction), '各ステージに学習支援モードと案内が必要です');
assert.ok(Object.values(levels).every(item => ['copy', 'change', 'debug', 'fromScratch'].includes(item.support.mode)), '学習支援モードが不正です');
assert.ok(Object.values(levels).every(item => Array.isArray(item.support.hints) && item.support.hints.length > 0), '各ステージに段階的ヒントが必要です');
for (const [floor, stage] of Object.entries(levels)) {
  const answer = solutions[floor] || stage.solution || '';
  const answerLines = new Set(answer.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#')));
  for (const hint of stage.support.hints) {
    assert.equal(answerLines.has(hint.trim()), false, `${Number(floor) + 1}階層のヒントが模範解答の1行をそのまま表示しています`);
    assert.doesNotMatch(hint, /(?:^|\s)(?:move|action|attack|sayHello|turnLeft|turnRight)\(\).*(?:move|action|attack|sayHello|turnLeft|turnRight)\(\)/, `${Number(floor) + 1}階層のヒントが命令順を答えています`);
  }
}
assert.ok(Object.values(levels).filter(item => item.support.mode === 'copy').every(item => item.support.example), '写経ステージには手入力用のお手本が必要です');
assert.ok(Object.values(levels).filter(item => item.support.mode === 'fromScratch').every(item => item.support.initialCode), '自力入力ステージは最小限の初期コードから始めます');
assert.equal(worldOnePlan.length, 12, '第1ワールは12ステージで設計します');
assert.equal(new Set(worldOnePlan.map(item => item.id)).size, worldOnePlan.length, 'ステージIDは重複できません');
assert.deepEqual([...new Set(worldOnePlan.map(item => item.chapter))], [1, 2, 3], '第1ワールは3章構成です');
for (const chapter of [1, 2, 3]) {
  const stages = worldOnePlan.filter(item => item.chapter === chapter);
  assert.deepEqual(stages.map(item => item.stage), [1, 2, 3, 4], `${chapter}章は4ステージ必要です`);
  assert.deepEqual(stages.map(item => item.support), ['copy', 'fill', 'debug', 'fromScratch'], `${chapter}章の支援は段階的に減らします`);
}
assert.ok(worldOnePlan.every(item => item.minutes >= 5 && item.minutes <= 15), '各ステージは5〜15分で設計します');
assert.equal(pythonEngine.id, 'python', 'PythonエンジンのIDが必要です');
assert.equal(registeredPythonEngine, pythonEngine, 'Pythonエンジンを共通言語レジストリへ登録します');
assert.equal(content.courses.python, pythonCourse, 'Python教材を言語別コースとして公開します');
assert.deepEqual(languageRegistry.listModes().map(mode => mode.id), ['python'], '完成済みの言語モードだけを一覧表示します');
const futureRegistry = languageRegistry.createRegistry();
const futureCourse = {
  id: 'future-language',
  meta: { label: 'Future', fileName: 'Main.txt', editorLabel: 'Future editor', intro: 'Future intro', functionNote: 'Future functions' },
  curriculum: [],
  levels: {}
};
const futureEngine = { id: 'future-language', compile() {}, formatError() {} };
futureRegistry.registerCourse(futureCourse);
assert.equal(futureRegistry.hasMode('future-language'), false, '教材だけでは言語モードを公開しません');
futureRegistry.registerEngine(futureEngine);
assert.equal(futureRegistry.hasMode('future-language'), true, '教材とエンジンが揃うと新言語モードを公開します');
assert.deepEqual(futureRegistry.getMode('future-language'), { id: 'future-language', course: futureCourse, engine: futureEngine }, '共通APIから言語モードを取得できます');
assert.throws(() => futureRegistry.registerCourse({ ...futureCourse }), /already registered/, '同じIDの教材を誤って上書きできません');
assert.throws(() => futureRegistry.registerEngine({ ...futureEngine }), /already registered/, '同じIDのエンジンを誤って上書きできません');
for (const [floor, solution] of Object.entries(solutions)) {
  const parsed = pythonEngine.compile(solution, { capabilities: levels[floor].capabilities, level: levels[floor] });
  assert.deepEqual(parsed.errors, [], `${floor}階層の模範解答をPythonエンジンが解釈できません`);
  assert.ok(parsed.commands.length > 0, `${floor}階層の実行命令が必要です`);
}
for (const floor of Object.keys(levels).map(Number).filter(value => value >= 24)) {
  const level = levels[floor];
  const parsed = pythonEngine.compile(level.solution, { capabilities: level.capabilities, level });
  assert.deepEqual(parsed.errors, [], `${floor}階層の共通編模範解答を解釈できます`);
  const variables = {};
  const storage = {};
  const outputs = [];
  const run = commands => {
    for (const command of commands) {
      if (command.command === 'conditional') {
        const condition = pythonEngine.evaluateExpression(command.condition, variables);
        run(condition ? command.thenCommands : command.elseCommands);
      } else if (command.command === 'assign') variables[command.variable] = pythonEngine.evaluateExpression(command.value, variables);
      else if (command.command === 'print') outputs.push(pythonEngine.evaluateExpression(command.value, variables));
      else if (command.command === 'save') storage[String(pythonEngine.evaluateExpression(command.key, variables))] = pythonEngine.evaluateExpression(command.value, variables);
      else if (command.command === 'load') variables[command.variable] = storage[String(pythonEngine.evaluateExpression(command.key, variables))];
    }
  };
  run(parsed.commands);
  const actual = level.challenge.kind === 'storage' ? storage[level.challenge.key]
    : level.challenge.kind === 'variable' ? variables[level.challenge.name] : outputs.at(-1);
  assert.deepEqual(actual, level.challenge.expected, `${floor}階層の共通課題をクリアできます`);
}
assert.deepEqual([...new Set(curriculum.filter(item => item.world === 3).map(item => item.topic))].length >= 20, true, '共通編は十分な学習項目を含みます');
assert.ok(curriculum.some(item => item.topic === '仮想保存') && curriculum.some(item => item.topic === '仮想読込'), '保存と読込を共通編に含みます');
for (const floor of Object.keys(levels).map(Number).filter(value => value >= 24)) {
  assert.match(levels[floor].description, /print\(\)で出力|save\(\)で保存/, `${floor}階層は課題値を出力または保存することを明記します`);
  assert.match(levels[floor].goal, /2歩進んで階段でaction\(\)/, `${floor}階層は課題後の階段操作を明記します`);
}
assert.match(pythonEngine.formatError({ line: 2, text: '???' }), /^2行目:/, '言語エンジンが初心者向けエラーを整形します');
assert.ok(pythonEngine.compile('for _ in range(2):\n    move()', { capabilities: ['move'] }).errors.length > 0, '未習得の構文は教材データに従って拒否します');
assert.ok(pythonEngine.compile('move()\nmove()\naction()', { capabilities: levels[23].capabilities, level: levels[23] }).errors.some(error => /for を使って/.test(error.text)), '三影の門は命令の羅列だけではクリアできません');
assert.ok(pythonEngine.compile('print("閉じ忘れ)', { capabilities: ['print'] }).errors.length > 0, '引用符の閉じ忘れを構文エラーにします');
assert.deepEqual(pythonEngine.compile('attack()', { capabilities: ['attack'] }).commands.map(item => item.command), ['attack()'], 'attack()を実行キューへ追加します');
assert.deepEqual(pythonEngine.compile('sayHello()', { capabilities: ['sayHello'] }).commands.map(item => item.command), ['sayHello()'], 'sayHello()を実行キューへ追加します');
const conditional = pythonEngine.compile('if mob == "enemy":\n    attack()\nelse:\n    sayHello()', { capabilities: ['if', 'attack', 'sayHello'] });
assert.deepEqual(conditional.errors, [], '正しい条件分岐を解釈できます');
assert.equal(conditional.commands[0].line, 1, '条件分岐の実行エラーはifの行番号を示します');
assert.ok(pythonEngine.compile('if mob == "enemy":\nelse:\n    sayHello()', { capabilities: ['if', 'sayHello'] }).errors.some(error => error.line === 1 && /if の中/.test(error.text)), '空のifブロックを構文エラーにします');
assert.ok(pythonEngine.compile('if mob == "enemy":\n    attack()\nelse:', { capabilities: ['if', 'attack'] }).errors.some(error => error.line === 3 && /else の中/.test(error.text)), '空のelseブロックを構文エラーにします');
assert.match(appSource, /skipTutorial'\)\.addEventListener\('click', \(\) => startAdventure\(1, true\)\)/, 'チュートリアルを飛ばす場合はステージ1を解放して開始します');
assert.match(appSource, /output\.replaceChildren\(prompt, document\.createTextNode\(` \$\{message\}`\)\)/, '出力内容はHTMLとして解釈せずテキスト表示します');
assert.match(appSource, /editor\.value = `\$\{before\}\$\{command\}\$\{after\}`/, '入力補助ボタンはカーソル位置へ余計な改行なしで挿入します');
assert.doesNotMatch(appSource, /output\.innerHTML\s*=.*message/, '利用者の出力をinnerHTMLへ渡してはいけません');
assert.match(stylesSource, /@media\(max-height:500px\)[\s\S]*?\.runbar\{position:absolute;[^}]*bottom:0/, '短い画面では実行ボタンを画面内の下部へ固定します');
assert.match(stylesSource, /@media\(max-height:500px\)[\s\S]*?\.learning-support\{max-height:52px;overflow-y:auto/, '短い画面では学習案内が実行ボタンを押し出さないようにします');
assert.match(appSource, /languageRegistry\.listModes\(\)/, '言語選択肢を登録済みモードから自動生成します');
assert.match(appSource, /progressKey\(\).+activeLanguage/, '進捗を言語モードごとに分離します');
assert.equal(/collectGet\(\)|goDown\(\)/.test(appSource), false, '廃止した旧コマンドがapp.jsに残っています');
assert.equal(/for\\s\+_|range\\\(/.test(appSource), false, 'Python固有の構文解析をapp.jsに残さないでください');
assert.match(appSource, /stageOrder\.forEach\(\(floor, index\)/, 'テスト用ステージ選択は教材データから自動生成します');
assert.equal(/data-test-floor="\d+"/.test(fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')), false, 'テスト用ステージをHTMLへ固定記述しないでください');
console.log('全階層の模範解答・当たり判定・文言監査に合格しました');
