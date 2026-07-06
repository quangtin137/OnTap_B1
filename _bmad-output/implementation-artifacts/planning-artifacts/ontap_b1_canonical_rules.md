# OnTap_B1 - Bộ Quy Tắc Chuẩn

> Source of truth cho toàn bộ implementation OnTap_B1. Nếu có file plan nào mâu thuẫn với file này, ưu tiên file này.

## 1. Phạm vi dự án

Dự án: OnTap_B1  
Tech stack: Static HTML/CSS/Vanilla JS.

Ràng buộc bắt buộc:

- Không thêm backend.
- Không thêm database.
- Không thêm login/register.
- Không parse lại data nếu user không yêu cầu rõ.
- Không sửa raw files nếu user không yêu cầu rõ.
- Không dùng `git add .`.
- Không redesign UI quá mạnh ở phase frontend integration đầu tiên.
- Việc tích hợp frontend phải làm theo hướng incremental, tức là chia nhỏ từng bước.

---

## 2. Quy tắc nguồn dữ liệu

Frontend chỉ được dùng dữ liệu đã parse từ các file sau:

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

Không được phụ thuộc vào `data/exam-data.json` cho flow frontend mới.

Quy tắc lọc item:

```js
item.usable !== false
```

Chỉ loại item khi `usable` đúng bằng `false`.

Không được yêu cầu `usable === true`, vì một số item có thể không có field `usable` nhưng vẫn hợp lệ.

---

## 3. Mapping section chuẩn A-K

Phải dùng mapping A-K mới như sau:

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

Không được dùng mapping A-H seed cũ.

Mapping A-H cũ từ `exam-data.json` đã lỗi thời và không được dùng làm cơ sở cho kiến trúc mới.

---

## 4. Trạng thái dữ liệu đã parse

Trạng thái hiện tại:

```text
A-K đã parse xong.
C = 25 groups, tất cả usable=true.
D = 20 groups, tất cả usable=true.
D_003 đã fix lỗi interleaved columns.
C_007/C_013/C_018 đã recover missing options.
```

Quy tắc với ảnh Signs:

- Không tự suy luận tên file ảnh Signs.
- Không tự dựng đường dẫn ảnh dựa trên số thứ tự.
- Frontend phải dùng đúng field image/path có trong parsed JSON.
- Các filename Signs cũ có thể gây nhầm lẫn.
- Số sau `spd2m_image` từng là mapping đúng theo thứ tự câu Signs, nhưng frontend mới không được tự reconstruct filename theo logic đó.

---

## 5. Quy tắc chấm điểm

Các section có thể chấm tự động:

```text
A = autoScored=true
B = autoScored=true
C = autoScored=true
D = autoScored=true
E = autoScored=true nếu parsed data có answer key
```

Các section manual hoặc coming-soon:

```text
F = Email/Letter writing, autoScored=false
G = Essay writing, autoScored=false
K = Speaking topics, autoScored=false
```

Các section Listening hiện chưa có answer key:

```text
H = Listening fill blanks, autoScored=false, answerKeyAvailable=false
I = Listening MCQ, autoScored=false, answerKeyAvailable=false
J = Listening True/False, autoScored=false, answerKeyAvailable=false
```

Không được hiển thị feedback đúng/sai ngay lập tức cho section có một trong hai điều kiện sau:

```js
autoScored === false || answerKeyAvailable === false
```

Với các phần không chấm tự động, UI phải hiển thị ghi chú như:

```text
Phần này hiện chưa hỗ trợ chấm điểm tự động.
```

hoặc:

```text
Chưa có answer key — không tính vào điểm tự động.
```

---

## 6. Flow học của user

App không được bắt đầu thẳng bằng “Sinh đề mới”.

Flow đúng:

```text
Mở app
→ Chọn Learning Mode
→ Tạo StudyProfile
→ User chọn Practice hoặc Mock Exam
→ Sinh nội dung dựa trên StudyProfile
→ Render nội dung
→ Chỉ chấm tự động các section đủ điều kiện
→ Các section manual/no-key chỉ hiển thị nội dung và ghi chú
```

---

## 7. Ba learning mode

App có 3 mode học:

```text
1. Free Candidate
2. 2-Week Learner
3. 4-Week Learner
```

---

### 7.1. Free Candidate

Quy tắc:

```text
- Dành cho người học tự do.
- Dùng toàn bộ parsed pool A-K.
- Practice random từ full pool.
- Mock Exam random từ full pool.
- Không có logic reviewed/unreviewed/risk.
```

---

### 7.2. 2-Week Learner

Quy tắc:

```text
- Dành cho người học cấp tốc 2 tuần.
- Gần giống 4-Week Learner nhưng khác ở Section E và Section H.
```

Section E:

```text
- Chỉ dùng 25 sentence transformation items.
```

Section H:

```text
- Official pool có 3 Listening Fill texts.
- Learner học/review 2 trong 3 texts.
- Text còn lại vẫn có khả năng xuất hiện trong đề thật.
- Text chưa học không được loại bỏ hoàn toàn.
- Text chưa học phải được biểu diễn là unreviewed/risk.
```

Điểm quan trọng:

```text
2-Week Learner không có nghĩa là phần chưa học biến mất.
Phần chưa học vẫn là official-exam risk.
```

---

### 7.3. 4-Week Learner

Quy tắc:

```text
- Dành cho người học đầy đủ hơn.
- Section E dùng 30 sentence transformation items.
- Section H reviewed đủ 3/3 Listening Fill texts.
- Không có H unreviewed/risk text.
```

---

## 8. StudyProfile Layer

