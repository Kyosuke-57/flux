// 業界別テンプレート定義
// 会議議事録の業種特化テンプレートを提供する

export interface TemplateData {
  /** テンプレートの一意識別子（kebab-case） */
  id: string;
  /** テンプレートの表示名 */
  name: string;
  /** 業界カテゴリ */
  category: string;
  /** テンプレート本文（Markdown 形式） */
  content: string;
}

// ─── 全テンプレート定義 ─────────────────────────────────────

const ALL_TEMPLATES: TemplateData[] = [
  // ── IT / Engineering ────────────────────────────────────
  {
    id: "sprint-retro",
    name: "スプリントレトロスペクティブ",
    category: "IT/Engineering",
    content: `## スプリント情報
- **スプリント期間**: YYYY/MM/DD 〜 YYYY/MM/DD
- **スクラムマスター**:
- **参加者**:

## Keep（続けること）
-

## Problem（問題点）
-

## Try（試すこと）
-

## Action Items
- [ ] 

## 次回スプリントの目標
- `,
  },
  {
    id: "technical-design-review",
    name: "技術設計レビュー",
    category: "IT/Engineering",
    content: `## レビュー対象
- **機能名**:
- **設計者**:
- **レビュアー**:

## 背景・目的
-

## アーキテクチャ概要
-

## 技術スタック
-

## 検討した代替案
-

## リスク・懸念点
-

## 決定事項
-

## Action Items
- [ ] 

## 保留事項
- `,
  },

  // ── Healthcare ──────────────────────────────────────────
  {
    id: "patient-case-conference",
    name: "患者症例カンファレンス",
    category: "Healthcare",
    content: `## 患者基本情報
- **患者ID**:
- **年齢/性別**:
- **主訴**:

## 現病歴
-

## 検査結果
-

## 診断
-

## 治療方針
-

## 多職種連携
- **担当医**:
- **看護師**:
- **薬剤師**:
- **リハビリ**:
- **栄養士**:

## 次回カンファレンス予定
- **日時**:
- **議題**: `,
  },

  // ── Education ───────────────────────────────────────────
  {
    id: "faculty-meeting",
    name: "職員会議",
    category: "Education",
    content: `## 開催情報
- **日時**: YYYY/MM/DD HH:MM
- **場所**:
- **司会**:
- **書記**:
- **出席者**:

## 前回議事録確認
-

## 報告事項
1. 

## 協議事項
1. 

## 決定事項
-

## 連絡事項
-

## 次回開催
- **日時**:
- **議題**: `,
  },

  // ── Business ────────────────────────────────────────────
  {
    id: "weekly-sales-meeting",
    name: "週次営業会議",
    category: "Business",
    content: `## 開催情報
- **日時**: YYYY/MM/DD HH:MM
- **出席者**:

## 先週の振り返り
- **売上実績**:
- **目標達成率**:
- **主な成約案件**:

## パイプライン確認
| 案件名 | 金額 | 確度 | 次回アクション |
|--------|------|------|---------------|
|        |      |      |               |

## 課題・ボトルネック
-

## 今週の重点施策
1. 

## マーケット情報
-

## Action Items
- [ ] `,
  },
  {
    id: "board-meeting",
    name: "取締役会",
    category: "Business",
    content: `## 開催情報
- **日時**: YYYY/MM/DD HH:MM
- **場所**:
- **出席取締役**:
- **欠席取締役**:
- **議長**:
- **書記**:

## 前回議事録承認
-

## 報告事項
### 1. 業績報告
-

### 2. 各部門報告
-

## 決議事項
### 決議 1: 
- **提案者**:
- **内容**:
- **決議結果**: 可決 / 否決 / 継続審議

## 審議事項
1. 

## 次回開催予定
- **日時**: `,
  },
  {
    id: "one-on-one",
    name: "1on1 ミーティング",
    category: "Business",
    content: `## 基本情報
- **日時**: YYYY/MM/DD HH:MM
- **メンバー**:
- **マネージャー**:

## 近況・雑談
-

## 業務の進捗
- **今週の成果**:
- **課題・障害**:

## キャリア・成長
- **中長期的な目標**:
- **身につけたいスキル**:

## フィードバック
- **メンバー → マネージャー**:
- **マネージャー → メンバー**:

## アクションアイテム
- [ ] 

## 次回1on1
- **日時**: `,
  },

  // ── Legal ───────────────────────────────────────────────
  {
    id: "case-review",
    name: "案件レビュー",
    category: "Legal",
    content: `## 案件情報
- **案件番号**:
- **依頼者**:
- **担当弁護士**:
- **相手方**:

## 案件概要
-

## 法的論点
1. 

## 関連法令・判例
-

## 訴訟状況
- **裁判所**:
- **期日**:
- **進行状況**:

## 戦略・方針
-

## 次回アクション
- [ ] 

## 次回レビュー予定
- **日時**: `,
  },

  // ── Construction ────────────────────────────────────────
  {
    id: "site-progress-meeting",
    name: "現場進捗会議",
    category: "Construction",
    content: `## 工事概要
- **工事名**:
- **現場所在地**:
- **工期**: YYYY/MM/DD 〜 YYYY/MM/DD

## 出席者
- **元請**:
- **下請**:
- **監理者**:
- **発注者**:

## 進捗状況
- **全体進捗率**:
- **今週の作業実績**:
-

## 工程遅延・問題点
-

## 安全報告
- **無事故日数**:
- **ヒヤリハット報告**:
-

## 品質管理
-

## 来週の作業予定
-

## Action Items
- [ ] `,
  },

  // ── Creative ────────────────────────────────────────────
  {
    id: "brainstorming-session",
    name: "ブレインストーミング",
    category: "Creative",
    content: `## セッション情報
- **日時**: YYYY/MM/DD HH:MM
- **ファシリテーター**:
- **参加者**:

## テーマ
-

## 背景・目的
-

## アイデア一覧
1. 
2. 
3. 
4. 
5. 

## 分類・整理
### 即実行可能
-

### 要検討
-

### 将来検討
-

## 次のステップ
- [ ] 

## 次回セッション
- **日時**: `,
  },
];

// ─── 公開ヘルパー関数 ──────────────────────────────────────

/**
 * 指定された業界のテンプレート一覧を取得する
 * @param industry - 業界名（例: "IT/Engineering", "Business"）
 * @returns 該当するテンプレートの配列
 */
export function getTemplatesByIndustry(industry: string): TemplateData[] {
  return ALL_TEMPLATES.filter(
    (t) => t.category.toLowerCase() === industry.toLowerCase()
  );
}

/**
 * 全テンプレートが属する業界の一覧を取得する（重複排除）
 * @returns 業界名の配列
 */
export function getAllIndustries(): string[] {
  const industries = new Set(ALL_TEMPLATES.map((t) => t.category));
  return [...industries];
}

/**
 * ID で特定のテンプレートを取得する
 * @param id - テンプレート ID（kebab-case）
 * @returns テンプレートデータ、見つからない場合は undefined
 */
export function getTemplateById(id: string): TemplateData | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

/**
 * 全テンプレートを取得する
 * @returns 全テンプレートの配列
 */
export function getAllTemplates(): TemplateData[] {
  return ALL_TEMPLATES;
}

export const INDUSTRY_TEMPLATES = ALL_TEMPLATES;
