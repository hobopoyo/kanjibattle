# Kanji Draw Battle

リアルタイム対戦型の漢字学習ゲームです。

## いちばん簡単な公開方法

このアプリは Socket.IO を使うため、Netlify のような静的サイトだけでは動きません。
Render の Web Service で公開してください。

## GitHubにアップロードするもの

`kanji-draw-battle` フォルダの中身を全部アップロードします。

重要なファイル:

- `package.json`
- `render.yaml`
- `client/`
- `server/`
- `shared/`

アップロードしないもの:

- `node_modules/`
- `client/dist/`
- `server/dist/`

## Render設定

Renderで Web Service を作成し、GitHubのリポジトリを選びます。

手入力が必要な場合は以下です。

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`
- Node Version: `20`
- Plan: `Free`

`render.yaml` が読み込まれる場合は、ほとんど自動で設定されます。

## ローカルで試す場合

Node.js が入っているPCなら以下で確認できます。

```bash
npm install
npm run build
npm start
```

ブラウザで開くURL:

```text
http://localhost:3001
```

## 公開後の確認

1. 公開URLを開く
2. 名前を入力してルーム作成
3. 別タブまたはスマホで同じURLを開く
4. ルームコードで参加
5. ゲーム開始
6. 手書き線が相手に見えるか確認
7. 正解・スコア・結果画面を確認

## よくある注意

Render無料プランは、しばらくアクセスがないとスリープします。
最初のアクセスで少し待つことがあります。
授業で使う場合は、授業前に一度URLを開いてください。
