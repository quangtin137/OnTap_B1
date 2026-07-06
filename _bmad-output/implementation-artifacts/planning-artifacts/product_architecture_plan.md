# BMad Product & Architecture Plan: OnTap_B1 (Frontend Integration over Parsed Data)

> Nguồn quy tắc chuẩn:
> Trước khi tạo implementation plan hoặc sửa code, phải đọc và tuân theo:
> `_bmad-output/implementation-artifacts/planning-artifacts/ontap_b1_canonical_rules.md`
>
> Nếu file kiến trúc này mâu thuẫn với bộ quy tắc chuẩn, ưu tiên bộ quy tắc chuẩn.

---

## 1. Product / Domain Summary

**Bối cảnh & mục tiêu hiện tại:**

OnTap_B1 là một web tĩnh luyện thi B1 CEFR thuần HTML/CSS/Vanilla JS.

Data parsing pipeline cho toàn bộ Section A-K đã hoàn tất và dữ liệu chuẩn hiện nằm trong:

```text
data/parsed/section-a.json
data/parsed/section-b.json
data/parsed/section-c.json
data/parsed/section-d.json
data/parsed/section-e.json
data/parsed/section-f.json
data/parsed/section-g.json
data/parsed/section-h.json
data/parsed/section-i.json
data/parsed/section-j.json
data/parsed/section-k.json
```

Phase hiện tại không còn là parse data, mà là **Frontend Integration**.

Mục tiêu frontend integration:

- Load parsed data A-K trực tiếp từ `data/parsed`.
- Không phụ thuộc vào seed file cũ `data/exam-data.json`.
- Tạo `SECTION_REGISTRY` A-K.
- Tạo `StudyProfile` dựa trên 3 learning mode:
  - Free Candidate
  - 2-Week Learner
  - 4-Week Learner
- Tạo Practice Mode theo từng section.
- Migrate Mock Exam Generator từ flow seed A-H cũ sang parsed data A-K.
- Chỉ chấm tự động các section có answer key và được đánh dấu `autoScored=true`.
- Hiển thị ghi chú manual/no-key cho các section chưa hỗ trợ chấm điểm tự động.

Ràng buộc MVP vẫn giữ nguyên:

- Không backend.
- Không database.
- Không login/register.
- Không reparse data nếu user không yêu cầu rõ.
- Không sửa raw files nếu user không yêu cầu rõ.
- Không redesign UI mạnh trong phase frontend integration đầu tiên.
- Việc implement phải incremental, chia thành các patch nhỏ.

---

## 2. Domain Entities

### 2.1. ParsedSectionData

Dữ liệu đã parse theo từng section A-K.

Nguồn dữ liệu:

```text
data/parsed/section-a.json
...
data/parsed/section-k.json
```

Frontend phải consume parsed data hiện có, không parse lại từ raw files.

---

### 2.2. Section

Đại diện cho một phần thi A-K.

Mapping chuẩn:

```text
A = Vocabulary & Grammar MCQ
B = Signs MCQ with image
C = Reading passage MCQ group
D = Cloze text MCQ group
E = Sentence transformation
F = Email/Letter writing
G = Essay writing
H = Listening fill blanks
I = Listening MCQ
J = Listening True/False
K = Speaking topics
```

Không dùng mapping seed A-H cũ.

---

### 2.3. Question / QuestionGroup

Dùng cho dữ liệu câu hỏi.

Các section có câu đơn:

```text
A = item/câu đơn
B = item/câu đơn
E = item/câu đơn
```

Các section dạng group/task:

```text
C = group/passage
D = group/text
H = listening fill task
I = listening MCQ task
J = listening true/false task
```

Các section manual/prompt:

```text
F = email/letter prompt
G = essay prompt
K = speaking topic
```

Không được tách câu hỏi của C/D khỏi passage/text gốc khi sinh practice hoặc mock exam.

---

