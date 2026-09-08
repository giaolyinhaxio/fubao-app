==================================================
SỔ TAY QUẢN LÝ APP FUBAO
==================================================



==================================================
1. KHỞI ĐỘNG APP Ở LOCAL
==================================================

A. TRÊN MÁY MAC
Mở Terminal rồi chạy:
cd "/Users/iwashiro/Downloads/Cá nhân/fubao-app-git"
git pull origin main
python3 -m http.server 5511
Sau đó mở trình duyệt:
http://localhost:5511
Muốn tắt máy chủ local:
Nhấn Control + C trong Terminal.

B. TRÊN MÁY WINDOWS

Mở PowerShell rồi chạy:
cd "C:\Users\PhongPNT2\Downloads\個人フォルダ\fubao-app"
git pull origin main
npx http-server . -p 5510 -c-1
Nếu PowerShell hỏi có cài http-server không thì nhập:
y
Sau đó mở trình duyệt:
http://localhost:5510
Muốn tắt máy chủ local:
Nhấn Ctrl + C trong PowerShell.

LƯU Ý
- Terminal hoặc PowerShell phải tiếp tục mở khi dùng local.
- Sau khi sửa code, nhấn Ctrl + F5 để tải lại trang.
- Trên Mac có thể dùng Command + Shift + R.
#ERROR!
2. ĐƯA PHIÊN BẢN MỚI LÊN IPHONE
#ERROR!
BƯỚC 1: ĐỔI PHIÊN BẢN CACHE


Mở file:
service-worker.js
Tìm dòng giống như:
const CACHE_NAME = "fubao-v23";
Tăng số lên 1:
const CACHE_NAME = "fubao-v24";
Mỗi lần cập nhật app thì tiếp tục tăng:
v24 → v25 → v26...
BƯỚC 2: ĐỔI PHIÊN BẢN FILE ĐÃ SỬA
--------------------------------------------------
Nếu sửa CSS, tìm trong file HTML:
assets/css/style.css?v=43
Đổi thành:
assets/css/style.css?v=44
Nếu sửa JavaScript, ví dụ:
assets/js/english/reading.js?v=3
Đổi thành:
assets/js/english/reading.js?v=4
Chỉ cần tăng phiên bản của file CSS hoặc JavaScript đã sửa.
BƯỚC 3: KIỂM TRA CODE
--------------------------------------------------
Trên Windows PowerShell:
Get-ChildItem assets/js -Recurse -Filter "*.js" |
ForEach-Object {
Write-Host "Đang kiểm tra:" $_.FullName
node --check $_.FullName
if ($LASTEXITCODE -ne 0) {
throw "Có lỗi trong file: $($_.FullName)"
}
}
node --check service-worker.js
git diff --check
git status --short
Trên Mac Terminal:
find assets/js -name "*.js" -print0 |
while IFS= read -r -d '' file
do
echo "Đang kiểm tra: $file"
node --check "$file" || exit 1
done
node --check service-worker.js
git diff --check
git status --short
Nếu git diff --check không hiện gì thì code không có lỗi khoảng trắng.
BƯỚC 4: ĐẨY LÊN GITHUB
--------------------------------------------------
Dùng được trên cả Mac và Windows:
git add -A
git commit -m "Update FuBao app"
git push origin main
Nếu hiện:
Everything up-to-date
thì GitHub đã có phiên bản mới nhất.
BƯỚC 5: CẬP NHẬT TRÊN IPHONE
--------------------------------------------------
1. Chờ GitHub Pages khoảng 1–3 phút.
2. Đóng hoàn toàn app FuBao trên iPhone.
3. Mở lại app.
4. Nếu vẫn thấy bản cũ, mở trang web bằng Safari.
5. Tải lại trang trong Safari.
6. Đóng Safari rồi mở lại app FuBao.
Nếu vẫn chưa đổi:
- Xóa biểu tượng FuBao khỏi màn hình chính.
- Mở trang web bằng Safari.
- Chọn Chia sẻ.
- Chọn “Thêm vào Màn hình chính”.
#ERROR!
3. CẬP NHẬT DỮ LIỆU TỪ VỰNG TỪ GOOGLE SHEETS
#ERROR!
BƯỚC 1: KIỂM TRA GOOGLE SHEETS
--------------------------------------------------
Dòng đầu tiên của bảng phải có đúng 4 cột:
english
ipa
vietnamese
japanese
Không thêm cột id.
Không để dòng trống ở giữa bảng.
BƯỚC 2: TẢI FILE CSV
--------------------------------------------------
Trong Google Sheets chọn:
Tệp
→ Tải xuống
→ Giá trị được phân tách bằng dấu phẩy (.csv)
Google Sheets tải xuống bằng UTF-8 nên tiếng Việt và tiếng Nhật
sẽ ít bị lỗi font.
Nếu dùng Excel thì phải chọn:
CSV UTF-8 (Comma delimited) (*.csv)
BƯỚC 3: CẢNH BÁO TRƯỚC KHI XÓA
--------------------------------------------------
Lệnh xóa toàn bộ từ vựng có thể xóa luôn tiến độ học và ôn tập
đang liên kết với các từ.
Chỉ thực hiện khi thật sự muốn thay toàn bộ danh sách từ vựng.
BƯỚC 4: XÓA DỮ LIỆU CŨ TRONG SUPABASE
--------------------------------------------------
Mở:
Supabase
→ SQL Editor
→ New query
Dán lệnh:
truncate table public.english_vocabulary
restart identity cascade;
Sau đó nhấn Run.
Kiểm tra số dòng còn lại:
select count(*)
from public.english_vocabulary;
Kết quả phải là:
0
BƯỚC 5: IMPORT FILE CSV MỚI
--------------------------------------------------
Trong Supabase chọn:
Table Editor
→ english_vocabulary
→ Insert
→ Import data from CSV
Chọn file CSV vừa tải từ Google Sheets.
Kiểm tra ghép cột:
english     → english
ipa         → ipa
vietnamese  → vietnamese
japanese    → japanese
Sau đó nhấn Import data.
BƯỚC 6: KIỂM TRA SAU KHI IMPORT
--------------------------------------------------
Mở SQL Editor và chạy:
select
count(*) as total_rows,
count(distinct lower(trim(english))) as unique_english,
count(*) filter (
where english is null
or trim(english) = ''
) as blank_english
from public.english_vocabulary;
Ý nghĩa kết quả:
- total_rows: tổng số từ đã nhập.
- unique_english: số từ tiếng Anh không trùng.
- blank_english: phải bằng 0.
Kiểm tra các từ bị trùng:
select
lower(trim(english)) as english,
count(*) as quantity
from public.english_vocabulary
group by lower(trim(english))
having count(*) > 1
order by quantity desc, english;
BƯỚC 7: KIỂM TRA TRÊN APP
--------------------------------------------------
1. Mở lại trang Từ vựng.
2. Nhấn Ctrl + F5 trên máy tính.
3. Trên iPhone, đóng app rồi mở lại.
4. Kiểm tra tổng số từ và nội dung từ vựng.
LƯU Ý QUAN TRỌNG
--------------------------------------------------
Nếu chỉ thay đổi dữ liệu trong Supabase:
- Không cần git add.
- Không cần git commit.
- Không cần git push.
- Không cần tăng CACHE_NAME.
GitHub chỉ cần cập nhật khi sửa HTML, CSS, JavaScript
hoặc service-worker.js.