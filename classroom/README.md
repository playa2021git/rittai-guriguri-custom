# 授業用の共有許可設定（GAS方式）

- 生徒用教材: https://playa2021git.github.io/rittai-guriguri-custom/
- 先生用の許可画面: https://script.google.com/macros/s/AKfycbypD7kOXb_9Tjyz2IdFuuVJZ9Eh9_Kyx3Hfg2548gNg-D0a7ZfWE-ueRlO2RW-kyngWbg/exec?mode=teacher
- 読み取り: 同じURLの `?mode=api`。GitHubのブラウザーからは `callback` を付けた読み取り専用JSONPで取得します。

GASの元コードとデプロイ手順は [../gas-trial/README.md](../gas-trial/README.md)、実際に貼るコードは [../gas-trial/Code.gs](../gas-trial/Code.gs) です。保存内容はGASのScript Propertiesへ永続化し、先生のメールアドレスと訪問者をサーバー側で照合します。公開するのは立体ID、版番号、更新時刻だけです。

生徒の教材URLはそのままです。許可設定は5秒ごと＋通信時間で自動取得します。読み取りに失敗すると立方体だけに戻して再接続します。GAS試験では保存の往復約1.1秒、別画面への反映約7秒を確認しました。JSONPは公開データの読み取りのみで使い、書き込みには使いません。

`client.js` の内容を `index.html` にも内蔵しています。HTML単体の配布を維持するため、修正時は両方に反映します。GASのコードを変更するときは、既存のデプロイを編集し「新しいバージョン」で更新してURLを維持してください。公開済みURLを変更した場合は生徒側のURL定数と先生用リンクも更新します。

## 確認

- `node tests/verify-gas-client.cjs`: JSONPの読み取り、通信失敗、応答不正、時間切れ、遅延応答、HTML内蔵コードとの一致。
- `node tests/verify-gas-trial.cjs`: 所有者のみの書き込み、キャッシュ更新、保存競合、公開データにメールアドレスが含まれないこと。
- `node tests/verify-measurements.cjs`: 立体・描画・出題制限と共有許可の適用／取消。

## 旧ChatGPT Sites版

以下は旧方式の保守資料です。本番の教材をGASへ切り替えた後は、通常のアクセス先として使いません。旧Sites自体の削除・停止は別作業であり、この変更では行いません。

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