### 2.4. SectionRegistry

Registry mô tả section A-K.

Mỗi section nên có tối thiểu:

```js
{
  id,
  title,
  type,
  autoScored,
  answerKeyAvailable,
  practiceCount,
  mockCount
}
```

Ví dụ:

```js
A: {
  id: "A",
  title: "Vocabulary & Grammar",
  type: "mcq",
  autoScored: true,
  answerKeyAvailable: true,
  practiceCount: 10,
  mockCount: 10
}
```

Mục tiêu của `SECTION_REGISTRY`:

- Không hard-code label rải rác trong nhiều hàm.
- Chuẩn hóa behavior từng section.
- Tách metadata section khỏi renderer/scoring logic.
- Làm nền cho Practice Mode và Mock Exam Generator.

---

### 2.5. StudyMode

Chế độ ôn tập của user.

Có 3 mode:

```text
free_candidate
two_week
four_week
```

Ý nghĩa:

```text
free_candidate = người học tự do, dùng full parsed pool.
two_week = người học cấp tốc 2 tuần, scope học giới hạn hơn.
four_week = người học đầy đủ hơn, scope rộng hơn two_week.
```

---

### 2.6. StudyProfile

Config phạm vi học của user dựa trên `StudyMode`.

`StudyProfile` không lưu bản sao câu hỏi. Nó chỉ lưu scope, rule chọn dữ liệu và metadata liên quan đến mode học.

Ví dụ concept:

```json
{
  "mode": "two_week",
  "scope": {
    "E": { "from": 1, "to": 25 },
    "H": {
      "officialPool": [1, 2, 3],
      "reviewedTexts": [1, 2],
      "unreviewedTexts": [3]
    }
  }
}
```

---

### 2.7. ScopedBank

Dữ liệu đã được lọc/scope từ `examBank` theo `StudyProfile`.

Flow đúng:

```text
parsed data A-K
→ examBank
→ StudyProfile
→ ScopedBank
→ PracticeSet / GeneratedMockExam
```

Không được random trực tiếp từ full `examBank` nếu chưa qua `StudyProfile`.

---

### 2.8. PracticeSet

Một lượt luyện tập theo section.

PracticeSet được sinh từ `ScopedBank`, không load toàn bộ section theo mặc định.

Kích thước mặc định:

```text
A/B/E: 10 items/lượt
C/D: 1 group/lượt
F/G/K: 1 prompt hoặc topic/lượt
H/I/J: 1 listening task/lượt
```

---

### 2.9. ExamBlueprint

Cấu trúc ma trận đề thi thử.

ExamBlueprint xác định số lượng item/group/task/prompt cần lấy từ từng section khi sinh Mock Exam.

Blueprint MVP tham khảo:

```text
A: 10 MCQ
B: 5 Signs
C: 1 Reading group
D: 1 Cloze group
E: 5 Sentence Transformation
F: 1 Email/Letter prompt
G: 1 Essay prompt
H: 1 Listening Fill task
I: 2 Listening MCQ tasks
J: 2 Listening True/False tasks
K: 1 Speaking topic
```

Lưu ý:

- Mock Exam MVP có thể hiển thị cả F và G để luyện tập.
- UI cần ghi rõ đây là mock/practice, không khẳng định đây là cấu trúc chính thức 100% của mọi ca thi.
- H/I/J hiện `answerKeyAvailable=false`, không tính vào điểm tự động.

---

### 2.10. GeneratedMockExam

Đề thi thử sinh ngẫu nhiên từ `ScopedBank` và `ExamBlueprint`.

GeneratedMockExam khác với đề thi chính thức của một ca thi thật.

Không được khiến user hiểu rằng mock exam là đề chính thức.

---

### 2.11. ExamSession

Roadmap tương lai, chưa thuộc MVP frontend integration hiện tại.

`ExamSession` đại diện cho một ca thi thực tế, ví dụ:

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

