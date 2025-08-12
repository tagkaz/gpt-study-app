import 'dotenv/config';
import OpenAI from 'openai';
import { setupSchema, getDB } from './db.js';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ .env に OPENAI_API_KEY がありません');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SAekoPersona = `
あなたは「冴子先生」という英作文トレーナー。
口調: 現代的・親しみやすい・ややツンデレ可。文末は〜だわ、〜よ 等。
第二人称は「あなた」。不要な情緒反応は控える。
`;

function parseFeedback(feedback) {
  const mAns = feedback.match(/正解例:\s*(.+)/);
  const mErr = feedback.match(/ミスの種類:\s*(.+)/);
  const correctSample = mAns ? mAns[1].trim() : '';
  let catRaw = (mErr ? mErr[1] : '').trim();
  const parts = catRaw.split(/[|／,、\s]+/).filter(Boolean);
  const category = (parts[0] || 'その他').replace(/:$/, '');
  const isCorrect = /^なし$/i.test(category);
  return { correctSample, category: isCorrect ? null : category, isCorrect };
}

async function ask(messages, temperature = 0) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature,
    messages
  });
  return res.choices[0].message.content.trim();
}

async function getWeaknessFocus(db, userId) {
  const rows = await db.all(
    `SELECT category, frequency, last_occurred
       FROM weaknesses
      WHERE user_id = ?
      ORDER BY frequency DESC, datetime(last_occurred) DESC
      LIMIT 3`,
    [userId]
  );
  return rows.map(r => r.category).join(', ') || 'なし';
}

async function main() {
  await setupSchema();
  const db = await getDB();

  // ユーザー固定: default
  const user =
    (await db.get('SELECT id FROM users WHERE name = ?', ['default'])) ??
    (await db.run('INSERT INTO users (name) VALUES (?)', ['default']) &&
      (await db.get('SELECT id FROM users WHERE name = ?', ['default'])));
  const userId = user.id;

  // 弱点の取得（出題の指示に使う）
  const weaknessFocus = await getWeaknessFocus(db, userId);
  console.log('🔎 弱点フォーカス:', weaknessFocus);

  // セッション開始
  const sessionId = (await db.run(
    'INSERT INTO sessions (user_id) VALUES (?)',
    [userId]
  )).lastID;

  // 出題（弱点を考慮）
  const question = await ask(
    [
      {
        role: 'system',
        content:
          SAekoPersona +
          '\n出題は日本語で1問のみ。前置き・番号なし。構文ヒントは最小限。'
      },
      {
        role: 'user',
        content:
`学習者の既知の弱点: ${weaknessFocus}
上の弱点（例: 冠詞/動詞選択/時制/前置詞/語順/単数複数/語法）を自然に試せる内容を優先して、
基礎〜中級レベルで英訳する日本語文を1問だけ出題して。`
      }
    ],
    0.3
  );

  console.log('📌 出題（冴子先生）:', question);

  // 回答入力
  const rl = readline.createInterface({ input, output });
  const learnerAnswer = await rl.question('あなたの英語 > ');
  await rl.close();

  // 添削
  const feedback = await ask(
    [
      {
        role: 'system',
        content:
          SAekoPersona +
          '\n添削は次の2行のみを出力：\n正解例: ...\nミスの種類: 冠詞|動詞選択|時制|前置詞|語順|単数複数|スペリング|語法|その他|なし'
      },
      {
        role: 'user',
        content: `問題: ${question}\n学習者の解答: ${learnerAnswer}`
      }
    ],
    0
  );

  console.log('\n📝 添削結果\n' + feedback);

  const { correctSample, category, isCorrect } = parseFeedback(feedback);

  // 保存（questions）
  const qId = (
    await db.run(
      `INSERT INTO questions
        (session_id, question_text, expected_ans, user_answer, is_correct, error_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, question, correctSample, learnerAnswer, isCorrect ? 1 : 0, category]
    )
  ).lastID;

  // 弱点更新
  if (!isCorrect && category) {
    const existing = await db.get(
      'SELECT id, frequency FROM weaknesses WHERE user_id = ? AND category = ?',
      [userId, category]
    );
    if (existing) {
      await db.run(
        'UPDATE weaknesses SET frequency = ?, last_occurred = CURRENT_TIMESTAMP WHERE id = ?',
        [existing.frequency + 1, existing.id]
      );
    } else {
      await db.run(
        'INSERT INTO weaknesses (user_id, category, description, last_occurred, frequency) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)',
        [userId, category, `${category}に関するミス`, 1]
      );
    }
  }

  console.log(
    `\n💾 保存OK: question#${qId} / isCorrect=${isCorrect} / category=${category ?? 'なし'}`
  );

  await db.close();
}

main().catch(err => {
  console.error('❌ Error:', err?.response?.data ?? err);
  process.exit(1);
});
