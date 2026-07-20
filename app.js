const editor = document.querySelector('#codeEditor');
const dungeon = document.querySelector('#dungeon');
const output = document.querySelector('#output');
const lineNumbers = document.querySelector('#lineNumbers');
const clearCard = document.querySelector('#clearCard');
const failCard = document.querySelector('#failCard');
const GAME = { birdName: 'フォっくん', storageKey: 'code-dungeon-progress-v1' };
const { curriculum, levels, columns: COLS, rows: ROWS } = window.CODE_GARDEN_CONTENT;
const directions = [
  { dx: 0, dy: 1, label: '下', sprite: 'assets/character/main-down.png' },
  { dx: 1, dy: 0, label: '右', sprite: 'assets/character/main-right.png' },
  { dx: 0, dy: -1, label: '上', sprite: 'assets/character/main-up.png' },
  { dx: -1, dy: 0, label: '左', sprite: 'assets/character/main-left.png' }
];

let state;
let parsedCommands = [];
let executionIndex = 0;
let running = false;
let currentFloor = 1;
let pendingInsert = '';
let enemySprites = {};
let adventurePassword = '';

function level() { return levels[currentFloor]; }

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(GAME.storageKey)) || { cleared: [], lastFloor: 0 }; }
  catch { return { cleared: [], lastFloor: 0 }; }
}

function saveProgress(floor) {
  const progress = loadProgress();
  if (!progress.cleared.includes(floor)) progress.cleared.push(floor);
  progress.lastFloor = Math.min(floor + 1, Math.max(...Object.keys(levels).map(Number)));
  progress.updatedAt = new Date().toISOString();
  localStorage.setItem(GAME.storageKey, JSON.stringify(progress));
}

function selectFloor(floor, bypassUnlock = false) {
  if (!levels[floor]) return;
  const progress = loadProgress();
  if (!bypassUnlock && floor > 1 && !progress.cleared.includes(floor - 1)) return;
  currentFloor = floor;
  if (floor === 5) level().door.password = adventurePassword;
  if (floor === 6) level().mobs = [{ x: 1, y: 7 }, { x: 3, y: 6 }, { x: 5, y: 4 }]
    .map(mob => ({ ...mob, type: Math.random() < 0.5 ? 'enemy' : 'ally' }));
  document.querySelector('.chapter small').textContent = `CHAPTER ${String(floor).padStart(2, '0')}`;
  document.querySelector('.chapter strong').textContent = level().title;
  document.querySelector('#loopReference').hidden = floor < 4;
  document.querySelector('#printReference').hidden = floor < 3;
  document.querySelector('#inputReference').hidden = floor < 5;
  document.querySelector('#attackReference').hidden = floor < 2;
  document.querySelector('#sayHelloReference').hidden = floor < 2;
  document.querySelector('#ifReference').hidden = floor < 6;
  document.querySelector('#missionTitle').textContent = level().mission;
  document.querySelector('#missionDescription').textContent = level().description;
  document.querySelector('#goalState').previousElementSibling.textContent = level().goal;
  editor.value = level().starter;
  document.querySelector('#titleScreen').classList.add('hidden');
  const lesson = curriculum.find(item => item.floor === floor);
  document.querySelector('#missionReviewFloor').textContent = floor === 0 ? 'TUTORIAL' : `FLOOR ${String(floor).padStart(2, '0')}`;
  document.querySelector('#missionReviewTitle').textContent = level().mission;
  document.querySelector('#missionReviewDescription').textContent = level().description;
  document.querySelector('#missionReviewGoal').textContent = level().goal;
  document.querySelector('#missionReviewSyntax').textContent = lesson?.syntax || '';
  document.querySelector('#lessonFloor').textContent = floor === 0 ? `TUTORIAL / ${level().title}` : `FLOOR ${String(floor).padStart(2, '0')} / ${level().title}`;
  document.querySelector('#lessonTitle').textContent = level().mission;
  document.querySelector('#lessonDescription').textContent = level().description;
  document.querySelector('#lessonGoal').textContent = `クリア条件：${level().goal}`;
  document.querySelector('#lessonSyntax').textContent = lesson?.syntax || '';
  document.querySelector('#lessonModal').classList.add('show');
  document.querySelector('#lessonModal').setAttribute('aria-hidden', 'false');
  updateLineNumbers();
  resetState();
}

