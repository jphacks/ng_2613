# アーキテクチャ

Rights のシステム構成と処理の流れ

- [1. アーキテクチャ図](#1-アーキテクチャ図)
- [2. 概要図（利用の流れ）](#2-概要図利用の流れ)
- [3. システム構成図](#3-システム構成図)
- [4. 処理の流れ（投票）](#4-処理の流れ投票)
- [5. データ構造](#5-データ構造)

## 1. アーキテクチャ図

![アーキテクチャ図](./architecture.svg)

## 2. 概要図（利用の流れ）

政治の話題を「ジャンル → 中分類 → トピック → 設問」の4段階で絞り込み、設問ごとに投票と意見交換を行う。

```mermaid
flowchart LR
    user(["利用者"])
    login["ログイン / 新規登録"]
    profile["会員情報<br/>ユーザー名・性別・生年月日"]
    home["ホーム<br/>ジャンル・中分類を選ぶ"]
    daily["今日のテーマ<br/>動画と設問"]
    topics["トピック一覧"]
    summary["設問一覧<br/>投票結果・代表意見"]
    discussion["設問詳細<br/>みんなの意見"]
    thread["スレッド<br/>コメント・なるほど"]
    vote["投票<br/>5段階"]
    dict["用語辞書<br/>難しい言葉の解説"]

    user --> login --> profile --> home
    home --> daily
    home --> topics --> summary --> discussion --> thread
    daily --> vote
    summary --> vote
    discussion --> vote
    thread -.-> dict
    topics -.-> dict
```

## 3. システム構成図

画面と API は Next.js の1つのアプリにまとめている。データと認証は Supabase に置き、ブラウザから Supabase へ直接は書き込まず、必ず Next.js の API を通す。

```mermaid
flowchart LR
    subgraph browser["ブラウザ"]
        ui["画面<br/>React・Tailwind CSS"]
        state["状態管理<br/>use-discussion-state"]
        glossary["用語辞書データ<br/>glossary.json を同梱"]
        ui --- state
        ui --- glossary
    end

    subgraph next["Next.js 16（App Router）"]
        proxy["proxy.ts<br/>ログイン状態の更新"]
        api["Route Handlers<br/>/api/*"]
        repo["lib/*<br/>入力チェック・DB 操作"]
        api --> repo
    end

    subgraph supabase["Supabase"]
        auth["Auth<br/>メール + パスワード"]
        db[("PostgreSQL<br/>RLS で本人のデータだけ操作可")]
        rpc["SQL 関数<br/>投票の集計・年代と性別の集計"]
        storage["Storage<br/>今日のテーマの動画"]
        db --- rpc
    end

    seed["シードスクリプト<br/>supabase/scripts"]

    state -- "fetch（JSON）" --> api
    browser -. "すべてのリクエスト" .-> proxy
    proxy -- "Cookie のセッションを更新" --> auth
    repo -- "@supabase/ssr" --> auth
    repo --> db
    repo --> rpc
    repo -- "動画の公開 URL" --> storage
    seed -- "分類・設問・用語の初期データ" --> db
```

### API 一覧

| 区分 | エンドポイント | 内容 |
| --- | --- | --- |
| 認証 | `POST /api/auth/sign-up`<br/>`POST /api/auth/sign-in`<br/>`POST /api/auth/sign-out`<br/>`GET /api/auth/session`<br/>`GET /auth/confirm` | 新規登録・ログイン・ログアウト・ログイン状態の確認・確認メールのリンクからのログイン |
| 会員情報 | `GET` / `PATCH /api/profile` | ユーザー名・性別・生年月日の取得と更新 |
| 分類 | `GET /api/catalog` | ジャンル・中分類・トピックの一覧 |
| トピック | `GET /api/topics/[topicId]` | トピックの設問と投票状況 |
| 今日のテーマ | `GET /api/daily-theme` | 当日の動画と設問 |
| 投票 | `PUT /api/frames/[frameId]/vote` | 5段階で投票（変更は7日ごと） |
| 投票の内訳 | `GET /api/frames/[frameId]/demographics` | 投票者の年代・性別の構成 |
| スレッド | `GET` / `POST /api/frames/[frameId]/threads`<br/>`GET /api/threads/[threadId]` | 意見の一覧・投稿・詳細 |
| コメント | `POST /api/threads/[threadId]/comments` | スレッドへのコメント |
| なるほど | `PUT /api/threads/[threadId]/reaction` | 意見への「なるほど」の付け外し |

## 4. 処理の流れ（投票）

投票のルール（受付期間・7日間は変更不可）は DB のトリガーでも検査しており、API を経由しない書き込みでも破れないようにしている。

```mermaid
sequenceDiagram
    actor U as 利用者
    participant B as ブラウザ
    participant A as Next.js API<br/>/api/frames/[frameId]/vote
    participant S as Supabase Auth
    participant D as PostgreSQL

    U->>B: 5段階のどれかを選ぶ
    B->>A: PUT { value: 1〜5 }
    A->>A: 送信元と入力値をチェック
    A->>S: Cookie のセッションからユーザーを確認
    S-->>A: ユーザー ID
    A->>D: votes に保存
    D->>D: トリガーで受付期間・7日ルールを検査（RLS で本人のみ）
    A->>D: get_frame_vote_counts で集計
    D-->>A: 5段階ごとの票数
    A-->>B: 最新の投票状況
    B-->>U: 円グラフと結果を更新
```

## 5. データ構造

主要なテーブルの関係を示す（作成日時などの共通の列は省略）。

```mermaid
erDiagram
    genres ||--o{ middle_topics : "含む"
    middle_topics ||--o{ topics : "含む"
    topics ||--o{ frames : "設問"
    periods ||--o{ frames : "実施期間"
    frames ||--o{ votes : "投票"
    frames ||--o{ threads : "意見"
    threads ||--o{ comments : "コメント"
    threads ||--o{ thread_reactions : "なるほど"
    users ||--o{ votes : ""
    users ||--o{ threads : ""
    users ||--o{ comments : ""
    users ||--o{ thread_reactions : ""
    videos ||--o| video_questions : "動画から作った設問"
    frames ||--o| video_questions : ""

    users {
        uuid id PK "Supabase Auth のユーザー"
        text username
        date birth_date "任意"
        text gender "任意"
    }
    genres {
        uuid id PK
        text name "例: お金"
    }
    middle_topics {
        uuid id PK
        uuid genre_id FK
        text name "例: 税金"
    }
    topics {
        uuid id PK
        uuid middle_topic_id FK
        text name "例: 消費税"
        text status "open / locked"
    }
    periods {
        uuid id PK
        text code
        date start_date
        date end_date
    }
    frames {
        uuid id PK
        uuid topic_id FK
        uuid period_id FK
        text question "例: 消費税率を引き上げるべきか"
    }
    votes {
        uuid id PK
        uuid frame_id FK
        uuid user_id FK
        int value "1 反対 〜 5 賛成"
    }
    threads {
        uuid id PK
        uuid frame_id FK
        uuid user_id FK
        text stance "agree / disagree"
        text title
        text body
    }
    comments {
        uuid id PK
        uuid thread_id FK
        uuid user_id FK
        text body
    }
    thread_reactions {
        uuid id PK
        uuid thread_id FK
        uuid user_id FK
    }
    videos {
        uuid id PK
        text title
        text url "Storage 上の動画"
        timestamptz published_at "1日1本"
    }
    video_questions {
        uuid video_id PK, FK
        uuid frame_id FK
    }
```
