# 授業用の共有許可設定

- 生徒用教材: https://playa2021git.github.io/rittai-guriguri-custom/
- 公開の読み取りAPI: https://guriguri-classroom-state.terakadobutyo.chatgpt.site/api/state
- 先生だけの管理画面: https://guriguri-teacher-control.terakadobutyo.chatgpt.site/

`state/` は公開SiteのWorkerとD1スキーマ、`teacher/` は所有者限定SiteのWorkerです。先生Siteのアクセス範囲は非公開のまま維持してください。先生のブラウザーは同一Siteの `/api/state` にアクセスし、Workerが秘密鍵を付けて公開APIへ代理書き込みします。生徒のブラウザーはGETのみです。

秘密情報 `CLASSROOM_WRITE_SECRET` は両Siteの実行環境にのみ設定済みで、ソースやブラウザーへ含めません。先生Siteには実行環境変数 `STATE_ORIGIN` も設定します。値を変更した場合は保存済みバージョンを再デプロイしてください。

生徒側は `client.js` の内容を `index.html` の先頭スクリプトへ内蔵しています。HTML単体のダウンロード機能を保つためです。修正時は両方に反映してください。

## 確認

- `node tests/verify-measurements.cjs`: 立体・描画・出題制限と共有許可の適用／取消を確認。
- `node tests/verify-classroom-service.mjs`: ローカルSQLiteを使い、永続化・認証・同時更新の競合・初期化を確認（Node 22以降）。
- `scripts/verify-live-classroom.mjs`: 公開後の疎通確認用。秘密情報は非表示の標準入力だけで渡し、引数やファイルへ保存しないでください。許可を一時変更した後、元の設定に戻します。

## 公開・保守

各Siteは `.openai/hosting.json` のproject_idを維持し、Sitesのソース準備・保存・公開手順で更新します。`node build.mjs` でWorkerを `dist/server/index.js` へコピーします。公開APIのD1バインディングは `DB`。適用済み `drizzle/0000_classroom.sql` は変更せず、スキーマの変更は新しいマイグレーションとして追加してください。

GitHub Pages本体とは別に2つのSiteを更新する必要があります。GitHubへのpushだけではWorkerは更新されません。管理画面は現時点では所有者1人向け、許可設定は全クラス共通です。
