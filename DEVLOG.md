# DEVLOG.md（2025-08-12）

## きょうの要約
- Node.js + SQLite で「冴子先生」英作文トレーナーの**動く土台**を完成。
- 出題 → 回答入力 → 添削 → 弱点更新 → 履歴要約 → 次出題（弱点反映）まで通し動作。

## 実装したもの
- プロジェクト初期化（Node 18 / ES Modules）
- 依存：`openai`, `sqlite`, `sqlite3`, `dotenv`
- DBスキーマ：`users / sessions / questions / weaknesses / settings`
- API接続テスト（pong）
- 冴子先生ペルソナ固定で**1問出題**
- CLI入力で解答受付 → 添削（出力は「正解例」「ミスの種類」2行）
- `questions` へ保存、`weaknesses` をカウント更新
- 弱点トップ3を次出題に反映
- 直近履歴の**要約**をプロンプトへ同梱
- `.gitignore` 整備（`.env`, `*.db`, `node_modules/`, `.DS_Store`）
- GitHub 連携（Privateで整頓→Public）

## 重要な決定
- 構成：**Node.js + SQLite**（ローカル完結・簡単に永続化）
- モデル：`gpt-4o-mini`（軽量・応答安定）
- 口調：システムプロンプトで冴子先生固定
- ミス分類：冠詞 / 動詞選択 / 時制 / 前置詞 / 語順 / 単数複数 / スペリング / 語法 / その他 / なし

## 動作ログ抜粋
- 出題例：「彼は毎朝ジョギングをする。」→ `He jogs every morning.`（正解）
- 弱点フォーカス：初回は「動詞選択」、正答で維持
- 保存ログ例：`💾 保存OK: question#N / isCorrect=... / category=...`

## リポジトリ状態
- 公開OKファイル：`app.js`, `db.js`, `schema.sql`, `package.json`, `.gitignore`, `README.md`, `LICENSE`, `DEVLOG.md`
- 非公開・除外：`.env`, `gpt-study.db`, `node_modules/`（`.gitignore`で管理）

## 既知の課題（次回以降）
1. エラーハンドリング（API失敗時のリトライ/案内）
2. UI拡張（CLI → 簡易Web UI）
3. 履歴要約の最適化（直近は生データ、古い分は圧縮）
4. 複数ユーザー対応（切替機構）
5. 難易度自動調整（連続正誤で重み変更）
6. リリースタグ `v0.1.0` と `CHANGELOG.md`

## メモ
- **コミット＝保存ポイント／メッセージ＝人間向けメモ**。Pushで初めてGitHubに反映。
- `.gitignore` は公開してOK（除外ルールの共有が目的）。