function startAdventure(firstFloor, testMode = false) {
  adventurePassword = createAdventurePassword();
  selectFloor(firstFloor, testMode);
}

function continueAdventure() {
  const progress = loadProgress();
  startAdventure(levels[progress.lastFloor] ? progress.lastFloor : 0);
}

function createAdventurePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return `羽-${Array.from(bytes, value => alphabet[value % alphabet.length]).join('')}`;
}

function resetState(showMessage = true) {
  clearCard.classList.remove('show');
  failCard.classList.remove('show');
  state = { ...level().start, collected: 0, cleared: false, doorOpen: false, steps: 0, variables: {}, resolvedMobs: [] };
  parsedCommands = parseCode().commands;
  executionIndex = 0;
  running = false;
  document.querySelector('#goalDot').classList.remove('done');
  document.querySelector('#goalState').textContent = '未達成';
  document.querySelector('#editorState').textContent = '編集済み';
  if (showMessage) setOutput('›', 'スタート地点に戻りました');
  renderDungeon();
}

function retryLevel() {
  resetState();
}

function showFailure(message, kind = 'runtime') {
  const failureCopy = {
    syntax: { label: 'SYNTAX ERROR', title: 'コードの書き方を確認しよう', button: 'コードを直す' },
    runtime: { label: 'EXECUTION STOPPED', title: '途中で実行が止まりました', button: '再挑戦' },
    incomplete: { label: 'MISSION INCOMPLETE', title: 'あと少しでクリアです', button: '作戦を直して再挑戦' }
  }[kind];
  failCard.dataset.kind = kind;
  document.querySelector('#failLabel').textContent = failureCopy.label;
  document.querySelector('#failTitle').textContent = failureCopy.title;
  document.querySelector('#retryBtn').textContent = failureCopy.button;
  document.querySelector('#failReason').textContent = message || 'コードを確認して、もう一度挑戦しよう。';
  failCard.classList.add('show');
  document.querySelector('#editorState').textContent = kind === 'syntax' ? '構文エラー' : kind === 'incomplete' ? '未達成' : '実行停止';
}

function incompleteMessage() {
  if (level().target && !state.collected) return '灯をまだ回収していません。灯のあるマスで action() を実行しよう。';
  if (level().door && !state.doorOpen) return '扉がまだ閉まっています。扉の正面で指定された出力を実行しよう。';
  if (level().mobs && state.resolvedMobs.length < level().mobs.length) return `未対応のMOBがあと${level().mobs.length - state.resolvedMobs.length}体います。正面から対応しよう。`;
  if (state.x !== level().exit.x || state.y !== level().exit.y) return 'ミッション対象は処理できました。青い階段のマスまで移動しよう。';
  return '階段のマスにいます。最後に action() を実行して次の階層へ進もう。';
}

function parseErrorMessage(error) {
  const guidance = /インデント|必要です|使えるよう|range\(\)/.test(error.text);
  return `${error.line}行目: ${guidance ? error.text : `「${error.text}」は使えない命令です`}`;
}