Không được random trực tiếp từ raw `examBank`.

Kiến trúc đúng:

```text
loadAllParsedData()
→ examBank A-K
→ buildStudyProfile(mode, settings)
→ getScopedBank(examBank, studyProfile)
→ generatePracticeSet() hoặc generateMockExam()
→ render
```

Các function khái niệm cần có:

```js
loadAllParsedData()
buildStudyProfile(mode, optionalSettings)
getScopedBank(examBank, studyProfile)
generatePracticeSet(sectionId, studyProfile)
generateMockExam(studyProfile)
```

Ý nghĩa:

```text
examBank = dữ liệu gốc đã load từ parsed JSON.
StudyProfile = cấu hình học của user theo mode.
ScopedBank = dữ liệu đã được lọc/scope theo StudyProfile.
Practice/Mock không được lấy trực tiếp từ full examBank nếu chưa qua StudyProfile.
```

---

## 9. Quy tắc Practice Mode

Practice Mode không được load toàn bộ section cùng lúc theo mặc định.

Kích thước mặc định mỗi lượt luyện:

```text
A/B/E: 10 items/lượt
C/D: 1 group/lượt
F/G/K: 1 prompt hoặc topic/lượt
H/I/J: 1 listening task/lượt
```

Practice Mode cần có nút như:

```text
Tạo lượt luyện mới
```

hoặc:

```text
Luyện câu khác
```

Practice Mode phải dùng dữ liệu đã scope theo StudyProfile.

Ví dụ:

```text
Free Candidate → Practice A từ full A pool.
2-Week Learner → Practice E từ 25 items đã scope.
4-Week Learner → Practice E từ 30 items đã scope.
```

---

## 10. Quy tắc Mock Exam

Mock Exam phải dùng dữ liệu đã scope theo StudyProfile.

Mock Exam phải chọn theo đúng đơn vị của từng section:

```text
A = item/câu đơn
B = item/câu đơn
C = group/passage
D = group/text
E = item/câu đơn
F = writing prompt
G = essay prompt
H = listening fill task
I = listening MCQ task
J = listening true/false task
K = speaking topic
```

Không được tách câu hỏi C/D khỏi passage/text gốc.

Mock Exam vẫn nên bao gồm các section `autoScored=false`, nhưng các section này không được tính vào điểm tự động.

Tổng kết điểm nên hiển thị theo kiểu:

```text
Điểm tự động: x/y
Phần chưa chấm tự động: F, G, H, I, J, K
```

---

## 11. Quy tắc Section Registry

Cần tạo `SECTION_REGISTRY` cho A-K.

Mỗi section tối thiểu nên có các field:

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

Không nên hard-code tên section và logic xử lý rải rác trong nhiều hàm không liên quan.

---

## 12. Thứ tự migration frontend

Việc implement phải làm từng bước nhỏ.

Thứ tự khuyến nghị:

```text
1. Giữ nền UI hiện tại.
2. Thêm Learning Mode selection:
   - Free Candidate
   - 2-Week Learner
   - 4-Week Learner
3. Thêm data loading layer cho parsed A-K.
4. Thêm SECTION_REGISTRY A-K.
5. Thêm StudyProfile layer.
6. Thêm Practice Mode basic.
7. Migrate Mock Exam Generator.
8. Sau khi core flow chạy ổn mới polish scoring/review UI.
```

Không được nhảy thẳng vào rewrite full Mock Exam khi chưa có StudyProfile.

---

## 13. Trạng thái frontend hiện tại

Frontend hiện tại là seed version.

```text
index.html:
- Hero
- Button Sinh đề mới
- datasetStatus
- examSummary
- examRoot
```

```text
app.js:
- fetch data/exam-data.json
- buildExam(bank)
- renderExam()
- render A-H
- immediate-result feedback
```

```text
styles.css:
- Card layout
- Section tabs
- Question block
- Cloze table
- Sign image
- Immediate result
```

Frontend hiện tại cần được migrate, không phải redesign toàn bộ.

---

## 14. Quy tắc cho agent/BMAD

Trước khi sửa code, agent phải đọc:

```text
_bmad-output/implementation-artifacts/planning-artifacts/ontap_b1_canonical_rules.md
_bmad-output/implementation-artifacts/planning-artifacts/product_architecture_plan.md
```

Agent phải tạo implementation plan nhỏ trước khi sửa code.

Agent không được sửa code cho đến khi user approve plan.

Implementation plan phải nêu rõ:

```text
Files sẽ sửa
Files không sửa
Expected behavior sau patch
Verification steps
Open questions nếu có
```

---

## 15. Quy tắc khi dùng git

Không dùng:

```bash
git add .
```

Chỉ add file cụ thể, ví dụ:

```bash
git add index.html app.js styles.css
```

hoặc:

```bash
git add _bmad-output/implementation-artifacts/planning-artifacts/ontap_b1_canonical_rules.md
```

Trước khi commit phải kiểm tra:

```bash
git status
```

Nếu có file lạ hoặc file không liên quan, không được add.

---

## 16. Quy tắc khi tạo plan mới

Mỗi implementation plan mới phải trả lời được:

```text
1. Task này thuộc phase nào?
2. Có vi phạm canonical rules không?
3. Sửa file nào?
4. Không sửa file nào?
5. Có động đến data/raw không?
6. Có reparse không?
7. Có thay đổi UI mạnh không?
8. Có ảnh hưởng StudyProfile không?
9. Cách test sau khi sửa là gì?
```

Nếu task chưa rõ, agent phải hỏi lại user trước khi sửa code.