Hiện tại MVP không quản lý ExamSession thật.

---

### 2.12. MediaAsset

Quản lý tài nguyên media như ảnh Signs và audio nếu có.

Quy tắc Signs image:

- Frontend không tự suy luận filename.
- Frontend không tự dựng path ảnh từ số thứ tự.
- Frontend phải dùng đúng field image/path trong parsed JSON.
- Các filename Signs cũ có thể gây nhầm lẫn.
- Số sau `spd2m_image` từng là mapping đúng theo thứ tự câu Signs, nhưng frontend mới không được reconstruct filename theo logic đó.

Quy tắc audio:

- Audio có thể chưa có.
- UI không được vỡ nếu `audioUrl`, `audio`, hoặc field tương đương là `null`/missing.
- Nếu chưa có audio, hiển thị trạng thái phù hợp thay vì render player lỗi.

---

## 3. Data Source & Pipeline Status

### 3.1. Current Data Source

Frontend phase hiện tại chỉ consume:

```text
data/parsed/section-a.json
data/parsed/section-b.json
data/parsed/section-c.json
data/parsed/section-d.json
data/parsed/section-e.json
data/parsed/section-f.json
data/parsed/section-g.json
data/parsed/section-h.json
data/parsed/section-i.json
data/parsed/section-j.json
data/parsed/section-k.json
```

Không dùng `data/exam-data.json` cho frontend flow mới.

---

### 3.2. Completed Data Pipeline

Data parsing pipeline A-K đã hoàn tất và đã commit.

Trạng thái đã biết:

```text
A-K parsed data đã có.
C = 25 groups, all usable=true.
D = 20 groups, all usable=true.
D_003 interleaved columns fixed.
C_007/C_013/C_018 missing options recovered.
```

---

### 3.3. Historical Pipeline Steps

Các bước dưới đây thuộc giai đoạn đã hoàn tất hoặc chỉ dùng khi user yêu cầu rõ:

```text
DOCX gốc
→ Extract raw text
→ Parse từng section A-K
→ Normalize Signs images
→ Recover OCR/missing options
→ Merge/validate answer keys
→ Xuất parsed JSON
```

Không thực hiện lại các bước trên nếu user không yêu cầu rõ.

Không sửa:

```text
data/raw/
docs/source/
raw files
scripts parsing
```

trừ khi user yêu cầu rõ.

---

### 3.4. Parsed JSON Usage Rule

Khi implementation cần biết schema thật của từng section, agent được phép inspect:

```text
data/parsed/section-a.json
...
data/parsed/section-k.json
```

nhưng chỉ để đọc/hiểu structure.

Không được edit các file parsed JSON nếu user không yêu cầu.

---

### 3.5. Usable Filtering Rule

Rule lọc item:

```js
item.usable !== false
```

Chỉ loại item khi `usable` đúng bằng `false`.

Không yêu cầu `usable === true`.

---

## 4. Reference Schema Notes

> Phần schema dưới đây là ghi chú tham khảo từ giai đoạn planning.
> Implementation frontend phải inspect parsed JSON thực tế nếu cần.
> Không được assume schema tham khảo này khớp 100% với parsed data thật.

### 4.1. Section A — Vocabulary & Grammar MCQ

```json
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
```

### 4.2. Section B — Signs MCQ with image

```json
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
```

### 4.3. Section C — Reading Passage MCQ group

```json
{
  "id": "C_TEXT_001",
  "section": "C",
  "type": "reading_group",
  "title": "Global Warming",
  "passage": "Global warming is...",
  "questions": [
    {
      "id": "C_001",
      "questionNumber": 1,
      "question": "What is the main idea?",
      "options": { "A": "..." },
      "answer": "A"
    }
  ]
}
```

### 4.4. Section D — Cloze Text MCQ group

