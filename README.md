# OnTap B1 (MVP Start)

Web static on tap B1 theo blueprint A-H.

## Current MVP scope

- A: Vocabulary & Grammar (random 10)
- B: Signs (random 5)
- C: Reading Passage (random 1 text)
- D: Cloze text (random 1 text)
- E: Sentence Transformation (random 5)
- F: Listening Fill in Blanks (random 1 text)
- G: Listening Choose ABC (random 2 texts)
- H: Listening True/False (random 2 texts)

## Important note

Dataset hiện là **seed dataset** để bắt đầu implementation. Pool chưa đủ full theo mục tiêu cuối cùng.

## Run locally

Cách nhanh nhất: mở file `index.html` bằng browser.

Hoặc dùng static server:

```powershell
cd "d:\Tin\B1 - CEFR\OnTap_B1"
python -m http.server 5500
```

Mở: http://localhost:5500

## Rebuild dataset from source markdown

```powershell
cd "d:\Tin\B1 - CEFR\OnTap_B1"
node .\scripts\build-dataset.mjs
```

Lệnh này parse lại dữ liệu từ file nguồn markdown và cập nhật:

- data/exam-data.json
- data/build-report.json

## Deploy Vercel (static)

1. Push repo OnTap_B1 lên GitHub.
2. Import project trên Vercel.
3. Framework Preset: `Other`.
4. Build Command: để trống.
5. Output Directory: để trống.

Site sẽ chạy dạng static ngay.

## Next step

- Mở rộng dataset từ seed lên full pool: A100, B40, C4, D4, E29, F3, G4, H4.
- Bổ sung parser bán tự động từ file markdown nguồn.
- Thêm chế độ làm đề theo thời gian.
