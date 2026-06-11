# Context — OnTap B1 CEFR

## Tổng quan

Web ôn tập thi B1 CEFR, static HTML/CSS/JS thuần, không framework.
Repo: `github.com/quangtin137/OnTap_B1`
Deploy: Vercel (pending)

---

## Blueprint đề thi (65 câu)

| Section | Tên | Số câu | Pool hiện có |
|---------|-----|--------|-------------|
| A | Vocabulary & Grammar (MCQ) | 10 | 100 |
| B | Signs (MCQ + ảnh) | 5 | 40 |
| C | Reading Passage (MCQ) | 5 | 4 passages |
| D | Cloze Text (MCQ) | 10 | 4 texts |
| E | Sentence Transformation (text) | 5 | 29 |
| F | Listening Fill in Blanks (text) | 7 | 3 texts |
| G | Listening Choose ABC (MCQ) | 10 | 4 texts |
| H | Listening True/False | 10 | 4 texts |

> Blueprint trong `app.js`: A=10, B=5, C=1, D=1, E=5, F=1, G=2, H=2

---

## Kiến trúc file

```
OnTap_B1/
├── index.html              # Shell UI
├── app.js                  # Engine: buildExam, render, submit, score
├── styles.css              # Glassmorphism design
├── vercel.json             # {"rewrites": [{"source":"/(.*)", "destination":"/"}]}
├── data/
│   ├── exam-data.json      # Full pool dataset (build output)
│   └── build-report.json   # Pool counts từ lần build cuối
├── images/                 # 40 ảnh biển báo Section B
└── scripts/
    └── build-dataset.mjs   # Parser markdown → exam-data.json
```

---

## Pipeline build data

```
Markdown nguồn
  d:\Tin\B1 - CEFR\TargetMDDirectory\File_on_tap_B1_13.06.2026\File_on_tap_B1_13.06.2026.md
      ↓
  node scripts/build-dataset.mjs
      ↓
  data/exam-data.json
```

Chạy build: `node scripts/build-dataset.mjs` (dùng forward slash trên Windows)

---

## Những gì đã làm

### Fix đề thiếu câu (63–64 thay vì 65)

- **Root cause:** `parseSectionG()` chỉ detect câu hỏi kết thúc `?`, bỏ qua câu fill-in-blank kết thúc `.`
- **Fix:** Detect thêm: nếu dòng tiếp theo chứa cả `B.` và `C.` → cũng là câu hỏi
- **Kết quả:** G_TEXT_3: 3→5 câu, G_TEXT_4: 4→5 câu

### Fix blank `______` bị lạm dụng

- **Root cause:** Rule `\*{4,}` trong `stripMd()` convert split-bold DOCX (`Go**** ****play`) thành `[[BLANK]]`
- **Fix:** Xóa rule `\*{4,}` khỏi `stripMd()`; thêm rule `\)\*+` → `") "` để xử lý cloze `(1)****word`
- **Kết quả:** G options sạch, F title đúng, D cloze không còn blank thừa

### Fix passage bị rút gọn thành 1 dòng

- **Root cause:** `passageLines.filter(Boolean).join(" ")` gộp hết thành 1 dòng
- **Fix:** Thêm helper `buildPassageText(rawLines)` — gom paragraph bằng blank line, join bằng `\n`
- **Áp dụng:** `parseSectionD()` và `parseSectionF()`

### Fix C passages thiếu nội dung (~500 chars thay vì ~3500)

- **Root cause:** JSON chứa bản tóm tắt ngắn, không phải full passage
- **Fix:** Patch thủ công 4 passages (C_TEXT4, C_TEXT6, C_TEXT8, C_TEXT25) từ markdown gốc
- **Lưu ý:** C section không rebuild tự động từ script (parser C quá phức tạp)

### Fix F title sai

- **Root cause:** `parseSectionF()` lấy dòng `##` subtitle thay vì dòng `###` TEXT
- **Fix:** Dùng dòng `###` đầu tiên của passage block làm title

### CSS cho blanks

- `.blank` — inline blank `______` có border-bottom màu accent (Section A)
- `.cloze-blank` — box `(N)` có border accent (Section D, F)
- `.passage` — `white-space: pre-line` để giữ xuống dòng từ `\n`

---

## Vấn đề đã biết còn lại

- G_TEXT_47 Q4 và G_TEXT_48 Q2: câu hỏi hiển thị thiếu blank indicator (acceptlable cho MCQ)
- C passages: không rebuild tự động — nếu thêm bài mới cần patch thủ công
- Section E chấm điểm dạng text exact-match (đã normalize lowercase) — có thể bỏ sót đáp án đúng viết khác cách
- "Thụt dòng" (text-indent) cho passage chưa làm — hiện chỉ có xuống dòng, chưa indent đầu đoạn

---

## Deploy

1. Push lên `github.com/quangtin137/OnTap_B1` ✅ (commit `e21b459`)
2. Import vào vercel.com:
   - Framework Preset: **Other**
   - Build Command: *(trống)*
   - Output Directory: *(trống)*
3. URL Vercel: *(chờ confirm)*
