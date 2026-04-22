# Character Count（全角半角対応）

Cursor / VS Code 用の拡張機能です。`.txt` および `.md` ファイルの文字数・行数をステータスバーに表示します。

全角文字を **1文字**、半角文字を **0.5文字** としてカウントします。

## 機能

### 文字数カウント

- テキストファイルを開くと、ファイル全体の文字数をステータスバーに表示します
- 文字を選択すると、選択範囲の文字数を表示します
- 表示例: `5.5文字` `18.0文字`

#### カウントのルール

| 文字の種類 | カウント |
|-----------|---------|
| 全角文字 | 1文字 |
| 半角文字 | 0.5文字 |
| スペース（半角） | 0.5文字 |
| スペース（全角） | 1文字 |
| 改行・タブ | カウントしない |
| その他の制御文字 | カウントしない |

全角・半角の判定には Unicode の East_Asian_Width プロパティを使用しています。Ambiguous カテゴリは全角として扱います。

### 行数表示

設定メニューで「1行あたりの文字数（cpl）」を指定すると、原稿用紙換算の行数を計算して表示します。

- 最大5つまで設定可能
- 表示例: `20文字 ✕ 3行`
- 複数設定時は「／」で区切って表示: `20文字 ✕ 3行／40文字 ✕ 2行`

#### 行数のカウントルール（v1.1.0〜）

改行で論理行に分割し、**行ごとに `ceil(文字数 / cpl)` を合計** します。空行も 1 行として扱い、末尾の改行で生まれる空行は数えません。

cpl=20 の場合の例：

| 入力 | 行数 |
|-----|------|
| 全角20文字（改行なし） | 1 |
| 全角21文字（改行なし） | 2 |
| 全角20文字＋改行＋全角1文字 | 2 |
| 全角1文字＋改行＋全角1文字 | 2 |
| 全角1文字＋改行＋全角1文字＋改行＋全角1文字 | 3 |

これにより、「短い行で改行しても、ちゃんと改行ぶんの行数が加算される」挙動になります。

## 設定

Cursor の設定メニュー（`Cmd+,` または `Ctrl+,`）で `Character Count` を検索してください。

| 設定項目 | 説明 | 既定値 |
|---------|------|-------|
| `characterCount.charsPerLine1` | 1行あたりの文字数① | 0（無効） |
| `characterCount.charsPerLine2` | 1行あたりの文字数② | 0（無効） |
| `characterCount.charsPerLine3` | 1行あたりの文字数③ | 0（無効） |
| `characterCount.charsPerLine4` | 1行あたりの文字数④ | 0（無効） |
| `characterCount.charsPerLine5` | 1行あたりの文字数⑤ | 0（無効） |

値を 0 にすると、その項目は無効になります。すべて 0 の場合、行数表示は行われません。

## インストール

### VSIX ファイルから

1. [リポジトリ](https://github.com/moriyakeiichi/cursor-character-count) から `.vsix` ファイルをダウンロード
2. Cursor のコマンドパレット（`Cmd+Shift+P`）を開く
3. `Extensions: Install from VSIX...` を選択
4. ダウンロードした `.vsix` ファイルを指定
5. `Developer: Reload Window` でリロード

### ソースからビルド

```bash
git clone https://github.com/moriyakeiichi/cursor-character-count.git
cd cursor-character-count
npm install
npm run compile
npx @vscode/vsce package --allow-missing-repository
```

## 対応ファイル

- プレーンテキスト（`.txt`）
- Markdown（`.md`）

## 変更履歴

### 1.1.0

- 行数計算ロジックを修正。各論理行ごとに `ceil(文字数 / cpl)` を合計する方式に変更し、短い行で改行しても行数が正しく加算されるようにしました。
- 選択範囲の有無にかかわらず同じロジックで計算するようにしました。

### 1.0.0

- 初回リリース。

## 開発環境

- [Cursor](https://www.cursor.com/) Pro
- Claude Opus 4.6（Anthropic）

## ライセンス

[MIT](LICENSE)