```json
{
  "id": "D_TEXT_001",
  "section": "D",
  "type": "cloze_group",
  "title": "A Day in London",
  "clozeText": "It was a (1)______ day in London...",
  "blanks": [
    {
      "id": "D_001",
      "blankNumber": 1,
      "options": { "A": "sunny", "B": "rainy", "C": "cloudy", "D": "snowy" },
      "answer": "A"
    }
  ]
}
```

### 4.5. Section E — Sentence Transformation

```json
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
```

### 4.6. Section F — Email / Letter Writing

```json
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
```

### 4.7. Section G — Essay Writing

```json
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
```

### 4.8. Section H — Listening Fill in Blanks

```json
{
  "id": "H_TEXT_001",
  "section": "H",
  "type": "listening_fill_blanks",
  "title": "Airport Announcement",
  "audioUrl": null,
  "transcript": null,
  "blanks": [
    {
      "id": "H_001",
      "blankNumber": 1,
      "acceptedAnswers": ["gate 3", "gate three"]
    }
  ]
}
```

### 4.9. Section I — Listening MCQ

```json
{
  "id": "I_TEXT_001",
  "section": "I",
  "type": "listening_abc",
  "title": "Radio Interview",
  "audioUrl": null,
  "transcript": null,
  "questions": [
    {
      "id": "I_001",
      "questionNumber": 1,
      "question": "Why did he leave?",
      "options": { "A": "...", "B": "...", "C": "..." },
      "answer": "B"
    }
  ]
}
```

### 4.10. Section J — Listening True/False

```json
{
  "id": "J_TEXT_001",
  "section": "J",
  "type": "listening_tf",
  "title": "Museum Tour",
  "audioUrl": null,
  "transcript": null,
  "statements": [
    {
      "id": "J_001",
      "statementNumber": 1,
      "statement": "The museum is open on Mondays.",
      "answer": false
    }
  ]
}
```

### 4.11. Section K — Speaking Topics

```json
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

## 5. Learning Mode & StudyProfile Architecture

### 5.1. Learning Mode Flow

App không bắt đầu thẳng bằng “Sinh đề mới”.

Flow đúng:

```text
Open app
→ Select Learning Mode
→ Build StudyProfile
→ User chooses Practice or Mock Exam
→ Generate content from StudyProfile
→ Render content
→ Auto-score eligible sections only
→ Manual/no-key sections display content and notes only
```

---

### 5.2. Free Candidate

Free Candidate là mode cho người học tự do.

Rules:

```text
- Dùng full parsed pool A-K.
- Practice random từ full pool.
- Mock Exam random từ full pool.
- Không có reviewed/unreviewed/risk logic.
```

Concept profile:

```json
{
  "mode": "free_candidate",
  "scope": {
    "A": { "type": "all" },
    "B": { "type": "all" },
    "C": { "type": "all" },
    "D": { "type": "all" },
    "E": { "type": "all" },
    "F": { "type": "all" },
    "G": { "type": "all" },
    "H": { "type": "all" },
    "I": { "type": "all" },
    "J": { "type": "all" },
    "K": { "type": "all" }
  }
}
```

---

### 5.3. 2-Week Learner

2-Week Learner là mode học cấp tốc 2 tuần.

Rules:

```text
- Gần giống 4-Week Learner nhưng khác ở Section E và Section H.
- Section E dùng 25 sentence transformation items.
- Section H official pool có 3 Listening Fill texts.
- Learner reviewed 2/3 texts.
- Text còn lại là unreviewed/risk.
- Không được loại bỏ text H chưa học khỏi mô hình official mock exam.
```

Logic Section H:

```text
Practice:
- Lấy từ reviewedTexts.

