const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const solutions = require('./solutions.cjs');
const { levels, curriculum, worldOnePlan } = require('../levels.js');
const pythonEngine = require('../engines/python.js');

const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
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
    .map((mob, index) => ({ ...mob, type: mobTypes[index] }));
  const state = { ...level.start, steps: 0, collected: false, doorOpen: false, variables: {}, resolved: new Set(), cleared: false };
  const front = () => ({ x: state.x + vectors[state.direction].dx, y: state.y + vectors[state.direction].dy });
  const frontIndex = objects => objects.findIndex((object, index) => object.x === front().x && object.y === front().y && !state.resolved.has(index));
  function run(commands) {
    for (const command of commands) {
      if (command.type === 'if') { run(state.variables[command.variable] === command.expected ? command.yes : command.no); continue; }
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
        assert.ok(doorIsFront, `${floor}階層: print()の正面に扉がありません`);
        const quoted = command.value.match(/^["'](.*)["']$/);
        const value = quoted ? quoted[1] : state.variables[command.value];
        assert.equal(value, level.door.password, `${floor}階層: 合言葉が一致しません`);
        state.doorOpen = true;
      } else if (command.type === 'attack()' || command.type === 'sayHello()') {
        const mobIndex = frontIndex(level.mobs || []);
        assert.ok(mobIndex >= 0, `${floor}階層: ${command.type}の正面にMOBがいません`);
        const expected = level.mobs[mobIndex].type === 'enemy' ? 'attack()' : 'sayHello()';
        assert.equal(command.type, expected, `${floor}階層: MOBへの対応が違います`);
        state.resolved.add(mobIndex);
      } else assert.fail(`${floor}階層: 未対応の命令 ${command.type}`);
    }
  }
  run(compile(solutions[floor]));
  assert.equal(state.cleared, true, `${floor}階層: 模範解答でクリアできません`);
  return state.steps;
}

for (const floor of Object.keys(levels).map(Number)) console.log(`✓ ${floor}階層 ${levels[floor].title}: ${simulate(floor)}ステップ`);

assert.equal(Object.keys(solutions).length, Object.keys(levels).length, '模範解答と階層数が一致しません');
assert.equal(curriculum.length, Object.keys(levels).length, '教材一覧と階層数が一致しません');
assert.ok(curriculum.every(item => item.language && item.minutes), '言語と学習時間の教材メタデータが必要です');
assert.deepEqual(curriculum.slice(0, 4).map(item => item.stage), [1, 2, 3, 4], '第1章は4ステージを順番に実装します');
assert.deepEqual(curriculum.slice(0, 4).map(item => levels[item.floor].support.mode), ['copy', 'fill', 'debug', 'fromScratch'], '第1章は段階的に支援を減らします');
assert.ok(Object.values(levels).every(item => Array.isArray(item.capabilities)), '各ステージに使用可能な技の定義が必要です');
assert.ok(Object.values(levels).every(item => item.support?.mode && item.support?.instruction), '各ステージに学習支援モードと案内が必要です');
assert.ok(Object.values(levels).every(item => ['copy', 'fill', 'debug', 'fromScratch'].includes(item.support.mode)), '学習支援モードが不正です');
assert.ok(Object.values(levels).every(item => Array.isArray(item.support.hints) && item.support.hints.length > 0), '各ステージに段階的ヒントが必要です');
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
for (const [floor, solution] of Object.entries(solutions)) {
  const parsed = pythonEngine.compile(solution, { capabilities: levels[floor].capabilities, level: levels[floor] });
  assert.deepEqual(parsed.errors, [], `${floor}階層の模範解答をPythonエンジンが解釈できません`);
  assert.ok(parsed.commands.length > 0, `${floor}階層の実行命令が必要です`);
}
assert.match(pythonEngine.formatError({ line: 2, text: '???' }), /^2行目:/, '言語エンジンが初心者向けエラーを整形します');
assert.ok(pythonEngine.compile('for _ in range(2):\n    move()', { capabilities: ['move'] }).errors.length > 0, '未習得の構文は教材データに従って拒否します');
assert.ok(pythonEngine.compile('print("閉じ忘れ)', { capabilities: ['print'] }).errors.length > 0, '引用符の閉じ忘れを構文エラーにします');
assert.equal(/collectGet\(\)|goDown\(\)/.test(appSource), false, '廃止した旧コマンドがapp.jsに残っています');
assert.equal(/for\\s\+_|range\\\(/.test(appSource), false, 'Python固有の構文解析をapp.jsに残さないでください');
console.log('全階層の模範解答・当たり判定・文言監査に合格しました');
