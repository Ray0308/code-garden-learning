(function defineLearningContent(root) {
  const wallsExcept = openCells => {
    const open = new Set(openCells);
    return Array.from({ length: 10 }, (_, y) => Array.from({ length: 8 }, (_, x) => `${x},${y}`))
      .flat()
      .filter(cell => !open.has(cell));
  };

  const curriculum = [
    { floor: 0, language: 'python', world: 1, chapter: 0, title: 'はじまりの間', topic: '操作チュートリアル', syntax: 'move() / action()', minutes: 5 },
    { floor: 1, language: 'python', world: 1, chapter: 1, title: '灯火の洞窟', topic: '命令と実行順序', syntax: 'move() / action()', minutes: 10 },
    { floor: 2, language: 'python', world: 1, chapter: 2, title: '出会いの二間', topic: '関数を使い分ける', syntax: 'attack() / sayHello()', minutes: 10 },
    { floor: 3, language: 'python', world: 1, chapter: 3, title: '言霊の遺跡', topic: '出力と文字列', syntax: 'print("小さな羽根")', minutes: 10 },
    { floor: 4, language: 'python', world: 1, chapter: 4, title: '反復の蛇行廊', topic: '繰り返し', syntax: 'for _ in range(3):', minutes: 15 },
    { floor: 5, language: 'python', world: 1, chapter: 5, title: '問いかけの離れ', topic: '入力と変数', syntax: 'password = input()', minutes: 15 },
    { floor: 6, language: 'python', world: 1, chapter: 6, title: '魔物の分岐殿', topic: '条件分岐', syntax: 'if mob == "enemy":', minutes: 15 }
  ];

  // 第1ワール改編の実装計画。curriculum/levels は現在プレイ可能な階層だけを表す。
  const worldOnePlan = [
    { id: '1-1', chapter: 1, stage: 1, title: 'はじめの一歩', topic: '命令と実行順序', syntax: 'move() / action()', support: 'copy', minutes: 5, reuses: [] },
    { id: '1-2', chapter: 1, stage: 2, title: '曲がり道の灯', topic: '命令の並び替え', syntax: 'move() / turnRight()', support: 'fill', minutes: 10, reuses: ['move()', 'action()'] },
    { id: '1-3', chapter: 1, stage: 3, title: '反対向きの石像', topic: 'エラー修正', syntax: 'turnLeft() / turnRight()', support: 'debug', minutes: 10, reuses: ['実行順序'] },
    { id: '1-4', chapter: 1, stage: 4, title: '灯火の守り人', topic: '章の総合課題', syntax: 'move() / turnRight() / action()', support: 'fromScratch', minutes: 15, reuses: ['実行順序', '方向転換'] },
    { id: '2-1', chapter: 2, stage: 1, title: '言霊の扉', topic: '文字列と出力', syntax: 'print("小さな羽根")', support: 'copy', minutes: 5, reuses: ['基本操作'] },
    { id: '2-2', chapter: 2, stage: 2, title: '二つの合言葉', topic: '引用符と出力値', syntax: 'print("合言葉")', support: 'fill', minutes: 10, reuses: ['print()', '文字列'] },
    { id: '2-3', chapter: 2, stage: 3, title: '壊れた石板', topic: '構文エラー修正', syntax: 'print("...")', support: 'debug', minutes: 10, reuses: ['かっこ', '引用符'] },
    { id: '2-4', chapter: 2, stage: 4, title: '言霊の守護者', topic: '出力の総合課題', syntax: 'print()', support: 'fromScratch', minutes: 15, reuses: ['基本操作', '文字列', 'エラー修正'] },
    { id: '3-1', chapter: 3, stage: 1, title: '反復の石廊', topic: '繰り返し', syntax: 'for _ in range(3):', support: 'copy', minutes: 10, reuses: ['move()'] },
    { id: '3-2', chapter: 3, stage: 2, title: '回数の迷路', topic: 'range()の回数', syntax: 'for _ in range(n):', support: 'fill', minutes: 10, reuses: ['for', '実行順序'] },
    { id: '3-3', chapter: 3, stage: 3, title: 'ずれた足跡', topic: 'インデントとエラー修正', syntax: '    move()', support: 'debug', minutes: 10, reuses: ['for', 'インデント'] },
    { id: '3-4', chapter: 3, stage: 4, title: '蛇行廊の番人', topic: '繰り返しの総合課題', syntax: 'for / move() / turnRight()', support: 'fromScratch', minutes: 15, reuses: ['基本操作', '文字列', '繰り返し'] }
  ];

  const levels = {
    0: { prerequisite: null, capabilities: ['move', 'turn', 'action'], title: 'はじまりの間', mission: '操作に慣れよう', description: 'move()で進み、action()で灯と階段を操作してみよう。失敗しても何度でもやり直せる。', start: { x: 3, y: 7, direction: 2 }, target: { x: 3, y: 6 }, exit: { x: 3, y: 5 }, maxSteps: 6, obstacles: [], starter: '# まずは1マス進んで灯を調べよう\nmove()\naction()', goal: '基本操作を試す' },
    1: { prerequisite: null, capabilities: ['move', 'turn', 'action'], title: '灯火の洞窟', mission: '迷宮の灯を回収せよ', description: '洞窟の曲がり道を進み、action()で灯を拾って奥の階段を降りよう。', start: { x: 1, y: 8, direction: 2 }, target: { x: 4, y: 6 }, exit: { x: 6, y: 1 }, maxSteps: 28, obstacles: wallsExcept(['1,8','1,7','1,6','2,6','3,6','4,6','3,7','4,7','5,7','5,6','5,5','4,5','4,4','5,4','6,4','6,3','6,2','6,1']), starter: '# 洞窟の灯を回収して階段を降りよう\nmove()\nmove()', goal: '灯を回収して階段を降りる' },
    2: { prerequisite: 1, capabilities: ['move', 'turn', 'action', 'attack', 'sayHello'], title: '出会いの二間', mission: '敵と同族へ対応せよ', description: '二つの部屋をつなぐ道を進み、最初の敵へattack()、次の部屋にいる同族へsayHello()を実行しよう。登場順は固定されている。', start: { x: 1, y: 8, direction: 2 }, exit: { x: 6, y: 2 }, mobs: [{ x: 2, y: 6, type: 'enemy' },{ x: 5, y: 4, type: 'ally' }], maxSteps: 32, obstacles: wallsExcept(['1,8','2,8','1,7','2,7','1,6','2,6','3,6','4,6','4,5','5,5','6,5','4,4','5,4','6,4','6,3','6,2']), starter: '# 敵には攻撃、同族には挨拶しよう\nmove()', goal: 'attack()とsayHello()を順番に使う' },
    3: { prerequisite: 2, capabilities: ['move', 'turn', 'action', 'attack', 'sayHello', 'print'], title: '言霊の遺跡', mission: '合言葉を扉へ出力せよ', description: '遺跡の中央にある扉の正面で、指定のコード print("小さな羽根") を実行して扉を開こう。文字・かっこ・引用符まで同じように入力する。', start: { x: 1, y: 8, direction: 2 }, exit: { x: 6, y: 1 }, door: { x: 4, y: 4, password: '小さな羽根' }, maxSteps: 34, obstacles: wallsExcept(['1,8','2,8','1,7','2,7','1,6','2,6','3,6','4,6','4,5','4,4','4,3','5,3','6,3','5,2','6,2','6,1']), starter: '# 扉の正面で print("小さな羽根") を実行しよう\nmove()\nmove()\nturnRight()', goal: '扉の正面で print("小さな羽根") を実行する' },
    4: { prerequisite: 3, capabilities: ['move', 'turn', 'action', 'attack', 'sayHello', 'print', 'for'], title: '反復の蛇行廊', mission: '反復で石廊を抜けよ', description: '長さのそろった通路が折り返す石廊で、繰り返すmove()をforに置き換えよう。_は今回は値を使わないことを表している。', start: { x: 1, y: 8, direction: 2 }, target: { x: 6, y: 2 }, exit: { x: 5, y: 1 }, maxSteps: 38, obstacles: wallsExcept(['1,8','1,7','1,6','1,5','2,5','3,5','4,5','5,5','5,4','5,3','4,3','3,3','2,3','2,2','3,2','4,2','5,2','6,2','6,1','5,1']), starter: '# 同じ命令は for で繰り返そう\nfor _ in range(3):\n    move()', goal: 'forを使って蛇行する石廊を攻略する' },
    5: { prerequisite: 4, capabilities: ['move', 'turn', 'action', 'attack', 'sayHello', 'print', 'for', 'input'], setup: { type: 'adventurePassword' }, title: '問いかけの離れ', mission: '入力を保存して届けよ', description: '門番の小部屋でinput()し、受け取った値を変数へ保存して、中庭の向こうにある扉へprint()しよう。', start: { x: 2, y: 8, direction: 3 }, exit: { x: 6, y: 1 }, npc: { x: 1, y: 8 }, door: { x: 5, y: 3, password: '' }, maxSteps: 42, obstacles: wallsExcept(['1,8','2,8','1,7','2,7','2,6','3,6','4,6','4,5','5,5','6,5','4,4','5,4','6,4','5,3','6,3','6,2','6,1']), starter: '# 門番から値を受け取り、離れの扉へ届けよう\npassword = input()', goal: 'input()の値を離れの扉へ出力する' },
    6: { prerequisite: 5, capabilities: ['move', 'turn', 'action', 'attack', 'sayHello', 'print', 'for', 'input', 'if'], setup: { type: 'randomMobs', positions: [{ x: 1, y: 7 }, { x: 3, y: 6 }, { x: 5, y: 4 }] }, title: '魔物の分岐殿', mission: '敵と同族を見極めよ', description: '広間と分岐に現れるMOBの種類は挑戦ごとにランダム。正面でinput()し、ifでattack()とsayHello()を選ぼう。', start: { x: 1, y: 8, direction: 2 }, exit: { x: 6, y: 1 }, mobs: [], maxSteps: 52, obstacles: wallsExcept(['1,8','1,7','2,7','1,6','2,6','3,6','4,6','3,7','4,7','4,5','5,5','6,5','4,4','5,4','6,4','5,3','6,3','5,2','6,2','6,1']), starter: '# 正面のMOBを調べて判断しよう\nmob = input()', goal: '分岐する広間でランダムな3体のMOBに対応する' }
  };

  const supportByFloor = {
    0: { mode: 'copy', instruction: 'お手本と同じ命令を手で入力し、上から順に動くことを確かめよう。', initialCode: '# お手本を見ながら、この下に手入力しよう', example: 'move()\naction()\nmove()\naction()', hints: ['move()は正面へ1マス進む命令です。', '灯と階段のマスではaction()を使います。'] },
    1: { mode: 'fill', instruction: '用意された最初の命令に続けて、迷宮を抜ける命令を補おう。', hints: ['1行ずつ実行して、現在の向きを確かめよう。', '曲がり角でturnLeft()かturnRight()を追加します。', '灯を拾うときと階段でaction()が必要です。'] },
    2: { mode: 'fromScratch', instruction: '相手を見分け、必要な命令を自分で選んで追加しよう。', initialCode: '# 敵と同族への対応をゼロから組み立てよう', hints: ['敵の正面ではattack()を使います。', '同族の正面ではsayHello()を使います。'] },
    3: { mode: 'copy', instruction: '文字・かっこ・引用符をお手本どおりに入力しよう。', example: 'print("小さな羽根")', hints: ['扉の正面まで移動してからprint()を実行します。', '合言葉は半角の引用符"で囲みます。'] },
    4: { mode: 'copy', instruction: 'forの形とインデントをお手本どおりに入力し、繰り返しの動きを見よう。', example: 'for _ in range(3):\n    move()', hints: ['同じmove()が続く部分をforにまとめます。', 'forの中の命令は半角スペース4つで字下げします。'] },
    5: { mode: 'fill', instruction: 'input()で受け取った値を、その後の命令で使うコードを補おう。', hints: ['passwordにinput()の結果が保存されます。', '扉の正面でprint(password)を実行します。'] },
    6: { mode: 'fromScratch', instruction: '学んだinputとifを組み合わせ、3体すべてへ対応するコードを組み立てよう。', initialCode: '# inputとifを使い、3体のMOBへの対応を組み立てよう', hints: ['MOBの正面でmob = input()を実行します。', 'mob == "enemy"のときはattack()、それ以外はsayHello()です。', '同じ判定を3体それぞれの正面で実行します。'] }
  };
  Object.entries(levels).forEach(([floor, stage]) => { stage.support = supportByFloor[floor]; });

  const content = { version: 1, defaultLanguage: 'python', columns: 8, rows: 10, curriculum, worldOnePlan, levels };
  root.CODE_GARDEN_CONTENT = content;
  if (typeof module !== 'undefined' && module.exports) module.exports = content;
})(typeof globalThis !== 'undefined' ? globalThis : window);
