import * as vscode from 'vscode';

let charCountItem: vscode.StatusBarItem;
let lineCountItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    lineCountItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    charCountItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);

    context.subscriptions.push(charCountItem, lineCountItem);

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
        vscode.window.onDidChangeTextEditorSelection(updateStatusBar),
        vscode.workspace.onDidChangeTextDocument(updateStatusBar),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('characterCount')) {
                updateStatusBar();
            }
        })
    );

    updateStatusBar();
}

function updateStatusBar(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        charCountItem.hide();
        lineCountItem.hide();
        return;
    }

    const doc = editor.document;
    if (doc.languageId !== 'plaintext' && doc.languageId !== 'markdown') {
        charCountItem.hide();
        lineCountItem.hide();
        return;
    }

    const selection = editor.selection;
    const hasSelection = !selection.isEmpty;
    const text = hasSelection
        ? doc.getText(selection)
        : doc.getText();

    const count = countChars(text);
    charCountItem.text = `${count.toFixed(1)}文字`;
    charCountItem.show();

    const config = vscode.workspace.getConfiguration('characterCount');
    const keys = ['charsPerLine1', 'charsPerLine2', 'charsPerLine3', 'charsPerLine4', 'charsPerLine5'] as const;
    const parts: string[] = [];

    for (const key of keys) {
        const cpl = config.get<number>(key, 0);
        if (cpl > 0) {
            let lines = Math.ceil(count / cpl);
            if (hasSelection) {
                lines += countNewlinesFollowedByChar(text);
            }
            parts.push(`${cpl}文字 ✕ ${lines}行`);
        }
    }

    if (parts.length > 0) {
        lineCountItem.text = parts.join('／');
        lineCountItem.show();
    } else {
        lineCountItem.hide();
    }
}

function countNewlinesFollowedByChar(text: string): number {
    let count = 0;
    const len = text.length;
    for (let i = 0; i < len; i++) {
        if (text[i] === '\n' && i + 1 < len && text[i + 1] !== '\n' && text[i + 1] !== '\r') {
            count++;
        } else if (text[i] === '\r') {
            const next = (i + 1 < len && text[i + 1] === '\n') ? i + 2 : i + 1;
            if (next < len && text[next] !== '\n' && text[next] !== '\r') {
                count++;
            }
        }
    }
    return count;
}

function countChars(text: string): number {
    let count = 0;
    for (const char of text) {
        const cp = char.codePointAt(0)!;
        if (isControlChar(cp)) {
            continue;
        }
        if (isFullWidth(cp)) {
            count += 1;
        } else {
            count += 0.5;
        }
    }
    return count;
}

function isControlChar(cp: number): boolean {
    if (cp === 0x20) return false; // space is counted
    if (cp <= 0x1F) return true;   // C0 controls (includes \t=0x09, \n=0x0A, \r=0x0D)
    if (cp === 0x7F) return true;  // DEL
    if (cp >= 0x80 && cp <= 0x9F) return true; // C1 controls
    return false;
}

/**
 * East_Asian_Width判定。W, F, A を全角、それ以外を半角とする。
 * Unicode 15.1 EastAsianWidth.txt に基づく主要範囲。
 */
function isFullWidth(cp: number): boolean {
    // Fullwidth (F)
    if (cp >= 0xFF01 && cp <= 0xFF60) return true;
    if (cp >= 0xFFE0 && cp <= 0xFFE6) return true;

    // Wide (W)
    if (cp >= 0x1100 && cp <= 0x115F) return true;   // Hangul Jamo
    if (cp >= 0x2329 && cp <= 0x232A) return true;   // LEFT/RIGHT-POINTING ANGLE BRACKET
    if (cp >= 0x2E80 && cp <= 0x303E) return true;   // CJK Radicals..CJK Symbols
    if (cp >= 0x3041 && cp <= 0x33BF) return true;   // Hiragana..CJK Compatibility
    if (cp >= 0x33C0 && cp <= 0x33FF) return true;   // CJK Compatibility
    if (cp >= 0x3400 && cp <= 0x4DBF) return true;   // CJK Unified Ideographs Ext A
    if (cp >= 0x4E00 && cp <= 0xA4CF) return true;   // CJK Unified Ideographs..Yi
    if (cp >= 0xA960 && cp <= 0xA97C) return true;   // Hangul Jamo Extended-A
    if (cp >= 0xAC00 && cp <= 0xD7A3) return true;   // Hangul Syllables
    if (cp >= 0xF900 && cp <= 0xFAFF) return true;   // CJK Compatibility Ideographs
    if (cp >= 0xFE10 && cp <= 0xFE19) return true;   // Vertical Forms
    if (cp >= 0xFE30 && cp <= 0xFE6B) return true;   // CJK Compatibility Forms
    if (cp >= 0x1F000 && cp <= 0x1F9FF) return true;  // Mahjong..Supplemental Symbols
    if (cp >= 0x1FA00 && cp <= 0x1FA6F) return true;  // Chess Symbols
    if (cp >= 0x1FA70 && cp <= 0x1FAFF) return true;  // Symbols and Pictographs Ext-A
    if (cp >= 0x20000 && cp <= 0x2FFFD) return true;  // CJK Unified Ideographs Ext B..
    if (cp >= 0x30000 && cp <= 0x3FFFD) return true;  // CJK Unified Ideographs Ext G..

    // Ambiguous (A) — treated as fullwidth per spec
    if (isAmbiguous(cp)) return true;

    return false;
}