function parseCode() {
  const valid = new Set(['move()', 'turnLeft()', 'turnRight()', 'action()', 'attack()', 'sayHello()']);
  const errors = [];
  const lines = editor.value.split('\n').map(raw => raw.replace(/\t/g, '    '));

  function parseBlock(startIndex, indent) {
    const commands = [];
    let index = startIndex;
    while (index < lines.length) {
      const raw = lines[index];
      const text = raw.trim();
      if (!text || text.startsWith('#')) { index++; continue; }
      const spaces = raw.length - raw.trimStart().length;
      if (spaces < indent || (indent > 0 && spaces === indent - 4 && text === 'else:')) break;
      if (spaces > indent) { errors.push({ line: index + 1, text: 'インデントが多すぎます' }); index++; continue; }

      const loop = text.match(/^for\s+_\s+in\s+range\((\d+)\):$/);
      if (loop) {
        if (currentFloor < 4) errors.push({ line: index + 1, text: 'for は4階層で使えるようになります' });
        const parsed = parseBlock(index + 1, indent + 4);
        const repeat = Number(loop[1]);
        if (!parsed.commands.length) errors.push({ line: index + 1, text: 'for の中にインデントした命令が必要です' });
        if (repeat < 1 || repeat > 10) errors.push({ line: index + 1, text: 'range() は1〜10にしてください' });
        else for (let count = 0; count < repeat; count++) commands.push(...parsed.commands);
        index = parsed.index;
        continue;
      }

      const condition = text.match(/^if\s+([A-Za-z_]\w*)\s*==\s*(['"])(.*?)\2:$/);
      if (condition) {
        if (currentFloor < 6) errors.push({ line: index + 1, text: 'if は6階層で使えるようになります' });
        const thenBlock = parseBlock(index + 1, indent + 4);
        index = thenBlock.index;
        let elseCommands = [];
        if (index < lines.length && lines[index].trim() === 'else:' && lines[index].length - lines[index].trimStart().length === indent) {
          const elseBlock = parseBlock(index + 1, indent + 4);
          elseCommands = elseBlock.commands;
          index = elseBlock.index;
        } else errors.push({ line: index + 1, text: 'if に対応する else: が必要です' });
        commands.push({ command: 'conditional', line: index + 1, variable: condition[1], expected: condition[3], thenCommands: thenBlock.commands, elseCommands });
        continue;
      }

      const input = text.match(/^([A-Za-z_]\w*)\s*=\s*input\(\s*\)$/);
      if (input && currentFloor < 5) errors.push({ line: index + 1, text: 'input は5階層で使えるようになります' });
      if (input) { commands.push({ command: 'input', variable: input[1], line: index + 1 }); index++; continue; }
      const print = text.match(/^print\((.+)\)$/);
      if (print && currentFloor < 3) errors.push({ line: index + 1, text: 'print は3階層で使えるようになります' });
      if (print) { commands.push({ command: 'print', value: print[1].trim(), line: index + 1 }); index++; continue; }
      if (text === 'attack()' && currentFloor < 2) errors.push({ line: index + 1, text: 'attack は2階層で使えるようになります' });
      else if (text === 'sayHello()' && currentFloor < 2) errors.push({ line: index + 1, text: 'sayHello は2階層で使えるようになります' });
      else if (valid.has(text)) commands.push({ command: text, line: index + 1 });
      else errors.push({ line: index + 1, text });
      index++;
    }
    return { commands, index };
  }
  return { commands: parseBlock(0, 0).commands, errors };
}

function renderDungeon() {
  dungeon.innerHTML = '';
  dungeon.dataset.floor = String(currentFloor);
  document.querySelector('.dungeon-panel').dataset.floor = String(currentFloor);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = document.createElement('div');
      tile.className = 'dungeon-tile';
      tile.style.setProperty('--x', x);
      tile.style.setProperty('--y', y);
      if ((x + y) % 4 === 0) tile.classList.add('moss');
      if (level().obstacles.includes(`${x},${y}`)) tile.classList.add('wall');
      dungeon.append(tile);
    }
  }

  if (level().target && !state.collected) {
    const gem = document.createElement('div');
    gem.className = 'dungeon-object gem';
    gem.style.setProperty('--x', level().target.x);
    gem.style.setProperty('--y', level().target.y);
    gem.innerHTML = '<i></i>';
    dungeon.append(gem);
  }

  const stairs = document.createElement('div');
  stairs.className = 'dungeon-object stairs';
  stairs.style.setProperty('--x', level().exit.x);
  stairs.style.setProperty('--y', level().exit.y);
  stairs.innerHTML = '<i></i><i></i><i></i>';
  dungeon.append(stairs);

  if (level().door && !state.doorOpen) {
    const door = document.createElement('div');
    door.className = 'dungeon-object password-door';
    door.style.setProperty('--x', level().door.x);
    door.style.setProperty('--y', level().door.y);
    door.textContent = '⌨';
    dungeon.append(door);
  }

  if (level().npc) {
    const npc = document.createElement('img');
    npc.className = 'dungeon-object dungeon-mob';
    npc.style.setProperty('--x', level().npc.x);
    npc.style.setProperty('--y', level().npc.y);
    npc.src = 'assets/mob/ally/down.png';
    npc.alt = '門番のフクロウ';
    dungeon.append(npc);
  }

  (level().mobs || []).forEach((mob, index) => {
    if (state.resolvedMobs.includes(index)) return;
    const image = document.createElement('img');
    image.className = `dungeon-object dungeon-mob ${mob.type}`;
    image.style.setProperty('--x', mob.x);
    image.style.setProperty('--y', mob.y);
    image.src = mob.type === 'ally' ? 'assets/mob/ally/down.png' : (enemySprites.down || 'assets/mob/enemy/sheet-chroma.png');
    image.alt = mob.type === 'ally' ? '同族のフクロウ' : '敵のフクロウ';
    dungeon.append(image);
  });

  const hero = document.createElement('img');
  hero.className = 'dungeon-object dungeon-hero';
  hero.style.setProperty('--x', state.x);
  hero.style.setProperty('--y', state.y);
  hero.src = directions[state.direction].sprite;
  hero.alt = `${directions[state.direction].label}を向くフクロウ`;
  dungeon.append(hero);

  document.querySelector('#directionLabel').textContent = directions[state.direction].label;
  document.querySelector('#stepCount').textContent = state.steps;
  document.querySelector('#maxStepCount').textContent = level().maxSteps;
  if (level().target) {
    document.querySelector('#statLabel').textContent = '回収した灯';
    document.querySelector('#statValue').textContent = `◆ ${state.collected} / 1`;
  } else if (level().mobs) {
    document.querySelector('#statLabel').textContent = '対応したMOB';
    document.querySelector('#statValue').textContent = `${state.resolvedMobs.length} / ${level().mobs.length}`;
  } else {
    document.querySelector('#statLabel').textContent = '扉の状態';
    document.querySelector('#statValue').textContent = state.doorOpen ? 'OPEN' : 'LOCKED';
  }
}

function setOutput(mark, message, type = '') {
  output.className = type;
  output.innerHTML = `<span class="prompt">${mark}</span> ${message}`;
}

function showClear() {
  const lesson = curriculum.find(item => item.floor === currentFloor);
  const isFinalFloor = currentFloor === Math.max(...Object.keys(levels).map(Number));
  document.querySelector('#clearLabel').textContent = isFinalFloor ? 'WORLD COMPLETE' : 'QUEST COMPLETE';
  document.querySelector('#clearTitle').textContent = isFinalFloor ? '最初の世界を踏破した！' : `${level().title}を踏破した！`;
  document.querySelector('#clearLesson').textContent = `今回覚えたこと：${lesson?.topic || level().goal}`;
  document.querySelector('#clearSyntax').textContent = lesson?.syntax || '';
  document.querySelector('#againBtn').textContent = isFinalFloor ? 'タイトルへ戻る' : '次の階層へ';
  setTimeout(() => clearCard.classList.add('show'), 350);
}

function frontPosition() {
  const direction = directions[state.direction];
  return { x: state.x + direction.dx, y: state.y + direction.dy };
}

function objectIndexAtFront(objects = []) {
  const front = frontPosition();
  return objects.findIndex(object => object.x === front.x && object.y === front.y);
}

async function execute(commandInfo) {
  const { command, line } = commandInfo;
  if (command === 'conditional') {
    if (!Object.hasOwn(state.variables, commandInfo.variable)) {
      setOutput('×', `${line}行目: ${commandInfo.variable} という変数が見つかりません`, 'error');
      return false;
    }
    const branch = String(state.variables[commandInfo.variable]) === commandInfo.expected ? commandInfo.thenCommands : commandInfo.elseCommands;
    for (const nested of branch) if (!await execute(nested)) return false;
    return true;
  }
  state.steps++;
  if (state.steps > level().maxSteps) {
    setOutput('×', `${line}行目: ステップ数が上限を超えました`, 'error');
    return false;
  }

  if (command === 'move()') {
    const next = frontPosition();
    const mobIndex = (level().mobs || []).findIndex((mob, index) => mob.x === next.x && mob.y === next.y && !state.resolvedMobs.includes(index));
    const doorBlocked = level().door && !state.doorOpen && level().door.x === next.x && level().door.y === next.y;
    const npcBlocked = level().npc && level().npc.x === next.x && level().npc.y === next.y;
    const blocked = next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS || level().obstacles.includes(`${next.x},${next.y}`) || doorBlocked || npcBlocked || mobIndex >= 0;
    if (blocked) {
      const reason = doorBlocked ? '扉が閉まっています。手前から指定の関数を実行してください'
        : mobIndex >= 0 ? 'MOBが道を塞いでいます。手前から対応してください'
        : npcBlocked ? '門番がいます。正面から話しかけてください'
        : '壁があって進めません';
      setOutput('!', `${line}行目: ${reason}`, 'warning');
    } else {
      state.x = next.x;
      state.y = next.y;
      setOutput('›', `${line}行目: move() を実行しました`);
    }
  }
  if (command === 'turnLeft()') {
    state.direction = (state.direction + 1) % 4;
    setOutput('›', `${line}行目: 左を向きました`);
  }
  if (command === 'turnRight()') {
    state.direction = (state.direction + 3) % 4;
    setOutput('›', `${line}行目: 右を向きました`);
  }
  if (command === 'action()') {
    if (level().target && state.x === level().target.x && state.y === level().target.y && !state.collected) {
      state.collected = 1;
      setOutput('◆', `${line}行目: 灯を回収しました`, 'success');
      document.querySelector('#goalDot').classList.add('done');
      document.querySelector('#goalState').textContent = '階段へ';
    } else if (state.x === level().exit.x && state.y === level().exit.y && (!level().target || state.collected) && (!level().door || state.doorOpen) && (!level().mobs || state.resolvedMobs.length === level().mobs.length)) {
      state.cleared = true;
      setOutput('✓', `${line}行目: 階段を降りました`, 'success');
      document.querySelector('#goalState').textContent = '達成';
      saveProgress(currentFloor);
      showClear();
    } else if (level().npc && objectIndexAtFront([level().npc]) === 0) {
      setOutput('›', `門番「合言葉を入力して、扉へ出力してみろ」`);
    } else {
      setOutput('!', `${line}行目: ここには操作できるものがありません`, 'warning');
    }
  }
  if (command === 'input') {
    const mobIndex = objectIndexAtFront(level().mobs || []);
    if (level().npc && objectIndexAtFront([level().npc]) === 0) {
      state.variables[commandInfo.variable] = adventurePassword;
      level().door.password = adventurePassword;
      setOutput('›', `門番から受け取った文字列を ${commandInfo.variable} に保存しました`);
    } else if (mobIndex >= 0 && !state.resolvedMobs.includes(mobIndex)) {
      state.variables[commandInfo.variable] = level().mobs[mobIndex].type;
      setOutput('›', `MOBの種類を ${commandInfo.variable} に保存しました`);
    } else {
      setOutput('!', `${line}行目: 受け取れる入力データがありません`, 'warning');
    }
  }
  if (command === 'print') {
    let value = commandInfo.value;
    const quoted = value.match(/^(['"])(.*)\1$/);
    if (quoted) value = quoted[2];
    else if (Object.hasOwn(state.variables, value)) value = state.variables[value];
    else { setOutput('×', `${line}行目: ${value} という変数が見つかりません`, 'error'); renderDungeon(); return false; }
    setOutput('›', String(value));
    if (level().door && objectIndexAtFront([level().door]) === 0) {
      if (String(value) === level().door.password) {
        state.doorOpen = true;
        document.querySelector('#goalDot').classList.add('done');
        document.querySelector('#goalState').textContent = '階段へ';
        setOutput('✓', `${value} ― 扉が開きました`, 'success');
      } else setOutput('!', `${value} ― 扉は反応しません`, 'warning');
    }
  }
  if (command === 'attack()' || command === 'sayHello()') {
    const mobIndex = objectIndexAtFront(level().mobs || []);
    if (mobIndex < 0 || state.resolvedMobs.includes(mobIndex)) {
      setOutput('!', `${line}行目: ここには対応するMOBがいません`, 'warning');
    } else {
      const mob = level().mobs[mobIndex];
      const correct = (mob.type === 'enemy' && command === 'attack()') || (mob.type === 'ally' && command === 'sayHello()');
      if (!correct) {
        setOutput('×', mob.type === 'enemy' ? '敵に挨拶して攻撃されました' : '同族を攻撃してしまいました', 'error');
        renderDungeon();
        return false;
      }
      state.resolvedMobs.push(mobIndex);
      setOutput('✓', mob.type === 'enemy' ? '敵を倒しました' : '同族に挨拶しました', 'success');
    }
  }
  renderDungeon();
  return true;
}

async function runAll() {
  if (running) return;
  const parsed = parseCode();
  if (parsed.errors.length) {
    const error = parsed.errors[0];
    const message = parseErrorMessage(error);
    setOutput('×', message, 'error');
    showFailure(message, 'syntax');
    return;
  }
  resetState(false);
  parsedCommands = parsed.commands;
  running = true;
  document.querySelector('#runBtn').disabled = true;
  document.querySelector('#editorState').textContent = '実行中';
  let failed = false;
  for (let index = 0; index < parsedCommands.length; index++) {
    if (!await execute(parsedCommands[index])) {
      failed = true;
      showFailure(output.textContent.replace(/^\s*×\s*/, '').trim(), 'runtime');
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 480));
  }
  running = false;
  document.querySelector('#runBtn').disabled = false;
  if (!failed && state.cleared) {
    document.querySelector('#editorState').textContent = 'クリア';
  } else if (!failed) {
    const message = incompleteMessage();
    setOutput('×', message, 'error');
    showFailure(message, 'incomplete');
  }
}

async function runStep() {
  if (running) return;
  if (executionIndex === 0) {
    const parsed = parseCode();
    if (parsed.errors.length) {
      const error = parsed.errors[0];
      const message = parseErrorMessage(error);
      setOutput('×', message, 'error');
      showFailure(message, 'syntax');
      return;
    }
    resetState(false);
    parsedCommands = parsed.commands;
  }
  if (executionIndex >= parsedCommands.length) {
    executionIndex = 0;
    setOutput('›', 'すべてのコードを実行しました');
    return;
  }
  const succeeded = await execute(parsedCommands[executionIndex]);
  if (!succeeded) showFailure(output.textContent.replace(/^\s*×\s*/, '').trim(), 'runtime');
  executionIndex++;
}

function updateLineNumbers() {
  const count = Math.max(12, editor.value.split('\n').length);
  lineNumbers.innerHTML = Array.from({ length: count }, (_, index) => index + 1).join('<br>');
  document.querySelector('#editorState').textContent = '編集中';
  executionIndex = 0;
}

function requestInput(prompt, hint) {
  return new Promise(resolve => {
    const panel = document.querySelector('#inputPanel');
    const field = document.querySelector('#gameInput');
    document.querySelector('#inputPrompt').textContent = `門番「合言葉は ${hint} だ」`;
    document.querySelector('#inputLabel').textContent = prompt;
    field.value = '';
    panel.classList.add('show');
    field.focus();
    const submit = () => {
      panel.classList.remove('show');
      document.querySelector('#inputSubmit').removeEventListener('click', submit);
      field.removeEventListener('keydown', onKey);
      resolve(field.value);
    };
    const onKey = event => { if (event.key === 'Enter') submit(); };
    document.querySelector('#inputSubmit').addEventListener('click', submit);
    field.addEventListener('keydown', onKey);
  });
}

function insertCode(command) {
  const startPosition = editor.selectionStart;
  const before = editor.value.slice(0, startPosition);
  const after = editor.value.slice(editor.selectionEnd);
  const prefix = before && !before.endsWith('\n') ? '\n' : '';
  editor.value = `${before}${prefix}${command}\n${after}`;
  const cursor = startPosition + prefix.length + command.length + 1;
  editor.focus();
  editor.setSelectionRange(cursor, cursor);
  updateLineNumbers();
}

document.querySelectorAll('[data-insert]').forEach(button => button.addEventListener('click', () => {
  pendingInsert = button.dataset.insert;
  const modal = document.querySelector('#functionModal');
  const annotatedCode = button.querySelector('.furigana-code');
  document.querySelector('#functionDetailTitle').textContent = pendingInsert.split('\n')[0];
  document.querySelector('#functionDetailCode').innerHTML = annotatedCode ? annotatedCode.innerHTML : '';
  document.querySelector('#functionDetailHint').textContent = button.querySelector(':scope > span:last-child')?.textContent || '';
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
}));

document.querySelector('#closeFunctionDetail').addEventListener('click', () => {
  document.querySelector('#functionModal').classList.remove('show');
  document.querySelector('#functionModal').setAttribute('aria-hidden', 'true');
});

document.querySelector('#insertFunctionCode').addEventListener('click', () => {
  insertCode(pendingInsert);
  document.querySelector('#functionModal').classList.remove('show');
  document.querySelector('#functionModal').setAttribute('aria-hidden', 'true');
});

document.querySelectorAll('[data-code-key]').forEach(button => button.addEventListener('click', () => {
  const code = button.dataset.codeKey === '\\n' ? '\n' : button.dataset.codeKey;
  insertCode(code);
}));

const workspace = document.querySelector('.workspace');
const mobileViewButtons = [...document.querySelectorAll('[data-mobile-view]')];
mobileViewButtons.forEach(button => button.addEventListener('click', () => {
  workspace.dataset.activeMobileView = button.dataset.mobileView;
  mobileViewButtons.forEach(item => item.classList.toggle('active', item === button));
}));

document.querySelector('#referenceToggle').addEventListener('click', event => {
  const open = event.currentTarget.getAttribute('aria-expanded') === 'true';
  event.currentTarget.setAttribute('aria-expanded', String(!open));
  event.currentTarget.querySelector('b').textContent = open ? '+' : '−';
  document.querySelector('#referenceBody').hidden = open;
});

const sidebar = document.querySelector('#ideSidebar');
const sidePanel = document.querySelector('#sidePanel');
const activityButtons = [...document.querySelectorAll('[data-sidebar-pane]')];
function setSidebarPane(paneName) {
  const selected = activityButtons.find(button => button.dataset.sidebarPane === paneName);
  const isClosing = selected.classList.contains('active') && !sidebar.classList.contains('collapsed');
  activityButtons.forEach(button => button.classList.toggle('active', !isClosing && button === selected));
  document.querySelectorAll('[data-pane]').forEach(pane => {
    const visible = !isClosing && pane.dataset.pane === paneName;
    pane.hidden = !visible;
    pane.classList.toggle('active', visible);
  });
  sidebar.classList.toggle('collapsed', isClosing);
  sidePanel.setAttribute('aria-hidden', String(isClosing));
}
activityButtons.forEach(button => button.addEventListener('click', () => setSidebarPane(button.dataset.sidebarPane)));
document.querySelectorAll('[data-close-sidebar]').forEach(button => button.addEventListener('click', () => {
  sidebar.classList.add('collapsed');
  sidePanel.setAttribute('aria-hidden', 'true');
  activityButtons.forEach(item => item.classList.remove('active'));
}));
document.querySelector('#runBtn').addEventListener('click', runAll);
document.querySelector('#stepBtn').addEventListener('click', runStep);
document.querySelector('#resetBtn').addEventListener('click', () => resetState());
document.querySelector('#againBtn').addEventListener('click', () => {
  const lastFloor = Math.max(...Object.keys(levels).map(Number));
  if (currentFloor < lastFloor && loadProgress().cleared.includes(currentFloor)) selectFloor(currentFloor + 1);
  else {
    clearCard.classList.remove('show');
    document.querySelector('#titleScreen').classList.remove('hidden');
  }
});
document.querySelector('#retryBtn').onclick = retryLevel;
document.querySelector('#clearOutput').addEventListener('click', () => setOutput('›', '出力を消去しました'));
document.querySelector('#birdNameTitle').textContent = GAME.birdName;
document.querySelector('#continueAdventure').hidden = loadProgress().cleared.length === 0;
document.querySelector('#startTutorial').addEventListener('click', () => startAdventure(0));
document.querySelector('#continueAdventure').addEventListener('click', continueAdventure);
document.querySelector('#skipTutorial').addEventListener('click', () => startAdventure(1));
document.querySelectorAll('[data-test-floor]').forEach(button => button.addEventListener('click', () => startAdventure(Number(button.dataset.testFloor), true)));
document.querySelector('#lessonStart').addEventListener('click', () => { document.querySelector('#lessonModal').classList.remove('show'); document.querySelector('#lessonModal').setAttribute('aria-hidden', 'true'); });
editor.addEventListener('input', updateLineNumbers);
editor.addEventListener('scroll', () => { lineNumbers.scrollTop = editor.scrollTop; });
editor.addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    event.preventDefault();
    const startPosition = editor.selectionStart;
    editor.value = `${editor.value.slice(0, startPosition)}    ${editor.value.slice(editor.selectionEnd)}`;
    editor.setSelectionRange(startPosition + 4, startPosition + 4);
  }
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    runAll();
  }
});

function prepareEnemySprites() {
  const source = new Image();
  source.onload = () => {
    const size = Math.floor(source.width / 2);
    const views = { down: [0, 0], up: [1, 0], left: [0, 1], right: [1, 1] };
    Object.entries(views).forEach(([name, [column, row]]) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(source, column * size, row * size, size, size, 0, 0, size, size);
      const pixels = context.getImageData(0, 0, size, size);
      for (let index = 0; index < pixels.data.length; index += 4) {
        const red = pixels.data[index];
        const green = pixels.data[index + 1];
        const blue = pixels.data[index + 2];
        if (green > 150 && green > red * 1.7 && green > blue * 1.7) pixels.data[index + 3] = 0;
      }
      context.putImageData(pixels, 0, 0);
      enemySprites[name] = canvas.toDataURL('image/png');
    });
    renderDungeon();
  };
  source.src = 'assets/mob/enemy/sheet-chroma.png';
}

updateLineNumbers();
resetState(false);
prepareEnemySprites();
