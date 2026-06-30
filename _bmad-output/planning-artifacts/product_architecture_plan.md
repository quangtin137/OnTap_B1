# BMad Product & Architecture Plan: OnTap_B1 (MVP Data Pipeline)

## 1. Product / Domain Summary

**Bối cảnh & Mục tiêu:**
OnTap_B1 là một Web tĩnh luyện thi B1 CEFR thuần HTML/CSS/JS. Mục tiêu MVP hiện tại là xây dựng một **Data Pipeline** vững chắc để chuyển đổi nguồn tài liệu thô (DOCX) thành một Static JSON Dataset `exam-data.json`. Trang web sẽ sử dụng JSON này để sinh ngẫu nhiên các đề thi thử (GeneratedMockExam) và chấm điểm trực tiếp, giúp thí sinh ôn tập hiệu quả hơn. MVP kiên quyết **không** tích hợp Backend, Database hay tính năng Login/Register.

### Phân tích Domain Entities
- **DatasetVersion (BookVersion):** Phiên bản gốc của dữ liệu (vd: `hutech-b1-review-09-2025`). Đảm bảo khả năng thay thế hoặc hỗ trợ nhiều bộ sách theo từng năm.
- **Section / Question / QuestionGroup:** Các phần thi A-K theo cấu trúc CEFR. `QuestionGroup` quản lý các câu hỏi thuộc chung một bài đọc/nghe.
- **StudyMode:** Chế độ ôn tập của user (`free_candidate`, `two_week`, `four_week`). Xác định phạm vi kiến thức đầu vào.
- **StudyProfile:** Config cá nhân lưu trữ phạm vi ôn tập cụ thể của 1 user dựa trên `StudyMode`. Không lưu bản sao câu hỏi.
- **ExamBlueprint:** Cấu trúc ma trận đề thi (số lượng câu hỏi, loại câu cho từng Section).
- **ExamSession (Roadmap):** Đại diện cho một ca thi thực tế (vd: Sáng 13/06). Những người thi cùng ca sẽ có cùng một đề. Khác với `StudyMode` (là phạm vi ôn).
- **GeneratedMockExam:** Đề thi thử sinh ngẫu nhiên trên web dựa trên `StudyProfile` và `ExamBlueprint`. Khác hoàn toàn với đề thi chính thức của `ExamSession`.
- **MediaAsset:** Quản lý tài nguyên media. Đặc biệt, ảnh Signs và Audio cần chuẩn hóa filename trước khi map vào file JSON.

---

## 2. Đề xuất JSON Schema cho Section A-K

