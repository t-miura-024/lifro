# テーブル定義

## users - ユーザー
| カラム名      | データ型       | 説明                  |
|---------------|----------------|-----------------------|
| id            | INTEGER        | ユーザーID (Primary Key, Auto Increment) |
| email         | VARCHAR        | メールアドレス (Unique) |
| created_at    | TIMESTAMP      | 作成日時              |
| updated_at    | TIMESTAMP      | 更新日時              |

## sets - セット
| カラム名      | データ型       | 説明                  |
|---------------|----------------|-----------------------|
| id            | INTEGER        | セットID (Primary Key, Auto Increment) |
| exercises_id  | INTEGER        | 種目ID (Foreign Key) |
| weight        | FLOAT          | 重量                  |
| reps          | INTEGER        | レップ数              |
| date          | DATETIME       | 日時                  |
| order         | INTEGER        | 並び順                  |
| created_at    | TIMESTAMP      | 作成日時              |
| updated_at    | TIMESTAMP      | 更新日時              |

## exercises - 種目
| カラム名      | データ型       | 説明                  |
|---------------|----------------|-----------------------|
| id            | INTEGER        | エクササイズID (Primary Key, Auto Increment) |
| user_id       | INTEGER        | ユーザーID (Foreign Key) |
| name          | VARCHAR        | 種目名                |
| created_at    | TIMESTAMP      | 作成日時              |
| updated_at    | TIMESTAMP      | 更新日時              |

## routines - ルーティン
| カラム名      | データ型       | 説明                  |
|---------------|----------------|-----------------------|
| id            | INTEGER        | ルーティンID (Primary Key, Auto Increment) |
| user_id       | INTEGER        | ユーザーID (Foreign Key) |
| name          | VARCHAR        | ルーティン名          |
| created_at    | TIMESTAMP      | 作成日時              |
| updated_at    | TIMESTAMP      | 更新日時              |

## routine_exercises テーブル
| カラム名      | データ型       | 説明                  |
|---------------|----------------|-----------------------|
| id            | INTEGER        | ルーティンエクササイズID (Primary Key, Auto Increment) |
| routine_id    | INTEGER        | ルーティンID (Foreign Key) |
| exercise_id   | INTEGER        | 種目ID (Foreign Key) |
| weight        | FLOAT          | 重量                  |
| reps          | INTEGER        | レップ数              |
| order         | INTEGER        | 順番                  |
| created_at    | TIMESTAMP      | 作成日時              |
| updated_at    | TIMESTAMP      | 更新日時              |
