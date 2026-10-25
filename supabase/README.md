# Supabase seed

## 既存のマスターデータ

`scripts/seed-database.mjs` は、カテゴリ、質問、用語集、禁止語などの既存seedを登録します。

## 架空サンプル議論

`scripts/seed-sample-discussions.mjs` は、`seed/sample_users.json`、
`seed/sample_stances.json`、`seed/sample_discussions.json` を検証し、サンプルユーザー、
スレッド、コメントを登録するためのローカル専用CLIです。

通常の実行はDBへ接続しない静的dry-runです。

```powershell
node supabase/scripts/seed-sample-discussions.mjs --dry-run
```

ローカルDBも読み取り、frames、既存データ、権限を確認する場合:

```powershell
$env:SUPABASE_LOCAL_URL = "http://127.0.0.1:54321"
$env:SUPABASE_SERVICE_ROLE_KEY = "<local service role key>"
node supabase/scripts/seed-sample-discussions.mjs --dry-run --check-db --period-code <period-code>
```

実際の書き込みは `--apply` を明示した場合だけ行います。Phase 3でローカルSupabaseに
対して実施し、本番・リモートURLには使用しないでください。

```powershell
node supabase/scripts/seed-sample-discussions.mjs --apply --period-code <period-code>
```

### 安全仕様

- 接続先ホストは `localhost`、`127.0.0.1`、`::1` だけを許可します。
- service roleキーは環境変数から読み、ブラウザやNext.jsクライアントへ渡しません。
- Supabase Admin APIでAuthユーザーを作成し、メールやSMSは送信しません。
- Authユーザーにパスワードを設定せず、100年間のBANを設定します。
- `app_metadata.sample_seed_namespace` と `app_metadata.sample_user_id` で再実行時の
  サンプルユーザーを識別します。
- サインイン履歴があるAuthユーザー、メタデータ不一致、予約メールの衝突はエラーにします。
- スレッドとコメントのUUIDは、seed名前空間とJSON内の論理IDから決定的に生成します。
- 同じUUIDに異なるデータがある場合は更新せず停止します。
- `votes` と `thread_reactions` は作成しません。
- RLSや既存マイグレーションを変更しません。

### 性別の変換

元のペルソナJSONは変更せず、DB登録時だけ次の変換を行います。

| JSON | `public.users.gender` |
|---|---|
| `ノンバイナリー` | `その他` |
| `回答しない` | `null` |

### 判断保留だった6スレッド

`discussion_q025_t1`〜`t3` と `discussion_q117_t1`〜`t3` は、本文が賛否保留を
明記していたため、レビューで既存stanceに合う条件付き意見へ最小限修正しました。
元の政策判断値3は変更しておらず、投票データにも転用しません。

### ハッシュ

SHA-256は、改行やJSONを正規化せず、リポジトリ上のファイル全体のバイト列に対して
計算します。JSONファイルは自身のハッシュを内部に持ちません。

更新順序は次のとおりです。

1. `sample_users.json`、`categories.json`、`questions.json`
2. 1のハッシュを記録した `sample_stances.json`
3. 1と2のハッシュを記録した `sample_discussions.json`
4. 最終値を記載する `validation_report.md`

## ローカル投入の手動手順

以下はリポジトリルートからPowerShellで順番に実行します。`status` の出力は変数へ受け、
秘密鍵を画面へ表示しません。

```powershell
# 1. Docker Desktopの起動後、ローカルSupabaseを起動
npx.cmd supabase start

# 2. ローカル接続情報を画面へ表示せず環境変数へ設定
$localStatus = npx.cmd supabase status -o env
$apiLine = $localStatus | Where-Object { $_ -match '^API_URL=' } | Select-Object -First 1
$serviceRoleLine = $localStatus | Where-Object { $_ -match '^SERVICE_ROLE_KEY=' } | Select-Object -First 1
if (-not $apiLine -or -not $serviceRoleLine) { throw 'ローカルSupabaseの接続情報を取得できません。' }
$env:SUPABASE_LOCAL_URL = (($apiLine -split '=', 2)[1]).Trim('"')
$env:SUPABASE_SERVICE_ROLE_KEY = (($serviceRoleLine -split '=', 2)[1]).Trim('"')
if (([uri]$env:SUPABASE_LOCAL_URL).Host -notin @('localhost', '127.0.0.1', '::1')) { throw 'ローカルURLではありません。' }
$env:SUPABASE_URL = $env:SUPABASE_LOCAL_URL

# 3. fresh DBの場合は既存seedで分類・質問・対象期間を作成
$periodCode = 'jphacks-2026-sample'
node supabase/scripts/seed-database.mjs --period-code $periodCode --create-period --period-start 2026-01-01 --period-end 2027-01-01 --period-status active

# 4. DB照合（読み取りのみ）
node supabase/scripts/seed-sample-discussions.mjs --dry-run --check-db --period-code $periodCode

# 5. サンプルデータを投入
node supabase/scripts/seed-sample-discussions.mjs --apply --period-code $periodCode

# 6. 登録件数を確認（Auth既存10、threads既存一致504、comments既存一致1512）
node supabase/scripts/seed-sample-discussions.mjs --dry-run --check-db --period-code $periodCode

# 7. 同じ処理を再実行して冪等性を確認（新規登録件数がすべて0）
node supabase/scripts/seed-sample-discussions.mjs --apply --period-code $periodCode
node supabase/scripts/seed-sample-discussions.mjs --dry-run --check-db --period-code $periodCode

# 8. セッション終了時に秘密情報を環境変数から除去
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
Remove-Item Env:SUPABASE_LOCAL_URL
Remove-Item Env:SUPABASE_URL
```

既存の対象期間・framesを使う場合は手順3を省略し、その `periods.code` を
`$periodCode` に設定します。本番URLや `--target remote` は使用しません。