function isAmbiguous(cp: number): boolean {
    // Major Ambiguous ranges from Unicode EastAsianWidth.txt
    if (cp === 0x00A1) return true; // ¡
    if (cp === 0x00A4) return true; // ¤
    if (cp >= 0x00A7 && cp <= 0x00A8) return true; // § ¨
    if (cp === 0x00AA) return true; // ª
    if (cp >= 0x00AD && cp <= 0x00AE) return true; // SHY ®
    if (cp >= 0x00B0 && cp <= 0x00B4) return true; // ° ± ² ³ ´
    if (cp >= 0x00B6 && cp <= 0x00BA) return true; // ¶ · ¸ ¹ º
    if (cp >= 0x00BC && cp <= 0x00BF) return true; // ¼ ½ ¾ ¿
    if (cp === 0x00C6) return true; // Æ
    if (cp === 0x00D0) return true; // Ð
    if (cp >= 0x00D7 && cp <= 0x00D8) return true; // × Ø
    if (cp >= 0x00DE && cp <= 0x00E1) return true; // Þ ß à á
    if (cp === 0x00E6) return true; // æ
    if (cp >= 0x00E8 && cp <= 0x00EA) return true; // è é ê
    if (cp >= 0x00EC && cp <= 0x00ED) return true; // ì í
    if (cp === 0x00F0) return true; // ð
    if (cp >= 0x00F2 && cp <= 0x00F3) return true; // ò ó
    if (cp >= 0x00F7 && cp <= 0x00FA) return true; // ÷ ø ù ú
    if (cp === 0x00FC) return true; // ü
    if (cp === 0x00FE) return true; // þ
    if (cp === 0x0101) return true; // ā
    if (cp === 0x0111) return true; // đ
    if (cp === 0x0113) return true; // ē
    if (cp === 0x011B) return true; // ě
    if (cp >= 0x0126 && cp <= 0x0127) return true; // Ħ ħ
    if (cp === 0x012B) return true; // ī
    if (cp >= 0x0131 && cp <= 0x0133) return true; // ı ĳ Ĳ — note: some are single
    if (cp === 0x0138) return true; // ĸ
    if (cp >= 0x013F && cp <= 0x0142) return true; // Ŀ ŀ Ł ł
    if (cp === 0x0144) return true; // ń
    if (cp >= 0x0148 && cp <= 0x014B) return true; // ň ŉ Ŋ ŋ
    if (cp === 0x014D) return true; // ō
    if (cp >= 0x0152 && cp <= 0x0153) return true; // Œ œ
    if (cp >= 0x0166 && cp <= 0x0167) return true; // Ŧ ŧ
    if (cp === 0x016B) return true; // ū
    if (cp === 0x01CE) return true; // ǎ
    if (cp === 0x01D0) return true; // ǐ
    if (cp === 0x01D2) return true; // ǒ
    if (cp === 0x01D4) return true; // ǔ
    if (cp === 0x01D6) return true; // ǖ
    if (cp === 0x01D8) return true; // ǘ
    if (cp === 0x01DA) return true; // ǚ
    if (cp === 0x01DC) return true; // ǜ
    if (cp === 0x0251) return true; // ɑ
    if (cp === 0x0261) return true; // ɡ
    if (cp === 0x02C4) return true; // ˄
    if (cp === 0x02C7) return true; // ˇ
    if (cp >= 0x02C9 && cp <= 0x02CB) return true; // ˉ ˊ ˋ
    if (cp === 0x02CD) return true; // ˍ
    if (cp === 0x02D0) return true; // ː
    if (cp >= 0x02D8 && cp <= 0x02DB) return true; // ˘ ˙ ˚ ˛
    if (cp === 0x02DD) return true; // ˝
    if (cp === 0x02DF) return true; // ˟
    if (cp >= 0x0300 && cp <= 0x036F) return true;  // Combining Diacritical Marks
    if (cp >= 0x0391 && cp <= 0x03A1) return true;  // Greek Α-Ρ
    if (cp >= 0x03A3 && cp <= 0x03A9) return true;  // Greek Σ-Ω
    if (cp >= 0x03B1 && cp <= 0x03C1) return true;  // Greek α-ρ
    if (cp >= 0x03C3 && cp <= 0x03C9) return true;  // Greek σ-ω
    if (cp >= 0x0401 && cp <= 0x044F) return true;  // Cyrillic Ё-я
    if (cp === 0x0451) return true; // ё
    if (cp >= 0x2010 && cp <= 0x2016) return true;  // Dashes, double vertical line
    if (cp >= 0x2018 && cp <= 0x2019) return true;  // ' '
    if (cp >= 0x201C && cp <= 0x201D) return true;  // " "
    if (cp >= 0x2020 && cp <= 0x2022) return true;  // † ‡ •
    if (cp >= 0x2024 && cp <= 0x2027) return true;  // ‥ … ‧
    if (cp === 0x2030) return true; // ‰
    if (cp >= 0x2032 && cp <= 0x2033) return true;  // ′ ″
    if (cp === 0x2035) return true; // ‵
    if (cp === 0x203B) return true; // ※
    if (cp === 0x203E) return true; // ‾
    if (cp === 0x2074) return true; // ⁴
    if (cp === 0x207F) return true; // ⁿ
    if (cp >= 0x2081 && cp <= 0x2084) return true;  // ₁₂₃₄
    if (cp === 0x20AC) return true; // €
    if (cp >= 0x2103 && cp <= 0x2105) return true;  // ℃ ℄ ℅
    if (cp === 0x2109) return true; // ℉
    if (cp === 0x2113) return true; // ℓ
    if (cp === 0x2116) return true; // №
    if (cp >= 0x2121 && cp <= 0x2122) return true;  // ℡ ™
    if (cp === 0x2126) return true; // Ω
    if (cp === 0x212B) return true; // Å
    if (cp >= 0x2153 && cp <= 0x2154) return true;  // ⅓ ⅔
    if (cp >= 0x215B && cp <= 0x215E) return true;  // ⅛ ⅜ ⅝ ⅞
    if (cp >= 0x2160 && cp <= 0x216B) return true;  // Ⅰ-Ⅻ
    if (cp >= 0x2170 && cp <= 0x2179) return true;  // ⅰ-ⅹ
    if (cp === 0x2189) return true; // ↉
    if (cp >= 0x2190 && cp <= 0x2199) return true;  // ← ↑ → ↓ etc.
    if (cp >= 0x21B8 && cp <= 0x21B9) return true;  // ↸ ↹
    if (cp === 0x21D2) return true; // ⇒
    if (cp === 0x21D4) return true; // ⇔
    if (cp === 0x21E7) return true; // ⇧
    if (cp === 0x2200) return true; // ∀
    if (cp >= 0x2202 && cp <= 0x2203) return true;  // ∂ ∃
    if (cp >= 0x2207 && cp <= 0x2208) return true;  // ∇ ∈
    if (cp === 0x220B) return true; // ∋
    if (cp === 0x220F) return true; // ∏
    if (cp === 0x2211) return true; // ∑
    if (cp === 0x2215) return true; // ∕
    if (cp === 0x221A) return true; // √
    if (cp >= 0x221D && cp <= 0x2220) return true;  // ∝ ∞ ∟ ∠
    if (cp === 0x2223) return true; // ∣
    if (cp === 0x2225) return true; // ∥
    if (cp >= 0x2227 && cp <= 0x222C) return true;  // ∧∨∩∪∫∬
    if (cp === 0x222E) return true; // ∮
    if (cp >= 0x2234 && cp <= 0x2237) return true;  // ∴∵∶∷
    if (cp >= 0x223C && cp <= 0x223D) return true;  // ∼ ∽
    if (cp === 0x2248) return true; // ≈
    if (cp === 0x224C) return true; // ≌
    if (cp === 0x2252) return true; // ≒
    if (cp >= 0x2260 && cp <= 0x2261) return true;  // ≠ ≡
    if (cp >= 0x2264 && cp <= 0x2267) return true;  // ≤ ≥ ≦ ≧
    if (cp >= 0x226A && cp <= 0x226B) return true;  // ≪ ≫
    if (cp >= 0x226E && cp <= 0x226F) return true;  // ≮ ≯
    if (cp >= 0x2282 && cp <= 0x2283) return true;  // ⊂ ⊃
    if (cp >= 0x2286 && cp <= 0x2287) return true;  // ⊆ ⊇
    if (cp === 0x2295) return true; // ⊕
    if (cp === 0x2299) return true; // ⊙
    if (cp === 0x22A5) return true; // ⊥
    if (cp === 0x22BF) return true; // ⊿
    if (cp >= 0x2312 && cp <= 0x2312) return true;  // ⌒
    if (cp >= 0x2460 && cp <= 0x24E9) return true;  // ①-ⓩ Enclosed Alphanumerics
    if (cp >= 0x24EB && cp <= 0x254B) return true;  // ⓫..Box Drawing
    if (cp >= 0x2550 && cp <= 0x2573) return true;  // Box Drawing
    if (cp >= 0x2580 && cp <= 0x258F) return true;  // Block Elements
    if (cp >= 0x2592 && cp <= 0x2595) return true;  // Shade chars
    if (cp >= 0x25A0 && cp <= 0x25A1) return true;  // ■ □
    if (cp >= 0x25A3 && cp <= 0x25A9) return true;  // ▣-▩
    if (cp >= 0x25B2 && cp <= 0x25B3) return true;  // ▲ △
    if (cp >= 0x25B6 && cp <= 0x25B7) return true;  // ▶ ▷
    if (cp >= 0x25BC && cp <= 0x25BD) return true;  // ▼ ▽
    if (cp >= 0x25C0 && cp <= 0x25C1) return true;  // ◀ ◁
    if (cp >= 0x25C6 && cp <= 0x25C8) return true;  // ◆ ◇ ◈
    if (cp === 0x25CB) return true; // ○
    if (cp >= 0x25CE && cp <= 0x25D1) return true;  // ◎ ● ◐ ◑
    if (cp >= 0x25E2 && cp <= 0x25E5) return true;  // ◢ ◣ ◤ ◥
    if (cp === 0x25EF) return true; // ◯
    if (cp >= 0x2605 && cp <= 0x2606) return true;  // ★ ☆
    if (cp === 0x2609) return true; // ☉
    if (cp >= 0x260E && cp <= 0x260F) return true;  // ☎ ☏
    if (cp >= 0x2614 && cp <= 0x2615) return true;  // ☔ ☕
    if (cp === 0x261C) return true; // ☜
    if (cp === 0x261E) return true; // ☞
    if (cp === 0x2640) return true; // ♀
    if (cp === 0x2642) return true; // ♂
    if (cp >= 0x2660 && cp <= 0x2661) return true;  // ♠ ♡
    if (cp >= 0x2663 && cp <= 0x2665) return true;  // ♣ ♤ ♥
    if (cp >= 0x2667 && cp <= 0x266A) return true;  // ♧ ♨ ♩ ♪
    if (cp >= 0x266C && cp <= 0x266D) return true;  // ♬ ♭
    if (cp === 0x266F) return true; // ♯
    if (cp >= 0x269E && cp <= 0x269F) return true;  // ⚞ ⚟
    if (cp >= 0x26BE && cp <= 0x26BF) return true;  // ⚾ ⚿
    if (cp >= 0x26C4 && cp <= 0x26CD) return true;  // ⛄-⛍
    if (cp === 0x26CF) return true;
    if (cp >= 0x26D0 && cp <= 0x26E1) return true;
    if (cp === 0x26E3) return true;
    if (cp >= 0x26E8 && cp <= 0x26FF) return true;
    if (cp === 0x273D) return true; // ✽
    if (cp === 0x2757) return true; // ❗
    if (cp >= 0x2776 && cp <= 0x277F) return true;  // ❶-❿
    if (cp >= 0xE000 && cp <= 0xF8FF) return true;  // Private Use Area
    if (cp >= 0xFE00 && cp <= 0xFE0F) return true;  // Variation Selectors
    if (cp >= 0xFFFD && cp <= 0xFFFD) return true;  // REPLACEMENT CHARACTER
    if (cp >= 0xF0000 && cp <= 0xFFFFD) return true; // Supplementary Private Use Area-A
    if (cp >= 0x100000 && cp <= 0x10FFFD) return true; // Supplementary Private Use Area-B

    return false;
}

export function deactivate() {}
