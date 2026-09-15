(function extendPythonCommonCourse(root) {
  const content = root.CODE_GARDEN_CONTENT || (typeof require === 'function' ? require('../levels.js') : null);
  const course = content?.courses?.python;
  if (!course || course.levels[24]) {
    if (typeof module !== 'undefined' && module.exports) module.exports = content;
    return;
  }
  const wallsExcept = openCells => {
    const open = new Set(openCells);
    return Array.from({ length: 10 }, (_, y) => Array.from({ length: 8 }, (_, x) => `${x},${y}`))
      .flat().filter(cell => !open.has(cell));
  };
  const layouts = [
    {
      id: 'vault-l',
      open: ['3,8', '3,7', '3,6', '2,6', '1,6', '1,5', '1,4'],
      start: { x: 3, y: 8, direction: 2 },
      exit: { x: 1, y: 4 },
      door: { x: 3, y: 7 },
      route: 'move()\nmove()\nturnLeft()\nmove()\nmove()\nturnRight()\nmove()\nmove()\naction()',
      needsTurn: true
    },
    {
      id: 'three-doors',
      open: ['3,8', '3,7', '3,6', '2,6', '1,6', '4,6', '5,6', '3,5', '3,4', '3,3'],
      start: { x: 3, y: 8, direction: 2 },
      exit: { x: 3, y: 3 },
      doors: [{ x: 1, y: 6, decoy: true }, { x: 3, y: 6, correct: true }, { x: 5, y: 6, decoy: true }],
      route: 'move()\nmove()\nmove()\nmove()\nmove()\naction()'
    },
    {
      id: 'fork',
      open: ['3,8', '3,7', '3,6', '2,6', '1,6', '1,5', '1,4', '4,6', '5,6', '5,5', '5,4'],
      start: { x: 3, y: 8, direction: 2 },
      exit: { x: 1, y: 4 },
      doors: [{ x: 1, y: 6, correct: true }, { x: 5, y: 6, decoy: true }],
      route: 'move()\nmove()\nturnLeft()\nmove()\nmove()\nturnRight()\nmove()\nmove()\naction()',
      needsTurn: true
    },
    {
      id: 'wide-hall',
      open: ['2,8', '3,8', '4,8', '2,7', '3,7', '4,7', '2,6', '3,6', '4,6', '3,5', '3,4'],
      start: { x: 3, y: 8, direction: 2 },
      exit: { x: 3, y: 4 },
      door: { x: 3, y: 6 },
      route: 'move()\nmove()\nmove()\nmove()\naction()'
    },
    {
      id: 'gallery',
      open: ['3,8', '3,7', '3,6', '3,5', '2,5', '1,5', '4,5', '5,5', '3,4', '3,3'],
      start: { x: 3, y: 8, direction: 2 },
      exit: { x: 3, y: 3 },
      door: { x: 3, y: 5 },
      route: 'move()\nmove()\nmove()\nmove()\nmove()\naction()'
    },
    {
      id: 'loop',
      open: ['3,8', '4,8', '5,8', '5,7', '5,6', '4,6', '3,6', '3,5', '3,4'],
      start: { x: 3, y: 8, direction: 1 },
      exit: { x: 3, y: 4 },
      door: { x: 5, y: 6 },
      route: 'move()\nmove()\nturnLeft()\nmove()\nmove()\nturnLeft()\nmove()\nmove()\nturnRight()\nmove()\nmove()\naction()',
      needsTurn: true
    },
    {
      id: 'twin-rooms',
      open: ['1,8', '2,8', '3,8', '3,7', '3,6', '4,6', '5,6', '5,5', '5,4', '4,4', '3,4'],
      start: { x: 1, y: 8, direction: 1 },
      exit: { x: 3, y: 4 },
      door: { x: 3, y: 6 },
      route: 'move()\nmove()\nturnLeft()\nmove()\nmove()\nturnRight()\nmove()\nmove()\nturnLeft()\nmove()\nmove()\nturnLeft()\nmove()\nmove()\naction()',
      needsTurn: true
    },
    {
      id: 'snake',
      open: ['3,8', '4,8', '5,8', '5,7', '5,6', '4,6', '3,6', '2,6', '2,5', '2,4', '3,4', '3,3'],
      start: { x: 3, y: 8, direction: 1 },
      exit: { x: 3, y: 3 },
      door: { x: 5, y: 6 },
      route: 'move()\nmove()\nturnLeft()\nmove()\nmove()\nturnLeft()\nmove()\nmove()\nmove()\nturnRight()\nmove()\nmove()\nturnRight()\nmove()\nmove()\naction()',
      needsTurn: true
    }
  ];
  const lampRow = {
    id: 'lamp-row',
    open: ['1,7', '2,7', '3,7', '4,7', '5,7', '5,6', '5,5', '4,5', '3,5'],
    start: { x: 1, y: 7, direction: 1 },
    exit: { x: 3, y: 5 },
    door: { x: 5, y: 6 },
    targets: [{ x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }],
    route: 'for _ in range(4):\n    move()\n    action()\nturnRight()\nmove()\nmove()\nturnRight()\nmove()\nmove()\naction()',
    needsTurn: true
  };
  const specs = [
    ['名前を付ける箱', '変数への代入', 'score = 10', '10をscoreへ保存し、その値で扉を開け', '値へ名前を付ける「変数」を使おう。右辺の値が左辺の変数へ入る。正しい値を出力すると、同じ数字の扉が開く。', 'score = 10\nprint(score)', { kind: 'output', expected: 10 }],
    ['文字の変数', '文字列型', 'name = "Fukuro"', '文字列を変数へ保存し、合言葉の扉を開け', '引用符で囲んだ値は文字列になる。出力した文字列と一致する扉だけが開く。', 'name = "Fukuro"\nprint(name)', { kind: 'output', expected: 'Fukuro' }],
    ['真偽の印', '真偽値', 'ready = True', '真偽値Trueを保存し、正しい道の扉を開け', '正しい・正しくないを表す真偽値を使おう。Trueの扉が安全な道につながる。', 'ready = True\nprint(ready)', { kind: 'output', expected: true }],
    ['型を変える術', '型変換', 'int("12")', '文字列"12"を数値へ変換し、3を足した番号の扉を開け', 'int()を使うと数字の文字列を整数へ変換できる。計算結果と同じ番号の扉を選ぼう。', 'number = int("12")\nprint(number + 3)', { kind: 'output', expected: 15 }],
    ['足し算の祭壇', '加算', '7 + 5', '7と5の合計と同じ番号の扉を開け', '+ 演算子で数値を足せる。合計が書かれた扉が開く。', 'total = 7 + 5\nprint(total)', { kind: 'output', expected: 12 }],
    ['四則の回廊', '四則演算', '+ - * /', '3×4から2を引いた数の扉を開け', '掛け算は*、引き算は-を使う。計算結果の扉だけが通れる。', 'items = 3 * 4 - 2\nprint(items)', { kind: 'output', expected: 10 }],
    ['割り算の余り', '除算と剰余', '17 % 5', '17を5で割った余りと同じ周期の扉を開け', '% は割り算の余りを求める演算子。余りの数の床だけが安全だ。', 'remainder = 17 % 5\nprint(remainder)', { kind: 'output', expected: 2 }],
    ['優先順位の罠', '演算の優先順位', '(2 + 3) * 4', 'かっこを使って作った20の扉を開け', 'かっこの中は先に計算される。優先順位を間違えると別の扉が開く。', 'answer = (2 + 3) * 4\nprint(answer)', { kind: 'output', expected: 20 }],
    ['等しさの天秤', '比較演算子', 'score == 10', 'scoreが10と等しいかを判定し、Trueの道を進め', '== は左右が等しいかを調べる。代入の=と区別しよう。判定結果で開く道が変わる。', 'score = 10\nprint(score == 10)', { kind: 'output', expected: true }],
    ['大小の見張り', '大小比較', 'level >= 5', 'levelを7にして、5以上ならTrueの扉を開け', '>= は左が右以上かを調べる。条件に合うルートだけが開く。', 'level = 7\nprint(level >= 5)', { kind: 'output', expected: true }],
    ['二つの条件', '論理演算子and', 'age >= 18 and ready', 'ageを20、readyをTrueにし、両方成立するTrueで扉を開け', 'andは両方がTrueのときだけTrueになる。鍵を2つ揃えるイメージだ。', 'age = 20\nready = True\nprint(age >= 18 and ready)', { kind: 'output', expected: true }],
    ['どちらかの鍵', '論理演算子or', 'has_key or has_pass', 'has_keyをFalse、has_passをTrueにしてTrueの扉を開け', 'orはどちらかがTrueならTrueになる。どちらかの鍵で扉が開く。', 'has_key = False\nhas_pass = True\nprint(has_key or has_pass)', { kind: 'output', expected: true }],
    ['数値で分かれる道', '数値の条件分岐', 'if score >= 60:', '合格ならpassを出力して安全な道を開け', '計算・比較の結果でもifを使える。passの扉が正解ルートだ。', 'score = 75\nif score >= 60:\n    print("pass")\nelse:\n    print("retry")', { kind: 'output', expected: 'pass' }],
    ['偶数の門', '演算と条件分岐', 'number % 2 == 0', 'numberを8にし、偶数なら"even"の扉を開け', '2で割った余りが0なら偶数。偶数の門だけが開く。', 'number = 8\nif number % 2 == 0:\n    print("even")\nelse:\n    print("odd")', { kind: 'output', expected: 'even' }],
    ['繰り返す計算', '反復と変数', 'total = total + 2', '4つの灯をforで回収しながら2を4回足し、8を出力せよ', '繰り返しの中で変数を更新し、並んだ灯もまとめて処理しよう。', 'total = 0\nfor _ in range(4):\n    total = total + 2\nprint(total)', { kind: 'output', expected: 8 }],
    ['制御の総合門', '演算・反復・条件分岐', 'for / if / +', '4つの灯を回収し、4を3回足して12なら"clear"の扉を開け', '反復で値を作り、比較して結果を出力しよう。', 'total = 0\nfor _ in range(3):\n    total = total + 4\nif total == 12:\n    print("clear")\nelse:\n    print("retry")', { kind: 'output', expected: 'clear' }],
    ['仲間を並べる箱', 'リスト', 'items = [2, 4, 6]', 'リストの先頭の番号の扉を開け', 'リストは複数の値を順番に保存する。番号は0から始まる。', 'items = [2, 4, 6]\nprint(items[0])', { kind: 'output', expected: 2 }],
    ['三番目の記録', 'リストの添字', 'items[2]', '["red", "blue", "gold"]の3番目、"gold"の箱を開け', '角かっこの番号で特定の要素を取り出せる。3番目は番号2だ。', 'items = ["red", "blue", "gold"]\nprint(items[2])', { kind: 'output', expected: 'gold' }],
    ['数を数える術', 'len()', 'len(items)', '[10, 20, 30, 40]の要素数4の扉を開け', 'len()は文字列やリストの要素数を返す。その数が扉の番号になる。', 'items = [10, 20, 30, 40]\nprint(len(items))', { kind: 'output', expected: 4 }],
    ['名前で探す台帳', '辞書', 'user["name"]', '辞書のキー"name"から"Aoi"を取り出して名札の扉を開け', '辞書はキーと値を組にして保存する。名前で対象を選ぼう。', 'user = {"name": "Aoi", "score": 80}\nprint(user["name"])', { kind: 'output', expected: 'Aoi' }],
    ['記録を保存する', '仮想保存', 'save("score", score)', 'scoreを仮想ファイルへ保存し、保管庫の扉を開け', 'save()は教材内の仮想ファイルへ値を保存する。保存が成功すると扉が開く。', 'score = 95\nsave("score", score)', { kind: 'storage', key: 'score', expected: 95 }],
    ['記録を読み戻す', '仮想読込', 'load("message")', '"saved"を保存して読み戻し、合言葉の扉を開け', '前の部屋で保存した値を、次の扉で読み込んで使おう。', 'save("message", "saved")\nmessage = load("message")\nprint(message)', { kind: 'output', expected: 'saved' }],
    ['壊れた計算書', 'エラー修正', 'total = price * count', '変数名の誤りを直し、600の扉を開け', 'エラーの行番号と変数名を読み、コードを修正しよう。正しい合計の扉が開く。', 'price = 200\ncount = 3\ntotal = price * count\nprint(total)', { kind: 'output', expected: 600 }, 'price = 200\ncount = 3\ntotal = prise * count\nprint(total)'],
    ['共通編・最後の依頼', '共通基礎の総合課題', '変数 / 演算 / if / save', '単価350×4の売上を計算し、1000以上なら"success"を保存して最後の扉を開け', '単価と個数から売上を計算し、基準以上なら結果を保存して出力しよう。複数の部屋を連続で攻略する。', 'price = 350\ncount = 4\ntotal = price * count\nif total >= 1000:\n    result = "success"\nelse:\n    result = "retry"\nsave("result", result)\nprint(result)', { kind: 'storage', key: 'result', expected: 'success' }]
  ];
  const starters = {
    25: 'name = "?"\nprint(name)',
    27: 'number = "12"\nprint(number + 3)',
    29: 'items = 3 + 4 - 2\nprint(items)',
    31: 'answer = 2 + 3 * 4\nprint(answer)',
    33: 'level = 4\nprint(level >= 5)',
    35: 'has_key = False\nhas_pass = False\nprint(has_key or has_pass)',
    37: 'number = 7\nif number % 2 == 0:\n    print("even")\nelse:\n    print("odd")',
    39: 'total = 0\nfor _ in range(3):\n    total = total + 4\nif total == 10:\n    print("clear")\nelse:\n    print("retry")',
    41: 'items = ["red", "blue", "gold"]\nprint(items[0])',
    43: 'user = {"nam": "Aoi", "score": 80}\nprint(user["name"])',
    45: 'save("message", "before")\nmessage = load("message")\nprint(message)',
    47: 'price = 350\ncount = 4\ntotal = price + count\nif total >= 1000:\n    result = "success"\nelse:\n    result = "retry"\nsave("result", result)\nprint(result)'
  };
  const challengeVariables = {
    24: { score: 10 }, 25: { name: 'Fukuro' }, 26: { ready: true }, 27: { number: 12 },
    28: { total: 12 }, 29: { items: 10 }, 30: { remainder: 2 }, 31: { answer: 20 },
    32: { score: 10 }, 33: { level: 7 }, 34: { age: 20, ready: true },
    35: { has_key: false, has_pass: true }, 36: { score: 75 }, 37: { number: 8 },
    38: { total: 8 }, 39: { total: 12 }, 40: { items: [2, 4, 6] },
    41: { items: ['red', 'blue', 'gold'] }, 42: { items: [10, 20, 30, 40] },
    43: { user: { name: 'Aoi', score: 80 } }, 44: { score: 95 }, 45: { message: 'saved' },
    46: { price: 200, count: 3, total: 600 },
    47: { price: 350, count: 4, total: 1400, result: 'success' }
  };
  const requiredConstructs = {
    27: ['conversion'], 30: ['modulo'], 36: ['if'], 37: ['if'], 38: ['for'], 39: ['for', 'if'],
    40: ['list'], 41: ['list'], 42: ['list', 'length'], 43: ['dictionary'],
    44: ['save'], 45: ['load'], 47: ['if', 'save']
  };
  const decoyFor = expected => {
    if (expected === true) return false;
    if (expected === false) return true;
    if (typeof expected === 'number') return expected === 10 ? 8 : expected - 1;
    if (expected === 'pass') return 'retry';
    if (expected === 'even') return 'odd';
    if (expected === 'clear') return 'retry';
    if (expected === 'gold') return 'red';
    if (expected === 'Aoi') return 'score';
    if (expected === 'Fukuro') return 'name';
    if (expected === 'saved') return 'before';
    if (expected === 'success') return 'retry';
    return `not-${expected}`;
  };
  const modes = ['copy', 'change', 'fromScratch', 'debug'];
  specs.forEach((spec, offset) => {
    const [title, topic, syntax, mission, description, code, challenge, broken] = spec;
    const floor = 24 + offset;
    const chapter = Math.floor(offset / 4) + 1;
    const stage = offset % 4 + 1;
    const mode = broken ? 'debug' : modes[offset % modes.length];
    const initialCode = broken || starters[floor] || `# ${mission}`;
    const layout = floor === 38 ? lampRow : layouts[offset % layouts.length];
    const expected = challenge.expected;
    const password = String(expected);
    const decoy = String(decoyFor(expected));
    const door = layout.door ? { ...layout.door, password, listenAnywhere: true } : undefined;
    const doors = (layout.doors || []).map(item => ({
      x: item.x,
      y: item.y,
      password: item.correct ? password : decoy,
      listenAnywhere: true,
      label: item.correct ? password : decoy
    }));
    course.curriculum.push({ floor, language: 'python', world: 3, chapter, stage, title, topic, syntax, minutes: 10 });
    const capabilitySet = new Set(['move', 'action', 'variables']);
    if (layout.needsTurn) capabilitySet.add('turn');
    if (/\bprint\(/.test(code)) capabilitySet.add('print');
    if (/^\s*if\b/m.test(code) || /\nif /.test(code)) capabilitySet.add('if');
    if (/^\s*for\b/m.test(code) || /\nfor /.test(code) || layout.targets) capabilitySet.add('for');
    if (/\b(?:save|load)\(/.test(code)) capabilitySet.add('storage');
    const puzzleThenRoute = `${code}\n${layout.route}`;
    course.levels[floor] = {
      prerequisite: floor - 1, capabilities: [...capabilitySet],
      requiredConstructs: requiredConstructs[floor] || [],
      concepts: (requiredConstructs[floor] || []).filter(name => name === 'conversion'),
      title, mission,
      description: `${description} 正しい結果を出力または保存すると、ダンジョンの扉や箱が反応する。開いた道を進み、階段でaction()しよう。`,
      start: layout.start, exit: layout.exit, maxSteps: 48,
      layoutId: layout.id,
      obstacles: wallsExcept(layout.open), starter: initialCode,
      goal: `${mission}。結果で仕掛けを動かしてから、階段でaction()する`,
      challenge: { ...challenge, variables: challengeVariables[floor], hint: `${topic}の結果が扉や箱に伝わるか確認しよう。` },
      door, doors, targets: layout.targets,
      support: {
        mode,
        instruction: mode === 'copy' ? 'お手本を入力し、値が作られると世界がどう変わるか確認しよう。'
          : mode === 'change' ? '用意されたコードを課題の値へ変更し、開く扉を確かめよう。'
            : mode === 'debug' ? '実行結果やエラー行を読み、仕掛けが反応するまで直そう。'
              : '説明と構文を手掛かりに、ゼロからコードを書いて仕掛けを動かそう。',
        initialCode,
        example: mode === 'copy' ? puzzleThenRoute : undefined,
        hints: [syntax, '計算や判定の結果を出力／保存すると、扉や箱が反応する。開いた道を進んで階段でaction()しよう。']
      },
      solution: puzzleThenRoute,
      recap: `今回覚えたこと：${topic}`
    };
  });
  course.levels[30].support.mode = 'copy';
  course.levels[30].support.instruction = 'お手本を入力し、%が割り算の余りを求める演算子であることを、扉の反応で確かめよう。';
  course.levels[30].support.initialCode = '# お手本をこの下へ手入力しよう';
  course.levels[30].support.example = course.levels[30].solution;
  course.levels[30].support.hints = [
    '割り算の余りは、何個ずつ配ったあとに残る数。',
    '余りの値と同じ番号の扉だけが開く。開いてから階段へ進もう。'
  ];
  course.levels[30].challenge.hint = '余りの値を出力して扉を開けてから、開いた道を階段まで進もう。';
  course.levels[38].solution = `total = 0
for _ in range(4):
    move()
    action()
    total = total + 2
print(total)
turnRight()
move()
move()
turnRight()
move()
move()
action()`;
  course.levels[38].support.example = course.levels[38].support.mode === 'copy' ? course.levels[38].solution : undefined;
  content.version = 4;
  if (typeof module !== 'undefined' && module.exports) module.exports = content;
})(typeof globalThis !== 'undefined' ? globalThis : window);
