# gpt-study-app

「冴子先生」口調で **英作文の出題 → 回答 → 添削 → 弱点更新** を自動化するローカルアプリ。

## Features
- 1問ずつ出題（冴子先生の口調を固定）
- 回答を即時添削し、**ミスの種類**（冠詞/動詞選択/時制…）を分類
- 弱点をDBに保存し、**次の出題に反映**
- 古い履歴は要約してプロンプトを軽量化（将来拡張）

## Requirements
- Node.js **18 以上**
- OpenAI APIキー（本リポジトリには含まれません）

## Setup
```bash
git clone <このリポジトリのURL>
cd gpt-study-app
npm install
