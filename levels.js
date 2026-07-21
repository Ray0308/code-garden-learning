(function defineLearningContent(root) {
  const wallsExcept = openCells => {
    const open = new Set(openCells);
    return Array.from({ length: 10 }, (_, y) => Array.from({ length: 8 }, (_, x) => `${x},${y}`))
      .flat()
      .filter(cell => !open.has(cell));
  };

  const curriculum = [
    { floor: 0, language: 'python', world: 1, chapter: 1, stage: 1, title: 'はじめの一歩', topic: '命令と実行順序', syntax: 'move() / action()', minutes: 5 },
    { floor: 1, language: 'python', world: 1, chapter: 1, stage: 2, title: '曲がり道の灯', topic: '命令の組み合わせ', syntax: 'move() / turnRight() / action()', minutes: 10 },
    { floor: 2, language: 'python', world: 1, chapter: 1, stage: 3, title: '反対向きの石像', topic: '実行結果からエラー修正', syntax: 'turnLeft() / turnRight()', minutes: 10 },
    { floor: 3, language: 'python', world: 1, chapter: 1, stage: 4, title: '灯火の守り人', topic: '命令と実行順序の総合課題', syntax: 'move() / turnRight() / action()', minutes: 15 },
    { floor: 4, language: 'python', world: 1, chapter: 2, stage: 1, title: '言霊の扉', topic: '文字列と出力', syntax: 'print("小さな羽根")', minutes: 5 },
    { floor: 5, language: 'python', world: 1, chapter: 2, stage: 2, title: '二つ目の合言葉', topic: '出力する文字列', syntax: 'print("金色の鍵")', minutes: 10 },
    { floor: 6, language: 'python', world: 1, chapter: 2, stage: 3, title: '壊れた石板', topic: '引用符のエラー修正', syntax: 'print("青い月")', minutes: 10 },
    { floor: 7, language: 'python', world: 1, chapter: 2, stage: 4, title: '言霊の守護者', topic: '文字列と出力の総合課題', syntax: 'print()', minutes: 15 },
    { floor: 8, language: 'python', world: 1, chapter: 3, stage: 1, title: '反復の石庭', topic: '繰り返し', syntax: 'for _ in range(3):', minutes: 10 },
    { floor: 9, language: 'python', world: 1, chapter: 3, stage: 2, title: '回数の迷路', topic: 'range()の回数', syntax: 'for _ in range(n):', minutes: 10 },
    { floor: 10, language: 'python', world: 1, chapter: 3, stage: 3, title: 'ずれた足跡', topic: 'インデントとエラー修正', syntax: '    move()', minutes: 10 },
    { floor: 11, language: 'python', world: 1, chapter: 3, stage: 4, title: '廻廊の番人', topic: '繰り返しの総合課題', syntax: 'for / move() / turnRight()', minutes: 15 },
    { floor: 12, language: 'python', world: 2, chapter: 1, stage: 1, title: 'はじめての敵', topic: '関数の呼び出し', syntax: 'attack()', minutes: 5 },
    { floor: 13, language: 'python', world: 2, chapter: 1, stage: 2, title: '森の仲間', topic: '関数の使い分け', syntax: 'sayHello()', minutes: 5 },
    { floor: 14, language: 'python', world: 2, chapter: 1, stage: 3, title: '剣の間合い', topic: '移動と攻撃', syntax: 'move() / attack()', minutes: 10 },
    { floor: 15, language: 'python', world: 2, chapter: 1, stage: 4, title: '敵と仲間の道', topic: '戦闘関数の総合', syntax: 'attack() / sayHello()', minutes: 15 },
    { floor: 16, language: 'python', world: 2, chapter: 2, stage: 1, title: '正体を読む目', topic: '入力と変数', syntax: 'mob = input()', minutes: 10 },
    { floor: 17, language: 'python', world: 2, chapter: 2, stage: 2, title: '受け取った言葉', topic: '変数の出力', syntax: 'print(mob)', minutes: 10 },
    { floor: 18, language: 'python', world: 2, chapter: 2, stage: 3, title: '三つの影', topic: '条件分岐', syntax: 'if / else', minutes: 15 },
    { floor: 19, language: 'python', world: 2, chapter: 2, stage: 4, title: '分かれ道の判断', topic: '条件分岐の穴埋め', syntax: 'if mob == "enemy":', minutes: 15 },
    { floor: 20, language: 'python', world: 2, chapter: 3, stage: 1, title: '敵なら攻撃', topic: '条件が真の処理', syntax: 'attack()', minutes: 15 },
    { floor: 21, language: 'python', world: 2, chapter: 3, stage: 2, title: '仲間なら挨拶', topic: 'elseの処理', syntax: 'sayHello()', minutes: 15 },
    { floor: 22, language: 'python', world: 2, chapter: 3, stage: 3, title: '壊れた判断', topic: '条件分岐の修正', syntax: 'if / else', minutes: 15 },
    { floor: 23, language: 'python', world: 2, chapter: 3, stage: 4, title: '三影の門', topic: '繰り返しと条件分岐', syntax: 'for / input / if', minutes: 15 }
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
    0: { prerequisite: null, capabilities: ['move', 'turn', 'action'], title: 'はじめの一歩', mission: 'お手本どおりに灯をともせ', description: '短いコードを手入力し、命令が上から順に実行されることを見よう。', start: { x: 3, y: 7, direction: 2 }, target: { x: 3, y: 6 }, exit: { x: 3, y: 5 }, maxSteps: 6, obstacles: wallsExcept(['3,7','3,6','3,5']), starter: '', goal: '灯にaction()し、階段まで進んでaction()する' },
    1: { prerequisite: 0, capabilities: ['move', 'turn', 'action'], title: '曲がり道の灯', mission: '途中のコードを完成させよ', description: '最初のmove()に続く命令を補い、右に曲がって灯と階段へ進もう。', start: { x: 2, y: 7, direction: 2 }, target: { x: 4, y: 5 }, exit: { x: 4, y: 4 }, maxSteps: 14, obstacles: wallsExcept(['2,7','2,6','2,5','3,5','4,5','4,4']), starter: '# 続きの命令を補おう\nmove()\nmove()', goal: '右に曲がり、灯をともして階段へ進む' },
    2: { prerequisite: 1, capabilities: ['move', 'turn', 'action'], title: '反対向きの石像', mission: '間違った方向命令を直せ', description: '用意されたコードは曲がる向きが逆になっている。実行結果を見て修正しよう。', start: { x: 3, y: 7, direction: 2 }, target: { x: 2, y: 5 }, exit: { x: 2, y: 4 }, maxSteps: 12, obstacles: wallsExcept(['3,7','3,6','3,5','2,5','2,4']), starter: '# 曲がる向きがひとつ間違っている\nmove()\nmove()\nturnRight()\nmove()\naction()\nturnRight()\nmove()\naction()', goal: '間違ったturnRight()を直して灯と階段へ進む' },
    3: { prerequisite: 2, capabilities: ['move', 'turn', 'action'], title: '灯火の守り人', mission: 'ゼロから命令を組み立てよ', description: 'お手本なしで道順を観察し、灯をともして階段へ進むコードを書こう。', start: { x: 1, y: 8, direction: 2 }, target: { x: 4, y: 6 }, exit: { x: 4, y: 4 }, maxSteps: 16, obstacles: wallsExcept(['1,8','1,7','1,6','2,6','3,6','4,6','4,5','4,4']), starter: '', goal: '道順を自分でコードにし、灯と階段を操作する' },
    4: { prerequisite: 3, capabilities: ['move', 'turn', 'action', 'print'], title: '言霊の扉', mission: 'お手本どおりの合言葉を出力せよ', description: 'print()で文字を出力すると扉が開く。かっこと引用符もお手本どおりに手入力しよう。', start: { x: 3, y: 7, direction: 2 }, exit: { x: 3, y: 5 }, door: { x: 3, y: 6, password: '小さな羽根' }, maxSteps: 6, obstacles: wallsExcept(['3,7','3,6','3,5']), starter: '', goal: 'print("小さな羽根")で扉を開け、階段へ進む' },
    5: { prerequisite: 4, capabilities: ['move', 'turn', 'action', 'print'], title: '二つ目の合言葉', mission: '出力する文字を補え', description: '扉の合言葉は「金色の鍵」。用意された移動コードにprint()を追加しよう。', start: { x: 2, y: 7, direction: 2 }, exit: { x: 4, y: 4 }, door: { x: 4, y: 5, password: '金色の鍵' }, maxSteps: 12, obstacles: wallsExcept(['2,7','2,6','2,5','3,5','4,5','4,4']), starter: '# 扉の正面で合言葉を出力しよう\nmove()\nmove()\nturnRight()\nmove()', goal: 'print("金色の鍵")を補って扉を開ける' },
    6: { prerequisite: 5, capabilities: ['move', 'turn', 'action', 'print'], title: '壊れた石板', mission: '引用符の閉じ忘れを直せ', description: '石板のprint()は引用符が片方しかない。エラー表示を読んで修正しよう。', start: { x: 3, y: 7, direction: 2 }, exit: { x: 3, y: 5 }, door: { x: 3, y: 6, password: '青い月' }, maxSteps: 6, obstacles: wallsExcept(['3,7','3,6','3,5']), starter: '# 引用符がひとつ足りない\nprint("青い月)\nmove()\nmove()\naction()', goal: '引用符を直して「青い月」を出力する' },
    7: { prerequisite: 6, capabilities: ['move', 'turn', 'action', 'print'], title: '言霊の守護者', mission: '合言葉をゼロから出力せよ', description: '道順と扉の位置を観察し、「白銀の羽」を出力して階段へ進もう。', start: { x: 1, y: 8, direction: 2 }, exit: { x: 4, y: 4 }, door: { x: 4, y: 6, password: '白銀の羽' }, maxSteps: 14, obstacles: wallsExcept(['1,8','1,7','1,6','2,6','3,6','4,6','4,5','4,4']), starter: '', goal: '「白銀の羽」をprint()し、階段まで進む' },
    8: { prerequisite: 7, capabilities: ['move', 'turn', 'action', 'print', 'for'], title: '反復の石庭', mission: '同じ命令を短くまとめよ', description: 'forとrange()を使うと、同じ命令を決めた回数だけ繰り返せる。お手本を入力して動きを見よう。', start: { x: 3, y: 8, direction: 2 }, target: { x: 3, y: 5 }, exit: { x: 3, y: 4 }, maxSteps: 7, obstacles: wallsExcept(['3,8','3,7','3,6','3,5','3,4']), starter: '', goal: 'move()を3回繰り返し、灯をともして階段へ進む' },
    9: { prerequisite: 8, capabilities: ['move', 'turn', 'action', 'print', 'for'], title: '回数の迷路', mission: 'range()の回数を補え', description: '縦と横に同じ距離だけ進む道だ。2つのrange()へ正しい回数を入れよう。', start: { x: 1, y: 8, direction: 2 }, target: { x: 4, y: 5 }, exit: { x: 4, y: 4 }, maxSteps: 12, obstacles: wallsExcept(['1,8','1,7','1,6','1,5','2,5','3,5','4,5','4,4']), starter: '# range()の回数を補おう\nfor _ in range(1):\n    move()\nturnRight()\nfor _ in range(1):\n    move()', goal: '2つのrange()を直し、灯をともして階段へ進む' },
    10: { prerequisite: 9, capabilities: ['move', 'turn', 'action', 'print', 'for'], title: 'ずれた足跡', mission: 'インデントのずれを直せ', description: 'forの中で繰り返す命令は、行の先頭を半角スペース4つ分下げる。エラーを読んで修正しよう。', start: { x: 3, y: 8, direction: 2 }, target: { x: 3, y: 5 }, exit: { x: 3, y: 4 }, maxSteps: 7, obstacles: wallsExcept(['3,8','3,7','3,6','3,5','3,4']), starter: '# move()のインデントが足りない\nfor _ in range(3):\nmove()\naction()\nmove()\naction()', goal: 'move()をforの内側へインデントし、階段へ進む' },
    11: { prerequisite: 10, capabilities: ['move', 'turn', 'action', 'print', 'for'], title: '廻廊の番人', mission: '繰り返しをゼロから組み立てよ', description: '縦に3マス、右へ曲がって横に3マス進む。forを2回使い、短く読みやすいコードで突破しよう。', start: { x: 1, y: 8, direction: 2 }, target: { x: 4, y: 5 }, exit: { x: 4, y: 4 }, maxSteps: 12, obstacles: wallsExcept(['1,8','1,7','1,6','1,5','2,5','3,5','4,5','4,4']), starter: '', goal: 'forを2回使い、灯をともして階段へ進む' },
    12: { prerequisite: 11, capabilities: ['move','action','attack'], title: 'はじめての敵', mission: '正面の敵を攻撃せよ', description: '敵の正面でattack()を呼び出すと道を開けられる。お手本を入力して試そう。', start:{x:3,y:7,direction:2}, exit:{x:3,y:5}, mobs:[{x:3,y:6,type:'enemy'}], maxSteps:5, obstacles:wallsExcept(['3,7','3,6','3,5']), starter:'', goal:'attack()で敵を倒して階段へ進む' },
    13: { prerequisite:12, capabilities:['move','action','sayHello'], title:'森の仲間', mission:'仲間へ挨拶せよ', description:'仲間には攻撃せず、正面でsayHello()を呼び出そう。', start:{x:3,y:7,direction:2}, exit:{x:3,y:5}, mobs:[{x:3,y:6,type:'ally'}], maxSteps:5, obstacles:wallsExcept(['3,7','3,6','3,5']), starter:'', goal:'sayHello()で仲間に挨拶して階段へ進む' },
    14: { prerequisite:13, capabilities:['move','action','attack'], title:'剣の間合い', mission:'敵まで進んで攻撃せよ', description:'用意された移動の続きを補い、敵の正面でattack()しよう。', start:{x:2,y:8,direction:2}, exit:{x:2,y:4}, mobs:[{x:2,y:6,type:'enemy'}], maxSteps:7, obstacles:wallsExcept(['2,8','2,7','2,6','2,5','2,4']), starter:'# 敵の正面まで進もう\nmove()', goal:'移動とattack()を正しい順番で使う' },
    15: { prerequisite:14, capabilities:['move','action','attack','sayHello'], title:'敵と仲間の道', mission:'相手に合う関数を使え', description:'見えている敵にはattack()、仲間にはsayHello()を使い分けよう。', start:{x:3,y:8,direction:2}, exit:{x:3,y:2}, mobs:[{x:3,y:7,type:'enemy'},{x:3,y:4,type:'ally'}], maxSteps:11, obstacles:wallsExcept(['3,8','3,7','3,6','3,5','3,4','3,3','3,2']), starter:'', goal:'敵と仲間へ正しく対応して階段へ進む' },
    16: { prerequisite:15, capabilities:['move','action','input','attack'], title:'正体を読む目', mission:'input()で種類を受け取れ', description:'正面の相手をinput()で調べると、種類が変数mobに入る。まず入力を体験しよう。', start:{x:3,y:7,direction:2}, exit:{x:3,y:5}, mobs:[{x:3,y:6,type:'enemy'}], maxSteps:6, obstacles:wallsExcept(['3,7','3,6','3,5']), starter:'', goal:'mob = input()で種類を受け取り敵を倒す' },
    17: { prerequisite:16, capabilities:['move','action','input','print','sayHello'], title:'受け取った言葉', mission:'変数mobを出力せよ', description:'input()で受け取った値をprint(mob)で確認し、仲間へ挨拶しよう。', start:{x:3,y:7,direction:2}, exit:{x:3,y:5}, mobs:[{x:3,y:6,type:'ally'}], maxSteps:7, obstacles:wallsExcept(['3,7','3,6','3,5']), starter:'', goal:'入力した変数を出力して仲間へ挨拶する' },
    18: { prerequisite:17, capabilities:['move','action','input','if','attack','sayHello'], title:'三つの影', mission:'曲がり道の3体を判断せよ', description:'相手を判断したら3歩進んで右を向く。同じ手順を3回書いてU字の回廊を突破しよう。', start:{x:1,y:8,direction:2}, exit:{x:4,y:8}, setup:{type:'randomMobs',positions:[{x:1,y:7},{x:2,y:5},{x:4,y:6}]}, maxSteps:24, obstacles:wallsExcept(['1,8','1,7','1,6','1,5','2,5','3,5','4,5','4,6','4,7','4,8']), starter:'', goal:'判断・3歩・右折を3回繰り返してゴールする' },
    19: { prerequisite:18, capabilities:['move','action','input','if','attack','sayHello'], title:'分かれ道の判断', mission:'条件式を完成させよ', description:'曲がるたびに正体不明の相手が待つ。条件式を補い、同じ手順を繰り返そう。', start:{x:1,y:8,direction:2}, exit:{x:4,y:8}, setup:{type:'randomMobs',positions:[{x:1,y:7},{x:2,y:5},{x:4,y:6}]}, maxSteps:24, obstacles:wallsExcept(['1,8','1,7','1,6','1,5','2,5','3,5','4,5','4,6','4,7','4,8']), starter:'# enemyかどうかを判断しよう', goal:'条件式を補いU字回廊の3体へ対応する' },
    20: { prerequisite:19, capabilities:['move','action','input','if','attack','sayHello'], title:'敵なら攻撃', mission:'真の場合の処理を理解せよ', description:'ifの結果を確認しながら、判断・3歩・右折のまとまりを3回実行しよう。', start:{x:1,y:8,direction:2}, exit:{x:4,y:8}, setup:{type:'randomMobs',positions:[{x:1,y:7},{x:2,y:5},{x:4,y:6}]}, maxSteps:24, obstacles:wallsExcept(['1,8','1,7','1,6','1,5','2,5','3,5','4,5','4,6','4,7','4,8']), starter:'', goal:'敵へattack()しながら曲がり道を進む' },
    21: { prerequisite:20, capabilities:['move','action','input','if','attack','sayHello'], title:'仲間なら挨拶', mission:'elseの処理を理解せよ', description:'elseで仲間へ対応し、各区間で3歩進んで右折する同じ手順を繰り返そう。', start:{x:1,y:8,direction:2}, exit:{x:4,y:8}, setup:{type:'randomMobs',positions:[{x:1,y:7},{x:2,y:5},{x:4,y:6}]}, maxSteps:24, obstacles:wallsExcept(['1,8','1,7','1,6','1,5','2,5','3,5','4,5','4,6','4,7','4,8']), starter:'', goal:'elseで仲間へ挨拶しながらU字回廊を進む' },
    22: { prerequisite:21, capabilities:['move','action','input','if','attack','sayHello'], title:'壊れた判断', mission:'逆になった処理を直せ', description:'判断コードを直したら、同じ移動と右折も3区間分書いて回廊を突破しよう。', start:{x:1,y:8,direction:2}, exit:{x:4,y:8}, setup:{type:'randomMobs',positions:[{x:1,y:7},{x:2,y:5},{x:4,y:6}]}, maxSteps:24, obstacles:wallsExcept(['1,8','1,7','1,6','1,5','2,5','3,5','4,5','4,6','4,7','4,8']), starter:'# attack()とsayHello()が逆\nmob = input()\nif mob == "enemy":\n    sayHello()\nelse:\n    attack()', goal:'条件分岐を修正し、反復手順で3体を通過する' },
    23: { prerequisite:22, capabilities:['move','action','input','if','attack','sayHello','for'], title:'三影の門', mission:'反復する回廊を短く書け', description:'判断・3歩・右折が3回続くU字回廊。forとif/elseを組み合わせて短く突破しよう。', start:{x:1,y:8,direction:2}, exit:{x:4,y:8}, setup:{type:'randomMobs',positions:[{x:1,y:7},{x:2,y:5},{x:4,y:6}]}, maxSteps:24, obstacles:wallsExcept(['1,8','1,7','1,6','1,5','2,5','3,5','4,5','4,6','4,7','4,8']), starter:'', goal:'判断・3歩・右折をforで3回繰り返す' }
  };

  const supportByFloor = {
    0: { mode: 'copy', instruction: 'お手本と同じ命令を手で入力し、上から順に動くことを確かめよう。', initialCode: '# お手本を見ながら、この下に手入力しよう', example: 'move()\naction()\nmove()\naction()', hints: ['move()は正面へ1マス進む命令です。', '灯と階段のマスではaction()を使います。'] },
    1: { mode: 'fill', instruction: '用意されたmove()の続きを補い、右に曲がる道順を完成させよう。', hints: ['そのまま2マス進んだら右を向きます。', '灯のマスでaction()した後、左を向いて階段へ進みます。'] },
    2: { mode: 'debug', instruction: '実行して壁にぶつかる場所を見つけ、右と左の命令を修正しよう。', hints: ['3行目まで実行したとき、階段側ではなく壁の方を向いています。', '2つのturnRight()をturnLeft()とturnRight()の組み合わせに直します。'] },
    3: { mode: 'fromScratch', instruction: 'マップを観察し、move()、方向転換、action()をゼロから組み立てよう。', initialCode: '# 道順を自分でコードにしよう', hints: ['まず2マス上へ進み、右を向きます。', '灯まで3マス進んでaction()します。', '灯の後は左を向き、2マス進んで階段を操作します。'] },
    4: { mode: 'copy', instruction: 'print()のかっこと引用符も含めて、お手本を手入力しよう。', initialCode: '# お手本をこの下に手入力しよう', example: 'print("小さな羽根")\nmove()\nmove()\naction()', hints: ['print()は正面の扉へ文字を出力します。', '扉が開いたら、2マス進んで階段を操作します。'] },
    5: { mode: 'fill', instruction: '扉の正面までの移動は用意済み。合言葉のprint()と残りの移動を補おう。', hints: ['4回目のmove()の後、正面に扉があります。', 'print("金色の鍵")で開けた後、扉のマスへ進みます。'] },
    6: { mode: 'debug', instruction: '実行してエラーの行番号を確認し、引用符の閉じ忘れを修正しよう。', hints: ['2行目の文字列は、左側にしか引用符がありません。', '「青い月」の後ろに"を追加します。'] },
    7: { mode: 'fromScratch', instruction: '移動、方向転換、print()を組み合わせ、ゼロから扉を開けよう。', initialCode: '# 「白銀の羽」を出力して扉を開けよう', hints: ['まず2マス進み、右を向きます。', '扉の1マス手前まで進んだらprint("白銀の羽")を実行します。', '扉を通過したら左を向き、2マス進みます。'] },
    8: { mode: 'copy', instruction: 'お手本を手入力し、インデントされたmove()が3回実行される様子を確かめよう。', initialCode: '# お手本をこの下へ手入力しよう', example: 'for _ in range(3):\n    move()\naction()\nmove()\naction()', hints: ['forの行末にはコロン「:」が必要です。', '繰り返すmove()の前には半角スペースを4つ入れます。'] },
    9: { mode: 'fill', instruction: '縦も横も3マス進む。2つのrange()の数字を正しい回数へ直そう。', hints: ['range(3)なら、中の命令を3回繰り返します。', '灯のマスでaction()し、左を向いて1マス進むと階段です。'] },
    10: { mode: 'debug', instruction: '実行してエラーの行番号を確認し、forの内側にある命令の字下げを直そう。', hints: ['forの次のmove()が行の先頭から始まっています。', 'move()の前へ半角スペースを4つ追加します。'] },
    11: { mode: 'fromScratch', instruction: '同じ移動を何度も書かず、forを2回使って廻廊を突破しよう。', initialCode: '# forを使って短く読みやすいコードを書こう', hints: ['最初は上へ3マス進みます。', '右を向いた後も3マス進み、灯のマスでaction()します。', '灯の後は左を向いて1マス進み、階段でaction()します。'] },
    12:{mode:'copy',instruction:'お手本どおりattack()を入力しよう。',initialCode:'# 敵の正面で実行しよう',example:'attack()\nmove()\nmove()\naction()',hints:['敵の正面ではattack()です。','倒した後は2マス進みます。']},
    13:{mode:'copy',instruction:'仲間を傷つけずsayHello()を入力しよう。',initialCode:'# 仲間へ挨拶しよう',example:'sayHello()\nmove()\nmove()\naction()',hints:['仲間にはsayHello()です。','挨拶後に道を進みます。']},
    14:{mode:'fill',instruction:'敵の正面まで進み、attack()と残りの移動を補おう。',hints:['もう1マス進むと敵の正面です。','attack()後は3マス進んでaction()します。']},
    15:{mode:'fromScratch',instruction:'見えている敵と仲間へ正しい関数を使おう。',initialCode:'# 敵には攻撃、仲間には挨拶',hints:['最初は敵です。','2体目は仲間です。','対応後はそれぞれ2マス進みます。']},
    16:{mode:'copy',instruction:'mob = input()で正面の種類を変数へ保存しよう。',initialCode:'# 正面の種類を受け取ろう',example:'mob = input()\nattack()\nmove()\nmove()\naction()',hints:['input()の結果をmobへ代入します。','このステージの相手は敵です。']},
    17:{mode:'fill',instruction:'入力したmobをprint(mob)で確認しよう。',hints:['mob = input()の次にprint(mob)を書きます。','この相手は仲間なのでsayHello()です。']},
    18:{mode:'copy',instruction:'判断・3歩・右折のまとまりを3回手入力しよう。',initialCode:'# お手本を3区間分繰り返して入力しよう',example:'mob = input()\nif mob == "enemy":\n    attack()\nelse:\n    sayHello()\nmove()\nmove()\nmove()\nturnRight()',hints:['各区間の先頭でinput()します。','対応後はmove()を3回書きます。','3歩進んだらturnRight()。同じまとまりを3回使います。']},
    19:{mode:'fill',instruction:'条件式と対応処理を補って3体を判断しよう。',hints:['条件はmob == "enemy"です。','elseの中はsayHello()です。']},
    20:{mode:'copy',instruction:'ifの結果を見ながら、同じ判断と移動を3回書こう。',initialCode:'# 3区間へ同じ判断と移動を行おう',example:'mob = input()\nif mob == "enemy":\n    attack()\nelse:\n    sayHello()\nmove()\nmove()\nmove()\nturnRight()',hints:['enemyのときだけattack()へ進みます。','各対応後は3歩進んで右を向きます。']},
    21:{mode:'fill',instruction:'else側のsayHello()を完成させよう。',hints:['enemyではないときelseへ進みます。','3体すべてへ同じ判断を使えます。']},
    22:{mode:'debug',instruction:'逆になったattack()とsayHello()を入れ替えよう。',hints:['敵へsayHello()すると失敗します。','if側をattack()、else側をsayHello()にします。']},
    23:{mode:'fromScratch',instruction:'判断・3歩・右折をforの中へまとめよう。',initialCode:'# U字回廊の反復を短いコードにしよう',hints:['for _ in range(3):から始めます。','input()とif/elseもforの内側へインデントします。','各対応後にmove()を3回とturnRight()を実行し、最後にaction()します。']}
  };
  Object.entries(levels).forEach(([floor, stage]) => { stage.support = supportByFloor[floor]; });

  const content = { version: 1, defaultLanguage: 'python', columns: 8, rows: 10, curriculum, worldOnePlan, levels };
  root.CODE_GARDEN_CONTENT = content;
  if (typeof module !== 'undefined' && module.exports) module.exports = content;
})(typeof globalThis !== 'undefined' ? globalThis : window);