Mock Exam:
- Lấy từ officialPool.
- Nếu random ra unreviewedTexts, gắn label Risk/Chưa ôn.
```

Concept profile:

```json
{
  "mode": "two_week",
  "scope": {
    "E": { "from": 1, "to": 25 },
    "H": {
      "officialPool": [1, 2, 3],
      "reviewedTexts": [1, 2],
      "unreviewedTexts": [3]
    }
  }
}
```

Quy tắc này phải tuân theo canonical rules section 7.2 và section 8.

---

### 5.4. 4-Week Learner

4-Week Learner là mode học đầy đủ hơn.

Rules:

```text
- Section E dùng 30 sentence transformation items.
- Section H reviewed đủ 3/3 Listening Fill texts.
- Không có H unreviewed/risk text.
```

Concept profile:

```json
{
  "mode": "four_week",
  "scope": {
    "E": { "from": 1, "to": 30 },
    "H": {
      "officialPool": [1, 2, 3],
      "reviewedTexts": [1, 2, 3],
      "unreviewedTexts": []
    }
  }
}
```

---

### 5.5. StudyProfile Functions

Required conceptual functions:

```js
loadAllParsedData()
buildStudyProfile(mode, optionalSettings)
getScopedBank(examBank, studyProfile)
generatePracticeSet(sectionId, studyProfile)
generateMockExam(studyProfile)
```

Responsibilities:

```text
loadAllParsedData:
- Load data/parsed/section-a.json through section-k.json.
- Return examBank A-K.
- Filter usable items by item.usable !== false.

buildStudyProfile:
- Create mode-specific profile.
- Apply Free Candidate / 2-Week / 4-Week rules.
- Do not copy questions into the profile.

getScopedBank:
- Apply profile scope to examBank.
- Preserve grouped units for C/D/H/I/J.
- Mark H risk metadata for 2-week mock if needed.

generatePracticeSet:
- Use scoped data.
- Generate one practice round for a selected section.

