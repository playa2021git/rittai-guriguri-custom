# GitHub設定更新の速度試験

既存のChatGPT Sites版を切り替えず、GitHubだけで設定を更新・配信する場合の遅延を測ります。試験対象は `teacher-benchmark/state.json` のみです。生徒用の `index.html`、共有データベース、許可設定は変更しません。

`Classroom permission speed test` を手動実行すると、標準のGitHub Actions実行環境が試験ファイルをコミットし、Pagesの再ビルドも明示的に要求します。GitHub Actionsの通常トークンによるコミットはPagesビルドを自動起動しないためです。

- 手動測定: 公開された `/teacher-benchmark/` で測定開始し、リンク先のGitHubで「Run workflow」を実行します。画面の測定値には操作時間も含まれます。
- 自動測定: `python scripts/measure-github-permission-speed.py --trials 3`。既存のGitHubサインインをメモリー内で使用します。新しいキーを作らず、認証情報を出力・保存しません。
- 自動測定は実行要求の直前から、匿名の読み取りで更新IDを初めて確認できるまでを測ります。2秒刻みの取得と通信時間を含みます。
- 比較対象: GitHubの直接配信（キャッシュ更新確認あり／通常URL）とGitHub Pages。通常URLの古いキャッシュが残る場合、タイムアウトとして記録します。

これは少数回の速度試験です。授業中の多数端末での安定性、学校のネットワーク制限、長期運用の上限までは保証しません。採用を決めるまでは本番の許可設定を切り替えません。
