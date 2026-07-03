# Kanji Draw Battle 公開手順

## 推奨: Render Free Web Service

このゲームはSocket.IOを使うため、静的HTMLホスティングだけではなくNode.jsサーバーが必要です。RenderのWeb Serviceに1つのアプリとして置く構成にしてあります。

## 事前に必要なログイン

- GitHub: コードをアップロードする場合
- Render: 無料Web Serviceを作成する場合

## 手順

1. `kanji-draw-battle` をGitHubリポジトリにpush
2. Renderで New > Web Service
3. GitHubリポジトリを接続
4. Free instanceを選択
5. 設定は `render.yaml` が使われます
6. 公開URLを開いて、複数タブでルーム作成と参加をテスト

## 手入力する場合

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`
- Node Version: `20`

## ローカル公開前チェック

```bash
cd kanji-draw-battle
npm install
npm run build
npm start
```

`http://localhost:3001` で動けば、Renderでも同じ1サービス構成で動く想定です。