```json
// A. Vocabulary & Grammar MCQ
{
  "id": "A_001",
  "section": "A",
  "type": "mcq",
  "questionNumber": 1,
  "question": "He has ______ finished his homework.",
  "options": { "A": "just", "B": "yet", "C": "ever", "D": "never" },
  "answer": "A",
  "tags": [],
  "source": "hutech-b1-review-09-2025/p12"
}

// B. Signs MCQ with image
{
  "id": "B_001",
  "section": "B",
  "type": "signs_mcq",
  "questionNumber": 1,
  "imagePath": "images/signs/sign_001.png",
  "options": { "A": "No parking", "B": "Stop", "C": "Yield", "D": "Speed limit" },
  "answer": "B",
  "sourceImageOriginalName": "image_007_spd2m_image1.png"
}

// C. Reading Passage MCQ group
{
  "id": "C_TEXT_001",
  "section": "C",
  "type": "reading_group",
  "title": "Global Warming",
  "passage": "Global warming is...",
  "questions": [
    { "id": "C_001", "questionNumber": 1, "question": "What is the main idea?", "options": {"A": "..."}, "answer": "A" }
  ]
}

// D. Cloze Text MCQ group
{
  "id": "D_TEXT_001",
  "section": "D",
  "type": "cloze_group",
  "title": "A Day in London",
  "clozeText": "It was a (1)______ day in London...",
  "blanks": [
    { "id": "D_001", "blankNumber": 1, "options": {"A": "sunny", "B": "rainy", "C": "cloudy", "D": "snowy"}, "answer": "A" }
  ]
}

// E. Sentence Transformation
{
  "id": "E_001",
  "section": "E",
  "type": "sentence_transformation",
  "questionNumber": 1,
  "prompt": "He is too short to reach the shelf. (TALL)",
  "keyword": "TALL",
  "acceptedAnswers": ["He is not tall enough to reach the shelf."],
  "answerMatchingMode": "normalized"
}

// F. Email / Letter Writing (Placeholder)
{
  "id": "F_EMAIL_001",
  "section": "F",
  "type": "email_writing",
  "title": "Invite a friend",
  "prompt": "Write an email to invite your friend to a party...",
  "requirements": ["Mention time", "Mention location"],
  "wordLimit": "100-120 words",
  "sampleAnswer": null,
  "rubric": null,
  "autoScored": false
}

// G. Essay Writing (Placeholder)
{
  "id": "G_ESSAY_001",
  "section": "G",
  "type": "essay_writing",
  "title": "Technology in Education",
  "prompt": "Do you agree that technology...",
  "wordLimit": "250 words",
  "sampleAnswer": null,
  "rubric": null,
  "autoScored": false
}

// H. Listening Fill in Blanks
{
  "id": "H_TEXT_001",
  "section": "H",
  "type": "listening_fill_blanks",
  "title": "Airport Announcement",
  "audioUrl": null,
  "transcript": null,
  "blanks": [
    { "id": "H_001", "blankNumber": 1, "acceptedAnswers": ["gate 3", "gate three"] }
  ]
}

// I. Listening Choose ABC
{
  "id": "I_TEXT_001",
  "section": "I",
  "type": "listening_abc",
  "title": "Radio Interview",
  "audioUrl": null,
  "transcript": null,
  "questions": [
    { "id": "I_001", "questionNumber": 1, "question": "Why did he leave?", "options": {"A": "...", "B": "...", "C": "..."}, "answer": "B" }
  ]
}

// J. Listening True/False
{
  "id": "J_TEXT_001",
  "section": "J",
  "type": "listening_tf",
  "title": "Museum Tour",
  "audioUrl": null,
  "transcript": null,
  "statements": [
    { "id": "J_001", "statementNumber": 1, "statement": "The museum is open on Mondays.", "answer": false }
  ]
}

// K. Speaking Topics (Placeholder)
{
  "id": "K_TOPIC_001",
  "section": "K",
  "type": "speaking_topic",
  "title": "Describe a book",
  "prompt": "Describe a book you read recently...",
  "guidingQuestions": ["What was it?", "Who wrote it?"],
  "preparationTimeMinutes": 1,
  "speakingTimeMinutes": 2,
  "sampleAnswer": null,
  "rubric": null,
  "autoScored": false
}
```

---

## 3. Data Pipeline & Folder Structure Proposal

**Data Pipeline Flow:**
`DOCX gốc` → `Trích xuất raw text` → `Phân tích (Parse) từng Section (A-K) ra JSON` → `Chuẩn hóa Media (Signs images)` → `Merge Answer Keys` → `Validate` → `Build exam-data.json` → `Web tĩnh load data`.

**Cấu trúc thư mục đề xuất:**
```text
OnTap_B1/
├── docs/
│   └── source/
│       └── hutech-b1-review-09-2025.docx
├── scripts/
│   ├── extract-docx-text.mjs
│   ├── normalize-sign-images.mjs
│   ├── parse-section-a.mjs
│   ├── parse-section-b.mjs
│   ├── parse-section-c.mjs
│   ├── parse-section-d.mjs
│   ├── parse-section-e.mjs
│   ├── parse-section-fg-writing.mjs
│   ├── parse-listening-hij.mjs
│   ├── parse-speaking-k.mjs
│   ├── build-dataset.mjs
│   └── validate-dataset.mjs
├── data/
│   ├── raw/
│   │   └── hutech-b1-review-09-2025.raw.txt
│   ├── parsed/
│   │   ├── section-a.json
│   │   └── ... (section b đến k)
│   ├── answer-keys/
│   │   └── hutech-b1-review-09-2025.answers.json
│   ├── asset-maps/
│   │   └── signs-image-map.json
│   └── exam-data.json
├── images/
│   ├── raw-signs/
│   │   └── image_001_spd2m_image40.png
│   └── signs/
│       └── sign_040.png
└── audio/
    └── hutech-b1-review-09-2025/
```

---

