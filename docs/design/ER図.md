# ER図

```mermaid
erDiagram
    USERS {
        INTEGER id PK "ユーザーID"
        VARCHAR email "メールアドレス"
        TIMESTAMP created_at "作成日時"
        TIMESTAMP updated_at "更新日時"
    }

    SETS {
        INTEGER id PK "セットID"
        INTEGER exercise_id FK "種目ID"
        INTEGER user_id FK "ユーザーID"
        FLOAT weight "重量"
        INTEGER reps "レップ数"
        DATE date "トレーニング日"
        INTEGER sort_index "並び順"
        TIMESTAMP created_at "作成日時"
        TIMESTAMP updated_at "更新日時"
    }

    EXERCISES {
        INTEGER id PK "エクササイズID"
        INTEGER user_id FK "ユーザーID"
        VARCHAR name "種目名"
        TIMESTAMP created_at "作成日時"
        TIMESTAMP updated_at "更新日時"
    }

    TRAINING_MEMOS {
        INTEGER id PK "メモID"
        INTEGER user_id FK "ユーザーID"
        DATE date "トレーニング日"
        TEXT content "メモ内容"
        TIMESTAMP created_at "作成日時"
        TIMESTAMP updated_at "更新日時"
    }

    USERS ||--o{ EXERCISES : ""
    USERS ||--o{ SETS : ""
    USERS ||--o{ TRAINING_MEMOS : ""
    EXERCISES ||--o{ SETS : ""
```
