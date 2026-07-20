const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const solutions = require('./solutions.cjs');
const { levels, curriculum } = require('../levels.js');

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
  if (floor === 5) level.door.password = 'TEST-PASSWORD';
  if (floor === 6) level.mobs = [{ x: 1, y: 7 }, { x: 3, y: 6 }, { x: 5, y: 4 }]
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

for (let floor = 0; floor <= 5; floor++) console.log(`✓ ${floor}階層 ${levels[floor].title}: ${simulate(floor)}ステップ`);
for (let mask = 0; mask < 8; mask++) {
  const types = [0, 1, 2].map(bit => mask & (1 << bit) ? 'enemy' : 'ally');
  simulate(6, types);
}
console.log('✓ 6階層 魔物の全8パターン');

assert.equal(Object.keys(solutions).length, Object.keys(levels).length, '模範解答と階層数が一致しません');
assert.equal(curriculum.length, Object.keys(levels).length, '教材一覧と階層数が一致しません');
assert.ok(curriculum.every(item => item.language && item.minutes), '言語と学習時間の教材メタデータが必要です');
assert.equal(/collectGet\(\)|goDown\(\)/.test(appSource), false, '廃止した旧コマンドがapp.jsに残っています');
console.log('全階層の模範解答・当たり判定・文言監査に合格しました');