## 4. Phase Roadmap & Task Breakdown

### Phase 0: Domain & Schema Planning
- **Mục tiêu:** Chốt cấu trúc dữ liệu A-K, Exam Blueprint, Study Profile config và Data Pipeline flow.
- **Công việc:** Duyệt và finalize các kiến trúc mô tả trong tài liệu này (đặc biệt logic xử lý ảnh Signs và Section H cho mode 2 tuần).

### Phase 1: Parse Section A first
- **Task:** Đọc text thô, trích xuất Section A (Vocabulary & Grammar). Xuất `data/parsed/section-a.json`.
- **Acceptance Criteria:** 
  - Parse đủ câu 1-200, đúng định dạng schema A.
  - Trường `answer` hợp lệ (hoặc null chờ merge).
  - Có log hiển thị các câu bị lỗi cú pháp để review thủ công.

### Phase 2: Normalize Signs images + Parse Section B
- **Task:** Xử lý chuẩn hóa tên ảnh Signs và parse JSON cho Section B.
- **Acceptance Criteria:**
  - Script đọc pattern `spd2m_imageYY` từ tên file cũ (bỏ qua `image_0xx`).
  - Đổi tên file đích thành `images/signs/sign_YYY.png` (vd: `sign_040.png`).
  - Không trùng lặp số, không thiếu số từ `sign_001` đến `sign_040`.
  - Parse Section B map đúng `B_001` tới `sign_001.png`. Tạo file `signs-image-map.json`.

### Phase 3: Parse E + Writing placeholders (F, G, K)
- **Task:** Parse Section E (Câu biến đổi). Thêm các placeholder schema tĩnh cho Writing và Speaking. Auto-score: `false` cho F, G, K.

### Phase 4: Parse C/D group texts
- **Task:** Parse Reading Passage và Cloze Text. Đòi hỏi logic nhóm (Group logic) dựa vào header đoạn văn. Log cẩn thận do độ rủi ro cao.

### Phase 5: Parse Listening H/I/J
- **Task:** Cấu trúc bài nghe. Gắn placeholder cho `audioUrl`. Thiết kế schema cho Section H hỗ trợ phân loại pool cho 2 tuần.

### Phase 6: Parse Speaking K
- **Task:** Parse các topic nói. Giữ ở mức hiển thị (placeholder).

### Phase 7: Integrate with current web
- **Task:** Cập nhật `app.js` để đọc `exam-data.json` mới. Xây dựng logic Random đề (Exam Blueprint), chấm điểm trực tiếp và che/hiển thị trạng thái "Coming soon" cho F, G, K.

---

## 5. Đề xuất StudyProfile Schema (Logic Section H)

Với `StudyMode`, web lưu lại cấu hình ôn tập thay vì lưu bản sao đề thi.

**Logic 2 Tuần (two_week) cho Section H:**
Sinh viên 2 tuần chỉ ôn 2/3 bài nghe.
- `officialPool`: Toàn bộ dữ liệu thật có thể ra thi (`[1, 2, 3]`).
- `reviewedTexts`: Các bài đã chọn ôn (`[1, 2]`).
- `unreviewedTexts`: Bài chưa được ôn (tính bằng `officialPool - reviewedTexts` -> `[3]`).
- **Trên web:** Nếu chọn chế độ Practice, chỉ lấy từ `reviewedTexts`. Nếu làm bài Mock Exam (mô phỏng rủi ro đi thi thật), lấy từ `officialPool`, nếu random ra `unreviewedTexts` sẽ có label cảnh báo (Risk/Chưa ôn).

```json
{
  "id": "profile_002",
  "datasetVersion": "hutech-b1-review-09-2025",
  "mode": "two_week",
  "scope": {
    "A": { "from": 1, "to": 100 },
    "B": { "type": "all" },
    "C": { "texts": [1, 2, 3, 4] },
    "D": { "texts": [1, 2, 3, 4] },
    "E": { "from": 1, "to": 25 },
    "F": {
      "type": "email_letter",
      "reviewedTopics": [1, 2, 3]
    },
    "G": {
      "type": "essay",
      "reviewedTopics": [1, 2, 3]
    },
    "H": {
      "officialPool": [1, 2, 3],
      "reviewedTexts": [1, 2],
      "unreviewedTexts": [3]
    },
    "I": { "texts": [1, 2, 3, 4] },
    "J": { "texts": [1, 2, 3, 4] },
    "K": {
      "type": "speaking",
      "reviewedTopics": [1, 2, 3, 4, 5, 6],
      "selectionMethod": "random_draw",
      "preparationTimeMinutes": 3
    }
  },
  "active": true
}
```

