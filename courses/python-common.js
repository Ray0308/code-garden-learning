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
  const specs = [
    ['名前を付ける箱','変数への代入','score = 10','10をscoreへ保存して出力せよ','値へ名前を付ける「変数」を使おう。右辺の値が左辺の変数へ入る。','score = 10\nprint(score)',{kind:'output',expected:10}],
    ['文字の変数','文字列型','name = "Fukuro"','文字列を変数へ保存せよ','引用符で囲んだ値は文字列になる。文字列を変数へ保存して出力しよう。','name = "Fukuro"\nprint(name)',{kind:'output',expected:'Fukuro'}],
    ['真偽の印','真偽値','ready = True','真偽値Trueを保存せよ','正しい・正しくないを表す真偽値を使おう。','ready = True\nprint(ready)',{kind:'output',expected:true}],
    ['型を変える術','型変換','int("12")','文字列"12"を数値へ変換し、3を足して15を出力せよ','int()を使うと数字の文字列を整数へ変換できる。','number = int("12")\nprint(number + 3)',{kind:'output',expected:15}],
    ['足し算の祭壇','加算','7 + 5','7と5の合計を出力せよ','+ 演算子で数値を足せる。','total = 7 + 5\nprint(total)',{kind:'output',expected:12}],
    ['四則の回廊','四則演算','+ - * /','3×4から2を引いて10を出力せよ','掛け算は*、引き算は-を使う。','items = 3 * 4 - 2\nprint(items)',{kind:'output',expected:10}],
    ['割り算の余り','除算と剰余','17 % 5','17を5で割った余りを出力せよ','% は割り算の余りを求める演算子。','remainder = 17 % 5\nprint(remainder)',{kind:'output',expected:2}],
    ['優先順位の罠','演算の優先順位','(2 + 3) * 4','かっこを使って20を作れ','かっこの中は先に計算される。','answer = (2 + 3) * 4\nprint(answer)',{kind:'output',expected:20}],
    ['等しさの天秤','比較演算子','score == 10','scoreが10と等しいか出力せよ','== は左右が等しいかを調べる。代入の=と区別しよう。','score = 10\nprint(score == 10)',{kind:'output',expected:true}],
    ['大小の見張り','大小比較','level >= 5','levelを7にして、5以上かを判定しTrueを出力せよ','>= は左が右以上かを調べる。','level = 7\nprint(level >= 5)',{kind:'output',expected:true}],
    ['二つの条件','論理演算子and','age >= 18 and ready','ageを20、readyをTrueにして、両方の条件が成立するTrueを出力せよ','andは両方がTrueのときだけTrueになる。','age = 20\nready = True\nprint(age >= 18 and ready)',{kind:'output',expected:true}],
    ['どちらかの鍵','論理演算子or','has_key or has_pass','has_keyをFalse、has_passをTrueにしてTrueを出力せよ','orはどちらかがTrueならTrueになる。','has_key = False\nhas_pass = True\nprint(has_key or has_pass)',{kind:'output',expected:true}],
    ['数値で分かれる道','数値の条件分岐','if score >= 60:','合格ならpassを出力せよ','計算・比較の結果でもifを使える。','score = 75\nif score >= 60:\n    print("pass")\nelse:\n    print("retry")',{kind:'output',expected:'pass'}],
    ['偶数の門','演算と条件分岐','number % 2 == 0','numberを8にし、偶数なら"even"を出力せよ','2で割った余りが0なら偶数。','number = 8\nif number % 2 == 0:\n    print("even")\nelse:\n    print("odd")',{kind:'output',expected:'even'}],
    ['繰り返す計算','反復と変数','total = total + 2','2を4回足して8を作れ','繰り返しの中で変数を更新しよう。','total = 0\nfor _ in range(4):\n    total = total + 2\nprint(total)',{kind:'output',expected:8}],
    ['制御の総合門','演算・反復・条件分岐','for / if / +','4を3回足して12なら"clear"を出力せよ','反復で値を作り、比較して結果を出力しよう。','total = 0\nfor _ in range(3):\n    total = total + 4\nif total == 12:\n    print("clear")\nelse:\n    print("retry")',{kind:'output',expected:'clear'}],
    ['仲間を並べる箱','リスト','items = [2, 4, 6]','リストの先頭を出力せよ','リストは複数の値を順番に保存する。番号は0から始まる。','items = [2, 4, 6]\nprint(items[0])',{kind:'output',expected:2}],
    ['三番目の記録','リストの添字','items[2]','["red", "blue", "gold"]の3番目、"gold"を出力せよ','角かっこの番号で特定の要素を取り出せる。','items = ["red", "blue", "gold"]\nprint(items[2])',{kind:'output',expected:'gold'}],
    ['数を数える術','len()','len(items)','[10, 20, 30, 40]の要素数4を出力せよ','len()は文字列やリストの要素数を返す。','items = [10, 20, 30, 40]\nprint(len(items))',{kind:'output',expected:4}],
    ['名前で探す台帳','辞書','user["name"]','辞書のキー"name"から"Aoi"を取り出して出力せよ','辞書はキーと値を組にして保存する。','user = {"name": "Aoi", "score": 80}\nprint(user["name"])',{kind:'output',expected:'Aoi'}],
    ['記録を保存する','仮想保存','save("score", score)','scoreを仮想ファイルへ保存せよ','save()は教材内の仮想ファイルへ値を保存する。','score = 95\nsave("score", score)',{kind:'storage',key:'score',expected:95}],
    ['記録を読み戻す','仮想読込','load("message")','"saved"をmessageへ保存し、読み戻して出力せよ','load()で保存済みの値を読み込める。','save("message", "saved")\nmessage = load("message")\nprint(message)',{kind:'output',expected:'saved'}],
    ['壊れた計算書','エラー修正','total = price * count','変数名の誤りを直して600を出力せよ','エラーの行番号と変数名を読み、コードを修正しよう。','price = 200\ncount = 3\ntotal = price * count\nprint(total)',{kind:'output',expected:600},'price = 200\ncount = 3\ntotal = prise * count\nprint(total)'],
    ['共通編・最後の依頼','共通基礎の総合課題','変数 / 演算 / if / save','単価350×4の売上を計算し、1000以上なら"success"をresultへ保存せよ','単価と個数から売上を計算し、基準以上なら結果を保存して出力しよう。','price = 350\ncount = 4\ntotal = price * count\nif total >= 1000:\n    result = "success"\nelse:\n    result = "retry"\nsave("result", result)\nprint(result)',{kind:'storage',key:'result',expected:'success'}]
  ];
  const starters = {
    25:'name = "?"\nprint(name)',
    27:'number = "12"\nprint(number + 3)',
    29:'items = 3 + 4 - 2\nprint(items)',
    31:'answer = 2 + 3 * 4\nprint(answer)',
    33:'level = 4\nprint(level >= 5)',
    35:'has_key = False\nhas_pass = False\nprint(has_key or has_pass)',
    37:'number = 7\nif number % 2 == 0:\n    print("even")\nelse:\n    print("odd")',
    39:'total = 0\nfor _ in range(3):\n    total = total + 4\nif total == 10:\n    print("clear")\nelse:\n    print("retry")',
    41:'items = ["red", "blue", "gold"]\nprint(items[0])',
    43:'user = {"nam": "Aoi", "score": 80}\nprint(user["name"])',
    45:'save("message", "before")\nmessage = load("message")\nprint(message)',
    47:'price = 350\ncount = 4\ntotal = price + count\nif total >= 1000:\n    result = "success"\nelse:\n    result = "retry"\nsave("result", result)\nprint(result)'
  };
  const challengeVariables = {
    24:{score:10}, 25:{name:'Fukuro'}, 26:{ready:true}, 27:{number:12},
    28:{total:12}, 29:{items:10}, 30:{remainder:2}, 31:{answer:20},
    32:{score:10}, 33:{level:7}, 34:{age:20,ready:true},
    35:{has_key:false,has_pass:true}, 36:{score:75}, 37:{number:8},
    38:{total:8}, 39:{total:12}, 40:{items:[2,4,6]},
    41:{items:['red','blue','gold']}, 42:{items:[10,20,30,40]},
    43:{user:{name:'Aoi',score:80}}, 44:{score:95}, 45:{message:'saved'},
    46:{price:200,count:3,total:600},
    47:{price:350,count:4,total:1400,result:'success'}
  };
  const requiredConstructs = {
    27:['conversion'], 30:['modulo'], 36:['if'], 37:['if'], 38:['for'], 39:['for','if'],
    40:['list'], 41:['list'], 42:['list','length'], 43:['dictionary'],
    44:['save'], 45:['load'], 47:['if','save']
  };
  const modes = ['copy', 'change', 'fromScratch', 'debug'];
  specs.forEach((spec, offset) => {
    const [title, topic, syntax, mission, description, code, challenge, broken] = spec;
    const floor = 24 + offset;
    const chapter = Math.floor(offset / 4) + 1;
    const stage = offset % 4 + 1;
    const mode = broken ? 'debug' : modes[offset % modes.length];
    const initialCode = broken || starters[floor] || `# ${mission}`;
    course.curriculum.push({ floor, language:'python', world:3, chapter, stage, title, topic, syntax, minutes:10 });
    const capabilitySet = new Set(['move','action','variables']);
    if (/\bprint\(/.test(code)) capabilitySet.add('print');
    if (/^\s*if\b/m.test(code)) capabilitySet.add('if');
    if (/^\s*for\b/m.test(code)) capabilitySet.add('for');
    if (/\b(?:save|load)\(/.test(code)) capabilitySet.add('storage');
    course.levels[floor] = {
      prerequisite:floor - 1, capabilities:[...capabilitySet],
      requiredConstructs:requiredConstructs[floor] || [],
      concepts:(requiredConstructs[floor] || []).filter(name => name === 'conversion'),
      title, mission,
      description:`${description} 課題の結果を${challenge.kind === 'storage' ? 'save()で保存' : 'print()で出力'}し、2歩先の階段でaction()を実行するとクリア。`,
      start:{x:3,y:7,direction:2}, exit:{x:3,y:5}, maxSteps:24,
      obstacles:wallsExcept(['3,7','3,6','3,5']), starter:initialCode,
      goal:`${mission}。その後、2歩進んで階段でaction()を実行する`,
      challenge:{...challenge, variables:challengeVariables[floor]},
      support:{
        mode,
        instruction:mode === 'copy' ? 'お手本を入力し、値が作られる順番を確認しよう。'
          : mode === 'change' ? '用意されたコードを課題の値へ変更しよう。'
            : mode === 'debug' ? '実行結果やエラー行を読み、コードを修正しよう。'
              : '説明と構文を手掛かりに、ゼロからコードを書こう。',
        initialCode,
        example:mode === 'copy' ? `${code}\nmove()\nmove()\naction()` : undefined,
        hints:[syntax, '課題の値を出力または保存してから、2歩進んでaction()しよう。']
      },
      solution:`${code}\nmove()\nmove()\naction()`
    };
  });
  course.levels[30].support.mode = 'copy';
  course.levels[30].support.instruction = 'お手本を入力し、%が割り算の余りを求める演算子であることを実行結果で確かめよう。';
  course.levels[30].support.initialCode = '# お手本をこの下へ手入力しよう';
  course.levels[30].support.example = course.levels[30].solution;
  course.levels[30].support.hints = ['17 % 5 の結果は2です。', '計算結果をremainderへ保存して出力し、2歩進んでaction()します。'];
  course.levels[30].challenge.hint = 'remainder = 17 % 5で余りを保存し、print(remainder)で出力してから階段へ進もう。';
  content.version = 3;
  if (typeof module !== 'undefined' && module.exports) module.exports = content;
})(typeof globalThis !== 'undefined' ? globalThis : window);
