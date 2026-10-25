# フロントエンドの編集ガイド

画面単位で分担できるように、表示・スタイル・共通部品・状態管理を分離しています。

## 画面の担当ファイル

| 画面 | Reactコンポーネント | スタイル |
| --- | --- | --- |
| ホーム（大トピック） | `screens/home-screen.tsx` | `screens/home-screen.css` |
| 中トピック | `screens/topics-screen.tsx` | `screens/topics-screen.css` |
| 小トピックまとめ・グラフ | `screens/summary-screen.tsx` | `screens/summary-screen.css` |
| 小トピック議論 | `screens/discussion-screen.tsx` | `screens/discussion-screen.css` |
| スレッド | `screens/thread-screen.tsx` | `screens/thread-screen.css` |
| 動画 | `screens/video-screen.tsx` | `screens/video-screen.css` |
| 投票 | `screens/vote-screen.tsx` | `screens/vote-screen.css` |
| ログイン | `screens/login-screen.tsx` | `screens/login-screen.css` + 共通フォームCSS |
| 新規登録 | `screens/register-screen.tsx` | `components/account-form.css`（共通） |
| 会員情報変更 | `screens/profile-screen.tsx` | `screens/profile-screen.css` + 共通フォームCSS |
| ハンバーガーメニュー | `components/app-menu.tsx` | `components/app-menu.css` |

## 共通部分

- `discussion-app.tsx`：各画面の組み立てと表示の切り替え。
- `components/app-header.tsx`：ヘッダー・検索・パンくず。
- `components/account-fields.tsx`：ログイン・登録・会員情報変更で共用する入力欄。送信・レイアウト・ボタンは各画面で管理します。
- `hooks/use-discussion-state.ts`：画面をまたいで保持するデモ状態、ハッシュURLとの同期、遷移、会員フォームの送信処理。
- `lib/demo-data.ts`：画面名の型、トピック画像、投票ラベルと色。
- `globals.css`：全画面の基本スタイル、色、共通ボタン、動画の表示枠。
- `layout.tsx`・`page.tsx`：Next.jsの入口。画面別コンポーネントは `screens/` に置きます。

## 編集時のルール

1. 画面の変更は担当する `screens/*-screen.tsx` と対応するCSSから行います。
2. 各画面の `Props` は必要な状態と操作のみを受け取ります。型は `DiscussionState` から取得します。
3. 複数画面に影響するフォーム・ヘッダー・共通CSS・状態管理を変える場合は、担当者間で調整してください。
4. クライアント境界は `discussion-app.tsx` にあります。その配下の画面ファイルに一律で `use client` を付ける必要はありません。
5. URLは従来どおり `/#home`、`/#summary`、`/#vote` などの形式です。Next.jsの個別ルートへは変更していません。
6. 状態はメモリー内のデモです。画面を切り替えても保持されますが、再読み込みで初期化されます。

## 確認

`app/` で `npx tsc --noEmit` と `npm run lint` を実行します。画面変更時にはブラウザーで見た目と操作も確認します。明確な指示なしに本番ビルドや依存関係の追加は行いません。