---

## 6. Đề xuất ExamBlueprint & ExamSession

**ExamBlueprint (Mô phỏng 1 đề Mock Exam):**
- **A:** Random 10 MCQ
- **B:** Random 5 Signs
- **C:** Random 1 Passage group
- **D:** Random 1 Cloze text group
- **E:** Random 5 Transformations
- **F:** Random 1 email/letter topic from reviewedTopics (Chỉ hiển thị, manual practice)
- **G:** Random 1 essay topic from reviewedTopics (Chỉ hiển thị, manual practice)
  - *Lưu ý:* Kỳ thi thật có thể cho thí sinh chọn 1 trong 2 composition topics (hoặc Email hoặc Essay), không làm cả 2. Trong Mock Exam MVP, hệ thống có thể hiển thị cả 2 để thí sinh luyện tập.
- **H:** Random 1 Fill-in-blanks
- **I:** Random 2 Choose-ABC
- **J:** Random 2 True/False
- **K:** Random 1 Speaking topic from reviewedTopics (selectionMethod: random_draw, có preparation time)

**ExamSession Model (Roadmap Tương lai):**
```json
{
  "id": "exam_session_2026_06_13_morning",
  "datasetVersion": "hutech-b1-review-2026",
  "examDate": "2026-06-13",
  "sessionName": "Morning",
  "studyMode": "four_week",
  "blueprintId": "hutech_b1_standard_blueprint"
}
``` 
*Ghi chú:* Chỉ dùng để mở rộng hệ thống sau này. Tại thời điểm MVP, sẽ không quản lý ExamSession thực tế.

---

## 7. Risk List (Rủi ro kỹ thuật)

1. **Parsing DOCX:** Văn bản DOCX gốc có thể bị lỗi format (tab, space thừa, newline không đồng nhất) gây gãy parser.
2. **Answer Key Mapping:** Nếu độ lệch dòng xảy ra, câu trả lời sẽ bị map nhầm vào câu hỏi khác.
3. **Grouped Texts (Section C, D):** Cấu trúc đoạn văn phức tạp (có header con, blank line) dễ dẫn đến lỗi ghép nhầm đoạn văn.
4. **Signs Image Mapping Confusion:** Nguy cơ cao map sai ảnh nếu dev không chú ý số lượng padding (`sign_040` vs `sign_40`) hoặc đọc nhầm prefix `image_0xx`.
5. **Section H Logic Confusion:** Nhầm lẫn khái niệm `reviewedTexts` (cho luyện tập) thành `officialPool` (dành cho mô phỏng rủi ro thi thật). Có thể vô tình cắt hẳn phần `unreviewedTexts` ra khỏi hệ thống.
6. **Listening Audio & Media Missing:** File audio chưa có thể làm vỡ UI player nếu frontend không xử lý điều kiện `null`.
7. **Writing/Speaking Scoring:** Kỳ vọng của user muốn tự động chấm nhưng giới hạn MVP không cho phép, cần UI thể hiện rõ đây là tính năng Manual Practice.
8. **Mock vs Official Exam Confusion:** Thí sinh nhầm tưởng web lưu lại đúng 100% đề thi của đợt thi thật thay vì đề sinh ngẫu nhiên từ kho.
9. **Scope Misunderstanding:** Lẫn lộn giữa bộ lọc 2 tuần và 4 tuần đối với Section E (25 vs 30 câu).
10. **Writing/Speaking Scope Confusion:** Rủi ro nhầm lẫn rằng F/G/K không có scope ôn tập. Thực tế F có 3 email topics, G có 3 essay topics, K có 6 speaking topics.
11. **Composition Exam Requirement:** Nhầm lẫn rằng kỳ thi thật bắt buộc phải làm cả Email và Essay. Cần ghi chú rõ trên giao diện: Thí sinh chỉ chọn 1 trong 2 topic được đưa ra (không làm cả 2).