generateMockExam:
- Use scoped data and ExamBlueprint.
- Select by correct unit for each section.
```

---

## 6. Practice Mode Architecture

### 6.1. Practice Mode Purpose

Practice Mode cho phép user luyện từng section riêng lẻ thay vì làm cả mock exam.

User flow:

```text
Select Learning Mode
→ Choose Practice Mode
→ Choose Section A-K
→ Generate practice round
→ Render selected section
→ Show immediate feedback only if section is auto-scored and answerKeyAvailable
→ User can generate another practice round
```

---

### 6.2. Practice Round Size

Default practice round size:

```text
A/B/E: 10 items/lượt
C/D: 1 group/lượt
F/G/K: 1 prompt hoặc topic/lượt
H/I/J: 1 listening task/lượt
```

Practice Mode không load toàn bộ section theo mặc định.

---

### 6.3. Practice Mode Scoring

Immediate feedback chỉ áp dụng khi:

```js
autoScored === true && answerKeyAvailable === true
```

Không show đúng/sai ngay cho:

```text
F/G/K = manual/coming-soon
H/I/J = chưa có answer key
```

Với section không chấm tự động, hiển thị note:

```text
Phần này hiện chưa hỗ trợ chấm điểm tự động.
```

hoặc:

```text
Chưa có answer key — không tính vào điểm tự động.
```

---

## 7. Mock Exam Architecture

### 7.1. Mock Exam Purpose

Mock Exam mô phỏng một lượt đề thi thử ngẫu nhiên dựa trên `StudyProfile` và `ExamBlueprint`.

Mock Exam không phải đề chính thức của một ca thi thật.

---

### 7.2. Mock Exam Unit Selection

Mock Exam phải chọn theo đúng unit:

```text
A = item/question
B = item/question
C = group/passage
D = group/text
E = item/question
F = writing prompt
G = essay prompt
H = listening fill task
I = listening MCQ task
J = listening true/false task
K = speaking topic
```

Không split C/D khỏi passage/text.

---

### 7.3. Mock Exam Blueprint MVP

Blueprint MVP tham khảo:

```text
A: 10
B: 5
C: 1 group
D: 1 group
E: 5
F: 1 prompt
G: 1 prompt
H: 1 task
I: 2 tasks
J: 2 tasks
K: 1 topic
```

Notes:

- F/G/K vẫn được load vào mock nhưng không chấm tự động.
- H/I/J vẫn được load vào mock nhưng hiện chưa có answer key nên không chấm tự động.
- H/I/J không được góp vào automatic score.
- Với 2-Week Learner, H mock lấy từ officialPool; nếu trúng unreviewed text thì hiển thị Risk/Chưa ôn.

---

### 7.4. Mock Exam Score Summary

Score summary nên hiển thị theo hướng:

```text
Điểm tự động: x/y
Phần chưa chấm tự động: F, G, H, I, J, K
```

Không tính các phần sau vào điểm tự động:

```text
F/G/K = manual
H/I/J = answerKeyAvailable=false
```

---

### 7.5. Composition Note

Kỳ thi thật có thể cho thí sinh chọn một trong hai composition topics, ví dụ Email hoặc Essay.

Mock Exam MVP có thể hiển thị cả F và G để luyện tập, nhưng UI phải ghi rõ đây là practice/mock.

Không được làm user hiểu rằng mọi ca thi thật đều bắt buộc làm cả Email và Essay.

---

## 8. Scoring Architecture

### 8.1. Auto-Scored Sections

Các section có thể chấm tự động:

```text
A
B
C
D
E nếu parsed data có answer key
```

### 8.2. Manual / No-Key Sections

Manual sections:

```text
F = Email/Letter writing
G = Essay writing
K = Speaking topics
```

No-key listening sections hiện tại:

```text
H = Listening fill blanks
I = Listening MCQ
J = Listening True/False
```

### 8.3. Immediate Feedback Rule

Chỉ show immediate feedback khi:

```js
autoScored === true && answerKeyAvailable === true
```

Không show đúng/sai ngay nếu:

```js
autoScored === false || answerKeyAvailable === false
```

---

## 9. Current Frontend State

Frontend hiện tại là seed version.

### 9.1. index.html

Hiện có:

```text
- Hero
- Button Sinh đề mới
- datasetStatus
- examSummary
- examRoot
```

### 9.2. app.js

Hiện có:

```text
- fetch data/exam-data.json
- buildExam(bank)
- renderExam()
- render A-H
- immediate-result feedback
```

### 9.3. styles.css

Hiện có:

```text
- Card layout
- Section tabs
- Question block
- Cloze table
- Sign image
- Answer input
- Immediate result
```

Migration approach:

```text
- Giữ UI foundation hiện tại.
- Không redesign mạnh.
- Thêm mode selection và practice/mock flow incremental.
- Migrate data source và section mapping từ A-H seed sang A-K parsed.
```

---

## 10. Frontend Integration Roadmap

### Phase F0: Rules & Architecture Alignment

Mục tiêu:

- Tạo canonical rules.
- Cập nhật architecture plan để reference canonical rules.
- Không sửa code app trong phase này.

Acceptance criteria:

```text
- Có ontap_b1_canonical_rules.md.
- product_architecture_plan.md reference canonical rules.
- Chưa động vào index.html/app.js/styles.css.
```

---

### Phase F1: Learning Mode Shell

Mục tiêu:

- Thêm UI chọn 3 mode:
  - Free Candidate
  - 2-Week Learner
  - 4-Week Learner
- Tạo state lưu selected learning mode.
- Tạo concept `StudyProfile` ban đầu.

Không làm ở phase này:

```text
- Chưa cần migrate toàn bộ mock exam.
- Chưa cần scoring hoàn chỉnh.
- Chưa cần polish UI.
```

Acceptance criteria:

```text
- User mở app thấy lựa chọn learning mode.
- User chọn mode xong mới thấy lựa chọn Practice / Mock Exam.
- Không còn flow UX bắt đầu thẳng bằng “Sinh đề mới”.
```

---

### Phase F2: Parsed Data Loading Layer

Mục tiêu:

- Thay `fetch("data/exam-data.json")`.
- Load `data/parsed/section-a.json` đến `section-k.json`.
- Filter bằng `usable !== false`.
- Tạo `examBank` A-K.

Không làm ở phase này:

```text
- Không reparse data.
- Không sửa parsed JSON.
- Không sửa raw files.
```

Acceptance criteria:

```text
- Network tab load đúng 11 file parsed.
- Không request data/exam-data.json trong frontend flow mới.
- datasetStatus hiển thị được trạng thái load data A-K.
```

---

### Phase F3: Section Registry + StudyProfile

Mục tiêu:

- Tạo `SECTION_REGISTRY` A-K.
- Tạo `buildStudyProfile()`.
- Tạo `getScopedBank()`.
- Đảm bảo two_week và four_week xử lý đúng Section E/H.

Acceptance criteria:

```text
- Free Candidate dùng full pool.
- 2-Week Learner scope E = 25 items.
- 4-Week Learner scope E = 30 items.
- 2-Week Learner Section H có officialPool/reviewedTexts/unreviewedTexts.
- 4-Week Learner Section H reviewed đủ 3/3.
```

---

### Phase F4: Basic Practice Mode

Mục tiêu:

- Cho user chọn section A-K.
- Sinh một lượt luyện tập theo section.
- Dùng StudyProfile-scoped data.
- Tận dụng renderer hiện có nếu phù hợp.

Default practice size:

```text
A/B/E: 10 items/lượt
C/D: 1 group/lượt
F/G/K: 1 prompt/topic/lượt
H/I/J: 1 listening task/lượt
```

Acceptance criteria:

```text
- Practice A/B/E render được 10 items.
- Practice C/D render được 1 group, không split khỏi passage/text.
- Practice F/G/K render prompt/topic và note manual.
- Practice H/I/J render task và note no-answer-key.
- Immediate feedback chỉ xuất hiện cho section đủ điều kiện chấm tự động.
```

---

### Phase F5: Mock Exam Migration

Mục tiêu:

- Generate mock từ ScopedBank.
- Chọn đúng unit từng section.
- Không split C/D khỏi group.
- Không tính điểm các section manual/no-key.

Acceptance criteria:

```text
- Mock Exam sinh được nội dung A-K.
- C/D giữ nguyên passage/text + questions.
- F/G/H/I/J/K vẫn hiển thị nhưng không tính vào điểm tự động nếu không có key.
- Score summary có automatic score và danh sách phần chưa chấm tự động.
- 2-Week Learner mock H nếu trúng unreviewed text thì có label Risk/Chưa ôn.
```

---

### Phase F6: UI Polish & Review

Mục tiêu:

- Tối ưu UI sau khi core flow chạy ổn.
- Cải thiện score summary.
- Cải thiện note manual/no-key.
- Cải thiện Risk label cho 2-week H.
- Review responsive UI.

Không làm quá sớm:

```text
- Không redesign mạnh trước khi core flow ổn.
- Không thêm backend/database/login.
```

---

## 11. Risk List

### 11.1. Schema mismatch risk

Parsed JSON thật có thể khác schema tham khảo.

Mitigation:

```text
Agent phải inspect parsed JSON thật khi cần.
Không assume schema trong Reference Schema Notes là 100% đúng.
```

---

### 11.2. Old A-H mapping risk

Frontend hiện tại dùng A-H seed mapping.

Mitigation:

```text
Phải migrate sang A-K mapping.
Không giữ F/G/H theo nghĩa cũ.
```

---

### 11.3. `exam-data.json` dependency risk

Frontend hiện tại fetch `data/exam-data.json`.

Mitigation:

```text
Frontend flow mới không phụ thuộc exam-data.json.
Load trực tiếp data/parsed/section-a.json đến section-k.json.
```

---

### 11.4. Section H risk confusion

Dễ nhầm `reviewedTexts` với `officialPool`.

Mitigation:

```text
Practice 2-week lấy từ reviewedTexts.
Mock 2-week lấy từ officialPool.
Nếu mock trúng unreviewedTexts thì label Risk/Chưa ôn.
Không loại bỏ unreviewed H khỏi mô hình official mock.
```

---

### 11.5. C/D group split risk

Dễ random câu lẻ làm mất passage/text.

Mitigation:

```text
C/D luôn random theo group.
Không split questions khỏi passage/text.
```

---

### 11.6. Manual/no-key scoring risk

Dễ vô tình chấm đúng/sai cho F/G/K/H/I/J.

Mitigation:

```text
Chỉ chấm khi autoScored=true và answerKeyAvailable=true.
Không show immediate feedback cho manual/no-key sections.
```

---

### 11.7. Media missing risk

Audio có thể chưa có.

Mitigation:

```text
Nếu audio missing/null, UI không render player lỗi.
Hiển thị note phù hợp.
```

---

### 11.8. Mock vs official exam confusion

User có thể hiểu nhầm mock exam là đề chính thức.

Mitigation:

```text
UI cần ghi rõ đây là mock/practice generated exam.
Không khẳng định đây là đề thật.
```

---

### 11.9. Scope misunderstanding risk

Dễ nhầm 2-week và 4-week chỉ khác label.

Mitigation:

```text
2-week và 4-week khác ở E và H.
2-week E = 25.
4-week E = 30.
2-week H = reviewed 2/3 + unreviewed/risk 1/3.
4-week H = reviewed đủ 3/3.
```

---

### 11.10. Composition exam requirement risk

Dễ làm user hiểu F và G đều bắt buộc trong mọi đề thật.

Mitigation:

```text
Mock MVP có thể hiển thị F và G để luyện tập.
UI phải ghi rõ đây là practice/mock.
Không khẳng định mọi ca thi thật đều bắt buộc làm cả Email và Essay.
```

---

## 12. Agent / BMAD Usage Rules

Trước khi tạo implementation plan hoặc sửa code, agent phải đọc:

```text
_bmad-output/implementation-artifacts/planning-artifacts/ontap_b1_canonical_rules.md
_bmad-output/implementation-artifacts/planning-artifacts/product_architecture_plan.md
```

Agent phải tạo implementation plan nhỏ trước khi sửa code.

Agent không được sửa code cho đến khi user approve plan.

Implementation plan phải nêu rõ:

```text
- Task thuộc phase nào.
- Files sẽ sửa.
- Files không sửa.
- Expected behavior sau patch.
- Verification steps.
- Open questions nếu có.
```

Không được:

```text
- Reparse data nếu user không yêu cầu.
- Sửa raw files nếu user không yêu cầu.
- Dùng git add .
- Thêm backend/database/login/register.
- Redesign UI mạnh ở patch đầu.
```

---

## 13. Git Rules

Không dùng:

```bash
git add .
```

Chỉ add file cụ thể.

Ví dụ:

```bash
git add _bmad-output/implementation-artifacts/planning-artifacts/ontap_b1_canonical_rules.md
git add _bmad-output/implementation-artifacts/planning-artifacts/product_architecture_plan.md
```

Hoặc khi sửa frontend:

```bash
git add index.html app.js styles.css
```

Trước khi commit phải kiểm tra:

```bash
git status
```

Nếu có file lạ hoặc file không liên quan, không được add.

---

## 14. Current Next Step

Phase hiện tại:

```text
Phase F0: Rules & Architecture Alignment
```

Next implementation planning task sau khi F0 hoàn tất:

```text
Create a small implementation plan for Phase F1-F2:
- Learning Mode Shell
- Parsed Data Loading Layer
```

Agent phải đọc canonical rules và architecture plan trước khi lập plan.